/* =====================================================================
   BRAKE CHECK (SPEC3 2.5): pursuit, reversed. Coach Rick's strand 1/2.
   A smash-and-grab crew hits Fill-Er-Up's ATM once a week. Rick doesn't want a chase, he wants a PLAY: three dad cars, one
   hatchback, a box. You pick the play in the huddle (1 Sandwich / 2 Fence). Each play gives the three cars different slots around
   the target: his TWELVE (in front), his NINE (alongside, his left) and his SIX (behind). You drive your slot by hand; Rick and Big
   Dave drive the other two and call it like a Friday-night sideline. The hatchback reacts to the box forming: it brake-checks
   whoever sits on its six, fakes turns into side streets, leans on whoever is at its nine, swings out to pass the front car and
   hides behind slow traffic. When all three slots hold, the box is up: the front car squeezes, he slows under 8 m/s, the box holds
   three seconds, Rick blows the whistle and everybody brakes as one. Hands up, a short and sad foot chase (he does cardio. Badly),
   zip-ties, the ATM cash box goes back, and Rick's post-game talk.
   No guns (a driving play). No ramming civilians: oncoming traffic, a Sunday driver and the neighbours' parked cars. A real hit on
   a civilian is a yellow card and the play is dead (retry from the snap, with the whistle). Bumping the hatchback is a flag on the
   play: -1 trust and van health each; five flags and Coach benches you. He escapes if he gets 220 m clear for 15 s.

   Stages ([CP]): huddle (pick the play) -> chase (the snap) -> collar (stopped: hands up, zip-ties, the cash box, hands in).
   Files: js/jobs/brake.js (this), js/tail.js (HT.Tail.slot / boxed, the shared formation helpers; Rail and poly for the cars).
   Tests: node dev/jobs-check.js brake --retry --replay --shots; node dev/jobs/brake.js [--play=fence] [--shots] (human-paced play,
   route-clear check, transcript); node dev/jobs/brake-keys.js (the core loop with real Playwright keyboard events); node dev/brake.test.js.
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api,H=()=>window.__ht||{};
/* HT.Tail rides along (Following Distance loads it too; whichever job file comes first adds the script) */
(function(){const d=typeof document!=='undefined'?document:null;if(!d||!d.head||!d.createElement)return;
  if(!(window.HT.Tail&&HT.Tail.create)&&!(d.getElementById&&d.getElementById('ht-tail-js'))){const s=d.createElement('script');s.id='ht-tail-js';s.src='js/tail.js';if(d.head.appendChild)d.head.appendChild(s)}})();
const TL=()=>window.HT&&HT.Tail&&HT.Tail.poly?HT.Tail:null;

/* ---------------- tuning ---------------- */
const K={pay:800,par:120,clean:250,noCiv:100,quick:100,quickT:120,goldT:90,ranDown:50,
  r9:15.2,town:12.4,corner:6.4,surge:3.2,          /* the hatchback's cruise (m/s): Route 9, Riverside, corners; +surge when spooked */
  slotD:7.6,nineLat:-3.05,                          /* slot geometry: centre to centre along the lane; his nine is the next lane over */
  tol12:[-2.2,4.6],tol6:[-4.6,2.2],tol9:2.7,tolLat:1.3,tolYaw:.5,  /* in-slot windows (m along, m across, rad) */
  formT:1.2,boxT:3,vmax:8,squeezeDec:1.5,squeezeV:5.2,stopDec:2.3,breakT:1.6,
  escD:220,escT:15,flagMax:5,hitV:3,kissV:.9,bumpV:1.6,
  crewMax:21,crewAcc:6.2,crewDec:9,laneV:2.1,
  checkCd:24,feintCd:17,leanCd:14,passCd:15,surgeCd:11,oncCd:14,sundayMax:1};
const D=Math.PI/180,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const fwd=y=>[-Math.sin(y),-Math.cos(y)],rgt=y=>[Math.cos(y),-Math.sin(y)],clamp=(v,a,b)=>v<a?a:v>b?b:v;
const pick=a=>a[Math.floor(Math.random()*a.length)];

/* ---------------- the plays and the slots ---------------- */
const SLOT={twelve:{ds:K.slotD,lat:0,side:0,back:-K.slotD,clock:'12',name:'his TWELVE',where:'in front of him'},
  nine:{ds:.4,lat:K.nineLat,side:-1,back:-.4,clock:'9',name:'his NINE',where:'alongside, on his left'},
  six:{ds:-K.slotD,lat:0,side:0,back:K.slotD,clock:'6',name:'his SIX',where:'right behind him'}};
const PLAYS={
  sandwich:{id:'sandwich',name:'Sandwich',you:'twelve',rick:'nine',dave:'six',
    text:"SANDWICH · you're the front bread: pass him and sit in FRONT of him. Rick rides his left, Dave his bumper.",
    call:[["rick","Sandwich play. I'm bread. Dave's bread. You're the meat. No. Wait. They're the meat."],["dave","I'm always bread."]]},
  fence:{id:'fence',name:'Fence',you:'nine',rick:'twelve',dave:'six',
    text:"FENCE · you're the fence: ride ALONGSIDE on his left so he can't swerve out. Rick gets in front, Dave on his bumper.",
    call:[["rick","Fence. You're the fence. You ride his left side like a picket fence with a mortgage. I take the front. Dave takes his six."],["dave","I'm always the back."],["rick","Because you're reliable, Dave."],["dave","...I'll take it."]]}};
const WHO={you:'You',rick:'Rick',dave:'Dave'};

/* ---------------- places (metres) ---------------- */
const ATM={x:233.6,z:24.35};                               /* Fill-Er-Up's ATM, on the shop front */
const HATCH0={x:236.6,z:27.6,yaw:-Math.PI/2};             /* the getaway hatchback, nose east, engine running */
const STAGE={you:{x:212,z:35.6},dave:{x:220.6,z:35.6},rick:{x:229.2,z:35.6},yaw:-Math.PI/2};/* the three dad cars on the lot's south edge, noses east */
const LOT=[[236.6,27.6],[240.6,28.3],[242.6,31.4],[243.4,35.6],[244.4,40.2],[247.4,43.6],[254,44.5]];
/* Route 9 east over the bridge, then laps of Riverside: 5th St south, Dock west, River Rd north, Main east (all checked clear) */
const R9=[[203,43],[315,43],[347,43],[379,43],[411,43]],LAP=[[443,43],[443,71],[443,99],[443,127],[411,127],[379,127],[347,127],[315,127],[315,99],[315,71],[315,43],[347,43],[379,43],[411,43]],LAPS=6;
const CREW_IN=pt=>[[pt.x,pt.z],[pt.x+6,pt.z],[238,35.7],[241.2,36.4],[243.4,38.2]];/* along the lot edge to where the hatchback's exit runs */

/* ---------------- lines ---------------- */
const L_={
  huddle:[["rick","Okay. Huddle up. Fill-Er-Up's ATM, same crew, same day, every week. Teal hatchback, two guys, one crowbar."],
    ["rick","We don't chase. Chasing is for dogs and cardio people. We run a PLAY. Three cars, one box, nobody gets hurt."],
    ["rick","Pick the play. One or two. Choose with your heart. Your heart should choose with the playbook."]],
  hut:["Ready... BREAK!","On two. Ready... BREAK!","Clap on three. One, two... BREAK!"],
  makeWay:["Go round him! I'm hanging back till you're in front. Go go go! Watch for oncoming!","I'll sit back here with Dave. You pass him on the left. Like a soccer mom at a four-way stop: decisively."],
  giveLane:["Give me the left lane! Tuck in behind him a sec, I need to get back in front!"],
  snap:[["rick","There's the snap. They're rolling. Dave, you're with me. Go go go! Gently! Go gently!"]],
  slotYou:(s)=>"Your slot is "+s.name+": "+s.where+". Find the green outline and sit in it.",
  inSlot:["THAT'S your slot. Hold it. Don't fall in love with it, just hold it.","There it is. Like a tight end on a seam route. I don't know what that means either. Hold it!","Good! Hold that! Hold it like a casserole dish on your lap!"],
  lostSlot:["You drifted! Back in your slot!","Where are you going? Your SLOT. The green one!","Slot, slot, slot! The box needs all three of us!"],
  rickIn:{nine:["I'm on his nine!","Nine o'clock, locked. I can see his air freshener. It's pine."],twelve:["I've got the front. I'm the bread. Front bread.","I'm in front of him! Look at me go! I'm a wall!"]},
  daveIn:["I'm on his six!","Dave's on the bumper. Bumper Dave. Don't call me that.","Six o'clock. I've got him. I've got such a good view of his bumper sticker."],
  daveWrong:["Doug, that's his NINE. Oh wait, you're not Doug. Still. That's his nine.","Rick, which one's six again? ...Behind. It's behind. I knew that."],
  boxUp:[["rick","THE BOX IS UP! All three slots! Squeeze it! Squeeeeeze!"]],
  squeezeYou12:"You're the front: EASE OFF the gas. Bring him down slow. He can't go round you, Rick's on his left.",
  squeezeYou9:"Hold his left side. I'm squeezing from the front. Match him. Match him like a sock.",
  holding:["They're slowing. Hold the box. Hold it. Hold...","Steady. Steady. Like a nervous waiter.","He's thinking about it. Let him think. Thinking is slow."],
  whistle:[["rick","That's a W! Everybody brake on my whistle! Three, two..."]],
  brake:"Brake together! Gently! Like you're bringing a full pot of coffee to a stop!",
  stopped:[["rick","...and that's a stop. Nobody move. Nobody's even scratched."],["dave","Nobody's even scratched. My insurance guy is going to send me a fruit basket."]],
  broken:["He's out! Reset the box! Reset!","He slipped it! Back to your slots! We go again!","Box is broken. Re-form! Like a fire drill, but with cars!"],
  thiefA:["Why are there three minivans?","Why are they all so CALM?","Is that guy wearing a whistle? Who brings a whistle?"],
  thiefB:["It's a coordinated minivan attack, Dante!","They've got a PLAY, Dante. They've got a PLAY.","They're doing a formation! Dads don't do formations! ...Do they?"],
  check:{dave:["WHOA! Brake check! He brake-checked me! I spilled my coffee! It was decaf, but still!","He brake-checked me! Who does that! Teenagers and him!"],you:["He brake-checked you! Leave a gap behind him, a gap!"],rick:["Brake check! I saw it! Classic."]},
  checkTell:["His brake lights. Watch his brake lights!","Brake lights flickering. He's thinking about something dumb."],
  feint:["He's turning! He's turning! ...He's not turning. He's faking it! Stay on him!","Indicator! He's going right! ...Nope. Pump fake. Stay on him!","Side street! Side str... no. He's just driving weird. Hold your slots!"],
  lean:{rick:["He's leaning on me! I've got nowhere to go but the curb!","He's in my lane! Rude! Rude AND illegal!"],you:["He's leaning on you! Give him an inch, not a mile!","He's squeezing you! Hold your line, don't trade paint!"]},
  pass:["He's swinging out! He's going round the front car! Close the left!","Left side! He's trying to go round! Somebody close his nine!"],
  passed:["He got round! Front car, get back in front of him!","He's past the front! Reset the front!"],
  sunday:["He's stuck behind a Sunday driver! Bless that sedan!","He's using the traffic! He's hiding behind that car!"],
  onc:{you:["Car! Oncoming! Tuck in behind him! Tuck in!","Oncoming traffic in your lane! Drop back! DROP BACK!"],rick:["Oncoming! I'm tucking in! Sorry, ma'am!","Car coming! I'm out, I'm out, I'll be right back!"]},
  far:["We're losing him! Close it up!","He's pulling away! The box can't form if you're in a different zip code!"],
  flag:["Flag on the play! No contact! We're not animals. We're a zone defence.","That's a flag! Hands off the hatchback! We want him stopped, not smooshed.","Contact! Flag! That's coming out of your snack privileges."],
  fouled:["That was HIS fault. That one's on him. I saw it. The ref saw it. I'm the ref.","He hit YOU. Foul on the hatchback. Fifteen yards. I don't know what that means here."],
  kiss:["You kissed a civilian car. That's a warning. Next one's a card.","Easy! That's somebody's car! That's somebody's MOM's car, probably!"],
  card:"That's a civilian, that's a yellow card, eyes up! Play's dead!",
  cardParked:"That's somebody's parked car! Yellow card! Play's dead! Reset!",
  crewBump:["Hey! That's my door! We're on the same team!","Friendly fire! Friendly bumper! Same thing!"],
  hop:["Get out! Hands where we can see them! Not you, Dave. Them.","Out of the car! Slowly! Like you're getting out of a hot tub!"],
  run:[["dante","You can't catch me, I do cardio!"]],
  runYou:"He's running! Get out and catch him! He's already slowing down. That's not cardio, that's hope.",
  puff:["Okay... okay... I don't... do... cardio...","My... legs... are... lying to me...","I'm gonna... sit down... on purpose..."],
  caught:[["you","So do I. Badly. But a lot."]],
  cuffAll:"Zip-ties on both of them. Gently. They're somebody's kid. Somebody's very disappointing kid.",
  cash:[["rick","Cash box is in the trunk. Bring it here, I'll walk it back to Fill-Er-Up myself."]],
  given:[["rick","Every bill, every coin. Even the Canadian quarter somebody slipped in there."]],
  talk:[["rick","Bring it in. Bring it in. Hands in."],["rick","Nobody chased. Nobody shot. Nobody even scratched a mailbox. That's not luck. That's a playbook."],["rick","'Box' on three. One, two..."]],
  talkRough:[["rick","Bring it in. Hands in. That was messy. Messy is still a W. A muddy W."],["rick","'Box' on three. One, two..."]],
  box:[["dave","BOX!"],["rick","BOX! ...Okay. Now let's go get those two some juice boxes. And a lawyer."]],
  fail:{escaped:"He got away clean. Rick is drawing the play on a napkin. The napkin is crying.",card:"A civilian car. Yellow card. Rick blew the whistle so hard Dave dropped his sunglasses.",
    flags:"Five flags. That's not a box, that's a demolition derby. Coach is benching you.",broke:"The van's done. Sal's sending the tow truck. Rick is writing 'take care of your equipment' on the whiteboard."}};
