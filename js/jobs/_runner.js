/* =====================================================================
   HT.Runner: the foot / bike chase helper (SPEC3 4.9, built with Chain Reaction; reused by Hands Off and Porch Light).
   Everything a chase on wheels or on foot needs, independent of any one job:

   HT.Runner.bike(o) -> THREE.Group      a procedural bicycle (merged, vertex-coloured parts: ~12 draw calls animated, 4 static)
       o {size:'adult'|'kid'|'bmx', color, accent, tyre, saddle, streamers:[hex..], card:true, dent:true, sticker:'dino', basket, bell,
          fenders, kickstand, static:true (one merged mesh, no moving parts), lean}
       userData: {R, wheelF, wheelR, crank, pedals:[L,R], steer, lean (roll group), saddle, grips:[L,R] (local points), streamers, size, spin}
   HT.Runner.spin(bike, dt, {spd, steer, lean, pedal}) wheels, crank, pedals, steering, lean, streamer flutter
   HT.Runner.ride(dude, bike, o)          rider IK on an HT.People character: pelvis on the saddle, feet on the pedals, hands on the grips
                                          (call it from the 'pose' hook, after HT.People.update; it undoes itself before the next mixer pass)
   HT.Runner.nav(api, win, o) -> N        a tile grid for chases (walkable, colliders, narrow = no car fits) with A* N.path(a,b,{car})
   HT.Runner.make(api, o) -> R            a fleeing runner on foot or on a bike: picks routes through yards and alleys, prefers the narrow
                                          ones when you're in a car, doubles back, tires when you stay close, can be cut off.
       o {nav, x, z, yaw, mode:'bike'|'foot', speed:{road,walk,grass}, stamina, home:{x,z}, seed}
       R.update(dt, {x,z,car,spd}) -> state 'run'|'winded'|'stopped'|'home'|'lost'    R.stop() R.goHome() R.pos R.yaw R.spd R.lean R.stamina
   HT.Runner.playerBike(api, x, z, yaw, o) -> car entry   a borrowable bicycle (registerCar; type 'bike': its own handling row, a bell
                                          on the horn key, no engine, a narrow body that fits alleys and yard gates)
   Timing only ever advances with the dt passed in. No setTimeout/Date/performance.now.
   ===================================================================== */
(function(){'use strict';const W=window;const HT=W.HT=W.HT||{};if(HT.Runner&&HT.Runner._v)return;
const J=HT.Jobs;const A=()=>J&&J.api;const T=()=>W.THREE;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const wrap=a=>{while(a>Math.PI)a-=6.283185;while(a<-Math.PI)a+=6.283185;return a};
function rng(seed){let s=(seed>>>0)||0x9e3779b9;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}

/* ---------------------------------------------------------------- geometry helpers */
const C={};/* cached shared materials and textures (never disposed: shared by every bike) */
function lin(h){return new (T().Color)(h).convertSRGBToLinear()}
function mats(){if(C.mats)return C.mats;const t=T();
  C.mats={paint:new t.MeshStandardMaterial({vertexColors:true,roughness:.32,metalness:.25}),
    rubber:new t.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:0}),
    chrome:new t.MeshStandardMaterial({vertexColors:true,roughness:.22,metalness:.9}),
    soft:new t.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:0,side:t.DoubleSide})};
  for(const k in C.mats)C.mats[k].name='bike_'+k;return C.mats}
function vcol(g,hex,dark){const c=lin(hex),n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b}
  g.setAttribute('color',new (T().BufferAttribute)(a,3));return g}
/* merge [[geometry, matrix|null, hex], ...] into one non-indexed BufferGeometry with vertex colours */
function merge(parts){const t=T(),P=[],N=[],Cc=[];for(const[g0,m,hex]of parts){let g=g0.index?g0.toNonIndexed():g0.clone();if(m)g.applyMatrix4(m);
    if(!g.attributes.normal)g.computeVertexNormals();if(hex!=null)vcol(g,hex);const p=g.attributes.position.array,n=g.attributes.normal.array,c=g.attributes.color?g.attributes.color.array:null;
    for(let i=0;i<p.length;i++){P.push(p[i]);N.push(n[i]);Cc.push(c?c[i]:1)}g.dispose()}
  const out=new t.BufferGeometry();out.setAttribute('position',new t.Float32BufferAttribute(P,3));out.setAttribute('normal',new t.Float32BufferAttribute(N,3));
  out.setAttribute('color',new t.Float32BufferAttribute(Cc,3));out.computeBoundingSphere();return out}
const V=(x,y,z)=>new (T().Vector3)(x,y,z);
/* a tube between two points (radius r) as a cylinder geometry + matrix */
function tube(a,b,r,seg){const t=T(),d=b.clone().sub(a),L=d.length(),g=new t.CylinderGeometry(r,r,L,seg||8,1,false);
  const q=new t.Quaternion().setFromUnitVectors(V(0,1,0),d.clone().normalize()),m=new t.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),q,V(1,1,1));return[g,m]}
function at(x,y,z,rx,ry,rz,s){const t=T();return new t.Matrix4().compose(V(x,y,z),new t.Quaternion().setFromEuler(new t.Euler(rx||0,ry||0,rz||0)),s&&s.isVector3?s:V(s||1,s||1,s||1))}
/* a curved tube through points */
function curve(pts,r,seg){const t=T();const c=new t.CatmullRomCurve3(pts);return[new t.TubeGeometry(c,seg||12,r,7,false),null]}
/* a canvas texture (cached by key) */
function canvasTex(key,w,h,draw){if(C['t'+key])return C['t'+key];const t=T(),c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  const tx=new t.CanvasTexture(c);tx.encoding=t.sRGBEncoding;tx.anisotropy=4;return C['t'+key]=tx}
function stickerTex(kind){return canvasTex('stk_'+kind,128,96,(g,w,h)=>{g.clearRect(0,0,w,h);
  if(kind==='dino'){/* a green dinosaur on a white die-cut sticker */g.fillStyle='#fff';g.beginPath();g.ellipse(64,50,60,42,0,0,6.283);g.fill();g.fillStyle='#3fa34d';
    g.beginPath();g.moveTo(20,70);g.quadraticCurveTo(30,40,58,44);g.lineTo(70,22);g.quadraticCurveTo(88,14,98,24);g.lineTo(100,34);g.lineTo(84,36);g.lineTo(80,46);g.quadraticCurveTo(96,50,96,58);
    g.lineTo(88,58);g.lineTo(84,52);g.lineTo(78,62);g.lineTo(80,78);g.lineTo(72,78);g.lineTo(68,64);g.lineTo(52,64);g.lineTo(50,80);g.lineTo(42,80);g.lineTo(42,64);g.quadraticCurveTo(30,66,20,70);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(84,26,3,0,6.283);g.fill();g.fillStyle='#e6f7a0';g.font='bold 15px Arial';g.textAlign='center';g.fillText('RAWR',60,92)}
  else if(kind==='lib'){g.fillStyle='#2b6cb0';g.fillRect(4,16,120,64);g.fillStyle='#fff';g.font='bold 20px Arial';g.textAlign='center';g.fillText('BIKE',64,44);g.font='bold 15px Arial';g.fillText('LIBRARY',64,66)}
  else{g.fillStyle='#ffd23f';g.beginPath();for(let k=0;k<=10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k%2?18:40;k?g.lineTo(64+Math.cos(a)*r,48+Math.sin(a)*r):g.moveTo(64+Math.cos(a)*r,48+Math.sin(a)*r)}g.fill()}})}
