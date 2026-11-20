/* Unit tests for js/save.js (HT.Save / HT.Economy / HT.CATALOG). Run: node --test dev/save.test.js */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
require('../js/carai.js');            // HT.Garage: vehicle data lives there
const HT=require('../js/save.js');
const {Save,Economy:E,CATALOG:C}=HT;

function fresh(raw,extra){const st=Save.useStorage(Save.memoryStorage());if(raw!==undefined)st.setItem('ht-save',typeof raw==='string'?raw:JSON.stringify(raw));
  if(extra)for(const k in extra)st.setItem(k,extra[k]);Save.load();return st}

test('fresh boot gives the SPEC E + SPEC2 D (v2) defaults',()=>{
  fresh();const d=Save.data;
  assert.equal(d.v,2);assert.deepEqual(d.owned.guns,['pistol','shotgun']);assert.equal(d.cash,0);
  assert.deepEqual(d.loadout,{side:'pistol',p1:'shotgun',p2:null,p3:null});
  assert.equal(Save.lastLoad.status,'fresh');assert.equal(d.prog.done.length,9);assert.equal(d.prog.trustR,5);assert.equal(d.prog.act,1);
  assert.deepEqual(d.garage,require('../js/carai.js').Garage.defaultGarage());assert.equal(d.world.bridgeOpen,false);assert.deepEqual(d.crew,{rosa:false});
  assert.ok(d.furniture.placed.length>=8);
});

test('save then load round-trips; bogus gun in loadout is replaced (SPEC L3-1)',()=>{
  const st=fresh({v:1,cash:500,loadout:{side:'raygun',p1:'shotgun',p2:'bazooka'},owned:{guns:['pistol','shotgun','bazooka'],att:['laser']}});
  const d=Save.data;assert.equal(d.cash,500);assert.equal(d.loadout.side,'pistol');assert.equal(d.loadout.p2,null);
  assert.deepEqual(d.owned.guns,['pistol','shotgun']);assert.deepEqual(d.owned.att,[]);
  Save.saveNow();assert.equal(JSON.parse(st.getItem('ht-save')).cash,500);
});

test('corrupt JSON recovers from the backup and keeps the broken copy',()=>{
  const st=Save.useStorage(Save.memoryStorage());Save.load();Save.data.cash=777;Save.saveNow();Save.data.cash=800;Save.saveNow(); // backup now holds 777
  st.setItem('ht-save','{"v":1,"cash":12');Save.load();
  assert.equal(Save.lastLoad.status,'recovered');assert.equal(Save.data.cash,777);
  assert.equal(st.getItem('ht-save-corrupt'),'{"v":1,"cash":12');
  assert.equal(JSON.parse(st.getItem('ht-save')).cash,777,'recovered save is written back');
});

test('corrupt JSON with no backup resets to defaults',()=>{
  fresh('not json at all');assert.equal(Save.lastLoad.status,'reset');assert.equal(Save.data.cash,0);
  fresh('[1,2,3]');assert.equal(Save.lastLoad.status,'reset');
  fresh('null');assert.equal(Save.lastLoad.status,'fresh');
});

test('a save from a newer version is set aside, not overwritten blindly',()=>{
  const st=fresh({v:99,cash:5000});assert.equal(Save.lastLoad.status,'reset');assert.equal(Save.data.cash,0);
  assert.equal(JSON.parse(st.getItem('ht-save-future')).cash,5000);
});

test('v0 prototype save migrates to v2',()=>{
  fresh({done:[true,false,false,false],trust:44,cash:300,guns:['pistol','shotgun','smg'],cuffed:3,someModule:{x:1}});
  const d=Save.data;assert.equal(Save.lastLoad.status,'migrated');assert.equal(d.v,2);
  assert.deepEqual(d.prog.done,[true,false,false,false,false,false,false,false,false]);assert.equal(d.prog.trust,44);assert.equal(d.prog.cuffed,3);
  assert.equal(d.cash,300);assert.ok(d.owned.guns.includes('smg'));assert.deepEqual(d.someModule,{x:1});
});