const NOGUN="Rick: No guns. Not from the cars, not from anywhere. We're not animals. We're a zone defence.";

/* ---------------- resources (disposed when the job ends, any ending) ---------------- */
let RES=null;const res=()=>RES||(RES={geo:[],mat:[],tex:[],veh:[],ov:{},hooks:[]});
const G_=g=>{res().geo.push(g);return g},M_=m=>{res().mat.push(m);return m},T_=t=>{res().tex.push(t);return t};
function freeAll(){const R=RES;RES=null;if(!R)return;const a=A();
  for(const o of Object.keys(R.ov))try{a&&a.overlay&&a.overlay(o,null)}catch(_){}
  for(const g of R.geo)try{g.dispose()}catch(_){}for(const m of R.mat)try{m.dispose()}catch(_){}for(const t of R.tex)try{t.dispose()}catch(_){}
  for(const v of R.veh)try{v.userData&&v.userData.dispose&&v.userData.dispose()}catch(_){}
  for(const u of R.hooks)try{u()}catch(_){}
  if(R.kit)try{R.kit.close()}catch(_){}}
const std=(c,o)=>M_(new (A().THREE.MeshStandardMaterial)(Object.assign({color:A().lin?A().lin(c):c,roughness:.6,metalness:0},o||{})));
function canvasTex(w,h,f){const T3=A().THREE,c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);const t=new T3.CanvasTexture(c);if(T3.sRGBEncoding)t.encoding=T3.sRGBEncoding;t.anisotropy=4;return T_(t)}
function mesh(g,m,x,y,z,parent,rx,ry,rz){const T3=A().THREE,o=new T3.Mesh(G_(g),m);o.position.set(x||0,y||0,z||0);if(rx||ry||rz)o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=true;o.receiveShadow=true;if(parent)parent.add(o);return o}
const bx=(w,h,d)=>new (A().THREE.BoxGeometry)(w,h,d),cy=(r0,r1,h,s)=>new (A().THREE.CylinderGeometry)(r0,r1,h,s||14);

/* ---------------- props: the ATM, the cash box, the slot outline ---------------- */
function atmModel(){const a=A(),T3=a.THREE,g=new T3.Group();g.name='brakeATM';
  const body=std('#3d434b',{roughness:.45,metalness:.55}),trim=std('#c9ced3',{roughness:.25,metalness:.85}),dark=std('#17191c',{roughness:.6}),
    scr=M_(new T3.MeshStandardMaterial({color:a.lin('#0c2236'),emissive:a.lin('#2c7fc0'),emissiveIntensity:.85,roughness:.15})),
    head=M_(new T3.MeshStandardMaterial({map:canvasTex(256,64,(c,w,h)=>{const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#1f6f4a');gr.addColorStop(1,'#14523a');c.fillStyle=gr;c.fillRect(0,0,w,h);
      c.fillStyle='#f4f1e6';c.font='bold 40px Arial, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('CASH · 24 HR',w/2,h/2+2)}),emissive:a.lin('#ffffff'),emissiveIntensity:.25,roughness:.4}));
  mesh(bx(.86,1.62,.5),body,0,.81,0,g);mesh(bx(.92,.06,.56),trim,0,1.65,0,g);mesh(bx(.9,.22,.08),head,0,1.5,.27,g);
  mesh(bx(.6,.4,.06),dark,0,1.16,.24,g,-.18,0,0);mesh(bx(.5,.3,.02),scr,0,1.17,.28,g,-.18,0,0);
  for(let r=0;r<4;r++)for(let c=0;c<3;c++)mesh(bx(.07,.05,.04),trim,-.09+c*.09,.86-r*.07,.3,g,-.3,0,0);
  mesh(bx(.36,.04,.05),dark,0,.62,.27,g);mesh(bx(.18,.025,.04),dark,.2,.98,.27,g);
  /* the pried front panel: hanging open on one hinge, the safe door behind it bent */
  const door=new T3.Group();door.position.set(-.41,.38,.26);g.add(door);mesh(bx(.8,.42,.04),body,.4,0,0,door);door.rotation.y=-1.15;g.userData.door=door;door.visible=false;
  const hole=mesh(bx(.72,.36,.02),dark,0,.38,.255,g);hole.visible=false;g.userData.hole=hole;return g}
function cashBox(){const a=A(),T3=a.THREE,g=new T3.Group();g.name='brakeCash';const m=std('#8b939b',{roughness:.35,metalness:.75}),k=std('#26292c',{roughness:.6}),
  y=std('#f2c230',{roughness:.5});mesh(bx(.46,.2,.3),m,0,.1,0,g);mesh(bx(.48,.03,.32),k,0,.2,0,g);mesh(bx(.2,.04,.04),k,0,.25,0,g);mesh(bx(.12,.01,.08),y,.12,.205,.06,g);return g}
/* the slot outline: a chalk-white dashed car footprint with a chevron, tinted green when you're in it */
function ghostModel(){const a=A(),T3=a.THREE,g=new T3.Group();g.name='brakeGhost';
  const tex=canvasTex(128,256,(c,w,h)=>{c.clearRect(0,0,w,h);c.strokeStyle='#ffffff';c.lineWidth=9;c.setLineDash([22,13]);const r=26;c.beginPath();c.moveTo(r+6,6);c.lineTo(w-r-6,6);c.quadraticCurveTo(w-6,6,w-6,r+6);
    c.lineTo(w-6,h-r-6);c.quadraticCurveTo(w-6,h-6,w-r-6,h-6);c.lineTo(r+6,h-6);c.quadraticCurveTo(6,h-6,6,h-r-6);c.lineTo(6,r+6);c.quadraticCurveTo(6,6,r+6,6);c.stroke();
    c.setLineDash([]);c.lineWidth=11;c.lineCap='round';c.beginPath();c.moveTo(34,92);c.lineTo(64,58);c.lineTo(94,92);c.stroke();c.globalAlpha=.16;c.fillStyle='#ffffff';c.fillRect(14,14,w-28,h-28)});
  const m=M_(new T3.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,color:0xffd23f,opacity:.95}));const p=new T3.Mesh(G_(new T3.PlaneGeometry(2.3,4.9)),m);p.rotation.x=-Math.PI/2;p.renderOrder=3;g.add(p);
  const beamM=M_(new T3.MeshBasicMaterial({color:0xffd23f,transparent:true,opacity:.18,depthWrite:false,side:T3.DoubleSide}));const b=new T3.Mesh(G_(new T3.CylinderGeometry(.06,.06,2.6,6,1,true)),beamM);b.position.y=1.3;g.add(b);
  g.userData.m=m;g.userData.beam=beamM;return g}

/* ---------------- people ---------------- */
function dad(id,x,z,ry){const a=A(),d=a.makeDude(a.HOMIES[id]);d.root.position.set(x,a.groundAt(x,z),z);d.root.rotation.y=ry||0;a.wmAdd(d.root);d.who=id;return d}
function thug(key,x,z,ry){const a=A(),PP=window.HT&&HT.People;let d=null;if(PP&&PP.ok&&PP.has&&PP.has(key))try{d=PP.make(key,{})}catch(_){d=null}
  if(!d)d=a.makeDude({shirt:'#3b3b45',pants:'#2a2a2a',hood:1});d.root.position.set(x,a.groundAt(x,z),z);d.root.rotation.y=ry||0;a.wmAdd(d.root);return d}
function pose(d,dt,o){const PP=window.HT&&HT.People;if(d&&d.rb&&PP&&PP.pose)try{PP.pose(d,dt,o||{moving:false,aim:false,mode:'stand'})}catch(_){}}
function walkTo(d,t,sp,dt){const a=A(),r=d.root.position,dx=t.x-r.x,dz=t.z-r.z,l=Math.hypot(dx,dz);if(l<.2){pose(d,dt);return true}const s=Math.min(l,sp*dt);r.x+=dx/l*s;r.z+=dz/l*s;r.y=a.groundAt(r.x,r.z);
  d.root.rotation.y=Math.atan2(dx,dz);pose(d,dt,{moving:true,speed:sp>2.6?1.5:1,aim:false,mode:'stand'});return false}
function faceTo(d,x,z,dt){const r=d.root,w=Math.atan2(x-r.position.x,z-r.position.z);r.rotation.y+=wrap(w-r.rotation.y)*Math.min(1,(dt||1)*5)}
/* a seat in a car (index.html SEATS: [forward, hip, right, turn]) */
function seat(d,c,i,dt){if(!d||!c)return;const a=A(),S=(a.SEATS&&a.SEATS[c.type])||[[0,.6,-.4],[0,.6,.4]],s=S[i||0]||S[0],f=fwd(c.yaw),r=rgt(c.yaw),sc=d.root.scale.y||1;
  d.root.position.set(c.x+f[0]*s[0]+r[0]*s[2],a.groundAt(c.x,c.z)+s[1]-.59*sc,c.z+f[1]*s[0]+r[1]*s[2]);d.root.rotation.set(0,c.yaw+Math.PI+(s[3]||0),0);pose(d,dt,{mode:'sit',aim:false,moving:false})}

/* ---------------- mission cars: a model + collider, posed by arc length (s) and lane offset (lat) on the route ---------------- */
function lightCar(type,color){const VM=window.HT&&HT.Vehicles;if(!VM||!VM.make)return null;try{const v=VM.make(type,{color,lod:1});if(!v)return null;v.userData.mod=true;v.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.userData.noBatch=true}});return v}catch(_){return null}}
function mkCar(M,kind,type,color,o){const a=A();o=o||{};const obj=(o.light&&lightCar(type,color))||a.makeVehicle(type,color,{rims:'stock'})||a.makeVanBox(color);a.wmAdd(obj);if(obj.userData&&obj.userData.dispose)res().veh.push(obj);
  const e={type,obj,pos:a.V3(0,0,0),yaw:0,spd:0,col:a.wmCol({x0:-1e4,z0:-1e4,x1:-1e4+1,z1:-1e4+1}),owner:'brake',name:o.name||kind,stats:null,meshes:null};const S=a.carSize(e);
  const c={kind,type,color,e,obj,s:0,lat:0,v:0,len:S.l,w:S.w,x:0,z:0,yaw:0,steer:0,brk:false,haz:false,vx:0,vz:0,id:(M.vid=(M.vid||0)+1),name:o.name||kind};M.all.push(c);return c}
function poseOn(M,c,s,lat,dlat,dt){const P=M.P,q=P.at(s),r=rgt(q.yaw);c.s=s;c.lat=lat;c.x=q.x+r[0]*lat;c.z=q.z+r[1]*lat;
  const sgn=c.v<0?-1:1,base=c.v<0?q.yaw+Math.PI:q.yaw,y=base-sgn*Math.atan2(dlat||0,Math.max(Math.abs(c.v),1.5));const y0=c.yaw;c.yaw=y;
  c.steer+=(clamp(wrap(c.yaw-y0)/Math.max(dt||1/30,1e-3)*.35,-1,1)-c.steer)*Math.min(1,(dt||0)*6);syncC(c,dt)}
function syncC(c,dt){const a=A(),e=c.e,f=fwd(c.yaw);e.pos.set(c.x,0,c.z);e.yaw=c.yaw;e.spd=Math.abs(c.v);c.vx=f[0]*Math.abs(c.v);c.vz=f[1]*Math.abs(c.v);a.syncCar(e);
  const VM=window.HT&&HT.Vehicles,o=c.obj;if(o.userData&&o.userData.mod&&VM&&VM.update&&dt)try{VM.update(o,{speed:Math.abs(c.v),steer:c.steer,braking:c.brk,headlights:false,dt});if(o.userData.setHazard&&c.hazOn!==c.haz){c.hazOn=c.haz;o.userData.setHazard(c.haz)}}catch(_){}}
function dropCar(M,c){if(c.obj.parent)c.obj.parent.remove(c.obj);const k=c.e.col;k.x0=k.z0=-1e4;k.x1=k.z1=-1e4+1;k.ob=null;try{c.obj.userData.dispose&&c.obj.userData.dispose()}catch(_){}
  const R=res(),i=R.veh.indexOf(c.obj);if(i>=0)R.veh.splice(i,1);const j=M.all.indexOf(c);if(j>=0)M.all.splice(j,1);c.gone=true}

