/* High Trust · the family home (window.HT.Home)
   Self-contained: architecture, fixtures, clutter, yard, lighting, furniture catalogue + decorate mode, family routines and lines.
   Coordinates are metres in the group's local space (group sits at the world origin). x → east, z → south (back yard), y up.
   The street/front door is on the north side (z<0), matching the hub. Everything degrades to procedural stand-ins if a file is missing. */
(function(){
'use strict';
const T=window.THREE;if(!T){console.warn('home.js: THREE missing');return}
const HT=window.HT=window.HT||{};
const Home=HT.Home={};

/* ======================================================================= basics */
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const SUN_DIR=V(.55,.74,.38).normalize();
const lin=c=>new T.Color(c).convertSRGBToLinear();
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const PI=Math.PI,TAU=PI*2;
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let R=rng(7);const rr=(a,b)=>a+R()*(b-a);const rpick=a=>a[Math.floor(R()*a.length)];
const CEIL=2.7;           /* interior ceiling height */
const IENV=.42;           /* interior image-light strength: the sky IBL has no walls, so it is turned down indoors */
let OPT={},BASE='assets/',ANISO=8;
const LIB={gltf:{},tex:{},failed:[]};

/* ======================================================================= loading */
const MODELS=['Sofa_01','ArmChair_01','mid_century_lounge_chair','modern_arm_chair_01','modern_coffee_table_01','wooden_bookshelf_worn','round_wooden_table_02',
  'painted_wooden_chair_02','potted_plant_04','potted_plant_02','hanging_picture_frame_01','fancy_picture_frame_01','WoodenTable_03','bench_vice_01','metal_tool_chest',
  'dartboard','Ottoman_01','Rockingchair_01','Shelf_01','side_table_01','modern_wooden_cabinet','dining_table','dining_chair_02','steel_frame_shelves_01','tool_cart',
  'outdoor_table_chair_set_01','wooden_picnic_table','stone_fire_pit','ceiling_fan','modern_ceiling_lamp_01','throw_pillows_01','gamepad','standing_picture_frame_01',
  'standing_picture_frame_02','wall_clock','garden_gnome','garden_hose_wall_mounted_01','football','american_football','handsaw_wood','cross_pein_hammer',
  'adjustable_wrench','pliers','measuring_tape_01','flathead_screwdriver','propane_tank','wooden_bowl_01','wooden_cutting_board','ceramic_vase_01','wicker_basket_01',
  'painted_wooden_nightstand','wooden_display_shelves_01','watering_can_metal_01','planter_box_01','jug_01','food_apple_01','hanging_industrial_lamp','shrub_04','kenney_trophy'];
const EXTRA_MODELS={couch:'props/couch',cardboard_box:'props/cardboard_box',tree_oak:'props/tree_oak',tree_tall:'props/tree_tall',bush:'props/bush',trash_can:'props/trash_can',car_van:'props/car_van',
  spouse_casual:'family/spouse_casual',kid_son:'family/kid_son',kid_daughter:'family/kid_daughter',dog_shiba:'family/dog_shiba',dad_casual:'chars/dad_casual'};
const HOME_TEX=['oakfloor','stonetile','wallpaint','linen'];
const GAME_TEX=['grass','roof','concfloor','sidewalk','asphalt'];

Home.init=function(opts={}){
  OPT=opts;BASE=opts.base||'assets/';
  if(opts.renderer)ANISO=Math.min(8,opts.renderer.capabilities.getMaxAnisotropy());
  const gl=T.GLTFLoader?new T.GLTFLoader():null,tl=new T.TextureLoader(),jobs=[];
  const A=opts.assets;
  const getGltf=n=>A&&A.gltf?A.gltf(n):null;
  const loadModel=(key,path)=>{const pre=getGltf(key);if(pre){LIB.gltf[key]=pre;return}
    if(!gl){LIB.failed.push(key);return}
    jobs.push(new Promise(res=>gl.load(BASE+path+'.glb',g=>{g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
      for(const m of[].concat(o.material)){if(m&&m.isMeshStandardMaterial)m.envMapIntensity=IENV+.15}}});LIB.gltf[key]=g;res()},undefined,()=>{LIB.failed.push(key);res()})))};
  for(const n of MODELS)loadModel(n,'home/'+n);
  for(const k in EXTRA_MODELS)loadModel(k,EXTRA_MODELS[k]);
  const conf=(t,srgb)=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=ANISO;if(srgb)t.encoding=T.sRGBEncoding;return t};
  const loadSet=(name,dir)=>{const set={};LIB.tex[name]=set;
    const pre=A&&A.tex?A.tex(name):null;if(pre&&dir!=='home/tex/'){Object.assign(set,pre);return}
    for(const[k,suf,srgb]of[['map','col',1],['normalMap','nrm',0],['roughnessMap','rgh',0]])
      jobs.push(new Promise(res=>{const t=tl.load(BASE+dir+name+'_'+suf+'.jpg',()=>{set[k]=t;res()},undefined,()=>{LIB.failed.push(name+'_'+suf);res()});conf(t,srgb)}))};
  for(const n of HOME_TEX)loadSet(n,'home/tex/');
  for(const n of GAME_TEX)loadSet(n,'tex/');
  Home.ready=Promise.all(jobs).then(()=>{Home.loaded=true;return Home});
  return Home.ready};

/* ======================================================================= canvas textures */
function canvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);return c}
function ctex(c,srgb=true,repeat=true){const t=new T.CanvasTexture(c);if(srgb)t.encoding=T.sRGBEncoding;if(repeat)t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=ANISO;return t}
/* height canvas (grey) → tangent-space normal map canvas */
function normalFrom(hc,strength=2){const w=hc.width,h=hc.height,src=hc.getContext('2d').getImageData(0,0,w,h).data;
  return canvas(w,h,(x)=>{const img=x.createImageData(w,h),d=img.data;const H=(i,j)=>src[(((j+h)%h)*w+((i+w)%w))*4]/255;
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){const dx=(H(i+1,j)-H(i-1,j))*strength,dy=(H(i,j+1)-H(i,j-1))*strength;const l=Math.hypot(dx,dy,1),o=(j*w+i)*4;
      d[o]=(-dx/l*.5+.5)*255;d[o+1]=(dy/l*.5+.5)*255;d[o+2]=(1/l*.5+.5)*255;d[o+3]=255}x.putImageData(img,0,0)})}
function noiseFill(x,w,h,n,a,col,r=1.2){for(let i=0;i<n;i++){x.fillStyle=col?col(i):`rgba(0,0,0,${R()*a})`;const s=R()*r+.4;x.fillRect(R()*w,R()*h,s,s)}}
const CT={};/* cache of generated textures */
function genTextures(){if(CT.done)return;CT.done=true;R=rng(11);
  /* quartz countertop: warm white with soft grey veining */
  {const c=canvas(1024,1024,(x,w,h)=>{x.fillStyle='#efede8';x.fillRect(0,0,w,h);
      noiseFill(x,w,h,26000,0,i=>`rgba(${R()<.5?'120,118,112':'255,255,255'},${R()*.18})`,1.6);
      x.filter='blur(1.5px)';for(let k=0;k<9;k++){x.strokeStyle=`rgba(118,116,112,${rr(.08,.22)})`;x.lineWidth=rr(1,4);x.beginPath();let px=rr(-100,w),py=rr(0,h);x.moveTo(px,py);
        for(let s=0;s<6;s++){x.bezierCurveTo(px+rr(40,180),py+rr(-120,120),px+rr(120,260),py+rr(-160,160),px+=rr(150,300),py+=rr(-120,120))}x.stroke()}x.filter='none'});
    CT.quartz=ctex(c)}
  /* subway backsplash, 3x6in tiles in running bond; texture spans 0.6 x 0.3 m */
  {const W=512,H=256,tw=W/4,th=H/4,g=3;const hc=canvas(W,H,(x)=>{x.fillStyle='#000';x.fillRect(0,0,W,H);
      for(let r=0;r<4;r++)for(let c=-1;c<5;c++){const ox=(r%2)*tw/2+c*tw;const gr=x.createLinearGradient(0,r*th,0,r*th+th);gr.addColorStop(0,'#bbb');gr.addColorStop(.12,'#fff');gr.addColorStop(.88,'#fff');gr.addColorStop(1,'#999');x.fillStyle=gr;x.fillRect(ox+g,r*th+g,tw-2*g,th-2*g)}});
    const col=canvas(W,H,(x)=>{x.fillStyle='#d4d0c8';x.fillRect(0,0,W,H);for(let r=0;r<4;r++)for(let c=-1;c<5;c++){const ox=(r%2)*tw/2+c*tw;const v=rr(-6,6);x.fillStyle=`rgb(${244+v},${242+v},${236+v})`;x.fillRect(ox+g,r*th+g,tw-2*g,th-2*g);
      const sh=x.createLinearGradient(ox,r*th,ox+tw,r*th+th);sh.addColorStop(0,'rgba(255,255,255,.35)');sh.addColorStop(1,'rgba(0,0,0,.05)');x.fillStyle=sh;x.fillRect(ox+g,r*th+g,tw-2*g,th-2*g)}});
    const rough=canvas(W,H,(x)=>{x.drawImage(hc,0,0);x.globalCompositeOperation='difference';x.fillStyle='#fff';x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over';x.fillStyle='rgba(30,30,30,.0)';});
    CT.subway={map:ctex(col),normalMap:ctex(normalFrom(hc,3),false),roughnessMap:ctex(rough,false)}}
  /* cut-pile carpet */
  {const hc=canvas(256,256,(x,w,h)=>{x.fillStyle='#808080';x.fillRect(0,0,w,h);noiseFill(x,w,h,30000,0,()=>`rgba(${R()<.5?'0,0,0':'255,255,255'},${R()*.35})`,1.4)});
    const col=canvas(256,256,(x,w,h)=>{x.fillStyle='#d9d3c8';x.fillRect(0,0,w,h);noiseFill(x,w,h,26000,0,()=>`rgba(${R()<.5?'90,80,70':'255,250,240'},${R()*.22})`,1.3)});
    CT.carpet={map:ctex(col),normalMap:ctex(normalFrom(hc,1.2),false)}}
  /* pegboard: 1 in hole pitch on tempered hardboard; spans 0.6 m */
  {const W=512,p=W/24;const hc=canvas(W,W,(x)=>{x.fillStyle='#fff';x.fillRect(0,0,W,W);x.fillStyle='#000';for(let j=0;j<24;j++)for(let i=0;i<24;i++){x.beginPath();x.arc(i*p+p/2,j*p+p/2,p*.17,0,TAU);x.fill()}});
    const col=canvas(W,W,(x)=>{x.fillStyle='#b48b5e';x.fillRect(0,0,W,W);noiseFill(x,W,W,9000,0,()=>`rgba(${R()<.5?'70,45,20':'255,230,190'},${R()*.15})`,2);x.fillStyle='#2a1e14';
      for(let j=0;j<24;j++)for(let i=0;i<24;i++){x.beginPath();x.arc(i*p+p/2,j*p+p/2,p*.17,0,TAU);x.fill()}});
    CT.peg={map:ctex(col),normalMap:ctex(normalFrom(hc,2),false)}}
  /* brushed stainless */
  {const c=canvas(256,256,(x,w,h)=>{x.fillStyle='#9a9c9e';x.fillRect(0,0,w,h);for(let i=0;i<1400;i++){x.fillStyle=`rgba(${R()<.5?'60,60,62':'235,236,238'},${R()*.18})`;x.fillRect(R()*w-40,R()*h,rr(30,160),1)}});
    CT.brushed=ctex(c,false)}
  /* cooktop: black glass with four burner rings, spans the hob (0.76 x 0.6) */
  CT.hob=ctex(canvas(512,400,(x,w,h)=>{x.fillStyle='#0b0b0c';x.fillRect(0,0,w,h);const ring=(cx,cy,r)=>{x.strokeStyle='rgba(150,150,150,.55)';x.lineWidth=3;x.beginPath();x.arc(cx,cy,r,0,TAU);x.stroke();x.strokeStyle='rgba(150,150,150,.25)';x.beginPath();x.arc(cx,cy,r*.62,0,TAU);x.stroke()};
    ring(140,120,80);ring(380,110,62);ring(130,300,62);ring(375,290,85);x.fillStyle='rgba(200,200,200,.5)';x.font='bold 16px sans-serif';x.fillText('· · ·',236,380)}),true,false);
  /* window blinds (closed) */
  CT.blinds=ctex(canvas(64,256,(x,w,h)=>{for(let j=0;j<h;j+=8){const g=x.createLinearGradient(0,j,0,j+8);g.addColorStop(0,'#f6f3ec');g.addColorStop(.7,'#dcd6ca');g.addColorStop(1,'#a69f92');x.fillStyle=g;x.fillRect(0,j,w,8)}}));
  /* lap siding: 7in exposure boards with a shadow line under each lap; white so it can be tinted. spans 1.44 m square */
  {const S=512,n=8,bh=S/n;R=rng(31);const hc=canvas(S,S,(x)=>{for(let i=0;i<n;i++){const g=x.createLinearGradient(0,i*bh,0,i*bh+bh);g.addColorStop(0,'#202020');g.addColorStop(.06,'#505050');g.addColorStop(.97,'#f0f0f0');g.addColorStop(1,'#303030');x.fillStyle=g;x.fillRect(0,i*bh,S,bh)}});
    const col=canvas(S,S,(x)=>{for(let i=0;i<n;i++){const v=rr(-5,5);x.fillStyle=`rgb(${236+v},${235+v},${230+v})`;x.fillRect(0,i*bh,S,bh);const sh=x.createLinearGradient(0,i*bh,0,i*bh+bh*.22);sh.addColorStop(0,'rgba(0,0,0,.42)');sh.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=sh;x.fillRect(0,i*bh,S,bh*.22);
      const hl=x.createLinearGradient(0,i*bh+bh*.8,0,i*bh+bh);hl.addColorStop(0,'rgba(255,255,255,0)');hl.addColorStop(1,'rgba(255,255,255,.25)');x.fillStyle=hl;x.fillRect(0,i*bh+bh*.8,S,bh*.2);
      for(let k=0;k<120;k++){x.fillStyle=`rgba(${R()<.5?'0,0,0':'255,255,255'},${R()*.05})`;x.fillRect(R()*S,i*bh+R()*bh,rr(20,120),1)}const j=rr(0,S);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(j,i*bh,2,bh)}
      noiseFill(x,S,S,6000,0,()=>`rgba(${R()<.5?'0,0,0':'255,255,255'},${R()*.05})`,1.4)});
    CT.siding={map:ctex(col),normalMap:ctex(normalFrom(hc,1.6),false)}}
  /* wall AO ramp (v = height / ceiling): darker where wall meets floor and ceiling */
  {const c=canvas(4,128,(x,w,h)=>{const g=x.createLinearGradient(0,h,0,0);g.addColorStop(0,'#7a7a7a');g.addColorStop(.06,'#cfcfcf');g.addColorStop(.16,'#fff');g.addColorStop(.9,'#fff');g.addColorStop(1,'#bdbdbd');x.fillStyle=g;x.fillRect(0,0,w,h)});
    CT.wallAO=ctex(c,false,false)}
  /* soft contact shadow blob */
  CT.blob=ctex(canvas(128,128,(x,w,h)=>{const g=x.createRadialGradient(64,64,10,64,64,64);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(.55,'rgba(0,0,0,.28)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,w,h)}),false,false);
  CT.blobRect=ctex(canvas(128,128,(x,w,h)=>{const img=x.createImageData(w,h);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const dx=Math.max(0,Math.abs(i-63.5)-40)/24,dy=Math.max(0,Math.abs(j-63.5)-40)/24;const a=Math.max(0,1-Math.hypot(dx,dy));img.data[(j*w+i)*4+3]=a*a*150}x.putImageData(img,0,0)}),false,false);
}

/* ---------- picture content: family photos, kids' drawings, screens, signs ---------- */
function photoCanvas(kind,w=256,h=320){R=rng(100+kind*13);return canvas(w,h,(x)=>{
  const sky=(a,b)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,a);g.addColorStop(1,b);x.fillStyle=g;x.fillRect(0,0,w,h)};
  const person=(px,py,s,shirt,hair,kid)=>{x.fillStyle=shirt;x.beginPath();x.ellipse(px,py+s*.55,s*.33,s*.5,0,0,TAU);x.fill();x.fillStyle='#e2b48f';x.beginPath();x.arc(px,py,s*.2,0,TAU);x.fill();x.fillStyle=hair;x.beginPath();x.arc(px,py-s*.05,s*.21,PI,TAU);x.fill();if(kid){x.fillStyle='#e2b48f';x.fillRect(px-s*.3,py+s*.45,s*.12,s*.08)}};
  const dog=(px,py,s)=>{x.fillStyle='#d9a45b';x.beginPath();x.ellipse(px,py,s*.5,s*.28,0,0,TAU);x.fill();x.beginPath();x.arc(px+s*.45,py-s*.25,s*.22,0,TAU);x.fill();x.beginPath();x.moveTo(px+s*.33,py-s*.4);x.lineTo(px+s*.4,py-s*.62);x.lineTo(px+s*.5,py-s*.42);x.fill();x.fillStyle='#fff3e0';x.beginPath();x.arc(px+s*.55,py-s*.2,s*.1,0,TAU);x.fill()};
  if(kind%6===0){sky('#f6b26b','#6a8fbf');x.fillStyle='#ffd58a';x.beginPath();x.arc(w*.7,h*.45,30,0,TAU);x.fill();x.fillStyle='#2c3e57';x.fillRect(0,h*.55,w,h*.2);x.fillStyle='#e9d3a8';x.fillRect(0,h*.72,w,h);
    person(w*.25,h*.6,70,'#2f5d9e','#4a3220');person(w*.42,h*.62,64,'#c25b7a','#6b3e26');person(w*.58,h*.7,46,'#4a8a7a','#3a2c20',1);person(w*.72,h*.73,38,'#e5a83a','#4a3220',1);dog(w*.86,h*.86,40)}
  else if(kind%6===1){sky('#9cc7ef','#d8ecff');x.fillStyle='#3f8a3c';x.fillRect(0,h*.55,w,h);x.strokeStyle='#fff';x.lineWidth=3;x.strokeRect(-10,h*.65,w*.6,h*.5);person(w*.5,h*.45,110,'#e5a83a','#4a3220',1);x.fillStyle='#fff';x.beginPath();x.arc(w*.62,h*.86,16,0,TAU);x.fill();x.fillStyle='#222';x.beginPath();x.arc(w*.62,h*.86,6,0,TAU);x.fill()}
  else if(kind%6===2){sky('#fdf5e8','#efe1c8');x.fillStyle='#c9b48e';x.fillRect(0,h*.78,w,h);x.strokeStyle='#b88b4a';x.lineWidth=8;x.beginPath();x.arc(w/2,h*.6,w*.4,PI,TAU);x.stroke();person(w*.38,h*.42,120,'#26272b','#4a3220');person(w*.62,h*.44,112,'#fbfbf7','#6b3e26')}
  else if(kind%6===3){sky('#e9e1d2','#cbbfa8');dog(w*.45,h*.62,190)}
  else if(kind%6===4){sky('#a7c8e8','#e8f1f8');x.fillStyle='#6d7f94';x.beginPath();x.moveTo(0,h*.6);x.lineTo(w*.3,h*.3);x.lineTo(w*.55,h*.55);x.lineTo(w*.8,h*.25);x.lineTo(w,h*.5);x.lineTo(w,h);x.lineTo(0,h);x.fill();x.fillStyle='#4c6b3c';x.fillRect(0,h*.7,w,h);person(w*.3,h*.62,70,'#2f5d9e','#4a3220');person(w*.5,h*.66,60,'#4a8a7a','#3a2c20',1)}
  else{sky('#8fb4d9','#cfe0ef');x.fillStyle='#2e6b8f';x.fillRect(0,h*.6,w,h);x.fillStyle='#8b6a45';x.fillRect(0,h*.78,w*.7,h*.08);person(w*.4,h*.5,100,'#c0392b','#4a3220',1);x.fillStyle='#9fb0b8';x.beginPath();x.ellipse(w*.62,h*.6,26,9,0,0,TAU);x.fill()}
  /* print look: grain, slight fade, vignette */
  noiseFill(x,w,h,7000,0,()=>`rgba(${R()<.5?'0,0,0':'255,255,255'},${R()*.06})`,1.2);
  const v=x.createRadialGradient(w/2,h/2,w*.3,w/2,h/2,w*.8);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(40,20,0,.28)');x.fillStyle=v;x.fillRect(0,0,w,h);
  x.fillStyle='rgba(255,240,215,.08)';x.fillRect(0,0,w,h)})}
function crayonCanvas(kind,w=256,h=320){R=rng(300+kind*7);return canvas(w,h,(x)=>{x.fillStyle='#fbfaf4';x.fillRect(0,0,w,h);x.lineCap='round';x.lineJoin='round';
  const line=(pts,col,lw=5)=>{for(let p=0;p<2;p++){x.strokeStyle=col;x.globalAlpha=.75;x.lineWidth=lw*(p?0.6:1);x.beginPath();pts.forEach(([a,b],i)=>{a+=rr(-2,2);b+=rr(-2,2);i?x.lineTo(a,b):x.moveTo(a,b)});x.stroke()}x.globalAlpha=1};
  const scrib=(x0,y0,x1,y1,col)=>{for(let y=y0;y<y1;y+=5)line([[x0+rr(0,6),y],[x1-rr(0,6),y+rr(-3,3)]],col,4)};
  const stick=(px,py,s,col)=>{line([[px,py],[px,py+s*.5]],col);line([[px-s*.25,py+s*.25],[px+s*.25,py+s*.25]],col);line([[px,py+s*.5],[px-s*.2,py+s*.9]],col);line([[px,py+s*.5],[px+s*.2,py+s*.9]],col);
    x.strokeStyle=col;x.lineWidth=4;x.beginPath();x.arc(px,py-s*.15,s*.15,0,TAU);x.stroke()};
  if(kind===0){scrib(40,150,200,260,'#e2a74a');line([[30,150],[120,70],[215,150],[30,150]],'#c0392b',6);scrib(105,200,140,260,'#7a4a2a');scrib(0,260,256,320,'#4caf50');line([[220,40],[220,40]],'#f1c40f',40);
    for(let k=0;k<8;k++){const a=k/8*TAU;line([[220+Math.cos(a)*28,40+Math.sin(a)*28],[220+Math.cos(a)*44,40+Math.sin(a)*44]],'#f1c40f',4)}}
  else if(kind===1){stick(60,120,120,'#2f5d9e');stick(115,130,110,'#c2185b');stick(165,170,70,'#2e7d32');stick(205,180,60,'#ef6c00');scrib(0,280,256,320,'#43a047');x.fillStyle='#2f5d9e';x.font='bold 30px Comic Sans MS, cursive';x.fillText('MY FAMLY',30,60)}
  else if(kind===2){x.fillStyle='#d32f2f';x.font='bold 54px Comic Sans MS, cursive';x.fillText('I',40,120);x.fillStyle='#e91e63';x.beginPath();x.moveTo(128,150);x.bezierCurveTo(70,100,95,60,128,90);x.bezierCurveTo(161,60,186,100,128,150);x.fill();
    x.fillStyle='#1565c0';x.fillText('DAD',60,230);line([[30,260],[230,262]],'#ffb300',6)}
  else{line([[40,200],[90,140],[160,140],[210,200]],'#c0392b',10);line([[50,205],[200,205]],'#8d6e63',8);for(const c of['#e53935','#fb8c00','#fdd835','#43a047','#1e88e5','#8e24aa']){}
    const cols=['#e53935','#fb8c00','#fdd835','#43a047','#1e88e5','#8e24aa'];cols.forEach((c,i)=>{x.strokeStyle=c;x.globalAlpha=.8;x.lineWidth=9;x.beginPath();x.arc(128,250,150-i*10,PI*1.05,PI*1.95);x.stroke()});x.globalAlpha=1;
    x.fillStyle='#d9a45b';x.beginPath();x.ellipse(120,270,40,22,0,0,TAU);x.fill();x.beginPath();x.arc(158,250,18,0,TAU);x.fill();x.fillStyle='#333';x.font='bold 24px Comic Sans MS, cursive';x.fillText('BISKIT',70,310)}
})}
function textCanvas(lines,{w=512,h=128,bg='#2b2b2b',fg='#f2efe6',font='bold 54px Georgia, serif',border=null}={}){return canvas(w,h,(x)=>{x.fillStyle=bg;x.fillRect(0,0,w,h);if(border){x.strokeStyle=border;x.lineWidth=8;x.strokeRect(8,8,w-16,h-16)}
  x.fillStyle=fg;x.font=font;x.textAlign='center';x.textBaseline='middle';const L=[].concat(lines);L.forEach((s,i)=>x.fillText(s,w/2,h/2+(i-(L.length-1)/2)*h/(L.length+.6)))})}
function bookAtlas(){R=rng(55);return canvas(512,256,(x,w,h)=>{const cols=['#8e2b2b','#2b4e8e','#2e6b45','#d8b25a','#efe6d2','#3d3d3d','#a35a2c','#6b3f6e','#c96f4a','#26464f','#b8473a','#e4d5b0'];
  for(let i=0;i<32;i++){const c=rpick(cols);x.fillStyle=c;x.fillRect(i*16,0,16,h);x.fillStyle='rgba(255,255,255,.12)';x.fillRect(i*16+2,0,2,h);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(i*16+13,0,3,h);
    x.fillStyle=R()<.5?'rgba(230,200,120,.85)':'rgba(255,255,255,.7)';x.fillRect(i*16+3,30+rr(0,20),10,4);x.fillRect(i*16+3,h-50,10,3);for(let k=0;k<5;k++)x.fillRect(i*16+5,80+k*14,6,6)}})}
/* the TV: a Saturday football broadcast */
function drawBroadcast(x,w,h,t){const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#2d6a2d');g.addColorStop(1,'#3f8c3a');x.fillStyle=g;x.fillRect(0,0,w,h);
  for(let i=0;i<12;i++){x.fillStyle=i%2?'rgba(255,255,255,.04)':'rgba(0,0,0,.04)';x.beginPath();const a=(i-6+(t*.3%1))*70;x.moveTo(w/2+a*.6,0);x.lineTo(w/2+a*.6+70*.6,0);x.lineTo(w/2+a*1.8+70*1.8,h);x.lineTo(w/2+a*1.8,h);x.fill()}
  x.strokeStyle='rgba(255,255,255,.75)';x.lineWidth=3;for(let i=-6;i<=6;i++){const a=(i+(t*.3%1))*70;x.beginPath();x.moveTo(w/2+a*.6,0);x.lineTo(w/2+a*1.8,h);x.stroke()}
  R=rng(Math.floor(t*2));for(let i=0;i<14;i++){const px=w*.2+((i*53+t*20)%(w*.6)),py=h*.3+((i*37)%(h*.5));x.fillStyle=i<7?'#d7dde8':'#b3272b';x.fillRect(px,py,7,14);x.fillStyle='#222';x.fillRect(px,py+14,7,4)}
  x.fillStyle='rgba(10,15,30,.85)';x.fillRect(20,h-46,330,30);x.fillStyle='#fff';x.font='bold 18px sans-serif';x.fillText('DADS  21   HOA  14    4TH  2:0'+(7-Math.floor(t%7)),32,h-25);x.fillStyle='#ffc94a';x.fillRect(20,h-48,330,3)}
function drawDadazon(x,w,h){x.fillStyle='#f5f6f7';x.fillRect(0,0,w,h);x.fillStyle='#232f3e';x.fillRect(0,0,w,h*.14);x.fillStyle='#ff9900';x.font='bold 30px sans-serif';x.fillText('dadazon',14,h*.1);
  x.fillStyle='#fff';x.fillRect(w*.42,h*.035,w*.5,h*.07);for(let i=0;i<6;i++){const px=14+(i%3)*(w-28)/3,py=h*.2+Math.floor(i/3)*h*.4;x.fillStyle='#fff';x.fillRect(px,py,(w-40)/3,h*.36);
    x.fillStyle=['#7a8a99','#c0392b','#2e6b45','#d8b25a','#3b4a3a','#8e6b4a'][i];x.fillRect(px+10,py+10,(w-40)/3-20,h*.2);x.fillStyle='#b12704';x.font='bold 16px sans-serif';x.fillText('$'+[650,90,45,220,900,15][i],px+10,py+h*.27);x.fillStyle='#ffa41c';x.fillText('★★★★☆',px+10,py+h*.33)}}

/* ======================================================================= materials */
const MC={};
let TSID=0;
function texSet(name,size,rot){let s=name&&typeof name==='object'?name:LIB.tex[name];if(s&&s.isTexture)s={map:s,_id:s.uuid};if(!s||!s.map)return null;if(typeof name==='object'&&!s._id)s._id=name._id=(name._id||'ct'+(++TSID));const k=(typeof name==='object'?s._id:name)+'|'+size+'|'+(rot||0);if(MC['ts'+k])return MC['ts'+k];
  const o={};for(const key of['map','normalMap','roughnessMap']){if(!s[key])continue;const t=s[key].clone();t.needsUpdate=true;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(1/size,1/size);if(rot){t.rotation=rot}o[key]=t}
  return MC['ts'+k]=o}
function stdMat(o){const m=new T.MeshStandardMaterial(Object.assign({roughness:.8,metalness:0},o));if(o.envMapIntensity==null)m.envMapIntensity=IENV;return m}
const EXT_KINDS=new Set(['siding','roof','grass','deck','fence','concrete','asphalt','brick','mulch','glass']);
function M(key){if(MC[key])return MC[key];let m;const xo=key.endsWith('!x');const[kind,arg,arg2]=(xo?key.slice(0,-2):key).split(':');
  switch(kind){
    case'paint':{const ts=texSet('wallpaint',2.4);m=stdMat({color:lin(arg),roughness:.88,aoMap:CT.wallAO});if(ts){m.normalMap=ts.normalMap;m.normalScale=new T.Vector2(.07,.07)}break}
    case'ceil':m=stdMat({color:lin('#f4f2ed'),roughness:.95});break;
    case'trim':m=stdMat({color:lin(arg||'#f3f1eb'),roughness:.45});break;
    case'flat':m=stdMat({color:lin(arg),roughness:arg2!=null?+arg2:.8});break;
    case'metal':m=stdMat({color:lin(arg),roughness:arg2!=null?+arg2:.35,metalness:1,envMapIntensity:.9});break;
    case'steel':m=stdMat({color:lin('#c9cbcd'),roughness:.32,metalness:1,envMapIntensity:.85,roughnessMap:CT.brushed,map:null});break;
    case'chrome':m=stdMat({color:lin('#e8e8e8'),roughness:.12,metalness:1,envMapIntensity:1});break;
    case'nickel':m=stdMat({color:lin('#b8b6b0'),roughness:.28,metalness:1,envMapIntensity:.9});break;
    case'brass':m=stdMat({color:lin('#c8a15a'),roughness:.3,metalness:1,envMapIntensity:.9});break;
    case'blackglass':m=stdMat({color:lin('#0b0c0d'),roughness:.08,metalness:0,envMapIntensity:1});break;
    case'glass':m=new T.MeshStandardMaterial({color:lin('#c9dbe6'),roughness:.04,metalness:.1,transparent:true,opacity:.14,depthWrite:false,envMapIntensity:1.6});break;
    case'oak':{const ts=texSet('oakfloor',1.7);m=stdMat(Object.assign({color:lin(ts?'#e8d6c2':'#a77d52'),roughness:1,envMapIntensity:.55},ts||{}));m.aoMap=null;break}
    case'tile':{const ts=texSet('stonetile',1.2);m=stdMat(Object.assign({color:lin(ts?'#f2ede4':'#d8d4cc'),roughness:1,envMapIntensity:.6},ts||{}));break}
    case'carpet':m=stdMat({color:lin(arg||'#cdc4b6'),roughness:1,map:texSet(CT.carpet,.5).map,normalMap:texSet(CT.carpet,.5).normalMap,normalScale:new T.Vector2(.6,.6),envMapIntensity:.3});break;
    case'garagefloor':{const ts=texSet('concfloor',3);m=stdMat(Object.assign({color:lin(ts?'#d9d6cf':'#8f8b82'),roughness:1,envMapIntensity:.45},ts||{}));break}
    case'quartz':m=stdMat({color:lin('#ffffff'),map:texSet(CT.quartz,1.6).map,roughness:.22,envMapIntensity:.7});break;
    case'subway':{const ts=texSet(CT.subway,.6);m=stdMat({color:lin('#ffffff'),map:ts.map,normalMap:ts.normalMap,roughness:.18,envMapIntensity:.75});break}
    case'cab':m=stdMat({color:lin(arg),roughness:.5,envMapIntensity:.45});break;
    case'wood':{const ts=texSet('oakfloor',arg2?+arg2:1.2,PI/2);m=stdMat(Object.assign({color:lin(arg||'#ffffff'),roughness:.75,envMapIntensity:.45},ts||{}));break}
    case'butcher':{const ts=texSet('oakfloor',.9);m=stdMat(Object.assign({color:lin('#e2b98f'),roughness:.55,envMapIntensity:.5},ts||{}));break}
    case'linen':{const ts=texSet('linen',+(arg2||.35));m=stdMat(Object.assign({color:lin(arg||'#e8e2d6'),roughness:1,envMapIntensity:.35,side:T.DoubleSide},ts||{}));if(m.normalMap)m.normalScale=new T.Vector2(.7,.7);break}
    case'peg':{const ts=texSet(CT.peg,.6);m=stdMat({color:lin('#ffffff'),map:ts.map,normalMap:ts.normalMap,roughness:.85});break}
    case'grass':{const ts=texSet('grass',2.2);m=stdMat(Object.assign({color:lin(ts?'#c8d8b0':'#5d8a4a'),roughness:1,envMapIntensity:1},ts||{}));break}
    case'siding':{const ts=texSet(CT.siding,1.44);m=stdMat(Object.assign({color:lin(arg||'#9fb0bc'),roughness:.7,envMapIntensity:1},ts));break}
    case'roof':{const ts=texSet('roof',3);m=stdMat(Object.assign({color:lin(ts?(arg||'#8a8d93'):'#555b63'),roughness:.95,envMapIntensity:1},ts||{}));break}
    case'deck':{const ts=texSet('oakfloor',2.6);m=stdMat(Object.assign({color:lin(ts?(arg||'#e2bf98'):'#8a6a4a'),roughness:.85,envMapIntensity:1},ts||{}));break}
    case'fence':{const ts=texSet('oakfloor',2.2,PI/2);m=stdMat(Object.assign({color:lin(ts?'#d2b08e':'#8a6a4a'),roughness:.95,envMapIntensity:1},ts||{}));break}
    case'concrete':{const ts=texSet('sidewalk',3);m=stdMat(Object.assign({color:lin(ts?'#dcd8d0':'#b7b2a6'),roughness:1,envMapIntensity:1},ts||{}));break}
    case'asphalt':{const ts=texSet('asphalt',4);m=stdMat(Object.assign({color:lin(ts?'#ffffff':'#3b3d43'),roughness:1,envMapIntensity:1},ts||{}));break}
    case'brick':{const ts=texSet('brick',1.6);m=stdMat(Object.assign({color:lin(ts?'#ffffff':'#9a5040'),roughness:1,envMapIntensity:1},ts||{}));break}
    case'mulch':m=stdMat({color:lin('#4a3324'),roughness:1,envMapIntensity:.8,map:texSet(CT.carpet,.3).map,normalMap:texSet(CT.carpet,.3).normalMap});break;
    case'glow':m=new T.MeshBasicMaterial({color:lin(arg).multiplyScalar(+(arg2||2)),toneMapped:false});break;
    case'shade':m=stdMat({color:lin(arg||'#f3e9d6'),roughness:1,side:T.DoubleSide,emissive:lin(arg||'#f3e9d6'),emissiveIntensity:+(arg2||.6),envMapIntensity:.3});break;
    case'tex':m=stdMat({map:CT[arg],roughness:+(arg2||.6)});break;
    case'blob':m=new T.MeshBasicMaterial({map:CT.blob,transparent:true,depthWrite:false,color:0x000000,opacity:1,polygonOffset:true,polygonOffsetFactor:-2});m.color.setRGB(0,0,0);m.alphaMap=null;break;
    default:m=stdMat({color:lin(kind)});
  }
  m.name=key;if(xo||EXT_KINDS.has(kind)){m.userData.ext=1;m.envMapIntensity=Math.max(m.envMapIntensity,.9)}return MC[key]=m}

/* ======================================================================= geometry helpers (UVs in metres) */
const GC={};
function boxGeo(w,h,d){const k=[w,h,d].map(v=>Math.round(v*1000)).join('|');if(GC[k])return GC[k];const g=new T.BoxGeometry(w,h,d),uv=g.attributes.uv;
  const spans=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let i=0;i<4;i++){const q=f*4+i;uv.setXY(q,uv.getX(q)*spans[f][0],uv.getY(q)*spans[f][1])}
  g.setAttribute('uv2',g.attributes.uv);return GC[k]=g}
function mesh(geo,mat,x=0,y=0,z=0,parent,ry=0){const m=new T.Mesh(geo,typeof mat==='string'?M(mat):mat);m.position.set(x,y,z);if(ry)m.rotation.y=ry;m.castShadow=true;m.receiveShadow=true;if(parent)parent.add(m);return m}
/* box by centre */
function bx(p,w,h,d,mat,x,y,z,ry){return mesh(boxGeo(w,h,d),mat,x,y,z,p,ry)}
/* box by min/max corners */
function bc(p,x0,y0,z0,x1,y1,z1,mat){return bx(p,x1-x0,y1-y0,z1-z0,mat,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2)}
function cyl(p,rt,rb,h,mat,x,y,z,seg=16,open=false){const k='c'+[rt,rb,h,seg,open].join('|');const g=GC[k]||(GC[k]=withUV2(new T.CylinderGeometry(rt,rb,h,seg,1,open)));return mesh(g,mat,x,y,z,p)}
function sph(p,r,mat,x,y,z,seg=16){const k='s'+r+'|'+seg;const g=GC[k]||(GC[k]=withUV2(new T.SphereGeometry(r,seg,Math.max(6,seg*.75|0))));return mesh(g,mat,x,y,z,p)}
function withUV2(g){if(g.attributes.uv&&!g.attributes.uv2)g.setAttribute('uv2',g.attributes.uv);return g}
/* rounded box (cushions, mattresses, fridge doors): a subdivided box whose corners are pushed onto a radius */
function rboxGeo(w,h,d,r,seg=3){const k='rb'+[w,h,d,r,seg].join('|');if(GC[k])return GC[k];r=Math.min(r,w/2-.001,h/2-.001,d/2-.001);
  const g=new T.BoxGeometry(w,h,d,seg*2,seg*2,seg*2),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;const ix=w/2-r,iy=h/2-r,iz=d/2-r,v=V(),c=V();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);c.set(clamp(v.x,-ix,ix),clamp(v.y,-iy,iy),clamp(v.z,-iz,iz));const o=v.clone().sub(c);if(o.lengthSq()>1e-9){o.normalize();v.copy(c).addScaledVector(o,r);n.setXYZ(i,o.x,o.y,o.z)}p.setXYZ(i,v.x,v.y,v.z)}
  const spans=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]],per=uv.count/6;for(let f=0;f<6;f++)for(let i=0;i<per;i++){const q=f*per+i;uv.setXY(q,uv.getX(q)*spans[f][0],uv.getY(q)*spans[f][1])}
  g.computeVertexNormals();g.setAttribute('uv2',g.attributes.uv);return GC[k]=g}
