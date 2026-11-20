/* =====================================================================
   HT.Tow: the tow hitch (SPEC3 4.4 [TOW]). Owned by the Hitch Happens worker. Loaded by js/jobs/tow.js (and usable by any job).
   A kinematic single-axle trailer with a little yaw inertia: the towed car's rear axle trails the hitch point, it lags (and so
   swings wide) at speed, a hard brake in a bend pushes it further round, and reversing is naturally unstable.

   Pure core (no THREE, no DOM; dev/tow.test.js runs it in Node):
     HT.Tow.T                         tuning
     HT.Tow.hitchPoint(tw)            tw = {x,z,yaw,len}: the hitch ball, T.hitchBack m behind the rear bumper
     HT.Tow.bumper(car,side)          car = {x,z,yaw,len}: its front (or rear) bumper point
     HT.Tow.check(tw,car,side)        attach rules -> {ok, d, rel, why}   (stopped, within 2.5 m, within 30 degrees)
     HT.Tow.make(tw,car,o)            -> link {psi, w, L, side, ...}  (the car keeps its own pose until the first step)
     HT.Tow.step(k,tw,dt,o)           moves the towed car (k.car.x/z/yaw), returns {jack, rel, hit} ; o.collide(p,r) pushes out
   Game glue (browser): the hitch rig on the tower model, the guide (reverse guide lines + target bracket + HUD meters + reverse cam),
     hold-E hook-up, the towed car's model, damage through the car-damage API, the tower's towMul (js/carai.js drive), free-roam towing
     of broken-down neighbours' cars with the bought hitch.
     HT.Tow.can(e)  HT.Tow.lend(on)  HT.Tow.targets(fn|null)  HT.Tow.attach(e,car)  HT.Tow.detach(why)  HT.Tow.link  HT.Tow.on(fn)
     HT.Tow.rig(e,on)  HT.Tow.truckRig(group,size)  (the wrecker body for a pickup model, used by the fake tow truck)
   ===================================================================== */
