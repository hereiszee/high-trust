/* High Trust: world dressing. Ground surfaces, mission walls and interiors, street furniture, yards, backdrop.
   Everything here is visual: colliders and line-of-sight still come from the tile grid in index.html.
   Static geometry is merged per material into a few large meshes per level; repeated models are instanced in spatial chunks. */
(function(){
'use strict';
window.HT=window.HT||{};
const W={};let C=null;
const TILE=2,ROADY=-.12,WALLH=3.2;
const lin=c=>new THREE.Color(c).convertSRGBToLinear();

/* ---------- small utilities ---------- */
function rngOf(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function h2(x,z){let h=Math.imul(x|0,374761393)+Math.imul(z|0,668265263);h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296}
function vnoise(x,z){const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf);
  const a=h2(xi,zi),b=h2(xi+1,zi),c=h2(xi,zi+1),d=h2(xi+1,zi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,z){return vnoise(x,z)*.55+vnoise(x*2.1+17,z*2.1+5)*.3+vnoise(x*4.3+41,z*4.3+29)*.15}
const sstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};

/* ---------- geometry builder: world-space quads merged into one BufferGeometry ---------- */
class GB{
  constructor(){this.P=[];this.N=[];this.U=[];this.K=[];this.I=[];this.n=0}
  /* a,b,c,d: corners in order around the quad; uv: 4 [u,v]; col: one [r,g,b] or 4 of them; nrm: wanted facing */
  quad(a,b,c,d,uv,col,nrm,flatN){
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    let n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];const l=Math.hypot(n[0],n[1],n[2])||1;n=n.map(v=>v/l);
    let flip=false;if(nrm&&n[0]*nrm[0]+n[1]*nrm[1]+n[2]*nrm[2]<0){flip=true;n=n.map(v=>-v)}
    const nn=flatN||n,cs=col&&Array.isArray(col[0])?col:[col||[1,1,1],col||[1,1,1],col||[1,1,1],col||[1,1,1]];
    const i0=this.n;[a,b,c,d].forEach((p,k)=>{this.P.push(p[0],p[1],p[2]);this.N.push(nn[0],nn[1],nn[2]);this.U.push(uv[k][0],uv[k][1]);this.K.push(cs[k][0],cs[k][1],cs[k][2]);this.n++});
    if(flip)this.I.push(i0,i0+2,i0+1,i0,i0+3,i0+2);else this.I.push(i0,i0+1,i0+2,i0,i0+2,i0+3)}
  tri(a,b,c,uv,col,nrm){const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    let n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];const l=Math.hypot(...n)||1;n=n.map(v=>v/l);
    let flip=false;if(nrm&&n[0]*nrm[0]+n[1]*nrm[1]+n[2]*nrm[2]<0){flip=true;n=n.map(v=>-v)}const k=col||[1,1,1];
    const i0=this.n;[a,b,c].forEach((p,j)=>{this.P.push(...p);this.N.push(...n);this.U.push(...uv[j]);this.K.push(...k);this.n++});
    if(flip)this.I.push(i0,i0+2,i0+1);else this.I.push(i0,i0+1,i0+2)}
  /* horizontal quad, world UVs */
  floor(x0,z0,x1,z1,y,mpr,colFn,down){const c=colFn?[colFn(x0,z0),colFn(x0,z1),colFn(x1,z1),colFn(x1,z0)]:null;
    this.quad([x0,y,z0],[x0,y,z1],[x1,y,z1],[x1,y,z0],[[x0/mpr,z0/mpr],[x0/mpr,z1/mpr],[x1/mpr,z1/mpr],[x1/mpr,z0/mpr]],c,[0,down?-1:1,0])}
  /* vertical quad facing +/-z at z, spanning x0..x1, y0..y1 */
  wz(x0,x1,y0,y1,z,nz,mpr,col,uo=0,vo=0){this.quad([x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z],[[(x0+uo)/mpr*nz,(y0+vo)/mpr],[(x1+uo)/mpr*nz,(y0+vo)/mpr],[(x1+uo)/mpr*nz,(y1+vo)/mpr],[(x0+uo)/mpr*nz,(y1+vo)/mpr]],col,[0,0,nz])}
  /* vertical quad facing +/-x at x, spanning z0..z1 */
  wx(z0,z1,y0,y1,x,nx,mpr,col,uo=0,vo=0){this.quad([x,y0,z0],[x,y0,z1],[x,y1,z1],[x,y1,z0],[[-(z0+uo)/mpr*nx,(y0+vo)/mpr],[-(z1+uo)/mpr*nx,(y0+vo)/mpr],[-(z1+uo)/mpr*nx,(y1+vo)/mpr],[-(z0+uo)/mpr*nx,(y1+vo)/mpr]],col,[nx,0,0])}
  /* axis-aligned box with world UVs; skip: {top,bottom,px,nx,pz,nz} */
  box(x0,y0,z0,x1,y1,z1,mpr,col,skip={}){
    if(!skip.top)this.floor(x0,z0,x1,z1,y1,mpr,col?()=>col:null);
    if(!skip.bottom&&skip.bottom!==undefined)this.floor(x0,z0,x1,z1,y0,mpr,col?()=>col:null,true);
    if(!skip.pz)this.wz(x0,x1,y0,y1,z1,1,mpr,col);if(!skip.nz)this.wz(x0,x1,y0,y1,z0,-1,mpr,col);
    if(!skip.px)this.wx(z0,z1,y0,y1,x1,1,mpr,col);if(!skip.nx)this.wx(z0,z1,y0,y1,x0,-1,mpr,col)}
  /* box along an arbitrary horizontal direction (for fences, beams); centre c, half sizes, yaw */
  obox(cx,cy,cz,hx,hy,hz,yaw,mpr,col){const s=Math.sin(yaw),c=Math.cos(yaw);const P=(x,y,z)=>[cx+x*c+z*s,cy+y,cz-x*s+z*c];
    const v=[P(-hx,-hy,-hz),P(hx,-hy,-hz),P(hx,-hy,hz),P(-hx,-hy,hz),P(-hx,hy,-hz),P(hx,hy,-hz),P(hx,hy,hz),P(-hx,hy,hz)];
    const L=2*hx/mpr,Hh=2*hy/mpr,D=2*hz/mpr;
    this.quad(v[4],v[7],v[6],v[5],[[0,0],[0,D],[L,D],[L,0]],col,[0,1,0]);
    this.quad(v[3],v[2],v[6],v[7],[[0,0],[L,0],[L,Hh],[0,Hh]],col,[s,0,c]);
    this.quad(v[1],v[0],v[4],v[5],[[0,0],[L,0],[L,Hh],[0,Hh]],col,[-s,0,-c]);
    this.quad(v[2],v[1],v[5],v[6],[[0,0],[D,0],[D,Hh],[0,Hh]],col,[c,0,-s]);
    this.quad(v[0],v[3],v[7],v[4],[[0,0],[D,0],[D,Hh],[0,Hh]],col,[-c,0,s])}
  /* append another geometry (indexed or not) transformed by matrix m */
  addGeo(g,m,uvScale=1,col){const p=g.attributes.position,nm=g.attributes.normal,uv=g.attributes.uv,idx=g.index;const v=new THREE.Vector3(),n=new THREE.Vector3(),nmx=new THREE.Matrix3().getNormalMatrix(m);const i0=this.n;const k=col||[1,1,1];
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);this.P.push(v.x,v.y,v.z);if(nm){n.fromBufferAttribute(nm,i).applyMatrix3(nmx).normalize();this.N.push(n.x,n.y,n.z)}else this.N.push(0,1,0);
      this.U.push(uv?uv.getX(i)*uvScale:0,uv?uv.getY(i)*uvScale:0);this.K.push(k[0],k[1],k[2]);this.n++}
    if(idx)for(let i=0;i<idx.count;i++)this.I.push(i0+idx.getX(i));else for(let i=0;i<p.count;i++)this.I.push(i0+i)}
  geo(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.N,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(this.U,2));g.setAttribute('color',new THREE.Float32BufferAttribute(this.K,3));
    g.setIndex(this.n>65535?new THREE.Uint32BufferAttribute(this.I,1):new THREE.Uint16BufferAttribute(this.I,1));g.computeBoundingSphere();g.computeBoundingBox();return g}
}

/* ---------- canvas textures (generated once) ---------- */
const CT={};
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function ctex(c,srgb=true,rep=false){const t=new THREE.CanvasTexture(c);if(srgb)t.encoding=THREE.sRGBEncoding;t.anisotropy=8;if(rep)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}
function grassTex(flowers){const key=flowers?'flowers':'blades';if(CT[key])return CT[key];const S=256;const c=canvas(S,S),x=c.getContext('2d'),mk=canvas(S,S),m=mk.getContext('2d');const r=rngOf(flowers?7:3);
  x.fillStyle=flowers?'#5d7e33':'#58792f';x.fillRect(0,0,S,S);m.fillStyle='#000';m.fillRect(0,0,S,S);m.fillStyle='#fff';
  for(let i=0;i<(flowers?60:110);i++){const bx=r()*236+10,h=90+r()*160,w=1.6+r()*2.4,lean=(r()-.5)*80;
    const g=x.createLinearGradient(0,S,0,S-h);const dry=r()<.2;
    g.addColorStop(0,'#4a6a27');g.addColorStop(.5,dry?'#97934e':'#6b8e36');g.addColorStop(1,dry?'#c7bb74':'#a5c062');
    const path=ctx=>{ctx.beginPath();ctx.moveTo(bx-w,S);ctx.quadraticCurveTo(bx-w*.4+lean*.3,S-h*.55,bx+lean,S-h);ctx.quadraticCurveTo(bx+w*.4+lean*.3,S-h*.55,bx+w,S);ctx.fill()};
    x.fillStyle=g;path(x);path(m)}
  if(flowers){const cols=['#f4f0e6','#f2d24a','#b46fd1','#e8706a','#f6f6f6'];for(let i=0;i<26;i++){const fx=r()*230+13,fy=40+r()*110,col=cols[i%cols.length];
      for(let p=0;p<5;p++){const a=p/5*6.283+r();x.fillStyle=col;for(const ctx of[x,m]){if(ctx===m)ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(fx+Math.cos(a)*5,fy+Math.sin(a)*5,4.2,0,6.283);ctx.fill()}}x.fillStyle='#e0a020';x.beginPath();x.arc(fx,fy,3,0,6.283);x.fill()}}
  const cd=x.getImageData(0,0,S,S).data,md=m.getImageData(0,0,S,S).data,out=new Uint8Array(S*S*4);
  for(let yy=0;yy<S;yy++)for(let xx=0;xx<S;xx++){const si=(yy*S+xx)*4,di=((S-1-yy)*S+xx)*4;out[di]=cd[si];out[di+1]=cd[si+1];out[di+2]=cd[si+2];out[di+3]=md[si]}
  const t=new THREE.DataTexture(out,S,S,THREE.RGBAFormat);t.encoding=THREE.sRGBEncoding;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=4;t.needsUpdate=true;return CT[key]=t}
function wornTex(){if(CT.worn)return CT.worn;const c=canvas(256,256),x=c.getContext('2d');const r=rngOf(11);x.fillStyle='#fff';x.fillRect(0,0,256,256);
  for(let i=0;i<1400;i++){const px=r()*256,py=r()*256,s=r()*r()*3.2+.4;x.fillStyle=`rgba(0,0,0,${.2+r()*.5})`;for(const ox of[-256,0,256])for(const oy of[-256,0,256]){x.beginPath();x.arc(px+ox,py+oy,s,0,6.283);x.fill()}}
  return CT.worn=ctex(c,false,true)}
/* floor grime atlas (2x2): oil stain, dirt smear, cracks, water ring */
function floorDecalTex(){if(CT.floor)return CT.floor;const c=canvas(1024,1024),x=c.getContext('2d');const r=rngOf(21);
  const blob=(cx,cy,R,col,n,a)=>{for(let i=0;i<n;i++){const ang=r()*6.283,d=r()*R*.6,rr=R*(.25+r()*.5);const g=x.createRadialGradient(cx+Math.cos(ang)*d,cy+Math.sin(ang)*d,0,cx+Math.cos(ang)*d,cy+Math.sin(ang)*d,rr);g.addColorStop(0,`rgba(${col},${a})`);g.addColorStop(1,`rgba(${col},0)`);x.fillStyle=g;x.fillRect(cx-R*1.5,cy-R*1.5,R*3,R*3)}};
  blob(256,256,190,'12,10,8',40,.16);blob(256,256,90,'5,4,3',14,.2);
  blob(768,256,200,'60,45,30',50,.07);
  x.strokeStyle='rgba(10,9,8,.85)';for(let k=0;k<5;k++){let px=520+r()*60,py=540+r()*420;x.lineWidth=2.5;x.beginPath();x.moveTo(px,py);for(let s=0;s<26;s++){px+=10+r()*14;py+=(r()-.5)*28;x.lineTo(px,py);if(r()<.15){x.stroke();x.lineWidth=1.2;x.beginPath();x.moveTo(px,py)}}x.stroke()}
  for(let i=0;i<3;i++){x.strokeStyle=`rgba(40,32,22,${.25+r()*.2})`;x.lineWidth=6+r()*10;x.beginPath();x.arc(768+(r()-.5)*80,768+(r()-.5)*80,90+r()*90,0,6.283);x.stroke()}
  blob(768,768,150,'40,32,22',20,.05);
  return CT.floor=ctex(c)}
function puddleTex(){if(CT.puddle)return CT.puddle;const c=canvas(256,256),x=c.getContext('2d');const r=rngOf(5);
  for(let i=0;i<14;i++){const g=x.createRadialGradient(128+(r()-.5)*90,128+(r()-.5)*60,0,128+(r()-.5)*90,128+(r()-.5)*60,30+r()*60);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.7,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,256,256)}
  return CT.puddle=ctex(c,false)}
