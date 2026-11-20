/* =====================================================================
   HANDLE WITH CARE (SPEC3 2.18): the fragile delivery. Big Dave's strand 2/2.
   The first Riverside block party since forever. Dave has smoked a fourteen-hour brisket as a gesture of cross-bridge friendship,
   and it rides in the bed of his pickup: two foil pans (the flat, sliced, and the burnt ends), a cooler of sides, a pot of sauce,
   bread and a jar of pickles, on a moving blanket, with Doug sitting in the bed as "the brisket's seatbelt". You drive.
   Every item is a physical body in the bed: it slides when the truck's real g-forces beat its friction, hits the bed walls and the
   other items, hops on potholes, speed bumps, kerbs and the bridge's expansion joint; the sauce sloshes (and paints the cab's back
   window), the pickle jar tips. The brisket's integrity (100) drops with every hard move, and it cools (°F) while you dawdle.
   Pedals and wheel are "loaded": the brake and throttle build up the longer you hold them (tap = gentle), the wheel is slower.
   Hustlers in a hatchback come up at the bridge and try to make you brake hard (no guns: the brisket's aboard, and so is Dave);
   stay smooth and they give up, or radio Gary (following in his beige car) to "get lost" in front of them. Earl opens the
   barricade, you park by the court, Dave carries the brisket in on his own, and the block party reacts to what's left of it.

   Stages ([CP]): load (Dave's table -> the truck) -> drive (Maple Heights, Route 9's potholes) -> bridge ("at the bridge":
   the seam, the hustlers) -> party (Earl's barricade, park, the reveal).
   Fail: brisket integrity 0 ("It's... it's pulled pork now."), the tray dropped on the lawn, Dave's truck wrecked, the truck abandoned.
   Files: js/jobs/cargo.js (this). Tests: node dev/jobs-check.js cargo --retry --replay --shots; node dev/jobs/cargo.js [--shots] (human-paced
   play with a log of every hit, screenshots in docs/screenshots/jobs/cargo/).
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api,H=()=>window.__ht||{};

/* ---------------- tuning ---------------- */
const G0=9.81;
const K={
  /* g limits (smoothed over ~0.15 s) and integrity lost per second per g above them */
  latT:.45,brkT:.5,accT:.42,latK:26,brkK:24,accK:12,hardT:.5,
  /* hazards: integrity per hit (v = truck speed m/s) */
  potA:1,potB:.55,           /* per wheel through a pothole: a + b*v */
  bumpSafe:3.4,bumpK:1.25,    /* per axle over a speed bump: (v-safe)*k */
  seamSafe:3,seamK:.45,       /* per wheel over the bridge's expansion joint: (v-safe)*k*angle (square-on 1, 15 deg+ .3) */
  kerbA:2.2,kerbB:.65,        /* a kerb (any wheel, .3 s cooldown) */
  crashA:3,crashB:2.4,        /* a collision at v */
  wallV:.32,wallK:7,wallMax:3,slideRate:4,landV:.9,landK:3.5,   /* a pan hitting a wall or another item faster than wallV m/s; landing from a hop */
  /* loaded pedals: accel/brake build up while held (m/s^2) */
  accMin:1.3,accMax:5.4,thrRamp:2.2,brkMin:2.6,brkMax:15,brkRamp:.9,steerResp:3.1,turn:1.5,
  /* temperature (F) */
  temp0:165,cool:.075,coolTorn:.05,warmT:150,coldT:140,
  /* payout */
  pristine:300,smooth:100,steam:50,
  /* carrying the tray from Dave's table: an inverted pendulum you keep under you by stepping (strafing) toward the low side */
  balK:2.6,balDamp:.9,balCtrl:1.15,balTurn:.55,balNoise:.9,
  /* the hustlers */
  hzCheckDecel:7,hzFrust:2
};
const D2R=Math.PI/180,fwd=y=>[-Math.sin(y),-Math.cos(y)],rgt=y=>[Math.cos(y),-Math.sin(y)],clamp=(v,a,b)=>v<a?a:v>b?b:v,
  wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a},lerp=(a,b,t)=>a+(b-a)*t;
/* seeded noise so a run is the same run every time (the harness and the replay) */
let SEED=1;const rnd=()=>{SEED=(SEED*16807)%2147483647;return(SEED-1)/2147483646},rr=(a,b)=>a+(b-a)*rnd(),pickR=a=>a[Math.floor(rnd()*a.length)%a.length];

/* ---------------- places (metres) ---------------- */
const TRUCK0={x:40.5,z:72.6,yaw:-Math.PI/2};            /* Dave's truck at the kerb on Elm St, nose east */
const TABLE={x:44.6,z:65.7};                            /* the folding table on Dave's lawn */
const DAVE_AT={x:43.2,z:65.0};
const GARY0={x:30.2,z:72.6,yaw:-Math.PI/2};             /* Gary's beige car behind the truck */
const RING={x:47,z:69.4};                               /* where you park the van (Elm St, the other lane) */
const BUMPS=[{x:56,z:71,ax:'x',half:3.3},{x:63,z:59,ax:'z',half:3.3},{x:96,z:43,ax:'x',half:3.3}];   /* Maple Heights' "traffic calming" */
const SEAMS=[284.2,303.8],SEAM_Z=[39.6,46.4];
const BAR={x:384.2,z0:12,z1:18};                        /* Earl's barricade across Oak St, east of 3rd St */
const PARK={x:390.6,z:16.5,yaw:-Math.PI/2};             /* by the court's north gate */
const VAN_AFTER={x:367,z:16.5,yaw:-Math.PI/2},VAN_PARK={x:34.5,z:69.2,yaw:Math.PI/2},START_AT={x:47.6,z:67.6};
const TABLES=[{x:398.4,z:13.2},{x:403.2,z:13.2},{x:408,z:13.2}],BTABLE={x:403.2,z:13.2};

/* ---------------- dialogue ---------------- */
const L={
  brief:["The first Riverside block party since forever. I said I'd bring a brisket. I didn't say 'a' brisket. I said THE brisket.",
    "Fourteen hours. Post oak. I slept next to the smoker. My wife moved into the guest room.",
    "You drive my truck, I ride shotgun, Doug rides in the back with it. Smooth like a parade. Like a parade float. Carrying a baby. Made of glass."],
  load:[['dave',"Grab the flat off the table. Both hands. Don't look at it. It can smell fear."]],
  pickup:[['dave',"Easy... it's heavier on the point end. Keep it level. Step under it if it leans."]],
  wobble:["Level! LEVEL!","Step under it! Step under it!","It's leaning. Why is it leaning.","Don't tilt it! You tilted it!"],
  loaded:[['dave',"Gentle. GENTLE. Like you're putting a baby in a car seat. A baby made of meat."],['doug',"I've got it. I'm the brisket's seatbelt."],['dave',"Keys are in it. Let's go."]],
  start:[['dave',"Okay. Slow off the line. Pretend the gas pedal is a sleeping cat."],['gary',"I'll follow you in my car. It's beige. I'll be the beige car."]],
  bumpWarn:["Speed bump. Five miles an hour. FIVE. That's walking speed for a man with a brisket.","Bump coming up. Crawl it. Crawl it like a baby.","HOA put another bump in. Slow. Slower than that."],
  bump:["You took that bump like it owed you money.","My spine felt that. The brisket has no spine. Think of the brisket.","SPEED BUMP. It's yellow! It's the yellowest thing on the street!"],
  bumpGood:["Lovely. Like a parade float.","That's how you take a bump. Like a lullaby.","Perfect. The brisket didn't even wake up."],
  potWarn:["Pothole, eleven o'clock.","Hole ahead. Big one. Looks hungry.","Pothole coming up. Ease around it, don't yank.","Straddle it! Put it between the wheels!"],
  pot:["Pothole. POTHOLE. You hit it with your whole chest.","That pothole's been there since the Bicentennial. You found it.","You see a hole in the road and you think: me. I'm going in there."],
  brake:["Easy on the brakes! The brisket just met the cooler!","That was a stop. I want a glide.","You brake like you're mad at the road.","Tap it. Tap the brake. It's a brake, not a stomp pad."],
  corner:["Corners! Slow in, slow out. Like a canoe.","I felt that corner in my fillings.","The tray slid. I heard the tray slide.","You took that corner like the brisket owes you money."],
  accel:["Gentle on the gas. It's not a drag race. It's a meat race. A slow meat race.","The pickles just went to the tailgate. Gentle on the gas."],
  kerb:["That was a kerb. The brisket felt that kerb.","We're on the sidewalk. Why are we on the sidewalk.","Kerb! Doug bit his tongue."],
  crash:["WHAT DID WE HIT.","Is it the brisket? Tell me it's not the brisket.","Oh no. Oh no no no."],
  smooth:["Smooth like a parade. Like a parade float. Carrying a baby. Made of glass.","Beautiful. I could do a crossword back here.","This is the drive I dreamed about. I dreamed about this drive.","You drive like my grandmother. That's a compliment. She drove a hearse."],
  slow:["We're getting passed by a man walking his dog. The dog's judging us.","Fourteen hours to cook. Let's not take fourteen hours to drive.","Probe's dropping. It's cooling. I can hear it cooling."],
  doug:["Can I have the end piece? Just one burnt end?","It smells so good back here. I'm getting emotional.","Dave, if it falls, does it still count as a gift? Asking for me.","I'm not eating it. I'm just smelling it really hard.","Is the bark supposed to look like that? Like a beautiful tree?"],
  dougReply:["Burnt ends are for after.","Hands where I can see them, Doug.","Doug. I can see you in the mirror.","No one touches the brisket until it's on the table."],
  dougHit:["WHOA. Okay. Okay. I caught the pickles.","The sauce is sloshing! The sauce has a mind of its own!","I'm fine! The brisket's fine! The pickles are not fine!","Ow. My shins. The cooler got my shins."],
  sauce:["Sauce on the back window. That's a waste of good sauce.","There goes the sauce. All over the glass. It's like a crime scene, but delicious."],
  seamWarn:[['dave',"The bridge has a seam. Take it at an angle. Like a gentle ollie."]],
  seamGood:["Ollie! Look at you.","Silky. You kissed that seam."],
  seamBad:["That's not an ollie. That's a fall.","CLUNK. I felt that in the cooler."],
  hzSpawn:[['Hustler',"Hey! Hey! Pull over! We just want to talk about the brisket!"],['dave',"No one talks about the brisket."]],
  hzAlong:[['Hustler',"Is that post oak? That smells like post oak."],['dave',"...It IS post oak. Don't. Don't engage."],['Hustler 2',"Just a little taste, man! A sample! Like at the warehouse store!"]],
  hzTell:["Oops! Brakes! Squirrel!","Whoa, pothole! Sorry! Not sorry!","Oh no, my brakes are being weird!"],
  hzSmooth:["They want you to brake hard. Don't give them the satisfaction.","Didn't flinch. That's my driver.","Nice and easy. Let them have their little stop."],
  hzHard:["They're trying to make you stomp it. Don't stomp it!","I'm wearing the coleslaw!"],
  hzQuit:[['Hustler',"Forget it! It's probably dry anyway!"],['dave',"IT IS NOT DRY."]],
  garyOffer:[['gary',"I can block them at the bridge. I'll pretend I'm lost. I'm very good at being lost."]],
  garyGo:[['you',"Gary. Get lost."],['gary',"On it. Being lost. Very lost now."]],
  garyBlock:[['gary',"Excuse me! Is the river that way? I'm looking for the river."],['Hustler',"You're ON the river, man! MOVE!"],['gary',"Go, go. I'll keep them busy. I'm asking about parking now."]],
  barricade:[['earl',"Block party, son. Residents and brisket only."],['earl',"Pull up by the gate. Slow. There's kids."]],
  park:["Here. Right here. Easy... easy...","By the gate. Nice and slow."],
  parked:[['dave',"Perfect. I'll take it from here. Nobody touch me."]],
  reveal:[['rosa',"Is that the brisket? I've heard about the brisket. Benny won't stop talking about the brisket."],['benny',"Two weeks I've been talking about it. I made up a song."]],
  tier3:[['dee',"Look at that smoke ring."],['earl',"Thirty-six years on the bus. That's the prettiest thing I ever saw arrive on time."],['rosa',"The Hendersons drove back from Ohio for this. They're staying the whole weekend."]],
  tier2:[['dee',"It's... rustic."],['benny',"Rustic is good! Rustic is a whole aisle at the store!"],['dave',"It had a journey."]],
  tier1:[['earl',"Is it... pulled?"],['dave',"It's pulled brisket. That's a thing now. I just invented it."],['rosa',"It's delicious. It's delicious! Eat, everybody."]],
  cold:[['benny',"It's a little... room temperature."],['dave',"It's resting. It's still resting."]],
  noSauce:[['dee',"Where's the sauce?"],['doug',"On the back window, mostly."]],
  hzFoot:[['Hustler',"...Hey. So. Hi."],['Hustler 2',"We just wanted to talk about the brisket."],['dave',"You can't talk about it. You can only eat it."]],
  plate:[['Hustler',"...This is the best thing I've ever eaten."],['dave',"(quietly) I know."],['rosa',"You two. Grab a trash bag after. You're on cleanup."],['Hustler 2',"Yes ma'am."]],
  shoo:[['Hustler',"...Fair."],['dave',"More for us."],['dave',"...Doug. Wrap two plates. For the road."]],
  fail:"It's... it's pulled pork now.",
  failTray:"The brisket hit the lawn. Dave is lying down next to it.",
  failTruck:"Dave's truck is done. So is the brisket's ride.",
  failLeft:"You walked off. Dave drove it himself. He's not talking to you."
};
const NAME={dave:'dave',doug:'doug',gary:'gary',you:'you',rosa:'rosa',benny:'benny',earl:'earl',dee:'dee'};

/* ================================================================= art: run resources (disposed when the job ends) */
const R={own:[],objs:[],ovs:[],style:null,emit:[],active:false,cam:null};
const own=x=>{R.own.push(x);return x};
function disposeRun(){const a=A();for(const id of R.ovs){try{a.overlay(id,null)}catch(_){}}R.ovs.length=0;
  for(const e of R.emit){try{e.remove()}catch(_){}}R.emit.length=0;
  for(const o of R.objs){try{if(o.parent)o.parent.remove(o);if(o.userData&&o.userData.dispose)o.userData.dispose()}catch(_){}}R.objs.length=0;
  for(const x of R.own){try{x.dispose()}catch(_){}}R.own.length=0;
  if(R.style&&R.style.parentNode)R.style.parentNode.removeChild(R.style);R.style=null;
  if(R.cam){try{const c=a.camera;c.fov=R.cam;c.updateProjectionMatrix()}catch(_){}R.cam=null}
  if(R.music){try{const Au=window.HT&&HT.Audio;if(Au&&Au.ready&&a.mode!=='mission')Au.music('hub')}catch(_){}R.music=false}
  for(const m of R.hidden||[])m.visible=true;R.hidden=[];
  R.active=false}
/* the hub's giver rings (a tall yellow tube) stay up during jobs; the one at Dave's is in every shot of the load, so it hides while we're here */
function hideRings(){const a=A(),L_=a.L;if(!L_||!L_.group)return;R.hidden=R.hidden||[];for(const m of L_.group.children){const g=m.geometry,pp=g&&g.parameters;
  if(m.isMesh&&pp&&pp.radiusTop===1.3&&pp.height===3&&Math.hypot(m.position.x-TABLE.x,m.position.z-TABLE.z)<12&&m.visible){m.visible=false;R.hidden.push(m)}}}
function canvasTex(w,h,f,rep){const T3=A().THREE,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');f(g,w,h);const t=new T3.CanvasTexture(c);
  if(T3.sRGBEncoding)t.encoding=T3.sRGBEncoding;t.anisotropy=4;if(rep){t.wrapS=t.wrapT=T3.RepeatWrapping}own(t);t.userData={c,g};return t}
function M3(o){const T3=A().THREE;return own(new T3.MeshStandardMaterial(Object.assign({roughness:.7,metalness:0},o)))}
const geo=g=>own(g);
/* a box with rounded edges (vertex projection onto an inner box) */
function rbox(w,h,d,r,s){const T3=A().THREE;s=s||4;const g=new T3.BoxGeometry(w,h,d,s,s,s),p=g.attributes.position,v=new T3.Vector3(),ix=w/2-r,iy=h/2-r,iz=d/2-r;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const cx=clamp(v.x,-ix,ix),cy=clamp(v.y,-iy,iy),cz=clamp(v.z,-iz,iz);const dx=v.x-cx,dy=v.y-cy,dz=v.z-cz,l=Math.hypot(dx,dy,dz)||1;
    p.setXYZ(i,cx+dx/l*r,cy+dy/l*r,cz+dz/l*r)}g.computeVertexNormals();return geo(g)}
function mesh(g,m,x,y,z,parent){const T3=A().THREE,o=new T3.Mesh(g,m);o.position.set(x||0,y||0,z||0);o.castShadow=true;o.receiveShadow=true;if(parent)parent.add(o);return o}

