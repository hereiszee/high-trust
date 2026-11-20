/* =====================================================================
   EXHIBIT HOA (SPEC3 2.2): stakeout with photo evidence. Barb, HOA president (and realtor), with Maddie on tech support by text.
   1418 Walnut Dr has been for sale for 31 days, with a moving truck in front of it every evening, and it has never sold.
   It's a fence. The HOA won't act without evidence: Article Nine, Section C. Six violations, a phone, a summer evening.

   Stages ([CP]): 'stakeout' (retry: they're back the next night, fresh clock, empty board) -> 'meeting' (the emergency HOA meeting).
   The stakeout: 4 real minutes (7:00 -> 7:06 PM on the phone's clock). A crew of four on a schedule: the lookout walks a loop with a
   vision cone (pauses at the corner of Maple Ave facing west, and at the south end of Walnut facing south), two loaders carry crates
   from the garage to the truck, the driver stands at the cab on the phone, and a buyer walks up three times to pay him.
   Five vantage points, each with a different view and a different risk: the bushes across the street, Phil's porch (talk your way on),
   Barb's sister's Buick (sit in it), Barb's backyard fence (crouch), and the bins by the garage (right next to them: risky).
   Being seen on a public sidewalk with a phone is fine while you walk; loitering is not; filming them while they look is worst;
   their lawn is trespassing. Suspicion 100 = they spook: the truck leaves early and the job fails ("They'll be back next week").
   The board needs 2 stars on 5 of the 6 items; 6 at 3 stars is gold. Photo system: js/photo.js (HT.Photo, loaded by this file).
   The trust twist: no zip-ties at all. A 3-star photo of the lookout's face and Barb offers the kid a summer job mowing lawns.
   Files: js/jobs/hoa.js, js/photo.js, dev/jobs/hoa.js, docs/screenshots/jobs/hoa/. Test: node dev/jobs-check.js hoa --retry --replay --shots
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
(function(){const d=typeof document!=='undefined'?document:null;if(!d||!d.head||!d.createElement)return;
  if(!(window.HT.Photo&&HT.Photo.begin)&&!d.getElementById('ht-photo-js')){const s=d.createElement('script');s.id='ht-photo-js';s.src='js/photo.js';d.head.appendChild(s)}})();
const PH=()=>window.HT&&HT.Photo&&HT.Photo.begin?HT.Photo:null;

/* ---------------- tuning ---------------- */
const T={stake:240,clock0:19*60,clockSpan:6,          /* 240 real seconds = 7:00 -> 7:06 PM */
  loop:[4.6,7,10.4,7,5.8,5],walk:1.3,carry:1.1,      /* lookout legs (s) */
  ex:[54,138,204],exWalk:11,exHold:7,                /* buyer: three payments, 11 s walk in, 7 s handover */
  fill:.9,decay:.11,grace:2.5,look:.35,inv:.6,spook:1,floorT:20,flashSus:.35,loiter:3,quiet:.6,
  need:2,needN:5,pay3:30,calm:.6,calmPay:100};
const SUS_R={lookout:22,driver:12,loader:9,buyer:8};
const SUS_HALF={lookout:50,driver:45,loader:45,buyer:40};
const SUS_RATE={lookout:1,driver:.6,loader:.5,buyer:.45};

/* ---------------- the evidence checklist (HOA violation language) ---------------- */
const ITEMS=[
  {id:'bike',label:'Stolen bike',sec:'§4.2 Bicycle, stolen, garage',short:'Bike'},
  {id:'crate',label:'Maple porch crate',sec:'§7.1 Parcel, not theirs',short:'Crate'},
  {id:'plate',label:"The truck's plate",sec:'§9.3 Commercial vehicle',short:'Plate'},
  {id:'face',label:"The lookout's face",sec:'§2.8 Loitering minor',short:'Lookout'},
  {id:'money',label:'Money changing hands',sec:'§11.6 Unlicensed retail',short:'Money'},
  {id:'sold',label:'Fake SOLD sign',sec:'§3.4 Fraudulent signage',short:'SOLD sign'}];
const BARB_ON={bike:["Is that a bike or a ladder? It's a blur, dear.","That's a bike. That's a stolen bike. Exhibit A.","The Okafor twins' bike. It has STREAMERS. Exhibit A."],
  crate:["A box. Could be anyone's box.","'Maple. Porch.' That's a porch parcel. That's somebody's porch.","'1209 Maple. Porch.' That's Linda's address. Linda has been blaming the mailman for a month."],
  plate:["A truck. All trucks look the same to the board.","'N-V-R S-L-D.' Never sold. On a vanity plate.","'N-V-R S-L-D.' Never sold. They put it on a vanity plate. The arrogance."],
  face:["A young man, from a distance. Could be my nephew.","A face. A young face. Hm.","Three stars. Look at that grain. You can see his regret."],
  money:["Two men... near each other.","Cash. In an envelope. On a weeknight.","Cash. In an envelope. On a weeknight. In MY HOA."],
  sold:["Something red in a garage.","A SOLD sign that says 'not really'.","'Not really.' They wrote 'not really' on a SOLD sign. That is real estate fraud. I would know."]};
const BARB_MISS={bike:"No bike. We'll take their word for it, which I hate.",crate:"No parcel photo. Linda will keep blaming the mailman.",plate:"No plate. Article Nine, Section C. We'll manage.",
  face:"No face on the lookout. Pity. He looked like he needed a summer job.",money:"No money shot. Gil will ask. Gil always asks.",sold:"No SOLD sign. Pinnacle Homes gets away with it. Again."};

/* ---------------- the place (metres). The site: garage x116-120 z50-56 (door on the west face), driveway x114-116, Walnut Dr x106-112 ---------------- */
let LAY=null;
function lay(){if(LAY)return LAY;const a=A(),W=a&&a.WORLD,s=W&&W.sites&&W.sites.walnut;const g=s&&s.garage||{x0:116,z0:50,x1:120,z1:56};
  const gx0=g.x0,gz0=g.z0,gz1=g.z1,dz=(gz0+gz1)/2;/* door centre z=53 */
  LAY={garage:{x0:gx0,z0:gz0,x1:g.x1,z1:gz1},door:{x:gx0,z:dz},
    truck:{x:110.9,z:gz0-2.4,yaw:0},                                  /* moving truck at the kerb, nose north, rear doors by the driveway */
    plate:{x:110.9,y:.56,z:gz0-2.4+2.72},
    lk:{door:{x:gx0-.9,z:dz-.1},n:{x:113.3,z:47.3},s:{x:113.2,z:61.2},side:{x:113.4,z:52.6}},
    cab:{x:108.95,z:gz0-3.9},exD:{x:111.45,z:56.15},exB:{x:111.5,z:57.0},buyerFrom:{x:112.4,z:73},buyerVia:{x:112.4,z:58.6},
    inA:{x:gx0+1.9,z:dz-.4},inB:{x:gx0+2.0,z:dz-1.4},rear:{x:110.95,z:gz0-2.4+3.45},apron:{x:gx0-.4,z:dz+.3},
    crates:{x:gx0+2.7,z:dz+.9},bike:{x:gx0+1.3,z:gz1-.95},sold:{x:gx0+1.6,z:gz0+.9},
    bushes:{x:102.95,z:56.35},bushHide:{x:101.25,z:56.4},
    phil:{x:99.3,z:48.7},porch:{x:102.3,z:48.65},
    car:{x:107.45,z:60.6,yaw:0},seat:{x:107.07,y:1.17,z:60.85},carDoor:{x:105.6,z:60.7},
    fence:{x0:116.4,x1:126.2,z:56.85},fenceSpot:{x:119.4,z:57.45},
    bins:{x:115.05,z:49.6},binHide:{x:115.72,z:49.35},
    barb:{x:121.6,z:66.7},meet:{x:118.0,z:64.95},podium:{x:120.45,z:65.55},ring:{x:118.5,z:71.2},
    lot:{x0:113.9,z0:47.9,x1:127.4,z1:56.6},barbYard:{x0:115.6,z0:56.85,x1:127,z1:58.2},barbLawn:{x0:115,z0:64,x1:127,z1:68}};
  return LAY}

/* ---------------- textures (canvas, built once) ---------------- */
let TX=null;
function cvTex(w,h,fn){const a=A(),THREE=a.THREE,c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);if(THREE.sRGBEncoding)t.encoding=THREE.sRGBEncoding;t.anisotropy=4;t.userData={canvas:c};return t}
function tex(){if(TX)return TX;TX={};
  TX.plate=cvTex(256,128,(x,w,h)=>{x.fillStyle='#f4f2ea';x.fillRect(0,0,w,h);x.strokeStyle='#1d3a5f';x.lineWidth=6;x.strokeRect(5,5,w-10,h-10);
    x.fillStyle='#1d3a5f';x.font='700 18px Arial';x.textAlign='center';x.fillText('PLEASANT STATE',w/2,30);x.fillStyle='#14161a';x.font='900 58px "Arial Narrow",Arial';x.fillText('NVR·SLD',w/2,96);
    x.fillStyle='#b8323a';x.font='700 13px Arial';x.fillText('LAND OF NICE LAWNS',w/2,116)});
  TX.side=cvTex(1024,256,(x,w,h)=>{x.clearRect(0,0,w,h);x.fillStyle='#e8611c';x.fillRect(0,h-46,w,30);x.fillStyle='#2b3f73';x.fillRect(0,h-16,w,8);
    x.fillStyle='#2b3f73';x.font='italic 900 112px "Arial Black",Arial';x.textAlign='left';x.fillText("MOVIN' ON",40,138);
    x.fillStyle='#e8611c';x.font='700 38px Arial';x.fillText('LOCAL · LONG DISTANCE · NO QUESTIONS',44,192)});
  TX.crate=cvTex(256,256,(x,w,h)=>{x.fillStyle='#b98a52';x.fillRect(0,0,w,h);x.globalAlpha=.18;for(let i=0;i<60;i++){x.fillStyle=Math.random()<.5?'#6b4a22':'#e0b980';x.fillRect(0,Math.random()*h,w,1+Math.random()*2)}x.globalAlpha=1;
    x.fillStyle='rgba(60,40,15,.35)';x.fillRect(0,0,w,10);x.fillRect(0,h-10,w,10);x.fillRect(0,0,10,h);x.fillRect(w-10,0,10,h)});
  TX.label=cvTex(256,192,(x,w,h)=>{x.fillStyle='#fbfaf4';x.fillRect(0,0,w,h);x.fillStyle='#14161a';x.font='700 20px Arial';x.fillText('DELIVER TO:',14,32);x.font='900 34px "Arial Narrow",Arial';x.fillText('1209 MAPLE AVE',14,74);
    x.font='700 26px Arial';x.fillText('LEAVE ON PORCH',14,110);x.fillStyle='#b8323a';x.fillRect(14,126,w-28,4);x.fillStyle='#14161a';for(let i=0;i<34;i++)x.fillRect(16+i*6.5,140,i%3?3:5,38);x.font='700 12px Arial';x.fillText('DADAZON',196,186)});
  TX.leaf=cvTex(128,128,(x,w,h)=>{x.fillStyle='#2f5a2a';x.fillRect(0,0,w,h);for(let i=0;i<900;i++){const g=60+Math.random()*90|0;x.fillStyle=`rgb(${30+Math.random()*30|0},${g},${25+Math.random()*25|0})`;const r=1.5+Math.random()*3.5;x.beginPath();x.ellipse(Math.random()*w,Math.random()*h,r,r*.6,Math.random()*3,0,6.28);x.fill()}});
  TX.leaf.wrapS=TX.leaf.wrapT=A().THREE.RepeatWrapping;
  TX.wood=cvTex(128,256,(x,w,h)=>{x.fillStyle='#d8cdb8';x.fillRect(0,0,w,h);x.globalAlpha=.25;for(let i=0;i<40;i++){x.fillStyle=Math.random()<.5?'#a8977a':'#f0e8d8';x.fillRect(Math.random()*w,0,1+Math.random()*2,h)}x.globalAlpha=1});
  TX.eye=cvTex(64,64,(x,w,h)=>{x.fillStyle='rgba(0,0,0,0)';x.clearRect(0,0,w,h);x.fillStyle='#ffc94a';x.beginPath();x.arc(32,32,26,0,6.28);x.fill();x.fillStyle='#14161a';x.beginPath();x.ellipse(32,32,17,10,0,0,6.28);x.fill();x.fillStyle='#ffc94a';x.beginPath();x.arc(32,32,6,0,6.28);x.fill()});
  TX.cone=cvTex(256,256,(x,w,h)=>{const g=x.createRadialGradient(0,h/2,0,0,h/2,w);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(.75,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h)});
  return TX}
function M_(col,o){const a=A(),THREE=a.THREE;return new THREE.MeshStandardMaterial(Object.assign({color:a.lin(col),roughness:.7,metalness:0},o||{}))}
function mesh(geo,mat,x,y,z,parent,rx,ry,rz){const a=A(),m=new a.THREE.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);if(rx||ry||rz)m.rotation.set(rx||0,ry||0,rz||0);m.castShadow=true;m.receiveShadow=true;if(parent)parent.add(m);return m}

/* ---------------- props ---------------- */
function truck(){const a=A(),THREE=a.THREE,tx=tex(),L_=lay(),t=L_.truck;const g=new THREE.Group();
  const v=a.makeVehicle('workvan','#f2f2ef')||a.makeVanBox('#f2f2ef');g.add(v);v.rotation.y=Math.PI/2;
  /* "MOVIN' ON" decals both sides, the plate on the rear doors */
  const dm=new THREE.MeshStandardMaterial({map:tx.side,transparent:true,roughness:.5,polygonOffset:true,polygonOffsetFactor:-2});
  for(const s of[-1,1]){const p=mesh(new THREE.PlaneGeometry(3.6,.9),dm,s*1.19,1.28,.55,g,0,s*Math.PI/2,0);p.castShadow=false}
  const pl=mesh(new THREE.PlaneGeometry(.5,.25),new THREE.MeshStandardMaterial({map:tx.plate,roughness:.35,metalness:.2,polygonOffset:true,polygonOffsetFactor:-2}),0,L_.plate.y,2.725,g);pl.castShadow=false;
  mesh(new THREE.BoxGeometry(.56,.04,.03),M_('#1a1a1a'),0,L_.plate.y+.15,2.715,g);
  g.position.set(t.x,0,t.z);g.rotation.y=t.yaw;a.wmAdd(g);
  a.wmCol({x0:t.x-1.15,z0:t.z-2.7,x1:t.x+1.15,z1:t.z+2.7,h:2.4,s:'metal'});return g}
