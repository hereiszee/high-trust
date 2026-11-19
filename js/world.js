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
function pegTex(){if(CT.peg)return CT.peg;const c=canvas(256,128),x=c.getContext('2d');x.fillStyle='#b89a72';x.fillRect(0,0,256,128);x.fillStyle='#4a3a28';for(let i=4;i<256;i+=10)for(let j=4;j<128;j+=10){x.beginPath();x.arc(i,j,1.6,0,6.283);x.fill()}return CT.peg=ctex(c)}
function rugTex(fine){const k=fine?'rugF':'rugW';if(CT[k])return CT[k];const c=canvas(512,356),x=c.getContext('2d');const r=rngOf(fine?71:73);
  if(fine){x.fillStyle='#7a1f22';x.fillRect(0,0,512,356);x.strokeStyle='#1f2a4a';x.lineWidth=26;x.strokeRect(18,18,476,320);x.strokeStyle='#d9b77a';x.lineWidth=5;x.strokeRect(36,36,440,284);x.strokeRect(8,8,496,340);
    x.fillStyle='#1f2a4a';x.beginPath();x.ellipse(256,178,120,80,0,0,6.283);x.fill();x.fillStyle='#d9b77a';x.beginPath();x.ellipse(256,178,70,44,0,0,6.283);x.fill();x.fillStyle='#7a1f22';x.beginPath();x.ellipse(256,178,30,18,0,0,6.283);x.fill();
    for(let i=0;i<4;i++){const cx=i%2?420:92,cy=i<2?86:270;x.fillStyle='#d9b77a';x.beginPath();x.moveTo(cx,cy-24);x.lineTo(cx+24,cy);x.lineTo(cx,cy+24);x.lineTo(cx-24,cy);x.fill()}}
  else{x.fillStyle='#9c8a6a';x.fillRect(0,0,512,356);for(let i=0;i<4000;i++){x.fillStyle=`rgba(${r()<.5?'60,50,35':'200,185,150'},${r()*.15})`;x.fillRect(r()*512,r()*356,2,2+r()*4)}
    x.strokeStyle='#5a4a34';x.lineWidth=14;x.strokeRect(10,10,492,336);for(let i=0;i<5;i++){const g=x.createRadialGradient(r()*512,r()*356,0,r()*512,r()*356,30+r()*60);g.addColorStop(0,'rgba(50,35,20,.35)');g.addColorStop(1,'rgba(50,35,20,0)');x.fillStyle=g;x.fillRect(0,0,512,356)}}
  for(let i=0;i<9000;i++){x.fillStyle=`rgba(0,0,0,${r()*.06})`;x.fillRect(r()*512,r()*356,1,1)}
  return CT[k]=ctex(c)}
function hayTex(){if(CT.hay)return CT.hay;const c=canvas(256,256),x=c.getContext('2d');const r=rngOf(81);x.fillStyle='#c9a85a';x.fillRect(0,0,256,256);
  for(let i=0;i<2600;i++){x.strokeStyle=`rgba(${r()<.5?'120,90,30':'240,215,140'},${.3+r()*.4})`;x.lineWidth=1+r();x.beginPath();const px=r()*256,py=r()*256;x.moveTo(px,py);x.lineTo(px+(r()-.5)*30,py+(r()-.5)*6);x.stroke()}
  x.fillStyle='rgba(60,40,20,.6)';x.fillRect(0,70,256,5);x.fillRect(0,180,256,5);return CT.hay=ctex(c,true,true)}
function chainTex(){if(CT.chain)return CT.chain;const c=canvas(64,64),x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,64,64);x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.moveTo(0,32);x.lineTo(32,0);x.lineTo(64,32);x.lineTo(32,64);x.closePath();x.stroke();const t=ctex(c,false,true);return CT.chain=t}
function netTex(){if(CT.net)return CT.net;const c=canvas(64,64),x=c.getContext('2d');x.clearRect(0,0,64,64);x.strokeStyle='rgba(20,20,20,1)';x.lineWidth=4;for(let i=0;i<=64;i+=16){x.beginPath();x.moveTo(i,0);x.lineTo(i,64);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(64,i);x.stroke()}const t=ctex(c,true,true);return CT.net=t}
function bannerTex(){if(CT.ban)return CT.ban;const c=canvas(1024,192),x=c.getContext('2d');x.fillStyle='#f4efe2';x.fillRect(0,0,1024,192);const cols=['#d8392b','#2457b3','#f2c230','#3a9a4a'];
  for(let i=0;i<16;i++){x.fillStyle=cols[i%4];x.beginPath();x.moveTo(i*64,0);x.lineTo(i*64+64,0);x.lineTo(i*64+32,28);x.fill()}
  x.fillStyle='#1d2b52';x.font='900 92px Impact, "Arial Black", sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('LINDEN PARK BLOCK PARTY',512,112,960);return CT.ban=ctex(c)}
function manholeTex(){if(CT.mh)return CT.mh;const c=canvas(256,256),x=c.getContext('2d');x.fillStyle='#2b2a28';x.beginPath();x.arc(128,128,124,0,6.283);x.fill();
  x.strokeStyle='#4a4743';x.lineWidth=6;x.beginPath();x.arc(128,128,112,0,6.283);x.stroke();x.lineWidth=4;for(let i=-100;i<=100;i+=18){x.beginPath();x.moveTo(128+i,30);x.lineTo(128+i,226);x.stroke()}
  x.fillStyle='#2b2a28';x.fillRect(60,108,136,40);x.fillStyle='#5a5650';x.font='bold 26px Arial';x.textAlign='center';x.fillText('SEWER',128,138);
  return CT.mh=ctex(c)}
function drainTex(){if(CT.drain)return CT.drain;const c=canvas(256,128),x=c.getContext('2d');x.fillStyle='#3a3936';x.fillRect(0,0,256,128);x.fillStyle='#090909';for(let i=0;i<12;i++)x.fillRect(14+i*20,14,10,100);
  return CT.drain=ctex(c)}

/* ---------- materials ---------- */
const MC={};
/* occluder fade: fragments near the camera, or between the camera and the player, dissolve with a screen-space dither.
   Used on foliage, poles, signs and fences so they never swallow the third-person or chase camera. Shadows are unaffected. */
const FADE={uFadeEye:{value:new THREE.Vector3()},uFadeOn:{value:0}};
const f2=v=>(+v).toFixed(2);
function fadeMat(m,r0=1.2,r1=3){if(Array.isArray(m)){m.forEach(x=>fadeMat(x,r0,r1));return m}if(!m||m.userData.htFade)return m;m.userData.htFade=true;const prev=m.onBeforeCompile,pk=m.customProgramCacheKey;
  m.onBeforeCompile=(sh,r)=>{if(prev)prev.call(m,sh,r);sh.uniforms.uFadeEye=FADE.uFadeEye;sh.uniforms.uFadeOn=FADE.uFadeOn;
    sh.vertexShader='varying vec3 vFadeW;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n{vec4 fw=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nfw=instanceMatrix*fw;\n#endif\nvFadeW=(modelMatrix*fw).xyz;}');
    sh.fragmentShader='varying vec3 vFadeW;uniform vec3 uFadeEye;uniform float uFadeOn;\n'+sh.fragmentShader.replace('void main() {','void main() {\nif(uFadeOn>.5){vec3 cw=vFadeW-cameraPosition;float fd=length(cw);vec3 ab=uFadeEye-cameraPosition;float t=clamp(dot(cw,ab)/max(dot(ab,ab),1e-4),0.,1.);float k=smoothstep('+f2(r0)+','+f2(r1)+',fd);if(t<.97)k=min(k,smoothstep(.5,1.4,length(cw-ab*t)));float ign=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(k<ign)discard;}')};
  m.customProgramCacheKey=()=>(pk?pk.call(m):'')+'|htfade'+r0+r1;m.needsUpdate=true;return m}
W.focus=eye=>{FADE.uFadeEye.value.copy(eye);FADE.uFadeOn.value=1};
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
  gary:{ext:['metal',2.2,'#d2cec6'],int:['paintwall',2.6,'#c4c1b4'],floor:['concfloor',3,'#b8b4aa'],lot:'#9c9890',joist:'#6d6a66',lamp:'industrial',wain:['paintwall',1.25,'trimdark',2.6,false],wainCol:'#7d8a84'},
  rick:{ext:['brick',1.1,'#d8c8bc'],int:['paintwall',2.6,'#e2dcc0'],ceil:.18,floor:['woodfloor',1.4,'#c9b49a'],lot:'#a29e98',joist:'#6b5a46',lamp:'bulb',wain:['woodfloor',1.0,'trim',1.2],wainCol:'#a88866',eaves:true},
  dave:{ext:['brick',1.1,'#ffffff'],int:['paintwall',2.6,'#fff'],floor:['grass',2.2,'#fff'],lot:'#a29e98',joist:'#6b5a46',lamp:'bulb'},
  doug:{ext:['paintwall',2.6,'#ece0c8'],int:['paintwall',2.6,'#f3ead8'],ceil:0,noJoists:true,stucco:'#f4e4c4',floor:['woodfloor',1.4,'#b99a78'],lot:'#c8c0b4',joist:'#5a4634',lamp:'bulb',wain:['woodfloor',1.05,'trim',1.0],wainCol:'#6e4c34',crown:true,eaves:true,lit:true,pavers:true}};
function matFor(B,key){const st=B.style;
  switch(key){
    case 'road':return surf('road','asphalt',{color:'#8b8b8b',fallback:'#3e4045',ns:1.2,macro:.6});
    case 'lot':return st.pavers?surf('lot'+B.id,'pavers',{color:st.lot,fallback:'#9a8e80',macro:.4}):surf('lot'+B.id,'asphalt',{color:st.lot||'#9a9894',fallback:'#4a4b4f',ns:1.2,macro:.6});
    case 'walk':return surf('walk','sidewalk',{color:'#c9cbcf',fallback:'#b7b2a6',macro:.45});
    case 'curb':return surf('curb','sidewalk',{color:'#dadcdf',fallback:'#c9c5bb',macro:.2,po:1});
    case 'gutter':return surf('gutter','sidewalk',{color:'#9d9fa2',fallback:'#8f8b82',macro:.2,po:1});
    case 'path':return surf('path','pavers',{color:'#dcdad6',fallback:'#b9b4aa',po:1,macro:.3});
    case 'mulch':return surf('mulch','mulch',{color:'#c8b8a8',fallback:'#4a3826',po:1,macro:.3});
    case 'grass':{const m=surf('grass','grass',{color:'#dfe8cf',fallback:'#5d8a4a',macro:.7,ns:.8});m.roughnessMap=null;m.roughness=1;m.envMapIntensity=.55;return m}
    case 'dirt':return surf('dirt','mulch',{color:'#a99a8a',fallback:'#5a4a36',macro:.5});
    case 'inside':return st.floor?surf('in'+B.id,st.floor[0],{color:st.floor[2],fallback:'#8f8b82',macro:.5}):surf('inhub','concfloor',{});
    case 'ext':{if(st.stucco){const bm=window.HT.Buildings&&window.HT.Buildings.materials;if(bm&&bm.stucco&&bm.stucco.map){if(MC['ext'+B.id])return MC['ext'+B.id];const m=bm.stucco.clone();m.color=lin(st.stucco);return MC['ext'+B.id]=m}}
      return surf('ext'+B.id,st.ext[0],{color:st.ext[2],fallback:B.def.wall||'#999',macro:.45})}
    case 'ceil':{const m=surf('ceil'+B.id,'paintwall',{color:B.id==='doug'?'#fbf6ec':'#d8d2c0',fallback:'#e8e2d4',macro:.3,side:THREE.FrontSide});m.emissive=lin(B.id==='doug'?'#4a4036':'#2c2a24');return m}
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
    case 'fence':return surf('fence','plywood',{color:'#cdb89c',fallback:'#9a8064',macro:.2});
    case 'metal':return plain('metaldark','#3a3d42',{rough:.45,metal:.8});
    case 'galv':return plain('galv','#9aa0a6',{rough:.4,metal:.9});
    case 'pole':return surf('pole','woodfloor',{color:'#8c7a68',fallback:'#5a4a3c',macro:0});
    case 'paint':{if(MC.paint)return MC.paint;const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,alphaMap:wornTex(),transparent:true,depthWrite:false,opacity:.92,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-6});return MC.paint=m}
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
    case 'drive':return surf('drive','sidewalk',{color:'#d6d6d2',fallback:'#bdb9b0',macro:.4});
    case 'bollard':return plain('bollard','#e5b81e',{rough:.45});
    case 'benchwood':return surf('benchwood','woodfloor',{color:'#c99a6a',fallback:'#7a5636',macro:0});
    case 'wain':{const w=B.style.wain||['paintwall'];return surf('wain'+B.id,w[0],{color:B.style.wainCol||'#888',fallback:B.style.wainCol||'#777',macro:.3})}
    case 'winglow':{if(MC.winglow)return MC.winglow;return MC.winglow=new THREE.MeshStandardMaterial({color:lin('#3a2a18'),emissive:lin('#ffb866'),emissiveIntensity:1.3,roughness:.15,metalness:.1})}
    case 'shutter':return plain('shutter','#2f4636',{rough:.6});
    case 'curtain':return plain('curtain','#7a2f2a',{rough:.95,side:THREE.DoubleSide});
    case 'bottle':return plain('bottle','#4a6a3a',{rough:.12,metal:.1,vcol:true,envI:1.4});
    case 'card2':return plain('card2','#b08a5a',{rough:.85,vcol:true});
    case 'benchtop':return surf('benchtop','plywood',{color:'#c9b08e',fallback:'#8a6a48',macro:0});
    case 'pegboard':return plain('pegboard','#b89a72',{rough:.8,map:pegTex()});
    case 'tools':return plain('tools','#ffffff',{rough:.4,metal:.6,vcol:true});
    case 'carpanel':return plain('carpanel','#ffffff',{rough:.3,metal:.4,vcol:true,envI:1.2});
    case 'rugfine':return plain('rugfine','#ffffff',{rough:.95,map:rugTex(true),po:1});
    case 'rugworn':return plain('rugworn','#ffffff',{rough:.98,map:rugTex(false),po:1});
    case 'stone':return surf('stone','sidewalk',{color:'#d8d0c0',fallback:'#b9b0a0',macro:.2});
    case 'iron':return plain('iron','#1c1d1f',{rough:.5,metal:.7});
    case 'chain':{if(MC.chain)return MC.chain;const t=C.ASSETS.textures&&C.ASSETS.textures.fence;const m=new THREE.MeshStandardMaterial({color:lin('#b9bec4'),roughness:.45,metalness:.8,side:THREE.DoubleSide,alphaTest:.5});
      if(t&&t.map){m.map=t.map;if(t.alphaMap)m.alphaMap=t.alphaMap;if(t.normalMap)m.normalMap=t.normalMap}else{m.alphaMap=chainTex();m.map=null}return MC.chain=m}
    case 'container':return surf('container','metal',{color:'#ffffff',fallback:'#7a6a5a',macro:.2});
    case 'swing':return plain('swing','#2c6aa8',{rough:.45,metal:.5});case 'slide':return plain('slide','#e8b52a',{rough:.35});
    case 'tent':return plain('tent','#f2f0ea',{rough:.8,side:THREE.DoubleSide});
    case 'cooler':return plain('cooler','#2f6fb5',{rough:.4});case 'coolerlid':return plain('coolerlid','#f2f2f2',{rough:.4});
    case 'hay':return plain('hay','#ffffff',{rough:1,map:hayTex()});
    case 'banner':return plain('banner','#ffffff',{rough:.8,map:bannerTex(),side:THREE.DoubleSide});
    case 'picket':return plain('picket','#efece4',{rough:.7});
    case 'brass':return plain('brass','#b08a48',{rough:.3,metal:.9});
    case 'whsWall':return surf('whsWall','metal',{color:'#c9cdd1',fallback:'#8d9096',macro:.3});
    case 'whsRoof':return surf('whsRoof','rustmetal',{color:'#bbb',fallback:'#6b4d3a',macro:.3});
  }
  return plain('x'+key,'#888888')}

