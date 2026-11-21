/* =====================================================================
   HIGHER GROUND (SPEC3 2.8): overwatch. Doug's strand 2/2, set in Riverside.
   You're on the Community Center roof with Doug's father's hunting rifle and a bag of beanbags. Rosa and Gary walk
   Mr. Ferreira (who saw the Duke's crew stash the converters) from Rosa's garden to the church steps to give his statement.
   Read the street through the scope: spot (hold the scope on someone 0.6 s, "Doug: mark"), then beanbag, spook, or (it's
   allowed, and it costs) shoot for real. Kevin has a Super Soaker. Hold fire. The last threat is a car: tyres.

   The rifle is its own thing, not the game's hitscan: rounds fly (beanbag 125 m/s and dropping, live .308 820 m/s),
   the reticle has bean holdover marks, the scope breathes (inhale, exhale, a still pause at the bottom; Shift holds it),
   bracing on the parapet steadies it, and every shot kicks the sight picture.
   Shared helper: js/jobs/_escort.js (HT.Escort). Test player: test.step below; dev/jobs/overwatch.js for the shots.
   Owner rules: no family members in this job; failPolicy escalate; Riverside's change is people coming back and staying.
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;const prot=d=>!!(window.HT&&HT.People&&HT.People.isProtected&&HT.People.isProtected(d));const ES=()=>window.HT&&HT.Escort;
/* game surface this job needs beyond HT.Jobs.api (reported to the framework: pose, give/swap, hurtEnemy) */
const G=()=>window.__ht||{};
const pose=(d,dt,o)=>{const D=G().dude;if(D&&D.pose&&d)D.pose(d,dt,o)};
const AUD=()=>window.HT&&HT.Audio&&HT.Audio.init?HT.Audio:null;
const FX=()=>window.HT&&HT.FX&&HT.FX.ready?HT.FX:null;
const OWm=()=>window.HT&&HT.OpenWorld;

/* ---------------- tuning (seconds, metres, radians) ---------------- */
const TUNE={
  bean:{v:125,g:5.2,mag:5,res:15,name:'Beanbag'},live:{v:820,g:9.8,mag:5,res:5,name:'Live .308'},
  bolt:1.15,                 /* bolt cycle between shots */
  zoom:[3,6,10],baseFov:74,
  sway:{drift:.0021,breath:.0042,heart:.0005,stand:1,crouch:.62,brace:.34,move:2.2},
  breath:{inn:1.7,out:1.7,pause:1.0,hold:4.5,shake:1.8,recover:3},
  kick:.045,kickBack:5.5,
  markT:.6,kevinT:1.0,civT:.6,markLife:1e9,   /* Doug's mark lasts until the threat is handled (the Hawk perk later: 8 s through walls) */
  fuse:[6.5,5.5,5],fireGap:1.5,hitP:.42,dmg:13,coverMul:.6,pinLimit:30,
  spookR:2,spookP:.4,civNear:1.4,
  reveal:{alley:11,roof:20,court:0,car:0,dump:12,bus:16,steps:0},
  car:{speed:10.5,near:7.5,flatSlow:.55,stallFlats:2,tyreR:.42}};
const PIN_LIMIT=TUNE.pinLimit;

/* ---------------- the route: Rosa's garden gate -> north up the west sidewalk -> across Main St -> along the court -> the church ---------------- */
const ROUTE=[{x:411,z:85},{x:410.6,z:77},{x:407.2,z:75.6},{x:407.2,z:67.2},{x:407.2,z:49.4,stop:'the corner of Main St'},{x:407.2,z:39.4},
  {x:384.6,z:39.2,stop:'the end of the court'},{x:375.2,z:39.2},{x:351,z:39.2},{x:343.2,z:39.2},{x:333.6,z:38.6},{x:331.4,z:35.4}];
const STAGES=['ladder','garden','court','church','car'];
const LABELS={ladder:'Up the ladder',garden:'The garden gate',court:'Past the court',church:'To the church',car:'The car'};
const DESC={thug_hoodie:'grey hoodie',thug_track:'track jacket',thug_beanie:'beanie',thug_red:'red track top',thug_fro:'black jacket',thug_jacket:'brown jacket',thug_brown:'brown hoodie',
  thug_cap:'work shirt and cap',thug_f_hood:'black hoodie',thug_f_leather:'leather jacket',boss:'suit'};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const LINES={
  beanHit:["OW. Okay. Okay! I'm out. I'm SO out.","AAH. Who throws a beanbag?! From WHERE?","That's... a bean? I'm done. I'm done.","Ow, my everything. Fine. FINE."],
  gary:["Hi. I'll be your zip-tie technician today.","Zip-tie technician, coming through.","Please keep your hands where I can see them and your feet where they are.","Gary, Riverside Zip-Tie Services. How did we do today?"],
  mark:["Mark.","Marked.","Got him. Mark.","Mark. He's watching our guy, not the street."],
  civ:{gran:"Negative. That's Mrs. Alvarez. Those are groceries. Don't you dare.",marcus:"Umbrella. Not a rifle. It's not even raining, Marcus.",kenji:"Jogger. Friendly. Good form, actually.",phone:"Grey hoodie, phone... he's texting his mom. Friendly.",mei:"Bus stop. She's reading. Friendly.",lucia:"Friendly. That's Lucia from the laundromat."},
  spook:["Nope. Nope nope nope.","Somebody's shooting at me from GOD!","I'm going home. I live here. I'm going home."],
  lethal:["Rule one, Hawk.","Rule one. Hawk. RULE ONE.","...That's not what the beans are for. That's what the beans are INSTEAD of."],
  civScare:["Hawk! That's a civilian. Eyes, then trigger.","You just scared a neighbour half to death. Eyes first.","That was somebody's grandma. Eyes. Then trigger."],
  civYelp:["AY! Who's shooting?!","My groceries!","I'm calling the Gazette!","Not today! Not on my street!"],
  pin:["We're pinned! Hawk, do something!","Still pinned! He's got eyes on us!","Hawk, I'm not standing here all day!"],
  wit:["Is it bad that I'm enjoying this?","I'm eighty-one. My heart is doing a drum solo.","Forty years on this street. Never been this exciting."]};

/* ---------------- props (procedural, built once per job) ---------------- */
function mk(geo,col,o){const a=A(),m=new a.THREE.Mesh(geo,a.mat(col));if(o&&o.rough!=null&&m.material.roughness!=null)m.material.roughness=o.rough;m.castShadow=true;m.receiveShadow=true;return m}
function canvasTex(w,h,draw){const a=A(),c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new a.THREE.CanvasTexture(c);t.anisotropy=4;if(a.THREE.sRGBEncoding)t.encoding=a.THREE.sRGBEncoding;return t}
function labelPlate(text,bg,fg,w,h){const a=A(),T=a.THREE,tex=canvasTex(256,64,(g,W,H)=>{g.fillStyle=bg;g.fillRect(0,0,W,H);g.fillStyle=fg;g.font='bold 34px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,W/2,H/2+2)});
  const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tex,roughness:.8}));return m}
function dumpster(){const a=A(),T=a.THREE,g=new T.Group(),G_='#2d5b3e';
  const body=mk(new T.BoxGeometry(1.9,1.05,1.15),G_,{rough:.6});body.position.y=.62;g.add(body);
  for(const s of[-1,1]){const rib=mk(new T.BoxGeometry(.06,.9,1.18),'#264d35');rib.position.set(s*.62,.62,0);g.add(rib)}
  const lip=mk(new T.BoxGeometry(1.98,.07,1.22),'#23402e');lip.position.y=1.17;g.add(lip);
  for(const s of[-1,1]){const lid=mk(new T.BoxGeometry(.97,.05,1.2),'#1b1d20',{rough:.9});lid.position.set(s*.485,1.23,-.04);lid.rotation.x=-.06;g.add(lid);
    const pk=mk(new T.BoxGeometry(.18,.12,1.2),'#7c8288');pk.position.set(s*.55,.16,0);g.add(pk)}
  for(const[x,z]of[[-.8,-.45],[.8,-.45],[-.8,.45],[.8,.45]]){const w=mk(new T.CylinderGeometry(.07,.07,.06,10),'#111');w.rotation.x=Math.PI/2;w.position.set(x,.07,z);g.add(w)}
  const pl=labelPlate('RIVERSIDE SANITATION','#e9e4d4','#264d35',.9,.22);pl.position.set(0,.72,.581);g.add(pl);
  const pl2=pl.clone();pl2.rotation.y=Math.PI;pl2.position.z=-.581;g.add(pl2);return g}
function scarecrow(){const a=A(),T=a.THREE,g=new T.Group(),wood='#7a5a38';
  const post=mk(new T.CylinderGeometry(.05,.06,2.3,8),wood);post.position.y=1.15;g.add(post);
  const bar=mk(new T.CylinderGeometry(.04,.04,1.5,8),wood);bar.rotation.z=Math.PI/2;bar.position.y=1.62;g.add(bar);
  const plaid=canvasTex(64,64,(c,W,H)=>{c.fillStyle='#a3262a';c.fillRect(0,0,W,H);c.fillStyle='rgba(20,20,24,.55)';for(let i=0;i<W;i+=16){c.fillRect(i,0,6,H);c.fillRect(0,i,W,6)}c.fillStyle='rgba(240,220,160,.25)';for(let i=8;i<W;i+=16){c.fillRect(i,0,1,H);c.fillRect(0,i,W,1)}});
  plaid.wrapS=plaid.wrapT=T.RepeatWrapping;plaid.repeat.set(2,2);const shirtM=new T.MeshStandardMaterial({map:plaid,roughness:.95});
  const torso=new T.Mesh(new T.CylinderGeometry(.22,.26,.62,10),shirtM);torso.position.y=1.38;torso.castShadow=true;g.add(torso);
  for(const s of[-1,1]){const sl=new T.Mesh(new T.CylinderGeometry(.09,.11,.56,8),shirtM);sl.rotation.z=Math.PI/2;sl.position.set(s*.46,1.6,0);sl.castShadow=true;g.add(sl);
    for(let k=0;k<4;k++){const st=mk(new T.ConeGeometry(.018,.2,4),'#e2c25a');st.rotation.z=s*(Math.PI/2+(k-1.5)*.35);st.position.set(s*.8,1.6+(k-1.5)*.03,(k%2-.5)*.06);g.add(st)}}
  const jeans=mk(new T.CylinderGeometry(.24,.2,.5,10),'#3d5576');jeans.position.y=.92;g.add(jeans);
  const head=mk(new T.SphereGeometry(.2,14,10),'#c9a877',{rough:1});head.scale.set(1,1.1,.95);head.position.y=1.9;g.add(head);
  for(const s of[-1,1]){const e=mk(new T.CylinderGeometry(.03,.03,.02,10),'#111');e.rotation.x=Math.PI/2;e.position.set(s*.07,1.94,.19);g.add(e)}
  const sm=mk(new T.TorusGeometry(.07,.008,4,12,Math.PI),'#222');sm.rotation.z=Math.PI;sm.position.set(0,1.84,.195);g.add(sm);
  const brim=mk(new T.CylinderGeometry(.36,.36,.03,18),'#e2c25a',{rough:1});brim.position.y=2.07;g.add(brim);
  const crown=mk(new T.CylinderGeometry(.16,.2,.2,14),'#e2c25a',{rough:1});crown.position.y=2.17;g.add(crown);
  const band=mk(new T.CylinderGeometry(.205,.205,.05,14),'#a3262a');band.position.y=2.1;g.add(band);
  const sign=labelPlate('ROSA\'S GARDEN · NO CROWS','#f4efe2','#2f6b3a',.6,.15);sign.position.set(0,1.2,.27);g.add(sign);return g}
function ammoCan(col,text){const a=A(),T=a.THREE,g=new T.Group();const b=mk(new T.BoxGeometry(.42,.26,.2),col,{rough:.55});b.position.y=.13;g.add(b);
  const lid=mk(new T.BoxGeometry(.44,.045,.22),col);lid.position.y=.275;g.add(lid);const h=mk(new T.TorusGeometry(.06,.012,4,10,Math.PI),'#222');h.position.set(0,.3,0);g.add(h);
  const p=labelPlate(text,'#f1ead2','#1d1f22',.3,.08);p.position.set(0,.14,.101);g.add(p);return g}
function soaker(){const a=A(),T=a.THREE,g=new T.Group();
  const body=mk(new T.BoxGeometry(.09,.13,.5),'#3fd15a',{rough:.35});g.add(body);
  const tank=mk(new T.CylinderGeometry(.07,.07,.26,12),'#ff8a1e',{rough:.3});tank.rotation.x=Math.PI/2;tank.position.set(0,.12,.03);g.add(tank);
  const cap=mk(new T.CylinderGeometry(.04,.04,.03,10),'#2f63d9');cap.position.set(0,.2,.12);g.add(cap);
  const barrel=mk(new T.CylinderGeometry(.025,.03,.28,10),'#ffd23f');barrel.rotation.x=Math.PI/2;barrel.position.set(0,-.01,-.36);g.add(barrel);
  const pump=mk(new T.CylinderGeometry(.04,.04,.15,10),'#2f63d9');pump.rotation.x=Math.PI/2;pump.position.set(0,-.07,-.2);g.add(pump);
  const grip=mk(new T.BoxGeometry(.05,.14,.06),'#3fd15a');grip.position.set(0,-.12,.12);grip.rotation.x=.25;g.add(grip);return g}
function umbrella(){const a=A(),T=a.THREE,g=new T.Group();const c=mk(new T.CylinderGeometry(.045,.012,.82,10),'#16181c',{rough:.7});c.position.y=-.41;g.add(c);
  const tip=mk(new T.CylinderGeometry(.006,.006,.1,6),'#bbb');tip.position.y=-.86;g.add(tip);const sh=mk(new T.CylinderGeometry(.012,.012,.2,6),'#c8c8c8');sh.position.y=.05;g.add(sh);
  const hk=mk(new T.TorusGeometry(.05,.014,6,12,Math.PI),'#5a3a22');hk.position.set(.05,.15,0);g.add(hk);return g}
function bags(){const a=A(),T=a.THREE,g=new T.Group();const b=mk(new T.BoxGeometry(.26,.34,.17),'#c9a26a',{rough:1});b.position.y=-.2;g.add(b);
  const top=mk(new T.BoxGeometry(.27,.03,.18),'#b38d58');top.position.y=-.03;g.add(top);for(let i=0;i<3;i++){const l=mk(new T.CylinderGeometry(.012,.008,.18,5),'#4f8a3a');l.position.set(-.06+i*.05,.06,0);l.rotation.z=(i-1)*.3;g.add(l)}return g}
function phone(){const a=A(),T=a.THREE,g=new T.Group();const p=mk(new T.BoxGeometry(.075,.15,.012),'#121418');g.add(p);const s=new T.Mesh(new T.PlaneGeometry(.065,.13),new T.MeshBasicMaterial({color:0x8fc8ff}));s.position.z=.007;g.add(s);return g}
function binos(){const a=A(),T=a.THREE,g=new T.Group();for(const s of[-1,1]){const t=mk(new T.CylinderGeometry(.03,.035,.13,10),'#25282c');t.rotation.x=Math.PI/2;t.position.x=s*.04;g.add(t)}return g}
/* attach a prop to a hand (rocketbox bones live in their own scale: undo it) */
function toHand(d,obj,side,off){const rb=d&&d.rb,b=rb&&rb.bones&&rb.bones[side==='L'?'Bip01_L_Hand':'Bip01_R_Hand'];
  if(!b){if(d&&d.root){obj.position.set(side==='L'?.25:-.25,.9,0);d.root.add(obj)}return obj}
  b.updateMatrixWorld(true);const s=new (A().THREE.Vector3)();b.getWorldScale(s);const k=1/(s.x||1);obj.scale.multiplyScalar(k*(d.root.scale.x||1));
  if(off){obj.position.set(off[0]*k,off[1]*k,off[2]*k);if(off[3]!=null)obj.rotation.set(off[3],off[4]||0,off[5]||0)}b.add(obj);return obj}