function crate(labelled,s){const a=A(),THREE=a.THREE,tx=tex(),g=new THREE.Group();s=s||1;
  const b=mesh(new THREE.BoxGeometry(.6*s,.46*s,.44*s),new THREE.MeshStandardMaterial({map:tx.crate,roughness:.85}),0,.23*s,0,g);
  mesh(new THREE.BoxGeometry(.61*s,.05*s,.1*s),M_('#d9c9a0',{roughness:.5}),0,.46*s,0,g);
  if(labelled){const l=mesh(new THREE.PlaneGeometry(.3*s,.22*s),new THREE.MeshStandardMaterial({map:tx.label,roughness:.6,polygonOffset:true,polygonOffsetFactor:-2}),.04*s,.25*s,.221*s,g);l.castShadow=false;
    const l2=l.clone();l2.position.z=-.221*s;l2.rotation.y=Math.PI;g.add(l2)}
  return g}
/* the Okafor twins' bike: pink, training wheels, a bell, streamers. Unmissable. */
function kidBike(){const a=A(),THREE=a.THREE,g=new THREE.Group(),pink=M_('#ff6fae',{roughness:.35,metalness:.3}),blk=M_('#1b1b1e',{roughness:.6}),chr=M_('#d9dde2',{roughness:.25,metalness:.85});
  for(const x of[-.36,.36]){mesh(new THREE.TorusGeometry(.2,.035,8,24),blk,x,.22,0,g);mesh(new THREE.CylinderGeometry(.02,.02,.06,8),chr,x,.22,0,g,Math.PI/2);
    for(let k=0;k<6;k++){const sp=mesh(new THREE.CylinderGeometry(.004,.004,.38,4),chr,x,.22,0,g);sp.rotation.z=k*Math.PI/6}}
  const bar=(x0,y0,x1,y1,m,r)=>{const dx=x1-x0,dy=y1-y0,l=Math.hypot(dx,dy),c=mesh(new THREE.CylinderGeometry(r||.022,r||.022,l,8),m||pink,(x0+x1)/2,(y0+y1)/2,0,g);c.rotation.z=Math.atan2(-dx,dy);return c};
  bar(-.36,.22,-.02,.24);bar(-.02,.24,.28,.52);bar(-.36,.22,-.08,.5);bar(-.08,.5,.28,.52);bar(.36,.22,.28,.6);bar(-.02,.24,-.1,.6);
  mesh(new THREE.BoxGeometry(.2,.05,.1),M_('#ffffff',{roughness:.5}),-.11,.62,0,g);
  bar(.28,.6,.22,.74,chr,.016);mesh(new THREE.CylinderGeometry(.016,.016,.44,8),chr,.22,.74,0,g,Math.PI/2);
  for(const z of[-.22,.22]){mesh(new THREE.CylinderGeometry(.024,.024,.08,8),M_('#ffffff'),.22,.74,z,g,Math.PI/2);
    for(let k=0;k<4;k++){const st=mesh(new THREE.PlaneGeometry(.02,.32),new THREE.MeshStandardMaterial({color:a.lin(['#ff4fa0','#ffd23f','#6fd0ff','#ffffff'][k]),side:THREE.DoubleSide,roughness:.5}),.24+k*.006,.6,z+(k-1.5)*.012,g);st.rotation.z=.25+k*.08;st.castShadow=false}}
  mesh(new THREE.SphereGeometry(.035,10,8),chr,.18,.78,.14,g);
  for(const z of[-.2,.2]){mesh(new THREE.TorusGeometry(.07,.02,6,14),blk,-.42,.07,z,g);bar(-.42,.07,-.36,.22,chr,.01)}
  return g}
function hedge(w,h,d,seed){const a=A(),THREE=a.THREE,g=new THREE.Group(),m=new THREE.MeshStandardMaterial({map:tex().leaf,roughness:.95,color:a.lin('#7fa86a')});let r=seed||1;const rnd=()=>{r=(r*16807)%2147483647;return r/2147483647};
  const n=Math.max(3,Math.round(w*d*2.4));for(let i=0;i<n;i++){const s=.35+rnd()*.3;const b=mesh(new THREE.IcosahedronGeometry(s,1),m,(rnd()-.5)*(w-s),h-s*.7-rnd()*.2,(rnd()-.5)*(d-s),g);b.scale.y=.85}
  mesh(new THREE.BoxGeometry(w*.92,h*.75,d*.85),m,0,h*.375,0,g);return g}
function picketFence(x0,x1,z,h){const a=A(),THREE=a.THREE,g=new THREE.Group(),m=new THREE.MeshStandardMaterial({map:tex().wood,roughness:.8,color:a.lin('#f3efe6')});
  for(let x=x0;x<=x1;x+=.16){const p=mesh(new THREE.BoxGeometry(.09,h,.025),m,x,h/2,z,g);mesh(new THREE.ConeGeometry(.064,.08,4),m,x,h+.03,z,g,0,Math.PI/4,0)}
  for(const y of[.25,h-.25])mesh(new THREE.BoxGeometry(x1-x0,.07,.04),m,(x0+x1)/2,y,z-.03,g);
  for(let x=x0;x<=x1+.01;x+=2.4)mesh(new THREE.BoxGeometry(.1,h+.08,.1),m,Math.min(x,x1),(h+.08)/2,z-.03,g);return g}
function bin(col,lab){const a=A(),THREE=a.THREE,g=new THREE.Group(),m=M_(col,{roughness:.55});mesh(new THREE.BoxGeometry(.6,.95,.7),m,0,.5,0,g);mesh(new THREE.BoxGeometry(.66,.07,.76),m,0,1.0,0,g);
  for(const z of[-.3,.3])mesh(new THREE.CylinderGeometry(.09,.09,.06,12),M_('#1b1b1e'),-.32,.09,z,g,0,0,Math.PI/2);return g}
function lawnChair(col){const a=A(),THREE=a.THREE,g=new THREE.Group(),al=M_('#c8ccd0',{metalness:.6,roughness:.35});
  for(const s of[-1,1]){mesh(new THREE.BoxGeometry(.03,.42,.03),al,s*.27,.21,.26,g);mesh(new THREE.BoxGeometry(.03,.42,.03),al,s*.27,.21,-.22,g);const bk=mesh(new THREE.BoxGeometry(.03,.62,.03),al,s*.27,.66,.3,g);bk.rotation.x=-.22;mesh(new THREE.BoxGeometry(.03,.03,.5),al,s*.27,.6,0,g)}
  for(let i=0;i<5;i++)mesh(new THREE.BoxGeometry(.54,.012,.07),M_(i%2?col:'#f4f1ea'),0,.42,-.22+i*.11,g);
  for(let i=0;i<5;i++){const w=mesh(new THREE.BoxGeometry(.54,.07,.012),M_(i%2?col:'#f4f1ea'),0,.5+i*.1,.33+i*.022,g);w.rotation.x=-.22}return g}
function foldTable(){const a=A(),THREE=a.THREE,g=new THREE.Group();mesh(new THREE.BoxGeometry(1.6,.04,.7),M_('#e9e6dd',{roughness:.5}),0,.74,0,g);
  for(const x of[-.7,.7])for(const z of[-.28,.28])mesh(new THREE.CylinderGeometry(.015,.015,.74,6),M_('#5b5f63',{metalness:.6,roughness:.4}),x,.37,z,g);
  const gv=new THREE.Group();g.add(gv);gv.position.set(.45,.78,.1);mesh(new THREE.CylinderGeometry(.035,.035,.13,10),M_('#6b3a1f',{roughness:.45}),0,.03,0,gv,0,0,Math.PI/2);mesh(new THREE.CylinderGeometry(.01,.012,.22,6),M_('#6b3a1f'),0,.03,.11,gv,Math.PI/2);
  mesh(new THREE.CylinderGeometry(.05,.05,.02,14),M_('#4a2a17'),.2,.01,-.05,g.children[0].parent);
  mesh(new THREE.BoxGeometry(.22,.01,.3),M_('#fbf6dc'),-.4,.765,0,g);mesh(new THREE.CylinderGeometry(.06,.05,.16,12),M_('#f4fbfb',{transparent:true,opacity:.35,roughness:.05}),-.05,.84,-.15,g);
  return g}
/* the evidence easel at the meeting: the actual photos pinned to a cork board (a canvas texture redrawn when the board changes) */
function easel(){const a=A(),THREE=a.THREE,g=new THREE.Group(),w=M_('#7a5230',{roughness:.6});
  for(const s of[-1,1]){const l=mesh(new THREE.BoxGeometry(.05,1.9,.05),w,s*.42,.92,0,g);l.rotation.z=s*.1}const b=mesh(new THREE.BoxGeometry(.05,1.75,.05),w,0,.86,-.38,g);b.rotation.x=-.22;
  mesh(new THREE.BoxGeometry(1.0,.05,.08),w,0,.78,.05,g);
  const c=document.createElement('canvas');c.width=640;c.height=448;const t=new THREE.CanvasTexture(c);if(THREE.sRGBEncoding)t.encoding=THREE.sRGBEncoding;
  const bd=mesh(new THREE.BoxGeometry(1.06,.74,.03),[M_('#6b4a2a'),M_('#6b4a2a'),M_('#6b4a2a'),M_('#6b4a2a'),new THREE.MeshStandardMaterial({map:t,roughness:.85}),M_('#6b4a2a')],0,1.18,.06,g);
  g.userData.canvas=c;g.userData.tex=t;return g}
function drawEasel(E,board){const c=E.userData.canvas,x=c.getContext('2d');x.fillStyle='#b88a58';x.fillRect(0,0,c.width,c.height);
  x.globalAlpha=.25;for(let i=0;i<1400;i++){x.fillStyle=Math.random()<.5?'#8a5e33':'#d7ad7c';x.fillRect(Math.random()*c.width,Math.random()*c.height,2,2)}x.globalAlpha=1;
  x.fillStyle='#fbf6dc';x.fillRect(150,10,340,40);x.fillStyle='#b8323a';x.font='900 26px Georgia,serif';x.textAlign='center';x.fillText('EXHIBITS A–F · 1418 WALNUT',320,40);
  ITEMS.forEach((it,i)=>{const col=i%3,row=i/3|0,X=24+col*204,Y=70+row*186,p=board[it.id];x.save();x.translate(X+96,Y+80);x.rotate((i%2?1:-1)*.03);
    x.fillStyle='#fbfaf4';x.fillRect(-94,-76,188,166);x.fillStyle='#23262b';x.fillRect(-86,-68,172,97);
    const done=()=>{x.fillStyle='#14161a';x.font='700 15px Arial';x.textAlign='center';x.fillText(it.short,0,50);x.fillStyle='#d9a400';x.font='22px Arial';x.fillText('★'.repeat(p?p.stars:0)+'☆'.repeat(3-(p?p.stars:0)),0,78);
      x.fillStyle='#c0281e';x.beginPath();x.arc(0,-72,7,0,6.28);x.fill();x.restore();E.userData.tex.needsUpdate=true};
    if(p&&p.jpg){const im=new Image();im.onload=()=>{x.save();x.translate(X+96,Y+80);x.rotate((i%2?1:-1)*.03);x.drawImage(im,-86,-68,172,97);x.restore();E.userData.tex.needsUpdate=true};im.src=p.jpg}
    done()});E.userData.tex.needsUpdate=true}
function eyePin(){const a=A(),THREE=a.THREE,s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex().eye,transparent:true,depthWrite:false,opacity:.9}));s.scale.set(.42,.42,.42);return s}
/* the lookout's sight line on the ground: a soft fan that warms up with suspicion */
function coneMesh(r,half){const a=A(),THREE=a.THREE,seg=18,pos=[0,0,0],uv=[0,.5],idx=[];for(let i=0;i<=seg;i++){const an=-half+2*half*i/seg;pos.push(-Math.sin(an)*r,0,-Math.cos(an)*r);uv.push(1,.5+.5*Math.sin(an)/Math.sin(half))}
  for(let i=1;i<=seg;i++)idx.push(0,i,i+1);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex().cone,transparent:true,opacity:.3,depthWrite:false,color:a.lin('#fff3c4')}));m.renderOrder=2;return m}
function phoneProp(){const a=A(),THREE=a.THREE,g=new THREE.Group();mesh(new THREE.BoxGeometry(.075,.15,.009),M_('#1a1c20',{roughness:.3,metalness:.4}),0,0,0,g);
  const sc=mesh(new THREE.PlaneGeometry(.066,.138),new THREE.MeshBasicMaterial({color:a.lin('#9fd2ff')}),0,0,.0052,g);sc.castShadow=false;return g}
function iced(){const a=A(),THREE=a.THREE,g=new THREE.Group();mesh(new THREE.CylinderGeometry(.04,.034,.13,12),M_('#f4fbfb',{transparent:true,opacity:.35,roughness:.05}),0,0,0,g);mesh(new THREE.CylinderGeometry(.036,.031,.09,12),M_('#8a4a1a',{emissive:a.lin('#2a1000'),roughness:.2}),0,-.015,0,g);return g}

