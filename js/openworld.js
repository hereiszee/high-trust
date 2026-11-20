/* High Trust · HT.OpenWorld
 * Renders the continuous world from js/worldgen.js (HT.WorldGen.build) as the game's hub (docs/design/SPEC2.md A, layers W1/W2).
 *   - 32x32-tile chunks, built lazily near the camera and shown/hidden by distance + frustum.
 *     Each chunk reuses js/world.js recipes (ground surfaces, curbs, lamps, trees, yards, hedges, crates) on a windowed builder,
 *     merges the HT.Buildings houses/shops/shells per material, and owns its trust-tier dressing meshes.
 *   - Mission sites, the river, the bridge, the gas station, the church, the court and the backdrop are separate cull units.
 *   - Colliders come from the tile grid up front, in a 16 m spatial hash (lvl.cgrid); raycast proxies for the nearby solids only.
 * index.html keeps the game logic; this file only builds and updates what you see, plus the collision/raycast data. */
(function(){
'use strict';
const HT=window.HT=window.HT||{};
const TILE=2,CHUNK=32,CELL=16;
const tc=i=>i*TILE+TILE/2;
const OW={};let C=null;
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
const HW=()=>HT.World&&HT.World.begin?HT.World:null;   /* js/world.js (dressing). The generator is HT.WorldGen. */
const BU=()=>HT.Buildings&&HT.Buildings.house?HT.Buildings:null;
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const sstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
const MC={};
function stdMat(key,o){if(MC[key])return MC[key];const m=new THREE.MeshStandardMaterial(Object.assign({roughness:.8,metalness:0},o));if(o&&o.color&&typeof o.color==='string')m.color=lin(o.color);return MC[key]=m}
function basicGlow(key,c,k){if(MC[key])return MC[key];return MC[key]=new THREE.MeshBasicMaterial({color:lin(c).multiplyScalar(k||2),toneMapped:false})}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function ctex(c,o={}){const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;if(o.rep)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}

/* ================= tile kinds ================= */
/* surface kind per tile for the world.js ground builder: road (lowered, curbs), lot, walk, grass, inside, wall (no ground) */
function computeKinds(def){const W=def.W,H=def.H,K=new Array(W*H),road=new Uint8Array(W*H);
  for(const r of def.roads){if(r.o==='h'){for(let z=r.k;z<=r.k+2;z++)for(let x=r.a;x<=r.b;x++)road[z*W+x]=1}else for(let z=r.a;z<=r.b;z++)for(let x=r.k;x<=r.k+2;x++)road[z*W+x]=1}
  for(let z=0;z<H;z++)for(let x=0;x<W;x++){const i=z*W+x,c=def.map[z][x],gc=def.ground[z][x];let k;
    if(c==='#'||c==='~')k='wall';
    else if(c==='|')k='walk';
    else if(c==='='||c==='!')k='road';
    else if(gc===',')k=road[i]?'road':'lot';
    else if(gc==='.')k='inside';
    else if(gc==='s')k='walk';
    else if(gc==='b')k='lot';
    else k='grass';
    if(isShoulder(x,z)&&(gc==='s'))k='road';
    K[i]=k}
  return{K,road}}
/* Route 9 is the arterial: its sidewalks become paved shoulders (5 lanes of asphalt between the lots) */
function isShoulder(x,z){return(z===19&&x>=100&&x<=139)||(z===23&&x>=104&&x<=139)}
const R9={x0:100,x1:141};
/* Route 9 frontage on the empty lawns: a self-storage yard and two billboards (metres; colliders + set piece 'r9lots') */
const R9_STORAGE=[{x0:254,z0:6,x1:278,z1:12},{x0:254,z0:20,x1:278,z1:26}],R9_PAD={x0:250,z0:2,x1:280,z1:32};
/* block party on Benny's depot lot (metres): bounce house, two long tables */
const PARTY={x0:418,z0:29,x1:436,z1:37},PARTY_COLS=[{x0:419,z0:30,x1:422.2,z1:33.2,ph:3},{x0:425,z0:30.6,x1:431,z1:31.6,ph:.8},{x0:425,z0:34.4,x1:431,z1:35.4,ph:.8}];
const R9_BILL=[{x:268,z:34.6,ry:0,ad:0},{x:266,z:52.6,ry:Math.PI,ad:1}];

/* ================= colliders, spatial hash, raycast proxies ================= */
function blocksOf(def,ch){const W=def.W,H=def.H,seen=new Uint8Array(W*H),out=[];const g=def.map;
  for(let z=0;z<H;z++)for(let x=0;x<W;x++){if(g[z][x]!==ch||seen[z*W+x])continue;let x1=x;while(x1<W&&g[z][x1]===ch)x1++;let z1=z;while(z1<H&&g[z1][x]===ch)z1++;
    for(let zz=z;zz<z1;zz++)for(let xx=x;xx<x1;xx++)seen[zz*W+xx]=1;out.push({x0:x,z0:z,x1:x1-1,z1:z1-1})}return out}
function lampSpot(l){/* Route 9 lamps sit at the outer edge of the shoulder */
  if(isShoulder(l.tx,l.tz))return{x:l.x,z:l.tz===19?tc(19)-.8:tc(23)+.8};return{x:l.x,z:l.z}}
function staticColliders(def,S){const g=def.map,W=def.W,H=def.H;
  /* ph: raycast proxy height. h is the game's 'low collider' top (stand on it / vault it), only for crates, tables, hedges and beds */
  const LOW={crate:1,table:1,hedge:1,bed:1};const add=(x0,z0,x1,z1,h,k,o)=>{const c={x0,z0,x1,z1,ph:h,k};if(LOW[k])c.h=h;if(o)Object.assign(c,o);S.push(c);return c};
  for(let z=0;z<H;z++){let x=0;while(x<W){if(g[z][x]==='#'){const s=x;while(x<W&&g[z][x]==='#')x++;add(s*TILE,z*TILE,x*TILE,z*TILE+TILE,3.3,'wall')}else x++}}
  for(const b of def.houses)add(b.x0*TILE+.15,b.z0*TILE+.15,(b.x1+1)*TILE-.15,(b.z1+1)*TILE-.15,7.5,'house');
  for(const[ch,h]of[['r',9.5],['x',7.5],['A',6]])for(const b of blocksOf(def,ch))add(b.x0*TILE+.1,b.z0*TILE+.1,(b.x1+1)*TILE-.1,(b.z1+1)*TILE-.1,h,'bldg');
  for(const b of blocksOf(def,'~'))add(b.x0*TILE,b.z0*TILE,(b.x1+1)*TILE,(b.z1+1)*TILE,0,'water');
  for(const t of def.trees)add(t.x-.45,t.z-.45,t.x+.45,t.z+.45,3,'tree');
  for(const l of def.lamps){const p=lampSpot(l);add(p.x-.2,p.z-.2,p.x+.2,p.z+.2,7,'lamp')}
  for(const c of def.crates)add(c.x-.85,c.z-.85,c.x+.85,c.z+.85,1.15,'crate');
  for(const t of def.tables)add(t.x-.9,t.z-.55,t.x+.9,t.z+.55,.85,'table');
  for(const r of def.hedges)for(let z=r.z0;z<=r.z1;z++)for(let x=r.x0;x<=r.x1;x++){const X=tc(x),Z=tc(z);if(r.o==='h')add(X-1,Z-.4,X+1,Z+.4,1.2,'hedge');else add(X-.4,Z-1,X+.4,Z+1,1.2,'hedge')}
  for(const r of def.chainlink){if(r.o==='h')add(r.x0*TILE,tc(r.z0)-.12,(r.x1+1)*TILE,tc(r.z0)+.12,0,'fence');else add(tc(r.x0)-.12,r.z0*TILE,tc(r.x0)+.12,(r.z1+1)*TILE,0,'fence')}
  for(const r of def.rails){const z=r.z0===def.bridge.z0?r.z0*TILE+.05:(r.z0+1)*TILE-.05;add(r.x0*TILE,z-.3,(r.x1+1)*TILE,z+.3,1.1,'rail')}
  for(const p of def.pumps)add(p.x-.6,p.z-1.3,p.x+.6,p.z+1.3,1.9,'pump');
  for(const b of def.beds)add(b.x0*TILE+.1,b.z-.8,(b.x1+1)*TILE-.1,b.z+.8,.45,'bed');
  for(const id in def.sites){const s=def.sites[id];const q=s.grill;if(!q)continue;
    if(q.shed)add(q.x-.8,q.z-.7,q.x+.8,q.z+.7,2.2,'shed');else{add(q.x-.7,q.z-.5,q.x+.7,q.z+.5,1,'grill');if(s.bounce)add(s.bounce.x-1.55,s.bounce.z-1.55,s.bounce.x+1.55,s.bounce.z+1.55,3,'bounce')}}
  for(const r of R9_STORAGE)add(r.x0,r.z0,r.x1,r.z1,3.2,'bldg');
  for(const b of R9_BILL)for(const dx of[-2.4,2.4])add(b.x+dx-.25,b.z-.25,b.x+dx+.25,b.z+.25,7,'pole');
  for(const b of def.barricade)add(b.x-.4,b.z-1,b.x+.6,b.z+1,1.3,'barricade',{barricade:true});
  return S}
const proxyGeo=new THREE.BoxGeometry(1,1,1),proxyMat=new THREE.MeshBasicMaterial({visible:false});
function proxyOf(c){if(c.proxy)return c.proxy;const m=new THREE.Mesh(proxyGeo,proxyMat);const w=c.x1-c.x0,d=c.z1-c.z0;m.scale.set(w,c.ph,d);m.position.set((c.x0+c.x1)/2,c.ph/2,(c.z0+c.z1)/2);m.updateMatrixWorld(true);m.userData.proxy=true;c.proxy=m;return m}
function makeHash(lvl,S){const cells=new Map(),always=[];const key=(cx,cz)=>(cx+64)*4096+(cz+64);
  for(const c of S){if((c.x1-c.x0)>200||(c.z1-c.z0)>200){always.push(c);continue}
    for(let cx=Math.floor(c.x0/CELL);cx<=Math.floor(c.x1/CELL);cx++)for(let cz=Math.floor(c.z0/CELL);cz<=Math.floor(c.z1/CELL);cz++){const k=key(cx,cz);let a=cells.get(k);if(!a)cells.set(k,a=[]);a.push(c)}}
  let qid=1;const out=[];
  lvl.cgrid=(p,r)=>{qid++;out.length=0;const cols=lvl.colliders;
    for(let cx=Math.floor((p.x-r)/CELL);cx<=Math.floor((p.x+r)/CELL);cx++)for(let cz=Math.floor((p.z-r)/CELL);cz<=Math.floor((p.z+r)/CELL);cz++){const a=cells.get(key(cx,cz));if(!a)continue;for(const c of a)if(c._q!==qid){c._q=qid;out.push(c)}}
    for(const c of always)out.push(c);for(let i=lvl.nStatic;i<cols.length;i++)out.push(cols[i]);return out};
  /* static colliders whose AABB is within r of (x,z) */
  lvl.cnear=(x,z,r)=>{qid++;const res=[];for(let cx=Math.floor((x-r)/CELL);cx<=Math.floor((x+r)/CELL);cx++)for(let cz=Math.floor((z-r)/CELL);cz<=Math.floor((z+r)/CELL);cz++){const a=cells.get(key(cx,cz));if(!a)continue;for(const c of a)if(c._q!==qid){c._q=qid;res.push(c)}}return res};
  lvl.cbrute=(p,r)=>lvl.colliders.filter(c=>p.x+r>c.x0&&p.x-r<c.x1&&p.z+r>c.z0&&p.z-r<c.z1)}

/* ================= geometry helpers ================= */
/* keep only triangles whose centroid lies in the box (metres): the world.js ground builder runs on a window with a margin */
function clipGB(gb,b){const P=gb.P,I=gb.I,o=[];for(let i=0;i<I.length;i+=3){const a=I[i]*3,c=I[i+1]*3,d=I[i+2]*3;const x=(P[a]+P[c]+P[d])/3,z=(P[a+2]+P[c+2]+P[d+2])/3;
  if(x>=b.x0&&x<b.x1&&z>=b.z0&&z<b.z1)o.push(I[i],I[i+1],I[i+2])}gb.I=o}
function gbMesh(gb,mat,o={}){if(!gb||!gb.I.length)return null;const m=new THREE.Mesh(gb.geo(),mat);m.castShadow=!!o.shadow;m.receiveShadow=o.receive!==false;if(o.order)m.renderOrder=o.order;return m}
/* merge HT.Buildings groups (already positioned) per material into one mesh each */
function mergeGroups(list,parent,keepGeo){const by=new Map();
  for(const g of list){g.updateMatrixWorld(true);g.traverse(o=>{if(!o.isMesh||!o.geometry)return;const k=o.material.uuid;let e=by.get(k);if(!e)by.set(k,e={mat:o.material,items:[],cast:o.castShadow,recv:o.receiveShadow,order:o.renderOrder,name:o.name||(o.userData&&o.userData.wkey)||''});e.items.push(o)})}
  const nm=new THREE.Matrix3(),v=new THREE.Vector3();let n=0;
  for(const e of by.values()){let vc=0,ic=0;for(const o of e.items){vc+=o.geometry.attributes.position.count;ic+=o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count}
    const P=new Float32Array(vc*3),N=new Float32Array(vc*3),U=new Float32Array(vc*2),K=new Float32Array(vc*3).fill(1),I=new Uint32Array(ic);let vo=0,io=0;
    for(const o of e.items){const g=o.geometry,p=g.attributes.position,no=g.attributes.normal,uv=g.attributes.uv,col=g.attributes.color,mw=o.matrixWorld;nm.getNormalMatrix(mw);
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mw);P[(vo+i)*3]=v.x;P[(vo+i)*3+1]=v.y;P[(vo+i)*3+2]=v.z;
        if(no){v.fromBufferAttribute(no,i).applyMatrix3(nm).normalize();N[(vo+i)*3]=v.x;N[(vo+i)*3+1]=v.y;N[(vo+i)*3+2]=v.z}
        if(uv){U[(vo+i)*2]=uv.getX(i);U[(vo+i)*2+1]=uv.getY(i)}if(col){K[(vo+i)*3]=col.getX(i);K[(vo+i)*3+1]=col.getY(i);K[(vo+i)*3+2]=col.getZ(i)}}
      if(g.index)for(let i=0;i<g.index.count;i++)I[io++]=vo+g.index.getX(i);else for(let i=0;i<p.count;i++)I[io++]=vo+i;vo+=p.count}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,3));geo.setAttribute('uv',new THREE.BufferAttribute(U,2));geo.setAttribute('color',new THREE.BufferAttribute(K,3));
    geo.setIndex(new THREE.BufferAttribute(I,1));geo.computeBoundingSphere();geo.computeBoundingBox();
    const m=new THREE.Mesh(geo,e.mat);m.name='m:'+e.name;m.castShadow=e.cast;m.receiveShadow=e.recv;m.renderOrder=e.order;parent.add(m);n++}
  if(!keepGeo)for(const g of list)g.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose()});return n}
/* merge the plain meshes of a set piece by material, keeping toggled dressing objects separate (each compacted on its own) */
function compact(g,keep){const meshes=[];const kept=new Set(keep||[]);
  const walk=o=>{for(const c of [...o.children]){if(c.userData.noCompact)continue;if(kept.has(c)){if(c.isGroup||c.type==='Object3D')compact(c,[]);continue}
    if(c.isMesh&&!c.isInstancedMesh&&!c.isSkinnedMesh&&!Array.isArray(c.material)&&c.geometry&&c.geometry.attributes.normal)meshes.push(c);else if(!c.isMesh)walk(c)}};walk(g);
  if(meshes.length<2)return;const holder=new THREE.Group();for(const m of meshes){m.updateMatrixWorld(true);holder.add(m.clone())}
  for(const m of meshes)m.parent.remove(m);
  /* clones keep their world matrices relative to g */
  const inv=new THREE.Matrix4().copy(g.matrixWorld).invert();holder.children.forEach((c,i)=>{c.matrix.copy(inv).multiply(meshes[i].matrixWorld);c.matrix.decompose(c.position,c.quaternion,c.scale)});
  mergeGroups([holder],g,true)}
/* a world.js builder on a tile window: B.k answers the real kind inside the window (plus a margin) and 'out' beyond */
function newB(world,group,id,win,margin,seed){const W_=HW();const pl={def:{id,lines:[],under:world.def.under},g:[],W:0,H:0,group,colliders:[],solids:[]};
  const B=W_.begin(pl);B.g=world.G;B.W=world.def.W;B.H=world.def.H;B.r=rng(seed||1);
  const K=world.K,Wd=world.def.W,Hd=world.def.H,x0=win.x0-margin,z0=win.z0-margin,x1=win.x1+margin,z1=win.z1+margin;
  B.k=(x,z)=>x<x0||z<z0||x>x1||z>z1||x<0||z<0||x>=Wd||z>=Hd?'out':K[z*Wd+x];return B}
const boxOfTiles=w=>({x0:w.x0*TILE,z0:w.z0*TILE,x1:(w.x1+1)*TILE,z1:(w.z1+1)*TILE});
const M4=(x,y,z,ry=0,rx=0,rz=0,s=1)=>{const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.setScalar(s);o.updateMatrix();return o.matrix};
function cyl(r0,r1,h,seg=10,open){return new THREE.CylinderGeometry(r1,r0,h,seg,1,open)}

