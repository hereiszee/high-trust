/* =====================================================================
   GRAND OPENING (SPEC3 2.7): infiltration without firing a shot. Pastor Dee's strand 1/2. Built on HT.Social: the conversation
   engine (js/social.js, Small Talk) and its disguise / cover / politeness section (written with this job).
   Cash-4-Yer-Stuff ("WE BUY · NO QUESTIONS ASKED") is having its grand opening on Main St: balloons, a ribbon, free hot dogs and
   DJ Layaway, who has one song. Its buy ledger, in the back office, is full of the names of Riverside kids being paid to steal.
   Park down the block, pick a disguise out of the back of the van (Local Press: lanyard and camera; DJ's Cousin: cap on backwards;
   Mustache: a mustache), and crash the party. Nobody calls you out, because everybody is far too polite.
   COVER (the ring meter) drops when people watch you do weird things: run, crouch, hang around the STAFF ONLY door, walk where staff
   walk, carry the book, let the mustache slip (G fixes it). It climbs back while you mingle, faster inside a crowd, and every good
   bit of small talk (E on anyone: three lines, one is a dad joke; read their mood in brackets) adds a chunk. Under 35% the person
   watching gets a politeness timer ("…"): walk away, talk to them or fix your cover before it runs out ("Excuse me…").
   Ways past Denise at the staff door: hold Marco's ladder ("balloon emergency"), Vince's photo op with the giant scissors (VIP),
   a song request (DJ Layaway's one song: Denise has to dance), the pigs in blankets, or the raffle. In the office: photograph three
   pages of the ledger (hold E) and/or take the whole book (it counts double, and you're a man carrying a ledger). Out the front
   door during the raffle. No guns: def.noGuns, and the job is FAIL-SOFT: cover 0 = "Sir, I'm going to have to ask you to leave."
   Stages ([CP]): party (at the van: pick or change a disguise) -> office (you're in the back room) -> exit (you have it: walk out).
   Ending: the ledger names nine kids. Dee doesn't hand it to anyone; she visits their families. The shop closes within a week and
   the storefront becomes Ramos Bakery (SAVE.world.storefronts.pawn = 'bakery', drawn in the hub by this file). flags.pawnNames = 9
   (Crossing Guard: +1 Riverside trust per name in its line).
   Files: js/jobs/pawn.js, js/social.js (section "---- disguise ----"). Tests: node dev/jobs-check.js pawn --retry --replay --shots,
   node dev/jobs/pawn-unit.js (cover rules, Node), node dev/jobs/pawn.js [--shots] (real mouse and keyboard, human pacing).
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api,H=()=>window.__ht||{};
/* the conversation engine and its stylesheet (shared with Small Talk; loaded once) */
(function(){const d=typeof document!=='undefined'?document:null;if(!d||!d.head||!d.createElement)return;
  if(!(window.HT.Social&&HT.Social.view)&&!d.getElementById('ht-social-js')){const s=d.createElement('script');s.id='ht-social-js';s.src='js/social.js';d.head.appendChild(s)}
  if(!d.getElementById('ht-social-css')){const l=d.createElement('link');l.id='ht-social-css';l.rel='stylesheet';l.href='css/social.css';d.head.appendChild(l)}})();
const SOC=()=>window.HT&&HT.Social&&HT.Social.cover&&HT.Social.view?HT.Social:null;

/* ---------------- tuning ---------------- */
const K={sight:10,fov:1.9,staffFov:2.1,crowdR:2.5,loiterR:2.3,loiterT:3,runV:5.2,
  choice:11,choiceTouch:15,talkR:2.4,walkOff:3.4,walkOffPen:-.05,
  ladder:3,pagesHold:{press:.9,other:1.5},pages:3,book:-.3,
  canapeT:17,canapeCd:45,canapeR:15,songT:28,raffleT:32,raffleR:30,
  denisePost:{x:355.25,z:32.95},backX0:354,backX1:362,backZ0:26,backZ1:30.4,
  photo:{period:2.3,green:[.62,.86],tries:3},
  par:420,gold:300,pay:{never:250,both:100},neverMin:.4,
  slipFirst:4,visitAt:9,eatSlip:.6,fixPen:-.015,recogR:8,leash:42};
const hyp=Math.hypot,clamp=(v,a,b)=>v<a?a:v>b?b:v,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const yawTo=(dx,dz)=>Math.atan2(dx,dz);/* character convention: forward = (sin yaw, cos yaw) */
const pickN=(a,n)=>a[((n%a.length)+a.length)%a.length];

/* ---------------- the block (metres). Site pawn: back lot z20-24, back office x354-362 z26-30 (desk and ledger at the east end),
   STAFF ONLY door x356-358 at z30-32, shop floor x354-362 z32-36, front doors x356-360 at z36-38, sidewalk z38-40, Main St z40-46 ---------------- */
const S={door:{x:358,z:37.2},staffDoor:{x:357,z:31.1},ledger:{x:361.05,z:26.35},desk:{x:360.35,z:27.45},
  van:{x:337,z:43},party:{x0:345.4,x1:373.2,z0:38.1,z1:43.6},
  arch:{x0:355.25,x1:360.75,z:38.32,h:2.92},ribbon:[{x:355.6,z:38.75},{x:360.4,z:38.75}],ladder:{x:361.55,z:38.95},
  canape:{x:351.2,z:39.05},raffle:{x:364.6,z:39.05},dj:{x:368.55,z:41.3},djMan:{x:369.55,z:41.3},speakers:[{x:368.35,z:39.75},{x:368.35,z:42.85}],
  dance:{x:364.6,z:41.9},hotdog:{x:349.1,z:41.65},tube:{x:371.9,z:39.3},board:{x:353.55,z:39.55},
  photoV:{x:358,z:39.25},photoP:{x:358,z:42.35},balloonBox:{x:355.3,z:27.1},
  stage:{x:364.6,z:39.75}};
const inBack=(x,z)=>x>K.backX0&&x<K.backX1&&z>K.backZ0&&z<K.backZ1;
const inShop=(x,z)=>x>354&&x<362&&z>=K.backZ1&&z<36.2;
const nearStaffDoor=(x,z)=>hyp(x-S.staffDoor.x,z-(S.staffDoor.z+1.2))<K.loiterR;

/* ---------------- the cast ----------------
   kind: guest | staff | boss | dj | vendor. key: the People model (neighbours and street-crew looks, the existing pools).
   at: home spot, face: what they look at, mood (their tell decides which register lands), chat: what they say when you walk up. */
const COL={you:'#6fb8ff',dee:'#c9a7ff',denise:'#ff9a8a',marco:'#ffd27a',kev:'#9fe58a',vince:'#ffb86b',dj:'#7fe0ff',guest:'#e8e2d4',vendor:'#f2c230'};
const CAST=[
  /* staff: red STAFF lanyards */
  {id:'denise',kind:'staff',key:'thug_f_leather',name:'Denise',at:K.denisePost,face:{x:358,z:36},mood:'bored',voice:{kind:'dad',pitch:1.45}},
  {id:'marco',kind:'staff',key:'thug_track',name:'Marco',at:{x:362.25,z:39.55},face:{x:360,z:38.4},mood:'scared',voice:{kind:'thug',pitch:1.15}},
  {id:'kev',kind:'staff',key:'thug_hoodie',name:'Kev',at:{x:364.6,z:38.35},face:{x:364.6,z:41},mood:'bored',voice:{kind:'thug',pitch:1.25}},
  {id:'vince',kind:'boss',key:'thug_jacket',name:'Vince',at:{x:358.6,z:39.7},face:{x:358,z:43},mood:'friendly',voice:{kind:'dad',pitch:.86}},
  {id:'dj',kind:'dj',key:'thug_fro',name:'DJ Layaway',at:S.djMan,face:{x:362,z:41.3},mood:'friendly',voice:{kind:'thug',pitch:1.05}},
  {id:'hotdog',kind:'vendor',key:'nb_pops',name:'Hot Dog Hal',at:{x:349.1,z:40.55},face:{x:349.1,z:43},mood:'friendly',voice:{kind:'dad',pitch:.9}},
  /* guests: groups on the sidewalk and the closed lane, two inside */
  {id:'gloria',kind:'guest',key:'nb_gran',name:'Gloria',at:{x:350.2,z:42.6},face:{x:349.1,z:41.7},mood:'bored',grp:'dogs'},
  {id:'tomas',kind:'guest',key:'thug_brown',name:'Tomas',at:{x:348.0,z:42.7},face:{x:349.1,z:41.7},mood:'defensive',grp:'dogs'},
  {id:'mei',kind:'guest',key:'nb_mei',name:'Mei',at:{x:351.6,z:40.6},face:{x:351.2,z:39.1},mood:'friendly',grp:'snacks'},
  {id:'darnell',kind:'guest',key:'nb_marcus',name:'Darnell',at:{x:352.9,z:40.9},face:{x:351.2,z:39.1},mood:'scared',grp:'snacks'},
  {id:'priya',kind:'guest',key:'nb_office',name:'Priya',at:{x:355.6,z:41.2},face:{x:357.2,z:41.5},mood:'defensive',grp:'front'},
  {id:'walt',kind:'guest',key:'nb_sweater',name:'Big Walt',at:{x:357.3,z:41.9},face:{x:355.6,z:41.2},mood:'bored',grp:'front'},
  {id:'kenji',kind:'guest',key:'nb_kenji',name:'Kenji',at:{x:363.2,z:42.6},face:{x:364.6,z:41.9},mood:'friendly',grp:'dance',dancer:true},
  {id:'lucia',kind:'guest',key:'nb_lucia',name:'Lucia',at:{x:365.6,z:42.9},face:{x:364.6,z:41.9},mood:'bored',grp:'dance',dancer:true},
  {id:'jaylen',kind:'guest',key:'thug_red',name:'Jaylen',at:{x:365.9,z:41.0},face:{x:364.6,z:41.9},mood:'defensive',grp:'dance',dancer:true},
  {id:'tasha',kind:'guest',key:'nb_teen',name:'Tasha',at:{x:363.4,z:40.9},face:{x:364.6,z:41.9},mood:'scared',grp:'dance',dancer:true},
  {id:'ray',kind:'guest',key:'thug_beanie',name:'Ray',at:{x:366.2,z:39.75},face:{x:364.6,z:39.1},mood:'bored',grp:'raffle'},
  {id:'odette',kind:'guest',key:'thug_f_hood',name:'Odette',at:{x:355.7,z:34.75},face:{x:354.4,z:34.6},mood:'friendly',grp:'shop'},
  {id:'mr_b',kind:'guest',key:'thug_cap',name:'Mr. Benitez',at:{x:360.4,z:34.4},face:{x:360.4,z:32.6},mood:'defensive',grp:'shop'}];
const KEYS=[...new Set(CAST.map(c=>c.key))];
const ROLE_NAME={denise:'Denise (staff)',marco:'Marco (staff)',kev:'Kev (staff)',vince:'Vince (manager)',dj:'DJ Layaway',hotdog:'Hot Dog Hal'};

/* ---------------- the disguises (cover rules in js/social.js: HT.Social.DISGUISES) ---------------- */
const LOOK={
  press:{label:'Local Press',key:'1',blurb:'Lanyard and a camera. Photos are normal for you. Back rooms are not: staff areas cost you more.',tell:'lanyard',fix:'Flip your lanyard back',slipLine:"Your lanyard flipped. The back says 'VISITOR'.",item:'Camera'},
  cousin:{label:"DJ's Cousin",key:'2',blurb:"Cap on backwards. Staff areas are easier and everyone wants to talk about music. You don't know any music.",tell:'cap',fix:'Turn your cap back around',slipLine:'Your cap turned sideways. Nobody wears it sideways. Not since 2003.',item:'Phone'},
  mustache:{label:'Mustache',key:'3',blurb:"Just a fake mustache. Everybody can tell, and nobody says anything. It slips. G fixes it.",tell:'mustache',fix:'Straighten your mustache',slipLine:'Your mustache is crooked.',item:'Phone'}};

/* ---------------- lines ---------------- */
const L={
  noGuns:"No guns. It's a grand opening. There's a ribbon. There are pigs in blankets.",
  arrive:[['dee',"Okay. That's the place. Balloons, a DJ, free hot dogs, and a back office full of names that shouldn't be in anybody's book."],
    ['dee',"No guns, no shouting, and if anyone asks, you're with the Riverside Gazette. We don't have a Gazette. Make one up."],
    ['dee',"Your disguises are in the back of the van. I did my best. My best was a craft store."]],
  picked:{press:[['you',"Riverside Gazette. Est. ...this morning."],['dee',"Lanyard says PRESS. Act like you've been asked to leave places before."]],
    cousin:[['you',"Cap backwards. I'm the DJ's cousin. From the thing."],['dee',"What thing?"],['you',"The thing. Everybody has a thing."]],
    mustache:[['you',"Just the mustache."],['dee',"Just the mustache. Bold. Everybody will know. Nobody will say a word. That's the whole neighbourhood in one disguise."]]},
  coverTut:['dee',"See that ring? That's your cover. Running, crouching, hanging round the staff door, people notice. Mingle and it comes back. Talk to folks, E, and it comes back faster."],
  fixTut:{press:['dee',"Your lanyard's already twisted. Press G to fix it. You'll have to, now and then."],cousin:['dee',"Your cap's crooked already. G to fix it. Check it now and then."],
    mustache:['dee',"Your mustache is already crooked. Press G to straighten it. It will slip. It's a craft-store mustache."]},
  fixed:["(pat pat) There.","Good as new. Roughly.","(smooths it) Nobody saw that.","Fixed. Probably."],
  firstTalk:['dee',"Good. Now get past the staff door. Denise is watching it. Find somebody at this party who can get you back there, or give Denise a reason to leave."],
  routes:['dee',"Marco's fighting the balloon arch. Vince wants his picture taken. The DJ takes requests. And I hear the pigs in blankets are very persuasive."],
  inBack:['dee',"You're in. Ledger's on the desk. Pictures of three pages, or take the whole book. The book's better. It's also a book. People notice books."],
  havePages:['dee',"Three pages. That's names, dates, what they brought in. That's enough. Walk out like you came for the hot dogs."],
  haveBook:['dee',"The whole book. Okay. Hold it like a menu. Walk like a man who's been handed a menu."],
  raffleCall:['vince',"OKAY EVERYBODY! RAFFLE TIME! Gather round! Gather ROUND! No questions asked!"],
  raffleEarly:['vince',"You want the raffle NOW? ...Why not! It's my party! RAFFLE TIME, EVERYBODY!"],
  raffleWin:[['vince',"And the winning ticket is... four... oh... SEVEN!"],['kev',"...That's the only ticket we sold."],['vince',"WINNER! A beautiful leaf blower! Pulls a little left!"]],
  raffleLose:[['vince',"And the winning ticket is... four oh seven! Four oh seven? ...Nobody? Kev, how many did we sell?"],['kev',"None, Vince."],['vince',"Then I win! I win the leaf blower!"]],
  outside:['dee',"You're out. Keep walking. Don't look back. Don't wave at anybody you interviewed."],
  blown:['vince',"Sir. Sir. I'm going to have to ask you to leave."],
  blownFail:"\"Sir, I'm going to have to ask you to leave.\" Vince walks you to the curb, very politely, and hands you a free hot dog for the road. Dee picks you up at the van: new disguise, new try.",
  leashFail:"You wandered off from the party and the party wandered on without you.",
  ending:[['dee',"You did that without firing a shot. I'm adding you to the prayer list. The good one."],
    ['dee',"Nine names in that book. Kids. I'm not giving it to anybody. I'm going to knock on nine doors and sit at nine kitchen tables."]],
  /* ambient: what people say near you, over their heads */
  barkMustache:["Love the... uh. Great event.","(whispering) Is that... a mustache?","Nice... yes. Hi.","Didn't you coach my kid in— no. Never mind.","Is he okay? He seems okay.","Bold look. Very bold."],
  barkPress:["Are you doing a story? Get my good side.","The Gazette? I didn't know we had a Gazette.","Is this going in the paper? I'll buy ten."],
  barkCousin:["DJ's cousin! Love your cousin! ...Is he your cousin?","Tell him to play something else. Anything else.","You two look alike. Around the... cap."],
  barkCrooked:["Your mustache is crooked.","Sir, your... lip... thing.","(points at own lip, then at yours)","It's... migrating."],
  barkRun:["Whoa. Where's the fire?","Is there a sale? Is somebody running for a sale?"],
  barkCrouch:["Did you drop something?","...Are you okay down there?","Is he tying his shoe? For a long time?"],
  barkLoiter:["Bathroom's not back there, hon.","Are you waiting for somebody? By the... staff door?"],
  barkCarry:["Is that a ledger? Are you an accountant? You don't look like an accountant.","Nice book. Is it a good book?"],
  barkStaff:["Is he... is that... no, it's fine. It's fine. Probably fine.","Hmm. ...Hm. Okay.","Is he supposed to be... I'm sure he's supposed to be."],
  politeStart:["Is he... is that... no, it's fine. It's fine. Probably fine.","Hm. Should I say something? I shouldn't say something.","(tilts head) ...Okay. Okay okay okay.","I'm not going to say anything. ...Should I say anything?"],
  excuse:["Excuse me... sir? Sorry. Sorry, it's nothing. It's not nothing.","Excuse me. Hi. Sorry. Hi.","Um. Excuse me? No, sorry, I'm sure it's fine."],
  politeCancel:["...Nah, it's fine.","Never mind. Great party.","(goes back to the hot dog)"],
  recog:{press:"Didn't you just... have a lanyard?",cousin:"Weren't you... the DJ's cousin? With the hat?",mustache:"Weren't you... with a... (points at upper lip)"},
  dj:["This is DJ LAYAWAY, live from Cash-4-Yer-Stuff! Everything must go! Except the stuff! We BUY the stuff!","Make some noise if you've got a receipt! ...Nobody? Love that!",
    "Shout out to Vince! Vince, make some noise! ...Vince is busy. Vince is always busy.","This one goes out to everybody who had a bike! ...Had.","Airhorn! (BWAAAP) ...Airhorn!","Free hot dogs at the cart! Don't ask where the hot dogs came from!"],
  vince:["Welcome! Welcome! Everybody's welcome! No questions asked!","Gold, tools, electronics, bikes! We buy it! We don't ask!","Has everybody had a hot dog? Hal, give that man a hot dog!"],
  song:[['dj',"...I have one song."],['dj',"This one's going out to... (squints) ...the cousin! Or the press! Or the mustache!"]],
  songDenise:['denise',"Oh, this is MY SONG. (to nobody) I'm on my break."],
  canapeCall:['you',"PIGS IN BLANKETS! Fresh out! Hot! ...Get 'em while they're... pigs!"],
  canapeDenise:['denise',"Pigs in blankets? ...I'm on my break."],
  ladderPop:[['marco',"OKAY HOLD IT HOLD IT HOLD IT—"],['marco',"(POP) ...That's fine. That one was a spare."]],
  ladderDone:[['marco',"YES. The arch lives. Thanks, man. Listen: if Denise gives you any trouble, tell her it's a balloon emergency."],['marco',"She takes balloons very, very seriously."]],
  vip:[['vince',"Beautiful. BEAUTIFUL. You know what? You're VIP. Bathroom's past my office. Don't touch the safe."],['vince',"HA! Kidding. Don't."]],
  photoOk:['you',"Say 'no questions asked'!"],photoVince:['vince',"NO QUESTIONS ASKED!"],
  blink:["He blinked.","He's mid-sentence. Again.","The scissors are covering his face.","He's doing a thumbs-up with the scissors. Dangerous."],
  deniseCaught:"You're not supposed to be back here.",
  backroomVisit:{marco:"Just grabbing balloons. Don't mind me. ...Wait. Who are you?",kev:"Vince wants the raffle tickets. They're— hey. Who are you?"},
  backroomOk:{marco:"Oh hey, balloon guy! Bathroom's not in here, man. Gas station.",kev:"Oh. VIP. Cool. Bathroom's not in here, though. Gas station."},
  carryWarn:"You're carrying the book. Anybody who sees you is looking at the book."};

/* ---------------- small talk: one exchange each (three lines, one a dad joke; a fourth from your disguise) ----------------
   reg joke|real|over|comp; reply {hit,miss,meh}. The register that lands depends on their mood (HT.Social.TABLE). */
