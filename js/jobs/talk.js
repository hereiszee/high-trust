/* =====================================================================
   SMALL TALK (SPEC3 2.15): interrogation by awkward dad conversation. Gary's strand 1/2. The first user of HT.Social (js/social.js).
   The lookout you zip-tied at Fellowship Hall (or the Duke's scrapyard) is sitting at a patio table on Big Dave's front lawn.
   He won't say where the stolen stuff goes. Dave grills. Gary takes notes. You talk.

   Stages ([CP]): 'arrive' (walk up, sit down) -> 'talk' (the conversation: retry lands back at the table, fresh scene).
   Each round: three lines in different registers (Dad Joke / Real Talk / Overshare, sometimes a Compliment or a Bad Cop line that
   never works), on a 12 s clock (silence is a choice), plus "The Grill" once per scene: Dave's burgers cook in real time and are
   leverage only when they're ready. Read Tre's body language: bored -> jokes land, scared -> real talk, defensive -> overshare.
   Rapport 80: he gives up the storage unit (unlocks Good Fences). 95: he names the Wholesaler. 100: he asks about a job (Earl's
   bike library, households +1). Awkward 100: Dave resets the scene with a burger and a fresh start (3 per job; the 4th is out of
   buns = the only fail). No threats, no guns: the Bad Cop lines always backfire and the crew says so.
   Files: js/jobs/talk.js, js/social.js (conversation engine), css/social.css. Tests: node dev/jobs-check.js talk --retry --replay,
   node dev/social.test.js, node dev/jobs/talk.js (screenshots in docs/screenshots/jobs/talk/).
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
/* the conversation engine and its stylesheet ride along with this job (loaded once; later social jobs reuse them) */
(function(){const d=typeof document!=='undefined'?document:null;if(!d||!d.head||!d.createElement)return;
  if(!(window.HT.Social&&HT.Social.view)&&!d.getElementById('ht-social-js')){const s=d.createElement('script');s.id='ht-social-js';s.src='js/social.js';d.head.appendChild(s)}
  if(!d.getElementById('ht-social-css')){const l=d.createElement('link');l.id='ht-social-css';l.rel='stylesheet';l.href='css/social.css';d.head.appendChild(l)}})();
const S_=()=>window.HT&&HT.Social;

/* ---------------- tuning ---------------- */
const T={choice:12,choiceTouch:16,cook:52,ready:.8,done:1.25,burnt:1.5,charcoal:2.1,resets:3,win:80,name95:95,full:100,goldLines:8,
  burger:18,hungry:6,burgerAwk:-25,rare:9,burnt:8,keep:.4,think:[1.6,3.2]};
const COL={tre:'#ffb86b',you:'#6fb8ff',dave:'#ff8a7a',gary:'#9fe58a'};

/* ---------------- the cast ---------------- */
const CAST={you:{name:'You',color:COL.you,voice:{kind:'dad',pitch:1}},tre:{name:'Tre',color:COL.tre,voice:{kind:'thug',pitch:1.32,vol:.3}},
  dave:{name:'Big Dave',color:COL.dave,voice:{kind:'dad',pitch:.78,vol:.36}},gary:{name:'Gary',color:COL.gary,voice:{kind:'dad',pitch:1.14,vol:.3}}};
const TELLS={bored:{tells:['[Tre taps his foot and studies the sky. Bored.]','[Tre picks at his hoodie string. Bored.]','[Tre is counting the bricks on Dave\'s chimney. Bored.]']},
  scared:{tells:['[Tre hunches over and shrinks into the chair. Scared.]','[Tre stares at the table, shoulders up around his ears. Scared.]','[Tre won\'t lift his head. Scared.]']},
  defensive:{tells:['[Tre looks away. Defensive.]','[Tre turns his shoulder to you. Defensive.]','[Tre is very interested in the mailbox. Defensive.]']},
  friendly:{tells:['[Tre leans in. Friendly.]','[Tre is almost smiling. Friendly.]','[Tre nods along. Friendly.]']}};

/* ---------------- the deck: what you can say ----------------
   reg joke|real|over|comp|tough|special. reply {hit,meh,miss,land}. events: crew lines after Tre's reply. note: Gary writes it down. */
