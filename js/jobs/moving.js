/* =====================================================================
   HEAVY LIFTING (SPEC3 2.10): defend while it finishes. Ms. Okafor's cousins, the Adeyemis, move into the empty corner rowhouse
   on 3rd St at Mill St, Riverside. Rosa strand 2/2. The first family to move INTO Riverside in two years.

   The tension: two jobs at once. The unload bar fills while the movers shuttle boxes from the rental truck to the stoop. Every
   box YOU carry speeds it up, but a box is heavy (walk only) and your hands are full. The street crew that uses the empty house
   as a hangout probes the block from three sides (3rd St north, 3rd St south, the back alley off 2nd St).
   Owner rule: no gun is drawn within 25 m of the family. So the block around the truck is a hands-only zone ("the bubble"):
   your gun goes away in it, the crew don't fire into it, hostiles holster when they cross into it. Fights happen out at the
   corners, where you post the crew ("Cover!"). Anybody who gets through comes at the truck by hand: the movers stop (the bar
   freezes), the family gets nervous, and pushers grab a box and run. Talk the lookers down, tackle the pushers, zip-tie them.
   Big items: the couch (60 %, a two-person carry that drives like a slow car; scuffs count) and the piano (85 %, everybody on it,
   Grandma calls the steps). One of the pushers is Andre, Tasha's big brother (Dee's youth group): zip-tie him rather than
   shoot him and he comes back for the last box. At 100 % the lights go on in the house and the block's trust goes up.

   Stages ([CP]): 'unload' -> 'couch' (60 %) -> 'piano' (85 %). Fail: the family's calm runs out (they get back in the truck).
   Keys: G = "Lift!" (crew carries), T = "Cover!" (crew to their corners); the crew panel chips switch one person (tap / click).
   Files: js/jobs/moving.js, js/ai.js (AI.ally role commands: a.role={kind:'cover'|'lift'|'go',x,z,...}).
   Tests: node dev/jobs-check.js moving --retry --replay --shots, node dev/jobs/moving.js [--shots] (timeline + transcript).
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
const PP=()=>window.HT&&HT.People&&HT.People.ok?HT.People:null;
const AU=()=>window.HT&&HT.Audio&&HT.Audio.ready?HT.Audio:null;
const OW=()=>window.HT&&HT.OpenWorld;

/* ---------------- tuning ---------------- */
const K={
  bubble:25,          /* m from any family member: no guns drawn (owner rule) */
  freeze:15,          /* m from the truck: movers stop while a hostile is this close */
  carrySpd:2.6,       /* m/s with a box in your hands (walk only) */
  moverLoad:1.9,moverBack:2.7,moverHand:.55,/* m/s loaded / empty, s per hand-off */
  crewLoad:2.2,crewBack:3.4,
  movers:4,           /* shuttles (Mrs. Adeyemi, the kid's uncle Tunde, two neighbours) */
  couchAt:60,couchPct:4,pianoAt:85,pianoPct:8,
  couchSpd:1.35,couchTurn:.75,scuffSpd:.55,
  pianoSpd:1.2,pianoPer:.18,     /* speed bonus per extra lifter */
  calm0:100,calmTM:1.3,calmShot:1.5,calmLost:10,calmBack:1.4,flinchR:30,calmR:36,
  grabT:7,loseD:42,talkT:1.1,tackleD:1.25,
  gold:210,silver:25,
  waveGap:2.2
};
/* pressure waves: at % of the bar (and only once the last wave is mostly dealt with). L looker (unarmed, talks down), P pusher
   (unarmed, grabs a box; tackle him), A armed (fights at the corners, holsters inside the bubble), N = Andre */
const WAVES=[
  {at:5,  g:[['N','LL']]},
  {at:16, g:[['W','AAP']]},
  {at:30, g:[['N','AN'],['S','AA']]},
  {at:44, g:[['S','AAP'],['W','A']]},
  {at:62, g:[['N','AA'],['W','PP']]},
  {at:74, g:[['N','AA'],['S','AP'],['W','A']]}
];

/* ---------------- the block: 3rd St at Mill St (tiles 188 / 48), corner rowhouse unit (door x 373) ---------------- */
const L_={
  door:{x:373,z:94.05},stoopTop:{x:373,z:94.9},foot:{x:373,z:97.55},
  truck:{x:377.3,z:83.6},rear:87.35,rampEnd:90.0,floorY:1.0,
  stack:{x:375.6,z:91.05},mrA:{x:377.3,z:86.4},
  corner:{x:375.55,z:96.0},granny:{x:376.25,z:97.35},
  okafor:{x:364.0,z:97.55},okaforStoop:{x:364.0,z:96.4},
  ring:{x:380.6,z:63.5},
  path:[{x:375.6,z:91.6},{x:375.9,z:93.8},{x:374.9,z:97.55},{x:373,z:97.55},{x:373,z:95.7},{x:373,z:94.35}],
  posts:{N:{x:378.6,z:59.5,face:{x:378.6,z:30}},S:{x:378.6,z:124.6,face:{x:378.6,z:150}},W:{x:349.3,z:87.2,face:{x:330,z:98}},T:{x:375.4,z:89.2,face:{x:377,z:70}}},
  spawns:{N:{x:378.8,z:30},S:{x:378.8,z:150},W:{x:330,z:98.6}},
  couchDrop:{x:373.6,z:98.4},
  win:{x:368,z:90,r:32}
};
const POSTNAME={N:'the north corner',S:'the south corner',W:'the alley',T:'the truck'};
const SHORT={N:'North',S:'South',W:'Alley',T:'Truck'};
const CREW=['rick','dave','rosa','gary'],HOME={rick:'N',dave:'S',rosa:'W',gary:'T'};
/* stoop height from the facade out (HT.Buildings rowhouse: platform 1.2 m deep at 1.02 m, six 0.17 m steps of 0.29 m) */
function stoopY(x,z){if(Math.abs(x-L_.door.x)>.75)return 0;const o=z-94.0;if(o<-.05)return 1.05;if(o<1.49)return 1.02;const k=Math.floor((o-1.2)/.29);return k<6&&k>=0?Math.max(0,1.02-.17*k):0}
/* the truck: floor 1.0 m from the rear sill forward, the ramp down to the street */
function truckY(x,z){if(Math.abs(x-L_.truck.x)>.95)return 0;if(z<L_.rear&&z>L_.truck.z-1.2)return L_.floorY;if(z>=L_.rear&&z<L_.rampEnd)return L_.floorY*(1-(z-L_.rear)/(L_.rampEnd-L_.rear));return 0}
const yAt=(x,z)=>Math.max(stoopY(x,z),truckY(x,z));
const hyp=(x,z)=>Math.hypot(x,z);
const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const wrap=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a};

/* ---------------- lines ---------------- */
const LN={
  intro:[['Ms. Okafor',"First family in two years. They're bringing a piano. I told them not to bring a piano."],
    ['Mr. Adeyemi',"Box says 'kitchen'. Everything says 'kitchen'. My wife packed."],
    ['rosa',"Lift with your legs. I'm not doing a back on a Saturday."],
    ['gary',"I'll carry the light boxes. The ones marked 'pillows'. Strategically."]],
  lift:[['rick',"Lifting!"],['dave',"Lifting! Point me at the heavy ones."],['gary',"Lifting. Pillows only. I have a note from my chiropractor."],['rosa',"Lifting. Knees, people. KNEES."]],
  cover:[['rick',"Covering!"],['dave',"Covering. Somebody save me the lamp."],['gary',"Watching the truck. Like a hawk. A hawk with a clipboard."],['rosa',"Covering the alley. Holler if anybody pulls something."]],
  flip:[['rick',"Covering! Make up your mind!"],['rick',"Lifting! ...Again!"],['dave',"I've been hired and fired three times in a minute."]],
  calls:{N:["Two boys coming down 3rd from Ash. Hands in their pockets.","More of them from the top of the street!","North end! They're back!"],
    S:["Somebody's coming up from Dock Street!","South end, by the bus stop!","From the bottom of the street. Three of them."],
    W:["They're cutting through the yards off 2nd!","Back alley! Behind the houses!","The alley, the alley!"]},
  hostile:["This is our block!","Who said you could move in here?","That's our stoop, man.","Nobody asked us!","We hang out here. This is OUR house."],
  dave:["It's everybody's block! Coming through!","Excuse me. Lamp coming through. Mind the shade.","It's a free country. And a free sidewalk. Coming through!"],
  talkL:["...Fine. It's a nice couch, though.","Aight, aight. Welcome to the neighbourhood, I guess.","...My aunt has that same lamp.","Whatever. ...Do they need help with the piano?"],
  talkP:["Make me.","Talk to the hand, Dad.","Nah. That box looks expensive.","You talking to me? With a box?"],
  you_talk:["Hey. Hey. It's a moving day. Nobody needs to be a hero.","Look, they're nice people. Grandma brought jollof.","Want to carry a lamp? It's very satisfying.","It's a box. It says 'kitchen'. Let it go."],
  tackle:["Whoa, whoa. Sit down. Hands where I can see 'em.","Gotcha. Nobody steals a box marked 'kitchen' on my watch.","Down you go. Gently. It's a residential street."],
  grab:["Free stuff!","Thanks for the box!","Kitchen! Score!"],
  lost:["...That one said 'misc'. We'll survive.","There goes a box of... something.","He got a box. I hope it's the one with the fondue set."],
  freeze:[['Mr. Adeyemi',"Everybody hold! Let them pass. ...They're not passing."],['Mrs. Adeyemi',"Kids, inside. Now. Bring the lamp."],['Grandma',"I've seen worse. 1978. Lagos. A goat got into the van."]],
  resume:[['Mr. Adeyemi',"Okay. Okay! Back to it."],['Grandma',"Good. Now. That box says KITCHEN. Kitchen is THAT way."],['Mrs. Adeyemi',"Thank you. Truly. Now lift."]],
  granny:["Left! Your OTHER left!","Lift with your legs! You have legs!","Small boxes on top. Who taught you to stack?","That one says FRAGILE. It means it.","Faster. My soap opera is at four.","Mind the railing! It's older than me!","You. Yes, you. Good lifting. Keep lifting."],
  you_box:["Box says 'kitchen'.","This one also says 'kitchen'.","'Kitchen, maybe?' Great system.","Heavy. What's in here, a second kitchen?","'Books'. Of course it's books.","This one rattles. Don't think about it.","'Misc. kitchen'. Very specific."],
  andreIn:[['Ms. Okafor',"ANDRE WILKINS. Does Tasha know you're out here?"],['Andre',"...Don't tell Tasha."]],
  andreBack:[['Andre',"...Need a hand with that last box?"],['you',"...Yeah. Yeah, we do."],['rosa',"He's a good kid. He just needed somebody to hand him a box."]],
  couch:[['Mr. Adeyemi',"Okay. The couch."],['Mrs. Adeyemi',"Is that couch going to fit?"],['you',"...No. But it's going in."]],
  couchGo:["On three. One, two—","Lift on three. ...We lifted on two. Fine."],
  scuff:["Scuff!","That's a scuff.","Ooh. The arm. The arm!","...Nobody saw that.","Mind the corner!"],
  piano:[['Grandma',"Everybody. On the piano. Now."],['Mr. Adeyemi',"I told her not to bring the piano. She said it was the piano or her."],['dave',"...We are moving a piano. During a turf war. On a Saturday."]],
  watch:["Hold up. Is that a piano?","Nah, nah. I gotta see this.","...They're never getting that up the stoop.","Ten bucks says it falls."],
  watchEnd:["...Aight. That was beautiful. We're out.","Okay. Respect. We're done here.","Man. I need to call my grandma."],
  step:["STEP!","Step. STEP.","Stop! Step!","And... STEP!"],
  up:["...and UP!","Heave!","Up! Up! Good!"],
  bonk:["Was that a C?","That piano's in G now.","...Out of tune. Like my family. Keep going.","BONG. Lovely."],
  china:[['Mrs. Adeyemi',"Not that one. That's Grandma's china. YOU carry it. Slowly."]],
  chinaHit:["*clink*","...*clink*. That was the gravy boat.","Easy. EASY."],
  end:[['Mrs. Adeyemi',"The lights work! The LIGHTS work!"],['Mr. Adeyemi',"We'll have you all over. When we find the plates. In a box marked 'kitchen'."],['Ms. Okafor',"Welcome home, cousin."]]
};

/* ---------------- resources: everything this file builds is tracked and disposed when the job ends ---------------- */
let RES=null;
function R(){return RES||(RES={geo:[],mat:[],tex:[],own:[],cache:{}})}
function tg(g){R().geo.push(g);return g}function tm(m){R().mat.push(m);return m}function tt(t){R().tex.push(t);return t}
function disposeRes(r0){const r=r0||RES;if(!r0)RES=null;if(!r)return;for(const g of r.geo)try{g.dispose()}catch(_){}for(const m of r.mat)try{m.dispose()}catch(_){}for(const t of r.tex)try{t.dispose()}catch(_){}for(const o of r.own)try{o.userData.dispose()}catch(_){}}
function T3(){return A().THREE}
/* per-model parts (truck load, couch length, window materials): a WeakMap, never userData */
const PARTS=new WeakMap();const parts=o=>PARTS.get(o)||{};
function M_(col,o){const a=A(),T=T3();return tm(new T.MeshStandardMaterial(Object.assign({color:a.lin(col),roughness:.75,metalness:0},o||{})))}
function canvasTex(w,h,fn){const T=T3(),c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);if(T.sRGBEncoding)t.encoding=T.sRGBEncoding;t.anisotropy=4;return tt(t)}
function mesh(geo,mat,x,y,z,parent,rx,ry,rz){const T=T3(),m=new T.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);if(rx||ry||rz)m.rotation.set(rx||0,ry||0,rz||0);m.castShadow=true;m.receiveShadow=true;if(parent)parent.add(m);return m}
function G_(k,fn){const c=R().cache;return c[k]||(c[k]=tg(fn()))}
function bx(w,h,d){return G_('b'+w+'_'+h+'_'+d,()=>new (T3().BoxGeometry)(w,h,d))}
function cyl(r0,r1,h,n){return G_('c'+r0+'_'+r1+'_'+h+'_'+n,()=>new (T3().CylinderGeometry)(r0,r1,h,n||12))}
/* a rounded box (cushions, the truck's corners): bevelled through a scaled sphere-ish box */
function rbox(w,h,d,r){return G_('r'+w+'_'+h+'_'+d+'_'+r,()=>{const T=T3(),s=new T.Shape(),x=-w/2+r,y=-h/2+r,W=w-2*r,H=h-2*r;
  s.moveTo(x,-h/2);s.lineTo(x+W,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,y);s.lineTo(w/2,y+H);s.quadraticCurveTo(w/2,h/2,x+W,h/2);s.lineTo(x,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,y+H);s.lineTo(-w/2,y);s.quadraticCurveTo(-w/2,-h/2,x,-h/2);
  const g=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r*.6,bevelSegments:3,curveSegments:5});g.translate(0,0,-(d-2*r)/2);return g})}