const TALK={
  gloria:{open:"Hot dogs are free. I've had four. I'm going to have a fifth. Is that a problem?",opts:[
    {reg:'joke',text:"Why did the hot dog turn down the job? It didn't cut the mustard.",reply:{hit:"(snorts into her hot dog) Mustard. Oh, you're terrible. Have a hot dog.",miss:"...I don't get it. Is it about mustard?"}},
    {reg:'real',text:"Do you live around here?",reply:{hit:"Forty years on 3rd St. This used to be a shoe store. Nice shoes. Real leather.",miss:"Why? Are you selling something?"}},
    {reg:'over',text:"I once ate eleven hot dogs at a cookout. I wasn't hungry. I was nervous.",reply:{hit:"(laughs) Eleven! That's my Herbert. God rest his stomach.",miss:"...Okay."}}]},
  tomas:{open:"I'm just here for the free stuff. I'm not selling anything. I don't sell. Why, who's asking?",opts:[
    {reg:'joke',text:"I'm not a pawn shop guy. I'm more of a... knight shop guy. Chess? No?",reply:{hit:"(half a laugh) Chess. Okay, that's dumb.",miss:"...What?"}},
    {reg:'real',text:"You seem nervous. You sell something here?",reply:{hit:"...My cousin's bike. He knows. Mostly.",miss:"I said I don't sell. Why does everybody ask."}},
    {reg:'over',text:"I sold my wedding band once. Bought it back the same day. My wife never knew. She knows now. I just told you.",reply:{hit:"(stares) ...Man. Okay. I sold my uncle's drill. He's still looking for it.",miss:"Why are you telling me this?"}}]},
  mei:{open:"These pigs in blankets are incredible. Who makes pigs in blankets this good at a pawn shop?",opts:[
    {reg:'joke',text:"I'd tell you a joke about pigs in blankets, but it's a little cheesy. And wrapped in pastry.",reply:{hit:"(laughing) Oh no. Oh no, that's awful. Have another one.",miss:"...Is it? Cheesy?"}},
    {reg:'real',text:"They're from the Costco on Route 9. Box of a hundred.",reply:{hit:"That makes so much sense. Honestly I'm relieved.",miss:"...Oh. Thanks. I guess."}},
    {reg:'over',text:"I've eaten twelve. I've been here nine minutes.",reply:{hit:"(delighted) Me too! Eleven! We're the same!",miss:"Okay."}}]},
  darnell:{open:"(quietly) Hey. Do you work here? Do they... check where stuff comes from?",opts:[
    {reg:'joke',text:"I hear they check everything. Twice. Then they forget.",reply:{hit:"(nervous laugh) Ha. Right. Ha.",miss:"(goes pale) Twice?"}},
    {reg:'real',text:"I don't work here. If somebody's making you sell stuff, there's a pastor on 2nd St who can help.",reply:{hit:"(long breath) ...Pastor Dee? My little brother's in her group. Okay. Okay.",miss:"I didn't say anybody's making me."}},
    {reg:'over',text:"When I was your age I pawned my dad's guitar. He found out at Thanksgiving. In front of everybody.",reply:{hit:"(small smile) ...At Thanksgiving?",miss:"Okay, that's a lot."}}]},
  priya:{open:"I'm only here because my sister made me come. I'm not buying anything. I'm not looking at anything.",opts:[
    {reg:'joke',text:"I'm only here because my sister made me come. And I don't have a sister.",reply:{hit:"(snorts) Okay. Okay, that one got me.",miss:"...Then who made you come?"}},
    {reg:'real',text:"Your sister knows the owner?",reply:{hit:"She dated the DJ. For a week. She says he only knows one song.",miss:"Why do you care who my sister knows?"}},
    {reg:'over',text:"I got dragged to a timeshare talk once. I bought the timeshare. I'm still paying for the timeshare.",reply:{hit:"(laughing) NO. How much?",miss:"...Wow. Okay."}}]},
  walt:{open:"I'm waiting for the raffle. Twenty minutes I've been waiting for the raffle.",opts:[
    {reg:'joke',text:"What's the prize? I hope it's patience. You could use it. I could use it.",reply:{hit:"(wheezes) Patience. Ha! That's good. That's good.",miss:"...The prize is a mystery."}},
    {reg:'real',text:"Do you know what the prize is?",reply:{hit:"Mystery prize. Mystery! At a pawn shop! It's somebody's leaf blower.",miss:"Mystery. It says mystery."}},
    {reg:'over',text:"I won a raffle once. A ham. I didn't have a fridge big enough. I ate the ham in the car.",reply:{hit:"(laughing) In the CAR?",miss:"That's... a ham."}}]},
  kenji:{open:"Have you heard this song? I think it's the only song. It's been on for an hour.",opts:[
    {reg:'joke',text:"It's a great song. It's got a lot of... repeat value.",reply:{hit:"(laughs) Repeat value! He should put that on his card.",miss:"Ha. Sure."}},
    {reg:'real',text:"I'm going to ask him for something else.",reply:{hit:"Please. Please do. Anything. A ringtone. A car alarm.",miss:"He'll just play this again."}},
    {reg:'over',text:"I had this song at my wedding. We got divorced. Not because of the song. Partly the song.",reply:{hit:"(laughing) Partly the song!",miss:"...Sorry?"}}]},
  lucia:{open:"I came for the balloons. I stayed for... I don't know why I stayed.",opts:[
    {reg:'joke',text:"I stayed for the balloons too. I'm very attached. Like a string.",reply:{hit:"(snorts) Like a string. Okay. That's stupid. I liked it.",miss:"...Okay."}},
    {reg:'real',text:"It's nice to have something happening on Main St, at least.",reply:{hit:"It is. I just wish it was a bakery. We need a bakery.",miss:"I guess. It's a pawn shop."}},
    {reg:'over',text:"I own forty-two balloons' worth of feelings about this party.",reply:{hit:"(laughing) What does that even mean? Same, though.",miss:"Huh."}}]},
  jaylen:{open:"Why are you dancing near me? I'm not dancing. This is just how I stand.",opts:[
    {reg:'joke',text:"I'm not dancing either. My knees just do this. Unprompted.",reply:{hit:"(grins despite himself) Your knees are dancing, man.",miss:"...Okay, step back."}},
    {reg:'real',text:"Sorry. Didn't mean to crowd you.",reply:{hit:"It's fine. Just... this song.",miss:"Then don't."}},
    {reg:'over',text:"I took a dance class with my wife. I was the worst in the class. There were seniors. They were better.",reply:{hit:"(laughing) The SENIORS?",miss:"Why would you say that out loud?"}}]},
  tasha:{open:"(holding a balloon) Is it okay that I'm here? My mom's inside. She's selling a TV.",opts:[
    {reg:'joke',text:"What did the balloon say to the cactus? Nothing. It ran.",reply:{hit:"(giggles) It ran. It doesn't have legs!",miss:"...That's sad. For the balloon."}},
    {reg:'real',text:"Of course it's okay. There's hot dogs. Hot dogs mean everybody's okay.",reply:{hit:"(relaxes) ...Okay. Can I have two?",miss:"I don't really like hot dogs."}},
    {reg:'over',text:"I sold my Walkman here once. Well, not here. It was a shoe store then. It's complicated.",reply:{hit:"What's a Walkman?",miss:"...What?"}}]},
  ray:{open:"Raffle tickets are five bucks. Five bucks for a mystery. I don't buy mysteries.",opts:[
    {reg:'joke',text:"I bought a mystery once. Still don't know what it was.",reply:{hit:"(barks a laugh) Still don't know! Ha! Good one.",miss:"...That's how mysteries work."}},
    {reg:'real',text:"Smart. What do you think the prize is?",reply:{hit:"Leaf blower. Saw Kev carry it in. It pulls left.",miss:"Don't know. Don't care."}},
    {reg:'over',text:"I've bought eleven raffle tickets this year. I won a ham. I ate it in the car.",reply:{hit:"(laughs) Walt won a ham like that! Was it you? Are you Walt?",miss:"...Okay."}}]},
  odette:{open:"Look at all this stuff. Somebody's toolbox. Somebody's drill. Somebody's... everybody's.",opts:[
    {reg:'joke',text:"I like that drill. It's very... boring.",reply:{hit:"(laughs) Boring! That's terrible! Okay, okay.",miss:"...It is a drill."}},
    {reg:'real',text:"Feels like half of it came from up the street.",reply:{hit:"(quiet) That's my neighbour's drill. It's got his name on it. In marker.",miss:"Don't say that so loud."}},
    {reg:'over',text:"I tried to sell my kid's drum kit here. To get some quiet. The guy laughed at me.",reply:{hit:"(laughing) I would've bought it just to throw it out!",miss:"...That's mean."}}]},
  mr_b:{open:"These prices. These are not prices. These are suggestions.",opts:[
    {reg:'joke',text:"I asked how much for the watch. He said 'time will tell'.",reply:{hit:"(chuckles) Time will tell. Ha. Should be free, then.",miss:"Nobody said that."}},
    {reg:'real',text:"You looking for something?",reply:{hit:"My grandson's bike. Red. Bell on it. It's not here. Good.",miss:"Why? Do you work here? You don't work here."}},
    {reg:'over',text:"I priced my own lawnmower in here. It's the one by the door. It was in my garage on Tuesday.",reply:{hit:"(turns) ...Yours too? My hedge clippers are on that shelf.",miss:"...I'm going to look at something else."}}]},
  hotdog:{open:"Free hot dogs! Free! Don't ask why they're free. Vince says don't ask. So I don't ask.",opts:[
    {reg:'joke',text:"Free hot dogs? I'd relish the opportunity.",reply:{hit:"(points the tongs at you) RELISH. Okay! You get the good one!",miss:"We don't have relish."}},
    {reg:'real',text:"Who's paying for all of this?",reply:{hit:"(quiet) ...I don't ask. Vince says the stuff pays for itself.",miss:"Nobody asks! That's the point!"}},
    {reg:'over',text:"I worked a hot dog cart in college. I still dream about it. In the dream the hot dogs are mad at me.",reply:{hit:"(laughs) They ARE mad! They know!",miss:"...Have a hot dog."}}]}};
/* the fourth line: your disguise's own way in (Press interviews, the Cousin talks music, the Mustache just... strokes the mustache) */
const SPECIAL={
  press:{reg:'special',as:'real',tag:'Interview',text:"Riverside Gazette. Mind if I quote you?",custom:C=>({dr:C.st.mood==='friendly'||C.st.mood==='bored'?14:C.st.mood==='scared'?-2:6}),
    reply:{hit:"Oh! Sure! Quote me! Spell it right!",meh:"Uh... I guess? Don't use my name.",miss:"No. No quotes. Why would you quote me?"}},
  cousin:{reg:'special',as:'joke',tag:'Talk music',text:"My cousin's the DJ. He's got a lot of range. One song of range.",custom:C=>({dr:C.st.mood==='bored'||C.st.mood==='friendly'?14:C.st.mood==='defensive'?6:2}),
    reply:{hit:"(laughing) ONE song of range! Tell him I said hi. And to stop.",meh:"...Huh. Okay.",miss:"I don't want to talk about the music."}},
  mustache:{reg:'special',as:'comp',tag:'The Mustache',text:"(stroke the mustache. Nod slowly. Say nothing.)",custom:()=>({dr:11,da:0}),
    reply:{hit:"(very politely not looking at the mustache) ...Great event. Great. Yeah.",meh:"(very politely not looking) ...Yeah.",miss:"..."}}};
/* staff, the manager, the DJ: special scenes (built in chatFor) */

/* ---------------- small helpers ---------------- */
const tone=o=>{try{const Au=window.HT&&HT.Audio;if(Au&&Au.tone)Au.tone(o)}catch(_){}};
const AU=()=>{const Au=window.HT&&HT.Audio;return Au&&Au.ready?Au:null};
function music(st,i){try{const Au=AU();if(Au&&Au.music)Au.music(st,i!=null?{intensity:i}:{})}catch(_){}}
function radio(who,text,front){try{A().radio(who,text,front)}catch(_){}}
function own(M,x){(M.vis.own||(M.vis.own=[])).push(x);return x}
function matC(M,col,o){const a=A();return own(M,new a.THREE.MeshStandardMaterial(Object.assign({color:a.lin(col),roughness:.7,metalness:.02},o||{})))}
function canvasTex(M,w,h,draw){const T3=A().THREE,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new T3.CanvasTexture(c);if(T3.sRGBEncoding)t.encoding=T3.sRGBEncoding;t.anisotropy=4;return own(M,t)}
function gy(x,z){try{return A().groundAt(x,z)||0}catch(_){return 0}}
/* merge simple parts into one mesh per material: [{geo, mat, x,y,z, rx,ry,rz, sx,sy,sz, col}] (col: vertex colour, needs mat.vertexColors) */
function mergeParts(M,parts,parent,o){const a=A(),T3=a.THREE,byMat=new Map();o=o||{};
  for(const p of parts){const g=p.geo.clone();const m4=new T3.Matrix4().compose(new T3.Vector3(p.x||0,p.y||0,p.z||0),new T3.Quaternion().setFromEuler(new T3.Euler(p.rx||0,p.ry||0,p.rz||0,'YXZ')),new T3.Vector3(p.sx||1,p.sy||1,p.sz||1));
    g.applyMatrix4(m4);const gi=g.index?g.toNonIndexed():g;if(gi!==g)g.dispose();if(p.col){const c=a.lin(p.col),n=gi.attributes.position.count,ca=new Float32Array(n*3);for(let i=0;i<n;i++){ca[i*3]=c.r;ca[i*3+1]=c.g;ca[i*3+2]=c.b}gi.setAttribute('color',new T3.BufferAttribute(ca,3))}
    (byMat.get(p.mat)||byMat.set(p.mat,[]).get(p.mat)).push(gi)}
  const out=[];for(const[m,gs]of byMat){let n=0;for(const g of gs)n+=g.attributes.position.count;const P_=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2),C=m.vertexColors?new Float32Array(n*3):null;let k=0;
    for(const g of gs){P_.set(g.attributes.position.array,k*3);if(g.attributes.normal)N.set(g.attributes.normal.array,k*3);if(g.attributes.uv)U.set(g.attributes.uv.array,k*2);if(C){if(g.attributes.color)C.set(g.attributes.color.array,k*3);else C.fill(1,k*3,(k+g.attributes.position.count)*3)}k+=g.attributes.position.count;g.dispose()}
    const bg=new T3.BufferGeometry();bg.setAttribute('position',new T3.BufferAttribute(P_,3));bg.setAttribute('normal',new T3.BufferAttribute(N,3));bg.setAttribute('uv',new T3.BufferAttribute(U,2));if(C)bg.setAttribute('color',new T3.BufferAttribute(C,3));bg.computeBoundingSphere();own(M,bg);
    const mesh=new T3.Mesh(bg,m);mesh.castShadow=o.shadow!==false;mesh.receiveShadow=true;parent.add(mesh);out.push(mesh)}
  for(const p of parts)if(p.tmp)p.geo.dispose();return out}
/* =====================================================================
   THE PARTY: props (merged per material), balloons (instanced), the inflatable tube guy (animated), the sawhorse line
   ===================================================================== */
function sign(M,lines,o){o=o||{};const w=o.w||512,h=o.h||256;return canvasTex(M,w,h,(g)=>{g.fillStyle=o.bg||'#b8231e';g.fillRect(0,0,w,h);
  if(o.border!==false){g.strokeStyle=o.edge||'#ffd23f';g.lineWidth=Math.max(6,h*.04);g.strokeRect(g.lineWidth/2+4,g.lineWidth/2+4,w-g.lineWidth-8,h-g.lineWidth-8)}
  g.textAlign='center';g.textBaseline='middle';const n=lines.length;
  lines.forEach((l,i)=>{const big=i===0,sz=(big?o.size||h*.34:o.size2||h*.17)*(l.s||1);g.font=(big?'900 ':'800 ')+sz+'px '+(o.font||'Arial Black, Arial, sans-serif');g.fillStyle=l.c||(big?o.fg||'#ffd23f':o.fg2||'#fff');
    const y=n===1?h/2:big?h*(o.y0||.36):h*(o.y0||.36)+(i)*h*(o.dy||.24)+h*.06;const txt=typeof l==='string'?l:l.t;
    if(o.shadow!==false){g.fillStyle='rgba(0,0,0,.35)';g.fillText(txt,w/2+3,y+3);g.fillStyle=l.c||(big?o.fg||'#ffd23f':o.fg2||'#fff')}g.fillText(txt,w/2,y,w*.92)})})}
function planeMesh(M,tex,w,h,x,y,z,ry,o){const T3=A().THREE;o=o||{};const m=own(M,new T3.MeshStandardMaterial({map:tex,roughness:o.rough!=null?o.rough:.8,metalness:0,side:o.two?T3.DoubleSide:T3.FrontSide,transparent:!!o.alpha,alphaTest:o.alpha?.5:0,emissive:o.glow?new T3.Color(1,1,1):new T3.Color(0,0,0),emissiveMap:o.glow?tex:null,emissiveIntensity:o.glow||0}));
  const g=own(M,new T3.PlaneGeometry(w,h));const me=new T3.Mesh(g,m);me.position.set(x,y,z);me.rotation.y=ry||0;me.receiveShadow=true;return me}
