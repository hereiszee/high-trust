/* =====================================================================
   HT.Tail [TAIL] (SPEC3 4.2): tailing a vehicle without being made. Pure logic (no THREE, no DOM): browser + Node.
   Owner: Following Distance (js/jobs/tail.js). Later users: Brake Check (slot/boxed), Everybody Waves (the courier tail),
   Chain Reaction (a tail on foot: same meter, a person instead of a car).

   const T = HT.Tail.create({bands:{close:15,ideal:[15,60],losing:110,lost:160}, lostT:12});
   const r = T.tick(dt, ctx)     ctx = {t:{x,z,yaw,spd,stopped,light}, p:{x,z,yaw,spd}, carId, carType, los, sight, ahead}
     (los: his mirror can see you, traffic included; sight: you can see him past buildings, traffic ignored. Default sight = los)
     -> {band:'close'|'ideal'|'losing'|'lost', d, sus:0..100, fam:0..1, lose:0..lostT, made, spooked, lost, cone, why}
   T.swap(newCarId, carType, seenSwap)   familiarity for the new car starts at 0 (0.5 if the target saw the swap within 30 m)
   T.turn(node, outYaw)                  the target just turned at a node: the follower copying it raises a streak
   T.event(kind, n)                      instant suspicion: 'horn' 'bump' 'touch' 'stopped' (stopping with him)
   T.save() / T.load(s)                  JSON-safe state ([CP])

   HT.Tail.los(ax,az,bx,bz,{grid:{map,block,tile}, blockers:[{x,z,r}]})   tile ray + vehicle circles, true = clear
   HT.Tail.cone(t,p,deg)                 is p inside the target's rear-view (mirror) cone
   HT.Tail.Rail                          a vehicle on rails along a polyline (cumulative arc, stops, kerb pulls, gap keeping)
   HT.Tail.poly(points)                  {pts, cum, len, at(s)->{x,z,yaw}, project(x,z,hint)->s}
   HT.Tail.slot / HT.Tail.boxed          formation slots and the box-in timer (Brake Check, wave 4), see the comment below
   Conventions as index.html: yaw 0 faces -z, forward = (-sin yaw, -cos yaw). Metres, m/s, seconds (all from the dt passed in).

   REUSING THE PIECES (Brake Check, Everybody Waves, Chain Reaction): js/jobs/tail.js is the worked example.
   - A scripted vehicle: build a lane with HT.Roads (G.lane(nodeIds), plus your own points for lots and driveways), wrap it in poly(), drive it
     with Rail(path,{max,corner,stops:[{s,t,lat,until(),onHold(),onGo()}],maxAt(s)}) and copy rail.x/z/yaw onto the model and an oriented
     collider every frame. Check the lane for static colliders before shipping a route: the world has props on some roads (the garden on
     4th St, the laundromat walls on 2nd St); dev/jobs/tail.js prints "route clear".
   - Traffic: give each rail a unique priority and pass ctx.ahead=me=>aheadGap(me,others,r) (others = {x,z,yaw,len,pri}); lower priority
     yields at crossings, nothing deadlocks (6 s blocked -> it noses through), and extend paths past their last junction so cars never stop in one.
   - Sight: los() takes the tile grid (WORLD.map + WORLD.losblock) and car circles separately; tick() wants los (traffic included: can he
     see you) and sight (buildings only: can you see him).
   - Formation slots: slot() returns a point relative to the target (feed it to HT.CarAI.follow as a 1-point path at ~5 Hz, or to a Rail
     as its want-position; pass path+s to measure along a lane); boxed() is the box-in timer. js/jobs/brake.js is the worked example.
   ===================================================================== */
