/* =====================================================================
   HT.Convoy [CONVOY] (SPEC3 4.2): AI cars following a leader in a line. Pure logic (no THREE, no DOM): browser + Node.
   Owner: Minivan Roundup (js/jobs/roundup.js, which loads this file). Later users: Everybody Waves (the families drive the vans
   in), Cone Zone (a convoy to stop), Suds Up (the car queue).

   const C = HT.Convoy.create({gap:'normal'})             gap: 'tight' | 'normal' | 'spread' (bumper to bumper 6 / 9 / 14 m)
   C.leader(obj)                     obj = {x,z,yaw,spd,len} read live every tick (keep the same object and move it): the player's car
   const m = C.add(car, {id, join, name})   car = an HT.CarAI car (x,z,yaw,spd,stats,hp). join: a polyline [{x,z}] it drives first
                                     (out of a parking bay to the gate); it waits at its bay until its predecessor is past the join's end.
   const ev = C.tick(dt, ctx)        ctx = {collide(m)->fn(p,r), canSnap(m)->bool, stop(m)->metres to a line it must stop at | null,
                                     others:[{x,z,yaw,spd,len,w}] (the player's car when it isn't leading, a pursuer, cross traffic),
                                     bridge(m,{x,z})->[{x,z}] (a road route when the trail is gone), rnd}
        -> {bumps:[{a,b,vn,dmg}], hits:[{m,speed,front}], changed:[m]}   (bumps between convoy cars; hits on walls; state changes)
   C.order(kind)                     'tight' 'normal' 'spread' (the gap), 'hold' / 'go' (everyone stops where they are / carries on)
   C.setLead(m, route)               m takes the lead along route (the player drops back to sweep); C.leader(obj) again ends it
   C.chain()                         [lead entity, ...cars in line]; m.st: 'park' 'join' 'line' 'lag' 'wait' 'hold' 'head' 'out'
   C.save() / C.load(s)              JSON-safe ([CP]): order, gap, states, poses, hp (trails are rebuilt)

   Each car (leader included) drops a breadcrumb every 2 m. A follower drives the crumbs of the car in front of it, from the one
   nearest to it up to that car's bumper, and sets its speed from the gap along that trail: the car in front's speed as it was a
   moment ago (dad reaction time, 0.45 s) plus a pull toward the wanted gap. Followers brake like dads (13 m/s², not the 24 a
   minivan can), so a tight gap and a hard stop ends in a bump. More than 40 m behind for 8 s and a car pulls over with its hazards
   on and waits for you to come back for it (the job decides what "lost" costs).
   Conventions as index.html: yaw 0 faces -z, forward = (-sin yaw, -cos yaw). Metres, m/s, seconds (all from the dt passed in).
   ===================================================================== */