/* ---------------- textures ---------------- */
function TX(){const c=R().cache;if(c.tx)return c.tx;const X={};
  const tape=(g,w,h)=>{g.fillStyle='rgba(205,180,120,.85)';g.fillRect(w*.44,0,w*.12,h)};
  const card=(g,w,h)=>{g.fillStyle='#b98a55';g.fillRect(0,0,w,h);g.globalAlpha=.16;for(let i=0;i<260;i++){g.fillStyle=Math.random()<.5?'#6e4a24':'#e4c08a';g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*22,1)}g.globalAlpha=1;
    g.strokeStyle='rgba(90,60,30,.35)';g.lineWidth=3;g.strokeRect(2,2,w-4,h-4)};
  const label=(txt,col,font,rot)=>canvasTex(256,256,(g,w,h)=>{card(g,w,h);tape(g,w,h);g.save();g.translate(w/2,h*.62);g.rotate(rot||-.06);g.fillStyle=col||'#1d1d22';g.font=font||'700 46px "Comic Sans MS","Marker Felt",cursive';g.textAlign='center';
    const L=String(txt).split('\n');L.forEach((t,k)=>g.fillText(t,0,(k-(L.length-1)/2)*48));g.restore()});
  X.kitchen=label('KITCHEN');X.kitchen2=label('KITCHEN?','#1d1d22','700 44px "Comic Sans MS",cursive',.05);X.misc=label('MISC.\nKITCHEN','#1d1d22','700 40px "Comic Sans MS",cursive',-.03);
  X.books=label('BOOKS\n(HEAVY)','#1d2a6b','700 40px "Comic Sans MS",cursive',.04);X.pillows=label('PILLOWS','#2b5a2b','700 42px "Comic Sans MS",cursive',-.08);X.plain=label('');
  X.fragile=canvasTex(256,256,(g,w,h)=>{card(g,w,h);g.fillStyle='rgba(230,70,60,.9)';g.fillRect(0,0,w,40);g.fillRect(0,h-40,w,40);g.save();g.translate(w/2,h/2+16);g.rotate(-.12);g.strokeStyle='#c8281e';g.lineWidth=7;g.strokeRect(-104,-46,208,74);
    g.fillStyle='#c8281e';g.font='900 50px Impact,"Arial Black",sans-serif';g.textAlign='center';g.fillText('FRAGILE',0,10);g.restore();g.fillStyle='#fff';g.font='900 22px sans-serif';g.textAlign='center';g.fillText('GRANDMA\'S CHINA · THIS SIDE UP',w/2,27)});
  X.livery=canvasTex(1024,512,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#fbfaf6');gr.addColorStop(1,'#e9e6de');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='#e8732c';g.fillRect(0,h*.70,w,h*.11);g.fillStyle='#2b4a6b';g.fillRect(0,h*.81,w,h*.05);
    g.fillStyle='#2b4a6b';g.font='900 112px "Arial Black",Impact,sans-serif';g.textAlign='left';g.fillText('MOVE-ALONG',56,170);
    g.fillStyle='#e8732c';g.font='800 46px "Arial",sans-serif';g.fillText('TRUCK RENTALS',62,232);
    g.fillStyle='#4b5560';g.font='italic 600 34px Georgia,serif';g.fillText('"We bring the truck. You bring the friends."',62,300);
    /* a cartoon box with legs */g.save();g.translate(820,250);g.fillStyle='#c99c66';g.fillRect(-70,-80,140,120);g.fillStyle='#e0bd8a';g.fillRect(-70,-80,140,22);g.strokeStyle='#5a3e1e';g.lineWidth=6;g.strokeRect(-70,-80,140,120);
    g.fillStyle='#222';g.beginPath();g.arc(-25,-15,8,0,7);g.arc(25,-15,8,0,7);g.fill();g.beginPath();g.lineWidth=5;g.arc(0,5,22,.2,Math.PI-.2);g.stroke();g.fillRect(-40,40,10,50);g.fillRect(30,40,10,50);g.fillRect(-52,86,24,8);g.fillRect(28,86,24,8);g.restore();
    g.fillStyle='rgba(0,0,0,.05)';for(let i=0;i<14;i++)g.fillRect(i*w/14,0,2,h)});
  X.rear=canvasTex(512,512,(g,w,h)=>{g.fillStyle='#151719';g.fillRect(0,0,w,h);const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,220,170,.10)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.strokeStyle='rgba(255,255,255,.05)';for(let i=0;i<10;i++){g.beginPath();g.moveTo(0,i*52);g.lineTo(w,i*52);g.stroke()}});
  X.door=canvasTex(256,512,(g,w,h)=>{g.fillStyle='#d8d6d0';g.fillRect(0,0,w,h);for(let i=0;i<16;i++){g.fillStyle=i%2?'#c9c6be':'#e2e0da';g.fillRect(0,i*h/16,w,h/16-2);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,i*h/16+h/16-2,w,2)}});
  X.ramp=canvasTex(128,256,(g,w,h)=>{g.fillStyle='#9aa0a6';g.fillRect(0,0,w,h);g.fillStyle='#b9bec3';for(let i=0;i<16;i++)g.fillRect(6,i*16+4,w-12,5);g.fillStyle='rgba(0,0,0,.25)';for(let i=0;i<16;i++)g.fillRect(6,i*16+9,w-12,2)});
  X.fabric=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#2f7d78';g.fillRect(0,0,w,h);g.globalAlpha=.18;for(let y=0;y<h;y+=2){g.fillStyle=y%4?'#1d5b57':'#4aa29c';g.fillRect(0,y,w,1)}for(let x=0;x<w;x+=3){g.fillStyle='#174a47';g.fillRect(x,0,1,h)}g.globalAlpha=1});
  X.blanket=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#3a5f8f';g.fillRect(0,0,w,h);g.strokeStyle='#2c4a73';g.lineWidth=3;for(let i=-h;i<w+h;i+=16){g.beginPath();g.moveTo(i,0);g.lineTo(i+h,h);g.stroke();g.beginPath();g.moveTo(i,h);g.lineTo(i+h,0);g.stroke()}});
  X.keys=canvasTex(512,64,(g,w,h)=>{g.fillStyle='#f6f2e6';g.fillRect(0,0,w,h);g.fillStyle='#777';for(let i=0;i<=36;i++)g.fillRect(i*w/36,0,1.5,h);g.fillStyle='#141414';
    for(let i=0;i<36;i++){const n=i%7;if(n===0||n===1||n===3||n===4||n===5)g.fillRect((i+1)*w/36-4.5,0,9,h*.6)}});
  X.wood=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#3b2416';g.fillRect(0,0,w,h);g.globalAlpha=.25;for(let i=0;i<120;i++){g.fillStyle=Math.random()<.5?'#1e110a':'#6b4429';g.fillRect(0,Math.random()*h,w,1+Math.random()*2)}g.globalAlpha=1});
  /* the lit room behind the new family's windows: warm wall, lamp, the couch, the piano, a stack of KITCHEN boxes, a framed photo */
  const room=(kind)=>canvasTex(256,384,(g,w,h)=>{const gr=g.createRadialGradient(w*.62,h*.35,10,w*.5,h*.45,h*.75);gr.addColorStop(0,'#ffe2a8');gr.addColorStop(.55,'#e6a764');gr.addColorStop(1,'#7a4a2a');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='rgba(90,50,25,.55)';g.fillRect(0,h*.78,w,h*.22);/* floor */
    if(kind===0){/* couch + lamp */g.fillStyle='#2f7d78';g.fillRect(w*.08,h*.58,w*.6,h*.2);g.fillRect(w*.08,h*.5,w*.6,h*.1);g.fillStyle='#246561';g.fillRect(w*.04,h*.55,w*.08,h*.23);g.fillRect(w*.64,h*.55,w*.08,h*.23);
      g.fillStyle='#3a2416';g.fillRect(w*.82,h*.44,w*.03,h*.34);g.fillStyle='#fff3c8';g.beginPath();g.moveTo(w*.74,h*.44);g.lineTo(w*.93,h*.44);g.lineTo(w*.88,h*.32);g.lineTo(w*.79,h*.32);g.fill();
      g.fillStyle='#4a3020';g.fillRect(w*.3,h*.18,w*.22,h*.16);g.fillStyle='#9fc7e8';g.fillRect(w*.32,h*.2,w*.18,h*.12)}
    else if(kind===1){/* the piano */g.fillStyle='#2a170d';g.fillRect(w*.15,h*.38,w*.62,h*.4);g.fillStyle='#f6f2e6';g.fillRect(w*.17,h*.55,w*.58,h*.04);g.fillStyle='#1a0e08';g.fillRect(w*.15,h*.36,w*.62,h*.04);
      g.fillStyle='#e6d7b0';g.fillRect(w*.3,h*.28,w*.08,h*.08);g.fillStyle='#c8a050';g.fillRect(w*.5,h*.26,w*.12,h*.1)}
    else{/* boxes everywhere */const B=(x,y,s)=>{g.fillStyle='#b98a55';g.fillRect(x,y,s,s*.8);g.fillStyle='#d1aa76';g.fillRect(x+s*.44,y,s*.12,s*.8);g.fillStyle='#222';g.font='700 '+(s*.18|0)+'px sans-serif';g.fillText('KITCHEN',x+s*.08,y+s*.55)};
      B(w*.05,h*.62,w*.3);B(w*.38,h*.66,w*.26);B(w*.12,h*.42,w*.24);B(w*.66,h*.6,w*.28);B(w*.68,h*.4,w*.22)}
    g.fillStyle='rgba(255,255,255,.08)';g.fillRect(0,0,w,h*.5);
    /* the window: sash bars over the room */g.fillStyle='#efe9da';g.fillRect(0,h*.49,w,7);g.fillRect(w*.49,0,6,h);g.strokeStyle='#efe9da';g.lineWidth=10;g.strokeRect(0,0,w,h)});
  X.room=[room(0),room(1),room(2)];
  X.welcome=canvasTex(512,160,(g,w,h)=>{g.fillStyle='#ffd23f';g.fillRect(0,0,w,h);g.strokeStyle='#b8323a';g.lineWidth=8;g.strokeRect(6,6,w-12,h-12);g.fillStyle='#b8323a';g.font='900 54px "Arial Black",Impact,sans-serif';g.textAlign='center';g.fillText('WELCOME HOME!',w/2,78);
    g.fillStyle='#2b4a6b';g.font='700 italic 30px Georgia,serif';g.fillText('from your neighbours on 3rd St',w/2,124)});
  return c.tx=X}

/* ---------------- models ---------------- */
const BOXK=['kitchen','kitchen','kitchen2','misc','books','kitchen','pillows','plain','kitchen'];
function boxMat(k){const c=R().cache,key='bm_'+k;if(c[key])return c[key];const T=T3(),t=TX()[k]||TX().plain;const side=c.bmSide||(c.bmSide=tm(new T.MeshStandardMaterial({map:TX().plain,roughness:.92})));
  const face=tm(new T.MeshStandardMaterial({map:t,roughness:.92}));return c[key]=[side,side,face,side,face,face]}
function cardBox(kind,s){const T=T3(),w=.5*(s||1),h=.38*(s||1),d=.42*(s||1);const g=new T.Group();mesh(bx(w,h,d),boxMat(kind),0,h/2,0,g);return g}
/* the rental truck: a cutaway van front (the game's work van) with a 5.4 m box on the back, roll-up door up, ramp out */
function truckModel(M){const a=A(),T=T3(),X=TX(),g=new T.Group();
  const van=a.makeVehicle('workvan','#f4f1ea');if(van){van.position.set(1.15,0,0);g.add(van);if(van.userData&&van.userData.dispose)R().own.push(van)/* the game's vehicle model frees its own per-instance parts */}
  const box=new T.Group();box.position.set(-1.35,0,0);g.add(box);
  const BL=5.4,BW=2.4,B0=.62,BH=3.3,x1=BL/2,x0=-BL/2;
  const white=M_('#f6f4ef',{roughness:.55}),alu=M_('#c9ccd0',{roughness:.35,metalness:.75}),dark=M_('#1d1f22',{roughness:.8});
  const side=M_('#ffffff',{map:X.livery,roughness:.55});
  /* walls (livery both sides), roof, front cap; the interior is dark with stacked boxes */
  for(const s of[-1,1]){const p=mesh(new T.PlaneGeometry(BL,BH-B0),side,0,(B0+BH)/2,s*BW/2,box,0,s>0?0:Math.PI,0);tg(p.geometry);p.castShadow=true;
    mesh(bx(BL+.04,.05,.06),alu,0,BH,s*(BW/2+.01),box);mesh(bx(BL+.04,.06,.06),alu,0,B0+.02,s*(BW/2+.01),box);
    for(let i=0;i<=6;i++)mesh(bx(.035,BH-B0,.03),alu,x0+i*BL/6,(B0+BH)/2,s*(BW/2+.012),box);
    /* mud flap + side marker lights */mesh(bx(.02,.42,.5),dark,x0+.45,.42,s*.82,box);mesh(bx(.06,.06,.02),M_('#ff9a2a',{emissive:a.lin('#ff7a10'),emissiveIntensity:.6}),x1-.3,B0+.3,s*(BW/2+.03),box)}
  mesh(bx(BL,.06,BW),white,0,BH+.03,0,box);mesh(bx(.06,BH-B0,BW),white,x1,(B0+BH)/2,0,box);
  mesh(bx(.6,.5,BW*.9),white,x1+.3,BH-.35,0,box);/* the overhang over the cab ("Mom's attic") */
  mesh(bx(BL,.12,BW),M_('#2a2c30',{roughness:.9}),0,B0-.04,0,box);/* chassis rails under the box */
  for(const s of[-1,1])mesh(bx(BL*.9,.18,.14),dark,0,B0-.18,s*.55,box);
  const inner=tm(new T.MeshStandardMaterial({map:X.rear,roughness:.95,side:T.BackSide}));const inside=mesh(bx(BL-.1,BH-B0-.08,BW-.08),inner,0,(B0+BH)/2,0,box);inside.castShadow=false;
  mesh(bx(BL-.1,.04,BW-.1),M_('#5d5a55',{roughness:.9}),0,L_.floorY-.02,0,box);/* floor */
  /* rear frame, roll-up door rolled up under the roof, step bumper, tail lights */
  const rx=x0;mesh(bx(.1,BH-B0,.12),alu,rx,(B0+BH)/2,BW/2-.06,box);mesh(bx(.1,BH-B0,.12),alu,rx,(B0+BH)/2,-BW/2+.06,box);mesh(bx(.1,.14,BW),alu,rx,BH-.05,0,box);
  const roll=mesh(bx(.36,.32,BW-.16),tm(new T.MeshStandardMaterial({map:X.door,roughness:.5})),rx+.24,BH-.26,0,box);
  mesh(bx(.18,.16,BW),M_('#3a3d42',{roughness:.6,metalness:.4}),rx-.05,B0-.02,0,box);
  for(const s of[-1,1]){mesh(bx(.05,.24,.16),M_('#b01818',{emissive:a.lin('#ff2020'),emissiveIntensity:.5,roughness:.3}),rx-.03,B0+.2,s*(BW/2-.14),box);mesh(bx(.05,.1,.16),M_('#eeeeee',{emissive:a.lin('#ffffff'),emissiveIntensity:.2}),rx-.03,B0+.38,s*(BW/2-.14),box)}
  /* the load: rows of box stacks that empty as the bar fills, the couch and the piano at the front */
  const stacks=[];for(let ix=0;ix<4;ix++)for(const s of[-1,1])for(let k=0;k<3;k++){const b=cardBox(pick(BOXK),1.25);b.position.set(x0+.55+ix*.68,L_.floorY+k*.48,s*.55+rand(-.06,.06));b.rotation.y=rand(-.15,.15);box.add(b);stacks.push(b)}
  const couch=couchModel();couch.position.set(x1-1.45,L_.floorY,-.6);couch.rotation.y=Math.PI;box.add(couch);
  const piano=pianoModel();piano.position.set(x1-1.0,L_.floorY,.62);piano.rotation.y=Math.PI;box.add(piano);
  /* the ramp */
  const rampL=Math.hypot(L_.rampEnd-L_.rear,L_.floorY),ang=Math.atan2(L_.floorY,L_.rampEnd-L_.rear);
  const ramp=new T.Group();ramp.position.set(rx-.02,L_.floorY,0);ramp.rotation.z=ang;box.add(ramp);
  mesh(bx(rampL,.05,1.15),tm(new T.MeshStandardMaterial({map:X.ramp,roughness:.4,metalness:.6})),-rampL/2,0,0,ramp);for(const s of[-1,1])mesh(bx(rampL,.12,.04),alu,-rampL/2,.05,s*.58,ramp);
  /* the welcome sign Ms. Okafor taped to the side */
  const wel=mesh(new T.PlaneGeometry(1.5,.47),tm(new T.MeshStandardMaterial({map:X.welcome,roughness:.7})),x1-1.4,1.55,-(BW/2+.02),box,0,Math.PI,0);tg(wel.geometry);wel.rotation.z=.04;
  PARTS.set(g,{stacks,couch,piano,roll});
  return g}
/* a mustard-teal three-seater with turned legs */
function couchModel(){const T=T3(),g=new T.Group(),X=TX();const fab=tm(new T.MeshStandardMaterial({map:X.fabric,roughness:.95,color:0xffffff})),dk=M_('#1f4f4c',{roughness:.95}),leg=M_('#4a2e1a',{roughness:.5});
  const L=2.1,D=.86;mesh(rbox(L,.26,D,.06),fab,0,.3,0,g);/* base */
  for(let i=0;i<3;i++)mesh(rbox(L/3-.04,.16,D-.2,.06),fab,-L/3+i*L/3,.5,.07,g);/* seat cushions */
  for(let i=0;i<3;i++){const b=mesh(rbox(L/3-.05,.46,.2,.08),fab,-L/3+i*L/3,.74,-D/2+.16,g);b.rotation.x=-.12}
  mesh(rbox(L,.5,.16,.05),dk,0,.55,-D/2+.06,g);
  for(const s of[-1,1])mesh(rbox(.18,.5,D,.07),fab,s*(L/2+.02),.5,0,g);
  for(const sx of[-1,1])for(const sz of[-1,1])mesh(cyl(.035,.025,.16,8),leg,sx*(L/2-.08),.08,sz*(D/2-.08),g);
  return g}