function rbx(p,w,h,d,r,mat,x,y,z,ry){return mesh(rboxGeo(w,h,d,r),mat,x,y,z,p,ry)}
function plane(p,w,h,mat,x,y,z,rx=0,ry=0){const k='pl'+w+'|'+h;const g=GC[k]||(GC[k]=(()=>{const g=new T.PlaneGeometry(w,h);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i),uv.getY(i));g.setAttribute('uv2',g.attributes.uv);return g})());
  const m=mesh(g,mat,x,y,z,p);m.rotation.set(rx,ry,0,'YXZ');return m}
/* flat picture (photo/drawing) with unit UVs, facing +z */
function pic(p,w,h,tex,x,y,z,ry=0,rough=.55){const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tex,roughness:rough,envMapIntensity:IENV}));m.position.set(x,y,z);m.rotation.y=ry;m.receiveShadow=true;p.add(m);return m}
function tube(p,pts,r,mat,seg=24,closed=false){const c=new T.CatmullRomCurve3(pts.map(a=>V(...a)));const m=new T.Mesh(withUV2(new T.TubeGeometry(c,seg,r,8,closed)),typeof mat==='string'?M(mat):mat);m.castShadow=true;m.receiveShadow=true;p.add(m);return m}
function torus(p,R0,r,mat,x,y,z,rx=PI/2,arc=TAU){const k='t'+[R0,r,arc].join('|');const g=GC[k]||(GC[k]=withUV2(new T.TorusGeometry(R0,r,8,32,arc)));const m=mesh(g,mat,x,y,z,p);m.rotation.x=rx;return m}

/* glTF model instance: scaled to a target size, base at y=0 and centred in x/z unless told otherwise */
function model(name,o={}){const g=LIB.gltf[name];if(!g)return null;const src=g.scene;const c=(T.SkeletonUtils&&o.skinned)?T.SkeletonUtils.clone(src):src.clone(true);
  const wrap=new T.Group();wrap.add(c);if(o.rot)c.rotation.y=o.rot;c.updateMatrixWorld(true);
  const b=new T.Box3().setFromObject(c),s=b.getSize(V());let k=o.scale||1;
  if(o.h)k=o.h/s.y;else if(o.w)k=o.w/s.x;else if(o.d)k=o.d/s.z;else if(o.fit){k=Math.min(o.fit[0]/s.x,o.fit[1]/s.y,o.fit[2]/s.z)}
  c.scale.multiplyScalar(k);c.position.multiplyScalar(k);c.updateMatrixWorld(true);const b2=new T.Box3().setFromObject(c),cc=b2.getCenter(V());
  c.position.x-=o.keepX?0:cc.x;c.position.z-=o.keepZ?0:cc.z;c.position.y-=o.keepY?0:b2.min.y;
  wrap.userData.size=b2.getSize(V());wrap.traverse(m=>{if(m.isMesh){m.castShadow=o.cast!==false;m.receiveShadow=true}});return wrap}
function put(p,name,o={},x=0,y=0,z=0,ry=0){const m=model(name,o);if(!m)return null;m.position.set(x,y,z);m.rotation.y=ry;p.add(m);return m}

/* merge every static mesh under root into one mesh per material (keeps draw calls low) */
function mergeStatic(root,keepOut){root.updateMatrixWorld(true);const inv=new T.Matrix4().copy(root.matrixWorld).invert();const groups=new Map();const remove=[];
  root.traverse(o=>{if(!o.isMesh||o.userData.dyn||o.isSkinnedMesh||Array.isArray(o.material))return;let p=o.parent;while(p&&p!==root){if(p.userData.dyn)return;p=p.parent}
    const k=o.material.uuid+'|'+o.castShadow+'|'+o.receiveShadow;if(!groups.has(k))groups.set(k,{mat:o.material,cast:o.castShadow,recv:o.receiveShadow,list:[]});groups.get(k).list.push(o);remove.push(o)});
  const out=[];
  for(const g of groups.values()){let n=0;for(const o of g.list){n+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)}
    const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2),U2=new Float32Array(n*2);let q=0;const m4=new T.Matrix4(),nm=new T.Matrix3(),v=V();
    for(const o of g.list){m4.multiplyMatrices(inv,o.matrixWorld);nm.getNormalMatrix(m4);const ge=o.geometry,ip=ge.index,pa=ge.attributes.position,na=ge.attributes.normal,ua=ge.attributes.uv,u2=ge.attributes.uv2||ua;
      const cnt=ip?ip.count:pa.count;for(let i=0;i<cnt;i++){const j=ip?ip.getX(i):i;v.fromBufferAttribute(pa,j).applyMatrix4(m4);P[q*3]=v.x;P[q*3+1]=v.y;P[q*3+2]=v.z;
        if(na){v.fromBufferAttribute(na,j).applyMatrix3(nm).normalize();N[q*3]=v.x;N[q*3+1]=v.y;N[q*3+2]=v.z}
        if(ua){U[q*2]=ua.getX(j);U[q*2+1]=ua.getY(j)}if(u2){U2[q*2]=u2.getX(j);U2[q*2+1]=u2.getY(j)}q++}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(P,3));geo.setAttribute('normal',new T.BufferAttribute(N,3));geo.setAttribute('uv',new T.BufferAttribute(U,2));geo.setAttribute('uv2',new T.BufferAttribute(U2,2));
    geo.computeBoundingSphere();geo.computeBoundingBox();const mm=new T.Mesh(geo,g.mat);mm.castShadow=g.cast;mm.receiveShadow=g.recv;mm.name='merged:'+g.mat.name;out.push(mm)}
  for(const o of remove)o.parent.remove(o);
  /* drop now-empty groups */
  const prune=o=>{for(const c of[...o.children])prune(c);if(o!==root&&!o.isMesh&&!o.isLight&&o.children.length===0&&!o.userData.dyn&&o.type==='Group')o.parent.remove(o)};prune(root);
  for(const m of out)root.add(m);return out}

/* ======================================================================= quad bucket (walls, floors) */
class Bucket{constructor(){this.P=[];this.N=[];this.U=[];this.U2=[]}
  quad(a,b,c,d,n,uv2fn){const U=(p)=>{const ax=Math.abs(n[0]),ay=Math.abs(n[1]);if(ay>.5)return[p[0],-p[2]];if(ax>.5)return[n[0]>0?-p[2]:p[2],p[1]];return[n[2]>0?p[0]:-p[0],p[1]]};
    for(const p of[a,b,c,a,c,d]){this.P.push(...p);this.N.push(...n);this.U.push(...U(p));this.U2.push(...(uv2fn?uv2fn(p):[.5,p[1]/CEIL]))}}
  box(x0,y0,z0,x1,y1,z1,faces,uv2fn){const F=faces;
    if(F.px)this.of(F.px).quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0],uv2fn);
    if(F.nx)this.of(F.nx).quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0],uv2fn);
    if(F.pz)this.of(F.pz).quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],uv2fn);
    if(F.nz)this.of(F.nz).quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1],uv2fn);
    if(F.py)this.of(F.py).quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0],uv2fn);
    if(F.ny)this.of(F.ny).quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],uv2fn)}
  of(key){return this.set[key]||(this.set[key]=new Bucket())}
}
class BucketSet{constructor(){this.set={}}of(k){return this.set[k]||(this.set[k]=new Bucket())}
  box(...a){return Bucket.prototype.box.call(this,...a)}
  meshes(){const out=[];for(const k in this.set){const b=this.set[k];if(!b.P.length)continue;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.P,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.N,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(b.U,2));g.setAttribute('uv2',new T.Float32BufferAttribute(b.U2,2));g.computeBoundingSphere();const m=new T.Mesh(g,M(k));m.castShadow=true;m.receiveShadow=true;m.name='walls:'+k;out.push(m)}return out}}
BucketSet.prototype.quadTo=function(k,...a){this.of(k).quad(...a)};

/* ======================================================================= floor plan */
/* rooms: floor regions (material) — rects in metres */
const FLOORS=[
  {id:'garage',mat:'garagefloor',r:[-7,0,0,10]},
  {id:'entry',mat:'tile',r:[0,0,3,4.06]},
  {id:'kitchen',mat:'tile',r:[0,4.06,5,10]},
  {id:'living',mat:'oak',r:[3,0,9.36,4.06]},
  {id:'dining',mat:'oak',r:[5,4.06,9.36,10]},
  {id:'hall',mat:'oak',r:[9.36,1.34,10.78,10]},
  {id:'bedroom',mat:'carpet',r:[10.78,0,15,5.56]}];
const ROOMS=[/* for labels, family POIs, ceilings, paint */
  {id:'garage',r:[-7,0,-.15,10],paint:'#dcd8cf'},{id:'entry',r:[0,0,3,4]},{id:'living',r:[3,0,9.3,5.2]},{id:'kitchen',r:[0,4.12,5,10]},{id:'dining',r:[5,5.2,9.3,10]},
  {id:'hall',r:[9.42,1.4,10.72,10]},{id:'bedroom',r:[10.84,0,15,5.5]}];
/* walls: axis-aligned slabs. a = side facing -x/-z, b = side facing +x/+z. open: [from,to,sill,head,kind] along the long axis */
const EXT_H=2.95;
const WALLS=[
  /* exterior */
  {id:'front',r:[-7.2,-.2,15.2,0],h:EXT_H,a:'siding',b:'paint:#e9e2d4',open:[[-6.25,-1.15,0,2.3,'garage'],[1.0,1.95,0,2.1,'door:front'],[2.07,2.45,.35,2.1,'win'],[4.3,8.3,.5,2.15,'win3'],[9.75,10.4,1.45,2.0,'win'],[12.0,13.8,.7,2.15,'win2']]},
  {id:'back',r:[-7.2,10,15.2,10.2],h:EXT_H,a:'paint:#e9e2d4',b:'siding',open:[[-2.05,-1.15,0,2.05,'door:gback'],[1.35,3.05,1.07,2.15,'win2'],[6.0,8.6,0,2.15,'slider'],[9.7,10.45,.9,2.0,'win'],[12.1,13.9,.8,2.1,'blinds']]},
  {id:'west',r:[-7.2,0,-7,10],h:EXT_H,a:'siding',b:'paint:#dcd8cf',open:[[3.3,4.5,1.35,2.1,'win']]},
  {id:'east',r:[15,0,15.2,10],h:EXT_H,a:'paint:#c9d3d6',b:'siding',open:[[3.75,4.95,.85,2.1,'win'],[7.1,8.7,.8,2.1,'blinds']]},
  /* interior */
  {id:'garagewall',r:[-.15,0,0,10],h:CEIL,a:'paint:#dcd8cf',b:'paint:#e9e2d4',open:[[2.3,3.2,0,2.03,'door:garage']]},
  {id:'entrywall',r:[0,4,3,4.12],h:CEIL,a:'paint:#e9e2d4',b:'paint:#efe9dd'},
  {id:'hallW',r:[9.3,0,9.42,10],h:CEIL,a:'paint:#e9e2d4',b:'paint:#e9e2d4',open:[[4.45,5.75,0,2.15,'case']]},
  {id:'hallE',r:[10.72,0,10.84,10],h:CEIL,a:'paint:#e9e2d4',b:'paint:#c9d3d6',open:[[3.7,4.55,0,2.03,'door:bed'],[7.1,7.95,0,2.03,'door:kids']]},
  {id:'bath',r:[9.42,1.28,10.72,1.4],h:CEIL,a:'paint:#e9e2d4',b:'paint:#e9e2d4',open:[[9.7,10.45,0,2.03,'door:bath']]},
  {id:'bedkids',r:[10.84,5.5,15,5.62],h:CEIL,a:'paint:#c9d3d6',b:'paint:#e9e2d4'}];
/* living room / dining accent: the dining side of the hall wall is a deep sage */
const ACCENT={hallW:{a:[[5.75,10,'paint:#8f9e86']]}};

/* everything that blocks: colliders (AABB), plus decor-grid blocking and floor AO */
const STATIC={colliders:[],aoRects:[],block:[],reserve:[],wallSpans:[],noWall:[],snapExtra:[]};
function col(x0,z0,x1,z1,o={}){const c={x0:Math.min(x0,x1),z0:Math.min(z0,z1),x1:Math.max(x0,x1),z1:Math.max(z0,z1)};if(o.collide!==false)STATIC.colliders.push(c);if(o.ao!==false)STATIC.aoRects.push(Object.assign({k:o.k||1},c));if(o.block!==false)STATIC.block.push(c);return c}


/* ======================================================================= architecture */
const AO_RECT=[-7.4,-.4,15.4,10.4],AO_PPM=24;   /* floor AO covers the whole footprint at ~4 cm per texel */
function floorUV2(p){return[(p[0]-AO_RECT[0])/(AO_RECT[2]-AO_RECT[0]),1-(p[2]-AO_RECT[1])/(AO_RECT[3]-AO_RECT[1])]}
const DOORS=[];      /* animated doors {pivot, open, target, axis, collider, x,z, auto} */
function isPaint(k){return k&&k.startsWith('paint')}
function buildWalls(G,B){
  for(const w of WALLS){const[x0,z0,x1,z1]=w.r,alongX=(x1-x0)>=(z1-z0),A0=alongX?x0:z0,A1=alongX?x1:z1,h=w.h;
    const inner=isPaint(w.a)?w.a:w.b;const ext=!isPaint(w.a)||!isPaint(w.b);
    const ops=(w.open||[]).slice().sort((a,b)=>a[0]-b[0]);const pieces=[];let cur=A0;
    const splits=(ACCENT[w.id]&&ACCENT[w.id].a||[]).map(r=>r[0]);
    const pushFull=(s,e)=>{const cuts=[s,...splits.filter(c=>c>s&&c<e),e];for(let i=0;i<cuts.length-1;i++)pieces.push({s:cuts[i],e:cuts[i+1],y0:ext?-.02:0,y1:h,full:1})};
    for(const o of ops){const[f,t,sill,head,kind]=o;if(f>cur)pushFull(cur,f);if(sill>0)pieces.push({s:f,e:t,y0:ext?-.02:0,y1:sill,sill:1,op:o});if(head<h)pieces.push({s:f,e:t,y0:head,y1:h,head:1,op:o});cur=t}
    if(cur<A1)pushFull(cur,A1);
    for(const pc of pieces){let fa=w.a,fb=w.b;const acc=ACCENT[w.id];if(acc&&acc.a)for(const[s,e,m]of acc.a)if(pc.s>=s-1e-6&&pc.e<=e+1e-6)fa=m;
      const jamb=inner,faces=alongX?{nz:fa,pz:fb,nx:jamb,px:jamb,py:ext?'siding':null,ny:pc.head?jamb:null}:{nx:fa,px:fb,nz:jamb,pz:jamb,py:ext?'siding':null,ny:pc.head?jamb:null};
      if(pc.sill)alongX?(faces.py=jamb):(faces.py=jamb);
      /* the ends of full pieces that butt into another wall are hidden: skip them to save triangles, except free ends */
      const bx0=alongX?pc.s:x0,bx1=alongX?pc.e:x1,bz0=alongX?z0:pc.s,bz1=alongX?z1:pc.e;
      B.box(bx0,pc.y0,bz0,bx1,pc.y1,bz1,faces);
      if(pc.y0<=0&&!pc.head){col(bx0,bz0,bx1,bz1,{k:1})}
      /* trim on painted faces */
      for(const side of['a','b']){const key=side==='a'?fa:fb;if(!isPaint(key))continue;const garage=key===w.a&&w.id==='west'||key==='paint:#dcd8cf';
        const sgn=side==='a'?-1:1;const face=alongX?(side==='a'?z0:z1):(side==='a'?x0:x1);
        if(!pc.head&&!garage)trimRun(G,alongX,face,sgn,pc.s,pc.e,'base');
        if(!pc.sill&&!garage&&pc.y1>=CEIL-.01)trimRun(G,alongX,face,sgn,pc.s,pc.e,'crown');
        if(pc.full&&pc.e-pc.s>.5)STATIC.wallSpans.push({alongX,face,sgn,s:pc.s+.06,e:pc.e-.06,y0:.25,y1:CEIL-.15,wall:w.id,garage})}}
    for(const o of ops)buildOpening(G,w,alongX,o,inner,ext)}}
const TRIM='trim';
function trimRun(G,alongX,face,sgn,s,e,kind){const L=e-s,c=(s+e)/2;
  if(kind==='base'){const t=.016,hh=.11;const o=face+sgn*t/2;if(alongX){bx(G,L,hh,t,TRIM,c,hh/2,o);bx(G,L,.012,t+.006,TRIM,c,hh+.006,o+sgn*.003)}else{bx(G,t,hh,L,TRIM,o,hh/2,c);bx(G,t+.006,.012,L,TRIM,o+sgn*.003,hh+.006,c)}}
  else{const y=CEIL;if(alongX){bx(G,L,.07,.03,TRIM,c,y-.035,face+sgn*.015);bx(G,L,.03,.07,TRIM,c,y-.015,face+sgn*.035);bx(G,L,.012,.05,TRIM,c,y-.075,face+sgn*.012)}
    else{bx(G,.03,.07,L,TRIM,face+sgn*.015,y-.035,c);bx(G,.07,.03,L,TRIM,face+sgn*.035,y-.015,c);bx(G,.05,.012,L,TRIM,face+sgn*.012,y-.075,c)}}}
/* casing around an opening on one face: jambs + head, optional stool/apron for windows */
function casing(G,alongX,face,sgn,f,t,sill,head,win,col='trim'){const cw=.075,ct=.018,o=face+sgn*ct/2;const put=(a0,a1,y0,y1,d=ct,off=0)=>{const L=a1-a0,c=(a0+a1)/2,hh=y1-y0;alongX?bx(G,L,hh,d,col,c,(y0+y1)/2,o+sgn*off):bx(G,d,hh,L,col,o+sgn*off,(y0+y1)/2,c)};
  const yb=win?sill-.0:0;put(f-cw,f,yb,head+cw);put(t,t+cw,yb,head+cw);put(f-cw-.012,t+cw+.012,head+cw,head+cw+.02);put(f-cw-.01,t+cw+.01,head+cw+.02,head+cw+.045,ct+.01,.004);
  if(win){put(f-cw-.03,t+cw+.03,sill-.03,sill,.07,.025);put(f-cw,t+cw,sill-.12,sill-.03)}}
function jambLiner(G,alongX,w,f,t,head,sill=0,col='trim'){const[x0,z0,x1,z1]=w.r,th=alongX?z1-z0:x1-x0,c=alongX?(z0+z1)/2:(x0+x1)/2,L=.016;
  if(alongX){bx(G,L,head-sill,th+.004,col,f+L/2,(head+sill)/2,c);bx(G,L,head-sill,th+.004,col,t-L/2,(head+sill)/2,c);bx(G,t-f,L,th+.004,col,(f+t)/2,head-L/2,c);if(sill>0)bx(G,t-f,L,th+.004,col,(f+t)/2,sill+L/2,c)}
  else{bx(G,th+.004,head-sill,L,col,c,(head+sill)/2,f+L/2);bx(G,th+.004,head-sill,L,col,c,(head+sill)/2,t-L/2);bx(G,th+.004,L,t-f,col,c,head-L/2,(f+t)/2);if(sill>0)bx(G,th+.004,L,t-f,col,c,sill+L/2,(f+t)/2)}}