/* ================= textures ================= */
const TX={};
const STREETS_ALL=['OAK ST','MAPLE AVE','ELM ST','BIRCH ST','CEDAR LN','LINDEN AVE','WALNUT DR','RIDGEVIEW DR','INDUSTRIAL WAY','ROUTE 9','ASH ST','MILL ST','DOCK ST','RIVER RD','2ND ST','3RD ST','4TH ST','5TH ST','MAIN ST'];
function streetTex(){if(TX.st)return TX.st;const c=canvas(512,128*20),x=c.getContext('2d');
  STREETS_ALL.forEach((s,i)=>{const y=i*128;x.fillStyle='#1d6b3c';x.fillRect(0,y,512,128);x.strokeStyle='#f2f2ee';x.lineWidth=6;x.strokeRect(8,y+8,496,112);
    x.fillStyle='#f6f6f2';x.font='bold 70px "Arial Narrow", Arial, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(s,256,y+68,470)});
  return TX.st=ctex(c)}
function waterNormal(){if(TX.wn)return TX.wn;const S=256,c=canvas(S,S),x=c.getContext('2d'),img=x.createImageData(S,S),r=rng(7);
  const waves=[];for(let i=0;i<14;i++)waves.push({kx:Math.round((r()-.5)*12),kz:Math.round((r()-.5)*12)+(i<4?6:0),a:.4/(1+i*.25),p:r()*6.28});
  for(let j=0;j<S;j++)for(let i=0;i<S;i++){let dx=0,dz=0;for(const w of waves){const ph=(w.kx*i+w.kz*j)/S*6.283+w.p,c0=Math.cos(ph)*w.a;dx+=c0*w.kx;dz+=c0*w.kz}
    const n=new THREE.Vector3(-dx*.06,1,-dz*.06).normalize(),o=(j*S+i)*4;img.data[o]=(n.x*.5+.5)*255;img.data[o+1]=(n.z*.5+.5)*255;img.data[o+2]=(n.y*.5+.5)*255;img.data[o+3]=255}
  x.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return TX.wn=t}
/* graffiti atlas: 8 designs in a 4x2 grid of 256x128 cells, wavy spray strokes, nothing rude */
function grafTex(){if(TX.gr)return TX.gr;const c=canvas(1024,256),x=c.getContext('2d');const r=rng(9);x.clearRect(0,0,1024,256);
  const cols=[['#e8395b','#ffd23f'],['#3fa7e8','#ffffff'],['#7fdc6e','#1d1d1d'],['#b06be8','#ffe14d'],['#f2f2f2','#d12a2a'],['#ff8c2a','#1a1a1a'],['#2ae8c8','#ff4fa8'],['#ffd23f','#222']];
  const words=['BRZ','K9','LOL','MOOP','DUKE','','~','HI'];
  for(let i=0;i<8;i++){const cx=(i%4)*256+128,cy=Math.floor(i/4)*128+64,[a,b]=cols[i];x.save();x.translate(cx,cy);x.rotate((r()-.5)*.2);
    x.lineJoin='round';x.lineCap='round';
    if(words[i]==='~'){x.strokeStyle=a;x.lineWidth=12;x.beginPath();for(let t=0;t<=1;t+=.02){const px=-100+t*200,py=Math.sin(t*14)*26*(1-t*.4);t?x.lineTo(px,py):x.moveTo(px,py)}x.stroke();x.strokeStyle=b;x.lineWidth=3;x.stroke()}
    else if(words[i]===''){x.fillStyle=a;x.beginPath();x.arc(0,0,50,0,6.28);x.fill();x.strokeStyle=b;x.lineWidth=7;for(const sx of[-18,18]){x.beginPath();x.moveTo(sx-9,-22);x.lineTo(sx+9,-6);x.moveTo(sx+9,-22);x.lineTo(sx-9,-6);x.stroke()}x.beginPath();x.arc(0,12,22,.2,2.9);x.stroke()}
    else{x.font='900 '+(words[i].length>3?70:88)+'px "Arial Black", Impact, sans-serif';x.textAlign='center';x.textBaseline='middle';
      x.strokeStyle=b;x.lineWidth=16;x.strokeText(words[i],0,4);x.fillStyle=a;x.fillText(words[i],0,4);x.lineWidth=3;x.strokeStyle='rgba(0,0,0,.6)';x.strokeText(words[i],0,4);
      if(words[i]==='DUKE'){x.fillStyle=b;x.beginPath();x.moveTo(-40,-38);x.lineTo(-28,-58);x.lineTo(-14,-40);x.lineTo(0,-60);x.lineTo(14,-40);x.lineTo(28,-58);x.lineTo(40,-38);x.closePath();x.fill()}}
    /* drips */
    x.fillStyle=a;for(let k=0;k<5;k++){const dx=(r()-.5)*150,h=8+r()*26;x.fillRect(dx,20,3,h)}
    x.restore()}
  return TX.gr=ctex(c)}
function chalkTex(){if(TX.ch)return TX.ch;const c=canvas(768,512),x=c.getContext('2d');x.clearRect(0,0,768,512);x.lineCap='round';x.lineJoin='round';
  const cell=(i,f)=>{x.save();x.translate((i%3)*256+128,Math.floor(i/3)*256+128);f();x.restore()};
  const ch=(col,w)=>{x.strokeStyle=col;x.lineWidth=w||6;x.globalAlpha=.85};
  cell(0,()=>{ch('#f4f1e8');for(let k=0;k<5;k++){x.strokeRect(-30,90-k*45,60,40)}x.strokeRect(-60,-135,60,40);x.strokeRect(0,-135,60,40);x.font='bold 26px Comic Sans MS, cursive';x.fillStyle='#f4f1e8';for(let k=1;k<=5;k++)x.fillText(k,-8,120-k*45+20)});
  cell(1,()=>{ch('#ffd23f',8);x.beginPath();x.arc(0,0,44,0,6.28);x.stroke();for(let k=0;k<12;k++){const a=k/12*6.28;x.beginPath();x.moveTo(Math.cos(a)*58,Math.sin(a)*58);x.lineTo(Math.cos(a)*92,Math.sin(a)*92);x.stroke()}});
  cell(2,()=>{ch('#ff7ab6',7);x.font='bold 64px Comic Sans MS, cursive';x.fillStyle='#ff7ab6';x.textAlign='center';x.fillText('HI MOM',0,20);ch('#ff7ab6',5);x.beginPath();x.moveTo(-90,50);x.quadraticCurveTo(0,80,90,50);x.stroke()});
  cell(3,()=>{ch('#8fd3ff',6);x.strokeRect(-95,-30,170,55);x.beginPath();x.moveTo(75,-30);x.lineTo(100,0);x.lineTo(100,25);x.lineTo(75,25);x.stroke();for(const wx of[-60,60]){x.beginPath();x.arc(wx,30,16,0,6.28);x.stroke()}
    ch('#f4f1e8',4);for(let k=0;k<5;k++){const px=-80+k*36;x.beginPath();x.arc(px,-75,9,0,6.28);x.moveTo(px,-66);x.lineTo(px,-42);x.moveTo(px-12,-58);x.lineTo(px+12,-58);x.stroke()}});
  cell(4,()=>{ch('#7fdc6e',8);x.beginPath();x.moveTo(0,60);x.bezierCurveTo(-110,-10,-50,-90,0,-35);x.bezierCurveTo(50,-90,110,-10,0,60);x.stroke()});
  cell(5,()=>{ch('#c58cff',7);x.beginPath();for(let k=0;k<=10;k++){const a=-Math.PI/2+k*Math.PI/5,rr=k%2?40:95;k?x.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):x.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}x.closePath();x.stroke()});
  return TX.ch=ctex(c)}
function signCanvas(lines,o={}){const w=o.w||1024,h=o.h||256,c=canvas(w,h),x=c.getContext('2d');x.fillStyle=o.bg||'#f4f0e6';x.fillRect(0,0,w,h);
  if(o.border!==false){x.strokeStyle=o.fg2||o.fg||'#222';x.lineWidth=h*.05;x.strokeRect(h*.05,h*.05,w-h*.1,h-h*.1)}
  x.textAlign='center';x.textBaseline='middle';const n=lines.length;
  lines.forEach((l,i)=>{const sz=i===0?(o.size||h*.42/Math.max(1,n*.75)):h*.18;x.font=(o.weight||'900')+' '+sz+'px '+(o.font||'"Arial Narrow", Arial, sans-serif');x.fillStyle=i===0?(o.fg||'#1d3a5f'):(o.fg2||o.fg||'#a12a2a');
    x.fillText(l,w/2,n===1?h/2:h*(i===0?.4:.75),w*.92)});
  return c}

/* ================= state ================= */
let WS=null;   /* the world being shown: {def,lvl,G,K,units,chunks,...} */
OW.init=ctx=>{C=ctx};

/* ---------------- build ---------------- */
OW.build=(def,lvl,ctx)=>{if(ctx)C=Object.assign(C||{},ctx);const t0=performance.now();
  if(C.sun&&C.sun.shadow)C.sun.shadow.camera.layers.enable(1);
  const{K,road}=computeKinds(def);
  const G=def.map.map(r=>r.split(''));
  const ws=WS={own:new Set(),def,lvl,G,K,road,units:[],chunks:[],q:C.quality?C.quality():'med',tier:-1,trust:null,built:0,frustum:new THREE.Frustum(),pm:new THREE.Matrix4(),box3:new THREE.Box3(),lod:[],water:[],t:0};
  lvl.ow=ws;
  /* ground height for characters/van (world.js groundY reads lvl.world) */
  const W_=HW();
  if(W_){const gB=W_.begin({def:{id:'hub',lines:[]},g:[],W:0,H:0,group:lvl.group,colliders:[],solids:[]});gB.W=def.W;gB.H=def.H;gB.g=G;gB.k=(x,z)=>x<0||z<0||x>=def.W||z>=def.H?'out':K[z*def.W+x];gB.lod=ws.lod;lvl.world=gB;ws.gB=gB;gB.q=treeQ(ws.q)}
  /* colliders */
  const S=[];staticColliders(def,S);
  ws.houses=prepHouses(def);
  if(W_){/* lot fences between Maple houses: run world.js's rule once for the whole world, record the segments (drawn per chunk) and keep its colliders */
    const segs=[],dummy={r:rng(5),gbOf:()=>({box(){},obox(){}}),lvl:{colliders:[]}},orig=W_.fence;W_.fence=(B,ax,az,bx,bz)=>segs.push([ax,az,bx,bz]);
    try{W_.lotFences(dummy,ws.houses)}catch(e){console.warn('lot fences failed',e)}W_.fence=orig;ws.fenceSegs=segs;for(const c of dummy.lvl.colliders)S.push(Object.assign(c,{ph:1.9,k:'yardfence'}))}
  /* trust set pieces with bodies: the block party's bounce house and tables, the moving truck (all start switched off) */
  ws.toggleCols=PARTY_COLS.map(r=>{const c={x0:r.x0,z0:r.z0,x1:r.x1,z1:r.z1,ph:r.ph,k:'party',home:r};S.push(c);return c});
  ws.truckCol={x0:-1e4,z0:-1e4,x1:-1e4,z1:-1e4,ph:2.6,k:'truck',off:true};
  S.push({x0:-10,z0:-10,x1:0,z1:def.H*TILE+10,ph:0},{x0:def.W*TILE,z0:-10,x1:def.W*TILE+10,z1:def.H*TILE+10,ph:0},{x0:-10,z0:-10,x1:def.W*TILE+10,z1:0,ph:0},{x0:-10,z0:def.H*TILE,x1:def.W*TILE+10,z1:def.H*TILE+10,ph:0});
  lvl.colliders.push(...S);lvl.nStatic=lvl.colliders.length;makeHash(lvl,S);lvl.colliders.push(ws.truckCol);
  for(const c of ws.toggleCols)Object.assign(c,{x0:-1e4,z0:-1e4,x1:-1e4,z1:-1e4,off:true});   /* hashed at home, switched on by the block party */
  prepRowBlocks(ws);ws.barricadeCols=S.filter(c=>c.barricade);
  /* cull units: chunks (lazy) + set pieces */
  for(const ch of def.chunks){const u={kind:'chunk',ch,i:ch.i,built:false,group:null,box:{x0:ch.box.x0-8,z0:ch.box.z0-8,x1:ch.box.x1+8,z1:ch.box.z1+8,y1:22},visible:false,dress:[]};ws.units.push(u);ws.chunks.push(u)}
  for(const id in def.sites){const s=def.sites[id];ws.units.push({kind:'site',site:s,built:false,box:{x0:s.box.x0-2,z0:s.box.z0-2,x1:s.box.x1+2,z1:s.box.z1+2,y1:8},visible:false,dress:[]})}
  for(const sp of SETPIECES)ws.units.push({kind:'set',sp,built:false,box:sp.box(def),visible:false,dress:[]});
  /* parked cars now: they are vehicles (colliders move when borrowed) */
  parkedCars(ws);
  lvl.nBaseCols=lvl.colliders.length;lvl.nBaseSolids=lvl.solids.length;ws.cars0=lvl.cars?lvl.cars.slice():null;
  for(const o of lvl.group.children)ws.own.add(o);
  ws.t0=performance.now()-t0;
  /* the start area is built now, the rest streams in near the camera */
  const sx=def.start.x,sz=def.start.z;for(const u of ws.units)if(dist2(u.box,sx,sz)<90)buildUnit(u);
  ws.tBuild=performance.now()-t0;
  OW.dress(C.trustR?C.trustR():0,true);
  return lvl};
/* world.js swaps real trees for impostors by distance (24/38/60 m by quality): the world is denser, so it uses one step down */
function treeQ(q){return q==='high'?'med':'low'}
function dist2(b,x,z){const dx=Math.max(b.x0-x,0,x-b.x1),dz=Math.max(b.z0-z,0,z-b.z1);return Math.hypot(dx,dz)}

function prepHouses(def){const out=[];let seed=1;
  for(const h of def.houses){const x0=h.x0*TILE+.15,z0=h.z0*TILE+.15,x1=(h.x1+1)*TILE-.15,z1=(h.z1+1)*TILE-.15;const fn=h.face==='s'?[0,1]:[0,-1];
    const store=h.z1===3&&h.x0<=25&&h.x1>=25&&def.map[4][25]==='R';
    const s=(seed++)*7919+h.x0*31+h.z0;
    out.push({src:h,x0,z0,x1,z1,fn,facing:h.face==='s'?'+z':'-z',seed:s,home:h.home,store,door:{x:(x0+x1)/2,z:fn[1]>0?z1:z0,nx:0,nz:fn[1]}})}
  return out}

/* ---------------- parked cars ---------------- */
const CAR_TYPES=['sedan','suv','hatch','pickup','workvan','sedan','suv','minivan'],CAR_COLS=['#b9c0c7','#8a2f2a','#2e4a6b','#d8d4c8','#3d4a3a','#1f2226','#6d7378','#7a5a3a'];
function parkedCars(ws){const def=ws.def,lvl=ws.lvl;if(!C.makeVehicle)return;
  const mk=C.makeVehicle;C=Object.assign({},C,{makeVehicle:(t,c,o)=>{const v=mk(t,c,o);if(v)v.traverse(m=>{if(m.isMesh)m.userData.noBatch=true});return v}});   /* parked cars move when borrowed: keep them out of index.html's static batching */
  /* the cars say where you are: family cars in Maple, work trucks on Route 9, older hatchbacks and vans in faded colours in Riverside */
  const BY={maple:[CAR_TYPES,CAR_COLS],route9:[['pickup','workvan','suv','pickup','sedan'],['#d8d4c8','#8a2f2a','#3d4a3a','#6d7378','#b9c0c7']],
    river:[['hatch','sedan','workvan','hatch','pickup','sedan'],['#8c7d6a','#6e5a4c','#7d8a8f','#a39380','#5a6b5e','#9a8f84','#4a4f55']]};
  for(const p of def.parked){const[TY,CO]=BY[HT.WorldGen?HT.WorldGen.regionAtTile(p.tx):'maple']||BY.maple;const k=(p.tx*7+p.tz*13)%TY.length;const v=C.makeVehicle(TY[k],CO[(p.tx+p.tz)%CO.length],{lod:1});if(!v)continue;
    v.position.set(p.x,C.groundY?C.groundY(p.x,p.z):0,p.z);if((p.tx+p.tz)%2)v.rotation.y=Math.PI;lvl.group.add(v);
    const col={x0:p.x-2.3,z0:p.z-1.1,x1:p.x+2.3,z1:p.z+1.1};lvl.colliders.push(col);
    if(C.regCar)try{C.regCar(lvl,v,p.x,p.z,col,[p.tx,p.tz])}catch(e){console.warn('regCar failed',e)}
    v.traverse(m=>{if(m.isMesh)lvl.solids.push(m)})}
  /* Dad's Auto for-sale row and a customer at the pumps: props, not borrowable */
  const pl=def.places;const props=[['workvan','#d8d4c8',pl.sale_workvan],['pickup','#8a2f2a',pl.sale_pickup],['suv','#2e4a6b',pl.sale_suv]];
  for(const[t,c,p]of props){if(!p)continue;const v=C.makeVehicle(t,c,{lod:1});if(!v)continue;v.position.set(p.x,0,p.z);v.rotation.y=Math.PI/2;lvl.group.add(v);
    const col={x0:p.x-1.1,z0:p.z-2.4,x1:p.x+1.1,z1:p.z+2.4,h:1.8,k:'car'};lvl.colliders.push(col);v.traverse(m=>{if(m.isMesh)lvl.solids.push(m)});ws.saleCars=(ws.saleCars||[]).concat([{v,p,t}])}
  C.makeVehicle=mk;
  const pump=def.pumps[1];if(pump){const v=C.makeVehicle('hatch','#6d7378',{lod:1});if(v){const x=pump.x+2.6,z=pump.z;v.position.set(x,0,z);v.rotation.y=Math.PI/2;lvl.group.add(v);lvl.colliders.push({x0:x-1,z0:z-2.2,x1:x+1,z1:z+2.2,h:1.6,k:'car'});v.traverse(m=>{if(m.isMesh)lvl.solids.push(m)})}}}

/* ---------------- units ---------------- */
/* units build in slices: a chunk is a generator that yields between its steps, so streaming spreads over frames (budget per frame in update) */
function buildUnit(u){startUnit(u);stepUnit(u,1e9)}
function startUnit(u){if(u.built)return;u.built=true;u.ready=false;u.ms=0;u.maxStep=0;
  u.group=new THREE.Group();u.group.visible=false;WS.lvl.group.add(u.group);WS.own.add(u.group);u.gen=u.kind==='chunk'?buildChunk(u):null}
function stepUnit(u,budget){if(u.ready)return true;const t0=performance.now();
  try{if(!u.gen){if(u.kind==='site')buildSite(u);else{u.sp.build(WS,u);u.group.updateMatrixWorld(true);compact(u.group,u.dress.flatMap(d=>[d.on,d.off]).filter(Boolean))}u.maxStep=performance.now()-t0}
    else for(;;){const s0=performance.now(),r=u.gen.next(),dt=performance.now()-s0;u.maxStep=Math.max(u.maxStep,dt);if(r.done)break;if(performance.now()-t0>budget){u.ms+=performance.now()-t0;return false}}}
  catch(e){console.warn('open world: unit failed',u.kind,u.i,e)}
  u.ms+=performance.now()-t0;finishUnit(u);return true}
function finishUnit(u){u.gen=null;u.ready=true;const t0=performance.now();
  /* set-piece dressing in Riverside follows the trust of the block it stands in */
  if(u.sp&&u.sp.id==='riverlots'&&WS.blockT)placeTruck(WS);
  if(u.kind==='set')for(const d of u.dress){if(d.blk!=null)continue;const o=d.on||d.off;if(!o)continue;o.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(o);if(bb.isEmpty())continue;const c=bb.getCenter(new THREE.Vector3());d.blk=blockOf(c.x,c.z)}
  u.group.traverse(o=>{if(o.userData&&o.userData.wkey){if(!o.name)o.name='w:'+o.userData.wkey;delete o.userData.wkey}});
  /* tree impostor sheets are frustum-culled per chunk (their shader only hides near trees, it never moves far ones) */
  u.group.traverse(o=>{if(o.isMesh&&o.name==='w:imp'){o.geometry.computeBoundingSphere();o.frustumCulled=true}});
  u.ms+=performance.now()-t0;WS.built++;WS.maxStep=Math.max(WS.maxStep||0,u.maxStep);if(WS.tier>=0)dressUnit(u,WS.trust)}

function* buildChunk(u){const ws=WS,def=ws.def,ch=u.ch,W_=HW(),win={x0:ch.x0,z0:ch.z0,x1:ch.x1,z1:ch.z1},box=boxOfTiles(win);
  if(!W_){fallbackChunk(u);return}
  const B=newB(ws,u.group,'hub',win,4,1000+ch.i*17);B.hub=true;
  W_.ground(B);delete B.gb.out;yield;for(const k in B.gb){clipGB(B.gb[k],box);if(!B.gb[k].I.length)delete B.gb[k]}
  markings(B,ch,box);yield;
  const r=B.r,lowQ=ws.q==='low';
  /* trees */
  for(const t of ch.trees){const edge=t.tx===0||t.tz===0||t.tx===def.W-1||t.tz===def.H-1;if(edge&&(t.tx+t.tz)%(lowQ?4:2))continue;W_.tree(B,t.x,t.z,{s:edge?1.2:1})}
  /* street lamps (Riverside ones are dressing: lit/broken by trust) */
  for(const l of ch.lamps){if(l.hood==='river')continue;const p=lampSpot(l);W_.streetLamp(B,p.x,p.z,lampDir(ws,l))}
  for(const h of ch.hedges)for(let z=h.z0;z<=h.z1;z++)for(let x=h.x0;x<=h.x1;x++)W_.hedge(B,tc(x),tc(z),h.o==='h');
  for(const c of ch.crates)if(!W_.crate(B,c.x,c.z))B.gbOf('ply').box(c.x-.85,0,c.z-.85,c.x+.85,1.15,c.z+.85,1,null,{});
  for(const t of ch.tables)W_.stash(B,t.x,t.z);yield;
  /* intersections: hydrants, street name signs */
  intersections(B,ch,box);
  /* houses: HT.Buildings per lot, merged per material below */
  const blds=[];const BUm=BU();
  for(const h of ws.houses){const cx=(h.x0+h.x1)/2,cz=(h.z0+h.z1)/2;if(cx<box.x0||cx>=box.x1||cz<box.z0||cz>=box.z1)continue;
    const w=h.x1-h.x0,d=h.z1-h.z0;let grp=null;
    try{if(BUm)grp=h.store?BUm.shop({kind:'hardware',w,d,seed:h.seed,facing:h.facing}):BUm.house({w,d,seed:h.seed,style:['ranch','colonial','craftsman','cape'][h.seed%4],facing:h.facing,home:!!h.home})}catch(e){console.warn('house failed',e);grp=null}
    if(!grp)grp=W_.fallbackHouse(B,{w,d,seed:h.seed,facing:h.facing,cx,cz});
    if(grp){grp.position.set(cx,0,cz);if(!grp.userData.proxy)blds.push(grp);const dr=grp.userData.door;if(dr)h.door={x:cx+dr.x,z:cz+dr.z,nx:dr.nx,nz:dr.nz}}
    if(grp)grp.userData._owCol=h.src.col;try{W_.yard(B,h)}catch(e){}yield}
  for(const s of ws.fenceSegs||[]){const mx=(s[0]+s[2])/2,mz=(s[1]+s[3])/2;if(mx>=box.x0&&mx<box.x1&&mz>=box.z0&&mz<box.z1)W_.fence(B,s[0],s[1],s[2],s[3])}
  /* rowhouses, warehouses, commercial buildings */
  buildingsInChunk(ws,B,box,blds);yield;
  chainlink(B,ch);
  for(const b of ch.beds)gardenBed(B,b);
  /* trust dressing pieces live in their own meshes so they can be toggled */
  {const real=u.group;const dr=new THREE.Group();dr.name='dressing';real.add(dr);u.group=dr;try{riversideDressing(ws,u,B,ch,box)}finally{u.group=real}if(dr.children.length){u.dressRoot=dr}else real.remove(dr)}yield;
  W_.finish(B,{bare:true,before:b=>{for(const L of[b.tuf,b.flw])if(L){const o=[];for(let i=0;i<L.length;i+=4)if(L[i]>=box.x0&&L[i]<box.x1&&L[i+1]>=box.z0&&L[i+1]<box.z1)o.push(L[i],L[i+1],L[i+2],L[i+3]);L.length=0;L.push(...o)}}});
  yield;
  if(blds.length){const sc=[];for(const g of blds){g.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(g);sc.push({bb,kind:g.userData.style?'house':'flat',fp:g.userData.size,cx:g.position.x,cz:g.position.z,rot:g.rotation.y,col:g.userData._owCol||'#cfc6b4',roof:g.userData._owRoof})}
    const mg=new THREE.Group();u.group.add(mg);mergeGroups(blds,mg);u.mg=mg;
    /* far LOD: one vertex-coloured shell mesh (walls, pitched/flat roofs, window bands) replaces the merged buildings beyond BLOD m */
    const sh=shellMesh(sc);if(sh){sh.visible=false;u.group.add(sh);u.shell=sh}
    /* the merged buildings don't cast: one shadow-only caster (layer 1, seen by the sun's shadow camera only) stands in for all of them */
    if(C.sun){for(const m of mg.children)m.castShadow=false;const cm=casterMesh(sc);if(cm)u.group.add(cm)}}
  if(B.fab){const fm=gbMesh(B.fab,fabricMat(),{shadow:true});if(fm)u.group.add(fm)}
  /* world.js swaps a 36 m cell of trees to impostors by cell distance; shrink the cell radius it tests so only the nearest trees are real */
  for(const l of B.lod){l.r=l.r*.35-4;ws.lod.push(l)}u.B=B;classifyDetail(u,B)}
function casterMesh(list){const gb=new (HW().GB)();
  for(const o of list){const b=o.bb;if(b.isEmpty())continue;const top=b.max.y;
    if(o.kind==='house'&&o.fp){/* walls to the eaves, then a gable along the long side of the footprint */
      const w=o.fp.w,d=o.fp.d,x0=o.cx-w/2,x1=o.cx+w/2,z0=o.cz-d/2,z1=o.cz+d/2,eave=Math.max(2.6,top*.58);gb.box(x0,0,z0,x1,eave,z1,1,null,{});
      if(w>=d){for(const s of[-1,1])gb.quad([x0,eave,o.cz+s*d/2],[x1,eave,o.cz+s*d/2],[x1,top,o.cz],[x0,top,o.cz],[[0,0],[1,0],[1,1],[0,1]],null,[0,1,s]);for(const x of[x0,x1])gb.tri([x,eave,z0],[x,eave,z1],[x,top,o.cz],[[0,0],[1,0],[.5,1]],null,[x===x0?-1:1,0,0])}
      else{for(const s of[-1,1])gb.quad([o.cx+s*w/2,eave,z0],[o.cx+s*w/2,eave,z1],[o.cx,top,z1],[o.cx,top,z0],[[0,0],[1,0],[1,1],[0,1]],null,[s,1,0]);for(const z of[z0,z1])gb.tri([x0,eave,z],[x1,eave,z],[o.cx,top,z],[[0,0],[1,0],[.5,1]],null,[0,0,z===z0?-1:1])}}
    else gb.box(b.min.x+.3,0,b.min.z+.3,b.max.x-.3,top,b.max.z-.3,1,null,{})}
  if(!gb.n)return null;const m=new THREE.Mesh(gb.geo(),MC.caster||(MC.caster=new THREE.MeshBasicMaterial({color:0x000000,side:THREE.DoubleSide})));m.castShadow=true;m.receiveShadow=false;m.layers.set(1);m.name='caster';return m}
function shellMesh(list){const gb=new (HW().GB)(),c3=h=>{const c=lin(h);return[c.r,c.g,c.b]},WIN=[.05,.06,.07];
  const wins=(x0,x1,z,nz,y0,top)=>{for(let x=x0+1.3;x<x1-1;x+=2.6)for(let y=y0;y+1.3<top-.4;y+=2.95)gb.wz(x-.5,x+.5,y,y+1.3,z+nz*.03,nz,1,WIN)},
    winsX=(z0,z1,x,nx,y0,top)=>{for(let z=z0+1.3;z<z1-1;z+=2.6)for(let y=y0;y+1.3<top-.4;y+=2.95)gb.wx(z-.5,z+.5,y,y+1.3,x+nx*.03,nx,1,WIN)};
  for(const o of list){const b=o.bb;if(b.isEmpty())continue;const top=b.max.y,wall=c3(o.col),roof=c3(o.roof||(o.kind==='house'?'#5d5751':'#4a4846'));
    if(o.kind==='house'&&o.fp){const w=o.fp.w,d=o.fp.d,x0=o.cx-w/2,x1=o.cx+w/2,z0=o.cz-d/2,z1=o.cz+d/2,eave=Math.max(2.6,top*.58),ov=.4;
      gb.box(x0,0,z0,x1,eave,z1,1,wall,{top:true});wins(x0,x1,z1,1,1.1,eave);wins(x0,x1,z0,-1,1.1,eave);
      if(w>=d){for(const s of[-1,1])gb.quad([x0-ov,eave-.15,o.cz+s*(d/2+ov)],[x1+ov,eave-.15,o.cz+s*(d/2+ov)],[x1+ov,top,o.cz],[x0-ov,top,o.cz],[[0,0],[1,0],[1,1],[0,1]],roof,[0,1,s]);for(const x of[x0,x1])gb.tri([x,eave,z0],[x,eave,z1],[x,top,o.cz],[[0,0],[1,0],[.5,1]],wall,[x===x0?-1:1,0,0])}
      else{for(const s of[-1,1])gb.quad([o.cx+s*(w/2+ov),eave-.15,z0-ov],[o.cx+s*(w/2+ov),eave-.15,z1+ov],[o.cx,top,z1+ov],[o.cx,top,z0-ov],[[0,0],[1,0],[1,1],[0,1]],roof,[s,1,0]);for(const z of[z0,z1])gb.tri([x0,eave,z],[x1,eave,z],[o.cx,top,z],[[0,0],[1,0],[.5,1]],wall,[0,0,z===z0?-1:1])}}
    else{const x0=b.min.x+.3,x1=b.max.x-.3,z0=b.min.z+.3,z1=b.max.z-.3;gb.box(x0,0,z0,x1,top,z1,1,wall,{top:true});gb.floor(x0,z0,x1,z1,top,1,()=>roof);
      wins(x0,x1,z1,1,1.4,top);wins(x0,x1,z0,-1,1.4,top);winsX(z0,z1,x1,1,1.4,top);winsX(z0,z1,x0,-1,1.4,top)}}
  if(!gb.n)return null;const m=new THREE.Mesh(gb.geo(),MC.shell||(MC.shell=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:0})));m.castShadow=false;m.receiveShadow=true;m.name='shell';return m}