/* ---------- tile classification ---------- */
function kindOf(B,x,z){const g=B.g;if(x<0||z<0||x>=B.W||z>=B.H)return 'out';const ch=g[z][x],d=B.def;
  /* hub border: roads and sidewalks run out to the edge, where the backdrop road carries on */
  if(B.hub&&(x===0||z===0||x===B.W-1||z===B.H-1)){const ix=x===0?1:x===B.W-1?B.W-2:x,iz=z===0?1:z===B.H-1?B.H-2:z;const ik=kindOf(B,ix,iz);if(ik==='road'||ik==='walk')return ik}
  if('htf'.includes(ch))return 'grass';if(ch==='#')return 'wall';
  let k=',.gs'.includes(ch)?ch:(d.under&&d.under[ch])||('cTaIEB'.includes(ch)?d.inside:d.floor);
  return k===','?(B.hub?'road':'lot'):k==='.'?'inside':k==='s'?'walk':'grass'}

/* ---------- level builder ---------- */
/* extra furniture for mission interiors (assets/home, credited in assets/CREDITS.md). Optional: anything missing falls back to procedural boxes or is skipped. */
const EXTRA_MODELS=['Sofa_01','ArmChair_01','wooden_bookshelf_worn','kenney_rugRectangle','kenney_rugRounded','kenney_cabinetTelevision','kenney_televisionModern','fancy_picture_frame_01','hanging_picture_frame_01','potted_plant_04',
  'pixel_combination_safe','kenney_bedDouble','kenney_kitchenFridgeLarge','kenney_kitchenStove','kenney_kitchenSink','kenney_kitchenCabinet','metal_tool_chest','bench_vice_01','round_wooden_table_02','painted_wooden_chair_02','kenney_lampRoundFloor','dartboard','modern_coffee_table_01','kenney_trophy','pixel_barbecue_grill'];
const EXTRA={};let extraStarted=false;
function loadExtras(){if(extraStarted||!THREE.GLTFLoader)return;extraStarted=true;const ld=new THREE.GLTFLoader();
  for(const n of EXTRA_MODELS)try{ld.load('assets/home/'+n+'.glb',g=>{g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});EXTRA[n]=g},undefined,()=>{EXTRA[n]=null})}catch(e){EXTRA[n]=null}}
W.init=ctx=>{C=ctx;try{loadExtras()}catch(e){}};
W.extrasReady=()=>EXTRA_MODELS.every(n=>n in EXTRA);
W.ROADY=ROADY;
W.begin=lvl=>{const def=lvl.def,id=def.id||'hub';
  const B={lod:[],impGB:{},lvl,def,id,hub:id==='hub',g:lvl.g,W:lvl.W,H:lvl.H,gb:{},inst:{},extra:[],lights:[],q:C.quality(),r:rngOf(hashStr(id)+7),style:LEVEL_STYLE[id]||LEVEL_STYLE.doug,group:lvl.group,yards:[],opens:[],clear:[],parked:[],shadowless:new Set(['paint','joint','gutter','curb','mulch','path','road','lot','walk','grass','inside','far','farroad'])};
  B.kinds=[];B.bossTile=[0,0];for(let z=0;z<B.H;z++){B.kinds[z]=[];for(let x=0;x<B.W;x++){B.kinds[z][x]=kindOf(B,x,z);if(B.g[z][x]==='B')B.bossTile=[x,z]}}
  B.k=(x,z)=>x<0||z<0||x>=B.W||z>=B.H?'out':B.kinds[z][x];
  B.gbOf=key=>B.gb[key]||(B.gb[key]=new GB());
  B.furn=new THREE.Group();B.group.add(B.furn);
  /* tiles that carry wall furniture: AI cover spots there are dropped after the nav is built (W.pruneCover) */
  B.furnCells=new Set();
  lvl.world=B;return B};
W.groundY=(lvl,x,z)=>{const B=lvl&&lvl.world;if(!B||!B.hub)return 0;const k=B.k(Math.floor(x/TILE),Math.floor(z/TILE));return k==='road'?ROADY:0};

/* vertex colour for macro variation on a surface kind */
function tint(kind,x,z){const n=fbm(x/13,z/13),m=vnoise(x/4.1+9,z/4.1+3);
  if(kind==='grass'){const dry=sstep(.55,.8,fbm(x/22+40,z/22+11));const v=.78+n*.36;return[v*(1+dry*.25),v*(1+dry*.08),v*(1-dry*.25)]}
  if(kind==='road'||kind==='lot'){const v=.86+n*.22+(m-.5)*.06;return[v,v,v*1.01]}
  if(kind==='inside'){const v=.8+n*.3;return[v,v*.97,v*.93]}
  const v=.9+n*.16;return[v,v,v]}

W.ground=B=>{const{W:Wd,H}=B;
  const mpr={road:3.6,lot:B.style.pavers?1.8:3.6,walk:2,grass:2.4,inside:B.style.floor?B.style.floor[1]:3,dirt:2};
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
        if(inside){trim.box(Math.min(sx,sx+dx*.02),0,z0,Math.max(sx,sx+dx*.02),.13,z1,1,null,{px:dx<0,nx:dx>0,pz:true,nz:true});wainX(B,sx,z0,z1,dx)}
        else if(nk!=='out')pl.box(Math.min(sx,sx+dx*.03),0,z0,Math.max(sx,sx+dx*.03),.35,z1,1.5,null,{px:dx<0,nx:dx>0,pz:true,nz:true});}
      else{const sz=dz>0?z1:z0;gb.wz(x0,x1,0,WALLH,sz,dz,m,col);cap.wz(x0-(isW(x-1,z)?0:lip),x1+(isW(x+1,z)?0:lip),WALLH,CY,sz+dz*lip,dz,1.5);
        if(inside){trim.box(x0,0,Math.min(sz,sz+dz*.02),x1,.13,Math.max(sz,sz+dz*.02),1,null,{pz:dz<0,nz:dz>0,px:true,nx:true});wainZ(B,sz,x0,x1,dz)}
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
  if(B.style.eaves)eaves(B);
  return true};
/* a shingled eave along every outward wall face gives the building a roofline from the yard (it sits above the wall cap, so the camera still sees in) */
function eaves(B){const op=new Set();for(const o of B.opens)for(let t=o.t0;t<=o.t1;t++)op.add(o.horiz?t+','+o.row:o.row+','+t);const isW=(x,z)=>B.k(x,z)==='wall'||op.has(x+','+z);const rf=B.gbOf('roof'),fa=B.gbOf('trim');const y0=WALLH+.06,out=.75,drop=.32;
  for(let z=0;z<B.H;z++)for(let x=0;x<B.W;x++){if(!isW(x,z))continue;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){if(isW(x+dx,z+dz))continue;const nk=B.k(x+dx,z+dz);if(nk==='inside'||nk==='out')continue;
    /* only true exterior faces: the opposite side of this wall run is interior */
    if(B.k(x-dx,z-dz)!=='inside'&&!(isW(x-dx,z-dz)))continue;
    const x0=x*TILE,z0=z*TILE;const ax=dz!==0;const ext=[isW(x-(ax?1:0),z-(ax?0:1))?0:out,isW(x+(ax?1:0),z+(ax?0:1))?0:out];
    if(dz){const zf=dz>0?z0+TILE:z0;const a0=x0-ext[0],a1=x0+TILE+ext[1];rf.quad([a0,y0+.18,zf],[a1,y0+.18,zf],[a1,y0-drop,zf+dz*out],[a0,y0-drop,zf+dz*out],[[a0/3,0],[a1/3,0],[a1/3,.4],[a0/3,.4]],null,[0,1,dz]);
      fa.box(a0,y0-drop-.16,Math.min(zf+dz*out,zf+dz*(out+.04)),a1,y0-drop+.02,Math.max(zf+dz*out,zf+dz*(out+.04)),1,null,{});fa.floor(a0,Math.min(zf,zf+dz*out),a1,Math.max(zf,zf+dz*out),y0-drop-.14,1,null,true)}
    else{const xf=dx>0?x0+TILE:x0;const a0=z0-ext[0],a1=z0+TILE+ext[1];rf.quad([xf,y0+.18,a0],[xf,y0+.18,a1],[xf+dx*out,y0-drop,a1],[xf+dx*out,y0-drop,a0],[[a0/3,0],[a1/3,0],[a1/3,.4],[a0/3,.4]],null,[dx,1,0]);
      fa.box(Math.min(xf+dx*out,xf+dx*(out+.04)),y0-drop-.16,a0,Math.max(xf+dx*out,xf+dx*(out+.04)),y0-drop+.02,a1,1,null,{});fa.floor(Math.min(xf,xf+dx*out),a0,Math.max(xf,xf+dx*out),a1,y0-drop-.14,1,null,true)}}}}
/* lower wall band (wood panelling, dado paint), chair rail and crown on interior faces */
function wainX(B,sx,z0,z1,dx){const w=B.style.wain;if(!w)return;const gb=B.gbOf('wain'),tr=B.gbOf(w[2]||'trim');const o=.006;
  gb.wx(z0,z1,.13,w[1],sx+dx*o,dx,w[3]||1.4,null);if(w[4]!==false)tr.box(Math.min(sx,sx+dx*.035),w[1]-.02,z0,Math.max(sx,sx+dx*.035),w[1]+.06,z1,1,null,{px:dx<0,nx:dx>0,pz:true,nz:true,top:false});
  if(B.style.crown)B.gbOf('trim').box(Math.min(sx,sx+dx*.06),WALLH-.14,z0,Math.max(sx,sx+dx*.06),WALLH-.02,z1,1,null,{px:dx<0,nx:dx>0,pz:true,nz:true})}