/* an upright piano on a moving dolly, wrapped in a blanket on one side */
function pianoModel(){const T=T3(),g=new T.Group(),X=TX();const wood=tm(new T.MeshStandardMaterial({map:X.wood,roughness:.35,metalness:.05,color:0xffffff})),blk=M_('#0e0c0b',{roughness:.3});
  const W=1.5,H=1.28,D=.6,y0=.12;
  mesh(bx(W,H,D*.55),wood,0,y0+H/2,-D*.2,g);/* the case */
  mesh(bx(W,.08,D),wood,0,y0+.72,0,g);/* key bed */
  mesh(bx(W-.1,.035,.18),tm(new T.MeshStandardMaterial({map:X.keys,roughness:.35})),0,y0+.775,D*.3,g);
  mesh(bx(W,.06,.24),wood,0,y0+.83,D*.12,g);/* fallboard */
  mesh(bx(W+.04,.05,D*.6),wood,0,y0+H+.02,-D*.18,g);/* lid */
  for(const s of[-1,1]){mesh(bx(.07,.72,.07),wood,s*(W/2-.05),y0+.36,D*.34,g);mesh(bx(.06,H,D*.62),wood,s*(W/2-.03),y0+H/2,-D*.15,g)}
  for(let i=0;i<3;i++)mesh(bx(.04,.02,.12),M_('#c8a050',{metalness:.9,roughness:.25}),-.09+i*.09,y0+.06,D*.2,g);
  /* candle sconces, a framed photo and a doily on top: it's Grandma's piano */
  mesh(cyl(.09,.09,.01,16),M_('#f4f1e6',{roughness:.9}),.3,y0+H+.05,-D*.18,g);const ph=mesh(bx(.18,.22,.02),M_('#c8a050',{metalness:.8,roughness:.3}),.3,y0+H+.16,-D*.2,g);ph.rotation.x=-.15;
  /* dolly + blanket */
  mesh(bx(W+.1,.06,D+.06),M_('#6b4a2a',{roughness:.8}),0,.09,0,g);for(const sx of[-1,1])for(const sz of[-1,1])mesh(cyl(.05,.05,.04,10),blk,sx*(W/2-.05),.05,sz*(D/2-.05),g,Math.PI/2);
  const bl=mesh(bx(.04,H*.9,D*.9),tm(new T.MeshStandardMaterial({map:X.blanket,roughness:1})),W/2+.03,y0+H*.48,-D*.1,g);
  for(const yy of[.4,.95])mesh(bx(W+.12,.04,D*.62),M_('#e8b020',{roughness:.6}),0,y0+yy,-D*.15,g);/* straps */
  return g}
/* the propped-open front door: a dark doorway, the door swung in, a box labelled KITCHEN as the doorstop */
function doorway(){const T=T3(),g=new T.Group();const d=mesh(new T.PlaneGeometry(.98,2.4),M_('#120d0a',{roughness:1}),0,1.05+1.2,94.0+.012-94.0,g);tg(d.geometry);
  const leaf=new T.Group();leaf.position.set(-.47,1.05,-.02);g.add(leaf);mesh(bx(.94,2.38,.05),M_('#2b4a6b',{roughness:.5}),.47,1.19,0,leaf);leaf.rotation.y=-1.25;
  mesh(cyl(.03,.03,.04,10),M_('#c8a050',{metalness:.9,roughness:.25}),.84,1.05,.05,leaf,Math.PI/2);
  const k=cardBox('kitchen',.75);k.position.set(.18,1.03,-.2);k.rotation.y=.4;g.add(k);return g}
/* lit windows at the end: room panels just proud of the glass (ground floor + both upper windows), warm emissive */
function windowsLit(){const T=T3(),X=TX(),g=new T.Group();const W=[[370.48,1.75+.9,1.0,1.8,0],[370.04,4.6+.85,.95,1.7,1],[372.46,4.6+.85,.95,1.7,2]];const mats=[];
  for(const[x,y,w,h,k]of W){const m=tm(new T.MeshStandardMaterial({map:X.room[k],emissive:A().lin('#ffffff'),emissiveMap:X.room[k],emissiveIntensity:0,roughness:.6,transparent:true,opacity:0}));mats.push(m);
    const p=mesh(new T.PlaneGeometry(w*.92,h*.94),m,x,y,94.035,g);tg(p.geometry);p.castShadow=false}
  /* porch light pool on the stoop */
  PARTS.set(g,{mats});return g}

/* ---------------- people ---------------- */
function actor(key,look){const a=A(),pp=PP();let d=null;if(pp)try{d=pp.make(key)}catch(_){d=null}if(!d)d=a.makeDude(look||{shirt:'#7a8796',pants:'#2b2f36'});a.wmAdd(d.root);return d}
function pose(d,dt,o){const pp=PP();if(d&&d.rb&&pp)try{pp.pose(d,dt,Object.assign({aim:false,moving:false,mode:'stand'},o||{}))}catch(_){}}
function wave(d){const pp=PP();if(d&&d.rb&&pp&&pp.interact)try{pp.interact(d)}catch(_){}}
function face(d,x,z,dt,rate){const r=d.root,want=Math.atan2(x-r.position.x,z-r.position.z);if(!dt){r.rotation.y=want;return}r.rotation.y+=wrap(want-r.rotation.y)*Math.min(1,dt*(rate||6))}
/* walk a person along a path (list of points), y follows the stoop / the ramp. Returns true at the end */
function stepAlong(p,dt,spd){const pts=p.path;if(!pts||p.pi>=pts.length)return true;const r=p.d.root.position,t=pts[p.pi],dx=t.x-r.x,dz=t.z-r.z,l=Math.hypot(dx,dz);
  if(l<.08){p.pi++;return p.pi>=pts.length}const s=Math.min(l,spd*dt);r.x+=dx/l*s;r.z+=dz/l*s;r.y=yAt(r.x,r.z);p.d.root.rotation.y+=wrap(Math.atan2(dx,dz)-p.d.root.rotation.y)*Math.min(1,dt*9);p.moving=spd;return false}

/* ---------------- carry pose: hands on the box (two-bone IK on the Rocketbox arms, after the animation mixer) ---------------- */
const IKV={};function ikv(){if(IKV.ok)return IKV;const T=T3();Object.assign(IKV,{ok:true,a:new T.Vector3(),b:new T.Vector3(),c:new T.Vector3(),d:new T.Vector3(),e:new T.Vector3(),q:new T.Quaternion(),q2:new T.Quaternion(),q3:new T.Quaternion(),m:new T.Matrix4()});return IKV}
function aimBone(bone,childLocal,target){const V=ikv(),T=T3();bone.updateWorldMatrix(true,false);const bp=V.a.setFromMatrixPosition(bone.matrixWorld);bone.getWorldQuaternion(V.q);
  const cur=V.b.copy(childLocal).normalize().applyQuaternion(V.q),want=V.c.copy(target).sub(bp).normalize();if(want.lengthSq()<1e-6)return;
  V.q2.setFromUnitVectors(cur,want);V.q2.multiply(V.q);/* new world rotation */bone.parent.getWorldQuaternion(V.q3);V.q3.invert();bone.quaternion.copy(V.q3.multiply(V.q2));bone.updateWorldMatrix(false,true)}
/* d: a People dude; hands: {l:{x,y,z},r:{x,y,z}} in the dude's root space; elbows bend out and down */
function armsTo(d,hands,k){const rb=d&&d.rb,B=rb&&rb.bones;if(!B||k<=.01)return;const T=T3(),V=ikv();d.root.updateWorldMatrix(true,true);
  for(const s of['L','R']){const ua=B['Bip01_'+s+'_UpperArm'],fa=B['Bip01_'+s+'_Forearm'],ha=B['Bip01_'+s+'_Hand'];if(!ua||!fa||!ha)continue;
    const hp=hands[s==='L'?'l':'r'];const tgt=new T.Vector3(hp.x,hp.y,hp.z).applyMatrix4(d.root.matrixWorld);
    const sp=new T.Vector3().setFromMatrixPosition(ua.matrixWorld),ep=new T.Vector3().setFromMatrixPosition(fa.matrixWorld),wp=new T.Vector3().setFromMatrixPosition(ha.matrixWorld);
    const l1=sp.distanceTo(ep),l2=ep.distanceTo(wp);if(k<1)tgt.lerp(wp,1-k);
    let dist=sp.distanceTo(tgt);dist=Math.min(dist,(l1+l2)*.999);const dir=tgt.clone().sub(sp).normalize();
    /* elbow: out to the side (root x) and down */
    const side=new T.Vector3(s==='L'?1:-1,0,0).transformDirection(d.root.matrixWorld),pole=side.multiplyScalar(.6).add(new T.Vector3(0,-1,0)).normalize();
    const cosA=(l1*l1+dist*dist-l2*l2)/(2*l1*dist),aA=Math.acos(Math.max(-1,Math.min(1,cosA)));
    const perp=pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const elbow=sp.clone().add(dir.clone().multiplyScalar(Math.cos(aA)*l1)).add(perp.multiplyScalar(Math.sin(aA)*l1));
    aimBone(ua,fa.position,elbow);aimBone(fa,ha.position,sp.clone().add(dir.multiplyScalar(dist)))}}
const CARRY={box:{l:{x:.2,y:1.0,z:.34},r:{x:-.2,y:1.0,z:.34}},low:{l:{x:.24,y:.78,z:.3},r:{x:-.24,y:.78,z:.3}},push:{l:{x:.28,y:1.12,z:.42},r:{x:-.28,y:1.12,z:.42}}};

/* ---------------- the run state ---------------- */
function S(M){return M&&M.mv}
function fam(M){const V=S(M),out=[];if(!V)return out;for(const p of V.family)if(p.d&&p.d.root.visible)out.push(p.d.root.position);out.push(L_.door);return out}
function famDist(M,x,z){let b=1e9;for(const p of fam(M))b=Math.min(b,Math.hypot(p.x-x,p.z-z));return b}
const inBubble=(M,x,z,pad)=>famDist(M,x,z)<K.bubble+(pad||0);
/* does the segment (a->b) pass within r of anybody in the family? */
function lineNearFam(M,ax,az,bx_,bz,r){for(const p of fam(M)){const dx=bx_-ax,dz=bz-az,l2=dx*dx+dz*dz||1;let t=((p.x-ax)*dx+(p.z-az)*dz)/l2;t=Math.max(0,Math.min(1,t));if(Math.hypot(ax+dx*t-p.x,az+dz*t-p.z)<r)return true}return false}

J.register('moving',{
  def:{giver:'okafor',giverName:'Ms. Okafor',giverLook:{shirt:'#7a3b6b',pants:'#2b2f36',hair:'#1a1210',skin:'#6b4430'},hood:'river',title:'Heavy Lifting',
    role:'Ms. Okafor · the Okafor twins\' mom, 3rd St',place:'3rd St at Mill St, Riverside',
    lines:["My cousin's family, the Adeyemis, are moving into the empty house next to mine. First family to move INTO Riverside in two years.",
      "The boys who hang out in that house are not happy about it. They've been sitting on the stoop all week like it's theirs.",
      "Hold the street while the truck unloads. Carry boxes if you want it done before dark. And there's a piano. I told them not to bring a piano."],
    obj:"Hold 3rd St while the Adeyemis unload. Carry boxes yourself to speed it up, post the crew on the corners (no guns near the family), and get the couch and the piano in.",
    crew:['rick','dave','rosa','gary'],weapons:['pistol','beanbag'],
    from:{x:L_.okafor.x,z:L_.okafor.z},start:{x:L_.ring.x,z:L_.ring.z},
    unlock:{done:['rosa'],trustR:40},pay:1000,par:300,winTrust:6,order:20,
    stages:['unload','couch','piano'],stageLabels:{unload:'Moving day',couch:'The couch',piano:'The piano'},failPolicy:'escalate',
    medals:['Finished','You carried 25 boxes yourself','Moved in under 3:30'],
    radio:[['you',"Okay, crew. Moving day. Nobody draws anywhere near that family. We hold the corners."]],
    endLine:"The Adeyemis are home. The lights are on at 3rd and Mill, and the boys on the stoop found somewhere else to be."},

  start(M,o){const a=A();cleanup();buildStage(M,o||{});
    if(!(o&&o.checkpoint)){a.radio('Ms. Okafor',LN.intro[0][1],true);sayLater(M,1.8,LN.intro.slice(1))}
    music('tension',.25)},

  upd(dt,M,F){const a=A(),V=S(M);if(!V)return;V.t+=dt;V.dt=dt;
    sayTick(M,dt);ordersTick(M,dt);
    if(V.ph==='move'||V.ph==='couch')moversTick(M,dt);else idleFamily(M,dt);
    mrATick(M,dt);grannyTick(M,dt);kidTick(M,dt);okaforTick(M,dt);truckLoad(M);
    playerTick(M,dt,F);crewTick(M,dt);
    if(V.ph!=='end')wavesTick(M,dt);hostilesTick(M,dt,F);calmTick(M,dt);
    if(V.ph==='couch')couchTick(M,dt,F);
    if(V.ph==='piano')pianoTick(M,dt,F);
    if(V.ph==='last'||V.ph==='end')endTick(M,dt,F);
    if(M.state!=='go')return;
    /* the bar */
    if(V.ph==='move'&&V.pct>=K.couchAt&&!V.couchDone)startCouch(M,false);
    if((V.ph==='move'||V.ph==='couch')&&V.couchDone&&V.pct>=K.pianoAt&&!V.pianoDone&&!V.couch)startPiano(M,false);
    if(V.ph==='move'&&V.pianoDone&&V.pct>=99&&!V.lastBox)startLast(M);
    hud(M,F)},

  save:M=>{const V=S(M);if(!V)return{};return{pct:Math.round(V.pct*10)/10,you:V.you,scuffs:V.scuffs,china:V.china,andre:V.andre,cd:!!V.couchDone,pd:!!V.pianoDone,wave:V.waveI,calm:Math.round(V.calm),
    orders:Object.assign({},V.orders),lost:V.lost,talked:V.talked,tackled:V.tackled,pianoBonks:V.pianoBonks||0}},
  load(M,s){const V=S(M);if(!V||!s)return;V.pct=s.pct||0;V.you=s.you|0;V.scuffs=s.scuffs|0;V.china=s.china||'truck';V.andre=s.andre||'none';V.couchDone=!!s.cd;V.pianoDone=!!s.pd;V.waveI=s.wave|0;
    V.calm=Math.max(60,s.calm||K.calm0);V.lost=s.lost|0;V.talked=s.talked|0;V.tackled=s.tackled|0;V.pianoBonks=s.pianoBonks|0;if(s.orders)for(const id in s.orders)V.orders[id]=s.orders[id];
    if(V.couchDone)couchGone(M);if(V.pianoDone)pianoGone(M);
    /* resume the stage this checkpoint opened */
    if(M.stage==='couch'&&!V.couchDone){V.pct=Math.max(V.pct,K.couchAt);startCouch(M,true)}
    else if(M.stage==='piano'&&!V.pianoDone){V.pct=Math.max(V.pct,K.pianoAt);startPiano(M,true)}},

  payout(M,ok){const V=S(M);if(!ok||!V)return[];const out=[];
    if(V.you>=K.silver)out.push(['Helping hands · '+V.you+' boxes',200]);
    if(V.couchDone&&!V.scuffs)out.push(['Not a scuff on the couch',100]);
    if(V.andre==='back')out.push(['Andre carried the last box',0]);
    else if(V.china==='broken')out.push(["Grandma's china: one gravy boat, deceased",0]);
    else if(V.you<K.silver)out.push(['Boxes you carried ×'+V.you,0]);
    return out},
  medal(M){const V=S(M);if(!V)return 1;return M.elapsed<K.gold?3:V.you>=K.silver?2:1},
  end(M,ok){if(!ok)return;const a=A(),s=a.SV&&a.SV(),Sv=window.HT&&HT.Save;if(!s)return;s.flags=s.flags||{};s.flags.adeyemis=true;if(S(M)&&S(M).andre==='back')s.flags.andre=true;
    try{Sv&&Sv.household&&Sv.household(null,'adeyemi')}catch(_){}try{a.save()}catch(_){}},

  /* hostiles can't see (or shoot at) anybody inside the bubble: the fight stays out at the corners */
  perceive(e,w){const M=A().M,V=S(M);if(!V||!w||!w.threats)return;if(V.wT!==w){V.wT=w;V.full=w.threats}w.threats=V.full.filter(th=>!inBubble(M,th.x,th.z,1))},
  noise(n){const M=A().M,V=S(M);if(!V||!n||n.kind!=='gun')return;const d=famDist(M,n.x,n.z);if(d<K.flinchR)V.shotT=V.t;if(d<K.calmR)V.calmHit=(V.calmHit||0)+K.calmShot},
  /* the dad's shots: never toward the family */
  fire(){const a=A(),M=a.M,V=S(M);if(!V)return;if(V.carry||V.couch&&V.couch.held||V.ph==='piano'&&V.piano&&V.piano.on){return true}
    const c=a.camera,T=T3(),dir=new T.Vector3();c.getWorldDirection(dir);const ex=c.position.x+dir.x*60,ez=c.position.z+dir.z*60;
    if(lineNearFam(M,c.position.x,c.position.z,ex,ez,3.5)){if(V.t-(V.nfT||-9)>3){V.nfT=V.t;a.radio('you',pick(["Not toward the family. Reposition.","Bad angle. The truck's behind him.","Can't take that shot. Grandma's back there."]),true)}return true}},
  pose(dt){const M=A().M,V=S(M);if(!V)return;posesAfter(M,dt)},
  hud(st){const M=A().M,V=S(M);if(!V)return;if(V.noGun){st.crosshair=Object.assign({},st.crosshair,{hidden:true})}},

  test:{give(a){const h=window.__ht,s=a.SV();
      for(const id of['gary','rick','earl','dee','rosa']){const i=a.MISSIONS.findIndex(m=>m.id===id);if(i>=0&&h&&h.prog)h.prog.done[i]=true;if(s&&window.HT.Save&&HT.Save.jobRec)HT.Save.jobRec(s,id).done=true}
      if(h&&h.prog){h.prog.trustR=Math.max(h.prog.trustR||0,40);h.prog.act=2}if(s){if(s.world)s.world.bridgeOpen=true;s.flags=s.flags||{};s.flags.act2Intro=true}
      /* the Riverside cast the job (and the brief's cast preload) needs, so the harness's synchronous drive finds it cached */
      const P_=window.HT.People;if(P_&&P_.preload)try{P_.preload(CAST.concat(['dad_gary','dad_rick','dad_dave','rosa','thug_hoodie','thug_track','thug_beanie','thug_red']).filter(k=>P_.keys.includes(k)&&!P_.has(k))).catch(()=>{})}catch(_){}},
    step:(a,t,o)=>bot(a,t,o||{}),
    cpNode:false,/* load() rebuilds the stage through the game: the [CP] round trip runs in the browser (jobs-check --retry) */
    sample:()=>({mv:{}})}
});
/* the cast: Ms. Okafor and the Adeyemis come from the Riverside neighbour pool (docs/PEOPLE.md) */
const CASTK={okafor:'nb_office',mrA:'nb_marcus',mrsA:'nb_lucia',kid:'nb_kid',granny:'nb_gran',n1:'nb_pops',n2:'nb_sweater',uncle:'nb_kenji'};
const CAST=Object.values(CASTK);
(function(){const pp=window.HT&&HT.People;if(pp&&pp.roles&&!pp.roles.okafor&&(pp.keys||[]).includes(CASTK.okafor))pp.roles.okafor=CASTK.okafor})();

