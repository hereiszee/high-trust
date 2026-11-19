/* High Trust: firearms + first-person viewmodel
 * HT.Guns.init({assets, base}) -> loads sourced models (assets/guns/*.glb); HT.Guns.ready (promise)
 * HT.Guns.model(type,{attachments})          -> THREE.Group, muzzle along -Z, grip at origin, metres
 * HT.Guns.viewmodel(type,{attachments,sleeve,skin,gloves}) -> rig (THREE.Group) with update/fire/reload/equip
 * Coordinates used while building: s = forward (world -Z), y = up, x = right.
 */
(function(){
'use strict';
const HT=window.HT=window.HT||{};
const T=THREE;
const V=(x,y,z)=>new T.Vector3(x,y,z);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const rand=(a,b)=>a+Math.random()*(b-a);

/* ------------------------------------------------------------------ procedural textures */
let seedN=1;const rnd=()=>{seedN=(seedN*16807)%2147483647;return(seedN-1)/2147483646};
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
/* tileable value-noise fbm into a Float32Array */
function fbm(W,H,oct,base,seed,ax=1,ay=1){seedN=seed||7;const out=new Float32Array(W*H);let amp=1,tot=0;
  for(let o=0;o<oct;o++){const gx=Math.max(1,Math.round(base*ax*(1<<o))),gy=Math.max(1,Math.round(base*ay*(1<<o)));const g=new Float32Array(gx*gy);for(let i=0;i<g.length;i++)g[i]=rnd();
    for(let y=0;y<H;y++){const fy=y/H*gy,iy=Math.floor(fy),ty=fy-iy,sy=ty*ty*(3-2*ty);
      for(let x=0;x<W;x++){const fx=x/W*gx,ix=Math.floor(fx),tx=fx-ix,sx=tx*tx*(3-2*tx);
        const a=g[(iy%gy)*gx+ix%gx],b=g[(iy%gy)*gx+(ix+1)%gx],c=g[((iy+1)%gy)*gx+ix%gx],d=g[((iy+1)%gy)*gx+(ix+1)%gx];
        out[y*W+x]+=amp*lerp(lerp(a,b,sx),lerp(c,d,sx),sy)}}tot+=amp;amp*=.5}
  for(let i=0;i<out.length;i++)out[i]/=tot;return out}
function toTex(c,srgb,rep){const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;if(srgb)t.encoding=T.sRGBEncoding;if(rep)t.repeat.set(rep[0],rep[1]);t.anisotropy=8;return t}
function grayCanvas(W,H,f){const c=canvas(W,H),x=c.getContext('2d'),d=x.createImageData(W,H);
  for(let i=0;i<W*H;i++){const v=clamp(f(i%W,(i/W)|0,i),0,1)*255;d.data[i*4]=d.data[i*4+1]=d.data[i*4+2]=v;d.data[i*4+3]=255}x.putImageData(d,0,0);return c}
function rgbCanvas(W,H,f){const c=canvas(W,H),x=c.getContext('2d'),d=x.createImageData(W,H);
  for(let i=0;i<W*H;i++){const v=f(i%W,(i/W)|0,i);d.data[i*4]=clamp(v[0],0,1)*255;d.data[i*4+1]=clamp(v[1],0,1)*255;d.data[i*4+2]=clamp(v[2],0,1)*255;d.data[i*4+3]=255}x.putImageData(d,0,0);return c}
/* height field -> tangent-space normal map (OpenGL convention) */
function normalCanvas(W,H,h,str){return rgbCanvas(W,H,(x,y)=>{const g=(a,b)=>h[((b+H)%H)*W+(a+W)%W];
  const dx=(g(x+1,y)-g(x-1,y))*str,dy=(g(x,y+1)-g(x,y-1))*str;const l=Math.hypot(dx,dy,1);return[(-dx/l)*.5+.5,(dy/l)*.5+.5,1/l*.5+.5]})}

const TEX={};
function texSet(name){if(TEX[name])return TEX[name];const S=256,s={};
  if(name==='steel'){/* parkerised / blued steel: mottled roughness, faint machining streaks */
    const n=fbm(S,S,5,4,11),st=fbm(S,S,3,2,12,16,1);
    s.rough=toTex(grayCanvas(S,S,(x,y,i)=>.42+n[i]*.18+st[i]*.1),0);
    s.normal=toTex(normalCanvas(S,S,fbm(S,S,3,64,13),.8),0)}
  else if(name==='polymer'){const n=fbm(S,S,3,64,21);
    s.normal=toTex(normalCanvas(S,S,n,3.2),0);s.rough=toTex(grayCanvas(S,S,(x,y,i)=>.55+n[i]*.25),0)}
  else if(name==='walnut'||name==='oak'){/* figured wood: long grain streaks + ring bands */
    const W=512,H=128,lg=fbm(W,H,5,2,31,1,8),fine=fbm(W,H,3,4,32,1,24),fig=fbm(W,H,4,3,33);
    const dark=name==='walnut'?[.19,.10,.055]:[.42,.25,.12],lite=name==='walnut'?[.42,.24,.12]:[.66,.44,.24];
    s.map=toTex(rgbCanvas(W,H,(x,y,i)=>{const band=.5+.5*Math.sin((y/H*14+lg[i]*9+fig[i]*4)*Math.PI);const k=clamp(band*.55+fine[i]*.45+(fig[i]-.5)*.3,0,1);
      return dark.map((d,j)=>lerp(d,lite[j],k))}),1,[1,1]);
    const hh=new Float32Array(W*H);for(let i=0;i<W*H;i++)hh[i]=fine[i]*.6+lg[i]*.4;
    s.normal=toTex(normalCanvas(W,H,hh,1.5),0);s.rough=toTex(grayCanvas(W,H,(x,y,i)=>.42+fine[i]*.25),0)}
  else if(name==='walnutFine'){const W=128,H=128,lg=fbm(W,H,4,2,35,1,6),fine=fbm(W,H,3,4,36,1,12);
    s.map=toTex(rgbCanvas(W,H,(x,y,i)=>{const k=clamp(.5+.5*Math.sin((y/H*3+lg[i]*4)*Math.PI)*.5+fine[i]*.4-.2,0,1);return[lerp(.17,.36,k),lerp(.09,.2,k),lerp(.05,.1,k)]}),1)}
  else if(name==='checker'){/* checkered grip: diamond pyramids */
    const P=16;const h=new Float32Array(S*S);for(let y=0;y<S;y++)for(let x=0;x<S;x++){const u=((x+y)%P)/P,v=((x-y+S*4)%P)/P;h[y*S+x]=Math.min(Math.min(u,1-u),Math.min(v,1-v))*2}
    s.normal=toTex(normalCanvas(S,S,h,6),0)}
  else if(name==='leather'){/* work glove leather: wrinkles + pores + scuffs */
    const wr=fbm(S,S,5,6,41,1,2.5),po=fbm(S,S,2,96,42),sc=fbm(S,S,4,5,43);const h=new Float32Array(S*S);
    for(let i=0;i<S*S;i++)h[i]=Math.pow(Math.abs(wr[i]-.5)*2,.6)*.7+po[i]*.3;
    s.normal=toTex(normalCanvas(S,S,h,4),0);s.rough=toTex(grayCanvas(S,S,(x,y,i)=>.62+sc[i]*.3-po[i]*.08),0);
    s.map=toTex(rgbCanvas(S,S,(x,y,i)=>{const k=.82+sc[i]*.35-Math.abs(wr[i]-.5)*.25;return[k,k,k]}),1)}
  else if(name==='cloth'){/* twill weave */
    const n=fbm(S,S,3,8,51);const h=new Float32Array(S*S);for(let y=0;y<S;y++)for(let x=0;x<S;x++){const t=((x+y)%8)/8,w=((x*2+(y>>2))%8)/8;h[y*S+x]=Math.sin(t*Math.PI)*.6+Math.sin(w*Math.PI)*.3+n[y*S+x]*.3}
    s.normal=toTex(normalCanvas(S,S,h,2.5),0,[6,6]);s.map=toTex(rgbCanvas(S,S,(x,y,i)=>{const k=.85+n[i]*.25+(((x+y)%8)<3?.04:0);return[k,k,k]}),1,[2,3])}
  else if(name==='skin'){const n=fbm(S,S,4,24,61);s.normal=toTex(normalCanvas(S,S,n,1.2),0);s.rough=toTex(grayCanvas(S,S,(x,y,i)=>.5+n[i]*.2),0)}
  else if(name==='knurl'){const h=new Float32Array(S*S);for(let y=0;y<S;y++)for(let x=0;x<S;x++){const u=((x+y)%8)/8,v=((x-y+S*4)%8)/8;h[y*S+x]=Math.min(Math.min(u,1-u),Math.min(v,1-v))*2}
    s.normal=toTex(normalCanvas(S,S,h,5),0)}
  else if(name==='rubber'){const n=fbm(S,S,3,48,71);s.normal=toTex(normalCanvas(S,S,n,2),0)}
  return TEX[name]=s}

/* ------------------------------------------------------------------ materials
   every procedural mesh carries UVs in metres, so each material sets its own texture repeat */
const MAT={};
function srgb(hex){const c=new T.Color(hex);c.convertSRGBToLinear();return c}
function rep(t,rx,ry){if(!t)return t;const c=t.clone();c.needsUpdate=true;c.repeat.set(rx,ry==null?rx:ry);return c}
function mat(name){if(MAT[name])return MAT[name];let m;
  const std=(o)=>new T.MeshStandardMaterial(o),phy=(o)=>new T.MeshPhysicalMaterial(o);
  const st=texSet('steel');const sr=k=>rep(st.rough,k),sn=k=>rep(st.normal,k);
  switch(name){
    case 'blued':m=std({color:srgb('#5d6268'),metalness:1,roughness:.85,roughnessMap:sr(7),normalMap:sn(7),vertexColors:true});m.normalScale.set(.12,.12);break;
    case 'parkerized':m=std({color:srgb('#55585a'),metalness:.7,roughness:1.15,roughnessMap:sr(7),normalMap:sn(14),vertexColors:true});m.normalScale.set(.25,.25);break;
    case 'stainless':m=std({color:srgb('#c9ccce'),metalness:1,roughness:.65,roughnessMap:sr(9),normalMap:sn(9)});m.normalScale.set(.1,.1);break;
    case 'bore':m=std({color:srgb('#0c0c0c'),metalness:.8,roughness:.6});break;
    case 'alloy':m=std({color:srgb('#45484b'),metalness:.6,roughness:1.0,roughnessMap:sr(9),normalMap:sn(14),vertexColors:true});m.normalScale.set(.2,.2);break;
    case 'polymer':case 'polymerTan':case 'orange':case 'yellow':case 'battery':{const p=texSet('polymer');
      const col={polymer:'#232527',polymerTan:'#8b7a5c',orange:'#e0601a',yellow:'#e0ad17',battery:'#1d1e1f'}[name];
      m=std({color:srgb(col),metalness:0,roughness:name==='polymer'||name==='battery'?.95:.8,roughnessMap:rep(p.rough,40),normalMap:rep(p.normal,40)});m.normalScale.set(.35,.35);break}
    case 'rubber':{const p=texSet('rubber');m=std({color:srgb('#161718'),metalness:0,roughness:.9,normalMap:rep(p.normal,30)});m.normalScale.set(.5,.5);break}
    case 'walnut':case 'oak':{const w=texSet(name);m=phy({color:0xffffff,map:rep(w.map,3.2,9),normalMap:rep(w.normal,3.2,9),roughness:1,roughnessMap:rep(w.rough,3.2,9),metalness:0,clearcoat:.5,clearcoatRoughness:.3});m.normalScale.set(.35,.35);break}
    case 'walnutGrip':{const w=texSet('walnut'),c=texSet('checker');m=phy({color:0xffffff,map:rep(w.map,90,250),normalMap:rep(c.normal,90,250),roughness:.62,metalness:0,clearcoat:.15,clearcoatRoughness:.5});
      /* map and normal share one uv transform in r128: checker density drives it, so the grain map is a fine-scale one */
      m.map=rep(texSet('walnutFine').map,90,250);m.normalScale.set(.8,.8);break}
    case 'brass':m=std({color:srgb('#d4a647'),metalness:1,roughness:.28});break;
    case 'copper':m=std({color:srgb('#c47a4a'),metalness:1,roughness:.3});break;
    case 'hull':m=std({color:srgb('#a3221c'),metalness:0,roughness:.45});break;
    case 'hullOrange':m=std({color:srgb('#ef7a1a'),metalness:0,roughness:.45});break;
    case 'glass':m=phy({color:srgb('#203038'),metalness:.2,roughness:.05,transparent:true,opacity:.55,clearcoat:1});break;
    case 'knurl':{const k=texSet('knurl');m=std({color:srgb('#2a2b2c'),metalness:.7,roughness:.55,normalMap:rep(k.normal,60)});break}
    case 'dot':m=new T.MeshBasicMaterial({color:new T.Color(4,.2,.15),toneMapped:false,transparent:true,depthWrite:false});break;
    case 'bead':m=std({color:srgb('#e9e2c8'),metalness:.6,roughness:.25});break;
    case 'brassBead':m=std({color:srgb('#e0b85a'),metalness:1,roughness:.2});break;
    case 'nailStrip':m=std({color:srgb('#9fa3a6'),metalness:1,roughness:.4});break;
    default:m=std({color:0xff00ff})}
  m.name=name;return MAT[name]=m}

/* ------------------------------------------------------------------ geometry helpers */
/* edge wear: bevel / silhouette vertices of extrusions get brighter vertex colour (bare metal showing through) */
function wear(g,base=.55,edge=1){const n=g.attributes.normal,p=g.attributes.position,c=new Float32Array(p.count*3);
  const nn=fbm(64,64,3,4,91);
  for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),side=1-Math.max(nx,Math.abs(n.getY(i))>.97?1:0,Math.abs(n.getZ(i))>.97?1:0);
    const e=clamp((nx>.08&&nx<.96?1:0)*.8+side*.2,0,1);const r=nn[(Math.abs(Math.floor(p.getX(i)*900+p.getZ(i)*700))%64)*64+(Math.abs(Math.floor(p.getY(i)*900))%64)];
    const k=lerp(base,edge,e*clamp(r*1.6-.2,0,1));c[i*3]=c[i*3+1]=c[i*3+2]=k}
  g.setAttribute('color',new T.BufferAttribute(c,3));return g}
/* UVs in metres so every material's texture repeat is a physical density */
function meterUV(g,kind){const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(kind==='lathe'){const a=Math.atan2(x,y),r=Math.hypot(x,y);uv[i*2]=-z;uv[i*2+1]=a*Math.max(r,.004)}
    else{const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
      if(ax>=ay&&ax>=az){uv[i*2]=-z;uv[i*2+1]=y}else if(ay>=az){uv[i*2]=-z;uv[i*2+1]=x}else{uv[i*2]=x;uv[i*2+1]=y}}}
  g.setAttribute('uv',new T.BufferAttribute(uv,2));return g}
/* loft: superelliptic sections swept along a path in the (s,y) plane.
   nodes: {s,y, t (half height above path), b (half height below), w (half width), e (squareness 2=ellipse), x (centre offset)} */
function loft(nodes,m,o={}){const R=o.ring||28,N=nodes.length,pos=[],uv=[],idx=[];let len=0;
  const sp=t=>{const v=Math.abs(t);return Math.sign(t)*v};
  for(let i=0;i<N;i++){const a=nodes[Math.max(0,i-1)],b=nodes[Math.min(N-1,i+1)],nd=nodes[i];
    let ts=b.s-a.s,ty=b.y-a.y;const tl=Math.hypot(ts,ty)||1;ts/=tl;ty/=tl;const ns=-ty,ny=ts;/* section "up" */
    if(i)len+=Math.hypot(nd.s-nodes[i-1].s,nd.y-nodes[i-1].y);const e=nd.e||2.4;let per=0,prev=null;
    for(let k=0;k<=R;k++){const ang=k/R*Math.PI*2,c=Math.cos(ang),sn=Math.sin(ang);
      const cx=Math.sign(c)*Math.pow(Math.abs(c),2/e),cy=Math.sign(sn)*Math.pow(Math.abs(sn),2/e);
      const h=cy>=0?(nd.t!=null?nd.t:nd.h):(nd.b!=null?nd.b:nd.h);const lx=cx*nd.w+(nd.x||0),ly=cy*h;
      const S=nd.s+ns*ly,Y=nd.y+ny*ly;const P=[lx,Y,-S];if(prev)per+=Math.hypot(P[0]-prev[0],P[1]-prev[1],P[2]-prev[2]);prev=P;
      pos.push(P[0],P[1],P[2]);uv.push(len,per)}}
  for(let i=0;i<N-1;i++)for(let k=0;k<R;k++){const a=i*(R+1)+k,b=a+R+1;idx.push(a,b,a+1,b,b+1,a+1)}
  /* caps */
  for(const[ci,flip]of[[0,0],[N-1,1]]){const nd=nodes[ci],c=pos.length/3;pos.push(nd.x||0,nd.y,-nd.s);uv.push(0,0);
    for(let k=0;k<R;k++){const a=ci*(R+1)+k;flip?idx.push(c,a+1,a):idx.push(c,a,a+1)}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  /* if the winding came out inside-out, flip */
  if(m&&m.vertexColors)wear(g,.6);const me=new T.Mesh(g,m);me.castShadow=me.receiveShadow=true;return me}
function shapeOf(pts){const s=new T.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));s.closePath();return s}
/* rounded polygon: corners with radius (per point optional 3rd value) */
function rshape(pts,r=.004,seg=4){const s=new T.Shape(),n=pts.length;
  for(let i=0;i<n;i++){const p=pts[i],a=pts[(i-1+n)%n],b=pts[(i+1)%n],rr=p[2]!=null?p[2]:r;
    const da=Math.hypot(a[0]-p[0],a[1]-p[1]),db=Math.hypot(b[0]-p[0],b[1]-p[1]);const k=Math.min(rr,da*.45,db*.45);
    const p1=[p[0]+(a[0]-p[0])/da*k,p[1]+(a[1]-p[1])/da*k],p2=[p[0]+(b[0]-p[0])/db*k,p[1]+(b[1]-p[1])/db*k];
    if(i===0)s.moveTo(p1[0],p1[1]);else s.lineTo(p1[0],p1[1]);
    if(k>0)s.quadraticCurveTo(p[0],p[1],p2[0],p2[1])}
  s.closePath();return s}