/* ---------------- people ---------------- */
function dude(look){const a=A();let d=null;try{d=a.makeDude(look)}catch(e){d=null}if(!d)d=a.makeDude({shirt:'#777',pants:'#333'});a.scene.add(d.root);(M_().ow.meshes).push(d.root);return d}
function M_(){return A().M}
function castKeys(){return['rosa','nb_pops','nb_kid','nb_gran','nb_marcus','nb_kenji','nb_mei','thug_hoodie']}
function preloadCast(){const pp=window.HT&&HT.People;if(!pp||!pp.preload)return Promise.resolve();return Promise.race([pp.preload(castKeys().filter(k=>!pp.has||!pp.has(k))).catch(()=>{}),new Promise(r=>setTimeout(r,8000))])}

/* ---------------- geometry of the roof ---------------- */
/* the height of whatever is visibly under (x,z): a downward ray against the level's solid meshes (the open-world building masses
   are taller than a site's nominal roofY, so heights are measured, not assumed) */
const _dn={};function surfaceY(x,z,from,fallback){const a=A(),L=a&&a.L;if(!L||!L.solids||!a.THREE)return fallback;const T=a.THREE;if(!_dn.r)_dn.r=new T.Raycaster();
  _dn.r.set(new T.Vector3(x,from,z),new T.Vector3(0,-1,0));_dn.r.near=0;_dn.r.far=from+2;
  /* the drawn world, not just the shootable solids (the open-world building tops are drawn but not in L.solids); characters and our own props skipped */
  const list=[];a.scene.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||!o.visible||o.userData.hitbox||o.userData.ow)return;const bs=o.geometry&&(o.geometry.boundingSphere||(o.geometry.computeBoundingSphere(),o.geometry.boundingSphere));
    if(!bs)return;o.updateMatrixWorld();const c=bs.center.clone().applyMatrix4(o.matrixWorld),r=bs.radius*o.matrixWorld.getMaxScaleOnAxis();if(Math.hypot(c.x-x,c.z-z)<=r+.5)list.push(o)});
  const h=_dn.r.intersectObjects(list,false).find(h=>!(h.object.material&&h.object.material.transparent&&h.object.material.opacity<.5));return h?h.point.y:fallback}
let ROOFY=null,ROOFT=0,ROOFN=0;/* measured once the building's chunk is drawn; retried at most once a second */
function roofInfo(){const a=A(),s=a.WORLD&&a.WORLD.sites&&a.WORLD.sites.roof;if(!s)return null;const r=s.roof,b=s.building;
  if(ROOFY==null&&ROOFN<40&&Date.now()-ROOFT>1000){ROOFT=Date.now();ROOFN++;const ys=[[.3,.3],[.7,.5],[.5,.8],[.2,.7]].map(([u,v])=>surfaceY(r.x0+(r.x1-r.x0)*u,r.z0+(r.z1-r.z0)*v,20,null)).filter(y=>y!=null&&y>=s.roofY-.2&&y<s.roofY+2).sort((p,q)=>p-q);
    if(ys.length>=2)ROOFY=ys[Math.floor(ys.length/2)]}
  return{r,y:ROOFY!=null?ROOFY:s.roofY,par:s.parapet,ladder:s.ladder,bottom:{x:s.ladder.bottom.x+.4,z:s.ladder.bottom.z},top:{x:s.ladder.top.x-.3,z:s.ladder.top.z},b,
    doug:{x:r.x0+1.1,z:r.z0+.9},green:{x:r.x0+1.9,z:r.z0+.55},red:{x:r.x0+2.5,z:r.z0+.55},vantage:{x:r.x0+.75,z:r.z0+3.2}}}
/* stand on the roof: the building's collider becomes a 7 m floor, the parapet a wall; restored when you climb down or the job ends */
function roofOn(M,on){const a=A(),R=roofInfo(),L=a.L;if(!R||!L)return;const O=M.ow;
  if(on&&!O.roofCols){const b=R.b;O.bld=L.colliders.find(c=>(c.h==null||c.h>R.y)&&c.x0<=b.x0+.5&&c.x1>=b.x1-.5&&c.z0<=b.z0+.5&&c.z1>=b.z1-.5)||null;if(O.bld){O.bldH=O.bld.h;O.bld.h=R.y}
    const r=R.r,t=.3,H=R.y+2.2,cols=[[r.x0-t,r.z0-t,r.x1+t,r.z0],[r.x0-t,r.z1,r.x1+t,r.z1+t],[r.x0-t,r.z0,r.x0,r.z1],[r.x1,r.z0,r.x1+t,r.z1],
      ...ROOF_UNITS.map(u=>[u.x-u.w/2-.05,u.z-u.d/2-.05,u.x+u.w/2+.05,u.z+u.d/2+.05,R.y+u.h])];
    O.roofCols=cols.map(c=>{const o={x0:c[0],z0:c[1],x1:c[2],z1:c[3],h:c[4]||H};L.colliders.push(o);return o})}
  else if(!on&&O.roofCols){if(O.bld){if(O.bldH==null)delete O.bld.h;else O.bld.h=O.bldH;O.bld=null}for(const c of O.roofCols){const k=L.colliders.indexOf(c);if(k>=0)L.colliders.splice(k,1)}O.roofCols=null}}
/* the roof as the player sees it: the slab is the open-world building's top, so the parapet, the units and the hatch are dressed here */
const ROOF_UNITS=[{x:421.12,z:52.8,w:2.4,d:1.6,h:1.25,k:'ac'},{x:431.38,z:51.12,w:1.8,d:1.4,h:1.25,k:'ac'},{x:435.18,z:57.78,w:1.1,d:1.1,h:.45,k:'hatch'}];
function roofDress(M){const a=A(),T=a.THREE,R=roofInfo(),r=R.r,Y=R.y,g=new T.Group();const brick='#8d4a37',cap='#d9d4c8',P_=.82,t=.28;
  const bx=(w,h,d,col,x,y,z,o)=>{const m=mk(new T.BoxGeometry(w,h,d),col,o);m.position.set(x,y,z);g.add(m);return m};
  const x0=r.x0-.35,x1=r.x1+.35,z0=r.z0-.35,z1=r.z1+.35,W=x1-x0,D=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2;
  for(const[w,d,x,z]of[[W,t,cx,z0+t/2],[W,t,cx,z1-t/2],[t,D,x0+t/2,cz],[t,D,x1-t/2,cz]]){bx(w,P_,d,brick,x,Y+P_/2,z,{rough:.9});bx(w+.06,.07,d+.06,cap,x,Y+P_+.035,z,{rough:.6})}
  for(const u of ROOF_UNITS){if(u.k==='hatch'){bx(u.w,u.h,u.d,'#3b3f44',u.x,Y+u.h/2,u.z,{rough:.7});bx(u.w+.08,.06,u.d+.08,'#2a2d31',u.x,Y+u.h+.03,u.z);continue}
    bx(u.w,u.h,u.d,'#a9aeb2',u.x,Y+u.h/2,u.z,{rough:.45});bx(u.w-.3,.05,u.d-.3,'#3a3d41',u.x,Y+u.h+.025,u.z);
    for(let i=0;i<5;i++)bx(.04,u.h*.6,u.d+.01,'#8b9094',u.x-u.w/2+.3+i*(u.w-.6)/4,Y+u.h*.45,u.z);
    const fan=new T.Mesh(new T.CylinderGeometry(u.d*.28,u.d*.28,.04,18),a.mat('#2b2e32'));fan.position.set(u.x+u.w*.2,Y+u.h+.06,u.z);g.add(fan)}
  /* tar seams so the slab doesn't read as a white sheet */
  for(let i=1;i<6;i++){const s_=mk(new T.BoxGeometry(.06,.01,D-1),'#6d6b67');s_.position.set(x0+i*W/6,Y+.006,cz);g.add(s_)}
  g.traverse(o=>{o.userData.ow=1});a.wmAdd(g);M.ow.dress=g;M.ow.dressY=Y}
/* the roof height is measured once the building's chunk is in: if it changes after the props went up, move them with it */
function dressFollow(M){const O=M.ow,R=roofInfo();if(!R||O.dressY==null||Math.abs(R.y-O.dressY)<.01)return;const dy=R.y-O.dressY;O.dressY=R.y;for(const o of[O.dress,O.cans&&O.cans[0],O.cans&&O.cans[1]])if(o)o.position.y+=dy;if(O.roofCols){const b=O.bld;if(b)b.h=R.y}}
/* Doug's rifle: the roof gets one gun. The loadout you came with waits at the bottom of the ladder */
function borrowRifle(M){const a=A(),P=a.P,O=M.ow,H=G();if(O.borrowed||!H.give)return;
  O.borrowed={lo:Object.assign({},P.loadout),ammo:JSON.parse(JSON.stringify(P.ammo||{})),cur:P.cur};
  P.loadout.side=null;P.loadout.p1=null;P.loadout.p2=null;H.give('hunter',{mag:0,extra:0});syncRounds(M);
  O.hunterZoom=a.WEAPONS.hunter.ads.zoom}
function returnRifle(M){const a=A(),P=a.P,O=M&&M.ow,H=G();if(!O||!O.borrowed)return;const b=O.borrowed;O.borrowed=null;
  if(O.hunterZoom!=null)a.WEAPONS.hunter.ads.zoom=O.hunterZoom;
  P.loadout.p1=null;P.loadout.p2=null;P.loadout.side=null;
  for(const k of['side','p1','p2']){const id=b.lo[k];if(id&&H.give)H.give(id,{mag:0,extra:0})}
  for(const id in b.ammo)if(P.ammo[id])Object.assign(P.ammo[id],b.ammo[id]);if(P.ammo.hunter&&!Object.values(b.lo).includes('hunter'))delete P.ammo.hunter;
  if(H.swap&&b.cur&&P.weapons.includes(b.cur))H.swap(b.cur,true)}
/* the rifle's magazine is whichever box you loaded from: P.ammo.hunter points at it, so the game's R reload fills from the same box */
function syncRounds(M){const a=A(),P=a.P,R=M.ow.rifle;if(!P.ammo)return;P.ammo.hunter=R.box[R.type];P.rl=null}

/* ---------------- the job ---------------- */
J.register('overwatch',{
  def:{giver:'doug',hood:'river',title:'Higher Ground',role:'Doug · Strand 2/2 · Overwatch',place:'Community Center roof, Riverside',
    lines:["Mr. Ferreira saw the Duke's crew stash the converters. He'll say it on the record, at the church, today. Rosa and Gary are walking him there.",
      "You'll be on the Community Center roof with my father's rifle. Never fired it at a person. Today's not the day either. Beanbags are in the green box.",
      "Spot them first. Hold the scope on somebody and I'll tell you who they are. Then a bean, centre mass. Breathe in, breathe out, squeeze at the bottom."],
    obj:'From the roof, cover Rosa, Gary and the witness on their walk to the church. Spot threats, beanbag them, hold fire on anyone who isn\'t one.',
    crew:['doug','gary'],/* Rosa walks with the witness; she is built by this job (listing her here makes the start wait on her model) */weapons:['hunter','beanbag'],
    from:{place:'g_doug'},start:{place:'roof'},site:'roof',
    unlock:{done:['rosa']},
    pay:900,par:330,winTrust:6,
    stages:STAGES,stageLabels:LABELS,failPolicy:'escalate',
    medals:['Finished','All non-lethal','All non-lethal, Mr. Ferreira above 90'],
    order:30,
    radio:[['doug',"I'm already up top. Ladder's on the east wall. Mind the third rung, it's a little personal."]],
    endLine:"Mr. Ferreira gave his statement. Pastor Dee typed it up with two fingers, and the whole street knows Main St is walkable again."},

  start(M,o){const a=A(),R=roofInfo();M.ow={meshes:[],actors:[],threats:[],civs:[],proj:[],trails:[],waves:{},stats:{beaned:0,cuffed:0,lethal:0,spooked:0,civ:0,shots:0,hits:0,kevin:0,flats:0},
      rifle:{type:'bean',box:{bean:{mag:TUNE.bean.mag,res:TUNE.bean.res},live:{mag:TUNE.live.mag,res:TUNE.live.res}},boltT:0,zoomK:0,scopeT:0,kick:0,sw:{p:0,y:0},breath:{t:0,held:false,holdT:0,recover:0,left:1},heart:70,
        look:null,lookT:0,range:null,rangeT:0,braced:false},
      roof:{on:false,fade:0},say:{},stage:'ladder',sight:{done:false,t:0,shots:0},stopT:0,stopScoped:0,clearCalls:0,witHp:100,cast:false,castP:null,end:false,carT:0,lastPin:0};
    M.ow.castP=preloadCast().then(()=>{if(M.ow)M.ow.cast=true});
    /* the crew the brief lists are scripted here, not the follow-the-dad AI: take them out of the ally list */
    for(const al of a.allies.slice()){if(al.dude&&al.dude.root.parent)al.dude.root.parent.remove(al.dude.root);if(al.tag)al.tag.remove()}a.allies.length=0;a.rebuildTargets();
    props(M);roofDress(M);
    if(!o||!o.checkpoint){/* south of the ladder, facing it: the camera clears the car parked in the ring */a.P.pos.set(R.bottom.x-.4,0,R.bottom.z+4.2);a.P.yaw=0;a.P.pitch=.1;
      later(M,5,()=>{if(M.state==='go'&&!M.ow.roof.on)a.radio('doug',"Green box is beans, red box is the real thing. The red box stays closed unless I say so. Or a car does.")})}
    music('tension',.25)},

  upd(dt,M,F){const a=A(),O=M.ow,P=a.P,R=roofInfo();if(!O||!R)return;
    laterStep(dt,M);dressFollow(M);if(O.roof.fade>0)fadeStep(dt,M);
    if(O.roof.on){P.pos.y=Math.max(P.pos.y,R.y-.02);keepOnRoof(M)}
    rifleStep(dt,M);projStep(dt,M);dougStep(dt,M);propsStep(dt,M);
    if(O.esc){O.esc.step(dt,{threat:escortHeld(M),pose,face:threatFace(M)});wit(M)}
    civStep(dt,M);threatStep(dt,M,F);kevinStep(dt,M);carStep(dt,M);musicStep(M);garyWatch(M);
    stageStep(dt,M,F);
    hudFill(M,F)},

  camera(dt){const M=M_();return M&&M.ow?scopeCam(dt,M):false},
  fire(){const M=M_();if(!M||!M.ow||!M.ow.roof.on)return;shoot(M);return true},
  interact(prompt){const M=M_();return M&&M.ow?interactions(M):null},
  hud(st){const M=M_();if(M&&M.ow)hudHook(M,st)},

  save(M){const O=M.ow;return{st:O.stage,roof:O.roof.on?{x:+A().P.pos.x.toFixed(2),z:+A().P.pos.z.toFixed(2)}:null,esc:O.esc?O.esc.save():(O.escSaved||null),
      ammo:{type:O.rifle.type,bean:[O.rifle.box.bean.mag,O.rifle.box.bean.res],live:[O.rifle.box.live.mag,O.rifle.box.live.res]},stats:Object.assign({},O.stats),sight:O.sight.done?1:0,wit:O.witHp}},
  load(M,s){const O=M.ow;if(!s||!O)return;O.stage=s.st||'ladder';O.loadRoof=s.roof||null;O.escSaved=s.esc||null;O.witHp=s.wit!=null?s.wit:100;
    if(s.ammo){O.rifle.type=s.ammo.type==='live'?'live':'bean';O.rifle.box.bean.mag=s.ammo.bean[0];O.rifle.box.bean.res=s.ammo.bean[1];O.rifle.box.live.mag=s.ammo.live[0];O.rifle.box.live.res=s.ammo.live[1]}
    if(s.stats)Object.assign(O.stats,s.stats);O.sight.done=!!s.sight;O.pendingLoad=true},

  payout(M,ok){if(!ok||!M.ow)return[];const S=M.ow.stats,out=[];
    if(!S.lethal)out.push(['Bean counter · all non-lethal',300]);if(M.ow.witHp>=100)out.push(['Witness unscathed',150]);
    if(S.cuffed)out.push(['Zip-tied ×'+S.cuffed,0]);if(S.flats)out.push(['Tyres ×'+S.flats+' (Doug is paying for them)',0]);if(S.civ)out.push(['Spooked the neighbours ×'+S.civ,-25*S.civ]);return out},
  medal(M){const O=M.ow;if(!O)return 1;return O.stats.lethal?1:O.witHp>90?3:2},
  end(M,ok){returnRifle(M);if(!ok)return;const s=A().SV(),SV=window.HT&&HT.Save;
    if(SV&&s){try{SV.household(s,'ferreira')}catch(_){}try{SV.perk(s,'doug',true)}catch(_){}s.flags=s.flags||{};s.flags.ferreira=true}},

  test:{roof:()=>{const M=A().M;if(M&&M.ow){climb(M,true,true);M.ow.roof.fade=0}},friendly:()=>{const M=A().M;return!!(M&&M.ow&&friendlyInLine(M))},give(a){const H=G();preloadCast();if(H.openBridge)try{H.openBridge()}catch(_){}a.addTrust&&a.addTrust(30,'river')},
    step:(a,t,o)=>bot(a,t,o||{}),
    sample:()=>({ow:{stage:'court',rifle:{type:'bean',box:{bean:{mag:3,res:9},live:{mag:5,res:5}}},stats:{beaned:2,cuffed:2,lethal:0,spooked:0,civ:0,shots:3,hits:2,kevin:0,flats:0},sight:{done:true},roof:{on:false},
      witHp:87,esc:null,escSaved:{s:40.5,state:'walk',stopK:-1,stopsDone:[4],revived:0,hp:[100,87,100],fired:[0,0]}}})}
});