const ev=(who,text)=>[who,text];
const DECK=[
  /* Dad Jokes: land when he's bored, groan otherwise; some have a little luck in them */
  {id:'j_units',reg:'joke',text:"You know why the warehouse can't keep secrets? Too many... unit... walls.",land:.25,
    reply:{hit:"...what. (half a smile) That doesn't even— okay.",miss:"...what.",land:"(snorts) Unit walls. That's so bad it's good. I hate it."}},
  {id:'j_tied',reg:'joke',text:"I'd tell you a zip-tie joke, but I'm a little tied up. Well. You are.",land:.2,opens:['ties'],
    reply:{hit:"(groans) Bro. Bro.",miss:"That's not funny, man. My hands are actually asleep.",land:"(laughs, then looks annoyed about it) ...Don't."},fx:C=>{C.st.topics.ties=true}},
  {id:'j_impasta',reg:'joke',text:"What do you call a fake noodle? An impasta.",land:.3,reply:{hit:"(rolls his eyes so hard his whole head goes with it) My uncle says that one.",miss:"...",land:"(quietly) ...impasta. (shakes head) Man."}},
  {id:'j_grew',reg:'joke',text:"I used to hate facial hair. But then it grew on me.",land:.25,reply:{hit:"(touches his chin fuzz) ...Is that about me? It's coming in.",miss:"Is that about my mustache? It's coming in. Leave it alone."}},
  {id:'j_calendar',reg:'joke',text:"Did you hear about the guy who stole a calendar? He got twelve months.",land:.1,to:{miss:'scared'},reply:{hit:"(laughs despite himself) Okay, that's actually— no.",miss:"TWELVE MONTHS? For a CALENDAR?"},
    events:{miss:[ev('gary',"Wrong room for that one.")]}},
  {id:'j_field',reg:'joke',text:"Why'd the scarecrow get an award? Outstanding in his field. Like you. Outstanding. On a corner. For eight hours.",land:.25,
    reply:{hit:"(snorts) Six hours. I had a lunch break.",miss:"...Were you WATCHING me?"}},
  {id:'j_alpha',reg:'joke',text:"I only know twenty-five letters of the alphabet. I don't know 'Y'.",land:.3,reply:{hit:"...You rehearsed that. You one hundred percent rehearsed that.",miss:"...why."}},
  {id:'j_commish',reg:'joke',text:"Fun fact: Dave named his grill. It's called The Commissioner.",land:.35,opens:['grillname'],
    reply:{hit:"(grins) Your grill has a NAME?",miss:"...Is the grill a cop? Is that a cop thing?",land:"(laughing) The COMMISSIONER?"},events:{any:[ev('dave',"Don't.")]}},
  {id:'j_spatula',reg:'joke',needs:'grillname',pri:2,text:"You know what Dave calls his spatula? Also The Commissioner. He's not good with names.",land:.5,
    reply:{hit:"(laughing) The whole grill set is cops!",miss:"...I don't get it."},events:{any:[ev('dave',"They're a family.")]}},
  {id:'j_gravity',reg:'joke',text:"I'm reading a book about anti-gravity. Can't put it down.",land:.3,reply:{hit:"(groans at the sky) Maaan...",miss:"...okay."}},
  {id:'j_nopunch',reg:'joke',text:"What's a lookout's favourite music? Heavy... metal... detector. No. Hold on. I had it a second ago.",land:.55,
    reply:{hit:"(cracking up) You don't even HAVE a punchline!",miss:"(quietly) ...that wasn't a joke. That was just words.",land:"(wheezing) You just— you gave UP halfway!"}},
  {id:'j_cringe',reg:'joke',text:"My daughter says I'm cringe. So I said, 'Hi Cringe, I'm Dad.'",land:.35,reply:{hit:"(wheezes) No. No you did NOT.",miss:"...She's right, though."}},
  {id:'j_boyband',reg:'joke',flag:'spilled',pri:3,text:"Unit forty-seven. Sounds like a boy band.",reply:{hit:"(laughing) It kind of does. Unit 47 would go platinum.",miss:"...Please don't."}},
  /* Real Talk: lands when he's scared; pushes on a nerve when he's defensive */
  {id:'r_patel',reg:'real',text:"Nobody's calling anybody. We just want Mrs. Patel's leaf blower back.",note:"Mrs. Patel's leaf blower (pulls left)",
    reply:{hit:"(exhales) ...It's not even a good leaf blower. It pulls left.",miss:"Who's Mrs. Patel? I don't know any Patels."}},
  {id:'r_dumb',reg:'real',text:"You're nineteen. Nineteen-year-olds do dumb stuff. I did dumb stuff.",opens:['dumbstuff'],reply:{hit:"...Like what?",miss:"I'm not dumb.",meh:"...Like what?"}},
  {id:'r_food',reg:'real',text:"When's the last time you ate something that didn't come from a gas station?",note:"Last meal: one Wednesday taquito",
    reply:{hit:"(quiet) ...Tuesday? Wednesday. It was a Wednesday taquito.",miss:"Why, you gonna poison me? (glances at the grill anyway)"},fx:C=>{C.st.topics.hungry=true}},
  {id:'r_mom',reg:'real',topic:'mom',text:"Does your mom know where you are?",opens:['cousin'],to:{miss:'defensive'},
    reply:{hit:"She works nights. She thinks I'm at my cousin's. ...I kind of AM at my cousin's. He's the one who— (stops)",miss:"Leave my mom out of this."}},
  {id:'r_cousin',reg:'real',needs:'cousin',pri:2,text:"Your cousin got you into this.",note:"Cousin: bad influence. Feet: hurt.",
    reply:{hit:"...He said it was easy money. Stand on a corner, text 'blue car' when somebody leaves their garage open. It's not easy. My feet hurt.",miss:"I didn't say that. You can't write that down."},
    events:{miss:[ev('gary',"(writing) Already did.")]}},
  {id:'r_care',reg:'real',text:"The people you work for don't care about you. We sort of do. Gary's taking notes, so it's official.",
    reply:{hit:"...Nobody's ever made it official before.",miss:"You don't even know me."},events:{any:[ev('gary',"It's official.")]}},
  {id:'r_mad',reg:'real',text:"Is somebody going to be mad if you talk?",reply:{hit:"...Yeah. Maybe. But they never met me either. They just send texts. With emojis.",miss:"(fast) Nobody's mad. Why would anybody be mad."}},
  {id:'r_kid',reg:'real',text:"I've got a kid not much younger than you. If he was sitting there, I'd want somebody to get him a burger.",
    reply:{hit:"(quiet) ...Does he know you do this? Like, the zip-ties?",miss:"I'm not a kid."}},
  {id:'r_ask',reg:'real',topic:'warehouse',text:"So. Where does the stuff go, Tre?",closes:{warehouse:3},
    custom:C=>C.st.rapport>=55?{dr:16,da:0,hit:'hit'}:{dr:-6,da:12,hit:'miss'},to:{hit:'scared',miss:'defensive'},
    reply:{hit:"(long breath) ...If I tell you, I'm not a snitch, right? I'm just... giving directions.",miss:"What stuff? I've never seen stuff. I don't even know what stuff is."},
    events:{miss:[ev('gary',"Too soon. Noted.")]}},
  {id:'r_ties',reg:'real',needs:'ties',min:20,not:'untied',pri:3,text:"Dave, can we get those zip-ties off him? Nobody eats a burger with their hands tied.",set:'untied',note:"Zip-ties off (we're the good guys)",
    custom:C=>({dr:C.st.mood==='bored'?8:C.st.mood==='friendly'?12:15,da:-8,hit:'hit'}),to:'friendly',
    reply:{hit:"(rubs his wrists) ...Thanks. (quieter) Thanks."},events:{any:[ev('dave',"(snip) There. Don't make me regret it."),ev('gary',"Noting that we're the good guys.")]}},
  {id:'r_bikes',reg:'real',min:35,text:"What do you actually like doing? Like, on a Saturday.",opens:['bikes'],note:"Fixes bikes. Trued a wheel with a zip-tie once.",
    reply:{hit:"...I fix bikes. Fixed. My cousin's, my neighbour's. I trued a wheel with a zip-tie once.",miss:"Standing on corners, apparently."}},
  {id:'r_earl',reg:'real',needs:'bikes',min:60,pri:4,text:"Earl runs a bike library down on Dock St. He needs somebody who can true a wheel. And show up.",set:'job',note:"Earl. Bike library. Saturdays.",
    custom:C=>({dr:C.st.mood==='defensive'?10:18,da:0,hit:'hit'}),to:'friendly',
    reply:{hit:"(sits up) ...For real? Like a real job? With a shirt?"},events:{any:[ev('you',"There might be a polo."),ev('tre',"(quietly) ...I'd wear a polo.")]}},
  /* Overshare: disarms him when he's defensive; a lot of information either way */
  {id:'o_commercial',reg:'over',text:"I cried at a car commercial last week. The dad taught the kid to drive. Anyway.",opens:['retriever'],
    reply:{hit:"...Which commercial?",meh:"...Which commercial?",miss:"...Why are you telling me this?"}},
  {id:'o_retriever',reg:'special',as:'over',needs:'retriever',pri:9,sure:15,tag:'Overshare',text:"The one with the golden retriever.",note:"Retriever commercial (rough)",
    reply:"...Yeah. That one's rough. The dog's in the back seat the whole time and then at the end— yeah.",to:'friendly'},
  {id:'o_florida',reg:'special',as:'over',needs:'dumbstuff',pri:9,sure:15,tag:'Overshare',text:"When I was twenty I drove to Florida for a girl. She lived in Ohio. I didn't check.",note:"Drove to the wrong state (Florida)",
    reply:"(laughing for real) You drove to the WRONG STATE?",events:{any:[ev('you',"I saw a lot of Florida.")]},to:'bored'},
  {id:'o_labels',reg:'over',text:"My wife labels the leftovers. With dates. I ate one labelled 'DO NOT'. It was a cake. For a funeral.",
    reply:{hit:"(trying not to laugh) WHOSE funeral?!",miss:"...That's messed up, man."},events:{hit:[ev('you',"...We didn't know them that well.")]}},
  {id:'o_mowers',reg:'over',text:"I have a spreadsheet of every lawn mower I've ever owned. There are four. The spreadsheet has tabs.",
    reply:{hit:"(grinning) Okay but why does it need TABS?",miss:"Why are you like this."},events:{any:[ev('gary',"Mine has seven.")],hit:[ev('tre',"Seven tabs or seven mowers?"),ev('gary',"Yes.")]}},
  {id:'o_phone',reg:'over',text:"I saved my own number in my phone as 'Dad'. In case I forget who I am.",reply:{hit:"...That's kind of sad, man. (small smile) Kind of nice, though.",miss:"...What?"}},
  {id:'o_van',reg:'over',text:"Sometimes I sit in the van in the driveway for ten minutes. Just to have a minute.",bonus:[3,0],note:"Tre's mom: Pill Hill Pharmacy parking lot, radio off",
    reply:{hit:"(quiet) ...My mom does that. In the Pill Hill Pharmacy parking lot. With the radio off.",miss:"...Okay?"}},
  {id:'o_swing',reg:'over',text:"I got stuck in a toddler swing at Linden Park. The fire department came. There's a photo of me on their wall.",
    reply:{hit:"(grinning) No WAY. Is it a good photo?",miss:"...You're making that up."},events:{hit:[ev('you',"It's a great photo. I'm waving.")]}},
  {id:'o_jacket',reg:'over',text:"I tried to be cool once. Bought a leather jacket. Wore it to the Gallon Club. A lady asked me where the rotisserie chickens were.",
    reply:{hit:"(snorts) Did you know?",miss:"..."},events:{hit:[ev('you',"Aisle nine. I always know.")]}},
  {id:'o_dj',reg:'over',text:"When I was your age I wanted to be a DJ. 'DJ Dad'. I didn't think the name all the way through.",reply:{hit:"...DJ Dad is kind of hard, honestly.",miss:"...So what happened?"},
    events:{miss:[ev('you',"I had a kid. Now I'm just Dad.")]}},
  {id:'o_cardio',reg:'over',text:"My doctor told me to do cardio. So now I walk to the fridge faster.",reply:{hit:"(laughs) That's my uncle's whole workout.",miss:"..."}},
  {id:'o_wife',reg:'over',flag:'spilled',pri:3,text:"I'm going to tell my wife you said I was funny.",reply:{hit:"I didn't say that.",miss:"I didn't say that."},events:{any:[ev('you',"She doesn't know that.")]}},
  /* Compliments: never bad, rarely great */
  {id:'c_shoes',reg:'comp',text:"Nice shoes. Clean. You take care of your stuff.",reply:{hit:"...Thanks. They're fake. Still. You gotta keep 'em clean.",miss:"Don't look at my shoes."}},
  {id:'c_battery',reg:'comp',text:"Six hours on a corner and your phone didn't die? That's discipline.",reply:{hit:"(a little proud) Battery saver. And no videos. That's the trick.",miss:"...Were you watching me?"}},
  {id:'c_hair',reg:'comp',text:"Your hair's doing a thing. A good thing. I can't do that thing.",reply:{hit:"(touches his hair) ...You could do it. Maybe not you.",miss:"Okay, weird."}},
  {id:'c_stayed',reg:'comp',text:"You were the only one who didn't run. That counts for something.",reply:{hit:"(looks down) I didn't run 'cause I tripped. But... thanks.",miss:"I didn't run 'cause I tripped."}},
  /* Bad Cop: never works. The crew makes sure everybody knows it. */
  {id:'t_law',reg:'tough',text:"(leans in) Listen, kid. I've seen every episode of Law & Order. Twice.",reply:"(shrinks) ...Okay?",events:{any:[ev('dave',"Hey. We don't do that here.")]}},
  {id:'t_hard',reg:'tough',text:"We can do this the easy way, or the hard way.",reply:"...What's the hard way?",events:{any:[ev('you',"...I hadn't gotten that far."),ev('gary',"Writing down: no hard way.")]}},
  {id:'t_slam',reg:'tough',text:"(slaps the table) TALK!",reply:"(flinches) Jeez!",events:{any:[ev('dave',"You startled the burgers.")]}},
  {id:'t_menu',reg:'tough',text:"You want to know what happens to lookouts who don't talk?",reply:"...What?",events:{any:[ev('you',"They... miss out. On burgers."),ev('dave',"That's not a threat. That's a menu.")]}},
];
/* copies with fresh closures per run (the engine marks lines used) */
const deck=()=>DECK.map(l=>Object.assign({},l));

