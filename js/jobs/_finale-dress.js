/* =====================================================================
   EVERYBODY WAVES: the festival set (loaded by js/jobs/finale.js). One street, dressed for every stage of the day:
   setting up in the morning (frames up, canopies still folded, the stage a bare deck), the stalls opening while you work,
   the stage scaffold growing with the "Stage" bar during Hold the Street, and the evening: a golden-hour grade, string
   lights on sagging catenaries (instanced bulbs), paper lanterns, triangle bunting, a band on a real stage, grill smoke,
   kids' chalk, the bakery table, the bike library, the youth group van.
   Built the way Hands Off builds its market (js/jobs/arrest.js): plain parts merged by material into a few meshes per
   batch, one text atlas, shared geometry; bulbs and lanterns are InstancedMeshes; a handful of real point lights.
   FN.festSet(M, level, pct): level 0 morning, 1 midday, 'build' (the stage follows pct), 2 built, 3 evening.
   ===================================================================== */
(function(){'use strict';const FN=window.HT&&HT.Finale;if(!FN)return;const{A,G,W,hyp,clamp}=FN;const D=document;
const rr=(a,b)=>a+Math.random()*(b-a);
const R=()=>FN.res();
const own=(kind,x)=>{R()[kind].push(x);return x};
function stdMat(key,col,o){const r=R();r.mcache=r.mcache||{};if(r.mcache[key])return r.mcache[key];const a=A();return r.mcache[key]=own('mat',new a.THREE.MeshStandardMaterial(Object.assign({color:a.lin(col),roughness:.8,metalness:0},o||{})))}
function canvasTex(w,h,draw){const T=A().THREE,c=D.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);if(T.SRGBColorSpace)t.colorSpace=T.SRGBColorSpace;else if(T.sRGBEncoding)t.encoding=T.sRGBEncoding;t.anisotropy=4;return own('tex',t)}
/* merge parts by material: plain colours into ONE vertex-coloured mesh; textured/transparent parts keep a mesh per material */
function merge(parts,parent){const T=A().THREE,byMat=new Map();
  for(const p of parts){const g=p.geo.clone();if(p.uv){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,p.uv[0]+uv.getX(i)*(p.uv[2]-p.uv[0]),p.uv[1]+uv.getY(i)*(p.uv[3]-p.uv[1]))}
    g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(p.x||0,p.y||0,p.z||0),new T.Quaternion().setFromEuler(new T.Euler(p.rx||0,p.ry||0,p.rz||0,'YXZ')),new T.Vector3(p.sx||1,p.sy||1,p.sz||1)));
    const gi=g.index?g.toNonIndexed():g;if(gi!==g)g.dispose();const plain=!p.mat.map&&!p.mat.transparent&&p.mat.side!==T.DoubleSide&&!p.mat.emissiveMap&&!p.glow;
    if(plain){const c=p.mat.color,col=new Float32Array(gi.attributes.position.count*3);for(let i=0;i<col.length;i+=3){col[i]=c.r;col[i+1]=c.g;col[i+2]=c.b}gi.setAttribute('color',new T.BufferAttribute(col,3))}
    const key=plain?'vc':p.mat;(byMat.get(key)||byMat.set(key,[]).get(key)).push(gi)}
  const out=[];for(const[k,gs]of byMat){let n=0;for(const g of gs)n+=g.attributes.position.count;const vc=k==='vc';const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2),C=vc?new Float32Array(n*3):null;let i=0;
    for(const g of gs){P.set(g.attributes.position.array,i*3);if(g.attributes.normal)N.set(g.attributes.normal.array,i*3);if(g.attributes.uv)U.set(g.attributes.uv.array,i*2);if(C)C.set(g.attributes.color.array,i*3);i+=g.attributes.position.count;g.dispose()}
    const bg=own('geo',new T.BufferGeometry());bg.setAttribute('position',new T.BufferAttribute(P,3));bg.setAttribute('normal',new T.BufferAttribute(N,3));bg.setAttribute('uv',new T.BufferAttribute(U,2));if(C)bg.setAttribute('color',new T.BufferAttribute(C,3));bg.computeBoundingSphere();
    const m=vc?stdMat('vc','#ffffff',{vertexColors:true,roughness:.82,metalness:.04}):k;const mesh=new T.Mesh(bg,m);mesh.castShadow=!m.transparent&&parts.length<4000;mesh.receiveShadow=true;parent.add(mesh);out.push(mesh)}
  return out}
let GEO=null;function geos(){const r=R();if(r.fgeo)return r.fgeo;const T=A().THREE;const g=(x)=>own('geo',x);
  return r.fgeo={box:g(new T.BoxGeometry(1,1,1)),cyl:g(new T.CylinderGeometry(1,1,1,12)),cyl6:g(new T.CylinderGeometry(1,1,1,6)),sph:g(new T.SphereGeometry(1,10,8)),plane:g(new T.PlaneGeometry(1,1)),
    tri:(()=>{const t=g(new T.BufferGeometry());t.setAttribute('position',new T.BufferAttribute(new Float32Array([-.13,0,0,.13,0,0,0,-.28,0]),3));t.setAttribute('normal',new T.BufferAttribute(new Float32Array([0,0,1,0,0,1,0,0,1]),3));t.setAttribute('uv',new T.BufferAttribute(new Float32Array([0,1,1,1,.5,0]),2));return t})()}}