function buildParty(M){const a=A(),T3=a.THREE,V=M.vis,root=V.g=new T3.Group();root.name='pawnParty';a.wmAdd(root);
  const G={box:own(M,new T3.BoxGeometry(1,1,1)),cyl:own(M,new T3.CylinderGeometry(1,1,1,16)),cyl8:own(M,new T3.CylinderGeometry(1,1,1,8)),sph:own(M,new T3.SphereGeometry(1,16,12)),
    cone:own(M,new T3.ConeGeometry(1,1,16,1,true)),tor:own(M,new T3.TorusGeometry(1,.18,8,20)),hex:own(M,new T3.CylinderGeometry(1,1,1,6))};V.G=G;
  const m={wood:matC(M,'#8a6a4a',{roughness:.75}),black:matC(M,'#1b1c20',{roughness:.6}),steel:matC(M,'#b9bec4',{roughness:.3,metalness:.85}),brass:matC(M,'#c9a34a',{roughness:.3,metalness:.9}),
    white:matC(M,'#f2efe8',{roughness:.85}),red:matC(M,'#c3261f',{roughness:.6}),cloth:matC(M,'#f4f1ea',{roughness:.95}),redCloth:matC(M,'#a51d1d',{roughness:.95}),
    orange:matC(M,'#ee7d1b',{roughness:.6}),yellow:matC(M,'#f2c230',{roughness:.6}),pig:matC(M,'#c9873e',{roughness:.65}),pink:matC(M,'#d9826e',{roughness:.6}),
    grey:matC(M,'#5d6166',{roughness:.6}),rubber:matC(M,'#18181a',{roughness:.9}),vc:own(M,new T3.MeshStandardMaterial({vertexColors:true,roughness:.6,metalness:.05}))};V.m=m;
  const parts=[],P=(geo,mat,x,y,z,sx,sy,sz,rx,ry,rz,col)=>parts.push({geo,mat,x,y,z,sx,sy,sz,rx,ry,rz,col});
  const leg=(x,z,y0,h,r)=>P(G.cyl8,m.steel,x,y0+h/2,z,r||.018,h,r||.018);
  const table=(cx,cz,w,d,h,cloth,yaw)=>{const y=gy(cx,cz);P(G.box,cloth,cx,y+h-.02,cz,w,.04,d);P(G.box,cloth,cx,y+h/2-.01,cz,w+.02,h-.04,d+.02);};
  /* -- the shop front: a long vinyl banner over the windows -- */
  {const tx=sign(M,['★  GRAND OPENING  ★  NO QUESTIONS ASKED  ★'],{w:1024,h:64,size:40,bg:'#ffd23f',fg:'#b8231e',edge:'#b8231e',shadow:false});root.add(planeMesh(M,tx,11.1,.42,358,2.58,38.12,0))}
  /* -- the cut ribbon: two brass stanchions, the halves hanging, a big bow on the west post -- */
  for(const s of S.ribbon){const y=gy(s.x,s.z);P(G.cyl,m.brass,s.x,y+.02,s.z,.17,.04,.17);P(G.cyl8,m.brass,s.x,y+.52,s.z,.028,1,.028);P(G.sph,m.brass,s.x,y+1.05,s.z,.05,.05,.05);
    const dir=s.x<358?1:-1;P(G.box,m.red,s.x+dir*.12,y+.74,s.z,.035,.62,.11,0,0,dir*.42);P(G.box,m.red,s.x+dir*.32,y+.37,s.z+.02,.035,.36,.11,.25,0,dir*.08)}
  {const s=S.ribbon[0],y=gy(s.x,s.z);for(const k of[-1,1])P(G.tor,m.red,s.x+k*.11,y+.98,s.z+.01,.1,.07,.1,0,0,k*.5);P(G.sph,m.red,s.x,y+.98,s.z+.02,.045,.045,.045)}
  /* -- canapes: a table with a white cloth, two silver trays of pigs in blankets, napkins, a tent card -- */
  {const c=S.canape,y=gy(c.x,c.z);table(c.x,c.z,1.9,.78,.76,m.cloth);for(const dx of[-.45,.45]){P(G.cyl,m.steel,c.x+dx,y+.77,c.z,.3,.02,.3);
      for(let i=0;i<14;i++){const an=i*2.4,rr=.06+.2*Math.sqrt((i+.5)/14);P(G.cyl8,m.pig,c.x+dx+Math.cos(an)*rr,y+.8,c.z+Math.sin(an)*rr,.025,.11,.025,Math.PI/2,an,0);P(G.cyl8,m.pink,c.x+dx+Math.cos(an)*rr,y+.8,c.z+Math.sin(an)*rr,.019,.15,.019,Math.PI/2,an,0)}}
    P(G.box,m.white,c.x+.82,y+.79,c.z+.18,.16,.05,.16);const tc=sign(M,['PIGS IN','BLANKETS · FREE'],{w:256,h:128,bg:'#fff',fg:'#b8231e',fg2:'#333',edge:'#b8231e',size:40,size2:22,y0:.34,dy:.3,shadow:false});
    const card=planeMesh(M,tc,.32,.16,c.x,y+.9,c.z+.36,0);card.rotation.x=-.25;root.add(card)}
  /* -- the raffle table: red cloth, the drum on a crank, a mystery prize under a sheet (it's a leaf blower) -- */
  {const c=S.raffle,y=gy(c.x,c.z);table(c.x,c.z,1.7,.78,.76,m.redCloth);const dx=-.35;
    for(const k of[-1,1])P(G.box,m.brass,c.x+dx+k*.26,y+.98,c.z,.03,.42,.06);
    for(let i=0;i<6;i++){const an=i*Math.PI/3;P(G.box,m.brass,c.x+dx,y+1.15+Math.sin(an)*.2,c.z+Math.cos(an)*.2,.48,.02,.02)}
    for(const k of[-1,1])P(G.hex,m.brass,c.x+dx+k*.24,y+1.15,c.z,.2,.02,.2,0,0,Math.PI/2);
    P(G.box,m.white,c.x+dx-.05,y+1.08,c.z+.04,.07,.035,.045,.3,.4,0);P(G.box,matC(M,'#e9d9a2'),c.x+dx+.06,y+1.06,c.z-.05,.07,.035,.045,-.2,.8,0);
    P(G.cyl8,m.steel,c.x+dx+.3,y+1.15,c.z,.012,.12,.012,0,0,Math.PI/2);P(G.cyl8,m.black,c.x+dx+.36,y+1.08,c.z,.015,.14,.015);
    /* the prize: an orange leaf blower peeking out from under a sheet */
    P(G.box,m.orange,c.x+.42,y+.92,c.z-.02,.36,.26,.22);P(G.cyl8,m.orange,c.x+.42,y+.95,c.z+.3,.05,.5,.05,Math.PI/2,0,0);P(G.sph,m.cloth,c.x+.42,y+.98,c.z-.08,.3,.2,.2);
    const ts=sign(M,['RAFFLE!','$5 · MYSTERY PRIZE'],{w:256,h:160,bg:'#ffd23f',fg:'#b8231e',fg2:'#222',edge:'#b8231e',size:58,size2:24,y0:.36,dy:.32});
    const st=planeMesh(M,ts,.5,.31,c.x+.05,y+1.23,c.z-.25,0);root.add(st);P(G.box,m.black,c.x+.05,y+.92,c.z-.27,.03,.3,.03)}
  /* -- DJ LAYAWAY: folding table with a skirt, laptop, controller, two speakers on stands, a mirror ball on a pole -- */
  {const c=S.dj,y=gy(c.x,c.z);P(G.box,m.black,c.x,y+.76,c.z,.78,.04,1.9);P(G.box,m.black,c.x,y+.38,c.z,.8,.74,1.92);
    const sk=sign(M,['DJ LAYAWAY','★ EVERYTHING MUST GO ★'],{w:512,h:192,bg:'#14121c',fg:'#ff4fd8',fg2:'#7fe0ff',edge:'#7fe0ff',size:74,size2:28,y0:.4,dy:.34});
    root.add(planeMesh(M,sk,1.8,.66,c.x-.415,y+.42,c.z,-Math.PI/2,{glow:.35}));
    P(G.box,m.grey,c.x+.05,y+.8,c.z+.1,.5,.04,.62);for(const dz of[-.18,.38])P(G.cyl,m.black,c.x+.05,y+.83,c.z+dz,.1,.012,.1);
    P(G.box,m.grey,c.x+.08,y+.795,c.z-.6,.32,.02,.22);const scr=canvasTex(M,128,96,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#3a1d6e');gr.addColorStop(1,'#0e6b8a');g.fillStyle=gr;g.fillRect(0,0,w,h);
      g.fillStyle='#7fe0ff';for(let i=0;i<24;i++){const bh=8+Math.abs(Math.sin(i*1.7))*40;g.fillRect(6+i*5,h-10-bh,3,bh)}g.fillStyle='#fff';g.font='bold 12px Arial';g.fillText('ONE_SONG.mp3',8,16)});
    const sc=planeMesh(M,scr,.3,.2,c.x+.2,y+.91,c.z-.6,-Math.PI/2,{glow:.9});sc.rotation.z=-.0;sc.rotation.x=0;sc.rotation.order='YXZ';sc.rotation.y=-Math.PI/2;sc.rotation.x=-.25;root.add(sc);
    for(const s of S.speakers){const yy=gy(s.x,s.z);for(let k=0;k<3;k++){const an=k*2.094;P(G.cyl8,m.black,s.x+Math.cos(an)*.25,yy+.5,s.z+Math.sin(an)*.25,.015,1.05,.015,Math.sin(an)*.24,0,-Math.cos(an)*.24)}
      P(G.cyl8,m.black,s.x,yy+1.05,s.z,.02,.4,.02);P(G.box,m.black,s.x,yy+1.55,s.z,.42,.72,.42)}
    const cone=canvasTex(M,128,224,(g,w,h)=>{g.fillStyle='#1b1c20';g.fillRect(0,0,w,h);const ring=(cy,r)=>{const gr=g.createRadialGradient(w/2,cy,r*.1,w/2,cy,r);gr.addColorStop(0,'#555');gr.addColorStop(.25,'#111');gr.addColorStop(.85,'#2a2a2e');gr.addColorStop(1,'#777');g.fillStyle=gr;g.beginPath();g.arc(w/2,cy,r,0,6.283);g.fill()};ring(h*.7,52);ring(h*.24,24);
      g.fillStyle='#ff4fd8';g.fillRect(10,h-14,w-20,4)});
    for(const s of S.speakers)root.add(planeMesh(M,cone,.4,.7,s.x-.215,gy(s.x,s.z)+1.55,s.z,-Math.PI/2));
    P(G.cyl8,m.steel,c.x+.55,y+1.25,c.z+.95,.02,2.5,.02);const mb=new T3.Mesh(own(M,new T3.IcosahedronGeometry(.2,1)),own(M,new T3.MeshStandardMaterial({color:0xdde3ea,roughness:.12,metalness:1,flatShading:true})));
    mb.position.set(c.x+.55,y+2.45,c.z+.95);mb.castShadow=true;root.add(mb);V.mirror=mb}
  /* -- the hot dog cart: FREE HOT DOGS · DON'T ASK -- */
  {const c=S.hotdog,y=gy(c.x,c.z);P(G.box,m.steel,c.x,y+.62,c.z,1.5,.62,.8);P(G.box,m.steel,c.x,y+.96,c.z,1.52,.06,.82);P(G.box,m.yellow,c.x,y+1.0,c.z+.2,.9,.04,.3);
    for(const dx of[-.55,.55])P(G.cyl,m.rubber,c.x+dx,y+.22,c.z+.42,.22,.08,.22,Math.PI/2,0,0);P(G.cyl8,m.steel,c.x+.72,y+.75,c.z-.3,.015,.6,.015,0,0,.9);
    P(G.cyl8,m.steel,c.x,y+1.6,c.z,.025,1.3,.025);const ut=canvasTex(M,256,64,(g,w,h)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#fff':'#c3261f';g.fillRect(i*w/8,0,w/8+1,h)}});
    const um=new T3.Mesh(G.cone,own(M,new T3.MeshStandardMaterial({map:ut,roughness:.8,side:T3.DoubleSide})));um.scale.set(1.15,.45,1.15);um.position.set(c.x,y+2.25,c.z);um.castShadow=true;root.add(um);
    const fs=sign(M,['FREE HOT DOGS',"DON'T ASK"],{w:512,h:160,bg:'#fff',fg:'#c3261f',fg2:'#222',edge:'#c3261f',size:62,size2:34,y0:.38,dy:.32});root.add(planeMesh(M,fs,1.3,.4,c.x,y+.62,c.z+.405,0))}
  /* -- the A-frame sandwich board -- */
  {const c=S.board,y=gy(c.x,c.z);const bt=sign(M,['GRAND','OPENING!','WE BUY · WE SELL','NO QUESTIONS ASKED'],{w:256,h:384,bg:'#151515',fg:'#ffd23f',fg2:'#fff',edge:'#ffd23f',size:66,size2:26,y0:.16,dy:.17});
    for(const k of[-1,1]){const pm=planeMesh(M,bt,.62,.92,c.x,y+.5,c.z+k*.16,k>0?0:Math.PI);pm.rotation.order='YXZ';pm.rotation.x=k*-.17;root.add(pm);P(G.box,m.wood,c.x,y+.5,c.z+k*.16-k*.012,.66,.96,.02,k*-.17,0,0)}}
  /* -- the balloon box and helium tank in the back office (Marco's errand) -- */
  {const c=S.balloonBox,y=gy(c.x,c.z);P(G.box,matC(M,'#b08a5a'),c.x,y+.3,c.z,.6,.6,.6);const bb=sign(M,['BALLOONS','HELIUM · THIS SIDE UP'],{w:256,h:160,bg:'#c7a06c',fg:'#7a1a14',fg2:'#3a2a14',edge:'#7a1a14',size:46,size2:18,y0:.38,dy:.3,shadow:false});
    root.add(planeMesh(M,bb,.5,.3,c.x,y+.36,c.z+.305,0));P(G.cyl,matC(M,'#3e7ab8',{roughness:.35,metalness:.4}),c.x+.6,y+.6,c.z-.1,.12,1.2,.12)}
  /* -- sawhorses closing the near lane, cones at the ends, bunting on three poles -- */
  {const z=S.party.z1+.25;const st=canvasTex(M,256,32,(g,w,h)=>{for(let i=0;i<10;i++){g.fillStyle=i%2?'#f4f1ea':'#e8611a';g.beginPath();g.moveTo(i*w/10-14,h);g.lineTo(i*w/10+w/10-14,h);g.lineTo(i*w/10+w/10+14,0);g.lineTo(i*w/10+14,0);g.fill()}});
    const sm=own(M,new T3.MeshStandardMaterial({map:st,roughness:.7}));
    for(let x=346.4;x<373;x+=2.3){const y=gy(x,z);P(G.box,m.white,x,y+.9,z,1.9,.2,.04);for(const k of[-1,1])for(const s of[-1,1])P(G.box,m.white,x+k*.82,y+.45,z+s*.18,.05,.94,.05,s*-.2,0,0);
      const bm=new T3.Mesh(G.box,sm);bm.scale.set(1.9,.2,.045);bm.position.set(x,y+.9,z+.004);root.add(bm)}
    for(const x of[345.2,373.6]){const y=gy(x,z);P(G.cyl,m.orange,x,y+.35,z,.03,.7,.03);P(G.cone,m.orange,x,y+.36,z,.17,.7,.17);P(G.box,m.orange,x,y+.02,z,.36,.04,.36)}
    const poles=[345.7,359.4,373.0];for(const x of poles){const y=gy(x,z+.15);P(G.cyl8,m.steel,x,y+1.3,z+.15,.03,2.6,.03)}
    const tri=[],cols=['#c3261f','#f2c230','#f4f1ea','#2f6fb5'];let ci=0;
    for(let s=0;s<2;s++){const x0=poles[s],x1=poles[s+1],n=12;for(let i=0;i<n;i++){const u0=(i+.15)/n,u1=(i+.85)/n,um=(u0+u1)/2;const sag=u=>2.5-.55*Math.sin(Math.PI*u),X=u=>x0+(x1-x0)*u;
      const c=a.lin(cols[ci++%4]);tri.push([X(u0),sag(u0),X(u1),sag(u1),X(um),sag(um)-.32,c])}}
    const pos=[],col=[],zz=z+.15,yb=gy(352,zz);for(const t of tri){pos.push(t[0],yb+t[1],zz,t[2],yb+t[3],zz,t[4],yb+t[5],zz);for(let k=0;k<3;k++)col.push(t[6].r,t[6].g,t[6].b)}
    const bg=own(M,new T3.BufferGeometry());bg.setAttribute('position',new T3.Float32BufferAttribute(pos,3));bg.setAttribute('color',new T3.Float32BufferAttribute(col,3));bg.computeVertexNormals();
    const bn=new T3.Mesh(bg,own(M,new T3.MeshStandardMaterial({vertexColors:true,side:T3.DoubleSide,roughness:.8})));root.add(bn);
    const lp=[];for(let s=0;s<2;s++){const x0=poles[s],x1=poles[s+1];for(let i=0;i<24;i++){const u=i/24,v=(i+1)/24;lp.push(x0+(x1-x0)*u,yb+2.5-.55*Math.sin(Math.PI*u),zz,x0+(x1-x0)*v,yb+2.5-.55*Math.sin(Math.PI*v),zz)}}
    const lg=own(M,new T3.BufferGeometry());lg.setAttribute('position',new T3.Float32BufferAttribute(lp,3));root.add(new T3.LineSegments(lg,own(M,new T3.LineBasicMaterial({color:0x333333}))))}
  /* -- feather flags -- */
  {const ft=sign(M,['GRAND OPENING'],{w:128,h:512,bg:'#c3261f',fg:'#ffd23f',edge:'#ffd23f',size:30,shadow:false});
    for(const [x,z] of[[346.3,39.3],[372.9,42.9]]){const y=gy(x,z);P(G.cyl8,m.steel,x,y+1.55,z,.02,3.1,.02);const g=own(M,new T3.PlaneGeometry(.55,2.3,1,8));const p=g.attributes.position;for(let i=0;i<p.count;i++){const yy=p.getY(i);p.setZ(i,.08*Math.sin((yy+1.15)*2.2));p.setX(i,p.getX(i)+.06*Math.cos((yy+1.15)*1.4))}g.computeVertexNormals();
      const tx=ft.clone();tx.needsUpdate=true;own(M,tx);tx.rotation=0;const mm=own(M,new T3.MeshStandardMaterial({map:ft,side:T3.DoubleSide,roughness:.8}));const fm=new T3.Mesh(g,mm);fm.position.set(x+.3,y+1.85,z);fm.rotation.y=Math.PI/2*.15;fm.castShadow=true;root.add(fm)}}
  mergeParts(M,parts,root);
  /* -- colliders: tables, the cart, speakers, the sawhorse line (waist-high: you can hop it), the tube guy's fan -- */
  const col=(x0,z0,x1,z1,h)=>a.wmCol({x0,z0,x1,z1,h,k:'prop'});
  col(S.canape.x-.95,S.canape.z-.39,S.canape.x+.95,S.canape.z+.39,.8);col(S.raffle.x-.85,S.raffle.z-.39,S.raffle.x+.85,S.raffle.z+.39,.8);
  col(S.dj.x-.4,S.dj.z-.96,S.dj.x+.4,S.dj.z+.96,.8);for(const s of S.speakers)col(s.x-.3,s.z-.3,s.x+.3,s.z+.3,1.9);
  col(S.hotdog.x-.76,S.hotdog.z-.42,S.hotdog.x+.76,S.hotdog.z+.42,1.0);col(S.tube.x-.45,S.tube.z-.45,S.tube.x+.45,S.tube.z+.45,.6);
  col(S.balloonBox.x-.3,S.balloonBox.z-.3,S.balloonBox.x+.3,S.balloonBox.z+.3,.6);
  buildBalloons(M,root);buildTube(M,root)}
/* balloons: one instanced mesh, the arch over the door (its east end sags until Marco gets help) plus three bunches */
function buildBalloons(M,root){const a=A(),T3=a.THREE,V=M.vis;const cols=['#d6322b','#f2c230','#f4f1ea','#d6322b','#2f6fb5'];
  const pts=[];const ar=S.arch,cx=(ar.x0+ar.x1)/2,rx=(ar.x1-ar.x0)/2,base=gy(cx,ar.z)+.12;
  for(let i=0;i<=26;i++){const th=Math.PI*(1-i/26);for(let k=0;k<4;k++){const o=[[0,.13,0],[0,-.13,0],[.0,0,.13],[0,0,-.13]][k];pts.push({arch:true,th,o,c:cols[(i+k)%3]})}}
  for(const[bx,bz,h]of[[S.dj.x-.3,S.dj.z-1.0,2.1],[S.canape.x-.9,S.canape.z+.1,1.9],[S.raffle.x+.85,S.raffle.z+.1,2.0],[S.board.x+.4,S.board.z,1.6]])for(let k=0;k<5;k++){const an=k*1.26;pts.push({x:bx+Math.cos(an)*.18,y:gy(bx,bz)+h+(k%2)*.2,z:bz+Math.sin(an)*.18,c:cols[k],string:{x:bx,y:gy(bx,bz)+.8,z:bz}})}
  const g=own(M,new T3.SphereGeometry(.16,14,10));const mat=own(M,new T3.MeshStandardMaterial({roughness:.26,metalness:0,envMapIntensity:1.2}));
  const im=new T3.InstancedMesh(g,mat,pts.length);im.castShadow=true;im.instanceMatrix.setUsage(T3.DynamicDrawUsage);const col=new T3.Color();
  pts.forEach((p,i)=>{col.copy(a.lin(p.c));im.setColorAt(i,col)});root.add(im);V.balloons={im,pts,cx,rx,base,ry:ar.h-.12,z:ar.z,pop:-1};
  const sp=[];for(const p of pts)if(p.string)sp.push(p.x,p.y-.17,p.z,p.string.x,p.string.y,p.string.z);const lg=own(M,new T3.BufferGeometry());lg.setAttribute('position',new T3.Float32BufferAttribute(sp,3));
  root.add(new T3.LineSegments(lg,own(M,new T3.LineBasicMaterial({color:0xdddddd,transparent:true,opacity:.7}))));balloonPose(M,0)}
function balloonPose(M,t){const V=M.vis,B=V.balloons;if(!B)return;const T3=A().THREE,m4=new T3.Matrix4(),q=new T3.Quaternion(),s=new T3.Vector3(1,1.18,1),p=new T3.Vector3();
  const sag=M.archFixed?0:1;
  B.pts.forEach((b,i)=>{if(i===B.pop){m4.makeScale(0,0,0);B.im.setMatrixAt(i,m4);return}
    if(b.arch){let th=b.th;/* the east end droops toward the ground until it's fixed */const droop=sag*Math.max(0,1-th/1.2)*.9;const x=B.cx+B.rx*Math.cos(th)+droop*.15,y=B.base+B.ry*Math.sin(th)*(1-droop*.45)+b.o[1]-droop*.35,z=B.z+b.o[2]+.05*Math.sin(t*1.3+i);
      p.set(x+b.o[0],y,z)}else p.set(b.x+.04*Math.sin(t*1.1+i),b.y+.03*Math.sin(t*1.7+i*.7),b.z+.04*Math.cos(t*.9+i));
    m4.compose(p,q,s);B.im.setMatrixAt(i,m4)});B.im.instanceMatrix.needsUpdate=true}
/* the wacky waving inflatable tube guy: 9 segments that whip around, two arms, a face */
function buildTube(M,root){const a=A(),T3=a.THREE,V=M.vis,c=S.tube,y=gy(c.x,c.z);const g=new T3.Group();g.position.set(c.x,y,c.z);root.add(g);
  const fan=new T3.Mesh(V.G.cyl,V.m.black);fan.scale.set(.42,.5,.42);fan.position.y=.25;g.add(fan);
  const tm=matC(M,'#e8301e',{roughness:.55}),face=canvasTex(M,128,128,(x,w,h)=>{x.fillStyle='#e8301e';x.fillRect(0,0,w,h);x.fillStyle='#fff';for(const ex of[40,88]){x.beginPath();x.ellipse(ex,48,14,18,0,0,6.283);x.fill()}
    x.fillStyle='#111';for(const ex of[44,84]){x.beginPath();x.arc(ex,52,7,0,6.283);x.fill()}x.strokeStyle='#111';x.lineWidth=7;x.beginPath();x.arc(64,74,26,.2,Math.PI-.2);x.stroke();x.fillStyle='#ffd23f';x.fillRect(0,0,w,14)});
  const fmat=own(M,new T3.MeshStandardMaterial({map:face,roughness:.55}));const segs=[];let par=g,h0=.5;
  for(let i=0;i<9;i++){const s=new T3.Group();s.position.y=i?.42:h0;par.add(s);const me=new T3.Mesh(V.G.cyl,i===8?fmat:tm);me.scale.set(.2-.005*i,.44,.2-.005*i);me.position.y=.21;me.castShadow=true;s.add(me);
    if(i===8)me.rotation.y=-Math.PI/2;if(i===6)for(const k of[-1,1]){const arm=new T3.Group();arm.position.set(k*.18,.3,0);s.add(arm);const am=new T3.Mesh(V.G.cyl,tm);am.scale.set(.07,.9,.07);am.position.y=.45;arm.add(am);arm.rotation.z=k*-1.2;s.userData['arm'+k]=arm}
    segs.push(s);par=s}
  const hair=new T3.Mesh(V.G.cone,matC(M,'#ffd23f'));hair.scale.set(.2,.22,.2);hair.position.y=.5;segs[8].add(hair);V.tube={g,segs}}
function tubeTick(M,t){const T_=M.vis.tube;if(!T_)return;const s=T_.segs;for(let i=0;i<s.length;i++){const k=i/s.length;s[i].rotation.z=Math.sin(t*3.1-i*.55)*(.12+.28*k)+(i>5?Math.sin(t*7.3+i)*.08:0);s[i].rotation.x=Math.sin(t*2.3-i*.6+1)*(.08+.18*k)}
  const sg=s[6].userData;if(sg['arm-1'])sg['arm-1'].rotation.z=1.2+Math.sin(t*6.1)*.7;if(sg.arm1)sg.arm1.rotation.z=-1.2+Math.sin(t*5.3+1)*.7;
  /* now and then he folds in half (the fan hiccups) */const fold=Math.max(0,Math.sin(t*.37))>.96?1:0;if(fold)s[3].rotation.z+=1.3}
/* =====================================================================
   PEOPLE: the cast (HT.People models only: the job waits for them), what they do, what they see
   ===================================================================== */
const PPL=()=>window.HT&&HT.People;
function castLoaded(){const pp=PPL();if(!pp||!pp.ok)return true;/* no rigged people at all (fallback build): box dudes are all there is */return KEYS.every(k=>!pp.keys.includes(k)||pp.has(k))}
function preloadCast(){const pp=PPL();if(!pp||!pp.ok||!pp.preload)return Promise.resolve();const want=KEYS.filter(k=>pp.keys.includes(k)&&!pp.has(k));return want.length?pp.preload(want).catch(()=>{}):Promise.resolve()}
/* way points: the shop's front door, the floor, the staff door, the back office */
const W={post:K.denisePost,floor:{x:358,z:34.4},doorIn:{x:358,z:35.7},doorOut:{x:358,z:39.1},sdFloor:{x:357,z:32.7},sdBack:{x:357,z:29.4},box:{x:355.95,z:28.0},desk:{x:359.4,z:28.2}};
const INTO_BACK=[W.doorOut,W.doorIn,W.floor,W.sdFloor,W.sdBack,W.box];
function pathTo(p,dst){/* inside the shop and out: through the front door; into the back: through the staff door */
  const pin=inShop(p.pos.x,p.pos.z)||inBack(p.pos.x,p.pos.z),din=inShop(dst.x,dst.z)||inBack(dst.x,dst.z);const out=[];
  if(inBack(p.pos.x,p.pos.z)&&!inBack(dst.x,dst.z))out.push(W.sdBack,W.sdFloor);
  if(pin&&!din)out.push(W.floor,W.doorIn,W.doorOut);
  if(!pin&&din)out.push(W.doorOut,W.doorIn,W.floor);
  if(!inBack(p.pos.x,p.pos.z)&&inBack(dst.x,dst.z))out.push(W.sdFloor,W.sdBack);
  out.push(dst);return out.map(q=>({x:q.x,z:q.z}))}