const WINDOWS=[];
function buildOpening(G,w,alongX,o,inner,ext){const[f,t,sill,head,kind]=o;const[x0,z0,x1,z1]=w.r;const mid=alongX?(z0+z1)/2:(x0+x1)/2,th=alongX?z1-z0:x1-x0;
  const facesP=[];if(isPaint(w.a))facesP.push(['a',alongX?z0:x0,-1]);if(isPaint(w.b))facesP.push(['b',alongX?z1:x1,1]);
  const extFace=!isPaint(w.a)?[alongX?z0:x0,-1]:!isPaint(w.b)?[alongX?z1:x1,1]:null;
  const win=kind.startsWith('win')||kind==='blinds';
  if(kind==='garage'){garageDoor(G,w,f,t,head,mid);if(extFace)casing(G,alongX,extFace[0],extFace[1],f,t,0,head,false,'trim:#ffffff');col(f,z0,t,z1,{ao:false});return}
  if(kind!=='slider')jambLiner(G,alongX,w,f,t,head,win?sill:0,win?'trim':'trim');
  for(const[,face,sgn]of facesP){const gar=w.id==='west'||(w.id==='garagewall'&&sgn<0)||(w.id==='back'&&f<0)||(w.id==='front'&&f<0);casing(G,alongX,face,sgn,f,t,sill,head,win,gar?'trim:#e9e6df':'trim')}
  if(extFace)casing(G,alongX,extFace[0],extFace[1],f,t,sill,head,win,'trim:#f7f6f2');
  if(win){windowUnit(G,alongX,f,t,sill,head,mid,th,kind,w);WINDOWS.push({alongX,f,t,sill,head,plane:mid,w:w.id,kind,inSign:isPaint(w.a)?-1:1})}
  else if(kind.startsWith('door:'))doorUnit(G,w,alongX,f,t,head,mid,th,kind.slice(5));
  else if(kind==='slider'){sliderUnit(G,alongX,f,t,head,mid,th)}}
function windowUnit(G,alongX,f,t,sill,head,mid,th,kind,w){const n=kind==='win3'?3:kind==='win2'?2:1;const fw=.055,fd=.09,W=t-f,H=head-sill;
  const put=(a0,a1,y0,y1,d=fd,mat='trim:#f7f6f2',off=0)=>{const L=a1-a0,c=(a0+a1)/2;return alongX?bx(G,L,y1-y0,d,mat,c,(y0+y1)/2,mid+off):bx(G,d,y1-y0,L,mat,mid+off,(y0+y1)/2,c)};
  put(f,t,sill,sill+fw);put(f,t,head-fw,head);put(f,f+fw,sill,head);put(t-fw,t,sill,head);
  for(let i=1;i<n;i++){const a=f+W*i/n;put(a-.035,a+.035,sill,head)}
  for(let i=0;i<n;i++){const a0=f+W*i/n,a1=f+W*(i+1)/n;const ym=sill+H*.5;
    /* double-hung: two sashes, meeting rail; upper sash sits .03 further out */
    put(a0+.02,a1-.02,ym-.025,ym+.025,.06,'trim:#f7f6f2',-.012);
    for(const[y0,y1,off]of[[sill+fw,ym,.012],[ym,head-fw,-.03]]){put(a0+.02,a0+.065,y0,y1,.04,'trim:#f7f6f2',off);put(a1-.065,a1-.02,y0,y1,.04,'trim:#f7f6f2',off);
      const gl=alongX?bx(G,a1-a0-.12,y1-y0-.05,.006,'glass',(a0+a1)/2,(y0+y1)/2,mid+off):bx(G,.006,y1-y0-.05,a1-a0-.12,'glass',mid+off,(y0+y1)/2,(a0+a1)/2);gl.castShadow=false;gl.userData.dyn=1;gl.renderOrder=2}}
  /* window hardware: sash lock */
  if(kind!=='blinds')for(let i=0;i<n;i++){const a=f+W*(i+.5)/n,s=isPaint(w.a)?-1:1;alongX?bx(G,.07,.015,.03,'nickel',a,sill+H*.5+.03,mid+s*.02):bx(G,.03,.015,.07,'nickel',mid+s*.02,sill+H*.5+.03,a)}
  if(kind==='blinds'){const s=isPaint(w.a)?-1:1;const m=alongX?plane(G,W-.04,H-.02,'tex:blinds:.8',(f+t)/2,(sill+head)/2,mid+s*(th/2-.04),0,s>0?0:PI):plane(G,W-.04,H-.02,'tex:blinds:.8',mid+s*(th/2-.04),(sill+head)/2,(f+t)/2,0,s>0?PI/2:-PI/2);
    m.material=M('tex:blinds:.8');m.material.side=T.DoubleSide;const g=m.geometry.clone();g.attributes.uv.array.forEach((v,i,a)=>{if(i%2)a[i]=v*H*4});m.geometry=g;CT.blinds.wrapT=T.RepeatWrapping}}
function doorSlab(w,h,o={}){const g=new T.Group(),t=.042,col=o.col||'trim:#f4f2ec';const S=new T.Group();g.add(S);S.position.x=w/2;
  bx(S,w,h,t,col,0,h/2,0);
  /* three recessed panels each side (shaker) */
  const rail=.11,st=.11;const panels=o.lite?[[h*.62,h-rail,'glass'],[rail,h*.62-rail*.5]]:[[h*.55,h-rail],[rail,h*.55-rail*.6]];
  for(const sgn of[-1,1])for(const[p0,p1,kind]of panels){const pw=w-2*st,ph=p1-p0,z=sgn*(t/2);
    if(kind==='glass'){const gl=bx(S,pw,ph,.01,'glass',0,(p0+p1)/2,0);gl.castShadow=false;gl.userData.dynGlass=1;for(let i=1;i<3;i++)bx(S,.025,ph,t+.004,col,-pw/2+pw*i/3,(p0+p1)/2,0);continue}
    bx(S,pw+.024,.012,.008,col,0,p1+.006,z+sgn*.004);bx(S,pw+.024,.012,.008,col,0,p0-.006,z+sgn*.004);bx(S,.012,ph+.024,.008,col,-pw/2-.006,(p0+p1)/2,z+sgn*.004);bx(S,.012,ph+.024,.008,col,pw/2+.006,(p0+p1)/2,z+sgn*.004)}
  /* lever handles both sides */
  for(const sgn of[-1,1]){const z=sgn*(t/2+.012);cyl(S,.028,.028,.012,'nickel',w/2-.07,1.0,z).rotation.x=PI/2;bx(S,.11,.018,.018,'nickel',w/2-.12,1.0,z+sgn*.018);if(o.deadbolt)cyl(S,.022,.022,.014,'nickel',w/2-.07,1.15,z).rotation.x=PI/2}
  /* hinges */
  for(const y of[.25,h/2+.1,h-.25])bx(S,.012,.09,.03,'brass',-w/2,y,0);
  if(o.extCol){/* exterior face painted */const p=bx(S,w,h,.004,o.extCol,0,h/2,-t/2-.002);}
  return g}
/* doors: hinge on the 'f' side; open swings into the side given by 'swing' (-1 → towards -axis-normal side) */
const DOOR_CFG={front:{auto:false,col:'trim:#f4f2ec',extCol:'cab:#2f4b6e',lite:true,deadbolt:1,swing:1},garage:{auto:true,swing:1},bed:{auto:true,swing:1,open:1},kids:{auto:false,sign:'kids'},bath:{auto:false,swing:1},gback:{auto:true,swing:-1,lite:true}};
function doorUnit(G,w,alongX,f,t,head,mid,th,id){const cfg=DOOR_CFG[id]||{};const W=t-f-.03,H=head-.02;const pivot=new T.Group();pivot.userData.dyn=1;
  const slab=doorSlab(W,H,cfg);pivot.add(slab);G.add(pivot);
  const sgn=cfg.swing||1;
  if(alongX){pivot.position.set(f+.015,0,mid);}else{pivot.position.set(mid,0,f+.015);pivot.rotation.y=-PI/2}
  const base=pivot.rotation.y;const openAng=-sgn*PI*.5*(alongX?1:1);
  const c=alongX?{x0:f,z0:mid-.06,x1:t,z1:mid+.06}:{x0:mid-.06,z0:f,x1:mid+.06,z1:t};
  const d={id,pivot,base,openAng,amt:cfg.open?1:0,target:cfg.open?1:0,auto:cfg.auto,c,cx:alongX?(f+t)/2:mid,cz:alongX?mid:(f+t)/2,colliding:!cfg.open};
  STATIC.colliders.push(c);d.colRef=c;if(cfg.open){c.x0=c.x1=c.z0=c.z1=-999}
  pivot.rotation.y=base+openAng*d.amt;DOORS.push(d);
  STATIC.reserve.push(alongX?{x0:f-.2,z0:mid-1.0,x1:t+.2,z1:mid+1.0}:{x0:mid-1.0,z0:f-.2,x1:mid+1.0,z1:t+.2});
  if(cfg.sign==='kids'){const tex=ctex(crayonSign(),true,false);const s=alongX?-1:1;}
  return d}
function crayonSign(){return canvas(256,128,(x,w,h)=>{x.fillStyle='#fffdf3';x.fillRect(0,0,w,h);x.strokeStyle='#e5533d';x.lineWidth=6;x.strokeRect(6,6,w-12,h-12);x.font='bold 30px Comic Sans MS, cursive';x.fillStyle='#2f5d9e';x.textAlign='center';x.fillText('TYLER + MADDIE',w/2,52);x.fillStyle='#c2185b';x.font='bold 24px Comic Sans MS, cursive';x.fillText('KNOCK FIRST!!',w/2,96)})}
function sliderUnit(G,alongX,f,t,head,mid,th){const fr='trim:#f2f1ec',W=t-f,ph=head-.04;
  const put=(a0,a1,y0,y1,d,off,mat=fr,par=G)=>alongX?bx(par,a1-a0,y1-y0,d,mat,(a0+a1)/2,(y0+y1)/2,mid+off):bx(par,d,y1-y0,a1-a0,mat,mid+off,(y0+y1)/2,(a0+a1)/2);
  put(f,t,0,.035,th+.01,0,'metal:#9a9a96:.4');put(f,t,head-.05,head,th,0);put(f,f+.05,0,head,th,0);put(t-.05,t,0,head,th,0);
  /* fixed panel (outer track) on the 't' side, sliding panel (inner track) on the 'f' side */
  const panel=(par,a0,a1,off)=>{put(a0,a1,.035,.12,.05,off,fr,par);put(a0,a1,ph-.07,ph,.05,off,fr,par);put(a0,a0+.07,.035,ph,.05,off,fr,par);put(a1-.07,a1,.035,ph,.05,off,fr,par);
    const g=put(a0+.07,a1-.07,.12,ph-.07,.008,off,'glass',par);g.castShadow=false;g.userData.dynGlass=1;return g};
  panel(G,(f+t)/2-.03,t-.05,.03);const sl=new T.Group();sl.userData.dyn=1;G.add(sl);panel(sl,f+.05,(f+t)/2+.03,-.03);
  /* handle */
  put((f+t)/2-.07,(f+t)/2-.04,.95,1.15,.03,-.06,'nickel',sl);
  const c=alongX?{x0:f,z0:mid-.08,x1:t,z1:mid+.08}:{x0:mid-.08,z0:f,x1:mid+.08,z1:t};STATIC.colliders.push(c);
  const fixedC=alongX?{x0:(f+t)/2,z0:mid-.08,x1:t,z1:mid+.08}:{x0:mid-.08,z0:(f+t)/2,x1:mid+.08,z1:t};STATIC.colliders.push(fixedC);
  DOORS.push({id:'slider',slide:sl,alongX,len:W/2-.08,amt:0,target:0,auto:true,c,cx:alongX?(f+(f+t)/2)/2:mid,cz:alongX?mid:(f+(f+t)/2)/2,colRef:c,colliding:true});
  STATIC.reserve.push(alongX?{x0:f-.2,z0:mid-1.1,x1:t+.2,z1:mid+1.1}:{x0:mid-1.1,z0:f-.2,x1:mid+1.1,z1:t+.2})}
function garageDoor(G,w,f,t,head,mid){const W=t-f,secs=4,sh=head/secs;const z=mid;
  for(let i=0;i<secs;i++){const y0=i*sh;bx(G,W,sh-.012,.045,'trim:#f3f2ee',(f+t)/2,y0+sh/2,z);
    const np=4;for(let k=0;k<np;k++){const a0=f+.12+k*(W-.24)/np,a1=a0+(W-.24)/np-.1;
      if(i===secs-1){const gl=bx(G,a1-a0,sh*.42,.05,'blackglass',(a0+a1)/2,y0+sh*.5,z);continue}
      for(const s of[-1,1])bx(G,a1-a0,sh*.5,.012,'trim:#f6f5f1',(a0+a1)/2,y0+sh*.5,z+s*.028)}}
  /* tracks + opener inside the garage */
  for(const x of[f-.06,t+.06]){bx(G,.05,head+.1,.08,'metal:#8d9196',x,(head+.1)/2,z+.1);bx(G,.05,.08,3.2,'metal:#8d9196',x,head+.25,z+1.7)}
  bx(G,.06,.06,3.6,'metal:#7b7f84',(f+t)/2,CEIL-.08,z+1.9);bc(G,(f+t)/2-.2,CEIL-.42,3.6,(f+t)/2+.2,CEIL-.2,4.05,'flat:#e9e7e1:.6');bx(G,.16,.03,.1,'glow:#fff4dc:1.5',(f+t)/2,CEIL-.43,3.82);
  for(const x of[(f+t)/2-.4,(f+t)/2+.4])bx(G,.03,.32,.03,'metal:#7b7f84',x,CEIL-.16,3.8)}
function buildFloors(G){const B=new BucketSet();
  for(const fl of FLOORS){const[x0,z0,x1,z1]=fl.r;B.of(fl.mat).quad([x0,0,z1],[x1,0,z1],[x1,0,z0],[x0,0,z0],[0,1,0],floorUV2)}
  /* ceilings (facing down) */
  B.of('ceil').quad([0,CEIL,0],[15,CEIL,0],[15,CEIL,10],[0,CEIL,10],[0,-1,0]);B.of('ceil').quad([-7,CEIL,0],[0,CEIL,0],[0,CEIL,10],[-7,CEIL,10],[0,-1,0]);
  const ms=B.meshes();const ceil=[];for(const m of ms){m.castShadow=m.name==='walls:ceil';m.receiveShadow=true;m.name=m.name.replace('walls:','floor:');if(m.name==='floor:ceil'){ceil.push(m);m.material.side=T.DoubleSide;m.material.shadowSide=T.DoubleSide}G.add(m)}
  /* thresholds / transition strips where tile meets wood */
  for(const[x0,z0,x1,z1]of[[2.98,0,3.02,4],[4.98,4.12,5.02,10],[3,4.04,5,4.08],[-.15,2.3,0,3.2],[9.3,4.45,9.42,5.75],[10.72,3.7,10.84,4.55]])bc(G,x0,0,z0,x1,.006,z1,'wood:#b08a63:.6');
  return{ceil,floors:ms.filter(m=>m.name!=='floor:ceil')}}
/* floor AO: soft darkening near walls, cabinets and fixtures, baked once into a texture (applied as aoMap → only ambient/image light is darkened) */
function bakeFloorAO(){const[X0,Z0,X1,Z1]=AO_RECT,W=Math.round((X1-X0)*AO_PPM),H=Math.round((Z1-Z0)*AO_PPM);const rects=STATIC.aoRects;
  const c=canvas(W,H,(x)=>{const img=x.createImageData(W,H),d=img.data;
    for(let j=0;j<H;j++){const z=Z0+(j+.5)/AO_PPM;for(let i=0;i<W;i++){const px=X0+(i+.5)/AO_PPM;let ao=1;
      for(const r of rects){const dx=Math.max(r.x0-px,0,px-r.x1),dz=Math.max(r.z0-z,0,z-r.z1);if(dx>.6||dz>.6)continue;const dd=Math.hypot(dx,dz);ao*=1-(.42*r.k)*Math.exp(-dd/(.16+.06*r.k))}
      const v=Math.round(clamp(ao,.25,1)*255),o=(j*W+i)*4;d[o]=d[o+1]=d[o+2]=v;d[o+3]=255}}x.putImageData(img,0,0)});
  const t=ctex(c,false,false);t.wrapS=t.wrapT=T.ClampToEdgeWrapping;return t}

/* ======================================================================= exterior: roof, siding details, yard, fence, street */
function buildRoof(G){const ov=.55,x0=-7.2-ov,x1=15.2+ov,zF=-.2-ov,zB=10.2+ov,y0=EXT_H,rise=Math.tan(24*PI/180),zr=5,yr=y0+(zr-zF)*rise;
  const slab=(za,zb)=>{const len=Math.hypot(zb-za,(yr-y0)),ang=Math.atan2(yr-y0,Math.abs(zb-za));const m=bx(G,x1-x0,.06,len,'roof',(x0+x1)/2,(y0+yr)/2+.04,(za+zb)/2);m.rotation.x=(zb>za?-1:1)*ang;m.userData.roof=1;return m};
  const r1=slab(zF,zr),r2=slab(zB,zr);
  /* gable ends (siding triangles) + fascia, soffit, gutters */
  const tri=(x,s)=>{const sh=new T.Shape();sh.moveTo(-.2,y0);sh.lineTo(10.4,y0);sh.lineTo(zr+.2,yr+.02);sh.lineTo(-.2,y0);const g=new T.ShapeGeometry(sh);
    const p=g.attributes.position;const P=[],N=[],U=[];const idx=g.index.array;for(const i of idx){const zz=p.getX(i),yy=p.getY(i);P.push(x,yy,zz);N.push(s,0,0);U.push(zz,yy)}
    const ge=new T.BufferGeometry();ge.setAttribute('position',new T.Float32BufferAttribute(P,3));ge.setAttribute('normal',new T.Float32BufferAttribute(N,3));ge.setAttribute('uv',new T.Float32BufferAttribute(U,2));ge.setAttribute('uv2',new T.Float32BufferAttribute(U,2));
    if(s<0){const a=ge.attributes.position.array;for(let i=0;i<a.length;i+=9){for(let k=0;k<3;k++){const t=a[i+3+k];a[i+3+k]=a[i+6+k];a[i+6+k]=t}}}
    const m=new T.Mesh(ge,M('siding'));m.castShadow=true;m.receiveShadow=true;m.userData.roof=1;G.add(m)};
  tri(-7.2,-1);tri(15.2,1);
  for(const[za,s]of[[zF,1],[zB,-1]]){const f=bx(G,x1-x0,.2,.04,'trim:#f7f6f2',(x0+x1)/2,y0-.04,za);f.userData.roof=1;const so=bx(G,x1-x0-.02,.02,ov,'trim:#f2f0ea',(x0+x1)/2,y0-.12,za+s*ov/2);so.userData.roof=1;
    const gu=cyl(G,.06,.06,x1-x0,'trim:#f2f1ec',(x0+x1)/2,y0+.02,za-s*.05,10,false);gu.rotation.z=PI/2;gu.userData.roof=1}
  for(const x of[x0,x1]){const rk=(za)=>{const len=Math.hypot(zr-za,yr-y0);const m=bx(G,.04,.18,len,'trim:#f7f6f2',x,(y0+yr)/2+.02,(za+zr)/2);m.rotation.x=(zr>za?-1:1)*Math.atan2(yr-y0,Math.abs(zr-za));m.userData.roof=1};rk(zF);rk(zB)}
  /* downspouts */
  for(const[x,z]of[[-7.25,10.3],[15.25,10.3],[-7.25,-.3],[15.25,-.3]])cyl(G,.04,.04,EXT_H,'trim:#f2f1ec',x,EXT_H/2,z,8);
  return[r1,r2]}
function buildExteriorDetails(G){
  /* foundation band */
  for(const[x0,z0,x1,z1]of[[-7.24,-.24,15.24,-.18],[-7.24,10.18,15.24,10.24],[-7.24,-.24,-7.18,10.24],[15.18,-.24,15.24,10.24]])bc(G,x0,-.1,z0,x1,.2,z1,'concrete');
  /* corner boards */
  for(const[x,z]of[[-7.22,-.22],[15.22,-.22],[-7.22,10.22],[15.22,10.22]])bx(G,.12,EXT_H,.12,'trim:#f7f6f2',x,EXT_H/2,z);
  /* front porch, steps, porch light, house number */
  bc(G,.3,-.0,-1.9,3.2,.12,-.2,'concrete');bc(G,.9,0,-2.3,2.1,.06,-1.9,'concrete');
  for(const x of[.45,3.05]){bx(G,.14,2.6,.14,'trim:#f7f6f2',x,1.35,-1.75)}bc(G,.25,2.6,-1.95,3.25,2.72,-.2,'trim:#f7f6f2');
  const pl=new T.Group();pl.position.set(.62,1.85,-.24);G.add(pl);bx(pl,.12,.22,.12,'metal:#1d1d1d:.5',0,0,-.06);bx(pl,.08,.14,.08,'glow:#ffd9a0:1.2',0,0,-.06);
  const num=ctex(textCanvas('1247',{w:256,h:96,bg:'#f7f6f2',fg:'#1d2733',font:'bold 64px Georgia, serif'}),true,false);pic(G,.42,.16,num,2.25,2.35,-.23,PI);
  /* AC unit on the east side, hose bib */
  const ac=new T.Group();ac.position.set(15.75,0,8.6);G.add(ac);bc(ac,-.4,0,-.4,.4,.08,.4,'concrete');bx(ac,.72,.62,.72,'flat:#9da3a6:.5',0,.4,0);cyl(ac,.27,.27,.02,'flat:#2a2c2e:.8',0,.72,0,20);bx(ac,.74,.04,.74,'flat:#8b9194:.5',0,.74,0);col(15.35,8.2,16.15,9.0);
  put(G,'garden_hose_wall_mounted_01',{h:.5},14.2,.55,10.3,0);
  put(G,'trash_can',{h:1.0},-7.75,0,9.0);put(G,'trash_can',{h:1.0},-7.75,0,8.2);col(-8.2,7.8,-7.25,9.4);
}
function fenceRun(G,a,b,h=1.8){const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz),ang=Math.atan2(dx,dz),n=Math.max(1,Math.round(L/2.4));
  for(let i=0;i<=n;i++){const t=i/n,x=a[0]+dx*t,z=a[1]+dz*t;bx(G,.11,h+.12,.11,'fence',x,(h+.12)/2,z);bx(G,.14,.04,.14,'fence',x,h+.14,z)}
  const g=new T.Group();g.position.set((a[0]+b[0])/2,0,(a[1]+b[1])/2);g.rotation.y=ang;G.add(g);
  bx(g,.022,h-.1,L,'fence',0,h/2+.02,0);bx(g,.05,.09,L,'fence',.035,.35,0);bx(g,.05,.09,L,'fence',.035,h-.3,0);bx(g,.03,.06,L,'fence',-.026,h-.02,0);
  const c=Math.abs(dx)>Math.abs(dz)?{x0:Math.min(a[0],b[0]),z0:a[1]-.08,x1:Math.max(a[0],b[0]),z1:a[1]+.08}:{x0:a[0]-.08,z0:Math.min(a[1],b[1]),x1:a[0]+.08,z1:Math.max(a[1],b[1])};col(c.x0,c.z0,c.x1,c.z1,{ao:false})}
function buildGround(G){const B=new BucketSet();
  /* one large lawn, then hard surfaces slightly above it */
  B.of('grass').quad([-60,-.012,60],[60,-.012,60],[60,-.012,-60],[-60,-.012,-60],[0,1,0],p=>[0,0]);
  const slab=(k,x0,z0,x1,z1,y=-.004)=>B.of(k).quad([x0,y,z1],[x1,y,z1],[x1,y,z0],[x0,y,z0],[0,1,0],p=>[0,0]);
  slab('concrete',-6.6,-11,-.8,-.2);slab('concrete',1.0,-11,2.0,-2.3);slab('concrete',-60,-12.6,60,-11);slab('asphalt',-60,-20.5,60,-12.6);slab('concrete',-60,-22.1,60,-20.5);
  /* mulch beds along the back fence and the front of the house */
  slab('mulch',-7,22.6,15,23.9,-.002);slab('mulch',3.3,-1.4,15,-.2,-.002);slab('mulch',-7,10.2,-2.2,11.2,-.002);
  for(const m of B.meshes()){m.castShadow=false;m.receiveShadow=true;m.name='ground:'+m.name;G.add(m)}
  /* curb */
  bc(G,-60,0,-11.05,60,.12,-10.9,'concrete');bc(G,-60,0,-20.65,60,.12,-20.5,'concrete')}

Home._arch={buildWalls,buildFloors,bakeFloorAO,buildRoof,buildExteriorDetails,fenceRun,buildGround,BucketSet,STATIC,DOORS,WINDOWS,mergeStatic};



/* ======================================================================= fixtures: kitchen */
const CAB='cab:#f0eee8',ISL='cab:#6f8471',PULL='nickel';
function shakerFront(G,w,h,x,y,z,col,{pull='v',pullSide=1}={}){/* front at local z (facing +z) */const t=.02,fr=.06;
  bx(G,w-.004,h-.004,t,col,x,y,z+t/2);
  bx(G,w-.004,fr,.008,col,x,y+h/2-fr/2,z+t+.004);bx(G,w-.004,fr,.008,col,x,y-h/2+fr/2,z+t+.004);bx(G,fr,h-2*fr,.008,col,x-w/2+fr/2,y,z+t+.004);bx(G,fr,h-2*fr,.008,col,x+w/2-fr/2,y,z+t+.004);
  if(pull==='v'){const px=x+pullSide*(w/2-.05),py=y+(h>.5?(y<1.3?h/2-.12:-h/2+.12):0);bx(G,.012,.16,.012,PULL,px,py,z+t+.03);bx(G,.01,.01,.025,PULL,px,py+.07,z+t+.016);bx(G,.01,.01,.025,PULL,px,py-.07,z+t+.016)}
  else if(pull==='h'){bx(G,.16,.012,.012,PULL,x,y+h/2-.05,z+t+.03);bx(G,.01,.01,.025,PULL,x-.07,y+h/2-.05,z+t+.016);bx(G,.01,.01,.025,PULL,x+.07,y+h/2-.05,z+t+.016)}
  else if(pull==='hc'){bx(G,.16,.012,.012,PULL,x,y,z+t+.03);bx(G,.01,.01,.025,PULL,x-.07,y,z+t+.016);bx(G,.01,.01,.025,PULL,x+.07,y,z+t+.016)}}
/* base cabinet run in local space: along +x, back at z=0, fronts at z=D facing +z. segs: [type,width]. returns sink centre (local x) if any */
function baseRun(G,segs,{col=CAB,top='quartz',D=.6,topD=.64,splash=null,uppers=null,topOverBack=0}={}){let x=0,sinkX=null,rangeX=null;const H=.88,TK=.1;
  for(const[type,w]of segs){const cx=x+w/2;
    if(type==='range'){rangeX=cx;range(G,cx,w,D);x+=w;continue}
    if(type==='dw'){bc(G,x+.003,TK,0,x+w-.003,H,D-.005,'steel');bx(G,w-.01,.1,.01,'blackglass',cx,H-.06,D);bx(G,w-.12,.016,.016,'steel',cx,H-.16,D+.04);for(const s of[-1,1])bx(G,.012,.012,.035,'steel',cx+s*(w/2-.08),H-.16,D+.02);bc(G,x,0,0,x+w,TK,D-.06,'flat:#1b1b1b:.9');x+=w;continue}
    bc(G,x,TK,0,x+w,H,D-.02,col);bc(G,x+.01,0,0,x+w-.01,TK,D-.07,'flat:#2a2622:.9');
    if(type==='filler'){bx(G,w-.004,H-TK-.004,.02,col,cx,(H+TK)/2,D-.01)}
    else if(type==='drawers'){const hs=[.2,.27,.29];let y=H-.01;for(const hh of hs){shakerFront(G,w-.006,hh-.006,cx,y-hh/2,D-.02,col,{pull:'h'});y-=hh}}
    else if(type==='sink'){sinkX=cx;shakerFront(G,w-.006,.16,cx,H-.09,D-.02,col,{pull:'none'});shakerFront(G,w/2-.006,H-TK-.2,cx-w/4,TK+(H-TK-.2)/2+.005,D-.02,col,{pull:'v',pullSide:1});shakerFront(G,w/2-.006,H-TK-.2,cx+w/4,TK+(H-TK-.2)/2+.005,D-.02,col,{pull:'v',pullSide:-1})}
    else{const n=type==='door2'?2:1;shakerFront(G,w-.006,.16,cx,H-.09,D-.02,col,{pull:'hc'});for(let i=0;i<n;i++){const ww=w/n;shakerFront(G,ww-.006,H-TK-.2,x+ww*(i+.5),TK+(H-TK-.2)/2+.005,D-.02,col,{pull:'v',pullSide:n===2?(i?-1:1):-1})}}
    x+=w}
  const L=x,T0=H,T1=H+.035;
  /* countertop with an undermount sink opening and a range gap */
  const tops=[];let a=-topOverBack;const cuts=[];if(sinkX!=null)cuts.push([sinkX-.39,sinkX+.39,'sink']);if(rangeX!=null)cuts.push([rangeX-.38,rangeX+.38,'range']);cuts.sort((p,q)=>p[0]-q[0]);
  for(const[c0,c1,k]of cuts){tops.push([a,c0]);if(k==='sink'){bc(G,c0,T0,-topOverBack,c1,T1,.07,top);bc(G,c0,T0,topD-.07,c1,T1,topD,top);sink(G,(c0+c1)/2,T0,(topD+.07)/2-.0)}a=c1}tops.push([a,L]);
  for(const[t0,t1]of tops)if(t1-t0>.01)bc(G,t0,T0,-topOverBack,t1,T1,topD,top);
  /* splash */
  if(splash)for(const[s0,s1,y1]of splash)bc(G,s0,T1,-.0,s1,y1,.012,'subway');
  if(uppers)for(const[u0,u1]of uppers)upperRun(G,u0,u1);
  return{L,sinkX,rangeX}}