/* the route as a right-lane polyline; the hatchback's lane is lat 0, his nine (and the oncoming lane) is lat -3.05 */
function buildRoute(M){const a=A(),Tl=TL(),G=a.roads();if(!G||!Tl)return false;let pts=R9.slice();for(let i=0;i<LAPS;i++)pts=pts.concat(LAP);pts.push([443,43],[443,71]);
  const ids=pts.map(([x,z])=>G.nearestNode(x,z));const lane=G.lane(ids);let k=0;while(k<lane.length-1&&lane[k].x<254)k++;
  M.P=Tl.poly(LOT.map(([x,z])=>({x,z})).concat(lane.slice(k)));M.ids=ids;
  M.bridgeS=M.P.project(293,44.5,150,100).s;M.r9End=M.P.project(315,44.5,240,100).s;M.lapS=M.P.len-90;
  /* each junction on the route: where it is along the lane, and whether a side street leaves it to the right (for his fake turns) */
  let hint=0;M.nodes=[];for(let i=1;i<ids.length-1;i++){const n=G.nodes[ids[i]];const r=M.P.project(n.x,n.z,hint+60,120);hint=r.s;
    const prev=G.nodes[ids[i-1]],next=G.nodes[ids[i+1]],dIn=[Math.sign(n.x-prev.x),Math.sign(n.z-prev.z)],dOut=[Math.sign(next.x-n.x),Math.sign(next.z-n.z)];
    const straight=dIn[0]===dOut[0]&&dIn[1]===dOut[1],rightDir=[-dIn[1],dIn[0]],side=n.e.some(e=>e.dir[0]===rightDir[0]&&e.dir[1]===rightDir[1]);
    M.nodes.push({s:r.s,straight,side,x:n.x,z:n.z})}
  return true}

/* ---------------- the job ---------------- */
J.register('brake',{
  def:{giver:'rick',hood:'river',title:'Brake Check',role:'Coach Rick · Youth Soccer, Fourteen Seasons, One Whistle',place:'Fill-Er-Up, Route 9 and Riverside',
    lines:["Fill-Er-Up's ATM gets hit every Thursday. Same teal hatchback, same two guys, same crowbar. They're very consistent. I respect it. I don't like it.",
      "Everybody wants to chase them. No. Chasing is how you end up in somebody's living room. We don't chase. We run a PLAY.",
      "Three cars. You, me, Big Dave. We box him in: one in front, one beside, one behind, and we brake together. No ramming. No civilians. No guns. We're not animals. We're a zone defence."],
    obj:"Run Rick's play: hold your slot around the getaway car until the box closes, brake together, then zip-tie the crew and return the cash box.",
    crew:[],weapons:['pistol'],from:{place:'g_rick'},start:{x:STAGE.you.x,z:STAGE.you.z},site:null,
    unlock:{done:['duke']},pay:K.pay,par:K.par,winTrust:0,roam:true,stay:true,order:14,noGuns:NOGUN,
    stages:['huddle','chase','collar'],stageLabels:{huddle:'The huddle',chase:'The snap',collar:'Hands up'},failPolicy:'escalate',
    medals:['Finished','Clean box: no contact with the hatchback','Clean box in under 1:30 of chase'],
    radio:[['rick',"Fill-Er-Up. South edge of the lot, nose east. Dave's bringing the pickup. I'm bringing the playbook. And orange slices."]],
    endLine:"Rick: That's a W. Fourteen seasons and I've never once had all three of my players in position. Today I did. I'm going to frame the whistle."},

  start(M,o){const a=A(),Tl=TL();freeAll();Object.assign(M,{ph:'huddle',t:0,said:{},cool:{},q:[],qT:0,tl:[],all:[],civs:[],vid:0,flags:0,civHits:0,civKiss:0,fouls:0,
      play:null,held:{you:false,rick:false,dave:false},heldT:{you:0,rick:0,dave:0},formT:0,breakT:0,vBox:0,box:{t:0},boxes:0,chaseT0:null,chaseT:0,farT:0,ai:{},
      oncT:6,sunT:20,sundays:0,score:0,maxBoxT:0,firstHeld:false,stopT:null,flagCd:0});
    if(!Tl||!buildRoute(M)){M.broken=true;return}
    try{const O=H().ow;if(O&&O.traffic)O.traffic(0,{player:a.P.pos,car:null,camera:a.camera,off:true})}catch(_){}
    a.wmSetWindow(a.wmWindow(STAGE.you.x,STAGE.you.z,24));
    /* the ATM and the getaway car */
    M.atm=atmModel();M.atm.position.set(ATM.x,a.groundAt(ATM.x,ATM.z),ATM.z);a.wmAdd(M.atm,true);a.wmCol({x0:ATM.x-.48,x1:ATM.x+.48,z0:ATM.z-.3,z1:ATM.z+.3});
    const tg=mkCar(M,'target','hatch','#2c8c8a',{name:'the hatchback'});M.tg=tg;
    tg.rail=Tl.Rail(M.P,{max:K.r9,corner:K.corner,acc:3.4,dec:7,len:tg.len,gap:1.2,stopAtEnd:true,maxAt:s=>s<M.r9End?K.r9:K.town});tg.rail.place(0);tg.s=0;tg.v=0;poseOn(M,tg,0,0,0,0);
    /* Rick's SUV and Dave's pickup on the lot's south edge */
    M.crew={rick:mkCar(M,'crew','suv','#a8322f',{name:"Rick's SUV"}),dave:mkCar(M,'crew','pickup','#8f2a1e',{name:"Dave's pickup"})};
    for(const id of['rick','dave']){const c=M.crew[id];c.who=id;c.st='parked';c.x=STAGE[id].x;c.z=STAGE[id].z;c.yaw=STAGE.yaw;syncC(c,0)}
    /* the people: Rick and Dave in the huddle by your door, two thieves at the ATM */
    M.rick=dad('rick',STAGE.you.x+1.2,STAGE.you.z-3.1,Math.PI);M.dave=dad('dave',STAGE.you.x+3.4,STAGE.you.z-2.6,Math.PI*.85);
    M.thA=thug('thug_hoodie',ATM.x-.5,ATM.z+.9,Math.PI);M.thB=thug('thug_track',ATM.x+.9,ATM.z+1.3,Math.PI*.8);M.thIn=0;
    M.ghost=ghostModel();a.wmAdd(M.ghost);M.ghost.visible=false;
    playbook(M,true);
    /* any civilian hit counts: the neighbours' parked cars report through the car-damage hook too */
    const h=H();if(h.CAR_HOOKS&&h.CAR_HOOKS.damage){const fn=(e,lost,cause)=>{if(M!==A().M||M.state!=='go'||cause!=='parked'||M.ph!=='chase')return;if(e&&e.owner==='neighbour'&&e!==A().CV)civHit(M,e.name?e.name+"'s parked car":'a parked car',true)};
      h.CAR_HOOKS.damage.push(fn);res().hooks.push(()=>{const i=h.CAR_HOOKS.damage.indexOf(fn);if(i>=0)h.CAR_HOOKS.damage.splice(i,1)})}
    if(h.onBreakdown){const un=h.onBreakdown((e)=>{if(M!==A().M||M.state!=='go'||e!==A().CV)return;fail(M,'broke')});res().hooks.push(un)}
    if(o&&o.checkpoint)return;
    {const e=a.CV;if(e&&Math.hypot(e.pos.x-STAGE.you.x,e.pos.z-STAGE.you.z)<16){e.pos.set(STAGE.you.x,0,STAGE.you.z);e.yaw=STAGE.yaw;a.owStopCar(e);a.syncCar(e);a.P.yaw=e.yaw+.5}}
    sayAll(M,L_.huddle);music('tension',.3)},

  upd(dt,M,F){const a=A();if(M.broken){F.objs.push(['(the play system failed to load)',false]);return}
    M.t+=dt;tlTick(M);lineTick(M,dt);M.flagCd=Math.max(0,M.flagCd-dt);
    if(M.ph==='huddle'||M.ph==='snap')huddleTick(M,dt,F);
    else if(M.ph==='chase')chaseTick(M,dt,F);
    else if(M.ph==='collar')collarTick(M,dt,F);
    if(M.ph!=='chase'){for(const c of M.civs)civStep(M,c,dt);civCull(M)}
    seatTick(M,dt);ghostTick(M);playbook(M);
    if(M.chaseT0!=null&&M.ph==='chase')M.chaseT=M.t-M.chaseT0},

  save(M){const tg=M.tg,c=M.crew||{};return{ph:M.ph==='snap'?'huddle':M.ph,play:M.play,s:tg?Math.round(tg.s*100)/100:0,flags:M.flags,civ:M.civHits,kiss:M.civKiss,chaseT:Math.round((M.chaseT||0)*10)/10,
    crew:['rick','dave'].map(id=>c[id]?{st:c[id].st==='parked'?'parked':c[id].st,s:Math.round(c[id].s*100)/100,lat:Math.round(c[id].lat*100)/100}:null),boxes:M.boxes||0,stopT:M.stopT}},
  load(M,s){if(!s||!M.tg)return;const a=A();M.play=s.play||null;M.flags=s.flags||0;M.civHits=s.civ||0;M.civKiss=s.kiss||0;M.boxes=s.boxes||0;M.stopT=s.stopT||null;
    if(s.ph==='chase'&&M.play){M.said.hutDone=1;snapNow(M,true);return}
    if(s.ph==='collar'&&M.play){M.said.hutDone=1;snapNow(M,true);const tg=M.tg;tg.rail.place(s.s);tg.s=s.s;tg.v=0;tg.rail.v=0;poseOn(M,tg,s.s,0,0,0);
      for(const[i,id]of['rick','dave'].entries()){const q=s.crew[i],c=M.crew[id];if(q){c.st='route';c.s=q.s;c.lat=q.lat;c.v=0;poseOn(M,c,q.s,q.lat,0,0)}}
      M.chaseT=s.chaseT||0;startCollar(M,true);return}},
  payout(M,ok){if(!ok)return[];const out=[];if(!M.flags)out.push(['Clean box (no contact)',K.clean]);if(!M.civHits&&!M.civKiss)out.push(['No civilians touched',K.noCiv]);
    if((M.stopT||1e9)<K.quickT)out.push(['Boxed in under 2:00',K.quick]);if(M.ranDown)out.push(['Ran him down on foot',K.ranDown]);return out},
  medal(M){if(M.flags)return 1;return(M.stopT||1e9)<K.goldT?3:2},
  end(M,ok){const a=A(),s=a.SV();if(ok){/* Route 9 and the bridge: both meters at half weight */a.addTrust(2,'maple');a.addTrust(2,'river');
      if(!M.flags){a.addTrust(3,'maple');a.addTrust(3,'river');a.feed('Clean box · +3 Maple · +3 Riverside','good','No contact with the hatchback')}
      if(s){s.flags=s.flags||{};s.flags.atmSafe=true}}
    try{a.save()}catch(_){}},
  hud(st){const M=A().M;if(!M||!M.def||M.def.id!=='brake')return;if(M.ph==='chase'&&st.routeTo!==undefined)st.routeTo=null},
  camera(){return undefined},
  test:{give(a){const h=window.__ht,s=a.SV();for(const id of['gary','rick','dave','doug','earl','duke']){const i=a.MISSIONS.findIndex(m=>m.id===id);if(i>=0&&h&&h.prog)h.prog.done[i]=true;if(s&&window.HT.Save&&HT.Save.jobRec)HT.Save.jobRec(s,id).done=true}
      if(s&&s.world)s.world.bridgeOpen=true;if(s&&s.flags)s.flags.act2Intro=true;if(h&&h.prog)h.prog.act=Math.max(h.prog.act||1,3);
      const PP=window.HT.People;if(PP&&PP.preload)try{PP.preload(['dad_rick','dad_dave','thug_hoodie','thug_track','thug_beanie','thug_red'].filter(k=>PP.keys&&PP.keys.includes(k)&&!PP.has(k))).catch(()=>{})}catch(_){}},
    step:(a,t,o)=>bot(a,t,o),
    sample:()=>({ph:'chase',play:'fence',s:322.5,flags:1,civ:0,kiss:0,chaseT:34.2,crew:[{st:'route',s:330,lat:0},{st:'route',s:314,lat:0}],boxes:0,stopT:null})}
});

/* the result card: a driving play's numbers instead of the fight stats */
const HEADS=["That's a W.","Hands in. Box on three.","Zone defence. Undefeated.","A muddy W. Still a W."];
J.on('hud',()=>{const a=A(),M=a&&a.M;if(!M||!M.def||M.def.id!=='brake'||M.state==='go'||M.resDone||typeof document==='undefined')return;
  const r=document.querySelector('.ht-result .col');if(!r)return;M.resDone=true;
  if(M.state==='won'){const h=r.querySelector('h2');if(h)h.textContent=M.flags?HEADS[3]:(M.stopT||1e9)<K.goldT?HEADS[2]:HEADS[0]}
  const cells=[...r.querySelectorAll('.ht-stats > div')],set=(d,k,v,sub)=>{if(!d)return;d.innerHTML='';const b=document.createElement('b'),sp=document.createElement('span');b.textContent=k;sp.className='ht-num';sp.textContent=v;d.appendChild(b);d.appendChild(sp);
    if(sub){const sm=document.createElement('small');sm.textContent=sub;d.appendChild(sm)}};
  const by=k=>cells.find(d=>{const b=d.querySelector('b');return b&&b.textContent.trim().toLowerCase()===k});
  const pl=PLAYS[M.play]||{name:'—',you:'twelve'};
  set(by('neutralized'),'Play',pl.name,'you took '+(SLOT[pl.you]?SLOT[pl.you].name.toLowerCase():'a slot'));
  set(by('zip-tied'),'Zip-tied',String(M.cuffs||0),M.ranDown?'one ran. briefly':'nobody ran');
  const grid=r.querySelector('.ht-stats');if(grid){const add=(k,v,sub)=>{const d=document.createElement('div');grid.appendChild(d);set(d,k,v,sub)};
    const ct=Math.round(M.stopT||M.chaseT||0);add('Snap to stop',Math.floor(ct/60)+':'+String(ct%60).padStart(2,'0'),M.boxes>1?'box formed '+M.boxes+' times':'one box, one stop');
    add('Flags',String(M.flags||0),M.flags?'contact with the hatchback':'clean box');add('Civilians',(M.civHits||0)+(M.civKiss||0)?String((M.civHits||0)+(M.civKiss||0)):'0',(M.civHits||0)+(M.civKiss||0)?'touched':'not a scratch')}});