const TAGS=[['BIRCH','#d84a3a','#f2c84a'],['KINGZ','#3a7bd8','#9fe0ff'],['PPK','#7ad83a','#e8ff9f'],['NO SNITCH','#d83aa8','#ffd0f2'],['RIDGE','#f2a03a','#fff0b0'],['SK8','#3ad8c8','#d0fff8']];
function graffitiTex(){if(CT.graf)return CT.graf;const c=canvas(1024,1024),x=c.getContext('2d');const r=rngOf(31);
  TAGS.slice(0,4).forEach(([t,fill,hi],i)=>{const cx=(i%2)*512+256,cy=Math.floor(i/2)*512+256;x.save();x.translate(cx,cy);x.rotate((r()-.5)*.25);
    const fs=t.length>5?92:150;x.font=`900 ${fs}px Impact, "Arial Black", sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';
    x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=14;x.lineWidth=fs*.22;x.strokeStyle='#141414';x.strokeText(t,0,0);x.shadowBlur=0;
    const g=x.createLinearGradient(0,-fs/2,0,fs/2);g.addColorStop(0,hi);g.addColorStop(.55,fill);g.addColorStop(1,fill);x.fillStyle=g;x.fillText(t,0,0);
    x.lineWidth=3;x.strokeStyle='rgba(255,255,255,.75)';x.strokeText(t,-3,-3);
    x.strokeStyle=fill;x.lineWidth=3;for(let d=0;d<7;d++){const dx=(r()-.5)*fs*t.length*.5,len=20+r()*70;x.beginPath();x.moveTo(dx,fs*.35);x.lineTo(dx,fs*.35+len);x.stroke();x.beginPath();x.arc(dx,fs*.35+len,3,0,6.283);x.fillStyle=fill;x.fill()}
    x.restore()});
  return CT.graf=ctex(c)}
function posterTex(){if(CT.post)return CT.post;const c=canvas(1024,1024),x=c.getContext('2d');const r=rngOf(41);
  const P=[{bg:'#f3eedc',t:['LOST DOG','BISCUIT','Beagle mix · answers to "Biscuit"','REWARD · 555-0142'],ph:1},{bg:'#e9d25a',t:['GARAGE','SALE','SAT 8AM · 14 MAPLE ST','tools · bikes · crib'],ph:0},
    {bg:'#202326',t:['THE','MULCHERS','live · Elks Lodge · Fri','$5 at the door'],ph:0,fg:'#f1e3c4'},{bg:'#f6f6f2',t:['WE BUY','HOUSES','ANY CONDITION · CASH','call today'],ph:0,fg:'#b8281e'}];
  P.forEach((p,i)=>{const ox=(i%2)*512,oy=Math.floor(i/2)*512;x.save();x.translate(ox,oy);
    x.fillStyle=p.bg;x.beginPath();x.moveTo(40,30);x.lineTo(470,22);x.lineTo(476,490);x.lineTo(60,486);x.lineTo(34,440);x.closePath();x.fill();
    x.fillStyle=p.fg||'#1b1b1b';x.textAlign='center';x.font='900 64px Impact, "Arial Black", sans-serif';x.fillText(p.t[0],256,110);x.font='900 78px Impact, "Arial Black", sans-serif';x.fillText(p.t[1],256,p.ph?190:200);
    if(p.ph){x.fillStyle='#6b6b6b';x.fillRect(146,215,220,150);x.fillStyle='#4a4a4a';x.beginPath();x.ellipse(256,300,70,50,0,0,6.283);x.fill()}
    x.fillStyle=p.fg||'#1b1b1b';x.font='600 26px Arial, sans-serif';x.fillText(p.t[2],256,p.ph?405:300);x.font='800 30px Arial, sans-serif';x.fillText(p.t[3],256,p.ph?445:350);
    for(let k=0;k<120;k++){x.fillStyle=`rgba(90,70,30,${r()*.08})`;x.beginPath();x.arc(40+r()*430,30+r()*450,r()*30,0,6.283);x.fill()}
    x.fillStyle='#bdbdbd';for(const[px,py]of[[60,46],[452,40]]){x.beginPath();x.arc(px,py,7,0,6.283);x.fill()}
    x.restore()});
  return CT.post=ctex(c)}
function cardboardTex(){if(CT.card)return CT.card;const c=canvas(512,512),x=c.getContext('2d');const r=rngOf(51);x.fillStyle='#b48a58';x.fillRect(0,0,512,512);
  for(let i=0;i<3000;i++){x.fillStyle=`rgba(${r()<.5?'90,60,30':'230,200,150'},${r()*.08})`;x.fillRect(r()*512,r()*512,r()*20,r()*2+1)}
  x.fillStyle='rgba(205,170,110,.85)';x.fillRect(0,226,512,60);x.fillStyle='rgba(255,255,255,.18)';x.fillRect(0,232,512,8);
  x.fillStyle='#f4f2ea';x.fillRect(300,330,170,120);x.fillStyle='#222';for(let i=0;i<34;i++){x.fillRect(312+i*4.4,400,r()<.5?2:3,38)}x.font='bold 15px Arial';x.fillText('SHIP TO: MAPLE HTS',310,356);x.fillText('PRIORITY  1 OF 1',310,380);
  x.strokeStyle='rgba(60,40,20,.35)';x.lineWidth=3;x.strokeRect(2,2,508,508);return CT.card=ctex(c)}
function mattressTex(){if(CT.matt)return CT.matt;const c=canvas(512,512),x=c.getContext('2d');const r=rngOf(61);x.fillStyle='#dcd6c6';x.fillRect(0,0,512,512);
  x.strokeStyle='rgba(120,110,95,.45)';x.lineWidth=2;for(let i=-512;i<1024;i+=46){x.beginPath();x.moveTo(i,0);x.lineTo(i+512,512);x.stroke();x.beginPath();x.moveTo(i,512);x.lineTo(i+512,0);x.stroke()}
  for(let i=0;i<7;i++){const cx=r()*512,cy=r()*512,R=30+r()*90;const g=x.createRadialGradient(cx,cy,0,cx,cy,R);g.addColorStop(0,'rgba(150,110,40,.35)');g.addColorStop(.8,'rgba(150,110,40,.22)');g.addColorStop(1,'rgba(120,90,30,0)');x.fillStyle=g;x.fillRect(0,0,512,512)}
  return CT.matt=ctex(c)}
const STREETS=['MAPLE ST','BIRCH ST','RIDGEVIEW DR','ELM AVE','LINDEN AVE','INDUSTRIAL WAY'];
function signTex(){if(CT.sign)return CT.sign;const c=canvas(512,1024),x=c.getContext('2d');
  STREETS.forEach((s,i)=>{const y=i*128;x.fillStyle='#1d6b3c';x.fillRect(0,y,512,128);x.strokeStyle='#f2f2ee';x.lineWidth=6;x.strokeRect(8,y+8,496,112);
    x.fillStyle='#f6f6f2';x.font='bold 70px "Arial Narrow", Arial, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(s,256,y+68,470)});
  /* stop sign in the last two rows */
  const y=768,cx=128,cy=y+128;x.fillStyle='#f2f2ee';x.beginPath();for(let k=0;k<8;k++){const a=k/8*6.283+Math.PI/8;x.lineTo(cx+Math.cos(a)*124,cy+Math.sin(a)*124)}x.fill();
  x.fillStyle='#b8231c';x.beginPath();for(let k=0;k<8;k++){const a=k/8*6.283+Math.PI/8;x.lineTo(cx+Math.cos(a)*112,cy+Math.sin(a)*112)}x.fill();
  x.fillStyle='#fff';x.font='bold 66px Arial, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('STOP',cx,cy+3);
  x.fillStyle='#8a8d91';x.fillRect(256,768,256,256);
  return CT.sign=ctex(c)}
function manholeTex(){if(CT.mh)return CT.mh;const c=canvas(256,256),x=c.getContext('2d');x.fillStyle='#2b2a28';x.beginPath();x.arc(128,128,124,0,6.283);x.fill();
  x.strokeStyle='#4a4743';x.lineWidth=6;x.beginPath();x.arc(128,128,112,0,6.283);x.stroke();x.lineWidth=4;for(let i=-100;i<=100;i+=18){x.beginPath();x.moveTo(128+i,30);x.lineTo(128+i,226);x.stroke()}
  x.fillStyle='#2b2a28';x.fillRect(60,108,136,40);x.fillStyle='#5a5650';x.font='bold 26px Arial';x.textAlign='center';x.fillText('SEWER',128,138);
  return CT.mh=ctex(c)}
function drainTex(){if(CT.drain)return CT.drain;const c=canvas(256,128),x=c.getContext('2d');x.fillStyle='#3a3936';x.fillRect(0,0,256,128);x.fillStyle='#090909';for(let i=0;i<12;i++)x.fillRect(14+i*20,14,10,100);
  return CT.drain=ctex(c)}

/* ---------- materials ---------- */
const MC={};
function avgColor(tex){if(tex.userData&&tex.userData.avg)return tex.userData.avg;let v=new THREE.Vector3(.5,.5,.5);
  try{const img=tex.image;const c=canvas(4,4),x=c.getContext('2d');x.drawImage(img,0,0,4,4);const d=x.getImageData(0,0,4,4).data;let r=0,g=0,b=0;for(let i=0;i<64;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2]}v.set(r/16/255,g/16/255,b/16/255)}catch(e){}
  tex.userData=tex.userData||{};tex.userData.avg=v;return v}
/* anti-tiling: the same texture sampled at two much larger, rotated scales modulates the base sample */
function addMacro(m,map,k){const avg=avgColor(map);m.onBeforeCompile=sh=>{sh.uniforms.uMacroAvg={value:avg};sh.uniforms.uMacroK={value:k};
  sh.fragmentShader='uniform vec3 uMacroAvg;uniform float uMacroK;\n'+sh.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
  vec4 texelColor=texture2D(map,vUv);
  vec2 mu=vUv*.093+vec2(.31,.73);mu=vec2(mu.x*.8-mu.y*.6,mu.x*.6+mu.y*.8);
  vec3 mc=(texture2D(map,mu).rgb+texture2D(map,vUv*.027+vec2(.5,.2)).rgb)*.5;
  texelColor.rgb*=mix(vec3(1.),clamp(mc/max(uMacroAvg,vec3(.02)),.55,1.6),uMacroK);
  texelColor=mapTexelToLinear(texelColor);diffuseColor*=texelColor;
#endif`)};m.customProgramCacheKey=()=>'htmacro'}
function surf(key,name,o={}){const s=C.ASSETS.tex(name);const ck=key+(s?'+':'-');if(MC[ck])return MC[ck];
  const m=new THREE.MeshStandardMaterial({color:lin(s?(o.color||'#ffffff'):(o.fallback||'#888888')),roughness:s?(o.rough??1):(o.frough??.9),metalness:o.metal||0,vertexColors:o.vcol!==false});
  if(s){m.map=s.map;if(s.normalMap){m.normalMap=s.normalMap;m.normalScale.set(o.ns??1,-(o.ns??1))}if(s.roughnessMap)m.roughnessMap=s.roughnessMap;if(o.macro!==0)addMacro(m,s.map,o.macro??.55)}
  if(o.po){m.polygonOffset=true;m.polygonOffsetFactor=-o.po;m.polygonOffsetUnits=-o.po*2}
  if(o.side!=null)m.side=o.side;if(o.envI!=null)m.envMapIntensity=o.envI;
  return MC[ck]=m}
function plain(key,hex,o={}){if(MC[key])return MC[key];const m=new THREE.MeshStandardMaterial({color:lin(hex),roughness:o.rough??.8,metalness:o.metal||0,vertexColors:!!o.vcol});
  if(o.po){m.polygonOffset=true;m.polygonOffsetFactor=-o.po;m.polygonOffsetUnits=-o.po*2}if(o.side!=null)m.side=o.side;if(o.map)m.map=o.map;if(o.alphaTest){m.alphaTest=o.alphaTest}if(o.transparent){m.transparent=true;m.depthWrite=false;m.opacity=o.opacity??1}if(o.alphaMap)m.alphaMap=o.alphaMap;if(o.envI!=null)m.envMapIntensity=o.envI;return MC[key]=m}
function decalMat(key,map,o={}){if(MC[key])return MC[key];const m=new THREE.MeshStandardMaterial({map,color:lin(o.color||'#ffffff'),transparent:true,depthWrite:false,roughness:o.rough??.95,metalness:0,polygonOffset:true,polygonOffsetFactor:-(o.po||2),polygonOffsetUnits:-(o.po||2)*2});if(o.vcol)m.vertexColors=true;return MC[key]=m}
/* per-level surface definitions: key -> material factory */
const LEVEL_STYLE={
  hub:{},
  gary:{ext:['metal',2.2,'#d2cec6'],int:['paintwall',2.6,'#b9b6a8'],floor:['concfloor',3,'#b8b4aa'],lot:'#9c9890',joist:'#6d6a66',lamp:'industrial'},
  rick:{ext:['brick',1.1,'#d8c8bc'],int:['plaster',2.4,'#e6dcc8'],floor:['woodfloor',1.4,'#c9b49a'],lot:'#a29e98',joist:'#6b5a46',lamp:'bulb'},
  dave:{ext:['brick',1.1,'#ffffff'],int:['paintwall',2.6,'#fff'],floor:['grass',2.2,'#fff'],lot:'#a29e98',joist:'#6b5a46',lamp:'bulb'},
  doug:{ext:['paintwall',2.6,'#e6d8bf'],int:['plaster',2.4,'#f0e6d6'],floor:['woodfloor',1.4,'#d8c4a6'],lot:'#a29e98',joist:'#6b5a46',lamp:'bulb'}};
