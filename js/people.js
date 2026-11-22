/* High Trust · realistic skinned people (assets/people/rocketbox)
   window.HT.People: builds characters that plug into the game's makeDude / pose / equip contract.

   const P = HT.People; P.init({assets, quality:()=>'med'});   // assets = the game's ASSETS (gltf('rb_<key>'))
   P.ready.then(...)                                          // resolves once the shared clips are in (they keep retrying; rejects only without three.js support)
   const d = P.make(role, {variant, scale, idle, look});       // null only for an unknown key / no SkeletonUtils. A known character whose model is still
                                                              // streaming comes back PENDING (d.pending): an invisible stand-in (no meshes drawn, no
                                                              // hitboxes hit) that the game drives as usual; the real model is swapped into the same
                                                              // d / d.root the moment it arrives (P.onSwap(fn) hears about it). Loads retry forever.
                                                              // After P.PENDING_CEILING s the game's P.boxFallback(role, look) may stand in (logged once).
                                                              // role: role: you|gary|rick|dave|doug|thug|boss|wife|son|daughter|earl|dee|rosa|benny|neighbour or a file key
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
/* street crews: one neutral streetwear look across a broad, even mix of people (no costume coding) */
const THUGS=['thug_hoodie','thug_red','thug_cap','thug_jacket','thug_track','thug_f_hood','thug_fro','thug_f_leather','thug_beanie','thug_brown'];
/* owner rule: the street crews are a mixed pool with no group in the majority, in every encounter. The first four (title-screen load, the
   Maple raids) are two and two, and the shuffle bag alternates the two skin-tone halves of the pool so a fight never skews one way. */
const TONE_A={thug_hoodie:1,thug_cap:1,thug_track:1,thug_fro:1,thug_beanie:1};
/* Riverside Flats (on demand, only there): four job-givers, and a civilian neighbour pool drawn from the same broad mix as the street crews */
const GIVERS=['earl','dee','rosa','benny'];
const NEIGHBOURS=['nb_gran','nb_pops','nb_office','nb_sweater','nb_teen','nb_kid','nb_kenji','nb_marcus','nb_mei','nb_lucia'];
const NB={};for(const k of NEIGHBOURS)NB[k]=1;
const KEYS=['dad_player','dad_gary','dad_rick','dad_dave','dad_doug','thug_hoodie','thug_red','thug_cap','thug_jacket','boss','wife','son','daughter'].concat(THUGS.slice(4));
const GAME_KEYS=KEYS.slice(0,10);/* in the ASSETS manifest (title-screen load); the other street-crew variants stream in right after, family on demand */
const STREAM_KEYS=THUGS.slice(4);
const ROLE={earl:'earl',dee:'dee',rosa:'rosa',benny:'benny',neighbour:NEIGHBOURS,you:'dad_player',player:'dad_player',gary:'dad_gary',rick:'dad_rick',dave:'dad_dave',doug:'dad_doug',boss:'boss',wife:'wife',son:'son',daughter:'daughter',
  thug:THUGS};
const SCALE={dad_dave:1.15,boss:1.06,nb_teen:.95};
/* per-character fix-ups (none needed now): hide parts of the source outfit by material name, add a fabric cap (sRGB) */
const HIDE={};const CAP_ADD={};
/* caps that sit too low over the eyes on a high, bald forehead (Earl): lift the whole cap a little */
const CAP_LIFT={earl:.022};
const IDLE={dad_player:'idle',dad_gary:'idle_look',dad_rick:'idle',dad_dave:'idle',dad_doug:'idle',thug_hoodie:'idle_nervous',thug_track:'idle_angry',thug_beanie:'idle_nervous',thug_red:'idle_angry',boss:'idle_arms_folded',wife:'f_idle',son:'idle',daughter:'f_idle'};
const FEMALE={wife:1,daughter:1,thug_f_hood:1,thug_f_leather:1};
Object.assign(IDLE,{earl:'idle_look',dee:'f_idle',rosa:'f_idle',benny:'idle',nb_gran:'f_idle',nb_pops:'idle_look',nb_office:'f_idle',nb_sweater:'idle',nb_teen:'f_idle',nb_kid:'idle_look',nb_kenji:'idle_look',nb_marcus:'idle',nb_mei:'f_idle',nb_lucia:'f_idle'});
Object.assign(FEMALE,{dee:1,rosa:1,nb_gran:1,nb_office:1,nb_teen:1,nb_mei:1,nb_lucia:1});
Object.assign(IDLE,{thug_fro:'idle_angry',thug_jacket:'idle_nervous',thug_brown:'idle_angry',thug_cap:'idle_nervous',thug_f_hood:'f_idle',thug_f_leather:'f_idle'});
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

const P={ok:false,failed:false,keys:KEYS.concat(GIVERS,NEIGHBOURS),giverKeys:GIVERS,neighbourKeys:NEIGHBOURS,roles:ROLE,live:[],GUN_FIT,stats:{updates:0,skipped:0}};
let A=null,qualityFn=()=>'med',resolveReady,rejectReady;
P.ready=new Promise((r,j)=>{resolveReady=r;rejectReady=j});P.ready.catch(()=>{});
const tpl={};/* key -> prepared template {scene, hip} */
let srcClips=null;const clipCache={};
const loader=T&&T.GLTFLoader?new T.GLTFLoader():null;
const extra={};/* gltfs loaded on demand (family) */

P.files=()=>GAME_KEYS.concat(['anims']).map(k=>({name:'rb_'+k,url:BASE+k+'.glb'}));
P.init=function(o){o=o||{};if(o.assets)A=o.assets;if(o.quality)qualityFn=o.quality;
  if(P._initDone)return P.ready;P._initDone=true;
  if(!T||!T.SkeletonUtils){P.failed=true;rejectReady(new Error('people: no SkeletonUtils'));return P.ready}
  /* every people file the game's loader delivers (it retries with backoff on its own) is prepared and handed to whoever waits for it */
  if(A&&A.onAsset)A.onAsset(src=>{const m=/people\/rocketbox\/(\w+)\.glb$/.exec(String(src));if(m&&KNOWN.has(m[1]))arrived(m[1])});
  const wait=A&&A.ready?A.ready:Promise.resolve();
  wait.then(()=>{try{if(!prepareAll())load('anims')}catch(e){console.warn('people: prepare failed',e)}});
  if(!P._tick)P._tick=setInterval(tick,400);/* also runs while the render loop is paused (hidden tab, tests) */
  return P.ready};
function gltf(key){return extra[key]||(A&&A.gltf?A.gltf('rb_'+key):null)}
/* the shared clips are what makes any character possible: until they are in, every character waits (pending) */
function prepareAll(){if(srcClips)return true;const an=gltf('anims');if(!an||!an.animations||!an.animations.length)return false;
  const sc={};for(const c of an.animations)sc[c.name]=c;srcClips=sc;
  for(const k of GAME_KEYS)if(gltf(k))try{prep(k)}catch(e){console.warn('people: prepare failed for',k,e)}
  P.ok=true;resolveReady(P);streamLater();setTimeout(tick,0);return true}
/* the six extra thug looks stream in after the title's Start is ready, not alongside the boot pack (PERF-05 load budget) */
function streamLater(){const A=typeof window!=='undefined'&&window.__ht&&window.__ht.assets;if(A&&!A.done){setTimeout(streamLater,400);return}setTimeout(()=>P.preload(STREAM_KEYS),A?1500:0)}

/* ---------- loading that never gives up ----------
   Files in the game's manifest (GAME_KEYS, anims) come through the game's loader, which retries with backoff; if one is still missing a
   few seconds after it was asked for, this loader fetches it too. Everything else (givers, neighbours, family, street-crew variants) is
   fetched here, retried with backoff (0.8 s growing to 10 s) for as long as a pending character needs it or for 3 minutes after a preload. */
const KNOWN=new Set(P.keys.concat(['anims'])),MANIFEST=new Set(GAME_KEYS.concat(['anims']));
const LS={},waiters={};const now=()=>(typeof performance!=='undefined'?performance.now():Date.now());
P.loadStats=()=>{const o={};for(const k in LS)o[k]={tries:LS[k].tries,busy:LS[k].busy,waiting:!!LS[k].timer,have:k==='anims'?!!srcClips:!!tpl[k]};return o};
function have(key){return key==='anims'?!!srcClips:!!tpl[key]}
/* still needed: preloaded in the last 3 minutes, or a waiting character that is in the scene (or was made in the last 15 s and may be added yet).
   A character the game dropped stops the retries; if it comes back into the scene, tick() starts them again. */
function onStage(d){let a=d.root;while(a.parent)a=a.parent;return !!a.isScene||now()-(d.rb||d._rb).t0<15000}
function wanted(key){const s=LS[key];if(s&&s.until>now())return true;if(key==='anims'&&!srcClips)return true;for(const d of pending)if((key==='anims'||(d.rb||d._rb).key===key)&&onStage(d))return true;return false}
function settle(key,ok){const w=waiters[key];if(!w)return;delete waiters[key];for(const f of w)try{f(ok)}catch(e){}}
function arrived(key){try{if(key==='anims')prepareAll();else if(srcClips||gltf(key))prep(key)}catch(e){console.warn('people: prepare failed for',key,e)}
  if(have(key)||(key!=='anims'&&tpl[key]))settle(key,true);tick()}
function load(key){if(!KNOWN.has(key)||have(key))return;const s=LS[key]||(LS[key]={tries:0,busy:false,timer:0,t0:now(),until:0});
  if(gltf(key)){arrived(key);if(have(key))return}/* gltf() also asks the game's loader for manifest files */
  if(s.busy||s.timer)return;
  if(MANIFEST.has(key)&&A&&A.gltf&&!s.tries){const left=4000-(now()-s.t0);if(left>0){s.timer=setTimeout(()=>{s.timer=0;load(key)},left);return}}
  if(!loader)return;s.busy=true;
  loader.load(BASE+key+'.glb',g=>{s.busy=false;s.tries=0;if(!gltf(key)){g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});extra[key]=g}arrived(key)},undefined,
    ()=>{s.busy=false;s.tries++;settle(key,false);if(!wanted(key))return;
      const wait=Math.min(10000,800*Math.pow(1.8,s.tries-1))*(.8+Math.random()*.4);s.timer=setTimeout(()=>{s.timer=0;load(key)},wait)})}
