/* High Trust · realistic skinned people (assets/people/rocketbox)
   window.HT.People: builds characters that plug into the game's makeDude / pose / equip contract.

   const P = HT.People; P.init({assets, quality:()=>'med'});   // assets = the game's ASSETS (gltf('rb_<key>'))
   P.ready.then(...)                                          // resolves once the GLBs are in and prepared (or rejects -> box fallback)
   const d = P.make(role, {variant, scale, idle});             // null when unavailable; role: you|gary|rick|dave|doug|thug|boss|wife|son|daughter or a file key
   d = {root, body, meshes (invisible hitboxes, userData.head on the head box), head, gunHold (on Bip01_R_Hand), gun, walk, legs:[], arms:[], rb}
   P.pose(d, dt, {moving, speed, aim, mode:'stand'|'crouch'|'down'|'kneel'|'hands'|'sit', pitch})   // sets targets + measures ground speed
   P.update(dt, camera)                                       // advances every live mixer (call once per frame / sim step)
   P.equip(d, type)  P.fire(d)  P.reload(d, seconds)  P.hit(d, head)  P.die(d)  P.revive(d)
*/
(function(){
'use strict';
const HT=window.HT=window.HT||{};
const T=window.THREE;
const BASE='assets/people/rocketbox/';
const REF_HIP=.8952;
const KEYS=['dad_player','dad_gary','dad_rick','dad_dave','dad_doug','thug_hoodie','thug_track','thug_beanie','thug_red','boss','wife','son','daughter'];
const GAME_KEYS=KEYS.slice(0,10);/* loaded with the game; family loads on demand (preload) */
const ROLE={you:'dad_player',player:'dad_player',gary:'dad_gary',rick:'dad_rick',dave:'dad_dave',doug:'dad_doug',boss:'boss',wife:'wife',son:'son',daughter:'daughter',
  thug:['thug_hoodie','thug_track','thug_beanie','thug_red']};
const SCALE={dad_dave:1.15,boss:1.06};
const IDLE={dad_player:'idle',dad_gary:'idle_look',dad_rick:'idle',dad_dave:'idle',dad_doug:'idle',thug_hoodie:'idle_nervous',thug_track:'idle_angry',thug_beanie:'idle_nervous',thug_red:'idle_angry',boss:'idle_arms_folded',wife:'f_idle',son:'idle',daughter:'f_idle'};
const FEMALE={wife:1,daughter:1};
/* ground speed each clip was recorded at (m/s), and where the left foot starts relative to 'walk' (fraction of a cycle) */
const SPEED={walk:1.012,walk_fast:1.495,jog:2.411,run:3.075,sprint:5.839,f_walk:1.214,crouch_walk:.626,strafe_left:3,strafe_right:3,run_back:2.47};
const PHASE={run:.5};
const LOCO=['walk','walk_fast','jog','run','sprint'];
const FULL={death:1,hands_up:1,kneel_cuffed:1,kneel_hands_up:1,sit:1,sit_breathe:1,f_sit:1};
const ONCE={death:1,hit_chest:1,hit_head:1,hit_knockback:1,rifle_fire:1,pistol_fire:1,pistol_reload:1,punch:1,interact:1};
const SPINE_RE=/Spine|Neck|Head/,ARM_RE=/Clavicle|UpperArm|Forearm|Hand|Finger/;
/* gun placement in Bip01_R_Hand (fits rifle_aim / pistol_* exactly for models with the muzzle on -Z and the origin on top of the grip) */
const GUN_FIT={rifle:{p:[.0989,-.0154,.0539],q:[-.4003,.41,.7039,-.4198]},pistol:{p:[.0787,.0006,.0687],q:[.4079,-.462,-.5513,.5623]}};
/* the game's procedural guns point down +Z; per-type nudge so their grip sits in the palm */
const BOX_NUDGE={pistol:[0,0,0],rifle:[0,.01,-.2],shotgun:[0,.03,.12]};

const P={ok:false,failed:false,keys:KEYS,roles:ROLE,live:[],GUN_FIT,stats:{updates:0,skipped:0}};
let A=null,qualityFn=()=>'med',resolveReady,rejectReady;
P.ready=new Promise((r,j)=>{resolveReady=r;rejectReady=j});P.ready.catch(()=>{});
const tpl={};/* key -> prepared template {scene, hip} */
let srcClips=null;const clipCache={};
const loader=T&&T.GLTFLoader?new T.GLTFLoader():null;
const extra={};/* gltfs loaded on demand (family) */

P.files=()=>GAME_KEYS.concat(['anims']).map(k=>({name:'rb_'+k,url:BASE+k+'.glb'}));
P.init=function(o){o=o||{};if(o.assets)A=o.assets;if(o.quality)qualityFn=o.quality;
  if(P._initDone)return P.ready;P._initDone=true;
  const wait=A&&A.ready?A.ready:Promise.resolve();
  wait.then(()=>{try{if(prepareAll())resolveReady(P);else{P.failed=true;rejectReady(new Error('people assets missing'))}}catch(e){console.warn('people: prepare failed',e);P.failed=true;rejectReady(e)}});
  return P.ready};
function gltf(key){return extra[key]||(A&&A.gltf?A.gltf('rb_'+key):null)}
function prepareAll(){const an=gltf('anims');if(!an||!an.animations||!an.animations.length)return false;
  srcClips={};for(const c of an.animations)srcClips[c.name]=c;
  let n=0;for(const k of GAME_KEYS)if(prep(k))n++;P.ok=n>0;return P.ok}
P.preload=function(keys){return Promise.all(keys.map(k=>{if(tpl[k])return true;if(!loader)return false;
  return new Promise(res=>loader.load(BASE+k+'.glb',g=>{g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});extra[k]=g;res(!!prep(k))},undefined,()=>res(false)))}))};
