/* =====================================================================
   WATCH YOUR STEP (SPEC3 2.21, giver Doug): neighbourhood-watch patrols. A calm, replayable walk (or drive) around a block,
   generated per run: 6-8 porches to check on, in Maple Heights by day, in Riverside later, and evening patrols in the night preset
   (flashlight F, goggles N if you bought them). At a porch: look at it for a moment from the sidewalk (checked), or walk up and
   knock and wave (E): the neighbour comes out for a quick chat, and the same people live in the same houses run after run, so you
   get to know them (SAVE.jobs.patrol.plan.rel). Some porches have something to notice and handle with judgement:
     a parcel to tuck in by the door · a sprinkler flooding the sidewalk · a lost dog to walk home · kids' chalk across the street
     (admire it) · an unfamiliar van (it's a plumber: ask, don't call it in) · bins blown into the road · a porch light out (evening)
     · kids out late to walk to their corner (evening) · and sometimes real trouble: a porch pirate (day) or a car prowler (evening),
     where the right answer is proportionate: a word first; a tackle and a zip-tie only if he runs.
   Doug's notebook logs it all with dad commentary; a patrol rating (stars) at the end. No guns: the Watch waves.
   Fail: the patrol window runs out with fewer than 70% of the porches checked. Pay $60 + $20 per thing handled. Trust +2..+5 a patrol,
   capped 12 a game week. After 3 patrols a "WE WAVE" watch sign goes up on the corner by your house.
   Controls: E (knock, take the dog, talk), hold E (fix), 1-3 answer in a chat, F flashlight. Owns js/jobs/patrol.js only.
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
const ID='patrol';
const TUNE={stops:[7,9],evChance:.42,evMin:2,evMax:4,window:270,windowNight:290,passFrac:.7,lookR:11,lookT:1.1,lookCos:.86,knockR:2.4,
  pay:60,perEv:20,trustKnock:.1,trustEv:.6,trustRun:5,trustWeek:12,pirateLost:42,dogR:2.6,signRuns:3};
const NAMES=['Mrs. Ito','Mr. Ken','Barb','Mr. Patel','Grandma Lou','Kenji','Lucia','Mr. Ferreira','Denise','Mr. Okoro','The Hendersons','Mrs. Alvarez','Phil','Mr. Ruiz','Carol','Mrs. Novak'];
const NBROLES=['nb_gran','nb_pops','nb_office','nb_sweater','nb_kenji','nb_marcus','nb_mei','nb_lucia'];
const MOODS=['chatty','busy','jokey'];
const LINES={
  doug:{hi:[['doug',"Watch tip: wave at everyone. If they wave back, they're neighbours. If they don't, they're also neighbours. Wave harder."],['doug',"Here's the route. Check every porch. Look, don't lurk. Knock if you want. Write it all down."]],
    night:[['doug',"Evening patrol. Flashlight's on F. Porch lights, kids out late, anybody trying car doors. Calm voice. Big wave."]],
    river:[['doug',"Riverside asked for a Watch walk-through. We're guests. Smile first. Ask second. Zip-ties never, unless they run."]],
    done:"That's the route. Come back to your ride and I'll read your notes. Out loud. With voices.",half:"Halfway. Good pace. Doug-approved pace.",late:"Patrol window's closing. Get the last few porches."},
  chat:{first:["Oh! Is it Thursday already? Hi, Watch!","Oh, hello! Are you the Watch? You're the Watch!","Hi! Is everything okay? It's okay? Okay. Hi!"],
    second:["Back again! You're good at this.","The Watch! Twice in one month. I feel safe. And watched.","Oh, it's you. Good. Hi."],
    friend:["{me}! Come up, I made lemonade. Too much lemonade.","There's my favourite Watch dad. Don't tell the other one.","{me}! You want a cookie for the road? You want a cookie for the road."],
    tip:["Waffles got out again, didn't he. That dog has a plan.","Somebody's van has been on the street since nine. Probably fine.","The kids are chalking again. It's very good this time.","Mr. Ken left his garage open. Again."],
    opts:[{t:"Just making the rounds. Lovely evening.",r:'real'},{t:"Watch tip: lock it, light it, love it.",r:'joke'},{t:"Honestly I just like walking. My knee says otherwise.",r:'over'}],
    good:["Ha! Same time next week?","You're sweet. Doug's lucky.","I'll wave from the window!"],meh:["...Okay! Bye, Watch.","Mm-hm. Well. Carry on.","Right. Yes. Good."]},
  ev:{package:{find:"Parcel on the step. In plain view. Tempting fate.",fix:"Tucked it inside the screen door.",note:"Parcel on the step at {h}. Tucked it in. It says FRAGILE and also SNACKS."},
    sprinkler:{find:"Sprinkler's watering the sidewalk. The sidewalk is thriving.",fix:"Turned it off at the tap.",note:"Sprinkler flooding the walk at {h}. Off at the tap. Left a note: YOUR LAWN IS THE OTHER WAY :)"},
    dog:{find:"A dog with a tag. 'WAFFLES. If found, I live at {o}.' Hi, Waffles.",take:"Come on, Waffles. Home.",fix:"Waffles is home.",owner:"WAFFLES! You absolute menace. Thank you, Watch!",note:"Waffles (dog, very good) found by {h}. Walked him home to {o}. He walked me, technically."},
    chalk:{find:"Chalk. Across the whole sidewalk. There's a dragon.",note:"Chalk at {h}. A dragon, a sun and a very long hopscotch. Admired it. Rated it. 10/10."},
    van:{find:"Unfamiliar van. Engine off. Guy in coveralls.",note:"Unfamiliar van at {h}. Asked. It's a plumber. Mrs. Ito's water heater. Everyone is fine."},
    bins:{find:"Bins blown into the road. Somebody's recycling is touring the neighbourhood.",fix:"Bins back on the kerb.",note:"Bins in the road by {h}. Stood them back up. Somebody drinks a lot of sparkling water."},
    light:{find:"Porch light's out. A dark porch is an invitation. A rude one.",fix:"Light's back on. It was loose. Most things are.",note:"Porch light out at {h}. Tightened the bulb. Let there be porch."},
    late:{find:"Two kids, out past the streetlights. 'We're going home! Slowly!'",take:"Come on, you two. I'll walk you to your corner.",fix:"Home. Their mom says thank you. And 'INSIDE. NOW.'",note:"Two kids out late near {h}. Walked them to {o}. They told me about Minecraft the whole way."},
    pirate:{find:"Gray hoodie. Tote bag. He just picked up a parcel that isn't his.",talk:"That's not yours, friend. Put it back on the step.",back:"...Yeah. Okay. Okay. Sorry.",caught:"Okay! Okay! It's a nose hair trimmer, I don't even want it!",
      note:"Porch pirate at {h}. {how}. Parcel back on the step."},
    prowler:{find:"Somebody trying car door handles. One by one.",talk:"Evening! That's not your car. Or that one.",back:"I was... checking they were locked. For safety. ...I'm going.",caught:"Okay! I'm sitting! I'm sitting.",note:"Somebody trying car doors near {h}. {how}."}},
  chalkOpts:[{t:"That's a great dragon.",ok:true,a:"It's a DOG! ...It's a dragon-dog. Thanks!"},{t:"Move it to the driveway, buddy, cars come through here.",ok:true,a:"Okay! Driveway chalk is better chalk anyway."},{t:"I'll hose that off later.",ok:false,a:"...You're the worst Watch."}],
  vanOpts:[{t:"Wave. Ask what he's working on.",ok:true,a:"Water heater at the Ito place. Thirty years old. It's a miracle it's not a geyser."},{t:"Write down the plate. Casually.",ok:true,a:"(He watches you write. He waves. You wave.)",doug:"Plate logged. Doug will be so proud."},{t:"Call it in.",ok:false,a:"(Twenty minutes later: a very polite officer, a very confused plumber.)"}],
  pirateOpts:[{t:"That's not yours, friend. Put it back.",ok:true},{t:"I know your aunt.",ok:true},{t:"Freeze, dirtbag!",ok:false}],
  rating:["Doug: 'You walked. That counts.'","Doug: 'Solid. Doug-solid.'","Doug: 'Textbook. There's no textbook.'","Doug: 'I'm putting you on the laminated card.'","Doug: 'I'm getting you a vest. A real one. With pockets.'"],
  noGuns:"The Watch doesn't carry. The Watch waves."};
const pick=(a,r)=>a[Math.floor((r?r():Math.random())*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const fmtT=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h}

/* ================= resources ================= */
let RES=null;
function R(){return RES||(RES={geo:[],mat:[],tex:[],own:[],cache:{}})}
function disposeRes(r0){const r=r0||RES;if(!r0)RES=null;if(!r)return;for(const g of r.geo)try{g.dispose()}catch(_){}for(const m of r.mat)try{m.dispose()}catch(_){}for(const t of r.tex)try{t.dispose()}catch(_){}for(const o of r.own)try{o.userData.dispose()}catch(_){}}
const T3=()=>A().THREE;const tg=g=>(R().geo.push(g),g),tm=m=>(R().mat.push(m),m),tt=t=>(R().tex.push(t),t);
function mat(c,o){o=o||{};const k='m|'+c+'|'+JSON.stringify(o);const C=R().cache;if(C[k])return C[k];const T=T3();
  const m=new T.MeshStandardMaterial({color:new T.Color(c).convertSRGBToLinear(),roughness:o.r==null?.7:o.r,metalness:o.m||0});if(o.e){m.emissive=new T.Color(o.e).convertSRGBToLinear();m.emissiveIntensity=o.ek||1}
  if(o.side)m.side=T.DoubleSide;if(o.op!=null&&o.op<1){m.transparent=true;m.opacity=o.op;m.depthWrite=false}return C[k]=tm(m)}