/* resolves true once the key is prepared, false after a failed attempt (it keeps retrying behind that) */
P.preload=function(keys){return Promise.all((keys||[]).map(k=>{const r=ROLE[k];if(typeof r==='string')k=r;if(tpl[k])return true;if(!KNOWN.has(k))return false;
  const s=LS[k]||(LS[k]={tries:0,busy:false,timer:0,t0:now(),until:0});s.until=now()+180e3;if(!srcClips)load('anims');
  return new Promise(res=>{(waiters[k]||(waiters[k]=[])).push(res);load(k);if(tpl[k])settle(k,true)})}))};
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
  /* one draw for body+head: merge the two skinned primitives with a side-by-side texture atlas */
  try{atlasBodyHead(s)}catch(e){console.warn('people: atlas skipped for',key,e)}
  /* Coach Rick reads too young: salt-and-pepper hair */
  if(key==='dad_rick')s.traverse(o=>{if(o.isMesh&&o.material&&/opacity|hair/i.test(o.material.name)&&o.material.map)greyHair(o.material.map,.72)});
  if(HIDE[key])s.traverse(o=>{if(o.isMesh&&o.material&&HIDE[key].test(o.material.name)){o.visible=false;o.castShadow=false}});
  if(CAP_ADD[key]&&!B('acc_cap')){const head=B('Bip01_Head');if(head)head.add(makeCap(s,head,new T.Color(CAP_ADD[key]).convertSRGBToLinear(),key))}
  /* caps: replace the stiff helmet-like shell with a proper fabric baseball cap */
  const cap=B('acc_cap');if(cap){const col=(cap.material&&cap.material.color)?cap.material.color.clone():new T.Color(.05,.05,.1);cap.visible=false;cap.castShadow=false;
    const head=B('Bip01_Head');if(head)head.add(makeCap(s,head,col,key))}
  /* Benny's apron hangs a few mm off the body: no self-shadow speckle on it */
  const apron=B('acc_apron');if(apron)apron.traverse(o=>{if(o.isMesh)o.receiveShadow=false});
  if(key==='boss'){const head=B('Bip01_Head'),neck=B('Bip01_Spine2');if(head)head.add(makeCrown(s,head));if(neck)neck.add(makeChain())}
  if(!NB[key])for(const h of HITBOX){const b=B(h[0]);if(!b)continue;const m=new T.Mesh(hbGeo(h[2],h[3],h[4],h[5],h[6],h[7]),hitMat);m.name='hit_'+h[0];m.userData.hitbox=true;m.userData.head=h[1];m.castShadow=false;m.receiveShadow=false;m.frustumCulled=false;b.add(m)}
  const hand=B('Bip01_R_Hand');if(hand){const gh=new T.Group();gh.name='gunHold';hand.add(gh)}
  return tpl[key]={scene:s,hip,key}}

function greyHair(t,k){const im=t.image;if(!im||!im.width)return;try{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
    const d=x.getImageData(0,0,c.width,c.height),a=d.data;for(let i=0;i<a.length;i+=4){const l=(a[i]*.3+a[i+1]*.59+a[i+2]*.11);
      /* grey strands: lift and desaturate, keep some dark for pepper */const n=((i>>2)*2654435761>>>0)%100<55;const g=n?Math.min(255,l*1.9+70):l*1.15+18;
      a[i]+=(g-a[i])*k;a[i+1]+=(g-a[i+1])*k;a[i+2]+=(g*1.02-a[i+2])*k}x.putImageData(d,0,0);t.image=c;t.needsUpdate=true}catch(e){}}
function atlasBodyHead(s){let body=null,head=null;s.traverse(o=>{if(!o.isSkinnedMesh||Array.isArray(o.material))return;const n=o.material.name||'';if(/_body$/.test(n))body=o;else if(/_head$/.test(n))head=o});
  if(!body||!head||body.skeleton!==head.skeleton&&body.skeleton.bones.length!==head.skeleton.bones.length||body.parent!==head.parent)return;
  const gb=body.geometry,gh=head.geometry;const names=['position','normal','uv','skinIndex','skinWeight'];for(const n of names)if(!gb.attributes[n]||!gh.attributes[n])return;
  if(gh.morphAttributes&&Object.keys(gh.morphAttributes).length)return;
  const mb=body.material,mh=head.material;
  const slot=(tb,th,fill)=>{if(!tb&&!th)return null;const H=Math.max(...[tb,th].filter(Boolean).map(t=>t.image&&t.image.height||0),64);const c=document.createElement('canvas');c.width=H*2;c.height=H;const x=c.getContext('2d');
    for(const[t,ox]of[[tb,0],[th,H]]){if(t&&t.image)x.drawImage(t.image,ox,0,H,H);else{x.fillStyle=fill;x.fillRect(ox,0,H,H)}}
    const ref=tb||th;const tx=new T.CanvasTexture(c);tx.flipY=ref.flipY;tx.encoding=ref.encoding;tx.wrapS=tx.wrapT=T.ClampToEdgeWrapping;tx.anisotropy=ref.anisotropy;return tx};
  const m=mb.clone();m.name=mb.name.replace(/_body$/,'_bodyhead');
  m.map=slot(mb.map,mh.map,'#ffffff');m.normalMap=slot(mb.normalMap,mh.normalMap,'rgb(128,128,255)');
  const mr=slot(mb.roughnessMap,mh.roughnessMap,'rgb(255,230,0)');m.roughnessMap=mr;if(mb.metalnessMap||mh.metalnessMap)m.metalnessMap=mr;
  /* geometry: concatenate, head UVs into the right half */
  const out=new T.BufferGeometry();const nb=gb.attributes.position.count;
  /* optimised GLBs quantise attributes (normalised ints): work in floats, keep joint indices integer */
  /* r128 getX returns the raw integer, so denormalise by hand (glTF: int8/127, uint8/255, int16/32767, uint16/65535) */
  const NORM={Int8Array:127,Uint8Array:255,Int16Array:32767,Uint16Array:65535};
  const deq=(at,int)=>{const n=at.count*at.itemSize,o=int?new Uint16Array(n):new Float32Array(n),g=[at.getX,at.getY,at.getZ,at.getW];
    const k0=(!int&&at.normalized&&NORM[at.array.constructor.name])||1;
    for(let i=0;i<at.count;i++)for(let k=0;k<at.itemSize;k++){const v=g[k].call(at,i)/k0;o[i*at.itemSize+k]=int?v:(at.normalized&&k0>1&&at.array.constructor.name[0]==='I'?Math.max(-1,v):v)}return o};
  for(const n of names){const a=gb.attributes[n],b=gh.attributes[n],int=n==='skinIndex';const A=deq(a,int),Bv=deq(b,int);const arr=int?new Uint16Array(A.length+Bv.length):new Float32Array(A.length+Bv.length);arr.set(A,0);arr.set(Bv,A.length);
    if(n==='uv'){for(let i=0;i<a.count;i++)arr[i*2]=arr[i*2]*.5;for(let i=a.count;i<a.count+b.count;i++)arr[i*2]=arr[i*2]*.5+.5}
    out.setAttribute(n,new T.BufferAttribute(arr,a.itemSize,false))}
  const ib=gb.index?gb.index.array:[...Array(nb).keys()],ih=gh.index?gh.index.array:[...Array(gh.attributes.position.count).keys()];
  const idx=new Uint32Array(ib.length+ih.length);idx.set(ib,0);for(let i=0;i<ih.length;i++)idx[ib.length+i]=ih[i]+nb;out.setIndex(new T.BufferAttribute(idx,1));
  /* optional vertex colours: keep them (white where one side has none), else make sure the material does not ask for them */
  if(gb.attributes.color||gh.attributes.color){const isz=(gb.attributes.color||gh.attributes.color).itemSize;const side=(g)=>{const at=g.attributes.color,n=g.attributes.position.count;if(!at)return new Float32Array(n*isz).fill(1);
      const v=deq(at,false);if(at.itemSize===isz)return v;const o=new Float32Array(n*isz).fill(1);for(let i=0;i<n;i++)for(let k=0;k<Math.min(isz,at.itemSize);k++)o[i*isz+k]=v[i*at.itemSize+k];return o};
    const A=side(gb),Bc=side(gh),arr=new Float32Array(A.length+Bc.length);arr.set(A,0);arr.set(Bc,A.length);out.setAttribute('color',new T.BufferAttribute(arr,isz))}
  else if(m.vertexColors){m.vertexColors=false;m.needsUpdate=true}
  if(gb.morphAttributes&&gb.morphAttributes.position){out.morphAttributes={};for(const k in gb.morphAttributes){out.morphAttributes[k]=gb.morphAttributes[k].map(a=>{const arr=new Float32Array((nb+gh.attributes.position.count)*a.itemSize);arr.set(deq(a,false),0);return new T.BufferAttribute(arr,a.itemSize)})}out.morphTargetsRelative=gb.morphTargetsRelative}
  const sm=new T.SkinnedMesh(out,m);sm.name=body.name;sm.castShadow=true;sm.receiveShadow=true;sm.frustumCulled=true;
  if(gb.morphAttributes&&gb.morphAttributes.position){sm.morphTargetInfluences=(body.morphTargetInfluences||[]).slice();sm.morphTargetDictionary=Object.assign({},body.morphTargetDictionary||{});m.morphTargets=true}
  out.computeBoundingSphere();out.boundingSphere.center.set(0,.85,0);out.boundingSphere.radius=Math.max(out.boundingSphere.radius,1.45);out.userData.rbBounds=1;
  sm.position.copy(body.position);sm.quaternion.copy(body.quaternion);sm.scale.copy(body.scale);
  body.parent.add(sm);sm.bind(body.skeleton,body.bindMatrix);body.parent.remove(body);head.parent.remove(head)}
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
  s.traverse(o=>{if(!o.isMesh||!o.visible||/acc_|hit_/.test(o.name))return;const p=o.geometry.attributes.position;const sk=o.geometry.attributes.skinIndex,sw=o.geometry.attributes.skinWeight;if(!sk||!o.skeleton)return;
    const hb=o.skeleton.bones.indexOf(head);if(hb<0)return;
    for(let i=0;i<p.count;i++){let w=0;const si=[sk.getX(i),sk.getY(i),sk.getZ(i),sk.getW(i)],ws=[sw.getX(i),sw.getY(i),sw.getZ(i),sw.getW(i)];for(let k=0;k<4;k++)if(si[k]===hb)w+=ws[k];if(w<.5)continue;
      v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).applyMatrix4(inv);if(v.x<.1)continue;bb.expandByPoint(v);n++}});
  return n>20?bb:null}