P.has=k=>!!tpl[resolveKey(k)];

/* ---------- clips: pelvis track scaled to the character's hip height, split into lower/upper masks ---------- */
function clips(name,hip){if(!srcClips||!srcClips[name])return null;const key=name+'@'+hip.toFixed(3);if(clipCache[key])return clipCache[key];
  const r=hip/REF_HIP,src=srcClips[name];const lo=[],sp=[],ar=[];
  for(const t0 of src.tracks){let t=t0;if(/Bip01_Pelvis\.position$/.test(t.name)&&Math.abs(r-1)>1e-3){t=t0.clone();t.values=t.values.map(v=>v*r)}
    const b=t.name.split('.')[0];(ARM_RE.test(b)?ar:SPINE_RE.test(b)?sp:lo).push(t)}
  /* three masks: legs+pelvis, spine+neck+head, arms+hands; upper layers blend per mask */
  return clipCache[key]={lo:new T.AnimationClip(name+'#lo',src.duration,lo),sp:new T.AnimationClip(name+'#sp',src.duration,sp),ar:new T.AnimationClip(name+'#ar',src.duration,ar),dur:src.duration}}

/* ---------- templates ---------- */
const hitMat=new T.MeshBasicMaterial({color:0xff00ff,visible:false,wireframe:true});
P.debugHitboxes=on=>{hitMat.visible=!!on};
const boxCache={};
function hbGeo(sx,sy,sz,cx,cy,cz){const k=[sx,sy,sz,cx,cy,cz].join();if(boxCache[k])return boxCache[k];const g=new T.BoxGeometry(sx,sy,sz);g.translate(cx,cy,cz);g.computeBoundingSphere();return boxCache[k]=g}
/* bone-local hitboxes; Biped bones run along local +X (spine/neck/head: +X up, +Y forward, +Z left) */
const HITBOX=[
  ['Bip01_Head',true,.23,.22,.19,.095,.025,0],
  ['Bip01_Neck',false,.1,.13,.13,.04,0,0],
  ['Bip01_Spine2',false,.26,.27,.42,.12,.01,0],
  ['Bip01_Spine',false,.32,.25,.36,.15,.0,0],
  ['Bip01_Pelvis',false,.24,.25,.37,-.02,0,0],
  ['Bip01_L_UpperArm',false,.3,.12,.12,.14,0,0],['Bip01_R_UpperArm',false,.3,.12,.12,.14,0,0],
  ['Bip01_L_Forearm',false,.28,.1,.1,.13,0,0],['Bip01_R_Forearm',false,.28,.1,.1,.13,0,0],
  ['Bip01_L_Thigh',false,.44,.18,.18,.21,0,0],['Bip01_R_Thigh',false,.44,.18,.18,.21,0,0],
  ['Bip01_L_Calf',false,.44,.14,.14,.21,0,0],['Bip01_R_Calf',false,.44,.14,.14,.21,0,0]];

function prep(key){if(tpl[key])return tpl[key];const g=gltf(key);if(!g||!g.scene)return null;
  const s=g.scene;s.updateMatrixWorld(true);let hip=REF_HIP;s.traverse(o=>{if(o.userData&&o.userData.hipHeight)hip=o.userData.hipHeight});
  const low=qualityFn()==='low';
  const B=n=>s.getObjectByName(n);
  s.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;
    /* skinned bounds come from the bind pose; widen them so crouch/death/aim poses never pop out of the frustum */
    const gm=o.geometry;if(!gm.userData.rbBounds){gm.computeBoundingSphere();gm.boundingSphere.center.set(0,.85,0);gm.boundingSphere.radius=Math.max(gm.boundingSphere.radius,1.45);gm.userData.rbBounds=1}
    for(const m of(Array.isArray(o.material)?o.material:[o.material])){if(m.userData.rbPrep)continue;m.userData.rbPrep=1;m.envMapIntensity=.85;
      for(const t of[m.map,m.normalMap,m.roughnessMap,m.metalnessMap])if(t){t.anisotropy=low?1:4;if(low)capTexture(t,t===m.map?512:256)}
      if(low&&m.normalMap&&!/head/.test(m.name)){m.normalMap=null;m.needsUpdate=true}}});
  /* caps: replace the stiff helmet-like shell with a proper fabric baseball cap */
  const cap=B('acc_cap');if(cap){const col=(cap.material&&cap.material.color)?cap.material.color.clone():new T.Color(.05,.05,.1);cap.visible=false;cap.castShadow=false;
    const head=B('Bip01_Head');if(head)head.add(makeCap(s,head,col,key))}
  if(key==='boss'){const head=B('Bip01_Head'),neck=B('Bip01_Spine2');if(head)head.add(makeCrown(s,head));if(neck)neck.add(makeChain())}
  for(const h of HITBOX){const b=B(h[0]);if(!b)continue;const m=new T.Mesh(hbGeo(h[2],h[3],h[4],h[5],h[6],h[7]),hitMat);m.name='hit_'+h[0];m.userData.hitbox=true;m.userData.head=h[1];m.castShadow=false;m.receiveShadow=false;m.frustumCulled=false;b.add(m)}
  const hand=B('Bip01_R_Hand');if(hand){const gh=new T.Group();gh.name='gunHold';hand.add(gh)}
  return tpl[key]={scene:s,hip,key}}