function mats(){const r=R();if(r.fmats)return r.fmats;const T=A().THREE;const s=(k,c,o)=>stdMat(k,c,o);
  const stripes=(a,b)=>canvasTex(128,64,(g,W_,H_)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?b:a;g.fillRect(i*16,0,16,H_)}g.fillStyle='rgba(0,0,0,.06)';for(let i=0;i<8;i++)g.fillRect(i*16+15,0,1,H_)});
  return r.fmats={wood:s('wood','#8a6440',{roughness:.9}),woodD:s('woodD','#5e4128',{roughness:.9}),crate:s('crate','#b48a58',{roughness:.95}),metal:s('metal','#b9bec4',{roughness:.4,metalness:.6}),
    dark:s('dark','#26282b',{roughness:.6}),black:s('black','#141518',{roughness:.5}),white:s('white','#f2efe6'),deck:s('deck','#6b4f3a',{roughness:.85}),truss:s('truss','#9aa0a6',{roughness:.35,metalness:.7}),
    cloth:['#efe6d2','#3f6d8e','#c9543c','#2f6b3a'].map((c,i)=>s('cloth'+i,c,{roughness:.95})),
    awn:[['#ffffff','#d23c32'],['#ffffff','#2f8a5a'],['#ffffff','#2c6ab0'],['#ffffff','#e8a52a'],['#fff3d6','#b23a6a']].map(([p,q],i)=>s('awn'+i,'#ffffff',{map:stripes(p,q),roughness:.9})),
    red:s('red','#c8322a',{roughness:.55}),green:s('green','#6aa83a',{roughness:.6}),orange:s('orange','#f08a3a',{roughness:.6}),yellow:s('yellow','#f2d23a',{roughness:.55}),pink:s('pink','#e8709a',{roughness:.7}),
    leaf:s('leaf','#3f7a36',{roughness:.85}),bread:s('bread','#c58a4a',{roughness:.9}),foil:s('foil','#d6d9dc',{roughness:.3,metalness:.7}),gold:s('gold','#d8b44a',{roughness:.35,metalness:.6}),
    lemonade:s('lemonade','#f6e27a',{roughness:.15,transparent:true,opacity:.82}),cord:s('cord','#3a3632',{roughness:1}),blue:s('blue','#2b5d8a',{roughness:.7}),
    flag:['#d23c32','#f2c230','#2f8a5a','#2c6ab0','#f4f1e6','#e8709a'].map((c,i)=>s('flag'+i,c,{roughness:.9,side:T.DoubleSide}))}}
/* the text atlas: stall banners, chalkboards, the stage backdrop, signs (4 x 8 cells of 256 x 128) */
function atlas(cells){const r=R();if(r.fatlas)return r.fatlas;const T=A().THREE;
  const fit=(g,t,w,px)=>{let s=px;g.font='bold '+s+'px sans-serif';while(g.measureText(t).width>w&&s>10){s-=2;g.font='bold '+s+'px sans-serif'}};
  const tex=canvasTex(1024,1024,(g)=>{cells.forEach((c,i)=>{const x=(i%4)*256,y=Math.floor(i/4)*128;g.save();g.beginPath();g.rect(x,y,256,128);g.clip();
    if(c.kind==='chalk'){g.fillStyle='#1f2a24';g.fillRect(x,y,256,128);for(let k=0;k<60;k++){g.fillStyle='rgba(255,255,255,'+(.015+Math.random()*.03)+')';g.fillRect(x+Math.random()*256,y+Math.random()*128,Math.random()*30,1+Math.random()*2)}
      const cols=['#f6f1d8','#ffd96b','#ff9f8a'];c.lines.forEach((t,k)=>{g.fillStyle=cols[k%3];g.font=(k===0?'bold italic 32px':'italic 24px')+' Georgia, serif';g.textAlign='center';g.textBaseline='middle';g.fillText(t,x+128,y+30+k*34,240)});g.strokeStyle='#8a6a44';g.lineWidth=8;g.strokeRect(x+4,y+4,248,120)}
    else{g.fillStyle=c.bg;g.fillRect(x,y,256,128);g.fillStyle=c.fg;g.textAlign='center';g.textBaseline='middle';
      if(c.lines.length>1){fit(g,c.lines[0],240,32);g.fillText(c.lines[0],x+128,y+44);fit(g,c.lines[1],240,22);g.fillText(c.lines[1],x+128,y+90)}else{fit(g,c.lines[0],236,44);g.fillText(c.lines[0],x+128,y+66)}
      g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=4;g.strokeRect(x+3,y+3,250,122)}g.restore()})});
  const m=own('mat',new T.MeshStandardMaterial({map:tex,roughness:.85}));return r.fatlas={m,uv:i=>{const u0=(i%4)/4,v1=1-Math.floor(i/4)/8;return[u0+.004,v1-1/8+.006,u0+.25-.004,v1-.006]}}}