/* ---------------- the place: Big Dave's front lawn, corner of Linden Ave ---------------- */
let LAY=null;
function lay(){if(LAY)return LAY;const a=A(),W=a&&a.WORLD;let h=W&&W.houses&&W.houses.find(h=>h.x0===23&&h.z0===29);
  if(!h&&W&&W.houses){const g=W.places&&W.places.g_dave;h=W.houses.filter(h=>h.face==='s').sort((p,q)=>Math.hypot(p.cx-(g?g.x+10:51),p.cz-(g?g.z:61))-Math.hypot(q.cx-(g?g.x+10:51),q.cz-(g?g.z:61)))[0]}
  const front=h?(h.z1+1)*2:64,cx=h?h.cx:51;
  const t={x:cx+3.6,z:front+2.05};
  LAY={house:h,table:t,tre:{x:t.x-.86,z:t.z},dad:{x:t.x+.86,z:t.z},grill:{x:t.x+3.05,z:t.z-.55},dave:{x:t.x+3.75,z:t.z-.45},cooler:{x:t.x+3.75,z:t.z+.8},
    gary:{x:t.x-1.35,z:t.z-1.0},umb:t,road:{x:cx+1,z:front+7.2},front};return LAY}

/* ---------------- props (procedural, built once per run) ---------------- */
let TEX=null;
function tex(){if(TEX)return TEX;const a=A(),THREE=a.THREE;TEX={};
  const cv=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);if(THREE.sRGBEncoding)t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t};
  TEX.canopy=cv(512,64,(g,w,h)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#f1ead6':'#2f7d55';g.fillRect(i*w/8,0,w/8+1,h)}g.fillStyle='rgba(0,0,0,.08)';for(let i=0;i<8;i++)g.fillRect(i*w/8,0,2,h)});
  TEX.wood=cv(256,256,(g,w,h)=>{g.fillStyle='#9a6a42';g.fillRect(0,0,w,h);for(let i=0;i<8;i++){g.fillStyle=i%2?'#a77548':'#8f6039';g.fillRect(0,i*32,w,30);g.fillStyle='rgba(40,20,5,.35)';g.fillRect(0,i*32+30,w,2)}
    g.globalAlpha=.12;for(let i=0;i<140;i++){g.fillStyle=Math.random()<.5?'#3a2210':'#d6a77a';g.fillRect(Math.random()*w,Math.random()*h,8+Math.random()*40,1)}});
  TEX.smoke=cv(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,2,32,32,31);r.addColorStop(0,'rgba(235,235,235,.55)');r.addColorStop(.5,'rgba(220,220,220,.22)');r.addColorStop(1,'rgba(220,220,220,0)');g.fillStyle=r;g.fillRect(0,0,w,h)});
  TEX.paper=cv(128,160,(g,w,h)=>{g.fillStyle='#fbf6dc';g.fillRect(0,0,w,h);g.strokeStyle='#9cc3e6';g.lineWidth=2;for(let y=26;y<h;y+=12){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}
    g.strokeStyle='#e58b8b';g.beginPath();g.moveTo(18,0);g.lineTo(18,h);g.stroke();g.fillStyle='#2b3550';g.font='bold 15px sans-serif';g.fillText('TRE',26,22);g.font='12px sans-serif';
    ['unit 47?','cheese','retriever','leaf blower'].forEach((t,k)=>g.fillText('- '+t,24,48+k*24))});
  return TEX}
function M_(col,o){const a=A(),THREE=a.THREE;return new THREE.MeshStandardMaterial(Object.assign({color:a.lin(col),roughness:.7,metalness:0},o||{}))}
function mesh(geo,mat,x,y,z,parent,rx,ry,rz){const a=A(),m=new a.THREE.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);if(rx||ry||rz)m.rotation.set(rx||0,ry||0,rz||0);m.castShadow=true;m.receiveShadow=true;if(parent)parent.add(m);return m}
function patioTable(){const a=A(),THREE=a.THREE,g=new THREE.Group(),tx=tex(),al=M_('#3b3f44',{roughness:.45,metalness:.55});
  const top=mesh(new THREE.CylinderGeometry(.5,.5,.035,40),M_('#ffffff',{map:tx.wood,roughness:.6}),0,.74,0,g);
  mesh(new THREE.TorusGeometry(.5,.018,8,40),al,0,.74,0,g,Math.PI/2);
  for(let i=0;i<4;i++){const ang=i*Math.PI/2+Math.PI/4,l=mesh(new THREE.CylinderGeometry(.018,.018,.76,8),al,Math.cos(ang)*.34,.37,Math.sin(ang)*.34,g);l.rotation.set(Math.sin(ang)*.12,0,-Math.cos(ang)*.12)}
  mesh(new THREE.TorusGeometry(.3,.012,6,32),al,0,.2,0,g,Math.PI/2);
  /* a cantilever umbrella: the post stands behind the table (house side), the arm reaches over, the canopy hangs */
  const um=new THREE.Group();g.add(um);um.position.set(.35,0,-1.25);const pm=M_('#d9d4c6',{roughness:.4,metalness:.35});
  mesh(new THREE.CylinderGeometry(.34,.38,.08,20),M_('#5b5f63',{roughness:.8}),0,.04,0,um);
  mesh(new THREE.CylinderGeometry(.035,.04,2.55,12),pm,0,1.3,0,um);
  const arm=mesh(new THREE.CylinderGeometry(.025,.025,1.5,10),pm,-.17,2.5,.62,um);arm.rotation.set(Math.PI/2-.18,0,.22);
  mesh(new THREE.CylinderGeometry(.012,.012,.35,8),pm,-.35,2.25,1.25,um);
  const can=mesh(new THREE.ConeGeometry(1.35,.38,8,1,true),M_('#ffffff',{map:tx.canopy,side:THREE.DoubleSide,roughness:.85}),-.35,2.2,1.25,um);
  mesh(new THREE.CylinderGeometry(1.35,1.35,.12,8,1,true),M_('#2f7d55',{side:THREE.DoubleSide,roughness:.85}),-.35,1.95,1.25,um);
  mesh(new THREE.SphereGeometry(.045,10,8),pm,-.35,2.4,1.25,um);
  /* a pitcher of lemonade and two glasses */
  const glass=M_('#f4fbfb',{transparent:true,opacity:.28,roughness:.05,depthWrite:false}),lem=M_('#ffe15a',{emissive:A().lin('#5a4a00'),roughness:.25});
  mesh(new THREE.CylinderGeometry(.06,.055,.2,14),glass,.12,.86,-.22,g);mesh(new THREE.CylinderGeometry(.056,.052,.15,14),lem,.12,.835,-.22,g);
  for(const[x,z]of[[-.25,.12],[.27,.15]]){mesh(new THREE.CylinderGeometry(.035,.03,.11,12),glass,x,.81,z,g);mesh(new THREE.CylinderGeometry(.031,.027,.07,12),lem,x,.795,z,g)}
  return g}
function chair(){const a=A(),THREE=a.THREE,g=new THREE.Group(),al=M_('#2f3236',{roughness:.4,metalness:.6}),sl=M_('#e9e3d0',{roughness:.9}),sl2=M_('#2f7d55',{roughness:.9});
  for(const s of[-1,1]){mesh(new THREE.CylinderGeometry(.014,.014,.46,8),al,s*.23,.23,.2,g);mesh(new THREE.CylinderGeometry(.014,.014,.9,8),al,s*.23,.45,-.2,g,-.12);
    mesh(new THREE.CylinderGeometry(.013,.013,.44,8),al,s*.23,.45,0,g,Math.PI/2);mesh(new THREE.CylinderGeometry(.012,.012,.36,8),al,s*.25,.64,.02,g,Math.PI/2)}
  for(let i=0;i<6;i++)mesh(new THREE.BoxGeometry(.46,.012,.065),i%2?sl2:sl,0,.455,-.18+i*.072,g);
  for(let i=0;i<5;i++)mesh(new THREE.BoxGeometry(.46,.065,.012),i%2?sl2:sl,0,.53+i*.075,-.215-i*.009,g,-.12);
  return g}