(function(root){'use strict';
const HT=root.HT=root.HT||{};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const fwd=y=>[-Math.sin(y),-Math.cos(y)],yawTo=(dx,dz)=>Math.atan2(-dx,-dz),hyp=Math.hypot;

/* ---------------- tuning ---------------- */
const K={
  gaps:{tight:6,normal:9,spread:14},   /* bumper to bumper, metres */
  crumb:2,keep:160,                   /* a crumb every 2 m, the last 160 kept (320 m of trail) */
  react:.45,                          /* the car in front's speed, as the follower saw it this long ago */
  kp:.85,                             /* m/s of extra speed per metre of gap error */
  max:15.5,lagMax:19,                 /* cruising cap / catching-up cap (m/s) */
  dadBrake:13,                        /* a follower's brakes (m/s²): softer than the 24 a minivan has, so tight + hard stop = bump */
  turnSpeed:7.2,                      /* corner speed on the trail */
  wait:40,waitT:8,                    /* lost: more than 40 m of trail behind for 8 s -> pull over and wait */
  resume:24,                          /* a waiting car rejoins when the car it follows is this close */
  bridgeD:7,bridgeT:1.5,              /* off the trail by more than this: drive a road route to the car in front (re-planned every 1.5 s) */
  stopDec:7,                          /* decel used to brake for a stop line or something in the lane */
  laneW:2.3,look:14,                  /* "something in my lane": within 2.3 m to the side and 14 m ahead */
  headCruise:11,headSlack:16,headWaitD:34, /* a van in the lead: cruise, slow when the line stretches by 16 m, stop past 34 m */
  bumpMin:2.6,bumpK:2.0,              /* convoy-on-convoy contacts: damage (vn - 2.2) * 2.6 hp to each car */
  joinSpeed:6,bridgeStraight:30       /* pulling out of a bay on rails; a gap to the car in front shorter than this is driven straight */
};

/* ---------------- polyline helpers ---------------- */
function segProj(A,B,x,z){const dx=B.x-A.x,dz=B.z-A.z,L2=dx*dx+dz*dz||1e-9,t=clamp(((x-A.x)*dx+(z-A.z)*dz)/L2,0,1),px=A.x+dx*t,pz=A.z+dz*t;return{t,px,pz,d:hyp(x-px,z-pz),L:Math.sqrt(L2)}}
/* nearest point on pts to (x,z): {i (segment start), t, d, s (arc length from pts[0])} */
function nearest(pts,x,z,i0,i1){let best=null,s=0;const n=pts.length;if(n<2)return n?{i:0,t:0,d:hyp(pts[0].x-x,pts[0].z-z),s:0,px:pts[0].x,pz:pts[0].z}:null;
  i0=Math.max(0,i0||0);i1=Math.min(n-2,i1==null?n-2:i1);for(let i=0;i<i0;i++)s+=hyp(pts[i+1].x-pts[i].x,pts[i+1].z-pts[i].z);
  for(let i=i0;i<=i1;i++){const r=segProj(pts[i],pts[i+1],x,z);if(!best||r.d<best.d-1e-6)best={i,t:r.t,d:r.d,s:s+r.t*r.L,px:r.px,pz:r.pz};s+=r.L}return best}
/* a rounded polyline with arc length (corners filleted by two Chaikin passes): {len, at(s)->{x,z,yaw}} */
function railPath(raw){let P=raw.map(p=>({x:p.x,z:p.z}));for(let it=0;it<2;it++){const o=[P[0]];for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1];o.push({x:a.x*.75+b.x*.25,z:a.z*.75+b.z*.25},{x:a.x*.25+b.x*.75,z:a.z*.25+b.z*.75})}o.push(P[P.length-1]);P=o}
  const cum=[0];for(let i=1;i<P.length;i++)cum.push(cum[i-1]+hyp(P[i].x-P[i-1].x,P[i].z-P[i-1].z));const len=cum[cum.length-1];
  const pt=s=>{s=clamp(s,0,len);let i=0;while(i<cum.length-2&&cum[i+1]<s)i++;const A=P[i],B=P[i+1]||A,L=(cum[i+1]-cum[i])||1,t=(s-cum[i])/L;return{x:A.x+(B.x-A.x)*t,z:A.z+(B.z-A.z)*t}};
  return{pts:P,len,at:s=>{const q=pt(s),a=pt(s-1),b=pt(s+1);return{x:q.x,z:q.z,yaw:yawTo(b.x-a.x,b.z-a.z)}}}}
function arcLen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=hyp(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z);return s}
/* the turn ahead on a path within d metres: -1 right, 1 left, 0 none (positive yaw change = left) */
function turnAhead(pts,from,d){let s=0,y0=null;for(let i=Math.max(1,from);i<pts.length;i++){const a=pts[i-1],b=pts[i],L=hyp(b.x-a.x,b.z-a.z);if(L<.2)continue;const y=yawTo(b.x-a.x,b.z-a.z);
    if(y0==null)y0=y;else{const dy=wrap(y-y0);if(Math.abs(dy)>.5)return dy>0?1:-1}s+=L;if(s>d)break}return 0}