(function(root){'use strict';
const HT=root.HT=root.HT||{};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const fwd=y=>[-Math.sin(y),-Math.cos(y)],rgt=y=>[Math.cos(y),-Math.sin(y)],yawTo=(dx,dz)=>Math.atan2(-dx,-dz);

/* ---------------- tuning (SPEC3 4.2, plus the extras marked +) ---------------- */
const K={
  close:15,ideal:60,losing:110,lost:160,lostT:12,
  cone:30,             /* mirror cone half-angle (60 degrees total) */
  susClose:20,susCloseMirror:40,mirrorD:25,
  susTailgate:5,       /* + 15-25 m, dead behind, in his mirror */
  susIdeal:-8,susHidden:-6,  /* + out of his sight (a car or a house between you) decays faster */
  susStop:25,stopD:12, /* stopping right behind him at a stop (the red light doubles all gains) */
  susAhead:6,          /* + close but in front of him (you overtook): odd, not damning */
  famD:50,famT:40,famHide:1/140,
  madeMul:2,lightMul:2,
  turnMatch:7,turnFree:1,turnMax:21,turnForget:14,turnD:70, /* + copying his turns: the 1st is free, then +7, +14, +21 (max); 14 s without a copied turn forgets one */
  horn:15,bump:12,touch:30,
  loseLosing:1,loseNoLos:1,loseLost:2,loseBack:3,
  pullAt:50,fastAt:80,fastAdd:3};
/* familiarity rate per vehicle type (how memorable it is in a mirror) */
const FAM={minivan:1,sedan:.8,hatch:.8,suv:1,pickup:1.1,workvan:1.3,bus:.5,icecream:3,'ice-cream':3,mower:2,bike:.4,foot:.6};

function cone(t,p,deg){const dx=p.x-t.x,dz=p.z-t.z,d=Math.hypot(dx,dz)||1,f=fwd(t.yaw);return-(dx*f[0]+dz*f[1])/d>Math.cos((deg||K.cone)*Math.PI/180)}
function front(t,p,deg){const dx=p.x-t.x,dz=p.z-t.z,d=Math.hypot(dx,dz)||1,f=fwd(t.yaw);return(dx*f[0]+dz*f[1])/d>Math.cos((deg||60)*Math.PI/180)}
/* line of sight: the tile grid (houses, trees, parked-car tiles) sampled every half tile, then vehicle circles in between */
function los(ax,az,bx,bz,o){o=o||{};const g=o.grid;const d=Math.hypot(bx-ax,bz-az);if(d<.5)return true;
  if(g&&g.map){const T=g.tile||2,n=Math.ceil(d/(T*.5)),blk=g.block;for(let i=1;i<n;i++){const x=ax+(bx-ax)*i/n,z=az+(bz-az)*i/n,tx=Math.floor(x/T),tz=Math.floor(z/T),row=g.map[tz];
      if(!row)continue;const c=row[tx];if(c&&blk.indexOf(c)>=0)return false}}
  const B=o.blockers;if(B)for(const b of B){const ux=(bx-ax)/d,uz=(bz-az)/d,px=b.x-ax,pz=b.z-az,s=px*ux+pz*uz;if(s<2||s>d-2)continue;const q=Math.abs(px*uz-pz*ux);if(q<(b.r||1.2))return false}
  return true}

function create(o){o=o||{};const bands=Object.assign({close:K.close,ideal:[K.close,K.ideal],losing:K.losing,lost:K.lost},o.bands||{});const lostT=o.lostT||K.lostT;
  const S={sus:0,maxSus:0,lose:0,fam:{},made:{},carId:o.carId||'van',carType:o.carType||'minivan',streak:0,turns:[],spooked:false,lost:false,
    behindT:0,hiddenT:0,seenT:0,pending:0};
  const T={S,K,bands,lostT};
  const band=d=>d<bands.close?'close':d<=bands.ideal[1]?'ideal':d<=bands.losing?'losing':'lost';
  const add=(v,why)=>{if(v>0&&S.made[S.carId])v*=K.madeMul;S.sus=clamp(S.sus+v,0,100);if(v>0&&why)S.why=why};
  T.tick=(dt,c)=>{const t=c.t,p=c.p;if(c.carId)S.carId=c.carId;if(c.carType)S.carType=c.carType;
    const d=Math.hypot(p.x-t.x,p.z-t.z),b=band(d),inCone=cone(t,p),ahead=c.ahead!=null?c.ahead:front(t,p),los_=c.los!==false,sight=c.sight!=null?c.sight!==false:los_;S.why=null;
    let gain=0;const lm=t.light?K.lightMul:1;
    if(S.spooked||S.lost)return T.result(d,b,inCone);
    if(d<bands.close){gain+=(ahead&&!inCone?K.susAhead:(inCone&&los_&&d<K.mirrorD?K.susCloseMirror:K.susClose))*lm;S.why=ahead&&!inCone?'ahead':'close'}
    else if(d<K.mirrorD&&inCone&&los_&&!ahead){gain+=K.susTailgate*lm;S.why='tailgate'}
    if(t.stopped&&Math.abs(p.spd||0)<1&&d<K.stopD&&inCone&&!ahead){gain+=K.susStop*lm;S.why='stopped'}
    if(gain>0)add(gain*dt,S.why);
    else if(b==='ideal'||b==='losing'){S.sus=clamp(S.sus+(K.susIdeal+(los_?0:K.susHidden))*dt,0,100)}
    else if(b==='lost')S.sus=clamp(S.sus+K.susIdeal*dt,0,100);
    /* familiarity: in his mirror, in sight, inside 50 m */
    const id=S.carId,mul=FAM[S.carType]!=null?FAM[S.carType]:1;let f=S.fam[id]||0;
    if(d<K.famD&&inCone&&los_){f+=dt/K.famT*mul;S.behindT+=dt}else{f-=dt*K.famHide;S.behindT=Math.max(0,S.behindT-dt*2)}
    f=clamp(f,0,1);S.fam[id]=f;if(f>=1&&!S.made[id]){S.made[id]=true;S.madeNow=id}
    /* losing him */
    /* (sight = the view without traffic: a car between you is cover, not a lost target) */
    if(b==='losing')S.lose+=dt*(K.loseLosing+(sight?0:K.loseNoLos));
    else if(b==='lost')S.lose+=dt*K.loseLost;
    else if(!sight&&d>30)S.lose+=dt*.35;   /* + a parallel street: a slow drain, not a loss */
    else S.lose=Math.max(0,S.lose-dt*K.loseBack);
    if(sight)S.seenT=0;else S.seenT+=dt;
    /* turns he made: did we copy them? */
    S.matchT=(S.matchT||0)+dt;if(S.matchT>K.turnForget&&S.streak>0){S.streak--;S.matchT=0}   /* a quiet stretch and he forgets the pattern, one turn at a time */
    for(let i=S.turns.length-1;i>=0;i--){const q=S.turns[i];q.age+=dt;const dn=Math.hypot(p.x-q.x,p.z-q.z);
      if(dn<9)q.at=true;else if(q.at&&dn>13){const same=Math.abs(wrap((p.yaw||0)-q.out))<.6;S.turns.splice(i,1);
        if(same&&q.close){S.streak++;S.matchT=0;if(S.streak>K.turnFree){add(Math.min(K.turnMax,K.turnMatch*(S.streak-K.turnFree)),'turns');S.streakHit=S.streak}}else S.streak=0}
      else if(q.age>25){S.turns.splice(i,1)}}
    S.maxSus=Math.max(S.maxSus,S.sus);
    if(S.sus>=100)S.spooked=true;if(S.lose>=lostT||d>bands.lost)S.lost=true;
    return T.result(d,b,inCone)};
  T.result=(d,b,inCone)=>({band:b,d,sus:S.sus,maxSus:S.maxSus,fam:S.fam[S.carId]||0,made:!!S.made[S.carId],lose:S.lose,lostT,spooked:S.spooked,lost:S.lost,cone:inCone,why:S.why,streak:S.streak,seenT:S.seenT});
  T.turn=(node,outYaw,closeEnough)=>{S.turns.push({x:node.x,z:node.z,out:outYaw,age:0,at:false,close:closeEnough!==false})};
  T.swap=(id,type,seen)=>{S.carId=id;S.carType=type||'sedan';const f0=S.fam[id]||0;/* a car he already knows stays known */S.fam[id]=seen?Math.max(.5,f0):f0;S.streak=0;S.turns.length=0;S.behindT=0};
  T.event=(k,n)=>{const v=n!=null?n:K[k]||0;if(v)add(v,k)};
  T.calm=v=>{S.sus=clamp(S.sus-v,0,100)};
  T.reset=()=>{S.sus=0;S.lose=0;S.spooked=false;S.lost=false};
  T.save=()=>({sus:Math.round(S.sus*10)/10,max:Math.round(S.maxSus*10)/10,lose:Math.round(S.lose*10)/10,fam:Object.fromEntries(Object.entries(S.fam).map(([k,v])=>[k,Math.round(v*1000)/1000])),made:Object.keys(S.made),car:S.carId,type:S.carType});
  T.load=s=>{if(!s)return;S.sus=s.sus||0;S.maxSus=s.max||0;S.lose=s.lose||0;S.fam=Object.assign({},s.fam||{});S.made={};for(const k of s.made||[])S.made[k]=true;S.carId=s.car||S.carId;S.carType=s.type||S.carType;S.spooked=false;S.lost=false;S.turns.length=0;S.streak=0};
  return T}

/* ---------------- polylines with arc length ---------------- */
function poly(points){const pts=[];for(const p of points){const q=pts[pts.length-1];if(!q||Math.hypot(p.x-q.x,p.z-q.z)>.05)pts.push({x:p.x,z:p.z})}
  const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z));const len=cum[cum.length-1];
  const seg=s=>{s=clamp(s,0,len);let lo=0,hi=pts.length-2;while(lo<hi){const m=(lo+hi+1)>>1;if(cum[m]<=s)lo=m;else hi=m-1}return lo};
  const at=s=>{s=clamp(s,0,len);const i=seg(s),A=pts[i],B=pts[i+1]||A,L=(cum[i+1]||cum[i])-cum[i]||1,k=(s-cum[i])/L;
    /* heading from a short chord (smooth through the filleted corners) */const a=pt(s-1.2),b=pt(s+1.2);return{x:A.x+(B.x-A.x)*k,z:A.z+(B.z-A.z)*k,yaw:yawTo(b.x-a.x,b.z-a.z),i}};
  const pt=s=>{s=clamp(s,0,len);const i=seg(s),A=pts[i],B=pts[i+1]||A,L=(cum[i+1]||cum[i])-cum[i]||1,k=(s-cum[i])/L;return{x:A.x+(B.x-A.x)*k,z:A.z+(B.z-A.z)*k}};
  /* nearest arc length to (x,z); with a hint, only within +-win metres of it (so loops that cross themselves resolve to the right pass) */
  const project=(x,z,hint,win)=>{let best=0,bd=Infinity;const lo=hint!=null?seg(Math.max(0,hint-(win||80))):0,hi=hint!=null?seg(Math.min(len,hint+(win||80))):pts.length-2;
    for(let i=lo;i<=hi;i++){const A=pts[i],B=pts[i+1]||A,dx=B.x-A.x,dz=B.z-A.z,L2=dx*dx+dz*dz||1,k=clamp(((x-A.x)*dx+(z-A.z)*dz)/L2,0,1),qx=A.x+dx*k,qz=A.z+dz*k,dd=(qx-x)**2+(qz-z)**2;
      if(dd<bd){bd=dd;best=cum[i]+Math.sqrt(L2)*k}}return{s:best,d:Math.sqrt(bd)}};
  return{pts,cum,len,at,pt,project}}