/* ---------------- the stalls: who's selling what tonight (some depend on what you did) ---------------- */
function stallList(){const c=FN.ctx?FN.ctx():{fl:{},sf:{},done:()=>false};const bakery=c.sf&&c.sf.pawn==='bakery';
  return[
    {id:'bakery',side:'n',x:366.4,name:bakery?'RAMOS BAKERY':'CONCHAS & COFFEE',board:bakery?['RAMOS BAKERY','conchas FREE','tonight only']:['CONCHAS','$2','coffee $1'],goods:'bread',cloth:0,awn:4,batch:0},
    {id:'kettle',side:'n',x:371.6,name:'KETTLE CORN',board:['KETTLE','CORN','bag $5'],goods:'kettle',cloth:2,awn:2,batch:1},
    {id:'grill',side:'n',x:386.2,name:"BIG DAVE'S BRISKET",board:['BRISKET','14 hours','plate $8'],goods:'grill',cloth:1,awn:0,batch:0},
    {id:'tamale',side:'n',x:392.4,name:'TAMALES',board:['TAMALES','6 for $10','pork · bean'],goods:'tamale',cloth:2,awn:1,batch:2},
    {id:'bikes',side:'n',x:398.6,name:c.done&&c.done('earl')?'FREE BIKE LIBRARY':'BIKE REPAIR',board:['BIKES','borrow one','return Sunday'],goods:'bikes',cloth:3,awn:3,batch:1},
    {id:'lemon',side:'n',x:404.0,name:'YOUTH GROUP',board:c.fl&&c.fl.youthVan?['LEMONADE','$2','for the van!']:['LEMONADE','$2','fresh!'],goods:'lemon',cloth:1,awn:2,batch:0},
    {id:'garden',side:'s',x:366.0,name:'RIVERSIDE COMMUNITY GARDEN',board:['SEEDLINGS','$2 each','ask Rosa'],goods:'garden',cloth:3,awn:1,batch:2},
    {id:'face',side:'s',x:372.0,name:'FACE PAINTING',board:['FACES','$3','tigers!'],goods:'face',cloth:0,awn:3,batch:1}]}
const stallZ=s=>s.side==='n'?39.4:46.6;
function stallParts(s,parts,G,m,A_,state){const yaw=s.side==='n'?0:Math.PI,c=Math.cos(yaw),sn=Math.sin(yaw);
  const P_=(geo,mat,lx,y,lz,sx,sy,sz,o)=>{const x=s.x+lx*c+lz*sn,z=stallZ(s)-lx*sn+lz*c;parts.push(Object.assign({geo,mat,x,y,z,sx,sy,sz,ry:yaw},o||{}))};
  for(const[px,pz]of[[-1.62,-1.05],[1.62,-1.05],[-1.62,1.02],[1.62,1.02]])P_(G.cyl,m.metal,px,1.36,pz,.025,2.72,.025);
  if(state==='setup'){/* the canopy still folded on the ground, the table bare, boxes stacked */P_(G.box,m.awn[s.awn],-.4,.12,1.6,2.4,.24,.5);P_(G.box,m.wood,.9,.4,.3,1.6,.05,.8,{rz:.5});
    for(let i=0;i<4;i++)P_(G.box,m.crate,-1.1+i*.55,.18+(i%2)*.36,-.4,.5,.36,.4);return}
  P_(G.box,m.awn[s.awn],0,2.76,0,3.46,.05,2.26,{rx:-.07});P_(G.box,m.awn[s.awn],0,2.56,1.1,3.46,.28,.025);P_(G.box,m.awn[s.awn],-1.72,2.62,0,.025,.2,2.2);P_(G.box,m.awn[s.awn],1.72,2.62,0,.025,.2,2.2);
  P_(G.box,m.wood,0,.8,.25,3.0,.05,.86);P_(G.box,m.cloth[s.cloth],0,.55,.69,3.02,.5,.02);P_(G.box,m.cloth[s.cloth],-1.5,.55,.25,.02,.5,.88);P_(G.box,m.cloth[s.cloth],1.5,.55,.25,.02,.5,.88);P_(G.box,m.cloth[s.cloth],0,.815,.25,3.04,.012,.9);
  P_(G.plane,A_.m,0,2.24,1.125,2.4,.46,1,{uv:A_.uv(s.banCell)});
  P_(G.box,m.woodD,1.05,.42,1.5,.56,.84,.03,{rx:-.18});P_(G.plane,A_.m,1.05,.44,1.522,.5,.36,1,{uv:A_.uv(s.boardCell),rx:-.18});P_(G.box,m.woodD,1.05,.42,1.32,.56,.84,.03,{rx:.18});
  const fruit=(mat,cx,cz,r,n,y0,spread)=>{for(let i=0;i<n;i++){const ang=i*2.4,rad=Math.sqrt(i/n)*spread;P_(G.sph,mat,cx+Math.cos(ang)*rad*1.3,y0+r*.85+(i%3)*.012,cz+Math.sin(ang)*rad*.75,r,r*.92,r)}};
  switch(s.goods){
    case'bread':for(let i=0;i<10;i++)P_(G.sph,m.bread,-1.1+(i%5)*.52,.9,.12+Math.floor(i/5)*.3,.18,.08,.09,{ry:rr(-.3,.3)});fruit(m.pink,.95,.3,.05,10,.84,.18);break;
    case'kettle':P_(G.cyl,m.dark,-.9,1.12,.2,.34,.42,.34);P_(G.cyl,m.metal,-.9,1.34,.2,.36,.03,.36);for(let i=0;i<8;i++)P_(G.box,m.white,.05+i*.16,1.0,.3,.12,.3,.07,{ry:(i%2-.5)*.1});break;
    case'grill':P_(G.cyl,m.black,-.7,1.2,.1,.45,1.0,.45,{rz:Math.PI/2});P_(G.box,m.black,-.7,.6,.1,.9,.06,.5);for(let i=0;i<6;i++)P_(G.box,m.bread,.4+(i%3)*.32,.86,.15+Math.floor(i/3)*.25,.26,.06,.18);break;
    case'tamale':for(const lx of[-.85,-.2])P_(G.cyl,m.foil,lx,1.05,.25,.2,.42,.2);for(let i=0;i<3;i++)P_(G.box,m.foil,.4+i*.32,.85,.3,.26,.04,.2);break;
    case'lemon':P_(G.cyl,m.lemonade,-.8,1.1,.25,.17,.5,.17);P_(G.cyl,m.metal,-.8,1.37,.25,.18,.04,.18);for(let i=0;i<8;i++)P_(G.cyl,m.white,-.2+(i%4)*.14,.89,.2+Math.floor(i/4)*.16,.04,.1,.035);fruit(m.yellow,.9,.25,.045,14,.83,.2);break;
    case'garden':for(let i=0;i<12;i++){const lx=-1.2+(i%6)*.32,lz=.1+Math.floor(i/6)*.3;P_(G.cyl,m.orange,lx,.89,lz,.07,.12,.07);P_(G.sph,m.leaf,lx,1.0,lz,.08,.07,.08)}break;
    case'face':for(let i=0;i<6;i++)P_(G.cyl,[m.red,m.yellow,m.blue,m.green,m.pink,m.orange][i],-1+i*.3,.87,.3,.05,.08,.05);P_(G.box,m.white,.8,1.2,-.2,.5,.7,.03);break;
    case'bikes':break}}