function person(M,c){const a=A(),pp=PPL();let d=null;if(pp&&pp.ok&&pp.has&&pp.has(c.key)){try{d=pp.make(c.key,{})}catch(_){d=null}}
  if(!d)d=a.makeDude({shirt:c.kind==='staff'?'#b8231e':'#6b7280',pants:'#2b2d42'});d.root.position.set(c.at.x,gy(c.at.x,c.at.z),c.at.z);a.wmAdd(d.root);
  const p={c,id:c.id,d,pos:{x:c.at.x,z:c.at.z},yaw:yawTo(c.face.x-c.at.x,c.face.z-c.at.z),mode:'home',path:null,t:0,bob:Math.random()*6,barkT:3+Math.random()*12,interT:2+Math.random()*3,speed:1.15,look:null,said:{},vis:0};
  if(c.kind==='staff'||c.kind==='boss')staffTag(M,p,c.kind==='boss'?'MANAGER':'STAFF');
  if(c.kind==='dj')headphones(M,p);if(c.id==='vince')scissors(M,p);
  return p}
function bone(p,n){return p.d&&p.d.rb&&p.d.rb.body?p.d.rb.body.getObjectByName(n):null}
/* a red STAFF lanyard: cord around the neck, a card on the chest (spine space: +X up, +Y forward, +Z left) */
function staffTag(M,p,txt){const a=A(),T3=a.THREE,V=M.vis,sp=bone(p,'Bip01_Spine2');if(!sp)return;const red=V.m.cordRed||(V.m.cordRed=matC(M,'#c3261f',{roughness:.7}));
  const g=new T3.Group();g.name='pawnLanyard';const c1=new T3.Mesh(own(M,new T3.CylinderGeometry(.006,.006,.2,4)),red),c2=c1.clone();
  c1.position.set(.17,.11,.05);c1.rotation.set(.5,0,1.25);c2.position.set(.17,.11,-.05);c2.rotation.set(-.5,0,1.25);g.add(c1,c2);
  const tex=V['tag'+txt]||(V['tag'+txt]=sign(M,[txt,'CASH-4-YER-STUFF'],{w:128,h:160,bg:'#fff',fg:'#c3261f',fg2:'#333',edge:'#c3261f',size:30,size2:11,y0:.4,dy:.3,shadow:false}));
  const card=new T3.Mesh(V.G.box,own(M,new T3.MeshStandardMaterial({map:tex,roughness:.6})));card.scale.set(.1,.075,.006);card.position.set(.07,.205,0);card.rotation.set(0,0,0);
  /* the card's face (+z of a box face) must point forward (+Y in spine space): a box face mapping works from any side, so orient via quaternion */
  card.quaternion.setFromRotationMatrix(new T3.Matrix4().makeBasis(new T3.Vector3(0,0,-1),new T3.Vector3(1,0,0),new T3.Vector3(0,1,0)));g.add(card);sp.add(g);p.tag=g}
function headphones(M,p){const a=A(),T3=a.THREE,V=M.vis,hd=bone(p,'Bip01_Head');if(!hd)return;const g=new T3.Group();g.name='pawnPhones';
  const band=new T3.Mesh(own(M,new T3.TorusGeometry(.105,.012,5,16,Math.PI)),V.m.black);band.position.set(.12,0,0);band.rotation.set(0,Math.PI/2,-Math.PI/2);g.add(band);
  for(const k of[-1,1]){const cup=new T3.Mesh(V.G.cyl,V.m.black);cup.scale.set(.045,.03,.045);cup.position.set(.1,.0,k*.098);cup.rotation.x=Math.PI/2;g.add(cup);const pad=new T3.Mesh(V.G.cyl,matC(M,'#ff4fd8'));pad.scale.set(.03,.032,.03);pad.position.copy(cup.position);pad.rotation.x=Math.PI/2;g.add(pad)}
  hd.add(g);p.phones=g}
/* Vince's giant ribbon scissors, in his right hand (gunHold: the gun grip; muzzle along -Z) */
function scissors(M,p){const a=A(),T3=a.THREE,V=M.vis,h=p.d.gunHold;if(!h)return;const g=new T3.Group();g.name='pawnScissors';
  for(const k of[-1,1]){const bl=new T3.Mesh(V.G.box,V.m.steel);bl.scale.set(.025,.012,.62);bl.position.set(k*.022,0,-.42);bl.rotation.y=k*.06;g.add(bl);
    const ring=new T3.Mesh(own(M,new T3.TorusGeometry(.06,.016,6,14)),matC(M,'#ffd23f',{roughness:.4,metalness:.3}));ring.position.set(k*.06,0,.03);ring.rotation.x=Math.PI/2;g.add(ring)}
  const bow=new T3.Mesh(V.G.sph,V.m.red);bow.scale.set(.05,.05,.05);bow.position.set(0,.02,-.12);g.add(bow);g.position.set(0,.02,.0);h.add(g);p.sc=g}
function spawnCast(M){M.pp={};for(const c of CAST)M.pp[c.id]=person(M,c);M.castT=0}
/* walk along p.path; true when done */
function walk(M,p,dt,sp){const a=A();if(!p.path||!p.path.length)return true;const t=p.path[0],dx=t.x-p.pos.x,dz=t.z-p.pos.z,l=hyp(dx,dz);
  if(l<.25){p.path.shift();return!p.path.length}const s=Math.min(l,(sp||p.speed)*dt);p.pos.x+=dx/l*s;p.pos.z+=dz/l*s;
  if(!inShop(p.pos.x,p.pos.z)&&!inBack(p.pos.x,p.pos.z)){const v=a.V3(p.pos.x,0,p.pos.z);a.collide(v,.3);p.pos.x=v.x;p.pos.z=v.z}
  p.yaw+=wrap(yawTo(dx,dz)-p.yaw)*Math.min(1,dt*7);p.moving=true;return false}
function go(p,dst,mode){p.path=pathTo(p,dst);p.mode=mode||'walk';p.dst=dst}
/* what the room is doing: canapes, the song, the raffle (participants walk over, face the thing, come back) */
function eventSpot(M,p,ev,i){const f=ev.focus,an=(i*2.399)%6.283,r=ev.kind==='raffle'?1.6+(i%3)*.55:ev.kind==='song'?1.1+(i%2)*.7:1.0+(i%2)*.45;
  if(ev.kind==='canape'){const x=f.x-1.1+((i*.73)%2.2),z=f.z+.95+(i%2)*.55;return{x,z}}
  if(ev.kind==='raffle')return{x:f.x+Math.cos(Math.PI*.15+((i*.41)%1)*Math.PI*.7)*r,z:f.z+Math.sin(Math.PI*.15+((i*.41)%1)*Math.PI*.7)*r+.4};
  return{x:f.x+Math.cos(an)*r,z:f.z+Math.sin(an)*r}}
function startEvent(M,kind){const f=kind==='canape'?S.canape:kind==='song'?S.dance:S.stage;const ev=M.ev={kind,t:0,T:kind==='canape'?K.canapeT:kind==='song'?K.songT:K.raffleT,focus:f,who:[]};
  let i=0;for(const id in M.pp){const p=M.pp[id],c=p.c;if(c.kind==='dj')continue;if(c.id==='kev'&&kind!=='canape')continue;if(c.id==='marco'&&!M.archFixed&&kind!=='raffle')continue;
    if(p.mode==='visit'||p.mode==='photo')continue;const d=hyp(p.pos.x-f.x,p.pos.z-f.z);
    const join=kind==='raffle'?d<K.raffleR:kind==='song'?(c.dancer||c.id==='denise'||d<9):(d<K.canapeR&&(c.kind==='guest'||c.id==='denise'||c.id==='vince'||c.id==='kev'));if(!join)continue;
    if(kind==='canape'&&ev.who.length>=7&&c.id!=='denise')continue;
    p.evSpot=c.id==='vince'&&kind==='raffle'?{x:S.stage.x+.2,z:S.stage.z-.15}:eventSpot(M,p,ev,i++);go(p,p.evSpot,'event');ev.who.push(id)}
  return ev}
function endEvent(M){const ev=M.ev;if(!ev)return;for(const id of ev.who){const p=M.pp[id];if(p.mode==='event'){go(p,p.c.at,'return')}}M.ev=null}
/* one frame of one person */
function personTick(M,p,dt){const a=A(),P=a.P,c=p.c;p.t+=dt;p.moving=false;let mode='stand',bounce=0,lookAt=null;
  const dP=hyp(P.pos.x-p.pos.x,P.pos.z-p.pos.z);
  if(p.mode==='walk'||p.mode==='return'||p.mode==='event'||p.mode==='visit'||p.mode==='photo'){const done=walk(M,p,dt,p.mode==='visit'?1.35:1.25);
    if(done){if(p.mode==='return'){p.mode='home';p.path=null}else if(p.mode==='event'){p.arrived=true}else if(p.mode==='visit'){p.visitT=(p.visitT||0)+dt}}}
  /* facing */
  let face=c.face;if(p.mode==='event'&&M.ev)face=M.ev.focus;if(p.mode==='photo')face=S.photoP;if(c.id==='marco'&&!M.archFixed&&p.mode==='home')face={x:S.ladder.x-.3,z:S.ladder.z-.6};
  if(!p.moving&&p.mode!=='photo'){/* turn toward the dad when he's close and in front of them (people look at a man who walks up to them) */
    const talkTo=M.chat&&M.chat.p===p;if(talkTo||dP<2.4&&!(M.ev&&p.mode==='event'))face={x:P.pos.x,z:P.pos.z};
    else if(M.watchAt&&M.watchAt[p.id]>0)face={x:P.pos.x,z:P.pos.z}}
  if(!p.moving&&face)p.yaw+=wrap(yawTo(face.x-p.pos.x,face.z-p.pos.z)-p.yaw)*Math.min(1,dt*(p.mode==='event'?3:2.2));
  /* dancing: the dance floor always bobs; everybody near it bobs for the request */
  const song=M.ev&&M.ev.kind==='song';if(!p.moving&&(c.dancer&&p.mode==='home'||song&&p.mode==='event'&&p.arrived||c.kind==='dj')){const k=c.kind==='dj'?.7:song?1:.55;bounce=Math.abs(Math.sin((M.t+p.bob)*Math.PI*(118/60)))*.06*k;p.sway=Math.sin((M.t+p.bob)*Math.PI*(118/120))*.2*k}else p.sway=0;
  /* Marco on the balloon arch / anybody 'doing something' with their hands */
  p.interT-=dt;if(p.interT<=0&&!p.moving){p.interT=c.id==='marco'&&!M.archFixed?2.2:c.kind==='vendor'?3.5:c.kind==='dj'?4.5:9+Math.random()*8;if(c.id==='marco'&&!M.archFixed||c.kind==='vendor'||c.kind==='dj'||Math.random()<.3)try{PPL().interact(p.d)}catch(_){}}
  const y=gy(p.pos.x,p.pos.z);p.d.root.position.set(p.pos.x,y+bounce,p.pos.z);p.d.root.rotation.y=p.yaw+(p.sway||0);
  const pp=PPL();if(p.d.rb&&pp&&pp.pose)try{pp.pose(p.d,dt,{moving:p.moving,aim:false,mode,speed:p.mode==='visit'?1.2:1})}catch(_){}}
/* walls that block sight: the shop's own walls and shelves (full height colliders around the site) */
function walls(M){if(M.walls)return M.walls;const out=[];for(const c of A().L.colliders||[]){if(c.x1<349||c.x0>367||c.z1<21||c.z0>38.6)continue;if(c.h!=null&&c.h<1.8)continue;if(c.x1-c.x0>30||c.z1-c.z0>30)continue;if(c.k==='prop'||c.k==='traffic')continue;out.push(c)}return M.walls=out}
function blocked(M,ax,az,bx,bz){const dx=bx-ax,dz=bz-az;for(const b of walls(M)){let t0=0,t1=1,ok=true;
    for(let q=0;q<2&&ok;q++){const p=q?az:ax,d=q?dz:dx,lo=(q?b.z0:b.x0)+.04,hi=(q?b.z1:b.x1)-.04;if(Math.abs(d)<1e-9){if(p<=lo||p>=hi)ok=false}else{let u0=(lo-p)/d,u1=(hi-p)/d;if(u0>u1){const w=u0;u0=u1;u1=w}if(u0>t0)t0=u0;if(u1<t1)t1=u1;if(t0>=t1)ok=false}}
    if(ok)return true}return false}
/* who sees the dad right now (HT.Social.cover's 'seen' list): within 10 m, roughly facing him (anybody within 2.5 m), nothing in between */
function watchers(M){const P=A().P,out=[];if(!M.pp)return out;for(const id in M.pp){const p=M.pp[id],c=p.c;if(p.gone)continue;const dx=P.pos.x-p.pos.x,dz=P.pos.z-p.pos.z,d=hyp(dx,dz);p.sees=false;if(d>K.sight)continue;
    const half=c.kind==='guest'||c.kind==='vendor'?1.25:c.kind==='dj'?1.0:1.45;const ang=Math.abs(wrap(yawTo(dx,dz)-p.yaw));if(d>2.5&&ang>half)continue;
    /* busy: the raffle crowd watches the drum, dancers during the request watch each other */
    if(p.mode==='event'&&M.ev&&M.ev.kind!=='canape'&&d>3)continue;
    if(blocked(M,p.pos.x,p.pos.z,P.pos.x,P.pos.z))continue;p.sees=true;out.push({id,d,staff:c.kind!=='guest'&&c.kind!=='vendor'})}return out}

/* =====================================================================
   THE OVERLAY: labelled pins over the things you can do, "…" politeness bubbles, little speech bubbles
   ===================================================================== */
const CSS=`
.pw-ov{position:absolute;inset:0;pointer-events:none;z-index:6;font-family:var(--ht-ui,system-ui,sans-serif)}
body.soc-on .pw-ov{opacity:0}
.pw-pin{position:absolute;left:0;top:0;transform:translate(-50%,-100%);white-space:nowrap;display:flex;align-items:center;gap:6px;padding:4px 9px 4px 6px;border-radius:999px;
  background:rgba(14,16,22,.78);color:#f4f1ea;font:700 12px/1 var(--ht-ui,system-ui);letter-spacing:.02em;box-shadow:0 2px 10px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.14);transition:opacity .25s}
.pw-pin i{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font:900 11px/1 var(--ht-ui,system-ui);font-style:normal;background:#f2c230;color:#1b1c20}
.pw-pin.done{opacity:.45}.pw-pin.done i{background:#7fd18a}.pw-pin.go i{background:#ff7a59;color:#fff}
.pw-pin small{font-weight:600;opacity:.75;font-size:11px}
.pw-pin:after{content:'';position:absolute;left:50%;bottom:-5px;margin-left:-5px;border:5px solid transparent;border-bottom:0;border-top-color:rgba(14,16,22,.78)}
.pw-bub{position:absolute;left:0;top:0;transform:translate(-50%,-100%);max-width:240px;padding:6px 10px;border-radius:12px;background:#fbfaf6;color:#1b1c20;font:600 13px/1.25 var(--ht-body,system-ui);
  box-shadow:0 3px 14px rgba(0,0,0,.3);text-align:center;transition:opacity .3s}
.pw-bub:after{content:'';position:absolute;left:50%;bottom:-6px;margin-left:-6px;border:6px solid transparent;border-bottom:0;border-top-color:#fbfaf6}
.pw-bub b{display:block;font:800 10px/1.1 var(--ht-ui,system-ui);letter-spacing:.08em;text-transform:uppercase;color:#8a6b2a;margin-bottom:2px}
.pw-dots{position:absolute;left:0;top:0;transform:translate(-50%,-100%);width:46px;height:30px;border-radius:15px;background:#fbfaf6;box-shadow:0 3px 14px rgba(0,0,0,.35);display:grid;place-items:center}
.pw-dots:after{content:'';position:absolute;left:50%;bottom:-6px;margin-left:-6px;border:6px solid transparent;border-bottom:0;border-top-color:#fbfaf6}
.pw-dots span{font:900 20px/1 var(--ht-ui,system-ui);letter-spacing:2px;color:#1b1c20;margin-top:-8px}
.pw-dots u{position:absolute;left:6px;right:6px;bottom:4px;height:3px;border-radius:2px;background:#e0d6c2;overflow:hidden}.pw-dots u i{display:block;height:100%;background:#e8611a;transform-origin:left}
.pw-dots.watch{background:#ffe2d6}.pw-dots.watch span{color:#b8231e}
.pw-hint{position:absolute;left:50%;bottom:21%;transform:translateX(-50%);padding:8px 14px;border-radius:10px;background:rgba(14,16,22,.82);color:#fff;font:700 15px/1.2 var(--ht-ui,system-ui);box-shadow:0 4px 18px rgba(0,0,0,.35);opacity:0;transition:opacity .3s}
.pw-hint.on{opacity:1}.pw-hint kbd{display:inline-block;min-width:22px;padding:2px 6px;margin:0 3px;border-radius:5px;background:#f2c230;color:#1b1c20;font:900 13px/1.1 var(--ht-ui,system-ui);text-align:center}
.pw-vf-meter{position:absolute;left:50%;bottom:18%;transform:translateX(-50%);width:min(360px,70vw);height:14px;border-radius:7px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.4);overflow:hidden}
.pw-vf-meter .z{position:absolute;top:0;bottom:0;background:rgba(127,209,138,.55)}.pw-vf-meter .n{position:absolute;top:-3px;bottom:-3px;width:4px;margin-left:-2px;background:#fff;box-shadow:0 0 6px #fff}
.pw-vf-lab{position:absolute;left:50%;bottom:calc(18% + 20px);transform:translateX(-50%);color:#fff;font:800 13px/1 var(--ht-ui,system-ui);letter-spacing:.1em;text-transform:uppercase;text-shadow:0 1px 3px #000}
.ht-result .pw-res{margin:8px 0 2px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.06);font:600 13px/1.4 var(--ht-body,system-ui)}
.ht-result .pw-res b{display:block;font:800 11px/1 var(--ht-ui,system-ui);letter-spacing:.14em;text-transform:uppercase;opacity:.75;margin-bottom:5px}
`;
function css(){if(document.getElementById('pw-css'))return;const s=document.createElement('style');s.id='pw-css';s.textContent=CSS;document.head.appendChild(s)}
function overlay(M){if(M.ov)return M.ov;css();const host=document.querySelector('.ht-root')||document.body,el=document.createElement('div');el.className='pw-ov';host.appendChild(el);
  const hint=document.createElement('div');hint.className='pw-hint';el.appendChild(hint);
  M.ov={el,hint,pins:{},bubs:{},dots:{},hintTxt:''};return M.ov}
const _v=[];function proj(x,y,z){const a=A(),T3=a.THREE,v=_v[0]||(_v[0]=new T3.Vector3());v.set(x,y,z);const cam=a.camera;const d=v.clone().sub(cam.position);const f=new T3.Vector3();cam.getWorldDirection(f);if(d.dot(f)<.3)return null;
  v.project(cam);if(v.x<-1.1||v.x>1.1||v.y<-1.1||v.y>1.2)return null;return{x:(v.x+1)/2*innerWidth,y:(1-v.y)/2*innerHeight,d:d.length()}}
function place(el,q,key){const s=q?Math.round(q.x)+','+Math.round(q.y):'off';if(el._k===s)return;el._k=s;if(!q){el.style.display='none';return}el.style.display='';el.style.transform='translate('+Math.round(q.x)+'px,'+Math.round(q.y)+'px) translate(-50%,-100%)'}
function ovPin(M,id,x,y,z,label,o){const O=overlay(M);let e=O.pins[id];if(!e){e=O.pins[id]=document.createElement('div');e.className='pw-pin';O.el.appendChild(e)}e._seen=M.frame;o=o||{};
  const html='<i>'+(o.icon||'!')+'</i>'+label+(o.sub?' <small>'+o.sub+'</small>':'');if(e._h!==html){e._h=html;e.innerHTML=html}e.classList.toggle('done',!!o.done);e.classList.toggle('go',!!o.go);
  const P=A().P,d=hyp(P.pos.x-x,P.pos.z-z);place(e,d<(o.far||48)&&d>(o.near||1.6)?proj(x,y,z):null)}
function ovBubble(M,p,text,dur,who){const O=overlay(M);let e=O.bubs[p.id];if(!e){e=O.bubs[p.id]=document.createElement('div');e.className='pw-bub';O.el.appendChild(e)}
  e.innerHTML=(who?'<b>'+who+'</b>':'')+esc(text);e._t=dur||3.2;e._p=p}