/* ---------------- actors ---------------- */
/* four new models on demand (Barb, Phil, Gil, the kid); the crew and the buyer reuse the street-crew set that is already loaded */
const CAST={barb:'nb_gran',phil:'nb_pops',gil:'nb_sweater',lookout:'thug_brown',/* the lookout is an HT.Cast teen (boot-loaded base, so he is never a stand-in) (js/jobs/_runner.js): a different base from Chain Reaction's Dez */driver:'thug_hoodie',loaderA:'thug_track',loaderB:'thug_beanie',buyer:'thug_red'};
const LOOKS={barb:{shirt:'#5a6f8f',pants:'#3a3a48'},phil:{shirt:'#7a8a5a',pants:'#4a4a3a'},gil:{shirt:'#8a8a9a',pants:'#3a3a3a'},nb1:{shirt:'#c76a5a',pants:'#2a2a3a'},nb2:{shirt:'#8a5ab8',pants:'#3a3a48'},
  lookout:{shirt:'#3a4a6a',pants:'#2a2a2a',hood:1},driver:{shirt:'#4a3a2a',pants:'#2a2a2a'},loaderA:{shirt:'#2f5d4a',pants:'#3a3a3a'},loaderB:{shirt:'#5a3a3a',pants:'#2a2a2a'},buyer:{shirt:'#3a5a8a',pants:'#2a2a3a'}};
function PP(){return window.HT&&HT.People}
function preload(){const p=PP();if(!p||!p.ok||!p.preload)return Promise.resolve(false);const keys=Object.values(CAST).filter(k=>!p.has||!p.has(k));return keys.length?p.preload(keys).catch(()=>false):Promise.resolve(true)}
function castReady(){const p=PP();if(!p||!p.ok)return true;/* no rocketbox at all: the box people are the only people */return Object.values(CAST).every(k=>!p.has||p.has(k))}
const castMake=(p,id)=>id==='lookout'&&window.HT.Cast?HT.Cast.teen('hoa:lookout',{look:'slimHood'}):p.make(CAST[id],{});
function makeActor(id){const a=A(),p=PP();let d=null;try{if(p&&p.ok&&(!p.has||p.has(CAST[id])))d=castMake(p,id)}catch(e){d=null}
  if(!d)d=a.makeDude(Object.assign({role:CAST[id]},LOOKS[id]));
  if(id==='lookout'&&d.root&&!d.rb)d.root.scale.setScalar(.9);a.wmAdd(d.root);
  const o={id,d,x:0,z:0,yaw:0,face:null,path:null,speed:1.3,wait:0,moving:false,look:null,sus:0,tag:null,box:!d.rb};return o}
/* a stand-in box character becomes the real one as soon as its model has streamed in (props in hand move across) */
function upgrade(o){const a=A(),p=PP();if(!o.box||!p||!p.ok||(p.has&&!p.has(CAST[o.id])))return;let d=null;try{d=castMake(p,o.id)}catch(e){d=null}if(!d)return;
  const old=o.d;const held=old.gunHold?[...old.gunHold.children]:[];d.root.visible=old.root.visible;if(old.root.parent)old.root.parent.remove(old.root);a.wmAdd(d.root);if(d.gunHold)for(const h of held)d.gunHold.add(h);o.d=d;o.box=false}
function put(o,x,z,yaw){o.x=x;o.z=z;if(yaw!=null)o.yaw=yaw;o.d.root.position.set(x,0,z);o.d.root.rotation.y=o.yaw+Math.PI}
const yawTo=(o,p)=>Math.atan2(-(p.x-o.x),-(p.z-o.z));
function walkTo(o,pts,speed,then){o.path=(Array.isArray(pts)?pts:[pts]).map(p=>({x:p.x,z:p.z}));o.speed=speed||T.walk;o.then=then||null}
function actorUpd(o,dt){const p=PP();if(o.path&&o.path.length){const q=o.path[0],dx=q.x-o.x,dz=q.z-o.z,d=Math.hypot(dx,dz);
    if(d<.08){o.path.shift();if(!o.path.length){o.path=null;o.moving=false;const t=o.then;o.then=null;if(t)t()}}
    else{const s=Math.min(d,o.speed*dt);o.x+=dx/d*s;o.z+=dz/d*s;o.moving=true;const want=Math.atan2(-dx,-dz);o.yaw=turnTo(o.yaw,want,dt*7)}}
  else{o.moving=false;const f=o.look!=null?o.look:o.face;if(f!=null)o.yaw=turnTo(o.yaw,f,dt*4)}
  o.d.root.position.set(o.x,0,o.z);o.d.root.rotation.y=o.yaw+Math.PI;
  if(p&&o.d.rb)try{p.pose(o.d,dt,{moving:o.moving,speed:o.speed>1.6?1.5:1,aim:false,mode:o.mode||'stand'})}catch(e){}}
function turnTo(a0,b,k){let d=b-a0;while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;let r=a0+d*Math.min(1,k);while(r>Math.PI)r-=6.2832;while(r<-Math.PI)r+=6.2832;return r}

/* ---------------- lines ---------------- */
const pick=a=>a[Math.floor(Math.random()*a.length)];
const LN={
  brief:[['barb',"Article Nine, Section C. Visible evidence. Dated. In focus. I will not be laughed out of my own meeting."],
    ['barb',"Six violations. Two stars on at least five, or the board won't touch it. Three stars and they'll frame them."],
    ['barb',"They load at seven. Every night. Before Jeopardy. You have until that truck leaves."],
    ['barb',"Phil across the street will let you sit on his porch. My sister's Buick is on Walnut, unlocked, it's always unlocked. And my backyard is your backyard. Mind the hydrangeas."],
    ['barb',"A blurry photo is a rumour. A sharp photo is a bylaw."]],
  retry:[['barb',"They're back. Of course they're back. Take two. Same bylaws."]],
  look:["...Hm.","Somebody there?","Yo. You see that?","Who's that?"],
  inv:["Yo. Who's back there?","Hold up. Something moved.","Is somebody in the bushes?"],
  invCar:["Hold up. I'm checking that Buick.","Who parks a Buick on Walnut?"],calmCar:["...It's a Buick. Nobody's in a Buick on purpose.","Just a Buick. Smells like butterscotch from here."],
  calm:["Somebody in the hedge? Nah. Hedges don't wear cargo shorts.","...Squirrel. Big squirrel.","Nah. It's nothing. It's Walnut Drive. Nothing happens on Walnut Drive."],
  film:["Is that guy filming us?","Why is that dad pointing his phone at us?","Bro. Is he taking a picture?"],
  car:["Is that guy just... sitting in a Buick?","Somebody's in that car.","Why is there a dad in that Buick?"],
  lawn:["Yo, that's our lawn, man.","Can I help you? That's private property.","Sir. Sir. That's the lawn."],
  driver:["No, the TV's for Kevin. The OTHER Kevin.","We're on Walnut. It's a cul-de-sac. ...No it's not. It's a street.","Ma, I'm at work. ...Moving. I'm a mover.","Tell him seven-fifteen. We gotta be gone before the sprinklers.","Yeah, the kayak's still here. Nobody wants the kayak."],
  loaders:[["loaderA","Who steals a leaf blower?"],["loaderB","It's a really good leaf blower."],["loaderA","Pulls left, though."]],
  phil:["Phil. Hi. Bird.","...Sure. Want an iced tea?"],
  philFilm:"He's photographing the warblers. Big warbler year.",
  car0:"Barb's sister's Buick. It smells like butterscotch and regret.",
  fence0:"Barb's backyard. Don't step on the hydrangeas. Do not step on the hydrangeas.",
  bins0:"Right next to them. Behind the recycling. This is the most dangerous thing I've ever done near a recycling bin.",
  bush0:"The bushes. Classic. Timeless.",
  spook:[['Lookout',"We're blown! It's the HOA! Pack it up!"],['Driver',"Last box! Last box! Leave the lamp!"]],
  good3:["(whispering) Nice.","(whispering) Barb's going to frame that.","(whispering) That's a bylaw."],
  twist:[['barb',"He's sixteen. From Riverside. ...Does he mow? Gil's lawn has been a crime scene since April."],['Gil',"Hey."],
    ['barb',"Summer job. Eight dollars a lawn and all the lemonade he can drink. I'll draft it tonight."]],
  meeting0:[['barb',"This emergency meeting of the Maple Heights Homeowners Association is now in session. Phil, put down the iced tea."],['Phil',"It's a hot day, Barb."],['barb',"Quorum is three. Me, Phil and Gil. Linda's chair is here in spirit. Linda is at the mailbox, yelling at the mailman."]],
  motion:[['barb',"Motion to ask them to leave. Motion carries. Unanimously. Even Gil."]],
  next:[['barb',"They left at six a.m. They even raked. I'm listing it Monday. Pinnacle Homes can eat my dust."]]};

/* ---------------- the job ---------------- */
J.register('hoa',{
  def:{giver:'barb',giverName:'Barb',giverLook:{role:'nb_gran',shirt:'#5a6f8f',pants:'#3a3a48'},hood:'maple',title:'Exhibit HOA',role:'Barb · HOA President (and realtor)',place:'1418 Walnut Dr',
    lines:["1418 Walnut has been 'for sale' for thirty-one days. A moving truck shows up every evening at seven. It has never sold. Pinnacle Homes has the listing, so I'm not surprised, but I am concerned.",
      "It's a fence. Stolen things go in, stolen things go out. The HOA can act, but the bylaws need photographic evidence. Six violations. Dated. In focus.",
      "Take this checklist and your phone. Don't let them see you. Phil, my sister's Buick and my backyard are at your disposal."],
    obj:"Photograph the six HOA violations at 1418 Walnut Dr (2 stars on at least five) without the crew noticing you.",
    crew:[],weapons:['pistol'],from:{x:121.6,z:66.7},get start(){const L_=lay();return{x:L_.ring.x,z:L_.ring.z}},site:null,
    unlock:{done:['gary']},pay:500,par:0,winTrust:6,order:20,noGuns:"It's an HOA matter. Bylaws, not bullets.",
    stages:['stakeout','meeting'],stageLabels:{stakeout:'The stakeout',meeting:'The emergency meeting'},failPolicy:'soft',
    medals:['Five violations at 2 stars','All six at 2 stars or better','All six at 3 stars'],
    radio:[['barb',"Over here, dear. The house with the good hydrangeas."]],
    endLine:"Barb: Motion carried. The truck left at six a.m. 1418 Walnut is listed Monday, with an actual realtor."},
  start(M,o){const a=A(),L_=lay();M.ph='load';M.st=0;M.sus=0;M.susMax=0;M.board={};M.shots=0;M.flashes=0;M.seen=null;M.say=[];M.sayT=0;M.vant={};M.flags={};M.bot={};M.ex=T.ex.map(()=>({st:'wait'}));
    M.item='phone';M.noGuns=M.def.noGuns;M.phoneProp=null;M.lastLine={};M.floorT=0;M.unseen=9;M.loiter=0;M.seat=false;M.porch=false;M.fx=[];M.retry=!!(o&&o.checkpoint);
    a.wmSetWindow(a.wmWindow(113,58,34));
    try{a.equip(a.P.dude,null)}catch(e){}
    buildSet(M);
    M.loadT0=performance.now();preload().then(()=>{M.loaded=true});
    if(!PH())M.waitPhoto=true},
  upd(dt,M,F){const a=A(),L_=lay(),P=a.P;
    if(M.ph==='load'){F.objs.push(['Barb is waiting on her front walk',false]);if(!M.updNote&&performance.now()-M.loadT0>1500&&PH()){M.updNote=true;HT.Photo.notify('Maddie','updating your camera app. dont touch anything. dad. DAD.',{color:'linear-gradient(#ff8ad8,#d24fa8)',dur:6000})}
    if((castReady()&&PH())||performance.now()-M.loadT0>30000){spawnCast(M);M.ph=M.retry||M.resumeStake?'stake0':'intro';if(M.ph==='intro')intro(M)}return}
    phoneHold(M);sayTick(M,dt);actors(M,dt);fxTick(M,dt);
    if(M.ph==='intro'){F.target={x:L_.barb.x,z:L_.barb.z,label:'Barb'};F.objs.push(['Talk to Barb',false]);
      if(Math.hypot(P.pos.x-L_.barb.x,P.pos.z-L_.barb.z)<6)F.taps.push({x:L_.barb.x,z:L_.barb.z,r:6,txt:'Take the checklist from Barb',fn:()=>takeChecklist(M)});return}
    if(M.ph==='stake0'){beginStake(M);return}
    if(M.ph==='stake'){stake(dt,M,F);return}
    if(M.ph==='gone'){F.objs.push(['The truck is leaving',false]);return}
    if(M.ph==='meet'||M.ph==='meeting'){meeting(dt,M,F);return}
    if(M.ph==='free'){F.objs.push(['Back to your ride',false]);F.target={x:M.car.pos.x,z:M.car.pos.z,label:'Your ride'}}},
  save(M){const b={};for(const k in M.board){const p=M.board[k];b[k]={stars:p.stars,id:p.id}}return{ph:M.ph==='meet'||M.ph==='meeting'||M.ph==='free'?'meeting':'stake',board:b,susMax:+(M.susMax||0).toFixed(3),flashes:M.flashes|0,shots:M.shots|0}},
  load(M,s){M.resumeStake=s.ph==='stake';M.retry=true;M.susMax=s.susMax||0;M.flashes=s.flashes|0;M.shots=s.shots|0;
    if(s.ph==='meeting'){M.resumeMeet=true;for(const k in s.board||{}){const g=(PH()&&HT.Photo.gallery.find(p=>p.id===s.board[k].id))||null;M.board[k]={stars:s.board[k].stars,id:s.board[k].id,jpg:g?g.jpg:null}}}},
  payout(M,ok){if(!ok)return[];const n3=ITEMS.filter(it=>M.board[it.id]&&M.board[it.id].stars>=3).length,out=[];
    out.push(["The HOA's discretionary fund",0]);if(n3)out.push(['3-star photos ×'+n3,T.pay3*n3]);
    if((M.susMax||0)<=T.calm)out.push(['Not a single complaint about you',T.calmPay]);
    if(M.flags.summer)out.push(['The lookout has a summer job now',0]);
    album(M);return out},
  medal(M){const b=M.board,n2=ITEMS.filter(it=>b[it.id]&&b[it.id].stars>=2).length,n3=ITEMS.filter(it=>b[it.id]&&b[it.id].stars>=3).length;return n3>=6?3:n2>=6?2:1},
  end(M,ok){if(!ok)return;const a=A(),s=a.SV&&a.SV();if(!s)return;s.flags=s.flags||{};s.flags.hoaWalnut=true;if(M.flags.summer)s.flags.lookoutMows=true},
  camera(dt){const M=A().M;if(!M)return;if(M.mt&&M.mt.st==='talk')return meetCam(dt,M);if(!M.seat)return;return seatCam(dt)},
  hud(st){const a=A(),M=a.M;if(!M||M.state!=='go')return;if(M.mt&&M.mt.st==='talk')st.crosshair=Object.assign({},st.crosshair,{hidden:true});hudExtras(M,st)},
  test:{give(a){const H=window.__ht;if(!H)return;const i=H.jobs.index('gary');if(i>=0)H.prog.done[i]=true;const s=a.SV();if(s&&window.HT.Save.jobRec)window.HT.Save.jobRec(s,'gary').done=true;if(H.mode==='hub'&&!H.M){H.enterHub();H.step(2)}},
    step:(a,t,o)=>bot(a,t,o||{}),
    sample:()=>({ph:'stake',board:{},susMax:0,flashes:0,shots:0,item:'phone'})}
});

