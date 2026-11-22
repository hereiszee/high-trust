/* High Trust · HT.Range — the people of Fort Sensible and its public shooting range (docs/base.md)
 * Free roam, always open. Runs from HT.Jobs system hooks ('hud' every frame, 'fire' to count trigger pulls and keep the muzzle
 * downrange) and HT.Base.on('interact') (E prompts, called from index.html updHub). Targets are meshes in L.solids whose
 * userData.onShot scores the hit (index.html fire()).
 *   Lanes 1-6 face west. Paper at 10/25/50 m, a plate rack at 25 m, steel gongs at 50 and 100 m, five pop-ups at 16 m, a mover at 22 m.
 *   The timed course: six stages (pop-ups, plates, shoot/don't-shoot, mover, long steel, paper), a score, accuracy, a medal,
 *   the top five runs per gun in SAVE.base.range[gun]. Free ammo on the line. The rental rack lends any gun in the catalogue.
 */
(function(){'use strict';
const HT=window.HT=window.HT||{};
const R={};HT.Range=R;
const J=()=>HT.Jobs;const A=()=>HT.Jobs&&HT.Jobs.api;const B=()=>HT.Base;const RO=()=>HT.Roam;const AU=()=>HT.Audio;const FXm=()=>HT.FX||null;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;const pick=a=>a[Math.floor(Math.random()*a.length)];
const KE=()=>{try{return(A().HUD&&A().HUD.touch)?'Use':'E'}catch(_){return'E'}};
const NAMES={guard:'Cpl. Doyle',officer:'Sgt. Pruitt'};
const LINES={
  guard:["Range is open to the public on days ending in Y.","Go on through. Wipe your feet. It's a base, but still.","ID? Nah. You've got a dad face. Go ahead.",
    "Welcome to Fort Sensible. Speed limit's fifteen. I won't be angry. I'll be disappointed.","Range is straight down the road on your left. If you hit the runway, you've gone too far. Literally."],
  guardTank:["That's... that's the tank. Okay. Okay! Have a good one, sir.","I'm going to pretend I didn't see that. Barrier's up."],
  hello:["Eyes and ears on. Muzzle downrange. Then we can be friends.","Welcome to the range. Free ammo on the line. Don't tell the taxpayers."],
  tips:["Right mouse to aim down the sights. It's not a suggestion. It's a lifestyle.","Breathe out, then squeeze. Like you're telling the kids it's bedtime.",
    "Recoil climbs. Pull down a little. Gently. Like a stuck drawer.","Steel rings when you hit it. Paper doesn't. Paper just judges you quietly.",
    "Short bursts with the carbine. Nobody likes a long story.","The .308 has a scope. Aim, settle, squeeze. The berm isn't going anywhere."],
  start:["Course is hot. Make ready.","Shooter ready? Stand by.","Alright. Let's see what the minivan taught you."],
  mailman:["You shot the mailman. He's cardboard. He's still filing a complaint.","That was Phil. Phil delivers your magazines. Phil is cardboard, but still."],
  medal:[["Well. The berm is safe.","I've seen worse. I've seen worse yesterday. From a golden retriever."],["You hit things. Some of them were targets.","Bronze. Like a nice deck stain."],
    ["Solid. I'd let you hold my coffee.","Silver. Your neighbours should feel moderately safe."],["That'll do. Don't let it go to your mustache.","Gold. I'm putting you on the board. Don't make it weird."]],
  rent:["Rental's on the house. Bring it back clean. Bring it back at all.","Try before you buy. Like a mattress, but louder."],
  rentBack:["Rental goes back on the rack. Like it? Hank's Hardware carries it. Tell him Pruitt sent you. He won't know who that is.","Rental's back on the rack. Your own gun's in your hand. Like a homecoming."],
  aim:["Downrange, please. That's west. The way the targets are.","Muzzle downrange. I'm not asking twice. I'm asking once, slowly."]};
const say=(who,t,front)=>{try{A().radio(NAMES[who]||who,t,front)}catch(_){}};

/* ================= textures (canvas, built once) ================= */
const TX={};
function ctex(key,w,h,draw){if(TX[key])return TX[key];const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return TX[key]=t}
const tBull=()=>ctex('bull',256,256,(x,w,h)=>{x.fillStyle='#f3efe2';x.fillRect(0,0,w,h);const cx=w/2,cy=h/2;
  for(let r=10;r>=1;r--){x.beginPath();x.arc(cx,cy,r*12,0,6.283);x.fillStyle=r<=4?'#151515':'#f3efe2';x.fill();x.strokeStyle=r<=4?'#f3efe2':'#151515';x.lineWidth=2;x.stroke()}
  x.fillStyle='#d23b2f';x.beginPath();x.arc(cx,cy,6,0,6.283);x.fill();x.fillStyle='#151515';x.font='700 11px Arial';x.textAlign='center';for(let r=5;r<=9;r++)x.fillText(''+(11-r),cx+r*12-6,cy+4)});
/* cardboard cut-outs: a cartoon burglar (mask, striped shirt, a sack marked $) and Phil the mailman (do not shoot) */
function cutout(kind){return ctex('cut'+kind,256,512,(x,w,h)=>{x.clearRect(0,0,w,h);const ol=k=>{x.lineWidth=k||8;x.strokeStyle='#3a2a1a';x.stroke()};
  const body=(shirt,stripes)=>{x.beginPath();x.moveTo(60,500);x.lineTo(70,250);x.quadraticCurveTo(128,205,186,250);x.lineTo(196,500);x.closePath();x.fillStyle=shirt;x.fill();
    if(stripes){x.save();x.clip();x.fillStyle='#1d1d1d';for(let y=250;y<500;y+=34)x.fillRect(0,y,w,15);x.restore()}x.beginPath();x.moveTo(60,500);x.lineTo(70,250);x.quadraticCurveTo(128,205,186,250);x.lineTo(196,500);ol()};
  if(kind==='bad'){body('#efefef',true);x.beginPath();x.arc(128,160,62,0,6.283);x.fillStyle='#e9b98f';x.fill();ol();x.fillStyle='#1d1d1d';x.fillRect(66,136,124,30);x.fillStyle='#fff';x.beginPath();x.arc(104,151,9,0,6.283);x.arc(152,151,9,0,6.283);x.fill();
    x.fillStyle='#1d1d1d';x.beginPath();x.ellipse(128,108,64,26,0,Math.PI,0);x.fill();x.fillRect(64,100,128,10);x.beginPath();x.moveTo(110,192);x.quadraticCurveTo(128,184,146,192);ol(5);
    x.beginPath();x.ellipse(205,330,48,62,.2,0,6.283);x.fillStyle='#b78c55';x.fill();ol(6);x.fillStyle='#3a2a1a';x.font='900 60px Arial';x.textAlign='center';x.fillText('$',207,350)}
  else{body('#6f8fb8',false);x.fillStyle='#e9e3d6';x.fillRect(118,250,20,250);x.beginPath();x.arc(128,160,62,0,6.283);x.fillStyle='#c58e66';x.fill();ol();
    x.fillStyle='#2d4a7a';x.beginPath();x.ellipse(128,108,66,22,0,Math.PI,0);x.fill();x.fillRect(58,104,140,14);x.fillStyle='#1d1d1d';x.beginPath();x.arc(106,156,6,0,6.283);x.arc(150,156,6,0,6.283);x.fill();
    x.beginPath();x.arc(128,176,24,.2,Math.PI-.2);ol(5);x.fillStyle='#fff';x.fillRect(20,300,70,46);x.strokeStyle='#3a2a1a';x.lineWidth=4;x.strokeRect(20,300,70,46);x.beginPath();x.moveTo(20,300);x.lineTo(55,325);x.lineTo(90,300);x.stroke();
    x.fillStyle='#d23b2f';x.font='900 30px Arial';x.textAlign='center';x.fillText('PHIL',128,470);x.font='700 20px Arial';x.fillText('DO NOT SHOOT',128,496)}})}
const MT={};function mt(key,o){return MT[key]||(MT[key]=new THREE.MeshStandardMaterial(o))}

/* ================= state ================= */
const S={L:null,root:null,hits:[],targets:[],pops:[],plates:[],gongs:[],papers:[],mover:null,people:{},barrier:null,flag:null,board:null,boardKey:'',
  course:null,card:null,rent:null,rentIdx:-1,lastHit:null,lastHitT:-9,said:{},t:0,simT:0,taught:{},solT:0,visitSaid:false,inBase:false};
R.S=S;
function sv(){try{const s=A().SV();if(s&&!s.base)s.base={};return s&&s.base}catch(_){return null}}
function persist(){try{A().save()}catch(_){}}

/* ================= building the runtime pieces (once per world level; re-attached after resets) ================= */
function build(a,d){const T=THREE,root=new T.Group();root.name='fortSensible';S.root=root;S.L=a.L;S.rackG=null;S.rackFr=null;/* a new level builds a new rack */ S.hits=[];S.targets=[];S.pops=[];S.plates=[];S.gongs=[];S.papers=[];S.mover=null;
  const K=B().kit,P=K.painter();const R=d.range,L=R.lanes,line=R.line;
  const wood=mt('wood',{color:K.lin('#8a6a45'),roughness:.9}),steel=mt('steel',{color:K.lin('#5d6266'),roughness:.4,metalness:.7}),paint=mt('steelp',{color:K.lin('#e8e3d2'),roughness:.55,metalness:.3});
  const add=(m,list,o)=>{m.castShadow=true;m.receiveShadow=true;root.add(m);S.hits.push(m);const t=Object.assign({mesh:m},o);list.push(t);S.targets.push(t);m.userData.onShot=(hit,gun,w,dir)=>onHit(t,hit,gun,w,dir);return t};
  /* paper on a frame: lane 1 @10, lane 2 @25, lane 4 @50 */
  for(const[li,dist]of[[0,10],[1,25],[3,50]]){const x=line-dist,z=L[li],s=dist>=50?1.1:.75;
    for(const dz of[-.45*s-.06,.45*s+.06])P.box('paint',x-.05,0,z+dz-.05,x+.05,1.75*s+.25,z+dz+.05,'#7a5a3a');P.box('paint',x+.02,.9,z-.5*s-.1,x+.08,.9+s+.12,z+.5*s+.1,'#b89a6a');
    const m=new T.Mesh(new T.PlaneGeometry(s*.9,s*.9),mt('bull',{map:tBull(),roughness:.95}));m.position.set(x+.1,.95+s*.55,z);m.rotation.y=Math.PI/2;add(m,S.papers,{kind:'paper',dist,lane:li,size:s*.9})}
  /* the plate rack, lane 3 @25: three plates that fall when hit */
  {const x=line-25,z=L[2];P.box('metal',x-.06,0,z-1.1,x+.06,1.05,z+1.1,'#3d4245');P.box('metal',x-.2,0,z-1.2,x+.2,.12,z+1.2,'#3d4245');
    for(let i=0;i<3;i++){const g=new T.Group();g.position.set(x,1.05,z-.7+i*.7);const m=new T.Mesh(new T.CylinderGeometry(.16,.16,.03,20),paint);m.rotation.z=Math.PI/2;m.position.y=.2;g.add(m);
      const st=new T.Mesh(new T.BoxGeometry(.03,.12,.04),steel);st.position.y=.06;g.add(st);root.add(g);m.castShadow=true;S.hits.push(m);
      const t={mesh:m,g,kind:'plate',dist:25,down:false,ang:0};S.plates.push(t);S.targets.push(t);m.userData.onShot=(hit,gun,w,dir)=>onHit(t,hit,gun,w,dir)}}
  /* gongs: lane 5 @50, lane 6 @100, hanging from a frame */
  for(const[li,dist,r]of[[4,50,.32],[5,100,.5]]){const x=line-Math.min(dist,98.5)/* the 100 m gong stands just in front of the backstop */,z=L[li],H=1.9;P.box('metal',x-.05,0,z-.8,x+.05,H+.1,z-.7,'#3d4245');P.box('metal',x-.05,0,z+.7,x+.05,H+.1,z+.8,'#3d4245');P.box('metal',x-.06,H,z-.85,x+.06,H+.12,z+.85,'#3d4245');
    const g=new T.Group();g.position.set(x,H,z);const m=new T.Mesh(new T.CylinderGeometry(r,r,.035,28),paint);m.rotation.z=Math.PI/2;m.position.y=-r-.25;g.add(m);
    for(const s of[-1,1]){const c=new T.Mesh(new T.CylinderGeometry(.008,.008,.3,4),steel);c.position.set(0,-.13,s*r*.5);g.add(c)}
    root.add(g);m.castShadow=true;S.hits.push(m);const t={mesh:m,g,kind:'gong',dist,lane:li,swing:0,sv:0};S.gongs.push(t);S.targets.push(t);m.userData.onShot=(hit,gun,w,dir)=>onHit(t,hit,gun,w,dir)}
  /* pop-ups at 16 m across lanes 2-6: hinged at the base, flat until the course raises them */
  for(let i=0;i<5;i++){const x=line-16,z=L[i+1]+(i%2?.6:-.6);const g=new T.Group();g.position.set(x,.08,z);g.rotation.y=Math.PI/2;
    const m=new T.Mesh(new T.PlaneGeometry(.9,1.8),mt('bad',{map:cutout('bad'),transparent:true,alphaTest:.5,side:T.DoubleSide,roughness:.9}));m.position.y=.9;g.add(m);
    P.box('metal',x-.25,0,z-.5,x+.25,.08,z+.5,'#3d4245');g.rotation.order='YXZ';g.rotation.x=-Math.PI/2+.05;root.add(g);m.castShadow=true;S.hits.push(m);
    const t={mesh:m,g,kind:'pop',up:0,want:0,role:'bad',dist:16};S.pops.push(t);S.targets.push(t);m.userData.onShot=(hit,gun,w,dir)=>onHit(t,hit,gun,w,dir)}
  /* the mover: a burglar on a trolley along a rail at 22 m */
  {const x=line-22;P.box('metal',x-.08,0,L[0]-1.5,x+.08,.1,L[5]+1.5,'#3d4245');const g=new T.Group();g.position.set(x,.1,L[5]+1);
    const cart=new T.Mesh(new T.BoxGeometry(.6,.25,.8),steel);cart.position.y=.12;g.add(cart);const m=new T.Mesh(new T.PlaneGeometry(.9,1.8),MT.bad);m.position.y=1.15;m.rotation.y=Math.PI/2;g.add(m);root.add(g);
    m.castShadow=true;S.hits.push(m);const t={mesh:m,g,kind:'mover',dist:22,z:L[5]+1,dir:-1,active:false,hit:false};S.mover=t;S.targets.push(t);m.userData.onShot=(hit,gun,w,dir)=>onHit(t,hit,gun,w,dir)}
  /* gate barrier: a striped arm on a post (raised when someone comes) */
  {const b=d.barrier,post=new T.Group();post.position.set(b.x+b.w/2+.2,0,b.z);P.box('paint',b.x+b.w/2,0,b.z-.25,b.x+b.w/2+.5,1.05,b.z+.25,'#e9b92e');
    const arm=new T.Group();arm.position.set(b.x+b.w/2+.25,1.0,b.z);const stripe=ctex('stripe',256,16,(x,w,h)=>{for(let i=0;i<8;i++){x.fillStyle=i%2?'#f4f2ea':'#c8312c';x.fillRect(i*32,0,32,h)}});
    const bar=new T.Mesh(new T.BoxGeometry(b.w,.12,.1),mt('stripe',{map:stripe,roughness:.6}));bar.position.x=-b.w/2;arm.add(bar);arm.rotation.z=-1.35;root.add(arm);S.barrier={arm,ang:-1.35,b}}
  /* the flag on the parade ground: a plain US flag (the one the school flies), waving */
  {const f=d.flag,tex=ctex('flag',256,160,(x)=>{for(let i=0;i<13;i++){x.fillStyle=i%2?'#f4f1ea':'#b8323a';x.fillRect(0,i*160/13,256,160/13+1)}x.fillStyle='#2b3f73';x.fillRect(0,0,108,86);x.fillStyle='#fff';
      for(let r=0;r<5;r++)for(let k=0;k<6;k++){x.beginPath();x.arc(10+k*17+(r%2)*8,10+r*16,2.6,0,6.28);x.fill()}});
    const geo=new T.PlaneGeometry(2.7,1.6,12,6);geo.translate(1.35,0,0);const m=new T.Mesh(geo,mt('flagm',{map:tex,side:T.DoubleSide,roughness:.85}));m.position.set(f.x+.1,11.6,f.z);m.castShadow=true;root.add(m);
    S.flag={m,geo,base:Float32Array.from(geo.attributes.position.array)}}
  /* the leaderboard by Range Control: a canvas that redraws after every course */
  {const c=document.createElement('canvas');c.width=512;c.height=384;const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;const b=R.board;
    const m=new T.Mesh(new T.PlaneGeometry(2.4,1.8),mt('lbm',{map:t,roughness:.8}));m.position.set(b.x,1.75,b.z);m.rotation.y=Math.PI/2;root.add(m);
    P.box('paint',b.x-.1,0,b.z-1.3,b.x-.02,2.75,b.z+1.3,'#3d4a2c');S.board={c,t,m}}
  /* the rental rack (owner's playtest: "doesn't have everything, hard to figure out what you're choosing"): a wall rack with every gun
     in the game on its own peg, a name-and-class plate over each one; the real gun models are hung on it in rackGuns() below */
  {const k=R.rack,x=k.x,z=k.z,n=RACK_IDS.length,W2=RACK_W*n/2;P.box('paint',x-.05,0,z-W2-.12,x+.12,2.35,z+W2+.12,'#c9bc9e');/* back board: light pegboard, so the dark guns read */
    P.box('paint',x-.3,0,z-W2-.12,x+.12,.12,z+W2+.12,'#4a3626');P.box('paint',x-.22,.12,z-W2-.12,x+.12,.18,z+W2+.12,'#6b4f37');/* foot rail */
    for(let i=0;i<n;i++){const id=RACK_IDS[i],gz=rackZ(i),w=(a.WEAPONS||{})[id]||{},cls=rackCls(id);
      if(w.slot==='side')P.box('paint',x-.3,1.06,gz-RACK_W*.42,x-.04,1.1,gz+RACK_W*.42,'#6b4f37');/* a little shelf for a sidearm */
      else{P.box('metal',x-.16,.18,gz-.05,x-.04,.3,gz+.05,'#2c2f31');/* butt cup */P.box('metal',x-.16,1.48,gz-.06,x-.04,1.54,gz+.06,'#2c2f31')/* peg */}
      P.sign(x-.07,2.02,gz,RACK_W*.92,.36,Math.PI/2,K.board('rk'+id,[(i+1)+' · '+(w.name||id).toUpperCase(),cls.toUpperCase()],2,1,w.slot==='side'?'brown':'green'))}
    P.sign(x-.07,2.62,z,Math.min(3.6,W2*2),.42,Math.PI/2,K.board('rack',['RENTAL RACK · FREE · TRY ANY GUN','WALK UP · PICK ONE · IT COMES BACK WHEN YOU LEAVE'],2,1,'yellow'))}
  P.flush(root);drawBoard(true);
  people(a,d)}
/* the guard and the range officer, from the neighbour pool (never the crew or the family) */
function people(a,d){const PP=HT.People;const mk=(key,look)=>{let dd=null;try{if(PP&&PP.ok)dd=PP.make('neighbour',{variant:key})}catch(_){dd=null}if(!dd)try{dd=a.makeDude(look)}catch(_){dd=null}return dd};
  const place=(id,key,look,p)=>{if(S.people[id]&&S.people[id].d)return;const dd=mk(key,look);if(!dd)return;dd.root.position.set(p.x,0,p.z);dd.root.rotation.y=p.yaw||0;S.root.add(dd.root);
    try{if(dd.meshes)for(const m of dd.meshes)m.userData.noBatch=true}catch(_){}if(HT.Staff&&HT.Staff.dress)HT.Staff.dress(dd);else cap(dd);/* W-07: uniform + cap (js/staff.js) */S.people[id]={d:dd,p:{x:p.x,z:p.z},yaw:p.yaw||0,home:p}};
  place('guard','nb_pops',{shirt:'#55603f',pants:'#4b4f3a',cap:'#55603f'},d.guard);
  place('officer','nb_marcus',{shirt:'#55603f',pants:'#4b4f3a',cap:'#55603f'},d.range.officer)}
/* a patrol cap so they read as post staff (a small olive cap on the head bone, or the box head) */
function cap(dd){try{const T=THREE,m=mt('cap',{color:B().kit.lin('#55603f'),roughness:.85});const g=new T.Group();
    const top=new T.Mesh(new T.CylinderGeometry(.105,.115,.09,14),m);top.position.y=.07;g.add(top);const brim=new T.Mesh(new T.BoxGeometry(.2,.012,.09),m);brim.position.set(0,.03,.1);g.add(brim);
    const bone=dd.rb&&dd.rb.bones&&(dd.rb.bones.Bip01_Head||dd.rb.bones.Head);if(bone){dd.root.updateMatrixWorld(true);const s=bone.getWorldScale(new T.Vector3()).x||1;g.scale.setScalar(1/s);g.position.set(.1/s,0,0);g.rotation.set(0,0,-Math.PI/2);bone.add(g)}
    else if(dd.head){g.position.y=.12;dd.head.add(g)}}catch(_){}}

/* ================= hits ================= */
function curShot(){return S.course?S.course.shot:0}
function onHit(t,hit,gun,w,dir){const a=A(),FX=HT.FX;const p=hit.point;
  if(t.kind==='paper'){const lp=t.mesh.worldToLocal(p.clone());const r=Math.hypot(lp.x,lp.y)/(t.size/2);const ring=r<=1?Math.max(1,10-Math.floor(r*10)):0;score(t,ring?ring*8:0,ring?ring+' · paper':'edge');
    S.lastHit={text:'Lane '+(t.lane+1)+' · '+t.dist+' m · '+(ring?ring:'edge'),t:S.simT};return false}
  const n=dir?dir.clone().negate():new THREE.Vector3(1,0,0);
  try{if(FX&&FX.impact)FX.impact(p,n,t.kind==='pop'||t.kind==='mover'?'wood':'metal',{decal:false})}catch(_){}
  if(t.kind==='plate'){if(t.down)return true;t.down=true;ding(1500,.5);score(t,40,'plate');S.lastHit={text:'Plate · 25 m',t:S.simT}}
  else if(t.kind==='gong'){t.sv+=.9+(w&&w.dmg>50?.6:0);ding(t.dist>=100?620:880,1.1);score(t,t.dist>=100?100:60,'steel');S.lastHit={text:'Steel · '+t.dist+' m · DING',t:S.simT}}
  else if(t.kind==='pop'){if(t.want<=0||t.up<.6)return true;t.want=0;thunk();if(t.role==='mail'){score(t,-100,'mailman');say('officer',pick(LINES.mailman),true)}else score(t,50,'pop-up');
    S.lastHit={text:t.role==='mail'?'That was Phil':'Pop-up · 16 m',t:S.simT}}
  else if(t.kind==='mover'){if(!t.active||t.hit)return true;t.hit=true;thunk();score(t,80,'mover');S.lastHit={text:'Mover · 22 m',t:S.simT}}
  return true}
function ding(f,d){const Au=AU();try{if(Au&&Au.tone){Au.tone({f,to:f*.985,type:'sine',d,gain:.32});Au.tone({f:f*2.71,to:f*2.68,type:'sine',d:d*.5,gain:.09})}}catch(_){}}
function thunk(){const Au=AU();try{if(Au&&Au.tone)Au.tone({f:180,to:70,type:'triangle',d:.18,gain:.3})}catch(_){}}
function score(t,pts,why){const c=S.course;if(!c||c.state!=='run')return;const st=c.stage;if(!st)return;
  if(c.hitShot!==c.shot){c.hitShot=c.shot;c.hitShots++}
  if(st.need&&st.need.has(t)&&pts>0){st.need.delete(t);c.score+=pts;c.hits++}else if(pts<0){c.score+=pts;c.penalties++}else if(pts>0&&st.bonus&&!st.done.has(t)){st.done.add(t);c.score+=pts;c.hits++}}

/* ================= the timed course ================= */
const STAGES=[
  {id:'pop',label:'Pop-ups',say:'Three at sixteen. Go.',t:5,set:c=>({pops:[0,2,4]})},
  {id:'plates',label:'Plate rack',say:'Plates. Twenty-five meters. Lane three.',t:6,set:c=>({plates:true})},
  {id:'sds',label:"Shoot / don't shoot",say:"Two bad guys. One Phil. Don't shoot Phil.",t:5,set:c=>({pops:[1,3],mail:[2]})},
  {id:'mover',label:'Mover',say:'Mover. Lead it a little.',t:5.5,set:c=>({mover:true})},
  {id:'steel',label:'Long steel',say:'Fifty and a hundred. Take your time. Not too much.',t:8,set:c=>({gongs:[0,1]})},
  {id:'paper',label:'Paper',say:'Paper. One each, lanes one and two. Make it pretty.',t:7,set:c=>({papers:[0,1]})}];
const PAR=45;
function courseStart(a){if(S.course&&S.course.state!=='done')return;const P=a.P;closeCard();
  if(!RO().drawn)RO().draw(P.cur);fillUp(a);
  S.course={state:'count',t:3.2,stageI:-1,stage:null,score:0,hits:0,hitShots:0,shots:0,shot:0,hitShot:-1,penalties:0,time:0,gun:P.cur,beeps:3};
  for(const p of S.pops){p.want=0}for(const pl of S.plates){pl.down=false}if(S.mover){S.mover.active=false}
  say('officer',pick(LINES.start),true);teach(a,'course','Timed course: shoot what pops up · Right mouse aims · R reloads · the score counts hits, time and accuracy')}
function nextStage(a){const c=S.course;c.stageI++;if(c.stageI>=STAGES.length){courseEnd(a);return}
  const def=STAGES[c.stageI],o=def.set(c),st={def,t:def.t,need:new Set(),done:new Set(),pause:0};c.stage=st;say('officer',def.say,true);
  if(o.pops)for(const i of o.pops){const p=S.pops[i];p.role='bad';p.mesh.material=MT.bad;p.want=1;st.need.add(p)}
  if(o.mail)for(const i of o.mail){const p=S.pops[i];p.role='mail';p.mesh.material=MT.mail||(MT.mail=new THREE.MeshStandardMaterial({map:cutout('mail'),transparent:true,alphaTest:.5,side:THREE.DoubleSide,roughness:.9}));p.want=1}
  if(o.plates)for(const pl of S.plates){pl.down=false;st.need.add(pl)}
  if(o.mover){const m=S.mover;m.active=true;m.hit=false;m.z=A().L?B().def().range.lanes[5]+1:0;m.dir=-1;st.need.add(m)}
  if(o.gongs)for(const i of o.gongs)st.need.add(S.gongs[i]);
  if(o.papers)for(const i of o.papers)st.need.add(S.papers[i]);
  beep(880,.12)}
function courseEnd(a){const c=S.course;c.state='done';for(const p of S.pops)p.want=0;if(S.mover)S.mover.active=false;
  const acc=c.shots?c.hitShots/c.shots:0,timeB=Math.max(0,Math.round((PAR-c.time)*6)),accB=Math.round(acc*100);c.base=c.score;c.timeB=timeB;c.accB=accB;c.total=Math.max(0,c.score+timeB+accB);c.acc=acc;
  c.medal=c.total>=800?3:c.total>=600?2:c.total>=350?1:0;
  const s=sv();let best=null,rank=0,prev=null;if(s){const RG=s.range||(s.range={});const list=RG[c.gun]||(RG[c.gun]=[]);prev=list[0]?list[0].score:null;
    const day=(()=>{try{return A().SV().day||1}catch(_){return 1}})();const e={score:c.total,time:+c.time.toFixed(1),acc:+acc.toFixed(2),medal:c.medal,day,rental:!!S.rent};list.push(e);list.sort((x,y)=>y.score-x.score);list.length=Math.min(list.length,5);rank=list.indexOf(e)+1;best=list[0];persist()}
  c.rank=rank;c.prev=prev;c.best=best;drawBoard(true);
  say('officer',c.penalties?pick(LINES.mailman):pick(LINES.medal[c.medal]),true);beep(c.medal>=2?1320:660,.3);showCard(a,c)}
function beep(f,d){const Au=AU();try{if(Au&&Au.tone)Au.tone({f,type:'square',d:d||.12,gain:.12,bus:'ui'})}catch(_){}}
function courseTick(a,dt){const c=S.course;if(!c||c.state==='done')return;
  if(c.state==='count'){const b=Math.ceil(c.t-.2);c.t-=dt;if(b<c.beeps&&b>=0){c.beeps=b;beep(b?520:1040,.12)}if(c.t<=0){c.state='run';nextStage(a)}return}
  c.time+=dt;const st=c.stage;if(!st)return;
  if(st.pause>0){st.pause-=dt;if(st.pause<=0)nextStage(a);return}
  st.t-=dt;if(st.need.size===0||st.t<=0){if(st.need.size)c.missed=(c.missed||0)+st.need.size;for(const p of S.pops)p.want=0;if(S.mover)S.mover.active=false;st.pause=.9}
  /* abandon: walking off the line */
  if(!B().armOk(a.P.pos.x,a.P.pos.z)||a.CV){c.state='done';for(const p of S.pops)p.want=0;if(S.mover)S.mover.active=false;say('officer',"Course is cold. You walked off. That's a choice.",true);S.course=null}}

/* ================= the results card (pointer lock: any key closes it; touch: tap) ================= */
function fmtT(t){return Math.floor(t/60)+':'+(t%60).toFixed(1).padStart(4,'0')}
function gunName(id){try{const w=A().WEAPONS[id];return w?w.name:id}catch(_){return id}}
function showCard(a,c){closeCard();const el=document.createElement('div');el.className='ht-range-card';
  const MED=['No medal','Bronze','Silver','Gold'],MC=['#9aa0a6','#c98a4a','#c9d1d8','#f0c64a'];
  const s=sv(),list=s&&s.range&&s.range[c.gun]||[];
  el.innerHTML=`<style>.ht-range-card{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:auto;background:rgba(10,14,10,.35);z-index:40;font-family:var(--ui,Arial)}
  .ht-rc{width:min(460px,92vw);background:#f4f0e3;color:#1d2414;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.45);overflow:hidden}
  .ht-rc h2{margin:0;padding:14px 18px 10px;background:#3f4a2f;color:#f1ead2;font-size:22px;letter-spacing:.06em;display:flex;justify-content:space-between;align-items:center}
  .ht-rc h2 small{font-size:12px;opacity:.8;letter-spacing:.1em}.ht-rc .row{display:flex;gap:10px;padding:12px 18px 4px}.ht-rc .st{flex:1;background:#e7e1cf;border-radius:8px;padding:8px 10px}
  .ht-rc .st b{display:block;font-size:22px}.ht-rc .st span{font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.7}
  .ht-rc .med{margin:10px 18px;padding:10px 12px;border-radius:10px;background:#2b3322;color:#f1ead2;display:flex;align-items:center;gap:12px;font-size:16px}
  .ht-rc .dot{width:34px;height:34px;border-radius:50%;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25)}
  .ht-rc ol{margin:4px 18px 8px 38px;padding:0;font-size:14px}.ht-rc li{padding:2px 0}.ht-rc li.me{font-weight:700;color:#7a4b12}
  .ht-rc .k{padding:10px 18px 14px;font-size:13px;opacity:.75;display:flex;justify-content:space-between}</style>
  <div class="ht-rc"><h2>RANGE QUALIFIER <small>FORT SENSIBLE</small></h2>
  <div class="row"><div class="st"><span>Score</span><b>${c.total}</b></div><div class="st"><span>Time</span><b>${fmtT(c.time)}</b></div><div class="st"><span>Accuracy</span><b>${Math.round(c.acc*100)}%</b></div></div>
  <div class="row" style="padding-top:4px;font-size:13px"><div style="flex:1">Targets ${c.base} · time bonus ${c.timeB} · accuracy bonus ${c.accB}${c.penalties?` · <b style="color:#a12a2a">Phil ×${c.penalties}</b>`:''}</div></div>
  <div class="med"><div class="dot" style="background:${MC[c.medal]}"></div><div><b>${MED[c.medal]}</b> · ${esc(gunName(c.gun))}${S.rent?' (rental)':''}<br><small>${c.rank===1&&c.prev!=null&&c.total>c.prev?'New best with this gun.':c.rank?'#'+c.rank+' on your board for this gun.':''}</small></div></div>
  <div style="padding:0 18px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7">Your top runs · ${esc(gunName(c.gun))}</div>
  <ol>${list.map((e,i)=>`<li class="${i===c.rank-1?'me':''}">${e.score} · ${fmtT(e.time)} · ${Math.round(e.acc*100)}% · ${MED[e.medal]}${e.rental?' · rental':''}</li>`).join('')}</ol>
  <div class="k"><span>${KE()} · run it again at the officer</span><span>E / Enter · close</span></div></div>`;
  const close=()=>closeCard();el.addEventListener('click',close);S.card={el,t:0,close};
  try{if(a.HUD&&a.HUD.overlay)a.HUD.overlay('rangeCard',el);else document.body.appendChild(el)}catch(_){document.body.appendChild(el)}
  /* listen straight away (a short delay here missed fast key presses); auto-repeat from a held key never closes it */
  document.addEventListener('keydown',S.card.key=e=>{if(e.repeat)return;if(e.code==='KeyE'||e.code==='Enter'||e.code==='NumpadEnter'||e.code==='Space'||e.code==='KeyF'){e.stopImmediatePropagation();/* the key that closes the card doesn't also press the next E prompt (the rack menu) */closeCard()}},true)}
function closeCard(){const c=S.card;if(!c)return;S.card=null;if(c.key)document.removeEventListener('keydown',c.key,true);try{const a=A();if(a.HUD&&a.HUD.overlay&&a.HUD.overlay('rangeCard'))a.HUD.overlay('rangeCard',null);else c.el.remove()}catch(_){try{c.el.remove()}catch(__){}}}
R.closeCard=closeCard;
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ================= the board by Range Control ================= */
function drawBoard(force){const b=S.board;if(!b)return;const s=sv();const RG=s&&s.range||{};const rows=[];for(const g in RG)if(RG[g]&&RG[g][0])rows.push([g,RG[g][0]]);rows.sort((x,y)=>y[1].score-x[1].score);
  const key=JSON.stringify(rows);if(!force&&key===S.boardKey)return;S.boardKey=key;const x=b.c.getContext('2d'),W=b.c.width,H=b.c.height;
  x.fillStyle='#2f3a24';x.fillRect(0,0,W,H);x.strokeStyle='#e8c64a';x.lineWidth=8;x.strokeRect(8,8,W-16,H-16);x.fillStyle='#f1ead2';x.textAlign='center';x.font='900 38px Arial';x.fillText('BEST SCORES',W/2,56);
  x.font='700 18px Arial';x.fillStyle='#e8c64a';x.fillText('FORT SENSIBLE QUALIFIER · ONE ROW PER GUN',W/2,84);x.textAlign='left';x.font='700 24px Arial';
  if(!rows.length){x.fillStyle='#f1ead2';x.textAlign='center';x.fillText('No scores yet.',W/2,190);x.font='20px Arial';x.fillText('Talk to Sgt. Pruitt to run the course.',W/2,226)}
  rows.slice(0,8).forEach(([g,e],i)=>{const y=126+i*31;x.fillStyle=['#9aa0a6','#c98a4a','#c9d1d8','#f0c64a'][e.medal];x.beginPath();x.arc(36,y-8,10,0,6.28);x.fill();
    x.fillStyle='#f1ead2';x.fillText(gunName(g).slice(0,22),56,y);x.textAlign='right';x.fillText(''+e.score,W-30,y);x.textAlign='left'});b.t.needsUpdate=true}

/* ================= the rental rack ================= */
const RACK_IDS=['pistol','revolver','nailer','shotgun','double','beanbag','rifle','smg','hunter'];/* every gun the player can fire (HT.CATALOG.gunOrder) */
const RACK_W=.46;
function rackIds(){try{const o=HT.CATALOG&&HT.CATALOG.gunOrder;const w=A().WEAPONS;if(o&&o.length){const l=o.filter(id=>w[id]);for(const id in w)if(!l.includes(id))l.push(id);return l}}catch(_){}return RACK_IDS}
function rackZ(i){const k=B().def().range.rack,n=RACK_IDS.length;return k.z+(i-(n-1)/2)*RACK_W}
function rackCls(id){try{const g=HT.CATALOG&&HT.CATALOG.guns&&HT.CATALOG.guns[id];if(g&&g.cls)return g.cls}catch(_){}const w=(A().WEAPONS||{})[id]||{};return w.slot==='side'?'Sidearm':'Long gun'}
/* the real models on the pegs (HT.Guns, loaded async), the highlight frame */
/* audit PERF-01: the rack is drawn only near it (camera within RACK_SHOW m), built the first time you come within RACK_BUILD m */
const RACK_BUILD=30,RACK_SHOW=45;
function rackNear(a,r){const k=B().def().range.rack,c=a.camera.position;return Math.hypot(c.x-k.x,c.z-k.z)<r}
/* merge the hung guns: untextured surfaces into two vertex-coloured materials (metal / not), each textured or unlit material into one
   mesh; the highlight frame stays its own (it moves). Every part is put in the group's space and given position, normal, uv (+ colour) */
function rackMerge(g){const T=THREE;g.updateMatrixWorld(true);const inv=new T.Matrix4().copy(g.matrixWorld).invert(),M=new T.Matrix4(),N=new T.Matrix3();const B2=new Map(),drop=[];
  g.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||Array.isArray(o.material)||!o.geometry||!o.geometry.attributes.position)return;if(o.parent===g&&o.material.depthWrite===false)return;/* the frame */
    let vis=true;for(let q=o;q&&q!==g;q=q.parent)if(!q.visible)vis=false;if(!vis){drop.push(o);return}
    const m=o.material,tex=!!m.map,basic=m.type==='MeshBasicMaterial',key=tex?'t'+m.uuid:basic?'b'+m.uuid:'m'+((m.metalness||0)>=.5?1:0)+(m.transparent?'t':'');
    let b=B2.get(key);if(!b)B2.set(key,b={mat:m,col:!tex&&!basic,parts:[],r:0,n:0});M.multiplyMatrices(inv,o.matrixWorld);N.getNormalMatrix(M);
    const src=o.geometry.index?o.geometry.toNonIndexed():o.geometry,pa=src.attributes.position,na=src.attributes.normal,ua=src.attributes.uv,ca=src.attributes.color,n=pa.count;
    const P=new Float32Array(n*3),Nn=new Float32Array(n*3),U=new Float32Array(n*2),C=b.col?new Float32Array(n*3):null,v=new T.Vector3();
    for(let i=0;i<n;i++){v.fromBufferAttribute(pa,i).applyMatrix4(M);P.set([v.x,v.y,v.z],i*3);if(na){v.fromBufferAttribute(na,i).applyMatrix3(N).normalize();Nn.set([v.x,v.y,v.z],i*3)}else Nn[i*3+1]=1;
      if(ua){U[i*2]=ua.getX(i);U[i*2+1]=ua.getY(i)}if(C){const cc=m.color||{r:1,g:1,b:1};C[i*3]=cc.r*(ca?ca.getX(i):1);C[i*3+1]=cc.g*(ca?ca.getY(i):1);C[i*3+2]=cc.b*(ca?ca.getZ(i):1)}}
    b.parts.push({P,N:Nn,U,C});b.r+=(m.roughness==null?.6:m.roughness)*n;b.n+=n;drop.push(o)});
  for(const o of drop)if(o.parent)o.parent.remove(o);
  for(const c of[...g.children])if(c.type==='Group'||c.type==='Object3D')g.remove(c);/* the emptied gun roots */
  for(const[key,b]of B2){let n=0;for(const q of b.parts)n+=q.P.length/3;const geo=new T.BufferGeometry(),cat=(f,w)=>{const a=new Float32Array(n*w);let o=0;for(const q of b.parts){a.set(q[f],o);o+=q[f].length}return a};
    geo.setAttribute('position',new T.BufferAttribute(cat('P',3),3));geo.setAttribute('normal',new T.BufferAttribute(cat('N',3),3));geo.setAttribute('uv',new T.BufferAttribute(cat('U',2),2));
    let mat=b.mat;if(b.col){geo.setAttribute('color',new T.BufferAttribute(cat('C',3),3));mat=new T.MeshStandardMaterial({vertexColors:true,roughness:Math.min(1,b.r/Math.max(1,b.n)),metalness:key[1]==='1'?.85:0,envMap:b.mat.envMap||null,transparent:!!b.mat.transparent,opacity:b.mat.opacity==null?1:b.mat.opacity})}
    geo.computeBoundingSphere();const mesh=new T.Mesh(geo,mat);mesh.name='rack:'+key[0];mesh.castShadow=false;mesh.receiveShadow=true;mesh.userData.noBatch=true;g.add(mesh)}
  S.rackCalls=B2.size}