function ovTick(M,dt){const O=M.ov;if(!O)return;for(const id in O.pins){const e=O.pins[id];if(e._seen!==M.frame)place(e,null)}
  for(const id in O.bubs){const e=O.bubs[id],p=e._p;e._t-=dt;if(e._t<=0||!p||!p.d){place(e,null);continue}const h=bone(p,'Bip01_Head');let y=gy(p.pos.x,p.pos.z)+2.15;if(h){const v=new (A().THREE).Vector3();h.getWorldPosition(v);y=v.y+.42}
    const q=proj(p.pos.x,y,p.pos.z);const P=A().P;place(e,q&&hyp(P.pos.x-p.pos.x,P.pos.z-p.pos.z)<22?q:null)}
  /* politeness: "…" with a draining timer; a red one while they're watching you */
  const D=M.D;for(const id in M.pp||{}){const p=M.pp[id],tm=D&&D.timers[id],wt=D&&D.watch[id]>0;let e=O.dots[id];
    if(!tm&&!wt){if(e)place(e,null);continue}if(!e){e=O.dots[id]=document.createElement('div');e.className='pw-dots';e.innerHTML='<span>…</span><u><i></i></u>';O.el.appendChild(e)}
    e.classList.toggle('watch',!!wt&&!tm);e.querySelector('span').textContent=tm?'…':'!';const f=tm?clamp(tm.t/tm.T,0,1):clamp(D.watch[id]/20,0,1);const ii=e.querySelector('u i');const tf='scaleX('+f.toFixed(2)+')';if(ii._tf!==tf){ii._tf=tf;ii.style.transform=tf}
    let y=gy(p.pos.x,p.pos.z)+2.25;const h=bone(p,'Bip01_Head');if(h){const v=new (A().THREE).Vector3();h.getWorldPosition(v);y=v.y+.36}
    const bub=O.bubs[id];const q=proj(p.pos.x,y+(bub&&bub._t>0?.55:0),p.pos.z);place(e,q)}
  const ht=M.hint||'';if(O.hintTxt!==ht){O.hintTxt=ht;O.hint.innerHTML=ht;O.hint.classList.toggle('on',!!ht)}}