function wainZ(B,sz,x0,x1,dz){const w=B.style.wain;if(!w)return;const gb=B.gbOf('wain'),tr=B.gbOf(w[2]||'trim');const o=.006;
  gb.wz(x0,x1,.13,w[1],sz+dz*o,dz,w[3]||1.4,null);if(w[4]!==false)tr.box(x0,w[1]-.02,Math.min(sz,sz+dz*.035),x1,w[1]+.06,Math.max(sz,sz+dz*.035),1,null,{pz:dz<0,nz:dz>0,px:true,nx:true});
  if(B.style.crown)B.gbOf('trim').box(x0,WALLH-.14,Math.min(sz,sz+dz*.06),x1,WALLH-.02,Math.max(sz,sz+dz*.06),1,null,{pz:dz<0,nz:dz>0,px:true,nx:true})}
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
  if(B.style.lit){litWindows(B,faces,near);}
  let wi=0;for(const f of faces){if(B.style.lit)break;if(!f.straight||near(f))continue;if((f.x*7+f.z*13)%5!==0)continue;wi++;
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
/* proper windows (compound): warm-lit glass outside, dark glass and curtains inside, white casings, shutters on the yard side */
function litWindows(B,faces,near){const gl=B.gbOf('winglow'),dk=B.gbOf('glass'),tr=B.gbOf('trim'),sh=B.gbOf('shutter'),cu=B.gbOf('curtain');
  for(const f of faces){if(!f.straight||near(f))continue;if((f.x*3+f.z*5)%3!==0)continue;
    const cx=f.x*TILE+1+f.dx,cz=f.z*TILE+1+f.dz,hw=.55,y0=.95,y1=2.45,s=f.dx||f.dz,o=.02;
    const pane=(gb,off)=>{if(f.dx)gb.wx(cz-hw,cz+hw,y0,y1,cx+s*off,s,1);else gb.wz(cx-hw,cx+hw,y0,y1,cz+s*off,s,1)};
    const bx=(a0,a1,b0,b1,y_0,y_1)=>{if(f.dx)tr.box(Math.min(cx+s*a0,cx+s*a1),y_0,cz+b0,Math.max(cx+s*a0,cx+s*a1),y_1,cz+b1,1,null,{});else tr.box(cx+b0,y_0,Math.min(cz+s*a0,cz+s*a1),cx+b1,y_1,Math.max(cz+s*a0,cz+s*a1),1,null,{})};
    pane(f.inside?dk:gl,o);
    bx(0,.07,-hw-.1,-hw,y0-.06,y1+.06);bx(0,.07,hw,hw+.1,y0-.06,y1+.06);bx(0,.07,-hw-.1,hw+.1,y1,y1+.12);bx(0,.11,-hw-.16,hw+.16,y0-.1,y0);
    bx(0,.045,-.025,.025,y0,y1);bx(0,.045,-hw,hw,(y0+y1)/2-.025,(y0+y1)/2+.025);
    if(f.inside){for(const sd of[-1,1]){const a=sd<0?-hw-.25:hw-.12,b=sd<0?-hw+.12:hw+.25;if(f.dx)cu.wx(cz+a,cz+b,y0-.25,y1+.3,cx+s*.06,s,1);else cu.wz(cx+a,cx+b,y0-.25,y1+.3,cz+s*.06,s,1)}}
    else for(const sd of[-1,1]){const a=sd<0?-hw-.62:hw+.12,b=sd<0?-hw-.12:hw+.62;if(f.dx)sh.wx(cz+a,cz+b,y0,y1,cx+s*.03,s,1);else sh.wz(cx+a,cx+b,y0,y1,cz+s*.03,s,1)}
    f.used=true}}
/* exposed joists and patchy roof sheeting over interiors (single-sided: invisible from above, so the camera can always see in) */
function ceiling(B){const r=B.r;const jo=B.gbOf('joist'),rs=B.gbOf('roofsheet');const inside=(x,z)=>{const k=B.k(x,z);return k==='inside'||k==='wall'};
  /* finished ceilings (duplex, mansion): single-sided so the camera sees in from above, and they cast no shadow so the sun still lights the rooms; the duplex has a few holes */
  if(B.style.ceil!=null){const cg=B.gbOf('ceil');B.shadowless.add('ceil');const y=WALLH-.005;
    for(let z=0;z<B.H;z++)for(let x=0;x<B.W;x++){if(B.k(x,z)!=='inside')continue;const x0=x*TILE,z0=z*TILE;if(r()<B.style.ceil){continue}
      cg.quad([x0,y,z0],[x0+TILE,y,z0],[x0+TILE,y,z0+TILE],[x0,y,z0+TILE],[[x0/2.6,z0/2.6],[(x0+TILE)/2.6,z0/2.6],[(x0+TILE)/2.6,(z0+TILE)/2.6],[x0/2.6,(z0+TILE)/2.6]],null,[0,-1,0])}
    for(const o of B.opens)cg.quad([o.x0,y,o.z0],[o.x1,y,o.z0],[o.x1,y,o.z1],[o.x0,y,o.z1],[[0,0],[1,0],[1,1],[0,1]],null,[0,-1,0]);
    if(B.style.noJoists)return}
  for(let z=0;z<B.H;z++){let x=0;while(x<B.W){if(!inside(x,z)||B.k(x,z)==='wall'&&!(inside(x+1,z)&&B.k(x+1,z)==='inside')){x++;continue}
      const s=x;while(x<B.W&&inside(x,z))x++;const x0=s*TILE+.1,x1=x*TILE-.1;if(x1-x0<3)continue;
      const zc=z*TILE+1;if(r()<.12)continue;jo.box(x0,WALLH-.26,zc-.06,x1,WALLH-.02,zc+.06,1.2,null,{})}}
  if(B.style.ceil==null)for(let z=0;z<B.H;z++)for(let x=0;x<B.W;x++){if(B.k(x,z)!=='inside')continue;if(r()<.42)continue;const x0=x*TILE,z0=z*TILE;
    const y=WALLH-.01;rs.quad([x0,y,z0],[x0+TILE,y,z0],[x0+TILE,y,z0+TILE],[x0,y,z0+TILE],[[x0/1.8,z0/1.8],[(x0+TILE)/1.8,z0/1.8],[(x0+TILE)/1.8,(z0+TILE)/1.8],[x0/1.8,(z0+TILE)/1.8]],null,[0,-1,0])}}

/* ---------- instancing ---------- */
/* queue a model instance; built at finish as InstancedMesh per model part, chunked so frustum and shadow culling still work */
function inst(B,name,x,y,z,ry=0,s=1,sy,opts){(B.inst[name]||(B.inst[name]=[])).push({x,y,z,ry,s,sy:sy??s,o:opts})}
const partCache={};
const FADE_MODELS={tree_oak:[2,4.5],tree_tall:[2,4.5],tree_pine:[2,4.5],bush:[.8,1.8],shrub_02:[.8,1.8],shrub_04:[.8,1.8],street_lamp:[1,2.5]};
function partsOf(name){if(partCache[name])return partCache[name];const g=C.ASSETS.gltf(name)||EXTRA[name];if(!g)return null;const out=[];g.scene.updateMatrixWorld(true);
  const bb=new THREE.Box3().setFromObject(g.scene);const fade=FADE_MODELS[name];g.scene.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh){if(fade)fadeMat(o.material,fade[0],fade[1]);out.push({geo:o.geometry,mat:o.material,m:o.matrixWorld.clone()})}});
  return partCache[name]={parts:out,bb}}
W.modelBox=name=>{const p=partsOf(name);return p?p.bb:null};
const NOSHADOW_MODELS=new Set(['trashbag','mailbox','tyre','grass_medium_02']);
function buildInst(B){const chunk=56,dummy=new THREE.Object3D(),mm=new THREE.Matrix4(),box=new THREE.Box3();dummy.rotation.order='YXZ';
  for(const name in B.inst){const list=B.inst[name];const P=partsOf(name);if(!P)continue;
    /* trees swap to impostors per chunk, so they keep small chunks; everything else uses large ones */
    const ch=TREES.includes(name)?chunk:96;const cells={};for(const it of list){const k=Math.floor(it.x/ch)+','+Math.floor(it.z/ch);(cells[k]||(cells[k]=[])).push(it)}
    for(const k in cells){const L=cells[k];const reals=[];let ctr=null;
      for(const part of P.parts){const im=new THREE.InstancedMesh(part.geo,part.mat,L.length);const pb=part.geo.boundingBox||(part.geo.computeBoundingBox(),part.geo.boundingBox);box.makeEmpty();
        L.forEach((it,i)=>{const o=it.o||{};dummy.position.set(it.x,it.y,it.z);dummy.rotation.set(o.rx||0,it.ry,0);dummy.scale.set(it.s,it.sy,o.sz??it.s);dummy.updateMatrix();mm.multiplyMatrices(dummy.matrix,part.m);im.setMatrixAt(i,mm);box.union(pb.clone().applyMatrix4(mm))});
        const bs=new THREE.Sphere();box.getBoundingSphere(bs);patchCull(im,bs);
        im.castShadow=!(L[0].o&&L[0].o.noShadow)&&!NOSHADOW_MODELS.has(name);im.receiveShadow=true;im.userData.iname=name;B.group.add(im);reals.push(im);if(!ctr)ctr=bs}
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
  /* border trees stand back from the playable edge so their canopies frame the level instead of hanging over spawns */
  if(opts.edge){const tx=Math.floor(x/TILE),tz=Math.floor(z/TILE),ik=B.k(tx-opts.edge[0],tz-opts.edge[1]);if(ik==='road'||ik==='walk')return true;x+=opts.edge[0]*2.6;z+=opts.edge[1]*2.6}
  if(partsOf(name)){const s=(opts.s||1)*(.85+r()*.4);inst(B,name,x+(r()-.5)*.4,0,z+(r()-.5)*.4,r()*6.28,s);return true}
  /* fallback: trunk plus clustered foliage */
  const gb=B.gbOf('trimdark');gb.box(x-.15,0,z-.15,x+.15,2.6,z+.15,1,null,{});
  const lg=B.gbOf('leaves');for(let i=0;i<5;i++){const g=new THREE.IcosahedronGeometry(1+r()*.5,1);const m=new THREE.Matrix4().makeTranslation(x+(r()-.5)*1.4,3.2+r()*1.4,z+(r()-.5)*1.4);lg.addGeo(g,m,1,[.8+r()*.3,1,.8])}return false};

/* ---------- procedural props merged into level geometry ---------- */
function cylGeo(r0,r1,h,seg=12,open){return new THREE.CylinderGeometry(r1,r0,h,seg,1,open)}
const M4=(x,y,z,ry=0,rx=0,rz=0,s=1)=>{const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.setScalar(s);o.updateMatrix();return o.matrix};
W.streetLamp=(B,x,z,dir)=>{const ang=Math.atan2(dir[0],dir[1]);/* davit arm reaches toward the road */
  /* realistic proportions: 0.15 m tapered steel pole, 7.6 m mounting height, 1.8 m arm, slim cobra head */
  const pole=B.gbOf('lamphead'),gl=B.gbOf('lampglass'),cn=B.gbOf('found');
  cn.addGeo(cylGeo(.2,.2,.12,12),M4(x,.06,z));
  pole.addGeo(cylGeo(.11,.11,.38,12),M4(x,.31,z));pole.addGeo(cylGeo(.078,.05,7.1,10),M4(x,.5+3.55,z));
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,7.35,0),new THREE.Vector3(0,7.62,.18),new THREE.Vector3(0,7.72,.7),new THREE.Vector3(0,7.7,1.75)]);
  pole.addGeo(new THREE.TubeGeometry(curve,10,.034,6),M4(x,0,z,ang));
  const hx=x+Math.sin(ang)*1.98,hz=z+Math.cos(ang)*1.98;
  const head=new THREE.SphereGeometry(.5,12,6,0,Math.PI*2,0,Math.PI/2);head.scale(.3,.2,.62);pole.addGeo(head,M4(hx,7.62,hz,ang));
  const lens=new THREE.CircleGeometry(.5,12);lens.scale(.24,.5,1);lens.rotateX(Math.PI/2);gl.addGeo(lens,M4(hx,7.615,hz,ang))};
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

/* ---------- mission interiors: furniture against walls, rugs, wall art; never on a path, never a collider ---------- */
/* place a model by its bounding box: centred on (X,Z), base on the floor, scaled to a target width/height/depth */
function fit(name,o){const P=partsOf(name);if(!P)return null;const bb=P.bb,sx=bb.max.x-bb.min.x,sy=bb.max.y-bb.min.y,sz=bb.max.z-bb.min.z;const s=o.s||(o.w?o.w/sx:o.h?o.h/sy:o.d?o.d/sz:1);return{s,w:sx*s,h:sy*s,d:sz*s,bb}}
/* a model instance baked into the level's static merge (for multi-part models that appear a few dozen times) */
function staticModel(B,name,x,y,z,yaw,s){const P=partsOf(name);if(!P)return false;const root=new THREE.Object3D();root.position.set(x,y,z);root.rotation.y=yaw;root.scale.setScalar(s);B.furn.add(root);
  for(const part of P.parts){const m=new THREE.Mesh(part.geo,part.mat);m.matrixAutoUpdate=false;m.matrix.copy(part.m);m.castShadow=!NOSHADOW_MODELS.has(name);m.receiveShadow=true;root.add(m)}return true}
function place(B,name,X,Z,yaw,o={}){const f=fit(name,o);if(!f)return null;const{s,bb}=f;const cx=(bb.min.x+bb.max.x)/2*s,cz=(bb.min.z+bb.max.z)/2*s;const c=Math.cos(yaw),sn=Math.sin(yaw);
  const px=X-(cx*c+cz*sn),py=(o.y||0)-(o.hang?(bb.min.y+bb.max.y)/2:bb.min.y)*s,pz=Z-(-cx*sn+cz*c);
  if(o.inst||!B.furn){inst(B,name,px,py,pz,yaw,s,s,o.opts);return f}
  /* one-off furniture: real meshes in a static group, merged by material at finish (kenney kits share materials, so a kitchen costs a handful of draws) */
  const P=partsOf(name),root=new THREE.Object3D();root.position.set(px,py,pz);root.rotation.y=yaw;root.scale.setScalar(s);B.furn.add(root);
  for(const part of P.parts){const m=new THREE.Mesh(part.geo,part.mat);m.matrixAutoUpdate=false;m.matrix.copy(part.m);m.castShadow=true;m.receiveShadow=true;root.add(m)}return f}
/* against a wall: back to the wall, front into the room (models face +z) */
function against(B,name,sp,o={}){const f=fit(name,o);if(!f)return null;const yaw=Math.atan2(-sp.dx,-sp.dz)+(o.turn||0);const dep=o.turn?f.w:f.d;const off=1-dep/2-.04-(o.gap||0);
  const along=o.along||0;return place(B,name,sp.cx+sp.dx*off+sp.dz*along,sp.cz+sp.dz*off+sp.dx*along,yaw,o)}
function wallSpots(B){const isW=(x,z)=>B.k(x,z)==='wall';const out=[];
  for(let z=1;z<B.H-1;z++)for(let x=1;x<B.W-1;x++){if(B.k(x,z)!=='inside'||B.g[z][x]!=='.')continue;
    const adj=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dz])=>isW(x+dx,z+dz));if(!adj.length||adj.length>2)continue;
    if(B.opens.some(o=>x*TILE+1>o.x0-2.6&&x*TILE+1<o.x1+2.6&&z*TILE+1>o.z0-2.6&&z*TILE+1<o.z1+2.6))continue;
    let busy=false;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const c=B.g[z+dz]&&B.g[z+dz][x+dx];if(c&&'EBIaTcPXS'.includes(c))busy=true}if(busy)continue;
    out.push({x,z,dx:adj[0][0],dz:adj[0][1],corner:adj.length===2,cx:x*TILE+1,cz:z*TILE+1})}
  return out}