function rackGuns(a){const GN=HT.Guns;if(S.rackG||!GN||!GN.model||!S.root||!rackNear(a,RACK_BUILD))return;/* PERF-01: built only when you're at the range */const k=B().def().range.rack,T=THREE,g=new T.Group();g.name='rentalRack';
  for(let i=0;i<RACK_IDS.length;i++){const id=RACK_IDS[i],w=a.WEAPONS[id];let m=null;try{m=GN.model(id)}catch(_){m=null}if(!m)continue;
    m.rotation.set(Math.PI/2,0,0);/* muzzle (-Z) up */const side=w&&w.slot==='side';m.position.set(k.x-.16,side?1.16:.62,rackZ(i));if(side){m.rotation.set(Math.PI/2,0,0);m.position.y=1.2}
    m.traverse(o=>{if(o.isMesh){o.castShadow=false;o.userData.noBatch=true}});g.add(m)}
  rackMerge(g);/* audit PERF-01: 9 guns were ~342 draw calls; merged they are a handful */
  const fr=new T.Mesh(new T.BoxGeometry(.04,1.95,RACK_W*.94),new T.MeshBasicMaterial({color:0xffd34a,transparent:true,opacity:.28,depthWrite:false}));fr.position.set(k.x-.2,1.2,k.z);fr.visible=false;g.add(fr);
  const edge=new T.LineSegments(new T.EdgesGeometry(fr.geometry),new T.LineBasicMaterial({color:0xffd34a}));fr.add(edge);S.rackFr=fr;
  S.root.add(g);S.rackG=g}