let TX=null;/* this run's textures */
function textures(){if(TX)return TX;
  const noise=(g,w,h,n,cols,rmin,rmax)=>{for(let i=0;i<n;i++){g.fillStyle=pickR(cols);const r=rr(rmin,rmax);g.beginPath();g.arc(rnd()*w,rnd()*h,r,0,6.283);g.fill()}};
  /* crinkled foil: facets of light and dark */
  const foil=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#c9ced4';g.fillRect(0,0,w,h);for(let i=0;i<260;i++){const x=rnd()*w,y=rnd()*h,s=rr(8,30),l=Math.floor(rr(150,245));g.fillStyle='rgba('+l+','+(l+3)+','+(l+8)+','+rr(.25,.6)+')';
    g.beginPath();g.moveTo(x,y);g.lineTo(x+s*rr(-1,1),y+s*rr(.2,1));g.lineTo(x+s*rr(-1,1),y-s*rr(.2,1));g.closePath();g.fill()}
    g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;for(let i=0;i<40;i++){g.beginPath();const x=rnd()*w,y=rnd()*h;g.moveTo(x,y);g.lineTo(x+rr(-40,40),y+rr(-40,40));g.stroke()}},true);
  /* bark: a black-brown pepper crust with glossy rendered fat */
  const bark=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#241510';g.fillRect(0,0,w,h);noise(g,w,h,900,['#120a07','#3a2216','#2d1a10','#4a2a18','#1a0f0a'],1,4);noise(g,w,h,240,['#5c3a22','#6b4426','#7a4f2c'],.6,1.6);
    noise(g,w,h,120,['rgba(255,220,170,.18)','rgba(255,240,200,.12)'],1,3);noise(g,w,h,500,['#050303','#0d0806'],.5,1.2)},true);
  /* a sliced face: grey-brown meat, a pink smoke ring under the bark, fat seams */
  const slice=canvasTex(256,128,(g,w,h)=>{g.fillStyle='#2a170f';g.fillRect(0,0,w,h);g.fillStyle='#b8544a';g.fillRect(5,5,w-10,h-10);
    const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(140,80,62,0)');gr.addColorStop(.25,'rgba(140,86,66,1)');gr.addColorStop(.75,'rgba(140,86,66,1)');gr.addColorStop(1,'rgba(140,80,62,0)');
    g.fillStyle='#8c5642';g.fillRect(13,13,w-26,h-26);g.fillStyle=gr;g.fillRect(13,10,w-26,h-20);
    g.strokeStyle='rgba(240,214,180,.55)';g.lineWidth=3;for(let i=0;i<5;i++){g.beginPath();const y=rr(25,h-25);g.moveTo(14,y);g.bezierCurveTo(w*.3,y+rr(-10,10),w*.6,y+rr(-10,10),w-14,y+rr(-6,6));g.stroke()}
    noise(g,w,h,200,['rgba(90,50,38,.5)','rgba(170,110,90,.4)'],.6,1.5);g.strokeStyle='#1a0e09';g.lineWidth=6;g.strokeRect(3,3,w-6,h-6)});
  /* the moving blanket: quilted blue */
  const quilt=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#2f4b7c';g.fillRect(0,0,w,h);noise(g,w,h,1400,['rgba(255,255,255,.05)','rgba(0,0,0,.08)'],.5,1.4);
    g.strokeStyle='rgba(20,30,55,.75)';g.lineWidth=2;g.setLineDash([5,3]);for(let i=-w;i<w*2;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i+h,h);g.stroke();g.beginPath();g.moveTo(i+h,0);g.lineTo(i,h);g.stroke()}g.setLineDash([]);
    g.strokeStyle='rgba(150,170,210,.25)';g.lineWidth=1;for(let i=-w;i<w*2;i+=32){g.beginPath();g.moveTo(i+2,0);g.lineTo(i+h+2,h);g.stroke()}},true);
  /* yellow-black speed bump stripes, the rubber's grain */
  const bumpT=canvasTex(256,64,(g,w,h)=>{g.fillStyle='#141414';g.fillRect(0,0,w,h);g.fillStyle='#f2c21b';for(let i=-64;i<w+64;i+=48){g.beginPath();g.moveTo(i,0);g.lineTo(i+24,0);g.lineTo(i+24+32,h);g.lineTo(i+32,h);g.closePath();g.fill()}
    noise(g,w,h,600,['rgba(0,0,0,.25)','rgba(255,255,255,.06)'],.5,1.3)},true);
  /* checked tablecloth */
  const check=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#f4efe6';g.fillRect(0,0,w,h);g.fillStyle='rgba(200,40,40,.55)';for(let i=0;i<8;i+=2){g.fillRect(i*16,0,16,h);g.fillRect(0,i*16,w,16)}g.fillStyle='rgba(170,20,20,.35)';for(let i=0;i<8;i+=2)for(let j=0;j<8;j+=2)g.fillRect(i*16,j*16,16,16)},true);
  /* barricade stripes */
  const bar=canvasTex(256,64,(g,w,h)=>{g.fillStyle='#f6f3ec';g.fillRect(0,0,w,h);g.fillStyle='#e8551c';for(let i=-64;i<w+64;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i+32,0);g.lineTo(i+64,h);g.lineTo(i+32,h);g.closePath();g.fill()}},true);
  /* signs (generic) */
  const sign=(lines,bg,fg,w,h)=>canvasTex(w||512,h||256,(g,W,Hh)=>{g.fillStyle=bg;g.fillRect(0,0,W,Hh);g.strokeStyle=fg;g.lineWidth=10;g.strokeRect(10,10,W-20,Hh-20);g.fillStyle=fg;g.textAlign='center';
    const n=lines.length;lines.forEach((l,i)=>{g.font=(l[1]||'bold')+' '+(l[2]||64)+'px Arial';g.fillText(l[0],W/2,Hh*(i+1)/(n+1)+(l[2]||64)*.35)})});
  const closed=sign([['ROAD CLOSED','bold',70],['BLOCK PARTY','bold',58]],'#fbfbf5','#c2341f');
  const party=sign([['BLOCK PARTY','bold',96],['everybody welcome','italic',44]],'#2f6db5','#fff7e0',768,224);
  const card=sign([['RESERVED','bold',58],['for the brisket','italic',40]],'#fffdf4','#3a2a20',256,160);
  const slow=sign([['SLOW','bold',120]],'rgba(0,0,0,0)','#f4f1e8',256,128);
  /* sauce splats for the cab's back window: drawn into as the sauce hits it */
  const splat=canvasTex(256,128,(g,w,h)=>{g.clearRect(0,0,w,h)});
  /* the probe's readout */
  const probe=canvasTex(64,32,(g,w,h)=>{g.fillStyle='#10161a';g.fillRect(0,0,w,h)});
  return TX={foil,bark,slice,quilt,bumpT,check,bar,closed,party,card,slow,splat,probe}}

/* ---------------- the cargo meshes (children of the truck body, so they roll and pitch with it) ---------------- */
function mats(){const t=textures();if(mats.m&&mats.m.t===t)return mats.m;
  return mats.m={t,foil:M3({map:t.foil,color:'#f4f6f9',metalness:.35,roughness:.3,emissive:'#2a2d31'}),foilIn:M3({map:t.foil,color:'#d9dde2',metalness:.3,roughness:.4,side:A().THREE.DoubleSide}),
    bark:M3({map:t.bark,roughness:.62}),barkWet:M3({map:t.bark,roughness:.28,color:'#a36a4a'}),slice:M3({map:t.slice,roughness:.5}),fat:M3({color:'#e9d3b0',roughness:.4}),
    quilt:M3({map:t.quilt,roughness:.95,side:A().THREE.DoubleSide}),red:M3({color:'#c4322a',roughness:.45}),white:M3({color:'#f1efe8',roughness:.5}),grey:M3({color:'#8d9298',roughness:.5,metalness:.3}),
    steel:M3({color:'#c4c8cd',metalness:.85,roughness:.25}),steel2:M3({color:'#c4c8cd',metalness:.85,roughness:.28,side:A().THREE.DoubleSide}),steelD:M3({color:'#7d8288',metalness:.8,roughness:.35}),sauce:M3({color:'#5a1a0c',roughness:.18}),
    bag:M3({color:'#f7f6f2',roughness:.25,transparent:true,opacity:.62}),loaf:M3({color:'#e2c290',roughness:.85}),tie:M3({color:'#2f8f3f',roughness:.5}),
    glass:M3({color:'#d7ead2',roughness:.08,metalness:.1,transparent:true,opacity:.38}),brine:M3({color:'#b5c96a',roughness:.2,transparent:true,opacity:.55}),
    pickle:M3({color:'#5d7d2c',roughness:.55}),lid:M3({color:'#c9a227',metalness:.7,roughness:.35}),
    splat:M3({map:t.splat,transparent:true,roughness:.2,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),
    probe:new (A().THREE.MeshBasicMaterial)({map:t.probe})}}
/* an open foil pan: tapered sides, a rolled rim, the floor */
function pan(w,d,h,parent){const T3=A().THREE,m=mats(),g=new T3.Group();parent&&parent.add(g);
  const side=geo(new T3.CylinderGeometry(Math.SQRT1_2,Math.SQRT1_2*.86,1,4,1,true));side.rotateY(Math.PI/4);const s=mesh(side,m.foilIn,0,h/2,0,g);s.scale.set(w,h,d);
  mesh(geo(new T3.PlaneGeometry(w*.86,d*.86).rotateX(-Math.PI/2)),m.foilIn,0,.004,0,g);
  const rim=geo(new T3.CylinderGeometry(.007,.007,1,6));for(const[x,z,l,ry]of[[0,d/2,w,0],[0,-d/2,w,0],[w/2,0,d,Math.PI/2],[-w/2,0,d,Math.PI/2]]){const r=mesh(rim,m.foil,x,h,z,g);r.scale.y=l+.012;r.rotation.set(0,ry,Math.PI/2)}
  return g}
/* a crinkled foil tent over the back part of a pan (along its length z), rolled back at the open end */
function tent(w,d,h,cover,parent){const T3=A().THREE,m=mats(),L_=d*cover,g0=geo(new T3.PlaneGeometry(w*1.04,L_,8,12)),p=g0.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),u=x/(w*1.04)+.5;p.setZ(i,h*(Math.sin(Math.PI*clamp(u,0,1))*.6+.4)+rr(-.007,.007))}
  g0.computeVertexNormals();g0.rotateX(-Math.PI/2);const t=mesh(g0,m.foil,0,0,-(d-L_)/2,parent);
  const roll=geo(new T3.CylinderGeometry(.024,.028,w*1.02,10,1,true));const r=mesh(roll,m.foilIn,0,h*.55,-d/2+L_,parent);r.rotation.z=Math.PI/2;return t}
function buildCargo(M,body){const T3=A().THREE,m=mats(),bed=new T3.Group();bed.name='cargoBed';body.add(bed);M.bed=bed;
  /* the moving blanket, bunched at the edges */
  const bl=geo(new T3.PlaneGeometry(1.62,1.7,16,16)),bp=bl.attributes.position;for(let i=0;i<bp.count;i++){const x=bp.getX(i),y=bp.getY(i),e=Math.max(Math.abs(x)/.81,Math.abs(y)/.85);bp.setZ(i,(e>.88?(e-.88)*.9:0)+Math.sin(x*14+y*9)*.006)}
  bl.computeVertexNormals();bl.rotateX(-Math.PI/2);const blm=mesh(bl,m.quilt,-1.675,.875,0,bed);blm.castShadow=false;
  /* the cab's back window, where the sauce lands */
  const sp=mesh(geo(new T3.PlaneGeometry(1.26,.36)),m.splat,-.81,1.615,0,body);sp.rotation.y=-Math.PI/2;sp.castShadow=false;M.splatMesh=sp;
  const items=[];
  for(const d of ITEMS){const g=new T3.Group();g.name='cargo_'+d.id;bed.add(g);const it=Object.assign({},d,{g,u:d.u,w:d.w,vu:0,vw:0,y:0,vy:0,tilt:0,tw:0,th:0,thv:0,tipped:0,tipDir:0,spin:0,inBed:d.id!=='flat'});
    buildItem(it);items.push(it)}
  M.items=items;return items}
const ITEMS=[
  {id:'flat',kind:'flat',hu:.17,hw:.27,h:.12,m:6,mu:.56,frag:1,u:-1.74,w:.27},
  {id:'point',kind:'point',hu:.15,hw:.135,h:.1,m:3.5,mu:.52,frag:.8,u:-1.8,w:-.17},
  {id:'cooler',kind:'cooler',hu:.31,hw:.21,h:.44,m:14,mu:.55,frag:0,u:-1.17,w:.47},
  {id:'pot',kind:'pot',hu:.17,hw:.17,h:.27,m:9,mu:.62,frag:0,u:-1.04,w:-.13},
  {id:'bread',kind:'bread',hu:.15,hw:.075,h:.13,m:.7,mu:.35,frag:0,u:-2.3,w:.5},
  {id:'bread2',kind:'bread',hu:.15,hw:.075,h:.13,m:.7,mu:.35,frag:0,u:-2.3,w:.33},
  {id:'pickles',kind:'jar',hu:.065,hw:.065,h:.2,m:1.6,mu:.34,frag:0,u:-2.32,w:-.06,tip:.58}];
/* the bed's inside (truck frame: u forward, w right), and Doug's legs */
const BED={u0:-2.47,u1:-.88,w0:-.84,w1:.84,y:.88},DOUGBOX={u0:-1.62,u1:-1.12,w0:-.84,w1:-.42};
function buildItem(it){const T3=A().THREE,m=mats(),g=it.g;
  if(it.kind==='flat'){pan(.34,.54,.075,g);const sl=new T3.Group();g.add(sl);it.slab=[];
    /* the flat: two whole pieces under the foil (they part when it gets knocked about) and six slices fanned at the open end, smoke ring showing */
    for(let k=0;k<2;k++){const p=mesh(rbox(.29,.062,.15,.02,3),m.bark,0,.052,-.19+k*.15,sl);it.slab.push(p)}
    const sm=[m.bark,m.bark,m.bark,m.bark,m.slice,m.slice];
    it.slices=[];for(let k=0;k<6;k++){const s=new T3.Mesh(geo(new T3.BoxGeometry(.27,.058,.013)),sm);s.castShadow=true;s.position.set(0,.05,-.02+k*.042);s.rotation.x=.42;g.add(s);it.slices.push(s)}
    it.tent=tent(.34,.54,.075,.5,g);it.tent.position.y+=.075;
    /* the probe: a steel spike and a little readout */
    const pr=mesh(geo(new T3.CylinderGeometry(.003,.003,.16,6)),m.steel,-.06,.12,-.12,g);pr.rotation.z=.5;
    const rd=mesh(rbox(.05,.028,.016,.004,2),m.grey,-.1,.19,-.12,g);const sc=mesh(geo(new T3.PlaneGeometry(.04,.02)),m.probe,-.1,.19,-.111,g);sc.castShadow=false;it.probe=rd}
  else if(it.kind==='point'){pan(.3,.27,.07,g);const ends=own(new T3.InstancedMesh(rbox(.042,.038,.042,.01,2),m.barkWet,18)),o=new T3.Object3D();
    for(let k=0;k<18;k++){o.position.set(rr(-.11,.11),.05+rr(0,.03),rr(-.1,.1));o.rotation.set(rr(0,1),rr(0,3),rr(0,1));o.updateMatrix();ends.setMatrixAt(k,o.matrix)}ends.castShadow=true;g.add(ends);
    const t=tent(.3,.27,.06,.45,g);t.position.y+=.07}
  else if(it.kind==='cooler'){mesh(rbox(.62,.36,.42,.04,4),m.red,0,.18,0,g);mesh(rbox(.64,.08,.44,.035,4),m.white,0,.39,0,g);
    for(const z of[-.215,.215]){const hd=mesh(rbox(.18,.04,.03,.012,2),m.grey,0,.28,z,g)}for(const x of[-.2,.2])mesh(rbox(.05,.06,.02,.008,2),m.white,x,.33,.222,g);
    mesh(rbox(.5,.012,.38,.006,2),m.white,0,.432,0,g)}
  else if(it.kind==='pot'){mesh(geo(new T3.CylinderGeometry(.165,.16,.25,24,1,true)),m.steel2,0,.125,0,g);mesh(geo(new T3.CircleGeometry(.16,24).rotateX(-Math.PI/2)),m.steelD,0,.004,0,g);
    mesh(geo(new T3.TorusGeometry(.163,.006,6,28).rotateX(Math.PI/2)),m.steel,0,.25,0,g);for(const s of[-1,1])mesh(rbox(.03,.022,.1,.008,2),m.steelD,0,.21,s*.18,g);
    const sf=new T3.Group();sf.position.y=.19;g.add(sf);mesh(geo(new T3.CircleGeometry(.158,24).rotateX(-Math.PI/2)),m.sauce,0,0,0,sf).castShadow=false;it.surf=sf;
    const ld=new T3.Group();ld.position.set(.05,.19,.04);ld.rotation.set(.45,0,-.4);g.add(ld);mesh(geo(new T3.CylinderGeometry(.008,.008,.34,6)),m.steel,0,.17,0,ld);mesh(geo(new T3.SphereGeometry(.035,10,6,0,6.283,Math.PI/2,Math.PI/2)),m.steel,0,0,0,ld)}
  else if(it.kind==='bread'){mesh(rbox(.28,.11,.13,.04,3),m.loaf,0,.06,0,g);mesh(rbox(.31,.125,.145,.05,3),m.bag,0,.065,0,g);mesh(geo(new T3.TorusGeometry(.012,.004,4,8)),m.tie,-.17,.06,0,g).rotation.y=Math.PI/2}
  else if(it.kind==='jar'){const T=T3;mesh(geo(new T.CylinderGeometry(.06,.06,.17,16)),m.brine,0,.085,0,g);for(let k=0;k<4;k++){const p=mesh(geo(new T.SphereGeometry(.018,8,6)),m.pickle,rr(-.03,.03),.08,rr(-.03,.03),g);p.scale.set(1,3.2,1);p.rotation.set(rr(-.2,.2),0,rr(-.2,.2))}
    mesh(geo(new T.CylinderGeometry(.064,.064,.18,16,1,true)),m.glass,0,.09,0,g).castShadow=false;mesh(geo(new T.CylinderGeometry(.06,.06,.03,16)),m.lid,0,.195,0,g)}
  placeItem(it)}
function placeItem(it){const g=it.g;if(!g||!it.inBed)return;g.position.set(it.u,BED.y+it.y,it.w);
  if(it.kind==='jar'&&it.tipped){g.rotation.set(0,0,0);const a=it.tipDir;g.rotation.order='YXZ';g.rotation.y=a;g.rotation.x=Math.PI/2*Math.min(1,it.tipped);g.position.y+=.065*Math.min(1,it.tipped)}
  else g.rotation.set(it.th*Math.cos(it.tw)*.6,it.spin,-it.th*Math.sin(it.tw)*.6)}