(function(root){'use strict';
const HT=root.HT=root.HT||{};
if(HT.Tow&&HT.Tow.ready)return;
const D2R=Math.PI/180,clamp=(v,a,b)=>v<a?a:v>b?b:v,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const fwd=y=>[-Math.sin(y),-Math.cos(y)],yawTo=(dx,dz)=>Math.atan2(-dx,-dz);

/* ---------------- tuning ---------------- */
const T={
  hitchBack:.25,          /* hitch ball behind the tower's rear bumper (m) */
  gap:.6,                 /* hitch to the towed car's bumper (m) */
  attachD:2.5,attachYaw:30*D2R,attachSpd:1,hookHold:1.5,dropHold:1,
  jack:75*D2R,jackSpd:3,clampA:85*D2R,jackDmg:8,snap:9,
  mul:{max:.7,acc:.6,brake:.8,steer:.8},
  resp:28,respV:7,        /* towed yaw-rate response 1/s: resp/(1+(v/respV)^2) -> laggy (wide) at speed, exact when slow */
  brakePush:.055,         /* hard braking in a bend: extra articulation rate per (m/s^2 of decel x sin(angle) x v/10) */
  scrape:2.6,crash:6.5,   /* towed body hits: below scrape nothing, scrape..crash small HP, above crash the real crash path */
  lift:.3,liftPitch:.105, /* wheel-lift: nose up 0.3 m, ~6 degrees */
  settle:.55,             /* hook-up: the winch pulls the car into line over this long */
  revStab:.5              /* reversing still diverges, just at half the rate a real dolly would (it's a game, and Sal is watching) */
};

/* ---------------- pure core ---------------- */
function hitchPoint(tw){const f=fwd(tw.yaw),b=(tw.len||4.6)/2+T.hitchBack;return{x:tw.x-f[0]*b,z:tw.z-f[1]*b}}
function bumper(car,side){const f=fwd(car.yaw),s=side==='rear'?-1:1,b=(car.len||4.6)/2;return{x:car.x+f[0]*b*s,z:car.z+f[1]*b*s}}
/* the yaw the towed car must face so its bumper meets the hitch (front hook: same facing as the tower) */
const faceYaw=(car,side)=>side==='rear'?wrap(car.yaw+Math.PI):car.yaw;
function check(tw,car,side){const H=hitchPoint(tw),B=bumper(car,side),d=Math.hypot(H.x-B.x,H.z-B.z),rel=Math.abs(wrap(tw.yaw-faceYaw(car,side)));
  /* the hitch must be in front of the bumper, not under the car */
  const f=fwd(faceYaw(car,side)),ahead=(H.x-B.x)*f[0]+(H.z-B.z)*f[1];
  let why=null;if(Math.abs(tw.spd||0)>=T.attachSpd)why='stop';else if(d>T.attachD)why='far';else if(rel>T.attachYaw)why='angle';else if(ahead<-.4)why='under';
  return{ok:!why,d,rel,ahead,why}}
function centreFrom(H,psi,len){const f=fwd(psi),o=len/2+T.gap;return{x:H.x-f[0]*o,z:H.z-f[1]*o}}
function make(tw,car,o){o=o||{};const side=o.side||'front',len=car.len||4.6;
  const k={car,side,len,wid:car.wid||1.9,L:len*.75+T.gap,psi:faceYaw(car,side),w:0,v0:tw.spd||0,settle:o.instant?0:T.settle,from:{x:car.x,z:car.z,yaw:car.yaw},lift:o.instant?1:0,t:0,hitT:0};
  if(o.instant){const H=hitchPoint(tw),C=centreFrom(H,k.psi,len);car.x=C.x;car.z=C.z;car.yaw=side==='rear'?wrap(k.psi+Math.PI):k.psi}
  return k}
/* one step. tw = {x,z,yaw,spd,len} (already moved this frame). Returns events. */
function step(k,tw,dt,o){o=o||{};const car=k.car,v=tw.spd||0,H=hitchPoint(tw),ev={jack:false,rel:0,hit:null,snap:false};k.t+=dt;
  if(!k.H0)k.H0=H;
  /* kinematic target: the axle is dragged toward the hitch along its own heading (a tractrix); reversing diverges by itself */
  const f0=fwd(k.psi),A={x:k.H0.x-f0[0]*k.L,z:k.H0.z-f0[1]*k.L},psiK=yawTo(H.x-A.x,H.z-A.z);
  let rK=dt>0?wrap(psiK-k.psi)/dt:0;if(v<0)rK*=T.revStab;const g=T.resp/(1+(v/T.respV)*(v/T.respV));
  /* braking hard in a bend: the towed car keeps coming and pushes the hitch further round */
  const dec=dt>0?(k.v0-v)/dt:0,rel0=wrap(tw.yaw-k.psi);
  if(v>3&&dec>4)rK-=Math.sign(rel0)*T.brakePush*dec*Math.abs(Math.sin(rel0))*(v/10);
  k.w+=(rK-k.w)*Math.min(1,g*dt);
  k.psi=wrap(k.psi+k.w*dt);
  let rel=wrap(tw.yaw-k.psi);
  if(Math.abs(rel)>T.clampA){k.psi=wrap(tw.yaw-Math.sign(rel)*T.clampA);rel=wrap(tw.yaw-k.psi);k.w=0}
  ev.rel=rel;if(Math.abs(rel)>T.jack&&Math.abs(v)>T.jackSpd)ev.jack=true;
  let C=centreFrom(H,k.psi,k.len);
  /* the winch pulling it into line right after the hook-up */
  if(k.settle>0&&k.t<k.settle){const e=k.t/k.settle,s=e*e*(3-2*e);C={x:k.from.x+(C.x-k.from.x)*s,z:k.from.z+(C.z-k.from.z)*s}}
  k.lift=Math.min(1,k.lift+dt/.6);
  /* the towed body against the world: push it out, keep it on the hitch, report the hit */
  if(o.collide){const f=fwd(k.psi),q=k.len/3;let px=0,pz=0;
    for(const s of[1,-1]){const p={x:C.x+f[0]*q*s,z:C.z+f[1]*q*s},p0={x:p.x,z:p.z};o.collide(p,k.wid/2+.05);px+=p.x-p0.x;pz+=p.z-p0.z}
    if(px*px+pz*pz>1e-6){const Cx=C.x+px,Cz=C.z+pz,np=yawTo(H.x-Cx,H.z-Cz);const dpsi=wrap(np-k.psi);k.psi=np;k.w*=.3;C=centreFrom(H,k.psi,k.len);
      const vx=(C.x-(k.Cp?k.Cp.x:C.x))/Math.max(dt,1e-3),vz=(C.z-(k.Cp?k.Cp.z:C.z))/Math.max(dt,1e-3),l=Math.hypot(px,pz),
        sp=Math.max(Math.abs(vx*px/l+vz*pz/l),Math.abs(v)*Math.min(1,Math.abs(dpsi)*6+.25));
      ev.hit={sp,push:{x:px/l,z:pz/l}};rel=wrap(tw.yaw-k.psi);ev.rel=rel}}
  car.x=C.x;car.z=C.z;car.yaw=k.side==='rear'?wrap(k.psi+Math.PI):k.psi;
  k.Cp=C;k.H0=H;k.v0=v;return ev}
/* towMul for HT.CarAI.drive (js/carai.js): the tower is slower, heavier and can't boost */
const towMul=()=>({max:T.mul.max,acc:T.mul.acc,brake:T.mul.brake,steer:T.mul.steer});

const Tow=HT.Tow={T,hitchPoint,bumper,check,make,step,centreFrom,faceYaw,towMul,wrap,fwd,yawTo,ready:true};
if(typeof module!=='undefined'&&module.exports){module.exports=Tow;return}
if(typeof window==='undefined'||!window.THREE)return;
glue(Tow);

/* =====================================================================
   GAME GLUE
   ===================================================================== */
function glue(Tow){
const THREE=window.THREE,J=()=>window.HT&&HT.Jobs,A=()=>J()&&J().api,H_=()=>window.__ht;
const S={link:null,lend:false,targets:null,rigs:new Map(),guide:null,cand:null,hold:0,eDown:0,eT:0,ev:[],cam:null,camT:0,snd:null,lastHit:0,quipT:0,fx:null};
Tow.S=S;Object.defineProperty(Tow,'link',{get:()=>S.link});
Tow.on=fn=>{S.ev.push(fn);return()=>{const i=S.ev.indexOf(fn);if(i>=0)S.ev.splice(i,1)}};
const emit=(t,d)=>{for(const f of S.ev.slice())try{f(t,d)}catch(e){console.warn('[tow]',e)}};
Tow.lend=on=>{S.lend=!!on};
Tow.targets=fn=>{S.targets=fn||null};
/* which vehicles have a hitch: the pickup and the work van have one stock; the rest need Dad's Auto's (or Sal's loaner during a job) */
Tow.can=e=>{if(!e)return false;if(S.lend)return true;if(e.type==='pickup'||e.type==='workvan')return true;
  try{const a=A(),s=a&&a.SV();if(s&&s.garage&&s.garage.util&&s.garage.util.hitch&&e===a.VAN)return true}catch(_){}return false};
const MATS={};const mat=(c,o)=>{const k=c+JSON.stringify(o||{});if(MATS[k])return MATS[k];const a=A();const m=new THREE.MeshStandardMaterial(Object.assign({color:a?a.lin(c):new THREE.Color(c),roughness:.55,metalness:.25},o||{}));return MATS[k]=m};
const BX=new THREE.BoxGeometry(1,1,1),CY=new THREE.CylinderGeometry(1,1,1,12),CY6=new THREE.CylinderGeometry(1,1,1,6);
function bx(w,h,d,m,x,y,z,p){const o=new THREE.Mesh(BX,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;if(p)p.add(o);return o}
function cyl(r,h,m,x,y,z,p,seg){const o=new THREE.Mesh(seg===6?CY6:CY,m);o.scale.set(r,h,r);o.position.set(x,y,z);o.castShadow=true;if(p)p.add(o);return o}
const UP=new THREE.Vector3(0,1,0),_a=new THREE.Vector3(),_b=new THREE.Vector3(),_q=new THREE.Quaternion();
/* a tube between two points (in the parent's space) */
function tube(o,a,b,r){_a.set(b.x-a.x,b.y-a.y,b.z-a.z);const l=_a.length()||1e-3;o.scale.set(r,l,r);o.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);_q.setFromUnitVectors(UP,_a.multiplyScalar(1/l));o.quaternion.copy(_q);return o}
function tubeMesh(m,p,seg){const o=new THREE.Mesh(seg===6?CY6:CY,m);o.castShadow=true;if(p)p.add(o);return o}
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.anisotropy=4;if(THREE.sRGBEncoding)t.encoding=THREE.sRGBEncoding;return t}
const COL={yellow:'#f2b81c',steel:'#2a2c30',chrome:'#c9ccd0',amber:'#ffab1a',orange:'#ff7a1a',chain:'#8d8f93',black:'#151618'};
function chevronTex(){return S.chev||(S.chev=canvasTex(256,64,(g,w,h)=>{g.fillStyle=COL.yellow;g.fillRect(0,0,w,h);g.fillStyle='#161616';for(let x=-h;x<w+h;x+=44){g.beginPath();g.moveTo(x,h);g.lineTo(x+22,h);g.lineTo(x+22+h,0);g.lineTo(x+h,0);g.fill()}}))}
function salTex(){return S.salT||(S.salT=canvasTex(256,64,(g,w,h)=>{g.fillStyle='#1f2a36';g.fillRect(0,0,w,h);g.fillStyle='#f2b81c';g.fillRect(0,h-8,w,8);g.fillStyle='#fff';g.font='bold 30px Arial';g.textAlign='center';g.fillText("DAD'S AUTO",w/2,30);g.font='bold 16px Arial';g.fillStyle='#f2b81c';g.fillText('LOANER · PLEASE RETURN',w/2,50)}))}

/* ---------------- the hitch rig on the tower: receiver, chevron plate, A-frame boom, winch, beacon, sign ---------------- */
function buildRig(size){const g=new THREE.Group();g.name='towRig';const l=size.l,h=size.h,x0=-l/2;
  const Y=mat(COL.yellow,{roughness:.45,metalness:.2}),St=mat(COL.steel,{roughness:.5,metalness:.6}),Ch=mat(COL.chrome,{roughness:.25,metalness:.9});
  bx(.62,.1,.1,St,x0-.2,.46,0,g);bx(.12,.16,.16,St,x0-.48,.46,0,g);/* receiver and ball mount */
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.06,10,8),Ch);ball.position.set(x0-.5,.6,0);g.add(ball);
  const plate=new THREE.Mesh(BX,new THREE.MeshStandardMaterial({map:chevronTex(),roughness:.6}));plate.scale.set(.05,.2,1.3);plate.position.set(x0-.06,.58,0);g.add(plate);
  /* A-frame: two legs from the bumper corners up past the hatch, a crossbar, the winch and the pulley at the tip */
  const top=Math.max(1.55,h+.18),xt=x0-.34,legs=[];
  for(const s of[-1,1]){const leg=tubeMesh(Y,g);tube(leg,{x:x0+.08,y:.5,z:s*.6},{x:xt,y:top,z:s*.5},.045);legs.push(leg);
    const brace=tubeMesh(St,g);tube(brace,{x:x0-.1,y:.5,z:s*.6},{x:xt+.05,y:top*.55,z:s*.55},.025)}
  const cross=tubeMesh(Y,g);tube(cross,{x:xt,y:top,z:-.56},{x:xt,y:top,z:.56},.05);
  const drum=cyl(.12,.42,St,xt+.02,top-.17,0,g);drum.rotation.x=Math.PI/2;
  const wrap_=cyl(.128,.34,mat('#5b5e63',{roughness:.8}),xt+.02,top-.17,0,g);wrap_.rotation.x=Math.PI/2;
  for(const s of[-1,1]){const pl=cyl(.17,.03,Y,xt+.02,top-.17,s*.22,g);pl.rotation.x=Math.PI/2}
  const motor=cyl(.07,.16,mat('#1d4f8c',{roughness:.4}),xt+.02,top-.17,.33,g);motor.rotation.x=Math.PI/2;
  const tip=cyl(.07,.06,Ch,xt-.12,top+.02,0,g);tip.rotation.x=Math.PI/2;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(.95,.24),new THREE.MeshStandardMaterial({map:salTex(),roughness:.5,side:THREE.DoubleSide}));sign.position.set(xt-.06,top-.42,0);sign.rotation.y=-Math.PI/2;g.add(sign);
  /* the beacon: magnet base on the roof, amber dome, a reflector that spins, a glow sprite */
  const bcn=new THREE.Group();bcn.position.set(x0+.85,h+.02,0);g.add(bcn);
  bx(.26,.05,.2,mat('#111',{roughness:.8}),0,.025,0,bcn);
  const domeM=new THREE.MeshStandardMaterial({color:new THREE.Color(COL.amber),emissive:new THREE.Color(COL.amber),emissiveIntensity:.25,transparent:true,opacity:.82,roughness:.2});
  const dome=new THREE.Mesh(new THREE.CylinderGeometry(.075,.09,.15,14),domeM);dome.position.y=.125;bcn.add(dome);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.075,12,6,0,Math.PI*2,0,Math.PI/2),domeM);cap.position.y=.2;bcn.add(cap);
  const refl=bx(.012,.1,.11,mat('#fff2c0',{emissive:new THREE.Color('#ffcc55'),emissiveIntensity:1.2,metalness:.9,roughness:.1}),0,.125,0,bcn);refl.castShadow=false;
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),color:new THREE.Color('#ffb340'),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));glow.scale.set(1.6,1.6,1);glow.position.y=.14;bcn.add(glow);
  g.userData={x0,top,xt,tipLocal:new THREE.Vector3(xt-.12,top-.03,0),refl,domeM,glow,drumWrap:wrap_};
  return g}