const capped=new WeakSet();
function capTexture(t,max){const im=t.image;if(!im||!im.width||im.width<=max||capped.has(t))return;capped.add(t);
  try{const c=document.createElement('canvas');const k=max/Math.max(im.width,im.height);c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);t.image=c;t.needsUpdate=true}catch(e){}}

/* fabric normal map for caps: fine twill plus six panel seams radiating from the button */
let capNrm=null;
function fabricNormal(){if(capNrm)return capNrm;const S=256,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');const id=x.createImageData(S,S);
  const h=(i,j)=>.5+.25*Math.sin((i+j)*.9)+.12*Math.sin((i-j)*.35)+.08*(Math.random()-.5);
  const H=new Float32Array(S*S);for(let j=0;j<S;j++)for(let i=0;i<S;i++)H[j*S+i]=h(i,j);
  for(let j=0;j<S;j++)for(let i=0;i<S;i++){/* seams every 1/6 of u (crown wraps u around) */
    const u=i/S,sd=Math.abs((u*6)%1-.5);if(sd>.47)H[j*S+i]-=.8;}
  for(let j=0;j<S;j++)for(let i=0;i<S;i++){const dx=H[j*S+(i+1)%S]-H[j*S+(i-1+S)%S],dy=H[((j+1)%S)*S+i]-H[((j-1+S)%S)*S+i];
    let nx=-dx*1.2,ny=-dy*1.2,nz=1;const l=Math.hypot(nx,ny,nz);const k=(j*S+i)*4;id.data[k]=(nx/l*.5+.5)*255;id.data[k+1]=(ny/l*.5+.5)*255;id.data[k+2]=(nz/l*.5+.5)*255;id.data[k+3]=255}
  x.putImageData(id,0,0);capNrm=new T.CanvasTexture(c);capNrm.wrapS=capNrm.wrapT=T.RepeatWrapping;return capNrm}
/* skull extent in head-bone space, from head + hair vertices above the eyes */
function skull(s,head){const inv=head.matrixWorld.clone().invert(),v=new T.Vector3(),bb=new T.Box3();let n=0;
  s.traverse(o=>{if(!o.isMesh||/acc_|hit_/.test(o.name))return;const p=o.geometry.attributes.position;const sk=o.geometry.attributes.skinIndex,sw=o.geometry.attributes.skinWeight;if(!sk||!o.skeleton)return;
    const hb=o.skeleton.bones.indexOf(head);if(hb<0)return;
    for(let i=0;i<p.count;i++){let w=0;const si=[sk.getX(i),sk.getY(i),sk.getZ(i),sk.getW(i)],ws=[sw.getX(i),sw.getY(i),sw.getZ(i),sw.getW(i)];for(let k=0;k<4;k++)if(si[k]===hb)w+=ws[k];if(w<.5)continue;
      v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).applyMatrix4(inv);if(v.x<.1)continue;bb.expandByPoint(v);n++}});
  return n>20?bb:null}
/* cap space: y up, z forward; mapped into head space (x up, y forward, z left) */
const CAP2HEAD=new T.Matrix4().makeBasis(new T.Vector3(0,0,1),new T.Vector3(1,0,0),new T.Vector3(0,1,0));
function makeCap(s,head,col,key){let bb=skull(s,head);P._skull=P._skull||{};P._skull[key]=bb&&[bb.min.toArray(),bb.max.toArray()];bb=bb||new T.Box3(new T.Vector3(.1,-.11,-.085),new T.Vector3(.22,.1,.085));
  const g=new T.Group();g.name='rb_cap';g.applyMatrix4(CAP2HEAD);
  const hw=Math.min((bb.max.z-bb.min.z)/2+.012,.095),hd=Math.min((bb.max.y-bb.min.y)/2+.012,.118),cz=(bb.max.y+bb.min.y)/2-.004,top=bb.max.x+.012;
  const base=top-.088;/* crown depth: the band sits on the forehead, well above the brows */
  const fab=new T.MeshStandardMaterial({color:col,roughness:.96,metalness:0,normalMap:fabricNormal(),normalScale:new T.Vector2(.55,.55)});
  fab.color.multiplyScalar(1.15);
  /* crown: squashed half-dome, slightly higher at the front panel */
  const cg=new T.SphereGeometry(1,28,10,0,Math.PI*2,0,Math.PI*.52);const p=cg.attributes.position;
  for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const yy=Math.max(y,-.05);p.setXYZ(i,x*hw,base+yy*(top-base)+z*.016*(1-yy),cz+z*hd)}
  cg.computeVertexNormals();const crown=new T.Mesh(cg,fab);crown.castShadow=true;g.add(crown);
  /* curved brim: arched across, gently pitched down */
  const bw=hw*.95,bl=.088,seg=14,rows=4,pos=[],idx=[],uv=[];
  for(let r=0;r<=rows;r++){const t=r/rows;for(let c=0;c<=seg;c++){const u=c/seg*2-1;const ang=u*1.05;
    const ex=Math.sin(ang)*bw*(1-t*.18),ez=Math.cos(ang)*hd*.92+t*bl*(1-u*u*.55);
    const ey=base+.004+Math.cos(ang)*.016-t*bl*.2-(u*u)*.02*(.4+t);pos.push(ex,ey,cz+ez);uv.push(c/seg,t)}}
  for(let r=0;r<rows;r++)for(let c=0;c<seg;c++){const a=r*(seg+1)+c,b=a+1,d=a+seg+1,e=d+1;idx.push(a,d,b,b,d,e)}
  const brG=new T.BufferGeometry();brG.setAttribute('position',new T.Float32BufferAttribute(pos,3));brG.setAttribute('uv',new T.Float32BufferAttribute(uv,2));brG.setIndex(idx);brG.computeVertexNormals();
  const brMat=fab.clone();brMat.side=T.DoubleSide;const brim=new T.Mesh(brG,brMat);brim.castShadow=true;g.add(brim);
  /* under-brim and the band inside the crown edge */
  const btn=new T.Mesh(new T.SphereGeometry(.011,8,6),fab);btn.position.set(0,top+.003,cz);btn.scale.y=.5;g.add(btn);
  return g}
