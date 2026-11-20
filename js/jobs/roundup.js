/* =====================================================================
   MINIVAN ROUNDUP (SPEC3 2.12): vehicle recovery. Coach Rick's strand 2/2. The first user of HT.Convoy (js/convoy.js, loaded here).
   The whole Maple Heights Hornets carpool fleet, five family minivans, was stolen in one night and parked among the commuter cars
   at the Route 9 Park & Ride while somebody shops them around. Tournament's at noon. Talk your way past the "attendant" (a lot
   scam: pay, ask for a receipt, or let Rick recognise his old left back), walk the rows for the Hornets hang tags while the
   guards and a lookout on a cooler watch the aisles, pop each hood and match the fob-relay wires, shove (or tow) the hatchbacks
   boxing two of them in, then lead them home: the crew drive one van each, in a line behind you, keeping their gaps, signalling,
   running the yellow you ran and stopping at the red you didn't, and commenting on your driving and each other's. Orders on the
   number keys (tighten up, spread out, hold, go round). A grey sedan comes after the line on Route 9: get between him and the
   vans (press 4: Rick takes the lead and you sweep), block him, brake-check him, until he gives up. Then every van peels off to
   its own driveway and the family comes out to see what shape it's in.

   Stages ([CP]): gate (the attendant) -> lot (the lot) -> convoy (convoy out) -> home (the driveways).
   Fail: noon with fewer than 3 vans home; your car breaks down; 2 vans wrecked. The alarm (seen by a guard or the lookout, the
   barrier rammed) escalates to a fight (owner decision 2) and costs the gold medal and "Nobody saw us".
   Files: js/jobs/roundup.js, js/convoy.js (HT.Convoy). Tests: node dev/convoy.test.js, node dev/jobs-check.js roundup --retry --replay
   --shots, node dev/jobs/roundup.js (real keyboard and mouse at human pace; screenshots in docs/screenshots/jobs/roundup/).
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api,H=()=>window.__ht||{};
/* the convoy (and the stealth system, if no stealth job has loaded it yet) ride along with this job */
(function(){const d=typeof document!=='undefined'?document:null;if(!d||!d.head||!d.createElement)return;
  const add=(id,src,has,on)=>{if(has()||(d.getElementById&&d.getElementById(id)))return;const s=d.createElement('script');s.id=id;s.src=src;if(on)s.onload=on;if(d.head.appendChild)d.head.appendChild(s)};
  add('ht-convoy-js','js/convoy.js',()=>!!(window.HT.Convoy&&HT.Convoy.create));
  add('ht-stealth-js','js/stealth.js',()=>!!(window.HT.Stealth&&HT.Stealth.ready),()=>{try{HT.Stealth.bind()}catch(_){}})})();
const CVY=()=>window.HT&&HT.Convoy&&HT.Convoy.create?HT.Convoy:null,SX=()=>window.HT&&HT.Stealth&&HT.Stealth.create?HT.Stealth:null;
const ID='roundup';

/* ---------------- tuning ---------------- */
const K={pay:1100,par:420,clock:600,perVan:100,hubcaps:250,hubcapFrac:.9,fee:200,trustVan:3,trustGhost:5,trustAlumni:2,
  findR:4.2,relayR:2.2,relayNoise:6,sparkNoise:9,crewWalk:2.6,
  shoveClear:3.7,shoveHard:7.5,hitchFollow:6.4,
  lightG:9,lightY:3,lightR:10,yellowAt:22,
  pursueAt:6,chase:17.5,chaseFar:20,harassGap:1.6,blockD:15,shakeBlock:13,shakeBrake:34,shakeRam:16,shakeDecay:1.4,giveUpD:90,
  peelR:16,wreckFail:2,minVans:3,speedNag:17.5};
const D2R=Math.PI/180,clamp=(v,a,b)=>v<a?a:v>b?b:v,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const fwd=y=>[-Math.sin(y),-Math.cos(y)],rgt=y=>[Math.cos(y),-Math.sin(y)],yawTo=(dx,dz)=>Math.atan2(-dx,-dz),hyp=Math.hypot;
const pick=a=>a[Math.floor(Math.random()*a.length)];

/* ---------------- places (metres; the Park & Ride is WORLD.sites.parkride: lot x260-278 z56-86, gate x259 z62-66) ---------------- */
const RING={x:256.4,z:62.8};                              /* the start ring: up the gap east of Dad's Auto's sale cars from Route 9 (the van is then parked at the barrier) */
const VAN_AT={x:252.6,z:64,yaw:-Math.PI/2};
const GATE={x:259,z:64},OUT={x:253.5,z:63.4};           /* the convoy forms on the trail just outside the gate */
const BOOTH_E={x:259.9,z:58.6};                          /* the booth window, from outside (the booth itself is x260.6-262.6 z57-59.6) */
const WINDOW={x:252.3,z:62.25};                           /* where the attendant leans in (driver's side, north of a van facing east) */
const EXIT_PT={x:237,z:52};                              /* out of Dad's Auto lot between the shop and the sale cars, then Route 9 */
const R9={x:236,z:41.5};
const LIGHT={x:179,z:43,stop:5.2,pole:{x:184.2,z:38.7}};  /* Route 9 & Maple: the convoy's first red light */
const LOOP=[{x:109,z:43},{x:109,z:71},{x:179,z:71},{x:179,z:43}];/* "lose him round the block" */
/* the fleet: bay (backed in, nose to the aisle), who drives it, what it looks like, where it lives */
const FLEET=[
  {id:'hen',fam:'Hendersons',bay:{x:266.75,z:58.25,yaw:Math.PI},col:'#b9c0c7',up:{roofRack:'cargo',rims:'alloy'},decor:'roofbox',boxed:null,
    home:{x:125.5,z:38.6,yaw:Math.PI/2,side:-1},people:['nb_pops','nb_kid'],parent:'Mr. Henderson',kid:'Henderson kid',
    find:"Hendersons'! Roof box. I'd know that roof box anywhere. That's where they keep the good cooler."},
  {id:'ngu',fam:'Nguyens',bay:{x:264.25,z:68.75,yaw:0},col:'#c9ccd0',up:{rims:'steel'},decor:'boosters',boxed:null,
    home:{x:160,z:47.4,yaw:Math.PI/2,side:1},people:['nb_kenji','nb_mei'],parent:'Mr. Nguyen',kid:'Mrs. Nguyen',
    find:"Nguyens'. Look in the back. Four booster seats. They have two kids. Nobody asks."},
  {id:'pat',fam:'Patels',bay:{x:271.75,z:68.75,yaw:0},col:'#eeeee8',up:{rims:'alloy'},decor:'stickfam',boxed:{x:272.2,z:63.4,yaw:-Math.PI/2,col:'#3a3f47',push:[1,0]},
    home:{x:130,z:47.4,yaw:Math.PI/2,side:1},people:['nb_marcus','nb_teen'],parent:'Mr. Patel',kid:'Patel kid',
    find:"The Patels'. Stick-figure family on the back window. They added the dog. The dog has a little bow."},
  {id:'kow',fam:'Kowalskis',bay:{x:271.75,z:73.25,yaw:Math.PI},col:'#a7aeb5',up:{roofRack:true,rims:'steel'},decor:'noodles',boxed:{x:272.2,z:78.5,yaw:-Math.PI/2,col:'#6b2a2a',push:[1,0]},
    home:{x:145,z:38.6,yaw:Math.PI/2,side:-1},people:['nb_gran'],parent:'Grandma Kowalski',kid:null,
    find:"Kowalskis'. 'Baby on Board' in the back window, cracked. Their baby is fourteen. The sign stays."},
  {id:'gar',fam:'Garcias',bay:{x:266.75,z:83.75,yaw:0},col:'#9aa3ab',up:{rims:'steel'},decor:'bikerack',boxed:null,
    home:{x:165.5,z:38.6,yaw:Math.PI/2,side:-1},people:['nb_lucia','nb_kid'],parent:'Mrs. Garcia',kid:'Garcia kid',
    find:"Garcias'. Bike rack. There's still a bike on it. They stole the bike too. That's two crimes."}];
/* where each van drives to get out: out of its bay to the aisle, west to the gate, out to OUT (the convoy picks them up from there) */
const JOIN={hen:[[266.75,59],[266.75,62.2],[265.2,63.6],[262,64],[259,64],[OUT.x,OUT.z]],
  ngu:[[264.25,68],[264.25,65.6],[263,64.2],[261,64],[259,64],[OUT.x,OUT.z]],
  pat:[[271.75,68],[271.75,65],[270.2,63.7],[266,63.7],[262,64],[259,64],[OUT.x,OUT.z]],
  kow:[[271.75,74],[271.75,77],[270.2,78.4],[264,78.4],[262.2,77.6],[261.4,75.5],[261.4,68],[260.9,65.4],[259,64.2],[OUT.x,OUT.z]],
  gar:[[266.75,83],[266.75,80],[265.3,78.6],[263.2,78.2],[261.6,76.5],[261.4,68],[260.9,65.4],[259,64.2],[OUT.x,OUT.z]]};
const CREW=['rick','dave','gary','doug','earl'];const CREW_NAME={rick:'Rick',dave:'Dave',gary:'Gary',doug:'Doug',earl:'Earl'};
const CREW_IN={rick:f=>"I'll take the "+f+"'. I know where they keep the gum.",dave:f=>"I'm in the "+f+"' van. It smells like goldfish crackers. All of them. Ever.",
  gary:f=>"The "+f+"'. The seat's set for someone four foot eleven. I'm going to drive like a pretzel.",doug:f=>"The "+f+"'. I'm sitting on a booster seat. It's surprisingly supportive.",
  earl:f=>"Thirty-six years on the bus. I can drive anything with a steering wheel and a schedule. The "+f+"' it is."};
/* guards: two walk the aisles, a lookout on a cooler in the back corner watches the rows (thieves from the mixed pool) */
const GUARDS=[{id:'g1',path:[[262.4,61.2],[277,61.2],[277,65.6],[262.4,65.6]],wait:2.2,speed:1.15},
  {id:'g2',path:[[262.6,79.6],[277,79.6],[277,77],[262.6,77]],wait:2.6,speed:1.05}];
const LOOKOUT={x:274.3,z:84.4,yaws:[-2.2,-1.5,-2.75]};/* (character yaw: forward = (sin y, cos y)) facing north-west across the rows */

/* ---------------- lines ---------------- */
const L={
  brief:["Five minivans. The entire Hornets carpool fleet. Gone in one night. Marcy has a spreadsheet of who drives on which Saturday and now it's just a spreadsheet.",
    "Doug tracked them to the Route 9 Park & Ride. They're sitting in the commuter rows like nothing happened while somebody shops them around.",
    "Tournament's at noon. You lead. The crew drives one van each, and every van goes home to its own driveway. Tight formation. Like a warm-up lap."],
  gate:[['Attendant',"Lot's closed, fellas. Private event."],['rick',"It's a Park and Ride. On a Saturday."],['Attendant',"...Private Park and Ride event. You here for a vehicle?"]],
  feePrompt:"Release fee's forty bucks a van. Cash. It's, uh, a new policy.",
  nudge:[['rick',"Pick one. Number keys. I believe in you."]],
  pay:[['gary',"I have exactly two hundred dollars in my emergency envelope. It says EMERGENCY on it."],['Attendant',"Pleasure doing business."],['rick',"That's not a fee. That's a shakedown. We'll get that back."]],
  receipt:[['Attendant',"A... receipt."],['dave',"For our records. We're very organised."],['Attendant',"The receipt machine is, uh. Broken."],['doug',"That's a cooler."],
    ['Attendant',"(into his phone) Dante. Dante, we got... dads."],['rick',"He's gone to 'find the receipt book'. The barrier's on a button in the booth. Hop out and press it."]],
  coach:[['rick',"Brandon Pruitt? Left back. Under-tens. You cried when we lost to Linden and then scored on our own goal to make it fair."],['Attendant',"...Coach Rick?"],
    ['rick',"You still tuck your shirt in?"],['Attendant',"...Yes, Coach."],['rick',"Barrier, son."],
    ['Attendant',"Yes, Coach. Look, they pulled the fob relays. Red to red, blue to blue. And there's a guy on a cooler in the back corner. Don't let him see you."],
    ['Attendant',"I'm gonna go take my lunch. A long lunch. Possibly a new career."]],
  inLot:[['rick',"Hornets hang tag on the mirror, little bee sticker on the windshield. Walk the rows. Find the bees."],
    ['dave',"They all look the same. They're all silver. Why is every minivan silver?"],['gary',"Silver hides dirt. It's a known fact. I read it on a forum."]],
  decoy:["Silver minivan. No bees. Next.","Lions sticker. Linden Lions. Different team. Different moral code.","That's just a commuter. Look at him. He has a lanyard on the mirror.",
    "Dog hair on every seat. Not ours. Good dog, though.","That one has a 'My Other Car Is Also A Minivan' sticker. Respect. Not ours."],
  relayHow:[['rick',"Pop the hood. They pulled the fob relay. Match the wires to the terminals: number keys 1, 2, 3."]],
  twoBlues:[['you',"Red to red. Blue to... there's two blues."]],
  spark:["Zzt. That one bit me.","Okay. Not that one.","Sparks. Sparks are bad. Sparks are loud.","My eyebrows. I had those."],
  started:["It started! Okay. Okay okay okay.","She lives!","Engine's running. Nobody clap."],
  boxed:{pat:[['rick',"The Patels are boxed in. Hatchback parked right across their nose. Get your van and give it a shove. Gently. It isn't ours."]],
    kow:[['gary',"Kowalskis' too. Same trick, other aisle. Somebody really likes hatchbacks."]]},
  hitch:[['rick',"You've got Sal's hitch. Strap it from its back bumper and drag it clear. Or just shove. Shoving is also a skill."]],
  shoved:["That's one way to parallel park.","Moved it. Didn't scratch it. Okay, I scratched it a little.","Clear! Good push. Low and slow, like a scrum."],
  shoveHard:["GENTLY. It's somebody's hatchback. Probably stolen too, but still.","You hit that like it owed us money."],
  guardCurious:[['Guard',"Why are there four dads checking every minivan?"],['Guard 2',"It's a Park and Ride. Dads ride."]],
  lookoutSee:"Hey. HEY. Those are OUR vans!",
  alarm:[['rick',"We're made! Dads, get low! Nobody does anything heroic!"],['gary',"Define heroic."]],
  barrierShut:[['rick',"They dropped the barrier. Booth button, or go through it. The van's insured. Probably."]],
  tookTie:["Zip-tied. Sit tight. Somebody'll be along with a sandwich.","Shh. Shh. It's fine. Nobody's in trouble except you."],
  formUp:[['rick',"Everybody's running. Get in your van and lead us out the gate. We'll fall in behind."]],
  leaveShort:[['rick',"We're not leaving anyone in here if we can help it. The tournament needs three vans, minimum."]],
  rolling:[['rick',"Tight formation! Like a warm-up lap!"],['rick',"You lead, we follow. Number keys while you drive: 1 tighten up, 2 spread out, 3 hold, 4 go round."]],
  ordersTry:[['rick',"Go on, try one. Press 1. We'll close up."]],
  tight:["Tight formation! Like a warm-up lap!","Closing up! Bumper to bumper! Not literally!","Tighten up, gentlemen. Nobody gets between us."],
  spread:["Spread out! Give everyone room!","Opening up the gaps. Three seconds. Like the internet says.","Spreading out. If I'd wanted to be this close to Dave I'd have carpooled with him."],
  hold:["Holding! Hazards on. Like professionals.","Everybody stop. Nobody move. Nobody honk.","Holding here. I'll do my stretches."],
  go:["And we're rolling.","Moving! Mirror, signal, manoeuvre!","Go go go. Gently."],
  bump:[[['rick',"Doug, you're tailgating."],['doug',"I'm DRAFTING."]],[['dave',"Somebody just kissed my bumper."],['gary',"It was affectionate."]],[['rick',"Gaps! Gaps, people!"],['doug',"The gap was there! Then it wasn't!"]]],
  playerBump:["You just backed into your own convoy. That's a first. For the convoy.","Hey! We're on your SIDE.","That was me. You hit me. I'm the van behind you. Hi."],
  fast:["Convoy pace! This is a warm-up lap, not a breakaway!","We're minivans! We go one speed! Medium!","You're losing us. I can see your brake lights. Barely. Like a star."],
  kerb:["Did you just hit the kerb? With the whole convoy watching?","Everybody behind you just hit that too. Thanks."],
  lag:n=>[n,"I've lost you. I'm pulling over by a hydrant with my hazards on. Come and get me. That's the rule."],
  back:n=>[n,"There you are! I waved at three wrong minivans."],
  stuckRed:n=>[n,"Red light. I'm stopping. I have a family. Well, I have somebody else's family's van."],
  yellowFollow:[['doug',"It was yellow when I went in."],['rick',"It was red, Doug."],['doug',"It was PINK."]],
  ranRed:["That was red. I saw it. Everyone saw it. The light saw it.","Running reds with five minivans behind you. Bold. Very bold.","You ran the red. We didn't. We're back here. Being legal."],
  yellowSplit:["Okay, he made it, we didn't. We'll catch up. Don't go anywhere.","Split by a yellow. Classic. Like a family at a theme park."],
  idle:[[['dave',"This is nice. Five minivans. Nobody's arguing about the radio."],['gary',"I'd like to argue about the radio."]],
    [['earl',"Signal, check your mirror, ease out. Thirty-six years. Never once honked."],['doug',"Never ONCE?"],['earl',"Once. A goose."]],
    [['doug',"Do you think the vans know they're going home?"],['rick',"Eyes on the road, Doug."]]],
  pursuit:[['doug',"Grey sedan behind us. Coming up fast. He is not commuting."],['rick',"He wants the back van. Press 4, I'll take the lead, and you get between him and the line."]],
  pursuitLead:[['rick',"You're out front. He's at the back. Press 4: I take the lead, you drop back and sweep."]],
  thief:[['Thief',"Why are there five minivans?"],['Thief 2',"It's a coordinated minivan attack, Dante!"]],
  tapped:n=>[n,pick(["He tapped me! He TAPPED me!","He's on my bumper! He's ON my bumper!","That's going to need a touch-up pen."])],
  blocking:["That's it! Stay in his lane!","You're a wall! A minivan-shaped wall!","He can't get past you. Look at him. He's furious. Wave!"],
  brakeCheck:[['dave',"He brake-checked a thief! In a MINIVAN!"]],
  rammed:["That's... that's legally a hug.","Easy! Easy. We're the good guys. The good guys use the side mirrors."],
  shaken:[['Thief',"Forget it! Forget it. It's like fighting a cul-de-sac."],['rick',"He's gone. Nobody follows five dads home."]],
  noDeliver:[['rick',"Not with him on our tail. We don't lead a thief to a family's driveway. Lose him round the block."]],
  takeLead:[['rick',"Taking the lead! Ease off and pull aside, let us by, and keep him off our back bumper!"]],
  backLead:[['rick',"You're back on point. Follow the van with the good driver, everybody. That's him. Apparently."]],
  needAhead:[['rick',"Get out in front of me first. Then I'll hand it back."]],
  peel:(n,f)=>[n,pick(["That's me. The "+f+"' driveway. Peeling off. Signalling. Like a gentleman.","Here's mine. Turning in. Nobody follow me, that'd be weird.","The "+f+"'. Home sweet somebody else's home."])],
  famGood:["Not a scratch! Is that... did you VACUUM?","It's back! It's actually back! And it's clean!","Look at it. Shining. I'm going to cry on the hubcap."],
  famOk:["A few dents. Honestly? Some of those were mine.","It's got a couple of new dimples. It's fine. Character.","Is that a new scrape? You know what, it's back. I'll take it."],
  famBad:["It's... smoking a little. That's fine. It's Saturday. Everything smokes on a Saturday.","Oh. Oh, it's had a day. Haven't we all.","It's home. That's what matters. That and the smoke."],
  kid:["The van's back! It smells like goldfish!","Is the tournament still on? IS IT STILL ON?","Dad! The bees are back!"],
  marcy:[['Marcy',"11:58. You are all getting orange slices."],['rick',"Bring it in, everybody. Good hustle. Good hustle."]],
  clock5:[['Marcy',"It's 11:55. The referee is stretching. Referees don't stretch unless they mean it."]],
  clock2:[['Marcy',"Two minutes. I am standing at the field holding a clipboard and a whistle I'm not allowed to use."]],
  failNoon:"12:00. The Hornets forfeit. Marcy has added a column to the spreadsheet. It's red.",
  failCar:"Your van's done. The convoy has nobody to follow. They're just... idling. Sadly.",
  failWreck:"Two vans wrecked. The carpool is now a walkpool.",
  wrecked:n=>[n,"I'm out. She's done. She's resting. I'm going to sit on the kerb and think about my choices."],
  noGuns:"Rick: Nobody's shooting out of a carpool van. Drive."};