function matFor(B,key){const st=B.style;
  switch(key){
    case 'road':return surf('road','asphalt',{color:'#8b8b8b',fallback:'#3e4045',ns:1.2,macro:.6});
    case 'lot':return surf('lot'+B.id,'asphalt',{color:st.lot||'#9a9894',fallback:'#4a4b4f',ns:1.2,macro:.6});
    case 'walk':return surf('walk','sidewalk',{color:'#c9cbcf',fallback:'#b7b2a6',macro:.45});
    case 'curb':return surf('curb','sidewalk',{color:'#dadcdf',fallback:'#c9c5bb',macro:.2,po:1});
    case 'gutter':return surf('gutter','sidewalk',{color:'#9d9fa2',fallback:'#8f8b82',macro:.2,po:1});
    case 'path':return surf('path','pavers',{color:'#dcdad6',fallback:'#b9b4aa',po:1,macro:.3});
    case 'mulch':return surf('mulch','mulch',{color:'#c8b8a8',fallback:'#4a3826',po:1,macro:.3});
    case 'grass':{const m=surf('grass','grass',{color:'#dfe8cf',fallback:'#5d8a4a',macro:.7,ns:.8});m.roughnessMap=null;m.roughness=1;m.envMapIntensity=.55;return m}
    case 'dirt':return surf('dirt','mulch',{color:'#a99a8a',fallback:'#5a4a36',macro:.5});
    case 'inside':return st.floor?surf('in'+B.id,st.floor[0],{color:st.floor[2],fallback:'#8f8b82',macro:.5}):surf('inhub','concfloor',{});
    case 'ext':return surf('ext'+B.id,st.ext[0],{color:st.ext[2],fallback:B.def.wall||'#999',macro:.45});
    case 'int':return surf('int'+B.id,st.int[0],{color:st.int[2],fallback:'#c9c1b0',macro:.4});
    case 'cap':return surf('cap','sidewalk',{color:'#cfcfcf',fallback:'#9a9690',macro:.2});
    case 'plinth':return surf('plinth','concfloor',{color:'#bdbab4',fallback:'#77736c',macro:.2});
    case 'trim':return plain('trim','#e9e5da',{rough:.55});
    case 'trimdark':return plain('trimdark','#3b3732',{rough:.6});
    case 'ply':return surf('ply','plywood',{color:'#d8cbb8',fallback:'#8a6a48',macro:.2});
    case 'joist':return surf('joist'+B.id,'woodfloor',{color:'#a08e78',fallback:st.joist||'#6b5a46',macro:0});
    case 'roofsheet':return surf('roofsheet','rustmetal',{color:'#c8c0b8',fallback:'#6b4d3a',macro:.3,side:THREE.FrontSide});
    case 'siding':return surf('siding','siding',{color:'#f2f0ea',fallback:'#d9d2c2',macro:.3});
    case 'sidingB':return surf('sidingB','siding',{color:'#b7c7d4',fallback:'#a9c1cf',macro:.3});
    case 'sidingC':return surf('sidingC','siding',{color:'#d9c49a',fallback:'#d9c7a3',macro:.3});
    case 'roof':return surf('roof','roof',{color:'#c7c2bc',fallback:'#55504b',macro:.35,side:THREE.DoubleSide});
    case 'brickH':return surf('brickH','brick',{color:'#e8ddd6',fallback:'#9a5a46',macro:.35});
    case 'found':return surf('found','concfloor',{color:'#c4c0b8',fallback:'#8a8680',macro:.2});
    case 'glass':return plain('glass','#1d2833',{rough:.04,metal:.2,envI:1.6});
    case 'door':return plain('door'+B.id,'#5b3a26',{rough:.5});
    case 'fence':return surf('fence','woodfloor',{color:'#d7c6b2',fallback:'#8b6f52',macro:.25});
    case 'metal':return plain('metaldark','#3a3d42',{rough:.45,metal:.8});
    case 'galv':return plain('galv','#9aa0a6',{rough:.4,metal:.9});
    case 'pole':return surf('pole','woodfloor',{color:'#8c7a68',fallback:'#5a4a3c',macro:0});
    case 'paint':{if(MC.paint)return MC.paint;const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,alphaMap:wornTex(),alphaTest:.5,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-6});return MC.paint=m}
    case 'joint':return plain('joint','#2c2925',{rough:1,transparent:true,opacity:.55,po:2});
    case 'hydrant':return plain('hydrant','#c62f22',{rough:.42,metal:.3});
    case 'hydcap':return plain('hydcap','#d8d4cc',{rough:.4,metal:.3});
    case 'signs':return plain('signs','#ffffff',{rough:.35,map:signTex(),metal:.1,side:THREE.DoubleSide});
    case 'lamphead':return plain('lamphead','#5d6166',{rough:.4,metal:.7});
    case 'lampglass':{if(MC.lampglass)return MC.lampglass;const m=new THREE.MeshStandardMaterial({color:lin('#f6eed8'),emissive:lin('#fff1c8'),emissiveIntensity:B.def.type==='boss'?3:.6,roughness:.2});return MC.lampglass=m}
    case 'vinylR':return plain('vinylR','#d8392b',{rough:.42});case 'vinylB':return plain('vinylB','#2457b3',{rough:.42});case 'vinylY':return plain('vinylY','#f2c230',{rough:.42});
    case 'mattress':return plain('mattress','#ffffff',{rough:.9,map:mattressTex()});
    case 'card':return plain('card','#ffffff',{rough:.85,map:cardboardTex()});
    case 'wrap':return plain('wrap','#eceae4',{rough:.28});case 'tape':return plain('tape','#9a7a4a',{rough:.35});
    case 'ammo':return surf('ammo','metal',{color:'#7f8a5e',fallback:'#3f5a33',macro:0,metal:.4,rough:.6});
    case 'grill':return plain('grillk','#1b1c1e',{rough:.35,metal:.6});
    case 'steel':return plain('steel','#b8bcc0',{rough:.3,metal:1});
    case 'cord':return plain('cord','#141414',{rough:.6});
    case 'bulb':{if(MC.bulb)return MC.bulb;return MC.bulb=new THREE.MeshBasicMaterial({color:lin('#ffcf8a').multiplyScalar(6),toneMapped:false})}
    case 'wire':return plain('wire','#1a1a1a',{rough:.5});
    case 'hedgecore':return plain('hedgecore','#1d2c16',{rough:1});
    case 'binG':return plain('binG','#2f4a33',{rough:.55});case 'binB':return plain('binB','#2b4a74',{rough:.55});case 'tyreB':return plain('tyreB','#151515',{rough:.8});
    case 'insul':return plain('insul','#6f8a7a',{rough:.25});
    case 'transformer':return plain('transformer','#8c9296',{rough:.5,metal:.6});
    case 'far':{const m=surf('far','grass',{color:'#c4d2bc',fallback:'#4c7340',macro:.8,ns:.6});m.roughnessMap=null;m.roughness=1;m.envMapIntensity=.5;return m}
    case 'farroad':return surf('farroad','asphalt',{color:'#8a8a8a',fallback:'#3e4045',macro:.5});
    case 'whsWall':return surf('whsWall','metal',{color:'#c9cdd1',fallback:'#8d9096',macro:.3});
    case 'whsRoof':return surf('whsRoof','rustmetal',{color:'#bbb',fallback:'#6b4d3a',macro:.3});
  }
  return plain('x'+key,'#888888')}

/* ---------- tile classification ---------- */
function kindOf(B,x,z){const g=B.g;if(x<0||z<0||x>=B.W||z>=B.H)return 'out';const ch=g[z][x],d=B.def;
  if('htf'.includes(ch))return 'grass';if(ch==='#')return 'wall';
  let k=',.gs'.includes(ch)?ch:(d.under&&d.under[ch])||('cTaIEB'.includes(ch)?d.inside:d.floor);
  return k===','?(B.hub?'road':'lot'):k==='.'?'inside':k==='s'?'walk':'grass'}

/* ---------- level builder ---------- */
W.init=ctx=>{C=ctx};
W.ROADY=ROADY;
W.begin=lvl=>{const def=lvl.def,id=def.id||'hub';
  const B={lod:[],impGB:{},lvl,def,id,hub:id==='hub',g:lvl.g,W:lvl.W,H:lvl.H,gb:{},inst:{},extra:[],lights:[],q:C.quality(),r:rngOf(hashStr(id)+7),style:LEVEL_STYLE[id]||LEVEL_STYLE.doug,group:lvl.group,yards:[],opens:[],shadowless:new Set(['paint','joint','gutter','curb','mulch','path','road','lot','walk','grass','inside','far','farroad'])};
  B.kinds=[];for(let z=0;z<B.H;z++){B.kinds[z]=[];for(let x=0;x<B.W;x++)B.kinds[z][x]=kindOf(B,x,z)}
  B.k=(x,z)=>x<0||z<0||x>=B.W||z>=B.H?'out':B.kinds[z][x];
  B.gbOf=key=>B.gb[key]||(B.gb[key]=new GB());
  lvl.world=B;return B};
W.groundY=(lvl,x,z)=>{const B=lvl&&lvl.world;if(!B||!B.hub)return 0;const k=B.k(Math.floor(x/TILE),Math.floor(z/TILE));return k==='road'?ROADY:0};

/* vertex colour for macro variation on a surface kind */
function tint(kind,x,z){const n=fbm(x/13,z/13),m=vnoise(x/4.1+9,z/4.1+3);
  if(kind==='grass'){const dry=sstep(.55,.8,fbm(x/22+40,z/22+11));const v=.78+n*.36;return[v*(1+dry*.25),v*(1+dry*.08),v*(1-dry*.25)]}
  if(kind==='road'||kind==='lot'){const v=.86+n*.22+(m-.5)*.06;return[v,v,v*1.01]}
  if(kind==='inside'){const v=.8+n*.3;return[v,v*.97,v*.93]}
  const v=.9+n*.16;return[v,v,v]}

W.ground=B=>{const{W:Wd,H}=B;
  const mpr={road:3.6,lot:3.6,walk:2,grass:2.4,inside:B.style.floor?B.style.floor[1]:3,dirt:2};
  for(let z=0;z<H;z++)for(let x=0;x<Wd;x++){let k=B.k(x,z);if(k==='wall')continue;
    const y=k==='road'?ROADY:0,x0=x*TILE,z0=z*TILE;
    B.gbOf(k).floor(x0,z0,x0+TILE,z0+TILE,y,mpr[k]||2,(px,pz)=>tint(k,px,pz))}
  /* walls: floor under walls is never seen. curbs and gutters: every road edge that meets something higher */
  if(B.hub){const cb=B.gbOf('curb'),gu=B.gbOf('gutter');const ch=.025;
    for(let z=0;z<H;z++)for(let x=0;x<Wd;x++){if(B.k(x,z)!=='road')continue;const x0=x*TILE,z0=z*TILE,x1=x0+TILE,z1=z0+TILE;
      for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nk=B.k(x+dx,z+dz);if(nk==='road'||nk==='out')continue;
        const sx=dx>0?x1:dx<0?x0:0,sz=dz>0?z1:dz<0?z0:0;
        if(dx){const nx=-dx;cb.wx(z0,z1,ROADY,-ch,sx,nx,1);cb.quad([sx,-ch,z0],[sx,-ch,z1],[sx+dx*ch,0,z1],[sx+dx*ch,0,z0],[[0,0],[1,0],[1,.05],[0,.05]],null,[nx,1,0]);
          if(nk==='walk')cb.floor(Math.min(sx+dx*ch,sx+dx*.16),z0,Math.max(sx+dx*ch,sx+dx*.16),z1,.003,1);
          gu.floor(Math.min(sx,sx-dx*.38),z0,Math.max(sx,sx-dx*.38),z1,ROADY+.003,2,(px,pz)=>{const v=.85+fbm(px/3,pz/3)*.2;return[v,v,v]})}
        else{const nz=-dz;cb.wz(x0,x1,ROADY,-ch,sz,nz,1);cb.quad([x0,-ch,sz],[x1,-ch,sz],[x1,0,sz+dz*ch],[x0,0,sz+dz*ch],[[0,0],[1,0],[1,.05],[0,.05]],null,[0,1,nz]);
          if(nk==='walk')cb.floor(x0,Math.min(sz+dz*ch,sz+dz*.16),x1,Math.max(sz+dz*ch,sz+dz*.16),.003,1);
          gu.floor(x0,Math.min(sz,sz-dz*.38),x1,Math.max(sz,sz-dz*.38),ROADY+.003,2,(px,pz)=>{const v=.85+fbm(px/3,pz/3)*.2;return[v,v,v]})}}}
    /* sidewalk expansion joints every metre across the run */
    const jt=B.gbOf('joint');
    for(let z=0;z<H;z++)for(let x=0;x<Wd;x++){if(B.k(x,z)!=='walk')continue;const x0=x*TILE,z0=z*TILE;
      const hz=B.k(x-1,z)==='walk'||B.k(x+1,z)==='walk',vt=B.k(x,z-1)==='walk'||B.k(x,z+1)==='walk';
      if(hz&&!vt)for(const o of[0,1])jt.floor(x0+o-.012,z0,x0+o+.012,z0+TILE,.002,1);
      else if(vt&&!hz)for(const o of[0,1])jt.floor(x0,z0+o-.012,x0+TILE,z0+o+.012,.002,1);
      else{jt.floor(x0,z0-.012,x0+TILE,z0+.012,.002,1);jt.floor(x0-.012,z0,x0+.012,z0+TILE,.002,1)}}
    roadMarkings(B)}
  floorDecals(B)};

/* lane lines, crosswalks, stop bars, manholes, storm drains */
function roadMarkings(B){const pg=B.gbOf('paint'),Y=ROADY+.004,WH=[.92,.91,.88],YE=[.85,.55,.1];const lines=B.def.lines||[];
  const P=(x0,z0,x1,z1,c)=>pg.floor(x0,z0,x1,z1,Y,3,()=>c);
  const isRoad=(x,z)=>B.k(x,z)==='road';
  for(const[o,k]of lines){
    const along=o==='h';const N=along?B.W:B.H;
    /* tile coordinates: t runs along the road; the road occupies cross rows k-1..k+1 */
    const roadAt=t=>along?isRoad(t,k):isRoad(k,t);
    const inter=t=>along?(isRoad(t,k-2)||isRoad(t,k+2)):(isRoad(k-2,t)||isRoad(k+2,t));
    const c0=(k-1)*TILE,c1=(k+2)*TILE,cm=(c0+c1)/2;
    const R=(a0,a1,b0,b1,c)=>along?P(a0,b0,a1,b1,c):P(b0,a0,b1,a1,c);
    let t=0;while(t<N){if(!roadAt(t)||inter(t)){t++;continue}let s=t;while(t<N&&roadAt(t)&&!inter(t))t++;const e=t-1;
      const xs=s>0&&inter(s-1),xe=t<N&&inter(t);
      let a0=s*TILE,a1=(e+1)*TILE;
      if(xs){for(let b=c0+.35;b+.45<=c1-.2;b+=.9)R(a0+.15,a0+TILE-.15,b,b+.45,WH);R(a0+TILE+.3,a0+TILE+.7,along?c0+.15:cm+.15,along?cm-.15:c1-.15,WH);a0+=TILE+1.2}
      if(xe){for(let b=c0+.35;b+.45<=c1-.2;b+=.9)R(a1-TILE+.15,a1-.15,b,b+.45,WH);R(a1-TILE-.7,a1-TILE-.3,along?cm+.15:c0+.15,along?c1-.15:cm-.15,WH);a1-=TILE+1.2}
      if(a1>a0){R(a0,a1,cm-.19,cm-.08,YE);R(a0,a1,cm+.08,cm+.19,YE)}
      /* storm drains at the gutter near each crossing, manhole mid-block */
      if(xe){B.extra.push(['drain',along?a1+.4:c0+.02,along?c0+.02:a1+.4,along?0:Math.PI/2]);B.extra.push(['drain',along?a1+.4:c1-.02,along?c1-.02:a1+.4,along?Math.PI:-Math.PI/2])}
      if(e-s>6){const m=(s+e+1)/2*TILE;B.extra.push(['manhole',along?m:cm+1.4,along?cm+1.4:m])}}}
  /* small decals: manholes and drains */
  const mh=B.gbOf('d_manhole'),dr=B.gbOf('d_drain');
  for(const[t,x,z,rot]of B.extra){if(t==='manhole'){mh.quad([x-.38,Y,z-.38],[x-.38,Y,z+.38],[x+.38,Y,z+.38],[x+.38,Y,z-.38],[[0,0],[0,1],[1,1],[1,0]],null,[0,1,0])}
    else if(t==='drain'){const s=Math.sin(rot),c=Math.cos(rot),hw=.45,hd=.22,dz=.24;const p=(u,v)=>[x+u*c+v*s,ROADY+.005,z-u*s+v*c];
      dr.quad(p(-hw,dz-hd),p(-hw,dz+hd),p(hw,dz+hd),p(hw,dz-hd),[[0,0],[0,1],[1,1],[1,0]],null,[0,1,0])}}
  B.extra.length=0}

/* oil, grime, cracks and puddles on mission floors; patches on hub roads */
function floorDecals(B){const r=B.r;const fd=B.gbOf('d_floor'),pd=B.gbOf('d_puddle'),ap=B.gbOf('d_patch');
  const cell=(i,x,z,s,y,rot)=>{const u0=(i%2)*.5,v0=1-Math.floor(i/2)*.5-.5,c=Math.cos(rot),sn=Math.sin(rot),p=(a,b)=>[x+a*c+b*sn,y,z-a*sn+b*c];
    fd.quad(p(-s,-s),p(-s,s),p(s,s),p(s,-s),[[u0,v0+.5],[u0,v0],[u0+.5,v0],[u0+.5,v0+.5]],null,[0,1,0])};
  const n=B.hub?0:Math.round(B.W*B.H*(B.q==='low'?.03:.06));
  for(let i=0;i<n;i++){const x=Math.floor(r()*B.W),z=Math.floor(r()*B.H),k=B.k(x,z);if(k!=='inside'&&k!=='lot')continue;
    const X=x*TILE+r()*TILE,Z=z*TILE+r()*TILE,y=.004+r()*.002;
    if(k==='lot'&&r()<.3){const s=.8+r()*1.6;pd.quad([X-s,.006,Z-s*.7],[X-s,.006,Z+s*.7],[X+s,.006,Z+s*.7],[X+s,.006,Z-s*.7],[[0,0],[0,1],[1,1],[1,0]],null,[0,1,0]);continue}
    const kind=k==='lot'?(r()<.5?0:2):(B.id==='gary'?(r()<.6?0:r()<.5?1:2):(r()<.4?3:1));cell(kind,X,Z,.6+r()*1.1,y,r()*6.28)}
  if(B.hub){for(let i=0;i<34;i++){const x=Math.floor(r()*B.W),z=Math.floor(r()*B.H);if(B.k(x,z)!=='road')continue;const X=x*TILE+1,Z=z*TILE+1,s=.7+r()*.9,rot=r()*6.28,c=Math.cos(rot),sn=Math.sin(rot),p=(a,b)=>[X+a*c+b*sn,ROADY+.003,Z-a*sn+b*c];
    ap.quad(p(-s,-s),p(-s,s),p(s,s),p(s,-s),[[0,0],[0,1],[1,1],[1,0]],null,[0,1,0])}}}