function makeCrown(s,head){const bb=skull(s,head)||new T.Box3(new T.Vector3(.1,-.11,-.085),new T.Vector3(.22,.1,.085));
  const g=new T.Group();g.name='rb_crown';g.applyMatrix4(CAP2HEAD);
  const gold=new T.MeshStandardMaterial({color:new T.Color(1,.72,.22),metalness:1,roughness:.28,envMapIntensity:1.4});
  const r=Math.max((bb.max.z-bb.min.z),(bb.max.y-bb.min.y))/2*.82,cz=(bb.max.y+bb.min.y)/2,y=bb.max.x-.045;
  const band=new T.Mesh(new T.CylinderGeometry(r,r*.97,.05,24,1,true),gold);band.position.set(0,y,cz);band.material.side=T.DoubleSide;g.add(band);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const sp=new T.Mesh(new T.ConeGeometry(.016,.05,4),gold);sp.position.set(Math.sin(a)*r,y+.045,cz+Math.cos(a)*r);g.add(sp);
    const gem=new T.Mesh(new T.SphereGeometry(.009,6,4),new T.MeshStandardMaterial({color:i%2?0x9a1030:0x1a4ad0,roughness:.15,metalness:.1}));gem.position.set(Math.sin(a)*r*1.04,y,cz+Math.cos(a)*r*1.04);g.add(gem)}
  g.traverse(o=>{if(o.isMesh)o.castShadow=true});g.rotation.x+=0;return g}
function makeChain(){/* gold rope chain over the shirt, hangs from the neck onto the chest (Spine2 space: x up, y forward, z left) */
  const gold=new T.MeshStandardMaterial({color:new T.Color(1,.74,.25),metalness:1,roughness:.3,envMapIntensity:1.4});
  const pts=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;const fy=Math.cos(a);pts.push(new T.Vector3(.2-(fy>0?fy*fy*.11:0),.04+Math.max(0,fy)*.1+Math.min(0,fy)*.06,Math.sin(a)*.085))}
  const curve=new T.CatmullRomCurve3(pts,true);const m=new T.Mesh(new T.TubeGeometry(curve,48,.0075,6,true),gold);m.name='rb_chain';m.castShadow=true;
  const pend=new T.Mesh(new T.CylinderGeometry(.03,.03,.008,16),gold);pend.rotation.x=Math.PI/2;pend.position.set(.085,.155,0);const g=new T.Group();g.add(m);g.add(pend);return g}

/* ---------- instances ---------- */
function resolveKey(role,variant){let k=ROLE[role]!==undefined?ROLE[role]:role;if(Array.isArray(k))k=variant&&k.includes(variant)?variant:k[Math.floor(Math.random()*k.length)];return k}
P.make=function(role,o){o=o||{};if(!P.ok&&!P.failed&&A&&A.done&&srcClips===null){try{if(!prepareAll())P.failed=true}catch(e){P.failed=true}}if(!P.ok||!T.SkeletonUtils)return null;const key=resolveKey(role,o.variant);const t=tpl[key]||prep(key);if(!t)return null;
  const body=T.SkeletonUtils.clone(t.scene);body.name='rb_'+key;
  const root=new T.Group();root.add(body);const sc=(SCALE[key]||1)*(o.scale||1);if(sc!==1)root.scale.setScalar(sc);
  const meshes=[];let head=null,gunHold=null,skinned=[];
  body.traverse(n=>{if(n.userData&&n.userData.hitbox){meshes.push(n);if(n.userData.head)head=n}else if(n.isSkinnedMesh)skinned.push(n);if(n.name==='gunHold')gunHold=n});
  const bones={};for(const n of['Bip01_Pelvis','Bip01_Spine','Bip01_Spine1','Bip01_Spine2','Bip01_Neck','Bip01_Head','Bip01_L_UpperArm','Bip01_R_UpperArm','Bip01_R_Hand','Bip01_L_Forearm','Bip01_L_Hand','Bip01_L_Finger2'])bones[n]=body.getObjectByName(n);
  const mixer=new T.AnimationMixer(body);
  const female=!!FEMALE[key];
  const rb={key,hip:t.hip,mixer,body,bones,skinned,acts:{},lw:{},aimW:0,holdW:0,armP:0,spineP:0,one:null,
    idle:o.idle||IDLE[key]||'idle',walk:female?'f_walk':'walk',female,
    in:{mode:'stand',aim:false,moving:false,pitch:0},v:0,vx:0,vz:0,lx:null,lz:null,base:null,dead:false,deadT:0,gunType:null,acc:0,skip:0,orphan:0,phase:0};
  /* legs/arms: inert stand-ins so old code that pokes box-dude limbs does nothing harmful */
  const stub=()=>new T.Object3D();
  const d={root,body,meshes,head,gunHold,gun:null,walk:0,legs:[stub(),stub()],arms:[stub(),stub()],rb,people:true};
  /* start in idle so a freshly spawned character is never seen in the bind pose */
  setBase(d,rb.idle,true);step(d,0);mixer.update(Math.random()*3);
  P.live.push(d);return d};