/* extrude a side profile (s,y) to a slab of given width centred at x */
function ext(shape,width,m,o={}){const bev=o.bevel!=null?o.bevel:Math.min(.0025,width*.25);
  const g=new T.ExtrudeGeometry(shape instanceof T.Shape?shape:rshape(shape,o.r,o.seg),{depth:Math.max(.0002,width-bev*2),bevelEnabled:bev>0,bevelThickness:bev,bevelSize:o.bevelSize!=null?o.bevelSize:bev,bevelSegments:o.bevelSeg||3,curveSegments:o.curve||6,steps:1});
  g.translate(0,0,-(width-bev*2)/2);g.rotateY(Math.PI/2);/* shape x -> -z, extrude -> +x */
  if(o.wear!==false&&m&&m.vertexColors)wear(g,o.wb);
  const me=new T.Mesh(g,m);if(o.x)me.position.x=o.x;me.castShadow=true;me.receiveShadow=true;return me}
/* lathe along the s axis: profile [[r,s],...] */
function lathe(prof,m,seg=24,o={}){const g=new T.LatheGeometry(prof.map(p=>new T.Vector2(Math.max(p[0],1e-5),p[1])),seg,o.phi||0,o.len||Math.PI*2);
  g.rotateX(-Math.PI/2);/* lathe +y -> -z (forward) */meterUV(g,'lathe');if(m&&m.vertexColors)wear(g,.6);
  const me=new T.Mesh(g,m);me.castShadow=me.receiveShadow=true;if(o.y!=null)me.position.y=o.y;if(o.x!=null)me.position.x=o.x;return me}
function tube(r,s0,s1,y,m,o={}){const b=o.b!=null?o.b:Math.min(.0015,r*.2);const ri=o.ri;
  const prof=ri?[[ri,s1-b],[ri,s0],[r-b,s0],[r,s0+b],[r,s1-b],[r-b,s1],[ri+.0005,s1]]:[[1e-4,s0],[r-b,s0],[r,s0+b],[r,s1-b],[r-b,s1],[1e-4,s1]];
  const me=lathe(prof,m,o.seg||24,{y,x:o.x});return me}
function rbox(w,h,d,r,m,o={}){/* rounded box: w along x, h along y, d along s */
  const g=new T.BoxGeometry(w,h,d,o.sx||4,o.sy||4,o.sz||4),p=g.attributes.position,hw=w/2-r,hh=h/2-r,hd=d/2-r;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const cx=clamp(x,-hw,hw),cy=clamp(y,-hh,hh),cz=clamp(z,-hd,hd);
    let dx=x-cx,dy=y-cy,dz=z-cz;const l=Math.hypot(dx,dy,dz)||1;p.setXYZ(i,cx+dx/l*r,cy+dy/l*r,cz+dz/l*r)}
  g.computeVertexNormals();meterUV(g,'box');if(m&&m.vertexColors)wear(g,.6);const me=new T.Mesh(g,m);me.castShadow=me.receiveShadow=true;return me}
function place(o,s,y,x=0){o.position.set(x,y,-s);return o}
function sph(r,m,ws=12,hs=8){const me=new T.Mesh(new T.SphereGeometry(r,ws,hs),m);me.castShadow=true;return me}
function group(name){const g=new T.Group();if(name)g.name=name;return g}
/* Picatinny rail along s (teeth on top) */
function rail(s0,s1,y,x,m,up=true,w=.021){const g=group('rail');const base=rbox(w,.006,s1-s0,.0012,m);place(base,(s0+s1)/2,y+.003);g.add(base);
  const n=Math.floor((s1-s0)/.01);const tg=new T.BoxGeometry(w*.98,.0035,.0052);
  for(let i=0;i<n;i++){const t=new T.Mesh(tg,m);place(t,s0+.005+i*.01,y+.0075);g.add(t)}
  if(!up)g.rotation.z=Math.PI;g.position.x=x||0;return g}
/* cartridge (pointing forward along s) */
function cartridge(kind){const g=group('round');
  if(kind==='12ga'||kind==='bean'){g.add(tube(.0105,0,.012,0,mat('brass'),{b:.0008}));g.add(tube(.0101,.012,.067,0,mat(kind==='bean'?'hullOrange':'hull'),{b:.0012}));const rim=tube(.0112,0,.0015,0,mat('brass'),{b:.0003});g.add(rim)}
  else{const L={'9mm':[.0048,.0193,.0078],'357':[.0048,.0333,.0082],'556':[.0048,.044,.012],'308':[.006,.051,.018],nail:[.0015,.08,0]}[kind]||[.0048,.019,.008];
    if(kind==='nail'){g.add(tube(.0013,0,.085,0,mat('nailStrip'),{b:.0002,seg:8}));return g}
    const neck=kind==='556'||kind==='308';const r=L[0],len=L[1],bl=L[2];
    g.add(lathe(neck?[[1e-4,0],[r*1.05,0],[r*1.05,.0012],[r*.88,.0016],[r*.88,.002],[r,.0025],[r,len*.8],[r*.6,len*.88],[r*.58,len]]:[[1e-4,0],[r*1.02,0],[r*1.02,.0012],[r*.9,.0015],[r,.002],[r,len]],mat('brass'),16));
    const br=neck?r*.58:r*.96;const bul=lathe([[br,len],[br,len+bl*.5],[br*.6,len+bl*.85],[1e-4,len+bl]],mat('copper'),16);g.add(bul)}
  return g}
function emptyCase(kind){if(kind==='12ga'||kind==='bean'){const g=group('hull');g.add(tube(.0105,0,.012,0,mat('brass'),{b:.0008}));g.add(tube(.0101,.012,.062,0,mat(kind==='bean'?'hullOrange':'hull'),{b:.001}));return g}
  const L={'9mm':[.0048,.0193],'357':[.0048,.0333],'556':[.0048,.044],'308':[.006,.051]}[kind]||[.0048,.0193];
  const g=group('case');g.add(lathe([[1e-4,0],[L[0]*1.02,0],[L[0]*1.02,.0012],[L[0]*.9,.0015],[L[0],.002],[L[0],L[1]],[L[0]*.85,L[1]]],mat('brass'),12));return g}

/* battery label: generic tool-brand-free lettering */
let LABEL=null;function labelTex(){if(LABEL)return LABEL;const c=canvas(256,80),x=c.getContext('2d');x.fillStyle='#1c1d1e';x.fillRect(0,0,256,80);
  x.fillStyle='#e0ad17';x.fillRect(0,0,256,14);x.fillRect(0,66,256,14);x.fillStyle='#f2f2f2';x.font='bold 30px Arial,sans-serif';x.fillText('20V',12,52);
  x.font='bold 17px Arial,sans-serif';x.fillText('Li-ion  5.0Ah',88,38);x.font='12px Arial,sans-serif';x.fillStyle='#bdbdbd';x.fillText('WEEKEND PRO SERIES',88,56);
  LABEL=new T.CanvasTexture(c);LABEL.encoding=T.sRGBEncoding;return LABEL}
/* ------------------------------------------------------------------ sourced model loading */
const SRC={pistol:'ph_pistol.glb',hunter:'ph_bolt_rifle.glb',rifle:'oga_m4a1.glb'};
const LOADED={};let BASE='assets/guns/';
function loadAll(assets){const L=T.GLTFLoader?new T.GLTFLoader():null;
  return Promise.all(Object.entries(SRC).map(([k,f])=>new Promise(res=>{
    const pre=assets&&assets.gltf&&assets.gltf('guns_'+k);if(pre){LOADED[k]=pre.scene;return res()}
    if(!L){console.warn('HT.Guns: GLTFLoader missing, procedural fallback for',k);return res()}
    L.load(BASE+f,g=>{g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.map)m.map.anisotropy=8;m.envMapIntensity=1})}});LOADED[k]=g.scene;res()},
      undefined,e=>{console.warn('HT.Guns: failed to load',f,'- procedural fallback');res()})})))}
function srcNode(root,name){let f=null;root.traverse(o=>{if(!f&&o.name===name)f=o});return f}
/* wrap a source node so its pivot sits at a given (s,y,x) point, keeping its placement */
function pivotWrap(node,s,y,x=0){const p=group(node.name+'_pivot');const par=node.parent;p.position.set(x,y,-s);par.add(p);
  node.position.x-=x;node.position.y-=y;node.position.z+=s;p.add(node);return p}

/* ------------------------------------------------------------------ gun builders
   each returns D = {g, parts, grip[s,y], muzzle[s,y,x], eject[s,y,x], sight:{s,y} (eye point on sight line), sightFront, rail[s,y], mag, ammo, kind} */
const B={};

/* Garage Pistol: compact 9mm (sourced, Poly Haven "Service Pistol", CC0) */
B.pistol=function(){const src=LOADED.pistol;if(!src)return B.pistolProc();
  const root=group('pistolSrc');const m=src.clone(true);root.add(m);m.rotation.y=Math.PI/2;/* source +X forward -> -Z */
  const slide=srcNode(m,'service_pistol_slide_a'),mag=srcNode(m,'service_pistol_magazine_loaded'),ham=srcNode(m,'service_pistol_hammer_a'),trig=srcNode(m,'service_pistol_trigger_a'),bul=srcNode(m,'service_pistol_bullet');
  if(bul)bul.visible=false;
  if(mag){mag.position.x+=.0905;mag.position.y-=.002}
  return{g:root,parts:{slide,mag,hammer:ham,trigger:trig},grip:[-.024,.03],muzzle:[.176,.0625,0],eject:[.035,.07,.012],
    sight:{s:-.02,y:.0862},rail:null,slideRail:[.02,.08],magDrop:[0,-.12,0],ammo:'9mm',kind:'pistol',barrelR:.0045,len:.226}};
B.pistolProc=function(){const g=group('pistol');const st=mat('blued'),pol=mat('polymer');
  const frame=ext([[-.04,.045],[.15,.045],[.15,.03],[.07,.03],[.06,.0],[.015,.0],[-.01,-.06,.006],[-.045,-.062,.006],[-.032,.0],[-.045,.03]],.028,pol,{r:.004});g.add(frame);
  const slide=group('slide');slide.add(ext([[-.045,.045],[.155,.045],[.155,.075],[-.04,.078]],.026,st,{r:.003}));g.add(slide);
  return{g,parts:{slide},grip:[-.024,.03],muzzle:[.155,.06,0],eject:[.03,.07,.012],sight:{s:-.03,y:.084},ammo:'9mm',kind:'pistol',len:.2}};

/* Rick's Carbine: AR-15 pattern (sourced, OpenGameArt "M4A1 Assault Rifle", CC0) */
B.rifle=function(){const src=LOADED.rifle;if(!src)return B.rifleProc();
  const root=group('rifleSrc');const m=src.clone(true);root.add(m);/* already -Z forward */
  const magN=srcNode(m,'Magazine'),ch=srcNode(m,'Charging_Handle'),dust=srcNode(m,'Ejector_Lid'),trig=srcNode(m,'Trigger');
  const parts={mag:magN,bolt:ch,dust,trigger:trig};
  return{g:root,parts,grip:[-.062,-.03],muzzle:[.536,.039,0],eject:[.035,.03,.02],sight:{s:-.07,y:.069},rail:[-.03,.0495,.06],
    hand:[.15,.015],magDrop:[0,-.16,0],ammo:'556',kind:'rifle',len:.86,dustCover:true}};
B.rifleProc=function(){const g=group('rifle');const al=mat('alloy');g.add(ext([[-.08,0],[.12,0],[.12,.06],[-.08,.06]],.03,al));g.add(tube(.008,.12,.5,.035,mat('parkerized')));
  return{g,parts:{},grip:[-.06,-.03],muzzle:[.5,.035,0],eject:[.03,.04,.02],sight:{s:-.06,y:.08},ammo:'556',kind:'rifle',len:.8}};

/* Deer Season: scoped bolt-action (sourced, Poly Haven "Bolt Action Rifle 7.62", CC0) */
B.hunter=function(){const src=LOADED.hunter;if(!src)return B.hunterProc();
  const root=group('hunterSrc');const m=src.clone(true);root.add(m);m.rotation.y=Math.PI/2;
  const boltA=srcNode(m,'bolt_action_rifle_7_62_bolt_a'),boltB=srcNode(m,'bolt_action_rifle_7_62_bolt_b'),bul=srcNode(m,'bolt_action_rifle_7_62_bullet_54mm'),trig=srcNode(m,'bolt_action_rifle_7_62_trigger');
  if(bul)bul.visible=false;
  const bolt=group('bolt');if(boltA){const p=pivotWrap(boltA,-.24,.04,0);p.add(boltA);bolt.userData.handle=p}
  return{g:root,parts:{bolt:boltA,boltBody:boltB,trigger:trig,boltPivot:boltA&&boltA.parent},grip:[-.335,-.005],muzzle:[.596,.045,0],eject:[-.2,.05,.015],
    sight:{s:-.27,y:.0712},scope:true,hand:[-.04,.02],ammo:'308',kind:'hunter',len:1.23,boltAxis:[-.24,.04]}};
B.hunterProc=function(){const g=group('hunter');g.add(ext([[-.6,-.1],[-.3,0],[.4,0],[.4,.04],[-.6,.04]],.04,mat('walnut'),{wear:false}));g.add(tube(.009,.3,.6,.03,mat('blued')));
  return{g,parts:{},grip:[-.3,0],muzzle:[.6,.03,0],eject:[-.2,.05,.015],sight:{s:-.27,y:.08},scope:true,ammo:'308',kind:'hunter',len:1.2}};

/* lofted shoulder stock: from the back of the receiver (s0, top yT, bottom yB) to the butt; returns group incl. recoil pad */
function shoulderStock(wood,s0,yT,yB,o={}){const g=group('stock');const L=o.len||.33,w=o.w||.0185,butt=s0-L;
  const top=s=>lerp(yT,yT-(o.drop||.072),(s0-s)/L);/* straight comb line */
  const bot=s=>{const u=(s0-s)/L;return u<.12?lerp(yB,yB-.004,u/.12):u<.4?lerp(yB-.004,yB-.05,sstep((u-.12)/.28)):lerp(yB-.05,yB-.13,(u-.4)/.6)};
  const nodes=[];const K=16;for(let i=0;i<=K;i++){const u=i/K,sv=s0-u*L+(i===0?.004:0),T_=top(sv),Bt=bot(sv),c=(T_+Bt)/2,h=(T_-Bt)/2;
    const ww=u<.3?lerp(w*1.02,w*.88,sstep(u/.3)):lerp(w*.88,w*1.12,(u-.3)/.7);nodes.push({s:sv,y:c,h,w:ww,e:u<.1?3.4:2.6})}
  g.add(loft(nodes,wood,{ring:36}));
  const bt=top(butt),bb=bot(butt);const padN=[];for(const[ds,k]of[[0,1],[-.006,1.01],[-.018,1.0],[-.021,.96]])padN.push({s:butt+.003+ds,y:(bt+bb)/2,h:(bt-bb)/2*k,w:w*1.12*k,e:3});
  g.add(loft(padN,mat('rubber'),{ring:36}));g.userData.butt=butt-.021;return g}
/* lofted pistol grip running down/back from (s0,y0) */
function pistolGrip(m,s0,y0,o={}){const len=o.len||.1,ang=o.ang||.32,d=o.d||.024,w=o.w||.0165;const nodes=[];const K=10;
  for(let i=0;i<=K;i++){const u=i/K;const sv=s0-Math.sin(ang)*len*u,yv=y0-Math.cos(ang)*len*u;
    const sw=1+(o.swell||.12)*Math.sin(u*Math.PI)-(u>.92?(u-.92)*1.5:0);nodes.push({s:sv,y:yv,h:d*sw,w:w*sw,e:o.e||2.6})}
  return loft(nodes,m,{ring:32})}