const BOTTLE=new THREE.CylinderGeometry(.033,.035,.24,8);
function bottles(B,X,Z,n){const r=B.r,gb=B.gbOf('bottle');for(let i=0;i<n;i++){const tip=r()<.4;const m=M4(X+(r()-.5)*.5,tip?.035:.12,Z+(r()-.5)*.5,r()*6,tip?Math.PI/2:0);gb.addGeo(BOTTLE,m,1,[.6+r()*.5,.8+r()*.3,.5+r()*.3])}}
function cardS(B,w,h,d,x,y,z,ry){B.gbOf('card').addGeo(new THREE.BoxGeometry(w,h,d),M4(x,y,z,ry||0))}
function pizza(B,X,Z,n){for(let i=0;i<n;i++)cardS(B,.42,.045,.42,X+(B.r()-.5)*.3,.025+i*.046,Z+(B.r()-.5)*.3,B.r()*.6)}
/* flat-pack shapes (procedural, merged) */
function shelfUnit(B,sp){const gb=B.gbOf('galv'),bx=B.gbOf('card2');const yaw=Math.atan2(-sp.dx,-sp.dz),c=Math.cos(yaw),sn=Math.sin(yaw);const off=1-.25-.04;const X=sp.cx+sp.dx*off,Z=sp.cz+sp.dz*off;const r=B.r;
  for(const u of[-.85,.85])for(const v of[-.2,.2])gb.addGeo(new THREE.BoxGeometry(.04,2,.04),M4(X+u*c+v*sn,1,Z-u*sn+v*c,yaw));
  for(const y of[.15,.75,1.35,1.95]){gb.addGeo(new THREE.BoxGeometry(1.74,.025,.44),M4(X,y,Z,yaw));if(y<1.9)for(let u=-.7;u<.7;u+=.35+r()*.2){if(r()<.3)continue;const h=.18+r()*.3,w=.24+r()*.12;bx.addGeo(new THREE.BoxGeometry(w,h,.32),M4(X+u*c,y+.0125+h/2,Z-u*sn,yaw+(r()-.5)*.1),1,[.8+r()*.3,.8+r()*.25,.75+r()*.2])}}}
function workbench(B,sp){const wd=B.gbOf('benchtop'),mt=B.gbOf('metal'),pg=B.gbOf('pegboard'),tl=B.gbOf('tools');const yaw=Math.atan2(-sp.dx,-sp.dz),c=Math.cos(yaw),sn=Math.sin(yaw);const off=1-.35-.04;const X=sp.cx+sp.dx*off,Z=sp.cz+sp.dz*off;
  wd.addGeo(new THREE.BoxGeometry(1.9,.06,.7),M4(X,.9,Z,yaw));for(const u of[-.88,.88])for(const v of[-.3,.3])mt.addGeo(new THREE.BoxGeometry(.05,.87,.05),M4(X+u*c+v*sn,.435,Z-u*sn+v*c,yaw));
  mt.addGeo(new THREE.BoxGeometry(1.8,.03,.6),M4(X,.25,Z,yaw));
  const wx=sp.cx+sp.dx*(1-.015),wz=sp.cz+sp.dz*(1-.015);pg.addGeo(new THREE.BoxGeometry(1.9,1,.02),M4(wx,1.55,wz,yaw));
  const r=B.r;for(let i=0;i<7;i++){const u=-.8+i*.26,h=.18+r()*.22;tl.addGeo(new THREE.BoxGeometry(.05+r()*.06,h,.03),M4(wx-sp.dx*.03+u*c,1.45+r()*.3,wz-sp.dz*.03-u*sn,yaw,0,0,0),1,[.5+r()*.5,.3+r()*.4,.25+r()*.3])}
  const v=place(B,'metal_tool_chest',X+.55*c,Z-.55*sn,yaw,{h:.42,y:.93});}
function carDoor(B,sp){const gb=B.gbOf('carpanel');const yaw=Math.atan2(-sp.dx,-sp.dz),c=Math.cos(yaw),sn=Math.sin(yaw);const r=B.r;const col=[[.55,.1,.08],[.12,.2,.35],[.75,.75,.72],[.1,.1,.11]][Math.floor(r()*4)];
  for(let i=0;i<2;i++){const off=1-.16-i*.09;const u=(i-.5)*.5;gb.addGeo(new THREE.BoxGeometry(1.1,.95,.05),M4(sp.cx+sp.dx*off+u*c,.5,sp.cz+sp.dz*off-u*sn,yaw,-.22,0,0),1,col)}}
function rug(B,X,Z,yaw,w,d,kind){const gb=B.gbOf(kind);const c=Math.cos(yaw),sn=Math.sin(yaw);const P=(u,v)=>[X+u*c+v*sn,.012,Z-u*sn+v*c];gb.quad(P(-w/2,-d/2),P(-w/2,d/2),P(w/2,d/2),P(w/2,-d/2),[[0,0],[0,1],[1,1],[1,0]],null,[0,1,0])}
function hang(B,name,sp,y,o={}){const f=fit(name,o);if(!f)return null;const yaw=Math.atan2(-sp.dx,-sp.dz);const off=1-f.d/2-.015;const u=o.along||0;return place(B,name,sp.cx+sp.dx*off+sp.dz*u,sp.cz+sp.dz*off+sp.dx*u,yaw,{...o,y,hang:true})}
function dress(B){const r=B.r,low=B.q==='low';B.furn=B.furn||new THREE.Group();if(!B.furn.parent)B.group.add(B.furn);const spots=wallSpots(B);const used=new Set();
  const take=(pred)=>{for(let k=0;k<40;k++){if(!spots.length)return null;const i=Math.floor(r()*spots.length),sp=spots[i];if(pred&&!pred(sp))continue;
      if([...used].some(u=>{const[a,b]=u.split(',').map(Number);return Math.abs(a-sp.x)<=1&&Math.abs(b-sp.z)<=1}))continue;spots.splice(i,1);used.add(sp.x+','+sp.z);B.furnCells.add(sp.x+','+sp.z);return sp}return null};
  const flat=sp=>!sp.corner;
  const id=B.id;
  /* per style: [weight, fn(spot)], small:true items are skipped on Low */
  const SETS={
    gary:[[3,sp=>{if(r()<.5){for(let q=0;q<4;q++)inst(B,'tyre',sp.cx+sp.dx*.45,.08+q*.17,sp.cz+sp.dz*.45,r()*6,1,1,{rx:Math.PI/2})}else{for(let q=0;q<3;q++)inst(B,'tyre',sp.cx+sp.dx*.6-sp.dz*(q-1)*.42,.33,sp.cz+sp.dz*.6-sp.dx*(q-1)*.42,Math.atan2(sp.dz,sp.dx)+Math.PI/2+(r()-.5)*.2,1,1,{rx:-.25})}}],
      [2,sp=>shelfUnit(B,sp),flat],[2,sp=>workbench(B,sp),flat],[2,sp=>{inst(B,r()<.5?'barrel_red':'barrel_blue',sp.cx+sp.dx*.5,0,sp.cz+sp.dz*.5,r()*6,1);if(r()<.6)inst(B,'barrel_blue',sp.cx+sp.dx*.5+sp.dz*.65,0,sp.cz+sp.dz*.5+sp.dx*.65,r()*6,1)}],
      [1,sp=>{for(let q=0;q<1+Math.floor(r()*3);q++)inst(B,'pallet',sp.cx+sp.dx*.25,q*.15,sp.cz+sp.dz*.25,Math.atan2(sp.dx,sp.dz)+(r()-.5)*.2,1)}],[1.5,sp=>carDoor(B,sp),flat],
      [1,sp=>against(B,'metal_tool_chest',sp,{h:1.0})],[1,sp=>{for(let q=0;q<2;q++)inst(B,'trashbag',sp.cx+sp.dx*.4+(r()-.5)*.6,0,sp.cz+sp.dz*.4+(r()-.5)*.6,r()*6,.9+r()*.3)},null,true],
      [1,sp=>{const v=against(B,'kenney_kitchenFridgeLarge',sp,{h:1.6});},flat]],
    rick:[[2,sp=>{B.gbOf('mattress').addGeo(new THREE.BoxGeometry(1.9,.2,1.35),M4(sp.cx+sp.dx*.25,.1,sp.cz+sp.dz*.25,Math.atan2(sp.dz,sp.dx)+(r()-.5)*.25));if(!low&&r()<.6)bottles(B,sp.cx-sp.dz*.9,sp.cz-sp.dx*.9,3)}],
      [2,sp=>against(B,r()<.5?'Sofa_01':'couch',sp,{w:1.85}),flat],[1.5,sp=>{against(B,'ArmChair_01',sp,{h:1.0});if(!low)bottles(B,sp.cx-sp.dz*.6,sp.cz-sp.dx*.6,2)}],
      [1.5,sp=>{const t=against(B,'kenney_cabinetTelevision',sp,{w:1.4});if(t)against(B,'kenney_televisionModern',sp,{w:1.1,y:t.h,gap:.12})},flat],
      [1.5,sp=>{against(B,'kenney_kitchenFridgeLarge',sp,{h:1.75,along:-.45});against(B,'kenney_kitchenStove',sp,{h:.9,along:.5})},flat],
      [1,sp=>{against(B,'kenney_kitchenSink',sp,{h:.95,along:-.45});against(B,'kenney_kitchenCabinet',sp,{h:.9,along:.43})},flat],
      [1,sp=>{const t=place(B,'round_wooden_table_02',sp.cx+sp.dx*.45,sp.cz+sp.dz*.45,0,{h:.75});if(t&&!low){pizza(B,sp.cx+sp.dx*.45,sp.cz+sp.dz*.45,1);bottles(B,sp.cx+sp.dx*.45,sp.cz+sp.dz*.45,0)}place(B,'painted_wooden_chair_02',sp.cx+sp.dx*.1-sp.dz*.6,sp.cz+sp.dz*.1-sp.dx*.6,r()*6,{h:.95})}],
      [1,sp=>{pizza(B,sp.cx+sp.dx*.5,sp.cz+sp.dz*.5,2+Math.floor(r()*4));if(!low)bottles(B,sp.cx+sp.dx*.4,sp.cz+sp.dz*.4,4)},null,true],
      [1.5,sp=>{for(let q=0;q<1+Math.floor(r()*3);q++)inst(B,'trashbag',sp.cx+sp.dx*.4+(r()-.5)*.8,0,sp.cz+sp.dz*.4+(r()-.5)*.8,r()*6,.9+r()*.4)}],
      [1,sp=>{for(let q=0;q<3;q++)cardS(B,.5+r()*.2,.35+r()*.15,.4+r()*.2,sp.cx+sp.dx*.4+(r()-.5)*.5,.2+q*.38,sp.cz+sp.dz*.4+(r()-.5)*.5,r()*1.5)}],
      [1,sp=>against(B,'kenney_lampRoundFloor',sp,{h:1.6}),null,true],[1,sp=>against(B,'wooden_bookshelf_worn',sp,{h:1.9}),flat]],
    doug:[[2,sp=>{const s=against(B,'Sofa_01',sp,{w:2.0});if(s&&!low){const cx=sp.cx-sp.dx*.25,cz=sp.cz-sp.dz*.25;place(B,'modern_coffee_table_01',cx,cz,Math.atan2(sp.dx,sp.dz)+Math.PI/2,{h:.42})}},flat],
      [2,sp=>against(B,'wooden_bookshelf_worn',sp,{h:2.1}),flat],[1.5,sp=>{against(B,'ArmChair_01',sp,{h:1.05,along:-.4});if(!low)against(B,'kenney_lampRoundFloor',sp,{h:1.65,along:.55})}],
      [1.5,sp=>{const t=against(B,'kenney_cabinetTelevision',sp,{w:1.6});if(t)against(B,'kenney_televisionModern',sp,{w:1.3,y:t.h,gap:.12})},flat],
      [1.5,sp=>against(B,'potted_plant_04',sp,{h:1.25}),null,true],[1,sp=>{const t=against(B,'kenney_kitchenCabinet',sp,{h:.9});if(t&&!low)place(B,'kenney_trophy',sp.cx+sp.dx*.55,sp.cz+sp.dz*.55,Math.atan2(-sp.dx,-sp.dz),{h:.32,y:t.h})},flat],
      [1,sp=>{for(let q=0;q<3;q++)cardS(B,.5+r()*.2,.35+r()*.15,.4+r()*.2,sp.cx+sp.dx*.4+(r()-.5)*.5,.2+q*.38,sp.cz+sp.dz*.4+(r()-.5)*.5,r()*1.5)}]]};
  const set=SETS[id]||SETS.rick;const tot=set.reduce((a,b)=>a+b[0],0);
  const n=Math.min(spots.length,low?7:22);
  for(let i=0;i<n;i++){let k=r()*tot,e=set[0];for(const it of set){k-=it[0];if(k<=0){e=it;break}}if(low&&e[3])continue;const sp=take(e[2]);if(!sp)continue;try{e[1](sp)}catch(err){console.warn('dress item failed',err)}}
  /* the King keeps a safe by his desk */
  if(id==='doug'){for(const sp of wallSpots(B)){if(Math.abs(sp.x-B.bossTile[0])<=4&&Math.abs(sp.z-B.bossTile[1])<=3&&!used.has(sp.x+','+sp.z)){against(B,'pixel_combination_safe',sp,{h:1.0});used.add(sp.x+','+sp.z);B.furnCells.add(sp.x+','+sp.z);break}}}
  /* rugs on open floor */
  if(!low){const rugK=id==='doug'?'rugfine':id==='rick'?'rugworn':null;if(rugK){let c=0;for(let t=0;t<80&&c<(id==='doug'?6:4);t++){const x=1+Math.floor(r()*(B.W-2)),z=1+Math.floor(r()*(B.H-2));let ok=true;
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(B.k(x+dx,z+dz)!=='inside')ok=false;if(!ok)continue;rug(B,x*TILE+1+(r()-.5)*.6,z*TILE+1+(r()-.5)*.6,r()<.7?0:Math.PI/2,id==='doug'?3.2:2.4,id==='doug'?2.2:1.6,rugK);c++}}}
  /* wall art and a dartboard on free interior faces */
  if(!low&&id!=='gary'){const free=wallSpots(B).filter(sp=>!used.has(sp.x+','+sp.z)&&!sp.corner);let c=0;for(const sp of free){if(c>=(id==='doug'?14:5))break;if(r()<.5)continue;
      const nm=id==='doug'?(r()<.6?'fancy_picture_frame_01':'hanging_picture_frame_01'):(r()<.4?'dartboard':'hanging_picture_frame_01');hang(B,nm,sp,nm==='dartboard'?1.7:1.75,{w:nm==='fancy_picture_frame_01'?1.0:nm==='dartboard'?.46:.62});c++}}
  else if(!low&&id==='gary'){const free=wallSpots(B).filter(sp=>!used.has(sp.x+','+sp.z)&&!sp.corner);let c=0;for(const sp of free){if(c>=4)break;if(r()<.6)continue;hang(B,'dartboard',sp,1.7,{w:.46});c++}}}