/* ---------------- the set: truck, crates, bike, hedges, fence, bins, the Buick, Phil's chair, the meeting ---------------- */
function buildSet(M){const a=A(),L_=lay(),THREE=a.THREE;M.occ=[];
  M.truck=truck(M);M.occ.push(M.truck);
  /* crates just inside the garage door: a pallet, three crates, the Maple porch one on top facing the street */
  const cs=new THREE.Group();mesh(new THREE.BoxGeometry(1.0,.12,.8),M_('#9a7a52',{roughness:.9}),0,.06,0,cs);
  const c1=crate(false);c1.position.set(-.18,.12,.05);cs.add(c1);const c2=crate(false,.9);c2.position.set(.25,.12,-.1);c2.rotation.y=.2;cs.add(c2);
  const c3=crate(true);c3.position.set(0,.58,0);c3.rotation.y=-Math.PI/2;cs.add(c3);cs.position.set(L_.crates.x,0,L_.crates.z);a.wmAdd(cs);M.occ.push(cs);
  a.wmCol({x0:L_.crates.x-.5,z0:L_.crates.z-.4,x1:L_.crates.x+.5,z1:L_.crates.z+.4,h:1.1,s:'wood'});
  const bk=kidBike();bk.position.set(L_.bike.x,0,L_.bike.z);bk.rotation.y=-.12;a.wmAdd(bk);
  /* the bushes across the street, the bins by the garage, Barb's back fence */
  const hb=hedge(1.5,.92,1.0,7);hb.position.set(L_.bushes.x,0,L_.bushes.z);a.wmAdd(hb);M.occ.push(hb);a.wmCol({x0:L_.bushes.x-.7,z0:L_.bushes.z-.45,x1:L_.bushes.x+.7,z1:L_.bushes.z+.45,h:.95,s:'leaf'});
  const b1=bin('#2f5d9e');b1.position.set(L_.bins.x,0,L_.bins.z+.45);a.wmAdd(b1);const b2=bin('#3d6a35');b2.position.set(L_.bins.x,0,L_.bins.z-.3);a.wmAdd(b2);M.occ.push(b1,b2);
  a.wmCol({x0:L_.bins.x-.32,z0:L_.bins.z-.68,x1:L_.bins.x+.32,z1:L_.bins.z+.82,h:1.0,s:'plastic'});
  const hg=hedge(2.6,1.0,.8,3);hg.position.set(116.0,0,48.5);a.wmAdd(hg);M.occ.push(hg);a.wmCol({x0:114.7,z0:48.1,x1:117.3,z1:48.9,h:1,s:'leaf'});
  const f=L_.fence,fe=picketFence(f.x0,f.x1,f.z,1.22);a.wmAdd(fe);M.occ.push(fe);a.wmCol({x0:f.x0,z0:f.z-.08,x1:f.x1,z1:f.z+.05,h:1.22,s:'wood'});
  const hy=hedge(1.4,.7,.6,11);hy.position.set(121.8,0,57.7);a.wmAdd(hy);/* the hydrangeas. Do not step on them. */
  for(let i=0;i<9;i++){const fl=mesh(new THREE.SphereGeometry(.09,8,6),M_(i%2?'#9aa8ff':'#c7a3ff',{roughness:.8}),121.2+i*.15,.62+((i*7)%3)*.05,57.55+((i*5)%3)*.12,null);a.wmAdd(fl)}
  /* Barb's sister's Buick */
  const cv=a.makeVehicle('sedan','#d8ccb0')||a.makeVanBox('#d8ccb0');cv.position.set(L_.car.x,0,L_.car.z);cv.rotation.y=L_.car.yaw+Math.PI/2;a.wmAdd(cv);M.buick=cv;M.occ.push(cv);
  a.wmCol({x0:L_.car.x-.95,z0:L_.car.z-2.35,x1:L_.car.x+.95,z1:L_.car.z+2.35,h:1.45,s:'metal'});
  /* Phil's porch chair and his iced tea */
  const ch=lawnChair('#2f7d55');ch.position.set(L_.phil.x,0,L_.phil.z);ch.rotation.y=0;a.wmAdd(ch);M.philChair=ch;
  /* vantage pins: a small eye over each spot (the stakeout only) */
  M.pins=[];for(const[k,p,lab,tag]of[['bushes',L_.bushHide,'The bushes','close'],['porch',L_.porch,"Phil's porch",'safe'],['car',L_.carDoor,"Barb's sister's Buick",'safe · 2★ max'],['fence',L_.fenceSpot,"Barb's back fence",'close'],['bins',L_.binHide,'The bins','risky']]){
    const s=eyePin();s.position.set(p.x,2.25,p.z);s.visible=false;a.wmAdd(s);M.pins.push({k,p,lab,tag,s})}
  /* the meeting on Barb's front lawn (props now, people when it starts) */
  const tb=foldTable();tb.position.set(L_.meet.x,0,L_.meet.z);a.wmAdd(tb);M.mtable=tb;
  M.chairs=[[-1.95,1.85],[-.65,1.95],[.65,1.95],[1.95,1.85]].map(([dx,dz],i)=>{const c=lawnChair(['#c23a2b','#2f5d9e','#e3b23c','#2f7d55'][i]);c.position.set(L_.meet.x+dx,0,L_.meet.z+dz);c.rotation.y=-dx*.12;a.wmAdd(c);return c});
  const E=easel();E.position.set(L_.meet.x-1.75,0,L_.meet.z-.15);E.rotation.y=.35;a.wmAdd(E);M.easel=E;drawEasel(E,{});
  /* sight-line fans */
  M.cones={};for(const k of['lookout','driver']){const r=k==='lookout'?SUS_R.lookout*.62:SUS_R.driver*.7,c=coneMesh(r,SUS_HALF[k]*Math.PI/180);c.visible=false;a.wmAdd(c);M.cones[k]=c}}
function spawnCast(M){const a=A(),L_=lay();M.A={};
  for(const id of Object.keys(CAST))M.A[id]=makeActor(id);
  const C=M.A;put(C.barb,L_.barb.x,L_.barb.z,Math.PI*.15);C.barb.face=Math.PI*.15;
  put(C.phil,L_.phil.x+.55,L_.phil.z-.35,0);C.phil.face=-.5;
  C.gil.d.root.visible=false;
  put(C.lookout,L_.lk.door.x,L_.lk.door.z,Math.PI/2);put(C.driver,L_.cab.x,L_.cab.z,Math.PI);C.driver.face=Math.PI*.9;
  put(C.loaderA,L_.inA.x,L_.inA.z,Math.PI/2);put(C.loaderB,L_.inB.x,L_.inB.z,Math.PI/2);put(C.buyer,L_.buyerFrom.x,L_.buyerFrom.z,0);C.buyer.d.root.visible=false;
  /* held props: Barb's clipboard, the driver's phone, Phil's iced tea */
  try{const cb=new (a.THREE.Group)();mesh(new a.THREE.BoxGeometry(.23,.31,.01),M_('#8a5a2e'),0,0,0,cb);mesh(new a.THREE.PlaneGeometry(.2,.26),M_('#fbf6dc'),0,-.012,.006,cb);cb.rotation.set(-1.1,.2,0);cb.position.set(.02,-.05,.12);if(C.barb.d.gunHold)C.barb.d.gunHold.add(cb);
    if(C.driver.d.gunHold){const ph=phoneProp();ph.rotation.set(-1.2,0,0);C.driver.d.gunHold.add(ph)}if(C.phil.d.gunHold){const ic=iced();ic.position.set(0,0,.05);C.phil.d.gunHold.add(ic)}}catch(e){}
  for(const k of['lookout','driver','loaderA','loaderB','buyer'])C[k].obs=k.startsWith('loader')?'loader':k;
  /* crates the loaders carry */
  for(const k of['loaderA','loaderB']){const c=crate(true,.85);c.visible=false;a.wmAdd(c);C[k].crate=c}
  C.envelope=mesh(new a.THREE.BoxGeometry(.2,.02,.11),M_('#e9dcb9',{roughness:.6}),0,0,0,null);C.envelope.visible=false;a.wmAdd(C.envelope)}

/* ---------------- the intro: Barb's brief ---------------- */
function intro(M){const a=A();for(const l of LN.brief)say(M,l[0],l[1]);
  M.textAt=a.simT+5;M.flags.texted=false}
function takeChecklist(M){const a=A();if(M.ph!=='intro')return;M.ph='stake0';say(M,'you',"Six violations. Two stars. Mind the hydrangeas. Got it.");
  const Ph=PH();if(Ph)Ph.notify('Maddie',"dad the camera app has zoom. pinch. no the other pinch.",{color:'linear-gradient(#ff8ad8,#d24fa8)'})}
function beginStake(M){const a=A(),L_=lay();M.ph='stake';M.st=0;M.tc=0;M.clockOn=false;M.guide=M.retry?'done':'go';M.view={};M.tutT=0;M.sus=0;M.unseen=9;
  if(M.retry){for(const l of LN.retry)say(M,l[0],l[1]);M.board={}}
  if(M.retry&&!M.resumeStake){}
  M.board={};
  const Ph=PH();if(Ph){Ph.begin({job:'hoa',label:'Exhibit HOA',subjects:()=>subjects(M),done:it=>M.board[it]?M.board[it].stars:0,occluders:()=>occluders(M),onShot:s=>onShot(M,s),stamp:()=>clockTxt(M,true),eye:()=>M.seat?L_.seat:null,flash:true,cap:()=>M.seat?{n:2,why:'Through the windshield'}:null,canShoot:()=>{const bx=M.A&&Object.values(M.A).some(o=>o&&o.box&&o.d&&o.d.root.visible);if(bx){a.feed('Camera app still updating…','info');return false}return true},status:()=>({v:M.sus,text:'SUSPICION '+Math.round(M.sus*100)+'%'}),
    onRaise:on=>{if(on&&!M.flags.raised){M.flags.raised=true}}})}
  for(const p of M.pins)p.s.visible=true;
  const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.music('tension');Au.setIntensity(.15);Au.ambience&&Au.ambience('suburb')}catch(e){}
  a.feed('Right-click: phone up (it stays up) · Left-click: shutter','info');
  if(M.resumeMeet){M.resumeMeet=false;M.ph='meet';startMeeting(M,true)}}