function upperRun(G,u0,u1){const y0=1.42,y1=2.24,D=.34,n=Math.max(1,Math.round((u1-u0)/.45));bc(G,u0,y0,0,u1,y1,D-.02,CAB);
  for(let i=0;i<n;i++){const w=(u1-u0)/n,cx=u0+w*(i+.5);shakerFront(G,w-.006,y1-y0-.006,cx,(y0+y1)/2,D-.02,CAB,{pull:'v',pullSide:i%2?-1:1})}
  /* crown + light rail with warm LED strip underneath */
  bc(G,u0-.02,y1,-.0,u1+.02,y1+.05,D+.03,'trim');bc(G,u0,y0-.03,0,u1,y0,D,CAB);
  const led=bc(G,u0+.03,y0-.034,.04,u1-.03,y0-.03,.07,'glow:#ffd7a0:2.2');led.castShadow=false;led.userData.emis=1}
function sink(G,cx,y,cz){const w=.76,d=.46,dep=.22,t=.012;
  bc(G,cx-w/2,y-dep,cz-d/2,cx+w/2,y-dep+t,cz+d/2,'steel');for(const s of[-1,1]){bx(G,t,dep,d,'steel',cx+s*(w/2-t/2),y-dep/2,cz);bx(G,w,dep,t,'steel',cx,y-dep/2,cz+s*(d/2-t/2))}
  cyl(G,.03,.03,.01,'chrome',cx,y-dep+.015,cz,12);
  /* gooseneck faucet */
  const fz=cz-d/2-.06;cyl(G,.028,.032,.06,'chrome',cx,y+.03,fz,14);tube(G,[[cx,y+.05,fz],[cx,y+.32,fz],[cx,y+.4,fz+.06],[cx,y+.38,fz+.16],[cx,y+.3,fz+.2]],.014,'chrome',20);
  bx(G,.012,.012,.09,'chrome',cx+.06,y+.1,fz).rotation.x=-.5;cyl(G,.016,.016,.06,'chrome',cx+.06,y+.06,fz,8)}
function range(G,cx,w,D){const H=.92;bc(G,cx-w/2,0,0,cx+w/2,H-.02,D,'steel');bc(G,cx-w/2,H-.025,0,cx+w/2,H,D+.01,'blackglass');
  const hob=plane(G,w-.04,D-.06,'blackglass',cx,H+.0015,D/2+.01,-PI/2);hob.material=new T.MeshStandardMaterial({map:CT.hob,roughness:.08,envMapIntensity:1});
  /* control panel, oven door with window, handle, drawer */
  bx(G,w-.02,.1,.03,'steel',cx,H-.08,D+.015);for(let i=0;i<5;i++)cyl(G,.018,.018,.025,'flat:#1a1a1a:.4',cx-.26+i*.13,H-.08,D+.04,12).rotation.x=PI/2;
  bx(G,w-.04,.5,.02,'steel',cx,.5,D+.01);bx(G,w-.2,.26,.005,'blackglass',cx,.52,D+.022);bx(G,w-.12,.022,.022,'steel',cx,.73,D+.06);for(const s of[-1,1])bx(G,.015,.015,.04,'steel',cx+s*(w/2-.1),.73,D+.035);
  bx(G,w-.04,.14,.02,'steel',cx,.14,D+.01);bx(G,w-.3,.015,.015,'steel',cx,.17,D+.035)}
function hood(G,cx,z0){/* chimney hood on a wall, local: centred at cx, back at z0 */const w=.78;const lower=new T.Mesh(new T.CylinderGeometry(.14*Math.SQRT2,.47*Math.SQRT2,.3,4,1,true),M('steel'));lower.rotation.y=PI/4;lower.scale.set(1,1,.5/.94*1.25);lower.position.set(cx,1.72,z0+.25);G.add(lower);
  lower.castShadow=true;lower.material.side=T.DoubleSide;bx(G,w,.05,.5,'steel',cx,1.56,z0+.25);bx(G,.3,CEIL-1.85,.24,'steel',cx,(CEIL+1.85)/2,z0+.12);bx(G,w-.1,.006,.4,'glow:#fff2d8:1.2',cx,1.533,z0+.25)}
function fridge(G){/* french-door fridge on the west wall, front facing +x */const g=new T.Group();g.position.set(0,0,4.6);g.rotation.y=PI/2;G.add(g);const W=.92,H=1.8,D=.74;
  bc(g,-W/2,0,0,W/2,H,D-.06,'flat:#2a2b2d:.5');bc(g,-W/2,.03,D-.07,W/2,.1,D-.02,'flat:#1a1a1a:.8');
  rbx(g,W/2-.006,H*.6,.06,.01,'steel',-W/4,H*.6/2+H*.4+.005-.005,D-.04);rbx(g,W/2-.006,H*.6,.06,.01,'steel',W/4,H*.6/2+H*.4,D-.04);rbx(g,W-.006,H*.38-.01,.06,.01,'steel',0,.11+H*.38/2-.01,D-.04);
  for(const s of[-1,1]){bx(g,.022,.7,.022,'steel',s*.03,H*.72,D+.04);for(const y of[H*.72-.33,H*.72+.33])bx(g,.016,.016,.05,'steel',s*.03,y,D+.015)}
  bx(g,.5,.022,.022,'steel',0,.11+H*.38-.06,D+.04);
  /* water/ice dispenser */
  bx(g,.18,.28,.01,'flat:#1c1d1f:.3',-W/4,1.22,D-.005);bx(g,.12,.03,.008,'glow:#9fd3ff:1.1',-W/4,1.33,D);
  /* over-fridge cabinet + side panels */
  bc(g,-W/2-.03,H+.04,-0,W/2+.03,2.24,D,CAB);shakerFront(g,W/2,2.24-H-.06,-W/4,(H+.04+2.24)/2,D-.02,CAB,{pull:'none'});shakerFront(g,W/2,2.24-H-.06,W/4,(H+.04+2.24)/2,D-.02,CAB,{pull:'none'});bc(g,-W/2-.03,2.24,0,W/2+.03,2.29,D+.03,'trim');
  bc(g,W/2,0,0,W/2+.03,2.24,D+.01,CAB);
  /* kids' drawings, a takeout menu, a "TODO: GUTTERS" note and magnets */
  const art=[[0,-.26,1.45,.21,.27,-.06],[1,.24,1.5,.2,.25,.05],[2,-.24,.5,.2,.25,.04],[3,.22,.48,.24,.2,-.03]];
  for(const[k,x,y,w,h,r]of art){const tx=ctex(crayonCanvas(k),true,false);const m=pic(g,w,h,tx,x,y,D+.026);m.rotation.z=r;sph(g,.012,rpick(['flat:#e5533d:.4','flat:#2f5d9e:.4','flat:#ffc94a:.4','flat:#4caf50:.4']),x,y+h/2-.02,D+.03,8)}
  const note=ctex(textCanvas(['TODO:','GUTTERS!!','(seriously)'],{w:200,h:200,bg:'#fff59d',fg:'#333',font:'bold 30px Comic Sans MS, cursive'}),true,false);pic(g,.1,.1,note,-.08,1.18,D+.026).rotation.z=.08;
  col(0,4.12,.8,5.08,{k:1.2});STATIC.noWall.push({wall:'west',s:4,e:5.2});return g}
function kitchenRuns(G){
  /* west run (back on the x=0 wall, fronts facing +x) */
  const W=new T.Group();W.position.set(0,0,9.38);W.rotation.y=PI/2;G.add(W);
  baseRun(W,[['drawers',.9],['door2',.9],['range',.76],['door2',.9],['drawers',.82]],{splash:[[0,1.8,1.42],[1.8,2.56,1.55],[2.56,4.28,1.42]],uppers:[[0,1.75],[2.61,4.28]]});
  hood(W,2.18,0);
  col(0,5.08,.64,9.38,{k:1.3});
  /* back run (back on the z=10 wall, fronts facing -z): local x runs from world x=4.4 → 0 */
  const B=new T.Group();B.position.set(4.4,0,10);B.rotation.y=PI;G.add(B);
  baseRun(B,[['door2',.9],['dw',.6],['filler',.25],['sink',.9],['door2',.9],['door',.85]],{splash:[[0,1.32,1.42],[1.32,3.08,1.04],[3.08,4.4,1.42]],uppers:[[0,1.25],[3.15,4.4]]});
  col(0,9.36,4.4,10,{k:1.3});
  /* island: cabinets face west, seating overhang on the east */
  const I=new T.Group();I.position.set(3.0,0,5.9);I.rotation.y=-PI/2;G.add(I);
  baseRun(I,[['door2',.8],['drawers',.8],['door2',.8]],{col:ISL,topD:.98,topOverBack:-.0});
  /* back panel with shaker panels + end panels */
  for(let i=0;i<3;i++){const g=new T.Group();g.position.set(.4+i*.8,0,0);g.rotation.y=PI;I.add(g);shakerFront(g,.78,.76,0,.5,-.0,ISL,{pull:'none'})}
  for(const s of[0,2.4]){bc(I,s-.02,0,0,s+.02,.88,.6,ISL)}
  bc(I,-.04,.88,-.38,2.44,.92,.62,'quartz');
  col(2.0,5.86,3.0,8.34,{k:1.2});col(3.0,5.86,3.4,8.34,{collide:false,k:.5});
  /* pendants over the island */
  for(const z of[6.45,7.1,7.75]){const p=put(G,'modern_ceiling_lamp_01',{h:.62},2.5,CEIL-.62,z);sph(G,.05,'glow:#ffe2b8:6',2.5,CEIL-.48,z,10);cyl(G,.05,.05,.02,'metal:#2a2a2a',2.5,CEIL-.01,z,12)}
  /* counter stools (east side) */
  for(const z of[6.45,7.1,7.75])stool(G,3.62,z);
  fridge(G);
  /* microwave in the upper run (west), toaster, coffee maker, fruit, knife block, utensils, cutting board, paper towels, dish soap */
  const cm=new T.Group();cm.position.set(.3,.92,8.6);G.add(cm);bx(cm,.22,.34,.26,'flat:#1b1c1e:.4',0,.17,0);bx(cm,.18,.12,.02,'blackglass',.0,.08,.14);cyl(cm,.06,.055,.13,'chrome',.0,.07,.06,14);
  put(G,'wooden_cutting_board',{w:.42},1.3,.955,9.62,.1);put(G,'wooden_bowl_01',{w:.3},2.5,.955,6.6);for(let i=0;i<4;i++)put(G,'food_apple_01',{w:.08},2.45+rr(-.06,.06),1.0,6.6+rr(-.06,.06),rr(0,6));
  put(G,'jug_01',{h:.2},.32,.955,6.0,PI/2);put(G,'ceramic_vase_01',{h:.25},3.8,.955,9.68);
  /* knife block + utensil crock */
  const kb=new T.Group();kb.position.set(.3,.955,6.35);G.add(kb);bx(kb,.12,.2,.16,'butcher',0,.1,0).rotation.z=-.25;for(let i=0;i<4;i++)bx(kb,.012,.06,.025,'flat:#111:.4',-.02+i*.01,.23,-.05+i*.03);
  const uc=new T.Group();uc.position.set(.3,.955,8.2);G.add(uc);cyl(uc,.06,.055,.16,'flat:#f2efe8:.3',0,.08,0,14);for(let i=0;i<5;i++){const u=cyl(uc,.007,.007,.3,'butcher',rr(-.03,.03),.22,rr(-.03,.03),6);u.rotation.z=rr(-.25,.25);u.rotation.x=rr(-.25,.25)}
  /* paper towel + soap by the sink */
  cyl(G,.06,.06,.26,'flat:#f8f6f0:.9',3.7,1.09,9.75,16);cyl(G,.01,.01,.3,'chrome',3.7,1.09,9.75,6);
  cyl(G,.03,.03,.17,'flat:#58a779:.2',1.68,1.04,9.8,12);
  /* calendar + cork board above the desk on the kitchen side of the entry wall */
  STATIC.noWall.push({wall:'entrywall',s:0,e:3})}
function stool(G,x,z){const g=new T.Group();g.position.set(x,0,z);G.add(g);cyl(g,.19,.17,.05,'butcher',0,.66,0,20);
  for(let i=0;i<4;i++){const a=i*PI/2+PI/4;const l=cyl(g,.012,.014,.66,'metal:#2a2a2a:.4',Math.cos(a)*.13,.33,Math.sin(a)*.13,8);l.rotation.z=Math.cos(a)*.12;l.rotation.x=-Math.sin(a)*.12}
  torus(g,.165,.008,'metal:#2a2a2a:.4',0,.24,0);col(x-.2,z-.2,x+.2,z+.2,{k:.4});return g}

/* ======================================================================= fixtures: entry, laptop desk, hall, bedroom */
function entry(G,ctx){
  /* bench + coat hooks on the west (garage) wall, shoes, doormat, console */
  const b=new T.Group();b.position.set(0,0,1.15);b.rotation.y=PI/2;G.add(b);
  bc(b,-.55,.42,0,.55,.46,.38,'wood:#8a6142:.8');bc(b,-.55,0,.02,-.51,.42,.36,'wood:#8a6142:.8');bc(b,.51,0,.02,.55,.42,.36,'wood:#8a6142:.8');bc(b,-.53,.08,.03,.53,.1,.35,'wood:#8a6142:.8');
  rbx(b,1.06,.06,.34,.025,'linen:#5a6e7d',0,.49,.19);
  bc(b,-.6,1.62,0,.6,1.72,.02,'wood:#8a6142:.8');for(let i=0;i<5;i++){cyl(b,.012,.012,.07,'brass',-.48+i*.24,1.67,.05,8).rotation.x=PI/2}
  /* jackets and a backpack hanging */
  const coat=(x,c,len=.7)=>{const g=new T.Group();g.position.set(x,1.64,.09);b.add(g);const m=rbx(g,.4,len,.12,.05,'linen:'+c+':.25',0,-len/2,0);m.rotation.z=rr(-.04,.04);rbx(g,.2,.1,.13,.04,'linen:'+c+':.25',0,-.02,.0)};
  coat(-.48,'#3b4a5c');coat(-.24,'#8c3b2f',.62);coat(.24,'#d7c49e',.55);
  const bp=new T.Group();bp.position.set(.48,1.25,.13);b.add(bp);rbx(bp,.3,.4,.16,.06,'linen:#2f7d6d:.25',0,0,0);rbx(bp,.22,.16,.06,.03,'linen:#2a6d60:.25',0,-.07,.09);
  /* shoes under and beside the bench */
  const shoe=(x,z,r,c)=>{const g=new T.Group();g.position.set(x,0,z);g.rotation.y=r;b.add(g);rbx(g,.1,.03,.27,.015,'flat:#f2f0ea:.7',0,.015,0);rbx(g,.095,.07,.22,.04,c,0,.06,-.015)};
  R=rng(5);[[-.42,.2,'#2f3d4f'],[-.2,.18,'#a33b2b'],[.05,.22,'#e8e4dc'],[.32,.2,'#4b4b4b']].forEach(([x,z,c],i)=>{shoe(x-.05,z,rr(-.2,.2),'flat:'+c+':.6');shoe(x+.06,z+rr(-.03,.03),rr(-.2,.2),'flat:'+c+':.6')});
  shoe(.75,.25,.5,'flat:#e5533d:.6');shoe(.86,.32,.9,'flat:#e5533d:.6');shoe(.7,.6,-.4,'flat:#ffc94a:.5');
  col(0,.55,.42,1.75,{k:1});
  /* doormat inside the front door */
  const mt=ctex(textCanvas(['WIPE YOUR','PAWS'],{w:512,h:320,bg:'#8a6a45',fg:'#2b1f14',font:'bold 70px Georgia, serif',border:'#2b1f14'}),true,false);
  const mat=plane(G,.9,.56,'flat:#8a6a45',1.48,.008,.55,-PI/2);mat.material=new T.MeshStandardMaterial({map:mt,roughness:1,normalMap:texSet(CT.carpet,.2).normalMap,envMapIntensity:IENV});mat.rotation.z=PI;
  /* console table on the entry side of the kitchen wall, mirror above, key bowl, plant, family photo */
  const c=new T.Group();c.position.set(1.7,0,4.0);c.rotation.y=PI;G.add(c);
  bc(c,-.6,.78,0,.6,.82,.34,'wood:#5e4330:.8');for(const s of[-1,1])for(const z of[.03,.31])bc(c,s*.57-.02,0,z-.02,s*.57+.02,.78,z+.02,'metal:#222:.5');bc(c,-.58,.18,.02,.58,.21,.32,'wood:#5e4330:.8');
  put(c,'wooden_bowl_01',{w:.24},.25,.82,.17);bx(c,.06,.01,.03,'brass',.25,.86,.17).rotation.y=.6;put(c,'potted_plant_04',{h:.32},-.42,.82,.17);put(c,'standing_picture_frame_01',{h:.24},-.12,.82,.12,.2);
  put(c,'wicker_basket_01',{w:.34},-.3,0,.17);put(c,'wicker_basket_01',{w:.34},.3,0,.17);
  const mir=new T.Group();mir.position.set(0,1.55,.0);c.add(mir);torus(mir,.36,.025,'brass',0,0,.03,0);const mg=new T.Mesh(new T.CircleGeometry(.36,40),new T.MeshStandardMaterial({color:lin('#a4abb0'),metalness:1,roughness:.04,envMapIntensity:.7}));mg.position.z=.025;mir.add(mg);
  col(1.1,3.66,2.3,4.0,{k:.8});
  /* light switches by the doors */
  for(const[x,z,ry]of[[2.2,.02,0],[-.0+.02,2.15,PI/2],[3.02,3.95,PI/2]]){const s=new T.Group();s.position.set(x,1.2,z);s.rotation.y=ry;G.add(s);bx(s,.075,.12,.008,'trim:#f7f6f2',0,0,0);bx(s,.012,.025,.012,'trim:#f7f6f2',0,0,.008)}}
function laptopDesk(G,ctx){/* "Dadazon" desk on the kitchen side of the entry wall, facing +z */const g=new T.Group();g.position.set(1.85,0,4.12);G.add(g);
  bc(g,-.62,.73,0,.62,.765,.56,'butcher');bc(g,-.6,0,.02,-.2,.73,.54,CAB);shakerFront(g,.4,.18,-.4,.62,.54,CAB,{pull:'h'});shakerFront(g,.4,.5,-.4,.3,.54,CAB,{pull:'h'});
  for(const x of[.57])for(const z of[.05,.5])bc(g,x-.02,0,z-.02,x+.02,.73,z+.02,'metal:#2a2a2a:.4');
  /* laptop */
  const L=new T.Group();L.position.set(.12,.765,.3);L.rotation.y=-.12;g.add(L);bx(L,.34,.014,.24,'metal:#9ea2a6:.35',0,.007,0);bx(L,.3,.002,.1,'flat:#2a2a2c:.5',0,.015,-.03);
  const lid=new T.Group();lid.position.set(0,.014,-.12);lid.rotation.x=-.32;L.add(lid);bx(lid,.34,.23,.008,'metal:#9ea2a6:.35',0,.115,-.004);
  const scr=new T.Mesh(new T.PlaneGeometry(.31,.2),new T.MeshBasicMaterial({map:ctex(canvas(512,330,drawDadazon),true,false),toneMapped:false}));scr.position.set(0,.115,.001);scr.material.color.setScalar(1.2);lid.add(scr);
  /* mail, mug, pencil cup, sticky notes, cork board + calendar */
  for(let i=0;i<4;i++)bx(g,.22,.004,.11,'flat:'+rpick(['#f4f1e8','#e9e0c9','#dfe8f1']),-.38+rr(-.02,.02),.768+i*.004,.25+rr(-.02,.02)).rotation.y=rr(-.3,.3);
  cyl(g,.045,.04,.1,'flat:#2f5d9e:.3',-.15,.815,.38,14);cyl(g,.035,.035,.12,'metal:#333:.5',.5,.825,.12,10);for(let i=0;i<4;i++){const p=cyl(g,.004,.004,.17,'flat:'+rpick(['#ffc94a','#e5533d','#2f5d9e']),.5+rr(-.015,.015),.89,.12+rr(-.015,.015),6);p.rotation.z=rr(-.2,.2)}
  bc(g,-.55,1.05,0,.25,1.62,.015,'wood:#a8825c:.9');const cork=plane(g,.76,.53,'flat:#b88d5f:1',-.15,1.335,.016);cork.material=new T.MeshStandardMaterial({color:lin('#c89b6a'),map:texSet(CT.carpet,.25).map,roughness:1,envMapIntensity:IENV});
  const cal=ctex(canvas(256,256,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);x.fillStyle='#e5533d';x.fillRect(0,0,w,44);x.fillStyle='#fff';x.font='bold 26px sans-serif';x.fillText('NOVEMBER',60,32);x.strokeStyle='#bbb';
    for(let i=0;i<=7;i++){x.beginPath();x.moveTo(i*w/7,44);x.lineTo(i*w/7,h);x.stroke()}for(let j=0;j<=5;j++){x.beginPath();x.moveTo(0,44+j*(h-44)/5);x.lineTo(w,44+j*(h-44)/5);x.stroke()}
    x.font='bold 13px Comic Sans MS, cursive';const notes=[[1,1,'#2f5d9e','soccer'],[3,2,'#e5533d','dentist'],[5,1,'#4caf50','RAID?'],[2,3,'#8e24aa','recital'],[6,4,'#e5533d','HOA'],[4,4,'#2f5d9e','trash']];for(const[cx,cy,c,t]of notes){x.fillStyle=c;x.fillText(t,cx*w/7+3,44+cy*(h-44)/5+22)}}),true,false);
  pic(g,.3,.3,cal,-.32,1.33,.02);for(const[x,y,c,r]of[[.0,1.48,'#fff59d',.1],[.12,1.25,'#b3e5fc',-.12],[-.1,1.18,'#ffccbc',.05]])pic(g,.08,.08,ctex(textCanvas(['milk','?'],{w:64,h:64,bg:c,fg:'#333',font:'bold 18px Comic Sans MS'}),true,false),x,y,.02).rotation.z=r;
  /* chair */
  put(G,'painted_wooden_chair_02',{h:.95},1.95,0,5.0,PI);
  col(1.23,4.12,2.47,4.7,{k:.8});
  ctx.interactables.push({id:'laptop',x:1.95,z:5.25,r:1.1,label:'Dadazon'})}
function hall(G,ctx){/* runner, gallery of family photos, flush lights, doors' signs */
  const run=plane(G,.8,7.6,'flat:#888',10.07,.006,5.9,-PI/2);run.material=rugMat(2);
  for(let i=0;i<6;i++){const z=6.0+i*.62,y=1.45+(i%2?.18:-.12);const s=.3+(i%3)*.06;frame(G,9.425,y,z,PI/2,s,s*1.25,photoTex(i+2))}
  for(let i=0;i<3;i++){const z=1.9+i*.5;frame(G,10.715,1.5+(i%2)*.2,z,-PI/2,.26,.32,photoTex(i+6))}
  const sign=ctex(crayonSign(),true,false);pic(G,.32,.16,sign,10.705,1.62,7.53,-PI/2);
  ctx.interactables.push()}
function frame(G,x,y,z,ry,w,h,tex,col='flat:#20201f:.5'){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;G.add(g);const t=.03,b=.03;
  bx(g,w+2*b,b,t,col,0,h/2+b/2,t/2);bx(g,w+2*b,b,t,col,0,-h/2-b/2,t/2);bx(g,b,h,t,col,-w/2-b/2,0,t/2);bx(g,b,h,t,col,w/2+b/2,0,t/2);
  bx(g,w,h,.006,'trim:#f6f3ea',0,0,.004);pic(g,w*.78,h*.78,tex,0,0,.009);return g}
const PHOTO=[];function photoTex(i){return PHOTO[i]||(PHOTO[i]=ctex(photoCanvas(i),true,false))}
const RUGS=[];
function rugMat(k){if(RUGS[k])return RUGS[k];R=rng(70+k);
  const c=canvas(1024,k===2?2048:640,(x,w,h)=>{const pal=k===0?['#9d4a32','#2c3e57','#e8dcc2','#c89a5b','#5c6e66']:k===1?['#d8d2c4','#6f7d86','#a9b3b4','#efe9dc','#c4a27a']:['#7d2f2a','#24344b','#e2d2b0','#b78a4c','#4d5e58'];
    x.fillStyle=pal[2];x.fillRect(0,0,w,h);
    if(k===1){for(let y=0;y<h;y+=40){x.fillStyle=pal[(y/40|0)%2?0:3];x.fillRect(0,y,w,40)}for(let y=0;y<h;y+=160){x.fillStyle=pal[1];x.fillRect(0,y+10,w,8)}}
    else{const bw=Math.min(w,h)*.09;x.fillStyle=pal[1];x.fillRect(0,0,w,h);x.fillStyle=pal[0];x.fillRect(bw*.5,bw*.5,w-bw,h-bw);x.fillStyle=pal[2];x.fillRect(bw,bw,w-2*bw,h-2*bw);
      x.fillStyle=pal[0];x.fillRect(bw*1.5,bw*1.5,w-3*bw,h-3*bw);
      const s=k===2?60:70;for(let j=0;j*s<h;j++)for(let i=0;i*s<w;i++){const cx=i*s+s/2,cy=j*s+s/2;if(cx<bw*2||cx>w-bw*2||cy<bw*2||cy>h-bw*2)continue;x.fillStyle=(i+j)%2?pal[3]:pal[1];x.beginPath();x.moveTo(cx,cy-s*.42);x.lineTo(cx+s*.42,cy);x.lineTo(cx,cy+s*.42);x.lineTo(cx-s*.42,cy);x.fill();x.fillStyle=pal[2];x.fillRect(cx-4,cy-4,8,8)}
      x.globalAlpha=.25;x.fillStyle=pal[4];x.fillRect(0,0,w,h);x.globalAlpha=1}
    noiseFill(x,w,h,60000,0,()=>`rgba(${R()<.5?'0,0,0':'255,255,255'},${R()*.12})`,1.5)});
  const m=new T.MeshStandardMaterial({map:ctex(c,true,false),roughness:1,envMapIntensity:.3,normalMap:texSet(CT.carpet,.15).normalMap,polygonOffset:true,polygonOffsetFactor:-1});m.normalScale=new T.Vector2(.8,.8);return RUGS[k]=m}
function bedroom(G,ctx){const g=new T.Group();g.position.set(15,0,2.55);g.rotation.y=-PI/2;G.add(g);/* local: headboard at z=0 on the east wall, bed extends +z (world -x) */
  const W=1.62,L=2.08;rbx(g,W+.12,1.15,.1,.03,'linen:#7f8e9b:.3',0,.75,.05);rbx(g,W+.04,.28,L,.04,'linen:#7f8e9b:.3',0,.2,L/2+.06);for(const s of[-1,1])for(const z of[.15,L])cyl(g,.025,.02,.08,'wood:#4a3324',s*(W/2-.05),.04,z,8);
  rbx(g,W-.04,.22,L-.06,.06,'flat:#f3f1ec:.9',0,.44,L/2+.08);
  const duv=rbx(g,W+.06,.12,L-.42,.06,'linen:#ece6da:.45',0,.55,L/2+.28);
  rbx(g,W+.08,.05,.5,.03,'linen:#465b6c:.3',0,.62,L-.25);/* folded throw */
  for(const[x,y,z,r,c]of[[-.4,.66,.32,-.15,'#f6f4ef'],[.4,.66,.32,.15,'#f6f4ef'],[-.36,.66,.5,-.2,'#9fb1bf'],[.36,.66,.5,.25,'#c9a27a']]){const p=rbx(g,.6,.16,.36,.07,'linen:'+c+':.3',x,y,z);p.rotation.x=-.9;p.rotation.z=r}
  col(15-L-.08,2.55-W/2-.06,15,2.55+W/2+.06,{k:1});
  /* nightstands + lamps */
  for(const s of[-1,1]){const z=2.55+s*1.12;put(G,'painted_wooden_nightstand',{h:.6},14.72,0,z,-PI/2);lamp(G,14.72,.6,z,ctx,.9);col(14.45,z-.28,15,z+.28,{k:.8})}
  put(G,'standing_picture_frame_02',{h:.2},14.75,.6,1.25,-PI/2-.3);
  /* dresser on the hall-side wall + mirror + stuff */
  const dr=put(G,'WoodenTable_03',{w:1.3},11.15,0,1.7,PI/2);col(10.84,1.05,11.45,2.35,{k:1});put(G,'ceramic_vase_01',{h:.22},11.1,.83,1.25);put(G,'kenney_trophy',{h:.2},11.1,.83,2.15,PI/2);
  frame(G,10.85,1.55,1.7,PI/2,.7,.5,photoTex(4),'flat:#c9a86a:.4');
  /* closet doors (bifold) on the south wall, laundry basket, art over the bed */
  for(let i=0;i<4;i++){const x=11.7+i*.45;const d=new T.Group();d.position.set(x,0,5.49);G.add(d);bx(d,.44,2.03,.03,'trim:#f4f2ec',0,1.015,0);for(let k=0;k<8;k++)bx(d,.34,.012,.02,'trim:#eceae3',0,.3+k*.19,-.018)}
  bc(G,11.45,2.03,5.44,13.55,2.12,5.5,'trim');
  put(G,'wicker_basket_01',{w:.45},14.3,0,4.9);for(let i=0;i<3;i++)rbx(G,.3,.08,.25,.04,'linen:'+rpick(['#2f5d9e','#c25b7a','#e8e4dc'])+':.3',14.3+rr(-.08,.08),.3+i*.05,4.9+rr(-.06,.06),rr(0,3));
  frame(G,14.995,1.6,2.55,-PI/2,1.0,.65,photoTex(0),'flat:#2b2b2b:.4');
  const rug=plane(G,1.4,2.2,'flat:#888',13.1,.006,2.55,-PI/2);rug.material=rugMat(1);
  ctx.interactables.push({id:'bed',x:13.6,z:3.8,r:1.3,label:'Sleep until evening'})}