/* ---------------- a vehicle on rails ----------------
   Moves by arc length along a poly with real acceleration and braking, slows for corners, holds at stops, keeps a gap to whatever
   is ahead in its lane (other rails, the player's car), and can pull over to the kerb. Rails never get stuck and never snap, which
   is what a scripted target and scripted traffic need. A car that must react physically (a chase) switches to HT.CarAI. */
function Rail(path,o){o=o||{};const R={path,s:o.s||0,v:o.v||0,max:o.max||11.5,acc:o.acc||3.2,dec:o.dec||6,corner:o.corner||6,lat:0,latWant:0,yaw:0,x:0,z:0,
  stops:(o.stops||[]).slice().sort((a,b)=>a.s-b.s),hold:0,holding:null,blocked:false,done:false,id:o.id||'rail',pri:o.pri||0,len:o.len||4.6,brake:false,maxAt:o.maxAt||null,steer:0,gap:o.gap||8};
  R.place=s=>{R.s=clamp(s,0,path.len);const a=path.at(R.s),r=rgt(a.yaw);R.x=a.x+r[0]*R.lat;R.z=a.z+r[1]*R.lat;R.yaw=a.yaw;return R};
  /* corner ahead: the sharpest heading change within the next 18 m */
  const cornerV=()=>{let v=R.max;const y0=path.at(R.s).yaw;for(let k=4;k<=18;k+=3.5){const y=path.at(R.s+k).yaw,dA=Math.abs(wrap(y-y0));if(dA>.35){const vc=R.corner+Math.max(0,k-6)*.55;v=Math.min(v,vc)}}return v};
  R.step=(dt,ctx)=>{ctx=ctx||{};if(R.done){R.v=0;return R}
    let want=(R.maxAt?R.maxAt(R.s):R.max)*(ctx.speedMul||1)+(ctx.speedAdd||0);want=Math.min(want,cornerV());
    /* stops: brake to the line, hold, then go */
    const st=R.stops[0];
    if(R.holding){R.hold-=dt;want=0;if(R.hold<=0&&!(R.holding.until&&!R.holding.until())){R.stops.shift();const h=R.holding;R.holding=null;R.latWant=0;if(h.onGo)h.onGo(h)}}
    else if(st){const ds=st.s-R.s;if(ds<=.6){R.holding=st;R.hold=st.t||0;want=0;if(st.lat)R.latWant=st.lat;if(st.onHold)st.onHold(st)}
      else{const vs=Math.sqrt(Math.max(0,2*R.dec*.8*(ds-.5)));want=Math.min(want,vs)}}
    /* the end of the path */
    const left=path.len-R.s;if(o.stopAtEnd!==false){want=Math.min(want,Math.sqrt(Math.max(0,2*R.dec*.8*(left-.3))));if(left<.4){R.done=true;want=0}}
    /* gap keeping: anything ahead in the lane */
    /* never wait forever: after 6 s blocked, nose through (a stuck rail would end a tail for nothing) */
    R.blocked=false;R.ghostT=Math.max(0,(R.ghostT||0)-dt);if(ctx.ahead&&!R.ghostT){const g=ctx.ahead(R);if(g!=null){const vg=Math.sqrt(Math.max(0,2*R.dec*.9*Math.max(0,g-R.gap)));if(vg<want){want=vg;R.blocked=g<R.gap+3}}}
    R.blockT=R.blocked&&R.v<.3?(R.blockT||0)+dt:0;if(R.blockT>=6){R.blockT=0;R.ghostT=2.5}
    const v0=R.v;if(R.v<want)R.v=Math.min(want,R.v+R.acc*dt);else R.v=Math.max(want,R.v-R.dec*1.4*dt);R.brake=R.v<v0-.05||want<.3&&R.v<.5;
    const y0=R.yaw;R.s=Math.min(path.len,R.s+R.v*dt);R.lat+=(R.latWant-R.lat)*Math.min(1,dt*1.3);
    const a=path.at(R.s),r=rgt(a.yaw);R.x=a.x+r[0]*R.lat;R.z=a.z+r[1]*R.lat;R.yaw=a.yaw+(R.latWant!==R.lat?clamp((R.latWant-R.lat)*.35,-.25,.25)*-1:0);
    R.steer+=(clamp(wrap(R.yaw-y0)/Math.max(dt,1e-3)*.35,-1,1)-R.steer)*Math.min(1,dt*6);return R};
  R.place(R.s);return R}