/* ---------------- stages ---------------- */
function stageStep(dt,M,F){const a=A(),O=M.ow,P=a.P,R=roofInfo();
  if(O.pendingLoad){O.pendingLoad=false;if(O.loadRoof){climb(M,true,true);P.pos.set(O.loadRoof.x,R.y,O.loadRoof.z)}if(O.stage!=='ladder')beginEscort(M,true)}
  if(M.exitOpen){if(O.roof.on)F.objs.push(['Climb down the ladder',false]);if(O.roof.on)F.target={x:R.top.x,z:R.top.z,label:'Ladder'};return}
  if(O.stage==='ladder'){
    if(!O.roof.on){F.objs.push(['Climb the ladder on the east wall',false]);F.target={x:R.bottom.x,z:R.bottom.z,label:'Ladder'};return}
    if(!O.sight.done){O.sight.t+=dt;F.objs.push(['Sight in: hit the scarecrow in Rosa\'s garden with a beanbag',false]);F.objs.push(['Right mouse: scope · Shift: hold breath · Z: zoom',false]);
      if(O.sight.t>40&&!O.sight.nag){O.sight.nag=1;say('doug',"Close enough. Rosa says they're moving. You'll learn on the job, like I did. Badly.",true);O.sight.done=true}
      return}
    if(O.sight.go==null)O.sight.go=3.2;
    O.sight.go-=dt;if(O.sight.go<=0&&!O.esc&&(O.cast||O.sight.go<-8))beginEscort(M,false);return}
  if(!O.esc)return;const E=O.esc;
  /* lines along the walk, by stage */
  const left=threatsLeft(M);
  F.objs.push([E.state==='done'?'Mr. Ferreira is at the church':'Cover the walk · '+Math.round(E.remaining())+' m to the church',false]);
  if(E.state==='stop'&&O.stage!=='car'){O.stopT+=dt;if(scoped(M))O.stopScoped+=dt;F.objs.push(['They\'re holding at '+(E.path[E.stopK].stop||'the corner')+'. Check the street, then radio "Clear" ('+(touch()?'USE':'E')+')',false]);
    if(!O.say['stop'+E.stopK]){O.say['stop'+E.stopK]=1;if(E.stopK===4)say('rosa',"We're stopping at the corner. Tell me it's clear. Don't just say 'probably'.",true);else say('rosa',"Holding at the end of the court. Talk to me, Hawk.",true)}
    if(O.stopT>28){say('rosa',"We can't stand on a corner all day, people will think we're selling something. Moving.",true);releaseStop(M)}}
  if(left.revealed.length)F.objs.push(['Threats on the walk · '+left.revealed.length,false,'warn']);
  if(E.pinT>0)F.objs.push(['Pinned · '+Math.ceil(PIN_LIMIT-E.pinT)+' s until Rosa calls it',false,'warn']);
  if(!O.roof.on)F.objs.push(['Get back up on the roof',false,'warn']);
  /* stage changes */
  const st=O.stage;
  if(st==='garden'&&E.stopsDone[4]){O.stage='court';a.CP.mark('court');wave(M,'court')}
  else if(st==='court'&&E.stopsDone[6]){O.stage='church';a.CP.mark('church');wave(M,'church')}
  else if(st==='church'&&E.s>=E.total-5.5&&!left.live.length){O.stage='car';a.CP.mark('car');wave(M,'car')}
  if(st==='car'&&O.carDone&&!left.live.length&&!O.end&&E.state==='done'){O.end=true;win(M)}
  /* fail states */
  if(E.pinT>=PIN_LIMIT)return a.endMission(false,"Rosa called it. Thirty seconds pinned behind a mailbox is thirty too many. Let's go again from the corner.","Pinned down.");
  if(E.pinT>8&&a.simT-O.lastPin>7){O.lastPin=a.simT;say('rosa',pick(LINES.pin),true)}}
function win(M){const a=A(),O=M.ow;music('victory',1);
  say('ferreira',"I've lived on this street forty years. That's the first time I've felt safe walking it.",false);
  later(M,3.5,()=>{say('doug',"Hawk out.");say('gary',"We're still not doing call signs.")});
  later(M,6.5,()=>{if(!O.stats.lethal){a.addTrust(8,'river');a.feed('All non-lethal','trust','+8 Riverside trust')}M.exitOpen=true;
    say('rosa',"He's inside. Pastor Dee's got a typewriter and a pot of coffee. Come down, Hawk.")})}
function releaseStop(M){const O=M.ow;if(O.esc&&O.esc.release()){O.stopT=0;O.stopScoped=0;return true}return false}
/* E actions: the ladder, the ammo boxes, the "Clear" call */
function interactions(M){const a=A(),O=M.ow,P=a.P,R=roofInfo();if(O.roof.fade>0)return null;
  if(!O.roof.on){if(Math.hypot(P.pos.x-R.bottom.x,P.pos.z-R.bottom.z)<1.8)return{txt:'Climb the ladder',hold:.7,fn:()=>climb(M,true)};return null}
  if(Math.hypot(P.pos.x-R.top.x,P.pos.z-R.top.z)<1.6&&(M.exitOpen||O.stage==='ladder'||!O.esc))return{txt:'Climb down',hold:.7,fn:()=>climb(M,false)};
  if(!scoped(M)&&Math.hypot(P.pos.x-R.green.x,P.pos.z-R.green.z)<1.5){const b=O.rifle.box.bean;if(b.res<TUNE.bean.res)return{txt:'Beanbags from the green box',fn:()=>{b.res=TUNE.bean.res;a.snd&&a.snd('cuff',.3);say('doug',"Take a handful. They're on the house. The house is my house.",true)}}}
  const E=O.esc;if(E&&E.state==='stop'&&O.stage!=='car')return{txt:'Radio Rosa: "Clear"',fn:()=>callClear(M)};
  return null}
function callClear(M){const a=A(),O=M.ow,E=O.esc;O.clearCalls++;const ahead=lurkersAhead(M),marked=ahead.filter(t=>t.marked);
  if(marked.length){say('you',"Clear.",true);say('rosa',"Your own marker says there's a guy ahead. Deal with him, then talk to me.",true);return}
  if(O.stopScoped<1.5&&O.stopT<4){say('you',"Probably.",true);say('rosa',"Unbelievable.",true)}
  else{say('you',pick(["Clear.","Clear. Go.","You're clear. Walk like you mean it."]),true);say('rosa',ahead.length?"Copy. Moving.":"Copy. Moving. Nice and boring.",true)}
  releaseStop(M)}
function beginEscort(M,fromLoad){const a=A(),O=M.ow,H=ES();if(O.esc||!H)return;
  const party=[{id:'rosa',side:.55,speed:1.25},{id:'ferreira',gap:1.3,side:-.15,speed:1.2,protect:true,hp:100},{id:'gary',gap:1.4,side:.45,speed:1.25}];
  const E=O.esc=H.create({path:ROUTE,party,speed:1.18,pinLimit:PIN_LIMIT,revives:1,reviveT:5,ground:(x,z)=>a.groundAt(x,z)});
  E.member('rosa').dude=dude({giver:'rosa'});E.member('ferreira').dude=dude({role:'neighbour',variant:'nb_pops',shirt:'#8a7a5a',pants:'#555'});E.member('gary').dude=dude(a.HOMIES.gary);
  for(const m of E.party){a.equip(m.dude,null)}
  const f=E.member('ferreira');toHand(f.dude,mkCane(),'R',[0,-.02,.03,0,0,0]);
  if(O.escSaved){E.load(O.escSaved);E.member('ferreira').hp=O.witHp}
  if(!fromLoad){O.stage='garden';a.CP.mark('garden');say('rosa',"Witness is moving. Rosa, Gary, one Mr. Ferreira. Eyes up, Hawk.",true);
    later(M,4.2,()=>{if(M.state==='go')say('ferreira',"Is that Doug up there? Hi, Doug!")});
    later(M,6.8,()=>{if(M.state==='go')say('doug',"Don't wave at the sniper, Mr. Ferreira.")})}
  wave(M,O.stage==='ladder'?'garden':O.stage)}
function mkCane(){const a=A(),T=a.THREE,g=new T.Group();const s=mk(new T.CylinderGeometry(.012,.012,.85,6),'#4a2f1c');s.position.y=-.4;g.add(s);const h=mk(new T.TorusGeometry(.045,.012,5,10,Math.PI),'#4a2f1c');h.position.set(.045,.02,0);g.add(h);return g}
/* the witness's health lives on the escort member; mirror it for the HUD and the checkpoint */
function wit(M){const O=M.ow,f=O.esc&&O.esc.member('ferreira');if(f)O.witHp=Math.max(0,Math.round(f.hp))}
function escortHeld(M){const O=M.ow;if(!O.roof.on&&O.stage!=='ladder')return true;
  for(const t of O.threats)if(t.st==='aim'||t.st==='fire'||t.st==='run'&&t.near)return true;
  if(O.kevin&&O.kevin.st==='aim')return true;return false}
function threatFace(M){const O=M.ow;const t=O.threats.find(t=>t.st==='aim'||t.st==='fire');return t?{x:t.e.pos.x,z:t.e.pos.z}:null}

/* ---------------- static props: dumpsters, the scarecrow, ammo boxes, Doug ---------------- */
function props(M){const a=A(),O=M.ow,R=roofInfo();
  const d1=dumpster();d1.position.set(403.4,a.groundAt(403.4,57.6),57.6);d1.rotation.y=Math.PI/2;a.wmAdd(d1,true);
  const d2=dumpster();d2.position.set(375.1,a.groundAt(375.1,34.2),34.2);d2.rotation.y=0;a.wmAdd(d2,true);
  O.dump=[{x:403.4,z:57.6,yaw:Math.PI/2},{x:375.1,z:34.2,yaw:0}];
  for(const d of O.dump){const yaw=d.yaw,c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw)),hx=.95*c+.58*s,hz=.95*s+.58*c;a.wmCol({x0:d.x-hx,z0:d.z-hz,x1:d.x+hx,z1:d.z+hz,h:1.3})}
  const sc=scarecrow();sc.position.set(411.6,a.groundAt(411.6,88.6),88.6);sc.rotation.y=Math.PI*.92;a.wmAdd(sc);O.scare={x:411.6,z:88.6,mesh:sc,wob:0};
  const g=ammoCan('#4c6a3a','BEANS');g.position.set(R.green.x,R.y,R.green.z);g.rotation.y=.2;a.wmAdd(g);const r=ammoCan('#8e2b26','LIVE · DAD');r.position.set(R.red.x,R.y,R.red.z);r.rotation.y=-.1;a.wmAdd(r);O.cans=[g,r];
  const db=dude(a.HOMIES.doug);a.equip(db,null);db.root.position.set(R.doug.x,R.y,R.doug.z);db.root.rotation.y=Math.PI*.78;O.doug={d:db,bin:toHand(db,binos(),'R',[.02,.05,.08,0,0,0])}}
function dougStep(dt,M){const O=M.ow,d=O.doug;if(!d)return;const R=roofInfo();d.d.root.position.set(R.doug.x,R.y,R.doug.z);
  /* Doug watches the walk through his binoculars */let t=O.esc&&O.esc.member('ferreira');const tx=t?t.pos.x:407,tz=t?t.pos.z:80;
  const yaw=Math.atan2(-(tx-R.doug.x),-(tz-R.doug.z));d.d.root.rotation.y=ES().turn(d.d.root.rotation.y-Math.PI,yaw,dt*3)+Math.PI;pose(d.d,dt,{moving:false,mode:'crouch',aim:false})}
function propsStep(dt,M){const O=M.ow;if(O.scare&&O.scare.wob>0){O.scare.wob-=dt;O.scare.mesh.rotation.z=Math.sin(O.scare.wob*18)*O.scare.wob*.25}}

/* ---------------- ladder (a short fade: the dad climbs, the camera doesn't need to watch) ---------------- */
function climb(M,up,instant){const a=A(),O=M.ow,P=a.P,R=roofInfo();
  if(instant){O.roof.on=up;roofOn(M,up);if(up){borrowRifle(M);P.pos.set(R.top.x,R.y,R.top.z)}else{returnRifle(M);P.pos.set(R.bottom.x,0,R.bottom.z)}return}
  O.roof.fade=1.1;O.roof.dir=up;O.roof.swapped=false;fadeEl(true);const Au=AUD();for(let i=0;i<6;i++)setTimeout(()=>{try{Au&&Au.footstep&&Au.footstep('metal',{vol:.5})}catch(_){}},i*140)}
function fadeStep(dt,M){const a=A(),O=M.ow,P=a.P,R=roofInfo();O.roof.fade-=dt;
  if(!O.roof.swapped&&O.roof.fade<.55){O.roof.swapped=true;const up=O.roof.dir;roofOn(M,up);O.roof.on=up;
    if(up){borrowRifle(M);P.pos.set(R.top.x,R.y,R.top.z);P.yaw=Math.PI/2;P.pitch=-.1;O.rifle.heart=112;P.crouch=false;
      if(!O.say.up){O.say.up=1;later(M,.5,()=>{say('doug',"My father's rifle. Never fired it at a person. Today's not the day either.",true);
        say('doug',"Scarecrow in Rosa's garden, south. Sight in on him. Orange marks are for the beans. They drop. Like my dreams.")})}}
    else{returnRifle(M);P.pos.set(R.bottom.x,0,R.bottom.z);P.pos.y=0;P.yaw=Math.PI/2}}
  if(O.roof.fade<=0){O.roof.fade=0;fadeEl(false)}}
let FADE=null;function fadeEl(on){if(!FADE){FADE=document.createElement('div');FADE.style.cssText='position:fixed;inset:0;background:#07090c;pointer-events:none;opacity:0;transition:opacity .45s;z-index:3'}
  if(on&&!FADE.isConnected)document.body.appendChild(FADE);FADE.style.opacity=on?'1':'0';if(!on)setTimeout(()=>{if(FADE&&FADE.style.opacity==='0'&&FADE.isConnected)FADE.remove()},600)}