/* ---------------- resources (disposed when the job ends, even on a replay or a retry) ---------------- */
let RES=null;const res=()=>RES||(RES={geo:[],mat:[],tex:[],veh:[],dom:[],ov:[],fx:[],listeners:[]});
const G_=g=>{res().geo.push(g);return g},M_=m=>{res().mat.push(m);return m},T_=t=>{res().tex.push(t);return t};
function freeAll(){const R=RES;RES=null;if(!R)return;const a=A();
  for(const o of R.ov)try{a&&a.overlay&&a.overlay(o,null)}catch(_){}
  for(const h of R.fx)try{h&&h.remove&&h.remove()}catch(_){}
  for(const g of R.geo)try{g.dispose()}catch(_){}for(const m of R.mat)try{m.dispose()}catch(_){}for(const t of R.tex)try{t.dispose()}catch(_){}
  for(const v of R.veh)try{v.userData&&v.userData.dispose&&v.userData.dispose()}catch(_){}
  for(const[t,ev,fn,c]of R.listeners)try{t.removeEventListener(ev,fn,c)}catch(_){}
  for(const e of R.dom)try{e.remove()}catch(_){}
  try{const b=window.HT&&HT.OpenWorld&&HT.OpenWorld.prop&&HT.OpenWorld.prop('parkride.barrier');if(b)b.rotation.x=-1.32}catch(_){}}
function listen(t,ev,fn,c){t.addEventListener(ev,fn,c);res().listeners.push([t,ev,fn,c])}
const T3=()=>A().THREE;
const std=(c,o)=>M_(new (T3().MeshStandardMaterial)(Object.assign({color:A().lin?A().lin(c):c,roughness:.6,metalness:0},o||{})));
function canvasTex(w,h,f){const T=T3(),c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);if(T.sRGBEncoding)t.encoding=T.sRGBEncoding;t.anisotropy=4;return T_(t)}
function mesh(g,m,x,y,z,parent,rx,ry,rz){const o=new (T3().Mesh)(g,m);o.position.set(x||0,y||0,z||0);if(rx||ry||rz)o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=true;o.receiveShadow=true;if(parent)parent.add(o);return o}
let GEO=null;const geo=()=>GEO&&RES&&RES.geo.includes(GEO.box)?GEO:(GEO={box:G_(new (T3().BoxGeometry)(1,1,1)),cyl:G_(new (T3().CylinderGeometry)(1,1,1,14)),plane:G_(new (T3().PlaneGeometry)(1,1))});
function bx(m,w,h,d,x,y,z,parent){const o=mesh(geo().box,m,x,y,z,parent);o.scale.set(w,h,d);return o}
function cyl(m,r,h,x,y,z,parent,rx,rz){const o=mesh(geo().cyl,m,x,y,z,parent,rx||0,0,rz||0);o.scale.set(r,h,r);return o}
function decal(m,w,h,x,y,z,parent,ry,rx){const o=mesh(geo().plane,m,x,y,z,parent,rx||0,ry||0,0);o.scale.set(w,h,1);o.castShadow=false;o.receiveShadow=false;return o}

/* ---------------- the sticker atlas: one canvas, every decal on the fleet ---------------- */
const ATL={};/* name -> [u0,v0,u1,v1] */
function atlas(){const R=res();if(R.atlas)return R.atlas;const W=1024,Hh=1024;const regs=[];let cx=0,cy=0,rowH=0;
  const put=(name,w,h,draw)=>{if(cx+w>W){cx=0;cy+=rowH;rowH=0}regs.push({name,x:cx,y:cy,w,h,draw});ATL[name]=[cx/W,1-(cy+h)/Hh,(cx+w)/W,1-cy/Hh];cx+=w;rowH=Math.max(rowH,h)};
  const rr=(g,x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()};
  const bee=(g,x,y,s)=>{g.save();g.translate(x,y);g.scale(s,s);g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.ellipse(-10,-16,12,8,-.5,0,6.3);g.ellipse(10,-16,12,8,.5,0,6.3);g.fill();
    g.fillStyle='#f6c21a';g.beginPath();g.ellipse(0,0,20,14,0,0,6.3);g.fill();g.fillStyle='#161616';for(const k of[-8,2,11])g.fillRect(k-2.5,-13,5,26);g.beginPath();g.arc(-22,0,7,0,6.3);g.fill();g.restore()};
  put('hornets',256,256,(g,x,y)=>{g.fillStyle='#f6c21a';g.beginPath();g.arc(x+128,y+128,124,0,6.3);g.fill();g.fillStyle='#151515';g.beginPath();g.arc(x+128,y+128,110,0,6.3);g.fill();
    g.fillStyle='#ffffff';g.beginPath();g.arc(x+128,y+150,46,0,6.3);g.fill();g.fillStyle='#151515';for(const[a,b]of[[0,0],[-26,-16],[26,-16],[-18,24],[18,24]]){g.beginPath();g.arc(x+128+a,y+150+b,10,0,6.3);g.fill()}
    bee(g,x+128,y+82,1.6);g.fillStyle='#f6c21a';g.font='bold 30px Arial';g.textAlign='center';g.fillText('HORNETS',x+128,y+222)});
  put('lions',256,256,(g,x,y)=>{g.fillStyle='#e8742a';g.beginPath();g.arc(x+128,y+128,124,0,6.3);g.fill();g.fillStyle='#fff3dc';g.beginPath();g.arc(x+128,y+118,64,0,6.3);g.fill();
    g.fillStyle='#e8742a';g.font='bold 92px Arial';g.textAlign='center';g.fillText('L',x+128,y+150);g.fillStyle='#fff';g.font='bold 30px Arial';g.fillText('LINDEN LIONS',x+128,y+222)});
  put('tag',128,256,(g,x,y)=>{g.fillStyle='#f6c21a';rr(g,x+8,y+20,112,228,18);g.fill();g.fillStyle='#151515';g.fillRect(x+8,y+120,112,30);g.fillStyle='#f6c21a';g.font='bold 22px Arial';g.textAlign='center';g.fillText('CARPOOL',x+64,y+142);
    bee(g,x+64,y+76,1.3);g.fillStyle='#151515';g.font='bold 20px Arial';g.fillText('HORNETS',x+64,y+186);g.fillText('MAPLE HTS',x+64,y+212);g.fillStyle='#ddd';g.beginPath();g.arc(x+64,y+34,9,0,6.3);g.fill()});
  const sticker=(name,bg,fg,lines,font)=>put(name,512,128,(g,x,y)=>{g.fillStyle=bg;rr(g,x+4,y+8,504,112,16);g.fill();g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';
    if(lines.length===1){g.font='bold '+(font||46)+'px Arial';g.fillText(lines[0],x+256,y+66)}else{g.font='bold '+(font||38)+'px Arial';g.fillText(lines[0],x+256,y+44);g.font='bold 30px Arial';g.fillText(lines[1],x+256,y+90)}});
  sticker('honor','#1d4f91','#ffffff',['MY KID IS ON THE','HONOR ROLL']);
  sticker('soccerdad','#f6c21a','#151515',['PROUD SOCCER DAD']);
  sticker('okayest','#ffffff','#b8231e',["WORLD'S OKAYEST DRIVER"],40);
  sticker('honk','#2f8f5a','#ffffff',['HONK IF YOU LOVE','POTATO SALAD']);
  sticker('marathon','#ffffff','#151515',['0.0  ·  I DON\'T RUN'],44);
  sticker('lanyard','#cfd8e3','#1d2c4f',['COMMUTER OF THE MONTH'],38);
  put('baby',256,256,(g,x,y)=>{g.save();g.translate(x+128,y+128);g.rotate(Math.PI/4);g.fillStyle='#f6c21a';g.fillRect(-84,-84,168,168);g.strokeStyle='#151515';g.lineWidth=8;g.strokeRect(-78,-78,156,156);g.restore();
    g.fillStyle='#151515';g.font='bold 30px Arial';g.textAlign='center';g.fillText('BABY',x+128,y+112);g.fillText('ON',x+128,y+142);g.fillText('BOARD',x+128,y+172);
    g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=3;g.beginPath();g.moveTo(x+70,y+60);g.lineTo(x+120,y+120);g.lineTo(x+108,y+150);g.lineTo(x+170,y+200);g.moveTo(x+120,y+120);g.lineTo(x+175,y+108);g.stroke()});
  put('family',512,160,(g,x,y)=>{g.strokeStyle='#ffffff';g.fillStyle='#ffffff';g.lineCap='round';g.lineWidth=7;const fig=(cx,h,dress)=>{const top=y+150-h;g.beginPath();g.arc(cx,top+h*.12,h*.11,0,6.3);g.fill();
      if(dress){g.beginPath();g.moveTo(cx,top+h*.24);g.lineTo(cx-h*.16,top+h*.66);g.lineTo(cx+h*.16,top+h*.66);g.closePath();g.fill()}else{g.beginPath();g.moveTo(cx,top+h*.24);g.lineTo(cx,top+h*.62);g.stroke()}
      g.beginPath();g.moveTo(cx-h*.2,top+h*.4);g.lineTo(cx+h*.2,top+h*.4);g.moveTo(cx,top+h*.6);g.lineTo(cx-h*.12,y+150);g.moveTo(cx,top+h*.6);g.lineTo(cx+h*.12,y+150);g.stroke()};
    fig(x+60,128,false);fig(x+140,118,true);fig(x+215,84,false);fig(x+280,70,true);fig(x+340,58,false);
    g.beginPath();g.ellipse(x+430,y+128,36,16,0,0,6.3);g.fill();g.beginPath();g.arc(x+468,y+112,12,0,6.3);g.fill();g.lineWidth=6;g.beginPath();g.moveTo(x+400,y+136);g.lineTo(x+400,y+152);g.moveTo(x+455,y+136);g.lineTo(x+455,y+152);g.moveTo(x+396,y+122);g.lineTo(x+380,y+108);g.stroke();
    g.fillStyle='#ff6fa8';g.beginPath();g.moveTo(x+470,y+98);g.lineTo(x+484,y+90);g.lineTo(x+484,y+106);g.closePath();g.fill()});
  put('magnet',256,128,(g,x,y)=>{g.fillStyle='#151515';rr(g,x+4,y+6,248,116,30);g.fill();g.fillStyle='#f6c21a';g.font='bold 34px Arial';g.textAlign='center';g.fillText('HORNETS',x+150,y+56);g.font='bold 52px Arial';g.fillText('#7',x+150,y+108);bee(g,x+52,y+64,1.1)});
  put('plate',256,128,(g,x,y)=>{g.fillStyle='#f6f6f0';g.fillRect(x,y,256,128);g.strokeStyle='#22314d';g.lineWidth=6;g.strokeRect(x+4,y+4,248,120);g.fillStyle='#1d2c4f';g.font='bold 22px Arial';g.textAlign='center';g.fillText('MAPLE HEIGHTS',x+128,y+30);g.font='bold 58px Arial';g.fillText('SOCR MOM',x+128,y+96)});
  const c=document.createElement('canvas');c.width=W;c.height=Hh;const g=c.getContext('2d');g.clearRect(0,0,W,Hh);for(const r of regs){g.save();r.draw(g,r.x,r.y);g.restore()}
  const T=T3(),t=new T.CanvasTexture(c);if(T.sRGBEncoding)t.encoding=T.sRGBEncoding;t.anisotropy=8;T_(t);
  R.atlas={tex:t,mat:M_(new T.MeshStandardMaterial({map:t,transparent:true,alphaTest:.35,roughness:.45,metalness:0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:T.DoubleSide}))};return R.atlas}
const atlasGeoCache={};function stickerGeo(name){if(atlasGeoCache[name]&&RES&&RES.geo.includes(atlasGeoCache[name]))return atlasGeoCache[name];const T=T3(),g=new T.PlaneGeometry(1,1),u=ATL[name],uv=g.attributes.uv;
  for(let i=0;i<uv.count;i++){uv.setXY(i,uv.getX(i)?u[2]:u[0],uv.getY(i)?u[3]:u[1])}uv.needsUpdate=true;return atlasGeoCache[name]=G_(g)}
function sticker(name,w,h,x,y,z,parent,ry,rx){atlas();const o=new (T3().Mesh)(stickerGeo(name),RES.atlas.mat);o.position.set(x,y,z);o.rotation.set(rx||0,ry||0,0,'YXZ');o.scale.set(w,h,1);parent.add(o);return o}

/* ---------------- the fleet: hero minivans with their families all over them (local frame: front +X, up +Y, driver's side -Z) ---------------- */
function vanModel(f){const a=A(),obj=a.makeVehicle('minivan',f.col,Object.assign({lod:0},f.up))||a.makeVanBox(f.col);a.wmAdd(obj);if(obj.userData&&obj.userData.dispose)res().veh.push(obj);
  const S=obj.userData&&obj.userData.size&&obj.userData.size.l?obj.userData.size:{l:4.4,w:2,h:1.8},hl=S.l/2,hw=S.w/2,g=new (T3().Group)();g.name='roundupDecor';obj.add(g);
  const ry=Math.PI/2;/* a decal facing +X (the front) */
  /* the Hornets hang tag on the mirror and the bee sticker low in the windshield's passenger corner: what you're looking for */
  sticker('tag',.075,.15,hl-1.32,1.36,0,g,ry);sticker('hornets',.17,.17,hl-1.05,1.08,.5,g,ry,-.95);
  /* the back: plate and the family's own stickers */
  sticker('plate',.36,.18,-hl-.005,.66,0,g,-ry);
  const backS=(n,z,y,w)=>sticker(n,w||.42,(w||.42)/4,-hl+.02,y||.58,z,g,-ry);
  if(f.decor==='roofbox'){backS('honor',-.42);backS('honk',.42)}
  else if(f.decor==='boosters'){backS('marathon',.4);const bm=std('#2a2f38',{roughness:.8}),bb=std('#d23b3b',{roughness:.7});
    for(const[x,z,m]of[[-.35,-.42,bm],[-.35,.42,bb],[-1.15,-.42,bb],[-1.15,.42,bm]]){bx(m,.42,.16,.42,x,.7,z,g);bx(m,.42,.36,.08,x-.2,.86,z,g)}}
  else if(f.decor==='stickfam'){sticker('family',.78,.24,-hl+.28,1.1,0,g,-ry,.32);backS('soccerdad',.42);sticker('magnet',.42,.21,0,.78,hw+.012,g,0)}
  else if(f.decor==='noodles'){sticker('baby',.3,.3,-hl+.32,1.12,-.42,g,-ry,.32);backS('okayest',.42,.58,.46);
    const cols=['#ff5fa8','#3fd0e6','#b7f04a'],T=T3();for(let i=0;i<3;i++){const n=mesh(G_(new T.CylinderGeometry(.045,.045,2.3,10)),std(cols[i],{roughness:.85}),-.15,S.h+.07,-.22+i*.22,g,0,0,Math.PI/2);n.castShadow=true}
    bx(std('#1b1d20',{roughness:.6}),.02,.03,.8,.55,S.h+.07,0,g);bx(std('#1b1d20',{roughness:.6}),.02,.03,.8,-.85,S.h+.07,0,g)}
  else if(f.decor==='bikerack'){backS('okayest',.42,.58,.44);const steel=std('#2a2c2e',{roughness:.5,metalness:.6}),fr=std('#2fa8d8',{roughness:.4,metalness:.3}),T=T3();
    bx(steel,.5,.05,.05,-hl-.22,.55,0,g);bx(steel,.05,.5,.05,-hl-.45,.78,0,g);bx(steel,.05,.05,1.2,-hl-.45,1.0,0,g);
    const wg=G_(new T.TorusGeometry(.2,.03,8,18));for(const z of[-.38,.38]){const w=mesh(wg,steel,-hl-.52,.82,z,g,0,0,0)}
    bx(fr,.04,.04,.76,-hl-.52,1.0,0,g);bx(fr,.04,.3,.04,-hl-.52,.9,-.12,g);for(const s of[-1,1])bx(std(s>0?'#ff5fa8':'#ffe14a'),.01,.3,.01,-hl-.52,.95,-.4+s*.03,g)}
  return{obj,S}}
/* the line's indicators: amber blinkers on the four corners, driven by HT.Convoy's signal; hazards via the model's own channel */
function blinkers(v){const T=T3(),R=res(),m=R.blinkOn||(R.blinkOn=M_(new T.MeshBasicMaterial({color:new T.Color(3,1.6,.2),toneMapped:false})));const g=new T.Group();
  const hl=v.S.l/2,hw=v.S.w/2,mk=(x,z)=>{const o=new T.Mesh(geo().box,m);o.scale.set(.06,.07,.12);o.position.set(x,.78,z);o.visible=false;g.add(o);return o};
  v.blink={L:[mk(hl-.03,-hw+.18),mk(-hl+.03,-hw+.18)],R:[mk(hl-.03,hw-.18),mk(-hl+.03,hw-.18)]};v.obj.add(g)}
/* decoy commuter cars (light LOD models, like parked traffic) */
function lightCar(type,color){const VM=window.HT&&HT.Vehicles;if(!VM||!VM.make)return null;try{const v=VM.make(type,{color,lod:1});if(!v)return null;v.userData.mod=true;v.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.userData.noBatch=true}});return v}catch(_){return null}}

/* ---------------- people ---------------- */
function person(key,look,x,z,ry){const a=A(),PP=window.HT&&HT.People;let d=null;if(PP&&PP.ok&&PP.has&&PP.has(key)){try{d=PP.make(key,{})}catch(_){d=null}}
  if(!d)return null;d.root.position.set(x,a.groundAt(x,z),z);d.root.rotation.y=ry||0;a.wmAdd(d.root);return d}
const ready=key=>{const PP=window.HT&&HT.People;return!!(PP&&PP.ok&&PP.has&&PP.has(key))};
function pose(d,dt,o){const PP=window.HT&&HT.People;if(d&&d.rb&&PP&&PP.pose)try{PP.pose(d,dt,o||{moving:false,aim:false,mode:'stand'})}catch(_){}}
function wave(d){const PP=window.HT&&HT.People;if(d&&d.rb&&PP&&PP.interact)try{PP.interact(d)}catch(_){}}
function walkTo(d,t,sp,dt){const a=A(),r=d.root.position,dx=t.x-r.x,dz=t.z-r.z,l=hyp(dx,dz);if(l<.15){pose(d,dt);return true}const s=Math.min(l,sp*dt);r.x+=dx/l*s;r.z+=dz/l*s;r.y=a.groundAt(r.x,r.z);
  d.root.rotation.y=Math.atan2(dx,dz);pose(d,dt,{moving:true,speed:sp>2.2?1.4:1,aim:false,mode:'stand'});return false}