function kettleGrill(){const a=A(),THREE=a.THREE,g=new THREE.Group(),k=M_('#1b1c1e',{roughness:.35,metalness:.55}),st=M_('#9aa0a6',{roughness:.35,metalness:.8});
  mesh(new THREE.SphereGeometry(.31,28,12,0,Math.PI*2,Math.PI/2,Math.PI/2),k,0,.8,0,g);
  const lid=mesh(new THREE.SphereGeometry(.315,28,10,0,Math.PI*2,0,Math.PI/2.2),k,.33,.62,0,g,0,0,-1.5);mesh(new THREE.TorusGeometry(.05,.01,6,12,Math.PI),st,.66,.62,0,g,0,Math.PI/2,0);
  mesh(new THREE.CylinderGeometry(.305,.305,.008,28),st,0,.8,0,g);
  for(let i=0;i<3;i++){const an=i/3*Math.PI*2+.3;const l=mesh(new THREE.CylinderGeometry(.015,.015,.78,6),st,Math.cos(an)*.2,.38,Math.sin(an)*.2,g);l.rotation.set(Math.sin(an)*.22,0,-Math.cos(an)*.22)}
  mesh(new THREE.CylinderGeometry(.05,.05,.04,10),k,0,.07,.24,g,Math.PI/2);/* ash catcher wheel */
  /* coals glow under the grate */
  mesh(new THREE.CylinderGeometry(.26,.24,.03,20),new THREE.MeshStandardMaterial({color:a.lin('#3a1a0c'),emissive:a.lin('#ff5a1a'),emissiveIntensity:1.2,roughness:1}),0,.74,0,g);
  const patties=[];for(let i=0;i<4;i++){const p=mesh(new THREE.CylinderGeometry(.065,.065,.024,16),M_('#c4616b',{roughness:.75}),-.1+(i%2)*.2,.818,(i<2?-.08:.1),g);patties.push(p)}
  /* side table: buns, cheese, plates, ketchup and mustard */
  const tb=new THREE.Group();tb.position.set(0,0,-.72);g.add(tb);
  mesh(new THREE.BoxGeometry(.5,.035,.9),M_('#ffffff',{map:tex().wood}),0,.76,0,tb);for(const sx of[-.21,.21])for(const sz of[-.4,.4])mesh(new THREE.BoxGeometry(.035,.76,.035),st,sx,.38,sz,tb);
  const bag=mesh(new THREE.BoxGeometry(.2,.11,.3),M_('#e8dcc0',{transparent:true,opacity:.8,roughness:.3}),-.08,.835,.22,tb);
  for(let i=0;i<3;i++)mesh(new THREE.SphereGeometry(.055,14,8,0,Math.PI*2,0,Math.PI/2),M_('#d79a52',{roughness:.6}),-.08,.8,.13+i*.09,tb);
  for(let i=0;i<4;i++)mesh(new THREE.BoxGeometry(.09,.004,.09),M_('#f2c230',{roughness:.5}),.1,.785+i*.005,-.05,tb,0,i*.2,0);
  mesh(new THREE.CylinderGeometry(.11,.11,.012,20),M_('#f4f4f0',{roughness:.3}),.09,.785,-.3,tb);
  mesh(new THREE.CylinderGeometry(.03,.03,.17,10),M_('#c0281e',{roughness:.3}),-.14,.86,-.28,tb);mesh(new THREE.ConeGeometry(.03,.05,10),M_('#c0281e'),-.14,.97,-.28,tb);
  mesh(new THREE.CylinderGeometry(.03,.03,.17,10),M_('#e8c21a',{roughness:.3}),-.07,.86,-.34,tb);mesh(new THREE.ConeGeometry(.03,.05,10),M_('#e8c21a'),-.07,.97,-.34,tb);
  return{g,patties}}
function cooler(){const a=A(),THREE=a.THREE,g=new THREE.Group();mesh(new THREE.BoxGeometry(.6,.36,.38),M_('#c23a2b',{roughness:.45}),0,.18,0,g);mesh(new THREE.BoxGeometry(.62,.07,.4),M_('#f4f1ea',{roughness:.4}),0,.395,0,g);
  mesh(new THREE.BoxGeometry(.3,.03,.04),M_('#f4f1ea'),0,.44,0,g);
  for(let i=0;i<3;i++)mesh(new THREE.CylinderGeometry(.033,.033,.12,10),M_(i%2?'#6b3a1f':'#3a5f2d',{metalness:.5,roughness:.3}),.42,.06+.0,-.1+i*.09,g);
  return g}
function burger(bitten){const a=A(),THREE=a.THREE,g=new THREE.Group();
  mesh(new THREE.CylinderGeometry(.13,.12,.012,24),M_('#f4f4f0',{roughness:.25}),0,.006,0,g);
  mesh(new THREE.CylinderGeometry(.058,.06,.025,18),M_('#d9a25c',{roughness:.6}),0,.025,0,g);
  mesh(new THREE.CylinderGeometry(.062,.062,.022,18),M_('#4a2a17',{roughness:.8}),0,.049,0,g);
  mesh(new THREE.BoxGeometry(.1,.004,.1),M_('#f2c230',{roughness:.4}),0,.062,0,g,0,.6,0);
  mesh(new THREE.CylinderGeometry(.066,.066,.006,18),M_('#5aa83a',{roughness:.7}),0,.066,0,g);
  const top=mesh(new THREE.SphereGeometry(.062,18,10,0,Math.PI*2,0,Math.PI/2),M_('#d08a42',{roughness:.55}),0,.069,0,g);top.scale.y=.75;
  for(let i=0;i<7;i++){const s=mesh(new THREE.SphereGeometry(.004,4,3),M_('#f4ecd2'),Math.cos(i*.9)*.035,.103-i*.001,Math.sin(i*.9)*.035,g)}
  if(bitten){top.scale.set(.8,.7,.8);top.position.x=-.012}
  return g}
function clipboard(){const a=A(),THREE=a.THREE,g=new THREE.Group();mesh(new THREE.BoxGeometry(.23,.31,.01),M_('#8a5a2e',{roughness:.6}),0,0,0,g);
  mesh(new THREE.PlaneGeometry(.2,.26),M_('#ffffff',{map:tex().paper,roughness:.9}),0,-.015,.006,g);mesh(new THREE.BoxGeometry(.09,.03,.02),M_('#c9ccd0',{metalness:.8,roughness:.3}),0,.14,.01,g);return g}
function spatula(){const a=A(),THREE=a.THREE,g=new THREE.Group();mesh(new THREE.CylinderGeometry(.012,.012,.22,8),M_('#1b1b1b'),0,0,.11,g,Math.PI/2);
  mesh(new THREE.CylinderGeometry(.004,.004,.14,6),M_('#c9ccd0',{metalness:.8,roughness:.3}),0,0,.29,g,Math.PI/2);mesh(new THREE.BoxGeometry(.09,.004,.1),M_('#c9ccd0',{metalness:.8,roughness:.3}),0,0,.4,g);return g}
function smokePuffs(){const a=A(),THREE=a.THREE,list=[];for(let i=0;i<10;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex().smoke,transparent:true,depthWrite:false,opacity:0}));s.visible=false;a.wmAdd(s);list.push({s,t:9,life:1})}return list}

/* ---------------- actors ---------------- */
function actor(key,role){const a=A(),PP=window.HT&&HT.People;let d=null;try{if(PP&&PP.ok)d=PP.make(key)}catch(e){d=null}
  if(!d){const look=role&&a.HOMIES[role]?a.HOMIES[role]:{shirt:'#4a5568',pants:'#2a2a2a',hood:1};d=a.makeDude(look)}a.wmAdd(d.root);return d}
function place(d,p,face,y){d.root.position.set(p.x,y||0,p.z);d.root.rotation.y=Math.atan2(face.x-p.x,face.z-p.z)}
function pose(d,dt,o){const PP=window.HT&&HT.People;if(d&&d.rb&&PP)PP.pose(d,dt,Object.assign({aim:false},o))}