function keepOnRoof(M){const a=A(),P=a.P,R=roofInfo().r;P.pos.x=clamp(P.pos.x,R.x0+.3,R.x1-.3);P.pos.z=clamp(P.pos.z,R.z0+.3,R.z1-.3)}

/* ---------------- the rifle: breath, sway, rounds, bolt, flight ---------------- */
function scoped(M){const a=A(),O=M.ow;return!!(O.roof.on&&O.roof.fade<=0&&a.P.aim&&a.P.cur==='hunter'&&!a.CV)}
function braced(M){const a=A(),P=a.P,R=roofInfo().r;if(!P.crouch)return false;return P.pos.x-R.x0<.95||R.x1-P.pos.x<.95||P.pos.z-R.z0<.95||R.z1-P.pos.z<.95}
function rifleStep(dt,M){const a=A(),O=M.ow,R=O.rifle,P=a.P,B=R.breath,T=TUNE.breath;
  R.boltT=Math.max(0,R.boltT-dt);R.kick*=Math.exp(-TUNE.kickBack*dt);R.heart+=(70-R.heart)*Math.min(1,dt*.12);if(P.moving)R.heart=Math.min(118,R.heart+dt*6);
  const sc=scoped(M);R.scopeT=clamp(R.scopeT+(sc?dt:-dt)/.22,0,1);
  /* breathing: in, out, a still pause at the bottom; Shift holds it (4.5 s steady, then it shakes, then you gasp) */
  const cyc=T.inn+T.out+T.pause;const want=sc&&(a.keys.shift||R.touchHold)&&B.recover<=0;
  if(want&&!B.held){B.held=true;B.holdT=0;R.touchHold=R.touchHold&&true}
  if(B.held){B.holdT+=dt;if(!want||B.holdT>T.hold+T.shake){B.held=false;R.touchHold=false;if(B.holdT>T.hold){B.recover=T.recover;gasp()}}}
  else{B.t=(B.t+dt)%cyc;B.recover=Math.max(0,B.recover-dt)}
  B.left=B.held?clamp(1-B.holdT/(T.hold+T.shake),0,1):B.recover>0?1-B.recover/T.recover:1;
  const ph=B.t;let br;if(ph<T.inn)br=smooth(ph/T.inn);else if(ph<T.inn+T.out)br=1-smooth((ph-T.inn)/T.out);else br=0;
  R.still=!B.held&&ph>=T.inn+T.out||B.held&&B.holdT<T.hold;R.braced=braced(M);
  const st=R.braced?TUNE.sway.brace:P.crouch?TUNE.sway.crouch:TUNE.sway.stand,ex=1+(R.heart-70)/45,rec=B.recover>0?1.6:1,mv=P.moving?TUNE.sway.move:1;
  let drift=TUNE.sway.drift*st*ex*rec*mv,bre=TUNE.sway.breath*st*rec;
  if(B.held){const over=Math.max(0,B.holdT-T.hold)/T.shake;drift*=.13+over*2.6;bre*=0;br=B.hb!=null?B.hb:br}else B.hb=br;
  if(R.still&&!B.held)drift*=.55;
  const t=a.simT,w=.85;let sp=drift*Math.sin(t*w*2)*.5+bre*br+drift*.25*Math.sin(t*3.1+1.3),sy=drift*Math.sin(t*w)+drift*.2*Math.sin(t*2.3);
  /* heartbeat: a small double tick */const hb=(t*R.heart/60)%1;sp+=TUNE.sway.heart*ex*(hb<.08?Math.sin(hb/.08*Math.PI):hb>.18&&hb<.24?.5*Math.sin((hb-.18)/.06*Math.PI):0);
  if(B.held&&B.holdT>T.hold){const k=(B.holdT-T.hold)/T.shake;sp+=Math.sin(t*23)*.0016*k;sy+=Math.sin(t*19+1)*.0016*k}
  R.sw.vp=(sp-R.sw.p)/Math.max(dt,1e-3);R.sw.vy=(sy-R.sw.y)/Math.max(dt,1e-3);R.sw.p=sp;R.sw.y=sy;
  /* sensitivity follows the zoom (the game scales look by the gun's ads.zoom) */
  if(O.roof.on)a.WEAPONS.hunter.ads.zoom=1.2/TUNE.zoom[R.zoomK];
  if(sc)rangeStep(dt,M);idStep(dt,M);lowerStep(dt,M)}
function smooth(x){x=clamp(x,0,1);return x*x*(3-2*x)}
function gasp(){const Au=AUD();try{Au&&Au.voice&&Au.voice('you','exhale')}catch(_){}}
function switchRounds(M){const a=A(),O=M.ow,R=O.rifle;if(!O.roof.on)return;R.type=R.type==='bean'?'live':'bean';syncRounds(M);R.boltT=Math.max(R.boltT,.9);
  const Au=AUD();try{Au&&Au.mech&&Au.mech('hunter','reload_out',{vol:.6});setTimeout(()=>{try{Au.mech('hunter','bolt',{vol:.6})}catch(_){}},420)}catch(_){}
  a.feed(R.type==='live'?'Live .308 loaded':'Beanbags loaded',R.type==='live'?'bad':'info');
  if(R.type==='live'&&!O.say.live&&O.stage!=='car'){O.say.live=1;say('doug',"Those are real. I'm not mad. I'm just watching very closely.",true)}}
function zoomStep(M,dir){const R=M.ow.rifle;R.zoomK=dir==null?(R.zoomK+1)%TUNE.zoom.length:clamp(R.zoomK+dir,0,TUNE.zoom.length-1);const Au=AUD();try{Au&&Au.ui&&Au.ui('tick')}catch(_){}}
/* the camera direction this frame (with sway and kick) */
function aimDir(M){const a=A(),P=a.P,R=M.ow.rifle,p=P.pitch+R.sw.p+R.kick,y=P.yaw+R.sw.y;return new (a.THREE.Vector3)(-Math.sin(y)*Math.cos(p),Math.sin(p),-Math.cos(y)*Math.cos(p))}
function eyePos(M){const a=A(),P=a.P;return new (a.THREE.Vector3)(P.pos.x,(P.visY!=null?P.visY:P.pos.y)+(P.crouch?1.15:1.62),P.pos.z)}
/* the scope's eye: on the roof the rifle rests on the parapet, so the sight sits over it, about 0.7 m ahead of the dad */
function sightPos(M){const a=A(),P=a.P,e=eyePos(M);if(!M.ow.roof.on)return e;e.x+=-Math.sin(P.yaw)*.7;e.z+=-Math.cos(P.yaw)*.7;e.y+=P.crouch?.08:0;return e}
function shoot(M){const a=A(),O=M.ow,R=O.rifle,P=a.P,box=R.box[R.type];
  if(R.boltT>0||P.rl||P.equipT>0||O.roof.fade>0)return;
  if(friendlyInLine(M)){holdFire(M);return}
  if(box.mag<=0){a.snd&&a.snd('click');R.boltT=.3;if(box.res>0&&G().reload)G().reload();else if(R.type==='bean'&&!O.say.empty){O.say.empty=1;say('doug',"Green box, Hawk. Next to me. Where it's been all day.",true)}return}
  box.mag--;R.boltT=TUNE.bolt;O.stats.shots++;
  const dir=aimDir(M),eye=sightPos(M),T=TUNE[R.type],sc=scoped(M);
  /* unscoped shots: hip spread */if(!sc){dir.x+=(Math.random()-.5)*.05;dir.y+=(Math.random()-.5)*.05;dir.z+=(Math.random()-.5)*.05;dir.normalize()}
  const mz=eye.clone().addScaledVector(dir,.9);
  const Au=AUD();try{if(Au)Au.gun(R.type==='bean'?'beanbag':'hunter',{cycle:true,vol:1});if(Au&&Au.mech)setTimeout(()=>{try{Au.mech('hunter','bolt',{vol:.55})}catch(_){}},420)}catch(_){}
  const F_=FX();if(F_){try{F_.muzzleFlash(mz,dir,{type:R.type==='bean'?'beanbag':'hunter',firstPerson:sc})}catch(_){}try{F_.shake(R.type==='bean'?.09:.16,{kick:.02})}catch(_){}}
  R.kick+=TUNE.kick*(R.type==='bean'?.7:1)*(R.braced?.65:1);
  const p={type:R.type,pos:eye.clone().addScaledVector(dir,.6),vel:dir.clone().multiplyScalar(T.v),g:T.g,t:0,trail:[],mesh:projMesh(R.type),near:new Set()};O.proj.push(p);
  /* the scarecrow and the live rounds tell Doug what kind of morning it is */
  if(R.type==='live'&&!O.say.liveShot&&O.stage!=='car'){O.say.liveShot=1}
}
function projMesh(type){const a=A(),T=a.THREE,g=new T.Group();
  const core=new T.Mesh(new T.SphereGeometry(type==='bean'?.09:.05,8,6),new T.MeshBasicMaterial({color:type==='bean'?0xff8a1e:0xffe6a0}));g.add(core);
  const tail=new T.Mesh(new T.CylinderGeometry(.0,type==='bean'?.07:.025,1,6,1,true),new T.MeshBasicMaterial({color:type==='bean'?0xffa040:0xfff0c0,transparent:true,opacity:.55,depthWrite:false}));tail.rotation.x=Math.PI/2;tail.position.z=.5;
  const tg=new T.Group();tg.add(tail);g.add(tg);g.userData.tail=tg;a.scene.add(g);return g}
const _ray={};
function projStep(dt,M){const a=A(),O=M.ow,T=a.THREE;if(!_ray.r)_ray.r=new T.Raycaster();
  for(let i=O.proj.length-1;i>=0;i--){const p=O.proj[i];p.t+=dt;const from=p.pos.clone();p.vel.y-=p.g*dt;const to=from.clone().addScaledVector(p.vel,dt);
    const hit=segHit(M,p,from,to);
    if(hit){p.pos.copy(hit.point);impact(M,p,hit);removeProj(p);O.proj.splice(i,1);continue}
    p.pos.copy(to);p.mesh.position.copy(to);const v=p.vel.clone().normalize();p.mesh.lookAt(to.clone().sub(v));const len=Math.min(p.type==='bean'?2.2:9,p.t*p.vel.length()*.5);p.mesh.userData.tail.scale.set(1,1,Math.max(.01,len));p.mesh.userData.tail.position.z=0;
    if(p.t>3||to.y<-5){removeProj(p);O.proj.splice(i,1)}}}
function removeProj(p){if(p.mesh&&p.mesh.parent)p.mesh.parent.remove(p.mesh)}
/* what a round meets between two points: threats (hitboxes), the car's tyres and body, the scarecrow, the world, the ground */
function segHit(M,p,from,to){const a=A(),O=M.ow,T=a.THREE,ray=_ray.r,dir=to.clone().sub(from),L=dir.length();if(L<1e-4)return null;dir.multiplyScalar(1/L);
  ray.set(from,dir);ray.near=0;ray.far=L;let best=null;const take=h=>{if(h&&(!best||h.distance<best.distance))best=h};
  const meshes=[],own=new Map();
  for(const t of O.threats){const e=t.e;if(!e||e.state==='dead'||e.state==='cuffed'||t.st==='gone'||prot(e.dude))continue;if(segDist(from,to,e.pos.x,(t.y||0)+1,e.pos.z)>3)continue;for(const m of e.dude.meshes){meshes.push(m);own.set(m,{kind:'threat',t})}}
  /* Kevin is never in this list: a child can't be hit by anything (owner rule), the round flies on to whatever is behind him */
  if(meshes.length){const h=ray.intersectObjects(meshes,false)[0];if(h){h.who=own.get(h.object);take(h)}}
  /* near misses: civilians flinch, threats might bolt */
  for(const c of O.civs){if(!c.d||c.gone)continue;const d=segDist(from,to,c.x,1,c.z);if(d<TUNE.civNear&&!p.near.has(c)){p.near.add(c);p.nearCiv=c}}
  for(const t of O.threats){if(!t.e||t.st==='gone'||t.e.state!=='idle')continue;const d=segDist(from,to,t.e.pos.x,(t.y||0)+1.3,t.e.pos.z);if(d<1.6&&!p.near.has(t)){p.near.add(t)}}
  /* the car */
  const C=O.car;if(C&&C.c&&!C.gone){const cr=carHit(M,from,dir,L);if(cr)take(cr)}
  /* the scarecrow (practice) */if(O.scare&&!O.sight.done){const sx=O.scare.x,sz=O.scare.z;const k=segCyl(from,dir,L,sx,sz,.33,.55,2.25);if(k!=null)take({distance:k,point:from.clone().addScaledVector(dir,k),who:{kind:'scare'}})}
  /* the world (not our own parapet: the barrel rests on it) */const sol=a.L&&a.L.solids;if(sol&&sol.length){const RI=roofInfo();for(const h of ray.intersectObjects(sol,false)){const q=h.point;
      if(RI&&q.y>RI.y-.3&&q.x>RI.r.x0-.6&&q.x<RI.r.x1+.6&&q.z>RI.r.z0-.6&&q.z<RI.r.z1+.6)continue;take(h);break}}
  const gy=a.groundAt(to.x,to.z);if(to.y<=gy&&from.y>gy){const k=(from.y-gy)/(from.y-to.y)*L;take({distance:k,point:from.clone().addScaledVector(dir,k),ground:true})}
  return best}
function segDist(a_,b_,x,y,z){const dx=b_.x-a_.x,dy=b_.y-a_.y,dz=b_.z-a_.z,l2=dx*dx+dy*dy+dz*dz||1;let t=((x-a_.x)*dx+(y-a_.y)*dy+(z-a_.z)*dz)/l2;t=clamp(t,0,1);return Math.hypot(a_.x+dx*t-x,a_.y+dy*t-y,a_.z+dz*t-z)}
function segCyl(o,d,L,cx,cz,r,y0,y1){/* vertical cylinder: first entry distance along the segment, or null */const ox=o.x-cx,oz=o.z-cz,A_=d.x*d.x+d.z*d.z,B=2*(ox*d.x+oz*d.z),C=ox*ox+oz*oz-r*r;if(A_<1e-8)return null;const D=B*B-4*A_*C;if(D<0)return null;
  const k=(-B-Math.sqrt(D))/(2*A_);if(k<0||k>L)return null;const y=o.y+d.y*k;return y>=y0&&y<=y1?k:null}