function glowTex(){return S.glowT||(S.glowT=canvasTex(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,220,150,.6)');r.addColorStop(1,'rgba(255,180,60,0)');g.fillStyle=r;g.fillRect(0,0,64,64)}))}
/* the wheel-lift under the towed car's nose: stinger, crossbar, cradles, chains and the winch cable (world space) */
function buildLift(){const g=new THREE.Group();g.name='towLift';const Y=mat(COL.yellow,{roughness:.45}),St=mat(COL.steel,{roughness:.5,metalness:.6}),Or=mat(COL.orange,{roughness:.6});
  const st=bx(1,.12,.12,St,0,0,0,g);const cr=bx(.16,.1,1.75,Y,0,0,0,g);const arms=[],pins=[];
  for(const s of[-1,1]){arms.push(bx(.8,.08,.12,Y,0,0,0,g));pins.push(bx(.08,.22,.08,St,0,0,0,g))}
  const straps=[];for(const s of[-1,1])straps.push(bx(.06,.02,.5,Or,0,0,0,g));
  const chains=[tubeMesh(mat(COL.chain,{metalness:.8,roughness:.35}),null,6),tubeMesh(mat(COL.chain,{metalness:.8,roughness:.35}),null,6)];
  const cable=tubeMesh(mat('#3a3c40',{metalness:.7,roughness:.4}),null,6);
  return{g,st,cr,arms,pins,straps,chains,cable}}

/* attach / refresh the rig on the tower's model (models get swapped by Dad's Auto and LOD changes) */
function rigFor(e,on){const a=A();if(!e||!e.obj)return null;let r=S.rigs.get(e);
  if(!on){if(r){if(r.g.parent)r.g.parent.remove(r.g);S.rigs.delete(e)}return null}
  const size=a.carSize(e);if(!r){r={g:buildRig(size),obj:null,size};S.rigs.set(e,r)}
  if(r.obj!==e.obj){if(r.g.parent)r.g.parent.remove(r.g);e.obj.add(r.g);r.obj=e.obj}return r}
Tow.rig=(e,on)=>rigFor(e,on!==false);

/* ---------------- the guide: reverse guidelines from the hitch, the target bracket, colours by how close you are ---------------- */
function buildGuide(){const a=A(),g=new THREE.Group();g.name='towGuide';g.renderOrder=3;
  const mk=c=>new THREE.MeshBasicMaterial({color:new THREE.Color(c),transparent:true,opacity:.75,depthWrite:false});
  const M3={good:mk('#3ee07a'),warn:mk('#ffc94a'),bad:mk('#ff5a4a'),path:mk('#ffffff')};
  const dashes=[];for(let i=0;i<14;i++){const d=new THREE.Mesh(new THREE.PlaneGeometry(.1,.42),M3.path);d.rotation.x=-Math.PI/2;g.add(d);dashes.push(d)}
  const br=new THREE.Group();g.add(br);const bar=(w,d,x,z)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),M3.good);m.rotation.x=-Math.PI/2;m.position.set(x,0,z);br.add(m);return m};
  const parts=[bar(1.3,.1,0,0),bar(.1,.55,-.6,.27),bar(.1,.55,.6,.27),bar(.34,.34,0,-.38)];parts[3].rotation.z=Math.PI/4;
  const ball=new THREE.Mesh(new THREE.RingGeometry(.14,.22,20),M3.good);ball.rotation.x=-Math.PI/2;g.add(ball);
  if(a)a.scene.add(g);return{g,dashes,br,parts,ball,M3}}