/* cap space: y up, z forward; mapped into head space (x up, y forward, z left) */
const CAP2HEAD=new T.Matrix4().makeBasis(new T.Vector3(0,0,1),new T.Vector3(1,0,0),new T.Vector3(0,1,0));
function makeCap(s,head,col,key){let bb=skull(s,head);P._skull=P._skull||{};P._skull[key]=bb&&[bb.min.toArray(),bb.max.toArray()];bb=bb||new T.Box3(new T.Vector3(.1,-.11,-.085),new T.Vector3(.22,.1,.085));
  const g=new T.Group();g.name='rb_cap';g.applyMatrix4(CAP2HEAD);
  const hw=Math.min((bb.max.z-bb.min.z)/2+.012,.095),hd=Math.min((bb.max.y-bb.min.y)/2+.012,.118),cz=(bb.max.y+bb.min.y)/2-.004,top=bb.max.x+.004+(CAP_LIFT[key]||0);
  const base=top-.088;/* low crown: the band sits just above the brow line */
  const fab=new T.MeshStandardMaterial({color:col,roughness:.96,metalness:0,normalMap:fabricNormal(),normalScale:new T.Vector2(.55,.55)});
  fab.color.multiplyScalar(1.15);
  /* crown: squashed half-dome, slightly higher at the front panel */
  const cg=new T.SphereGeometry(1,28,10,0,Math.PI*2,0,Math.PI*.52);const p=cg.attributes.position;
  for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const yy=Math.max(y,-.05);/* flatter top, straighter sides */const yf=yy>0?Math.pow(yy,.62):yy;p.setXYZ(i,x*hw,base+yf*(top-base)+z*.014*(1-yy),cz+z*hd)}
  cg.computeVertexNormals();const crown=new T.Mesh(cg,fab);crown.castShadow=true;g.add(crown);
  /* curved brim: arched across, gently pitched down */
  const bw=hw*1.0,bl=.1,seg=16,rows=5,pos=[],idx=[],uv=[];
  for(let r=0;r<=rows;r++){const t=r/rows;for(let c=0;c<=seg;c++){const u=c/seg*2-1;const ang=u*1.05;
    const ex=Math.sin(ang)*bw*(1-t*.18),ez=Math.cos(ang)*hd*.92+t*bl*(1-u*u*.55);
    /* arched across (edges curl down), gently pitched down */const ey=base+.004+Math.cos(ang)*.014-t*bl*.12-(u*u)*.034*(.3+t);pos.push(ex,ey,cz+ez);uv.push(c/seg,t)}}
  for(let r=0;r<rows;r++)for(let c=0;c<seg;c++){const a=r*(seg+1)+c,b=a+1,d=a+seg+1,e=d+1;idx.push(a,d,b,b,d,e)}
  const brG=new T.BufferGeometry();brG.setAttribute('position',new T.Float32BufferAttribute(pos,3));brG.setAttribute('uv',new T.Float32BufferAttribute(uv,2));brG.setIndex(idx);brG.computeVertexNormals();
  fab.side=T.DoubleSide;const brim=new T.Mesh(brG,fab);brim.castShadow=true;g.add(brim);
  /* under-brim and the band inside the crown edge */
  const btn=new T.Mesh(new T.SphereGeometry(.011,8,6),fab);btn.position.set(0,top+.003,cz);btn.scale.y=.5;btn.castShadow=true;g.add(btn);
  mergeStatic(g);return g}
function makeCrown(s,head){const bb=skull(s,head)||new T.Box3(new T.Vector3(.1,-.11,-.085),new T.Vector3(.22,.1,.085));
  const g=new T.Group();g.name='rb_crown';g.applyMatrix4(CAP2HEAD);
  const gold=new T.MeshStandardMaterial({color:new T.Color(1,.72,.22),metalness:1,roughness:.28,envMapIntensity:1.4});
  const r=Math.max((bb.max.z-bb.min.z),(bb.max.y-bb.min.y))/2*.82,cz=(bb.max.y+bb.min.y)/2,y=bb.max.x-.045;
  const band=new T.Mesh(new T.CylinderGeometry(r,r*.97,.05,24,1,true),gold);band.position.set(0,y,cz);band.material.side=T.DoubleSide;g.add(band);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const sp=new T.Mesh(new T.ConeGeometry(.016,.05,4),gold);sp.position.set(Math.sin(a)*r,y+.045,cz+Math.cos(a)*r);g.add(sp);
    /* gems ride on the gold material via vertex colours so the whole crown is one draw */
    const gg=new T.SphereGeometry(.009,6,4);const gc=new T.Color(i%2?0x9a1030:0x1a4ad0).convertSRGBToLinear(),ca=new Float32Array(gg.attributes.position.count*3);for(let v=0;v<ca.length;v+=3){ca[v]=gc.r*3;ca[v+1]=gc.g*3;ca[v+2]=gc.b*3}gg.setAttribute('color',new T.BufferAttribute(ca,3));
    const gem=new T.Mesh(gg,gold);gem.position.set(Math.sin(a)*r*1.04,y,cz+Math.cos(a)*r*1.04);g.add(gem)}
  /* gold parts: white vertex colour (the material colour stays the gold) */
  g.traverse(o=>{if(o.isMesh&&!o.geometry.attributes.color)o.geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(o.geometry.attributes.position.count*3).fill(1),3))});gold.vertexColors=true;
  g.traverse(o=>{if(o.isMesh)o.castShadow=true});mergeStatic(g);return g}
function makeChain(){/* gold rope chain over the shirt, hangs from the neck onto the chest (Spine2 space: x up, y forward, z left) */
  const gold=new T.MeshStandardMaterial({color:new T.Color(1,.74,.25),metalness:1,roughness:.3,envMapIntensity:1.4});
  const pts=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;const fy=Math.cos(a);pts.push(new T.Vector3(.2-(fy>0?fy*fy*.11:0),.04+Math.max(0,fy)*.1+Math.min(0,fy)*.06,Math.sin(a)*.085))}
  const curve=new T.CatmullRomCurve3(pts,true);const m=new T.Mesh(new T.TubeGeometry(curve,48,.0075,6,true),gold);m.name='rb_chain';m.castShadow=true;
  const pend=new T.Mesh(new T.CylinderGeometry(.03,.03,.008,16),gold);pend.rotation.x=Math.PI/2;pend.position.set(.085,.155,0);const g=new T.Group();g.add(m);g.add(pend);mergeStatic(g);return g}

/* ---------- draw-call batching ----------
   mergeStatic(root, dyn): every mesh under root is merged, per material, into the frame of its nearest "moving" ancestor
   (root itself or a node in dyn). Looks are identical (same materials, same triangles); originals with children keep their
   place with an empty geometry so muzzle/eject markers and moving parts stay where they were. */
const EMPTY=new T.BufferGeometry();
function attrSig(g){return Object.keys(g.attributes).sort().map(k=>{const a=g.attributes[k];return k+a.itemSize+a.array.constructor.name+(a.normalized?'n':'')}).join(',')}
function mergeStatic(root,dyn){dyn=dyn||new Set();root.updateMatrixWorld(true);const groups=new Map();const inv=new T.Matrix4(),M=new T.Matrix4();
  root.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||o===root||dyn.has(o)||Array.isArray(o.material)||!o.geometry||!o.geometry.attributes.position||o.geometry.morphAttributes&&Object.keys(o.geometry.morphAttributes).length)return;
    let vis=true;for(let q=o;q&&q!==root;q=q.parent)if(!q.visible)vis=false;if(!vis||(o.userData&&o.userData.hitbox))return;
    let a=o.parent;while(a&&a!==root&&!dyn.has(a))a=a.parent;if(!a)return;
    const k=a.uuid+'|'+o.material.uuid+'|'+attrSig(o.geometry)+'|'+o.castShadow;let g=groups.get(k);if(!g)groups.set(k,g={anchor:a,mat:o.material,list:[],cast:o.castShadow,recv:o.receiveShadow});g.list.push(o)});
  let removed=0;
  for(const g of groups.values()){if(g.list.length<2)continue;inv.copy(g.anchor.matrixWorld).invert();const parts=[];
    for(const o of g.list){M.multiplyMatrices(inv,o.matrixWorld);const gg=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(M);parts.push(gg)}
    const out=new T.BufferGeometry();for(const name of Object.keys(parts[0].attributes)){const a0=parts[0].attributes[name];let n=0;for(const q of parts)n+=q.attributes[name].array.length;
      const arr=new a0.array.constructor(n);let off=0;for(const q of parts){arr.set(q.attributes[name].array,off);off+=q.attributes[name].array.length}out.setAttribute(name,new T.BufferAttribute(arr,a0.itemSize,a0.normalized))}
    out.computeBoundingSphere();const m=new T.Mesh(out,g.mat);m.name='rb_merged';m.castShadow=g.cast;m.receiveShadow=g.recv;g.anchor.add(m);
    for(const o of g.list){if(o.children.length){o.geometry=EMPTY;o.castShadow=false}else o.parent.remove(o);removed++}}
  return removed}
/* in third person only the pump moves (People's pump stroke); muzzle/eject are markers */
const GUN_DYN=/^(pump|muzzle|eject)$/;
/* barrel axis in gun space: from the grip origin toward the muzzle marker when the model has one (else +Z) */
function gunAxis(gun){if(gun.userData.rbAxis)return gun.userData.rbAxis;let ax=new T.Vector3(0,0,1);const mz=gun.getObjectByName('muzzle');
  if(mz){gun.updateMatrixWorld(true);const p=mz.getWorldPosition(new T.Vector3()).applyMatrix4(new T.Matrix4().copy(gun.matrixWorld).invert());p.y=0;if(p.lengthSq()>1e-4)ax=p.normalize()}
  return gun.userData.rbAxis=ax}
function batchGun(gun){if(!gun||gun.userData.rbBatched)return;gun.userData.rbBatched=true;gunAxis(gun);const dyn=new Set();
  gun.traverse(o=>{if(o!==gun&&GUN_DYN.test(o.name))dyn.add(o)});
  try{mergeStatic(gun,dyn);buildGunLod(gun)}catch(e){console.warn('people: gun batching skipped',e)}}