/* Grandpa's Pump: 870-style wood pump (procedural) */
B.shotgun=function(o={}){const g=group('shotgun');const st=mat('blued'),wood=mat(o.furn||'walnut'),bead=mat(o.bean?'bead':'brassBead');
  /* receiver: s -0.035..0.165, bore at y=0.032 */
  const rc=ext([[-.035,-.004,.006],[.165,-.004,.003],[.165,.05,.003],[.155,.054,.004],[.02,.055,.01],[-.012,.052,.008],[-.035,.043,.006]],.036,st,{bevel:.0022});g.add(rc);
  /* ejection port (right) + loading port (bottom) */
  const port=rbox(.004,.02,.058,.002,mat('bore'));place(port,.082,.036,.0172);g.add(port);
  const lport=rbox(.022,.004,.06,.002,mat('bore'));place(lport,.085,-.0045,0);g.add(lport);
  /* receiver pins and shell latch details */
  for(const ps of[.03,.11]){const pin=new T.Mesh(new T.CylinderGeometry(.0028,.0028,.0372,14),mat('stainless'));pin.rotation.z=Math.PI/2;place(pin,ps,.006);g.add(pin)}
  /* barrel + bead */
  const bl=.165,be=o.short?.43:.69;g.add(tube(.0118,bl,be,.032,st,{ri:.0093,seg:32}));
  const vr=rbox(.008,.0035,be-bl-.01,.0012,st);place(vr,(bl+be)/2+.005,.0505);g.add(vr);/* vent rib */
  for(let s=bl+.015;s<be-.01;s+=.028){const p=new T.Mesh(new T.BoxGeometry(.0032,.008,.007),st);place(p,s,.046,0);g.add(p)}
  const bd=sph(.0022,bead);place(bd,be-.01,.0545);g.add(bd);
  /* magazine tube + cap + barrel clamp */
  const me=(o.short?.40:o.extMag?.68:.62);g.add(tube(.0108,bl,me,.004,st,{seg:28}));
  const cap=lathe([[.0108,me],[.0118,me+.002],[.0118,me+.018],[.009,me+.024],[1e-4,me+.025]],st,24,{y:.004});g.add(cap);
  const cl=ext([[me-.012,-.006],[me+.004,-.006],[me+.004,.046],[me-.012,.046]],.026,st,{bevel:.003});g.add(cl);
  /* pump (ribbed wood forend around the mag tube) */
  const pump=group('pump');const pr=[],P0=.205,P1=.395;pr.push([.0105,P0]);pr.push([.019,P0+.002]);pr.push([.0225,P0+.008]);
  for(let s=P0+.016;s<P1-.016;s+=.0105){pr.push([.0235,s]);pr.push([.0235,s+.0062]);pr.push([.0212,s+.0075]);pr.push([.0212,s+.0092])}
  pr.push([.0235,P1-.012]);pr.push([.022,P1-.004]);pr.push([.017,P1]);pr.push([.0112,P1]);
  const pw=lathe(pr,wood,36,{y:.009});pw.scale.x=.9;pw.scale.y=.95;pump.add(pw);
  /* action bars */
  for(const sx of[-1,1]){const ab=new T.Mesh(new T.BoxGeometry(.002,.006,.2),st);place(ab,P0-.1,.008,sx*.0155);pump.add(ab)}
  g.add(pump);
  /* trigger guard + trigger */
  const tg=ext(rshape([[-.012,-.004],[.07,-.004],[.07,-.008],[.05,-.03],[.0,-.032],[-.02,-.02],[-.02,-.004]],.006),.016,st,{bevel:.0015});
  const tgh=rshape([[-.008,-.007],[.058,-.007],[.044,-.026],[.002,-.027],[-.012,-.018]],.006);
  const tgs=rshape([[-.012,-.004],[.07,-.004],[.07,-.008],[.05,-.03],[.0,-.032],[-.02,-.02],[-.02,-.004]],.006);tgs.holes.push(new T.Path(tgh.getPoints()));
  g.remove(tg);const tgm=ext(tgs,.016,st,{bevel:.0012});g.add(tgm);
  const trig=ext([[.018,-.005],[.026,-.005],[.024,-.016],[.017,-.024],[.014,-.022],[.019,-.013]],.006,mat('stainless'),{bevel:.001});g.add(trig);
  /* cross-bolt safety */const sf=new T.Mesh(new T.CylinderGeometry(.0032,.0032,.04,14),st);sf.rotation.z=Math.PI/2;place(sf,-.02,.0,0);g.add(sf);
  /* stock */
  const stock=shoulderStock(wood,-.033,.05,-.003,{len:.335,w:.0182});g.add(stock);
  /* left hand rests on the pump; grip is the stock wrist */
  return{g,parts:{pump,trigger:trig},grip:[-.07,.012],muzzle:[be,.032,0],eject:[.082,.038,.02],sight:{s:-.02,y:.064},sightFront:[be-.01,.064],
    rail:[.01,.062,.1],hand:[.30,.009],pumpTravel:.075,ammo:o.bean?'bean':'12ga',kind:'pump',len:be+.39,loadPort:[.085,-.01]}};
B.beanbag=()=>{const D=B.shotgun({furn:'orange',bean:true});D.kind='pump';return D};

/* Uncle Ray's Side-by-Side and the sawed-off (procedural) */
B.double=function(o={}){const g=group('double');const st=mat('blued'),wood=mat('walnut');
  const hinge=[.045,.006];const barrels=group('barrels');const bl=.04,be=o.short?.33:.70;
  for(const sx of[-1,1]){const b=tube(.0118,bl,be,.03,st,{ri:.0093,seg:32,x:sx*.0119});barrels.add(b)}
  const rib=ext([[bl+.01,.038],[be-.005,.038],[be-.005,.046],[bl+.01,.048]],.012,st,{bevel:.0015});barrels.add(rib);
  const bot=ext([[bl+.005,.012],[be-.03,.014],[be-.03,.02],[bl+.005,.02]],.01,st,{bevel:.0015});barrels.add(bot);
  const bead=sph(.0024,mat('brassBead'));place(bead,be-.006,.0502);barrels.add(bead);
  /* lump/monoblock */
  const mb=ext([[.02,.006],[.06,.004],[.06,.05],[.02,.05]],.044,st,{bevel:.003});barrels.add(mb);
  /* splinter forend */
  const fe=ext([[.07,-.001,.006],[o.short?.2:.27,.004,.01],[o.short?.2:.27,.02],[.07,.02]],.04,wood,{bevel:.007,wear:false});barrels.add(fe);
  /* two shells in the chambers (hidden while reloading until they go in) */
  const ch=group('chamber');for(const sx of[-1,1]){const r=cartridge('12ga');r.position.set(sx*.0119,.03,-(bl-.008));ch.add(r)}barrels.add(ch);
  /* pivot barrels around hinge pin */
  const piv=group('barrelsPivot');place(piv,hinge[0],hinge[1]);barrels.position.set(0,-hinge[1],hinge[0]);piv.add(barrels);g.add(piv);
  /* action body */
  const act=ext([[-.035,-.004,.006],[.045,-.004,.004],[.05,.006,.006],[.04,.046],[-.01,.05,.01],[-.035,.046,.006]],.046,st,{bevel:.004});g.add(act);
  const lever=ext([[-.028,.049],[-.004,.049],[.004,.053],[-.028,.055]],.012,st,{bevel:.0012});lever.rotation.y=.25;g.add(lever);
  /* hammers? hammerless boxlock; two triggers in guard */
  const tgs=rshape([[-.02,-.004],[.05,-.004],[.035,-.03],[-.005,-.032],[-.025,-.02]],.006);tgs.holes.push(new T.Path(rshape([[-.016,-.007],[.04,-.007],[.03,-.026],[-.002,-.027],[-.018,-.017]],.006).getPoints()));
  g.add(ext(tgs,.012,st,{bevel:.0012}));
  for(const[ts,tx]of[[.018,-.004],[.006,.004]]){const t=ext([[ts,-.005],[ts+.007,-.005],[ts+.005,-.018],[ts-.002,-.022],[ts-.004,-.02],[ts+.001,-.012]],.005,mat('stainless'),{bevel:.0008});t.position.x=tx;g.add(t)}
  /* stock */
  if(o.short){/* cut-down stock: a wood bird's-head grip */
    g.add(loft([{s:-.031,y:.03,h:.026,w:.0205,e:3.2},{s:-.05,y:.02,h:.024,w:.018},{s:-.068,y:-.0,h:.022,w:.0165},{s:-.082,y:-.03,h:.021,w:.0165},{s:-.092,y:-.06,h:.022,w:.0172},{s:-.1,y:-.085,h:.024,w:.018},{s:-.108,y:-.097,h:.018,w:.015,e:2}],wood,{ring:32}));
    const cap=loft([{s:-.11,y:-.1,h:.016,w:.013},{s:-.114,y:-.104,h:.012,w:.01}],st,{ring:20});g.add(cap)}
  else{g.add(shoulderStock(wood,-.033,.046,-.003,{len:.34,w:.019}))}
  return{g,parts:{barrels:piv,chamber:ch},grip:o.short?[-.068,.0]:[-.07,.012],muzzle:[be,.03,0],muzzles:[[be,.03,-.0119],[be,.03,.0119]],eject:[.03,.035,0],sight:{s:-.03,y:.0552},sightFront:[be-.006,.0552],
    hand:o.short?[.12,-.004]:[.17,-.004],ammo:'12ga',kind:'break',len:be+(o.short?.12:.378),hinge}};
B.sawedoff=()=>{const D=B.double({short:true});return D};

/* The Retirement Plan: .357 revolver, 4in barrel, walnut grips (procedural) */
B.revolver=function(){const g=group('revolver');const st=mat('blued'),grip=mat('walnutGrip');
  const bore=.058,ca=[.0295,.0455];/* bore line height, cylinder axis (s,y) */
  /* frame: topstrap, cylinder window, recoil shield, hammer slot and the top of the grip frame */
  const fs=rshape([[-.034,.03,.008],[-.03,.052,.008],[-.016,.066,.008],[-.004,.0715,.004],[.058,.0715,.003],[.068,.0675,.003],[.068,.036,.004],[.06,.026,.006],[.04,.022,.004],[.03,.02,.003],[.005,.02,.003],[-.006,.014,.004],[-.018,.008,.006],[-.03,.01,.006]],.003);
  fs.holes.push(new T.Path(rshape([[.0065,.0265],[.0545,.0265],[.0545,.0665],[.0065,.0665]],.003).getPoints().reverse()));
  g.add(ext(fs,.032,st,{bevel:.0022}));
  /* thumb latch + side plate screws */
  const latch=ext([[-.012,.045],[.002,.045],[.002,.052],[-.012,.052]],.0365,st,{bevel:.0012});g.add(latch);
  for(const[ss,yy]of[[-.02,.035],[.05,.03]]){const sc=new T.Mesh(new T.CylinderGeometry(.0022,.0022,.0335,12),mat('stainless'));sc.rotation.z=Math.PI/2;place(sc,ss,yy);g.add(sc)}
  /* barrel: round tube, ventilated-look rib, half underlug with rounded nose, ramp front sight with red insert */
  const bs=.068,be=.17;g.add(tube(.0088,bs-.004,be,bore,st,{ri:.0046,seg:32}));
  const lug=loft([{s:bs,y:.041,h:.012,w:.0078,e:2.6},{s:be-.012,y:.041,h:.012,w:.0078,e:2.6},{s:be-.004,y:.043,h:.0095,w:.007,e:2.2},{s:be-.0005,y:.047,h:.0045,w:.004,e:2}],st,{ring:28});g.add(lug);
  g.add(ext([[bs,.064],[be-.003,.0655],[be-.003,.0695],[bs,.069]],.0075,st,{bevel:.0012}));
  g.add(ext([[be-.024,.069],[be-.004,.069],[be-.004,.0785,.0012],[be-.009,.0785]],.0036,st,{bevel:.0005}));
  const ins=new T.Mesh(new T.BoxGeometry(.0038,.0035,.0045),mat('hull'));place(ins,be-.0075,.0755);g.add(ins);
  /* adjustable rear sight on the topstrap */
  g.add(ext([[-.022,.0715],[.004,.0715],[.002,.0765],[-.016,.0765]],.012,st,{bevel:.0012}));
  for(const sx of[-1,1]){const r=new T.Mesh(new T.BoxGeometry(.0042,.0035,.005),st);place(r,-.019,.0778,sx*.0034);g.add(r)}
  /* cylinder: 6 flutes, chambers, rounds; on a crane that swings out to the left */
  const crane=group('crane');const cyl=group('cylinder');const R=.0196;
  const cs=new T.Shape();const N=120;for(let i=0;i<=N;i++){const a=i/N*Math.PI*2;let r=R;const k=(a/(Math.PI*2)*6+.5)%1;const f=Math.max(0,1-Math.abs(k-.5)/.16);r-=Math.sqrt(f)*.0032;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?cs.lineTo(x,y):cs.moveTo(x,y)}
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2,p=new T.Path();p.absarc(Math.cos(a)*.0125,Math.sin(a)*.0125,.0047,0,Math.PI*2,true);cs.holes.push(p)}
  const cg=new T.ExtrudeGeometry(cs,{depth:.0436,bevelEnabled:true,bevelThickness:.0012,bevelSize:.001,bevelSegments:2,curveSegments:10});cg.translate(0,0,-.0218);meterUV(cg,'box');wear(cg,.62);
  const cm=new T.Mesh(cg,st);cm.castShadow=true;cyl.add(cm);
  const rounds=group('rounds');for(let i=0;i<6;i++){const a=i/6*Math.PI*2,r=cartridge('357');r.position.set(Math.cos(a)*.0125,Math.sin(a)*.0125,.0232);rounds.add(r)}
  cyl.add(rounds);cyl.userData.rounds=rounds;
  const er=tube(.0026,.022,.064,0,st,{seg:14});cyl.add(er);/* ejector rod forward under the barrel */
  const ek=tube(.0034,.058,.066,0,mat('knurl'),{seg:14});cyl.add(ek);
  crane.add(cyl);
  const arm=rbox(.0055,.016,.004,.0015,st);arm.position.set(-.004,-.011,-.0245);crane.add(arm);
  /* crane pivot: below-left of the cylinder axis, axis parallel to the bore */
  const cpiv=group('cranePivot');place(cpiv,ca[0],.03,-.008);crane.position.set(.008,ca[1]-.03,0);cpiv.add(crane);g.add(cpiv);
  /* hammer (spur), trigger, guard */
  const hp=group('hammerPivot');place(hp,-.016,.045);
  hp.add(ext([[-.003,-.008],[.006,-.006],[.006,.01],[.0,.022],[-.008,.024],[-.024,.03,.004],[-.026,.025,.003],[-.012,.016],[-.006,.004]],.0065,st,{bevel:.0012}));g.add(hp);
  {const sp=ext([[-.012,.0235],[-.024,.029,.003],[-.026,.025],[-.014,.019]],.0072,mat('knurl'),{bevel:.0008,wear:false});hp.add(sp)}
  const tgs=rshape([[-.004,.021],[.044,.021],[.036,-.002],[.006,-.008],[-.01,.004]],.007);tgs.holes.push(new T.Path(rshape([[.0,.0165],[.038,.0165],[.031,.002],[.007,-.003],[-.004,.006]],.006).getPoints().reverse()));
  g.add(ext(tgs,.0085,st,{bevel:.0012}));
  const trig=ext([[.008,.022],[.017,.022],[.015,.01],[.009,.0],[.006,.002],[.01,.012]],.0062,st,{bevel:.0009});g.add(trig);
  /* walnut wrap-around grip with a swell, plus the frame's backstrap peeking out at the top */
  {/* grip frame (steel, narrow) with a rounded butt */
   const gf=[[-.03,.012],[-.006,.012],[-.012,-.01],[-.02,-.05],[-.026,-.072],[-.04,-.082,.006],[-.058,-.078,.008],[-.056,-.05],[-.047,-.01],[-.038,.008]];
   g.add(ext(gf,.012,st,{bevel:.002,r:.004}));
   /* panel outline, slightly inset from the frame; smooth walnut border + checkered field */
   const pnl=[[-.028,.006],[-.009,.004],[-.014,-.014],[-.02,-.045],[-.026,-.068],[-.04,-.077,.006],[-.054,-.074,.008],[-.052,-.048],[-.045,-.012],[-.037,.004]];
   const fld=[[-.026,-.006],[-.014,-.008],[-.018,-.03],[-.024,-.058],[-.04,-.068,.004],[-.048,-.064,.004],[-.047,-.044],[-.041,-.016],[-.034,-.006]];
   for(const sx of[-1,1]){const pm=ext(pnl,.0085,mat('walnut'),{bevel:.0035,bevelSeg:4,r:.006,wear:false});pm.position.x=sx*.0098;g.add(pm);
     const ck=ext(fld,.002,grip,{bevel:.0006,r:.004,wear:false});ck.position.x=sx*.0168;g.add(ck);
     const md=new T.Mesh(new T.CylinderGeometry(.0052,.0052,.0018,24),mat('stainless'));md.rotation.z=Math.PI/2;place(md,-.026,-.004,sx*.0182);g.add(md);
     const sc=new T.Mesh(new T.CylinderGeometry(.0024,.0024,.0014,12),mat('stainless'));sc.rotation.z=Math.PI/2;place(sc,-.036,-.042,sx*.0182);g.add(sc)}
   /* side plate seam lines */
   for(const sx of[-1,1]){const seam=new T.Mesh(new T.BoxGeometry(.0006,.0006,.045),mat('bore'));place(seam,.0,.024,sx*.0161);seam.rotation.x=.25;g.add(seam)}}
  return{g,parts:{cylinder:cyl,crane:cpiv,hammer:hp,trigger:trig},grip:[-.028,.012],muzzle:[be,bore,0],eject:[0,ca[1],0],sight:{s:-.019,y:.0765},sightFront:[be-.007,.0785],
    ammo:'357',kind:'revolver',len:.24,cylAxis:ca}};

