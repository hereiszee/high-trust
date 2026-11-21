/* =====================================================================
   STOPS (SPEC3 section 4, "stop-schedule helper"): timed stops with windows and passengers.
   Built for Dad Taxi; meant for Dad Taxi rides, Watch Your Step and Hitch Happens too. No index.html changes:
   everything goes through HT.Jobs.api. Exposes window.HT.Stops:

     Stops.schedule(stops,{soft,clock})   a fixed-order list of stops with target times, hard deadlines, arrival detection and per-stop ratings
     Stops.comfort(o)                     passenger comfort from the car's motion (hard braking, fast corners, kerbs, impacts, speeding)
     Stops.riders(o)                      passengers you can see: walk to the car, sit in its seats, get out at the kerb
     Stops.radio(o)                       in-car radio presets that passengers have opinions about (R / tap the radio chip)
     Stops.panel(o)                       the HUD layer: clock, the stop list, the ride meter, the radio, stop-rating toasts, extra slots
     Stops.talk()                         a paced dialogue queue on top of api.radio (lines never pile up or get dropped)
     Stops.cruiser(o)                     a scripted road vehicle on a polyline (the thieves' pickup, Jen's car) with a blocking check
     Stops.legTime(api,a,b,o)             drive-time estimate between two points over the road graph
   ===================================================================== */