/* far stand-in: the whole gun as one mesh, material colours baked into vertex colours (textures are invisible at that range) */
const lodMats={};
function buildGunLod(gun){gun.updateMatrixWorld(true);const inv=new T.Matrix4().copy(gun.matrixWorld).invert(),M=new T.Matrix4(),col=new T.Color();const parts=[],detail=[];let rs=0,ms=0,n=0;
  gun.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||Array.isArray(o.material)||!o.geometry.attributes.position||!o.geometry.attributes.position.count)return;let vis=true;for(let q=o;q&&q!==gun;q=q.parent)if(!q.visible)vis=false;if(!vis)return;
    detail.push(o);M.multiplyMatrices(inv,o.matrixWorld);const g0=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();const g=new T.BufferGeometry();
    g.setAttribute('position',g0.attributes.position.clone());if(g0.attributes.normal)g.setAttribute('normal',g0.attributes.normal.clone());else g.computeVertexNormals();g.applyMatrix4(M);
    const m=o.material,c=m.color||col.set(1,1,1);const cnt=g.attributes.position.count,ca=new Float32Array(cnt*3),vc=m.vertexColors&&g0.attributes.color;
    for(let i=0;i<cnt;i++){const k=vc?[vc.getX(i),vc.getY(i),vc.getZ(i)]:[1,1,1];ca[i*3]=c.r*k[0];ca[i*3+1]=c.g*k[1];ca[i*3+2]=c.b*k[2]}
    g.setAttribute('color',new T.BufferAttribute(ca,3));parts.push(g);rs+=(m.roughness!=null?m.roughness:.6)*cnt;ms+=(m.metalness||0)*cnt;n+=cnt});
  if(parts.length<2)return;let tot=0;for(const g of parts)tot+=g.attributes.position.count;const out=new T.BufferGeometry();
  for(const name of['position','normal','color']){const arr=new Float32Array(tot*3);let off=0;for(const g of parts){arr.set(g.attributes[name].array,off);off+=g.attributes[name].array.length}out.setAttribute(name,new T.BufferAttribute(arr,3))}
  out.computeBoundingSphere();const r=Math.round(rs/n*10)/10,mt=Math.round(ms/n*10)/10,key=r+'|'+mt;
  const mat=lodMats[key]||(lodMats[key]=new T.MeshStandardMaterial({vertexColors:true,roughness:r,metalness:mt}));
  const lod=new T.Mesh(out,mat);lod.name='rb_gunlod';lod.visible=false;lod.castShadow=false;gun.add(lod);gun.userData.rbLod={lod,detail,on:false}}
function gunLod(d,on){const L=d.gun&&d.gun.userData.rbLod;if(!L||L.on===on)return;L.on=on;L.lod.visible=on;for(const o of L.detail)o.visible=!on}
P.batchGun=batchGun;P.mergeStatic=mergeStatic;

/* ---------- instances ---------- */
/* crews: a shuffle bag over the variants that are loaded, so the spread stays even and no two spawned in a row look alike */
const bags={};
function draw(list,role){const avail=list.filter(k=>tpl[k]||gltf(k));if(!avail.length)return list[0];let b=bags[role];
  if(!b||!b.q.length||b.n!==avail.length){const q=avail.slice();for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]]}
    if(role==='thug'){const a=q.filter(k=>TONE_A[k]),z=q.filter(k=>!TONE_A[k]);q.length=0;const f=Math.random()<.5;for(let i=0;i<Math.max(a.length,z.length);i++){const x=f?a[i]:z[i],y=f?z[i]:a[i];if(y)q.push(y);if(x)q.push(x)}}
    if(b&&b.last&&q.length>1&&q[q.length-1]===b.last)[q[0],q[q.length-1]]=[q[q.length-1],q[0]];bags[role]=b={q,n:avail.length,last:b&&b.last}}
  const k=b.q.pop();b.last=k;return k}
function resolveKey(role,variant){let k=ROLE[role]!==undefined?ROLE[role]:role;if(Array.isArray(k))k=variant&&k.includes(variant)?variant:draw(k,role);return k}
P.usable=()=>!!(T&&T.SkeletonUtils&&!P.failed);
P.make=function(role,o){o=o||{};if(!T||!T.SkeletonUtils||P.failed)return null;if(!srcClips)try{prepareAll()}catch(e){}
  const key=resolveKey(role,o.variant);let t=null;if(srcClips)try{t=tpl[key]||prep(key)}catch(e){console.warn('people: prepare failed for',key,e)}
  if(t){const d=build(t,key,o);P.live.push(d);return d}
  if(!KNOWN.has(key))return null;
  return makePending(key,role,o)};
function build(t,key,o){
  const body=T.SkeletonUtils.clone(t.scene);body.name='rb_'+key;
  const root=new T.Group();root.add(body);const sc=(SCALE[key]||1)*(o.scale||1);if(sc!==1)root.scale.setScalar(sc);
  const meshes=[];let head=null,gunHold=null,skinned=[];
  body.traverse(n=>{if(n.userData&&n.userData.hitbox){meshes.push(n);if(n.userData.head)head=n}else if(n.isSkinnedMesh)skinned.push(n);if(n.name==='gunHold')gunHold=n});
  const bones={};for(const n of['Bip01_Pelvis','Bip01_Spine','Bip01_Spine1','Bip01_Spine2','Bip01_Neck','Bip01_Head','Bip01_L_UpperArm','Bip01_R_UpperArm','Bip01_R_Hand','Bip01_L_Forearm','Bip01_L_Hand','Bip01_L_Finger2','Bip01_R_Forearm','Bip01_L_Toe0','Bip01_R_Toe0','Bip01_L_Foot','Bip01_R_Foot'])bones[n]=body.getObjectByName(n);
  const mixer=new T.AnimationMixer(body);
  const female=!!FEMALE[key];
  const rb={key,hip:t.hip,mixer,body,bones,skinned,acts:{},lw:{},aimW:0,holdW:0,armP:0,spineP:0,one:null,
    idle:o.idle||IDLE[key]||'idle',walk:female?'f_walk':'walk',female,
    in:{mode:'stand',aim:false,moving:false,pitch:0},v:0,vx:0,vz:0,lx:null,lz:null,base:null,dead:false,deadT:0,gunType:null,acc:0,skip:0,orphan:0,phase:0};
  /* legs/arms: inert stand-ins so old code that pokes box-dude limbs does nothing harmful */
  const stub=()=>new T.Object3D();
  const d={root,body,meshes,head,gunHold,gun:null,walk:0,legs:[stub(),stub()],arms:[stub(),stub()],rb,people:true};if(NB[key])d.neighbour=true;
  /* start in idle so a freshly spawned character is never seen in the bind pose */
  setBase(d,rb.idle,true);step(d,0);mixer.update(Math.random()*3);
  return d}

/* ---------- pending characters ----------
   A known character whose model is not in yet: same contract as a real one (root, body, gunHold, meshes, rb, legs/arms stubs), nothing drawn
   (the root reports itself invisible while pending, whatever the game sets), hitboxes that rays pass through. The game keeps driving it
   (position, follow, pose inputs, equip, die), the inputs are kept, and fill() turns it into the real character in place. */
const pending=[];P.pending=pending;P.PENDING_CEILING=60;let fbLogged=false;
const swapCbs=[];P.onSwap=f=>{swapCbs.push(f)};P.boxFallback=null;
const noRay=function(){};
function pendVisible(root){root._htVis=root.visible!==false;root._htPend=true;
  Object.defineProperty(root,'visible',{configurable:true,enumerable:true,get(){return this._htVis&&!this._htPend},set(v){this._htVis=!!v}})}
function makePending(key,role,o){
  const root=new T.Group();root.name='rb_pending_'+key;pendVisible(root);
  const body=new T.Group();body.name='rb_'+key;body.userData.pending=true;root.add(body);/* named like a real body, so name-based checks (HT.People.isProtected) see who it is */
  const gunHold=new T.Group();gunHold.name='gunHold';gunHold.visible=false;body.add(gunHold);
  const hb=(h,y,head)=>{const m=new T.Mesh(hbGeo(.42,h,.32,0,y,0),hitMat);m.userData.hitbox=true;m.userData.head=!!head;m.userData.pendingHit=true;m.raycast=noRay;m.castShadow=false;m.frustumCulled=false;body.add(m);return m};
  /* neighbours carry no hitboxes (not targets); everyone else gets two that rays pass through until the model is in */
  const head=NB[key]?null:hb(.3,1.68,true),torso=NB[key]?null:hb(1.45,.78,false);
  const sc=(SCALE[key]||1)*(o.scale||1);if(sc!==1)root.scale.setScalar(sc);
  const stub=()=>new T.Object3D();
  const rb={key,pending:true,t0:now(),role,opts:o,acts:{},lw:{},in:{mode:'stand',aim:false,moving:false,pitch:0},dead:false,gunType:null,style:null,v:0,vx:0,vz:0,lx:null,lz:null,acc:0,skip:0,orphan:0,phase:0,female:!!FEMALE[key]};
  const d={root,body,meshes:head?[head,torso]:[],head,gunHold,gun:null,walk:0,legs:[stub(),stub()],arms:[stub(),stub()],rb,people:true,pending:true};if(NB[key])d.neighbour=true;
  pending.push(d);if(!srcClips)load('anims');load(key);return d}