/* which gun you mean: the one under the crosshair, else the one nearest you along the rack */
function rackPick(a){const k=B().def().range.rack,P=a.P,cam=a.camera;const n=RACK_IDS.length;
  const f=new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion);let idx=-1;
  if(f.x>.15){const t=(k.x-.1-cam.position.x)/f.x;if(t>0&&t<6){const zz=cam.position.z+f.z*t,yy=cam.position.y+f.y*t;if(yy>.1&&yy<2.4)idx=Math.round((zz-k.z)/RACK_W+(n-1)/2)}}
  if(idx<0||idx>=n)idx=Math.max(0,Math.min(n-1,Math.round((P.pos.z-k.z)/RACK_W+(n-1)/2)));return idx}
function nearRack(a){const k=B().def().range.rack,P=a.P;return P.pos.x<k.x+.3&&P.pos.x>k.x-3&&Math.abs(P.pos.z-k.z)<RACK_W*RACK_IDS.length/2+.8}
/* the rack menu: every gun as a card (icon, name, class, ammo, magazine); arrows / 1-9 / mouse choose, E or Enter takes, 0 your own guns */
function menuOpen(a,idx){if(S.menu)return;const h=HT.HUD,icon=id=>{try{return h&&h.icons&&h.icons.gun?h.icons.gun(id):''}catch(_){return''}};const W=a.WEAPONS;
  const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(6,9,12,.88);font-family:"Barlow","Arial Narrow",Arial,sans-serif;color:#eef2f2';
  const cards=RACK_IDS.map((id,i)=>{const w=W[id]||{};return'<div data-i="'+i+'" style="cursor:pointer;width:178px;padding:10px 12px;border-radius:10px;background:rgba(20,26,30,.92);border:2px solid rgba(255,255,255,.12)">'+
    '<div style="display:flex;justify-content:space-between;font-size:13px;opacity:.7"><b>'+(i+1)+'</b><span>'+rackCls(id).toUpperCase()+'</span></div>'+
    '<div style="height:44px;display:flex;align-items:center;justify-content:center;fill:#e8eef0">'+icon(id)+'</div>'+
    '<div style="font-size:17px;font-weight:700;line-height:1.15">'+(w.name||id)+'</div><div style="font-size:13px;opacity:.75">'+(w.ammo||'')+' · '+(w.mag||'?')+' a mag'+(w.auto?' · auto':'')+(id==='beanbag'?' · less-lethal':'')+'</div></div>'}).join('');
  d.innerHTML='<div style="max-width:min(1000px,94vw);text-align:center"><div style="font-size:30px;font-weight:800;letter-spacing:.04em">RENTAL RACK</div>'+
    '<div style="font-size:15px;opacity:.8;margin:2px 0 12px">Free on the range. '+rackHint()+'</div>'+
    '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">'+cards+'</div>'+
    '<div data-own style="cursor:pointer;margin:12px auto 0;display:inline-block;padding:6px 14px;border-radius:8px;background:rgba(20,26,30,.92);border:2px solid rgba(255,255,255,.12)"><b>'+(HT.Pad&&HT.Pad.active?HT.Pad.btn('X'):'0')+'</b> · Your own guns'+(S.rent?' (return the rental)':'')+'</div></div>';
  document.body.appendChild(d);/* pointer lock stays as it is (losing it opens the pause menu): keys choose; the mouse works when the cursor isn't locked */
  const M=S.menu={el:d,i:idx,cards:[...d.querySelectorAll('[data-i]')]};const sel=i=>{M.i=(i+RACK_IDS.length)%RACK_IDS.length;M.cards.forEach((c,j)=>{c.style.borderColor=j===M.i?'#ffd34a':'rgba(255,255,255,.12)';c.style.background=j===M.i?'rgba(60,52,20,.95)':'rgba(20,26,30,.92)'})};sel(idx);
  M.cards.forEach((c,j)=>{c.onmouseenter=()=>sel(j);c.onclick=()=>{sel(j);menuTake(a)}});d.querySelector('[data-own]').onclick=()=>{menuClose();rentReturn(a)};
  M.key=e=>{const k=e.key;e.stopImmediatePropagation();e.preventDefault();if(e.repeat&&!/Arrow/.test(k))return;
    if(k==='ArrowRight'||k==='ArrowDown'||k==='d'||k==='D')sel(M.i+1);else if(k==='ArrowLeft'||k==='ArrowUp'||k==='a'||k==='A')sel(M.i-1);
    else if(/^[1-9]$/.test(k)&&+k<=RACK_IDS.length){sel(+k-1);menuTake(a)}else if(k==='0'){menuClose();rentReturn(a)}
    else if(k==='Enter'||k==='e'||k==='E'||k===' ')menuTake(a);else if(k==='Escape'||k==='Backspace')menuClose()};
  M.keyup=e=>{e.stopImmediatePropagation()};document.addEventListener('keydown',M.key,true);document.addEventListener('keyup',M.keyup,true);
  /* controller (js/gamepad.js): D-pad / stick / LB RB choose, A takes, X your own guns, B closes */
  if(HT.Pad&&HT.Pad.modal)M.unpad=HT.Pad.modal({move:(dx,dy)=>sel(M.i+(dx||dy)),ok:()=>menuTake(a),back:()=>menuClose(),x:()=>{menuClose();rentReturn(a)}});
  try{for(const kk in a.keys)a.keys[kk]=false}catch(_){}}