test('wrong types are repaired field by field',()=>{
  fresh({v:1,cash:'lots',prog:{trust:500,done:'yes',cuffed:-4},stats:7,attOn:{pistol:{optic:'reddot',mag:'extmag'}},
    furniture:{owned:{sofa:'two',bogus:3},placed:[{uid:'a',id:'sofa',x:3,z:4,r:5},{id:'nope',x:1,z:1},{uid:'a',id:'chair',x:'q',z:2},{uid:'a',id:'chair',x:1,z:2,r:-1}]},
    vehicle:{engine:9,paint:'red',cos:{paint:['red']}},world:{trust2:-5},events:'x',flags:{rangeDay:1}});
  const d=Save.data;
  assert.equal(d.cash,0);assert.equal(d.prog.trust,100);assert.deepEqual(d.prog.done,Array(9).fill(false));assert.equal(d.prog.cuffed,0);
  assert.deepEqual(d.stats,{earned:0,spent:0});
  assert.deepEqual(d.attOn.pistol,{optic:null,mag:null,under:null,muzzle:null},'unowned attachments are removed');
  assert.equal(d.furniture.placed.length,2);assert.equal(d.furniture.placed[0].r,1);assert.notEqual(d.furniture.placed[0].uid,d.furniture.placed[1].uid);
  assert.equal(d.furniture.placed[1].r,3);
  assert.equal(d.furniture.owned.sofa,1,'owned is at least the placed count');assert.equal(d.furniture.owned.bogus,undefined);
  const mv=d.garage.vehicles.minivan;assert.equal(mv.perf.engine,3,'old v1 vehicle extension carried into garage, clamped');assert.equal(mv.paint,'cranberry');assert.equal(d.vehicle,undefined);
  assert.equal(d.prog.trustR,0,'old world.trust2 becomes trustR, clamped');assert.deepEqual(d.events,[]);assert.equal(d.flags.rangeDay,true);
});

test('export/import code round-trips and rejects damage',()=>{
  fresh();Save.data.cash=4321;Save.data.owned.guns.push('hunter');
  const code=Save.export();assert.match(code,/^HT1-[A-Za-z0-9_-]+-[0-9a-f]{8}$/);
  fresh();assert.equal(Save.data.cash,0);
  assert.deepEqual(Save.import(code),{ok:true});assert.equal(Save.data.cash,4321);assert.ok(Save.data.owned.guns.includes('hunter'));
  const bad=code.slice(0,20)+(code[20]==='A'?'B':'A')+code.slice(21);
  assert.equal(Save.import(bad).ok,false);assert.equal(Save.import('hello').ok,false);assert.equal(Save.data.cash,4321);
  assert.equal(Save.import('  '+code.slice(0,30)+'\n'+code.slice(30)+' ').ok,true,'whitespace from copy/paste is ignored');
});

test('change events fire and can be removed',()=>{
  fresh();const got=[];const off=Save.on('cash',(v,old)=>got.push([v,old]));
  Save.addCash(100);Save.addCash(-30);off();Save.addCash(5);
  assert.deepEqual(got,[[100,0],[70,100]]);
  const keys=[];Save.on('*',(v,o,k)=>keys.push(k));Save.set('loadout.p2','rifle');assert.ok(keys.includes('loadout'));
});

test('save() is debounced into one write',(t)=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const st=fresh();let writes=0;const orig=st.setItem;st.setItem=(k,v)=>{if(k==='ht-save')writes++;orig(k,v)};
  for(let i=0;i<10;i++){Save.data.cash=i;Save.save()}
  assert.equal(writes,0);t.mock.timers.tick(300);assert.equal(writes,1);assert.equal(JSON.parse(st.getItem('ht-save')).cash,9);
  t.mock.timers.reset();
});

test('bindProg shares the live prog object',()=>{
  fresh({v:1,prog:{trust:55,done:[true,true,false,false]}});const prog={done:[false,false,false,false],trust:12,cuffed:0,downed:0,shotSurr:0,missionsRun:0};
  Save.bindProg(prog);assert.equal(prog.trust,55);prog.trust=61;Save.saveNow();assert.equal(Save.data.prog.trust,61);
  Save.reset();assert.equal(prog.trust,12);assert.equal(Save.data.prog,prog);Save.bindProg(null);
});