function impact(M,p,h){const a=A(),O=M.ow,F_=FX(),pt=h.point,who=h.who,dir=p.vel.clone().normalize();O.lastHit={k:who?who.kind:h.ground?'ground':'world',x:+pt.x.toFixed(1),y:+pt.y.toFixed(1),z:+pt.z.toFixed(1),t:+p.t.toFixed(2)};
  const Au=AUD();
  if(who&&who.kind==='threat'){hitThreat(M,who.t,p,h);try{F_&&F_.impact(pt,dir.clone().negate(),'cloth',{big:p.type==='live',color:p.type==='bean'?[1,.55,.15]:[.35,.45,.6]})}catch(_){}try{Au&&Au.impact(p.type==='bean'?'beanbag':'cloth',pt)}catch(_){}}
  else if(who&&who.kind==='scare'){O.scare.wob=1.2;O.sight.done=true;O.stats.hits++;try{F_&&F_.impact(pt,dir.clone().negate(),'wood',{color:[.9,.8,.4]})}catch(_){}
    const d=Math.round(Math.hypot(pt.x-a.P.pos.x,pt.z-a.P.pos.z));say('doug',p.type==='bean'?pick(["Sweet corn. You're zeroed.","Right in the flannel. "+ESw(d)+" metres, and you held over like you meant it.","Scarecrow's had a day. You're zeroed."]):"That was a live round into Rosa's scarecrow. She's going to want a word. You're zeroed, though.",true)}
  else if(who&&who.kind==='tyre'){tyre(M,who,p)}
  else if(who&&who.kind==='car'){try{F_&&F_.impact(pt,dir.clone().negate(),'metal',{})}catch(_){}try{Au&&Au.impact('metal',pt)}catch(_){}if(p.type==='bean'&&!O.say.beanCar){O.say.beanCar=1;say('doug',"Beans bounce off cars, Hawk. Red box. Tyres.",true)}}
  else{try{if(F_){if(h.object&&h.face)F_.hit(h,{big:p.type==='live'});else F_.impact(pt,new (a.THREE.Vector3)(0,1,0),h.ground?'dirt':'concrete',{big:p.type==='live'})}}catch(_){}try{Au&&Au.impact(h.ground?'dirt':'concrete',pt)}catch(_){}}
  /* a miss counts as a spook: anyone within 2 m of where it landed, or who heard it go past, might bolt */
  if(!(who&&who.kind==='threat')){for(const t of O.threats){if(!t.e||t.e.state!=='idle'||t.st==='gone'||t.st==='run'&&t.fled)continue;
      const d=Math.hypot(t.e.pos.x-pt.x,t.e.pos.z-pt.z);if(d<TUNE.spookR||p.near.has(t))spook(M,t)}}
  if(p.nearCiv||O.civs.some(c=>c.d&&!c.gone&&Math.hypot(c.x-pt.x,c.z-pt.z)<TUNE.civNear+.4))civScare(M,p.nearCiv||O.civs.find(c=>c.d&&!c.gone&&Math.hypot(c.x-pt.x,c.z-pt.z)<TUNE.civNear+.4));
  const OW_=OWm();if(OW_&&OW_.neighbourCower)try{OW_.neighbourCower(pt.x,pt.z,12)}catch(_){}}
function ESw(n){const H=ES();return H?H.words(n).replace(/^\w/,c=>c.toUpperCase()):String(n)}

/* ---------------- spotting (Doug IDs whoever you hold the scope on) ---------------- */
function idStep(dt,M){const a=A(),O=M.ow,R=O.rifle;if(!scoped(M)||R.scopeT<.8){R.look=null;R.lookT=Math.max(0,R.lookT-dt*2);return}
  const eye=sightPos(M),fw=aimDir(M);let best=null,ba=1e9;
  const cand=[];for(const t of O.threats)if(t.e&&t.st!=='gone'&&t.e.state!=='dead'&&t.e.state!=='cuffed')cand.push({o:t,kind:'threat',x:t.e.pos.x,y:(t.y||0)+1.1,z:t.e.pos.z});
  for(const c of O.civs)if(c.d&&!c.gone)cand.push({o:c,kind:'civ',x:c.x,y:(c.y||0)+1.1,z:c.z});
  if(O.kevin&&O.kevin.d&&O.kevin.st!=='gone')cand.push({o:O.kevin,kind:'kevin',x:O.kevin.x,y:.8,z:O.kevin.z});
  for(const c of cand){const dx=c.x-eye.x,dy=c.y-eye.y,dz=c.z-eye.z,d=Math.hypot(dx,dy,dz),dot=(dx*fw.x+dy*fw.y+dz*fw.z)/d;const ang=Math.acos(clamp(dot,-1,1)),lim=Math.max(.008,Math.atan(.6/d));if(ang<lim&&ang/lim<ba){ba=ang/lim;best=c}}
  if(best&&R.look&&R.look.o===best.o)R.lookT+=dt;else{R.look=best;R.lookT=best?dt:0}
  if(!best)return;const o=best.o,need=best.kind==='kevin'?TUNE.kevinT:best.kind==='civ'?TUNE.civT:TUNE.markT;R.need=need;
  if(R.lookT>=need){if(best.kind==='threat'&&!o.marked){o.marked=true;o.markedAt=a.simT;say('doug',o.st==='lurk'?pick(["He's not watching the street, he's watching our guy. Mark.","Mark. That one's waiting for something.","Hands in the hoodie, eyes on Ferreira. Mark."]):pick(LINES.mark),true);const Au=AUD();try{Au&&Au.ui&&Au.ui('mark')}catch(_){}}
    else if(best.kind==='civ'&&!o.ided){o.ided=true;say('doug',LINES.civ[o.line]||"Friendly.",true)}
    else if(best.kind==='kevin'&&!o.ided){o.ided=true;O.stats.kevin=1;say('doug',"That's a Super Soaker. That's Kevin. Hold fire. Kevin, go home.",true);later(M,1.6,()=>{say('kevin',"Aww.")});o.st='leave'}}}
function rangeStep(dt,M){const a=A(),O=M.ow,R=O.rifle;R.rangeT-=dt;if(R.rangeT>0)return;R.rangeT=.15;const T=a.THREE;if(!_ray.r)_ray.r=new T.Raycaster();
  const eye=sightPos(M),fw=aimDir(M);_ray.r.set(eye,fw);_ray.r.near=1;_ray.r.far=400;let d=null;const sol=a.L&&a.L.solids;if(sol){const h=_ray.r.intersectObjects(sol,false)[0];if(h)d=h.distance}
  if(fw.y<-.001){const k=(eye.y-a.groundAt(eye.x+fw.x*40,eye.z+fw.z*40))/-fw.y;if(k>0&&(d==null||k<d))d=k}
  if(R.look&&R.look.o){const o=R.look.o,x=o.e?o.e.pos.x:o.x,z=o.e?o.e.pos.z:o.z;d=Math.hypot(x-eye.x,z-eye.z)}R.range=d}

/* ---------------- waves ---------------- */
function wave(M,id){const a=A(),O=M.ow;if(O.waves[id])return;O.waves[id]=true;
  if(id==='garden'){threat(M,{id:'alley',x:401.9,z:58.7,yaw:-Math.PI/2,crouch:true,spot:'behind the dumpster in the alley',reveal:TUNE.reveal.alley,fuse:TUNE.fuse[0]});
    threat(M,{id:'roof',x:405.1,z:61.2,y:9.9,yaw:-Math.PI/2,spot:'on the rowhouse roof',reveal:TUNE.reveal.roof,fuse:TUNE.fuse[0]+1,phone:true});
    civ(M,{id:'gran',name:'Mrs. Alvarez',yelp:'My GROCERIES! Not the eggs! I just got the eggs!',key:'nb_gran',line:'gran',path:[{x:407.3,z:52},{x:407.3,z:66},{x:409,z:71.5},{x:418,z:72}],speed:.9,prop:'bags',delay:6});
    civ(M,{id:'mei',name:'Mei',yelp:"I'm calling the Gazette! Is there a Gazette? I'm calling it!",key:'nb_mei',line:'mei',path:[{x:403.2,z:46.9}],sit:true,yaw:0})}
  else if(id==='court'){threat(M,{id:'hoop',x:401,z:29.6,yaw:Math.PI*.15,spot:'by the hoop on the court',reveal:TUNE.reveal.court,fuse:TUNE.fuse[1],delay:5.5});
    kevin(M,{x:395.6,z:35.6,delay:5.5});
    civ(M,{id:'marcus',name:'Marcus',yelp:"HEY! I have an umbrella and I am NOT afraid to open it!",key:'nb_marcus',line:'marcus',path:[{x:366,z:38.8},{x:379,z:38.8},{x:383,z:38.8}],speed:1.05,prop:'umbrella',delay:3,alarm:"Long gun! Eleven o'clock, coming at us! ...Hawk?"});
    civ(M,{id:'kenji',name:'Kenji',yelp:"That was a personal best! You RUINED my personal best!",key:'nb_kenji',line:'kenji',path:[{x:440,z:47},{x:380,z:47},{x:340,z:47}],speed:2.8,delay:12})}
  else if(id==='church'){threat(M,{id:'dump2',x:375.4,z:32.3,yaw:Math.PI,crouch:true,spot:'behind the dumpster by the mart',reveal:TUNE.reveal.dump,fuse:TUNE.fuse[2]});
    threat(M,{id:'bus',x:322.2,z:39.4,yaw:-Math.PI/2,spot:'at the bus stop past the church',reveal:TUNE.reveal.bus,fuse:TUNE.fuse[2],sit:true});
    civ(M,{id:'phone',name:'Guy on the phone',yelp:"MOM. MOM, I'll call you back.",key:'thug_hoodie',role:'thug',line:'phone',path:[{x:368.5,z:38.4}],yaw:Math.PI*.9,prop:'phone'})}
  else if(id==='car'){O.carT=0;say('ferreira',"Steps. I made it to the steps. Somebody tell my wife.",true);
    later(M,2.6,()=>{say('doug',"Car! Grey sedan, coming up the east side. It's going to turn onto Main right under us. Fast.",true);say('doug',"Beans won't stop a car. Red box, Hawk. Tyres.",false);spawnCar(M)})}}
function threat(M,o){const a=A(),O=M.ow;const t=Object.assign({st:'pending',marked:false,y:o.y||0,t:0,fireT:0,seen:0},o);O.threats.push(t);if(!o.delay)spawnThreat(M,t);return t}
function spawnThreat(M,t){const a=A(),O=M.ow;if(t.e)return;if(t.y>1)t.y=surfaceY(t.x,t.z,t.y+6,t.y);const e=a.spawnEnemy(t.x,t.z,false);e.script={kind:'overwatch'};e.noLeash=true;e.hp=e.maxhp=75;e.yaw=t.yaw||0;a.equip(e.dude,null);e.gun=null;e.alert=false;
  e.pos.set(t.x,0,t.z);t.e=e;t.st='lurk';t.key=e.dude.rb&&e.dude.rb.key||'thug_hoodie';t.desc=DESC[t.key]||'hoodie';
  if(t.phone)t.prop=toHand(e.dude,phone(),'L',[.02,.06,.06,0,0,0]);
  if(e.tag){e.tag.remove();e.tag=null}a.rebuildTargets()}
function threatsLeft(M){const O=M.ow,live=[],revealed=[];for(const t of O.threats){if(t.st==='gone'||t.st==='pending'&&!t.e&&false)continue;const e=t.e;if(!e){if(t.st==='pending')live.push(t);continue}
  if(e.state==='idle'&&t.st!=='gone'){live.push(t);if(t.st==='aim'||t.st==='fire'||t.st==='run')revealed.push(t)}else if(e.state==='surrender')live.push(t)}return{live,revealed}}
function lurkersAhead(M){const O=M.ow,E=O.esc;if(!E)return[];return O.threats.filter(t=>t.e&&t.e.state==='idle'&&t.st==='lurk'&&E.near(t.e.pos.x,t.e.pos.z)<45)}
function threatStep(dt,M,F){const a=A(),O=M.ow,E=O.esc;
  for(const t of O.threats){if(t.st==='pending'){if(t.delay!=null){t.delay-=dt;if(t.delay<=0)spawnThreat(M,t)}continue}
    const e=t.e;if(!e)continue;t.t+=dt;
    if(e.state==='dead'){if(t.fled){t.st='gone';continue}if(!t.counted){t.counted=true;t.st='gone';O.stats.lethal++;a.addTrust(-10,'river');a.feed('Lethal force','bad','−10 Riverside trust');say('doug',pick(LINES.lethal),true);M.clean=false;gary(M,null)}poseAt(t,dt,{mode:'down'});continue}
    if(e.state==='cuffed'){if(!t.cuffed){t.cuffed=true;t.st='gone'}poseAt(t,dt,{mode:'kneel'});continue}
    if(e.state==='surrender'){if(!t.surr){t.surr=true;t.st='surr';O.stats.beaned+=t.bean?1:0;if(t.y>1){/* nobody goes up a roof for him: he sits tight till Dee's deacons fetch him */later(M,2.2,()=>{e.state='cuffed';O.stats.cuffed++;M.cuffs=(M.cuffs||0)+1;a.addTrust(4,'river');a.feed('He\'s staying put on that roof','trust','+4 Riverside trust');say('gary',"I'm not going up a roof. He can sit there and think about his choices. Deacon Lou's got a ladder.",true)})}else gary(M,t)}
      if(t.y)e.dude.root.position.y=t.y;continue}
    if(t.st==='run'){/* spooked: off down the street (the game's scripted mover), gone for good */if(t.t>9||!e.script){t.st='gone';vanish(e)}continue}
    if(t.st==='dash'){if(!e.script)e.script={kind:'overwatch'};continue}
    const wit=E&&E.member('ferreira'),wd=wit?Math.hypot(wit.pos.x-e.pos.x,wit.pos.z-e.pos.z):1e9;
    /* lurking: watching the witness, not the street (Doug's tell), crouched behind cover or on a roof */
    if(t.st==='lurk'){if(wit){const yaw=Math.atan2(-(wit.pos.x-e.pos.x),-(wit.pos.z-e.pos.z));e.yaw=ES().turn(e.yaw,yaw,dt*2)}
      poseAt(t,dt,{mode:t.crouch?'crouch':t.sit?'sit':'stand',aim:false});
      if(E&&(t.reveal===0||wd<t.reveal)&&E.state!=='stop')reveal(M,t);else if(E&&t.reveal>0&&E.state==='stop'&&wd<t.reveal*.8)reveal(M,t);continue}
    if(t.st==='aim'||t.st==='fire'){if(wit){const yaw=Math.atan2(-(wit.pos.x-e.pos.x),-(wit.pos.z-e.pos.z));e.yaw=ES().turn(e.yaw,yaw,dt*5)}
      poseAt(t,dt,{mode:t.crouch&&t.t<.6?'crouch':'stand',aim:true,pitch:t.y?-.35:0});
      t.fuseT=(t.fuseT||0)+dt;if(t.st==='aim'&&t.fuseT>=t.fuse){t.st='fire';t.fireT=0;say('rosa',"He's shooting! Down, down, DOWN!",true)}
      if(t.st==='fire'){t.fireT-=dt;if(t.fireT<=0){t.fireT=TUNE.fireGap*(.85+Math.random()*.3);enemyShot(M,t,wit)}}
      /* Doug repeats the callout if you haven't found him */
      if(!t.marked&&t.fuseT>3.5&&!t.recall){t.recall=1;callout(M,t,true)}}}}
function garyWatch(M){const O=M.ow;if(!O.esc||O.garyBusy)return;const t=O.threats.find(t=>t.e&&t.e.state==='surrender'&&!(t.y>1));if(t)gary(M,t)}
function musicStep(M){const O=M.ow,hot=O.threats.some(t=>t.e&&t.e.state==='idle'&&(t.st==='aim'||t.st==='fire'||t.st==='dash'))||O.car&&!O.car.done;const want=hot?'combat':'tension';if(O.mus!==want&&!O.end){O.mus=want;music(want,hot?.7:.3)}}
function poseAt(t,dt,o){const e=t.e;e.dude.root.position.set(e.pos.x,(t.y||0)+(e.state==='dead'?0:0),e.pos.z);e.dude.root.rotation.y=e.yaw;pose(e.dude,0,o)}
function reveal(M,t){const a=A(),O=M.ow,e=t.e;t.st='aim';t.fuseT=0;a.equip(e.dude,'pistol');e.gun='pistol';if(t.prop&&t.prop.parent)t.prop.parent.remove(t.prop);t.sit=false;music('combat',.6);callout(M,t,false)}
function callout(M,t,again){const a=A(),O=M.ow,H=ES(),P=a.P,e=t.e;const d=Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z);
  const txt=H.callout({clock:H.clock(P.pos.x,P.pos.z,P.yaw,e.pos.x,e.pos.z),desc:t.desc,spot:t.spot,dist:d});
  say('doug',(again?'Still there! ':'')+txt+(t.marked||again?'':pick([' Hold... beanbag him.',' Drawing on our guy.',' He\'s got a piece.'])),true)}