function lamp(G,x,y,z,ctx,h=.55){const g=new T.Group();g.position.set(x,y,z);G.add(g);cyl(g,.07,.09,.04,'flat:#efe9dc:.3',0,.02,0,16);cyl(g,.05,.08,h*.45,'flat:#e6dccb:.25',0,h*.25,0,16);cyl(g,.01,.01,h*.2,'brass',0,h*.55,0,8);
  const sh=cyl(g,.12,.17,h*.38,'shade:#f3e7d1:.9',0,h*.72,0,24,true);sh.castShadow=false;sh.material.side=T.DoubleSide;const b=sph(g,.04,'glow:#ffd9a6:6',0,h*.66,0,10);b.castShadow=false;return g}

/* ======================================================================= fixtures: garage */
function garage(G,ctx){
  /* gun safe on the west wall facing +x */
  const s=new T.Group();s.position.set(-7,0,7.15);s.rotation.y=PI/2;G.add(s);const W=.95,H=1.65,D=.68;
  rbx(s,W,H,D,.03,'metal:#20272a:.45',0,H/2,D/2);rbx(s,W-.1,H-.1,.04,.02,'metal:#262e31:.4',0,H/2,D+.005);
  for(const y of[.35,H-.35])cyl(s,.03,.03,.14,'chrome',-W/2+.02,y,D,12);
  const hub=new T.Group();hub.position.set(.12,H*.52,D+.04);s.add(hub);cyl(hub,.05,.05,.04,'chrome',0,0,0,16).rotation.x=PI/2;for(let i=0;i<5;i++){const sp=cyl(hub,.012,.012,.2,'chrome',0,0,.02,8);sp.rotation.z=i*TAU/5;sp.position.set(Math.sin(i*TAU/5)*.1,Math.cos(i*TAU/5)*.1,.02);sph(hub,.022,'flat:#151515:.3',Math.sin(i*TAU/5)*.2,Math.cos(i*TAU/5)*.2,.02,10)}
  const dial=new T.Group();dial.position.set(-.12,H*.62,D+.04);s.add(dial);cyl(dial,.06,.065,.025,'flat:#151515:.3',0,0,0,24).rotation.x=PI/2;cyl(dial,.04,.04,.03,'chrome',0,0,.01,20).rotation.x=PI/2;
  const lbl=ctex(textCanvas(['DAD VAULT','EST. 2009'],{w:256,h:128,bg:'#b38b3c',fg:'#2a1d0c',font:'bold 40px Georgia, serif'}),true,false);pic(s,.26,.13,lbl,0,H*.82,D+.03);
  /* ammo cans + range bag on top, a "gun locker" plaque */
  bx(s,.3,.18,.15,'flat:#4b5a3a:.6',-.2,H+.09,D/2);bx(s,.3,.18,.15,'flat:#4b5a3a:.6',-.2,H+.27,D/2-.02).rotation.y=.1;rbx(s,.45,.25,.28,.06,'linen:#2b2b2b:.3',.22,H+.12,D/2);
  col(-7,6.67,-6.3,7.63,{k:1.2});ctx.interactables.push({id:'locker',x:-5.85,z:7.15,r:1.3,label:'Gun locker'});
  /* workbench on the back wall with pegboard + tools */
  const wb=new T.Group();wb.position.set(-5.3,0,10);wb.rotation.y=PI;G.add(wb);const L=2.2;
  bc(wb,-L/2,.86,0,L/2,.92,.76,'butcher');for(const x of[-L/2+.05,L/2-.05])for(const z of[.05,.7])bc(wb,x-.04,0,z-.04,x+.04,.86,z+.04,'wood:#c8a274:.9');bc(wb,-L/2,.18,.05,L/2,.21,.72,'wood:#c8a274:.9');bc(wb,-L/2,.76,.02,L/2,.86,.06,'wood:#c8a274:.9');
  put(wb,'bench_vice_01',{w:.22},L/2-.25,.92,.62,PI);put(wb,'measuring_tape_01',{w:.07},-.2,.92,.5,.4);put(wb,'adjustable_wrench',{h:.25},.2,.94,.45,0);
  for(let i=0;i<3;i++)rbx(wb,.38,.2,.3,.03,'flat:'+['#e5533d','#2f5d9e','#3b3b3b'][i]+':.6',-.7+i*.45,.31,.35,.02);
  const peg=plane(wb,2.0,1.0,'peg',0,1.55,.01);peg.geometry=peg.geometry.clone();{const uv=peg.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*2,uv.getY(i)*1)}bc(wb,-1.02,1.03,0,1.02,1.06,.03,'wood:#c8a274:.9');bc(wb,-1.02,2.05,0,1.02,2.08,.03,'wood:#c8a274:.9');
  const hang=(n,o,x,y,rz=0)=>{const m=put(wb,n,o,x,y,.04);if(m){m.rotation.z=rz;}cyl(wb,.004,.004,.05,'metal:#666',x,y+.12,.03,6).rotation.x=PI/2};
  hang('handsaw_wood',{h:.6,rot:PI/2},-.7,1.25,0);hang('cross_pein_hammer',{h:.3},-.25,1.55);hang('pliers',{h:.18},0,1.62);hang('flathead_screwdriver',{h:.26},.15,1.55);hang('flathead_screwdriver',{h:.22},.22,1.57);hang('adjustable_wrench',{h:.22},.45,1.6);hang('measuring_tape_01',{w:.07},.7,1.75);
  bx(wb,.9,.03,.18,'wood:#c8a274:.9',.45,1.95,.1);for(let i=0;i<4;i++)cyl(wb,.06,.06,.12,'flat:'+['#d9a441','#c94b3a','#58616a','#e8e4dc'][i]+':.5',.1+i*.22,2.03,.1,14);
  const shop=new T.Group();shop.position.set(0,0,0);wb.add(shop);
  col(-6.4,9.24,-4.2,10,{k:1.2});ctx.interactables.push({id:'workbench',x:-5.3,z:8.85,r:1.2,label:'Workbench'});
  put(G,'metal_tool_chest',{h:1.0},-3.75,0,9.6,PI);col(-4.15,9.2,-3.35,10,{k:1});
  /* water heater + shelving + bikes + a beer-fridge-free corner, garage door opener already done */
  const wh=new T.Group();wh.position.set(-.65,0,9.4);G.add(wh);cyl(wh,.28,.28,1.45,'flat:#e9e7e2:.45',0,.75,0,24);cyl(wh,.29,.29,.04,'flat:#cfccc5:.4',0,1.48,0,24);cyl(wh,.05,.05,1.2,'metal:#b9a27a:.4',.12,2.1,0,10);cyl(wh,.05,.05,1.2,'metal:#b9a27a:.4',-.12,2.1,0,10);bx(wh,.16,.12,.08,'flat:#d33:.5',0,.35,.27);col(-.95,9.1,-.35,9.7,{k:1});
  const sh=put(G,'steel_frame_shelves_01',{h:1.9},-6.65,0,2.0,PI/2);col(-7,1.45,-6.3,2.55,{k:1});
  for(let i=0;i<5;i++){const y=[.08,.52,.98,1.42,1.42][i];const b=put(G,'cardboard_box',{h:.3+rr(0,.08)},-6.68,y,1.75+rr(0,.55),rr(-.2,.2))}
  /* fluorescent shop lights */
  for(const z of[3.5,7.5]){bc(G,-4.6,CEIL-.06,z-.08,-2.6,CEIL,z+.08,'flat:#e9e7e1:.5');const tb=bc(G,-4.55,CEIL-.075,z-.05,-2.65,CEIL-.055,z+.05,'glow:#f2f6ff:3.2');tb.castShadow=false}
  /* bikes on wall hooks (east wall of garage) */
  bike(G,-.3,1.25,5.3,PI/2,'#c0392b',.9);bike(G,-.3,1.15,6.6,PI/2,'#2f7d9e',.75);
  /* parking stop + oil stain */
  bc(G,-4.4,0,8.0,-3.0,.1,8.18,'flat:#e8c547:.7');const oil=plane(G,1.2,.9,'blob',-3.7,.004,4.4,-PI/2);oil.material=new T.MeshBasicMaterial({map:CT.blob,transparent:true,opacity:.35,depthWrite:false,color:0x000000});
  put(G,'propane_tank',{h:.5},-6.6,0,4.9);put(G,'football',{w:.25},-2.3,0,8.9);
  ctx.vanSpot={x:-3.7,z:4.5,yaw:0};col(-4.8,2.2,-2.6,6.9,{collide:false,ao:false})}
function bike(G,x,y,z,ry,colr,s=1){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;g.scale.setScalar(s);G.add(g);
  for(const dx of[-.52,.52]){torus(g,.33,.022,'flat:#151515:.7',dx,0,0,0);torus(g,.29,.006,'chrome',dx,0,0,0)}
  const c='flat:'+colr+':.35';tube(g,[[-.52,0,0],[-.05,.02,0],[.2,.35,0]],.02,c,6);tube(g,[[-.52,0,0],[-.2,.42,0],[.42,.42,0]],.02,c,6);tube(g,[[-.05,.02,0],[-.2,.42,0]],.02,c,4);tube(g,[[.42,.42,0],[.52,0,0]],.02,c,4);
  bx(g,.22,.04,.08,'flat:#111:.6',-.22,.5,0);tube(g,[[.42,.42,0],[.45,.55,0],[.4,.6,-.22],[.4,.6,.22]],.012,'chrome',8);return g}


/* ======================================================================= fixtures: living, dining, curtains, lights */
function curtain(G,x,y0,y1,z,w,ry,colr,{folds=7,open=0}={}){const h=y1-y0,g=new T.PlaneGeometry(w,h,folds*6,1),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const u=(p.getX(i)+w/2)/w;p.setZ(i,Math.sin(u*folds*TAU)*.035+Math.sin(u*folds*TAU*2.3)*.008)}g.computeVertexNormals();
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w,uv.getY(i)*h);g.setAttribute('uv2',g.attributes.uv);
  const m=new T.Mesh(g,M('linen:'+colr+':.4'));m.position.set(x,(y0+y1)/2,z);m.rotation.y=ry;m.castShadow=true;m.receiveShadow=true;G.add(m);return m}
function windowDressing(G,alongX,f,t,head,plane,sgn,colr,style='panels'){/* sgn: which side the room is on */const off=plane+sgn*.16,W=t-f;
  const rod=alongX?cyl(G,.012,.012,W+.5,'metal:#2b2b2b:.4',(f+t)/2,head+.15,off,8):cyl(G,.012,.012,W+.5,'metal:#2b2b2b:.4',off,head+.15,(f+t)/2,8);rod.rotation[alongX?'z':'x']=PI/2;
  for(const e of[f-.25,t+.25]){alongX?sph(G,.025,'metal:#2b2b2b:.4',e,head+.15,off,8):sph(G,.025,'metal:#2b2b2b:.4',off,head+.15,e,8)}
  if(style==='sheer'){const c=alongX?curtain(G,(f+t)/2,head-.9,head+.13,off,W*.9,0,colr,{folds:9}):curtain(G,off,head-.9,head+.13,(f+t)/2,W*.9,PI/2,colr,{folds:9});c.material=c.material.clone();c.material.transparent=true;c.material.opacity=.55;c.castShadow=false;return}
  const pw=Math.min(.55,W*.32);for(const[a,b]of[[f-.22,f-.22+pw],[t+.22-pw,t+.22]]){alongX?curtain(G,(a+b)/2,.05,head+.13,off,pw,0,colr,{folds:4}):curtain(G,off,.05,head+.13,(a+b)/2,pw,PI/2,colr,{folds:4})}}
function canLight(G,x,z,ctx){torus(G,.075,.012,'trim:#ffffff',x,CEIL-.004,z);const d=new T.Mesh(new T.CircleGeometry(.065,20),M('glow:#fff1dc:2.4'));d.rotation.x=PI/2;d.position.set(x,CEIL-.006,z);d.castShadow=false;G.add(d)}
function livingDining(G,ctx){
  /* ceiling fan with light kit in the living room */
  const fan=new T.Group();fan.position.set(6.2,CEIL,2.55);fan.userData.dyn=1;ctx.dyn.add(fan);const fm=model('ceiling_fan',{w:1.3});if(fm){fm.position.y=-.55;fan.add(fm)}
  const fl=sph(fan,.08,'glow:#ffe3bf:3',0,-.52,0,12);fl.castShadow=false;ctx.updaters.push(dt=>{fan.rotation.y+=dt*2.4});
  /* window treatments */
  windowDressing(G,true,4.3,8.3,2.15,-.1,1,'#d9cdb8');windowDressing(G,true,12.0,13.8,2.15,-.1,1,'#8796a3');windowDressing(G,false,3.75,4.95,2.1,15.1,-1,'#8796a3');
  windowDressing(G,true,6.0,8.6,2.15,10.1,-1,'#cbbfa6');windowDressing(G,true,9.7,10.45,2.0,10.1,-1,'#f3efe6','sheer');
  /* kitchen window: café valance */
  {const c=curtain(G,2.2,1.85,2.18,10-.1,1.95,PI,'#c25b4a',{folds:12});}
  /* recessed lights */
  for(const[x,z]of[[4.2,1.2],[8.2,1.2],[4.2,3.9],[8.2,3.9],[1.0,1.0],[1.5,6.2],[1.5,8.6],[3.9,9.3],[6.2,5.8],[8.4,9.3],[10.07,3.0],[10.07,6.4],[10.07,8.9],[12.2,1.2],[12.2,4.4],[1.5,2.6]])canLight(G,x,z,ctx);
  /* dining pendant (drum shade) over the default table spot */
  const pd=new T.Group();pd.position.set(7.3,CEIL,7.45);G.add(pd);cyl(pd,.004,.004,.75,'metal:#222',0,-.375,0,6);const dr=cyl(pd,.3,.3,.26,'shade:#efe3cc:.8',0,-.88,0,32,true);dr.castShadow=false;sph(pd,.05,'glow:#ffdcb0:6',0,-.86,0,10);bx(pd,.12,.02,.12,'metal:#222',0,-.01,0);
  /* sideboard on the sage dining wall, lamp, bowl, art */
  const sb=new T.Group();sb.position.set(9.3,0,7.4);sb.rotation.y=-PI/2;G.add(sb);bc(sb,-.8,.12,0,.8,.82,.42,'wood:#6b4a32:.8');for(let i=0;i<4;i++){const x=-.6+i*.4;bx(sb,.38,.6,.02,'wood:#7a5639:.8',x,.47,.43);bx(sb,.012,.12,.012,'brass',x+(i%2?-.15:.15),.5,.46)}
  for(const x of[-.75,.75])for(const z of[.05,.37])bc(sb,x-.025,0,z-.025,x+.025,.12,z+.025,'wood:#3e2b1d:.8');bc(sb,-.82,.82,-.0,.82,.85,.44,'wood:#6b4a32:.8');
  lamp(sb,-.55,.85,.2,ctx,.6);put(sb,'wooden_bowl_01',{w:.32},.2,.85,.2);put(sb,'standing_picture_frame_02',{h:.26},.6,.85,.12,-.2);col(8.86,6.6,9.3,8.2,{k:.8});
  frame(G,9.295,1.65,7.4,-PI/2,.9,.62,photoTex(5),'flat:#1e1e1e:.5');
  STATIC.noWall.push({wall:'hallW',s:6.4,e:8.4});
  /* living: built-in window seat look — a radiator-style cover below the big window */
  bc(G,4.35,0,0,8.25,.42,.24,'trim');bc(G,4.33,.42,-.0,8.27,.46,.3,'trim');for(let i=0;i<6;i++)bx(G,.5,.26,.01,'trim:#e9e6dd',4.75+i*.6,.21,.245);
  rbx(G,1.2,.1,.32,.04,'linen:#9b6a4a:.3',5.2,.51,.17);for(const[x,c]of[[4.75,'#c25b4a'],[5.05,'#e3d6b8']]){const p=rbx(G,.34,.32,.12,.05,'linen:'+c+':.25',x,.68,.12);p.rotation.x=-.25;p.rotation.z=.15}
  col(4.33,0,8.27,.3,{k:.6});
  /* family photos on the living front wall pier and the entry */
  frame(G,9.0,1.5,.005,0,.32,.4,photoTex(1));frame(G,3.55,1.62,.005,0,.36,.46,photoTex(3));
  ctx.interactables.push({id:'fridge',x:1.35,z:4.62,r:1.0,label:'Fridge'})}
function interiorLights(G,ctx){const L=(x,y,z,c,i,d,o={})=>{const l=new T.PointLight(lin(c),i,d,2);l.position.set(x,y,z);l.castShadow=false;l.userData.base=i;l.userData.alwaysOn=o.on;ctx.dyn.add(l);ctx.lights.push(l);return l};
  L(6.0,2.3,2.4,'#ffcf9c',2.2,9.5);L(2.4,2.3,7.2,'#ffd8ad',2.3,9);L(7.3,1.9,7.4,'#ffcf98',1.6,7);L(12.6,2.2,3.0,'#ffcc96',1.5,7);L(-3.6,2.5,5.6,'#e8eeff',2.4,12,{on:1});L(1.5,2.3,2.0,'#ffd2a0',1.1,6)}

/* ======================================================================= fixtures: back yard */
function deckAndPergola(G,ctx){const x0=4.6,x1=10.4,z0=10.2,z1=13.8,y=.06;const B=new BucketSet();
  B.box(x0,-.05,z0,x1,y,z1,{py:'deck',pz:'fence',px:'fence',nx:'fence'});for(const m of B.meshes()){m.name='deck';G.add(m)}
  bc(G,x0-.02,-.02,z1-.02,x1+.02,y+.005,z1+.02,'wood:#8a6a4a:1.5');
  /* pergola: 4 posts, 2 beams, rafters */
  const pc='wood:#b99a7a:1.6';for(const[x,z]of[[x0+.15,z0+.25],[x1-.15,z0+.25],[x0+.15,z1-.15],[x1-.15,z1-.15]]){bx(G,.15,2.65,.15,pc,x,1.32+y,z);col(x-.09,z-.09,x+.09,z+.09,{k:.5})}
  for(const z of[z0+.25,z1-.15])bx(G,x1-x0+.4,.22,.09,pc,(x0+x1)/2,2.62,z);for(let x=x0-.1;x<=x1+.1;x+=.42)bx(G,.06,.16,z1-z0+.5,pc,x,2.8,(z0+z1)/2+.05);
  /* string lights between the beams */
  for(const z of[z0+.25,z1-.15]){const n=14;for(let i=0;i<=n;i++){const t=i/n,x=x0+.1+(x1-x0-.2)*t,yy=2.5-Math.sin(t*PI)*.25;const b=sph(G,.03,'glow:#ffd38a:4',x,yy,z+.06,8);b.castShadow=false}
    const pts=[];for(let i=0;i<=8;i++){const t=i/8;pts.push([x0+.1+(x1-x0-.2)*t,2.53-Math.sin(t*PI)*.25,z+.06])}tube(G,pts,.004,'flat:#222:.6',24).castShadow=false}
  /* steps down to the lawn */
  bc(G,6.5,-.05,z1,8.2,.03,z1+.35,'deck');
  /* grill */
  grill(G,9.5,y,12.35,-PI/2);ctx.interactables.push({id:'grill',x:8.75,z:12.35,r:1.2,label:'Flip burgers'});col(9.05,11.85,10.0,12.85,{k:.6});
  /* planters on the deck */
  for(const[x,z]of[[4.95,10.55],[4.95,13.4]]){cyl(G,.22,.17,.42,'flat:#b5714a:.8',x,y+.21,z,18);flowers(G,x,y+.42,z,.18,18)}}
function grill(G,x,y,z,ry){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;G.add(g);const bk='flat:#1e1f21:.5';
  bc(g,-.42,.12,-.24,.42,.82,.26,bk);for(const s of[-1,1]){bx(g,.4,.12,.012,'steel!x',s*.21,.48,.265);bx(g,.36,.4,.012,'steel!x',s*.21,.3+.03,.268);bx(g,.012,.1,.012,'steel!x',s*.03,.42,.28)}
  for(const s of[-1,1]){bc(g,s*.42,.84,-.24,s*.8,.87,.24,'steel!x');for(let i=0;i<3;i++)bx(g,.015,.015,.4,'flat:#111:.4',s*(.5+i*.1),.875,0)}
  bc(g,-.44,.82,-.26,.44,.92,.28,'steel!x');for(let i=0;i<4;i++)cyl(g,.022,.022,.03,'flat:#111:.4',-.27+i*.18,.87,.295,12).rotation.x=PI/2;
  const lid=new T.Mesh(new T.CylinderGeometry(.27,.27,.86,24,1,false,0,PI),M('steel!x'));lid.rotation.z=PI/2;lid.rotation.y=0;lid.position.set(0,.92,0);lid.scale.set(1,1,1);lid.castShadow=true;g.add(lid);
  const lt=new T.Group();lt.position.set(0,0,0);g.add(lt);bx(g,.6,.022,.022,'steel!x',0,1.1,.33);for(const s of[-1,1])bx(g,.02,.02,.08,'steel!x',s*.28,1.08,.29);cyl(g,.03,.03,.012,'flat:#ddd:.3',0,1.12,.27,14).rotation.x=PI/2-.6;
  for(const s of[-1,1])cyl(g,.06,.06,.04,'flat:#111:.7',s*.36,.06,.2,14).rotation.z=PI/2;put(g,'propane_tank',{h:.45},.2,0,-.0);
  /* spatula + tongs hanging off the side shelf */
  bx(g,.02,.3,.01,'steel!x',.83,.7,.05);bx(g,.08,.1,.004,'steel!x',.83,.52,.05)}
function flowers(G,x,y,z,r,n,cols=['#e5533d','#ffc94a','#f5f1e6','#c2185b','#8e44ad']){for(let i=0;i<n;i++){const a=R()*TAU,d=Math.sqrt(R())*r,h=rr(.08,.25);const st=cyl(G,.004,.004,h,'flat:#3c6b2c:.8',x+Math.cos(a)*d,y+h/2,z+Math.sin(a)*d,4);st.castShadow=false;
  const fl=sph(G,rr(.02,.035),'flat:'+rpick(cols)+':.7',x+Math.cos(a)*d,y+h,z+Math.sin(a)*d,6);fl.castShadow=false}
  for(let i=0;i<5;i++){const a=R()*TAU,d=Math.sqrt(R())*r*.8;const lf=sph(G,rr(.05,.08),'flat:#4b7a38:.8',x+Math.cos(a)*d,y+.03,z+Math.sin(a)*d,8);lf.scale.y=.5}}
function doghouse(G,x,z,ry,ctx){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;G.add(g);const w=1.0,d=1.15,h=.75,wall='fence';
  bc(g,-w/2,0,-d/2,w/2,.08,d/2,'wood:#7b5a40:1');bc(g,-w/2,.08,-d/2,-w/2+.04,h,d/2,wall);bc(g,w/2-.04,.08,-d/2,w/2,h,d/2,wall);bc(g,-w/2,.08,-d/2,w/2,h,-d/2+.04,wall);
  /* front with an arched opening */
  const sh=new T.Shape();sh.moveTo(-w/2,0);sh.lineTo(w/2,0);sh.lineTo(w/2,h);sh.lineTo(0,h+.38);sh.lineTo(-w/2,h);sh.lineTo(-w/2,0);const hole=new T.Path();hole.moveTo(-.2,.08);hole.lineTo(.2,.08);hole.lineTo(.2,.42);hole.absarc(0,.42,.2,0,PI,false);hole.lineTo(-.2,.08);sh.holes.push(hole);
  const fg=new T.ExtrudeGeometry(sh,{depth:.04,bevelEnabled:false});withUV2(fg);const fm=new T.Mesh(fg,M('fence'));fm.position.set(0,.08,d/2-.04);fm.castShadow=fm.receiveShadow=true;g.add(fm);
  const bm=new T.Mesh(fg,M('fence'));bm.position.set(0,.08,-d/2);bm.castShadow=bm.receiveShadow=true;g.add(bm);
  const ang=Math.atan2(.38,w/2),len=Math.hypot(w/2,.38)+.14;for(const s of[-1,1]){const r=bx(g,len,.04,d+.24,'roof:#5a3e2f',s*w/4,h+.08+.21,0);r.rotation.z=-s*ang}bx(g,.06,.06,d+.26,'wood:#5e4330:1',0,h+.08+.4,0);
  const sign=ctex(textCanvas('BISCUIT',{w:256,h:72,bg:'#f2e3c2',fg:'#7a3b1f',font:'bold 46px Georgia, serif'}),true,false);pic(g,.36,.1,sign,0,.86,d/2+.005);
  rbx(g,.6,.08,.5,.04,'linen:#b3473a:.3',0,.12,.05);
  /* bowls */
  for(const[bx_,c]of[[-.75,'#2a6f9e'],[-.75,'#b3473a']]){}
  const bw=new T.Group();bw.position.set(-.85,0,.55);g.add(bw);cyl(bw,.12,.09,.07,'steel',0,.035,0,20);const wt=cyl(bw,.105,.105,.005,'flat:#7fb3c9:.05',0,.06,0,20);wt.material=new T.MeshStandardMaterial({color:lin('#6f9fb3'),roughness:.05,metalness:0,envMapIntensity:1.2});
  cyl(bw,.12,.09,.07,'flat:#b3473a:.4',.28,.035,.05,20);for(let i=0;i<9;i++)sph(bw,.014,'flat:#8a5a32:.8',.28+rr(-.06,.06),.07,.05+rr(-.06,.06),5);
  col(x-.62,z-.62,x+.62,z+.62,{k:.6})}
function swingSet(G,x,z,ctx){const g=new T.Group();g.position.set(x,0,z);G.add(g);const wc='wood:#b2895f:1.5',L=3.2,H=2.3;
  for(const s of[-1,1]){const lx=s*L/2;for(const dz of[-.75,.75]){const l=bx(g,.09,H*1.05,.09,wc,lx,H/2,dz/2);l.rotation.x=dz>0?-.32:.32}bx(g,.06,.06,1.2,wc,lx,.55,0)}
  bx(g,L+.3,.12,.12,wc,0,H,0);
  const sw=(sx,c)=>{const sg=new T.Group();sg.position.set(sx,H-.06,0);sg.userData.dyn=1;ctx.dyn.add(sg);sg.position.add(g.position);for(const dx of[-.2,.2])cyl(sg,.006,.006,1.75,'metal:#888:.4',dx,-.88,0,4);bx(sg,.46,.03,.18,'flat:'+c+':.5',0,-1.76,0);
    let ph=R()*6;ctx.updaters.push(dt=>{ph+=dt*1.6;sg.rotation.x=Math.sin(ph)*.06})};sw(-.75,'#2f5d9e');sw(.15,'#3c8d4f');
  /* trapeze rings */
  for(const dx of[.95,1.25]){cyl(g,.005,.005,1.3,'metal:#888:.4',dx,H-.7,0,4);torus(g,.07,.012,'flat:#ffc94a:.5',dx,H-1.42,0,0)}
  /* slide tower attached on the east end */
  const t=new T.Group();t.position.set(L/2+.7,0,0);g.add(t);for(const[a,b]of[[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]])bx(t,.09,2.1,.09,wc,a,1.05,b);bc(t,-.55,1.15,-.55,.55,1.2,.55,wc);
  const can=bx(t,1.2,.04,1.2,'flat:#2f7d4f:.6',0,2.1,0);for(const s of[-1,1]){const r=bx(t,.75,.03,1.24,'flat:'+(s<0?'#2f7d4f':'#f2efe4')+':.6',s*.32,2.22,0);r.rotation.z=-s*.36}
  const sl=new T.Group();sl.position.set(.55,1.18,0);sl.rotation.z=-.62;t.add(sl);bx(sl,2.0,.03,.5,'flat:#f2c230:.35',1.0,0,0);for(const s of[-1,1])bx(sl,2.0,.12,.03,'flat:#f2c230:.35',1.0,.06,s*.25);
  for(let i=0;i<4;i++)bx(t,.06,.06,.6,wc,-.6,.25+i*.3,0).rotation.y=PI/2;
  col(x-L/2-.4,z-.55,x+L/2+1.3,z+.55,{k:.4,collide:true});col(x+L/2+.15,z-.6,x+L/2+2.9,z+.6,{k:.3})}
function sandbox(G,x,z){bc(G,x-.9,0,z-.9,x+.9,.2,z-.8,'fence');bc(G,x-.9,0,z+.8,x+.9,.2,z+.9,'fence');bc(G,x-.9,0,z-.8,x-.8,.2,z+.8,'fence');bc(G,x+.8,0,z-.8,x+.9,.2,z+.8,'fence');
  bc(G,x-.8,0,z-.8,x+.8,.14,z+.8,'flat:#e3cf9e:1');cyl(G,.07,.055,.12,'flat:#e5533d:.4',x-.3,.2,z+.2,12);bx(G,.05,.02,.2,'flat:#2f5d9e:.4',x+.2,.16,z-.2).rotation.y=.6;col(x-.92,z-.92,x+.92,z+.92,{k:.3})}
function wagon(G,x,z,ry){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;G.add(g);bc(g,-.45,.18,-.25,.45,.38,.25,'flat:#c0392b:.4');bc(g,-.42,.2,-.22,.42,.37,.22,'flat:#a8301f:.5');
  for(const[a,b]of[[-.32,-.27],[.32,-.27],[-.32,.27],[.32,.27]]){cyl(g,.09,.09,.04,'flat:#1a1a1a:.7',a,.09,b,14).rotation.x=PI/2}tube(g,[[.45,.22,0],[.8,.35,0],[1.0,.4,0]],.012,'flat:#222:.5',6)}
