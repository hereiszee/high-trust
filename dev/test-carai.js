const assert=require('assert'),{test,suite,done,load}=require('./harness');const HT=load(),Wd=HT.World,R=HT.Roads,Ga=HT.Garage,C=HT.CarAI;
suite('carai');
const def=Wd.build({bridgeOpen:true}),G=R.build(def),collide=C.tileCollider(def);
const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e;
/* how far (m) a point is outside the drivable surface: 0 on asphalt/bridge, else distance to the nearest drivable tile */
const offRoad=(x,z)=>{const tx=Math.floor(x/2),tz=Math.floor(z/2);if(',=Vl'.includes(def.map[tz][tx]))return 0;let best=9;
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const c=def.map[tz+dz][tx+dx];if(!',=Vl'.includes(c))continue;const x0=(tx+dx)*2,z0=(tz+dz)*2;best=Math.min(best,Math.hypot(Math.max(x0-x,0,x-x0-2),Math.max(z0-z,0,z-z0-2)))}return best};
test('stock minivan stats equal index.html updVan constants',()=>{const s=Ga.apply('minivan');
  assert.deepStrictEqual([s.maxSpeed,s.boostMax,s.accel,s.boostAccel,s.brake,s.hbrake,s.coast,s.revMax,s.revAccel,s.steerResp,s.turn,s.turnFade,s.hp,s.slots,s.ammoBonus],[25,33,9,12,24,20,3.5,8,7,7,1.55,.75,100,3,0])});
test('index.html CAR_FEEL matches HT.Garage stock stats for every type',()=>{const src=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
  for(const t of Object.keys(Ga.VEH)){const m=new RegExp('\\n '+t+':\\s*\\{([^\\n]*)\\}').exec(src.slice(src.indexOf('const CAR_FEEL=')));assert(m,t);const g=k=>+new RegExp('[,{\\s]'+k+':\\s*([\\d.]+)').exec('{'+m[1])[1],V=Ga.VEH[t];
    for(const[a,b]of[['max','max'],['boostMax','boostMax'],['acc','acc'],['boostAcc','boostAcc'],['brake','brake'],['hbrake','hbrake'],['steerResp','steerResp'],['turn','turn'],['grip','grip']])assert.strictEqual(g(a),V[b],t+'.'+a)}});
test('upgrades: eng2 + tyre2 + brk2 (SPEC2 E W5-1)',()=>{const v=Ga.defaultVehicle();v.perf={engine:2,tyres:2,brakes:2,sport:false};const s=Ga.apply('minivan',v);
  assert.strictEqual(s.maxSpeed,29);assert.strictEqual(s.boostMax,38);assert(near(s.accel,12.33));assert(near(s.grip,13.95));assert.strictEqual(s.brake,36);assert(s.absGrip)});
test('protection and utility map to hp, ram, bullets, ammo, slots',()=>{const v=Ga.defaultVehicle();v.prot={bullBar:true,armor:2};const s=Ga.apply('minivan',v,{cargo:true,rack:true,aid:true});
  assert.strictEqual(s.hp,190);assert.strictEqual(s.bulletMul,.5);assert.strictEqual(s.ramDealtFront,2);assert.strictEqual(s.impactTakenFront,.5);assert.strictEqual(s.ammoBonus,2);assert.strictEqual(s.slots,4);assert(s.firstAid);
  assert.strictEqual(Ga.apply('pickup',Ga.defaultVehicle(),{cargo:true}).ammoBonus,4)});
test('requirements give readable reasons',()=>{assert.strictEqual(Ga.req('eng1',{}),null);assert.match(Ga.req('eng2',{owned:['eng1'],trust:30}),/Maple Heights trust 40/);
  assert.strictEqual(Ga.req('eng2',{owned:['eng1'],trust:40}),null);assert.match(Ga.req('eng3',{owned:['eng2'],trustR:60,done:[]}),/Pastor Dee/);
  assert.strictEqual(Ga.req('bull',{trustR:30}),null);assert.strictEqual(Ga.req('bull',{done:['dee']}),null);assert(Ga.req('bull',{trustR:10}))});
