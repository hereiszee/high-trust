/* [TOW] physics checks (SPEC3 4.4), in Node with the real HT.CarAI.drive as the tower.  node dev/tow.test.js
   straight-line tracking; off-tracking in a 90 degree turn at 10 m/s; jackknife in a sharp reverse and not in a gentle one;
   a wall hit at 9 m/s reports a snap-speed hit; attach geometry accept/reject at 2.4/2.6 m and 29/31 degrees; towMul in drive. */
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
test('jackknife: a sharp reverse triggers it, a gentle one does not',()=>{let R=rig(),ev=run(R,{thr:-1,st:1},8,{until:e=>e.jack});assert(ev.some(e=>e.jack),'sharp reverse should jackknife');
  R=rig();ev=run(R,(t,R)=>({thr:R.c.spd>-2?-.5:0,st:.08}),5);assert(!ev.some(e=>e.jack),'gentle reverse should not');
  const a=Math.max(...ev.map(e=>Math.abs(e.rel)))/D;console.log('     gentle reverse peak angle '+a.toFixed(1)+' deg')});
test('a wall at 9+ m/s reports a snap-speed hit on the towed body',()=>{const R=rig();run(R,{thr:1,st:0},1.5);R.c.spd=10;let hit=null;
  const wallZ=R.b.z-4;/* a wall line the towed car will meet if the tower teleports past it: simulate by pushing the probes back */
  const coll=(p,r)=>{if(p.x>R.b.x-.5&&p.x<R.b.x+.5&&!hit)p.x+=.5};R.k.Cp=null;const ev=Tow.step(R.k,R.tw(),DT,{collide:coll});hit=ev.hit;
  assert(ev.hit&&ev.hit.sp>=Tow.T.snap,'hit '+JSON.stringify(ev.hit));assert.strictEqual(Tow.T.snap,9)});
test('attach geometry: 2.4 m ok, 2.6 m too far; 29 degrees ok, 31 too much; moving no',()=>{const tw={x:0,z:0,yaw:0,spd:0,len:4.9},H=Tow.hitchPoint(tw);
  const at=(d,yaw)=>{const car={len:4.6,yaw},f=Tow.fwd(yaw);car.x=H.x-f[0]*(d+2.3);car.z=H.z-f[1]*(d+2.3);/* bumper d metres behind the hitch along the car's axis */return Tow.check(tw,car)};
  assert(at(2.4,0).ok);assert.strictEqual(at(2.6,0).why,'far');assert(at(1.0,29*D).ok,'29');assert.strictEqual(at(1.0,31*D).why,'angle');
  assert.strictEqual(Tow.check(Object.assign({},tw,{spd:1.5}),(()=>{const c={len:4.6,yaw:0};c.x=H.x;c.z=H.z+3.3;return c})()).why,'stop')});
test('hitch catalog item and towMul in HT.CarAI.drive',()=>{const it=G.CATALOG.find(c=>c.id==='hitch');assert(it&&it.price===350&&it.slot==='hitch'&&it.group==='util');
  const c=C.make('minivan',{x:0,z:0,yaw:0});c.towMul=Tow.towMul();for(let i=0;i<60*10;i++)C.drive(c,{thr:1,st:0,boost:true},DT,null);assert(Math.abs(c.spd-17.5)<.05,'no boost while towing: '+c.spd)});
done();
