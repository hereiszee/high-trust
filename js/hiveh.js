/* High Trust: higher-detail procedural models for Fort Sensible's jet (DAD-1) and tank (LAWN ORDER).
 * Built by us in code (no downloaded meshes or textures). Proportions follow public three-view drawings and dimension tables of a
 * modern twin-tail fighter (scaled to the game's 11.4 m trainer) and a modern main battle tank, used as reference only; names,
 * markings and insignia are our own generic ones (see docs/base.md, "Models").
 * HT.HiVeh.jet(o) / HT.HiVeh.tank(o) return a THREE.Group with the same userData the game code drives (js/jet.js, js/tank.js):
 *   jet:  userData.jet = {body, canopy, nav, ab, abm, gear, frame, pilot}, userData.ladder, userData.size
 *   tank: userData.tank = {turret, mantle, muzzle, tracks, tread}, userData.size
 * Geometry is merged per material (a handful of draw calls per vehicle); textures are small canvases (panel lines, rivets, wear).
 */
(function(){'use strict';
const HT=window.HT=window.HT||{};const T=THREE;
const V3=(x,y,z)=>new T.Vector3(x,y,z);
const lin=c=>new T.Color(c).convertSRGBToLinear();
function M4(x,y,z,ry,rx,rz,sx,sy,sz){const m=new T.Matrix4();m.compose(V3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx||0,ry||0,rz||0,'YXZ')),V3(sx||1,sy||1,sz||1));return m}
function cnv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function rng(s){s=s||1;return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646}}
function ctex(c,rep,srgb){const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;if(rep)t.repeat.set(rep[0],rep[1]);if(srgb!==false)t.encoding=T.sRGBEncoding;t.anisotropy=8;return t}

/* ---------- a collector: geometries per material key, merged into one mesh each ---------- */
function Coll(remap){const by={};const C={
  add(k,g,m,col){if(remap&&remap[k]){if(!col)col=remap[k][1];k=remap[k][0]}if(!g.attributes.normal)g.computeVertexNormals();if(g.index)g=g.toNonIndexed();if(!g.attributes.uv){g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2))}
    if(col){const c=lin(col),n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b}g.setAttribute('color',new T.BufferAttribute(a,3))}
    if(m)g.applyMatrix4(m);(by[k]||(by[k]=[])).push(g);return C},
  box(k,x0,y0,z0,x1,y1,z1,m){const g=new T.BoxGeometry(x1-x0,y1-y0,z1-z0);g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);return C.add(k,g,m)},
  flush(parent,mats,o){o=o||{};const out={};for(const k in by){const gs=by[k];let n=0;for(const g of gs)n+=g.attributes.position.count;
      const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2),hasC=gs.some(g=>g.attributes.color),Cc=hasC?new Float32Array(n*3).fill(1):null;let i=0;
      for(const g of gs){P.set(g.attributes.position.array,i*3);N.set(g.attributes.normal.array,i*3);U.set(g.attributes.uv.array.subarray(0,g.attributes.position.count*2),i*2);if(hasC&&g.attributes.color)Cc.set(g.attributes.color.array,i*3);i+=g.attributes.position.count;g.dispose()}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(P,3));geo.setAttribute('normal',new T.BufferAttribute(N,3));geo.setAttribute('uv',new T.BufferAttribute(U,2));if(hasC)geo.setAttribute('color',new T.BufferAttribute(Cc,3));geo.computeBoundingSphere();
      const m=new T.Mesh(geo,mats[k]);m.name='hv:'+k;m.castShadow=!(mats[k].transparent)&&o.cast!==false&&!(o.noCast&&o.noCast.includes(k));m.receiveShadow=true;m.userData.noBatch=true;parent.add(m);out[k]=m}
    for(const k in by)delete by[k];return out}};return C}

