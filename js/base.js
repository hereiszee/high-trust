/* High Trust · HT.Base — Fort Sensible, the training post south of Industrial Way (docs/base.md)
 * Always open, no job needed. The tiles come from js/worldgen.js (rows 80-127, def.base in metres); this file draws the post as
 * open-world set pieces (batched per material, culled per unit like the rest of the world) and runs what happens there:
 *   - the gate (raised barrier, a bored guard), signage, the flag, the Route 9 road sign, the map pin and fast travel
 *   - THE RANGE: lanes with paper and steel at 10/25/50/100 m, pop-ups and a mover, a timed course with a score and medals,
 *     per-gun bests saved in SAVE.base, a range officer, free ammo on the line and a rental rack for guns you don't own yet
 * The tank (js/tank.js), the jet (js/jet.js) and the easter eggs (js/eggs.js) use HT.Base.def() and HT.Base.kit.
 * Hooks used (all through HT.Jobs, which calls system handlers in free roam too): 'hud' (per-frame tick), 'interact' (E prompts;
 * index.html calls it from updHub as well), 'fire' (never consumes a shot here). index.html: frDraw/frUpdate ask HT.Base.armOk()
 * whether a gun may come out here (no heat is ever made on the base), fire() calls a hit mesh's userData.onShot.
 */
(function(){'use strict';
const HT=window.HT=window.HT||{};
const Base={};HT.Base=Base;
const J=()=>HT.Jobs;const A=()=>HT.Jobs&&HT.Jobs.api;
const OWm=()=>HT.OpenWorld;const GEN=()=>HT.WorldGen;
const GBc=()=>HT.World&&HT.World.GB;
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
const C3=h=>{const c=lin(h);return[c.r,c.g,c.b]};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const UI_FONT='"Arial Narrow", Arial, sans-serif';
function cnv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const M4=(x,y,z,ry=0,rx=0,rz=0,sx=1,sy,sz)=>{const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.set(sx,sy==null?sx:sy,sz==null?sx:sz);o.updateMatrix();return o.matrix};
Base.def=()=>{const G=GEN();const d=G&&G.last;return d&&d.base||null};

/* ================= materials and textures (built once, shared by every unit) ================= */
const MAT={},TEX={};
function tex(key,w,h,draw,o={}){if(TEX[key])return TEX[key];const c=cnv(w,h),x=c.getContext('2d');draw(x,w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;
  if(o.rep!==false)t.wrapS=t.wrapT=THREE.RepeatWrapping;return TEX[key]=t}
function noise(x,w,h,n,a,col){const r=rng(n);for(let i=0;i<n;i++){x.fillStyle=col(r);x.globalAlpha=a*r();x.fillRect(r()*w,r()*h,1+r()*2,1+r()*2)}x.globalAlpha=1}
const T={
  stucco:()=>tex('stucco',256,256,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);noise(x,w,h,9000,.25,r=>r()<.5?'#9a9a9a':'#ffffff');
    x.fillStyle='rgba(120,110,100,.10)';for(let i=0;i<6;i++)x.fillRect(0,(i*43)%h,w,2)}),
  corr:()=>tex('corr',256,256,(x,w,h)=>{for(let i=0;i<w;i++){const s=.78+.22*Math.sin(i/w*6.283*16);x.fillStyle=`rgb(${255*s|0},${255*s|0},${255*s|0})`;x.fillRect(i,0,1,h)}
    noise(x,w,h,3000,.18,r=>r()<.5?'#6b5a48':'#ffffff');x.fillStyle='rgba(90,70,50,.12)';for(let i=0;i<5;i++)x.fillRect(0,r0(i)*h,w,3)}),
  earth:()=>tex('earth',256,256,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);noise(x,w,h,14000,.45,r=>r()<.4?'#7d6a4a':r()<.7?'#cfd9a8':'#5d7a3c')}),
  concrete:()=>tex('concrete',256,256,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);noise(x,w,h,12000,.22,r=>r()<.5?'#8a8a8a':'#ffffff');x.strokeStyle='rgba(60,60,60,.25)';x.lineWidth=2;x.strokeRect(1,1,w-2,h-2)}),
  brick:()=>tex('brick',256,256,(x,w,h)=>{x.fillStyle='#d9d4cc';x.fillRect(0,0,w,h);const r=rng(4);for(let j=0;j<16;j++)for(let i=0;i<8;i++){const v=200+r()*55|0;x.fillStyle=`rgb(${v},${v*.86|0},${v*.8|0})`;x.fillRect(i*32+(j%2)*16+1,j*16+1,30,14)}})};
function r0(i){return((i*0.6180339)%1)}
function mat(key){if(MAT[key])return MAT[key];let m;const S=o=>new THREE.MeshStandardMaterial(Object.assign({vertexColors:true,roughness:.85,metalness:0},o));
  switch(key){
    case 'paint':m=S({});break;
    case 'stucco':m=S({map:T.stucco(),roughness:.92});break;
    case 'concrete':m=S({map:T.concrete(),roughness:.95});break;
    case 'brick':m=S({map:T.brick(),roughness:.9});break;
    case 'metal':m=S({roughness:.42,metalness:.55});break;
    case 'corr':m=S({map:T.corr(),roughness:.5,metalness:.45});break;
    case 'earth':m=S({map:T.earth(),roughness:1});break;
    case 'glass':m=new THREE.MeshStandardMaterial({color:lin('#28394a'),roughness:.08,metalness:.6,envMapIntensity:1.4});break;
    case 'dark':m=S({roughness:1});break;
    case 'mark':m=S({roughness:.9,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});break;
    case 'glow':m=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});break;
    case 'sign0':case 'sign1':case 'sign2':case 'sign3':m=new THREE.MeshStandardMaterial({map:atlasPage(+key.slice(4)).tex,roughness:.7});break;
    default:m=S({})}
  m.name='base:'+key;return MAT[key]=m}
const CAST={paint:1,stucco:1,concrete:1,brick:1,metal:1,corr:1,earth:1,glass:0,dark:0,mark:0,glow:0,sign0:1,sign1:1,sign2:1,sign3:1};

/* ---- sign atlas: one 2048² canvas, cells of 512×128 (a sign spans 1-4 cells wide and 1-4 tall); one material for every sign ---- */
let ATL=[];
function atlasPage(i){if(ATL[i])return ATL[i];const c=cnv(2048,2048);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;
  return ATL[i]={c,x:c.getContext('2d'),tex:t,used:new Uint8Array(4*16)}}
const ATMAP={};
/* draw(ctx,w,h) into a free rect of cw×ch cells (on the first page with room); returns [u0,v0,u1,v1,page] */
function atlasRect(key,cw,ch,draw){if(ATMAP[key])return ATMAP[key];
  for(let pg=0;pg<4;pg++){const a=atlasPage(pg);
    for(let r=0;r+ch<=16;r++)for(let q=0;q+cw<=4;q++){let free=true;for(let j=0;j<ch&&free;j++)for(let i=0;i<cw;i++)if(a.used[(r+j)*4+q+i]){free=false;break}
      if(!free)continue;for(let j=0;j<ch;j++)for(let i=0;i<cw;i++)a.used[(r+j)*4+q+i]=1;
      const px=q*512,py=r*128,w=cw*512,h=ch*128;a.x.save();a.x.translate(px,py);a.x.beginPath();a.x.rect(0,0,w,h);a.x.clip();draw(a.x,w,h);a.x.restore();a.tex.needsUpdate=true;
      return ATMAP[key]=[(px+2)/2048,1-(py+h-2)/2048,(px+w-2)/2048,1-(py+2)/2048,pg]}}
  console.warn('[base] sign atlas full',key);return[0,0,.01,.01,0]}
/* n small signs side by side in one cell: returns n rects */
function atlasSplit(key,n,draw){const r=atlasRect(key,1,1,(x,w,h)=>{for(let i=0;i<n;i++){x.save();x.translate(i*w/n,0);x.beginPath();x.rect(0,0,w/n,h);x.clip();draw(x,w/n,h,i);x.restore()}});
  const out=[];for(let i=0;i<n;i++){const u0=r[0]+(r[2]-r[0])*i/n,u1=r[0]+(r[2]-r[0])*(i+1)/n;out.push([u0+.0008,r[1],u1-.0008,r[3],r[4]])}return out}