J.on('pose',()=>{if(!RES)return;const a=A();if(!a)return;const M=a.M;if(a.mode==='mission'&&M&&M.def&&M.def.id==='brake')return;freeAll()});

/* ---------------- lines: Rick paces himself (the radio keeps 4) ---------------- */
const NAMES={dante:'Dante',kev:'Kevin'};
function say(M,text,o){o=o||{};const q=M.q,who=o.who||'rick',exp=M.t+(o.ttl||(o.chatter?8:26));if(o.front){q.unshift([who,text,o.if,exp]);if(q.length>5)q.length=5;return}if(o.chatter&&q.length>=1)return;q.push([who,text,o.if,exp]);if(q.length>7)q.splice(1,1)}
function sayAll(M,lines,front){if(front)for(let i=lines.length-1;i>=0;i--)say(M,lines[i][1],{who:lines[i][0],front:true});else for(const l of lines)say(M,l[1],{who:l[0]})}
function lineTick(M,dt){M.qT-=dt;if(M.qT>0||!M.q.length)return;const[w,t,ok,exp]=M.q.shift();if(ok&&!ok()||exp<M.t)return;A().radio(NAMES[w]||w,t);M.qT=Math.max(2.2,t.length*.052)+.3}
function chat(M,key,cd,pool,who){if((M.cool[key]||0)>M.t)return false;M.cool[key]=M.t+cd;say(M,pick(pool),{chatter:true,who:who||'rick'});return true}
function once(M,key){if(M.said[key])return false;M.said[key]=1;return true}
function setT(M,t,fn){M.tl.push({at:M.t+t,fn})}
function tlTick(M){for(let i=0;i<M.tl.length;i++){const q=M.tl[i];if(q.at<=M.t){M.tl.splice(i--,1);try{q.fn()}catch(e){console.warn('[brake]',e)}}}}

/* ---------------- sound: the whistle (a pea whistle: a buzzing trill), a horn blip ---------------- */
function whistle(M,long){const Au=window.HT&&HT.Audio;if(!Au||!Au.tone)return;try{const n=long?9:4;for(let i=0;i<n;i++){Au.tone({f:2950+(i%2)*260,to:2800+(i%2)*300,type:'square',d:.07,gain:.045,at:i*.065});Au.tone({f:3240,type:'sine',d:.08,gain:.05,at:i*.065})}
  if(long)Au.tone({f:3100,to:2700,type:'sine',d:.5,gain:.05,at:n*.065})}catch(_){}}
function blip(f,d){const Au=window.HT&&HT.Audio;if(Au&&Au.tone)try{Au.tone({f,type:'triangle',d:d||.12,gain:.08,bus:'ui'})}catch(_){}}
function music(st,i){const Au=window.HT&&HT.Audio;if(!Au||!Au.ready)return;try{Au.music&&Au.music(st,{intensity:i==null?.4:i});if(Au.setIntensity&&i!=null)Au.setIntensity(i)}catch(_){}}

/* ---------------- 1. the huddle: pick the play, then the snap ---------------- */
function huddleTick(M,dt,F){const a=A(),e=a.CV,you=e||{pos:a.P.pos};
  /* the thieves at the ATM: one prying, one lookout who keeps NOT looking at three dads */
  if(!M.thIn){if(M.thA){faceTo(M.thA,ATM.x,ATM.z-1,dt);pose(M.thA,dt,{mode:M.ph==='snap'?'stand':'kneel',aim:false,moving:false})}if(M.thB){faceTo(M.thB,ATM.x+8,ATM.z+10,dt);pose(M.thB,dt)}}
  if(M.ph==='huddle'){for(const d of[M.rick,M.dave]){faceTo(d,you.pos.x,you.pos.z,dt);pose(d,dt)}
    if(!M.play){F.objs.push(["Pick Rick's play: press 1 for SANDWICH or 2 for FENCE",false]);F.target={x:ATM.x,z:ATM.z,label:'The ATM'};if(!M.kit)choice(M)}
    return}
  /* the snap: the dads to their cars, the thieves to theirs */
  M.snapT=(M.snapT||0)+dt;F.objs.push(['Get ready: the hatchback is about to pull out',false]);F.target={x:M.tg.x,z:M.tg.z,label:'The hatchback'};
  for(const id of['rick','dave']){const d=M[id],c=M.crew[id];if(!d||c.inCar)continue;const S=a.carSize(c.e),f=fwd(c.yaw),r=rgt(c.yaw),door={x:c.x+f[0]*.3-r[0]*(S.w/2+.5),z:c.z+f[1]*.3-r[1]*(S.w/2+.5)};
    if(walkTo(d,door,id==='dave'?3:3.6,dt)){c.inCar=true;try{a.snd&&a.snd('cuff',.25)}catch(_){}}}
  if(M.snapT>1.4&&M.thIn<2){const tg=M.tg,f=fwd(tg.yaw),r=rgt(tg.yaw);
    const doors=[{x:tg.x+f[0]*.2-r[0]*1.5,z:tg.z+f[1]*.2-r[1]*1.5},{x:tg.x+f[0]*.2+r[0]*1.5,z:tg.z+f[1]*.2+r[1]*1.5}];
    [[M.thA,0],[M.thB,1]].forEach(([d,i])=>{if(!d||d.inCar)return;if(walkTo(d,doors[i],4.6,dt)){d.inCar=true;M.thIn++}});
    if(M.snapT>1.6&&once(M,'atmOpen')){M.atm.userData.door.visible=true;M.atm.userData.hole.visible=true;try{a.puff&&a.puff(ATM.x,1,ATM.z+.4,'#c9ced3',6)}catch(_){}
      say(M,"Panel's off! Cash box is out! Here they come!")}}
  if(M.thIn>=2&&M.crew.rick.inCar&&M.crew.dave.inCar&&M.snapT>3.2)snapNow(M,false)}
function choice(M){const a=A(),HD=a.HUD;if(!HD||!HD.kit||!HD.kit.choices||typeof document==='undefined'){M.kit={close(){}};return}
  const opts=[{text:'1 · SANDWICH: you get in FRONT of him (pass him first). Rick on his left, Dave behind.',reg:'real'},{text:'2 · FENCE: you ride ALONGSIDE him, on his left. Rick in front, Dave behind.',reg:'real'}];
  const kit=HD.kit.choices({speaker:'Coach Rick',color:'#ff8a7a',prompt:"Pick the play. Press 1 or 2.",tell:"He's holding the playbook upside down. He knows it by heart.",options:opts,onPick:i=>pickPlay(M,i===1?'fence':'sandwich')});
  M.kit=kit||{close(){}};if(kit){a.overlay('brake-choice',kit.el);res().ov['brake-choice']=1;res().kit=kit}}
function pickPlay(M,id){const a=A();if(M.play||M!==a.M)return;M.play=id;const pl=PLAYS[id];
  try{a.overlay('brake-choice',null)}catch(_){}try{const k=res().kit;if(k&&k.close)k.close()}catch(_){}delete res().ov['brake-choice'];res().kit=null;M.kit={close(){}};
  M.crew.rick.slot=pl.rick;M.crew.dave.slot=pl.dave;M.q.length=0;blip(660);blip(990,.18);
  sayAll(M,pl.call,false);setT(M,.2,()=>a.feed('Play: '+pl.name.toUpperCase(),'info',"You take "+SLOT[pl.you].name.toLowerCase()+": "+SLOT[pl.you].where));
  sayAll(M,[["rick",pick(L_.hut)]]);setT(M,pl.call.reduce((t,l)=>t+Math.max(2.2,l[1].length*.052)+.3,0)+.3,()=>whistle(M,false));
  M.ph='snap';M.snapT=-1.6}
/* the hatchback goes: the chase starts (and the [CP] for "Retry from the snap") */
function snapNow(M,fromCP){const a=A(),tg=M.tg,pl=PLAYS[M.play]||PLAYS.sandwich;M.ph='chase';M.chaseT0=M.t-(fromCP?0:0);M.formT=0;M.breakT=0;M.box={t:0};M.phase='escort';/* the milder chase damage band (carChasing) */
  for(const d of[M.thA,M.thB,M.rick,M.dave])if(d)d.inCar=true;M.thIn=2;M.crew.rick.inCar=M.crew.dave.inCar=true;M.crew.rick.slot=pl.rick;M.crew.dave.slot=pl.dave;
  M.atm.userData.door.visible=true;M.atm.userData.hole.visible=true;
  tg.rail.place(0);tg.rail.v=fromCP?0:2;tg.s=0;tg.v=tg.rail.v;tg.rail.stops=[];tg.rail.done=false;
  /* the dads leave the lot along its south edge onto his exit path, then ride the route */
  const Tl=TL();for(const id of['rick','dave']){const c=M.crew[id],p0=STAGE[id];c.st='entry';c.v=0;c.entry=Tl.Rail(Tl.poly(CREW_IN(p0).map(([x,z])=>({x,z}))),{max:9,corner:5,acc:4,dec:7});c.entry.place(0);c.delay=id==='rick'?.6:1.4;
    c.x=p0.x;c.z=p0.z;c.yaw=STAGE.yaw;syncC(c,0)}
  if(fromCP){const e=a.CV;if(e&&Math.hypot(e.pos.x-STAGE.you.x,e.pos.z-STAGE.you.z)<30){e.pos.set(STAGE.you.x,0,STAGE.you.z);e.yaw=STAGE.yaw;a.owStopCar(e);a.syncCar(e)}
    M.q.length=0;whistle(M,true);say(M,"Reset! From the top of the play! Everybody back to the line!",{front:true})}
  else a.CP.mark('chase');
  /* the van gets a once-over for the chase (chases start healthy, docs/car-damage.md) */
  try{const h=H(),e=a.CV;if(e&&h.carFrac&&h.carRepair&&h.carFrac(e)<.85)h.carRepair(e,(.85-h.carFrac(e))*h.carHpMax(e))}catch(_){}
  sayAll(M,L_.snap,false);setT(M,3,()=>say(M,L_.slotYou(SLOT[pl.you]),{who:'rick'}));music('combat',.5);
  M.ghost.visible=true;M.oncT=16}

/* ---------------- 2. the chase ---------------- */
function playerCar(){const a=A(),e=a.CV;if(e)return{x:e.pos.x,z:e.pos.z,yaw:e.yaw,spd:e.car?e.car.spd:e.spd||0,e};const P=a.P;return{x:P.pos.x,z:P.pos.z,yaw:P.yaw,spd:0,e:null}}
/* the player on the route: arc length, lane offset, speed along the lane */
function pOnRoute(M){const p=playerCar(),tg=M.tg,r=M.P.project(p.x,p.z,tg.s,140),q=M.P.at(r.s),rv=rgt(q.yaw),lat=(p.x-q.x)*rv[0]+(p.z-q.z)*rv[1],f=fwd(q.yaw),pf=fwd(p.yaw);
  const along=(pf[0]*f[0]+pf[1]*f[1])*p.spd;return{p,s:r.s,lat,d:r.d,v:along,yawErr:Math.abs(wrap(p.yaw-q.yaw)),len:p.e?A().carSize(p.e).l:1,kind:'player'}}
const slotLat=(tg,sl)=>clamp(tg.lat+sl.lat,-3.3,.5);
function slotOf(M,who){const pl=PLAYS[M.play]||PLAYS.sandwich;return SLOT[pl[who]]}
function inSlot(M,who,c,loose){const sl=slotOf(M,who),tg=M.tg,ex=loose?1:0;if(!c||c.d>6)return false;const ds=c.s-(tg.s+sl.ds),dl=c.lat-slotLat(tg,sl);if(Math.abs(dl)>K.tolLat+ex*.5||c.yawErr>K.tolYaw+ex*.3)return false;
  if(sl===SLOT.twelve)return ds>K.tol12[0]-ex&&ds<K.tol12[1]+ex;if(sl===SLOT.six)return ds>K.tol6[0]-ex&&ds<K.tol6[1]+ex;return Math.abs(ds)<K.tol9+ex}