function ovDispose(M){if(M.ov){try{M.ov.el.remove()}catch(_){}M.ov=null}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* =====================================================================
   THE DISGUISE ON THE DAD: a mustache, a PRESS lanyard and camera, or a cap on backwards. Each has a tell that slips (G fixes it).
   Head space: +X up, +Y forward, +Z left. Spine space the same.
   ===================================================================== */
function dress(M,id){const a=A(),T3=a.THREE,V=M.vis,d=a.P.dude;undress(M);if(!d||!d.rb)return;const body=d.rb.body,hd=body.getObjectByName('Bip01_Head'),sp=body.getObjectByName('Bip01_Spine2');
  const g=new T3.Group();g.name='pawnDisguise';const W_={id,g,parent:null,hidden:[]};
  if(id==='mustache'&&hd){const hair=V.m.stache||(V.m.stache=matC(M,'#3a2416',{roughness:.95}));const piv=new T3.Group();piv.position.set(.072,.108,0);
    for(const k of[-1,1]){const lobe=new T3.Mesh(V.G.sph,hair);lobe.scale.set(.016,.016,.034);lobe.position.set(0,0,k*.024);lobe.rotation.x=k*.35;piv.add(lobe);
      const tip=new T3.Mesh(V.G.sph,hair);tip.scale.set(.011,.011,.02);tip.position.set(-.012,-.004,k*.052);tip.rotation.x=k*.9;piv.add(tip)}
    g.add(piv);hd.add(g);W_.parent=hd;W_.piv=piv}
  else if(id==='cousin'&&hd){const old=hd.getObjectByName('rb_cap');if(old&&old.visible){old.visible=false;W_.hidden.push(old)}
    const red=V.m.cap||(V.m.cap=matC(M,'#c3261f',{roughness:.9}));const piv=new T3.Group();piv.position.set(.16,0,0);
    const crown=new T3.Mesh(own(M,new T3.SphereGeometry(1,20,10,0,Math.PI*2,0,Math.PI*.5)),red);crown.scale.set(.098,.1,.112);crown.rotation.z=-Math.PI/2;crown.position.set(-.005,-.005,0);piv.add(crown);
    /* the brim points backwards (-Y): that's the whole disguise */
    const brim=new T3.Mesh(V.G.cyl,red);brim.scale.set(.085,.008,.07);brim.position.set(-.028,-.13,0);brim.rotation.set(0,0,-.25);piv.add(brim);
    const btn=new T3.Mesh(V.G.sph,red);btn.scale.set(.012,.012,.012);btn.position.set(.1,0,0);piv.add(btn);g.add(piv);hd.add(g);W_.parent=hd;W_.piv=piv}
  else if(id==='press'&&sp){const blue=V.m.blue||(V.m.blue=matC(M,'#2f6fb5',{roughness:.7}));const piv=new T3.Group();
    const c1=new T3.Mesh(own(M,new T3.CylinderGeometry(.006,.006,.22,4)),blue),c2=c1.clone();c1.position.set(.17,.115,.055);c1.rotation.set(.5,0,1.25);c2.position.set(.17,.115,-.055);c2.rotation.set(-.5,0,1.25);piv.add(c1,c2);
    const front=V.pressTex||(V.pressTex=sign(M,['PRESS','RIVERSIDE GAZETTE'],{w:128,h:160,bg:'#fff',fg:'#2f6fb5',fg2:'#222',edge:'#2f6fb5',size:34,size2:10,y0:.4,dy:.3,shadow:false})),
      back=V.visTex||(V.visTex=sign(M,['VISITOR'],{w:128,h:160,bg:'#ffd23f',fg:'#222',edge:'#222',size:26,shadow:false}));
    const card=new T3.Group();card.position.set(.06,.215,0);const basis=new T3.Matrix4().makeBasis(new T3.Vector3(0,0,-1),new T3.Vector3(1,0,0),new T3.Vector3(0,1,0));card.quaternion.setFromRotationMatrix(basis);
    const pf=new T3.Mesh(own(M,new T3.PlaneGeometry(.085,.105)),own(M,new T3.MeshStandardMaterial({map:front,roughness:.6})));pf.position.z=.002;const pb=new T3.Mesh(pf.geometry,own(M,new T3.MeshStandardMaterial({map:back,roughness:.6})));pb.rotation.y=Math.PI;pb.position.z=-.002;card.add(pf,pb);piv.add(card);W_.card=card;
    /* the camera on its strap, at the belly */
    const cam=new T3.Group();cam.position.set(-.06,.2,-.02);const body_=new T3.Mesh(V.G.box,V.m.black);body_.scale.set(.09,.06,.13);cam.add(body_);const lens=new T3.Mesh(V.G.cyl,V.m.black);lens.scale.set(.03,.06,.03);lens.rotation.z=0;lens.position.set(0,.05,0);
    lens.quaternion.setFromAxisAngle(new T3.Vector3(0,0,1),Math.PI/2);lens.position.set(0,.06,0);cam.add(lens);piv.add(cam);g.add(piv);sp.add(g);W_.parent=sp;W_.piv=piv}
  V.dis=W_;slipVis(M,0)}
function undress(M){const W_=M.vis&&M.vis.dis;if(!W_)return;if(W_.g.parent)W_.g.parent.remove(W_.g);for(const h of W_.hidden)h.visible=true;M.vis.dis=null}
/* 0 = right, 1 = slipped all the way */
function slipVis(M,k){const W_=M.vis&&M.vis.dis;if(!W_||!W_.piv)return;if(W_.id==='mustache'){W_.piv.rotation.set(0,k*.55,0);W_.piv.position.set(.072-k*.022,.108,k*.018)}
  else if(W_.id==='cousin'){W_.piv.rotation.set(k*1.3,0,0)}else if(W_.id==='press'&&W_.card){W_.card.rotation.y=0;const T3=A().THREE;const basis=new T3.Matrix4().makeBasis(new T3.Vector3(0,0,-1),new T3.Vector3(1,0,0),new T3.Vector3(0,1,0));
    W_.card.quaternion.setFromRotationMatrix(basis);if(k>.5)W_.card.rotateY(Math.PI)}}

/* =====================================================================
   CONVERSATIONS (HT.Social.view strip; keys 1-4 pick, W/S + E/click confirm, E skips a line; a clock on every choice)
   ===================================================================== */
const TELL={bored:'[{n} keeps checking the time. Bored: a dad joke lands.]',scared:"[{n} keeps glancing at the door. Nervous: say it straight.]",
  defensive:'[{n} has their arms folded. Defensive: overshare.]',friendly:'[{n} is smiling at everything. Friendly: anything works.]'};
const TELL_SHORT={bored:'[{n} checks the time. Bored.]',scared:'[{n} glances at the door. Nervous.]',defensive:'[{n} folds their arms. Defensive.]',friendly:'[{n} smiles at everything. Friendly.]'};
function castView(M){const c={you:{name:'You',color:COL.you,voice:{kind:'dad',pitch:1}},dee:{name:'Pastor Dee',color:COL.dee,voice:{kind:'dad',pitch:1.35}}};
  for(const k of CAST)c[k.id]={name:k.name,color:COL[k.id]||COL[k.kind]||COL.guest,voice:k.voice||{kind:k.kind==='guest'&&/nb_(gran|office|mei|lucia|teen)|_f_/.test(k.key)?'dad':'dad',pitch:/nb_(gran|office|mei|lucia|teen)|_f_/.test(k.key)?1.4:1.05}};return c}
function view(M){if(M.V)return M.V;const Soc=SOC();M.V=Soc.view({cast:castView(M),cls:'soc-pawn'});M.SQ=Soc.scene(M.V);return M.V}
function chatOpen(M,p,kind){const a=A(),Soc=SOC();if(!Soc||M.chat)return;const V=view(M);V.mount();M.SQ.clear();const ch=M.chat={p,kind,t:0,pick:null};M.D.talk(p.id);
  M.talks=(M.talks||0)+1;try{PPL().interact(a.P.dude)}catch(_){}
  CHAT[kind](M,ch,p);return ch}
function chatClose(M,why){const ch=M.chat;if(!ch)return;M.chat=null;try{M.SQ.clear()}catch(_){}try{M.V.choice=null;M.V.clearLine();M.V.unmount()}catch(_){}
  if(why==='walk'){M.D.bump(K.walkOffPen);bark(M,ch.p,"...Okay. Bye, I guess.")}
  if(ch.after)try{ch.after()}catch(e){console.warn('pawn chat',e)}}
/* say lines, offer choices; resolve(i) with the option (or -1 on the clock running out) */
function offer(M,ch,opts,onPick,o){o=o||{};const V=M.V,touch=isTouch();
  M.SQ.choose(done=>{V.choices(opts.map(x=>({text:x.text,reg:x.reg==='special'?(x.as||'real'):x.reg,tag:x.tag,hint:x.hint})),{time:o.time===0?0:(touch?K.choiceTouch:K.choice),
    onPick:i=>{ch.pick=i;done();onPick(i,opts[i])},onTimeout:()=>{done();onPick(-1,null)}})})}
function isTouch(){try{return matchMedia('(pointer:coarse)').matches}catch(e){return false}}
/* small talk: a one-round HT.Social check in the person's mood, plus your disguise's own line */
function smallTalk(M,ch,p,spec,fin){const Soc=SOC(),V=M.V,c=p.c,D=M.D;const name=c.name,mood=p.mood||c.mood;
  const opts=spec.opts.map(o=>Object.assign({},o));opts.push(Object.assign({},SPECIAL[D.id]));
  const C=Soc.convo({npc:p.id,name,mood,rounds:[{options:opts}],win:10,seed:(M.seed+p.id.length*977)>>>0});
  M.SQ.say(p.id,spec.open,{tell:(M.talks<=2?TELL:TELL_SHORT)[mood].replace('{n}',name)});
  if(M.talks===1&&!M.said.readTip)M.SQ.run(()=>{M.said.readTip=1;radio('dee',"Read them first. Bored folks like a dad joke. Nervous ones want it straight. Defensive ones: overshare. Friendly? Anything works.",true)});
  offer(M,ch,opts,(i,o)=>{let res=null,good='meh';if(i<0){res=C.silence();M.SQ.say('you',"(...)");M.SQ.say(p.id,"...Okay then.");good='miss'}
    else{res=C.pick(i);M.SQ.say('you',o.text);if(res.reply)M.SQ.say(p.id,res.reply);good=res.hit==='hit'||res.hit==='land'?'win':res.hit==='miss'?'lose':'meh'}
    M.SQ.run(()=>{const before=D.cover;if(good==='win'){D.bump('win');M.won=(M.won||0)+1;V.toast('Cover +15%','up')}else if(good==='lose'){D.bump('lose');V.toast('Cover −10%','down')}else{D.bump(.05);V.toast('Cover +5%','up')}
      p.talked=good;M.talked[p.id]=good;D.meet(p.id);if(fin)fin(good)});M.SQ.wait(.5);M.SQ.run(()=>chatClose(M))})}
const CHAT={
  small(M,ch,p){if(p.talked){M.SQ.say(p.id,pickN(["Great party, huh?","Still here! Me too.","...Hi again.","Did you get a hot dog? Get a hot dog."],M.talks));M.SQ.run(()=>chatClose(M));return}
    smallTalk(M,ch,p,TALK[p.id],good=>{if(!M.said.firstTalk){M.said.firstTalk=1;M.ph='mingle';M.queue.push(L.firstTalk,L.routes)}})},
  hotdog(M,ch,p){if(p.talked){M.SQ.say(p.id,"Another one? They're free! Don't ask!");M.SQ.say('you',"(takes a hot dog)");M.SQ.run(()=>{eat(M);chatClose(M)});return}
    smallTalk(M,ch,p,TALK.hotdog,()=>{M.SQ.run(()=>eat(M))})},
  denise(M,ch,p){const D=M.D,staffZone=M.zone!=='public';const opts=[
      {reg:'joke',text:"I'm with... the... ribbon.",reply:{hit:"(snorts) The ribbon. Sure. The ribbon's been cut, buddy.",miss:"...The ribbon's been cut."},k:'joke'},
      {reg:'comp',text:"Those are great shoes. Are those orthotic?",reply:{hit:"...They are, actually! Nobody ever notices!",miss:"...Thanks?"},k:'shoes'},
      {reg:'real',text:"Just looking for the bathroom.",reply:{hit:"Customer bathroom's at the Shell station. Across the street. Sorry, hon.",miss:"Customer bathroom's at the Shell station."},k:'bath'}];
    if(M.balloonLine)opts.push({reg:'special',as:'real',tag:'Balloon emergency',text:"Balloon emergency.",k:'pass',custom:()=>({dr:20})});
    else if(M.vip)opts.push({reg:'special',as:'real',tag:'VIP',text:"Vince says I'm VIP. Bathroom's past his office?",k:'pass',custom:()=>({dr:20})});
    else if(D.id==='cousin')opts.push({reg:'special',as:'joke',tag:"DJ's Cousin",text:"My cousin needs a cable. From back there. For the music.",k:'pass',custom:()=>({dr:16})});
    M.SQ.say('denise',staffZone?L.deniseCaught:p.talked?"You again. Need something?":"Hi! Are you with the vendor?",{tell:'[Denise has been guarding a door for two hours. Bored.]'});
    offer(M,ch,opts,(i,o)=>{if(i<0){M.SQ.say('you',"(...)");M.SQ.say('denise',"...Okay.");M.SQ.run(()=>{D.bump('lose');chatClose(M)});return}
      M.SQ.say('you',o.text);
      if(o.k==='pass'){M.SQ.say('denise',M.balloonLine?"...Oh no. Go, go. GO.":M.vip?"He did? ...He says that to the press. Go ahead.":"Oh, for the MUSIC? Please. Get him a cable. Get him a new song.");
        M.SQ.run(()=>{M.deniseOk=true;D.bump('win');M.talked.denise='win';p.talked='win';M.V.toast('Denise lets you through','up');chatClose(M)});return}
      const C=SOC().convo({npc:'denise',name:'Denise',mood:'bored',rounds:[{options:[o]}],win:10,seed:M.seed});const r=C.pick(0);M.SQ.say('denise',r.reply||'...');
      M.SQ.run(()=>{const good=r.hit==='hit'||r.hit==='land';D.bump(good?'win':r.hit==='miss'?'lose':.05);p.talked=good?'win':'meh';M.talked.denise=p.talked;
        if(staffZone)M.watchAt.denise=6;chatClose(M)})})},
  marco(M,ch,p){if(M.archFixed){M.SQ.say('marco',"The arch LIVES. Thanks again. Balloon emergency. Remember it.");M.SQ.run(()=>chatClose(M));return}
    if(M.ladderOn){M.SQ.say('marco',"The LADDER, man! Hold the ladder!");M.SQ.run(()=>chatClose(M));return}
    M.SQ.say('marco',"Hey! You! You got two hands? Hold this ladder. The arch is dying. I'm dying.",{tell:'[Marco is fighting a balloon arch and losing. Nervous.]'});
    const opts=[{reg:'special',as:'real',tag:'Help',text:"Sure. I've held a lot of ladders. It's my whole personality."},{reg:'joke',text:"I'd help, but I'm a little light-headed. Like a balloon."},{reg:'over',text:"I fell off a ladder at my daughter's birthday. Into the cake. She still brings it up."}];
    offer(M,ch,opts,(i,o)=>{if(i<0){M.SQ.say('marco',"...Okay! Okay. I'll do it myself. I'll die.");M.SQ.run(()=>chatClose(M));return}M.SQ.say('you',o.text);
      if(i===0){M.SQ.say('marco',"YES. Okay. Hold it. Hold it STEADY. Don't let go until I say. Even if I scream.");M.SQ.run(()=>{M.ladderOn=true;M.D.bump(.05);chatClose(M)})}
      else if(i===1){M.SQ.say('marco',"(laughs, then a balloon pops somewhere and he flinches) ...Please just hold the ladder.");M.SQ.run(()=>{M.ladderOn=true;M.D.bump(.05);chatClose(M)})}
      else{M.SQ.say('marco',"Into the CAKE? ...Okay, you hold it, I'll climb. I'm not falling into anything.");M.SQ.run(()=>{M.ladderOn=true;M.D.bump('win');chatClose(M)})}})},
  vince(M,ch,p){if(M.vip){M.SQ.say('vince',"VIP! Enjoy the party! Bathroom's past my office! Don't touch the safe! HA!");M.SQ.run(()=>chatClose(M));return}
    const press=M.D.id==='press';M.SQ.say('vince',press?"PRESS! Get one of me with the giant scissors!":"You! You got a phone? Take one of me with the giant scissors. For the website. We have a website.",{tell:'[Vince is having the best day of his life. Friendly.]'});
    const opts=[{reg:'special',as:'real',tag:press?'Press':'Sure',text:press?"Riverside Gazette. Front page, if the light's right.":"Sure. Where do you want it?"},{reg:'joke',text:"Do you want the scissors in the picture, or just the vibes?"},{reg:'over',text:"I've taken four thousand photos of my kids. Three of them are in focus."}];
    offer(M,ch,opts,(i,o)=>{if(i<0){M.SQ.say('vince',"Shy! Love it! Come back when you're ready!");M.SQ.run(()=>chatClose(M));return}M.SQ.say('you',o.text);
      M.SQ.say('vince',i===0?(press?"FRONT PAGE! Over there, by the arch! Stand on the X!":"By the arch! You stand there, I stand here! Magic!"):i===1?"(big laugh) BOTH! Get both! Over by the arch!":"THREE! Ha! Let's make it four! By the arch!");
      M.SQ.run(()=>{M.D.bump(i===0&&press?'win':.06);photoStart(M);chatClose(M)})})},
  dj(M,ch,p){const busy=M.ev&&M.ev.kind==='song';if(busy){M.SQ.say('dj',"It's ON, baby! It's the one! (It's the only one.)");M.SQ.run(()=>chatClose(M));return}
    const cd=M.songCd>0;M.SQ.say('dj',cd?"Again? ...Yeah. Okay. Give me a minute, I gotta let it breathe.":"Any requests? I take requests. I've got a LOT of range.",{tell:'[DJ Layaway is nodding at nothing. Friendly.]'});if(cd){M.SQ.run(()=>chatClose(M));return}
    const opts=[{reg:'joke',text:"Do you have anything from before 1998?"},{reg:'real',text:"Something for Denise, by the door. She looks like she needs it."},{reg:'over',text:"My wife and I had a song. I don't remember it. Play that one."}];
    if(M.D.id==='cousin')opts.push({reg:'special',as:'joke',tag:"DJ's Cousin",text:"COUSIN! It's me! From the thing!"});
    offer(M,ch,opts,(i,o)=>{if(i<0){M.SQ.say('dj',"No requests? I'll keep doing what I'm doing. (He keeps doing it.)");M.SQ.run(()=>chatClose(M));return}M.SQ.say('you',o.text);
      if(i===3)M.SQ.say('dj',"COUSIN! ...From the thing! (hug) This one's for my cousin!");M.SQ.say('dj',L.song[0][1]);
      M.SQ.run(()=>{M.D.bump(i===3||i===0?'win':.06);chatClose(M);startSong(M)})})},
  kev(M,ch,p){if(!M.ticket){M.SQ.say('kev',"Raffle ticket? Five bucks. Prize is a mystery. (quietly) It's a leaf blower.",{tell:'[Kev is selling exactly zero raffle tickets. Bored.]'});
      const opts=[{reg:'real',text:"Sure. I'll take one."},{reg:'joke',text:"Five bucks for a mystery? I'll take two mysteries. ...One. One mystery."},{reg:'over',text:"I've never won anything. Not once. I came second in a pie contest. There were two pies."}];
      offer(M,ch,opts,(i,o)=>{if(i<0){M.SQ.say('kev',"...Cool.");M.SQ.run(()=>chatClose(M));return}M.SQ.say('you',o.text);M.SQ.say('kev',i===1?"(snorts) One mystery. Ticket four-oh-seven. Good luck.":i===2?"(winces) Two pies. Man. Ticket four-oh-seven. You're due.":"Ticket four-oh-seven. Good luck.");
        M.SQ.run(()=>{M.ticket=true;M.D.bump(i===1?'win':.05);tone({f:1320,d:.06,gain:.05,bus:'ui'});M.V.toast('Raffle ticket #407','up');chatClose(M)})});return}
    if(!M.raffled){M.SQ.say('kev',"Four-oh-seven! You want me to get Vince to do the raffle? He's been dying to.");
      offer(M,ch,[{reg:'real',text:"Yes. Raffle now. I have a... thing."},{reg:'joke',text:"Not yet. I'm savouring the mystery."}],(i,o)=>{if(i<0){M.SQ.run(()=>chatClose(M));return}M.SQ.say('you',o.text);
        if(i===0){M.SQ.say('kev',"VINCE! RAFFLE!");M.SQ.run(()=>{chatClose(M);startRaffle(M,true)})}else{M.SQ.say('kev',"Savour away.");M.SQ.run(()=>chatClose(M))}});return}
    M.SQ.say('kev',M.prize?"Congrats on the leaf blower. It pulls left.":"Raffle's done. Vince won. Vince always wins.");M.SQ.run(()=>chatClose(M))},
  visit(M,ch,p){const ok=M.deniseOk||M.vip;M.SQ.say(p.id,ok?L.backroomOk[p.id]||"Oh, hey.":L.backroomVisit[p.id]||"Who are you?",{tell:'['+p.c.name+' is holding a box of balloons. Nervous.]'});
    if(ok){M.SQ.run(()=>{p.okd=true;chatClose(M)});return}
    const opts=[{reg:'real',text:"Looking for the bathroom."},{reg:'joke',text:"I'm with the... ledger. Ledger guy. Ledger and associates."},{reg:'over',text:"Honestly? I needed a minute. Parties are a lot. I sit in my van in the driveway sometimes."}];
    if(M.balloonLine)opts.push({reg:'special',as:'real',tag:'Balloon emergency',text:"Balloon emergency.",custom:()=>({dr:20})});
    offer(M,ch,opts,(i,o)=>{if(i<0){M.SQ.say(p.id,"...I'm getting Vince.");M.SQ.run(()=>{M.D.bump(-.15);chatClose(M)});return}M.SQ.say('you',o.text);
      const r=i===3?"...Oh no. Okay. Okay, I didn't see anything. GO.":i===2?"(softens) ...Yeah. Me too, man. Take your minute. Don't touch the safe.":i===0?"It's at the Shell! Everybody knows it's at the Shell!":"(laughs nervously) ...Ledger and associates. Okay. Sure.";
      M.SQ.say(p.id,r);M.SQ.run(()=>{const good=i===3||i===2;M.D.bump(good?'win':i===0?-.05:.02);if(good)p.okd=true;chatClose(M)})})}};
function eat(M){M.D.bump(.02);M.ate=(M.ate||0)+1;tone({f:180,to:140,type:'triangle',d:.08,gain:.05});if(M.D.id==='mustache'&&!M.slip){M.slipT=Math.min(M.slipT,.8)}bark(M,M.pp.hotdog,M.ate>2?"That's "+M.ate+". I'm not counting. I'm counting.":"Enjoy! Don't ask!")}
function bark(M,p,text,dur){if(!p)return;ovBubble(M,p,text,dur||3.2,p.c?p.c.name:'')}

/* ---------------- the photo op with Vince and the giant scissors ---------------- */
function photoStart(M){const p=M.pp.vince;M.photo={st:'walk',t:0,tries:0};go(p,S.photoV,'photo')}
function photoTick(M,dt,F){const a=A(),P=a.P,ph=M.photo,v=M.pp.vince;if(!ph)return;ph.t+=dt;
  const at=hyp(P.pos.x-S.photoP.x,P.pos.z-S.photoP.z),vin=!v.path||!v.path.length;
  if(ph.st==='walk'){F.objs.push(['Stand on the spot for Vince\'s photo',false]);F.target={x:S.photoP.x,z:S.photoP.z,label:'Photo spot'};ringAt(M,S.photoP,true);
    if(at<.9&&vin){ph.st='aim';ph.t=0;vfOpen(M)}return}
  ringAt(M,S.photoP,false);
  if(ph.st==='aim'){if(at>1.8){ph.st='walk';vfClose(M);return}
    const k=ph.t/K.photo.period;ph.q=.5+.5*Math.sin(k*Math.PI*2+Math.sin(k*3.7)*.6);const ok=ph.q>=K.photo.green[0]&&ph.q<=K.photo.green[1];
    M.hint='Wait for the smile, then <kbd>Click</kbd> or <kbd>E</kbd> · shutter';vfSet(M,ph.q,ok);
    if(a.useTap){a.useTap=false;snap(M)}F.objs.push(["Take Vince's photo when he's smiling (click or E)",false]);return}
  if(ph.st==='done'){ph.t2=(ph.t2||0)+dt;if(ph.t2>1.2){vfClose(M);M.photo=null;go(v,v.c.at,'return')}}}
function snap(M){const ph=M.photo;if(!ph||ph.st!=='aim')return;const ok=ph.q>=K.photo.green[0]&&ph.q<=K.photo.green[1];shutter(M);ph.tries++;
  if(ok||ph.tries>=K.photo.tries){ph.st='done';ph.t2=0;M.vip=true;M.D.bump(ok?'win':.05);M.queue.push(L.photoOk,L.photoVince,...L.vip);bark(M,M.pp.vince,"NO QUESTIONS ASKED!",2.6);
    if(M.vf)M.vf.set({hint:ok?'Front page.':'Good enough!'})}
  else{bark(M,M.pp.vince,"Wait, wait— my good side!",1.8);M.hint=pickN(L.blink,ph.tries)+' Try again.'}}
function shutter(M){tone({f:2400,to:900,type:'square',d:.035,gain:.05});tone({f:600,to:300,type:'square',d:.05,gain:.04,at:.05});M.flashT=.18}
function vfOpen(M){const a=A();try{if(a.HUD&&a.HUD.kit&&a.HUD.kit.viewfinder){M.vf=a.HUD.kit.viewfinder();a.HUD.overlay('pawnvf',M.vf.el);M.vf.set({label:M.D.id==='press'?'GAZETTE':'PHONE',hint:'[Click] / [E] shutter'})}}catch(e){M.vf=null}
  const O=overlay(M);if(!O.meter){const m=document.createElement('div');m.className='pw-vf-meter';m.innerHTML='<div class="z"></div><div class="n"></div>';const l=document.createElement('div');l.className='pw-vf-lab';l.textContent='Vince’s smile';O.el.appendChild(m);O.el.appendChild(l);O.meter=m;O.mlab=l;
    const z=m.querySelector('.z');z.style.left=(K.photo.green[0]*100)+'%';z.style.width=((K.photo.green[1]-K.photo.green[0])*100)+'%'}O.meter.style.display=O.mlab.style.display=''}
function vfSet(M,q,ok){const O=M.ov;if(O&&O.meter){const n=O.meter.querySelector('.n'),l=(q*100).toFixed(1)+'%';if(n._l!==l){n._l=l;n.style.left=l}}if(M.vf)try{M.vf.set({stars:null,bracket:null,label:ok?'SMILE!':'...'})}catch(_){}}
function vfClose(M){const a=A();if(M.vf){try{a.HUD.overlay('pawnvf',null)}catch(_){}M.vf=null}const O=M.ov;if(O&&O.meter){O.meter.style.display=O.mlab.style.display='none'}M.hint=''}
/* a small yellow ring on the ground where the dad should stand */
function ringAt(M,p,on){const a=A(),T3=a.THREE,V=M.vis;if(!V.ring){const g=own(M,new T3.RingGeometry(.42,.55,32));g.rotateX(-Math.PI/2);V.ring=new T3.Mesh(g,own(M,new T3.MeshBasicMaterial({color:0xf2c230,transparent:true,opacity:.85,depthWrite:false})));V.ring.renderOrder=3;V.g.add(V.ring)}
  V.ring.visible=!!on;if(on){V.ring.position.set(p.x,gy(p.x,p.z)+.03,p.z);const s=1+.08*Math.sin(M.t*4);V.ring.scale.set(s,1,s)}}

/* ---------------- distractions ---------------- */
function startSong(M){if(M.ev)endEvent(M);startEvent(M,'song');M.songCd=60;M.songs=(M.songs||0)+1;M.queue.push(L.song[1]);if(M.pp.denise&&M.ev.who.includes('denise'))M.queue.push(L.songDenise);M.beat=0}
function startCanapes(M){if(M.ev)endEvent(M);startEvent(M,'canape');M.canapeCd=K.canapeCd;M.canapes=(M.canapes||0)+1;M.queue.push(L.canapeCall);if(M.ev.who.includes('denise'))M.queue.push(L.canapeDenise)}
function startRaffle(M,early){if(M.raffled)return;if(M.ev)endEvent(M);M.raffled=true;startEvent(M,'raffle');M.queue.push(early?L.raffleEarly:L.raffleCall);M.raffleLines=0;M.raffleEarly=!!early}
function eventTick(M,dt){const ev=M.ev;if(!ev)return;ev.t+=dt;
  if(ev.kind==='raffle'){const k=[6,10,13,16];if(M.raffleLines<4&&ev.t>k[M.raffleLines]){const seq=M.ticket?L.raffleWin:L.raffleLose;if(M.raffleLines<seq.length)M.queue.push(seq[M.raffleLines]);
      if(M.raffleLines===2){if(M.ticket){M.prize=true;tone({f:880,d:.12,gain:.05,bus:'ui'});tone({f:1320,d:.18,gain:.05,bus:'ui',at:.12});for(const id of ev.who)if(Math.random()<.5)bark(M,M.pp[id],pickN(["WOOO!","Who won?","A leaf blower!","(applause)","Is that the mustache guy?"],id.length),2)}}M.raffleLines++}}
  if(ev.t>=ev.T)endEvent(M)}

/* ---------------- DJ Layaway's one song (tones on the sfx bus, louder the closer you are; muffled in the back) ---------------- */
const SONG={bpm:118,party:{bass:[38,38,50,38,41,41,53,41,36,36,48,36,43,43,55,43],lead:[74,0,74,76,0,77,76,0,74,0,72,0,71,72,74,0]},
  req:{bass:[43,0,43,0,50,0,50,0,52,0,52,0,48,0,48,0],lead:[67,67,69,71,0,71,69,67,64,0,64,66,67,0,0,0]}};
const mtof=m=>440*Math.pow(2,(m-69)/12);
function djTick(M,dt){const Au=AU();if(!Au||!Au.tone)return;const P=A().P,d=hyp(P.pos.x-S.dj.x,P.pos.z-S.dj.z);let vol=clamp(1-(d-5)/40,0,1);if(inBack(P.pos.x,P.pos.z)||inShop(P.pos.x,P.pos.z))vol*=.4;if(M.chat)vol*=.6;if(M.photo&&M.photo.st==='aim')vol*=.7;
  if(vol<=.01)return;const step=60/SONG.bpm/4;M.beatT=(M.beatT||0)+dt;if(M.beatT<step)return;M.beatT-=step;const i=(M.beat=(M.beat||0)+1),s=i%16,bar=Math.floor(i/16);
  const req=M.ev&&M.ev.kind==='song',pat=req?SONG.req:SONG.party,g=.05*vol;
  if(s%4===0)tone({f:req?110:130,to:45,type:'sine',d:.16,gain:g*1.6});
  if(!req&&s%4===2)tone({f:7800,type:'square',d:.018,gain:g*.25});if(s===4||s===12)tone({f:req?230:200,to:120,type:'triangle',d:.09,gain:g*.8});
  const b=pat.bass[s];if(b)tone({f:mtof(b),type:'sawtooth',d:step*.9,gain:g*.55});
  const l=pat.lead[s];if(l&&(req||bar%2===0))tone({f:mtof(l)*(req?1:1.012)/* a touch out of tune */,type:req?'triangle':'square',d:step*1.6,gain:g*.45});
  /* the airhorn: far too often */
  if(!req&&s===0&&bar%4===3){for(const f of[466,554,698])tone({f,to:f*.97,type:'sawtooth',d:.42,gain:g*.35});}}
/* =====================================================================
   SETUP: the ladder and the ledger (props the job moves), the cover session, the cast
   ===================================================================== */
function buildMovables(M){const a=A(),T3=a.THREE,V=M.vis,G=V.G,m=V.m;
  /* Marco's step ladder at the east foot of the arch */
  {const g=new T3.Group(),c=S.ladder;g.position.set(c.x,gy(c.x,c.z),c.z);const al=V.m.al||(V.m.al=matC(M,'#c9ced3',{roughness:.35,metalness:.7}));
    for(const k of[-1,1])for(const s of[-1,1]){const r=new T3.Mesh(G.box,al);r.scale.set(.05,1.95,.03);r.position.set(s*.24,.95,k*.33);r.rotation.x=k*-.17;r.castShadow=true;g.add(r)}
    for(let i=1;i<5;i++){const st=new T3.Mesh(G.box,al);st.scale.set(.5,.025,.1);st.position.set(0,i*.38,-.33+i*.065);st.castShadow=true;g.add(st)}
    const top=new T3.Mesh(G.box,V.m.orange);top.scale.set(.56,.06,.2);top.position.set(0,1.92,0);g.add(top);g.rotation.y=.3;V.g.add(g);V.ladder=g}
  /* the buy ledger on the desk: a fat green book, open */
  {const c=S.ledger,g=new T3.Group();g.position.set(c.x,.79,c.z);const pg=canvasTex(M,256,128,(x,w,h)=>{x.fillStyle='#f3eedc';x.fillRect(0,0,w,h);x.fillStyle='#7d1f1a';x.fillRect(w/2-1,0,2,h);
      x.strokeStyle='rgba(60,80,140,.35)';x.lineWidth=1;for(let y=14;y<h;y+=9){x.beginPath();x.moveTo(6,y);x.lineTo(w-6,y);x.stroke()}x.fillStyle='#2a2a3a';x.font='9px monospace';
      const rows=['DATE  ITEM          PAID  NAME','5/02  bike (red)     $15   T.J.','5/02  drill          $10   M.','5/04  leaf blower    $20   D.R.','5/06  laptop         $40   K.','5/07  bike           $15   T.J.','5/09  tool set       $25   A.','5/11  speaker        $10   J.W.','5/12  hedge clipper  $5    D.R.'];
      rows.forEach((r,i)=>{x.fillText(r.slice(0,15),8,12+i*9.5*1.25);x.fillText(r.slice(15),w/2+8,12+i*9.5*1.25)})});
    const cover=new T3.Mesh(G.box,matC(M,'#1f5a3a',{roughness:.6}));cover.scale.set(.5,.025,.34);g.add(cover);
    const pages=new T3.Mesh(own(M,new T3.PlaneGeometry(.47,.31)),own(M,new T3.MeshStandardMaterial({map:pg,roughness:.9})));pages.rotation.x=-Math.PI/2;pages.position.y=.016;g.add(pages);g.rotation.y=.12;V.g.add(g);V.ledger=g}}
function init(M,F){const a=A(),Soc=SOC();if(!Soc){F.objs.push(['Dee is finding the disguises...',false]);return false}
  if(!M.vis.g){buildParty(M);buildMovables(M);overlay(M);walls(M)}
  if(!M.D){M.D=Soc.cover({id:(M.dsave&&M.dsave.id)||'mustache',seed:M.seed});if(M.dsave){M.D.load(M.dsave);/* a retry: you got your breath back */M.D.cover=Math.max(M.D.cover,M.D.max*.75)}}
  if(!M.pp){if(!castLoaded()){M.castWait=(M.castWait||0)+1;if(!M.castP)M.castP=preloadCast();return 'cast'}spawnCast(M);if(M.dsave&&M.dsave.id&&M.ph!=='van')dress(M,M.D.id);if(M.archFixed)balloonPose(M,0);if(M.book&&M.vis.ledger)M.vis.ledger.visible=false;
    for(const id in M.talked){const p=M.pp[id];if(p)p.talked=M.talked[id]}}
  M.ready=true;return true}

/* ---------------- the radio queue: one line every ~3 s, front-loaded lines first ---------------- */
function queueTick(M,dt){M.qT-=dt;if(M.qT>0||!M.queue.length)return;const l=M.queue.shift();radio(l[0],l[1]);M.qT=Math.min(4.2,1.6+l[1].length*.035)}

/* ---------------- the disguise's tell slipping, G to fix ---------------- */
function slipTick(M,dt,seen){const a=A(),k=a.keys,D=M.D;const edge=!!M.fixTap||(!!k.g&&!M.gWas);M.fixTap=false;M.gWas=!!k.g;
  if(edge){if(M.slip||M.ph==='fix'){M.slip=false;M.slipT=D.nextSlip();M.fixes=(M.fixes||0)+1;try{PPL().interact(a.P.dude)}catch(_){}tone({f:520,to:640,type:'triangle',d:.08,gain:.04,bus:'ui'});
      if(seen.length)D.bump(K.fixPen);radio('you',pickN(L.fixed,M.fixes),true);if(M.ph==='fix'){M.ph='walk';M.queue.push(L.coverTut);M.hint=''}}}
  if(M.ph==='fix'){M.slip=true}else if(!M.slip){M.slipT-=dt*((a.keys.shift&&a.P.moving)?2.2:1);if(M.slipT<=0){M.slip=true;M.slipN=(M.slipN||0)+1;tone({f:300,to:200,type:'sine',d:.12,gain:.03,bus:'ui'})}}
  M.slipK=clamp((M.slipK||0)+(M.slip?dt*1.6:-dt*6),0,1);slipVis(M,M.slipK);
  if(M.slip&&M.ph!=='fix')M.hint=LOOK[D.id].slipLine+' Press <kbd>G</kbd>';else if(M.ph!=='fix'&&M.hint&&/Press <kbd>G<\/kbd>/.test(M.hint))M.hint=''}

/* ---------------- the cover loop: who sees what you're doing ---------------- */
function coverTick(M,dt){const a=A(),P=a.P,D=M.D;if(!D||!M.pp)return[];const x=P.pos.x,z=P.pos.z;
  const seen=watchers(M);const zone=inBack(x,z)||(x>355.9&&x<358.1&&z>30.2&&z<32.1)?'staff':'public';M.zone=zone;
  const crowd=Object.values(M.pp).filter(p=>p.c.kind==='guest'&&hyp(p.pos.x-x,p.pos.z-z)<K.crowdR).length;
  const loitering=zone==='public'&&nearStaffDoor(x,z)&&!M.got;M.loiterT=loitering?(M.loiterT||0)+dt:0;
  const running=!!(a.keys.shift&&P.moving)&&!a.CV,st={seen,running,crouch:!!P.crouch&&!a.CV,zone,access:!!(M.deniseOk||M.vip),carry:!!M.book,slipped:!!M.slip&&M.ph!=='fix',talking:!!M.chat,crowd,loiter:M.loiterT>K.loiterT};
  if(a.CV||M.ph==='van'||M.ph==='fix'&&!seen.length){M.cov=st;return seen}
  const r=D.tick(dt,st);M.cov=st;
  for(const e of r.events){const p=M.pp[e.id];if(e.kind==='polite'&&p){bark(M,p,pickN(p.c.kind==='guest'?L.politeStart:L.barkStaff,D.started),3.4);tone({f:420,to:380,type:'sine',d:.12,gain:.03,bus:'ui'})}
    else if(e.kind==='excuse'&&p){bark(M,p,pickN(L.excuse,D.excused),3.4);tone({f:330,to:250,type:'triangle',d:.22,gain:.05,bus:'ui'});radio('dee',D.cover<.25?"They're onto you. Walk away, talk to somebody, fix it. Fast.":"Somebody said 'excuse me'. That's Riverside for 'I'm calling somebody'.",true)}
    else if(e.kind==='cancel'&&p&&e.why==='fixed'&&Math.random()<.5)bark(M,p,pickN(L.politeCancel,M.t|0),2.2);
    else if(e.kind==='blown'){M.blownT=1.8;const v=M.pp.vince;bark(M,v&&hyp(v.pos.x-x,v.pos.z-z)<25?v:(seen[0]&&M.pp[seen[0].id])||v,L.blown[1],3);radio('vince',L.blown[1],true)}}
  /* what people say about what they see */
  M.barkCd=(M.barkCd||0)-dt;if(M.barkCd<=0&&seen.length){const near=seen.filter(s=>s.d<6).sort((p,q)=>p.d-q.d)[0];if(near){const p=M.pp[near.id];let pool=null;
      if(st.running)pool=L.barkRun;else if(st.crouch)pool=L.barkCrouch;else if(st.carry)pool=L.barkCarry;else if(zone==='staff'&&!st.access)pool=L.barkStaff;else if(st.loiter)pool=L.barkLoiter;else if(st.slipped)pool=D.id==='mustache'?L.barkCrooked:[LOOK[D.id].slipLine];
      else if(near.d<3.5&&Math.random()<.35&&!M.chat)pool=D.id==='mustache'?L.barkMustache:D.id==='press'?L.barkPress:L.barkCousin;
      if(pool&&!M.chat){bark(M,p,pickN(pool,(M.bk=(M.bk||0)+1)),3);M.barkCd=pool===L.barkMustache||pool===L.barkPress||pool===L.barkCousin?9:4.5}else M.barkCd=1.2}}
  /* the people you met as somebody else */
  for(const s of seen){const p=M.pp[s.id];if(s.d<K.recogR&&D.knows(s.id)&&!p.recog){p.recog=true;D.recognise(s.id);bark(M,p,L.recog[D.met[s.id]]||"Didn't you just...?",3.2)}}
  return seen}

/* ---------------- the radio and ambient chatter of the party ---------------- */
function partyChatter(M,dt){M.djT=(M.djT==null?14:M.djT)-dt;const P=A().P;
  if(M.djT<=0){M.djT=26+Math.random()*10;const d=hyp(P.pos.x-S.dj.x,P.pos.z-S.dj.z);if(d<34&&!M.chat&&!inBack(P.pos.x,P.pos.z))bark(M,M.pp.dj,pickN(L.dj,M.djN=(M.djN||0)+1),4.2)}
  M.viT=(M.viT==null?22:M.viT)-dt;if(M.viT<=0){M.viT=30+Math.random()*12;const v=M.pp.vince;if(v&&v.mode==='home'&&!M.chat)bark(M,v,pickN(L.vince,M.viN=(M.viN||0)+1),3.6)}
  /* Vince works the room: door, dance floor, hot dogs, back */
  const v=M.pp.vince;if(v&&v.mode==='home'&&!M.photo){v.wT=(v.wT==null?18:v.wT)-dt;if(v.wT<=0){v.wT=20+Math.random()*10;const spots=[{x:363,z:40.6},{x:350.6,z:41.3},v.c.at];M.viK=((M.viK||0)+1)%3;go(v,spots[M.viK],'walk')}}
  else if(v&&v.mode==='walk'&&(!v.path||!v.path.length))v.mode='home'}

/* ---------------- the back office: somebody comes in for balloons (or raffle tickets) ---------------- */
function visitTick(M,dt){const P=A().P;if(!inBack(P.pos.x,P.pos.z)||M.visitDone){if(M.visitor)visitWalk(M,dt);return}M.backT=(M.backT||0)+dt;
  if(M.backT>K.visitAt){const cand=[M.pp.marco,M.pp.kev].filter(p=>p&&p.mode==='home'&&(p.c.id!=='marco'||M.archFixed));const p=cand[0]||M.pp.kev;if(!p)return;M.visitDone=true;M.visitor=p;p.visitT=0;go(p,W.box,'visit');
    if(!(M.deniseOk||M.vip))M.queue.unshift(['dee',"Somebody's coming. Look busy. Look like you belong. You don't. Look like it anyway."])}}
function visitWalk(M,dt){const p=M.visitor;if(!p)return;const P=A().P;
  if(p.mode==='visit'&&p.sees&&!p.saidIn&&inBack(p.pos.x,p.pos.z)){p.saidIn=true;bark(M,p,(M.deniseOk||M.vip)?L.backroomOk[p.id]||"Oh, hey.":L.backroomVisit[p.id]||"Who are you?",3.4)}
  if(p.mode==='visit'&&(p.visitT||0)>(p.okd?2:5.5)&&!(M.chat&&M.chat.p===p)){go(p,p.c.at,'return');M.visitor=null}}

/* ---------------- the ledger ---------------- */
function pageShot(M){const a=A(),P=a.P;if(M.pages>=K.pages)return false;if(hyp(P.pos.x-S.desk.x,P.pos.z-S.desk.z)>1.6)return false;
  if((M.steady||0)>0){M.hint='Hold still... the '+(M.D.id==='press'?'camera':'phone')+' is focusing';return true}
  M.pages++;shutter(M);M.steady=M.D.id==='press'?K.pagesHold.press:K.pagesHold.other;tone({f:900,to:1400,type:'triangle',d:.05,gain:.025,at:.25});/* page turn */
  if(M.cov&&M.cov.seen.length)M.D.bump(-.06);
  if(M.pages>=K.pages){M.queue.push(L.havePages);gotIt(M)}else M.hint='Page '+M.pages+' of '+K.pages+'. <kbd>Click</kbd> for the next one';return true}
function takeBook(M){if(M.book)return;M.book=true;M.D.bump(K.book);if(M.vis.ledger)M.vis.ledger.visible=false;tone({f:160,to:120,type:'triangle',d:.12,gain:.06});carryBook(M,true);M.queue.push(L.haveBook);gotIt(M)}
function gotIt(M){if(M.got)return;M.got=true;M.hint='';music('tension',.35)}
function carryBook(M,on){const a=A(),T3=a.THREE,V=M.vis,d=a.P.dude;if(V.carry&&V.carry.parent)V.carry.parent.remove(V.carry);V.carry=null;if(!on||!d)return;const h=d.gunHold||(d.rb&&d.rb.body.getObjectByName('Bip01_R_Hand'));if(!h)return;
  const b=new T3.Mesh(V.G.box,matC(M,'#1f5a3a',{roughness:.6}));b.scale.set(.05,.34,.26);b.position.set(0,-.05,-.08);h.add(b);V.carry=b}

/* =====================================================================
   THE JOB
   ===================================================================== */
J.item('pawn_cam',{name:'Camera',use(M){camUse(M)}});
/* the shutter is the left mouse button. index.html only calls fire() (and so the held item) while a gun may be drawn, and this job has
   def.noGuns: listen for the click ourselves (under pointer lock, the way a real player clicks), and for the touch fire button */
if(typeof window!=='undefined'&&window.addEventListener&&typeof document!=='undefined'){
  /* G fixes the disguise: catch the key press itself (a tap shorter than a frame never shows up in the held-key state) */
  window.addEventListener('keydown',e=>{if(e.repeat||(e.key||'').toLowerCase()!=='g')return;const a=A(),M=a&&a.M;if(!M||M.def.id!=='pawn'||a.mode!=='mission'||M.state!=='go')return;M.fixTap=true},true);
  window.addEventListener('mousedown',e=>{if(e.button!==0||!document.pointerLockElement)return;const a=A(),M=a&&a.M;if(!M||M.def.id!=='pawn'||a.mode!=='mission')return;camUse(M)},true);
  let TB=false;J.on('hud',()=>{if(TB)return;const a=A();if(!a||!a.HUD||!a.HUD.on)return;TB=true;a.HUD.on('touch',(act,down)=>{if(act!=='fire'||!down)return;const M=A().M;if(M&&M.def.id==='pawn')camUse(M)})})}
function camUse(M){if(!M||M.def.id!=='pawn'||M.state!=='go')return;if(M.useF===M.frame)return;M.useF=M.frame;const V=M.V;
  if(M.chat&&V&&V.choice){V.confirm();return}if(M.chat&&V){V.skip();return}
  if(M.photo&&M.photo.st==='aim'){snap(M);return}
  if(M.stage==='office'&&pageShot(M))return;
  /* anywhere else: a photo of the party. The press does this all day; anybody else looks like a tourist */
  shutter(M);const P=A().P,near=Object.values(M.pp||{}).filter(p=>p.sees&&hyp(p.pos.x-P.pos.x,p.pos.z-P.pos.z)<6)[0];
  if(near)bark(M,near,M.D&&M.D.id==='press'?pickN(["Get my good side!","Is this for the paper?","(poses)"],M.t|0):pickN(["...Did he just take my picture?","Are you a tourist? In Riverside?"],M.t|0),2.4);
  if(M.D&&M.D.id!=='press'&&near)M.D.bump(-.04)}

J.register('pawn',{
  def:{giver:'dee',hood:'river',title:'Grand Opening',role:'Pastor Dee · 2nd St Church, Youth Group',place:'Cash-4-Yer-Stuff, Main St',
    lines:["There's a pawn shop opening on Main. Cash-4-Yer-Stuff. 'No questions asked.' Balloons, a DJ, free hot dogs. Half the block will be there.",
      "Their buy ledger is in the back office. Every bike and drill some kid sold them for ten dollars, with the kid's name next to it. I need that book.",
      "No guns, no shouting. Put on a disguise, smile, eat a hot dog, and walk into the back like you belong. You won't. Nobody will say a word."],
    obj:"Crash the grand opening in a disguise, keep your cover, get past the staff into the back office, get the buy ledger (photos or the book), and walk out.",
    crew:[],weapons:[],from:{place:'g_dee'},start:{x:S.van.x,z:S.van.z},site:'pawn',
    unlock:{done:['dee'],trustR:30},pay:900,par:K.par,order:30,
    noGuns:L.noGuns,failPolicy:'soft',
    stages:['party','office','exit'],stageLabels:{party:'Back at the van: pick a disguise',office:'The back office',exit:'Walking out'},
    medals:['Finished','Nobody went "…": no politeness timer','With the Mustache, under 5:00, and nobody went "…"'],
    radio:[['dee',"Park down the block. Cash-4-Yer-Stuff. You'll see the balloons. You can't not see the balloons."]],
    endLine:"Pastor Dee doesn't hand the ledger to anyone. She spends the week at nine kitchen tables. Cash-4-Yer-Stuff closes on Friday, and by the end of the month the storefront smells like bread: Ramos Bakery, with a line out the door at eight."},

  start(M,o){M.vis={own:[]};M.queue=[];M.qT=1.2;M.said={};M.t=0;M.frame=0;M.seed=(o&&o.checkpoint?7331:1234)+((M.replay?1:0)*17);
    M.ph='van';M.talked={};M.pages=0;M.book=false;M.got=false;M.ticket=false;M.raffled=false;M.prize=false;M.archFixed=false;M.balloonLine=false;M.vip=false;M.deniseOk=false;
    M.ladderO={};M.ladderOn=false;M.songCd=0;M.canapeCd=0;M.songs=0;M.canapes=0;M.slip=false;M.slipT=K.slipFirst;M.slipK=0;M.hint='';M.watchAt={};M.ev=null;M.photo=null;M.chat=null;
    M.D=null;M.dsave=null;M.ready=false;M.item='pawn_cam';LIVE.M=M;
    try{const O=H().ow;if(O&&O.traffic)O.traffic(0,{player:A().P.pos,car:null,camera:A().camera,off:true})}catch(_){}/* the lane is closed for the party */
    M.castP=preloadCast();music(null);
    if(!(o&&o.checkpoint))M.queue.push(...L.arrive)},

  upd(dt,M,F){const a=A(),P=a.P;M.frame++;
    if(!M.ready){const r=init(M,F);if(r!==true){if(r==='cast')F.objs.push(['The party is setting up... (balloons take a minute)',false]);if(M.ph!=='van')return}}
    /* a fresh start: the dad steps out beside the van (not into the middle of the party in his own face) */
    if(!M.placed){M.placed=true;const c=M.car||a.VAN;if(!a.CV&&c&&c.pos&&M.ph==='van'){const r={x:Math.cos(c.yaw),z:-Math.sin(c.yaw)};P.pos.set(c.pos.x+r.x*2.0,P.pos.y,c.pos.z+r.z*2.0);a.collide(P.pos,.35);P.yaw=Math.atan2(-(358-P.pos.x),-(40-P.pos.z));P.pitch=-.05}}
    M.t+=dt;queueTick(M,dt);
    if(M.blownT!=null){M.blownT-=dt;if(M.blownT<=0){M.blownT=null;return a.spotted(L.blownFail)}}
    const D=M.D;
    /* people, events, chatter */
    if(M.pp){for(const id in M.pp)personTick(M,M.pp[id],dt);eventTick(M,dt);partyChatter(M,dt);visitTick(M,dt)}
    if(M.vis.balloons)balloonPose(M,M.t);tubeTick(M,M.t);if(M.vis.mirror)M.vis.mirror.rotation.y+=dt*.8;
    M.songCd=Math.max(0,M.songCd-dt);M.canapeCd=Math.max(0,M.canapeCd-dt);M.steady=Math.max(0,(M.steady||0)-dt);M.flashT=Math.max(0,(M.flashT||0)-dt);
    djTick(M,dt);
    /* the conversation strip runs on game time; walking off ends it */
    if(M.chat){M.chat.t+=dt;M.SQ.update(dt);M.V.meters([{id:'cov',label:'Cover',v:Math.round(D.cover*100),max:100,sub:Math.round(D.cover*100)+'%',warn:D.cover<.35}]);
      if(M.chat&&hyp(P.pos.x-M.chat.p.pos.x,P.pos.z-M.chat.p.pos.z)>K.walkOff)chatClose(M,'walk')}
    const seen=M.D&&M.pp?coverTick(M,dt):[];if(M.D&&M.ph!=='van')slipTick(M,dt,seen);
    if(M.photo)photoTick(M,dt,F);
    /* ---- stages ---- */
    const inB=inBack(P.pos.x,P.pos.z);
    if(M.stage==='party'&&inB&&M.D&&M.ph!=='van'){a.CP.mark('office');M.queue.unshift(L.inBack);music('tension',.25)}
    if(M.stage==='office'&&M.got&&!inB&&P.pos.z>30.6){a.CP.mark('exit');if(!M.raffled)startRaffle(M,false);else M.queue.push(L.outside);music('tension',.45)}
    if(M.stage==='exit'&&!M.exitOpen&&P.pos.z>38.6&&!inShop(P.pos.x,P.pos.z)){M.exitOpen=true;M.queue.push(L.outside)}
    objectives(M,F,dt);pins(M);
    /* leash: the party is the job */
    const dl=hyp(P.pos.x-359,P.pos.z-38);if(dl>K.leash&&!a.CV&&!M.exitOpen){M.leaveT=(M.leaveT||0)+dt;F.objs.push(['Back to the party ('+Math.max(0,Math.ceil(12-M.leaveT))+')',false,'warn']);if(M.leaveT>12)return a.endMission(false,L.leashFail,'You left the party.')}else M.leaveT=0;
    /* HUD */
    if(D&&M.ph!=='van'){F.meters.push({id:'cover',label:'Cover',v:D.cover,max:1,style:'bar',warn:.35,warnBelow:true,icon:'mask',sub:LOOK[D.id].label,marker:.4});
      if(M.stage==='office'||M.stage==='exit')F.meters.push({id:'pages',label:'Ledger',v:Math.min(K.pages,M.pages)+(M.book?K.pages:0),max:K.pages*2,style:'pips',sub:M.book?'the book':M.pages+'/3 pages'});
      if(D.id==='mustache'&&!M.retried)F.widgets.push({id:'gold',kind:'timer',label:'Gold',v:Math.max(0,K.gold-M.elapsed),max:K.gold,hot:K.gold-M.elapsed<45})}
    ovTick(M,dt);
    M.score=Math.round((D?D.min:0)*100)},

  save(M){const D=M.D;return{ph:M.ph==='van'?'van':'mingle',dis:D?D.save():(M.dsave||null),talked:Object.assign({},M.talked),
    f:{bl:!!M.balloonLine,vip:!!M.vip,dn:!!M.deniseOk,tk:!!M.ticket,rf:!!M.raffled,pz:!!M.prize,af:!!M.archFixed,sg:M.songs|0,cn:M.canapes|0,pg:M.pages|0,bk:!!M.book,got:!!M.got,ft:!!(M.said&&M.said.firstTalk),fx:M.fixes|0},
    t:Math.round((M.t||0)*10)/10}},
  load(M,s){if(!s)return;M.ph=s.ph==='van'||!s.dis?'van':'mingle';M.dsave=s.dis||null;M.talked=Object.assign({},s.talked||{});const f=s.f||{};
    M.balloonLine=!!f.bl;M.vip=!!f.vip;M.deniseOk=!!f.dn;M.ticket=!!f.tk;M.raffled=!!f.rf;M.prize=!!f.pz;M.archFixed=!!f.af;M.songs=f.sg|0;M.canapes=f.cn|0;M.pages=f.pg|0;M.book=!!f.bk;M.got=!!f.got;M.fixes=f.fx|0;
    if(f.ft)M.said.firstTalk=1;M.t=s.t||0;M.queue=[];if(M.ph!=='van')M.queue.push(['dee',M.got?"Okay. Deep breath. You've got it. Now walk out like you came for the hot dogs.":"Okay. Deep breath. Fix your face. Try the back office again."]);
    if(M.D)M.D=null;M.ready=false},
  payout(M,ok){if(!ok)return[];const out=[],D=M.D;
    if(D&&D.min>=K.neverMin)out.push(['Never questioned · cover never under 40%',K.pay.never]);
    if(M.book&&M.pages>=K.pages)out.push(['Ledger and pictures · the book and three pages',K.pay.both]);
    if(M.prize)out.push(['Raffle prize · one leaf blower (pulls left)',0]);
    return out},
  medal(M){const D=M.D;const clean=D&&D.started===0;if(clean&&D.id==='mustache'&&M.elapsed<K.gold)return 3;return clean?2:1},
  end(M,ok){if(!ok)return;const a=A(),s=a.SV&&a.SV(),Sv=window.HT&&HT.Save;if(!s)return;s.flags=s.flags||{};s.flags.pawnNames=9;s.flags.deeVisits=true;if(M.prize)s.flags.leafBlower=true;
    try{if(Sv&&Sv.storefront)Sv.storefront(null,'pawn','bakery')}catch(_){}try{a.save()}catch(_){}},
  camera(dt){const a=A(),M=a.M;if(!M||M.def.id!=='pawn'||M.state!=='go')return undefined;return camHook(M,dt)||undefined},
  hud(st){const M=A().M;if(!M||M.def.id!=='pawn')return;const D=M.D;
    st.weapon={name:D?LOOK[D.id].item:'Phone',type:'camera',mag:M.stage==='office'?Math.max(0,K.pages-M.pages):0,reserve:0,magSize:K.pages,reloading:0,holstered:false,firemode:M.stage==='office'?'Ledger page':'Shutter'};st.weapons=[];
    if(D&&M.ph!=='van')st.gadgets=[{id:'pawnfix',label:M.slip?'Fix it!':'Disguise',key:'G',on:!!M.slip}];
    if(M.photo&&M.photo.st==='aim'&&st.crosshair)st.crosshair=Object.assign({},st.crosshair,{hidden:true})},
  pose(dt){const a=A(),M=a.M;if(!M||M.def.id!=='pawn')return;
    /* the weapon panel shows a camera or a phone, not a gun */
    const gEl=typeof document!=='undefined'&&document.querySelector('.ht-wp .gun');if(gEl&&!gEl.querySelector('.pw-cam'))gEl.innerHTML=CAM_SVG},
  test:{give(a){const h=window.__ht,s=a.SV();for(const id of['gary','rick','earl','dee']){const i=a.MISSIONS.findIndex(m=>m.id===id);if(i>=0&&h&&h.prog)h.prog.done[i]=true;if(s&&window.HT.Save&&HT.Save.jobRec)HT.Save.jobRec(s,id).done=true}
      if(s&&s.world)s.world.bridgeOpen=true;if(s&&s.flags)s.flags.act2Intro=true;if(h&&h.prog){h.prog.act=Math.max(h.prog.act||1,2);h.prog.trustR=Math.max(h.prog.trustR||0,30)}
      return preloadCast()},
    step:(a,t,o)=>bot(a,t,o),
    sample:()=>({ph:'mingle',vis:{own:[]},said:{firstTalk:1},talked:{gloria:'win',denise:'meh'},balloonLine:true,vip:false,deniseOk:false,ticket:true,raffled:false,prize:false,archFixed:true,songs:1,canapes:0,pages:2,book:false,got:false,fixes:2,t:141.5,
      D:{save:()=>({id:'mustache',cover:.512,min:.31,started:1,excused:0,met:{gloria:'mustache',denise:'mustache'},draws:3,watch:{}})},dsave:null})}
});
const CAM_SVG='<svg class="pw-cam" viewBox="0 0 120 60" width="120" height="60"><rect x="18" y="14" width="84" height="40" rx="6" fill="#20232a" stroke="#cfd3d8" stroke-width="2"/><rect x="30" y="8" width="22" height="8" rx="2" fill="#20232a" stroke="#cfd3d8" stroke-width="2"/><circle cx="60" cy="34" r="13" fill="#0e1014" stroke="#cfd3d8" stroke-width="3"/><circle cx="60" cy="34" r="6" fill="#3a5f8a"/><circle cx="92" cy="22" r="3" fill="#f2c230"/></svg>';

/* ---------------- objectives, the marker, the pins ---------------- */
function objectives(M,F,dt){const a=A(),P=a.P,D=M.D,car=M.car;
  if(M.ph==='van'){const r=vanRear(M);F.objs.push([a.CV?'Get out (E) and open the back of the van: your disguises':'Open the back of the van (E): pick a disguise',false]);if(r){F.target={x:r.x,z:r.z,label:'Disguises'};
      F.taps.push({x:r.x,z:r.z,r:2.2,txt:'Open the back: pick a disguise',fn:()=>pickOpen(M)})}return}
  if(M.ph==='fix'){F.objs.push(['Press G to straighten your '+(D.id==='mustache'?'mustache':D.id==='press'?'lanyard':'cap'),false]);M.hint=LOOK[D.id].slipLine+' Press <kbd>G</kbd> to fix it.';return}
  /* the van: change disguise (party stage only) */
  if(M.stage==='party'&&!M.got){const r=vanRear(M);if(r&&!a.CV)F.taps.push({x:r.x,z:r.z,r:2,txt:'Change disguise ('+LOOK[D.id].label+' now)',fn:()=>pickOpen(M)})}
  /* talk to anybody close */
  if(M.pp&&!M.chat&&!(M.photo&&M.photo.st==='aim'))for(const id in M.pp){const p=M.pp[id];const d=hyp(p.pos.x-P.pos.x,p.pos.z-P.pos.z);if(d>K.talkR)continue;
    const kind=p.mode==='visit'?'visit':CHAT[id]?id:'small';if(p.mode==='event'&&!['dj','kev'].includes(id)&&M.ev&&M.ev.kind==='raffle')continue;
    F.taps.push({d,r:K.talkR,txt:'Talk to '+(ROLE_NAME[id]||p.c.name)+(p.talked&&kind==='small'?' (again)':''),fn:()=>{const pl=a.P;pl.yaw=Math.atan2(-(p.pos.x-pl.pos.x),-(p.pos.z-pl.pos.z));chatOpen(M,p,kind)}})}
  /* the ladder */
  if(M.ladderOn&&!M.archFixed){F.objs.push(["Hold Marco's ladder (hold E)",false]);F.target={x:S.ladder.x+.25,z:S.ladder.z+.85,label:'Ladder'};
    F.holds.push({x:S.ladder.x+.25,z:S.ladder.z+.85,r:1.5,o:M.ladderO,txt:'Hold the ladder',time:K.ladder,fn:()=>ladderDone(M)});
    if((M.ladderO.prog||0)>.55&&!M.popped){M.popped=true;const B=M.vis.balloons;if(B){B.pop=B.pts.findIndex(b=>b.arch&&b.th<.4)}tone({f:1800,to:200,type:'square',d:.06,gain:.08});M.queue.unshift(...L.ladderPop)}}
  /* the snack table */
  if(M.stage==='party'||M.stage==='office'){const c=S.canape;F.taps.push({x:c.x,z:c.z+.95,r:1.6,txt:!M.ev&&M.canapeCd<=0?'Announce the pigs in blankets (everybody comes)':'Eat a pig in a blanket',fn:()=>{if(!M.ev&&M.canapeCd<=0)startCanapes(M);else eat(M)}})}
  /* the ledger */
  if(M.stage==='office'&&!M.book){const dd=hyp(P.pos.x-S.desk.x,P.pos.z-S.desk.z);F.taps.push({x:S.desk.x,z:S.desk.z,r:1.6,txt:'Take the whole book (it counts double; people notice books)',fn:()=>takeBook(M)});
    if(dd<1.6&&M.pages<K.pages&&!M.hint)M.hint='<kbd>Click</kbd> to photograph a page ('+M.pages+'/3) · <kbd>E</kbd> takes the whole book'}
  if(M.stage==='office'&&hyp(P.pos.x-S.desk.x,P.pos.z-S.desk.z)>=1.6&&/photograph a page/.test(M.hint||''))M.hint='';
  /* the list */
  const den=M.pp&&M.pp.denise,away=den&&(den.mode!=='home'||hyp(den.pos.x-K.denisePost.x,den.pos.z-K.denisePost.z)>3);
  if(M.ph==='walk'){F.objs.push(['Join the party and talk to someone: walk up, press E',false]);const g=M.pp&&nearest(M,p=>p.c.kind==='guest'&&!p.talked&&!inShop(p.pos.x,p.pos.z));if(g)F.target={x:g.pos.x,z:g.pos.z,label:'Say hi (E)'};else F.target={x:S.party.x0+3,z:41,label:'The party'}}
  else if(M.stage==='party'){const ok=M.deniseOk||M.vip;
    F.objs.push(['Get into the back office: the STAFF ONLY door, inside the shop',false]);
    F.objs.push([ok?(M.vip?"You're VIP: walk right in":"Denise is letting you through"):away?"Denise has left the door. Go now!":"Denise is watching the door. Find a way past her:",ok||away,ok||away?null:'warn']);
    if(!ok){F.objs.push(['· Help Marco with the balloon arch',M.archFixed]);F.objs.push(["· Vince's photo op with the giant scissors",M.vip]);F.objs.push(['· Request a song from DJ Layaway',M.songs>0]);F.objs.push(['· Pigs in blankets (the snack table)',M.canapes>0])}
    F.objs.push(['Optional: a raffle ticket from Kev',M.ticket]);
    if(!M.photo&&!M.ladderOn||M.archFixed&&!M.photo)F.target={x:S.staffDoor.x,z:S.staffDoor.z+1.4,label:'STAFF ONLY'}}
  else if(M.stage==='office'){F.objs.push(['Get the ledger: photograph 3 pages (click) or take the book (E)',M.got]);if(!M.got)F.target={x:S.desk.x,z:S.desk.z,label:'The ledger'};
    else{F.objs.push(['Leave the office',false]);F.target={x:S.staffDoor.x,z:S.staffDoor.z+1.2,label:'Out'}}
    F.objs.push(['Ledger: '+M.pages+'/3 pages'+(M.book?' + the book':''),M.pages>=3||M.book])}
  else if(M.stage==='exit'&&!M.exitOpen){F.objs.push([M.ev&&M.ev.kind==='raffle'?'Walk out the front door while everybody watches the raffle':'Walk out the front door',false]);F.target={x:S.door.x,z:S.door.z+2.2,label:'Front door'}}
  if(M.exitOpen&&M.prize&&!M.said.prize){M.said.prize=1;M.queue.push(['you',"I won a leaf blower. I'm keeping it. It's going back to Mrs. Patel."])}
  if(M.cov&&M.cov.zone==='staff'&&!(M.deniseOk||M.vip)&&M.cov.seen.length)F.objs.push(["Someone can see you in a staff area: get out of sight, or talk your way out (E)",false,'warn']);
  if(M.D&&M.D.cover<.35&&M.cov&&M.cov.seen.length)F.objs.push(['Cover is low: walk away, mingle in a crowd, or make small talk',false,'warn'])}
function nearest(M,ok){const P=A().P;let b=null,bd=1e9;for(const id in M.pp){const p=M.pp[id];if(ok&&!ok(p))continue;const d=hyp(p.pos.x-P.pos.x,p.pos.z-P.pos.z);if(d<bd){bd=d;b=p}}return b}
function vanRear(M){const c=M.car||A().VAN;if(!c||!c.pos)return null;let l=4.8;try{l=A().carSize(c).l||l}catch(_){}return{x:c.pos.x+Math.sin(c.yaw)*(l/2+.7),z:c.pos.z+Math.cos(c.yaw)*(l/2+.7)}}
function pins(M){if(!M.pp||M.ph==='van'||M.ph==='fix'||M.stage!=='party'||M.chat)return;const ok=M.deniseOk||M.vip,y=gy(358,40);
  const pin=(id,p,label,o)=>ovPin(M,id,p.x,(p.y||0)+y,p.z,label,o);
  pin('dj',{x:S.dj.x,y:2.45,z:S.dj.z},'DJ Layaway',{icon:'♪',sub:M.songs?'played the song':'song requests',done:M.songs>0&&M.songCd>0});
  if(!ok){pin('marco',{x:S.ladder.x,y:2.55,z:S.ladder.z},'Balloon arch',{icon:'○',sub:M.archFixed?'fixed':'help Marco',done:M.archFixed});
    const v=M.pp.vince;pin('vince',{x:v.pos.x,y:2.3,z:v.pos.z},'Vince',{icon:'◉',sub:M.vip?'VIP':'photo op',done:M.vip});
    pin('canape',{x:S.canape.x,y:1.45,z:S.canape.z},'Pigs in blankets',{icon:'•',sub:M.canapeCd>0?'refilling':'announce them',done:M.canapeCd>0})}
  pin('raffle',{x:S.raffle.x,y:1.75,z:S.raffle.z},'Raffle',{icon:'#',sub:M.ticket?'ticket #407':'Kev · $5',done:M.ticket});
  pin('door',{x:S.staffDoor.x,y:2.3,z:S.staffDoor.z+.6},'STAFF ONLY',{icon:'→',go:true,sub:ok?'you can go in':'Denise',far:30})}

/* ---------------- the disguise picker (keys 1-3 at the back of the van) ---------------- */
function pickOpen(M){if(M.chat)return;const V=view(M),cur=M.D&&M.ph!=='van'?M.D.id:null;V.mount();M.SQ.clear();M.chat={p:{id:'dee',pos:A().P.pos.clone?{x:A().P.pos.x,z:A().P.pos.z}:A().P.pos,c:{name:'Dee'}},kind:'pick',t:0};
  const ids=['press','cousin','mustache'];M.SQ.say('dee',cur?"Swapping? Anybody you talked to as the "+LOOK[cur].label+" might notice. People remember a "+(cur==='mustache'?'mustache':cur==='press'?'lanyard':'cap')+".":"Pick one. They each make different things easy. And different things hard.",{tell:'[The back of the van: a craft-store bag, a lanyard, a cap, a mustache on a card.]'});
  M.SQ.choose(done=>{V.choices(ids.map((id,k)=>({text:LOOK[id].label+(id===cur?' (wearing it)':''),reg:'special',tag:['Press','Cousin','Mustache'][k],hint:LOOK[id].blurb})),{time:0,onPick:i=>{done();const id=ids[i];
      M.SQ.run(()=>{M.chat=null;try{V.clearLine();V.unmount()}catch(_){}pickDisguise(M,id,cur)})}})})}
function pickDisguise(M,id,cur){const Soc=SOC(),a=A();if(!M.D){M.D=Soc.cover({id,seed:M.seed})}else if(cur!==id||M.ph==='van'){M.D.swap(id)}
  dress(M,id);M.dis=id;tone({f:700,to:900,type:'triangle',d:.1,gain:.04,bus:'ui'});try{PPL().interact(a.P.dude)}catch(_){}
  if(M.ph==='van'){M.ph='fix';M.queue.push(...L.picked[id],L.fixTut[id]);M.slip=true;M.slipK=1;slipVis(M,1);M.disT0=M.t}
  else{M.queue.push(['you',id==='mustache'?"Mustache. Back on.":id==='press'?"Press. Riverside Gazette. Again.":"Cap. Backwards. Cousin. Again."]);for(const pid in M.pp||{})M.pp[pid].recog=false}}
function ladderDone(M){M.archFixed=true;M.ladderOn=false;M.balloonLine=true;M.D.bump('win');M.queue.unshift(...L.ladderDone);M.talked.marco='win';const p=M.pp.marco;if(p)p.talked='win';tone({f:660,d:.1,gain:.04,bus:'ui'});tone({f:990,d:.14,gain:.04,bus:'ui',at:.1})}

/* ---------------- cameras: the two-shot in a conversation, the viewfinder for Vince ---------------- */
function camHook(M,dt){const a=A(),cam=a.camera,P=a.P,T3=a.THREE;
  if(M.photo&&M.photo.st==='aim'){const v=M.pp.vince;const y0=gy(P.pos.x,P.pos.z);const eye=new T3.Vector3(P.pos.x,y0+1.62,P.pos.z),tg=new T3.Vector3(v.pos.x,gy(v.pos.x,v.pos.z)+1.35,v.pos.z);
    cam.position.copy(eye);cam.lookAt(tg);if(M.fov0==null)M.fov0=cam.fov;if(cam.fov!==38){cam.fov=38;cam.updateProjectionMatrix()}return true}
  if(M.fov0!=null){cam.fov=M.fov0;cam.updateProjectionMatrix();M.fov0=null}
  if(M.chat&&M.chat.kind!=='pick'&&M.chat.p&&M.chat.p.d){const p=M.chat.p,dx=p.pos.x-P.pos.x,dz=p.pos.z-P.pos.z,l=hyp(dx,dz)||1,fx=dx/l,fz=dz/l,rx=-fz,rz=fx;const y0=gy(P.pos.x,P.pos.z);
    const want=new T3.Vector3(P.pos.x-fx*1.35+rx*.62,y0+1.78,P.pos.z-fz*1.35+rz*.62),look=new T3.Vector3(p.pos.x,gy(p.pos.x,p.pos.z)+1.5,p.pos.z);
    if(!M.camS||M.chat!==M.camS.ch)M.camS={ch:M.chat,p:want.clone()};M.camS.p.lerp(want,Math.min(1,dt*5));cam.position.copy(M.camS.p);cam.lookAt(look);return true}
  M.camS=null;return false}

/* ---------------- cleanup: when the job ends, is retried or replayed, free everything it built ---------------- */
const LIVE={M:null};
function cleanup(M){if(!M||M.cleaned)return;M.cleaned=true;try{chatClose(M)}catch(_){}try{if(M.V){M.V.unmount();M.V.el.remove()}}catch(_){}M.V=null;M.SQ=null;try{vfClose(M)}catch(_){}
  try{undress(M);carryBook(M,false)}catch(_){}ovDispose(M);
  const a=A();try{if(M.fov0!=null&&a.camera){a.camera.fov=M.fov0;a.camera.updateProjectionMatrix()}}catch(_){}
  const v=M.vis||{};if(v.g&&v.g.parent)v.g.parent.remove(v.g);for(const id in M.pp||{}){const p=M.pp[id];try{if(p.d.root.parent)p.d.root.parent.remove(p.d.root)}catch(_){}}
  for(const x of v.own||[])try{x.dispose()}catch(_){}
  M.vis={own:[]};M.pp=null;if(LIVE.M===M)LIVE.M=null}
J.on('pose',()=>{const M=LIVE.M;if(!M)return;const a=A(),cur=a&&a.M;if(cur!==M||M.state!=='go'){if(M.state!=='go'&&cur===M){M.endT=(M.endT||0)+1;if(M.endT<3)return}cleanup(M)}});
{const j=J.get('pawn'),_start=j.start;j.start=function(M,o){if(LIVE.M&&LIVE.M!==M)cleanup(LIVE.M);return _start.call(this,M,o)}}
/* touch: the disguise chip fixes the tell */
let HUDB=false;J.on('hud',()=>{if(HUDB)return;const a=A();if(!a||!a.HUD||!a.HUD.on)return;HUDB=true;a.HUD.on('gadget',id=>{const M=A().M;if(id==='pawnfix'&&M&&M.def.id==='pawn')M.fixTap=true})});
/* the result card: an infiltration's numbers (cover, conversations, the ledger) instead of the fight stats */
const HEADS=['Nobody asked a single question.','Nobody asked. A few people almost did.','Everybody noticed. Nobody said a word.','Very polite neighbourhood.'];
J.on('hud',()=>{const a=A(),M=a&&a.M;if(!M||M.def.id!=='pawn'||M.state==='go'||M.resDone)return;const r=document.querySelector('.ht-result .col');if(!r)return;M.resDone=true;const D=M.D;
  if(M.state==='won'){const h=r.querySelector('h2');if(h)h.textContent=D?HEADS[D.started===0?0:D.excused===0?1:D.excused<3?2:3]:HEADS[0]}
  const cells=[...r.querySelectorAll('.ht-stats > div')],set=(d,k,v,sub)=>{if(!d)return;d.innerHTML='';const b=document.createElement('b'),sp=document.createElement('span');b.textContent=k;sp.className='ht-num';sp.textContent=v;d.appendChild(b);d.appendChild(sp);
    if(sub){const s=document.createElement('small');s.textContent=sub;d.appendChild(s)}};
  const talks=Object.keys(M.talked||{}).length,wins=Object.values(M.talked||{}).filter(x=>x==='win').length;
  set(cells[0],'Lowest cover',D?Math.round(D.min*100)+'%':'—',D?LOOK[D.id].label:'');set(cells[1],'Small talk',wins+'/'+talks,D&&D.started?D.started+' × "…"':'nobody went "…"');
  const leg=r.querySelector('.ht-stats');if(M.state==='won'&&leg){const d=document.createElement('div');leg.insertBefore(d,cells[2]||null);set(d,'Ledger',M.book?(M.pages>=3?'Book + 3':'The book'):M.pages+' pages',M.prize?'and a leaf blower':'')}});

/* ---------------- Ramos Bakery: once the job is done, the storefront changes (hub only; a replay shows the shop as it was) ---------------- */
const BAK={g:null,L:null,own:[]};
function bakeryTick(){const a=A();if(!a)return;const s=a.SV&&a.SV(),on=!!(s&&s.world&&s.world.storefronts&&s.world.storefronts.pawn==='bakery');const L_=a.L;const inJob=a.M&&a.M.def&&a.M.def.id==='pawn'&&a.mode==='mission';
  if(BAK.g&&(BAK.L!==L_||!on)){if(BAK.g.parent)BAK.g.parent.remove(BAK.g);for(const x of BAK.own)try{x.dispose()}catch(_){}BAK.own.length=0;BAK.g=null}
  if(BAK.g){BAK.g.visible=!inJob;return}
  if(!on||!L_||!L_.group||(a.mode!=='hub'&&a.mode!=='mission'))return;const P=a.P;if(hyp(P.pos.x-358,P.pos.z-38)>140)return;
  const T3=a.THREE,g=new T3.Group();g.name='ramosBakery';const own_=x=>{BAK.own.push(x);return x};
  const tex=c=>{const t=new T3.CanvasTexture(c);if(T3.sRGBEncoding)t.encoding=T3.sRGBEncoding;t.anisotropy=4;return own_(t)};
  const cv=document.createElement('canvas');cv.width=1024;cv.height=192;const x=cv.getContext('2d');x.fillStyle='#f6ead2';x.fillRect(0,0,1024,192);x.strokeStyle='#7a4a24';x.lineWidth=10;x.strokeRect(8,8,1008,176);
  x.fillStyle='#7a4a24';x.font='italic 900 96px Georgia, serif';x.textAlign='center';x.textBaseline='middle';x.fillText('Ramos Bakery',512,84);x.font='700 30px Georgia, serif';x.fillText('PAN DULCE · BREAD · COFFEE · OPEN 7 AM',512,152);
  const sm=new T3.Mesh(own_(new T3.PlaneGeometry(9,1.7)),own_(new T3.MeshStandardMaterial({map:tex(cv),roughness:.7,emissive:new T3.Color(.25,.2,.12),emissiveMap:tex(cv)})));sm.position.set(358,3.95,38.13);g.add(sm);
  /* a striped awning over the doors and windows */
  const aw=document.createElement('canvas');aw.width=512;aw.height=64;const ax=aw.getContext('2d');for(let i=0;i<16;i++){ax.fillStyle=i%2?'#f6ead2':'#2f7d55';ax.fillRect(i*32,0,33,64)}
  const ag=own_(new T3.PlaneGeometry(10.6,1.3));const am=new T3.Mesh(ag,own_(new T3.MeshStandardMaterial({map:tex(aw),roughness:.85,side:T3.DoubleSide})));am.position.set(358,2.75,38.75);am.rotation.x=-Math.PI/2+.62;am.castShadow=true;g.add(am);
  L_.group.add(g);BAK.g=g;BAK.L=L_;g.visible=!inJob}
J.on('hud',()=>{try{bakeryTick()}catch(_){}});
/* warm the party cast while the job is on offer in the hub */
let PRE=false;J.on('hud',()=>{if(PRE)return;const a=A();if(!a||a.mode!=='hub')return;const s=a.SV&&a.SV();if(!(s&&s.jobs&&s.jobs.dee&&s.jobs.dee.done))return;const pp=PPL();if(!pp||!pp.ok)return;PRE=true;preloadCast()});
/* ---------------- the scripted player (dev/jobs-check.js): plays it like someone who read the brief ----------------
   Mustache; says hi to Gloria in her register; holds Marco's ladder; buys a raffle ticket; tells Denise it's a balloon emergency;
   photographs three pages and takes the book; walks out during the raffle. o.fail: stands in the STAFF ONLY doorway under
   Denise's nose until the politeness runs out. */
function bot(a,t,o){const M=a.M,P=a.P;if(!M||M.state!=='go'||M.def.id!=='pawn')return null;const B=M.bot||(M.bot={step:0,w:0,log:[]}),k=a.keys;
  const tp=(x,z)=>{P.pos.set(x,P.pos.y,z);a.collide(P.pos,.35)};const face=(x,z)=>{P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z))};
  if(a.CV){if(!M.exitOpen)a.exitCar();return null}
  k.g=false;
  if(M.chat){const V=M.V;if(V&&V.choice){const L_=V.choice.list;let i=0;const ch=M.chat;
      if(ch.kind==='pick')i=2;else if(ch.kind==='small'||ch.kind==='hotdog'){const best=HT.Social.BEST[ch.p.mood||ch.p.c.mood];const j=L_.findIndex(x=>x.reg===best);i=j>=0?j:L_.length-1}
      else if(ch.kind==='denise'){const j=L_.findIndex(x=>/Balloon|VIP|Cousin/.test(x.tag||''));i=j>=0?j:1}
      else if(ch.kind==='visit'){const j=L_.findIndex(x=>/Balloon/.test(x.tag||''));i=j>=0?j:2}
      if(B.w<=0){V.choose(i);B.log.push(ch.kind+':'+i);B.w=4}else B.w--}
    else if(V&&V.typing&&t%3===0)V.skip();return null}
  if(B.w>0){B.w--;return null}
  if(!M.ready&&M.ph!=='van')return null;
  if(M.ph==='van'){const r=vanRear(M);if(!r)return null;tp(r.x,r.z);a.useTap=true;B.w=6;return null}
  if(M.ph==='fix'){k.g=true;B.w=8;return null}
  if(!M.pp)return null;
  if(o&&o.fail){/* stand in the staff doorway, under Denise's nose */tp(357,31.25);face(357,28);P.crouch=false;return null}
  if(M.slip&&!M.chat){k.g=true;B.w=3;return null}
  /* walk up to someone: stand in front of them (where they're looking), so they're the closest person */
  const talk=(id)=>{const p=M.pp[id];const fx=Math.sin(p.yaw),fz=Math.cos(p.yaw);tp(p.pos.x+fx*1.0,p.pos.z+fz*1.0);face(p.pos.x,p.pos.z);a.useTap=true;B.w=10};
  if(M.stage==='party'){
    if(B.step===0){if(M.talked.gloria){B.step=1;return null}talk('gloria');return null}
    if(B.step===1){if(M.archFixed){k.e=false;B.step=2;return null}if(!M.ladderOn){talk('marco');return null}tp(S.ladder.x+.25,S.ladder.z+.85);k.e=true;return null}
    if(B.step===2){if(M.ticket){B.step=3;return null}talk('kev');return null}
    if(B.step===3){if(M.deniseOk){B.step=4;return null}talk('denise');return null}
    if(B.step===4){tp(357,32.6);B.w=4;B.step=5;return null}
    if(B.step===5){tp(357,29.2);B.w=6;return null}}
  if(M.stage==='office'){if(!M.got||M.pages<K.pages||!M.book){if(hyp(P.pos.x-S.desk.x,P.pos.z-S.desk.z)>.6){tp(S.desk.x,S.desk.z);face(S.ledger.x,S.ledger.z);B.w=4;return null}
      if(M.pages<K.pages){if((M.steady||0)<=0){camUse(M);B.w=3}return null}if(!M.book){a.useTap=true;B.w=6;return null}}
    tp(357,32.4);B.w=4;return null}
  if(M.stage==='exit'){if(!M.exitOpen){if(P.pos.z<35.5){tp(358,35.6);B.w=3;return null}tp(358,39.6);B.w=6;return null}
    const c=M.car;if(c){tp(c.pos.x+Math.cos(c.yaw)*2.2,c.pos.z-Math.sin(c.yaw)*2.2);a.useTap=true;B.w=8}return null}
  return null}
})();