W.place=place;
/* AI nav: drop cover spots on tiles occupied by furniture so nobody crouches inside a sofa; walkability is untouched */
W.pruneCover=(lvl,nav)=>{const B=lvl&&lvl.world;if(!B||!nav||!nav.covers||!B.furnCells.size)return 0;const keep=[],W_=nav.W||lvl.W;let n=0;
  for(const c of nav.covers){const x=c.i%W_,z=(c.i/W_)|0;if(B.furnCells.has(x+','+z)){n++;continue}keep.push(c)}
  if(n){nav.covers.length=0;nav.covers.push(...keep);if(nav.coverAt){nav.coverAt.fill(-1);keep.forEach((c,j)=>nav.coverAt[c.i]=j)}}return n};
/* string of party bulbs hanging between two points */
function stringLights(B,a,b,sag){const wire=B.gbOf('wire'),bl=B.gbOf('bulb');const A=new THREE.Vector3(...a),Bv=new THREE.Vector3(...b);const pts=[];
  for(let k=0;k<=16;k++){const t=k/16,p=A.clone().lerp(Bv,t);p.y-=sag*4*t*(1-t);pts.push(p)}wire.addGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.008,4),new THREE.Matrix4());
  const L=A.distanceTo(Bv),n=Math.floor(L/.7);const sp=new THREE.SphereGeometry(.045,8,6);for(let i=1;i<n;i++){const t=i/n,p=A.clone().lerp(Bv,t);p.y-=sag*4*t*(1-t)+.07;bl.addGeo(sp,M4(p.x,p.y,p.z))}}
/* ---------- Linden Park: paths, benches, bins, playground, pavilion and parking outside the fight area ---------- */
function park(B){const r=B.r,Wm=B.W*TILE,Hm=B.H*TILE,low=B.q==='low';B.furn=B.furn||new THREE.Group();if(!B.furn.parent)B.group.add(B.furn);const pa=B.gbOf('path'),mu=B.gbOf('mulch');
  const seg=(x0,z0,x1,z1)=>{pa.floor(Math.min(x0,x1),Math.min(z0,z1),Math.max(x0,x1),Math.max(z0,z1),.008,1.2);B.clear.push([Math.min(x0,x1),Math.min(z0,z1),Math.max(x0,x1),Math.max(z0,z1)])};
  /* a paved loop with two spurs out to the street and the playground */
  const lx0=7,lx1=Wm-7,lz0=4.2,lz1=19.2,w=1.7;seg(lx0,lz0,lx1,lz0+w);seg(lx0,lz1,lx1,lz1+w);seg(lx0,lz0,lx0+w,lz1+w);seg(lx1-w,lz0,lx1,lz1+w);
  seg(Wm/2-.85,-14,Wm/2+.85,lz0);seg(Wm/2+6,lz1+w,Wm/2+7.7,Hm+6);
  for(const[x,z]of[[lx0,lz0],[lx1-w,lz0],[lx0,lz1],[lx1-w,lz1]])B.gbOf('trimdark').box(x-.05,0,z-.05,x+w+.05,.015,z+w+.05,1,null,{});
  /* benches and bins along the loop's outer edge, away from wave spawns and cover */
  const nearCh=(X,Z,chs,d)=>{for(let z=0;z<B.H;z++)for(let x=0;x<B.W;x++)if(chs.includes(B.g[z][x])&&Math.hypot(x*TILE+1-X,z*TILE+1-Z)<d)return true;return false};
  let nb=0;for(let X=lx0+5;X<lx1-4&&nb<8;X+=8.5)for(const[Z,yaw]of[[lz0-.55,Math.PI],[lz1+w+.55,0]]){if(nearCh(X,Z,'ScQPt',3.2))continue;bench(B,X,Z,yaw);nb++;if(!low&&partsOf('trash_can'))place(B,'trash_can',X+1.3,Z,0,{h:.85})}
  /* street lamps (park style) at the loop corners */
  for(const[x,z]of[[lx0-1.2,lz0-1.2],[lx1+1.2,lz0-1.2],[lx0-1.2,lz1+w+1.2],[lx1+1.2,lz1+w+1.2]]){const pl=B.gbOf('lamphead');pl.addGeo(cylGeo(.06,.045,3.6,8),M4(x,1.8,z));pl.addGeo(cylGeo(.12,.12,.3,10),M4(x,.15,z));B.gbOf('lampglass').addGeo(new THREE.SphereGeometry(.2,12,8),M4(x,3.75,z));pl.addGeo(cylGeo(.22,.05,.12,10),M4(x,3.98,z))}
  /* party: string lights across the lawn, a banner between two posts, a food table by the grill */
  const T=[];for(let z=0;z<B.H;z++)for(let x=0;x<B.W;x++)if(B.g[z][x]==='t'&&x>0&&z>0&&x<B.W-1&&z<B.H-1)T.push([x*TILE+1,z*TILE+1]);
  const gr=B.lvl.grill||(()=>{for(let z=0;z<B.H;z++)for(let x=0;x<B.W;x++)if(B.g[z][x]==='Q')return{x:x*TILE+1,z:z*TILE+1};return null})();
  if(gr){const near=T.filter(t=>Math.hypot(t[0]-gr.x,t[1]-gr.z)<16).sort((a,b)=>a[0]-b[0]);for(let i=0;i+1<near.length;i++)stringLights(B,[near[i][0],3.6,near[i][1]],[near[i+1][0],3.6,near[i+1][1]],.5);
    if(near.length)stringLights(B,[gr.x-7,3.4,gr.z-2.5],[gr.x+7,3.4,gr.z-2.5],.6);
    const tb=B.gbOf('tent'),mt=B.gbOf('galv');const fx=gr.x+2.2,fz=gr.z-1.4;tb.addGeo(new THREE.BoxGeometry(1.8,.04,.75),M4(fx,.74,fz));for(const u of[-.8,.8])for(const v of[-.3,.3])mt.addGeo(cylGeo(.015,.015,.72,6),M4(fx+u,.36,fz+v));
    if(!low){for(let i=0;i<4;i++)B.gbOf('card2').addGeo(new THREE.BoxGeometry(.32,.06,.24),M4(fx-.6+i*.4,.79,fz+(r()-.5)*.2),1,[.95,.95,.95]);bottles(B,fx+.5,fz,0);
      const ck=B.gbOf('cooler');ck.addGeo(new THREE.BoxGeometry(.62,.4,.4),M4(fx-1.4,.2,fz+.3,.3));B.gbOf('coolerlid').addGeo(new THREE.BoxGeometry(.64,.06,.42),M4(fx-1.4,.43,fz+.3,.3))}
    /* banner over the north spur */
    const bx=Wm/2,bz=-1.4;mt.addGeo(cylGeo(.05,.05,3.4,8),M4(bx-3.3,1.7,bz));mt.addGeo(cylGeo(.05,.05,3.4,8),M4(bx+3.3,1.7,bz));const bn=B.gbOf('banner');bn.quad([bx-3.2,2.4,bz],[bx+3.2,2.4,bz],[bx+3.2,3.3,bz],[bx-3.2,3.3,bz],[[0,0],[1,0],[1,1],[0,1]],null,[0,0,1]);bn.quad([bx+3.2,2.4,bz-.01],[bx-3.2,2.4,bz-.01],[bx-3.2,3.3,bz-.01],[bx+3.2,3.3,bz-.01],[[0,0],[1,0],[1,1],[0,1]],null,[0,0,-1])}
  /* playground past the south edge: mulch bed, swing set, slide tower, see-saw */
  const px=Wm/2+7,pz=Hm+9;mu.floor(px-8,pz-4.5,px+8,pz+5,.01,1.3);B.gbOf('trimdark').box(px-8.1,0,pz-4.6,px+8.1,.12,pz-4.5,1,null,{});
  const sw=B.gbOf('swing'),ch=B.gbOf('galv'),sl=B.gbOf('slide'),pl=B.gbOf('benchwood');
  {const x0=px-6.5,x1=px-1.5,zc=pz;for(const x of[x0,x1])for(const s of[-1,1])sw.addGeo(cylGeo(.05,.05,2.75,8),M4(x,1.28,zc+s*.62,0,s*.24));sw.addGeo(cylGeo(.055,.055,x1-x0+.3,8).rotateZ(Math.PI/2),M4((x0+x1)/2,2.6,zc));
    for(let i=0;i<3;i++){const x=x0+.9+i*1.6;for(const o of[-.22,.22])ch.addGeo(cylGeo(.008,.008,2.0,4),M4(x+o,1.58,zc));B.gbOf('tyreB').addGeo(new THREE.BoxGeometry(.5,.04,.2),M4(x,.56,zc))}}
  {const tx=px+3.5,tz=pz-1;for(const u of[-.7,.7])for(const v of[-.7,.7])sw.addGeo(cylGeo(.06,.06,2.6,8),M4(tx+u,1.3,tz+v));pl.addGeo(new THREE.BoxGeometry(1.6,.08,1.6),M4(tx,1.5,tz));
    sl.addGeo(new THREE.ConeGeometry(1.1,.7,4),M4(tx,2.95,tz,Math.PI/4));const sld=new THREE.BoxGeometry(.6,.05,3.2);sl.addGeo(sld,M4(tx,.85,tz+2.2,0,.5));for(const s of[-1,1])sl.addGeo(new THREE.BoxGeometry(.05,.18,3.2),M4(tx+s*.3,.92,tz+2.2,0,.5));
    for(let i=0;i<5;i++)pl.addGeo(new THREE.BoxGeometry(.5,.05,.18),M4(tx-1.0,.25+i*.28,tz-.1-i*.1))}
  {const sx=px+.5,sz=pz+3;pl.addGeo(new THREE.BoxGeometry(3,.08,.22),M4(sx,.42,sz,0,0,.12));sw.addGeo(new THREE.CylinderGeometry(.15,.2,.4,8),M4(sx,.2,sz))}
  if(!low)for(let i=0;i<3;i++)bench(B,px-6+i*5,pz+5.8,Math.PI);
  /* pavilion with picnic tables past the north-east corner */
  {const vx=Wm-6,vz=-9;const pst=B.gbOf('benchwood');for(const u of[-4,0,4])for(const v of[-3,3])pst.addGeo(new THREE.BoxGeometry(.22,2.8,.22),M4(vx+u,1.4,vz+v));
    const rf=B.gbOf('roof');for(const s of[-1,1])rf.quad([vx-4.6,2.8,vz+s*3.8],[vx+4.6,2.8,vz+s*3.8],[vx+4.6,4.1,vz],[vx-4.6,4.1,vz],[[0,0],[3,0],[3,1.5],[0,1.5]],null,[0,1,s]);
    B.gbOf('drive').box(vx-4.8,0,vz-3.6,vx+4.8,.06,vz+3.6,2,null,{bottom:true});for(const u of[-2.2,2.2])if(partsOf('wooden_picnic_table'))inst(B,'wooden_picnic_table',vx+u,.06,vz,0,.6,1,{sz:.6})}
  /* parking along the north street */
  for(const x of[12,19,40,47])B.parked.push({x,z:-8.5,yaw:0});
  /* low picket fence along the playable edge's outer side */
  const fn=B.gbOf('picket');const pk=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0),ux=(x1-x0)/L,uz=(z1-z0)/L;for(let t=0;t<L;t+=.16)fn.addGeo(new THREE.BoxGeometry(.07,.9,.02),M4(x0+ux*t,.45,z0+uz*t,Math.atan2(ux,uz)+Math.PI/2));for(const y of[.25,.7])fn.obox((x0+x1)/2,y,(z0+z1)/2,L/2,.03,.015,Math.atan2(-(z1-z0),x1-x0),1,null)};
  const e=-3.2;pk(e,e,Wm/2-2,e);pk(Wm/2+2,e,Wm-e,e);pk(Wm-e,e,Wm-e,Hm-e);pk(e,e,e,Hm-e);pk(e,Hm-e,Wm/2+5,Hm-e);pk(Wm/2+9,Hm-e,Wm-e,Hm-e)}