/* ---------------- the job ---------------- */
const isTouch=()=>{try{return matchMedia('(pointer:coarse)').matches}catch(e){return false}};
J.register('talk',{
  def:{giver:'gary',hood:'maple',title:'Small Talk',role:'Gary · The Accountant',place:"Big Dave's front lawn, Linden Ave",
    lines:["Remember the kid we zip-tied? Tre. Nineteen. Wouldn't say a word about where the stolen stuff goes.",
      "He's eaten nothing but gas-station taquitos for a week. Dave's firing up the grill on his front lawn. The backyard is for brisket only.",
      "You talk to him. No yelling, no threats. Dad conversation. I'll take notes."],
    obj:"Sit down with Tre. Read his body language, pick the right kind of dad talk, and keep it from getting too awkward until he tells you where the stolen goods go.",
    crew:[],weapons:['pistol'],
    get start(){const L_=lay();return{x:L_.road.x,z:L_.road.z}},
    unlock:{cuffed:10,when:p=>!!(p&&p.done&&(typeof p.done==='function'?(p.done('dee')||p.done('duke')):(p.done.dee||p.done.duke)))},
    pay:300,par:0,winTrust:0,order:30,noGuns:false,
    stages:['arrive','talk'],stageLabels:{arrive:'The walk up',talk:'The conversation'},failPolicy:'soft',
    medals:['Finished','No awkward resets','Rapport 100 in 8 lines or less'],
    radio:[['gary',"He's at Dave's. Front lawn, corner of Linden. Dave insists. He says the backyard is for brisket only."]],
    endLine:"Gary: Unit forty-seven. Cheese. Retriever commercial. Got it all."},
  start(M,o){const a=A(),L_=lay(),THREE=a.THREE;M.ph='walk';M.cook=.18;M.resets=0;M.grillUsed=false;M.burgers=0;M.lines=0;M.seated=false;M.notes=[];M.beats={};M.timer=0;M.smokeT=0;M.bot={};
    M.where=(typeof a.SV==='function'&&a.SV()&&a.SV().jobs&&a.SV().jobs.duke&&a.SV().jobs.duke.done)?'the scrapyard':'the laundromat';
    a.wmSetWindow(a.wmWindow(L_.table.x,L_.table.z,18));
    /* props */
    const tb=patioTable();a.wmAdd(tb);tb.position.set(L_.table.x,0,L_.table.z);a.wmCol({x0:L_.table.x-.5,z0:L_.table.z-.5,x1:L_.table.x+.5,z1:L_.table.z+.5});
    const c1=chair();a.wmAdd(c1);c1.position.set(L_.tre.x-.08,0,L_.tre.z);c1.rotation.y=Math.PI/2;
    const c2=chair();a.wmAdd(c2);c2.position.set(L_.dad.x+.08,0,L_.dad.z);c2.rotation.y=-Math.PI/2;M.chair=c2;
    const gr=kettleGrill();a.wmAdd(gr.g);gr.g.position.set(L_.grill.x,0,L_.grill.z);gr.g.rotation.y=Math.PI/2;M.patties=gr.patties;a.wmCol({x0:L_.grill.x-1,z0:L_.grill.z-.4,x1:L_.grill.x+.35,z1:L_.grill.z+.4});
    const co=cooler();a.wmAdd(co);co.position.set(L_.cooler.x,0,L_.cooler.z);co.rotation.y=.3;
    M.smoke=smokePuffs();
    M.plate=burger(false);M.plate.visible=false;a.wmAdd(M.plate);
    /* the cast */
    M.tre=actor('thug_hoodie',null);place(M.tre,L_.tre,L_.dad);
    M.dave=actor('dave','dave');place(M.dave,L_.dave,L_.grill);
    M.gary=actor('gary','gary');place(M.gary,L_.gary,L_.table);
    try{if(M.dave.gunHold){const s=spatula();M.dave.gunHold.add(s);M.spat=s}if(M.gary.gunHold){const c=clipboard();c.rotation.set(-1.2,.2,0);c.position.set(.02,-.06,.12);M.gary.gunHold.add(c);M.clip=c}}catch(e){}
    const Soc=S_();if(Soc&&Soc.tells){M.tt=[Soc.tells.attach(M.tre,{mood:()=>M.cv?M.cv.st.mood:'scared',speaking:()=>M.spk==='tre',hands:()=>!(M.cv&&M.cv.st.flags.untied),look:()=>M.glance?L_.grill:M.spk==='dave'?L_.dave:M.spk==='gary'?L_.gary:null}),
      Soc.tells.attach(M.dave,{speaking:()=>M.spk==='dave',look:()=>M.spk==='tre'||M.spk==='you'?L_.table:null}),Soc.tells.attach(M.gary,{speaking:()=>M.spk==='gary',look:()=>M.spk==='dave'?L_.dave:L_.table}),
      Soc.tells.attach(a.P.dude,{speaking:()=>M.spk==='you',mood:()=>M.dadMood||null,look:()=>M.spk==='dave'?L_.dave:M.spk==='gary'?L_.gary:null})].filter(Boolean)}
    sizzle(M,true);
    if(!o||!o.checkpoint)a.radio('dave',"Over here! Pull up a chair. Not THAT chair. That's the kid's chair.",false)},
  upd(dt,M,F){const a=A(),L_=lay(),P=a.P;M.dt=dt;
    cookUpd(M,dt);actorsUpd(M,dt);
    if(M.resume&&!M.seated){const s=M.resume;M.resume=null;sitDown(M,s)}
    if(M.ph==='walk'){const d=Math.hypot(P.pos.x-L_.dad.x,P.pos.z-L_.dad.z);F.objs.push(['Sit down with Tre',false]);F.target={x:L_.dad.x,z:L_.dad.z,label:'Your chair'};
      if(d<2.2)F.taps.push({x:L_.dad.x,z:L_.dad.z,r:2.2,txt:'Sit down',fn:()=>sitDown(M,null)});return}
    if(M.seated){/* stay in the chair, face Tre, no gun at the table */P.pos.set(L_.dad.x,0,L_.dad.z);P.yaw=Math.PI/2;P.crouch=false;P.aim=false;for(const k of['w','a','s','d',' ','shift'])a.keys[k]=false;
      if(P.fp){M.fpWas=true;P.fp=false}pose(P.dude,0,{mode:'sit'});P.dude.root.visible=true;P.dude.root.rotation.y=-Math.PI/2;
      if(M.S){M.S.update(dt);if(M.V&&M.cv)meters(M)}
      F.objs.push([M.ph==='after'?'Keep him talking, or wrap it up':'Get Tre talking',M.cv&&M.cv.st.rapport>=T.win])}
    if(M.ph==='free'){F.objs.push(['Back to your ride',false]);F.target={x:M.car.pos.x,z:M.car.pos.z,label:'Your ride'}}},
  save(M){const cv=M.cv?M.cv.save():M.cvs||null;return{ph:M.seated||M.ph==='talk'||M.ph==='after'?'talk':M.ph,convo:cv,cook:+(M.cook||0).toFixed(3),resets:M.resets|0,grillUsed:!!M.grillUsed,burgers:M.burgers|0,beats:Object.assign({},M.beats||{})}},
  load(M,s){M.resume=s;M.cvs=s.convo||null;M.cook=s.cook||0;M.resets=s.resets|0;M.grillUsed=!!s.grillUsed;M.burgers=s.burgers|0;M.beats=Object.assign({},s.beats||{});M.ph=s.ph==='talk'?'walk':s.ph},
  payout(M,ok){if(!ok)return[];const out=[];if(!M.resets)out.push(['No awkward resets',150]);
    out.push(["Gary's notes · "+(M.notes||[]).length+' items',0]);if(M.burgers)out.push(['Burgers eaten ×'+M.burgers,0]);if(M.beats&&M.beats.job)out.push(['Tre has a Saturday job now',0]);return out},
  medal(M){return!M.resets&&M.full&&M.fullLines<=T.goldLines?3:!M.resets?2:1},
  end(M,ok){if(!ok)return;const a=A(),s=a.SV&&a.SV();if(!s)return;s.flags=s.flags||{};s.flags.talkUnit47=true;if(M.beats&&M.beats.w95)s.flags.wholesalerNamed=true;
    if(M.beats&&M.beats.job&&window.HT.Save&&HT.Save.household)try{HT.Save.household(null,'tre_bikes')}catch(e){}},
  camera(dt){const M=A().M;if(!M||!M.seated||!M.D)return;return M.D.update(dt)},
  fire(){const M=A().M;if(!M||!M.seated)return;if(M.V)M.V.confirm();return true},
  hud(st){const M=A().M;if(!M||!M.seated)return;st.crosshair=Object.assign({},st.crosshair,{hidden:true});st.meters=[];st.widgets=[];st.subtitles=null;st.prompt=null},
  test:{give(a){const H=window.__ht;if(!H)return;H.prog.cuffed=Math.max(H.prog.cuffed||0,10);const s=a.SV();
      for(const id of['gary','dee']){const i=H.jobs.index(id);if(i>=0)H.prog.done[i]=true;if(s&&window.HT.Save.jobRec)window.HT.Save.jobRec(s,id).done=true}
      /* world givers spawn when the hub is entered: re-enter so Gary is standing there with this job */
      if(H.mode==='hub'&&!H.M){H.enterHub();H.step(2)}},
    step:(a,t,o)=>bot(a,t,o||{}),
    sample:()=>({ph:'talk',seated:true,cvs:{mood:'defensive',rapport:42,awkward:30,lines:5,round:5,used:['j_units','r_patel'],topics:{retriever:true},closed:{},resets:1,silences:0,hits:3,misses:2,lands:0,picks:[],notes:['Cheese'],flags:{},seed:7,draws:12,offer:null},
      cook:.6,resets:1,grillUsed:false,burgers:0,beats:{}})}
});

/* ---------------- the grill: patties cook in real time; smoke and sizzle follow ---------------- */
function cookUpd(M,dt){const a=A(),L_=lay();if(M.seated&&!M.halt)M.cook+=dt/T.cook;
  if(M.cook>T.charcoal&&M.seated&&M.S&&!M.S.busy&&!M.flipping){M.flipping=true;M.S.say('dave',"...I'm starting these over. Nobody saw that.",{cam:'dave'}).run(()=>{M.cook=.15;M.flipping=false})}
  const k=M.cook,raw=a.lin('#c4616b'),done=a.lin('#5a3320'),burnt=a.lin('#1c1410');
  for(const p of M.patties||[]){const c=p.material.color;if(k<1)c.copy(raw).lerp(done,Math.max(0,k));else c.copy(done).lerp(burnt,Math.min(1,(k-1)/(T.charcoal-1)))}
  M.smokeT-=dt;const rate=.35+Math.min(1.4,k)*.45;if(M.smokeT<=0&&M.smoke){M.smokeT=1/(rate*3);const s=M.smoke.find(s=>s.t>=s.life);if(s){s.t=0;s.life=2.2+Math.random();s.x=L_.grill.x+(Math.random()-.5)*.3;s.z=L_.grill.z+(Math.random()-.5)*.3;s.dk=k>T.burnt?.45:1;s.s.visible=true}}
  for(const s of M.smoke||[]){if(s.t>=s.life){s.s.visible=false;continue}s.t+=dt;const f=s.t/s.life;s.s.position.set(s.x+f*.5,.95+f*1.8,s.z-f*.2);const sc=.25+f*.9;s.s.scale.set(sc,sc,sc);
    s.s.material.opacity=Math.sin(Math.PI*f)*.38;s.s.material.color.setScalar(s.dk)}
  sizzle(M)}