test('payout matches SPEC L3-2',()=>{
  const base={mission:0,ok:true,cuffs:2,confiscated:1,allyDowns:0,got:4,elapsed:200,exec:0,trust:50};
  const p=E.computePayout(base);assert.equal(p.total,915);
  const by=Object.fromEntries(p.lines.map(l=>[l.id,l.amount]));
  assert.deepEqual(by,{base:400,cuffs:120,guns:25,hamstring:150,packages:120,quick:100});
  assert.equal(E.computePayout({...base,exec:1}).total,715,'legal fees after the multiplier');
  const f=E.computePayout({...base,ok:false});assert.ok(!f.lines.some(l=>l.id==='base'||l.id==='quick'||l.id==='hamstring'));
  assert.ok(f.lines.some(l=>l.id==='gas'&&l.amount===40));
  const low=E.computePayout({...base,trust:12});assert.equal(low.total,Math.round(915*.848));assert.ok(low.lines.find(l=>l.id==='trust').amount<0);
  const hi=E.computePayout({...base,trust:100});assert.equal(hi.total,Math.round(915*1.2));
  assert.equal(E.computePayout({mission:'rick',ok:true,timeLeft:41.4,allyDowns:2,trust:50}).total,550+123);
  assert.equal(E.computePayout({mission:3,ok:true,bossDone:'cuffed',allyDowns:1,elapsed:999,trust:50}).total,1500);
  assert.equal(E.computePayout({mission:2,ok:true,elapsed:300,allyDowns:1,trust:50}).total,750,'50 under 1.5x par');
  assert.equal(E.computePayout({...base,rerun:true}).total,Math.round(915/2));
  assert.equal(E.computePayout({mission:0,ok:false,exec:3,trust:50}).total,0,'never negative');
  const rl=E.resultLines(E.computePayout({...base,exec:1}));assert.equal(rl.at(-1).text,'−$200');assert.equal(rl.at(-1).neg,true);
});

test('applyPayout credits cash, stats and the home event',()=>{
  fresh();const p=E.computePayout({mission:1,ok:true,trust:50,allyDowns:1});E.applyPayout(p);
  assert.equal(Save.data.cash,550);assert.equal(Save.data.stats.earned,550);assert.deepEqual(Save.data.events,['win_rick']);
});

test('hardware buy rules (SPEC L4-1)',()=>{
  fresh();const d=Save.data;d.cash=1000;
  const r0=E.buy('gun','smg','hardware');assert.equal(r0.ok,false);assert.match(r0.reason,/back-ordered/);
  d.prog.done[1]=true;const r=E.buy('gun','smg','hardware');assert.equal(r.ok,true);assert.equal(d.cash,100);assert.ok(d.owned.guns.includes('smg'));
  assert.equal(d.loadout.p2,'smg','new primary fills the empty slot');assert.deepEqual(d.events,['boughtGun']);
  assert.equal(E.buy('gun','smg','hardware').ok,false);
  d.prog.trust=60;assert.equal(E.priceOf('gun','smg','hardware').price,810);assert.equal(E.priceOf('gun','smg','dadazon').price,900);
  d.cash=100;const p=E.buy('gun','hunter','hardware');assert.equal(p.code,'locked');d.prog.done[2]=true;
  const q=E.buy('gun','hunter','hardware');assert.equal(q.code,'poor');assert.match(q.reason,/\$980 more/);
  assert.equal(E.buy('gun','rifle','hardware').reason,'Coach Rick has this one');
  d.prog.trust=39;assert.equal(E.status('gun','beanbag','hardware').state,'locked');d.prog.trust=40;d.cash=600;assert.equal(E.status('gun','beanbag','hardware').state,'buy');
});

test('Dadazon orders wait in pending until delivered (SPEC L4-2)',()=>{
  fresh();const d=Save.data;d.cash=2000;const before=d.furniture.owned.sofa;
  assert.equal(E.buy('furn','sofa','dadazon').delivered,'pending');assert.equal(d.furniture.owned.sofa,before);assert.deepEqual(d.pending,[{kind:'furn',id:'sofa'}]);
  assert.equal(E.buy('att','grip','dadazon').ok,true);assert.equal(E.status('att','grip','dadazon').state,'pending');
  const got=E.deliverPending();assert.equal(got.length,2);assert.equal(d.furniture.owned.sofa,before+1);assert.ok(d.owned.att.includes('grip'));
  assert.equal(d.attOn.shotgun.under,'grip','new attachment goes on the equipped gun');
  assert.deepEqual(d.events,['boughtFurniture','boughtAttachment']);assert.deepEqual(d.pending,[]);
  assert.equal(E.status('furn','shelves','hardware').state,'buy');assert.equal(E.status('furn','sofa','hardware').state,'locked');
});