/* a painted board: lines[0] big, the rest smaller; style: 'army' (olive, stencil white), 'white', 'green' (highway), 'red', 'brown', 'yellow' */
const STY={army:['#3f4a2f','#f1ead2','#e8c64a'],white:['#f2efe6','#1d2a3a','#a12a2a'],green:['#1f6b43','#ffffff','#ffffff'],red:['#b3282d','#ffffff','#ffe9a8'],
  brown:['#5b3b22','#f4e6c8','#f4e6c8'],yellow:['#f2c230','#1a1a1a','#1a1a1a'],navy:['#1e2c46','#f3efe3','#e8c64a']};
function board(key,lines,cw,ch,st,o={}){const[bg,fg,fg2]=STY[st]||STY.white;return atlasRect(key,cw,ch,(x,w,h)=>{
  x.fillStyle=bg;x.fillRect(0,0,w,h);x.strokeStyle=fg;x.lineWidth=Math.max(4,h*.035);x.strokeRect(h*.05,h*.05,w-h*.1,h-h*.1);
  if(o.badge)drawBadge(x,h*.55,h*.5,h*.36);
  const left=o.badge?h*1.05:0,W=w-left;x.textAlign='center';x.textBaseline='middle';
  const n=lines.length,big=o.big||Math.min(h*.5/Math.max(1,n*.62),W*.11);let y=n===1?h/2:h*(o.top||.3);
  lines.forEach((l,i)=>{const sz=i===0?big:Math.min(big*.52,h*.16);x.font=`${i===0?900:700} ${sz}px ${o.font||UI_FONT}`;x.fillStyle=i===0?fg:fg2;
    x.fillText(l,left+W/2,y,W*.92);y+=i===0?big*.72+sz*.2:sz*1.18})})}
/* the generic post insignia: a shield with a star and two oak leaves (no real unit) */
function drawBadge(x,cx,cy,r){x.save();x.translate(cx,cy);x.fillStyle='#e8c64a';x.beginPath();x.moveTo(-r*.8,-r);x.lineTo(r*.8,-r);x.lineTo(r*.8,r*.1);x.quadraticCurveTo(r*.8,r*.8,0,r*1.05);
  x.quadraticCurveTo(-r*.8,r*.8,-r*.8,r*.1);x.closePath();x.fill();x.fillStyle='#2e3a26';x.beginPath();x.moveTo(-r*.66,-r*.86);x.lineTo(r*.66,-r*.86);x.lineTo(r*.66,r*.08);
  x.quadraticCurveTo(r*.66,r*.66,0,r*.88);x.quadraticCurveTo(-r*.66,r*.66,-r*.66,r*.08);x.closePath();x.fill();x.fillStyle='#e8c64a';x.beginPath();
  for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.18:r*.42;x.lineTo(Math.cos(a)*rr,Math.sin(a)*rr-r*.12)}x.closePath();x.fill();
  x.strokeStyle='#e8c64a';x.lineWidth=r*.08;for(const s of[-1,1]){x.beginPath();x.ellipse(s*r*.28,r*.45,r*.12,r*.26,s*.7,0,6.28);x.stroke()}x.restore()}
Base.badge=drawBadge;

/* ================= geometry painter: one builder per material, flushed into a unit's group ================= */
function painter(){const by={};const P={
  g(k){return by[k]||(by[k]=new (GBc())())},
  /* axis box with world UVs (mpr metres per texture repeat) */
  box(k,x0,y0,z0,x1,y1,z1,col,mpr,skip){P.g(k).box(x0,y0,z0,x1,y1,z1,mpr||2,col?C3(col):null,skip||{});return P},
  geo(k,geo,m,col,uv){P.g(k).addGeo(geo,m,uv||1,col?C3(col):null);geo.dispose();return P},
  /* oriented box: centre (x,y,z), size (w,h,d), yaw */
  obox(k,x,y,z,w,h,d,yaw,col,rx,rz){return P.geo(k,new THREE.BoxGeometry(w,h,d),M4(x,y,z,yaw||0,rx||0,rz||0),col)},
  cyl(k,x,y,z,r0,r1,h,col,seg,rx,rz,ry){return P.geo(k,new THREE.CylinderGeometry(r1,r0,h,seg||10,1,false),M4(x,y,z,ry||0,rx||0,rz||0),col)},
  quad(k,a,b,c,d,col,uv){P.g(k).quad(a,b,c,d,uv||[[0,0],[1,0],[1,1],[0,1]],col?C3(col):null);return P},
  /* a sign face: centre, width, height, facing yaw (the face looks along (-sin yaw, -cos yaw)), atlas rect r */
  sign(x,y,z,w,h,yaw,r,back){const c=Math.cos(yaw),s=Math.sin(yaw),fx=-s,fz=-c,rx=-c,rz=s,o=.03;   /* rx,rz: the reader's right when facing the sign */
    const p=(u,v)=>[x+rx*u*w/2+fx*o,y+v*h/2,z+rz*u*w/2+fz*o];
    P.g('sign'+(r[4]|0)).quad(p(-1,-1),p(1,-1),p(1,1),p(-1,1),[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]],null,[fx,0,fz]);
    if(back)P.obox('paint',x,y,z,w+.06,h+.06,.05,yaw,back);return P},
  flush(group,o={}){for(const k in by){const gb=by[k];if(!gb.I.length)continue;const m=new THREE.Mesh(gb.geo(),mat(k));m.castShadow=!!CAST[k]&&o.shadow!==false;m.receiveShadow=k!=='glow';
    if(k==='mark')m.renderOrder=1;m.name='base:'+k;group.add(m)}return group}};return P}
Base.kit={painter,mat,board,atlasRect,atlasSplit,M4,C3,lin,tex,cnv,rng,drawBadge};

/* ================= the set pieces ================= */
const COL={wall:'#d9ccad',wall2:'#cbbd9c',trim:'#f1ece0',roof:'#4d5a3c',olive:'#55603f',khaki:'#b9a77c',steel:'#8b9196',dark:'#22262a',white:'#f4f2ea',red:'#b8312f',yellow:'#e9b92e',
  conc:'#b9b5ab',asph:'#2f3133',earth:'#8a7350',grass:'#6f8a45',sand:'#c9b48a',wood:'#8a6a45',orange:'#e46d1f'};

/* windows on a long wall along x at z (face nz = ±1), from x0 to x1, rows at y */
function windowsX(P,x0,x1,z,nz,ys,n,w,h){for(let i=0;i<n;i++){const cx=x0+(x1-x0)*(i+.5)/n;for(const y of ys){P.obox('paint',cx,y,z+nz*.04,w+.22,h+.22,.08,0,COL.trim);
  P.quad('glass',[cx-w/2,y-h/2,z+nz*.1],[cx+w/2,y-h/2,z+nz*.1],[cx+w/2,y+h/2,z+nz*.1],[cx-w/2,y+h/2,z+nz*.1]);P.obox('paint',cx,y-h/2-.08,z+nz*.14,w+.3,.08,.18,0,COL.trim)}}}
function windowsZ(P,z0,z1,x,nx,ys,n,w,h){for(let i=0;i<n;i++){const cz=z0+(z1-z0)*(i+.5)/n;for(const y of ys){P.obox('paint',x+nx*.04,y,cz,.08,h+.22,w+.22,0,COL.trim);
  P.quad('glass',[x+nx*.1,y-h/2,cz-w/2],[x+nx*.1,y-h/2,cz+w/2],[x+nx*.1,y+h/2,cz+w/2],[x+nx*.1,y+h/2,cz-w/2])}}}
/* a gable roof over [x0,x1]×[z0,z1] at eave height y, ridge along x */
function gable(P,k,x0,z0,x1,z1,y,rise,col,over=.45){const zm=(z0+z1)/2,a=[x0-over,y-.15,z0-over],b=[x1+over,y-.15,z0-over],c=[x1+over,y+rise,zm],d=[x0-over,y+rise,zm],
  e=[x0-over,y-.15,z1+over],f=[x1+over,y-.15,z1+over];const L=x1-x0+2*over,S=Math.hypot(rise,(z1-z0)/2+over)/2.4;
  P.g(k).quad(a,b,c,d,[[0,0],[L/2.4,0],[L/2.4,S],[0,S]],C3(col),[0,1,-1]);P.g(k).quad(f,e,d,c,[[0,0],[L/2.4,0],[L/2.4,S],[0,S]],C3(col),[0,1,1]);
  for(const[x,nx]of[[x0,-1],[x1,1]])P.g('stucco').tri([x,y,z0],[x,y,z1],[x,y+rise-.1,zm],[[0,0],[1,0],[.5,.5]],C3(COL.wall2),[nx,0,0])}