function geoC(k,fn){const C=R().cache;return C['g|'+k]||(C['g|'+k]=tg(fn()))}
const UBOX=()=>geoC('box',()=>new(T3().BoxGeometry)(1,1,1)),UCYL=s=>geoC('cyl'+s,()=>new(T3().CylinderGeometry)(1,1,1,s||12)),USPH=()=>geoC('sph',()=>new(T3().SphereGeometry)(1,12,9));
function bx(w,h,d,m,x,y,z,p,ry,rx,rz){const T=T3(),o=new T.Mesh(UBOX(),typeof m==='string'?mat(m):m);o.scale.set(w,h,d);o.position.set(x||0,y||0,z||0);o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=h>.06||w>.3;o.receiveShadow=true;if(p)p.add(o);return o}
function cy(r,h,m,x,y,z,p,seg,rx,rz){const T=T3(),o=new T.Mesh(UCYL(seg||12),typeof m==='string'?mat(m):m);o.scale.set(r,h,r);o.position.set(x||0,y||0,z||0);o.rotation.set(rx||0,0,rz||0);o.castShadow=true;o.receiveShadow=true;if(p)p.add(o);return o}
function sp(rx,ry,rz,m,x,y,z,p){const T=T3(),o=new T.Mesh(USPH(),typeof m==='string'?mat(m):m);o.scale.set(rx,ry,rz);o.position.set(x,y,z);o.castShadow=true;if(p)p.add(o);return o}
let UIF=null;function uiFont(){if(UIF)return UIF;let f='';try{f=getComputedStyle(document.documentElement).getPropertyValue('--ui').trim()}catch(_){}return UIF=f||'"Barlow Condensed","Arial Narrow",sans-serif'}
function canvasTex(w,h,draw){const T=T3(),c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;return tt(t)}
function plane(w,h,tex,x,y,z,p,ry,o){const T=T3();o=o||{};const m=tm(new T.MeshStandardMaterial({map:tex,roughness:o.r||.85,side:o.side?T.DoubleSide:T.FrontSide,transparent:!!o.tr,depthWrite:!o.tr,polygonOffset:!!o.decal,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));
  const me=new T.Mesh(geoC('pl',()=>new T.PlaneGeometry(1,1)),m);me.scale.set(w,h,1);me.position.set(x,y,z);me.rotation.y=ry||0;if(o.flat){me.rotation.set(-Math.PI/2,0,ry||0)}me.castShadow=!!o.cast;me.receiveShadow=true;if(p)p.add(me);return me}

/* ================= props ================= */
function parcel(){const g=new(T3().Group)();bx(.46,.3,.36,'#b8874f',0,.15,0,g);bx(.47,.035,.08,'#d9c9a0',0,.3,0,g);bx(.2,.004,.14,'#f4f1ea',.08,.302,.09,g);bx(.06,.004,.06,'#f0a020',-.14,.302,.11,g);return g}
function binModel(col){const g=new(T3().Group)(),body=new(T3().Group)();g.add(body);cy(.27,.86,col,0,.43,0,body,16);cy(.29,.05,'#2a2c30',0,.88,0,body,16);for(const s of[-1,1])cy(.08,.05,'#1d1f22',s*.2,.08,-.24,body,10,0,Math.PI/2);
  g.userData.body=body;return g}
function binState(g,t){const b=g.userData.body;b.rotation.x=(1-t)*Math.PI/2;b.position.y=(1-t)*.27}
function tapModel(){const g=new(T3().Group)();bx(.14,.14,.05,'#7a5a3a',0,.55,0,g);cy(.02,.12,'#b8873a',0,.55,.08,g,8,Math.PI/2);bx(.08,.02,.02,'#c03030',0,.6,.12,g);return g}
function sprinklerModel(){const g=new(T3().Group)();cy(.012,.3,'#7a7a74',0,.15,0,g,6);cy(.035,.05,'#b08d3a',0,.32,0,g,10);bx(.16,.02,.03,'#7a7a74',.06,.35,0,g);g.userData.head=g.children[2];return g}
function dogModel(col){const T=T3(),g=new T.Group(),body=new T.Group();g.add(body);const tan=col||'#c99a5a',wht='#f2eee4',blk='#2a221c';
  sp(.13,.13,.27,tan,0,.36,0,body);sp(.12,.12,.12,wht,0,.32,-.2,body);const head=new T.Group();head.position.set(0,.5,-.31);body.add(head);sp(.11,.105,.11,tan,0,0,0,head);bx(.1,.08,.14,wht,0,-.04,-.11,head);sp(.025,.02,.02,blk,0,-.02,-.19,head);
  for(const s of[-1,1])sp(.012,.014,.008,blk,s*.045,.03,-.1,head);const ears=[-1,1].map(s=>{const e=bx(.03,.15,.08,'#7a5430',s*.1,-.04,.02,head);e.rotation.z=s*.2;return e});
  bx(.2,.03,.03,'#c03030',0,-.08,.05,head);sp(.02,.02,.02,'#f0c02a',0,-.11,-.04,head);
  const legs=[[-.08,-.16],[.08,-.16],[-.08,.16],[.08,.16]].map(([x,z])=>{const p=new T.Group();p.position.set(x,.28,z);body.add(p);cy(.03,.28,wht,0,-.14,0,p,6);return p});
  const tail=new T.Group();tail.position.set(0,.45,.25);body.add(tail);cy(.018,.2,tan,0,.08,.04,tail,6,-.6);g.userData={legs,tail,ears,head,body,ph:0};return g}
function dogAnim(d,dt,spd){const u=d.userData;u.ph+=dt*(4+spd*2.2);const k=Math.min(1,spd/2);u.legs.forEach((l,i)=>l.rotation.x=Math.sin(u.ph+(i%2?Math.PI:0)+(i>1?Math.PI/2:0))*.7*k);
  u.tail.rotation.z=Math.sin(u.ph*2.6)*.7;u.body.position.y=Math.abs(Math.sin(u.ph))*.04*k}
function chalkTex(R){return canvasTex(512,256,(g,w,h)=>{g.clearRect(0,0,w,h);g.lineCap='round';g.lineJoin='round';const cols=['#ff7aa8','#7fd1ff','#ffe066','#9fe58a','#c9a6ff','#ffffff'];
  g.globalAlpha=.85;g.lineWidth=7;/* hopscotch */g.strokeStyle=cols[5];let x=20;for(let i=0;i<5;i++){g.strokeRect(x,90,46,46);if(i===2){g.strokeRect(x+46,68,46,46);g.strokeRect(x+46,114,46,46);x+=46}x+=46}
  g.font='700 30px "Comic Sans MS",sans-serif';g.fillStyle=cols[2];for(let i=1;i<=6;i++)g.fillText(String(i),26+(i-1)*48,124);
  /* the sun */g.strokeStyle=cols[2];g.beginPath();g.arc(420,60,30,0,7);g.stroke();for(let k=0;k<10;k++){const a=k*.628;g.beginPath();g.moveTo(420+Math.cos(a)*40,60+Math.sin(a)*40);g.lineTo(420+Math.cos(a)*56,60+Math.sin(a)*56);g.stroke()}
  /* the dragon (dog?) */g.strokeStyle=cols[3];g.lineWidth=8;g.beginPath();g.moveTo(330,200);g.bezierCurveTo(360,150,420,150,450,190);g.bezierCurveTo(470,215,500,205,505,180);g.stroke();g.beginPath();g.arc(330,195,18,0,7);g.stroke();
  g.strokeStyle=cols[0];g.beginPath();g.moveTo(380,160);g.lineTo(395,128);g.lineTo(410,160);g.stroke();g.fillStyle=cols[4];g.font='700 26px "Comic Sans MS",sans-serif';g.fillText('WATCH DAD :)',40,230);g.globalAlpha=1})}
function vanSide(){return canvasTex(512,128,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#2f6f8f';c.textAlign='center';c.font='900 56px '+uiFont();c.fillText("DRIPPY'S",w/2,58);c.fillStyle='#c0392b';c.font='800 34px '+uiFont();c.fillText('PLUMBING · SINCE 1987',w/2,104)})}
function noteCard(){return canvasTex(256,192,(c,w,h)=>{c.fillStyle='#fff7c2';c.fillRect(0,0,w,h);c.fillStyle='#1d2a6b';c.font='700 26px "Comic Sans MS",sans-serif';c.fillText('Hi! Sorry!',20,48);c.font='700 22px "Comic Sans MS",sans-serif';c.fillText('Fixed it for you.',20,92);c.fillText(':) — THE WATCH',20,140)})}
function watchSign(){const T=T3(),g=new T.Group();cy(.04,2.3,'#9aa3a8',0,1.15,0,g,8);const tex=canvasTex(320,320,(c,w,h)=>{c.fillStyle='#f6f1e3';c.fillRect(0,0,w,h);c.strokeStyle='#1d4f8f';c.lineWidth=14;c.strokeRect(8,8,w-16,h-16);c.fillStyle='#1d4f8f';c.textAlign='center';
    c.font='900 40px '+uiFont();c.fillText('NEIGHBOURHOOD',w/2,64);c.font='900 64px '+uiFont();c.fillText('WATCH',w/2,128);c.fillStyle='#c0392b';c.font='900 44px '+uiFont();c.fillText('WE WAVE',w/2,196);c.fillStyle='#1d4f8f';c.font='700 26px '+uiFont();c.fillText('(WAVE BACK)',w/2,244);
    c.beginPath();c.arc(w/2,284,16,0,7);c.fill()});plane(.8,.8,tex,0,2.0,.05,g,0,{side:true,cast:true});return g}
function bulbGlow(){const T=T3(),g=new T.Group();const m=tm(new T.MeshBasicMaterial({color:new T.Color('#ffd98a').convertSRGBToLinear().multiplyScalar(2.2),toneMapped:false}));const b=new T.Mesh(USPH(),m);b.scale.setScalar(.06);g.add(b);
  const tex=canvasTex(64,64,(c,w,h)=>{const r=c.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,220,150,.9)');r.addColorStop(1,'rgba(255,200,120,0)');c.fillStyle=r;c.fillRect(0,0,64,64)});
  const s=new T.Sprite(tm(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false})));s.scale.set(1.4,1.4,1);g.add(s);return g}
function lampFixture(){const g=new(T3().Group)();bx(.1,.18,.06,'#2a2c30',0,0,0,g);sp(.05,.06,.05,mat('#8a8578',{r:.3}),0,-.02,.05,g);return g}

/* ================= people ================= */
const PP=()=>window.HT&&HT.People&&HT.People.ok?HT.People:null;
function dude(role,look){const a=A(),pp=PP();let d=null;if(pp&&pp.make){try{d=pp.make(role,{})}catch(_){d=null}}if(!d)d=a.makeDude(Object.assign({shirt:'#7a8796',pants:'#2b2f36'},look||{},{role}));return d}
function npcPose(d,dt,o){const pp=PP();if(d&&d.rb&&pp&&pp.pose){try{pp.pose(d,dt,o||{})}catch(_){}}}
function gesture(d){const pp=PP();if(d&&d.rb&&pp&&pp.interact)try{pp.interact(d)}catch(_){}}
function turnTo(p,x,z,dt,k){const want=Math.atan2(x-p.x,z-p.z);let d=want-p.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;p.yaw+=d*Math.min(1,dt*(k||8));p.d.root.rotation.y=p.yaw}
function walk(p,x,z,spd,dt){const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.15)return true;const s=Math.min(d,spd*dt);p.x+=dx/d*s;p.z+=dz/d*s;p.d.root.position.set(p.x,0,p.z);turnTo(p,x,z,dt,10);return false}
function armband(d,col){const T=T3();const rb=d.rb,ua=rb&&rb.bones&&rb.bones.Bip01_L_UpperArm,fa=rb&&rb.bones&&rb.bones.Bip01_L_Forearm;if(!(ua&&fa&&fa.parent===ua))return;d.root.updateMatrixWorld(true);
  const s=ua.getWorldScale(new T.Vector3()).x/(d.root.scale.x||1)||1,dir=fa.position.clone().normalize();const band=new T.Mesh(tg(new T.CylinderGeometry(.054/s,.056/s,.07/s,16,1,true)),mat(col,{side:true}));band.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir);band.position.copy(fa.position).multiplyScalar(.5);ua.add(band)}