test('attachments change weapon stats (SPEC L4-3)',()=>{
  assert.equal(E.weaponStats('rifle',{under:'grip'}).rc.v,C.guns.rifle.rc.v*.75);
  assert.equal(E.weaponStats('pistol',{mag:'extmag'}).mag,18);assert.equal(E.weaponStats('rifle',{mag:'extmag'}).mag,45);
  assert.equal(E.weaponStats('smg',{mag:'extmag'}).mag,48);assert.equal(E.weaponStats('nailer',{mag:'extmag'}).mag,60);
  const m=E.weaponStats('smg',{muzzle:'muffler'});assert.equal(m.muffled,true);assert.equal(m.hearR,3);assert.ok(Math.abs(m.dmg-17*.92)<1e-9);
  assert.equal(E.weaponStats('rifle',{optic:'reddot'}).ads.zoom,.82);assert.equal(E.weaponStats('pistol',{optic:'reddot'}).ads.zoom,.85);
  assert.equal(C.guns.rifle.rc.v,.009,'catalogue is not mutated');
  const b0=E.gunBars(E.weaponStats('rifle',{})),b1=E.gunBars(E.weaponStats('rifle',{under:'grip'}));
  assert.ok(b1.find(b=>b.k==='ctl').v>b0.find(b=>b.k==='ctl').v);
  for(const g of C.gunOrder)for(const b of E.gunBars(g))assert.ok(b.v>0&&b.v<=10,g+' '+b.k);
});

test('loadout rules (SPEC L3-8)',()=>{
  fresh();const d=Save.data;
  assert.equal(E.setLoadout('p2','rifle').ok,false);d.owned.guns.push('rifle');assert.equal(E.setLoadout('p2','rifle').ok,true);assert.equal(d.loadout.p2,'rifle');
  assert.equal(E.setLoadout('p1','rifle').code,'dup');assert.equal(E.setLoadout('side','shotgun').ok,false);assert.equal(E.setLoadout('p1','pistol').ok,false);
  assert.equal(E.setLoadout('p1',null).ok,false);assert.equal(E.setLoadout('p2',null).ok,true);
  d.loadout.p2='rifle';E.swapPrimaries();assert.deepEqual([d.loadout.p1,d.loadout.p2],['rifle','shotgun']);
  assert.equal(E.setAttachment('rifle','under','grip').ok,false,'must own it');d.owned.att.push('grip');
  assert.equal(E.setAttachment('pistol','under','grip').ok,false,'must fit');assert.equal(E.setAttachment('rifle','under','grip').ok,true);
});

test('armory collection unlocks at the threshold (SPEC B.5)',()=>{
  fresh();assert.equal(E.collectGun('smg').unlocked,false);const r=E.collectGun('smg');assert.equal(r.unlocked,true);
  assert.ok(Save.data.owned.guns.includes('smg'));assert.equal(E.status('gun','smg','hardware').how,'collected');
  assert.equal(E.collectGun('hunter').unlocked,true);assert.equal(E.collectGun('pistol').unlocked,false);
});

test('selling',()=>{
  fresh();const d=Save.data;assert.equal(E.sell('gun','shotgun').ok,false);
  d.owned.guns.push('revolver');d.loadout.side='revolver';assert.match(E.sell('gun','revolver').reason,/Unequip/);d.loadout.side='pistol';
  assert.deepEqual(E.sell('gun','revolver'),{ok:true,amount:225});assert.equal(d.cash,225);
  assert.match(E.sell('furn','sofa').reason,/floor/);d.furniture.owned.sofa=2;assert.equal(E.sell('furn','sofa').amount,325);
  assert.equal(E.sell('veh','engine').ok,false);
});