/* ================================================================= the street: speed bumps, the bridge's expansion joints, the barricade, the party */
function buildStreet(M){const a=A(),T3=a.THREE,t=textures(),g=new T3.Group();g.name='cargoStreet';a.wmAdd(g);M.street=g;
  const rub=M3({map:t.bumpT,roughness:.8}),slowM=M3({map:t.slow,transparent:true,roughness:.9,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3});
  /* a rubber hump: a rounded profile across the road, striped, with SLOW painted before it in each direction */
  for(const b of BUMPS){const len=b.half*2,prof=geo(new T3.CylinderGeometry(.45,.45,len,16,1,false,0,Math.PI));prof.rotateZ(Math.PI/2);prof.scale(1,.2,1);
    const y=a.groundAt(b.x,b.z);const m=mesh(prof,rub,b.x,y,b.z,g);m.rotation.y=b.ax==='x'?Math.PI/2:0;m.receiveShadow=true;m.material.map.repeat.set(len/1.6,1);
    for(const s of[-1,1]){const p=mesh(geo(new T3.PlaneGeometry(2.4,1.2)),slowM,b.x+(b.ax==='x'?s*5.5:s*1.5*0),y+.012,b.z+(b.ax==='z'?s*5.5:0),g);p.rotation.x=-Math.PI/2;p.rotation.z=b.ax==='x'?(s>0?Math.PI/2:-Math.PI/2):(s>0?0:Math.PI);p.castShadow=false;
      if(b.ax==='x'){p.position.z=b.z+(s>0?-1.5:1.5)}else{p.position.x=b.x+(s>0?1.5:-1.5)}}}
  /* the bridge's finger joints: steel plates across the deck */
  const st=M3({color:'#5d6166',metalness:.8,roughness:.45}),dk=M3({color:'#26282b',roughness:.7});
  for(const x of SEAMS){const z0=SEAM_Z[0],z1=SEAM_Z[1],y=a.groundAt(x,(z0+z1)/2);mesh(geo(new T3.BoxGeometry(.5,.02,z1-z0)),dk,x,y+.004,(z0+z1)/2,g).castShadow=false;
    const fing=own(new T3.InstancedMesh(geo(new T3.BoxGeometry(.24,.018,.07)),st,Math.floor((z1-z0)/.16)*2)),o=new T3.Object3D();let k=0;
    for(let z=z0+.08;z<z1-.04;z+=.16)for(const s of[-1,1]){o.position.set(x+s*.12,y+.012,z+(s>0?.04:-.04));o.updateMatrix();fing.setMatrixAt(k++,o.matrix)}fing.count=k;fing.receiveShadow=true;g.add(fing)}
  return g}
function buildBarricade(M){const a=A(),T3=a.THREE,t=textures(),g=new T3.Group();g.name='cargoBarricade';a.wmAdd(g);
  const stripe=M3({map:t.bar,roughness:.6}),leg=M3({color:'#e9e6df',roughness:.6}),signM=M3({map:t.closed,roughness:.6});
  const horse=(x,z)=>{const h=new T3.Group();h.position.set(x,a.groundAt(x,z),z);g.add(h);mesh(rbox(.08,.32,2.4,.02,2),stripe,0,.95,0,h);mesh(rbox(.06,.2,2.3,.02,2),stripe,0,.45,0,h);
    for(const s of[-1,1])for(const f of[-1,1]){const l=mesh(geo(new T3.BoxGeometry(.06,1.15,.06)),leg,f*.22,.56,s*1.05,h);l.rotation.x=0;l.rotation.z=f*.2}return h};
  /* two halves; the north one swings open for you */
  M.barN=horse(BAR.x,BAR.z0+1.6);M.barS=horse(BAR.x,BAR.z1-1.6);M.barOpen=0;
  const sg=mesh(geo(new T3.PlaneGeometry(1.1,.55)),signM,0,1.42,0,M.barS);sg.rotation.y=Math.PI/2;sg.position.x=-.06;
  /* balloons (generic, a little party) */
  const bal=['#e8433a','#f4c430','#3b82c4','#7cc36b'];for(let k=0;k<4;k++){const b=mesh(geo(new T3.SphereGeometry(.16,12,10)),M3({color:bal[k],roughness:.25}),.05,1.95+k%2*.22,-.9+k*.18,M.barS);b.scale.y=1.18}
  M.barCol=a.wmCol({x0:BAR.x-.25,z0:BAR.z0,x1:BAR.x+.25,z1:BAR.z1});return g}
function barricadeTick(M,dt,want){M.barOpen+=(want-M.barOpen)*Math.min(1,dt*1.5);const k=M.barOpen;if(!M.barN)return;M.barN.rotation.y=-k*1.45;M.barN.position.x=BAR.x+k*1.1;M.barN.position.z=BAR.z0+1.6-k*.6;
  if(M.barCol){if(k>.6){M.barCol.z0=BAR.z0;M.barCol.z1=BAR.z0+.6}else{M.barCol.z0=BAR.z0;M.barCol.z1=BAR.z1}}}
/* the party: tables with checked cloths and dishes, folding chairs, string lights between lamp-height poles, a banner, a speaker */
function buildParty(M){if(M.partyG)return;const a=A(),T3=a.THREE,t=textures(),g=new T3.Group();g.name='cargoParty';a.wmAdd(g);M.partyG=g;
  const cloth=M3({map:t.check,roughness:.85}),alu=M3({color:'#b9bec4',metalness:.6,roughness:.4}),wood=M3({color:'#8a5a34',roughness:.8}),
    dishW=M3({color:'#f3f1ea',roughness:.35}),pyrex=M3({color:'#e8f0f2',roughness:.1,transparent:true,opacity:.55}),mac=M3({color:'#e8b23a',roughness:.6}),
    slaw=M3({color:'#e9e6c9',roughness:.7}),cake=M3({color:'#6b3b22',roughness:.6}),icing=M3({color:'#f7efe3',roughness:.4}),green=M3({color:'#6ca34a',roughness:.7}),
    chairM=M3({color:'#3a6ea5',roughness:.6}),bulbM=new T3.MeshBasicMaterial({color:new T3.Color('#ffd98a')});own(bulbM);
  const y0=a.groundAt(400,13);
  for(const T of TABLES){const tb=new T3.Group();tb.position.set(T.x,y0,T.z);g.add(tb);mesh(rbox(1.8,.04,.76,.015,2),cloth,0,.74,0,tb);
    const drape=mesh(geo(new T3.BoxGeometry(1.84,.22,.8)),cloth,0,.63,0,tb);drape.material=cloth;
    for(const x of[-.8,.8])for(const z of[-.3,.3])mesh(geo(new T3.CylinderGeometry(.016,.016,.72,6)),alu,x,.36,z,tb)}
  /* dishes on the outer tables; the middle table keeps a space for the brisket (and a card that says so) */
  const dish=(T,x,z,fill)=>{const d=new T3.Group();d.position.set(T.x+x,y0+.76,T.z+z);g.add(d);mesh(rbox(.34,.06,.24,.02,2),pyrex,0,.03,0,d);mesh(rbox(.31,.045,.21,.018,2),fill,0,.025,0,d);return d};
  dish(TABLES[0],-.5,0,mac);dish(TABLES[0],.15,.05,slaw);dish(TABLES[2],.45,0,green);
  {const ck=new T3.Group();ck.position.set(TABLES[2].x-.35,y0+.76,TABLES[2].z);g.add(ck);mesh(geo(new T3.CylinderGeometry(.15,.15,.12,20)),cake,0,.06,0,ck);mesh(geo(new T3.CylinderGeometry(.152,.152,.02,20)),icing,0,.125,0,ck);mesh(geo(new T3.CylinderGeometry(.2,.2,.01,20)),dishW,0,.005,0,ck)}
  for(const x of[-.75,.65]){const c=mesh(geo(new T3.CylinderGeometry(.04,.034,.12,10)),M3({color:x<0?'#d24b3a':'#3c7fd0',roughness:.5}),BTABLE.x+x,y0+.82,BTABLE.z+.2,g)}
  const card=mesh(geo(new T3.PlaneGeometry(.26,.16)),M3({map:t.card,roughness:.7}),BTABLE.x,y0+.84,BTABLE.z+.08,g);card.rotation.x=-.35;M.card=card;
  M.spot={x:BTABLE.x,y:y0+.76,z:BTABLE.z-.08};
  /* folding chairs along the kerb */
  for(let k=0;k<6;k++){const c=new T3.Group();c.position.set(396+k*2.4,y0,11.4+(k%2)*.3);c.rotation.y=Math.PI+rr(-.3,.3);g.add(c);mesh(rbox(.42,.035,.4,.01,2),chairM,0,.45,0,c);mesh(rbox(.42,.4,.03,.01,2),chairM,0,.68,-.19,c);
    for(const x of[-.18,.18])for(const z of[-.17,.17])mesh(geo(new T3.CylinderGeometry(.012,.012,.46,5)),alu,x,.23,z,c)}
  /* string lights: two poles and a sagging line of bulbs across the street */
  const pole=M3({color:'#4a4d52',metalness:.5,roughness:.5});const lines=[[[396,10.6],[396,19.4]],[[406,10.6],[406,19.4]],[[396,10.6],[406,10.6]]];const P_=new Set();
  for(const ln of lines)for(const p of ln){const k=p.join(',');if(P_.has(k))continue;P_.add(k);mesh(geo(new T3.CylinderGeometry(.05,.06,4.2,8)),pole,p[0],y0+2.1,p[1],g)}
  const bulbG=geo(new T3.SphereGeometry(.055,8,6)),n=30,bulbs=own(new T3.InstancedMesh(bulbG,bulbM,n*lines.length)),o=new T3.Object3D(),wire=[];let k=0;
  for(const[[x0,z0],[x1,z1]]of lines){for(let i=0;i<n;i++){const u=(i+.5)/n,sag=Math.sin(Math.PI*u)*.7;o.position.set(lerp(x0,x1,u),y0+4.05-sag,lerp(z0,z1,u));o.updateMatrix();bulbs.setMatrixAt(k++,o.matrix);wire.push(o.position.clone())}}
  bulbs.castShadow=false;g.add(bulbs);
  /* the banner over the court gate */
  const bn=mesh(geo(new T3.PlaneGeometry(4.2,1.2)),M3({map:t.party,roughness:.7,side:T3.DoubleSide}),395,y0+3.1,19.9,g);bn.rotation.y=Math.PI;bn.castShadow=false;
  for(const x of[392.8,397.2])mesh(geo(new T3.CylinderGeometry(.045,.05,3.8,8)),pole,x,y0+1.9,19.9,g);
  /* a speaker on a stand (the music) and two coolers */
  const spk=new T3.Group();spk.position.set(393.2,y0,19.0);g.add(spk);mesh(geo(new T3.CylinderGeometry(.02,.02,1.3,6)),pole,0,.65,0,spk);mesh(rbox(.36,.55,.3,.03,2),M3({color:'#1d1f22',roughness:.6}),0,1.55,0,spk);
  mesh(geo(new T3.CircleGeometry(.12,16)),M3({color:'#3a3d42',roughness:.4}),0,1.6,.152,spk);
  for(const x of[409.8,410.6])mesh(rbox(.6,.38,.4,.04,3),M3({color:x<410?'#2f78c4':'#d9452f',roughness:.45}),x,y0+.19,12.2,g);
  return g}

/* ================================================================= people (the cast loads on demand; boxes until it lands) */
function person(role,look,x,z,ry){const a=A(),PP=window.HT&&HT.People;let d=null;
  if(PP&&PP.ok&&role){try{if(role==='neighbour')d=PP.make('neighbour',{variant:look&&look.v});else if(PP.has&&PP.has(role))d=PP.make(role,{})}catch(_){d=null}}
  if(!d)d=a.makeDude(look&&look.look||{shirt:'#6a7f99',pants:'#3a3a3a'});d.root.position.set(x,a.groundAt(x,z),z);d.root.rotation.y=ry||0;a.wmAdd(d.root);return d}
function dad(id,x,z,ry){const a=A(),d=a.makeDude(a.HOMIES[id]);d.root.position.set(x,a.groundAt(x,z),z);d.root.rotation.y=ry||0;a.wmAdd(d.root);d.who=id;return d}
function pose(d,dt,o){const PP=window.HT&&HT.People;if(d&&d.rb&&PP&&PP.pose)try{PP.pose(d,dt,o||{moving:false,aim:false,mode:'stand'})}catch(_){}}
function wave(d){const PP=window.HT&&HT.People;if(d&&d.rb&&PP&&PP.interact)try{PP.interact(d)}catch(_){}}
function face(d,x,z,dt){const r=d.root,want=Math.atan2(x-r.position.x,z-r.position.z);r.rotation.y+=wrap(want-r.rotation.y)*Math.min(1,(dt||1)*5)}
function walkTo(d,t,sp,dt){const a=A(),r=d.root.position,dx=t.x-r.x,dz=t.z-r.z,l=Math.hypot(dx,dz);if(l<.08){pose(d,dt);return true}const s=Math.min(l,sp*dt);r.x+=dx/l*s;r.z+=dz/l*s;r.y=a.groundAt(r.x,r.z);
  d.root.rotation.y=Math.atan2(dx,dz);pose(d,dt,{moving:true,speed:sp>2.5?1.4:1,aim:false,mode:'stand'});return false}
/* a seat in a car: [forward, hip height, right, turn] in the car's frame (index.html SEATS) */
const SEAT={drv:[.45,.78,-.42],sh:[.45,.78,.42],bed:[-1.35,1.12,-.62,-Math.PI/2],sedan:[-.15,.45,-.38],sedanR:[-.15,.45,.38],hatch:[-.12,.47,-.37],hatchR:[-.12,.47,.37]};
function seat(d,e,s,dt){if(!d||!e)return;const a=A(),f=fwd(e.yaw),r=rgt(e.yaw),sc=d.root.scale.y||1,y0=a.groundAt(e.pos.x,e.pos.z);
  d.root.position.set(e.pos.x+f[0]*s[0]+r[0]*s[2],y0+s[1]-.59*sc,e.pos.z+f[1]*s[0]+r[1]*s[2]);d.root.rotation.set(0,e.yaw+Math.PI+(s[3]||0),0);pose(d,dt,{mode:'sit',aim:false,moving:false})}
/* the Riverside cast and neighbours the party needs (the job start preloads them) */
const CAST=['earl','dee','rosa','benny'];
function castKeys(){const PP=window.HT&&HT.People;if(!PP)return[];const nb=(PP.neighbourKeys||[]).slice(0,6);return['dad_dave','dad_doug','dad_gary'].concat(CAST,nb).filter(k=>PP.keys&&PP.keys.includes(k)&&!(PP.has&&PP.has(k)))}
function preloadCast(){const PP=window.HT&&HT.People;if(PP&&PP.preload)try{const k=castKeys();if(k.length)PP.preload(k).catch(()=>{})}catch(_){}}

/* ================================================================= the route (the GPS line) and cars that drive along it */
function mkRoute(pts){const s=[0];for(let i=1;i<pts.length;i++)s.push(s[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z));return{pts,s,len:s[s.length-1]}}
function routeAt(R_,s){const P_=R_.pts,S=R_.s;s=clamp(s,0,R_.len);let lo=0,hi=S.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(S[m]<=s)lo=m;else hi=m}
  const A_=P_[lo],B_=P_[Math.min(lo+1,P_.length-1)],L_=S[Math.min(lo+1,S.length-1)]-S[lo]||1,u=(s-S[lo])/L_,dx=(B_.x-A_.x)/L_,dz=(B_.z-A_.z)/L_,l=Math.hypot(dx,dz)||1;
  return{x:A_.x+(B_.x-A_.x)*u,z:A_.z+(B_.z-A_.z)*u,dx:dx/l,dz:dz/l}}
/* nearest point on the polyline: {s, lat (right +), d} */
function routeProj(R_,x,z,hint){const P_=R_.pts,S=R_.s;let best=null,i0=0,i1=P_.length-1;
  if(hint!=null){let k=0;while(k<S.length-1&&S[k+1]<hint-60)k++;i0=k;while(k<S.length-1&&S[k]<hint+80)k++;i1=Math.min(P_.length-1,k+1)}
  for(let i=i0;i<i1;i++){const A_=P_[i],B_=P_[i+1],dx=B_.x-A_.x,dz=B_.z-A_.z,L2=dx*dx+dz*dz||1,u=clamp(((x-A_.x)*dx+(z-A_.z)*dz)/L2,0,1),px=A_.x+dx*u,pz=A_.z+dz*u,d=Math.hypot(x-px,z-pz);
    if(!best||d<best.d){const l=Math.sqrt(L2);best={s:S[i]+u*l,d,lat:((x-px)*-dz+(z-pz)*dx)/l>=0?d:-d}}}
  /* (right of a direction (dx,dz) is (-dz,dx)) */
  if(best){const q=routeAt(R_,best.s),rx=-q.dz,rz=q.dx;best.lat=(x-q.x)*rx+(z-q.z)*rz}
  return best||{s:0,lat:0,d:0}}
/* a car that drives along the route: s (m along), lat (m right of the lane line), v (m/s); a collider so you bump into it */
function railCar(M,type,color,name){const a=A(),obj=a.makeVehicle(type,color,{rims:'stock'})||a.makeVanBox(color);a.wmAdd(obj);R.objs.push(obj);
  const e={type,obj,pos:a.V3(0,0,0),yaw:0,spd:0,steer:0,col:a.wmCol({x0:-1e4,z0:-1e4,x1:-1e4+1,z1:-1e4+1}),bump:0,stats:null,owner:'cargo',name,color,dmg:0,odo:0,meshes:null};
  return{e,s:0,lat:0,latT:0,v:0,vT:0,acc:5,dec:9,brk:false,haz:false,t:0,visible:true}}
function railStep(rc,R_,dt,o){o=o||{};const a=A();const dv=rc.vT-rc.v;rc.v+=clamp(dv,-(o.dec||rc.dec)*dt,(o.acc||rc.acc)*dt);rc.v=Math.max(0,rc.v);rc.brk=dv<-.4||rc.v<.3;
  const s0=rc.s;rc.s=Math.min(R_.len-1,rc.s+rc.v*dt);const lat0=rc.lat;rc.lat+=(rc.latT-rc.lat)*Math.min(1,dt*(o.latK||1.6));
  const p=routeAt(R_,rc.s),rx=-p.dz,rz=p.dx,ds=Math.max(.05,rc.s-s0),dl=rc.lat-lat0;
  rc.e.pos.set(p.x+rx*rc.lat,0,p.z+rz*rc.lat);const hx=p.dx+rx*dl/ds*.8,hz=p.dz+rz*dl/ds*.8;if(rc.v>.05)rc.e.yaw=Math.atan2(-hx,-hz);rc.e.spd=rc.v;
  rc.steer=clamp(wrap(rc.e.yaw-(rc.yawPrev==null?rc.e.yaw:rc.yawPrev))/Math.max(dt,1e-3)*.25,-1,1);rc.yawPrev=rc.e.yaw;
  a.syncCar(rc.e);const VM=window.HT&&HT.Vehicles;if(rc.e.obj.userData.mod&&VM&&VM.update)try{VM.update(rc.e.obj,{speed:rc.v,steer:rc.steer,braking:rc.brk,headlights:false,dt})}catch(_){}}
function railHide(rc){if(!rc)return;rc.e.obj.visible=false;const c=rc.e.col;c.x0=c.z0=-1e4;c.x1=c.z1=-1e4+1;c.ob=null;rc.gone=true}