(function(){'use strict';const HT=window.HT=window.HT||{};const J=HT.Jobs;const A=()=>J&&J.api;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,hyp=Math.hypot;
/* seats in the car's frame [forward, hip height, right(+)/left(-), turn]: same table as index.html *MINIVAN* SEATS (seat 0 = driver) */
const SEATS={minivan:[[.2,.62,-.42],[.2,.62,.42],[-.75,.64,-.44],[-.75,.64,.44],[-1.65,.66,-.42],[-1.65,.66,0],[-1.65,.66,.42]],
 hatch:[[-.12,.47,-.37],[-.12,.47,.37],[-1.02,.5,-.38],[-1.02,.5,.38]],sedan:[[-.15,.45,-.38],[-.15,.45,.38],[-1.08,.48,-.4],[-1.08,.48,.4]],
 suv:[[.05,.66,-.42],[.05,.66,.42],[-.85,.68,-.44],[-.85,.68,.44],[-1.7,.7,-.42],[-1.7,.7,0],[-1.7,.7,.42]],
 pickup:[[.45,.78,-.42],[.45,.78,.42]],workvan:[[1.15,.72,-.45],[1.15,.72,.45]]};
const SEATN={minivan:7,suv:7,hatch:4,sedan:4,pickup:2,workvan:2};
const seatsOf=car=>SEATS[car&&car.type]||SEATS.minivan;
const seatCount=car=>SEATN[car&&car.type]||(car&&car.type?4:7);
/* clock: game seconds -> "10:42" */
function clockStr(sec){sec=Math.max(0,sec);let h=Math.floor(sec/3600),m=Math.floor(sec/60)%60;const ap=h>=12?'PM':'AM';h=h%12||12;return h+':'+String(m).padStart(2,'0')+' '+ap}
function polyLen(p){let s=0;for(let i=1;i<p.length;i++)s+=hyp(p[i].x-p[i-1].x,p[i].z-p[i-1].z);return s}
/* the point and heading at distance d along a polyline */
function polyAt(p,d){for(let i=1;i<p.length;i++){const l=hyp(p[i].x-p[i-1].x,p[i].z-p[i-1].z);if(d<=l||i===p.length-1){const k=l?clamp(d/l,0,1):0;return{x:p[i-1].x+(p[i].x-p[i-1].x)*k,z:p[i-1].z+(p[i].z-p[i-1].z)*k,yaw:Math.atan2(-(p[i].x-p[i-1].x),-(p[i].z-p[i-1].z)),i}}d-=l}
  const q=p[p.length-1];return{x:q.x,z:q.z,yaw:0,i:p.length-1}}
function route(a,from,to){const G=a.roads&&a.roads();let r=null;try{r=G&&G.route(from,to)}catch(_){r=null}const pts=r&&r.points&&r.points.length>1?r.points.map(p=>({x:p.x,z:p.z})):[{x:from.x,z:from.z},{x:to.x,z:to.z}];
  pts[0]={x:from.x,z:from.z};pts.push({x:to.x,z:to.z});return pts}
/* streets: a graph built straight from WORLD.roads (each road's centreline, nodes at every crossing and at the ends).
   Independent of HT.Roads' tile checks, so a driveway tile on a centreline doesn't cut a street in two. The bridge counts only when open. */
let STR=null;
function streets(a){const W=a.WORLD;if(STR&&STR.W===W&&STR.open===!!W.bridgeOpen)return STR;const tc=i=>i*2+1,roads=W.roads||[],nodes=[],key=new Map();
  const node=(x,z)=>{const k=x+','+z;if(!key.has(k)){key.set(k,nodes.length);nodes.push({x,z,e:[]})}return key.get(k)};
  const H=roads.filter(r=>r.o==='h'),V=roads.filter(r=>r.o==='v');const lists=roads.map(()=>[]);
  roads.forEach((r,i)=>{const c=r.k+1;lists[i].push(r.a+1,r.b-1);if(r.o==='h'&&!W.bridgeOpen&&r.a<140&&r.b>153)lists[i].push(139,155);for(const q of(r.o==='h'?V:H)){const qc=q.k+1;if(qc>=r.a&&qc<=r.b&&c>=q.a&&c<=q.b)lists[i].push(qc)}});
  roads.forEach((r,i)=>{const c=r.k+1,ts=[...new Set(lists[i])].sort((p,q)=>p-q);for(let j=1;j<ts.length;j++){const t0=ts[j-1],t1=ts[j];
      if(r.o==='h'&&!W.bridgeOpen&&t0<=139&&t1>=155)continue;
      const A_=r.o==='h'?node(tc(t0),tc(c)):node(tc(c),tc(t0)),B_=r.o==='h'?node(tc(t1),tc(c)):node(tc(c),tc(t1)),l=(t1-t0)*2;nodes[A_].e.push({to:B_,l});nodes[B_].e.push({to:A_,l})}});
  /* a point onto the nearest street: [node a, node b, projected x,z] */
  const near=(x,z)=>{let best=null;nodes.forEach((n,i)=>{for(const e of n.e){if(e.to<i)continue;const m=nodes[e.to],dx=m.x-n.x,dz=m.z-n.z,L2=dx*dx+dz*dz||1,t=clamp(((x-n.x)*dx+(z-n.z)*dz)/L2,0,1),px=n.x+dx*t,pz=n.z+dz*t,d=hyp(px-x,pz-z);if(!best||d<best.d)best={a:i,b:e.to,x:px,z:pz,d}}});return best};
  const path=(s,g)=>{const N=nodes.length,dist=new Float64Array(N).fill(1e18),prev=new Int32Array(N).fill(-1),done=new Uint8Array(N);
    for(const[i,d]of s)if(d<dist[i]){dist[i]=d}for(;;){let u=-1,b=1e18;for(let i=0;i<N;i++)if(!done[i]&&dist[i]<b){b=dist[i];u=i}if(u<0)break;done[u]=1;for(const e of nodes[u].e){const nd=dist[u]+e.l;if(nd<dist[e.to]){dist[e.to]=nd;prev[e.to]=u}}}
    let best=-1,bd=1e18;for(const[i,d]of g)if(dist[i]+d<bd){bd=dist[i]+d;best=i}const out=[];for(let u=best;u>=0;u=prev[u])out.unshift(u);return out};
  const keep=STR&&STR.W===W?STR.lots:[];STR={W,open:!!W.bridgeOpen,nodes,near,
    lots:[],
    /* a lot (parking lot, school loop) joins the streets at its entrance, not at whatever street is nearest */
    via(p){for(const l of STR.lots)if(p.x>=l.x0&&p.x<=l.x1&&p.z>=l.z0&&p.z<=l.z1)return l.via;return null},
    route(from,to){const fv=STR.via(from),tv=STR.via(to);if(fv||tv){const r=STR.route(fv||from,tv||to);if(!r)return null;if(fv)r.unshift({x:from.x,z:from.z});if(tv)r.push({x:to.x,z:to.z});return r}
      const A_=near(from.x,from.z),B_=near(to.x,to.z);if(!A_||!B_)return null;
      if((A_.a===B_.a&&A_.b===B_.b)||(A_.a===B_.b&&A_.b===B_.a))return[{x:from.x,z:from.z},{x:A_.x,z:A_.z},{x:B_.x,z:B_.z},{x:to.x,z:to.z}];
      const da=i=>hyp(nodes[i].x-A_.x,nodes[i].z-A_.z),db=i=>hyp(nodes[i].x-B_.x,nodes[i].z-B_.z);
      const ids=path([[A_.a,da(A_.a)],[A_.b,da(A_.b)]],[[B_.a,db(B_.a)],[B_.b,db(B_.b)]]);
      return[{x:from.x,z:from.z},{x:A_.x,z:A_.z},...ids.map(i=>({x:nodes[i].x,z:nodes[i].z})),{x:B_.x,z:B_.z},{x:to.x,z:to.z}]}};
  STR.lots=keep;return STR}
function lot(a,box){const S=streets(a);if(!S.lots.some(l=>l.x0===box.x0&&l.z0===box.z0))S.lots.push(box)}
/* the drive line: the street graph's centreline route (corner points), the tile GPS as a fallback */
function drive(a,from,to){let p=null;try{p=streets(a).route(from,to)}catch(e){p=null}if(p&&p.length>1){const out=[p[0]];for(const q of p.slice(1)){const l=out[out.length-1];if(hyp(q.x-l.x,q.z-l.z)>.3)out.push(q)}return out}return gps(a,from,to)}
/* a drivable right-hand lane between two points: the street route, offset, filleted, easing in and out of the kerb */
function laneRoute(a,from,to,off=1.05,rad=3.6){const g=drive(a,from,to);const ln=lane(g.slice(1,-1),off,rad);
  const ease=(i,j)=>{const p=ln[i],q=ln[j];if(!p||!q)return;const l=hyp(p.x-q.x,p.z-q.z);if(l<.5)return;const m=Math.min(6,l*.45);ln[i]={x:p.x+(q.x-p.x)/l*m,z:p.z+(q.z-p.z)/l*m}};
  if(ln.length>=2){ease(0,1);ease(ln.length-1,ln.length-2)}ln.unshift({x:from.x,z:from.z});ln.push({x:to.x,z:to.z});return ln}
/* the tile GPS (HT.Roads.gps: roads cheap, grass dear, solids blocked): follows every drivable street, even where the road graph has a gap */
function gps(a,from,to){let r=null;try{r=window.HT.Roads&&HT.Roads.gps&&HT.Roads.gps(a.WORLD,from,to)}catch(_){r=null}
  if(!r||!r.points||r.points.length<2)return route(a,from,to);const pts=r.points.map(p=>({x:p.x,z:p.z}));pts[0]={x:from.x,z:from.z};pts.push({x:to.x,z:to.z});return pts}
/* a right-hand lane from a corner polyline: each segment moved off metres to its right, corners filleted with radius rad */
function lane(pts,off=1.5,rad=5){const out=[],n=pts.length;if(n<2)return pts.slice();const dir=i=>{const a=pts[i],b=pts[i+1],l=hyp(b.x-a.x,b.z-a.z)||1;return{x:(b.x-a.x)/l,z:(b.z-a.z)/l,l}};
  const segs=[];for(let i=0;i<n-1;i++){const d=dir(i);if(d.l<.05)continue;const r={x:-d.z,z:d.x};/* right of travel in this world: forward (dx,dz) -> right (-dz, dx) */
    segs.push({a:{x:pts[i].x+r.x*off,z:pts[i].z+r.z*off},b:{x:pts[i+1].x+r.x*off,z:pts[i+1].z+r.z*off},d})}
  if(!segs.length)return pts.slice();out.push(segs[0].a);
  for(let i=0;i<segs.length-1;i++){const s0=segs[i],s1=segs[i+1];const cr=s0.d.x*s1.d.z-s0.d.z*s1.d.x,dt=s0.d.x*s1.d.x+s0.d.z*s1.d.z;
    if(Math.abs(cr)<.05&&dt>0){continue}
    /* the corner: intersection of the two offset lines */const den=s0.d.x*s1.d.z-s0.d.z*s1.d.x;let c;if(Math.abs(den)<1e-6)c=s0.b;else{const t=((s1.a.x-s0.a.x)*s1.d.z-(s1.a.z-s0.a.z)*s1.d.x)/den;c={x:s0.a.x+s0.d.x*t,z:s0.a.z+s0.d.z*t}}
    const r=Math.min(rad,s0.d.l*.45,s1.d.l*.45),p0={x:c.x-s0.d.x*r,z:c.z-s0.d.z*r},p1={x:c.x+s1.d.x*r,z:c.z+s1.d.z*r};
    for(let k=0;k<=6;k++){const t=k/6,u=1-t;out.push({x:u*u*p0.x+2*u*t*c.x+t*t*p1.x,z:u*u*p0.z+2*u*t*c.z+t*t*p1.z})}}
  out.push(segs[segs.length-1].b);return out}
/* an autopilot for scripted drivers (tests): pure pursuit along a lane, slowing for the bends ahead. keys = api.keys. Returns the distance left */
function pursue(car,P,keys,o={}){const k=keys,L_=P.pts;if(!L_||L_.length<2)return 0;
  if(!P.cum){P.cum=[0];for(let i=1;i<L_.length;i++)P.cum.push(P.cum[i-1]+hyp(L_[i].x-L_[i-1].x,L_[i].z-L_[i-1].z));P.j=0}
  const cum=P.cum,tot=cum[cum.length-1];
  /* project the car onto the line (segments near the last one) */
  let bj=P.j||0,bd=1e9,bs=0;for(let j=Math.max(0,bj-1);j<Math.min(L_.length-1,bj+30);j++){const a=L_[j],b=L_[j+1],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz||1e-9,t=clamp(((car.pos.x-a.x)*dx+(car.pos.z-a.z)*dz)/l2,0,1),px=a.x+dx*t,pz=a.z+dz*t,d=hyp(px-car.pos.x,pz-car.pos.z);
    if(d<bd-1e-6){bd=d;bj=j;bs=cum[j]+t*Math.sqrt(l2)}}P.j=bj;P.i=bj;P.err=bd;
  const at=s_=>{s_=clamp(s_,0,tot);let j=bj;while(j<L_.length-2&&cum[j+1]<s_)j++;const a=L_[j],b=L_[j+1],l=cum[j+1]-cum[j]||1e-9,t=(s_-cum[j])/l;return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,j}};
  const sp=car.spd,look=4+Math.max(0,sp)*.45;let tg=at(bs+look);
  const hd=j=>Math.atan2(L_[j+1].x-L_[j].x,L_[j+1].z-L_[j].z),h0=hd(bj);let turn=0;const hz=Math.max(10,sp*sp/7+8);
  for(let j=bj+1;j<L_.length-1&&cum[j]<bs+hz;j++){if(cum[j+1]-cum[j]<.05)continue;let d=hd(j)-h0;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;turn=Math.max(turn,Math.abs(d))}
  const left=Math.max(tot-bs,0)+(bj>=L_.length-2?0:0);
  /* steer around parked cars (o.avoid: [{x,z}]) by sliding the aim point sideways */
  if(o.avoid){const fx=-Math.sin(car.yaw),fz=-Math.cos(car.yaw);let push=0;for(const ob of o.avoid){const ox=ob.x-car.pos.x,oz=ob.z-car.pos.z,al=ox*fx+oz*fz;if(al<0||al>24)continue;
      const tx=tg.x-car.pos.x,tz=tg.z-car.pos.z,tl=Math.hypot(tx,tz)||1,side=(ox*tz-oz*tx)/tl;/* + = obstacle left of the line */if(Math.abs(side)<3.1){const want=(3.3-Math.abs(side))*(side>0?-1:1);P.slow=1;if(Math.abs(want)>Math.abs(push))push=want}}
    if(push){tg={x:tg.x+(-fz)*-push,z:tg.z+fx*-push}}}
  const dx=tg.x-car.pos.x,dz=tg.z-car.pos.z;let d=Math.atan2(-dx,-dz)-car.yaw;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
  let want=o.max||12;if(P.slow){want=Math.min(want,8);P.slow=0}if(turn>.35)want=Math.min(want,turn>1.2?5.2:6.5);if(Math.abs(d)>.7)want=Math.min(want,4);if(o.stop)want=Math.min(want,Math.max(0,Math.sqrt(2*3.2*Math.max(0,left-(o.r||1)))));
  P.dbg={want:Math.round(want*10)/10,d:Math.round(d*100)/100,j:bj+'/'+L_.length,left:Math.round(left*10)/10,err:Math.round(bd*10)/10};
  k.a=d>.04;k.d=d<-.04;k.w=sp<want-.25&&want>.2;k.s=sp>want+1.2&&sp>.4;k[' ']=!!(o.stop&&left<(o.r||1)&&Math.abs(sp)>.15);return left}
/* drive time estimate: corners cost extra (a careful dad slows to ~6 m/s for each), straights at o.v (default 10 m/s) */
function legTime(a,from,to,o={}){const p=drive(a,from,to),len=polyLen(p);let turns=0;for(let i=1;i<p.length-1;i++){const h1=Math.atan2(p[i].x-p[i-1].x,p[i].z-p[i-1].z),h2=Math.atan2(p[i+1].x-p[i].x,p[i+1].z-p[i].z);let d=Math.abs(h2-h1);if(d>Math.PI)d=2*Math.PI-d;if(d>.6)turns++}
  return{len,turns,t:len/(o.v||10)+turns*(o.turn||2.2)+(o.pad||3),points:p}}

/* ---------- schedule ---------- */
function schedule(stops,o={}){const S={stops:stops.map((s,k)=>Object.assign({k,r:3.8,dwell:.6,done:false,at:null,late:null,stars:0},s)),i:0,soft:o.soft||30,still:0,clock:o.clock||{start:10*3600,scale:8}};
  S.cur=()=>S.stops[S.i]||null;
  S.clockAt=t=>S.clock.start+t*S.clock.scale;
  S.clockStr=t=>clockStr(S.clockAt(t));
  S.due=s=>clockStr(S.clockAt(s.target));
  /* are you parked in the ring? (any speed under 1.4 m/s for s.dwell seconds) */
  S.inRing=(s,car,dt)=>{if(!s||!car)return false;const d=hyp(car.pos.x-s.x,car.pos.z-s.z);if(d<s.r&&Math.abs(car.spd)<1.4){s._still=(s._still||0)+dt;return s._still>=s.dwell}s._still=0;return false};
  S.near=(s,car)=>!!(s&&car&&hyp(car.pos.x-s.x,car.pos.z-s.z)<s.r+1);
  /* arrival: records the time and the timing part of the rating */
  S.arrive=(s,t)=>{if(s.at!=null)return s;s.at=t;s.late=t-s.target;s.onTime=s.late<=S.soft;return s};
  S.finish=(s,comfortLeg)=>{s.done=true;s.comfort=comfortLeg;const tm=s.late<=0?3:s.late<=S.soft?2:s.late<=S.soft*2?1:0,cf=comfortLeg>=90?2:comfortLeg>=75?1:0;s.stars=Math.max(1,tm+cf);
    if(S.stops[S.i]===s)S.i++;return s};
  S.left=(s,t)=>s.target+(s.hard||0)-t;/* seconds to the hard deadline */
  S.onTime=()=>S.stops.filter(s=>s.done&&s.onTime).length;
  S.timing=s=>s.late==null?'':s.late<=-20?'Early':s.late<=0?'Right on time':s.late<=S.soft?'Just made it':'Late';
  S.save=()=>S.stops.map(s=>({target:s.target,done:s.done,at:s.at,late:s.late,onTime:!!s.onTime,stars:s.stars,comfort:s.comfort==null?null:Math.round(s.comfort)}));
  S.load=arr=>{(arr||[]).forEach((x,k)=>{const s=S.stops[k];if(!s||!x)return;Object.assign(s,x)});S.i=S.stops.findIndex(s=>!s.done);if(S.i<0)S.i=S.stops.length};
  return S}

/* ---------- comfort ---------- */
/* tuned numbers (m/s, m/s²): see docs at the top of js/jobs/taxi.js */
const CF={brake:10,accel:9.5,lat:7.5,impact:26,kerbD:4.4,speed:19.5,kBrake:.9,kAccel:.6,kLat:1.15,kSpeed:1.4,regen:1.3,calm:2,floor:5};
function comfort(o={}){const C={v:100,sum:0,time:0,legSum:0,legTime:0,a:0,lat:0,lastBad:-9,pv:null,pyaw:null,off:false,t:0,cool:{},n:{brake:0,corner:0,kerb:0,bump:0,speed:0},cfg:Object.assign({},CF,o.cfg||{}),on:o.on||null};
  const ev=(k,sev)=>{C.n[k]++;if(C.on&&(C.cool[k]||-99)<C.t-(k==='bump'?.8:4)){C.cool[k]=C.t;try{C.on(k,sev)}catch(e){console.warn(e)}}};
  const hit=(d,k)=>{C.v=Math.max(C.cfg.floor,C.v-d);C.lastBad=C.t};
  /* car: the driven entry (pos, yaw, spd). ctx: {riders:n (0 = nobody to upset), mood:-1..1 (radio), offRoad:bool} */
  C.update=(dt,car,ctx={})=>{C.t+=dt;if(!car||dt<=0)return;const F=C.cfg,sp=car.spd;
    if(C.pv==null){C.pv=sp;C.pyaw=car.yaw;return}
    let dy=car.yaw-C.pyaw;while(dy>Math.PI)dy-=2*Math.PI;while(dy<-Math.PI)dy+=2*Math.PI;
    const aRaw=(sp-C.pv)/dt,latRaw=Math.abs(sp*dy/dt);C.pv=sp;C.pyaw=car.yaw;
    if(ctx.riders===0){C.a=0;C.lat=0;return}
    /* impacts: a speed drop no brake can make */
    if(aRaw<-F.impact&&Math.abs(sp-(sp-aRaw*dt))>2.2){const dv=Math.abs(aRaw*dt);hit(Math.min(30,4+dv*2.2));ev('bump',dv);C.a=0}
    C.a+=(aRaw-C.a)*Math.min(1,dt/.18);C.lat+=(latRaw-C.lat)*Math.min(1,dt/.2);
    const av=Math.abs(sp),fwd=sp>=0?1:-1,acc=C.a*fwd;let bad=0;
    if(acc<-F.brake&&av>.8){const d=(-acc-F.brake)*F.kBrake*dt;bad+=d;if(-acc>F.brake+5)ev('brake',-acc)}
    if(acc>F.accel){bad+=(acc-F.accel)*F.kAccel*dt}
    if(C.lat>F.lat&&av>2){bad+=(C.lat-F.lat)*F.kLat*dt;if(C.lat>F.lat+3)ev('corner',C.lat)}
    if(av>F.speed){bad+=F.kSpeed*dt*(1+(av-F.speed)/6);ev('speed',av)}
    if(ctx.offRoad&&av>5){if(!C.off){hit(6);ev('kerb',av)}bad+=1.5*dt}
    C.off=!!ctx.offRoad&&av>5;
    if(bad>0)hit(bad);
    else if(C.t-C.lastBad>F.calm)C.v=Math.min(100,C.v+(F.regen+.8*(ctx.mood||0))*dt);
    if(ctx.mood<0&&C.t-C.lastBad>F.calm)C.v=Math.max(60,C.v+.25*ctx.mood*dt);
    C.sum+=C.v*dt;C.time+=dt;C.legSum+=C.v*dt;C.legTime+=dt};
  C.avg=()=>C.time>0?C.sum/C.time:C.v;
  C.legAvg=()=>C.legTime>0?C.legSum/C.legTime:C.v;
  C.legReset=()=>{C.legSum=0;C.legTime=0};
  C.word=v=>{v=v==null?C.v:v;return v>=90?'Smooth':v>=75?'Fine':v>=55?'Bumpy':v>=35?'Queasy':'Carsick'};
  C.save=()=>({v:Math.round(C.v),sum:Math.round(C.sum),time:Math.round(C.time*10)/10,n:Object.assign({},C.n)});
  C.load=s=>{if(!s)return;C.v=s.v;C.sum=s.sum;C.time=s.time;if(s.n)Object.assign(C.n,s.n);C.pv=null};
  return C}

/* ---------- riders: passengers you can see ---------- */
function riders(o={}){const R={list:[],car:null};const a=A();
  const pp=()=>window.HT&&HT.People&&HT.People.ok?HT.People:null;
  const pose=(r,dt,p)=>{const P=pp();if(r.d.rb&&P)try{P.pose(r.d,dt,p)}catch(_){}else boxPose(r,dt,p)};
  /* the box-dude fallback: a little leg swing so nobody glides */
  const boxPose=(r,dt,p)=>{const d=r.d;if(!d.legs)return;r.ph=(r.ph||0)+(p.moving?dt*9:0);const s=p.moving?Math.sin(r.ph)*.6:0;
    if(p.mode==='sit'){d.legs.forEach(l=>l.rotation.x=-1.45);d.arms&&d.arms.forEach(x=>{x.rotation.x=-.5})}else{d.legs[0].rotation.x=s;d.legs[1].rotation.x=-s;d.arms&&d.arms.forEach((x,i)=>{x.rotation.x=i?s*.7:-s*.7})}};
  R.add=(id,spec)=>{const a=A();let d=null;const P=pp();
    if(spec.make)d=spec.make();
    if(!d&&P&&spec.role&&(!P.has||P.has(spec.role)||P.roles&&P.roles.includes&&P.roles.includes(spec.role)))try{d=P.make(spec.role,{variant:spec.variant})}catch(_){d=null}
    if(!d)d=a.makeDude(spec.look||{role:spec.role,shirt:spec.shirt||'#4a7bd0',pants:'#2d3550',skin:spec.skin,hair:'#3a2a1a',scale:spec.scale});
    if(spec.scale&&d.root.scale.y!==spec.scale)d.root.scale.setScalar(spec.scale);
    if(spec.dress)try{spec.dress(d)}catch(e){console.warn(e)}
    a.wmAdd(d.root);d.root.visible=false;
    const r=Object.assign({id,d,state:'off',seat:-1,x:0,z:0,yaw:0,speed:spec.speed||1.7,scale:spec.scale||1},spec);R.list.push(r);return r};
  R.get=id=>R.list.find(r=>r.id===id)||null;
  R.inCar=()=>R.list.filter(r=>r.state==='seat');
  R.count=()=>R.list.filter(r=>r.state==='seat'||r.state==='boarding').length;
  const used=()=>new Set(R.list.filter(r=>r.seat>=0&&(r.state==='seat'||r.state==='boarding')).map(r=>r.seat));
  R.free=car=>{const n=seatCount(car),u=used();let f=0;for(let i=1;i<n;i++)if(!u.has(i))f++;return f};
  const takeSeat=(r,car)=>{const n=seatCount(car),u=used();const pref=r.prefer||[2,3,1,4,6,5];for(const i of pref.concat([1,2,3,4,5,6]))if(i<n&&!u.has(i)){r.seat=i;return i}r.seat=-1;return -1};
  const frame=car=>({f:{x:-Math.sin(car.yaw),z:-Math.cos(car.yaw)},r:{x:Math.cos(car.yaw),z:-Math.sin(car.yaw)}});
  /* the door beside seat i: the kerb side when the seat is in the middle */
  R.door=(car,i,side)=>{const s=seatsOf(car)[i]||[0,0,.4],F=frame(car),w=(a.carSize?a.carSize(car).w:2)/2+.55,sd=side||(s[2]<0?-1:1);
    return{x:car.pos.x+F.f.x*s[0]+F.r.x*sd*w,z:car.pos.z+F.f.z*s[0]+F.r.z*sd*w}};
  R.seatNow=(r,car)=>{if(takeSeat(r,car)<0)return false;r.state='seat';r.walk=null;r.d.root.visible=true;return true};
  /* walk from (x,z) to the car's door, then sit. then() when seated */
  R.board=(r,from,car,then)=>{if(takeSeat(r,car)<0)return false;r.state='boarding';r.x=from.x;r.z=from.z;r.d.root.visible=true;const s=seatsOf(car)[r.seat];
    r.walk={car,side:null,then};return true};
  /* get out on the kerb side and walk to (x,z); then() on arrival. hide:true removes them from the scene when they get there */
  R.alight=(r,to,car,then,o2={})=>{const s=seatsOf(car)[r.seat]||[0,0,.4];const F=frame(car),side=((to.x-car.pos.x)*F.r.x+(to.z-car.pos.z)*F.r.z)>=0?1:-1;const dr=R.door(car,r.seat,side);
    r.state='leaving';r.seat=-1;r.x=dr.x;r.z=dr.z;r.walk={to,then,hide:!!o2.hide};r.d.root.visible=true};
  R.place=(r,x,z,yaw)=>{r.state='stand';r.x=x;r.z=z;r.yaw=yaw==null?r.yaw:yaw;r.d.root.visible=true};
  R.hide=r=>{r.state='off';r.seat=-1;r.d.root.visible=false};
  R.goto=(r,to,then,sp)=>{r.state='walking';r.walk={to,then,sp};r.d.root.visible=true};
  R.update=(dt,car)=>{const a=A();for(const r of R.list){const d=r.d;
      if(r.state==='seat'){if(!car||!car.obj){d.root.visible=false;continue}const s=seatsOf(car)[r.seat]||seatsOf(car)[1],F=frame(car),sc=d.root.scale.y||1,y0=car.obj.position.y;
        d.root.visible=car.type!=='workvan';d.root.position.set(car.pos.x+F.f.x*s[0]+F.r.x*s[2],y0+s[1]-.59*sc-(1-sc)*.32,car.pos.z+F.f.z*s[0]+F.r.z*s[2]);d.root.rotation.set(0,car.yaw+Math.PI+(s[3]||0),0);
        pose(r,dt,{mode:'sit',aim:false,moving:false});continue}
      if(r.state==='off')continue;
      let to=null,sp=r.speed;
      if(r.state==='boarding'){const w=r.walk;if(!w||!w.car){r.state='seat';continue}to=R.door(w.car,r.seat,w.side||(((r.x-w.car.pos.x)*Math.cos(w.car.yaw)+(r.z-w.car.pos.z)*-Math.sin(w.car.yaw))>=0?1:-1))}
      else if((r.state==='leaving'||r.state==='walking')&&r.walk)to=r.walk.to,sp=r.walk.sp||sp;
      if(to){const dx=to.x-r.x,dz=to.z-r.z,dd=hyp(dx,dz);
        if(dd<.25){const w=r.walk;r.walk=null;
          if(r.state==='boarding'){r.state='seat';try{a.snd&&a.snd('reload',.25)}catch(_){}}
          else{r.state='stand';if(w&&w.hide)R.hide(r)}
          if(w&&w.then)try{w.then(r)}catch(e){console.warn(e)}}
        else{const st=Math.min(dd,sp*dt);r.x+=dx/dd*st;r.z+=dz/dd*st;const want=Math.atan2(dx,dz);let dy=want-r.yaw;while(dy>Math.PI)dy-=2*Math.PI;while(dy<-Math.PI)dy+=2*Math.PI;r.yaw+=dy*Math.min(1,dt*10)}
        d.root.position.set(r.x,a.groundAt(r.x,r.z),r.z);d.root.rotation.set(0,r.yaw,0);pose(r,dt,{moving:!!r.walk,speed:sp,aim:false});continue}
      if(r.state==='stand'){d.root.position.set(r.x,a.groundAt(r.x,r.z),r.z);d.root.rotation.set(0,r.yaw,0);pose(r,dt,{moving:false,aim:false,mode:r.mode||'stand'})}}};
  R.save=()=>R.list.map(r=>({id:r.id,state:r.state==='boarding'?'seat':r.state==='leaving'||r.state==='walking'?'stand':r.state,seat:r.seat,x:Math.round(r.x*10)/10,z:Math.round(r.z*10)/10,yaw:Math.round(r.yaw*100)/100}));
  return R}

/* ---------- radio presets ---------- */
const STATIONS=[{id:'rock',name:'WDAD 101.5',sub:'Soft rock for hard workers',music:'hub',int:.6},
  {id:'kidz',name:'TOT ROCK 98',sub:'Songs about snacks, all day',music:'combat',int:.25},
  {id:'talk',name:'AM 860 THE HUDDLE',sub:'Sports talk',music:null,talk:true},
  {id:'jazz',name:'MELLOW 88.3',sub:'Music to merge by',music:'home',int:.5},
  {id:'off',name:'RADIO OFF',sub:'Silence. Glorious silence.',music:null}];
const TALK=["...and that's why you never punt on fourth and two. Gary in Maple Heights, you're on The Huddle.","Gary: Long-time listener. I have a spreadsheet on this.","...the Cougars' JV squad, folks, that's a team that believes in itself.",
  "...it's the halftime orange slice debate. Rinds on or rinds off. Lines are open.","...caller says the ref was his brother-in-law. We'll allow it.","...forecast for the big game: sunny, light breeze, one dad yelling 'HUSTLE'."];
function radio(o={}){const R={i:o.start||0,st:STATIONS,t:0,talkT:2,on:o.on||null,applied:false};
  const AU=()=>window.HT&&HT.Audio;
  R.cur=()=>STATIONS[R.i];
  R.apply=()=>{const au=AU(),s=R.cur();R.applied=true;if(!au)return;try{au.music(s.music||null);if(s.music&&au.setIntensity)au.setIntensity(s.int)}catch(_){}};
  R.set=i=>{R.i=(i+STATIONS.length)%STATIONS.length;R.apply();try{const au=AU();au&&au.ui&&au.ui('click')}catch(_){}if(R.on)try{R.on(R.cur())}catch(e){console.warn(e)}};
  R.next=()=>R.set(R.i+1);
  R.update=(dt,talk)=>{if(!R.applied)R.apply();const s=R.cur();if(s.talk){R.talkT-=dt;if(R.talkT<=0){R.talkT=2.6+Math.random()*1.4;const au=AU();try{au&&au.voice&&au.voice('dad',null,{radio:true,vol:.35,pitch:.9+Math.random()*.2})}catch(_){}
      R.t++;if(talk&&R.t%5===1)talk('AM 860',TALK[(R.t/5|0)%TALK.length],{low:true})}}};
  /* how the car feels about it: average of each rider's like (+1) / hate (-1) */
  R.mood=list=>{if(!list.length)return 0;const s=R.cur().id;let m=0;for(const r of list)m+=r.likes===s?1:r.hates===s?-1:0;return m/list.length};
  R.save=()=>R.i;
  return R}
HT.Stops_STATIONS=STATIONS;

/* ---------- dialogue queue: paced lines through api.radio ---------- */
/* Lines go out in groups (an exchange is never split). Higher priority goes first: 3 story beats, 2 stop scenes, 1 reactions, 0 chatter.
   Groups expire when they're stale (a reaction to a pothole 9 s ago is not funny), so the talk never lags behind the driving. */
const TTL=[9,5,25,90];
function talk(){const Q={q:[],cur:null,wait:0,said:{},t:0};
  Q.group=(lines,o={})=>{if(o.once){if(Q.said[o.once])return;Q.said[o.once]=1}const prio=o.prio!=null?o.prio:o.now?2:1;if(o.low&&(Q.q.length||Q.cur))return;
    Q.q.push({lines:lines.slice(),prio,born:Q.t,ttl:o.ttl||TTL[prio]||10,o});if(Q.q.length>12)Q.q.splice(Q.q.findIndex(g=>g.prio===Math.min(...Q.q.map(x=>x.prio))),1)};
  Q.say=(who,text,o={})=>Q.group([[who,text,o]],o);
  Q.busy=()=>Q.q.length>0||!!Q.cur||Q.wait>.4;
  Q.idle=()=>!Q.q.length&&!Q.cur&&Q.wait<=0;
  const out=([w,t,o])=>{const a=A();a.radio(w,t,true);Q.wait=Math.min(5,1.4+t.length*.042)+((o&&o.pause)||0);
    const au=window.HT&&HT.Audio;if(au&&au.voice&&!(o&&o.voice===false))try{au.voice((o&&o.voice)||(/^(Maddie|Tyler|Ava|Mason)/.test(w)?'kid':w==='you'?'dad':/^Kid /.test(w)?'thug':'dad'),null,{radio:/text|AM 860|phone|radio/i.test(w),vol:.5,pitch:o&&o.pitch})}catch(_){}};
  Q.update=dt=>{Q.t+=dt;Q.wait-=dt;if(Q.wait>0)return;
    if(Q.cur){if(Q.cur.lines.length){out(Q.cur.lines.shift());return}const f=Q.cur.o.then;Q.cur=null;if(f)try{f()}catch(e){console.warn(e)}}
    Q.q=Q.q.filter(g=>g.o.then||Q.t-g.born<=g.ttl);if(!Q.q.length)return;let bi=0;for(let i=1;i<Q.q.length;i++)if(Q.q[i].prio>Q.q[bi].prio)bi=i;
    Q.cur=Q.q.splice(bi,1)[0];out(Q.cur.lines.shift())};
  Q.clear=(below)=>{const keep=g=>g.o.then||(below!=null&&g.prio>=below);Q.q=Q.q.filter(keep);if(Q.cur&&!keep(Q.cur))Q.cur=null;if(below==null)Q.wait=Math.min(Q.wait,.3)};
  return Q}

/* ---------- a scripted road vehicle on a polyline ---------- */
/* o: {obj, points, speed, accel, len, wid, onEnd}. blockers(): [{x,z,yaw,len,wid}] cars it must not drive through */
function cruiser(o){const a=A(),C={obj:o.obj,pts:o.points,d:o.d||0,spd:o.spd||0,max:o.speed||11,acc:o.accel||5,brake:o.brake||9,len:o.len||5.2,wid:o.wid||2,off:0,want:0,x:0,z:0,yaw:0,stopT:0,done:false,col:o.col||null};
  C.total=polyLen(C.pts);
  const place=()=>{const p=polyAt(C.pts,C.d),n=polyAt(C.pts,C.d+3),r={x:Math.cos(p.yaw),z:-Math.sin(p.yaw)};C.x=p.x+r.x*C.off;C.z=p.z+r.z*C.off;
    let yaw=Math.atan2(-(n.x+r.x*C.want-C.x),-(n.z+r.z*C.want-C.z));if(!isFinite(yaw))yaw=p.yaw;C.yaw=yaw};
  C.ahead=(b,dist)=>{const fx=-Math.sin(C.yaw),fz=-Math.cos(C.yaw),dx=b.x-C.x,dz=b.z-C.z,along=dx*fx+dz*fz,side=-dx*fz+dz*fx;
    /* the other car's half-extent across our path */
    const by=b.yaw||0,ex=Math.abs(Math.sin(by-C.yaw))*(b.len||4.6)/2+Math.abs(Math.cos(by-C.yaw))*(b.wid||2)/2;return along>-.5&&along<dist&&Math.abs(side)<C.wid/2+ex+.15?{along,side,ex}:null};
  C.revT=0;C.reverse=sec=>{C.revT=sec};
  C.update=(dt,blockers=[])=>{if(C.done)return;let block=null;for(const b of blockers){const h=C.ahead(b,C.len/2+7+Math.max(0,C.spd)*.55);if(h&&(!block||h.along<block.along))block=h}
    if(block)C.lastSide=block.side;
    if(C.revT>0){/* backing up to go around: 2.5 m/s in reverse along the path */C.revT-=dt;C.spd=Math.max(-2.5,C.spd-C.brake*dt);C.d=Math.max(0,C.d+C.spd*dt);C.blocked=true;C.off+=(C.want-C.off)*Math.min(1,dt*.8);place();C.sync(dt);return}
    C.blocked=!!block;let target=C.max;if(block){const gap=block.along-C.len/2-(block.ex||1);target=gap<1.2?0:Math.min(C.max,gap*1.6)}
    if(C.spd<0)C.spd=Math.min(0,C.spd+C.brake*dt);else if(C.spd<target)C.spd=Math.min(target,C.spd+C.acc*dt);else C.spd=Math.max(target,C.spd-C.brake*dt);if(block&&block.along-C.len/2-(block.ex||1)<.3)C.spd=Math.min(C.spd,0);
    C.off+=(C.want-C.off)*Math.min(1,dt*1.6);
    C.d+=C.spd*dt;if(C.d>=C.total){C.d=C.total;C.done=true;if(o.onEnd)o.onEnd(C)}place();C.sync(dt)};
  C.sync=dt=>{if(!C.obj)return;C.obj.position.set(C.x,a.groundAt(C.x,C.z),C.z);C.obj.rotation.set(0,C.yaw+Math.PI/2,0);const VM=window.HT&&HT.Vehicles;
    if(C.obj.userData.mod&&VM&&VM.update)try{VM.update(C.obj,{speed:C.spd,steer:clamp((C.want-C.off)*.4,-.5,.5),braking:C.blocked||C.spd<.5,headlights:false,dt:dt||1/30})}catch(_){}
    if(C.col){const hl=C.len/2,hw=C.wid/2,s=Math.abs(Math.sin(C.yaw)),c=Math.abs(Math.cos(C.yaw)),hx=s*hl+c*hw,hz=c*hl+s*hw;
      /* while the dad drives, the van's own collider push handles contact through this box */
      Object.assign(C.col,{x0:C.x-hx,x1:C.x+hx,z0:C.z-hz,z1:C.z+hz,ob:{x:C.x,z:C.z,fx:-Math.sin(C.yaw),fz:-Math.cos(C.yaw),hl,hw}})}};
  place();C.sync(0);return C}

/* ---------- the HUD layer ---------- */
const CSS=`
.stx{position:fixed;inset:0;pointer-events:none;z-index:11;font-family:var(--ht-ui,"Barlow Condensed",sans-serif);color:#fff}
.stx-side{position:absolute;right:36px;top:200px;width:226px;display:flex;flex-direction:column;gap:7px;align-items:stretch}
.stx-clock{display:flex;align-items:baseline;justify-content:flex-end;gap:10px;text-shadow:0 2px 6px rgba(0,0,0,.55)}
.stx-clock b{font:700 38px/1 var(--ht-ui,"Barlow Condensed",sans-serif);letter-spacing:.01em;white-space:nowrap}.stx-clock b small{font-size:.5em;margin-left:3px;letter-spacing:.06em}
.stx-clock span{white-space:nowrap;font:700 12px/1 var(--ht-ui);letter-spacing:.16em;text-transform:uppercase;color:#ffd36a}
.stx-clock.hot b{color:#ff8a6a;animation:stxPulse .9s ease-in-out infinite}
@keyframes stxPulse{50%{opacity:.55}}
.stx-note{position:relative;background:linear-gradient(176deg,#fff7a8,#fbe97c 60%,#f3dc66);color:#3a3320;border-radius:2px 2px 10px 2px;padding:12px 14px 10px;transform:rotate(-1.2deg);
  box-shadow:0 10px 22px rgba(0,0,0,.35),inset 0 -18px 24px -18px rgba(150,110,0,.35);font-family:var(--ht-body,"Barlow",sans-serif)}
.stx-note:before{content:"";position:absolute;left:50%;top:-9px;width:64px;height:18px;margin-left:-32px;background:rgba(255,255,255,.55);transform:rotate(2deg);box-shadow:0 1px 2px rgba(0,0,0,.12)}
.stx-note h4{margin:0 0 4px;font:800 12.5px/1 var(--ht-ui);letter-spacing:.12em;text-transform:uppercase;color:#7a5a00;display:flex;justify-content:space-between;gap:8px;white-space:nowrap}
.stx-note h4 i{font-style:normal;color:#b0352a;letter-spacing:.06em}
.stx-row{display:grid;grid-template-columns:14px minmax(0,1fr) auto;gap:6px;align-items:baseline;padding:2px 0;border-bottom:1px dashed rgba(90,70,10,.25);font:600 13.5px/1.12 var(--ht-body)}
.stx-row:last-child{border-bottom:0}
.stx-row .bx{width:12px;height:12px;border:2px solid #5a4a20;border-radius:2px;position:relative;top:1px}
.stx-row.done .bx:after{content:"";position:absolute;left:2px;top:-4px;width:5px;height:10px;border:solid #2f8f4a;border-width:0 3px 3px 0;transform:rotate(40deg)}
.stx-row.done{color:rgba(58,51,32,.55)}
.stx-row.done .nm{text-decoration:line-through;text-decoration-color:rgba(58,51,32,.5)}
.stx-row.cur{color:#1d1a10}.stx-row.cur .nm{font-weight:800}.stx-row.cur .sub,.stx-row.alert .sub{display:block}
.stx-row.cur .bx{border-color:#c0392b;box-shadow:0 0 0 3px rgba(192,57,43,.18)}
.stx-row .nm{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stx-row .tm{font:700 13px/1 var(--ht-ui);letter-spacing:.02em;white-space:nowrap;text-align:right}
.stx-row .tm.late{color:#c0392b}.stx-row .tm.ok{color:#2f7a3f}
.stx-row .sub{display:none;font:500 11.5px/1.15 var(--ht-body);color:rgba(58,51,32,.75);margin-top:1px}
.stx-row .st{display:inline-block;color:#8a5a00;background:rgba(209,139,0,.18);border-radius:3px;padding:1px 3px;margin-right:4px;font:800 10.5px/1 var(--ht-ui)}
.stx-row.sum{grid-template-columns:14px minmax(0,1fr) auto;color:rgba(58,51,32,.6);font-size:12.5px}.stx-row.sum .nm{text-decoration:none}
.stx-note.c1 .stx-row.done:not(.sum){display:none}.stx-note:not(.c1) .stx-row.sum{display:none}.stx-note.c2 .stx-row.far2{display:none}.stx-note.c2 .stx-row .sub{display:none!important}
.stx-row.alert{color:#b0352a}.stx-row.alert .bx{border-color:#b0352a;background:rgba(176,53,42,.15)}
.stx-top{position:absolute;left:50%;top:92px;transform:translateX(-50%);display:flex;gap:8px;align-items:stretch}
.stx-ride{width:190px;background:rgba(14,20,30,.62);border-radius:10px;padding:6px 10px 7px;display:grid;grid-template-columns:30px 1fr;gap:3px 8px;align-items:center;backdrop-filter:blur(4px)}
.stx-ride svg{grid-row:span 2;width:30px;height:30px}
.stx-ride .lb{font:700 11px/1 var(--ht-ui);letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.7);display:flex;justify-content:space-between}
.stx-ride .lb b{color:#fff;letter-spacing:.06em;font-size:13px}
.stx-bar{height:8px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden;position:relative}
.stx-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:linear-gradient(90deg,#ffb347,#ffd36a 40%,#7ed67e);transition:width .25s}
.stx-bar.bad i{background:linear-gradient(90deg,#ff6a4d,#ffb347)}
.stx-bar em{position:absolute;top:-2px;bottom:-2px;width:2px;background:rgba(255,255,255,.75)}
.stx-radio{width:210px;pointer-events:auto;cursor:pointer;display:flex;align-items:center;gap:8px;background:rgba(14,20,30,.62);border-radius:10px;padding:7px 10px;backdrop-filter:blur(4px);user-select:none;-webkit-tap-highlight-color:transparent}
.stx-radio:active{transform:scale(.97)}
.stx-radio .dial{width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 50% 40%,#3b4658,#1b2230);box-shadow:inset 0 0 0 2px #ffd36a;position:relative;flex:none}
.stx-radio .dial:after{content:"";position:absolute;left:12px;top:4px;width:2px;height:9px;background:#ffd36a;border-radius:1px;transform-origin:1px 9px;transform:rotate(var(--r,0deg));transition:transform .3s}
.stx-radio .tx{flex:1;min-width:0}
.stx-radio .tx b{display:block;font:700 15px/1 var(--ht-ui);letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stx-radio .tx span{display:block;font:500 11px/1.2 var(--ht-body);color:rgba(255,255,255,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stx-radio .key{font:700 11px/1 var(--ht-ui);padding:3px 6px;border-radius:4px;background:#f2efe6;color:#1b2230}
.stx-radio .moods{display:flex;gap:2px;font-size:13px}
.stx-toast{position:absolute;left:50%;top:auto;bottom:150px;transform:translate(-50%,-14px);opacity:0;transition:opacity .35s,transform .35s;background:rgba(14,20,30,.78);border-radius:12px;padding:10px 18px 11px;min-width:300px;text-align:center;backdrop-filter:blur(5px);border-top:3px solid #ffd36a}
.stx-toast.on{opacity:1;transform:translate(-50%,0)}
.stx-toast .k{font:700 11px/1 var(--ht-ui);letter-spacing:.2em;color:#ffd36a;text-transform:uppercase}
.stx-toast .t{font:700 26px/1.05 var(--ht-ui);text-transform:uppercase;margin:4px 0 3px}
.stx-toast .s{font:500 14px/1.2 var(--ht-body);color:rgba(255,255,255,.85)}
.stx-toast .stars{font-size:22px;letter-spacing:3px;color:#ffd36a}.stx-toast .stars u{text-decoration:none;color:rgba(255,255,255,.22)}
.stx-mid{position:absolute;left:50%;top:150px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px}
.stx-slot:empty{display:none}
@media (max-width:640px){
  .stx-side{right:10px;top:150px;width:172px;gap:5px}.stx-clock b{font-size:28px}.stx-clock span{display:none}
  .stx-note{padding:8px 9px 6px;transform:none}.stx-note h4{font-size:11px}.stx-row{font-size:12.5px}.stx-row .sub,.stx-row.cur .sub,.stx-row.alert .sub{display:none}.stx-row.done:not(.sum),.stx-row.far,.stx-row.far2{display:none}.stx-note .stx-row.sum{display:grid!important}
  .stx-top{top:298px;bottom:auto;left:auto;right:10px;transform:none;flex-direction:column;width:172px;gap:5px}.stx-ride,.stx-radio{width:auto}.stx-radio .tx span{display:none}
  .stx-mid{top:auto;bottom:345px;width:94vw}.stx-mid>*{max-width:94vw}.stx-toast{bottom:305px;min-width:250px}.stx-toast .t{font-size:20px}}
@media (max-height:520px) and (orientation:landscape){.stx-side{top:96px;width:190px}.stx-row .sub{display:none}.stx-row.done:not(.sum){display:none}.stx-note .stx-row.sum{display:grid}.stx-top{top:auto;bottom:120px;left:auto;right:12px;transform:none;flex-direction:column;width:190px}.stx-ride,.stx-radio{width:auto}.stx-mid{top:30%}}
@media (max-height:520px) and (orientation:landscape){.stx-side{top:120px}}`;
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function face(v){/* a little passenger face: smile to green-faced */const m=v>=75?'M10 21 Q17 27 24 21':v>=55?'M10 22 L24 22':'M10 24 Q17 18 24 24',c=v>=55?'#ffd36a':v>=35?'#ffb347':'#9bd36a';
  return`<svg width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/><circle cx="12" cy="14" r="2" fill="#2a2418"/><circle cx="22" cy="14" r="2" fill="#2a2418"/><path d="${m}" stroke="#2a2418" stroke-width="2.4" fill="none" stroke-linecap="round"/>${v<35?'<path d="M9 9 l4 2 M25 9 l-4 2" stroke="#2a2418" stroke-width="1.6"/>':''}</svg>`}
function panel(o={}){if(!document.getElementById('stx-css')){const s=el('style');s.id='stx-css';s.textContent=CSS;document.head.appendChild(s)}
  const root=el('div','stx');root.dataset.job=o.id||'';const side=el('div','stx-side'),clock=el('div','stx-clock','<b>--:--</b><span></span>'),note=el('div','stx-note'),ride=el('div','stx-ride'),rad=el('div','stx-radio'),top=el('div','stx-top');
  const toast=el('div','stx-toast'),mid=el('div','stx-mid');side.append(clock,note);top.append(ride,rad);root.append(side,top,toast,mid);
  const slots={};const P={root,clock,note,ride,radio:rad,toast,mid,last:{},shown:false};
  rad.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(o.onRadio)o.onRadio()});
  P.slot=(id,where)=>{if(!slots[id]){const s=el('div','stx-slot');(where==='side'?side:mid).appendChild(s);slots[id]=s}return slots[id]};
  P.show=on=>{if(on&&!root.parentNode)document.body.appendChild(root);root.style.display=on?'':'none';P.shown=on};
  P.remove=()=>{if(root.parentNode)root.parentNode.removeChild(root)};
  const set=(k,e,html)=>{if(P.last[k]!==html){P.last[k]=html;e.innerHTML=html}};
  P.clockSet=(t,sub,hot)=>{const m=/^(.*) (AM|PM)$/.exec(t);set('clock',clock,'<b>'+(m?m[1]+'<small>'+m[2]+'</small>':t)+'</b><span>'+sub+'</span>');clock.classList.toggle('hot',!!hot)};
  /* rows: [{name, sub, time, state:'done'|'cur'|'todo'|'alert', late:bool, stars:n}] */
  P.list=(title,flag,rows,sum)=>set('note',note,'<h4><span>'+title+'</span>'+(flag?'<i>'+flag+'</i>':'')+'</h4>'+(sum?`<div class="stx-row done sum"><div class="bx"></div><div><span class="nm">${sum}</span></div><div class="tm"></div></div>`:'')+rows.map(r=>`<div class="stx-row ${r.state||''}${r.far?' far':''}${r.far2?' far2':''}"><div class="bx"></div><div><span class="nm">${r.name}</span>${r.sub?`<span class="sub">${r.sub}</span>`:''}</div><div class="tm ${r.cls||''}">${r.stars?'<span class="st">'+r.stars+'★</span>':''}${r.time||''}</div></div>`).join(''));
  P.rideSet=(v,word,avg,goal)=>{const html=face(v)+`<div class="lb">Ride <b>${word}</b></div><div class="stx-bar${v<55?' bad':''}"><i style="width:${Math.round(v)}%"></i>${goal?`<em style="left:${goal}%"></em>`:''}</div>`;set('ride',ride,html);if(avg!=null)ride.title='Average '+Math.round(avg)};
  P.radioSet=(s,k,moods,touch)=>{set('radio',rad,`<div class="dial" style="--r:${-60+k*30}deg"></div><div class="tx"><b>${s.name}</b><span>${s.sub}</span></div><div class="moods">${moods}</div>${touch?'':'<span class="key">R</span>'}`)};
  let toastT=0;P.toastShow=(k,t,s,stars,dur)=>{toast.innerHTML=`<div class="k">${k}</div><div class="t">${t}</div>${stars!=null?`<div class="stars">${'★'.repeat(stars)}<u>${'★'.repeat(Math.max(0,5-stars))}</u></div>`:''}<div class="s">${s||''}</div>`;toast.classList.add('on');toastT=dur||4.2};
  P.tick=dt=>{if(toastT>0){toastT-=dt;if(toastT<=0)toast.classList.remove('on')}P.fitT=(P.fitT||0)-dt;if(P.fitT<=0){P.fitT=.25;P.fit()}};
  /* keep the note clear of the speedometer and vehicle health (the HUD's drive cluster): full list -> done rows folded into one line -> current + next only */
  P.fit=()=>{if(!P.shown||!root.parentNode)return;const d=document.querySelector('.ht-drv');let lim=innerHeight-16;
    if(d){const r=d.getBoundingClientRect(),cs=getComputedStyle(d),sr=side.getBoundingClientRect();if(r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity!==0&&r.left<sr.right&&r.right>sr.left)lim=Math.min(lim,r.top-12)}
    {const r=top.getBoundingClientRect(),sr=side.getBoundingClientRect();if(r.height>0&&r.top>sr.top&&r.left<sr.right&&r.right>sr.left)lim=Math.min(lim,r.top-8)}
    for(const c of[[],['c1'],['c1','c2']]){note.classList.remove('c1','c2');c.forEach(k=>note.classList.add(k));if(note.getBoundingClientRect().bottom<=lim)break}P.mode=note.classList.contains('c2')?2:note.classList.contains('c1')?1:0};
  return P}

HT.Stops={schedule,comfort,riders,radio,panel,talk,cruiser,legTime,route,gps,lane,pursue,streets,drive,laneRoute,lot,polyLen,polyAt,clockStr,seatCount,seatsOf,SEATS,STATIONS,CF};
})();
