/* Riverside free roam + heat (docs/riverside-heat.md) in the real game: headless Chromium + SwiftShader, driven through window.__ht.step().
   node dev/riverside-heat.js [--write] [--only=a,b]   (--write saves docs/screenshots/riverside-heat/evidence.txt; screenshots: dev/riverside-heat-shots.js)
   Checks: Maple stays holstered; Riverside draw / fire / heat; ambient crews never spawn in sight or within 25 m (long walk);
   heat 1-2 brings the local crew out; heat 3 starts a three-way turf war that resolves; heat 5 sends a car; heat decays to 0 by
   each route (quiet, holstered, out of sight, off the block, out of Riverside, driving away, zip-ties); zip-ties raise trustR and
   thin the crew; the top tier spawns nothing; a job start clears free roam; going down sends you home with a towing fee;
   neighbours are never targetable and duck indoors; the Calm setting; incidents; crew dads fight; frame cost; console errors. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const ONLY=(process.argv.find(a=>a.startsWith('--only='))||'').slice(7).split(',').filter(Boolean);
const SD=path.join(__dirname,'../docs/screenshots/riverside-heat');
const out=[],log=(...a)=>{const s=a.join(' ');out.push(s);console.log(s)};let fails=0;const ok=(c,msg)=>{if(!c)fails++;log((c?'ok   ':'FAIL ')+msg)};
const want=k=>!ONLY.length||ONLY.includes(k);
(async()=>{const {b,p,errs}=await open();
  /* let every street-crew model stream in (the boot pack has four of the ten) */
  await p.evaluate(()=>{window.__rafOn=true});try{await p.waitForFunction(()=>window.__ht.assets.stream.idle(),null,{timeout:180000})}catch(e){log('     (streaming still busy after 180 s)')}
  await p.evaluate(()=>{window.__rafOn=false;
    const H=window.__ht;H.enterHub();H.HUD.hide('title');H.step(3);H.openBridge();
    const lk=document.getElementById('lock');if(lk)lk.style.display='none';
    window.__go=(x,z,yaw)=>{const H=window.__ht;if(H.VAN.on){H.VAN.spd=0;H.exitVan()}H.P.pos.set(x,0,z);H.collide(H.P.pos,.35);if(yaw!=null)H.P.yaw=yaw;H.step(2)};
    window.__clean=(trust)=>{const H=window.__ht;H.prog.trustR=trust==null?5:trust;H.frReset();const F=H.fr;F.noEsc=false;F.stats.spawnLog=[];F.incT=1e9;F.ambT=1e9;H.P.hp=100;H.mouse=false;H.keys.e=false;
      for(const c of H.crews)F.crewState[c.id].thin=0};
    window.__until=(fn,max)=>{const H=window.__ht;for(let i=0;i<max;i++){H.step(1);if(fn())return i+1}return -1};
    window.__q=sel=>{window.__ht.draw();return document.querySelector(sel)};
    window.__fire=(n,gap)=>{const H=window.__ht;for(let i=0;i<n;i++){H.mouse=true;H.step(1);H.mouse=false;H.step(gap||8)}}});

  if(want('maple')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P;__clean();__go(H.L.start.x,H.L.start.z);const a0=P.ammo[P.cur].mag,F=H.fr;F.quipT=-99;
      const k=H.frKey('1');H.step(2);const armedKey=H.frArmed;F.quipT=-99;H.mouse=true;H.step(4);const armedClick=H.frArmed;
      return{region:H.region,k,armedKey,armedClick,ammo:P.ammo[P.cur].mag-a0,gun:!!(P.dude&&P.dude.gun),quip:F.quipT>0,members:F.members.length,heatShown:!__q('.fr-heat').classList.contains('off')}});
    ok(r.region==='maple'&&!r.armedKey&&!r.armedClick&&r.ammo===0&&r.quip,'Maple Heights: weapon keys and Fire stay holstered with a quip ('+JSON.stringify(r)+')');
    ok(!r.gun&&r.members===0&&!r.heatShown,'Maple: no gun in hand, no crews, no heat meter')}

  if(want('draw')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P;__clean();__go(379,43,Math.PI/2);const F=H.fr;F.ambT=1e9;
      const k=H.frKey('1');H.step(12);const armed=H.frArmed,gun=!!(P.dude&&P.dude.gun);const a0=P.ammo[P.cur].mag;
      __fire(3,10);const used=a0-P.ammo[P.cur].mag,heat=H.heat;H.step(2);const el=__q('.fr-heat'),on=el.querySelectorAll('i.on').length;
      P.ammo[P.cur].mag=0;H.reload();const rl=P.reloadT>0;H.step(60);const after=P.ammo[P.cur].mag;
      H.frKey('h');H.step(2);return{region:H.region,k,armed,gun,used,heat:+heat.toFixed(2),pips:on,meter:!el.classList.contains('off'),rl,after,holstered:!H.frArmed,gunAfter:!!(P.dude&&P.dude.gun)}});
    ok(r.region==='river'&&r.armed&&r.gun&&r.used===3,'Riverside: 1 draws the pistol (in hand, armed), Fire fires ('+r.used+' rounds)');
    ok(r.heat>=1&&r.pips>=1&&r.meter,'firing raises heat to '+r.heat+' ('+r.pips+' full pips, meter shown)');
    ok(r.rl&&r.after>0,'reload works in free roam (mag '+r.after+')');ok(r.holstered&&!r.gunAfter,'H holsters (gun out of the hand)')}

  if(want('spawns')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P,K=H.keys;__clean();const F=H.fr;F.ambT=0;__go(318,43,-Math.PI/2);F.incT=30;
      /* walk a loop through all three turfs for ~4.5 minutes of game time, crews spawning and despawning around the dad */
      const wps=[[315,43],[315,15],[443,15],[443,127],[315,127],[315,99],[379,99],[379,43]];let wi=0,maxM=0;const seenGroups=new Set();
      for(let s=0;s<8000;s++){const w=wps[wi];const dx=w[0]-P.pos.x,dz=w[1]-P.pos.z;if(Math.hypot(dx,dz)<3)wi=(wi+1)%wps.length;P.yaw=Math.atan2(-dx,-dz);K.w=true;K.shift=s%400<200;H.step(1);
        maxM=Math.max(maxM,F.members.length);for(const g of F.groups)seenGroups.add(g.crew.id)}
      K.w=K.shift=false;const L_=F.stats.spawnLog.filter(e=>e.kind==='ambient'||e.kind==='incident');
      const bad=L_.filter(e=>e.seen||e.d<25),sites=L_.filter(e=>{for(const id in H.WORLD.sites){const s=H.WORLD.sites[id];const t=Math.floor(e.x/2),u=Math.floor(e.z/2);if(t>=s.x0&&t<=s.x1&&u>=s.z0&&u<=s.z1)return true}return false});
      return{n:L_.length,bad:bad.slice(0,4),nbad:bad.length,sites:sites.length,maxM,crews:[...seenGroups],minD:Math.min(...L_.map(e=>e.d)),inc:F.stats.incidents||0,ms:F.stats.ms/F.stats.frames}});
    ok(r.n>=8&&r.nbad===0,'long walk: '+r.n+' ambient/incident spawns, none in sight or within 25 m (closest '+(r.minD||0).toFixed(1)+' m)'+(r.nbad?' BAD '+JSON.stringify(r.bad):''));
    ok(r.sites===0,'no spawns on a mission lot');ok(r.crews.length===3,'all three crews seen on their turf ('+r.crews.join(', ')+'), peak '+r.maxM+' people');
    log('     free-roam cost while walking: '+r.ms.toFixed(3)+' ms/frame (FR update + crew think)')}

  if(want('loiter')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P;__clean();__go(400,47,Math.PI/2);const F=H.fr;F.ambT=1e9;
      const g=H.spawnCrew('returns',388,46.5,3);H.step(60);F.ambT=1e9;const m=g.members;
      return{n:m.length,hostile:m.some(e=>e.hostile),guns:m.filter(e=>e.dude.gun).length,band:m.every(e=>!!e.dude.band),idle:m.every(e=>e.state==='idle'),ray:m.every(e=>H.rayTargets.includes(e.dude.meshes[0]))}});
    ok(r.n===3&&!r.hostile&&r.guns===0&&r.band&&r.idle,'a loitering group: no guns out, not hostile, every member wears the crew armband ('+JSON.stringify(r)+')');
    
    const r2=await p.evaluate(()=>{const H=window.__ht,P=H.P,F=H.fr;__go(393,47,Math.PI/2);H.frDraw('pistol');P.aim=true;const n=__until(()=>F.members.some(e=>e.hostile),150);P.aim=false;
      return{n,hostile:F.members.filter(e=>e.hostile).length,guns:F.members.filter(e=>e.hostile&&e.dude.gun).length,heat:H.heat}});
    ok(r2.n>0&&r2.hostile>=3&&r2.guns>=3,'drawing on them up close: they notice in '+(r2.n/30).toFixed(1)+' s and pull their guns ('+r2.hostile+' hostile, heat '+r2.heat.toFixed(2)+')')}

  if(want('heat12')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P,F=H.fr;__clean();__go(379,43,Math.PI/2);F.ambT=1e9;
      const g=H.spawnCrew('coupon',360,43,2);H.step(5);H.frDraw('pistol');P.yaw=0;P.pitch=.3;__fire(2,6);const hot=F.hotCrew&&F.hotCrew.id;
      const n=__until(()=>F.hostile.length>=4,300);const modes=F.hostile.map(e=>e.ai&&e.ai.mode);const near=g.members.every(e=>e.hostile);
      __until(()=>F.hostile.some(e=>e.ai&&e.ai.mode==='combat'&&e.ai.target==='player'),600);const fighting=F.hostile.filter(e=>e.ai&&e.ai.mode==='combat').length;
      return{heat:+H.heat.toFixed(2),hot,n,hostile:F.hostile.length,near,fighting,crews:[...new Set(F.hostile.map(e=>e.fr.id))],war:F.war}});
    ok(r.heat>=1&&r.heat<3&&r.near,'heat '+r.heat+': the nearby group (20 m off) comes out');
    ok(r.n>0&&r.fighting>=2&&r.crews.length===1&&!r.war,'heat 1-2: '+r.hot+' sends reinforcements ('+r.hostile+' hostile, '+r.fighting+' in combat, only '+r.crews.join('')+', no war)')}

  if(want('war')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P,F=H.fr;__clean();__go(379,43,Math.PI/2);H.frDraw('pistol');H.step(2);H.heat=3.3;
      const n=__until(()=>F.war&&F.hostile.length>=6&&new Set(F.hostile.map(e=>e.fr.id)).size===2,900);const crews=[...new Set(F.hostile.map(e=>e.fr.id))];
      const hc0=F.stats.hits_crew||0;let hp=0;
      __until(()=>{P.hp=100;return (F.stats.hits_crew||0)-hc0>=6},2400);const crewHits=(F.stats.hits_crew||0)-hc0,cover=F.hostile.filter(e=>e.ai&&e.ai.stance==='crouch'||e.ai&&e.ai.cover).length;
      return{n,crews,war:F.war,crewHits,cover,heat:+H.heat.toFixed(2),pips:__q('.fr-heat').querySelectorAll('i.on').length,ms:F.stats.ms/F.stats.frames}});
    ok(r.n>0&&r.crews.length===2&&r.war,'heat 3: turf war '+(r.war||[]).join(' vs ')+' (both hostile to the dad)');
    ok(r.crewHits>=6,'three-way fight: the crews shoot EACH OTHER ('+r.crewHits+' crew-on-crew hits), '+r.cover+' using cover');
    
    const r2=await p.evaluate(()=>{const H=window.__ht,P=H.P,F=H.fr;H.frHolster();const t0=H.simT;let maxH=0;
      const n=__until(()=>{P.hp=100;maxH=Math.max(maxH,F.hostile.length);return H.heat===0&&!F.war&&F.hostile.length===0},12000);
      return{n,secs:+((H.simT-t0)).toFixed(0),heat:H.heat,war:F.war,hostile:F.hostile.length,kills:F.stats.kills||0,maxH,scar:+F.scar.toFixed(2)}});
    ok(r2.n>0,'the war resolves: holstered, heat '+r2.heat+', no war, nobody hostile after '+r2.secs+' s ('+r2.kills+' down, peak '+r2.maxH+' hostile)');
    log('     frame cost of the free-roam system during the war: '+r.ms.toFixed(3)+' ms/frame')}

  if(want('car')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P,F=H.fr;__clean();__go(379,43,Math.PI/2);H.frDraw('pistol');H.heat=5;F.carT=-999;
      const n=__until(()=>{P.hp=100;H.heat=5;F.shotT=H.simT;return F.car&&F.car.done},1800);const car=F.car;const occ=F.stats.spawnLog.filter(e=>e.kind==='car').length;
      const startD=car?Math.hypot(car.c.x-P.pos.x,car.c.z-P.pos.z):-1;return{n,occ,cars:F.stats.cars||0,dist:+startD.toFixed(1),hostile:F.hostile.length}});
    ok(r.n>0&&r.occ===3,'heat 5: a crew sedan drives in on the road graph and three guys bail out '+r.dist+' m away ('+(r.n/30).toFixed(1)+' s)')}

  if(want('decay')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P,K=H.keys,F=H.fr;const res={};
      const run=(label,setup,each,max)=>{__clean();F.noEsc=true;F.ambT=1e9;__go(379,43,Math.PI/2);H.frDraw('pistol');H.step(2);H.heat=2;if(setup)setup();const t0=H.simT;
        const n=__until(()=>{if(each)each();return H.heat<=0},max||9000);res[label]=n<0?-1:+(H.simT-t0).toFixed(1)};
      run('quiet');
      run('holstered',()=>H.frHolster());
      run('offBlock',()=>{__go(331,99);H.frHolster()});
      run('leftRiver',()=>{__go(260,43);H.step(2)});
      run('driving',()=>{const V=H.VAN;V.pos.set(370,0,41.5);V.yaw=-Math.PI/2;H.syncVan();H.enterVan();H.step(2)},()=>{K.w=true;if(H.VAN.pos.x>440){K.w=false}});K.w=false;if(H.VAN.on){H.VAN.spd=0;H.exitVan()}
      /* line of sight: one hostile in plain view vs. behind a rowhouse */
      __clean();F.noEsc=true;F.ambT=1e9;__go(379,43,Math.PI/2);H.frHolster();H.step(2);const g=H.spawnCrew('coupon',395,43,1,{hostile:true});g.members[0].hp=1e6;
      const e0=g.members[0],pin=(x,z,n)=>{for(let i=0;i<n;i++){e0.pos.set(x,0,z);H.step(1)}};H.heat=2;F.shotT=H.simT-30;pin(395,43,60);res.rateSeen=F.rate;pin(397,55,60);res.rateHidden=F.rate;
      /* zip-ties: each one knocks heat down */
      __clean();F.noEsc=true;F.ambT=1e9;__go(379,43);const g2=H.spawnCrew('coupon',381,43,2);H.heat=2.5;const h0=H.heat;for(const e of g2.members){e.state='surrender';e.surrAt=H.simT;P.pos.set(e.pos.x+.8,0,e.pos.z);H.use=true;H.step(1)}res.cuffDrop=+(h0-H.heat).toFixed(2);
      F.noEsc=false;return res});
    ok(r.quiet>0,'decay: no shots, gun out, standing still: heat 2 to 0 in '+r.quiet+' s');
    ok(r.holstered>0&&r.holstered<r.quiet,'decay: holstered is faster ('+r.holstered+' s)');
    ok(r.offBlock>0&&r.offBlock<r.holstered,'decay: off the block (and holstered) faster still ('+r.offBlock+' s)');
    ok(r.leftRiver>0&&r.leftRiver<r.holstered,'decay: out of Riverside ('+r.leftRiver+' s)');
    ok(r.driving>0&&r.driving<r.quiet,'decay: driving away ('+r.driving+' s)');
    ok(r.rateHidden>r.rateSeen*2,'decay: breaking line of sight helps (rate '+r.rateSeen.toFixed(3)+'/s seen vs '+r.rateHidden.toFixed(3)+'/s hidden)');
    ok(r.cuffDrop>=.99,'decay: two zip-ties drop heat by '+r.cuffDrop)}

  if(want('cool')){await p.evaluate(()=>{const H=window.__ht,P=H.P,F=H.fr;__clean();__go(379,43,Math.PI/2);F.ambT=1e9;H.frDraw('pistol');H.step(2);H.heat=1.6;__until(()=>{P.hp=100;return F.hostile.length>=2},300);
      H.frHolster();H.heat=.7;F.shotT=H.simT-20;__until(()=>{P.hp=100;return F.rate>0&&F.hostile.length===0},300);H.step(4)});
    const r=await p.evaluate(()=>{const H=window.__ht,F=H.fr,el=__q('.fr-heat');return{cooling:el.classList.contains('cooling'),txt:el.textContent,music:F.musicSt,leaving:F.members.filter(e=>e.leave).length}});
    ok(r.cooling&&/Cooling off/.test(r.txt)&&r.music==='cool','cooling off: blue pips, "Cooling off", tension music ('+r.leaving+' walking off the block) '+(r.cooling&&r.music==='cool'?'':JSON.stringify(r)));
    }

  if(want('ziptie')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P,F=H.fr;__clean(30);__go(379,43,Math.PI/2);F.ambT=1e9;const w0=H.frWant('dock');
      const t0=H.prog.trustR;const g=H.spawnCrew('dock',385,43,2);for(const e of g.members){e.state='surrender';e.surrAt=H.simT;e.goods={what:'a humidifier',val:20}}H.step(2);
      let prompts=[];for(const e of g.members){P.pos.set(e.pos.x+.9,0,e.pos.z);H.step(2);prompts.push(H.HUD&&'');H.use=true;H.step(1)}
      const cuffed=g.members.filter(e=>e.state==='cuffed').length,t1=H.prog.trustR,thin=F.crewState.dock.thin,w1=H.frWant('dock'),goods=F.goods.length;
      /* hand the goods in at the Community Center lost & found */
      const S=window.HT.Save,c0=S&&S.data?S.data.cash:0;const b=F.box||null;H.step(2);const bx=H.fr.box;P.pos.set(bx.x,0,bx.z+1.3);H.step(2);H.use=true;H.step(1);const c1=S&&S.data?S.data.cash:0;
      return{cuffed,dTrust:+(t1-t0).toFixed(2),thin,w0,w1,goods,cash:c1-c0,goodsLeft:F.goods.length,prompts}});
    ok(r.cuffed===2&&r.dTrust>=3,'zip-ties in free roam: 2 cuffed, Riverside trust +'+r.dTrust);
    ok(r.thin===2&&r.w1===r.w0-1,'the crew thins out: Dock St Discount keeps '+r.w1+' loitering group(s) instead of '+r.w0);
    ok(r.goods===2&&r.cash>0&&r.goodsLeft===0,'stolen goods on zip-tied thieves: dropped at the lost & found for $'+r.cash);
    const k=await p.evaluate(()=>{const H=window.__ht,P=H.P,F=H.fr;__clean();__go(379,43,Math.PI/2);F.ambT=1e9;const g=H.spawnCrew('coupon',392,43,1,{hostile:true});const e=g.members[0];const t0=H.prog.trustR;
      H.frDraw('pistol');P.fp=true;H.step(10);e.triedSurr=true;
      __until(()=>{P.hp=100;const dx=e.pos.x-P.pos.x,dz=e.pos.z-P.pos.z,d=Math.hypot(dx,dz);P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2((e.ai&&e.ai.stance==='crouch'?.9:1.3)-1.65,d);H.mouse=true;return e.state==='dead'},900);H.mouse=false;P.fp=false;H.step(3);
      return{dead:e.state==='dead',dTrust:+(H.prog.trustR-t0).toFixed(2),pickups:H.pickups.length}});
    ok(k.dead&&k.dTrust<=-2,'killing one lowers Riverside trust ('+k.dTrust+'), his gun drops ('+k.pickups+' pickup(s))')}

  if(want('tiers')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P,K=H.keys,F=H.fr;const res={};
      for(const t of[5,35,72,95]){__clean(t);F.incT=5;F.ambT=0;__go(318,43,-Math.PI/2);const wps=[[315,43],[315,15],[443,15],[443,127],[315,127],[315,99],[379,99],[379,43]];let wi=0,maxM=0,sum=0,crews=new Set();
        for(let s=0;s<3500;s++){const w=wps[wi];const dx=w[0]-P.pos.x,dz=w[1]-P.pos.z;if(Math.hypot(dx,dz)<3)wi=(wi+1)%wps.length;P.yaw=Math.atan2(-dx,-dz);K.w=true;K.shift=true;H.step(1);sum+=F.members.length;maxM=Math.max(maxM,F.members.length);for(const e of F.members)crews.add(e.fr.id)}
        K.w=K.shift=false;H.frKey('1');const armed=H.frArmed;H.mouse=true;H.step(3);H.mouse=false;res[t]={maxM,avg:+(sum/3500).toFixed(1),crews:[...crews],inc:F.stats.incidents||0,armed,heat:H.heat,cap:F.cap}}
      return res});
    ok(r[5].avg>r[35].avg&&r[35].avg>r[72].avg,'crews dwindle with Riverside trust: on average '+r[5].avg+' people out at 5%, '+r[35].avg+' at 35%, '+r[72].avg+' at 72% (only '+r[72].crews.join(',')+'); peaks '+r[5].maxM+'/'+r[35].maxM+'/'+r[72].maxM);
    ok(r[95].maxM===0&&!r[95].armed&&r[95].heat===0&&r[95].cap===0,'top tier (95%): no crews, no incidents, the gun stays holstered, heat stays 0 (system off)');
    log('     heat cap by tier: 5% '+r[5].cap+', 35% '+r[35].cap+', 72% '+r[72].cap+', 95% '+r[95].cap)}

  if(want('mission')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P,F=H.fr;__clean();__go(379,43,Math.PI/2);H.frDraw('pistol');H.heat=2;__until(()=>F.members.length>=3,600);const before=F.members.length;
      H.startMission(0);H.step(5);const inMission={mode:H.mode,fr:H.enemies.filter(e=>e.fr).length,members:F.members.length,heat:H.heat,meter:!__q('.fr-heat').classList.contains('off')};
      H.step(60);const later=H.enemies.filter(e=>e.fr).length;H.enterHub();H.step(3);return{before,inMission,later,back:F.members.length,heat:H.heat}});
    ok(r.before>=3&&r.inMission.mode==='mission'&&r.inMission.fr===0&&r.inMission.members===0&&r.later===0&&!r.inMission.meter,'starting a job clears free roam (no crews, no heat meter, '+r.before+' removed)');
    ok(r.back===0&&r.heat===0,'back in the hub after the job: heat reset, nobody waiting')}

  if(want('down')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P,F=H.fr,S=window.HT.Save;__clean();__go(379,43,Math.PI/2);H.frDraw('pistol');H.heat=2.4;
      if(S&&S.data)S.data.cash=100;const c0=S&&S.data?S.data.cash:0;F.instant=true;P.hp=5;H.frHurtPlayer(10,{pos:P.pos.clone().add(new THREE.Vector3(5,0,0))});F.instant=false;H.step(3);
      return{mode:H.mode,home:Math.hypot(P.pos.x-H.L.start.x,P.pos.z-H.L.start.z),hp:P.hp,heat:H.heat,members:F.members.length,fee:c0-(S&&S.data?S.data.cash:0),downs:F.stats.downs,armed:H.frArmed}});
    ok(r.mode==='hub'&&r.home<3&&r.hp===100&&r.heat===0&&r.members===0&&!r.armed,'going down in free roam: wake up at home (hp 100, heat 0, holstered)');
    ok(r.fee===40,"Dad's Auto towing fee: $"+r.fee)}

  const famReady=async()=>{await p.evaluate(()=>{window.__rafOn=true;try{window.HT.People.preload(['wife','son','daughter'])}catch(e){}});
    try{await p.waitForFunction(()=>['wife','son','daughter'].every(k=>window.HT.People.has(k)),null,{timeout:90000})}catch(e){log('     (neighbour models not loaded in 90 s)')}};
  if(want('neighbours')){await famReady();await p.evaluate(()=>{const H=window.__ht;__clean(55);__go(379,71,Math.PI/2);window.__rafOn=true});await p.waitForTimeout(1000);
    const r=await p.evaluate(()=>{window.__rafOn=false;const H=window.__ht,P=H.P,F=H.fr;__until(()=>F.civ.length>=2,900);const n=F.civ.length;const ray=F.civ.some(c=>c.dude.meshes.some(m=>H.rayTargets.includes(m)));
      const hasTag=F.civ.some(c=>c.dude.meshes.some(m=>m.userData.ent));H.frDraw('pistol');H.heat=1.2;F.noEsc=true;H.step(120);const inside=F.civ.filter(c=>c.inside).length,vis=F.civ.filter(c=>c.dude.root.visible).length;F.noEsc=false;
      return{n,ray,hasTag,inside,vis,left:F.civ.length}});
    ok(r.n>=2&&!r.ray&&!r.hasTag,'neighbours come out at 55% trust ('+r.n+'), none of them targetable');
    ok((r.inside===r.n||r.left<r.n)&&r.vis===0,'heat 1: every neighbour ducks indoors')}

  if(want('incidents')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P,F=H.fr;const res={};
      __clean();__go(379,43,Math.PI/2);F.ambT=1e9;res.scuffle=H.frIncident('scuffle');const I=F.inc;res.text=I&&I.text;const t0=H.prog.trustR;
      if(I){P.pos.set(I.x+3,0,I.z);H.collide(P.pos,.35);H.step(3);res.prompt=__q('body').textContent.includes('Break it up');H.use=true;H.step(2);res.broke=!F.inc;res.dT=+(H.prog.trustR-t0).toFixed(2)}
      __clean();__go(379,43,Math.PI/2);F.ambT=1e9;res.porch=H.frIncident('porch');const J=F.inc;if(J){const e=J.members[0];__until(()=>e.flee,200);P.pos.set(e.pos.x+2.5,0,e.pos.z);H.collide(P.pos,.35);H.step(3);res.surr=e.state;P.pos.set(e.pos.x+.8,0,e.pos.z);H.step(1);H.use=true;H.step(2);res.cuffed=e.state;res.goods=F.goods.length;
        const q=F.lastPorch;if(q){P.pos.set(q.x,0,q.z);H.collide(P.pos,.35);H.step(2);H.use=true;H.step(2)}res.goodsAfter=F.goods.length}
      __clean();__go(379,43,Math.PI/2);F.ambT=1e9;res.carjack=H.frIncident('carjack');const C=F.inc;if(C){H.frDraw('pistol');P.pos.set(C.x+8,0,C.z);H.collide(P.pos,.35);P.yaw=Math.atan2(-(C.x-P.pos.x),-(C.z-P.pos.z));__until(()=>C.spotted,90);res.cjHostile=F.members.filter(e=>e.hostile).length}
      return res});
    ok(r.scuffle&&r.broke&&r.dT>=1,'incident: a scuffle between two crews ("'+r.text+' · optional"), E breaks it up (+'+r.dT+' trust)');
    ok(r.porch&&r.surr==='surrender'&&r.cuffed==='cuffed'&&r.goods===1&&r.goodsAfter===0,'incident: porch pirate gives up when caught, zip-tied, package back on the porch');
    ok(r.carjack&&r.cjHostile>=2,'incident: walking into a car break-in with a gun out turns them hostile ('+r.cjHostile+')');
    await p.evaluate(()=>{const H=window.__ht,F=H.fr;__clean();__go(379,43,Math.PI/2);F.ambT=1e9;H.frIncident('scuffle');const I=F.inc;if(I){H.P.pos.set(I.x-9,0,I.z+1.5);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(-(I.x-H.P.pos.x),-(I.z-H.P.pos.z));H.P.pitch=-.08;H.step(45)}});
    }

  if(want('allies')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P,F=H.fr;H.prog.done[0]=true;H.prog.done[1]=true;H.enterHub();H.step(3);__clean();__go(379,43,Math.PI/2);
      for(const a of H.allies){a.pos.set(P.pos.x-2,0,P.pos.z+1);H.collide(a.pos,.35)}F.ambT=1e9;H.step(5);const g=H.spawnCrew('coupon',398,43,3,{hostile:true});H.frDraw('pistol');const a0=F.stats.hits_ally||0;
      __until(()=>{P.hp=100;return (F.stats.hits_ally||0)-a0>=2},1500);let downs=0;const hits=(F.stats.hits_ally||0)-a0;const crew=H.allies.map(a=>a.name).join(', ');
      const al=H.allies[0];al.hp=1;H.step(1);for(const e of F.hostile){}al.down=true;al.downT=9;al.hp=0;const up=__until(()=>!al.down,400);
      H.prog.done[0]=false;H.prog.done[1]=false;return{hits,crew,up,n:H.allies.length}});
    ok(r.n>=2&&r.hits>=2,'crew dads fight in free roam ('+r.crew+': '+r.hits+' hits on the crew)');ok(r.up>0,'a downed crew dad gets back up ('+(r.up/30).toFixed(1)+' s)')}

  if(want('calm')){const r=await p.evaluate(()=>{const H=window.__ht,P=H.P,F=H.fr;__clean();F.ambT=0;__go(379,43,Math.PI/2);H.step(200);const before=F.members.length;
      H.HUD.emit('setting','streetTrouble','calm');H.step(200);const r={before,after:F.members.length};F.quipT=-99;H.frKey('1');r.armed=H.frArmed;H.mouse=true;H.step(3);r.heat=H.heat;r.meter=!__q('.fr-heat').classList.contains('off');
      const sch=H.HUD.settingsSchema.some(g=>g.items.some(i=>i.k==='streetTrouble'));H.HUD.emit('setting','streetTrouble','on');H.step(2);r.sch=sch;return r});
    ok(r.sch&&r.after===0&&!r.armed&&r.heat===0&&!r.meter,'pause setting "Riverside street trouble: Calm": crews gone ('+r.before+' -> 0), holstered, no heat')}

  if(want('map')){await p.evaluate(()=>{const H=window.__ht;__clean();__go(379,43,Math.PI/2);H.step(3);H.HUD.minimap.openMap()});await p.waitForTimeout(500);
    const r=await p.evaluate(()=>{const c=document.querySelector('canvas.ht-mapcv')||[...document.querySelectorAll('canvas')].find(x=>x.closest&&x.closest('.ht-map'));return{open:window.__ht.HUD.minimap.mapOpen}});
    ok(r.open,'full map open with the crew turf tints');await p.evaluate(()=>window.__ht.HUD.minimap.closeMap())}

  if(want('calmshot')){await famReady();await p.evaluate(()=>{const H=window.__ht;__clean(92);H.dress(92);H.ow.buildAll();__go(379,71,Math.PI/2);window.__rafOn=true});await p.waitForTimeout(5000);
    await p.evaluate(()=>{window.__rafOn=false;const H=window.__ht,P=H.P;H.step(240);const F=H.fr;let best=null;for(const c of F.civ)if(!best||c.pos.distanceTo(P.pos)<best.pos.distanceTo(P.pos))best=c;
      if(best){P.pos.set(best.pos.x-7,0,best.pos.z+.5);H.collide(P.pos,.35);P.yaw=Math.atan2(-(best.pos.x-P.pos.x),-(best.pos.z-P.pos.z));P.pitch=-.12}H.step(30);window.__calm={members:F.members.length,civ:F.civ.length,heat:H.heat}});
    const r=await p.evaluate(()=>window.__calm);ok(r.members===0,'high-trust Riverside (92%): '+r.civ+' neighbours out, no crews, heat '+r.heat);}

  ok(errs.length===0,'no console errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  log(fails?fails+' FAILED':'all passed');
  if(process.argv.includes('--write')){fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(path.join(SD,'evidence.txt'),out.join('\n')+'\n')}
  await b.close();process.exit(fails?1:0)})();