function cardTex(){return canvasTex('ace',64,90,(g,w,h)=>{g.fillStyle='#fbfaf5';g.fillRect(0,0,w,h);g.strokeStyle='#999';g.lineWidth=2;g.strokeRect(1,1,w-2,h-2);g.fillStyle='#111';
  g.font='bold 16px Georgia';g.fillText('A',5,18);g.beginPath();g.moveTo(32,26);g.bezierCurveTo(14,46,16,60,30,58);g.lineTo(26,70);g.lineTo(38,70);g.lineTo(34,58);g.bezierCurveTo(48,60,50,46,32,26);g.fill()})}

/* ---------------------------------------------------------------- the bicycle */
const SIZES={/* wheel radius, wheelbase, bottom bracket, seat, bars (adult numbers; kid and bmx scale) */
  adult:{R:.34,wb:1.06,bb:.29,seat:.95,bars:1.02,reach:.36,sc:1},
  kid:{R:.25,wb:.80,bb:.23,seat:.66,bars:.80,reach:.26,sc:.74},
  bmx:{R:.255,wb:.92,bb:.29,seat:.80,bars:.98,reach:.30,sc:.86}};
function bike(o){o=o||{};const t=T(),S=SIZES[o.size]||SIZES.adult,R=S.R,k=S.sc,col=o.color||'#c0392b',acc=o.accent||'#f4f1e6',tyre=o.tyre||'#222428',chrome='#c9ced3',dark='#2b2d31';
  const xr=-S.wb/2,xf=S.wb/2,bb=V(-.02*k,S.bb,0),seatC=V(-.21*k,S.seat-.13*k,0),headT=V(xf-.14*k,S.bars-.16*k,0),headB=V(xf-.10*k,S.bars-.32*k,0);
  if(o.size==='bmx'){seatC.set(-.18,S.seat-.18,0);headT.y=S.bars-.26;headB.y=S.bars-.42}
  const axR=V(xr,R,0),axF=V(xf,R,0);
  const P={frame:[],steer:[],wheelF:[],wheelR:[],crank:[],pedalL:[],pedalR:[]};const add=(part,mk,g,m,hex)=>P[part].push({mk,g,m,hex});
  /* frame: top tube, down tube, seat tube, head tube, chain and seat stays (both sides) */
  const tr=.022*Math.max(.8,k),top=(o.size==='kid'?V(headT.x-.04,headT.y-.08,0):headT.clone());
  for(const[a,b,r]of[[seatC,top,tr],[bb,headB,tr*1.15],[bb,seatC.clone().add(V(-.01,.04,0)),tr],[headB,headT,tr*1.25]]){const[g,m]=tube(a,b,r,10);add('frame','paint',g,m,col)}
  for(const z of[-.055,.055]){const ar=V(xr,R,z);let[g,m]=tube(V(bb.x,bb.y,z*.6),ar,tr*.62,8);add('frame','paint',g,m,col);[g,m]=tube(V(seatC.x,seatC.y,z*.4),ar,tr*.55,8);add('frame','paint',g,m,col);
    [g,m]=tube(ar,V(xr,R-.005,z*1.4),.008,6);add('frame','chrome',g,m,chrome)}
  /* seat post + saddle */
  {const top2=V(seatC.x-.03*k,S.seat-.02,0);let[g,m]=tube(seatC,top2,.014,8);add('frame','chrome',g,m,chrome);
    const sg=new t.SphereGeometry(.1,12,8);add('frame','soft',sg,at(top2.x-.01,top2.y+.03,0,0,0,0,V(1.35*k+.25,.32,.75*k+.25)),o.saddle||'#1d1f22');
    const nose=new t.SphereGeometry(.06,10,6);add('frame','soft',nose,at(top2.x+.12*k,top2.y+.03,0,0,0,0,V(1.3,.4,.55)),o.saddle||'#1d1f22')}
  /* bottom bracket shell, chainring (on the right, +z), chain */
  {const g=new t.CylinderGeometry(.03,.03,.1,10);add('frame','chrome',g,at(bb.x,bb.y,0,Math.PI/2,0,0),dark);
    const ring=new t.TorusGeometry(.085*Math.max(.85,k),.009,6,24);add('crank','chrome',ring,at(0,0,.06),'#b8bec4');
    for(let i=0;i<5;i++){const a=i/5*6.283;const[g2,m2]=tube(V(0,0,.06),V(Math.cos(a)*.08*k,Math.sin(a)*.08*k,.06),.007,5);add('crank','chrome',g2,m2,'#b8bec4')}
    const cr=.085*Math.max(.85,k),sr=.035,cz=.062,pts=[];const dx=axR.x-bb.x,dy=axR.y-bb.y,L=Math.hypot(dx,dy),ang=Math.atan2(dy,dx);
    for(let i=0;i<=16;i++){const a=ang+Math.PI/2+i/16*Math.PI;pts.push(V(bb.x+Math.cos(a)*cr,bb.y+Math.sin(a)*cr,cz))}
    for(let i=0;i<=10;i++){const a=ang-Math.PI/2+i/10*Math.PI;pts.push(V(axR.x+Math.cos(a)*sr,axR.y+Math.sin(a)*sr,cz))}pts.push(pts[0].clone());
    const ch=new t.TubeGeometry(new t.CatmullRomCurve3(pts,true),48,.006,4,true);add('frame','chrome',ch,null,'#4a4d52');
    if(o.size!=='bmx'){/* chain guard */const gd=new t.TorusGeometry(cr+.03,.012,4,14,Math.PI*.9);add('frame','paint',gd,at(bb.x,bb.y,cz+.025,0,0,ang+Math.PI*.55),col)}}
  /* crank arms and pedals: the crank part rotates about the bottom bracket; pedals hang level */
  const crankL=.15*Math.max(.75,k);
  {let g=new t.BoxGeometry(.025,crankL,.018);add('crank','chrome',g,at(0,-crankL/2,.085),'#aeb4ba');g=new t.BoxGeometry(.025,crankL,.018);add('crank','chrome',g,at(0,crankL/2,-.085),'#aeb4ba');
    const spindle=new t.CylinderGeometry(.012,.012,.19,8);add('crank','chrome',spindle,at(0,0,0,Math.PI/2,0,0),'#aeb4ba');
    for(const[pp,side]of[['pedalR',1],['pedalL',-1]]){const pg=new t.BoxGeometry(.085,.022,.09);add(pp,'rubber',pg,at(0,0,side*.05),'#1b1c1f');
      const rf=new t.BoxGeometry(.09,.008,.012);for(const zz of[.005,.095])add(pp,'chrome',rf.clone(),at(0,.014,side*zz),'#9ea4aa')}}
  /* wheels: tyre, rim, hub, 28 spokes in two crossing sets (local to the axle) */
  for(const w of['wheelF','wheelR']){const tg=new t.TorusGeometry(R-.028,.028,8,32);add(w,'rubber',tg,null,tyre);if(o.whitewall){const ww=new t.TorusGeometry(R-.05,.008,4,32);add(w,'rubber',ww,at(0,0,.018),'#f2efe6');add(w,'rubber',ww.clone(),at(0,0,-.018),'#f2efe6')}
    const rim=new t.TorusGeometry(R-.055,.012,5,32);add(w,'chrome',rim,null,chrome);const hub=new t.CylinderGeometry(.025,.025,.1,10);add(w,'chrome',hub,at(0,0,0,Math.PI/2,0,0),'#9aa0a6');
    const nS=o.size==='kid'?20:28;for(let i=0;i<nS;i++){const a=i/nS*6.283,side=i%2?1:-1,a2=a+(side>0?.35:-.35);const[g,m]=tube(V(Math.cos(a2)*.022,Math.sin(a2)*.022,side*.04),V(Math.cos(a)*(R-.06),Math.sin(a)*(R-.06),side*.008),.0016,3);add(w,'chrome',g,m,chrome)}
    if(o.reflector){const rg=new t.BoxGeometry(.05,.012,.012);add(w,'paint',rg,at(0,R*.55,.03),'#ff9a1f')}}
  /* the steer part: fork, stem, bars, grips (built in bike space, then moved into the steering frame below) */
  const gripsB=[V(0,0,0),V(0,0,0)];
  {const fo=headB.clone(),fl=V(axF.x,axF.y,0);for(const z of[-.05,.05]){const[g,m]=tube(V(fo.x,fo.y,z*.5),V(fl.x,fl.y+.02,z),tr*.7,8);add('steer','paint',g,m,col)}
    let[g,m]=tube(headT,headT.clone().add(V(-.01,.06*k+.03,0)),.017,8);add('steer','chrome',g,m,chrome);
    const sb=headT.clone().add(V(-.01,.06*k+.03,0));const bh=o.size==='bmx'?.14:.04;
    const barPts=z=>[V(sb.x,sb.y,0),V(sb.x-.01,sb.y+bh*.5,z*.45),V(sb.x-.04*k,sb.y+bh,z*.8),V(sb.x-.11*k,sb.y+bh-.01,z)];
    for(const z of[-1,1]){const pts=barPts(z*(o.size==='bmx'?.27:.29*Math.max(.82,k)));const[cg]=curve(pts,.0115,10);add('steer','chrome',cg,null,chrome);
      const gp=pts[3],gg=new t.CylinderGeometry(.018,.018,.11,8);const q=pts[3].clone().sub(pts[2]).normalize();const mm=new t.Matrix4().compose(gp.clone().add(q.clone().multiplyScalar(.02)),new t.Quaternion().setFromUnitVectors(V(0,1,0),q),V(1,1,1));
      add('steer','rubber',gg,mm,o.grips||'#e8e2d6');gripsB[z<0?0:1]=gp.clone().add(q.clone().multiplyScalar(.02))}
    if(o.size==='bmx'){const[cg,cm]=tube(barPts(-1)[2].clone().setZ(-.2),barPts(1)[2].clone().setZ(.2),.01,6);add('steer','chrome',cg,cm,chrome)}
    if(o.bell){const bg=new t.SphereGeometry(.03,10,6,0,6.283,0,Math.PI/2);add('steer','chrome',bg,at(sb.x-.02,sb.y+bh+.02,-.12),'#d8dde2')}
    if(o.basket){/* wire basket on the front */const bx=sb.x+.12,by=sb.y-.08;const fr=new t.BoxGeometry(.3,.02,.36);add('steer','chrome',fr,at(bx,by-.1,0),'#cfd4d8');
      for(const yy of[-.08,0,.08]){const ri=new t.TorusGeometry(.2,.006,3,20);add('steer','chrome',ri,at(bx,by+yy*.8,0,Math.PI/2,0,0,V(.78,.92,1)),'#cfd4d8')}
      for(let i=0;i<10;i++){const a=i/10*6.283;const[g2,m2]=tube(V(bx+Math.cos(a)*.15,by-.1,Math.sin(a)*.18),V(bx+Math.cos(a)*.16,by+.08,Math.sin(a)*.19),.005,3);add('steer','chrome',g2,m2,'#cfd4d8')}}
    if(o.fenders||o.dent){/* front fender: a partial torus over the wheel; o.dent pushes a section in and scuffs it */
      const fg=new t.TorusGeometry(R+.02,.035,5,24,Math.PI*.72);const pos=fg.attributes.position,cc=[];const base=lin(col),scuff=lin('#6b2a24');
      for(let i=0;i<pos.count;i++){let x=pos.getX(i),y=pos.getY(i);const a=Math.atan2(y,x),r=Math.hypot(x,y);let d=0;if(o.dent){const da=a-.75;d=Math.exp(-da*da*40)}
        const r2=r-d*.035;pos.setXY(i,Math.cos(a)*r2,Math.sin(a)*r2);pos.setZ(i,pos.getZ(i)*1.4);const c=base.clone().lerp(scuff,d*.8);cc.push(c.r,c.g,c.b)}
      fg.setAttribute('color',new t.Float32BufferAttribute(cc,3));fg.computeVertexNormals();add('steer','paint',fg,at(axF.x,axF.y,0,0,0,Math.PI*.14),null)}}
  /* rear fender, kickstand, rear reflector */
  if(o.fenders){const rf=new t.TorusGeometry(R+.02,.033,5,24,Math.PI*.7);add('frame','paint',rf,at(axR.x,axR.y,0,0,0,Math.PI*.18,V(1,1,1.4)),col)}
  if(o.kickstand!==false){const[g,m]=tube(V(bb.x-.06,bb.y-.02,-.06),V(bb.x-.2,.02,-.16),.009,5);add('frame','chrome',g,m,'#8c9298')}
  {const rg=new t.BoxGeometry(.012,.05,.07);add('frame','paint',rg,at(seatC.x-.06,seatC.y-.02,0),'#d0261c')}
  /* accent stripe on the down tube */
  {const a=bb.clone().lerp(headB,.35),b=bb.clone().lerp(headB,.75);const[g,m]=tube(a,b,tr*1.2,10);add('frame','paint',g,m,acc)}

  /* ---- assemble: parts merged per material ---- */
  const M=mats(),root=new t.Group();root.name='bike';const leanG=new t.Group();root.add(leanG);
  const build=(list,parent)=>{const by={};for(const p of list)(by[p.mk]||(by[p.mk]=[])).push([p.g,p.m,p.hex]);const out=[];
    for(const mk in by){const g=merge(by[mk]);const me=new t.Mesh(g,M[mk]);me.castShadow=true;me.receiveShadow=false;parent.add(me);out.push(me)}return out};
  /* the steering frame: pivot at the head tube, local y along the head tube */
  const headDir=headT.clone().sub(headB).normalize(),pivot=headB.clone(),qS=new t.Quaternion().setFromUnitVectors(V(0,1,0),headDir),mS=new t.Matrix4().compose(pivot,qS,V(1,1,1)),inv=new t.Matrix4().copy(mS).invert();
  const steerBase=new t.Group();steerBase.position.copy(pivot);steerBase.quaternion.copy(qS);leanG.add(steerBase);const steer=new t.Group();steerBase.add(steer);
  if(o.static){/* one merged mesh per material: parked bikes, the garage, the school rack */
    const all=[...P.frame,...P.steer];
    const off=(list,mm)=>{for(const p of list)all.push({mk:p.mk,g:p.g,m:p.m?new t.Matrix4().multiplyMatrices(mm,p.m):mm,hex:p.hex})};
    off(P.wheelF,at(axF.x,axF.y,0,0,0,.3));off(P.wheelR,at(axR.x,axR.y,0,0,0,1.1));const cA=-.6;off(P.crank,at(bb.x,bb.y,0,0,0,cA));
    off(P.pedalR,at(bb.x+crankL*Math.sin(cA),bb.y-crankL*Math.cos(cA),.105));off(P.pedalL,at(bb.x-crankL*Math.sin(cA),bb.y+crankL*Math.cos(cA),-.105));
    build(all,leanG)}
  else{build(P.frame,leanG);
    for(const p of P.steer)p.m=p.m?new t.Matrix4().multiplyMatrices(inv,p.m):inv.clone();build(P.steer,steer);
    const wF=new t.Group();wF.position.copy(V(axF.x,axF.y,0)).applyMatrix4(inv);steer.add(wF);build(P.wheelF,wF);
    const wR=new t.Group();wR.position.copy(axR);leanG.add(wR);build(P.wheelR,wR);
    const cr=new t.Group();cr.position.copy(bb);leanG.add(cr);build(P.crank,cr);
    const pR=new t.Group(),pL=new t.Group();leanG.add(pR);leanG.add(pL);build(P.pedalR,pR);build(P.pedalL,pL);
    root.userData.wheelF=wF;root.userData.wheelR=wR;root.userData.crank=cr;root.userData.pedals=[pL,pR];root.userData.steer=steer}
  /* decals and extras with their own materials */
  if(o.sticker){const mt=new t.MeshStandardMaterial({map:stickerTex(o.sticker),transparent:true,roughness:.5,alphaTest:.3});C['sm_'+o.sticker]=mt;
    const a=bb.clone().lerp(headB,.55),dir=headB.clone().sub(bb).normalize();for(const z of[1,-1]){const s=new t.Mesh(new t.PlaneGeometry(.13*Math.max(.8,k),.095*Math.max(.8,k)),mt);
      s.position.set(a.x,a.y,z*(tr*1.15+.003));s.rotation.set(0,z>0?0:Math.PI,Math.atan2(dir.y,dir.x)*(z>0?1:-1));leanG.add(s)}}
  if(o.card&&!o.static){/* the ace of spades clothes-pinned to the rear stay, sticking into the spokes */const mt=C.cardM||(C.cardM=new t.MeshStandardMaterial({map:cardTex(),roughness:.6,side:t.DoubleSide}));
    const cd=new t.Mesh(new t.PlaneGeometry(.062,.088),mt);cd.position.set(axR.x+R*.42,axR.y+R*.42,.03);cd.rotation.set(0,0,-.9);leanG.add(cd);root.userData.card=cd;
    const pin=new t.Mesh(new t.BoxGeometry(.03,.012,.016),M.paint);vcol(pin.geometry,'#d9b67a');pin.position.set(axR.x+R*.62,axR.y+R*.6,.03);pin.rotation.z=-.9;leanG.add(pin)}
  else if(o.card){const mt=C.cardM||(C.cardM=new t.MeshStandardMaterial({map:cardTex(),roughness:.6,side:t.DoubleSide}));const cd=new t.Mesh(new t.PlaneGeometry(.062,.088),mt);cd.position.set(axR.x+R*.42,axR.y+R*.42,.03);cd.rotation.z=-.9;leanG.add(cd)}
  const strm=[];if(o.streamers&&o.streamers.length){/* tassels out of both grip ends: thin ribbons that flutter with speed */
    const sb=headT.clone().add(V(-.01,.06*k+.03,0)),bh=o.size==='bmx'?.14:.04,gx=sb.x-.11*k-.06,gy=sb.y+bh-.01;const geo=new t.PlaneGeometry(.012,.22);geo.translate(0,-.11,0);
    for(const z of[-1,1]){const g=new t.Group();g.position.copy(V(gx,gy,z*.29*Math.max(.82,k)+z*.06)).applyMatrix4(inv);steer.add(g);
      o.streamers.forEach((hex,i)=>{const ms=C['st_'+hex]||(C['st_'+hex]=new t.MeshStandardMaterial({color:lin(hex),roughness:.5,metalness:.35,side:t.DoubleSide}));
        const r=new t.Mesh(geo,ms);r.rotation.set(.15*(i-1),i*1.1,.25*(i-1));g.add(r);strm.push({m:r,i,z})})}}
  root.userData.streamers=strm;root.userData.geoShared=[];
  const grips=o.static?gripsB:gripsB.map(p=>p.clone().applyMatrix4(inv));
  Object.assign(root.userData,{R,lean:leanG,saddle:V(seatC.x-.04*k,S.seat+.05,0),grips,bb,crankL,spin:{w:0,c:0,steer:0,lean:0},len:S.wb+2*R,isBike:true,
    size3:{l:S.wb+2*R,w:.62,h:S.bars+.1}});
  root.userData.size=root.userData.size3;/* the game's carSize() reads userData.size {l,w,h} */
  root.userData.kind=o.size||'adult';
  root.traverse(m=>{if(m.isMesh){m.castShadow=true}});
  return root}
