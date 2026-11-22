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
  box(k,x0,y0,z0,x1,y1,z1,m){if(x0>x1)[x0,x1]=[x1,x0];if(y0>y1)[y0,y1]=[y1,y0];if(z0>z1)[z0,z1]=[z1,z0];/* mirrored parts pass corners either way */const g=new T.BoxGeometry(x1-x0,y1-y0,z1-z0);g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);return C.add(k,g,m)},
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

/* ================= DAD-1: a twin-tail jet (x forward, y up, z right; nose at +x, wheels on y=0) =================
   Second pass (conductor's art review): aerofoil-section flying surfaces, LERX blended into the wing root, an area-ruled fuselage with a
   dorsal spine, boxy raked intakes with splitter plates and dark ducts, petal nozzles with dark insides, visible cockpit under lighter
   glass, pylons, wingtip rails, flap / slat / aileron lines, nose-gear doors; a matte two-tone grey scheme (vertex colour by facing, a soft
   splinter on top) over an airframe texture with few, purposeful seams; stencils. Every part is ours, built from numbers. */
/* aerofoil surface: stations along the span axis z: [z, xLE, chord, y, t/c]; NACA-like symmetric thickness; capped tip */
function aero(st,M){M=M||14;const P=[],U=[],I=[];const S=[];for(let k=0;k<=M;k++){const t=k/M;S.push((1-Math.cos(t*Math.PI))/2)}
  const yt=(s,c,tc)=>5*tc*c*(.2969*Math.sqrt(s)-.126*s-.3516*s*s+.2843*s*s*s-.1036*s*s*s*s);
  const ring=([z,xl,c,y,tc])=>{const r=[];for(let k=M;k>=0;k--){const s=S[k];r.push([xl-s*c,y+yt(s,c,tc),z])}for(let k=1;k<M;k++){const s=S[k];r.push([xl-s*c,y-yt(s,c,tc)*.85,z])}return r};
  const R=st.map(ring),n=R[0].length;
  for(const r of R)for(const p of r){P.push(p[0],p[1],p[2]);U.push(p[0]/2.4,p[2]/2.4)}
  for(let i=0;i<R.length-1;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n,c=a+n,d=b+n;const sgn=st[i+1][0]>st[i][0];if(sgn)I.push(a,c,b,b,c,d);else I.push(a,b,c,b,d,c)}
  /* tip cap: a fan from the section's mean line */
  const last=R[R.length-1],ci=P.length/3;const cx=last.reduce((s,p)=>s+p[0],0)/n,cy=last.reduce((s,p)=>s+p[1],0)/n;P.push(cx,cy,last[0][2]);U.push(cx/2.4,last[0][2]/2.4);
  const o=(R.length-1)*n,up=st[st.length-1][0]>st[st.length-2][0];for(let j=0;j<n;j++){const a=o+j,b=o+(j+1)%n;if(up)I.push(a,b,ci);else I.push(b,a,ci)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('uv',new T.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();return g}
/* the top of an aero surface at span z and chord fraction s (for panel lines and stencils) */
function aeroTop(st,z,s){let i=0;const inc=st[1][0]>st[0][0];while(i<st.length-2&&(inc?z>st[i+1][0]:z<st[i+1][0]))i++;const a=st[i],b=st[i+1],f=Math.max(0,Math.min(1,(z-a[0])/(b[0]-a[0]||1)));
  const L=(p,q)=>p+(q-p)*f,xl=L(a[1],b[1]),c=L(a[2],b[2]),y=L(a[3],b[3]),tc=L(a[4],b[4]);return[xl-s*c,y+5*tc*c*(.2969*Math.sqrt(s)-.126*s-.3516*s*s+.2843*s*s*s-.1036*s*s*s*s)+.004]}
/* a thin dark line lying on a surface from A to B (both [x,y,z]) */
function seam(A,B,w){w=w||.012;const dx=B[0]-A[0],dz=B[2]-A[2],L=Math.hypot(dx,dz)||1,nx=-dz/L*w,nz=dx/L*w;const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute([A[0]-nx,A[1],A[2]-nz,B[0]-nx,B[1],B[2]-nz,B[0]+nx,B[1],B[2]+nz,A[0]-nx,A[1],A[2]-nz,B[0]+nx,B[1],B[2]+nz,A[0]+nx,A[1],A[2]+nz],3));
  g.computeVertexNormals();const nA=g.attributes.normal;if(nA.getY(0)<0){const p=g.attributes.position.array;for(let k=0;k<p.length;k+=9){for(let q=0;q<3;q++){const t=p[k+3+q];p[k+3+q]=p[k+6+q];p[k+6+q]=t}}g.computeVertexNormals()}return g}
/* airframe skin: a light neutral base (the scheme is in vertex colour), few seams that read as frames and stringers, hatches with fasteners,
   faint rivet rows along the frames only, soft weathering; a matching roughness map */
function skinTex(key,o){if(TX[key])return TX[key];const S=1024,c=cnv(S,S),x=c.getContext('2d'),rc=cnv(S/2,S/2),rx=rc.getContext('2d'),R=rng(o.seed||5);
  x.fillStyle=o.base||'#eeeeee';x.fillRect(0,0,S,S);rx.fillStyle='rgb('+(o.rv||150)+','+(o.rv||150)+','+(o.rv||150)+')';rx.fillRect(0,0,S/2,S/2);
  for(let i=0;i<70;i++){const r=60+R()*200,g=x.createRadialGradient(0,0,0,0,0,r),d=R()<.55;g.addColorStop(0,d?'rgba(0,0,0,'+(o.mott||.035)+')':'rgba(255,255,255,'+(o.mott||.035)+')');g.addColorStop(1,'rgba(0,0,0,0)');x.save();x.translate(R()*S,R()*S);x.fillStyle=g;x.beginPath();x.arc(0,0,r,0,6.283);x.fill();x.restore()}
  const line=(x0,y0,x1,y1,a)=>{x.strokeStyle='rgba(20,22,24,'+a+')';x.lineWidth=1.6;x.beginPath();x.moveTo(x0,y0);x.lineTo(x1,y1);x.stroke();x.strokeStyle='rgba(255,255,255,'+a*.35+')';x.lineWidth=1;x.beginPath();x.moveTo(x0+1.5,y0+1.5);x.lineTo(x1+1.5,y1+1.5);x.stroke();
    rx.strokeStyle='rgba(215,215,215,.9)';rx.lineWidth=1;rx.beginPath();rx.moveTo(x0/2,y0/2);rx.lineTo(x1/2,y1/2);rx.stroke()};
  /* frames (constant v) at irregular spacing, stringer seams (constant u) only where a skin panel ends */
  const fr=[];let v=R()*90;while(v<S){fr.push(v);v+=(o.frame||230)+R()*(o.frameJ||170)}
  for(const y of fr){line(0,y,S,y,o.line||.30);if(o.rivets!==false){x.fillStyle='rgba(0,0,0,.13)';for(let k=4;k<S;k+=11)x.fillRect(k,y+5,1.6,1.6)}}
  const st=[];let u=R()*120;while(u<S){st.push(u);u+=(o.str||300)+R()*(o.strJ||260)}
  for(let i=0;i<fr.length;i++){const y0=fr[i],y1=i+1<fr.length?fr[i+1]:S;for(const xx of st)if(R()<.7)line(xx,y0,xx,y1,(o.line||.30)*.85)}
  /* access hatches with rounded corners and fasteners, a few per tile */
  for(let i=0;i<(o.hatch||5);i++){const w=40+R()*90,h=30+R()*60,px=R()*(S-w),py=R()*(S-h),r=7;x.strokeStyle='rgba(20,22,24,'+((o.line||.3)*.9)+')';x.lineWidth=1.4;x.beginPath();
    x.moveTo(px+r,py);x.lineTo(px+w-r,py);x.quadraticCurveTo(px+w,py,px+w,py+r);x.lineTo(px+w,py+h-r);x.quadraticCurveTo(px+w,py+h,px+w-r,py+h);x.lineTo(px+r,py+h);x.quadraticCurveTo(px,py+h,px,py+h-r);x.lineTo(px,py+r);x.quadraticCurveTo(px,py,px+r,py);x.stroke();
    x.fillStyle='rgba(0,0,0,.28)';for(let k=8;k<w-6;k+=14){x.fillRect(px+k,py+4,1.8,1.8);x.fillRect(px+k,py+h-6,1.8,1.8)}for(let k=8;k<h-6;k+=14){x.fillRect(px+4,py+k,1.8,1.8);x.fillRect(px+w-6,py+k,1.8,1.8)}
    rx.fillStyle='rgba(120,120,120,.35)';rx.fillRect(px/2,py/2,w/2,h/2)}
  /* weathering: fine streaks and scuffs, low contrast */
  for(let i=0;i<(o.streak||40);i++){const px=R()*S,py=R()*S,l=30+R()*140,g=x.createLinearGradient(0,py,0,py+l);g.addColorStop(0,'rgba(30,28,24,'+(o.dirt||.06)+')');g.addColorStop(1,'rgba(30,28,24,0)');x.fillStyle=g;x.fillRect(px,py,1.5+R()*3,l);rx.fillStyle='rgba(200,200,200,.35)';rx.fillRect(px/2,py/2,1.5,l/2)}
  for(let i=0;i<(o.chips||60);i++){x.fillStyle=R()<.6?'rgba(255,255,255,'+(o.chip||.07)+')':'rgba(40,36,30,'+(o.chip||.07)+')';const w=1.5+R()*5;x.fillRect(R()*S,R()*S,w,w*.6)}
  return TX[key]={map:ctex(c),rough:ctex(rc,null,false)}}
function skinMat(key,o){const t=skinTex(key,o);return std({map:t.map,roughnessMap:t.rough,roughness:o.r==null?.62:o.r,metalness:o.m==null?.1:o.m,vertexColors:true})}
/* repaint vertex colours of a merged mesh: fn(x,y,z,nx,ny,nz,[r,g,b]) -> [r,g,b] (linear) */
function tone(mesh,fn){if(!mesh)return;const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal;let c=g.attributes.color;
  if(!c){c=new T.BufferAttribute(new Float32Array(p.count*3).fill(1),3);g.setAttribute('color',c)}
  for(let i=0;i<p.count;i++){const o=fn(p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),[c.getX(i),c.getY(i),c.getZ(i)]);c.setXYZ(i,o[0],o[1],o[2])}c.needsUpdate=true}