/* ================================================================= dialogue: one line at a time, paced by length (the subtitle queue holds 4) */
const TALK={q:[],t:0};
function say(who,t,front){const a=A();if(front){TALK.q.length=0;TALK.t=Math.max(2.2,t.length*.058);a.radio(NAME[who]||who,t,true)}else TALK.q.push([who,t])}
function sayAll(list,front){list=list.slice();if(front&&list.length){const f=list.shift();say(f[0],f[1],true)}for(const[w,t]of list)TALK.q.push([w,t])}
function talkTick(dt){TALK.t-=dt;if(TALK.t<=0&&TALK.q.length){const[w,t]=TALK.q.shift();TALK.t=Math.max(2.2,t.length*.058);A().radio(NAME[w]||w,t,false)}}
const talking=()=>TALK.q.length>0||TALK.t>.4;
/* a passenger line with a cooldown per kind (and Dave never talks over himself) */
function quip(M,kind,list,who,cd,front){const c=M.cd;if((c[kind]||0)>0||(who==='dave'&&c.dave>0&&!front))return false;c[kind]=cd||6;if(who==='dave')c.dave=2.6;say(who||'dave',pickR(list),front!==false);return true}

/* ================================================================= the truck */
function mkTruck(M){const a=A(),obj=a.makeVehicle('pickup','#8f2a1e',{rims:'stock'})||a.makeVanBox('#8f2a1e');a.wmAdd(obj);R.objs.push(obj);
  const e={type:'pickup',obj,pos:a.V3(TRUCK0.x,0,TRUCK0.z),yaw:TRUCK0.yaw,spd:0,steer:0,col:a.wmCol({x0:0,z0:0,x1:0,z1:0}),bump:0,stats:null,owner:'dave',name:'Big Dave',color:'#8f2a1e',home:null,dmg:0,odo:0,tile:null,meshes:null};
  const h=H();e.hp=h.carHpMax?h.carHpMax(e):110;e.noTow=true;noTow();a.syncCar(e);M.truck=e;
  const body=obj.userData.bodyRoot||obj;M.body=body;M.bodyY=body.position.y;buildCargo(M,body);return e}
/* HT.Tow (js/tow.js) gives every pickup a stock hitch; Dave's truck carries a brisket, not a tow rig: vehicles flagged noTow are skipped */
function noTow(){const T=window.HT&&HT.Tow;if(!T||!T.can||T.can._cargo)return;const can=T.can;T.can=e=>e&&e.noTow?false:can(e);T.can._cargo=true}
const truckHp=e=>{const h=H();return h.carHp?h.carHp(e):(e.hp||100)};
/* in the driver's seat: the loaded wheel (slower, gentler) */
function mount(M){const a=A(),e=M.truck;if(!e)return;if(a.CV&&a.CV!==e)a.exitCar();if(a.CV!==e)a.enterCar(e);if(a.CV!==e)return false;
  for(const S of[e.stats,e.base])if(S){S.steerResp=K.steerResp;S.turn=K.turn}M.pv=null;M.pT=0;M.pB=0;return true}
function truckDown(M){const a=A();if(a.CV===M.truck)a.exitCar()}

/* ---------------- the vehicle hook: loaded pedals, g-forces, hazards, the cargo ---------------- */
function vehicleTick(M,e,dt){const c=e.car;if(!c||dt<=0)return;const S=e.stats||{},a=A(),St=M.S;
  if(M.pvCar!==c){M.pvCar=c;M.pv=null;M.wp=null}
  /* loaded pedals: the change drivePhys made this frame, capped by how long the pedal has been held */
  const raw=c.spd,dv=raw-e.spd,lim=((S.brake||23)+(S.hbrake||20))*dt*1.15+.06;
  const crash=(e.spd>2&&raw<-.05)||(e.spd<-2&&raw>.05)||dv<-lim;
  const setV=v=>{c.x+=c.vdx*(v-c.spd)*dt;c.z+=c.vdz*(v-c.spd)*dt;c.spd=v};
  if(!crash){
    if(e.spd>=-.3&&dv>0){M.pT=Math.min(1,M.pT+dt/K.thrRamp);const cap=(K.accMin+(K.accMax-K.accMin)*M.pT)*dt;if(dv>cap)setV(e.spd+cap)}else M.pT=Math.max(0,M.pT-dt*2.5);
    if(e.spd>.3&&dv<-(S.coast||3.5)*dt*1.3){M.pB=Math.min(1,M.pB+dt/K.brkRamp);const cap=(K.brkMin+(K.brkMax-K.brkMin)*Math.pow(M.pB,1.5))*dt;if(-dv>cap)setV(e.spd-cap)}else M.pB=Math.max(0,M.pB-dt*3)}
  /* g: the velocity's change in the truck's frame (a crash is an event, not a g reading) */
  const vx=c.vdx*c.spd,vz=c.vdz*c.spd;if(!M.pv)M.pv=[vx,vz];let ax=(vx-M.pv[0])/dt,az=(vz-M.pv[1])/dt;M.pv=[vx,vz];
  if(crash){M.crashT=.15;hit(M,'crash',K.crashA+K.crashB*Math.abs(e.spd),{sv:Math.min(1.6,.3+.12*Math.abs(e.spd)),v:Math.abs(e.spd)});
    const sh=Math.min(1.4,Math.abs(e.spd)*.22)*Math.sign(e.spd);if(M.items)for(const it of M.items)if(it.inBed)it.vu+=sh*rr(.7,1)}
  if(M.crashT>0){M.crashT-=dt;ax=az=0}
  const f=fwd(c.yaw),r=rgt(c.yaw);let lon=clamp((ax*f[0]+az*f[1])/G0,-2.5,2.5),lat=clamp((ax*r[0]+az*r[1])/G0,-2.5,2.5);
  const g=M.g,k1=1-Math.exp(-dt/.15),k2=1-Math.exp(-dt/.05);g.lon+=(lon-g.lon)*k1;g.lat+=(lat-g.lat)*k1;g.flon+=(lon-g.flon)*k2;g.flat+=(lat-g.flat)*k2;
  g.mag=Math.hypot(g.lon,g.lat);g.trail.push([g.lat,g.lon]);if(g.trail.length>24)g.trail.shift();g.peak=Math.max(g.peak*Math.exp(-dt*.8),g.mag);
  /* integrity from sustained g */
  const gl=Math.abs(g.lat),gb=-g.lon,ga=g.lon;let loss=0;
  if(gl>K.latT){const d=(gl-K.latT)*K.latK*dt;loss+=d;M.acc.lat+=d}if(gb>K.brkT){const d=(gb-K.brkT)*K.brkK*dt;loss+=d;M.acc.brk+=d}if(ga>K.accT){const d=(ga-K.accT)*K.accK*dt;loss+=d;M.acc.acc+=d}
  if(loss>0)hurt(M,loss);
  for(const kk in M.acc)M.acc[kk]=Math.max(0,M.acc[kk]-dt*.5);
  if(M.acc.lat>2.2){M.acc.lat=0;quip(M,'corner',L.corner,'dave',5)}if(M.acc.brk>2){M.acc.brk=0;quip(M,'brake',L.brake,'dave',5)}if(M.acc.acc>1.8){M.acc.acc=0;quip(M,'accel',L.accel,'dave',8)}
  /* hard braking: the "never braked hard" bonus */
  if(gb>K.hardT){M.hardT+=dt;if(M.hardT>.12&&!M.hardOn){M.hardOn=true;St.hard++;if(M.hz&&M.hz.check)M.hz.check.hard=true}}else if(gb<.3){M.hardT=0;M.hardOn=false}
  hazards(M,e,c,dt);
  cargoStep(M,dt,g.flon,g.flat)}
/* potholes, speed bumps, the bridge joint, kerbs: per wheel, from where it was last frame to where it is now */
function wheels(c){const f=fwd(c.yaw),r=rgt(c.yaw),out=[];for(const ax of[1.85,-1.7])for(const s of[-.8,.8])out.push([c.x+f[0]*ax+r[0]*s,c.z+f[1]*ax+r[1]*s,ax>0?0:1,s<0?0:1]);return out}
function hazards(M,e,c,dt){const a=A(),v=Math.abs(c.spd),W_=wheels(c),prev=M.wp;M.wp=W_;if(!prev)return;const cd=M.hcd;
  for(const k in cd)cd[k]-=dt;
  const pots=(a.WORLD&&a.WORLD.potholes)||[];
  for(let i=0;i<4;i++){const[x,z,axl,side]=W_[i],[px,pz]=prev[i];
    for(const p of pots){if(Math.abs(p.x-x)>3||Math.abs(p.z-z)>3)continue;if(Math.hypot(p.x-x,p.z-z)<p.r+.12&&!((cd[p.id+i]||0)>0)&&v>.6){cd[p.id+i]=.6;
        hit(M,'pot',K.potA+K.potB*v,{sv:Math.min(2.6,.6+.14*v),side,axl,v,id:p.id})}}
    for(const b of BUMPS){const ax_=b.ax,d0=ax_==='x'?px-b.x:pz-b.z,d1=ax_==='x'?x-b.x:z-b.z,across=ax_==='x'?Math.abs(z-b.z):Math.abs(x-b.x);
      if(d0*d1<=0&&d0!==d1&&across<b.half+.2&&side===0)hit(M,'bump',Math.max(0,v-K.bumpSafe)*K.bumpK,{sv:Math.min(2.8,.25+.16*v),axl,v,b})}
    for(const sx of SEAMS){if((px-sx)*(x-sx)<=0&&px!==x&&z>SEAM_Z[0]&&z<SEAM_Z[1]){const fx=Math.abs(-Math.sin(c.yaw)),th=Math.acos(clamp(fx,0,1)),fa=th>.26?.3:1-.7*th/.26;
        hit(M,'seam',Math.max(0,v-K.seamSafe)*K.seamK*fa,{sv:Math.min(1.8,.2+.1*v*fa),axl,v,angle:th,fa})}}
    /* kerbs: the ground under a wheel steps up or down */
    const gy=a.groundAt(x,z);if(M.gh[i]!=null&&Math.abs(gy-M.gh[i])>.07&&v>.8&&!((cd.kerb||0)>0)){cd.kerb=.3;if(M.dbg)M.dbg.push('kerb w'+i+' '+x.toFixed(2)+','+z.toFixed(2)+' '+M.gh[i].toFixed(2)+'>'+gy.toFixed(2)+' lp'+M.lp.toFixed(2));hit(M,'kerb',K.kerbA+K.kerbB*v,{sv:Math.min(2.2,.4+.13*v),v})}M.gh[i]=gy}}
/* an event: integrity, the cargo hops, the body jolts, a line */
function hit(M,kind,dmg,o){const a=A(),St=M.S;o=o||{};const v=o.v||0;
  if(kind==='bump'){M.bumpN=(M.bumpN||0)+1;if(dmg<.6){if(o.axl===1&&!M.cd.bumpGood)quip(M,'bumpGood',L.bumpGood,'dave',14)}else if(o.axl===1)quip(M,'bump',L.bump,'dave',4)}
  else if(kind==='pot')quip(M,'pot',L.pot,'dave',5);
  else if(kind==='seam'){if(o.axl===1&&!M.seamSaid){M.seamSaid=1;if(dmg<1.2)quip(M,'seam',L.seamGood,'dave',8);else quip(M,'seam',L.seamBad,'dave',8)}}
  else if(kind==='kerb')quip(M,'kerb',L.kerb,'dave',6);
  else if(kind==='crash'){quip(M,'crash',L.crash,'dave',5);if(rnd()<.5)setTimeoutT(M,1.6,()=>quip(M,'dougHit',L.dougHit,'doug',8,false))}
  St.hits[kind]=(St.hits[kind]||0)+1;if(dmg>0)hurt(M,dmg,kind);
  /* the cargo hops (more on the side that hit), the sauce slops, the body jolts */
  const sv=o.sv||0;if(M.items)for(const it of M.items){if(!it.inBed)continue;const sideK=o.side==null?1:(o.side?it.w>0:it.w<0)?1.15:.75;it.vy=Math.max(it.vy,sv*sideK*(it.m<2?1.25:it.m>8?.55:.85)*rr(.75,1.05));
    it.vu+=rr(-.15,.15)*sv;it.vw+=rr(-.15,.15)*sv;if(it.kind==='pot'){it.thv+=rr(-1,1)*sv*1.6;it.twv=(it.twv||0)+rr(-1,1)*sv*1.6}}
  M.jv=(M.jv||0)+sv*.55;
  if(sv>.5){try{const FX=window.HT&&HT.FX;if(FX&&FX.shake)FX.shake(Math.min(.35,sv*.09))}catch(_){}
    try{const Au=window.HT&&HT.Audio,p=M.truck&&M.truck.pos;if(Au&&Au.ready&&Au.impact&&p){Au.impact(kind==='crash'?'metal':'concrete',{x:p.x,y:.6,z:p.z});if(sv>1)Au.impact('metal',{x:p.x,y:1,z:p.z})}}catch(_){}}}
function hurt(M,d,kind){const St=M.S;if(!(d>0))return;St.integ=Math.max(0,St.integ-d);M.lastHurt=M.elapsed;M.hurtPulse=Math.min(1,(M.hurtPulse||0)+d*.12);if(kind)St.by[kind]=(St.by[kind]||0)+d}
/* a timeline that runs on the job's own clock (no wall-clock timers) */
function setTimeoutT(M,t,fn){(M.tl||(M.tl=[])).push({at:M.elapsed+t,fn})}
function tlTick(M){if(!M.tl||!M.tl.length)return;for(let i=0;i<M.tl.length;i++){const q=M.tl[i];if(q.at<=M.elapsed){M.tl.splice(i--,1);try{q.fn()}catch(e){console.warn('[cargo]',e)}}}}

/* ---------------- the cargo in the bed: friction, walls, each other, hops; the sauce sloshes, the pickles tip ---------------- */
function cargoStep(M,dt,lon,lat){const items=M.items;if(!items)return;const n=2,h=dt/n,au=-lon*G0,aw=-lat*G0;M.slideB=Math.min(K.slideRate,(M.slideB==null?K.slideRate:M.slideB)+K.slideRate*dt);
  for(const it of items){const sp=Math.hypot(it.vu,it.vw);if(sp>2.2){it.vu*=2.2/sp;it.vw*=2.2/sp}}
  for(let s=0;s<n;s++){
    for(const it of items){if(!it.inBed)continue;const mu=it.tipped?.16:it.mu,air=it.y>.0005||it.vy>0;
      if(!air){const sp=Math.hypot(it.vu,it.vw);
        if(sp<.02){const am=Math.hypot(au,aw);if(am<=mu*1.12*G0){it.vu=it.vw=0}else{const kk=(am-mu*G0)/am;it.vu+=au*kk*h;it.vw+=aw*kk*h}}
        else{const fu=it.vu/sp,fw=it.vw/sp,nu=it.vu+(au-mu*G0*fu)*h,nw=it.vw+(aw-mu*G0*fw)*h;if(nu*it.vu+nw*it.vw<0){it.vu=it.vw=0}else{it.vu=nu;it.vw=nw}}}
      else{it.vu+=au*h;it.vw+=aw*h}
      if(air){it.vy-=G0*h;it.y+=it.vy*h;if(it.y<=0){if(it.frag&&-it.vy>K.landV)hurt(M,(-it.vy-K.landV)*K.landK*it.frag,'land');it.y=0;it.vy=0}}
      it.u+=it.vu*h;it.w+=it.vw*h;
      wall(M,it,'u',BED.u0,1);wall(M,it,'u',BED.u1,-1);wall(M,it,'w',BED.w0,1);wall(M,it,'w',BED.w1,-1);
      /* Doug's legs */
      boxHit(M,it,DOUGBOX,true);
      /* the pickle jar tips when the bed shoves it hard enough */
      if(it.kind==='jar'&&!it.tipped){const am=Math.hypot(au,aw)/G0+(it.y>0?.3:0);if(am>it.tip){it.tipped=.01;it.tipDir=Math.atan2(aw,au);quip(M,'jar',["The pickles! The pickles went down!","Pickle jar's down. Pickle jar is DOWN."],'doug',30,false)}}
      if(it.tipped&&it.tipped<1)it.tipped=Math.min(1,it.tipped+h*5);
      /* the sauce */
      if(it.kind==='pot'){const w2=64,c2=2.4,kS=9;it.thv=(it.thv||0)+(-w2*it.th-c2*it.thv+kS*au/G0)*h;it.th+=it.thv*h;it.twv=(it.twv||0)+(-w2*(it.tw2||0)-c2*it.twv+kS*aw/G0)*h;it.tw2=(it.tw2||0)+it.twv*h;
        const m_=Math.hypot(it.th,it.tw2);if(m_>.27&&M.S.sauce>0&&!((M.hcd.spill||0)>0)){M.hcd.spill=.5;M.S.sauce=Math.max(0,M.S.sauce-6);spill(M,it.th/m_,it.tw2/m_,m_)}}}
    /* item against item: push apart (mass-weighted), bounce a little; a pan hit hard is brisket lost */
    for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const p=items[i],q=items[j];if(!p.inBed||!q.inBed)continue;pairHit(M,p,q)}}
  for(const it of items)if(it.inBed)placeItem(it);
  if(M.S.sauce<100&&M.items){const pot=M.items.find(x=>x.kind==='pot');if(pot&&pot.surf)pot.surf.position.y=.07+.12*M.S.sauce/100}}
function wall(M,it,ax,b,sg){const half=ax==='u'?it.hu:it.hw,v=ax==='u'?'vu':'vw';const lim=b+sg*half;if(sg>0?it[ax]<lim:it[ax]>lim){const imp=Math.abs(it[v]);it[ax]=lim;if(sg>0?it[v]<0:it[v]>0)it[v]=-it[v]*.22;impact(M,it,imp,null)}}
function boxHit(M,it,B,stat){const ou=Math.min(it.u+it.hu,B.u1)-Math.max(it.u-it.hu,B.u0),ow=Math.min(it.w+it.hw,B.w1)-Math.max(it.w-it.hw,B.w0);if(ou<=0||ow<=0)return;
  if(ou<ow){const s=it.u<(B.u0+B.u1)/2?-1:1;it.u+=s*ou;const imp=Math.abs(it.vu);if(it.vu*s<0)it.vu=-it.vu*.2;impact(M,it,imp,'doug')}else{const s=it.w<(B.w0+B.w1)/2?-1:1;it.w+=s*ow;const imp=Math.abs(it.vw);if(it.vw*s<0)it.vw=-it.vw*.2;impact(M,it,imp,'doug')}}