/* ---------------- the stage: a deck, a truss, speakers, a backdrop, a drum kit and the band's gear. Pieces appear with pct ---------------- */
function stagePieces(G,m,A_){const s=W.stage,x0=s.x-s.w/2,x1=s.x+s.w/2,z0=s.z-s.d/2,z1=s.z+s.d/2,H=.9,pcs=[];const add=(at,parts)=>pcs.push({at,parts});
  {const p=[];p.push({geo:G.box,mat:m.deck,x:s.x,y:H/2,z:s.z,sx:s.w,sy:H,sz:s.d});p.push({geo:G.box,mat:m.woodD,x:s.x,y:H+.03,z:s.z,sx:s.w+.1,sy:.06,sz:s.d+.1});
    for(let i=0;i<4;i++)p.push({geo:G.box,mat:m.woodD,x:x1+.25+i*.28,y:H-(i+1)*.2,z:s.z+1.6,sx:.28,sy:.06,sz:1.2});p.push({geo:G.box,mat:m.dark,x:s.x,y:.45,z:z1+.02,sx:s.w,sy:.9,sz:.02});add(0,p)}
  {const p=[];for(const x of[x0+.15,x1-.15])for(const z of[z0+.15,z1-.15])for(const o of[-.12,.12])p.push({geo:G.cyl,mat:m.truss,x:x+o*.0,y:H+2.4,z:z+o,sx:.04,sy:4.8,sz:.04});
    for(const x of[x0+.15,x1-.15])for(const z of[z0+.15,z1-.15])for(let k=0;k<8;k++)p.push({geo:G.cyl6,mat:m.truss,x,y:H+.3+k*.6,z,sx:.015,sy:.34,sz:.015,rx:.8});add(.25,p)}
  {const p=[];for(const z of[z0+.15,z1-.15])for(const o of[-.12,.12])p.push({geo:G.cyl,mat:m.truss,x:s.x,y:H+4.8+o*.0,z:z+o,sx:.04,sy:s.w,sz:.04,rz:Math.PI/2});
    for(const x of[x0+.15,x1-.15])p.push({geo:G.cyl,mat:m.truss,x,y:H+4.8,z:s.z,sx:.04,sy:s.d,sz:.04,rx:Math.PI/2});for(let i=0;i<6;i++)p.push({geo:G.cyl,mat:m.black,x:x0+1+i*1.4,y:H+4.6,z:z1-.4,sx:.1,sy:.25,sz:.1});add(.45,p)}
  {const p=[];for(const z of[z0+.5,z1-.5]){p.push({geo:G.box,mat:m.black,x:x1-.7,y:H+.65,z,sx:.8,sy:1.3,sz:.7});p.push({geo:G.box,mat:m.black,x:x1-.7,y:H+1.7,z,sx:.7,sy:.8,sz:.6});
      for(const yy of[H+.45,H+.95,H+1.75])p.push({geo:G.cyl,mat:m.dark,x:x1-.29,y:yy,z,sx:.18,sy:.02,sz:.18,rz:Math.PI/2})}add(.6,p)}
  {const p=[];p.push({geo:G.box,mat:m.blue,x:x0+.25,y:H+2.4,z:s.z,sx:.08,sy:3.8,sz:s.d-.6});p.push({geo:G.plane,mat:A_.m,x:x0+.31,y:H+3.0,z:s.z,sx:s.d-1.2,sy:(s.d-1.2)/2,sz:1,ry:Math.PI/2,uv:A_.uv(A_.cells.stage)});
    p.push({geo:G.plane,mat:A_.m,x:x0+.31,y:H+1.4,z:s.z,sx:3.4,sy:1.1,sz:1,ry:Math.PI/2,uv:A_.uv(A_.cells.thanks)});add(.75,p)}
  {const p=[];const dx=x0+1.5,dz=s.z;p.push({geo:G.cyl,mat:m.red,x:dx,y:H+.35,z:dz,sx:.32,sy:.42,sz:.32,rz:Math.PI/2});for(const[ox,oz,r]of[[.45,.45,.18],[.45,-.45,.2],[-.1,.6,.22]])p.push({geo:G.cyl,mat:m.red,x:dx+ox,y:H+.62,z:dz+oz,sx:r,sy:.22,sz:r});
    for(const oz of[-.7,.7])p.push({geo:G.cyl,mat:m.gold,x:dx+.6,y:H+1.05,z:dz+oz,sx:.26,sy:.01,sz:.26});p.push({geo:G.cyl,mat:m.dark,x:dx-.55,y:H+.25,z:dz,sx:.18,sy:.5,sz:.18});
    for(const z of[s.z-1.4,s.z+1.4]){p.push({geo:G.cyl6,mat:m.dark,x:x1-1.6,y:H+.75,z,sx:.015,sy:1.5,sz:.015});p.push({geo:G.sph,mat:m.dark,x:x1-1.6,y:H+1.52,z,sx:.04,sy:.06,sz:.04})}
    p.push({geo:G.box,mat:m.dark,x:x0+2.6,y:H+.4,z:z1-.9,sx:.6,sy:.8,sz:.4});p.push({geo:G.box,mat:m.black,x:x0+2.4,y:H+.85,z:z0+.9,sx:1.3,sy:.1,sz:.45});add(.9,p)}
  return pcs}