/* stencils: one atlas, small planes laid on the skin (generic maintenance markings, our own wording) */
function stencilTex(){if(TX.sten)return TX.sten;const W=1024,H=512,c=cnv(W,H),x=c.getContext('2d');x.clearRect(0,0,W,H);const F='"Arial Narrow", Arial, sans-serif';
  const box=(i,j,draw)=>{x.save();x.translate(i*256,j*128);draw();x.restore()};
  box(0,0,()=>{x.strokeStyle='#2b2f33';x.lineWidth=5;x.strokeRect(14,24,228,80);x.fillStyle='#2b2f33';x.font='bold 46px '+F;x.textAlign='center';x.fillText('NO STEP',128,82)});
  box(1,0,()=>{x.fillStyle='#d8462e';x.font='bold 40px '+F;x.textAlign='left';x.fillText('RESCUE',70,58);x.beginPath();x.moveTo(14,40);x.lineTo(56,40);x.lineTo(56,22);x.lineTo(84,62);x.lineTo(56,102);x.lineTo(56,84);x.lineTo(14,84);x.closePath();x.fill();x.font='bold 22px '+F;x.fillText('PULL HANDLE · SEE CANOPY JETTISON',8,116)});
  box(2,0,()=>{x.fillStyle='#d8462e';x.beginPath();x.moveTo(128,8);x.lineTo(206,120);x.lineTo(50,120);x.closePath();x.fill();x.fillStyle='#fff';x.font='bold 30px '+F;x.textAlign='center';x.fillText('!',128,104);});
  box(3,0,()=>{x.fillStyle='#2b2f33';x.font='bold 30px '+F;x.textAlign='center';x.fillText('DANGER · INTAKE',128,50);x.fillText('KEEP CLEAR 8 M',128,94)});
  box(0,1,()=>{for(let k=0;k<5;k++){x.fillStyle=k%2?'#2b2f33':'#e2b12a';x.beginPath();x.moveTo(k*52,0);x.lineTo(k*52+52,0);x.lineTo(k*52+26,128);x.lineTo(k*52-26,128);x.closePath();x.fill()}});
  box(1,1,()=>{x.fillStyle='#2b2f33';x.font='bold 26px '+F;x.textAlign='left';x.fillText('FS-01 · DAD-1',10,40);x.font='20px '+F;x.fillText('JET FUEL ONLY · GND 2 · 28V DC',10,76);x.fillText('SERVICE: AIR WING, HANGAR 2',10,106)});
  box(2,1,()=>{x.strokeStyle='#d8462e';x.lineWidth=4;x.beginPath();x.arc(128,64,48,0,6.283);x.stroke();x.fillStyle='#d8462e';x.font='bold 22px '+F;x.textAlign='center';x.fillText('EJECTION',128,58);x.fillText('SEAT',128,84)});
  box(3,1,()=>{x.fillStyle='#2b2f33';x.font='bold 34px '+F;x.textAlign='center';x.fillText('WALKWAY',128,52);x.fillRect(16,72,224,6);x.fillRect(16,92,224,6)});
  box(0,2,()=>{x.fillStyle='#2b2f33';x.font='bold 22px '+F;x.textAlign='left';x.fillText('LIFT HERE',30,40);x.beginPath();x.moveTo(10,70);x.lineTo(40,52);x.lineTo(40,88);x.closePath();x.fill()});
  box(1,2,()=>{x.fillStyle='#2b2f33';x.font='bold 24px '+F;x.textAlign='center';x.fillText('GROUND POWER',128,48);x.strokeRect(60,64,136,46)});
  return TX.sten=ctex(c)}