function guideOff(){if(S.guide)S.guide.g.visible=false}
function guideUpd(e,c,cand,chk){const a=A();if(!S.guide)S.guide=buildGuide();const G=S.guide;if(G.g.parent!==a.scene)a.scene.add(G.g);G.g.visible=true;
  const tw=towerOf(e,c),H=hitchPoint(tw),gy=a.groundAt(H.x,H.z)+.04,state=chk.ok?'good':chk.d<5&&chk.rel<45*D2R?'warn':'bad',m=G.M3[state];
  /* where the hitch goes if you keep reversing with this much steering (the game's own turn model at walking pace) */
  const S_=e.stats||{turn:1.55},k=-(c.steer||0)*(S_.turn||1.55)/5;let x=H.x,z=H.z,y=tw.yaw;
  for(let i=0;i<G.dashes.length;i++){const step=.45;const f=fwd(y);x-=f[0]*step;z-=f[1]*step;y+=k*step*-1;const d=G.dashes[i];d.position.set(x,a.groundAt(x,z)+.04,z);d.rotation.z=y;d.material=i<4?m:G.M3.path;d.visible=i<Math.min(G.dashes.length,4+chk.d*2.2)}
  const B=bumper(cand,cand.side),fy=faceYaw(cand,cand.side),f=fwd(fy),bx_=B.x+f[0]*T.gap,bz_=B.z+f[1]*T.gap;
  G.br.position.set(bx_,a.groundAt(bx_,bz_)+.045,bz_);G.br.rotation.y=fy;for(const p of G.parts)p.material=m;
  G.ball.position.set(H.x,gy+.005,H.z);G.ball.material=m;
  const pulse=.55+.3*Math.sin(a.simT*6);for(const k2 in G.M3)G.M3[k2].opacity=k2==='path'?.45:pulse;return state}

/* ---------------- tower / towed adapters ---------------- */
const towerOf=(e,c)=>{const a=A(),S_=a.carSize(e);c=c||e.car||e;return{x:c.x!=null?c.x:e.pos.x,z:c.z!=null?c.z:e.pos.z,yaw:c.yaw!=null?c.yaw:e.yaw,spd:c.spd!=null?c.spd:e.spd,len:S_.l}};
const bodyOf=t=>{const a=A(),S_=a.carSize(t);return{x:t.pos.x,z:t.pos.z,yaw:t.yaw,len:S_.l,wid:S_.w,side:t.towSide||'front',ref:t}};
function candidates(e){const a=A();let list=null;if(S.targets)try{list=S.targets(e)}catch(err){list=null}
  if(!list){/* free roam: broken-down neighbours' cars (tow it home yourself and skip the flatbed) */if(a.mode!=='hub'||!Tow.can(e))return[];const H=a.L&&a.L.cars||[];
    list=H.filter(t=>t!==e&&t!==a.VAN&&t.owner==='neighbour'&&t.obj&&hpOf(t)<=0)}
  return list}
const hp_=()=>H_()||{};
function hpOf(t){const h=hp_();try{return h.carHp?h.carHp(t):t.hp!=null?t.hp:100}catch(_){return 100}}
function hpMax(t){const h=hp_();try{return h.carHpMax?h.carHpMax(t):100}catch(_){return 100}}
function damage(t,amt,cause){const h=hp_();if(!(amt>0))return 0;try{if(h.carDamage)return h.carDamage(t,amt,cause||'crash')}catch(e){}t.hp=Math.max(0,(t.hp||100)-amt);return amt}
function crash(t,sp,push){const h=hp_();try{if(h.crash){const ang=Math.atan2(push.x,push.z)-t.yaw;return h.crash(t,sp,{angle:ang})}}catch(e){}return damage(t,.13*(sp-6.5)*(sp-6.5),'crash')}
Tow.hpOf=hpOf;Tow.hpMax=hpMax;Tow.damage=damage;

/* ---------------- attach / detach ---------------- */
Tow.attach=(e,t,o)=>{const a=A();o=o||{};if(S.link)Tow.detach('swap',{quiet:true});const c=e.car||e,tw=towerOf(e,c),b=bodyOf(t);
  const k=make(tw,b,{side:b.side,instant:o.instant});k.tower=e;k.ref=t;t.towed=true;S.link=k;
  if(c&&c!==e)c.towMul=towMul();rigFor(e,true);
  if(!k.lw){k.lw=buildLift();a.scene.add(k.lw.g);for(const m of[...k.lw.chains,k.lw.cable])a.scene.add(m)}
  if(o.instant){t.pos.x=b.x;t.pos.z=b.z;t.yaw=b.yaw}
  sfx('clank');emit('hitch',{car:t,tower:e});return k};