/* dispose a bike's own geometries (materials and textures are shared caches) */
function disposeBike(b){if(!b)return;b.traverse(m=>{if(m.isMesh&&m.geometry&&!m.geometry._shared)m.geometry.dispose()});if(b.parent)b.parent.remove(b)}
/* wheels roll, the crank turns, pedals stay level, bars steer, the frame leans, streamers flutter */
function spin(b,dt,o){const u=b.userData,s=u.spin;if(!u.wheelR)return;const v=o.spd||0;s.w+=v/u.R*dt;
  const ped=o.pedal!=null?o.pedal:(v>.4?1:0);s.c+=(ped?v/(u.R*2.4):0)*dt;s.steer+=((o.steer||0)-s.steer)*Math.min(1,dt*10);s.lean+=((o.lean||0)-s.lean)*Math.min(1,dt*6);
  u.wheelF.rotation.z=-s.w;u.wheelR.rotation.z=-s.w;u.crank.rotation.z=-s.c;const L=u.crankL;
  /* the crank arm on +z points down at c=0 and turns with -c about z; the pedals stay level */
  const ca=-s.c;u.pedals[1].position.set(u.bb.x+L*Math.sin(ca),u.bb.y-L*Math.cos(ca),.105);u.pedals[0].position.set(u.bb.x-L*Math.sin(ca),u.bb.y+L*Math.cos(ca),-.105);
  u.steer.rotation.y=s.steer;u.lean.rotation.x=s.lean;
  if(u.card)u.card.rotation.x=v>1?Math.sin(s.w*7)*.25:0;
  for(const r of u.streamers){const f=clamp(Math.abs(v)/7,0,1);r.m.rotation.z=(.25*(r.i-1))*(1-f)+r.z*f*1.25+Math.sin(s.w*2.3+r.i*1.7)*.18*f;r.m.rotation.x=.15*(r.i-1)+Math.sin(s.w*3.1+r.i)*.25*f}}