/* ---------- barracks, gatehouse, tower, range office: the buildings (def.base.bld) ---------- */
function barracks(P,b,name){const x0=b.x0+.3,x1=b.x1-.3,z0=b.z0+.3,z1=b.z1-.3,H=6.2;
  P.box('concrete',x0-.15,0,z0-.15,x1+.15,.55,z1+.15,COL.conc);P.box('stucco',x0,.55,z0,x1,H,z1,COL.wall);
  P.box('paint',x0-.05,3.1,z0-.05,x1+.05,3.3,z1+.05,COL.trim);
  for(const[z,nz]of[[z0,-1],[z1,1]])windowsX(P,x0+1,x1-1,z,nz,[1.9,4.5],9,1.15,1.35);
  windowsZ(P,z0+1.2,z1-1.2,x0,-1,[1.9,4.5],2,1,1.3);windowsZ(P,z0+1.2,z1-1.2,x1,1,[1.9,4.5],2,1,1.3);
  gable(P,'corr',x0,z0,x1,z1,H,2.1,COL.roof,.5);
  /* door with a little canopy and steps on the south (the walk) */
  const dx=(x0+x1)/2;P.obox('dark',dx,1.6,z1+.05,1.7,2.3,.1,0,'#3a2f25');P.obox('paint',dx,1.6,z1+.09,1.5,2.1,.06,0,'#6b4f37');P.obox('paint',dx+.5,1.6,z1+.14,.08,.08,.12,0,'#d8c27a');
  P.obox('metal',dx,2.95,z1+.75,2.8,.12,1.6,0,COL.olive);for(const s of[-1.25,1.25])P.cyl('metal',dx+s,1.45,z1+1.45,.05,.05,2.9,COL.steel,6);
  P.box('concrete',dx-1.4,0,z1,dx+1.4,.36,z1+1.6,COL.conc);P.box('concrete',dx-1.4,0,z1+1.6,dx+1.4,.18,z1+2.1,COL.conc);
  P.sign(dx,3.65,z1+.08,3.6,.9,Math.PI,board('bk_'+name,[name,'LIGHTS OUT MEANS LIGHTS OUT'],2,1,'army'));
  /* AC units and a downpipe */
  for(const x of[x0+3,x1-3])P.box('metal',x-.45,.55,z0-.9,x+.45,1.35,z0-.05,'#c9cbc6');
  for(const x of[x0+.2,x1-.2])P.cyl('metal',x,3.2,z1+.12,.06,.06,6.2,'#9a9f99',6)}
function gatehouse(P,b){const x0=b.x0+.4,x1=b.x1-.4,z0=b.z0+.4,z1=b.z1-.4,H=2.7;
  P.box('concrete',x0-.25,0,z0-.25,x1+.25,.3,z1+.25,COL.conc);P.box('stucco',x0,.3,z0,x1,1.05,z1,COL.white);P.box('stucco',x0,2.25,z0,x1,H,z1,COL.white);
  P.box('dark',x0+.05,1.05,z0+.05,x1-.05,2.25,z1-.05,'#2a3036');
  for(const[a,c,z,nz]of[[x0,x1,z0,-1],[x0,x1,z1,1]]){P.quad('glass',[a+.1,1.05,z+nz*.01],[c-.1,1.05,z+nz*.01],[c-.1,2.25,z+nz*.01],[a+.1,2.25,z+nz*.01]);
    for(let k=0;k<=3;k++){const x=a+(c-a)*k/3;P.obox('paint',x,1.65,z+nz*.03,.08,1.2,.08,0,COL.white)}}
  for(const[a,c,x,nx]of[[z0,z1,x0,-1],[z0,z1,x1,1]]){P.quad('glass',[x+nx*.01,1.05,a+.1],[x+nx*.01,1.05,c-.1],[x+nx*.01,2.25,c-.1],[x+nx*.01,2.25,a+.1]);
    for(let k=0;k<=2;k++){const z=a+(c-a)*k/2;P.obox('paint',x+nx*.03,1.65,z,.08,1.2,.08,0,COL.white)}}
  P.box('paint',x0-.55,H,z0-.55,x1+.55,H+.32,z1+.55,COL.white);P.box('paint',x0-.57,H+.08,z0-.57,x1+.57,H+.24,z1+.57,COL.red);
  P.box('metal',x0+.2,H+.32,z0+.2,x1-.2,H+.4,z1-.2,'#6a6f72');
  P.cyl('glow',(x0+x1)/2,H+.58,(z0+z1)/2,.12,.12,.3,'#ff9a3a',8);
  P.sign(x0-.04,H+.16,(z0+z1)/2,2.2,.3,-Math.PI/2*-1,board('gh',['VISITORS · PLEASE WAVE'],2,1,'navy'));
  /* a bench and a coffee mug on the sill */
  P.box('paint',x1+.3,0,z0+.4,x1+.7,.45,z1-.4,'#7a5a3a');P.cyl('paint',x0-.12,1.1,z0+.5,.05,.045,.1,'#f2efe6',8)}
function tower(P,b){const cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,w=(b.x1-b.x0)-.8,H=8.6;
  P.box('concrete',cx-w/2,0,cz-w/2,cx+w/2,H,cz+w/2,'#c7c3b8',2.5);
  for(let y=1.5;y<H;y+=2.6)for(const[nz,z]of[[-1,cz-w/2],[1,cz+w/2]])P.quad('glass',[cx-.5,y,z+nz*.02],[cx+.5,y,z+nz*.02],[cx+.5,y+1.1,z+nz*.02],[cx-.5,y+1.1,z+nz*.02]);
  const W2=w+1.6;P.box('concrete',cx-W2/2,H,cz-W2/2,cx+W2/2,H+.4,cz+W2/2,'#d6d2c7');
  /* the cab: slanted glass all round, a deck rail */
  const y0=H+.4,y1=H+2.6,i=W2/2-.25,o2=W2/2+.15;for(const[ax,az,bx,bz]of[[-1,-1,1,-1],[1,-1,1,1],[1,1,-1,1],[-1,1,-1,-1]])
    P.quad('glass',[cx+ax*i,y0,cz+az*i],[cx+bx*i,y0,cz+bz*i],[cx+bx*o2,y1,cz+bz*o2],[cx+ax*o2,y1,cz+az*o2]);
  for(const s of[-1,1])for(const t of[-1,1])P.cyl('metal',cx+s*o2*.98,y0+1.1,cz+t*o2*.98,.06,.06,2.2,COL.dark,6);
  P.box('paint',cx-o2-.2,y1,cz-o2-.2,cx+o2+.2,y1+.45,cz+o2+.2,COL.white);P.box('paint',cx-o2-.21,y1+.12,cz-o2-.21,cx+o2+.21,y1+.3,cz+o2+.21,COL.red);
  P.cyl('metal',cx+1,y1+1.6,cz+1,.04,.03,2.8,COL.steel,6);P.cyl('metal',cx-1.2,y1+.9,cz-.8,.25,.25,.5,'#dcdcdc',10);
  P.sign(cx,H-1.2,cz-w/2-.02,4.2,1.05,0,board('tw',['TOWER','IT IS NOT A LIGHTHOUSE'],2,1,'white'))}
function rangeOffice(P,b){const x0=b.x0+.2,x1=b.x1-.2,z0=b.z0+.2,z1=b.z1-.2,H=3.2;
  P.box('stucco',x0,0,z0,x1,H,z1,'#c9b994',2.5);P.box('paint',x0-.3,H,z0-.3,x1+.3,H+.3,z1+.3,COL.olive);P.box('concrete',x0-.1,0,z0-.1,x1+.1,.35,z1+.1,COL.conc);
  windowsX(P,x0+1,x1-1,z1,1,[1.7],2,1.4,1.1);windowsZ(P,z0+1,z1-1,x0,-1,[1.7],1,2.4,1.1);
  P.obox('dark',x1+.04,1.1,(z0+z1)/2,.08,2.2,1.1,0,'#3a2f25');
  P.sign(x0-.02,H+.95,(z0+z1)/2,6,1.4,-Math.PI/2,board('rc',['RANGE CONTROL','EYES AND EARS. ALSO BRAINS.'],3,1,'army',{badge:true}));
  for(const z of[z0+.6,z1-.6])P.obox('paint',x0-.02,H+.95,z,.05,1.5,.08,0,'#2a2a2a')}