function enemyShot(M,t,wit){const a=A(),O=M.ow,E=O.esc,e=t.e;if(!wit||!E)return;const from=new (a.THREE.Vector3)(e.pos.x,(t.y||0)+1.4,e.pos.z);
  const cover=E.state==='hold'?TUNE.coverMul:1,hit=Math.random()<TUNE.hitP*cover;
  const to=new (a.THREE.Vector3)(wit.pos.x+(hit?0:(Math.random()-.5)*3),hit?1.1:.4+Math.random()*1.2,wit.pos.z+(hit?0:(Math.random()-.5)*3));
  const F_=FX();try{F_&&F_.tracer(from,to,{enemy:true});F_&&F_.muzzleFlash(from.clone().addScaledVector(to.clone().sub(from).normalize(),.6),to.clone().sub(from).normalize(),{type:'enemy'})}catch(_){}
  const Au=AUD();try{Au&&Au.gun('pistol',{pos:from,vol:.8,cycle:false})}catch(_){}
  const OW_=OWm();if(OW_&&OW_.neighbourCower)try{OW_.neighbourCower(e.pos.x,e.pos.z,35)}catch(_){}
  if(hit){const r=E.hit('ferreira',TUNE.dmg);wit;O.witHp=Math.max(0,Math.round(E.member('ferreira').hp));a.feed('Mr. Ferreira is hit','bad',O.witHp+' HP');
    if(r==='down'){say('rosa',"He's down! I've got him, I've got him. Hawk, CLEAR THAT SHOOTER.",true);say('ferreira',"...I'm fine. I'm fine. I've had worse at bingo.")}
    else if(r==='dead'){a.endMission(false,"Mr. Ferreira went down and stayed down. Rosa got him to the clinic; he'll make it, but the statement won't happen today.","The witness is hurt.")}
    else if(Math.random()<.3)say('ferreira',pick(["Ow! That's my good arm!","I'm okay! It grazed my cardigan!"]))}}
function spook(M,t){const a=A(),O=M.ow,e=t.e;if(t.spookTried)return;t.spookTried=true;
  if(Math.random()<TUNE.spookP||t.forceSpook){t.st='run';t.fled=true;t.t=0;const to=fleeTo(t);a.equip(e.dude,null);e.gun=null;e.script={kind:'to',x:to.x,z:to.z,speed:5.4,then:()=>{t.st='gone';vanish(e)}};O.stats.spooked++;say(cap(t.desc||'Hoodie'),pick(LINES.spook),true);later(M,1.4,()=>{say('doug',"He's gone. Spooked counts. Doesn't count for much.")})}
  else{/* ducks, then comes back up: the fuse gets three seconds longer */t.fuseT=Math.max(0,(t.fuseT||0)-3);if(t.st==='fire'){t.st='aim'}say('doug',"Close. He ducked. He's still there.",true)}}
function fleeTo(t){const e=t.e;const opts=[{x:e.pos.x+30,z:e.pos.z},{x:e.pos.x-30,z:e.pos.z},{x:e.pos.x,z:e.pos.z-25},{x:e.pos.x,z:e.pos.z+25}];const a=A();return opts.find(p=>a.walkable(a.tx(p.x),a.tx(p.z)))||opts[0]}
function vanish(e){const a=A();e.script={kind:'incar'};e.state='dead';e.hp=0;if(e.dude.root.parent)e.dude.root.parent.remove(e.dude.root);const k=a.enemies.indexOf(e);if(k>=0)a.enemies.splice(k,1);a.rebuildTargets()}
function hitThreat(M,t,p,h){const a=A(),O=M.ow,e=t.e,head=!!(h.object&&h.object.userData&&h.object.userData.head),H=G();O.stats.hits++;
  if(p.type==='bean'){t.bean=true;if(e.state==='idle'){a.equip(e.dude,null);if(H.hurtEnemy)H.hurtEnemy(e,999,'player',{nonlethal:true,head,gun:'beanbag'});if(e.state==='idle')a.surrender(e);
      later(M,0.35,()=>{say(cap(t.desc||'Hoodie'),pick(LINES.beanHit),true)});if(head&&!O.say.face){O.say.face=1;later(M,1.5,()=>{say('doug',"Centre mass with the beans, Hawk. Not the face. He's got a face.",true)})}}}
  else{if(H.hurtEnemy)H.hurtEnemy(e,999,'player',{gun:'hunter',head});else{e.state='dead'}}}
/* Gary jogs over and zip-ties anyone who gave up on the street (the chain waits a beat while he's gone) */
function gary(M,t){const a=A(),O=M.ow,E=O.esc;if(!E||!t)return;const g=E.member('gary');O.cuffQ=O.cuffQ||[];if(!O.cuffQ.includes(t))O.cuffQ.push(t);if(O.garyBusy)return;garyNext(M)}
function garyNext(M){const a=A(),O=M.ow,E=O.esc,g=E.member('gary');O.garyBusy=false;const t=(O.cuffQ||[]).shift();if(!t){E.rejoin('gary');return}O.garyBusy=true;
  const e=t.e;if(e.state!=='surrender'){garyNext(M);return}
  E.detach('gary',{x:e.pos.x+.7,z:e.pos.z+.4},3.6,()=>{if(A().M!==M)return;if(e.state==='surrender'){e.state='cuffed';if(e.tag){e.tag.remove();e.tag=null}O.stats.cuffed++;M.cuffs=(M.cuffs||0)+1;a.addTrust(4,'river');a.snd&&a.snd('cuff');a.feed('Zip-tied','trust','+4 Riverside trust');say('gary',pick(LINES.gary),true)}
    later(M,0.7,()=>{garyNext(M)})})}

/* ---------------- Kevin, his Super Soaker, and the neighbours ---------------- */
function kevin(M,o){const O=M.ow;O.kevin={x:o.x,z:o.z,st:'pending',delay:o.delay,t:0,ided:false}}
function kevinStep(dt,M){const a=A(),O=M.ow,K=O.kevin;if(!K||K.st==='gone')return;
  if(K.st==='pending'){K.delay-=dt;if(K.delay>0)return;K.d=dude({role:'neighbour',variant:'nb_kid',shirt:'#3a7bd5',pants:'#444'});K.d.protected=true;a.equip(K.d,null);
    const toy=soaker();if(K.d.gunHold){K.d.gunHold.add(toy);toy.position.set(0,.02,-.05)}else toHand(K.d,toy,'R');K.st='aim';K.t=0;
    later(M,0.5,()=>{if(K.st==='aim'){say('kevin',"Pew! Pew pew! PEW!",true);say('rosa',"Contact! Small guy, behind the fence, he's pointing something at Gary!",true)}})}
  K.t+=dt;const E=O.esc,g=E&&E.member('gary');
  if(K.st==='aim'){const tx=g?g.pos.x:K.x,tz=g?g.pos.z:K.z+5;const yaw=Math.atan2(-(tx-K.x),-(tz-K.z));K.d.root.position.set(K.x,a.groundAt(K.x,K.z),K.z);K.d.root.rotation.y=yaw+Math.PI;pose(K.d,dt,{aim:true,moving:false});
    if(K.t>22){K.st='leave';say('gary',"Kevin? Kevin, is that you? Go home, buddy. Tell your mom I said hi.",true);later(M,1.5,()=>{say('kevin',"Aww.")})}}
  else if(K.st==='leave'){K.x+=-1.6*dt*1.3;K.z-=1.6*dt*.4;K.d.root.position.set(K.x,a.groundAt(K.x,K.z),K.z);K.d.root.rotation.y=Math.atan2(1.3,.4)+Math.PI;pose(K.d,dt,{moving:true,speed:1.1,aim:false});if(K.t>30||K.x<380){K.st='gone';if(K.d.root.parent)K.d.root.parent.remove(K.d.root)}}}
/* owner rule: a child can never be shot. Any shot whose line passes within KID_R m of Kevin is refused: the dad lowers the rifle
   (the scope drops) and Doug says so. The scope labels him FRIENDLY · HOLD FIRE whenever he's in the lens. */
const KID_R=3;
function friendlyInLine(M){const O=M.ow,K=O.kevin;if(!K||!K.d||K.st==='gone'||K.st==='pending')return false;
  const eye=sightPos(M),dir=aimDir(M),to=eye.clone().addScaledVector(dir,400);return segDist(eye,to,K.x,.8,K.z)<KID_R||segDist(eye,to,K.x,1.4,K.z)<KID_R}
function holdFire(M){const a=A(),O=M.ow,R=O.rifle;R.lowerT=1.2;R.boltT=Math.max(R.boltT,.5);a.P.aim=false;O.stats.holdFire=(O.stats.holdFire||0)+1;
  if(!O.say.hold||a.simT-O.say.hold>6){O.say.hold=a.simT;say('doug',O.kevin&&O.kevin.ided?"That's Kevin. Rifle down, Hawk. Not even close to him.":"Rifle down. That's a kid. Hold fire.",true)}
  a.feed('Friendly · hold fire','info','A kid is in the line of fire')}
function lowerStep(dt,M){const a=A(),R=M.ow.rifle;if(R.lowerT>0){R.lowerT-=dt;a.P.aim=false}
  /* resting the crosshair on Kevin for a moment lowers the rifle too */
  if(scoped(M)&&friendlyInLine(M)){R.onKid=(R.onKid||0)+dt;if(R.onKid>1.4){R.onKid=0;holdFire(M)}}else R.onKid=0}
function civ(M,o){const O=M.ow;const c=Object.assign({x:o.path[0].x,z:o.path[0].z,k:0,t:0,st:'pending',d:null},o);O.civs.push(c);return c}
function civStep(dt,M){const a=A(),O=M.ow;for(const c of O.civs){if(c.gone)continue;
    if(c.st==='pending'){c.delay=(c.delay||0)-dt;if(c.delay>0||!O.cast&&c.delay>-4)continue;c.d=dude({role:c.role||'neighbour',variant:c.key,shirt:'#9a8',pants:'#444'});a.equip(c.d,null);
      if(c.prop==='bags')toHand(c.d,bags(),'L',[0,-.05,.05,0,0,0]);else if(c.prop==='umbrella')toHand(c.d,umbrella(),'R',[0,0,.02,0,0,0]);else if(c.prop==='phone')toHand(c.d,phone(),'R',[.02,.06,.06,0,0,0]);
      c.st='go';if(c.alarm)later(M,2.5,()=>{if(!c.ided&&!c.gone)say('rosa',c.alarm,true)})}
    c.t+=dt;let moving=false,speed=c.speed||1;
    if(c.st==='flee'){const dx=c.fx-c.x,dz=c.fz-c.z,d=Math.hypot(dx,dz);if(d<.6||c.t>8){c.gone=true;if(c.d.root.parent)c.d.root.parent.remove(c.d.root);continue}c.x+=dx/d*4.6*dt;c.z+=dz/d*4.6*dt;c.yaw=Math.atan2(-dx,-dz);moving=true;speed=1.7}
    else if(c.path.length>1&&c.k<c.path.length-1){const p=c.path[c.k+1],dx=p.x-c.x,dz=p.z-c.z,d=Math.hypot(dx,dz);if(d<.3)c.k++;else{const s=Math.min(d,speed*dt);c.x+=dx/d*s;c.z+=dz/d*s;c.yaw=Math.atan2(-dx,-dz);moving=true}}
    else if(c.yaw==null)c.yaw=0;
    c.d.root.position.set(c.x,a.groundAt(c.x,c.z),c.z);c.d.root.rotation.y=(c.yaw||0)+Math.PI;pose(c.d,dt,{moving,speed:Math.max(.7,speed/1.2),aim:false,mode:c.sit&&!moving?'sit':'stand'})}}
function civScare(M,c){const a=A(),O=M.ow;if(!c||c.scared)return;c.scared=true;O.stats.civ++;a.addTrust(-2,'river');say(c.name||'Neighbour',c.yelp||pick(LINES.civYelp),true);later(M,0.9,()=>{say('doug',pick(LINES.civScare),true)});
  c.st='flee';c.t=0;c.fx=c.x+(Math.random()<.5?-1:1)*18;c.fz=c.z+(Math.random()<.5?-1:1)*6;if(!a.walkable(a.tx(c.fx),a.tx(c.fz))){c.fx=c.x;c.fz=c.z+(c.z<45?-14:14)}}

/* ---------------- the car: a grey sedan down Main St, tyres are the hit zones (computed from the car pose here) ---------------- */
function spawnCar(M){const a=A(),O=M.ow,CA=a.CarAI();const pts=[{x:444.6,z:104},{x:444.6,z:52},{x:443.2,z:45.2},{x:439,z:41.8},{x:420,z:41.6},{x:380,z:41.6},{x:339,z:41.6}];
  const v=a.makeVehicle('sedan','#6d7379')||a.makeVanBox('#6d7379');a.wmAdd(v);let c;
  if(CA&&CA.make){c=CA.make('sedan',{x:pts[0].x,z:pts[0].z,yaw:0});CA.follow(c,pts,{speed:TUNE.car.speed,turnSpeed:5})}else c={x:pts[0].x,z:pts[0].z,yaw:Math.PI/2,spd:0,simple:true,pts,k:1};
  const ud=v.userData||{};O.car={c,v,flats:[0,0,0,0],wb:ud.wheelBase||2.7,wid:ud.wid||1.8,wr:ud.wheelRadius||.33,len:ud.len||4.6,t:0,stalled:false,done:false,bail:false};music('combat',.85)}
function wheels(C){const yaw=C.c.yaw,fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw),h=C.wb/2,w=C.wid/2*.92;
  return[[h,-w],[h,w],[-h,-w],[-h,w]].map(([f,s],i)=>({i,x:C.c.x+fx*f+rx*s,z:C.c.z+fz*f+rz*s,y:C.wr}))}
function carHit(M,from,dir,L){const O=M.ow,C=O.car;let best=null;
  for(const w of wheels(C)){/* tyres as spheres */const ox=from.x-w.x,oy=from.y-w.y,oz=from.z-w.z,b=ox*dir.x+oy*dir.y+oz*dir.z,c=ox*ox+oy*oy+oz*oz-TUNE.car.tyreR*TUNE.car.tyreR,D=b*b-c;if(D<0)continue;const k=-b-Math.sqrt(D);if(k<0||k>L)continue;
    if(!best||k<best.distance)best={distance:k,point:from.clone().addScaledVector(dir,k),who:{kind:'tyre',i:w.i}}}
  /* body: an oriented box, 1.45 m tall */const yaw=C.c.yaw,fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
  const tr=p=>({f:(p.x-C.c.x)*fx+(p.z-C.c.z)*fz,s:(p.x-C.c.x)*rx+(p.z-C.c.z)*rz,y:p.y});const o=tr(from),d={f:dir.x*fx+dir.z*fz,s:dir.x*rx+dir.z*rz,y:dir.y};
  let t0=0,t1=L;for(const[ax,lo,hi]of[['f',-C.len/2,C.len/2],['s',-C.wid/2,C.wid/2],['y',.25,1.45]]){if(Math.abs(d[ax])<1e-6){if(o[ax]<lo||o[ax]>hi)return best;continue}let a_=(lo-o[ax])/d[ax],b_=(hi-o[ax])/d[ax];if(a_>b_){const q=a_;a_=b_;b_=q}t0=Math.max(t0,a_);t1=Math.min(t1,b_);if(t0>t1)return best}
  if(!best||t0<best.distance-.05)best={distance:t0,point:from.clone().addScaledVector(dir,t0),who:{kind:'car'}};return best}
