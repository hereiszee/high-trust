/* =====================================================================
   HT.Stealth: detection for the stealth jobs (SPEC3 4.1 [STEALTH]). Owned by the Sign of the Times worker; loaded by js/jobs/sabotage.js
   and reusable by any job (Good Fences, Minivan Roundup, Exhibit HOA, Grand Opening).

   Pure core (no THREE, no DOM; dev/stealth.test.js runs it in Node):
     const S=HT.Stealth.create({night:true, diff:1});
     S.addObserver({id, kind:'guard'|'dog'|'camera'|'lookout'|'civilian', pos:{x,z}, yaw, lamp, ear, sight, R, half, mul, eye});
         pos/yaw are read live every tick (keep the same object and move it). yaw: character convention, forward = (sin yaw, cos yaw).
         lamp:true = a flashlight: a long narrow cone (26 m, 25 deg) in which the player counts as lit. sight:false = hearing only (the dog).
     S.occluder({x0,z0,x1,z1,h})        boxes that block sight (and light) below height h: walls, trucks, crates. A sight line from the eye
                                        (1.65 m) to the target's chest (1.45 standing, 0.9 crouched) is blocked where it passes under h.
     S.light({x,y,z,r,i,yaw,half})      a light (floodlight, lamp): the light factor at a point is i inside r (and its cone), unless an occluder
                                        shadows it; S.lightAt(x,z,y,base) = max(base, every unshadowed light)
     S.noise({x,z,r,kind,player,stance,not,only})  a noise this tick (footstep, hiss, drill, a tossed treat...); not/only: an observer kind it skips / is only for
     Each observer keeps .cause: what last raised his suspicion ('sight', the noise's kind, or poke's cause)
     const out=S.tick(dt,{x,z,stance:'stand'|'crouch'|'sprint'|'carry', lit:0..1, hidden:false})
         -> [{id, sus:0..1, state:'calm'|'curious'|'searching'|'alerted'|'cuffed', lkp:{x,z}|null, v (how well he sees you now), changed}]
     S.state(id) S.get(id) S.max() S.maxObs() S.on(ev,fn) ('state','alert','heard','bark','spread') S.poke(id,x,z,amount,cause) (send someone to look) S.probe(p) (what they'd see at p, no side effects)
     S.canTakedown(id,player) S.takedown(id) (a silent zip-tie from behind) S.release() (stealth over: HT.AI takes back its own sight)
     S.calm(t) (nobody fills for t seconds: after a checkpoint restore) S.export()/S.import() (checkpoint state)
   Thresholds: 0.35 curious (stops, turns his head) · 0.6 searching (walks to the last known position) · 1.0 alerted (he has seen you).
   Hearing alone tops out at 0.95: a noise sends someone to look, only his eyes can make him sure.

   Browser glue (needs THREE): HT.Stealth.viz(S,{THREE,parent,paths}) -> {update(dt,o), dispose()}: the vision cones on the ground, clipped by the
     occluders and coloured by state; flashlight beams with a pool where they land; patrol paths and noise rings (bright with the goggles).
   HT.Stealth.hud(S,{project}) -> {update(dt,o), dispose()}: "?"/"!" over heads, screen-edge chevrons for observers you can't see, and the
     visibility gem (how lit and loud you are). The detection eye is a 'ring' meter the job adds to F.meters (S.max()).
   System hooks (registered once): JH.noise feeds every live session; JH.perceive sets e.ai.blind for HT.AI enemies registered with
     S.bindEnemy(e,id) until S.release(); HUD 'gadget' taps toggle the flashlight and goggles on touch.
   ===================================================================== */