/* ---------------- string lights, lanterns, bunting: catenaries zig-zagging over Main St ---------------- */
function catenaries(){const f=W.fest,out=[];for(let x=f.x0+12;x<=f.x1;x+=6.5){out.push({x0:x-3.2,z0:f.z0-.4,x1:x+3.2,z1:f.z1+.4,y:5.0,sag:.9})}
  out.push({x0:f.x0+11,z0:f.z0-.3,x1:f.x1,z1:f.z0-.3,y:4.6,sag:1.1});out.push({x0:f.x0+11,z0:f.z1+.3,x1:f.x1,z1:f.z1+.3,y:4.6,sag:1.1});return out}
const catAt=(c,t)=>({x:c.x0+(c.x1-c.x0)*t,y:c.y-Math.sin(t*Math.PI)*c.sag,z:c.z0+(c.z1-c.z0)*t});
function lightsGroup(G,m){const a=A(),T=a.THREE,g=new T.Group();const cats=catenaries();
  /* wires and poles (merged), bunting triangles (merged by colour) */
  const parts=[];let fk=0;for(const c of cats){const L=hyp(c.x1-c.x0,c.z1-c.z0),n=Math.max(6,Math.floor(L/.5));for(let i=0;i<n;i++){const p=catAt(c,i/n),q=catAt(c,(i+1)/n),dx=q.x-p.x,dy=q.y-p.y,dz=q.z-p.z,l=Math.hypot(dx,dy,dz);
      parts.push({geo:G.cyl6,mat:m.cord,x:(p.x+q.x)/2,y:(p.y+q.y)/2,z:(p.z+q.z)/2,sx:.01,sy:l,sz:.01,rx:Math.atan2(Math.hypot(dx,dz),dy),ry:Math.atan2(dx,dz)});
      if(c.z0===c.z1||i%2===0)parts.push({geo:G.tri,mat:m.flag[(fk++)%m.flag.length],x:p.x,y:p.y-.03,z:p.z,ry:Math.atan2(c.x1-c.x0,c.z1-c.z0)+Math.PI/2})}}
  for(const c of cats)for(const[x,z]of[[c.x0,c.z0],[c.x1,c.z1]])parts.push({geo:G.cyl,mat:m.metal,x,y:c.y/2+.1,z,sx:.045,sy:c.y+.2,sz:.045});
  merge(parts,g);
  /* bulbs: one InstancedMesh, warm, unlit (they ARE the light) */
  const bulbs=[];for(const c of cats){const L=hyp(c.x1-c.x0,c.z1-c.z0),n=Math.floor(L/.42);for(let i=1;i<n;i++)bulbs.push(catAt(c,i/n))}
  const bg=own('geo',new T.SphereGeometry(.055,8,6)),bm=own('mat',new T.MeshBasicMaterial({color:new T.Color('#ffd98a'),toneMapped:false}));const B=new T.InstancedMesh(bg,bm,bulbs.length);const o=new T.Object3D();
  bulbs.forEach((p,i)=>{o.position.set(p.x,p.y-.06,p.z);o.updateMatrix();B.setMatrixAt(i,o.matrix)});B.instanceMatrix.needsUpdate=true;B.castShadow=false;g.add(B);g.userData.bulbs=B;
  /* paper lanterns on the long lines, coloured */
  const lan=[];for(const c of cats.slice(-2)){for(let t=.08;t<.95;t+=.065)lan.push(catAt(c,t))}for(const c of cats.slice(0,-2))lan.push(catAt(c,.5));
  const lg=own('geo',new T.SphereGeometry(.22,12,10)),lm=own('mat',new T.MeshBasicMaterial({color:new T.Color('#ffffff'),toneMapped:false}));const L_=new T.InstancedMesh(lg,lm,lan.length);const cols=['#ff8a4a','#ffd14a','#ff6a8a','#8ad8ff','#ffe9a8','#b8ff8a'].map(h=>new T.Color(h));
  lan.forEach((p,i)=>{o.position.set(p.x,p.y-.42,p.z);o.scale.set(1,1.25,1);o.updateMatrix();L_.setMatrixAt(i,o.matrix);L_.setColorAt(i,cols[i%cols.length])});L_.instanceMatrix.needsUpdate=true;if(L_.instanceColor)L_.instanceColor.needsUpdate=true;L_.castShadow=false;g.add(L_);g.userData.lan=L_;
  /* a few real lights: the crowd under the lines is lit warm */
  g.userData.pts=[];for(const[x,z,i]of[[366,43,9],[378,43,9],[390,43,9],[402,43,8],[W.stage.x+2,W.stage.z,14]]){const p=new T.PointLight(0xffc27a,i,16,1.6);p.position.set(x,4.2,z);p.castShadow=false;g.add(p);g.userData.pts.push(p)}
  return g}

