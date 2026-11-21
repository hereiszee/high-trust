/* High Trust · HT.Jet — DAD-1, the Air Wing's twin-tail trainer at Fort Sensible (docs/base.md)
 * Parked on the apron by Hangar 2; E climbs in (it's registered as a borrowable car, type 'jet', with its own handling row).
 * Once you're in, this file flies it: index.html skips the ground physics for e.fly vehicles and calls the 'vehicle' hook, where
 * the flight model below moves the jet. HT.Vehicles.make('jet') returns the procedural model; HT.Vehicles.update('jet') poses it.
 *   W/S throttle · Shift afterburner · mouse (or arrow keys) pitch and roll · A/D roll (steer on the ground) · Z/X rudder
 *   G gear · V cockpit · C look back (toggle) · Shift afterburner (toggle) · E twice in the air: eject (the parachute drifts back to the post; the jet "is fine, it's a rental").
 *   Takeoff from runway 27, landing with the gear down; stall, comic crashes, a sonic boom over the neighbourhood (windows rattle, car
 *   alarms), contrails, flying under the High Bridge (an old rail viaduct over the river valley north of town), buzzing your house
 *   (the family comes out to wave). No weapons. While flying: a wider draw radius, far terrain to the horizon, lids on open interiors.
 */
(function(){'use strict';
const HT=window.HT=window.HT||{};
const Jet={};HT.Jet=Jet;
const J=()=>HT.Jobs;const A=()=>HT.Jobs&&HT.Jobs.api;const B=()=>HT.Base;const RO=()=>HT.Roam;const OWm=()=>HT.OpenWorld;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;const pick=a=>a[Math.floor(Math.random()*a.length)];const lerp=(a,b,t)=>a+(b-a)*t;
const T3=()=>THREE;const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const CALL='DAD-1',TOWER='Tower';
/* tuning: metres, seconds. TH thrust (m/s² at full throttle), AB afterburner, CD drag (top speed = sqrt(thrust/CD)) */
const K={TH:13.5,AB:10,CD:.00185,STALL:33,ROT:38,LIFTOFF:42,GROUND_DRAG:.012,BRAKE:12,PITCH:1.25,ROLL:2.6,YAW:.45,GEARH:0,TURN:2.6,MAXR:2200,WARNR:1500,BOOM:100,BOOM_ALT:80};
const FEEL={label:'jet',seats:1,bed:0,max:6,boostMax:8,acc:2,boostAcc:3,brake:8,hbrake:8,turn:1,steerResp:5,grip:20,roll:0,cam:[16,4],eng:2,gears:1,horn:'short',door:'close',rear:1,torque:0};
const LINES={
  enter:["DAD-1, Fort Sensible Tower. You're cleared for... honestly, whatever you want. Runway two-seven, wind calm.","DAD-1, Tower. Throttle up with W. Pull back at a hundred and forty. Linda says wear a jacket.","Tower to DAD-1. The jet is fueled, the coffee is not. Have a nice flight."],
  takeoff:["DAD-1, wheels up. Gear is G. Linda says call when you land.","DAD-1 is airborne. Somebody tell the HOA.","Nice rotation, DAD-1. Climb and enjoy. Stay off the neighbor's satellite dish."],
  stall:["DAD-1, you're stalling. Nose down. Like when you nap in the recliner.","Airspeed, DAD-1. Airspeed! Lower the nose, add throttle."],
  gear:["DAD-1, check your gear. G. The landing kind.","Gear, DAD-1. Planes like wheels when they land."],
  land:["Nice landing, DAD-1. Tower out.","Wheels down, all in one piece. I'll tell Linda.","Smooth. Smooth like a slow cooker. Tower out."],
  far:["DAD-1, you're leaving the neighborhood. Come back, your lasagna is getting cold.","DAD-1, that's the county line. Turn around. That's an order. That's a suggestion. Turn around."],
  boom:["SONIC BOOM. Every window on the block just rattled.","Was that a sonic boom? Over the CUL-DE-SAC?"],
  boomN:["My windows! My good windows!","That rattled my whole china cabinet!","Somebody's showing off.","Was that thunder? The sky is blue. That wasn't thunder."],
  bridge:["DAD-1 just flew UNDER the High Bridge. Tower did not see that. Tower is very impressed.","Under the bridge! Somebody write that down! Not on a form. On the fridge."],
  buzz:["Is that your father? Wave, kids! WAVE!","That's Dad! Hi Dad! HI DAD!","Your father is buzzing the house. In a jet. On a Tuesday."],
  eject:["DAD-1 has ejected. Repeat: DAD-1 is enjoying the parachute.","Ejection! DAD-1, sit back, the chute knows the way home. The jet is fine. It's a rental."],
  crash:["DAD-1... that was not a landing. That was a strongly worded suggestion to the ground.","The jet's fine. It's a rental. The ground is having a worse day."],
  ground:["DAD-1 is down safe. Somebody get him a juice box.","DAD-1 on the ground. The jet's already back in the hangar. Don't ask how."],
  refuse:"You can't take a jet to a job. Linda checked."};
const say=(who,t,front)=>{try{A().radio(who,t,front)}catch(_){}};

/* ================= the model ================= */
const MT={};function mt(k,o){return MT[k]||(MT[k]=new THREE.MeshStandardMaterial(o))}
function decalTex(){if(MT._dec)return MT._dec;const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.clearRect(0,0,512,128);
  x.fillStyle='#1e3a6e';x.font='900 84px "Arial Narrow", Arial';x.textBaseline='middle';x.fillText(CALL,20,66);x.font='700 26px Arial';x.fillText('FORT SENSIBLE AIR WING',236,48);x.fillText('PLEASE BE REASONABLE',236,86);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return MT._dec=t}
function tailTex(){if(MT._tail)return MT._tail;const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');x.clearRect(0,0,256,256);if(B()&&B().badge)B().badge(x,128,118,80);
  x.fillStyle='#1e3a6e';x.font='900 34px Arial';x.textAlign='center';x.fillText('FS',128,236);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return MT._tail=t}
function model(o){const T=T3(),K2=B().kit,root=new T.Group(),W='#e9ebe8',G2='#a9afb4',BL='#2b4d86',DK='#2a2d31';
  const body=new T.Group();root.add(body);const P=K2.painter();
  /* fuselage: a lathe along x (nose at +x), the canopy, intakes, spine */
  const prof=[[-5.2,.0],[-5.1,.42],[-4.4,.62],[-2.6,.72],[-.6,.78],[1.4,.72],[2.8,.6],[4.2,.38],[5.2,.14],[5.6,.0]];
  const lg=new T.LatheGeometry(prof.map(([x,r])=>new T.Vector2(r,x)),20);lg.rotateZ(-Math.PI/2);lg.scale(1,1,1.08);P.geo('paint',lg,K2.M4(0,1.85,0),W);
  P.geo('paint',new T.ConeGeometry(.15,.8,12),K2.M4(5.9,1.85,0,0,0,-Math.PI/2),DK);
  /* the blue cheat-line and the grey belly */
  P.box('paint',-4,1.42,-.86,3.6,1.62,.86,G2);for(const s of[-1,1])P.obox('paint',.3,2.0,s*.79,8.4,.12,.02,0,BL);
  for(const s of[-1,1]){P.box('paint',-1.6,1.25,s*.75-.3,1.4,2.15,s*.75+.3,W);P.box('dark',1.35,1.35,s*.75-.25,1.45,2.05,s*.75+.25,'#0d0f12');}   /* intakes */
  P.box('paint',-4.6,2.5,-.18,-.6,2.75,.18,W);                                 /* spine */
  /* wings: a cranked delta-ish plan, thin, with a blue stripe at the tips */
  const wing=(s)=>{const g=P.g('paint'),c=K2.C3(W),y=1.68;const a=[1.6,y,s*.7],b=[-1.8,y,s*.7],cc=[-2.6,y-.06,s*4.3],d=[-1.5,y-.06,s*4.3];
    g.quad(a,b,cc,d,[[0,0],[1,0],[1,1],[0,1]],c,[0,1,0]);g.quad(d,cc,b,a,[[0,0],[1,0],[1,1],[0,1]],K2.C3(G2),[0,-1,0]);
    g.quad([1.6,y-.12,s*.7],[1.6,y,s*.7],[-1.5,y-.06,s*4.3],[-1.5,y-.16,s*4.3],[[0,0],[1,0],[1,1],[0,1]],c,[1,0,0]);
    P.box('paint',-2.65,y-.16,s*4.2-.12,-1.45,y,s*4.2+.12,BL)};wing(-1);wing(1);
  /* tails: two canted fins, two stabilisers */
  for(const s of[-1,1]){const g=P.g('paint');const r=K2.C3(W),x0=-5,x1=-3.2,base=[[-3.0,2.4,s*.55],[-5.05,2.4,s*.55]],top=[[-4.7,4.15,s*1.05],[-5.6,4.15,s*1.05]];
    g.quad(base[0],base[1],top[1],top[0],[[0,0],[1,0],[1,1],[0,1]],r,[0,0,s]);g.quad(top[0],top[1],base[1],base[0],[[0,0],[1,0],[1,1],[0,1]],r,[0,0,-s]);
    const st=P.g('paint');st.quad([-3.9,1.9,s*.6],[-5.3,1.9,s*.6],[-5.5,1.88,s*2.3],[-4.7,1.88,s*2.3],[[0,0],[1,0],[1,1],[0,1]],K2.C3(W),[0,1,0]);
    st.quad([-4.7,1.88,s*2.3],[-5.5,1.88,s*2.3],[-5.3,1.9,s*.6],[-3.9,1.9,s*.6],[[0,0],[1,0],[1,1],[0,1]],K2.C3(G2),[0,-1,0])}
  /* engines: two nozzles at the back */
  for(const s of[-1,1]){P.cyl('metal',-5.3,1.82,s*.36,.34,.3,.6,'#5e6166',14,0,Math.PI/2);P.cyl('dark',-5.62,1.82,s*.36,.27,.27,.04,'#14161a',14,0,Math.PI/2)}
  /* the cockpit: a seat, a dash, a stick, a rail (seen from the cockpit view) */
  P.box('dark',2.25,1.9,-.36,2.75,2.16,.36,'#2a2e33');P.box('glow',2.24,2.02,-.26,2.26,2.13,.26,'#4fd18a');P.box('paint',.5,1.9,-.38,1.1,2.6,.38,'#3a3f46');P.cyl('metal',1.6,2.1,0,.025,.025,.5,DK,6);
  P.flush(body);
  /* canopy: a glass bubble (its own mesh so ejecting can throw it) */
  const cg=new T.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI/2);cg.scale(1.9,.62,.62);const canopy=new T.Mesh(cg,mt('jglass',{color:new T.Color('#5d7f99').convertSRGBToLinear(),roughness:.05,metalness:.3,transparent:true,opacity:.42,depthWrite:false}));
  canopy.position.set(1.5,2.38,0);body.add(canopy);const frame=new T.Mesh(new T.TorusGeometry(.6,.035,6,16,Math.PI),mt('jframe',{color:new T.Color('#2a2d31'),roughness:.6}));frame.position.set(1.2,2.38,0);frame.rotation.y=Math.PI/2;body.add(frame);
  /* decals: the callsign on both sides of the nose, the badge on both tails */
  for(const s of[-1,1]){const d=new T.Mesh(new T.PlaneGeometry(3.2,.8),mt('jdec',{map:decalTex(),transparent:true,alphaTest:.05,roughness:.5}));d.position.set(2.6,1.95,s*.8);d.rotation.y=s>0?0:Math.PI;if(s<0)d.scale.x=1;body.add(d);
    const tl=new T.Mesh(new T.PlaneGeometry(1.1,1.1),mt('jtail',{map:tailTex(),transparent:true,alphaTest:.05,roughness:.5,side:T.DoubleSide}));tl.position.set(-4.65,3.25,s*.84);tl.rotation.set(s*-.29,0,0);body.add(tl)}
  /* nav lights: red left, green right, white tail */
  const nav=[];for(const[x,z,c]of[[-2.2,-4.32,'#ff2a2a'],[-2.2,4.32,'#2aff6a'],[-5.6,0,'#ffffff']]){const m=new T.Mesh(new T.SphereGeometry(.07,8,6),new T.MeshBasicMaterial({color:new T.Color(c).multiplyScalar(3),toneMapped:false}));m.position.set(x,1.66,z);body.add(m);nav.push(m)}
  /* afterburner glow: additive cones behind the nozzles */
  const abm=new T.MeshBasicMaterial({color:new T.Color(3.2,1.6,.6),transparent:true,opacity:.0,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const ab=[];for(const s of[-1,1]){const cn=new T.Mesh(new T.ConeGeometry(.26,2.2,12,1,true),abm);cn.rotation.z=Math.PI/2;cn.position.set(-6.7,1.82,s*.36);body.add(cn);ab.push(cn)}
  /* landing gear: nose and two mains, each a group that folds up */
  const gear=[];const gearM=mt('jgear',{color:new T.Color('#c9cdd1'),roughness:.4,metalness:.6}),tyre=mt('jtyre',{color:new T.Color('#151515'),roughness:.9});
  for(const[x,z,h]of[[3.9,0,1.35],[-1.2,-1.3,1.4],[-1.2,1.3,1.4]]){const g=new T.Group();g.position.set(x,h+.25,z);const leg=new T.Mesh(new T.CylinderGeometry(.06,.06,h,8),gearM);leg.position.y=-h/2;g.add(leg);
    const w=new T.Mesh(new T.CylinderGeometry(.3,.3,.18,14),tyre);w.rotation.x=Math.PI/2;w.position.y=-h+.05;g.add(w);body.add(g);gear.push(g)}
  /* the pilot: a helmet and a visor under the canopy (the dad himself rides hidden; seats are at ground level in the game's car code) */
  const pilot=new T.Group();const hm=new T.Mesh(new T.SphereGeometry(.2,14,10),mt('jhelm',{color:new T.Color('#e9e6dc').convertSRGBToLinear(),roughness:.5}));pilot.add(hm);
  const vs=new T.Mesh(new T.SphereGeometry(.205,14,8,-Math.PI/2.6,Math.PI/1.3,Math.PI/2.8,Math.PI/4),mt('jvis',{color:new T.Color('#c9902a'),roughness:.15,metalness:.6}));vs.rotation.y=Math.PI/2;pilot.add(vs);
  const sh=new T.Mesh(new T.BoxGeometry(.32,.3,.5),mt('jsuit',{color:new T.Color('#5a6438').convertSRGBToLinear(),roughness:.9}));sh.position.y=-.3;pilot.add(sh);pilot.position.set(1.15,2.5,0);pilot.visible=false;body.add(pilot);
  root.traverse(m=>{if(m.isMesh){m.castShadow=!m.material.transparent;m.receiveShadow=true;m.userData.noBatch=true}});
  root.userData.size={l:11.4,w:8.8,h:3.6};root.userData.type='jet';root.userData.jet={body,canopy,nav,ab,abm,gear,frame,pilot};return root}
Jet.model=model;
(function wrap(){const Vh=HT.Vehicles;if(!Vh||!Vh.make){setTimeout(wrap,30);return}if(Vh.make._jet)return;const make0=Vh.make,upd0=Vh.update;
  Vh.make=function(type,o){if(type==='jet')return model(o||{});return make0.apply(this,arguments)};Vh.make._jet=true;
  Vh.update=function(v,o){if(v&&v.userData&&v.userData.type==='jet')return pose(v);return upd0.apply(this,arguments)}})();

/* ================= state ================= */
const F={on:false,air:false,pos:V(0,0,0),q:new THREE.Quaternion(),spd:0,thr:0,ab:0,gear:1,gearK:1,yaw:0,pitchG:0,vs:0,
  stall:false,warnT:0,said:{},boomT:-99,bridgeT:-99,buzzT:-99,trails:[[],[]],chute:null,lastAlt:0,far:null,lid:null,fly:false,inp:{p:0,r:0}};
const S={e:null,L:null,taught:{},fam:[],famT:0,simT:0};
Jet.F=F;Jet.S=S;
function sv(){try{const s=A().SV();return s&&s.base}catch(_){return null}}
function persist(){try{A().save()}catch(_){}}
function glue(){const a=A();if(!a||typeof a.carFeel!=='function')return false;if(!glue.done){a.carFeel('jet',FEEL,[[1.4,1.65,0]]);glue.done=true}return true}
function ensure(a){const d=B().def();if(!d||!glue())return;if(S.e&&a.L.cars&&a.L.cars.includes(S.e)&&S.L===a.L)return;
  let v=null;try{v=a.makeVehicle('jet','#e9ebe8')}catch(_){v=null}if(!v)return;v.userData.lod=0;v.position.set(d.jet.x,0,d.jet.z);a.L.group.add(v);const e=a.registerCar(v,d.jet.x,d.jet.z);if(!e)return;
  e.type='jet';e.name='the Air Wing';e.owner='base';e.yaw=d.jet.yaw;e.home={x:d.jet.x,z:d.jet.z,yaw:d.jet.yaw};e.noJobs=LINES.refuse;e.jet=true;a.syncCar(e);S.e=e;S.L=a.L;pose(v)}
/* the model's transform from the flight state (or parked on its wheels) */
function pose(v){const j=v.userData.jet;if(!j)return;const a=A();const e=S.e;
  if(e&&a&&a.CV===e&&F.on){v.position.copy(F.pos);v.quaternion.copy(F.q)}
  else{v.position.y=0}
  /* gear fold, nav light blink, afterburner */
  for(let i=0;i<j.gear.length;i++){const g=j.gear[i];g.rotation.z=(1-F.gearKFor(v))*(i?1.4:-1.5);g.visible=F.gearKFor(v)>.02}
  j.pilot.visible=!!(e&&a&&a.CV===e&&F.on&&!(a.P&&a.P.fp));
  const t=performance.now()/1000;j.nav[2].visible=(t%1.2)<.15;
  const abK=a&&a.CV===e&&F.on?F.thr*.35+F.ab*.65:0;j.abm.opacity=abK*.9;for(const c of j.ab){c.scale.set(1,.5+abK*1.2,1);c.visible=abK>.02}}
F.gearKFor=v=>S.e&&v===S.e.obj?F.gearK:1;

/* ================= the flight model (vehicle hook) ================= */
const _f=V(0,0,0),_u=V(0,0,0),_r=V(0,0,0),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_y=V(0,1,0);
function start(a,e){try{OWm().buildAhead&&OWm().buildAhead(900)}catch(_){}/* stream the town in while taxiing, not in the air */F.on=true;F.air=false;F.look=false;F.abOn=false;F.ejArm=null;F.pos.set(e.pos.x,0,e.pos.z);F.spd=0;F.thr=0;F.ab=0;F.gear=1;F.gearK=1;F.stall=false;F.pitchG=0;F.prevYaw=null;
  F.q.setFromEuler(_e.set(0,e.yaw+Math.PI/2,0,'YZX'));e.fly=true;F.trails=[[],[]];F.said={};F.flightT=0;
  const s=sv();if(s&&s.jet)s.jet.flights=(s.jet.flights|0)+1;say(TOWER,pick(LINES.enter),true);
  try{if(HT.People&&HT.People.preload)HT.People.preload(['wife','son','daughter'])}catch(_){}/* so they can come out and wave when you buzz the house */
  teach(a,'fly1','Jet: tap W / S to set the throttle (it stays) · Shift afterburner on/off at 100% · A / D steer on the ground · nose up (mouse up or ↑) past 90 mph to take off');
  hudShow(true)}
function stop(a,e){try{OWm().buildAhead&&OWm().buildAhead(0)}catch(_){}F.on=false;F.air=false;if(e){e.fly=false;e.noExit=false}flight(false);hudShow(false);jetSound(0,0)}
function vehicle(e,dt){if(!e||e.type!=='jet')return;const a=A();if(!F.on)start(a,e);const c=e.car,k=a.keys,P=a.P;
  /* inputs: the mouse moves P.yaw / P.pitch (index.html look()); we read and reset them every frame, keys add to them */
  const mdx=(F.prevYaw==null?0:F.prevYaw-P.yaw),mdy=(F.prevPitch==null?0:P.pitch-F.prevPitch);P.yaw=0;P.pitch=0;F.prevYaw=0;F.prevPitch=0;
  const look=!!F.look;/* C toggles the look back (keydown below): no held view keys */
  /* nose up = mouse up or ↑ (the game's look convention, so a player never has to think "inverted"); pitchIn > 0 is nose down */
  let pitchIn=-clamp(mdy*14,-1,1)+((k.arrowdown?1:0)-(k.arrowup?1:0)),rollIn=clamp(mdx*-14,-1,1)*-1+((k.d?1:0)-(k.a?1:0)),yawIn=(k.x?1:0)-(k.z?1:0)+(F.air?0:((k.arrowright?1:0)-(k.arrowleft?1:0)));
  if(F.air)rollIn+=(k.arrowright?1:0)-(k.arrowleft?1:0);
  pitchIn=clamp(pitchIn,-1,1);rollIn=clamp(rollIn,-1,1);F.inp.p=pitchIn;F.inp.r=rollIn;
  /* throttle and afterburner */
  /* set-and-stay: a tap of W / S steps it 10% (keydown below), holding ramps it; nothing has to be held to keep flying. Shift toggles the afterburner */
  if(k.w)F.thr=Math.min(1,F.thr+dt*.65);if(k.s)F.thr=Math.max(0,F.thr-dt*.8);if(F.thr<.9)F.abOn=false;F.ab+=((F.abOn?1:0)-F.ab)*Math.min(1,dt*3);
  if(!F.air)ground(a,e,dt,pitchIn,yawIn,k);else air(a,e,dt,pitchIn,rollIn,yawIn);
  /* hand the pose to the car entry (the game's camera, map, sound and exit code read these) */
  _f.set(1,0,0).applyQuaternion(F.q);e.pos.set(F.pos.x,0,F.pos.z);const hy=Math.atan2(-_f.x,-_f.z);c.x=F.pos.x;c.z=F.pos.z;c.yaw=hy;c.spd=F.air?F.spd:F.spd;c.steer=0;e.noExit=F.air||F.spd>4;
  F.vsT=(F.vsT||0)+dt;jetSound(F.thr+F.ab*.5,F.spd);events(a,e,dt);trails(a,e,dt);
  flight(F.air&&F.pos.y>8)}
function ground(a,e,dt,pitchIn,yawIn,k){/* rolling: thrust, rolling drag, brakes, nose-wheel steering; rotate past ROT and lift off */
  const st=(k.a?1:0)-(k.d?1:0);const acc=F.thr*K.TH+F.ab*K.AB-K.GROUND_DRAG*9.8-K.CD*F.spd*F.spd-(F.thr<.05||k[' ']?K.BRAKE:0);/* idle on the ground = wheel brakes on (nothing held) */
  F.spd=Math.max(0,F.spd+acc*dt);if(F.thr<.02&&F.spd<.3&&!k.w)F.spd=0;
  _e.setFromQuaternion(F.q,'YZX');let yaw=_e.y,pitch=_e.z;yaw+=(st+yawIn*.6)*dt*(F.spd<1?0:F.spd<30?.55:.25);
  const wantP=F.spd>K.ROT?clamp(-pitchIn,0,1)*.22:0;pitch+=(wantP-pitch)*Math.min(1,dt*2.2);
  F.q.setFromEuler(_e.set(0,yaw,pitch,'YZX'));_f.set(1,0,0).applyQuaternion(F.q);F.pos.x+=_f.x*F.spd*dt;F.pos.z+=_f.z*F.spd*dt;F.pos.y=0;
  /* off the paved area at speed: bumpy, slows you down; buildings stop you (comic) */
  if(hitSolid(a,F.pos.x,F.pos.z,1.5)&&F.spd>2){crash(a,e,'ground');return}
  if(pitch>.1&&F.spd>K.LIFTOFF){F.air=true;F.pos.y=.6;F.vs=0;say(TOWER,pick(LINES.takeoff));teach(a,'fly2','In the air: mouse or ↑ ↓ pitch (mouse up = nose up) · A / D or ← → roll · Z / X rudder · G gear · V cockpit · C look back · E twice to eject')}}
function air(a,e,dt,pitchIn,rollIn,yawIn){const eff=clamp((F.spd-12)/45,.12,1);
  /* body rotations (local axes: x forward, y up, z right): pitch about z, roll about x, yaw about -y */
  _q.setFromEuler(_e.set(rollIn*K.ROLL*eff*dt,-yawIn*K.YAW*eff*dt,-pitchIn*K.PITCH*eff*dt,'XYZ'));F.q.multiply(_q);
  _f.set(1,0,0).applyQuaternion(F.q);_u.set(0,1,0).applyQuaternion(F.q);_r.set(0,0,1).applyQuaternion(F.q);
  /* coordinated turn: bank turns the heading (g·tan(bank)/v), and a stalled nose drops toward the ground */
  const bank=Math.atan2(-_r.y,_u.y);const turn=K.TURN*9.8*Math.tan(clamp(bank,-1.35,1.35))/Math.max(F.spd,22)*clamp(_u.y*1.5,0,1);/* K.TURN: arcade g (a 460 m town needs tight turns) */_q.setFromAxisAngle(_y,-turn*dt);F.q.premultiply(_q);
  F.stall=F.spd<K.STALL;if(F.stall){const drop=(1-F.spd/K.STALL)*1.2*dt;_q.setFromAxisAngle(_r,-drop*Math.sign(_f.y+.5));F.q.premultiply(_q)}
  F.q.normalize();_f.set(1,0,0).applyQuaternion(F.q);
  /* speed along the path: thrust, drag, gravity along the climb; sink when slow */
  F.spd+= (F.thr*K.TH+F.ab*K.AB-K.CD*F.spd*F.spd-9.8*_f.y)*dt;F.spd=Math.max(0,F.spd);
  const sink=9.8*Math.max(0,1-Math.pow(F.spd/K.STALL,2))*1.6+(F.gear?.4:0)*Math.max(0,1-F.spd/50);
  const settle=F.gear&&F.lastAlt<4&&F.thr<.5&&_f.y<.08?1.6:0;/* the flare: gear down, throttle back, a few metres up, it settles onto the wheels instead of floating down the runway */
  const vy=_f.y*F.spd-sink-settle;F.vs=vy;F.pos.x+=_f.x*F.spd*dt;F.pos.z+=_f.z*F.spd*dt;F.pos.y+=vy*dt;
  F.gearK+=((F.gear?1:0)-F.gearK)*Math.min(1,dt*1.4);
  /* the boundary: far out, the tower talks; farther, a gentle hand turns you home */
  const cx=232,cz=128,dd=Math.hypot(F.pos.x-cx,F.pos.z-cz);if(dd>K.WARNR&&!F.said.far){F.said.far=1;say(TOWER,pick(LINES.far),true)}if(dd<K.WARNR-200)F.said.far=0;
  if(dd>K.MAXR){const want=Math.atan2(-(cx-F.pos.x),-(cz-F.pos.z)),hy=Math.atan2(-_f.x,-_f.z);let d2=want-hy;d2=Math.atan2(Math.sin(d2),Math.cos(d2));_q.setFromAxisAngle(_y,d2*dt*.8);F.q.premultiply(_q)}
  /* the ground, buildings, the High Bridge */
  const gy=groundY(a,F.pos.x,F.pos.z);
  if(F.pos.y<=gy+.05||(F.gear&&F.gearK>.8&&F.pos.y<=gy+.4&&F.vs<1)){/* gear down: the wheels take the ground within 0.4 m (no skimming the length of the runway) */const ok=F.gear&&F.gearK>.8&&F.vs>-7&&Math.abs(bank)<.4&&_f.y>-.2&&gy<.5;if(ok)touchdown(a,e);else crash(a,e,'ground')}
  else if(F.pos.y<14&&hitSolid(a,F.pos.x,F.pos.z,2.5,F.pos.y))crash(a,e,'building');
  else if(bridgeHit(F.pos))crash(a,e,'bridge');
  F.lastAlt=F.pos.y-gy;
  if(F.stall&&F.lastAlt>4){F.warnT-=dt;if(F.warnT<=0){F.warnT=6;say(TOWER,pick(LINES.stall),true);beep(820)}}
  if(!F.gear&&F.lastAlt<25&&F.spd<60&&F.vs<-1){if(!F.said.gear){F.said.gear=1;say(TOWER,pick(LINES.gear),true)}}else if(F.lastAlt>60)F.said.gear=0}
function touchdown(a,e){F.air=false;F.pos.y=0;_e.setFromQuaternion(F.q,'YZX');F.q.setFromEuler(_e.set(0,_e.y,Math.max(0,_e.z),'YZX'));
  try{const Fx=HT.FX;if(Fx){for(const s of[-1,1])Fx.tyreSmoke&&Fx.tyreSmoke(V(F.pos.x,0,F.pos.z),.8)}}catch(_){}tone(160,90,.2,.12);
  const onRunway=(()=>{const d=B().def();if(!d)return false;const r=d.runway;return F.pos.x>r.x0&&F.pos.x<r.x1&&F.pos.z>r.z0-6&&F.pos.z<r.z1+6})();
  say(TOWER,onRunway?pick(LINES.land):"That's... not the runway, DAD-1. But you're down. That counts.",true);const s=sv();if(s&&s.jet)s.jet.landings=(s.jet.landings|0)+1}
/* ground height under the jet: 0 on the map (roads sit a little lower), the backdrop hills and the far terrain outside it */
const _rc=new THREE.Raycaster(),_dn=V(0,-1,0);
function groundY(a,x,z){const def=a.WORLD;if(def&&x>0&&z>0&&x<def.W*2&&z<def.H*2)return 0;
  F.gyT=(F.gyT||0);if(F.gyAt&&Math.hypot(F.gyAt.x-x,F.gyAt.z-z)<6)return F.gyV;const meshes=[];const O=OWm();
  try{const ws=a.L.ow;for(const u of ws.units)if(u.sp&&u.sp.id==='backdrop'&&u.group)u.group.traverse(m=>{if(m.isMesh&&!m.isInstancedMesh)meshes.push(m)})}catch(_){}
  if(F.far)meshes.push(F.far);_rc.set(V(x,400,z),_dn);_rc.far=800;const h=_rc.intersectObjects(meshes,false)[0];F.gyAt={x,z};F.gyV=h?h.point.y:0;return F.gyV}
function hitSolid(a,x,z,r,y){const L=a.L;if(!L||!L.cnear)return false;for(const c of L.cnear(x,z,8)){if(c.off||!(c.ph>0))continue;if(c.k==='fence'||c.k==='tree'&&y!=null&&y>3.5)continue;
    if(y!=null&&y>c.ph)continue;if(x>c.x0-r&&x<c.x1+r&&z>c.z0-r&&z<c.z1+r){if(S.e&&c===S.e.col)continue;return true}}return false}
function crash(a,e,why){const s=sv();if(s&&s.jet)s.jet.crashes=(s.jet.crashes|0)+1;
  try{const Fx=HT.FX;if(Fx){Fx.explosion(F.pos.clone().setY(Math.max(.3,F.pos.y)),.9);Fx.impact(F.pos.clone(),V(0,1,0),'dirt',{big:true});Fx.shake(.7)}}catch(_){}
  tone(90,30,.6,.3);tone(600,1400,.25,.08,.15);say(TOWER,pick(LINES.crash),true);eject(a,e,true)}

/* ================= events: takeoff/landing lines live above; sonic boom, the bridge, buzzing home ================= */
function events(a,e,dt){if(!F.air)return;F.flightT+=dt;const reg=HT.WorldGen.regionAt(F.pos.x,F.pos.z),overTown=reg==='maple'||reg==='river'||reg==='route9';
  if(F.spd>K.BOOM&&F.lastAlt<K.BOOM_ALT&&overTown&&a.simT-F.boomT>25){F.boomT=a.simT;sonicBoom(a)}
  /* the house: within 80 m, under 50 m: the family comes out and waves */
  const h=a.L.start;if(h&&Math.hypot(F.pos.x-h.x,F.pos.z-h.z)<90&&F.lastAlt<60&&a.simT-F.buzzT>60){F.buzzT=a.simT;buzz(a)}}
function sonicBoom(a){const s=sv();if(s&&s.jet&&!s.jet.boom){s.jet.boom=true;persist();a.feed('Achievement · Sonic boom over the neighborhood','trust')}
  boom();try{HT.FX&&HT.FX.shake(.5)}catch(_){}a.feed(pick(LINES.boom),'info');setTimeout(()=>say(pick(['Barb','Linda','Phil','Marcy','Ted','Gil','Bev']),pick(LINES.boomN)),900);
  /* car alarms within 120 m of the pass */
  let n=0;for(const c of a.L.cars||[]){if(!c.obj||c===S.e)continue;if(Math.hypot(c.pos.x-F.pos.x,c.pos.z-F.pos.z)<120&&n<6){n++;alarm(n*.13)}}}
function buzz(a){const s=sv();if(s&&s.jet&&!s.jet.buzz){s.jet.buzz=true;persist();a.feed('Achievement · Buzzed your own house','trust')}
  say(pick(['Linda']),pick(LINES.buzz),true);family(a)}
/* the family on the front lawn, waving, for half a minute (HT.People's family models; never restyled) */
function family(a){if(S.fam.length){S.famT=30;return}const PP=HT.People;const st=a.L.start;if(!PP||!PP.ok||!st)return;
  /* on the front lawn, beside the driveway, in front of the door (falls back to the dad's start) */
  const dr=a.WORLD&&a.WORLD.doors&&a.WORLD.doors.home,h=dr?{x:dr.x-3.6,z:dr.z-0.6}:st;
  const spots=[[0,-2.6],[1.3,-3.2],[-1.3,-3.2]];['wife','son','daughter'].forEach((r,i)=>{let d=null;try{d=PP.make(r)}catch(_){d=null}if(!d)return;d.root.position.set(h.x+spots[i][0],0,h.z+spots[i][1]);d.root.rotation.y=Math.PI;a.L.group.add(d.root);S.fam.push({d,ph:i*1.3})});
  /* not loaded yet (they stream in): load them, then they come out */
  if(!S.fam.length&&!S.famWait&&PP.preload){S.famWait=1;try{PP.preload(['wife','son','daughter']).then(()=>{S.famWait=0;if(a.L&&a.L.start===st)family(a)},()=>{S.famWait=0})}catch(_){S.famWait=0}}
  S.famT=30}
function familyTick(a,dt){if(!S.fam.length)return;S.famT-=dt;for(const f of S.fam){try{a.pose(f.d,dt,{})}catch(_){}const b=f.d.rb&&f.d.rb.bones;if(b){const ua=b.Bip01_R_UpperArm,fa=b.Bip01_R_Forearm;const t=performance.now()/1000+f.ph;if(ua){ua.rotation.z-=1.9;ua.rotation.x+=Math.sin(t*7)*.35}if(fa)fa.rotation.z-=.6}
    /* look at the jet */if(F.on){const dx=F.pos.x-f.d.root.position.x,dz=F.pos.z-f.d.root.position.z;f.d.root.rotation.y=Math.atan2(dx,dz)}}
  if(S.famT<=0){for(const f of S.fam){f.d.root.parent&&f.d.root.parent.remove(f.d.root)}S.fam=[]}}
/* the High Bridge: an old rail viaduct across the river valley north of town (built as a set piece, see below) */
const HB={z:-64,x0:206,x1:384,deck:15,river:[282,306]};
function bridgeHit(p){if(Math.abs(p.z-HB.z)>3.2||p.x<HB.x0||p.x>HB.x1)return false;if(p.y>HB.deck-1.3&&p.y<HB.deck+1.6)return true;
  /* piers */for(let x=HB.x0+12;x<HB.x1;x+=22)if(Math.abs(p.x-x)<1.8&&(x<HB.river[0]-2||x>HB.river[1]+2)&&p.y<HB.deck)return true;return false}
function bridgeCheck(a,prev){const p=F.pos;if(!F.air)return;if((prev.z-HB.z)*(p.z-HB.z)<=0&&p.x>HB.x0&&p.x<HB.x1&&p.y<HB.deck-1.3&&p.y>0&&a.simT-F.bridgeT>10){F.bridgeT=a.simT;const s=sv();
    if(s&&s.jet&&!s.jet.bridge){s.jet.bridge=true;persist();a.feed('Achievement · Flew under the High Bridge','trust')}say(TOWER,pick(LINES.bridge),true);tone(660,990,.3,.1)}}

/* ================= eject and the parachute ================= */
function eject(a,e,crashed){const s=sv();if(s&&s.jet&&!crashed)s.jet.ejects=(s.jet.ejects|0)+1;const from=F.pos.clone(),vel=V(0,crashed?14:22,0);_f.set(1,0,0).applyQuaternion(F.q);vel.addScaledVector(_f,Math.min(F.spd,40)*.5);
  stop(a,e);try{a.exitCar()}catch(_){}
  /* the jet goes home: it's a rental */
  const d=B().def();if(d&&e){e.pos.set(d.jet.x,0,d.jet.z);e.yaw=d.jet.yaw;try{a.owStopCar(e);a.syncCar(e)}catch(_){}e.obj.quaternion.setFromEuler(_e.set(0,d.jet.yaw+Math.PI/2,0,'YZX'));e.obj.position.y=0}
  if(!crashed)say(TOWER,pick(LINES.eject),true);tone(200,900,.5,.15);
  F.chute={p:from.clone().setY(Math.max(from.y,2)+2),v:vel,t:0,open:false,mesh:chuteMesh(a)};teach(a,'chute','Parachute: sit back, it steers itself back to Fort Sensible')}
function chuteMesh(a){const T=T3(),g=new T.Group();const cg=new T.SphereGeometry(3.4,16,8,0,Math.PI*2,0,Math.PI/2.6);const cm=new T.MeshStandardMaterial({color:new T.Color('#f6f2e8').convertSRGBToLinear(),roughness:.8,side:T.DoubleSide});
  const can=new T.Mesh(cg,cm);can.scale.y=.55;can.position.y=5.2;g.add(can);
  const stripe=new T.Mesh(new T.SphereGeometry(3.42,16,2,0,Math.PI*2,Math.PI/3.4,.18),new T.MeshStandardMaterial({color:new T.Color('#e46d1f').convertSRGBToLinear(),roughness:.8,side:T.DoubleSide}));stripe.scale.y=.55;stripe.position.y=5.2;g.add(stripe);
  const lm=new T.LineBasicMaterial({color:0x444444});for(let i=0;i<8;i++){const a2=i/8*Math.PI*2;const geo=new T.BufferGeometry().setFromPoints([V(0,1.6,0),V(Math.cos(a2)*3.1,5,Math.sin(a2)*3.1)]);g.add(new T.Line(geo,lm))}
  g.scale.setScalar(.05);a.L.group.add(g);return g}
function chuteTick(a,dt){const c=F.chute;if(!c)return;c.t+=dt;const P=a.P,k=a.keys,d=B().def();
  if(!c.open&&c.t>.9)c.open=true;
  if(!c.open){c.v.y-=9.8*dt;c.p.addScaledVector(c.v,dt)}
  else{c.mesh.scale.setScalar(Math.min(1,c.mesh.scale.x+dt*2));/* steer, and drift home to the post */
    const home=d?V(d.jet.x-14,0,d.jet.z-6):V(c.p.x,0,c.p.z);let hx=home.x-c.p.x,hz=home.z-c.p.z;const hl=Math.hypot(hx,hz)||1;hx/=hl;hz/=hl;
    /* automatic: no keys under the canopy (the owner's rule: nothing held); it turns to face the post and drifts home */
    {let dy=Math.atan2(-hx,-hz)-(c.yaw||0);dy=Math.atan2(Math.sin(dy),Math.cos(dy));c.yaw=(c.yaw||0)+dy*Math.min(1,dt*.8)}
    const drift=hl>4?Math.min(9,hl*.2+3):0;c.v.x+=(hx*drift-c.v.x)*Math.min(1,dt*.8);c.v.z+=(hz*drift-c.v.z)*Math.min(1,dt*.8);
    c.v.y+=(-3.4-c.v.y)*Math.min(1,dt*2);c.p.addScaledVector(c.v,dt)}
  const gy=groundY(a,c.p.x,c.p.z);
  P.pos.set(c.p.x,0,c.p.z);c.mesh.position.set(c.p.x,c.p.y,c.p.z);c.mesh.rotation.y=c.yaw||0;
  if(P.dude){P.dude.root.position.set(c.p.x,c.p.y,c.p.z);P.dude.root.rotation.y=(c.yaw||0)+Math.PI;P.dude.root.visible=true}
  if(c.p.y<=gy+.05&&c.t>1.5){F.chute=null;c.mesh.parent&&c.mesh.parent.remove(c.mesh);P.pos.set(c.p.x,0,c.p.z);try{a.collide(P.pos,.35)}catch(_){}say(TOWER,pick(LINES.ground),true);tone(300,200,.15,.1)}}

/* ================= camera: chase, cockpit (V), look back (C); the parachute ================= */
const _c=V(0,0,0),_t=V(0,0,0);
/* hooks answer undefined when they don't apply: HT.Jobs keeps the first non-undefined answer */
function camera(dt){const a=A();if(!a)return;const cam=a.camera;
  if(F.chute){const c=F.chute;_t.copy(c.p).add(V(0,1.2,0));const back=V(Math.sin(c.yaw||0),0,Math.cos(c.yaw||0));_c.copy(_t).addScaledVector(back,9).add(V(0,3.5,0));
    if(!F.camP)F.camP=_c.clone();F.camP.lerp(_c,Math.min(1,dt*4));cam.position.copy(F.camP);cam.lookAt(_t.x,_t.y+1.5,_t.z);farFog(a,true);return true}
  const e=a.CV;if(!e||e.type!=='jet'||!F.on)return;const P=a.P;
  _f.set(1,0,0).applyQuaternion(F.q);_u.set(0,1,0).applyQuaternion(F.q);
  if(P.fp){/* cockpit: the pilot's eye under the canopy; the jet's own nose and frame in view */
    _c.set(1.35,2.55,0).applyQuaternion(F.q).add(F.pos);cam.position.copy(_c);const back=a.keys.c;const dir=back?_f.clone().negate():_f;
    cam.up.copy(_u);cam.lookAt(_c.x+dir.x*20,_c.y+dir.y*20,_c.z+dir.z*20);cam.up.set(0,1,0);cam.fov+=(78-cam.fov)*Math.min(1,dt*5)}
  else{/* chase: behind and above, lagging a little in roll, with speed-stretched distance */
    const D=15+F.spd*.06,up=F.air?_u.clone().lerp(V(0,1,0),.6).normalize():V(0,1,0);const back=a.keys.c?-1:1;
    _c.copy(F.pos).addScaledVector(_f,-D*back).addScaledVector(up,4.2).add(V(0,1.6,0));_c.y=Math.max(_c.y,groundY(a,_c.x,_c.z)+1.2);
    if(!F.camP||F.camP.distanceTo(_c)>60)F.camP=_c.clone();F.camP.lerp(_c,Math.min(1,dt*(F.air?5:8)));cam.position.copy(F.camP);
    _t.copy(F.pos).add(V(0,2.2,0)).addScaledVector(_f,10*back);cam.up.copy(up);cam.lookAt(_t);cam.up.set(0,1,0);
    const fov=72+Math.min(14,F.spd*.1)+F.ab*4;cam.fov+=(fov-cam.fov)*Math.min(1,dt*3)}
  cam.updateProjectionMatrix();
  try{RO().sunFollow(F.pos.x,F.pos.z,_f.x,_f.z)}catch(_){}
  farFog(a,F.air);return true}
/* while flying: see far (camera far, fog pushed out), the far terrain ring, and a wider draw radius in the open world */
let FOG0=null;
function farFog(a,on){const sc=a.scene,cam=a.camera;if(on){if(!FOG0&&sc.fog)FOG0={near:sc.fog.near,far:sc.fog.far,cfar:cam.far};farTerrain(a);
    const alt=F.chute?F.chute.p.y:F.pos.y;if(sc.fog){sc.fog.near=380+alt*2;sc.fog.far=2400+alt*4}cam.far=3600;cam.updateProjectionMatrix();if(F.far)F.far.visible=true;lids(a,true)}
  else if(FOG0){if(sc.fog){sc.fog.near=FOG0.near;sc.fog.far=FOG0.far}cam.far=FOG0.cfar;cam.updateProjectionMatrix();FOG0=null;if(F.far)F.far.visible=false;lids(a,false);try{RO().setMood()}catch(_){}}}
/* the flight draw radius grows with altitude (low: less sky-line to fill, so fewer draw calls); beyond it the painted ground map
   (OW.groundMap: streets, roofs, trees, cars) lies under the streamed ground so the town still reads */
const flightR=y=>y<45?420:y<130?620:900;
function flight(on){const R=on?flightR(F.pos.y):0;if(on===F.fly&&R===F.flyR)return;F.fly=on;F.flyR=R;const O=OWm();if(O&&O.flight)O.flight(on?{R,blod:70}:null);groundMap(on)}
function groundMap(on){const a=A();if(!a||!a.L)return;if(on&&!F.gm){const O=OWm(),tx=O&&O.groundMap&&O.groundMap(),def=a.WORLD;if(!tx||!def)return;const T=T3(),w=def.W*2,h=def.H*2;
    const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshLambertMaterial({map:tx}));m.rotation.x=-Math.PI/2;m.position.set(w/2,-1.2,h/2);m.name='groundMap'/* under the river's water (-0.85) and the roads (-0.12) */;m.receiveShadow=false;F.gm=m}
  if(F.gm){if(on&&F.gm.parent!==a.L.group)a.L.group.add(F.gm);F.gm.visible=!!on}}

/* ================= far terrain: fields and low hills out to the horizon (built on the first flight) ================= */
function farTerrain(a){if(F.far)return;const T=T3(),def=a.WORLD;if(!def)return;const Wm=def.W*2,Hm=def.H*2,cx=Wm/2,cz=Hm/2;
  const N=56,R0=Math.max(Wm,Hm)/2+180,R1=5200;const P=[],C=[],I=[],UV=[],IN=[];const rings=22;
  const hgt=(x,z,d)=>{const n=Math.sin(x*.004)*Math.cos(z*.0047)+.5*Math.sin(x*.011+1.3)*Math.sin(z*.009+.7)+.25*Math.sin(x*.023+z*.017);return clamp((d-100)/160,0,1)*(9+24*clamp(n*.5+.5,0,1))+clamp((d-500)/1200,0,1)*60*Math.max(0,n+.3)-2};
  /* no seam with the backdrop (world.js backdrop(): the map plus 260 m): sample its height along its border and blend out from there */
  const bm=[];try{for(const q of OWm().units())if(q.sp&&q.sp.id==='backdrop'&&q.group){q.group.updateMatrixWorld(true);q.group.traverse(m=>{if(m.isMesh&&!m.isInstancedMesh)bm.push(m)})}}catch(_){}
  const bx0=-260,bz0=-260,bx1=Wm+260,bz1=Hm+260;/* world.js backdrop(): ext 260 */
  /* the backdrop's heights, binned once from its own vertices into an 8 m grid (raycasting it 1300 times froze the first flight for 1.6 s) */
  const CS=8,GW=Math.ceil((bx1-bx0)/CS)+1,GH=Math.ceil((bz1-bz0)/CS)+1,GS=new Float32Array(GW*GH),GN=new Uint16Array(GW*GH),_v=V(0,0,0);
  for(const m of bm){const pa=m.geometry.attributes.position;if(!pa)continue;const mw=m.matrixWorld;for(let i=0;i<pa.count;i++){_v.set(pa.getX(i),pa.getY(i),pa.getZ(i)).applyMatrix4(mw);
    const gx=Math.round((_v.x-bx0)/CS),gz=Math.round((_v.z-bz0)/CS);if(gx<0||gz<0||gx>=GW||gz>=GH||_v.y>200)continue;const k=gz*GW+gx;GS[k]+=_v.y;GN[k]++}}
  const bh=(x,z)=>{if(!bm.length)return null;const gx=Math.round((x-bx0)/CS),gz=Math.round((z-bz0)/CS);for(let r=0;r<4;r++){let s2=0,n=0;for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const xx=gx+dx,zz=gz+dz;if(xx<0||zz<0||xx>=GW||zz>=GH)continue;const k=zz*GW+xx;if(GN[k]){s2+=GS[k]/GN[k];n++}}if(n)return s2/n}return null};
  for(let j=0;j<=rings;j++){const t=j/rings,r=R0*.8+(R1-R0*.8)*t*t;for(let i=0;i<N;i++){const ang=i/N*Math.PI*2;let x=cx+Math.cos(ang)*r*1.15,z=cz+Math.sin(ang)*r*.75*(1+t*.6);
      const d=Math.max(Math.abs(x-cx)-Wm/2,Math.abs(z-cz)-Hm/2,0);let y=hgt(x,z,d);
      const out=Math.max(bx0-x,x-bx1,bz0-z,z-bz1,0);const eh=bh(clamp(x,bx0+4,bx1-4),clamp(z,bz0+4,bz1-4));
      IN.push(out<=0?1:0);if(eh!=null){if(out<=0)y=eh-4;else{const k=clamp(out/350,0,1),sk=k*k*(3-2*k);y=eh-.6+(y-eh+.6)*sk}}P.push(x,y,z);
      const fld=(Math.floor(x/140)+Math.floor(z/110))%4,tint=[[.96,1,1.04],[1.04,1.02,.94],[1.1,1,.86],[.9,.96,1]][(fld+4)%4],out2=Math.max(bx0-x,x-bx1,bz0-z,z-bz1,0),v=.74*(1-.25*clamp(out2/600,0,1))*(1-t*.15),ft=clamp((out2-150)/500,0,1)/* fields fade in away from the backdrop */;
      C.push(v*(.96+(tint[0]-.96)*ft),v*(1+(tint[1]-1)*ft),v*(1.04+(tint[2]-1.04)*ft));UV.push(x/9,z/9)}}
  for(let j=0;j<rings;j++)for(let i=0;i<N;i++){const a0=j*N+i,a1=j*N+(i+1)%N,b0=(j+1)*N+i,b1=(j+1)*N+(i+1)%N;if(IN[a0]&&IN[a1]&&IN[b0]&&IN[b1])continue;/* under the backdrop: not drawn (no overdraw) */I.push(a0,a1,b0,a1,b1,b0)}/* wound to face up (the backdrop's material is single-sided) */
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('color',new T.Float32BufferAttribute(C,3));g.setAttribute('uv',new T.Float32BufferAttribute(UV,2));g.setIndex(I);g.computeVertexNormals();
  /* the backdrop's own grass material (same texture, same 9 m tiling, vertex colours like its own): no colour seam at its edge */
  let bmat=null;for(const q of bm)if(q.material&&q.material.map&&q.material.vertexColors&&(!bmat||q.geometry.attributes.position.count>bmat.n))bmat={m:q.material,n:q.geometry.attributes.position.count};
  const m=new T.Mesh(g,bmat?bmat.m:new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));m.receiveShadow=false;m.renderOrder=-2;m.frustumCulled=false;m.name='farTerrain';a.scene.add(m);F.far=m}