(function(root){'use strict';
const HT=root.HT=root.HT||{};
if(HT.Stealth&&HT.Stealth.ready)return;
const D2R=Math.PI/180,clamp=(v,a,b)=>v<a?a:v>b?b:v,hyp=Math.hypot,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};

/* ---------------- tuning (SPEC3 4.1, tuned on Sign of the Times) ---------------- */
const T={
  R:{day:24,night:14},                 /* view range */
  flash:{R:26,half:25*D2R},            /* a flashlight cone: longer, narrower, and you're lit inside it */
  half:{calm:50*D2R,curious:60*D2R,searching:70*D2R,alerted:110*D2R},
  per:{band:25*D2R,mul:.35},           /* peripheral band beyond the cone */
  near:6,far:.25,                      /* distance falloff: 1 within 6 m, linear down to 0.25 at the range */
  stance:{stand:1,crouch:.55,sprint:1.3,carry:1.25},
  fill:.9,close:1.5,closeR:6,          /* fill rate per second x the factors; x1.5 within 6 m */
  th:{curious:.35,searching:.6,alerted:1},
  decay:.12,hold:2.5,floor:.3,floorT:20,
  hear:{near:.6,far:.35,cap:.95},      /* a noise heard within r: +0.35, within r/2: +0.6; hearing alone never alerts */
  dog:{crouch:4,stand:12,carry:12,run:16,sprint:18,ear:1.8},
  take:{r:1.3,ang:120*D2R,hold:2,sus:.35},
  cam:{sweep:30*D2R,rate:12*D2R,R:18,mul:1.2},
  spread:1.5,losT:.1,
  h:{eye:1.65,stand:1.45,crouch:.9,sprint:1.45,carry:1.45}};

function create(o){o=o||{};const obs=[],occ=[],lights=[],noises=[],ev={};let t=0,calmT=0,released=false;
  const S={T,obs,occ,lights,get night(){return!!o.night},set night(v){o.night=!!v},get released(){return released},get t(){return t}};
  const emit=(e,...a)=>{for(const f of(ev[e]||[]).slice())try{f(...a)}catch(err){try{console.warn('[stealth]',err)}catch(_){}}};
  S.on=(e,f)=>{(ev[e]||(ev[e]=[])).push(f);return()=>{const a=ev[e],k=a?a.indexOf(f):-1;if(k>=0)a.splice(k,1)}};
  S.addObserver=d=>{const b=Object.assign({kind:'guard',yaw:0,ear:1,sight:true,lamp:false,mul:1,eye:T.h.eye},d||{});
    b.pos=b.pos||{x:0,z:0};b.sus=b.sus||0;b.state='calm';b.lkp=null;b.seenT=99;b.floorUntil=-1;b.v=0;b.losT=-1;b.losV=false;b.alertAt=-1;b.spreadDone=false;b.off=false;b.heardT=-9;
    if(b.kind==='dog'){b.sight=false;b.ear=b.ear===1?T.dog.ear:b.ear}if(b.kind==='camera'){b.R=b.R||T.cam.R;b.mul=b.mul===1?T.cam.mul:b.mul;b.base=b.yaw}
    obs.push(b);return b};
  S.remove=id=>{const k=obs.findIndex(b=>b.id===id);if(k>=0)obs.splice(k,1)};
  S.get=id=>obs.find(b=>b.id===id)||null;
  S.state=id=>{const b=S.get(id);return b?b.state:null};
  S.occluder=b=>{occ.push(Object.assign({h:3},b));return b};
  S.clearOccluders=()=>{occ.length=0};
  S.light=l=>{lights.push(Object.assign({y:3,r:8,i:.9},l));return l};
  S.noise=n=>{if(n&&isFinite(n.x)&&isFinite(n.z)&&n.r>0)noises.push(n)};
  S.calm=s=>{calmT=Math.max(calmT,s||0)};
  /* sight line from (ax,az, height ha) to (bx,bz, height hb): blocked where it passes under an occluder's top */
  S.blocked=(ax,az,ha,bx,bz,hb)=>{const dx=bx-ax,dz=bz-az;
    for(const b of occ){let t0=0,t1=1,ok=true;
      for(let q=0;q<2&&ok;q++){const p=q?az:ax,d=q?dz:dx,lo=q?b.z0:b.x0,hi=q?b.z1:b.x1;
        if(Math.abs(d)<1e-9){if(p<=lo||p>=hi)ok=false}else{let u0=(lo-p)/d,u1=(hi-p)/d;if(u0>u1){const w=u0;u0=u1;u1=w}if(u0>t0)t0=u0;if(u1<t1)t1=u1;if(t0>=t1)ok=false}}
      if(!ok)continue;const h0=ha+(hb-ha)*t0,h1=ha+(hb-ha)*t1;if(Math.min(h0,h1)<b.h)return true}
    return false};
  /* ray from (x,z) along (dx,dz) unit: the distance to the first occluder taller than h, up to max (the cone fans use it) */
  S.ray=(x,z,dx,dz,max,h)=>{let best=max;for(const b of occ){if(b.h<(h||1.2))continue;let t0=0,t1=best,ok=true;
      for(let q=0;q<2&&ok;q++){const p=q?z:x,d=q?dz:dx,lo=q?b.z0:b.x0,hi=q?b.z1:b.x1;
        if(Math.abs(d)<1e-9){if(p<=lo||p>=hi)ok=false}else{let u0=(lo-p)/d,u1=(hi-p)/d;if(u0>u1){const w=u0;u0=u1;u1=w}if(u0>t0)t0=u0;if(u1<t1)t1=u1;if(t0>=t1)ok=false}}
      if(ok&&t0>0&&t0<best)best=t0}return best};
  /* the light factor at a point: base (the game's nightLight) or a light that reaches it unshadowed */
  S.lightAt=(x,z,y,base)=>{let v=base==null?(o.night?.4:1):base;const hy=y==null?1.1:y;
    for(const l of lights){if(l.on===false)continue;const d=hyp(x-l.x,z-l.z);if(d>l.r)continue;
      if(l.half!=null&&d>.5){const df=Math.abs(wrap(Math.atan2(x-l.x,z-l.z)-l.yaw));if(df>l.half)continue}
      const k=l.i*(d<l.r*.6?1:1-(d-l.r*.6)/(l.r*.4)*.35);if(k<=v)continue;if(S.blocked(l.x,l.z,l.y,x,z,hy))continue;v=k}
    return clamp(v,0,1)};
  /* how well observer b sees the player p right now (0..1, before the fill rate) */
  function sees(b,p){if(!b.sight||p.hidden)return{v:0,lit:false};const dx=p.x-b.pos.x,dz=p.z-b.pos.z,d=hyp(dx,dz);
    const yaw=b.yaw,df=d<1e-4?0:Math.abs(wrap(Math.atan2(dx,dz)-yaw));
    const R=(b.R||(o.night?T.R.night:T.R.day))*(o.sight||1),half=b.half!=null?b.half:T.half[b.state==='cuffed'?'calm':b.state]||T.half.calm;
    let cone=0,inFlash=false;
    if(d<=R){if(df<=half)cone=1;else if(df<=half+T.per.band)cone=T.per.mul}
    if(b.lamp&&o.night&&d<=T.flash.R*(o.sight||1)&&df<=T.flash.half){cone=1;inFlash=true}
    if(!cone)return{v:0,lit:false};
    /* line of sight, cached for 0.1 s per observer */
    if(t-b.losT>=T.losT||b.losP===undefined||Math.abs(b.losP-(p.x*31+p.z))>.4){b.losT=t;b.losP=p.x*31+p.z;b.losV=!S.blocked(b.pos.x,b.pos.z,b.eye,p.x,p.z,T.h[p.stance]||T.h.stand)}
    if(!b.losV)return{v:0,lit:false};
    const Rr=inFlash?Math.max(R,T.flash.R*(o.sight||1)):R,df_=d<=T.near?1:1-(d-T.near)/Math.max(.01,Rr-T.near)*(1-T.far);
    const st=T.stance[p.stance]||1,li=inFlash||p.lit==null?1:clamp(p.lit,0,1);
    return{v:cone*clamp(df_,T.far,1)*st*li,lit:inFlash,d}}
  const stOf=s=>s>=T.th.alerted?'alerted':s>=T.th.searching?'searching':s>=T.th.curious?'curious':'calm';
  function setState(b,next){if(b.state===next)return false;const prev=b.state;b.state=next;if(next==='searching'||next==='alerted')b.floorUntil=t+T.floorT;
    if(next==='alerted'){b.alertAt=t;b.spreadDone=false;emit('alert',b)}emit('state',b,prev,next);return true}
  /* hearing: dogs hear footsteps by stance (12 m walking, 4 m crouched), everyone else by the noise's radius x his ear */
  function hear(b,n){if(n.not&&n.not===b.kind||n.only&&n.only!==b.kind)return false;let r=n.r*(b.ear||1);
    if(b.kind==='dog'&&n.player&&n.kind==='step')r=T.dog[n.stance||(n.r<=1.2?'crouch':n.r<=3?'stand':n.r<=7.5?'run':'sprint')]||n.r*T.dog.ear;
    const d=hyp(n.x-b.pos.x,n.z-b.pos.z);if(d>r)return false;const add=d<=r*.5?T.hear.near:T.hear.far;
    const cap=b.state==='alerted'?1:T.hear.cap;const before=b.sus;b.sus=Math.min(cap,Math.max(b.sus,Math.min(cap,b.sus+add)));
    b.lkp={x:n.x,z:n.z};b.seenT=Math.min(b.seenT,0);b.heardT=t;if(b.sus>before)b.cause=n.kind||'noise';emit('heard',b,n,before);if(b.kind==='dog')emit('bark',b,n);return true}
  S.tick=(dt,p)=>{t+=dt;if(calmT>0)calmT=Math.max(0,calmT-dt);const out=[];const nq=noises.splice(0);
    for(const b of obs){if(b.off){b.v=0;out.push({id:b.id,sus:0,state:b.state,lkp:null,v:0,changed:false});continue}
      if(released){out.push({id:b.id,sus:b.sus,state:b.state,lkp:b.lkp,v:0,changed:false});continue}
      if(b.kind==='camera'){b.camT=(b.camT||0)+dt;const ph=b.camT*T.cam.rate/(T.cam.sweep*2);b.yaw=b.base+T.cam.sweep*Math.sin(ph*Math.PI)}
      const prev=b.state;let v=0;
      if(p&&calmT<=0){const s=sees(b,p);v=s.v;b.d=s.d}
      b.v=v;
      if(v>0){const close=b.d!=null&&b.d<T.closeR?T.close:1;b.sus=Math.min(1,b.sus+T.fill*v*close*(b.mul||1)*(o.diff||1)*dt);b.seenT=0;b.lkp={x:p.x,z:p.z};b.cause='sight'}
      else{b.seenT+=dt;if(b.seenT>T.hold){b.sus=Math.max(0,b.sus-T.decay*dt)}if(t<b.floorUntil)b.sus=Math.max(b.sus,T.floor)}
      if(calmT<=0)for(const n of nq)hear(b,n);
      /* alerted sticks until he has lost you for good (below searching) */
      let next=stOf(b.sus);if(b.state==='alerted'&&b.sus>=T.th.searching)next='alerted';
      if(b.kind==='dog'&&next==='alerted')next='searching';
      const ch=setState(b,next);
      if(b.state==='alerted'&&!b.spreadDone&&t-b.alertAt>=T.spread){b.spreadDone=true;emit('spread',b)}
      if(b.state==='calm'&&b.sus<.05)b.lkp=null;
      out.push({id:b.id,sus:b.sus,state:b.state,lkp:b.lkp,v,changed:ch||prev!==b.state})}
    S.last=out;return out};
  /* what the observers would make of a player standing at p right now (no side effects; bots and tests use it) */
  S.probe=p=>{let m=0,who=null;for(const b of obs){if(b.off||b.sight===false)continue;const sv=b.losT,sp=b.losP,sl=b.losV;b.losT=-1;const r=sees(b,p);b.losT=sv;b.losP=sp;b.losV=sl;if(r.v>m){m=r.v;who=b}}return{v:m,who}};
  S.max=()=>{let m=0;for(const b of obs)if(!b.off&&b.sight!==false)m=Math.max(m,b.sus);return m};
  S.maxObs=()=>{let m=null;for(const b of obs)if(!b.off&&b.sight!==false&&(!m||b.sus>m.sus))m=b;return m};
  /* send someone to look at a spot (a dog barking, a radio call): sus at least to searching, lkp there */
  S.poke=(id,x,z,amount,cause)=>{const b=typeof id==='object'?id:S.get(id);if(!b||b.off)return null;b.cause=cause||'poke';b.sus=Math.min(T.hear.cap,Math.max(b.sus,amount==null?T.th.searching+.02:amount));b.lkp={x,z};b.seenT=0;setState(b,stOf(b.sus));return b};
  /* a silent zip-tie from behind: within 1.3 m, more than 120 deg off his facing, and he hasn't started to wonder */
  S.canTakedown=(id,p)=>{const b=typeof id==='object'?id:S.get(id);if(!b||b.off||b.kind==='dog'||b.kind==='camera')return false;const dx=p.x-b.pos.x,dz=p.z-b.pos.z,d=hyp(dx,dz);
    if(d>T.take.r)return false;const df=Math.abs(wrap(Math.atan2(dx,dz)-b.yaw));return df>T.take.ang&&b.sus<T.take.sus};
  S.takedown=id=>{const b=typeof id==='object'?id:S.get(id);if(!b||b.off)return false;b.off=true;b.sus=0;b.state='cuffed';emit('state',b,'calm','cuffed');return true};
  S.release=()=>{released=true;emit('release')};
  S.export=()=>obs.map(b=>({id:b.id,sus:+b.sus.toFixed(3),off:!!b.off}));
  S.import=a=>{for(const r of a||[]){const b=S.get(r.id);if(!b)continue;b.sus=r.sus||0;b.off=!!r.off;b.state=b.off?'cuffed':stOf(b.sus);b.seenT=99;b.floorUntil=-1;b.lkp=null}};
  /* HT.AI enemies: blind while stealth holds, so HT.Stealth decides what they saw */
  const bound=new Map();S.bindEnemy=(e,id)=>{bound.set(e,id);return e};S.bound=bound;
  S.dispose=()=>{obs.length=occ.length=lights.length=noises.length=0;bound.clear();for(const k in ev)delete ev[k];const i=live.indexOf(S);if(i>=0)live.splice(i,1)};
  live.push(S);return S}
const live=[];

/* ---------------- system hooks (browser): noises, HT.AI sight gating, touch gadget chips ---------------- */
function bind(){const J=HT.Jobs;if(!J||Stealth.bound)return;Stealth.bound=true;
  J.on('noise',n=>{for(const S of live)if(!S.released)S.noise(n)});
  J.on('perceive',e=>{for(const S of live){const id=S.bound.get(e);if(id==null)continue;if(!e.ai)return;e.ai.blind=!S.released&&S.state(id)!=='alerted';return}});
}
/* index.html doesn't listen for the HUD's gadget chips yet: tapping NV / Light on touch toggles them here (a job calls this with the HUD once) */
function bindHud(HUD){if(Stealth.gadgetBound||!HUD||!HUD.on)return;Stealth.gadgetBound=true;
  HUD.on('gadget',id=>{const h=root.__ht;if(!h)return;if((id==='nvg'||id==='nv'||id==='goggles')&&h.nvg)h.nvg();else if((id==='flash'||id==='flashlight'||id==='torch')&&h.flash)h.flash()})}

/* ---------------- visuals (browser, THREE) ---------------- */
const COL={calm:[.86,.9,1],curious:[1,.84,.25],searching:[1,.52,.12],alerted:[1,.16,.12],cuffed:[.5,.5,.5]};
function gradTex(THREE,kind){const c=document.createElement('canvas');c.width=128;c.height=kind==='ring'?128:8;const x=c.getContext('2d');
  if(kind==='fan'){const g=x.createLinearGradient(0,0,128,0);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.75,'rgba(255,255,255,.55)');g.addColorStop(.97,'rgba(255,255,255,.7)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,8)}
  else if(kind==='beam'){const g=x.createLinearGradient(0,0,128,0);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.45)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,8)}
  else{const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.78,'rgba(255,255,255,0)');g.addColorStop(.9,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128)}
  const t=new THREE.CanvasTexture(c);return t}