/* near/far LOD inside a chunk: small things are only drawn within DETAIL m, grass tufts within TUFT m */
const FAR_KEEP=new Set(['imp','road','lot','walk','grass','inside','dirt','paint','lamphead','lampglass','fence','hedgecore','ext','int','cap','plinth','found','roof','brickH','whsWall']);
const MID_BLD=new Set(['trim','metal','concrete','grime','railing']),DET_BLD=new Set(['glow','skirt','fixt']);   /* house trim/fixtures: drawn up to MID m */
const MID_DROP=new Set(['paint','lampglass','fence','hedgecore','plinth','cap','dirt']);   /* drawn up to MID m only */
function classifyDetail(u,B){const trees=new Set();for(const l of B.lod)for(const m of l.real)trees.add(m);u.detail=[];u.tufts=[];u.mid=[];
  for(const o of u.group.children){if(trees.has(o)||o===u.dressRoot)continue;
    if(o.userData&&o.userData.tufts){u.tufts.push(o);continue}
    if(o.isInstancedMesh){u.detail.push(o);continue}
    const k=o.userData&&o.userData.wkey;if(k&&!FAR_KEEP.has(k)){u.detail.push(o);continue}if(k&&MID_DROP.has(k)){u.mid.push(o);continue}
    if(o.isGroup&&o.children.length&&!k&&o.children.every(c=>c.isMesh)&&!u.dress.some(d=>d.on===o||d.off===o)){/* merged buildings: tiny materials (lanterns, grime, fixtures) are detail */
      for(const c of o.children){const nm=c.name.slice(2);if(DET_BLD.has(nm))u.detail.push(c);else if(MID_BLD.has(nm))u.mid.push(c)}}}
  const ctr=m=>{const g=m.geometry;if(m.isInstancedMesh&&g.boundingSphere)return g.boundingSphere;if(!g.boundingSphere)g.computeBoundingSphere();return g.boundingSphere};
  u.detailS=u.detail.map(ctr);u.tuftS=u.tufts.map(ctr);
  /* world.js tufts read as dark specks against the bright lawns: lift their instance colours toward the lawn's tone */
  for(const m of u.tufts)if(m.instanceColor){const a=m.instanceColor.array;for(let i=0;i<a.length;i+=3){a[i]*=1.55;a[i+1]*=1.7;a[i+2]*=1.25}m.instanceColor.needsUpdate=true}
  /* small street furniture doesn't cast into the (small, expensive) shadow pass */
  for(const m of u.detail)if(m.name!=='w:fence')m.castShadow=false;
  u.near=null}
function fallbackChunk(u){/* no js/world.js: flat coloured tiles so the world is still playable */
  const ws=WS,ch=u.ch,cv=canvas(32*8,32*8),x=cv.getContext('2d'),COL={road:'#3b3d43',lot:'#55575c',walk:'#b7b2a6',grass:'#5d8a4a',inside:'#8f8b82',wall:'#3f6f86'};
  for(let z=ch.z0;z<=ch.z1;z++)for(let xx=ch.x0;xx<=ch.x1;xx++){x.fillStyle=COL[ws.K[z*ws.def.W+xx]]||'#5d8a4a';x.fillRect((xx-ch.x0)*8,(z-ch.z0)*8,8,8)}
  const w=(ch.x1-ch.x0+1)*TILE,d=(ch.z1-ch.z0+1)*TILE,m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshStandardMaterial({map:ctex(cv),roughness:.95}));
  m.rotation.x=-Math.PI/2;m.position.set(ch.x0*TILE+w/2,0,ch.z0*TILE+d/2);m.receiveShadow=true;u.group.add(m);
  for(const h of ws.houses){const cx=(h.x0+h.x1)/2,cz=(h.z0+h.z1)/2;if(Math.floor(cx/64)!==ch.cx||Math.floor(cz/64)!==ch.cz)continue;const b=new THREE.Mesh(proxyGeo,stdMat('fbh',{color:'#d9c7a3'}));b.scale.set(h.x1-h.x0,4,h.z1-h.z0);b.position.set(cx,2,cz);b.castShadow=true;u.group.add(b)}}
function lampDir(ws,l){const isR=(x,z)=>{const k=ws.K[z*ws.def.W+x];return k==='road'};for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]])if(isR(l.tx+dx,l.tz+dz)&&!isShoulder(l.tx,l.tz))return[dx,dz];
  if(isShoulder(l.tx,l.tz))return l.tz===19?[0,1]:[0,-1];return[0,1]}

/* road markings with extents (SPEC2 A.3.4): centre lines, Route 9 arterial lines, crosswalks and stop bars */
function markings(B,ch,box){const ws=WS,def=ws.def,pg=B.gbOf('paint'),Y=-.12+.004,WH=[.92,.91,.88],YE=[.85,.55,.1];
  const P=(x0,z0,x1,z1,c)=>{const cx=(x0+x1)/2,cz=(z0+z1)/2;if(cx<box.x0||cx>=box.x1||cz<box.z0||cz>=box.z1)return;
    if(cx>=152*TILE){/* Riverside: a fresh coat and a worn one (faded, gaps), swapped by block trust */const blk=blockOf(cx,cz),GBc=HW().GB;
      const f=(B.rpaint||(B.rpaint={}))[blk]||(B.rpaint[blk]=new GBc()),w=(B.rpaintF||(B.rpaintF={}))[blk]||(B.rpaintF[blk]=new GBc());f.floor(x0,z0,x1,z1,Y,3,()=>c);
      if((Math.floor(cx*3.1+cz*1.7)%4)!==0)w.floor(x0,z0,x1,z1,Y,3,()=>[c[0]*.55,c[1]*.55,c[2]*.55]);return}
    pg.floor(x0,z0,x1,z1,Y,3,()=>c)};
  const gch=(x,z)=>def.ground[z]&&def.ground[z][x];
  for(const r of def.roads){const c=r.k+1;
    const hz=r.o==='h';const isInter=t=>{const s1=hz?gch(t,r.k-1):gch(r.k-1,t),s2=hz?gch(t,r.k+3):gch(r.k+3,t);
      return s1===','&&!isShoulder(hz?t:r.k-1,hz?r.k-1:t)&&(hz?gch(t,r.k-2):gch(r.k-2,t))===','||s2===','&&!isShoulder(hz?t:r.k+3,hz?r.k+3:t)&&(hz?gch(t,r.k+4):gch(r.k+4,t))===','};
    for(let t=Math.max(r.a,0);t<=r.b;t++){const x=hz?t:c,z=hz?c:t;
      const m=def.map[z][x];if(isInter(t)||isInter(t-1)||isInter(t+1)||!(m===','||m==='='||m==='!'))continue;
      const arterial=hz&&r.k===20&&t>=R9.x0&&t<=153;
      const x0=t*TILE,x1=x0+TILE,m0=tc(c);
      if(arterial){/* double yellow centre, white edge lines between lanes and shoulders */
        for(const o of[-.13,.13])P(x0,m0+o-.05,x1,m0+o+.05,YE);
        if(t>=R9.x0&&t<=139){P(x0,r.k*TILE+.1,x1,r.k*TILE+.22,WH);P(x0,(r.k+3)*TILE-.22,x1,(r.k+3)*TILE-.1,WH)}}
      else if(hz){if(t%3!==0)P(x0+.3,m0-.06,x1-.3,m0+.06,YE)}
      else{const z0=t*TILE;if(t%3!==0)P(m0-.06,z0+.3,m0+.06,z0+TILE-.3,YE)}}}
  /* crosswalks + stop bars at every 4-way/T intersection of two roads */
  const hs=def.roads.filter(r=>r.o==='h'),vs=def.roads.filter(r=>r.o==='v');
  for(const h of hs)for(const v of vs){if(v.k+1<h.a||v.k+1>h.b||h.k+1<v.a||h.k+1>v.b)continue;
    const ix0=v.k*TILE,ix1=(v.k+3)*TILE,iz0=h.k*TILE,iz1=(h.k+3)*TILE;
    const zebraX=(xa,xb)=>{for(let z=iz0+.25;z<iz1-.2;z+=.6)P(xa,z,xb,z+.32,WH)},zebraZ=(za,zb)=>{for(let x=ix0+.25;x<ix1-.2;x+=.6)P(x,za,x+.32,zb,WH)};
    const road=(x,z)=>ws.K[z*def.W+x]==='road';
    if(road(v.k-1,h.k+1)&&!isShoulder(v.k-1,h.k+1))zebraX(ix0-1.7,ix0-.3);
    if(road(v.k+3,h.k+1))zebraX(ix1+.3,ix1+1.7);
    if(road(v.k+1,h.k-1)&&!isShoulder(v.k+1,h.k-1))zebraZ(iz0-1.7,iz0-.3);
    if(road(v.k+1,h.k+3)&&!isShoulder(v.k+1,h.k+3))zebraZ(iz1+.3,iz1+1.7)}}

function intersections(B,ch,box){const ws=WS,def=ws.def,W_=HW(),r=B.r;const hs=def.roads.filter(q=>q.o==='h'),vs=def.roads.filter(q=>q.o==='v');
  const sg=new (W_.GB)(),pole=B.gbOf('galv');const name=s=>{const n=(s||'').split(' / ');return n};
  for(const h of hs)for(const v of vs){const xc=v.k+1,zc=h.k+1;if(xc<h.a||xc>h.b||zc<v.a||zc>v.b)continue;
    const cx=tc(xc),cz=tc(zc);if(cx<box.x0||cx>=box.x1||cz<box.z0||cz>=box.z1)continue;
    const corners=[[xc-2,zc-2],[xc+2,zc-2],[xc-2,zc+2],[xc+2,zc+2]].filter(([x,z])=>ws.K[z*def.W+x]==='walk');if(!corners.length)continue;
    const[sx,sz]=corners[(xc+zc)%corners.length];const X=tc(sx)+(sx<xc?.55:-.55),Z=tc(sz)+(sz<zc?.55:-.55);
    let hn=h.name;if(hn&&hn.includes('/'))hn=xc<100?'MAPLE AVE':xc<152?'ROUTE 9':'MAIN ST';
    const ia=STREETS_ALL.indexOf((hn||'').toUpperCase()),ib=STREETS_ALL.indexOf((v.name||'').toUpperCase());
    pole.addGeo(cyl(.04,.04,3.1,8),M4(X,1.55,Z));
    const blade=(row,yaw,y)=>{if(row<0)return;const v0=1-(row+1)/20,v1=1-row/20,c=Math.cos(yaw),s=Math.sin(yaw),hw=.5,hh=.08;const p=(u,vv,d)=>[X+u*c+d*s,y+vv,Z-u*s+d*c];
      for(const d of[.012,-.012])sg.quad(p(-hw,-hh,d),p(hw,-hh,d),p(hw,hh,d),p(-hw,hh,d),d>0?[[0,v0],[1,v0],[1,v1],[0,v1]]:[[1,v0],[0,v0],[0,v1],[1,v1]],null,[s*Math.sign(d),0,c*Math.sign(d)])};
    blade(ia,0,3.0);blade(ib,Math.PI/2,2.82);
    const hc=corners[(xc+zc+1)%corners.length];if(hc[0]!==sx||hc[1]!==sz)W_.hydrant(B,tc(hc[0])+(hc[0]<xc?.6:-.6),tc(hc[1])+(hc[1]<zc?-.4:.4),r()*6)}
  if(!MC.signsOW)MC.signsOW=new THREE.MeshStandardMaterial({map:streetTex(),roughness:.35,metalness:.1,side:THREE.DoubleSide});
  const m=gbMesh(sg,MC.signsOW,{shadow:true});if(m)B.group.add(m)}

/* rowhouses ('r'), warehouses ('x') and the named commercial buildings ('A') whose centre lies in this chunk */
function prepRowBlocks(ws){const def=ws.def;if(ws.rowBlocks&&ws.rowBlocks.prepped)return;const sideCount=(z,x0,x1)=>{let n=0;if(z<0||z>=def.H)return 0;for(let x=x0;x<=x1;x++)if('sp,'.includes(def.ground[z][x]))n++;return n};
  ws.rowBlocks=blocksOf(def,'r');ws.rowBlocks.forEach((b,i)=>{const north=sideCount(b.z0-1,b.x0,b.x1)+sideCount(b.z0-2,b.x0,b.x1),south=sideCount(b.z1+1,b.x0,b.x1)+sideCount(b.z1+2,b.x0,b.x1);b.facing=south>=north?'+z':'-z';b.h=8.2+((i*37)%5)*.5});ws.rowBlocks.prepped=true}
function buildingsInChunk(ws,B,box,blds){const def=ws.def,BUm=BU();const inC=(cx,cz)=>cx>=box.x0&&cx<box.x1&&cz>=box.z0&&cz<box.z1;
  const sideCount=(z,x0,x1)=>{let n=0;if(z<0||z>=def.H)return 0;for(let x=x0;x<=x1;x++)if('sp,'.includes(def.ground[z][x]))n++;return n};
  ws.rowBlocks=ws.rowBlocks||blocksOf(def,'r');ws.whBlocks=ws.whBlocks||blocksOf(def,'x');
  ws.rowBlocks.forEach((b,i)=>{const cx=(b.x0+b.x1+1)*TILE/2,cz=(b.z0+b.z1+1)*TILE/2;if(!inC(cx,cz))return;
    const w=(b.x1-b.x0+1)*TILE-.2,d=(b.z1-b.z0+1)*TILE-.2;const north=sideCount(b.z0-1,b.x0,b.x1)+sideCount(b.z0-2,b.x0,b.x1),south=sideCount(b.z1+1,b.x0,b.x1)+sideCount(b.z1+2,b.x0,b.x1);
    const facing=south>=north?'+z':'-z';const h=8.2+((i*37)%5)*.5;b.facing=facing;b.h=h;
    let g=null;try{if(BUm)g=BUm.shell({kind:'rowhouse',w,d,h,seed:'row'+i,facing})}catch(e){g=null}
    if(g){g.position.set(cx,0,cz);g.userData._owCol=['#8a4b3a','#9c5b45','#7a4a3f','#a9774f','#6e5a4c'][i%5];g.userData._owRoof='#3d3b39';blds.push(g)}else B.gbOf('brickH').box(cx-w/2,0,cz-d/2,cx+w/2,h,cz+d/2,1.1,null,{})});
  ws.whBlocks.forEach((b,i)=>{const cx=(b.x0+b.x1+1)*TILE/2,cz=(b.z0+b.z1+1)*TILE/2;if(!inC(cx,cz))return;const w=(b.x1-b.x0+1)*TILE-.2,d=(b.z1-b.z0+1)*TILE-.2;
    let g=null;try{if(BUm)g=BUm.shell({kind:'warehouse',w,d,h:6.5+(i%3),seed:'wh'+i,facing:'-z'})}catch(e){g=null}
    if(g){g.position.set(cx,0,cz);g.userData._owCol='#a3a9ac';g.userData._owRoof='#6f7376';blds.push(g)}else B.gbOf('whsWall').box(cx-w/2,0,cz-d/2,cx+w/2,7,cz+d/2,2,null,{})});
  const NAMES={gas:['FILL-ER-UP','GAS · SNACKS · BAIT'],mart:['RAMOS CORNER MART','GROCERY · DELI · LOTTO'],benny:["BENNY'S BRAIN FREEZE",'ICE CREAM · DEPOT'],center:['RIVERSIDE FLATS','COMMUNITY CENTER']};
  for(const b of def.buildings){const cx=(b.x0+b.x1+1)*TILE/2,cz=(b.z0+b.z1+1)*TILE/2;if(!inC(cx,cz)||b.id==='church')continue;
    const w=(b.x1-b.x0+1)*TILE-.2,d=(b.z1-b.z0+1)*TILE-.2,facing=b.face==='s'?'+z':'-z';let g=null;
    try{if(BUm)g=BUm.shop({kind:b.id==='auto'?'auto':'store',w,d,seed:'shop'+b.id,facing,name:NAMES[b.id]})}catch(e){g=null}
    /* the corner mart's awning is trust dressing (tier 3), not part of the building */
    if(g&&b.id==='mart'){const rm=[];g.traverse(o=>{if(o.isMesh&&o.name==='awning')rm.push(o)});for(const o of rm)o.parent.remove(o)}
    if(g){g.position.set(cx,0,cz);g.userData._owCol=b.col||'#cfc6b4';g.userData._owRoof='#5a5856';blds.push(g)}else B.gbOf('plinth').box(cx-w/2,0,cz-d/2,cx+w/2,4.5,cz+d/2,2,null,{})}}

/* chain-link: galvanised posts every tile, top rail, diamond-mesh fabric (alpha tested) */
function chainlink(B,ch){const GBc=HW().GB;const H=2.05;const def=WS.def;
  for(const r of ch.chainlink){const hz=r.o==='h';
    /* Riverside back-yard fences (between the two rowhouse rows of a block) can become white pickets */
    const yard=hz&&r.x0>=160&&def.map[r.z0-1]&&'gz'.includes(def.map[r.z0-1][r.x0])&&def.map[r.z0+1]&&'gz'.includes(def.map[r.z0+1][r.x0])&&def.map[r.z0-2]&&def.map[r.z0-2][r.x0]==='r';
    let gv=B.gbOf('galv'),fab=B.fab||(B.fab=new GBc());
    if(yard){const blk=blockOf(tc(r.x0),tc(r.z0)),y=(B.yardChain||(B.yardChain={}))[blk]||(B.yardChain[blk]={fab:new GBc(),posts:new GBc(),picket:new GBc()});gv=y.posts;fab=y.fab;
      const pk=y.picket,z=tc(r.z0),a0=r.x0*TILE,a1=(r.x1+1)*TILE;for(let x=a0+.06;x<a1;x+=.16)pk.box(x-.04,0,z-.012,x+.04,1.0+((Math.floor(x/.16))%2)*.04,z+.012,1,null,{});
      for(const y0 of[.25,.75])pk.box(a0,y0,z-.03,a1,y0+.07,z-.012,1,null,{});for(let x=a0;x<=a1+.01;x+=2)pk.box(x-.05,0,z-.05,x+.05,1.1,z+.05,1,null,{})}const a0=(hz?r.x0:r.z0)*TILE,a1=((hz?r.x1:r.z1)+1)*TILE,c=tc(hz?r.z0:r.x0);
    const P=(a,y)=>hz?[a,y,c]:[c,y,a];
    for(let a=a0;a<=a1+.01;a+=TILE){const p=P(a,0);gv.addGeo(cyl(.035,.035,H+.05,8),M4(p[0],(H+.05)/2,p[2]))}
    const rail=cyl(.022,.022,a1-a0,6);rail.rotateZ(Math.PI/2);if(!hz)rail.rotateY(Math.PI/2);const pm=P((a0+a1)/2,H);gv.addGeo(rail,M4(pm[0],pm[1],pm[2]));
    const L=a1-a0;const q=[P(a0,.04),P(a1,.04),P(a1,H),P(a0,H)];fab.quad(q[0],q[1],q[2],q[3],[[0,0],[L/.7,0],[L/.7,H/.7],[0,H/.7]],null,hz?[0,0,1]:[1,0,0])}}
function fabricMat(){if(MC.fabric)return MC.fabric;
  /* generated diamond mesh: wires thick enough to survive mipmapping at distance (the streamed fence alpha thins out to nothing) */
  const c=canvas(128,128),x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,128,128);x.strokeStyle='#fff';x.lineWidth=7;x.lineCap='round';
  for(let i=-128;i<=256;i+=64){x.beginPath();x.moveTo(i,0);x.lineTo(i+128,128);x.stroke();x.beginPath();x.moveTo(i+128,0);x.lineTo(i,128);x.stroke()}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;
  const m=new THREE.MeshStandardMaterial({color:lin('#9aa1a6'),metalness:.6,roughness:.45,side:THREE.DoubleSide,alphaTest:.35,alphaMap:t});
  return MC.fabric=m}
function gardenBed(B,b){const wd=B.gbOf('fence'),soil=B.gbOf('mulch');const x0=b.x0*TILE+.1,x1=(b.x1+1)*TILE-.1,z0=b.z-.8,z1=b.z+.8;
  wd.box(x0,0,z0,x1,.45,z0+.08,1,null,{});wd.box(x0,0,z1-.08,x1,.45,z1,1,null,{});wd.box(x0,0,z0,x0+.08,.45,z1,1,null,{});wd.box(x1-.08,0,z0,x1,.45,z1,1,null,{});
  soil.floor(x0+.08,z0+.08,x1-.08,z1-.08,.38,1.3)}

/* ---------------- mission sites: walls in each site's own style ---------------- */
const SITE_STYLE={gary:'gary',rick:'rick',dave:'dave',doug:'doug',earl:'gary',dee:'rick',rosa:'dave',duke:'gary'};
function buildSite(u){const ws=WS,s=u.site,W_=HW();if(!W_)return;const win={x0:s.x0,z0:s.z0,x1:s.x1,z1:s.z1};
  const B=newB(ws,u.group,SITE_STYLE[s.id]||'doug',win,1,77+s.x0);B.style=W_.LEVEL_STYLE[SITE_STYLE[s.id]]||B.style;
  const K=ws.K,Wd=ws.def.W;B.k=(x,z)=>x<win.x0-1||z<win.z0-1||x>win.x1+1||z>win.z1+1?'out':K[z*Wd+x];
  W_.walls(B);
  if(s.grill&&!s.grill.shed){W_.grill(B,s.grill.x,s.grill.z);if(s.bounce)W_.bounce(B,s.bounce.x,s.bounce.z)}
  if(s.grill&&s.grill.shed){const x=s.grill.x,z=s.grill.z,sh=B.gbOf('fence');sh.box(x-.8,0,z-.7,x+.8,2.0,z+.7,1.2,null,{});const rf=B.gbOf('roofsheet');rf.box(x-.95,2.0,z-.85,x+.95,2.12,z+.85,1.5,null,{})}
  W_.finish(B,{bare:true,before:b=>{if(b.tuf)b.tuf.length=0;if(b.flw)b.flw.length=0}});
  for(const l of B.lod)ws.lod.push(l)}