function faceTo(d,x,z,dt){const r=d.root,w=Math.atan2(x-r.position.x,z-r.position.z);r.rotation.y+=wrap(w-r.rotation.y)*Math.min(1,(dt||1)*5)}
const SEAT=[.45,.78,-.42];
function seat(d,c,dt){if(!d)return;const a=A(),f=fwd(c.yaw),r=rgt(c.yaw),sc=d.root.scale.y||1;d.root.position.set(c.x+f[0]*SEAT[0]+r[0]*SEAT[2],a.groundAt(c.x,c.z)+SEAT[1]-.59*sc,c.z+f[1]*SEAT[0]+r[1]*SEAT[2]);
  d.root.rotation.set(0,c.yaw+Math.PI,0);pose(d,dt,{mode:'sit',aim:false,moving:false})}
function castKeys(){return['dad_rick','dad_dave','dad_gary','dad_doug','earl','nb_office',...new Set(FLEET.flatMap(f=>f.people))]}
function preloadCast(){const PP=window.HT&&HT.People;if(!PP||!PP.preload||!PP.keys)return null;try{const k=castKeys().filter(k=>PP.keys.includes(k)&&!(PP.has&&PP.has(k)));if(k.length)return PP.preload(k).catch(()=>{})}catch(_){}return null}

/* ---------------- sound ---------------- */
function tone(o){const Au=window.HT&&HT.Audio;if(Au&&Au.tone)try{Au.tone(o)}catch(_){}}
function music(st,i){const Au=window.HT&&HT.Audio;if(!Au||!Au.music)return;try{Au.music(st,i!=null?{intensity:i}:{})}catch(_){}}
const sfx={click:()=>tone({f:1400,to:900,type:'square',d:.04,gain:.04}),spark:()=>{tone({f:2400,to:300,type:'sawtooth',d:.18,gain:.07});tone({f:90,to:60,type:'square',d:.12,gain:.05,at:.02})},
  start:()=>{tone({f:70,to:110,type:'sawtooth',d:.35,gain:.06});tone({f:110,to:80,type:'sawtooth',d:.5,gain:.05,at:.3});tone({f:58,to:62,type:'triangle',d:.9,gain:.05,at:.7})},
  tick:on=>tone({f:on?1150:820,type:'square',d:.025,gain:.022,bus:'ui'}),thud:v=>tone({f:120,to:55,type:'square',d:.16,gain:Math.min(.12,.03+v*.012)}),
  order:()=>{tone({f:660,type:'triangle',d:.08,gain:.05,bus:'ui'});tone({f:990,type:'triangle',d:.1,gain:.045,at:.07,bus:'ui'})},
  barrier:()=>tone({f:220,to:330,type:'triangle',d:.5,gain:.05}),horn:()=>{tone({f:392,type:'sawtooth',d:.3,gain:.05});tone({f:494,type:'sawtooth',d:.3,gain:.04})},
  cheer:()=>{for(let i=0;i<4;i++)tone({f:520+i*130,type:'triangle',d:.12,gain:.04,at:i*.07,bus:'ui'})}};

/* ---------------- talk: a paced queue (never blocks play; dt only) ---------------- */
function say(M,who,text,front){if(!text)return;const q=M.q||(M.q=[]);if(front)q.unshift([who,text]);else q.push([who,text]);if(q.length>6)q.length=6}
function seq(M,lines,front){if(front)for(let i=lines.length-1;i>=0;i--)say(M,lines[i][0],lines[i][1],true);else for(const l of lines)say(M,l[0],l[1])}
function lineTick(M,dt){M.qT=Math.max(0,(M.qT||0)-dt);if(M.qT>0||!M.q||!M.q.length)return;const[w,t]=M.q.shift();A().radio(w,t);M.qT=Math.min(4.6,1.4+t.length*.045)}
function once(M,k){if(M.said[k])return false;M.said[k]=1;return true}
function cool(M,k,s){const c=M.cool||(M.cool={});if((c[k]||-99)>M.t-s)return false;c[k]=M.t;return true}

/* ================= the job ================= */
J.register(ID,{
  def:{giver:'rick',hood:'maple',title:'Minivan Roundup',role:'Coach Rick · Maple Heights Hornets',place:'Route 9 Park & Ride',
    lines:L.brief,obj:"Get past the lot attendant, find and hot-wire the five Hornets carpool vans, then lead them home to their driveways in convoy before noon.",
    crew:['rick','dave','gary','doug'],weapons:['pistol','beanbag'],from:{place:'g_rick'},start:{x:RING.x,z:RING.z},site:'parkride',
    unlock:{done:['brake']},pay:K.pay,par:K.par,winTrust:0,roam:true,stay:true,order:24,
    stages:['gate','lot','convoy','home'],stageLabels:{gate:'The attendant',lot:'The lot',convoy:'Convoy out',home:'The driveways'},failPolicy:'escalate',
    medals:['Finished','All five vans home','All five home and nobody saw us (no alarm)'],
    radio:[['rick',"Barrier's down and there's a fella in a vest. Let's see how this goes."]],
    endLine:"Five vans, five driveways, and a tournament that started on time. Marcy has updated the spreadsheet. It has a new column now. It's called 'Dads'."},

  start(M,o){const a=A();freeAll();M.t=0;M.clock=0;M.said={};M.cool={};M.q=[];M.qT=0;M.ph='gate';M.scam=null;M.alarm=false;M.fee=false;M.feeBack=false;M.ties=0;M.alumni=false;
    M.found={};M.started={};M.cleared={};M.delivered={};M.wrecked={};M.cond={};M.orders=0;M.shake=0;M.pursuit=null;M.shook=false;M.light={st:'g',t:0,forced:false};M.cross=[];M.score=0;
    M.noGuns=false;M.blocks=0;M.brakeChecks=0;M.ranRed=0;M.barrierBroken=false;M.wrapT=-1;M.chat=12;M.fam={};M.held=null;M.vid=0;
    a.wmSetWindow(a.wmWindow(266,70,18));
    try{const O=H().ow;if(O&&O.traffic)O.traffic(0,{player:a.P.pos,car:null,camera:a.camera,off:true})}catch(_){}/* the job runs its own traffic */
    preloadCast();
    build(M);
    if(o&&o.checkpoint)return;
    /* parked properly at the barrier, nose to the gate */
    const e=M.car;if(e&&hyp(e.pos.x-RING.x,e.pos.z-RING.z)<14){e.pos.set(VAN_AT.x,0,VAN_AT.z);e.yaw=VAN_AT.yaw;a.owStopCar(e);a.syncCar(e);if(a.CV===e)a.P.yaw=e.yaw}
    gateBegin(M);music('tension',.25)},

  upd(dt,M,F){const a=A();if(!M.built){build(M);if(!M.built){F.objs.push(['Rick is counting minivans...',false]);return}}
    if(M.loadS){applyLoad(M,M.loadS);M.loadS=null}
    M.t+=dt;M.clock+=dt;lineTick(M,dt);M.inCar=!!a.CV;
    const left=K.clock-M.clock;
    if(left<=0){const n=Object.keys(M.delivered).length;if(n>=K.minVans){if(M.wrapT<0)wrapBegin(M)}else return a.endMission(false,L.failNoon,'Noon.')}
    if(left<300&&once(M,'c5'))seq(M,L.clock5);if(left<120&&once(M,'c2'))seq(M,L.clock2);
    const me=M.car;if(me&&a.carHp&&a.carHp(me)<=0)return a.endMission(false,L.failCar,'Broken down.');
    if(Object.keys(M.wrecked).length>=K.wreckFail)return a.endMission(false,L.failWreck,'Two vans down.');
    barrierTick(M,dt);vansVisual(M,dt);blockersTick(M,dt);
    if(M.ph==='gate')gateTick(M,dt,F);
    if(M.ph==='lot')lotTick(M,dt,F);
    if(M.ph==='convoy'||M.ph==='home'||M.ph==='wrap')convoyTick(M,dt,F);
    lightTick(M,dt);crossTick(M,dt);familiesTick(M,dt);
    if(M.ph==='wrap')wrapTick(M,dt,F);
    hudTick(M,dt,F,left)},

  save(M){return{ph:M.ph==='wrap'?'home':M.ph,scam:M.scam,alarm:M.alarm,fee:M.fee,feeBack:M.feeBack,alumni:M.alumni,ties:M.ties,clock:Math.round(M.clock*10)/10,
    found:Object.keys(M.found),started:Object.keys(M.started),cleared:Object.keys(M.cleared),delivered:Object.keys(M.delivered),wrecked:Object.keys(M.wrecked),
    cond:Object.assign({},M.cond),shook:M.shook,barrier:M.barrierOpen?1:0,broken:M.barrierBroken?1:0,orders:M.orders,
    conv:M.C&&(M.ph==='convoy'||M.ph==='home'||M.ph==='wrap')?M.C.save():null}},
  load(M,s){if(!s)return;if(M.built)applyLoad(M,s);else M.loadS=s},

  payout(M,ok){if(!ok)return[];const n=Object.keys(M.delivered).length,out=[['Vans home ×'+n,K.perVan*n]];
    if(n===5&&FLEET.every(f=>(M.cond[f.id]||0)>=K.hubcapFrac))out.push(['Every van, every hubcap',K.hubcaps]);
    if(M.fee)out.push(M.feeBack?["Gary's emergency envelope (recovered from the booth)",0]:['"Release fee" (it was a scam)',-K.fee]);
    if(!M.alarm)out.push(['Nobody saw us',0]);if(M.alumni)out.push(["Coach Rick's alumni",0]);
    return out},
  medal(M){const n=Object.keys(M.delivered).length;return n<5?1:M.alarm?2:3},
  end(M,ok){if(!ok)return;const Sv=window.HT&&HT.Save;try{for(const f of FLEET)if(M.delivered[f.id]&&Sv&&Sv.household)Sv.household(null,'carpool_'+f.id)}catch(_){}
    try{const s=A().SV();if(s&&s.flags)s.flags.carpoolFleet=Object.keys(M.delivered).length}catch(_){}},

  vehicle(car,dt){const M=A().M;if(!M||M.def.id!==ID||M.state!=='go')return;playerContacts(M,car,dt)},
  hud(state){const M=A().M;if(!M||M.def.id!==ID||M.state!=='go')return;panelTick(M)},

  test:{give(a){const h=window.__ht,s=a.SV();for(const id of['gary','rick','dave','doug','earl','dee','rosa','benny','brake']){const i=a.MISSIONS.findIndex(m=>m.id===id);if(i>=0&&h&&h.prog)h.prog.done[i]=true;if(s&&window.HT.Save&&HT.Save.jobRec)HT.Save.jobRec(s,id).done=true}
      return preloadCast()},
    step:(a,t,o)=>bot(a,t,o||{}),
    sample:()=>({ph:'convoy',scam:'coach',alarm:false,fee:false,feeBack:false,alumni:true,ties:1,clock:241.5,found:['hen','pat','ngu','kow','gar'],started:['hen','pat','ngu','kow','gar'],cleared:['pat','kow'],
      delivered:[],wrecked:[],cond:{},shook:false,barrier:1,broken:0,orders:2,conv:{gap:'normal',holding:false,head:null,cars:[{id:'hen',st:'line',x:240,z:64,yaw:1.57,hp:100}]}}),
    cpNode:false}
});

/* ================= building the lot ================= */
function build(M){const a=A(),W=a.WORLD;if(!CVY()||!W||!W.sites||!W.sites.parkride||!a.THREE)return false;if(M.built)return true;
  const T=T3(),site=W.sites.parkride;M.site=site;
  /* the barrier: closed, with a collider across the gate while it is */
  M.barrierCol=a.wmCol({x0:258.7,z0:61.9,x1:259.5,z1:66.1});M.barrierOpen=false;M.barrierK=0;
  /* five fleet vans */
  M.vans={};for(const f of FLEET){const m=vanModel(f);blinkers(m);const b=f.bay,CA=a.CarAI();const c=CA.make('minivan',{x:b.x,z:b.z,yaw:b.yaw});c.len=m.S.l;
    const v={f,obj:m.obj,S:m.S,blink:m.blink,c,col:a.wmCol({x0:-1e4,z0:-1e4,x1:-1e4+1,z1:-1e4+1}),drv:null,crew:null,st:'bay',hpMax:c.stats.hp,haz:false,glow:null,front:null};
    M.vans[f.id]=v;syncVan(v,0)}
  /* the hatchbacks boxing two of them in */
  M.blk={};for(const f of FLEET){if(!f.boxed)continue;const b=f.boxed,obj=a.makeVehicle('hatch',b.col)||a.makeVanBox(b.col);a.wmAdd(obj);if(obj.userData&&obj.userData.dispose)res().veh.push(obj);
    const CA=a.CarAI(),c=CA.make('hatch',{x:b.x,z:b.z,yaw:b.yaw});const k={f,obj,c,x0:b.x,z0:b.z,col:a.wmCol({x0:-1e4,z0:-1e4,x1:-1e4+1,z1:-1e4+1}),hooked:false,done:false,moved:0};M.blk[f.id]=k;syncBlk(k)}
  /* commuter decoys in the other bays (a few silver minivans, some with the wrong sticker), with colliders */
  const fleetBays=new Set(FLEET.map(f=>f.bay.x.toFixed(2)+','+f.bay.z.toFixed(2)));const types=['minivan','sedan','minivan','hatch','suv','minivan','sedan','pickup'],cols=['#b9c0c7','#c9ccd0','#8a2f2a','#2e4a6b','#d8d4c8','#a7aeb5','#3d4a3a','#6d7378'];
  M.decoys=[];let k=0;for(const b of site.bays){if(fleetBays.has(b.x.toFixed(2)+','+b.z.toFixed(2)))continue;if(b.i===4||b.i===13||b.i===22){k++;continue}/* a few empty bays */
    const type=types[k%types.length],col=cols[(k*3)%cols.length],obj=lightCar(type,col);k++;if(!obj)continue;a.wmAdd(obj);res().veh.push(obj);
    const yaw=b.yaw+(k%3===0?Math.PI:0);obj.position.set(b.x,a.groundAt(b.x,b.z),b.z);obj.rotation.set(0,yaw+Math.PI/2,0);
    const S=obj.userData.size||{l:4.4,w:2};a.wmCol({x0:b.x-S.w/2-.05,x1:b.x+S.w/2+.05,z0:b.z-S.l/2-.05,z1:b.z+S.l/2+.05,ph:1.5});
    const d={x:b.x,z:b.z,yaw,type,obj,lions:type==='minivan'&&k%4===2,said:false};if(d.lions){const f_=fwd(yaw);sticker('lions',.17,.17,S.l/2-1.05,1.08,.5,(()=>{const g=new T.Group();obj.add(g);return g})(),Math.PI/2,-.95)}
    M.decoys.push(d)}
  /* the signal at Route 9 & Maple */
  M.signal=signalModel();M.signal.position.set(LIGHT.pole.x,a.groundAt(LIGHT.pole.x,LIGHT.pole.z),LIGHT.pole.z);a.wmAdd(M.signal);a.wmCol({x0:LIGHT.pole.x-.2,x1:LIGHT.pole.x+.2,z0:LIGHT.pole.z-.2,z1:LIGHT.pole.z+.2});signalSet(M.signal,'g');
  /* convoy, stealth, people */
  M.LEAD={x:VAN_AT.x,z:VAN_AT.z,yaw:VAN_AT.yaw,spd:0,len:4.4,stats:null,hp:100};
  M.C=CVY().create({gap:'normal'});M.C.leader(M.LEAD);
  stealthBuild(M);
  M.built=true;return true}
function syncVan(v,dt){const a=A(),c=v.c,o=v.obj;o.position.set(c.x,a.groundAt(c.x,c.z),c.z);o.rotation.set(0,c.yaw+Math.PI/2,0);
  const hl=v.S.l/2+.05,hw=v.S.w/2+.05,s=Math.abs(Math.sin(c.yaw)),co=Math.abs(Math.cos(c.yaw)),hx=s*hl+co*hw,hz=co*hl+s*hw;
  const solid=v.st==='bay'||v.st==='home'||v.st==='out'||!A().CV;/* moving vans collide with your car through HT.Convoy (ram), not as walls */
  if(solid)Object.assign(v.col,{x0:c.x-hx,x1:c.x+hx,z0:c.z-hz,z1:c.z+hz,ph:1.5,ob:{x:c.x,z:c.z,fx:-Math.sin(c.yaw),fz:-Math.cos(c.yaw),hl:hl-.05,hw:hw-.05}});
  else{v.col.x0=v.col.z0=-1e4;v.col.x1=v.col.z1=-1e4+1;v.col.ob=null}
  const VM=window.HT&&HT.Vehicles;if(o.userData&&o.userData.mod&&VM&&VM.update&&dt)try{VM.update(o,{speed:c.spd,steer:c.steer||clamp((c.ai&&c.ai.turn)||0,-1,1),braking:v.brake,headlights:false,dt})}catch(_){}
  if(o.userData&&o.userData.setDamage)try{o.userData.setDamage(clamp(1-c.hp/v.hpMax,0,1)*.85)}catch(_){}}
function syncBlk(k){const a=A(),c=k.c;k.obj.position.set(c.x,a.groundAt(c.x,c.z),c.z);k.obj.rotation.set(0,c.yaw+Math.PI/2,0);
  const S=k.obj.userData.size||{l:3.9,w:1.8},hl=S.l/2+.05,hw=S.w/2+.05,s=Math.abs(Math.sin(c.yaw)),co=Math.abs(Math.cos(c.yaw));
  if(!A().CV)Object.assign(k.col,{x0:c.x-(s*hl+co*hw),x1:c.x+(s*hl+co*hw),z0:c.z-(co*hl+s*hw),z1:c.z+(co*hl+s*hw),ph:1.5,ob:{x:c.x,z:c.z,fx:-Math.sin(c.yaw),fz:-Math.cos(c.yaw),hl:hl-.05,hw:hw-.05}});
  else{k.col.x0=k.col.z0=-1e4;k.col.x1=k.col.z1=-1e4+1;k.col.ob=null}}
const vanFront=v=>{const f=fwd(v.c.yaw);return{x:v.c.x+f[0]*(v.S.l/2+.75),z:v.c.z+f[1]*(v.S.l/2+.75)}};
const vanDoor=v=>{const f=fwd(v.c.yaw),r=rgt(v.c.yaw);return{x:v.c.x+f[0]*.3-r[0]*1.45,z:v.c.z+f[1]*.3-r[1]*1.45}};

/* ---------------- the signal ---------------- */
function signalModel(){const a=A(),T=T3(),g=new T.Group();g.name='roundupSignal';const pole=std('#4b5450',{roughness:.5,metalness:.5}),head=std('#20262a',{roughness:.6});
  cyl(pole,.11,5.4,0,2.7,0,g);cyl(pole,.24,.25,0,.12,0,g);const arm=cyl(pole,.07,4.6,0,5.2,2.2,g,Math.PI/2,0);
  const lens=c=>M_(new T.MeshStandardMaterial({color:a.lin(c),emissive:a.lin(c),emissiveIntensity:0,roughness:.25}));const heads=[];
  for(const hz of[3.6,0]){const h=new T.Group();h.position.set(0,hz?4.55:3.2,hz||0);h.rotation.y=Math.PI/2;g.add(h);bx(head,.36,1.06,.3,0,0,0,h);bx(head,.5,1.22,.03,0,0,-.16,h);
    const Ls={r:lens('#ff3020'),y:lens('#ffb020'),g:lens('#30e070')};for(const[k,y]of[['r',.33],['y',0],['g',-.33]]){const c=mesh(G_(new T.CircleGeometry(.12,18)),Ls[k],0,y,.152,h);c.castShadow=false}heads.push(Ls)}
  g.userData={heads,state:''};return g}