function viz(S,o){const THREE=o.THREE,par=o.parent,N=o.rays||28,own=[],grp=new THREE.Group();grp.name='stealthViz';par.add(grp);
  const fanT=gradTex(THREE,'fan'),beamT=gradTex(THREE,'beam'),ringT=gradTex(THREE,'ring');own.push(fanT,beamT,ringT);
  const per={};
  function fanFor(b){let f=per[b.id];if(f)return f;const g=new THREE.BufferGeometry(),n=(N+1)*2;
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(n*2),2));
    const idx=[];for(let i=0;i<N;i++){const a=i*2,b2=i*2+1,c=(i+1)*2,d=(i+1)*2+1;idx.push(a,c,b2,b2,c,d)}g.setIndex(idx);
    const m=new THREE.MeshBasicMaterial({map:fanT,color:new THREE.Color(1,1,1),transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false,fog:false});
    const mesh=new THREE.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=3;grp.add(mesh);own.push(g,m);
    /* flashlight: a beam cone from the hand and a pool where it lands */
    let beam=null;if(b.lamp){const bg=new THREE.CylinderGeometry(.04,1,1,18,1,true);bg.translate(0,-.5,0);bg.rotateX(-Math.PI/2);/* apex at 0, opening along +z */
      const uv=bg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,1-uv.getY(i),.5);
      const bm=new THREE.MeshBasicMaterial({map:beamT,color:new THREE.Color(1,.95,.82),transparent:true,opacity:.1,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false,fog:false});
      beam=new THREE.Mesh(bg,bm);beam.frustumCulled=false;beam.renderOrder=4;grp.add(beam);own.push(bg,bm)}
    return per[b.id]={mesh,g,m,beam,col:new THREE.Color(),k:0}}
  /* patrol paths (bright with the goggles) */
  const paths=[];if(o.paths)for(const p of o.paths){const pts=p.pts.map(q=>new THREE.Vector3(q.x,.06,q.z));if(p.loop&&pts.length>2)pts.push(pts[0].clone());
    const g=new THREE.BufferGeometry().setFromPoints(pts);const m=new THREE.LineDashedMaterial({color:new THREE.Color(p.color||'#9fffb0'),dashSize:.6,gapSize:.45,transparent:true,opacity:0,depthWrite:false,toneMapped:false,fog:false});
    const l=new THREE.Line(g,m);l.computeLineDistances();l.frustumCulled=false;l.renderOrder=3;grp.add(l);own.push(g,m);paths.push(l)}
  /* noise rings: a small pool */
  const rg=new THREE.PlaneGeometry(2,2);rg.rotateX(-Math.PI/2);own.push(rg);const rings=[];
  for(let i=0;i<6;i++){const m=new THREE.MeshBasicMaterial({map:ringT,color:new THREE.Color(.75,.95,1),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,fog:false});own.push(m);
    const r=new THREE.Mesh(rg,m);r.visible=false;r.renderOrder=3;r.frustumCulled=false;grp.add(r);rings.push({m:r,t:9,dur:1,r:1})}
  let ri=0;
  const V={grp,ring(x,z,r,col){if(!(r>0))return;const R=rings[ri++%rings.length];R.t=0;R.dur=.5+r*.06;R.r=r;R.m.position.set(x,.07,z);R.m.material.color.setRGB(col?col[0]:.75,col?col[1]:.95,col?col[2]:1);R.m.visible=true},
    update(dt,u){u=u||{};const nv=u.nvg?1:0,base=u.night?1:.55;V.nvK=(V.nvK||0)+(nv-(V.nvK||0))*Math.min(1,dt*6);const kN=V.nvK;
      for(const b of S.obs){const f=fanFor(b);const show=!b.off&&b.sight!==false&&u.show!==false;f.mesh.visible=show;if(f.beam)f.beam.visible=show&&!!u.night;if(!show)continue;
        const R=(b.R||(S.night?T.R.night:T.R.day)),half=b.half!=null?b.half:T.half[b.state]||T.half.calm;
        /* the cone: the flashlight's long narrow beam where it reaches further, the wider glance near him */
        const pos=f.g.attributes.position.array,uv=f.g.attributes.uv.array,ox=b.pos.x,oz=b.pos.z,y=.05+(b.id.length%5)*.004;
        const fl=b.lamp&&S.night,FR=T.flash.R,FH=T.flash.half;
        for(let i=0;i<=N;i++){const a=b.yaw-half+2*half*i/N,dx=Math.sin(a),dz=Math.cos(a);let r=R;if(fl&&Math.abs(wrap(a-b.yaw))<=FH)r=Math.max(R,FR*Math.cos(Math.abs(wrap(a-b.yaw))/FH*1.2));
          const hit=S.ray(ox,oz,dx,dz,r,1.2);const k=i*2;pos[k*3]=ox+dx*.35;pos[k*3+1]=y;pos[k*3+2]=oz+dz*.35;pos[k*3+3]=ox+dx*hit;pos[k*3+4]=y;pos[k*3+5]=oz+dz*hit;
          uv[k*2]=0;uv[k*2+1]=.5;uv[k*2+2]=hit/Math.max(1,r)*.98;uv[k*2+3]=.5}
        f.g.attributes.position.needsUpdate=true;f.g.attributes.uv.needsUpdate=true;
        const c=COL[b.state]||COL.calm;f.col.setRGB(c[0],c[1],c[2]);f.m.color.copy(f.col);
        const susK=clamp(b.sus/.6,0,1),pulse=b.state==='alerted'?.5+.5*Math.sin(S.t*14):1;
        f.m.opacity=(.07*base+.1*susK+.18*kN)*(.6+.4*pulse);
        if(f.beam){const hy=b.handY||1.15,len=Math.min(FR,S.ray(ox,oz,Math.sin(b.yaw),Math.cos(b.yaw),FR,1.2)),pitch=Math.atan2(hy,Math.max(4,len));
          f.beam.position.set(ox+Math.sin(b.yaw)*.35,hy,oz+Math.cos(b.yaw)*.35);f.beam.rotation.set(0,0,0);f.beam.rotation.order='YXZ';f.beam.rotation.y=b.yaw;f.beam.rotation.x=pitch;
          const L=Math.hypot(len,hy),w=Math.tan(FH*.8)*L;f.beam.scale.set(w,w*.75,L);f.beam.material.opacity=(.07+.05*kN)*(b.state==='alerted'?1.4:1);f.beam.material.color.setRGB(1,.95-.3*susK*(b.state==='calm'?0:1),.82-.5*susK*(b.state==='calm'?0:1))}}
      for(const l of paths){l.material.opacity=.05*base+.55*kN;l.visible=l.material.opacity>.02}
      for(const R of rings){if(!R.m.visible)continue;R.t+=dt;const k=R.t/R.dur;if(k>=1){R.m.visible=false;continue}const s=R.r*(.35+.65*Math.sqrt(k));R.m.scale.set(s,1,s);R.m.material.opacity=(1-k)*(.35+.45*kN)}},
    dispose(){if(grp.parent)grp.parent.remove(grp);for(const x of own)if(x&&x.dispose)x.dispose();own.length=0;for(const k in per)delete per[k]}};
  return V}