function chaseTick(M,dt,F){const a=A(),tg=M.tg,pr=pOnRoute(M);M.pr=pr;
  targetStep(M,dt,pr);for(const id of['rick','dave'])crewStep(M,M.crew[id],dt,pr);civTick(M,dt,pr);
  /* who's in their slot (crew: their own lane maths; you: projected onto his lane) */
  const crewIn=id=>{const c=M.crew[id];return c.st==='route'&&inSlot(M,id,{s:c.s,lat:c.lat,d:0,yawErr:0},M.boxPh==='stop')};
  const was={...M.held};M.held.you=!!a.CV&&inSlot(M,'you',pr,M.boxPh==='stop');M.held.rick=crewIn('rick');M.held.dave=crewIn('dave');
  for(const k of['you','rick','dave'])M.heldT[k]=M.held[k]?M.heldT[k]+dt:0;
  chatterSlots(M,was);contacts(M,pr,dt);if(M.state!=='go')return;
  /* the box: form -> squeeze -> stop */
  const all=M.held.you&&M.held.rick&&M.held.dave;if(!M.boxPh)M.boxPh='form';
  const cars=[{x:pr.p.x,z:pr.p.z,who:'you'},{x:M.crew.rick.x,z:M.crew.rick.z,who:'rick'},{x:M.crew.dave.x,z:M.crew.dave.z,who:'dave'}];
  const tgt={x:tg.x,z:tg.z,yaw:tg.yaw,spd:tg.v,w:tg.w,l:tg.len},Tl=TL();
  if(M.boxPh==='form'){M.formT=all?M.formT+dt:0;if(M.formT>=K.formT){M.boxPh='squeeze';M.boxes++;M.vBox=tg.v;M.box={t:0};for(const c of M.civs.slice())if(c.v<0&&c.s>tg.s+55&&Math.hypot(c.x-pr.p.x,c.z-pr.p.z)>60){dropCar(M,c)}M.civs=M.civs.filter(c=>!c.gone);sayAll(M,L_.boxUp,true);blip(880,.2);
      say(M,M.held.you&&slotOf(M,'you')===SLOT.twelve?L_.squeezeYou12:L_.squeezeYou9,{front:false});setT(M,1.5,()=>{say(M,pick(L_.thiefA),{who:'kev'});say(M,pick(L_.thiefB),{who:'dante'})});music('combat',.85)}}
  else if(M.boxPh==='squeeze'||M.boxPh==='stop'){
    if(!all){M.breakT+=dt;if(M.breakT>(M.boxPh==='stop'?1.2:K.breakT)){boxBroken(M);return}}else M.breakT=0;
    if(M.boxPh==='squeeze'){M.vBox=Math.max(K.squeezeV,M.vBox-K.squeezeDec*dt);
      const done=Tl.boxed(tgt,cars,{st:M.box,dt,t:K.boxT,vmax:K.vmax,ok:c=>M.held[c.who]});M.maxBoxT=Math.max(M.maxBoxT,M.box.t);
      if(M.box.t>.4&&M.box.t<1.2)chat(M,'holding',6,L_.holding);
      if(done){M.boxPh='stop';M.stopV0=M.vBox;sayAll(M,L_.whistle,true);setT(M,1.1,()=>{whistle(M,true);a.banner&&a.banner('BRAKE TOGETHER','Hold S · gently',2)});M.brakeOK=false}}
    else{M.vBox=Math.max(0,M.vBox-K.stopDec*dt);if(once(M,'brakeLine'))say(M,L_.brake,{chatter:false});
      if(pr.v<tg.v+3&&(a.keys&&a.keys.s))M.brakeOK=true;
      if(M.vBox<=0&&tg.v<.3&&Math.abs(pr.p.spd)<1.4&&M.held.you){stopDone(M);return}}}
  /* escape: 220 m clear for 15 s (or he runs out of route: the on-ramp) */
  const dd=Math.hypot(pr.p.x-tg.x,pr.p.z-tg.z);M.farT=dd>K.escD?M.farT+dt:Math.max(0,M.farT-dt*2);if(dd>110)chat(M,'far',12,L_.far);
  if(M.farT>=K.escT||tg.s>=M.P.len-2)return fail(M,'escaped');
  objectives(M,F,pr,dd)}
function objectives(M,F,pr,dd){const a=A(),sl=slotOf(M,'you');
  if(!a.CV){F.objs.push(['Get back in your car (E)',false,'warn']);F.target={x:M.car.pos.x,z:M.car.pos.z,label:'Your car'};return}
  const gp=ghostPos(M);F.target={x:gp.x,z:gp.z,label:'Your slot · '+sl.clock+" o'clock"};
  if(M.boxPh==='form'){F.objs.push([M.held.you?'You\'re in '+sl.name+'. HOLD it while the crew fills the box':'Drive into your slot: '+sl.name+' ('+sl.where+')',M.held.you]);
    const n=(M.held.you?1:0)+(M.held.rick?1:0)+(M.held.dave?1:0);F.objs.push(['Box: '+n+'/3 slots held · no contact, no civilians',n===3])}
  else if(M.boxPh==='squeeze'){F.objs.push([sl===SLOT.twelve?'Ease off the gas (let go of W): slow him down from the front':'Hold your slot while Rick slows him from the front',M.held.you]);
    F.objs.push(['Get him under '+Math.round(K.vmax*2.237)+' mph and hold the box '+K.boxT+' s',M.box.t>=K.boxT])}
  else F.objs.push(['BRAKE TOGETHER: hold S and stop in your slot',false]);
  if(M.oncWarn)F.objs.push(['Oncoming car! Tuck in behind him',false,'warn']);
  if(M.flags)F.objs.push(['Flags on the play · '+M.flags+'/'+K.flagMax,false,'warn']);
  if(M.boxPh!=='form')F.meters.push({id:'box',label:'Box',v:M.boxPh==='stop'?K.boxT:M.box.t,max:K.boxT,style:'bar',icon:'clock',sub:M.boxPh==='stop'?'brake!':Math.round(M.tg.v*2.237)+' mph'});
  if(M.farT>0)F.widgets.push({id:'esc',kind:'timer',label:'He gets away',v:Math.max(0,K.escT-M.farT),max:K.escT,hot:true});
  F.widgets.push({id:'clock',kind:'timer',label:'Play clock',v:M.chaseT||0});
  if(dd>60&&M.boxPh==='form')F.objs.push(['Catch up: he\'s '+Math.round(dd)+' m ahead',false,'warn'])}
function chatterSlots(M,was){const pl=PLAYS[M.play];
  if(M.held.you&&!was.you){if(!M.firstHeld){M.firstHeld=true;say(M,pick(L_.inSlot),{front:true});blip(780)}else chat(M,'inSlot',14,L_.inSlot)}
  if(!M.held.you&&was.you&&M.heldT.you===0&&M.boxPh==='form')chat(M,'lostSlot',10,L_.lostSlot);
  if(M.held.rick&&!was.rick)chat(M,'rickIn',16,L_.rickIn[pl.rick]||L_.rickIn.nine,'rick');
  if(M.held.dave&&!was.dave){if(!M.said.daveWrong&&Math.random()<.5){M.said.daveWrong=1;chat(M,'daveIn',16,L_.daveWrong,'dave')}else chat(M,'daveIn',16,L_.daveIn,'dave')}}
function boxBroken(M){M.boxPh='form';M.formT=0;M.breakT=0;M.box={t:0};M.vBox=0;M.ai.surgeT=3.2;M.ai.surgeCd=0;say(M,pick(L_.broken),{front:true});blip(330,.25);music('combat',.6)}
function stopDone(M){const a=A(),tg=M.tg;M.boxPh='done';M.stopT=M.chaseT;M.phase=null;tg.v=0;tg.rail.v=0;tg.haz=true;for(const id of['rick','dave'])M.crew[id].v=0;
  sayAll(M,L_.stopped,true);music('victory',.6);a.CP.mark('collar');startCollar(M,false)}
function fail(M,why){const a=A(),pr=M.pr,tg=M.tg;if(M.state!=='go')return;M.loseWhy={why,t:Math.round(M.t),stage:M.stage,s:tg?Math.round(tg.s):0,d:pr?Math.round(Math.hypot(pr.p.x-tg.x,pr.p.z-tg.z)):0,
    held:Object.assign({},M.held),boxPh:M.boxPh,flags:M.flags,civ:M.civHits,why2:M.civWhat||null};
  if(why!=='escaped')whistle(M,true);const titles={escaped:'He got away',card:'Yellow card',flags:'Benched',broke:'Out of the play'};
  a.endMission(false,L_.fail[why]||'The play broke down.',titles[why]||'Play dead')}

/* ---------------- the hatchback: a car on rails that reacts to the box forming ---------------- */
function laneCars(M,me,pr){const out=[];for(const c of M.all){if(c===me||c.gone||c.st==='entry'||c.st==='parked')continue;out.push(c)}if(pr&&pr.p.e&&pr.d<5)out.push({s:pr.s,lat:pr.lat,v:pr.v,len:pr.len,kind:'player'});return out}
/* the nearest car ahead in my lane: {g (bumper gap), v (its speed along the lane, >= 0), c} */
function ahead(M,me,lat,maxD,pr){let best=null;for(const o of laneCars(M,me,pr)){if(Math.abs(o.lat-lat)>2.05)continue;const d=o.s-me.s;if(d<=0||d>maxD)continue;const g=d-(o.len+me.len)/2;if(!best||g<best.g)best={g,v:Math.max(0,o.v),c:o}}return best}
function targetStep(M,dt,pr){const tg=M.tg,r=tg.rail,ai=M.ai;tg.lat=r.lat;
  for(const k of['checkCd','feintCd','leanCd','passCd','surgeCd'])ai[k]=Math.max(0,(ai[k]||0)-dt);ai.t=(ai.t||0)+dt;
  const busy=ai.mode&&ai.mode!=='cruise';let mul=1,add=0;const stopPh=M.boxPh==='stop'||M.boxPh==='done',sq=M.boxPh==='squeeze';
  const filled=(M.held.you?1:0)+(M.held.rick?1:0)+(M.held.dave?1:0),chasing=M.t-(M.chaseT0||0)>6;
  if(ai.surgeT>0){ai.surgeT-=dt;add+=K.surge}
  /* reactions (none once the stop is called; one at a time) */
  if(!busy&&chasing&&!stopPh){const six=whoAt(M,'six'),nine=whoAt(M,'nine'),twelve=whoAt(M,'twelve');
    const behind=behindOf(M,tg,pr),bGap=behind?behind.g:99;
    const nxt=M.nodes.find(n=>n.s>tg.s+18&&n.s<tg.s+36);
    if(filled>=2&&!ai.surgeCd&&!sq){ai.surgeT=4;ai.surgeCd=K.surgeCd;if(once(M,'spook'))setT(M,.6,()=>{say(M,pick(L_.thiefA),{who:'kev'})})}
    else if(behind&&bGap<6.5&&bGap>.6&&!ai.checkCd&&tg.v>7&&!sq&&(filled>=2||behind.c.kind==='player')&&(M.checks=(M.checks||0))<4){M.checks++;ai.mode='tell';ai.mt=.75;ai.victim=behind.c.kind==='player'?'you':behind.c.who||'dave';chat(M,'tell',20,L_.checkTell)}
    else if(nine&&!ai.leanCd&&filled>=1&&tg.v>6){ai.mode='lean';ai.mt=1.6;ai.victim=nine;chat(M,'lean'+nine,10,L_.lean[nine]||L_.lean.rick,nine==='you'?'rick':'rick')}
    else if(twelve==='you'&&!nine&&!ai.passCd&&!sq&&tg.v>6&&!oncomingWithin(M,tg.s,70)&&!nxt&&(twelve==='you'||!pr||pr.s<tg.s-22||pr.lat>-1.2)&&!M.all.some(c=>c.kind==='crew'&&c.lat<-1.4&&Math.abs(c.s-tg.s)<20)){ai.mode='pass';ai.mt=4.5;chat(M,'pass',8,L_.pass)}
    else if(nxt&&nxt.side&&nxt.straight&&!ai.feintCd&&filled>=1&&!sq){ai.mode='feint';ai.mt=1.8;ai.node=nxt;chat(M,'feint',12,L_.feint)}}
  ai.mt=(ai.mt||0)-dt;r.latWant=0;tg.brkTell=false;
  if(ai.mode==='tell'){tg.brkTell=Math.sin(ai.t*28)>0;if(ai.mt<=0){ai.mode='check';ai.mt=1.05;ai.checkCd=K.checkCd;try{A().snd&&A().snd('cuff',.2)}catch(_){}
      if(ai.victim==='dave'||ai.victim==='rick')setT(M,.5,()=>say(M,pick(L_.check[ai.victim]||L_.check.dave),{who:ai.victim,front:true}));else say(M,pick(L_.check.you),{front:true})}}
  else if(ai.mode==='check'){mul=.3;r.dec=11;if(ai.mt<=0){ai.mode=null;r.dec=7;ai.surgeT=2.2}}
  else if(ai.mode==='lean'){r.latWant=-.55;if(ai.mt<=0){ai.mode=null;ai.leanCd=K.leanCd}}
  else if(ai.mode==='feint'){r.latWant=.95;mul=.62;tg.brkTell=true;if(ai.mt<=0){ai.mode=null;ai.feintCd=K.feintCd;ai.surgeT=2.6}}
  else if(ai.mode==='pass'){/* swing into the left lane and try to go round the front car; gives up if his nine gets filled */
    const nine=whoAt(M,'nine',true);r.latWant=K.nineLat;add+=K.surge+1.2;
    const front=ahead(M,tg,0,30,pr);const passed=!front||front.g>14;if(nine&&r.lat>-1.6||oncomingWithin(M,tg.s,45)||ai.mt<=0){ai.mode=null;ai.passCd=K.passCd;r.latWant=0}
    else if(r.lat<-2.6&&passed&&!ai.pDone){ai.pDone=true}
    if(!ai.mode&&ai.pDone){ai.pDone=false;chat(M,'passed',6,L_.passed)}}
  /* he hides behind slow traffic (and pulls out round it when the left lane is free) */
  const sun=M.civs.find(c=>c.sunday&&!c.gone&&c.s>tg.s&&c.s-tg.s<26&&Math.abs(c.lat-r.lat)<2);if(sun&&!ai.mode){chat(M,'sunday',25,L_.sunday);if(!whoAt(M,'nine',true)&&!oncomingWithin(M,tg.s,60)&&sun.s-tg.s<14)r.latWant=K.nineLat}
  /* the squeeze and the stop: he can only go as fast as the box lets him */
  let cap=null;if(sq)cap=M.vBox+.6;if(stopPh)cap=M.vBox;
  /* gap keeping against whatever is ahead in his lane, by relative speed (he'll sit 1.2 m off a bumper if he must) */
  const ctx={speedMul:mul,speedAdd:add,ahead:me=>{const f=ahead(M,tg,r.latWant<-1.5?Math.min(r.lat,-1.6):r.lat,32,pr);if(!f)return null;return r.gap+f.v*f.v/(2*r.dec*.9)+Math.max(0,f.g-1.2)}};
  if(cap!=null){const want=Math.min(r.maxAt?r.maxAt(r.s):r.max,cap+.01);ctx.speedMul=want/Math.max(.1,r.maxAt?r.maxAt(r.s):r.max);ctx.speedAdd=0}
  if(M.boxPh==='done'){r.v=0}else r.step(dt,ctx);
  tg.s=r.s;tg.lat=r.lat;tg.v=r.v;tg.brk=r.brake||tg.brkTell;const dl=(r.lat-(tg.latPrev==null?r.lat:tg.latPrev))/Math.max(dt,1e-3);tg.latPrev=r.lat;poseOn(M,tg,r.s,r.lat,dl,dt)}
