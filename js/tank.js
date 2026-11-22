/* High Trust · HT.Tank — "LAWN ORDER", the motor pool's tank at Fort Sensible (docs/base.md)
 * Borrowed like any car (E), registered with api.registerCar and its own handling row (api.carFeel('tank')). HT.Vehicles.make('tank')
 * returns this file's procedural model (wrapped, js/vehicles.js untouched), HT.Vehicles.update('tank') animates the treads.
 *   Heavy handling, neutral steering (A/D turn on the spot), the turret follows the mouse, V = gunner's sight, left click fires the
 *   main gun: a slow, loud practice round (dust, smoke, a ring of air) that knocks props about and sets off car alarms. It never hurts
 *   anyone: it will not fire with a person near the line of fire, civilians flee and comment, job enemies give up.
 *   It flattens parked cars (the car-damage API, the owner's reaction), scatters cones (HT.Props.hit) and hay bales.
 *   Maple Heights: a little trust, lines from everyone, and the HOA writes. Jobs refuse it: "You can't bring that to the bake sale."
 * Hooks: HT.Jobs 'vehicle' (handling extras, the turret, the gun), 'camera' (turret camera), 'pose' (parking, upkeep), 'hud' (reticle,
 * widgets), HT.Base.on('interact') (the sergeant), HUD.on('touch') (fire on touch screens).
 */