/* lids: flat roofs over interiors drawn without one (mission sites' '.' floors), shown only while you fly so ground play and the planning views never see them */
function lids(a,on){if(on&&!F.lid){const T=T3(),def=a.WORLD,g=new T.Group();g.name='airLids';const m=new T.MeshStandardMaterial({color:new T.Color('#6d6f70').convertSRGBToLinear(),roughness:.95});
    const boxes=[],seen=new Uint8Array(def.W*def.H),W=def.W,H=def.H,mp=def.map,inside=c=>c==='.'||c==='I'||c==='T'||c==='i'||c==='a'||c==='E'||c==='B'||c==='S'||c==='k'||c==='Q';const geo=new T.BoxGeometry(1,1,1);
    for(let z=0;z<H;z++)for(let x=0;x<W;x++){if(seen[z*W+x]||!inside(mp[z][x])||def.ground[z][x]!=='.')continue;let x1=x;while(x1<W&&inside(mp[z][x1])&&def.ground[z][x1]==='.'&&!seen[z*W+x1])x1++;let z1=z+1;
      while(z1<H){let all=true;for(let xx=x;xx<x1;xx++)if(!(inside(mp[z1][xx])&&def.ground[z1][xx]==='.')||seen[z1*W+xx]){all=false;break}if(!all)break;z1++}
      for(let zz=z;zz<z1;zz++)for(let xx=x;xx<x1;xx++)seen[zz*W+xx]=1;boxes.push([(x1-x)*2+1.2,(z1-z)*2+1.2,x+x1,z+z1])}
    {const gb=new (HT.World.GB)();for(const[w,d,cx,cz]of boxes)gb.box(cx-w/2,3.32,cz-d/2,cx+w/2,3.58,cz+d/2,4,[.5,.52,.53],{});const mm=new T.Mesh(gb.geo(),new T.MeshStandardMaterial({vertexColors:true,roughness:.95}));mm.name='airLids';g.add(mm)}/* one draw call for every lid */
    a.L.group.add(g);F.lid=g}
  if(F.lid){F.lid.visible=!!on;if(on&&F.lid.parent!==a.L.group)a.L.group.add(F.lid)}}