/* ---------- the compound: gate pillars with lanterns, door canopies and sconces, a stucco perimeter wall, cars on the street ---------- */
function compound(B){const Wm=B.W*TILE,Hm=B.H*TILE;const st=B.gbOf('stone'),lg=B.gbOf('lampglass'),ir=B.gbOf('iron'),ex=B.gbOf('ext');const low=B.q==='low';
  const pillar=(X,Z,h,lamp)=>{st.box(X-.32,0,Z-.32,X+.32,h,Z+.32,1.2,null,{});st.box(X-.38,h,Z-.38,X+.38,h+.12,Z+.38,1.2,null,{});
    if(lamp){ir.box(X-.14,h+.12,Z-.14,X+.14,h+.18,Z+.14,1,null,{});lg.addGeo(new THREE.BoxGeometry(.2,.32,.2),M4(X,h+.36,Z));ir.addGeo(new THREE.ConeGeometry(.2,.16,4),M4(X,h+.6,Z,Math.PI/4))}};
  /* hedge row with a gap: pillars every few tiles, lantern pillars at the gate */
  for(let z=0;z<B.H;z++){let run=[];for(let x=0;x<=B.W;x++){const f=x<B.W&&B.g[z][x]==='f';if(f)run.push(x);else if(run.length){const a=run[0],b=run[run.length-1];
        for(const t of run){const end=t===a||t===b;if(end||(t-a)%4===0){const X=t*TILE+1+(t===a&&a>1?-.6:t===b&&b<B.W-2?.6:0),Z=z*TILE+1;pillar(X,Z,end?1.75:1.45,end&&(t===b&&b<B.W-2||t===a&&a>1))}}run=[]}}}
  /* gate lanterns light the drive */
  for(let z=0;z<B.H;z++)for(let x=1;x<B.W-1;x++)if(B.g[z][x]==='f'&&B.g[z][x+1]!=='f'&&B.g[z][x+1]!=='t'){const L=new THREE.PointLight(0xffb060,1.6,12,2);L.position.set(x*TILE+1.6,2.4,z*TILE+1);B.group.add(L);B.lights.push(L);break}
  /* exterior doorways: canopy over the door, a sconce either side */
  const cn=B.gbOf('roof'),tr=B.gbOf('trim');
  for(const o of B.opens){const kA=o.horiz?B.k(o.t0,o.row-1):B.k(o.row-1,o.t0),kB=o.horiz?B.k(o.t0,o.row+1):B.k(o.row+1,o.t0);for(const[k,side]of[[kA,-1],[kB,1]]){if(k==='inside'||k==='out')continue;
      if(o.horiz){const z=side<0?o.z0:o.z1;cn.quad([o.x0-.5,2.95,z],[o.x1+.5,2.95,z],[o.x1+.5,2.7,z+side*1.0],[o.x0-.5,2.7,z+side*1.0],[[0,0],[1.2,0],[1.2,.4],[0,.4]],null,[0,1,side]);tr.box(o.x0-.5,2.58,Math.min(z+side*.98,z+side*1.04),o.x1+.5,2.72,Math.max(z+side*.98,z+side*1.04),1,null,{});
        for(const bxx of[o.x0-.4,o.x1+.4]){ir.box(bxx-.07,1.95,Math.min(z,z+side*.08),bxx+.07,2.3,Math.max(z,z+side*.08),1,null,{});lg.addGeo(new THREE.BoxGeometry(.14,.24,.14),M4(bxx,2.18,z+side*.16))}}
      else{const x=side<0?o.x0:o.x1;cn.quad([x,2.95,o.z0-.5],[x,2.95,o.z1+.5],[x+side*1.0,2.7,o.z1+.5],[x+side*1.0,2.7,o.z0-.5],[[0,0],[1.2,0],[1.2,.4],[0,.4]],null,[side,1,0]);tr.box(Math.min(x+side*.98,x+side*1.04),2.58,o.z0-.5,Math.max(x+side*.98,x+side*1.04),2.72,o.z1+.5,1,null,{});
        for(const bz of[o.z0-.4,o.z1+.4]){ir.box(Math.min(x,x+side*.08),1.95,bz-.07,Math.max(x,x+side*.08),2.3,bz+.07,1,null,{});lg.addGeo(new THREE.BoxGeometry(.14,.24,.14),M4(x+side*.16,2.18,bz))}}}}
  /* compound wall beyond the tree line on three sides, iron railing on top */
  const wall=(x0,z0,x1,z1)=>{st.box(Math.min(x0,x1)-.25,0,Math.min(z0,z1)-.25,Math.max(x0,x1)+.25,.5,Math.max(z0,z1)+.25,1.2,null,{});ex.box(Math.min(x0,x1)-.2,.5,Math.min(z0,z1)-.2,Math.max(x0,x1)+.2,2.6,Math.max(z0,z1)+.2,2.6,null,{});
    st.box(Math.min(x0,x1)-.28,2.6,Math.min(z0,z1)-.28,Math.max(x0,x1)+.28,2.72,Math.max(z0,z1)+.28,1.2,null,{});
    const L=Math.hypot(x1-x0,z1-z0),ux=(x1-x0)/L,uz=(z1-z0)/L;for(let t=0;t<=L;t+=7){pillar(x0+ux*t,z0+uz*t,3.0,false)}if(!low)for(let t=.2;t<L;t+=.24)ir.addGeo(new THREE.BoxGeometry(.025,.6,.025),M4(x0+ux*t,3.02,z0+uz*t))};
  const o=-6.5;wall(o,-1,o,Hm-o);wall(Wm-o,-1,Wm-o,Hm-o);wall(o,Hm-o,Wm-o,Hm-o);
  for(const x of[10,17,38,45])B.parked.push({x,z:-6.5,yaw:0})}
/* ---------- chop shop surroundings: chain-link fence, shipping containers, floodlights, junked cars ---------- */
function yardOutside(B){const Wm=B.W*TILE,Hm=B.H*TILE,r=B.r;const cl=B.gbOf('chain'),gv=B.gbOf('galv'),cf=B.gbOf('container');const low=B.q==='low';
  const fence=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0),ux=(x1-x0)/L,uz=(z1-z0)/L;const nx=-uz,nz=ux;
    cl.quad([x0,0,z0],[x1,0,z1],[x1,2.2,z1],[x0,2.2,z0],[[0,0],[L/1.2,0],[L/1.2,2.2/1.2],[0,2.2/1.2]],null,[nx,0,nz]);for(let t=0;t<=L;t+=3)gv.addGeo(cylGeo(.04,.04,2.4,8),M4(x0+ux*t,1.2,z0+uz*t));
    gv.addGeo(cylGeo(.025,.025,L,6).rotateZ(Math.PI/2).rotateY(-Math.atan2(uz,ux)),M4((x0+x1)/2,2.2,(z0+z1)/2))};
  const o=-2.2;fence(o,o,Wm-o,o);fence(Wm-o,o,Wm-o,Hm-o);fence(Wm-o,Hm-o,o,Hm-o);fence(o,Hm-o,o,o);
  const box=(x,z,ry,col)=>{const c=Math.cos(ry),s=Math.sin(ry),hl=3.05,hw=1.22,h=2.6;const m=M4(x,h/2,z,ry);const g=new THREE.BoxGeometry(hl*2,h,hw*2);
    const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*4,uv.getY(i)*1.2);cf.addGeo(g,m,1,col)};
  const cols=[[.62,.18,.12],[.15,.3,.5],[.2,.45,.3],[.75,.55,.2],[.5,.5,.52]];
  for(let i=0;i<5;i++){const x=6+i*12.5+(r()-.5)*3;box(x,-6.5,(r()-.5)*.08,cols[i%5]);}
  for(let i=0;i<3;i++)box(Wm+6.5,8+i*11,Math.PI/2+(r()-.5)*.1,cols[(i+3)%5]);
  /* stack: a second tier on some */
  for(let i=0;i<2;i++){const m=M4(12+i*25,2.6+1.3,-6.5,.04);const g=new THREE.BoxGeometry(6.1,2.6,2.44);const uv=g.attributes.uv;for(let k=0;k<uv.count;k++)uv.setXY(k,uv.getX(k)*4,uv.getY(k)*1.2);cf.addGeo(g,m,1,cols[(i+1)%5])}
  /* floodlight poles */
  for(const[x,z]of[[-4,-4],[Wm+4,-4],[Wm+4,Hm+4],[-4,Hm+4]]){gv.addGeo(cylGeo(.1,.08,7,8),M4(x,3.5,z));const hd=B.gbOf('lamphead');hd.addGeo(new THREE.BoxGeometry(.6,.35,.2),M4(x,7,z,Math.atan2(Wm/2-x,Hm/2-z),.5));}
  for(const[x,z,yaw]of[[-6,20,Math.PI/2],[-6,30,Math.PI/2+.2],[Wm+6.5,-1,.1]])B.parked.push({x,z,yaw,junk:true})}

/* hanging bulbs and their lights: farthest-point spread over interior tiles, capped at 8 */
function lights(B){const r=B.r;if(B.hub)return;const cands=[];
  for(let z=1;z<B.H-1;z++)for(let x=1;x<B.W-1;x++){if(B.k(x,z)!=='inside')continue;let ok=true;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(B.k(x+dx,z+dz)==='wall')ok=false;if(ok)cands.push([x,z])}
  if(!cands.length)return;const pts=[cands[Math.floor(r()*cands.length)]];
  while(pts.length<8){let best=null,bd=0;for(const c of cands){let d=1e9;for(const p of pts)d=Math.min(d,Math.hypot(c[0]-p[0],c[1]-p[1]));if(d>bd){bd=d;best=c}}if(!best||bd<3.5)break;pts.push(best)}
  const industrial=B.style.lamp==='industrial';
  for(const[tx_,tz]of pts){const X=tx_*TILE+1,Z=tz*TILE+1,yb=2.45;
    const cord=B.gbOf('cord');cord.addGeo(cylGeo(.006,.006,WALLH-yb-.05,4),M4(X,(WALLH+yb)/2,Z));
    if(industrial&&partsOf('hanging_industrial_lamp'))inst(B,'hanging_industrial_lamp',X,yb+1.3,Z,0,1,1,{noShadow:true});
    else if(B.id==='doug'){/* brass chandelier: ring, arms, candle bulbs */const br=B.gbOf('brass');br.addGeo(new THREE.TorusGeometry(.32,.022,6,24).rotateX(Math.PI/2),M4(X,yb,Z));br.addGeo(cylGeo(.03,.05,.35,8),M4(X,yb+.1,Z));
      for(let k=0;k<6;k++){const a=k/6*6.283;br.addGeo(cylGeo(.02,.02,.1,6),M4(X+Math.cos(a)*.32,yb+.05,Z+Math.sin(a)*.32));B.gbOf('bulb').addGeo(new THREE.SphereGeometry(.035,8,6),M4(X+Math.cos(a)*.32,yb+.13,Z+Math.sin(a)*.32))}}
    else{const sk=B.gbOf('metal');sk.addGeo(cylGeo(.028,.034,.09,12),M4(X,yb+.07,Z));sk.addGeo(cylGeo(.02,.024,.03,10),M4(X,yb+.01,Z))}
    if(B.id!=='doug')B.gbOf('bulb').addGeo(new THREE.SphereGeometry(.055,12,8),M4(X,industrial?yb+.02:yb-.02,Z));
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
  B.parked=B.parked||[];
  for(const zc of hs)for(let tries=0;tries<4;tries++){const x=Math.floor(4+r()*(B.W-8));if(!isR(x,zc)||!isR(x-1,zc)||!isR(x+1,zc))continue;let bad=false;for(let dx=-2;dx<=2;dx++)if(isR(x+dx,zc-2)||isR(x+dx,zc+2)||!isR(x+dx,zc))bad=true;
    const side=r()<.5?-1:1,X=x*TILE+1,Z=(zc+side)*TILE+1+side*.28;if(avoid.some(([ax,az])=>Math.hypot(ax-X,az-Z)<26))bad=true;if(B.parked.some(p=>Math.hypot(p.x-X,p.z-Z)<10))bad=true;if(bad)continue;B.parked.push({x:X,z:Z,yaw:side>0?0:Math.PI})}
  for(const xc of vs)for(let tries=0;tries<3;tries++){const z=Math.floor(4+r()*(B.H-8));if(!isR(xc,z))continue;let bad=false;for(let dz=-2;dz<=2;dz++)if(isR(xc-2,z+dz)||isR(xc+2,z+dz)||!isR(xc,z+dz))bad=true;
    const side=r()<.5?-1:1,X=(xc+side)*TILE+1+side*.28,Z=z*TILE+1;if(avoid.some(([ax,az])=>Math.hypot(ax-X,az-Z)<26))bad=true;if(B.parked.some(p=>Math.hypot(p.x-X,p.z-Z)<10))bad=true;if(bad)continue;B.parked.push({x:X,z:Z,yaw:side>0?Math.PI/2:-Math.PI/2})}
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
  if(f.drive)driveway(B,f,nx,nz,r);
  /* mailbox at the walk's end, a bin by the side of the house */
  const mb=P(reach-.1,1.0,0);staticModel(B,'mailbox',mb[0],0,mb[2],Math.atan2(nx,nz)+Math.PI,1);
  if(r()<.7){const bn=P(.7,bmax+.55,0);W.bin(B,bn[0],bn[2],Math.atan2(nx,nz)+(r()-.5)*.4,r()<.5)}};
/* concrete driveway beside the house, across the verge and sidewalk to the gutter; sometimes a car on it */
function driveway(B,f,nx,nz,r){const d=f.drive;const front=nz>0?f.z1:f.z0;let reach=0;
  for(let s=.5;s<12;s+=.25){const k=B.k(Math.floor((d.x0+d.x1)/2/TILE),Math.floor((front+nz*s)/TILE));if(k==='road'){reach=s;break}}if(!reach)return;
  const za=front-nz*4.2,zb=front+nz*reach,z0=Math.min(za,zb),z1=Math.max(za,zb);const sl=B.gbOf('drive'),jt=B.gbOf('joint');
  sl.box(d.x0,0,z0,d.x1,.018,z1,2.2,null,{bottom:true});
  for(let t=1.1;t<reach+4;t+=2.6){const zz=front+nz*(t-4.2+2.6);if(zz>z0+.2&&zz<z1-.2)jt.floor(d.x0,zz-.012,d.x1,zz+.012,.02,1)}
  B.clear.push([d.x0-.1,z0-.1,d.x1+.1,z1+.1]);
  if(r()<.32){B.parked.push({x:(d.x0+d.x1)/2,z:front-nz*1.35,yaw:nz>0?-Math.PI/2:Math.PI/2,drive:true})}}
/* shop forecourt: concrete apron to the sidewalk, bollards, a bench and an ice machine; marks the door for the shop integration */
W.shopFront=(B,o)=>{const sl=B.gbOf('drive');let zEnd=o.z;for(let s=0;s<8;s+=.25){const k=B.k(Math.floor((o.x0+o.x1)/2/TILE),Math.floor((o.z+s)/TILE));if(k==='walk'||k==='road'){zEnd=o.z+s;break}}
  sl.box(o.x0-1.2,0,o.z-.05,o.x1+1.2,.02,zEnd,2.2,null,{bottom:true});B.clear.push([o.x0-1.4,o.z-1,o.x1+1.4,zEnd+.1]);
  const yl=B.gbOf('bollard');for(const bx of[o.x0+.6,o.x0+3,o.x1-3,o.x1-.6]){yl.addGeo(cylGeo(.09,.09,.95,12),M4(bx,.475,zEnd-.35));yl.addGeo(new THREE.SphereGeometry(.09,10,6,0,6.283,0,1.57),M4(bx,.95,zEnd-.35))}
  bench(B,o.door.x-2.6,o.z+.75,0);
  /* door mat and a painted marker for the shop interaction */
  const pg=B.gbOf('paint');pg.floor(o.door.x-.75,o.z+.05,o.door.x+.75,o.z+.95,.025,3,()=>[.2,.22,.24]);
  B.lvl.shopMarker={x:o.door.x,z:o.z+.6}};
/* park bench: cast-iron ends, wooden slats */
function bench(B,x,z,yaw){const wd=B.gbOf('benchwood'),ir=B.gbOf('metal');const c=Math.cos(yaw),s=Math.sin(yaw);const P=(u,v)=>[x+u*c+v*s,z-u*s+v*c];
  for(const u of[-.75,.75]){const p=P(u,0);ir.addGeo(new THREE.BoxGeometry(.06,.44,.5),M4(p[0],.22,p[1],yaw));const q=P(u,-.24);ir.addGeo(new THREE.BoxGeometry(.06,.5,.06),M4(q[0],.68,q[1],yaw,-.18))}
  for(let i=0;i<4;i++){const p=P(0,.18-i*.12);wd.addGeo(new THREE.BoxGeometry(1.75,.035,.09),M4(p[0],.45,p[1],yaw))}
  for(let i=0;i<3;i++){const p=P(0,-.27-i*.02);wd.addGeo(new THREE.BoxGeometry(1.75,.09,.03),M4(p[0],.62+i*.12,p[1],yaw,-.18))}}
W.bench=bench;
/* wheelie bin: tapered body, lid with overhang, axle and wheels */
W.bin=(B,x,z,yaw,blue)=>{const gb=B.gbOf(blue?'binB':'binG'),dk=B.gbOf('tyreB');const prof=new THREE.BoxGeometry(.58,1,.7);const p=prof.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i)+.5;p.setX(i,p.getX(i)*(.88+.12*y));p.setZ(i,p.getZ(i)*(.86+.14*y))}prof.computeVertexNormals();
  gb.addGeo(prof,M4(x,.55,z,yaw));gb.addGeo(new THREE.BoxGeometry(.62,.05,.78),M4(x+Math.sin(yaw)*.03,1.075,z+Math.cos(yaw)*.03,yaw));gb.addGeo(new THREE.BoxGeometry(.5,.05,.06),M4(x-Math.sin(yaw)*.37,1.0,z-Math.cos(yaw)*.37,yaw));
  for(const s of[-1,1]){const w=cylGeo(.1,.1,.05,12);w.rotateZ(Math.PI/2);dk.addGeo(w,M4(x-Math.sin(yaw)*.3+Math.cos(yaw)*s*.28,.1,z-Math.cos(yaw)*.3-Math.sin(yaw)*s*.28,yaw))}};