(function(){'use strict';
const HT=window.HT=window.HT||{};
const Tank={};HT.Tank=Tank;
const J=()=>HT.Jobs;const A=()=>HT.Jobs&&HT.Jobs.api;const B=()=>HT.Base;const RO=()=>HT.Roam;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;const pick=a=>a[Math.floor(Math.random()*a.length)];
const NAME='LAWN ORDER',SARGE='Staff Sgt. Ruiz';
/* handling: slow, heavy, no slides; cam = [distance, height] (the turret camera below overrides it) */
const FEEL={label:'tank',seats:1,bed:0,max:10.5,boostMax:12.5,acc:3.4,boostAcc:4.2,brake:9,hbrake:8,turn:.95,steerResp:3.2,grip:22,roll:.15,cam:[12,3.4],eng:.42,gears:3,horn:'long',door:'close',rear:1,torque:2};
const SEAT=[[-.6,1.6,-.4]];/* in the hull; the dad rides out of sight (closed hatch) */
const LINES={
  borrow:["*sigh* Bring it back with a full tank. Of gas. You know what I mean.","That's government property. ...Fine. Mirrors, signal, and don't flatten anything I have to fill out a form for.",
    "Keys are in it. Keys are always in it. That's the problem with tanks.","Turret follows your mouse. Left click is loud. Please don't left click near my coffee."],
  back:["Oh good. It came back. It always comes back. Like a boomerang. A seventy-ton boomerang.","Parked. Thank you. I'm going to go lie down."],
  refuse:"You can't bring that to the bake sale.",
  maple:["Is that a TANK? On Maple? On a WEDNESDAY?","Honey, get the camera. No, the good camera.","I'm calling the HOA. I'm also filming this.","Linda, the tank man is back.","My petunias! ...Never mind, he went around them. What a gentleman."],
  flee:["Nope. Nope nope nope.","I'm going inside. I'm going inside right now.","Was that thunder? That wasn't thunder.","My ears! My whole afternoon!","Kids, inside! It's the loud dad again!"],
  car:["My CAR! My car is a PANCAKE!","That was a leased vehicle!","I just had that detailed. It's very flat now. Detailed and flat.","Do you know how hard it is to find parking around here? And now it's just... parking."],
  alarm:["Every car alarm on the block just went off.","Somewhere a car alarm is going 'whoop-whoop'. That's on you."],
  surrender:["Okay! Okay! You win! You have a TANK!","We give up! Nobody said anything about a tank!"],
  safety:"Not with people downrange.",
  hoa:["LETTER FROM THE MAPLE HEIGHTS HOA","RE: The Tank","Dear Resident,","It has come to the Board's attention that a main battle tank was operated on Maple Heights streets. Per Bylaw 14(c), 'Recreational Vehicles', tracked vehicles must be stored out of sight of the street and may not idle within 200 feet of a mailbox.","We have also received three complaints about volume and one compliment about your signalling.","Please remove the tank from the neighborhood. The Board notes it is very nice.","Warm regards,","The Maple Heights HOA (Barb)"]};
const say=(who,t,front)=>{try{A().radio(who,t,front)}catch(_){}};

/* ================= the model ================= */
const MT={};function mt(k,o){return MT[k]||(MT[k]=new THREE.MeshStandardMaterial(o))}
function treadTex(){if(MT._tread)return MT._tread;const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');x.fillStyle='#262622';x.fillRect(0,0,64,64);
  for(let i=0;i<4;i++){x.fillStyle='#4a4a44';x.fillRect(i*16+2,4,10,56);x.fillStyle='#14140f';x.fillRect(i*16+12,0,4,64)}x.fillStyle='#6b6b62';x.fillRect(0,28,64,8);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;return MT._tread=t}
function stencilTex(){if(MT._sten)return MT._sten;const c=document.createElement('canvas');c.width=512;c.height=64;const x=c.getContext('2d');x.fillStyle='#57613a';x.fillRect(0,0,512,64);
  x.fillStyle='#ece6cc';x.font='900 44px "Arial Narrow", Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(NAME,256,34,480);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.wrapS=THREE.RepeatWrapping;return MT._sten=t}
function sideTex(){if(MT._side)return MT._side;const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');x.clearRect(0,0,256,128);
  if(B()&&B().badge)B().badge(x,52,64,46);x.fillStyle='#ece6cc';x.font='900 52px "Arial Narrow", Arial';x.textBaseline='middle';x.fillText('FS-02',112,66);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return MT._side=t}
function model(opts){if(HT.HiVeh&&HT.HiVeh.tank)try{return HT.HiVeh.tank({sideTex:sideTex(),stencilTex:stencilTex()})}catch(err){console.warn('[tank] model',err)}/* the detailed model (js/hiveh.js); this one is the fallback */
  const T=THREE,K=B().kit,root=new T.Group(),O='#5a6438',O2='#4d5730',DK='#2b2c27',MET='#3f423c';
  const hull=K.painter(),tur=K.painter(),gun=K.painter();
  /* hull: lower tub between the tracks, sloped glacis, deck, fenders, side skirts, engine deck grilles, lights, tow hooks */
  hull.box('paint',-3.4,.55,-1.12,3.2,1.25,1.12,O2);
  hull.g('paint').quad([3.2,1.25,-1.12],[3.2,1.25,1.12],[3.75,.85,1.12],[3.75,.85,-1.12],[[0,0],[1,0],[1,1],[0,1]],K.C3(O),[1,1,0]);
  hull.g('paint').quad([3.2,.55,-1.12],[3.75,.85,-1.12],[3.75,.85,1.12],[3.2,.55,1.12],[[0,0],[1,0],[1,1],[0,1]],K.C3(O2),[1,-1,0]);
  for(const s of[-1,1]){hull.g('paint').tri([3.2,.55,s*1.12],[3.75,.85,s*1.12],[3.2,1.25,s*1.12],[[0,0],[1,0],[0,1]],K.C3(O2),[0,0,s])}
  hull.box('paint',-3.55,1.25,-1.78,3.45,1.42,1.78,O);                 /* deck with the fenders over the tracks */
  hull.g('paint').quad([3.45,1.42,-1.78],[3.45,1.42,1.78],[3.95,1.12,1.78],[3.95,1.12,-1.78],[[0,0],[1,0],[1,1],[0,1]],K.C3(O),[1,1,0]);
  for(const s of[-1,1]){hull.box('paint',-3.5,.42,s*1.78-(s>0?.06:0),3.4,1.25,s*1.78+(s>0?0:.06),O2);   /* side skirt */
    for(let i=0;i<5;i++){const x=-3.0+i*1.4;hull.box('paint',x,.5,s*1.84-.02,x+1.2,1.15,s*1.84+.02,O)}}
  for(let i=0;i<5;i++)hull.box('metal',-3.3+i*.3,1.42,-.9,-3.2+i*.3,1.46,.9,MET);   /* engine grille */
  for(const s of[-1,1]){hull.cyl('glow',3.55,1.32,s*1.45,.11,.11,.12,'#fff3c4',10,0,Math.PI/2);hull.box('metal',3.4,1.22,s*1.45-.18,3.55,1.45,s*1.45+.18,DK);
    hull.box('glow',-3.58,1.3,s*1.5-.1,-3.54,1.38,s*1.5+.1,'#ff3020');hull.box('metal',3.7,.75,s*.6-.08,3.95,.85,s*.6+.08,DK)}
  /* stowage on the back deck: jerry cans, a cooler (it's a dad's tank), a folding lawn chair */
  for(let i=0;i<3;i++)hull.box('paint',-3.45,1.42,-1.6+i*.42,-3.05,1.95,-1.25+i*.42,'#3e4628');
  hull.box('paint',-3.4,1.42,.55,-2.7,1.9,1.35,'#d8d4c8');hull.box('paint',-3.42,1.88,.53,-2.68,1.96,1.37,'#2c6fb0');
  hull.box('metal',-2.6,1.46,1.0,-1.6,1.5,1.6,'#2c7a45');hull.box('metal',-2.6,1.5,1.05,-2.55,2.05,1.55,'#c9c9c4');
  /* tracks: belts top and bottom (tread texture, scrolled), sprocket and idler, road wheels behind the skirts */
  const tread=treadTex();const tm=mt('tread',{map:tread,roughness:.95,metalness:.2});
  const tracks=[];for(const s of[-1,1]){const g=new T.Group();const zc=s*1.43,w=.62;
    const belt=new T.BufferGeometry();const P=[],U=[],N=[],I=[];const pts=[[-3.55,.42],[-3.35,.12],[3.3,.12],[3.75,.55],[3.55,1.02],[-3.4,1.02],[-3.55,.42]];let u=0;
    for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=[-(b[1]-a[1])/L,(b[0]-a[0])/L];const k=P.length/3;
      for(const[p,uu]of[[a,u],[b,u+L]])for(const dz of[-w/2,w/2]){P.push(p[0],p[1],zc+dz);U.push(uu/.6,dz>0?1:0);N.push(-n[0],-n[1],0)}u+=L;I.push(k,k+1,k+2,k+1,k+3,k+2)}
    belt.setAttribute('position',new T.Float32BufferAttribute(P,3));belt.setAttribute('uv',new T.Float32BufferAttribute(U,2));belt.setAttribute('normal',new T.Float32BufferAttribute(N,3));belt.setIndex(I);
    const bm=new T.Mesh(belt,tm.clone());bm.material.map=tread.clone();bm.material.map.needsUpdate=true;bm.castShadow=true;g.add(bm);tracks.push(bm);
    for(let i=0;i<6;i++)hull.cyl('metal',-2.7+i*1.1,.45,zc,.36,.36,.5,'#33352f',14,Math.PI/2);
    hull.cyl('metal',3.3,.62,zc,.38,.38,.52,MET,12,Math.PI/2);hull.cyl('metal',-3.25,.55,zc,.34,.34,.52,MET,12,Math.PI/2);root.add(g)}
  hull.flush(root);
  /* turret: a low faceted shell, the commander's cupola with the hatch open, a loader's hatch, smoke dischargers, the antenna with a pennant */
  const turret=new T.Group();turret.position.set(-.35,1.42,0);
  tur.box('paint',-1.7,0,-1.3,1.2,.78,1.3,O);
  tur.g('paint').quad([1.2,.78,-1.3],[1.2,.78,1.3],[1.85,.3,1.05],[1.85,.3,-1.05],[[0,0],[1,0],[1,1],[0,1]],K.C3(O),[1,1,0]);
  tur.g('paint').quad([1.2,0,-1.3],[1.85,.3,-1.05],[1.85,.3,1.05],[1.2,0,1.3],[[0,0],[1,0],[1,1],[0,1]],K.C3(O2),[1,-1,0]);
  for(const s of[-1,1])tur.g('paint').quad([1.2,0,s*1.3],[1.2,.78,s*1.3],[1.85,.3,s*1.05],[1.85,.3,s*1.05],[[0,0],[1,0],[1,1],[0,1]],K.C3(O2),[0,0,s]);
  tur.box('paint',-2.4,.12,-1.1,-1.7,.72,1.1,O2);                     /* bustle with a basket */
  for(let i=0;i<4;i++)tur.box('metal',-2.65,.1,-1.1+i*.73,-2.6,.75,-1.05+i*.73,MET);tur.box('metal',-2.65,.72,-1.15,-2.4,.76,1.15,MET);
  tur.box('paint',-2.6,.15,-.9,-2.1,.55,-.2,'#6b5a3a');tur.box('paint',-2.6,.15,.1,-2.1,.5,.8,'#4e5a3c');   /* bedrolls */
  tur.cyl('paint',-.6,.92,.55,.42,.38,.28,O,14);tur.cyl('metal',-.6,1.07,.55,.4,.4,.05,MET,14);
  tur.geo('paint',new T.CylinderGeometry(.4,.4,.06,14),K.M4(-.95,1.3,.55,0,0,1.1),O2);         /* the hatch, open */
  tur.box('paint',-.3,.78,-.95,.35,.86,-.3,O2);
  for(const s of[-1,1])for(let i=0;i<3;i++)tur.cyl('metal',.95,.62+i*.12,s*1.18,.06,.06,.3,DK,8,0,Math.PI/2*0.9,s*.5);
  tur.cyl('metal',-1.5,1.9,-.95,.015,.01,2.3,DK,4);
  {const pg=tur.g('glow');pg.quad([-1.5,2.95,-.95],[-1.5,3.0,-.95],[-1.05,2.97,-.95],[-1.05,2.93,-.95],[[0,0],[1,0],[1,1],[0,1]],K.C3('#ff8a2a'),[0,0,1]);
   pg.quad([-1.05,2.93,-.95],[-1.05,2.97,-.95],[-1.5,3.0,-.95],[-1.5,2.95,-.95],[[0,0],[1,0],[1,1],[0,1]],K.C3('#ff8a2a'),[0,0,-1])}
  tur.flush(turret);
  /* the badge and number on both turret sides */
  for(const s of[-1,1]){const d=new T.Mesh(new T.PlaneGeometry(1.4,.7),mt('tside',{map:sideTex(),transparent:true,alphaTest:.1,roughness:.8}));d.position.set(-.4,.42,s*1.31);d.rotation.y=s>0?0:Math.PI;turret.add(d)}
  /* the gun: mantlet, barrel with a fume extractor and a muzzle brake, the nickname sleeve */
  const mantle=new T.Group();mantle.position.set(1.55,.45,0);gun.box('paint',-.2,-.32,-.55,.45,.32,.55,O2);
  gun.cyl('metal',2.6,0,0,.11,.095,4.6,O,12,0,-Math.PI/2);gun.cyl('metal',2.2,0,0,.17,.17,.7,O,14,0,-Math.PI/2);gun.cyl('metal',4.95,0,0,.15,.15,.32,DK,10,0,-Math.PI/2);
  gun.flush(mantle);const sl=new T.Mesh(new T.CylinderGeometry(.122,.122,1.5,16,1,true),mt('sten',{map:stencilTex(),roughness:.8}));sl.rotation.z=-Math.PI/2;sl.rotation.x=Math.PI/2;sl.position.x=1.25;mantle.add(sl);
  const muzzle=new T.Object3D();muzzle.position.set(5.15,0,0);mantle.add(muzzle);
  turret.add(mantle);root.add(turret);
  root.userData.size={l:7.6,w:3.6,h:2.6};root.userData.type='tank';root.userData.tank={turret,mantle,muzzle,tracks,tread:tracks.map(t=>t.material.map)};
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.noBatch=true}});return root}
Tank.model=model;