function yard(G,ctx){
  deckAndPergola(G,ctx);
  doghouse(G,13.4,20.6,-PI/2,ctx);swingSet(G,-2.4,19.6,ctx);sandbox(G,-4.6,15.2);wagon(G,2.6,16.8,.8);
  bike(G,4.2,.03,19.4,0,'#e5533d',.62).rotation.set(0,.4,-PI/2+.06);
  put(G,'football',{w:.22},6.2,0,17.6,.3);put(G,'american_football',{w:.3},1.0,0,20.4,1.2);put(G,'garden_gnome',{h:.45},13.9,0,23.0,-.6);put(G,'watering_can_metal_01',{h:.3},10.8,0,22.9,.4);
  /* raised beds with veggies along the back fence */
  for(const x of[5.2,7.6]){put(G,'planter_box_01',{w:1.8},x,0,23.25);for(let i=0;i<7;i++){const l=sph(G,rr(.09,.14),'flat:'+rpick(['#4f8a3a','#6aa04a','#3e7a33'])+':.8',x-.7+i*.23,.42,23.25+rr(-.08,.08),8);l.scale.y=.6}
    for(let i=0;i<3;i++){cyl(G,.008,.008,.8,'wood:#8a6a4a',x-.5+i*.5,.6,23.3,4);sph(G,.03,'flat:#d6402b:.5',x-.5+i*.5+.04,.55,23.25,6)}col(x-.95,22.95,x+.95,23.6,{k:.3})}
  /* shrubs + flowers in the mulch beds */
  R=rng(42);for(let x=-6.4;x<14.8;x+=rr(2.2,3.0)){if(x>4&&x<9)continue;const m=put(G,'shrub_04',{h:rr(.55,.85)},x,0,23.35,rr(0,6));if(m)m.scale.multiplyScalar(1);flowers(G,x+.5,0,23.0,.25,6)}
  for(let x=-6.6;x<-2.6;x+=1.1){put(G,'shrub_04',{h:rr(.5,.7)},x,0,10.7,rr(0,6))}
  /* stepping stones deck → swing set */
  R=rng(9);for(let i=0;i<7;i++){const t=i/6,x=lerp(6.6,-.2,t)+rr(-.15,.15),z=lerp(14.4,18.3,t)+rr(-.1,.1);const st=cyl(G,rr(.22,.28),rr(.24,.3),.04,'concrete',x,0,z,12);st.scale.z=rr(.75,1);st.rotation.y=rr(0,3)}
  /* a big shade tree in the back corner and the neighbours' trees */
  const tr=put(G,'tree_oak',{h:7.5},12.6,0,17.0,1.1);if(tr){col(12.35,16.75,12.85,17.25,{k:.3})}
  ctx.interactables.push();
}
/* ======================================================================= street + neighbours (seen through windows and over the fence) */
function neighborHouse(G,x,z,ry,w,d,colr,roofc,seed){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;G.add(g);R=rng(seed);const h=2.9;
  const B=new BucketSet();B.box(-w/2,-.05,-d/2,w/2,h,d/2,{px:'siding:'+colr,nx:'siding:'+colr,pz:'siding:'+colr,nz:'siding:'+colr});for(const m of B.meshes()){m.castShadow=true;g.add(m)}
  const rise=Math.tan(26*PI/180)*(d/2+.5),len=Math.hypot(d/2+.5,rise);for(const s of[-1,1]){const r=bx(g,w+.8,.08,len,'roof:'+roofc,0,h+rise/2,s*(d/4+.25));r.rotation.x=s*Math.atan2(rise,d/2+.5)}
  for(const s of[-1,1]){const sh=new T.Shape();sh.moveTo(-d/2,0);sh.lineTo(d/2,0);sh.lineTo(0,rise*.94);sh.lineTo(-d/2,0);const tg=new T.ShapeGeometry(sh);withUV2(tg);const t=new T.Mesh(tg,M('siding:'+colr));t.rotation.y=s*PI/2;t.position.set(s*w/2,h,0);if(s<0)t.rotation.y=-PI/2;g.add(t);t.castShadow=true}
  /* windows + door on the street face (+z) and the back face */
  for(const face of[1,-1]){const n=Math.floor(w/3.2);for(let i=0;i<n;i++){const wx=-w/2+(i+.5)*w/n;if(face>0&&i===Math.floor(n/2)){bx(g,1.0,2.1,.06,'cab:'+rpick(['#7a2e2a','#2f4b6e','#2e5a46','#3a3a3a']),wx,1.05,face*(d/2+.02));bx(g,1.2,.1,.08,'trim:#f7f6f2',wx,2.15,face*(d/2+.02));continue}
    bx(g,1.2,1.3,.05,'blackglass',wx,1.55,face*(d/2+.01));bx(g,1.36,.08,.08,'trim:#f7f6f2',wx,2.24,face*(d/2+.02));bx(g,1.36,.08,.1,'trim:#f7f6f2',wx,.86,face*(d/2+.02));bx(g,.07,1.3,.07,'trim:#f7f6f2',wx,1.55,face*(d/2+.02));
    bx(g,.3,1.4,.04,'cab:'+rpick(['#2f3f4f','#1f2f26','#4a2f2a']),wx-.78,1.55,face*(d/2+.02));bx(g,.3,1.4,.04,'cab:'+rpick(['#2f3f4f','#1f2f26','#4a2f2a']),wx+.78,1.55,face*(d/2+.02))}}
  bc(g,-w/2-.05,-.05,-d/2-.05,w/2+.05,.25,d/2+.05,'concrete');return g}
function street(G,ctx){
  neighborHouse(G,-15,-29,0,11,8,'#d8cfb8','#5d5f63',1);neighborHouse(G,1,-29.5,0,12,8.5,'#a9b8c4','#4b4f55',2);neighborHouse(G,17,-29,0,11,8,'#e3ddd0','#6b5a4b',3);neighborHouse(G,33,-29,0,10,8,'#b9c4ad','#4b4f55',4);
  neighborHouse(G,-20,5,PI/2,11,8,'#e6dfcf','#5d5f63',5);neighborHouse(G,28,5,-PI/2,11,8,'#c9b9a3','#4b4f55',6);neighborHouse(G,-4,36,PI,12,8,'#cfd8dc','#5d5f63',7);neighborHouse(G,12,36,PI,11,8,'#e8e0cc','#6b5a4b',8);
  R=rng(77);for(const[x,z,h]of[[-9,-24,8],[8,-24,9],[24,-24,7.5],[-14,30,9],[20,30,8],[-13,16,7],[-11,-5,8],[22,-6,9],[26,18,8],[-2,-14.5,6],[14,-14.5,6.5],[30,-14.5,7]]){put(G,rpick(['tree_oak','tree_tall']),{h},x,0,z,rr(0,6))}
  for(let x=4;x<15;x+=1.5)put(G,'bush',{h:rr(.7,.95)},x,0,-.85,rr(0,6));
  /* mailbox */
  const mb=new T.Group();mb.position.set(-.3,0,-10.6);G.add(mb);bx(mb,.09,1.05,.09,'trim:#f2f1ec',0,.52,0);rbx(mb,.22,.22,.48,.08,'flat:#25303a:.4',0,1.15,0);bx(mb,.02,.12,.04,'flat:#c0392b:.5',.12,1.2,.1)}

/* ======================================================================= decorate grid, catalogue */


const CELL=.5;
/* ---------- decor item builders: origin at footprint centre on the floor, front facing +z ---------- */
function tvPanel(G,w,h,y,ctx){const g=new T.Group();g.position.y=y;G.add(g);rbx(g,w+.03,h+.03,.035,.008,'flat:#0e0e10:.35',0,h/2,0);
  const cv=canvas(512,288,(x,W,H)=>drawBroadcast(x,W,H,0));const tex=ctex(cv,true,false);const scr=new T.Mesh(new T.PlaneGeometry(w-.01,h-.01),new T.MeshBasicMaterial({map:tex,toneMapped:false}));scr.material.color.setScalar(.95);scr.position.set(0,h/2,.019);scr.userData.noProbe=1;g.add(scr);
  if(ctx){let t=0,acc=0;ctx.updaters.push(dt=>{t+=dt;acc+=dt;if(acc>.25&&scr.parent&&scr.visible){acc=0;drawBroadcast(cv.getContext('2d'),512,288,t);tex.needsUpdate=true}})}
  return g}
function tableLampOn(G,x,y,z,ctx){return lamp(G,x,y,z,ctx,.55)}
const MAKE={
  sofa:()=>{const g=new T.Group();const m=put(g,'Sofa_01',{w:1.9});put(g,'throw_pillows_01',{w:.9},-.45,.42,-.08,.15);const th=rbx(g,.5,.05,.7,.03,'linen:#7c8a6a:.3',.72,.62,.02);th.rotation.z=-.5;return g},
  oldsofa:()=>{const g=new T.Group();if(!put(g,'couch',{w:1.85}))rbx(g,1.8,.8,.85,.1,'linen:#3b2f2a',0,.4,0);return g},
  armchair:()=>{const g=new T.Group();put(g,'ArmChair_01',{h:1.0});return g},
  lounge:()=>{const g=new T.Group();put(g,'mid_century_lounge_chair',{h:1.05});return g},
  modernchair:()=>{const g=new T.Group();put(g,'modern_arm_chair_01',{h:.95});return g},
  rocker:()=>{const g=new T.Group();put(g,'Rockingchair_01',{h:1.05});return g},
  ottoman:()=>{const g=new T.Group();put(g,'Ottoman_01',{w:.8});return g},
  coffeetable:()=>{const g=new T.Group();put(g,'modern_coffee_table_01',{w:1.15,rot:PI/2});put(g,'gamepad',{w:.16},.25,.4,.05,.4);
    for(let i=0;i<3;i++)bx(g,.24,.006,.3,'flat:'+['#e5533d','#f4f1e8','#2f5d9e'][i],-.3+rr(-.02,.02),.4+i*.007,.02+rr(-.02,.02)).rotation.y=rr(-.3,.3);cyl(g,.045,.04,.1,'flat:#f2efe8:.3',.05,.45,-.08,12);bx(g,.05,.02,.17,'flat:#1a1a1a:.4',.3,.41,-.1).rotation.y=.4;return g},
  sidetable:(ctx)=>{const g=new T.Group();put(g,'side_table_01',{h:.58});lamp(g,0,.58,0,ctx,.52);put(g,'decorative_book_set_01',{w:.2},.12,.58,.1);return g},
  tv65:(ctx)=>{const g=new T.Group();put(g,'modern_wooden_cabinet',{w:1.9});const top=.53;tvPanel(g,1.45,.83,top+.07,ctx);for(const s of[-1,1])bx(g,.05,.07,.18,'flat:#111:.4',s*.55,top+.035,0);
    bx(g,.8,.07,.09,'flat:#151515:.5',0,top+.035,.16);bx(g,.3,.05,.22,'flat:#e9e9e9:.3',.68,top+.025,.02);put(g,'potted_plant_04',{h:.3},-.75,top,.05);return g},
  tvsmall:(ctx)=>{const g=new T.Group();const b1=put(g,'cardboard_box',{fit:[.62,.36,.45]},-.0,0,0);const b2=put(g,'cardboard_box',{fit:[.6,.34,.42]},.0,.36,0,.06);
    const hh=(b1?.36:0)+(b2?.34:0)||.6;if(!b1){bx(g,.6,.6,.4,'flat:#b08a5a:.9',0,.3,0)}tvPanel(g,.72,.42,hh+.04,ctx);bx(g,.3,.04,.15,'flat:#111:.4',0,hh+.02,0);return g},
  bookshelf:()=>{const g=new T.Group();const sh=put(g,'Shelf_01',{h:1.9});const sw=sh?sh.userData.size.x:1;books(g,sw*.84,[.15,.47,.79,1.11,1.43],.2);return g},
  cubeshelf:()=>{const g=new T.Group();put(g,'wooden_display_shelves_01',{h:1.1,rot:PI/2});for(let i=0;i<3;i++)rbx(g,.26,.24,.28,.03,'linen:'+['#e5533d','#2f5d9e','#ffc94a'][i]+':.25',-.33+i*.33,.16,.0);
    put(g,'american_football',{w:.22},-.25,1.1,0,.6);put(g,'kenney_trophy',{h:.2},.2,1.1,0);return g},
  plant:()=>{const g=new T.Group();put(g,'potted_plant_02',{h:.95});return g},
  floorlamp:(ctx)=>{const g=new T.Group();cyl(g,.16,.18,.03,'metal:#222:.4',0,.015,0,24);cyl(g,.012,.012,1.45,'brass',0,.74,0,8);const sh=cyl(g,.2,.24,.3,'shade:#f1e5cc:.9',0,1.45,0,28,true);sh.castShadow=false;sph(g,.05,'glow:#ffd9a6:6',0,1.4,0,10);return g},
  rug:()=>{const g=new T.Group();const r=plane(g,3,2,'flat:#888',0,.007,0,-PI/2);r.material=rugMat(0);r.receiveShadow=true;r.castShadow=false;return g},
  runner:()=>{const g=new T.Group();const r=plane(g,.8,2.4,'flat:#888',0,.007,0,-PI/2);r.material=rugMat(2);r.castShadow=false;return g},
  dining:()=>{const g=new T.Group();put(g,'dining_table',{w:1.9});const y=.75;
    /* homework, a pencil cup, fruit */
    for(let i=0;i<3;i++)bx(g,.21,.003,.28,'flat:#f6f4ee:.9',-.45+rr(-.03,.03),y+.002+i*.002,.25+rr(-.02,.02)).rotation.y=rr(-.25,.25);bx(g,.17,.012,.24,'flat:#2f7d6d:.6',-.15,y+.006,.28).rotation.y=.2;
    cyl(g,.035,.035,.1,'flat:#e5533d:.5',-.6,y+.05,.05,12);for(let i=0;i<4;i++){const p=cyl(g,.004,.004,.17,'flat:#ffc94a',-.6+rr(-.015,.015),y+.12,.05+rr(-.015,.015),5);p.rotation.z=rr(-.2,.2)}
    put(g,'wooden_bowl_01',{w:.3},.45,y,-.05);for(let i=0;i<3;i++)put(g,'food_apple_01',{w:.08},.45+rr(-.06,.06),y+.04,-.05+rr(-.06,.06),rr(0,6));return g},
  roundtable:()=>{const g=new T.Group();put(g,'round_wooden_table_02',{h:.76});put(g,'jug_01',{h:.2},0,.76,0);return g},
  chair:()=>{const g=new T.Group();put(g,'dining_chair_02',{h:.97});return g},
  kitchenchair:()=>{const g=new T.Group();put(g,'painted_wooden_chair_02',{h:.95});return g},
  shelves:()=>{const g=new T.Group();put(g,'steel_frame_shelves_01',{h:1.8});for(const y of[.04,.5,.95])for(let i=0;i<2;i++)put(g,'cardboard_box',{h:.28+rr(0,.06)},-.25+i*.45,y,0,rr(-.2,.2));return g},
  toolcart:()=>{const g=new T.Group();put(g,'tool_cart',{w:1.2});put(g,'pliers',{h:.18},.3,.97,.1,0);return g},
  minifridge:()=>{const g=new T.Group();rbx(g,.55,.86,.55,.02,'flat:#1c1d1f:.4',0,.43,0);bx(g,.47,.74,.012,'glass',0,.45,.276).castShadow=false;rbx(g,.5,.79,.02,.01,'steel',0,.45,.27);bx(g,.44,.7,.01,'glow:#dbe9ff:.7',0,.45,.2);
    for(const y of[.2,.42,.64])for(let i=0;i<6;i++)cyl(g,.03,.03,.11,'flat:'+rpick(['#c0392b','#2f5d9e','#e9e9e9','#f1c40f','#27ae60']),-.18+i*.072,y,.12,10);bx(g,.02,.5,.03,'steel',.21,.45,.3);return g},
  picnic:()=>{const g=new T.Group();put(g,'wooden_picnic_table',{w:1.8});return g},
  patio:()=>{const g=new T.Group();put(g,'outdoor_table_chair_set_01',{d:1.75});return g},
  firepit:(ctx)=>{const g=new T.Group();put(g,'stone_fire_pit',{w:1.4});for(let i=0;i<4;i++){const l=cyl(g,.05,.05,.6,'wood:#4a3324',Math.cos(i*1.6)*.08,.25,Math.sin(i*1.6)*.08,8);l.rotation.z=PI/2;l.rotation.y=i*1.6}
    const em=sph(g,.25,'glow:#ff7a2a:2.5',0,.18,0,12);em.scale.y=.3;em.castShadow=false;const fl=[];for(let i=0;i<3;i++){const f=new T.Mesh(new T.ConeGeometry(.09,.35,8),new T.MeshBasicMaterial({color:new T.Color(4,1.6,.35),transparent:true,opacity:.8,toneMapped:false,depthWrite:false}));f.position.set(rr(-.08,.08),.42,rr(-.08,.08));f.castShadow=false;g.add(f);fl.push(f)}
    if(ctx)ctx.updaters.push((dt)=>{const t=performance.now()/1000;fl.forEach((f,i)=>{f.scale.y=.8+.35*Math.sin(t*9+i*2)+.15*Math.sin(t*23+i);f.rotation.y=t*2+i})});return g},
  trampoline:()=>{const g=new T.Group();const r=1.5,h=.8;torus(g,r,.05,'metal:#9aa0a6:.4',0,h,0);const pad=torus(g,r-.05,.12,'flat:#2f6db3:.6',0,h+.02,0);pad.scale.z=.35;
    const mat=new T.Mesh(new T.CircleGeometry(r-.18,40),M('flat:#141414:.9'));mat.rotation.x=-PI/2;mat.position.y=h-.02;mat.castShadow=true;mat.receiveShadow=true;g.add(mat);
    for(let i=0;i<6;i++){const a=i*TAU/6,x=Math.cos(a)*r,z=Math.sin(a)*r;tube(g,[[x*1.0,h,z*1.0],[x*1.03,h*.5,z*1.03],[x*.92,.02,z*.92]],.025,'metal:#9aa0a6:.4',6);cyl(g,.022,.022,1.7,'flat:#222:.5',x*1.02,h+.85,z*1.02,8)}
    const net=new T.Mesh(new T.CylinderGeometry(r*1.02,r*1.02,1.6,36,1,true),new T.MeshStandardMaterial({color:lin('#151515'),alphaMap:netTex(),transparent:true,alphaTest:.4,side:T.DoubleSide,roughness:.9}));net.position.y=h+.85;net.castShadow=true;g.add(net);return g},
  flamingo:()=>{const g=new T.Group();const pk='flat:#ff6fae:.45';const b=sph(g,.13,pk,0,.62,0,14);b.scale.set(1.6,.9,.9);tube(g,[[.15,.66,0],[.24,.85,0],[.18,1.0,0],[.24,1.05,0]],.028,pk,10);sph(g,.05,pk,.26,1.06,0,10);const bk=cyl(g,.012,.025,.07,'flat:#222:.4',.31,1.04,0,8);bk.rotation.z=-1.9;
    for(const z of[-.04,.04])cyl(g,.006,.006,.6,'metal:#555',0,.28,z,6);return g},
  gnome:()=>{const g=new T.Group();put(g,'garden_gnome',{h:.45});return g},
  planter:()=>{const g=new T.Group();put(g,'planter_box_01',{w:1.7});R=rng(4);flowers(g,0,.38,0,.6,26);return g},
  beanbag:()=>{const g=new T.Group();const pts=[];for(let i=0;i<=12;i++){const t=i/12;pts.push(new T.Vector2(Math.sin(t*PI)*.48+(t>.8?-.05:0),t*.62))}const lg=withUV2(new T.LatheGeometry(pts,28));const m=new T.Mesh(lg,M('linen:#c25b4a:.3'));m.scale.set(1,1,.92);m.castShadow=m.receiveShadow=true;g.add(m);return g},
  dogbed:()=>{const g=new T.Group();const b=torus(g,.36,.12,'linen:#8b5e4a:.25',0,.12,0);b.scale.z=1.3;const c=cyl(g,.38,.4,.1,'linen:#c9b49a:.25',0,.06,0,24);c.scale.z=1.3;return g},
  familyphoto:()=>{const g=new T.Group();frame(g,0,0,0,0,.9,.62,photoTex(0),'flat:#3a2a1d:.5');return g},
  print:()=>{const g=new T.Group();if(!put(g,'hanging_picture_frame_01',{h:.8},0,0,0)){frame(g,0,0,0,0,.6,.8,photoTex(4))}else g.children[0].position.y-=.4;return g},
  fancyart:()=>{const g=new T.Group();if(!put(g,'fancy_picture_frame_01',{w:.9},0,0,0)){frame(g,0,0,0,0,.8,.6,photoTex(5))}else g.children[0].position.y-=.3;return g},
  clock:()=>{const g=new T.Group();const c=put(g,'wall_clock',{w:.34},0,0,0);if(c)c.position.y-=.17;return g},
  dartboard:()=>{const g=new T.Group();const d=put(g,'dartboard',{w:.46},0,0,0);if(d)d.position.y-=.23;return g},
  trophyshelf:()=>{const g=new T.Group();bc(g,-.5,-.02,0,.5,.02,.2,'wood:#6b4a32:.8');for(const x of[-.3,0,.3]){const t=put(g,'kenney_trophy',{h:.24},x,.02,.1);if(t)t.traverse(o=>{if(o.isMesh){o.material=M('brass')}})}
    pic(g,.24,.06,ctex(textCanvas("WORLD'S OKAYEST DAD",{w:512,h:96,bg:'#b38b3c',fg:'#2a1d0c',font:'bold 40px Georgia, serif'}),true,false),0,.07,.205);return g}};
function books(g,w,ys,dz){R=rng(91);const atlas=ctex(bookAtlas(),true,false);const mat=new T.MeshStandardMaterial({map:atlas,roughness:.8,envMapIntensity:IENV});
  for(const y of ys){let x=-w/2;while(x<w/2-.04){const bw=rr(.025,.05),bh=rr(.2,.27),bd=rr(.15,.2);if(R()<.08){x+=rr(.05,.12);continue}const b=new T.Mesh(boxGeo(bw,bh,bd),mat);const tilt=x>w/2-.15&&R()<.5?.25:0;b.position.set(x+bw/2,y+bh/2,dz-.02);b.rotation.z=-tilt;
    const u=Math.floor(R()*32)/32;const g2=b.geometry.clone();const uv=g2.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,u+(i%2)*(1/32)*.9,uv.getY(i)>0?1:0);b.geometry=g2;b.castShadow=true;g.add(b);x+=bw+.002}}}
let NET=null;function netTex(){return NET||(NET=ctex(canvas(256,128,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);x.strokeStyle='#fff';x.lineWidth=1.4;for(let i=0;i<w;i+=8){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke()}for(let j=0;j<h;j+=8){x.beginPath();x.moveTo(0,j);x.lineTo(w,j);x.stroke()}}),false,true))}

/* ---------- the catalogue (SPEC D.5 + extras). fp = footprint in 0.5 m cells (w along x, d along z) before rotation ---------- */
const CATALOG=[
  {id:'sofa',name:'Sectional of Peace',price:650,fp:[4,2],zone:'in',h:.85,tags:['seat','tv-facing'],seats:[[-.5,.08],[0,.08],[.5,.08]]},
  {id:'oldsofa',name:"Dad's Old Leather Couch",price:0,fp:[4,2],zone:'in',h:.85,tags:['seat'],seats:[[-.4,.08],[.4,.08]],starter:1},
  {id:'armchair',name:'The Thinking Chair',price:280,fp:[2,2],zone:'in',h:1,tags:['seat'],seats:[[0,.05]]},
  {id:'lounge',name:'The Dad Chair',price:540,fp:[2,2],zone:'in',h:1,tags:['seat'],seats:[[0,.05]]},
  {id:'modernchair',name:'Leather Accent Chair',price:310,fp:[2,2],zone:'in',h:.95,tags:['seat'],seats:[[0,.05]]},
  {id:'rocker',name:"Grandpa's Rocker",price:240,fp:[2,2],zone:'any',h:1,tags:['seat'],seats:[[0,.05]]},
  {id:'ottoman',name:'Leather Ottoman',price:130,fp:[2,2],zone:'in',h:.45,tags:[]},
  {id:'coffeetable',name:'Coffee Table (coaster-mandatory)',price:160,fp:[3,2],zone:'in',h:.42,tags:[]},
  {id:'sidetable',name:'End Table & Lamp',price:120,fp:[1,1],zone:'in',h:1.1,tags:['light']},
  {id:'tv65',name:'65-inch TV & Media Console',price:900,fp:[4,1],zone:'in',h:1.4,tags:['tv']},
  {id:'tvsmall',name:'Moving-Box TV Stand',price:0,fp:[2,1],zone:'in',h:1.1,tags:['tv'],starter:1},
  {id:'bookshelf',name:'Bookshelf of Unread Books',price:220,fp:[2,1],zone:'in',h:1.9,tags:[]},
  {id:'cubeshelf',name:"Kids' Cube Shelf",price:110,fp:[3,1],zone:'in',h:1.1,tags:[]},
  {id:'plant',name:'Fiddle-Leaf Fig (will die)',price:45,fp:[1,1],zone:'any',h:.95,tags:[]},
  {id:'floorlamp',name:'Floor Lamp',price:85,fp:[1,1],zone:'in',h:1.6,tags:['light']},
  {id:'rug',name:'Big Area Rug',price:90,fp:[6,4],zone:'in',h:0,layer:'floor',tags:[]},
  {id:'runner',name:'Hallway Runner',price:40,fp:[2,5],zone:'in',h:0,layer:'floor',tags:[]},
  {id:'dining',name:'Dining Table',price:480,fp:[4,3],zone:'in',h:.76,tags:['dining','table']},
  {id:'roundtable',name:'Bistro Table',price:150,fp:[2,2],zone:'any',h:.76,tags:['table']},
  {id:'chair',name:'Dining Chair',price:90,fp:[1,1],zone:'in',h:.97,tags:['seat','tuck'],seats:[[0,.0]]},
  {id:'kitchenchair',name:'Mismatched Kitchen Chair',price:0,fp:[1,1],zone:'in',h:.95,tags:['seat','tuck'],seats:[[0,0]],starter:1},
  {id:'shelves',name:'Steel Garage Shelving',price:150,fp:[3,1],zone:'in',h:1.8,tags:['garage']},
  {id:'toolcart',name:'Rolling Tool Cart',price:120,fp:[3,2],zone:'in',h:.97,tags:['garage']},
  {id:'minifridge',name:'Beverage Fridge',price:300,fp:[1,1],zone:'in',h:.86,tags:['garage']},
  {id:'picnic',name:'Picnic Table',price:350,fp:[4,4],zone:'out',h:.75,tags:['seat','dining'],seats:[[-.4,.55],[.4,.55]],starter:1},
  {id:'patio',name:'Patio Set',price:420,fp:[2,4],zone:'out',h:.9,tags:['seat']},
  {id:'firepit',name:'Fire Pit',price:380,fp:[3,3],zone:'out',h:.4,tags:['gather']},
  {id:'trampoline',name:'Trampoline',price:550,fp:[6,6],zone:'out',h:2.4,tags:['play']},
  {id:'flamingo',name:'Lawn Flamingo',price:15,fp:[1,1],zone:'out',h:1,tags:['flamingo']},
  {id:'gnome',name:'Garden Gnome',price:25,fp:[1,1],zone:'out',h:.45,tags:[]},
  {id:'planter',name:'Flower Planter',price:65,fp:[4,1],zone:'out',h:.6,tags:[]},
  {id:'beanbag',name:'Bean Bag',price:70,fp:[2,2],zone:'in',h:.62,tags:['seat','kids'],seats:[[0,0]]},
  {id:'dogbed',name:'Orthopedic Dog Bed',price:60,fp:[2,2],zone:'any',h:.25,layer:'low',tags:['dogbed'],starter:1},
  {id:'familyphoto',name:'Family Portrait',price:60,wall:1,ww:1.0,wh:.75,y:1.55,tags:[]},
  {id:'print',name:'Framed Print',price:75,wall:1,ww:.65,wh:.85,y:1.5,tags:[]},
  {id:'fancyart',name:'Fancy Painting (thrift store)',price:120,wall:1,ww:.95,wh:.75,y:1.55,tags:[]},
  {id:'clock',name:'Wall Clock',price:35,wall:1,ww:.4,wh:.4,y:1.9,tags:[]},
  {id:'dartboard',name:'Dartboard',price:55,wall:1,ww:.5,wh:.5,y:1.73,tags:['garage']},
  {id:'trophyshelf',name:"World's Okayest Dad Shelf",price:95,wall:1,ww:1.05,wh:.35,y:1.45,tags:[]}];
const CAT={};for(const c of CATALOG)CAT[c.id]=c;
Home.catalog=CATALOG;Home.catalogById=CAT;
/* starter: sparse, hand-me-downs. cells are 0.5 m; x,z = min corner cell; r = quarter turns (0 faces +z/south, 1 faces +x/east, 2 faces -z/north, 3 faces -x/west) */
Home.starterLayout=()=>({v:1,items:[
  {uid:'s1',id:'oldsofa',x:8,z:3,r:1},{uid:'s2',id:'tvsmall',x:17,z:4,r:3},{uid:'s3',id:'dining',x:13,z:13,r:1},
  {uid:'s4',id:'kitchenchair',x:12,z:15,r:1},{uid:'s5',id:'kitchenchair',x:17,z:14,r:3},{uid:'s6',id:'dogbed',x:15,z:1,r:0},{uid:'s7',id:'picnic',x:2,z:28,r:0}]});