/* pedal world positions (for IK), grips, saddle */
const _v=()=>V(0,0,0);
function points(b){const u=b.userData;b.updateMatrixWorld(true);const lg=u.lean;
  const pl=_v(),pr=_v();u.pedals?(u.pedals[0].getWorldPosition(pl),u.pedals[1].getWorldPosition(pr)):(pl.copy(u.bb).applyMatrix4(lg.matrixWorld),pr.copy(pl));
  const sad=u.saddle.clone().applyMatrix4(lg.matrixWorld);
  const g=u.grips.map(p=>p.clone().applyMatrix4(u.steer?u.steer.matrixWorld:lg.matrixWorld));/* the grips turn with the bars */
  return{pl,pr,sad,gl:g[0],gr:g[1],fwd:V(1,0,0).transformDirection(lg.matrixWorld),up:V(0,1,0).transformDirection(lg.matrixWorld),right:V(0,0,1).transformDirection(lg.matrixWorld)}}

/* ---------------------------------------------------------------- rider IK (HT.People characters) */
const RIG=['Bip01_Pelvis','Bip01_Spine','Bip01_Spine1','Bip01_Neck','Bip01_Head','Bip01_L_Thigh','Bip01_L_Calf','Bip01_L_Foot','Bip01_R_Thigh','Bip01_R_Calf','Bip01_R_Foot',
  'Bip01_L_Toe0','Bip01_R_Toe0','Bip01_L_UpperArm','Bip01_L_Forearm','Bip01_L_Hand','Bip01_R_UpperArm','Bip01_R_Forearm','Bip01_R_Hand','Bip01_L_Clavicle','Bip01_R_Clavicle'];