function signalSet(sig,st){if(!sig||sig.userData.state===st)return;sig.userData.state=st;for(const L_ of sig.userData.heads){L_.r.emissiveIntensity=st==='r'?3.2:.04;L_.y.emissiveIntensity=st==='y'?3:.04;L_.g.emissiveIntensity=st==='g'?2.6:.04}}

/* ================= stealth: two guards walking the aisles, a lookout on a cooler (light stealth: escalate when seen) ================= */
function stealthBuild(M){const a=A(),Sx=SX();M.guards=[];if(!Sx){M.S=null;return}
  const S=M.S=Sx.create({night:false,diff:1});
  for(const d of M.decoys){const S_=d.obj.userData.size||{l:4.4,w:2};S.occluder({x0:d.x-S_.w/2,x1:d.x+S_.w/2,z0:d.z-S_.l/2,z1:d.z+S_.l/2,h:Math.min(1.7,S_.h||1.6)})}
  for(const id in M.vans){const v=M.vans[id];S.occluder({x0:v.c.x-1,x1:v.c.x+1,z0:v.c.z-2.2,z1:v.c.z+2.2,h:1.75})}
  S.occluder({x0:260.6,z0:57,x1:262.6,z1:59.6,h:2.6});
  for(const g of GUARDS){const p=g.path[0],e=a.spawnEnemy(p[0],p[1],false);e.noLeash=true;e.home={x:p[0],z:p[1]};e.hp=e.maxhp=70;e.dmgMul=.55;e.surrBias=.45;/* lightly armed, not paid enough */
    const gd={id:g.id,e,def:g,k:1,wait:0,pos:{x:p[0],z:p[1]},yaw:0,ob:null};gd.ob=S.addObserver({id:g.id,kind:'guard',pos:gd.pos,yaw:0});S.bindEnemy(e,g.id);M.guards.push(gd)}
  {const e=a.spawnEnemy(LOOKOUT.x,LOOKOUT.z,false);e.noLeash=true;e.home={x:LOOKOUT.x,z:LOOKOUT.z};e.hp=e.maxhp=60;e.dmgMul=.5;e.surrBias=.6;a.equip(e.dude,null);
    const gd={id:'look',e,def:null,pos:{x:LOOKOUT.x,z:LOOKOUT.z},yaw:LOOKOUT.yaws[0],scan:0,scanT:0,ob:null,look:true};gd.ob=S.addObserver({id:'look',kind:'lookout',pos:gd.pos,yaw:gd.yaw,R:27});S.bindEnemy(e,'look');M.guards.push(gd)}
  /* a cooler for the lookout, a phone in his hand is implied */
  {const T=T3(),c=new T.Group();bx(std('#2f6fb3',{roughness:.5}),.62,.42,.4,0,.21,0,c);bx(std('#f2f2ee',{roughness:.5}),.64,.08,.42,0,.44,0,c);c.position.set(LOOKOUT.x,a.groundAt(LOOKOUT.x,LOOKOUT.z),LOOKOUT.z+.35);a.wmAdd(c)}
  try{M.viz=Sx.viz(S,{THREE:T3(),parent:a.L.group,paths:GUARDS.map(g=>g.path.map(p=>({x:p[0],z:p[1]})))});res().fx.push({remove:()=>{try{M.viz&&M.viz.dispose()}catch(_){}}})}catch(_){M.viz=null}
  a.rebuildTargets()}
/* the ?/! tags and the visibility gem: only once you're in the lot (at the gate they'd sit on top of the attendant's choices) */
function stealthHud(M){const a=A(),Sx=SX(),S=M.S;if(!Sx||!S||M.shud||M.alarm)return;
  try{M.shud=Sx.hud(S,{project:(x,y,z)=>a.project(x,y,z),mount:el=>{try{a.overlay('roundup-stealth',el);res().ov.push('roundup-stealth')}catch(_){}}});Sx.bindHud&&Sx.bindHud(a.HUD);res().fx.push({remove:()=>{try{M.shud&&M.shud.dispose()}catch(_){}}})}catch(_){M.shud=null}}
function guardsTick(M,dt){const a=A(),S=M.S;if(!S)return;const P=a.P;
  for(const g of M.guards){const e=g.e;if(e.state==='dead'||e.state==='cuffed'||e.state==='surrender'){continue}
    if(M.alarm){g.pos.x=e.pos.x;g.pos.z=e.pos.z;continue}
    if(g.look){/* scanning the rows from the cooler, phone in hand */g.scanT-=dt;if(g.scanT<=0){g.scan=(g.scan+1)%LOOKOUT.yaws.length;g.scanT=M.nervous>0?2.2:4.2}
      const want=LOOKOUT.yaws[g.scan];g.yaw+=wrap(want-g.yaw)*Math.min(1,dt*2.5);e.yaw=g.yaw;e.script=null;e.pos.set(LOOKOUT.x,0,LOOKOUT.z);if(e.dude){e.dude.root.rotation.y=g.yaw;pose(e.dude,dt,{mode:'sit',aim:false,moving:false})}}
    else if(g.att){g.pos.x=e.pos.x;g.pos.z=e.pos.z;if(e.dude)g.yaw=e.dude.root.rotation.y;if(!e.script&&M.attBooth&&e.dude)e.dude.root.rotation.y+=wrap(Math.PI*.95-e.dude.root.rotation.y)*Math.min(1,dt*3)}
    else{const st=S.state(g.id);
      if(st==='calm'){if(g.wait>0){g.wait-=dt;e.script=null}else if(!e.script){const p=g.def.path[g.k];e.script={kind:'to',x:p[0],z:p[1],speed:g.def.speed,then:()=>{g.k=(g.k+1)%g.def.path.length;g.wait=g.def.wait}}}}
      else if(st==='curious'){e.script=null;const o=S.get(g.id);if(o&&o.lkp&&e.dude){const w=Math.atan2(o.lkp.x-e.pos.x,o.lkp.z-e.pos.z);e.dude.root.rotation.y+=wrap(w-e.dude.root.rotation.y)*Math.min(1,dt*3)}
        if(cool(M,'curious',40)&&hyp(P.pos.x-e.pos.x,P.pos.z-e.pos.z)<20&&a.allies.length)seq(M,L.guardCurious)}
      else if(st==='searching'){const o=S.get(g.id);if(o&&o.lkp&&!e.script)e.script={kind:'to',x:o.lkp.x,z:o.lkp.z,speed:1.6,then:()=>{}}}
      g.pos.x=e.pos.x;g.pos.z=e.pos.z;if(e.dude)g.yaw=e.dude.root.rotation.y}
    g.ob.yaw=g.yaw}
  M.nervous=Math.max(0,(M.nervous||0)-dt);
  const pl={x:P.pos.x,z:P.pos.z,stance:P.crouch?'crouch':a.keys.shift&&P.moving?'sprint':'stand',lit:1,hidden:!!a.CV};/* in a car: they hear you (shoves, sparks), they don't clock a dad behind glass */
  const out=S.tick(dt,pl);for(const r of out){if(r.state==='alerted'&&!M.alarm){const g=M.guards.find(x=>x.id===r.id);M.alarmBy=r.id+'@'+M.t.toFixed(1)+' p'+P.pos.x.toFixed(1)+','+P.pos.z.toFixed(1)+(g?' g'+g.pos.x.toFixed(1)+','+g.pos.z.toFixed(1):'');if(g&&g.look)say(M,'Lookout',L.lookoutSee,true);raiseAlarm(M,'seen');break}}
  if(M.viz)try{M.viz.update(dt,{nvg:false,night:false})}catch(_){}
  if(M.shud)try{M.shud.update(dt,{vis:1,noise:0,hidden:false,hide:false})}catch(_){}
  /* silent zip-ties from behind */
  if(!a.CV&&!M.alarm&&!M.relay){for(const g of M.guards){const e=g.e;if(e.state==='cuffed'||e.state==='dead')continue;if(!S.canTakedown(g.ob,{x:P.pos.x,z:P.pos.z,yaw:P.yaw}))continue;
    M.F.holds.push({x:e.pos.x,z:e.pos.z,r:1.5,o:g.tieO||(g.tieO={}),txt:'Zip-tie him (from behind)',time:1.6,fn:()=>{S.takedown(g.ob);a.wmCuff(e);M.ties++;S.noise({x:e.pos.x,z:e.pos.z,r:2,kind:'tie'});say(M,'you',pick(L.tookTie));
      if(g.id==='att'&&M.fee){M.feeBack=true;seq(M,[['gary',"My envelope! It still says EMERGENCY on it!"]])}}});break}}}
function raiseAlarm(M,why){const a=A();if(M.alarm)return;M.alarm=true;M.alarmWhy=why;seq(M,L.alarm,true);unstashCrew(M,false);music('combat',.7);
  if(M.S)try{M.S.release()}catch(_){}
  for(const g of M.guards){const e=g.e;if(e.state==='idle'){e.script=null;if(!g.look)a.equip(e.dude,'pistol'),e.gun='pistol';else{e.gun='pistol';a.equip(e.dude,'pistol')}}}
  try{a.spotted(why==='rammed'?'The barrier came down on the van. Everybody heard it.':'They saw us. The lot knows.')}catch(_){}
  if(M.barrierOpen&&!M.barrierBroken){M.barrierOpen=false;seq(M,L.barrierShut)}
  a.rebuildTargets()}

/* ================= the barrier ================= */
function barrierTick(M,dt){const O=window.HT&&HT.OpenWorld,b=O&&O.prop&&O.prop('parkride.barrier');const want=M.barrierBroken?1.5:M.barrierOpen?1:0;M.barrierK+=(want-M.barrierK)*Math.min(1,dt*2.2);
  if(b){if(M.barrierBroken){b.rotation.x=-1.32;b.rotation.z=M.barrierK>1.2?.9:0;b.visible=true}else{b.rotation.x=-1.32*clamp(M.barrierK,0,1);b.rotation.z=0}}
  const shut=!M.barrierBroken&&M.barrierK<.5;if(shut){Object.assign(M.barrierCol,{x0:258.7,z0:61.9,x1:259.5,z1:66.1})}else{M.barrierCol.x0=M.barrierCol.z0=-1e4;M.barrierCol.x1=M.barrierCol.z1=-1e4+1}}
function openBarrier(M,quiet){if(M.barrierOpen)return;M.barrierOpen=true;sfx.barrier();if(!quiet)A().feed('Barrier up','info')}

/* ================= stage 1: the attendant ================= */
function gateBegin(M){const a=A();const e=a.spawnEnemy(BOOTH_E.x+1.6,BOOTH_E.z,false);e.noLeash=true;a.equip(e.dude,null);e.gun='pistol';/* holstered: the AI needs a gun on file */e.hp=e.maxhp=50;M.att=e;
  e.script={kind:'to',x:WINDOW.x,z:WINDOW.z,speed:1.3,then:()=>{M.attAt=true}};
  if(M.S){const gd={id:'att',e,def:null,pos:{x:e.pos.x,z:e.pos.z},yaw:0,ob:null,att:true};gd.ob=M.S.addObserver({id:'att',kind:'guard',pos:gd.pos,yaw:0,R:12});M.S.bindEnemy(e,'att');M.guards.push(gd);gd.ob.off=true}
  a.rebuildTargets()}
function gateTick(M,dt,F){const a=A(),e=M.att,P=a.P;M.F=F;
  if(e&&!M.attAt&&!e.script&&hyp(e.pos.x-WINDOW.x,e.pos.z-WINDOW.z)<2.5)M.attAt=true;
  if(M.attAt&&!M.scam&&!M.choices){if(e&&e.dude)faceTo(e.dude,P.pos.x,P.pos.z,dt);if(once(M,'gate'))seq(M,L.gate);if(M.t>4.5)openChoices(M)}
  if(M.choices&&!M.scam){if(e&&e.dude)faceTo(e.dude,P.pos.x,P.pos.z,dt);M.chT=(M.chT||0)+dt;if(M.chT>16&&once(M,'nudge'))seq(M,L.nudge,true)}
  /* the scam's aftermath, until you're in */
  if(M.scam==='coach'&&e&&e.state==='idle'&&!e.script&&M.attGone!==true){M.attGone=true;e.script={kind:'to',x:236,z:66,speed:1.5,then:ee=>{vanish(ee)}}}
  if(M.scam==='pay'&&e&&e.state==='idle'&&!e.script&&!M.attBooth){M.attBooth=true;e.script={kind:'to',x:263.6,z:60.8,speed:1.2,then:()=>{const g=M.guards.find(x=>x.id==='att');if(g&&g.ob){g.ob.off=false;g.yaw=Math.PI*.95}}}}
  if(M.scam==='receipt'&&e&&e.state==='idle'&&!e.script&&!M.attBooth){M.attBooth=true;e.script={kind:'to',x:276,z:69.5,speed:1.3,then:()=>{const g=M.guards.find(x=>x.id==='att');if(g&&g.ob){g.ob.off=false}}}}
  if(M.scam&&!M.barrierOpen&&!M.barrierBroken){/* open it from the booth (on foot) */F.taps.push({x:BOOTH_E.x,z:BOOTH_E.z,r:1.8,txt:'Press the barrier button',fn:()=>{openBarrier(M);say(M,'you',"Ding. Very official.")}});
    if(!a.CV)F.target={x:BOOTH_E.x,z:BOOTH_E.z,label:'Booth button'};else F.objs.push(['Get out (E) and press the barrier button in the booth',false])}
  /* objectives */
  if(!M.scam){F.objs.push([M.choices?'Deal with the "attendant": press 1, 2 or 3':'The attendant is coming over',false]);F.target={x:WINDOW.x+.5,z:WINDOW.z,label:'Attendant'}}
  else if(M.barrierOpen||M.barrierBroken){F.objs.push(['Drive into the lot and park',false]);F.target={x:262,z:64,label:'Park & Ride'}}
  if(M.scam&&P.pos.x>260.2)lotBegin(M);
  /* the guards walk their rounds from the start */
  guardsTick(M,dt)}
function openChoices(M){const a=A(),HUD=a.HUD;if(!HUD||!HUD.kit||!HUD.kit.choices){M.choices={close(){}};return}
  try{M.choices=HUD.kit.choices({speaker:'Attendant',color:'#f2c230',prompt:L.feePrompt,tell:'He keeps glancing at the far corner of the lot.',keys:true,
    options:[{text:'Pay the "release fee" ($200)',reg:'real'},{text:'"Can we get a receipt?"',reg:'joke'},{text:'Let Rick handle it',reg:'compliment'}],
    onPick:(i)=>pickScam(M,['pay','receipt','coach'][i])});
    a.overlay('roundup-choices',M.choices.el);res().ov.push('roundup-choices')}catch(err){console.warn('roundup: choices',err);M.choices={close(){}}}}
function closeChoices(M){const a=A();try{a.overlay('roundup-choices',null)}catch(_){}M.choices=M.choices&&{closed:true}}
function pickScam(M,k){if(M.scam||A().M!==M)return;M.scam=k;closeChoices(M);sfx.order();
  if(k==='pay'){M.fee=true;seq(M,L.pay,true);openBarrier(M)}
  else if(k==='receipt'){seq(M,L.receipt,true);M.nervous=40;if(M.S)try{M.S.poke('look',270,70,.3,'phone')}catch(_){}}
  else{seq(M,L.coach,true);M.alumni=true;openBarrier(M);try{A().addTrust(K.trustAlumni,'maple')}catch(_){}A().feed("Coach Rick's alumni",'trust','+'+K.trustAlumni+' trust');
    const g=M.guards.find(x=>x.id==='att');if(g&&M.S){/* he's not a lookout any more */g.ob.off=true}}
  if(M.att)M.att.script=null}
/* the crew wait in your van while you sneak (four dads strolling a lot is a flash mob, and they'd start a fight): out of the squad,
   kept in the job's own scene list so they're cleaned up with it; back in the squad if the alarm goes */
function stashCrew(M){const a=A(),arr=a.allies;M.stash=M.stash||[];for(let i=arr.length-1;i>=0;i--){const al=arr[i];if(!CREW.includes(al.id))continue;arr.splice(i,1);if(al.tag){al.tag.remove();al.tag=null}
    al.ride=false;al.dude.root.visible=false;try{a.wmAdd(al.dude.root)}catch(_){}M.stash.push(al)}a.rebuildTargets()}
function unstashCrew(M,ride){const a=A();if(!M.stash||!M.stash.length)return;const e=M.car;for(const al of M.stash.splice(0)){const p=e?vanDoor({c:{x:e.pos.x,z:e.pos.z,yaw:e.yaw}}):a.P.pos;al.pos.set(p.x+(Math.random()-.5),0,p.z+(Math.random()-.5));a.collide(al.pos,.35);
    al.dude.root.position.set(al.pos.x,0,al.pos.z);al.dude.root.visible=!ride;al.ride=!!ride;a.allies.push(al);const tag=document.createElement('div');tag.className='tag ally';tag.textContent=al.name||CREW_NAME[al.id];const host=document.getElementById('tags');if(host)host.appendChild(tag);al.tag=tag}a.rebuildTargets()}
function vanish(e){const a=A();e.script={kind:'incar'};e.state='dead';e.hp=0;if(e.tag){e.tag.remove();e.tag=null}if(e.dude&&e.dude.root.parent)e.dude.root.parent.remove(e.dude.root);const k=a.enemies.indexOf(e);if(k>=0)a.enemies.splice(k,1);a.rebuildTargets()}

/* ================= stage 2: the lot ================= */
function lotBegin(M){const a=A();if(M.ph!=='gate')return;M.ph='lot';stashCrew(M);stealthHud(M);if(M.stage!=='lot')a.CP.mark('lot');seq(M,L.inLot);
  /* the crew are out with you as soon as you are */}