/* ================= building the stage ================= */
function buildStage(M,o){const a=A(),T=T3(),pp=PP();
  if(pp&&pp.preload)try{pp.preload(CAST.filter(k=>(pp.keys||[]).includes(k)&&!pp.has(k))).catch(()=>{})}catch(_){}
  const V=M.mv={t:0,dt:0,ph:'move',pct:0,you:0,scuffs:0,china:'truck',andre:'none',couchDone:false,pianoDone:false,waveI:0,calm:K.calm0,lost:0,talked:0,tackled:0,
    family:[],movers:[],hostiles:[],q:[],sayT:0,orders:{},crew:{},stoop:[],carry:null,frozen:false,frozenT:0,clearT:9,grT:4,noGun:false,lastP:null,pianoBonks:0,waveT:0,said:{},boxSeq:0};
  for(const id of CREW)V.orders[id]=HOME[id];
  /* the truck (its collider goes in before the nav is built, so the crew and the street crew path around it) */
  const tr=truckModel(M);tr.position.set(L_.truck.x,a.groundAt(L_.truck.x,L_.truck.z),L_.truck.z);tr.rotation.y=Math.PI/2;/* model +x = front -> north (-z) */a.wmAdd(tr);V.truck=tr;
  a.wmCol({x0:L_.truck.x-1.2,x1:L_.truck.x+1.2,z0:L_.truck.z-4.2,z1:L_.rear-.05});
  a.wmSetWindow(a.wmWindow(L_.win.x,L_.win.z,L_.win.r));
  /* the staging pallet at the foot of the ramp */
  const pal=new T.Group();mesh(bx(1.0,.12,.9),M_('#a07a4a',{roughness:.9}),0,.06,0,pal);pal.position.set(L_.stack.x,0,L_.stack.z);a.wmAdd(pal);V.pallet=pal;V.palBoxes=[];
  for(let i=0;i<5;i++){const b=cardBox(BOXK[i%BOXK.length]);b.position.set((i%2?.22:-.22)+rand(-.03,.03),.12+Math.floor(i/2)*.38,(i%4<2?.18:-.18));b.rotation.y=rand(-.2,.2);pal.add(b);V.palBoxes.push(b)}
  /* the doorway, the lit windows (off until the end), the stoop pile */
  const dw=doorway();dw.position.set(L_.door.x,0,94.0);a.wmAdd(dw);V.doorway=dw;
  const wl=windowsLit();a.wmAdd(wl);V.windows=wl;
  /* the family */
  const mk=(key,role,name,x,z)=>{const d=actor(CASTK[key]);d.root.position.set(x,yAt(x,z),z);const p={key,role,name,d,path:null,pi:0,st:'idle',t:rand(0,1),box:null,moving:0,x,z};V.family.push(p);return p};
  V.mrA=mk('mrA','truck','Mr. Adeyemi',L_.mrA.x,L_.mrA.z);V.mrA.st='down';
  V.mrsA=mk('mrsA','mover','Mrs. Adeyemi',L_.path[2].x,L_.path[2].z);
  V.kid=mk('kid','kid','Kemi',372.6,95.0);V.granny=mk('granny','granny','Grandma',L_.granny.x,L_.granny.z);
  const n1=mk('n1','mover','Mr. Dube',376.0,92.8),n2=mk('n2','mover','Mr. Novak',L_.foot.x+.6,L_.foot.z),un=mk('uncle','mover','Uncle Tunde',376.4,90.0);
  V.movers=[V.mrsA,n1,n2,un].slice(0,K.movers);V.movers.forEach((m,i)=>{m.st='toStack';m.path=null;m.lat=[-.3,.3,0,-.15][i];m.t=i*1.6});
  V.okafor=mk('okafor','okafor','Ms. Okafor',L_.okafor.x,L_.okafor.z);face(V.okafor.d,L_.truck.x,L_.truck.z);
  face(V.granny.d,L_.truck.x,L_.truck.z);face(V.kid.d,L_.foot.x,L_.foot.z+3);
  /* the crew: everybody starts on their corner */
  for(const al of a.allies){const id=al.id;if(!CREW.includes(id))continue;V.crew[id]={a:al,box:null,st:'post',t:0};setRole(M,id,V.orders[id],true)}
  /* director lanes (AI.director's nav lanes from each approach to the truck) */
  const AI=window.HT&&HT.AI,nav=a.L&&a.L.nav;V.lanes={};
  if(AI&&AI.director&&nav)try{const keys=['N','S','W'];const D=AI.director(nav,{spawns:keys.map(k=>L_.spawns[k]),defend:{x:L_.stack.x,z:L_.stack.z},waves:[1]});keys.forEach((k,i)=>{const L=D.lanes[i];if(L)V.lanes[k]=L})}catch(e){console.warn('moving: lanes',e)}
  /* the crew panel (G / T and the chips) */
  panel(M,true);
  V.lastP={x:a.P.pos.x,z:a.P.pos.z};
  if(o.checkpoint)return;
  a.banner('HEAVY LIFTING','3rd St at Mill St · moving day',2.6)}

/* ================= talk queue (non-blocking: every line is radio + a short gap, the game never waits on it) ================= */
function say(M,who,text,front){A().radio(who,text,front)}
function sayLater(M,delay,lines){const V=S(M);let t=delay;for(const[w,x]of lines){V.q.push({t:V.t+t,w,x});t+=2.6}}
function sayTick(M,dt){const V=S(M);for(let i=V.q.length-1;i>=0;i--){const q=V.q[i];if(V.t>=q.t){V.q.splice(i,1);say(M,q.w,q.x)}}}

/* ================= crew orders: AI.ally role commands ================= */
function postPoint(id,where,k){const p=L_.posts[where]||L_.posts.T;const o=k||0;return{x:p.x+(o%2?.9:-.9)*(o?1:0),z:p.z,face:p.face}}
function setRole(M,id,order,quiet){const a=A(),V=S(M),c=V.crew[id];if(!c)return;const al=c.a;V.orders[id]=order;
  if(order==='lift'){c.st='toStack';c.t=0;if(al.dude.gun)a.equip(al.dude,null);c.unarmed=true;al.role={kind:'lift',x:L_.stack.x+rand(-.5,.5),z:L_.stack.z+.9,speed:K.crewBack,fire:false}}
  else{dropCrewBox(M,c);c.st='post';if(c.unarmed&&order!=='T'){a.equip(al.dude,al.gun);c.unarmed=false}
    const p=postPoint(id,order);const inB=order==='T';if(inB&&al.dude.gun){a.equip(al.dude,null);c.unarmed=true}
    al.role={kind:inB?'go':'cover',x:p.x,z:p.z,r:1.2,face:p.face,fire:inB?false:true,ok:e=>okTarget(M,al,e)}}}
function okTarget(M,al,e){if(e.mvTm||e.state!=='idle')return false;if(inBubble(M,e.pos.x,e.pos.z,2))return false;return!lineNearFam(M,al.pos.x,al.pos.z,e.pos.x,e.pos.z,3.5)}
function allOrder(M,kind){const V=S(M);if(!V||V.ph==='end'||V.ph==='last')return;const was=Object.assign({},V.orders);
  for(const id of CREW)if(V.crew[id])setRole(M,id,kind==='lift'?'lift':HOME[id]);
  const n=V.cmdN=(V.cmdN||0)+1,flip=V.lastCmd&&V.lastCmd!==kind&&V.t-(V.cmdT||-9)<12;V.lastCmd=kind;V.cmdT=V.t;
  say(M,'you',kind==='lift'?'Lift!':'Cover!',true);
  if(flip&&!V.said.flip){V.said.flip=1;sayLater(M,.9,[LN.flip[kind==='lift'?1:0]])}
  else{const L=kind==='lift'?LN.lift:LN.cover;sayLater(M,.9,[L[n%L.length]])}
  snd('radio');panel(M)}
function cycleOrder(M,id){const V=S(M);if(!V||!V.crew[id]||V.ph==='end'||V.ph==='last')return;const cur=V.orders[id];setRole(M,id,cur==='lift'?HOME[id]:'lift');
  const L=V.orders[id]==='lift'?LN.lift:LN.cover;const ln=L.find(x=>x[0]===id);say(M,'you',(V.crew[id].a.name||id)+', '+(V.orders[id]==='lift'?'lift!':'cover!'),true);if(ln)sayLater(M,.8,[ln]);snd('radio');panel(M)}
function ordersTick(M,dt){const a=A(),k=a.keys,V=S(M);if(k.g&&!V.gDown){V.gDown=1;allOrder(M,'lift')}else if(!k.g)V.gDown=0;if(k.t&&!V.tDown){V.tDown=1;allOrder(M,'cover')}else if(!k.t)V.tDown=0}
/* the crew panel: chips per person (tap / click to switch), LIFT! and COVER! buttons, key hints */
function panel(M,make){const a=A(),V=S(M);if(!V)return;let el=V.panelEl;
  if(make||!el){if(el&&el.parentNode)el.remove();el=document.createElement('div');el.className='mv-root';el.style.pointerEvents='none';V.panelEl=el;
    el.innerHTML='<style>.mv-crew{position:absolute;right:16px;bottom:clamp(170px,27vh,200px);display:flex;flex-direction:column;gap:5px;align-items:stretch;width:132px;pointer-events:none;font:600 12px/1 "Barlow Condensed","Barlow",sans-serif;letter-spacing:.04em;text-transform:uppercase}'+
      '.mv-crew .chip,.mv-crew .btn{pointer-events:auto;cursor:pointer;border-radius:8px;padding:5px 9px;background:rgba(14,18,24,.66);color:#eef2f6;border:1px solid rgba(255,255,255,.14);display:flex;flex-direction:row;justify-content:space-between;align-items:baseline;gap:6px;backdrop-filter:blur(3px);user-select:none;-webkit-user-select:none}'+
      '.mv-crew .chip b{font-size:13px;letter-spacing:.06em}.mv-crew .chip i{font-style:normal;font-size:11px;opacity:.85}.mv-crew .chip.lift{border-color:#f0a020;background:rgba(80,52,8,.72)}.mv-crew .chip.lift i{color:#ffc35a}.mv-crew .chip.cover i{color:#8fd0ff}'+
      '.mv-crew .btn{flex-direction:row;align-items:center;gap:6px;font-size:13px;min-width:0;padding:8px 10px}.mv-crew .btn kbd{font:700 11px/1 sans-serif;background:rgba(255,255,255,.16);border-radius:4px;padding:3px 5px}.mv-crew .btn.l{border-color:#f0a020}.mv-crew .btn.c{border-color:#5fb0f0}'+
      '@media (max-width:900px),(max-height:500px){.mv-crew{top:auto;bottom:clamp(150px,40vh,190px);right:8px;width:112px;gap:3px}.mv-crew .chip{padding:4px 7px}.mv-crew .chip i{font-size:10px}.mv-crew .btn{padding:7px 8px}.mv-crew .btn kbd{display:none}}</style>'+
      '<div class="mv-crew"><div class="btn l" data-k="lift"><kbd>G</kbd>Lift!</div>'+CREW.map(id=>'<div class="chip" data-id="'+id+'"><b></b><i></i></div>').join('')+'<div class="btn c" data-k="cover"><kbd>T</kbd>Cover!</div></div>';
    const on=ev=>{const t=ev.target.closest('[data-id],[data-k]');if(!t)return;ev.preventDefault();ev.stopPropagation();const M_=A().M;if(!S(M_))return;if(t.dataset.k)allOrder(M_,t.dataset.k);else cycleOrder(M_,t.dataset.id)};
    el.addEventListener('pointerdown',on);V.panelOn=on;try{a.overlay('moving-crew',el)}catch(_){}}
  el.style.display=V.ph==='last'||V.ph==='end'?'none':'';
  for(const id of CREW){const ch=el.querySelector('[data-id="'+id+'"]');if(!ch)continue;const c=V.crew[id];ch.style.display=c?'':'none';if(!c)continue;const o=V.orders[id];
    ch.className='chip '+(o==='lift'?'lift':'cover');ch.querySelector('b').textContent=(c.a.name||id).replace(/^Coach /,'');ch.querySelector('i').textContent=o==='lift'?(c.box?'Carrying':'Lifting'):c.a.down?'Down':SHORT[o]}}
function crewTick(M,dt){const a=A(),V=S(M);let dirty=false;
  for(const id in V.crew){const c=V.crew[id],al=c.a;if(!al||!a.allies.includes(al))continue;
    if(al.down){if(c.box)dropCrewBox(M,c);continue}
    if(V.orders[id]!=='lift'){if(id==='gary'&&V.orders[id]==='T'&&V.ph!=='end'&&V.ph!=='last')garyWatch(M,c,dt);continue}
    const R_=al.role;if(!R_||R_.kind!=='lift')continue;const d=Math.hypot(al.pos.x-R_.x,al.pos.z-R_.z);
    if(V.ph==='piano'){/* everybody on the piano: the job places them */continue}
    if(c.st==='toStack'){if(d<1.1&&!V.frozenHard){c.t+=dt;if(c.t>K.moverHand){c.t=0;c.st='toDoor';c.box=cardBox(pick(BOXK));A().wmAdd(c.box);R_.x=L_.foot.x+rand(-.6,.6);R_.z=L_.foot.z+.5;R_.speed=K.crewLoad;dirty=true;
        if(id==='dave'&&!V.said.lamp){V.said.lamp=1;c.lamp=true}}}}
    else if(c.st==='toDoor'){if(d<1.2){c.t+=dt;if(c.t>.35){c.t=0;deliver(M,'crew',c.box,{x:al.pos.x,z:al.pos.z});c.box=null;c.st='toStack';R_.x=L_.stack.x+rand(-.5,.5);R_.z=L_.stack.z+.9;R_.speed=K.crewBack;dirty=true}}}
    if(c.box){const r=al.dude.root;c.box.position.set(r.position.x+Math.sin(r.rotation.y)*.36,r.position.y+.82,r.position.z+Math.cos(r.rotation.y)*.36);c.box.rotation.y=r.rotation.y}}
  if(dirty)panel(M)}
function dropCrewBox(M,c){if(c&&c.box){if(c.box.parent)c.box.parent.remove(c.box);c.box=null}}
/* Gary "watches the truck": he talks at anybody who comes to it. Lookers leave after 4 s of Gary; pushers slow down */
function garyWatch(M,c,dt){const V=S(M);const tmh=V.hostiles.filter(h=>h.tm&&h.tm.st==='mischief'&&Math.hypot(h.e.pos.x-c.a.pos.x,h.e.pos.z-c.a.pos.z)<6);
  for(const h of tmh){h.tm.gary=(h.tm.gary||0)+dt;if(h.tm.kind==='L'&&h.tm.gary>4){defuse(M,h,'gary')}}
  if(tmh.length&&V.t-(V.garyT||-9)>7){V.garyT=V.t;say(M,'gary',pick(["Hi there. Do you have a permit to loiter? I'm kidding. Unless...","Fun fact: this truck has a 2,000 pound payload. I read the manual. Want to hear about it?","Let me tell you about my spreadsheet of this move. It has tabs."]))}}

/* ================= the movers and the family ================= */
function moverPath(m,to){const P_=L_.path,lat=m.lat||0;let pts=to==='door'?P_.slice(1):P_.slice(0,-1).reverse();
  pts=pts.map((p,i)=>({x:p.x+(p.x<373.5&&p.z<97.6&&Math.abs(p.x-373)<.2?0:lat),z:p.z}));if(to==='stack')pts.push({x:L_.stack.x+lat*.5,z:L_.stack.z+.85});return pts}