/* ================= the High Bridge set piece (north of the map, across the river valley) ================= */
function bridgePiece(){const O=OWm();if(!O||!O.addSetpiece){setTimeout(bridgePiece,0);return}
  O.addSetpiece({id:'highbridge',r:90,/* on the ground it shows within 90 m (flying: everything to the flight radius) */box:()=>({x0:HB.x0-10,z0:HB.z-12,x1:HB.x1+10,z1:HB.z+12,y1:HB.deck+6}),build(ws,u){const K2=B()&&B().kit;if(!K2)return;const T=T3(),P=K2.painter();
    /* the ground under each pier: ask the backdrop terrain (always built) */
    const meshes=[];for(const q of ws.units)if(q.sp&&q.sp.id==='backdrop'&&q.group)q.group.traverse(m=>{if(m.isMesh&&!m.isInstancedMesh)meshes.push(m)});
    const rc=new T.Raycaster();const gy=x=>{rc.set(V(x,120,HB.z),V(0,-1,0));rc.far=200;const h=rc.intersectObjects(meshes,false)[0];return h?h.point.y:-1};
    const z=HB.z,D=HB.deck;P.box('concrete',HB.x0,D-.9,z-2.4,HB.x1,D,z+2.4,'#9a958b');
    /* steel truss along both sides */
    for(const s of[-1,1]){const zz=z+s*2.3;P.box('metal',HB.x0,D,zz-.15,HB.x1,D+.35,zz+.15,'#5d4a3a');P.box('metal',HB.x0,D+3.6,zz-.15,HB.x1,D+3.9,zz+.15,'#5d4a3a');
      for(let x=HB.x0;x<HB.x1;x+=6){P.box('metal',x-.12,D,zz-.12,x+.12,D+3.9,zz+.12,'#5d4a3a');const L=Math.hypot(6,3.6);P.obox('metal',x+3,D+1.95,zz,L,.18,.16,0,'#5d4a3a',0,Math.atan2(3.6,6)*((x/6|0)%2?1:-1))}}
    for(let x=HB.x0;x<HB.x1;x+=12)P.box('metal',x-.1,D+3.6,z-2.3,x+.1,D+3.9,z+2.3,'#5d4a3a');
    /* rails and ties */
    for(let x=HB.x0;x<HB.x1;x+=.9)P.box('paint',x,D,z-1.2,x+.35,D+.12,z+1.2,'#4a3a2a');for(const s of[-.72,.72])P.box('metal',HB.x0,D+.12,z+s-.05,HB.x1,D+.25,z+s+.05,'#8a8f94');
    /* piers down to the ground (none in the river channel) */
    for(let x=HB.x0+12;x<HB.x1;x+=22){if(x>HB.river[0]-2&&x<HB.river[1]+2)continue;const g=gy(x);if(g>D-1)continue;P.box('concrete',x-1.6,g-2,z-2.6,x+1.6,D-.9,z+2.6,'#b3ab9c');P.box('concrete',x-2,g-2,z-3,x+2,g+1.2,z+3,'#a39b8c')}
    /* a sign on the deck for the brave */
    P.sign((HB.river[0]+HB.river[1])/2,D-1.6,z+2.45,9,1.1,Math.PI,K2.board('hb',['THE HIGH BRIDGE','CLEARANCE: PLENTY · DO NOT FLY UNDER (PLEASE DO)'],3,1,'white'));
    P.sign((HB.river[0]+HB.river[1])/2,D-1.6,z-2.45,9,1.1,0,K2.board('hb2',['THE HIGH BRIDGE','RIVERSIDE · MAPLE HEIGHTS RAIL · EST. 1911'],3,1,'white'));
    P.flush(u.group)}})}