/* the menu's key line, for the device in use */
function rackHint(){const P=HT.Pad;if(P&&P.active)return'D-pad to choose · '+P.btn('A')+' takes it · '+P.btn('X')+' your own guns · '+P.btn('B')+' closes';
  const K=HT.Keys,u=K&&K.label?K.label('use'):'E';return'← → or 1-9 to choose · '+u+' / Enter takes it · 0 your own guns · Esc closes'}
function menuClose(){const M=S.menu;if(!M)return;S.menu=null;if(M.unpad)M.unpad();document.removeEventListener('keydown',M.key,true);document.removeEventListener('keyup',M.keyup,true);M.el.remove()}
function menuTake(a){const M=S.menu;if(!M)return;const id=RACK_IDS[M.i];menuClose();rentTake(a,id)}
/* E at the rack opens the menu straight from the key (with a gun drawn the game's prompt pipeline can be busy with its own prompts) */
document.addEventListener('keydown',e=>{if(e.repeat||S.menu||S.card)return;const k=(e.key||'').toLowerCase();if(k!=='e')return;const a=A();if(!a||a.mode!=='hub'||a.CV||!B()||!B().def()||!S.root)return;
  if(document.querySelector('.ht-pause'))return;if(!nearRack(a))return;e.stopImmediatePropagation();menuOpen(a,rackPick(a))},true);