/* who is sitting in a slot right now (any car, not just its owner): 'you'|'rick'|'dave'|null */
/* the closest car right behind him in his lane: {g, c} */
function behindOf(M,tg,pr){let best=null;for(const o of laneCars(M,tg,pr)){if(Math.abs(o.lat-tg.lat)>1.6)continue;const d=tg.s-o.s;if(d<=0||d>20)continue;const g=d-(o.len+tg.len)/2;if(!best||g<best.g)best={g,c:o}}return best}
function whoAt(M,slot,loose){const tg=M.tg,sl=SLOT[slot],pr=M.pr;const test=(s,lat)=>{const ds=s-(tg.s+sl.ds),dl=lat-slotLat(tg,sl);return Math.abs(dl)<(loose?1.8:1.3)&&(slot==='nine'?Math.abs(ds)<(loose?4:2.7):slot==='twelve'?ds>-2.5&&ds<6:ds<2.5&&ds>-6)};
  if(pr&&pr.p.e&&pr.d<5&&test(pr.s,pr.lat))return'you';for(const id of['rick','dave']){const c=M.crew[id];if(c&&c.st==='route'&&test(c.s,c.lat))return id}return null}
function oncomingWithin(M,s,d){return M.civs.some(c=>!c.gone&&c.v<0&&c.s>s-4&&c.s<s+d)}

/* ---------------- Rick and Dave: cars that hold a slot (by arc length and lane offset, so corners stay in lane) ---------------- */
function cornerV(M,s,v){let lim=1e9;const y0=M.P.at(s).yaw;for(let k=4;k<=20;k+=4){const dA=Math.abs(wrap(M.P.at(s+k).yaw-y0));if(dA>.35)lim=Math.min(lim,K.corner+Math.max(0,k-6)*.6)}return lim}
function crewStep(M,c,dt,pr){const tg=M.tg;
  if(c.st==='entry'){c.delay-=dt;if(c.delay>0){c.v=0;syncC(c,dt);return}const R=c.entry;R.step(dt,{ahead:()=>null});const q=R.path.at(R.s);c.x=R.x;c.z=R.z;const y0=c.yaw;c.yaw=R.yaw;c.v=R.v;c.steer=clamp(wrap(c.yaw-y0)/Math.max(dt,1e-3)*.35,-1,1);syncC(c,dt);
    if(R.done||R.s>R.path.len-1.5){const pj=M.P.project(c.x,c.z,30,60);/* join the route only once he's clear of the merge */if(tg.s>pj.s+10){c.st='route';c.s=pj.s;c.lat=0;c.v=Math.max(c.v,4)}else{R.v=0;c.v=0}}return}
  if(M.boxPh==='done'){c.v=Math.max(0,c.v-K.crewDec*dt);poseOn(M,c,c.s+c.v*dt,c.lat,0,dt);c.brk=true;return}
  const sl=SLOT[c.slot],stopPh=M.boxPh==='stop';let sT=tg.s+sl.ds,latT=slotLat(tg,sl);c.yield=false;
  if(c.slot==='nine'&&c.s<tg.s-20)latT=0;
  /* Sandwich: Rick hangs back behind Dave until you're past him (the left lane is yours to pass in) */
  if(c.slot==='nine'&&slotOf(M,'you')===SLOT.twelve&&pr&&pr.s<tg.s+4&&pr.s>tg.s-70&&!(M.boxPh==='squeeze'||M.boxPh==='stop')){sT=tg.s-17;latT=0;if(pr.s>tg.s-45&&once(M,'makeWay'))say(M,pick(L_.makeWay),{front:true})}
  if(c.slot==='twelve'&&c.s<tg.s+5.8)latT=c.s>tg.s-26?K.nineLat:0;
  if(c.slot==='six'&&tg.lat<-1.5)latT=tg.lat;
  /* oncoming traffic: anyone in the left lane tucks back in behind him */
  const inLeft=c.lat<-1.4||latT<-1.4;if(inLeft){const onc=M.civs.find(o=>!o.gone&&o.v<0&&o.s>c.s-3&&o.s<c.s+48+Math.abs(o.v)*1.5&&o.lat<-1.4);
    if(onc){c.yield=true;latT=tg.lat;if(c.s>tg.s-9.5){const six=c.who!=='dave'&&M.crew.dave.st==='route'&&M.crew.dave.s<tg.s-4;sT=Math.min(sT,tg.s-(six?16:9));if(once(M,'oncRick'+Math.floor(M.t/12)))chat(M,'oncRick',10,L_.onc.rick,c.who==='rick'?'rick':'dave')}}}
  /* lean: the car at his nine gives him room */
  if(c.slot==='nine'&&M.ai.mode==='lean'&&!c.yield)latT=tg.lat+sl.lat-.4;
  let vT=stopPh?M.vBox+clamp((sT-c.s)*.6,-2.5,2.5):tg.v+clamp((sT-c.s)*.85,-7,8);
  if(c.slot==='twelve'&&M.boxPh==='squeeze'&&Math.abs(c.lat-tg.lat)<1.2&&c.s>tg.s+4)vT=Math.min(vT,M.vBox+clamp((sT-c.s)*.4,-1.5,1.5));
  vT=Math.min(vT,K.crewMax,cornerV(M,c.s,c.v));
  const f=ahead(M,c,c.lat,40,pr);if(f)vT=Math.min(vT,f.v+Math.max(0,f.g-1.6)*.9);
  /* lane changes only into a free lane */
  latT=clamp(latT,-3.5,.5);let dl=clamp(latT-c.lat,-K.laneV*dt,K.laneV*dt);if(Math.abs(dl)>1e-4){const to=c.lat+Math.sign(dl)*2.1;for(const o of laneCars(M,c,pr)){if(Math.abs(o.s-c.s)<(o.len+c.len)/2+1.2&&Math.abs(o.lat-to)<1.9&&Math.sign(o.lat-c.lat)===Math.sign(dl)){dl=0;break}}}
  vT=Math.max(0,vT);const a=vT>c.v?K.crewAcc:(f&&f.g<3?K.crewDec*1.35:K.crewDec);c.v+=clamp(vT-c.v,-a*dt,a*dt);c.brk=vT<c.v-.4||c.v<.3;
  let s=c.s+c.v*dt;/* never inside another mission car */for(const o of laneCars(M,c,pr)){if(o.kind==='player')continue;if(Math.abs(o.lat-(c.lat+dl))<1.95){const d=o.s-s,mn=(o.len+c.len)/2+.25;if(d>0&&d<mn){s=o.s-mn;c.v=Math.min(c.v,Math.max(0,o.v))}}}
  poseOn(M,c,Math.max(c.s,s),c.lat+dl,dl/Math.max(dt,1e-3),dt)}

/* ---------------- civilians: oncoming cars in the left lane, the odd Sunday driver in his lane ---------------- */
const CIV_TYPES=['sedan','suv','hatch','pickup','sedan','workvan'],CIV_COLS=['#b9c0c7','#2e4a6b','#d8d4c8','#3d4a3a','#7a5a3a','#c9b48a','#4c5b70','#e0dccf'];
function civTick(M,dt,pr){const tg=M.tg;M.oncT-=dt;M.sunT-=dt;M.oncWarn=false;
  if(M.oncT<=0&&M.civs.filter(c=>c.v<0).length<2&&M.boxPh==='form'&&tg.s>40){M.oncT=K.oncCd+Math.random()*6;const s=tg.s+150+Math.random()*40;if(s<M.P.len-20){
      const c=mkCar(M,'civ',CIV_TYPES[M.vid%CIV_TYPES.length],CIV_COLS[(M.vid*3)%CIV_COLS.length],{light:true,name:'a civilian car'});c.v=-(9+Math.random()*2.5);c.want=c.v;poseOn(M,c,s,K.nineLat,0,0);M.civs.push(c)}}
  if(M.sunT<=0&&M.sundays<K.sundayMax&&tg.s>M.r9End+40&&M.boxPh==='form'&&pr&&pr.s<tg.s-28&&!M.held.you){M.sunT=40;const s=tg.s+60;if(s<M.P.len-200&&!M.nodes.some(n=>Math.abs(n.s-s)<10)){M.sundays++;
      const c=mkCar(M,'civ','sedan','#c9b48a',{light:true,name:'a Sunday driver'});c.sunday=true;c.v=7.2;c.want=7.2;c.life=0;poseOn(M,c,s,0,0,0);M.civs.push(c)}}
  for(const c of M.civs)civStep(M,c,dt,pr);civCull(M,pr);
  /* the early warning: an oncoming car within 90 m while you're in the left lane (or your slot is there) */
  if(pr&&(pr.lat<-1.3||slotOf(M,'you')===SLOT.nine))for(const c of M.civs)if(!c.gone&&c.v<0&&c.s>pr.s&&c.s-pr.s<90){M.oncWarn=true;break}}
function civStep(M,c,dt,pr){if(c.gone)return;c.life=(c.life||0)+dt;
  if(c.v<0||c.want<0){/* oncoming: brakes (and honks) for anything in its lane */let want=c.want,near=null;for(const o of laneCars(M,c,pr)){if(Math.abs(o.lat-c.lat)>2)continue;const d=c.s-o.s;if(d>0&&d<34){const g=d-(o.len+c.len)/2;if(!near||g<near)near=g}}
    if(pr&&pr.p){const p=pr.p,f=fwd(c.yaw),dx=p.x-c.x,dz=p.z-c.z,al=dx*f[0]+dz*f[1],sd=Math.abs(dx*f[1]-dz*f[0]);if(al>0&&al<30&&sd<2.4){const g=al-(c.len+pr.len)/2;if(near==null||g<near)near=g}}
    if(near!=null){want=-Math.max(0,Math.min(-c.want,(near-2)*.7));if(near<22&&!c.honked){c.honked=true;try{A().snd&&A().snd('horn',.35)}catch(_){}if(pr&&pr.lat<-1.3&&Math.abs(pr.s-c.s)<36)M.oncWarn=true}}
    if(near!=null&&near<30&&pr&&pr.lat<-1.3&&pr.s<c.s&&c.s-pr.s<40)M.oncWarn=true;
    c.v+=clamp(want-c.v,-9*dt,6*dt);c.brk=want>c.v+.3||Math.abs(c.v)<.3;poseOn(M,c,c.s+c.v*dt,c.lat,0,dt);
    if(M.oncWarn&&M.ph==='chase'&&slotOf(M,'you')===SLOT.nine)chat(M,'oncYou',7,L_.onc.you)}
  else{/* the Sunday driver: 7 m/s, keeps its distance, then finds the gas pedal (16 s) and leaves */if(c.life>16)c.want=17;const f=ahead(M,c,c.lat,30,pr);let want=c.want;if(f)want=Math.min(want,f.v+Math.max(0,f.g-3)*.6);c.v+=clamp(want-c.v,-7*dt,3*dt);c.brk=want<c.v-.3;poseOn(M,c,c.s+c.v*dt,c.lat,0,dt)}}
function civCull(M,pr){for(let i=M.civs.length-1;i>=0;i--){const c=M.civs[i];if(c.gone){M.civs.splice(i,1);continue}const tg=M.tg;
  const p=pr?pr.p:playerCar(),dp=Math.hypot(c.x-p.x,c.z-p.z);const behindAll=c.s<Math.min(tg.s,pr?pr.s:tg.s)-35;if(dp>170||behindAll&&dp>45||c.s<2||c.s>M.P.len-3||c.sunday&&c.life>16&&c.s-tg.s>40&&dp>50){dropCar(M,c);M.civs.splice(i,1)}}}

/* ---------------- contact: flags on the hatchback, civilians (a card), the crew (banter) ---------------- */
function circles(x,z,yaw,l,w){const f=fwd(yaw),o=l/4,r=w/2+.1;return[{x:x+f[0]*o,z:z+f[1]*o,r},{x:x-f[0]*o,z:z-f[1]*o,r}]}
/* closing speed at contact (m/s, > 0 = you drove into it); own: only your own velocity counts (who's to blame) */
function closing(p,S,c,own){const A_=circles(p.x,p.z,p.yaw,S.l,S.w),B=circles(c.x,c.z,c.yaw,c.len,c.w);let hit=null;const fp=fwd(p.yaw),pv=[fp[0]*p.spd,fp[1]*p.spd];
  for(const u of A_)for(const v of B){const dx=v.x-u.x,dz=v.z-u.z,d=Math.hypot(dx,dz);if(d<u.r+v.r+.22){const nx=dx/(d||1),nz=dz/(d||1),vn=(pv[0]-(own?0:c.vx))*nx+(pv[1]-(own?0:c.vz))*nz;if(hit==null||vn>hit)hit=vn}}return hit}