/* ---------- mission walls ---------- */
W.walls=B=>{const{W:Wd,H}=B;if(!B.style.ext)return null;const isW=(x,z)=>B.k(x,z)==='wall';
  const ext=B.gbOf('ext'),int=B.gbOf('int'),cap=B.gbOf('cap'),trim=B.gbOf('trim'),pl=B.gbOf('plinth');
  const mE=B.style.ext[1],mI=B.style.int[1];const lip=.04,CY=WALLH+.06;
  const wallTint=(x,y,z)=>{const v=.82+fbm(x/5+3,z/5+y/3)*.3-(y<.6?.08:0);return[v,v*.98,v*.95]};
  for(let z=0;z<H;z++)for(let x=0;x<Wd;x++){if(!isW(x,z))continue;const x0=x*TILE,z0=z*TILE,x1=x0+TILE,z1=z0+TILE;
    cap.floor(x0-(isW(x-1,z)?0:lip),z0-(isW(x,z-1)?0:lip),x1+(isW(x+1,z)?0:lip),z1+(isW(x,z+1)?0:lip),CY,1.5);
    for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){if(isW(x+dx,z+dz))continue;const nk=B.k(x+dx,z+dz);const inside=nk==='inside';const gb=inside?int:ext,m=inside?mI:mE;
      const col=wallTint(x0+(dx>0?TILE:0),1.6,z0+(dz>0?TILE:0));
      if(dx){const sx=dx>0?x1:x0;gb.wx(z0,z1,0,WALLH,sx,dx,m,col);cap.wx(z0-(isW(x,z-1)?0:lip),z1+(isW(x,z+1)?0:lip),WALLH,CY,sx+dx*lip,dx,1.5);
        if(inside){trim.box(Math.min(sx,sx+dx*.02),0,z0,Math.max(sx,sx+dx*.02),.13,z1,1,null,{px:dx<0,nx:dx>0,pz:true,nz:true})}
        else if(nk!=='out')pl.box(Math.min(sx,sx+dx*.03),0,z0,Math.max(sx,sx+dx*.03),.35,z1,1.5,null,{px:dx<0,nx:dx>0,pz:true,nz:true});}
      else{const sz=dz>0?z1:z0;gb.wz(x0,x1,0,WALLH,sz,dz,m,col);cap.wz(x0-(isW(x-1,z)?0:lip),x1+(isW(x+1,z)?0:lip),WALLH,CY,sz+dz*lip,dz,1.5);
        if(inside){trim.box(x0,0,Math.min(sz,sz+dz*.02),x1,.13,Math.max(sz,sz+dz*.02),1,null,{pz:dz<0,nz:dz>0,px:true,nx:true})}
        else if(nk!=='out')pl.box(x0,0,Math.min(sz,sz+dz*.03),x1,.35,Math.max(sz,sz+dz*.03),1.5,null,{pz:dz<0,nz:dz>0,px:true,nx:true})}}}
  findOpenings(B);
  /* lintels over openings: the wall continues above the door */
  for(const o of B.opens){const{x0,z0,x1,z1,horiz}=o;const y0=2.45;
    const kA=horiz?B.k(o.t0,o.row-1):B.k(o.row-1,o.t0),kB=horiz?B.k(o.t0,o.row+1):B.k(o.row+1,o.t0);
    const gA=kA==='inside'?int:ext,gB=kB==='inside'?int:ext;
    if(horiz){gA.wz(x0,x1,y0,WALLH,z0,-1,kA==='inside'?mI:mE);gB.wz(x0,x1,y0,WALLH,z1,1,kB==='inside'?mI:mE);int.floor(x0,z0,x1,z1,y0,mI,null,true);cap.floor(x0,z0,x1,z1,CY,1.5);
      for(const[z,nz]of[[z0,-1],[z1,1]]){const zz=z+nz*.03;trim.box(x0,0,Math.min(z,zz),x0+.11,y0+.11,Math.max(z,zz),1,null,{nz:nz>0,pz:nz<0});trim.box(x1-.11,0,Math.min(z,zz),x1,y0+.11,Math.max(z,zz),1,null,{nz:nz>0,pz:nz<0});trim.box(x0,y0,Math.min(z,zz),x1,y0+.11,Math.max(z,zz),1,null,{nz:nz>0,pz:nz<0})}}
    else{gA.wx(z0,z1,y0,WALLH,x0,-1,kA==='inside'?mI:mE);gB.wx(z0,z1,y0,WALLH,x1,1,kB==='inside'?mI:mE);int.floor(x0,z0,x1,z1,y0,mI,null,true);cap.floor(x0,z0,x1,z1,CY,1.5);
      for(const[x,nx]of[[x0,-1],[x1,1]]){const xx=x+nx*.03;trim.box(Math.min(x,xx),0,z0,Math.max(x,xx),y0+.11,z0+.11,1,null,{nx:nx>0,px:nx<0});trim.box(Math.min(x,xx),0,z1-.11,Math.max(x,xx),y0+.11,z1,1,null,{nx:nx>0,px:nx<0});trim.box(Math.min(x,xx),y0,z0,Math.max(x,xx),y0+.11,z1,1,null,{nx:nx>0,px:nx<0})}}}
  windowsAndDecals(B);
  ceiling(B);
  return true};
/* gaps of 1-3 tiles in a straight wall line become doorways */
function findOpenings(B){const isW=(x,z)=>B.k(x,z)==='wall';const hw=(x,z)=>isW(x,z)&&(isW(x-1,z)||isW(x+1,z)),vw=(x,z)=>isW(x,z)&&(isW(x,z-1)||isW(x,z+1));
  for(let z=0;z<B.H;z++){let x=0;while(x<B.W){if(isW(x,z)){x++;continue}const s=x;while(x<B.W&&!isW(x,z))x++;const e=x-1;
    if(s>0&&x<B.W&&e-s<=2&&hw(s-1,z)&&hw(x,z)){let ok=true;for(let t=s;t<=e;t++)if(isW(t,z-1)||isW(t,z+1))ok=false;if(ok)B.opens.push({horiz:true,row:z,t0:s,t1:e,x0:s*TILE,x1:(e+1)*TILE,z0:z*TILE,z1:z*TILE+TILE})}}}
  for(let x=0;x<B.W;x++){let z=0;while(z<B.H){if(isW(x,z)){z++;continue}const s=z;while(z<B.H&&!isW(x,z))z++;const e=z-1;
    if(s>0&&z<B.H&&e-s<=2&&vw(x,s-1)&&vw(x,z)){let ok=true;for(let t=s;t<=e;t++)if(isW(x-1,t)||isW(x+1,t))ok=false;if(ok)B.opens.push({horiz:false,row:x,t0:s,t1:e,x0:x*TILE,x1:x*TILE+TILE,z0:s*TILE,z1:(e+1)*TILE})}}}}
/* boarded windows on long wall faces, stains, graffiti and posters */
function windowsAndDecals(B){const r=B.r,isW=(x,z)=>B.k(x,z)==='wall';const ply=B.gbOf('ply'),trim=B.gbOf('trimdark');
  const faces=[];/* every exposed wall face: {x,z,dx,dz,inside} */
  for(let z=0;z<B.H;z++)for(let x=0;x<B.W;x++){if(!isW(x,z))continue;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){if(isW(x+dx,z+dz))continue;const nk=B.k(x+dx,z+dz);if(nk==='out')continue;
    /* only faces whose neighbours along the wall are also wall (straight runs) */
    const ax=dz?1:0,az=dx?1:0;const straight=isW(x+ax,z+az)&&isW(x-ax,z-az)&&!isW(x+ax+dx,z+az+dz)&&!isW(x-ax+dx,z-az+dz);
    faces.push({x,z,dx,dz,inside:nk==='inside',straight})}}
  const near=(f)=>B.opens.some(o=>{const cx=f.x*TILE+1,cz=f.z*TILE+1;return cx>o.x0-3&&cx<o.x1+3&&cz>o.z0-3&&cz<o.z1+3});
  /* windows: every third straight face */
  let wi=0;for(const f of faces){if(!f.straight||near(f))continue;if((f.x*7+f.z*13)%5!==0)continue;wi++;
    const cx=f.x*TILE+1+f.dx,cz=f.z*TILE+1+f.dz,o=.035,yy=[1,2.25],hw=.68;
    if(f.dx){const X=cx,s=f.dx;ply.wx(cz-hw,cz+hw,yy[0],yy[1],X+s*o,s,1.2);
      trim.box(Math.min(X,X+s*(o+.04)),yy[0]-.1,cz-hw-.1,Math.max(X,X+s*(o+.04)),yy[0],cz+hw+.1,1,null,{});trim.box(Math.min(X,X+s*(o+.02)),yy[1],cz-hw-.08,Math.max(X,X+s*(o+.02)),yy[1]+.08,cz+hw+.08,1,null,{});
      trim.box(Math.min(X,X+s*(o+.02)),yy[0],cz-hw-.08,Math.max(X,X+s*(o+.02)),yy[1],cz-hw,1,null,{});trim.box(Math.min(X,X+s*(o+.02)),yy[0],cz+hw,Math.max(X,X+s*(o+.02)),yy[1],cz+hw+.08,1,null,{});
      for(const yb of[1.35,1.9])ply.box(Math.min(X+s*o,X+s*(o+.05)),yb,cz-hw-.15,Math.max(X+s*o,X+s*(o+.05)),yb+.14,cz+hw+.15,1,null,{})}
    else{const Z=cz,s=f.dz;ply.wz(cx-hw,cx+hw,yy[0],yy[1],Z+s*o,s,1.2);
      trim.box(cx-hw-.1,yy[0]-.1,Math.min(Z,Z+s*(o+.04)),cx+hw+.1,yy[0],Math.max(Z,Z+s*(o+.04)),1,null,{});trim.box(cx-hw-.08,yy[1],Math.min(Z,Z+s*(o+.02)),cx+hw+.08,yy[1]+.08,Math.max(Z,Z+s*(o+.02)),1,null,{});
      trim.box(cx-hw-.08,yy[0],Math.min(Z,Z+s*(o+.02)),cx-hw,yy[1],Math.max(Z,Z+s*(o+.02)),1,null,{});trim.box(cx+hw,yy[0],Math.min(Z,Z+s*(o+.02)),cx+hw+.08,yy[1],Math.max(Z,Z+s*(o+.02)),1,null,{});
      for(const yb of[1.35,1.9])ply.box(cx-hw-.15,yb,Math.min(Z+s*o,Z+s*(o+.05)),cx+hw+.15,yb+.14,Math.max(Z+s*o,Z+s*(o+.05)),1,null,{})}
    f.used=true}
  /* decals hugging the wall */
  const put=(key,f,w,h,y0,uv,off)=>{const gb=B.gbOf(key);const cx=f.x*TILE+1+f.dx,cz=f.z*TILE+1+f.dz,o=off||.012,sh=(r()-.5)*(TILE-w)*.9;
    if(f.dx){const X=cx+f.dx*o,z0=cz+sh-w/2,z1=cz+sh+w/2;const s=f.dx;gb.quad([X,y0,s>0?z1:z0],[X,y0,s>0?z0:z1],[X,y0+h,s>0?z0:z1],[X,y0+h,s>0?z1:z0],[[uv[0],uv[1]],[uv[2],uv[1]],[uv[2],uv[3]],[uv[0],uv[3]]],null,[s,0,0])}
    else{const Z=cz+f.dz*o,x0=cx+sh-w/2,x1=cx+sh+w/2;const s=f.dz;gb.quad([s>0?x0:x1,y0,Z],[s>0?x1:x0,y0,Z],[s>0?x1:x0,y0+h,Z],[s>0?x0:x1,y0+h,Z],[[uv[0],uv[1]],[uv[2],uv[1]],[uv[2],uv[3]],[uv[0],uv[3]]],null,[0,0,s])}};
  const pool=faces.filter(f=>!f.used);const take=()=>pool.length?pool.splice(Math.floor(r()*pool.length),1)[0]:null;
  const nStain=Math.round(pool.length*(B.q==='low'?.12:.22));
  for(let i=0;i<nStain;i++){const f=take();if(!f)break;const h=1.4+r()*1.7;put(r()<.5?'d_leakA':'d_leakB',f,1.4+r()*.6,h,WALLH-h+.02,[0,0,1,1],.01)}
  const nG=B.id==='dave'?0:Math.round(5+r()*4);
  for(let i=0;i<nG;i++){const f=take();if(!f)break;if(f.inside&&r()<.4)continue;const c=Math.floor(r()*4),u0=(c%2)*.5,v0=1-Math.floor(c/2)*.5;put('d_graf',f,1.7,1.7,.45+r()*.4,[u0,v0-.5,u0+.5,v0],.015)}
  const nP=B.id==='dave'?0:6;
  for(let i=0;i<nP;i++){const f=pool.find(f=>f.inside&&!f.p);if(!f)break;f.p=1;pool.splice(pool.indexOf(f),1);const c=Math.floor(r()*4),u0=(c%2)*.5,v0=1-Math.floor(c/2)*.5;put('d_post',f,.55,.55,1.35+r()*.3,[u0,v0-.5,u0+.5,v0],.018)}}
/* exposed joists and patchy roof sheeting over interiors (single-sided: invisible from above, so the camera can always see in) */
function ceiling(B){const r=B.r;const jo=B.gbOf('joist'),rs=B.gbOf('roofsheet');const inside=(x,z)=>{const k=B.k(x,z);return k==='inside'||k==='wall'};
  for(let z=0;z<B.H;z++){let x=0;while(x<B.W){if(!inside(x,z)||B.k(x,z)==='wall'&&!(inside(x+1,z)&&B.k(x+1,z)==='inside')){x++;continue}
      const s=x;while(x<B.W&&inside(x,z))x++;const x0=s*TILE+.1,x1=x*TILE-.1;if(x1-x0<3)continue;
      const zc=z*TILE+1;if(r()<.12)continue;jo.box(x0,WALLH-.26,zc-.06,x1,WALLH-.02,zc+.06,1.2,null,{})}}
  for(let z=0;z<B.H;z++)for(let x=0;x<B.W;x++){if(B.k(x,z)!=='inside')continue;if(r()<.42)continue;const x0=x*TILE,z0=z*TILE;
    const y=WALLH-.01;rs.quad([x0,y,z0],[x0+TILE,y,z0],[x0+TILE,y,z0+TILE],[x0,y,z0+TILE],[[x0/1.8,z0/1.8],[(x0+TILE)/1.8,z0/1.8],[(x0+TILE)/1.8,(z0+TILE)/1.8],[x0/1.8,(z0+TILE)/1.8]],null,[0,-1,0])}}

/* ---------- instancing ---------- */
/* queue a model instance; built at finish as InstancedMesh per model part, chunked so frustum and shadow culling still work */
function inst(B,name,x,y,z,ry=0,s=1,sy,opts){(B.inst[name]||(B.inst[name]=[])).push({x,y,z,ry,s,sy:sy??s,o:opts})}
const partCache={};
function partsOf(name){if(partCache[name])return partCache[name];const g=C.ASSETS.gltf(name);if(!g)return null;const out=[];g.scene.updateMatrixWorld(true);
  const bb=new THREE.Box3().setFromObject(g.scene);g.scene.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh){out.push({geo:o.geometry,mat:o.material,m:o.matrixWorld.clone()})}});
  return partCache[name]={parts:out,bb}}