/* grass tufts: queued, built as instanced cross-quads */
function tufts(B,x,z,rad,n,flowers){const r=B.r;const L=flowers?(B.flw||(B.flw=[])):(B.tuf||(B.tuf=[]));for(let i=0;i<n;i++){const a=r()*6.283,d=Math.sqrt(r())*rad;L.push(x+Math.cos(a)*d,z+Math.sin(a)*d,.5+r()*.55,r()*3.14)}}
function scatterGrass(B){const r=B.r;const dens=B.q==='low'?0:B.q==='high'?1.1:.55;if(!dens)return;
  for(let z=0;z<B.H;z++)for(let x=0;x<B.W;x++){if(B.k(x,z)!=='grass'||B.g[z][x]==='h')continue;
    const edge=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>{const k=B.k(x+dx,z+dz);return k==='walk'||k==='wall'||B.g[z+dz]&&B.g[z+dz][x+dx]==='h'})||B.g[z][x]==='t'||B.g[z][x]==='f';
    const n=Math.round((edge?7:2.5)*dens*(.4+fbm(x/3,z/3)*1.2));for(let i=0;i<n;i++){const X=x*TILE+r()*TILE,Z=z*TILE+r()*TILE;if(B.clear.some(c=>X>c[0]-.3&&X<c[2]+.3&&Z>c[1]-.3&&Z<c[3]+.3))continue;tufts(B,X,Z,.3,3,false)}}}
function buildTufts(B,list,flowers){if(!list||!list.length)return;const geo=new THREE.BufferGeometry();const P=[],U=[],N=[],I=[];
  for(let k=0;k<3;k++){const a=k/3*Math.PI,c=Math.cos(a)*.26,s=Math.sin(a)*.26,h=flowers?.4:.26,i0=P.length/3;P.push(-c,0,-s,c,0,s,c,h,s,-c,h,-s);U.push(0,0,1,0,1,1,0,1);N.push(0,1,0,0,1,0,0,1,0,0,1,0);I.push(i0,i0+1,i0+2,i0,i0+2,i0+3)}
  geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));geo.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));geo.setIndex(I);geo.computeBoundingBox();
  let mat=MC['tuft'+flowers];if(!mat){mat=MC['tuft'+flowers]=new THREE.MeshStandardMaterial({map:grassTex(flowers),alphaTest:.5,side:THREE.DoubleSide,roughness:.95,color:lin(flowers?'#e4ead6':'#eef4dc'),envMapIntensity:.7});
    /* blades share the ground's up normal on both faces (no back-face flip, which turned the far side of every tuft black) and get a root-to-tip gradient */
    mat.onBeforeCompile=sh=>{sh.vertexShader='varying float vTip;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTip=uv.y;');
      sh.fragmentShader='varying float vTip;\n'+sh.fragmentShader.replace('#include <normal_fragment_begin>','vec3 normal=normalize(vNormal);vec3 geometryNormal=normal;').replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb*=mix(.72,1.12,vTip);')};mat.customProgramCacheKey=()=>'httuft'}
  const chunk=64,cells={};for(let i=0;i<list.length;i+=4){const k=Math.floor(list[i]/chunk)+','+Math.floor(list[i+1]/chunk);(cells[k]||(cells[k]=[])).push(i)}
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
    const fo=FADE.uFadeOn.value;FADE.uFadeOn.value=0;R.setRenderTarget(rt);R.setClearColor(0x3c4a30,0);R.clear();R.render(sc,cam);R.setRenderTarget(prevT);R.setClearColor(pc,pa);FADE.uFadeOn.value=fo;
    IMP[name]={tex:rt.texture,w:hw*2,h:hh*2,y0:bb.min.y}}catch(e){console.warn('impostor failed',e);IMP[name]=null}
  return IMP[name]}