/* the ids the game hangs on hitboxes (userData.ent and the like) carry over to the new ones */
function carryHitData(from,to){const extra={};for(const m of from)for(const k in m.userData)if(k!=='hitbox'&&k!=='head'&&k!=='pendingHit')extra[k]=m.userData[k];for(const m of to)Object.assign(m.userData,extra)}
function fill(d){const boxed=!!d.boxed,rb0=boxed?d._rb:d.rb,key=rb0.key,t=tpl[key];if(!t||!srcClips)return false;
  const n=build(t,key,rb0.opts||{}),root=d.root;
  const gunType=boxed?(d.gun&&d.gun.userData&&d.gun.userData.gun)||null:rb0.gunType;
  const oldHold=d.gunHold,oldBody=d.body,oldMeshes=d.meshes.slice();
  /* the new body goes into the same root (position, rotation, scale, parent, anything the game attached to the root stay) */
  root.add(n.body);
  if(oldHold)for(const c of oldHold.children.slice())n.gunHold.add(c);
  if(boxed){for(const o of d._boxParts||[])if(o.parent)o.parent.remove(o);d._boxParts=null;root.rotation.x=0;root.rotation.z=0}
  else if(oldBody){for(const c of oldBody.children.slice())if(c!==oldHold&&!(c.userData&&c.userData.pendingHit))n.body.add(c);root.remove(oldBody)}
  /* a caller that emptied the hitbox list on purpose (finale cast: not targets) keeps it empty */
  const meshes=d.meshes,cleared=!boxed&&!meshes.length&&!NB[key];carryHitData(oldMeshes,n.meshes);meshes.length=0;if(!cleared)meshes.push(...n.meshes);
  const savedIn=Object.assign({},rb0.in),dead=rb0.dead,force=rb0.force;
  for(const k in rb0)delete rb0[k];Object.assign(rb0,n.rb);Object.assign(rb0.in,savedIn);if(force)rb0.force=force;
  d.rb=rb0;d.body=n.body;d.head=n.head;d.gunHold=n.gunHold;d.legs=n.legs;d.arms=n.arms;d.people=true;d.pending=false;d.boxed=false;delete d._rb;delete d._rideRig;
  if(NB[key])d.neighbour=true;
  root._htPend=false;
  if(d.gun&&d.gun.parent!==d.gunHold)d.gunHold.add(d.gun);
  if(gunType||d.gun)try{P.equip(d,gunType)}catch(e){}
  if(dead){rb0.dead=false;P.die(d);rb0.deadT=3}
  setBase(d,chooseBase(d),true);step(d,0);
  const i=pending.indexOf(d);if(i>=0)pending.splice(i,1);P.live.push(d);
  for(const f of swapCbs)try{f(d)}catch(e){console.warn('people: onSwap',e)}
  return true}
/* after the ceiling, a character still waiting may get the game's box stand-in (if the game offers one); the real model replaces it later */
function boxIn(d){const rb=d.rb;let b=null;try{b=P.boxFallback&&P.boxFallback(rb.role,rb.opts&&rb.opts.look,rb.key)}catch(e){b=null}if(!b||!b.root)return false;
  if(!fbLogged){fbLogged=true;console.warn('people: character models still unavailable after '+P.PENDING_CEILING+' s of retries; showing stand-ins until they arrive ('+rb.key+')')}
  const root=d.root,parts=b.root.children.slice();for(const c of parts)root.add(c);d._boxParts=parts;
  if(P.PROTECTED[rb.key]){d.protected=true;for(const c of parts)c.traverse(o=>{o.userData.protected=true})}/* protection follows the character into any stand-in */
  if(d.gunHold)for(const c of d.gunHold.children.slice())b.gunHold.add(c);
  if(d.body){for(const c of d.body.children.slice())if(c!==d.gunHold&&!(c.userData&&c.userData.pendingHit))root.add(c);root.remove(d.body)}
  carryHitData(d.meshes,b.meshes);d.meshes.length=0;d.meshes.push(...b.meshes);
  d._rb=rb;delete d.rb;delete d.body;d.head=b.head;d.gunHold=b.gunHold;d.legs=b.legs;d.arms=b.arms;d.people=false;d.pending=false;d.boxed=true;root._htPend=false;
  for(const f of swapCbs)try{f(d)}catch(e){}
  return true}
function tick(){if(!pending.length)return;const t=now();
  for(const d of pending.slice()){const rb=d.boxed?d._rb:d.rb;if(!rb)continue;const key=rb.key;
    /* dropped by the game long ago: forget it */
    if(!d.root.parent){d._orph=d._orph||t;if(t-d._orph>600e3){pending.splice(pending.indexOf(d),1);continue}}else d._orph=0;
    if(srcClips&&!tpl[key]&&gltf(key))try{prep(key)}catch(e){}
    if(srcClips&&tpl[key]){try{fill(d)}catch(e){console.warn('people: swap failed for',key,e)}continue}
    if(onStage(d)){if(!srcClips)load('anims');load(key)}
    /* owner rule (W-14): a child or the family is never a box. Past the ceiling they stay hidden and keep retrying, however long it takes */
    if(!d.boxed&&d.root.parent&&t-rb.t0>P.PENDING_CEILING*1000&&!P.PROTECTED[key]&&!(rb.opts&&(rb.opts.protected||rb.opts.kid)))boxIn(d)}}
P.tick=tick;

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
  const inp=rb.in;inp.mode=o.mode||'stand';inp.aim=o.aim===undefined?true:!!o.aim;inp.moving=!!o.moving;inp.pitch=o.pitch||0;inp.speedHint=o.speed||1;inp.air=o.air||null;if(rb.force)Object.assign(inp,rb.force);if(rb.pending)return;
  if(dt>0){const x=r.position.x,z=r.position.z;if(rb.lx!==null){const dx=x-rb.lx,dz=z-rb.lz,dd=Math.hypot(dx,dz);
      if(dd<3){const s=Math.sin(r.rotation.y),c=Math.cos(r.rotation.y);const k=1-Math.exp(-dt*10);const sc=r.scale.x||1;
        /* local: +x = character's left, +z = forward; scaled characters take longer strides */
        const lvx=(dx*c-dz*s)/dt/sc,lvz=(dx*s+dz*c)/dt/sc;rb.vx+=(lvx-rb.vx)*k;rb.vz+=(lvz-rb.vz)*k}}
    rb.lx=x;rb.lz=z;if(!inp.moving){const k=1-Math.exp(-dt*14);rb.vx-=rb.vx*k;rb.vz-=rb.vz*k}}
  if(inp.mode==='down'&&!rb.dead)rb.downed=true;else if(inp.mode!=='down'&&rb.downed){rb.downed=false;rb.getUp=.6}};
const PISTOL_STYLE={pistol:1,revolver:1,nailer:1,sawedoff:1};const _ry=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI);
P.equip=function(d,type){const rb=d.rb;if(!rb||!d.gunHold)return;if(rb.pending){rb.gunType=type||null;return}if(d.gun)batchGun(d.gun);rb.shadowBand=-1;rb.gunType=type||null;const gh=d.gunHold;const G=HT.Guns;
  rb.style=type?(PISTOL_STYLE[type]?'pistol':'rifle'):null;gh.scale.set(1,1,1);
  /* realistic guns (js/guns.js): calibrated hand fit; makeGun wraps those models turned to +Z, so turn back */
  if(type&&d.gun&&d.gun.userData&&d.gun.userData.gun&&G&&G.handAttach){try{const a=G.handAttach(type);gh.position.copy(a.position);gh.quaternion.copy(a.quaternion);if(d.gun.userData.muzzle!=='-z')gh.quaternion.multiply(_ry);rb.style=a.clipStyle||rb.style;rb.gh={p:gh.position.clone(),q:gh.quaternion.clone()};return}catch(e){}}
  const f=GUN_FIT[rb.style==='pistol'?'pistol':'rifle'];
  gh.position.fromArray(f.p);gh.quaternion.fromArray(f.q);
  if(d.gun){const muzzleNegZ=d.gun.userData&&d.gun.userData.muzzle==='-z';if(!muzzleNegZ&&rb.style!=='pistol'){gh.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI));const n=BOX_NUDGE[type]||[0,0,0];d.gun.position.set(n[0],n[1],n[2])}}rb.gh={p:gh.position.clone(),q:gh.quaternion.clone()}};
function oneShot(d,name,dur,peak){const rb=d.rb;if(!rb||rb.dead||rb.pending)return;const a=act(rb,name,'ar'),b=act(rb,name,'sp');if(!a)return;const cd=rb.acts[name].c.dur;
  for(const x of[a,b]){x.reset();x.timeScale=dur?cd/dur:1;x.play()}rb.one={name,t:0,dur:dur||cd,peak:peak||1}}
P.fire=(d,cycle)=>{const rb=d&&d.rb;if(!rb||!rb.gunType||rb.pending)return;const ps=rb.style==='pistol';oneShot(d,ps?'pistol_fire':'rifle_fire',ps?.4:.22,1);rb.kick=1;
  const G=HT.Guns,vc=G&&G.VMC&&G.VMC[rb.gunType];const k=cycle||(vc&&vc.cycle);if(k==='pump'||k==='boltAction')rb.cyc={t:0,k}};
P.interact=d=>{const rb=d&&d.rb;if(!rb)return;oneShot(d,'interact',1.1,.85)};
P.reload=(d,sec)=>{const rb=d&&d.rb;if(!rb||!rb.gunType||rb.pending)return;if(rb.style==='pistol')oneShot(d,'pistol_reload',sec||1.2,1);else rb.reloadT=sec||1.9};
P.hit=(d,headshot)=>{const rb=d&&d.rb;if(!rb||rb.dead||P.isProtected(d))return;/* never a hit reaction on a kid or the family */oneShot(d,headshot?'hit_head':'hit_chest',headshot?.43:.33,.9)};
P.die=d=>{const rb=d&&d.rb;if(!rb||rb.dead||P.isProtected(d))return;if(rb.pending){rb.dead=true;return}rb.dead=true;rb.deadT=0;rb.one=null;d.body.position.y=0;setBase(d,'death');};
/* tests: pin inputs regardless of what the game asks for (P.force(d,null) clears) */
P.force=(d,o)=>{if(d&&d.rb)d.rb.force=o||null};
P.revive=d=>{const rb=d&&d.rb;if(!rb)return;rb.dead=false;rb.deadT=0;d.body.position.y=0;d.root.visible=true};

/* ---------- left-hand IK onto the forend of long guns ---------- */
/* forend centre (s along the barrel, y) and radius in HT.Guns model space (muzzle -Z), from js/guns.js support poses */
const SUPPORT={shotgun:[.3,.009,.022],beanbag:[.3,.009,.022],double:[.17,.012,.024],rifle:[.18,.02,.03],smg:[.25,.032,.028],hunter:[0,.022,.024]};
const _a=new T.Vector3(),_b=new T.Vector3(),_c=new T.Vector3(),_t=new T.Vector3(),_n=new T.Vector3(),_u=new T.Vector3(),_w=new T.Vector3(),_hq=new T.Quaternion(),_pq=new T.Quaternion(),_rq=new T.Quaternion();
function worldRot(b,q){b.parent.getWorldQuaternion(_pq);b.getWorldQuaternion(_rq);_rq.premultiply(q);b.quaternion.copy(_pq.invert().multiply(_rq))}
/* two-bone IK: put the wrist of (ua->fa->hd) on goal (world), keep the hand's world orientation */
function twoBone(ua,fa,hd,goal){const g=_n.copy(goal);hd.getWorldQuaternion(_hq);ua.getWorldPosition(_a);fa.getWorldPosition(_b);hd.getWorldPosition(_c);
  const l1=_a.distanceTo(_b),l2=_b.distanceTo(_c),dd=Math.min(l1+l2-.002,Math.max(.05,_a.distanceTo(g)));const G=g.clone();
  _u.copy(_a).sub(_b);_w.copy(_c).sub(_b);const ax=new T.Vector3().crossVectors(_u,_w);if(ax.lengthSq()<1e-10)return;ax.normalize();
  const cur=_u.angleTo(_w),want=Math.acos(Math.max(-1,Math.min(1,(l1*l1+l2*l2-dd*dd)/(2*l1*l2))));worldRot(fa,_q.setFromAxisAngle(ax,want-cur));
  hd.getWorldPosition(_c);_u.copy(_c).sub(_a).normalize();_w.copy(G).sub(_a).normalize();worldRot(ua,_q.setFromUnitVectors(_u,_w));
  hd.parent.getWorldQuaternion(_pq);hd.quaternion.copy(_pq.invert().multiply(_hq))}
