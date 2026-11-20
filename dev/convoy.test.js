/* HT.Convoy (js/convoy.js) headless: node dev/convoy.test.js
   1. 3 followers behind a scripted leader on a 600 m route with four 90-degree turns: in steady driving every bumper gap stays
      within ±3 m of the wanted gap, and no follower strays more than 1.6 m off the leader's line (no cut corners).
   2. a hard stop at a tight gap ends in a bump (dad reaction time); the same stop at 'spread' does not.
   3. hold / go, and a lost car (leader far away) pulls over and waits, then rejoins when the leader comes back.
   4. save/load round trip. */
global.window=global;require('../js/carai.js');require('../js/convoy.js');
const CA=HT.CarAI,CV=HT.Convoy;let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
const yawTo=(dx,dz)=>Math.atan2(-dx,-dz);
/* the route: a 600 m square-ish loop with four right-angle corners, filleted like a lane through an intersection */
function route(){const raw=[[0,0],[0,-150],[150,-150],[150,0],[30,0]],pts=[];
  for(let i=0;i<raw.length-1;i++){const[a,b]=[raw[i],raw[i+1]];const L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(L/1);for(let k=0;k<n;k++)pts.push({x:a[0]+(b[0]-a[0])*k/n,z:a[1]+(b[1]-a[1])*k/n})}
  pts.push({x:30,z:0});/* round each corner with a 7 m radius */
  const out=[];for(let i=0;i<pts.length;i++){const p=pts[i];let near=null;for(const c of raw.slice(1,4)){if(Math.hypot(p.x-c[0],p.z-c[1])<7)near=c}if(!near){out.push(p);continue}
    if(out.cornerDone===near)continue;out.cornerDone=near;const j=raw.findIndex(r=>r===near),A=raw[j-1],B=raw[j+1];const ua=[(near[0]-A[0])/Math.hypot(near[0]-A[0],near[1]-A[1]),(near[1]-A[1])/Math.hypot(near[0]-A[0],near[1]-A[1])],ub=[(B[0]-near[0])/Math.hypot(B[0]-near[0],B[1]-near[1]),(B[1]-near[1])/Math.hypot(B[0]-near[0],B[1]-near[1])];
    const p0=[near[0]-ua[0]*7,near[1]-ua[1]*7],p2=[near[0]+ub[0]*7,near[1]+ub[1]*7];for(let t=0;t<=1;t+=.1){const u=1-t;out.push({x:u*u*p0[0]+2*u*t*near[0]+t*t*p2[0],z:u*u*p0[1]+2*u*t*near[1]+t*t*p2[1]})}}
  const P=[out[0]];for(const p of out)if(Math.hypot(p.x-P[P.length-1].x,p.z-P[P.length-1].z)>.3)P.push(p);return P}
const R=route(),cum=[0];for(let i=1;i<R.length;i++)cum.push(cum[i-1]+Math.hypot(R[i].x-R[i-1].x,R[i].z-R[i-1].z));const LEN=cum[cum.length-1];
const at=s=>{s=Math.max(0,Math.min(LEN,s));let i=0;while(i<cum.length-2&&cum[i+1]<s)i++;const A=R[i],B=R[i+1],k=(s-cum[i])/((cum[i+1]-cum[i])||1);return{x:A.x+(B.x-A.x)*k,z:A.z+(B.z-A.z)*k,yaw:yawTo(B.x-A.x,B.z-A.z)}};
const cornerNear=s=>{for(const c of[[0,-150],[150,-150],[150,0]]){for(let d=-14;d<=14;d+=2){const p=at(s+d);if(Math.hypot(p.x-c[0],p.z-c[1])<8)return true}}return false};
function run(o){const C=CV.create({gap:o.gap||'normal'}),L={x:0,z:10,yaw:0,spd:0,len:4.4,stats:HT.Garage.apply('minivan'),hp:100},cars=[];C.leader(L);
  for(let i=0;i<3;i++){const c=CA.make('minivan',{x:0,z:10+(i+1)*13.5,yaw:0});cars.push(c);C.add(c,{id:'v'+i})}
  let s=-10,v=0,t=0;const dt=1/30,log={gapErr:[],off:0,bumps:0,maxBump:0};let steady=0;
  for(;t<o.T;t+=dt){let want=o.speed?o.speed(t,s):12;if(s>LEN-40)want=Math.min(want,Math.max(0,(LEN-15-s)*.5));if(cornerNear(s))want=Math.min(want,7);
    const acc=want>v?3.5:-(o.brake||6);v=Math.max(0,want>v?Math.min(want,v+acc*dt):Math.max(want,v+acc*dt));s+=v*dt;
    if(s<0){L.x=0;L.z=-s;L.yaw=0}else{const p=at(s);L.x=p.x;L.z=p.z;L.yaw=p.yaw}L.spd=v;
    steady=Math.abs(want-v)<.2&&!cornerNear(s)?steady+dt:0;
    const ev=C.tick(dt,{});for(const b of ev.bumps){log.bumps++;log.maxBump=Math.max(log.maxBump,b.vn)}
    if(steady>7&&s>30&&v>3){const ch=C.chain();for(let i=1;i<ch.length;i++){const a=ch[i-1].car,b=ch[i].car;const d=Math.hypot(a.x-b.x,a.z-b.z)-4.4;log.gapErr.push(d-C.gapM());if(Math.abs(d-C.gapM())>(log.ge||0)){log.ge=Math.abs(d-C.gapM());log.geAt=[i,t.toFixed(1),s.toFixed(0)]}}}
    if(s>5)for(const c of cars){let bd=1e9;for(let i=0;i<R.length-1;i++){const A=R[i],B=R[i+1],dx=B.x-A.x,dz=B.z-A.z,L2=dx*dx+dz*dz||1,k=Math.max(0,Math.min(1,((c.x-A.x)*dx+(c.z-A.z)*dz)/L2));bd=Math.min(bd,Math.hypot(A.x+dx*k-c.x,A.z+dz*k-c.z))}
      if((c.z<-1||c.x>1)&&bd>log.off){log.off=bd;log.offAt=[c.x.toFixed(1),c.z.toFixed(1),t.toFixed(1)]}}
    if(o.each)o.each(t,C,L,cars)}
  return{C,L,cars,log}}