test('buy mutates a SAVE.garage and applies loyalty discount',()=>{const g=Ga.defaultGarage();let r=Ga.buy(g,'eng1',{cash:600});assert(r.ok&&r.cost===500);assert.strictEqual(g.vehicles.minivan.perf.engine,1);
  assert.strictEqual(Ga.buy(g,'eng1',{cash:600}).reason,'Installed');assert.strictEqual(Ga.buy(g,'tyre2',{cash:9999}).ok,false);
  for(const id of['tyre1','brk1','armor1','cargo'])assert(Ga.buy(g,id,{cash:9999}).ok);assert.strictEqual(Ga.buy(g,'sport',{cash:9999}).cost,Math.round(900*.95));
  assert(g.vehicles.minivan.spoiler);r=Ga.buy(g,'v_pickup',{cash:9999,done:['earl']});assert(r.ok);assert(g.owned.includes('pickup'));assert.strictEqual(g.hp.pickup,120);
  const o=Ga.vehicleOpts(g);assert.strictEqual(o.color,'#35577d');assert.strictEqual(o.upgrades.roofRack,'cargo');assert.strictEqual(o.upgrades.spoiler,true)});
test('horns: synthesized notes, capped at 2.4 s, light bar never red/blue',()=>{assert.strictEqual(Ga.hornNotes('stock').length,2);const n=Ga.hornNotes('shave');assert.strictEqual(n.length,7);
  for(const id in Ga.HORNS){for(const x of Ga.hornNotes(id))assert(x.t+x.d<=2.4+1e-9&&x.f>100&&x.f<1200)}
  for(const c of Ga.COSMETICS.lightBar.amber.colors){const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);assert(!(r>200&&g<80&&b<80)&&!(b>200&&r<80&&g<80))}});
/* reference: the current index.html updVan (kinematic, no slip) */
function oldUpdVan(V,keys,dt){const boost=keys.shift,MAX=boost?33:25;let v=V.spd,thr=keys.w?1:0,st=keys.a?1:0;
  if(thr>0)v+=(v<0?24:boost?12:9)*dt*thr;else v-=Math.sign(v)*Math.min(Math.abs(v),3.5*dt);v=Math.min(Math.max(v,-8),MAX);V.spd=v;V.steer+=(st-V.steer)*Math.min(1,dt*7);
  V.yaw+=V.steer*Math.min(Math.max(Math.abs(v)/5,0),1)*(1.55-Math.min(.75,Math.abs(v)/35))*Math.sign(v)*dt;V.x+=-Math.sin(V.yaw)*v*dt;V.z+=-Math.cos(V.yaw)*v*dt}
test('feel parity: stock van ends within 10% of path length of the current updVan',()=>{for(const[keys,steps]of[[{w:1},90],[{w:1,a:1},90],[{w:1,shift:1,a:1},120],[{w:1,shift:1},150]]){
    const ref={x:0,z:0,yaw:0,spd:0,steer:0},c=C.make('minivan',{x:0,z:0,yaw:0});let dist=0;for(let i=0;i<steps;i++){const px=ref.x,pz=ref.z;oldUpdVan(ref,keys,1/30);dist+=Math.hypot(ref.x-px,ref.z-pz);C.drive(c,{thr:keys.w?1:0,st:keys.a?1:0,boost:!!keys.shift},1/30)}
    const err=Math.hypot(ref.x-c.x,ref.z-c.z);assert(err<=dist*.1,JSON.stringify(keys)+' err '+err.toFixed(2)+' of '+dist.toFixed(1));assert(near(ref.spd,c.spd,.01))}});
test('top speeds: stock boost 33, eng3 41, sport burst 47 then 14 s cooldown',()=>{const run=(v,inp,n)=>{const c=C.make('minivan',{vehicle:v});let peak=0;for(let i=0;i<n;i++){C.drive(c,inp(i),1/30);peak=Math.max(peak,c.spd)}return{c,peak}};
  assert(near(run(null,()=>({thr:1,boost:true}),300).peak,33,.01));const v3=Ga.defaultVehicle();v3.perf={engine:3,tyres:0,brakes:0,sport:true};assert(near(run(v3,()=>({thr:1,boost:true}),300).peak,41,.01));
  const s=run(v3,i=>({thr:1,boost:true,sport:i>=200}),400);assert(near(s.peak,47,.05));assert(s.c.sportCd>0)});