function tyre(M,w,p){const a=A(),O=M.ow,C=O.car,F_=FX(),Au=AUD();const pt=p.pos;
  if(p.type==='bean'){try{Au&&Au.impact('rubber',pt)}catch(_){}if(!O.say.beanTyre){O.say.beanTyre=1;say('doug',"Beans bounce off tyres. That's what tyres are for. Red box!",true)}return}
  if(C.flats[w.i])return;C.flats[w.i]=1;O.stats.flats++;try{F_&&F_.impact(pt,new (a.THREE.Vector3)(0,1,0),'dirt',{big:true,color:[.2,.2,.2]})}catch(_){}try{Au&&Au.impact('metal',pt)}catch(_){}
  a.feed('Tyre','info',C.flats.reduce((s,f)=>s+f,0)+' flat');const ud=C.v.userData||{};if(ud.wheels&&ud.wheels[w.i])ud.wheels[w.i].scale.y=.82;
  const n=C.flats.reduce((s,f)=>s+f,0);say('doug',n>=TUNE.car.stallFlats?"That's two. He's riding on rims. He's done.":"One. Again.",true)}
function carStep(dt,M){const a=A(),O=M.ow,C=O.car;if(!C||C.gone)return;C.t+=dt;const CA=a.CarAI(),c=C.c,n=C.flats.reduce((s,f)=>s+f,0),E=O.esc;
  if(!C.done){const ai=c.ai;if(ai){ai.speed=TUNE.car.speed*Math.pow(TUNE.car.flatSlow,n)*(c.x<360?.75:1)}
    if(n>=TUNE.car.stallFlats&&!C.stalled){C.stalled=true;say('Driver',"No no no no. Come on. COME ON.",true)}
    if(C.stalled){c.spd=Math.max(0,(c.spd||0)-9*dt);if(ai)ai.speed=0;c.yaw+=dt*.25*(c.spd>1?1:0)}
    else if(CA&&CA.step)CA.step(c,dt,{collide:(p,r)=>a.collide(p,r)});
    if(C.stalled&&c.spd<.3||!C.stalled&&c.x<=342){C.done=true;c.spd=0;carBail(M,!C.stalled)}}
  C.v.position.set(c.x,a.groundAt(c.x,c.z)-(n?.05*n:0),c.z);C.v.rotation.set(0,c.yaw+Math.PI/2,(C.flats[0]||C.flats[2]?-1:0)*.035+(C.flats[1]||C.flats[3]?1:0)*.035);
  const VM=window.HT&&HT.Vehicles;if(VM&&VM.update)try{VM.update(C.v,{speed:C.done?0:c.spd||0,steer:0,braking:C.stalled||C.done,headlights:false,dt})}catch(_){}
  if(C.done&&C.bailed&&O.threats.filter(t=>t.car).every(t=>t.st==='gone'||t.e&&t.e.state!=='idle')&&!O.carDone){O.carDone=true}}
function carBail(M,atSteps){const a=A(),O=M.ow,C=O.car,c=C.c;C.bailed=true;const yaw=c.yaw,rx=Math.cos(yaw),rz=-Math.sin(yaw);
  /* the driver gives up on the spot; the passenger goes for the steps */
  const drv=threat(M,{id:'driver',x:c.x-rx*1.4,z:c.z-rz*1.4,yaw,spot:'out of the car',reveal:-1,fuse:99,car:true});drv.e&&a.surrender(drv.e);drv.st='surr';say('Driver',"I just drive! I don't even LIKE driving!",true);
  const ps=threat(M,{id:'passenger',x:c.x+rx*1.5,z:c.z+rz*1.5,yaw,spot:atSteps?'at the steps':'running for the steps',reveal:0,fuse:atSteps?2.5:99,car:true});
  if(atSteps){reveal(M,ps)}else{const e=ps.e,w=O.esc&&O.esc.member('ferreira'),tx=w?w.pos.x+3:334,tz=w?w.pos.z+4:41;ps.st='dash';ps.t=0;a.equip(e.dude,'pistol');e.gun='pistol';
    e.script={kind:'to',x:tx,z:tz,speed:4.3,then:()=>{e.script={kind:'overwatch'};if(e.state==='idle'){ps.fuse=1.6;reveal(M,ps)}}};say('doug',"Passenger's out! He's running for the steps! Beans, Hawk. BEANS.",true)}}
/* ---------------- scope camera, overlay, HUD ---------------- */
function scopeCam(dt,M){const a=A(),O=M.ow,R=O.rifle,P=a.P,cam=a.camera;const sc=scoped(M);hideGameScope();
  if(!sc||R.scopeT<.05){return false}
  const e=sightPos(M);cam.position.copy(e);cam.rotation.set(P.pitch+R.sw.p+R.kick,P.yaw+R.sw.y,0);
  const z=TUNE.zoom[R.zoomK],want=2*Math.atan(Math.tan(TUNE.baseFov*Math.PI/360)/z)*180/Math.PI,from=TUNE.baseFov*.8;let fov=from+(want-from)*smooth(R.scopeT);
  if(cam.aspect<1)fov=Math.min(60,2*Math.atan(Math.tan(fov*Math.PI/360)/cam.aspect)*180/Math.PI*.9);
  cam.fov=fov;cam.updateProjectionMatrix();if(P.dude)P.dude.root.visible=false;return true}
function hideGameScope(){const s=document.getElementById('scope');if(s&&s.style.display!=='none')s.style.display='none'}
let OV=null,UIF=null;
/* canvas fonts can't use CSS variables: resolve the HUD's --ui family once */
function uiFont(){if(UIF)return UIF;let f='';try{f=getComputedStyle(document.documentElement).getPropertyValue('--ui').trim()||getComputedStyle(document.body).getPropertyValue('--ui').trim()}catch(_){}return UIF=f||'sans-serif'}
function overlay(){if(OV)return OV;if(!document.getElementById('ow-style')){const st=document.createElement('style');st.id='ow-style';
    st.textContent='.ht-cmp,.ht-me,.ht-wi,.ht-obj,.ht-tr,.ht-gd{transition:opacity .18s}body.ow-scoped .ht-cmp,body.ow-scoped .ht-me,body.ow-scoped .ht-wi,body.ow-scoped .ht-obj,body.ow-scoped .ht-tr,body.ow-scoped .ht-tag,body.ow-scoped .ht-gd{opacity:0!important}';document.head.appendChild(st)}const d=document.createElement('div');d.className='ow-scope';d.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2';
  const c=document.createElement('canvas');c.style.cssText='position:absolute;inset:0;width:100%;height:100%';d.appendChild(c);OV={el:d,c,g:c.getContext('2d'),w:0,h:0,on:false};return OV}
/* People animate far characters at 1/2..1/8 rate by camera distance, which a 4-8x scope makes visible: inside the lens,
   characters are stepped every frame (the zoom-aware LOD belongs in js/people.js; reported to the framework) */
function lensLod(M){const a=A(),O=M.ow,cam=a.camera,fw=aimDir(M),e=cam.position,cosLim=Math.cos(cam.fov*Math.PI/180*.6);
  const go=d=>{if(!d||!d.rb||!d.root.parent)return;const p=d.root.position,dx=p.x-e.x,dy=p.y+1-e.y,dz=p.z-e.z,l=Math.hypot(dx,dy,dz)||1;if((dx*fw.x+dy*fw.y+dz*fw.z)/l>cosLim)d.rb.skip=1e6};
  for(const t of O.threats)if(t.e)go(t.e.dude);for(const c of O.civs)go(c.d);if(O.kevin)go(O.kevin.d);if(O.esc)for(const m of O.esc.party)go(m.dude)}
function hudHook(M,st){const a=A(),O=M.ow,R=O.rifle,sc=scoped(M)&&R.scopeT>.05;if(sc)lensLod(M);
  if(O.roof.on){st.crosshair=Object.assign({},st.crosshair||{},{hidden:sc||!!(st.crosshair&&st.crosshair.hidden)});
    st.gadgets=[{id:'ow-rounds',label:R.type==='bean'?'Beanbag ×'+R.box.bean.mag+'/'+R.box.bean.res:'Live .308 ×'+R.box.live.mag+'/'+R.box.live.res,key:'Q',on:R.type==='live'},
      {id:'ow-zoom',label:TUNE.zoom[R.zoomK]+'× zoom',key:'Z',on:R.zoomK>0},{id:'ow-breath',label:R.breath.held?'Holding breath':'Hold breath',key:'Shift',on:R.breath.held,charge:R.breath.left}]}
  if(document.body&&document.body.classList.contains('ow-scoped')!==sc)document.body.classList.toggle('ow-scoped',sc);
  const ov=overlay();
  if(O.roof.on&&!ov.on){a.overlay('overwatch',ov.el);ov.on=true}else if(!O.roof.on&&ov.on){a.overlay('overwatch',null);ov.on=false}
  if(ov.on)drawOverlay(M,sc)}
function drawOverlay(M,sc){const a=A(),O=M.ow,R=O.rifle,ov=OV,c=ov.c,g=ov.g,dpr=Math.min(1.5,window.devicePixelRatio||1),W=innerWidth,H=innerHeight;
  if(ov.w!==W||ov.h!==H){ov.w=W;ov.h=H;c.width=W*dpr;c.height=H*dpr}g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  const k=sc?smooth(R.scopeT):0;
  if(!sc){drawMarks(M,g,W,H,false);return}
  const cx=W/2,cy=H/2,Rl=Math.min(W,H)*.47*(.9+.1*k);
  /* eye box: the shadow ring slides with how fast the sight is moving */
  const ox=clamp(-R.sw.vy*1400,-.12,.12)*Rl,oy=clamp(R.sw.vp*1400,-.12,.12)*Rl+clamp(R.kick*900,0,.25)*Rl;
  g.save();g.globalAlpha=k;g.fillStyle='#000';g.beginPath();g.rect(0,0,W,H);g.arc(cx,cy,Rl,0,Math.PI*2,true);g.fill('evenodd');
  const vg=g.createRadialGradient(cx+ox,cy+oy,Rl*.62,cx+ox,cy+oy,Rl*1.02);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(.75,'rgba(0,0,0,.35)');vg.addColorStop(1,'rgba(0,0,0,.96)');
  g.fillStyle=vg;g.beginPath();g.arc(cx,cy,Rl,0,Math.PI*2);g.fill();
  /* lens: a faint tint, a glare, chromatic fringe at the rim */
  const gl=g.createLinearGradient(cx-Rl,cy-Rl,cx+Rl*.2,cy+Rl*.3);gl.addColorStop(0,'rgba(190,220,255,.07)');gl.addColorStop(.45,'rgba(255,255,255,0)');g.fillStyle=gl;g.beginPath();g.arc(cx,cy,Rl,0,Math.PI*2);g.fill();
  g.lineWidth=2.5;g.strokeStyle='rgba(255,90,40,.22)';g.beginPath();g.arc(cx+.8,cy,Rl-1.5,0,Math.PI*2);g.stroke();g.strokeStyle='rgba(60,150,255,.22)';g.beginPath();g.arc(cx-.8,cy,Rl-1.5,0,Math.PI*2);g.stroke();
  g.lineWidth=3;g.strokeStyle='#050607';g.beginPath();g.arc(cx,cy,Rl,0,Math.PI*2);g.stroke();
  /* reticle: duplex posts, fine cross, bean holdover marks (computed from the same ballistics the rounds fly) */
  const cam=a.camera,pxPerRad=(H/2)/Math.tan(cam.fov*Math.PI/360),post=Rl*.3;
  const line=(x0,y0,x1,y1,w,col)=>{g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke()};
  const ink='rgba(12,13,14,.92)',halo='rgba(255,255,255,.16)';
  for(const[w,col]of[[5.5,halo],[3.4,ink]]){line(cx-Rl,cy,cx-post,cy,w,col);line(cx+post,cy,cx+Rl,cy,w,col);line(cx,cy+post,cx,cy+Rl,w,col);line(cx,cy-Rl,cx,cy-post,w*.7,col)}
  for(const[w,col]of[[2.6,halo],[1.1,ink]]){line(cx-post,cy,cx+post,cy,w,col);line(cx,cy-post,cx,cy+post,w,col)}
  if(R.type==='bean'){g.font='600 10px '+uiFont();g.textBaseline='middle';
    for(const d of R.zoomK?[25,50,75,100]:[50,75,100]){const T=TUNE.bean,t=d/T.v,drop=.5*T.g*t*t,ang=Math.atan2(drop,d);const y=cy+Math.tan(Math.max(0,ang))*pxPerRad;if(y-cy<3||y>cy+post)continue;
      const hw=d===100?14:d===50?11:8;line(cx-hw,y,cx+hw,y,3,halo);line(cx-hw,y,cx+hw,y,1.6,'#ff8a1e');g.fillStyle='#ffb067';g.fillText(String(d),cx+hw+4,y)}}
  else{for(let m=-4;m<=4;m++){if(!m)continue;const off=m*.005*pxPerRad;if(Math.abs(off)>post)continue;g.fillStyle=ink;g.beginPath();g.arc(cx+off,cy,1.6,0,6.3);g.fill();g.beginPath();g.arc(cx,cy+off,1.6,0,6.3);g.fill()}}
  /* centre: lit red when the sight is still (the pause at the bottom of the breath, or a held breath) */
  const lit=R.still||R.breath.held&&R.breath.holdT<TUNE.breath.hold;g.fillStyle=lit?'rgba(255,60,40,.95)':ink;g.beginPath();g.arc(cx,cy,lit?2.4:1.8,0,6.3);g.fill();
  if(lit){g.fillStyle='rgba(255,60,40,.25)';g.beginPath();g.arc(cx,cy,6,0,6.3);g.fill()}
  /* ID ring: hold on somebody and Doug tells you who they are */
  if(R.look&&R.lookT>0){const need=R.need||TUNE.markT,f=clamp(R.lookT/need,0,1),o=R.look.o,done=R.look.kind==='threat'?o.marked:o.ided;
    g.lineWidth=2.5;g.strokeStyle=done?(R.look.kind==='threat'?'rgba(255,70,50,.9)':R.look.kind==='kevin'?'rgba(80,170,255,.9)':'rgba(110,220,130,.9)'):'rgba(255,255,255,.75)';g.beginPath();g.arc(cx,cy,22,-Math.PI/2,-Math.PI/2+f*Math.PI*2);g.stroke()}
  drawMarks(M,g,W,H,true,cx,cy,Rl);
  /* readouts along the bottom of the lens */
  g.textAlign='center';g.textBaseline='alphabetic';g.font='600 12px '+uiFont();
  const B=R.box[R.type],rng=R.range!=null?Math.round(R.range)+' m':'— m';
  const items=[[R.type==='bean'?'BEAN':'LIVE',R.type==='bean'?'#ffb067':'#ff6a5a'],[B.mag+' | '+B.res,'#e8e4da'],[TUNE.zoom[R.zoomK]+'×','#e8e4da'],['RNG '+rng,'#e8e4da']];if(R.braced)items.push(['BRACED','#9fe0a8']);
  if(O.esc){items.push(['FERREIRA '+O.witHp,O.witHp<40?'#ff6a5a':'#9fe0a8']);if(O.esc.pinT>.5)items.push(['PINNED '+Math.ceil(PIN_LIMIT-O.esc.pinT)+'s','#ff6a5a'])}
  let tw=0;for(const[t]of items)tw+=g.measureText(t).width+18;let x=cx-tw/2;const y=cy+Rl*.8;
  for(const[t,col]of items){const w=g.measureText(t).width+18;g.fillStyle='rgba(0,0,0,.42)';g.fillRect(x,y-13,w-4,18);g.fillStyle=col;g.fillText(t,x+(w-4)/2,y);x+=w}
  /* breath: where you are in the cycle, and the held-breath reserve */
  const bx=cx-Rl*.72,by=cy+Rl*.42;g.lineWidth=2;g.strokeStyle='rgba(255,255,255,.25)';g.beginPath();g.arc(bx,by,14,0,6.3);g.stroke();
  const T=TUNE.breath,cyc=T.inn+T.out+T.pause,f=R.breath.held?R.breath.left:(R.breath.t/cyc);g.strokeStyle=R.breath.held?(R.breath.holdT>T.hold?'#ff6a5a':'#9fe0a8'):R.still?'#ff6a5a':'rgba(255,255,255,.7)';
  g.beginPath();g.arc(bx,by,14,-Math.PI/2,-Math.PI/2+f*Math.PI*2);g.stroke();g.font='600 9px '+uiFont();g.fillStyle='rgba(255,255,255,.7)';g.fillText(R.breath.held?'HOLD':R.still?'STILL':R.breath.recover>0?'GASP':'BREATHE',bx,by+28);
  g.restore()}