/* "something ahead of me in my lane": distance to the nearest of `others` ({x,z,yaw}) within r m ahead and 2.2 m to the side */
function aheadGap(me,others,r){const f=fwd(me.yaw);let best=null;for(const o of others){if(!o||o===me)continue;const dx=o.x-me.x,dz=o.z-me.z,a=dx*f[0]+dz*f[1];if(a<=0||a>r)continue;
  const side=Math.abs(dx*-f[1]+dz*f[0]);if(side>(o.w||2.2))continue;
  if(o.yaw!=null&&o.pri!=null&&me.pri!=null){/* crossing traffic: only the lower priority waits (no two-way standoffs at a corner) */const dy=Math.abs(wrap(o.yaw-me.yaw));if(dy>.6&&o.pri<me.pri)continue}
  const g=a-(me.len||4.6)/2-(o.len||4.6)/2;if(best==null||g<best)best=g}return best}

/* ---------------- formation slots (Brake Check, wave 4) ----------------
   slot(target,{side:-1|0|1, back:m, gap, lead, lat0, path, s},car) -> {x,z,yaw}: a point relative to the target's pose.
     side -1 = his left (his nine o'clock), +1 = his right, 0 = his lane. back > 0 = behind him (his six), < 0 = in front (his twelve);
     back omitted = bumper to bumper plus `gap` (2.6 m) for side 0, level with him for side != 0. Side offsets use both cars' widths
     (target.w/car.w, default 1.9) plus 1.1 m, so "alongside" is the next lane. lead (s): the point moves ahead by spd*lead (for a
     follower fed at 5 Hz). With path (a poly()) and s (the target's arc length on it) the point is measured ALONG the path and its
     lane offset (lat0 = the target's own lateral offset) instead of straight off his nose: slots stay in lane through corners.
   boxed(target,[cars],{r:4,t:3,vmax:8,dt,slots,ok,st}) -> true once every car has held its slot for t seconds while the target is
     slower than vmax. Each car is {x,z,...} with car.slot (or o.slots[i]) as the slot() options; o.ok(car,i) overrides the
     "in slot" test (a job with its own lane maths). Timer state lives in o.st (pass the same object every frame; it is created if
     missing): st.t (held seconds, drains at 2x when the box breaks), st.ok (all in slot this frame), st.n (cars in slot), st.err[i]. */