(function padUse(){if(!(HT.Pad&&HT.Pad.useAt)){if(typeof setTimeout==='function'&&typeof document!=='undefined')setTimeout(padUse,500);return}HT.Pad.useAt(()=>{const a=A();return !!(a&&a.mode==='hub'&&!a.CV&&!S.menu&&!S.card&&S.root&&B()&&B().def()&&nearRack(a))})})();/* pad A at the rack opens it (no HUD prompt there) */
R.menu=()=>S.menu?{open:true,i:S.menu.i,id:RACK_IDS[S.menu.i]}:{open:false};R.rackIds=()=>RACK_IDS.slice();R.rackPick=()=>rackPick(A());
/* ================= rentals ================= */
function rentList(a){const all=Object.keys(a.WEAPONS);let own=[];try{own=a.SV().owned.guns||[]}catch(_){}const not=all.filter(g=>!own.includes(g));return not.length?not:all}
function rentTake(a,id){const P=a.P,w=a.WEAPONS[id];if(!w)return;if(!S.rent)S.rent={lo:Object.assign({},P.loadout),cur:P.cur};S.rentIdx=RACK_IDS.indexOf(id);const lo=Object.assign({},S.rent.lo);
  if(w.slot==='side')lo.side=id;else lo.p1=id;RO().setLoadout(lo,id);RO().draw(id);fillUp(a);const s=sv();if(s){s.rentals=(s.rentals|0)+1}
  say('officer',!S.said.rent?(S.said.rent=1,pick(LINES.rent)):w.name+'. '+rackCls(id)+'. Have fun.',true);
  teach(a,'rent','Rental: '+w.name+' · '+KE()+' at the rack for another · it goes back when you leave the range')}