/* ================= set pieces ================= */
const SETPIECES=[];
/* ---- the river: animated water, banks, riverbed; continues past the map edge ---- */
SETPIECES.push({id:'river',box:def=>({x0:270,z0:-400,x1:320,z1:def.H*TILE+400,y1:4}),build(ws,u){const def=ws.def,g=u.group;const x0=142*TILE,x1=152*TILE,zA=-420,zB=def.H*TILE+420,WY=-.85;
  const nm=waterNormal();const mat=new THREE.MeshStandardMaterial({color:lin('#2a4a55'),roughness:.06,metalness:.05,normalMap:nm,normalScale:new THREE.Vector2(.55,.55),transparent:true,opacity:.9,envMapIntensity:1.25});
  nm.repeat.set(3,40);
  const wg=new THREE.PlaneGeometry(x1-x0,zB-zA,1,1);wg.rotateX(-Math.PI/2);const w=new THREE.Mesh(wg,mat);w.position.set((x0+x1)/2,WY,(zA+zB)/2);w.receiveShadow=true;w.renderOrder=1;g.add(w);ws.water.push({mat,nm});
  /* riverbed + bank walls */
  const bed=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0+6,zB-zA),stdMat('riverbed',{color:'#2c3328',roughness:1}));bed.rotation.x=-Math.PI/2;bed.position.set((x0+x1)/2,-2.6,(zA+zB)/2);g.add(bed);
  const W_=HW();const B=newB(ws,g,'hub',{x0:140,z0:0,x1:153,z1:def.H-1},0,31);
  const conc=B.gbOf('found'),dirt=B.gbOf('dirt'),cap=B.gbOf('cap');
  /* west bank: grassy slope down to the water with rocks; east bank (Riverside): an old concrete channel wall with a cap */
  for(let z=zA;z<zB;z+=8){const za=z,zb=Math.min(zB,z+8);dirt.quad([x0-.6,0,za],[x0-.6,0,zb],[x0+1.4,-2.6,zb],[x0+1.4,-2.6,za],[[0,za/3],[0,zb/3],[1,zb/3],[1,za/3]],null,[1,1,0]);
    conc.quad([x1,.02,za],[x1,.02,zb],[x1,-2.6,zb],[x1,-2.6,za],[[za/2,0],[zb/2,0],[zb/2,1.3],[za/2,1.3]],null,[-1,0,0]);
    cap.box(x1-.05,0,za,x1+.45,.22,zb,1.5,null,{})}
  const r=rng(3);for(let i=0;i<220;i++){const z=zA+r()*(zB-zA);if(z>36&&z<50)continue;const x=x0+.2+r()*1.3,s=.25+r()*.45;const geo=new THREE.DodecahedronGeometry(s,0);conc.addGeo(geo,M4(x,-.5-(x-x0)*1.1,z,r()*6,r(),r()))}
  /* reeds in clumps along the west bank's waterline */
  const reed=new (W_.GB)();for(let i=0;i<170;i++){const z=-60+r()*(def.H*TILE+120);if(z>34&&z<52)continue;const cx=x0+1.25+r()*.6;
    for(let k=0;k<7;k++){const h=.8+r()*.9,a=r()*6.28,x=cx+Math.cos(a)*r()*.5,zz=z+Math.sin(a)*r()*.5,lean=(r()-.5)*.35,y0=-.95,t=r()*.2;const c=[.42+t,.5+t,.22];
      reed.quad([x-.03,y0,zz],[x+.03,y0,zz],[x+lean+.01,y0+h,zz+lean*.5],[x+lean-.01,y0+h,zz+lean*.5],[[0,0],[1,0],[1,1],[0,1]],c,[0,0,1])}}
  {const m=gbMesh(reed,stdMat('reeds',{color:'#ffffff',vertexColors:true,roughness:.9,side:THREE.DoubleSide}));if(m)g.add(m)}
  /* towpath along the top of the west bank */
  const tp=B.gbOf('dirt');tp.floor(x0-2.3,-60,x0-.9,36.5,.02,2);tp.floor(x0-2.3,49.5,x0-.9,def.H*TILE+60,.02,2);
  /* two old wooden piers off the Riverside wall, a rowboat tied to one */
  const wood=B.gbOf('fence');for(const pz of[22,118]){wood.box(x1-6,-.12,pz-1.1,x1,.06,pz+1.1,1.4,null,{});for(const px of[x1-5.6,x1-3.2,x1-.8])for(const dz of[-.95,.95])wood.box(px-.1,-2.6,pz+dz-.1,px+.1,.5,pz+dz+.1,1,null,{});
    wood.box(x1-6,.06,pz-1.1,x1-5.8,.9,pz+1.1,1,null,{})}
  {const boat=new THREE.Mesh(new THREE.CylinderGeometry(.75,.55,3.6,10,1,false,0,Math.PI),stdMat('boat',{color:'#2f6b8a',roughness:.6,side:THREE.DoubleSide}));boat.rotation.set(Math.PI/2,0,Math.PI);boat.position.set(x1-7.2,-.75,120.4);boat.castShadow=true;g.add(boat)}
  W_.finish(B,{bare:true,before:b=>{if(b.tuf)b.tuf.length=0;if(b.flw)b.flw.length=0}})}});
/* ---- the Route 9 bridge: deck, girders, piers, parapets with rails, lamps, barricade ---- */
SETPIECES.push({id:'bridge',box:def=>({x0:270,z0:30,x1:316,z1:58,y1:9}),build(ws,u){const def=ws.def,g=u.group,W_=HW();const bx0=141*TILE,bx1=153*TILE,z0=19*TILE,z1=24*TILE;
  const B=newB(ws,g,'hub',{x0:140,z0:18,x1:153,z1:24},0,41);const conc=B.gbOf('found'),cap=B.gbOf('cap'),st=B.gbOf('metal'),gv=B.gbOf('galv');
  conc.box(bx0,-1.25,z0-.3,bx1,-.13,z1+.3,2,null,{});                                    /* deck slab */
  for(const zz of[z0+1.2,(z0+z1)/2,z1-1.2])st.box(bx0+1,-2.1,zz-.25,bx1-1,-1.25,zz+.25,1,null,{});  /* steel girders */
  for(const px of[147*TILE]){conc.box(px-1.1,-3.2,z0+.4,px+1.1,-1.25,z1-.4,2,null,{});conc.box(px-1.4,-3.4,z0+.1,px+1.4,-2.6,z1-.1,2,null,{})}
  /* parapets: concrete curb wall + two steel rails on posts */
  for(const[zz,s]of[[z0,1],[z1,-1]]){const za=Math.min(zz,zz+s*.35),zb=Math.max(zz,zz+s*.35);conc.box(142*TILE,0,za,152*TILE,.55,zb,1.5,null,{});cap.box(142*TILE-.02,.55,za-.03,152*TILE+.02,.62,zb+.03,1.5,null,{});
    for(let x=142*TILE;x<=152*TILE+.01;x+=1.6)gv.addGeo(cyl(.04,.04,.55,8),M4(x,.9,(za+zb)/2));
    for(const y of[.95,1.18]){const t=cyl(.035,.035,20,8);t.rotateZ(Math.PI/2);gv.addGeo(t,M4(147*TILE,y,(za+zb)/2))}
    for(const lx of[143*TILE,(147*TILE+148*TILE)/2,151*TILE])W_.streetLamp(B,lx,(za+zb)/2,[0,s])}
  /* expansion joints */
  const jt=B.gbOf('joint');for(const x of[142*TILE,152*TILE])jt.floor(x-.04,z0,x+.04,z1,-.115,1);
  W_.finish(B,{bare:true,before:b=>{if(b.tuf)b.tuf.length=0;if(b.flw)b.flw.length=0}});
  /* barricade (its own group, hidden when the bridge opens) */
  const bar=new THREE.Group();bar.name='barricade';g.add(bar);ws.barricadeGroup=bar;
  const stripe=(()=>{const c=canvas(256,64),x=c.getContext('2d');for(let i=-2;i<10;i++){x.fillStyle=i%2?'#f4f1ea':'#e8611c';x.beginPath();x.moveTo(i*32,0);x.lineTo(i*32+32,0);x.lineTo(i*32,64);x.lineTo(i*32-32,64);x.fill()}const t=ctex(c);return stdMat('stripe',{map:t,roughness:.5})})();
  const leg=stdMat('sawleg',{color:'#d9d4c8',roughness:.7});const X=141*TILE+1;
  for(const zc of[tc(20)-.2,tc(22)+.2]){for(const yy of[.55,1.0]){const b=new THREE.Mesh(new THREE.BoxGeometry(.06,.24,3.2),stripe);b.position.set(X-.08,yy,zc);b.castShadow=true;bar.add(b)}
    for(const dz of[-1.4,1.4])for(const dx of[-.25,.25]){const l=new THREE.Mesh(new THREE.BoxGeometry(.06,1.2,.08),leg);l.position.set(X+dx*.6,.58,zc+dz);l.rotation.z=dx>0?-.2:.2;bar.add(l)}}
  for(const dz of[-2.4,-.8,.8,2.4]){const cone=new THREE.Mesh(cyl(.2,.03,.7,12),stdMat('cone',{color:'#ff6a1f',roughness:.5}));cone.position.set(X-1.3,.35,tc(21)+dz);cone.castShadow=true;bar.add(cone)}
  const sc=signCanvas(['BRIDGE CLOSED','FOR INSPECTION · SORRY · THE CITY'],{bg:'#f2c230',fg:'#1a1a1a',fg2:'#1a1a1a',w:1024,h:384});
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.95),stdMat('bridgesign',{map:ctex(sc),roughness:.6,side:THREE.DoubleSide}));sign.position.set(X-.2,1.65,tc(21));sign.rotation.y=-Math.PI/2;bar.add(sign);
  for(const dz of[-1.1,1.1]){const p=new THREE.Mesh(cyl(.04,.04,1.2,8),stdMat('galvM',{color:'#9aa0a6',metalness:.8,roughness:.4}));p.position.set(X-.15,.6,tc(21)+dz);bar.add(p)}
  bar.visible=!def.bridgeOpen}});
/* ---- Fill-Er-Up: canopy on four columns, pump islands, price pylon ---- */
SETPIECES.push({id:'gas',box:def=>({x0:204,z0:10,x1:250,z1:40,y1:9}),build(ws,u){const def=ws.def,g=u.group,W_=HW();const B=newB(ws,g,'hub',{x0:104,z0:7,x1:124,z1:19},0,51);
  const xs=def.pumps.map(p=>p.x),zs=def.pumps.map(p=>p.z);const cx0=Math.min(...xs)-3.4,cx1=Math.max(...xs)+3.4,cz0=Math.min(...zs)-3.2,cz1=Math.max(...zs)+3.2,H=5.2;
  const white=B.gbOf('trim'),galv=B.gbOf('galv'),conc=B.gbOf('found');
  white.box(cx0,H,cz0,cx1,H+.7,cz1,2,null,{});                                    /* canopy */
  for(const x of[cx0+2.6,cx1-2.6])for(const z of[cz0+2.6,cz1-2.6])white.box(x-.22,0,z-.22,x+.22,H,z+.22,1,null,{});
  const red=new THREE.Mesh(new THREE.BoxGeometry(cx1-cx0+.06,.32,cz1-cz0+.06),stdMat('gasred',{color:'#c8262b',roughness:.4}));red.position.set((cx0+cx1)/2,H+.5,(cz0+cz1)/2);g.add(red);
  /* recessed lights under the canopy */
  const lm=basicGlow('canopylight','#fff4dc',3);for(let x=cx0+1.6;x<cx1-1;x+=3)for(let z=cz0+1.6;z<cz1-1;z+=3){const l=new THREE.Mesh(new THREE.PlaneGeometry(.9,.5),lm);l.rotation.x=Math.PI/2;l.position.set(x,H-.01,z);g.add(l)}
  /* pump islands: curb + two dispensers each */
  const disp=stdMat('pump',{color:'#e9e6df',roughness:.4}),dred=stdMat('pumpred',{color:'#c8262b',roughness:.4}),scr=basicGlow('pumpscr','#9fe0ff',1.4),hose=stdMat('hose',{color:'#151515',roughness:.6});
  for(const p of def.pumps){conc.box(p.x-.6,0,p.z-1.3,p.x+.6,.18,p.z+1.3,1.5,null,{});
    for(const dz of[-.6,.6]){const d=new THREE.Mesh(new THREE.BoxGeometry(.55,1.65,.42),disp);d.position.set(p.x,.18+.82,p.z+dz);d.castShadow=true;g.add(d);
      const top=new THREE.Mesh(new THREE.BoxGeometry(.57,.25,.44),dred);top.position.set(p.x,1.95,p.z+dz);g.add(top);
      for(const s of[-1,1]){const sc=new THREE.Mesh(new THREE.PlaneGeometry(.3,.18),scr);sc.position.set(p.x+s*.28,1.45,p.z+dz);sc.rotation.y=s*Math.PI/2;g.add(sc);
        const h=new THREE.Mesh(new THREE.TorusGeometry(.18,.02,6,12,Math.PI),hose);h.position.set(p.x+s*.29,.75,p.z+dz);h.rotation.y=s*Math.PI/2;h.rotation.z=Math.PI;g.add(h)}}
    const b=new THREE.Mesh(cyl(.09,.09,.9,10),stdMat('bollard',{color:'#f2c230',roughness:.5}));b.position.set(p.x,.45,p.z-1.5);g.add(b);const b2=b.clone();b2.position.z=p.z+1.5;g.add(b2)}
  /* price pylon by the road */
  const px=tc(105),pz=tc(18)+.2;conc.box(px-.5,0,pz-.35,px+.5,.6,pz+.35,1.5,null,{});galv.addGeo(cyl(.12,.12,6.2,10),M4(px,3.1,pz));
  const pc=canvas(512,768),x=pc.getContext('2d');x.fillStyle='#c8262b';x.fillRect(0,0,512,200);x.fillStyle='#fff';x.font='900 96px "Arial Narrow", Arial';x.textAlign='center';x.fillText('FILL-ER-UP',256,120);
  x.font='700 36px Arial';x.fillText('GAS · SNACKS · BAIT',256,178);x.fillStyle='#101418';x.fillRect(0,200,512,568);
  [['REG','3.19'],['PLUS','3.49'],['DSL','3.89']].forEach(([a,b],i)=>{x.fillStyle='#fff';x.font='700 54px Arial';x.textAlign='left';x.fillText(a,30,320+i*160);x.fillStyle='#ffcf3a';x.font='700 110px "Courier New", monospace';x.textAlign='right';x.fillText(b,480,330+i*160);x.font='700 40px Arial';x.fillText('9',500,280+i*160)});
  const pyl=new THREE.Mesh(new THREE.BoxGeometry(2,3,.3),[stdMat('pyl',{color:'#c8262b'}),stdMat('pyl',{}),stdMat('pyl',{}),stdMat('pyl',{}),stdMat('pylF',{map:ctex(pc),emissive:lin('#ffffff'),emissiveIntensity:.25,emissiveMap:ctex(pc),roughness:.4}),stdMat('pylF',{})]);
  pyl.position.set(px,5.4,pz);pyl.castShadow=true;g.add(pyl);
  /* air/water machine, ice chest, propane cage */
  const ice=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.3,.8),stdMat('ice',{color:'#2f78c8',roughness:.4}));ice.position.set(tc(117),.65,tc(12)+.7);ice.castShadow=true;g.add(ice);
  W_.finish(B,{bare:true,before:b=>{if(b.tuf)b.tuf.length=0;if(b.flw)b.flw.length=0}})}});
/* ---- Riverside Community Church: brick nave, steep roof, steeple, stained glass, sign board ---- */
SETPIECES.push({id:'church',box:def=>({x0:310,z0:10,x1:350,z1:42,y1:24}),build(ws,u){const def=ws.def,g=u.group,W_=HW(),b=def.buildings.find(q=>q.id==='church');if(!b)return;
  const B=newB(ws,g,'hub',{x0:b.x0,z0:b.z0,x1:b.x1,z1:b.z1+3},0,61);const x0=b.x0*TILE+.3,x1=(b.x1+1)*TILE-.3,z0=b.z0*TILE+.3,z1=(b.z1+1)*TILE-.3,H=6.2,cz=(z0+z1)/2;
  const brick=B.gbOf('brickH'),roof=B.gbOf('roof'),trim=B.gbOf('trim'),fnd=B.gbOf('found');
  fnd.box(x0-.06,0,z0-.06,x1+.06,.45,z1+.06,2,null,{});brick.box(x0,.45,z0,x1,H,z1,1.1,[.78,.72,.7],{top:true});
  /* gable roof along x (ridge over the nave) */
  const rise=(z1-z0)/2*.9,o=.5;for(const s of[-1,1])roof.quad([x0-o,H-.1,cz+s*((z1-z0)/2+o)],[x1+o,H-.1,cz+s*((z1-z0)/2+o)],[x1+o,H+rise,cz],[x0-o,H+rise,cz],[[0,0],[(x1-x0)/3,0],[(x1-x0)/3,rise/2],[0,rise/2]],null,[0,1,s]);
  for(const xx of[x0,x1])brick.tri([xx,H,z0],[xx,H,z1],[xx,H+rise-.1,cz],[[0,0],[(z1-z0)/1.1,0],[(z1-z0)/2.2,rise/1.1]],[.78,.72,.7],[xx===x0?-1:1,0,0]);
  /* steeple at the west end, facing Main St */
  const sx=x0+2.2,sz=z1-2.2,sw=1.8;brick.box(sx-sw,0,sz-sw,sx+sw,H+5,sz+sw,1.1,[.78,.72,.7],{top:true});trim.box(sx-sw-.12,H+5,sz-sw-.12,sx+sw+.12,H+5.3,sz+sw+.12,1,null,{});
  const spire=new THREE.ConeGeometry(sw*1.35,7,4,1);spire.rotateY(Math.PI/4);roof.addGeo(spire,M4(sx,H+5.3+3.5,sz));
  const cross=stdMat('cross',{color:'#e8e2d0',roughness:.4});for(const[w,h,y]of[[.14,1.4,H+12.8+.7],[.8,.14,H+12.8+.95]]){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.14),cross);m.position.set(sx,y,sz);g.add(m)}
  /* belfry openings + stained glass windows along the nave and in the steeple */
  const glassC=canvas(128,256),gx=glassC.getContext('2d');const cols=['#b8323a','#2f5fb8','#e0b13a','#3a8a4a','#7a3ab8'];for(let i=0;i<40;i++){gx.fillStyle=cols[i%5];gx.fillRect((i%4)*32,Math.floor(i/4)*26,32,26)}gx.strokeStyle='#222';gx.lineWidth=5;for(let i=0;i<5;i++){gx.strokeRect(i*32,0,32,256)}for(let j=0;j<10;j++){gx.beginPath();gx.moveTo(0,j*26);gx.lineTo(128,j*26);gx.stroke()}
  const gm=stdMat('stained',{map:ctex(glassC),emissive:lin('#ffffff'),emissiveMap:ctex(glassC),emissiveIntensity:.35,roughness:.2});
  for(let x=x0+5;x<x1-1.5;x+=3)for(const[zz,s]of[[z0-.02,-1],[z1+.02,1]]){const w=new THREE.Mesh(new THREE.PlaneGeometry(.9,2.4),gm);w.position.set(x,3.1,zz);w.rotation.y=s>0?0:Math.PI;g.add(w);
    const arch=new THREE.Mesh(new THREE.CircleGeometry(.45,12,0,Math.PI),gm);arch.position.set(x,4.3,zz);arch.rotation.y=s>0?0:Math.PI;g.add(arch);trim.box(x-.55,1.8,Math.min(zz,zz+s*.08),x+.55,1.9,Math.max(zz,zz+s*.08),1,null,{})}
  const dk=stdMat('belfry',{color:'#15181c',roughness:.9});for(const[dx,dz,ry]of[[0,sw+.01,0],[0,-sw-.01,Math.PI],[sw+.01,0,Math.PI/2],[-sw-.01,0,-Math.PI/2]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.8),dk);m.position.set(sx+dx,H+3.4,sz+dz);m.rotation.y=ry;g.add(m)}
  /* doors (double, red) and steps toward the street */
  const dm=stdMat('churchdoor',{color:'#7a1f1f',roughness:.5});const door=new THREE.Mesh(new THREE.PlaneGeometry(1.8,2.6),dm);door.position.set(sx,1.75,sz+sw+.02);g.add(door);
  for(let i=0;i<3;i++)fnd.box(sx-1.6,0,sz+sw+i*.35,sx+1.6,.45-i*.15,sz+sw+.35+i*.35,1.5,null,{});
  /* sign board on the lawn: tier 0 has letters missing (SPEC2 A.7) */
  const sb=x1-4.5,sbz=z1+3.4;fnd.box(sb-1.8,0,sbz-.2,sb+1.8,.5,sbz+.2,1.5,null,{});trim.box(sb-1.7,.5,sbz-.08,sb+1.7,1.75,sbz+.08,1,null,{});
  const mk=(txt)=>{const c=signCanvas([txt,'SUNDAY 10AM · ALL WELCOME'],{bg:'#f6f3ea',fg:'#1d1d1d',fg2:'#6b1f1f',w:1024,h:340});return new THREE.Mesh(new THREE.PlaneGeometry(3.2,1.06),stdMat('csign'+txt,{map:ctex(c),roughness:.5}))};
  const broken=mk('R VERS DE COMM NITY CH RCH'),fixed=mk('RIVERSIDE COMMUNITY CHURCH');for(const m of[broken,fixed]){m.position.set(sb,1.13,sbz+.09);g.add(m)}
  u.dress.push({t:50,on:fixed,off:broken});
  W_.finish(B,{bare:true,before:q=>{if(q.tuf)q.tuf.length=0;if(q.flw)q.flw.length=0}})}});