/* The Carpool: compact 9mm SMG (procedural, roller-delayed style) */
B.smg=function(){const g=group('smg');const st=mat('parkerized'),pol=mat('polymer');
  const bore=.036;
  /* receiver tube with welded rails */
  g.add(lathe([[1e-4,-.11],[.019,-.11],[.021,-.106],[.021,.17],[.019,.175],[1e-4,.175]],st,32,{y:bore}));
  g.add(ext([[-.105,bore+.012],[.165,bore+.012],[.165,bore+.024],[-.105,bore+.024]],.026,st,{bevel:.002}));
  /* cocking tube + handle (left, forward) */
  g.add(tube(.008,.12,.27,bore+.02,st,{seg:20}));
  const bolt=group('bolt');const ch=ext([[.0,-.003],[.016,-.003],[.016,.004],[.0,.004]],.024,st,{bevel:.002});ch.position.x=-.018;bolt.add(ch);place(bolt,.2,bore+.02);g.add(bolt);
  /* ejection port right */const port=rbox(.004,.012,.038,.002,mat('bore'));place(port,.075,bore+.002,.0205);g.add(port);
  /* handguard with grip ribs */
  /* perforated steel barrel shroud: a tube with rows of punched holes (dark recesses with a lit rim) */
  g.add(tube(.021,.175,.315,bore,st,{ri:.0185,seg:36}));
  {const holeG=new T.CylinderGeometry(.0042,.0042,.004,14),rimG=new T.TorusGeometry(.0044,.0007,6,16);
   for(let r=0;r<10;r++){const a=-Math.PI*.15+r/10*Math.PI*2;for(let k=0;k<6;k++){const sv=.19+k*.021+(r%2)*.0105;if(sv>.305)continue;
     const h=new T.Mesh(holeG,mat('bore'));h.position.set(Math.cos(a)*.0195,bore+Math.sin(a)*.0195,-sv);h.lookAt(h.position.x*2,(h.position.y-bore)*2+bore,h.position.z);h.rotateX(Math.PI/2);g.add(h);
     const rm=new T.Mesh(rimG,st);rm.position.set(Math.cos(a)*.0212,bore+Math.sin(a)*.0212,-sv);rm.lookAt(rm.position.x*2,(rm.position.y-bore)*2+bore,rm.position.z);g.add(rm)}}}
  /* polymer handguard under the shroud's rear half for the support hand */
  g.add(loft([{s:.176,y:bore-.022,h:.012,w:.022},{s:.2,y:bore-.026,h:.016,w:.024},{s:.27,y:bore-.026,h:.016,w:.024},{s:.29,y:bore-.022,h:.012,w:.021}],pol,{ring:28}));
  /* stamped receiver: pressed reinforcing ribs and spot welds */
  for(const sx of[-1,1]){const rib=rbox(.003,.006,.2,.0015,st);place(rib,.03,bore-.004,sx*.02);g.add(rib);
    for(let k=0;k<6;k++){const w=new T.Mesh(new T.CylinderGeometry(.0018,.0018,.0012,10),st);w.rotation.z=Math.PI/2;place(w,-.07+k*.04,bore+.01,sx*.0212);g.add(w)}}
  /* barrel, front sight hood */
  g.add(tube(.0075,.17,.36,bore,st,{ri:.0047,seg:24}));
  const fsb=ext([[.322,bore-.008],[.345,bore-.008],[.345,bore+.034],[.322,bore+.034]],.02,st,{bevel:.003});g.add(fsb);
  const hood=lathe([[.012,.326],[.0135,.326],[.0135,.343],[.012,.343]],st,20,{y:bore+.036});hood.material=st;g.add(hood);
  const post=new T.Mesh(new T.BoxGeometry(.0018,.01,.002),st);place(post,.335,bore+.031);g.add(post);
  /* rear aperture: ring with a peep hole */{const rs=new T.Shape();rs.absarc(0,0,.0085,0,Math.PI*2,false);const h=new T.Path();h.absarc(0,0,.0032,0,Math.PI*2,true);rs.holes.push(h);
    const rg=new T.ExtrudeGeometry(rs,{depth:.006,bevelEnabled:true,bevelThickness:.0008,bevelSize:.0008,bevelSegments:2,curveSegments:20});rg.translate(0,0,-.003);meterUV(rg,'box');const rm=new T.Mesh(rg,st);place(rm,-.068,bore+.034);g.add(rm)}
  const rds=ext([[-.08,bore+.024],[-.055,bore+.024],[-.06,bore+.032],[-.075,bore+.032]],.02,st,{bevel:.002});g.add(rds);
  /* lower: polymer trigger group + grip */
  g.add(ext([[-.06,bore-.016],[.09,bore-.016],[.09,bore-.03],[.04,bore-.034],[-.06,bore-.03]],.03,pol,{bevel:.003}));
  const tgs=rshape([[-.006,bore-.03],[.05,bore-.03],[.044,bore-.058],[.0,bore-.06],[-.01,bore-.05]],.006);tgs.holes.push(new T.Path(rshape([[.0,bore-.034],[.042,bore-.034],[.036,bore-.054],[.004,bore-.055],[-.004,bore-.046]],.005).getPoints()));
  g.add(ext(tgs,.016,pol,{bevel:.002}));
  const trig=ext([[.018,bore-.032],[.025,bore-.032],[.022,bore-.046],[.016,bore-.05],[.014,bore-.048],[.019,bore-.04]],.006,st,{bevel:.0008});g.add(trig);
  g.add(pistolGrip(pol,-.022,bore-.026,{len:.095,ang:.3,d:.019,w:.0158,swell:.1,e:2.8}));
  /* magazine well + curved 9mm magazine */
  g.add(ext([[.065,bore-.016],[.105,bore-.016],[.1,bore-.05],[.068,bore-.05]],.028,st,{bevel:.002}));
  const mag=group('mag');const ms=[];const MN=10;for(let i=0;i<=MN;i++){const t=i/MN;ms.push([.072+t*.03*t*.6+.0,bore-.04-t*.15]);}
  const mp=[[.07,bore-.04],[.096,bore-.04],[.106,bore-.12],[.114,bore-.19],[.088,bore-.193,.004],[.08,bore-.12]];
  mag.add(ext(mp,.022,st,{bevel:.0015,r:.003}));mag.add(ext([[.084,bore-.188],[.118,bore-.19],[.118,bore-.2,.003],[.084,bore-.198,.003]],.025,pol,{bevel:.002}));
  g.add(mag);
  /* retractable stock: two rods + butt plate */
    {const stk=group('stock');for(const sx of[-1,1]){stk.add(tube(.0038,-.13,.0,0,st,{x:sx*.019,seg:12}))}/* collapsed */
   stk.add(ext([[-.145,-.08,.006],[-.125,-.08],[-.125,.01],[-.145,.01,.006]],.05,pol,{bevel:.005}));
   stk.add(ext([[-.149,-.082],[-.144,-.082],[-.144,.012],[-.149,.012]],.052,mat('rubber'),{bevel:.002,wear:false}));
   place(stk,-.1,bore-.035);g.add(stk);
   /* folding hinge block + pin at the rear of the receiver */
   const hb=rbox(.034,.03,.022,.004,st);place(hb,-.103,bore-.022);g.add(hb);
   const pin=new T.Mesh(new T.CylinderGeometry(.0042,.0042,.038,16),mat('stainless'));pin.rotation.z=Math.PI/2;place(pin,-.108,bore-.03);g.add(pin)}
  return{g,parts:{mag,bolt,trigger:trig},grip:[-.04,bore-.035],muzzle:[.36,bore,0],eject:[.075,bore+.004,.02],sight:{s:-.068,y:bore+.034},sightFront:[.335,bore+.036],rail:[-.03,bore+.024,.12],
    hand:[.24,bore-.03],magDrop:[0,-.2,0],ammo:'9mm',kind:'smg',len:.7}};

/* Weekend Nailer: cordless framing nailer (procedural, comedy) */
B.nailer=function(){const g=group('nailer');const y=mat('yellow'),blk=mat('polymer'),st=mat('parkerized');
  /* motor body */
  g.add(ext([[-.06,.02],[.17,.02],[.18,.06,.01],[.15,.11,.03],[-.04,.11,.03],[-.07,.08,.02]],.07,y,{bevel:.01,bevelSeg:4}));
  g.add(ext([[-.05,.035],[.16,.035],[.16,.095],[-.05,.095]],.073,blk,{bevel:.004}));
  /* nose / drive guide */
  g.add(ext([[.17,-.03],[.205,-.03],[.205,.05],[.175,.06]],.03,st,{bevel:.004}));
  const tip=tube(.006,.205,.23,-.01,st,{seg:16});g.add(tip);
  /* handle + trigger */
  g.add(pistolGrip(blk,.0,.03,{len:.125,ang:.12,d:.021,w:.0175,swell:.08,e:2.6}));
  const trig=ext([[.03,.0],[.04,.0],[.035,-.03],[.025,-.03]],.01,y,{bevel:.002});g.add(trig);
  /* battery */
  g.add(ext([[-.06,-.09],[.05,-.09],[.05,-.135,.006],[-.065,-.135,.006]],.075,mat('battery'),{bevel:.006}));
  g.add(ext([[-.06,-.124],[.05,-.124],[.05,-.128],[-.065,-.128]],.077,y,{bevel:.001}));
  {/* battery labels (both sides) + fuel gauge button */const lm=new T.MeshStandardMaterial({map:labelTex(),roughness:.6,metalness:0});
   for(const sx of[-1,1]){const lb=new T.Mesh(new T.PlaneGeometry(.085,.026),lm);lb.position.set(sx*.0392,-.106,-.008);lb.rotation.y=sx*Math.PI/2;g.add(lb)}
   const btn=rbox(.012,.004,.008,.0015,mat('rubber'));place(btn,-.045,-.0885,0);g.add(btn);
   for(let k=0;k<3;k++){const led=new T.Mesh(new T.BoxGeometry(.003,.0012,.003),new T.MeshBasicMaterial({color:new T.Color(.2,1.6,.3),toneMapped:false}));place(led,-.03+k*.006,-.0885,0);g.add(led)}}
  /* rubber overmould on the handle, motor vent slots, depth-adjust wheel, belt hook */
  for(const sx of[-1,1]){const om=ext([[-.012,.0],[.014,-.002],[.01,-.075,.006],[-.022,-.072,.006]],.004,mat('rubber'),{bevel:.0015,wear:false});om.position.x=sx*.0175;g.add(om);
    for(let k=0;k<5;k++){const v=rbox(.003,.024,.004,.0012,mat('bore'));place(v,.0+k*.012,.07,sx*.0372);g.add(v)}}
  {const wh=new T.Mesh(new T.CylinderGeometry(.011,.011,.008,24),mat('rubber'));wh.rotation.z=Math.PI/2;place(wh,.19,.03,0);g.add(wh);
   const hook=ext([[-.04,.06],[.02,.06],[.02,.064],[-.04,.064]],.003,st,{bevel:.0008});hook.position.x=.0395;g.add(hook)}
  /* angled nail magazine with strip */
  const mag=group('mag');const k=Math.tan(.42);/* magazine leans back 24 degrees from the drive axis */
  mag.add(ext([[.152,-.018],[.112,-.018],[.112-.16*k,-.178],[.152-.16*k,-.178]],.02,blk,{bevel:.003}));
  mag.add(ext([[.205,-.03],[.19,-.03],[.19-.14*k,-.17],[.205-.14*k,-.17]],.012,blk,{bevel:.002}));
  for(let i=0;i<16;i++){const n=cartridge('nail');const yy=-.028-i*.0088;place(n,.118-(-yy-.028)*k,yy,0);n.scale.set(1,1,.92);mag.add(n)}
  const cap=ext([[.16,-.178],[.04-.0,-.178],[.04,-.19,.004],[.16-.02,-.19,.004]],.024,mat('yellow'),{bevel:.003});mag.add(cap);
  mag.add(ext([[.157,-.016],[.15,-.016],[.15-.16*k,-.176],[.157-.16*k,-.176]],.026,mat('alloy'),{bevel:.001}));
  const fol=rbox(.024,.012,.018,.003,mat('yellow'));place(fol,.13-.12*k,-.155);mag.add(fol);
  g.add(mag);
  return{g,parts:{mag,trigger:trig},grip:[-.008,.0],muzzle:[.23,-.01,0],eject:[.1,.0,.04],sight:{s:-.05,y:.12},sightFront:[.15,.12],
    hand:[.08,.115],ammo:'nail',kind:'nailer',len:.3,magDrop:[0,-.1,.05]}};

/* aliases */
const ALIAS={hunting:'hunter',sniper:'hunter',pump:'shotgun',sawed:'sawedoff',sawedOff:'sawedoff',sbs:'double',carbine:'rifle',nail:'nailer','talking-to':'beanbag'};
const TYPES=['pistol','revolver','nailer','shotgun','double','sawedoff','beanbag','rifle','smg','hunter'];

/* ------------------------------------------------------------------ attachments */
function redDot(){const g=group('redDot');const al=mat('alloy');
  g.add(ext([[-.022,0],[.022,0],[.02,.008],[-.02,.008]],.024,al,{bevel:.002}));
  const body=ext(rshape([[-.024,.006],[.026,.006],[.026,.044,.008],[.018,.05,.004],[-.016,.05,.004],[-.024,.044,.008]],.004),.032,al,{bevel:.003});
  const hole=new T.Path();hole.absarc(0,0,.0115,0,Math.PI*2,true);
  const ring=new T.Shape();ring.absarc(0,0,.016,0,Math.PI*2,false);ring.holes.push(hole);
  const rg=new T.ExtrudeGeometry(ring,{depth:.046,bevelEnabled:true,bevelThickness:.002,bevelSize:.0015,bevelSegments:2,curveSegments:24});rg.translate(0,0,-.023);
  const tube=new T.Mesh(rg,al);tube.position.set(0,.03,0);g.add(tube);
  g.add(ext([[-.012,.006],[.012,.006],[.012,.018],[-.012,.018]],.024,al,{bevel:.002}));
  const knob=new T.Mesh(new T.CylinderGeometry(.006,.006,.008,16),mat('knurl'));knob.rotation.z=Math.PI/2;knob.position.set(.02,.03,.004);g.add(knob);
  const lens=new T.Mesh(new T.CircleGeometry(.0115,32),mat('glass'));lens.position.set(0,.03,-.018);g.add(lens);
  /* the dot is a tiny emissive disc just ahead of the rear lens; reticle height = .03 */
  const dot=new T.Mesh(new T.CircleGeometry(.00045,12),mat('dot'));dot.position.set(0,.03,-.02);dot.renderOrder=5;g.add(dot);
  g.userData.dotY=.03;return g}
function pistolDot(){const g=group('rmr');const al=mat('alloy');
  g.add(ext(rshape([[-.02,0],[.02,0],[.018,.012,.004],[.008,.026,.006],[-.016,.026,.006],[-.02,.01,.004]],.003),.026,al,{bevel:.002}));
  const lens=new T.Mesh(new T.PlaneGeometry(.018,.014),mat('glass'));lens.position.set(0,.016,-.004);g.add(lens);
  const dot=new T.Mesh(new T.CircleGeometry(.0004,12),mat('dot'));dot.position.set(0,.016,-.006);g.add(dot);g.userData.dotY=.016;return g}
function suppressor(r=.017,len=.15){const g=group('suppressor');
  const prof=[[1e-4,0],[r*.55,0],[r*.6,.006],[r*.95,.012],[r,.016],[r,len-.006],[r*.94,len-.002],[r*.4,len],[.0042,len],[.0042,len-.01],[1e-4,len-.01]];
  g.add(lathe(prof,mat('parkerized'),32));
  const k=tube(r*1.02,.004,.026,0,mat('knurl'),{seg:32});g.add(k);return g}