/* ---------- hangar: a vault over 34 m, open on the apron side (+z) ---------- */
function hangar(P,b){const x0=b.x0+.3,x1=b.x1-.3,z0=b.z0+.3,z1=b.z1-.3,cx=(x0+x1)/2,R=(x1-x0)/2,H=9.2,N=18,base=1.4;
  /* audit W-05: knee walls round the edge (not a solid 1.4 m slab: the inside has a floor at ground level now) */
  P.box('concrete',x0-.2,0,z0-.2,x0+.35,base,z1,COL.conc);P.box('concrete',x1-.35,0,z0-.2,x1+.2,base,z1,COL.conc);P.box('concrete',x0-.2,0,z0-.2,x1+.2,base,z0+.35,COL.conc);
  P.box('concrete',x0-.2,0,z1-.35,cx-9.2,base,z1,COL.conc);P.box('concrete',cx+9.2,0,z1-.35,x1+.2,base,z1,COL.conc);
  const pt=(i,z,inset)=>{const a=Math.PI*i/N;return[cx+Math.cos(a)*(R-inset),base+Math.sin(a)*(H-base-inset*.6),z]};
  for(let i=0;i<N;i++){const a=pt(i,z0,0),b2=pt(i+1,z0,0),c=pt(i+1,z1,0),d=pt(i,z1,0),L=(z1-z0)/2.4,s0=i*(R*Math.PI/N)/2.4,s1=(i+1)*(R*Math.PI/N)/2.4;
    P.g('corr').quad(a,b2,c,d,[[s0,0],[s1,0],[s1,L],[s0,L]],C3('#a7aca7'),[a[0]-cx,1,0]);
    P.g('corr').quad(pt(i,z0,.25),pt(i+1,z0,.25),pt(i+1,z1-.3,.25),pt(i,z1-.3,.25),[[s0,0],[s1,0],[s1,L],[s0,L]],C3('#9da29b'),[cx-a[0],-1,0],[0,.45,.89])}/* the roof's underside (shaded as if it faced the door: facing down it only got the hemisphere's dark ground term): corrugated, lit (was a black void) */
  /* ribs every 4 m */
  for(let z=z0+.2;z<=z1;z+=4)for(let i=0;i<N;i++){const a=pt(i,z,-.08),b2=pt(i+1,z,-.08),m=[(a[0]+b2[0])/2,(a[1]+b2[1])/2,z],L=Math.hypot(b2[0]-a[0],b2[1]-a[1]);
    P.obox('metal',m[0],m[1],m[2],L+.05,.12,.22,0,'#8f948f',0,Math.atan2(b2[1]-a[1],b2[0]-a[0]))}
  /* back wall, front wall above and beside the door */
  const front=(z,nz,door)=>{for(let i=0;i<N;i++){const a=pt(i,z,0),b2=pt(i+1,z,0);
      if(door){const dh=6.4,dw=9;/* above the door, and the full wall beside it */
        const ya=Math.max(a[1],0),yb=Math.max(b2[1],0);if(Math.abs((a[0]+b2[0])/2-cx)<dw){if(Math.min(ya,yb)>dh)P.g('stucco').quad([a[0],dh,z],[b2[0],dh,z],[b2[0],yb,z],[a[0],ya,z],[[0,0],[1,0],[1,1],[0,1]],C3('#cfd2cc'),[0,0,nz]);continue}}
      P.g('stucco').quad([a[0],0,z],[b2[0],0,z],b2,a,[[a[0]/3,0],[b2[0]/3,0],[b2[0]/3,b2[1]/3],[a[0]/3,a[1]/3]],C3('#cfd2cc'),[0,0,nz])}};
  front(z0,-1,false);front(z1,1,true);
  /* audit W-05: the inside (it was a black box with the sky showing through the back wall's missing inner face) */
  {const inner=(z,nz,door)=>{for(let i=0;i<N;i++){const a=pt(i,z,0),b2=pt(i+1,z,0);/* the end walls seen from inside: same outline, wound the other way */
      if(door&&Math.abs((a[0]+b2[0])/2-cx)<9){const dh=6.4;if(Math.min(a[1],b2[1])>dh)P.g('stucco').quad([b2[0],dh,z],[a[0],dh,z],a,b2,[[0,0],[1,0],[1,1],[0,1]],C3('#b9bdb6'),[0,0,nz]);continue}
      P.g('stucco').quad([b2[0],0,z],[a[0],0,z],a,b2,[[b2[0]/3,0],[a[0]/3,0],[a[0]/3,a[1]/3],[b2[0]/3,b2[1]/3]],C3('#b9bdb6'),[0,0,nz])}};
    inner(z0+.06,1,false);inner(z1-.06,-1,true)}
  {const fx0=x0+.35,fx1=x1-.35,fz0=z0+.35,fz1=z1;   /* floor: sealed concrete, a yellow safety line round the bay, a parking T, oil stains */
    P.g('concrete').quad([fx0,.025,fz1],[fx1,.025,fz1],[fx1,.025,fz0],[fx0,.025,fz0],[[0,0],[(fx1-fx0)/4,0],[(fx1-fx0)/4,(fz1-fz0)/4],[0,(fz1-fz0)/4]],C3('#a9aaa4'),[0,1,0]);
    const Y='#e8c13a';P.box('paint',cx-11,.03,fz0+2.5,cx+11,.04,fz0+2.7,Y);for(const s2 of[-1,1])P.box('paint',cx+s2*11-.1,.03,fz0+2.5,cx+s2*11+.1,.04,fz1-.8,Y);
    P.box('paint',cx-.12,.03,fz0+6,cx+.12,.04,fz1-1,Y);P.box('paint',cx-2.4,.03,fz0+6,cx+2.4,.04,fz0+6.25,Y);
    for(const[ox,oz,r2]of[[-2.5,9,1.1],[1.8,13,.8],[4.6,7.5,.6],[-6,15,.9]])P.cyl('dark',cx+ox,.032,fz0+oz,r2,r2,.004,'#3e3f3c',14)}
  {const bz=z0+.6,R2=rng(11);   /* along the back wall: a workbench, tool chests, a parts shelf, drums; a tug and a maintenance stand on the floor */
    P.box('paint',cx-7,.88,bz,cx-2,.95,bz+.9,'#8a6a45');for(const x of[cx-6.9,cx-2.1])for(const z of[bz+.05,bz+.85])P.box('metal',x-.04,0,z-.04,x+.04,.88,z+.04,'#3a3d3a');
    P.box('metal',cx-7,.95,bz,cx-2,2.1,bz+.06,'#6f7570');for(let k=0;k<7;k++)P.box('metal',cx-6.6+k*.65,1.3+(k%3)*.22,bz+.06,cx-6.4+k*.65,1.5+(k%3)*.22,bz+.12,'#2f3133');
    for(const[x,h]of[[cx-1.2,1.15],[cx-.3,.95]]){P.box('paint',x-.4,0,bz,x+.4,h,bz+.55,'#b2352a');for(let y=.2;y<h-.05;y+=.18)P.box('metal',x-.36,y,bz+.55,x+.36,y+.025,bz+.57,'#d9d9d4')}
    P.box('metal',cx+1.4,0,bz,cx+4.4,2.4,bz+.6,'#5d635e');for(const y of[.5,1.2,1.9])P.box('metal',cx+1.4,y,bz,cx+4.4,y+.04,bz+.6,'#7b827c');
    for(let k=0;k<9;k++)P.box('paint',cx+1.5+(k%4)*.72,(k>>2)*.7+.54,bz+.08,cx+2.1+(k%4)*.72,(k>>2)*.7+.54+.3+R2()*.2,bz+.5,['#6b5a3c','#8c8a80','#4f6a3d'][k%3]);
    for(let k=0;k<4;k++)P.cyl('metal',cx+6+(k%2)*.7,.46,bz+.4+(k>>1)*.7,.29,.29,.92,['#3f5530','#7a3a2a'][k%2],12);
    for(let k=0;k<4;k++)P.cyl('dark',cx+8.4,.12+k*.22,bz+.6,.38,.38,.2,'#1e1f20',14);   /* stacked tyres */
    {const tx=cx+6.5,tz=z1-9;P.box('paint',tx-1,.35,tz-.65,tx+1,1.05,tz+.65,'#e2b129');P.box('paint',tx-1,1.05,tz-.65,tx-.2,1.5,tz+.65,'#e2b129');P.box('metal',tx-.15,1.05,tz-.35,tx+.05,1.6,tz+.35,'#2d2f30');
      for(const ax of[-.65,.65])for(const az of[-.72,.72])P.box('dark',tx+ax-.28,0,tz+az-.12,tx+ax+.28,.56,tz+az+.12,'#1c1d1e');P.box('metal',tx+1,.4,tz-.08,tx+2.1,.48,tz+.08,'#2d2f30')}   /* the tug and its tow bar */
    {const sx=cx-8.5,sz=z1-12;for(let k=0;k<5;k++)P.box('metal',sx,0,sz+k*.32,sx+1.1,.35+k*.35,sz+k*.32+.34,'#c9cbc4');P.box('metal',sx,1.75,sz+1.3,sx+1.1,1.8,sz+2.4,'#c9cbc4');
      for(const z of[sz+1.35,sz+2.35])for(const x of[sx+.05,sx+1.05])P.box('metal',x-.03,0,z-.03,x+.03,2.8,z+.03,'#e2b129');P.box('metal',sx,2.75,sz+1.3,sx+.05,2.8,sz+2.4,'#e2b129');P.box('metal',sx+1.05,2.75,sz+1.3,sx+1.1,2.8,sz+2.4,'#e2b129')}   /* a rolling maintenance stand */
    P.sign(cx,4.2,z0+.45,5.4,1.25,Math.PI,board('hgsafe',['SAFETY FIRST','DAYS SINCE THE LAST "WATCH THIS": 0'],2,1,'yellow'))}
  P.box('paint',cx-9.4,6.4,z1-.1,cx+9.4,6.8,z1+.25,'#3c4146');                 /* door header and the slid-open door panels */
  for(const s of[-1,1])P.box('corr',cx+s*9.1-(s>0?0:4.2),0,z1+.2,cx+s*9.1+(s>0?4.2:0),6.4,z1+.45,'#9ea39e',3);
  for(let x=cx-8;x<=cx+8;x+=4)P.box('glow',x-.8,6.0,z0+1,x+.8,6.08,z1-2,'#fff2d6');   /* lights inside */
  P.sign(cx,7.55,z1+.06,6.6,.85,Math.PI,board('hg',['HANGAR 2','THERE IS NO HANGAR 1'],2,1,'white'));
  P.sign(cx-13.2,3.6,z1+.05,2.6,2.6,Math.PI,atlasRect('hgb',1,2,(x,w,h)=>{x.fillStyle='#cfd2cc';x.fillRect(0,0,w,h);drawBadge(x,w/2,h/2,w*.4)}))}