/* ---------------- the stakeout ---------------- */
function clockTxt(M,stamp){const m=T.clock0+Math.min(T.clockSpan,(M.tc||0)/T.stake*T.clockSpan),h=Math.floor(m/60),mm=Math.floor(m%60),ss=Math.floor((m*60)%60);
  const hh=((h+11)%12)+1;return stamp?'JUL 14  '+hh+':'+String(mm).padStart(2,'0')+' PM':hh+':'+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0')+' PM'}
function stake(dt,M,F){const a=A(),L_=lay(),P=a.P,Ph=PH();M.st+=dt;
  schedule(M,dt);vantages(M,F);detect(M,dt);guide(M,F,dt);if(M.clockOn)M.tc+=dt;
  const n2=ITEMS.filter(it=>M.board[it.id]&&M.board[it.id].stars>=T.need).length,n3=ITEMS.filter(it=>M.board[it.id]&&M.board[it.id].stars>=3).length;
  F.objs.push(['Photograph the violations · '+n2+'/6 at ★★ (need '+T.needN+')',n2>=T.needN]);
  for(const it of ITEMS){const p=M.board[it.id],st=p?p.stars:0,v=M.view&&M.view[it.id];F.objs.push([it.sec+'  '+(st?'★'.repeat(st)+'☆'.repeat(3-st):'—')+(st>=3?'':v==='in'?'  · in view from here':v==='far'?'  · in view, too far':''),st>=T.need])}
  if(M.sus>.35)F.objs.push([M.sus>.6?'They know something is up. Get out of sight.':'Somebody is looking your way',false,'warn']);
  const left=Math.max(0,T.stake-M.tc);
  F.widgets.push({id:'clock',kind:'timer',label:M.clockOn?clockTxt(M):'Get in position',v:left,max:T.stake,hot:left<40});
  F.meters.push({id:'sus',label:'Suspicion',v:M.sus,max:1,style:'ring',icon:'eye',sub:Math.round(M.sus*100)+'%'});
  F.meters.push({id:'board',label:'Evidence',v:n2,max:6,style:'pips',icon:'cam',warn:0});
  if(n2>=T.needN&&!M.flags.ready){M.flags.ready=true;say(M,'you',n2>=6?"That's all six. Barb's going to cry.":"That's enough for the board. I could stay for better shots... or text Barb.");
    const Ph=PH();if(Ph)Ph.notify('Barb',n2>=6?"I can see the photos from here. Come to the meeting. Bring the phone.":"Five! That's quorum. Come over when you're done. Three stars or I'll know.",{color:'linear-gradient(#7aa0d8,#3d5f9e)'})}
  if(n2>=T.needN&&!M.seat&&!(PH()&&HT.Photo.isRaised()))F.taps.push({d:0,r:1,txt:n3>=6?'Text Barb: "Got them all."':'Text Barb: "Got them." (ends the stakeout)',fn:()=>endStake(M,'done')});
  if(n3>=6&&!M.flags.all3){M.flags.all3=true;setTimeout(()=>{if(M.state==='go'&&M.ph==='stake')endStake(M,'done')},2500)}
  if(left<=60&&!M.flags.warn60){M.flags.warn60=true;const Ph=PH();if(Ph)Ph.notify('Barb',"They're closing up soon. Jeopardy is at seven-thirty.",{color:'linear-gradient(#7aa0d8,#3d5f9e)'})}
  if(left<=15&&!M.flags.warn15){M.flags.warn15=true;sayActor(M,'driver',"Last load! Let's roll!")}
  if(left<=0)endStake(M,'clock');
  const Au=window.HT&&HT.Audio;if(Au&&Au.ready&&Au.setIntensity)try{Au.setIntensity(.15+M.sus*.85)}catch(e){}}
/* the first minute: where to go, how the phone works, and what can be seen from here */
const TUT_DESK="right-click = phone up (it stays up). left-click or space = take the pic. wheel or 1-2-3 = zoom. F = flash OFF. right-click again to put it away";
const TUT_TOUCH="tap the aim button = phone up (it stays up). fire button = take the pic. 1x 2x 4x at the bottom = zoom. flash button = OFF pls";
function guide(M,F,dt){const a=A(),L_=lay(),P=a.P,Ph=PH(),raised=Ph&&Ph.isRaised();
  const atV=M.pins.find(p=>Math.hypot(P.pos.x-p.p.x,P.pos.z-p.p.z)<2.6)||(M.seat?{k:'car'}:null);
  if(!M.clockOn&&(raised||atV||M.st>35||M.shots)){M.clockOn=true;a.feed("7:00 PM · they're loading · the clock is running",'info')}
  if(M.guide==='go'){F.objs.push(["Walk to Phil's porch across the street · then right-click to raise your phone",false]);F.target={x:L_.porch.x,z:L_.porch.z,label:"Phil's porch · start here"};
    if((atV&&atV.k==='porch')||raised)M.guide='raise'}
  if(M.guide!=='go'&&!M.porch&&Math.hypot(P.pos.x-L_.porch.x,P.pos.z-L_.porch.z)<2.8)F.objs.push(['Press E to say hi to Phil, so he lets you stay on his porch',false]);
  if(M.guide==='done'&&M.shots&&M.firstT==null)M.firstT=M.st;if(M.firstT!=null&&M.st-M.firstT<30)F.objs.push(['Each spot sees different things: the list says what is in view from where you stand. Try the Buick on Walnut next',false]);
  if(M.guide==='raise'){if(!M.shots)F.objs.push([raised?'Left-click (or Space) to take the photo · wheel to zoom':'Right-click to raise your phone · it stays up',false]);
    if(M.shots>0)M.guide='done';else{M.tutT-=dt;if(M.tutT<=0&&Ph){M.tutT=16;const touch=document.querySelector('.ht-root.touch');Ph.notify('Maddie',touch?TUT_TOUCH:TUT_DESK,{color:'linear-gradient(#ff8ad8,#d24fa8)',dur:9000})}}}
  /* which violations can be seen from where you stand (2 Hz): line of sight from your eye, and near enough for 2 stars at 4x */
  M.viewT=(M.viewT||0)-dt;if(M.viewT<=0&&Ph&&Ph.los){M.viewT=.5;const e=M.seat?L_.seat:{x:P.pos.x,y:P.crouch?1.25:1.6,z:P.pos.z},v={};
    for(const sj of subjects(M)){const it=sj.item,p=sj.pts[0],d=Math.hypot(p.x-e.x,p.z-e.z),ok=Ph.los(e,p)&&Ph.los(e,sj.pts[1]);if(!ok||v[it]==='in')continue;v[it]=d<=sj.h/(.22*2*Math.tan(6*Math.PI/180)*.56*1.12)?'in':'far'}M.view=v}}
/* the crew's evening: the lookout's loop, the loaders, the driver on the phone, the buyer's three visits */
function schedule(M,dt){const a=A(),L_=lay(),C=M.A,t=M.st;
  /* lookout: door -> north corner (pause facing west) -> south end (pause facing south) -> back to the door (pause, chat) */
  const lk=C.lookout;if(!lk.inv&&!lk.lookT){const leg=lk.leg|0;if(!lk.path&&lk.wait<=0){
      const steps=[()=>walkTo(lk,[L_.lk.side,L_.lk.n],T.walk,()=>{lk.wait=T.loop[1];lk.face=Math.PI/2}),null,
        ()=>walkTo(lk,[L_.lk.side,L_.lk.s],T.walk,()=>{lk.wait=T.loop[3];lk.face=Math.PI*.82}),null,
        ()=>walkTo(lk,[L_.lk.side,L_.lk.door],T.walk,()=>{lk.wait=T.loop[5];lk.face=-Math.PI/2}),null];
      const f=steps[leg%6];lk.leg=(leg+1)%6;if(f)f()}else if(!lk.path)lk.wait-=dt}
  /* loaders: crate from inside the garage to the back of the truck, ~20 s round trip, offset by 10 s */
  for(const[k,off,home]of[['loaderA',0,L_.inA],['loaderB',10,L_.inB]]){const o=C[k];if(o.spooked)continue;if(t<off&&!o.started){o.face=Math.PI/2;continue}o.started=true;
    if(!o.path&&o.wait<=0){const st=o.st||'in';
      if(st==='in'){o.st='out';o.crate.visible=true;walkTo(o,[L_.apron,{x:L_.rear.x+(k==='loaderA'?-.25:.25),z:L_.rear.z}],T.carry,()=>{o.wait=2.4;o.face=0})}
      else if(st==='out'){o.st='back';o.crate.visible=false;walkTo(o,[L_.apron,home],T.walk,()=>{o.wait=3.6+Math.random()*1.5;o.face=Math.PI/2;o.st='in'})}}
    else if(!o.path)o.wait-=dt;
    if(o.crate.visible){const fx=-Math.sin(o.yaw),fz=-Math.cos(o.yaw);o.crate.position.set(o.x+fx*.38,.82,o.z+fz*.38);o.crate.rotation.y=o.yaw}}
  /* the buyer: three visits to the back of the truck. The driver walks round to meet him. The envelope is the money shot. */
  const dr=C.driver,by=C.buyer;
  M.ex.forEach((e,i)=>{const t0=T.ex[i];if(e.st==='wait'&&t>=t0-T.exWalk){e.st='in';by.d.root.visible=true;put(by,L_.buyerFrom.x,L_.buyerFrom.z,0);walkTo(by,[L_.buyerVia,L_.exB],1.3,()=>{by.face=0;e.by=true});
      walkTo(dr,[{x:L_.cab.x,z:L_.cab.z+4.6},L_.exD],1.15,()=>{dr.face=Math.PI;e.dr=true})}
    if(e.st==='in'&&e.by&&e.dr){e.st='hand';e.t=0;const pp=PP();if(pp&&pp.interact)try{pp.interact(dr.d);pp.interact(by.d)}catch(_){}if(i===0||Math.random()<.5)sayActor(M,'driver',pick(["Same as last time.","It's all there. Count it in the car.","Pleasure doing business. Don't tell the HOA."]))}
    if(e.st==='hand'){e.t+=dt;const hx=(L_.exD.x+L_.exB.x)/2,hz=(L_.exD.z+L_.exB.z)/2;C.envelope.visible=true;C.envelope.position.set(hx+Math.sin(e.t*3)*.03,1.02,hz);C.envelope.rotation.y=Math.sin(e.t)*.3;
      if(e.t>=T.exHold){e.st='out';C.envelope.visible=false;walkTo(by,[L_.buyerVia,L_.buyerFrom],1.35,()=>{by.d.root.visible=false;e.st='done'});walkTo(dr,[{x:L_.cab.x,z:L_.cab.z+4.6},L_.cab],1.15,()=>{dr.face=Math.PI*.9})}}});
  /* chatter: the driver on the phone, the loaders about Mrs. Patel's leaf blower (when you're close enough to hear) */
  const P=a.P,dd=Math.hypot(P.pos.x-dr.x,P.pos.z-dr.z);M.chatT=(M.chatT||6)-dt;
  if(M.chatT<=0&&dd<16&&!M.ex.some(e=>e.st==='hand')){M.chatT=13+Math.random()*6;sayActor(M,'driver',pick(LN.driver))}
  const dl=Math.hypot(P.pos.x-C.loaderA.x,P.pos.z-C.loaderA.z);if(!M.flags.blower&&dl<14&&t>40){M.flags.blower=true;for(const l of LN.loaders)say(M,l[0]==='loaderA'?'Loader':'Other loader',l[1])}}
/* subjects for the camera (only the ones that exist right now) */
function subjects(M){const a=A(),L_=lay(),C=M.A,out=[];if(!C)return out;
  out.push({id:'bike',item:'bike',label:'Stolen bike',pos:{x:L_.bike.x,y:0,z:L_.bike.z},h:1.0,mid:.42,aspect:1.4,pts:[{x:L_.bike.x,y:.62,z:L_.bike.z},{x:L_.bike.x+.2,y:.75,z:L_.bike.z},{x:L_.bike.x-.3,y:.25,z:L_.bike.z}]});
  out.push({id:'crate0',item:'crate',label:'Maple porch crate',pos:{x:L_.crates.x,y:.55,z:L_.crates.z},h:.62,mid:.25,aspect:1.2,need:'sign',facing:Math.PI/2,
    pts:[{x:L_.crates.x-.23,y:.88,z:L_.crates.z},{x:L_.crates.x-.23,y:.8,z:L_.crates.z+.12},{x:L_.crates.x-.23,y:.7,z:L_.crates.z-.12}]});
  for(const k of['loaderA','loaderB']){const o=C[k];if(o.crate&&o.crate.visible){const p=o.crate.position;out.push({id:'crate'+k,item:'crate',label:'Maple porch crate',pos:{x:p.x,y:p.y,z:p.z},h:.5,mid:.2,aspect:1.2,pts:[{x:p.x,y:p.y+.25,z:p.z},{x:p.x,y:p.y+.38,z:p.z},{x:p.x,y:p.y+.1,z:p.z}]})}}
  const pl=L_.plate;out.push({id:'plate',item:'plate',label:"The truck's plate",pos:{x:pl.x,y:pl.y-.22,z:pl.z+.03},h:.58,mid:.22,aspect:1.6,need:'plate',facing:Math.PI,pts:[{x:pl.x-.2,y:pl.y,z:pl.z+.03},{x:pl.x+.2,y:pl.y,z:pl.z+.03},{x:pl.x,y:pl.y+.08,z:pl.z+.03}]});
  const lk=C.lookout;out.push({id:'face',item:'face',label:"The lookout's face",pos:{x:lk.x,y:0,z:lk.z},h:.6,mid:1.42,aspect:.9,need:'face',facing:lk.yaw,pts:[{x:lk.x,y:1.58,z:lk.z},{x:lk.x,y:1.42,z:lk.z},{x:lk.x,y:1.25,z:lk.z}]});
  const hand=M.ex.find(e=>e.st==='hand');if(hand){const e=C.envelope.position;out.push({id:'money',item:'money',label:'Money changing hands',pos:{x:e.x,y:.78,z:e.z},h:.5,mid:.24,aspect:1.5,
    pts:[{x:e.x,y:e.y,z:e.z},{x:e.x,y:e.y+.25,z:e.z-.35},{x:e.x,y:e.y+.25,z:e.z+.35}]})}
  const so=L_.sold;out.push({id:'sold',item:'sold',label:'Fake SOLD sign',pos:{x:so.x,y:.17,z:so.z},h:.8,mid:.38,aspect:1.6,need:'sign',facing:Math.PI,pts:[{x:so.x,y:.55,z:so.z+.05},{x:so.x-.38,y:.55,z:so.z+.05},{x:so.x+.38,y:.55,z:so.z+.05}]});
  return out}
function occluders(M){const list=(M.occ||[]).filter(o=>!(M.seat&&o===M.buick));return list}
function onShot(M,s){const a=A();M.shots++;
  if(s.flash){M.flashes++;flashSeen(M);if(!M.flags.flashTxt){M.flags.flashTxt=true;const Ph=PH();if(Ph)Ph.notify('Maddie','dad turn the flash OFF',{color:'linear-gradient(#ff8ad8,#d24fa8)'})}}
  else if(!s.hits.some(h=>h.stars>0)&&!M.flags.thumb&&M.shots>=2){M.flags.thumb=true;const Ph=PH();if(Ph)Ph.notify('Maddie','that photo is of your thumb',{color:'linear-gradient(#ff8ad8,#d24fa8)'})}
  let best=0;for(const h of s.hits){if(!h.stars)continue;const cur=M.board[h.item];if(!cur||h.stars>cur.stars){M.board[h.item]={stars:h.stars,id:s.id,jpg:s.jpg,why:h.why};best=Math.max(best,h.stars);
      const it=ITEMS.find(i=>i.id===h.item);a.feed(it.label+' · '+'★'.repeat(h.stars)+'☆'.repeat(3-h.stars),h.stars>=2?'trust':'info',h.stars>=2?'on the board':'needs ★★')}}
  if(best>=3){if(!M.flags.good3){M.flags.good3=true;const Ph=PH();setTimeout(()=>{if(Ph&&M.state==='go')Ph.notify('Maddie',"ok that one's actually good. who taught you that. me. i did",{color:'linear-gradient(#ff8ad8,#d24fa8)'})},1800)}
    else if(Math.random()<.4)say(M,'you',pick(LN.good3))}
  drawEasel(M.easel,M.board)}
/* the flash: everyone with a line of sight to you inside 24 m sees it */
function flashSeen(M){const a=A(),P=a.P,C=M.A;let seen=0;for(const k of['lookout','driver','loaderA','loaderB','buyer']){const o=C[k];if(!o.d.root.visible)continue;const d=Math.hypot(P.pos.x-o.x,P.pos.z-o.z);if(d>24)continue;
    if(clearTo(M,o,eyeP(M)))seen=Math.max(seen||0,d<12?.3:.18)}
  if(seen){bump(M,seen*(M.seat?1.2:1),'lookout');sayActor(M,'lookout',pick(["Was that a FLASH?","Yo, who's taking pictures?","Did somebody just take a picture?"]))}}

/* ---------------- vantage points ---------------- */
function near(P,p,r){return Math.hypot(P.pos.x-p.x,P.pos.z-p.z)<r}
function vantages(M,F){const a=A(),L_=lay(),P=a.P;
  for(const p of M.pins){const d=Math.hypot(P.pos.x-p.p.x,P.pos.z-p.p.z);p.s.visible=d>2.2&&d<60&&!M.seat;p.s.material.opacity=d<8?.5:.9;p.s.position.y=2.25+Math.sin(a.simT*2+p.p.x)*.06}
  /* Phil: talk your way onto his porch */
  if(!M.porch&&near(P,L_.porch,2.6))F.taps.push({x:L_.porch.x,z:L_.porch.z,r:2.6,txt:'Talk to Phil',fn:()=>{M.porch=true;M.flags.porchT=a.simT;say(M,'you',LN.phil[0]);say(M,'Phil',LN.phil[1]);say(M,'you',"...Yes. Thank you, Phil.");
    M.A.phil.look=yawTo(M.A.phil,a.P.pos);setTimeout(()=>{if(M.A)M.A.phil.look=null},4000)}});
  M.onPorch=M.porch&&Math.hypot(P.pos.x-L_.porch.x,P.pos.z-L_.porch.z)<2.4&&P.pos.z<50.2;
  /* the Buick: get in, get out */
  if(M.seat){F.objs.push(['In the Buick · E to get out',false]);F.taps.push({d:0,r:1,txt:'Get out of the Buick',fn:()=>leaveCar(M)})}
  else if(near(P,L_.carDoor,1.8))F.holds.push({x:L_.carDoor.x,z:L_.carDoor.z,r:1.8,o:M.vant,txt:"Get in Barb's sister's Buick",time:.6,fn:()=>enterBuick(M)});
  /* first time at each spot: one line */
  for(const[k,p,r]of[['bush',L_.bushHide,1.6],['fence',L_.fenceSpot,1.8],['bins',L_.binHide,1.4]])if(!M.flags[k+'0']&&near(P,p,r)){M.flags[k+'0']=true;say(M,'you',LN[k+'0'])}}
function enterBuick(M){const a=A(),L_=lay(),P=a.P;M.seat=true;M.seatYaw=P.yaw;P.yaw=0;P.pitch=-.05;P.crouch=false;if(P.dude)P.dude.root.visible=false;
  if(!M.flags.car0){M.flags.car0=true;say(M,'you',LN.car0)}a.snd&&a.snd('reload',.4);noise(M,L_.carDoor,6)}
function leaveCar(M){const a=A(),L_=lay(),P=a.P;M.seat=false;if(M.buick)M.buick.visible=true;carFrame(M,false);P.pos.set(L_.carDoor.x,0,L_.carDoor.z);a.collide(P.pos,.35);if(P.dude)P.dude.root.visible=true;a.snd&&a.snd('reload',.4);noise(M,L_.carDoor,6)}
function seatCam(dt){const a=A(),M=a.M,L_=lay(),P=a.P,c=a.camera;for(const k of['w','a','s','d',' ','shift'])a.keys[k]=false;
  P.pos.set(L_.carDoor.x,0,L_.carDoor.z);if(P.dude)P.dude.root.visible=false;if(M.buick)M.buick.visible=false;carFrame(M,!(PH()&&HT.Photo.isRaised()));
  if(PH()&&HT.Photo.isRaised())return;/* the phone places the camera */
  c.position.set(L_.seat.x,L_.seat.y,L_.seat.z);c.rotation.set(P.pitch,P.yaw,0);c.fov+=(62-c.fov)*Math.min(1,dt*6);c.updateProjectionMatrix();return true}
/* the meeting: a wide shot of Barb's lawn from the street, drifting slowly in */
function meetCam(dt,M){const a=A(),L_=lay(),c=a.camera,k=Math.min(1,M.mt.t/16),m=L_.meet;
  c.position.set(m.x+1.4-k*.5,3.0-k*.35,m.z+6.6-k*1.2);c.lookAt(m.x+.3,.95,m.z+.2);c.fov+=(44-c.fov)*Math.min(1,dt*4);c.updateProjectionMatrix();if(a.P.dude)a.P.dude.root.visible=true;return true}
/* inside the Buick: the windshield frame, the dash, the fuzzy dice, a butterscotch air freshener (DOM, so it never reaches a photo) */
function carFrame(M,on){const a=A();if(!on){if(M.cf){a.overlay('hoaCar',null);M.cf=null}return}if(M.cf)return;const e=document.createElement('div');e.className='hoa-car';
  e.innerHTML='<i class="pl l"></i><i class="pl r"></i><i class="rf"></i><i class="ds"></i><i class="wh"></i><i class="mr"></i><i class="dc"><b></b><b></b></i><i class="af">BUTTERSCOTCH</i>';css();a.overlay('hoaCar',e);M.cf=e}
/* a door, a footstep, a car door: anyone close turns to look */
function noise(M,p,r){const C=M.A;if(!C)return;for(const k of['lookout','driver','loaderA','loaderB']){const o=C[k];const d=Math.hypot(o.x-p.x,o.z-p.z);if(d<r){o.lookT=1.6;o.look=yawTo(o,p);if(k==='lookout')bump(M,d<r*.5?.12:.06,k)}}}

/* ---------------- detection: one shared suspicion for the crew (they talk) ---------------- */
function eyeP(M){const a=A(),P=a.P,L_=lay();if(M.seat)return{x:L_.seat.x,y:L_.seat.y,z:L_.seat.z};return{x:P.pos.x,y:P.crouch?1.05:1.55,z:P.pos.z}}
const _r={ray:null};
function clearTo(M,o,p){const a=A(),THREE=a.THREE,L=a.L;if(!_r.ray)_r.ray=new THREE.Raycaster();const e=new THREE.Vector3(o.x,1.6,o.z),d=new THREE.Vector3(p.x-e.x,p.y-e.y,p.z-e.z),l=d.length();if(l<.3)return true;d.multiplyScalar(1/l);
  _r.ray.set(e,d);_r.ray.near=.2;_r.ray.far=l-.25;const list=(M.detList||(M.detList=[])),base=L?(L.camSolids||L.solids||[]):[];list.length=0;for(const m of base)list.push(m);for(const m of M.occ||[])if(m!==M.buick)list.push(m);
  return!_r.ray.intersectObjects(list,true).length}
function tileAt(x,z){const W=A().WORLD;const r=W&&W.map&&W.map[Math.floor(z/2)];return r?r[Math.floor(x/2)]:'g'}
function inBox(p,b){return p.x>b.x0&&p.x<b.x1&&p.z>b.z0&&p.z<b.z1}
/* where you are decides how odd it looks: k (multiplier) and the line they'd say */
function context(M){const a=A(),P=a.P,L_=lay(),p={x:P.pos.x,z:P.pos.z};const moving=(M.spd||0)>.7;
  if(M.seat)return{k:.07,film:.5,why:'car',cap:.36};
  if(M.onPorch)return{k:.08,film:.45,why:'porch',cap:.32};
  if(Math.hypot(p.x-L_.porch.x,p.z-L_.porch.z)<2.4&&p.z<50.2)return{k:.25,film:.8,why:'porch',cap:.6,filmCap:.85};/* on Phil's porch before saying hi: odd, not alarming */
  if(inBox(p,L_.lot))return{k:1.5,film:1.6,why:'lawn'};
  if(inBox(p,L_.barbYard)||inBox(p,L_.barbLawn))return{k:.55,film:1.1,why:'barb',cap:.7};
  const c=tileAt(p.x,p.z);if(c==='s'||c===','||c==='l'||c==='p'){const lo=M.loiter>T.loiter;return{k:moving?0:lo?.22:.06,film:moving?.5:.7,why:lo?'loiter':'street',cap:lo?.5:.3,filmCap:.88}}
  return{k:.8,film:1.2,why:'yard'}}
function bump(M,v,who){M.sus=Math.min(1,M.sus+v);M.unseen=0;M.susMax=Math.max(M.susMax,M.sus);M.seen=who||M.seen}
function detect(M,dt){const a=A(),P=a.P,C=M.A,e=eyeP(M),Ph=PH();
  /* speed and loitering */
  const lp=M.lastP;M.spd=lp?Math.hypot(P.pos.x-lp.x,P.pos.z-lp.z)/Math.max(dt,1e-3):0;M.lastP={x:P.pos.x,z:P.pos.z};M.loiter=M.spd<.4?M.loiter+dt:0;
  const ctx=context(M),raised=Ph&&Ph.isRaised();let best=0,who=null,line=null,filming=false;
  M.detT=(M.detT||0)-dt;const doLos=M.detT<=0;if(doLos)M.detT=1/10;
  for(const k of['lookout','driver','loaderA','loaderB','buyer']){const o=C[k];if(!o.d.root.visible||o.spooked){o.seeing=0;continue}const kind=o.obs,R=SUS_R[kind]*(o.inv?1.25:1),half=SUS_HALF[kind]*(o.inv?1.4:1);
    const dx=e.x-o.x,dz=e.z-o.z,d=Math.hypot(dx,dz);if(d>R){o.seeing=0;continue}
    const fx=-Math.sin(o.yaw),fz=-Math.cos(o.yaw),ang=Math.acos(Math.max(-1,Math.min(1,(fx*dx+fz*dz)/(d||1))))*180/Math.PI;
    const band=ang<=half?1:ang<=half+25?.35:0;if(!band){o.seeing=0;continue}
    if(doLos){const head=clearTo(M,o,e),body=clearTo(M,o,{x:e.x,y:M.seat?e.y-.3:(P.crouch?.6:1.05),z:e.z});o.cover=body?1:head?(P.crouch?.3:.6):0}
    if(!o.cover){o.seeing=0;continue}
    const fall=d<=6?1:1-.75*(d-6)/Math.max(1,R-6),stance=P.crouch?.55:M.spd>4?1.3:1;
    /* filming: the phone is up and pointed at this person */
    let film=0;if(raised){const c=a.camera,cf={x:-Math.sin(P.yaw),z:-Math.cos(P.yaw)},tx=o.x-e.x,tz=o.z-e.z,tl=Math.hypot(tx,tz)||1;if((cf.x*tx+cf.z*tz)/tl>Math.cos(22*Math.PI/180)&&d<20)film=1}
    const k2=film?Math.max(ctx.film,ctx.k):(M.habitT>0?0:ctx.k);if(k2<=0){o.seeing=0;continue}
    const f=T.fill*band*o.cover*fall*stance*k2*(d<6?1.5:1)*SUS_RATE[kind];o.seeing=f;if(film)filming=true;
    if(f>best){best=f;who=k;line=film?(ctx.why==='porch'?'philFilm':'film'):ctx.why}}
  if(best>0){const cap=filming?(ctx.filmCap||1):(ctx.cap||1);if(M.sus<cap)M.sus=Math.min(cap,M.sus+Math.min(best,.55)*dt);/* they need a beat to process a dad on their lawn */M.unseen=0;M.seen=who;M.susMax=Math.max(M.susMax,M.sus);M.lastLine.why=line}
  else{M.unseen+=dt;if(M.unseen>T.grace){const floor=M.floorT>0?.3:0;M.sus=Math.max(floor,M.sus-T.decay*dt)}}
  if(M.floorT>0)M.floorT-=dt;
  /* habituation: an innocent-looking dad who has been stared at for a while (in a car, on a porch, on a sidewalk) gets let off */
  if(ctx.cap&&!filming&&best>0&&M.sus>=ctx.cap-.06){M.boredT=(M.boredT||0)+dt;if(M.boredT>5){M.boredT=0;M.habitT=15;const o=C[who];if(o){o.look=null;o.lookT=0;sayActor(M,who,pick(ctx.why==='car'?LN.calmCar:LN.calm))}}}else if(!best)M.boredT=0;
  if(M.habitT>0){M.habitT-=dt;if(filming)M.habitT=0}
  /* reactions: look (turn and stare), investigate (the lookout walks over), spook */
  const lk=C.lookout;
  if(who&&M.sus>=T.look){const o=C[who];if(!o.lookT||o.lookT<.5){o.lookT=1.2;o.look=yawTo(o,e);if(!o.saidT||a.simT-o.saidT>9){o.saidT=a.simT;
      const L0=line==='philFilm'?null:line==='film'?LN.film:line==='car'?LN.car:line==='lawn'?LN.lawn:LN.look;if(line==='philFilm'){say(M,'Phil',LN.philFilm);M.sus=Math.max(0,M.sus-.08)}else sayActor(M,who,pick(L0))}}}
  for(const k of['lookout','driver','loaderA','loaderB','buyer']){const o=C[k];if(o.lookT>0){o.lookT-=dt;if(o.lookT<=0){o.lookT=0;o.look=null}}}
  if(M.sus>=T.inv&&!lk.inv&&!lk.spooked&&who){lk.inv={x:e.x,z:e.z,t:0,said:false};lk.lookT=0;M.floorT=T.floorT;
    const tgt={x:lk.x+(e.x-lk.x)*Math.max(0,1-4/Math.max(4.1,Math.hypot(e.x-lk.x,e.z-lk.z))),z:lk.z+(e.z-lk.z)*Math.max(0,1-4/Math.max(4.1,Math.hypot(e.x-lk.x,e.z-lk.z)))};
    tgt.x=Math.max(112.7,tgt.x);walkTo(lk,[tgt],1.5,()=>{lk.face=yawTo(lk,lk.inv||tgt)});lk.inv.why=line;sayActor(M,'lookout',pick(line==='car'?LN.invCar:LN.inv))}
  if(lk.inv){lk.inv.t+=dt;if(lk.inv.t>9&&M.sus<T.inv){sayActor(M,'lookout',pick(lk.inv.why==='car'?LN.calmCar:LN.calm));lk.inv=null;lk.path=null;lk.leg=4;lk.wait=0}}
  if(M.sus>=T.spook&&!M.spooked)spook(M);
  /* the sight-line fans */
  for(const k of['lookout','driver']){const c=M.cones[k],o=C[k];c.visible=!o.spooked;c.position.set(o.x,.06,o.z);c.rotation.y=o.yaw;const s=k==='lookout'?M.sus:Math.min(1,o.seeing*3);
    c.material.color.setRGB(1,1-s*.55,Math.max(0,.75-s*1.2));c.material.opacity=.16+s*.3}
  /* the eye meter and the "?" tags read from M.sus / o.seeing in hudExtras */
}
/* they spook: the truck leaves early, the job fails to the checkpoint */
function spook(M){const a=A(),C=M.A;M.spooked=true;for(const l of LN.spook)say(M,l[0],l[1]);
  const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.stinger('fail')}catch(e){}
  for(const k of['lookout','driver','loaderA','loaderB']){const o=C[k];o.spooked=true;o.look=null;walkTo(o,[{x:lay().cab.x+(k==='driver'?0:.6),z:lay().cab.z+(k==='driver'?0:1.2+Math.random())}],3.4,()=>{o.d.root.visible=false})}
  M.leaveT=0;M.ph='gone';M.leaveWhy='spook';M.truckGo=true}