W.modelBox=name=>{const p=partsOf(name);return p?p.bb:null};
function buildInst(B){const chunk=36,dummy=new THREE.Object3D(),mm=new THREE.Matrix4(),box=new THREE.Box3();dummy.rotation.order='YXZ';
  for(const name in B.inst){const list=B.inst[name];const P=partsOf(name);if(!P)continue;
    const cells={};for(const it of list){const k=Math.floor(it.x/chunk)+','+Math.floor(it.z/chunk);(cells[k]||(cells[k]=[])).push(it)}
    for(const k in cells){const L=cells[k];const reals=[];let ctr=null;
      for(const part of P.parts){const im=new THREE.InstancedMesh(part.geo,part.mat,L.length);const pb=part.geo.boundingBox||(part.geo.computeBoundingBox(),part.geo.boundingBox);box.makeEmpty();
        L.forEach((it,i)=>{const o=it.o||{};dummy.position.set(it.x,it.y,it.z);dummy.rotation.set(o.rx||0,it.ry,0);dummy.scale.set(it.s,it.sy,o.sz??it.s);dummy.updateMatrix();mm.multiplyMatrices(dummy.matrix,part.m);im.setMatrixAt(i,mm);box.union(pb.clone().applyMatrix4(mm))});
        const bs=new THREE.Sphere();box.getBoundingSphere(bs);patchCull(im,bs);
        im.castShadow=!(L[0].o&&L[0].o.noShadow);im.receiveShadow=true;B.group.add(im);reals.push(im);if(!ctr)ctr=bs}
      if(TREES.includes(name)&&ctr){const imp=impostor(name);const lod={c:ctr.center.clone(),r:ctr.radius,real:reals};B.lod.push(lod);
        if(imp){const gb=B.impGB[name]||(B.impGB[name]={gb:new GB(),ch:[],imp});for(const it of L){const w=imp.w*it.s,h=imp.h*it.sy,y=it.y+imp.y0*it.sy;for(const a of[it.ry,it.ry+Math.PI/2]){const c=Math.cos(a)*w/2,sn=Math.sin(a)*w/2;gb.gb.quad([it.x-c,y,it.z-sn],[it.x+c,y,it.z+sn],[it.x+c,y+h,it.z+sn],[it.x-c,y+h,it.z-sn],[[0,0],[1,0],[1,1],[0,1]],null,null,[0,1,0]);for(let q=0;q<4;q++)gb.ch.push(lod.c.x,lod.c.z,lod.r)}}}}}}
  for(const name in B.impGB){const e=B.impGB[name];const geo=e.gb.geo();geo.setAttribute('aChunk',new THREE.Float32BufferAttribute(e.ch,3));const mesh=new THREE.Mesh(geo,impMat(e.imp,B));mesh.userData.wkey='imp';mesh.frustumCulled=false;B.group.add(mesh)}}
/* r128 frustum culling reads geometry.boundingSphere; instanced chunks share the part geometry, so wrap it per chunk */
const IMPU={uCam:{value:new THREE.Vector3()},uR:{value:50}};
function impMat(im){if(im.mat)return im.mat;const m=new THREE.MeshBasicMaterial({map:im.tex,alphaTest:.45,side:THREE.DoubleSide,color:new THREE.Color(.95,.98,.92)});
  m.onBeforeCompile=sh=>{sh.uniforms.uCam=IMPU.uCam;sh.uniforms.uR=IMPU.uR;sh.vertexShader='attribute vec3 aChunk;uniform vec3 uCam;uniform float uR;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nif(length(aChunk.xy-uCam.xz)-aChunk.z<uR)transformed=vec3(0.,-1000.,0.);')};m.customProgramCacheKey=()=>'htimp';return im.mat=m}
function patchCull(im,bs){const g=im.geometry,g2=new THREE.BufferGeometry();for(const k in g.attributes)g2.setAttribute(k,g.attributes[k]);if(g.index)g2.setIndex(g.index);g2.groups=g.groups;g2.boundingSphere=bs;im.geometry=g2}

/* ---------- trees ---------- */
const TREES=['tree_oak','tree_tall','tree_pine'];
W.tree=(B,x,z,opts={})=>{const r=B.r;const name=opts.name||TREES[Math.floor(r()*(B.hub||B.id==='dave'?2.3:3))%3];
  if(partsOf(name)){const s=(opts.s||1)*(.85+r()*.4);inst(B,name,x+(r()-.5)*.4,0,z+(r()-.5)*.4,r()*6.28,s);return true}
  /* fallback: trunk plus clustered foliage */
  const gb=B.gbOf('trimdark');gb.box(x-.15,0,z-.15,x+.15,2.6,z+.15,1,null,{});
  const lg=B.gbOf('leaves');for(let i=0;i<5;i++){const g=new THREE.IcosahedronGeometry(1+r()*.5,1);const m=new THREE.Matrix4().makeTranslation(x+(r()-.5)*1.4,3.2+r()*1.4,z+(r()-.5)*1.4);lg.addGeo(g,m,1,[.8+r()*.3,1,.8])}return false};

/* ---------- procedural props merged into level geometry ---------- */
function cylGeo(r0,r1,h,seg=12,open){return new THREE.CylinderGeometry(r1,r0,h,seg,1,open)}
const M4=(x,y,z,ry=0,rx=0,rz=0,s=1)=>{const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.setScalar(s);o.updateMatrix();return o.matrix};
W.streetLamp=(B,x,z,dir)=>{const ang=Math.atan2(dir[0],dir[1]);/* arm reaches toward the road */
  const pole=B.gbOf('lamphead'),gl=B.gbOf('lampglass');
  pole.addGeo(cylGeo(.13,.07,6.6,12),M4(x,3.3,z));pole.addGeo(cylGeo(.2,.2,.5,12),M4(x,.25,z));
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,6.4,0),new THREE.Vector3(0,7.0,.25),new THREE.Vector3(0,7.25,1.1),new THREE.Vector3(0,7.25,2.1)]);
  pole.addGeo(new THREE.TubeGeometry(curve,12,.055,8),M4(x,0,z,ang));
  const head=new THREE.SphereGeometry(.5,14,8,0,Math.PI*2,0,Math.PI/2);head.scale(.55,.32,1);pole.addGeo(head,M4(x+Math.sin(ang)*2.45,7.22,z+Math.cos(ang)*2.45,ang));
  const lens=new THREE.CircleGeometry(.4,14);lens.scale(.5,1,1);lens.rotateX(Math.PI/2);gl.addGeo(lens,M4(x+Math.sin(ang)*2.45,7.2,z+Math.cos(ang)*2.45,ang))};
W.hydrant=(B,x,z,ry=0)=>{const gb=B.gbOf('hydrant'),cp=B.gbOf('hydcap');
  const prof=[[0,0],[.16,0],[.16,.06],[.12,.08],[.11,.12],[.11,.55],[.13,.58],[.13,.62],[.1,.64],[.1,.7],[.06,.76],[.03,.8],[0,.81]].map(p=>new THREE.Vector2(p[0],p[1]));
  gb.addGeo(new THREE.LatheGeometry(prof,16),M4(x,0,z,ry));
  for(const s of[-1,1]){const n=cylGeo(.055,.055,.13,12);n.rotateZ(Math.PI/2);cp.addGeo(n,M4(x+Math.cos(ry)*s*.14,.47,z-Math.sin(ry)*s*.14,ry))}
  const f=cylGeo(.07,.07,.12,12);f.rotateX(Math.PI/2);cp.addGeo(f,M4(x+Math.sin(ry)*.14,.44,z+Math.cos(ry)*.14,ry));
  cp.addGeo(cylGeo(.035,.035,.05,6),M4(x,.83,z))};
W.streetSign=(B,x,z,nA,nB,stop,stopYaw)=>{const pole=B.gbOf('galv'),sg=B.gbOf('signs');pole.addGeo(cylGeo(.04,.04,3.1,8),M4(x,1.55,z));
  const blade=(row,yaw,y)=>{const v0=1-(row+1)/8,v1=1-row/8;const c=Math.cos(yaw),s=Math.sin(yaw),hw=.48,hh=.075;const p=(u,v,d)=>[x+u*c+d*s,y+v,z-u*s+d*c];
    for(const d of[.012,-.012])sg.quad(p(-hw,-hh,d),p(hw,-hh,d),p(hw,hh,d),p(-hw,hh,d),d>0?[[0,v0],[1,v0],[1,v1],[0,v1]]:[[1,v0],[0,v0],[0,v1],[1,v1]],null,[s*Math.sign(d),0,c*Math.sign(d)])};
  blade(nA,0,3.0);blade(nB,Math.PI/2,2.82);
};
W.utilityLine=(B,pts)=>{/* wooden poles with crossarms and sagging wires between them */
  const pole=B.gbOf('pole'),ins=B.gbOf('insul'),wire=B.gbOf('wire'),tr=B.gbOf('transformer');const H=8.6;
  pts.forEach((p,i)=>{pole.addGeo(cylGeo(.15,.11,H+1,10),M4(p[0],(H+1)/2-.5,p[1]));const ca=new THREE.BoxGeometry(2.2,.12,.1);pole.addGeo(ca,M4(p[0],H-.3,p[1],p[2]||0),1);
    for(const o of[-.95,0,.95])ins.addGeo(cylGeo(.05,.04,.16,8),M4(p[0]+Math.cos(p[2]||0)*o,H-.16,p[1]-Math.sin(p[2]||0)*o));
    if(i%3===1){const t=cylGeo(.26,.26,.8,14);tr.addGeo(t,M4(p[0]+.33,H-1.6,p[1]))}});
  for(let i=0;i+1<pts.length;i++){const a=pts[i],b=pts[i+1];for(const[o,yy,sag]of[[-.95,H-.1,.55],[0,H-.1,.6],[.95,H-.1,.55],[0,H-2.3,.8]]){
      const A=new THREE.Vector3(a[0]+Math.cos(a[2]||0)*o,yy,a[1]-Math.sin(a[2]||0)*o),Bv=new THREE.Vector3(b[0]+Math.cos(b[2]||0)*o,yy,b[1]-Math.sin(b[2]||0)*o);
      const pts2=[];for(let k=0;k<=10;k++){const t=k/10;const p=A.clone().lerp(Bv,t);p.y-=sag*4*t*(1-t);pts2.push(p)}
      wire.addGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2),16,.013,4),new THREE.Matrix4())}}};
/* wooden privacy fence from (ax,az) to (bx,bz) */
W.fence=(B,ax,az,bx,bz,h=1.8)=>{const gb=B.gbOf('fence');const dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz);if(L<.3)return;const yaw=Math.atan2(dz,-dx)+Math.PI;
  const ux=dx/L,uz=dz/L,nx=-uz,nz=ux;const r=B.r;
  for(let t=0;t<=L+.01;t+=2.4){const px=ax+ux*Math.min(t,L),pz=az+uz*Math.min(t,L);gb.box(px-.06,0,pz-.06,px+.06,h+.08,pz+.06,1.4,[.75,.72,.7],{})}
  for(const yy of[.3,h-.35])gb.obox(ax+dx/2+nx*.08,yy,az+dz/2+nz*.08,L/2,.045,.02,Math.atan2(-dz,dx),1.4,[.8,.78,.75]);
  for(let t=.07;t<L;t+=.15){const px=ax+ux*t-nx*.03,pz=az+uz*t-nz*.03;const v=.82+r()*.3,hh=h-.02+r()*.04;gb.obox(px,hh/2,pz,.068,hh/2,.009,Math.atan2(-dz,dx),1.4,[v,v*.97,v*.93])}};

/* mattress, cardboard box, wrapped bricks: simple meshes with generated textures */
function boxMesh(B,mat,w,h,d,x,y,z,ry=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.rotation.y=ry;m.castShadow=m.receiveShadow=true;B.group.add(m);return m}
W.cardboard=(B,parent,w,h,d,x,y,z,ry)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),matFor(B,'card'));m.position.set(x,y,z);m.rotation.y=ry||0;m.castShadow=m.receiveShadow=true;(parent||B.group).add(m);return m};

/* ---------- clutter in mission interiors ---------- */
function clutter(B){const r=B.r;const isW=(x,z)=>B.k(x,z)==='wall';const special=(x,z)=>!'.'.includes(B.g[z][x])&&B.g[z][x]!==B.def.inside;
  const spots=[];for(let z=1;z<B.H-1;z++)for(let x=1;x<B.W-1;x++){if(B.k(x,z)!=='inside'||B.g[z][x]!=='.')continue;
    const adj=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dz])=>isW(x+dx,z+dz));if(adj.length!==1)continue;
    if(B.opens.some(o=>x*TILE+1>o.x0-2.5&&x*TILE+1<o.x1+2.5&&z*TILE+1>o.z0-2.5&&z*TILE+1<o.z1+2.5))continue;
    let busy=false;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const c=B.g[z+dz]&&B.g[z+dz][x+dx];if(c&&'EBIaTcPX'.includes(c))busy=true}if(busy)continue;
    spots.push({x,z,dx:adj[0][0],dz:adj[0][1]})}
  const kinds=B.id==='gary'?['tyre','tyre','pallet','barrel_red','barrel_blue','trashbag','table_low','tyrestack']:B.id==='dave'?[]:['trashbag','trashbag','couch','mattress','pallet','table_low','barrel_red','tyre','cardboard'];
  const n=Math.min(spots.length,B.q==='low'?8:16);
  for(let i=0;i<n&&kinds.length;i++){const s=spots.splice(Math.floor(r()*spots.length),1)[0];const k=kinds[i%kinds.length];
    const yaw=Math.atan2(-s.dx,-s.dz);/* facing away from the wall */
    const wx=s.x*TILE+1+s.dx*.45,wz=s.z*TILE+1+s.dz*.45,j=(r()-.5)*.6;const px=wx+(s.dz?j:0),pz=wz+(s.dx?j:0);
    if(k==='mattress'){const m=boxMesh(B,matFor(B,'mattress'),1.9,.2,1.35,s.x*TILE+1+s.dx*.2,.1,s.z*TILE+1+s.dz*.2,yaw+(r()-.5)*.3);continue}
    if(k==='cardboard'){for(let q=0;q<3;q++)W.cardboard(B,null,.5+r()*.2,.35+r()*.15,.4+r()*.2,px+(r()-.5)*.5,.2+q*.38,pz+(r()-.5)*.5,r()*1.5);continue}
    if(k==='tyrestack'){for(let q=0;q<4;q++)inst(B,'tyre',px,.08+q*.17,pz,r()*6,1,1,{rx:Math.PI/2});continue}
    if(k==='couch'){inst(B,'couch',s.x*TILE+1+s.dx*.35,0,s.z*TILE+1+s.dz*.35,yaw,1.05);continue}
    if(k==='table_low'){inst(B,'table_low',px,0,pz,yaw+Math.PI/2*(r()<.5?1:0),.9);continue}
    if(k==='pallet'){if(r()<.5)inst(B,'pallet',px,0,pz,r()*.4,1);else{for(let q=0;q<3;q++)inst(B,'pallet',px,q*.15,pz,r()*.3,1)}continue}
    if(k==='trashbag'){for(let q=0;q<1+Math.floor(r()*2);q++)inst(B,'trashbag',px+(r()-.5)*.9,0,pz+(r()-.5)*.9,r()*6,.9+r()*.4);continue}
    inst(B,k,px,0,pz,r()*6,1)}}