function pairHit(M,p,q){const ou=Math.min(p.u+p.hu,q.u+q.hu)-Math.max(p.u-p.hu,q.u-q.hu),ow=Math.min(p.w+p.hw,q.w+q.hw)-Math.max(p.w-p.hw,q.w-q.hw);if(ou<=0||ow<=0)return;
  if(p.y>q.h*.9||q.y>p.h*.9)return;/* (one hopped over the other) */
  const mp=p.m,mq=q.m,tp=mq/(mp+mq),tq=mp/(mp+mq);let nu=0,nw=0,pen;if(ou<ow){nu=p.u<q.u?-1:1;pen=ou}else{nw=p.w<q.w?-1:1;pen=ow}
  p.u+=nu*pen*tp;p.w+=nw*pen*tp;q.u-=nu*pen*tq;q.w-=nw*pen*tq;
  const rv=(p.vu-q.vu)*nu+(p.vw-q.vw)*nw;if(rv<0){const j=-(1.2)*rv/(1/mp+1/mq);p.vu+=j*nu/mp;p.vw+=j*nw/mp;q.vu-=j*nu/mq;q.vw-=j*nw/mq;const imp=-rv;impact(M,p,imp,q);impact(M,q,imp,p)}}
function impact(M,it,imp,other){if(imp<K.wallV)return;if(it.frag){const mk=other&&other.m?Math.min(1,other.m/it.m):1,d=Math.min(K.wallMax,(imp-K.wallV)*K.wallK*it.frag*mk,M.slideB);M.slideB-=d;hurt(M,d,'slide');if(M.dbg)M.dbg.push('imp '+it.id+'/'+(other&&other.id||other||'wall')+' '+imp.toFixed(2)+' -'+d.toFixed(1)+' g'+M.g.flon.toFixed(2)+','+M.g.flat.toFixed(2)+' y'+it.y.toFixed(2))}
  if(imp>.5){M.rattle=Math.min(1,(M.rattle||0)+imp*.3);if(other==='doug')quip(M,'shins',["Ow. My shins. The cooler got my shins.","That's my shin! That's my good shin!"],'doug',25,false);
    else if(it.frag&&imp>.8)quip(M,'tray',["The tray slid. I heard the tray slide.","Something hit the brisket. WHAT hit the brisket."],'dave',7,false)}}
/* sauce over the rim: toward the cab it paints the back window; anywhere else it slops in the bed */
function spill(M,du,dw,m_){const t=textures(),g=t.splat.userData.g;M.S.spills=(M.S.spills||0)+1;
  if(du>.35){const n=3+Math.floor(m_*12);for(let i=0;i<n;i++){const x=128+dw*60+rr(-70,70),y=rr(40,120),r=rr(4,16)*(.6+m_);g.fillStyle='rgba('+Math.floor(rr(70,100))+','+Math.floor(rr(18,30))+',10,'+rr(.75,.95)+')';g.beginPath();g.ellipse(x,y,r,r*rr(.7,1.1),rr(0,3),0,6.283);g.fill();
      if(rnd()<.6){g.fillRect(x-r*.18,y,r*.36,rr(10,40))}}t.splat.needsUpdate=true;quip(M,'sauce',L.sauce,'dave',18,false)}
  else quip(M,'slop',["The sauce is sloshing! The sauce has a mind of its own!","Sauce on my shorts. That's fine. That's a souvenir."],'doug',20,false)}
/* how the flat looks: pieces part, slices topple, the foil tears */
function cargoLook(M,dt){const it=M.items&&M.items.find(x=>x.kind==='flat');if(!it||!it.slab)return;const f=1-M.S.integ/100;
  it.slab[0].position.x=-f*.05;it.slab[0].rotation.y=f*.25;it.slab[1].position.x=f*.04;it.slab[1].rotation.y=-f*.3;it.slab[1].position.z=-.04+f*.03;
  it.slices.forEach((s,k)=>{s.rotation.x=.42+f*(.7+k*.08);s.position.x=(k%2?1:-1)*f*.04;s.position.y=.05-f*.012});if(it.tent){it.tent.rotation.z=f*.18;it.tent.position.x=f*.03}
  if(M.S.integ<35&&it.slices[5])it.slices[5].visible=false;
  /* the probe's readout */const T=Math.round(M.S.temp);if(T!==M.probeT){M.probeT=T;const t=textures(),g=t.probe.userData.g;g.fillStyle='#10161a';g.fillRect(0,0,64,32);g.fillStyle=T>=K.warmT?'#7dffb0':T>=K.coldT?'#ffd36b':'#ff7a6a';g.font='bold 22px monospace';g.textAlign='center';g.fillText(T+'°',32,24);t.probe.needsUpdate=true}}

/* ================================================================= Gary (his beige car, right behind you) and the hustlers (a hatchback) */
function mkGary(M,s){const a=A(),rc=railCar(M,'sedan','#cdb990','Gary');rc.s=s;rc.lat=0;rc.latT=0;rc.v=0;rc.st='follow';rc.d=dad('gary',0,0,0);M.gy=rc;railStep(rc,M.route,1/30);seat(rc.d,rc.e,SEAT.sedan,1/30);return rc}
function mkHustlers(M){const a=A(),rc=railCar(M,'hatch','#97b83b','the hatchback');rc.s=Math.max(0,M.sP-48);rc.lat=-3;rc.latT=-3;rc.v=Math.max(10,M.vP+5);rc.st='catch';rc.frust=0;rc.n=0;
  rc.d=person(null,{look:{shirt:'#2b2b2b',pants:'#3b4a63',cap:'#c23b2e'}},0,0,0);rc.d2=person(null,{look:{shirt:'#d9d2c0',pants:'#2b2b2b'}},0,0,0);
  try{const ud=rc.e.obj.userData;if(ud.setDamage)ud.setDamage(.28)}catch(_){}
  M.hz=rc;railStep(rc,M.route,1/30);const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.music('tension',{intensity:.55})}catch(_){}return rc}
/* the lane beside you: left of you, unless you're already over there */
const laneBeside=M=>M.lp<-1.4?clamp(M.lp+3,-3.6,.9):clamp(M.lp-3,-3.6,.9);
/* parked cars sitting in the right lane: rail cars swing out around them */
function obstacleLat(M,s,lat){for(const o of M.obst)if(s>o.s0&&s<o.s1&&lat>-2.2)return-3;return lat}
function garyTick(M,dt){const rc=M.gy;if(!rc||rc.gone)return;const vP=M.vP;rc.t+=dt;
  if(rc.st==='follow'){const sT=M.sP-15;rc.vT=clamp(vP+clamp((sT-rc.s)*.7,-6,9),0,17);if(rc.s>M.sP-9)rc.vT=Math.min(rc.vT,Math.max(0,vP-2));rc.latT=obstacleLat(M,rc.s+6,0);
    if(M.hz&&!M.hz.gone&&Math.abs(M.hz.lat-rc.latT)<2.2&&M.hz.s>rc.s)rc.vT=Math.min(rc.vT,M.hz.s-rc.s>9?rc.vT:Math.max(0,M.hz.v-1))}
  else if(rc.st==='block'){const hz=M.hz;/* get in front of the hatchback in its lane, then get very, very lost */
    if(!hz||hz.gone){rc.st='follow'}else{const ahead=rc.s>hz.s+6.5;rc.latT=ahead?hz.lat:0;const sT=hz.s+8;rc.vT=ahead?Math.max(0,hz.v-2.5):clamp(Math.max(vP,hz.v)+5,0,18);
      if(ahead&&rc.v<.6&&hz.v<.6&&!rc.said){rc.said=1;sayAll(L.garyBlock,false);hz.st='blocked'}}}
  else if(rc.st==='parked'){rc.vT=0}
  if(M.S.ph==='party'&&M.barS!=null)rc.s=Math.min(rc.s,M.barS-7);
  railStep(rc,M.route,dt,{dec:rc.st==='block'?6:9});
  /* gone once you're well clear and they're out of sight */
  if(rc.st!=='follow'&&M.sP-rc.s>55&&!onScreen(rc.e.pos)){railHide(rc);if(rc.d)rc.d.root.visible=false}}
function onScreen(p){const a=A();try{const q=a.project(p.x,1,p.z);return!q.behind&&q.x>-80&&q.x<innerWidth+80&&q.y>-80&&q.y<innerHeight+80}catch(_){return true}}
function hzTick(M,dt){const hz=M.hz;if(!hz||hz.gone)return;const a=A(),vP=M.vP;hz.t+=dt;const side=laneBeside(M);
  const gary=M.gy&&!M.gy.gone?M.gy:null;
  switch(hz.st){
  case 'catch':{hz.latT=side;const sT=M.sP-1;hz.vT=clamp(vP+clamp((sT-hz.s)*.6,-4,9),0,19);if(Math.abs(hz.s-M.sP)<4){hz.st='along';hz.t=0;hz.n++;
      if(!M.S.hzSaid){M.S.hzSaid=1;sayAll(L.hzSpawn,true)}else say('Hustler',pickR(["Come on, man! One slice!","We just want a sniff! A little sniff!","Pull over! We have bread!"]),true);
      if(hz.n===1&&gary&&!M.S.garyUsed&&!M.S.garyOffered){M.S.garyOffered=1;setTimeoutT(M,5.5,()=>sayAll(L.garyOffer,false))}honk(hz)}break}
  case 'along':{/* window down, matching your speed; they squeeze in for a moment (no room beside you: they tuck in behind) */const room=Math.abs(side-M.lp)>2.55,squeeze=room&&hz.t>2.2&&hz.t<3.2?.4:0;hz.latT=side+(side<M.lp?squeeze:-squeeze);
    hz.vT=clamp(vP+clamp(((room?M.sP+.6:M.sP-9)-hz.s)*1.2,-4,5),0,19);if(vP<3.5)hz.slowT=(hz.slowT||0)+dt;else hz.slowT=0;if(hz.slowT>5&&room){hz.st='pass';hz.t=0;hz.slowT=0}if(hz.n===1&&hz.t>1.4&&!M.S.alongSaid){M.S.alongSaid=1;sayAll(L.hzAlong,false)}
    if(hz.t>(hz.n===1?6.5:4.5)&&vP>3.5&&room){hz.st='pass';hz.t=0}break}
  case 'pass':{hz.latT=side;hz.vT=clamp(vP+clamp((M.sP+11-hz.s)*.9,-3,6),0,20);if(hz.s>M.sP+9.5){hz.st='cut';hz.t=0}if(hz.t>9){hz.st='along';hz.t=0}break}
  case 'cut':{hz.vT=clamp(vP+clamp((M.sP+10-hz.s)*.8,-3,3),0,20);if(hz.s-M.sP>7)hz.latT=M.lp;else hz.latT=side;
    if(Math.abs(hz.lat-M.lp)<.45&&hz.t>1.2){hz.st='check';hz.t=0;hz.check={peak:0,contact:false,hard:false,gap:hz.s-M.sP};say('Hustler',pickR(L.hzTell),true);honk(hz)}
    if(hz.t>7){hz.st='along';hz.t=0}break}
  case 'check':{/* the brake check: they stop dead in front of you */hz.vT=0;hz.check.peak=Math.max(hz.check.peak,-M.g.lon);
    if(hz.t>1&&hz.v<.4||hz.t>3.6){const C=hz.check,smooth=!C.hard&&!C.contact;if(smooth)hz.frust++;hz.st='recover';hz.t=0;
      if(smooth)quip(M,'hzOk',L.hzSmooth,'dave',2,true);else quip(M,'hzBad',L.hzHard,C.contact?'doug':'dave',2,true);M.S.checks=(M.S.checks||0)+1;if(smooth)M.S.checksOk=(M.S.checksOk||0)+1}break}
  case 'recover':{hz.latT=side;hz.vT=Math.max(0,vP-3.5);if(hz.s<M.sP-3&&hz.t>1.5){if(hz.frust>=K.hzFrust){hz.st='quit';hz.t=0;sayAll(L.hzQuit,true)}else{hz.st='along';hz.t=0;hz.n++}}
    if(hz.t>8){hz.st='along';hz.t=0;hz.n++}break}
  case 'drop':{/* Gary's coming: they drop back to try and come round */hz.latT=side;hz.vT=clamp(vP+clamp((M.sP-14-hz.s)*.7,-7,2),0,18);if(gary&&gary.s>hz.s+6.5)hz.vT=Math.min(hz.vT,Math.max(0,gary.v-1.5));break}
  case 'blocked':case 'stopped':hz.vT=0;break;
  case 'quit':{hz.latT=-3;hz.vT=Math.max(0,vP-6);break}}
  /* never into the side of you, never into the back of you */
  if(hz.st!=='check'&&hz.st!=='cut'){const over=Math.abs(hz.latT-M.lp)<2.2;if(over&&hz.s<M.sP+6&&hz.s>M.sP-7)hz.latT=side}
  if(hz.s<M.sP&&Math.abs(hz.lat-M.lp)<2.2)hz.s=Math.min(hz.s,M.sP-6.2);
  if(gary&&Math.abs(gary.lat-hz.lat)<2.2&&hz.s<gary.s)hz.s=Math.min(hz.s,gary.s-6.5);
  if(M.S.ph==='party'&&M.barS!=null)hz.s=Math.min(hz.s,M.barS-9);
  railStep(hz,M.route,dt,{dec:hz.st==='check'?K.hzCheckDecel:9,latK:hz.st==='cut'?1.1:1.6});
  /* a touch: paint and brisket */
  const tr=M.truck;if(tr){const dx=hz.e.pos.x-tr.pos.x,dz=hz.e.pos.z-tr.pos.z,d=Math.hypot(dx,dz),f=fwd(tr.yaw),along=Math.abs(dx*f[0]+dz*f[1]),side_=Math.abs(-dx*f[1]+dz*f[0]);
    if(along<4.9&&side_<1.95&&!((M.hcd.touch||0)>0)){M.hcd.touch=1;if(hz.check)hz.check.contact=true;const rv=Math.abs(hz.v-M.vP);hit(M,'touch',1.5+rv*1.6,{sv:.6+rv*.15,v:rv});const h=H();if(h.carDamage&&tr)try{h.carDamage(tr,2+rv*2,'ram')}catch(_){}}}
  if((hz.st==='quit'||hz.st==='blocked'||hz.st==='stopped')&&M.sP-hz.s>45&&!onScreen(hz.e.pos)){railHide(hz);for(const d of[hz.d,hz.d2])if(d)d.root.visible=false;M.S.hzDone=1}}
function honk(rc){try{const Au=window.HT&&HT.Audio;if(Au&&Au.ready&&Au.vehicle){/* a short beep from their position via an impact-free voice: the horn voice needs an engine, so use a ui click as a stand-in when absent */}}catch(_){}}
function callGary(M){const gy=M.gy,hz=M.hz;if(!gy||gy.gone||!hz||hz.gone||M.S.garyUsed)return;M.S.garyUsed=1;sayAll(L.garyGo,true);gy.st='block';gy.t=0;if(hz.st!=='quit')hz.st='drop';hz.t=0}
const garyCanBlock=M=>!!(M.gy&&!M.gy.gone&&M.hz&&!M.hz.gone&&!M.S.garyUsed&&['along','pass','cut','check','recover','catch'].includes(M.hz.st)&&M.gy.s>M.sP-70);

/* ================================================================= the route and what's on it */
function buildRoute(M,from){const a=A(),G=a.roads();if(!G)return null;const r=G.route({x:from.x,z:from.z},{x:PARK.x,z:PARK.z});let pts=r&&r.points&&r.points.length>3?r.points.slice(1,-1):[];
  /* (G.route starts and ends on the centre line: start in the lane where you are, end at the spot, then a run-out for the rail cars) */
  pts=[{x:from.x,z:from.z}].concat(pts.filter(q=>Math.hypot(q.x-from.x,q.z-from.z)>2));pts.push({x:PARK.x,z:PARK.z},{x:PARK.x+30,z:PARK.z});/* run-out past the park spot (rail cars stop short of the end) */
  const R_=mkRoute(pts);M.route=R_;
  /* potholes and bumps the GPS line goes over (Dave calls them out), parked cars in the lane (rail cars swing round) */
  const pots=((a.WORLD&&a.WORLD.potholes)||[]).map(p=>{const q=routeProj(R_,p.x,p.z);return{p,s:q.s,lat:q.lat,d:q.d}}).filter(q=>q.d<4);M.pots=pots;
  M.bumpS=BUMPS.map(b=>({b,s:routeProj(R_,b.x,b.z).s,d:routeProj(R_,b.x,b.z).d})).filter(q=>q.d<5);
  M.seamS=SEAMS.map(x=>routeProj(R_,x,43).s);M.barS=routeProj(R_,BAR.x,15).s;M.parkS=routeProj(R_,PARK.x,PARK.z).s;
  M.obst=[];for(const c of(a.L&&a.L.cars)||[]){if(!c||!c.pos||c===a.VAN||c===M.truck)continue;const q=routeProj(R_,c.pos.x,c.pos.z);if(q.d<2.4)M.obst.push({s0:q.s-9,s1:q.s+7})}
  return R_}
/* hazards ahead (for Dave's call-outs and the scripted driver): [{kind,s,lat}] within d metres */
function ahead(M,d){const out=[];const s0=M.sP;for(const q of M.pots)if(q.s>s0&&q.s<s0+d)out.push({kind:'pot',s:q.s,lat:q.lat,r:q.p.r,id:q.p.id});
  for(const q of M.bumpS)if(q.s>s0&&q.s<s0+d)out.push({kind:'bump',s:q.s});for(const s of M.seamS)if(s>s0&&s<s0+d)out.push({kind:'seam',s});return out}

/* ================================================================= the job */
function freshState(){return{ph:'load',integ:100,temp:K.temp0,sauce:100,hard:0,hits:{},by:{},garyUsed:0,garyOffered:0,hzSaid:0,alongSaid:0,hzDone:0,checks:0,checksOk:0,spills:0,plate:null,tier:0,trust:0,
  items:null,said:{}}}