function lotTick(M,dt,F){const a=A(),P=a.P;M.F=F;if(!M.alarm&&a.allies.some(x=>CREW.includes(x.id)))stashCrew(M);guardsTick(M,dt);
  /* barrier: from the booth, or through it */
  if(!M.barrierOpen&&!M.barrierBroken){F.taps.push({x:BOOTH_E.x,z:BOOTH_E.z,r:1.8,txt:'Press the barrier button',fn:()=>{openBarrier(M)}});
    F.taps.push({x:263.2,z:60.4,r:1.6,txt:'Press the barrier button',fn:()=>{openBarrier(M)}})}
  /* find: walk past the front of a van (the hang tag, the windshield sticker) */
  let nearest=null,nd=1e9;
  for(const id in M.vans){const v=M.vans[id],fp=vanFront(v),d=hyp(P.pos.x-fp.x,P.pos.z-fp.z);
    if(!M.found[id]){if(d<K.findR||hyp(P.pos.x-v.c.x,P.pos.z-v.c.z)<3.2){M.found[id]=true;sfx.cheer();say(M,CREW_SPEAKER(M),v.f.find,true);a.feed(v.f.fam+"' van found",'info',Object.keys(M.found).length+'/5');glow(v,true);
        if(v.f.boxed&&!M.cleared[id])seq(M,L.boxed[id]||[]);if(Object.keys(M.found).length===1)seq(M,L.relayHow)}
      continue}
    if(!M.started[id]&&!M.relay&&!a.CV&&d<K.relayR+.8)F.taps.push({x:fp.x,z:fp.z,r:K.relayR,txt:'Pop the hood · hot-swap the relay',fn:()=>relayOpen(M,v)});
    if(!M.started[id]&&d<nd){nd=d;nearest=v}}
  for(const d of M.decoys){if(d.said)continue;const f=fwd(d.yaw),fx=d.x+f[0]*3,fz=d.z+f[1]*3;if(hyp(P.pos.x-fx,P.pos.z-fz)<3&&d.type==='minivan'){d.said=true;if(cool(M,'decoy',9))say(M,CREW_SPEAKER(M),d.lions?L.decoy[1]:pick(L.decoy))}}
  relayTick(M,dt,F);crewTick(M,dt);
  /* boxed in: shove the hatchback with your van, or hitch it and drag */
  for(const id in M.blk){const k=M.blk[id];if(k.done)continue;const d=hyp(P.pos.x-k.c.x,P.pos.z-k.c.z);
    if(!a.CV&&hitchOwned()&&!k.hooked&&d<3.2){const r=rgt(k.c.yaw),fb=fwd(k.c.yaw);F.taps.push({x:k.c.x-fb[0]*2.2,z:k.c.z-fb[1]*2.2,r:2.4,txt:'Strap it to your van\'s hitch',fn:()=>hookBlk(M,k)})}}
  /* objectives and the marker */
  const nf=Object.keys(M.found).length,ns=Object.keys(M.started).length,nb=Object.keys(M.blk).filter(id=>!M.blk[id].done&&M.found[id]).length,ready=readyIds(M).length;
  F.objs.push(['Find the Hornets vans (hang tag, bee sticker) · '+nf+'/5',nf>=5]);
  if(nf)F.objs.push(['Pop the hood (E) and match the relay wires (1, 2, 3) · '+ns+'/'+nf,ns>=5]);
  if(nb)F.objs.push(['Boxed in: shove the hatchback clear with your van'+(hitchOwned()?' (or strap it to the hitch)':'')+' · '+nb+' left',false,'warn']);
  if(M.alarm&&!M.barrierOpen&&!M.barrierBroken)F.objs.push(['The barrier is down: press the booth button, or drive through it',false,'warn']);
  if(!M.relay){if(nb&&M.started[Object.keys(M.blk).find(id=>!M.blk[id].done&&M.found[id])]&&(a.CV||ns>=nf)){const id=Object.keys(M.blk).find(x=>!M.blk[x].done&&M.found[x]),k=M.blk[id];
      if(!a.CV){F.target={x:M.car.pos.x,z:M.car.pos.z,label:'Your van'};F.objs.push(['Get in your van (E)',false])}else F.target={x:k.c.x-2.6*k.f.boxed.push[0],z:k.c.z,label:'Shove the hatchback'}}
    else if(ready>=Math.min(5,Math.max(K.minVans,nf))&&(ns>=5||ready>=5)){formUpObjective(M,F)}
    else if(nearest&&nf){const fp=vanFront(nearest);F.target={x:fp.x,z:fp.z,label:nearest.f.fam+"' van"}}
    else{const row=FLEET.map(f=>M.vans[f.id]).find(v=>!M.found[v.f.id]);if(row){const fp=vanFront(row);F.target={x:fp.x+(row.c.x>268?-3:3),z:fp.z,label:'Walk the rows'}}}}
  if(ready>=1&&(ns>=5||ready>=K.minVans)&&a.CV&&a.CV.pos.x<257.5&&(ns>=5&&readyIds(M).length===ns||M.leaveOk))convoyBegin(M);
  else if(a.CV&&a.CV.pos.x<255&&ready<5&&!M.leaveOk){if(once(M,'leaveShort'))seq(M,L.leaveShort,true);if(a.CV.pos.x<246&&ready>=K.minVans){M.leaveOk=true}}}
function formUpObjective(M,F){const a=A();if(once(M,'formup'))seq(M,L.formUp,true);
  if(!a.CV){F.target={x:M.car.pos.x,z:M.car.pos.z,label:'Your van'};F.objs.push(['Get in your van (E) and lead them out the gate',false])}
  else{F.target={x:OUT.x-6,z:OUT.z,label:'Out the gate'};F.objs.push(['Drive out the gate · the vans fall in behind you',false])}}
const readyIds=M=>FLEET.map(f=>f.id).filter(id=>M.started[id]&&(!M.blk[id]||M.blk[id].done)&&M.vans[id].drv&&M.vans[id].st==='bay');
function CREW_SPEAKER(M){const al=A().allies.filter(x=>!x.down);return al.length?pick(al).id:'rick'}
function hitchOwned(){try{const s=A().SV();return!!(s&&s.garage&&s.garage.util&&s.garage.util.hitch)}catch(_){return false}}
function glow(v,on){const FX=window.HT&&HT.FX;if(on&&!v.glow&&FX&&FX.highlight){try{v.glow=FX.highlight(v.obj,true,{color:'#f6c21a',intensity:1.1});res().fx.push(v.glow)}catch(_){v.glow=null}}
  else if(!on&&v.glow){try{v.glow.remove()}catch(_){}v.glow=null}}

/* ---------------- the relay: three wires, three terminals, number keys ---------------- */
const WIRES={hen:['red','blue','yellow'],ngu:['green','red','white'],pat:['blue','yellow','red'],kow:['red','blue','blue'],gar:['white','green','red']};
const WCOL={red:'#d6362e',blue:'#2f6fd6',yellow:'#f2c230',green:'#3aa655',white:'#eeeeee'};
function relayOpen(M,v){const a=A();if(M.relay||M.started[v.f.id])return;const wires=WIRES[v.f.id],terms=[2,0,1].map(i=>wires[i]);/* terminals in a shuffled order (fixed per van) */
  M.relay={v,wires,terms,i:0,sparks:0,t:0,done:false};relayDom(M);if(v.f.id==='kow'&&once(M,'twoBlues'))seq(M,L.twoBlues,true);
  if(M.S)M.S.noise({x:v.c.x,z:v.c.z,r:3,kind:'hood',player:true});sfx.click()}
function relayKey(M,n){const R=M.relay;if(!R||R.done)return;const want=R.wires[R.i],got=R.terms[n];if(got==null)return;
  if(got===want){R.i++;sfx.click();if(R.i>=R.wires.length){R.done=true;R.t=0}}
  else{R.sparks++;sfx.spark();say(M,'you',pick(L.spark),true);if(M.S)M.S.noise({x:R.v.c.x,z:R.v.c.z,r:K.sparkNoise,kind:'spark',player:true});R.flash=.35}
  relayDraw(M)}
function relayTick(M,dt,F){const a=A(),R=M.relay;if(!R)return;R.t+=dt;R.flash=Math.max(0,(R.flash||0)-dt);
  const fp=vanFront(R.v);if(!R.done&&(hyp(a.P.pos.x-fp.x,a.P.pos.z-fp.z)>3.4||a.CV)){relayClose(M);return}
  F.objs.push(['Relay: connect the '+(R.wires[R.i]||'last')+' wire · press 1, 2 or 3',false]);F.prompt='1 · 2 · 3 · match the wire to its terminal';
  if(R.done&&R.t>.55){const v=R.v;M.started[v.f.id]=true;relayClose(M);sfx.start();say(M,'you',pick(L.started),true);if(M.S)M.S.noise({x:v.c.x,z:v.c.z,r:K.relayNoise,kind:'relay',player:true});
    v.haz=true;setTimeout0(M,1.4,()=>{v.haz=false});glow(v,false);crewAssign(M,v)}
  else relayDraw(M)}
function relayClose(M){const a=A();try{a.overlay('roundup-relay',null)}catch(_){}M.relay=null}
function relayDom(M){const a=A(),el=document.createElement('div');el.className='ru-relay';
  el.style.cssText='position:absolute;left:50%;bottom:17%;transform:translateX(-50%);width:min(440px,92vw);background:rgba(18,22,28,.88);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:14px 16px 12px;font:600 14px/1.2 system-ui,Arial;color:#eef2f6;box-shadow:0 10px 30px rgba(0,0,0,.4);pointer-events:auto';
  el.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="letter-spacing:.08em;font-size:12px;opacity:.75">FUSE BOX · FOB RELAY</span><span class="ru-rv" style="font-size:12px;opacity:.75"></span></div>'+
    '<svg class="ru-svg" viewBox="0 0 400 150" style="width:100%;height:auto;display:block"></svg><div class="ru-keys" style="display:flex;gap:8px;margin-top:8px"></div>';
  const keys=el.querySelector('.ru-keys');for(let i=0;i<3;i++){const b=document.createElement('button');b.type='button';b.style.cssText='flex:1;padding:8px 0;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font:700 15px system-ui,Arial;cursor:pointer';
    b.innerHTML='<b style="display:inline-block;min-width:20px;border:1px solid rgba(255,255,255,.5);border-radius:5px;margin-right:6px">'+(i+1)+'</b><span></span>';b.addEventListener('pointerdown',ev=>{ev.preventDefault();relayKey(M,i)});keys.appendChild(b)}
  M.relayEl=el;a.overlay('roundup-relay',el);if(!res().ov.includes('roundup-relay'))res().ov.push('roundup-relay');relayDraw(M)}
function relayDraw(M){const R=M.relay,el=M.relayEl;if(!R||!el)return;const svg=el.querySelector('.ru-svg');const key=R.i+'|'+R.sparks+'|'+(R.flash>0?1:0)+'|'+(R.done?1:0);if(el.dataset.k===key)return;el.dataset.k=key;
  let s='<rect x="0" y="0" width="400" height="150" rx="10" fill="#1d2329"/><rect x="150" y="18" width="100" height="114" rx="8" fill="#2b333b" stroke="#57616b"/><text x="200" y="80" fill="#9aa6b2" font-size="13" text-anchor="middle" font-family="Arial">RELAY</text>';
  R.wires.forEach((w,i)=>{const y=34+i*41,done=i<R.i,cur=i===R.i&&!R.done;s+='<path d="M8 '+y+' C 60 '+y+', 90 '+y+', '+(done?150:120)+' '+(done?y:y+(cur?0:6))+'" stroke="'+WCOL[w]+'" stroke-width="'+(cur?9:7)+'" fill="none" stroke-linecap="round" opacity="'+(done||cur?1:.55)+'"/>'+
    (cur?'<circle cx="124" cy="'+y+'" r="11" fill="none" stroke="#fff" stroke-width="2" opacity=".85"/>':'')});
  R.terms.forEach((w,i)=>{const y=34+i*41;s+='<rect x="262" y="'+(y-12)+'" width="84" height="24" rx="6" fill="#11161b" stroke="'+WCOL[w]+'" stroke-width="3"/><circle cx="276" cy="'+y+'" r="6" fill="'+WCOL[w]+'"/><text x="300" y="'+(y+5)+'" fill="#fff" font-size="15" font-family="Arial" font-weight="700">'+(i+1)+'</text>'});
  if(R.flash>0)s+='<g opacity=".9"><path d="M200 40 l18 22 -14 4 22 30" stroke="#ffe36a" stroke-width="4" fill="none"/><circle cx="210" cy="70" r="26" fill="#fff6a8" opacity=".25"/></g>';
  if(R.done)s+='<text x="200" y="146" fill="#7cf29a" font-size="14" text-anchor="middle" font-family="Arial" font-weight="700">VROOM</text>';
  svg.innerHTML=s;el.querySelector('.ru-rv').textContent=R.v.f.fam+"' van";[...el.querySelectorAll('.ru-keys button span')].forEach((sp,i)=>{sp.textContent=R.terms[i];sp.style.color=WCOL[R.terms[i]]})}
/* a small timer list (dt only) */
function setTimeout0(M,t,fn){(M.timers||(M.timers=[])).push({t,fn})}
function timersTick(M,dt){const T=M.timers;if(!T||!T.length)return;for(let i=T.length-1;i>=0;i--){T[i].t-=dt;if(T[i].t<=0){const f=T[i].fn;T.splice(i,1);try{f()}catch(err){console.warn(err)}}}}

/* ---------------- the crew get in: allies leave the squad and walk to the driver's door; Earl comes over from the bus stop ---------------- */
function crewAssign(M,v){const a=A();const taken=new Set(Object.values(M.vans).map(x=>x.crew).filter(Boolean));const id=CREW.find(c=>!taken.has(c));if(!id)return;v.crew=id;
  if(id==='earl'){v.walk={who:'earl',d:null,from:{x:254.5,z:66.5}};return}
  let al=(M.stash||[]).find(x=>x.id===id);if(al){M.stash.splice(M.stash.indexOf(al),1);const e=M.car,p=e?vanDoor({c:{x:e.pos.x,z:e.pos.z,yaw:e.yaw}}):a.P.pos;al.dude.root.position.set(p.x,a.groundAt(p.x,p.z),p.z)}
  else{al=a.allies.find(x=>x.id===id);if(!al){v.walk={who:id,d:null,from:{x:a.P.pos.x+1,z:a.P.pos.z+1}};return}
    /* out of the squad (the AI and the van seats stop using him) */const arr=a.allies,i=arr.indexOf(al);if(i>=0)arr.splice(i,1);if(al.tag){al.tag.remove();al.tag=null}try{a.wmAdd(al.dude.root)}catch(_){}}
  al.ride=false;al.dude.root.visible=true;v.walk={who:id,d:al.dude,ally:al,from:null};a.rebuildTargets()}
function crewTick(M,dt){const a=A();for(const id in M.vans){const v=M.vans[id],w=v.walk;if(!w)continue;
    if(!w.d){if(w.who==='earl'){if(!ready('earl'))continue;w.d=person('earl',null,w.from.x,w.from.z,0);if(!w.d)continue;if(once(M,'earl'))say(M,'earl',"Bus was early. It's never early. Who needs a driver?",true)}
      else{const look=a.HOMIES[w.who];if(!look)continue;w.d=a.makeDude(look);w.d.root.position.set(w.from.x,0,w.from.z);a.wmAdd(w.d.root)}}
    /* round the parked cars, not through them: the west column, then along the van's aisle to its nose, then in */
    if(!w.path){const fp=vanFront(v),r=w.d.root.position,az=fp.z;w.path=[];if(hyp(r.x-fp.x,r.z-fp.z)>7){if(r.x<259.6)w.path.push({x:260.2,z:64});if(Math.abs(r.z-az)>2.2)w.path.push({x:261.3,z:clamp(r.z,61,82)},{x:261.3,z:az})}w.path.push(fp)}
    if(w.path.length&&walkTo(w.d,w.path[0],K.crewWalk,dt))w.path.shift();
    if(!w.path.length||w.t>16){v.drv=w.d;v.walk=null;say(M,w.who,CREW_IN[w.who](v.f.fam));sfx.click();if(w.ally)M.inVan=(M.inVan||[]).concat(w.who)}
    w.t=(w.t||0)+dt}}

/* ---------------- blockers: pushable hatchbacks ---------------- */
function blockersTick(M,dt){const a=A();for(const id in M.blk){const k=M.blk[id];const c=k.c;
    if(k.hooked){const e=a.CV;if(!e||!e.car){k.hooked=false}else{const f=fwd(e.yaw),S=a.carSize(e),hx=e.pos.x-f[0]*(S.l/2+.4),hz=e.pos.z-f[1]*(S.l/2+.4),dx=c.x-hx,dz=c.z-hz,d=hyp(dx,dz)||1;
        if(d>K.hitchFollow){c.x=hx+dx/d*K.hitchFollow;c.z=hz+dz/d*K.hitchFollow;c.yaw+=wrap(yawTo(-dx,-dz)-c.yaw)*Math.min(1,dt*3)}a.collide(c,.95);sfx.tick&&0}}
    else if(Math.abs(c.spd)>.01){/* rolling after a shove, handbrake on: it stops fast */c.spd=Math.sign(c.spd)*Math.max(0,Math.abs(c.spd)-9*dt);const f=fwd(c.yaw);c.x+=f[0]*c.spd*dt;c.z+=f[1]*c.spd*dt;a.collide(c,.95)}
    k.moved=hyp(c.x-k.x0,c.z-k.z0);
    if(!k.done){const path=JOIN[id].map(p=>({x:p[0],z:p[1]}));let md=1e9;for(let i=1;i<path.length;i++){const A_=path[i-1],B=path[i],dx=B.x-A_.x,dz=B.z-A_.z,L2=dx*dx+dz*dz||1,t=clamp(((c.x-A_.x)*dx+(c.z-A_.z)*dz)/L2,0,1);md=Math.min(md,hyp(A_.x+dx*t-c.x,A_.z+dz*t-c.z))}
      if(md>K.shoveClear||k.moved>5.2){k.done=true;M.cleared[id]=true;if(k.hooked){k.hooked=false;a.feed('Strap off','info')}say(M,'rick',pick(L.shoved),true);a.feed(k.f.fam+"' van is clear",'info')}}
    syncBlk(k)}}
function hookBlk(M,k){const a=A();const e=M.car;if(!e)return;const d=hyp(e.pos.x-k.c.x,e.pos.z-k.c.z);if(d>9){a.feed('Back your van up to it first','bad');return}k.hooked=true;sfx.click();a.feed('Strapped to your hitch: drive away to drag it','info');if(once(M,'hitchL'))seq(M,L.hitch)}
/* JH.vehicle: your car against the hatchbacks (shove), the pursuer, and (through HT.Convoy) the vans */
function playerContacts(M,e,dt){const a=A(),CA=a.CarAI();if(!CA||!e||!e.car)return;
  const G_=window.HT.Garage,rs=G_&&G_.apply?G_.apply(G_.VEH[e.type]?e.type:'minivan'):{};const sh={x:e.car.x,z:e.car.z,yaw:e.car.yaw,spd:e.car.spd,hp:999,stats:Object.assign({},rs,e.car.stats,{mass:rs.mass||1,ramMult:rs.ramMult||1,ramDealtFront:rs.ramDealtFront||1,impactTakenFront:rs.impactTakenFront||1,len:rs.len||4.4,wid:rs.wid||2,hp:999})};
  const apply=()=>{e.car.x=e.pos.x=sh.x;e.car.z=e.pos.z=sh.z;e.car.spd=e.spd=sh.spd;a.syncCar(e)};
  for(const id in M.blk){const k=M.blk[id];if(k.hooked)continue;const hp0=k.c.hp;const r=CA.ram(sh,k.c);if(!r)continue;k.c.hp=hp0;apply();
    if(r.vn>1.2){sfx.thud(r.vn);if(M.S)M.S.noise({x:k.c.x,z:k.c.z,r:r.vn>4?12:5,kind:'bump',player:true})}
    if(r.vn>K.shoveHard){a.carDamage&&a.carDamage(e,(r.vn-K.shoveHard)*2.2,'crash');if(cool(M,'shoveHard',6))say(M,'rick',pick(L.shoveHard),true)}}
  if(M.pursuit&&M.pursuit.c&&!M.pursuit.gone){const p=M.pursuit,c=p.c,hp0=c.hp;const f=fwd(sh.yaw),ahead=(c.x-sh.x)*f[0]+(c.z-sh.z)*f[1];const r=CA.ram(sh,c);
    if(r){c.hp=hp0;apply();if(r.vn>2){sfx.thud(r.vn);const behindMe=ahead<0;
        if(behindMe&&r.vn>3.2&&c.spinT<=0){/* he ran into the back of you: a brake check */c.spinT=1.3;c.spd*=.3;p.shake=Math.min(100,p.shake+K.shakeBrake);M.brakeChecks++;if(cool(M,'bc',8))seq(M,L.brakeCheck,true);a.carDamage&&a.carDamage(e,Math.max(0,r.vn-3)*1.2,'crash')}
        else if(!behindMe&&r.vn>3.5){c.hp=Math.max(0,c.hp-(r.vn-3)*3);p.shake=Math.min(100,p.shake+K.shakeRam+r.vn);if(cool(M,'ram',7))say(M,CREW_SPEAKER(M)==='rick'?'gary':'dave',pick(L.rammed));a.carDamage&&a.carDamage(e,Math.max(0,r.vn-3)*1.6,'crash')}}}}}