const AU=()=>window.HT&&HT.Audio;
function tone(f,d,o){o=o||{};const a=AU();try{a&&a.tone&&a.tone({f,to:o.to,type:o.type,d,gain:o.vol==null?.1:o.vol,at:o.at,bus:o.bus})}catch(_){}}
const SFX={check(){tone(880,.07,{type:'triangle',vol:.06,bus:'ui'});tone(1320,.1,{type:'triangle',vol:.05,at:.06,bus:'ui'})},knock(){for(let i=0;i<3;i++)tone(180,.06,{type:'square',vol:.07,at:i*.16})},
  pen(){tone(3200,.04,{type:'sawtooth',vol:.015,to:2600});tone(2800,.05,{type:'sawtooth',vol:.012,at:.07,to:3300})},good(){tone(784,.1,{type:'triangle',vol:.07});tone(1047,.16,{type:'triangle',vol:.07,at:.08})},
  bad(){tone(330,.18,{type:'sawtooth',vol:.05});tone(262,.3,{type:'sawtooth',vol:.05,at:.14})},voice(k,p){const a=AU();try{a&&a.voice&&a.voice(k,p?new(T3().Vector3)(p.x,1.4,p.z):null,{vol:.7})}catch(_){}},
  bark(p){SFX.voice('dog',p)}};
function music(st,o){const a=AU();try{if(a&&a.music)a.music(st,o)}catch(_){}}

/* ================= the route ================= */
const SV=()=>{const a=A();return a&&a.SV?a.SV():null};
function plan(s){s=s||SV();if(!s||!window.HT.Save||!HT.Save.jobRec)return{runs:0,rel:{},week:{w:-1,g:0},best:0};const r=HT.Save.jobRec(s,ID);if(!r.plan||typeof r.plan!=='object')r.plan={};const p=r.plan;
  if(!isFinite(p.runs))p.runs=0;if(!p.rel||typeof p.rel!=='object')p.rel={};if(!p.week||typeof p.week!=='object')p.week={w:-1,g:0};if(!isFinite(p.best))p.best=0;return p}
const weekOf=s=>Math.floor((((s&&s.day)||1)-1)/7);
function riversideOpen(){const s=SV();const d=s&&s.jobs;return !!(d&&((d.crossing&&d.crossing.done)||(d.dee&&d.dee.done)))}
/* today's patrol: alternates by runs played (Maple day, Maple evening, Riverside day, Riverside evening once Riverside asked for it) */
function today(){const pl=plan(),n=pl.runs|0;const river=riversideOpen()&&n%4>=2;const night=n%2===1;return{river,night,n}}
function centre(river){const a=A(),W=a&&a.WORLD;if(river){const c=W&&W.places&&W.places.center;return c?{x:c.x-14,z:c.z-3}:{x:413,z:42}}const h=W&&W.places&&W.places.home;return h?{x:h.x+14,z:h.z+5}:{x:53,z:20}}
function porchList(W,river){const L=[];if(river){for(const p of W.porches||[])L.push({id:'rp'+p.tx+'_'+p.tz,x:p.x,z:p.z,face:p.face})}else{const home=(W.houses||[]).findIndex(h=>h.home);for(const p of W.housePorches||[]){if(p.hood!=='maple'||p.house===home)continue;L.push({id:p.id,x:p.x,z:p.z,face:p.face})}}return L}
function build(seed,variant){const a=A(),W=a.WORLD,Rn=rng(seed),c=centre(variant.river);const all=porchList(W,variant.river);
  const n=TUNE.stops[0]+Math.min(TUNE.stops[1]-TUNE.stops[0],Math.floor(variant.n/2));/* greedy nearest walk from the start, with a little shuffle so routes differ */
  const out=[];let cx=c.x,cz=c.z;const pool=all.filter(p=>Math.hypot(p.x-c.x,p.z-c.z)<120);/* a walk, not a doorstep crawl: each next porch 15-35 m on, round the block */while(out.length<n&&pool.length){const last=out[out.length-1];const sc=p=>{const d=Math.hypot(p.x-cx,p.z-cz);/* stay on the same street side when you can: crossing the block means walking round it */const other=last&&(p.face[0]!==last.face[0]||p.face[1]!==last.face[1]||Math.abs(last.face[1]?p.z-last.z:p.x-last.x)>4);return Math.abs(d-(variant.river?16:24))+Rn()*9+(other?(variant.river?28:8):0)+(out.length&&Math.hypot(p.x-c.x,p.z-c.z)<10?30:0)};pool.sort((p,q)=>sc(p)-sc(q));const p=pool.shift();out.push(p);cx=p.x;cz=p.z;for(let i=pool.length-1;i>=0;i--)if(Math.hypot(pool[i].x-p.x,pool[i].z-p.z)<9)pool.splice(i,1)}
  const stops=out.map((p,i)=>{const fx=p.face[0],fz=p.face[1];const rel=plan().rel[p.id]||0;const h=hash(p.id+':'+(variant.river?'r':'m'));
    return{i,id:p.id,x:p.x,z:p.z,fx,fz,sx:p.x+fx*2.6,sz:p.z+fz*2.6,dx:p.x-fx*.5,dz:p.z-fz*.5,st:'todo',look:0,ev:null,name:NAMES[h%NAMES.length],role:NBROLES[(h>>>4)%NBROLES.length],mood:MOODS[(h>>>8)%3],rel}});
  /* events: some of the porches, seeded; trouble only after the first patrol */
  const kinds=variant.night?['package','dog','van','bins','light','late']:['package','sprinkler','dog','chalk','van','bins'];for(let i=kinds.length-1;i>0;i--){const j=Math.floor(Rn()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]]}
  const nE=clamp(Math.round(stops.length*TUNE.evChance),TUNE.evMin,TUNE.evMax);const slots=stops.map((s,i)=>i).filter(i=>i>0);for(let i=slots.length-1;i>0;i--){const j=Math.floor(Rn()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]]}
  let k=0;for(const i of slots.slice(0,nE)){const kd=kinds[k++%kinds.length];stops[i].ev={k:kd,st:'wait'};if((kd==='dog'||kd==='late')){const o=stops.filter(s=>s.i!==i&&!s.ev).sort((p,q)=>Math.abs(p.i-i-2)-Math.abs(q.i-i-2))[0];stops[i].ev.home=o?o.i:(i+1)%stops.length}}
  let trouble=null;if(variant.n>=1&&Rn()<.55){const i=1+Math.floor(Rn()*(stops.length-2));trouble={k:variant.night?'prowler':'pirate',at:i,st:'wait'}}
  return{stops,trouble,start:c}}

/* ================= the run ================= */
function pt(M){return M&&M.pt}
function setupRun(M,o){const a=A(),cj=o&&o.checkpoint&&o.checkpoint.job,V=cj&&cj.v?{river:!!cj.v.r,night:!!cj.v.n,n:cj.v.k|0}:today();const seed=(o&&o.checkpoint&&o.checkpoint.job&&o.checkpoint.job.seed)||((Math.random()*1e9)>>>0);
  const B=build(seed,V);M.pt={seed,variant:V,stops:B.stops,trouble:B.trouble?Object.assign(B.trouble,{}):null,start:B.start,t:0,clock:(V.night?TUNE.windowNight:TUNE.window)+(V.river?100:0),log:[],checked:0,handled:0,wrong:0,chats:0,goodChats:0,knocks:0,
    trustRun:0,said:{},props:[],people:[],bub:[],follow:null,talk:null,phase:'load',firstLook:false};const P_=M.pt;
  if(V.night){a.setNight(1);P_.nightSet=true}
  for(const s of P_.stops)if(s.ev)buildEvent(M,s);if(P_.trouble)buildTrouble(M,P_.trouble)}
function addP(M,o){A().wmAdd(o);return o}
function buildEvent(M,s){const a=A(),P_=pt(M),e=s.ev,T=T3(),px=-s.fz,pz=s.fx;/* perpendicular along the street */
  if(e.k==='package'){const m=addP(M,parcel());m.position.set(s.x+s.fx*.35,0,s.z+s.fz*.35);m.rotation.y=Math.random()*3;e.m=m}
  else if(e.k==='sprinkler'){const x=s.x+s.fx*3.6+px*2.2,z=s.z+s.fz*3.6+pz*2.2;const m=addP(M,sprinklerModel());m.position.set(x,0,z);e.m=m;e.tap={x:s.x-s.fx*.2+px*1.7,z:s.z-s.fz*.2+pz*1.7};const t=addP(M,tapModel());t.position.set(e.tap.x,0,e.tap.z);t.rotation.y=Math.atan2(s.fx,s.fz);
    try{const F=window.HT.FX;if(F&&F.emitter)e.fx=F.emitter('sprinkler',{pos:new T.Vector3(x,.35,z),radius:3.4,arc:Math.PI*1.2,yaw:Math.atan2(s.fx,s.fz)})}catch(_){}
    const w=new T.Mesh(geoC('disc',()=>new T.CircleGeometry(1,24)),tm(new T.MeshStandardMaterial({color:new T.Color('#3a4650').convertSRGBToLinear(),roughness:.05,metalness:.2,transparent:true,opacity:.5,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4})));
    w.rotation.x=-Math.PI/2;w.scale.set(2.6,1.6,1);w.position.set(x+s.fx*.4,.03,z+s.fz*.4);addP(M,w);e.puddle=w}
  else if(e.k==='dog'){const d=dogModel(pick(['#c99a5a','#8a5a3a','#d8c8a8','#3a3430']));addP(M,d);e.dog={d,x:s.sx+px*3,z:s.sz+pz*3,yaw:0,t:0};d.position.set(e.dog.x,0,e.dog.z)}
  else if(e.k==='chalk'){const tex=chalkTex();const m=plane(4.2,2.1,tex,s.sx+s.fx*.6,.035,s.sz+s.fz*.6,null,Math.atan2(px,pz)+Math.PI/2,{tr:true,decal:true,flat:true});addP(M,m);e.m=m;e.kidRole='nb_kid'}
  else if(e.k==='van'){const v=a.makeVehicle('workvan','#f4f1ea');if(v){const x=s.sx+s.fx*3.4,z=s.sz+s.fz*3.4;v.position.set(x,0,z);v.rotation.y=Math.atan2(-pz,px);addP(M,v);if(v.userData&&v.userData.dispose)R().own.push(v);const tex=vanSide();
      for(const sd of[-1,1]){const p=plane(2.4,.6,tex,0,1.2,sd*1.02,null,sd<0?Math.PI:0,{tr:true});v.add(p)}e.van={o:v,x,z};a.wmCol({x0:x-2.6,x1:x+2.6,z0:z-1.1,z1:z+1.1})}}
  else if(e.k==='bins'){e.bins=[0,1].map(k=>{const b=addP(M,binModel(k?'#2f6f8f':'#3f5a49'));const x=s.sx+s.fx*(2.6+k*.9)+px*(k*1.4-.7),z=s.sz+s.fz*(2.6+k*.9)+pz*(k*1.4-.7);b.position.set(x,0,z);b.rotation.y=Math.random()*6;binState(b,0);return{b,x,z,up:0}})}
  else if(e.k==='light'){const f=addP(M,lampFixture());f.position.set(s.x-s.fx*.3+px*.9,1.9,s.z-s.fz*.3+pz*.9);f.rotation.y=Math.atan2(s.fx,s.fz);e.fix=f;const gl=bulbGlow();gl.position.set(0,-.02,.08);gl.visible=false;f.add(gl);e.glow=gl}
  else if(e.k==='late'){e.kids=[]}}