/* wrap HT.Vehicles so the game's own car code (enterCar's hero model swap, the parked model) gets a tank for 'tank' */
(function wrap(){const V=HT.Vehicles;if(!V||!V.make){setTimeout(wrap,30);return}if(V.make._tank)return;const make0=V.make,upd0=V.update;
  V.make=function(type,o){if(type==='tank')return model(o||{});return make0.apply(this,arguments)};V.make._tank=true;
  V.update=function(v,o){if(v&&v.userData&&v.userData.type==='tank')return treads(v,o||{});return upd0.apply(this,arguments)}})();
/* tread scroll: each side by its own speed (neutral steering turns them opposite ways) */
function treads(v,o){const t=v.userData.tank;if(!t)return;const dt=Math.min(.1,o.dt||1/30);const sp=o.speed||0,w=S.yawRate||0;
  t.tread[0].offset.x-=(sp-w*1.4)*dt/.6;t.tread[1].offset.x-=(sp+w*1.4)*dt/.6}

/* ================= state ================= */
const S={e:null,L:null,reload:0,shells:[],props:[],flat:new Set(),mapleSaid:false,inMaple:false,hoa:false,yawRate:0,turretYaw:0,pitch:0,lastFireT:-9,taught:{},sarge:null,parkT:0,cars:new Set(),alarmT:-99};
Tank.S=S;
function sv(){try{const s=A().SV();return s&&s.base}catch(_){return null}}
function glue(){const a=A();if(!a||typeof a.carFeel!=='function')return false;if(!glue.done){a.carFeel('tank',FEEL,SEAT);glue.done=true}return true}
/* the tank in the world: registered as a borrowable car whenever the level (re)builds; the sergeant beside it */
function ensure(a){const d=B().def();if(!d||!glue())return;
  if(S.e&&a.L.cars&&a.L.cars.includes(S.e)&&S.L===a.L)return;
  const p=S.home||{x:d.tank.x,z:d.tank.z,yaw:d.tank.yaw};let v=null;try{v=a.makeVehicle('tank','#5a6438')}catch(_){v=null}if(!v)return;
  v.userData.lod=0;v.position.set(p.x,0,p.z);a.L.group.add(v);const e=a.registerCar(v,p.x,p.z);if(!e)return;
  e.type='tank';e.name='the motor pool';e.owner='base';e.yaw=p.yaw;e.home={x:d.tank.x,z:d.tank.z,yaw:d.tank.yaw};e.noJobs=LINES.refuse;e.tank=true;a.syncCar(e);S.e=e;S.L=a.L;
  /* the motor pool sergeant */
  if(!S.sarge||!S.sarge.d||!S.sarge.d.root.parent){const PP=HT.People;let dd=null;try{if(PP&&PP.ok)dd=PP.make('neighbour',{variant:'nb_kenji'})}catch(_){}if(!dd)try{dd=a.makeDude({shirt:'#55603f',pants:'#4b4f3a',cap:'#55603f'})}catch(_){}
    if(dd){dd.root.position.set(d.sarge.x,0,d.sarge.z);dd.root.rotation.y=d.sarge.yaw;a.L.group.add(dd.root);if(HT.Staff&&HT.Staff.dress)HT.Staff.dress(dd)/* W-07: Staff Sgt. Ruiz in uniform and cap (js/staff.js) */;S.sarge={d:dd,yaw:d.sarge.yaw,p:d.sarge}}}
  else if(S.sarge.d.root.parent!==a.L.group)a.L.group.add(S.sarge.d.root)}