J.register('cargo',{
  def:{giver:'dave',hood:'river',title:'Handle With Care',role:'Big Dave · Pitmaster',place:"Dave's house → the Riverside block party",
    lines:L.brief,
    obj:"Drive Big Dave's fourteen-hour brisket across the river to the block party without throwing it around.",
    crew:[],weapons:['pistol'],noGuns:"Not with the brisket in the truck. Not with Dave in the truck.",
    from:{place:'g_dave'},start:{x:RING.x,z:RING.z},site:null,
    unlock:{done:['benny']},pay:500,par:240,winTrust:0,roam:true,order:22,
    stages:['load','drive','bridge','party'],stageLabels:{load:"Dave's table",drive:'The drive',bridge:'At the bridge',party:'The block party'},failPolicy:'escalate',
    medals:['Delivered','Pristine: 90% or better','Perfect: 98% or better, no stage retry'],
    radio:[['dave',"Fourteen hours. Don't you dare rush the last fifteen minutes."]],
    endLine:"Both sides of the bridge, one table, and a brisket people will talk about for years."},

  start(M,o){const a=A();disposeRun();TX=null;mats.m=null;R.active=true;SEED=7919;TALK.q.length=0;TALK.t=0;
    M.S=freshState();M.g={lon:0,lat:0,flon:0,flat:0,mag:0,peak:0,trail:[]};M.acc={lat:0,brk:0,acc:0};M.cd={dave:0};M.hcd={};M.gy=null;M.hz=null;M.gh=[null,null,null,null];
    M.wp=null;M.pv=null;M.pT=0;M.pB=0;M.hardT=0;M.hardOn=false;M.sP=0;M.lp=0;M.vP=0;M.tl=[];M.outT=0;M.slowT=0;M.calm=0;M.dougT=18;M.jy=0;M.jv=0;M.noCars=true;M.sc=null;M.carry=null;M.crowd=null;
    preloadCast();
    if(a.CV&&a.CV!==a.VAN&&a.CV!==M.car)a.exitCar();
    mkTruck(M);M.car=M.truck;buildStreet(M);buildBarricade(M);hideRings();
    /* the table on Dave's lawn, Dave behind it, Doug in the bed */
    buildTable(M);M.dave=dad('dave',DAVE_AT.x,DAVE_AT.z,0);M.doug=dad('doug',TRUCK0.x,TRUCK0.z,0);
    buildRoute(M,{x:GARY0.x-3,z:GARY0.z});
    /* your van, parked properly in the other lane; you on the sidewalk by Dave's table */
    if(!(o&&o.checkpoint)){const V=a.VAN;try{if(V&&a.CV!==V){V.pos.set(VAN_PARK.x,0,VAN_PARK.z);V.yaw=VAN_PARK.yaw;a.owStopCar(V);a.syncCar(V)}}catch(_){}
      a.P.pos.set(START_AT.x,0,START_AT.z);a.P.yaw=Math.atan2(-(TABLE.x-START_AT.x),-(TABLE.z-START_AT.z))}
    mkGary(M,0);placeGaryParked(M);
    if(o&&o.checkpoint)return;
    sayAll(L.load,false);const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.music('tension',{intensity:.22});R.music=true}catch(_){}},

  upd(dt,M,F){const a=A(),S=M.S;if(!S)return;talkTick(dt);tlTick(M);for(const k in M.cd)M.cd[k]-=dt;
    const e=M.truck,inT=a.CV===e&&!!e;
    if(e&&e.car){const pr=M.route?routeProj(M.route,e.pos.x,e.pos.z,M.sP):null;if(pr){M.sP=pr.s;M.lp=pr.lat;M.offT=pr.d>14?(M.offT||0)+dt:0}M.vP=Math.max(0,inT?e.car.spd:e.spd||0)}
    if(M.route&&M.offT>1.5&&e)reroute(M);
    /* failures */
    if(S.integ<=0&&S.ph!=='scene')return a.endMission(false,L.fail,'Pulled pork');
    if(e&&truckHp(e)<=0&&S.ph!=='load')return a.endMission(false,L.failTruck,'Wrecked');
    if(!inT&&a.P.dude&&a.P.dude.gun)a.equip(a.P.dude,null);
    if(S.ph==='load'||S.ph==='board'){loadTick(M,dt,F);return}
    if(S.ph==='scene'){sceneTick(M,dt,F);return}
    /* driving: the temperature, the crew's lines, the stages */
    S.temp=Math.max(120,S.temp-(K.cool+(S.integ<50?K.coolTorn:0))*dt);
    if(!inT){M.outT+=dt;F.objs.push(["Get back in Dave's truck",false,'warn']);F.target={x:e.pos.x,z:e.pos.z,label:"Dave's truck"};
      F.taps.push({x:e.pos.x,z:e.pos.z,r:3.4,txt:"Get in Dave's truck",fn:()=>{mount(M)}});
      if(M.outT>4&&!M.cd.out){M.cd.out=12;say('dave',pickR(["Where are you going? The brisket's in here!","Get back in the truck! It's cooling!"]),true)}
      if(M.outT>25)return a.endMission(false,L.failLeft,'Left the brisket');return}
    M.outT=0;
    driveTick(M,dt,F)},

  /* [CP] what a stage needs: the brisket's numbers, the cargo's places, who's done what */
  save(M){const S=M.S||{},r1=x=>Math.round((x||0)*10)/10,r2=x=>Math.round((x||0)*100)/100;
    const items=M.items?M.items.map(it=>[it.id,r2(it.u),r2(it.w),it.tipped?1:0]):(S.items||null);
    return{ph:S.ph||'load',integ:r1(S.integ),temp:r1(S.temp),sauce:Math.round(S.sauce||0),hard:S.hard|0,garyUsed:S.garyUsed?1:0,garyOffered:S.garyOffered?1:0,hzSaid:S.hzSaid?1:0,alongSaid:S.alongSaid?1:0,
      hzDone:S.hzDone?1:0,checks:S.checks|0,checksOk:S.checksOk|0,spills:S.spills|0,items}},
  load(M,s){if(!s)return;const S=M.S||(M.S=freshState());
    for(const k of['integ','temp','sauce','hard','garyUsed','garyOffered','hzSaid','alongSaid','hzDone','checks','checksOk','spills'])if(s[k]!=null)S[k]=s[k];
    S.ph=s.ph||'load';S.items=s.items||null;
    const a=A();if(!M.truck||!a||!a.THREE)return;/* (Node: state only) */
    if(s.items&&M.items)for(const[id,u,w,tp]of s.items){const it=M.items.find(x=>x.id===id);if(!it)continue;it.u=u;it.w=w;it.tipped=tp?1:0;it.vu=it.vw=it.vy=it.y=0;if(id==='flat'){putFlat(M,true)}placeItem(it)}
    if(S.ph!=='load'&&S.ph!=='board'){putFlat(M,true);if(a.CV!==M.truck)mount(M);M.dave&&seat(M.dave,M.truck,SEAT.sh,1/30)}
    /* the stage we're back at */
    if(S.ph==='bridge'||S.ph==='party'){placeGaryBehind(M,S.ph==='party')}
    if(S.ph==='party'){buildParty(M);partyCrowd(M)}
    if(S.ph==='scene'){S.ph='party'}
    textures();redrawSplat(M)},
  payout(M,ok){if(!ok)return[];const S=M.S,out=[];if(S.integ>=90)out.push(['Pristine ('+Math.floor(S.integ)+'%)',K.pristine]);if(!S.hard)out.push(['Never braked hard',K.smooth]);if(S.temp>=K.warmT)out.push(['Still steaming ('+Math.round(S.temp)+'°F)',K.steam]);return out},
  medal:M=>{const v=M.S?M.S.integ:0;return v>=98?3:v>=90?2:1},
  end(M,ok){if(!ok)return;const a=A(),s=a.SV();if(!s)return;s.flags=s.flags||{};s.flags.blockParty=true;if(M.S&&M.S.plate===0)s.flags.hustlersFed=true;try{a.save()}catch(_){}},
  vehicle(car,dt){const M=A().M;if(!M||!M.S||car!==M.truck)return;vehicleTick(M,car,dt)},
  pose(dt){const M=A().M;if(!M||!M.S)return;poseTick(M,dt)},
  camera(dt){const M=A().M;if(!M||!M.S||M.S.ph!=='scene'||!M.sc)return false;return sceneCam(M,dt)},
  hud(st){const M=A().M;if(!M||!M.S)return;hudTick(M,st)},
  test:{give(a){const h=window.__ht,s=a.SV();for(const id of['gary','rick','dave','doug','earl','dee','rosa','benny']){const i=a.MISSIONS.findIndex(m=>m.id===id);if(i>=0&&h&&h.prog)h.prog.done[i]=true;if(s&&window.HT.Save&&HT.Save.jobRec)HT.Save.jobRec(s,id).done=true}
      if(s&&s.world)s.world.bridgeOpen=true;
      /* the Riverside cast the party needs: load it now so the scripted run finds it cached */
      preloadCast()},
    step:(a,t,o)=>bot(a,t,o),
    sample:()=>({S:Object.assign(freshState(),{ph:'bridge',integ:91.4,temp:158.2,sauce:88,hard:1,garyOffered:1,hzSaid:1,items:[['flat',-1.7,.27,0],['pickles',-2.3,-.06,1]]})})}
});

/* ================================================================= stage 1: Dave's table, the carry, the bed */
function buildTable(M){const a=A(),T3=a.THREE,g=new T3.Group();g.name='cargoTable';a.wmAdd(g);const y=a.groundAt(TABLE.x,TABLE.z);g.position.set(TABLE.x,y,TABLE.z);
  const top=M3({color:'#efeee9',roughness:.55}),leg=M3({color:'#8d9197',metalness:.5,roughness:.4}),blk=M3({color:'#1d1e20',roughness:.55,metalness:.35});
  mesh(rbox(1.5,.045,.7,.018,2),top,0,.74,0,g);for(const x of[-.66,.66])for(const z of[-.27,.27])mesh(geo(new T3.CylinderGeometry(.016,.016,.73,6)),leg,x,.365,z,g);
  /* tongs, a roll of butcher paper, a coffee */
  mesh(geo(new T3.CylinderGeometry(.06,.06,.42,12)),M3({color:'#cfa982',roughness:.8}),-.52,.83,.05,g).rotation.z=Math.PI/2;
  mesh(geo(new T3.CylinderGeometry(.04,.035,.1,12)),M3({color:'#c94f3a',roughness:.5}),.58,.81,-.18,g);
  M.tableG=g;const it=M.items.find(x=>x.id==='flat');g.add(it.g);it.g.position.set(.05,.765,0);it.g.rotation.set(0,0,0);it.inBed=false;it.on='table';
  /* the smoker in the yard, still going */
  const sm=new T3.Group();sm.position.set(47.8,a.groundAt(47.8,62.6),62.6);sm.rotation.y=.3;g.parent.add(sm);
  const barrel=mesh(geo(new T3.CylinderGeometry(.34,.34,1.15,20)),blk,0,.95,0,sm);barrel.rotation.z=Math.PI/2;mesh(rbox(.5,.48,.5,.03,2),blk,-.8,.82,0,sm);
  const ch=mesh(geo(new T3.CylinderGeometry(.06,.06,.7,10)),blk,.45,1.55,0,sm);for(const x of[-.45,.45])for(const z of[-.25,.25])mesh(geo(new T3.CylinderGeometry(.025,.025,.62,6)),leg,x,.31,z,sm);
  mesh(geo(new T3.TorusGeometry(.07,.018,6,12)),leg,.2,1.12,.34,sm);
  try{const FX=window.HT&&HT.FX;if(FX&&FX.emitter){const em=FX.emitter('hood',{object:ch,offset:[0,.36,0]});if(em){em.intensity=.35;em.steam=false;em.shade=.72;R.emit.push(em)}}}catch(_){}
  return g}
const flatItem=M=>M.items&&M.items.find(x=>x.id==='flat');
function putFlat(M,quiet){const a=A(),it=flatItem(M);if(!it)return;if(a.P.carry&&a.P.carry.mesh===it.g)a.wmDrop();if(it.g.parent!==M.bed){if(it.g.parent)it.g.parent.remove(it.g);M.bed.add(it.g)}
  it.inBed=true;it.on='bed';if(!quiet||it.u==null){it.u=-1.74;it.w=.27}it.vu=it.vw=it.vy=it.y=0;it.g.rotation.set(0,0,0);placeItem(it)}
function tailgate(M){const e=M.truck,f=fwd(e.yaw),S=A().carSize(e);return{x:e.pos.x-f[0]*(S.l/2+.55),z:e.pos.z-f[1]*(S.l/2+.55)}}
function doorAt(M,side){const e=M.truck,f=fwd(e.yaw),r=rgt(e.yaw);return{x:e.pos.x+f[0]*.4+r[0]*side*1.55,z:e.pos.z+f[1]*.4+r[1]*side*1.55}}
function startCarry(M){const a=A(),it=flatItem(M);if(!it||M.carry)return;a.wmCarry('tray',it.g,it);it.g.position.set(0,1.1,.42);it.on='hands';
  M.carry={tau:rr(-.06,.06),tv:0,t:0,px:a.P.pos.x,pz:a.P.pos.z,py:a.P.yaw,kick:.4,worst:0};sayAll(L.pickup,true);balOverlay(M,true)}
function carryTick(M,dt,F){const a=A(),P=a.P,C=M.carry,it=flatItem(M);C.t+=dt;
  const vx=(P.pos.x-C.px)/dt,vz=(P.pos.z-C.pz)/dt,yr=wrap(P.yaw-C.py)/dt;C.px=P.pos.x;C.pz=P.pos.z;C.py=P.yaw;
  const r=rgt(P.yaw),f=fwd(P.yaw),side=clamp(vx*r[0]+vz*r[1],-7,7),fw=clamp(vx*f[0]+vz*f[1],-8,8);
  /* an inverted pendulum: it leans further the more it leans; walking and turning shake it; stepping toward the low side catches it */
  C.kick-=dt;if(C.kick<=0){C.kick=rr(.45,.9);C.tv+=rr(-1,1)*K.balNoise*(.45+Math.abs(fw)/4.5)}
  C.tv+=(K.balK*C.tau-K.balDamp*C.tv+clamp(yr,-2.5,2.5)*K.balTurn-side*K.balCtrl)*dt;C.tau+=C.tv*dt;C.worst=Math.max(C.worst,Math.abs(C.tau));
  if(it&&it.g)it.g.rotation.z=C.tau*.55;
  if(Math.abs(C.tau)>.62&&!M.cd.wobble){M.cd.wobble=2.4;say('dave',pickR(L.wobble),true)}
  if(Math.abs(C.tau)>=1){dropTray(M);return}
  const tg=tailgate(M);F.objs.push(['Carry the brisket to the truck · keep it level',false]);F.objs.push(['Lean? Step under it (A / D)',false]);F.target={x:tg.x,z:tg.z,label:'Tailgate'};
  F.taps.push({x:tg.x,z:tg.z,r:2.1,txt:'Slide it into the truck bed',fn:()=>loadFlat(M)})}
function dropTray(M){const a=A(),it=flatItem(M);balOverlay(M,false);if(a.P.carry)a.wmDrop();if(it&&it.g){const P=a.P,f=fwd(P.yaw);a.wmAdd(it.g);it.g.position.set(P.pos.x+f[0]*.8,a.groundAt(P.pos.x,P.pos.z)+.02,P.pos.z+f[1]*.8);it.g.rotation.set(0,P.yaw,Math.PI*.92)}
  M.carry=null;a.radio('dave',"NO. No no no no.",true);a.endMission(false,L.failTray,'Dropped it')}
function loadFlat(M){const a=A();balOverlay(M,false);putFlat(M,false);M.carry=null;M.S.ph='board';sayAll(L.loaded,true);try{const Au=window.HT&&HT.Audio;if(Au&&Au.ready&&Au.ui)Au.ui('pickup')}catch(_){}}
function loadTick(M,dt,F){const a=A(),P=a.P,S=M.S;
  if(S.ph==='load'){if(!M.carry){F.objs.push(["Pick up the brisket from Dave's table",false]);F.target={x:TABLE.x,z:TABLE.z,label:'The brisket'};M.holdO=M.holdO||{};
      F.holds.push({x:TABLE.x,z:TABLE.z+.55,r:1.9,o:M.holdO,txt:'Pick up the brisket (both hands)',time:.7,fn:()=>startCarry(M)})}else carryTick(M,dt,F)}
  else{const d=doorAt(M,-1);F.objs.push(["Get in Dave's truck",false]);F.target={x:d.x,z:d.z,label:"Dave's truck"};
    F.taps.push({x:M.truck.pos.x,z:M.truck.pos.z,r:3.6,txt:"Get in Dave's truck",fn:()=>{if(mount(M))startDrive(M)}})}}
function startDrive(M){const a=A(),S=M.S;S.ph='drive';M.pv=null;a.CP.mark('drive');sayAll(L.start,true);gBall(M,true);if(M.gy)M.gy.st='follow'}
function placeGaryParked(M){const rc=M.gy;if(!rc||!M.route)return;const q=routeProj(M.route,GARY0.x,GARY0.z);rc.s=q.s;rc.lat=rc.latT=q.lat;rc.v=rc.vT=0;rc.st='wait';railStep(rc,M.route,1/30)}
function placeGaryBehind(M,party){const rc=M.gy;if(!rc||!M.truck)return;const q=routeProj(M.route,M.truck.pos.x,M.truck.pos.z);M.sP=q.s;
  if(M.S.garyUsed||party){railHide(rc);if(rc.d)rc.d.root.visible=false;return}rc.s=Math.max(0,q.s-16);rc.lat=rc.latT=0;rc.v=0;rc.st='follow';railStep(rc,M.route,1/30)}
function redrawSplat(M){/* a retry: the window as it was (roughly) */const n=M.S.spills|0;if(!n)return;const t=textures(),g=t.splat.userData.g;for(let i=0;i<n*3;i++){g.fillStyle='rgba(84,24,10,.85)';g.beginPath();g.arc(rr(40,216),rr(40,118),rr(4,12),0,6.283);g.fill()}t.splat.needsUpdate=true}
function reroute(M){const a=A(),e=M.truck;M.offT=0;buildRoute(M,{x:e.pos.x,z:e.pos.z});M.sP=0;
  for(const rc of[M.gy,M.hz]){if(!rc||rc.gone)continue;const q=routeProj(M.route,rc.e.pos.x,rc.e.pos.z);if(q.d<5){rc.s=q.s;rc.lat=rc.latT=q.lat}else{railHide(rc);for(const d of[rc.d,rc.d2])if(d)d.root.visible=false;if(rc===M.hz){M.S.hzDone=1;say('Hustler',"Where'd he go?! He turned!",true)}}}}