function moversTick(M,dt){const a=A(),V=S(M);const trouble=V.hostiles.some(h=>h.e.state==='idle'&&Math.hypot(h.e.pos.x-L_.stack.x,h.e.pos.z-L_.stack.z)<K.freeze);
  const shots=V.t-(V.shotT||-9)<1.2;
  if(trouble||shots){if(!V.frozen){V.frozen=true;V.frozenT=0;if(V.t-(V.frzSaid||-9)>14){V.frzSaid=V.t;const l=pick(LN.freeze);say(M,l[0],l[1],true)}}V.clearT=0}
  else{V.clearT+=dt;if(V.frozen&&V.clearT>1.5){V.frozen=false;if(V.t-(V.resSaid||-9)>14){V.resSaid=V.t;const l=pick(LN.resume);say(M,l[0],l[1])}}}
  V.frozenHard=V.frozen;if(V.frozen)V.frozenT+=dt;
  for(const m of V.movers){const d=m.d;m.moving=0;
    if(V.frozen){/* hold where they are; a box stays in hand; they turn to the trouble and duck when there's shooting */const h=V.hostiles.find(h=>h.e.state==='idle');if(h)face(d,h.e.pos.x,h.e.pos.z,dt,4);m.duck=shots;continue}
    m.duck=false;
    if(m.st==='toStack'){if(!m.path){m.path=moverPath(m,'stack');m.pi=0}if(stepAlong(m,dt,K.moverBack)){m.st='take';m.t=0;m.path=null;face(d,L_.stack.x,L_.stack.z)}}
    else if(m.st==='take'){m.t+=dt;if(m.t>K.moverHand){m.st='toDoor';m.box=cardBox(pick(BOXK));a.wmAdd(m.box);wave(d)}}
    else if(m.st==='toDoor'){if(!m.path){m.path=moverPath(m,'door');m.pi=0}if(stepAlong(m,dt,K.moverLoad)){m.st='in';m.t=0;m.path=null}}
    else if(m.st==='in'){m.t+=dt;if(m.t>.25&&d.root.visible){d.root.visible=false;if(m.box){deliver(M,'mover',m.box,null);m.box=null}}if(m.t>1.0){d.root.visible=true;m.st='toStack'}}
    if(m.box){const r=d.root;m.box.position.set(r.position.x+Math.sin(r.rotation.y)*.34,r.position.y+.8,r.position.z+Math.cos(r.rotation.y)*.34);m.box.rotation.y=r.rotation.y}}}
/* a box arrives: +1 % (crew and you leave it on the stoop pile, the kid takes it in) */
function deliver(M,who,box,at){const a=A(),V=S(M);V.pct=Math.min(V.ph==='piano'?100:99.4+(V.lastBox?1:0),V.pct+1);
  if(who==='mover'){if(box&&box.parent)box.parent.remove(box);return}
  if(box&&box.parent)box.parent.remove(box);addStoop(M,box);if(who==='you'){V.you++;snd('drop');if(V.you===1||V.you%5===0)a.feed('Box delivered','trust',V.you+(V.you===1?' box':' boxes')+' · you')}}
function addStoop(M,box){const a=A(),V=S(M);if(!box)return;const n=V.stoop.length;if(n>=5){/* the pile is full: this one goes straight in */return}
  const spots=[[.38,95.05],[-.38,95.05],[.38,95.55],[-.38,95.55],[0,95.3]];const s=spots[n];box.position.set(L_.door.x+s[0],stoopY(L_.door.x+s[0]*.5,s[1])+(n===4?.38:0),s[1]);box.rotation.set(0,rand(-.3,.3),0);a.wmAdd(box);V.stoop.push(box)}
function idleFamily(M,dt){const V=S(M);for(const m of V.movers){m.moving=0}}
function mrATick(M,dt){const V=S(M),p=V.mrA;if(!p)return;const d=p.d;p.moving=0;
  if(V.ph==='piano'||V.ph==='last'||V.ph==='end')return;
  if(V.frozen){face(d,L_.stack.x,L_.stack.z+5,dt,3);return}
  /* up the ramp, a box from the load, down to the pallet, and again */
  if(p.st==='down'){if(!p.path){p.path=[{x:L_.truck.x,z:L_.rear+.3},{x:L_.truck.x,z:86.2}];p.pi=0}if(stepAlong(p,dt,1.8)){p.st='grab';p.t=0;p.path=null}}
  else if(p.st==='grab'){p.t+=dt;face(d,L_.truck.x,80,dt,6);if(p.t>.7){p.st='up';p.box=cardBox(pick(BOXK));A().wmAdd(p.box)}}
  else if(p.st==='up'){if(!p.path){p.path=[{x:L_.truck.x,z:L_.rampEnd+.25},{x:L_.stack.x+.55,z:L_.stack.z}];p.pi=0}if(stepAlong(p,dt,1.5)){p.st='set';p.t=0;p.path=null}}
  else if(p.st==='set'){p.t+=dt;face(d,L_.stack.x,L_.stack.z,dt,6);if(p.t>.5){if(p.box&&p.box.parent)p.box.parent.remove(p.box);p.box=null;p.st='down'}}
  if(p.box){const r=d.root;p.box.position.set(r.position.x+Math.sin(r.rotation.y)*.34,r.position.y+.8,r.position.z+Math.cos(r.rotation.y)*.34);p.box.rotation.y=r.rotation.y}}
function grannyTick(M,dt){const V=S(M),g=V.granny;if(!g)return;const d=g.d;if(V.ph==='end')return;
  /* she directs traffic from the corner: faces whoever is carrying, waves her arms, calls the waves */
  const P_=A().P;const tgt=V.carry?{x:P_.pos.x,z:P_.pos.z}:V.movers.find(m=>m.box)?V.movers.find(m=>m.box).d.root.position:{x:L_.stack.x,z:L_.stack.z};face(d,tgt.x,tgt.z,dt,3);
  V.grT-=dt;if(V.grT<=0&&!V.frozen&&V.ph!=='piano'){V.grT=rand(9,15);wave(d);if(Math.random()<.6)say(M,'Grandma',pick(LN.granny))}}
function kidTick(M,dt){const V=S(M),k=V.kid;if(!k)return;const d=k.d;k.moving=0;
  if(V.frozen&&!k.inside&&V.ph!=='end'){/* inside when there's trouble */k.path=[{x:L_.door.x,z:L_.door.z+.3}];k.pi=0;if(stepAlong(k,dt,3)){d.root.visible=false;k.inside=true}return}
  if(k.inside&&!V.frozen){k.inside=false;d.root.visible=true;k.st='idle';k.t=0}if(k.inside)return;
  /* ferries the stoop pile inside, one box at a time; sits on the top step otherwise */
  if(k.st==='idle'){k.t+=dt;if(V.stoop.length&&k.t>.6){k.st='take';k.box=V.stoop.pop();k.path=[{x:k.box.position.x,z:k.box.position.z+.15}];k.pi=0}else{d.root.position.set(372.55,1.02,95.05);face(d,L_.foot.x,L_.foot.z+4,dt,3)}}
  else if(k.st==='take'){if(stepAlong(k,dt,2.2)){k.st='in';k.path=[{x:L_.door.x,z:94.3}];k.pi=0}}
  else if(k.st==='in'){if(k.box){const r=d.root;k.box.position.set(r.position.x+Math.sin(r.rotation.y)*.3,r.position.y+.62,r.position.z+Math.cos(r.rotation.y)*.3);k.box.rotation.y=r.rotation.y}
    if(stepAlong(k,dt,2.0)){if(k.box&&k.box.parent)k.box.parent.remove(k.box);k.box=null;d.root.visible=false;k.st='out';k.t=0}}
  else if(k.st==='out'){k.t+=dt;if(k.t>.8){d.root.visible=true;k.st='idle';k.t=0}}}
function okaforTick(M,dt){const V=S(M),o=V.okafor;if(!o)return;const d=o.d;if(V.ph==='end')return;d.root.position.set(L_.okafor.x,0,L_.okafor.z);
  const h=V.hostiles.find(h=>h.e.state==='idle'&&h.tm);face(d,h?h.e.pos.x:L_.stack.x,h?h.e.pos.z:L_.stack.z,dt,3);V.okT=(V.okT||6)-dt;if(V.okT<=0){V.okT=rand(8,14);wave(d)}}
/* the truck empties as the bar fills */
function truckLoad(M){const V=S(M),u=V.truck&&parts(V.truck);if(!u)return;const n=u.stacks.length,keep=Math.ceil(n*(1-V.pct/100));u.stacks.forEach((b,i)=>b.visible=i<keep);
  const pb=V.palBoxes;if(pb){const show=V.pct>=99?0:pb.length;pb.forEach((b,i)=>b.visible=i<show)}}

/* ================= you: carrying ================= */
function playerTick(M,dt,F){const a=A(),V=S(M),P=a.P;
  /* the hands-only zone: no gun within 25 m of anybody in the family */
  const near=famDist(M,P.pos.x,P.pos.z)<K.bubble;const off=near||!!V.carry||(V.couch&&V.couch.held)||(V.ph==='piano'&&V.piano&&V.piano.on);
  if(off!==V.noGun){V.noGun=off;if(off){M.noGuns=near&&!V.carry?"Not with the family right there. Hands only.":"Hands are full.";M.holster=true}else{M.noGuns=false;M.holster=false}}
  else if(off)M.noGuns=near&&!V.carry?"Not with the family right there. Hands only.":"Hands are full.";
  /* carrying: walk only (cap the step the player took this frame) */
  const lp=V.lastP;if(lp&&(V.carry||V.couch&&V.couch.held)){const dx=P.pos.x-lp.x,dz=P.pos.z-lp.z,l=Math.hypot(dx,dz),cap=K.carrySpd*dt;
    if(V.carry&&l>cap&&l<3){P.pos.x=lp.x+dx/l*cap;P.pos.z=lp.z+dz/l*cap;a.collide(P.pos,.35)}
    if(V.carry&&V.carry.kind==='fragile'){const sprint=a.keys.shift&&l>.01;if((sprint||P.pos.y>.25&&!P.onGround)&&V.t-(V.jostT||-9)>1.2){V.jostT=V.t;jostle(M)}}}
  if(V.couch&&V.couch.held)return;/* the couch drives the dad (couchTick) */
  if(V.ph==='piano'&&V.piano&&V.piano.on)return;/* so does the piano (pianoTick) */
  V.lastP={x:P.pos.x,z:P.pos.z};
  if(V.ph==='piano'||V.ph==='end')return;
  const c=V.carry;
  if(!c){/* take a box at the pallet (the FRAGILE one comes out at 25 %) */const ds=Math.hypot(P.pos.x-L_.stack.x,P.pos.z-L_.stack.z);
    if(V.pct<99){const fr=V.china==='truck'&&V.pct>=25;F.taps.push({x:L_.stack.x,z:L_.stack.z,r:2.3,txt:fr?"Take Grandma's china (FRAGILE)":'Take a box',fn:()=>takeBox(M,fr?'fragile':null)})}
    if(V.pct<99&&!V.couch&&!V.hostiles.some(h=>h.tm&&h.e.state==='idle'))F.target=F.target||(ds>3?{x:L_.stack.x,z:L_.stack.z,label:'Boxes'}:null)}
  else{const df=Math.hypot(P.pos.x-L_.foot.x,P.pos.z-L_.foot.z);F.target={x:L_.foot.x,z:L_.foot.z,label:c.kind==='fragile'?'Stoop · gently':'Stoop'};
    F.taps.push({x:L_.foot.x,z:L_.foot.z,r:2.4,txt:c.kind==='fragile'?'Hand the china up to Mrs. Adeyemi':'Set it on the stoop',fn:()=>dropBox(M)});
    F.objs.push([c.kind==='fragile'?"Grandma's china · walk, don't jump, don't run":'Carry it to the stoop',false])}}
function takeBox(M,kind){const a=A(),V=S(M);if(V.carry)return;const mesh=cardBox(kind==='fragile'?'fragile':pick(BOXK));a.wmCarry('box',mesh,null);mesh.position.set(0,.84,.38);
  V.carry={kind:kind||'box',mesh};if(kind==='fragile'){V.china='carry';const l=LN.china[0];say(M,l[0],l[1],true)}else if(Math.random()<.35||V.you===0)say(M,'you',V.you===0?"Okay. Lift with the legs. Lift with the... okay.":pick(LN.you_box));snd('lift')}
function dropBox(M){const a=A(),V=S(M),c=V.carry;if(!c)return;a.wmDrop();V.carry=null;
  if(c.kind==='fragile'){V.china=V.china==='broken'?'broken':'in';say(M,'Mrs. Adeyemi',V.china==='broken'?"...It's fine. The gravy boat was ugly anyway. (it was not)":"Every piece. You are a careful man. Grandma will pretend she didn't notice.",true);if(c.mesh.parent)c.mesh.parent.remove(c.mesh);V.pct=Math.min(99.4,V.pct+1);V.you++;return}
  deliver(M,'you',c.mesh,null)}
function jostle(M){const V=S(M);V.jost=(V.jost||0)+1;snd('clink');say(M,'you',LN.chinaHit[Math.min(2,V.jost-1)],true);if(V.jost>=3&&V.china!=='broken'){V.china='broken';A().feed("Grandma's china",'bad','one gravy boat')}}

/* ================= waves ================= */
function wavesTick(M,dt){const a=A(),V=S(M);if(V.ph==='piano'||V.ph==='last')return;
  const W=WAVES[V.waveI];V.waveT-=dt;
  if(V.spawnQ&&V.spawnQ.length){if(V.waveT<=0){const s=V.spawnQ.shift();spawnHostile(M,s.from,s.kind);V.waveT=K.waveGap*rand(.7,1.2)}return}
  if(!W)return;const active=V.hostiles.filter(h=>h.e.state==='idle').length;
  V.sinceWave=(V.sinceWave||0)+dt;
  if(V.pct>=W.at&&(active<=1||V.sinceWave>45)){V.waveI++;V.sinceWave=0;V.spawnQ=[];for(const[from,kinds]of W.g)for(const k of kinds)V.spawnQ.push({from,kind:k});V.waveT=0;
    /* who calls it: Grandma for the street, Rosa for the alley */const first=W.g[0][0];say(M,first==='W'?'rosa':'Grandma',pick(LN.calls[first]),true);
    music('tension',.45+V.waveI*.06);if(V.waveI===1)sayLater(M,4.5,[['you',"No guns near the family. Talk 'em down, or walk 'em out. (G = crew lift, T = crew cover)"]])}}
function spawnHostile(M,from,kind){const a=A(),V=S(M),sp=L_.spawns[from],q=a.wmSnap(sp.x+rand(-1.5,1.5),sp.z+rand(-1.5,1.5));const e=a.spawnEnemy(q.x,q.z,false);e.noLeash=true;e.mvFrom=from;
  const h={e,kind:kind==='N'?'P':kind,from,andre:kind==='N',tm:null,said:false};
  if(kind==='A'){/* armed: walks the director lane to the truck, fights whoever is at the corner */const L=V.lanes[from];e.lane=L?(V.waveI%2?L.flank:L.direct).slice(1):[{x:L_.stack.x,z:L_.stack.z}];}
  else{a.equip(e.dude,null);e.gun=null;e.hp=e.maxhp=55;tmStart(M,h,'walk')}
  if(h.andre){e.mvAndre=true;const tag=document.createElement('div');tag.className='tag';tag.textContent='ANDRE';const host=document.getElementById('tags');if(host)host.appendChild(tag);e.tag=tag}
  e.onCuff=()=>{if(h.andre)V.andre='cuffed';V.cuffed=(V.cuffed||0)+1;/* the game's zip-tie gives +4; SPEC3 says +2 here, and only the first six count (a moving day, not a trust farm) */a.addTrust(V.cuffed<=6?-2:-4)};
  V.hostiles.push(h);a.rebuildTargets();return h}
function postManned(M,from,e){const V=S(M),p=L_.posts[from];if(!p)return false;for(const id in V.crew){const c=V.crew[id];if(V.orders[id]!==from||c.a.down)continue;
    if(Math.hypot(c.a.pos.x-p.x,c.a.pos.z-p.z)<8&&(!e||Math.hypot(e.pos.x-p.x,e.pos.z-p.z)<34))return true}return false}
/* troublemakers: inside the bubble everybody's hands-only. Walk to the truck, make mischief (the movers stop), grab a box and run */
function tmStart(M,h,st){const a=A(),e=h.e;if(!h.tm){h.tm={kind:h.kind,st:'walk',t:0};e.mvTm=true;if(e.gun){a.equip(e.dude,null);e.gun=null}
    if(!h.andre&&!e.tag){const tag=document.createElement('div');tag.className='tag';tag.textContent=h.kind==='L'?'NOSY':'NOT HAPPY';const host=document.getElementById('tags');if(host)host.appendChild(tag);e.tag=tag}}
  const spot=mischiefSpot(M,h);h.tm.st='walk';h.tm.spot=spot;e.script={kind:'to',x:spot.x,z:spot.z,speed:h.kind==='L'?3.0:3.6,then:()=>{h.tm.st='mischief';h.tm.t=0;e.script={kind:'mv'}}}}
function mischiefSpot(M,h){const V=S(M),used=V.hostiles.filter(o=>o!==h&&o.tm&&o.tm.spot).map(o=>o.tm.spot);
  const spots=[{x:377.3,z:90.6,act:'ramp'},{x:379.0,z:86.0,act:'lean'},{x:374.9,z:92.2,act:'stack'},{x:378.9,z:89.6,act:'lean'},{x:376.4,z:93.4,act:'stand'}];
  return spots.find(s=>!used.includes(s))||spots[used.length%spots.length]}