let SZ=null;
function sizzle(M,make){const Au=window.HT&&HT.Audio;if(!Au||!Au.ready||!Au.ctx)return;const ctx=Au.ctx;
  if(make){if(SZ)try{SZ.g.disconnect()}catch(e){}const n=ctx.sampleRate*2,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);let g=0;
    for(let i=0;i<n;i++){if(Math.random()<.0009)g=.4+Math.random()*.6;g*=.9993;d[i]=(Math.random()*2-1)*(.18+g)}
    const s=ctx.createBufferSource();s.buffer=b;s.loop=true;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=4200;bp.Q.value=.7;const gn=ctx.createGain();gn.gain.value=0;
    s.connect(bp);bp.connect(gn);gn.connect(Au.output||ctx.destination);s.start();SZ={s,g:gn,M};return}
  if(!SZ||SZ.M!==M)return;const a=A(),L_=lay(),cam=a.camera.position,dd=Math.hypot(cam.x-L_.grill.x,cam.z-L_.grill.z);
  const v=M.state==='go'?Math.min(.22,.05+M.cook*.08)/Math.max(1,dd/2.2):0;SZ.g.gain.setTargetAtTime(v,ctx.currentTime,.2)}
function sizzleOff(){if(SZ){try{SZ.s.stop();SZ.g.disconnect()}catch(e){}SZ=null}}
/* a job that ends any way takes its sounds and tells with it */
J.on('hud',()=>{const a=A();if(SZ&&(!a.M||a.M.state!=='go'||a.M.def.id!=='talk'))sizzleOff();const Soc=S_();
  if(Soc&&Soc.tells&&Soc.tells.list.length&&(!a.M||a.M.def.id!=='talk'||a.M.state!=='go')){Soc.tells.clear();const M=a.M;if(M&&M.V)M.V.unmount()}
  if((!a.M||a.M.state!=='go')&&document.body.classList.contains('soc-on')){const v=document.querySelector('.soc');if(v)v.remove();document.body.classList.remove('soc-on')}});

/* ---------------- actors per frame: Tre and Dad sit, Dave grills (and walks a burger over), Gary hovers ---------------- */
function actorsUpd(M,dt){const L_=lay(),PP=window.HT&&HT.People;
  pose(M.tre,dt,{mode:'sit'});
  const dv=M.daveWalk;if(dv){dv.t+=dt;const k=Math.min(1,dv.t/dv.dur),p={x:dv.from.x+(dv.to.x-dv.from.x)*k,z:dv.from.z+(dv.to.z-dv.from.z)*k};M.dave.root.position.set(p.x,0,p.z);
    M.dave.root.rotation.y=Math.atan2(dv.to.x-dv.from.x,dv.to.z-dv.from.z);pose(M.dave,dt,{moving:k<1,speed:1});if(k>=1){const n=dv.then;M.daveWalk=null;place(M.dave,dv.to,dv.face||L_.grill);if(n)n()}}
  else{pose(M.dave,dt,{});M.flipT=(M.flipT||2)-dt;if(M.flipT<=0&&PP&&PP.interact&&!M.spk){M.flipT=4+Math.random()*3;try{PP.interact(M.dave)}catch(e){}}}
  pose(M.gary,dt,{});
  /* Tre glances at the grill when the burgers are ready (the burger is leverage: this is the tell) */
  const ready=M.cook>=T.ready&&M.cook<T.burnt&&!M.grillUsed;M.glT=(M.glT||0)+dt;M.glance=ready&&(M.glT%5)<1.4&&M.spk!=='tre'}

/* ---------------- sitting down: the scene begins ---------------- */
function sitDown(M,resume){const a=A(),L_=lay(),Soc=S_();if(M.seated)return;
  if(!Soc||!Soc.view){a.radio('gary',"Hang on, my notes app is loading.",true);return}
  if(!resume)a.CP.mark('talk');
  M.seated=true;M.ph='talk';a.equip(a.P.dude,null);
  M.cv=Soc.convo({npc:'tre',name:'Tre',mood:'scared',win:T.win,lose:100,seed:(Math.random()*1e9)>>>0,deck:deck(),swap:.4,moods:TELLS,resetMood:'scared'});
  if(resume&&(resume.convo||M.cvs))M.cv.load(resume.convo||M.cvs);
  M.V=Soc.view({cast:CAST,cls:'soc-talk'}).mount();M.S=Soc.scene(M.V);M.D=Soc.director(a.camera);M.S.onSay=(who,text,o)=>{M.spk=who;cut(M,o.cam||camFor(who))};
  const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.music('home');Au.ambience&&Au.ambience('suburb')}catch(e){}
  meters(M,true);const S=M.S;
  if(resume){cut(M,'wide');S.say('gary',pick(["Okay. Take two. Page three.","Resetting. I've started a new page.","From the top. I'll keep the old notes, though."]),{cam:'gary'})
    .say('dave',"Fresh patties. Fresh start. Fresh... everything.",{cam:'dave'}).run(()=>round(M))}
  else{cut(M,'wide');
    S.say('gary',"This is Tre. He's nineteen. He's scared. He's eaten nothing but gas-station taquitos for a week. Be gentle.",{cam:'gary'})
     .say('dave',"I'll be over here. Grilling. Menacingly. Medium-rare.",{cam:'dave'})
     .say('gary',"I listened to a podcast about this. If he's bored, you joke. If he's scared, keep it real. If he's defensive, share something embarrassing.",{cam:'gary'})
     .say('gary',"That last part was a two-parter.",{cam:'gary',hold:1})
     .say('tre',"...I'm not saying anything. I want a lawyer. Or a, um. A taquito.",{cam:'tre'})
     .say('you',pick(["Hi Tre. I'm a dad. We met at "+M.where+". I'm the one who said 'sorry' while I zip-tied you.","Hey, Tre. Remember me? From "+M.where+"? I apologized to your zip-ties."]),{cam:'dad'})
     .run(()=>round(M))}}

/* ---------------- one round: read him, pick a line ---------------- */
function round(M){const a=A(),C=M.cv,V=M.V,S=M.S;if(!C||M.state!=='go')return;
  const opts=C.options().map(l=>({kind:'line',line:l,reg:l.reg==='special'?'special':l.reg,tag:l.tag,text:'"'+l.text+'"',cls:l.again?'again':''}));
  if(!M.grillUsed)opts.push({kind:'grill',reg:'grill',text:'"Dave? How are those burgers coming?"',hint:grillHint(M)});
  if(M.ph==='after')opts.push({kind:'wrap',reg:'go',text:'"That\'s everything we need. Thanks, Tre."',hint:'Ends the talk'});
  const list=opts.slice(0,5);
  S.choose(done=>{cut(M,'tre');M.spk=null;let tell=C.tell()||'';if(M.glance||(M.cook>=T.ready&&M.cook<T.burnt&&!M.grillUsed))tell+=' [He keeps glancing at the grill.]';V.prompt('tre',tell);
    M.choosing={list,t0:a.simT};
    V.choices(list,{time:isTouch()?T.choiceTouch:T.choice,onPick:k=>{M.choosing=null;done();pickLine(M,list[k])},onTimeout:()=>{M.choosing=null;done();silence(M)}})})}
function grillHint(M){const k=M.cook;return k<.55?'Patties: raw':k<T.ready?'Patties: getting there':k<T.burnt?'Patties: ready':'Patties: very done'}
function pickLine(M,o){const a=A(),C=M.cv,S=M.S;M.V.tell('');
  if(o.kind==='grill')return grillBeat(M);
  if(o.kind==='wrap')return outro(M);
  const res=C.pick(o.line);if(!res)return round(M);M.lines=C.st.lines;
  S.say('you',o.line.text,{cam:o.line.reg==='tough'?'dadTough':'dad',before:()=>{M.dadMood=o.line.reg==='tough'?'defensive':null}});
  if(o.line.reg==='tough')S.run(()=>{const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.ui('hitmarker')}catch(e){}});
  reaction(M,res)}
function silence(M){const C=M.cv,S=M.S;const res=C.silence();M.V.tell('');
  S.say('you',pick(['(...)','(You open your mouth. Nothing comes out.)','(You nod slowly, like you\'re thinking.)']),{cam:'wide',hold:.9,cls:'soc-mute'});
  if(res.dr>0)res.reply=pick(["(fills the silence) ...You're not gonna yell at me?","(quietly) ...It's okay. I don't know what to say either.","(after a while) ...Thanks for not, like, doing the cop thing."]);
  else res.reply=pick(["...Is this the interrogation? This is weird, man.","(stares) ...","Are you okay? You're just staring."]);
  if(res.dr<=0)res.events.push(['gary',pick(['(writing) "Dad... froze."','Noted: silence.'])]);
  reaction(M,res)}