function endStake(M,why){const a=A(),n2=ITEMS.filter(it=>M.board[it.id]&&M.board[it.id].stars>=T.need).length;if(M.ph!=='stake')return;
  if(M.seat)leaveCar(M);if(PH())HT.Photo.raise(false);
  if(why==='clock'&&n2<T.needN){say(M,'Driver',"That's it! Let's roll!");M.ph='gone';M.leaveWhy='clock';M.truckGo=true;M.leaveT=0;return}
  if(why==='clock')say(M,'Driver',"That's it! Let's roll!");
  M.ph='meet';startMeeting(M,false)}
/* the truck pulls out and drives north up Walnut (the spook, or the clock) */
function fxTick(M,dt){const a=A();if(!M.truckGo)return;M.leaveT+=dt;const T_=M.truck,t=Math.max(0,M.leaveT-1.5);T_.position.z=lay().truck.z-(t*t*1.6);
  if(M.leaveWhy&&M.ph==='gone'&&M.leaveT>4.5){const w=M.leaveWhy;M.leaveWhy=null;
    if(w==='spook'){M.loseWhy='spook';a.endMission(false,"They'll be back next week. The lookout made you, the truck's gone, and Barb is drafting a memo about it.","They spooked.")}
    else{M.loseWhy='clock';const n2=ITEMS.filter(it=>M.board[it.id]&&M.board[it.id].stars>=T.need).length;a.endMission(false,"The truck's gone and the board has "+n2+" of the 5 photos it needs. Barb: 'A blurry photo is a rumour.'","Not enough evidence.")}}
  if(T_.position.z<lay().truck.z-60)T_.visible=false}