test('v1 save migrates to v2 (SPEC2 D)',()=>{
  fresh({v:1,cash:900,prog:{done:[true,true,true,true],trust:70},loadout:{side:'pistol',p1:'shotgun',p2:null}});const d=Save.data;
  assert.equal(Save.lastLoad.status,'migrated');assert.equal(d.prog.act,2,'a v1 player who beat the Kingpin lands in Act 2');assert.equal(d.world.bridgeOpen,true);
  assert.equal(d.prog.done.length,9);assert.equal(d.prog.trustR,5);assert.equal(d.loadout.p3,null);assert.equal(d.cash,900);
  fresh({v:2,garage:{active:'suv',owned:['minivan','hovercraft'],vehicles:{minivan:{perf:{engine:7},paint:'nope'}},hp:{minivan:999},stickers:[3,99,null],ownedStickers:[3],horn:'ode'},loadout:{p3:'smg'},owned:{guns:['pistol','shotgun','smg']}});
  const g=Save.data.garage;assert.equal(g.active,'minivan');assert.deepEqual(g.owned,['minivan']);assert.equal(g.vehicles.minivan.perf.engine,3);assert.equal(g.vehicles.minivan.paint,'slate');
  assert.equal(g.hp.minivan,Save.data.garage.vehicles.minivan.prot.armor?140:100);assert.deepEqual(g.stickers,[3,null,null]);assert.equal(g.horn,'stock');assert.equal(Save.data.loadout.p3,null,'p3 dropped without the rack');
});

test("Dad's Auto delegates to HT.Garage (SPEC2 C)",()=>{
  fresh();const d=Save.data,G=require('../js/carai.js').Garage;d.cash=20000;
  assert.equal(E.vehicleStats().maxSpeed,G.apply('minivan',G.defaultVehicle(),{}).maxSpeed,'stock = HT.Garage.apply');
  assert.equal(E.buy('gar','eng1','auto').ok,true);assert.equal(d.garage.vehicles.minivan.perf.engine,1);assert.equal(E.vehicleStats().maxSpeed,27);
  assert.match(E.status('gar','eng2','auto').reason,/Maple Heights trust 40/);d.prog.trust=40;assert.equal(E.status('gar','eng2','auto').state,'buy');
  assert.ok(E.vanStatsWith('gar','eng2').boostMax>E.vehicleStats().boostMax);
  assert.equal(E.buy('gar','armor1','auto').ok,true);assert.equal(d.garage.hp.minivan,140,'armor raises current HP too');
  d.garage.hp.minivan=100;assert.equal(E.status('rep','active','auto').price,80);assert.equal(E.buy('rep','active','auto').ok,true);assert.equal(d.garage.hp.minivan,140);
  assert.equal(E.status('rep','active','auto').state,'maxed');
  assert.equal(E.buy('cos','paint:silver','auto').ok,true);assert.equal(E.vehicleStats().paint.hex,'#b9c0c7');assert.equal(E.status('cos','paint:slate','auto').state,'owned');
  assert.deepEqual(E.garUse('cos','paint:slate'),{ok:true});assert.equal(d.garage.vehicles.minivan.paint,'slate');
  assert.equal(E.status('cos','paint:mural','auto').state,'locked');assert.equal(E.status('cos','lightBar:amber','auto').reason,'Needs Riverside trust 35%');
  assert.equal(E.buy('cos','horn:ode','auto').ok,true);assert.equal(E.vehicleStats().horn.id,'ode');assert.ok(E.vehicleStats().horn.notes.length>3);
  assert.equal(E.buy('stick','2','auto').ok,true);assert.deepEqual(d.garage.stickers,[2,null,null]);assert.equal(E.status('stick','11','auto').state,'locked');
  assert.equal(E.buy('gar','cargo','auto').ok,true);assert.equal(E.ammoFor().find(a=>a.type==='9mm').extra,24,'+2 mags of 12');
  assert.equal(E.status('car','pickup','auto').state,'locked');d.prog.done[4]=true;assert.equal(E.buy('car','pickup','auto').ok,true);assert.ok(d.garage.owned.includes('pickup'));
  assert.equal(E.status('car','pickup','auto').state,'owned');E.garUse('car','pickup');assert.equal(E.vehicleStats().type,'pickup');assert.equal(E.vehicleStats().maxSpeed,23.5);
  assert.ok(d.garage.purchases>=5);assert.equal(E.priceOf('gar','eng2','auto').price,Math.round(1200*.95),'loyalty discount');
  assert.equal(E.setLoadout('p3','smg').code,'rack');d.garage.util.rack=true;d.owned.guns.push('smg','rifle');d.loadout.p2='rifle';
  assert.equal(E.setLoadout('p3','smg').ok,true);assert.equal(E.setLoadout('p2','smg').code,'dup');assert.ok(d.events.includes('boughtCar'));
});