function vertGrip(){const g=group('foregrip');const p=mat('polymer');
  g.add(ext([[-.018,0],[.018,0],[.016,-.008],[-.016,-.008]],.022,mat('alloy'),{bevel:.002}));
  const body=lathe([[1e-4,0],[.0125,0],[.014,.01],[.0135,.05],[.015,.07],[.013,.08],[1e-4,.08]],p,20);body.rotation.x=Math.PI/2;body.position.y=-.004;g.add(body);/* hangs down */
  return g}

/* ------------------------------------------------------------------ model() */
function finalize(D,type,att){const root=group('gun_'+type);const off=group('gunBody');root.add(off);off.add(D.g);
  /* shift so grip is at origin */
  off.position.set(0,-D.grip[1],D.grip[0]);
  const P=(s,y,x=0)=>V(x,y-D.grip[1],-(s-D.grip[0]));
  att=att||{};const applied={};
  /* sight point (eye line) */
  let sight={s:D.sight.s,y:D.sight.y};
  if(att.redDot&&!D.scope&&D.kind!=='break'&&D.kind!=='revolver'&&D.kind!=='nailer'){
    if(D.kind==='pistol'&&D.parts.slide){const rd=pistolDot();/* slide cut in front of rear sight */const sl=D.parts.slide;
      const wp=V(0,.079,-.0);const dot=rd;dot.position.set(0,.0795,.005);/* in pistol source space this sits on the slide */
      const holder=group('rmrHolder');holder.add(dot);D.g.add(holder);holder.userData.followSlide=true;D.rmr=holder;sight={s:-.005,y:.0795+.016};applied.redDot=true}
    else if(D.rail){const rd=redDot();const s=D.rail[0]+(D.kind==='rifle'?.06:.02),y=D.rail[1];if(D.kind==='rifle'){const rs=srcNode(D.g,'Sight');if(rs)rs.visible=false}place(rd,s,y);D.g.add(rd);sight={s:s-.04,y:y+rd.userData.dotY};applied.redDot=true}}
  if(att.suppressor&&D.kind!=='break'&&D.kind!=='revolver'&&D.kind!=='nailer'&&D.kind!=='pump'){
    const r=D.kind==='pistol'?.0145:D.kind==='hunter'?.019:.018,len=D.kind==='pistol'?.13:.16;const sp=suppressor(r,len);place(sp,D.muzzle[0]-.008,D.muzzle[1],D.muzzle[2]);D.g.add(sp);D.muzzle=[D.muzzle[0]-.008+len,D.muzzle[1],D.muzzle[2]];applied.suppressor=true}
  if(att.extMag&&D.parts.mag){const m=D.parts.mag;
    if(D.kind==='pistol'){const ex=m.clone(true);/* extended pistol mag: longer body below the grip + base pad */
      const pad=rbox(.03,.016,.042,.004,mat('polymer'));pad.position.set(-.088,-.061,0);m.add(pad);m.userData.ext=true}
    else if(D.kind==='rifle'||D.kind==='smg'){m.scale.y=1.3;applied.extMag=true}
    applied.extMag=true}
  if(att.extMag&&D.kind==='pump')applied.extMag=true;
  if(att.foregrip&&(D.kind==='rifle'||D.kind==='smg')){const fg=vertGrip();const s=D.kind==='rifle'?.2:.27,y=D.kind==='rifle'?.008:D.hand[1]-.004;place(fg,s,y);D.g.add(fg);D.foregrip=[s,y-.04];applied.foregrip=true}
  const muzzle=new T.Object3D();muzzle.name='muzzle';muzzle.position.set(D.muzzle[2]||0,D.muzzle[1],-D.muzzle[0]);D.g.add(muzzle);
  const eject=new T.Object3D();eject.name='eject';eject.position.set(D.eject[2]||0,D.eject[1],-D.eject[0]);D.g.add(eject);
  root.userData={type,muzzle,eject,parts:Object.assign({},D.parts),length:D.len,ammo:D.ammo,kind:D.kind,attachments:applied,
    sightPoint:V(0,sight.y-D.grip[1],-(sight.s-D.grip[0])),scope:!!D.scope,def:D};
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  return root}
function model(type,opts={}){type=ALIAS[type]||type;const b=B[type];if(!b){console.warn('HT.Guns: unknown gun',type);return group('none')}
  const D=b();if(type==='shotgun'&&opts.attachments&&opts.attachments.extMag){const D2=B.shotgun({extMag:true});return finalize(D2,type,opts.attachments)}
  return finalize(D,type,opts.attachments)}

/* ------------------------------------------------------------------ hands and arms
   hand frame: origin at the wrist, +Y toward the fingers, +Z out of the back of the hand,
   +X toward the little finger (right hand; the left hand is a mirror, so its thumb sits at -X... see mirror below) */
function handMats(o){const glove=o.gloves!==false;const lt=texSet('leather'),cl=texSet('cloth'),sk=texSet('skin');
  const gl=new T.MeshStandardMaterial({color:srgb(o.glove||'#6e4c30'),map:rep(lt.map,34),normalMap:rep(lt.normal,34),roughnessMap:rep(lt.rough,34),roughness:1,metalness:0});gl.normalScale.set(.7,.7);
  const skin=new T.MeshStandardMaterial({color:srgb(o.skin||'#c58c68'),normalMap:rep(sk.normal,40),roughnessMap:rep(sk.rough,40),roughness:1,metalness:0});skin.normalScale.set(.3,.3);
  const cuff=new T.MeshStandardMaterial({color:srgb(o.cuff||'#3a3a38'),normalMap:rep(cl.normal,60),roughness:.95,metalness:0});
  const sleeve=new T.MeshStandardMaterial({color:srgb(o.sleeve||'#5d6b4f'),map:rep(cl.map,14),normalMap:rep(cl.normal,40),roughness:.92,metalness:0});sleeve.normalScale.set(.6,.6);
  const nail=new T.MeshStandardMaterial({color:srgb('#e6c2b0'),roughness:.35});
  return{hand:glove?gl:skin,skin,cuff:glove?cuff:skin,sleeve,nail,glove}}
function capsule(r0,r1,L,m,seg=14){const prof=[];const n=5;
  for(let i=0;i<=n;i++){const a=-Math.PI/2+i/n*Math.PI/2;prof.push([Math.cos(a)*r0,r0+Math.sin(a)*r0])}
  for(let i=0;i<=n;i++){const a=i/n*Math.PI/2;prof.push([Math.cos(a)*r1,L-r1+Math.sin(a)*r1])}
  const g=new T.LatheGeometry(prof.map(p=>new T.Vector2(Math.max(p[0],1e-5),p[1])),seg);meterUV(g,'box');
  const me=new T.Mesh(g,m);me.castShadow=true;me.receiveShadow=true;return me}
const FINGERS=[/* x, y, z of knuckle; segment lengths; radius */
  {x:-.0285,y:.091,z:.001,L:[.044,.026,.022],r:.0094,spread:-.08},
  {x:-.0092,y:.095,z:.002,L:[.048,.03,.023],r:.0098,spread:-.02},
  {x:.0102,y:.092,z:.001,L:[.045,.028,.022],r:.0093,spread:.04},
  {x:.0275,y:.083,z:-.001,L:[.036,.021,.02],r:.0083,spread:.12}];
function buildHand(M,side){const root=group('hand_'+side);const inner=group('handInner');root.add(inner);if(side==='L')inner.scale.x=-1;
  /* palm: rounded slab, tapering toward the wrist, arched back, padded heel and thenar */
  const W=.084,H=.096,D=.03,r=.011;const g=new T.BoxGeometry(W,H,D,8,10,4),p=g.attributes.position;const hw=W/2-r,hh=H/2-r,hd=D/2-r;
  for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const cx=clamp(x,-hw,hw),cy=clamp(y,-hh,hh),cz=clamp(z,-hd,hd);let dx=x-cx,dy=y-cy,dz=z-cz;const l=Math.hypot(dx,dy,dz)||1;
    x=cx+dx/l*r;y=cy+dy/l*r;z=cz+dz/l*r;const v=(y+H/2)/H;/* 0 wrist .. 1 knuckles */
    x*=lerp(.78,1,sstep(v*1.4));if(z>0)z+=.004*Math.cos(x/W*Math.PI)-.003*(1-v);else{z-=.005*Math.exp(-Math.pow((x+.022)/.016,2)-Math.pow((v-.3)/.25,2));z-=.003*Math.exp(-Math.pow((v-.85)/.12,2))}
    z*=lerp(1.15,1,v);p.setXYZ(i,x,y+H/2+.004,z)}
  g.computeVertexNormals();meterUV(g,'box');const palm=new T.Mesh(g,M.hand);palm.castShadow=true;inner.add(palm);
  /* short wrist stub under the cuff, so a bent wrist never shows a gap */
  const stub=capsule(.026,.029,.05,M.hand);stub.position.y=-.035;stub.scale.z=.78;inner.add(stub);
  /* fingers */
  const fingers=[];
  FINGERS.forEach((F,fi)=>{let par=inner;const segs=[];let rr=F.r;
    for(let k=0;k<3;k++){const j=group('f'+fi+'_'+k);if(k===0)j.position.set(F.x,F.y,F.z);else j.position.y=F.L[k-1];par.add(j);
      const r1=rr*(k===2?.86:.95);const c=capsule(rr,r1,F.L[k]+(k<2?rr*.6:0),M.hand);c.position.y=-rr*.55;c.scale.z=.9;j.add(c);
      if(k===2&&!M.glove){const nl=new T.Mesh(new T.SphereGeometry(r1*.9,10,6,0,Math.PI*2,0,Math.PI/2),M.nail);nl.scale.set(.8,1.3,.35);nl.position.set(0,F.L[k]-r1*1.4,r1*.72);nl.rotation.x=-.25;j.add(nl)}
      segs.push(j);par=j;rr=r1}
    segs[0].rotation.z=F.spread;fingers.push(segs)});
  /* thumb: metacarpal from the heel of the palm, then two phalanges */
  const tb=group('thumbBase');tb.position.set(-.03,.022,-.006);inner.add(tb);
  const t0=group('t0');tb.add(t0);const mc=capsule(.0135,.0115,.05,M.hand);mc.position.y=-.006;mc.scale.z=.85;t0.add(mc);
  const t1=group('t1');t1.position.y=.044;t0.add(t1);t1.add(Object.assign(capsule(.0108,.0102,.034,M.hand),{}));t1.children[0].position.y=-.004;
  const t2=group('t2');t2.position.y=.03;t1.add(t2);const td=capsule(.0102,.0088,.026,M.hand);td.position.y=-.004;t2.add(td);
  if(!M.glove){const nl=new T.Mesh(new T.SphereGeometry(.0085,10,6,0,Math.PI*2,0,Math.PI/2),M.nail);nl.scale.set(.85,1.3,.35);nl.position.set(0,.012,.0072);nl.rotation.x=-.25;t2.add(nl)}
  /* knuckle seam ridge for gloves */
  if(M.glove){const sg=new T.Mesh(new T.CylinderGeometry(.003,.003,.07,8),M.hand);sg.rotation.z=Math.PI/2;sg.position.set(0,.088,.012);sg.scale.set(1,1,.7);inner.add(sg)}
  root.userData={fingers,thumb:[tb,t0,t1,t2],side};return root}
/* finger pose: f = [[a,b,c] x4], th=[x,y,z,mcp,ip] */
const POSE={
  grip:{f:[[.62,.82,.32],[1.2,1.45,.7],[1.25,1.5,.72],[1.3,1.45,.7]],th:[.15,-.55,.78,.35,.25]},
  gripPistol:{f:[[.42,.6,.22],[1.15,1.42,.68],[1.2,1.48,.7],[1.28,1.42,.68]],th:[.05,-.65,.6,.15,.1]},
  trigger:{f:[[.95,1.05,.4],[1.2,1.45,.7],[1.25,1.5,.72],[1.3,1.45,.7]],th:[.15,-.55,.78,.35,.25]},
  wrap:{f:[[.85,1.15,.55],[.95,1.25,.6],[1.0,1.3,.62],[1.05,1.25,.6]],th:[.0,-.35,.45,.15,.12]},
  cup:{f:[[.6,.75,.4],[.65,.8,.45],[.7,.85,.45],[.75,.85,.45]],th:[.05,-.4,.5,.2,.15]},
  support:{f:[[.55,.7,.35],[.75,.95,.5],[.85,1.05,.55],[.9,1.0,.5]],th:[.0,-.25,.35,.1,.1]},
  pinch:{f:[[.75,.9,.5],[1.25,1.5,.8],[1.3,1.5,.8],[1.35,1.45,.75]],th:[.25,-.75,.75,.35,.35]},
  relaxed:{f:[[.25,.35,.2],[.3,.4,.22],[.35,.45,.25],[.4,.45,.25]],th:[.05,-.25,.35,.1,.1]},
  flat:{f:[[.08,.1,.05],[.06,.08,.05],[.08,.1,.06],[.12,.12,.06]],th:[-.05,-.15,.25,.05,.05]},
  fist:{f:[[1.35,1.55,.9],[1.4,1.6,.9],[1.42,1.6,.9],[1.45,1.55,.85]],th:[.2,-.8,.9,.5,.4]}};
function applyFingers(h,pz){const F=h.userData.fingers,Th=h.userData.thumb;
  for(let i=0;i<4;i++)for(let k=0;k<3;k++)F[i][k].rotation.x=-pz.f[i][k];
  Th[0].rotation.set(0,0,0);Th[1].rotation.set(-pz.th[0],pz.th[1],pz.th[2]);Th[2].rotation.x=-pz.th[3];Th[3].rotation.x=-pz.th[4]}
function mixPose(a,b,t){return{f:a.f.map((r,i)=>r.map((v,k)=>lerp(v,b.f[i][k],t))),th:a.th.map((v,i)=>lerp(v,b.th[i],t))}}
/* arm: upper arm + forearm sleeves solved with two-bone IK from a fixed shoulder to the wrist */
function buildArm(M,side){const g=group('arm_'+side);
  const sleeveProf=(r0,r1,L,fold)=>{const pr=[];const n=14;for(let i=0;i<=n;i++){const u=i/n;let r=lerp(r0,r1,u);r*=1+fold*.06*Math.sin(u*Math.PI*5.3+side.length)*Math.sin(u*Math.PI);pr.push([r,u*L])}return pr};
  const up=new T.Mesh(new T.LatheGeometry(sleeveProf(.056,.05,.3,1).map(q=>new T.Vector2(q[0],q[1])),22),M.sleeve);meterUV(up.geometry,'box');
  const fp=sleeveProf(.05,.041,.255,1.4);fp.push([.043,.258],[.043,.27],[.036,.272]);
  const fg=new T.LatheGeometry(fp.map(q=>new T.Vector2(q[0],q[1])),24);meterUV(fg,'box');
  /* wrinkles: radial displacement noise around the forearm */
  {const p=fg.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x);const k=1+.05*Math.sin(a*3+y*40)*Math.sin(y*18)*sstep((.25-y)*8);p.setXYZ(i,x*k,y,z*k)}fg.computeVertexNormals()}
  const fore=new T.Mesh(fg,M.sleeve);fore.scale.z=.85;
  /* glove cuff (or bare wrist) rides on the end of the forearm, following its direction */
  const cuffProf=[[.001,-.07],[.029,-.07],[.0315,-.065],[.0315,-.02],[.029,-.008],[.027,.004],[.025,.012],[.001,.014]];
  const cg=new T.LatheGeometry(cuffProf.map(q=>new T.Vector2(q[0],q[1])),24);cg.scale(1,1,.8);meterUV(cg,'box');const cuff=new T.Mesh(cg,M.glove?M.hand:M.cuff);
  const cuffG=group('cuff');cuffG.add(cuff);
  if(M.glove){const tab=rbox(.028,.03,.006,.003,M.hand);tab.position.set(0,-.035,.027);cuffG.add(tab);
    const strap=new T.Mesh(new T.CylinderGeometry(.0342,.0342,.013,24,1,true),M.cuff);strap.scale.z=.8;strap.position.y=-.035;cuffG.add(strap)}
  else{const sk=capsule(.03,.028,.09,M.skin);sk.position.y=-.07;sk.scale.z=.8;cuffG.add(sk);cuff.visible=false}
  const elbow=new T.Mesh(new T.SphereGeometry(.051,18,12),M.sleeve);
  [up,fore,elbow,cuff].forEach(m=>{m.castShadow=true;m.receiveShadow=true});
  const upG=group('upper');upG.add(up);const foreG=group('fore');foreG.add(fore);g.add(upG,foreG,elbow,cuffG);
  g.userData={upG,foreG,elbow,cuffG,a:.3,b:.265,side};return g}