function buildTrouble(M,t){const P_=pt(M),s=P_.stops[t.at];if(t.k==='pirate'){t.box={m:addP(M,parcel()),x:s.x+s.fx*.4+(-s.fz)*.6,z:s.z+s.fz*.4+s.fx*.6};t.box.m.position.set(t.box.x,0,t.box.z)}
  else{const a=A();/* parked at the kerb by the route, the prowler on the sidewalk side of it */const px_=s.sx+(-s.fz)*3.5,pz_=s.sz+s.fx*3.5;t.spot={x:px_,z:pz_};let x=px_+s.fx*2.3,z=pz_+s.fz*2.3;try{const q=a.wmSnapRoad&&a.wmSnapRoad(x,z);if(q&&Math.hypot(q.x-x,q.z-z)<6){x=q.x;z=q.z}}catch(_){}const car=a.makeVehicle('sedan','#6b6f75');if(car){car.position.set(x,0,z);car.rotation.y=Math.atan2(s.fz,-s.fx);addP(M,car);if(car.userData&&car.userData.dispose)R().own.push(car);a.wmCol({x0:x-2.4,x1:x+2.4,z0:z-1.1,z1:z+1.1})}t.car={x,z}}}
/* people appear when the models are in (the neighbours stream on demand) */
function castKeys(M){const P_=pt(M),k=new Set(['nb_kid','nb_teen','thug_hoodie','thug_cap','nb_kenji']);for(const s of P_.stops)k.add(s.role);return[...k]}
function loadTick(M,dt,F){const P_=pt(M),pp=PP();P_.loadT=(P_.loadT||0)+dt;F.objs.push(['Doug is handing you the clipboard…',false]);const keys=castKeys(M);
  if(!P_.asked&&pp&&pp.preload){P_.asked=1;try{pp.preload(keys).catch(()=>{})}catch(_){}}const ready=!pp||keys.every(k=>pp.has&&pp.has(k));
  if(ready||P_.loadT>18){const a_=A(),me_=a_.CV?a_.CV.pos:a_.P.pos;P_.phase=Math.hypot(me_.x-P_.start.x,me_.z-P_.start.z)>60?'travel':'walk';spawnPeople(M);const a=A();const L_=P_.variant.night?LINES.doug.night:P_.variant.river?LINES.doug.river:LINES.doug.hi;L_.forEach(([w,t],i)=>a.radio(w,t,i===0));if(P_.variant.night)a.radio('doug',"Flashlight. F. Use it. It's not a weapon, it's a courtesy.");
    music('hub',{intensity:.25});logLine(M,P_.variant.night?'Evening patrol. Clear, cool. Flashlight: charged. Me: also charged.':'Day patrol. '+P_.stops.length+' porches. Sneakers: laced.')}}
function spawnPeople(M){const a=A(),P_=pt(M);for(const s of P_.stops){const e=s.ev;if(!e)continue;
    if(e.k==='chalk'){const d=dude('nb_kid',{shirt:'#ff7aa8'});const x=s.sx+s.fx*.6+(-s.fz)*1.4,z=s.sz+s.fz*.6+s.fx*1.4;d.root.position.set(x,0,z);a.wmAdd(d.root);e.kid={d,x,z,yaw:0}}
    else if(e.k==='van'&&e.van){const d=dude('nb_kenji',{shirt:'#3a6fa0'});const x=e.van.x-s.fx*1.6,z=e.van.z-s.fz*1.6;d.root.position.set(x,0,z);a.wmAdd(d.root);e.man={d,x,z,yaw:0};turnTo(e.man,s.x,s.z,1,99)}
    else if(e.k==='late'){const roles=['nb_kid','nb_teen'];e.kids=roles.map((r,k)=>{const d=dude(r,{shirt:k?'#7fd1ff':'#ffd23f'});const x=s.sx+(-s.fz)*(1.4+k*.8),z=s.sz+s.fx*(1.4+k*.8);d.root.position.set(x,0,z);a.wmAdd(d.root);return{d,x,z,yaw:0}})}}
  const t=P_.trouble;if(t){const s=P_.stops[t.at];const role=t.k==='pirate'?'thug_hoodie':'thug_cap';const d=dude(role,{shirt:'#6b6f75',hood:true});
    const x=t.k==='pirate'?s.sx+(-s.fz)*16:t.spot.x,z=t.k==='pirate'?s.sz+s.fx*16:t.spot.z;d.root.position.set(x,0,z);a.wmAdd(d.root);t.p={d,x,z,yaw:0};d.root.visible=false}}

/* ---------- the notebook ---------- */
function logLine(M,text){const P_=pt(M);const el=(P_.variant.night?19*60+5:9*60+40)+Math.round(P_.t/6);const hh=Math.floor(el/60),mm=el%60;const ts=((hh+11)%12+1)+':'+String(mm).padStart(2,'0')+(hh>=12?' pm':' am');P_.log.push({ts,text});SFX.pen()}
function hname(s){return s.name.replace(/^The /,'the ')+"'s"}
function fill(t,s,P_){const o=s.ev&&s.ev.home!=null?P_.stops[s.ev.home]:null;return t.replace('{h}',hname(s)).replace('{o}',o?hname(o)+' place':'next door')}

/* ---------- per frame ---------- */
function upd(dt,M,F){const a=A(),P_=pt(M),P=a.P;if(!P_)return;P_.t+=dt;P_.dt=dt;if(!HUDL)hudMount();if(P.dude&&P.dude.gun)a.equip(P.dude,null);
  if(P_.phase==='load'){loadTick(M,dt,F);hudTick(M,dt);return}
  const me0={x:a.CV?a.CV.pos.x:P.pos.x,z:a.CV?a.CV.pos.z:P.pos.z};
  if(P_.phase==='travel'){/* the route starts over there: the window opens when you arrive */const d=Math.hypot(me0.x-P_.start.x,me0.z-P_.start.z);F.objs.push([(P_.variant.river?'Head over to Riverside (the Community Center)':'Head to the start of the route')+' · '+Math.round(d)+' m',false]);F.target={x:P_.start.x,z:P_.start.z,label:'Route start'};
    if(d<40){P_.phase='walk';a.radio('doug',"There. Clipboard up. The window starts now.",true)}hudTick(M,dt);return}
  P_.clock-=dt;if(P_.clock<=45&&!P_.said.late){P_.said.late=1;a.radio('doug',LINES.doug.late,true)}
  const me={x:a.CV?a.CV.pos.x:P.pos.x,z:a.CV?a.CV.pos.z:P.pos.z};
  /* checking porches: look at it from the sidewalk (or a slow drive-by) */const cam=a.camera,T=T3(),fw=P_.fw||(P_.fw=new T.Vector3());cam.getWorldDirection(fw);
  for(const s of P_.stops){if(s.st!=='todo')continue;const d=Math.hypot(s.x-me.x,s.z-me.z);let on=false;if(d<TUNE.lookR){const dx=s.x-cam.position.x,dz=s.z-cam.position.z,l=Math.hypot(dx,dz)||1;on=(dx*fw.x+dz*fw.z)/l/Math.hypot(fw.x,fw.z)>TUNE.lookCos&&(a.CV?Math.abs(a.CV.spd||0)<3:!P.moving)}
    s.look=on?s.look+dt:Math.max(0,s.look-dt*.5);if(s.look>=TUNE.lookT)checkStop(M,s,'look')}
  for(const s of P_.stops)if(s.ev)eventTick(M,s,dt,F,me);if(P_.trouble)troubleTick(M,P_.trouble,dt,F,me);
  chatTick(M,dt);peopleTick(M,dt);
  /* objectives and the route */const todo=P_.stops.filter(s=>s.st==='todo');const next=todo.sort((p,q)=>Math.hypot(p.x-me.x,p.z-me.z)-Math.hypot(q.x-me.x,q.z-me.z))[0];
  const tr=P_.trouble;if(tr&&(tr.st==='run'||tr.st==='grab'||tr.st==='try'||tr.st==='surr'||tr.st==='flee')){const t_=tr.st;F.objs.push([tr.k==='pirate'?(t_==='surr'?'Zip-tie him · E':'Porch pirate: a word first (E). If he runs, catch him'):(t_==='surr'?'Zip-tie him · E':'Somebody trying car doors: a word first (E)'),false,'warn']);F.target={x:tr.p.x,z:tr.p.z,label:tr.k==='pirate'?'Porch pirate':'Car doors'}}
  const pend=P_.stops.filter(s=>s.ev&&s.ev.st!=='done'&&s.ev.st!=='wait'&&s.ev.st!=='gone');for(const s of pend)F.objs.push([evObj(s,P_),false]);
  F.objs.push(['Check the porches on the route · '+P_.checked+'/'+P_.stops.length+' (look from the sidewalk, or knock: E)',P_.checked===P_.stops.length]);
  if(!F.target){const fe=P_.follow;if(fe&&fe.kind==='dog'){const o=P_.stops[fe.s.ev.home];F.target={x:o.sx,z:o.sz,label:'Waffles lives here'}}else if(fe&&fe.kind==='late'){const o=P_.stops[fe.s.ev.home];F.target={x:o.sx,z:o.sz,label:'Their corner'}}
    else if(next)F.target={x:next.sx,z:next.sz,label:'Porch '+(next.i+1)}}
  F.widgets.push({id:'pt-clock',kind:'timer',label:'Patrol',v:Math.max(0,P_.clock),hot:P_.clock<45});F.widgets.push({id:'pt-chk',kind:'score',label:'Checked',v:P_.checked,max:P_.stops.length});F.widgets.push({id:'pt-ev',kind:'score',label:'Handled',v:P_.handled});
  if(!todo.length&&!M.exitOpen&&!(P_.follow)){M.exitOpen=true;P_.done=true;a.radio('doug',LINES.doug.done,true);logLine(M,'Route done. Feet: sore. Neighbourhood: watched.')}
  if(P_.checked>=Math.ceil(P_.stops.length/2)&&!P_.said.half){P_.said.half=1;a.radio('doug',LINES.doug.half,true)}
  if(P_.clock<=0&&!P_.ending){P_.ending=true;if(P_.checked>=Math.ceil(P_.stops.length*TUNE.passFrac)){M.exitOpen=true;P_.done=true;a.endMission(true)}else a.endMission(false,"Doug: Patrol window's closed. I'll finish the route myself. In the vest. You'll hear the vest.","The window closed on the route.")}
  interact(M,F,me);hudTick(M,dt)}