test('Riverside payouts (SPEC2 B.1-B.5) use Riverside trust',()=>{
  fresh();Save.data.prog.trustR=50;Save.data.prog.trust=12;
  const e=E.computePayout({mission:'earl',ok:true,bikes:3,converters:2,elapsed:250,allyDowns:1});
  assert.deepEqual(e.lines.map(l=>[l.id,l.amount]),[['base',650],['bikes',120],['converters',120],['quick',100]]);assert.equal(e.total,990);
  assert.equal(E.computePayout({mission:'rosa',ok:true,beds:11,allyDowns:1,trust:50}).total,1100);
  assert.equal(E.computePayout({mission:'rosa',ok:true,beds:6,allyDowns:1,trust:50}).total,990);
  assert.equal(E.computePayout({mission:'benny',ok:true,truckHp:.8,chaseT:30,allyDowns:1,trust:50}).total,1350);
  assert.equal(E.computePayout({mission:8,ok:true,bossDone:'cuffed',chaseT:40,vanHp:.95,allyDowns:1,trust:50}).total,2250);
  assert.equal(E.computePayout({mission:'dee',ok:true,cleanStakeout:true,ids:2,bossDone:'cuffed',allyDowns:1,trust:50,extra:[{label:'Bonus from the game',amount:10}]}).total,1360);
});

test('supplies and furniture caps',()=>{
  fresh();const d=Save.data;d.cash=5000;
  assert.equal(E.buy('sup','rangeDay','hardware').ok,true);assert.equal(d.flags.rangeDay,true);assert.equal(E.buy('sup','rangeDay','hardware').ok,false);
  assert.equal(E.buy('furn','tv','dadazon').ok,true);assert.equal(E.status('furn','tv','dadazon').state,'pending');assert.equal(E.buy('furn','tv','dadazon').ok,false);
  E.deliverPending();assert.equal(E.status('furn','tv','dadazon').state,'maxed');
  assert.equal(E.buy('furn','chair','hardware').ok,false,'dining chairs are a Dadazon thing');
});

test('HT.CATALOG.guns matches the game WEAPONS table field for field (index.html, docs/combat-integration.md)',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');const i=src.indexOf('const WEAPONS={');assert.ok(i>0,'WEAPONS in index.html');
  let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'&&--d===0){j=k+1;break}}
  const W=Function('return '+src.slice(src.indexOf('{',i),j))();
  assert.deepEqual(Object.keys(W).sort(),[...C.gunOrder].sort());
  const diffs=[];const cmp=(a,b,pth)=>{if(a&&typeof a==='object'&&!Array.isArray(a)){for(const k in a)cmp(a[k],b?b[k]:undefined,pth+'.'+k)}else if(JSON.stringify(a)!==JSON.stringify(b))diffs.push(pth+': game '+JSON.stringify(a)+' vs catalogue '+JSON.stringify(b))};
  for(const id in W)cmp(W[id],C.guns[id],id);
  assert.deepEqual(diffs,[],'every game field must equal the catalogue (the catalogue is merged over the game table)');
});