Home.fullLayout=()=>({v:1,items:[
  {uid:'f1',id:'sofa',x:8,z:2,r:1},{uid:'f2',id:'coffeetable',x:11,z:3,r:1},{uid:'f3',id:'rug',x:8,z:1,r:1},{uid:'f4',id:'tv65',x:17,z:2,r:3},{uid:'f5',id:'armchair',x:12,z:0,r:0},
  {uid:'f6',id:'lounge',x:12,z:7,r:2},{uid:'f7',id:'floorlamp',x:7,z:1,r:0},{uid:'f8',id:'sidetable',x:8,z:7,r:0},{uid:'f9',id:'plant',x:16,z:0,r:0},{uid:'f10',id:'bookshelf',x:6,z:0,r:0},
  {uid:'f11',id:'dining',x:13,z:13,r:1},{uid:'f12',id:'chair',x:12,z:13,r:1},{uid:'f13',id:'chair',x:12,z:15,r:1},{uid:'f14',id:'chair',x:17,z:13,r:3},{uid:'f15',id:'chair',x:17,z:15,r:3},
  {uid:'f16',id:'dogbed',x:15,z:7,r:0},{uid:'f17',id:'beanbag',x:16,z:6,r:3},{uid:'f18',id:'plant',x:10,z:18,r:0},
  {uid:'f20',id:'shelves',x:-14,z:10,r:1},{uid:'f21',id:'toolcart',x:-8,z:16,r:2},{uid:'f22',id:'minifridge',x:-2,z:15,r:3},
  {uid:'f23',id:'patio',x:10,z:22,r:0},{uid:'f24',id:'firepit',x:2,z:28,r:0},{uid:'f25',id:'trampoline',x:13,z:32,r:0},{uid:'f26',id:'flamingo',x:26,z:30,r:3},{uid:'f27',id:'planter',x:-6,z:23,r:0},
  {uid:'f28',id:'rocker',x:15,z:24,r:3},{uid:'f29',id:'gnome',x:-1,z:23,r:0},{uid:'f30',id:'runner',x:19,z:15,r:0},
  {uid:'w1',id:'familyphoto',wx:6.2,wz:.0,y:1.55,r:0},{uid:'w2',id:'clock',wx:3,wz:4.0,y:2.0,r:2},{uid:'w3',id:'fancyart',wx:12.8,wz:5.5,y:1.6,r:2},{uid:'w4',id:'dartboard',wx:-3.4,wz:10,y:1.73,r:2},
  {uid:'w5',id:'trophyshelf',wx:9.3,wz:3.5,y:1.5,r:3},{uid:'w6',id:'print',wx:-.15,wz:6.8,y:1.5,r:3}]});
Home.allOwned=()=>{const o={};for(const c of CATALOG)o[c.id]=c.wall?2:4;return o};


/* ======================================================================= decor grid + placement */
const GRID={i0:-15,j0:-1,W:47,H:51};
const YARD=[-7.05,10.25,15.05,23.9];
const NAV_TARGETS=[['the front door',2,1],['the gun locker',-12,14],['the workbench',-11,17],['the laptop',3,10],['the back slider',14,19],['the back yard',14,21],['the garage',-2,5],['the bedroom',26,6],['the grill',17,24]];
function cellRect(i,j){return{x0:i*CELL,z0:j*CELL,x1:(i+1)*CELL,z1:(j+1)*CELL}}
const hit=(a,b,m=.005)=>a.x0<b.x1-m&&a.x1>b.x0+m&&a.z0<b.z1-m&&a.z1>b.z0+m;
function buildGrid(ctx){const{W,H}=GRID;const zone=new Uint8Array(W*H),res=new Uint8Array(W*H);
  const inFloor=(x,z)=>FLOORS.some(f=>x>f.r[0]&&x<f.r[2]&&z>f.r[1]&&z<f.r[3]);
  const resv=[...STATIC.reserve,...ctx.interactables.map(it=>({x0:it.x-.45,z0:it.z-.45,x1:it.x+.45,z1:it.z+.45})),
    ...ctx.exits.map(e=>({x0:e.x-.6,z0:e.z-.6,x1:e.x+.6,z1:e.z+.6}))];
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){const ci=i+GRID.i0,cj=j+GRID.j0,r=cellRect(ci,cj),cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2,k=j*W+i;
    let z=inFloor(cx,cz)?1:(cx>YARD[0]&&cx<YARD[2]&&cz>YARD[1]&&cz<YARD[3])?2:0;
    if(z&&STATIC.block.some(b=>hit(r,b)))z=3;zone[k]=z;if(resv.some(b=>hit(r,b)))res[k]=1}
  GRID.zone=zone;GRID.res=res}
const gidx=(i,j)=>{const a=i-GRID.i0,b=j-GRID.j0;return a<0||b<0||a>=GRID.W||b>=GRID.H?-1:b*GRID.W+a};
const dims=(c,r)=>r%2?[c.fp[1],c.fp[0]]:[c.fp[0],c.fp[1]];
const FRONT=[[0,1],[1,0],[0,-1],[-1,0]];
function occMap(items,ignore){const solid=new Map(),floor=new Map();for(const it of items){if(it.uid===ignore||it.wx!=null)continue;const c=CAT[it.id];if(!c)continue;const[w,d]=dims(c,it.r);
  for(let j=it.z;j<it.z+d;j++)for(let i=it.x;i<it.x+w;i++){const k=gidx(i,j);if(k<0)continue;(c.layer==='floor'?floor:solid).set(k,it)}}return{solid,floor}}
function reachable(blocked){const{W,H}=GRID,seen=new Uint8Array(W*H);const s=gidx(2,1);const q=[s];seen[s]=1;
  while(q.length){const k=q.pop(),i=k%W,j=(k/W)|0;for(const[di,dj]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;if(a<0||b<0||a>=W||b>=H)continue;const n=b*W+a;if(seen[n])continue;const z=GRID.zone[n];if((z!==1&&z!==2)||blocked.has(n))continue;seen[n]=1;q.push(n)}}
  for(const[name,i,j]of NAV_TARGETS){const k=gidx(i,j);if(k>=0&&!seen[k])return name}return null}
/* validity of a floor placement: returns '' when fine, or a short reason */
function checkFloor(id,x,z,r,items,ignore,people=[]){const c=CAT[id];if(!c)return'Unknown item';const[w,d]=dims(c,r);const{solid,floor}=occMap(items,ignore);const mine=[];
  for(let j=z;j<z+d;j++)for(let i=x;i<x+w;i++){const k=gidx(i,j);if(k<0)return'Out of bounds';const zn=GRID.zone[k];
    if(zn===0)return c.zone==='out'?'Outdoor item: back yard only':'Not on the floor';if(zn===3)return'Something is already there';
    if(c.zone==='in'&&zn!==1)return'Indoor item: keep it inside';if(c.zone==='out'&&zn!==2)return'Outdoor item: back yard only';
    if(c.layer!=='floor'&&GRID.res[k])return'Keep doorways and fixtures clear';
    if(c.layer==='floor'?floor.has(k):solid.has(k)){const o=(c.layer==='floor'?floor:solid).get(k);return'Overlaps the '+(CAT[o.id]?CAT[o.id].name.toLowerCase():'furniture')}mine.push(k)}
  const rect={x0:x*CELL-.3,z0:z*CELL-.3,x1:(x+w)*CELL+.3,z1:(z+d)*CELL+.3};
  if(c.layer!=='floor'&&c.h>.05)for(const p of people)if(p&&p.x>rect.x0&&p.x<rect.x1&&p.z>rect.z0&&p.z<rect.z1)return'Mind your feet';
  if(c.layer!=='floor'){const bl=new Set(solid.keys());for(const k of mine)bl.add(k);const cut=reachable(bl);if(cut)return'That blocks the way to '+cut}
  return''}
function wallFace(span){return span.alongX?(span.sgn>0?0:2):(span.sgn>0?1:3)}
function checkWall(id,wx,wz,y,r,items,ignore){const c=CAT[id];if(!c)return'Unknown item';const sp=findSpan(wx,wz,r);if(!sp)return'Hang it on an inside wall';const a=sp.alongX?wx:wz;
  if(a-c.ww/2<sp.s||a+c.ww/2>sp.e)return'Not enough wall';if(y-c.wh/2<sp.y0||y+c.wh/2>sp.y1)return'Too high or low';
  for(const nw of STATIC.noWall)if(nw.wall===sp.wall&&a+c.ww/2>nw.s&&a-c.ww/2<nw.e)return'Something is already on that wall';
  for(const it of items){if(it.uid===ignore||it.wx==null)continue;const o=CAT[it.id];const sp2=findSpan(it.wx,it.wz,it.r);if(sp2!==sp)continue;const b=sp.alongX?it.wx:it.wz;if(Math.abs(a-b)<(c.ww+o.ww)/2&&Math.abs(y-it.y)<(c.wh+o.wh)/2)return'Overlaps the '+o.name.toLowerCase()}
  if(c.tags.includes('garage')&&!sp.garage&&false)return'';return''}
function findSpan(wx,wz,r){for(const sp of STATIC.wallSpans){if(wallFace(sp)!==r)continue;const f=sp.alongX?wz:wx,a=sp.alongX?wx:wz;if(Math.abs(f-sp.face)<.06&&a>=sp.s-.01&&a<=sp.e+.01)return sp}return null}
/* push an item's back flush against a wall it is close to (the grid is 0.5 m, walls are not) */
function wallSnap(c,x0,z0,x1,z1,r){const back=FRONT[(r+2)%4];let best=null;const planes=[];
  for(const w of WALLS){const[a,b,cc,d]=w.r;planes.push({x0:a,z0:b,x1:cc,z1:d})}for(const k of STATIC.snapExtra||[])planes.push(k);planes.push({x0:-7.3,z0:10.2,x1:-7.1,z1:24},{x0:15.1,z0:10.2,x1:15.3,z1:24},{x0:-7.3,z0:23.92,x1:15.3,z1:24.1});
  for(const p of planes){let gap=null;
    if(back[1]<0&&p.x0<x1-.05&&p.x1>x0+.05&&p.z1<=z0+.02)gap=z0-p.z1;else if(back[1]>0&&p.x0<x1-.05&&p.x1>x0+.05&&p.z0>=z1-.02)gap=p.z0-z1;
    else if(back[0]<0&&p.z0<z1-.05&&p.z1>z0+.05&&p.x1<=x0+.02)gap=x0-p.x1;else if(back[0]>0&&p.z0<z1-.05&&p.z1>z0+.05&&p.x0>=x1-.02)gap=p.x0-x1;
    if(gap!=null&&gap<.46&&(best==null||gap<best))best=gap}
  if(best==null)return[0,0];const m=best-.03-(c.inset||0);return[back[0]*m,back[1]*m]}
const DEC={items:[],objs:new Map(),group:null,ctx:null,seats:[]};
function layoutItems(L){return((L&&L.items)||[]).filter(it=>CAT[it.id]).map(it=>Object.assign({},it))}
function spawnItem(it,ctx){const c=CAT[it.id];const mk=MAKE[it.id];R=rng(hashStr(it.uid||it.id));const obj=mk?mk(ctx):new T.Group();obj.userData.uid=it.uid;obj.userData.dyn=1;
  if(c.wall){const f=FRONT[it.r];obj.position.set(it.wx+f[0]*.012,it.y,it.wz+f[1]*.012);obj.rotation.y=it.r*PI/2;}
  else{const[w,d]=dims(c,it.r);const x0=it.x*CELL,z0=it.z*CELL,x1=x0+w*CELL,z1=z0+d*CELL;let[sx,sz]=c.layer==='floor'?[0,0]:wallSnap(c,x0,z0,x1,z1,it.r);
    obj.position.set((x0+x1)/2+sx,0,(z0+z1)/2+sz);obj.rotation.y=it.r*PI/2;
    if(c.layer!=='floor'&&c.h>.05){const bw=(c.fp[0]*CELL)*.92,bd=(c.fp[1]*CELL)*.92;const sh=new T.Mesh(new T.PlaneGeometry(bw,bd),new T.MeshBasicMaterial({map:CT.blobRect,transparent:true,depthWrite:false,color:0,opacity:.55,polygonOffset:true,polygonOffsetFactor:-2}));sh.rotation.x=-PI/2;sh.position.y=.005;sh.renderOrder=1;sh.castShadow=false;sh.receiveShadow=false;obj.add(sh)}
    it._col={x0:x0+.05+Math.min(0,sx),z0:z0+.05+Math.min(0,sz),x1:x1-.05+Math.max(0,sx),z1:z1-.05+Math.max(0,sz)}}
  obj.traverse(o=>{if(o.isMesh&&!o.material.userData)o.material.userData={}});return obj}
function hashStr(s){let h=2166136261;for(const ch of String(s))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0}
function applyLayout(H,L){const ctx=H.ctx;if(DEC.group)ctx.dyn.remove(DEC.group);const g=new T.Group();g.name='decor';g.userData.dyn=1;ctx.dyn.add(g);DEC.group=g;DEC.objs.clear();
  /* remove previous item colliders/solids from the live arrays (the game holds references to them) */
  for(let i=H.colliders.length-1;i>=0;i--)if(H.colliders[i]._decor)H.colliders.splice(i,1);for(let i=H.solids.length-1;i>=0;i--)if(H.solids[i].userData.decor)H.solids.splice(i,1);
  DEC.items=layoutItems(L);DEC.seats.length=0;
  for(const it of DEC.items){const c=CAT[it.id];const obj=spawnItem(it,ctx);g.add(obj);DEC.objs.set(it.uid,obj);
    if(it._col&&c.layer!=='floor'&&c.layer!=='low'){const cc=Object.assign({_decor:1},it._col);H.colliders.push(cc)}
    if(!c.wall&&c.h>=.8)obj.traverse(o=>{if(o.isMesh&&o.geometry&&!o.material.transparent){o.userData.decor=1;H.solids.push(o)}});
    if(c.seats){for(const[dx,dz]of c.seats){const a=it.r*PI/2,cs=Math.cos(a),sn=Math.sin(a);DEC.seats.push({uid:it.uid,id:it.id,x:obj.position.x+dx*cs+dz*sn,z:obj.position.z-dx*sn+dz*cs,yaw:a,h:it.id==='picnic'?.45:c.id==='beanbag'?.25:it.id==='rocker'?.45:.45,tags:c.tags})}}}
  if(H.probe)applyProbe(g,H.probe);H.layout=serialize();if(H.onDecor)H.onDecor()}
function serialize(){return{v:1,items:DEC.items.map(it=>{const o={uid:it.uid,id:it.id,r:it.r};if(it.wx!=null){o.wx=+it.wx.toFixed(3);o.wz=+it.wz.toFixed(3);o.y=+it.y.toFixed(2)}else{o.x=it.x;o.z=it.z}return o})}}
/* drop entries that are no longer valid (unknown ids, blocked cells, over the owned count) and report them so the game can refund */
Home.validate=function(L,owned){const out=[],dropped=[],cnt={};for(const it of layoutItems(L)){const c=CAT[it.id];cnt[it.id]=(cnt[it.id]||0)+1;
  if(owned&&!c.starter&&(owned[it.id]||0)<cnt[it.id]){dropped.push(it);continue}
  const why=c.wall?checkWall(it.id,it.wx,it.wz,it.y,it.r,out):checkFloor(it.id,it.x,it.z,it.r,out);if(why){dropped.push(Object.assign({why},it));continue}out.push(it)}
  return{layout:{v:1,items:out},dropped}};
/* first valid spot for a newly bought item, searched outward from a sensible room */
const HOME_SPOT={in:[12,4],out:[10,30],any:[12,4],garage:[-8,12],wall:[[6.2,0,1.55,0],[12.8,5.5,1.6,2],[3,4,1.9,2],[-3.4,10,1.7,2],[9.3,3.5,1.5,3],[-.15,6.8,1.5,3],[0,1.2,1.6,1],[15,3.5,1.6,3]]};
Home.autoPlace=function(L,id){const c=CAT[id];if(!c)return null;const items=layoutItems(L);const uid='u'+Date.now().toString(36)+Math.floor(Math.random()*1e4);
  if(c.wall){for(const[wx,wz,y,r]of HOME_SPOT.wall.concat(STATIC.wallSpans.map(sp=>{const m=(sp.s+sp.e)/2;return sp.alongX?[m,sp.face,c.y,wallFace(sp)]:[sp.face,m,c.y,wallFace(sp)]}))){
      const yy=c.y||y;for(const d of[0,-.5,.5,-1,1]){const x=FRONT[r][1]?wx+d:wx,z=FRONT[r][0]?wz+d:wz;if(!checkWall(id,x,z,yy,r,items))return{v:1,items:[...items,{uid,id,wx:x,wz:z,y:yy,r}]}}}return null}
  const[si,sj]=c.tags.includes('garage')?HOME_SPOT.garage:HOME_SPOT[c.zone];
  for(let rad=0;rad<40;rad++)for(let dj=-rad;dj<=rad;dj++)for(let di=-rad;di<=rad;di++){if(Math.max(Math.abs(di),Math.abs(dj))!==rad)continue;for(const r of[0,1,2,3]){if(!checkFloor(id,si+di,sj+dj,r,items))return{v:1,items:[...items,{uid,id,x:si+di,z:sj+dj,r}]}}}
  return null};

/* ======================================================================= decorate mode */
const D=Home.decorate={active:false,selected:null,r:0,aimInfo:null,hovered:null,ghost:null,foot:null,owned:null};
function ghostify(obj){obj.traverse(o=>{if(o.isMesh){o.material=D.gmat;o.castShadow=false;o.receiveShadow=false}});return obj}
function inv(){const own=D.owned||{};const placed={};for(const it of DEC.items)placed[it.id]=(placed[it.id]||0)+1;
  return CATALOG.map(c=>({id:c.id,name:c.name,price:c.price,wall:!!c.wall,count:Math.max(0,(own[c.id]||0)-(placed[c.id]||0))})).filter(i=>i.count>0)}
D.inventory=inv;
D.start=function(o={}){if(!CUR)return false;D.active=true;D.onChange=o.onChange;D.onExit=o.onExit;D.owned=o.owned||CUR.owned||Home.allOwned();D.people=o.people;
  D.gmat=new T.MeshBasicMaterial({color:0x6fdc7a,transparent:true,opacity:.42,depthWrite:false});D.fmat=new T.MeshBasicMaterial({color:0x6fdc7a,transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide});
  const list=inv();D.select(o.select||(list[0]&&list[0].id)||null);if(CUR.setCutaway&&o.cutaway)CUR.setCutaway(true);return true};
D.select=function(id){D.selected=id;if(D.ghost){D.ghost.parent&&D.ghost.parent.remove(D.ghost);D.ghost=null}if(D.foot){D.foot.parent&&D.foot.parent.remove(D.foot);D.foot=null}if(!id||!CUR)return;
  R=rng(3);D.ghost=ghostify(MAKE[id]?MAKE[id](null):new T.Group());D.ghost.userData.dyn=1;D.ghost.visible=false;CUR.ctx.dyn.add(D.ghost);
  const c=CAT[id];if(!c.wall){D.foot=new T.Mesh(new T.PlaneGeometry(1,1),D.fmat);D.foot.rotation.x=-PI/2;D.foot.visible=false;CUR.ctx.dyn.add(D.foot)}};
D.cycle=function(dir=1){const l=inv();if(!l.length){D.select(null);return}let i=l.findIndex(x=>x.id===D.selected);i=(i+dir+l.length)%l.length;D.select(l[i].id)};
D.rotate=function(){D.r=(D.r+1)%4;if(D.aimInfo)D.aim(D.lastO,D.lastD)};
const _ray=new T.Raycaster();let boxHelper=null;
D.aim=function(o,dir,people){if(!D.active||!CUR)return null;D.lastO=o.clone?o.clone():V(o.x,o.y,o.z);D.lastD=dir.clone?dir.clone():V(dir.x,dir.y,dir.z);if(people)D.people=people;
  /* hovered placed item (for remove / move) */
  _ray.set(D.lastO,D.lastD);_ray.far=9;const hits=DEC.group?_ray.intersectObjects(DEC.group.children,true):[];let hov=null;for(const h of hits){let p=h.object;while(p&&!p.userData.uid)p=p.parent;if(p){hov=p.userData.uid;break}}
  D.hovered=hov;if(boxHelper){boxHelper.parent&&boxHelper.parent.remove(boxHelper);boxHelper=null}if(hov&&!D.selected||hov&&D.wantHover){const ob=DEC.objs.get(hov);boxHelper=new T.BoxHelper(ob,0xe05050);CUR.ctx.dyn.add(boxHelper)}
  const c=CAT[D.selected];if(!c){D.aimInfo=null;return null}
  let info=null;
  if(c.wall){let best=null;for(const sp of STATIC.wallSpans){const ax=sp.alongX?'z':'x',dn=D.lastD[ax];if(dn*sp.sgn>=0)continue;const t=(sp.face-D.lastO[ax])/dn;if(t<=0||t>9)continue;const p=D.lastO.clone().addScaledVector(D.lastD,t);const a=sp.alongX?p.x:p.z;if(a<sp.s||a>sp.e||p.y<0||p.y>CEIL)continue;if(!best||t<best.t)best={t,sp,p}}
    if(best){const sp=best.sp,a=Math.round((sp.alongX?best.p.x:best.p.z)/.25)*.25,r=wallFace(sp);const wx=sp.alongX?a:sp.face,wz=sp.alongX?sp.face:a,y=c.y;
      info={wall:1,wx,wz,y,r,why:checkWall(c.id,wx,wz,y,r,DEC.items,D.moving)}}}
  else{if(D.lastD.y<-.01){const t=-D.lastO.y/D.lastD.y;if(t<10){const p=D.lastO.clone().addScaledVector(D.lastD,t);const[w,d]=dims(c,D.r);const x=Math.round(p.x/CELL-w/2),z=Math.round(p.z/CELL-d/2);
      info={x,z,r:D.r,why:checkFloor(c.id,x,z,D.r,DEC.items,D.moving,D.people||[])}}}}
  D.aimInfo=info;const ok=info&&!info.why;const col=ok?0x6fdc7a:0xe05050;D.gmat.color.setHex(col);D.fmat.color.setHex(col);
  if(D.ghost){D.ghost.visible=!!info;if(info){if(c.wall){const f=FRONT[info.r];D.ghost.position.set(info.wx+f[0]*.02,info.y,info.wz+f[1]*.02);D.ghost.rotation.y=info.r*PI/2}
    else{const[w,d]=dims(c,info.r);const x0=info.x*CELL,z0=info.z*CELL,x1=x0+w*CELL,z1=z0+d*CELL;const[sx,sz]=c.layer==='floor'?[0,0]:wallSnap(c,x0,z0,x1,z1,info.r);D.ghost.position.set((x0+x1)/2+sx,0,(z0+z1)/2+sz);D.ghost.rotation.y=info.r*PI/2;
      if(D.foot){D.foot.visible=true;D.foot.scale.set(w*CELL,d*CELL,1);D.foot.position.set((x0+x1)/2,.012,(z0+z1)/2)}}}else if(D.foot)D.foot.visible=false}
  return info};
D.place=function(){const c=CAT[D.selected],info=D.aimInfo;if(!c||!info)return{ok:false,reason:'Aim at the floor'};if(info.why)return{ok:false,reason:info.why};
  if(!D.moving&&!inv().some(i=>i.id===c.id))return{ok:false,reason:'None left in the garage'};
  const uid=D.moving||('u'+Date.now().toString(36)+Math.floor(Math.random()*1e4));const it=c.wall?{uid,id:c.id,wx:info.wx,wz:info.wz,y:info.y,r:info.r}:{uid,id:c.id,x:info.x,z:info.z,r:info.r};
  const items=DEC.items.filter(i=>i.uid!==D.moving).concat([it]);D.moving=null;applyLayout(CUR,{items});const L=serialize();if(D.onChange)D.onChange(L);
  if(!inv().some(i=>i.id===c.id))D.cycle(1);return{ok:true,layout:L}};
D.move=function(uid=D.hovered){const it=DEC.items.find(i=>i.uid===uid);if(!it)return false;D.moving=uid;D.r=it.r||0;D.select(it.id);const ob=DEC.objs.get(uid);if(ob)ob.visible=false;return true};
D.remove=function(uid=D.hovered){const it=DEC.items.find(i=>i.uid===uid);if(!it)return{ok:false,reason:'Aim at something you placed'};applyLayout(CUR,{items:DEC.items.filter(i=>i.uid!==uid)});const L=serialize();if(D.onChange)D.onChange(L);if(!D.selected)D.select(it.id);return{ok:true,layout:L,id:it.id}};
D.exit=function(){if(!D.active)return;D.active=false;D.select(null);D.selected=null;if(boxHelper){boxHelper.parent&&boxHelper.parent.remove(boxHelper);boxHelper=null}if(D.moving){const ob=DEC.objs.get(D.moving);if(ob)ob.visible=true;D.moving=null}
  if(CUR&&CUR.cutaway)CUR.setCutaway(false);const L=serialize();if(D.onExit)D.onExit(L);return L};
D.layout=serialize;


/* ======================================================================= family */
const FAMILY={jen:{name:'Jen',role:'spouse'},maddie:{name:'Maddie',role:'daughter'},tyler:{name:'Tyler',role:'son'},biscuit:{name:'Biscuit',role:'dog'}};
const ROLE_WHO={spouse:'jen',daughter:'maddie',son:'tyler',dog:'biscuit'};
Home.FAMILY=FAMILY;
/* stand-in people: the family glTFs on the shared Quaternius rig with the dad clips, posed for sitting by bending the leg bones */
const CLIPMAP={idle:'Idle',walk:'Walk',run:'Run',wave:'Wave',talk:'Interact',cook:'Interact',sit:'Idle_Neutral',phone:'Idle_Neutral',play:'Run',lie:'Idle',eat:'Idle',happy:'Wave'};
const DOGMAP={idle:'Idle',walk:'Walk',run:'Gallop',wave:'Jump_ToIdle',happy:'Jump_ToIdle',talk:'Idle_2',sit:'Idle_2',lie:'Idle_2_HeadLow',eat:'Eating',cook:'Idle',play:'Gallop'};
Home.makeStandIn=function(role){const key={spouse:'spouse_casual',son:'kid_son',daughter:'kid_daughter',dog:'dog_shiba',dad:'dad_casual'}[role];const g=LIB.gltf[key];
  const root=new T.Group();root.name='person:'+role;
  if(!g){/* simple capsule person */const c={spouse:'#c25b7a',son:'#e5a83a',daughter:'#4a8a7a',dog:'#d9a45b',dad:'#2f5d9e'}[role]||'#888';const s=role==='son'?.7:role==='daughter'?.85:1;
    if(role==='dog'){const b=rbx(root,.25,.25,.6,.1,'flat:'+c,0,.35,0);sph(root,.13,'flat:'+c,0,.5,.32)}else{rbx(root,.4*s,.7*s,.25*s,.1,'flat:'+c,0,1.05*s,0);rbx(root,.32*s,.8*s,.2*s,.08,'flat:#333',0,.4*s,0);sph(root,.12*s,'flat:#e2b48f',0,1.55*s,0)}
    return{root,setAnim(){},update(){},height:role==='dog'?.6:1.7*s}}
  const model=T.SkeletonUtils?T.SkeletonUtils.clone(g.scene):g.scene.clone(true);root.add(model);
  const sc={spouse:.93,son:1.02,daughter:1.3,dog:.9,dad:1}[role]||1;model.scale.multiplyScalar(sc);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false}});
  const clips=role==='dog'?g.animations:((OPT.assets&&OPT.assets.clips&&OPT.assets.clips())||(LIB.gltf.dad_casual&&LIB.gltf.dad_casual.animations)||[]);
  const mixer=new T.AnimationMixer(model);const acts={};for(const c of clips)acts[c.name]=mixer.clipAction(c);
  const map=role==='dog'?DOGMAP:CLIPMAP;let cur=null,curName='';
  const bone=n=>model.getObjectByName(n)||model.getObjectByName(n.replace('.',''));
  const B={hips:bone('Hips'),ul:bone('UpperLeg.L'),ur:bone('UpperLeg.R'),ll:bone('LowerLeg.L'),lr:bone('LowerLeg.R'),head:bone('Head'),neck:bone('Neck'),spine:bone('Spine'),
    ual:bone('UpperArm.L'),uar:bone('UpperArm.R'),lar:bone('LowerArm.R')};
  model.updateMatrixWorld(true);const hipY=B.hips?B.hips.getWorldPosition(V()).y:.9;
  const P={root,role,height:role==='dog'?.55:1.75*sc*(role==='son'||role==='daughter'?.65:1),pose:'',lookYaw:0,
    setAnim(name){const want=map[name]||map.idle;P.pose=name;if(want===curName)return;const a=acts[want]||acts[map.idle];if(!a)return;a.reset().fadeIn(.25).play();if(cur&&cur!==a)cur.fadeOut(.25);cur=a;curName=want;
      if(name==='wave'||name==='happy'){a.setLoop(T.LoopOnce,1);a.clampWhenFinished=false}else a.setLoop(T.LoopRepeat,Infinity)},
    update(dt){mixer.update(dt);const sit=P.pose==='sit'&&role!=='dog';
      if(sit&&B.ul&&B.ll){/* thighs forward, shins down */for(const[u,l]of[[B.ul,B.ll],[B.ur,B.lr]]){if(!u)continue;u.rotateX(-1.5);l.rotateX(1.45)}
        if(B.spine)B.spine.rotateX(.08)}
      model.position.y=sit?-(hipY-(P.seatH||.45)-.08*sc):role==='dog'&&P.pose==='lie'?-.12:0;
      if(P.pose==='phone'&&B.uar&&B.lar){B.uar.rotateX(-1.1);B.lar.rotateX(-1.6)}
      if(B.neck&&P.lookYaw)B.neck.rotateY(clamp(P.lookYaw,-.9,.9)*.6);if(B.head&&P.lookYaw)B.head.rotateY(clamp(P.lookYaw,-.9,.9)*.5)}};
  P.setAnim('idle');return P};