function hostilesTick(M,dt,F){const a=A(),V=S(M),P=a.P;let worst=null;
  for(const h of V.hostiles){const e=h.e;
    if(h.gone)continue;
    if(e.state==='dead'){if(!h.downed){h.downed=true;if(h.andre)V.andre='down';if(h.box)lostBox(M,h,true)}continue}
    if(e.state==='cuffed'){if(h.andre&&V.andre!=='back')V.andre='cuffed';continue}
    if(e.state==='surrender'){if(h.box)dropFrom(M,h);if(!F.target)F.target={x:e.pos.x,z:e.pos.z,label:'Zip-tie'};continue}
    /* armed men who cross into the bubble put it away and come at the truck by hand */
    if(!h.tm&&inBubble(M,e.pos.x,e.pos.z,0)){h.kind=h.kind==='A'?'P':h.kind;tmStart(M,h,'walk');if(!h.said&&e.pos.distanceTo(P.pos)<35){h.said=true;say(M,'Hostile',pick(LN.hostile),true);if(V.crew.dave&&V.orders.dave==='lift'&&!V.said.dave){V.said.dave=1;sayLater(M,1.2,[['dave',LN.dave[0]]])}}}
    if(!h.tm){/* an armed man nobody is fighting walks on in (and holsters at the bubble); a manned corner keeps him busy */
      const busy=e.ai&&e.ai.mode==='combat'&&e.target;h.idleT=busy?0:(h.idleT||0)+dt;
      if(h.idleT>4.5&&!e.script&&!postManned(M,h.from,e)){e.script={kind:'to',x:L_.stack.x,z:L_.stack.z,speed:3.2,then:()=>{e.script={kind:'mv'}}};h.pushing=true}
      else if(h.pushing&&e.script&&postManned(M,h.from,e)){e.script=null;h.pushing=false;h.idleT=0;if(e.ai){e.ai.mode='combat';e.ai.sub='react';e.ai.react=V.t}}
      continue}
    const tm=h.tm;tm.t+=dt;
    if(h.andre&&!V.said.andre&&inBubble(M,e.pos.x,e.pos.z,6)){V.said.andre=1;sayLater(M,.2,LN.andreIn)}
    if(tm.st==='mischief'){const sp=tm.spot;e.pos.set(sp.x,0,sp.z);
      if(tm.kind==='P'&&tm.t>K.grabT*(tm.gary?1.6:1)&&!h.box){grabBox(M,h)}
      worst=worst||h}
    else if(tm.st==='run'){const d=Math.hypot(e.pos.x-L_.stack.x,e.pos.z-L_.stack.z);F.target={x:e.pos.x,z:e.pos.z,label:'Box thief'};
      if(d>K.loseD||tm.t>30)lostBox(M,h,false)}
    else if(tm.st==='leave'){if(tm.t>25||Math.hypot(e.pos.x-L_.stack.x,e.pos.z-L_.stack.z)>48)vanish(M,h)}
    else if(tm.st==='watch'){pose(e.dude,dt,{mode:'crouch'});e.dude.root.rotation.y=Math.atan2(L_.foot.x-e.pos.x,L_.foot.z-e.pos.z)}
    /* you: run into him (empty-handed) to tackle; hold E to talk */
    const d=Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z);
    if(e.state==='idle'&&tm.st!=='leave'&&tm.st!=='watch'){
      if(d<K.tackleD&&!V.carry&&!(V.couch&&V.couch.held)&&!(V.ph==='piano')){a.surrender(e);V.tackled++;say(M,'you',pick(LN.tackle),true);if(h.box)dropFrom(M,h);snd('tackle');continue}
      if(d<2.4&&!V.carry&&tm.st!=='run')F.holds.push({x:e.pos.x,z:e.pos.z,r:2.4,o:h,txt:h.andre?'Talk to Andre':'Talk it out',time:K.talkT,fn:()=>talk(M,h)})}}
  if(worst&&!F.target)F.target={x:worst.e.pos.x,z:worst.e.pos.z,label:worst.tm.kind==='L'?'Talk him down':'Tackle him'}}
function talk(M,h){const a=A(),V=S(M);say(M,'you',pick(LN.you_talk),true);
  if(h.tm.kind==='L'){sayLater(M,1.0,[['Hostile',pick(LN.talkL)]]);defuse(M,h,'you')}
  else{h.tm.talkedAt=(h.tm.talkedAt||0)+1;sayLater(M,1.0,[[h.andre?'Andre':'Hostile',h.andre?"Man, I'm not talking to you. ...Is Ms. Okafor watching?":pick(LN.talkP)]]);if(h.tm.talkedAt>=2&&!h.andre){defuse(M,h,'you')}}}
function defuse(M,h,by){const a=A(),V=S(M);if(h.tm.st==='leave')return;h.tm.st='leave';h.tm.t=0;V.talked++;a.addTrust(1);a.feed(by==='gary'?'Gary talked him out of it':'Talked down','trust','+1 trust');
  if(h.e.tag){h.e.tag.remove();h.e.tag=null}const sp=L_.spawns[h.from]||L_.spawns.N;h.e.script={kind:'to',x:sp.x,z:sp.z,speed:2.6,then:()=>vanish(M,h)}}
function grabBox(M,h){const a=A(),V=S(M),e=h.e;const b=cardBox(pick(BOXK));h.box=b;e.dude.root.add(b);b.position.set(0,.85,.36);h.tm.st='run';h.tm.t=0;say(M,'Hostile',pick(LN.grab),true);a.feed('A box is walking away','bad');
  V.pct=Math.max(0,V.pct-1);const sp=L_.spawns[h.from]||L_.spawns.N;e.script={kind:'to',x:sp.x,z:sp.z,speed:4.2,then:()=>{}}}
function dropFrom(M,h){const a=A(),V=S(M),b=h.box;if(!b)return;h.box=null;if(b.parent)b.parent.remove(b);const q=a.wmSnap(h.e.pos.x+.7,h.e.pos.z);b.position.set(q.x,0,q.z);a.wmAdd(b);
  const it={mesh:b,x:q.x,z:q.z};(V.loose||(V.loose=[])).push(it)}
function lostBox(M,h,quiet){const a=A(),V=S(M);if(h.box&&h.box.parent)h.box.parent.remove(h.box);h.box=null;V.lost++;V.calm=Math.max(0,V.calm-K.calmLost);if(!quiet){a.feed('Box lost','bad','calm −'+K.calmLost);say(M,'you',pick(LN.lost),true)}if(!quiet)vanish(M,h)}
function vanish(M,h){const a=A(),e=h.e;h.gone=true;e.script={kind:'incar'};e.state='dead';e.hp=0;if(e.tag){e.tag.remove();e.tag=null}if(e.dude.root.parent)e.dude.root.parent.remove(e.dude.root);const k=a.enemies.indexOf(e);if(k>=0)a.enemies.splice(k,1);a.rebuildTargets()}
/* the family's calm: trouble at the truck and gunfire nearby wear it down; it comes back when the street is quiet */
function calmTick(M,dt){const a=A(),V=S(M);if(V.ph==='end'||V.ph==='last')return;
  const atTruck=V.hostiles.filter(h=>h.tm&&h.e.state==='idle'&&(h.tm.st==='mischief'||h.tm.st==='run')).length;
  const hit=(V.calmHit||0);V.calmHit=0;
  if(atTruck)V.calm-=K.calmTM*atTruck*dt;V.calm-=Math.min(hit,4*dt);
  if(!atTruck&&V.t-(V.shotT||-9)>3)V.calm=Math.min(K.calm0,V.calm+K.calmBack*dt);
  if(V.calm<35&&!V.said.calm35){V.said.calm35=1;say(M,'Mrs. Adeyemi',"Tunde, get the keys. If this keeps up, we are going to Maple.",true)}
  if(V.calm>60)V.said.calm35=0;
  if(V.calm<=0){V.calm=0;a.endMission(false,"The Adeyemis got back in the truck. Mrs. Adeyemi says Maple Heights has a nice cul-de-sac. Ms. Okafor isn't speaking to anyone.","They drove off.")}}

/* ================= the couch (two-person carry, drives like a slow car) ================= */
function startCouch(M,resume){const a=A(),V=S(M);V.ph='couch';if(!resume)a.CP.mark('couch');
  const T=T3(),c=couchModel();c.traverse(m=>{if(m.isMesh)m.castShadow=true});a.wmAdd(c);
  const u=parts(V.truck);if(u&&u.couch)u.couch.visible=false;
  V.couch={mesh:c,x:L_.truck.x+.0,z:L_.rampEnd+1.6,yaw:Math.PI,held:false,partner:null,t:0,lift:0,inT:0,sp:0,set:false};c.position.set(V.couch.x,0,V.couch.z);c.rotation.y=Math.PI/2;
  if(!resume)sayLater(M,.3,LN.couch);music('tension',.5)}
function couchEnds(C){const fx=-Math.sin(C.yaw),fz=-Math.cos(C.yaw),h=1.62;return{front:{x:C.x+fx*h,z:C.z+fz*h},back:{x:C.x-fx*h,z:C.z-fz*h},fx,fz}}
function couchTick(M,dt,F){const a=A(),V=S(M),C=V.couch,P=a.P;if(!C)return;C.t+=dt;
  const E=couchEnds(C);
  /* your partner: the nearest crewman on Lift, else Mr. Adeyemi ("My back. My beautiful back.") */
  if(!C.partner){const lifters=Object.values(V.crew).filter(c=>V.orders[c.a.id]==='lift'&&!c.a.down);C.partner=lifters.length?{kind:'crew',c:lifters[0]}:{kind:'mrA'};
    if(C.partner.kind==='crew'){dropCrewBox(M,C.partner.c);C.partner.c.a.role={kind:'go',x:E.front.x,z:E.front.z,r:.5,fire:false}}}
  const pd=C.partner.kind==='crew'?C.partner.c.a:null;
  if(pd&&(V.orders[pd.id]!=='lift'||pd.down)){C.partner=null;if(C.held)setCouchDown(M,'partner');return}
  const pPos=pd?pd.pos:V.mrA.d.root.position;
  if(!C.held){F.objs.push(['The couch: grab your end, two people carry it',false]);F.target={x:E.back.x,z:E.back.z,label:'Couch'};
    if(!pd){const r=V.mrA.d.root;r.position.x+=(E.front.x-r.position.x)*Math.min(1,dt*2);r.position.z+=(E.front.z-r.position.z)*Math.min(1,dt*2);r.position.y=0}
    else{if(!pd.role||pd.role.kind!=='go')pd.role={kind:'go',x:E.front.x,z:E.front.z,r:.5,fire:false};pd.role.x=E.front.x;pd.role.z=E.front.z}
    const pReady=Math.hypot(pPos.x-E.front.x,pPos.z-E.front.z)<1.0;
    if(Math.hypot(P.pos.x-E.back.x,P.pos.z-E.back.z)<2.0&&!V.carry)F.holds.push({x:E.back.x,z:E.back.z,r:2.0,o:C,txt:pReady?'Lift your end (together)':'Wait for '+(pd?pd.name.replace(/^Coach /,''):'Mr. Adeyemi'),time:pReady?.8:99,fn:()=>{C.held=true;C.lift=0;say(M,pd?pd.id:'Mr. Adeyemi',pick(LN.couchGo),true);snd('lift')}});
    if(!V.said.couchHelp&&C.t>2){V.said.couchHelp=1;say(M,'you',Object.values(V.crew).some(c=>V.orders[c.a.id]==='lift')?"Okay. Grab the other end.":"Nobody's lifting. Mr. Adeyemi, you're on the couch. (G puts the crew on Lift)",true)}
    return}
  /* held: your walk input pushes the couch along its length and turns it (a slow car) */
  C.lift=Math.min(1,C.lift+dt*3);const lp=V.lastP||{x:P.pos.x,z:P.pos.z};const ix=P.pos.x-lp.x,iz=P.pos.z-lp.z;
  const fwd=(ix*E.fx+iz*E.fz)/Math.max(dt,1e-3),lat=(ix*-E.fz+iz*E.fx)/Math.max(dt,1e-3);
  const want=Math.max(-1,Math.min(1,fwd/4))*K.couchSpd*(pd?1:.7);C.sp+=(want-C.sp)*Math.min(1,dt*3);
  C.yaw-=Math.max(-1,Math.min(1,lat/4))*K.couchTurn*dt*(Math.abs(C.sp)>.1?1:.6);
  let nx=C.x+E.fx*C.sp*dt,nz=C.z+E.fz*C.sp*dt;
  /* both ends against the world: a bump at speed is a scuff */
  const en=couchEnds({x:nx,z:nz,yaw:C.yaw});let hit=false;for(const p of[en.front,en.back]){const q={x:p.x,z:p.z,y:0};const P0={x:p.x,z:p.z};a.collide(q,.32);if(Math.hypot(q.x-P0.x,q.z-P0.z)>.01){hit=true}}
  if(hit){if(Math.abs(C.sp)>K.scuffSpd&&C.t-(C.scuffT||-9)>1.2){C.scuffT=C.t;V.scuffs++;snd('scuff');say(M,'Mrs. Adeyemi',pick(LN.scuff),true);a.feed('Scuff','bad',V.scuffs+(V.scuffs>1?' scuffs':' scuff'))}C.sp=0}
  else{C.x=nx;C.z=nz}
  const e2=couchEnds(C);P.pos.set(e2.back.x,0,e2.back.z);V.lastP={x:P.pos.x,z:P.pos.z};
  if(pd){pd.pos.set(e2.front.x,0,e2.front.z);if(!pd.role||pd.role.kind!=='go')pd.role={kind:'go',x:0,z:0,r:.5,fire:false};pd.role.x=e2.front.x;pd.role.z=e2.front.z;pd.yaw=Math.atan2(-E.fx,-E.fz);pd.dude.root.position.set(e2.front.x,0,e2.front.z);pd.dude.root.rotation.y=pd.yaw}else{const r=V.mrA.d.root;r.position.set(e2.front.x,0,e2.front.z);r.rotation.y=Math.atan2(-E.fx,-E.fz)}
  C.mesh.position.set(C.x,.08+C.lift*.42,C.z);C.mesh.rotation.y=C.yaw+Math.PI/2;
  /* into the house: at the foot of the stoop, lined up with the steps (any angle within ~35 degrees), hold E to tilt it up */
  const dd=Math.hypot(C.x-L_.couchDrop.x,C.z-L_.couchDrop.z),al=Math.abs(wrap(C.yaw-0));
  F.objs.push(['Walk the couch to the stoop · W/S push, A/D turn · release E to set it down',false]);F.target={x:L_.couchDrop.x,z:L_.couchDrop.z,label:'Stoop'};
  F.meters.push({id:'couch',label:'Couch',v:Math.max(0,3-V.scuffs),max:3,style:'pips',sub:V.scuffs?V.scuffs+' scuff'+(V.scuffs>1?'s':''):'not a scuff'});
  if(dd<1.6){if(al<.6||Math.abs(al-Math.PI)<.6){F.holds.push({x:P.pos.x,z:P.pos.z,r:3,o:C,txt:'Tilt it up the stoop',time:1.4,fn:()=>couchIn(M)})}else F.objs.push(['Line it up with the steps',false,'warn'])}
  /* let go of E for half a second: set it down where you are */
  C.relT=a.keys.e?0:(C.relT||0)+dt;if(C.relT>.5)setCouchDown(M,'drop')}
function setCouchDown(M,why){const a=A(),V=S(M),C=V.couch;if(!C)return;C.held=false;C.lift=0;C.sp=0;C.mesh.position.y=0;
  /* the couch on the street is cover: a box collider */const E=couchEnds(C);const x0=Math.min(E.front.x,E.back.x)-.45,x1=Math.max(E.front.x,E.back.x)+.45,z0=Math.min(E.front.z,E.back.z)-.45,z1=Math.max(E.front.z,E.back.z)+.45;
  if(C.col){C.col.x0=x0;C.col.x1=x1;C.col.z0=z0;C.col.z1=z1}else C.col=a.wmCol({x0,x1,z0,z1,h:.95});
  if(why==='drop')say(M,'you',"Setting it down. It's cover now. Very comfortable cover.",true)}
function couchIn(M){const a=A(),V=S(M),C=V.couch;if(!C)return;say(M,'you',"Tilt... tilt... TILT—",true);sayLater(M,1.3,[['Mrs. Adeyemi',V.scuffs?"It's in! It's... it has character now.":"It's in! Not a scratch!"]]);
  if(C.mesh.parent)C.mesh.parent.remove(C.mesh);if(C.col){C.col.x0=C.col.x1=C.col.z0=C.col.z1=-1e4}
  if(C.partner&&C.partner.kind==='crew'){const c=C.partner.c;setRole(M,c.a.id,'lift')}V.couch=null;V.couchDone=true;V.ph='move';V.pct=Math.min(99,V.pct+K.couchPct);snd('cheer');music('tension',.5)}
function couchGone(M){const V=S(M),u=V.truck&&parts(V.truck);if(u&&u.couch)u.couch.visible=false}