/* ---- basketball court: painted surface, hoops (nets and string lights by trust) ---- */
SETPIECES.push({id:'court',box:def=>({x0:380,z0:18,x1:410,z1:40,y1:8}),build(ws,u){const def=ws.def,g=u.group,ct=def.court;if(!ct)return;
  const x0=ct.x0*TILE,x1=(ct.x1+1)*TILE,z0=ct.z0*TILE,z1=(ct.z1+1)*TILE,w=x1-x0,d=z1-z0;
  const c=canvas(1024,Math.round(1024*d/w)),x=c.getContext('2d'),S=1024/w;x.fillStyle='#b5523b';x.fillRect(0,0,c.width,c.height);
  x.fillStyle='#2f6b8a';x.fillRect(S*1,S*1,c.width-S*2,c.height-S*2);x.strokeStyle='#f4f1ea';x.lineWidth=S*.07;x.strokeRect(S*1,S*1,c.width-S*2,c.height-S*2);
  x.beginPath();x.moveTo(c.width/2,S);x.lineTo(c.width/2,c.height-S);x.stroke();x.beginPath();x.arc(c.width/2,c.height/2,S*1.8,0,6.28);x.stroke();
  for(const s of[0,1]){const ex=s?c.width-S:S,dir=s?-1:1;x.fillStyle='#b5523b';x.fillRect(s?ex-S*5.8:ex,c.height/2-S*2.4,S*5.8,S*4.8);x.strokeRect(s?ex-S*5.8:ex,c.height/2-S*2.4,S*5.8,S*4.8);
    x.beginPath();x.arc(ex+dir*S*5.8,c.height/2,S*1.8,0,6.28);x.stroke();x.beginPath();x.arc(ex+dir*S*1.6,c.height/2,S*6.75,s?Math.PI/2+.0:-Math.PI/2,s?Math.PI*1.5:Math.PI/2);x.stroke()}
  for(let i=0;i<500;i++){x.fillStyle=`rgba(${Math.random()<.5?'0,0,0':'255,255,255'},${Math.random()*.05})`;x.fillRect(Math.random()*c.width,Math.random()*c.height,4+Math.random()*30,4+Math.random()*30)}
  const sm=new THREE.Mesh(new THREE.PlaneGeometry(w,d),stdMat('court',{map:ctex(c),roughness:.75}));sm.rotation.x=-Math.PI/2;sm.position.set(x0+w/2,.012,z0+d/2);sm.receiveShadow=true;g.add(sm);
  const pole=stdMat('hoopPole',{color:'#2a2d31',metalness:.6,roughness:.4}),bb=stdMat('board',{color:'#f4f4f4',roughness:.3}),rim=stdMat('rim',{color:'#e8541c',metalness:.5,roughness:.4});
  const netM=new THREE.MeshStandardMaterial({color:lin('#f4f4f4'),roughness:.8,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false});
  const nets=new THREE.Group();g.add(nets);
  const ccx=x0+w/2;for(const h of ct.hoops){const s=h.x<ccx?1:-1;const hp=new THREE.Group();hp.position.set(h.x,0,h.z);g.add(hp);
    const p=new THREE.Mesh(cyl(.09,.09,3.4,10),pole);p.position.set(-s*1.1,1.7,0);p.castShadow=true;hp.add(p);const arm=new THREE.Mesh(new THREE.BoxGeometry(1.1,.1,.1),pole);arm.position.set(-s*.55,3.3,0);hp.add(arm);
    const board=new THREE.Mesh(new THREE.BoxGeometry(.05,1.05,1.8),bb);board.position.set(0,3.35,0);board.castShadow=true;hp.add(board);
    const sq=new THREE.Mesh(new THREE.BoxGeometry(.06,.45,.6),rim);sq.position.set(0,3.2,0);sq.scale.set(1,1,1);hp.add(sq);const sq2=new THREE.Mesh(new THREE.BoxGeometry(.065,.37,.52),bb);sq2.position.set(0,3.2,0);hp.add(sq2);
    const r=new THREE.Mesh(new THREE.TorusGeometry(.23,.018,6,20),rim);r.rotation.x=Math.PI/2;r.position.set(s*.3,3.05,0);hp.add(r);
    const n=new THREE.Mesh(cyl(.23,.14,.42,12,true),netM);n.position.set(h.x+s*.3,2.83,h.z);nets.add(n)}
  u.dress.push({t:35,on:nets});
  /* string lights between the fence posts at tier 4 */
  const sl=new THREE.Group();g.add(sl);const bulb=basicGlow('sbulb','#ffd890',4),wire=stdMat('wireOW',{color:'#1a1a1a'});
  for(let k=0;k<3;k++){const za=z0+1.2+k*(d-2.4)/2;const pts=[];for(let i=0;i<=16;i++){const t=i/16;pts.push(new THREE.Vector3(x0+t*w,3.6-Math.sin(t*Math.PI)*.7,za))}
    const tb=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.01,4),wire);sl.add(tb);for(let i=1;i<16;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.06,6,4),bulb);b.position.copy(pts[i]).y-=.08;sl.add(b)}}
  for(const xx of[x0+.2,x1-.2])for(let k=0;k<3;k++){const p=new THREE.Mesh(cyl(.04,.04,3.7,6),pole);p.position.set(xx,1.85,z0+1.2+k*(d-2.4)/2);sl.add(p)}
  u.dress.push({t:70,on:sl})}});
/* ---- Route 9 signage: guide signs, speed limits, turn arrows at Industrial Way, "Welcome to Riverside Flats" ---- */
SETPIECES.push({id:'r9signs',box:def=>({x0:170,z0:10,x1:330,z1:60,y1:9}),build(ws,u){const g=u.group,W_=HW();const B=newB(ws,g,'hub',{x0:85,z0:15,x1:160,z1:27},0,71);
  const gv=B.gbOf('galv');const mats={};
  const sign=(lines,o,x,z,ry,w,h,y)=>{const c=signCanvas(lines,o);const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:ctex(c),roughness:.4,metalness:.1}));
    m.position.set(x,y,z);m.rotation.y=ry;m.castShadow=true;g.add(m);const back=new THREE.Mesh(new THREE.PlaneGeometry(w,h),stdMat('signback',{color:'#8a8d91',metalness:.6,roughness:.5}));back.position.set(x-Math.sin(ry)*.02,y,z-Math.cos(ry)*.02);back.rotation.y=ry+Math.PI;g.add(back);return m};
  const post=(x,z,h)=>gv.addGeo(cyl(.05,.05,h,8),M4(x,h/2,z));
  /* eastbound guide sign, north shoulder edge (faces west, toward drivers heading east) */
  {const x=tc(92),z=tc(19)-.5;post(x-.9,z,3.6);post(x+.9,z,3.6);sign(['ROUTE 9 EAST ▸','RIVERSIDE FLATS 1 · INDUSTRIAL WAY ¼'],{bg:'#1d6b3c',fg:'#f6f6f2',fg2:'#f6f6f2',w:1024,h:400},x,z+.06,-Math.PI/2,2.6,1.0,3.3)}
  {const x=tc(138),z=tc(23)+.6;post(x,z,2.6);sign(['SPEED','LIMIT 35'],{bg:'#fbfbf8',fg:'#111',fg2:'#111',w:384,h:512,size:110},x,z-.03,-Math.PI/2,.62,.82,2.25)}
  {const x=tc(104),z=tc(23)+.6;post(x,z,2.6);sign(['SPEED','LIMIT 35'],{bg:'#fbfbf8',fg:'#111',fg2:'#111',w:384,h:512,size:110},x,z-.03,-Math.PI/2,.62,.82,2.25)}
  {const x=tc(126),z=tc(19)-.6;post(x,z,2.6);sign(['DIVIDED','BRIDGE AHEAD'],{bg:'#f2c230',fg:'#111',fg2:'#111',w:512,h:512,size:90},x,z+.03,-Math.PI/2,.8,.8,2.2)}
  {const x=tc(158),z=tc(19)-.6;post(x-.7,z,3.2);post(x+.7,z,3.2);sign(['WELCOME TO','RIVERSIDE FLATS · EST. 1911'],{bg:'#2b4a6b',fg:'#f6f3ea',fg2:'#f2c230',w:1024,h:420},x,z+.06,-Math.PI/2,2.2,.9,2.7)}
  {const x=tc(86),z=tc(23)+.6;post(x,z,3.2);sign(['WEST ◂','MAPLE HEIGHTS'],{bg:'#1d6b3c',fg:'#f6f6f2',fg2:'#f6f6f2',w:768,h:360},x,z-.06,Math.PI/2,1.7,.8,2.8)}
  /* left-turn arrows into Industrial Way on the eastbound side */
  const pg=B.gbOf('paint'),WH=[.92,.91,.88],Y=-.115;for(const ax of[tc(96),tc(90)]){const z=tc(22);pg.floor(ax-1.2,z-.1,ax+.2,z+.1,Y,3,()=>WH);const p=[[ax+.2,z-.38],[ax+.75,z],[ax+.2,z+.38]];pg.quad([p[0][0],Y,p[0][1]],[p[1][0],Y,p[1][1]],[p[1][0],Y,p[1][1]],[p[2][0],Y,p[2][1]],[[0,0],[1,0],[1,1],[0,1]],WH,[0,1,0])}
  /* utility poles along Route 9's south side */
  const pts=[];for(let x=tc(97);x<tc(140);x+=23)pts.push([x,tc(23)+1.05,Math.PI/2]);W_.utilityLine(B,pts);
  W_.finish(B,{bare:true,before:q=>{if(q.tuf)q.tuf.length=0;if(q.flw)q.flw.length=0}})}});
/* ---- Route 9 frontage: U-STORE-IT self storage and billboards ---- */
SETPIECES.push({id:'r9lots',box:def=>({x0:240,z0:0,x1:285,z1:60,y1:12}),build(ws,u){const g=u.group,W_=HW();const B=newB(ws,g,'hub',{x0:124,z0:1,x1:140,z1:17},0,81);
  const pad=B.gbOf('lot'),wall=B.gbOf('whsWall'),trim=B.gbOf('trim'),gv=B.gbOf('galv'),conc=B.gbOf('found');
  pad.floor(R9_PAD.x0,R9_PAD.z0,R9_PAD.x1,R9_PAD.z1,.015,3.6,()=>[.95,.95,.95]);
  const doorC=canvas(128,256),dx=doorC.getContext('2d');dx.fillStyle='#e8611c';dx.fillRect(0,0,128,256);dx.strokeStyle='rgba(0,0,0,.25)';dx.lineWidth=3;for(let y=10;y<256;y+=14){dx.beginPath();dx.moveTo(0,y);dx.lineTo(128,y);dx.stroke()}dx.fillStyle='#2a2a2a';dx.fillRect(54,220,20,10);
  const doorM=stdMat('storagedoor',{map:ctex(doorC),roughness:.5,metalness:.3});const doors=new (W_.GB)();
  for(const r of R9_STORAGE){wall.box(r.x0,0,r.z0,r.x1,2.9,r.z1,2,null,{top:true});trim.box(r.x0-.3,2.9,r.z0-.4,r.x1+.3,3.15,r.z1+.4,1,null,{});
    for(let x=r.x0+.4;x+2.6<r.x1;x+=3)for(const[z,n]of[[r.z1+.01,1],[r.z0-.01,-1]])doors.wz(x+.2,x+2.6,0,2.4,z,n,2.4)}
  const dm=gbMesh(doors,doorM,{shadow:false});if(dm)g.add(dm);
  const sc=signCanvas(['U-STORE-IT','SELF STORAGE · 24 HR ACCESS'],{bg:'#e8611c',fg:'#fff',fg2:'#fff',w:1024,h:256});const sg=new THREE.Mesh(new THREE.PlaneGeometry(5,1.25),stdMat('ustore',{map:ctex(sc),roughness:.5}));
  sg.position.set(266,2.3,R9_STORAGE[1].z1+.03);g.add(sg);
  /* chain-link along the yard's road side */
  const fab=new (W_.GB)();fab.quad([R9_PAD.x0,.04,R9_PAD.z1],[R9_PAD.x1,.04,R9_PAD.z1],[R9_PAD.x1,2,R9_PAD.z1],[R9_PAD.x0,2,R9_PAD.z1],[[0,0],[30/.7,0],[30/.7,2/.7],[0,2/.7]],null,[0,0,1]);
  for(let x=R9_PAD.x0;x<=R9_PAD.x1;x+=2.5)if(x<262||x>270)gv.addGeo(cyl(.035,.035,2.05,8),M4(x,1.02,R9_PAD.z1));const fm=gbMesh(fab,fabricMat(),{shadow:true});if(fm)g.add(fm);
  /* billboards: an ad on each face */
  for(const b of R9_BILL){const s=Math.sin(b.ry),co=Math.cos(b.ry);const P=(a,y,d)=>[b.x+a*co+d*s,y,b.z-a*s+d*co];
    for(const dxx of[-2.4,2.4]){const p=P(dxx,0,0);gv.addGeo(cyl(.18,.14,5,10),M4(p[0],2.5,p[2]))}
    const side=stdMat('bbside',{color:'#3a3d42',metalness:.5,roughness:.5});
    const panel=new THREE.Mesh(new THREE.BoxGeometry(8,3,.25),[side,side,side,side,stdMat('bbad'+b.ad*2,{map:ctex(adArt(b.ad*2)),roughness:.6}),stdMat('bbad'+(b.ad*2+1),{map:ctex(adArt(b.ad*2+1)),roughness:.6})]);
    const pc=P(0,6.4,0);panel.position.set(pc[0],pc[1],pc[2]);panel.rotation.y=b.ry;panel.castShadow=true;g.add(panel);
    for(const dd of[.6,-.6]){const walk=P(0,4.8,dd);trim.obox(walk[0],walk[1],walk[2],4,.04,.35,b.ry,1,null)}
    /* lamps over each face */
    for(const dd of[.9,-.9])for(const a of[-2.5,0,2.5]){const lp=P(a,8.05,dd);gv.addGeo(new THREE.BoxGeometry(.25,.12,.5),M4(lp[0],lp[1],lp[2],b.ry))}}
  W_.finish(B,{bare:true,before:q=>{if(q.tuf)q.tuf.length=0;if(q.flw)q.flw.length=0}})}});
/* Route 9 billboard art (1024x384 canvases) */
function adArt(i){const c=canvas(1024,384),x=c.getContext('2d');const T=(t,sz,y,col,font)=>{x.font=(font||'900 '+sz+'px "Arial Black", Impact, sans-serif');x.fillStyle=col;x.textAlign='center';x.fillText(t,512,y,960)};
  if(i===0){const g=x.createLinearGradient(0,0,1024,384);g.addColorStop(0,'#7d1d1d');g.addColorStop(1,'#c8262b');x.fillStyle=g;x.fillRect(0,0,1024,384);
    x.fillStyle='#f3d27a';x.fillRect(0,300,1024,84);T("HANK'S HARDWARE",96,140,'#fff');T('We have that.',62,225,'#f3d27a','italic 700 62px Georgia, serif');T('MAPLE AVE · ZIP TIES 2 FOR $5 · OPEN SATURDAYS',34,356,'#7d1d1d','800 34px Arial')}
  else if(i===1){x.fillStyle='#f2c230';x.fillRect(0,0,1024,384);x.fillStyle='#1c3150';x.fillRect(0,0,1024,96);T("DAD'S AUTO",72,72,'#fff');T("We don't judge minivans.",70,200,'#1c3150','italic 800 70px Georgia, serif');
    x.fillStyle='#1c3150';x.fillRect(180,250,300,70);x.fillRect(220,220,180,40);x.fillStyle='#bfe3ff';x.fillRect(235,228,70,28);x.fillRect(315,228,70,28);x.fillStyle='#111';for(const wx of[230,430]){x.beginPath();x.arc(wx,322,26,0,6.28);x.fill()}
    T('ROUTE 9 · NEXT RIGHT',44,350,'#1c3150','800 44px Arial')}
  else if(i===2){x.fillStyle='#fdf6e3';x.fillRect(0,0,1024,384);for(let k=0;k<14;k++){x.fillStyle=['#e8395b','#3fa7e8','#7fdc6e','#ffd23f'][k%4];x.beginPath();x.arc(40+k*72,30,18,0,6.28);x.fill()}
    T('BAKE SALE + CAR WASH',78,150,'#2b4a6b');T('Maple Heights Elementary · New playground fund',38,215,'#b8323a','700 38px Arial');T('SATURDAY 9-2 · FILL-ER-UP LOT',52,300,'#2b4a6b','800 52px Arial')}
  else{x.fillStyle='#d9d4c8';x.fillRect(0,0,1024,384);x.fillStyle='#2f5d4a';x.fillRect(0,0,340,384);T('',0,0,'#000');x.fillStyle='#e8e2d0';x.font='900 120px Georgia, serif';x.textAlign='center';x.fillText('BK',170,230);
    x.textAlign='left';x.fillStyle='#2f5d4a';x.font='900 64px Georgia, serif';x.fillText('BARB KOWALSKI',380,150);x.font='700 40px Arial';x.fillText('REALTY · "I sell porches"',380,215);x.font='800 46px Arial';x.fillText('555-0142',380,300);
    /* sun-faded and peeling */const r=rng(4);x.fillStyle='rgba(240,236,226,.35)';x.fillRect(0,0,1024,384);for(let k=0;k<26;k++){x.fillStyle='rgba(200,196,186,'+(.3+r()*.5)+')';x.fillRect(r()*1024,r()*384,20+r()*120,6+r()*30)}}
  return c}
/* ---- backdrop: world.js terrain ring with far houses and trees, the river valley carved through it ---- */
SETPIECES.push({id:'backdrop',box:def=>({x0:-400,z0:-400,x1:def.W*TILE+400,z1:def.H*TILE+400,y1:40}),always:true,build(ws,u){const W_=HW();if(!W_||!W_.backdrop)return;const def=ws.def;
  const B=W_.begin({def:{id:'world',lines:[]},g:[],W:0,H:0,group:u.group,colliders:[],solids:[]});B.W=def.W;B.H=def.H;B.hub=true;B.r=rng(99);
  const rx=147*TILE;B.carve=(x,z)=>sstep(18,90,Math.abs(x-rx));B.carveY=(x,z)=>{const inW=z>0&&z<def.H*TILE&&x>0&&x<def.W*TILE;return inW?0:-3.2*(1-sstep(10,18,Math.abs(x-rx)))};B.skipRing=(x,z)=>Math.abs(x-rx)<26;
  W_.backdrop(B);
  /* a Maple Heights water tower just past the north-west corner, and a power line along the south edge */
  {const tx_=46,tz_=-16,leg=B.gbOf('galv');for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4,px=tx_+Math.cos(a)*3.2,pz=tz_+Math.sin(a)*3.2;leg.addGeo(cyl(.18,.14,22,8),M4((px+tx_)/2+(px-tx_)*.25,10.5,(pz+tz_)/2+(pz-tz_)*.25,0,(pz-tz_)*.03,-(px-tx_)*.03))}
   for(const y of[7,14])leg.addGeo(new THREE.TorusGeometry(2.6-y*.04,.06,4,16).rotateX(Math.PI/2),M4(tx_,y,tz_));
   const tc_=canvas(1024,256),x=tc_.getContext('2d');x.fillStyle='#e9ebe8';x.fillRect(0,0,1024,256);x.fillStyle='#2f5d9e';x.font='900 92px "Arial Black", Impact';x.textAlign='center';x.fillText('MAPLE HEIGHTS',256,160);x.fillText('MAPLE HEIGHTS',768,160);
   const tank=new THREE.Mesh(new THREE.CylinderGeometry(4.6,4.6,5,28,1,true),stdMat('tank',{map:ctex(tc_),roughness:.5,metalness:.3}));tank.position.set(tx_,23,tz_);u.group.add(tank);
   const cap=new THREE.Mesh(new THREE.ConeGeometry(4.8,2.2,28),stdMat('tankcap',{color:'#e9ebe8',roughness:.5,metalness:.3}));cap.position.set(tx_,26.6,tz_);u.group.add(cap);
   const bot=new THREE.Mesh(new THREE.SphereGeometry(4.6,28,8,0,Math.PI*2,Math.PI/2,Math.PI/2),stdMat('tankcap',{}));bot.position.set(tx_,20.5,tz_);u.group.add(bot);
   const pts=[];for(let x=-40;x<def.W*TILE+60;x+=31)pts.push([x,def.H*TILE+7,Math.PI/2]);W_.utilityLine(B,pts)}
  for(const key in B.gb){const gb=B.gb[key];if(!gb.n)continue;const m=new THREE.Mesh(gb.geo(),W_.matFor(B,key));m.receiveShadow=true;m.castShadow=false;u.group.add(m)}
  W_.buildInst(B);for(const l of B.lod)ws.lod.push(l)}});

/* ================= Riverside dressing (SPEC2 A.7): built per chunk, toggled by trust ================= */
/* Trust-driven dressing without mesh swaps: every Riverside item is emitted once into a merged mesh per material per chunk, and each vertex carries
   aBT = (block id, from, until). A small vertex-shader patch hides vertices whose block's trust (uniform uBT[25], eased toward its target each frame)
   is outside [from, until). A trust change costs 25 uniform writes. These meshes don't cast shadows (the depth pass doesn't know about aBT). */