const _v1=new T.Vector3(),_v2=new T.Vector3(),_v3=new T.Vector3(),_q=new T.Quaternion(),_Y=new T.Vector3(0,1,0);
function solveArm(arm,S,W,pole,handQ){const u=arm.userData;const d=_v1.subVectors(W,S);let L=d.length();const a=u.a,b=u.b;
  const Lc=clamp(L,Math.abs(a-b)+.01,a+b-.002);d.normalize();const x=(a*a-b*b+Lc*Lc)/(2*Lc),h=Math.sqrt(Math.max(0,a*a-x*x));
  const pn=_v2.copy(pole).addScaledVector(d,-pole.dot(d)).normalize();const E=_v3.copy(S).addScaledVector(d,x).addScaledVector(pn,h);
  /* if the wrist is out of reach, slide the shoulder so the forearm still meets the glove */
  const sh=L>a+b-.002?d.clone().multiplyScalar(L-(a+b-.002)):null;if(sh)E.add(sh);const S2=sh?S.clone().add(sh):S;
  u.upG.position.copy(S2);u.upG.quaternion.setFromUnitVectors(_Y,E.clone().sub(S2).normalize());u.upG.scale.y=E.distanceTo(S2)/a;
  u.foreG.position.copy(E);const fd=W.clone().sub(E);u.foreG.quaternion.setFromUnitVectors(_Y,fd.clone().normalize());
  /* roll the forearm so its flattened side follows the hand */
  if(handQ){const hz=new T.Vector3(0,0,1).applyQuaternion(handQ);const cur=new T.Vector3(0,0,1).applyQuaternion(u.foreG.quaternion);const ax=fd.clone().normalize();
    const pz=hz.addScaledVector(ax,-hz.dot(ax)).normalize(),pc=cur.addScaledVector(ax,-cur.dot(ax)).normalize();let ang=Math.acos(clamp(pc.dot(pz),-1,1));if(new T.Vector3().crossVectors(pc,pz).dot(ax)<0)ang=-ang;
    u.foreG.quaternion.premultiply(_q.setFromAxisAngle(ax,ang))}
  u.foreG.scale.y=Math.max(.2,(fd.length()-.055)/u.b);u.elbow.position.copy(E);u.cuffG.position.copy(W);u.cuffG.quaternion.copy(u.foreG.quaternion)}

/* ------------------------------------------------------------------ real arms from a Rocketbox character
   The character GLB is cloned, cut down to the triangles skinned to arm/hand bones, and its Bip01 arm chain is
   driven every frame: two-bone IK for UpperArm/Forearm, the hand bone takes the grip frame, finger bones curl. */
const CHARS={};let CHAR_BASE='assets/people/rocketbox/';
function loadCharacter(key){if(CHARS[key])return Promise.resolve(CHARS[key]);const L=T.GLTFLoader?new T.GLTFLoader():null;if(!L)return Promise.resolve(null);
  const pre=HT.Guns.assets&&HT.Guns.assets.gltf&&HT.Guns.assets.gltf(key);if(pre&&pre.scene){CHARS[key]=pre.scene;return Promise.resolve(pre.scene)}
  return new Promise(res=>L.load(CHAR_BASE+key+'.glb',g=>{CHARS[key]=g.scene;res(g.scene)},undefined,()=>{console.warn('HT.Guns: character',key,'not found, using procedural arms');res(null)}))}
const ARM_RE=/_(UpperArm|Forearm|Hand|Finger\d+)$/;
function buildRealArms(src){if(!src||!T.SkeletonUtils)return null;const root=T.SkeletonUtils.clone(src);root.name='fpArms';
  root.updateMatrixWorld(true);const bone=n=>root.getObjectByName(n);
  let ok=false;root.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;o.castShadow=false;o.receiveShadow=true;
    if(!o.isSkinnedMesh||/^acc_/.test(o.name)){o.visible=false;return}
    const sk=o.skeleton,armIdx=new Set(sk.bones.map((b,i)=>ARM_RE.test(b.name)?i:-1).filter(i=>i>=0));
    const g=o.geometry.clone(),si=g.attributes.skinIndex,sw=g.attributes.skinWeight,idx=g.index?g.index.array:null;if(!idx){o.visible=false;return}
    const w=new Float32Array(si.count);for(let v=0;v<si.count;v++){let s=0;const I=[si.getX(v),si.getY(v),si.getZ(v),si.getW(v)],Wt=[sw.getX(v),sw.getY(v),sw.getZ(v),sw.getW(v)];for(let k=0;k<4;k++){if(armIdx.has(I[k]))s+=Wt[k]}w[v]=s}
    const keep=[];for(let t=0;t<idx.length;t+=3){const a=idx[t],b=idx[t+1],c=idx[t+2];if(Math.min(w[a],w[b],w[c])>.92)keep.push(a,b,c)}
    if(!keep.length){o.visible=false;return}g.setIndex(keep);o.geometry=g;ok=true;
    const ms=Array.isArray(o.material)?o.material:[o.material];o.material=ms.map(m=>{const c=m.clone();c.envMapIntensity=.8;return c}).reduce((a,c)=>a.concat(c),[]);if(o.material.length===1)o.material=o.material[0]});
  if(!ok)return null;
  const side=s=>{const p='Bip01_'+s+'_';const ua=bone(p+'UpperArm'),fa=bone(p+'Forearm'),hd=bone(p+'Hand');if(!ua||!fa||!hd)return null;
    const P=o=>o.getWorldPosition(new T.Vector3()),Q=o=>o.getWorldQuaternion(new T.Quaternion());
    const S=P(ua),E=P(fa),W=P(hd);const n=new T.Vector3().crossVectors(E.clone().sub(S),W.clone().sub(E)).normalize();
    const zua=new T.Vector3(0,0,1).applyQuaternion(Q(ua));const zs=Math.sign(zua.dot(n))||-1;
    const hy=new T.Vector3(0,1,0).applyQuaternion(Q(hd));/* palm normal */
    const fingers=[];for(let f=0;f<5;f++){const ch=[];for(let k=0;k<3;k++){const b=bone(p+'Finger'+f+(k?k:''));if(!b)continue;
        const bq=Q(b),x=new T.Vector3(1,0,0).applyQuaternion(bq);let ax=new T.Vector3().crossVectors(x,hy);
        if(f===0){/* thumb curls across the palm toward the little finger */const toward=P(bone(p+'Finger4')||hd).sub(P(b)).normalize();ax=new T.Vector3().crossVectors(x,toward.add(hy.clone().multiplyScalar(.6)))}
        ax.normalize().applyQuaternion(bq.clone().invert());ch.push({b,rest:b.quaternion.clone(),ax})}fingers.push(ch)}
    return{ua,fa,hd,a:S.distanceTo(E),b:E.distanceTo(W),zs,fingers}};
  const R=side('R'),L=side('L');if(!R||!L)return null;
  return{root,R,L}}
const _m1=new T.Matrix4(),_m2=new T.Matrix4(),_q1=new T.Quaternion(),_q2=new T.Quaternion(),_s1=new T.Vector3(1,1,1);
function setBoneWorld(b,pos,quat){b.parent.updateMatrixWorld(true);_m1.compose(pos,quat,_s1);_m2.copy(b.parent.matrixWorld).invert().multiply(_m1);_m2.decompose(b.position,b.quaternion,_v1);b.scale.set(1,1,1);b.updateMatrixWorld(true)}
function frameQ(X,Y){const x=X.clone().normalize(),z=new T.Vector3().crossVectors(x,Y).normalize(),y=new T.Vector3().crossVectors(z,x);return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z))}
/* S, W in world space; hand frame given as fingers direction and palm normal (world); pose = POSE entry */
function solveRealArm(A,S,W,pole,fingersDir,palmN,pose,twist){const d=W.clone().sub(S);const L=d.length(),a=A.a,b=A.b;const Lc=clamp(L,Math.abs(a-b)+.01,a+b-.002);d.normalize();
  const x=(a*a-b*b+Lc*Lc)/(2*Lc),h=Math.sqrt(Math.max(0,a*a-x*x));const pn=pole.clone().addScaledVector(d,-pole.dot(d)).normalize();
  let S2=S;if(L>a+b-.002)S2=S.clone().addScaledVector(d,L-(a+b-.002));const E=S2.clone().addScaledVector(d,x).addScaledVector(pn,h);
  const n=new T.Vector3().crossVectors(E.clone().sub(S2),W.clone().sub(E)).normalize();const Z=n.multiplyScalar(A.zs);
  const xu=E.clone().sub(S2).normalize(),xf=W.clone().sub(E).normalize();
  const qu=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(xu,new T.Vector3().crossVectors(Z,xu).normalize(),Z.clone().sub(xu.clone().multiplyScalar(Z.dot(xu))).normalize()));
  let zf=Z.clone().sub(xf.clone().multiplyScalar(Z.dot(xf))).normalize();
  /* forearm takes part of the wrist roll so the skin does not candy-wrap */
  const qh=frameQ(fingersDir,palmN);const hz=new T.Vector3(0,0,1).applyQuaternion(qh);const hzp=hz.sub(xf.clone().multiplyScalar(hz.dot(xf))).normalize();
  let ang=Math.acos(clamp(zf.dot(hzp),-1,1));if(new T.Vector3().crossVectors(zf,hzp).dot(xf)<0)ang=-ang;zf.applyAxisAngle(xf,ang*(twist==null?.55:twist));
  const qf=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(xf,new T.Vector3().crossVectors(zf,xf),zf));
  setBoneWorld(A.ua,S2,qu);setBoneWorld(A.fa,E,qf);setBoneWorld(A.hd,W,qh);
  if(pose){for(let f=0;f<5;f++){const ch=A.fingers[f];const vals=f===0?[pose.th[2]*.9-.15,pose.th[3]+.25,pose.th[4]+.2]:pose.f[f-1].map((v,k)=>v-(k?.08:.12));
    ch.forEach((c,k)=>{c.b.quaternion.copy(c.rest).multiply(_q1.setFromAxisAngle(c.ax,vals[k]||0))})}}
  return E}

/* ------------------------------------------------------------------ viewmodel configuration per gun
   hand poses are in the gun's build space: p = wrist [s,y,x], Y = finger direction, Z = back-of-hand direction (both [s,y,x]) */
const sv=(a)=>a?V(a[2]||0,a[1],-a[0]):null;
/* grip helpers (build space): A = where the web of the hand sits on the grip axis, ang = grip slant from vertical (back),
   dep = grip depth fore-aft, hw = half width. Returns a right-hand pose with the index knuckle at the front-right edge. */
function gripPose(A,ang,dep,hw,o={}){const Y=[Math.cos(ang),-Math.sin(ang),0],X=[-Math.sin(ang),-Math.cos(ang)];
  const ki=[A[0]+X[0]*(o.down||.01)+Y[0]*dep*.5,A[1]+X[1]*(o.down||.01)+Y[1]*dep*.5];
  const w=[ki[0]-Y[0]*.091+X[0]*.0285,ki[1]-Y[1]*.091+X[1]*.0285,hw+(o.out||.016)];
  return{p:w,Y:[Y[0],Y[1],o.yx||-.05],Z:[0,o.zy||.1,1],pose:o.pose||'trigger'}}
/* left hand cupping a round forend from below: c = forend centre, rad = radius, beta = roll of the palm toward the left */
function supportPose(c,rad,beta=.35,o={}){const n=[Math.cos(beta),Math.sin(beta)];/* palm normal (y,x): up and right */
  const pc=[c[0],c[1]-n[0]*(rad+.016),-n[1]*(rad+.016)];const Y=[o.fwd||.18,-Math.sin(beta),Math.cos(beta)];const l=Math.hypot(...Y);
  const w=[pc[0]-Y[0]/l*.05,pc[1]-Y[1]/l*.05,pc[2]-Y[2]/l*.05+(o.dx||0)];
  return{p:w,Y,Z:[0,-Math.cos(beta),-Math.sin(beta)],pose:o.pose||'wrap',parent:o.parent}}
/* left hand wrapped over the right hand on a pistol grip */
function pistolSupport(R,o={}){return{p:[R.p[0]+(o.ds||.012),R.p[1]-(o.dy||.022),-(R.p[2]+.004)],Y:[R.Y[0],R.Y[1]-.12,.18],Z:[.0,-.15,-1],pose:'support'}}
const ARMS={sh:{R:[.23,-.27,.12],L:[-.2,-.3,.12]},pole:{R:[1,-.5,.25],L:[-.45,-.85,.35]}};
const ARMSP={sh:{R:[.2,-.32,.2],L:[-.2,-.34,.2]},pole:{R:[.6,-.8,.1],L:[-.6,-.8,.1]}};
function cfg(c){return Object.assign({},c.shoulder?ARMS:ARMSP,c)}
const VMC={};
{const R=gripPose([-.004,.03],.16,.05,.015,{pose:'gripPistol'});
 VMC.pistol=cfg({hip:[.1,-.13,-.33],hipR:[.02,.06,-.02],ads:.44,adsFov:.85,kick:[.04,.10,.02,.005,140,16],cycle:'slide',reload:'mag',shoulder:false,R,L:pistolSupport(R)})}
{const R=gripPose([-.026,.012],.36,.041,.0185,{pose:'gripPistol'});
 VMC.revolver=cfg({hip:[.1,-.13,-.33],hipR:[.02,.06,-.02],ads:.44,adsFov:.8,kick:[.07,.28,.05,.01,90,11],cycle:'hammer',reload:'cylinder',shoulder:false,R,L:pistolSupport(R)})}
{const R=gripPose([.0,.012],.12,.042,.0175,{pose:'grip'});
 VMC.nailer=cfg({hip:[.15,-.2,-.42],hipR:[.05,.1,-.04],ads:.42,adsFov:.95,kick:[.015,.02,.03,.02,220,22],cycle:'none',reload:'mag',shoulder:false,R,
   L:{p:[.0,.13,-.04],Y:[.92,.0,.38],Z:[0,1,0],pose:'cup'}})}
{const R=gripPose([-.055,.008],.62,.05,.017);
 VMC.shotgun=cfg({hip:[.14,-.16,-.3],hipR:[.04,.07,-.04],ads:.32,adsFov:.9,kick:[.09,.16,.03,.01,80,10],cycle:'pump',reload:'shell',shoulder:true,R,L:supportPose([.3,.009],.022,.35,{parent:'pump'})});
 VMC.beanbag=Object.assign({},VMC.shotgun,{kick:[.07,.12,.02,.01,90,12],adsFov:.88});
 VMC.double=cfg({hip:[.14,-.16,-.3],hipR:[.04,.07,-.04],ads:.32,adsFov:.92,kick:[.12,.22,.06,.015,70,9],cycle:'none',reload:'break',shoulder:true,R,L:supportPose([.17,.012],.024,.35,{parent:'barrels'})})}
{const R=gripPose([-.045,.016],.55,.044,.017);
 VMC.sawedoff=cfg({hip:[.12,-.14,-.3],hipR:[.0,.05,-.03],ads:.42,adsFov:.92,kick:[.12,.22,.06,.015,70,9],cycle:'none',reload:'break',shoulder:false,R,L:supportPose([.13,.012],.024,.35,{parent:'barrels'})})}
{const R=gripPose([-.068,-.046],.5,.036,.015);
 VMC.rifle=cfg({hip:[.13,-.15,-.27],hipR:[.0,.05,-.03],ads:.3,adsFov:.7,kick:[.025,.035,.01,.006,160,18],cycle:'dust',reload:'mag',shoulder:true,R,L:supportPose([.18,.02],.03,.35)})}
{const R=gripPose([-.03,.0],.3,.038,.016);
 VMC.smg=cfg({hip:[.13,-.15,-.29],hipR:[.02,.06,-.03],ads:.3,adsFov:.85,kick:[.018,.02,.015,.012,200,20],cycle:'bolt',reload:'mag',shoulder:true,R,L:supportPose([.25,.032],.028,.35)})}
{const R=gripPose([-.345,-.004],.62,.045,.017);
 VMC.hunter=cfg({hip:[.14,-.15,-.3],hipR:[.03,.06,-.03],ads:.075,adsFov:.3,kick:[.10,.20,.02,0,60,8],cycle:'boltAction',reload:'stripper',shoulder:true,scoped:true,R,L:supportPose([.0,.022],.024,.35)})}

/* keyframe helper: keys [[t,v],...] with v number or array, smoothstep between keys */
function kf(t,keys){if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const a=keys[i-1],b=keys[i];const u=sstep((t-a[0])/((b[0]-a[0])||1));
  return Array.isArray(a[1])?a[1].map((v,k)=>lerp(v,b[1][k],u)):lerp(a[1],b[1],u)}return keys[keys.length-1][1]}