/* Tre answers, the crew chimes in, the meters move, the next round (or a reset, or a confession) */
function reaction(M,res){const a=A(),C=M.cv,S=M.S,V=M.V;
  S.run(()=>{meters(M);delta(M,res)});
  if(res.reply)S.say('tre',res.reply,{cam:'tre'});
  for(const e of res.events||[])S.say(e[0],e[1],{cam:camFor(e[0])});
  for(const n of res.notes||[])S.run(()=>noteIt(M,n));
  S.run(()=>{meters(M);const st=C.st;
    if(res.done==='lose'||st.awkward>=100)return resetBeat(M);
    if(st.rapport>=T.win&&!M.beats.spill)return spill(M);
    if(M.beats.spill)return milestones(M);
    round(M)})}
function delta(M,res){const V=M.V;if(!V)return;const r=res.dr|0,w=res.da|0;
  const t=(res.hit==='land'?'It landed! ':res.hit==='hit'?'':res.hit==='miss'?'':'')+(r?((r>0?'+':'')+r+' Rapport'):'')+(r&&w?'   ':'')+(w?((w>0?'+':'')+w+' Awkward'):'');
  if(t)V.toast(t,r>=10?'good':r<=0||w>=10?'bad':'meh');
  const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.ui(r>=10?'pickup':r<=0?'click':'hover')}catch(e){}}
function noteIt(M,n){if(!M.notes.includes(n))M.notes.push(n);const PP=window.HT&&HT.People;if(PP&&PP.interact)try{PP.interact(M.gary)}catch(e){}M.V&&M.V.toast('Gary wrote down: '+n,'note')}
function meters(M,first){const C=M.cv,V=M.V;if(!C||!V)return;const st=C.st;
  V.meters([{id:'rap',label:'Rapport',v:st.rapport,max:100,marks:[T.win,T.name95],cls:'rap',hot:st.rapport>=T.win},
    {id:'awk',label:'Awkward',v:st.awkward,max:100,cls:'awk',warn:st.awkward>=70},
    {id:'buns',label:'Fresh starts',v:T.resets-M.resets,max:T.resets,cls:'pips',sub:'●'.repeat(Math.max(0,T.resets-M.resets))+'○'.repeat(Math.min(T.resets,M.resets))},
    {id:'grill',label:'The grill',v:Math.min(100,M.cook/T.burnt*100),max:100,cls:'grill'+(M.grillUsed?' used':M.cook>=T.ready&&M.cook<T.burnt?' ready':M.cook>=T.burnt?' burnt':''),marks:[T.ready/T.burnt*100],sub:M.grillUsed?'served':grillHint(M).replace('Patties: ','')},
    {id:'lines',label:'Lines',v:st.lines,max:Math.max(T.goldLines,st.lines),cls:'count',sub:String(st.lines)}]);
  const Au=window.HT&&HT.Audio;if(Au&&Au.ready&&Au.setIntensity)try{Au.setIntensity(st.rapport/100)}catch(e){}}

/* ---------------- the burger: leverage, if you time it ---------------- */
function grillBeat(M){const a=A(),C=M.cv,S=M.S,L_=lay(),k=M.cook;
  S.say('you',"Dave? How are those burgers coming?",{cam:'dad'});
  if(k<.55){S.say('dave',pick(["Raw. They're raw. I'm not an animal.","You don't rush a burger. Ask me again and I'll make you wait longer."]),{cam:'dave'});
    S.say('gary',"Noted: patience.",{cam:'gary'});S.run(()=>{const r=C.nudge({awkward:6});meters(M);delta(M,r);round(M)});return}
  M.grillUsed=true;M.burgers++;
  const hungry=C.open('hungry')?T.hungry:0;let eff;
  if(k<T.ready)eff={rapport:T.rare+(hungry>>1),awkward:-12,line:["...Medium-rare. FINE.","Fine. FINE. They're medium-rare. If anybody asks, it was on purpose."]};
  else if(k<T.burnt)eff={rapport:T.burger+hungry,awkward:T.burgerAwk,mood:'friendly',line:["Burger. Cheese or no cheese. There is a correct answer."],cheese:true};
  else eff={rapport:T.burnt+(hungry>>1),awkward:-10,line:["These are... Cajun. Blackened. On purpose."],burnt:true};
  S.run(()=>{M.halt=true;daveTo(M,{x:L_.tre.x+.25,z:L_.tre.z-.7},()=>{M.plate.position.set(L_.tre.x+.32,.755,L_.tre.z);M.plate.visible=true},L_.tre)});
  S.say('dave',pick(eff.line),{cam:'daveTable'});
  if(eff.cheese){S.say('tre',"...Cheese.",{cam:'tre'});S.say('dave',"Correct. I like this kid.",{cam:'daveTable'});}
  else if(eff.burnt)S.say('tre',"(chewing) ...It's good, actually. It's crunchy.",{cam:'tre'});
  else S.say('tre',"(already eating) ...It's fine. It's good. Thanks.",{cam:'tre'});
  S.run(()=>{const r=C.nudge({rapport:eff.rapport,awkward:eff.awkward,mood:eff.mood,note:eff.cheese?'Cheese (correct)':null});if(eff.cheese)noteIt(M,'Cheese (correct)');meters(M);delta(M,r);
    daveTo(M,L_.dave,()=>{M.halt=false;M.cook=.12},L_.grill)});
  S.run(()=>{if(C.st.rapport>=T.win&&!M.beats.spill)return spill(M);if(M.beats.spill)return milestones(M);round(M)})}
function daveTo(M,p,then,face){const from={x:M.dave.root.position.x,z:M.dave.root.position.z},d=Math.hypot(p.x-from.x,p.z-from.z);
  if(M.spat)M.spat.visible=false;M.daveWalk={from,to:p,t:0,dur:Math.max(.5,d/1.1),face,then:()=>{if(M.spat)M.spat.visible=true;then&&then()}}}

/* ---------------- awkward 100: Dave resets the scene ---------------- */
function resetBeat(M){const a=A(),C=M.cv,S=M.S;
  if(M.resets>=T.resets){S.say('dave',"...That was the last bun. I'm calling it.",{cam:'dave'}).say('gary',"Noting that we've run out of fresh starts. And buns.",{cam:'gary'})
    .run(()=>a.endMission(false,"Dave ran out of buns before you ran out of awkward. Tre is fine. Everyone else needs a minute.","Out of buns."));return}
  M.resets++;const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.stinger('fail');Au.music('home')}catch(e){}
  S.say('dave',"Okay. Who wants a burger and a fresh start.",{cam:'daveTable'})
   .say('tre',pick(["...Yes. Please. Both.","(exhales) ...Yeah. Okay."]),{cam:'tre'})
   .say('gary',pick(["New page.","Starting a new page. Leaving the old one in for the record.","I'm going to need a bigger notepad."]),{cam:'gary'})
   .run(()=>{C.reset(T.keep,'scared');M.grillUsed=false;M.cook=Math.max(M.cook,.45);meters(M);M.V.toast('Fresh start · '+(T.resets-M.resets)+' left','meh');round(M)})}

/* ---------------- rapport 80 / 95 / 100: what he tells you ---------------- */
function spill(M){const a=A(),C=M.cv,S=M.S;M.beats.spill=true;M.ph='after';C.st.flags.spilled=true;M.spillLines=C.st.lines;
  const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.stinger('win')}catch(e){}
  S.say('tre',"(long breath) ...Okay. Okay. Storage place on Industrial. Discount Storage Unlimited. Unit forty-seven.",{cam:'treClose'})
   .say('tre',"The guy who runs it takes everything. Leaf blowers. Bikes. A kayak, once. I just text him when somebody leaves a garage open.",{cam:'tre'})
   .run(()=>noteIt(M,'Unit 47 · Discount Storage Unlimited, Industrial Way'))
   .say('gary',"(writing fast) Unit forty-seven.",{cam:'gary'})
   .say('tre',M.burgers?"...Can I stay for a second burger?":"...Is that burger for anybody?",{cam:'tre'})
   .say('dave',"Kid, there's always a second burger.",{cam:'dave'})
   .run(()=>{a.addTrust(4,'maple');a.addTrust(4,'river');M.V.toast('Got it: the warehouse · +4 trust, both sides','good')})
   .run(()=>milestones(M))}
function milestones(M){const C=M.cv,S=M.S,st=C.st;
  if(st.rapport>=T.name95&&!M.beats.w95){M.beats.w95=true;
    S.say('tre',"There's somebody above him. The storage guy calls him 'The Wholesaler'. Like it's a job title. I never met him. Nobody has.",{cam:'treClose'})
     .say('gary',"The Wholesaler. Capital T?",{cam:'gary'}).say('tre',"Capital everything.",{cam:'tre'}).run(()=>noteIt(M,'"The Wholesaler" (capital everything)'))}
  if(st.rapport>=T.full&&!M.full){M.full=true;M.fullLines=st.lines+st.silences;
    if(!st.flags.job)S.say('tre',"...Can I ask you something? Do you guys know anybody who's hiring? I'm good with bikes. Like, actually good.",{cam:'treClose'})
      .say('you',"I know a guy. Earl. Runs a bike library on Dock St. No patience. You'll love him.",{cam:'dad'}).run(()=>{st.flags.job=true;noteIt(M,'Earl. Bike library. Saturdays.')});
    S.run(()=>{M.beats.job=true;M.V.toast('Rapport 100 · Tre is going to be fine','good')});return S.run(()=>outro(M))}
  S.run(()=>round(M))}