function act(rb,name,part){const c=clips(name,rb.hip);if(!c)return null;let a=rb.acts[name];if(!a){a=rb.acts[name]={lo:null,sp:null,ar:null,c}}
  if(!a[part]){const x=rb.mixer.clipAction(c[part]);if(ONCE[name]){x.setLoop(T.LoopOnce,1);x.clampWhenFinished=true}x.enabled=true;x.setEffectiveWeight(0);a[part]=x}return a[part]}
function setBase(d,name,instant){const rb=d.rb;if(!clips(name,rb.hip))name=rb.idle;if(!clips(name,rb.hip))name='idle';
  if(rb.base===name)return;const prev=rb.base;rb.base=name;
  if(!(name in rb.lw)||rb.lw[name]<=0){rb.lw[name]=0;const lo=act(rb,name,'lo'),sp=act(rb,name,'sp'),ar=act(rb,name,'ar');
    let t=0;if(SPEED[name]&&prev&&SPEED[prev]&&rb.acts[prev]&&rb.acts[prev].lo){const pa=rb.acts[prev].lo,pc=rb.acts[prev].c;t=((pa.time/pc.dur-(PHASE[prev]||0)+(PHASE[name]||0))%1+1)%1*lo.getClip().duration}
    for(const x of[lo,sp,ar]){x.reset();x.time=t;x.play()}}
  if(instant){for(const k in rb.lw)rb.lw[k]=0;rb.lw[name]=1}}

/* ---------- public driving API ---------- */
P.pose=function(d,dt,o){const rb=d.rb;if(!rb)return;o=o||{};const r=d.root;
  const inp=rb.in;inp.mode=o.mode||'stand';inp.aim=o.aim===undefined?true:!!o.aim;inp.moving=!!o.moving;inp.pitch=o.pitch||0;inp.speedHint=o.speed||1;if(rb.force)Object.assign(inp,rb.force);
  if(dt>0){const x=r.position.x,z=r.position.z;if(rb.lx!==null){const dx=x-rb.lx,dz=z-rb.lz,dd=Math.hypot(dx,dz);
      if(dd<3){const s=Math.sin(r.rotation.y),c=Math.cos(r.rotation.y);const k=1-Math.exp(-dt*10);const sc=r.scale.x||1;
        /* local: +x = character's left, +z = forward; scaled characters take longer strides */
        const lvx=(dx*c-dz*s)/dt/sc,lvz=(dx*s+dz*c)/dt/sc;rb.vx+=(lvx-rb.vx)*k;rb.vz+=(lvz-rb.vz)*k}}
    rb.lx=x;rb.lz=z;if(!inp.moving){const k=1-Math.exp(-dt*14);rb.vx-=rb.vx*k;rb.vz-=rb.vz*k}}
  if(inp.mode==='down'&&!rb.dead)rb.downed=true;else if(inp.mode!=='down'&&rb.downed){rb.downed=false;rb.getUp=.6}};
const PISTOL_STYLE={pistol:1,revolver:1,nailer:1,sawedoff:1};const _ry=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI);
P.equip=function(d,type){const rb=d.rb;if(!rb||!d.gunHold)return;rb.gunType=type||null;const gh=d.gunHold;const G=HT.Guns;
  rb.style=type?(PISTOL_STYLE[type]?'pistol':'rifle'):null;
  /* realistic guns (js/guns.js): calibrated hand fit; makeGun wraps those models turned to +Z, so turn back */
  if(type&&d.gun&&d.gun.userData&&d.gun.userData.gun&&G&&G.handAttach){try{const a=G.handAttach(type);gh.position.copy(a.position);gh.quaternion.copy(a.quaternion);if(d.gun.userData.muzzle!=='-z')gh.quaternion.multiply(_ry);rb.style=a.clipStyle||rb.style;return}catch(e){}}
  const f=GUN_FIT[rb.style==='pistol'?'pistol':'rifle'];
  gh.position.fromArray(f.p);gh.quaternion.fromArray(f.q);
  if(d.gun){const muzzleNegZ=d.gun.userData&&d.gun.userData.muzzle==='-z';if(!muzzleNegZ&&rb.style!=='pistol'){gh.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI));const n=BOX_NUDGE[type]||[0,0,0];d.gun.position.set(n[0],n[1],n[2])}}};
function oneShot(d,name,dur,peak){const rb=d.rb;if(!rb||rb.dead)return;const a=act(rb,name,'ar'),b=act(rb,name,'sp');if(!a)return;const cd=rb.acts[name].c.dur;
  for(const x of[a,b]){x.reset();x.timeScale=dur?cd/dur:1;x.play()}rb.one={name,t:0,dur:dur||cd,peak:peak||1}}