function backdrop(B){const r=rngOf(hashStr(B.id)+99);const Wm=B.W*TILE,Hm=B.H*TILE;const cx=Wm/2,cz=Hm/2;
  const dOut=(x,z)=>{const dx=Math.max(0,-x,x-Wm),dz=Math.max(0,-z,z-Hm);return Math.hypot(dx,dz)};
  /* roads that reach the map edge carry on into the distance (hub): corridors are cut through the hills */
  const exits=[];if(B.hub)for(const[o,k]of B.def.lines||[]){const c=(k+.5)*TILE;
    if(o==='h'){if(B.k(1,k)==='road')exits.push({ax:'x',c,from:0,dir:-1});if(B.k(B.W-2,k)==='road')exits.push({ax:'x',c,from:Wm,dir:1})}
    else{if(B.k(k,1)==='road')exits.push({ax:'z',c,from:0,dir:-1});if(B.k(k,B.H-2)==='road')exits.push({ax:'z',c,from:Hm,dir:1})}}
  const roadD=(x,z)=>{let d=1e9;for(const e of exits){const along=(e.ax==='x'?x:z)-e.from;if(along*e.dir<-2)continue;d=Math.min(d,Math.abs((e.ax==='x'?z:x)-e.c))}return d};
  B.roadD=roadD;
  /* terrain ring */
  const hgt=(x,z)=>{const d=dOut(x,z);let h=(sstep(14,150,d)*(5+30*fbm(x/90+7,z/90+3))+sstep(4,20,d)*(fbm(x/20,z/20)-.5)*1.2-.02)*(B.carve?B.carve(x,z):1)+(B.carveY?B.carveY(x,z):0);if(!exits.length)return h;const rd=roadD(x,z);return rd<3.2?-.2:h*sstep(9,30,rd)-.2+.18*sstep(3.2,6,rd)};
  const ext=260,st=8,axis=(a)=>{const v=[];for(let t=-ext;t<0;t+=st)v.push(t);const n=Math.max(1,Math.round(a/st));for(let k=0;k<=n;k++)v.push(a*k/n);for(let t=a+st;t<=a+ext;t+=st)v.push(t);return v};
  const xs=axis(Wm),zs=axis(Hm),g=new GB();const eps=.5;
  for(const e of exits){const A=e.ax==='x'?zs:xs;for(const o of[-6,-3.2,0,3.2,6])A.push(e.c+o)}for(const A of[xs,zs]){A.sort((a,b)=>a-b);for(let i=A.length-1;i>0;i--)if(A[i]-A[i-1]<.05)A.splice(i,1)}
  const nrm=(x,z)=>{const dx=hgt(x+eps,z)-hgt(x-eps,z),dz=hgt(x,z+eps)-hgt(x,z-eps);const v=new THREE.Vector3(-dx,2*eps,-dz).normalize();return v};
  const col=(x,z)=>{const d=dOut(x,z),v=(.7+fbm(x/30,z/30)*.4)*(1-sstep(60,240,d)*.25);return[v*.96,v,v*1.04]};
  for(let j=0;j+1<zs.length;j++)for(let i=0;i+1<xs.length;i++){const x0=xs[i],x1=xs[i+1],z0=zs[j],z1=zs[j+1];
    if(x0>=-.01&&x1<=Wm+.01&&z0>=-.01&&z1<=Hm+.01)continue;
    const pts=[[x0,z0],[x0,z1],[x1,z1],[x1,z0]].map(([x,z])=>[x,hgt(x,z),z]);
    g.quad(pts[0],pts[1],pts[2],pts[3],pts.map(p=>[p[0]/9,p[2]/9]),pts.map(p=>col(p[0],p[2])),[0,1,0])}
  const geo=g.geo();const pa=geo.attributes.position,na=geo.attributes.normal;for(let i=0;i<pa.count;i++){const v=nrm(pa.getX(i),pa.getZ(i));na.setXYZ(i,v.x,v.y,v.z)}
  const t=new THREE.Mesh(geo,matFor(B,'far'));t.receiveShadow=true;B.group.add(t);
  const fr=B.gbOf('farroad'),pg=B.gbOf('paint');
  for(const e of exits){const st=6;for(let a=0;a<220;a+=st){const a0=e.from+e.dir*a,a1=e.from+e.dir*(a+st);const P=(al,cr,y)=>e.ax==='x'?[al,y,cr]:[cr,y,al];
      const q=(gb,c0,c1,y,col)=>{const p=[P(a0,c0,y),P(a0,c1,y),P(a1,c1,y),P(a1,c0,y)];gb.quad(p[0],p[1],p[2],p[3],p.map(v=>[v[0]/3.6,v[2]/3.6]),col?[col,col,col,col]:null,[0,1,0])};
      q(fr,e.c-3,e.c+3,ROADY+.006);const Y=[.85,.55,.1];q(pg,e.c-.19,e.c-.08,ROADY+.01,Y);q(pg,e.c+.08,e.c+.19,ROADY+.01,Y)}}
  /* far houses (or warehouses) just past the border */
  const ind=B.id==='gary';const sid=B.gbOf(ind?'whsWall':'siding'),roof=B.gbOf(ind?'whsRoof':'roof'),fnd=B.gbOf('found');
  const ring=[];const per=2*(Wm+Hm);for(let s=0;s<per;s+=ind?26:17){let x,z,nx,nz;if(s<Wm){x=s;z=-1;nx=0;nz=-1}else if(s<Wm+Hm){x=Wm+1;z=s-Wm;nx=1;nz=0}else if(s<2*Wm+Hm){x=Wm-(s-Wm-Hm);z=Hm+1;nx=0;nz=1}else{x=-1;z=Hm-(s-2*Wm-Hm);nx=-1;nz=0}
    const d=16+r()*14;if(B.roadD(x+nx*d,z+nz*d)<14||B.skipRing&&B.skipRing(x+nx*d,z+nz*d))continue;ring.push([x+nx*d,z+nz*d,nx,nz])}
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
    const d=dOut(x,z);if(d<5||roadD(x,z)<8||B.skipRing&&B.skipRing(x,z))continue;if(ring.some(h=>Math.abs(h[0]-x)<9&&Math.abs(h[1]-z)<9))continue;const name=TREES[i%3];
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
W.crate=(B,X,Z)=>{const r=B.r;if(B.id==='dave')return partyCover(B,X,Z);const kind=r()<.65?'crate':'crate_long';
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
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});g.position.set(X-.3,0,Z);B.group.add(g);try{W.mergeStatic(B,[g],1e5)}catch(e){}return g};
/* inflatable castle: soft rounded shapes, striped corner towers, netting, arch, blower hose */
const PILLOW=(()=>{const g=new THREE.LatheGeometry([[0,-.55],[.1,-.54],[.15,-.5],[.17,-.4],[.17,.4],[.15,.5],[.1,.54],[0,.55]].map(p=>new THREE.Vector2(p[0],p[1])),12);return g})();
W.bounce=(B,X,Z)=>{const g=new THREE.Group();const R=matFor(B,'vinylR'),Bl=matFor(B,'vinylB'),Y=matFor(B,'vinylY');
  const net=MC.bnet||(MC.bnet=new THREE.MeshStandardMaterial({map:netTex(),transparent:true,alphaTest:.3,side:THREE.DoubleSide,roughness:.8,color:lin('#ffffff')}));
  const add=(geo,m,x,y,z,rx=0,ry=0,rz=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=o.receiveShadow=true;g.add(o);return o};
  /* puffy base: a rounded slab plus a fat bumper tube around it */
  const sh=new THREE.Shape();const hw=1.45,rr=.35;sh.moveTo(-hw+rr,-hw);sh.lineTo(hw-rr,-hw);sh.quadraticCurveTo(hw,-hw,hw,-hw+rr);sh.lineTo(hw,hw-rr);sh.quadraticCurveTo(hw,hw,hw-rr,hw);sh.lineTo(-hw+rr,hw);sh.quadraticCurveTo(-hw,hw,-hw,hw-rr);sh.lineTo(-hw,-hw+rr);sh.quadraticCurveTo(-hw,-hw,-hw+rr,-hw);
  const slab=new THREE.ExtrudeGeometry(sh,{depth:.38,bevelEnabled:true,bevelThickness:.1,bevelSize:.1,bevelSegments:4,curveSegments:8});slab.rotateX(-Math.PI/2);add(slab,Bl,0,.1,0);
  const ring=new THREE.CatmullRomCurve3([[-1.2,-1.3],[1.2,-1.3],[1.3,1.2],[-1.3,1.2]].map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal');
  add(new THREE.TubeGeometry(ring,48,.2,10,true),R,0,.75,0);
  /* walls: vertical pillow tubes on three sides, netting above */
  for(const[ax,az,ry]of[[0,-1.3,0],[-1.3,0,Math.PI/2],[1.3,0,Math.PI/2]])for(let i=-2;i<=2;i++){const off=i*.48;const px=ax+(az?off:0),pz=az+(ax?off:0);add(PILLOW,i%2?Y:Bl,px,1.32,pz)}
  for(const[ax,az,ry]of[[0,-1.3,0],[-1.3,0,Math.PI/2],[1.3,0,Math.PI/2]]){const n=add(new THREE.PlaneGeometry(2.4,1.0),net,ax,2.25,az,0,ry,0);n.castShadow=false}
  /* corner towers: striped columns with domed caps and a spire */
  for(const sx of[-1.3,1.3])for(const sz of[-1.3,1.3]){for(let k=0;k<4;k++)add(new THREE.CylinderGeometry(.3,.31,.58,16),k%2?Y:R,sx,.82+k*.58,sz);
    add(new THREE.SphereGeometry(.34,16,10),R,sx,3.15,sz);add(new THREE.ConeGeometry(.16,.45,12),Y,sx,3.55,sz)}
  /* front arch and entrance ramp */
  const arch=new THREE.TorusGeometry(.95,.22,10,24,Math.PI);add(arch,Y,0,1.65,1.3);add(new THREE.CylinderGeometry(.22,.22,1.0,12),Y,-.95,1.15,1.3);add(new THREE.CylinderGeometry(.22,.22,1.0,12),Y,.95,1.15,1.3);
  const rp=new THREE.BoxGeometry(1.5,.35,1.0);add(rp,R,0,.17,1.95);
  /* roof: domed canopy in two colours */
  const dome=new THREE.SphereGeometry(1.5,24,8,0,Math.PI*2,0,Math.PI/2.6);dome.scale(1,.55,1);add(dome,Bl,0,2.75,0);add(new THREE.ConeGeometry(.12,.5,10),Y,0,3.55,0);
  /* blower and hose */
  add(new THREE.CylinderGeometry(.12,.12,1.1,12),Y,-1.65,.13,-1.0,0,0,Math.PI/2);const bl=add(new THREE.BoxGeometry(.4,.36,.36),matFor(B,'cooler'),-2.35,.18,-1.0);
  g.position.set(X,0,Z);B.group.add(g);try{W.mergeStatic(B,[g],1e5)}catch(e){}return g};
/* block-party cover tile: picnic table with coolers and drink cases stacked on it (or hay bales without the model) */
function partyCover(B,X,Z){const r=B.r;const yaw=r()<.5?0:Math.PI/2;const c=Math.cos(yaw),sn=Math.sin(yaw);
  if(partsOf('wooden_picnic_table')){inst(B,'wooden_picnic_table',X,0,Z,yaw,.6,1,{sz:.6});
    const cool=(u,y)=>{const x=X+u*c,z=Z-u*sn,a=yaw+(r()-.5)*.3;B.gbOf('cooler').addGeo(new THREE.BoxGeometry(.62,.34,.4),M4(x,y+.17,z,a));B.gbOf('coolerlid').addGeo(new THREE.BoxGeometry(.64,.06,.42),M4(x,y+.37,z,a))};
    cool(-.45,.75);cool(.4,.75);const cs=B.gbOf('card2');for(let i=0;i<2;i++)cs.addGeo(new THREE.BoxGeometry(.4,.26,.28),M4(X+(.4)*c,.75+.4+i*.26,Z-.4*sn,yaw+(r()-.5)*.2),1,[1,.45,.35]);
    return true}
  const hy=B.gbOf('hay');for(const[ox,oz,y]of[[-.42,0,0],[.42,0,0],[0,0,.46]])hy.box(X+ox-.4,y,Z+oz-.75,X+ox+.4,y+.46,Z+oz+.75,1,null,{});return true}
/* lot fences between neighbouring houses and along shared back lines (hub) */
W.lotFences=(B,houses)=>{const out=[];const T=.08;
  const addF=(ax,az,bx,bz)=>{W.fence(B,ax,az,bx,bz);B.lvl.colliders.push({x0:Math.min(ax,bx)-T,z0:Math.min(az,bz)-T,x1:Math.max(ax,bx)+T,z1:Math.max(az,bz)+T})};
  houses=houses.map(h=>h.lot?{...h,...h.lot}:h);
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
const FADE_KEYS={lamphead:[1,2.6],lampglass:[1,2.6],galv:[.8,2],signs:[.8,2],pole:[1,2.6],insul:[1,2.6],transformer:[1,2.6],fence:[.6,1.6],leaves:[2,4.5],hedgecore:[.6,1.6],wire:[1,2.6],joist:[.5,1.2],roofsheet:[.5,1.2],ceil:[.4,1],roof:[.5,1.2]};
W.finish=(B,o={})=>{/* o.bare: no street dressing/clutter/backdrop (the open world dresses its own chunks); o.before(B): last look at the builders */
  if(!o.bare){if(B.hub)hubDressing(B);if(!B.hub){if(B.id==='dave')park(B);else{dress(B);if(B.id==='doug')compound(B);if(B.id==='gary')yardOutside(B)}lights(B)}}
  scatterGrass(B);if(o.before)o.before(B);
  if(!o.bare)try{backdrop(B)}catch(e){console.warn('backdrop failed',e)}
  for(const key in B.gb){const gb=B.gb[key];if(!gb.n)continue;if(B.q==='low'&&key.startsWith('d_')&&key!=='d_manhole'&&key!=='d_drain')continue;let m=DECALS[key]?DECALS[key]():matFor(B,key);if(!m)continue;
    if(FADE_KEYS[key])fadeMat(m,FADE_KEYS[key][0],FADE_KEYS[key][1]);
    const mesh=new THREE.Mesh(gb.geo(),m);mesh.receiveShadow=true;mesh.castShadow=!B.shadowless.has(key)&&!key.startsWith('d_');if(key.startsWith('d_')||key==='paint'||key==='joint')mesh.renderOrder=1;mesh.userData.wkey=key;B.group.add(mesh);
    if(key==='ext'||key==='int'||key==='cap')B.lvl.solids.push(mesh)}
  if(B.furn&&B.furn.children.length){try{W.mergeStatic(B,[B.furn],1e5,true)}catch(e){console.warn('furniture merge failed',e)}}
  buildInst(B);buildTufts(B,B.tuf,false);buildTufts(B,B.flw,true);
  W._last=B;W.quality(B.q,B);
  return B};
/* static groups (houses, parked cars): bake every mesh into shared per-material geometry, chunked spatially so culling still works.
   Each group keeps one invisible box proxy for bullets and the camera; returns the set of meshes that were merged away. */
/* identical-looking materials (each car builds its own glass, chrome, tyres...) collapse to one so they merge across groups */
const CANON={};const MKEYS=['type','roughness','metalness','opacity','transparent','side','vertexColors','alphaTest','emissiveIntensity','envMapIntensity','clearcoat','clearcoatRoughness','transmission','toneMapped','depthWrite','flatShading','polygonOffset','polygonOffsetFactor','wireframe','visible','blending'];
function canonMat(m){if(m.onBeforeCompile&&m.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile)return m;
  const k=MKEYS.map(p=>m[p]===undefined?'':m[p]).join(',')+'|'+['color','emissive','specular','sheen'].map(p=>m[p]&&m[p].getHexString?m[p].getHexString():'').join(',')+'|'+['map','normalMap','roughnessMap','metalnessMap','emissiveMap','alphaMap','aoMap','envMap','bumpMap','lightMap'].map(p=>m[p]?m[p].uuid:'').join(',')+'|'+(m.normalScale?m.normalScale.x+','+m.normalScale.y:'');
  return CANON[k]||(CANON[k]=m)}
/* quantized glTF attributes (KHR_mesh_quantization) are normalized integers: getX returns the raw value in r128 */
function nf(a){if(!a||!a.normalized)return 1;const t=a.array;return t instanceof Int8Array?1/127:t instanceof Uint8Array?1/255:t instanceof Int16Array?1/32767:t instanceof Uint16Array?1/65535:1}
W.mergeStatic=(B,groups,chunk=96,noProxy)=>{const buckets={},gone=new Set(),v=new THREE.Vector3(),n=new THREE.Vector3(),nm=new THREE.Matrix3();
  B.group.updateMatrixWorld(true);
  for(const g of groups){if(!g||!g.parent)continue;const box=new THREE.Box3().setFromObject(g);if(box.isEmpty())continue;
    const ctr=box.getCenter(new THREE.Vector3()),sz=box.getSize(new THREE.Vector3());const ck=Math.floor(ctr.x/chunk)+','+Math.floor(ctr.z/chunk);
    const meshes=[];g.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&!o.isInstancedMesh&&o.visible&&o.material&&!Array.isArray(o.material)&&!(o.geometry.morphAttributes&&Object.keys(o.geometry.morphAttributes).length)&&o.material.visible!==false)meshes.push(o)});
    for(const o of meshes){const ga=o.geometry.attributes;if(!ga.position||!ga.normal)continue;o.updateWorldMatrix(true,false);o.userData.htMW=o.matrixWorld.clone();
      const sig=['uv','color'].map(k=>ga[k]?k+ga[k].itemSize:'').join('');const mat=canonMat(o.material);const key=mat.uuid+'|'+sig+'|'+ck+'|'+(o.castShadow?1:0)+(o.receiveShadow?1:0)+'|'+o.renderOrder;
      (buckets[key]||(buckets[key]={mat,list:[],cast:o.castShadow,recv:o.receiveShadow,ro:o.renderOrder,uv:ga.uv?ga.uv.itemSize:0,col:ga.color?ga.color.itemSize:0})).list.push(o);gone.add(o)}
    for(const o of meshes)if(gone.has(o)){o.parent.remove(o);if(g.userData.drawCalls!=null)o.userData.htDispose=true}
    if(!noProxy){const pr=W.proxy(B,sz.x,sz.y,sz.z,ctr.x,ctr.y,ctr.z);pr.userData.mergedFrom=g;B.lvl.solids.push(pr)}}
  for(const key in buckets){const bk=buckets[key];let nv=0,ni=0;for(const o of bk.list){const g=o.geometry;nv+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count}
    const P=new Float32Array(nv*3),N=new Float32Array(nv*3),U=bk.uv?new Float32Array(nv*bk.uv):null,K=bk.col?new Float32Array(nv*bk.col):null,I=nv>65535?new Uint32Array(ni):new Uint16Array(ni);let vo=0,io=0;
    for(const o of bk.list){const g=o.geometry,pa=g.attributes.position,na=g.attributes.normal,ua=g.attributes.uv,ka=g.attributes.color;const mw=o.userData.htMW;nm.getNormalMatrix(mw);
      const fp=nf(pa),fn=nf(na),fu=nf(ua),fk=nf(ka);
      for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i).multiplyScalar(fp).applyMatrix4(mw);P.set([v.x,v.y,v.z],(vo+i)*3);n.fromBufferAttribute(na,i).multiplyScalar(fn).applyMatrix3(nm).normalize();N.set([n.x,n.y,n.z],(vo+i)*3);
        if(U){U[(vo+i)*bk.uv]=ua.getX(i)*fu;U[(vo+i)*bk.uv+1]=ua.getY(i)*fu}if(K){for(let c=0;c<bk.col;c++)K[(vo+i)*bk.col+c]=(c===0?ka.getX(i):c===1?ka.getY(i):c===2?ka.getZ(i):ka.getW(i))*fk}}
      /* mirrored transforms flip winding */
      const flip=mw.determinant()<0;
      if(g.index){for(let i=0;i<g.index.count;i+=3){const a=g.index.getX(i),b=g.index.getX(i+1),c=g.index.getX(i+2);I[io++]=vo+a;I[io++]=vo+(flip?c:b);I[io++]=vo+(flip?b:c)}}
      else for(let i=0;i<pa.count;i+=3){I[io++]=vo+i;I[io++]=vo+i+(flip?2:1);I[io++]=vo+i+(flip?1:2)}
      vo+=pa.count}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,3));if(U)geo.setAttribute('uv',new THREE.BufferAttribute(U,bk.uv));if(K)geo.setAttribute('color',new THREE.BufferAttribute(K,bk.col));
    geo.setIndex(new THREE.BufferAttribute(I,1));geo.computeBoundingSphere();
    const mesh=new THREE.Mesh(geo,bk.mat);mesh.castShadow=bk.cast;mesh.receiveShadow=bk.recv;mesh.renderOrder=bk.ro;mesh.userData.wkey='merged';mesh.matrixAutoUpdate=false;B.group.add(mesh)}
  /* buildings own their geometry; vehicle parts may share geometry with the player's van, so those are left to GC */
  for(const o of gone)if(o.userData.htDispose)o.geometry.dispose();
  return gone};
/* graphics setting changed: hide grass tufts on Low */
W.quality=(q,B)=>{const b=B||W._last;if(!b)return;b.q=q;b.lod.forEach(l=>l.near=undefined);b.group.traverse(o=>{if(o.userData&&o.userData.tufts)o.visible=q!=='low'})};
W._track=B=>{W._last=B};
/* per frame: swap tree chunks between real meshes and impostors by camera distance */
W.update=(lvl,cam)=>{const B=lvl&&lvl.world;if(!B||!B.lod.length)return;const R=B.q==='low'?24:B.q==='high'?60:38;IMPU.uCam.value.copy(cam);IMPU.uR.value=R;
  for(const l of B.lod){const d=Math.hypot(l.c.x-cam.x,l.c.z-cam.z)-l.r;const near=d<R;if(l.near===near)continue;l.near=near;for(const m of l.real)m.visible=near}};
W.matFor=matFor;W.inst=inst;W.backdrop=backdrop;W.LEVEL_STYLE=LEVEL_STYLE;W.buildInst=buildInst;W.TREES=TREES;W.GB=GB;W.rng=rngOf;W.partsOf=partsOf;W.tufts=tufts;
window.HT.World=W;
})();