bridgePiece();

/* ================= trails, sound, HUD ================= */
function trails(a,e,dt){const on=F.air&&F.spd>50&&(Math.abs(F.inp.p)>.5||Math.abs(F.inp.r)>.7||F.ab>.5);/* wingtip vapour when you pull, roll hard or light the burner (not all the time: it streaks across the chase view) */const root=F.trailRoot||(F.trailRoot=(()=>{const T=T3(),g=new T.Group();g.name='contrails';
    for(let i=0;i<2;i++){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(64*2*3),3));const idx=[];for(let k=0;k<63;k++){const a2=k*2;idx.push(a2,a2+1,a2+2,a2+1,a2+3,a2+2)}geo.setIndex(idx);
      const m=new T.Mesh(geo,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.45,depthWrite:false,side:T.DoubleSide}));m.frustumCulled=false;g.add(m)}return g})());
  if(root.parent!==a.L.group)a.L.group.add(root);
  _r.set(0,0,1).applyQuaternion(F.q);_u.set(0,1,0).applyQuaternion(F.q);_f.set(1,0,0).applyQuaternion(F.q);
  for(let i=0;i<2;i++){const s=i?1:-1,tip=F.pos.clone().addScaledVector(_r,s*4.3).addScaledVector(_f,-2.2).addScaledVector(_u,1.6),L=F.trails[i];
    {const last=L[L.length-1];if(last&&last.p.distanceTo(tip)>60)L.length=0}/* a jump (reset, tow home): start over */
    if(on){const last=L[L.length-1];if(!last||last.p.distanceTo(tip)>3)L.push({p:tip,u:_u.clone(),t:0})}for(const q of L)q.t+=dt;while(L.length&&(L[0].t>2.4||L.length>64))L.shift();
    const geo=root.children[i].geometry,pa=geo.attributes.position;for(let k=0;k<64;k++){const q=L[Math.min(k,L.length-1)];if(!q){pa.setXYZ(k*2,0,-999,0);pa.setXYZ(k*2+1,0,-999,0);continue}const w=.12+q.t*.35;
      pa.setXYZ(k*2,q.p.x+q.u.x*w,q.p.y+q.u.y*w,q.p.z+q.u.z*w);pa.setXYZ(k*2+1,q.p.x-q.u.x*w,q.p.y-q.u.y*w,q.p.z-q.u.z*w)}pa.needsUpdate=true;root.children[i].visible=L.length>1}}