P.fire=d=>{const rb=d&&d.rb;if(!rb||!rb.gunType)return;const ps=rb.style==='pistol';oneShot(d,ps?'pistol_fire':'rifle_fire',ps?.4:.22,1);rb.kick=1};
P.reload=(d,sec)=>{const rb=d&&d.rb;if(!rb||!rb.gunType)return;if(rb.style==='pistol')oneShot(d,'pistol_reload',sec||1.2,1);else rb.reloadT=sec||1.9};
P.hit=(d,headshot)=>{const rb=d&&d.rb;if(!rb||rb.dead)return;oneShot(d,headshot?'hit_head':'hit_chest',headshot?.43:.33,.9)};
P.die=d=>{const rb=d&&d.rb;if(!rb||rb.dead)return;rb.dead=true;rb.deadT=0;rb.one=null;setBase(d,'death');};
/* tests: pin inputs regardless of what the game asks for (P.force(d,null) clears) */
P.force=(d,o)=>{if(d&&d.rb)d.rb.force=o||null};
P.revive=d=>{const rb=d&&d.rb;if(!rb)return;rb.dead=false;rb.deadT=0;d.body.position.y=0;d.root.visible=true};

/* ---------- left-hand IK onto the forend of long guns ---------- */
/* forend centre (s along the barrel, y) and radius in HT.Guns model space (muzzle -Z), from js/guns.js support poses */
const SUPPORT={shotgun:[.3,.009,.022],beanbag:[.3,.009,.022],double:[.17,.012,.024],rifle:[.18,.02,.03],smg:[.25,.032,.028],hunter:[0,.022,.024]};
const _a=new T.Vector3(),_b=new T.Vector3(),_c=new T.Vector3(),_t=new T.Vector3(),_n=new T.Vector3(),_u=new T.Vector3(),_w=new T.Vector3(),_hq=new T.Quaternion(),_pq=new T.Quaternion(),_rq=new T.Quaternion();
function worldRot(b,q){b.parent.getWorldQuaternion(_pq);b.getWorldQuaternion(_rq);_rq.premultiply(q);b.quaternion.copy(_pq.invert().multiply(_rq))}
function leftHandIK(d,w){const rb=d.rb,B=rb.bones,s=SUPPORT[rb.gunType];if(!s||!d.gun||!B.Bip01_L_UpperArm)return;
  const m=d.gun.children[0];if(!m||!d.gun.userData.gun)return;/* only the HT.Guns models have known forends */
  const ua=B.Bip01_L_UpperArm,fa=B.Bip01_L_Forearm,hd=B.Bip01_L_Hand,f2=B.Bip01_L_Finger2;if(!fa||!hd||!f2)return;
  /* palm centre now, and where it should be: just under the forend */
  hd.getWorldPosition(_c);f2.getWorldPosition(_w);const palm=_u.copy(_c).lerp(_w,.55);
  m.updateWorldMatrix(true,false);
  /* a moving pump: aim for the middle of its grip, measured once per model */
  if(m.userData.rbSupport===undefined){m.userData.rbSupport=null;const pu=m.getObjectByName('pump');if(pu){const inv=new T.Matrix4().copy(m.matrixWorld).invert(),bx=new T.Box3().setFromObject(pu).applyMatrix4(inv);
      if(!bx.isEmpty())m.userData.rbSupport=[(bx.min.z+bx.max.z)/2,bx.min.y-.02]}}
  const sp=m.userData.rbSupport;if(sp)_t.set(0,sp[1],sp[0]);else _t.set(0,s[1]-s[2]-.022,-s[0]);_t.applyMatrix4(m.matrixWorld);
  _t.sub(palm);const err=_t.length();if(err<.004||err>.35)return;
  const goal=_t.multiplyScalar(w).add(_c);/* desired wrist */
  hd.getWorldQuaternion(_hq);
  ua.getWorldPosition(_a);fa.getWorldPosition(_b);
  const l1=_a.distanceTo(_b),l2=_b.distanceTo(_c),dd=Math.min(l1+l2-.002,Math.max(.05,_a.distanceTo(goal)));
  /* 1: elbow angle from the law of cosines */
  _u.copy(_a).sub(_b);_w.copy(_c).sub(_b);_n.crossVectors(_u,_w);if(_n.lengthSq()<1e-10)return;_n.normalize();
  const cur=_u.angleTo(_w),want=Math.acos(Math.max(-1,Math.min(1,(l1*l1+l2*l2-dd*dd)/(2*l1*l2))));
  worldRot(fa,_q.setFromAxisAngle(_n,want-cur));
  /* 2: swing the upper arm so the wrist lands on the goal */
  hd.getWorldPosition(_c);_u.copy(_c).sub(_a).normalize();_w.copy(goal).sub(_a).normalize();worldRot(ua,_q.setFromUnitVectors(_u,_w));
  /* support hand: palm up under the forend, fingers forward and curling across to the far side; blended with the clip's hand */
  m.getWorldQuaternion(_rq);const fw=_u.set(0,0,-1).applyQuaternion(_rq),up=_w.set(0,1,0).applyQuaternion(_rq),rt=_n.set(1,0,0).applyQuaternion(_rq);
  const X=_a.copy(fw).multiplyScalar(.45).addScaledVector(rt,.85).addScaledVector(up,-.05).normalize(),Yp=_b.copy(up).multiplyScalar(1);Yp.addScaledVector(X,-Yp.dot(X)).normalize();
  const Z=_c.crossVectors(X,Yp);const M=new T.Matrix4().makeBasis(X,Yp,Z);_q.setFromRotationMatrix(M);_hq.slerp(_q,w);
  hd.parent.getWorldQuaternion(_pq);hd.quaternion.copy(_pq.invert().multiply(_hq))}