/* hanging bulbs and their lights: farthest-point spread over interior tiles, capped at 8 */
function lights(B){const r=B.r;if(B.hub)return;const cands=[];
  for(let z=1;z<B.H-1;z++)for(let x=1;x<B.W-1;x++){if(B.k(x,z)!=='inside')continue;let ok=true;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(B.k(x+dx,z+dz)==='wall')ok=false;if(ok)cands.push([x,z])}
  if(!cands.length)return;const pts=[cands[Math.floor(r()*cands.length)]];
  while(pts.length<8){let best=null,bd=0;for(const c of cands){let d=1e9;for(const p of pts)d=Math.min(d,Math.hypot(c[0]-p[0],c[1]-p[1]));if(d>bd){bd=d;best=c}}if(!best||bd<3.5)break;pts.push(best)}
  const industrial=B.style.lamp==='industrial';
  for(const[tx_,tz]of pts){const X=tx_*TILE+1,Z=tz*TILE+1,yb=2.45;
    const cord=B.gbOf('cord');cord.addGeo(cylGeo(.006,.006,WALLH-yb-.05,4),M4(X,(WALLH+yb)/2,Z));
    if(industrial&&partsOf('hanging_industrial_lamp'))inst(B,'hanging_industrial_lamp',X,yb+1.3,Z,0,1,1,{noShadow:true});
    else{const sk=B.gbOf('metal');sk.addGeo(cylGeo(.028,.034,.09,12),M4(X,yb+.07,Z));sk.addGeo(cylGeo(.02,.024,.03,10),M4(X,yb+.01,Z))}
    B.gbOf('bulb').addGeo(new THREE.SphereGeometry(.055,12,8),M4(X,industrial?yb+.02:yb-.02,Z));
    const L=new THREE.PointLight(0xffb46a,industrial?2.2:1.7,11,2);L.position.set(X,yb-.15,Z);B.group.add(L);B.lights.push(L)}}

/* ---------- hub street life ---------- */
function hubDressing(B){const r=B.r,lines=B.def.lines||[];const isR=(x,z)=>B.k(x,z)==='road',isS=(x,z)=>B.k(x,z)==='walk';
  /* intersections from the road lines */
  const hs=lines.filter(l=>l[0]==='h').map(l=>l[1]),vs=lines.filter(l=>l[0]==='v').map(l=>l[1]);
  hs.forEach((zc,i)=>vs.forEach((xc,j)=>{
    const corners=[[xc-2,zc-2],[xc+2,zc-2],[xc-2,zc+2],[xc+2,zc+2]].filter(([x,z])=>isS(x,z));
    if(!corners.length)return;
    const [sx,sz]=corners[(i+j)%corners.length];const X=sx*TILE+1+(sx<xc?.55:-.55),Z=sz*TILE+1+(sz<zc?.55:-.55);
    W.streetSign(B,X,Z,i,3+j,false);
    /* stop signs on the minor (north-south) approaches: right-hand curb before the crossing */
    for(const[cx,cz,yaw]of[[xc-2,zc-2,Math.PI],[xc+2,zc+2,0]]){if(!isS(cx,cz))continue;const sx2=cx*TILE+1+(cx<xc?.6:-.6),sz2=cz*TILE+1+(cz<zc?.6:-.6);
      const pole=B.gbOf('galv');pole.addGeo(cylGeo(.035,.035,2.3,8),M4(sx2,1.15,sz2));stopSign(B,sx2,sz2,yaw)}
    const hc=corners[(i+j+1)%corners.length];W.hydrant(B,hc[0]*TILE+1+(hc[0]<xc?.6:-.6),hc[1]*TILE+1+(hc[1]<zc?-.4:.4),r()*6)}));
  /* lamps: cobra heads reaching over the road */
  for(let z=0;z<B.H;z++)for(let x=0;x<B.W;x++){if(B.g[z][x]!=='l')continue;let d=[0,1];for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]])if(isR(x+dx,z+dz))d=[dx,dz];
    W.streetLamp(B,x*TILE+1,z*TILE+1,d)}
  /* utility poles along the north side of Maple St */
  if(hs.length){const zc=hs[0];const zp=(zc-2)*TILE+.25;const pts=[];for(let x=3;x<B.W*TILE-4;x+=23){if(isR(Math.floor(x/TILE),zc-2))continue;pts.push([x,zp,Math.PI/2])}W.utilityLine(B,pts)}
  /* parked cars along curbs, away from the drive start and job rings */
  const avoid=[...(B.lvl.dests||[]).map(d=>[d.x,d.z]),B.lvl.vanStart?[B.lvl.vanStart.x,B.lvl.vanStart.z]:[0,0]];
  B.parked=[];
  for(const zc of hs)for(let tries=0;tries<4;tries++){const x=Math.floor(4+r()*(B.W-8));if(!isR(x,zc)||!isR(x-1,zc)||!isR(x+1,zc))continue;let bad=false;for(let dx=-2;dx<=2;dx++)if(isR(x+dx,zc-2)||isR(x+dx,zc+2)||!isR(x+dx,zc))bad=true;
    const side=r()<.5?-1:1,X=x*TILE+1,Z=(zc+side)*TILE+1-side*.1;if(avoid.some(([ax,az])=>Math.hypot(ax-X,az-Z)<14))bad=true;if(B.parked.some(p=>Math.hypot(p.x-X,p.z-Z)<10))bad=true;if(bad)continue;B.parked.push({x:X,z:Z,yaw:side>0?0:Math.PI})}
  for(const xc of vs)for(let tries=0;tries<3;tries++){const z=Math.floor(4+r()*(B.H-8));if(!isR(xc,z))continue;let bad=false;for(let dz=-2;dz<=2;dz++)if(isR(xc-2,z+dz)||isR(xc+2,z+dz)||!isR(xc,z+dz))bad=true;
    const side=r()<.5?-1:1,X=(xc+side)*TILE+1-side*.1,Z=z*TILE+1;if(avoid.some(([ax,az])=>Math.hypot(ax-X,az-Z)<14))bad=true;if(B.parked.some(p=>Math.hypot(p.x-X,p.z-Z)<10))bad=true;if(bad)continue;B.parked.push({x:X,z:Z,yaw:side>0?Math.PI/2:-Math.PI/2})}
}
function stopSign(B,x,z,yaw){const sg=B.gbOf('signs');const c=Math.cos(yaw),s=Math.sin(yaw),R=.38,y=2.25;const ctr=[x+s*.045,y,z+c*.045];
  const P=a=>[ctr[0]+Math.cos(a)*R*c,y+Math.sin(a)*R,ctr[2]-Math.cos(a)*R*s];const uv=a=>[.25+Math.cos(a)*.242,.125+Math.sin(a)*.121];
  for(let k=0;k<8;k++){const a0=k/8*6.283+Math.PI/8,a1=(k+1)/8*6.283+Math.PI/8;sg.tri(ctr,P(a0),P(a1),[[.25,.125],uv(a0),uv(a1)],null,[s,0,c]);
    const bk=[ctr[0]-s*.01,y,ctr[2]-c*.01],Pb=a=>[bk[0]+Math.cos(a)*R*c,y+Math.sin(a)*R,bk[2]-Math.cos(a)*R*s];sg.tri(bk,Pb(a0),Pb(a1),[[.75,.125],[.75,.125],[.75,.125]],null,[-s,0,-c])}}

/* front yard of a house: walk to the sidewalk, mulch beds with shrubs and flowers, mailbox, bins, side and back fences */
W.yard=(B,f)=>{/* f: {x0,z0,x1,z1 (footprint), door:{x,z,nx,nz} world, seed} */
  const r=rngOf(f.seed*31+5);const{door}=f;if(!door)return;const nx=door.nx,nz=door.nz;
  /* distance from the facade to the sidewalk along the door normal */
  let reach=0;for(let s=.5;s<8;s+=.5){const k=B.k(Math.floor((door.x+nx*s)/TILE),Math.floor((door.z+nz*s)/TILE));if(k==='walk'||k==='road'){reach=s-.25;break}}
  if(!reach)reach=2;const path=B.gbOf('path'),mulch=B.gbOf('mulch');const tx=-nz,tz=nx;/* along the facade */
  const P=(a,b,y)=>[door.x+nx*a+tx*b,y,door.z+nz*a+tz*b];
  const q=(gb,a0,a1,b0,b1,y,mpr)=>{const c=[P(a0,b0,y),P(a1,b0,y),P(a1,b1,y),P(a0,b1,y)];gb.quad(c[0],c[1],c[2],c[3],c.map(p=>[p[0]/mpr,p[2]/mpr]),null,[0,1,0])};
  q(path,-.02,reach+.3,-.6,.6,.008,1.2);
  /* b runs along the facade (direction tx,tz); facade edges relative to the door */
  const eA=Math.abs(nx)?(f.z0-door.z)*tz:(f.x0-door.x)*tx,eB=Math.abs(nx)?(f.z1-door.z)*tz:(f.x1-door.x)*tx;const bmin=Math.min(eA,eB),bmax=Math.max(eA,eB);
  for(const[b0,b1]of[[bmin+.3,-.9],[.9,bmax-.3]]){if(b1-b0<.8)continue;q(mulch,0,.95,b0,b1,.006,1.3);
    for(let b=b0+.45;b<b1-.3;b+=.9+r()*.5){const p=P(.5+(r()-.5)*.15,b,0);if(r()<.6)inst(B,'bush',p[0],0,p[2],r()*6,.42+r()*.18,.45+r()*.25);
      else tufts(B,p[0],p[2],.35,6,true)}
    const e=P(.95,b0,0),e2=P(.95,b1,0);B.gbOf('trimdark').obox((e[0]+e2[0])/2,.03,(e[2]+e2[2])/2,Math.hypot(e2[0]-e[0],e2[2]-e[2])/2,.04,.02,Math.atan2(-(e2[2]-e[2]),e2[0]-e[0]),1)}
  /* mailbox at the walk's end, a bin by the side of the house */
  const mb=P(reach-.1,1.0,0);inst(B,'mailbox',mb[0],0,mb[2],Math.atan2(nx,nz)+Math.PI,1);
  if(r()<.7){const bn=P(.7,bmax+.55,0);W.bin(B,bn[0],bn[2],Math.atan2(nx,nz)+(r()-.5)*.4,r()<.5)}};
/* wheelie bin: tapered body, lid with overhang, axle and wheels */
W.bin=(B,x,z,yaw,blue)=>{const gb=B.gbOf(blue?'binB':'binG'),dk=B.gbOf('tyreB');const prof=new THREE.BoxGeometry(.58,1,.7);const p=prof.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i)+.5;p.setX(i,p.getX(i)*(.88+.12*y));p.setZ(i,p.getZ(i)*(.86+.14*y))}prof.computeVertexNormals();
  gb.addGeo(prof,M4(x,.55,z,yaw));gb.addGeo(new THREE.BoxGeometry(.62,.05,.78),M4(x+Math.sin(yaw)*.03,1.075,z+Math.cos(yaw)*.03,yaw));gb.addGeo(new THREE.BoxGeometry(.5,.05,.06),M4(x-Math.sin(yaw)*.37,1.0,z-Math.cos(yaw)*.37,yaw));
  for(const s of[-1,1]){const w=cylGeo(.1,.1,.05,12);w.rotateZ(Math.PI/2);dk.addGeo(w,M4(x-Math.sin(yaw)*.3+Math.cos(yaw)*s*.28,.1,z-Math.cos(yaw)*.3-Math.sin(yaw)*s*.28,yaw))}};
/* grass tufts: queued, built as instanced cross-quads */
function tufts(B,x,z,rad,n,flowers){const r=B.r;const L=flowers?(B.flw||(B.flw=[])):(B.tuf||(B.tuf=[]));for(let i=0;i<n;i++){const a=r()*6.283,d=Math.sqrt(r())*rad;L.push(x+Math.cos(a)*d,z+Math.sin(a)*d,.5+r()*.55,r()*3.14)}}
function scatterGrass(B){const r=B.r;const dens=B.q==='low'?0:B.q==='high'?1.1:.55;if(!dens)return;
  for(let z=0;z<B.H;z++)for(let x=0;x<B.W;x++){if(B.k(x,z)!=='grass'||B.g[z][x]==='h')continue;
    const edge=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>{const k=B.k(x+dx,z+dz);return k==='walk'||k==='wall'||B.g[z+dz]&&B.g[z+dz][x+dx]==='h'})||B.g[z][x]==='t'||B.g[z][x]==='f';
    const n=Math.round((edge?7:2.5)*dens*(.4+fbm(x/3,z/3)*1.2));for(let i=0;i<n;i++){const X=x*TILE+r()*TILE,Z=z*TILE+r()*TILE;tufts(B,X,Z,.3,3,false)}}}
function buildTufts(B,list,flowers){if(!list||!list.length)return;const geo=new THREE.BufferGeometry();const P=[],U=[],N=[],I=[];
  for(let k=0;k<3;k++){const a=k/3*Math.PI,c=Math.cos(a)*.26,s=Math.sin(a)*.26,h=flowers?.4:.26,i0=P.length/3;P.push(-c,0,-s,c,0,s,c,h,s,-c,h,-s);U.push(0,0,1,0,1,1,0,1);N.push(0,1,0,0,1,0,0,1,0,0,1,0);I.push(i0,i0+1,i0+2,i0,i0+2,i0+3)}
  geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));geo.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));geo.setIndex(I);geo.computeBoundingBox();
  const mat=MC['tuft'+flowers]||(MC['tuft'+flowers]=new THREE.MeshStandardMaterial({map:grassTex(flowers),alphaTest:.5,side:THREE.DoubleSide,roughness:.95,color:lin(flowers?'#e4ead6':'#e6eed6')}));
  const chunk=30,cells={};for(let i=0;i<list.length;i+=4){const k=Math.floor(list[i]/chunk)+','+Math.floor(list[i+1]/chunk);(cells[k]||(cells[k]=[])).push(i)}
  const d=new THREE.Object3D(),col=new THREE.Color();
  for(const k in cells){const L=cells[k];const im=new THREE.InstancedMesh(geo,mat,L.length);const box=new THREE.Box3();
    L.forEach((i,j)=>{d.position.set(list[i],0,list[i+1]);d.rotation.set(0,list[i+3],0);d.scale.set(list[i+2],list[i+2]*(.8+((j*7)%5)*.1),list[i+2]);d.updateMatrix();im.setMatrixAt(j,d.matrix);
      const v=.8+fbm(list[i]/9,list[i+1]/9)*.4;col.setRGB(v*(1+((j*13)%7)*.02),v,v*.92);im.setColorAt(j,col);box.expandByPoint(d.position)});
    box.expandByScalar(.6);const bs=new THREE.Sphere();box.getBoundingSphere(bs);patchCull(im,bs);im.castShadow=false;im.receiveShadow=false;im.userData.tufts=true;B.group.add(im)}}

/* ---------- backdrop: rolling terrain, a ring of far houses and tree impostors ---------- */
const IMP={};
function impostor(name){if(IMP[name]!==undefined)return IMP[name];const g=C.ASSETS.gltf(name);if(!g||!C.renderer)return null;
  try{const R=C.renderer,sc=new THREE.Scene();const m=g.scene.clone(true);sc.add(m);const bb=new THREE.Box3().setFromObject(m),sz=bb.getSize(new THREE.Vector3()),ctr=bb.getCenter(new THREE.Vector3());
    const hw=Math.max(sz.x,sz.z)/2*1.05,hh=sz.y/2*1.02;const cam=new THREE.OrthographicCamera(-hw,hw,hh,-hh,.1,100);cam.position.set(ctr.x,ctr.y,ctr.z+40);cam.lookAt(ctr);
    sc.add(new THREE.HemisphereLight(0xdfeeff,0x4a5a3a,1.1));const dl=new THREE.DirectionalLight(0xfff2dd,1.6);dl.position.set(.5,1,.8);sc.add(dl);
    const rt=new THREE.WebGLRenderTarget(256,512,{minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,generateMipmaps:true});
    const prevT=R.getRenderTarget(),pc=R.getClearColor(new THREE.Color()),pa=R.getClearAlpha(),pe=sc.environment;
    R.setRenderTarget(rt);R.setClearColor(0x3c4a30,0);R.clear();R.render(sc,cam);R.setRenderTarget(prevT);R.setClearColor(pc,pa);
    IMP[name]={tex:rt.texture,w:hw*2,h:hh*2,y0:bb.min.y}}catch(e){console.warn('impostor failed',e);IMP[name]=null}
  return IMP[name]}
