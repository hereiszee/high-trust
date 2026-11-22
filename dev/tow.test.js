/* [TOW] physics checks (SPEC3 4.4), in Node with the real HT.CarAI.drive as the tower.  node dev/tow.test.js
   straight-line tracking; off-tracking in a 90 degree turn at 10 m/s; no lock or jackknife in a full-lock reverse (soft stop, self-straightening);
   a wall hit at 9 m/s reports a snap-speed hit; attach geometry accept/reject at 3.1/3.3 m and 37/39 degrees; towMul in drive. */
const assert=require('assert'),{test,suite,done,load}=require('./harness');const HT=load(),C=HT.CarAI,G=HT.Garage;
const Tow=require('../js/tow.js');suite('tow');
const D=Math.PI/180,DT=1/30;
const sedan={len:4.6,wid:1.9};
function rig(o){o=o||{};const c=C.make('minivan',{x:0,z:0,yaw:0});c.towMul=o.noMul?null:Tow.towMul();c.len=4.9;
  const tw=()=>({x:c.x,z:c.z,yaw:c.yaw,spd:c.spd,len:4.9});const b=Object.assign({},sedan);
  /* the sedan parked nose-to-hitch behind the van */
  const H=Tow.hitchPoint(tw()),f=Tow.fwd(0),C0=Tow.centreFrom(H,0,b.len);b.x=C0.x;b.z=C0.z;b.yaw=0;
  const k=Tow.make(tw(),b,{instant:true});return{c,tw,b,k}}
const run=(R,inp,secs,o)=>{let out=[];for(let t=0;t<secs;t+=DT){C.drive(R.c,typeof inp==='function'?inp(t,R):inp,DT,null);const ev=Tow.step(R.k,R.tw(),DT,o);out.push(ev);if(o&&o.until&&o.until(ev))break}return out};
test('straight line: the towed car tracks the hitch within 0.1 m',()=>{const R=rig();run(R,{thr:1,st:0},10);
  const H=Tow.hitchPoint(R.tw()),lat=Math.abs(R.b.x-H.x);assert(lat<.1,'lateral '+lat);assert(Math.abs(Tow.wrap(R.b.yaw-R.c.yaw))<.01)});
test('towMul: 0.7 top speed, 0.6 acceleration, longer braking',()=>{const R=rig();run(R,{thr:1,st:0},20);assert(Math.abs(R.c.spd-25*.7)<.05,'top '+R.c.spd);
  const R2=rig({noMul:true});run(R2,{thr:1,st:0},20);let d1=0,d2=0;R.c.spd=R2.c.spd=15;
  for(let t=0;t<6;t+=DT){const z1=R.c.z;C.drive(R.c,{thr:-1,st:0},DT,null);d1+=Math.abs(R.c.z-z1);const z2=R2.c.z;C.drive(R2.c,{thr:-1,st:0},DT,null);d2+=Math.abs(R2.c.z-z2);if(R.c.spd<=0&&R2.c.spd<=0)break}
  assert(d1>d2*1.15,'braking '+d1.toFixed(1)+' vs '+d2.toFixed(1))});
test('90 degree turn at 10 m/s: off-tracking under 1.2 m',()=>{const R=rig();/* get to 10 m/s, turn left until 90 degrees, straighten */
  run(R,(t,R)=>({thr:R.c.spd<10?1:0,st:0}),4);R.c.spd=10;const y0=R.c.yaw,path=[];let maxOff=0;
  for(let t=0;t<9;t+=DT){const turned=Math.abs(Tow.wrap(R.c.yaw-y0));C.drive(R.c,{thr:R.c.spd<10?.5:0,st:turned<90*D?.7:0},DT,null);R.c.spd=10;Tow.step(R.k,R.tw(),DT);
    const H=Tow.hitchPoint(R.tw());path.push(H);/* the towed axle against the hitch's own path */const f=Tow.fwd(R.k.psi),ax={x:R.b.x-f[0]*R.b.len*.25,z:R.b.z-f[1]*R.b.len*.25};
    let best=1e9;for(let i=0;i<path.length-1;i++){const A=path[i],B=path[i+1],dx=B.x-A.x,dz=B.z-A.z,L2=dx*dx+dz*dz||1,u=Math.max(0,Math.min(1,((ax.x-A.x)*dx+(ax.z-A.z)*dz)/L2));best=Math.min(best,Math.hypot(A.x+dx*u-ax.x,A.z+dz*u-ax.z))}
    if(path.length>20)maxOff=Math.max(maxOff,best)}
  console.log('     off-tracking '+maxOff.toFixed(2)+' m');assert(maxOff<1.2,'off-track '+maxOff)});