Tow.detach=(why,o)=>{const a=A(),k=S.link;if(!k)return null;o=o||{};S.link=null;const e=k.tower,t=k.ref;t.towed=false;
  if(e&&e.car&&e.car!==e)e.car.towMul=null;if(k.lw){if(k.lw.g.parent)k.lw.g.parent.remove(k.lw.g);for(const m of[...k.lw.chains,k.lw.cable])if(m.parent)m.parent.remove(m)}
  /* set it down: nose back on the ground */
  try{a.syncCar(t);if(t.obj){t.obj.rotation.z=0}}catch(_){}
  if(!o.quiet)sfx(why==='jack'||why==='snap'?'bang':'clank');emit('detach',{car:t,tower:e,why});return t};

/* ---------------- per frame while the dad drives (JH.vehicle): physics, model, damage, guide, hold E in free roam ---------------- */
function tick(e,dt){const a=A();if(!a)return;const c=e.car||e,k=S.link;
  if(!Tow.can(e)&&!k){guideOff();rigFor(e,false);S.cand=null;return}
  if(Tow.can(e))rigFor(e,true);
  if(k&&k.tower!==e){/* you got into another car: the towed one stays where it is */Tow.detach('left',{quiet:true})}
  if(S.link){towTick(e,c,dt);S.cand=null;guideOff()}
  else{/* not towing: the nearest hitchable car behind you */const tw=towerOf(e,c),H=hitchPoint(tw);let best=null,bd=1e9;
    for(const t of candidates(e)){if(!t||!t.obj||t.towed)continue;const b=bodyOf(t),B=bumper(b,b.side),d=Math.hypot(B.x-H.x,B.z-H.z);if(d<bd){bd=d;best=b}}
    if(best&&bd<14){const chk=check(tw,best,best.side);S.cand={b:best,chk,state:guideUpd(e,c,best,chk)};
      /* backing into it: a bump scratches it */
      const B=bumper(best,best.side);if(chk.ahead<.15&&chk.d<1.2&&c.spd<-2.2&&S.lastHit<=0){S.lastHit=.8;const got=damage(best.ref,Math.min(6,(-c.spd-1.8)*1.6),'crash');c.spd*=.2;sfx('bump');emit('bump',{car:best.ref,hp:got})}}
    else{S.cand=null;guideOff()}}
  S.lastHit-=dt;S.quipT-=dt;
  /* free roam has no interact hook: hold E here (missions use the interact hook below) */
  if(a.mode==='hub')freeRoamE(e,c,dt);
  beacon(e,dt)}
function towTick(e,c,dt){const a=A(),k=S.link,t=k.ref,tw=towerOf(e,c);
  /* the tower's own hard hit (a wall at 9 m/s or more) snaps the hitch */
  const dv=Math.abs((k.vt!=null?k.vt:tw.spd)-tw.spd);k.vt=tw.spd;
  const sx=t.pos.x,sz=t.pos.z;
  const coll=(p,r)=>{const col=t.col,sv=col&&{x0:col.x0,z0:col.z0,x1:col.x1,z1:col.z1,ob:col.ob};if(col){col.x0=col.z0=-1e4;col.x1=col.z1=-1e4+1;col.ob=null}a.collide(p,r);if(col)Object.assign(col,sv)};
  const b={x:t.pos.x,z:t.pos.z,yaw:t.yaw};k.car=b;const ev=step(k,tw,dt,{collide:coll});
  t.pos.x=b.x;t.pos.z=b.z;t.yaw=b.yaw;t.spd=tw.spd;t.odo=(t.odo||0)+Math.hypot(b.x-sx,b.z-sz);
  if(dv>=T.snap&&k.t>.5){hitFx(t,dv);Tow.detach('snap');emit('snap',{car:t,tower:e,sp:dv});return}
  if(ev.hit&&k.t>k.settle){const sp=ev.hit.sp;k.hitT=(k.hitT||0)-dt;
    if(sp>=T.snap){crash(t,sp,ev.hit.push);hitFx(t,sp);Tow.detach('snap');emit('snap',{car:t,tower:e,sp});return}
    if(sp>=T.crash&&k.hitT<=0){k.hitT=.35;const got=crash(t,sp,ev.hit.push);hitFx(t,sp);emit('hit',{car:t,sp,hp:got})}
    else if(sp>=T.scrape&&k.hitT<=0){k.hitT=.5;const got=damage(t,.55*(sp-T.scrape)+.6,'crash');sfx('scrape');emit('scrape',{car:t,sp,hp:got})}}
  else if(k.hitT>0)k.hitT-=dt;
  if(ev.jack){/* jackknife: both cars take a knock and the hitch lets go */damage(t,T.jackDmg,'crash');damage(e,T.jackDmg,'crash');hitFx(t,8);Tow.detach('jack');emit('jackknife',{car:t,tower:e});return}
  k.rel=ev.rel;syncTowed(k);liftUpd(k,e,dt);sound(k,tw,dt)}
function syncTowed(k){const a=A(),t=k.ref;a.syncCar(t);if(!t.obj)return;const l=k.lift*(k.t<k.settle?k.t/k.settle:1);
  const S_=a.carSize(t);t.obj.position.y+=T.lift*l*.55;t.obj.rotation.z=(k.side==='rear'?-1:1)*T.liftPitch*l;
  const VM=window.HT&&HT.Vehicles;if(t.obj.userData.mod&&VM&&VM.update)try{VM.update(t.obj,{speed:k.side==='rear'?-t.spd:t.spd,steer:0,braking:false,headlights:false,dt:1/30})}catch(_){}}