/* ================= driving extras (vehicle hook, right after the drive physics) ================= */
function vehicle(e,dt){if(!e||e.type!=='tank'||!e.car)return;const a=A(),c=e.car,k=a.keys,P=a.P;S.drive=true;
  /* neutral steering: A/D turn on the spot when slow; the treads counter-rotate */
  const st=(k.a||k.arrowleft?1:0)-(k.d||k.arrowright?1:0),slow=1-clamp(Math.abs(c.spd)/3,0,1);
  const want=st*.75*slow;S.yawRate+=(want-S.yawRate)*Math.min(1,dt*3);c.yaw+=S.yawRate*dt;
  /* armour: keep the body whole (the tank isn't the thing that gets dented) */
  try{if(a.carFrac(e)<.97)a.carRepair(e,'full',{quiet:true})}catch(_){}
  /* the turret follows the camera's look yaw; the gun the pitch */
  const t=e.obj&&e.obj.userData.tank;if(t){let rel=P.yaw-e.yaw;rel=Math.atan2(Math.sin(rel),Math.cos(rel));let d=rel-S.turretYaw;d=Math.atan2(Math.sin(d),Math.cos(d));
    const rate=.95*dt;S.turretYaw+=clamp(d,-rate,rate);t.turret.rotation.y=S.turretYaw;const wp=clamp(P.pitch+.12,-.08,.32);S.pitch+=(wp-S.pitch)*Math.min(1,dt*3);t.mantle.rotation.z=S.pitch;
    if(Math.abs(d)>.05&&!S.traverseT){S.traverseT=.25;try{HT.Audio.tone({f:95,to:110,type:'sawtooth',d:.25,gain:.025})}catch(_){}}S.traverseT=Math.max(0,(S.traverseT||0)-dt)}
  /* the main gun: left click (consumes the click), touch fire */
  S.reload=Math.max(0,S.reload-dt);if(RO().mouseDown||S.touchFire){RO().mouseDown=false;S.touchFire=false;fire(a,e)}
  crush(a,e,dt);
  /* Maple Heights: once per trip, a little trust, lines, and the HOA letter goes in the mail */
  const reg=HT.WorldGen.regionAt(e.pos.x,e.pos.z);if(reg==='maple'&&!S.inMaple){S.inMaple=true;if(!S.mapleT||a.simT-S.mapleT>90){S.mapleT=a.simT;try{a.addTrust(-1,'maple')}catch(_){}a.feed('A tank on Maple','bad','-1 trust');S.hoa=true;const s=sv();if(s)s.hoaTank=true}
    say(pick(['Barb','Linda','Phil','Marcy','Ted']),pick(LINES.maple))}else if(reg!=='maple')S.inMaple=false;
  if(Math.random()<dt/9&&reg==='maple')say(pick(['Denise','Walt','Joyce','Ken','Sharon']),pick(LINES.maple))}

/* ================= the main gun ================= */
const _v=new THREE.Vector3(),_d=new THREE.Vector3(),_r=new THREE.Raycaster();
function fire(a,e){if(S.reload>0){if(a.simT-S.lastNagT>1.2){S.lastNagT=a.simT;a.feed('Reloading · '+S.reload.toFixed(1)+' s','info')}return}
  const t=e.obj.userData.tank;if(!t)return;e.obj.updateMatrixWorld(true);t.muzzle.getWorldPosition(_v);_d.set(1,0,0).transformDirection(t.mantle.matrixWorld).normalize();
  /* safety: nobody near the line of fire (the dad's family, neighbours, the crew, anybody) */
  const ppl=people(a);for(const q of ppl){const rx=q.x-_v.x,rz=q.z-_v.z,along=rx*_d.x+rz*_d.z;if(along<-2||along>260)continue;const off=Math.hypot(rx-_d.x*along,rz-_d.z*along);
    if(off<6+along*.04){say('you',LINES.safety,true);try{HT.Audio.tone({f:300,type:'square',d:.12,gain:.08,bus:'ui'})}catch(_){}S.reload=.6;return}}
  S.reload=3.5;S.lastFireT=a.simT;const s=sv();if(s&&s.tank)s.tank.shots=(s.tank.shots|0)+1;
  /* where it lands: march the shell along a gentle arc and test each segment against the world */
  const sol=a.L.solids,start=_v.clone(),dir=_d.clone();let pos=start.clone(),vel=dir.clone().multiplyScalar(140),hit=null,dist=0,path=[start.clone()];
  for(let i=0;i<60&&!hit;i++){const nxt=pos.clone().addScaledVector(vel,1/30*2);vel.y-=9.8*.15*(1/15);const seg=nxt.clone().sub(pos),L=seg.length();_r.set(pos,seg.normalize());_r.near=0;_r.far=L;
    const h=_r.intersectObjects(sol,false).find(q=>!isOwn(q.object,e));if(h){hit=h.point.clone();break}if(nxt.y<=0){hit=nxt.clone();hit.y=0;break}dist+=L;pos=nxt;path.push(pos.clone());if(dist>280){hit=pos.clone();break}}
  if(!hit)hit=pos;
  S.shells.push({p:start.clone(),to:hit,dir,t:0,T:Math.max(.08,start.distanceTo(hit)/140),mesh:shellMesh(a)});
  /* at the muzzle: flash, a blast of dust off the deck, the whole hull rocks back, a boom */
  try{const F=HT.FX;if(F){F.muzzleFlash(start,dir,{type:'double'});F.impact(new THREE.Vector3(e.pos.x,.2,e.pos.z),new THREE.Vector3(0,1,0),'dirt',{big:true,decal:false});F.shake(.55)}}catch(_){}
  boom(1,0);recoil(e);a.feed('Main gun · reloading 3.5 s','info');teach(a,'gun','Main gun reloads for 3.5 s · it never hurts anyone: it won\'t fire with people near the line of fire')}