const SHORT={"Mrs. Patel's leaf blower (pulls left)":'Leaf blower',"Last meal: one Wednesday taquito":'Taquito',"Cousin: bad influence. Feet: hurt.":'Cousin',
  "Zip-ties off (we're the good guys)":'Zip-ties',"Fixes bikes. Trued a wheel with a zip-tie once.":'Bikes',"Earl. Bike library. Saturdays.":'Earl, Saturdays',"Retriever commercial (rough)":'Retriever commercial',
  "Drove to the wrong state (Florida)":'Florida',"Tre's mom: Pill Hill Pharmacy parking lot, radio off":'Pill Hill Pharmacy parking lot',"Cheese (correct)":'Cheese','"The Wholesaler" (capital everything)':'The Wholesaler'};
/* ---------------- the end of the scene: Gary's notes, the second burger, back to the van ---------------- */
function outro(M){const a=A(),C=M.cv,S=M.S;M.ph='outro';
  const last=M.notes.filter(n=>SHORT[n]).slice(-2).map(n=>SHORT[n]);
  S.say('you',M.full?"Thanks, Tre. Go see Earl on Saturday. Tell him a dad sent you. He'll groan. That means yes.":"Thanks, Tre. Really. Eat your burger.",{cam:'dad'})
   .say('gary',"Unit forty-seven. "+(last.length?last.join('. ')+'. ':'')+"Got it all.",{cam:'gary'})
   .run(()=>{M.V.notes("Gary's notes · Tre",M.notes,M.full?'Rapport 100 in '+M.fullLines+' lines':'Rapport '+C.st.rapport+' · '+C.st.lines+' lines');const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.music('victory')}catch(e){}})
   .say('dave',"Second burger's up. Kid, you want to learn how to grill?",{cam:'dave'})
   .say('tre',"...Yeah. Okay. Yeah.",{cam:'wide'})
   .wait(1.2).run(()=>standUp(M))}
function standUp(M){const a=A(),L_=lay();M.seated=false;M.ph='free';M.score=M.cv?M.cv.st.rapport:0;M.lines=M.cv?M.cv.st.lines:0;
  if(M.V){M.V.unmount();M.V=null}M.S=null;M.D=null;M.spk=null;a.equip(a.P.dude,a.P.cur);if(M.fpWas){a.P.fp=true;M.fpWas=false}
  a.P.pos.set(L_.dad.x+.6,0,L_.dad.z+.7);a.collide(a.P.pos,.35);a.P.yaw=Math.atan2(-(M.car.pos.x-a.P.pos.x),-(M.car.pos.z-a.P.pos.z));
  /* Tre stays: he's learning to grill */
  M.exitOpen=true;a.radio('gary',M.full?"Tre's coming Saturday. Earl's going to pretend he's annoyed.":"Good work. I'll start a folder for Industrial Way.",true)}

/* ---------------- cameras: two people at a table, Dave behind you at the grill, Gary with his notes ---------------- */
function shots(){const L_=lay(),t=L_.table,tr=L_.tre,dd=L_.dad,gr=L_.grill,dv=L_.dave,gy=L_.gary;/* +z = the street side, +x = Linden Ave */
  return{wide:{eye:{x:t.x+.5,y:1.7,z:t.z+5.2},at:{x:t.x+.7,y:.95,z:t.z-.3},drift:{x:-.5,y:0,z:-.6},fov:48,dur:9},
    tre:{eye:{x:dd.x+.5,y:1.42,z:dd.z+1.0},at:{x:tr.x+.1,y:.74,z:tr.z-.18},drift:{x:-.15,y:0,z:-.12},fov:40,dur:10},
    treClose:{eye:{x:dd.x+.05,y:1.2,z:dd.z+.8},at:{x:tr.x,y:1.12,z:tr.z-.05},drift:{x:-.1,y:0,z:-.08},fov:27,dur:10},
    dad:{eye:{x:tr.x-.5,y:1.32,z:tr.z+1.0},at:{x:dd.x+.15,y:1.05,z:dd.z-.15},drift:{x:.15,y:0,z:-.1},fov:38,dur:9},
    dadTough:{eye:{x:dd.x-.35,y:.95,z:dd.z+.95},at:{x:dd.x,y:1.22,z:dd.z},drift:{x:.08,y:0,z:-.1},fov:32,dur:5},
    dave:{eye:{x:gr.x-1.9,y:1.12,z:gr.z+1.0},at:{x:dv.x,y:1.2,z:dv.z},drift:{x:.2,y:.05,z:-.2},fov:40,dur:8},
    daveTable:{eye:{x:t.x+.9,y:1.55,z:t.z+3.3},at:{x:t.x+.2,y:1.05,z:t.z-.3},drift:{x:-.3,y:0,z:-.3},fov:48,dur:8},
    gary:{eye:{x:gy.x-.9,y:1.55,z:gy.z+2.1},at:{x:gy.x+.1,y:1.4,z:gy.z},drift:{x:-.15,y:0,z:-.2},fov:34,dur:8}}}
function camFor(who){return who==='tre'?'tre':who==='you'?'dad':who==='dave'?'dave':who==='gary'?'gary':'wide'}
function cut(M,name){if(!M.D)return;const s=shots()[name]||shots().wide;if(M.shot===name&&M.D.t<4)return;M.shot=name;M.D.cut(s)}
const pick=a=>a[Math.floor(Math.random()*a.length)];

/* ---------------- the scripted player for dev/jobs-check.js ----------------
   Human-ish: reads each line at normal speed, takes 1.6-3.2 s to choose, reads Tre's mood and picks the register that lands,
   uses the grill when the burgers are ready, takes the follow-ups, cuts the zip-ties, keeps going for Rapport 100.
   o.fail: plays the Bad Cop until Dave runs out of buns (skips lines to stay inside the harness's frame budget). o.fast: skips lines. */
function bot(a,t,o){const M=a.M,P=a.P;if(!M||M.state!=='go'||!M.ph)return null;const L_=lay(),B=M.bot||(M.bot={});
  if(a.CV){a.exitCar();return null}
  if(M.ph==='walk'){B.walk=(B.walk||0)+1;if(B.walk<40)return null;/* a beat to look around, then walk up and sit */
    if(Math.hypot(P.pos.x-L_.dad.x,P.pos.z-L_.dad.z)>1.6){P.pos.set(L_.dad.x+.9,0,L_.dad.z+1.1);a.collide(P.pos,.35);return null}a.useTap=true;return null}
  if(M.ph==='free'){const e=M.car;P.pos.set(e.pos.x+2.5,0,e.pos.z);a.collide(P.pos,.35);a.useTap=true;return null}
  const V=M.V;if(!V)return null;
  if((o.fail||o.fast)&&V.typing)V.skip();
  if(!V.choice){B.think=null;return null}
  if(B.think==null)B.think=Math.round(60*(o.fail||o.fast?.05:T.think[0]+((t*7919)%100)/100*(T.think[1]-T.think[0])));
  if(B.think-->0)return null;B.think=null;
  const list=V.choice.list,C=M.cv,mood=C.st.mood,best=C.best();let k=-1;
  const idx=f=>list.findIndex(f);
  if(o.fail){k=idx(c=>c.reg==='tough');if(k<0){const row=window.HT.Social.TABLE[mood];let lo=1e9;list.forEach((c,i)=>{if(c.kind!=='line')return;const l=c.line;if(l.custom||l.sure||l.reg==='special')return;const r=row[l.reg];const v=(r?r[0]-r[1]:0)+(l.land?l.land*30:0)-(l.again?12:0);if(v<lo){lo=v;k=i}})}if(k<0)k=idx(c=>c.kind==='line'&&!c.line.custom&&!c.line.sure)}
  else{const ready=M.cook>=T.ready&&M.cook<T.burnt;
    if(M.full)k=idx(c=>c.kind==='wrap');
    if(k<0&&ready)k=idx(c=>c.kind==='grill');
    if(k<0)k=idx(c=>c.kind==='line'&&(c.line.reg==='special'||c.line.id==='r_ties'||c.line.id==='r_earl'||(c.line.id==='r_ask'&&C.st.rapport>=55)));
    if(k<0&&best)k=idx(c=>c.kind==='line'&&c.line.reg===best&&c.line.id!=='r_ask');
    if(k<0&&mood==='friendly')k=idx(c=>c.kind==='line'&&c.line.reg!=='tough'&&c.line.id!=='r_ask');
    if(k<0&&M.ph==='after'&&C.st.lines>16)k=idx(c=>c.kind==='wrap');
    if(k<0)k=idx(c=>c.kind==='line'&&c.line.reg==='comp');
    if(k<0)k=idx(c=>c.kind==='line'&&c.line.reg!=='tough');}
  if(k<0)k=0;B.picks=(B.picks||[]);B.picks.push(list[k].kind==='line'?list[k].line.id+'@'+mood:list[k].kind);V.choose(k);return null}
})();