/* ------------------------------------------------------------------ viewmodel() */
function viewmodel(type,opts={}){type=ALIAS[type]||type;const C=VMC[type]||VMC.pistol;
  const gun=model(type,opts);const D=gun.userData.def;const P=gun.userData.parts;
  const G=(a)=>a?V(a[2]||0,a[1]-D.grip[1],-(a[0]-D.grip[0])):null;/* build space [s,y,x] -> gun space */
  const Dir=(a)=>V(a[2]||0,a[1],-a[0]).normalize();
  const M=handMats(opts);
  const rig=group('viewmodel_'+type);const sway=group('sway');const hold=group('hold');const kick=group('kick');const anim=group('anim');
  rig.add(sway);sway.add(hold);hold.add(kick);kick.add(anim);anim.add(gun);
  const hR=buildHand(M,'R'),hL=buildHand(M,'L');gun.add(hR,hL);
  const aR=buildArm(M,'R'),aL=buildArm(M,'L');rig.add(aR,aL);
  /* real arms from the played character, unless gloves or procedural arms were asked for */
  const charKey=opts.character||'dad_player';const RA=(opts.arms!=='procedural'&&!opts.gloves)?buildRealArms(CHARS[charKey]):null;
  if(RA){rig.add(RA.root);RA.root.position.set(0,-1.75,.25);/* unposed body far below the view */aR.visible=aL.visible=false;for(const h of[hR,hL])h.children[0].visible=false}
  /* parts with rest transforms */
  const partOf=n=>n==='pump'?P.pump:n==='barrels'?P.barrels:null;
  const rest=new Map();for(const k in P){const o=P[k];if(o&&o.isObject3D)rest.set(o,{p:o.position.clone(),r:o.rotation.clone(),s:o.scale.clone()})}
  const restOf=o=>rest.get(o);
  /* hand pose -> gun-space transform */
  const tmpM=new T.Matrix4(),tmpQ=new T.Quaternion();
  function poseXf(h){if(h.xf)return h.xf;const Y=Dir(h.Y),Z0=Dir(h.Z);const X=new T.Vector3().crossVectors(Y,Z0).normalize();const Z=new T.Vector3().crossVectors(X,Y).normalize();
    const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(X,Y,Z));h.xf={p:G(h.p),q,pose:POSE[h.pose]||POSE.relaxed};return h.xf}
  function poseInGun(h,out){const x=poseXf(h);out.p.copy(x.p);out.q.copy(x.q);out.pose=x.pose;
    const par=h.parent&&partOf(h.parent);if(par){/* express relative to the part's rest, then apply its current transform */
      gun.updateMatrixWorld(true);const r=restOf(par);const cur=new T.Matrix4().copy(par.matrixWorld);const rm=new T.Matrix4().compose(r.p,new T.Quaternion().setFromEuler(r.r),r.s);
      const parentW=par.parent.matrixWorld;const restW=new T.Matrix4().multiplyMatrices(parentW,rm);const delta=new T.Matrix4().multiplyMatrices(cur,restW.clone().invert());
      const gunInv=new T.Matrix4().copy(gun.matrixWorld).invert();const dG=new T.Matrix4().multiplyMatrices(gunInv,delta).multiply(gun.matrixWorld);
      const m=new T.Matrix4().compose(out.p,out.q,V(1,1,1)).premultiply(dG);m.decompose(out.p,out.q,_v3)}
    return out}
  const mk=()=>({p:new T.Vector3(),q:new T.Quaternion(),pose:POSE.relaxed});
  const cur={R:mk(),L:mk()},tA=mk(),tB=mk();
  /* named extra poses (defined relative to the main ones) */
  const EX={};
  const addEx=(name,base,dp,dY,dZ,pose,parent)=>{const b=C[base];EX[name]={p:b.p.map((v,i)=>v+(dp[i]||0)),Y:dY||b.Y,Z:dZ||b.Z,pose:pose||b.pose,parent:parent!==undefined?parent:b.parent}};
  /* sight alignment: put the gun so its sight point sits on the view axis at distance C.ads */
  /* the stock sits under and behind the eye when aiming: it is hidden at full ADS so it never fills the frame */
  const stockNodes=[];if(type==='rifle'||type==='smg')gun.traverse(o=>{if(/^stock$/i.test(o.name))stockNodes.push(o)});
  let Lsup0=C.L;if(D.foregrip){const f=D.foregrip;Lsup0={p:[f[0]-.072,f[1]+.05,-.032],Y:[.96,-.22,.08],Z:[0,.08,-1],pose:'grip'}}
  const sp=gun.userData.sightPoint.clone();
  const hipPos=V(...C.hip),hipRot=new T.Euler(...C.hipR);
  const adsPos=V(-sp.x,-sp.y,-C.ads-sp.z);/* sight at (0,0,-ads) */
  /* scope: eye a bit further back on the ocular */
  rig.userData={type,muzzle:gun.userData.muzzle,eject:gun.userData.eject,adsFov:C.adsFov,hipPos:hipPos.clone(),adsPos:adsPos.clone(),scoped:!!C.scoped,gun,hands:{R:hR,L:hL},arms:{R:aR,L:aL}};
  rig.adsT=0;
  /* springs */
  const sp6=()=>({x:0,v:0});const K={z:sp6(),rx:sp6(),rz:sp6(),x:sp6(),ry:sp6()};const SW={x:sp6(),y:sp6(),rx:sp6(),ry:sp6()};
  let time=0,bob=0,sprintT=0,equipT=1,crouchT=0,act=null,chain=0,lastShot=-9,flashT=0;const shells=[];
  rig.onEject=null;rig.onEvent=null;
  const emit=(name,data)=>{if(rig.onEvent)rig.onEvent(name,data)};
  /* muzzle flash (view-model only) */
  const flash=new T.Sprite(new T.SpriteMaterial({map:flashTex(),color:new T.Color(3.2,2.4,1.5),blending:T.AdditiveBlending,depthWrite:false,transparent:true,toneMapped:false}));
  flash.visible=false;flash.scale.set(.12,.12,.12);gun.userData.muzzle.add(flash);flash.position.z=-.03;
  const flashLight=new T.PointLight(0xffb060,0,1.2,2);gun.userData.muzzle.add(flashLight);
  /* ejected brass */
  function ejectShell(kind,vel){const e=gun.userData.eject;gun.updateMatrixWorld(true);const wp=e.getWorldPosition(new T.Vector3());
    const dir=V(1,.45,.25).applyQuaternion(gun.getWorldQuaternion(new T.Quaternion()));
    if(rig.onEject)rig.onEject({kind:kind||D.ammo,position:wp,direction:dir.clone(),velocity:dir.clone().multiplyScalar(vel||1.6)});
    if(opts.shells===false)return;const m=emptyCase(kind||D.ammo);rig.add(m);const lp=rig.worldToLocal(wp.clone());m.position.copy(lp);
    const ld=dir.clone().applyQuaternion(rig.getWorldQuaternion(new T.Quaternion()).invert());
    shells.push({m,v:ld.multiplyScalar(vel||1.6).add(V(rand(-.2,.2),rand(0,.4),rand(-.2,.2))),w:V(rand(-20,20),rand(-20,20),rand(-20,20)),t:0});
    m.rotation.set(0,Math.PI/2,0)}
  /* ---- actions: each returns per-frame overrides */
  function play(name,dur,fn,o={}){act={name,t:0,dur,fn,ev:o.ev||[],fired:new Set(),done:o.done,cancel:false};emit(name+'Start',{dur})}
  function evs(a){for(let i=0;i<a.ev.length;i++){const e=a.ev[i];if(!a.fired.has(i)&&a.t>=e[0]){a.fired.add(i);e[1]()}}}
  /* reload & cycle builders per style */
  const magN=P.mag,slideN=P.slide,boltN=P.bolt,pumpN=P.pump,cylN=P.cylinder,craneN=P.crane,barN=P.barrels,hamN=P.hammer,dustN=P.dust,trigN=P.trigger;
  /* extra poses */
  if(C.reload==='mag'){const mp=magN?gunPosOf(magN):null;/* left hand grabs the magazine */}
  function gunPosOf(o){gun.updateMatrixWorld(true);return gun.worldToLocal(o.getWorldPosition(new T.Vector3()))}
  const Lsup=Lsup0,Rgrip=C.R;
  /* low poses: hand dropped out of view */
  const low=(h,d)=>Object.assign({},h,{p:[h.p[0]-.1,h.p[1]-.28,(h.p[2]||0)-.05],pose:'pinch',parent:null,xf:null});
  /* magazine pose: left hand under the mag well, palm up */
  const magBase=(()=>{if(!magN)return[0,-.1,0];gun.updateMatrixWorld(true);const bb=new T.Box3().setFromObject(magN);const c=bb.getCenter(new T.Vector3());const lp=gun.worldToLocal(c.clone());
    return[-lp.z+D.grip[0],bb.min.y-gun.getWorldPosition(new T.Vector3()).y+D.grip[1],lp.x]})();
  const Lmag={p:[magBase[0]-.01,magBase[1]-.06,magBase[2]-.03],Y:[.05,.85,.5],Z:[-.1,-.4,-.9],pose:'pinch'};
  const Lslide={p:[-.02,.03,-.06],Y:[.0,.35,.95],Z:[.05,.9,-.35],pose:'pinch'};/* overhand on the slide / charging */
  const Lport={p:[D.loadPort?D.loadPort[0]-.03:0,(D.loadPort?D.loadPort[1]:0)-.07,-.02],Y:[.5,.85,.1],Z:[-.2,.1,-.97],pose:'pinch'};
  const Rbolt={p:[-.36,-.02,.09],Y:[.6,.3,-.7],Z:[0,.95,.3],pose:'pinch'};
  const Lcyl={p:[.0,.0,-.06],Y:[.1,.4,.9],Z:[.1,-.9,.4],pose:'cup'};
  const Lbreak=Object.assign({},C.L);
  const shellProp=cartridge(D.ammo==='nail'?'9mm':D.ammo);shellProp.visible=false;hL.add(shellProp);shellProp.position.set(.0,.09,-.02);shellProp.rotation.set(Math.PI/2,0,0);
  let magFall=null;
  /* --- cycle after a shot */
  function cycle(){const c=C.cycle;
    if(c==='slide'&&slideN){play('cycle',.09,(t)=>({slide:kf(t,[[0,0],[.35,1],[1,0]])}),{ev:[[.3,()=>ejectShell()]]})}
    else if(c==='bolt'){ejectShell();play('cycle',.06,(t)=>({bolt:kf(t,[[0,0],[.4,1],[1,0]])}))}
    else if(c==='dust'){if(dustN&&!rig.dustOpen){rig.dustOpen=true;dustN.rotation.z=(restOf(dustN).r.z)-1.2}ejectShell()}
    else if(c==='hammer'){/* nothing ejects */}
    else if(c==='pump'){play('pump',.55,(t)=>({pump:kf(t,[[0,0],[.3,0],[.55,1],[.8,0]]),anim:{p:[0,kf(t,[[0,0],[.45,-.01],[.8,0]]),0],r:[kf(t,[[0,0],[.5,.03],[.9,0]]),0,kf(t,[[0,0],[.5,.12],[.9,0]])]}}),{ev:[[.5,()=>{ejectShell(null,1.2);emit('pumpBack')}],[.78,()=>emit('pumpForward')]]})}
    else if(c==='boltAction'){play('bolt',.85,(t)=>{const up=kf(t,[[0,0],[.2,0],[.35,1],[.75,1],[.88,0]]),back=kf(t,[[0,0],[.35,0],[.5,1],[.62,1],[.75,0]]);
        const hk=kf(t,[[0,0],[.18,1],[.88,1],[1,0]]);return{boltUp:up,boltBack:back,R:{to:Rbolt,w:hk,follow:'bolt'},anim:{p:[.01*hk,-.012*hk,0],r:[.04*hk,-.05*hk,.18*hk]}}},
      {ev:[[.5,()=>{ejectShell('308',1.4);emit('boltBack')}],[.75,()=>emit('boltForward')]]})}}
  /* --- reload */
  function reload(dur,empty,o={}){if(act&&(act.name==='reload'||act.name==='equip'))return;dur=dur||2;const st=C.reload;emit('reload',{dur,empty});
    if(st==='mag'){const pist=!C.shoulder;
      play('reload',dur,(t)=>{const tilt=kf(t,[[0,0],[.12,1],[.8,1],[.95,0]]);
        const magOut=kf(t,[[0,0],[.18,0],[.3,1],[1,1]]),magIn=kf(t,[[0,0],[.55,0],[.72,1],[1,1]]);
        const Lk=t<.15?{to:Lmag,w:kf(t,[[0,0],[.15,1]])}:t<.5?{to:low(Lmag),w:1,from:Lmag,mix:kf(t,[[.2,0],[.38,1],[.5,1]])}:t<.75?{to:Lmag,w:1,from:low(Lmag),mix:kf(t,[[.5,0],[.7,1]])}:empty&&t<.92?{to:pist?Lslide:Lslide,w:1,from:Lmag,mix:kf(t,[[.75,0],[.84,1]])}:{to:empty?Lslide:Lmag,w:kf(t,[[.8,1],[1,0]])};
        return{anim:{p:[pist?-.02*tilt:-.05*tilt,pist?.02*tilt:.05*tilt,pist?.04*tilt:.04*tilt],r:[pist?.25*tilt:.2*tilt,pist?.25*tilt:.32*tilt,pist?.35*tilt:-.6*tilt]},
          mag:{out:magOut,in:magIn,t},slide:empty&&t>.84?kf(t,[[.84,1],[.9,1],[.93,0]]):empty&&t<.84?1:0,bolt:empty?kf(t,[[.82,0],[.88,1],[.92,0]]):0,L:Lk}},
        {ev:[[.25,()=>{emit('magOut');dropMag()}],[.68,()=>emit('magIn')],[.9,()=>{if(empty)emit('slideRelease');rig.dustOpen=false;if(dustN)dustN.rotation.copy(restOf(dustN).r)}]]})}
    else if(st==='shell'){const each=o.each||.5,start=o.start||.35,end=o.end||.25;let n=o.shells!=null?o.shells:Math.max(1,Math.round((dur-start-end-(empty?.45:0))/each));
      const total=start+n*each+end+(empty?.45:0);
      play('reload',total,(t)=>{const T_=t*total;const into=clamp(T_/start,0,1),outk=clamp((total-T_)/end,0,1);const tilt=Math.min(sstep(into),sstep(outk));
        const k=(T_-start)/each,ki=Math.floor(k),f=k-ki;const loading=T_>start&&ki<n;
        const Lk=loading?{to:f<.45?low(Lport):Lport,from:f<.45?Lport:low(Lport),w:1,mix:f<.45?sstep(f/.45):sstep((f-.45)/.4)}:{to:Lport,w:tilt};
        shellProp.visible=loading&&f>.2&&f<.85;
        const rack=empty?clamp((T_-(start+n*each))/.45,0,1):0;
        return{anim:{p:[-.01*tilt,.04*tilt,.03*tilt],r:[.08*tilt,.05*tilt,-.85*tilt]},L:rack>0&&rack<1?{to:C.L,w:1}:Lk,pump:rack>0?kf(rack,[[0,0],[.4,1],[.8,0]]):0}},
        {ev:Array.from({length:n},(_,i)=>[(start+i*each+each*.8)/total,()=>emit('shellIn',{i})]).concat(empty?[[(start+n*each+.2)/total,()=>emit('pumpBack')]]:[]),done:()=>{shellProp.visible=false}})}
    else if(st==='cylinder'){play('reload',dur,(t)=>{const out=kf(t,[[0,0],[.15,0],[.25,1],[.8,1],[.9,0]]);const up=kf(t,[[0,0],[.2,0],[.3,1],[.45,1],[.55,0],[.8,0]]);
        const hold=kf(t,[[0,0],[.12,1],[.9,1],[1,0]]);
        return{crane:out,eject:kf(t,[[.3,0],[.36,1],[.42,0]]),rounds:t>.36&&t<.6?0:1,anim:{p:[-.02*hold,.03*hold+.03*up,.05*hold],r:[.3*hold+.9*up,.2*hold,.5*hold]},
          L:t<.6?{to:Lcyl,w:hold}:{to:t<.7?low(Lcyl):Lcyl,from:t<.7?Lcyl:low(Lcyl),w:hold,mix:t<.7?kf(t,[[.6,0],[.66,1]]):kf(t,[[.66,0],[.76,1]])}}},
      {ev:[[.36,()=>{for(let i=0;i<6;i++)ejectShell('357',.6);emit('ejectEmpties')}],[.76,()=>emit('speedloader')],[.88,()=>emit('cylinderClose')]]})}
    else if(st==='break'){play('reload',dur,(t)=>{const open=kf(t,[[0,0],[.1,0],[.2,1],[.84,1],[.92,0]]);const hold=kf(t,[[0,0],[.1,1],[.9,1],[1,0]]);
        const Lk=t<.3?{to:C.L,w:1}:t<.5?{to:low(Lbreech),from:C.L,w:1,mix:kf(t,[[.3,0],[.45,1]])}:t<.78?{to:Lbreech,from:low(Lbreech),w:1,mix:kf(t,[[.5,0],[.64,1]])}:{to:C.L,from:Lbreech,w:1,mix:kf(t,[[.78,0],[.86,1]])};
        shellProp.visible=t>.5&&t<.68;
        return{barrels:open,anim:{p:[-.06*hold,.08*hold,.02*hold],r:[.12*hold,.65*hold,.35*hold]},L:Lk,shellsIn:t>.68||t<.22}},
        {ev:[[.22,()=>{ejectShell('12ga',.7);ejectShell('12ga',.8);emit('breakOpen')}],[.68,()=>emit('shellsIn')],[.9,()=>emit('breakClose')]]})}
    else if(st==='stripper'){play('reload',dur,(t)=>{const hold=kf(t,[[0,0],[.12,1],[.88,1],[1,0]]);const up=kf(t,[[0,0],[.12,0],[.2,1],[.8,1],[.88,0]]),back=kf(t,[[0,0],[.2,0],[.28,1],[.72,1],[.8,0]]);
        const Lk=t<.3?{to:C.L,w:1}:t<.7?{to:t<.42?low(Lport):LtopLoad,from:t<.42?C.L:low(Lport),w:1,mix:t<.42?kf(t,[[.3,0],[.42,1]]):kf(t,[[.42,0],[.52,1]])}:{to:C.L,from:LtopLoad,w:1,mix:kf(t,[[.7,0],[.85,1]])};
        return{boltUp:up,boltBack:back,R:{to:Rbolt,w:kf(t,[[0,0],[.12,1],[.85,1],[.95,0]]),follow:'bolt'},L:Lk,anim:{p:[.0,.02*hold,.03*hold],r:[.12*hold,-.08*hold,.35*hold]}}},
      {ev:[[.28,()=>emit('boltBack')],[.6,()=>emit('roundsIn')],[.8,()=>emit('boltForward')]]})}}
  const Lbreech={p:[.0,.06,-.08],Y:[.35,-.15,.92],Z:[0,1,.1],pose:'pinch'};
  const LtopLoad={p:[-.24,.06,-.05],Y:[.0,-.35,.95],Z:[.1,.9,.35],pose:'pinch'};
  function dropMag(){if(!magN)return;const m=magN.clone(true);rig.updateMatrixWorld(true);m.visible=true;
    const rel=new T.Matrix4().copy(rig.matrixWorld).invert().multiply(magN.matrixWorld);rig.add(m);rel.decompose(m.position,m.quaternion,m.scale);shells.push({m,v:V(0,-.5,0),w:V(rand(-2,2),0,rand(-2,2)),t:0,mag:true})}
  /* ---- public API */
  rig.fire=function(){if(act&&act.name==='equip'&&act.t<.7)return false;if(act&&(act.name==='reload'||act.name==='bolt'||act.name==='pump'))return false;
    const kv=C.kick;const ads=rig.adsT,aMul=lerp(1,.6,ads);
    /* SPEC vm values are impulses; IMP scales them so the peak kick lands around a few degrees / centimetres */
    const IMP=18;K.z.v+=kv[0]*IMP*aMul;K.rx.v+=kv[1]*IMP*aMul;K.rz.v+=rand(-1,1)*kv[2]*IMP;K.x.v+=rand(-1,1)*kv[3]*IMP;K.ry.v+=rand(-1,1)*kv[3]*IMP*.7;
    flashT=.05;flash.material.rotation=Math.random()*6.28;const fs=(D.kind==='pump'||D.kind==='break'?.22:D.kind==='pistol'||D.kind==='revolver'?.12:.15)*(gun.userData.attachments.suppressor?.35:1);flash.scale.set(fs,fs,fs);
    if(hamN){hamN.rotation.z=0}
    if(trigN)trigN.userData.pull=1;
    time-lastShot<.25?chain++:chain=0;lastShot=time;emit('fire',{chain});cycle();return true};
  rig.reload=reload;
  rig.cancelReload=function(){if(act&&act.name==='reload'){act.t=Math.max(act.t,act.dur-.2)}};
  rig.equip=function(dur){play('equip',dur||.4,(t)=>({}));equipT=0};
  rig.isBusy=()=>!!act;
  const TMP={L:mk(),R:mk()};
  function blendHand(side,ov,base){const out=cur[side];poseInGun(base,out);if(!ov||!ov.to)return out;
    poseInGun(ov.to,tA);if(ov.from){poseInGun(ov.from,tB);tA.p.lerpVectors(tB.p,tA.p,ov.mix);const q2=tA.q.clone();tA.q.copy(tB.q).slerp(q2,ov.mix);tA.pose=mixPose(tB.pose,tA.pose,ov.mix)}
    if(ov.follow==='bolt'&&boltN){gun.updateMatrixWorld(true);const bp=gun.worldToLocal(boltN.getWorldPosition(new T.Vector3()));const r0=rig._bolt0||(rig._bolt0=bp.clone());tA.p.add(bp.clone().sub(r0))}
    const w=ov.w==null?1:ov.w;out.p.lerp(tA.p,w);out.q.slerp(tA.q,w);out.pose=mixPose(out.pose,tA.pose,w);return out}
  /* ---- per-frame update */
  rig.update=function(dt,inp={}){dt=Math.min(dt,.05);time+=dt;const moving=!!inp.moving,sprint=!!inp.sprint&&moving,ads=clamp(inp.ads||0,0,1);
    const busy=act&&act.name==='reload';const adsTarget=sprint||busy&&C.reload!=='shell'?0:ads;
    rig.adsT+= (adsTarget-rig.adsT)*Math.min(1,dt*(adsTarget>rig.adsT?11:13));const A=sstep(rig.adsT);
    sprintT+=((sprint?1:0)-sprintT)*Math.min(1,dt*8);crouchT+=((inp.crouch?1:0)-crouchT)*Math.min(1,dt*8);
    /* springs */
    const kc=C.kick;for(const k in K){const s=K[k];const a=-kc[4]*s.x-kc[5]*s.v;s.v+=a*dt;s.x+=s.v*dt}
    const look=inp.look||{dx:0,dy:0};SW.x.v+=-look.dx*.0009*(1-A*.8);SW.y.v+=look.dy*.0009*(1-A*.8);SW.ry.v+=-look.dx*.0016*(1-A*.7);SW.rx.v+=-look.dy*.0016*(1-A*.7);
    for(const k in SW){const s=SW[k];const a=-90*s.x-14*s.v;s.v+=a*dt;s.x+=s.v*dt}
    /* bob + idle */
    const spd=moving?(sprint?1.6:1):0;bob+=dt*(moving?(sprint?12:8.6):0);const bA=(moving?1:0)*(sprint?1.8:1)*(1-A*.85);
    const idle=1-A*.9;const bx=Math.sin(bob)*.006*bA+Math.sin(time*1.1)*.0012*idle,by=-Math.abs(Math.cos(bob))*.006*bA+Math.sin(time*1.7)*.0012*idle;
    /* hold: hip <-> ads, sprint pose, crouch */
    hold.position.lerpVectors(hipPos,adsPos,A);
    hold.rotation.set(lerp(hipRot.x,0,A),lerp(hipRot.y,0,A),lerp(hipRot.z,0,A));
    if(sprintT>.001){const s=sprintT;if(C.shoulder){hold.position.add(V(-.04*s,-.06*s,.04*s));hold.rotation.x+=-.45*s;hold.rotation.y+=.75*s;hold.rotation.z+=.35*s}else{hold.position.add(V(-.02*s,-.1*s,.05*s));hold.rotation.x+=.55*s;hold.rotation.z+=-.2*s}}
    hold.position.y-=crouchT*.008;hold.rotation.z+=crouchT*.04;
    sway.position.set(SW.x.x+bx,SW.y.x+by,0);sway.rotation.set(SW.rx.x+Math.sin(bob*2)*.004*bA,SW.ry.x+Math.sin(bob)*.006*bA,Math.sin(bob)*.012*bA);
    kick.position.set(K.x.x,K.rx.x*.12,K.z.x);kick.rotation.set(K.rx.x,K.ry.x,K.rz.x);
    /* equip: from low and pitched */
    if(equipT<1){equipT=Math.min(1,equipT+dt/ (act&&act.name==='equip'?act.dur:.4))}const eq=1-sstep(equipT);
    /* action */
    let O={};if(act){act.t+=dt;const t=clamp(act.t/act.dur,0,1);O=act.fn(t)||{};evs(act);if(act.t>=act.dur){const d=act.done;act=null;if(d)d()}}
    const an=O.anim||{p:[0,0,0],r:[0,0,0]};anim.position.set(an.p[0],an.p[1]-.35*eq,an.p[2]);anim.rotation.set(an.r[0]-.6*eq,an.r[1],an.r[2]);
    /* parts */
    if(slideN){const r=restOf(slideN);const v=O.slide||0;slideN.position.copy(r.p);/* source pistol: slide moves along source -X (rear) */ slideN.position.x-=.032*v;
      if(D.rmr)D.rmr.position.z=.032*v}
    if(boltN&&C.cycle==='bolt'){const r=restOf(boltN);boltN.position.copy(r.p);boltN.position.z+=.07*(O.bolt||0)}
    if(boltN&&C.cycle==='dust'){const r=restOf(boltN);boltN.position.copy(r.p);boltN.position.z+=.06*(O.bolt||0)}
    if(boltN&&(C.cycle==='boltAction')){const pv=boltN.parent;const r=restOf(boltN);boltN.position.copy(r.p);boltN.rotation.copy(r.r);
      const up=O.boltUp||0,back=O.boltBack||0;boltN.rotation.x=r.r.x-1.2*up;boltN.position.x-=.085*back;if(P.boltBody){const rb=restOf(P.boltBody);P.boltBody.position.copy(rb.p);P.boltBody.position.x-=.085*back}}
    if(pumpN){const r=restOf(pumpN);pumpN.position.copy(r.p);pumpN.position.z+=(D.pumpTravel||.07)*(O.pump||0)}
    if(craneN){const r=restOf(craneN);craneN.rotation.copy(r.r);craneN.rotation.z=r.r.z+1.35*(O.crane||0);
      if(cylN){cylN.userData.spin=(cylN.userData.spin||0);if(O.eject!=null&&O.eject>0){}cylN.children.forEach(c=>{if(c.name==='rounds'){c.visible=O.rounds!==0;c.position.z=.02*(O.eject||0)}})}}
    if(cylN&&rig._cylTarget!=null){cylN.rotation.z+=(rig._cylTarget-cylN.rotation.z)*Math.min(1,dt*30)}
    if(barN){const r=restOf(barN);barN.rotation.copy(r.r);barN.rotation.x=r.r.x-.6*(O.barrels||0)}
    if(P.chamber)P.chamber.visible=O.shellsIn!==false;
    if(trigN){trigN.userData.pull=Math.max(0,(trigN.userData.pull||0)-dt*12)}
    /* hands */
    gun.updateMatrixWorld(true);
    const R=blendHand('R',O.R,Rgrip),L=blendHand('L',O.L,Lsup);
    hR.position.copy(R.p);hR.quaternion.copy(R.q);applyFingers(hR,R.pose);hL.position.copy(L.p);hL.quaternion.copy(L.q);applyFingers(hL,L.pose);
    if(magN){const r=restOf(magN);magN.position.copy(r.p);magN.visible=true;
      if(O.mag){const t=O.mag.t;
        if(t>=.25&&t<.5)magN.visible=false;/* old mag dropped (a falling copy is spawned), hand is down at the belt */
        else if(t>=.5&&t<.72){/* fresh mag rides up in the left hand and slides home */
          const L0=poseInGun(Lmag,tB).p.clone(),Lc=cur.L.p;const d=Lc.clone().sub(L0);gun.updateMatrixWorld(true);
          const restG=gun.worldToLocal(magN.parent.localToWorld(r.p.clone()));magN.position.copy(magN.parent.worldToLocal(gun.localToWorld(restG.add(d))))}}}
    /* arms: shoulders fixed in rig space; the forearm reaches to a point inside the glove cuff */
    rig.updateMatrixWorld(true);
    for(const[side,h,arm]of[['R',hR,aR],['L',hL,aL]]){const W=rig.worldToLocal(h.localToWorld(V(0,.002,0)));const S=V(...C.sh[side]);const pole=V(...C.pole[side]).normalize();
      const hq=rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(h.getWorldQuaternion(new T.Quaternion()));
      if(RA){const A=RA[side];const ww=h.localToWorld(V(0,0,0));const wq=h.getWorldQuaternion(new T.Quaternion());const rq=rig.getWorldQuaternion(new T.Quaternion());
        const fd=V(0,1,0).applyQuaternion(wq),pn=V(0,0,-1).applyQuaternion(wq);const pose=side==='R'?R.pose:L.pose;
        solveRealArm(A,rig.localToWorld(S.clone()),ww,pole.clone().applyQuaternion(rq),fd,pn,pose)}
      else solveArm(arm,S,W,pole,hq)}
    for(const n of stockNodes)n.visible=rig.adsT<.8;
    /* flash */
    flashT-=dt;flash.visible=flashT>0;flashLight.intensity=flashT>0?3.5:0;
    /* loose brass / dropped mags */
    for(let i=shells.length-1;i>=0;i--){const s=shells[i];s.t+=dt;s.v.y-=9.8*dt*(s.mag?.8:1);s.m.position.addScaledVector(s.v,dt);s.m.rotation.x+=s.w.x*dt;s.m.rotation.y+=s.w.y*dt;s.m.rotation.z+=s.w.z*dt;
      if(s.t>1.2){rig.remove(s.m);shells.splice(i,1)}}
    return{adsT:rig.adsT,scope:C.scoped&&rig.adsT>.92}};
  /* rest pose immediately */
  rig.update(0,{});return rig}