function isOwn(o,e){let p=o;while(p){if(p===e.obj)return true;p=p.parent}return false}
function shellMesh(a){const m=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6),MT.shell||(MT.shell=new THREE.MeshBasicMaterial({color:new THREE.Color(4,3,1.6),toneMapped:false})));a.L.group.add(m);return m}
function recoil(e){S.rock=.06}
/* a deep two-part boom: a thump and a long rumbling tail, on the game's sfx bus */
function boom(k,dist){const Au=HT.Audio;if(!Au||!Au.ctx||!Au.bus)return;try{const ctx=Au.ctx,out=Au.bus('sfx'),t=ctx.currentTime+(dist||0)/340,g=ctx.createGain(),vol=clamp(k,0,1.2);
  const len=2.4,buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*len),ctx.sampleRate),d=buf.getChannelData(0);let b=0;for(let i=0;i<d.length;i++){b=b*.985+(Math.random()*2-1)*.06;d[i]=b*Math.exp(-i/ctx.sampleRate*1.7)*3}
  const n=ctx.createBufferSource();n.buffer=buf;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(900,t);lp.frequency.exponentialRampToValueAtTime(120,t+1.6);
  n.connect(lp);lp.connect(g);g.gain.setValueAtTime(.9*vol,t);g.gain.exponentialRampToValueAtTime(.001,t+len);g.connect(out);n.start(t);
  const o=ctx.createOscillator(),og=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(70,t);o.frequency.exponentialRampToValueAtTime(28,t+.5);og.gain.setValueAtTime(.8*vol,t);og.gain.exponentialRampToValueAtTime(.001,t+.7);o.connect(og);og.connect(out);o.start(t);o.stop(t+.8)}catch(_){}}
/* everybody who must never be hit: allies, npcs (givers), neighbours, the family, the base staff, and enemies (it's not that kind of game) */
function people(a){const out=[];const add=p=>{if(p)out.push({x:p.x,z:p.z})};for(const q of a.allies||[])if(!q.ride)add(q.pos);for(const q of a.npcs||[])add(q.pos);
  try{const R=HT.Range&&HT.Range.S;if(R&&R.people)for(const k in R.people){const pe=R.people[k];if(pe.d)add(pe.d.root.position)}}catch(_){}
  if(S.sarge&&S.sarge.d)add(S.sarge.d.root.position);
  try{const ow=RO().OWS;if(ow&&ow.nb)for(const n of ow.nb)if(n.d&&n.d.root.visible)add(n.d.root.position)}catch(_){}
  /* every live character model in the world (porch neighbours, kids, the family, job casts) */
  try{const PP=HT.People;if(PP&&PP.live){const v=new THREE.Vector3();for(const d of PP.live)if(d.root.parent&&d.root.visible){d.root.getWorldPosition(v);add({x:v.x,z:v.z})}}}catch(_){}
  for(const q of a.enemies||[])if(q.state!=='dead')add(q.pos);
  if(a.P&&a.CV)void 0;return out}
function land(a,s){const p=s.to;s.mesh.parent&&s.mesh.parent.remove(s.mesh);s.mesh.geometry.dispose();
  const dd=a.camera.position.distanceTo(p);
  try{const F=HT.FX;if(F){F.explosion(p.clone().setY(Math.max(.05,p.y)),1.3);for(let i=0;i<3;i++)F.impact(p.clone().add(new THREE.Vector3((Math.random()-.5)*2,.1,(Math.random()-.5)*2)),new THREE.Vector3(0,1,0),'dirt',{big:true});F.shake(clamp(1.1-dd/120,.1,.8))}}catch(_){}
  boom(clamp(1.2-dd/400,.25,1.2),Math.min(.5,dd/340*.4));
  /* knock things about: range targets, cones (HT.Props), base props */
  try{const R=HT.Range&&HT.Range.targets?HT.Range.targets():[];for(const t of R){const m=t.mesh;m.getWorldPosition(_v);const d=_v.distanceTo(p);if(d>14)continue;
      if(t.kind==='plate')t.down=true;else if(t.kind==='gong')t.sv+=3*(1-d/14);else if(t.kind==='pop')t.want=0}}catch(_){}
  try{if(HT.Props&&HT.Props.blast)HT.Props.blast(p.x,p.z,12,9);else if(HT.Props&&HT.Props.hit&&HT.Props.list)for(const q of HT.Props.list())if(Math.hypot(q.x-p.x,q.z-p.z)<12)HT.Props.hit(q,{x:q.x-p.x,z:q.z-p.z,force:9})}catch(_){}
  for(const pr of S.props){const d=Math.hypot(pr.x-p.x,pr.z-p.z);if(d<10)knock(pr,(pr.x-p.x)/(d||1),(pr.z-p.z)/(d||1),10*(1-d/10))}
  /* car alarms within 45 m, civilians flee and comment, job enemies give up */
  let alarms=0;for(const c of a.L.cars||[]){if(c===a.CV||c===S.e||!c.obj)continue;if(Math.hypot(c.pos.x-p.x,c.pos.z-p.z)<45){alarms++;alarm(c,a)}}
  if(alarms&&a.simT-S.alarmT>15){S.alarmT=a.simT;a.feed(pick(LINES.alarm),'info')}
  let fled=0;for(const n of a.npcs||[]){if(Math.hypot(n.pos.x-p.x,n.pos.z-p.z)<35){n.flee={t:2.5,x:n.pos.x-p.x,z:n.pos.z-p.z,home:n.flee&&n.flee.home||{x:n.pos.x,z:n.pos.z}};fled++}}
  if(fled||HT.WorldGen.regionAt(p.x,p.z)!=='base'&&Math.random()<.7)say(pick(['Linda','Phil','Marcy','Ted','Bev','Gil']),pick(LINES.flee));
  if(a.mode==='mission')for(const en of a.enemies||[])if(en.state==='idle'&&Math.hypot(en.pos.x-p.x,en.pos.z-p.z)<26){try{a.surrender(en)}catch(_){}if(!S.surrSaid){S.surrSaid=1;say(en.name||'Them',pick(LINES.surrender))}}}
const ALARMS=new Map();
function alarm(c,a){if(ALARMS.has(c))return;ALARMS.set(c,a.simT);const Au=HT.Audio;if(!Au||!Au.tone)return;try{for(let i=0;i<8;i++){Au.tone({f:650,to:1250,type:'square',d:.28,gain:.018,at:i*.6});Au.tone({f:1250,to:650,type:'square',d:.28,gain:.018,at:i*.6+.3})}}catch(_){}
  setTimeout(()=>ALARMS.delete(c),20000)}