/* ---------------- chalk on the asphalt, the youth van, the bike library's bikes ---------------- */
function chalk(){const a=A(),T=a.THREE;const tex=canvasTex(512,256,(g,w,h)=>{g.clearRect(0,0,w,h);g.lineWidth=7;g.lineCap='round';const col=['#ffe36b','#ff8ab0','#8ad8ff','#b8ff8a','#ffffff'];
  for(let i=0;i<8;i++){g.strokeStyle=col[i%5];g.strokeRect(20+i*56,150,50,50);g.fillStyle=col[(i+2)%5];g.font='bold 30px sans-serif';g.fillText(String(i+1),36+i*56,186)}
  g.strokeStyle='#ffe36b';g.beginPath();g.arc(70,70,34,0,7);g.stroke();for(let k=0;k<10;k++){const an=k/10*6.283;g.beginPath();g.moveTo(70+Math.cos(an)*44,70+Math.sin(an)*44);g.lineTo(70+Math.cos(an)*62,70+Math.sin(an)*62);g.stroke()}
  g.fillStyle='#ff8ab0';g.font='bold 54px sans-serif';g.fillText('THANK YOU ♥',170,96);g.strokeStyle='#8ad8ff';g.beginPath();g.moveTo(460,40);g.lineTo(500,110);g.lineTo(420,110);g.closePath();g.stroke()});
  const m=own('mat',new T.MeshStandardMaterial({map:tex,transparent:true,opacity:.85,roughness:1,depthWrite:false}));const pl=new T.Mesh(own('geo',new T.PlaneGeometry(5,2.5)),m);pl.rotation.x=-Math.PI/2;pl.rotation.z=Math.PI/2;pl.position.set(381,.02,43);pl.renderOrder=1;return pl}

/* ---------------- grill smoke and steam: puffs rising (one InstancedMesh, stepped by dt) ---------------- */
function smokeMesh(){const a=A(),T=a.THREE;const n=18,mm=own('mat',new T.MeshStandardMaterial({color:new T.Color('#d8d4cc'),transparent:true,opacity:.28,depthWrite:false,roughness:1}));
  const I=new T.InstancedMesh(own('geo',new T.SphereGeometry(.35,8,6)),mm,n);I.castShadow=false;I.userData.p=[...Array(n)].map((_,i)=>({t:i/n*4,src:i%3}));return I}
const SMOKE_SRC=[{x:385.5,z:39.3},{x:391.6,z:39.5},{x:366.2,z:39.6}];
FN.smokeTick=function(M,dt){const S=M&&M.fn&&M.fn.festD;if(!S||!S.smoke||!S.smoke.visible)return;const I=S.smoke,o=FN._o||(FN._o=new (A().THREE.Object3D)());
  for(let i=0;i<I.userData.p.length;i++){const p=I.userData.p[i];p.t+=dt;if(p.t>4)p.t-=4;const s=SMOKE_SRC[p.src],k=p.t/4;o.position.set(s.x+Math.sin(p.t*1.3+i)*.25+k*.6,1.6+k*3.4,s.z+Math.cos(p.t+i)*.2);o.scale.setScalar(.35+k*1.4);o.updateMatrix();I.setMatrixAt(i,o.matrix)}I.instanceMatrix.needsUpdate=true};