/* ---------- per-frame update ---------- */
const _q=new T.Quaternion(),_q2=new T.Quaternion(),_v=new T.Vector3(),_ax=new T.Vector3(),_cp=new T.Vector3();
function chooseBase(d){const rb=d.rb,inp=rb.in,m=inp.mode;
  if(rb.dead)return'death';
  if(m==='down')return'death';
  if(m==='kneel')return'kneel_cuffed';
  if(m==='hands')return'hands_up';
  if(m==='sit')return rb.female?'f_sit':'sit';
  const v=Math.hypot(rb.vx,rb.vz);
  if(m==='crouch')return v>.25?'crouch_walk':'ual_crouch_idle';
  const cur=rb.base,still=v<(LOCO.includes(cur)||SPEED[cur]?.18:.32);
  if(still)return rb.idle==='idle_arms_folded'&&(inp.aim||rb.one)?'idle':rb.idle;
  const fwd=rb.vz,side=rb.vx;
  if(Math.abs(side)>Math.abs(fwd)*1.2&&v>.6)return side>0?'strafe_left':'strafe_right';
  if(fwd<-Math.abs(side)*.8)return v>1.7?'run_back':rb.walk;
  if(rb.female)return rb.walk;
  /* pick the clip whose recorded speed is closest in ratio, with a little stickiness to the current one */
  let best=rb.walk,bs=1e9;for(const n of LOCO){let s=Math.abs(Math.log(v/SPEED[n]));if(n===cur)s-=.12;if(s<bs){bs=s;best=n}}return best}
function rateFor(rb,name){const v=Math.hypot(rb.vx,rb.vz);if(name==='crouch_walk')return Math.min(3.8,Math.max(.6,v/SPEED[name]));
  if(name===rb.walk&&rb.vz<-.1&&Math.abs(rb.vz)>=Math.abs(rb.vx)*.8)return -Math.min(1.8,Math.max(.5,v/SPEED[name]));
  if(SPEED[name])return Math.min(2.2,Math.max(.55,v/SPEED[name]));return 1}