/* ---------- motor pool: a carport canopy, drums, a fuel point ---------- */
function motorPool(P,m){const x0=m.x0+.6,x1=m.x1-.6,z0=m.z0+.4,z1=z0+6.2,H=4.6;
  for(let x=x0;x<=x1+.01;x+=(x1-x0)/4)for(const z of[z0,z1]){P.box('metal',x-.12,0,z-.12,x+.12,H,z+.12,COL.olive)}
  P.box('metal',x0-.2,H,z0-.3,x1+.2,H+.25,z1+.3,COL.olive);P.box('corr',x0-.5,H+.25,z0-.6,x1+.5,H+.38,z1+.6,'#8d958a',3);
  const r=rng(7);for(let i=0;i<9;i++){const x=x0+.8+r()*2.2,z=z0+.8+i*.62;P.cyl('metal',x+(i%3)*.75,.46,z,.29,.29,.92,['#3f5530','#2e4a6b','#7a3a2a'][i%3],12)}
  for(let i=0;i<4;i++)P.box('metal',x1-1.6,0,z0+.6+i*1.2,x1-.4,.95,z0+1.5+i*1.2,'#a3402c');
  P.sign(x0+5,H+.95,z0-.65,7.6,1.3,0,board('mp',['MOTOR POOL','SPEED LIMIT 5 MPH · NO DONUTS (THE DRIVING KIND)'],3,1,'army',{badge:true}));
  for(const x of[x0+1.5,x0+8.5])P.obox('paint',x,H+.95,z0-.64,.08,1.3,.05,0,'#222')}