function evObj(s,P_){const e=s.ev;const n='Porch '+(s.i+1)+': ';return n+({package:'tuck the parcel in by the door (hold E)',sprinkler:'turn the sprinkler off at the tap (hold E)',dog:e.st==='follow'?'walk Waffles home':'a lost dog: E to take him home',chalk:'kids chalking: say something (E)',
  van:'unfamiliar van: decide what to do (E)',bins:'stand the bins back up (hold E)',light:'porch light out: tighten the bulb (hold E)',late:e.st==='follow'?'walk the kids to their corner':'kids out late: E to walk them home'}[e.k]||'')}
function checkStop(M,s,how){const a=A(),P_=pt(M);if(s.st!=='todo')return;s.st='checked';P_.checked++;SFX.check();a.feed('Porch '+(s.i+1)+' checked','trust',how==='knock'?'knocked and waved':s.name);
  if(s.ev&&s.ev.st==='wait'){s.ev.st='found';const L=LINES.ev[s.ev.k];a.radio('you',fill(L.find,s,P_),true)}
  if(how==='look'&&!s.ev)logLine(M,pick(['Porch '+(s.i+1)+', '+hname(s)+'. All quiet. Nice wreath.','Porch '+(s.i+1)+'. Lights on, nobody home. Normal.','Porch '+(s.i+1)+': fine. Gnome present and accounted for.','Porch '+(s.i+1)+', '+hname(s)+'. Waved at the window. Window waved back.']))}
function award(M,s,right,note){const a=A(),P_=pt(M);if(right){P_.handled++;addTrust(M,TUNE.trustEv);SFX.good()}else{P_.wrong++;SFX.bad()}if(note)logLine(M,note)}
function addTrust(M,v){const a=A(),P_=pt(M);const s=SV(),pl=plan(s),wk=weekOf(s);if(pl.week.w!==wk)pl.week={w:wk,g:0};const room=Math.min(TUNE.trustRun-P_.trustRun,TUNE.trustWeek-pl.week.g);if(room<=0||M.replay)return;
  const x=Math.min(v,room);a.addTrust(x,P_.variant.river?'river':'maple');P_.trustRun+=x;pl.week.g=+(pl.week.g+x).toFixed(2)}

/* ---------- events ---------- */
function eventTick(M,s,dt,F,me){const a=A(),P_=pt(M),e=s.ev,P=a.P;if(e.st==='done'||e.st==='gone')return;
  if(e.k==='dog'&&e.dog){const g=e.dog;g.t+=dt;if(e.st==='follow'){const tx=P.pos.x+Math.sin(P.yaw+.8)*1.2,tz=P.pos.z+Math.cos(P.yaw+.8)*1.2;const d=Math.hypot(tx-g.x,tz-g.z);const spd=d>.5?Math.min(6,d*2):0;if(spd){g.x+=(tx-g.x)/d*spd*dt;g.z+=(tz-g.z)/d*spd*dt;g.yaw=Math.atan2(tx-g.x,tz-g.z)}
      g.d.position.set(g.x,0,g.z);g.d.rotation.y=g.yaw+Math.PI;dogAnim(g.d,dt,spd);const o=P_.stops[e.home];if(Math.hypot(g.x-o.sx,g.z-o.sz)<TUNE.dogR+1.4){e.st='done';P_.follow=null;g.home={x:o.x+o.fx*.8,z:o.z+o.fz*.8};a.radio(o.name,LINES.ev.dog.owner,true);SFX.bark(g);award(M,s,true,fill(LINES.ev.dog.note,s,P_));chatPerson(M,o,true)}}
    else{/* sniffing around the yard */const wx=s.sx+Math.sin(g.t*.4)*2.4,wz=s.sz+Math.cos(g.t*.3)*1.6;const d=Math.hypot(wx-g.x,wz-g.z);const spd=d>.3?1.1:0;if(spd){g.x+=(wx-g.x)/d*spd*dt;g.z+=(wz-g.z)/d*spd*dt;g.yaw=Math.atan2(wx-g.x,wz-g.z)}g.d.position.set(g.x,0,g.z);g.d.rotation.y=g.yaw+Math.PI;dogAnim(g.d,dt,spd);
      if(Math.random()<dt*.15&&Math.hypot(g.x-me.x,g.z-me.z)<20)SFX.bark(g)}}
  if(e.k==='dog'&&e.st==='done'&&e.dog&&e.dog.home){const g=e.dog;const d=Math.hypot(e.dog.home.x-g.x,e.dog.home.z-g.z);if(d>.3){g.x+=(e.dog.home.x-g.x)/d*2*dt;g.z+=(e.dog.home.z-g.z)/d*2*dt;g.d.position.set(g.x,0,g.z)}dogAnim(g.d,dt,d>.3?2:0)}
  if(e.k==='late'&&e.st==='follow'){e.kids.forEach((k,i)=>{const tx=P.pos.x+Math.sin(P.yaw+2.5+i*.6)*1.5,tz=P.pos.z+Math.cos(P.yaw+2.5+i*.6)*1.5;const d=Math.hypot(tx-k.x,tz-k.z);const mv=d>.6&&!walk(k,tx,tz,d>3?4.5:2.4,dt);npcPose(k.d,dt,{moving:mv})});
    const o=P_.stops[e.home];if(Math.hypot(me.x-o.sx,me.z-o.sz)<3.2){e.st='done';P_.follow=null;e.kids.forEach(k=>{k.home={x:o.x,z:o.z}});a.radio('you',LINES.ev.late.fix,true);award(M,s,true,fill(LINES.ev.late.note,s,P_))}}
  if(e.k==='late'&&e.st==='done')e.kids.forEach(k=>{if(k.home&&!walk(k,k.home.x,k.home.z,2,dt))npcPose(k.d,dt,{moving:true});else{k.d.root.visible=false}});
  if(e.k==='late'&&(e.st==='found'||e.st==='wait'))e.kids.forEach(k=>{npcPose(k.d,dt,{});turnTo(k,me.x,me.z,dt,2)});
  if(e.kid)npcPose(e.kid.d,dt,{mode:'crouch'});if(e.man){npcPose(e.man.d,dt,{});if(Math.hypot(me.x-e.man.x,me.z-e.man.z)<9)turnTo(e.man,me.x,me.z,dt,2)}
  if(e.k==='sprinkler'&&e.m&&e.fx){e.m.rotation.y+=dt*2}}
function troubleTick(M,t,dt,F,me){const a=A(),P_=pt(M),p=t.p,P=a.P;if(!p)return;const s=P_.stops[t.at];
  if(t.st==='wait'){/* comes out once you're a stop or so away */const d=Math.hypot(me.x-s.x,me.z-s.z);if(d<34&&d>8&&s.st==='todo'||t.trig){t.st=t.k==='pirate'?'go':'try';p.d.root.visible=true;t.t0=P_.t}return}
  if(t.st==='go'){if(walk(p,t.box.x,t.box.z,2.4,dt)){t.st='grab';t.w=.8;gesture(p.d)}npcPose(p.d,dt,{moving:t.st==='go'});return}
  if(t.st==='grab'){t.w-=dt;npcPose(p.d,dt,{});if(t.w<=0){t.st='run';const m=t.box.m;if(m.parent)m.parent.remove(m);m.position.set(0,.95,.35);m.rotation.set(0,0,0);p.d.root.add(m);t.from={x:p.x,z:p.z};const ex=s.sx+(-s.fz)*-60,ez=s.sz+s.fx*-60;t.exit={x:ex,z:ez};
      a.radio('you',LINES.ev.pirate.find,true);a.feed('Porch pirate','bad','a word first (E); catch him if he runs')}return}
  if(t.st==='run'){/* he walks briskly; he only runs if you run at him */const fast=P.moving&&a.keys.shift&&Math.hypot(me.x-p.x,me.z-p.z)<12;walk(p,t.exit.x,t.exit.z,fast?5:2.6,dt);npcPose(p.d,dt,{moving:true,speed:fast?1.5:1});
    if(!a.CV&&Math.hypot(P.pos.x-p.x,P.pos.z-p.z)<1.3){t.st='surr';t.how='tackle';a.radio('Porch pirate',LINES.ev.pirate.caught,true);dropBox(M,t)}
    if(Math.hypot(p.x-t.from.x,p.z-t.from.z)>TUNE.pirateLost){t.st='gone';p.d.root.visible=false;P_.wrong++;logLine(M,'Porch pirate at '+hname(s)+'. Got away with a parcel. Told Doug. Doug is drafting a strongly worded post.');a.feed('He got away','bad')}return}
  if(t.st==='try'){/* trying door handles on the parked car */t.w=(t.w||0)-dt;npcPose(p.d,dt,{});if(t.w<=0){t.w=1.6;gesture(p.d);if(!t.said){t.said=1;a.radio('you',LINES.ev.prowler.find,true);a.feed('Somebody trying car doors','bad','a word first (E)')}}
    if(Math.hypot(me.x-p.x,me.z-p.z)<6&&a.keys.shift&&P.moving){t.st='flee';t.exit={x:p.x+(-s.fz)*60,z:p.z+s.fx*60}}return}
  if(t.st==='flee'){walk(p,t.exit.x,t.exit.z,5,dt);npcPose(p.d,dt,{moving:true,speed:1.5});if(!a.CV&&Math.hypot(P.pos.x-p.x,P.pos.z-p.z)<1.3){t.st='surr';t.how='tackle';a.radio('Car prowler',LINES.ev.prowler.caught,true)}
    if(Math.hypot(p.x-t.car.x,p.z-t.car.z)>TUNE.pirateLost){t.st='gone';p.d.root.visible=false;logLine(M,'Somebody trying car doors near '+hname(s)+'. He ran. I let him. Told Doug. Plate of nothing.');award(M,s,false)}return}
  if(t.st==='surr'){npcPose(p.d,dt,{mode:'hands'});turnTo(p,P.pos.x,P.pos.z,dt,4);return}
  if(t.st==='cuffed'){npcPose(p.d,dt,{mode:'kneel'});return}
  if(t.st==='leave'){if(walk(p,t.exit.x,t.exit.z,2.2,dt))p.d.root.visible=false;npcPose(p.d,dt,{moving:true});return}}