const riders=new Set();
function rigOf(d){if(d._rideRig)return d._rideRig;const body=d.rb&&(d.rb.body||d.body)||d.body||d.root;const B={};if(!body)return null;for(const n of RIG){const o=body.getObjectByName(n);if(o)B[n]=o}
  if(!B.Bip01_L_Thigh||!B.Bip01_L_Calf||!B.Bip01_L_Foot)return null;d._rideRig={B,saved:{},out:{}};return d._rideRig}
/* undo last frame's IK if nothing else wrote the bone since (the mixer skips unchanged bones; see js/social.js tells) */
function unride(d){const r=d._rideRig;if(!r||!r.has)return;for(const n in r.out){const b=r.B[n];if(b&&b.quaternion.equals(r.out[n]))b.quaternion.copy(r.saved[n])}r.has=false}
const _q=()=>new (T().Quaternion)();
function aimBone(b,from,to){/* rotate bone b (world) so the world vector `from` turns into `to` */const t=T();const q=new t.Quaternion().setFromUnitVectors(from.clone().normalize(),to.clone().normalize());
  const wq=b.getWorldQuaternion(_q()),pq=b.parent.getWorldQuaternion(_q());const nw=q.multiply(wq);b.quaternion.copy(pq.invert().multiply(nw));b.updateMatrixWorld(true)}
function ik2(up,lo,end,target,pole){const a=up.getWorldPosition(_v()),b=lo.getWorldPosition(_v()),c=end.getWorldPosition(_v());const l1=a.distanceTo(b),l2=b.distanceTo(c);
  const d0=target.clone().sub(a),d=clamp(d0.length(),Math.abs(l1-l2)+.01,l1+l2-.005),dir=d0.normalize();
  const cosA=clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1),sinA=Math.sqrt(1-cosA*cosA);const pp=pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir)));if(pp.lengthSq()<1e-6)pp.set(0,1,0);pp.normalize();
  const knee=a.clone().add(dir.clone().multiplyScalar(l1*cosA)).add(pp.multiplyScalar(l1*sinA));
  aimBone(up,b.clone().sub(a),knee.clone().sub(a));const b2=lo.getWorldPosition(_v()),c2=end.getWorldPosition(_v());aimBone(lo,c2.clone().sub(b2),a.clone().add(dir.clone().multiplyScalar(d)).sub(b2))}