/* ---------------- build it all once per run; levels only toggle what's visible ---------------- */
function build(M){const a=A(),T=a.THREE,G=geos(),m=mats();const st=stallList();
  const cells=[];const add=(kind,lines,bg,fg)=>{cells.push({kind,lines,bg,fg});return cells.length-1};
  for(const s of st){s.banCell=add('banner',[s.name],['#f4ecd8','#fbe3c2','#e8f1e0','#f6e0e6','#fff3d6'][s.awn],'#3a2a1c');s.boardCell=add('chalk',s.board)}
  const XC={stage:add('banner',['RIVERSIDE FLATS','STREET FESTIVAL'],'#2b5d8a','#ffd23f'),thanks:add('banner',['THANK YOU,','EVERYBODY'],'#f2efe6','#b23a6a'),
    closed:add('banner',['STREET CLOSED','FESTIVAL TODAY'],'#f4f1e6','#b23a1e'),welcome:add('banner',['RIVERSIDE FLATS STREET FESTIVAL','TODAY · EVERYBODY WELCOME'],'#f2efe6','#2b5d8a'),
    youth:add('banner',['YOUTH GROUP','CAR WASH VAN'],'#3d6fb5','#ffffff'),bikes:add('banner',['FREE BIKE','LIBRARY'],'#2f6b3a','#f4efe2')};
  const AT=atlas(cells);AT.cells=XC;
  const root=new T.Group();root.name='finaleFestival';a.wmAdd(root);const S={root,batch:[],setup:[],stage:[],lights:null};
  /* stalls in three batches (open / folded) */
  for(let b=0;b<3;b++){const open=[],fold=[];for(const s of st)if(s.batch===b){stallParts(s,open,G,m,AT,'open');stallParts(s,fold,G,m,AT,'setup')}
    const go=new T.Group(),gf=new T.Group();merge(open,go);merge(fold,gf);root.add(go,gf);S.batch.push(go);S.setup.push(gf)}
  /* the bike library's bikes in front of its stall */
  const Rn=HT.Runner;if(Rn&&Rn.bike){const bs=st.find(s=>s.id==='bikes');for(let i=0;i<3;i++){try{const bk=Rn.bike({static:true,color:['#c0392b','#2c6ab0','#2f8a5a'][i]});bk.position.set(bs.x-1.2+i*1.1,0,41.1);bk.rotation.y=Math.PI/2+.15;S.batch[1].add(bk);(R().bikes||(R().bikes=[])).push(bk)}catch(_){}}}
  /* closures and the welcome banner at 4th St */
  {const parts=[];for(const x of[W.fest.x0-1.2,W.fest.x1+1.4])for(const z of[40.9,45.1]){for(let i=0;i<5;i++)parts.push({geo:G.box,mat:i%2?m.flag[0]:m.white,x,y:.82,z:z-.8+i*.4,sx:.05,sy:.16,sz:.4});
      for(const dz of[-.9,.9])parts.push({geo:G.box,mat:m.woodD,x,y:.4,z:z+dz,sx:.05,sy:.82,sz:.06});parts.push({geo:G.plane,mat:AT.m,x:x+(x<380?-.04:.04),y:1.3,z,sx:1.6,sy:.8,sz:1,ry:x<380?-Math.PI/2:Math.PI/2,uv:AT.uv(AT.cells.closed)})}
    const bx=W.fest.x0-3.2;/* the welcome banner at the 2nd St end, out of the roof's line of sight */for(const z of[W.fest.z0-.6,W.fest.z1+.6])parts.push({geo:G.cyl,mat:m.metal,x:bx,y:2.9,z,sx:.06,sy:5.8,sz:.06});
    parts.push({geo:G.plane,mat:AT.m,x:bx+.02,y:5.1,z:43,sx:7.2,sy:1.4,sz:1,ry:Math.PI/2,uv:AT.uv(AT.cells.welcome)});parts.push({geo:G.plane,mat:AT.m,x:bx-.02,y:5.1,z:43,sx:7.2,sy:1.4,sz:1,ry:-Math.PI/2,uv:AT.uv(AT.cells.welcome)});
    const gb=new T.Group();merge(parts,gb);root.add(gb);S.closures=gb}
  /* the stage, piece by piece */
  for(const pc of stagePieces(G,m,AT)){const g=new T.Group();merge(pc.parts,g);g.userData.at=pc.at;root.add(g);S.stage.push(g)}
  /* the deck is solid: you can stand on it (and the speaker stacks are in the way, as speakers are) */
  {const st=W.stage;S.deckCol=a.wmCol({x0:st.x-st.w/2,z0:st.z-st.d/2,x1:st.x+st.w/2,z1:st.z+st.d/2,h:.92})}
  S.lights=lightsGroup(G,m);root.add(S.lights);S.chalk=chalk();root.add(S.chalk);S.smoke=smokeMesh();root.add(S.smoke);
  /* the youth group van behind the lemonade stall, if the car wash paid for it */
  const c=FN.ctx?FN.ctx():null;if(c&&(c.fl.youthVan||c.done('carwash'))){const v=a.makeVehicle('minivan','#3d6fb5');if(v){v.position.set(410.6,a.groundAt(410.6,33),33);v.rotation.y=0+Math.PI/2+Math.PI/2;root.add(v);R().veh.push(v);
      const sgn=new T.Mesh(G.plane,AT.m);const u=AT.uv(AT.cells.youth);const gg=own('geo',G.plane.clone());const uv=gg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,u[0]+uv.getX(i)*(u[2]-u[0]),u[1]+uv.getY(i)*(u[3]-u[1]));sgn.geometry=gg;sgn.scale.set(1.6,.8,1);sgn.position.set(0,2.05,0);v.add(sgn);S.youth=v}}
  M.fn.festD=S;return S}
/* golden hour: the scene's own sun, sky, fog and exposure, warmed while the festival evening runs; put back after */
function sceneRefs(){const a=A();const r={};a.scene.traverse(o=>{if(o.isDirectionalLight&&o.castShadow&&!r.sun)r.sun=o;if(o.isHemisphereLight&&!r.hemi)r.hemi=o;if(o.isMesh&&o.geometry&&o.geometry.parameters&&o.geometry.parameters.radius===380&&!r.sky)r.sky=o});return r}
let GRADE=null;
FN.grade=function(on){const a=A(),Gh=G();if(!a)return;if(!on){if(GRADE){const g=GRADE;GRADE=null;try{g.r.sun.color.copy(g.sun);g.r.sun.intensity=g.si;g.r.hemi.color.copy(g.hc);g.r.hemi.intensity=g.hi;g.r.sky.material.color.copy(g.sky);a.scene.fog&&a.scene.fog.color.copy(g.fog);Gh.renderer.toneMappingExposure=g.exp}catch(_){}}return}
  const r=GRADE?GRADE.r:sceneRefs();if(!r.sun||!r.hemi||!r.sky)return;
  if(!GRADE)GRADE={r,sun:r.sun.color.clone(),si:r.sun.intensity,hc:r.hemi.color.clone(),hi:r.hemi.intensity,sky:r.sky.material.color.clone(),fog:a.scene.fog?a.scene.fog.color.clone():null,exp:Gh.renderer.toneMappingExposure};
  const T=a.THREE,k=typeof on==='number'?on:1,mix=(c,h)=>c.lerp(new T.Color(h).convertSRGBToLinear(),k);
  r.sun.color.copy(GRADE.sun);mix(r.sun.color,'#ff9a52');r.sun.intensity=GRADE.si*(1-.38*k);r.hemi.color.copy(GRADE.hc);mix(r.hemi.color,'#ffc89a');r.hemi.intensity=GRADE.hi*(1+.2*k);
  r.sky.material.color.copy(GRADE.sky);mix(r.sky.material.color,'#ffab6e');if(a.scene.fog&&GRADE.fog){a.scene.fog.color.copy(GRADE.fog);mix(a.scene.fog.color,'#e9a878')}Gh.renderer.toneMappingExposure=GRADE.exp*(1-.08*k)};