function contacts(M,pr,dt){const a=A(),p=pr.p;if(!p.e)return;const S=a.carSize(p.e);
  for(const c of M.all){if(c.gone)continue;const dd=Math.hypot(c.x-p.x,c.z-p.z);if(dd>8)continue;const h=closing(p,S,c,c.kind==='civ');c.touch=Math.max(0,(c.touch||0)-dt);if(h==null)continue;
    if(c.kind==='target'){if(h>K.bumpV&&!c.touch){c.touch=1.5;/* whose fault: who was moving into whom */const mine=closing(p,S,c,true),his=h-mine;if(mine>=his)flag(M,h);else{M.fouls++;chat(M,'fouled',10,L_.fouled)}}}
    else if(c.kind==='civ'){if(h>K.hitV&&!c.touch){c.touch=3;civHit(M,c.name,false)}else if(h>K.kissV&&!c.touch){c.touch=3;civKiss(M,c)}}
    else if(c.kind==='crew'&&h>K.bumpV&&!c.touch){c.touch=4;chat(M,'crewBump',10,L_.crewBump,c.who)}}
  /* the neighbours' parked cars: a hit below the crash threshold still counts (the damage hook catches the hard ones) */
  for(const e of(a.L&&a.L.cars)||[]){if(!e||e===p.e||e===a.VAN||e.owner!=='neighbour'||!e.obj)continue;const dd=Math.hypot(e.pos.x-p.x,e.pos.z-p.z);if(dd>7)continue;const S2=a.carSize(e);
    const h=closing(p,S,{x:e.pos.x,z:e.pos.z,yaw:e.yaw,len:S2.l,w:S2.w,vx:0,vz:0});if(h==null){e._bk=0;continue}if(e._bk>0)continue;e._bk=1;if(h>K.hitV)civHit(M,(e.name?e.name+"'s":'a')+' parked car',true);else if(h>K.kissV)civKiss(M,{name:e.name?e.name+"'s parked car":'a parked car',parked:e})}}
function flag(M,h){const a=A();M.flags++;{const pr=M.pr,tg=M.tg;(M.flagLog=M.flagLog||[]).push({t:+M.t.toFixed(1),h:+h.toFixed(1),ds:pr?+(pr.s-tg.s).toFixed(1):null,plat:pr?+pr.lat.toFixed(2):null,tlat:+tg.lat.toFixed(2),ai:M.ai.mode||'',pv:pr?+pr.v.toFixed(1):null,tv:+tg.v.toFixed(1),box:M.boxPh,yaw:pr?+pr.yawErr.toFixed(2):null})}blip(420,.22);whistle(M,false);a.addTrust(-.5,'maple');a.addTrust(-.5,'river');
  try{const h2=H(),e=a.CV;if(e&&h2.carDamage&&h<6.5)h2.carDamage(e,2+h*1.4,'crash')}catch(_){}
  a.feed('Flag on the play · −1 trust','bad','No contact with the hatchback ('+M.flags+'/'+K.flagMax+')');say(M,pick(L_.flag),{front:true});
  if(M.flags>=K.flagMax)fail(M,'flags')}
function civKiss(M,c){const a=A();if(M.state!=='go')return;M.civKiss++;a.addTrust(-1,'river');a.feed('You touched a civilian car · −1 trust','bad','Next real hit is a yellow card');whistle(M,false);say(M,pick(L_.kiss),{front:true})}
function civHit(M,what,parked){const a=A();if(M.state!=='go'||M.ph!=='chase')return;{const pr=M.pr,tg=M.tg;(M.flagLog=M.flagLog||[]).push({civ:what,t:+M.t.toFixed(1),ds:pr?+(pr.s-tg.s).toFixed(1):null,plat:pr?+pr.lat.toFixed(2):null,pv:pr?+pr.v.toFixed(1):null,civs:M.civs.map(c=>[Math.round(c.s-(pr?pr.s:0)),+c.lat.toFixed(1),+c.v.toFixed(1)])})}M.civHits++;M.civWhat=what;a.addTrust(-2,'river');a.feed('Hit '+what+' · −2 trust','bad','Yellow card: the play is dead');M.q.length=0;
  a.radio('rick',parked?L_.cardParked:L_.card,true);fail(M,'card')}

/* ---------------- 3. hands up: the stop, the runner, the zip-ties, the cash box, hands in ---------------- */
function startCollar(M,quiet){const a=A(),tg=M.tg,f=fwd(tg.yaw),r=rgt(tg.yaw);M.ph='collar';M.boxPh='done';M.phase=null;M.ghost.visible=false;tg.haz=true;tg.v=0;syncC(tg,0);
  for(const d of[M.thA,M.thB])if(d&&d.root.parent){d.root.parent.remove(d.root)}M.thA=M.thB=null;
  /* both climb out the passenger side (the driver's door has a dad parked on it, or it will in a second) */
  const out=k=>{const q=A().wmSnap?A().wmSnap(tg.x+r[0]*2.2-f[0]*k,tg.z+r[1]*2.2-f[1]*k):{x:tg.x+r[0]*2.2-f[0]*k,z:tg.z+r[1]*2.2-f[1]*k};return q};
  const p1=out(1.2),p2=out(-.6);const kev=a.spawnEnemy(p1.x,p1.z,false),dan=a.spawnEnemy(p2.x,p2.z,false);
  for(const e of[kev,dan]){a.equip(e.dude,null);e.gun=null;e.noLeash=true;e.hp=e.maxhp=40;e.yaw=tg.yaw}
  a.surrender(kev);M.kev=kev;M.dan=dan;hold(dan,tg.x+r[0]*12,tg.z+r[1]*12);dan.state='idle';M.run={st:'wait',t:0};a.rebuildTargets();
  /* where Dante runs: along the road ahead of the box, then out of breath */
  const s0=tg.s+12,q=M.P.at(s0+34),rv=rgt(q.yaw);M.run.to={x:q.x+rv[0]*1.2,z:q.z+rv[1]*1.2};const q1=M.P.at(s0+12);M.run.mid={x:q1.x+rv[0]*1.6,z:q1.z+rv[1]*1.6};
  /* the crew get out and stand by their doors */
  for(const id of['rick','dave']){const c=M.crew[id],d=M[id];c.inCar=false;c.v=0;const cf=fwd(c.yaw),cr=rgt(c.yaw);if(d){d.root.visible=true;d.root.position.set(c.x-cr[0]*(c.w/2+.7),a.groundAt(c.x,c.z),c.z-cr[1]*(c.w/2+.7));d.root.rotation.y=Math.atan2(tg.x-d.root.position.x,tg.z-d.root.position.z)}}
  M.cash={st:'trunk',mesh:null};M.handsIn=false;M.talked=false;
  if(!quiet){setT(M,2.6,()=>say(M,pick(L_.hop),{front:true}));setT(M,4.2,()=>{say(M,"Okay! Okay! It's a coordinated minivan attack, Dante!",{who:'kev',front:true})})}
  M.run.t=quiet?2.5:0}
function collarTick(M,dt,F){const a=A(),P=a.P,tg=M.tg,run=M.run;run.t+=dt;
  for(const id of['rick','dave']){const d=M[id];if(!d||!d.root.visible)continue;if(M.post&&M.post.spot&&M.post.spot[id]){if(walkTo(d,M.post.spot[id],2.2,dt))faceTo(d,M.post.c.x,M.post.c.z,dt);continue}faceTo(d,tg.x,tg.z,dt);pose(d,dt)}
  const kev=M.kev,dan=M.dan;
  /* Dante runs (a few seconds in), slows, then stops to breathe; you catch him by running into him */
  if(dan&&dan.state!=='cuffed'&&dan.state!=='surrender'){
    if(run.st==='wait'&&run.t>4.6){run.st='run';say(M,L_.run[0][1],{who:'dante',front:true});setT(M,2.4,()=>say(M,L_.runYou,{front:true}));M.ranOff=true}
    if(run.st==='run'){const d0=Math.hypot(dan.pos.x-run.mid.x,dan.pos.z-run.mid.z),tgt=d0>1.5&&!run.midDone?run.mid:run.to;if(d0<1.5)run.midDone=true;
      const tired=run.midDone;if(run.st==='run')dan.script={kind:'to',x:tgt.x,z:tgt.z,speed:tired?2.3:4.6,then:e=>hold(e,tgt.x,tgt.z)};if(tired&&once(M,'puff'))say(M,pick(L_.puff),{who:'dante',front:true});
      if(Math.hypot(dan.pos.x-run.to.x,dan.pos.z-run.to.z)<1.7){run.st='spent';hold(dan,P.pos.x,P.pos.z)}}
    if(run.st==='spent'||run.st==='run'){if(Math.hypot(dan.pos.x-P.pos.x,dan.pos.z-P.pos.z)<(run.st==='spent'?2.6:1.7)&&!a.CV){a.surrender(dan);M.ranDown=true;sayAll(M,L_.caught,true);setT(M,1.4,()=>say(M,"Did you just say 'so do I'? That's the dad-est thing I've ever heard. I'm so proud.",{who:'rick'}))}}}
  const cuffed=[kev,dan].filter(e=>e&&e.state==='cuffed').length;
  if(a.CV){F.objs.push(['Get out of your car (E)',false]);F.target={x:tg.x,z:tg.z,label:'The hatchback'};return}
  if(dan&&dan.state!=='cuffed'&&dan.state!=='surrender'&&run.st!=='wait'){F.objs.push([run.st==='spent'?'Dante is out of breath: walk up to him':'Catch Dante! Run into him (Shift to sprint)',false]);F.target={x:dan.pos.x,z:dan.pos.z,label:'Dante'};return}
  if(cuffed<2){const e=[kev,dan].find(e=>e&&e.state==='surrender');if(once(M,'cuffLine'))say(M,L_.cuffAll,{front:true});F.objs.push(['Zip-tie both of them (E) · '+cuffed+'/2',false]);if(e)F.target={x:e.pos.x,z:e.pos.z,label:'Zip-tie'};return}
  /* the cash box: out of the hatchback's trunk, to Rick */
  const f=fwd(tg.yaw),trunk={x:tg.x-f[0]*(tg.len/2+.6),z:tg.z-f[1]*(tg.len/2+.6)};const rk=M.rick.root.position;
  if(M.cash.st==='trunk'){if(once(M,'cashLine'))sayAll(M,L_.cash,true);F.objs.push(['Get the ATM cash box out of the hatchback\'s trunk (hold E)',false]);F.target={x:trunk.x,z:trunk.z,label:'Trunk'};
    F.holds.push({x:trunk.x,z:trunk.z,r:2.2,o:M.cash,txt:'Take the cash box',time:.8,fn:()=>{const m=cashBox();a.wmAdd(m);M.cash.mesh=m;M.cash.st='carry';a.wmCarry('box',m,M.cash);blip(700)}});return}
  if(M.cash.st==='carry'){F.objs.push(['Give the cash box to Rick (E)',false]);F.target={x:rk.x,z:rk.z,label:'Rick'};
    if(!a.P.carry){M.cash.st='trunk';return}
    F.taps.push({x:rk.x,z:rk.z,r:2.4,txt:'Hand Rick the cash box',fn:()=>{const m=a.P.carry&&a.P.carry.mesh;a.wmDrop();if(m&&m.parent)m.parent.remove(m);M.cash.st='given';sayAll(M,L_.given,true);a.feed('Cash box returned','trust',"Fill-Er-Up's ATM, every bill");blip(880);postGame(M)}});return}
  /* the post-game talk: hands in */
  if(!M.handsIn){const c=M.post.c;F.objs.push(['Hands in with the crew (E)',false]);F.target={x:c.x,z:c.z,label:'Hands in'};
    if(Math.hypot(P.pos.x-c.x,P.pos.z-c.z)<3.2)F.taps.push({x:c.x,z:c.z,r:3.2,txt:'Hands in',fn:()=>{M.handsIn=true;sayAll(M,L_.box,true);whistle(M,false);blip(990,.25);M.exitOpen=true;a.feed('BOX!','good','Back to your ride when you\'re ready')}});return}
  F.objs.push(['Back to your ride',false]);F.target={x:M.car.pos.x,z:M.car.pos.z,label:'Your car'}}
/* an unarmed thief who just stands there (a 'to' script that never arrives keeps the combat AI off him) */
function hold(e,x,z){const dx=x-e.pos.x,dz=z-e.pos.z,l=Math.hypot(dx,dz)||1;e.script={kind:'to',x:e.pos.x+dx/l*30,z:e.pos.z+dz/l*30,speed:.001,then:ee=>hold(ee,x,z)}}
function postGame(M){const a=A(),tg=M.tg,f=fwd(tg.yaw),r=rgt(tg.yaw);const c={x:tg.x-r[0]*4.6-f[0]*1,z:tg.z-r[1]*4.6-f[1]*1};/* on the sidewalk side? the left lane is clear now: huddle there */
  M.post={c,spot:{rick:{x:c.x+.9,z:c.z-.5},dave:{x:c.x-.9,z:c.z-.6}}};sayAll(M,M.flags?L_.talkRough:L_.talk.slice(0,2),false);setT(M,7,()=>{if(!M.handsIn)say(M,(M.flags?L_.talkRough:L_.talk)[(M.flags?L_.talkRough:L_.talk).length-1][1])})}

/* ---------------- seats, the ghost, the playbook ---------------- */
function seatTick(M,dt){for(const id of['rick','dave']){const c=M.crew[id],d=M[id];if(!c||!d)continue;if(c.inCar&&M.ph!=='collar'){seat(d,c,0,dt);c.obj.visible=true}}
  if(M.ph==='chase'||M.ph==='snap'&&M.thIn>=2){const tg=M.tg;if(M.thA&&M.thA.inCar)seat(M.thA,tg,0,dt);if(M.thB&&M.thB.inCar)seat(M.thB,tg,1,dt)}
  /* crew cars still on the lot during the snap */
  if(M.ph==='chase')return;for(const id of['rick','dave']){const c=M.crew[id];if(c&&c.st==='parked')syncC(c,dt)}if(M.tg&&M.ph!=='collar')syncC(M.tg,dt)}