/* the jet's own engine voice on the sfx bus: a turbine whine and a roar that follow the throttle */
const SN={};
function jetSound(k,spd){const Au=HT.Audio;if(!Au||!Au.ctx||!Au.bus)return;const ctx=Au.ctx;try{
  if(!SN.on&&k>0&&F.on){const out=Au.bus('sfx');const len=2,buf=ctx.createBuffer(1,ctx.sampleRate*len,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    SN.n=ctx.createBufferSource();SN.n.buffer=buf;SN.n.loop=true;SN.bp=ctx.createBiquadFilter();SN.bp.type='bandpass';SN.bp.Q.value=.7;SN.g=ctx.createGain();SN.g.gain.value=0;SN.n.connect(SN.bp);SN.bp.connect(SN.g);SN.g.connect(out);
    SN.o=ctx.createOscillator();SN.o.type='sawtooth';SN.og=ctx.createGain();SN.og.gain.value=0;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2400;SN.o.connect(lp);lp.connect(SN.og);SN.og.connect(out);SN.n.start();SN.o.start();SN.on=true}
  if(!SN.on)return;const t=ctx.currentTime;SN.bp.frequency.setTargetAtTime(300+k*1700+spd*6,t,.2);SN.g.gain.setTargetAtTime(F.on?.05+k*.16:0,t,.25);SN.o.frequency.setTargetAtTime(420+k*900,t,.4);SN.og.gain.setTargetAtTime(F.on?.012+k*.02:0,t,.3);
  if(!F.on&&SN.on){setTimeout(()=>{if(F.on)return;try{SN.n.stop();SN.o.stop()}catch(_){}SN.on=false},900)}}catch(_){}}
function boom(){const Au=HT.Audio;if(!Au||!Au.ctx)return;try{const ctx=Au.ctx,out=Au.bus('sfx'),t=ctx.currentTime;for(const[dl,v]of[[0,1],[.12,.8]]){const len=1.6,buf=ctx.createBuffer(1,ctx.sampleRate*len,ctx.sampleRate),d=buf.getChannelData(0);let b=0;
    for(let i=0;i<d.length;i++){b=b*.97+(Math.random()*2-1)*.1;d[i]=b*Math.exp(-i/ctx.sampleRate*3)*4}const n=ctx.createBufferSource();n.buffer=buf;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=500;const g=ctx.createGain();g.gain.value=v;n.connect(lp);lp.connect(g);g.connect(out);n.start(t+dl)}}catch(_){}}
function alarm(at){const Au=HT.Audio;if(!Au||!Au.tone)return;for(let i=0;i<6;i++){Au.tone({f:650,to:1250,type:'square',d:.28,gain:.014,at:at+i*.6});Au.tone({f:1250,to:650,type:'square',d:.28,gain:.014,at:at+i*.6+.3})}}
function tone(f,to,d,g,at){try{HT.Audio.tone({f,to,type:'triangle',d,gain:g,at:at||0})}catch(_){}}
function beep(f){try{HT.Audio.tone({f,type:'square',d:.15,gain:.06,bus:'ui'})}catch(_){}}
function teach(a,id,t){const s=sv();const m=s?(s.taught||(s.taught={})):S.taught;if(m[id])return;m[id]=1;try{a.feed(t,'info')}catch(_){}}
/* the flight HUD: an SVG layer (green, like a real one), updated in place */
let HUDEL=null;const HE={};
function hudShow(on){if(!HUDEL&&on){HUDEL=document.createElement('div');HUDEL.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:19;font-family:"Barlow","Arial Narrow",Arial,sans-serif';
    HUDEL.innerHTML=`<svg viewBox="-500 -300 1000 600" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" style="position:absolute;inset:0"><g fill="none" stroke="#7dff9a" stroke-width="2" style="filter:drop-shadow(0 0 2px rgba(0,0,0,.6))">
      <g id="jhl"><line x1="-260" y1="0" x2="-60" y2="0"/><line x1="60" y1="0" x2="260" y2="0"/>${[-30,-20,-10,10,20,30].map(p=>`<g transform="translate(0,${-p*6})"><line x1="-90" y1="0" x2="-40" y2="0" stroke-dasharray="${p<0?'6 4':''}"/><line x1="40" y1="0" x2="90" y2="0" stroke-dasharray="${p<0?'6 4':''}"/><text x="98" y="5" fill="#7dff9a" stroke="none" font-size="14">${p}</text></g>`).join('')}</g>
      <circle cx="0" cy="0" r="7"/><line x1="-20" y1="0" x2="-7" y2="0"/><line x1="7" y1="0" x2="20" y2="0"/><line x1="0" y1="-7" x2="0" y2="-16"/>
      <rect x="-330" y="-18" width="92" height="36" rx="3"/><rect x="238" y="-18" width="92" height="36" rx="3"/></g>
      <g fill="#7dff9a" font-size="22" text-anchor="middle" style="filter:drop-shadow(0 0 2px rgba(0,0,0,.7))"><text id="jspd" x="-284" y="8"></text><text id="jalt" x="284" y="8"></text><text x="-284" y="-26" font-size="13">MPH</text><text x="284" y="-26" font-size="13">FT</text>
      <text id="jhdg" x="0" y="-200"></text><text x="0" y="-182" font-size="12">HDG</text><text id="jcall" x="0" y="-164" font-size="13">${CALL}</text>
      <text id="jthr" x="-284" y="44" font-size="14"></text><text id="jgear" x="-284" y="64" font-size="14"></text><text id="jwarn" x="0" y="80" font-size="30" fill="#ff6a4a"></text><text id="jvs" x="284" y="40" font-size="14"></text></g></svg>`;
    document.body.appendChild(HUDEL);for(const id of['jhl','jspd','jalt','jhdg','jthr','jgear','jwarn','jvs'])HE[id]=HUDEL.querySelector('#'+id)}
  if(HUDEL)HUDEL.style.display=on?'block':'none';
  /* the car dial and its keys (Horn · Brake · Hood) don't apply in the air: the flight HUD has speed, throttle and gear */
  const dv=document.querySelector('.ht-drv');if(dv&&!!on!==!!S.drvHid){S.drvHid=!!on;dv.style.visibility=on?'hidden':''}}
/* the game's mood and night code set the fog every frame after the camera hook: put the flight fog back late in the frame */
function fogLate(a){if(!FOG0)return;const sc=a.scene,alt=F.chute?F.chute.p.y:F.pos.y;if(sc.fog){sc.fog.near=380+alt*2;sc.fog.far=2400+alt*4}if(a.camera.far<3600){a.camera.far=3600;a.camera.updateProjectionMatrix()}}
Jet.fogLate=()=>fogLate(A());
function hud(st){const a=A();if(!a)return;fogLate(a);const on=F.on&&a.CV&&a.CV.type==='jet';hudShow(!!on);if(!on)return;
  _f.set(1,0,0).applyQuaternion(F.q);_u.set(0,1,0).applyQuaternion(F.q);_r.set(0,0,1).applyQuaternion(F.q);
  const bank=Math.atan2(-_r.y,_u.y),pitch=Math.asin(clamp(_f.y,-1,1))*180/Math.PI;let hdg=(Math.atan2(_f.x,-_f.z)*180/Math.PI+360)%360;
  HE.jhl.style.display=a.P.fp?'':'none';/* the pitch ladder only in the cockpit; the chase view keeps the readouts */
  HE.jhl.setAttribute('transform',`rotate(${(-bank*180/Math.PI).toFixed(1)}) translate(0,${(pitch*6).toFixed(1)})`);
  HE.jspd.textContent=Math.round(F.spd*2.237);HE.jalt.textContent=Math.round(Math.max(0,F.lastAlt||F.pos.y)*3.281);HE.jhdg.textContent=String(Math.round(hdg)).padStart(3,'0');
  HE.jthr.textContent='THR '+Math.round(F.thr*100)+'%'+(F.ab>.5?' · AFTERBURNER':'');HE.jgear.textContent=F.gear?'GEAR DOWN':'GEAR UP';HE.jvs.textContent=(F.vs>=0?'↑':'↓')+Math.abs(Math.round(F.vs*196.85))+' fpm';
  HE.jwarn.textContent=F.air&&F.stall?'STALL':F.air&&F.lastAlt<30&&F.vs<-12?'PULL UP':!F.gear&&F.air&&F.lastAlt<25&&F.vs<-1?'GEAR':'';
  st.vehicleName=CALL+' · Fort Sensible Air Wing';if(st.speedMph!=null)st.speedMph=Math.round(F.spd*2.237)}

/* ================= every frame (pose hook): ensure the jet, the parachute, the family, the bridge check, gear key ================= */
function tick(){const a=A();if(!a||!a.L||!a.L.ow||!B()||!B().def())return;const dt=Math.min(.1,Math.max(0,a.simT-(S.simT||a.simT)));S.simT=a.simT;
  if(a.mode==='hub')ensure(a);
  const e=S.e;if(F.on&&(!e||a.CV!==e)){stop(a,e)}
  /* a rental: left away from the apron and out of sight for 20 s, the Air Wing tows it home */
  if(e&&a.CV!==e&&!F.on){const d=B().def(),far=Math.hypot(e.pos.x-d.jet.x,e.pos.z-d.jet.z)>30,away=a.camera.position.distanceTo(e.obj.position)>120;S.parkT=far&&away?(S.parkT||0)+(Math.min(.1,Math.max(0,a.simT-(S.homeT||a.simT)))):0;S.homeT=a.simT;
    if(S.parkT>20){S.parkT=0;home(a,e);a.feed('The Air Wing towed the jet back to Hangar 2. It was a rental.','info')}}
  if(e&&e.obj&&a.CV!==e)e.obj.visible=Math.hypot(a.camera.position.x-e.pos.x,a.camera.position.z-e.pos.z)<140||a.camera.position.y>40;
  if(F.on&&e&&a.CV===e){if(e.obj){pose(e.obj)}/* the dad in the seat (the game seats him at ground level): hide him, the canopy shows a helmet */
    if(a.P.dude)a.P.dude.root.visible=false;if(F.prev)bridgeCheck(a,F.prev);F.prev=F.pos.clone()}
  fogLate(a);if(!dt)return;chuteTick(a,dt);familyTick(a,dt);if(!F.on&&!F.chute)farFog(a,false)}
/* keys the game doesn't own while flying (all taps or toggles): G gear, C look back, Shift afterburner, W / S throttle steps; E twice in the air ejects (index.html: e.noExit) */
addEventListener('keydown',ev=>{const a=A();if(!a||!F.on||!a.CV||a.CV.type!=='jet')return;const k=ev.key.toLowerCase();
  if(k==='g'&&F.air&&!ev.repeat){F.gear=F.gear?0:1;tone(F.gear?300:420,F.gear?220:520,.3,.08);a.feed(F.gear?'Gear down':'Gear up','info')}
  if(ev.repeat)return;
  if(k==='c'){F.look=!F.look}
  if(k==='shift'){F.abOn=!F.abOn&&F.thr>.9;if(!F.abOn&&F.thr<=.9&&!F.said.ab){F.said.ab=1;a.feed('Afterburner: throttle to 100% first (W), then Shift','info')}}
  if(k==='w')F.thr=Math.min(1,Math.round(F.thr*10+1)/10);if(k==='s')F.thr=Math.max(0,Math.round(F.thr*10-1)/10)});
function interact(prompt){const a=A();if(!a||a.mode!=='hub')return null;const e=a.CV;if(!e||e.type!=='jet'||!F.on)return null;
  /* eject: two taps of E (no held keys): the first arms it for 3 s */
  if(F.air){const armed=F.ejArm!=null&&a.simT-F.ejArm<3;return armed?{txt:'Press E again to eject',fn:()=>{F.ejArm=null;eject(a,e,false)}}:{txt:'Eject (press twice)',fn:()=>{F.ejArm=a.simT;beep(700)}}}if(F.spd>4)return null;return null}
function hook(){const Jb=J(),Bs=B();if(!Jb||!Jb.on||!Bs||!Bs.on){setTimeout(hook,50);return}
  Jb.on('vehicle',(e,dt)=>{try{vehicle(e,dt)}catch(err){if(!S.err){S.err=1;console.warn('[jet]',err)}}});
  Jb.on('camera',dt=>{try{return camera(dt)}catch(err){if(!S.err3){S.err3=1;console.warn('[jet] camera',err)}}});
  Jb.on('pose',()=>{try{tick()}catch(err){if(!S.err2){S.err2=1;console.warn('[jet] tick',err)}}});
  Jb.on('hud',st=>{try{hud(st)}catch(err){if(!S.err4){S.err4=1;console.warn('[jet] hud',err)}}});Bs.on('interact',p=>interact(p));
  /* the car voice stays quiet in the jet: our own turbine plays (same trick as the mower) */
  (function wrapVoice(){const Au=HT.Audio;if(!Au||!Au.vehicle){setTimeout(wrapVoice,300);return}if(Au.vehicle._jet)return;const orig=Au.vehicle;
    Au.vehicle=function(){const v=orig.apply(this,arguments);let cv=null;try{cv=A()&&A().CV}catch(_){}if(!v||!cv||cv.type!=='jet')return v;try{v.stall(true)}catch(_){}const s0=v.set;v.set=p=>s0.call(v,Object.assign({},p,{rpm:0,throttle:0,speed:0,skid:0}));v.stall=()=>{};return v};Au.vehicle._jet=true})()}
hook();
/* test hooks (dev/base-check.js) */
Jet.state=()=>({e:!!S.e,on:F.on,abOn:!!F.abOn,look:!!F.look,air:F.air,x:F.pos.x,y:F.pos.y,z:F.pos.z,spd:F.spd,thr:F.thr,gear:F.gear,stall:F.stall,alt:F.lastAlt,chute:F.chute?{y:F.chute.p.y,open:F.chute.open}:null,fam:S.fam.length,fly:F.fly,
  hdg:(()=>{_f.set(1,0,0).applyQuaternion(F.q);return Math.atan2(-_f.x,-_f.z)})(),pitch:(()=>{_f.set(1,0,0).applyQuaternion(F.q);return Math.asin(clamp(_f.y,-1,1))})(),bank:(()=>{_u.set(0,1,0).applyQuaternion(F.q);_r.set(0,0,1).applyQuaternion(F.q);return Math.atan2(-_r.y,_u.y)})()});
function home(a,e){const d=B().def();e.pos.set(d.jet.x,0,d.jet.z);e.yaw=d.jet.yaw;try{a.owStopCar(e);a.syncCar(e)}catch(_){}e.obj.quaternion.setFromEuler(_e.set(0,d.jet.yaw+Math.PI/2,0,'YZX'));e.obj.position.y=0}
Jet.home=()=>{const a=A();if(S.e&&a.CV!==S.e)home(a,S.e)};
Jet.HB=HB;Jet.camera=dt=>camera(dt);Jet.family=()=>family(A());/* test hook: the family comes out as if you buzzed the house */
/* dev/base-air.js: the flying view (far fog, far terrain, lids) without flying; keep=true just re-applies it */
Jet.air=(a,on,keep)=>{if(!keep){F.chute=null}const was=F.on;if(on){farFog(a,true)}else{farFog(a,true);lids(a,false)}};
})();