function setW(x,w,n){if(!x)return;if(w>1e-4){if(!ONCE[n]&&!x.isRunning())x.play();x.setEffectiveWeight(w)}else{x.setEffectiveWeight(0);if(!ONCE[n]&&x.isRunning())x.stop()}}
function rotWorld(b,axisW,ang){if(!b||Math.abs(ang)<1e-4)return;b.parent.getWorldQuaternion(_q);_ax.copy(axisW).applyQuaternion(_q.invert());_q2.setFromAxisAngle(_ax,ang);b.quaternion.premultiply(_q2)}
const PROC_BONES=['Bip01_Spine','Bip01_Neck','Bip01_Spine1','Bip01_Spine2','Bip01_L_UpperArm','Bip01_R_UpperArm','Bip01_L_Forearm','Bip01_L_Hand'];
function step(d,dt){const rb=d.rb,inp=rb.in;
  const base=chooseBase(d);setBase(d,base);
  const full=!!FULL[base]||rb.dead;
  /* base weights: crossfade toward the current base, renormalised so the bind pose never leaks in */
  const fade=rb.dead?.14:rb.getUp>0?.45:.2;let sum=0;
  for(const k in rb.lw){const tgt=k===rb.base?1:0;const w=rb.lw[k];rb.lw[k]=tgt>w?Math.min(1,w+dt/fade):Math.max(0,w-dt/fade);sum+=rb.lw[k]}
  if(sum<=0){rb.lw[rb.base]=1;sum=1}
  if(rb.getUp>0)rb.getUp-=dt;
  for(const k in rb.lw){const a=rb.acts[k];if(!a||!a.lo)continue;const r=rateFor(rb,k);a.lo.timeScale=r;for(const x of[a.sp,a.ar])if(x){x.timeScale=r;x.time=a.lo.time}}
  /* upper-body layers: one-shot > aim > hold > locomotion arms */
  const gun=rb.gunType,pist=rb.style==='pistol',longGun=gun&&!pist;
  const v=Math.hypot(rb.vx,rb.vz);
  const aimT=!full&&gun&&inp.aim?1:0;
  const holdT=!full&&longGun&&!inp.aim&&rb.base!=='idle_arms_folded'?1:0;
  rb.aimW+=(aimT-rb.aimW)*Math.min(1,dt*12);rb.holdW+=(holdT-rb.holdW)*Math.min(1,dt*8);
  let oneW=0;if(rb.one){const o=rb.one;o.t+=dt;const a=Math.min(1,o.t/.05),z=Math.min(1,(o.dur-o.t)/.12);oneW=full?0:Math.max(0,Math.min(a,z))*o.peak;if(o.t>=o.dur){rb.one=null;oneW=0}}
  /* crouched with a gun up: the aim stance's torso is kept, then hinged forward at the lower spine (head stays below cover) */
  const crouch=inp.mode==='crouch';
  const WS={},WA={};let remS=1,remA=1;const add=(n,w,armsOnly)=>{if(!n||w<=0)return;WA[n]=(WA[n]||0)+w*remA;remA*=1-w;if(!armsOnly){WS[n]=(WS[n]||0)+w*remS;remS*=1-w}};
  if(rb.one)add(rb.one.name,oneW,false);
  const aimClip=pist?'pistol_aim':'rifle_aim',holdClip=pist?'pistol_idle':'rifle_aim';
  add(aimClip,rb.aimW,false);add(holdClip,rb.holdW,false);
  for(const n in WA){act(rb,n,'ar');act(rb,n,'sp')}
  /* apply weights */
  for(const n in rb.acts){const a=rb.acts[n];const lw=(rb.lw[n]||0)/sum;setW(a.lo,lw,n);setW(a.sp,(WS[n]||0)+remS*lw,n);setW(a.ar,(WA[n]||0)+remA*lw,n);
    if(!(rb.lw[n]>0)&&n!==rb.base)delete rb.lw[n]}
  /* the mixer skips writing a bone whose animated value did not change, so undo last frame's procedural offsets (aim pitch, hinge, IK) first or they accumulate */
  {const B=rb.bones,N=PROC_BONES;
   if(rb.pre)for(const n of N)if(B[n]&&rb.pre[n])B[n].quaternion.copy(rb.pre[n]);
   rb.mixer.update(dt);
   rb.pre=rb.pre||{};for(const n of N)if(B[n])(rb.pre[n]||(rb.pre[n]=B[n].quaternion.clone())).copy(B[n].quaternion)}
  /* phase for the first-person bob and footsteps */
  const ba=rb.acts[rb.base];if(ba&&ba.lo&&SPEED[rb.base]){rb.phase=ba.lo.time/ba.c.dur;d.walk=rb.phase*Math.PI*4}else d.walk*=.9;
  /* aim pitch: split between spine and both upper arms (rotating both arms about the shoulder line keeps the support hand on the gun) */
  let armT=0,spT=0;
  const pa=Math.max(-1.1,Math.min(1.1,inp.pitch||0));
  if(rb.aimW>.01){if(crouch)armT+=rb.aimW*-pa;else{armT+=rb.aimW*(-pa*.55);spT+=rb.aimW*(-pa*.45)}}
  /* hinge: lower spine leans forward, arms and neck turn back by the same world angle so gun and gaze stay level */
  const hw=crouch&&!full?Math.min(1,rb.aimW+(longGun?rb.holdW:0)):0;rb.hinge=(rb.hinge||0)+(hw*.5-(rb.hinge||0))*Math.min(1,dt*10);
  const hinge=rb.hinge>.005?rb.hinge:0;armT-=hinge;
  if(longGun&&rb.holdW>.01&&!full)armT+=rb.holdW*(v>3.6?.3:.38);
  if(rb.reloadT>0&&!full){rb.reloadT-=dt;armT+=.6;spT+=.12}
  if(rb.kick>0){rb.kick=Math.max(0,rb.kick-dt*9);armT-=rb.kick*.06}
  const kk=Math.min(1,dt*14);rb.armP+=(armT-rb.armP)*kk;rb.spineP+=(spT-rb.spineP)*kk;
  if(Math.abs(rb.armP)>.002||Math.abs(rb.spineP)>.002||hinge){const B=rb.bones;_cp.set(1,0,0).applyQuaternion(d.root.getWorldQuaternion(_q2));const left=_v.copy(_cp);
    if(hinge){rotWorld(B.Bip01_Spine,left,hinge);rotWorld(B.Bip01_Neck,left,-hinge*.85)}
    const sp=rb.spineP*.5;rotWorld(B.Bip01_Spine1,left,sp);rotWorld(B.Bip01_Spine2,left,sp);
    rotWorld(B.Bip01_L_UpperArm,left,rb.armP);rotWorld(B.Bip01_R_UpperArm,left,rb.armP)}
  if(longGun&&!full&&d.gun&&d.gunHold&&d.gunHold.visible){const w=Math.min(1,rb.aimW+rb.holdW)*(rb.one?.6:1);if(w>.05)leftHandIK(d,w)}
  /* the King only folds his arms while he is unarmed or calm */
  if(d.gunHold)d.gunHold.visible=!(rb.base==='idle_arms_folded'&&rb.lw.idle_arms_folded>.5);
  /* bodies stay a while, then sink away */
  if(rb.dead){rb.deadT+=dt;if(rb.deadT>12){d.body.position.y=-Math.min(1,(rb.deadT-12)/2.5)*.6;if(rb.deadT>14.5)d.root.visible=false}}}

P.update=function(dt,camera){if(!P.live.length)return;const cp=camera?camera.position:null;P.stats.updates=0;P.stats.skipped=0;
  for(let i=P.live.length-1;i>=0;i--){const d=P.live[i];const rb=d.rb;
    if(!d.root.parent){if(++rb.orphan>90){P.live.splice(i,1);rb.mixer.stopAllAction()}continue}rb.orphan=0;
    rb.acc+=dt;
    /* far or hidden characters animate at a lower rate */
    let every=1;if(cp){const dist=Math.hypot(d.root.position.x-cp.x,d.root.position.z-cp.z);every=dist<22?1:dist<45?2:dist<80?4:8}if(!d.root.visible)every=Math.max(every,6);
    if(rb.dead&&rb.deadT>3)every=Math.max(every,rb.deadT>12?2:10);
    if(++rb.skip<every){P.stats.skipped++;continue}rb.skip=0;const t=Math.min(rb.acc,.25);rb.acc=0;step(d,t);P.stats.updates++}};
P.quality=q=>{qualityFn=()=>q};
HT.People=P;
})();