/* ---------------- HUD (DOM): "?"/"!" tags, edge chevrons, the visibility gem ---------------- */
const CSS=`.hts-tag{position:absolute;transform:translate(-50%,-100%);font:900 22px/1 'Barlow Condensed','Arial Narrow',Arial,sans-serif;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.7);pointer-events:none;
  width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(10,14,20,.55);border:2px solid currentColor;transition:transform .12s}
.hts-tag i{position:absolute;inset:-2px;border-radius:50%;border:2px solid transparent;border-top-color:currentColor}
.hts-tag.cur{color:#ffd23f}.hts-tag.sea{color:#ff8a2a}.hts-tag.ale{color:#ff3b30;transform:translate(-50%,-100%) scale(1.25)}
.hts-chev{position:absolute;width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-bottom:18px solid #ffd23f;transform-origin:50% 60%;filter:drop-shadow(0 1px 3px rgba(0,0,0,.6));pointer-events:none}
.hts-gem{position:absolute;left:50%;bottom:118px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:5px 10px 5px 6px;border-radius:18px;background:rgba(8,12,18,.55);
  font:700 12px/1 'Barlow Condensed','Arial Narrow',Arial,sans-serif;letter-spacing:.08em;color:#cfd8e6;text-transform:uppercase;pointer-events:none;backdrop-filter:blur(2px)}
.hts-gem b{display:block;width:22px;height:22px;border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.25) inset;background:radial-gradient(circle at 40% 35%,#fff 0,#ffe7a0 30%,#c98a1a 65%,#3a2a10 100%);transition:filter .2s,opacity .2s}
.hts-gem s{display:block;width:44px;height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden;text-decoration:none}.hts-gem s u{display:block;height:100%;background:#9fd3ff;width:0;transition:width .1s}
.hts-gem em{font-style:normal;min-width:62px}
@media (max-width:700px){.hts-gem{bottom:150px;font-size:11px}}`;
function hud(S,o){const host=document.createElement('div');host.className='hts';host.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden';
  const st=document.createElement('style');st.textContent=CSS;host.appendChild(st);
  const gem=document.createElement('div');gem.className='hts-gem';gem.innerHTML='<b></b><em>Hidden</em><s><u></u></s>';host.appendChild(gem);
  const tags={},chev={};let mounted=false;
  const H={el:host,update(dt,u){u=u||{};if(!mounted){mounted=true;if(o.mount)o.mount(host)}
      const W=host.clientWidth||innerWidth,Hh=host.clientHeight||innerHeight;
      for(const b of S.obs){let tg=tags[b.id];const want=!b.off&&b.sight!==false&&b.sus>=.2||(b.kind==='dog'&&b.sus>=.35&&!b.off);
        if(!tg){tg=document.createElement('div');tg.className='hts-tag';tg.innerHTML='<span>?</span><i></i>';host.appendChild(tg);tags[b.id]=tg;tg.style.display='none'}
        let ch=chev[b.id];if(!ch){ch=document.createElement('div');ch.className='hts-chev';host.appendChild(ch);chev[b.id]=ch;ch.style.display='none'}
        if(!want||u.hide){tg.style.display='none';ch.style.display='none';continue}
        const p=o.project(b.pos.x,(b.headY||1.9)+.45,b.pos.z),cls=b.state==='alerted'?'ale':b.state==='searching'?'sea':'cur';
        const on=!p.behind&&p.x>8&&p.y>8&&p.x<W-8&&p.y<Hh-8;
        if(on){tg.style.display='';tg.style.left=p.x+'px';tg.style.top=p.y+'px';if(tg.dataset.c!==cls){tg.dataset.c=cls;tg.className='hts-tag '+cls;tg.firstChild.textContent=cls==='ale'?'!':'?'}
          const k=Math.round(clamp(b.sus,0,1)*100);if(tg.dataset.k!==String(k)){tg.dataset.k=String(k);tg.lastChild.style.transform='rotate('+(k*3.6)+'deg)'}ch.style.display='none'}
        else{tg.style.display='none';ch.style.display='';let x=p.x-W/2,y=p.y-Hh/2;if(p.behind){x=-x;y=-y;if(Math.abs(y)<1)y=Hh}const a=Math.atan2(y,x),r=Math.min(W,Hh)*.42;
          ch.style.left=(W/2+Math.cos(a)*r-11)+'px';ch.style.top=(Hh/2+Math.sin(a)*r-9)+'px';ch.style.transform='rotate('+(a+Math.PI/2)+'rad)';ch.style.borderBottomColor=b.state==='alerted'?'#ff3b30':b.state==='searching'?'#ff8a2a':'#ffd23f';ch.style.opacity=String(.45+.55*clamp(b.sus,0,1))}}
      /* the gem: how visible you are (light x stance), and how loud */
      if(u.vis!=null){gem.style.display=u.hide?'none':'';const v=clamp(u.vis,0,1),b=gem.firstChild;b.style.filter='brightness('+(.25+v*1.1).toFixed(2)+') saturate('+(.4+v).toFixed(2)+')';b.style.opacity=u.hidden?'.35':'1';
        const lab=u.hidden?'Hidden':v<.3?'In shadow':v<.6?'Dim':'Lit up';if(gem.children[1].textContent!==lab)gem.children[1].textContent=lab;
        gem.lastChild.firstChild.style.width=Math.round(clamp((u.noise||0)/9,0,1)*100)+'%'}},
    dispose(){if(o.mount)o.mount(null);else if(host.parentNode)host.parentNode.removeChild(host)}};
  return H}

const Stealth={ready:true,T,create,viz,hud,live,bind,bindHud,wrap,COL};
HT.Stealth=Stealth;
if(typeof module!=='undefined'&&module.exports)module.exports=Stealth;
if(HT.Jobs)bind();
})(typeof window!=='undefined'?window:globalThis);