/* ================================================================= stages 2-4: the drive */
function driveTick(M,dt,F){const a=A(),S=M.S,e=M.truck,P=e.pos;
  F.objs.push(['Drive the brisket to the block party · Oak St, Riverside',false]);
  F.target={x:PARK.x,z:PARK.z,label:'Block party'};
  if(S.ph==='drive'&&P.x>268&&Math.abs(P.z-43)<10){S.ph='bridge';a.CP.mark('bridge');sayAll(L.seamWarn,true)}
  if(S.ph==='bridge'&&!M.hz&&!S.hzDone&&P.x>277&&M.route)mkHustlers(M);
  if(!M.partyG&&P.x>300)buildParty(M);if(M.partyG&&!M.crowd&&P.x>300)partyCrowd(M);
  if(S.ph==='bridge'&&M.barS!=null&&M.sP>M.barS-34&&P.x>340){S.ph='party';if(M.hz&&!M.hz.gone&&M.hz.st!=='quit'){M.hz.st='stopped'}S.hzDone=1;a.CP.mark('party');sayAll(L.barricade,true)}
  const near=S.ph==='party'&&M.sP>M.barS-26;barricadeTick(M,dt,near?1:0);
  /* the crew: hazard call-outs, praise, impatience, Doug and the brisket */
  for(const h of ahead(M,26)){const id=h.kind+Math.round(h.s);if(M.called&&M.called[id])continue;(M.called||(M.called={}))[id]=1;
    if(h.kind==='bump')quip(M,'bumpWarn',L.bumpWarn,'dave',3,true);else if(h.kind==='pot'&&Math.abs(h.lat)<1.9)quip(M,'potWarn',L.potWarn,'dave',7,false)}
  if(M.vP>4&&M.elapsed-(M.lastHurt||0)>22&&M.elapsed>30)quip(M,'smooth',L.smooth,'dave',38,false);
  M.slowT=M.vP<2.6&&S.ph!=='party'?M.slowT+dt:0;if(M.slowT>14){M.slowT=0;quip(M,'slow',L.slow,'dave',30,false)}
  M.dougT-=dt;if(M.dougT<=0&&!talking()){M.dougT=rr(26,40);say('doug',pickR(L.doug),true);TALK.q.push(['dave',pickR(L.dougReply)])}
  garyTick(M,dt);hzTick(M,dt);
  if(garyCanBlock(M)){F.objs.push(['The hatchback wants you to brake hard. Stay smooth, or radio Gary',false,'warn']);F.taps.push({d:0,r:1,txt:'Radio Gary: "Block them"',fn:()=>callGary(M)})}
  else if(M.hz&&!M.hz.gone&&!['quit','blocked','stopped'].includes(M.hz.st))F.objs.push(['The hatchback wants you to brake hard. Stay smooth',false,'warn']);
  if(S.ph==='party'){F.objs.push(['Park by the court gate · slowly',false]);const d=Math.hypot(P.x-PARK.x,P.z-PARK.z),dy=Math.abs(wrap(e.yaw-PARK.yaw));
    if(d<8&&!M.cd.park){M.cd.park=20;say('dave',pickR(L.park),true)}
    if(d<2.6&&Math.abs(M.vP)<.35&&dy<.7)startScene(M)}
  meters(M,F)}
function meters(M,F){const S=M.S,g=M.g;F.meters.push({id:'brisket',label:'Brisket',v:Math.round(S.integ),max:100,style:'bar',warn:60,warnBelow:true,icon:'heart',sub:Math.floor(S.integ)+'% · '+Math.round(S.temp)+'°F'});
  F.meters.push({id:'gforce',label:'G-force',v:Math.min(1.2,g.mag),max:1.2,style:'bands',zones:[[0,K.latT,'good','Smooth'],[K.latT,.7,'warn','Careful'],[.7,1.2,'bad','Rough']],sub:g.mag.toFixed(2)+' g'})}

/* ================================================================= the party */
function partyCrowd(M){if(M.crowd)return;const a=A(),PP=window.HT&&HT.People,nb=(PP&&PP.neighbourKeys)||[];
  const spots=[['rosa',401.6,15.3],['benny',405,15.2],['dee',399.4,11.4],['earl',BAR.x+1.1,11.2],['nb0',397.3,15.7],['nb1',406.9,14.4],['nb2',409.3,15.6],['nb3',394.7,18.9],['nb4',396.6,19.3],['nb5',400.9,18.7]];
  M.crowd=spots.map(([id,x,z],k)=>{const nbv=id.startsWith('nb');const d=nbv?person('neighbour',{v:nb[k%Math.max(1,nb.length)]||k,look:{look:{shirt:['#c4553a','#3a7f6a','#d8b04a','#6b5ca5','#c97a9a','#4b78b0'][k%6],pants:'#3a3a3a'}}},x,z,Math.PI):person(id,{look:{shirt:'#8a6f9e',pants:'#3a3a3a'}},x,z,Math.PI);
    return{id,d,home:{x,z},to:null,waved:false}})}
function crowdTick(M,dt,look){if(!M.crowd)return;for(const c of M.crowd){if(c.to){if(walkTo(c.d,c.to,1.3,dt))c.to=null;continue}const L_=look||(M.truck&&M.truck.pos);if(L_)face(c.d,L_.x,L_.z,dt);pose(c.d,dt)}}
function startScene(M){const a=A(),S=M.S;if(S.ph==='scene')return;S.ph='scene';M.sc={t:0,step:'out',st:0};sayAll(L.parked,true);gBall(M,false);
  const e=M.truck;if(e&&e.car){e.car.spd=0;e.spd=0}for(const k of['w','a','s','d',' ','shift'])a.keys[k]=false;
  /* Dave out of the passenger side, Doug off the tailgate */
  const r=rgt(e.yaw),f=fwd(e.yaw);M.dave.root.position.set(e.pos.x+r[0]*1.5+f[0]*.3,a.groundAt(e.pos.x,e.pos.z),e.pos.z+r[1]*1.5+f[1]*.3);M.doug.root.position.set(e.pos.x-f[0]*3.4-r[0]*.5,0,e.pos.z-f[1]*3.4-r[1]*.5);
  if(M.gy&&!M.gy.gone){M.gy.st='parked';M.gy.v=M.gy.vT=0}
  /* Gary's car behind the barricade, Gary on foot with everyone */
  M.garyFoot=dad('gary',398.6,16.4,0);if(M.gy){railHide(M.gy);if(M.gy.d)M.gy.d.root.visible=false}
  if(M.hz){railHide(M.hz);for(const d of[M.hz.d,M.hz.d2])if(d)d.root.visible=false}
  try{const c=a.camera;R.cam=R.cam||c.fov}catch(_){}
  if(!M.crowd){buildParty(M);partyCrowd(M)}for(const c of M.crowd)if(!c.waved){c.waved=true;wave(c.d)}
  const earl=M.crowd.find(c=>c.id==='earl');if(earl)earl.to={x:406.2,z:11.6}}
function sceneTick(M,dt,F){const a=A(),S=M.S,sc=M.sc;sc.t+=dt;sc.st+=dt;const e=M.truck,dv=M.dave,dg=M.doug,it=flatItem(M);
  F.objs.push(['The block party',false]);barricadeTick(M,dt,1);
  const next=s=>{sc.step=s;sc.st=0};
  if(sc.step==='out'){const tg=(()=>{const f=fwd(e.yaw),r=rgt(e.yaw);return{x:e.pos.x-f[0]*3.25+r[0]*.35,z:e.pos.z-f[1]*3.25+r[1]*.35}})();
    if(walkTo(dv,tg,1.5,dt)&&sc.st>1.2){face(dv,e.pos.x,e.pos.z,1);next('grab')}crowdTick(M,dt,dv.root.position)}
  else if(sc.step==='grab'){if(sc.st>.5&&it.g.parent!==dv.root){it.inBed=false;it.on='dave';if(it.g.parent)it.g.parent.remove(it.g);dv.root.add(it.g);it.g.position.set(0,1.02,.42);it.g.rotation.set(0,Math.PI/2,0);
      a.radio('dave',"Everybody stand back. Nobody make any sudden moves.",true)}pose(dv,dt);if(sc.st>1.4){next('walk');sc.wp=0}crowdTick(M,dt,dv.root.position)}
  else if(sc.step==='walk'){const W=[{x:e.pos.x-1.6,z:e.pos.z-2.1},{x:BTABLE.x-.15,z:BTABLE.z+.78}];if(walkTo(dv,W[sc.wp],1.75,dt)){if(sc.wp<W.length-1)sc.wp++;else next('place')}
    walkTo(dg,{x:dv.root.position.x-1.1,z:dv.root.position.z+.9},1.5,dt);crowdTick(M,dt,dv.root.position)}
  else if(sc.step==='place'){face(dv,BTABLE.x,BTABLE.z-1,dt);pose(dv,dt);pose(dg,dt);
    if(sc.st>.6&&it.g.parent===dv.root){dv.root.remove(it.g);M.partyG.add(it.g);it.g.position.set(M.spot.x,M.spot.y,M.spot.z);it.g.rotation.set(0,Math.PI/2,0);if(M.card)M.card.visible=false}
    if(sc.st>1.4){next('reveal');reveal(M)}crowdTick(M,dt,{x:BTABLE.x,z:BTABLE.z})}
  else if(sc.step==='reveal'){pose(dv,dt);pose(dg,dt);crowdTick(M,dt,{x:BTABLE.x,z:BTABLE.z});if(M.garyFoot){face(M.garyFoot,BTABLE.x,BTABLE.z,dt);pose(M.garyFoot,dt)}
    if(it.tent){it.tent.rotation.x=Math.min(1.9,(it.tent.rotation.x||0)+dt*2.2);it.tent.position.y=.075+Math.min(.12,sc.st*.1)}
    if(sc.st>3&&!talking()&&sc.st>9){next('hustlers');hustlersWalk(M)}}
  else if(sc.step==='hustlers'){pose(dv,dt);crowdTick(M,dt,M.hzFoot&&M.hzFoot[0].d.root.position);let there=true;
    for(const h of M.hzFoot){if(!walkTo(h.d,h.to,1.5,dt))there=false}if(there&&!M.hzSaidFoot){M.hzSaidFoot=1;sayAll(L.hzFoot,true)}
    if(M.hzSaidFoot&&!talking()&&sc.st>4)next('choice'),choice(M)}
  else if(sc.step==='choice'){pose(dv,dt);for(const h of M.hzFoot){face(h.d,BTABLE.x,BTABLE.z,dt);pose(h.d,dt)}crowdTick(M,dt,M.hzFoot[0].d.root.position)}
  else if(sc.step==='after'){pose(dv,dt);for(const h of M.hzFoot){if(h.to2){if(walkTo(h.d,h.to2,1.1,dt))h.to2=null}else{face(h.d,BTABLE.x,BTABLE.z,dt);pose(h.d,dt)}}crowdTick(M,dt,{x:BTABLE.x,z:BTABLE.z});
    if(sc.st>2&&!talking()&&sc.st>6)finish(M)}
  if(sc.step!=='out'&&sc.step!=='grab'&&sc.step!=='walk'){if(dg&&sc.step!=='place')pose(dg,dt)}}
function reveal(M){const a=A(),S=M.S,it=flatItem(M);S.tier=S.integ>=90?3:S.integ>=60?2:1;
  try{const FX=window.HT&&HT.FX;if(FX&&FX.emitter&&it){const em=FX.emitter('hood',{object:it.g,offset:[0,.16,0]});if(em){em.intensity=S.temp>=K.warmT?.55:S.temp>=K.coldT?.3:.08;em.steam=true;em.shade=.95;R.emit.push(em)}}}catch(_){}
  const lines=L.reveal.concat(S.tier===3?L.tier3:S.tier===2?L.tier2:L.tier1);if(S.temp<K.coldT)lines.push(...L.cold);if(S.sauce<45)lines.push(...L.noSauce);sayAll(lines,true);
  try{const Au=window.HT&&HT.Audio;if(Au&&Au.ready){Au.music('victory');R.music=true;if(Au.voice)Au.voice('dad_cheer',{x:BTABLE.x,y:1.6,z:BTABLE.z+2})}}catch(_){}
  /* the first time the two neighbourhoods share a table */
  if(S.integ>=60&&!S.trust){S.trust=1;a.addTrust(5,'river');a.addTrust(5,'maple');try{const FX=window.HT&&HT.FX;if(FX&&FX.trustPop)FX.trustPop(a.V3(BTABLE.x,2.4,BTABLE.z),'+5 TRUST',{sub:'Both sides of the bridge',color:'#7dffb0'})}catch(_){}}
  /* everyone steps up to the table */
  if(M.crowd){let k=0;for(const c of M.crowd){if(c.id==='earl')continue;const u=(k%5)/4,row=Math.floor(k/5);c.to={x:BTABLE.x-2.4+u*4.8+(row?.5:0),z:BTABLE.z+1.35+row*.85+Math.abs(u-.5)*.5};k++}}}
function hustlersWalk(M){const a=A();M.hzFoot=[{d:person(null,{look:{shirt:'#2b2b2b',pants:'#3b4a63',cap:'#c23b2e'}},393.5,19.1,-Math.PI/2),to:{x:BTABLE.x-2.3,z:BTABLE.z+2.1}},
  {d:person(null,{look:{shirt:'#d9d2c0',pants:'#2b2b2b'}},392.6,19.6,-Math.PI/2),to:{x:BTABLE.x-1.5,z:BTABLE.z+2.6}}];for(const h of M.hzFoot)a.equip(h.d,null)}
function choice(M){const a=A(),HD=a.HUD;M.sc.pick=null;
  const opts=[{text:'Hand them a plate.',reg:'real'},{text:'"Residents and brisket only, fellas."',reg:'joke'}];
  const kit=HD&&HD.kit&&HD.kit.choices?HD.kit.choices({speaker:'Big Dave',color:'#ffb36b',prompt:"The two guys from the hatchback are hovering by the table. Dave looks at you.",tell:"They're looking at the brisket the way Doug looks at the brisket.",options:opts,onPick:i=>onPick(M,i)}):null;
  M.sc.kit=kit;if(kit){a.overlay('cargo-choice',kit.el);R.ovs.push('cargo-choice')}else onPick(M,0)}
function onPick(M,i){const a=A(),S=M.S;if(S.plate!=null)return;S.plate=i;try{a.overlay('cargo-choice',null)}catch(_){}M.sc.step='after';M.sc.st=0;
  if(i===0){sayAll(L.plate,true);a.addTrust(3,'river');try{const FX=window.HT&&HT.FX;if(FX&&FX.trustPop)FX.trustPop(a.V3(BTABLE.x-2,2.3,BTABLE.z+2.2),'+3 TRUST',{sub:'Fed the hustlers',color:'#7dffb0'})}catch(_){}
    /* paper plates in their hands */const T3=a.THREE;for(const h of M.hzFoot){const p=mesh(geo(new T3.CylinderGeometry(.11,.09,.015,16)),M3({color:'#f4f1e8',roughness:.7}),0,1.02,.36,h.d.root);mesh(rbox(.12,.03,.07,.01,2),mats().bark,0,1.04,.36,h.d.root)}}
  else{sayAll(L.shoo,true);for(const h of M.hzFoot)h.to2={x:h.d.root.position.x-4,z:h.d.root.position.z+.6}}}
function finish(M){const a=A();if(M.finished)return;M.finished=true;
  /* your own van waits down the block (Linda drove it over) so "keep driving" puts you next to it */
  const V=a.VAN;try{V.pos.set(VAN_AFTER.x,0,VAN_AFTER.z);V.yaw=VAN_AFTER.yaw;a.owStopCar(V);a.syncCar(V)}catch(_){}
  M.car=V;a.radio('gary',"I had Linda bring your van over. She drove it in first gear the whole way.",false);a.endMission(true)}
/* the scene's camera: a slow dolly per shot */
function sceneCam(M,dt){const a=A(),c=a.camera,sc=M.sc,dv=M.dave&&M.dave.root.position,y0=a.groundAt(BTABLE.x,BTABLE.z);let P_,T_;
  if(sc.step==='out'||sc.step==='grab'||sc.step==='walk'){const d=dv||M.truck.pos;P_=[d.x+5.6,y0+2.3,d.z+4.6];T_=[d.x-.5,y0+1.1,d.z]}
  else if(sc.step==='place'||sc.step==='reveal'&&sc.st<4.5){P_=[BTABLE.x+.9,y0+1.75,BTABLE.z-1.5];T_=[BTABLE.x,y0+.82,BTABLE.z+.1]}
  else if(sc.step==='reveal'){P_=[BTABLE.x+.5,y0+2.3,BTABLE.z-3.2];T_=[BTABLE.x-.2,y0+1.25,BTABLE.z+1.8]}
  else{const h=M.hzFoot&&M.hzFoot[0].d.root.position||{x:BTABLE.x-2,z:BTABLE.z+2};P_=[BTABLE.x+2.2,y0+2.1,BTABLE.z-2.4];T_=[(h.x+BTABLE.x)/2-.6,y0+1.3,(h.z+BTABLE.z)/2+.5]}
  if(!sc.cam){sc.cam={p:a.V3(...P_),t:a.V3(...T_)};if(R.cam==null)R.cam=c.fov}
  const k=Math.min(1,dt*2.2);sc.cam.p.x+=(P_[0]-sc.cam.p.x)*k;sc.cam.p.y+=(P_[1]-sc.cam.p.y)*k;sc.cam.p.z+=(P_[2]-sc.cam.p.z)*k;sc.cam.t.x+=(T_[0]-sc.cam.t.x)*k;sc.cam.t.y+=(T_[1]-sc.cam.t.y)*k;sc.cam.t.z+=(T_[2]-sc.cam.t.z)*k;
  c.position.copy(sc.cam.p);c.lookAt(sc.cam.t);if(c.fov!==50){c.fov=50;c.updateProjectionMatrix()}return true}