/* ================= the piano (a whole event) ================= */
function startPiano(M,resume){const a=A(),V=S(M);V.ph='piano';if(!resume)a.CP.mark('piano');if(V.carry){const c=V.carry;a.wmDrop();V.carry=null;deliver(M,'you',c.mesh,null)}
  const p=pianoModel();a.wmAdd(p);const u=parts(V.truck);if(u&&u.piano)u.piano.visible=false;
  /* the route: down the ramp, the kerb (STEP), the sidewalk, the stoop (two heaves) */
  const route=[{x:L_.truck.x,z:L_.rampEnd+.6,y:0},{x:376.6,z:92.6,y:0,step:'kerb'},{x:375.2,z:97.9,y:0},{x:373,z:98.1,y:0,step:'stoop1'},{x:373,z:96.3,y:.51,step:'stoop2'},{x:373,z:94.9,y:1.02},{x:373,z:94.0,y:1.05}];
  V.piano={mesh:p,route,k:0,s:0,x:route[0].x,z:route[0].z,y:route[0].y,on:false,wait:null,callT:0,bonk:0,clean:0,heave:0,t:0,roll:resume?1:0};
  /* the street crew stop to watch. Nobody fights during the piano. */
  for(const h of V.hostiles){const e=h.e;if(e.state!=='idle'||h.gone)continue;if(h.box)lostBox(M,h,true);h.tm=h.tm||{kind:h.kind,st:'watch',t:0};h.tm.st='watch';e.mvTm=true;if(e.gun){a.equip(e.dude,null);e.gun=null}e.script={kind:'mv'}}
  V.spawnQ=[];
  if(!resume)sayLater(M,.2,LN.piano);if(V.hostiles.some(h=>h.tm&&h.tm.st==='watch'))sayLater(M,4.5,[['Hostile',pick(LN.watch)]]);
  /* everybody on it: crew on Lift come over, the movers too */
  for(const id in V.crew){const c=V.crew[id];dropCrewBox(M,c);if(V.orders[id]==='lift')c.a.role={kind:'go',x:route[0].x,z:route[0].z,r:.6,fire:false}}
  music('home',.3)}
function pianoHands(M){const V=S(M);const list=[];for(const id in V.crew){const c=V.crew[id];if(V.orders[id]==='lift'&&!c.a.down)list.push({kind:'crew',a:c.a})}for(const m of V.movers)list.push({kind:'mover',m});list.push({kind:'mover',m:V.mrA});return list}
function pianoTick(M,dt,F){const a=A(),V=S(M),Pn=V.piano,P=a.P;if(!Pn)return;Pn.t+=dt;
  const hands=pianoHands(M),crewN=hands.filter(h=>h.kind==='crew').length;
  const seg=Pn.route[Pn.k+1];const cur=Pn.route[Pn.k];
  /* place the helpers around the piano: crew at the sides, movers behind */
  const fx=seg?Math.sign(seg.x-cur.x)*0+(seg.x-cur.x):0,fz=seg?(seg.z-cur.z):1,fl=Math.hypot(fx,fz)||1,ux=fx/fl,uz=fz/fl;
  const slots=[[.95,.0],[-.95,0],[.95,-.75],[-.95,-.75],[0,-1.0],[.55,-1.25],[-.55,-1.25]];
  hands.forEach((h,i)=>{const s=slots[i%slots.length];const x=Pn.x+(-uz)*s[0]+ux*s[1],z=Pn.z+ux*s[0]+uz*s[1];
    if(h.kind==='crew'){h.a.role={kind:'go',x,z,r:.4,fire:false};if(Pn.on&&Math.hypot(h.a.pos.x-x,h.a.pos.z-z)<3){h.a.pos.set(x,0,z)}}
    else{const r=h.m.d.root;r.visible=true;if(h.m.box){if(h.m.box.parent)h.m.box.parent.remove(h.m.box);h.m.box=null}h.m.st='toStack';h.m.path=null;const dx=x-r.position.x,dz=z-r.position.z,l=Math.hypot(dx,dz);
      if(l>.05){const s_=Math.min(l,(Pn.on?3.5:2.6)*dt);r.position.x+=dx/l*s_;r.position.z+=dz/l*s_;h.m.moving=l>.15?2:0}r.position.y=Math.max(Pn.y*.9,yAt(r.position.x,r.position.z));face(h.m.d,Pn.x,Pn.z,dt,6);h.m.push=Pn.on}});
  /* you: grab the back */
  const back={x:Pn.x-ux*1.0,z:Pn.z-uz*1.0};
  if(Pn.roll<1){/* down the ramp: Mr. Adeyemi and Uncle Tunde walk it down, one big BONG at the bottom */Pn.roll=Math.min(1,Pn.roll+dt/3.2);const k=Pn.roll,e2=k*k*(3-2*k);
    Pn.x=L_.truck.x;Pn.z=L_.rear-.6+(L_.rampEnd+.6-(L_.rear-.6))*e2;Pn.y=truckY(Pn.x,Pn.z);if(Pn.roll>=1){chord(false,true);say(M,'Mr. Adeyemi',"She's down! ...Okay. Now the hard part.",true)}
    F.objs.push(['The piano is coming down the ramp',false]);placePiano(M,true);return}
  if(!Pn.on){F.objs.push(['Everybody on the piano · take the back',false]);F.target={x:back.x,z:back.z,label:'Piano'};
    if(Math.hypot(P.pos.x-back.x,P.pos.z-back.z)<2.2)F.taps.push({x:back.x,z:back.z,r:2.2,txt:'Grab the piano',fn:()=>{Pn.on=true;say(M,'Grandma',"Good. Now. Slowly. I will tell you when.",true)}});
    placePiano(M);return}
  /* on: your walk input pushes it along the route; Grandma calls the steps: stop, then heave (hold E) */
  const lp=V.lastP||{x:P.pos.x,z:P.pos.z};const ix=P.pos.x-lp.x,iz=P.pos.z-lp.z;const push=(ix*ux+iz*uz)/Math.max(dt,1e-3);
  const spd=K.pianoSpd*(1+K.pianoPer*Math.max(0,crewN-1))*(crewN?1:.75);
  F.meters.push({id:'piano',label:'Piano',v:Math.max(0,3-Pn.bonk),max:3,style:'pips',sub:Pn.bonk?Pn.bonk+' bonk'+(Pn.bonk>1?'s':''):'in tune'});
  if(!seg){pianoIn(M);return}
  const dS=Math.hypot(seg.x-cur.x,seg.z-cur.z);
  if(Pn.wait){/* at a step: STOP. Moving now is a bonk; standing still lets Grandma count; then heave */Pn.wait.t+=dt;
    F.objs.push([Pn.wait.ready?'HEAVE · hold E':'Grandma: "STEP!" · stop pushing',false,'warn']);
    if(push>1.2&&!Pn.wait.ready&&Pn.wait.t>.25&&Pn.t-(Pn.bonkT||-9)>1){Pn.bonkT=Pn.t;Pn.bonk++;V.pianoBonks=Pn.bonk;chord(true);say(M,pick(['dave','rick','Grandma']),pick(LN.bonk),true);Pn.wait.t=0}
    if(!Pn.wait.ready&&Pn.wait.t>1.1){Pn.wait.ready=true;say(M,'Grandma',pick(LN.up),true)}
    if(Pn.wait.ready)F.holds.push({x:P.pos.x,z:P.pos.z,r:4,o:Pn.wait,txt:'Heave',time:1.0,fn:()=>{Pn.wait=null;Pn.s=0;Pn.k++;Pn.y=seg.y;arp();Pn.clean++}});
    P.pos.set(lp.x,0,lp.z);V.lastP={x:lp.x,z:lp.z};placePiano(M);return}
  if(push>.3)Pn.s+=Math.min(push,spd)*dt;
  const f=Math.min(1,Pn.s/dS);Pn.x=cur.x+(seg.x-cur.x)*f;Pn.z=cur.z+(seg.z-cur.z)*f;Pn.y=seg.step?cur.y:cur.y+(seg.y-cur.y)*f;
  if(f>=1){if(seg.step&&seg.step!=='done'){Pn.wait={t:0,ready:false};say(M,'Grandma',pick(LN.step),true);seg.step='done'}else{Pn.k++;Pn.s=0}}
  /* you stay at the back of it */
  const b2={x:Pn.x-ux*1.0,z:Pn.z-uz*1.0};P.pos.set(b2.x,0,b2.z);V.lastP={x:b2.x,z:b2.z};P.yaw=Math.atan2(-ux,-uz);
  F.objs.push(['Push the piano to the stoop · Grandma calls the steps',false]);F.target={x:L_.foot.x,z:L_.foot.z,label:'Stoop'};
  placePiano(M)}
function placePiano(M,ramp){const V=S(M),Pn=V.piano;if(!Pn)return;const seg=Pn.route[Pn.k+1]||Pn.route[Pn.k],cur=Pn.route[Pn.k];const yaw=ramp?0:Math.atan2(seg.x-cur.x,seg.z-cur.z);
  Pn.mesh.position.set(Pn.x,Pn.y+(Pn.wait&&!Pn.wait.ready?Math.sin(Pn.t*30)*.004:0),Pn.z);Pn.mesh.rotation.y=yaw+Math.PI/2;Pn.mesh.rotation.z=Pn.wait&&Pn.wait.ready?.04:0}
function pianoIn(M){const a=A(),V=S(M),Pn=V.piano;if(Pn.mesh.parent)Pn.mesh.parent.remove(Pn.mesh);V.piano=null;V.pianoDone=true;V.pct=Math.min(99,V.pct+K.pianoPct);
  say(M,'Grandma',Pn.bonk?"It's in. It's out of tune. It was always out of tune.":"It's in. Not one bonk. I will play at your funerals.",true);
  for(const m of V.movers){m.push=false;m.st='toStack';m.path=null}
  for(const id in V.crew)if(V.orders[id]==='lift')setRole(M,id,'lift');else setRole(M,id,V.orders[id]);
  /* the watchers leave */let any=false;for(const h of V.hostiles)if(h.tm&&h.tm.st==='watch'&&h.e.state==='idle'){any=true;h.tm.st='leave';h.tm.t=0;const sp=L_.spawns[h.from]||L_.spawns.N;h.e.script={kind:'to',x:sp.x,z:sp.z,speed:2.4,then:()=>vanish(M,h)};if(h.e.tag){h.e.tag.remove();h.e.tag=null}}
  if(any)sayLater(M,2.4,[['Hostile',pick(LN.watchEnd)]]);
  V.ph='move';V.waveI=WAVES.length;chord(false,true);music('hub',.3)}
function pianoGone(M){const V=S(M),u=V.truck&&parts(V.truck);if(u&&u.piano)u.piano.visible=false;V.waveI=Math.max(V.waveI,WAVES.length)}

/* ================= the last box, the lights ================= */
function startLast(M){const a=A(),V=S(M);V.lastBox=true;V.ph='last';V.endT=0;if(V.carry){const c=V.carry;a.wmDrop();V.carry=null;if(c.mesh.parent)c.mesh.parent.remove(c.mesh);V.you++}
  for(const h of V.hostiles)if(h.e.state==='idle'&&!h.gone){if(h.tm&&h.tm.st==='leave')continue;h.tm=h.tm||{kind:h.kind,st:'leave',t:0};h.tm.st='leave';h.tm.t=0;h.e.mvTm=true;if(h.e.gun){a.equip(h.e.dude,null);h.e.gun=null}
    const sp=L_.spawns[h.from]||L_.spawns.N;h.e.script={kind:'to',x:sp.x,z:sp.z,speed:3,then:()=>vanish(M,h)}}
  const b=cardBox('pillows',1.1);b.position.set(L_.stack.x,0,L_.stack.z+.9);a.wmAdd(b);V.last={box:b,st:'wait',t:0};
  if(V.andre==='cuffed'){/* Andre comes back. Zip-ties off: Rosa's idea */const d=actor('thug_hoodie');d.root.position.set(378.4,0,66);V.last.andre={d,path:[{x:378.4,z:80},{x:376.4,z:91.4}],pi:0,moving:0};V.last.st='andre'}
  else say(M,'Mr. Adeyemi',"Last one. 'PILLOWS'. Who wants the honour?",true)}
function endTick(M,dt,F){const a=A(),V=S(M),Ls=V.last,P=a.P;if(!Ls)return;Ls.t+=dt;V.endT+=dt;
  if(Ls.st==='andre'){const an=Ls.andre;if(stepAlong(an,dt,1.8)){Ls.st='andreTake';Ls.t=0;sayLater(M,0,LN.andreBack)}posePerson(an,dt);return}
  if(Ls.st==='andreTake'){const an=Ls.andre;if(Ls.t>2.6&&!an.box){an.box=Ls.box;an.path=L_.path.slice(1);an.pi=0;Ls.st='andreCarry'}posePerson(an,dt);return}
  if(Ls.st==='andreCarry'){const an=Ls.andre,r=an.d.root;Ls.box.position.set(r.position.x+Math.sin(r.rotation.y)*.34,r.position.y+.8,r.position.z+Math.cos(r.rotation.y)*.34);Ls.box.rotation.y=r.rotation.y;
    if(stepAlong(an,dt,1.7)){if(Ls.box.parent)Ls.box.parent.remove(Ls.box);an.d.root.visible=false;V.andre='back';a.addTrust(5);a.feed('Andre carried the last box','trust','+5 trust');lightsOn(M)}posePerson(an,dt);return}
  if(Ls.st==='wait'){const ds=Math.hypot(P.pos.x-Ls.box.position.x,P.pos.z-Ls.box.position.z);F.objs.push(['The last box',false]);F.target={x:Ls.box.position.x,z:Ls.box.position.z,label:'Last box'};
    if(!V.carry&&ds<2.2)F.taps.push({x:Ls.box.position.x,z:Ls.box.position.z,r:2.2,txt:'Take the last box',fn:()=>{a.wmCarry('box',Ls.box,null);Ls.box.position.set(0,.84,.38);V.carry={kind:'last',mesh:Ls.box};Ls.st='carry'}});
    if(Ls.t>25){/* nobody? the kid does it */Ls.st='kid';Ls.t=0;say(M,'Kemi',"I'll do it! It's PILLOWS!",true)}return}
  if(Ls.st==='carry'){F.target={x:L_.foot.x,z:L_.foot.z,label:'Stoop'};F.objs.push(['Carry the last box to the stoop',false]);const lp=V.lastP;if(lp){const dx=P.pos.x-lp.x,dz=P.pos.z-lp.z,l=Math.hypot(dx,dz),cap=K.carrySpd*dt;if(l>cap&&l<3){P.pos.x=lp.x+dx/l*cap;P.pos.z=lp.z+dz/l*cap;a.collide(P.pos,.35)}}V.lastP={x:P.pos.x,z:P.pos.z};
    F.taps.push({x:L_.foot.x,z:L_.foot.z,r:2.4,txt:'Set the last box on the stoop',fn:()=>{a.wmDrop();V.carry=null;V.you++;addStoop(M,Ls.box);lightsOn(M)}});return}
  if(Ls.st==='kid'){const k=V.kid;Ls.box.visible=false;if(Ls.t>2.5)lightsOn(M);return}
  if(Ls.st==='lights'){/* fade the windows in, the family on the stoop, the block's trust visibly up */const k=Math.min(1,Ls.t/2.5);for(const m of parts(V.windows).mats||[]){m.opacity=k;m.emissiveIntensity=.9*k}
    familyPorch(M,dt);
    if(Ls.t>3.5&&!M.exitOpen){M.exitOpen=true;a.radio('you',"That's everybody moved in. Back to the van, crew.",false)}
    F.objs.push(['The Adeyemis are home',true])}}
function posePerson(an,dt){pose(an.d,dt,{moving:!!an.moving,speed:1});an.moving=0}
function lightsOn(M){const a=A(),V=S(M),Ls=V.last;if(Ls.st==='lights')return;Ls.st='lights';Ls.t=0;V.ph='end';V.pct=100;
  const O=OW(),H=window.__ht;const tr0=O&&O.blockTrust?Math.round(O.blockTrust(L_.door.x,L_.door.z)):null;
  a.addTrust(8);try{if(O&&O.dress&&H&&H.prog)O.dress(H.prog.trustR)}catch(_){}
  const tr1=O&&O.blockTrust?Math.round(O.blockTrust(L_.door.x,L_.door.z)):null;
  if(tr0!=null)a.feed('3rd & Mill · block trust','trust',tr0+' → '+tr1);
  a.banner('MOVED IN','The Adeyemis · 3rd St at Mill St',2.6);sayLater(M,.6,LN.end);snd('cheer');music('victory');
  for(const id in V.crew){const c=V.crew[id];dropCrewBox(M,c);c.a.role={kind:'go',x:L_.foot.x+3+(['rick','dave','rosa','gary'].indexOf(id))*1.1,z:L_.foot.z+2.2,r:.6,fire:false,face:{x:L_.foot.x,z:L_.foot.z}}}
  for(const m of V.movers){if(m.box&&m.box.parent)m.box.parent.remove(m.box);m.box=null}}