const BTU={uBT:{value:new Float32Array(25)},uGT:{value:0}},BTT=new Float32Array(25);
const BTMAT=new Map();
function btMat(m){if(!m)return m;let o=BTMAT.get(m);if(o)return o;o=m.clone();const prev=m.onBeforeCompile,prevKey=m.customProgramCacheKey?m.customProgramCacheKey():'';
  o.onBeforeCompile=(sh,r)=>{if(prev)prev.call(o,sh,r);sh.uniforms.uBT=BTU.uBT;sh.uniforms.uGT=BTU.uGT;
    sh.vertexShader='attribute vec3 aBT;uniform float uBT[25];uniform float uGT;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float btT=aBT.x<0.?uGT:uBT[int(aBT.x+.5)];if(btT<aBT.y||btT>=aBT.z)transformed=vec3(0.,-1.0e4,0.);`)};
  o.customProgramCacheKey=()=>prevKey+'|htbt';BTMAT.set(m,o);return o}
function stateBins(u,put){const GBc=HW().GB,acc={};
  const add=(prefix,blk,from,until,fn)=>{const tmp={},g=key=>tmp[key]||(tmp[key]=new GBc());fn(g);
    for(const key in tmp){const src=tmp[key];if(!src.n)continue;const k=prefix+'|'+key,a=acc[k]||(acc[k]={gb:new GBc(),bt:[]});appendGB(a.gb,src);
      const f=from==null?-1e9:from,t=until==null?1e9:until;for(let i=0;i<src.n;i++)a.bt.push(blk,f,t)}};
  const flush=(prefix,mats,o)=>{for(const k in acc){const[pre,key]=k.split('|');if(pre!==prefix)continue;const a=acc[k];delete acc[k];
      const mat=typeof mats==='function'?mats(key):mats[key]||mats.default;if(!mat)continue;const geo=a.gb.geo();geo.setAttribute('aBT',new THREE.Float32BufferAttribute(a.bt,3));
      const m=new THREE.Mesh(geo,btMat(mat));m.castShadow=false;m.receiveShadow=true;const oo=(o&&o[key])||(o&&o.default)||{};if(oo.order)m.renderOrder=oo.order;m.name='bt:'+key;u.group.add(m)}};
  return{add,flush}}
/* called by OW.dress (targets) and OW.update (easing) */
function setBT(ws,eased){const T=ws.blockT;if(!T)return;BTU.uGT.value=ws.trust||0;for(let b=0;b<25;b++){BTT[b]=T[b];if(!eased)BTU.uBT.value[b]=T[b]}}
function easeBT(dt){const v=BTU.uBT.value;for(let b=0;b<25;b++){const d=BTT[b]-v[b];if(d)v[b]+=Math.abs(d)<.5?d:d*Math.min(1,dt*2.2)}}
function riversideDressing(ws,u,B,ch,box){const def=ws.def,W_=HW();if(box.x1<=152*TILE)return;
  const put=(obj,d)=>{if(!obj)return;u.group.add(obj);u.dress.push(d)};const S=stateBins(u,put);
  /* street lamps: lit from brokenUntil on, tilted with a dead lens before that */
  for(const l of ch.lamps){if(l.hood!=='river')continue;const blk=blockOf(l.x,l.z),lamp=(broken)=>g=>{const save=B.gb;B.gb={};W_.streetLamp(B,l.x,l.z,lampDir(ws,l));const parts=B.gb;B.gb=save;
      if(broken)tiltLamps(parts,[l],ws);if(parts.lamphead)appendGB(g('head'),parts.lamphead);if(parts.lampglass)appendGB(g(broken?'dead':'lit'),parts.lampglass)};
    if(l.brokenUntil>0)S.add('lamp',blk,null,l.brokenUntil,lamp(true));S.add('lamp',blk,l.brokenUntil||null,null,lamp(false))}
  S.flush('lamp',{head:W_.matFor(B,'lamphead'),lit:W_.matFor(B,'lampglass'),dead:stdMat('deadglass',{color:'#3a3d40',roughness:.3})},{head:{shadow:true}});
  /* graffiti until its clearAt; where a tag cleared at 50+, a small mural panel from 75 */
  for(const t of ch.tags){const blk=blockOf(t.x,t.z),c=t.design,u0=(c%4)*.25,v0=1-Math.floor(c/4)*.5,hw=t.w/2,hh=t.h/2,fx=t.face[0],fz=t.face[1];const ox=t.kind==='z'?fx*.04:0,oz=t.kind==='z'?fz*.04:0;
    const P=(a,b)=>[t.x+ox+fz*a,t.y+b,t.z+oz-fx*a];S.add('wall',blk,null,t.clearAt,g=>g('tag').quad(P(-hw,-hh),P(hw,-hh),P(hw,hh),P(-hw,hh),[[u0,v0-.5],[u0+.25,v0-.5],[u0+.25,v0],[u0,v0]],null,[fx,0,fz]));
    if(t.clearAt>=50&&t.kind!=='z'){const mu=(t.design%4)*.25,mw=1.15,mh=.85;S.add('wall',blk,75,null,g=>g('mural').quad(P(-mw,-mh),P(mw,-mh),P(mw,mh),P(-mw,mh),[[mu,0],[mu+.25,0],[mu+.25,1],[mu,1]],null,[fx,0,fz]))}}
  /* chalk (50) */
  for(const c of ch.chalk){const blk=blockOf(c.x,c.z),i=c.design,u0=(i%3)/3,v0=1-Math.floor(i/3)*.5,s=.85,co=Math.cos(c.yaw),sn=Math.sin(c.yaw),P=(a,b)=>[c.x+a*co+b*sn,.006,c.z-a*sn+b*co];
    S.add('wall',blk,50,null,g=>g('chalk').quad(P(-s,-s),P(-s,s),P(s,s),P(s,-s),[[u0,v0-.5],[u0,v0],[u0+1/3,v0],[u0+1/3,v0-.5]],null,[0,1,0]))}
  S.flush('wall',{tag:grafMat(),mural:muralMat(),chalk:chalkMat()},{default:{order:2}});
  /* trash and carts (gone at 20) */
  const tr={};for(const o of ch.trash){const blk=blockOf(o.x,o.z);const g=tr[blk]||(tr[blk]=new THREE.Group());if(o.kind==='bag'){const bag=bagMesh();bag.position.set(o.x+(o.tx*7%5-2)*.15,0,o.z);bag.rotation.y=o.tx*1.3;g.add(bag)}else g.add(cartMesh(o))}
  for(const blk in tr){const g=tr[blk];u.group.add(g);g.updateMatrixWorld(true);compact(g,[]);u.dress.push({blk:+blk,t:20,off:g})}
  /* lane paint: worn below 30, fresh above */
  for(const k of['rpaint','rpaintF'])for(const blk in (B[k]||{})){const gbx=B[k][blk];S.add('road',+blk,k==='rpaint'?30:null,k==='rpaint'?null:30,g=>appendGB(g('paint'),gbx))}
  streetLife(ws,u,B,ch,box,S);
  S.flush('road',{paint:W_.matFor(B,'paint'),hole:potholeMat(),patch:W_.matFor(B,'road'),pit:stdMat('pitsoil',{color:'#3a2c20',roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4})},{default:{order:1}});
  /* back-yard chain-link -> white pickets (65) */
  for(const blk in (B.yardChain||{})){const y=B.yardChain[blk];S.add('yard',+blk,null,65,g=>{appendGB(g('fab'),y.fab);appendGB(g('posts'),y.posts)});S.add('yard',+blk,65,null,g=>appendGB(g('picket'),y.picket))}
  S.flush('yard',{fab:fabricMat(),posts:W_.matFor(B,'galv'),picket:stdMat('picket',{color:'#f2efe6',roughness:.7})},{default:{shadow:true}});
  rowDressing(ws,u,B,box,S);
  S.flush('vc',{vc:stdMat('rvc',{color:'#ffffff',vertexColors:true,roughness:.55,metalness:.1}),fbox:W_.matFor(B,'fence'),ply:W_.matFor(B,'ply'),grime:grimeMat(),post:W_.matFor(B,'galv'),
    sale:stdMat('signSale',{map:ctex(signCanvas(['FOR SALE','BARB KOWALSKI · 555-0142'],{bg:'#fbfbf6',fg:'#b8323a',fg2:'#1d1d1d',w:512,h:320})),roughness:.6}),
    sold:stdMat('signSold',{map:ctex(signCanvas(['SOLD!','WELCOME, NEIGHBOR'],{bg:'#b8323a',fg:'#fff',fg2:'#ffd23f',w:512,h:320})),roughness:.6})},{grime:{order:2},fbox:{shadow:true},vc:{shadow:true}});
  streetTrees(ws,u,ch,put)}
/* copy one world.js builder's geometry into another */
function appendGB(dst,src){const o=dst.n;for(let i=0;i<src.P.length;i++)dst.P.push(src.P[i]);for(let i=0;i<src.N.length;i++)dst.N.push(src.N[i]);for(let i=0;i<src.U.length;i++)dst.U.push(src.U[i]);for(let i=0;i<src.K.length;i++)dst.K.push(src.K[i]);for(const i of src.I)dst.I.push(i+o);dst.n+=src.n}
function tiltLamps(parts,list,ws){/* rotate each lamp's vertices about its own base: vertices are assigned to the nearest lamp */
  for(const k in parts){const P=parts[k].P;for(let i=0;i<P.length;i+=3){let best=null,bd=1e9;for(const l of list){const d=Math.abs(P[i]-l.x)+Math.abs(P[i+2]-l.z);if(d<bd){bd=d;best=l}}
    const dir=lampDir(ws,best),ax=dir[1],az=-dir[0];/* tip away from the road */const a=-.22,y=P[i+1],dx=P[i]-best.x,dz=P[i+2]-best.z;
    /* rotation about the horizontal axis (ax,0,az) through the base */
    const c=Math.cos(a),s=Math.sin(a);const along=dx*dir[0]+dz*dir[1];const na=along*c-y*s,ny=along*s+y*c;P[i]+= (na-along)*dir[0];P[i+2]+=(na-along)*dir[1];P[i+1]=ny}}}
function grafMat(){if(MC.graf)return MC.graf;return MC.graf=new THREE.MeshStandardMaterial({map:grafTex(),transparent:true,depthWrite:false,roughness:.7,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4,side:THREE.DoubleSide})}
function chalkMat(){if(MC.chalk)return MC.chalk;return MC.chalk=new THREE.MeshStandardMaterial({map:chalkTex(),transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-6})}
function bagMesh(){const g=new THREE.Group();const parts=HW()&&HW().partsOf('trashbag');
  if(parts){for(const p of parts.parts){const m=new THREE.Mesh(p.geo,p.mat);m.applyMatrix4(p.m);m.castShadow=true;g.add(m)}return g}
  const m=new THREE.Mesh(new THREE.SphereGeometry(.35,10,8),stdMat('bag',{color:'#1b1d20',roughness:.35}));m.scale.set(1,.8,1);m.position.y=.28;m.castShadow=true;g.add(m);return g}
function cartMesh(o){const g=new THREE.Group(),wm=stdMat('cartwire',{color:'#b8bcc0',metalness:.8,roughness:.35,wireframe:false}),rd=stdMat('cartred',{color:'#c8262b',roughness:.5});
  const basket=new THREE.Mesh(new THREE.BoxGeometry(.9,.5,.55,4,2,3),stdMat('cartw',{color:'#b8bcc0',metalness:.8,roughness:.35,wireframe:true}));basket.position.y=.75;g.add(basket);
  const base=new THREE.Mesh(new THREE.BoxGeometry(.85,.03,.5),wm);base.position.y=.22;g.add(base);const h=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.55),rd);h.position.set(-.5,1.05,0);g.add(h);
  for(const[x,z]of[[.35,.22],[.35,-.22],[-.35,.22],[-.35,-.22]]){const w=new THREE.Mesh(cyl(.06,.06,.04,8),stdMat('tyreK',{color:'#151515'}));w.rotation.x=Math.PI/2;w.position.set(x,.06,z);g.add(w)}
  g.position.set(o.x,0,o.z);g.rotation.set(0,o.yaw||0,o.tx%3===0?1.4:0);if(o.tx%3===0)g.position.y=.3;return g}
/* rowhouse fronts per block: boards (35/70), grime (gone at 45), tired doors -> painted doors (55), FOR SALE (25-45) -> SOLD (45-60) signs,
   flower boxes (70), bikes by the stoops (72). Door and window positions follow HT.Buildings' rowhouse layout. */
function rowDressing(ws,u,B,box,S){const def=ws.def;if(!ws.rowBlocks)return;
  const DOORC=[[.18,.42,.31],[.72,.2,.23],[.17,.29,.42],[.88,.63,.19],[.42,.25,.54],[.12,.37,.42]];
  ws.rowBlocks.forEach((b,bi)=>{const cx=(b.x0+b.x1+1)*TILE/2,cz=(b.z0+b.z1+1)*TILE/2;if(cx<box.x0||cx>=box.x1||cz<box.z0||cz>=box.z1||!b.facing)return;
    const blk=blockOf(cx,cz);if(blk<0)return;
    const W=(b.x1-b.x0+1)*TILE-.2,D=(b.z1-b.z0+1)*TILE-.2,n=Math.max(1,Math.round(W/5.2)),uw=W/n,rot=b.facing==='+z'?0:Math.PI,cs=Math.cos(rot),sn=Math.sin(rot),base=1.05,top=b.h;
    const R2=(x,z)=>[cx+x*cs+z*sn,cz-x*sn+z*cs];const zf=D/2+.07,nn=[sn,0,cs];
    const Q=(gb,xa,xb,y0,y1,z,col,uv)=>{const a=R2(xa,z),c=R2(xb,z);gb.quad([a[0],y0,a[1]],[c[0],y0,c[1]],[c[0],y1,c[1]],[a[0],y1,a[1]],uv||[[0,0],[1,0],[1,1],[0,1]],col||null,nn)};
    for(let i=0;i<n;i++){const ux0=-W/2+i*uw,uh=top+(i%2?.25:0);const wins=[{s:i%2?uw*.36:uw*.64,y0:base+.7,w:1,h:1.8}];for(let f=1;f*2.95+base+2.5<uh-.4;f++)for(const s0 of[uw*.28,uw*.72])wins.push({s:s0,y0:base+f*2.95+.6,w:.95,h:1.7});
      const ru=def.rowUnits.find(q=>Math.abs(q.cx-R2(ux0+uw/2,0)[0])<3&&Math.abs(q.cz-cz)<4);const until=ru?ru.boardedUntil:((bi*5+i)%3===0?35:0);
      wins.forEach((w,k)=>{const xa=ux0+w.s-w.w/2-.08,xb=ux0+w.s+w.w/2+.08;
        if(until&&(k%2===0||until===70))S.add('vc',blk,null,until,g=>Q(g('ply'),xa,xb,w.y0-.08,w.y0+w.h+.08,zf,null,[[0,0],[1,0],[1,1.6],[0,1.6]]));
        else if(k>0&&k<3)S.add('vc',blk,70,null,g=>{const y=w.y0-.12,a=R2(xa,zf),c2=R2(xb-.05,zf+.18);g('fbox').box(Math.min(a[0],c2[0]),y-.2,Math.min(a[1],c2[1]),Math.max(a[0],c2[0]),y,Math.max(a[1],c2[1]),1,null,{});
          for(let t=.1;t<.95;t+=.16){const pp=R2(xa+(xb-xa)*t,zf+.09);g('vc').addGeo(new THREE.IcosahedronGeometry(.09,0),M4(pp[0],y+.06,pp[1]),1,[[.9,.2,.3],[.95,.8,.2],[.85,.4,.8]][Math.floor(t*10)%3])}});
        S.add('vc',blk,null,45,g=>Q(g('grime'),ux0+w.s-w.w/2-.05,ux0+w.s+w.w/2+.05,w.y0-1.4,w.y0-.02,zf+.14,null))});
      S.add('vc',blk,null,45,g=>Q(g('grime'),ux0,ux0+uw,.2,1.6,zf+.13,null,[[0,.5],[1,.5],[1,1],[0,1]]));
      const dS=ux0+(i%2?uw-1.0:1.0),dc=DOORC[(bi*7+i*3)%DOORC.length];
      S.add('vc',blk,null,55,g=>Q(g('vc'),dS-.48,dS+.48,base+.02,base+2.4,D/2+.035,[.36,.35,.33]));S.add('vc',blk,55,null,g=>Q(g('vc'),dS-.48,dS+.48,base+.02,base+2.4,D/2+.035,dc));
      if(i%3===1){const bp=R2(dS+(i%2?-1.3:1.3),D/2+1.4);S.add('vc',blk,72,null,g=>bike(g('vc'),bp[0],bp[1],rot+Math.PI/2+.25))}}
    /* yard sign on the first unit: FOR SALE, then SOLD */
    const sp=R2(-W/2+.6,D/2+1.0);S.add('vc',blk,25,60,g=>g('post').box(sp[0]-.03,0,sp[1]-.03,sp[0]+.03,1.1,sp[1]+.03,1,null,{}));
    for(const[kind,a0,a1]of[['sale',25,45],['sold',45,60]])S.add('vc',blk,a0,a1,g=>{const a=R2(-W/2+.25,D/2+1.0),c=R2(-W/2+.95,D/2+1.0);for(const dz of[.02,-.02]){const A=[a[0]+nn[0]*dz,.62,a[1]+nn[2]*dz],Cc=[c[0]+nn[0]*dz,.62,c[1]+nn[2]*dz];
      g(kind).quad(A,Cc,[Cc[0],1.08,Cc[2]],[A[0],1.08,A[2]],dz>0?[[0,0],[1,0],[1,1],[0,1]]:[[1,0],[0,0],[0,1],[1,1]],null,[nn[0]*Math.sign(dz),0,nn[2]*Math.sign(dz)])}});
    /* benches go into the same vc bins (streetLife) */});}
function bike(gb,x,z,yaw){const c=Math.cos(yaw),s=Math.sin(yaw),P=(a,y)=>M4(x+a*c,y,z-a*s,yaw);const col=[[.75,.15,.15],[.15,.35,.7],[.2,.6,.3]][Math.floor(Math.abs(x*7+z))%3];
  for(const a of[-.5,.5]){const w=new THREE.TorusGeometry(.32,.025,6,16);gb.addGeo(w,P(a,.34),1,[.08,.08,.08])}
  const tube=(a0,y0,a1,y1)=>{const g=new THREE.CylinderGeometry(.022,.022,Math.hypot(a1-a0,y1-y0),5);g.rotateZ(Math.atan2(a0-a1,y1-y0));gb.addGeo(g,P((a0+a1)/2,(y0+y1)/2),1,col)};
  tube(-.5,.34,-.05,.72);tube(-.05,.72,.42,.75);tube(-.05,.72,.05,.34);tube(.05,.34,.5,.34);tube(.42,.75,.5,.34);tube(.42,.75,.4,.95)}
function grimeTex(){if(TX.gm)return TX.gm;const c=canvas(128,256),x=c.getContext('2d'),r=rng(12);x.clearRect(0,0,128,256);
  /* soot blotches and wide rain streaks: reads on dark brick at street distance */
  for(let i=0;i<9;i++){const px=r()*128,py=r()*90,R=20+r()*40,g=x.createRadialGradient(px,py,0,px,py,R);g.addColorStop(0,'rgba(18,15,12,.7)');g.addColorStop(1,'rgba(18,15,12,0)');x.fillStyle=g;x.fillRect(0,0,128,256)}
  for(let i=0;i<14;i++){const px=r()*128,w=8+r()*22,len=90+r()*160,g=x.createLinearGradient(0,0,0,len);g.addColorStop(0,'rgba(22,18,14,.85)');g.addColorStop(1,'rgba(22,18,14,0)');x.fillStyle=g;x.fillRect(px-w/2,0,w,len)}
  const g=x.createLinearGradient(0,140,0,256);g.addColorStop(0,'rgba(20,18,14,0)');g.addColorStop(1,'rgba(20,18,14,.75)');x.fillStyle=g;x.fillRect(0,140,128,116);return TX.gm=ctex(c)}
function grimeMat(){return MC.grime||(MC.grime=new THREE.MeshStandardMaterial({map:grimeTex(),transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4}))}
function muralTex(){if(TX.mu)return TX.mu;const c=canvas(1024,256),x=c.getContext('2d'),r=rng(21);const pal=[['#ffd23f','#3fa7e8','#e8395b'],['#7fdc6e','#ff8c2a','#2b4a6b'],['#c58cff','#ffd23f','#2ae8c8'],['#ff7ab6','#3a7bd5','#f4f1e8']];
  for(let i=0;i<4;i++){const[a,b,d]=pal[i],X=i*256;x.fillStyle=b;x.fillRect(X,0,256,256);x.fillStyle=a;x.beginPath();x.arc(X+70,70,40,0,6.28);x.fill();x.fillStyle=d;
    for(let k=0;k<5;k++){x.beginPath();x.ellipse(X+40+k*45,200-(k%2)*30,30,50,0,0,6.28);x.fill()}x.strokeStyle='#fff';x.lineWidth=6;x.beginPath();x.moveTo(X+20,140);for(let k=0;k<8;k++)x.lineTo(X+20+k*30,140+Math.sin(k)*14);x.stroke();
    x.fillStyle='#fff';x.font='900 30px "Arial Black", Impact';x.textAlign='center';x.fillText(['GROW','HOME','TOGETHER','RIVERSIDE'][i],X+170,60)}return TX.mu=ctex(c)}
function muralMat(){return MC.mural||(MC.mural=new THREE.MeshStandardMaterial({map:muralTex(),roughness:.85,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-6,side:THREE.DoubleSide}))}
function potholeTex(){if(TX.ph)return TX.ph;const c=canvas(256,256),x=c.getContext('2d'),r=rng(31);x.clearRect(0,0,256,256);
  for(let i=0;i<3;i++){const px=60+r()*136,py=60+r()*136,R=18+r()*30;x.fillStyle='rgba(18,18,18,.85)';x.beginPath();for(let k=0;k<=16;k++){const a=k/16*6.283,rr=R*(.7+r()*.5);k?x.lineTo(px+Math.cos(a)*rr,py+Math.sin(a)*rr):x.moveTo(px+Math.cos(a)*rr,py+Math.sin(a)*rr)}x.fill()}
  x.strokeStyle='rgba(12,12,12,.8)';x.lineWidth=2;for(let i=0;i<9;i++){let px=r()*256,py=r()*256;x.beginPath();x.moveTo(px,py);for(let k=0;k<6;k++){px+=(r()-.5)*60;py+=(r()-.5)*60;x.lineTo(px,py)}x.stroke()}return TX.ph=ctex(c)}
function potholeMat(){return MC.hole||(MC.hole=new THREE.MeshStandardMaterial({map:potholeTex(),transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-6}))}
/* streets: potholes and cracks (gone at 40) -> neat patches, tree pits, benches and bike racks (50) */
function streetLife(ws,u,B,ch,box,S){const def=ws.def,K=ws.K,Wd=def.W;const h=(x,z)=>((x*73856093)^(z*19349663))>>>0;u.treeSpots=[];
  for(let z=ch.z0;z<=ch.z1;z++)for(let x=Math.max(ch.x0,153);x<=ch.x1;x++){const k=K[z*Wd+x],X=tc(x),Z=tc(z),blk=blockOf(X,Z),hv=h(x,z);if(blk<0)continue;
    if(k==='road'&&def.map[z][x]===','&&hv%9===0){const s=.7+(hv%7)*.12,a=(hv%628)/100,co=Math.cos(a),sn=Math.sin(a),P=(p,q)=>[X+p*co+q*sn,-.115,Z-p*sn+q*co];
      S.add('road',blk,null,40,g=>g('hole').quad(P(-s,-s),P(-s,s),P(s,s),P(s,-s),[[0,0],[0,1],[1,1],[1,0]],null,[0,1,0]));
      S.add('road',blk,40,null,g=>g('patch').floor(X-s*.8,Z-s*.6,X+s*.8,Z+s*.6,-.116,3,()=>[.55,.55,.56]))}
    const side=()=>{for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]])if(K[(z+dz)*Wd+x+dx]==='road'&&!isShoulder(x+dx,z+dz))return[dx,dz];return null};
    if(def.map[z][x]==='s'&&hv%7===0){const road=side();if(!road)continue;let clear=true;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const c=def.map[z+dz]&&def.map[z+dz][x+dx];if(c==='l')clear=false}if(!clear)continue;
      const px=X+road[0]*.45,pz=Z+road[1]*.45;S.add('road',blk,null,null,g=>g('pit').floor(px-.55,pz-.55,px+.55,pz+.55,.008,1));u.treeSpots.push({x:px,z:pz,r:hv,blk})}
    else if(def.map[z][x]==='s'&&hv%17===1){const road=side();if(!road)continue;const yaw=Math.atan2(road[0],road[1]),c=Math.cos(yaw),sn=Math.sin(yaw),P=(a,b,y)=>[X-road[0]*.3+a*c+b*sn,y,Z-road[1]*.3-a*sn+b*c];
      S.add('vc',blk,50,null,g=>{const gb=g('vc');if(hv%2){gb.obox(...P(0,0,.45),.8,.03,.22,yaw+Math.PI/2,1,[.55,.38,.22]);gb.obox(...P(0,-.2,.72),.8,.12,.02,yaw+Math.PI/2,1,[.55,.38,.22]);for(const a of[-.65,.65])gb.obox(...P(a,0,.22),.03,.22,.2,yaw+Math.PI/2,1,[.12,.12,.12])}
        else for(let k=0;k<4;k++){const t=new THREE.TorusGeometry(.32,.025,5,12,Math.PI);const p=P((k-1.5)*.5,0,0);gb.addGeo(t,M4(p[0],0,p[2],yaw),1,[.2,.45,.7])}})}}}
/* street trees in the pits: saplings at 30, young trees at 55, full canopy at 80 (instanced glTF, one stage visible per block) */
function streetTrees(ws,u,ch,put){const W_=HW(),parts=W_.partsOf('tree_oak')||W_.partsOf('tree_tall');if(!parts||!u.treeSpots||!u.treeSpots.length)return;const dm=new THREE.Object3D(),mm=new THREE.Matrix4();
  const by={};for(const q of u.treeSpots)(by[q.blk]||(by[q.blk]=[])).push(q);
  for(const blk in by){const L=by[blk];for(const[st,t,until]of[[.36,30,55],[.66,55,80],[.95,80,null]]){const grp=new THREE.Group();
      for(const part of parts.parts){const im=new THREE.InstancedMesh(part.geo,part.mat,L.length);L.forEach((q,i)=>{dm.position.set(q.x,0,q.z);dm.rotation.set(0,q.r%6,0);dm.scale.setScalar(st*(.9+(q.r%5)*.05));dm.updateMatrix();mm.multiplyMatrices(dm.matrix,part.m);im.setMatrixAt(i,mm)});
        const g2=new THREE.BufferGeometry();for(const k in part.geo.attributes)g2.setAttribute(k,part.geo.attributes[k]);if(part.geo.index)g2.setIndex(part.geo.index);g2.groups=part.geo.groups;
        const c=blockCentre(+blk);g2.boundingSphere=new THREE.Sphere(new THREE.Vector3(c.x,6,c.z),40);im.geometry=g2;im.castShadow=st>.6;im.receiveShadow=true;grp.add(im)}
      put(grp,{blk:+blk,t,until,on:grp})}}}