/* ---------------- the emergency HOA meeting ---------------- */
function startMeeting(M,resumed){const a=A(),L_=lay(),C=M.A;if(!resumed)a.CP.mark('meeting');if(PH())HT.Photo.end();
  for(const p of M.pins)p.s.visible=false;for(const k in M.cones)M.cones[k].visible=false;
  /* the crew packs up and goes (nobody saw you, but the clock is the clock) */
  M.truckGo=false;
  const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.music('home');Au.setIntensity(.2)}catch(e){}
  /* the board sits down on Barb's lawn */
  const seats=M.chairs.map(c=>({x:c.position.x,z:c.position.z+.04,yaw:c.rotation.y}));
  const sit=(o,i)=>{o.d.root.visible=true;put(o,seats[i].x,seats[i].z,seats[i].yaw);o.mode='sit';o.face=o.yaw;o.path=null};
  sit(C.phil,1);sit(C.gil,2);put(C.barb,L_.meet.x,L_.meet.z-.55,Math.PI);C.barb.face=Math.PI;C.barb.path=null;
  M.mt={st:resumed?'walk':'walk',t:0};
  say(M,'barb',"Emergency meeting. My lawn. Now. Bring the phone.")}
function meeting(dt,M,F){const a=A(),L_=lay(),P=a.P,mt=M.mt;mt.t+=dt;
  if(mt.st==='walk'){F.target={x:L_.podium.x,z:L_.podium.z,label:'The HOA meeting'};F.objs.push(["Bring the evidence to Barb's lawn",false]);
    if(Math.hypot(P.pos.x-L_.podium.x,P.pos.z-L_.podium.z)<3)F.taps.push({x:L_.podium.x,z:L_.podium.z,r:3,txt:'Present the evidence',fn:()=>present(M)});return}
  if(mt.st==='talk'){F.objs.push(['The board is in session',false]);P.yaw=Math.atan2(-(L_.meet.x-.6-P.pos.x),-((L_.meet.z+.9)-P.pos.z));if(M.say.length===0&&M.sayT<=0&&mt.done&&!mt.fin){mt.fin=true;afterMeeting(M)}return}
  if(mt.st==='free'){F.objs.push(['Back to your ride',false]);F.target={x:M.car.pos.x,z:M.car.pos.z,label:'Your ride'}}}
function present(M){const a=A(),mt=M.mt;if(mt.st!=='walk')return;mt.st='talk';
  showBoard(M,'meeting');for(const l of LN.meeting0)say(M,l[0],l[1]);
  for(const it of ITEMS){const p=M.board[it.id];say(M,'barb',p?BARB_ON[it.id][Math.min(3,p.stars)-1]:BARB_MISS[it.id])}
  for(const l of LN.motion)say(M,l[0],l[1]);
  sayFn(M,()=>{a.feed('Gil voted yes. Gil has never voted yes.','info');const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.ui('cash')}catch(e){}});
  const all3=ITEMS.every(it=>M.board[it.id]&&M.board[it.id].stars>=3);if(all3)say(M,'Gil',"...It was a very good photo.");
  if(M.board.face&&M.board.face.stars>=3){for(const l of LN.twist)say(M,l[0],l[1]);sayFn(M,()=>{M.flags.summer=true;a.addTrust(3,'maple');a.addTrust(3,'river');a.feed('The lookout has a summer job','trust','+3 trust · both sides')})}
  sayFn(M,()=>{mt.done=true;hideBoard(M)})}
function afterMeeting(M){const a=A(),C=M.A;a.banner('THE NEXT MORNING','1418 Walnut Dr',2.6);
  /* the truck and the crew are gone; the board goes home */
  M.truck.visible=false;for(const k of['lookout','driver','loaderA','loaderB','buyer'])C[k].d.root.visible=false;C.envelope.visible=false;for(const k of['loaderA','loaderB'])C[k].crate.visible=false;
  for(const l of LN.next)say(M,l[0],l[1]);
  const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.stinger('win')}catch(e){}
  M.mt.st='free';M.ph='meeting';M.score=ITEMS.reduce((s,it)=>s+(M.board[it.id]?M.board[it.id].stars:0),0);M.exitOpen=true;M.ph='meet'}
/* the board card: the checklist with the actual photos (meeting, and the result card) */
function boardItems(M){return ITEMS.map(it=>({id:it.id,label:it.label,photo:M.board[it.id]?{jpg:M.board[it.id].jpg,stars:M.board[it.id].stars}:null,need:T.need}))}
function showBoard(M,kind){const a=A(),Ph=PH();if(!Ph)return;hideBoard(M);const e=document.createElement('div');e.className='hoa-card';
  e.innerHTML='<div class="hoa-in"><div class="hoa-k">Maple Heights HOA · Emergency meeting</div><h3>Exhibits A–F · 1418 Walnut Dr</h3></div>';
  e.firstChild.appendChild(Ph.board(boardItems(M)));css();document.body.appendChild(e);requestAnimationFrame(()=>e.classList.add('on'));M.card=e}
function hideBoard(M){if(M.card){const e=M.card;M.card=null;e.classList.remove('on');setTimeout(()=>e.remove(),400)}}
function css(){if(document.getElementById('hoa-css'))return;const s=document.createElement('style');s.id='hoa-css';s.textContent=`
.hoa-card{position:fixed;right:calc(var(--sa-r,0px) + 18px);top:50%;transform:translate(30px,-50%);opacity:0;transition:opacity .35s,transform .35s;z-index:6;pointer-events:none;width:min(470px,calc(100vw - 36px))}
.hoa-card.on{opacity:1;transform:translate(0,-50%)}
.hoa-in{background:#c9a36a;background-image:radial-gradient(rgba(0,0,0,.08) 1px,transparent 1.5px);background-size:7px 7px;border:8px solid #6b4a2a;border-radius:6px;padding:12px 14px 6px;box-shadow:0 18px 40px rgba(0,0,0,.45)}
.hoa-k{font:700 12px/1 var(--ht-ui,system-ui);letter-spacing:.16em;text-transform:uppercase;color:#3a2a14}
.hoa-in h3{margin:5px 0 0;font:400 22px/1.1 var(--ht-display,Georgia);color:#1a1208;letter-spacing:.02em}
.hoa-car{position:absolute;inset:0;pointer-events:none}
.hoa-car i{position:absolute;display:block}
.hoa-car .pl{top:-5%;bottom:18%;width:16vw;background:linear-gradient(90deg,#1b1a18,#2b2925);box-shadow:0 0 30px rgba(0,0,0,.6)}
.hoa-car .pl.l{left:-10vw;transform:skewX(14deg)}.hoa-car .pl.r{right:-10vw;transform:skewX(-14deg)}
.hoa-car .rf{left:0;right:0;top:0;height:9vh;background:linear-gradient(#24221f,#3a362f);border-bottom-left-radius:50% 30%;border-bottom-right-radius:50% 30%}
.hoa-car .ds{left:-2%;right:-2%;bottom:0;height:22vh;background:linear-gradient(#6b5d48,#4a4032 30%,#3a3328);border-top-left-radius:45% 40%;border-top-right-radius:45% 40%;box-shadow:0 -6px 14px rgba(0,0,0,.35)}
.hoa-car .wh{left:9vw;bottom:-14vh;width:34vh;height:34vh;border-radius:50%;border:4.2vh solid #1d1c1a;box-shadow:inset 0 0 0 1vh #2c2a26}
.hoa-car .mr{left:calc(50% - 9vh);top:7vh;width:18vh;height:5vh;border-radius:1.2vh;background:linear-gradient(#8fa3b3,#55636e);border:.6vh solid #1d1c1a}
.hoa-car .dc{left:calc(50% - 2vh);top:12vh;width:0;height:7vh;border-left:2px solid #222}
.hoa-car .dc b{position:absolute;top:7vh;width:3.4vh;height:3.4vh;background:#f2f2f2;border-radius:.6vh;box-shadow:inset 0 0 0 .5vh #ff5aa8}
.hoa-car .dc b:first-child{left:-3.4vh;transform:rotate(-12deg)}.hoa-car .dc b:last-child{left:-.2vh;top:8vh;transform:rotate(18deg)}
.hoa-car .af{right:22vw;top:11vh;padding:2.4vh .6vh;background:#e9b23a;color:#5a3a0a;font:800 1.1vh/1 var(--ht-ui,system-ui);letter-spacing:.12em;writing-mode:vertical-rl;border-radius:40% 40% 20% 20%}
.ht-result .hoa-res{margin:10px 0 4px}.ht-result .hoa-res .ph-board{margin:8px 0 0;gap:8px}.ht-result .hoa-res .hk{font:700 12px/1 var(--ht-ui,system-ui);letter-spacing:.16em;text-transform:uppercase;color:var(--fg2,#aaa)}
.ht-root.compact~.hoa-card,.hoa-card{max-height:80vh}
@media (max-width:640px){.hoa-card{left:16px;right:16px;width:auto;top:auto;bottom:calc(var(--sa-b,0px) + 210px);transform:translate(0,30px)}.hoa-card.on{transform:none}}`;document.head.appendChild(s)}
/* the best photo of each item goes in the album (SAVE.album; 3-star photos outlive the rest) */
function album(M){if(M.albumDone)return;M.albumDone=true;const S=window.HT&&HT.Save;if(!S||!S.album)return;
  for(const it of ITEMS){const p=M.board[it.id];if(p&&p.jpg&&p.stars>=2)try{S.album(null,{id:'hoa_'+it.id,job:'hoa',item:it.id,stars:p.stars,jpg:p.jpg})}catch(e){}}}

/* ---------------- lines, one at a time (the subtitle queue only holds four) ---------------- */
function say(M,who,text){M.say.push({who,text})}
function sayFn(M,fn){M.say.push({fn})}
function sayActor(M,k,text){const n={lookout:'Lookout',driver:'Driver',loaderA:'Loader',loaderB:'Other loader',buyer:'Buyer'}[k]||k;if(M.say.length>3)return;say(M,n,text)}
function sayTick(M,dt){const a=A();M.sayT-=dt;if(M.sayT>0)return;const n=M.say.shift();if(!n)return;if(n.fn){try{n.fn()}catch(e){console.warn(e)}M.sayT=.1;return}
  a.radio(n.who,n.text,false);M.sayT=Math.max(2.4,n.text.length*.055)+.25}
/* the dad holds the phone (third person) */
function phoneHold(M){const a=A(),P=a.P;if(!P.dude)return;if(!M.phoneProp){M.phoneProp=phoneProp();M.phoneProp.rotation.set(-1.25,0,0);M.phoneProp.position.set(0,-.02,.06)}
  const want=M.state==='go'&&M.item==='phone'&&(M.ph==='stake'||M.ph==='intro');if(want&&P.dude.gunHold&&M.phoneProp.parent!==P.dude.gunHold){try{a.equip(P.dude,null)}catch(e){}P.dude.gunHold.add(M.phoneProp)}
  if(!want&&M.phoneProp.parent)M.phoneProp.parent.remove(M.phoneProp)}