/* ================= stage 3: convoy out ================= */
function convoyBegin(M){const a=A();if(M.ph!=='lot')return;M.ph='convoy';unstashCrew(M,!!a.CV);closeChoices(M);relayClose(M);
  const ids=readyIds(M).sort((p,q)=>JOIN[p].length-JOIN[q].length||(M.vans[p].c.x-M.vans[q].c.x));
  for(const id of ids){const v=M.vans[id];v.st='convoy';v.m=M.C.add(v.c,{id,name:v.crew,join:JOIN[id].map(p=>({x:p[0],z:p[1]}))})}
  M.noGuns=L.noGuns;if(M.stage!=='convoy')a.CP.mark('convoy');seq(M,L.rolling,true);M.orderTut=true;music('tension',.45);
  if(M.S){try{M.S.release()}catch(_){}}if(M.viz){try{M.viz.dispose()}catch(_){}M.viz=null}if(M.shud){try{M.shud.dispose()}catch(_){}M.shud=null}try{a.overlay('roundup-stealth',null)}catch(_){}}
function leadStats(e){const G_=window.HT.Garage,rs=G_&&G_.apply?G_.apply(G_.VEH[e.type]?e.type:'minivan'):{};const st=e.car&&e.car.stats||{};if(!e._ruStats||e._ruStats.src!==st)e._ruStats=Object.assign({},rs,st,{src:st,mass:rs.mass||1,ramMult:rs.ramMult||1,ramDealtFront:rs.ramDealtFront||1,impactTakenFront:rs.impactTakenFront||1,len:rs.len||4.4,wid:rs.wid||2});return e._ruStats}
function leadCar(M){const a=A();return a.CV||M.car}
function convoyTick(M,dt,F){const a=A(),C=M.C,P=a.P;M.F=F;timersTick(M,dt);crewTick(M,dt);
  /* the lead proxy: your car (HT.Convoy reads it and may push it in a bump) */
  const e=leadCar(M),LD=M.LEAD;if(e){const c=e.car||{x:e.pos.x,z:e.pos.z,yaw:e.yaw,spd:e.spd||0};LD.x=e.pos.x;LD.z=e.pos.z;LD.yaw=e.yaw;LD.spd=a.CV===e?(e.car?e.car.spd:e.spd||0):0;LD.len=a.carSize(e).l;LD.stats=leadStats(e);LD.hp=999}
  const x0=LD.x,z0=LD.z;
  const G=a.roads(),others=[];if(M.pursuit&&M.pursuit.c&&!M.pursuit.gone)others.push(Object.assign({len:4.6,w:2.2},M.pursuit.c));for(const x of M.cross)others.push({x:x.x,z:x.z,yaw:x.yaw,spd:x.v,len:4.4,w:2.2});
  if(C.head)others.push({x:LD.x,z:LD.z,yaw:LD.yaw,spd:LD.spd,len:LD.len,w:2.0});
  const ev=C.tick(dt,{others,collide:m=>vanCollide(M),canSnap:m=>{const p=a.project?a.project(m.car.x,1,m.car.z):null;return!p||p.behind||p.x<-40||p.y<-40||p.x>innerWidth+40||p.y>innerHeight+40},
    stop:m=>stopFor(M,m),bridge:(m,to)=>{const r=G&&G.route({x:m.car.x,z:m.car.z},to);return r&&r.points&&r.points.length>1?r.points:null}});
  if(e&&a.CV===e&&(LD.x!==x0||LD.z!==z0)){e.pos.x=LD.x;e.pos.z=LD.z;if(e.car){e.car.x=LD.x;e.car.z=LD.z;e.car.spd=LD.spd}a.syncCar(e)}
  /* bumps, walls, wrecks */
  for(const b of ev.bumps){const lead=b.a===C.lead||b.b===C.lead,vb=[b.a,b.b].filter(x=>x&&x!==C.lead);for(const x of vb)damageVan(M,M.vans[x.id],b.dmg,'bump');sfx.thud(b.vn);
    if(lead){if(cool(M,'pbump',10))say(M,(vb[0]&&M.vans[vb[0].id].crew)||'rick',pick(L.playerBump),true);if(e&&a.CV===e&&a.carDamage)a.carDamage(e,b.dmg*.6,'crash')}
    else if(cool(M,'bump',16))seq(M,pick(L.bump),true)}
  for(const h of ev.hits){if(h.speed>8.5){const v=M.vans[h.m.id];damageVan(M,v,Math.max(0,h.speed-8.5)*2.2,'wall')}}
  for(const m of ev.changed){const v=M.vans[m.id];if(!v)continue;if(m.st==='wait'&&cool(M,'lag'+m.id,25)){const l=L.lag(v.crew);say(M,l[0],l[1],true)}if(m.st==='line'&&v.lastSt==='wait'){const l=L.back(v.crew);say(M,l[0],l[1])}v.lastSt=m.st}
  /* vans the convoy owns: visuals; vans peeling off to their driveways */
  for(const id in M.vans){const v=M.vans[id];if(v.st==='peel')peelTick(M,v,dt)}
  /* the lot's crew scatter once the vans are gone (nobody chases five minivans on foot) */
  for(const g of M.guards||[]){const ge=g.e;if(!ge||ge.state==='dead'||ge.state==='cuffed'||ge.state==='surrender')continue;if(hyp(ge.pos.x-P.pos.x,ge.pos.z-P.pos.z)>32){vanish(ge)}}
  ordersTick(M,dt,F);pursuitTick(M,dt,F);deliveriesTick(M,dt,F);chatterTick(M,dt);
  /* objectives */
  const line=C.cars.filter(m=>m.st!=='out'),lost=line.filter(m=>m.st==='wait'),parked=line.filter(m=>m.st==='park'||m.st==='join');
  if(M.ph==='convoy'||M.ph==='home'){if(parked.length&&M.t-(M.convT0||(M.convT0=M.t))<40){F.objs.push(['Lead them out: '+(line.length-parked.length)+'/'+line.length+' in line behind you',false])}
    if(M.pursuit&&!M.pursuit.gone){F.objs.push([C.head?'Block him: stay between the sedan and the vans':'Press 4 so Rick takes the lead, then drop back and block the sedan',false,'warn'])}
    else if(M.ph==='home'){const n=Object.keys(M.delivered).length,live=line.length;F.objs.push(['Take each van to its driveway · '+n+' home',false])}
    if(lost.length){const w=lost[0];F.objs.push([M.vans[w.id].f.fam+"' van got lost: go back for "+CREW_NAME[M.vans[w.id].crew],false,'warn']);if(!F.target)F.target={x:w.car.x,z:w.car.z,label:CREW_NAME[M.vans[w.id].crew]}}
    if(M.orderTut)F.objs.push(['Convoy orders while driving: 1 tighten up · 2 spread out · 3 hold · 4 go round',false])}
  if(!F.target)F.target=routeTarget(M)}
function vanCollide(M){const a=A(),cols=[];for(const id in M.vans)cols.push(M.vans[id].col);if(M.pursuit)cols.push(M.pursuit.col);for(const x of M.cross)if(x.col)cols.push(x.col);
  return(p,r)=>{const sv=cols.map(c=>[c.x0,c.z0,c.x1,c.z1,c.ob]);for(const c of cols){c.x0=c.z0=-1e4;c.x1=c.z1=-1e4+1;c.ob=null}try{a.collide(p,r)}finally{cols.forEach((c,i)=>{const s=sv[i];c.x0=s[0];c.z0=s[1];c.x1=s[2];c.z1=s[3];c.ob=s[4]})}}}
function damageVan(M,v,amt,why){if(!v||!(amt>0)||v.st==='home')return;const c=v.c;c.hp=Math.max(0,c.hp-amt);M.cond[v.f.id]=c.hp/v.hpMax;
  if(c.hp<=0&&!M.wrecked[v.f.id]){M.wrecked[v.f.id]=true;v.st='out';if(v.m){v.m.st='out'}v.haz=true;const l=L.wrecked(v.crew);say(M,l[0],l[1],true);A().feed(v.f.fam+"' van is wrecked",'bad')}}
function routeTarget(M){const a=A(),C=M.C,LD=M.LEAD;if(M.ph==='convoy'&&(!M.pursuit||M.pursuit.gone)&&!M.shook){return LD.x>200?{x:R9.x-30,z:R9.z,label:'Route 9 west'}:{x:LIGHT.x,z:LIGHT.z,label:'Maple Heights'}}
  if(M.pursuit&&!M.pursuit.gone){if(C.head){const tail=tailOf(C);return tail?{x:tail.car.x,z:tail.car.z,label:'Your vans: get behind them'}:null}
    /* lose him round the block */const k=M.loopK||0,p=LOOP[k%LOOP.length];if(hyp(LD.x-p.x,LD.z-p.z)<12)M.loopK=k+1;return{x:p.x,z:p.z,label:'Round the block'}}
  const next=FLEET.filter(f=>M.vans[f.id].st==='convoy'&&!M.delivered[f.id]).sort((p,q)=>q.home.x-p.home.x)[0];return next?{x:next.home.x,z:next.home.z,label:next.fam+"' driveway"}:null}

/* ---------------- the light at Route 9 & Maple ---------------- */
function lightTick(M,dt){const L_=M.light;if(!M.signal)return;const LD=M.LEAD;
  /* the first time the convoy comes west at it, it turns yellow just as you reach it: run it, or stop and keep the line together */
  if(!L_.forced&&M.ph!=='gate'&&M.ph!=='lot'&&LD.x>LIGHT.x+LIGHT.stop&&LD.x-(LIGHT.x+LIGHT.stop)<K.yellowAt&&Math.abs(LD.z-41.5)<4&&LD.spd>3){L_.forced=true;L_.st='y';L_.t=0;L_.ew=true}
  L_.t+=dt;const dur=L_.st==='g'?K.lightG:L_.st==='y'?K.lightY:K.lightR;if(L_.t>=dur){L_.t=0;L_.st=L_.st==='g'?'y':L_.st==='y'?'r':'g'}
  signalSet(M.signal,L_.st);
  /* who crossed on what (yellow you ran, red you didn't) */
  const cross=(obj,key,isLead)=>{const was=M.lightSide&&M.lightSide[key],now=obj.x>LIGHT.x+LIGHT.stop-.3;(M.lightSide||(M.lightSide={}))[key]=now;
    if(was&&!now&&Math.abs(obj.z-43)<5){const st=L_.st;if(isLead){M.leadRan=st;M.leadRanT=M.t;if(st==='r'){M.ranRed++;if(cool(M,'ranRed',20))say(M,'gary',pick(L.ranRed),true)}}
      else if(st!=='g'){M.lastRun={key,t:M.t,st};if(st==='r'&&cool(M,'ylf',30))seq(M,L.yellowFollow,true)}}};
  cross(LD,'lead',true);for(const m of M.C.cars)cross(m.car,m.id,false)}
function stopFor(M,m){const L_=M.light;if(m.st==='head'&&false)return null;const c=m.car;if(L_.st==='g')return null;
  /* westbound on Route 9, short of the line */
  const line=LIGHT.x+LIGHT.stop,d=c.x-line-m.len/2;if(d<-.5||d>40||Math.abs(c.z-41.5)>3.5||Math.cos(c.yaw-Math.PI/2)<.5)return null;
  if(m.ranLight&&M.t-m.ranLight<4)return null;
  if(L_.st==='y'){/* running the yellow you ran: close behind the car in front that just went through */const p=M.C.pred(m);const pr=p&&(p===M.C.lead?M.leadRan==='y'&&M.t-M.leadRanT<2.5:M.lastRun&&M.lastRun.key===p.id&&M.t-M.lastRun.t<2.5);
    if(pr&&d<M.C.gapM()+9){m.ranLight=M.t;return null}const need=c.spd*c.spd/(2*7);if(d<need*.8){m.ranLight=M.t;return null}return d}
  if(m.st!=='hold'&&c.spd<.5&&d<6&&cool(M,'red'+m.id,40)&&M.t-(M.leadRanT||-9)<6){const v=M.vans[m.id];if(v){const l=L.stuckRed(v.crew);say(M,l[0],l[1])}}
  return d}
/* cross traffic on Maple's x=179: two LOD cars that drive on their green and yield to anything in the box */
function crossTick(M,dt){const a=A();if(M.ph==='gate'||M.ph==='lot')return;
  /* only for the first run at the light: once the line is through (or the chase sends everyone round the block) the street is ours */
  if(!M.crossDone&&(M.LEAD.x<150||M.C&&M.C.head||M.C&&M.C.cars.length&&M.C.cars.every(m=>m.st==='out'||m.car.x<LIGHT.x-8))){M.crossDone=true}
  if(M.crossDone){for(const c of M.cross){if(c.obj.parent)c.obj.parent.remove(c.obj);c.col.x0=c.col.z0=-1e4;c.col.x1=c.col.z1=-1e4+1}M.cross.length=0;return}if(!M.cross.length){for(const[k,dir]of[[0,1],[1,-1]]){const obj=lightCar(k?'sedan':'pickup',k?'#6d7378':'#d8d4c8');if(!obj)continue;a.wmAdd(obj);res().veh.push(obj);
      M.cross.push({obj,dir,x:dir>0?177.5:180.5,z:dir>0?-2+k*30:96-k*30,yaw:dir>0?Math.PI:0,v:0,col:a.wmCol({x0:-1e4,z0:-1e4,x1:-1e4+1,z1:-1e4+1})})}}
  const nsGreen=M.light.st==='r',box=(x,z)=>Math.abs(x-179)<5.5&&Math.abs(z-43)<5.5;const movers=[M.LEAD,...M.C.cars.map(m=>m.car)];if(M.pursuit&&M.pursuit.c)movers.push(M.pursuit.c);
  for(const c of M.cross){const line=43-c.dir*7.5,before=c.dir>0?c.z<line:c.z>line,dl=(line-c.z)*c.dir;let want=10.5;
    if(before&&dl<20&&(!nsGreen||movers.some(o=>box(o.x,o.z)||Math.abs(o.z-43)<4&&Math.abs(o.x-179)<14&&Math.abs(Math.sin(o.yaw||0))>.6)))want=Math.min(want,Math.sqrt(Math.max(0,2*6*(dl-1))));
    for(const o of movers){const ahead=(o.z-c.z)*c.dir;if(ahead>-3&&ahead<14&&Math.abs(o.x-c.x)<3.2)want=Math.min(want,Math.sqrt(Math.max(0,2*6*(ahead-5))))}
    c.v+=clamp(want-c.v,-8*dt,3*dt);c.z+=c.dir*c.v*dt;if(c.dir>0&&c.z>100)c.z=-6;if(c.dir<0&&c.z<-12)c.z=102;
    c.obj.position.set(c.x,a.groundAt(c.x,c.z),c.z);c.obj.rotation.set(0,c.yaw+Math.PI/2,0);Object.assign(c.col,{x0:c.x-1.05,x1:c.x+1.05,z0:c.z-2.3,z1:c.z+2.3,ph:1.5});
    const VM=window.HT&&HT.Vehicles;if(VM&&VM.update)try{VM.update(c.obj,{speed:c.v,steer:0,braking:want<c.v-.1,headlights:false,dt})}catch(_){}}}

/* ---------------- orders: 1 tighten up · 2 spread out · 3 hold / go · 4 go round (swap the lead) ---------------- */
function order(M,k){const a=A(),C=M.C;if(!C||(M.ph!=='convoy'&&M.ph!=='home'))return;M.orders++;M.orderTut=false;sfx.order();const sp=()=>{const ch=C.chain();const m=ch[1]||ch[0];return m&&M.vans[m.id]?M.vans[m.id].crew:'rick'};
  if(k===1){C.order('tight');say(M,sp(),pick(L.tight),true);a.feed('Convoy: tight (6 m)','info')}
  else if(k===2){C.order('spread');say(M,sp(),pick(L.spread),true);a.feed('Convoy: spread out (14 m)','info')}
  else if(k===3){if(C.holding){C.order('go');say(M,sp(),pick(L.go),true);a.feed('Convoy: rolling','info')}else{C.order('hold');say(M,sp(),pick(L.hold),true);a.feed('Convoy: holding','info')}}
  else if(k===4){if(!C.head){const first=C.chain()[1];if(!first||first.st==='park'||first.st==='join'){a.feed('Nobody in line behind you yet','bad');return}
      const route=headRoute(M,first.car);C.setLead(first,route);M.headId=first.id;seq(M,[[M.vans[first.id].crew,L.takeLead[0][1]]],true);a.feed('Convoy: '+CREW_NAME[M.vans[first.id].crew]+' leads, you sweep','info')}
    else{const h=C.head,LD=M.LEAD,f=fwd(h.car.yaw),ahead=(LD.x-h.car.x)*f[0]+(LD.z-h.car.z)*f[1],side=Math.abs(-(LD.x-h.car.x)*f[1]+(LD.z-h.car.z)*f[0]);
      if(ahead>4&&ahead<40&&side<6){C.leader(LD);M.headId=null;seq(M,L.backLead,true);a.feed('Convoy: you lead','info')}else{seq(M,L.needAhead,true)}}}}
function headRoute(M,c){const a=A(),G=a.roads();let tgt=null;
  if(M.pursuit&&!M.pursuit.gone){/* lose him round the block: the next corner of the loop */const k=M.headLoop==null?(M.headLoop=c.x>110?0:1):M.headLoop;tgt=LOOP[k%LOOP.length]}
  else{const next=FLEET.filter(f=>M.vans[f.id].st==='convoy'&&!M.delivered[f.id]).sort((p,q)=>hyp(p.home.x-c.x,p.home.z-c.z)-hyp(q.home.x-c.x,q.home.z-c.z))[0];tgt=next?{x:next.home.x+(next.home.side>0?2:2),z:43+next.home.side*1.5}:{x:120,z:41.5}}
  /* plan from a point ahead of its nose, so the route carries on forward instead of U-turning through its own line */
  const f=fwd(c.yaw),ah={x:c.x+f[0]*12,z:c.z+f[1]*12},r=G&&G.route(ah,tgt);return r&&r.points&&r.points.length>1?[{x:c.x,z:c.z},...r.points]:[{x:c.x,z:c.z},tgt]}
function ordersTick(M,dt,F){const a=A(),C=M.C;if(!C)return;
  if(C.head){/* keep the head's route fresh: loop corners while he's chased, driveways after */const h=C.head;M.headT=(M.headT||0)-dt;const end=h.route&&h.route[h.route.length-1];
    if(M.headT<=0||!end||hyp(h.car.x-end.x,h.car.z-end.z)<8){M.headT=6;if(end&&hyp(h.car.x-end.x,h.car.z-end.z)<8&&M.headLoop!=null)M.headLoop++;C.headRoute(headRoute(M,h.car))}}
  if(M.orderTut&&M.t-(M.convT0||M.t)>14&&once(M,'ordersTry'))seq(M,L.ordersTry)}
