/* =====================================================================
   HT.Race: the reusable race helper (SPEC3 4.9, owned by The Grass Is Greener; the mower time trial uses it too).
   Pure logic (no THREE, no DOM), works in Node: a closed racing line, gates, laps, positions, finish timing with sub-frame
   interpolation (photo finishes), and an AI driver that steers any HT.CarAI car along the line with its own lane, overtakes,
   corner braking, skill and a rubber band to the player.

   const T=HT.Race.track(points,{closed:true,clear:(x,z)=>metres to the nearest obstacle, step:1})
     T.len, T.at(s) -> {x,z,tx,tz,nx,nz,half}   (n = left normal, half = usable half width for a 1.2 m vehicle)
     T.project(x,z,hint) -> {s,lat,d,i}           hint = last segment index (keeps sections that pass close apart)
     T.turn(s,ahead) -> heading change (rad) over the next `ahead` metres
   const R=HT.Race.make(T,{laps:3,racers:[{id,name,car,ai:true,skill,lane,aggro}],line:s0,gates:[{s,half,id}]})
     racer.car = an HT.CarAI car (x,z,yaw,spd,stats); the player's racer gets {player:true} and its car read each frame
     R.grid(slots)            puts racers on slots [{x,z,yaw}] (in order) and sets their progress behind the line
     R.update(dt)             progress, gates, laps, finish (call after the cars moved)
     R.ai(r,dt,o) -> input    {thr,st,boost,hb} for HT.CarAI.drive; o: {rubber:{ahead,behind}, cap, slow:(r)=>mul}
     R.order()                racers by race position (finished first by time, then by progress)
     R.pos(r), R.gapTo(a,b)   1-based position; gap in metres of progress
     events: R.on(fn) -> fn({type:'lap'|'finish'|'gate'|'miss'|'wrong', r, lap, t, gate})
   ===================================================================== */
(function(root){'use strict';
const HT=root.HT=root.HT||{};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const yawTo=(dx,dz)=>Math.atan2(-dx,-dz);
/* centripetal Catmull-Rom through closed control points, resampled to ~step metres */
function smooth(pts,step,closed){const n=pts.length,out=[];const P=i=>pts[closed?(i%n+n)%n:clamp(i,0,n-1)];
  for(let i=0;i<(closed?n:n-1);i++){const p0=P(i-1),p1=P(i),p2=P(i+1),p3=P(i+2),seg=Math.hypot(p2.x-p1.x,p2.z-p1.z),k=Math.max(2,Math.ceil(seg/step));
    for(let j=0;j<k;j++){const t=j/k,t2=t*t,t3=t2*t;
      out.push({x:.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
                z:.5*((2*p1.z)+(-p0.z+p2.z)*t+(2*p0.z-5*p1.z+4*p2.z-p3.z)*t2+(-p0.z+3*p1.z-3*p2.z+p3.z)*t3)})}}
  if(!closed)out.push(pts[n-1]);return out}
function track(points,o){o=o||{};const closed=o.closed!==false,src=points.map(p=>Array.isArray(p)?{x:p[0],z:p[1]}:{x:p.x,z:p.z});
  const P=o.raw?src:smooth(src,o.step||1,closed),n=P.length,cum=new Float64Array(n+1);
  for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];cum[i+1]=cum[i]+(closed||i<n-1?Math.hypot(b.x-a.x,b.z-a.z):0)}
  const len=cum[n];
  for(let i=0;i<n;i++){const a=P[(i-1+n)%n],b=P[(i+1)%n],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;P[i].tx=dx/l;P[i].tz=dz/l;P[i].nx=dz/l;P[i].nz=-dx/l;
    /* usable half width: clearance minus half a mower and a margin, capped */
    P[i].half=o.clear?clamp(o.clear(P[i].x,P[i].z)-(o.margin??.8),0,o.maxHalf||2.2):(o.half||2)}
  const segAt=s=>{s=((s%len)+len)%len;let lo=0,hi=n;while(hi-lo>1){const m=(lo+hi)>>1;if(cum[m]<=s)lo=m;else hi=m}return lo};
  const T={pts:P,n,len,cum,closed,
    at(s){s=((s%len)+len)%len;const i=segAt(s),a=P[i],b=P[(i+1)%n],L=cum[i+1]-cum[i]||1,t=(s-cum[i])/L,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
      return{x:a.x+dx*t,z:a.z+dz*t,tx:dx/l,tz:dz/l,nx:dz/l,nz:-dx/l,half:a.half+(b.half-a.half)*t,i}},
    /* nearest point on the line within a window of segments around the hint (or everywhere without one) */
    project(x,z,hint,back,ahead){let best=null;const from=hint==null?0:hint-(back??6),to=hint==null?n:hint+(ahead??14);
      for(let k=from;k<to;k++){const i=((k%n)+n)%n,a=P[i],b=P[(i+1)%n],dx=b.x-a.x,dz=b.z-a.z,L2=dx*dx+dz*dz||1,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/L2,0,1),px=a.x+dx*t,pz=a.z+dz*t,d=Math.hypot(x-px,z-pz);
        if(!best||d<best.d-1e-9){const l=Math.sqrt(L2);best={d,i,s:cum[i]+t*l,lat:((x-px)*dz-(z-pz)*dx)/l}}}
      /* lat: + = left of the travel direction (CarAI yaw convention: left = (tz,-tx)) */
      return best},
    turn(s,ahead){const a=T.at(s),b=T.at(s+ahead*.5),c=T.at(s+ahead);return Math.abs(wrap(Math.atan2(b.tz,b.tx)-Math.atan2(a.tz,a.tx)))+Math.abs(wrap(Math.atan2(c.tz,c.tx)-Math.atan2(b.tz,b.tx)))},
    segAt};
  return T}