/* a stencil plane: atlas cell (i,j) of 4x4, size w x h, at matrix m */
function sten(C,i,j,w,h,m){const g=new T.PlaneGeometry(w,h),uv=g.attributes.uv;for(let k=0;k<uv.count;k++)uv.setXY(k,(i+uv.getX(k))/4,1-(j+1-uv.getY(k))/4);C.add('sten',g,m)}
function jet(o){o=o||{};const root=new T.Group(),body=new T.Group();root.add(body);
  const RM={paint:['paint','#ffffff'],trim:['paint','#d9dcdf'],radome:['paint','#9aa1a7'],blue:['paint','#33527f'],walk:['paint','#5b6167'],metal:['mv','#8a8d91'],dark:['mv','#111316'],chrome:['mv','#c9ced3'],cockpit:['mv','#30353b'],tyre:['mv','#161616'],gear:['mv','#d7dadc'],yellow:['mv','#f2c230'],seat:['mv','#2a2c2a'],cushion:['mv','#4a4f3c']};
  const C=Coll(RM);
  const mats={
    paint:skinMat('jetSkin2',{base:'#efefef',seed:31,line:.30,frame:220,frameJ:160,str:280,strJ:260,hatch:5,dirt:.05,chip:.06,mott:.03,r:.66,m:.08}),
    mv:std({vertexColors:true,roughness:.45,metalness:.55}),
    burnt:std({map:nozzleTex(),roughness:.42,metalness:.8,vertexColors:false}),
    darkIn:std({color:lin('#0c0d0f'),roughness:.9,metalness:.1,side:T.BackSide}),
    sten:std({map:stencilTex(),transparent:true,alphaTest:.3,roughness:.6,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
    glow:new T.MeshBasicMaterial({color:new T.Color('#4fd18a').multiplyScalar(1.6),toneMapped:false})};
  /* ---- fuselage: ogive radome, chined forward fuselage, area-ruled centre section, tail cone ([x, half width, top, bottom, centre y, exponent]) */
  const NOSE=[[6.12,.012,.012,.012,1.79,2],[5.95,.07,.065,.06,1.795,2],[5.70,.14,.13,.115,1.80,2.05],[5.35,.21,.20,.17,1.81,2.15],[4.95,.27,.26,.21,1.82,2.3],[4.70,.30,.285,.23,1.83,2.4]];
  const FUS=[[4.70,.30,.285,.23,1.83,2.4],[4.25,.37,.34,.27,1.845,3.0],[3.70,.45,.42,.32,1.86,3.2],[3.00,.52,.50,.37,1.875,3.3],[2.30,.58,.55,.42,1.885,3.2],[1.60,.63,.57,.46,1.89,3.0],
    [0.80,.67,.56,.50,1.89,2.9],[0.00,.68,.54,.51,1.885,2.9],[-0.80,.665,.52,.51,1.88,2.9],[-1.60,.67,.505,.51,1.875,3],[-2.40,.71,.49,.50,1.87,3],[-3.20,.72,.47,.48,1.865,3],
    [-4.00,.70,.44,.46,1.86,2.9],[-4.60,.66,.41,.43,1.855,2.8],[-5.00,.62,.39,.41,1.85,2.7]];
  C.add('radome',loft(NOSE,32,1.2));C.add('paint',loft(FUS,40,2.6));
  /* dorsal spine from behind the canopy to between the fins, and the boat-tail between the nozzles */
  C.add('paint',loft([[0.95,.05,.02,.02,2.42,2.4],[0.55,.2,.11,.05,2.42,2.6],[-0.6,.25,.15,.06,2.40,2.8],[-2.2,.24,.15,.06,2.33,2.8],[-3.8,.2,.12,.05,2.27,2.6],[-4.85,.13,.08,.04,2.22,2.4],[-5.15,.06,.03,.02,2.19,2]],20,2.6));
  C.add('trim',loft([[-4.9,.16,.2,.2,1.85,2.4],[-5.35,.12,.14,.14,1.85,2.2],[-5.55,.05,.06,.06,1.85,2]],16,1.2));
  /* ---- intakes: boxy ducts standing off the fuselage, mouths raked (top lip forward), a splitter plate in the gap, dark ducts to the engine faces */
  for(const s of[-1,1]){const zc=s*.99,yc=1.77;const D=[[1.90,.26,.42,.42,yc,6],[1.30,.27,.42,.42,yc,6],[0.40,.28,.40,.40,yc,5.5],[-0.60,.28,.36,.38,yc,4.5],[-1.70,.26,.30,.34,yc-.02,3.6],[-2.40,.22,.25,.30,yc-.03,3]];
    const g=loft(D,24,1.6);const p=g.attributes.position;for(let i=0;i<p.count;i++){if(p.getX(i)>1.6){p.setX(i,p.getX(i)+(p.getY(i)-yc)*.75)}}g.computeVertexNormals();g.translate(0,0,zc);C.add('paint',g);
    const din=loft([[1.88,.22,.37,.37,yc,6],[1.2,.22,.36,.36,yc,6],[0.2,.2,.3,.3,yc,5]],20,1.6);const q=din.attributes.position;for(let i=0;i<q.count;i++){if(q.getX(i)>1.6)q.setX(i,q.getX(i)+(q.getY(i)-yc)*.75)}din.computeVertexNormals();din.translate(0,0,zc);C.add('darkIn',din);
    C.add('dark',new T.CircleGeometry(.22,18),M4(.22,yc,zc,Math.PI/2));/* the engine face, far down the duct */
    C.add('trim',fin([[2.35,2.18],[1.25,2.2],[1.05,1.34],[2.0,1.32]],.03,.008),M4(0,0,s*.705));/* splitter plate */
    for(const x of[1.5,1.15])C.box('trim',x-.05,1.72,s*.66-.04,x+.05,1.82,s*.705+.04);
    sten(C,3,0,.5,.18,M4(1.0,1.86,s*1.27,s>0?0:Math.PI));sten(C,0,1,.42,.1,M4(1.62,1.5,s*1.27,s>0?0:Math.PI))}
  /* ---- LERX into the wing root, the wings (aerofoil, dihedral), slat / flap / aileron lines, wingtip rails, pylons */
  const WING=[[0.66,1.05,3.55,1.70,.052],[2.4,-0.12,2.15,1.735,.045],[4.28,-1.42,1.12,1.78,.036]];
  const LERX=[[0.6,3.0,3.1,1.93,.022],[0.95,2.1,2.25,1.86,.024],[1.28,0.85,1.05,1.77,.03]];
  for(const s of[-1,1]){const mz=st=>st.map(r=>[r[0]*s,...r.slice(1)]);const W=mz(WING),Lx=mz(LERX);C.add('paint',aero(W,16));C.add('paint',aero(Lx,12));
    const top=(z,f)=>aeroTop(W,z*s,f);
    for(const[a,b,f]of[[1.25,4.05,.13],[0.9,2.55,.74],[2.6,4.0,.74]]){const A=top(a,f),B=top(b,f);C.add('dark',seam([A[0],A[1],a*s],[B[0],B[1],b*s]))}
    for(const z of[0.9,2.55,2.6,4.0]){const A=top(z,.74),B=top(z,.99);C.add('dark',seam([A[0],A[1],z*s],[B[0],B[1],z*s],.008))}
    {const A=top(2.0,.35);sten(C,0,0,.5,.18,M4(A[0],A[1]+.002,2.0*s,Math.PI/2,-Math.PI/2));sten(C,3,1,.7,.2,M4(top(1.0,.4)[0],top(1.0,.4)[1]+.002,1.0*s,Math.PI/2,-Math.PI/2))}
    C.box('trim',-2.55,1.74,s*4.3-.045,-1.25,1.83,s*4.3+.045);C.add('chrome',new T.CylinderGeometry(.03,.03,.35,8),M4(-1.1,1.785,s*4.3,0,0,Math.PI/2));/* tip rail and its nose */
    for(const z of[1.85,3.0])C.add('trim',fin([[0,0],[.05,-.24],[-1.05,-.24],[-1.1,0]],.07,.015),M4(top(z,.15)[0]-.2,1.68,z*s))}
  /* ---- stabilators (all-moving, slight anhedral) */
  for(const s of[-1,1])C.add('paint',aero([[0.62*s,-3.55,1.85,1.86,.045],[2.38*s,-4.72,.62,1.80,.035]],12));
  /* ---- twin fins canted out, rudders behind a hinge gap, blue caps */
  const finM=[];const FIN=[[0,-2.75,2.55,0,.05],[1.6,-4.35,1.0,0,.042],[1.82,-4.55,.78,0,.04]];
  for(const s of[-1,1]){const m=M4(0,2.25,s*.60,0,s*.30,0).multiply(new T.Matrix4().makeRotationX(-Math.PI/2));finM.push(M4(0,2.25,s*.60,0,s*.30,0));
    C.add('paint',aero(FIN,12),m);C.add('blue',aero([[1.66,-4.40,.98,0,.044],[1.84,-4.57,.78,0,.042]],10),m);
    C.add('trim',aero([[.12,-5.32,.42,0,.06],[1.5,-5.36,.36,0,.06]],8),m)}
  /* ---- engines: shroud, sixteen petals, dark liner and flame-holder ring inside */
  for(const s of[-1,1]){const z=s*.38,y=1.85;C.add('burnt',turned([[.42,-4.95],[.41,-5.12],[.385,-5.3]],28),M4(0,y,z));
    for(let k=0;k<16;k++){const a=k/16*Math.PI*2;const g=new T.BoxGeometry(.44,.022,.14);g.translate(-.22,0,0);
      C.add('burnt',g,new T.Matrix4().makeTranslation(-5.28,y,z).multiply(new T.Matrix4().makeRotationX(a)).multiply(new T.Matrix4().makeTranslation(0,.37,0)).multiply(new T.Matrix4().makeRotationZ(.17)))}
    C.add('darkIn',turned([[.31,-5.72],[.33,-5.3],[.30,-4.9]],20),M4(0,y,z));C.add('dark',new T.TorusGeometry(.17,.025,6,18),M4(-5.15,y,z,Math.PI/2));C.add('dark',new T.CircleGeometry(.32,20),M4(-4.95,y,z,-Math.PI/2));
    C.add('dark',new T.ConeGeometry(.08,.22,10),M4(-5.05,y,z,0,0,Math.PI/2))}
  /* ---- cockpit: tub, seat (cushions, headbox, the yellow-and-black handle), side consoles, the dash with displays, the HUD frame, the stick */
  C.box('cockpit',.55,1.95,-.42,3.15,2.3,.42);C.add('seat',rbox(.5,.75,.52,.05),M4(1.1,2.3,0));C.add('cushion',rbox(.36,.42,.42,.04),M4(1.28,2.28,0,0,0,-.1));C.add('seat',rbox(.34,.26,.5,.04),M4(1.08,2.82,0));
  C.add('yellow',new T.TorusGeometry(.08,.015,6,12,Math.PI),M4(1.35,2.58,0,Math.PI/2));
  for(const s of[-1,1])C.box('cockpit',.9,2.12,s*.4-.07,2.4,2.3,s*.4+.07);
  C.box('cockpit',2.55,2.18,-.38,2.95,2.48,.38);C.box('glow',2.54,2.28,-.3,2.555,2.43,-.04);C.box('glow',2.54,2.28,.04,2.555,2.43,.3);
  for(const s of[-1,1])C.box('dark',2.7,2.48,s*.12-.012,2.72,2.72,s*.12+.012);C.box('dark',2.69,2.7,-.13,2.73,2.72,.13);C.add('dark',new T.CylinderGeometry(.022,.022,.42,8),M4(1.75,2.2,0));
  for(const s of[-1,1])C.box('trim',.4,2.34,s*.43-.03,3.25,2.4,s*.43+.03);
  {const y=2.12;sten(C,1,0,.55,.27,M4(.6,y,.69,0));sten(C,1,0,.55,.27,M4(.6,y,-.69,Math.PI));sten(C,2,1,.24,.12,M4(2.2,2.1,.598,.05));sten(C,2,1,.24,.12,M4(2.2,2.1,-.598,Math.PI-.05));
    sten(C,1,1,.55,.28,M4(-2.0,1.62,.70,-.04));sten(C,0,2,.3,.15,M4(-3.6,1.6,.70,0));sten(C,1,2,.34,.13,M4(-1.0,1.7,.69,0));}
  /* ---- small things: pitot, blade antennas, formation-light strips, walkway paint on the spine */
  C.add('chrome',new T.CylinderGeometry(.012,.02,.55,8),M4(6.35,1.79,0,0,0,Math.PI/2));
  for(const[x,y,z,rz]of[[-1.2,2.55,0,0],[0.4,1.36,0,Math.PI],[-3.4,1.40,0,Math.PI]]){C.add('dark',fin([[0,0],[-.12,.22],[-.24,.22],[-.2,0]],.02,0),M4(x,y,z,0,0,rz))}
  for(const s of[-1,1]){C.box('glow',-.9,1.62,s*.67,.1,1.66,s*.675);C.box('glow',-4.35,3.45,s*1.11,-3.9,3.48,s*1.12)}
  C.box('walk',-2.6,2.485,-.13,-0.4,2.49,.13);
  const out=C.flush(body,mats,{noCast:['glow','sten']});
  /* the scheme: matte two-tone grey by facing (darker top, light underside), a soft splinter of the darker grey across the top, radome and blue parts kept */
  {const top=lin('#6c757d'),side=lin('#949ca3'),under=lin('#c4cacf'),patch=lin('#5b636b');const nz=(x,z)=>Math.sin(x*.9+z*1.7)+Math.sin(x*.37-z*.8+1.3)*.8+Math.sin(z*2.3+x*.2)*.4;
    tone(out.paint,(x,y,z,nx,ny,nzz,c)=>{if(Math.abs(c[0]-c[1])>.05||Math.abs(c[1]-c[2])>.08||c[0]<.5)return c;/* blue, radome, walkway: keep */
      const t=Math.max(0,Math.min(1,(ny+.35)/.9));let r=[0,1,2].map(k=>t>.5?side[['r','g','b'][k]]+(top[['r','g','b'][k]]-side[['r','g','b'][k]])*(t-.5)*2:under[['r','g','b'][k]]+(side[['r','g','b'][k]]-under[['r','g','b'][k]])*t*2);
      if(ny>.25){const k=Math.max(0,Math.min(1,(nz(x,z)-.6)*3));r=r.map((v,i)=>v+(patch[['r','g','b'][i]]-v)*k*.9)}
      const lum=c[0];return r.map(v=>v*Math.min(1,lum*1.02))})}
  /* ---- canopy: a long bubble of lightly tinted glass (the seat and HUD show through), its frame, bows and sill */
  const cg=new T.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI/2);cg.scale(1.6,.52,.47);
  const canopy=new T.Mesh(cg,std({color:lin('#56718a'),roughness:.04,metalness:.15,transparent:true,opacity:.33,depthWrite:false,envMapIntensity:1.8}));canopy.position.set(1.95,2.37,0);canopy.renderOrder=2;body.add(canopy);
  const fm=std({color:lin('#2a2d31'),roughness:.55,metalness:.4});
  const frame=new T.Mesh(new T.TorusGeometry(.47,.03,6,20,Math.PI),fm);frame.position.set(1.2,2.37,0);frame.rotation.y=Math.PI/2;frame.scale.set(1,1.06,1);body.add(frame);
  const bow=new T.Mesh(new T.TorusGeometry(.43,.032,6,20,Math.PI),fm);bow.position.set(3.05,2.37,0);bow.rotation.y=Math.PI/2;bow.scale.set(1,.92,1);body.add(bow);
  const hud=new T.Mesh(new T.PlaneGeometry(.22,.2),std({color:lin('#8ee6b0'),roughness:.05,metalness:.2,transparent:true,opacity:.25,depthWrite:false}));hud.position.set(2.71,2.6,0);hud.rotation.y=Math.PI/2;hud.rotation.x=0;hud.rotation.z=-.25;body.add(hud);
  /* decals: the callsign on the nose sides, the badge on the fins (our own artwork, js/jet.js) */
  if(o.decalTex)for(const s of[-1,1]){const d=new T.Mesh(new T.PlaneGeometry(1.5,.37),std({map:o.decalTex,transparent:true,alphaTest:.05,roughness:.6,polygonOffset:true,polygonOffsetFactor:-2}));d.position.set(3.45,1.86,s*.508);d.rotation.y=s>0?.13:Math.PI-.13;body.add(d)}
  if(o.tailTex)for(let k=0;k<2;k++){const s=k?1:-1;const t=new T.Mesh(new T.PlaneGeometry(.85,.85),std({map:o.tailTex,transparent:true,alphaTest:.05,roughness:.6,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));
    const m=finM[k].clone().multiply(M4(-4.35,.95,s*.06));t.applyMatrix4(m);body.add(t)}
  /* nav lights: red left tip, green right tip, white tail */
  const nav=[];for(const[x,y,z,c]of[[-2.0,1.79,-4.36,'#ff2a2a'],[-2.0,1.79,4.36,'#2aff6a'],[-5.58,2.2,0,'#ffffff']]){const m=new T.Mesh(new T.SphereGeometry(.05,8,6),new T.MeshBasicMaterial({color:new T.Color(c).multiplyScalar(3),toneMapped:false}));m.position.set(x,y,z);body.add(m);nav.push(m)}
  /* afterburner: additive cones out of the nozzles */
  const abm=new T.MeshBasicMaterial({color:new T.Color(3.2,1.6,.6),transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const ab=[];for(const s of[-1,1]){const cn=new T.Mesh(new T.ConeGeometry(.25,2.2,14,1,true),abm);cn.rotation.z=Math.PI/2;cn.position.set(-6.85,1.85,s*.38);body.add(cn);ab.push(cn)}
  /* landing gear: one merged mesh per leg (strut, oleo, torque link, fork, tyre, hub, doors); each leg's group folds (js/jet.js) */
  const gear=[];
  for(const[x,z,h,r,main]of[[3.9,0,1.35,.25,false],[-1.2,-1.3,1.4,.31,true],[-1.2,1.3,1.4,.31,true]]){const g=new T.Group();g.position.set(x,h+.25,z);const GL=Coll(RM);
    GL.add('gear',new T.CylinderGeometry(.07,.07,h*.55,10),M4(0,-h*.28,0));GL.add('chrome',new T.CylinderGeometry(.045,.045,h*.45,10),M4(0,-h*.72,0));
    GL.add('gear',new T.BoxGeometry(.04,.32,.05),M4(.09,-h*.62,0,0,0,.35));GL.add('gear',new T.BoxGeometry(.1,.12,main?.12:.36),M4(0,-h+.35,0));
    const wz=main?(z>0?.16:-.16):0,wy=-h+.05+(r-.3);GL.add('tyre',new T.TorusGeometry(r*.72,r*.3,10,22),M4(0,wy,wz));GL.add('gear',new T.CylinderGeometry(r*.5,r*.5,r*.55,16),M4(0,wy,wz,0,Math.PI/2));GL.add('dark',new T.CylinderGeometry(r*.18,r*.18,r*.6,10),M4(0,wy,wz,0,Math.PI/2));
    if(main)GL.add('paint',new T.BoxGeometry(.9,.75,.03),M4(0,-.38,(z>0?1:-1)*.22));
    else for(const s of[-1,1])GL.add('paint',new T.BoxGeometry(.75,.5,.025),M4(.05,-.22,s*.2,0,s*.12,0));/* nose-gear doors, open */
    const gm=GL.flush(g,mats);if(gm.paint)tone(gm.paint,()=>[.72,.75,.78].map(v=>v*v));body.add(g);gear.push(g)}
  /* the boarding ladder (yellow), one mesh */
  {const LC=Coll(RM),lg=new T.Group();for(const dx of[-.22,.22])LC.box('yellow',dx-.025,0,-.025,dx+.025,2.2,.025);for(let k=0;k<6;k++)LC.box('yellow',-.22,.23+k*.36,-.03,.22,.27+k*.36,.03);LC.box('yellow',-.25,2.155,-.01,.25,2.205,.17);
   LC.flush(lg,mats);lg.position.set(1.25,0,-.9);lg.rotation.x=-.2;body.add(lg);root.userData.ladder=lg}
  /* the pilot (helmet and visor; the dad rides hidden in the game's car code) */
  const pilot=new T.Group();const hm=new T.Mesh(new T.SphereGeometry(.2,16,12),std({color:lin('#e9e6dc'),roughness:.45}));pilot.add(hm);
  const vs=new T.Mesh(new T.SphereGeometry(.205,16,8,-Math.PI/2.6,Math.PI/1.3,Math.PI/2.8,Math.PI/4),std({color:lin('#c9902a'),roughness:.12,metalness:.7}));vs.rotation.y=Math.PI/2;pilot.add(vs);
  const sh=new T.Mesh(new T.BoxGeometry(.32,.3,.5),std({color:lin('#5a6438'),roughness:.9}));sh.position.y=-.3;pilot.add(sh);pilot.position.set(1.15,2.55,0);pilot.visible=false;body.add(pilot);
  root.traverse(m=>{if(m.isMesh){m.userData.noBatch=true;if(m.castShadow==null)m.castShadow=!m.material.transparent}});
  root.userData.size={l:11.4,w:8.8,h:3.6};root.userData.type='jet';root.userData.jet={body,canopy,nav,ab,abm,gear,frame,pilot};return root}
function nozzleTex(){if(TX.noz)return TX.noz;const c=cnv(256,64),x=c.getContext('2d');const g=x.createLinearGradient(0,0,256,0);g.addColorStop(0,'#8d9094');g.addColorStop(.4,'#77797e');g.addColorStop(.7,'#5f6072');g.addColorStop(1,'#3a3a40');/* steel to a faint heat blue (was rusty brown) */
  x.fillStyle=g;x.fillRect(0,0,256,64);x.strokeStyle='rgba(0,0,0,.45)';for(let i=0;i<256;i+=21){x.beginPath();x.moveTo(i,0);x.lineTo(i,64);x.stroke()}return TX.noz=ctex(c)}


/* ================= LAWN ORDER: a main battle tank (x forward, y up, z right; front glacis at +x, tracks on y=0) =================
   Second pass (conductor's art review): sloped turret walls with arrowhead wedge armour on the cheeks, a shaped mantlet with coax and
   sight ports, bore evacuator and muzzle-reference housing on the barrel, commander's cupola with its MG, smoke launchers on their plates,
   stowage bins and a basket at the turret rear, driver's hatch with periscopes, headlight guards, tow hooks, side and rear exhaust grilles,
   antennas; road wheels and return rollers visible under shorter skirts; tracks with thickness and sag over the rollers; an airframe-style
   skin with few seams, dust and mud graded by height. */
function treadTex(){if(TX.tread)return TX.tread;const c=cnv(128,128),x=c.getContext('2d');x.fillStyle='#1d1d1b';x.fillRect(0,0,128,128);
  /* one link per 64 px along u: a shoe plate, rubber pads, the centre guide */
  for(let k=0;k<2;k++){const u=k*64;x.fillStyle='#3a3a35';x.fillRect(u+4,6,54,116);x.fillStyle='#171716';x.fillRect(u+8,14,46,40);x.fillRect(u+8,74,46,40);x.fillStyle='#55544c';x.fillRect(u+26,56,10,16);
    x.fillStyle='rgba(255,255,255,.08)';x.fillRect(u+4,6,54,3);x.fillStyle='rgba(0,0,0,.6)';x.fillRect(u+58,0,6,128)}
  const t=ctex(c);t.repeat.set(1,1);return TX.tread=t}
/* a prism between two plans (same point count, both convex, x/z), bottom at y0, top at y1: sloped walls and both caps */
function prism2(bot,top,y0,y1){const P=[],U=[],n=bot.length;const add=(a,b,c)=>{P.push(...a,...b,...c);for(const p of[a,b,c])U.push(p[0]/2.2+p[2]*.1,p[1]/2.2+p[2]/2.2)};
  for(let i=0;i<n;i++){const j=(i+1)%n;const a=[bot[i][0],y0,bot[i][1]],b=[bot[j][0],y0,bot[j][1]],c=[top[j][0],y1,top[j][1]],d=[top[i][0],y1,top[i][1]];add(a,c,b);add(a,d,c)}
  const ct=top.reduce((s,p)=>[s[0]+p[0]/n,s[1]+p[1]/n],[0,0]),cb=bot.reduce((s,p)=>[s[0]+p[0]/n,s[1]+p[1]/n],[0,0]);
  for(let i=0;i<n;i++){const j=(i+1)%n;add([ct[0],y1,ct[1]],[top[j][0],y1,top[j][1]],[top[i][0],y1,top[i][1]]);add([cb[0],y0,cb[1]],[bot[i][0],y0,bot[i][1]],[bot[j][0],y0,bot[j][1]])}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('uv',new T.Float32BufferAttribute(U,2));g.computeVertexNormals();
  /* make every face point away from the prism's middle (the winding above depends on the plan's direction) */
  const p=g.attributes.position.array,mid=[(ct[0]+cb[0])/2,(y0+y1)/2,(ct[1]+cb[1])/2];for(let k=0;k<p.length;k+=9){const ax=p[k+3]-p[k],ay=p[k+4]-p[k+1],az=p[k+5]-p[k+2],bx=p[k+6]-p[k],by=p[k+7]-p[k+1],bz=p[k+8]-p[k+2];
    const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,cx=(p[k]+p[k+3]+p[k+6])/3-mid[0],cy=(p[k+1]+p[k+4]+p[k+7])/3-mid[1],cz=(p[k+2]+p[k+5]+p[k+8])/3-mid[2];
    if(nx*cx+ny*cy+nz*cz<0)for(let q=0;q<3;q++){const t=p[k+3+q];p[k+3+q]=p[k+6+q];p[k+6+q]=t}}
  g.computeVertexNormals();return g}
function tank(o){o=o||{};const root=new T.Group();
  /* few materials: every olive part is 'paint' (tinted per part), every metal / rubber / small coloured part is 'mv' (vertex colours) */
  const RM={paint:['paint','#ffffff'],paint2:['paint','#d6dccb'],metal:['mv','#3d403b'],steel:['mv','#6a6c66'],rubber:['mv','#1a1a19'],dark:['mv','#141513'],misc:['mv',null],glass:['mv','#22323d']};
  const C=Coll(RM),TC=Coll(RM),GC=Coll(RM);
  const mats={paint:skinMat('tankSkin2',{base:'#5c653e',seed:41,line:.34,frame:250,frameJ:200,str:330,strJ:260,hatch:4,rivets:false,dirt:.13,chip:.12,chips:170,mott:.06,streak:60,r:.8,m:.1,rv:175}),
    mv:std({vertexColors:true,roughness:.62,metalness:.55}),
    glow:new T.MeshBasicMaterial({color:new T.Color('#fff3c4').multiplyScalar(1.4),toneMapped:false}),red:new T.MeshBasicMaterial({color:new T.Color('#ff3020').multiplyScalar(1.3),toneMapped:false}),
    misc:std({vertexColors:true,roughness:.7,metalness:.15})};
  /* ---- hull: the tub between the tracks, the upper hull with its sloped glacis (a side profile, extruded across) */
  C.add('paint2',rbox(6.8,.72,2.24,.08),M4(-.15,.9,0));
  C.add('paint',fin([[-3.55,1.42],[3.15,1.42],[3.92,1.08],[3.72,.62],[3.05,.55],[-3.45,.6],[-3.6,1.2]],2.3,.06),M4(0,0,0));
  /* driver's hatch and three periscopes on the front deck, a lifting eye each corner */
  C.add('paint2',new T.CylinderGeometry(.34,.36,.07,20),M4(2.75,1.455,0));for(const z of[-.32,0,.32])C.box('glass',2.98,1.42,z-.08,3.06,1.53,z+.08,M4(0,0,0,0,0,0));
  for(const[x,z]of[[3.0,.98],[3.0,-.98],[-3.3,.98],[-3.3,-.98]])C.add('steel',new T.TorusGeometry(.06,.018,6,10),M4(x,1.48,z));
  /* fenders over the tracks; shorter side skirts (bolted panels, a gap between each) so the road wheels and return rollers show */
  for(const s of[-1,1]){C.add('paint',plate([[-3.6,s*1.12],[3.5,s*1.12],[3.95,s*1.0],[3.95,s*1.8],[3.45,s*1.86],[-3.6,s*1.86]],.08),M4(0,1.38,0));
    for(let i=0;i<6;i++){const x0=-3.45+i*1.15,x1=x0+1.1;C.add('paint',rbox(x1-x0,.42,.07,.025),M4((x0+x1)/2,1.15,s*1.86));for(let b=0;b<3;b++)C.box('metal',x0+.12+b*(x1-x0-.24)/2,1.27,s*1.9-.02,x0+.17+b*(x1-x0-.24)/2,1.32,s*1.9+.02)}
    C.add('paint2',rbox(1.9,.34,.42,.04),M4(-1.55,1.59,s*1.58));C.add('paint2',rbox(1.1,.34,.42,.04),M4(.55,1.59,s*1.58));/* stowage bins on the fenders */
    for(const x of[-2.3,-.8,.2,.9])C.box('metal',x-.03,1.68,s*1.79-.02,x+.03,1.74,s*1.79+.02)}
  /* ---- running gear: seven road wheels (rubber tyres, dished hub, bolts), return rollers, the toothed sprocket at the back, the idler at the front */
  for(const s of[-1,1]){const z=s*1.43;for(let i=0;i<7;i++){const x=-2.85+i*.93;C.add('rubber',new T.CylinderGeometry(.37,.37,.2,22),M4(x,.42,z+s*.15,0,Math.PI/2));C.add('rubber',new T.CylinderGeometry(.37,.37,.2,22),M4(x,.42,z-s*.15,0,Math.PI/2));
      C.add('metal',new T.CylinderGeometry(.3,.3,.54,18),M4(x,.42,z,0,Math.PI/2));C.add('steel',new T.CylinderGeometry(.11,.13,.6,10),M4(x,.42,z,0,Math.PI/2));
      for(let k=0;k<6;k++){const a=k/6*Math.PI*2;C.add('steel',new T.CylinderGeometry(.018,.018,.62,6),M4(x+Math.cos(a)*.19,.42+Math.sin(a)*.19,z,0,Math.PI/2))}}
    for(const x of[-1.9,0,1.9]){C.add('metal',new T.CylinderGeometry(.11,.11,.42,12),M4(x,1.02,z,0,Math.PI/2));C.add('steel',new T.CylinderGeometry(.05,.05,.5,8),M4(x,1.02,z,0,Math.PI/2))}
    C.add('metal',new T.CylinderGeometry(.4,.4,.5,20),M4(-3.28,.66,z,0,Math.PI/2));for(let k=0;k<12;k++){const a=k/12*Math.PI*2;C.box('steel',-.05,-.07,-.27,.05,.07,.27,M4(-3.28+Math.cos(a)*.45,.66+Math.sin(a)*.45,z,0,0,a))}
    C.add('metal',new T.CylinderGeometry(.38,.38,.5,20),M4(3.32,.64,z,0,Math.PI/2));C.add('steel',new T.CylinderGeometry(.14,.14,.56,10),M4(3.32,.64,z,0,Math.PI/2))}
  /* ---- tracks: a loop with thickness, sagging between the return rollers; the outer face carries the scrolled tread (js/tank.js) */
  const tracks=[];const tread=treadTex();
  for(const s of[-1,1]){const zc=s*1.43,w=.64,th=.075;
    const pts=[[-3.62,.66],[-3.52,.3],[-3.25,.07],[3.3,.07],[3.62,.3],[3.76,.64],[3.6,.96],[3.3,1.08],[2.6,1.1],[1.9,1.15],[0.95,1.075],[0,1.15],[-0.95,1.075],[-1.9,1.15],[-2.65,1.11],[-3.3,1.14],[-3.58,.96],[-3.62,.66]];
    const P=[],U=[],N=[],I=[];let u=0;const dk=[];
    for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=[(b[1]-a[1])/L,-(b[0]-a[0])/L];const k=P.length/3;
      for(const[p,uu]of[[a,u],[b,u+L]])for(const dz of[-w/2,w/2]){P.push(p[0],p[1],zc+dz);U.push(uu/.6,dz>0?1:0);N.push(n[0],n[1],0)}u+=L;I.push(k,k+2,k+1,k+1,k+2,k+3);
      /* the inner face (th inside) and the two edges */
      const ai=[a[0]-n[0]*th,a[1]-n[1]*th],bi=[b[0]-n[0]*th,b[1]-n[1]*th];dk.push([a,b,ai,bi])}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setAttribute('uv',new T.Float32BufferAttribute(U,2));geo.setAttribute('normal',new T.Float32BufferAttribute(N,3));geo.setIndex(I);
    const tm=new T.MeshStandardMaterial({map:tread.clone(),roughness:.92,metalness:.25,side:T.DoubleSide});tm.map.needsUpdate=true;const bm=new T.Mesh(geo,tm);bm.castShadow=bm.receiveShadow=true;bm.userData.noBatch=true;root.add(bm);tracks.push(bm);
    const Pd=[];for(const[a,b,ai,bi]of dk){for(const dz of[-w/2,w/2])Pd.push(a[0],a[1],zc+dz,b[0],b[1],zc+dz,bi[0],bi[1],zc+dz,a[0],a[1],zc+dz,bi[0],bi[1],zc+dz,ai[0],ai[1],zc+dz);
      Pd.push(ai[0],ai[1],zc-w/2,bi[0],bi[1],zc-w/2,bi[0],bi[1],zc+w/2,ai[0],ai[1],zc-w/2,bi[0],bi[1],zc+w/2,ai[0],ai[1],zc+w/2)}
    const g2=new T.BufferGeometry();g2.setAttribute('position',new T.Float32BufferAttribute(Pd,3));g2.computeVertexNormals();const dm=new T.Mesh(g2,new T.MeshStandardMaterial({color:lin('#1b1b19'),roughness:.9,metalness:.3,side:T.DoubleSide}));
    /* guide horns along the top run (they sit on the inner face and don't need to scroll to read) */
    const HC=Coll(RM);for(let x=-3.1;x<3.2;x+=.32){let y=null;for(let i=7;i<pts.length-2;i++){const a=pts[i+1],b=pts[i];if(x>=a[0]&&x<=b[0]){y=a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]||1);break}}if(y!=null)HC.box('dark',x-.05,y-th-.09,zc-.04,x+.05,y-th,zc+.04)}
    const hm=HC.flush(new T.Group(),mats);g2.dispose();
    /* one mesh: edges + horns (same dark material) */
    {const parts=[g2];if(hm.mv)parts.push(hm.mv.geometry);let n=0;for(const q of parts)n+=q.attributes.position.count;const Pm=new Float32Array(n*3),Nm=new Float32Array(n*3);let o2=0;
      const ge=new T.BufferGeometry();ge.setAttribute('position',new T.Float32BufferAttribute(Pd,3));ge.computeVertexNormals();parts[0]=ge;
      for(const q of parts){Pm.set(q.attributes.position.array,o2*3);Nm.set(q.attributes.normal.array,o2*3);o2+=q.attributes.position.count}
      const gm=new T.BufferGeometry();gm.setAttribute('position',new T.BufferAttribute(Pm,3));gm.setAttribute('normal',new T.BufferAttribute(Nm,3));gm.computeBoundingSphere();dm.geometry=gm}
    dm.castShadow=dm.receiveShadow=true;dm.userData.noBatch=true;root.add(dm)}
  /* ---- engine deck grilles; the rear exhaust louvres and a side grille; headlights in wire guards; tow hooks; tail lights; tools */
  for(let i=0;i<7;i++)C.box('metal',-3.4+i*.26,1.42,-.95,-3.28+i*.26,1.47,.95);C.box('dark',-3.62,.95,-.9,-3.56,1.32,.9);for(let i=0;i<6;i++)C.box('metal',-3.66,1.0+i*.055,-.9,-3.6,1.02+i*.055,.9);
  C.box('dark',-2.9,1.0,-1.155,-1.9,1.3,-1.14);for(let i=0;i<6;i++)C.box('metal',-2.9,1.03+i*.05,-1.17,-1.9,1.045+i*.05,-1.15);
  for(const s of[-1,1]){C.add('glow',new T.CylinderGeometry(.1,.1,.08,14),M4(3.66,1.3,s*1.45,0,0,Math.PI/2));C.box('metal',3.48,1.2,s*1.45-.16,3.63,1.44,s*1.45+.16);
    for(const dz of[-.15,0,.15])C.add('steel',new T.TorusGeometry(.16,.012,4,10,Math.PI),M4(3.63,1.3,s*1.45+dz,Math.PI/2,0,-Math.PI/2));/* the guard: three bent bars */
    C.box('red',-3.62,1.28,s*1.55-.1,-3.58,1.38,s*1.55+.1);
    C.add('steel',new T.TorusGeometry(.09,.03,6,12),M4(3.92,.78,s*.6,Math.PI/2));C.box('metal',3.7,.72,s*.6-.06,3.92,.84,s*.6+.06);
    C.add('steel',new T.TorusGeometry(.09,.03,6,12),M4(-3.66,.78,s*.6,Math.PI/2));C.box('metal',-3.66,.72,s*.6-.06,-3.5,.84,s*.6+.06)}
  C.add('misc',new T.BoxGeometry(1.6,.08,.14),M4(-1.0,1.46,1.27),'#4e5a3c');C.box('metal',-.25,1.43,1.22,.2,1.49,1.32);/* the shovel and the bar */
  /* the dad's stowage on the back deck: jerry cans, a cooler, a folding lawn chair */
  for(let i=0;i<3;i++)C.add('paint2',rbox(.4,.52,.33,.04),M4(-3.25,1.69,-1.43+i*.42));
  C.add('misc',rbox(.7,.45,.8,.05),M4(-3.05,1.65,.95),'#d8d4c8');C.add('misc',rbox(.74,.08,.84,.03),M4(-3.05,1.9,.95),'#2c6fb0');
  C.add('misc',new T.BoxGeometry(1.0,.04,.6),M4(-2.1,1.48,1.3),'#2c7a45');C.add('misc',new T.BoxGeometry(.05,.55,.5),M4(-2.575,1.775,1.3),'#c9c9c4');
  const hull=C.flush(root,mats,{noCast:['glow','red']});
  /* ---- turret: sloped walls (a prism between two plans), arrowhead wedges on the cheeks, roof, bustle with bins and a basket, cupola + MG,
     loader's hatch and MG, sights, smoke launchers on their plates, antennas */
  const turret=new T.Group();turret.position.set(-.35,1.42,0);
  const TB=[[1.95,-.55],[1.95,.55],[1.55,1.18],[-.9,1.36],[-1.75,1.28],[-1.75,-1.28],[-.9,-1.36],[1.55,-1.18]],TT=[[1.6,-.5],[1.6,.5],[1.25,1.0],[-.9,1.17],[-1.62,1.1],[-1.62,-1.1],[-.9,-1.17],[1.25,-1.0]];
  TC.add('paint',prism2(TB,TT,.02,.8));
  for(const s of[-1,1]){TC.add('paint',prism2([[1.95,s*.6],[2.6,s*.82],[1.55,s*1.2]],[[1.75,s*.62],[2.25,s*.8],[1.4,s*1.06]],.06,.72));/* the wedge */
    TC.add('paint2',rbox(1.2,.38,.36,.04),M4(-1.15,.42,s*1.36));/* side bins */}
  TC.add('paint',plate([[1.2,-.6],[1.2,.6],[.9,.95],[-1.4,1.05],[-1.4,-1.05],[.9,-.95]],.08,.03),M4(0,.82,0));/* roof plate */
  TC.add('paint2',rbox(.9,.62,2.2,.06),M4(-2.2,.42,0));/* bustle */
  {const bx0=-3.25,bx1=-2.62;for(const z of[-1.18,1.18])TC.box('metal',bx0,.1,z-.02,bx1,.14,z+.02);for(let i=0;i<=5;i++){const z=-1.18+i*.472;TC.box('metal',bx0-.02,.1,z-.02,bx0+.02,.78,z+.02)}
    TC.box('metal',bx0-.02,.76,-1.2,bx0+.02,.8,1.2);TC.box('metal',bx0-.02,.44,-1.2,bx0+.02,.48,1.2);for(let i=0;i<9;i++)TC.box('metal',bx0,.1,-1.18+i*.295-.008,bx1,.12,-1.18+i*.295+.008);/* the basket */
    TC.add('misc',rbox(.5,.4,.75,.12),M4(-2.95,.34,-.55),'#6b5a3a');TC.add('misc',rbox(.5,.36,.7,.12),M4(-2.95,.32,.45),'#4e5a3c');TC.add('misc',rbox(.4,.3,.4,.04),M4(-2.95,.3,1.0),'#3c4a2e')}
  /* commander's cupola (periscopes round it, hatch open) and its MG on a pintle */
  TC.add('paint',new T.CylinderGeometry(.42,.46,.3,22),M4(-.6,.97,.55));TC.add('metal',new T.CylinderGeometry(.4,.4,.05,22),M4(-.6,1.14,.55));
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2;TC.add('glass',new T.BoxGeometry(.1,.07,.04),M4(-.6+Math.cos(a)*.4,1.04,.55+Math.sin(a)*.4,-a+Math.PI/2))}
  TC.add('paint2',new T.CylinderGeometry(.4,.4,.06,22),M4(-.95,1.34,.55,0,0,1.1));
  TC.box('metal',-.4,1.16,.82,-.32,1.36,.9);TC.box('dark',-.62,1.32,.8,-.22,1.44,.92);TC.add('dark',new T.CylinderGeometry(.022,.022,.75,8),M4(.1,1.38,.86,0,0,Math.PI/2));TC.box('misc',-.55,1.2,.94,-.38,1.32,1.06,M4(0,0,0),'#4e5a3c');
  /* loader's hatch and MG */
  TC.add('paint2',new T.CylinderGeometry(.33,.33,.06,18),M4(-.5,.86,-.6));TC.box('metal',-.62,.88,-.7,-.38,1.12,-.5);TC.add('dark',new T.CylinderGeometry(.022,.022,.85,8),M4(-.05,1.1,-.6,0,0,Math.PI/2));TC.box('dark',-.55,1.05,-.66,-.35,1.15,-.54);
  /* gunner's and commander's sights */
  TC.add('paint2',rbox(.55,.42,.5,.05),M4(1.0,.98,.78));TC.box('glass',1.26,.92,.62,1.29,1.08,.94);TC.add('paint2',rbox(.4,.36,.36,.05),M4(.2,1.05,-.25));TC.box('glass',.4,.98,-.38,.42,1.12,-.12);
  /* smoke launchers: four tubes on a plate each side, angled up and out */
  for(const s of[-1,1]){TC.box('metal',1.05,.45,s*1.08-.04,1.45,.95,s*1.08+.04,M4(0,0,0));for(let i=0;i<4;i++)TC.add('metal',new T.CylinderGeometry(.065,.065,.34,10),M4(1.3,.55+i*.11,s*1.17,s*-.35,0,Math.PI/2-.45));
    for(let i=0;i<4;i++)TC.add('dark',new T.CircleGeometry(.05,10),M4(1.44,.62+i*.11,s*1.2,Math.PI/2-.2*s,0,0))}
  TC.add('metal',new T.CylinderGeometry(.012,.008,2.3,5),M4(-1.6,1.95,-.95));TC.add('metal',new T.CylinderGeometry(.012,.008,1.8,5),M4(-1.6,1.7,.95));TC.add('metal',new T.CylinderGeometry(.05,.06,.12,8),M4(-1.6,.86,-.95));TC.add('metal',new T.CylinderGeometry(.05,.06,.12,8),M4(-1.6,.86,.95));
  const pf=T.DoubleSide;TC.add('red',(()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-1.6,2.95,-.95,-1.6,3.08,-.95,-1.05,3.0,-.95],3));g.computeVertexNormals();return g})());
  const tmesh=TC.flush(turret,mats,{noCast:['red']});if(tmesh.red)tmesh.red.material.side=pf;
  /* the badge and the number on both turret sides (on the sloped wall) */
  if(o.sideTex)for(const s of[-1,1]){const d=new T.Mesh(new T.PlaneGeometry(1.1,.55),std({map:o.sideTex,transparent:true,alphaTest:.1,roughness:.8,polygonOffset:true,polygonOffsetFactor:-2}));d.position.set(-.1,.42,s*1.225);d.rotation.order='YXZ';d.rotation.y=s>0?.06:Math.PI-.06;d.rotation.x=-.25;turret.add(d)}
  /* ---- the gun: a shaped mantlet (coax and sight ports), the barrel with thermal-sleeve bands, the bore evacuator, the muzzle-reference housing */
  const mantle=new T.Group();mantle.position.set(1.55,.45,0);
  GC.add('paint',rbox(.55,.6,1.05,.1),M4(.18,0,0));GC.add('paint2',turned([[.3,.42],[.28,.5],[.22,.56],[.2,.62]],20));
  GC.box('dark',.44,.1,.3,.47,.2,.4);GC.box('glass',.44,.12,-.42,.47,.24,-.28);
  GC.add('paint2',turned([[.17,.6],[.16,1.4],[.15,1.5],[.155,1.52],[.15,2.5],[.15,2.6],[.215,2.72],[.225,3.08],[.215,3.18],[.14,3.3],[.14,4.6],[.135,4.75],[.13,5.12],[.1,5.15]],22));
  for(const x of[.9,1.85,3.7,4.35])GC.add('paint',turned([[.17,x],[.18,x+.03],[.18,x+.09],[.17,x+.12]],22));
  GC.add('dark',new T.CircleGeometry(.08,16),M4(5.151,0,0,Math.PI/2));GC.box('metal',4.86,.13,-.08,5.08,.27,.08);GC.box('glass',5.075,.16,-.05,5.085,.24,.05);GC.box('metal',4.92,.12,-.03,5.02,.14,.03);
  GC.flush(mantle,mats);
  if(o.stencilTex){const sl=new T.Mesh(new T.CylinderGeometry(.157,.157,1.0,20,1,true),std({map:o.stencilTex,roughness:.8,transparent:true,alphaTest:.1,polygonOffset:true,polygonOffsetFactor:-2}));sl.rotation.z=-Math.PI/2;sl.rotation.x=Math.PI/2;sl.position.x=2.0;mantle.add(sl)}
  const muzzle=new T.Object3D();muzzle.position.set(5.15,0,0);mantle.add(muzzle);turret.add(mantle);root.add(turret);
  /* weathering: dust rising from the tracks (lower = dustier), sun-faded tops, mud on the running gear */
  {const dust=[1.28,1.14,.86],fade=[1.07,1.06,1.02];
    const dw=(y)=>Math.max(0,Math.min(1,(1.35-y)/1.0));
    tone(hull.paint,(x,y,z,nx,ny,nz,c)=>{const k=dw(y)*.85,t=ny>.6?1:0;return c.map((v,i)=>v*(1+(dust[i]-1)*k)*(t?fade[i]:1))});
    tone(hull.mv,(x,y,z,nx,ny,nz,c)=>{if(y>.95)return c;const k=Math.max(0,Math.min(1,(.95-y)/.7))*.55;const mud=[.32,.25,.16];return c.map((v,i)=>v+(mud[i]-v)*k)});
    for(const k in tmesh)if(k==='paint')tone(tmesh[k],(x,y,z,nx,ny,nz,c)=>ny>.6?c.map((v,i)=>v*fade[i]):c)}
  root.traverse(m=>{if(m.isMesh){m.userData.noBatch=true;if(!m.material.transparent){m.castShadow=true}m.receiveShadow=true}});
  root.userData.size={l:7.6,w:3.6,h:2.6};root.userData.type='tank';root.userData.tank={turret,mantle,muzzle,tracks,tread:tracks.map(t=>t.material.map)};return root}


HT.HiVeh={jet,tank,_aero:aero,_skinTex:skinTex,_tone:tone,_coll:Coll,_panelTex:panelTex,_std:std,_paintMat:paintMat,_loft:loft,_plate:plate,_fin:fin,_turned:turned,_rbox:rbox,_M4:M4,_lin:lin,_ctex:ctex,_cnv:cnv,_rng:rng};
})();