function dropBox(M,t){const a=A(),P_=pt(M),s=P_.stops[t.at];if(!t.box)return;const m=t.box.m;if(m.parent)m.parent.remove(m);a.wmAdd(m);m.position.set(t.box.x,0,t.box.z);m.rotation.set(0,1,0)}
function settleTrouble(M,t,how){const a=A(),P_=pt(M),s=P_.stops[t.at];const L=LINES.ev[t.k];
  if(how==='talk'){t.st='leave';if(t.k==='pirate'){dropBox(M,t)}t.exit=t.exit||{x:t.p.x+(-s.fz)*-60,z:t.p.z+s.fx*-60};a.radio(t.k==='pirate'?'Porch pirate':'Car prowler',L.back);award(M,s,true,fill(L.note,s,P_).replace('{how}',t.k==='pirate'?'Asked him to put it back. He did. Proportionate. Doug cried a little':'Said good evening. He went home. Calm voice, big wave'));P_.proportionate=true}
  else if(how==='cuff'){t.st='cuffed';M.cuffs=(M.cuffs||0)+1;a.feed('Zip-tied','cuff','he ran; you caught him');award(M,s,true,fill(L.note,s,P_).replace('{how}','He ran. I caught him. Zip-tied, sitting on the kerb, very sorry'))}
  else{t.st='leave';award(M,s,false,fill(L.note,s,P_).replace('{how}','Yelled. He dropped it and bolted. Felt big. Was not big'))}}

/* ---------- chats on the doorstep ---------- */
function chatPerson(M,s,brief){const a=A(),P_=pt(M);if(s.out)return s.out;const d=dude(s.role,{shirt:'#8aa0b8'});const x=s.dx+s.fx*.2,z=s.dz+s.fz*.2;d.root.position.set(x,0,z);a.wmAdd(d.root);s.out={d,x,z,yaw:0,t:brief?6:16};turnTo(s.out,s.x+s.fx*3,s.z+s.fz*3,1,99);gesture(d);P_.people.push(s.out);return s.out}
function knock(M,s){const a=A(),P_=pt(M),pl=plan();if(P_.talk)return;SFX.knock();P_.knocks++;addTrust(M,TUNE.trustKnock);const o=chatPerson(M,s);checkStop(M,s,'knock');
  const lv=s.rel>=2?'friend':s.rel===1?'second':'first';const me=pick(['Watch','neighbour','you']);const hi=pick(LINES.chat[lv]).replace('{me}',lv==='friend'?'Hey, you':'Watch');
  a.radio(s.name,hi,true);if(s.rel>=1&&Math.random()<.6){const tip=pick(LINES.chat.tip);a.radio(s.name,tip)}
  const H=a.HUD;const opts=LINES.chat.opts.map(o=>({text:o.t,reg:o.r}));const right=s.mood==='busy'?0:s.mood==='jokey'?1:2;
  const done=i=>{if(!P_.talk)return;P_.talk=null;try{a.overlay('pt-chat',null)}catch(_){}P_.chats++;const good=i===right||(i===0&&s.mood!=='jokey'&&Math.random()<.4);if(good)P_.goodChats++;
    a.radio('you',opts[i]?opts[i].text:'...',true);a.radio(s.name,pick(good?LINES.chat.good:LINES.chat.meh));pl.rel[s.id]=(pl.rel[s.id]||0)+(good?2:1);s.rel=pl.rel[s.id];
    logLine(M,'Knocked at '+hname(s)+'. '+(good?pick(['Good chat. '+s.name+' is a delight.','We talked about gutters. Peak neighbourhood.',s.name+' laughed. At me or with me. Counts.']):pick(['Short chat. '+s.name+' was busy. Respect.','Awkward wave. Recovered. Mostly.'])));if(good)addTrust(M,.2)};
  let ch=null;try{ch=H&&H.kit&&H.kit.choices?H.kit.choices({speaker:s.name,color:'#7fd1ff',prompt:hi,tell:s.mood==='busy'?'keys in hand, half out the door':s.mood==='jokey'?'grinning, holding a mug that says WORLD\'S OKAYEST':'leaning on the door frame, settling in',options:opts,onPick:i=>done(i)}):null}catch(_){ch=null}
  if(ch){try{a.overlay('pt-chat',ch.el)}catch(_){}}P_.talk={t:7,ch,done,s}}
function chooser(M,who,prompt,list,cb){const a=A(),P_=pt(M),H=a.HUD;if(P_.talk)return;const opts=list.map(o=>({text:o.t}));const done=i=>{if(!P_.talk)return;P_.talk=null;try{a.overlay('pt-chat',null)}catch(_){}cb(i)};
  let ch=null;try{ch=H&&H.kit&&H.kit.choices?H.kit.choices({speaker:who,color:'#ffd23f',prompt,options:opts,onPick:i=>done(i)}):null}catch(_){ch=null}if(ch){try{a.overlay('pt-chat',ch.el)}catch(_){}}P_.talk={t:8,ch,done}}
function chatTick(M,dt){const P_=pt(M);if(P_.talk){P_.talk.t-=dt;if(P_.talk.t<=0)P_.talk.done(0)}}
function peopleTick(M,dt){const a=A(),P_=pt(M),P=a.P;for(const o of P_.people){if(!o.d.root.visible)continue;o.t-=dt;npcPose(o.d,dt,{});if(Math.hypot(P.pos.x-o.x,P.pos.z-o.z)<10)turnTo(o,P.pos.x,P.pos.z,dt,3);if(o.t<=0&&!P_.talk){o.d.root.visible=false}}
  const t=P_.trouble;if(t&&t.p&&t.st==='wait')npcPose(t.p.d,dt,{})}

/* ---------- E ---------- */
function interact(M,F,me){const a=A(),P_=pt(M),P=a.P;if(a.CV||P_.talk)return;
  const t=P_.trouble;if(t&&t.p){const d=Math.hypot(P.pos.x-t.p.x,P.pos.z-t.p.z);
    if(t.st==='surr')F.taps.push({x:t.p.x,z:t.p.z,r:2.4,txt:'Zip-tie him',fn:()=>settleTrouble(M,t,'cuff')});
    else if((t.st==='run'||t.st==='grab'||t.st==='try'||t.st==='go')&&d<4.5)F.taps.push({x:t.p.x,z:t.p.z,r:4.5,txt:'Have a word',fn:()=>{const L=LINES.ev[t.k];chooser(M,'You',t.k==='pirate'?'He has a parcel that isn\'t his.':'He has his hand on a stranger\'s car door.',LINES.pirateOpts,i=>{a.radio('you',LINES.pirateOpts[i].t,true);settleTrouble(M,t,LINES.pirateOpts[i].ok?'talk':'yell')})}})}
  if(P_.follow){/* nothing else while walking someone home, except the trouble */}
  for(const s of P_.stops){const e=s.ev,d=Math.hypot(P.pos.x-s.x,P.pos.z-s.z);
    if(s.st==='todo'&&d<TUNE.knockR+.6&&!s.out)F.taps.push({x:s.x,z:s.z,r:TUNE.knockR+.6,txt:'Knock and wave · '+s.name,fn:()=>knock(M,s)});
    if(!e||e.st==='done'||e.st==='gone')continue;if(e.st==='wait'&&s.st==='todo'&&d>TUNE.lookR+4)continue;
    if(e.k==='package')F.holds.push({x:e.m.position.x,z:e.m.position.z,r:1.8,o:e,txt:'Tuck the parcel in by the door',time:1,fn:()=>{e.st='done';e.m.position.set(s.dx,0,s.dz);checkStop(M,s,'fix');a.radio('you',LINES.ev.package.fix,true);award(M,s,true,fill(LINES.ev.package.note,s,P_))}});
    else if(e.k==='sprinkler')F.holds.push({x:e.tap.x,z:e.tap.z,r:1.8,o:e,txt:'Turn the sprinkler off at the tap',time:1.2,fn:()=>{e.st='done';try{e.fx&&e.fx.remove()}catch(_){}e.fx=null;checkStop(M,s,'fix');a.radio('you',LINES.ev.sprinkler.fix,true);award(M,s,true,fill(LINES.ev.sprinkler.note,s,P_));leaveNote(M,s)}});
    else if(e.k==='dog'&&e.st!=='follow'&&e.dog)F.taps.push({x:e.dog.x,z:e.dog.z,r:2.2,txt:'Read the tag · take him home',fn:()=>{e.st='follow';P_.follow={kind:'dog',s};checkStop(M,s,'fix');a.radio('you',fill(LINES.ev.dog.find,s,P_),true);a.radio('you',LINES.ev.dog.take);SFX.bark(e.dog)}});
    else if(e.k==='chalk'&&e.kid)F.taps.push({x:e.kid.x,z:e.kid.z,r:2.6,txt:'Say something about the chalk',fn:()=>chooser(M,'You','A dragon. Across the whole sidewalk.',LINES.chalkOpts,i=>{const o=LINES.chalkOpts[i];e.st='done';checkStop(M,s,'fix');a.radio('you',o.t,true);a.radio('Kid',o.a);award(M,s,o.ok,o.ok?fill(LINES.ev.chalk.note,s,P_):'Chalk at '+hname(s)+'. Said I\'d hose it. Got a look. Deserved the look.')})});
    else if(e.k==='van'&&e.man)F.taps.push({x:e.man.x,z:e.man.z,r:3.2,txt:'Decide about the van',fn:()=>chooser(M,'You','Unfamiliar van. Guy in coveralls with a pipe wrench.',LINES.vanOpts,i=>{const o=LINES.vanOpts[i];e.st='done';checkStop(M,s,'fix');a.radio('you',o.t,true);a.radio(i===0?'Plumber':'',o.a);if(o.doug)a.radio('doug',o.doug);award(M,s,o.ok,o.ok?fill(LINES.ev.van.note,s,P_):'Called in a van at '+hname(s)+'. It was a plumber. The officer was very polite about it. I was not okay.')})});
    else if(e.k==='bins'){for(const b of e.bins){if(b.up>=1)continue;F.holds.push({x:b.x,z:b.z,r:1.6,o:b,txt:'Stand the bin back up',time:.7,fn:()=>{b.up=1;binState(b.b,1);b.b.rotation.y=Math.atan2(s.fx,s.fz);const k_=s.sx+s.fx*1.4;b.b.position.set(b.x=k_+(b.x-s.sx)*.3,0,b.z=s.sz+s.fz*1.4+(b.z-s.sz)*.3);
        if(e.bins.every(q=>q.up>=1)){e.st='done';checkStop(M,s,'fix');a.radio('you',LINES.ev.bins.fix,true);award(M,s,true,fill(LINES.ev.bins.note,s,P_))}}})}}
    else if(e.k==='light')F.holds.push({x:s.dx,z:s.dz,r:2,o:e,txt:'Tighten the porch light bulb',time:1.4,fn:()=>{e.st='done';e.glow.visible=true;checkStop(M,s,'fix');a.radio('you',LINES.ev.light.fix,true);award(M,s,true,fill(LINES.ev.light.note,s,P_))}});
    else if(e.k==='late'&&e.st!=='follow'&&e.kids.length)F.taps.push({x:e.kids[0].x,z:e.kids[0].z,r:2.6,txt:'Walk them to their corner',fn:()=>{e.st='follow';P_.follow={kind:'late',s};checkStop(M,s,'fix');a.radio('Kids',LINES.ev.late.find.split('"')[1]||"We're going home!",true);a.radio('you',LINES.ev.late.take);SFX.voice('kid',e.kids[0])}})}}