/* ---------- the range: berms, the firing shed, benches, lane and distance boards, flags ---------- */
function range(P,d){const R=d.range,bx=R.box,line=R.line,lanes=R.lanes,zN=bx.z0+1,zS=bx.z1-1;
  /* side berms (trapezoid earth mounds), the backstop, gravel strips under the target lines */
  /* audit W-09: the side berms are earth mounds now (were a flat tan prism with hard facets and a vertical end): a heightfield along the
     lane with a rounded section, a little noise, tapered ends, a skirt into the grass, smooth normals and grass-to-earth colour.
     Written straight into the 'earth' painter's buffers so it stays one merged mesh. */
  const berm=(x0,x1,zc,w,h,top)=>{const g=P.g('earth'),r=rng(Math.round(zc*7)),ph=[r()*9,r()*9,r()*9];const xa=Math.min(x0,x1),xb=Math.max(x0,x1),L=xb-xa;
    const NX=Math.max(8,Math.round(L/1.25)),T=[-1.5,-1.22,-1,-.8,-.6,-.4,-.2,0,.2,.4,.6,.8,1,1.22,1.5],NZ=T.length,hw=w/2+.25,tw=top/w;
    const nse=(x,t)=>Math.sin(x*.37+ph[0])*.5+Math.sin(x*.91+t*2.3+ph[1])*.3+Math.sin(x*2.1-t*3.1+ph[2])*.2;
    const Y=(x,t)=>{const e=Math.min(1,Math.min(x-xa,xb-x)/2.8),end=e*e*(3-2*e),at=Math.abs(t);if(at>=1.5)return -.06;
      const prof=at<=tw?1:at>=1?0:Math.pow(Math.cos((at-tw)/(1-tw)*Math.PI/2),1.15);const skirt=at>1?-.06*(at-1)/.5:0;
      return Math.max(-.06,(h*prof*(.88+.12*nse(x,t))+(at<1?.08*nse(x*1.7,t):0))*(.25+.75*end)*(at<1?1:0)+skirt)};
    const Z=(x,t)=>zc+t*hw*(1+.06*Math.sin(x*.23+ph[1]));
    const P0=[],H0=[];for(let i=0;i<=NX;i++){const x=xa+L*i/NX;for(let k=0;k<NZ;k++){const y=Y(x,T[k]);P0.push([x,y,Z(x,T[k])]);H0.push(y)}}
    const at=(i,k)=>P0[Math.max(0,Math.min(NX,i))*NZ+Math.max(0,Math.min(NZ-1,k))];
    const gr=C3('#97a362'),ea=C3('#a08a63'),dk=C3('#76664a'),i0=g.n;/* the old berm's tones, greener on top */
    for(let i=0;i<=NX;i++)for(let k=0;k<NZ;k++){const p=at(i,k),ax=at(i+1,k),bx=at(i-1,k),az=at(i,k+1),bz=at(i,k-1);
      const dx=[ax[0]-bx[0],ax[1]-bx[1],ax[2]-bx[2]],dz=[az[0]-bz[0],az[1]-bz[1],az[2]-bz[2]];let n=[dz[1]*dx[2]-dz[2]*dx[1],dz[2]*dx[0]-dz[0]*dx[2],dz[0]*dx[1]-dz[1]*dx[0]];
      if(n[1]<0)n=n.map(v=>-v);const l=Math.hypot(...n)||1;n=n.map(v=>v/l);
      const slope=1-n[1],hk=Math.max(0,p[1])/h,v=.9+.2*(nse(p[0]*3.1,T[k]*2)*.5+.5),m=Math.min(1,slope*2.2+(1-hk)*.25);
      const c=gr.map((q,j)=>(q*(1-m)+ea[j]*m)*v*(p[1]<.05?.92:1));if(Math.abs(T[k])>1.3)c.forEach((q,j)=>c[j]=q*.6+dk[j]*.4);
      g.P.push(p[0],p[1],p[2]);g.N.push(n[0],n[1],n[2]);g.U.push(p[0]/3,p[2]/3);g.K.push(c[0],c[1],c[2]);g.n++}
    for(let i=0;i<NX;i++)for(let k=0;k<NZ-1;k++){const a=i0+i*NZ+k,b=a+NZ;g.I.push(a,a+1,b+1,a,b+1,b)}};

  berm(d.bld.bermW.x1,line-1.5,zN,3.4,2.4,.8);berm(d.bld.bermW.x1,line-1.5,zS,3.4,2.4,.8);
  {const g=P.g('earth'),c=C3('#b39d6c'),c2=C3('#8d7a52'),bw=d.bld.bermW,xf=bw.x1+1,xt=bw.x1-.8,xb=bw.x0-1;   /* backstop: a sand face toward the shooter, over its collider */
    g.quad([xf,0,zN-1],[xf,0,zS+1],[xt,4.6,zS+1],[xt,4.6,zN-1],[[0,0],[8,0],[8,1],[0,1]],[c2,c2,c,c],[1,1,0]);
    g.quad([xb,0,zS+1],[xb,0,zN-1],[xt,4.6,zN-1],[xt,4.6,zS+1],[[0,0],[8,0],[8,1],[0,1]],c2,[-1,1,0]);
    for(const z of[zN-1,zS+1])g.tri([xb,0,z],[xf,0,z],[xt,4.6,z],[[0,0],[1,0],[.5,1]],c2,[0,0,z<200?-1:1])}
  const DB=atlasSplit('dists',4,(x,w,h,i)=>{x.fillStyle=STY.yellow[0];x.fillRect(0,0,w,h);x.strokeStyle='#1a1a1a';x.lineWidth=6;x.strokeRect(5,5,w-10,h-10);x.fillStyle='#1a1a1a';x.font='900 72px '+UI_FONT;x.textAlign='center';x.textBaseline='middle';x.fillText(R.dists[i]+' m',w/2,h/2+3,w*.9)});
  const LB=atlasSplit('lanes',6,(x,w,h,i)=>{x.fillStyle='#f2efe6';x.fillRect(0,0,w,h);x.fillStyle='#1d2a3a';x.font='900 96px '+UI_FONT;x.textAlign='center';x.textBaseline='middle';x.fillText(''+(i+1),w/2,h/2+4)});
  R.dists.forEach((dist,di)=>{const x=line-Math.min(dist,98.5);P.box('mark',x-1.4,.01,zN+1.5,x+1.4,.025,zS-1.5,'#b8a27a');
    /* distance boards on the north berm */
    P.sign(x,2.9,zN+.35,1.2,1.1,Math.PI,DB[di]);P.cyl('paint',x,1.6,zN+.25,.05,.05,2.6,'#333',6)});
  /* lane lines: low white posts every 10 m between lanes */
  for(let i=0;i<=lanes.length;i++){const z=lanes[0]-2.2+i*4.4;for(let x=line-2;x>line-101;x-=10)P.box('paint',x-.05,0,z-.05,x+.05,.5,z+.05,COL.white)}
  /* the firing shed: posts, a sloped corrugated roof, benches, lane numbers on the beam */
  const s=R.shed,sx0=s.x0+.15,sx1=s.x1-.15,ROOF0=3.35,ROOF1=2.85;
  for(let z=s.z0+.3;z<=s.z1-.2;z+=4.6)for(const x of[sx0,sx1])P.box('metal',x-.1,0,z-.1,x+.1,x===sx0?ROOF1:ROOF0,z+.1,COL.olive);
  {const g=P.g('corr'),c=C3('#7f8a74');g.quad([sx0-.9,ROOF1,s.z0-.2],[sx1+.6,ROOF0,s.z0-.2],[sx1+.6,ROOF0,s.z1+.2],[sx0-.9,ROOF1,s.z1+.2],[[0,0],[4,0],[4,12],[0,12]],c,[0,1,0]);
    g.quad([sx0-.9,ROOF1-.06,s.z1+.2],[sx1+.6,ROOF0-.06,s.z1+.2],[sx1+.6,ROOF0-.06,s.z0-.2],[sx0-.9,ROOF1-.06,s.z0-.2],[[0,0],[4,0],[4,12],[0,12]],C3('#c9cfc2'),[0,-1,0])}
  P.box('metal',sx0-.15,ROOF1-.35,s.z0-.2,sx0+.15,ROOF1-.05,s.z1+.2,COL.olive);
  lanes.forEach((z,i)=>{for(const lx of[line+.6,line+1.4])for(const lz of[z-.7,z+.7])P.box('metal',lx-.04,0,lz-.04,lx+.04,.86,lz+.04,'#3a3d3a');   /* a shooting table on legs */
    P.box('paint',line+.45,.86,z-.85,line+1.55,.93,z+.85,'#b48d5f');P.box('paint',line+.5,.3,z-.75,line+1.5,.34,z+.75,'#7a5a3a');
    P.sign(sx0+.12,ROOF1-.2,z,.5,.6,-Math.PI/2,LB[i])});
  for(let z=s.z0+2;z<s.z1;z+=4.6)P.box('glow',(sx0+sx1)/2-.06,ROOF1+.12,z-1.2,(sx0+sx1)/2+.06,ROOF1+.18,z+1.2,'#fff4dc');   /* strip lights under the roof */
  P.box('paint',line,.005,s.z0,line+.18,.02,s.z1,COL.red);   /* the line */
  /* rules board, range flag */
  P.sign(sx1+.1,1.9,s.z0+1.5,2.6,1.6,-Math.PI/2,board('rules',['RANGE RULES','1. MUZZLE DOWNRANGE  2. FINGER OFF THE TRIGGER','3. NO "WATCH THIS"  4. HOT DOGS AFTER, NOT DURING'],2,2,'white',{top:.24}));
  P.cyl('metal',sx1+.6,3.3,s.z0-1.2,.06,.05,6.6,COL.white,6);
  P.quad('paint',[sx1+.6,6.4,s.z0-1.2],[sx1+.6,6.4,s.z0-3],[sx1+.6,5.3,s.z0-3],[sx1+.6,5.3,s.z0-1.2],COL.red);
  P.quad('paint',[sx1+.6,6.4,s.z0-3],[sx1+.6,6.4,s.z0-1.2],[sx1+.6,5.3,s.z0-1.2],[sx1+.6,5.3,s.z0-3],COL.red)}

/* ---------- parade square, flagpole base, reviewing stand, water tower, signs along the road ---------- */
function parade(P,d){const p=d.parade,x0=p.x0+1,x1=p.x1-1,z0=p.z0+1,z1=p.z1-1;
  for(let x=x0+4;x<x1-2;x+=4)P.box('mark',x-.06,.01,z0+2,x+.06,.02,z1-2,COL.white);
  P.box('mark',x0,.01,z0,x1,.02,z0+.15,COL.white);P.box('mark',x0,.01,z1-.15,x1,.02,z1,COL.white);
  const f=d.flag;P.box('concrete',f.x-1.2,0,f.z-1.2,f.x+1.2,.35,f.z+1.2,COL.conc);P.box('concrete',f.x-.8,.35,f.z-.8,f.x+.8,.6,f.z+.8,'#d4d0c6');
  P.cyl('metal',f.x,6.6,f.z,.11,.06,12.2,'#e8e8e6',10);P.geo('metal',new THREE.SphereGeometry(.18,10,8),M4(f.x,12.8,f.z),'#d8b34a');
  /* reviewing stand on the north edge */
  const sx=f.x,sz=z0+2.2;for(let i=0;i<3;i++)P.box('paint',sx-5,0,sz-i*.8-.8,sx+5,.45+i*.42,sz-i*.8,'#8b8f8a');
  P.box('metal',sx-5.2,2.4,sz-3.1,sx+5.2,2.55,sz+.2,COL.olive);for(const x of[sx-5,sx+5])P.cyl('metal',x,1.25,sz+.1,.06,.06,2.5,COL.steel,6);
  P.sign(sx,3.05,sz+.22,5.4,.9,Math.PI,board('pg',['PARADE GROUND','NO MARCHING IN FLIP-FLOPS'],2,1,'army'))}