/* two-bone IK with an elbow direction (pole, world): elbow placed in the plane of shoulder, goal and pole */
function twoBonePole(ua,fa,hd,goal,pole){hd.getWorldQuaternion(_hq);const S=ua.getWorldPosition(new T.Vector3()),E=fa.getWorldPosition(new T.Vector3()),H=hd.getWorldPosition(new T.Vector3());
  const l1=S.distanceTo(E),l2=E.distanceTo(H);const D=goal.clone().sub(S);const d=Math.min(l1+l2-.002,Math.max(.05,D.length()));D.normalize();
  const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));const perp=pole.clone().addScaledVector(D,-pole.dot(D));if(perp.lengthSq()<1e-8)return;perp.normalize();
  const En=S.clone().addScaledVector(D,a).addScaledVector(perp,h);
  worldRot(ua,_q.setFromUnitVectors(E.clone().sub(S).normalize(),En.clone().sub(S).normalize()));
  fa.getWorldPosition(E);hd.getWorldPosition(H);const G=S.clone().addScaledVector(D,d);
  worldRot(fa,_q.setFromUnitVectors(H.clone().sub(E).normalize(),G.sub(E).normalize()));
  hd.parent.getWorldQuaternion(_pq);hd.quaternion.copy(_pq.invert().multiply(_hq))}
/* Rick's hand-off: the gun lies across in front at chest height, muzzle to the giver's left, both hands on it */
const _M=new T.Matrix4(),_M2=new T.Matrix4(),_s3=new T.Vector3();
function offerPose(d){const rb=d.rb,B=rb.bones,r=d.root,gh=d.gunHold;if(!B.Bip01_R_Forearm||!gh||!d.gun)return;const sc=r.scale.x||1;
  const ry=r.rotation.y,F=new T.Vector3(Math.sin(ry),0,Math.cos(ry)),Lw=new T.Vector3(Math.cos(ry),0,-Math.sin(ry)),U=new T.Vector3(0,1,0);
  /* both forearms forward, the carbine level across the chest, centred, held out toward the receiver */
  const O=r.position.clone().addScaledVector(U,1.24*sc).addScaledVector(F,.46*sc).addScaledVector(Lw,-.16*sc);
  /* elbows down, a little out and back: forearms come forward from the body */
  twoBonePole(B.Bip01_R_UpperArm,B.Bip01_R_Forearm,B.Bip01_R_Hand,O.clone().addScaledVector(U,.05*sc),U.clone().negate().addScaledVector(Lw,-.5).addScaledVector(F,-.35));
  twoBonePole(B.Bip01_L_UpperArm,B.Bip01_L_Forearm,B.Bip01_L_Hand,O.clone().addScaledVector(Lw,.36*sc).addScaledVector(U,.02*sc),U.clone().negate().addScaledVector(Lw,.5).addScaledVector(F,-.35));
  const X=new T.Vector3().crossVectors(U,Lw);_M.makeBasis(X,U,Lw).scale(_s3.set(sc,sc,sc)).setPosition(O);
  B.Bip01_R_Hand.updateWorldMatrix(true,false);_M2.copy(B.Bip01_R_Hand.matrixWorld).invert().multiply(_M);_M2.decompose(gh.position,gh.quaternion,gh.scale)}
function leftHandIK(d,w){const rb=d.rb,B=rb.bones,s=SUPPORT[rb.gunType];if(!s||!d.gun||!B.Bip01_L_UpperArm)return;
  const m=d.gun.children[0];if(!m||!d.gun.userData.gun)return;/* only the HT.Guns models have known forends */
  const ua=B.Bip01_L_UpperArm,fa=B.Bip01_L_Forearm,hd=B.Bip01_L_Hand,f2=B.Bip01_L_Finger2;if(!fa||!hd||!f2)return;
  /* palm centre now, and where it should be: just under the forend */
  hd.getWorldPosition(_c);f2.getWorldPosition(_w);const palm=_u.copy(_c).lerp(_w,.55);
  m.updateWorldMatrix(true,false);
  /* a moving pump: aim for the middle of its grip, measured once per model */
  if(m.userData.rbSupport===undefined){m.userData.rbSupport=null;const pu=m.getObjectByName('pump');if(pu){pu.updateWorldMatrix(true,false);const bx=new T.Box3().setFromObject(pu);
      if(!bx.isEmpty()){const inv=new T.Matrix4().copy(m.matrixWorld).invert(),lb=bx.clone().applyMatrix4(inv);/* point under the pump grip, kept in the pump's own space so it follows the pump stroke */
        const pm=new T.Vector3(0,lb.min.y-.02,(lb.min.z+lb.max.z)/2).applyMatrix4(m.matrixWorld).applyMatrix4(new T.Matrix4().copy(pu.matrixWorld).invert());m.userData.rbSupport={node:pu,p:pm,z0:pu.position.z}}}}
  const sp=m.userData.rbSupport;if(sp){sp.node.updateWorldMatrix(true,false);_t.copy(sp.p).applyMatrix4(sp.node.matrixWorld)}else _t.set(0,s[1]-s[2]-.022,-s[0]).applyMatrix4(m.matrixWorld);
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
  if(m==='offer'){rb.hipT=0;rb.back=false;return'idle'}
  const v=Math.hypot(rb.vx,rb.vz);
  /* sideways and diagonal moves: the legs play a forward (or backward) gait turned toward the travel direction, the torso counter-turns to keep facing */
  const ang=Math.atan2(rb.vx,rb.vz);const back=Math.abs(ang)>(rb.back?1.6:1.85);rb.back=back&&v>.15;
  rb.hipT=v<.2?0:back?ang-Math.sign(ang)*Math.PI:Math.max(-1.45,Math.min(1.45,ang));
  if(m==='crouch')return v>.25?'crouch_walk':'crouch_idle';
  const cur=rb.base,still=v<(LOCO.includes(cur)||SPEED[cur]?.18:.32);
  if(still){rb.hipT=0;return rb.idle==='idle_arms_folded'&&(inp.aim||rb.one)?'idle':rb.idle}
  if(rb.back)return v>1.9?'run_back':rb.walk;
  if(rb.female)return rb.walk;
  /* pick the clip whose recorded speed is closest in ratio, with a little stickiness to the current one */
  let best=rb.walk,bs=1e9;for(const n of LOCO){let s=Math.abs(Math.log(v/SPEED[n]));if(n===cur)s-=.12;if(s<bs){bs=s;best=n}}return best}
function rateFor(rb,name){const v=Math.hypot(rb.vx,rb.vz);
  /* crouch-run: cap the cadence (a little glide beats a frantic shuffle) */
  if(name==='crouch_walk')return (rb.back?-1:1)*Math.min(2.4,Math.max(.6,v/SPEED[name]));
  if(name===rb.walk&&rb.back)return -Math.min(1.8,Math.max(.5,v/SPEED[name]));
  if(SPEED[name])return Math.min(2.2,Math.max(.55,v/SPEED[name]));return 1}