/* key capture for the orders and the relay panel (capture phase, only while they're live, so 1-3 don't switch guns) */
let KEYB=false;
function bindKeys(){if(KEYB||typeof document==='undefined'||!document.addEventListener)return;KEYB=true;
  document.addEventListener('keydown',ev=>{const a=A(),M=a&&a.M;if(!M||M.def.id!==ID||M.state!=='go'||ev.repeat)return;const k=(ev.key||'').toLowerCase(),n=['1','2','3','4'].indexOf(k);if(n<0)return;
    if(M.relay){if(n<3){relayKey(M,n);ev.stopPropagation();ev.preventDefault()}return}
    if((M.ph==='convoy'||M.ph==='home')&&a.CV){order(M,n+1);ev.stopPropagation();ev.preventDefault()}},true)}
bindKeys();
/* everything this job made goes when it stops running (won, lost, left), not at the next start */
J.on('pose',()=>{if(!RES)return;const a=A();if(!a)return;const M=a.M;if(a.mode==='mission'&&M&&M.def&&M.def.id===ID&&M.state==='go')return;freeAll()});

/* ---------------- the pursuit: a grey sedan after the back van ---------------- */
function pursuitTick(M,dt,F){const a=A(),C=M.C,CA=a.CarAI(),G=a.roads();
  if(!M.pursuit&&M.ph==='convoy'&&!M.shook){const inl=C.cars.filter(m=>m.st==='line'||m.st==='lag'||m.st==='hold'||m.st==='head');if(M.LEAD.z<50&&M.LEAD.x<240&&inl.length>=Math.min(2,C.cars.length)&&(!C.cars.some(m=>m.st==='park'||m.st==='join')||M.LEAD.x<215)){M.pursueT=(M.pursueT||0)+dt;if(M.pursueT>K.pursueAt)pursuitBegin(M)}}
  const p=M.pursuit;if(!p||p.gone)return;const c=p.c;p.t+=dt;
  const line=C.chain().filter(m=>m!==C.lead&&ROLL[m.st]),tail=line[line.length-1];
  if(p.st==='flee'){p.fleeT=(p.fleeT||0)+dt;CA.step(c,dt,{G,collide:vanCollide(M)});syncPursuer(M,p,dt);const pr=a.project?a.project(c.x,1,c.z):null,off=!pr||pr.behind||pr.x<-60||pr.x>innerWidth+60;if(hyp(c.x-M.LEAD.x,c.z-M.LEAD.z)>K.giveUpD||p.fleeT>8&&off||p.fleeT>25){p.gone=true;dropPursuer(M,p);pursuitDone(M)}return}
  if(!tail){p.shake=100}
  /* chase the back van's trail (or a road route to it); slide out to pass whoever's blocking */
  let pts=null,arc=0;if(tail){const cr=tail.crumbs;let j=0,bd=1e9;for(let i=0;i<cr.length;i++){const d=(cr[i].x-c.x)**2+(cr[i].z-c.z)**2;if(d<bd){bd=d;j=i}}
    if(Math.sqrt(bd)<8){pts=cr.slice(Math.max(0,j-1));pts.push({x:tail.car.x,z:tail.car.z});for(let i=1;i<pts.length;i++)arc+=hyp(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z)}
    else{p.rT-=dt;if(!p.route||p.rT<=0){p.rT=1.2;const r=G&&G.route({x:c.x,z:c.z},{x:tail.car.x,z:tail.car.z});p.route=r&&r.points&&r.points.length>1?r.points:[{x:c.x,z:c.z},{x:tail.car.x,z:tail.car.z}]}pts=p.route;arc=hyp(tail.car.x-c.x,tail.car.z-c.z)}}
  else pts=[{x:c.x,z:c.z},{x:c.x+fwd(c.yaw)[0]*5,z:c.z+fwd(c.yaw)[1]*5}];
  /* passing offset: away from the side your car is on */
  const LD=M.LEAD,f=fwd(c.yaw),dx=LD.x-c.x,dz=LD.z-c.z,along=dx*f[0]+dz*f[1],side=-dx*f[1]+dz*f[0];const inLane=along>0&&along<K.blockD&&Math.abs(side)<2.4&&a.CV;
  if(inLane){p.blockT+=dt;if(p.blockT>1.1&&!p.passT){p.lat=side>0?-2.6:2.6;p.passT=2.4}}else p.blockT=Math.max(0,p.blockT-dt*2);
  if(p.passT){p.passT=Math.max(0,p.passT-dt);if(!p.passT)p.lat=0}p.latK+=(p.lat-p.latK)*Math.min(1,dt*1.6);
  if(Math.abs(p.latK)>.05&&pts.length>1){const o=[];for(let i=0;i<pts.length;i++){const A_=pts[Math.max(0,i-1)],B=pts[Math.min(pts.length-1,i+1)],l=hyp(B.x-A_.x,B.z-A_.z)||1,nx=-(B.z-A_.z)/l,nz=(B.x-A_.x)/l;o.push({x:pts[i].x+nx*p.latK,z:pts[i].z+nz*p.latK})}pts=o}
  /* speed: close the gap fast, then harass: nose in, tap, back off */
  let v=arc>60?K.chaseFar:K.chase;if(tail){const tv=Math.max(0,tail.car.spd||0);if(arc<12){p.harT-=dt;v=p.harT>0?tv-1.5:tv+3.2;if(p.harT<-2.2)p.harT=2.6}}
  if(inLane){/* you're in his way: he brakes for you (and gets angry) */const g=Math.max(0,along-4.6);v=Math.min(v,Math.max(0,LD.spd)+Math.sqrt(Math.max(0,2*6*(g-.4))));if(M.t-p.blockSay>7){p.blockSay=M.t;if(Math.random()<.5)say(M,'rick',pick(L.blocking))}}
  if(!c.ai||c.ai.mode!=='follow')CA.follow(c,pts,{speed:v,turnSpeed:8});c.ai.pts=pts;c.ai.tr={i:0};c.ai.speed=v;c.ai.done=false;
  CA.step(c,dt,{collide:vanCollide(M),canSnap:()=>true});
  /* contact with the vans: he takes a bite, they take damage */
  for(const m of line){const hp0=m.car.hp;const r=CA.ram(c,m.car);if(!r)continue;m.car.hp=hp0;const v_=M.vans[m.id];if(r.vn>2&&M.t-(v_.hitT||-9)>.9){v_.hitT=M.t;damageVan(M,v_,Math.min(9,(r.vn-2)*2.6+2),'pursuer');sfx.thud(r.vn);if(cool(M,'tap'+m.id,8)){const l=L.tapped(v_.crew);say(M,l[0],l[1],true)}}}
  /* shaking him: you in his lane, close behind the line */
  if(inLane&&tail&&hyp(c.x-tail.car.x,c.z-tail.car.z)<45&&hyp(c.x-tail.car.x,c.z-tail.car.z)>hyp(c.x-LD.x,c.z-LD.z)+2){p.shake=Math.min(100,p.shake+K.shakeBlock*dt);M.blocks+=dt}else p.shake=Math.max(0,p.shake-K.shakeDecay*dt);
  if(c.hp<=0)p.shake=100;
  if(p.shake>=100){p.st='flee';say(M,'Thief',L.shaken[0][1],true);say(M,'rick',L.shaken[1][1]);CA.flee(c,G,{threat:{x:LD.x,z:LD.z},max:16,seed:5});a.feed('Pursuit shaken','trust');music('tension',.3)}
  syncPursuer(M,p,dt)}
const ROLL={line:1,lag:1,hold:1,head:1};
const tailOf=C=>{const l=C.chain().filter(m=>m!==C.lead&&ROLL[m.st]);return l[l.length-1]||null};
function pursuitBegin(M){const a=A(),CA=a.CarAI();const obj=a.makeVehicle('sedan','#596068',{rims:'stock'})||a.makeVanBox('#596068');a.wmAdd(obj);if(obj.userData&&obj.userData.dispose)res().veh.push(obj);
  const c=CA.make('sedan',{x:262,z:44.6,yaw:Math.PI/2});c.stats=Object.assign({},c.stats,{brake:20});c.len=4.6;
  M.pursuit={obj,c,st:'chase',t:0,shake:0,lat:0,latK:0,passT:0,blockT:0,harT:2,rT:0,route:null,blockSay:0,col:a.wmCol({x0:-1e4,z0:-1e4,x1:-1e4+1,z1:-1e4+1}),gone:false};
  seq(M,M.C.head?L.pursuit.slice(0,1):L.pursuit,true);setTimeout0(M,6,()=>seq(M,L.thief));music('combat',.65);a.feed('A grey sedan is after the vans','bad')}
function syncPursuer(M,p,dt){const a=A(),c=p.c;p.obj.position.set(c.x,a.groundAt(c.x,c.z),c.z);p.obj.rotation.set(0,c.yaw+Math.PI/2,0);
  const VM=window.HT&&HT.Vehicles;if(VM&&VM.update)try{VM.update(p.obj,{speed:c.spd,steer:c.steer||0,braking:(c.ai&&c.ai.speed<c.spd-.5),headlights:false,dt})}catch(_){}
  if(!a.CV){const hl=2.35,hw=1.0,s=Math.abs(Math.sin(c.yaw)),co=Math.abs(Math.cos(c.yaw));Object.assign(p.col,{x0:c.x-(s*hl+co*hw),x1:c.x+(s*hl+co*hw),z0:c.z-(co*hl+s*hw),z1:c.z+(co*hl+s*hw),ph:1.5,ob:{x:c.x,z:c.z,fx:-Math.sin(c.yaw),fz:-Math.cos(c.yaw),hl,hw}})}
  else{p.col.x0=p.col.z0=-1e4;p.col.x1=p.col.z1=-1e4+1;p.col.ob=null}}
function dropPursuer(M,p){if(p.obj.parent)p.obj.parent.remove(p.obj);p.col.x0=p.col.z0=-1e4;p.col.x1=p.col.z1=-1e4+1;p.col.ob=null}
function pursuitDone(M){const a=A();M.shook=true;if(M.ph==='convoy'){M.ph='home';a.CP.mark('home')}}

/* ---------------- deliveries: each van peels off at its own driveway, the family comes out ---------------- */
function deliveriesTick(M,dt,F){const a=A(),C=M.C;if(M.pursuit&&!M.pursuit.gone){for(const f of FLEET){const v=M.vans[f.id];if(v.st==='convoy'&&hyp(v.c.x-f.home.x,v.c.z-f.home.z)<K.peelR&&cool(M,'noDel',30))seq(M,L.noDeliver,true)}return}
  if(M.shook&&M.ph==='convoy'){M.ph='home';a.CP.mark('home')}
  for(const f of FLEET){const v=M.vans[f.id];if(v.st!=='convoy'||!v.m||v.m.st==='park'||v.m.st==='join'||v.m.st==='out')continue;
    if(hyp(v.c.x-f.home.x,v.c.z-f.home.z)<K.peelR&&Math.abs(v.c.z-43)<6){/* peel off */const wasHead=C.head===v.m;C.remove(v.m);v.m=null;v.st='peel';
      if(wasHead){const nx=C.cars.find(m=>m.st!=='out');if(nx){C.setLead(nx,headRoute(M,nx.car));M.headId=nx.id}else C.leader(M.LEAD)}
      const s=f.home,up=s.side<0?-1:1,approach={x:s.x+7,z:43+up*1.6},pts=[{x:v.c.x,z:v.c.z},{x:Math.max(s.x+9,Math.min(v.c.x,s.x+14)),z:43+up*1.4},approach,{x:s.x+2.5,z:s.z},{x:s.x-1.2,z:s.z}];
      v.peel={pts,t:0};const CA=a.CarAI();CA.follow(v.c,pts,{speed:4.2,turnSpeed:3.5});const l=L.peel(v.crew,f.fam);say(M,l[0],l[1],true);famSpawn(M,f)}}}
function peelTick(M,v,dt){const a=A(),CA=a.CarAI();v.peel.t+=dt;CA.step(v.c,dt,{collide:vanCollide(M)});
  if(v.c.ai&&v.c.ai.done||v.peel.t>16){v.c.spd=0;v.st='home';v.haz=false;M.delivered[v.f.id]=true;const fr=clamp(v.c.hp/v.hpMax,0,1);M.cond[v.f.id]=fr;
    try{a.addTrust(+(K.trustVan*fr).toFixed(2),'maple')}catch(_){}a.feed(v.f.fam+"' van is home",'trust','+'+(K.trustVan*fr).toFixed(1)+' trust · '+Math.round(fr*100)+'%');sfx.cheer();famReact(M,v,fr);
    if(v.drv){v.drvOut={d:v.drv,t:0};v.drv=null}
    if(FLEET.every(f=>M.vans[f.id].st==='home'||M.vans[f.id].st==='out'||!M.started[f.id]||M.vans[f.id].st==='bay'))wrapBegin(M)}}
function famSpawn(M,f){if(M.fam[f.id])return;const s=f.home,zL=s.side<0?s.z-2.4:s.z+2.4,face=s.side<0?0:Math.PI;const ppl=[];
  f.people.forEach((k,i)=>{const d=person(k,null,s.x-1.5+i*1.6,zL,face);if(d)ppl.push(d)});M.fam[f.id]={ppl,t:0,f,react:null}}
function famReact(M,v,fr){const fm=M.fam[v.f.id];if(!fm)famSpawn(M,v.f);const F_=M.fam[v.f.id];F_.react={t:0,fr};
  say(M,v.f.parent,pick(fr>=.9?L.famGood:fr>=.6?L.famOk:L.famBad),true);if(v.f.kid&&F_.ppl.length>1)say(M,v.f.kid,pick(L.kid))}
function familiesTick(M,dt){for(const id in M.fam){const fm=M.fam[id],v=M.vans[id];fm.t+=dt;
    fm.ppl.forEach((d,i)=>{const r=d.root.position;if(fm.react&&fm.react.t<1.2&&i===0)wave(d);faceTo(d,v.c.x,v.c.z,dt);pose(d,dt,{moving:false,aim:false,mode:'stand'})});if(fm.react)fm.react.t+=dt;
    if(v&&v.drvOut){const o=v.drvOut;o.t+=dt;const s=v.f.home,to={x:s.x+1.2+(o.t>3?2:0),z:s.side<0?s.z-2.2:s.z+2.2};if(o.t<.4){/* climb out */const dr=vanDoor(v);o.d.root.position.set(dr.x,A().groundAt(dr.x,dr.z),dr.z)}else walkTo(o.d,to,1.3,dt)}}}

/* ---------------- chatter: the crew on your driving and each other's ---------------- */
function chatterTick(M,dt){const a=A(),C=M.C,LD=M.LEAD;if(!C)return;
  if(a.CV&&!C.head&&LD.spd>K.speedNag&&C.cars.some(m=>m.st==='line'||m.st==='lag')&&cool(M,'fast',22)){const ch=C.chain();say(M,(ch[1]&&M.vans[ch[1].id]&&M.vans[ch[1].id].crew)||'rick',pick(L.fast))}
  M.chat-=dt;if(M.chat<=0&&!M.q.length){M.chat=26+Math.random()*16;if(!M.pursuit||M.pursuit.gone){const k=(M.idleK=(M.idleK||0)+1)%L.idle.length;seq(M,L.idle[k])}}
  if(M.leadRan==='y'&&M.t-M.leadRanT<.2&&C.cars.some(m=>m.st==='line'&&m.car.x>LIGHT.x+LIGHT.stop)&&cool(M,'split',30))setTimeout0(M,2.2,()=>{if(M.C.cars.some(m=>m.car.x>LIGHT.x+LIGHT.stop&&m.car.spd<.5))say(M,'rick',pick(L.yellowSplit))})}

/* ---------------- wrap: Marcy at the last driveway ---------------- */
function wrapBegin(M){if(M.wrapT>=0)return;const a=A();M.wrapT=0;M.ph='wrap';seq(M,L.marcy,true);music('victory');sfx.cheer();
  const last=FLEET.filter(f=>M.delivered[f.id]).sort((p,q)=>p.home.x-q.home.x)[0]||FLEET[0];const s=last.home;M.marcy=person('nb_office',null,s.x-3.5,s.side<0?s.z-2.8:s.z+2.8,0)}
function wrapTick(M,dt,F){M.wrapT+=dt;if(M.marcy){faceTo(M.marcy,A().P.pos.x,A().P.pos.z,dt);pose(M.marcy,dt)}F.objs.push(['Every van home. Bring it in.',true]);if(M.wrapT>7.5)A().endMission(true)}

/* ---------------- per-frame van visuals: drivers, blinkers, hazards, brake lights ---------------- */
function vansVisual(M,dt){M.blinkT=(M.blinkT||0)+dt;const on=(M.blinkT*1.6)%1<.5;if(on!==M.blinkOn){M.blinkOn=on;const any=Object.values(M.vans).some(v=>v.m&&v.m.signal);if(any&&A().CV)sfx.tick(on)}
  for(const id in M.vans){const v=M.vans[id];const m=v.m;v.brake=!!(m&&m.want!=null&&m.want<v.c.spd-.4)||v.st==='bay';syncVan(v,dt);
    const sig=m&&(v.st==='convoy')?m.signal:v.st==='peel'?(v.f.home.side<0?-1:1):0;if(v.blink){for(const b of v.blink.L)b.visible=on&&sig>0;for(const b of v.blink.R)b.visible=on&&sig<0}
    const haz=v.haz||(m&&(m.st==='wait'||m.st==='hold'))||v.st==='out';if(haz!==v.hazOn){v.hazOn=haz;try{v.obj.userData.setHazard&&v.obj.userData.setHazard(haz)}catch(_){}}
    if(v.drv)seat(v.drv,v.c,dt)}}

/* ---------------- HUD: meters, the clock, the convoy panel ---------------- */
function hudTick(M,dt,F,left){const a=A(),C=M.C;const clk=new Date(0);const s=Math.max(0,left),mm=Math.floor(s/60),ss=Math.floor(s%60);
  F.widgets.push({id:'noon',kind:'timer',label:'Kickoff',v:s,hot:s<60,sub:'11:'+String(59-mm).padStart(2,'0')+' now'});
  if(M.ph==='lot'||M.ph==='gate'){if(M.S&&!M.alarm&&M.ph==='lot')F.meters.push({id:'eye',label:'Seen',v:M.S.max(),max:1,style:'ring',icon:'eye'});F.meters.push({id:'found',label:'Vans',v:Object.keys(M.started).length,max:5,style:'pips',icon:'car'})}
  else if(C){const line=C.cars.filter(m=>m.st==='line'||m.st==='lag'||m.st==='head'||m.st==='hold').length;F.meters.push({id:'line',label:'In line',v:line,max:Math.max(1,C.cars.length),style:'pips',icon:'car'});
    if(M.pursuit&&!M.pursuit.gone)F.meters.push({id:'shake',label:'Shake him',v:M.pursuit.shake,max:100,style:'bar',marker:100,sub:C.head?'block his lane':'press 4'});
    else F.meters.push({id:'home',label:'Home',v:Object.keys(M.delivered).length,max:Object.values(M.vans).filter(v=>v.st!=='bay').length||5,style:'pips',icon:'star'})}}