function waterTower(P,d){const w=d.water,H=14,R=3.3;for(const[sx,sz]of[[-1,-1],[1,-1],[1,1],[-1,1]]){
    const bx=w.x+sx*2.6,bz=w.z+sz*2.6,tx=w.x+sx*1.7,tz=w.z+sz*1.7,L=Math.hypot(bx-tx,H,bz-tz);const leg=new THREE.CylinderGeometry(.16,.2,L,8);leg.translate(0,L/2,0);
    const o=new THREE.Object3D();o.position.set(bx,0,bz);o.lookAt(tx,H,tz);o.rotateX(Math.PI/2);o.updateMatrix();P.geo('metal',leg,o.matrix,'#a9aeae')}
  for(const y of[4.5,9])for(const[a,b]of[[[-1,-1],[1,-1]],[[1,-1],[1,1]],[[1,1],[-1,1]],[[-1,1],[-1,-1]]]){const k=2.6-(y/H)*.9;const ax=w.x+a[0]*k,az=w.z+a[1]*k,bx=w.x+b[0]*k,bz=w.z+b[1]*k;
    P.obox('metal',(ax+bx)/2,y,(az+bz)/2,Math.hypot(bx-ax,bz-az),.1,.1,Math.atan2(-(bz-az),bx-ax),'#9aa0a0')}
  P.cyl('metal',w.x,H+2.4,w.z,R,R,4.8,'#d9dcd8',24);P.geo('metal',new THREE.ConeGeometry(R+.2,1.6,24),M4(w.x,H+5.6,w.z),'#c4c8c4');
  P.cyl('metal',w.x,H+.1,w.z,R+.4,R+.4,.2,'#8f9494',24);P.cyl('metal',w.x,H+6.5,w.z,.05,.05,.8,COL.steel,6);
  /* the name on the tank: a curved band of quads */
  const r=atlasRect('wt',2,1,(x,W,Hh)=>{x.fillStyle='#d9dcd8';x.fillRect(0,0,W,Hh);x.fillStyle='#2e4a6b';x.font='900 92px '+UI_FONT;x.textAlign='center';x.textBaseline='middle';x.fillText('FORT SENSIBLE · HYDRATE',W/2,Hh/2+4,W*.95)});
  const N=10,a0=-Math.PI*.15,a1=-Math.PI*.85;for(let i=0;i<N;i++){const t0=i/N,t1=(i+1)/N,A0=a0+(a1-a0)*t0,A1=a0+(a1-a0)*t1,rr=R+.03;
    const p=(A,y)=>[w.x+Math.cos(A)*rr,y,w.z+Math.sin(A)*rr];P.g('sign'+r[4]).quad(p(A0,H+1.6),p(A1,H+1.6),p(A1,H+3.2),p(A0,H+3.2),[[r[0]+(r[2]-r[0])*t0,r[1]],[r[0]+(r[2]-r[0])*t1,r[1]],[r[0]+(r[2]-r[0])*t1,r[3]],[r[0]+(r[2]-r[0])*t0,r[3]]],null,[Math.cos((A0+A1)/2),0,Math.sin((A0+A1)/2)])}}
/* a post sign: two posts and a board */
function postSign(P,x,z,yaw,w,h,r,y0,col){y0=y0||1.1;const c=Math.cos(yaw),s=Math.sin(yaw);for(const u of[-.42,.42]){const px=x+c*u*w,pz=z-s*u*w;P.cyl('metal',px,(y0+h)/2,pz,.05,.05,y0+h,col||'#5b6066',6)}
  P.sign(x,y0+h/2,z,w,h,yaw,r,'#4b5055')}
const REGS=[['REGULATION 4','NO RUNNING. UNLESS SOMETHING IS ON FIRE.','NOTHING IS ON FIRE.'],['SPEED LIMIT 15','TANKS 5 · JETS: PLEASE BE REASONABLE'],
  ['QUIET HOURS 2200-0600','THE TANK COUNTS.'],['THIS POST HAS GONE','0 DAYS WITHOUT A DAD JOKE'],['TANK PARKING ONLY','VIOLATORS WILL BE FLATTENED'],
  ['LOST?','ASK A GUARD. LOST AND PROUD? SAME GUARD.'],['ALL PERSONNEL WASH HANDS','THAT MEANS YOU, SERGEANT.']];
function roadSigns(P,d){const r=d.road;/* along the main road, alternating sides */
  const spots=[[176,r.z0-.8,0],[132,r.z1+.8,Math.PI],[96,r.z0-.8,0],[60,r.z1+.8,Math.PI],[236,r.z1+.8,Math.PI],[28,r.z0-.8,0],[262,r.z0-.8,0]];
  REGS.forEach((l,i)=>{const s=spots[i%spots.length];postSign(P,s[0],s[1],s[2],3.2,1.15,board('reg'+i,l,2,1,i%3===0?'white':i%3===1?'army':'yellow'),1.2)})}

/* ---------- the gate: pillars, the arch over the road, the big entrance sign outside ---------- */
function gate(P,d){const g=d.gate,z=g.z,x0=g.x-g.w/2,x1=g.x+g.w/2;
  for(const x of[x0-.3,x1+.3]){P.box('brick',x-.7,0,z-.7,x+.7,3.2,z+.7,'#cf9f86',1.6);P.box('concrete',x-.82,3.2,z-.82,x+.82,3.45,z+.82,COL.conc)}
  P.box('metal',x0-.6,5.6,z-.18,x1+.6,6.1,z+.18,COL.olive);for(const x of[x0-.3,x1+.3])P.box('metal',x-.15,3.45,z-.15,x+.15,6.1,z+.15,COL.olive);
  P.sign(g.x,6.75,z-.2,9.6,1.3,0,board('gate',['FORT SENSIBLE','PUBLIC RANGE OPEN ON DAYS ENDING IN Y'],3,1,'army',{badge:true}));
  P.sign(g.x,6.75,z+.2,9.6,1.3,Math.PI,board('gate2',['DRIVE SAFE','YOUR FAMILY WANTS YOU HOME FOR DINNER'],3,1,'army'));
  /* entrance sign on a brick plinth, outside the fence, facing the road */
  const ex=g.x-9.5,ez=z-7;P.box('brick',ex-3.4,0,ez-.5,ex+3.4,.9,ez+.5,'#cf9f86',1.6);P.box('concrete',ex-3.5,.9,ez-.55,ex+3.5,1.05,ez+.55,COL.conc);
  P.sign(ex,2.05,ez-.04,6.4,1.9,Math.PI/2*0,board('ent',['FORT SENSIBLE','TRAINING POST · EST. WHENEVER','"WE CAN TURN THIS BASE AROUND"'],3,1,'navy',{badge:true,top:.27}));
  P.obox('paint',ex,2.05,ez,6.5,2,.12,0,'#2a2f36');
  /* speed bump and STOP line at the barrier */
  P.box('paint',g.x-3,0,d.barrier.z+1.3,g.x+3,.09,d.barrier.z+1.7,COL.yellow);P.box('mark',g.x-3,.012,d.barrier.z-1.6,g.x,.025,d.barrier.z-1.2,COL.white)}