/* the wheel-lift assembly follows the towed car; chains and the winch cable span tower and towed car */
const _v=new THREE.Vector3(),_w=new THREE.Vector3();
function liftUpd(k,e,dt){const a=A(),L=k.lw;if(!L)return;const tw=towerOf(e),H=hitchPoint(tw),psi=k.psi,gy=a.groundAt(H.x,H.z),lt=k.lift*(k.t<k.settle?k.t/k.settle:1);
  L.g.position.set(H.x,gy,H.z);L.g.rotation.set(0,psi+Math.PI/2,0);/* local +x = towed forward */
  const y=.3+lt*.12;L.st.position.set(-.48,y,0);L.st.scale.set(1.02,.12,.12);L.cr.position.set(-1.0,y-.04,0);
  L.arms.forEach((m,i)=>{const s=i?1:-1;m.position.set(-1.25,y-.08,s*.78)});L.pins.forEach((m,i)=>{const s=i?1:-1;m.position.set(-1.58,y+.02,s*.78)});
  L.straps.forEach((m,i)=>{const s=i?1:-1;m.position.set(-1.25,y+.3,s*.78);m.rotation.z=.6});
  /* chains: tower rear corners -> crossbar ends; cable: boom tip -> stinger */
  const r=S.rigs.get(e);const S_=a.carSize(e),f=fwd(tw.yaw),rr=[Math.cos(tw.yaw),-Math.sin(tw.yaw)];
  L.g.updateMatrixWorld(true);
  L.chains.forEach((m,i)=>{const s=i?1:-1,p0={x:tw.x-f[0]*(S_.l/2-.05)+rr[0]*s*.55,y:gy+.42,z:tw.z-f[1]*(S_.l/2-.05)+rr[1]*s*.55};_v.set(-1.0,y-.02,s*.8).applyMatrix4(L.g.matrixWorld);tube(m,p0,{x:_v.x,y:_v.y-.12,z:_v.z},.018)});
  if(r&&r.obj){r.obj.updateMatrixWorld(true);_w.copy(r.g.userData.tipLocal).applyMatrix4(r.g.matrixWorld);_v.set(-.6,y+.06,0).applyMatrix4(L.g.matrixWorld);tube(L.cable,{x:_w.x,y:_w.y,z:_w.z},{x:_v.x,y:_v.y,z:_v.z},.012);L.cable.visible=true}else L.cable.visible=false}
/* the beacon spins and flashes while a hitch is on (towing or lining up) */
function beacon(e,dt){const r=S.rigs.get(e);if(!r)return;const u=r.g.userData,on=!!S.link||!!S.cand;S.bT=(S.bT||0)+dt*(on?7.5:0);
  u.refl.rotation.y=S.bT;const fl=on?Math.max(0,Math.cos(S.bT)):0;u.domeM.emissiveIntensity=.25+fl*2.2;u.glow.material.opacity=fl*.85}
function hitFx(t,sp){const a=A();try{const h=H_();if(h.FX&&h.FX.impact)h.FX.impact(new THREE.Vector3(t.pos.x,.8,t.pos.z),new THREE.Vector3(0,1,0),'metal',{decal:false})}catch(_){}try{const Au=HT.Audio;if(Au&&Au.ready&&Au.impact)Au.impact('car',{x:t.pos.x,y:.8,z:t.pos.z})}catch(_){}}

/* ---------------- sound: winch whirr, clank, chain rattle and the creak of the hitch (procedural, on the sfx bus if there is one) ---------------- */
function ac(){const Au=window.HT&&HT.Audio;const c=Au&&Au.state&&Au.state.ctx;return c&&c.state!=='closed'?c:null}
function sfx(kind){const c=ac();if(!c)return;const t=c.currentTime,g=c.createGain(),out=c.destination;g.connect(out);
  const noise=(dur,f,q,vol,type)=>{const n=c.createBufferSource(),b=c.createBuffer(1,Math.max(1,c.sampleRate*dur|0),c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);n.buffer=b;const bq=c.createBiquadFilter();bq.type=type||'bandpass';bq.frequency.value=f;bq.Q.value=q;const gg=c.createGain();gg.gain.value=vol;n.connect(bq);bq.connect(gg);gg.connect(g);n.start(t);n.stop(t+dur)};
  const ping=(f,dur,vol,dt0)=>{const o=c.createOscillator(),gg=c.createGain();o.type='triangle';o.frequency.value=f;gg.gain.setValueAtTime(vol,t+(dt0||0));gg.gain.exponentialRampToValueAtTime(.001,t+(dt0||0)+dur);o.connect(gg);gg.connect(g);o.start(t+(dt0||0));o.stop(t+(dt0||0)+dur+.05)};
  g.gain.value=.5;
  if(kind==='clank'){noise(.12,1800,3,.6);ping(820,.35,.07);ping(1230,.25,.04,.02);noise(.25,4200,6,.15)}
  else if(kind==='bang'){noise(.35,600,1.2,.9);noise(.2,2500,4,.4);ping(310,.5,.08)}
  else if(kind==='scrape'){noise(.45,3000,2.5,.35);noise(.3,1200,1.5,.25)}
  else if(kind==='bump'){noise(.18,500,1.2,.5);ping(240,.2,.05)}
  else if(kind==='rattle'){for(let i=0;i<5;i++)ping(2400+Math.random()*900,.06,.03,i*.05)}}
function sound(k,tw,dt){const c=ac();/* chains rattle on bumps and swings; the hitch creaks under load */k.rT=(k.rT||0)-dt;
  if(!c)return;const sw=Math.abs(k.w);if(k.rT<=0&&(sw>.5||Math.abs(tw.spd-(k.sv||0))>.6)&&Math.abs(tw.spd)>1.5){k.rT=.35+Math.random()*.5;sfx('rattle')}k.sv=tw.spd}
let winch=null;
function winchSnd(on,p){const c=ac();if(!c){return}if(on&&!winch){const o=c.createOscillator(),o2=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o2.type='square';o.frequency.value=95;o2.frequency.value=190;f.type='lowpass';f.frequency.value=900;g.gain.value=0;
    o.connect(f);o2.connect(f);f.connect(g);g.connect(c.destination);o.start();o2.start();winch={o,o2,g,f}}
  if(winch){const t=c.currentTime;if(on){winch.g.gain.setTargetAtTime(.05,t,.04);winch.o.frequency.setTargetAtTime(90+p*70,t,.05);winch.o2.frequency.setTargetAtTime(180+p*140,t,.05)}
    else{winch.g.gain.setTargetAtTime(0,t,.05);const w=winch;winch=null;setTimeout(()=>{try{w.o.stop();w.o2.stop()}catch(_){}},400)}}}
Tow.winch=winchSnd;Tow.sfx=sfx;

/* ---------------- E: hook up / drop (missions: the interact hook; free roam: here) ---------------- */
/* what E would do right now: {txt, hold, fn} or null */
function action(){const a=A(),e=a.CV;if(!e)return null;const c=e.car||e;
  if(S.link){if(Math.abs(c.spd)>T.attachSpd)return null;const t=S.link.ref,d=S.dropAt?S.dropAt(t,S.link):null;
    if(d===false)return null;/* the job says not here */
    return{txt:(d&&d.txt)||('Unhitch '+nameOf(t)),hold:T.dropHold,fn:()=>{const tt=Tow.detach('drop');if(d&&d.fn)d.fn(tt);emit('drop',{car:tt,at:d||null})}}}
  const cd=S.cand;if(!cd)return null;const ch=cd.chk;
  if(!ch.ok)return{txt:ch.why==='stop'?'Stop to hitch up':ch.why==='far'?'Back up to '+nameOf(cd.b.ref)+(ch.d<6?' · '+ch.d.toFixed(1)+' m':''):ch.why==='angle'?'Straighten up · '+Math.round(ch.rel/D2R)+'°':'Too close · pull forward',info:true};
  return{txt:'Hitch up '+nameOf(cd.b.ref),hold:T.hookHold,fn:()=>{Tow.attach(e,cd.b.ref)}}}