function panelTick(M){const a=A();if(!M.C||M.ph==='gate'||M.ph==='lot'){if(M.panel){try{a.overlay('roundup-panel',null)}catch(_){}M.panel=null}return}
  if(!M.panel){const el=document.createElement('div');el.style.cssText='position:absolute;left:14px;top:50%;transform:translateY(-38%);width:208px;font:600 12px/1.25 system-ui,Arial;color:#eef2f6;pointer-events:none';
    el.innerHTML='<div style="background:rgba(16,20,26,.72);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:9px 10px 8px"><div style="letter-spacing:.09em;font-size:10.5px;opacity:.7;margin-bottom:6px">CONVOY · <span class="ru-gap"></span></div><div class="ru-rows"></div>'+
      '<div class="ru-ord" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:7px;pointer-events:auto"></div></div>';
    const ord=el.querySelector('.ru-ord');[['1','Tighten'],['2','Spread'],['3','Hold'],['4','Go round']].forEach(([k,t],i)=>{const b=document.createElement('button');b.type='button';b.dataset.k=k;
      b.style.cssText='padding:5px 4px;border-radius:7px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;font:700 11px system-ui,Arial;cursor:pointer;text-align:left';
      b.innerHTML='<b style="display:inline-block;min-width:15px;text-align:center;border:1px solid rgba(255,255,255,.45);border-radius:4px;margin-right:5px">'+k+'</b><span>'+t+'</span>';b.addEventListener('pointerdown',ev=>{ev.preventDefault();order(M,i+1)});ord.appendChild(b)});
    M.panel=el;a.overlay('roundup-panel',el);if(!res().ov.includes('roundup-panel'))res().ov.push('roundup-panel')}
  const C=M.C,rows=[];const ch=C.chain();
  const lab={line:'in line',lag:'catching up',wait:'LOST · waiting',hold:'holding',head:'leading',park:'starting',join:'pulling out',out:'wrecked'};
  for(const f of FLEET){const v=M.vans[f.id];if(v.st==='bay'&&!v.m)continue;const st=v.st==='home'?'home':v.st==='peel'?'turning in':v.st==='out'?'wrecked':v.m?lab[v.m.st]||v.m.st:'';const fr=clamp(v.c.hp/v.hpMax,0,1);
    rows.push('<div style="display:flex;align-items:center;gap:6px;margin:3px 0"><span style="width:9px;height:9px;border-radius:50%;background:'+f.col+';box-shadow:0 0 0 1px rgba(0,0,0,.5)"></span><span style="flex:1;white-space:nowrap;overflow:hidden">'+f.fam+' <span style="opacity:.6">· '+CREW_NAME[v.crew||'rick']+'</span><br><span style="opacity:.7;font-weight:500;color:'+(st.startsWith('LOST')||st==='wrecked'?'#ff8a7a':st==='home'?'#8ef0a8':'#cfd8e3')+'">'+st+'</span></span>'+
      '<span style="width:34px;height:5px;border-radius:3px;background:rgba(255,255,255,.15);overflow:hidden"><i style="display:block;height:100%;width:'+Math.round(fr*100)+'%;background:'+(fr>.7?'#7be08f':fr>.4?'#f2c230':'#ff6a5a')+'"></i></span></div>')}
  const html=rows.join(''),gap=(C.holding?'HOLDING · ':'')+(C.gap==='tight'?'TIGHT':C.gap==='spread'?'SPREAD':'NORMAL')+(C.head?' · '+CREW_NAME[M.vans[C.head.id].crew].toUpperCase()+' LEADS':'');
  if(M.panelHtml!==html){M.panelHtml=html;M.panel.querySelector('.ru-rows').innerHTML=html}const g=M.panel.querySelector('.ru-gap');if(g.textContent!==gap)g.textContent=gap}

/* ================= [CP] restore ================= */
function applyLoad(M,s){const a=A();M.ph=s.ph||'gate';M.scam=s.scam||null;M.alarm=!!s.alarm;M.fee=!!s.fee;M.feeBack=!!s.feeBack;M.alumni=!!s.alumni;M.ties=s.ties||0;M.clock=s.clock||0;M.orders=s.orders||0;
  const set=arr=>{const o={};for(const k of arr||[])o[k]=true;return o};M.found=set(s.found);M.started=set(s.started);M.cleared=set(s.cleared);M.delivered=set(s.delivered);M.wrecked=set(s.wrecked);M.cond=Object.assign({},s.cond||{});M.shook=!!s.shook;
  if(s.barrier)M.barrierOpen=true,M.barrierK=1;if(s.broken)M.barrierBroken=true;M.attAt=true;
  if(M.scam&&M.att){vanish(M.att);M.att=null}
  if(M.alarm&&M.S){try{M.S.release()}catch(_){}}
  for(const id in M.blk){if(M.cleared[id]){const k=M.blk[id],p=k.f.boxed.push;k.c.x=k.x0+p[0]*5.4;k.c.z=k.z0+p[1]*5.4;k.done=true;syncBlk(k)}}
  for(const id in M.vans){if(M.found[id])glow(M.vans[id],!M.started[id])}
  /* the crew who were driving get their vans back (out of the squad again) */
  const drivers=CREW.slice();for(const f of FLEET){if(!M.started[f.id])continue;const v=M.vans[f.id];const who=drivers.shift();v.crew=who;
    if(who==='earl'){const d=ready('earl')?person('earl',null,v.c.x,v.c.z,0):null;if(d)v.drv=d;else v.walk={who:'earl',d:null,from:vanDoor(v)}}
    else{const al=a.allies.find(x=>x.id===who);if(al){const i=a.allies.indexOf(al);a.allies.splice(i,1);if(al.tag){al.tag.remove();al.tag=null}al.ride=false;al.dude.root.visible=true;try{a.wmAdd(al.dude.root)}catch(_){}v.drv=al.dude}
      else{const look=a.HOMIES[who];if(look){const d=a.makeDude(look);a.wmAdd(d.root);v.drv=d}}}}
  for(const f of FLEET)if(M.delivered[f.id]){const v=M.vans[f.id];v.st='home';v.c.x=f.home.x-1.2;v.c.z=f.home.z;v.c.yaw=f.home.yaw;v.c.hp=(M.cond[f.id]||1)*v.hpMax;famSpawn(M,f);if(v.drv){v.drvOut={d:v.drv,t:9};v.drv=null}}
  for(const f of FLEET)if(M.wrecked[f.id]){M.vans[f.id].st='out';M.vans[f.id].haz=true}
  if(M.ph==='convoy'||M.ph==='home'){M.noGuns=L.noGuns;if(M.S){try{M.S.release()}catch(_){}}if(M.viz){try{M.viz.dispose()}catch(_){}M.viz=null}if(M.shud){try{M.shud.dispose()}catch(_){}M.shud=null}try{a.overlay('roundup-stealth',null)}catch(_){}
    for(const g of M.guards){if(g.e.state==='idle'){vanish(g.e)}}
    const e=M.car;/* back at the gate (convoy) or wherever the line was (home) */
    if(M.ph==='convoy'&&!s.conv||M.ph==='convoy'){for(const f of FLEET){const v=M.vans[f.id];if(M.started[f.id]&&!M.delivered[f.id]&&!M.wrecked[f.id]){v.st='convoy';v.c.x=f.bay.x;v.c.z=f.bay.z;v.c.yaw=f.bay.yaw;v.c.hp=(M.cond[f.id]!=null?M.cond[f.id]:1)*v.hpMax;v.m=M.C.add(v.c,{id:f.id,name:v.crew,join:JOIN[f.id].map(p=>({x:p[0],z:p[1]}))})}}
      M.pursuit=null;M.pursueT=0}
    else{const by={};for(const r of(s.conv&&s.conv.cars)||[])by[r.id]=r;
      for(const f of FLEET){const v=M.vans[f.id],r=by[f.id];if(!M.started[f.id]||M.delivered[f.id]||M.wrecked[f.id])continue;v.st='convoy';if(r){v.c.x=r.x;v.c.z=r.z;v.c.yaw=r.yaw;v.c.hp=r.hp}v.m=M.C.add(v.c,{id:f.id,name:v.crew});v.m.st='line'}
      if(s.conv){M.C.gap=s.conv.gap||'normal'}M.pursuit=null;M.shook=true}
    M.convT0=M.t}
  if(M.ph==='lot'&&!M.alarm)stashCrew(M);
  M.LEAD.x=M.car?M.car.pos.x:M.LEAD.x;M.LEAD.z=M.car?M.car.pos.z:M.LEAD.z;M.C.leader(M.LEAD);M.C.lead.crumbs=[{x:M.LEAD.x,z:M.LEAD.z}];
  for(const id in M.vans)syncVan(M.vans[id],0)}

/* ================= the scripted player (dev/jobs-check.js) =================
   It plays the job the way a person would, with a few teleports between safe moments: talks to the attendant (Rick), walks the
   rows past each van's front, does each relay with the right keys, shoves both hatchbacks with the van, leads the convoy out,
   swaps the lead when the sedan shows up and blocks it, then sweeps behind the line while the vans peel off to their driveways.
   opts.fail: talks its way in, then drives the van into the fence until it breaks down (a retry from 'lot'). */
function bot(a,t,o){const M=a.M,P=a.P,k=a.keys;if(!M||M.state!=='go'||M.def.id!==ID||!M.built)return null;const B=M.bot||(M.bot={t:0,phase:'',drive:null,stuck:0});B.t++;
  for(const x of['w','a','s','d'])k[x]=false;a.useTap=false;k.e=false;
  const tp=(x,z)=>{P.pos.set(x,0,z);a.collide(P.pos,.35)};
  /* drive toward (x,z) at speed want; returns the distance */
  const drive=(x,z,want,rev)=>{const e=a.CV;if(!e)return 1e9;const dx=x-e.pos.x,dz=z-e.pos.z,d=hyp(dx,dz);let er=wrap(yawTo(dx,dz)-e.yaw);if(rev)er=wrap(er+Math.PI);
    const sp=e.car?e.car.spd:e.spd;if(rev){k.s=sp>-want;k.w=sp<-want-1.5;k.a=er<-.06;k.d=er>.06}else{k.w=sp<want;k.s=sp>want+1.6;k.a=er>.06;k.d=er<-.06}
    if(Math.abs(sp)<.4&&want>1){B.stuck++;if(B.stuck>150){B.stuck=0;e.pos.x+=Math.cos(e.yaw)*.0+(-Math.sin(e.yaw))*1.5;e.pos.z+=-Math.cos(e.yaw)*1.5;a.owStopCar(e);a.syncCar(e)}}else B.stuck=0;return d};
  const routeTo=(x,z,want)=>{const e=a.CV;if(!e)return 1e9;const G=a.roads();if(!B.rt||B.rtK!==Math.round(x)+','+Math.round(z)||B.t%90===0){const r=G.route({x:e.pos.x,z:e.pos.z},{x,z});B.rt=r?r.points:[{x,z}];B.rtK=Math.round(x)+','+Math.round(z);B.wi=1}
    const pts=B.rt;while(B.wi<pts.length-1&&hyp(pts[B.wi].x-e.pos.x,pts[B.wi].z-e.pos.z)<6)B.wi++;const w=pts[Math.min(B.wi,pts.length-1)];const d=hyp(x-e.pos.x,z-e.pos.z);
    const turn=B.wi<pts.length-1?Math.abs(wrap(yawTo(pts[B.wi+1].x-w.x,pts[B.wi+1].z-w.z)-yawTo(w.x-e.pos.x,w.z-e.pos.z))):0;drive(w.x,w.z,turn>.6&&hyp(w.x-e.pos.x,w.z-e.pos.z)<14?6:want);return d};
  /* ---- the gate ---- */
  if(M.ph==='gate'){if(!M.scam){if(M.choices&&M.choices.pick&&!M.choices.closed&&t%20===0){try{M.choices.pick(2)}catch(_){pickScam(M,'coach')}}return null}
    if(!M.barrierOpen&&!M.barrierBroken){if(a.CV){a.exitCar();return null}tp(BOOTH_E.x-.6,BOOTH_E.z+.6);a.useTap=true;return null}
    if(!a.CV){tp(M.car.pos.x+1,M.car.pos.z-1.5);a.useTap=true;return null}
    drive(266,64,4);return null}
  if(M.ph==='lot'){
    if(o.fail){if(!a.CV){tp(M.car.pos.x+1,M.car.pos.z-1.5);a.useTap=true;return null}if(t%10===0&&a.crash)a.crash(a.CV,30);return null}
    /* first, quietly: zip-tie the guards and the lookout from behind (a careful player's way in) */
    const g=M.alarm?null:(M.guards||[]).filter(x=>!x.att&&x.e.state!=='cuffed'&&x.e.state!=='dead').sort((p,q)=>(q.look?1:0)-(p.look?1:0))[0];if(g&&M.S){const e=g.e,y=e.dude?e.dude.root.rotation.y:0,bp={x:e.pos.x-Math.sin(y)*1.0,z:e.pos.z-Math.cos(y)*1.0,stance:'crouch',lit:1};
      const near=hyp(P.pos.x-bp.x,P.pos.z-bp.z)<1.6;if(!near&&(M.S.state(g.id)!=='calm'||M.S.probe(bp).v>0)){if(!a.CV)P.crouch=true;return null}/* wait for a moment nobody's looking */
      if(a.CV){a.exitCar();return null}P.crouch=true;tp(bp.x,bp.z);P.yaw=Math.atan2(-(e.pos.x-P.pos.x),-(e.pos.z-P.pos.z));k.e=true;return null}
    P.crouch=false;
    /* walk the rows (on foot), relays */
    if(M.relay){const R=M.relay;if(!R.done&&t%6===0){const want=R.wires[R.i],n=R.terms.indexOf(want);relayKey(M,n)}return null}
    const todo=FLEET.find(f=>!M.started[f.id]);if(todo){if(a.CV){if(Math.abs(a.CV.car?a.CV.car.spd:0)>1){k.s=true;return null}a.exitCar();return null}const v=M.vans[todo.id],fp=vanFront(v);tp(fp.x+(fwd(v.c.yaw)[0]*.3),fp.z+fwd(v.c.yaw)[1]*.3);if(M.found[todo.id])a.useTap=true;return null}
    /* crew walking to the doors: wait */
    if(FLEET.some(f=>M.vans[f.id].walk))return null;
    /* the hatchbacks: get the van, line up west of it, nudge it east */
    const bk=Object.values(M.blk).find(x=>!x.done);if(bk){const e=M.car;if(!a.CV){tp(e.pos.x+1,e.pos.z-1.5);a.useTap=true;return null}
      const tgt={x:bk.c.x-5.2,z:bk.c.z};if(!B.lined||B.lined!==bk){/* put the van behind it, nose east (a person would reverse out and line up) */const ee=a.CV;ee.pos.set(tgt.x,0,tgt.z);ee.yaw=-Math.PI/2;a.owStopCar(ee);a.syncCar(ee);B.lined=bk;return null}
      drive(bk.c.x+6,bk.c.z,2.8);return null}
    /* the barrier (if the alarm dropped it): the booth button */
    if(!M.barrierOpen&&!M.barrierBroken){if(a.CV){a.exitCar();return null}tp(263.2,60.6);a.useTap=true;return null}
    /* out the gate */
    if(!a.CV){tp(M.car.pos.x+1,M.car.pos.z-1.5);a.useTap=true;return null}
    if(!B.outA){/* (a person would three-point-turn out of the aisle; the bot just appears at the end of aisle 1 facing the gate) */const ee=a.CV;if(ee.pos.x>261){ee.pos.set(264,0,63.8);ee.yaw=Math.PI/2;a.owStopCar(ee);a.syncCar(ee)}B.outA=true;return null}
    drive(244,64,6);return null}
  /* ---- convoy, pursuit, driveways ---- */
  const C=M.C,e=a.CV;if(!e){tp(M.car.pos.x+1,M.car.pos.z-1.5);a.useTap=true;return null}
  const parked=C.cars.some(m=>m.st==='park'||m.st==='join');const sp=e.car?e.car.spd:0;
  if(o.fail){if(t%10===0&&a.crash)a.crash(e,30);return null}
  if(M.ph==='wrap'){k.s=sp>.3;return null}
  if(M.pursuit&&!M.pursuit.gone){if(!C.head){/* hand Rick the lead (once the line has formed), then pull aside */if(!parked&&C.chain()[1]&&C.chain()[1].st==='line'&&!B.swapAsk){B.swapAsk=true;order(M,4)}if(parked){k.s=sp>.3;return null}if(C.head){B.aside=60}drive(e.pos.x-10,e.pos.z-3.5,4);return null}
    if(B.aside>0){B.aside--;k.s=sp>.5;return null}
    const lostV=C.cars.find(m=>m.st==='wait');if(lostV){/* go back for him */const d=drive(lostV.car.x,lostV.car.z,8);if(d>30||B.stuck>60){e.pos.set(lostV.car.x+fwd(lostV.car.yaw)[0]*12,0,lostV.car.z+fwd(lostV.car.yaw)[1]*12);a.owStopCar(e);a.syncCar(e)}return null}
    /* sweep: sit right behind the last van, in his lane */const tail=tailOf(C);if(tail){const f=fwd(tail.car.yaw),tg={x:tail.car.x-f[0]*8.5,z:tail.car.z-f[1]*8.5};const d=hyp(tg.x-e.pos.x,tg.z-e.pos.z);drive(tg.x,tg.z,Math.max(0,Math.min(16,(tail.car.spd||0)+(d-1)*.9)));
      if(d>45||B.stuck>75){/* fell behind (a person would have kept up): catch up on the trail */B.stuck=0;e.pos.set(tg.x-f[0]*2,0,tg.z-f[1]*2);e.yaw=tail.car.yaw;a.owStopCar(e);a.syncCar(e)}}return null}
  /* out of Dad's Auto lot: west along the gate aisle, north through the gap between the shop and the sale cars, onto Route 9 */
  const WP=[{x:245,z:63.6},{x:238.6,z:62.6},{x:237,z:56},{x:237,z:49},{x:233,z:43.2},{x:222,z:41.6}];B.wp=B.wp||0;
  if(B.wp<WP.length&&M.ph==='convoy'&&!M.pursuit){const w=WP[B.wp];const last=C.chain().slice(-1)[0],lag=last&&last!==C.lead?hyp(last.car.x-e.pos.x,last.car.z-e.pos.z):0;
    const d=drive(w.x,w.z,parked?(lag>24||C.cars.some(m=>m.st==='join'&&hyp(m.car.x-e.pos.x,m.car.z-e.pos.z)<14)?1.8:3.2):lag>40?2:6);if(d<2.6)B.wp++;return null}
  if(C.head){/* the head van drives to the driveways: follow the line */const tail=tailOf(C);if(!tail){k.s=sp>.3;return null}const f=fwd(tail.car.yaw),tg={x:tail.car.x-f[0]*9,z:tail.car.z-f[1]*9};const d=hyp(tg.x-e.pos.x,tg.z-e.pos.z);
    const lw=C.cars.find(m=>m.st==='wait');if(lw){e.pos.set(lw.car.x+fwd(lw.car.yaw)[0]*12,0,lw.car.z+fwd(lw.car.yaw)[1]*12);a.owStopCar(e);a.syncCar(e);k.s=true;return null}
    if(d>40||B.stuck>75){B.stuck=0;e.pos.set(tg.x,0,tg.z);e.yaw=tail.car.yaw;a.owStopCar(e);a.syncCar(e);return null}drive(tg.x,tg.z,Math.max(0,Math.min(14,(tail.car.spd||0)+(d-2)*.8)));return null}
  /* leading: Route 9 west, then the street of driveways, at convoy pace; wait for anyone lost */
  const lost=C.cars.find(m=>m.st==='wait');if(lost){k.s=sp>.3;return null}
  const last=C.chain().slice(-1)[0],lag=last&&last!==C.lead?hyp(last.car.x-e.pos.x,last.car.z-e.pos.z):0;const pace=lag>70?2:lag>50?6:10.5;
  if(e.pos.x>238&&e.pos.z>50){drive(EXIT_PT.x,EXIT_PT.z,6);return null}
  const target=FLEET.filter(f=>M.vans[f.id].st==='convoy').sort((p,q)=>p.home.x-q.home.x)[0];const gx=target?target.home.x-25:110;routeTo(gx,41.5,pace);return null}
})();