let FLASH=null;
function flashTex(){if(FLASH)return FLASH;const c=canvas(128,128),x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,240,1)');g.addColorStop(.18,'rgba(255,210,120,.9)');g.addColorStop(.5,'rgba(255,120,30,.25)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);
  x.globalCompositeOperation='lighter';x.translate(64,64);for(let i=0;i<7;i++){x.rotate(Math.PI*2/7);x.fillStyle='rgba(255,190,90,.55)';x.beginPath();x.moveTo(0,-4);x.lineTo(60,0);x.lineTo(0,4);x.fill()}
  FLASH=new T.CanvasTexture(c);FLASH.encoding=T.sRGBEncoding;return FLASH}

/* third person: transform for a gun as a child of a Rocketbox Bip01_R_Hand bone (assets/people/rocketbox/README.md).
   Base offsets are the README ones for the rifle_* / pistol_* clips; each gun is then shifted so its own grip
   (the wrist of the first-person grip pose) lands where the calibrated rifle / pistol grip sits. */
const HAND_BASE={rifle:{p:[0.0989,-0.0154,0.0539],q:[-0.4003,0.4100,0.7039,-0.4198],ref:'rifle',d:[0,.045,.005]},
  pistol:{p:[0.0787,0.0006,0.0687],q:[0.4079,-0.4620,-0.5513,0.5623],ref:'pistol',d:[0,.045,.016]}};
const HAND_STYLE={pistol:'pistol',revolver:'pistol',sawedoff:'pistol',nailer:'pistol',shotgun:'rifle',beanbag:'rifle',double:'rifle',rifle:'rifle',smg:'rifle',hunter:'rifle'};
const HAND_FIX={shotgun:[0,-.045,0],beanbag:[0,-.045,0],double:[0,-.045,0],hunter:[0,-.05,0],smg:[0,-.02,0],revolver:[0,-.04,0],sawedoff:[0,-.035,-.01],nailer:[0,-.02,0]};
function wristInGun(type){const C=VMC[type],D=B[type]();const w=C.R.p;return V(w[2]||0,w[1]-D.grip[1],-(w[0]-D.grip[0]))}
function handAttach(type){type=ALIAS[type]||type;const st=HAND_STYLE[type]||'rifle',b=HAND_BASE[st];
  const d=V(...b.d).add(wristInGun(b.ref).sub(wristInGun(type))).add(V(...(HAND_FIX[type]||[0,0,0])));
  const q=new T.Quaternion(...b.q);return{position:V(...b.p).add(d.clone().applyQuaternion(q)),quaternion:q,clipStyle:st}}
/* convenience: parent a model() gun to a Rocketbox right-hand bone */
function attachToHand(handBone,gun,type){const a=handAttach(type||gun.userData.type);gun.position.copy(a.position);gun.quaternion.copy(a.quaternion);handBone.add(gun);return gun}

HT.Guns={TYPES,ALIAS,model,viewmodel,VMC,POSE,handAttach,attachToHand,loadCharacter,_buildRealArms:buildRealArms,_CHARS:CHARS,_B:B,_mat:mat,_cartridge:cartridge,_emptyCase:emptyCase};
let resolveReady;HT.Guns.ready=new Promise(r=>resolveReady=r);let started=null;
HT.Guns.init=function(o={}){if(started)return started;if(o.base)BASE=o.base;if(o.charBase)CHAR_BASE=o.charBase;HT.Guns.assets=o.assets||null;started=Promise.all([loadAll(o.assets),o.character===false?null:loadCharacter(o.character||'dad_player')]).then(()=>{resolveReady(HT.Guns);return HT.Guns});return started};
})();