function rentNext(a){const P=a.P,list=rentList(a);if(!S.rent)S.rent={lo:Object.assign({},P.loadout),cur:P.cur};
  S.rentIdx=(S.rentIdx+1)%list.length;const id=list[S.rentIdx],w=a.WEAPONS[id],lo=Object.assign({},S.rent.lo);
  if(w.slot==='side')lo.side=id;else lo.p1=id;RO().setLoadout(lo,id);RO().draw(id);fillUp(a);
  const s=sv();if(s){s.rentals=(s.rentals|0)+1}say('officer',S.rentIdx===0&&!S.said.rent?(S.said.rent=1,pick(LINES.rent)):w.name+'. '+(w.slot==='side'?'Sidearm.':'Long gun.')+' Have fun.',true);
  teach(a,'rent','Rental: '+w.name+' · '+KE()+' at the rack again for the next one · it goes back when you leave the range')}
function rentReturn(a,quiet){if(!S.rent)return;const r=S.rent;S.rent=null;S.rentIdx=-1;try{RO().setLoadout(r.lo,r.cur);if(RO().drawn&&B().armOk(a.P.pos.x,a.P.pos.z))RO().draw(r.cur)}catch(_){}if(!quiet)say('officer',pick(LINES.rentBack))}
R.rentReturn=()=>rentReturn(A(),true);