function actors(M,dt){const C=M.A;if(!C)return;M.upT=(M.upT||0)-dt;const up=M.upT<=0;if(up)M.upT=1;for(const k in C){const o=C[k];if(o&&o.d){if(up&&o.box)upgrade(o);actorUpd(o,dt)}}
  /* the driver keeps his phone at his ear while he waits */}
/* HUD: tags over anyone who is looking, the meter colours, vantage labels */
function hudExtras(M,st){const a=A(),C=M.A;if(st.weapon)st.weapon=Object.assign({},st.weapon,{holstered:true});if(!C||M.ph!=='stake')return;st.tags=st.tags||[];
  for(const k of['lookout','driver','loaderA','loaderB','buyer']){const o=C[k];if(!o.d.root.visible)continue;const s=o.seeing>0&&M.sus>.15;if(!s&&!(k==='lookout'&&o.inv))continue;
    const pr=a.project(o.x,2.15,o.z);if(pr.behind)continue;st.tags.push({id:o,text:o.inv||M.sus>=T.inv?'?!':'?',kind:M.sus>=T.inv?'boss':'surr',screen:pr})}
  st.markers=st.markers||[];const P=a.P;
  /* the five vantage points, labelled with their trade-off, on the minimap and in the world from the start */
  for(const p of M.pins){const d=Math.hypot(P.pos.x-p.p.x,P.pos.z-p.p.z);if(M.seat&&p.k==='car')continue;const first=M.guide==='go'&&p.k==='porch';
    const up=PH()&&HT.Photo.isRaised(),near=d<30||first;st.markers.push({id:'v_'+p.k,kind:'travel',label:p.lab+' · '+p.tag,x:p.p.x,z:p.p.z,dist:d,screen:near&&!up?a.project(p.p.x,2.0,p.p.z):{x:-9999,y:-9999,behind:true},edge:first&&!up,always:first,rim:first})}
  /* violations nearby you haven't got yet: a small tag over each one you can see */
  for(const sj of subjects(M)){const have=M.board[sj.item]?M.board[sj.item].stars:0;if(have>=2)continue;const q=sj.pts[1],d=Math.hypot(P.pos.x-q.x,P.pos.z-q.z);if(d>26)continue;
    const v=M.view&&M.view[sj.item];if(!v||(PH()&&HT.Photo.isRaised()))continue;const pr=a.project(q.x,q.y+.45,q.z);if(pr.behind)continue;st.tags.push({id:'s_'+sj.id,text:'📷 '+sj.label+(have?' ★':''),kind:'ally',screen:pr})}
  /* minimap: the crew as dots, red when they're looking at you */
  st.enemies=(st.enemies||[]).concat(['lookout','driver','loaderA','loaderB'].map(k=>({id:C[k],x:C[k].x,z:C[k].z,alert:C[k].seeing>0,seen:C[k].seeing>0,dead:!C[k].d.root.visible})))}
/* warm the cast while Barb's job is on offer in the hub (neighbour models load on demand; the stakeout needs ten of them) */
let PRE=false;J.on('hud',()=>{if(PRE)return;const a=A();if(!a||a.mode!=='hub')return;const s=a.SV&&a.SV();if(!(s&&s.jobs&&s.jobs.gary&&s.jobs.gary.done))return;const p=PP();if(!p||!p.ok)return;PRE=true;preload()});
/* the result card: the photos the HOA saw (or what you had when it went wrong) */
J.on('hud',()=>{const a=A(),M=a&&a.M;if(!M||M.def.id!=='hoa'){return}
  if(M.state==='go'){return}
  if(M.card)hideBoard(M);
  if(M.resDone)return;const r=document.querySelector('.ht-result .col');if(!r)return;M.resDone=true;const Ph=PH();if(!Ph||!M.board)return;css();
  const w=document.createElement('div');w.className='hoa-res';w.innerHTML='<div class="hk">'+(M.state==='won'?'Exhibits A–F, as presented to the board':'What you had on the board')+'</div>';w.appendChild(Ph.board(boardItems(M)));
  const pay=r.querySelector('.ht-payout');r.insertBefore(w,pay||r.querySelector('.ht-btns'))});

/* ---------------- the scripted player for dev/jobs-check.js ----------------
   Plays it like a careful person: listens to Barb, walks (2.6 m/s) the long way round on the public sidewalks, talks to Phil and works
   from his porch, waits for the lookout to pause at the corner for his face, crosses to the Buick for the plate, the SOLD sign and the
   money, takes the crates off the loaders, and turns the flash off after the first flash. o.fail: strolls up their driveway and films
   the lookout from his own lawn until they spook. */
function bot(a,t,o){const M=a.M,P=a.P;if(!M||M.state!=='go'||!M.ph||M.ph==='load')return null;const L_=lay(),B=M.bot||(M.bot={}),Ph=PH();
  if(a.CV){a.exitCar();return null}
  const goTo=(p,sp)=>{const dx=p.x-P.pos.x,dz=p.z-P.pos.z,d=Math.hypot(dx,dz);if(d<.25){B.stuck=0;return true}const s=Math.min(d,(sp||2.6)/30);const x0=P.pos.x,z0=P.pos.z;
    /* a person walks around a parked car or a passing one: when blocked for half a second, step sideways for a moment */
    let ux=dx/d,uz=dz/d;if(B.side>0){B.side--;const sx=-uz*B.sideDir,sz=ux*B.sideDir;ux=ux*.15+sx;uz=uz*.15+sz}
    P.pos.x+=ux*s;P.pos.z+=uz*s;a.collide(P.pos,.35);P.yaw=Math.atan2(-dx,-dz);
    if(Math.hypot(P.pos.x-x0,P.pos.z-z0)<s*.3){B.stuck=(B.stuck||0)+1;if(B.stuck>12){B.stuck=0;B.unstuck=(B.unstuck||0)+1;B.side=30+15*(B.unstuck%4);if(B.unstuck%2)B.sideDir=B.sideDir===1?-1:1}/* round a parked van: longer each try, both ways */}else B.stuck=0;return false};
  const route=(pts,sp)=>{B.ri=B.ri||0;while(B.ri<pts.length&&goTo(pts[B.ri],sp))B.ri++;return B.ri>=pts.length};
  if(M.ph==='intro'){B.i=(B.i||0)+1;if(B.i<60)return null;if(!goTo({x:L_.barb.x-.2,z:L_.barb.z+1.6}))return null;if(M.say.length>1)return null;a.useTap=true;return null}
  if(M.ph==='meet'){const mt=M.mt;if(mt.st==='walk'){if(M.seat){a.useTap=true;return null}if(B.mr==null){B.mr=1;B.ri=0}if(route([{x:105.6,z:67.7},{x:L_.podium.x,z:67.7},{x:L_.podium.x,z:L_.podium.z+.2}]))a.useTap=true;return null}
    if(mt.st==='free'){B.f=(B.f||0)+1;if(B.f<45)return null;const e=M.car;if(B.f===45)B.ri=0;if(route([{x:L_.podium.x,z:67.7},{x:e.pos.x+.5,z:67.7},{x:e.pos.x+.5,z:e.pos.z-1.6}],3))a.useTap=true;return null}return null}
  if(M.ph!=='stake')return null;
  const shoot=(sub,zi)=>{const s=subjects(M).find(s=>s.id===sub||s.item===sub);if(!s)return false;
    if(sub!=='money'&&sub!=='face'&&['lookout','driver','loaderA','loaderB','buyer'].some(k=>M.A[k].seeing>.05)){lower();return false}/* not while somebody's looking this way */if(!Ph.isRaised()){Ph.raise(true);return false}if(Ph.zoom!==Ph.T.zoom[zi])Ph.setZoom(zi);
    Ph.aimAt(s.pos.x,s.pos.y+(s.mid!=null?s.mid:s.h/2),s.pos.z);if(!Ph.focus.locked)return false;B.hold=(B.hold||0)+1;if(B.hold<(sub==='face'?3:10))return false;B.hold=0;
    /* only press the shutter when the screen says it's worth it (the live grade beats what's on the board) */
    const pv=Ph.preview(),h=pv&&pv.hits.find(h=>h.item===s.item),cur=M.board[s.item]?M.board[s.item].stars:0;if(!h||h.stars<=cur){B.miss=(B.miss||0)+1;if(B.miss%45!==0)return false}const r=Ph.shoot();if(r&&r.flash)Ph.toggleFlash();return!!r};
  const lower=()=>{if(Ph.isRaised())Ph.raise(false)};
  const have=(id,n)=>M.board[id]&&M.board[id].stars>=(n||2);
  if(!o.fail&&(M.sus>(B.step==='face3'?.8:.5)||B.cool>0)&&B.step!=='toPorch'&&B.step!=='toCar'){/* somebody's looking: phone down, wait it out */B.cool=M.sus>(B.step==='face3'?.8:.5)?(B.cool>0?B.cool:150):M.sus>.4?Math.max(0,(B.cool||0)-1):(B.cool>30?30:(B.cool||0)-1);lower();P.crouch=B.step==='bushes';return null}
  if(o.fail){/* up the driveway, phone out, right at the lookout */P.crouch=false;if(!B.fs){if(!route([{x:105.8,z:67.7},{x:105.8,z:55},{x:L_.apron.x-1,z:L_.apron.z+1.5}],2.2))return null;B.fs=1}
    const lk=M.A.lookout;if(!Ph.isRaised())Ph.raise(true);else Ph.aimAt(lk.x,1.4,lk.z);if(t%40===0)Ph.shoot();return null}
  B.step=B.step||'toPorch';const st=M.st,lk=M.A.lookout;
  if(B.step!=='inCar')a.keys.e=false;
  switch(B.step){
    case'toPorch':/* west along Elm St, north up the far sidewalk of Walnut, onto Phil's porch */
      lower();P.crouch=false;if(route([{x:112.5,z:70.4},{x:105.8,z:70.4},{x:105.8,z:48.6},{x:L_.porch.x,z:L_.porch.z-.1}]))B.step='phil',B.ri=0;return null;
    case'phil':if(!M.porch){a.useTap=true;return null}B.w=(B.w||0)+1;if(B.w<90)return null;B.step='bike';return null;
    case'bike':if((have('bike')&&have('crate'))||(st>70&&have('bike'))||st>110){lower();B.step='toCar';B.ri=0;return null}/* the crates come by the Buick too */shoot(have('bike')?'crate0':'bike',2);return null;
    case'face':/* wait for the lookout's pause at the corner, facing the porch */
      if(have('face')||st>110){lower();B.step='toCar';B.ri=0;return null}
      if(lk.face===Math.PI/2&&!lk.path&&Math.hypot(lk.x-L_.lk.n.x,lk.z-L_.lk.n.z)<.6){shoot('face',2)}else lower();return null;
    case'toCar':P.crouch=false;if(route([{x:105.8,z:48.6},{x:105.6,z:60.7}]))B.step='inCar',B.ri=0;return null;
    case'inCar':if(!M.seat){a.keys.e=true;return null}a.keys.e=false;B.step='carShots';return null;
    case'carShots':{const want=['plate','sold','money','face','crate'].find(id=>!have(id,2)&&(id!=='money'||M.ex.some(e=>e.st==='hand'))&&(id!=='face'||(Math.abs(lk.face-Math.PI*.82)<.01&&!lk.path&&!lk.inv&&Math.hypot(lk.x-L_.lk.s.x,lk.z-L_.lk.s.z)<.8))&&(id!=='crate'||subjects(M).some(s=>s.id.startsWith('crateloader')&&s.pos.z>52)));
      B.want=want||'-';
      if(!want){lower();const n2=ITEMS.filter(it=>have(it.id)).length;if(n2>=6&&!have('face',3)&&M.tc<190&&!o.safe){B.step='face3';return null}if(n2>=6||(n2>=5&&M.tc>215)){B.step='leave';return null}return null}
      shoot(want==='crate'?subjects(M).find(s=>s.id.startsWith('crateloader')&&s.pos.z>52).id:want,want==='money'||want==='sold'?2:want==='face'?1:2);return null}
    case'face3':{/* the twist needs a 3-star face: out of the Buick, across to the far kerb south of him, wait for his pause, 4x */
      if(M.seat){lower();a.useTap=true;return null}if(have('face',3)||M.tc>222){B.step='leave';return null}
      const coming=(lk.path&&lk.z>53&&lk.path[lk.path.length-1].z>60)||(!lk.path&&Math.hypot(lk.x-L_.lk.s.x,lk.z-L_.lk.s.z)<.8);
      if(!coming){lower();P.crouch=true;goTo({x:104.9,z:62.2},1.4);B.want='face3 hide';return null}
      if(!(!lk.path&&Math.hypot(lk.x-L_.lk.s.x,lk.z-L_.lk.s.z)<.8)){lower();P.crouch=false;goTo({x:104.5,z:65.2},1.4);B.want='face3 ready';return null}if(!goTo({x:106.4,z:64.8},2.2))return null;P.crouch=false;
      const paused=Math.abs(lk.face-Math.PI*.82)<.01&&!lk.path&&!lk.inv&&Math.hypot(lk.x-L_.lk.s.x,lk.z-L_.lk.s.z)<.8;if(paused){const pv=Ph.preview(),h=pv&&pv.hits.find(h=>h.item==='face');B.want='face3 '+(h?h.stars+' '+h.why.join('/'):'-')+' f'+Ph.focus.locked+' k'+(Ph.focus.k||0).toFixed(1)+' d'+(Ph.focus.dist||0).toFixed(1)+' r'+Ph.isRaised()+' z'+Ph.zoom;shoot('face',2)}else{B.want='face3 wait';lower()}return null}
    case'leave':lower();if(M.seat){a.useTap=true;return null}if(!goTo({x:105.2,z:65}))return null;B.w2=(B.w2||0)+1;if(B.w2<20)return null;a.useTap=true;return null}
  return null}
})();