function backdrop(B){const r=rngOf(hashStr(B.id)+99);const Wm=B.W*TILE,Hm=B.H*TILE;const cx=Wm/2,cz=Hm/2;
  const dOut=(x,z)=>{const dx=Math.max(0,-x,x-Wm),dz=Math.max(0,-z,z-Hm);return Math.hypot(dx,dz)};
  /* terrain ring */
  const hgt=(x,z)=>{const d=dOut(x,z);return (sstep(14,150,d)*(5+30*fbm(x/90+7,z/90+3))+sstep(4,20,d)*(fbm(x/20,z/20)-.5)*1.2-.02)*(B.carve?B.carve(x,z):1)+(B.carveY?B.carveY(x,z):0)};
  const ext=260,st=8,axis=(a)=>{const v=[];for(let t=-ext;t<0;t+=st)v.push(t);const n=Math.max(1,Math.round(a/st));for(let k=0;k<=n;k++)v.push(a*k/n);for(let t=a+st;t<=a+ext;t+=st)v.push(t);return v};
  const xs=axis(Wm),zs=axis(Hm),g=new GB();const eps=.5;
  const nrm=(x,z)=>{const dx=hgt(x+eps,z)-hgt(x-eps,z),dz=hgt(x,z+eps)-hgt(x,z-eps);const v=new THREE.Vector3(-dx,2*eps,-dz).normalize();return v};
  const col=(x,z)=>{const d=dOut(x,z),v=(.7+fbm(x/30,z/30)*.4)*(1-sstep(60,240,d)*.25);return[v*.96,v,v*1.04]};
  for(let j=0;j+1<zs.length;j++)for(let i=0;i+1<xs.length;i++){const x0=xs[i],x1=xs[i+1],z0=zs[j],z1=zs[j+1];
    if(x0>=-.01&&x1<=Wm+.01&&z0>=-.01&&z1<=Hm+.01)continue;
    const pts=[[x0,z0],[x0,z1],[x1,z1],[x1,z0]].map(([x,z])=>[x,hgt(x,z),z]);
    g.quad(pts[0],pts[1],pts[2],pts[3],pts.map(p=>[p[0]/9,p[2]/9]),pts.map(p=>col(p[0],p[2])),[0,1,0])}
  const geo=g.geo();const pa=geo.attributes.position,na=geo.attributes.normal;for(let i=0;i<pa.count;i++){const v=nrm(pa.getX(i),pa.getZ(i));na.setXYZ(i,v.x,v.y,v.z)}
  const t=new THREE.Mesh(geo,matFor(B,'far'));t.receiveShadow=true;B.group.add(t);
  /* far houses (or warehouses) just past the border */
  const ind=B.id==='gary';const sid=B.gbOf(ind?'whsWall':'siding'),roof=B.gbOf(ind?'whsRoof':'roof'),fnd=B.gbOf('found');
  const ring=[];const per=2*(Wm+Hm);for(let s=0;s<per;s+=ind?26:17){let x,z,nx,nz;if(s<Wm){x=s;z=-1;nx=0;nz=-1}else if(s<Wm+Hm){x=Wm+1;z=s-Wm;nx=1;nz=0}else if(s<2*Wm+Hm){x=Wm-(s-Wm-Hm);z=Hm+1;nx=0;nz=1}else{x=-1;z=Hm-(s-2*Wm-Hm);nx=-1;nz=0}
    const d=16+r()*14;if(B.skipRing&&B.skipRing(x+nx*d,z+nz*d))continue;ring.push([x+nx*d,z+nz*d,nx,nz])}
  for(const[x,z,nx,nz]of ring){const w=ind?16+r()*10:9+r()*3,dd=ind?12+r()*8:7+r()*2,h=ind?6+r()*3:2.8+(r()<.3?2.7:0);const y0=hgt(x,z)-.2;
    const ax=Math.abs(nz)>0,hw=(ax?w:dd)/2,hd=(ax?dd:w)/2;const tint=ind?[1,1,1]:[[1,1,1],[.75,.85,.95],[.95,.88,.7],[.85,.8,.75]][Math.floor(r()*4)];
    sid.box(x-hw,y0,z-hd,x+hw,y0+h,z+hd,ind?2:1.4,tint,{});fnd.box(x-hw-.05,y0-.3,z-hd-.05,x+hw+.05,y0+.35,z+hd+.05,2,null,{top:true});
    if(ind){roof.floor(x-hw-.2,z-hd-.2,x+hw+.2,z+hd+.2,y0+h,2)}
    else{const rh=ax?hd*.55:hw*.55,o=.4;/* gable along the long side */
      if(ax){roof.quad([x-hw-o,y0+h-.2,z-hd-o],[x+hw+o,y0+h-.2,z-hd-o],[x+hw+o,y0+h+rh,z],[x-hw-o,y0+h+rh,z],[[0,0],[(w+2*o)/3,0],[(w+2*o)/3,(hd+o)/2.6],[0,(hd+o)/2.6]],null,[0,1,-1]);
        roof.quad([x-hw-o,y0+h-.2,z+hd+o],[x+hw+o,y0+h-.2,z+hd+o],[x+hw+o,y0+h+rh,z],[x-hw-o,y0+h+rh,z],[[0,0],[(w+2*o)/3,0],[(w+2*o)/3,(hd+o)/2.6],[0,(hd+o)/2.6]],null,[0,1,1]);
        for(const sx of[-1,1])sid.tri([x+sx*hw,y0+h,z-hd],[x+sx*hw,y0+h,z+hd],[x+sx*hw,y0+h+rh,z],[[0,0],[dd/1.4,0],[dd/2.8,rh/1.4]],tint,[sx,0,0])}
      else{roof.quad([x-hw-o,y0+h-.2,z-hd-o],[x-hw-o,y0+h-.2,z+hd+o],[x,y0+h+rh,z+hd+o],[x,y0+h+rh,z-hd-o],[[0,0],[(w+2*o)/3,0],[(w+2*o)/3,(hw+o)/2.6],[0,(hw+o)/2.6]],null,[-1,1,0]);
        roof.quad([x+hw+o,y0+h-.2,z-hd-o],[x+hw+o,y0+h-.2,z+hd+o],[x,y0+h+rh,z+hd+o],[x,y0+h+rh,z-hd-o],[[0,0],[(w+2*o)/3,0],[(w+2*o)/3,(hw+o)/2.6],[0,(hw+o)/2.6]],null,[1,1,0]);
        for(const sz of[-1,1])sid.tri([x-hw,y0+h,z+sz*hd],[x+hw,y0+h,z+sz*hd],[x,y0+h+rh,z+sz*hd],[[0,0],[dd/1.4,0],[dd/2.8,rh/1.4]],tint,[0,0,sz])}}
    /* dark windows */
    const gl=B.gbOf('glass');
    const fn=[-nx,-nz];const fcx=x+fn[0]*(ax?0:hw),fcz=z+fn[1]*(ax?hd:0);
    for(const o of ind?[-.3,.3]:[-.28,.28]){const L=w*o;if(ax)gl.wz(fcx+L-.6,fcx+L+.6,y0+1,y0+2.2,fcz+fn[1]*.02,fn[1],1);else gl.wx(fcz+L-.6,fcz+L+.6,y0+1,y0+2.2,fcx+fn[0]*.02,fn[0],1)}}
  /* trees on the hills: instanced, shown as baked impostors until the camera comes close */
  for(let i=0;i<(B.q==='low'?150:260);i++){const a=r()*6.283;const R0=Math.max(Wm,Hm)*.5;let x=cx+Math.cos(a)*(R0+6+Math.pow(r(),1.6)*170),z=cz+Math.sin(a)*(R0*.8+6+Math.pow(r(),1.6)*170);
    const d=dOut(x,z);if(d<5||B.skipRing&&B.skipRing(x,z))continue;if(ring.some(h=>Math.abs(h[0]-x)<9&&Math.abs(h[1]-z)<9))continue;const name=TREES[i%3];
    if(partsOf(name))inst(B,name,x,hgt(x,z)-.1,z,r()*6,1+r()*.5)}}

/* ---------- fallback house (when the buildings module is unavailable) ---------- */
/* merges into the level's shared siding/roof/trim geometry; returns an empty group carrying the same userData contract */
W.fallbackHouse=(B,o)=>{const{w,d,seed,facing}=o;const r=rngOf(seed*977+3);const cx=o.cx,cz=o.cz;const grp=new THREE.Group();
  const sidK=['siding','sidingB','sidingC','brickH'][Math.floor(r()*4)];const sid=B.gbOf(sidK),roof=B.gbOf('roof'),trim=B.gbOf('trim'),fnd=B.gbOf('found'),gl=B.gbOf('glass'),dr=B.gbOf('door');
  const x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2,H=2.9,FY=.35;const mpr=sidK==='brickH'?1.1:1.4;
  fnd.box(x0-.04,0,z0-.04,x1+.04,FY,z1+.04,2,null,{});sid.box(x0,FY,z0,x1,FY+H,z1,mpr,null,{top:true});
  /* corner boards and frieze */
  for(const[px,pz]of[[x0,z0],[x1,z0],[x0,z1],[x1,z1]])trim.box(px-.07,FY,pz-.07,px+.07,FY+H,pz+.07,1,null,{});
  trim.box(x0-.05,FY+H-.18,z0-.05,x1+.05,FY+H,z1+.05,1,null,{});
  /* gable roof, ridge along the long axis, 6/12 pitch, 0.45 m eaves */
  const alongX=w>=d,o2=.45,top=FY+H;const span=(alongX?d:w)/2+o2,rise=span*.5;const L0=(alongX?x0:z0)-o2*.6,L1=(alongX?x1:z1)+o2*.6,c=alongX?cz:cx;
  const slope=Math.hypot(span,rise);
  for(const s of[-1,1]){if(alongX){roof.quad([L0,top-o2*.5,c+s*span],[L1,top-o2*.5,c+s*span],[L1,top+rise-o2*.5+.02,c],[L0,top+rise-o2*.5+.02,c],[[L0/3,0],[L1/3,0],[L1/3,slope/2.4],[L0/3,slope/2.4]],null,[0,1,s]);
      trim.obox((L0+L1)/2,top-o2*.5-.1,c+s*span,(L1-L0)/2,.11,.03,0,1,null);
      sid.tri([(s<0?x0:x1),top,z0],[(s<0?x0:x1),top,z1],[(s<0?x0:x1),top+rise-o2*.5,cz],[[z0/mpr,0],[z1/mpr,0],[cz/mpr,rise/mpr]],null,[s,0,0])}
    else{roof.quad([c+s*span,top-o2*.5,L0],[c+s*span,top-o2*.5,L1],[c,top+rise-o2*.5+.02,L1],[c,top+rise-o2*.5+.02,L0],[[L0/3,0],[L1/3,0],[L1/3,slope/2.4],[L0/3,slope/2.4]],null,[s,1,0]);
      trim.obox(c+s*span,top-o2*.5-.1,(L0+L1)/2,.03,.11,(L1-L0)/2,0,1,null);
      sid.tri([x0,top,(s<0?z0:z1)],[x1,top,(s<0?z0:z1)],[cx,top+rise-o2*.5,(s<0?z0:z1)],[[x0/mpr,0],[x1/mpr,0],[cx/mpr,rise/mpr]],null,[0,0,s])}}
  /* soffit under the eaves */
  trim.floor(alongX?L0:c-span,alongX?c-span:L0,alongX?L1:c+span,alongX?c+span:L1,top-o2*.5-.2,3,null,true);
  /* windows and door on every facade */
  const fx={'+z':[0,1],'-z':[0,-1],'+x':[1,0],'-x':[-1,0]};const fn=fx[facing]||[0,1];
  const facade=(nx,nz,isFront)=>{const len=nz?w:d,cxF=nz?cx:cz,base=nz?(nz>0?z1:z0):(nx>0?x1:x0);const n=nz||nx;const slots=Math.max(1,Math.floor(len/2.6));
    for(let i=0;i<slots;i++){const t=cxF-len/2+len*(i+.5)/slots;if(isFront&&Math.abs(t-cxF)<.9)continue;const ww=.55,y0=FY+.95,y1=FY+2.3;
      if(nz){gl.wz(t-ww,t+ww,y0,y1,base+n*.015,n,1);trim.box(t-ww-.09,y0-.09,Math.min(base,base+n*.06),t+ww+.09,y0,Math.max(base,base+n*.06),1,null,{});trim.box(t-ww-.07,y1,Math.min(base,base+n*.04),t+ww+.07,y1+.09,Math.max(base,base+n*.04),1,null,{});
        trim.box(t-ww-.07,y0,Math.min(base,base+n*.04),t-ww,y1,Math.max(base,base+n*.04),1,null,{});trim.box(t+ww,y0,Math.min(base,base+n*.04),t+ww+.07,y1,Math.max(base,base+n*.04),1,null,{});trim.box(t-.02,y0,Math.min(base,base+n*.03),t+.02,y1,Math.max(base,base+n*.03),1,null,{})}
      else{gl.wx(t-ww,t+ww,y0,y1,base+n*.015,n,1);trim.box(Math.min(base,base+n*.06),y0-.09,t-ww-.09,Math.max(base,base+n*.06),y0,t+ww+.09,1,null,{});trim.box(Math.min(base,base+n*.04),y1,t-ww-.07,Math.max(base,base+n*.04),y1+.09,t+ww+.07,1,null,{});
        trim.box(Math.min(base,base+n*.04),y0,t-ww-.07,Math.max(base,base+n*.04),y1,t-ww,1,null,{});trim.box(Math.min(base,base+n*.04),y0,t+ww,Math.max(base,base+n*.04),y1,t+ww+.07,1,null,{});trim.box(Math.min(base,base+n*.03),y0,t-.02,Math.max(base,base+n*.03),y1,t+.02,1,null,{})}}
    if(isFront){const t=cxF;if(nz){dr.wz(t-.48,t+.48,FY,FY+2.1,base+n*.02,n,1);trim.box(t-.6,FY,Math.min(base,base+n*.06),t-.48,FY+2.22,Math.max(base,base+n*.06),1,null,{});trim.box(t+.48,FY,Math.min(base,base+n*.06),t+.6,FY+2.22,Math.max(base,base+n*.06),1,null,{});trim.box(t-.6,FY+2.1,Math.min(base,base+n*.06),t+.6,FY+2.25,Math.max(base,base+n*.06),1,null,{});
        fnd.box(t-.8,0,Math.min(base,base+n*.7),t+.8,.18,Math.max(base,base+n*.7),1,null,{})}
      else{dr.wx(t-.48,t+.48,FY,FY+2.1,base+n*.02,n,1);trim.box(Math.min(base,base+n*.06),FY,t-.6,Math.max(base,base+n*.06),FY+2.22,t-.48,1,null,{});trim.box(Math.min(base,base+n*.06),FY,t+.48,Math.max(base,base+n*.06),FY+2.22,t+.6,1,null,{});trim.box(Math.min(base,base+n*.06),FY+2.1,t-.6,Math.max(base,base+n*.06),FY+2.25,t+.6,1,null,{});
        fnd.box(Math.min(base,base+n*.7),0,t-.8,Math.max(base,base+n*.7),.18,t+.8,1,null,{})}}};
  facade(0,1,fn[1]===1);facade(0,-1,fn[1]===-1);facade(1,0,fn[0]===1);facade(-1,0,fn[0]===-1);
  const doorL={x:fn[0]?fn[0]*w/2:0,z:fn[1]?fn[1]*d/2:0,nx:fn[0],nz:fn[1]};
  /* invisible proxy so bullets and the camera hit the house */
  const proxy=new THREE.Mesh(new THREE.BoxGeometry(w,FY+H+rise*.6,d),plain('proxy','#000'));proxy.visible=false;proxy.position.y=(FY+H+rise*.6)/2;grp.add(proxy);
  grp.userData={colliders:[{x0:-w/2,z0:-d/2,x1:w/2,z1:d/2}],door:doorL,lights:[],proxy:true};return grp};