/* ---------- runway, apron and taxi markings, edge lights, a windsock ---------- */
function airfield(P,d){const rw=d.runway,zc=rw.z,x0=rw.x0+2,x1=rw.x1-2,hw=(rw.z1-rw.z0)/2-.6,Y=.012,W='#eeeeea';
  P.box('mark',x0,Y,zc-hw,x1,Y+.01,zc-hw+.3,W);P.box('mark',x0,Y,zc+hw-.3,x1,Y+.01,zc+hw,W);
  for(let x=x0+28;x<x1-28;x+=12)P.box('mark',x,Y,zc-.2,x+6,Y+.01,zc+.2,W);
  for(const[e,dir]of[[x0,1],[x1,-1]]){for(let k=-3;k<=3;k++){if(!k)continue;const z=zc+k*1.6;P.box('mark',Math.min(e+dir*1,e+dir*9),Y,z-.45,Math.max(e+dir*1,e+dir*9),Y+.01,z+.45,W)}
    P.box('mark',Math.min(e+dir*38,e+dir*46),Y,zc-hw+1.2,Math.max(e+dir*38,e+dir*46),Y+.01,zc-hw+2.6,W);P.box('mark',Math.min(e+dir*38,e+dir*46),Y,zc+hw-2.6,Math.max(e+dir*38,e+dir*46),Y+.01,zc+hw-1.2,W)}
  /* runway numbers: 27 at the east end (you take off west), 09 at the west end */
  const num=(t,x,yaw)=>{const r=atlasRect('rw'+t,1,1,(c,w,h)=>{c.fillStyle='#2f3133';c.fillRect(0,0,w,h);c.fillStyle=W;c.font='900 120px '+UI_FONT;c.textAlign='center';c.textBaseline='middle';c.fillText(t,w/2,h/2+6,w*.9)});
    const c=Math.cos(yaw),s=Math.sin(yaw),p=(u,v)=>[x-c*u*2.2+s*v*4.5,Y+.012,zc+s*u*2.2+c*v*4.5];P.g('sign'+r[4]).quad(p(-1,1),p(1,1),p(1,-1),p(-1,-1),[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]],null,[0,1,0])};
  num('27',x1-17,-Math.PI/2);num('09',x0+17,Math.PI/2);
  /* edge lights every 20 m, and threshold lights */
  for(let x=x0;x<=x1;x+=20)for(const z of[zc-hw-.6,zc+hw+.6]){P.box('metal',x-.08,0,z-.08,x+.08,.25,z+.08,'#444');P.box('glow',x-.1,.25,z-.1,x+.1,.38,z+.1,'#fff2c8')}
  for(let k=-3;k<=3;k++){P.box('glow',x0-1.2,.05,zc+k*1.6-.12,x0-.9,.25,zc+k*1.6+.12,'#ff4a3a');P.box('glow',x1+.9,.05,zc+k*1.6-.12,x1+1.2,.25,zc+k*1.6+.12,'#4aff7a')}
  /* apron: a yellow lead-in line to the jet's spot, a parking T, hangar door line */
  const a=d.apron,j=d.jet;P.box('mark',a.x0+3,Y,j.z-.12,j.x+5,Y+.01,j.z+.12,COL.yellow);P.box('mark',j.x+5,Y,j.z-2,j.x+5.3,Y+.01,j.z+2,COL.yellow);
  P.box('mark',j.x-10,Y,j.z-.12,j.x-6,Y+.01,j.z+.12,COL.yellow);
  P.g('mark').quad([j.x-6,Y,j.z-.12],[j.x-6,Y,j.z+.12],[j.x-14,Y,rw.z1-1],[j.x-14.3,Y,rw.z1-1],[[0,0],[1,0],[1,1],[0,1]],C3(COL.yellow),[0,1,0]);
  P.box('mark',a.x0+.5,Y,a.z0+1,a.x1-.5,Y+.01,a.z0+1.2,COL.yellow);
  /* windsock on the north side, mid-runway */
  const wx=(x0+x1)/2,wz=rw.z0-3;P.cyl('metal',wx,3,wz,.06,.05,6,COL.white,6);
  P.sign(rw.x1-26,1.3,rw.z0-1.2,2.2,.9,Math.PI*0,board('rwy',['RWY 27','← THAT WAY'],1,1,'red'));P.cyl('paint',rw.x1-26,.45,rw.z0-1.15,.05,.05,.9,'#333',6)}

/* ---------- the Route 9 sign at Industrial Way, and one at the tree line ---------- */
function r9Sign(P,d,which){if(which!=='tl'){/* on the south shoulder of Route 9, east of Industrial Way, facing traffic from the north-west */
  const x=209.6,z=50.6;for(const u of[-1.6,1.6])P.cyl('metal',x+u,2.3,z,.08,.08,4.6,'#7d8287',8);
  const r=board('r9',['FORT SENSIBLE  ↓','PUBLIC RANGE · INDUSTRIAL WAY · 0.3 MI'],3,1,'green',{badge:true});P.sign(x,3.6,z-.06,5.6,1.6,0,r);P.obox('metal',x,3.6,z,5.7,1.7,.08,0,'#55595e');
  const r2=board('r9b',['FORT SENSIBLE','PUBLIC RANGE · OPEN'],2,1,'brown');P.sign(x,3.6,z+.06,5.6,1.6,Math.PI,r2)}
  /* at the tree line on Industrial Way */
  if(which!=='r9')postSign(P,197.2,160.4,-Math.PI/2*0,3,1.2,board('tl',['FORT SENSIBLE  ↓','ALL VISITORS STOP AT THE GATE','(HE IS VERY NICE)'],2,1,'brown'),1)}

/* register the cull units (before the world is built: this file loads before index.html's main script) */
function addPieces(){const O=OWm();if(!O||!O.addSetpiece){setTimeout(addPieces,0);return}
  const unit=(id,box,fn,r)=>O.addSetpiece({id,r,box:()=>box,build(ws,u){const d=ws.def.base;if(!d||!GBc())return;const P=painter();fn(P,d);P.flush(u.group)}});
  unit('base_range',{x0:6,z0:186,x1:132,z1:230,y1:8},(P,d)=>{range(P,d);rangeOffice(P,d.bld.range)},150);
  unit('base_mid',{x0:118,z0:164,x1:204,z1:224,y1:22},(P,d)=>{barracks(P,d.bld.barracks1,'BARRACKS A');barracks(P,d.bld.barracks2,'BARRACKS B');parade(P,d);waterTower(P,d);roadSigns(P,d)},160);
  unit('base_east',{x0:180,z0:158,x1:282,z1:232,y1:14},(P,d)=>{gate(P,d);gatehouse(P,d.bld.gate);tower(P,d.bld.tower);hangar(P,d.bld.hangar);motorPool(P,d.motor)},150);
  unit('base_air',{x0:8,z0:226,x1:282,z1:248,y1:7},(P,d)=>airfield(P,d),120);
  /* two small units, not one long box from Route 9 to the tree line (a long box counts as near from half of town) */
  unit('base_r9',{x0:204,z0:46,x1:216,z1:56,y1:7},(P,d)=>r9Sign(P,d,'r9'),130);unit('base_tl',{x0:192,z0:155,x1:203,z1:166,y1:6},(P,d)=>r9Sign(P,d,'tl'),110)}
addPieces();

/* ================= the post's rules (index.html asks these) and a tiny hook bus for js/range.js, js/tank.js, js/jet.js, js/eggs.js ================= */
const HOOKS={interact:[]};
/* Base.on('interact', fn(prompt,dt)) -> null | 'text' | {txt,fn,key?} | {txt,hold,fn}: the first answer wins (index.html updHub, roamPrompt) */
Base.on=(h,fn)=>{(HOOKS[h]||(HOOKS[h]=[])).push(fn);return()=>{const a=HOOKS[h],k=a.indexOf(fn);if(k>=0)a.splice(k,1)}};
/* audit C-2: Base.reset() runs every 'reset' hook (jet, tank, range): index.html clearChars calls it on quit to title, new game / continue,
   job start, going home and the free-roam tow, so no vehicle or range state outlives the session it belongs to */
Base.reset=()=>{for(const fn of (HOOKS.reset||[]))try{fn()}catch(e){console.warn('[base] reset',e)}};
Base.interact=(prompt,dt)=>{for(const fn of HOOKS.interact){let r=null;try{r=fn(prompt,dt)}catch(e){console.warn('[base] interact',e)}if(r)return r}return null};
/* the training areas: the range compound (firing line, lanes, range control). The rest of the post is a gun-free zone like Maple */
Base.rangeBox=()=>{const d=Base.def();if(!d)return null;const R=d.range;return{x0:R.box.x0+2,z0:R.box.z0-2,x1:d.bld.range.x1+3,z1:R.box.z1+2}};
Base.armOk=(x,z)=>{const b=Base.rangeBox();return !!b&&x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1};
/* audit W-05: no grass tufts on Hangar 2's floor (js/openworld.js chunk tufts ask this) */
Base.noTuft=(x,z)=>{const d=Base.def();if(!d||!d.bld||!d.bld.hangar)return false;const h=d.bld.hangar;return x>h.x0-.2&&x<h.x1+.2&&z>h.z0-.2&&z<h.z1+.3};
Base.inBase=(x,z)=>{const d=Base.def();if(!d)return false;const f=d.fence;return x>=f.x0-4&&x<=f.x1+4&&z>=f.z0-6&&z<=f.z1+4};
Base.onLine=(x,z)=>{const d=Base.def();if(!d)return false;const b=d.range.line0;return x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1};
const pickL=a=>a[Math.floor(Math.random()*a.length)];
const LINES={draw:["Range only. The guard has a whistle and he is not afraid to use it.","Not here. Guns come out on the firing line. That's the whole point of a firing line.","Holster stays on until the range. Rules are rules. Even the dumb ones. This one's not dumb."],
  left:["Holstering. Leaving the range.","Gun's away. Range rules.","Holstered. Sgt. Pruitt is watching. He's always watching."]};
Base.line=(k,x,z)=>k==='left'?pickL(LINES.left):Base.inBase(x,z)?pickL(LINES.draw):null;
Base.pick=pickL;Base.LINES=LINES;

/* the post's people and the range run in js/range.js; the tank js/tank.js; the jet js/jet.js; easter eggs js/eggs.js */
})();