/* the sharpest bend within d metres along pts (from index i): the heading change over any 8 m window, radians */
function bendAhead(pts,from,d){const H=[];let s=0;for(let i=Math.max(1,from);i<pts.length;i++){const a=pts[i-1],b=pts[i],L=hyp(b.x-a.x,b.z-a.z);if(L<.2)continue;H.push({s,y:yawTo(b.x-a.x,b.z-a.z)});s+=L;if(s>d)break}
  let mx=0;for(let i=0;i<H.length;i++)for(let j=i+1;j<H.length&&H[j].s-H[i].s<=8;j++)mx=Math.max(mx,Math.abs(wrap(H[j].y-H[i].y)));return mx}
/* something in my lane ahead: the bumper gap to the nearest of others, or null */
function laneGap(me,others,look,w){const f=fwd(me.yaw);let best=null;for(const o of others){if(!o||o===me)continue;const dx=o.x-me.x,dz=o.z-me.z,a=dx*f[0]+dz*f[1];if(a<=0||a>look)continue;
  const side=Math.abs(-dx*f[1]+dz*f[0]);if(side>(o.w||w))continue;const g=a-((me.len||4.4)+(o.len||4.4))/2;
  /* how fast it's moving away along my heading: brake for the closing speed, not its whole presence */
  const of=o.yaw!=null?fwd(o.yaw):[0,0],va=Math.max(0,(o.spd||0)*(of[0]*f[0]+of[1]*f[1]));if(best==null||g<best.g)best={g,va,o}}return best}

/* drive in the tracks: speed eases toward v (accel / dad brakes), the car moves by arc length along pts from its own projection on
   them, and settles onto the line (a car that was knocked off it rejoins within a second); heading follows the path's chord */
function pointAt(pts,s){let i=0;for(;i<pts.length-1;i++){const L=hyp(pts[i+1].x-pts[i].x,pts[i+1].z-pts[i].z);if(s<=L||i===pts.length-2){const t=L>1e-6?clamp(s/L,0,1):0;return{x:pts[i].x+(pts[i+1].x-pts[i].x)*t,z:pts[i].z+(pts[i+1].z-pts[i].z)*t}}s-=L}return{x:pts[pts.length-1].x,z:pts[pts.length-1].z}}
function slide(c,pts,v,dt){const S=c.stats||{},acc=S.accel||9,brk=Math.min(S.brake||13,K.dadBrake);
  if(c.spd<v)c.spd=Math.min(v,c.spd+acc*dt);else c.spd=Math.max(v,c.spd-brk*dt);if(c.spd<0)c.spd=0;
  const nr=nearest(pts,c.x,c.z,0,Math.min(pts.length-2,6));if(!nr)return;const total=arcLen(pts),s=Math.min(total,nr.s+c.spd*dt);
  if(nr.s+c.spd*dt>total)c.spd=Math.max(0,(total-nr.s)/Math.max(dt,1e-3));
  const q=pointAt(pts,s),a=pointAt(pts,Math.max(0,s-1.8)),b=pointAt(pts,Math.min(total,s+1.8));
  const k=nr.d<.08?1:Math.min(1,dt*2.4);c.x+=(q.x-c.x)*(nr.d<.08?1:1)-(q.x-c.x)*(1-k)*Math.min(1,nr.d/3);c.z+=(q.z-c.z)-(q.z-c.z)*(1-k)*Math.min(1,nr.d/3);
  if(hyp(b.x-a.x,b.z-a.z)>.3&&c.spd>.05){const y0=c.yaw,want=yawTo(b.x-a.x,b.z-a.z);c.yaw+=wrap(want-c.yaw)*Math.min(1,dt*7);c.steer=clamp(wrap(c.yaw-y0)/Math.max(dt,1e-3)*.45,-1,1)}else c.steer*=.8;
  const f=fwd(c.yaw);c.vdx=f[0];c.vdz=f[1];c.t=(c.t||0)+dt}