function rotW(b,axis,ang){if(!b||Math.abs(ang)<1e-5)return;const t=T();const pq=b.parent.getWorldQuaternion(_q());const ax=axis.clone().applyQuaternion(pq.clone().invert());b.quaternion.premultiply(new t.Quaternion().setFromAxisAngle(ax,ang));b.updateMatrixWorld(true)}
/* place a rider on a bike: o {yaw (character yaw), lean (bike roll), stand: 0..1 (out of the saddle), look:{x,y,z}|null, coast: feet still} */
function ride(d,b,o){o=o||{};const r=rigOf(d);if(!r||!b||!d.root)return false;const B=r.B;unride(d);
  for(const n in B){const q=r.saved[n]||(r.saved[n]=_q());q.copy(B[n].quaternion)}r.has=true;
  const p=points(b);d.root.updateMatrixWorld(true);
  /* pelvis on the saddle */
  const pel=(B.Bip01_Pelvis||B.Bip01_L_Thigh).getWorldPosition(_v());const want=p.sad.clone().add(p.up.clone().multiplyScalar(.07+(o.stand||0)*.18)).add(p.fwd.clone().multiplyScalar(-.03+(o.stand||0)*.06));
  d.root.position.add(want.sub(pel));d.root.updateMatrixWorld(true);
  /* lean into the turn and forward over the bars */
  if(o.lean)rotW(B.Bip01_Pelvis,p.fwd,o.lean);
  rotW(B.Bip01_Spine,p.right,-(o.hunch!=null?o.hunch:.38));if(B.Bip01_Neck)rotW(B.Bip01_Neck,p.right,(o.hunch!=null?o.hunch:.38)*.55);
  /* legs to the pedals (knees forward and a little out), arms to the grips (elbows back, down and out) */
  const kneeL=p.fwd.clone().add(p.up.clone().multiplyScalar(.4)).add(p.right.clone().multiplyScalar(-.18)),kneeR=p.fwd.clone().add(p.up.clone().multiplyScalar(.4)).add(p.right.clone().multiplyScalar(.18));
  const ankle=p.up.clone().multiplyScalar(.06);
  if(B.Bip01_L_Thigh)ik2(B.Bip01_L_Thigh,B.Bip01_L_Calf,B.Bip01_L_Foot,p.pl.clone().add(ankle),kneeL);
  if(B.Bip01_R_Thigh)ik2(B.Bip01_R_Thigh,B.Bip01_R_Calf,B.Bip01_R_Foot,p.pr.clone().add(ankle),kneeR);
  for(const side of['L','R']){const ft=B['Bip01_'+side+'_Foot'],toe=B['Bip01_'+side+'_Toe0'];if(!ft||!toe)continue;/* the sole flat on the pedal: the toes point along the bike */
    const dir=toe.getWorldPosition(_v()).sub(ft.getWorldPosition(_v()));const flat=p.fwd.clone().add(p.up.clone().multiplyScalar(-.25));if(dir.lengthSq()>1e-4)aimBone(ft,dir,flat)}
  const elbowL=p.fwd.clone().multiplyScalar(-1).add(p.up.clone().multiplyScalar(-.6)).add(p.right.clone().multiplyScalar(-.7)),elbowR=p.fwd.clone().multiplyScalar(-1).add(p.up.clone().multiplyScalar(-.6)).add(p.right.clone().multiplyScalar(.7));
  if(B.Bip01_L_UpperArm&&B.Bip01_L_Forearm&&B.Bip01_L_Hand)ik2(B.Bip01_L_UpperArm,B.Bip01_L_Forearm,B.Bip01_L_Hand,p.gl,elbowL);
  if(B.Bip01_R_UpperArm&&B.Bip01_R_Forearm&&B.Bip01_R_Hand)ik2(B.Bip01_R_UpperArm,B.Bip01_R_Forearm,B.Bip01_R_Hand,p.gr,elbowR);
  if(o.look&&B.Bip01_Head){/* glance over the shoulder */rotW(B.Bip01_Head,p.up,o.look)}
  for(const n in B){const q=r.out[n]||(r.out[n]=_q());q.copy(B[n].quaternion)}riders.add(d);return true}
function release(d){if(!d)return;unride(d);riders.delete(d);d._rideRig=null}

/* ---------------------------------------------------------------- chase nav: a tile grid with costs and a narrow flag */
const COST={',':1,s:1.08,l:1.08,p:1.1,g:1.45,'.':1.2,o:2.2,S:1.3,v:1.1,V:1.1,P:1.1,d:1.2,k:1.2,i:1.2};
function nav(a,win,o){o=o||{};const L=a.L,g=L.g,x0=win.x0,z0=win.z0,w=win.x1-win.x0+1,h=win.z1-win.z0+1,n=w*h;const pass=new Uint8Array(n),cost=new Float32Array(n),narrow=new Uint8Array(n);const TL=2;
  const cg=L.cgrid,cols=L.colliders;const blockedAt=(x,z,r)=>{const list=cg?cg({x,z},r):cols;for(const c of list){if(c.off||c.ob)continue;if(c.h!=null&&c.h<.35)continue;if(x+r>c.x0&&x-r<c.x1&&z+r>c.z0&&z-r<c.z1)return true}return false};
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const X=x0+i,Z=z0+j,k=j*w+i;if(!a.walkable(X,Z))continue;const cx=X*TL+1,cz=Z*TL+1;if(blockedAt(cx,cz,o.r||.45))continue;
    pass[k]=1;const ch=g[Z]&&g[Z][X];cost[k]=COST[ch]||1.3}
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const k=j*w+i;if(!pass[k])continue;let free=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const ii=i+dx,jj=j+dz;if(ii>=0&&jj>=0&&ii<w&&jj<h&&pass[jj*w+ii])free++}
    narrow[k]=free<9?1:0}
  const N={x0,z0,w,h,pass,cost,narrow,win};
  N.k=(x,z)=>{const i=Math.floor(x/TL)-x0,j=Math.floor(z/TL)-z0;return i<0||j<0||i>=w||j>=h?-1:j*w+i};
  N.c=k=>({x:(x0+k%w)*TL+1,z:(z0+Math.floor(k/w))*TL+1});
  N.ok=k=>k>=0&&pass[k]===1;
  N.snap=(x,z)=>{let k=N.k(x,z);if(N.ok(k))return k;const i0=Math.floor(x/TL)-x0,j0=Math.floor(z/TL)-z0;for(let r=1;r<8;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;const i=i0+dx,j=j0+dz;if(i<0||j<0||i>=w||j>=h)continue;k=j*w+i;if(pass[k])return k}return-1};
  /* line of sight on the grid (for string pulling): every tile the segment touches must pass */
  N.line=(ax,az,bx,bz)=>{const d=Math.hypot(bx-ax,bz-az),st=Math.max(1,Math.ceil(d/.6));for(let s=1;s<st;s++){const t_=s/st,x=ax+(bx-ax)*t_,z=az+(bz-az)*t_;for(const[ox,oz]of[[.32,.32],[-.32,.32],[.32,-.32],[-.32,-.32]])if(!N.ok(N.k(x+ox,z+oz)))return false}return true};
  /* A*: 8-way, no corner cutting. o.costAt(k) multiplies the tile cost (avoid the pursuer, prefer narrow when he drives) */
  const gS=new Float32Array(n),from=new Int32Array(n),seen=new Uint32Array(n);let stamp=1;
  N.path=(ax,az,bx,bz,po)=>{po=po||{};const s=N.snap(ax,az),e=N.snap(bx,bz);if(s<0||e<0)return null;stamp++;const heap=[];const push=(k,f)=>{heap.push([f,k]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p}};
    const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=i*2+1,r=l+1;let m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m}}return top};
    const ex=e%w,ez=Math.floor(e/w);gS[s]=0;from[s]=-1;seen[s]=stamp;push(s,0);let found=false,budget=po.budget||9000;
    while(heap.length&&budget-->0){const[,k]=pop();if(k===e){found=true;break}const i=k%w,j=Math.floor(k/w);
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const ii=i+dx,jj=j+dz;if(ii<0||jj<0||ii>=w||jj>=h)continue;const nk=jj*w+ii;if(!pass[nk])continue;
        if(dx&&dz&&(!pass[j*w+ii]||!pass[jj*w+i]))continue;let c=cost[nk]*(dx&&dz?1.414:1);if(po.costAt)c*=po.costAt(nk);const ng=gS[k]+c;
        if(seen[nk]===stamp&&ng>=gS[nk])continue;seen[nk]=stamp;gS[nk]=ng;from[nk]=k;push(nk,ng+Math.hypot(ii-ex,jj-ez))}}
    if(!found)return null;const cells=[];for(let k=e;k>=0;k=from[k])cells.push(k);cells.reverse();
    const pts=cells.map(N.c);pts[pts.length-1]={x:bx,z:bz};if(!N.ok(N.k(bx,bz)))pts[pts.length-1]=N.c(e);
    /* string-pull */const out=[pts[0]];let i=0;while(i<pts.length-1){let j=pts.length-1;while(j>i+1&&!N.line(pts[i].x,pts[i].z,pts[j].x,pts[j].z))j--;out.push(pts[j]);i=j}
    return{pts:out,cells,len:out.reduce((s,p,q)=>q?s+Math.hypot(p.x-out[q-1].x,p.z-out[q-1].z):0,0)}};
  return N}