/* ================= crushing: parked cars flatten, cones and hay bales scatter ================= */
function crush(a,e,dt){const sp=Math.abs(e.car.spd),fx=-Math.sin(e.yaw),fz=-Math.cos(e.yaw),rx=Math.cos(e.yaw),rz=-Math.sin(e.yaw);
  const inside=(x,z,m)=>{const dx=x-e.pos.x,dz=z-e.pos.z,al=dx*fx+dz*fz,sd=dx*rx+dz*rz;return Math.abs(al)<3.9+m&&Math.abs(sd)<1.85+m};
  for(const c of a.L.cars||[]){if(c===e||c===a.VAN||S.flat.has(c)||!c.obj)continue;if(!inside(c.pos.x,c.pos.z,1.2))continue;if(sp<.6&&Math.abs(S.yawRate)<.2)continue;flatten(a,c)}
  for(const pr of S.props)if(!pr.down&&inside(pr.x,pr.z,.3))knock(pr,fx,fz,Math.max(3,sp*1.5));
  try{if(HT.Props&&HT.Props.list&&HT.Props.hit)for(const q of HT.Props.list())if(!q.down&&inside(q.x,q.z,.2))HT.Props.hit(q,{x:fx,z:fz,force:Math.max(4,sp*1.4),by:'tank'})}catch(_){}}
function flatten(a,c){S.flat.add(c);const s=sv();if(s&&s.tank)s.tank.crushed=(s.tank.crushed|0)+1;
  try{a.carDamage(c,a.carHpMax(c)*2,'tank')}catch(_){}
  if(c.col){c.col.x1=c.col.x0;c.col.z1=c.col.z0}/* it's flat now: the tank (and you) can go over it */
  const o=c.obj;o.scale.y=.32;o.userData.flat=true;try{o.traverse(m=>{if(m.isMesh)m.userData.noBatch=true})}catch(_){}
  try{const F=HT.FX;if(F){F.impact(new THREE.Vector3(c.pos.x,.4,c.pos.z),new THREE.Vector3(0,1,0),'metal',{big:true});F.shake(.3)}HT.Audio.tone({f:120,to:40,type:'sawtooth',d:.5,gain:.2})}catch(_){}
  const own=c.name&&c.owner==='neighbour';if(own){say(c.name,pick(LINES.car));try{a.addTrust(-1,HT.WorldGen.regionAt(c.pos.x,c.pos.z)==='river'?'river':'maple')}catch(_){}a.feed(c.name+"'s car is a pancake",'bad','-1 trust')}
  alarm(c,a)}
/* base props the tank can push through: hay bales and cones on the motor pool's training lane, a wooden fence section */
function knock(pr,dx,dz,f){if(pr.down&&pr.v>1)return;pr.down=true;pr.vx=dx*f*.5;pr.vz=dz*f*.5;pr.vy=2+f*.25;pr.v=f;pr.spin=(Math.random()-.5)*8;pr.t=0;
  try{HT.Audio.tone({f:pr.kind==='hay'?140:520,to:pr.kind==='hay'?90:300,type:'triangle',d:.15,gain:.12})}catch(_){}}
function buildProps(a,d){const g=new THREE.Group();g.name='tankLane';const mp=d.motor;const hay=mt('hay',{color:new THREE.Color('#d9b45a').convertSRGBToLinear(),roughness:1}),cone=mt('cone',{color:new THREE.Color('#ff6a1a').convertSRGBToLinear(),roughness:.6}),
    wood=mt('fwood',{color:new THREE.Color('#b08a5a').convertSRGBToLinear(),roughness:.9});
  const add=(kind,mesh,x,z,ry)=>{mesh.position.set(x,mesh.position.y,z);mesh.rotation.y=ry||0;mesh.castShadow=true;g.add(mesh);S.props.push({kind,mesh,x,z,y0:mesh.position.y,ry:ry||0,down:false,t:0,home:{x,z,ry:ry||0}})};
  /* a slalom of cones and two hay-bale walls between the motor pool and the apron, and a wooden fence to drive through */
  for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(.22,.7,10),cone);m.position.y=.35;add('cone',m,212+i*4.2,d.apron.z0+2+(i%2)*3.2)}
  for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(1.2,.6,.6),hay);m.position.y=.3;add('hay',m,236+i*1.25,d.apron.z0+6.5)}
  for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(1.2,.6,.6),hay);m.position.y=.9;add('hay',m,236.6+i*1.25,d.apron.z0+6.5)}
  for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.1,1.1,2),wood);m.position.y=.55;add('fence',m,206.5,d.apron.z0+3+i*2,0)}
  a.L.group.add(g);S.propRoot=g}
function propsTick(a,dt){if(S.propRoot&&S.propRoot.parent!==a.L.group)a.L.group.add(S.propRoot);
  for(const pr of S.props){if(!pr.down)continue;pr.t+=dt;if(pr.v>0){pr.x+=pr.vx*dt;pr.z+=pr.vz*dt;pr.vy-=12*dt;const m=pr.mesh;m.position.x=pr.x;m.position.z=pr.z;m.position.y=Math.max(pr.kind==='fence'?.06:pr.y0*.7,m.position.y+pr.vy*dt);
      m.rotation.y+=pr.spin*dt;m.rotation.z=Math.min(1.5,m.rotation.z+dt*3*(pr.kind==='fence'?1:.5));if(m.position.y<=pr.y0&&pr.vy<0){pr.vx*=.5;pr.vz*=.5;pr.vy=0;pr.v=Math.max(0,pr.v-dt*20);if(Math.hypot(pr.vx,pr.vz)<.2)pr.v=0}}
    /* the motor pool tidies up after a minute when nobody is looking */
    if(pr.t>60&&a.camera.position.distanceTo(pr.mesh.position)>60){pr.down=false;pr.t=0;pr.x=pr.home.x;pr.z=pr.home.z;pr.mesh.position.set(pr.x,pr.y0,pr.z);pr.mesh.rotation.set(0,pr.home.ry,0)}}}