test('van impact damage numbers (SPEC2 C.3)',()=>{const c=C.make('minivan');assert(near(C.impact(c,20,false,true),24.2));assert(near(C.impact(c,20,false,false),12.1));
  const vb=Ga.defaultVehicle();vb.prot.bullBar=true;const b=C.make('minivan',{vehicle:vb});assert(near(C.impact(b,20,true,true),12.1));
  const d=C.make('minivan');for(let i=0;i<5;i++)C.impact(d,20,false,true);assert.strictEqual(C.state(d).stage,'disabled');C.drive(d,{thr:1},1);assert(d.spd<=0.001);
  const w=C.make('minivan');w.hp=25;assert.strictEqual(C.state(w).stage,'wrecked');assert.strictEqual(C.state(w).speedMul,.75);assert.strictEqual(C.repairCost(w),150)});
test('ram: head-on 15 m/s into a stopped sedan deals 48, bull bar 96',()=>{for(const[bull,exp]of[[false,48],[true,96]]){const v=Ga.defaultVehicle();v.prot.bullBar=bull;
    const van=C.make('minivan',{x:0,z:10,yaw:0,vehicle:v,spd:15}),car=C.make('sedan',{x:0,z:5.8,yaw:Math.PI,spd:0});const r=C.ram(van,car);assert(r&&r.front);assert(near(r.carDmg,exp,1e-6),r.carDmg);assert(near(car.hp,100-exp))}});
test('PIT: rear-quarter hit on a fast car spins it',()=>{const van=C.make('minivan',{x:.8,z:3.6,yaw:0,spd:16}),car=C.make('sedan',{x:0,z:0,yaw:0,spd:10});const r=C.ram(van,car);assert(r&&r.pit);assert(car.spinT>0)});
test('crew fire: 3 shooters, 9 hp/s within 18 m, none beyond',()=>{const van=C.make('minivan',{x:0,z:0}),car=C.make('sedan',{x:0,z:-15});C.crewFire(van,car,3,1);assert(near(car.hp,91));car.z=-30;C.crewFire(van,car,3,1);assert(near(car.hp,91))});
test("followPath: Benny's truck drives the escort route, centre never more than 0.75 m past the kerb, and arrives",()=>{const ids=[[205,21],[205,35],[189,35],[157,35],[157,21],[189,21]].map(([x,z])=>G.nodes.findIndex(n=>n.tx===x&&n.tz===z));
  let path=[ids[0]];for(let i=1;i<ids.length;i++)path=path.concat(G.path(ids[i-1],ids[i]).slice(1));const pts=G.lane(path);
  const truck=C.make('workvan',{x:pts[0].x,z:pts[0].z,yaw:C.yawTo(pts[1].x-pts[0].x,pts[1].z-pts[0].z)});C.follow(truck,pts,{speed:6});let off=0,t=0;
  let worst=0;for(;t<120&&!truck.ai.done;t+=1/30){C.step(truck,1/30,{collide});worst=Math.max(worst,offRoad(truck.x,truck.z))}
  assert(truck.ai.done,'arrived');assert(worst<=.75,'centre strays '+worst.toFixed(2)+' m past the kerb');assert(t>25&&t<70,'took '+t.toFixed(1)+' s (route is ~216 m at 6 m/s)')});
test('followPath waits for the escort',()=>{const pts=G.lane([G.nodes.findIndex(n=>n.tx===205&&n.tz===21),G.nodes.findIndex(n=>n.tx===189&&n.tz===21)]);const truck=C.make('workvan',{x:pts[0].x,z:pts[0].z,yaw:Math.PI/2});
  C.follow(truck,pts,{speed:6,waitDist:28});for(let i=0;i<90;i++)C.step(truck,1/30,{van:{x:pts[0].x+100,z:pts[0].z}});assert(truck.spd<.5&&truck.ai.blocked)});
test('followPath: a truck wedged off its route recovers onto the lane and still arrives (escort soft-lock)',()=>{const ids=[[205,21],[205,35],[189,35]].map(([x,z])=>G.nodes.findIndex(n=>n.tx===x&&n.tz===z));
  let path=[ids[0]];for(let i=1;i<ids.length;i++)path=path.concat(G.path(ids[i-1],ids[i]).slice(1));const pts=G.lane(path);
  const truck=C.make('workvan',{x:pts[0].x,z:pts[0].z,yaw:0});C.follow(truck,pts,{speed:6});
  /* a wall right across its nose that only lets go once the truck is back on the lane: it can only get out by being snapped */
  const wall=(p,r)=>{if(!truck.snapped&&p.z>pts[0].z+1.5)p.z=pts[0].z+1.5;return collide(p,r)};truck.yaw=Math.PI;/* facing +z into the wall, across the route */
  let t=0;for(;t<90&&!truck.ai.done;t+=1/30)C.step(truck,1/30,{collide:wall});assert(truck.snapped>=1,'snapped back onto the lane');assert(truck.ai.done,'arrived after '+t.toFixed(1)+' s')});