Tow.action=action;
const nameOf=t=>t.towName||(t.name?t.name+"'s car":'the car');
function freeRoamE(e,c,dt){const a=A(),r=action();S.hint=r;if(!r||r.info){if(!a.keys.e)S.hold=0;winchSnd(false);return}
  if(a.useTap&&r.hold){a.useTap=false;S.eDown=1}/* swallow the tap that would get you out; a quick tap still gets you out below */
  if(a.keys.e&&S.eDown){S.hold+=dt/r.hold;winchSnd(true,S.hold);if(S.hold>=1){S.hold=0;S.eDown=0;winchSnd(false);r.fn()}}
  else{if(S.eDown&&S.hold<.2/r.hold&&!a.keys.e){S.eDown=0;S.hold=0;winchSnd(false);a.exitCar();return}S.eDown=0;S.hold=0;winchSnd(false)}}
/* missions: the interact hook. A quick tap while hitched still gets you out (to zip-tie somebody, say) */
function interact(prompt){const a=A();if(!a||!a.CV)return undefined;const r=action();
  if(!r){winchSnd(false);return undefined}
  if(r.info)return prompt?undefined:r.txt;
  if(a.keys.e){S.eT+=1/30}else{if(S.eT>0&&S.eT<.22&&S.link){S.eT=0;a.exitCar();return undefined}S.eT=0}
  const o=S.holdO||(S.holdO={prog:0});winchSnd(a.keys.e&&o.prog>0,o.prog);
  return{txt:r.txt+(S.link?' · tap: get out':''),hold:r.hold,o,fn:()=>{winchSnd(false);r.fn()}}}

/* ---------------- HUD: the line-up meters, the towing meter ---------------- */
function hud(st){const a=A();if(!a||!a.CV){return}const m=st.meters||(st.meters=[]);if(m.length>=3)return;
  if(S.link){const k=S.link,rel=Math.abs(k.rel||0)/D2R;m.push({id:'tow_angle',label:'Hitch angle',v:Math.min(90,rel),max:90,style:'bands',zones:[[0,35,'good','Tracking'],[35,60,'warn','Swinging'],[60,90,'bad','Jackknife!']],marker:Math.min(90,rel)});return}
  const cd=S.cand;if(!cd)return;const ch=cd.chk;
  m.push({id:'tow_line',label:'Line up',v:Math.max(0,8-Math.min(8,ch.d)),max:8,style:'bands',zones:[[0,3,'bad','Far'],[3,5.5,'warn','Closer'],[5.5,8,'good','In range']],sub:ch.d.toFixed(1)+' m · '+Math.round(ch.rel/D2R)+'°'+(Math.abs(a.CV.spd)>=T.attachSpd?' · stop':'')});
  if(a.mode==='hub'&&S.hint&&m.length<3)m.push({id:'tow_e',label:S.hint.info?S.hint.txt:'Hold E · '+S.hint.txt,v:S.hold||0,max:1,style:'bar'})}

/* ---------------- reverse camera: high and behind the hitch while you line up (missions) ---------------- */
function camera(dt){const a=A();if(!a||!a.CV||a.mode!=='mission')return undefined;const e=a.CV,c=e.car||e,cd=S.cand,cam=a.camera;
  const want=!S.link&&cd&&cd.chk.d<11&&(c.spd<-.15||(Math.abs(c.spd)<.6&&cd.chk.d<6))&&!a.keys.c;
  S.camT=Math.max(0,Math.min(1,S.camT+(want?dt*2.2:-dt*3)));if(S.camT<=0){S.cam=null;return undefined}
  const tw=towerOf(e,c),H=hitchPoint(tw),f=fwd(tw.yaw),gy=a.groundAt(e.pos.x,e.pos.z),Sz=a.carSize(e);
  const tgt=cd?bumper(cd.b,cd.b.side):H,mid={x:(H.x+tgt.x)/2,z:(H.z+tgt.z)/2};
  const eyeR={x:e.pos.x+f[0]*(Sz.l*.25),y:gy+Sz.h+3.6,z:e.pos.z+f[1]*(Sz.l*.25)},atR={x:mid.x-f[0]*.8,y:gy+.3,z:mid.z-f[1]*.8};
  const eyeC={x:e.pos.x+f[0]*8.2,y:gy+3.1,z:e.pos.z+f[1]*8.2},atC={x:e.pos.x,y:gy+1.4,z:e.pos.z};/* the chase cam it hands back to: behind the nose? no: in front, looking back */
  const s=S.camT*S.camT*(3-2*S.camT);if(!S.cam)S.cam={x:cam.position.x,y:cam.position.y,z:cam.position.z};
  const lerp=(p,q)=>({x:p.x+(q.x-p.x)*s,y:p.y+(q.y-p.y)*s,z:p.z+(q.z-p.z)*s});
  const from=S.cam,eye=want?lerp(from,eyeR):lerp(eyeC,eyeR),at=want?lerp({x:e.pos.x,y:gy+1.2,z:e.pos.z},atR):lerp(atC,atR);
  if(!want&&s<.02){S.cam=null;return undefined}
  cam.position.set(eye.x,eye.y,eye.z);cam.lookAt(at.x,at.y,at.z);cam.fov+=(58-cam.fov)*Math.min(1,dt*4);cam.updateProjectionMatrix();if(want)S.cam={x:cam.position.x,y:cam.position.y,z:cam.position.z};return true}