/* free ammo on the line: the reserve of the gun in hand stays full */
function fillUp(a){const P=a.P,id=P.cur,w=a.WEAPONS[id],am=P.ammo&&P.ammo[id];if(!w||!am)return;if(am.res<w.reserve)am.res=w.reserve;if(P.pool&&w.ammo in P.pool&&P.pool[w.ammo]<w.reserve)P.pool[w.ammo]=w.reserve}
/* each new control is shown once (a feed line with the keys); SAVE keeps what was taught */
function teach(a,id,text){const s=sv();const t=s?(s.taught||(s.taught={})):S.taught;if(t[id])return;t[id]=1;try{a.HUD.feed(text,'info')}catch(_){}}

/* the post's runtime pieces are drawn only within ~170 m of the camera (each child's bounds cached once; checked 3× a second) */
const _cv=new THREE.Vector3(),_cb=new THREE.Box3(),_cs=new THREE.Sphere();
function cull(a){const c=a.camera.position;const jump=!S.cullP||S.cullP.distanceTo(c)>20;/* PERF-02: a teleport, fast travel or job start re-culls at once */
  S.cullT=(S.cullT||0)-1/30;if(S.cullT>0&&!jump)return;S.cullT=.33;S.cullP=(S.cullP||new THREE.Vector3()).copy(c);
  for(const o of S.root.children){if(o===S.rackG)continue;let sp=o.userData._cs;if(!sp){_cb.setFromObject(o);if(_cb.isEmpty())continue;sp=o.userData._cs=_cb.getBoundingSphere(new THREE.Sphere())}
    o.visible=c.distanceTo(sp.center)-sp.radius<170}}
/* ================= per frame (hud hook: runs in free roam and in jobs) ================= */
const _v=new THREE.Vector3();
function tick(){const a=A();if(!a||!a.L||!a.L.ow||!B()||!B().def())return;const d=B().def();
  if(S.L!==a.L||!S.root)build(a,d);
  if(S.root.parent!==a.L.group)a.L.group.add(S.root);
  cull(a);
  const dt=Math.min(.1,Math.max(0,a.simT-S.simT));S.simT=a.simT;S.t+=dt;
  /* the target meshes are raycast through L.solids (index.html's rayTargets); a level reset trims L.solids, so put them back */
  S.solT-=dt;if(S.solT<=0){S.solT=.5;if(S.hits.length&&!a.L.solids.includes(S.hits[0])){for(const m of S.hits)a.L.solids.push(m);try{a.rebuildTargets()}catch(_){}}}
  if(a.mode!=='hub'){if(S.course&&S.course.state!=='done')S.course=null;if(S.rent)rentReturn(a,true);return}
  if(!dt)return;
  const P=a.P,px=P.pos.x,pz=P.pos.z,near=Math.hypot(px-160,pz-200)<230;
  animate(a,d,dt,near);
  const inB=B().inBase(px,pz);
  /* first visit: the pin goes on the map with fast travel, the region banner does the rest */
  if(inB&&!S.inBase){S.inBase=true;const s=sv();if(s&&!s.visited){s.visited=true;try{const w=RO().owW();if(!w.pins.includes('base'))w.pins.push('base');RO().owPins();HT.Jobs.api.feed('Fort Sensible added to the map · fast travel from the minivan','info')}catch(_){}persist()}}
  else if(!inB)S.inBase=false;
  /* the gate guard's line */
  const g=S.people.guard;if(g&&g.d){const dg=Math.hypot(px-g.p.x,pz-g.p.z);if(dg<11&&!S.visitSaid){S.visitSaid=true;say('guard',a.CV&&a.CV.type==='tank'?pick(LINES.guardTank):pick(LINES.guard))}if(dg>40)S.visitSaid=false}
  /* range: free ammo on the line, the rental goes back when you leave, tips */
  const onR=B().armOk(px,pz);
  if(onR&&!a.CV&&RO().drawn)fillUp(a);
  if(S.rent&&(!onR||a.CV))rentReturn(a);
  const o=S.people.officer;if(o&&o.d&&onR){const dn=Math.hypot(px-o.p.x,pz-o.p.z);if(dn<9&&!S.said.hello){S.said.hello=1;say('officer',pick(LINES.hello))}
    S.tipT=(S.tipT||25)-dt;if(S.tipT<=0&&B().onLine(px,pz)&&!(S.course&&S.course.state!=='done')){S.tipT=35+Math.random()*20;say('officer',pick(LINES.tips))}}
  if(onR)teach(a,'draw','Fort Sensible range · 1 / 2 / 3 or Fire draws your gun · Right mouse aims · H holsters · free ammo on the line');
  courseTick(a,dt);drawBoard(false);
  /* the rental rack: models once HT.Guns has them, the highlight on the gun you mean */
  if(!S.rackG)rackGuns(a);if(S.rackG)S.rackG.visible=rackNear(a,RACK_SHOW);/* PERF-01: 0 draw calls away from the range (checked every frame, so a teleport can't leave it stale) */if(S.rackFr){const on=!S.menu&&!a.CV&&nearRack(a);S.rackFr.visible=on;if(on)S.rackFr.position.z=rackZ(rackPick(a))}
  if(S.menu&&(a.CV||!nearRack(a)))menuClose();
}
/* HUD (the 'hud' hook, only in the real frame): the course widgets, the last hit, the marker to the range officer on the first visit, the objective on the post */
function hudPart(st){const a=A();if(!a||!st||a.mode!=='hub'||!B()||!B().def()||!S.root)return;const P=a.P,px=P.pos.x,pz=P.pos.z,inB=B().inBase(px,pz),o=S.people.officer;
  {if(S.course&&S.course.state!=='done'){const c=S.course;st.widgets=st.widgets||[];
      st.widgets.push({id:'rangeT',kind:'timer',label:c.state==='count'?'Get ready':'Course',v:c.state==='count'?Math.max(0,c.t):c.time});st.widgets.push({id:'rangeS',kind:'score',label:'Score',v:c.score});
      if(c.stage)st.meters=(st.meters||[]).concat([{id:'rangeStage',label:c.stage.def.label+' · '+(c.stageI+1)+'/'+STAGES.length,v:Math.max(0,c.stage.t),max:c.stage.def.t,style:'bar'}])}
    if(S.lastHit&&S.simT-S.lastHit.t<2.2){st.widgets=st.widgets||[];st.widgets.push({id:'rangeHit',kind:'combo',label:'Hit',v:1,sub:S.lastHit.text})}
    if(S.rent){const id=P.cur,am=P.ammo&&P.ammo[id],w=a.WEAPONS[id];if(w){st.widgets=st.widgets||[];st.widgets.push({id:'rental',kind:'score',label:'Rental · '+rackCls(id),v:am?am.mag:0,sub:w.name+(am?' · '+am.mag+' / '+am.res:'')})/* widgets are numbers; the words go in sub */}}
    const s=sv();if(inB&&o&&o.d&&s&&!s.met){st.markers=st.markers||[];st.markers.push({id:'rangeOfficer',kind:'obj',label:'Range officer',x:o.p.x,z:o.p.z,screen:a.project(o.p.x,2.2,o.p.z),edge:true,always:true})}
    if(inB&&!(a.CV&&a.CV.type==='jet')){const lines=[];if(a.CV&&a.CV.type==='tank')lines.push({text:'Tank: W/S · A/D on the spot · mouse turret · left click fires'});if(s&&!s.met)lines.push({text:'Talk to '+NAMES.officer+' at the range'});else lines.push({text:'Run the timed course · '+NAMES.officer});lines.push({text:'Rental rack: try any gun'});
      if(!(st.objective&&st.objective.title&&/Job|Objective/.test(st.objective.kicker||'')))st.objective={kicker:'Fort Sensible',title:'Public range',lines}}}}