function leaveNote(M,s){const a=A();const n=plane(.22,.16,noteCard(),s.dx-s.fz*.6+s.fx*.05,1.15,s.dz+s.fx*.6+s.fz*.05,null,Math.atan2(s.fx,s.fz),{side:true});a.wmAdd(n)}

/* ================= HUD: the notebook, porch numbers, event markers ================= */
const CSS=`
#pth{position:fixed;inset:0;pointer-events:none;z-index:8;font-family:var(--ui,"Barlow Condensed","Arial Narrow",sans-serif);color:#f6f1e3;-webkit-user-select:none;user-select:none}
#pth .nb{position:absolute;right:14px;top:236px;width:286px;background:#fffbe6;color:#1d2a4a;border-radius:6px 6px 10px 10px;box-shadow:0 6px 18px rgba(0,0,0,.35);padding:10px 12px 10px 30px;
  background-image:repeating-linear-gradient(#fffbe6 0 21px,#b9d3ec 21px 22px);background-position:0 30px;transform:rotate(.6deg)}
#pth .nb:before{content:'';position:absolute;left:22px;top:0;bottom:0;width:2px;background:#f2a3a3}
#pth .nb h4{margin:0 0 6px;font:800 13px/1 var(--ui);letter-spacing:.16em;text-transform:uppercase;color:#c0392b}
#pth .nb .e{font:600 14px/22px "Comic Sans MS","Marker Felt",var(--ui);white-space:normal}#pth .nb .e b{font:800 12px/22px var(--ui);color:#6b7a99;margin-right:5px}
#pth .nb .e.new{animation:ptIn .5s ease-out}
#pth .pin{position:absolute;left:0;top:0;transform:translate(-50%,-100%);font:900 14px/1 var(--ui);background:rgba(20,24,30,.78);border:2px solid #7fd1ff;border-radius:999px;padding:4px 9px;white-space:nowrap;will-change:transform}
#pth .pin.ok{border-color:#9fe58a;color:#9fe58a}#pth .pin.ev{border-color:#ffd23f;background:#c98a1a;color:#16181c}#pth .pin i{display:inline-block;width:38px;height:5px;border-radius:3px;background:rgba(255,255,255,.2);margin-left:6px;vertical-align:middle;overflow:hidden;position:relative}
#pth .pin i b{position:absolute;left:0;top:0;bottom:0;background:#7fd1ff}
@keyframes ptIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}
@media (max-width:700px){#pth .nb{top:140px;width:200px;font-size:12px;right:6px}}
`;
let HUDL=null;
function hudMount(){if(HUDL)return HUDL;if(!document.getElementById('ptCss')){const st=document.createElement('style');st.id='ptCss';st.textContent=CSS;document.head.appendChild(st)}
  const r=document.createElement('div');r.id='pth';r.innerHTML='<div class="mk"></div><div class="nb"><h4>Watch notebook</h4><div class="ls"></div></div>';document.body.appendChild(r);HUDL={r,mk:r.querySelector('.mk'),ls:r.querySelector('.ls'),nb:r.querySelector('.nb'),pool:[],n:-1};return HUDL}
function hudKill(){if(HUDL){HUDL.r.remove();HUDL=null}}
function hudTick(M,dt){if(!HUDL)return;const a=A(),P_=pt(M),P=a.P;const W=innerWidth,H=innerHeight;
  if(HUDL.n!==P_.log.length){const L=P_.log.slice(-6);HUDL.ls.innerHTML=L.map((l,i)=>'<div class="e'+(i===L.length-1&&HUDL.n>=0?' new':'')+'"><b>'+l.ts+'</b>'+l.text.replace(/</g,'&lt;')+'</div>').join('');HUDL.n=P_.log.length}
  HUDL.nb.style.display=P_.phase==='load'||P_.talk?'none':'';
  let k=0;const me={x:P.pos.x,z:P.pos.z};for(const s of P_.stops){const d=Math.hypot(s.x-me.x,s.z-me.z);if(d>45)continue;const p=a.project(s.x,2.6,s.z);if(p.behind||p.x<-40||p.y<-40||p.x>W+40||p.y>H+40)continue;
    let e=HUDL.pool[k];if(!e){e=document.createElement('div');e.className='pin';HUDL.mk.appendChild(e);HUDL.pool[k]=e}k++;e.style.display='';e.style.transform='translate('+p.x.toFixed(0)+'px,'+p.y.toFixed(0)+'px) translate(-50%,-100%)';
    const ev=s.ev&&s.ev.st!=='wait'&&s.ev.st!=='done'&&s.ev.st!=='gone';const key=s.i+s.st+(ev?'e':'')+Math.round(s.look*10);if(e._k!==key){e._k=key;e.className='pin'+(s.st==='checked'?' ok':'')+(ev?' ev':'');
      e.innerHTML=(s.st==='checked'?'✓ ':'')+(s.i+1)+(ev?' · !':'')+(s.st==='todo'&&s.look>0?'<i><b style="width:'+Math.round(Math.min(1,s.look/TUNE.lookT)*100)+'%"></b></i>':'')}}
  for(;k<HUDL.pool.length;k++)HUDL.pool[k].style.display='none'}
/* result card: a patrol's numbers */
function stars(M){const P_=pt(M);if(!P_)return 1;const nEv=P_.stops.filter(s=>s.ev).length+(P_.trouble?1:0);const max=40+12*nEv+15;const pts=40*P_.checked/P_.stops.length+12*P_.handled-8*P_.wrong+5*Math.min(3,P_.goodChats);return clamp(Math.round(pts/max*5),1,5)}
function resultCard(M){if(M.resDone||typeof document==='undefined')return;const r=document.querySelector('.ht-result .col');if(!r)return;M.resDone=true;const P_=pt(M);const st=stars(M);
  const h=r.querySelector('h2');if(h)h.textContent=M.state==='won'?'★'.repeat(st)+'☆'.repeat(5-st)+'  Patrol rating':'The window closed.';
  const cells=[...r.querySelectorAll('.ht-stats > div')];const set=(d,k,v,sub)=>{if(!d)return;d.innerHTML='';const b=document.createElement('b'),sp_=document.createElement('span');b.textContent=k;sp_.className='ht-num';sp_.textContent=v;d.appendChild(b);d.appendChild(sp_);if(sub){const sm=document.createElement('small');sm.textContent=sub;d.appendChild(sm)}};
  const by=k=>cells.find(d=>{const b=d.querySelector('b');return b&&b.textContent.trim().toLowerCase()===k});
  set(by('neutralized'),'Porches',P_.checked+'/'+P_.stops.length,P_.variant.night?'evening patrol':P_.variant.river?'Riverside':'Maple Heights');set(by('zip-tied'),'Handled',String(P_.handled),P_.wrong?P_.wrong+' judgement calls to think about':'good calls');
  set(by('time'),'Chats',String(P_.chats),P_.goodChats?P_.goodChats+' went well':'');set(by('trust'),'Rating',st+'/5',LINES.rating[st-1].replace(/^Doug: /,''));
  const L=document.createElement('div');L.style.cssText='margin:8px 0 2px;padding:8px 10px;background:#fffbe6;color:#1d2a4a;border-radius:6px;font:600 13px/1.45 "Comic Sans MS",sans-serif;max-height:132px;overflow:hidden';
  L.innerHTML=P_.log.slice(-5).map(l=>'<div><b style="font:800 11px var(--ht-ui,sans-serif);color:#6b7a99">'+l.ts+'</b> '+l.text.replace(/</g,'&lt;')+'</div>').join('');const pay=r.querySelector('.ht-payout');r.insertBefore(L,pay||r.querySelector('.ht-btns'))}
/* the result card is drawn while the game is paused, when only the HUD hook runs: fill it from there */
J.on('hud',()=>{const a=A(),M=a&&a.M;if(!M||!M.def||M.def.id!==ID||!M.pt||M.state==='go'||a.mode!=='mission')return;resultCard(M)});
/* lifecycle and the free-roam watch sign */
let WAS=false,SIGN=null;
J.on('pose',dt=>{const a=A();if(!a)return;const M=a.M,mine=!!(M&&M.def&&M.def.id===ID&&M.pt&&a.mode==='mission');
  if(mine&&M.state==='go'){WAS=true;return}
  if(mine&&M.state!=='go'){if(HUDL)HUDL.r.style.display='none';if(M.pt.talk){try{a.overlay('pt-chat',null)}catch(_){}M.pt.talk=null}resultCard(M);if(M.pt.nightSet&&!M.pt.nightOff){M.pt.nightOff=true}return}
  if(WAS||HUDL){WAS=false;hudKill();if(M&&M.pt&&M.pt.nightSet&&!M.pt.nightBack){M.pt.nightBack=true;try{a.setNight(0)}catch(_){}}}
  if(RES&&!mine)disposeRes();signTick()});
function signTick(){const a=A(),s=SV();const want=a.mode==='hub'&&a.L&&a.L.ow&&s&&plan(s).runs>=TUNE.signRuns;if(!want){if(SIGN){if(SIGN.o.parent)SIGN.o.parent.remove(SIGN.o);disposeRes(SIGN.res);SIGN=null}return}
  if(SIGN&&SIGN.L!==a.L){disposeRes(SIGN.res);SIGN=null}if(!SIGN){const keep=RES;RES=null;let o=null;try{const h=a.WORLD.places.home;o=watchSign();o.position.set(h.x+5.5,0,h.z+3.4);o.rotation.y=Math.PI;a.L.group.add(o)}catch(_){}SIGN={L:a.L,o,res:RES};RES=keep}}