function slot(target,o,car){o=o||{};const tw=target.w||1.9,cw=(car&&car.w)||1.9,tl=target.l||4.4,cl=(car&&car.l)||4.4,side=o.side||0;
  const gap=o.gap!=null?o.gap:2.6,back=o.back!=null?o.back:side?0:(tl/2+cl/2+gap),lat=side*(tw/2+cw/2+1.1),lead=(o.lead||0)*(target.spd||0);
  if(o.path&&o.s!=null){const P=o.path,a=P.at(o.s-back+lead),r=rgt(a.yaw),l=(o.lat0||0)+lat;return{x:a.x+r[0]*l,z:a.z+r[1]*l,yaw:a.yaw}}
  const f=fwd(target.yaw),r=rgt(target.yaw);return{x:target.x+f[0]*(lead-back)+r[0]*lat,z:target.z+f[1]*(lead-back)+r[1]*lat,yaw:target.yaw}}
function boxed(target,cars,o){o=o||{};const st=o.st||(o.st={t:0});const r=o.r!=null?o.r:4,need=o.t!=null?o.t:3,vmax=o.vmax!=null?o.vmax:8,dt=o.dt||0;
  let n=0;st.err=[];(cars||[]).forEach((c,i)=>{let ok;if(o.ok)ok=!!o.ok(c,i);else{const sl=(o.slots&&o.slots[i])||c.slot;if(!sl){ok=false}else{const p=slot(target,sl,c),e=Math.hypot(c.x-p.x,c.z-p.z);st.err[i]=e;ok=e<=r}}if(ok)n++});
  st.n=n;st.ok=!!cars&&cars.length>0&&n===cars.length&&Math.abs(target.spd||0)<vmax;
  st.t=st.ok?Math.min(need,st.t+dt):Math.max(0,st.t-dt*2);st.boxed=st.ok&&st.t>=need;return st.boxed}

HT.Tail={create,cone,front,los,poly,Rail,aheadGap,slot,boxed,K,FAM,fwd,rgt,yawTo,wrap};
if(typeof module!=='undefined'&&module.exports)module.exports=HT.Tail;
})(typeof window!=='undefined'?window:globalThis);