/* what each level shows */
FN.festSet=function(M,level,pct){const F=M.fn;const S=F.festD&&F.festD.root.parent?F.festD:build(M);const p=level==='build'?clamp(pct||0,0,100)/100:level>=2?1:level===1?.15:0;
  const open=[level>=0,level==='build'?p>.35:level>=1,level==='build'?p>.7:level>=2];S.batch.forEach((g,i)=>{g.visible=open[i];S.setup[i].visible=!open[i]});
  for(const g of S.stage)g.visible=level==='build'?p>=g.userData.at:level>=2||g.userData.at<=(level===1?.25:0);
  const eve=level===3;S.lights.userData.bulbs.visible=true;S.lights.userData.lan.visible=eve||level>=2;for(const l of S.lights.userData.pts)l.visible=eve;S.chalk.visible=level>=1;S.smoke.visible=level>=2;if(S.youth)S.youth.visible=level>=1;
  S.lights.visible=level!==0||true;F.festL=level};
FN.bunting=FN.bunting;/* the post-game bunting (finale.js) stays as it is */
})();
/* ---------------- life on the street while it's being set up: volunteers carrying, neighbours on the stoops ---------------- */
(function(){const FN=window.HT&&HT.Finale;if(!FN)return;const{A,W,hyp,person,walkTo}=FN;
const VOL=['nb_sweater','nb_mei','nb_kenji','nb_lucia'],STOOP=['nb_gran','nb_pops','nb_office','nb_marcus'];
function carry(p,on){const a=A();if(on&&!p.box){p.box=a.box(.5,.36,.42,'#b48a58',0,1.02,.36,p.d.root)}if(p.box)p.box.visible=!!on}
function loop(p){const pick=()=>{const xs=[366,371.6,386.2,392.4,398.6,404];const x=xs[Math.floor(Math.random()*xs.length)];return{x:x+(Math.random()-.5),z:Math.random()<.5?41.7:44.3}};
  const go=()=>{const t=pick();carry(p,true);walkTo(p,t.x,t.z,1.25);p.arrive=()=>{carry(p,false);walkTo(p,W.benny.x+3.4+(Math.random()-.5),W.benny.z+1.6,1.5);p.arrive=()=>go()}};go()}
/* kind: 'setup' (volunteers + stoops), 'stoops' (stoops only). People live in M.fn.sub.extras and go when the stage changes */
FN.extras=function(M,kind,o){o=o||{};const S=M.fn.sub;S.extras=S.extras||[];
  if(kind==='setup')VOL.slice(0,o.n||3).forEach((k,i)=>{const p=person(k,W.benny.x+3+i,W.benny.z+1.4+i*.6);if(p){S.extras.push(p);loop(p)}});
  const skip=o.skipPorch||[];W.porches.forEach((pc,i)=>{if(skip.includes(i))return;const p=person(STOOP[i%STOOP.length],pc.x+(i%2?.5:-.5),pc.z+.4);if(!p)return;p.mode='sit';p.face={x:pc.x,z:40};S.extras.push(p);p.ph=i})};
FN.extrasTick=function(M,dt){const S=M.fn.sub;if(!S||!S.extras)return;for(const p of S.extras){if(p.mode==='sit'){p.wt=(p.wt||4+p.ph*3)-dt;if(p.wt<=0){p.wt=7+Math.random()*6;FN.wave(p,1.8)}}}};
/* the hands-only bubble, drawn on the street: 25 m around the families on the stoops */
FN.bubbleRing=function(M,x,z,r){const a=A(),T=a.THREE,R=FN.res();const g=new T.RingGeometry(r-.18,r,96),m=new T.MeshBasicMaterial({color:new T.Color('#7fe0a0'),transparent:true,opacity:.42,depthWrite:false,side:T.DoubleSide});R.geo.push(g);R.mat.push(m);
  const ring=new T.Mesh(g,m);ring.rotation.x=-Math.PI/2;ring.position.set(x,.05,z);ring.renderOrder=2;a.wmAdd(ring);return ring};
/* the Wholesaler's yard on Dock St: his own trucks (dark, a plain company name) and two of his people, so they never read as ours */
FN.yard=function(M){const a=A(),S=M.fn.sub;S.extras=S.extras||[];const T=a.THREE;
  for(const[x,z]of[[414,129],[421,129]]){const v=FN.car('workvan','#2a2d33',x,z,-Math.PI/2);const sg=FN.sign(['REGIONAL WHOLESALE · DISTRIBUTION'],{bg:'#2a2d33',fg:'#c9ced6',w:2.6,ph:80,border:false});sg.position.set(0,1.75,1.03);v.obj.add(sg);const sg2=sg.clone();sg2.position.z=-1.03;sg2.rotation.y=Math.PI;v.obj.add(sg2)}
  for(const[k,x,z]of[['thug_jacket',417.5,126.6],['thug_track',418.6,127.1]]){const p=person(k,x,z);if(p){p.face={x:W.truck.x,z:W.truck.z};S.extras.push(p)}}};
})();