/* ================= register ================= */
J.register(ID,{
  def:{giver:'doug',hood:'maple',title:'Watch Your Step',role:'Doug · Neighbourhood Watch',place:'The neighbourhood, on foot',
    lines:["Neighbourhood Watch. Walk the route, check the porches, handle what you find. Calmly. With a wave.",
      "Look at every porch on the list. Knock if you want; people like a knock. Write everything down. I mean everything.",
      "No guns. The Watch doesn't carry. The Watch waves. If somebody's up to something, a word first. Always a word first."],
    obj:'Walk the watch route: check every porch (look from the sidewalk or knock), handle what you find with good judgement.',
    crew:[],weapons:[],noGuns:LINES.noGuns,get start(){const v=today(),c=centre(v.river);return{x:c.x,z:c.z}},
    unlock:{done:['tail']},repeatable:true,pay:TUNE.pay,par:0,winTrust:0,roam:true,order:96,stages:['route'],stageLabels:{route:'The route'},failPolicy:'soft',
    medals:['Finished the route','Four-star patrol','Five-star patrol (every porch, every call right)'],
    radio:[['doug',"Clipboard's in your seat. Start where the route starts."]],endLine:"The porches are checked, the bins are up, and somebody's dog is home. The neighbourhood got watched. Nicely."},
  start(M,o){if(RES)disposeRes();hudKill();setupRun(M,o);M.score=0;const a=A();if(a.P.dude)a.equip(a.P.dude,null)},
  upd,
  save:M=>{const P_=M.pt||{},v=P_.variant||{};return{seed:(P_.seed)>>>0,v:{r:v.river?1:0,n:v.night?1:0,k:v.n|0}}},load(M,s){},
  payout(M,ok){const P_=pt(M);if(!ok||!P_)return[];const l=[['Things handled ×'+P_.handled,TUNE.perEv*P_.handled]];if(P_.proportionate)l.push(['A word first: proportionate',25]);if(P_.goodChats)l.push(['Neighbours charmed ×'+P_.goodChats,0]);return l},
  medal(M){const s=stars(M);M.score=s;return s>=5?3:s>=4?2:1},
  end(M,ok){const P_=pt(M),s=SV();if(!P_||!s)return;const pl=plan(s);if(!ok)return;pl.runs=(pl.runs|0)+1;pl.best=Math.max(pl.best|0,stars(M));if(pl.runs===TUNE.signRuns){try{A().banner('NEIGHBOURHOOD WATCH','A "WE WAVE" sign went up on your corner.',3)}catch(_){}}try{if(HT.Save.touch)HT.Save.touch('jobs')}catch(_){}},
  hud(state){state.weapon=null;state.weapons=[]},
  dev:{build,today,stars},
  test:{give(a){const pp=PP();if(pp&&pp.preload)try{pp.preload(['nb_kid','nb_teen','thug_hoodie','thug_cap','nb_kenji'].concat(NBROLES)).catch(()=>{})}catch(_){}if(a.mode==='hub'&&window.__ht&&window.__ht.enterHub)window.__ht.enterHub()},
    step:(a,t,o)=>bot(a,t,o),sample:()=>({pt:{seed:777,variant:{river:false,night:true,n:1}}}),cpNode:true}
});

/* ================= the scripted player =================
   Walks (real keys) along the route in order, stops on the sidewalk and looks at each porch, knocks at every other one and answers
   the chat, handles each thing it finds the way a sensible person would (the right choice, not always the first), walks the dog and
   the kids home, has a word with the porch pirate. o.fail: wanders the wrong way and never looks at a porch. */
function field(a,tx0,tz0){const W=a.WORLD,Wd=W.W,H=W.H,dist=new Int32Array(Wd*H).fill(-1),q=[];if(tx0<1||tz0<1||tx0>=Wd-1||tz0>=H-1)return null;const s0=tz0*Wd+tx0;dist[s0]=0;q.push(s0);
  for(let h=0;h<q.length;h++){const i=q[h],x=i%Wd,z=(i/Wd)|0,d=dist[i];if(d>140)continue;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Z=z+dz;if(X<1||Z<1||X>=Wd-1||Z>=H-1)continue;const j=Z*Wd+X;if(dist[j]>=0||!a.walkable(X,Z)||W.map[Z][X]==='p'||(W.map[Z][X]==='s'&&(W.map[Z-1][X]==='r'||W.map[Z+1][X]==='r'||W.map[Z][X-1]==='p'||W.map[Z][X+1]==='p')))continue;dist[j]=d+1;q.push(j)}}return dist}/* stoops are steps: walk round them */
function bot(a,t,o){const M=a.M,P=a.P,k=a.keys;o=o||{};if(!M||M.state!=='go'||!M.pt)return null;const P_=M.pt;const B=P_.bot||(P_.bot={st:0,px:0,pz:0});
  const stop=()=>{k.w=k.shift=false};k.e=false;if(a.CV){stop();if(P_.phase!=='travel'||t%10===0){try{a.exitCar()}catch(_){a.useTap=true}}return null}if(P_.phase==='load'){stop();return null}
  if(P_.talk){stop();if(t%20===0&&P_.talk.ch){const s=P_.talk.s;const i=s?(s.mood==='busy'?0:s.mood==='jokey'?1:2):0;try{P_.talk.ch.pick(i)}catch(_){P_.talk.done(i)}}return null}
  const go=(x,z,r)=>{const d0=Math.hypot(x-P.pos.x,z-P.pos.z);if(d0<(r||.6)){stop();return true}
    /* follow a walking distance field to the target (tiles), a few tiles ahead, like someone who knows the block */let wx=x,wz=z;const W=a.WORLD,tx=v=>Math.floor(v/2),tc=i=>i*2+1;const key=tx(x)+','+tx(z);
    if(B.key!==key){B.key=key;B.field=field(a,tx(x),tx(z))}const fd=B.field;if(fd&&d0>2.5){let cx=tx(P.pos.x),cz=tx(P.pos.z);for(let st=0;st<3;st++){let bi=-1,bv=fd[cz*W.W+cx];if(bv<0)bv=1e9;
        for(const[ddx,ddz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const X=cx+ddx,Z=cz+ddz,v=fd[Z*W.W+X];if(v>=0&&v<bv&&(Math.abs(ddx)+Math.abs(ddz)<2||(fd[cz*W.W+X]>=0&&fd[Z*W.W+cx]>=0))){bv=v;bi=Z*W.W+X}}if(bi<0)break;cx=bi%W.W;cz=(bi/W.W)|0}
      if(cx!==tx(P.pos.x)||cz!==tx(P.pos.z)){wx=tc(cx);wz=tc(cz)}}
    const dx=wx-P.pos.x,dz=wz-P.pos.z,d=Math.hypot(dx,dz)||.01;const want=Math.atan2(-dx,-dz);let dy=want-P.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;P.yaw+=clamp(dy,-.2,.2);P.pitch=-.12;
    k.w=Math.abs(dy)<1.3;k.shift=d0>14&&Math.abs(dy)<.4;if(t%15===0){const mv=Math.hypot(P.pos.x-B.px,P.pos.z-B.pz);if(k.w&&mv<.3)B.st++;else B.st=0;B.px=P.pos.x;B.pz=P.pos.z;if(B.st>=3){/* wedged between stoops or a fence: a person steps back out to the open sidewalk */const fd=B.field;let best=null,bv=1e9;if(fd){const cx=tx(P.pos.x),cz=tx(P.pos.z);for(let r=1;r<=3&&!best;r++)for(let oz=-r;oz<=r;oz++)for(let ox=-r;ox<=r;ox++){const v=fd[(cz+oz)*W.W+cx+ox];if(v>=0&&v+Math.abs(ox)+Math.abs(oz)<bv){bv=v+Math.abs(ox)+Math.abs(oz);best={x:tc(cx+ox),z:tc(cz+oz)}}}}
        B.tries=(B.tries||0)+1;if(best&&B.tries%2===1){P.pos.x=best.x;P.pos.z=best.z}else{/* a parked car in the way: step sideways round it */B.sd=-(B.sd||1);P.pos.x+=(-dz/d)*2.4*B.sd+dx/d*.8;P.pos.z+=(dx/d)*2.4*B.sd+dz/d*.8}a.collide(P.pos,.35);B.st=0}}return false};
  const look=(x,z)=>{const c=a.camera.position;const dx=x-c.x,dz=z-c.z;const want=Math.atan2(-dx,-dz);let dy=want-P.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;P.yaw+=clamp(dy,-.25,.25);P.pitch=-.15};
  const tap=()=>{if(t%8===0)a.useTap=true};
  if(o.fail){go(P_.start.x+80,P_.start.z+80,1);return null}
  if(P_.phase==='travel'){/* a player drives over; the script just arrives (the drive itself is the game's, not this job's) */if(t%60===0){const q=a.wmSnap(P_.start.x,P_.start.z);P.pos.set(q.x,0,q.z);a.collide(P.pos,.35)}return null}
  const tr=P_.trouble;if(tr&&tr.p&&['go','grab','run','try','flee','surr'].includes(tr.st)){if(tr.st==='surr'){if(go(tr.p.x,tr.p.z,1.6))tap();return null}if(Math.hypot(tr.p.x-P.pos.x,tr.p.z-P.pos.z)<4.2){stop();tap();return null}go(tr.p.x,tr.p.z,1.5);return null}
  if(P_.follow){const s=P_.follow.s,o_=P_.stops[s.ev.home];go(o_.sx,o_.sz,1);return null}
  /* the next stop in route order */const s=P_.stops.find(q=>q.st==='todo'||(q.ev&&q.ev.st!=='done'&&q.ev.st!=='gone'&&q.ev.st!=='follow'));if(!s){if(M.exitOpen&&M.car){if(go(M.car.pos.x+2.4,M.car.pos.z,1.5))tap()}return null}
  const e=s.ev;
  if(s.st==='todo'&&!(e&&e.st!=='wait')){/* knock at every other porch, look at the rest */if(s.i%2===0){if(Math.hypot(P.pos.x-s.x,P.pos.z-s.z)<TUNE.knockR){stop();tap();return null}go(s.x+s.fx*1.4,s.z+s.fz*1.4,.8);return null}if(Math.hypot(P.pos.x-s.x,P.pos.z-s.z)<7.5||go(s.sx,s.sz,1)){stop();look(s.x,s.z)}return null}
  if(!e||e.st==='done')return null;
  const hold=(x,z)=>{if(go(x,z,1)){k.e=true}};
  if(e.k==='package')return hold(e.m.position.x+s.fx*.6,e.m.position.z+s.fz*.6),null;if(e.k==='sprinkler')return hold(e.tap.x+s.fx*.7,e.tap.z+s.fz*.7),null;if(e.k==='light')return hold(s.dx+s.fx*.9,s.dz+s.fz*.9),null;
  if(e.k==='bins'){const b=e.bins.find(q=>q.up<1);if(b)hold(b.x+.5,b.z);return null}
  if(e.k==='dog'){if(go(e.dog.x,e.dog.z,1.4))tap();return null}if(e.k==='late'){if(go(e.kids[0].x,e.kids[0].z,1.6))tap();return null}
  if(e.k==='chalk'){if(go(e.kid.x+.8,e.kid.z,1.6))tap();return null}if(e.k==='van'){if(go(e.man.x,e.man.z,2))tap();return null}
  return null}
})();