/* ---------- special tiles ---------- */
const proxyMat=new THREE.MeshBasicMaterial({visible:false});
W.proxy=(B,w,h,d,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),proxyMat);m.position.set(x,y,z);m.visible=false;B.group.add(m);return m};
/* cover crates: 2x2 crates (or two long ones) filling the 1.7 m cell, 1.15 m high */
W.crate=(B,X,Z)=>{const r=B.r;const kind=B.id==='dave'?'crate_slat':r()<.65?'crate':'crate_long';
  if(!partsOf(kind))return false;
  if(kind==='crate_long'){const a=r()<.5?0:Math.PI/2;for(const o of[-.43,.43]){const ox=a?o:0,oz=a?0:o;inst(B,kind,X+ox+(r()-.5)*.04,0,Z+oz+(r()-.5)*.04,a+(r()-.5)*.06,.98,1.42)}}
  else{const sy=kind==='crate'?1.33:1.62;for(const ox of[-.43,.43])for(const oz of[-.43,.43])inst(B,kind,X+ox+(r()-.5)*.05,0,Z+oz+(r()-.5)*.05,(r()-.5)*.12+(r()<.3?Math.PI/2:0),.94,sy)}
  return true};
/* hedge tile: overlapping shrubs squeezed to 0.8 m deep plus a dense core */
W.hedge=(B,X,Z,alongX)=>{const r=B.r;if(!partsOf('bush'))return false;
  for(const o of[-.7,-.2,.3,.8]){const ox=alongX?o-.05:0,oz=alongX?0:o-.05;inst(B,'bush',X+ox+(r()-.5)*.1,-.08,Z+oz+(r()-.5)*.1,r()*6.28,.55+r()*.1,.82+r()*.12,{sz:.5})}
  const core=B.gbOf('hedgecore');if(alongX)core.box(X-1,0,Z-.22,X+1,.9,Z+.22,1,null,{});else core.box(X-.22,0,Z-1,X+.22,.9,Z+1,1,null,{});return true};
/* stash table: dining table scaled to the 1.8 x 1.1 cell; returns the bag meshes to remove when smashed */
W.stash=(B,X,Z)=>{const r=B.r;const bb=W.modelBox('table_dining');let top=.85;
  if(bb){const sx=1.8/(bb.max.x-bb.min.x),sy=.85/(bb.max.y-bb.min.y);inst(B,'table_dining',X,0,Z,0,sx,sy,{sz:1.1/(bb.max.z-bb.min.z)});top=.86}
  else{const m=B.gbOf('trimdark');m.box(X-.9,.78,Z-.55,X+.9,.85,Z+.55,1,null,{});for(const sx of[-.8,.8])for(const sz of[-.45,.45])m.box(X+sx-.04,0,Z+sz-.04,X+sx+.04,.78,Z+sz+.04,1,null,{})}
  const bags=[];const wrap=matFor(B,'wrap'),tape=matFor(B,'tape');
  for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.3,.11,.21),i%2?tape:wrap);m.position.set(X-.55+i*.27,top+.055,Z+(r()-.5)*.3);m.rotation.y=(r()-.5)*.4;m.castShadow=true;B.group.add(m);bags.push(m)}
  for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.3,.11,.21),wrap);m.position.set(X-.4+i*.3,top+.165,Z+(r()-.5)*.2);m.rotation.y=(r()-.5)*.5;m.castShadow=true;B.group.add(m);bags.push(m)}
  const sc=new THREE.Mesh(new THREE.BoxGeometry(.24,.05,.2),matFor(B,'metal'));sc.position.set(X+.62,top+.025,Z-.28);B.group.add(sc);bags.push(sc);
  return bags};
/* stolen package pile */
W.pile=(B,X,Z)=>{const r=B.r;const g=new THREE.Group();let y=0;
  for(let i=0;i<6;i++){const w=.34+r()*.3,h=.22+r()*.25,d=.3+r()*.25;const x=(r()-.5)*.6,z=(r()-.5)*.6;W.cardboard(B,g,w,h,d,x,i<3?h/2:.3+h/2+(i-3)*.02,z,r()*1.6)}
  g.position.set(X,0,Z);B.group.add(g);return g};
/* ammo can: olive steel box with lid latch and stencil band */
W.ammo=(B,X,Z)=>{const g=new THREE.Group();const am=matFor(B,'ammo'),dk=matFor(B,'metal');
  for(const[ox,oz,ry]of[[-.2,0,.1],[.22,.05,-.15]]){const b=new THREE.Mesh(new THREE.BoxGeometry(.3,.2,.16),am);b.position.set(ox,.1,oz);b.rotation.y=ry;b.castShadow=true;g.add(b);
    const l=new THREE.Mesh(new THREE.BoxGeometry(.31,.03,.17),dk);l.position.set(ox,.205,oz);l.rotation.y=ry;g.add(l);const h=new THREE.Mesh(new THREE.BoxGeometry(.12,.02,.03),dk);h.position.set(ox,.225,oz);h.rotation.y=ry;g.add(h)}
  const y=new THREE.Mesh(new THREE.BoxGeometry(.32,.18,.18),am);y.position.set(0,.31,.02);y.rotation.y=.4;y.castShadow=true;g.add(y);
  g.position.set(X,0,Z);B.group.add(g);return g};
/* kettle grill and a proper bounce house for the block party */
W.grill=(B,X,Z)=>{const g=new THREE.Group();const k=matFor(B,'grill'),st=matFor(B,'steel');
  const bowl=new THREE.Mesh(new THREE.SphereGeometry(.34,24,12,0,Math.PI*2,Math.PI/2,Math.PI/2),k);bowl.position.y=.8;g.add(bowl);
  const lid=new THREE.Mesh(new THREE.SphereGeometry(.345,24,10,0,Math.PI*2,0,Math.PI/2.3),k);lid.position.set(0,.86,-.18);lid.rotation.x=-1.1;g.add(lid);
  const grate=new THREE.Mesh(new THREE.CylinderGeometry(.33,.33,.01,24),st);grate.position.y=.8;g.add(grate);
  for(let i=0;i<3;i++){const a=i/3*6.283;const l=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.75,6),st);l.position.set(Math.cos(a)*.22,.38,Math.sin(a)*.22);l.rotation.set(Math.sin(a)*.25,0,-Math.cos(a)*.25);g.add(l)}
  for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.18,.04,.12),plain('meat','#5a2a18',{rough:.6}));m.position.set(-.12+i*.13,.83,(i-1)*.06);g.add(m)}
  const tb=new THREE.Mesh(new THREE.BoxGeometry(1.2,.05,.6),matFor(B,'fence'));tb.position.set(.95,.75,0);g.add(tb);for(const sx of[.45,1.45])for(const sz of[-.25,.25]){const l=new THREE.Mesh(new THREE.BoxGeometry(.05,.75,.05),st);l.position.set(sx,.375,sz);g.add(l)}
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});g.position.set(X-.3,0,Z);B.group.add(g);return g};
W.bounce=(B,X,Z)=>{const g=new THREE.Group();const R=matFor(B,'vinylR'),Bl=matFor(B,'vinylB'),Y=matFor(B,'vinylY');
  const base=new THREE.Mesh(new THREE.BoxGeometry(3,.55,3),Bl);base.position.y=.275;g.add(base);
  const fl=new THREE.Mesh(new THREE.BoxGeometry(2.6,.06,2.6),R);fl.position.y=.58;g.add(fl);
  for(const sx of[-1.3,1.3])for(const sz of[-1.3,1.3]){const c=new THREE.Mesh(new THREE.CylinderGeometry(.24,.28,2.3,16),R);c.position.set(sx,1.4,sz);g.add(c);const t=new THREE.Mesh(new THREE.SphereGeometry(.32,16,10),Y);t.position.set(sx,2.65,sz);g.add(t)}
  for(const[sx,sz,ry]of[[0,-1.3,0],[0,1.3,0],[-1.3,0,Math.PI/2]]){const w=new THREE.Mesh(new THREE.BoxGeometry(2.3,1.1,.12),Bl);w.position.set(sx,1.1,sz);w.rotation.y=ry;g.add(w);
    const n=new THREE.Mesh(new THREE.BoxGeometry(2.3,.9,.03),plain('net','#222',{rough:.8,transparent:true,opacity:.45}));n.position.set(sx,2.1,sz);n.rotation.y=ry;g.add(n)}
  const roof=new THREE.Mesh(new THREE.CylinderGeometry(.01,2.1,1.1,4,1),Y);roof.rotation.y=Math.PI/4;roof.position.y=3.1;g.add(roof);
  const rib=new THREE.Mesh(new THREE.TorusGeometry(1.4,.12,8,24),R);rib.rotation.x=Math.PI/2;rib.position.y=2.55;rib.scale.set(1,1,.9);g.add(rib);
  const ramp=new THREE.Mesh(new THREE.BoxGeometry(1.2,.3,1.4),Y);ramp.position.set(1.95,.15,0);g.add(ramp);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});g.position.set(X,0,Z);B.group.add(g);return g};
/* lot fences between neighbouring houses and along shared back lines (hub) */
W.lotFences=(B,houses)=>{const out=[];const T=.08;
  const addF=(ax,az,bx,bz)=>{W.fence(B,ax,az,bx,bz);B.lvl.colliders.push({x0:Math.min(ax,bx)-T,z0:Math.min(az,bz)-T,x1:Math.max(ax,bx)+T,z1:Math.max(az,bz)+T})};
  for(const h of houses){const nz=h.fn[1];if(!nz)continue;const front=nz>0?h.z1:h.z0,back=nz>0?h.z0:h.z1;
    /* rear line: halfway to the house behind, or 1.4 m behind */
    const behind=houses.find(o=>o!==h&&o.fn[1]===-nz&&Math.abs((o.x0+o.x1)/2-(h.x0+h.x1)/2)<1&&Math.abs((nz>0?o.z1:o.z0)-back)<8);
    const rear=behind?(back+(nz>0?behind.z1:behind.z0))/2:back-nz*1.4;
    const right=houses.find(o=>o!==h&&o.fn[1]===nz&&o.x0>h.x1&&o.x0-h.x1<3.5&&Math.abs(o.z0-h.z0)<.5);
    if(right){const gx=(h.x1+right.x0)/2;addF(gx,front-nz*.8,gx,rear)}
    if(!behind||nz<0){const left=houses.find(o=>o!==h&&o.fn[1]===nz&&o.x1<h.x0&&h.x0-o.x1<3.5&&Math.abs(o.z0-h.z0)<.5);
      const xa=left?(left.x1+h.x0)/2:h.x0-.6,xb=right?(h.x1+right.x0)/2:h.x1+.6;addF(xa,rear,xb,rear)}}};
/* ---------- finish: turn merged builders into meshes ---------- */
const DECALS={d_floor:()=>decalMat('d_floor',floorDecalTex(),{rough:.35}),d_puddle:()=>{if(MC.puddle)return MC.puddle;const m=new THREE.MeshStandardMaterial({color:lin('#15171a'),roughness:.0,metalness:.3,alphaMap:puddleTex(),transparent:true,opacity:.8,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-6,envMapIntensity:1.6});return MC.puddle=m},
  d_patch:()=>{const t=C.ASSETS.decal&&C.ASSETS.decal('asphalt_patch');return t?decalMat('d_patch',t,{color:'#8a8a8a',rough:.9}):null},
  d_leakA:()=>{const t=C.ASSETS.decal&&C.ASSETS.decal('leak_a');return t?decalMat('d_leakA',t,{rough:.9}):null},d_leakB:()=>{const t=C.ASSETS.decal&&C.ASSETS.decal('leak_b');return t?decalMat('d_leakB',t,{rough:.9}):null},
  d_graf:()=>decalMat('d_graf',graffitiTex(),{rough:.7}),d_post:()=>decalMat('d_post',posterTex(),{rough:.8}),d_manhole:()=>decalMat('d_mh',manholeTex(),{rough:.55}),d_drain:()=>decalMat('d_drain',drainTex(),{rough:.6}),
  leaves:()=>plain('leavesF','#4b7f3d',{rough:.9,vcol:true})};
W.finish=(B,o={})=>{/* o.bare: no street dressing/clutter/backdrop (the open world dresses its own chunks); o.before(B): last look at the builders */
  if(!o.bare){if(B.hub)hubDressing(B);if(!B.hub){clutter(B);lights(B)}}
  scatterGrass(B);if(o.before)o.before(B);
  if(!o.bare)try{backdrop(B)}catch(e){console.warn('backdrop failed',e)}
  for(const key in B.gb){const gb=B.gb[key];if(!gb.n)continue;let m=DECALS[key]?DECALS[key]():matFor(B,key);if(!m)continue;
    const mesh=new THREE.Mesh(gb.geo(),m);mesh.receiveShadow=true;mesh.castShadow=!B.shadowless.has(key)&&!key.startsWith('d_');if(key.startsWith('d_')||key==='paint'||key==='joint')mesh.renderOrder=1;mesh.userData.wkey=key;B.group.add(mesh);
    if(key==='ext'||key==='int'||key==='cap')B.lvl.solids.push(mesh)}
  buildInst(B);buildTufts(B,B.tuf,false);buildTufts(B,B.flw,true);
  W._last=B;W.quality(B.q,B);
  return B};
/* graphics setting changed: hide grass tufts on Low */
W.quality=(q,B)=>{const b=B||W._last;if(!b)return;b.q=q;b.lod.forEach(l=>l.near=undefined);b.group.traverse(o=>{if(o.userData&&o.userData.tufts)o.visible=q!=='low'})};
W._track=B=>{W._last=B};
/* per frame: swap tree chunks between real meshes and impostors by camera distance */
W.update=(lvl,cam)=>{const B=lvl&&lvl.world;if(!B||!B.lod.length)return;const R=B.q==='low'?24:B.q==='high'?60:38;IMPU.uCam.value.copy(cam);IMPU.uR.value=R;
  for(const l of B.lod){const d=Math.hypot(l.c.x-cam.x,l.c.z-cam.z)-l.r;const near=d<R;if(l.near===near)continue;l.near=near;for(const m of l.real)m.visible=near}};
W.matFor=matFor;W.inst=inst;W.backdrop=backdrop;W.LEVEL_STYLE=LEVEL_STYLE;W.buildInst=buildInst;W.TREES=TREES;W.GB=GB;W.rng=rngOf;W.partsOf=partsOf;W.tufts=tufts;
window.HT.World=W;
})();