/* mural on the Dock St warehouse at 3rd St, OPEN neon + awning at the mart, block party banner: global dressing pieces */
SETPIECES.push({id:'riverside',box:def=>({x0:310,z0:0,x1:464,z1:160,y1:12}),build(ws,u){const def=ws.def,g=u.group;
  /* mural (tier 4) */
  const mc=canvas(1024,512),x=mc.getContext('2d');const sky=x.createLinearGradient(0,0,0,512);sky.addColorStop(0,'#7cc6f0');sky.addColorStop(1,'#d9f0ff');x.fillStyle=sky;x.fillRect(0,0,1024,512);
  x.fillStyle='#ffd23f';x.beginPath();x.arc(820,120,70,0,6.28);x.fill();x.strokeStyle='#ffd23f';x.lineWidth=10;for(let k=0;k<12;k++){const a=k/12*6.28;x.beginPath();x.moveTo(820+Math.cos(a)*90,120+Math.sin(a)*90);x.lineTo(820+Math.cos(a)*125,120+Math.sin(a)*125);x.stroke()}
  x.fillStyle='#3a7bd5';x.beginPath();x.moveTo(0,330);for(let i=0;i<=1024;i+=32)x.lineTo(i,330+Math.sin(i/60)*14);x.lineTo(1024,512);x.lineTo(0,512);x.fill();
  x.fillStyle='#5aa83a';x.fillRect(0,260,1024,70);for(let i=0;i<9;i++){x.fillStyle='#d8312c';x.beginPath();x.arc(80+i*48,250-(i%2)*18,18,0,6.28);x.fill();x.fillStyle='#2f7a2a';x.fillRect(77+i*48,262-(i%2)*18,6,40)}
  x.fillStyle='#35577d';x.fillRect(520,210,280,90);x.fillRect(560,170,180,50);x.fillStyle='#bfe3ff';x.fillRect(575,180,70,34);x.fillRect(655,180,70,34);x.fillStyle='#222';for(const wx of[575,745]){x.beginPath();x.arc(wx,305,26,0,6.28);x.fill()}
  x.fillStyle='#fff';x.font='900 64px "Arial Black", Impact';x.textAlign='center';x.fillText('RIVERSIDE',512,450);x.font='700 30px Comic Sans MS, cursive';x.fillText('painted by the kids of 3rd St',512,495);
  const wh=(ws.whBlocks||blocksOf(def,'x')).find(b=>b.x0<=190&&b.x1>=186)||(ws.whBlocks||blocksOf(def,'x'))[0];
  if(wh){const mx=(wh.x0+wh.x1+1)*TILE/2,mz=wh.z0*TILE+.08;const m=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(16,(wh.x1-wh.x0+1)*TILE-2),4.2),new THREE.MeshStandardMaterial({map:ctex(mc),roughness:.85,polygonOffset:true,polygonOffsetFactor:-2}));
    m.position.set(mx,3.1,mz-.02);m.rotation.y=Math.PI;g.add(m);u.dress.push({t:70,on:m})}
  /* corner mart: striped awning and OPEN neon at tier 3 */
  const mart=def.buildings.find(b=>b.id==='mart');if(mart){const z=(mart.z1+1)*TILE+.05,x0=mart.x0*TILE+.6,x1=(mart.x1+1)*TILE-.6;const grp=new THREE.Group();
    const ac=canvas(256,64),ax=ac.getContext('2d');for(let i=0;i<8;i++){ax.fillStyle=i%2?'#f4f1ea':'#2c7a3b';ax.fillRect(i*32,0,32,64)}
    const aw=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,1.3),new THREE.MeshStandardMaterial({map:ctex(ac),roughness:.7,side:THREE.DoubleSide}));aw.position.set((x0+x1)/2,2.95,z+.55);aw.rotation.x=-Math.PI/2+.55;aw.castShadow=true;grp.add(aw);
    const nc=canvas(256,96),nx=nc.getContext('2d');nx.fillStyle='#000';nx.fillRect(0,0,256,96);nx.font='900 70px Arial';nx.textAlign='center';nx.fillStyle='#ff3b5c';nx.shadowColor='#ff3b5c';nx.shadowBlur=18;nx.fillText('OPEN',128,72);
    const ne=new THREE.Mesh(new THREE.PlaneGeometry(.9,.34),new THREE.MeshBasicMaterial({map:ctex(nc),toneMapped:false,color:new THREE.Color(2.2,2.2,2.2)}));ne.position.set(x0+1.3,1.9,z+.06);grp.add(ne);g.add(grp);u.dress.push({t:50,on:grp})}
  /* block party banner over Main St at 2nd St (tier 5) */
  {const bc=signCanvas(['RIVERSIDE BLOCK PARTY','SATURDAY · EVERYBODY WELCOME'],{bg:'#ffd23f',fg:'#b8323a',fg2:'#2b4a6b',w:1024,h:256});const grp=new THREE.Group();
    const bn=new THREE.Mesh(new THREE.PlaneGeometry(7,1.3),new THREE.MeshStandardMaterial({map:ctex(bc),roughness:.8,side:THREE.DoubleSide}));bn.position.set(tc(178),5.2,tc(21));bn.rotation.y=Math.PI/2;grp.add(bn);
    for(const dz of[-4.4,4.4]){const p=new THREE.Mesh(cyl(.06,.06,6.2,8),stdMat('galvM',{color:'#9aa0a6',metalness:.8,roughness:.4}));p.position.set(tc(178),3.1,tc(21)+dz);grp.add(p)}g.add(grp);u.dress.push({t:90,on:grp})}
  /* garden: weeds -> seedlings -> bloom (tomato cages, sunflowers) on Rosa's beds */
  const beds=def.beds;if(beds.length){const mk=(kind)=>{const grp=new THREE.Group(),r=rng(kind.length*13);const leaf=stdMat('leaf'+kind,{color:kind==='weeds'?'#6b7a3a':'#4d8a3a',roughness:.9}),red=stdMat('tomato',{color:'#d8312c',roughness:.5}),yel=stdMat('sunfl',{color:'#f2c230',roughness:.6}),stake=stdMat('stake',{color:'#9aa0a6',metalness:.6});
      for(const b of beds){const x0=b.x0*TILE+.4,x1=(b.x1+1)*TILE-.4;for(let x=x0;x<x1;x+=kind==='weeds'?.35:.7){const px=x+(r()-.5)*.2,pz=b.z+(r()-.5)*.9;
        if(kind==='weeds'){const m=new THREE.Mesh(new THREE.ConeGeometry(.12,.3+r()*.25,4),leaf);m.position.set(px,.55,pz);grp.add(m)}
        else if(kind==='seedlings'){const m=new THREE.Mesh(new THREE.SphereGeometry(.09,6,4),leaf);m.position.set(px,.45,pz);grp.add(m)}
        else{const cage=new THREE.Mesh(cyl(.2,.12,.9,6,true),stake);cage.position.set(px,.83,pz);grp.add(cage);const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(.25,0),leaf);bush.position.set(px,.75,pz);grp.add(bush);
          for(let k=0;k<3;k++){const t=new THREE.Mesh(new THREE.SphereGeometry(.05,6,4),red);t.position.set(px+(r()-.5)*.3,.6+r()*.3,pz+(r()-.5)*.3);grp.add(t)}
          if(r()<.3){const st=new THREE.Mesh(cyl(.02,.02,1.6,5),leaf);st.position.set(px,1.2,pz);grp.add(st);const f=new THREE.Mesh(cyl(.16,.16,.04,10),yel);f.position.set(px,2,pz);f.rotation.x=1.2;grp.add(f)}}}}
      g.add(grp);return grp};
    const wd=mk('weeds'),sd=mk('seedlings'),bl=mk('bloom');u.dress.push({t:50,off:wd},{t:50,on:sd,until:70},{t:70,on:bl})}}});

/* ---- Riverside renovations: pocket park (60), little free library + picnic corner (70), community garden (80), block party (90), moving truck (follows the renovation front) ---- */
SETPIECES.push({id:'riverlots',box:def=>({x0:300,z0:0,x1:464,z1:160,y1:10}),build(ws,u){const def=ws.def,g=u.group,W_=HW();
  const wood=stdMat('rlwood',{color:'#9a6b43',roughness:.7}),metal=stdMat('rlmetal',{color:'#2a2d31',metalness:.6,roughness:.4}),leaf=stdMat('rlleaf',{color:'#4d8a3a',roughness:.9}),soil=stdMat('rlsoil',{color:'#3e2e22',roughness:1});
  const B=(w,h,d,m,x,y,z,ry=0,par)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.rotation.y=ry;o.castShadow=true;o.receiveShadow=true;(par||g).add(o);return o};
  const bench=(par,x,z,ry)=>{B(1.6,.06,.42,wood,x,.45,z,ry,par);B(1.6,.3,.05,wood,x-Math.sin(ry)*.2,.7,z-Math.cos(ry)*.2,ry,par);for(const a of[-.65,.65])B(.06,.45,.4,metal,x+Math.cos(ry)*a,.22,z-Math.sin(ry)*a,ry,par)};
  const shrub=(par,x,z,s)=>{const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.6*s,1),leaf);m.position.set(x,.5*s,z);m.castShadow=true;par.add(m)};
  /* pocket park under the community center */
  {const P=new THREE.Group();g.add(P);const x0=208*TILE+1,x1=219*TILE-1,z0=30*TILE+.6,z1=33*TILE-.6;
    const path=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,1.4),stdMat('parkpath',{color:'#c9bfae',roughness:.95}));path.rotation.x=-Math.PI/2;path.position.set((x0+x1)/2,.012,(z0+z1)/2);P.add(path);
    for(let x=x0+2;x<x1-1;x+=5)bench(P,x,z0+.6,Math.PI);for(let x=x0+4.5;x<x1-1;x+=5){shrub(P,x,z1-.8,1.1);shrub(P,x+1,z1-.6,.8)}
    const slide=new THREE.Group();slide.position.set(x1-3,0,(z0+z1)/2);P.add(slide);B(1.2,.08,1.2,stdMat('slideR',{color:'#d8392b'}),0,1.3,0,0,slide);for(const sx of[-.55,.55])for(const sz of[-.55,.55])B(.07,1.3,.07,metal,sx,.65,sz,0,slide);
    const ch=B(.5,.05,2.4,stdMat('slideY',{color:'#f2c230'}),0,.7,1.6,0,slide);ch.rotation.x=.55;
    u.dress.push({t:60,on:P})}
  /* little free library + picnic corner in the middle of the mart block */
  {const P=new THREE.Group();g.add(P);const cx=181*TILE,cz=14*TILE+1;B(.08,1.2,.08,wood,cx-3,.6,cz,0,P);const box=B(.7,.6,.45,stdMat('lflRed',{color:'#b8323a',roughness:.6}),cx-3,1.5,cz,0,P);
    const roofL=new THREE.Mesh(new THREE.ConeGeometry(.55,.35,4),stdMat('lflRoof',{color:'#3d3b39'}));roofL.rotation.y=Math.PI/4;roofL.position.set(cx-3,1.98,cz);P.add(roofL);
    const lc=signCanvas(['LITTLE FREE','LIBRARY · TAKE ONE'],{bg:'#f4f0e6',fg:'#b8323a',fg2:'#1d1d1d',w:256,h:160});const lab=new THREE.Mesh(new THREE.PlaneGeometry(.6,.36),stdMat('lflLab',{map:ctex(lc)}));lab.position.set(cx-3,1.5,cz+.231);P.add(lab);
    B(1.9,.06,.8,wood,cx+1,.75,cz,0,P);for(const dz of[-.65,.65])B(1.9,.05,.28,wood,cx+1,.45,cz+dz,0,P);for(const sx of[-.8,.8])B(.06,.75,.6,wood,cx+1+sx,.37,cz,0,P);
    for(const px of[cx-6,cx+5]){B(1.2,.45,1.2,wood,px,.22,cz,0,P);for(let k=0;k<5;k++){const f=new THREE.Mesh(new THREE.SphereGeometry(.13,6,4),stdMat('flw'+k,{color:['#e8395b','#ffd23f','#c58cff','#ff8c2a','#ffffff'][k]}));f.position.set(px-.35+k*.18,.55,cz+(k%2?.2:-.2));P.add(f)}}
    u.dress.push({t:70,on:P})}
  /* community garden on the empty strip along River Rd by the docks */
  {const P=new THREE.Group();g.add(P);const x0=154*TILE+.8,x1=159*TILE-.8;for(let z=67*TILE;z<77*TILE;z+=3.2){B(x1-x0,.4,1.3,wood,(x0+x1)/2,.2,z+.8,0,P);const top=B(x1-x0-.12,.05,1.18,soil,(x0+x1)/2,.41,z+.8,0,P);top.castShadow=false;
      for(let x=x0+.5;x<x1-.3;x+=.7){const pl=new THREE.Mesh(new THREE.IcosahedronGeometry(.2,0),leaf);pl.position.set(x,.58,z+.8);P.add(pl)}}
    const gc=signCanvas(['RIVERSIDE GROWS','COMMUNITY GARDEN · PICK WHAT YOU NEED'],{bg:'#2c7a3b',fg:'#fff',fg2:'#ffd23f',w:768,h:256});for(const sx of[-1,1])B(.08,1.6,.08,wood,(x0+x1)/2+sx*1.1,.8,66*TILE+.9,0,P);
    const gs=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.8),stdMat('garsign',{map:ctex(gc),side:THREE.DoubleSide}));gs.position.set((x0+x1)/2,1.45,66*TILE+.9);P.add(gs);u.dress.push({t:80,on:P})}
  /* the block party on Benny's lot: tables with cloths, chairs, grills, bounce house, balloons, string lights */
  {const P=new THREE.Group();g.add(P);const{x0,z0,x1,z1}=PARTY;const cloth=[stdMat('cloth1',{color:'#e8395b'}),stdMat('cloth2',{color:'#3fa7e8'}),stdMat('cloth3',{color:'#f4f1ea'})];
    for(const[i,z]of[[0,31.1],[1,34.9]]){B(6,.06,1,cloth[i],428,.78,z,0,P);B(6.05,.3,1.02,cloth[i],428,.62,z,0,P);for(let x=425.6;x<431;x+=1.1)for(const dz of[-.85,.85]){B(.42,.05,.42,stdMat('chair',{color:'#2a2d31'}),x,.45,z+dz,0,P);B(.42,.4,.04,stdMat('chair',{}),x,.68,z+dz+Math.sign(dz)*.2,0,P)}}
    const sb=new THREE.Group();g.add(sb);const save=[];/* reuse world.js's grill and bounce house */
    {const BB=newB(ws,sb,'hub',{x0:209,z0:14,x1:218,z1:18},0,91);W_.bounce(BB,420.6,31.6);W_.grill(BB,434.5,30.5);W_.grill(BB,434.5,35);W_.finish(BB,{bare:true,before:q=>{if(q.tuf)q.tuf.length=0;if(q.flw)q.flw.length=0}});P.add(sb)}
    const bal=['#e8395b','#ffd23f','#3fa7e8','#7fdc6e','#c58cff'];for(let k=0;k<10;k++){const m=new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),stdMat('bal'+k%5,{color:bal[k%5],roughness:.3}));m.scale.y=1.2;m.position.set(424+k*.9,2.3+(k%3)*.3,29.2);P.add(m)}
    const bulb=basicGlow('pbulb','#ffd890',4),wire=stdMat('wireOW',{color:'#1a1a1a'});for(const z of[30,33,36]){const pts=[];for(let i=0;i<=12;i++){const t=i/12;pts.push(new THREE.Vector3(x0+t*(x1-x0),3.6-Math.sin(t*Math.PI)*.6,z))}
      P.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),20,.01,4),wire));for(let i=1;i<12;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.06,6,4),bulb);b.position.copy(pts[i]).y-=.08;P.add(b)}}
    for(const x of[x0,x1])for(const z of[30,33,36]){const pole=B(.06,3.7,.06,metal,x,1.85,z,0,P)}
    u.dress.push({t:90,on:P})}
  /* moving truck + boxes + welcome banner: placed at the block whose renovation is happening now (see placeTruck) */
  {const T=new THREE.Group();T.visible=false;T.userData.noCompact=true;g.add(T);ws.truck=T;const van=C.makeVehicle&&C.makeVehicle('workvan','#f4f1ea',{lod:1});if(van){van.traverse(m=>{if(m.isMesh)m.userData.noBatch=true});T.add(van);T.userData.van=van}
    const card=stdMat('boxes',{color:'#b48a58',roughness:.9});for(let k=0;k<6;k++)B(.55+(k%3)*.1,.4+(k%2)*.12,.45,card,-1.3+(k%3)*.6,.22+Math.floor(k/3)*.45,2.0,k*.3,T);
    const rp=B(.9,.05,2.2,stdMat('ramp',{color:'#8a8f93',metalness:.6}),-3.2,.35,0,0,T);rp.rotation.z=.3;
    const wc=signCanvas(['WELCOME TO','THE NEIGHBORHOOD!'],{bg:'#ffd23f',fg:'#b8323a',fg2:'#2b4a6b',w:768,h:256});const wb=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.85),stdMat('welcome',{map:ctex(wc),side:THREE.DoubleSide}));wb.position.set(.5,1.6,3.1);T.add(wb);T.userData.banner=wb}}});
/* the moving truck parks in front of the rowhouse block whose trust is closest to the renovation front (local trust 45-70) */
function placeTruck(ws){const T=ws.truck,col=ws.truckCol;if(!T)return;let best=null,bd=1e9;
  for(const b of ws.rowBlocks||blocksOf(ws.def,'r')){if(!b.facing)continue;const cx=(b.x0+b.x1+1)*TILE/2,cz=(b.z0+b.z1+1)*TILE/2,blk=blockOf(cx,cz);if(blk<0)continue;const t=ws.blockT[blk];if(t<45||t>=70)continue;const d=Math.abs(t-55)+((b.x0*7+b.z0)%5)*.1;if(d<bd){bd=d;best=b}}
  if(!best){T.visible=false;if(col){col.x0=col.z0=col.x1=col.z1=-1e4;col.off=true}return}
  const s=best.facing==='+z'?1:-1,cx=(best.x0+best.x1+1)*TILE/2+2,zf=s>0?(best.z1+1)*TILE:best.z0*TILE,z=zf+s*(TILE+1.8);/* kerb lane in front of the block */
  T.position.set(cx,0,z);T.rotation.y=s>0?0:Math.PI;T.visible=true;if(T.userData.van)T.userData.van.position.set(0,0,0);
  if(col){Object.assign(col,{x0:cx-2.5,x1:cx+2.5,z0:z-1.15,z1:z+1.15,off:false})}}
/* ================= dressing ================= */
/* ---- per-block trust: Riverside improves outward from the places the dads helped (job sites won, the church, the community center) ---- */
/* 25 blocks between the street lines (RX 156/172/188/204/220, RZ 6/20/34/48/62); id = col*5+row, -1 outside Riverside */
const RB_X=[152,172,188,204,220,232],RB_Z=[0,20,34,48,62,80];
function blockOf(x,z){const t=x/TILE,u=z/TILE;if(t<152)return -1;let c=0,r=0;while(c<4&&t>=RB_X[c+1])c++;while(r<4&&u>=RB_Z[r+1])r++;return c*5+r}
function blockCentre(b){const c=Math.floor(b/5),r=b%5;return{x:(RB_X[c]+RB_X[c+1])*TILE/2,z:(RB_Z[r]+RB_Z[r+1])*TILE/2}}
function trustSources(ws){const def=ws.def,src=[];const add=(x,z,w)=>src.push({x,z,w:w||1});
  const ch=def.buildings.find(b=>b.id==='church'),cc=def.buildings.find(b=>b.id==='center');
  if(cc)add((cc.x0+cc.x1+1)*TILE/2,(cc.z0+cc.z1+1)*TILE/2,1);if(ch)add((ch.x0+ch.x1+1)*TILE/2,(ch.z0+ch.z1+1)*TILE/2,.8);
  for(const id of (C.riverDone?C.riverDone():[])){const st=def.sites[id];if(st)add((st.box.x0+st.box.x1)/2,(st.box.z0+st.box.z1)/2,1.3)}
  return src}
/* local trust at a point: the region's trust plus a bonus near sources, the far blocks lagging behind until trust is high */
function localTrust(ws,x,z,T){if(T>=99.5)return 100;if(T<=0)return 0;const src=ws.tsrc||(ws.tsrc=trustSources(ws));let best=1e9;for(const q of src)best=Math.min(best,Math.hypot(q.x-x,q.z-z)/q.w);
  const B=Math.min(25,T*.8),k=best<150?1-best/150:-(best-150)/150*(1-T/100);return Math.max(0,Math.min(100,T+B*k))}
OW.blockTrust=(x,z)=>{const ws=WS;if(!ws)return 0;const T=ws.trust==null?0:ws.trust;const b=blockOf(x,z);if(b<0)return T;return ws.blockT?ws.blockT[b]:localTrust(ws,x,z,T)};
OW.snapTrust=()=>{BTU.uBT.value.set(BTT)};
OW.blocks=()=>{const ws=WS;if(!ws||!ws.blockT)return[];return ws.blockT.map((t,b)=>({b,...blockCentre(b),t}))};
function dressUnit(u,t){const bt=WS&&WS.blockT;for(const d of u.dress){const tt=d.blk!=null&&d.blk>=0&&bt?bt[d.blk]:t;const on=tt>=d.t&&(d.until==null||tt<d.until);if(d.on)d.on.visible=on;if(d.off)d.off.visible=!on}}
OW.dress=(t,force)=>{const ws=WS;if(!ws)return null;t=+t||0;const G=HT.WorldGen;const tier=G&&G.tierOf?G.tierOf(t):0;
  if(!force&&ws.trust===t)return tier;ws.trust=t;ws.tier=tier;ws.tsrc=null;
  ws.blockT=[];for(let b=0;b<25;b++){const c=blockCentre(b);ws.blockT[b]=localTrust(ws,c.x,c.z,t)}
  setBT(ws,!!ws.btEase);ws.btEase=true;
  placeTruck(ws);{const on=ws.blockT[blockOf((PARTY.x0+PARTY.x1)/2,(PARTY.z0+PARTY.z1)/2)]>=90;for(const c of ws.toggleCols||[]){if(on)Object.assign(c,{x0:c.home.x0,z0:c.home.z0,x1:c.home.x1,z1:c.home.z1,off:false});else Object.assign(c,{x0:-1e4,z0:-1e4,x1:-1e4,z1:-1e4,off:true})}}
  for(const u of ws.units)if(u.built)dressUnit(u,t);if(ws.onDress)try{ws.onDress(t)}catch(e){console.warn(e)}return tier};
OW.sourcesChanged=()=>{if(WS){WS.tsrc=null;const t=WS.trust;WS.trust=null;OW.dress(t)}};