/* 1. the 600 m route */
{const r=run({T:75});const e=r.log.gapErr,mx=e.reduce((m,x)=>Math.max(m,Math.abs(x)),0);
  ok(e.length>200&&mx<=3,'steady gaps within ±3 m of '+r.C.gapM()+' m (max error '+mx.toFixed(2)+' m over '+e.length+' samples, worst car '+r.log.geAt+')');
  ok(r.log.off<=1.6,'followers keep to the leader\'s line through four 90° corners (max off-line '+r.log.off.toFixed(2)+' m at '+r.log.offAt+')');
  ok(r.log.bumps===0,'no bumps on the route ('+r.log.bumps+')');
  const done=r.cars.map(c=>Math.hypot(c.x-r.L.x,c.z-r.L.z));ok(done.every((d,i)=>d<(i+1)*16),'all three still in line at the end ('+done.map(d=>d.toFixed(1)).join(', ')+' m)')}
/* 2. hard stop at 12 m/s: tight bumps, spread doesn't */
{const stop=(t)=>t<9?12:0;const a=run({T:20,gap:'tight',speed:stop,brake:24}),b=run({T:20,gap:'spread',speed:stop,brake:24});
  ok(a.log.bumps>0,'tight gap + a hard stop = a bump (closing '+a.log.maxBump.toFixed(1)+' m/s)');ok(b.log.bumps===0,'spread gap + the same stop = no bump')}
/* 3. hold / go; then the leader floors it down a long straight: the last car pulls over and waits, and rejoins when he comes back */
{let held=false;run({T:9,each:(t,C,L,cars)=>{if(t>5&&t<5.05)C.order('hold');if(t>7&&t<7.05){held=C.cars.every(m=>m.st==='hold')&&cars.every(c=>c.spd<6);C.order('go')}}});
  ok(held,'hold: everyone stops where they are, go: they carry on');
  const C=CV.create({}),L={x:0,z:0,yaw:0,spd:0,len:4.4},cars=[];C.leader(L);for(let i=0;i<3;i++){const c=CA.make('minivan',{x:0,z:(i+1)*13.4,yaw:0});cars.push(c);C.add(c,{id:'v'+i})}
  let waited=-1,back=-1,v=0;const dt=1/30;for(let t=0;t<60;t+=dt){if(t<30){v=Math.min(25,v+4*dt);L.z-=v*dt}else if(t<31){v=0}
    if(t>=31&&back<0&&waited>=0){/* he comes back for them: stops 12 m ahead of the first waiting car, on the trail */const w=C.cars.find(m=>m.st==='wait');if(w){L.x=w.car.x;L.z=w.car.z-14;back=t}}
    L.spd=v;if(t>=31)L.spd=0;C.tick(dt,{});if(waited<0&&C.cars.some(m=>m.st==='wait'))waited=t}
  ok(waited>0,'outrun at 25 m/s on a straight: a car pulls over and waits (after '+waited.toFixed(1)+' s)');
  ok(back>0&&C.cars.every(m=>m.st!=='wait'),'it rejoins when he comes back for it ('+C.cars.map(m=>m.st).join(',')+')')}
/* 4. save / load */
{const r=run({T:12});const s=JSON.parse(JSON.stringify(r.C.save()));const C2=CV.create({});const cs=r.cars.map((c,i)=>C2.add(CA.make('minivan',{x:0,z:0}),{id:'v'+i}));C2.load(s);
  ok(C2.cars.every((m,i)=>Math.abs(m.car.x-r.cars[i].x)<.01&&Math.abs(m.car.z-r.cars[i].z)<.01)&&C2.gap===r.C.gap,'save/load restores order, poses and gap ('+JSON.stringify(s).length+' bytes)')}
console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0);