test('furniture ids are 1:1 with js/home.js and the starter layout is HT.Home\'s (docs/home.md)',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','js','home.js'),'utf8');
  const cat=src.slice(src.indexOf('const CATALOG=['),src.indexOf('const CAT={}'));const homeIds=[...cat.matchAll(/\{id:'([a-z0-9]+)'/g)].map(m=>m[1]);
  assert.deepEqual([...homeIds].sort(),Object.keys(C.furniture).sort());
  const st=src.slice(src.indexOf('Home.starterLayout=()=>'),src.indexOf('Home.fullLayout'));const items=Function('return '+st.slice(st.indexOf('['),st.lastIndexOf(']')+1))();
  assert.deepEqual(Save.defaults().furniture.placed,items,'fallback starter = HT.Home.starterLayout().items');
  fresh({v:2,furniture:{owned:{sofa:1},placed:[{uid:'st1',id:'sofa',x:22,z:8,r:0},{uid:'st2',id:'coffeetable',x:22,z:10,r:0},{uid:'st3',id:'armchair',x:28,z:9,r:3},
    {uid:'st4',id:'dining',x:34,z:20,r:0},{uid:'st5',id:'chair',x:33,z:20,r:1},{uid:'st6',id:'chair',x:36,z:20,r:3},{uid:'st7',id:'dogbed',x:36,z:12,r:0},{uid:'st8',id:'picnic',x:20,z:32,r:0}]}});
  assert.deepEqual(Save.data.furniture.placed,items,'old 1 m starter layout migrates to the home grid');
  globalThis.HT.Home={starterLayout:()=>({v:1,items:[{uid:'z',id:'plant',x:1,z:1,r:0}]})};try{assert.deepEqual(Save.defaults().furniture.placed,[{uid:'z',id:'plant',x:1,z:1,r:0}],'HT.Home wins when loaded')}finally{delete globalThis.HT.Home}
});

test('catalogue is complete and consistent',()=>{
  const num=['dmg','head','pellets','rate','mag','reserve','range','equip','speed','price'];
  for(const id of C.gunOrder){const g=C.guns[id];for(const k of num)assert.equal(typeof g[k],'number',id+'.'+k);
    assert.ok(C.ammo[g.ammo],id);assert.ok(g.name&&g.blurb&&['side','prim'].includes(g.slot));}
  for(const id in C.attachments){const a=C.attachments[id];assert.ok(a.compat.every(g=>C.guns[g]));}
  for(const id in C.furniture){const f=C.furniture[id];assert.ok(f.price>0&&f.cells.length===2&&['in','out','any'].includes(f.zone),id);
    if(f.model)assert.ok(fs.existsSync(path.join(__dirname,'..',f.model)),'missing model '+f.model);}
  for(const e of Save.defaults().furniture.placed)assert.ok(C.furniture[e.id]);
  // a clean campaign pays ~$4.5-6.5k (SPEC D.1): enough for a couple of guns and some attachments, with furniture and van upgrades for reruns
  const sum=a=>a.reduce((x,y)=>x+y,0);
  const guns=sum(C.gunOrder.map(g=>C.guns[g].price)),att=sum(Object.values(C.attachments).map(a=>a.price));
  const furn=sum(Object.values(C.furniture).map(f=>f.price));
  assert.ok(guns+att>4500&&guns+att<8000,'arsenal '+(guns+att));assert.ok(furn>6500,'furniture '+furn);
  for(const g of C.gunOrder){const w=C.guns[g];assert.ok(Array.isArray(w.rc.pat)&&w.vm&&w.snd&&w.snd.crack,g+' feel data')}
  assert.equal(C.garage,require('../js/carai.js').Garage,'vehicle catalogue is HT.Garage, not a copy');
  const best=sum([0,1,2,3].map(i=>E.computePayout({mission:i,ok:true,cuffs:4,confiscated:3,allyDowns:0,got:4,elapsed:100,timeLeft:60,bossDone:'cuffed',trust:80}).total));
  assert.ok(best>4500&&best<8000,'clean campaign pays '+best);
});

test('a Dadazon gun order is refunded when the armory unlocks the same gun first (no lost purchase)',()=>{
  fresh();const d=Save.data;d.cash=2000;d.prog.done[1]=true;
  const r=E.buy('gun','smg','dadazon');assert.equal(r.ok,true);assert.equal(r.delivered,'pending');const paid=r.price,after=d.cash;
  let u;for(let i=0;i<10&&!(u&&u.unlocked);i++)u=E.collectGun('smg');assert.equal(u.unlocked,true);
  assert.equal(d.pending.length,0,'order cancelled');assert.equal(d.cash,after+paid,'paid price refunded');assert.ok(d.owned.guns.includes('smg'));
});