/* ================= the camera: over the turret, along the mouse look; V = the gunner's sight ================= */
const _c=new THREE.Vector3();
/* hooks answer undefined when they don't apply: HT.Jobs keeps the first non-undefined answer */
function camera(dt){const a=A();if(!a)return;const e=a.CV;if(!e||e.type!=='tank'||a.mode==='home')return;const P=a.P,cam=a.camera,t=e.obj.userData.tank;
  if(!t)return;P.pitch=clamp(P.pitch,-.5,.35);t.mantle.visible=!P.fp;/* the gunner's sight looks along the barrel, not at it */
  if(P.fp){t.muzzle.getWorldPosition(_v);const tw=new THREE.Vector3();t.turret.getWorldPosition(tw);cam.position.set(tw.x,tw.y+1.05,tw.z);
    const dir=new THREE.Vector3(1,0,0).transformDirection(t.mantle.matrixWorld);cam.lookAt(cam.position.x+dir.x*10,cam.position.y+dir.y*10,cam.position.z+dir.z*10);cam.fov+=(42-cam.fov)*Math.min(1,dt*6);cam.updateProjectionMatrix()}
  else{const tw=new THREE.Vector3();t.turret.getWorldPosition(tw);const tgt=_c.set(tw.x,tw.y+1.6,tw.z),D=11.5;
    const fw=new THREE.Vector3(-Math.sin(P.yaw)*Math.cos(P.pitch),Math.sin(P.pitch),-Math.cos(P.yaw)*Math.cos(P.pitch));
    const want=tgt.clone().addScaledVector(fw,-D).add(new THREE.Vector3(0,2.2,0));want.y=Math.max(1.2,want.y);
    if(!S.camP)S.camP=want.clone();S.camP.lerp(want,Math.min(1,dt*8));cam.position.copy(S.camP);cam.lookAt(tgt.x+fw.x*8,tgt.y+fw.y*8+.6,tgt.z+fw.z*8);
    const fov=(RO().CFG&&RO().CFG.fov||74)+Math.min(8,Math.abs(e.spd)*.6);cam.fov+=(fov-cam.fov)*Math.min(1,dt*4);cam.updateProjectionMatrix()}
  if(S.rock){cam.position.y+=S.rock*.6;S.rock*=Math.pow(.02,dt);if(S.rock<.002)S.rock=0}
  try{RO().sunFollow(e.pos.x,e.pos.z,-Math.sin(P.yaw),-Math.cos(P.yaw))}catch(_){}
  return true}

/* ================= every frame (pose hook): shells in flight, props, the tank's home, the HOA letter ================= */
function tick(){const a=A();if(!a||!a.L||!a.L.ow||!B()||!B().def())return;const dt=Math.min(.1,Math.max(0,a.simT-(S.simT||a.simT)));S.simT=a.simT;
  if(a.mode==='hub'){ensure(a);if(!S.propRoot)buildProps(a,B().def());}
  if(!dt)return;propsTick(a,dt);
  for(let i=S.shells.length-1;i>=0;i--){const s=S.shells[i];s.t+=dt;const k=Math.min(1,s.t/s.T);s.mesh.position.lerpVectors(s.p,s.to,k);if(k>=1){S.shells.splice(i,1);land(a,s)}}
  for(const n of a.npcs||[])if(n.flee){const f=n.flee;f.t-=dt;const L=Math.hypot(f.x,f.z)||1;if(f.t>1){n.pos.x+=f.x/L*dt*3;n.pos.z+=f.z/L*dt*3}else{n.pos.x+=(f.home.x-n.pos.x)*Math.min(1,dt);n.pos.z+=(f.home.z-n.pos.z)*Math.min(1,dt)}if(f.t<=-2){n.pos.x=f.home.x;n.pos.z=f.home.z;n.flee=null}}
  {/* far away it isn't drawn: the tank, its sergeant and the training-lane props (the camera is the judge) */const c=a.camera.position,d=B().def(),far=Math.hypot(c.x-d.tank.x,c.z-d.tank.z)>110;
    if(S.e&&S.e.obj)S.e.obj.visible=a.CV===S.e||Math.hypot(c.x-S.e.pos.x,c.z-S.e.pos.z)<130||c.y>40;if(S.sarge&&S.sarge.d)S.sarge.d.root.visible=!far;if(S.propRoot)S.propRoot.visible=!far}
  const e=S.e;if(e&&a.mode==='hub'){
    if(a.CV===e&&!S.inside){S.inside=true;const s=sv();if(s&&s.tank){s.tank.borrows=(s.tank.borrows|0)+1;try{if(HT.Save&&HT.Save.saveNow)HT.Save.saveNow();else a.save()}catch(_){}}/* audit SAV-02: saved now (ACH_BORROWED reads it) */say(SARGE,pick(LINES.borrow),true);
      teach(a,'drive','Tank: W/S drive · A/D turn on the spot · mouse aims the turret · left click fires · V gunner sight · E gets out')}
    if(a.CV!==e&&S.inside){S.inside=false;S.drive=false;const d=B().def();if(Math.hypot(e.pos.x-d.tank.x,e.pos.z-d.tank.z)<14)say(SARGE,pick(LINES.back))}
    /* left far away and out of sight: the motor pool brings it home */
    if(a.CV!==e){const d=B().def(),far=Math.hypot(e.pos.x-d.tank.x,e.pos.z-d.tank.z)>30,away=a.camera.position.distanceTo(e.obj.position)>120;S.parkT=far&&away?S.parkT+dt:0;
      if(S.parkT>20){S.parkT=0;e.pos.set(d.tank.x,0,d.tank.z);e.yaw=d.tank.yaw;a.owStopCar(e);a.syncCar(e);a.feed('The motor pool towed the tank back. Sgt. Ruiz left a note: "Again?"','info')}}
    if(S.sarge&&S.sarge.d){const sg=S.sarge,P=a.P,dx=P.pos.x-sg.p.x,dz=P.pos.z-sg.p.z,dd=Math.hypot(dx,dz);const want=dd<12?Math.atan2(dx,dz):sg.p.yaw;let df=want-sg.yaw;df=Math.atan2(Math.sin(df),Math.cos(df));sg.yaw+=df*Math.min(1,dt*3);sg.d.root.rotation.y=sg.yaw;if(dd<70)try{a.pose(sg.d,dt,{})}catch(_){}}}
  /* the HOA letter: waiting at home after a tank trip into Maple */
  const s=sv();if(s&&s.hoaTank&&a.mode==='hub'&&!a.CV){const h=a.L.start;if(h&&Math.hypot(a.P.pos.x-h.x,a.P.pos.z-h.z)<8){s.hoaTank=false;letter(a);try{a.save()}catch(_){}}}}
function letter(a){const el=document.createElement('div');el.className='ht-hoa';const L=LINES.hoa;
  el.innerHTML=`<style>.ht-hoa{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);z-index:40;pointer-events:auto}
  .ht-hoa .p{width:min(440px,90vw);background:#fbf8ef;color:#222;padding:26px 30px;border-radius:4px;box-shadow:0 20px 60px rgba(0,0,0,.5);font:15px/1.45 Georgia,serif;transform:rotate(-1.2deg)}
  .ht-hoa h3{margin:0 0 4px;font:700 13px Arial;letter-spacing:.14em;color:#5a6b3a}.ht-hoa h4{margin:0 0 14px;font:700 18px Georgia}.ht-hoa small{display:block;margin-top:16px;font:12px Arial;opacity:.6}</style>
  <div class="p"><h3>${L[0]}</h3><h4>${L[1]}</h4>${L.slice(2).map(t=>`<p style="margin:6px 0">${t}</p>`).join('')}<small>Any key · close</small></div>`;
  const close=()=>{document.removeEventListener('keydown',kd);try{if(a.HUD.overlay('hoaLetter'))a.HUD.overlay('hoaLetter',null);else el.remove()}catch(_){el.remove()}};const kd=e=>{if(!e.repeat)close()};
  el.addEventListener('click',close);try{a.HUD.overlay('hoaLetter',el)}catch(_){document.body.appendChild(el)}document.addEventListener('keydown',kd);say('you',"There's a letter from the HOA. About the tank. They said it's very nice.")}