function animate(a,d,dt,near){
  /* barrier: up when anybody (you, your car, the tank) is within 24 m */
  const bz=S.barrier;if(bz){const P=a.P,q=a.CV?a.CV.pos:P.pos,want=Math.hypot(q.x-bz.b.x,q.z-bz.b.z)<24?-1.35:0;bz.ang+=(want-bz.ang)*Math.min(1,dt*2.2);bz.arm.rotation.z=bz.ang}
  if(!near)return;
  /* the flag */
  const f=S.flag;if(f){const p=f.geo.attributes.position,b=f.base;for(let i=0;i<p.count;i++){const x=b[i*3],y=b[i*3+1],k=x/2.7;p.setZ(i,Math.sin(x*2.3-S.t*4.2+y*.6)*.16*k+Math.sin(x*5.1-S.t*7)*.03*k);p.setY(i,y-k*k*.18)}p.needsUpdate=true;f.geo.computeVertexNormals()}
  /* targets */
  for(const pl of S.plates){pl.ang+=((pl.down?-1.45:0)-pl.ang)*Math.min(1,dt*10);pl.g.rotation.z=pl.ang;if(pl.down&&!(S.course&&S.course.state!=='done')){pl.reT=(pl.reT||0)+dt;if(pl.reT>3){pl.down=false;pl.reT=0}}else pl.reT=0}
  for(const gg of S.gongs){gg.sv-=gg.swing*14*dt+gg.sv*1.4*dt;gg.swing+=gg.sv*dt;gg.g.rotation.z=gg.swing*.35}
  for(const p of S.pops){p.up+=((p.want>0?1:0)-p.up)*Math.min(1,dt*9);p.g.rotation.x=(-Math.PI/2+.05)*(1-p.up)}
  const m=S.mover;if(m){const lanes=d.range.lanes;if(m.active&&!m.hit){m.z+=m.dir*dt*5.2;if(m.z<lanes[0]-1){m.z=lanes[0]-1;m.dir=1}if(m.z>lanes[5]+1){m.z=lanes[5]+1;m.dir=-1}}m.g.position.z=m.z;m.mesh.rotation.x=m.hit?-1.2:0}
  /* people: idle, turn to the dad when he is near */
  for(const k in S.people){const pe=S.people[k];if(!pe.d)continue;const P=a.P,dx=P.pos.x-pe.p.x,dz=P.pos.z-pe.p.z,dd=Math.hypot(dx,dz);
    const want=dd<12?Math.atan2(dx,dz):pe.home.yaw;let df=want-pe.yaw;while(df>Math.PI)df-=6.283;while(df<-Math.PI)df+=6.283;pe.yaw+=df*Math.min(1,dt*3);pe.d.root.rotation.y=pe.yaw;
    if(dd<70)try{a.pose(pe.d,dt,{moving:false,aim:false})}catch(_){}
    if(k==='guard'&&dd<14&&a.CV){/* he waves the car through */try{const arm=pe.d.rb&&pe.d.rb.bones&&pe.d.rb.bones.Bip01_R_UpperArm;if(arm)arm.rotation.z+=Math.sin(S.t*6)*.4}catch(_){}}}}

/* ================= E prompts (HT.Base.on('interact')) ================= */
function interact(prompt){const a=A();if(!a||a.mode!=='hub'||a.CV||!B().def())return null;const d=B().def(),P=a.P,px=P.pos.x,pz=P.pos.z;
  if(S.card)return{txt:'Close the results',fn:()=>closeCard()};
  if(S.menu)return null;
  if(nearRack(a)){const i=rackPick(a),id=RACK_IDS[i];return{txt:'Take '+gunName(id)+' · '+rackCls(id)+' (rack menu)',fn:()=>menuOpen(a,i)}}/* before the early return: with a rental drawn the game has its own prompt up */
  if(prompt)return null;
  const o=S.people.officer;if(o&&Math.hypot(px-o.p.x,pz-o.p.z)<3.2){const s=sv();
    if(S.course&&S.course.state!=='done')return null;
    return{txt:s&&!s.met?'Talk to '+NAMES.officer:'Run the timed course · '+gunName(P.cur),fn:()=>{const s2=sv();if(s2&&!s2.met){s2.met=true;persist();say('officer',"Sergeant Pruitt. Range officer. Here's the deal: free ammo on the line, rentals on the rack, and the course when you're ready. Talk to me again to run it.",true);
      teach(a,'met','Range: stand on the line (red stripe) and press 1 / 2 / 3 to draw · '+KE()+' at Sgt. Pruitt runs the course · '+KE()+' at the rack rents a gun');return}
      if(!B().onLine(px,pz)){/* step onto the line first */P.pos.x=Math.min(P.pos.x,d.range.line0.x1-.6)}courseStart(a)}}}
  return null}

/* ================= fire hook: count trigger pulls in a course, keep the muzzle downrange ================= */
/* answers undefined unless it blocks the shot (HT.Jobs keeps the first non-undefined answer) */
function onFire(){const a=A();if(!a||a.mode!=='hub'||a.CV)return;const P=a.P;if(!B()||!B().armOk(P.pos.x,P.pos.z))return;
  const fx=-Math.sin(P.yaw);/* west is -x: the muzzle must point within ~70 degrees of downrange */
  if(fx>-.35){S.aimT=(S.aimT||0);if(S.simT-S.aimT>4){S.aimT=S.simT;say('officer',pick(LINES.aim),true)}return true}
  const c=S.course;if(c&&c.state==='run'){const am=P.ammo[P.cur];if(am&&am.mag>0&&P.fireT<=0&&P.equipT<=0&&!P.rl){c.shots++;c.shot++}}}


/* ================= wiring ================= */
function hook(){const Jb=J(),Bs=B();if(!Jb||!Jb.on||!Bs||!Bs.on){setTimeout(hook,50);return}
  Jb.on('pose',()=>{try{tick()}catch(e){if(!S.err){S.err=1;console.warn('[range]',e)}}});/* 'pose' runs every frame and in __ht.step */
  Jb.on('hud',st=>{try{hudPart(st)}catch(e){if(!S.err2){S.err2=1;console.warn('[range] hud',e)}}});
  Jb.on('fire',()=>{try{return onFire()}catch(e){}});
  Bs.on('interact',p=>interact(p));Bs.on('reset',()=>reset())}
hook();
/* audit C-2: one clean slate (HT.Base.reset from index.html clearChars: quit to title, new game / continue, job start, home, the tow):
   the rental goes back on the rack (his own loadout comes back before anything saves), no course half-run, no card or rack menu open */
function reset(){const a=A();try{if(S.rent&&a)rentReturn(a,true)}catch(_){}S.rent=null;S.rentIdx=-1;S.course=null;S.lastHit=null;
  try{menuClose()}catch(_){}try{closeCard()}catch(_){}}
R.reset=reset;
/* test hooks (dev/base-check.js) */
R.start=()=>courseStart(A());R.showLast=()=>{if(S.course&&S.course.state==='done')showCard(A(),S.course)};R.state=()=>({course:S.course&&{state:S.course.state,stage:S.course.stageI,score:S.course.score,shots:S.course.shots,hitShots:S.course.hitShots,time:S.course.time,total:S.course.total,medal:S.course.medal},
  rent:S.rent&&{cur:A().P.cur},card:!!S.card,targets:S.targets.length,met:!!(sv()||{}).met});
R.targets=()=>S.targets;
})();