test('at speed it swings wide: the towed yaw lags the kinematic answer',()=>{const R=rig();run(R,{thr:1,st:0},6);const lagFast=[];
  for(let t=0;t<1.2;t+=DT){C.drive(R.c,{thr:0,st:1},DT,null);Tow.step(R.k,R.tw(),DT);lagFast.push(Math.abs(Tow.wrap(R.c.yaw-R.k.psi)))}
  const R2=rig();run(R2,(t,R)=>({thr:R.c.spd<4?1:-.2,st:0}),3);let slow=0;for(let t=0;t<1.2;t+=DT){C.drive(R2.c,{thr:R2.c.spd<4?.3:0,st:1},DT,null);Tow.step(R2.k,R2.tw(),DT);slow=Math.max(slow,Math.abs(Tow.wrap(R2.c.yaw-R2.k.psi)))}
  assert(Math.max(...lagFast)>.2,'fast articulation '+Math.max(...lagFast))});
test('reversing never folds into a lock: full lock in reverse stays under the soft stop, no jackknife, and drives out straight',()=>{let R=rig(),ev=run(R,{thr:-1,st:1},8);
  const peak=Math.max(...ev.map(e=>Math.abs(e.rel)));assert(!ev.some(e=>e.jack),'reverse must not jackknife');assert(peak<=Tow.T.clampA+1e-6&&peak<70*D,'peak '+(peak/D).toFixed(1));
  /* the truck's rear probe never reaches the folded car (its corner is ~70 degrees away) */
  ev=run(R,{thr:1,st:0},6);assert(Math.abs(ev[ev.length-1].rel)<5*D,'straightens pulling away: '+(ev[ev.length-1].rel/D).toFixed(1));
  /* backing up straight after a fold: it comes back toward straight on its own */
  R=rig();run(R,{thr:-1,st:1},4);const a0=Math.abs(R.k.psi-R.c.yaw);ev=run(R,{thr:-1,st:0},4);assert(Math.abs(ev[ev.length-1].rel)<a0*.6,'self-straightening in reverse '+(a0/D).toFixed(0)+' -> '+(Math.abs(ev[ev.length-1].rel)/D).toFixed(0));
  console.log('     full-lock reverse peak '+(peak/D).toFixed(1)+' deg');
  R=rig();ev=run(R,(t,R)=>({thr:R.c.spd>-2?-.5:0,st:.08}),5);assert(!ev.some(e=>e.jack),'gentle reverse should not');
  const a=Math.max(...ev.map(e=>Math.abs(e.rel)))/D;console.log('     gentle reverse peak angle '+a.toFixed(1)+' deg')});
test('a sideways hit at 15 m/s reports a snap-speed hit, a brush does not',()=>{const R=rig();run(R,{thr:1,st:0},1.5);R.c.spd=10;let hit=null;
  const wallZ=R.b.z-4;/* a wall line the towed car will meet if the tower teleports past it: simulate by pushing the probes back */
  /* the towed body swinging sideways (-x) at 10 m/s into a post: the push-out is +x */
  const coll=(p,r)=>{if(p.x>R.b.x-.5&&p.x<R.b.x+.5&&!hit)p.x+=.5};R.k.Cp={x:R.b.x+15*DT,z:R.b.z};const ev=Tow.step(R.k,R.tw(),DT,{collide:coll});hit=ev.hit;
  const R2=rig();run(R2,{thr:1,st:0},1.5);R2.k.Cp={x:R2.b.x+3*DT,z:R2.b.z};const ev2=Tow.step(R2.k,R2.tw(),DT,{collide:(p,r)=>{p.x+=.2}});assert(ev2.hit&&ev2.hit.sp<4,'a gentle brush '+JSON.stringify(ev2.hit));
  assert(ev.hit&&ev.hit.sp>=Tow.T.snap,'hit '+JSON.stringify(ev.hit));assert.strictEqual(Tow.T.snap,14)});
test('attach geometry (generous): 3.1 m ok, 3.3 m too far; 37 degrees ok, 39 too much; moving no',()=>{const tw={x:0,z:0,yaw:0,spd:0,len:4.9},H=Tow.hitchPoint(tw);
  const at=(d,yaw)=>{const car={len:4.6,yaw},f=Tow.fwd(yaw);car.x=H.x-f[0]*(d+2.3);car.z=H.z-f[1]*(d+2.3);/* bumper d metres behind the hitch along the car's axis */return Tow.check(tw,car)};
  assert(at(3.1,0).ok);assert.strictEqual(at(3.3,0).why,'far');assert(at(1.0,37*D).ok,'37');assert.strictEqual(at(1.0,39*D).why,'angle');
  assert.strictEqual(Tow.check(Object.assign({},tw,{spd:1.5}),(()=>{const c={len:4.6,yaw:0};c.x=H.x;c.z=H.z+3.3;return c})()).why,'stop')});
test('hitch catalog item and towMul in HT.CarAI.drive',()=>{const it=G.CATALOG.find(c=>c.id==='hitch');assert(it&&it.price===350&&it.slot==='hitch'&&it.group==='util');
  const c=C.make('minivan',{x:0,z:0,yaw:0});c.towMul=Tow.towMul();for(let i=0;i<60*10;i++)C.drive(c,{thr:1,st:0,boost:true},DT,null);assert(Math.abs(c.spd-17.5)<.05,'no boost while towing: '+c.spd)});
done();