function ghostPos(M){const sl=slotOf(M,'you'),tg=M.tg,Tl=TL();if(Tl&&Tl.slot)return Tl.slot({x:tg.x,z:tg.z,yaw:tg.yaw,spd:tg.v,w:tg.w,l:tg.len},{side:sl.side,back:sl.back,path:M.P,s:tg.s,lat0:tg.lat},{w:1.95,l:4.8});
  const q=M.P.at(tg.s+sl.ds),r=rgt(q.yaw);return{x:q.x+r[0]*(tg.lat+sl.lat),z:q.z+r[1]*(tg.lat+sl.lat),yaw:q.yaw}}
function ghostTick(M){const g=M.ghost;if(!g)return;const show=M.ph==='chase'&&M.play&&M.boxPh!=='done'&&!!A().CV;g.visible=show;if(!show)return;const p=ghostPos(M),a=A();
  g.position.set(p.x,a.groundAt(p.x,p.z)+.06,p.z);g.rotation.y=p.yaw;const on=M.held.you;const col=on?0x5dff8a:(slotOf(M,'you')===SLOT.nine&&M.oncWarn?0xff6a4d:0xffd23f);g.userData.m.color.setHex(col);g.userData.beam.color.setHex(col);
  g.userData.m.opacity=on?.75:.95}
/* the playbook: Rick's chalkboard, top right, with the three slots filling (DOM written on change only) */
function playbook(M,init){if(typeof document==='undefined')return;const a=A();
  if(init){const el=document.createElement('div');el.className='brake-pb';el.style.cssText='position:fixed;right:18px;top:120px;width:176px;padding:10px 10px 8px;border-radius:12px;background:linear-gradient(160deg,#25402f,#1a3024);'+
      'box-shadow:0 6px 24px rgba(0,0,0,.45),inset 0 0 0 3px #6b4a2a,inset 0 0 0 6px #4b321b;font:600 11px/1.25 system-ui,Segoe UI,Arial,sans-serif;color:#eef3e6;pointer-events:none;letter-spacing:.02em;opacity:0;transition:opacity .4s';
    el.innerHTML='<div class="t" style="font:800 11px system-ui,Arial;letter-spacing:.14em;text-transform:uppercase;opacity:.85;display:flex;justify-content:space-between"><span>Playbook</span><span class="pn"></span></div><svg viewBox="0 0 156 150" width="156" height="150" style="display:block;margin-top:4px"></svg><div class="c" style="min-height:28px;font-weight:600;opacity:.95"></div>';
    M.pb={el,svg:el.querySelector('svg'),pn:el.querySelector('.pn'),c:el.querySelector('.c'),key:''};a.overlay('brake-pb',el);res().ov['brake-pb']=1;return}
  const B=M.pb;if(!B)return;const vis=!!M.play&&(M.ph==='snap'||M.ph==='chase')&&!M.vf;B.el.style.opacity=vis?'1':'0';if(!vis)return;
  const pl=PLAYS[M.play],sq=M.boxPh==='squeeze',st=M.boxPh==='stop',bt=sq?M.box.t/K.boxT:st?1:M.formT/K.formT;
  const key=[M.play,M.held.you,M.held.rick,M.held.dave,M.boxPh,Math.round(bt*20),M.ai.mode||'',M.oncWarn].join('|');if(key===B.key)return;B.key=key;B.pn.textContent=pl.name;
  const pos={twelve:[78,30],nine:[38,76],six:[78,122]},who={};for(const k of['you','rick','dave'])who[pl[k]]=k;
  const chalk='#eef3e6',on='#7dff9e',ring=(x,y,k)=>{const h=M.held[k],me=k==='you',col=h?on:me?'#ffd23f':chalk;return`<circle cx="${x}" cy="${y}" r="13" fill="${h?'rgba(125,255,158,.22)':'none'}" stroke="${col}" stroke-width="${me?3:2}" ${h?'':'stroke-dasharray="4 3"'}/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="12" font-weight="800" fill="${col}">${me?'YOU':k==='rick'?'R':'D'}</text>`};
  let s=`<rect x="64" y="58" width="28" height="38" rx="6" fill="rgba(255,90,70,.25)" stroke="#ff7a5c" stroke-width="2.5"/><text x="78" y="81" text-anchor="middle" font-size="16" font-weight="900" fill="#ff7a5c">X</text>`;
  s+=`<path d="M78 52 L78 46" stroke="#ff7a5c" stroke-width="2"/><path d="M74 49 L78 44 L82 49" fill="none" stroke="#ff7a5c" stroke-width="2"/>`;
  for(const sl of['twelve','nine','six'])s+=ring(pos[sl][0],pos[sl][1],who[sl]);
  for(const sl of['twelve','nine','six']){const[x,y]=pos[sl];s+=`<text x="${sl==='nine'?x-21:x+19}" y="${y+4}" font-size="9" fill="${chalk}" opacity=".6" text-anchor="${sl==='nine'?'end':'start'}">${SLOT[sl].clock}</text>`}
  if(sq||st||M.formT>0){const w=120*clamp(bt,0,1);s+=`<rect x="18" y="141" width="120" height="6" rx="3" fill="rgba(255,255,255,.15)"/><rect x="18" y="141" width="${w}" height="6" rx="3" fill="${st?'#ffd23f':on}"/>`}
  B.svg.innerHTML=s;const call=st?'WHISTLE · brake together':sq?'BOX IS UP · squeeze':M.ai.mode==='tell'||M.ai.mode==='check'?'Brake check!':M.ai.mode==='feint'?'Fake turn!':M.ai.mode==='pass'?'He\'s swinging out!':M.ai.mode==='lean'?'He\'s leaning!':M.oncWarn?'Oncoming!':'Fill the slots';
  B.c.textContent=call}

/* ---------------- the scripted player (dev/jobs-check.js and dev/jobs/brake.js) ----------------
   Drives with the keys like a person: pure pursuit on a point ahead along his lane at the slot's offset, throttle and brake from the
   gap to the slot. o.fail: pick the play, then sit in the lot until he gets away. o.play forces a play (default: alternate). */
let BOTN=0;
const BOT_IN=[[212,35.6],[226,35.6],[238,35.7],[241.2,36.4],[243.4,38.2],[244.6,41],[247.4,43.6]];
function botDrive(a,M){const e=a.CV,k=a.keys,tg=M.tg,pr=M.pr||pOnRoute(M),sl=slotOf(M,'you');if(!e||!pr)return;
  /* off the lot the way a person would: along its south edge, then right onto Route 9 */
  if(!M.botOut){const Tl=TL();M.botIn=M.botIn||Tl.poly(BOT_IN.map(([x,z])=>({x,z})));const r=M.botIn.project(e.pos.x,e.pos.z);if(r.s>M.botIn.len-2||e.pos.z>41.5)M.botOut=true;else{const q=M.botIn.at(r.s+6);
      let d=wrap(Math.atan2(-(q.x-e.pos.x),-(q.z-e.pos.z))-e.yaw);const sp=e.car?e.car.spd:0;k.a=d>.04;k.d=d<-.04;k.w=sp<9;k.s=sp>11;return}}
  let sT=tg.s+sl.ds,latT=slotLat(tg,sl);const spd=e.car?e.car.spd:e.spd||0;
  if(sl===SLOT.twelve&&pr.s<tg.s+5.5){latT=pr.s>tg.s-28?K.nineLat:0}
  if(sl===SLOT.nine&&pr.s<tg.s-26&&pr.lat>-1.5)latT=0;
  const onc=M.civs.find(o=>!o.gone&&o.v<0&&o.s>pr.s-2&&o.s<pr.s+(pr.lat<-1.4?80:100)&&o.lat<-1.4);
  if(onc&&(latT<-1.4||pr.lat<-1.4)){const gapT=(onc.s-pr.s)/Math.max(4,spd-onc.v);/* seconds until we meet */
    if(sl===SLOT.twelve&&pr.s>tg.s+1.5&&gapT>2.2){/* nearly past: finish the pass */sT=tg.s+K.slotD+1;latT=gapT<3.5?0:latT}
    else{latT=tg.lat;if(pr.s>tg.s-9.5)sT=Math.min(sT,tg.s-(M.crew.dave.s<tg.s-4&&M.crew.dave.s>tg.s-12?16:9.5))}}
  const stop=M.boxPh==='stop',sq=M.boxPh==='squeeze';
  /* in front of him during the squeeze: just ease off (he follows us down) */
  let want=stop?Math.max(0,M.vBox+clamp((sT-pr.s)*.35,-1.5,1.5)):tg.v+clamp((sT-pr.s)*.9,-8,9);if(sq&&sl===SLOT.twelve)want=Math.min(want,M.vBox+clamp((sT-pr.s)*.4,-1,1.5));
  /* never into the car ahead in my lane */
  const f=ahead(M,{s:pr.s,len:pr.len,kind:'player'},pr.lat,30,null);if(f&&f.c.kind!=='player'&&!(f.c.v<0))want=Math.min(want,f.v+Math.max(0,f.g-2.2)*.8);
  /* an oncoming car stopped in front of us (it's waiting for us): steer back right at a crawl */
  if(f&&f.c.v<=0&&f.c.kind==='civ'&&f.g<25){latT=tg.lat;want=Math.min(want,Math.max(2.5,f.g*.4))}
  const off=pr.d>5.5;if(off)want=Math.min(want,10);
  const look=clamp(3.5+spd*.42,3.5,10),q=M.P.at(pr.s+look),r=rgt(q.yaw),lt=off?latT:pr.lat+clamp(latT-pr.lat,-2.2,2.2),ax=q.x+r[0]*lt,az=q.z+r[1]*lt;
  let d=Math.atan2(-(ax-e.pos.x),-(az-e.pos.z))-e.yaw;d=wrap(d);const dz=.035+Math.min(.04,spd*.002);k.a=d>dz;k.d=d<-dz;
  k.w=spd<want-.25;k.s=spd>want+(stop?.15:.9);if(k.w)k.s=false;k[' ']=false;M.botDbg={want:+want.toFixed(1),latT:+latT.toFixed(1),sT:Math.round(sT-tg.s),onc:onc?Math.round(onc.s-pr.s):null,f:f?[f.c.kind,Math.round(f.g)]:null};
  const B=M.botS||(M.botS={stuck:0,back:0});if(B.back>0){B.back-=1/30;k.w=false;k.s=true;const t=k.a;k.a=k.d;k.d=t;return}
  B.stuck=want>3&&Math.abs(spd)<.6?B.stuck+1/30:0;if(B.stuck>2.2){B.stuck=0;B.back=1.1}}
function bot(a,t,o){o=o||{};const M=a.M,P=a.P,k=a.keys;if(!M||M.state!=='go'||M.broken)return null;
  const tp=(x,z)=>{P.pos.set(x,0,z);a.collide(P.pos,.35)},off=()=>{k.w=k.a=k.s=k.d=false;k.e=false};
  if(M.ph==='huddle'){off();if(!M.play&&t%20===10){const pl=o.play||(o.fail?'sandwich':(BOTN++%2?'fence':'sandwich'));if(M.kit&&M.kit.pick)M.kit.pick(pl==='fence'?1:0);else pickPlay(M,pl)}return null}
  if(M.ph==='snap'){off();return null}
  if(M.ph==='chase'){if(o.fail){off();k.s=true;return null}if(!a.CV){off();a.enterCar(M.car);return null}botDrive(a,M);return null}
  if(M.ph==='collar'){off();const e=a.CV;if(e){if(Math.abs(e.car?e.car.spd:0)<.5){a.useTap=true}else k.s=true;return null}
    const dan=M.dan,kev=M.kev;if(dan&&dan.state!=='surrender'&&dan.state!=='cuffed'){if(M.run.st!=='wait'){const dx=dan.pos.x-P.pos.x,dz=dan.pos.z-P.pos.z,l=Math.hypot(dx,dz);if(l>1.2){const s=Math.min(l-1,.2);tp(P.pos.x+dx/l*s,P.pos.z+dz/l*s)}}return null}
    const sur=[kev,dan].find(e=>e&&e.state==='surrender');if(sur){tp(sur.pos.x+1,sur.pos.z);a.useTap=true;return null}
    const tg=M.tg,f=fwd(tg.yaw);if(M.cash.st==='trunk'){tp(tg.x-f[0]*(tg.len/2+1.2),tg.z-f[1]*(tg.len/2+1.2));k.e=true;return null}
    if(M.cash.st==='carry'){const rk=M.rick.root.position;tp(rk.x+1.2,rk.z+.4);a.useTap=true;return null}
    if(!M.handsIn&&M.post){tp(M.post.c.x,M.post.c.z+1.2);a.useTap=true;return null}
    if(M.exitOpen){const e2=M.car;tp(e2.pos.x+2.4,e2.pos.z);a.useTap=true;return null}}
  return null}
/* for dev/jobs/brake-keys.js: what a driver would do this frame, as keys (the test presses them with Playwright) */
window.__brakeBot={want:(a)=>{const M=a.M;if(!M||M.ph!=='chase'||!a.CV)return null;const ka=a.keys;
  const save={w:ka.w,a:ka.a,s:ka.s,d:ka.d};botDrive(a,M);const out={w:!!ka.w,a:!!ka.a,s:!!ka.s,d:!!ka.d};Object.assign(ka,save);return out}};
})();