function setW(x,w,n){if(!x)return;if(w>1e-4){if(!ONCE[n]&&!x.isRunning())x.play();x.setEffectiveWeight(w)}else{x.setEffectiveWeight(0);if(!ONCE[n]&&x.isRunning())x.stop()}}
function rotWorld(b,axisW,ang){if(!b||Math.abs(ang)<1e-4)return;b.parent.getWorldQuaternion(_q);_ax.copy(axisW).applyQuaternion(_q.invert());_q2.setFromAxisAngle(_ax,ang);b.quaternion.premultiply(_q2)}
const PISTOL_FIX=[-.216,.2];
const PROC_BONES=['Bip01_Pelvis','Bip01_Head','Bip01_Spine','Bip01_Neck','Bip01_Spine1','Bip01_Spine2','Bip01_L_UpperArm','Bip01_R_UpperArm','Bip01_L_Forearm','Bip01_L_Hand','Bip01_R_Forearm','Bip01_R_Hand'];
function step(d,dt){const rb=d.rb,inp=rb.in;
  const base=chooseBase(d);setBase(d,base);
  const full=!!FULL[base]||rb.dead;
  /* base weights: crossfade toward the current base, renormalised so the bind pose never leaks in */
  const fade=rb.dead?.14:rb.getUp>0?.45:.2;let sum=0;
  for(const k in rb.lw){const tgt=k===rb.base?1:0;const w=rb.lw[k];rb.lw[k]=tgt>w?Math.min(1,w+dt/fade):Math.max(0,w-dt/fade);sum+=rb.lw[k]}
  if(sum<=0){rb.lw[rb.base]=1;sum=1}
  if(rb.getUp>0)rb.getUp-=dt;
  for(const k in rb.lw){const a=rb.acts[k];if(!a||!a.lo)continue;const r=rateFor(rb,k)*(1-.85*(rb.airHold||0));a.lo.timeScale=r;for(const x of[a.sp,a.ar])if(x){x.timeScale=r;x.time=a.lo.time}}
  /* upper-body layers: one-shot > aim > hold > locomotion arms */
  const gun=rb.gunType,pist=rb.style==='pistol',longGun=gun&&!pist;
  const v=Math.hypot(rb.vx,rb.vz);
  const offer=inp.mode==='offer';const aimT=!full&&gun&&inp.aim&&!offer?1:0;
  const holdT=!full&&longGun&&!offer&&!inp.aim&&rb.base!=='idle_arms_folded'?1:0;
  rb.aimW+=(aimT-rb.aimW)*Math.min(1,dt*12);rb.holdW+=(holdT-rb.holdW)*Math.min(1,dt*8);
  let oneW=0;if(rb.one){const o=rb.one;o.t+=dt;const a=Math.min(1,o.t/.05),z=Math.min(1,(o.dur-o.t)/.12);oneW=full?0:Math.max(0,Math.min(a,z))*o.peak;if(o.t>=o.dur){rb.one=null;oneW=0}}
  /* crouched with a gun up: the aim stance's torso is kept, then hinged forward at the lower spine (head stays below cover) */
  const crouch=inp.mode==='crouch';
  const WS={},WA={};let remS=1,remA=1;const add=(n,w,armsOnly)=>{if(!n||w<=0)return;WA[n]=(WA[n]||0)+w*remA;remA*=1-w;if(!armsOnly){WS[n]=(WS[n]||0)+w*remS;remS*=1-w}};
  if(rb.one)add(rb.one.name,oneW,false);
  const aimClip=pist?'pistol_aim':'rifle_aim',holdClip=pist?'pistol_idle':'rifle_aim';
  add(aimClip,rb.aimW,crouch);add(holdClip,rb.holdW,crouch);
  for(const n in WA){act(rb,n,'ar');act(rb,n,'sp')}
  /* apply weights */
  for(const n in rb.acts){const a=rb.acts[n];const lw=(rb.lw[n]||0)/sum;setW(a.lo,lw,n);setW(a.sp,(WS[n]||0)+remS*lw,n);setW(a.ar,(WA[n]||0)+remA*lw,n);
    if(!(rb.lw[n]>0)&&n!==rb.base)delete rb.lw[n]}
  /* the mixer skips writing a bone whose animated value did not change, so undo last frame's procedural offsets (aim pitch, hinge, IK) first or they accumulate */
  {const B=rb.bones,N=PROC_BONES;
   if(rb.pre)for(const n of N)if(B[n]&&rb.pre[n])B[n].quaternion.copy(rb.pre[n]);
   if(rb.airPre)rb.airB.forEach((b,i)=>{if(b)b.quaternion.copy(rb.airPre[i])});/* same for the jump/land leg offsets */
   rb.mixer.update(dt);
   rb.pre=rb.pre||{};for(const n of N)if(B[n])(rb.pre[n]||(rb.pre[n]=B[n].quaternion.clone())).copy(B[n].quaternion);
   const AB=rb.airB||(rb.airB=AIR_B.map(n=>d.body.getObjectByName(n)));rb.airPre=rb.airPre||AB.map(b=>b?b.quaternion.clone():null);AB.forEach((b,i)=>{if(b)rb.airPre[i].copy(b.quaternion)})}
  if(!rb.dead)d.body.position.y=0;/* the air pose and the ground clamp set it fresh each update */
  applyAir(d,dt);
  /* phase for the first-person bob and footsteps */
  const ba=rb.acts[rb.base];if(ba&&ba.lo&&SPEED[rb.base]){rb.phase=ba.lo.time/ba.c.dur;d.walk=rb.phase*Math.PI*4}else d.walk*=.9;
  /* aim pitch: split between spine and both upper arms (rotating both arms about the shoulder line keeps the support hand on the gun) */
  let armT=0,spT=0;
  const pa=Math.max(-1.1,Math.min(1.1,inp.pitch||0));
  if(rb.aimW>.01){if(crouch)armT+=rb.aimW*-pa;else{armT+=rb.aimW*(-pa*.55);spT+=rb.aimW*(-pa*.45)}}
  /* hinge: lower spine leans forward, arms and neck turn back by the same world angle so gun and gaze stay level */
  const hw=crouch&&!full?Math.min(1,rb.aimW+(longGun?rb.holdW:0)):0;rb.hinge=(rb.hinge||0)+(hw*(rb.base==='crouch_walk'?.1:.45+((d.root.scale.y||1)-1)*5)-(rb.hinge||0))*Math.min(1,dt*10);
  const hinge=rb.hinge>.005?rb.hinge:0;armT-=hinge;
  if(pist)armT+=PISTOL_FIX[1]*rb.aimW;
  if(longGun&&rb.holdW>.01&&!full)armT+=rb.holdW*(offer?.05:v>3.6?.3:.38);
  if(offer)spT+=.18;
  /* pump / bolt cycle after a shot: the support hand rides the pump back and forth */
  let pumpOff=0;if(rb.cyc){const c=rb.cyc;c.t+=dt;const t=c.t;const k=t<.1?0:t<.28?(t-.1)/.18:t<.46?1-(t-.28)/.18:0;
    if(c.k==='pump')pumpOff=k*.075;else armT-=k*.05;if(t>.5)rb.cyc=null}
  if(rb.reloadT>0&&!full){rb.reloadT-=dt;armT+=.6;spT+=.12}
  if(rb.kick>0){rb.kick=Math.max(0,rb.kick-dt*9);armT-=rb.kick*.06}
  const kk=Math.min(1,dt*14);rb.armP+=(armT-rb.armP)*kk;rb.spineP+=(spT-rb.spineP)*kk;
  /* hip yaw for sideways/diagonal travel (pelvis turns, spine turns back) */
  rb.hipYaw=(rb.hipYaw||0)+(((full||!rb.hipT)?0:rb.hipT)-(rb.hipYaw||0))*Math.min(1,dt*9);
  if(Math.abs(rb.hipYaw)>.004&&rb.bones.Bip01_Pelvis){_cp.set(0,1,0);rotWorld(rb.bones.Bip01_Pelvis,_cp,rb.hipYaw);rotWorld(rb.bones.Bip01_Spine,_cp,-rb.hipYaw)}
  /* offering a gun: shoulders turn so the weapon lies across in front, muzzle away from the receiver */
  rb.offer=(rb.offer||0)+((offer?1:0)-(rb.offer||0))*Math.min(1,dt*6);
  /* the pistol_aim clip points ~0.2 rad left and high of the body's facing; square it up (rigid: upper torso yaw + shoulder-line pitch) */
  const tw=.75*rb.offer+(pist?PISTOL_FIX[0]*rb.aimW:0);
  if(Math.abs(tw)>.004&&rb.bones.Bip01_Spine2){_cp.set(0,1,0);rotWorld(rb.bones.Bip01_Spine2,_cp,tw)}
  if(Math.abs(rb.armP)>.002||Math.abs(rb.spineP)>.002||hinge){const B=rb.bones;_cp.set(1,0,0).applyQuaternion(d.root.getWorldQuaternion(_q2));const left=_v.copy(_cp);
    if(hinge){rotWorld(B.Bip01_Spine,left,hinge);rotWorld(B.Bip01_Neck,left,-hinge*.85)}
    const sp=rb.spineP*.5;rotWorld(B.Bip01_Spine1,left,sp);rotWorld(B.Bip01_Spine2,left,sp);
    rotWorld(B.Bip01_L_UpperArm,left,rb.armP);rotWorld(B.Bip01_R_UpperArm,left,rb.armP)}
  /* closed loop: measure where the barrel really points and turn the arms (pitch) and upper torso (yaw) by the error,
     so every base clip (crouch, kneel-ish idles, strafes, hip yaw) ends with the gun on the view / at low ready */
  const gw=gun&&d.gun&&!full?Math.max(rb.aimW,longGun?rb.holdW:0):0;
  if(gw>.3&&d.gunHold&&d.gunHold.visible){d.gunHold.updateWorldMatrix(true,false);d.gun.getWorldQuaternion(_q);const bd=_a.copy(gunAxis(d.gun)).applyQuaternion(_q);
    const ry=d.root.rotation.y,fx=Math.sin(ry),fz=Math.cos(ry);const fwdC=bd.x*fx+bd.z*fz,sideC=bd.x*fz-bd.z*fx;
    const wantP=rb.aimW>=rb.holdW?Math.max(-1.1,Math.min(1.1,inp.pitch||0)):-.42;
    const curP=Math.atan2(bd.y,Math.hypot(fwdC,sideC)),curY=Math.atan2(sideC,fwdC);
    const eP=(wantP-curP)*gw,eY=(offer?0:-curY)*gw;
    const B=rb.bones;_cp.set(1,0,0).applyQuaternion(d.root.getWorldQuaternion(_q2));
    if(Math.abs(eY)>.005&&Math.abs(eY)<1.2&&B.Bip01_Spine2){_b.set(0,1,0);rotWorld(B.Bip01_Spine2,_b,eY)}
    if(Math.abs(eP)>.005&&Math.abs(eP)<1.4){rotWorld(B.Bip01_L_UpperArm,_cp,-eP);rotWorld(B.Bip01_R_UpperArm,_cp,-eP)}}
  /* head follows the look pitch when the body isn't already aiming along it */
  if(inp.pitch&&!full){const hl=-Math.max(-.9,Math.min(.9,inp.pitch))*(1-rb.aimW)*.6;rb.look=(rb.look||0)+(hl-(rb.look||0))*Math.min(1,dt*10)}else rb.look=(rb.look||0)*Math.max(0,1-dt*10);
  if(Math.abs(rb.look)>.004){_cp.set(1,0,0).applyQuaternion(d.root.getWorldQuaternion(_q2));rotWorld(rb.bones.Bip01_Neck,_cp,rb.look*.45);rotWorld(rb.bones.Bip01_Head,_cp,rb.look*.55)}
  if(rb.offer>.5&&d.gun)offerPose(d);else if(rb.gh&&d.gunHold&&rb.ghDirty!==false){d.gunHold.position.copy(rb.gh.p);d.gunHold.quaternion.copy(rb.gh.q);d.gunHold.scale.set(1,1,1);rb.ghDirty=false}
  if(rb.offer>.5)rb.ghDirty=true;
  /* pump stroke on the gun model itself, then the support hand follows it */
  if(d.gun&&d.gun.children[0]){const sp=d.gun.children[0].userData.rbSupport;if(sp)sp.node.position.z=sp.z0+pumpOff}
  if(longGun&&!full&&!offer&&d.gun&&d.gunHold&&d.gunHold.visible){const w=Math.min(1,rb.aimW+rb.holdW)*(rb.one&&rb.one.name!=='rifle_fire'?.6:1);if(w>.05)leftHandIK(d,w)}
  /* the King only folds his arms while he is unarmed or calm */
  if(d.gunHold)d.gunHold.visible=!(rb.base==='idle_arms_folded'&&rb.lw.idle_arms_folded>.5);
  /* bodies stay a while, then sink away */
  /* ground clamp: blends between gaits/crouch/air poses can push a toe through the floor; lift the body by exactly that much */
  if(!rb.dead){const B=rb.bones;if(B.Bip01_L_Toe0){const ry=d.root.position.y,sc=d.root.scale.y||1;let lo=9;
      for(const[n,o]of[['Bip01_L_Toe0',0],['Bip01_R_Toe0',0],['Bip01_L_Foot',.06],['Bip01_R_Foot',.06]]){const b=B[n];if(b)lo=Math.min(lo,(b.getWorldPosition(_v).y-ry)/sc-o)}
      /* crouch clips hover the feet a little: plant them (only crouch, never in the air) */
      const plant=inp.mode==='crouch'&&!inp.air&&lo>.02?Math.min(.25,(lo-.012)*.9):0;
      if(lo<-.005)d.body.position.y-=lo;else if(plant){rb.plant=Math.min(lo-.006,(rb.plant||0)+(plant-(rb.plant||0))*Math.min(1,dt*10));d.body.position.y-=rb.plant}
      if(!plant)rb.plant=0;rb.lift=lo<-.005?-lo:0}}
  if(rb.dead){rb.deadT+=dt;d.body.position.y=0;if(rb.deadT>12)fadeBody(d,1-Math.min(1,(rb.deadT-12)/1.5))}}