test('followPath: something parked on the lane is skipped past, never an endless wedge',()=>{const pts=G.lane([G.nodes.findIndex(n=>n.tx===205&&n.tz===21),G.nodes.findIndex(n=>n.tx===205&&n.tz===35)]);
  const truck=C.make('workvan',{x:pts[0].x,z:pts[0].z,yaw:C.yawTo(pts[1].x-pts[0].x,pts[1].z-pts[0].z)});C.follow(truck,pts,{speed:6});
  const L=Math.hypot(pts[pts.length-1].x-pts[0].x,pts[pts.length-1].z-pts[0].z),dir={x:(pts[pts.length-1].x-pts[0].x)/L,z:(pts[pts.length-1].z-pts[0].z)/L},bx=pts[0].x+dir.x*12,bz=pts[0].z+dir.z*12;
  const block=(p,r)=>{const a=(p.x-bx)*dir.x+(p.z-bz)*dir.z;if(Math.abs(a)<2.4+r){const s=Math.sign(a)||-1;p.x+=dir.x*(s*(2.4+r)-a);p.z+=dir.z*(s*(2.4+r)-a)}return collide(p,r)};/* a 4.8 m car-sized block across the lane */
  let t=0;for(;t<120&&!truck.ai.done;t+=1/30)C.step(truck,1/30,{collide:block});assert(truck.ai.done,'got past the block and arrived ('+t.toFixed(1)+' s, '+truck.snapped+' snaps)')});
test('flee: stays mostly on the road, slows when the van is far, escapes after 8 s past 110 m',()=>{const n=G.nodes[G.nearestNode(380,70)];const car=C.make('sedan',{x:n.x,z:n.z});C.flee(car,G,{max:27,seed:4});
  const van={x:n.x+15,z:n.z};let off=0,f=0;for(let i=0;i<30*20;i++){C.step(car,1/30,{van,G,collide});f++;if(!',=Vl'.includes(def.map[Math.floor(car.z/2)][Math.floor(car.x/2)]))off++}
  assert(off/f<.1,'off-road '+(100*off/f).toFixed(1)+'%');const far={x:-5000,z:-5000};let peak=0;for(let i=0;i<30*12&&!car.ai.escaped;i++){C.step(car,1/30,{van:far,G,collide});peak=Math.max(peak,car.spd)}
  assert(car.ai.escaped);assert(peak<=27*.65+.5,'rubber band caps speed, peak '+peak.toFixed(1))});
test('chase sims always finish, deterministic per seed',()=>{const a=C.simulateChase({def,G,seed:5}),b=C.simulateChase({def,G,seed:5});assert.strictEqual(a.result,b.result);assert(near(a.t,b.t));
  const tally={};for(const o of[{},{carType:'hatch',max:24},{carType:'workvan',max:19}])for(let s=1;s<=12;s++){const r=C.simulateChase({def,G,seed:s,...o});assert.notStrictEqual(r.result,'timeout',JSON.stringify(o)+' seed '+s);tally[(o.carType||'sedan')+':'+r.result]=(tally[(o.carType||'sedan')+':'+r.result]||0)+1}
  console.log('       chase tally (12 seeds each, bot driver):',JSON.stringify(tally))});
test('tutorial chase (stolen ice-cream truck, max 19): a stock van stops it in at least 18 of 20',()=>{let w=0;for(let s=1;s<=20;s++){const r=C.simulateChase({def,G,seed:s,carType:'workvan',max:19});if(r.result==='stopped')w++}assert(w>=18,w+'/20')});
test('upgraded van (eng2, tyre2, bull bar) always stops the Duke',()=>{const v=Ga.defaultVehicle();v.perf={engine:2,tyres:2,brakes:1,sport:true};v.prot={bullBar:true,armor:1};
  for(let s=1;s<=20;s++){const r=C.simulateChase({def,G,seed:s,vehicle:v});assert.strictEqual(r.result,'stopped','seed '+s)}});
test('stock van stops the Duke in most chases (rubber band keeps it winnable)',()=>{let w=0;for(let s=1;s<=30;s++)if(C.simulateChase({def,G,seed:s}).result==='stopped')w++;assert(w>=18,w+'/30')});
if(require.main===module)done();