/* ---------------- the wrecker body for a pickup model (the fake tow truck): boom, winch, light bar, wheel-lift, tool boxes ---------------- */
Tow.truckRig=(g,size,o)=>{o=o||{};const l=size.l,h=size.h,w=size.w,x0=-l/2;const body=mat(o.color||'#e9e4da',{roughness:.5,metalness:.3}),St=mat(COL.steel,{roughness:.45,metalness:.65}),Y=mat(o.accent||'#d33a2c',{roughness:.45}),Ch=mat(COL.chrome,{roughness:.25,metalness:.9});
  const R=new THREE.Group();R.name='wrecker';g.add(R);const bedX0=x0+.15,bedX1=x0+l*.42,by=.95;
  /* deck over the bed, side tool boxes with chrome latches, headache rack */
  bx(bedX1-bedX0,.12,w*.92,St,(bedX0+bedX1)/2,by,0,R);
  for(const s of[-1,1]){bx(bedX1-bedX0-.2,.5,.34,body,(bedX0+bedX1)/2,by+.3,s*(w*.46-.17),R);for(const xx of[-.45,.45])bx(.12,.05,.03,Ch,(bedX0+bedX1)/2+xx,by+.42,s*(w*.46+.005),R)}
  bx(.08,.75,w*.85,St,bedX1+.02,by+.42,0,R);
  /* boom: pivot at the front of the deck, raked back, two-stage, with the cable over the sheave */
  const piv=new THREE.Group();piv.position.set(bedX1-.3,by+.2,0);R.add(piv);piv.rotation.z=.42;/* rakes up toward the rear (local -x) */
  bx(2.3,.24,.3,Y,-1.1,0,0,piv);bx(1.2,.18,.22,mat('#b02e22'),-2.6,0,0,piv);const shv=cyl(.13,.1,Ch,-3.2,0,0,piv);shv.rotation.x=Math.PI/2;
  const ram=tubeMesh(Ch,R);tube(ram,{x:bedX1-.9,y:by+.12,z:0},{x:bedX1-1.6,y:by+.86,z:0},.06);
  const dr=cyl(.16,.5,St,bedX1-.75,by+.36,0,R);dr.rotation.x=Math.PI/2;
  const hook=new THREE.Group();R.add(hook);const tipX=bedX1-.3-Math.cos(.42)*3.2,tipY=by+.2+Math.sin(.42)*3.2;
  const cab=tubeMesh(mat('#3a3c40',{metalness:.7}),R,6);tube(cab,{x:tipX,y:tipY,z:0},{x:x0-.55,y:.75,z:0},.015);
  /* wheel-lift folded up at the back, lights */
  bx(.18,.18,1.7,mat(COL.yellow),x0-.55,.42,0,R);bx(.9,.12,.12,St,x0-.2,.42,0,R);for(const s of[-1,1])bx(.5,.08,.12,mat(COL.yellow),x0-.65,.42,s*.72,R);
  /* light bar on the cab roof: amber/white, flashing (it thinks it's official) */
  const cabX=x0+l*.6,lb=new THREE.Group();lb.position.set(cabX,h+.03,0);R.add(lb);bx(.28,.06,w*.82,mat('#1a1a1a'),0,.03,0,lb);
  const lights=[];for(let i=0;i<4;i++){const m=new THREE.MeshStandardMaterial({color:new THREE.Color(i%3?'#ffd28a':COL.amber),emissive:new THREE.Color(i%3?'#ffe2b0':COL.amber),emissiveIntensity:.3,transparent:true,opacity:.9});
    const pod=new THREE.Mesh(BX,m);pod.scale.set(.22,.1,w*.18);pod.position.set(0,.11,(-1.5+i)*w*.2);lb.add(pod);lights.push(m)}
  /* the company sign on the doors */
  const tex=canvasTex(512,160,(c,W,Hh)=>{c.fillStyle='rgba(0,0,0,0)';c.clearRect(0,0,W,Hh);c.fillStyle='#d33a2c';c.font='bold 70px Arial';c.textAlign='center';c.fillText('QUIK-HOOK',W/2,68);c.fillStyle='#1d1d1d';c.font='bold 38px Arial';c.fillText('TOWING & "IMPOUND"',W/2,116);c.font='italic 24px Arial';c.fillText('licensed*   *pending',W/2,150)});
  for(const s of[-1,1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.33),new THREE.MeshStandardMaterial({map:tex,transparent:true,roughness:.5}));p.position.set(x0+l*.62,.95,s*(w/2+.012));p.rotation.y=s>0?0:Math.PI;R.add(p)}
  R.userData={lights,t:0};return R};
Tow.truckFlash=(R,dt,on)=>{if(!R)return;const u=R.userData;u.t+=dt*(on?9:0);u.lights.forEach((m,i)=>{m.emissiveIntensity=on?(.3+2.4*Math.max(0,Math.sin(u.t+i*Math.PI/2))):.25})};

/* ---------------- free roam: drop a broken-down neighbour's car at its own driveway ---------------- */
function freeDrop(t){const a=A();if(a.mode!=='hub'||!t.home)return null;const d=Math.hypot(t.pos.x-t.home.x,t.pos.z-t.home.z);
  if(d>9)return{txt:'Unhitch '+nameOf(t)+' here'};
  return{txt:'Drop '+t.name+"'s car at home",fn:tt=>{tt.pos.set(tt.home.x,0,tt.home.z);tt.yaw=tt.home.yaw;a.syncCar(tt);
    if(!tt.towThanked){tt.towThanked=true;a.addTrust(1);a.radio(tt.name,["You towed it home yourself? Saved me the flatbed. You're a good egg.","Is that... a minivan with a tow boom? I love this street."][Math.random()<.5?0:1],true)}}}}
S.dropAt=(t,k)=>{if(S.jobDrop)return S.jobDrop(t,k);return freeDrop(t)};
Tow.dropAt=fn=>{S.jobDrop=fn||null};

/* ---------------- hook into the job registry (system-wide) ---------------- */
function bind(){const j=J();if(!j||S.bound)return;S.bound=true;
  j.on('vehicle',(e,dt)=>{try{tick(e,dt)}catch(err){console.warn('[tow]',err)}});
  j.on('interact',p=>interact(p));j.on('hud',st=>{try{hud(st)}catch(_){}});j.on('camera',dt=>camera(dt));
  /* the car you towed: when you get out the tower parks with it still hooked; nothing to do. A level swap drops everything. */
  j.on('pose',()=>{const a=A();if(!a)return;if(S.link&&(!a.L||!S.link.ref.obj||!S.link.ref.obj.parent))Tow.detach('gone',{quiet:true});
    if(!a.CV){guideOff();S.cand=null;winchSnd(false);if(S.link)syncTowed(S.link)}
    for(const [e,r] of S.rigs){if(!e.obj||!e.obj.parent||(!Tow.can(e)&&!(S.link&&S.link.tower===e))){if(r.g.parent)r.g.parent.remove(r.g);S.rigs.delete(e)}}})}
Tow.bind=bind;bind();
Tow.reset=()=>{if(S.link)Tow.detach('reset',{quiet:true});S.cand=null;S.targets=null;S.jobDrop=null;guideOff();winchSnd(false);for(const [e,r] of S.rigs){if(r.g.parent)r.g.parent.remove(r.g)}S.rigs.clear()};
}
})(typeof window!=='undefined'?window:globalThis);