/* ---------------------------------------------------------------- the runner */
function make(a,o){o=o||{};const N=o.nav,rnd=rng(o.seed||7);const sp=Object.assign(o.mode==='bike'?{road:8.2,walk:7.4,grass:5.8,turn:3.1,accel:5.5}:{road:6.2,walk:6.2,grass:5.6,turn:6,accel:9},o.speed||{});
  const R={mode:o.mode||'bike',pos:{x:o.x,z:o.z},yaw:o.yaw||0,spd:0,lean:0,steer:0,stamina:o.stamina!=null?o.stamina:100,state:'run',path:null,pi:0,goal:null,
    t:0,repathT:0,stuckT:0,last:{x:o.x,z:o.z},home:o.home||null,goals:0,doubles:0,cutoffs:0,hop:0,carT:0,narrowT:0,log:[],tired:0};
  const tileK=()=>N.k(R.pos.x,R.pos.z);
  function chooseGoal(pu){/* candidates on a ring, scored away from the pursuer; narrow tiles when he drives; sometimes double back */
    let best=null,bs=-1e9;const car=pu&&pu.car,dx0=R.pos.x-(pu?pu.x:R.pos.x),dz0=R.pos.z-(pu?pu.z:R.pos.z),dp=Math.hypot(dx0,dz0)||1,ax=dx0/dp,az=dz0/dp;
    const dbl=pu&&!car&&dp>18&&rnd()<.28;/* far enough ahead: loop back past him on another street */
    for(let n=0;n<40;n++){const ang=rnd()*6.283,rad=18+rnd()*26,x=R.pos.x+Math.cos(ang)*rad,z=R.pos.z+Math.sin(ang)*rad,k=N.k(x,z);if(!N.ok(k))continue;const c=N.c(k);
      const vx=c.x-R.pos.x,vz=c.z-R.pos.z,vl=Math.hypot(vx,vz)||1,away=(vx*ax+vz*az)/vl;
      /* the closest the straight line passes to the pursuer */let close=99;if(pu){const t_=clamp(((pu.x-R.pos.x)*vx+(pu.z-R.pos.z)*vz)/(vl*vl),0,1);close=Math.hypot(R.pos.x+vx*t_-pu.x,R.pos.z+vz*t_-pu.z)}
      let s=(dbl?(-away*6):away*14)+Math.min(close,20)*.9+rnd()*7;if(close<7)s-=40;if(car&&N.narrow[k])s+=16;if(car&&!N.narrow[k])s-=4;
      if(o.bounds&&(c.x<o.bounds.x0||c.x>o.bounds.x1||c.z<o.bounds.z0||c.z>o.bounds.z1))s-=60;
      if(s>bs){bs=s;best=c}}
    if(dbl)R.doubles++;return best}
  function repath(pu){const g=chooseGoal(pu);if(!g)return false;const car=pu&&pu.car;
    const p=N.path(R.pos.x,R.pos.z,g.x,g.z,{costAt:k=>{let m=1;if(pu){const c=N.c(k),d=Math.hypot(c.x-pu.x,c.z-pu.z);if(d<9)m+=(9-d)*.9}if(car)m*=N.narrow[k]?.7:1.5;return m},budget:7000});
    if(!p||p.pts.length<2)return false;R.path=p.pts;R.pi=1;R.goal=g;R.goals++;R.repathT=0;return true}
  R.goHome=(x,z)=>{if(x!=null)R.home={x,z};if(!R.home)return false;const p=N.path(R.pos.x,R.pos.z,R.home.x,R.home.z,{budget:20000});if(!p)return false;R.path=p.pts;R.pi=1;R.state='homing';return true};
  R.stop=()=>{R.state='stopped';R.path=null};
  R.update=(dt,pu)=>{R.t+=dt;const st=R.state;if(st==='stopped'||st==='home'||st==='winded'){R.spd=Math.max(0,R.spd-dt*6);R.lean*=.9;return R.state}
    const d=pu?Math.hypot(pu.x-R.pos.x,pu.z-R.pos.z):99;
    /* stamina: drains while you're on him, recovers when you're not */
    if(st==='run'){const drain=d<8?(pu&&pu.car?2.2:4.6):d<16?2.4:d<30?.9:-2.2;R.stamina=clamp(R.stamina-drain*dt*(o.drain||1),0,100);if(R.stamina<14)R.tired+=dt}
    R.repathT+=dt;const end=!R.path||R.pi>=R.path.length;
    /* cut off: he's heading straight at you -> turn round */
    let cut=false;if(st==='run'&&pu&&R.path&&R.pi<R.path.length&&d<11){const w=R.path[R.pi],hx=w.x-R.pos.x,hz=w.z-R.pos.z,hl=Math.hypot(hx,hz)||1,px=pu.x-R.pos.x,pz=pu.z-R.pos.z;if((hx*px+hz*pz)/(hl*d)>.6&&d<hl+3){cut=true;R.cutoffs++}}
    if(st==='run'&&(end||cut||R.repathT>(d<14?2.2:5)))repath(pu);
    if(st==='homing'&&end){R.state='home';return R.state}
    if(!R.path||R.pi>=R.path.length){R.spd=Math.max(0,R.spd-dt*4);return R.state}
    /* steer toward the next point (look ahead past points within reach) */
    let w=R.path[R.pi];while(R.pi<R.path.length-1&&Math.hypot(w.x-R.pos.x,w.z-R.pos.z)<1.4){R.pi++;w=R.path[R.pi]}
    if(R.pi===R.path.length-1&&Math.hypot(w.x-R.pos.x,w.z-R.pos.z)<.8){R.pi++;return R.state}
    const want=Math.atan2(-(w.x-R.pos.x),-(w.z-R.pos.z)),err=wrap(want-R.yaw),tr=sp.turn*dt;const turn=clamp(err,-tr,tr);R.yaw=wrap(R.yaw+turn);R.steer=clamp(err,-.6,.6);
    const k=tileK(),ch=k>=0?(a.L.g[N.z0+Math.floor(k/N.w)]||[])[N.x0+k%N.w]:',';let top=ch===','?sp.road:ch==='g'||ch==='o'?sp.grass:sp.walk;
    top*=(.5+.5*R.stamina/100);if(R.state==='homing')top*=.85;top*=clamp(1-Math.abs(err)*.55,.4,1);if(R.tired>0&&R.stamina<14)top=Math.min(top,3.2+Math.sin(R.t*3)*.5);
    R.spd+=clamp(top-R.spd,-sp.accel*1.6*dt,sp.accel*dt);
    const fx=-Math.sin(R.yaw),fz=-Math.cos(R.yaw),p0={x:R.pos.x,z:R.pos.z},p={x:R.pos.x+fx*R.spd*dt,z:R.pos.z+fz*R.spd*dt};a.collide(p,R.mode==='bike'?.38:.33);
    /* a bike can't climb a curb sideways: if the move would put him on a blocked tile, slide along */
    if(!N.ok(N.k(p.x,p.z))){const q={x:p0.x+fx*R.spd*dt,z:p0.z};const q2={x:p0.x,z:p0.z+fz*R.spd*dt};if(N.ok(N.k(q.x,q.z)))Object.assign(p,q);else if(N.ok(N.k(q2.x,q2.z)))Object.assign(p,q2);else Object.assign(p,p0)}
    R.pos.x=p.x;R.pos.z=p.z;R.lean+=(clamp(-turn/dt*R.spd*.045,-.45,.45)-R.lean)*Math.min(1,dt*5);
    const moved=Math.hypot(p.x-p0.x,p.z-p0.z);if(moved<R.spd*dt*.25&&R.spd>1){R.stuckT+=dt;if(R.stuckT>.7){R.stuckT=0;R.spd=1;if(R.state==='homing')R.goHome();else repath(pu)}}else R.stuckT=Math.max(0,R.stuckT-dt);
    if(st==='run'&&R.stamina<=0&&d<3.2)R.state='winded';
    return R.state};
  return R}