/* navigation graph: hand-placed nodes in clear lanes through the house and yard */
const NAV={door:[1.5,1.3],entry:[1.6,2.7],gin:[.55,2.75],gout:[-.75,2.75],gar_e:[-1.45,5.6],gar_s:[-1.6,8.55],bench:[-5.3,8.75],safe:[-5.6,7.9],gbi:[-1.6,9.55],gbo:[-1.6,10.9],
  ent_e:[3.5,3.4],liv_c:[6.6,4.5],liv_n:[6.6,.9],kit_ne:[3.75,4.75],kit_n:[1.5,5.35],kit_c:[1.35,7.2],kit_s:[1.4,8.85],kit_e:[4.25,8.85],isl_e:[4.1,7.1],
  din_n:[6.0,5.2],din_w:[5.4,7.2],din_s:[6.2,9.3],sl_in:[7.3,9.55],sl_out:[7.3,10.9],hall_o:[8.7,5.1],hall_c:[10.07,5.1],hall_b:[10.07,4.15],bed_in:[11.5,4.15],bed_c:[11.9,3.0],hall_k:[10.07,7.5],
  deck:[7.3,12.2],deck_e:[8.6,11.6],y_c:[5.2,17.0],y_w:[-2.2,15.4],y_e:[11.4,16.6],y_s:[5.0,21.3],swing:[-2.5,18.4],dh:[12.2,20.6],y_ne:[11.5,12.4],sand:[-4.6,14.0]};
const EDGES='door-entry entry-gin gin-gout gout-gar_e gar_e-gar_s gar_s-bench gar_s-safe safe-bench gar_s-gbi gbi-gbo gbo-y_w entry-ent_e ent_e-liv_c ent_e-kit_ne liv_c-liv_n liv_c-kit_ne liv_c-din_n liv_c-hall_o kit_ne-kit_n kit_n-kit_c kit_c-kit_s kit_s-kit_e kit_e-isl_e isl_e-kit_ne kit_e-din_s din_n-din_w din_w-din_s din_s-sl_in sl_in-sl_out sl_out-deck deck-deck_e deck-y_c deck_e-y_ne y_ne-y_e y_c-y_w y_c-y_e y_c-y_s y_w-swing y_s-swing y_e-dh y_s-dh y_w-sand din_n-hall_o hall_o-hall_c hall_c-hall_b hall_b-bed_in bed_in-bed_c hall_c-hall_k kit_ne-din_n'.split(' ').map(e=>e.split('-'));
function navPath(fx,fz,tx,tz){const near=(x,z)=>{let b=null,bd=1e9;for(const k in NAV){const d=Math.hypot(NAV[k][0]-x,NAV[k][1]-z);if(d<bd){bd=d;b=k}}return b};
  const a=near(fx,fz),b=near(tx,tz);const dist={},prev={},Q=new Set(Object.keys(NAV));for(const k of Q)dist[k]=1e9;dist[a]=0;
  while(Q.size){let u=null;for(const k of Q)if(u==null||dist[k]<dist[u])u=k;Q.delete(u);if(u===b)break;for(const[p,q]of EDGES){const v=p===u?q:q===u?p:null;if(!v||!Q.has(v))continue;const d=dist[u]+Math.hypot(NAV[u][0]-NAV[v][0],NAV[u][1]-NAV[v][1]);if(d<dist[v]){dist[v]=d;prev[v]=u}}}
  const path=[];let k=b;while(k&&k!==a){path.unshift(NAV[k]);k=prev[k]}if(Math.hypot(NAV[a][0]-fx,NAV[a][1]-fz)>.4)path.unshift(NAV[a]);
  path.push([tx,tz]);/* skip the first node if it sends us backwards */if(path.length>2&&Math.hypot(path[1][0]-fx,path[1][1]-fz)<Math.hypot(path[0][0]-path[1][0],path[0][1]-path[1][1]))path.shift();return path}
/* activities: spots + what to do there, weighted per family member and time of day */
function activities(H){const L=[];const t=H.ctx.timeOfDay,eve=t>=17&&t<21,morn=t<10,night=t>=21||t<6.5;
  const add=(id,x,z,face,anim,w,o={})=>L.push(Object.assign({id,x,z,face,anim,w,dur:[8,18]},o));
  add('cook',1.05,7.2,-PI/2,'cook',{jen:eve?6:morn?3:1.5});add('sink',2.2,9.0,0,'cook',{jen:2,maddie:.3});add('desk',1.95,5.15,PI,'phone',{jen:1,maddie:.8});
  add('grill',8.75,12.35,PI/2,'cook',{jen:eve?2:.5});add('garden',6.4,22.55,0,'cook',{jen:morn?2:1,tyler:.3});add('dresser',11.55,1.75,-PI/2,'idle',{jen:night?4:.4});
  add('bench',-5.3,9.0,0,'cook',{tyler:.8});add('sandbox',-4.6,14.25,0,'cook',{tyler:2});add('swing1',-3.15,19.6,0,'sit',{tyler:1.5,maddie:1.2},{seatH:.5,swing:1});add('swing2',-2.25,19.6,0,'sit',{tyler:1,maddie:1},{seatH:.5,swing:1});
  add('yardrun',5,17,0,'play',{tyler:night?0:3,biscuit:1.5},{wander:1});add('yardstroll',8,18,0,'phone',{maddie:night?0:1});add('island',3.62,7.1,-PI/2,'sit',{maddie:1.5,tyler:.5},{seatH:.66});
  add('dogbowl',4.7,9.35,0,'eat',{biscuit:1.2});add('doghouse',12.4,20.6,PI/2,'lie',{biscuit:night?.5:1.2});
  for(const s of DEC.seats){const tv=s.tags.includes('tv-facing');add('seat:'+s.uid+':'+s.x.toFixed(2),s.x,s.z,s.yaw,'sit',{jen:eve?1.5:.6,maddie:tv?2.2:1.2,tyler:tv?(eve?4:2.5):1},{seatH:s.h,seat:1})}
  for(const it of DEC.items){if(it.id==='dogbed'){const o=DEC.objs.get(it.uid);if(o)add('dogbed',o.position.x,o.position.z,it.r*PI/2,'lie',{biscuit:night?4:2.2},{dur:[15,30]})}
    if(it.id==='trampoline'){const o=DEC.objs.get(it.uid);if(o)add('tramp',o.position.x,o.position.z,0,'play',{tyler:3,maddie:1},{bounce:1,blocked:1})}}
  return L}
function initFamily(H,o){const mk=(OPT.makePerson||o.makePerson);H.family=[];const start={jen:[1.4,7.6],maddie:[6.2,6.6],tyler:[5,17],biscuit:[2.4,3.2]};
  for(const who in FAMILY){const f=FAMILY[who];let p=null;try{p=mk?mk(f.role):null}catch(e){console.warn('makePerson failed',e)}if(!p)p=Home.makeStandIn(f.role);if(!p)continue;
    const m={who,name:f.name,role:f.role,person:p,root:p.root,pos:V(...[start[who][0],0,start[who][1]]),yaw:0,state:'idle',timer:rr(.5,3),path:null,act:null,stuck:0,last:V()};
    p.root.position.copy(m.pos);H.ctx.dyn.add(p.root);H.family.push(m);if(H.probe)applyProbe(p.root,H.probe)}
  H.familyNear=(x,z,r)=>H.family.some(m=>Math.hypot(m.pos.x-x,m.pos.z-z)<r);
  H.onEnter=(c={})=>{const line=Home.familyLine(Object.assign({},c,{greet:true}));for(const m of H.family){m.greet=line&&line.who===m.who?2.5:0}H.greeting={t:0,line,who:line&&line.who};
    const sp=H.family.find(m=>m.who===(line&&line.who))||H.family.find(m=>m.role==='spouse');if(sp)goTo(H,sp,{id:'greet',x:H.spawn.x+.2,z:H.spawn.z+1.3,face:PI,anim:'wave',dur:[4,6]});
    const dog=H.family.find(m=>m.role==='dog');if(dog)goTo(H,dog,{id:'greetdog',x:H.spawn.x-.5,z:H.spawn.z+.9,face:PI,anim:'happy',dur:[3,5]},true);return line};
  H.talk=(who,c={})=>{const m=H.family.find(f=>f.who===who);if(m){m.talkT=3;m.person.setAnim(m.role==='dog'?'happy':'talk')}return Home.familyLine(Object.assign({},c,{who}))};
  H.pet=()=>H.talk('biscuit',{event:'pet'});
  H.ctx.updaters.push((dt,pp)=>{for(const m of H.family)brain(H,m,dt,pp)});
  /* family members are only "near" the interaction prompt list as dynamic interactables */
  H.familyInteractables=()=>H.family.map(m=>({id:'family',who:m.who,x:m.pos.x,z:m.pos.z,r:1.4,label:m.role==='dog'?'Pet '+m.name:'Talk to '+m.name}))}
function goTo(H,m,act,run){m.act=act;m.path=navPath(m.pos.x,m.pos.z,act.x,act.z);m.state='walk';m.run=!!run;m.stuck=0;m.person.seatH=act.seatH;m.person.setAnim(run?'run':'walk')}
function pickActivity(H,m){const list=activities(H).filter(a=>(a.w[m.who]||0)>0&&!H.family.some(o=>o!==m&&o.act&&o.act.id===a.id&&!a.wander));
  if(m.role==='dog'&&R()<.4)return{id:'follow',follow:1};let tot=0;for(const a of list)tot+=a.w[m.who];let r=R()*tot;for(const a of list){r-=a.w[m.who];if(r<=0)return a}return list[0]}
const _v=V();
function brain(H,m,dt,pp){const P=m.person;
  if(m.talkT>0){m.talkT-=dt;if(pp)faceTo(m,pp.x,pp.z,dt*4);if(m.talkT<=0)P.setAnim(m.state==='act'?m.act.anim:'idle');finish(m,P,dt);return}
  if(m.state==='idle'){m.timer-=dt;if(m.timer<=0){const a=pickActivity(H,m);if(!a){m.timer=2}else if(a.follow){m.state='follow';m.timer=rr(12,25);m.act=a}else{
      if(a.wander){a.x=rr(-3,12);a.z=rr(13.5,22.5)}goTo(H,m,a,m.role==='dog'||a.wander&&m.who==='tyler')}}}
  else if(m.state==='walk'){const tgt=m.path&&m.path[0];if(!tgt){arrive(H,m);finish(m,P,dt);return}const dx=tgt[0]-m.pos.x,dz=tgt[1]-m.pos.z,d=Math.hypot(dx,dz);
    const sp=(m.role==='dog'?(m.run?3.2:1.6):m.role==='spouse'?1.35:(m.run?3.2:1.6))*dt;if(d<.15+sp){m.path.shift();if(!m.path.length){arrive(H,m)}}else{m.pos.x+=dx/d*sp;m.pos.z+=dz/d*sp;faceTo(m,tgt[0],tgt[1],dt*7)}
    slide(H,m);m.stuck=m.pos.distanceTo(m.last)<sp*.3?m.stuck+dt:0;m.last.copy(m.pos);if(m.stuck>1.2){m.path.shift();m.stuck=0;if(!m.path.length)arrive(H,m)}}
  else if(m.state==='act'){m.timer-=dt;const a=m.act;faceAngle(m,a.face,dt*5);
    if(a.bounce)m.root.position.y=Math.abs(Math.sin(performance.now()/260))*.55+.8;
    if(pp&&a.anim!=='sit'&&a.anim!=='lie'&&Math.hypot(pp.x-m.pos.x,pp.z-m.pos.z)<2.6&&!a.seat)faceTo(m,pp.x,pp.z,dt*3);
    if(m.timer<=0){m.state='idle';m.timer=rr(1,4);m.act=null;P.setAnim('idle');P.seatH=null}}
  else if(m.state==='follow'){m.timer-=dt;if(pp){const d=Math.hypot(pp.x-m.pos.x,pp.z-m.pos.z);if(d>2.4){const p=navPath(m.pos.x,m.pos.z,pp.x,pp.z);const tgt=p.length>1&&Math.hypot(pp.x-m.pos.x,pp.z-m.pos.z)>4?p[0]:[pp.x,pp.z];
      const dx=tgt[0]-m.pos.x,dz=tgt[1]-m.pos.z,dd=Math.hypot(dx,dz)||1,sp=(d>4?3.4:2)*dt;m.pos.x+=dx/dd*sp;m.pos.z+=dz/dd*sp;faceTo(m,tgt[0],tgt[1],dt*8);slide(H,m);P.setAnim(d>4?'run':'walk')}
      else{P.setAnim(d<1.6?'sit':'idle');faceTo(m,pp.x,pp.z,dt*3)}}if(m.timer<=0){m.state='idle';m.timer=1;P.setAnim('idle')}}
  /* greet: turn towards the player when they are close */
  P.lookYaw=0;if(pp&&m.role!=='dog'){const d=Math.hypot(pp.x-m.pos.x,pp.z-m.pos.z);if(d<3.2){const want=Math.atan2(pp.x-m.pos.x,pp.z-m.pos.z);P.lookYaw=wrap(want-m.yaw)}}
  finish(m,P,dt)}
function finish(m,P,dt){if(!(m.act&&m.act.bounce&&m.state==='act'))m.root.position.y=0;m.root.position.x=m.pos.x;m.root.position.z=m.pos.z;m.root.rotation.y=m.yaw;
  if(m.act&&m.act.swing&&m.state==='act'){const s=Math.sin(performance.now()/700)*.35;m.root.position.z+=s;m.root.position.y=Math.abs(s)*.25}P.update(dt)}
function arrive(H,m){const a=m.act;if(!a){m.state='idle';m.timer=1;return}if(a.wander){m.state='idle';m.timer=rr(.3,1.5);m.person.setAnim('idle');if(R()<.6){a.x=rr(-3,12);a.z=rr(13.5,22.5);goTo(H,m,a,m.who==='tyler')}return}
  m.state='act';m.timer=rr(...(a.dur||[8,18]));m.pos.set(a.x,0,a.z);m.person.seatH=a.seatH;m.person.setAnim(a.anim)}
function slide(H,m){const r=.2;for(const c of H.colliders){if(m.pos.x+r>c.x0&&m.pos.x-r<c.x1&&m.pos.z+r>c.z0&&m.pos.z-r<c.z1){const ox1=m.pos.x+r-c.x0,ox2=c.x1-(m.pos.x-r),oz1=m.pos.z+r-c.z0,oz2=c.z1-(m.pos.z-r);
  if(Math.min(ox1,ox2)<Math.min(oz1,oz2))m.pos.x+=ox1<ox2?-ox1:ox2;else m.pos.z+=oz1<oz2?-oz1:oz2}}}
const wrap=a=>{while(a>PI)a-=TAU;while(a<-PI)a+=TAU;return a};
function faceAngle(m,a,k){m.yaw+=wrap(a-m.yaw)*Math.min(1,k)}
function faceTo(m,x,z,k){faceAngle(m,Math.atan2(x-m.pos.x,z-m.pos.z),k)}

/* ======================================================================= family lines (SPEC C.6) */
const FAMILY_LINES={
 firstVisit:["jen|You're home! Did you remember the milk? You didn't. That's okay. Go save the neighborhood.","jen|Gun locker's in the garage, laptop's on the kitchen desk, and the credit card has a limit. A real one.",
  "maddie|Dad, the Wi-Fi is slow again. Can you do the thing where you unplug it and plug it back in?","tyler|Is it true you're in a gang now? Mom said 'neighborhood watch' and did the air quotes."],
 win:["jen|You smell like a chop shop. Shower first, then tell me everything.","tyler|Did you win? Did you do a cool jump? Tell me about the jump.","maddie|Coach Rick posted a photo of you guys. You're all doing the dad squint.",
  "tyler|Can I see your zip-ties? I just want to hold one. I won't zip anything.","maddie|My friends' dads are doing this now. It's, like, a trend. Please stop.","jen|I'm proud of you. Also the lawn is still a foot tall. Both things are true."],
 win_gary:["jen|Mrs. Patel called. She cried. Then she sent a casserole. We have four casseroles now."],
 win_rick:["tyler|Coach Rick gave you his GUN? He won't even let me hold the orange cones."],
 win_dave:["jen|Dave sent home a whole brisket. I'm not saying I married the wrong guy. I'm saying I get it."],
 win_doug:["jen|The Porch Pirate King is coaching T-ball? The Hendersons' kid is on that team!","jen|Doug says it's over. Doug also says the mailman is 'suspicious.' But I believe him this time."],
 fail:["jen|Hey. You came home. That's the part that counts. Ice pack's in the freezer.","tyler|It's okay, Dad. I lose at Mario Kart all the time and I'm still pretty great.","maddie|I made you a playlist. It's called 'Dad Tried His Best.' It's mostly Springsteen.",
  "jen|Rick called. He said 'we regroup at halftime.' I assume that means dinner.","jen|Sit. Eat something. Then go back and finish it. In that order."],
 trustHigh:["jen|Somebody returned our recycling bin. Washed. With a thank-you note.","maddie|Mr. Henderson waved at me. He has never waved. At anyone.","tyler|I left my bike on the lawn all day and it's STILL THERE.",
  "jen|The block party committee wants you to give a speech. I said you'd bring chairs instead.","maddie|Doug put the binoculars away. Well. Mostly away."],
 trustLow:["jen|When they put their hands up, honey, you use the zip-ties. That's the whole point.","maddie|Kids at school say you guys are scary. Are you? You're not. Right?","tyler|Mrs. Patel crossed the street when she saw our van.",
  "jen|We said 'second chances' at the HOA meeting. Let's mean it.","jen|I want the neighbors to feel safe. Not scared of us. Okay?"],
 boughtGun:["jen|Another gun? Is that the one with the little red light? Babe.","tyler|Can I name it? I'm naming it Gerald.","jen|Locked in the locker, key on your keyring, not on the hook. I'm watching you."],
 boughtFurniture:["jen|A new couch? Okay. I love it. I'm annoyed that I love it.","maddie|First decorating choice you've made since 2011. I'm honestly proud.","tyler|Can the trampoline go in the living room? Just asking. As a question.",
  "jen|Where's the old one going? Don't say the garage. The garage is full of dad."],
 boughtAttachment:["tyler|A muffler for a gun? Like the van? Does it make it go faster?","jen|You'll put a little red dot on your gun but you won't fix the porch light."],
 flamingo:["jen|The flamingo can stay. In the back. Where the HOA camera can't see it."],
 idle:["jen|Burgers tonight? You grill, I judge.","tyler|Dad, what's a chop shop? Is it for pork chops?","maddie|Can I borrow twenty dollars? For a reason. A good one.","jen|Gutters. Before the next raid. I'm serious."],
 dog:["biscuit|*Biscuit brings you one sock. Not a pair. Just the one.*","biscuit|*Biscuit rolls over. Belly up. Total trust. The neighborhood could learn something.*",
  "biscuit|*Biscuit sniffs your boots for a long time. He's reading the whole mission report.*","biscuit|*Biscuit sits perfectly, looks at the treat jar, then you, then the jar.*",
  "biscuit|*Biscuit leans his full weight on your legs. You are not going anywhere.*","biscuit|*Biscuit does zoomies around the grill. Nobody is safe. Everybody is happy.*",
  "biscuit|*Biscuit growls at the gun locker. He has never forgiven the Garage Pistol.*"]};
Home.FAMILY_LINES=FAMILY_LINES;
const LS={seen:[],firstVisit:true};Home.lineState=()=>({seen:LS.seen.slice(),firstVisit:LS.firstVisit});Home.setLineState=s=>{if(s){LS.seen=(s.seen||[]).slice();if(s.firstVisit!=null)LS.firstVisit=s.firstVisit}};
/* context: {event:'firstVisit'|'win'|'win_gary'|'fail'|'boughtGun'|'boughtFurniture'|'boughtAttachment'|'flamingo'|'pet'|null, who:'jen'|'maddie'|'tyler'|'biscuit'|null, trust:0-100, shotSurrUp:bool}
   pools are tried firstVisit > event > trust band > idle; a member with no line in a pool falls through; lines don't repeat until a pool is used up */
Home.familyLine=function(c={}){const who=c.who||null;const pools=[];
  if(who==='biscuit'||c.event==='pet')pools.push('dog');else{
    if(LS.firstVisit&&(c.event==='firstVisit'||c.greet))pools.push('firstVisit');
    if(c.event&&c.event!=='firstVisit'){if(FAMILY_LINES[c.event])pools.push(c.event);if(c.event.startsWith('win_'))pools.push('win')}
    if(c.shotSurrUp)pools.push('trustLow');else if(c.trust!=null){if(c.trust>=70)pools.push('trustHigh');else if(c.trust<30)pools.push('trustLow')}
    pools.push('idle')}
  for(const pool of pools){const L=FAMILY_LINES[pool];let cand=L.map((l,i)=>({l,i})).filter(o=>!who||o.l.startsWith(who+'|'));if(!cand.length)continue;
    let fresh=cand.filter(o=>!LS.seen.includes(pool+':'+o.i));if(!fresh.length){LS.seen=LS.seen.filter(k=>!k.startsWith(pool+':'));fresh=cand}
    const o=c.greet?fresh[0]:fresh[Math.floor(Math.random()*fresh.length)];LS.seen.push(pool+':'+o.i);if(pool==='firstVisit'&&c.greet)LS.firstVisit=false;
    const[w,text]=o.l.split('|');return{who:w,name:(FAMILY[w]||{}).name||w,text,pool}}
  return null};

/* ======================================================================= build */
const FIX=[(G,c)=>kitchenRuns(G,c),entry,laptopDesk,hall,bedroom,garage,livingDining,interiorLights,yard,street];          /* fixture builders: fn(G, ctx) */
let CUR=null;          /* the live home instance */
Home.build=function(o={}){
  if(!Home.loaded)console.warn('HT.Home.build before init() finished: missing models fall back to procedural stand-ins');
  genTextures();R=rng(21);
  for(const k of['colliders','aoRects','block','reserve','wallSpans','noWall'])STATIC[k].length=0;DOORS.length=0;WINDOWS.length=0;
  const root=new T.Group();root.name='home';
  const stat=new T.Group();stat.name='home-static';root.add(stat);
  const dyn=new T.Group();dyn.name='home-dynamic';dyn.userData.dyn=1;root.add(dyn);
  const ctx={o,root,stat,dyn,updaters:[],interactables:[],exits:[],lights:[],emissive:[],seats:[],solidsExtra:[],timeOfDay:o.timeOfDay??15};
  const WB=new BucketSet();buildWalls(stat,WB);const wallMeshes=WB.meshes();for(const m of wallMeshes)root.add(m);
  const fl=buildFloors(root);
  const roof=buildRoof(root);
  buildExteriorDetails(stat);
  buildGround(root);
  for(const f of FIX)f(stat,ctx);
  /* yard fence */
  for(const[a,b]of[[[-7.2,10.2],[-7.2,24]],[[-7.2,24],[15.2,24]],[[15.2,24],[15.2,10.2]]])fenceRun(stat,a,b);
  const aoTex=bakeFloorAO();for(const m of fl.floors){m.material.aoMap=aoTex;m.material.aoMapIntensity=1;m.material.needsUpdate=true}
  /* move animated doors into the dynamic group, then merge everything static */
  for(const d of DOORS){const ob=d.pivot||d.slide;dyn.attach(ob)}
  stat.traverse(o=>{if(o.userData.dynGlass)o.userData.dyn=1});
  const merged=mergeStatic(stat);
  /* glass is transparent: keep it out of the shadow pass and draw it after the opaque meshes */
  for(const m of merged){if(m.material.name==='glass'){m.castShadow=false;m.renderOrder=2}}
  const solids=[...wallMeshes,...merged.filter(m=>m.userData.solid||/^merged:(cab|quartz|steel|flat|trim|fence|wood|metal)/.test(m.name)),fl.ceil[0],...ctx.solidsExtra].filter(Boolean);
  const H={group:root,colliders:STATIC.colliders.slice(),solids,ctx,roof,ceiling:fl.ceil,doors:DOORS.slice(),
    spawn:{x:1.48,z:1.25,yaw:Math.PI},
    exits:[{id:'front',x:1.48,z:.75,r:.9,label:'Head outside'},{id:'garage',x:-3.7,z:.9,r:1.4,label:'Take the van'}],
    interactables:ctx.interactables,lights:{list:ctx.lights,setTimeOfDay:t=>setTimeOfDay(ctx,t)},
    update:(dt,pp)=>update(ctx,dt,pp),setCutaway:on=>setCutaway(H,on),stats:()=>stats(root),
    bakeReflections:(renderer,scene)=>bakeProbe(H,renderer,scene),vanSpot:ctx.vanSpot};
  if(o.renderer&&o.scene){o.scene.add(root);bakeProbe(H,o.renderer,o.scene)}
  ctx.exits=H.exits;buildGrid(ctx);CUR=H;H.owned=o.owned||null;
  const v=Home.validate(o.layout||Home.starterLayout(),o.owned);H.dropped=v.dropped;if(v.dropped.length)console.warn('home layout: dropped',v.dropped.map(d=>d.id+' ('+(d.why||'not owned')+')').join(', '));
  applyLayout(H,v.layout);H.setLayout=L=>applyLayout(H,Home.validate(L,H.owned).layout);
  if(typeof initFamily==='function')initFamily(H,o);
  setTimeOfDay(ctx,ctx.timeOfDay);
  return H};
/* reflection probe: one HDR cube render from the middle of the house, prefiltered, used as the image light for every interior material
   (the sky IBL alone makes interiors look blue and flat; this makes mirrors, steel and glossy floors reflect the actual rooms) */
function bakeProbe(H,renderer,scene,pos=V(5.6,1.45,5.4)){try{
  const rt=new T.WebGLCubeRenderTarget(256,{type:T.HalfFloatType,format:T.RGBAFormat,generateMipmaps:false});const cam=new T.CubeCamera(.05,120,rt);cam.position.copy(pos);
  H.group.updateMatrixWorld(true);const tm=renderer.toneMapping,oe=renderer.outputEncoding,hidden=[];
  H.group.traverse(o=>{if(o.userData.noProbe&&o.visible){o.visible=false;hidden.push(o)}});
  renderer.toneMapping=T.NoToneMapping;renderer.outputEncoding=T.LinearEncoding;scene.add(cam);cam.update(renderer,scene);scene.remove(cam);renderer.toneMapping=tm;renderer.outputEncoding=oe;for(const o of hidden)o.visible=true;
  const pm=new T.PMREMGenerator(renderer);const env=pm.fromCubemap(rt.texture).texture;pm.dispose();rt.dispose();
  if(H.probe)H.probe.dispose();H.probe=env;applyProbe(H.group,env);return env}catch(e){console.warn('home reflection probe failed',e);return null}}
function applyProbe(root,env){const seen=new Set();root.traverse(o=>{if(!o.isMesh)return;for(const m of[].concat(o.material)){if(!m||seen.has(m)||!m.isMeshStandardMaterial||m.userData.ext)continue;seen.add(m);
  let p=o,out=false;const wp=o.getWorldPosition(V());if(wp.x<-7.3||wp.x>15.3||wp.z<-.3||wp.z>10.3)out=true;if(out&&!m.userData.inUse)continue;m.userData.inUse=1;m.envMap=env;m.envMapIntensity=m.userData.probeK||1;m.needsUpdate=true}})}
Home.applyProbe=o=>{if(CUR&&CUR.probe)applyProbe(o,CUR.probe)};
function setCutaway(H,on){for(const m of[...H.roof,...H.ceiling]){m.traverse(o=>{if(o.isMesh){o.material=o.material;o.userData.cut=on;if(on){o.userData.mat0=o.userData.mat0||o.material;const c=o.userData.mat0.clone();c.colorWrite=false;c.depthWrite=false;o.material=c}else if(o.userData.mat0)o.material=o.userData.mat0}})}H.cutaway=on}
function setTimeOfDay(ctx,t){ctx.timeOfDay=t;const night=t<6.5||t>19.5,eve=t>=17&&t<=19.5,k=night?1:eve?.85:t<9?.6:.45;
  for(const l of ctx.lights){l.intensity=l.userData.base*(l.userData.alwaysOn?1:k)}
  for(const e of ctx.emissive){if(e.material&&e.material.color&&e.userData.base){e.material.color.copy(e.userData.base).multiplyScalar(night||eve?1:.7)}}}
function update(ctx,dt,pp){for(const f of ctx.updaters)f(dt,pp);
  for(const d of DOORS){if(d.auto&&pp){const near=Math.hypot(pp.x-d.cx,pp.z-d.cz)<1.7||(CUR&&CUR.familyNear&&CUR.familyNear(d.cx,d.cz,1.3));d.target=near?1:0}
    d.amt+=clamp(d.target-d.amt,-dt*2.2,dt*2.2);const e=d.amt*d.amt*(3-2*d.amt);
    if(d.pivot)d.pivot.rotation.y=d.base+d.openAng*e;if(d.slide){const off=d.len*e;d.alongX?d.slide.position.x=off:d.slide.position.z=off}
    const open=d.amt>.6;if(open&&d.colliding){d.saved={...d.colRef};d.colRef.x0=d.colRef.x1=d.colRef.z0=d.colRef.z1=-999;d.colliding=false}
    else if(!open&&!d.colliding&&d.saved){Object.assign(d.colRef,d.saved);d.colliding=true}}}
function stats(root){let tris=0,calls=0;root.traverse(o=>{if(o.isMesh&&o.visible){calls+=Array.isArray(o.material)?o.material.length:1;const g=o.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3}});return{tris:Math.round(tris),drawCalls:calls}}

Home._internal={LIB,CT,M,genTextures,photoCanvas,crayonCanvas};
})();