/* ---------- textures: painted panels with lines, rivets, streaks and scuffs; a matching roughness map ---------- */
const TX={};
function panelTex(key,o){if(TX[key])return TX[key];const S=1024,c=cnv(S,S),x=c.getContext('2d'),rc=cnv(S/2,S/2),rx=rc.getContext('2d'),R=rng(o.seed||7);
  x.fillStyle=o.base;x.fillRect(0,0,S,S);rx.fillStyle='rgb(140,140,140)';rx.fillRect(0,0,S/2,S/2);
  /* mottling: big soft blotches a shade lighter or darker */
  for(let i=0;i<260;i++){const r=20+R()*90;const g=x.createRadialGradient(0,0,0,0,0,r);const d=R()<.5;g.addColorStop(0,d?'rgba(0,0,0,'+(o.mott||.05)+')':'rgba(255,255,255,'+(o.mott||.05)*.8+')');g.addColorStop(1,'rgba(0,0,0,0)');
    x.save();x.translate(R()*S,R()*S);x.fillStyle=g;x.beginPath();x.arc(0,0,r,0,6.283);x.fill();x.restore()}
  /* panels: rows of plates with staggered seams; the seams are thin dark lines with a light edge, rivets along them */
  const rows=o.rows||8;x.lineWidth=2;
  for(let r=0;r<rows;r++){const y0=r*S/rows;x.strokeStyle='rgba(0,0,0,'+(o.line||.45)+')';x.beginPath();x.moveTo(0,y0+.5);x.lineTo(S,y0+.5);x.stroke();
    x.strokeStyle='rgba(255,255,255,.12)';x.beginPath();x.moveTo(0,y0+2.5);x.lineTo(S,y0+2.5);x.stroke();rx.fillStyle='rgb(200,200,200)';rx.fillRect(0,y0/2,S/2,1.5);
    let xx=R()*120;while(xx<S){x.strokeStyle='rgba(0,0,0,'+(o.line||.45)+')';x.beginPath();x.moveTo(xx+.5,y0);x.lineTo(xx+.5,y0+S/rows);x.stroke();rx.fillRect(xx/2,y0/2,1.5,S/rows/2);xx+=90+R()*200}
    if(o.rivets!==false){x.fillStyle='rgba(0,0,0,.35)';for(let k=8;k<S;k+=16){x.fillRect(k,y0+6,2,2)}}}
  /* access hatches: small outlined rectangles with screws */
  for(let i=0;i<(o.hatch||14);i++){const w=30+R()*70,h=20+R()*50,px=R()*(S-w),py=R()*(S-h);x.strokeStyle='rgba(0,0,0,.4)';x.lineWidth=1.5;x.strokeRect(px,py,w,h);x.fillStyle='rgba(0,0,0,.4)';for(const[a,b]of[[3,3],[w-5,3],[3,h-5],[w-5,h-5]])x.fillRect(px+a,py+b,2,2)}
  /* streaks and scuffs (wear): darker runs downward, lighter chips */
  for(let i=0;i<(o.streak||70);i++){const px=R()*S,py=R()*S,l=40+R()*160;const g=x.createLinearGradient(0,py,0,py+l);g.addColorStop(0,'rgba(20,18,14,'+(o.dirt||.10)+')');g.addColorStop(1,'rgba(20,18,14,0)');x.fillStyle=g;x.fillRect(px,py,2+R()*4,l);
    rx.fillStyle='rgba(220,220,220,.5)';rx.fillRect(px/2,py/2,2,l/2)}
  for(let i=0;i<(o.chips||120);i++){x.fillStyle=R()<.5?'rgba(255,255,255,'+(o.chip||.10)+')':'rgba(40,36,30,'+(o.chip||.10)+')';const w=2+R()*7;x.fillRect(R()*S,R()*S,w,w*.6);rx.fillStyle='rgba(90,90,90,.6)';rx.fillRect(R()*S/2,R()*S/2,w/2,w/3)}
  return TX[key]={map:ctex(c),rough:ctex(rc,null,false)}}
function std(o){const m=new T.MeshStandardMaterial(Object.assign({roughness:.6,metalness:.1},o));return m}
function paintMat(key,o,rep){const t=panelTex(key,o);const map=t.map.clone(),rough=t.rough.clone();map.needsUpdate=rough.needsUpdate=true;if(rep){map.repeat.set(rep[0],rep[1]);rough.repeat.set(rep[0],rep[1])}
  return std({map,roughnessMap:rough,roughness:o.r==null?.62:o.r,metalness:o.m==null?.15:o.m,envMapIntensity:o.env||1})}

/* ---------- geometry helpers ---------- */
/* a loft along +x: stations [x, halfWidth, top, bottom, centreY, exponent]; superellipse rings (flat-ish sides like a real fuselage) */
function loft(st,N,uvx){const P=[],U=[],I=[];N=N||32;
  for(let i=0;i<st.length;i++){const[x,w,ht,hb,yc,ex]=st[i];const e=2/(ex||2.4);
    for(let j=0;j<=N;j++){const a=j/N*Math.PI*2,c=Math.cos(a),s=Math.sin(a);const z=Math.sign(c)*Math.pow(Math.abs(c),e)*w,y=yc+Math.sign(s)*Math.pow(Math.abs(s),e)*(s>=0?ht:hb);P.push(x,y,z);U.push(j/N*2,x/(uvx||2.6))}}
  for(let i=0;i<st.length-1;i++)for(let j=0;j<N;j++){const a=i*(N+1)+j,b=a+N+1;I.push(a,a+1,b,a+1,b+1,b)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('uv',new T.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();return g}
/* a flat part from its plan (points in x,z), thickness t, bevelled edges, centred on y=0 */
function plate(pts,t,bev){const sh=new T.Shape();pts.forEach(([x,z],i)=>i?sh.lineTo(x,z):sh.moveTo(x,z));sh.closePath();
  const b=bev==null?Math.min(.035,t*.4):bev;const g=new T.ExtrudeGeometry(sh,{depth:Math.max(.001,t-2*b),bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:2,curveSegments:4});
  g.rotateX(Math.PI/2);g.translate(0,t/2-b,0);/* shape y -> z, depth -> -y */const uv=g.attributes.uv;for(let i=0;i<uv.count;i++){uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4)}return g}
/* a fin: its side profile (points in x,y), thickness t (along z), centred on z=0 */
function fin(pts,t,bev){const sh=new T.Shape();pts.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));sh.closePath();const b=bev==null?Math.min(.025,t*.35):bev;
  const g=new T.ExtrudeGeometry(sh,{depth:Math.max(.001,t-2*b),bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:2,curveSegments:4});g.translate(0,0,-(t-2*b)/2);
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);return g}
/* turned part around +x from a profile [radius, x] */
function turned(prof,seg){const g=new T.LatheGeometry(prof.map(([r,x])=>new T.Vector2(Math.max(.0001,r),x)),seg||24);g.rotateZ(-Math.PI/2);return g}
/* a bevelled box (rounded edges) */
function rbox(w,h,d,r,seg){const sh=new T.Shape(),x=-w/2+r,y=-h/2+r,W=w-2*r,H=h-2*r;sh.moveTo(x,y-r);sh.lineTo(x+W,y-r);sh.quadraticCurveTo(x+W+r,y-r,x+W+r,y);sh.lineTo(x+W+r,y+H);sh.quadraticCurveTo(x+W+r,y+H+r,x+W,y+H+r);sh.lineTo(x,y+H+r);sh.quadraticCurveTo(x-r,y+H+r,x-r,y+H);sh.lineTo(x-r,y);sh.quadraticCurveTo(x-r,y-r,x,y-r);
  const g=new T.ExtrudeGeometry(sh,{depth:Math.max(.001,d-2*r),bevelEnabled:true,bevelThickness:r,bevelSize:r*.6,bevelSegments:seg||2,curveSegments:3});g.translate(0,0,-(d-2*r)/2);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2,uv.getY(i)/2);return g}