/* ================================================================= every frame after the people update: seats, the body's jolts, the cargo's look */
function poseTick(M,dt){const a=A(),S=M.S,e=M.truck;if(!e)return;const inT=a.CV===e;
  /* body jolt (a spring) on bumps */M.jv+=(-150*M.jy-12*M.jv)*dt;M.jy=clamp(M.jy+M.jv*dt,-.12,.12);if(M.body){M.body.position.y=M.bodyY+M.jy*.6;if(inT)M.body.rotation.z+=M.jy*.25}
  if(S.ph==='load'||S.ph==='board'){if(M.dave){const P=a.P.pos;if(S.ph==='board'){const d=doorAt(M,1);if(walkTo(M.dave,d,1.4,dt))face(M.dave,e.pos.x,e.pos.z,dt)}else{face(M.dave,P.x,P.z,dt);pose(M.dave,dt)}}
    if(M.doug){if(S.ph==='load'){const f=fwd(e.yaw),r=rgt(e.yaw);M.doug.root.position.set(e.pos.x-f[0]*1.9-r[0]*.35,a.groundAt(e.pos.x,e.pos.z)+.88,e.pos.z-f[1]*1.9-r[1]*.35);face(M.doug,a.P.pos.x,a.P.pos.z,dt);pose(M.doug,dt)}else seat(M.doug,e,SEAT.bed,dt)}}
  else if(S.ph!=='scene'){seat(M.dave,e,SEAT.sh,dt);seat(M.doug,e,SEAT.bed,dt)}
  else if(M.sc&&(M.sc.step==='out')&&M.sc.st<.05){}
  if(M.gy&&!M.gy.gone&&M.gy.d)seat(M.gy.d,M.gy.e,SEAT.sedan,dt);else if(M.gy&&M.gy.st==='wait'&&M.gy.d)seat(M.gy.d,M.gy.e,SEAT.sedan,dt);
  if(M.hz&&!M.hz.gone){seat(M.hz.d,M.hz.e,SEAT.hatch,dt);seat(M.hz.d2,M.hz.e,SEAT.hatchR,dt)}
  if(S.ph!=='scene'&&M.crowd&&a.P.pos.x>330)crowdTick(M,dt,null);
  if(S.ph==='load'||S.ph==='board'){/* Gary waits in his car; the street's quiet */const gy=M.gy;if(gy&&gy.e){const VM=window.HT&&HT.Vehicles;if(VM&&VM.update&&gy.e.obj.userData.mod)try{VM.update(gy.e.obj,{speed:0,steer:0,braking:true,dt})}catch(_){}}}
  cargoLook(M,dt)}

/* ================================================================= HUD: the g-ball, the carry gauge; the chase camera lifted to see into the bed */
function css(){if(R.style)return;const s=document.createElement('style');s.id='cargo-css';s.textContent=`
.cg-root{position:absolute;inset:0;pointer-events:none;font-family:inherit}
.cg-ball{position:absolute;left:18px;bottom:24%;width:150px;padding:10px 10px 8px;border-radius:16px;background:rgba(14,18,24,.55);backdrop-filter:blur(6px);box-shadow:0 6px 24px rgba(0,0,0,.25);color:#f3efe6;text-align:center}
.cg-ball svg{display:block;width:130px;height:130px;margin:0 auto}
.cg-ball .t{font:700 12px/1.2 inherit;letter-spacing:.12em;text-transform:uppercase;opacity:.8;margin-bottom:4px}
.cg-ball .g{font:800 22px/1 inherit;font-variant-numeric:tabular-nums;margin-top:4px}
.cg-ball .s{font:600 11px/1.3 inherit;opacity:.85;margin-top:3px}
.cg-ball.hot{box-shadow:0 0 0 2px rgba(255,107,90,.85),0 6px 24px rgba(0,0,0,.3)}
.cg-bal{position:absolute;left:50%;bottom:5%;transform:translateX(-50%);width:300px;padding:10px 14px 12px;border-radius:16px;background:rgba(14,18,24,.55);backdrop-filter:blur(6px);color:#f3efe6;text-align:center}
.cg-bal .t{font:700 12px/1.2 inherit;letter-spacing:.12em;text-transform:uppercase;opacity:.85}
.cg-bal svg{display:block;width:260px;height:120px;margin:2px auto 0}
@media (max-width:700px){.cg-ball{left:10px;bottom:auto;top:32%;width:104px;padding:6px}.cg-ball svg{width:88px;height:88px}.cg-ball .g{font-size:16px}.cg-ball .s{display:none}.cg-bal{width:220px;bottom:24%}.cg-bal svg{width:196px;height:90px}}`;
  document.head.appendChild(s);R.style=s}
function gBall(M,on){const a=A();if(!on){if(M.gb){try{a.overlay('cargo-g',null)}catch(_){}M.gb=null}return}if(M.gb||typeof document==='undefined')return;css();
  const root=document.createElement('div');root.className='cg-root';const box=document.createElement('div');box.className='cg-ball';root.appendChild(box);
  const R0=56,ring=g=>R0*g/1.0;box.innerHTML='<div class="t">G-force</div><svg viewBox="-65 -65 130 130">'+
    '<circle r="'+R0+'" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>'+
    '<circle r="'+ring(.7)+'" fill="none" stroke="rgba(255,107,90,.55)" stroke-width="1.5" stroke-dasharray="3 3"/>'+
    '<circle r="'+ring(K.latT)+'" fill="rgba(125,255,176,.08)" stroke="rgba(125,255,176,.6)" stroke-width="1.5"/>'+
    '<line x1="-60" y1="0" x2="60" y2="0" stroke="rgba(255,255,255,.15)"/><line x1="0" y1="-60" x2="0" y2="60" stroke="rgba(255,255,255,.15)"/>'+
    '<text x="0" y="-46" text-anchor="middle" font-size="8" fill="rgba(255,255,255,.55)">GAS</text><text x="0" y="52" text-anchor="middle" font-size="8" fill="rgba(255,255,255,.55)">BRAKE</text>'+
    '<polyline class="tr" fill="none" stroke="rgba(255,214,120,.45)" stroke-width="2" stroke-linecap="round" points=""/>'+
    '<circle class="dot" r="6.5" fill="#7dffb0" stroke="#10161a" stroke-width="1.5"/></svg><div class="g">0.00 g</div><div class="s">No hard brakes</div>';
  M.gb={root,box,dot:box.querySelector('.dot'),tr:box.querySelector('.tr'),g:box.querySelector('.g'),s:box.querySelector('.s'),last:''};a.overlay('cargo-g',root);R.ovs.push('cargo-g')}
function balOverlay(M,on){const a=A();if(!on){if(M.bal){try{a.overlay('cargo-bal',null)}catch(_){}M.bal=null}return}if(M.bal||typeof document==='undefined')return;css();
  const root=document.createElement('div');root.className='cg-root';const box=document.createElement('div');box.className='cg-bal';root.appendChild(box);
  box.innerHTML='<div class="t">Keep it level · step under it</div><svg viewBox="-130 -122 260 132"><path d="M-110 0 A110 110 0 0 1 110 0" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="10" stroke-linecap="round"/>'+
    '<path d="M-110 0 A110 110 0 0 1 -77.8 -77.8" fill="none" stroke="rgba(255,107,90,.7)" stroke-width="10" stroke-linecap="round"/><path d="M77.8 -77.8 A110 110 0 0 1 110 0" fill="none" stroke="rgba(255,107,90,.7)" stroke-width="10" stroke-linecap="round"/>'+
    '<g class="tray"><rect x="-46" y="-22" width="92" height="12" rx="3" fill="#cfd4da"/><rect x="-38" y="-34" width="76" height="12" rx="6" fill="#3a2216"/><line x1="0" y1="-10" x2="0" y2="0" stroke="#f3efe6" stroke-width="2"/></g>'+
    '<circle class="dot" cx="0" cy="-110" r="7" fill="#7dffb0"/></svg>';
  M.bal={root,tray:box.querySelector('.tray'),dot:box.querySelector('.dot')};a.overlay('cargo-bal',root);R.ovs.push('cargo-bal')}
function hudTick(M,st){const a=A(),S=M.S,e=M.truck;
  if(st.weapon)st.weapon.holstered=true;if(st.crosshair)st.crosshair.hidden=true;
  if(M.gb){const g=M.g,sc=56,x=clamp(g.lat,-1.15,1.15)*sc,y=clamp(-g.lon,-1.15,1.15)*sc,m=g.mag;M.gb.dot.setAttribute('cx',x.toFixed(1));M.gb.dot.setAttribute('cy',y.toFixed(1));
    M.gb.dot.setAttribute('fill',m<K.latT?'#7dffb0':m<.7?'#ffd36b':'#ff6b5a');
    const pts=g.trail.map(p=>(clamp(p[0],-1.15,1.15)*sc).toFixed(1)+','+(clamp(-p[1],-1.15,1.15)*sc).toFixed(1)).join(' ');if(pts!==M.gb.last){M.gb.last=pts;M.gb.tr.setAttribute('points',pts)}
    M.gb.g.textContent=m.toFixed(2)+' g';M.gb.s.textContent=S.hard?('Hard brakes: '+S.hard):'No hard brakes';M.gb.box.classList.toggle('hot',m>=.7||(M.hurtPulse||0)>.4)}
  M.hurtPulse=Math.max(0,(M.hurtPulse||0)-.05);
  if(M.bal&&M.carry){const t=clamp(M.carry.tau,-1,1);M.bal.tray.setAttribute('transform','rotate('+(t*45).toFixed(1)+')');const ang=-Math.PI/2+t*Math.PI/4*1.0;
    M.bal.dot.setAttribute('cx',(Math.cos(ang)*110).toFixed(1));M.bal.dot.setAttribute('cy',(Math.sin(ang)*110).toFixed(1));M.bal.dot.setAttribute('fill',Math.abs(t)<.5?'#7dffb0':Math.abs(t)<.75?'#ffd36b':'#ff6b5a')}
  /* the chase camera a little higher and closer: you can see into the bed */
  if(e&&a.CV===e&&!a.P.fp&&S.ph!=='scene'){const cam=a.camera,gy=a.groundAt(e.pos.x,e.pos.z),tx=e.pos.x,tz=e.pos.z,dx=cam.position.x-tx,dz=cam.position.z-tz,dl=Math.hypot(dx,dz);
    if(dl>4){const k=Math.max(.6,7.6/dl);cam.position.x=tx+dx*k;cam.position.z=tz+dz*k;cam.position.y=Math.max(cam.position.y,gy+3.55);cam.lookAt(tx,gy+1.05,tz)}}
  if(st.vehicleName!=null&&e&&a.CV===e)st.vehicleName="Big Dave's truck";}

/* ================================================================= cleanup: when the job is over, everything this run made goes */
J.on('hud',()=>{if(!R.active)return;const a=A();const mine=a&&a.mode==='mission'&&a.M&&a.M.def&&a.M.def.id==='cargo'&&a.M.state==='go';if(!mine){disposeRun();TX=null;mats.m=null}});

/* ================================================================= the scripted player (dev/jobs-check.js and dev/jobs/cargo.js): walks, balances
   the tray like a person (steps under it when it leans), then drives with the keys: taps the brakes, crawls bumps, slows for corners,
   steers round the potholes it can and straddles the ones it can't, angles the bridge joint, keeps its distance from the hatchback and
   radios Gary after their first brake check. opts.fail: drives like a lunatic once it's on the bridge (fails to "At the bridge"). */
function bot(a,t,o){const M=a.M;o=o||{};if(!M||M.state!=='go'||!M.S)return null;const k=a.keys,P=a.P,S=M.S;
  const off=()=>{k.w=k.a=k.s=k.d=k.shift=false;k.e=false;k[' ']=false};
  const walk=(x,z,sp,side)=>{const dx=x-P.pos.x,dz=z-P.pos.z,d=Math.hypot(dx,dz),s=Math.min(d,(sp||4.2)/30);P.pos.x+=dx/(d||1)*s;P.pos.z+=dz/(d||1)*s;if(d>.05)P.yaw=Math.atan2(-dx,-dz);
    if(side){const r=rgt(P.yaw);P.pos.x+=r[0]*side/30;P.pos.z+=r[1]*side/30}a.collide(P.pos,.35);return d};
  if(S.ph==='load'){off();if(!M.carry){const d=walk(TABLE.x,TABLE.z+.75,4);if(d<.5)k.e=true;return null}
    k.e=false;const C=M.carry,tg=tailgate(M);/* a person steps toward the low side */const side=clamp(C.tau*3.2+C.tv*1.1,-2.6,2.6);const f=fwd(M.truck.yaw),r=rgt(M.truck.yaw),W=[{x:tg.x+r[0]*-2.6+f[0]*1.2,z:tg.z+r[1]*-2.6+f[1]*1.2},{x:tg.x-r[0]*1.1,z:tg.z-r[1]*1.1}];M._cw=M._cw||0;
    const d=walk(W[M._cw].x,W[M._cw].z,2.3,side);if(d<.5&&M._cw<W.length-1)M._cw++;if(Math.hypot(P.pos.x-tg.x,P.pos.z-tg.z)<1.6)a.useTap=true;return null}
  if(S.ph==='board'){off();if(walk(M.truck.pos.x-1.2,M.truck.pos.z-1.6,4)<2.4||Math.hypot(P.pos.x-M.truck.pos.x,P.pos.z-M.truck.pos.z)<3)a.useTap=true;return null}
  if(S.ph==='scene'){off();if(M.sc&&M.sc.step==='choice'&&M.sc.kit&&M.sc.st>1.2&&S.plate==null){try{M.sc.kit.pick(o.shoo?1:0)}catch(_){onPick(M,o.shoo?1:0)}}return null}
  const e=M.truck;if(a.CV!==e){off();if(walk(e.pos.x,e.pos.z,4.5)<3)a.useTap=true;return null}
  const c=e.car;if(!c||!M.route)return null;const v=c.spd;
  /* stuck against something: back up a little, turned away */
  if(M._rev>0){M._rev-=1/30;k.w=false;k.s=true;k.a=M._revD>0;k.d=M._revD<0;return null}
  if(Math.abs(v)<1&&M._want>.5){M._stk=(M._stk||0)+1/30;if(M._stk>2){M._stk=0;M._rev=1.1;M._revD=M.lp<0?-1:1}}else M._stk=0;
  if(o.fail&&S.ph==='bridge'&&e.pos.x>282){/* the lunatic */k.w=true;k.shift=true;k.a=Math.floor(t/18)%2===0;k.d=!k.a;k.s=t%40<12;k.w=!k.s;return null}
  /* where to be across the lane: dodge the potholes ahead (or straddle them) */
  const pr=routeProj(M.route,c.x,c.z,M.sP),near=ahead(M,20);let latT=-.3;
  const hitsAt=L_=>near.some(h=>h.kind==='pot'&&h.s-pr.s<12&&h.s-pr.s>-2.5&&(Math.abs(h.lat-(L_-.8))<h.r+.2||Math.abs(h.lat-(L_+.8))<h.r+.2));
  if(hitsAt(latT)){let best=latT,bd=1e9;for(let L_=-3.6;L_<=.6;L_+=.15){if(hitsAt(L_))continue;const cost=Math.abs(L_-latT)+(L_<-1.8?.8:0);if(cost<bd){bd=cost;best=L_}}latT=best}
  /* a pickup swings wide on a right turn (the back wheels cut the corner), and goes round cars parked in the lane */
  for(let ds=-5;ds<17;ds+=1.5){const p0=routeAt(M.route,pr.s+ds),p1=routeAt(M.route,pr.s+ds+6),cr=p0.dx*p1.dz-p0.dz*p1.dx;const beside=M.hz&&!M.hz.gone&&Math.abs(M.hz.s-pr.s)<7&&M.hz.lat<pr.lat;if(cr>.35){if(!beside)latT=Math.min(latT,-1.5);break}if(cr<-.35){latT=Math.max(latT,.1);break}}
  for(const ob of M.obst)if(pr.s>ob.s0-6&&pr.s<ob.s1+1)latT=-3;
  M._lat=M._lat==null?latT:M._lat+(latT-M._lat)*.1;
  /* the bridge joint at an angle: a small swing across the lane just before it */
  for(const s of M.seamS){const ds=s-pr.s;if(ds>0&&ds<7)M._lat+=((ds<3.5?-.9:.5)-M._lat)*.08}
  /* the speed for what's ahead: corners, bumps, the joint, the hatchback, the parking spot */
  let want=S.ph==='party'?7:10.2;const brakeD=(vT,d)=>Math.sqrt(vT*vT+2*2.4*Math.max(0,d));
  for(let ds=0;ds<28;ds+=1.5){const p0=routeAt(M.route,pr.s+ds),p1=routeAt(M.route,pr.s+ds+9),turn=Math.abs(wrap(Math.atan2(p1.dx,p1.dz)-Math.atan2(p0.dx,p0.dz)));if(turn>.45){want=Math.min(want,brakeD(M.hz&&!M.hz.gone&&Math.abs(M.hz.s-pr.s)<7?2.6:3.4,ds-1));break}}
  for(const h of near){const d=h.s-pr.s;if(h.kind==='bump')want=Math.min(want,brakeD(3.0,d-3.5));if(h.kind==='seam')want=Math.min(want,brakeD(3.6,d-2))}
  for(const h of near)if(h.kind==='pot'&&h.s-pr.s<14&&hitsAt(M._lat))want=Math.min(want,brakeD(3.5,h.s-pr.s-2));
  const hz=M.hz;if(hz&&!hz.gone&&hz.s>pr.s&&Math.abs(hz.lat-pr.lat)<2.4){const gap=hz.s-pr.s-5;want=Math.min(want,Math.max(0,Math.min(hz.v+gap*.35,brakeD(Math.max(0,hz.v-1),gap-4))))}
  if(S.ph==='party'){const d=Math.hypot(PARK.x-c.x,PARK.z-c.z);if(M.sP>M.barS-40)want=Math.min(want,brakeD(0,d-1.2)*.9);if(M.barOpen<.6&&M.sP>M.barS-14)want=0}
  if(!o.fail&&garyCanBlock(M)&&(S.checks>=1||hz.n>=3))a.useTap=true;
  /* steering: look ahead along the lane, duty-cycled taps */
  const look=routeAt(M.route,pr.s+Math.max(4.5,v*.75+2.5)),rx=-look.dz,rz=look.dx,tx=look.x+rx*M._lat,tz=look.z+rz*M._lat;
  let err=wrap(Math.atan2(-(tx-c.x),-(tz-c.z))-c.yaw);const duty=Math.min(1,Math.abs(err)*2.4);k.a=err>.02&&(t%4)/4<duty;k.d=err<-.02&&(t%4)/4<duty;
  /* pedals: hold the gas to build up, coast, tap the brake */
  M._want=want;k.shift=false;k[' ']=false;k.w=v<want-.35;k.s=false;if(v>want+.3){k.s=v>want+2.2?t%3===0:t%5===0}
  if(want<.2&&v<.4){k.w=false;k.s=false}
  return null}
})();