/* ---------------------------------------------------------------- the race */
function make(T,o){o=o||{};const laps=o.laps||3,line=o.line||0,ev=[];
  const R={T,laps,line,t:0,racers:[],gates:(o.gates||[]).slice().sort((a,b)=>a.s-b.s),finished:[],started:false,
    on(fn){ev.push(fn);return R},emit(e){for(const f of ev)try{f(e)}catch(err){if(root.console)console.warn('[race]',err)}}};
  /* s relative to the line: 0 at the line, len just before it */
  const rel=s=>((s-line)%T.len+T.len)%T.len;
  for(const q of o.racers||[]){const d={lap:-1,s:0,prog:0,hint:null,gate:0,finished:false,finishT:null,lapT:0,lapStart:0,laps:[],best:null,lane:0,laneT:0,
    off:0,wrongT:0,stuckT:0,missed:0,place:0,skill:1,aggro:.5};for(const k in d)if(q[k]===undefined)q[k]=d[k];R.racers.push(q)}/* the caller's own objects */
  R.grid=slots=>{R.racers.forEach((r,k)=>{const p=slots[k];if(!p)return;r.car.x=p.x;r.car.z=p.z;r.car.yaw=p.yaw;r.car.spd=0;if(r.car.vdx!=null){r.car.vdx=-Math.sin(p.yaw);r.car.vdz=-Math.cos(p.yaw)}
    const q=T.project(p.x,p.z,null);r.hint=q.i;r.s=rel(q.s);r.lap=r.s>T.len/2?-1:0;r.prog=(r.lap)*T.len+r.s;r.gate=0;r.finished=false;r.finishT=null;r.laps=[];r.best=null;r.lane=clamp(q.lat,-1.6,1.6)})};
  R.update=dt=>{R.t+=dt;for(const r of R.racers){if(r.finished||r.frozen)continue;const c=r.car,q=T.project(c.x,c.z,r.hint);if(!q)continue;
      const s=rel(q.s),p0=r.prog;let ds=s-r.s;if(ds<-T.len/2)ds+=T.len;else if(ds>T.len/2)ds-=T.len;
      r.off=Math.abs(q.lat);r.lat=q.lat;const onLine=q.d<(o.offTrack||7);
      if(onLine){r.hint=q.i;const np=r.prog+ds;
        /* gates: crossing gate.s in this step (forward only) */
        for(const g of R.gates){const gs=g.s;if(r.lap>=0&&r.gateDone&&r.gateDone[g.id])continue;
          const a=((r.prog%T.len)+T.len)%T.len,b=((np%T.len)+T.len)%T.len;if(ds>0&&(a<gs&&b>=gs||a>b&&(gs>a||gs<=b))&&r.lap>=0){(r.gateDone||(r.gateDone={}))[g.id]=1;
            const miss=g.half!=null&&Math.abs(q.lat)>g.half;if(miss)r.missed++;R.emit({type:miss?'miss':'gate',r,gate:g,t:R.t})}}
        r.prog=np;r.s=s;
        /* wrong way */
        if(ds<-.02&&c.spd>1)r.wrongT+=dt;else r.wrongT=Math.max(0,r.wrongT-dt*2);if(r.wrongT>1.2)R.emit({type:'wrong',r,t:R.t})}
      else r.offT=(r.offT||0)+dt;
      /* the line: lap complete (sub-frame time from the crossing fraction) */
      const lapNow=Math.floor(r.prog/T.len);
      if(lapNow>r.lap){const target=lapNow*T.len,f=clamp((target-p0)/((r.prog-p0)||1),0,1),tc=R.t-dt+f*dt;
        if(r.lap>=0){const lt=tc-r.lapStart;r.laps.push(lt);if(r.best==null||lt<r.best)r.best=lt}r.lapStart=tc;r.lap=lapNow;r.gateDone={};
        if(r.lap>=laps){r.finished=true;r.finishT=tc;r.place=R.finished.length+1;R.finished.push(r);R.emit({type:'finish',r,t:tc,place:r.place})}
        else if(r.lap>0||laps===0)R.emit({type:'lap',r,lap:r.lap,t:tc})}}};
  R.order=()=>R.racers.slice().sort((a,b)=>a.finished&&b.finished?a.finishT-b.finishT:a.finished?-1:b.finished?1:(b.dnf?0:b.prog)-(a.dnf?0:a.prog)+(a.dnf?1e6:0)-(b.dnf?1e6:0));
  R.pos=r=>R.order().indexOf(r)+1;
  R.gapTo=(a,b)=>a.prog-b.prog;
  R.lapOf=r=>clamp(r.lap+1,1,laps);
  /* AI driver: pure pursuit to a lookahead point on the racer's lane; corner speed from the turn ahead; overtakes; rubber band */
  R.ai=(r,dt,a)=>{a=a||{};const c=r.car,S=c.stats,spd=c.spd,base=r.s+line,look=2.4+Math.max(0,spd)*.42;
    /* lane: hold the chosen offset, move out to pass a slower car ahead, drift back toward the line when clear */
    r.laneT-=dt;let want=r.laneWant!=null?r.laneWant:0;
    let block=null,bd=1e9;for(const q of R.racers){if(q===r||q.finished&&!q.parked)continue;const dp=q.prog-r.prog;if(dp>0&&dp<7&&Math.abs((q.lat||0)-(r.lat||0))<1.3&&dp<bd){bd=dp;block=q}}
    if(block&&block.car.spd<spd+1.2&&r.laneT<=0){const here=T.at(base),room=here.half;const side=(block.lat||0)>0?-1:1;want=clamp((block.lat||0)+side*1.5,-room,room);r.laneWant=want;r.laneT=1.2+Math.random()*.8}
    else if(!block&&r.laneT<=0){r.laneWant=(r.home||0)*.6;r.laneT=1}
    const tp=T.at(base+look),h=Math.max(0,tp.half);let lane=clamp(r.laneWant!=null?r.laneWant:0,-h,h);r.lane+=(lane-r.lane)*Math.min(1,dt*1.6);r.lane=clamp(r.lane,-h,h);
    const tx=tp.x+tp.nx*r.lane,tz=tp.z+tp.nz*r.lane;
    const err=wrap(yawTo(tx-c.x,tz-c.z)-c.yaw);
    /* speed: top x skill x rubber band, braking for the turn ahead (the tighter, the slower) */
    const top=(a.cap||S.boostMax)*(r.skill||1);let v=top;const turn=T.turn(base+Math.max(1.5,spd*.35),7+spd*.5);
    if(turn>.25)v=Math.min(v,top*(1-clamp((turn-.25)/1.9,0,1)*.55));
    if(a.rubber&&a.player&&!a.player.finished){const d=r.prog-a.player.prog,rb=a.rubber;
      if(d>rb.ahead)v*=1-clamp((d-rb.ahead)*(rb.k||.007),0,rb.max||.14);else if(d<-rb.behind)v*=1+clamp((-d-rb.behind)*(rb.kb||.004),0,rb.maxb||.07)}
    if(a.slow)v*=a.slow(r);if(Math.abs(err)>.9)v=Math.min(v,4);
    if(block&&bd<2.6&&Math.abs(r.lane-(block.lat||0))<1)v=Math.min(v,block.car.spd);
    r.target=v;const thr=clamp((v-spd)*1.6,-1,1);
    /* stuck: back out, swing toward the line */
    /* stuck against the course (not just queued behind another mower, which only needs patience) */
    if(Math.abs(spd)<.6&&v>2&&!(block&&bd<3.2))r.stuckT+=dt;else r.stuckT=Math.max(0,r.stuckT-dt);
    if(r.stuckT>1.4){r.revT=.9;r.stuckT=0}
    if(r.revT>0){r.revT-=dt;return{thr:-1,st:-clamp(err*2,-1,1),boost:false,hb:false}}
    return{thr,st:clamp(err*2.4,-1,1),boost:v>S.maxSpeed+.05,hb:false}};
  return R}
HT.Race={track,make,smooth};
if(typeof module!=='undefined'&&module.exports)module.exports=HT.Race;
})(typeof window!=='undefined'?window:globalThis);