/* ================= per frame ================= */
const _v=new THREE.Vector3(),_b=new THREE.Box3();
OW.update=(camera,dt)=>{const ws=WS;if(!ws||!ws.lvl.group.parent)return;{const now=performance.now();dt=dt||Math.min(.1,(now-(ws.lastT||now))/1000)||1/30;ws.lastT=now}ws.t+=dt;
  const fogFar=C.fogFar?C.fogFar():200;const R=Math.min(ws.R||(ws.R=200),fogFar+8);ws.MID=ws.MID||(ws.q==='high'?160:110);ws.DETAIL=ws.DETAIL||(ws.q==='high'?110:65);ws.BLOD=ws.BLOD||(ws.q==='high'?110:ws.q==='low'?45:60);ws.TUFT=ws.TUFT||(ws.q==='high'?60:36);camera.updateMatrixWorld();ws.pm.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);ws.frustum.setFromProjectionMatrix(ws.pm);
  const cx=camera.position.x,cz=camera.position.z;
  if(ws.active&&stepUnit(ws.active,ws.SLICE||6))ws.active=null;
  for(const u of ws.units){const d=dist2(u.box,cx,cz);
    if(!u.built){if(d<R+40&&!ws.active){startUnit(u);if(!stepUnit(u,ws.SLICE||6))ws.active=u}else continue}
    if(!u.ready){u.group.visible=false;continue}
    if(u.mg){const far=d>ws.BLOD;if(far!==u.far){u.far=far;u.mg.visible=!far;if(u.shell)u.shell.visible=far}}
    let vis=u.sp&&u.sp.always?true:d<R;if(vis&&!(u.sp&&u.sp.always)){_b.min.set(u.box.x0,-6,u.box.z0);_b.max.set(u.box.x1,u.box.y1||20,u.box.z1);vis=ws.frustum.intersectsBox(_b)}
    u.visible=vis;u.group.visible=vis;
    if(vis&&u.detail){const near=d<ws.DETAIL+60;if(near||near!==u.near){u.near=near;for(let i=0;i<u.detail.length;i++){const sp=u.detailS[i];u.detail[i].visible=near&&Math.hypot(sp.center.x-cx,sp.center.z-cz)-sp.radius<ws.DETAIL}
        for(let i=0;i<u.tufts.length;i++){const sp=u.tuftS[i];u.tufts[i].visible=near&&ws.q!=='low'&&Math.hypot(sp.center.x-cx,sp.center.z-cz)-sp.radius<ws.TUFT}}
      const mn=d<ws.MID;if(mn!==u.mnear){u.mnear=mn;for(const m of u.mid)m.visible=mn;if(u.dressRoot)u.dressRoot.visible=mn}}}
  easeBT(dt);
  for(const w of ws.water){w.nm.offset.x=Math.sin(ws.t*.05)*.02;w.nm.offset.y-=dt*.018}
  /* nearby raycast proxies, every 0.5 s or after moving 8 m */
  const p=C.player?C.player():camera.position;ws.solT=(ws.solT||0)-dt;
  if(ws.solT<=0||!ws.solAt||Math.hypot(p.x-ws.solAt.x,p.z-ws.solAt.z)>8){ws.solT=.5;ws.solAt={x:p.x,z:p.z};refreshSolids(ws,p.x,p.z)}};
function refreshSolids(ws,x,z){const lvl=ws.lvl,want=new Set();for(const c of lvl.cnear(x,z,80))if(c.ph>0&&!c.off)want.add(proxyOf(c));
  const mine=ws.mine||(ws.mine=new Set());let changed=false;
  for(let i=lvl.solids.length-1;i>=0;i--){const m=lvl.solids[i];if(mine.has(m)&&!want.has(m)){lvl.solids.splice(i,1);mine.delete(m);changed=true}}
  for(const m of want)if(!mine.has(m)){lvl.solids.push(m);mine.add(m);changed=true}
  if(changed&&C.onSolids)C.onSolids()}
OW.buildAll=()=>{const ws=WS;if(!ws)return 0;let n=0;if(ws.active){stepUnit(ws.active,1e9);ws.active=null}for(const u of ws.units)if(!u.built){buildUnit(u);n++}return n};
OW.quality=q=>{const ws=WS;if(!ws)return;ws.q=q;if(ws.gB)ws.gB.q=treeQ(q);const W_=HW();if(W_&&W_.quality)for(const u of ws.units)if(u.B)W_.quality(q,u.B);ws.R=q==='low'?160:q==='high'?240:200;ws.DETAIL=q==='low'?50:q==='high'?110:65;ws.BLOD=q==='low'?45:q==='high'?110:60;ws.MID=q==='low'?80:q==='high'?160:110;ws.TUFT=q==='high'?60:36;for(const u of ws.units){u.near=null;u.tnear=null;u.mnear=null;u.far=null}};

/* ================= cache reuse, bridge, regions ================= */
OW.reset=lvl=>{const ws=lvl.ow;WS=ws;lvl.colliders.length=lvl.nBaseCols;
  for(const o of [...lvl.group.children])if(!ws.own.has(o)&&!(o.userData&&o.userData.wkey==='batch'))lvl.group.remove(o);   /* index.html's static batcher merges parked cars once per level: keep its meshes */
  if(ws.mine)ws.mine.clear();lvl.solids.length=lvl.nBaseSolids;ws.solAt=null;
  if(lvl.cars&&ws.cars0)lvl.cars=lvl.cars.filter(c=>ws.cars0.includes(c));
  if(ws.traffic){for(const t of ws.traffic.cars)ws.traffic.g.remove(t.v);ws.traffic.cars.length=0}
  lvl.items=[];lvl.stashes=[];lvl.spawns=[];lvl.ammo=[];lvl.waveSpawns=[];lvl.boss=null;lvl.exit=null};
OW.openBridge=()=>{const ws=WS;if(!ws)return false;const def=ws.def,G=HT.WorldGen;const was=def.bridgeOpen;if(G&&G.openBridge)G.openBridge(def);
  for(const b of def.barricade){ws.lvl.g[b.tz][b.tx]=',';ws.G[b.tz][b.tx]=','}
  for(const c of ws.barricadeCols){c.x0=c.x1=-1e4;c.z0=c.z1=-1e4;c.off=true}
  if(ws.barricadeGroup)ws.barricadeGroup.visible=false;ws.roads=null;return!was};
OW.roads=()=>{const ws=WS;if(!ws)return null;if(!ws.roads&&HT.Roads)try{ws.roads=HT.Roads.build(ws.def)}catch(e){ws.roads=null}return ws.roads};
OW.gps=(from,to)=>{const ws=WS;if(!ws||!HT.Roads||!HT.Roads.gps)return null;try{return HT.Roads.gps(ws.def,from,to)}catch(e){console.warn('gps failed',e);return null}};
OW.regionAt=(x,z)=>{const G=HT.WorldGen;return G&&G.regionAt?G.regionAt(x,z):'maple'};
OW.stats=()=>{const ws=WS;if(!ws)return null;return{units:ws.units.length,built:ws.built,visible:ws.units.filter(u=>u.visible).length,chunks:ws.chunks.map(u=>({cx:u.ch.cx,cz:u.ch.cz,visible:u.visible,built:u.built,ms:u.ms&&Math.round(u.ms)})),
  buildMs:Math.round(ws.tBuild||0),maxStepMs:+(ws.maxStep||0).toFixed(1),colliders:ws.lvl.colliders.length,nStatic:ws.lvl.nStatic,solids:ws.lvl.solids.length,tier:ws.tier,trust:ws.trust}};
OW.units=()=>WS?WS.units:[];
OW.events=()=>{const ws=WS;if(!ws)return null;const T=ws.truck,pb=blockOf((PARTY.x0+PARTY.x1)/2,(PARTY.z0+PARTY.z1)/2);return{truck:T&&T.visible?{x:T.position.x,z:T.position.z,yaw:T.rotation.y}:null,party:ws.blockT&&ws.blockT[pb]>=90?{x:(PARTY.x0+PARTY.x1)/2,z:(PARTY.z0+PARTY.z1)/2}:null}};
/* ================= ambient traffic (HT.Roads graph + HT.CarAI wander, HT.Vehicles LOD1) ================= */
/* a handful of cars near the player, spawned and removed out of view; they pause at intersections, yield to the player and to each other */
const TRAFFIC_TYPES=['sedan','hatch','suv','pickup','workvan','sedan'],TRAFFIC_COLS=['#b9c0c7','#8a2f2a','#2e4a6b','#d8d4c8','#3d4a3a','#6d7378','#7a5a3a','#c9b48a'];
OW.traffic=(dt,o)=>{const ws=WS,CA=HT.CarAI;if(!ws||!CA||!CA.wander||!C.makeVehicle)return;const G=OW.roads();if(!G)return;
  const T=ws.traffic||(ws.traffic={cars:[],g:null,G:null,t:0,seed:11});if(!T.g){T.g=new THREE.Group();T.g.name='traffic';ws.lvl.group.add(T.g);ws.own.add(T.g)}
  if(T.G!==G){for(const c of T.cars)T.g.remove(c.v);T.cars.length=0;T.G=G}
  const want=o.off?0:ws.q==='low'?3:ws.q==='high'?7:5,p=o.player,cam=o.camera,lvl=ws.lvl;T.t-=dt;
  const seen=(x,z)=>{if(!cam)return false;_b.min.set(x-3,0,z-3);_b.max.set(x+3,2.5,z+3);return ws.frustum.intersectsBox(_b)&&Math.hypot(x-cam.position.x,z-cam.position.z)<150};
  /* spawn */
  if(T.cars.length<want&&T.t<=0){T.t=.7;const cand=G.nodes.filter(n=>{const d=Math.hypot(n.x-p.x,n.z-p.z);return d>45&&d<130&&n.e.length&&!seen(n.x,n.z)&&!T.cars.some(c=>Math.hypot(c.c.x-n.x,c.c.z-n.z)<20)});
    if(cand.length){T.seed=(T.seed*1103515245+12345)&0x7fffffff;const n=cand[T.seed%cand.length],e=n.e[T.seed%n.e.length],k=T.seed>>3;
      const v=C.makeVehicle(TRAFFIC_TYPES[k%TRAFFIC_TYPES.length],TRAFFIC_COLS[(k>>3)%TRAFFIC_COLS.length],{lod:1});
      if(v){v.traverse(m=>{if(m.isMesh)m.userData.noBatch=true});const yaw=Math.atan2(-e.dir[0],-e.dir[1]);const c=CA.make(v.userData.type||'sedan',{x:n.x-e.dir[1]*1.5,z:n.z+e.dir[0]*1.5,yaw});
        CA.wander(c,G,{max:10+(k%4),seed:k});T.g.add(v);T.cars.push({c,v,pause:0,paused:-1})}}}
  const statics=(q,r)=>{for(const k of lvl.cnear(q.x,q.z,r+3))if(k.ph!==undefined&&q.x+r>k.x0&&q.x-r<k.x1&&q.z+r>k.z0&&q.z-r<k.z1){const ox1=q.x+r-k.x0,ox2=k.x1-(q.x-r),oz1=q.z+r-k.z0,oz2=k.z1-(q.z-r);if(Math.min(ox1,ox2)<Math.min(oz1,oz2))q.x+=ox1<ox2?-ox1:ox2;else q.z+=oz1<oz2?-oz1:oz2}};
  for(let i=T.cars.length-1;i>=0;i--){const t=T.cars[i],c=t.c,ai=c.ai;const fx=-Math.sin(c.yaw),fz=-Math.cos(c.yaw);
    /* yield: something within 10 m ahead in the lane (the player, his car, another car) */
    const ahead=(x,z,r)=>{const dx=x-c.x,dz=z-c.z,f=dx*fx+dz*fz,s=Math.abs(dx*-fz+dz*fx);return f>0&&f<r&&s<2.2};
    let block=ahead(p.x,p.z,10)||(o.car&&ahead(o.car.x,o.car.z,11))||T.cars.some(u=>u!==t&&ahead(u.c.x,u.c.z,8));
    /* pause at intersections (3+ roads) before crossing */
    const nn=ai&&ai.next>=0&&G.nodes[ai.next];if(nn&&nn.e.length>=3&&t.paused!==ai.next&&Math.hypot(nn.x-c.x,nn.z-c.z)<8.5){t.pause=1.1;t.paused=ai.next}
    if(t.pause>0){t.pause-=dt;block=true}
    CA.step(c,dt,{G,collide:statics,blocked:()=>block,canSnap:()=>!seen(c.x,c.z)});
    t.v.position.set(c.x,HW()?HW().groundY(lvl,c.x,c.z):0,c.z);t.v.rotation.y=c.yaw+Math.PI/2;
    const VM=HT.Vehicles;if(VM&&VM.update)try{VM.update(t.v,{speed:c.spd,steer:c.steer||0,braking:block,headlights:false,dt})}catch(e){}
    /* dynamic collider so the player's car and the dad bump into it */
    if(!t.col){t.col={x0:0,z0:0,x1:0,z1:0,ph:1.5,k:'traffic'};lvl.colliders.push(t.col)}const a=Math.abs(fx),b=Math.abs(fz),hx=a*2.2+b*.95,hz=b*2.2+a*.95;Object.assign(t.col,{x0:c.x-hx,x1:c.x+hx,z0:c.z-hz,z1:c.z+hz});
    if(Math.hypot(c.x-p.x,c.z-p.z)>170&&!seen(c.x,c.z)||o.off){T.g.remove(t.v);const ci=lvl.colliders.indexOf(t.col);if(ci>=lvl.nStatic)lvl.colliders.splice(ci,1);T.cars.splice(i,1)}}};
OW.trafficCars=()=>WS&&WS.traffic?WS.traffic.cars.map(t=>({x:t.c.x,z:t.c.z,spd:t.c.spd,type:t.c.type})):[];
/* ================= Riverside neighbours (HT.People 'neighbour' pool on HT.WorldGen.neighbourSlots porch anchors) ================= */
/* OW.neighbours(dt,{player,camera,trust,river,shots:[{x,z}]}) once per frame. More porches fill as Riverside trust rises (none at tier 0, up to
   NB_CAP within NB_R m of the player). Models load on demand, only here. Not targets: no hitboxes, never in solids or ray targets.
   OW.neighbourCower(x,z,r): everyone within r m of a gunshot goes in their front door and stays in until it has been quiet a while. */
const NB_CAP=10,NB_R=55;
function nbBench(){if(MC.nbBench)return MC.nbBench;const g=new THREE.BoxGeometry(.5,.06,.46);g.translate(0,.42,0);const parts=[g];
  for(const[x,z]of[[-.21,-.19],[.21,-.19],[-.21,.19],[.21,.19]]){const l=new THREE.BoxGeometry(.04,.42,.04);l.translate(x,.21,z);parts.push(l)}
  const b=new THREE.BoxGeometry(.5,.42,.04);b.translate(0,.66,-.22);parts.push(b);
  return MC.nbBench={geo:nbMerge(parts),mat:stdMat('nbbench',{color:'#c9c2b2',roughness:.8})}}
/* merge simple geometries (position + normal) into one draw */
function nbMerge(parts){const P=[],Nn=[];for(const g0 of parts){const g=g0.index?g0.toNonIndexed():g0;P.push(...g.attributes.position.array);Nn.push(...g.attributes.normal.array)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3));g.computeBoundingSphere();return g}
function nbBike(){if(MC.nbBike)return MC.nbBike;const parts=[];
  for(const z of[-.5,.5]){const w=new THREE.TorusGeometry(.3,.025,6,18);w.rotateY(Math.PI/2);w.translate(0,.32,z);parts.push(w)}
  const bar=(a,b)=>{const d=new THREE.Vector3().subVectors(b,a),c=new THREE.CylinderGeometry(.02,.02,d.length(),5);c.translate(0,d.length()/2,0);
    c.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize())));c.translate(a.x,a.y,a.z);parts.push(c)};
  const V=(y,z)=>new THREE.Vector3(0,y,z);bar(V(.32,-.5),V(.62,-.1));bar(V(.32,-.5),V(.32,0));bar(V(.32,0),V(.62,-.1));bar(V(.62,-.1),V(.66,.38));bar(V(.32,.5),V(.72,.38));bar(V(.32,0),V(.72,-.12));
  const h=new THREE.CylinderGeometry(.018,.018,.5,5);h.rotateZ(Math.PI/2);h.translate(0,.74,.38);parts.push(h);
  return MC.nbBike={geo:nbMerge(parts),mat:stdMat('nbbike',{color:'#c8262b',roughness:.45,metalness:.3})}}
function nbDrop(N,n){if(n.d){N.g.remove(n.d.root);n.d=null}if(n.prop){N.g.remove(n.prop);n.prop=null}}
OW.neighbours=(dt,o)=>{const ws=WS,G=HT.WorldGen,PP=HT.People;if(!ws||!G||!G.neighbourSlots||!PP||!PP.ok||!PP.neighbourKeys)return;o=o||{};
  const N=ws.nb||(ws.nb={g:null,list:[],t:0,quiet:99,want:0,order:null,fresh:true});
  if(!N.g){N.g=new THREE.Group();N.g.name='neighbours';ws.lvl.group.add(N.g);ws.own.add(N.g)}
  const p=o.player||(o.camera&&o.camera.position);if(!p)return;const t=+o.trust||0;
  for(const s of(o.shots||[]))OW.neighbourCower(s.x,s.z,s.r||35);
  N.quiet+=dt;N.t-=dt;
  /* re-plan once a second: which porch anchors should be occupied */
  if(N.t<=0){N.t=1;const slots=o.river===false||o.off?[]:G.neighbourSlots(ws.def,t,p.x,p.z,NB_CAP,NB_R);const want=new Set(slots);
    /* load only as many models as there are porches to fill (shuffled once, so different saves see different faces first) */
    if(!N.order){N.order=PP.neighbourKeys.slice();for(let i=N.order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[N.order[i],N.order[j]]=[N.order[j],N.order[i]]}}
    const need=Math.min(N.order.length,slots.length+2);if(need>N.want){N.want=need;PP.preload(N.order.slice(0,need).concat(G.tierOf(t)>=3?['nb_kid']:[])).catch(()=>{})}
    const seen=(x,z)=>{_b.min.set(x-.6,0,z-.6);_b.max.set(x+.6,2,z+.6);return o.camera&&ws.frustum.intersectsBox(_b)&&Math.hypot(x-o.camera.position.x,z-o.camera.position.z)<60};
    for(let i=N.list.length-1;i>=0;i--){const n=N.list[i];if(!want.has(n.slot)&&!(n.d&&seen(n.d.root.position.x,n.d.root.position.z))){nbDrop(N,n);N.list.splice(i,1)}}
    const tier=G.tierOf(t);
    for(const sl of slots){if(N.list.some(n=>n.slot===sl))continue;if(N.list.length>=NB_CAP)break;
      /* porch anchors face the street: stand a little toward it, facing it */
      const fx=sl.face[0],fz=sl.face[1],sx=fz,sz=-fx,k=sl.order;
      const kidNow=tier>=3&&!N.list.some(q=>q.kind==='bike'||q.kind==='chalk');/* one kid out front at the high tiers: chalk or a bike */
      const kind=kidNow?(k%2?'bike':'chalk'):k%3===0?'sit':k%3===1?'sidewalk':'stand';
      const off=kind==='sit'?.2:kind==='stand'?1.4:2.2,side=kind==='sit'?0:(k%2?1:-1)*(1.2+(k*7)%3*.2);/* beside the stoop steps */
      /* stay off the road: the farthest candidate out front that is on a sidewalk tile (rowhouse stoops sit right on the street) */
      let px=sl.x+fx*off+sx*side,pz=sl.z+fz*off+sz*side;if(kind!=='sit'){const onWalk=(x,z)=>{const tx=Math.floor(x/TILE),tz=Math.floor(z/TILE);return ws.K&&ws.K[tz*ws.def.W+tx]==='walk'};let found=false;
        for(const o2 of[off,.8,.3])for(const s2 of[side,-side,side*1.4,-side*1.4]){if(found)break;const qx=sl.x+fx*o2+sx*s2,qz=sl.z+fz*o2+sz*s2;if(onWalk(qx,qz)){px=qx;pz=qz;found=true}}if(!found)continue}
      const n={slot:sl,kind,home:{x:sl.x,z:sl.z},x:px,z:pz,ry:Math.atan2(fx,fz),d:null,prop:null,state:'out',t:Math.random()*4,waveT:0};
      if(seen(n.x,n.z)&&!N.fresh&&Math.hypot(n.x-p.x,n.z-p.z)<35)continue;/* pop in out of view (or far away, or on arriving in Riverside) */N.list.push(n)}
    N.fresh=!slots.length}
  /* build missing models as their files arrive; animate */
  const cam=o.camera?o.camera.position:p;
  for(const n of N.list){if(!n.d){const kid=n.kind==='bike'||n.kind==='chalk';const v=kid?'nb_kid':null;if(kid&&!PP.has('nb_kid'))continue;
      let d=null;try{d=PP.make('neighbour',v?{variant:v}:{})}catch(e){console.warn('neighbour: make failed',e);d=null}/* nobody twice on the same street (one kid is enough): redraw from the bag a few times */
      for(let tries=0;d&&!kid&&tries<4&&N.list.some(q=>q.d&&q.d.rb.key===d.rb.key);tries++){const li=PP.live.indexOf(d);if(li>=0)PP.live.splice(li,1);try{d=PP.make('neighbour')}catch(e){d=null}}if(!d)continue;
      if(!kid&&d.rb.key==='nb_kid'&&n.kind==='sit')n.kind='stand';
      d.root.traverse(m=>{if(m.isMesh)m.userData.noBatch=true});n.d=d;const y=HW()?HW().groundY(ws.lvl,n.x,n.z):0;d.root.position.set(n.x,y,n.z);d.root.rotation.y=n.ry;N.g.add(d.root);
      if(n.kind==='sit'){const B=nbBench(),m=new THREE.Mesh(B.geo,B.mat);m.castShadow=true;m.position.set(n.x,y,n.z);m.rotation.y=n.ry;m.position.x-=Math.sin(n.ry)*.12;m.position.z-=Math.cos(n.ry)*.12;n.prop=m;N.g.add(m)}
      if(n.kind==='bike'){const B=nbBike(),m=new THREE.Mesh(B.geo,B.mat);m.castShadow=true;const sx=Math.cos(n.ry),sz=-Math.sin(n.ry);m.position.set(n.x+sx*.55,y,n.z+sz*.55);m.rotation.set(0,n.ry+.4,.12);n.prop=m;N.g.add(m)}
      n.y=y}
    const d=n.d;if(!d)continue;const r=d.root,dist=Math.hypot(r.position.x-cam.x,r.position.z-cam.z);
    if(n.state==='in'){r.visible=false;if(N.quiet>25){n.state='out';r.position.set(n.x,n.y,n.z);r.rotation.y=n.ry;if(n.prop)n.prop.visible=true}continue}
    r.visible=dist<NB_R+15;if(n.prop)n.prop.visible=r.visible;if(!r.visible)continue;
    if(n.state==='going'){/* walk (briskly) to the front door, then go in */const dx=n.home.x-r.position.x,dz=n.home.z-r.position.z,l=Math.hypot(dx,dz);
      if(l<.35){n.state='in';r.visible=false;continue}const sp=Math.min(l,2.6*dt);r.position.x+=dx/l*sp;r.position.z+=dz/l*sp;r.rotation.y=Math.atan2(dx,dz);
      PP.pose(d,dt,{moving:true,aim:false,mode:'stand'});continue}
    /* friendly: turn toward the dad when he is close, wave now and then */
    let mode='stand';if(n.kind==='sit')mode='sit';else if(n.kind==='chalk')mode='crouch';
    if(mode==='stand'){const dx=p.x-r.position.x,dz=p.z-r.position.z,l=Math.hypot(dx,dz);const want=l<9?Math.atan2(dx,dz):n.ry;let da=((want-r.rotation.y+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;r.rotation.y+=da*Math.min(1,dt*3)}
    n.waveT-=dt;const near=Math.hypot(p.x-r.position.x,p.z-r.position.z);if(near<10&&n.waveT<=0&&mode!=='crouch'){n.waveT=8+Math.random()*6;if(PP.interact)PP.interact(d)}
    PP.pose(d,dt,{moving:false,aim:false,mode})}};
OW.neighbourCower=(x,z,r)=>{const N=WS&&WS.nb;if(!N)return 0;r=r||35;let k=0;N.quiet=0;
  for(const n of N.list){if(!n.d||n.state==='in')continue;const q=n.d.root.position;if(Math.hypot(q.x-x,q.z-z)<r){if(n.state!=='going')n.state='going';k++}}return k};
OW.neighbourList=()=>WS&&WS.nb?WS.nb.list.map(n=>({key:n.d&&n.d.rb.key,kind:n.kind,state:n.state,visible:!!(n.d&&n.d.root.visible),x:n.d?n.d.root.position.x:n.x,z:n.d?n.d.root.position.z:n.z,order:n.slot.order,dude:n.d})):[];
Object.defineProperty(OW,'state',{get:()=>WS});
HT.OpenWorld=OW;
})();