/* bodies fade out where they lie (no sinking through the floor): per-body material copies, made once at the start of the fade */
function fadeBody(d,a){const rb=d.rb;if(!rb.fade){rb.fade=[];for(const m of rb.skinned){const mats=Array.isArray(m.material)?m.material:[m.material];
      const cl=mats.map(x=>{const c=x.clone();c.transparent=true;c.depthWrite=true;return c});m.material=Array.isArray(m.material)?cl:cl[0];rb.fade.push(...cl);m.castShadow=false}
    if(d.gunHold)d.gunHold.visible=false;d.body.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&!(o.userData&&o.userData.hitbox))o.visible=false})}
  for(const c of rb.fade)c.opacity=a;if(a<=0)d.root.visible=false}

/* ---------- procedural jump / fall / land / vault (the clip set has none) ----------
   inp.air = {k:'jump'|'fall'|'land'|'vault'|'climb'|'mantle', t, vy, amt}: knees tuck, arms balance, landings absorb.
   Applied on top of the clip pose, before the aim layer, so a raised gun stays on target. */
const AIR_B=['Bip01_L_Thigh','Bip01_R_Thigh','Bip01_L_Calf','Bip01_R_Calf','Bip01_L_UpperArm','Bip01_R_UpperArm','Bip01_Spine','Bip01_L_Foot','Bip01_R_Foot'];
function applyAir(d,dt){const rb=d.rb;if(rb.dead)return;const a=rb.in.air;const S=rb.air||(rb.air={tuck:0,dip:0,lean:0,arms:0,split:0});
  let tuck=0,dip=0,lean=0,arms=0,split=0,hold=0;
  if(a){const t=a.t||0;
    if(a.k==='jump'){tuck=.25+.55*Math.min(1,t/.22);arms=.7;lean=.06;split=.25;hold=1}
    else if(a.k==='fall'){tuck=.45+.25*Math.min(1,t/.4);arms=.9;lean=.02;split=.15;hold=1}
    else if(a.k==='land'){const e=t<.22?t/.22:Math.pow(1-(t-.22)/.78,1.6);/* fast absorb, slow rise */dip=(a.amt||.3)*e;tuck=dip*.9;lean=dip*.35;arms=.4*(1-t)}
    else if(a.k==='vault'){const e=Math.sin(Math.PI*Math.min(1,t));tuck=.3+.9*e;lean=.45*e;split=.35*e;arms=.2;hold=1}
    else{/* climb / mantle: knee up onto the ledge, then push up */const e=Math.sin(Math.PI*Math.min(1,t*1.1));tuck=.2+.8*e;lean=.35*e;dip=.25*(1-t);split=.5*e;hold=1}}
  const k=Math.min(1,dt*(a&&a.k==='land'?24:14));S.tuck+=(tuck-S.tuck)*k;S.dip+=(dip-S.dip)*k;S.lean+=(lean-S.lean)*k;S.arms+=(arms-S.arms)*k;S.split+=(split-S.split)*k;
  rb.airHold=(rb.airHold||0)+(hold-(rb.airHold||0))*Math.min(1,dt*12);
  if(S.tuck<.003&&S.dip<.003&&S.lean<.003&&S.arms<.003){if(!a)d.body.position.y=0;return}
  const B=rb.airB||(rb.airB=AIR_B.map(n=>d.body.getObjectByName(n)));const rq=d.root.getWorldQuaternion(new T.Quaternion()),left=new T.Vector3(1,0,0).applyQuaternion(rq),fwdW=new T.Vector3(0,0,1).applyQuaternion(rq);
  /* knees: thigh forward (negative about the character's left axis), shin folds back about twice as far; one leg leads */
  const tl=S.tuck*(1+S.split*.6),tr=S.tuck*(1-S.split*.6);
  rotWorld(B[0],left,-.95*tl);rotWorld(B[1],left,-.95*tr);rotWorld(B[2],left,1.55*tl);rotWorld(B[3],left,1.55*tr);
  rotWorld(B[7],left,-.45*tl);rotWorld(B[8],left,-.45*tr);
  if(S.lean>.003)rotWorld(B[6],left,S.lean*.5);
  /* arms out for balance (only without a gun up; the aim layer owns the arms then) */
  if(S.arms>.003&&!(rb.gunType&&rb.in.aim)){rotWorld(B[4],fwdW,-.55*S.arms);rotWorld(B[5],fwdW,.55*S.arms)}
  /* landing absorb: hips sink while the knees bend (feet stay near the floor) */
  d.body.position.y=-(S.dip*.22+S.tuck*(a&&(a.k==='land'||a.k==='climb'||a.k==='mantle')?.06:0))}
/* zoom-aware LOD: through a scope or binoculars a far character fills the screen like a near one, so the animation-rate steps and the
   far-gun swap use dist x (camera.fov / P.baseFov) (never more than the real distance) */
P.baseFov=72;
P.update=function(dt,camera){if(pending.length&&(P._tickAcc=(P._tickAcc||0)+dt)>.25){P._tickAcc=0;tick()}if(!P.live.length)return;const cp=camera?camera.position:null;P.stats.updates=0;P.stats.skipped=0;const zk=camera&&camera.fov?Math.min(1,Math.max(.02,camera.fov/(P.baseFov||72))):1;
  for(let i=P.live.length-1;i>=0;i--){const d=P.live[i];const rb=d.rb;
    if(!d.root.parent){if(++rb.orphan>90){P.live.splice(i,1);rb.mixer.stopAllAction()}continue}rb.orphan=0;
    rb.acc+=dt;
    /* far or hidden characters animate at a lower rate */
    let every=1;if(cp){const dist=Math.hypot(d.root.position.x-cp.x,d.root.position.z-cp.z);const zd=dist*zk;every=zd<22?1:zd<45?2:zd<80?4:8}if(!d.root.visible)every=Math.max(every,6);
    if(rb.dead&&rb.deadT>3)every=Math.max(every,rb.deadT>12?2:10);
    /* shadows by distance: body within 25 m, head/hair/accessories/gun within 12 m, none when hidden or long dead */
    {const dist=cp?Math.hypot(d.root.position.x-cp.x,d.root.position.z-cp.z):0;const band=!d.root.visible||(rb.dead&&rb.deadT>3)?2:dist<12?0:dist<25?1:2;
      gunLod(d,dist*zk>8&&!(rb.cyc));
      if(band!==rb.shadowBand){rb.shadowBand=band;const body=rb.bodyMesh||(rb.bodyMesh=rb.skinned.reduce((a,b)=>(!a||b.geometry.attributes.position.count>a.geometry.attributes.position.count)?b:a,null));
        d.root.traverse(o=>{if(!o.isMesh||(o.userData&&o.userData.hitbox))return;o.castShadow=band===0||(band===1&&o===body)})}}
    if(++rb.skip<every){P.stats.skipped++;continue}rb.skip=0;const t=Math.min(rb.acc,.25);rb.acc=0;step(d,t);P.stats.updates++}};
P.quality=q=>{qualityFn=()=>q};
/* owner rule: children and the family can never be shot, hit or knocked about by anything. Every hit test asks this one question.
   x: a character (People/box dude), an entity with .dude, or a hitbox mesh (walks up to the character). Flags: .protected / .kid / .family */
P.PROTECTED={nb_kid:1,nb_teen:1,son:1,daughter:1,wife:1};
P.isProtected=function(x){for(let i=0;x&&i<12;i++){if(x.protected||x.kid||x.family)return true;if(x.rb&&P.PROTECTED[x.rb.key])return true;if(x._rb&&P.PROTECTED[x._rb.key])return true;if(x.isObject3D&&typeof x.name==='string'&&x.name.slice(0,3)==='rb_'&&P.PROTECTED[x.name.slice(3)])return true;
    if(x.dude&&x.dude!==x){x=x.dude;continue}const u=x.userData;if(u&&(u.protected||u.kid))return true;if(u&&u.ent&&u.ent!==x){x=u.ent;continue}if(u&&u.dude){x=u.dude;continue}x=x.parent||null}return false};
/* the nearest protected character standing in the world within r m of (x,z): {d,dist} or null (the 25 m no-guns bubble) */
let _pv=null;P.protectedNear=function(x,z,r){if(!_pv&&T&&T.Vector3)_pv=new T.Vector3();let best=null;
  /* live, still loading (hidden, but standing there) and stand-ins alike: protection follows the character, not its model */
  const vis=o=>o._htPend?o._htVis:o.visible;
  for(const d of P.live.concat(pending)){const rb=d.rb||d._rb;if(!d.root.parent||!vis(d.root)||rb&&rb.dead||!P.isProtected(d))continue;let o=d.root;for(;o.parent;o=o.parent)if(!vis(o))break;if(o.parent)continue;
    d.root.getWorldPosition(_pv);const k=Math.hypot(_pv.x-x,_pv.z-z);if(k<r&&(!best||k<best.dist))best={d,dist:k,x:_pv.x,z:_pv.z}}return best};
HT.People=P;
})();