/* ================= DAD-1: a twin-tail jet (x forward, y up, z right; nose at +x, wheels on y=0) ================= */
function jet(o){o=o||{};const root=new T.Group(),body=new T.Group();root.add(body);
  const RM={paint:['paint','#ffffff'],trim:['paint','#a9b0b6'],radome:['paint','#8d959c'],blue:['paint','#2f5aa8'],metal:['mv','#8a8d91'],dark:['mv','#101215'],chrome:['mv','#c9ced3'],cockpit:['mv','#2c3137'],tyre:['mv','#161616'],gear:['mv','#d7dadc'],yellow:['mv','#f2c230']};
  const C=Coll(RM);
  const mats={
    paint:(()=>{const m=paintMat('jetPaint',{base:'#d8dbdd',seed:11,rows:9,line:.42,dirt:.08,chip:.08,mott:.04,r:.5,m:.25},[1,1]);m.vertexColors=true;return m})(),
    mv:std({vertexColors:true,roughness:.4,metalness:.6}),
    trim:paintMat('jetTrim',{base:'#8b9399',seed:12,rows:6,line:.35,r:.55,m:.25},[1,1]),
    radome:std({color:lin('#7b8289'),roughness:.45,metalness:.05}),
    blue:std({color:lin('#2b4d86'),roughness:.45,metalness:.2}),
    metal:std({color:lin('#8a8d91'),roughness:.32,metalness:.9}),
    burnt:std({map:nozzleTex(),roughness:.38,metalness:.85}),
    dark:std({color:lin('#101215'),roughness:.85,metalness:.1}),
    gear:std({color:lin('#d7dadc'),roughness:.35,metalness:.55}),
    chrome:std({color:lin('#c9ced3'),roughness:.12,metalness:1}),
    tyre:std({color:lin('#161616'),roughness:.92,metalness:0}),
    yellow:std({color:lin('#f2c230'),roughness:.5,metalness:.35}),
    cockpit:std({color:lin('#2c3137'),roughness:.75,metalness:.1}),
    glow:new T.MeshBasicMaterial({color:new T.Color('#4fd18a').multiplyScalar(1.6),toneMapped:false})};
  /* fuselage: radome, forward fuselage, centre/aft section (stations from public three-view proportions, scaled) */
  const ST=[[5.95,.015,.015,.015,1.80,2],[5.70,.10,.09,.08,1.80,2.1],[5.25,.20,.19,.15,1.81,2.2],[4.70,.30,.28,.22,1.83,2.3]];
  const ST2=[[4.70,.30,.28,.22,1.83,2.3],[4.10,.40,.37,.29,1.85,2.4],[3.40,.49,.47,.35,1.87,2.5],[2.60,.57,.56,.41,1.89,2.6],[1.70,.64,.58,.47,1.90,2.7],[0.70,.70,.57,.51,1.89,2.8],
    [-0.40,.73,.55,.52,1.88,2.9],[-1.60,.74,.52,.52,1.87,3],[-2.80,.74,.49,.50,1.86,3],[-3.90,.72,.45,.47,1.86,3],[-4.70,.70,.42,.44,1.85,2.9],[-5.05,.69,.40,.42,1.85,2.8]];
  C.add('radome',loft(ST,28,1.2));C.add('paint',loft(ST2,36,2.6));
  /* the spine between the engines, the boat-tail between the nozzles */
  C.add('paint',rbox(3.6,.24,.5,.08),M4(-3.1,2.38,0));C.add('trim',rbox(1.1,.5,.38,.12),M4(-5.15,1.85,0));
  /* intakes: raked, boxy, standing off the fuselage sides, dark mouths */
  for(const s of[-1,1]){const g=fin([[1.95,2.18],[1.45,1.36],[-1.7,1.42],[-1.7,2.08]],.52,.04);C.add('paint',g,M4(0,0,s*.98));
    C.add('dark',new T.PlaneGeometry(.44,.84),M4(1.71,1.77,s*.98,Math.PI/2,0,-.55));/* the mouth */
    C.box('trim',-1.7,1.55,s*.98-.27,1.5,1.6,s*.98+.27)}/* splitter line */
  /* wings: cranked trapezoids with bevelled edges, a blue tip band, flaperon lines in the texture */
  for(const s of[-1,1]){const pl=[[1.75,s*.72],[-1.5,s*4.28],[-2.55,s*4.28],[-2.45,s*.72]];C.add('paint',plate(pl,.13),M4(0,1.70,0));
    C.add('blue',plate([[-1.38,s*4.0],[-1.5,s*4.28],[-2.55,s*4.28],[-2.52,s*4.0]],.14),M4(0,1.70,0));
    C.add('trim',plate([[-2.2,s*1.0],[-2.4,s*3.9],[-2.5,s*3.9],[-2.44,s*1.0]],.135),M4(0,1.70,0))/* flaperon hinge */}
  /* stabilators */
  for(const s of[-1,1])C.add('paint',plate([[-3.75,s*.70],[-4.78,s*2.32],[-5.38,s*2.32],[-5.32,s*.70]],.08),M4(0,1.86,0));
  /* twin fins, canted out, with rudders and a blue cap */
  const finM=[];for(const s of[-1,1]){const m=M4(0,2.30,s*.60,0,s*.30,0);finM.push(m);C.add('paint',fin([[-2.85,0],[-4.50,1.78],[-5.40,1.78],[-5.25,0]],.09),m);
    C.add('blue',fin([[-4.42,1.62],[-4.50,1.78],[-5.40,1.78],[-5.38,1.62]],.10),m);C.add('trim',fin([[-4.95,.2],[-5.15,1.55],[-5.22,1.55],[-5.02,.2]],.095),m)}
  /* engines: turned nozzles with petals and a burnt-metal finish, dark cores */
  for(const s of[-1,1]){C.add('burnt',turned([[.39,-4.98],[.38,-5.15],[.35,-5.42],[.31,-5.72],[.29,-5.74],[.27,-5.72],[.30,-5.42],[.33,-5.15],[.34,-4.98]],24),M4(0,1.84,s*.38));
    C.add('dark',new T.CircleGeometry(.28,20),M4(-5.55,1.84,s*.38,-Math.PI/2));}
  /* cockpit: tub, ejection seat, dash with glowing displays, stick, canopy sill */
  C.box('cockpit',.55,1.95,-.42,3.15,2.36,.42);C.add('cockpit',rbox(.46,.62,.5,.06),M4(1.05,2.34,0));C.add('dark',rbox(.4,.18,.44,.04),M4(1.05,2.7,0));/* seat and headrest, under the canopy */
  C.box('cockpit',2.55,2.2,-.38,2.95,2.5,.38);C.box('glow',2.54,2.3,-.28,2.56,2.44,-.04);C.box('glow',2.54,2.3,.04,2.56,2.44,.28);C.add('dark',new T.CylinderGeometry(.022,.022,.42,8),M4(1.75,2.25,0));
  for(const s of[-1,1])C.box('trim',.4,2.34,s*.43-.03,3.25,2.4,s*.43+.03);
  /* small things: pitot, blade antennas, formation-light strips, a step and the refuelling door outline */
  C.add('chrome',new T.CylinderGeometry(.012,.02,.55,8),M4(6.15,1.80,0,0,0,Math.PI/2));
  for(const[x,y,z,rz]of[[-1.0,2.42,0,0],[0.4,1.32,0,Math.PI],[-3.4,1.40,0,Math.PI]]){C.add('dark',fin([[0,0],[-.12,.22],[-.24,.22],[-.2,0]],.02,0),M4(x,y,z,0,0,rz))}
  for(const s of[-1,1]){C.box('glow',-.9,1.62,s*.745,.1,1.66,s*.75);C.box('glow',-4.35,3.45,s*1.11,-3.9,3.48,s*1.12)}
  const out=C.flush(body,mats,{noCast:['glow']});
  /* canopy: a long bubble, tinted glass (reflects the sky), its bows and the rail it slides on */
  const cg=new T.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI/2);cg.scale(1.6,.52,.47);
  const canopy=new T.Mesh(cg,std({color:lin('#3d5a70'),roughness:.04,metalness:.85,transparent:true,opacity:.5,depthWrite:false,envMapIntensity:1.6}));canopy.position.set(1.95,2.37,0);canopy.renderOrder=2;body.add(canopy);
  const frame=new T.Mesh(new T.TorusGeometry(.47,.028,6,20,Math.PI),std({color:lin('#2a2d31'),roughness:.55,metalness:.4}));frame.position.set(1.2,2.37,0);frame.rotation.y=Math.PI/2;frame.scale.set(1,1.06,1);body.add(frame);
  const bow=new T.Mesh(new T.TorusGeometry(.43,.03,6,20,Math.PI),frame.material);bow.position.set(3.05,2.37,0);bow.rotation.y=Math.PI/2;bow.scale.set(1,.92,1);body.add(bow);
  /* decals: the callsign on the nose sides, the badge on the fins (our own artwork, js/jet.js) */
  if(o.decalTex)for(const s of[-1,1]){const d=new T.Mesh(new T.PlaneGeometry(1.7,.42),std({map:o.decalTex,transparent:true,alphaTest:.05,roughness:.45,polygonOffset:true,polygonOffsetFactor:-2}));d.position.set(3.25,1.84,s*.535);d.rotation.y=s>0?.1:Math.PI-.1;body.add(d)}
  if(o.tailTex)for(let k=0;k<2;k++){const s=k?1:-1;const t=new T.Mesh(new T.PlaneGeometry(.95,.95),std({map:o.tailTex,transparent:true,alphaTest:.05,roughness:.5,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));
    const m=finM[k].clone().multiply(M4(-4.55,.85,s*.07));t.applyMatrix4(m);body.add(t)}
  /* nav lights: red left tip, green right tip, white tail */
  const nav=[];for(const[x,y,z,c]of[[-2.0,1.70,-4.32,'#ff2a2a'],[-2.0,1.70,4.32,'#2aff6a'],[-5.55,2.32,0,'#ffffff']]){const m=new T.Mesh(new T.SphereGeometry(.06,8,6),new T.MeshBasicMaterial({color:new T.Color(c).multiplyScalar(3),toneMapped:false}));m.position.set(x,y,z);body.add(m);nav.push(m)}
  /* afterburner: additive cones out of the nozzles */
  const abm=new T.MeshBasicMaterial({color:new T.Color(3.2,1.6,.6),transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const ab=[];for(const s of[-1,1]){const cn=new T.Mesh(new T.ConeGeometry(.25,2.2,14,1,true),abm);cn.rotation.z=Math.PI/2;cn.position.set(-6.85,1.84,s*.38);body.add(cn);ab.push(cn)}
  /* landing gear: groups that fold (js/jet.js poses them): strut, oleo, torque link, fork, tyre and hub; mains with a door */
  /* landing gear: one merged mesh per leg (strut, oleo, torque link, fork, tyre, hub, door); each leg's group folds (js/jet.js) */
  const gear=[];
  for(const[x,z,h,r,main]of[[3.9,0,1.35,.25,false],[-1.2,-1.3,1.4,.31,true],[-1.2,1.3,1.4,.31,true]]){const g=new T.Group();g.position.set(x,h+.25,z);const GL=Coll(RM);
    GL.add('gear',new T.CylinderGeometry(.07,.07,h*.55,10),M4(0,-h*.28,0));GL.add('chrome',new T.CylinderGeometry(.045,.045,h*.45,10),M4(0,-h*.72,0));
    GL.add('gear',new T.BoxGeometry(.04,.32,.05),M4(.09,-h*.62,0,0,0,.35));GL.add('gear',new T.BoxGeometry(.1,.12,main?.12:.36),M4(0,-h+.35,0));
    const wz=main?(z>0?.16:-.16):0,wy=-h+.05+(r-.3);GL.add('tyre',new T.TorusGeometry(r*.72,r*.3,10,22),M4(0,wy,wz));GL.add('gear',new T.CylinderGeometry(r*.5,r*.5,r*.55,16),M4(0,wy,wz,0,Math.PI/2));GL.add('dark',new T.CylinderGeometry(r*.18,r*.18,r*.6,10),M4(0,wy,wz,0,Math.PI/2));
    if(main)GL.add('paint',new T.BoxGeometry(.9,.75,.03),M4(0,-.38,(z>0?1:-1)*.22));
    GL.flush(g,mats);body.add(g);gear.push(g)}
  /* the boarding ladder (yellow) under the cockpit on the left */
  {const yel=std({color:lin('#f2c230'),roughness:.5,metalness:.35});const lg=new T.Group();for(const dx of[-.22,.22]){const r=new T.Mesh(new T.BoxGeometry(.05,2.2,.05),yel);r.position.set(dx,1.1,0);lg.add(r)}
   for(let k=0;k<6;k++){const g2=new T.Mesh(new T.BoxGeometry(.44,.04,.06),yel);g2.position.set(0,.25+k*.36,0);lg.add(g2)}
   const hook=new T.Mesh(new T.BoxGeometry(.5,.05,.18),yel);hook.position.set(0,2.18,.08);lg.add(hook);lg.position.set(1.25,0,-.9);lg.rotation.x=-.2;body.add(lg);root.userData.ladder=lg}
  /* the pilot (helmet and visor; the dad rides hidden in the game's car code) */
  const pilot=new T.Group();const hm=new T.Mesh(new T.SphereGeometry(.2,16,12),std({color:lin('#e9e6dc'),roughness:.45}));pilot.add(hm);
  const vs=new T.Mesh(new T.SphereGeometry(.205,16,8,-Math.PI/2.6,Math.PI/1.3,Math.PI/2.8,Math.PI/4),std({color:lin('#c9902a'),roughness:.12,metalness:.7}));vs.rotation.y=Math.PI/2;pilot.add(vs);
  const sh=new T.Mesh(new T.BoxGeometry(.32,.3,.5),std({color:lin('#5a6438'),roughness:.9}));sh.position.y=-.3;pilot.add(sh);pilot.position.set(1.15,2.55,0);pilot.visible=false;body.add(pilot);
  root.traverse(m=>{if(m.isMesh){m.userData.noBatch=true;if(m.castShadow==null)m.castShadow=!m.material.transparent}});
  root.userData.size={l:11.4,w:8.8,h:3.6};root.userData.type='jet';root.userData.jet={body,canopy,nav,ab,abm,gear,frame,pilot};return root}
function nozzleTex(){if(TX.noz)return TX.noz;const c=cnv(256,64),x=c.getContext('2d');const g=x.createLinearGradient(0,0,256,0);g.addColorStop(0,'#6d6f72');g.addColorStop(.35,'#7a6a58');g.addColorStop(.6,'#4c4a62');g.addColorStop(1,'#2c2a2c');
  x.fillStyle=g;x.fillRect(0,0,256,64);x.strokeStyle='rgba(0,0,0,.45)';for(let i=0;i<256;i+=21){x.beginPath();x.moveTo(i,0);x.lineTo(i,64);x.stroke()}return TX.noz=ctex(c)}


/* ================= LAWN ORDER: a main battle tank (x forward, y up, z right; front glacis at +x, tracks on y=0) ================= */
function treadTex(){if(TX.tread)return TX.tread;const c=cnv(128,128),x=c.getContext('2d');x.fillStyle='#1d1d1b';x.fillRect(0,0,128,128);
  /* one link per 64 px along u: a shoe plate, rubber pads, the centre guide */
  for(let k=0;k<2;k++){const u=k*64;x.fillStyle='#3a3a35';x.fillRect(u+4,6,54,116);x.fillStyle='#171716';x.fillRect(u+8,14,46,40);x.fillRect(u+8,74,46,40);x.fillStyle='#55544c';x.fillRect(u+26,56,10,16);
    x.fillStyle='rgba(255,255,255,.08)';x.fillRect(u+4,6,54,3);x.fillStyle='rgba(0,0,0,.6)';x.fillRect(u+58,0,6,128)}
  const t=ctex(c);t.repeat.set(1,1);return TX.tread=t}
function tank(o){o=o||{};const root=new T.Group();
  /* few materials: every olive part is 'paint' (tinted per part), every metal / rubber / small coloured part is 'mv' (vertex colours) */
  const RM={paint:['paint','#ffffff'],paint2:['paint','#c9cfc0'],metal:['mv','#3d403b'],steel:['mv','#6a6c66'],rubber:['mv','#1a1a19'],dark:['mv','#141513'],misc:['mv',null],glass:['mv','#22323d']};
  const C=Coll(RM),TC=Coll(RM),GC=Coll(RM);
  const O='#59623a';
  const mats={paint:(()=>{const m=paintMat('tankPaint',{base:O,seed:21,rows:7,line:.38,dirt:.16,chip:.14,chips:220,mott:.07,r:.72,m:.12},[1,1]);m.vertexColors=true;return m})(),
    mv:std({vertexColors:true,roughness:.62,metalness:.55}),
    paint2:paintMat('tankPaint2',{base:'#4b5331',seed:22,rows:5,line:.32,dirt:.18,chip:.12,mott:.07,r:.76,m:.1},[1,1]),
    metal:std({color:lin('#3d403b'),roughness:.48,metalness:.75}),steel:std({color:lin('#6a6c66'),roughness:.38,metalness:.85}),
    rubber:std({color:lin('#1a1a19'),roughness:.95,metalness:0}),dark:std({color:lin('#141513'),roughness:.85,metalness:.15}),
    glass:std({color:lin('#22323d'),roughness:.08,metalness:.6}),
    glow:new T.MeshBasicMaterial({color:new T.Color('#fff3c4').multiplyScalar(1.4),toneMapped:false}),red:new T.MeshBasicMaterial({color:new T.Color('#ff3020').multiplyScalar(1.3),toneMapped:false}),
    canvas:std({color:lin('#6b5a3a'),roughness:.95}),canvas2:std({color:lin('#4e5a3c'),roughness:.95}),
    misc:std({vertexColors:true,roughness:.7,metalness:.15})/* small coloured parts in one mesh: stowage, bedrolls, sights */};
  /* hull: the tub between the tracks, the upper hull with its sloped glacis (a side profile, extruded across) */
  C.add('paint2',rbox(6.8,.72,2.24,.08),M4(-.15,.9,0));
  C.add('paint',fin([[-3.55,1.42],[3.15,1.42],[3.92,1.08],[3.72,.62],[3.05,.55],[-3.45,.6],[-3.6,1.2]],2.3,.06),M4(0,0,0));
  /* fenders over the tracks and the side skirts (bolted panels, a gap between each) */
  for(const s of[-1,1]){C.add('paint',plate([[-3.6,s*1.12],[3.5,s*1.12],[3.95,s*1.0],[3.95,s*1.8],[3.45,s*1.86],[-3.6,s*1.86]],.08),M4(0,1.38,0));
    for(let i=0;i<6;i++){const x0=-3.45+i*1.15,x1=x0+1.1;C.add('paint',rbox(x1-x0,.76,.07,.025),M4((x0+x1)/2,.86,s*1.86));for(let b=0;b<3;b++)C.box('metal',x0+.12+b*(x1-x0-.24)/2,1.17,s*1.9-.02,x0+.17+b*(x1-x0-.24)/2,1.22,s*1.9+.02)}}
  /* running gear: seven road wheels with rubber tyres, return rollers, the toothed drive sprocket at the back and the idler at the front */
  for(const s of[-1,1]){const z=s*1.43;for(let i=0;i<7;i++){const x=-2.85+i*.93;C.add('rubber',new T.CylinderGeometry(.37,.37,.2,20),M4(x,.42,z+s*.15,0,Math.PI/2));C.add('rubber',new T.CylinderGeometry(.37,.37,.2,20),M4(x,.42,z-s*.15,0,Math.PI/2));
      C.add('metal',new T.CylinderGeometry(.3,.3,.52,16),M4(x,.42,z,0,Math.PI/2));C.add('steel',new T.CylinderGeometry(.1,.1,.56,10),M4(x,.42,z,0,Math.PI/2))}
    for(const x of[-1.9,0,1.9])C.add('metal',new T.CylinderGeometry(.11,.11,.42,10),M4(x,1.02,z,0,Math.PI/2));
    C.add('metal',new T.CylinderGeometry(.4,.4,.5,18),M4(-3.28,.66,z,0,Math.PI/2));for(let k=0;k<12;k++){const a=k/12*Math.PI*2;C.box('steel',-.05,-.07,-.27,.05,.07,.27,M4(-3.28+Math.cos(a)*.45,.66+Math.sin(a)*.45,z,0,0,a))}
    C.add('metal',new T.CylinderGeometry(.38,.38,.5,18),M4(3.32,.64,z,0,Math.PI/2));C.add('steel',new T.CylinderGeometry(.14,.14,.56,10),M4(3.32,.64,z,0,Math.PI/2))}
  /* tracks: a loop with thickness; the outer face carries the scrolled tread texture (js/tank.js scrolls it) */
  const tracks=[];const tread=treadTex();
  for(const s of[-1,1]){const zc=s*1.43,w=.64,th=.07;const pts=[[-3.62,.66],[-3.52,.3],[-3.25,.08],[3.3,.08],[3.62,.3],[3.74,.64],[3.55,.98],[-3.4,1.08],[-3.62,.66]];
    const P=[],U=[],N=[],I=[];let u=0;
    for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=[(b[1]-a[1])/L,-(b[0]-a[0])/L];const k=P.length/3;
      for(const[p,uu]of[[a,u],[b,u+L]])for(const dz of[-w/2,w/2]){P.push(p[0]+n[0]*th*0,p[1]+n[1]*th*0,zc+dz);U.push(uu/.6,dz>0?1:0);N.push(n[0],n[1],0)}u+=L;I.push(k,k+2,k+1,k+1,k+2,k+3)}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setAttribute('uv',new T.Float32BufferAttribute(U,2));geo.setAttribute('normal',new T.Float32BufferAttribute(N,3));geo.setIndex(I);
    const tm=new T.MeshStandardMaterial({map:tread.clone(),roughness:.92,metalness:.25,side:T.DoubleSide});tm.map.needsUpdate=true;const bm=new T.Mesh(geo,tm);bm.castShadow=bm.receiveShadow=true;bm.userData.noBatch=true;root.add(bm);tracks.push(bm);
    /* the track's edges (a dark band each side) */
    for(const dz of[-w/2,w/2]){const P2=[];for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];P2.push(a[0],a[1],zc+dz,b[0],b[1],zc+dz,b[0],b[1]+.07*(i>2&&i<6?-1:1),zc+dz,a[0],a[1],zc+dz,b[0],b[1]+.07*(i>2&&i<6?-1:1),zc+dz,a[0],a[1]+.07*(i>2&&i<6?-1:1),zc+dz)}
      const g2=new T.BufferGeometry();g2.setAttribute('position',new T.Float32BufferAttribute(P2,3));g2.computeVertexNormals();C.add('dark',g2)}}
  /* engine deck: grille plates, the exhaust louvres at the back, lights, tow hooks, tools */
  for(let i=0;i<7;i++)C.box('metal',-3.4+i*.26,1.42,-.95,-3.28+i*.26,1.47,.95);C.box('dark',-3.62,.95,-.9,-3.56,1.32,.9);for(let i=0;i<6;i++)C.box('metal',-3.66,1.0+i*.055,-.9,-3.6,1.02+i*.055,.9);
  for(const s of[-1,1]){C.add('glow',new T.CylinderGeometry(.1,.1,.08,14),M4(3.6,1.3,s*1.45,0,0,Math.PI/2));C.box('metal',3.45,1.2,s*1.45-.16,3.6,1.44,s*1.45+.16);C.box('red',-3.62,1.28,s*1.55-.1,-3.58,1.38,s*1.55+.1);
    C.add('steel',new T.TorusGeometry(.09,.03,6,12),M4(3.9,.78,s*.6,Math.PI/2));C.box('metal',3.7,.72,s*.6-.06,3.92,.84,s*.6+.06)}
  C.add('misc',new T.BoxGeometry(1.6,.08,.14),M4(-1.0,1.46,1.27),'#4e5a3c');C.box('metal',-.25,1.43,1.22,.2,1.49,1.32);/* the shovel and the bar */
  /* the dad's stowage on the back deck: jerry cans, a cooler, a folding lawn chair */
  for(let i=0;i<3;i++)C.add('paint2',rbox(.4,.52,.33,.04),M4(-3.25,1.69,-1.43+i*.42));
  C.add('misc',rbox(.7,.45,.8,.05),M4(-3.05,1.65,.95),'#d8d4c8');C.add('misc',rbox(.74,.08,.84,.03),M4(-3.05,1.9,.95),'#2c6fb0');
  C.add('misc',new T.BoxGeometry(1.0,.04,.6),M4(-2.1,1.48,1.3),'#2c7a45');C.add('misc',new T.BoxGeometry(.05,.55,.5),M4(-2.575,1.775,1.3),'#c9c9c4');
  C.flush(root,mats,{noCast:['glow','red']});
  /* turret: an angular plan (bevelled), the bustle with its rack, the commander's cupola (hatch open), the loader's hatch and MG, smoke dischargers, sights, antennas */
  const turret=new T.Group();turret.position.set(-.35,1.42,0);
  TC.add('paint',plate([[1.95,-.55],[1.95,.55],[1.55,1.18],[-.9,1.36],[-1.75,1.28],[-1.75,-1.28],[-.9,-1.36],[1.55,-1.18]],.8,.07),M4(0,.4,0));
  TC.add('paint',plate([[1.2,-.6],[1.2,.6],[.9,1.0],[-1.4,1.1],[-1.4,-1.1],[.9,-1.0]],.12,.04),M4(0,.84,0));/* roof plate */
  TC.add('paint2',rbox(.9,.62,2.2,.06),M4(-2.2,.42,0));/* bustle */
  for(let i=0;i<5;i++)TC.box('metal',-2.75+i*.0,.1,-1.15+i*.575-.02,-2.7,.82,-1.15+i*.575+.02);TC.box('metal',-2.78,.78,-1.18,-2.65,.82,1.18);TC.box('metal',-2.78,.45,-1.18,-2.7,.49,1.18);
  TC.add('misc',rbox(.5,.4,.75,.12),M4(-2.35,1.0,-.55),'#6b5a3a');TC.add('misc',rbox(.5,.36,.7,.12),M4(-2.35,.98,.45),'#4e5a3c');/* bedrolls */
  TC.add('paint',new T.CylinderGeometry(.42,.46,.3,20),M4(-.6,1.05,.55));TC.add('metal',new T.CylinderGeometry(.4,.4,.05,20),M4(-.6,1.22,.55));
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2;TC.add('misc',new T.BoxGeometry(.1,.07,.04),M4(-.6+Math.cos(a)*.4,1.12,.55+Math.sin(a)*.4,-a+Math.PI/2),'#22323d')}
  TC.add('paint2',new T.CylinderGeometry(.4,.4,.06,20),M4(-.95,1.42,.55,0,0,1.1));/* the hatch, open */
  TC.add('paint2',new T.CylinderGeometry(.33,.33,.06,18),M4(-.5,.92,-.6));TC.box('metal',-.62,.95,-.7,-.38,1.2,-.5);TC.add('metal',new T.CylinderGeometry(.03,.03,.9,8),M4(-.1,1.2,-.6,0,0,Math.PI/2));/* loader's hatch and MG */
  TC.add('paint2',rbox(.5,.4,.45,.05),M4(.9,1.06,.75));TC.add('misc',new T.BoxGeometry(.02,.2,.3),M4(1.16,1.08,.75),'#22323d');/* the commander's sight */
  for(const s of[-1,1])for(let i=0;i<4;i++)TC.add('metal',new T.CylinderGeometry(.06,.06,.32,10),M4(1.25,.62+i*.1,s*1.14,0,0,Math.PI/2-.4));/* smoke dischargers */
  TC.add('metal',new T.CylinderGeometry(.012,.008,2.3,5),M4(-1.6,1.95,-.95));TC.add('metal',new T.CylinderGeometry(.012,.008,1.8,5),M4(-1.6,1.7,.95));
  const pf=T.DoubleSide;TC.add('red',(()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-1.6,2.95,-.95,-1.6,3.08,-.95,-1.05,3.0,-.95],3));g.computeVertexNormals();return g})());
  const tmesh=TC.flush(turret,mats,{noCast:['red']});if(tmesh.red)tmesh.red.material.side=pf;
  /* the badge and the number on both turret sides */
  if(o.sideTex)for(const s of[-1,1]){const d=new T.Mesh(new T.PlaneGeometry(1.2,.6),std({map:o.sideTex,transparent:true,alphaTest:.1,roughness:.8,polygonOffset:true,polygonOffsetFactor:-2}));d.position.set(-.3,.44,s*1.39);d.rotation.y=s>0?.045:Math.PI-.045;turret.add(d)}
  /* the gun: the mantlet, a long barrel with a thermal sleeve (bands), the fume extractor, the muzzle sensor; the stencilled sleeve */
  const mantle=new T.Group();mantle.position.set(1.55,.45,0);
  GC.add('paint',rbox(.7,.62,1.15,.08),M4(.15,0,0));
  GC.add('paint2',turned([[.17,.4],[.16,1.4],[.15,1.5],[.155,1.52],[.15,2.5],[.15,2.6],[.2,2.75],[.21,3.05],[.2,3.15],[.14,3.3],[.14,4.6],[.135,4.75],[.13,5.12],[.1,5.15]],20));
  for(const x of[.9,1.85,3.7,4.35])GC.add('paint',turned([[.17,x],[.18,x+.03],[.18,x+.09],[.17,x+.12]],20));
  GC.add('dark',new T.CircleGeometry(.08,16),M4(5.151,0,0,Math.PI/2));GC.box('metal',4.95,.13,-.07,5.1,.24,.07);
  GC.flush(mantle,mats);
  if(o.stencilTex){const sl=new T.Mesh(new T.CylinderGeometry(.157,.157,1.0,20,1,true),std({map:o.stencilTex,roughness:.8,transparent:true,alphaTest:.1,polygonOffset:true,polygonOffsetFactor:-2}));sl.rotation.z=-Math.PI/2;sl.rotation.x=Math.PI/2;sl.position.x=2.0;mantle.add(sl)}
  const muzzle=new T.Object3D();muzzle.position.set(5.15,0,0);mantle.add(muzzle);turret.add(mantle);root.add(turret);
  root.traverse(m=>{if(m.isMesh){m.userData.noBatch=true;if(!m.material.transparent){m.castShadow=true}m.receiveShadow=true}});
  root.userData.size={l:7.6,w:3.6,h:2.6};root.userData.type='tank';root.userData.tank={turret,mantle,muzzle,tracks,tread:tracks.map(t=>t.material.map)};return root}

HT.HiVeh={jet,tank,_coll:Coll,_panelTex:panelTex,_std:std,_paintMat:paintMat,_loft:loft,_plate:plate,_fin:fin,_turned:turned,_rbox:rbox,_M4:M4,_lin:lin,_ctex:ctex,_cnv:cnv,_rng:rng};
})();