/* ---------------------------------------------------------------- the player's bike: a borrowable car entry of type 'bike' */
const FEEL={label:'bike',seats:1,bed:0,max:8.6,boostMax:10.2,acc:4.6,boostAcc:6.2,brake:11,hbrake:13,turn:2.7,steerResp:12,grip:9.5,roll:0,cam:[3.6,.95],eng:1,gears:1,horn:'bell',door:'close',rear:1,torque:0};
function glue(){const a=A();if(!a||typeof a.carFeel!=='function'||glue.done)return;a.carFeel('bike',FEEL,[[-.18,.92,0]]);glue.done=true}
function bikeStats(s){if(!s)return s;s.maxSpeed=FEEL.max;s.boostMax=FEEL.boostMax;s.accel=FEEL.acc;s.boostAccel=FEEL.boostAcc;s.brake=FEEL.brake;s.hbrake=FEEL.hbrake;s.turn=FEEL.turn;s.grip=FEEL.grip;s.steerResp=FEEL.steerResp;
  s.turnFade=.15;s.coast=2.2;s.revMax=1.6;s.revAccel=2.5;s.len=1.25;s.wid=.62;s.mass=.15;s.ramMult=.1;return s}
function playerBike(a,x,z,yaw,o){glue();o=o||{};const b=bike(Object.assign({size:'adult',color:'#2f6f8f',accent:'#f4f1e6',bell:true,basket:true,fenders:true,whitewall:true,saddle:'#6b4a32',grips:'#6b4a32'},o));
  b.position.set(x,0,z);b.rotation.y=yaw+Math.PI/2;const e=a.registerCar(b,x,z);if(!e)return null;e.type='bike';e.name=o.owner||'Earl';e.owner=o.ownerKind||'job';e.yaw=yaw;e.home={x,z,yaw};e.bike=true;e._roof=[9];
  a.syncCar(e);return e}
/* every frame while you ride: narrow body, wheels and crank, lean, the rider pose (in the pose hook) */
function riding(){const a=A();const cv=a&&a.CV;return cv&&cv.type==='bike'&&cv.obj&&cv.obj.userData.isBike?cv:null}
if(J&&J.on){
  J.on('vehicle',(car,dt)=>{if(!car||car.type!=='bike'||!car.obj||!car.obj.userData.isBike)return;bikeStats(car.stats);bikeStats(car.base);car._seatObj=car.obj;car._roof=[9];
    if(car.car&&car.car.stats)bikeStats(car.car.stats)});
  J.on('pose',dt=>{const a=A();if(!a)return;const cv=riding();for(const d of[...riders])if(!cv||d!==a.P.dude)if(!d._rideKeep){unride(d)}
    if(!cv)return;const u=cv.obj.userData,c=cv.car||{},v=cv.spd||0;const lean=clamp(-(c.steer||cv.steer||0)*Math.abs(v)*.05,-.4,.4);
    spin(cv.obj,dt,{spd:v,steer:(cv.steer||0)*.55,lean,pedal:(a.keys.w||a.keys.arrowup)&&v>-.2?1:Math.abs(v)>.5&&a.keys.shift?1:0});
    const d=a.P.dude;if(d&&d.root.visible)ride(d,cv.obj,{lean,stand:a.keys.shift&&v>3?.6:0,hunch:a.keys.shift?.55:.36})});
  /* the engine voice: a bicycle has none. Keep the road, skid and crash layers; the horn is a bell; the freehub ticks when you coast */
  (function voice(){const Au=HT.Audio;if(!Au||!Au.vehicle||Au.vehicle._bike)return;const orig=Au.vehicle;
    Au.vehicle=function(){const v=orig.apply(this,arguments);const cv=riding();if(!v||!cv)return v;try{v.stall(true)}catch(e){}const set0=v.set;let tick=0;
      v.set=p=>{try{set0.call(v,Object.assign({},p,{rpm:0,throttle:0}))}catch(e){}const sp=Math.abs(p.speed||0);if(!p.throttle&&sp>1.5){tick+=sp*.05;if(tick>1){tick=0;Au.tone({f:3200,type:'square',d:.012,gain:.025})}}};
      v.stall=()=>{};v.horn=()=>bell();v.hornDown=()=>bell();v.hornUp=()=>{};v.door=()=>{};return v};Au.vehicle._bike=true})();
}
function bell(){const Au=HT.Audio;if(!Au||!Au.tone)return;Au.tone({f:2350,type:'sine',d:.9,gain:.16});Au.tone({f:3140,type:'sine',d:.7,gain:.08});Au.tone({f:2350,type:'sine',d:.8,gain:.12,at:.16});Au.tone({f:3140,type:'triangle',d:.6,gain:.06,at:.16})}
/* the spoke card: brrrrr (a rattle whose rate follows the wheel) */
function brrr(spd,dt,st){const Au=HT.Audio;if(!Au||!Au.tone||spd<1.2)return;st.t=(st.t||0)+dt*spd*3.2;if(st.t>1){st.t=0;Au.tone({f:180+spd*14,to:120,type:'square',d:.025,gain:Math.min(.07,.02+spd*.006)})}}

HT.Runner={_v:1,bike,spin,ride,release,unride,nav,make,playerBike,disposeBike,bell,brrr,points,FEEL,bikeStats,glue,rng,SIZES};
if(J&&J.api)glue();
})();