function teach(a,id,t){const s=sv();const m=s?(s.taught||(s.taught={})):S.taught;if(m[id])return;m[id]=1;try{a.feed(t,'info')}catch(_){}}

/* ================= HUD: the reticle in the gunner's sight, the reload meter, the name ================= */
function hud(st){const a=A();if(!a||!st)return;const e=a.CV;const on=e&&e.type==='tank';reticle(on&&a.P.fp);if(!on)return;
  st.vehicleName=NAME+' · borrowed from the motor pool';
  st.meters=(st.meters||[]).concat([{id:'tankGun',label:S.reload>0?'Reloading':'Main gun ready · left click',v:3.5-S.reload,max:3.5,style:'bar',color:S.reload>0?'#e8b04a':'#9fe58a'}])}
function reticle(on){let el=S.ret;if(!on){if(el)el.style.display='none';return}
  if(!el){el=S.ret=document.createElement('div');el.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:20';
    el.innerHTML='<svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0"><defs><radialGradient id="tv"><stop offset="62%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".85"/></radialGradient></defs><rect width="1000" height="1000" fill="url(#tv)"/><g stroke="#ffcf5a" stroke-width="2.4" fill="none"><path d="M500 440v40M500 520v60M440 500h40M520 500h40"/><circle cx="500" cy="500" r="6"/><path d="M470 600h60M480 640h40M490 680h20"/></g><text x="560" y="604" fill="#ffcf5a" font-family="Arial" font-size="16">100</text><text x="560" y="644" fill="#ffcf5a" font-family="Arial" font-size="16">200</text></svg>';document.body.appendChild(el)}
  el.style.display='block'}

/* ================= the sergeant (E prompts) and wiring ================= */
function interact(prompt){const a=A();if(!a||a.mode!=='hub'||a.CV||prompt)return null;
  /* board from any side (the game's car prompt only covers the long sides): within 2.8 m of the hull */
  {const e=S.e;if(e){const P=a.P,dx=P.pos.x-e.pos.x,dz=P.pos.z-e.pos.z,fx=-Math.sin(e.yaw),fz=-Math.cos(e.yaw),al=dx*fx+dz*fz,sd=dx*fz-dz*fx;
    if(Math.hypot(Math.max(0,Math.abs(al)-3.8),Math.max(0,Math.abs(sd)-1.8))<2.8)return{txt:'Climb into LAWN ORDER',fn:()=>{try{a.enterCar(e)}catch(_){}}}}}
  const sg=S.sarge;if(!sg||!sg.d)return null;
  if(Math.hypot(a.P.pos.x-sg.p.x,a.P.pos.z-sg.p.z)<2.6)return{txt:'Talk to '+SARGE,fn:()=>say(SARGE,pick(["The tank? Walk up to it and press E. Like any car. That's the problem.","Practice rounds only. They make a big noise and a big cloud and they don't hurt anybody. Mostly they hurt my paperwork.","Neutral steering: A and D turn it on the spot. Like a Roomba. A seventy-ton Roomba."]),true)};return null}
function hook(){const Jb=J(),Bs=B();if(!Jb||!Jb.on||!Bs||!Bs.on){setTimeout(hook,50);return}
  Jb.on('vehicle',(e,dt)=>{try{vehicle(e,dt)}catch(err){if(!S.err){S.err=1;console.warn('[tank]',err)}}});
  Jb.on('camera',dt=>{try{return camera(dt)}catch(err){if(!S.err3){S.err3=1;console.warn('[tank] camera',err)}}});
  Jb.on('pose',()=>{try{tick()}catch(err){if(!S.err2){S.err2=1;console.warn('[tank] tick',err)}}});
  Jb.on('hud',st=>{try{hud(st)}catch(_){}});Bs.on('interact',p=>interact(p));
  (function touch(){const a=A();if(!a||!a.HUD||!a.HUD.on){setTimeout(touch,500);return}a.HUD.on('touch',(k,down)=>{const c=A().CV;if(down&&k==='fire'&&c&&c.type==='tank')S.touchFire=true})})()}
/* audit C-2: one clean slate (HT.Base.reset from index.html clearChars: quit to title, new game / continue, job start, home, the tow).
   Out of the hull (so the game's own exit restores the camera), gunner sight off, shells in flight gone, knocked lane props rebuilt */
function reset(){const a=A();try{if(a&&a.CV&&a.CV.type==='tank'&&a.exitCar)a.exitCar()}catch(_){}
  reticle(false);S.inside=false;S.drive=false;S.yawRate=0;S.reload=0;S.parkT=0;
  for(const sh of S.shells){try{sh.mesh&&sh.mesh.parent&&sh.mesh.parent.remove(sh.mesh)}catch(_){}}S.shells=[];
  if(S.propRoot){S.propRoot.parent&&S.propRoot.parent.remove(S.propRoot);S.propRoot=null}S.props=[];S.flat.clear();S.cars.clear()}
Tank.reset=reset;
/* fast travel (index.html, fix/world) asks this: true while the dad is in the tank */
Object.defineProperty(Tank,'on',{get:()=>{const a=A();return !!(a&&a.CV&&a.CV.type==='tank')}});
(function hookReset(){const Bs=B();if(!Bs||!Bs.on){setTimeout(hookReset,50);return}Bs.on('reset',reset)})();
hook();
/* test hooks */
Tank.fire=()=>{const a=A();if(a.CV&&a.CV.type==='tank')fire(a,a.CV)};Tank.state=()=>({e:!!S.e,inside:!!(A().CV&&A().CV.type==='tank'),reload:S.reload,shells:S.shells.length,flat:S.flat.size,turret:S.turretYaw,props:S.props.filter(p=>p.down).length,pos:S.e?{x:S.e.pos.x,z:S.e.pos.z}:null});
})();