function familyPorch(M,dt){const V=S(M);const spots=[[V.mrA,372.4,95.0],[V.mrsA,373.6,95.0],[V.kid,373.0,95.6],[V.granny,374.6,97.6]];
  for(const[p,x,z]of spots){if(!p)continue;const r=p.d.root;r.visible=true;const dx=x-r.position.x,dz=z-r.position.z,l=Math.hypot(dx,dz);if(l>.05){const s=Math.min(l,2*dt);r.position.x+=dx/l*s;r.position.z+=dz/l*s;p.moving=l>.1?1.5:0}r.position.y=yAt(r.position.x,r.position.z);if(l<.3)face(p.d,r.position.x,L_.foot.z+6,dt,4)}
  const others=V.movers.filter(m=>m!==V.mrsA);others.forEach((m,i)=>{const r=m.d.root;r.visible=true;const x=377.5+i*.9,z=95.6;const dx=x-r.position.x,dz=z-r.position.z,l=Math.hypot(dx,dz);if(l>.05){const s=Math.min(l,2*dt);r.position.x+=dx/l*s;r.position.z+=dz/l*s;m.moving=l>.1?1.5:0}r.position.y=yAt(r.position.x,r.position.z)})}

/* ================= HUD ================= */
function hud(M,F){const a=A(),V=S(M);const frozen=V.frozen&&V.ph!=='piano';
  F.meters.unshift({id:'unload',label:'Unloaded',v:Math.floor(V.pct),max:100,style:'bar',marker:V.couchDone?(V.pianoDone?null:K.pianoAt):K.couchAt,sub:frozen?'movers stopped':Math.floor(V.pct)+'%'});
  F.meters.splice(1,0,{id:'calm',label:'Family calm',v:Math.round(V.calm),max:100,style:'bar',warn:35,warnBelow:true,icon:'heart'});
  F.widgets.push({id:'you',kind:'score',label:'Your boxes',v:V.you,max:K.silver});
  if(!M.retried&&M.elapsed<K.gold&&V.ph!=='end')F.widgets.push({id:'gold',kind:'timer',label:'Gold',v:Math.max(0,K.gold-M.elapsed),max:K.gold,hot:K.gold-M.elapsed<30});
  if(V.ph==='move'){F.objs.unshift([frozen?'Trouble at the truck · the movers stopped':'Unload the truck · '+Math.floor(V.pct)+'%',false,frozen?'warn':'']);
    if(V.noGun&&!V.carry)F.objs.push(['Family nearby: hands only · the corners are for the crew',false])}
  if(V.ph==='move'||V.ph==='couch')F.objs.push(['Crew: '+CREW.filter(id=>V.crew[id]).map(id=>(V.crew[id].a.name||id).replace(/^Coach /,'')+' '+(V.orders[id]==='lift'?'lifting':SHORT[V.orders[id]].toLowerCase())).join(' · '),false]);
  panel(M)}

/* ================= poses after the mixer: hands on boxes, couch, piano; ducking ================= */
function posesAfter(M,dt){const a=A(),V=S(M);if(!V)return;
  for(const p of V.family){if(!p.d||!p.d.root.visible)continue;if(p.box)armsTo(p.d,CARRY.box,1);else if(p.push)armsTo(p.d,CARRY.push,1)}
  for(const id in V.crew){const c=V.crew[id];if(c.box&&c.a.dude)armsTo(c.a.dude,CARRY.box,1);else if(V.couch&&V.couch.held&&V.couch.partner&&V.couch.partner.c===c)armsTo(c.a.dude,CARRY.low,1);
    else if(V.ph==='piano'&&V.piano&&V.piano.on&&V.orders[id]==='lift')armsTo(c.a.dude,CARRY.push,1)}
  const P=a.P;if(P.dude&&P.dude.rb&&!P.fp){if(V.carry)armsTo(P.dude,CARRY.box,1);else if(V.couch&&V.couch.held)armsTo(P.dude,CARRY.low,1);else if(V.ph==='piano'&&V.piano&&V.piano.on)armsTo(P.dude,CARRY.push,1)}
  if(V.couch&&V.couch.held&&V.couch.partner&&V.couch.partner.kind==='mrA')armsTo(V.mrA.d,CARRY.low,1);
  const ls=V.last&&V.last.andre;if(ls&&ls.box)armsTo(ls.d,CARRY.box,1)}
/* family poses before the mixer (called from upd via the movers' ticks): walking, crouching when there's shooting */
function famPoses(M,dt){const V=S(M);for(const p of V.family){if(!p.d)continue;pose(p.d,dt,{moving:!!p.moving,speed:p.moving?Math.max(.6,p.moving/1.6):1,mode:p.duck?'crouch':'stand'});p.moving=0}}

/* ================= sound and music (HT.Audio.tone on the sfx bus) ================= */
function tone(f,d,o){const Au=AU();if(!Au||!Au.tone)return;try{Au.tone(Object.assign({f,d,gain:.08,type:'triangle'},o||{}))}catch(_){}}
function snd(k){switch(k){
  case'lift':tone(180,.08,{to:240,type:'sine',gain:.06});break;
  case'drop':tone(120,.09,{to:80,type:'sine',gain:.09});tone(320,.04,{at:.03,type:'square',gain:.02});break;
  case'radio':tone(1400,.03,{type:'square',gain:.025,bus:'ui'});tone(1100,.04,{at:.04,type:'square',gain:.02,bus:'ui'});break;
  case'tackle':tone(90,.14,{to:60,type:'sine',gain:.12});break;
  case'scuff':tone(220,.12,{to:140,type:'sawtooth',gain:.04});break;
  case'clink':tone(2400,.06,{type:'sine',gain:.05});tone(3100,.05,{at:.05,type:'sine',gain:.04});break;
  case'cheer':[523,659,784].forEach((f,i)=>tone(f,.18,{at:i*.09,gain:.05}));break}}
/* the piano: a bonk is a cluster, a clean heave an arpeggio, the end a big chord */
function chord(bad,big){const f=bad?[196,207.7,277.2,293.7]:big?[130.8,196,261.6,329.6,392,523.3]:[261.6,329.6,392];f.forEach((x,i)=>tone(x,bad?.9:big?1.6:.7,{at:big?i*.04:0,gain:bad?.05:.04,type:'triangle'}))}
function arp(){[261.6,329.6,392,523.3].forEach((x,i)=>tone(x,.35,{at:i*.07,gain:.045}))}
function music(st,i){const Au=AU();if(!Au)return;try{if(Au.music)Au.music(st,{intensity:i||.3});if(Au.setIntensity&&i!=null)Au.setIntensity(i)}catch(_){}}

/* ================= cleanup (end, retry, restart, leaving): DOM, resources, roles ================= */
let LIVE=null;
function uiOff(){const a=A();if(!LIVE)return;const V=LIVE;LIVE=null;try{if(V.panelEl){if(V.panelOn)V.panelEl.removeEventListener('pointerdown',V.panelOn);try{a.overlay('moving-crew',null)}catch(_){}V.panelEl=null;V.panelOn=null}}catch(_){}
  try{for(const id in V.crew){const al=V.crew[id].a;if(al)al.role=null}}catch(_){}
  try{for(const h of V.hostiles||[]){if(h.e&&h.e.tag){h.e.tag.remove();h.e.tag=null}}}catch(_){}}
function cleanup(){uiOff();disposeRes()}
J.on('pose',dt=>{const a=A();if(!a)return;const M=a.M,V=S(M);const mine=!!(M&&M.def&&M.def.id==='moving'&&V);
  if(mine&&M.state==='go'&&a.mode==='mission'){LIVE=V;famPoses(M,dt);return}
  if(LIVE)uiOff();/* the job ended (any way): the panel and the crew's orders go */
  if(RES&&!(mine&&a.mode==='mission'))disposeRes();/* the world props are gone with the level: free their GPU memory */
  porchFamily(dt)});

/* ================= free roam after the job: the Adeyemis on their stoop for the rest of the game (households: 'adeyemi') ================= */
let PORCH=null;
function porchFamily(dt){const a=A();if(!a)return;let s=null;try{s=a.SV&&a.SV()}catch(_){s=null}
  const want=a.mode==='hub'&&s&&s.world&&(s.world.households||[]).includes('adeyemi')&&a.L&&a.L.ow&&Math.hypot(a.P.pos.x-L_.door.x,a.P.pos.z-L_.door.z)<70;
  if(!want){if(PORCH){for(const p of PORCH.list)if(p.d.root.parent)p.d.root.parent.remove(p.d.root);if(PORCH.win&&PORCH.win.parent)PORCH.win.parent.remove(PORCH.win);disposeRes(PORCH.res);PORCH=null}return}
  if(PORCH&&PORCH.L!==a.L){disposeRes(PORCH.res);PORCH=null}
  if(!PORCH){const pp=PP();if(!pp)return;if(!CAST.slice(1,5).every(k=>pp.has(k))){if(!porchFamily.asked){porchFamily.asked=1;try{pp.preload(CAST)}catch(_){}}return}
    PORCH={L:a.L,list:[],t:0};/* the lights stay on (the piano in the window): built in a resource set of its own */{const keep=RES;RES=null;try{const w=windowsLit();for(const m of parts(w).mats||[]){m.opacity=1;m.emissiveIntensity=.75}a.L.group.add(w);PORCH.win=w}catch(_){}PORCH.res=RES;RES=keep}const spots=[['mrA',372.45,95.0,0],['mrsA',373.55,95.0,0],['kid',372.75,95.6,'sit'],['granny',373.4,95.3,'sit']];
    for(const[k,x,z,mode]of spots){let d=null;try{d=pp.make(CASTK[k])}catch(_){d=null}if(!d)continue;d.root.position.set(x,stoopY(x,z),z);d.root.rotation.y=0;a.L.group.add(d.root);PORCH.list.push({d,mode})}}
  PORCH.t+=dt;for(const p of PORCH.list){pose(p.d,dt,{mode:p.mode==='sit'?'sit':'stand'});if(p.mode!=='sit'){const dx=a.P.pos.x-p.d.root.position.x,dz=a.P.pos.z-p.d.root.position.z;if(Math.hypot(dx,dz)<14)face(p.d,a.P.pos.x,a.P.pos.z,dt,2)}}
  if(PORCH.t>9){PORCH.t=0;const p=PORCH.list[(Math.random()*PORCH.list.length)|0];if(p&&Math.hypot(a.P.pos.x-p.d.root.position.x,a.P.pos.z-p.d.root.position.z)<16)wave(p.d)}}

/* ================= the scripted player (dev/jobs-check.js and dev/jobs/moving.js) =================
   Human-ish: walks (4.3 m/s empty, carry speed loaded), carries boxes, keeps two crew on Lift and two on the corners,
   tackles or talks down anybody at the truck, zip-ties, does the couch and the piano by "walking" into them.
   o.fail: puts everybody on Lift and stands at the van watching: the street crew walks up to the truck and the family loses its nerve. */
function bot(a,t,o){const M=a.M,V=S(M),P=a.P;if(!M||M.state!=='go'||!V)return null;a.keys.e=false;a.useTap=false;
  const dt=1/30;const walk=(x,z,sp)=>{const dx=x-P.pos.x,dz=z-P.pos.z,l=Math.hypot(dx,dz);if(l<.15)return true;const s=Math.min(l,(sp||4.3)*dt);P.pos.x+=dx/l*s;P.pos.z+=dz/l*s;P.yaw=Math.atan2(-dx,-dz);a.collide(P.pos,.35);return l<.6};
  const B=V.bot||(V.bot={stuck:0,lx:P.pos.x,lz:P.pos.z,ordered:false,k:0});
  if(a.CV){if(M.exitOpen){return null}a.exitCar();return null}
  if(o.fail){if(!B.ordered&&t>30){B.ordered=true;a.keys.g=true}else a.keys.g=false;walk(L_.ring.x+2,L_.ring.z-8);return null}
  a.keys.g=false;a.keys.t=false;
  /* orders: Rick and Dave carry, Rosa and Gary hold the alley and the truck (chips via cycleOrder, like a tap) */
  if(!B.ordered&&t>45){B.ordered=true;cycleOrder(M,'rick');cycleOrder(M,'dave')}
  if(M.exitOpen){const c=M.car;if(walk(c.pos.x+2.2,c.pos.z))a.useTap=true;return null}
  /* stuck against something: hop sideways */
  if(Math.hypot(P.pos.x-B.lx,P.pos.z-B.lz)<.01&&!V.couch){B.stuck++;if(B.stuck>45){P.pos.x+=rand(-1,1);P.pos.z+=rand(-1,1);a.collide(P.pos,.35);B.stuck=0}}else B.stuck=0;B.lx=P.pos.x;B.lz=P.pos.z;
  const near=(x,z,r)=>Math.hypot(P.pos.x-x,P.pos.z-z)<(r||1.6);
  /* zip-tie anybody with their hands up */
  const sur=V.hostiles.find(h=>h.e.state==='surrender');if(sur&&!V.carry&&!(V.couch&&V.couch.held)){if(walk(sur.e.pos.x+.9,sur.e.pos.z))a.useTap=true;return null}
  /* the last box */
  if(V.ph==='last'&&V.last){const Ls=V.last;if(Ls.st==='wait'){if(walk(Ls.box.position.x+.6,Ls.box.position.z))a.useTap=true}else if(Ls.st==='carry'){if(walk(L_.foot.x+.5,L_.foot.z+.6,2.5))a.useTap=true}return null}
  /* the piano */
  if(V.ph==='piano'&&V.piano){const Pn=V.piano;if(Pn.roll<1){walk(L_.stack.x-1,L_.stack.z+2);return null}if(!Pn.on){const seg=Pn.route[1],cur=Pn.route[0],l=Math.hypot(seg.x-cur.x,seg.z-cur.z);const bx_=Pn.x-(seg.x-cur.x)/l,bz=Pn.z-(seg.z-cur.z)/l;if(walk(bx_,bz))a.useTap=true;return null}
    if(Pn.wait){if(Pn.wait.ready)a.keys.e=true;return null}/* stand still at the steps */
    const seg=Pn.route[Pn.k+1];if(seg){const cur=Pn.route[Pn.k],l=Math.hypot(seg.x-cur.x,seg.z-cur.z)||1;P.pos.x+=(seg.x-cur.x)/l*2.2*dt;P.pos.z+=(seg.z-cur.z)/l*2.2*dt}return null}
  /* the couch (set it down to deal with trouble at the truck, like a person would) */
  const trouble=V.hostiles.some(h=>h.tm&&h.e.state==='idle'&&(h.tm.st==='run'||h.tm.st==='mischief'&&(V.calm<80||h.tm.kind==='P'&&h.tm.t>4)));
  if(V.couch&&!trouble){const C=V.couch;const E=couchEnds(C);
    if(!C.held){walk(E.back.x,E.back.z);if(near(E.back.x,E.back.z,1.7))a.keys.e=true;return null}
    a.keys.e=true;const tg_=L_.couchDrop,dx=tg_.x-C.x,dz=tg_.z-C.z,dd=Math.hypot(dx,dz);
    let want=Math.atan2(-dx,-dz),sp=Math.abs(wrap(want-C.yaw))>.5?1.2:4.3;if(dd<1.4){want=Math.abs(wrap(C.yaw))<Math.PI/2?0:Math.PI;sp=0}
    const err=wrap(want-C.yaw);if(dd<1.4&&Math.abs(err)<.4)return null;/* lined up: hold E, it tilts in */
    let mx=E.fx*sp,mz=E.fz*sp;const lat=Math.max(-1,Math.min(1,-err*3));mx+=-E.fz*lat*4;mz+=E.fx*lat*4;
    P.pos.x+=mx*dt;P.pos.z+=mz*dt;return null}
  /* troublemakers at the truck: talk to lookers, tackle pushers */
  const tmh=V.hostiles.filter(h=>h.tm&&h.e.state==='idle'&&(h.tm.st==='mischief'||h.tm.st==='run'||(h.tm.st==='walk'&&inBubble(M,h.e.pos.x,h.e.pos.z,-8))));
  if(tmh.length&&!V.carry){const h=tmh.sort((p,q)=>Math.hypot(p.e.pos.x-P.pos.x,p.e.pos.z-P.pos.z)-Math.hypot(q.e.pos.x-P.pos.x,q.e.pos.z-P.pos.z))[0];
    if(h.tm.kind==='L'){const dx=P.pos.x-h.e.pos.x,dz=P.pos.z-h.e.pos.z,l=Math.hypot(dx,dz)||1;if(l<2.2){a.keys.e=true;return null}walk(h.e.pos.x+dx/l*1.8,h.e.pos.z+dz/l*1.8,4.3);return null}
    walk(h.e.pos.x,h.e.pos.z,h.tm.st==='run'?6.2:4.6);return null}
  /* loose boxes (dropped by a thief): pick one up like any other */
  if(V.loose&&V.loose.length&&!V.carry){const it=V.loose[0];if(walk(it.x+.4,it.z)){a.wmCarry('box',it.mesh,null);it.mesh.position.set(0,.84,.38);V.carry={kind:'box',mesh:it.mesh};V.loose.shift()}return null}
  /* carrying: to the stoop */
  if(V.carry){if(walk(L_.foot.x+.6,L_.foot.z+.5,K.carrySpd))a.useTap=true;return null}
  /* fetch a box (pause a beat at the pallet, like a person) */
  if(V.pct<99&&!V.couch){if(walk(L_.stack.x-.7,L_.stack.z+.8)){B.k++;if(B.k>8){B.k=0;a.useTap=true}}return null}
  walk(L_.stack.x-1.5,L_.stack.z+3);return null}

})();