function drawMarks(M,g,W,H,sc,cx,cy,Rl){const a=A(),O=M.ow,cam=a.camera;const P=a.P;
  const proj=(x,y,z)=>{const v=new (a.THREE.Vector3)(x,y,z).project(cam);return{x:(v.x*.5+.5)*W,y:(-v.y*.5+.5)*H,ok:v.z<1&&v.z>-1}};
  const inLens=p=>!sc||Math.hypot(p.x-cx,p.y-cy)<Rl*.96;
  g.save();g.font='600 11px '+uiFont();g.textAlign='center';
  for(const t of O.threats){if(!t.marked||!t.e||t.st==='gone'||t.e.state==='dead'||t.e.state==='cuffed')continue;const e=t.e,y=(t.y||0)+(e.state==='surrender'?1.2:1.15);const p=proj(e.pos.x,y,e.pos.z);if(!p.ok||!inLens(p))continue;
    const d=Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z),s=sc?clamp(900/d*(TUNE.zoom[O.rifle.zoomK]/4),10,60):7,surr=e.state==='surrender';g.strokeStyle=surr?'rgba(255,210,80,.95)':'rgba(255,70,50,.95)';g.lineWidth=2;
    if(sc){const L_=s*.35;for(const[sx,sy]of[[-1,-1],[1,-1],[-1,1],[1,1]]){g.beginPath();g.moveTo(p.x+sx*s,p.y+sy*s-sy*L_);g.lineTo(p.x+sx*s,p.y+sy*s);g.lineTo(p.x+sx*s-sx*L_,p.y+sy*s);g.stroke()}
      g.fillStyle=surr?'rgba(255,210,80,.95)':'rgba(255,90,70,.95)';g.fillText(surr?'HANDS UP':(t.st==='lurk'?'MARKED':'ARMED')+' · '+Math.round(d)+' m',p.x,p.y-s-6)}
    else{g.beginPath();g.moveTo(p.x,p.y-s-14);g.lineTo(p.x+s,p.y-14);g.lineTo(p.x,p.y+s-14);g.lineTo(p.x-s,p.y-14);g.closePath();g.fillStyle=surr?'rgba(255,210,80,.9)':'rgba(255,70,50,.9)';g.fill();g.fillStyle='#fff';g.fillText(Math.round(d)+' m',p.x,p.y-24)}}
  const E=O.esc;if(E){const w=E.member('ferreira');if(w){const p=proj(w.pos.x,2.1,w.pos.z);if(p.ok&&inLens(p)){g.fillStyle='rgba(110,220,130,.95)';g.beginPath();g.moveTo(p.x-6,p.y-8);g.lineTo(p.x+6,p.y-8);g.lineTo(p.x,p.y);g.closePath();g.fill();if(!sc){g.fillStyle='#e8ffe9';g.fillText('Mr. Ferreira',p.x,p.y-12)}}}}
  if(O.kevin&&O.kevin.d&&O.kevin.st!=='gone'&&O.kevin.st!=='pending'&&(sc||O.kevin.ided)){const p=proj(O.kevin.x,1.6,O.kevin.z);if(p.ok&&inLens(p)){g.fillStyle='rgba(110,220,130,.95)';g.fillText('FRIENDLY · HOLD FIRE',p.x,p.y-6);
    if(sc&&friendlyInLine(M)){g.font='700 14px '+uiFont();g.fillStyle='rgba(110,220,130,.95)';g.fillText('KID IN THE LINE OF FIRE · RIFLE DOWN',cx,cy-Rl*.55);g.font='600 11px '+uiFont()}}}
  for(const c of O.civs){if(!c.ided||!c.d||c.gone||!sc)continue;const p=proj(c.x,2,c.z);if(p.ok&&inLens(p)){g.fillStyle='rgba(110,220,130,.85)';g.fillText('FRIENDLY',p.x,p.y-4)}}
  /* the car's tyres once Doug's called it */const C=O.car;if(C&&!C.done&&sc){for(const w of wheels(C)){const p=proj(w.x,w.y,w.z);if(!p.ok||!inLens(p))continue;g.strokeStyle=C.flats[w.i]?'rgba(255,210,80,.8)':'rgba(255,255,255,.55)';g.lineWidth=1.5;g.beginPath();g.arc(p.x,p.y,6,0,6.3);g.stroke()}}
  g.restore()}
function hudFill(M,F){const a=A(),O=M.ow,E=O.esc,R=O.rifle;
  if(E)F.meters.push({id:'wit',label:'Mr. Ferreira',v:O.witHp,max:100,style:'bar',warn:40,warnBelow:true,icon:'heart',sub:E.revived?'Rosa revived him once':''});
  if(E&&E.pinT>.5)F.meters.push({id:'pin',label:'Pinned',v:E.pinT,max:PIN_LIMIT,style:'bar',warn:PIN_LIMIT*.66,icon:'clock'});
  if(scoped(M))F.meters.push({id:'breath',label:'Breath',v:R.breath.left,max:1,style:'bar',warn:.25,warnBelow:true,icon:'bolt'});
  const tot=O.threats.length,h=O.threats.filter(t=>t.st==='gone'||t.e&&t.e.state!=='idle').length;if(tot)F.widgets.push({id:'threats',kind:'score',label:'Handled',v:h,max:tot});
  if(O.esc&&!M.exitOpen){const w=E.member('ferreira');/* on the roof there is no route to walk (and a route search from a roof tile to a far target is expensive): the lens and roof markers show him */if(!O.roof.on)F.target={x:roofInfo().bottom.x,z:roofInfo().bottom.z,label:'Ladder'}}}

/* ---------------- input: Z zoom, Q rounds, wheel zoom while scoped, touch chips ---------------- */
function onRoofJob(){const a=A(),M=a&&a.M;return M&&M.state==='go'&&M.def&&M.def.id==='overwatch'&&M.ow&&M.ow.roof.on?M:null}
if(typeof addEventListener==='function'){addEventListener('keydown',e=>{if(e.repeat)return;const M=onRoofJob();if(!M)return;const k=(e.key||'').toLowerCase();if(k==='z')zoomStep(M);else if(k==='q')switchRounds(M)});
  addEventListener('wheel',e=>{const M=onRoofJob();if(!M||!scoped(M))return;zoomStep(M,e.deltaY<0?1:-1)},{passive:true})}
function hookTouch(){const a=A();if(!a||!a.HUD||hookTouch.done)return;hookTouch.done=true;a.HUD.on('gadget',id=>{const M=onRoofJob();if(!M)return;if(id==='ow-rounds')switchRounds(M);else if(id==='ow-zoom')zoomStep(M);else if(id==='ow-breath')M.ow.rifle.touchHold=!M.ow.rifle.touchHold});
  a.HUD.on('touch',(id,down)=>{const M=onRoofJob();if(M&&id==='swap'&&down)switchRounds(M)})}
function touch(){const a=A();return!!(a&&a.HUD&&a.HUD.touch&&document.querySelector('.ht-touch')&&matchMedia('(pointer:coarse)').matches)}
/* after the job (won, lost, quit): give the dad his own guns back and put the roof back the way it was */
J.on('hud',()=>{hookTouch();const a=A();if(!a)return;const M=a.M;if(LAST&&LAST!==M||LAST&&M&&M.state!=='go'){const L_=LAST;LAST=null;try{roofOn(L_,false)}catch(_){}try{returnRifle(L_)}catch(_){}
    for(const p of L_.ow.proj)removeProj(p);L_.ow.proj.length=0;for(const m of L_.ow.meshes)if(m.parent)m.parent.remove(m);if(OV&&OV.on){a.overlay('overwatch',null);OV.on=false}fadeEl(false)}
  if(M&&M.state==='go'&&M.def&&M.def.id==='overwatch'&&M.ow)LAST=M});
let LAST=null;
/* game-time timers (lines and beats wait for the game, not the wall clock: pause, slow frames and the step-driven tests all agree) */
function later(M,sec,fn){const O=M&&M.ow;if(!O)return;(O.later||(O.later=[])).push({t:(O.clock||0)+sec,fn})}
function laterStep(dt,M){const O=M.ow;O.clock=(O.clock||0)+dt;if(!O.later||!O.later.length)return;const due=O.later.filter(x=>x.t<=O.clock);if(!due.length)return;O.later=O.later.filter(x=>x.t>O.clock);
  for(const x of due){if(M.state!=='go'&&!x.always)continue;try{x.fn()}catch(e){console.warn('[overwatch] timer',e)}}}
function cap(s){return String(s).replace(/^\w/,c=>c.toUpperCase())}
function say(who,text,front){const a=A();if(a)a.radio(who==='ferreira'?'Mr. Ferreira':who==='kevin'?'Kevin':who,text,front)}
function music(state,int){const Au=AUD();try{Au&&Au.music&&Au.music(state,{intensity:int})}catch(_){}}

/* ---------------- the scripted player (dev/jobs-check.js) ---------------- */
function bot(a,t,o){const M=a.M,P=a.P;if(!M||M.state!=='go'||!M.ow)return null;const O=M.ow,R=roofInfo(),H=G();
  if(a.CV){a.exitCar();return null}
  const B=O.bot||(O.bot={phase:'',hold:0,aimAt:null,wait:0,fired:0});a.keys.e=false;H.mouse=false;
  if(O.roof.fade>0)return null;
  if(M.exitOpen){P.aim=false;if(O.roof.on){P.pos.set(R.top.x,R.y,R.top.z);a.keys.e=true}else{const c=M.car;P.pos.set(c.pos.x+2.5,0,c.pos.z);a.useTap=true}return null}
  if(!O.roof.on){P.pos.set(R.bottom.x,0,R.bottom.z);a.keys.e=true;return null}
  if(o.fail){P.aim=false;return null}/* sit on your hands: the walk gets pinned */
  /* vantage: braced on the north-west corner for the street, the west parapet for the garden */
  const tgt=botTarget(M,o);const want=tgt&&tgt.kind==='tyre'&&tgt.x>420?{x:R.r.x1-.6,z:R.r.z0+.7}:tgt&&tgt.z>62?{x:R.r.x0+.6,z:R.r.z1-1.2}:{x:R.r.x0+.6,z:R.r.z0+.7};P.pos.x=want.x;P.pos.z=want.z;P.pos.y=R.y;P.crouch=true;
  if(!tgt){P.aim=o.human&&O.esc&&O.esc.state==='stop'&&O.stopT<5;B.hold=0;if(O.esc&&O.esc.state==='stop'&&O.stopT>(o.human?5.5:2.5)&&!lurkersAhead(M).length)a.useTap=true;if(O.rifle.box.bean.mag+O.rifle.box.bean.res<4&&!O.esc){}return null}
  /* the right rounds for the target */if((tgt.kind==='tyre')!==(O.rifle.type==='live'))switchRounds(M);
  /* human-ish: a reaction delay on each new target, the aim slews over instead of snapping, and a little error that breathing hides */
  const key=tgt.kind+(tgt.o?tgt.o.id||'':'');if(key!==B.key){B.key=key;B.react=o.human?.9+Math.random()*1.1:0;B.err={y:o.human?(Math.random()-.5)*.004:0,p:o.human?(Math.random()-.5)*.003:0};B.hold=0}
  if(B.react>0){B.react-=1/30;P.aim=o.human?false:true;return null}
  P.aim=true;const sol=solveAim(M,tgt);if(!sol)return null;const wy=sol.yaw-O.rifle.sw.y+B.err.y,wp=sol.pitch-O.rifle.sw.p-O.rifle.kick+B.err.p;
  if(o.human){let dy=wy-P.yaw;while(dy>Math.PI)dy-=2*Math.PI;while(dy<-Math.PI)dy+=2*Math.PI;const k=.16;P.yaw+=dy*k;P.pitch+=(wp-P.pitch)*k;B.err.y*=.97;B.err.p*=.97;const mov=Math.hypot(tgt.vx||0,tgt.vz||0)>.5;if(Math.abs(dy)>(mov?.012:.004)){if(!mov)B.hold=0;return null}}else{P.yaw=wy;P.pitch=wp}
  a.keys.shift=O.rifle.scopeT>.9&&B.hold>(o.human?.6:.2);B.hold+=1/30;
  const need=tgt.kind==='kevin'?1.2:tgt.kind==='threat'&&!tgt.o.marked?.75:.3;
  if(tgt.kind==='kevin')return null;/* look, don't shoot */
  if(B.hold>need&&O.rifle.scopeT>=1&&O.rifle.boltT<=0&&!P.rl&&(O.rifle.still||O.rifle.breath.held||Math.hypot(tgt.vx||0,tgt.vz||0)>.5)){H.mouse=true;B.hold=need*.5}
  return null}
function botTarget(M,o){const O=M.ow,E=O.esc,hu=o&&o.human;if(!O.sight.done&&O.scare)return{kind:'scare',x:O.scare.x,y:1.45,z:O.scare.z,vx:0,vz:0};
  if(O.kevin&&O.kevin.st==='aim'&&!O.kevin.ided&&O.kevin.d)return{kind:'kevin',o:O.kevin,x:O.kevin.x,y:.8,z:O.kevin.z,vx:0,vz:0};
  for(const c of O.civs)if(c.alarm&&c.d&&!c.ided&&!c.gone&&c.st==='go'&&c.t>2.5)return{kind:'civ',o:c,x:c.x,y:1.1,z:c.z,vx:0,vz:0};
  const C=O.car;if(C&&!C.done&&C.flats.reduce((s,f)=>s+f,0)<TUNE.car.stallFlats&&C.c.x<455){const ws=wheels(C).filter(w=>!C.flats[w.i]).sort((p,q)=>Math.hypot(p.x-417,p.z-48)-Math.hypot(q.x-417,q.z-48));if(ws[0]){const sp=C.c.spd||0;return{kind:'tyre',x:ws[0].x,y:ws[0].y,z:ws[0].z,vx:-Math.sin(C.c.yaw)*sp,vz:-Math.cos(C.c.yaw)*sp}}}
  const live=O.threats.filter(t=>t.e&&t.e.state==='idle'&&t.st!=='gone'&&t.st!=='pending').sort((p,q)=>(q.st!=='lurk')-(p.st!=='lurk'));
  for(const t of live){const e=t.e;/* a person finds a lurker by scanning ahead of the walk, not by reading the code */if(hu&&t.st==='lurk'&&!(E&&E.near(e.pos.x,e.pos.z)<24))continue;const run=t.st==='dash'||t.st==='run';return{kind:'threat',o:t,x:e.pos.x,y:(t.y||0)+(t.crouch&&t.st==='lurk'?.85:1.1),z:e.pos.z,vx:run?-Math.sin(e.yaw)*4.3:0,vz:run?-Math.cos(e.yaw)*4.3:0}}
  return null}
/* the aim that lands a round of the loaded type on (x,y,z), leading a mover: a few fixed-point steps on time of flight and drop */
function solveAim(M,t){const O=M.ow,T=TUNE[t.kind==='tyre'?'live':O.rifle.type],e=sightPos(M);let x=t.x,z=t.z,y=t.y;
  for(let i=0;i<4;i++){const d=Math.hypot(x-e.x,z-e.z),tf=d/T.v;x=t.x+(t.vx||0)*tf;z=t.z+(t.vz||0)*tf;y=t.y+.5*T.g*tf*tf}
  const dx=x-e.x,dz=z-e.z,dy=y-e.y,h=Math.hypot(dx,dz);return{yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,h)}}
})();