function create(o){o=o||{};const k=Object.assign({},K,o.K||{});
  const C={K:k,cars:[],lead:null,head:null,gap:o.gap||'normal',holding:false,t:0,ev:null};
  const ent=(obj,id)=>({id,car:obj,crumbs:[{x:obj.x,z:obj.z}],hist:[],ah:{p:null,h:[]},st:'line',lagT:0,signal:0,bridge:null,bridgeT:0,len:obj.len||(obj.stats&&obj.stats.len)||4.4});
  C.leader=obj=>{if(C.head){const h=C.head;h.st='line';h.route=null;C.head=null}
    if(!C.lead||C.lead.car!==obj){C.lead=ent(obj,'lead')}return C.lead};
  C.add=(car,opt)=>{opt=opt||{};const m=ent(car,opt.id||'car'+C.cars.length);m.name=opt.name||m.id;m.join=opt.join?opt.join.map(p=>({x:p.x,z:p.z})):null;m.st=m.join?'park':'line';
    /* dad brakes */if(car.stats&&!car.stats.__dad){car.stats=Object.assign({},car.stats,{brake:Math.min(car.stats.brake,k.dadBrake),__dad:true})}
    C.cars.push(m);return m};
  C.remove=m=>{const i=C.cars.indexOf(m);if(i>=0)C.cars.splice(i,1);if(C.head===m)C.head=null};
  C.chain=()=>{const live=C.cars.filter(m=>m.st!=='out');if(C.head)return[C.head,...live.filter(m=>m!==C.head)];return C.lead?[C.lead,...live]:live};
  C.pred=m=>{const ch=C.chain(),i=ch.indexOf(m);return i>0?ch[i-1]:null};
  C.gapM=()=>k.gaps[C.gap]||k.gaps.normal;
  C.order=kind=>{if(kind==='hold'){C.holding=true;for(const m of C.cars)if(m.st==='line'||m.st==='lag')m.st='hold'}
    else if(kind==='go'){C.holding=false;for(const m of C.cars)if(m.st==='hold')m.st='line'}
    else if(k.gaps[kind])C.gap=kind;return C};
  C.setLead=(m,route)=>{if(!m||m.st==='out')return false;const i=C.cars.indexOf(m);if(i<0)return false;
    /* the new head goes to the front of the list; the rest keep their order */C.cars.splice(i,1);C.cars.unshift(m);C.head=m;m.st='head';m.route=route.map(p=>({x:p.x,z:p.z}));m.bridge=null;return true};
  C.headRoute=route=>{if(C.head)C.head.route=route.map(p=>({x:p.x,z:p.z}))};

  /* the trail a follower drives: its predecessor's crumbs from the one nearest to it up to the predecessor itself */
  /* (everyone drives the head's trail when they and the car in front are on it, so corner cuts don't add up down the line) */
  const near=(cr,x,z)=>{let j=0,bd=Infinity;for(let i=0;i<cr.length;i++){const d=(cr[i].x-x)**2+(cr[i].z-z)**2;if(d<bd){bd=d;j=i}}return{j,d:Math.sqrt(bd)}};
  function trail(m,p){const c=m.car,o=C.chain()[0];let pts=null,bd;
    if(o&&o!==p&&o!==m&&o.crumbs.length>2){const a=near(o.crumbs,c.x,c.z),b=near(o.crumbs,p.car.x,p.car.z);
      if(a.d<k.bridgeD&&b.d<2.6&&b.j>=a.j){pts=o.crumbs.slice(Math.max(0,a.j-1),b.j+1);bd=a.d}}
    if(!pts){const q=near(p.crumbs,c.x,c.z);pts=p.crumbs.slice(Math.max(0,q.j-1));bd=q.d}
    pts.push({x:p.car.x,z:p.car.z});const nr=nearest(pts,c.x,c.z,0,Math.min(pts.length-2,3));
    /* behind the trail's first crumb (the line is just forming): the way to it counts too, and it's on the trail as long as it's behind it */
    const before=nr&&nr.i===0&&nr.t<=1e-6;const arc=nr?arcLen(pts)-nr.s+(before?nr.d:0):hyp(p.car.x-c.x,p.car.z-c.z);
    if(before)pts.unshift({x:c.x,z:c.z});
    return{pts,off:nr?(before?0:nr.d):bd,arc,i:nr?nr.i:0}}
  const speedOf=(e,lag)=>{const h=e.hist;if(!h.length)return Math.max(0,e.car.spd||0);let t=0;for(let i=h.length-1;i>=0;i--){t+=h[i].dt;if(t>=lag)return h[i].v}return h[0].v};
  function crumb(e){const c=e.car,cr=e.crumbs,L=cr[cr.length-1];if(!L||hyp(c.x-L.x,c.z-L.z)>=k.crumb){cr.push({x:c.x,z:c.z});if(cr.length>k.keep)cr.shift()}}
  function record(e,dt){e.hist.push({dt,v:Math.max(0,e.car.spd||0)});let t=0;for(let i=e.hist.length-1;i>=0;i--){t+=e.hist[i].dt;if(t>k.react+.3){e.hist.splice(0,i);break}}crumb(e)}
  C.speedOf=speedOf;

  C.tick=(dt,ctx)=>{ctx=ctx||{};C.t+=dt;const CA=HT.CarAI,ev={bumps:[],hits:[],changed:[]};if(!CA)return ev;
    if(C.lead)record(C.lead,dt);
    const ch=C.chain(),gap=C.gapM();
    const all=ch.map(e=>e.car);
    for(const m of C.cars){const c=m.car,st0=m.st;if(m.st==='out'){c.spd=Math.max(0,c.spd-k.dadBrake*dt);continue}
      const i=ch.indexOf(m),p=i>0?ch[i-1]:null;let v=0,pts=null;
      /* yield to everything outside the line, and to the cars ahead in it; never to your own followers (they yield to you) */
      const others=(ctx.others||[]).concat(i>0?ch.slice(0,i).map(e=>e.car).filter(x=>x!==c):[]).concat(C.cars.filter(e=>e.st==='park').map(e=>e.car).filter(x=>x!==c));/* (a wrecked car rolls to the kerb: not in the lane) */
      if(m.st==='head'){/* in the lead: the route home, at a convoy pace, waiting for the line */
        pts=m.route&&m.route.length>1?m.route:[{x:c.x,z:c.z},{x:c.x+fwd(c.yaw)[0],z:c.z+fwd(c.yaw)[1]}];v=k.headCruise;
        /* pace the whole line: the worst stretch between any two rolling cars behind */
        let worst=0;for(let q=1;q<ch.length;q++){const a=ch[q-1],b=ch[q];if(b.st==='wait'||b.st==='park'||b.st==='join'||b.st==='out')break;worst=Math.max(worst,hyp(a.car.x-b.car.x,a.car.z-b.car.z)-(a.len+b.len)/2-gap)}
        if(worst>k.headWaitD)v=0;else if(worst>k.headSlack)v=k.headCruise*.5
        if(C.holding)v=0;const nr=nearest(pts,c.x,c.z);if(nr&&nr.i>2){m.route=pts=pts.slice(nr.i)}}
      else if(m.st==='park'){/* in its bay, engine running: go when the car in front is past the join's end */
        v=0;pts=m.join;const e=m.join[m.join.length-1];if(!p||p.st==='park'||p.st==='join'){/* wait */}
        else{/* the car in front must have actually been past the end of the rail (its trail goes through it), and be a gap beyond it */
          const pd=hyp(p.car.x-e.x,p.car.z-e.z),been=p.crumbs.some(q=>hyp(q.x-e.x,q.z-e.z)<4.5),ok=been&&(p===C.lead?pd>gap+3:pd>gap+m.len);if(ok&&!C.holding){m.st='join'}}}
      if(m.st==='join'){/* out of the bay on rails: the join path is authored and checked clear, and a parking lot is no place for an AI to improvise */
        const J=m.jp||(m.jp=railPath(m.join));let vj=Math.min(k.joinSpeed,(m.jv||0)+3*dt);const g=laneGap(c,others,k.look,k.laneW);if(g!=null)vj=Math.min(vj,g.va+Math.sqrt(Math.max(0,2*k.stopDec*(g.g-1.4))));
        const left=J.len-(m.js||0);vj=Math.max(0,vj);m.jv=vj;m.js=Math.min(J.len,(m.js||0)+vj*dt);const q=J.at(m.js);const y0=c.yaw;c.x=q.x;c.z=q.z;c.yaw=q.yaw;c.spd=vj;c.steer=clamp(wrap(c.yaw-y0)/Math.max(dt,1e-3)*.4,-1,1);
        m.want=vj;m.signal=turnAhead(m.join,1,10);record(m,dt);if(left<.3){m.st='line';m.lagT=0;m.jp=null;if(c.ai)c.ai=null;ev.changed.push(m)}else{if(m.st!==st0)ev.changed.push(m);continue}}
      if((m.st==='line'||m.st==='lag'||m.st==='hold'||m.st==='wait')&&p){
        const tr=trail(m,p),want=gap+(p.len+m.len)/2;
        if(tr.off>k.bridgeD){m.bridgeT-=dt;if(!m.bridge||m.bridgeT<=0){m.bridgeT=k.bridgeT;const d=hyp(p.car.x-c.x,p.car.z-c.z);/* close: just drive over to it; far: the roads */
            m.bridge=d<k.bridgeStraight||!ctx.bridge?[{x:c.x,z:c.z},{x:p.car.x,z:p.car.z}]:ctx.bridge(m,{x:p.car.x,z:p.car.z})}pts=m.bridge&&m.bridge.length>1?m.bridge:tr.pts}
        else{m.bridge=null;pts=tr.pts}
        const arc=pts===tr.pts?tr.arc:arcLen(pts)+0,vp=speedOf(p,k.react);
        /* a dad sees the gap a moment late too: where the car in front was react seconds ago, carried on at the speed he saw then */
        if(m.ah.p!==p){m.ah={p,h:[]}}const H=m.ah.h;H.push({dt,arc,d:Math.max(0,c.spd)*dt});let tt=0,dme=0,old=arc;for(let q=H.length-1;q>=0;q--){tt+=H[q].dt;if(tt>=k.react){old=H[q].arc;break}dme+=H[q].d}
        if(tt>k.react+.4)H.splice(0,1);const seen=Math.min(arc+2,old+vp*Math.min(tt,k.react)-dme),e=seen-want;
        v=vp+k.kp*e;if(e<-1.5)v=Math.min(v,0);v=clamp(v,0,e>20?k.lagMax:k.max);
        /* lost: far behind for a while -> pull over and wait */
        if(m.st==='wait'){v=0;const L_=C.lead&&C.lead.car;/* the car it follows comes back, or you do: it rejoins (a road route if the trail's gone) */if(hyp(p.car.x-c.x,p.car.z-c.z)<k.resume+want||L_&&hyp(L_.x-c.x,L_.z-c.z)<k.resume*.75){m.st='line';m.lagT=0}}
        else if(m.st==='hold'){v=0}
        else{const stopped=ctx.stop&&ctx.stop(m)!=null&&c.spd<1;if(arc>k.wait+want&&!stopped)m.lagT+=dt;else m.lagT=Math.max(0,m.lagT-dt*2);m.st=arc>k.wait*.6+want?'lag':'line';if(m.lagT>=k.waitT){m.st='wait';m.lagT=0;v=0}}}
      else if(m.st!=='head'&&m.st!=='park'&&m.st!=='join'){v=0}
      /* stop lines (red lights, the job's own holds) and anything in the lane */
      m.lim=v.toFixed(1);if(ctx.stop&&m.st!=='park'){const d=ctx.stop(m);if(d!=null){v=Math.min(v,Math.sqrt(Math.max(0,2*k.stopDec*(d-.6))));m.lim+=' stop'+d.toFixed(1)}}
      if(m.st!=='park'){const g=laneGap(c,p?others.filter(x=>x!==p.car):others,k.look,k.laneW);if(g!=null){v=Math.min(v,g.va+Math.sqrt(Math.max(0,2*k.stopDec*(g.g-1.2))));m.lim+=' gap'+g.g.toFixed(1)+'@'+(g.o.rid||(g.o.x.toFixed(0)+','+g.o.z.toFixed(0)))}}
      /* bends on the trail: crumbs every 2 m hide a corner from HT.CarAI's per-segment check, so slow for it here */
      if(pts&&pts.length>2&&m.st!=='park'){const b=bendAhead(pts,1,Math.max(10,c.spd*1.4));if(b>.45)v=Math.min(v,Math.max(k.turnSpeed*(1.25-b*.35),4.5))}
      m.want=v;m.signal=pts?turnAhead(pts,1,16):0;
      if(!pts||pts.length<2){c.spd=Math.max(0,c.spd-k.dadBrake*dt);record(m,dt);continue}
      slide(c,pts,v,dt);
      record(m,dt);if(m.st!==st0)ev.changed.push(m)}
    /* contacts between convoy cars (and the lead car, if it's a car): push apart, dent both */
    const ents=C.cars.filter(m=>m.st!=='park');if(C.lead&&C.lead.car.stats)ents.push(C.lead);
    for(let a=0;a<ents.length;a++)for(let b=a+1;b<ents.length;b++){const A_=ents[a].car,B_=ents[b].car;if(hyp(A_.x-B_.x,A_.z-B_.z)>6)continue;
      const fa=fwd(A_.yaw),ahead=(B_.x-A_.x)*fa[0]+(B_.z-A_.z)*fa[1]>0;const rear=ahead?A_:B_,front=ahead?B_:A_;
      const h1=rear.hp,h2=front.hp;const r=CA.ram(rear,front);if(!r)continue;rear.hp=h1;front.hp=h2;
      if(r.vn>k.bumpMin){const dmg=(r.vn-k.bumpMin)*k.bumpK;ev.bumps.push({a:ents.find(e=>e.car===rear),b:ents.find(e=>e.car===front),vn:r.vn,dmg})}}
    C.ev=ev;return ev};

  C.save=()=>({gap:C.gap,holding:C.holding,head:C.head?C.head.id:null,cars:C.cars.map(m=>({id:m.id,st:m.st==='lag'||m.st==='wait'||m.st==='hold'?'line':m.st,x:+m.car.x.toFixed(2),z:+m.car.z.toFixed(2),yaw:+m.car.yaw.toFixed(3),hp:+(+m.car.hp).toFixed(1)}))});
  C.load=s=>{if(!s)return;C.gap=s.gap||'normal';C.holding=!!s.holding;const by={};for(const m of C.cars)by[m.id]=m;const ord=[];
    for(const r of s.cars||[]){const m=by[r.id];if(!m)continue;Object.assign(m.car,{x:r.x,z:r.z,yaw:r.yaw,spd:0,hp:r.hp});m.st=r.st==='head'?'line':r.st;m.crumbs=[{x:r.x,z:r.z}];m.hist=[];m.lagT=0;m.bridge=null;if(m.car.ai)m.car.ai=null;ord.push(m)}
    for(const m of C.cars)if(!ord.includes(m))ord.push(m);C.cars=ord;C.head=null;if(C.holding)for(const m of C.cars)if(m.st==='line')m.st='hold'};
  return C}

HT.Convoy={create,K,nearest,arcLen,railPath,turnAhead,bendAhead,laneGap,fwd,yawTo,wrap};
if(typeof module!=='undefined'&&module.exports)module.exports=HT.Convoy;
})(typeof window!=='undefined'?window:globalThis);
