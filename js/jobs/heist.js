/* =====================================================================
   GOOD FENCES (SPEC3 2.6): the heist, reversed. Gary's strand 2/2. Tre gave up the place in Small Talk: Discount Storage Unlimited, unit 47.
   Gary matched 1,140 stolen things from three neighbourhoods to one storage unit. This one gets planned. Four stages, played straight:
     1 SCOPE  daytime walk-around with the phone (HT.Photo): the keypad, the cameras, the guard rota, Dwayne at the desk, unit 47.
              Each photo unlocks something on the plan. Dwayne notices a dad photographing storage units (the "weird" meter): if he
              does, the front-desk bluff is off the table.
     2 GEAR   errands around Maple, any order, all optional: Linda's ladder (carried to the van; back by Sunday), walkie-talkies
              from Hank's ($60), Rick's moving blankets, Big Dave's hand truck, Doug's "tactical" fanny pack.
     3 PLAN   Gary's driveway: the crew-roles board (HT.Plan, js/crewplan.js): lookout, driver, lifter, distraction for Gary, Rick,
              Big Dave and Doug (stars by aptitude), and the approach: QUIET (night, HT.Stealth, the gate code or the ladder),
              the BLUFF (evening, talk Dwayne round with HT.Social's conversation engine) or LOUD (the truck through the gate).
              The forecast says in plain words what the choices will do.
     4 JOB    you are the inside man. The crew plays its roles live: the lookout calls the guard early (later and by text without
              walkies), the driver backs the truck in (Gary's beeps), the lifter carries alongside you (Dave takes two),
              the distraction keeps Dwayne off the camera monitors (for 50/80/120 s). Spotted -> it becomes a fight (no clean bonus).
              Load the twelve things (each has an owner) and drive the truck to Gary's. Loud: two of the fence's cousins chase you.
   Afterwards: the result card is a Lost & Found list, the things turn up on neighbours' porches in free roam (each owner has a line),
   Linda's ladder goes back (on time: +$50 and +1 Maple trust).
   Stages ([CP]): scope -> gear -> plan -> job -> getaway. No guns in daylight or while it's quiet; the loud branch and a blown cover
   draw them (no family or kids anywhere near the lot). Gameplay time = the dt the hooks get; nothing waits on the dialogue queue.
   Files: js/jobs/heist.js, js/crewplan.js (HT.Plan), css/plan.css. Tests: node dev/jobs-check.js heist --retry --replay --shots,
   node dev/jobs/heist.js [--shots] (real mouse and keyboard through the plan board and the core loop).
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
/* the shared systems this job stands on, loaded once */
(function(){const d=typeof document!=='undefined'?document:null;if(!d||!d.head||!d.createElement)return;
  const js=(id,src,ok,cb)=>{if(ok()||d.getElementById(id))return;const s=d.createElement('script');s.id=id;s.src=src;if(cb)s.onload=cb;d.head.appendChild(s)};
  js('ht-stealth-js','js/stealth.js',()=>window.HT.Stealth&&HT.Stealth.ready,()=>{try{HT.Stealth.bind()}catch(_){}});
  js('ht-photo-js','js/photo.js',()=>window.HT.Photo&&HT.Photo.begin);
  js('ht-social-js','js/social.js',()=>window.HT.Social&&HT.Social._ver);
  js('ht-plan-js','js/crewplan.js',()=>window.HT.Plan&&HT.Plan._ver)})();
const ST=()=>window.HT&&HT.Stealth&&HT.Stealth.ready?HT.Stealth:null,PH=()=>window.HT&&HT.Photo&&HT.Photo.begin?HT.Photo:null,PL=()=>window.HT&&HT.Plan&&HT.Plan._ver?HT.Plan:null;
const AU=()=>window.HT&&HT.Audio;
const hyp=Math.hypot,clamp=(v,a,b)=>v<a?a:v>b?b:v,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const cyaw=(dx,dz)=>Math.atan2(dx,dz)/* characters and stealth: forward=(sin,cos) */,gyaw=(dx,dz)=>Math.atan2(-dx,-dz)/* player and cars: forward=(-sin,-cos) */;

/* ---------------- tuning ---------------- */
const K={
  weird:{fill:.24,decay:.08,R:15,half:62*Math.PI/180,max:1},           /* Dwayne noticing the phone */
  clock:420,                                                              /* the job: 7 real minutes until the 1:30 shift change */
  lead:[1.6,3.2,5],textLag:1.6,                                           /* lookout warning lead by stars; without walkies it comes by text, late */
  busy:[50,80,120],                                                       /* distraction: seconds Dwayne is off the monitors */
  reverse:[1.7,2.5,3.2],beep:{r:11,every:.55},                            /* driver: reverse speed m/s; Gary's beeper */
  lift:{speed:[.95,1.25,1.55],pause:[3.2,2.1,1.3],carry:[1,1,2],strain:18},/* lifter */
  chasers:[2,2,1],truckHp:[1,1.15,1.3],                                   /* loud getaway by driver stars */
  hold:{code:1.3,ladder:2.4,gateIn:1.6,lock:2.2,pick:.55,load:.45,hide:.35},
  noise:{lock:5,lockB:2,door:4,doorB:2.2,load:3.2,loadB:1.1,code:3,motor:6},
  carryMul:.82,dollyMul:.9,minLoad:6,
  bluff:{win:65,rounds:4,sus:.16,susB:.08},
  cam:{R:14,half:24*Math.PI/180,mul:.55},
  alarm:{cousins:120},
  pay:{base:1600,item:40,ghost:500,ladder:50,budget:100,fence:0},trust:{ghost:8,item:.5,ladder:1}};

/* ---------------- the site (metres; WORLD.sites.storage) ---------------- */
const S_={gate:{x:208,z:148,panelX:209.35,closeDz:4},keypad:{x:207.2,z:145.6},office:{door:{x:215,z:151},desk:{x:219,z:153}},board:{x:219,z:149.8},
  u47:{x:262,z:150,front:{x:262,z:148.8}},cams:[{x:209.6,z:133.6,y:3.4},{x:270.4,z:133.6,y:3.4},{x:270.4,z:153.4,y:3.4},{x:221.6,z:150.2,y:3.6}],
  ring:{x:204.6,z:139.5},                         /* Industrial Way, just north of the gate (where you pull up) */
  stage:{van:{x:203.2,z:128,yaw:0},you:{x:205.6,z:131.5},truck:{x:203.2,z:137.6,yaw:0},lookout:{x:198.6,z:145.2},crew:{x:205.7,z:154.6}},
  ladder:{out:{x:206.9,z:141.2},in:{x:210.8,z:141.2}},gateBox:{x:210.7,z:145.2},
  truckIn:{x:251,z:148,yaw:-Math.PI/2},           /* backed down the main aisle, cab toward the gate (facing -x) */
  hide:{x:262,z:150.9}};
const D2R=Math.PI/180;
/* Reggie's round: the main aisle, the east aisle, the middle aisle, the west strip (stops: look a while) */
const ROUTE=[{go:[211.1,133]},{go:[211.1,146.4]},{look:2.6,a:Math.PI/2},{go:[211.1,140]},{go:[240,140]},{look:1.8,a:Math.PI},{go:[266.9,140]},{go:[266.9,146.3]},{look:3.6,a:-Math.PI/2},
  {go:[266.9,133]},{look:2,a:-Math.PI/2},{go:[240,133]},{go:[211.1,133]}];

/* ---------------- the errands (Maple) ---------------- */
const GEAR=[
  {id:'ladder',label:"Linda's ladder",who:'linda',name:'Linda',where:'Linda, next door to you',at:{x:51,z:19.9},face:Math.PI,does:'Over the fence instead of through the gate. Back by Sunday.',cost:0},
  {id:'walkies',label:'Walkie-talkies',who:'hank',name:'Hank',where:"Hank's Hardware · $60",at:{x:51,z:10.7},face:0,does:'The lookout calls it on the radio, early. The guard shows on your minimap.',cost:60},
  {id:'blankets',label:'Moving blankets',who:'rick',name:'Rick',where:"Rick's garage",at:{x:75,z:47.9},face:Math.PI,does:'Muffles the padlock and the loading. Movers carry blankets.',cost:0},
  {id:'dolly',label:'Hand truck',who:'dave',name:'Big Dave',where:"Big Dave's garage",at:{x:41,z:66.3},face:0,does:'Two things a trip, and you can move the heavy ones yourself.',cost:0},
  {id:'pack',label:"Doug's tactical fanny pack",who:'doug',name:'Doug',where:"Doug's porch",at:{x:89,z:38.3},face:0,does:'Zip-ties, a laser pointer (fire: Reggie looks where you point), three granola bars.',cost:0}];
const GARY={x:27,z:20.3};/* the whiteboard in Gary's driveway */

/* ---------------- the twelve things in unit 47 (owner, where they go home, heavy needs the hand truck or the lifter) ---------------- */
const ITEMS=[
  {id:'blower1',kind:'blower',label:'Leaf blower',owner:'Mrs. Patel',hood:'maple',col:'#e2642a'},
  {id:'grill',kind:'grill',label:'Kettle grill',owner:'the Hendersons',hood:'maple',heavy:true},
  {id:'bike',kind:'bike',label:'Kids\' bike',owner:'the Okafor twins',hood:'river',col:'#2f86d6'},
  {id:'gnome',kind:'gnome',label:'Lawn gnome',owner:'Barb',hood:'maple'},
  {id:'kayak',kind:'kayak',label:'Kayak',owner:'Mr. Ferreira',hood:'river',heavy:true},
  {id:'blower2',kind:'blower',label:'Leaf blower (the other one)',owner:'Mrs. Patel',hood:'maple',col:'#d8452a'},
  {id:'mower',kind:'mower',label:'Push mower',owner:'Phil',hood:'maple',heavy:true},
  {id:'trombone',kind:'trombone',label:'Trombone',owner:'the Kowalski kid',hood:'river'},
  {id:'toolbox',kind:'toolbox',label:'Toolbox',owner:'Earl',hood:'river'},
  {id:'washer',kind:'washer',label:'Pressure washer',owner:'Ted',hood:'maple'},
  {id:'lights',kind:'box',label:'Box of holiday lights',owner:'Ms. Lindqvist',hood:'river'},
  {id:'sewing',kind:'sewing',label:'Sewing machine',owner:'Mrs. Ramos',hood:'river'}];
/* where they come home to (free-roam porches after the job) and what each owner says */
const HOMECOMING=[
  {items:['blower1','blower2'],x:73.4,z:21.2,yaw:Math.PI,who:'Mrs. Patel',line:"Both of them! You found BOTH of them! ...I'm going to need you to not tell my husband there were two."},
  {items:['grill'],x:85.4,z:21.2,yaw:Math.PI,who:'Mr. Henderson',line:"My grill. My actual grill. It still has the burger I was making. ...No it doesn't. That'd be gross. Thank you."},
  {items:['gnome'],x:122.4,z:49.2,yaw:Math.PI,who:'Barb',line:"Gerald is home. The HOA thanks you. I thank you. Gerald thanks you."},
  {items:['mower'],x:131.4,z:21.2,yaw:Math.PI,who:'Phil',line:"You found my mower. I've been borrowing Ted's. Ted's been very patient. Ted's been less patient."},
  {items:['bike'],x:391.4,z:47.2,yaw:Math.PI,who:'Mrs. Okafor',line:"The twins are fighting over who rides it first, which means everything's back to normal. Come by for dinner. I mean it."},
  {items:['kayak'],x:400.6,z:47.4,yaw:Math.PI*.5,who:'Mr. Ferreira',line:"I was going to sell the house. Then my kayak came back. Funny, the things that make you stay."}];

/* ---------------- who's who ---------------- */
const CAST={linda:{key:'nb_lucia',name:'Linda'},hank:{key:'nb_pops',name:'Hank'},dwayne:{key:'nb_marcus',name:'Dwayne'},reggie:{key:'thug_brown',name:'Reggie'},
  gary:{key:'dad_gary',name:'Gary'},rick:{key:'dad_rick',name:'Rick'},dave:{key:'dad_dave',name:'Big Dave'},doug:{key:'dad_doug',name:'Doug'}};
const DADS=['gary','rick','dave','doug'];
const DADNAME={gary:'Gary',rick:'Rick',dave:'Big Dave',doug:'Doug'};
const PLAN_DEF={
  roles:[{id:'lookout',label:'Lookout',desc:'Across the street with binoculars. Calls the guard before he turns your way.',need:1},
    {id:'driver',label:'Driver',desc:'Backs the truck up to unit 47. Gets you out if it goes loud.',need:1},
    {id:'lifter',label:'Lifter',desc:'Carries alongside you, unit to truck.',need:1},
    {id:'distraction',label:'Distraction',desc:'Keeps Dwayne off the camera monitors (or the gate, if it goes loud).',need:1}],
  crew:[{id:'gary',name:'Gary',color:'#3d7bd9'},{id:'rick',name:'Rick',color:'#d9583d'},{id:'dave',name:'Big Dave',color:'#4a9a52'},{id:'doug',name:'Doug',color:'#8a5cc4'}],
  entries:[{id:'quiet',label:'Quiet · at night',desc:'Stealth. In through the gate or over the fence, past Reggie and the cameras.',req:{any:[{photo:['keypad']},{gear:['ladder']}],why:'Need the gate code (photo the keypad) or Linda\'s ladder'}},
    {id:'bluff',label:'The bluff · at closing',desc:'Talk Dwayne into letting "the movers" in. Load in plain sight.',req:{photo:['dwayne'],any:[{gear:['blankets']},{gear:['dolly']}],not:['weird'],why:'Need a photo of Dwayne (know your mark) and blankets or a hand truck (look like movers)',notWhy:{weird:'Dwayne saw you photographing storage units. He remembers you.'}}},
    {id:'loud',label:'Loud',desc:'The truck goes through the gate. Fast, messy, and the fence\'s cousins will follow you home.',req:null}],
  gear:GEAR.map(g=>({id:g.id,label:g.label,where:g.where,does:g.does})),
  apt:{gary:{lookout:2,driver:1,lifter:1,distraction:3},rick:{lookout:2,driver:3,lifter:2,distraction:2},dave:{lookout:1,driver:2,lifter:3,distraction:2},doug:{lookout:3,driver:2,lifter:1,distraction:2}},
  effects:{lookout:K.lead,driver:K.reverse,lifter:K.lift.speed,distraction:K.busy}};

/* ---------------- lines ---------------- */
const L={
  open:[['gary',"I made a spreadsheet. Then I made a pivot table. Then I cried a little. Then I found the warehouse."],
    ['gary',"Today we're customers. Walk around, look bored, take pictures of anything that matters. Unit forty-seven's at the far end."],
    ['gary',"The phone's your notebook. Every photo is an option on the plan tonight."]],
  phoneTip:"Raise your phone: right mouse button (or left). Take the photo: left mouse button.",
  tag:{keypad:[['gary',"Zoomed in. The 7, the 4 and the 1 are worn shiny. Code's 7-4-1. It's always 7-4-1."],"Gate code: the quiet way in through the gate"],
    cams:[['gary',"Same camera on every corner, four of them. They sweep. I'll put them on the map, so you'll see where they look."],"Cameras: you'll see where they look"],
    board:[['gary',"Guard rota. Nights: Reggie. He walks a loop. I can work with a loop."],"Guard rota: Reggie's round shows on the ground tonight"],
    dwayne:[['gary',"That's Dwayne. Days at the desk, nights on the monitors. Likes talking. Loves complaining. That's useful."],"Dwayne: the bluff is possible"],
    u47:[['gary',"Unit forty-seven. Disc lock. That's the one. I could cry. I won't. I might."],"Unit 47: found"]},
  weirdWarn:['you',"Dwayne's looking. Put the phone down, look at a unit. Look interested in square footage."],
  weird:[['Dwayne',"Sir? Are you... photographing the units?"],['you',"I'm a big fan of storage. Big fan. Love a ten-by-ten."],['Dwayne',"...Okay. I'm going to remember your face."]],
  hello:['Dwayne',"Welcome to Discount Storage Unlimited. First month's a dollar. No questions. Seriously, don't ask me questions."],
  scopeDone:['gary',"That's the unit. Look around more if you want, or get in the van and we'll go shopping."],
  gearOpen:[['gary',"Shopping list's on your phone. Everything's optional. Everything helps. Come to my driveway when you're ready."],
    ['gary',"Hank sells walkie-talkies. Linda has a ladder. Rick has blankets, Dave has a hand truck, and Doug has... a fanny pack he wants you to see."]],
  errand:{
    linda:[['Linda',"It's a twenty-eight foot ladder. You're bringing it back. Sunday. Not Sunday-ish."],['you',"Sunday. Absolutely. Sunday."],['Linda',"It's leaning on the garage. Lift with your legs."]],
    hank:[['Hank',"Walkie-talkies. Range of two miles, or one mile if you're near the river, or zero if you're Doug."],['Hank',"Sixty bucks. Batteries included, because I'm not a monster."]],
    rick:[['rick',"Moving blankets! From when the team moved the trophy case. We don't talk about the trophy case."],['rick',"Wrap it, lift it, move it. Like a play."]],
    dave:[['dave',"Hand truck. I move kegs on it. Root beer kegs. For the block party. It's a lot of root beer."],['dave',"Tip it back, let it do the work. Don't let it do ALL the work."]],
    doug:[['doug',"Tactical. Fanny. Pack."],['doug',"Zip-ties. Laser pointer. Compass. Three granola bars. One of them is for you. Not the peanut butter one."],['you',"Doug, it says 'Disney' on the strap."],['doug',"Tactical Disney."]]},
  ladderGot:"Got the ladder. Now carry it to the van.",ladderVan:['you',"Ladder's on the roof. Linda's ladder. Back by Sunday. Not Sunday-ish."],
  gearNote:{ladder:"Plan: over the fence is an option now",walkies:"Plan: the lookout's on the radio",blankets:"Plan: quieter work, and the bluff",dolly:"Plan: two at a time, heavy things too",pack:"Plan: Doug's laser pointer"},
  poor:['Hank',"Tell you what, pay me after. You've got an honest face. A tired one."],
  board:[['gary',"Okay. Everybody gather round the whiteboard. I've laminated the roles."],['doug',"Breaker breaker, this is Hawk. Over."],['gary',"We're not doing call signs."],['doug',"Hawk out."]],
  boardTip:"Plan board: pick a role (keys 1-4), then a dad (1-4). Pick the approach (5-7). Enter to go. Esc to step away.",
  night:{quiet:'LATER THAT NIGHT · 12:40 AM',bluff:'THAT EVENING · 6:55 PM',loud:'LATER THAT NIGHT · 12:40 AM'},
  jobOpen:{quiet:[['gary',"Okay. Positions. Quiet as we can. You're the inside man. Unit forty-seven, then the truck, then we go home."]],
    bluff:[['gary',"Dwayne closes at seven. You're my brother-in-law's friend who's helping him move. I'm not here. I'm never anywhere."]],
    loud:[['gary',"For the record, I wanted a quieter plan. For the record, this is my brother-in-law Ron's truck."],['rick',"Hit it like a blocking sled!"]]},
  lookoutWarn:["{G} turning your way in three, two...","Heads up. {G}'s coming round to you.","{G}, your aisle, any second.","Coming your way. Get low.","Guard's turning. Now-ish. Now."],
  lookoutMiss:['dave',"Sorry, I was eating a sandwich. Was that important? That seemed important."],
  textWarn:["rEGGIE CMING","GUARD UR WAY","get dwon","hes turnig"],
  allClear:["You're clear.","Clear. He's looking at the vending machine.","Clear. Go."],
  codeOk:[['you',"Seven. Four. One."],['gary',"Of course it's 7-4-1."]],
  overFence:['you',"Twenty-eight feet of Linda's ladder. Do not drop it. Do not scratch it."],
  gateIn:['you',"There's a big green button on the inside. Of course there is."],
  lockCut:"The disc lock gives. Gary's going to frame this padlock.",
  doorUp:[['you',"Oh, wow. It's all here. Leaf blowers, a grill, a kayak, a GNOME."],['gary',"Item thirty-one: Mrs. Patel's leaf blower. Item thirty-two: also Mrs. Patel's leaf blower. She has two."]],
  truckCall:['gary',"Bringing the truck."],
  beep:['you',"It BEEPS. Gary, it beeps when it reverses!"],beepG:['gary',"It's a safety feature!"],
  drift:['doug',"Tokyo drift. But backwards. And slow."],quietIn:['rick',"Lights off, rolling. Like a punt return nobody sees coming."],
  truckIn:['you',"Truck's in. Start loading."],
  heavy:"That one's heavy. It needs the hand truck, or the lifter.",
  liftLine:{gary:["Lift with your legs, Gary. LIFT WITH YOUR LEGS.","I'm documenting as I go. Item... toolbox."],rick:["Wrap it, lift it, move it!","Good hustle, good hustle."],dave:["Got the grill. Got the mower. Getting the gnome as a treat.","Two at a time. Like groceries."],doug:["The fanny pack's in the way. Tactically in the way.","I'm carrying it tactically."]},
  strain:[['gary',"I've pulled something. Something in the back. I'm going to lie on the floor of the truck for a bit."]],
  distract:{gary:[['gary',"(on the intercom) Hi, yes, quick question about your pricing tiers. Ten-by-ten versus ten-by-fifteen. Per square foot. Take your time."],['Dwayne',"(on the intercom) ...It's one in the morning, man."]],
    rick:[['rick',"(on the intercom) Dwayne! Big fan of the work you do. Let me tell you about a kid I coached in '09."],['Dwayne',"(on the intercom) Who IS this?"]],
    dave:[['dave',"(on the intercom) I locked myself out of my car and I've got sixty burgers in there. Do you want a burger?"],['Dwayne',"(on the intercom) ...What kind of burgers?"]],
    doug:[['doug',"(on the intercom) This is a wellness check from the Ridgeview Neighbourhood Watch. How are you sleeping, Dwayne?"],['Dwayne',"(on the intercom) Terribly. Since you ask."]]},
  distractEnd:{gary:"That's all my questions. I'll email the rest.",rick:"...and that's how we won State. Okay, gotta go!",dave:"I'll leave you a burger at the gate. Bye, Dwayne.",doug:"Wellness check complete. Hawk out."},
  monitors:['gary',"Dwayne's back on the monitors. Mind the cameras."],
  loopTip:'you',
  hideIn:"Duck into the unit and pull the door down",hideOut:"Roll the door up and step out",
  spotted:['Reggie',"HEY! Who's back there? ...Vince! VINCE!"],camSpot:['Dwayne',"(over the yard speaker) I SEE you on camera four! Reggie! REGGIE!"],
  loudGo:['gary',"Okay, it's loud now. It's a loud plan now. Load what you can, get in the truck!"],
  cousins:['gary',"Headlights on Industrial. That'll be Vince's cousins. Wrap it up!"],
  enough:['gary',"That's enough to matter. Load more, or get in the truck and drive."],
  all:['gary',"That's all twelve. Every single one. Get in the truck."],
  drive:['gary',"Drive it to my place. Carefully. It's Ron's truck."],
  chase:['rick',"Two cars behind you! Lose 'em! Don't hit anybody's mailbox!"],chase1:['rick',"I boxed one in at the light. One left. You've got this."],
  shaken:"Lost one!",chaseDone:['gary',"They gave up. Honestly I would too."],
  truckHit:["That's Ron's truck!","Ron is going to have questions.","Easy! EASY!"],
  arrive:[['gary',"We returned eleven hundred and forty items. Well. Twelve tonight. But it counts. I'm going to frame the pivot table."]],
  arriveGhost:[['gary',"Nobody saw us. Nobody got hurt. I... I need a minute. It's the good kind of minute."]],
  ladderBack:['Linda',"It's Sunday. It's here. It's not scratched. You may borrow it again."],
  bluffHi:['Dwayne',"We close in five. What do you need?"],
  bluffWin:[['Dwayne',"...Fine. Truck in, truck out. I didn't see anything. I never see anything."],['you',"You're a good man, Dwayne."],['Dwayne',"I'm a tired man."]],
  bluffLose:[['Dwayne',"Yeah, no. I'm calling Vince."],['you',"Who's Vince?"],['Dwayne',"VINCE!"]],
  bluffSus:['Dwayne',"Hey. Hey. That's... that's not a moving box. That's Barb's gnome. Everybody knows Gerald."],
  bluffSee:['Dwayne',"(watching you load) You guys always this careful with leaf blowers?"],
  noGuns:"Not tonight. The guns stay holstered unless this goes sideways.",noGunsDay:"It's a storage place. In daylight. Put it away.",
  clock3:['gary',"Three minutes till the shift change. Then it's two guards and a dog."],clock1:['gary',"One minute. Wrap it up, wrap it up."],
  clockFail:"Shift change. Two more guards, a dog and Vince. Everyone goes home with nothing but a good story.",
  truckDead:"Ron's truck is done. The fence's cousins take back what you took. Ron is going to have questions.",
  leash:"You're wandering off. The job's back that way."};

/* ---------------- small helpers ---------------- */
const pick=a=>a[Math.floor(Math.random()*a.length)],pickN=(a,n)=>a[((n%a.length)+a.length)%a.length];
const NAMEOF={gary:'gary',rick:'rick',dave:'dave',doug:'doug',you:'you'};
/* the subtitle queue: lines fed to the game's radio one at a time on game time (never blocks play) */
function say(M,who,txt,o){o=o||{};M.q.push({t:o.t||0,w:who,x:txt,front:!!o.front,fn:o.fn||null})}
function seq(M,list,gap,o){let t=(o&&o.t)||0;for(const l of list){if(typeof l==='function'){M.q.push({t,fn:l});continue}M.q.push({t,w:l[0],x:l[1],front:!!(o&&o.front)});t+=Math.max(gap||2.6,1.2+l[1].length*.045)}return t}
function qTick(M,dt){for(const q of M.q)q.t-=dt;M.q.sort((p,q)=>p.t-q.t);let n=0;while(M.q.length&&M.q[0].t<=0&&n++<3){const q=M.q.shift();if(q.fn){try{q.fn()}catch(e){console.warn('[heist]',e)}continue}
    if(q.x)try{A().radio(NAMEOF[q.w]||q.w,q.x,q.front)}catch(_){}}}
function feed(t,k,s){try{A().feed(t,k||'info',s)}catch(_){}}
function tone(o){const Au=AU();if(Au&&Au.tone)try{Au.tone(o)}catch(_){}}
function music(id,k){const Au=AU();if(!Au)return;try{if(Au.music)Au.music(id,{intensity:k});if(Au.setIntensity)Au.setIntensity(k)}catch(_){}}
function stinger(id){const Au=AU();if(Au&&Au.stinger)try{Au.stinger(id)}catch(_){}}
/* everything this job builds is owned by M.vis and disposed in cleanup */
function own(M,x){M.vis.own.push(x);return x}
function mat(M,col,o){const T3=A().THREE;return own(M,new T3.MeshStandardMaterial(Object.assign({color:A().lin(col),roughness:.65,metalness:.05},o||{})))}
function canvasTex(M,w,h,draw){const T3=A().THREE,c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T3.CanvasTexture(c);if(T3.sRGBEncoding)t.encoding=T3.sRGBEncoding;t.anisotropy=4;return own(M,t)}
/* shared primitive geometries for this run */
function G(M){if(M.vis.G)return M.vis.G;const T3=A().THREE;const g={box:new T3.BoxGeometry(1,1,1),cyl:new T3.CylinderGeometry(1,1,1,14),cyl6:new T3.CylinderGeometry(1,1,1,6),sph:new T3.SphereGeometry(1,14,10),
  hemi:new T3.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),cone:new T3.ConeGeometry(1,1,12),tor:new T3.TorusGeometry(1,.09,6,22),torT:new T3.TorusGeometry(1,.22,8,20)};for(const k in g)own(M,g[k]);return M.vis.G=g}
function part(M,parent,geo,m,x,y,z,sx,sy,sz,rx,ry,rz){const T3=A().THREE,o=new T3.Mesh(G(M)[geo],m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function mats(M){if(M.vis.m)return M.vis.m;const m={steel:mat(M,'#9aa3a8',{roughness:.35,metalness:.7}),dark:mat(M,'#22252a',{roughness:.6}),black:mat(M,'#121314',{roughness:.5}),rubber:mat(M,'#151515',{roughness:.9}),
  orange:mat(M,'#e2642a',{roughness:.45}),red:mat(M,'#c63a2e',{roughness:.45}),blue:mat(M,'#2f86d6',{roughness:.45}),green:mat(M,'#3b8a3f',{roughness:.5}),yellow:mat(M,'#f0c228',{roughness:.45}),
  brass:mat(M,'#d6a640',{roughness:.25,metalness:.85}),wood:mat(M,'#8a6640',{roughness:.85}),card:mat(M,'#c49a64',{roughness:.9}),white:mat(M,'#f0eee8',{roughness:.6}),skin:mat(M,'#f0c8a8',{roughness:.6}),
  al:mat(M,'#c9ced2',{roughness:.3,metalness:.65}),kayak:mat(M,'#f2b01e',{roughness:.35}),cream:mat(M,'#ece4d0',{roughness:.5}),door:mat(M,'#e8611c',{roughness:.5,metalness:.3}),
  blanket:mat(M,'#3b5f9a',{roughness:.95}),interior:mat(M,'#0d0e10',{roughness:1}),pine:mat(M,'#5b7d4a',{roughness:.9})};return M.vis.m=m}

/* ---------------- props: the twelve things ---------------- */
function itemMesh(M,it){const T3=A().THREE,g=new T3.Group(),m=mats(M),P=(...a)=>part(M,g,...a);
  switch(it.kind){
    case'blower':{const body=mat(M,it.col||'#e2642a',{roughness:.45});P('box',body,0,.22,0,.34,.3,.24);P('cyl',m.dark,0,.22,.22,.11,.08,.11,Math.PI/2);P('cyl',m.dark,0,.16,.55,.05,.62,.05,Math.PI/2+.25);P('cyl',m.black,0,.42,-.02,.025,.24,.025,0,0,Math.PI/2);
      P('box',m.black,0,.36,-.1,.04,.16,.04);P('cyl',m.dark,-.17,.18,0,.09,.05,.09,0,0,Math.PI/2);break}
    case'grill':{P('hemi',m.black,0,.62,0,.3,-.26,.3);P('hemi',m.black,0,.63,0,.3,.24,.3);P('cyl',m.steel,0,.9,0,.04,.04,.04);for(let i=0;i<3;i++){const a=i*2.09;P('cyl',m.steel,Math.sin(a)*.2,.3,Math.cos(a)*.2,.018,.62,.018,Math.cos(a)*.3,0,-Math.sin(a)*.3)}
      P('cyl',m.dark,0,.05,.22,.06,.03,.06,0,0,Math.PI/2);P('box',m.steel,0,.66,0,.66,.02,.04);break}
    case'bike':{const fr=mat(M,it.col||'#2f86d6',{roughness:.35,metalness:.3});for(const z of[-.42,.42])P('tor',m.rubber,0,.3,z,.28,.28,.28,0,Math.PI/2,0);
      P('cyl',fr,0,.42,0,.022,.62,.022,Math.PI/2-.25,0,0);P('cyl',fr,0,.36,-.2,.022,.42,.022,.6,0,0);P('cyl',fr,0,.48,.22,.022,.4,.022,-.4,0,0);P('cyl',fr,0,.56,-.28,.02,.18,.02);
      P('box',m.black,0,.67,-.28,.08,.04,.2);P('cyl',m.steel,0,.66,.36,.016,.4,.016,0,0,Math.PI/2);P('box',m.white,0,.5,.06,.012,.1,.16);break}
    case'gnome':{P('cyl',m.blue,0,.16,0,.12,.3,.12);P('sph',m.skin,0,.38,0,.1,.1,.1);P('cone',m.red,0,.55,0,.11,.26,.11);P('cone',m.white,0,.28,.06,.09,.2,.05,Math.PI,0,0);P('cyl',m.dark,0,.02,0,.13,.04,.13);
      P('sph',m.red,0,.36,.095,.022,.022,.022);break}
    case'kayak':{P('sph',m.kayak,0,.2,0,.3,.17,1.45);P('cyl',m.black,0,.33,.1,.19,.04,.28);P('box',m.red,0,.24,1.2,.04,.04,.3);P('box',m.red,0,.24,-1.2,.04,.04,.3);P('cyl',m.al,.28,.3,.1,.02,1.6,.02,Math.PI/2,0,0);
      P('box',m.black,.28,.3,.88,.02,.16,.07);P('box',m.black,.28,.3,-.68,.02,.16,.07);break}
    case'mower':{P('box',m.green,0,.2,0,.5,.18,.56);P('cyl',m.dark,0,.34,-.05,.16,.14,.16);P('cyl',m.red,0,.44,-.05,.06,.06,.06);for(const x of[-.27,.27])for(const z of[-.24,.24])P('cyl',m.rubber,x,.1,z,.1,.05,.1,0,0,Math.PI/2);
      for(const x of[-.2,.2])P('cyl',m.steel,x,.55,.42,.016,.8,.016,-.5,0,0);P('cyl',m.black,0,.88,.6,.025,.42,.025,0,0,Math.PI/2);break}
    case'trombone':{P('box',m.dark,0,.12,0,.24,.18,.98);P('box',m.black,0,.215,0,.25,.012,.99);P('cyl',m.brass,0,.23,.32,.012,.6,.012,Math.PI/2,0,0);P('cone',m.brass,0,.23,-.24,.07,.16,.07,-Math.PI/2,0,0);break}
    case'toolbox':{P('box',m.red,0,.15,0,.5,.28,.24);P('box',mat(M,'#a8302a',{roughness:.4}),0,.3,0,.52,.04,.26);P('cyl',m.black,0,.36,0,.018,.24,.018,0,0,Math.PI/2);for(const x of[-.12,.12])P('box',m.black,x,.33,0,.02,.06,.02);break}
    case'washer':{P('box',m.yellow,0,.24,0,.32,.3,.42);P('box',m.black,0,.12,0,.34,.06,.44);for(const x of[-.18,.18])P('cyl',m.rubber,x,.1,-.14,.1,.05,.1,0,0,Math.PI/2);P('tor',m.black,0,.4,.04,.14,.14,.8,Math.PI/2,0,0);
      for(const x of[-.12,.12])P('cyl',m.dark,x,.62,-.2,.016,.5,.016,.3,0,0);break}
    case'box':{const t=M.vis.boxTex||(M.vis.boxTex=canvasTex(M,256,128,(c,w,h)=>{c.fillStyle='#c49a64';c.fillRect(0,0,w,h);c.fillStyle='rgba(0,0,0,.12)';c.fillRect(0,56,w,16);c.fillStyle='#b8322c';c.font='900 34px Arial';c.textAlign='center';c.fillText('HOLIDAY',w/2,44);
        c.fillStyle='#2f6b3a';c.fillText('LIGHTS',w/2,106);c.fillStyle='#1a1a1a';c.font='700 15px Arial';c.fillText('— LINDQVIST —',w/2,124)}));
      const bm=M.vis.boxMat||(M.vis.boxMat=own(M,new T3.MeshStandardMaterial({map:t,roughness:.9})));P('box',bm,0,.17,0,.44,.34,.34);P('box',m.card,0,.345,0,.45,.012,.12);break}
    case'sewing':{P('box',m.cream,0,.08,0,.44,.12,.22);P('box',m.cream,.14,.26,0,.12,.28,.16);P('box',m.cream,-.02,.38,0,.36,.1,.14);P('cyl',m.dark,-.2,.26,0,.02,.18,.02);P('cyl',m.steel,.22,.36,0,.05,.03,.05,0,0,Math.PI/2);P('box',m.dark,0,.02,0,.46,.04,.24);break}}
  /* the owner's paper tag, tied on */
  P('box',m.white,.0,it.kind==='kayak'?.4:it.kind==='grill'?.95:.5,it.kind==='kayak'?1.0:.0,.09,.05,.004,.0,.3,.0);
  return g}
/* where they sit when the door goes up: packed into the unit, spilling out onto the aisle */
const PILE=[[-1.3,148.2,.4],[-.35,148.4,0],[.7,148.3,-.3],[1.45,148.1,.2],[-1.6,147.3,1.57],[-.5,149.3,.1],[.55,149.35,0],[1.5,149.3,-.4],[-1.1,149.45,.3],[.0,147.5,.6],[1.0,147.4,-.2],[-1.9,148.9,0]];
function pilePos(i){const p=PILE[i%PILE.length];return{x:S_.u47.x+p[0],z:p[1],yaw:p[2]}}
/* ---------------- props: Linda's ladder, unit 47's door, Ron's truck, Gary's whiteboard, the yellow errand rings ---------------- */
function ladderMesh(M,len){const T3=A().THREE,g=new T3.Group(),m=mats(M);len=len||4.3;
  for(const x of[-.2,.2])part(M,g,'box',m.al,x,0,0,.05,.09,len);for(let i=0;i<Math.floor(len/.3);i++)part(M,g,'cyl',m.al,0,0,-len/2+.18+i*.3,.018,.4,.018,0,0,Math.PI/2);
  for(const z of[-len/2,len/2])for(const x of[-.2,.2])part(M,g,'box',m.black,x,0,z,.06,.1,.08);
  const tag=part(M,g,'box',mat(M,'#f2c230',{roughness:.5}),.2,.06,len/2-.5,.01,.08,.3);tag.castShadow=false;return g}
function buildDoor(M){const a=A(),T3=a.THREE,m=mats(M),g=new T3.Group();g.name='heistUnit47';a.wmAdd(g);const u=S_.u47,W=3.32,H=2.46;
  const dt=canvasTex(M,128,256,(c,w,h)=>{c.fillStyle='#e8611c';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=10){c.fillStyle='rgba(0,0,0,.16)';c.fillRect(0,y,w,2);c.fillStyle='rgba(255,255,255,.08)';c.fillRect(0,y+3,w,1)}
    c.fillStyle='#d8d8d8';c.fillRect(54,h-26,20,12);c.fillStyle='#1a1a1a';c.font='bold 30px Arial';c.textAlign='center';c.fillText('47',w/2,40)});
  const dm=own(M,new T3.MeshStandardMaterial({map:dt,roughness:.5,metalness:.3,side:T3.DoubleSide}));
  const pg=own(M,new T3.PlaneGeometry(W,H));pg.translate(0,-H/2,0);const door=new T3.Mesh(pg,dm);door.position.set(u.x,H+.04,u.z-.1);door.rotation.y=Math.PI;door.receiveShadow=true;g.add(door);
  const ig=own(M,new T3.PlaneGeometry(W-.02,H-.02));const inner=new T3.Mesh(ig,m.interior);inner.position.set(u.x,H/2+.04,u.z-.08);inner.rotation.y=Math.PI;g.add(inner);inner.visible=false;
  const roll=part(M,g,'cyl',m.door,u.x,H+.02,u.z-.25,.16,W,.16,0,0,Math.PI/2);roll.visible=false;
  /* the disc lock on the latch */
  const lock=new T3.Group();part(M,lock,'cyl',m.steel,0,0,0,.06,.035,.06,Math.PI/2,0,0);part(M,lock,'tor',m.steel,0,.05,0,.035,.035,.035,0,0,0);lock.position.set(u.x,.22,u.z-.14);g.add(lock);
  /* the back of the pile, visible once it's open: boxes stacked to the ceiling */
  const back=new T3.Group();for(let i=0;i<6;i++)part(M,back,'box',i%2?m.card:mat(M,'#b88d5a',{roughness:.9}),u.x-1.1+(i%3)*1.1,.32+Math.floor(i/3)*.62,u.z-.42,.9,.6,.5,0,(i*.37)%.3-.15,0);back.visible=false;g.add(back);
  M.vis.door={g,door,inner,roll,lock,back,H,k:0}}
function setDoor(M,k){const D=M.vis.door;if(!D)return;D.k=k;D.door.scale.y=Math.max(.03,1-k);D.door.visible=k<.99;D.inner.visible=k>.01;D.back.visible=k>.3;D.roll.visible=k>.05;D.lock.visible=M.lock!=='cut'}
function buildTruck(M){const a=A(),T3=a.THREE;const obj=a.makeVehicle('workvan','#f1efe9')||a.makeVanBox('#f1efe9');a.wmAdd(obj);const S=a.carSize({obj});
  const st=canvasTex(M,512,128,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#1f4c8a';c.font='900 64px "Arial Narrow",Arial';c.textAlign='center';c.fillText("RON'S MOVING",w/2,64);c.fillStyle='#e8611c';c.fillRect(60,76,w-120,6);
    c.fillStyle='#1f4c8a';c.font='italic 700 30px Arial';c.fillText('We lift. You relax.',w/2,116)});
  const sm=own(M,new T3.MeshStandardMaterial({map:st,transparent:true,roughness:.5,polygonOffset:true,polygonOffsetFactor:-2})),sg=own(M,new T3.PlaneGeometry(2.4,.6));
  for(const s of[-1,1]){const p=new T3.Mesh(sg,sm);p.position.set(-.35,(S.h||2)*.62,s*((S.w||2.1)/2+.012));p.rotation.y=s<0?Math.PI:0;obj.add(p)}
  const e={type:'workvan',obj,pos:a.V3(S_.stage.truck.x,0,S_.stage.truck.z),yaw:S_.stage.truck.yaw,spd:0,steer:0,col:a.wmCol({x0:0,z0:0,x1:0,z1:0,s:'metal'}),bump:0,stats:null,owner:'job',name:"Ron's",color:'#f1efe9',home:{x:0,z:0,yaw:0},dmg:0,odo:0,tile:null,meshes:[],heist:true};
  a.syncCar(e);M.truck=e;return e}
function truckRear(M){const e=M.truck,S=A().carSize(e),f=[-Math.sin(e.yaw),-Math.cos(e.yaw)];return{x:e.pos.x-f[0]*(S.l/2+.75),z:e.pos.z-f[1]*(S.l/2+.75)}}
function truckCab(M){const e=M.truck,S=A().carSize(e),f=[-Math.sin(e.yaw),-Math.cos(e.yaw)],r=[Math.cos(e.yaw),-Math.sin(e.yaw)];return{x:e.pos.x+f[0]*(S.l*.22)-r[0]*(S.w/2+.75),z:e.pos.z+f[1]*(S.l*.22)-r[1]*(S.w/2+.75)}}
function vehUpd(obj,o){const VM=window.HT&&HT.Vehicles;if(VM&&VM.update&&obj&&obj.userData&&obj.userData.mod)try{VM.update(obj,o)}catch(_){}}
function buildBoard(M){const a=A(),T3=a.THREE,m=mats(M),g=new T3.Group();g.name='heistBoard';a.wmAdd(g);
  const bt=canvasTex(M,512,320,(c,w,h)=>{c.fillStyle='#f6f6f2';c.fillRect(0,0,w,h);c.strokeStyle='#9aa0a6';c.lineWidth=6;c.strokeRect(3,3,w-6,h-6);
    c.fillStyle='#1d3f8a';c.font='900 34px "Arial Narrow",Arial';c.textAlign='center';c.fillText('OPERATION GOOD FENCES',w/2,46);c.fillStyle='#c63a2e';c.font='700 20px Arial';c.fillText('(working title)',w/2,70);
    c.strokeStyle='#1d3f8a';c.lineWidth=3;c.strokeRect(40,96,220,140);c.font='700 18px Arial';c.fillStyle='#1d3f8a';c.textAlign='left';c.fillText('UNIT 47',150,170);c.fillText('GATE',46,126);
    c.beginPath();c.moveTo(60,200);c.bezierCurveTo(110,240,170,140,230,170);c.stroke();c.fillStyle='#c63a2e';c.beginPath();c.arc(232,170,7,0,6.3);c.fill();
    c.fillStyle='#2b2b2b';c.font='600 17px Arial';['LOOKOUT  ______','DRIVER   ______','LIFTER   ______','DISTRACT ______'].forEach((t,i)=>c.fillText(t,290,120+i*34));
    c.fillStyle='#3b8a3f';c.font='italic 600 16px Arial';c.fillText('pivot table attached →',300,280)});
  const bm=own(M,new T3.MeshStandardMaterial({map:bt,roughness:.6}));const b=new T3.Mesh(own(M,new T3.PlaneGeometry(1.6,1)),bm);b.position.set(0,1.45,0);b.rotation.y=Math.PI;b.castShadow=true;g.add(b);
  part(M,g,'box',m.al,0,1.45,.02,1.68,1.08,.03);for(const x of[-.6,.6])part(M,g,'box',m.wood,x,.75,.18,.05,1.6,.05,-.12,0,0);part(M,g,'box',m.wood,0,.8,-.42,.05,1.7,.05,.3,0,0);part(M,g,'box',m.al,0,.92,-.05,1.5,.04,.08);
  g.position.set(GARY.x,0,GARY.z);M.vis.board=g;return g}
/* a soft yellow ring on the ground where an errand happens (the game's own job-ring look) */
function ringMesh(M,x,z,r){const a=A(),T3=a.THREE;const rt=M.vis.ringTex||(M.vis.ringTex=canvasTex(M,128,128,(c,w,h)=>{const g=c.createRadialGradient(64,64,40,64,64,62);g.addColorStop(0,'rgba(255,214,74,0)');g.addColorStop(.55,'rgba(255,214,74,.95)');g.addColorStop(.8,'rgba(255,214,74,.5)');g.addColorStop(1,'rgba(255,214,74,0)');c.fillStyle=g;c.fillRect(0,0,w,h)}));
  const rm=M.vis.ringMat||(M.vis.ringMat=own(M,new T3.MeshBasicMaterial({map:rt,transparent:true,depthWrite:false,toneMapped:false,fog:false,polygonOffset:true,polygonOffsetFactor:-3})));
  const pg=M.vis.ringGeo||(M.vis.ringGeo=own(M,new T3.PlaneGeometry(1,1)));const q=new T3.Mesh(pg,rm);q.rotation.x=-Math.PI/2;q.scale.set(r*2,r*2,1);q.position.set(x,(a.groundAt?a.groundAt(x,z):0)+.04,z);q.renderOrder=3;a.wmAdd(q);return q}

/* ---------------- people (real models only: the job waits for them) ---------------- */
function castKeys(){return Object.values(CAST).map(c=>c.key)}
function castReady(){const PP=window.HT&&HT.People;if(!PP||!PP.ok)return true;/* box fallback mode */return castKeys().every(k=>!PP.keys.includes(k)||PP.has(k))}
function preloadCast(){const PP=window.HT&&HT.People;if(!PP||!PP.ok||!PP.preload)return Promise.resolve();const want=castKeys().filter(k=>PP.keys.includes(k)&&!PP.has(k));return want.length?PP.preload(want).catch(()=>{}):Promise.resolve()}
function person(M,id,x,z,yaw){const a=A(),PP=window.HT&&HT.People,c=CAST[id];let d=null;
  if(PP&&PP.ok&&PP.has&&PP.has(c.key)){try{d=PP.make(c.key,{})}catch(_){d=null}}
  if(!d)d=a.makeDude(DADNAME[id]?a.HOMIES[id]:{shirt:'#557',pants:'#333'});d.root.position.set(x,0,z);d.root.rotation.y=yaw||0;a.wmAdd(d.root);
  const p={id,d,pos:{x,z},yaw:yaw||0,mode:'stand',moving:false,speed:1,path:null,say:0,carry:null,act:null};(M.people||(M.people={}))[id+(M.people[id]?'_'+Math.random().toString(36).slice(2,5):'')]=p;return p}
function posePerson(p,dt){const PP=window.HT&&HT.People;p.d.root.position.set(p.pos.x,0,p.pos.z);p.d.root.rotation.y=p.yaw;if(p.d.rb&&PP&&PP.pose)try{PP.pose(p.d,dt,{moving:p.moving,aim:false,mode:p.mode,speed:p.speed})}catch(_){}else{const a=A();try{a.pose(p.d,dt,{moving:p.moving,aim:false,mode:p.mode})}catch(_){}}}
function face(p,x,z,dt,r){p.yaw+=wrap(cyaw(x-p.pos.x,z-p.pos.z)-p.yaw)*Math.min(1,dt*(r||5))}
/* straight-line walk with the game's collision (the routes here are open aisles and sidewalks); true on arrival */
function walk(p,x,z,sp,dt){const dx=x-p.pos.x,dz=z-p.pos.z,l=hyp(dx,dz);if(l<.25){p.moving=false;return true}const s=Math.min(l,sp*dt);p.pos.x+=dx/l*s;p.pos.z+=dz/l*s;
  const v=A().V3(p.pos.x,0,p.pos.z);A().collide(v,.3);p.pos.x=v.x;p.pos.z=v.z;p.yaw+=wrap(cyaw(dx,dz)-p.yaw)*Math.min(1,dt*7);p.moving=true;p.speed=sp;return false}
function hand(M,p,mesh){const T3=A().THREE;if(p.carry&&p.carry.parent)p.carry.parent.remove(p.carry);p.carry=null;if(!mesh)return;mesh.position.set(0,.95,.4);mesh.rotation.set(0,Math.PI/2,0);
  if(p.d.root)p.d.root.add(mesh);p.carry=mesh}

/* =====================================================================
   STAGE 1: SCOPE (daytime, the phone)
   ===================================================================== */
const TAGS=['keypad','cams','board','dwayne','u47'];
const TAGLABEL={keypad:'The gate keypad (on the sidewalk by the gate)',cams:'A security camera (on the corner posts)',board:'The guard rota board (on the office wall)',dwayne:'Dwayne, at the office door (get his face)',u47:'Unit 47 (the far end of the middle aisle)'};
function dwayneGYaw(M){return M.dw?M.dw.yaw+Math.PI:0}
function subjects(M){const out=[];const t=M.tags;
  out.push({id:'keypad',item:'keypad',label:'Gate keypad',pos:{x:S_.keypad.x,y:1.02,z:S_.keypad.z},h:.42,need:'any',live:!t.keypad});
  S_.cams.forEach((c,i)=>out.push({id:'cam'+i,item:'cams',label:'Security camera',pos:{x:c.x,y:c.y-.25,z:c.z},h:.55,need:'any',live:!t.cams}));
  out.push({id:'board',item:'board',label:'Guard rota',pos:{x:S_.board.x,y:1.22,z:S_.board.z-.1},h:.62,need:'any',live:!t.board});
  if(M.dw)out.push({id:'dwayne',item:'dwayne',label:'Dwayne',pos:{x:M.dw.pos.x,y:0,z:M.dw.pos.z},h:1.78,need:'face',facing:dwayneGYaw(M),live:!t.dwayne});
  out.push({id:'u47',item:'u47',label:'Unit 47',pos:{x:S_.u47.x,y:0,z:S_.u47.z-.12},h:2.4,need:'any',live:!t.u47});return out}
function tag(M,id){if(M.tags[id])return;M.tags[id]=true;const T=L.tag[id];if(T){say(M,T[0][0],T[0][1],{front:true});feed('Scoped: '+(id==='u47'?'Unit 47':id==='cams'?'the cameras':id==='board'?'the guard rota':id==='dwayne'?'Dwayne':'the keypad'),'trust',T[1])}
  tone({f:880,to:1320,type:'triangle',d:.12,gain:.05,bus:'ui'});if(id==='u47'){say(M,L.scopeDone[0],L.scopeDone[1],{t:4.5})}}
function scopeInit(M){const a=A();if(M.scoped)return;M.scoped=true;M.dw=person(M,'dwayne',S_.office.door.x,S_.office.door.z-1.1,Math.PI);
  M.item='phone';M.noGuns=L.noGunsDay;try{a.equip(a.P.dude,null)}catch(_){}
  const Ph=PH();if(Ph)Ph.begin({job:'heist',label:'Good Fences',subjects:()=>subjects(M),onShot:s=>{for(const h of s.hits||[])if(h.stars>=1&&!M.tags[h.item])tag(M,h.item);
      if(!(s.hits||[]).some(h=>h.stars>=1)&&!M.said.miss){M.said.miss=1;say(M,'gary',"Get closer, or zoom. The wheel zooms. It needs to be clear enough to read.")}},
    stamp:()=>'SAT  2:14 PM',flash:false,status:()=>({v:M.weird,text:M.weird>.05?'DWAYNE '+Math.round(M.weird*100)+'%':''})});
  if(!M.retryScope)seq(M,L.open,3);try{music('tension',.12)}catch(_){}}
function scopeTick(M,F,dt){const a=A(),P=a.P,Ph=PH(),dw=M.dw;
  /* Dwayne: leans in his doorway, looks the lot over, watches you if you're close */
  const dp=hyp(P.pos.x-dw.pos.x,P.pos.z-dw.pos.z);M.dwT=(M.dwT||0)+dt;
  if(dp<9&&!a.CV)face(dw,P.pos.x,P.pos.z,dt,3);else{const base=Math.PI+Math.sin(M.dwT*.35)*.9;dw.yaw+=wrap(base-dw.yaw)*Math.min(1,dt*1.5)}
  dw.moving=false;dw.mode='stand';posePerson(dw,dt);
  if(dp<7&&!M.said.hello&&!a.CV){M.said.hello=1;say(M,L.hello[0],L.hello[1],{front:true})}
  /* the weird meter: the phone up where he can see it */
  const raised=!!(Ph&&Ph.isRaised());let sees=false;
  if(raised&&dp<K.weird.R){const df=Math.abs(wrap(cyaw(P.pos.x-dw.pos.x,P.pos.z-dw.pos.z)-dw.yaw));if(df<K.weird.half&&losClear(dw.pos.x,dw.pos.z,P.pos.x,P.pos.z))sees=true}
  if(!M.weirdFlag){M.weird=clamp(M.weird+(sees?K.weird.fill:-K.weird.decay)*dt,0,1);
    if(M.weird>.5&&!M.said.weirdWarn){M.said.weirdWarn=1;say(M,L.weirdWarn[0],L.weirdWarn[1],{front:true})}
    if(M.weird>=1){M.weirdFlag=true;seq(M,L.weird,2.4);feed('Dwayne will remember you','bad','The bluff is off the table')}}
  /* objectives */
  const n=TAGS.filter(k=>M.tags[k]).length;
  if(!M.raisedOnce&&raised)M.raisedOnce=true;
  if(!M.tags.u47||!a.CV){
    if(!M.raisedOnce)F.objs.push(['Scope the place with your phone. Raise it: RIGHT mouse button',false]);
    else if(!n)F.objs.push(['Point it at something on the list and press LEFT mouse button (wheel zooms)',false]);
    else F.objs.push(['Scope the place · '+n+'/5 photographed',n>=5]);
    for(const k of TAGS)F.objs.push([(k==='u47'?'Required: ':'')+TAGLABEL[k],!!M.tags[k]]);
    if(M.tags.u47)F.objs.push(['Done? Get in your van to go shopping for gear',false]);
    if(M.weirdFlag)F.objs.push(['Dwayne has your face: no bluff',false,'warn']);else if(M.weird>.35)F.objs.push(['Dwayne is watching you take pictures · '+Math.round(M.weird*100)+'%',false,'warn'])}
  if(M.weird>.04||raised)F.meters.push({id:'weird',label:'Dwayne',v:M.weird,max:1,style:'ring',icon:'eye',sub:M.weirdFlag?'Remembers you':Math.round(M.weird*100)+'%'});
  F.meters.push({id:'scope',label:'Scoped',v:n,max:5,style:'pips',icon:'cam'});
  /* marker: the next thing worth a photo, in walking order; then the van */
  let tgt=null;const order=['keypad','cams','board','dwayne','u47'];
  for(const k of order)if(!M.tags[k]){const s=k==='keypad'?S_.keypad:k==='cams'?{x:S_.cams[0].x+1.5,z:S_.cams[0].z+3}:k==='board'?{x:S_.board.x,z:S_.board.z-3}:k==='dwayne'?{x:dw.pos.x,z:dw.pos.z-3}:{x:S_.u47.x,z:S_.u47.z-4};
    tgt={x:s.x,z:s.z,label:k==='u47'?'Unit 47':k==='cams'?'Camera':k==='board'?'Guard rota':k==='dwayne'?'Dwayne':'Keypad'};if(k!=='u47'||!M.tags.u47)break}
  if(M.tags.u47&&(n>=5||M.leaving))tgt={x:M.car.pos.x,z:M.car.pos.z,label:'Your van'};
  F.target=tgt;
  if(M.tags.u47&&a.CV===M.car){a.CP.mark('gear');gearEnter(M)}}
/* a sight line through the walls (the unit blocks and the office); the chain-link fence is see-through */
function losClear(x0,z0,x1,z1){const cs=A().L.colliders,dx=x1-x0,dz=z1-z0;for(const c of cs){if(c.off||c.ob||c.x1-c.x0>60||c.z1-c.z0>60)continue;const k=c.s||c.k;if(k&&k!=='wall'&&k!=='crate')continue;
  if(Math.max(x0,x1)<c.x0||Math.min(x0,x1)>c.x1||Math.max(z0,z1)<c.z0||Math.min(z0,z1)>c.z1)continue;let t0=0,t1=1,ok=true;
  for(let q=0;q<2&&ok;q++){const p=q?z0:x0,d=q?dz:dx,lo=q?c.z0:c.x0,hi=q?c.z1:c.x1;if(Math.abs(d)<1e-9){if(p<=lo||p>=hi)ok=false}else{let u0=(lo-p)/d,u1=(hi-p)/d;if(u0>u1){const w=u0;u0=u1;u1=w}if(u0>t0)t0=u0;if(u1<t1)t1=u1;if(t0>=t1)ok=false}}
  if(ok)return false}return true}

/* =====================================================================
   STAGE 2: GEAR (errands around Maple) and STAGE 3: THE PLAN (Gary's driveway)
   ===================================================================== */
function gearEnter(M){M.stage0='gear';const Ph=PH();if(Ph)try{Ph.end()}catch(_){}M.item=null;M.noGuns=L.noGunsDay;
  if(M.dw){M.dw.d.root.visible=false}
  if(!M.said.gearOpen){M.said.gearOpen=1;seq(M,L.gearOpen,3.2,{t:1})}try{music('home',.1)}catch(_){}}
function gearInit(M){const a=A();if(M.geared)return;M.geared=true;M.gp={};
  for(const g of GEAR){const p=person(M,g.who,g.at.x,g.at.z,g.face);p.home={x:g.at.x,z:g.at.z};M.gp[g.id]=p;
    const f=[Math.sin(g.face),Math.cos(g.face)];g.ring={x:g.at.x+f[0]*1.7,z:g.at.z+f[1]*1.7};M.vis['ring_'+g.id]=ringMesh(M,g.ring.x,g.ring.z,.85)}
  /* Linda's ladder leans on her porch post */
  const ld=ladderMesh(M);ld.rotation.set(-1.32,0,0);ld.position.set(53.4,2.05,21.05);a.wmAdd(ld);M.vis.ladder=ld;
  /* the crew around Gary's whiteboard */
  buildBoard(M);M.crewP={};const spots={gary:[GARY.x+1.2,GARY.z-.4,-2.3],rick:[GARY.x-1.5,GARY.z-1.2,2.5],dave:[GARY.x+2.1,GARY.z-1.6,-2.6],doug:[GARY.x-.6,GARY.z-2.1,2.9]};
  for(const id of DADS){const s=spots[id];M.crewP[id]=person(M,id,s[0],s[1],s[2])}
  M.vis.ringBoard=ringMesh(M,GARY.x,GARY.z-3.1,.95);gearSync(M)}
/* what the errands look like after a reload (people who gave you something wave and go back inside; the ladder is on the van) */
function gearSync(M){for(const g of GEAR){const got=!!M.gear[g.id];const r=M.vis['ring_'+g.id];if(r)r.visible=!got&&!(g.id==='ladder'&&M.talked.linda)}
  if(M.vis.ladder){const onVan=!!M.gear.ladder;M.vis.ladder.visible=!onVan&&!M.ladderCarry;if(onVan)mountLadder(M)}}
function mountLadder(M){const a=A();if(M.vis.vanLadder||!a.VAN||!a.VAN.obj)return;const l=ladderMesh(M,3.9);l.rotation.set(0,Math.PI/2,0);const S=a.carSize(a.VAN);l.position.set(-.2,(S.h||1.8)+.12,0);a.VAN.obj.add(l);M.vis.vanLadder=l}
function errand(M,g){const a=A();if(M.talked[g.who]&&g.id!=='ladder')return;M.talked[g.who]=true;const lines=L.errand[g.who]||[];const T=seq(M,lines,2.4,{front:true});
  if(g.id==='ladder'){M.vis['ring_ladder'].visible=false;say(M,'you',"The ladder's on her porch. Pick it up.",{t:T});return}
  if(g.cost){const s=a.SV();if(s&&s.cash>=g.cost){s.cash-=g.cost;M.spend+=g.cost;feed('-$'+g.cost+' · '+g.label,'info')}else{say(M,L.poor[0],L.poor[1],{t:T});M.owe=(M.owe||0)+g.cost}}
  M.q.push({t:Math.min(T,4),fn:()=>gotGear(M,g.id)})}
function gotGear(M,id){if(M.gear[id])return;M.gear[id]=true;const g=GEAR.find(x=>x.id===id);feed('Packed: '+g.label,'trust',L.gearNote[id]);tone({f:660,to:990,type:'triangle',d:.14,gain:.05,bus:'ui'});gearSync(M);
  const p=M.gp&&M.gp[id];if(p)p.waveT=2.2}
function gearTick(M,F,dt){const a=A(),P=a.P;
  /* the people: idle at their door, wave when they hand something over, face you when you're close */
  for(const g of GEAR){const p=M.gp[g.id];if(!p)continue;const d=hyp(P.pos.x-p.pos.x,P.pos.z-p.pos.z);if(d<8&&!a.CV)face(p,P.pos.x,P.pos.z,dt,3);else p.yaw+=wrap(g.face-p.yaw)*Math.min(1,dt*2);
    p.moving=false;p.mode='stand';if(p.waveT>0){p.waveT-=dt}posePerson(p,dt)}
  for(const id of DADS){const p=M.crewP[id];if(!p)continue;const d=hyp(P.pos.x-p.pos.x,P.pos.z-p.pos.z);if(d<6&&!a.CV)face(p,P.pos.x,P.pos.z,dt,2.5);else face(p,GARY.x,GARY.z,dt,2);posePerson(p,dt)}
  /* errands: press E at the ring */
  if(!a.CV)for(const g of GEAR){if(M.gear[g.id]||(g.id==='ladder'&&M.talked.linda))continue;F.taps.push({x:g.ring.x,z:g.ring.z,r:2.2,txt:(g.cost?'Buy the walkie-talkies from Hank ($'+g.cost+')':'Talk to '+g.name+' · '+g.label),fn:()=>errand(M,g)})}
  /* the ladder: pick it up off Linda's porch, carry it to the van */
  if(!M.gear.ladder&&M.talked.linda&&!M.ladderCarry&&!a.CV&&!P.carry)F.holds.push({x:53.2,z:19.9,r:1.9,o:M.ldO||(M.ldO={}),txt:"Pick up Linda's ladder",time:.8,fn:()=>{M.ladderCarry=true;a.wmCarry('ladder',M.vis.ladder,null);M.vis.ladder.visible=true;M.vis.ladder.position.set(.28,1.55,.1);M.vis.ladder.rotation.set(0,0,0);say(M,'you',L.ladderGot)}});
  if(M.ladderCarry){if(!(P.carry&&P.carry.kind==='ladder')){M.ladderCarry=false;resetLadder(M)}else{P.crouch=false;slow(M,K.carryMul);const r=vanRear(M);
      F.taps.push({x:r.x,z:r.z,r:2.6,txt:'Put the ladder on the van roof',fn:()=>{a.wmDrop();M.ladderCarry=false;gotGear(M,'ladder');say(M,L.ladderVan[0],L.ladderVan[1])}})}}else M.prevP=null;
  /* the plan board */
  const nG=GEAR.filter(g=>M.gear[g.id]).length;
  if(!a.CV)F.taps.push({x:GARY.x,z:GARY.z-2.6,r:2.4,txt:'Open the plan board',fn:()=>openBoard(M)});
  /* objectives */
  F.objs.push(['Gear up · any order, all optional · '+nG+'/5',nG>=5]);
  for(const g of GEAR){const txt=g.label+' · '+g.where+(g.id==='ladder'&&M.ladderCarry?' (carry it to your van)':'');F.objs.push([txt,!!M.gear[g.id]])}
  F.objs.push(["Ready? The plan board in Gary's driveway (press E there)",false]);
  F.meters.push({id:'gear',label:'Gear',v:nG,max:5,style:'pips',icon:'bolt'});
  /* marker: the ladder to the van if you're carrying it; else the nearest errand; Gary's when you've got a couple or you're closest to him */
  let tgt=null,bd=1e9;if(M.ladderCarry){const r=vanRear(M);tgt={x:r.x,z:r.z,label:'Your van'}}
  else{for(const g of GEAR){if(M.gear[g.id])continue;const s=g.id==='ladder'&&M.talked.linda?{x:53.2,z:19.4}:g.ring;const d=hyp(s.x-P.pos.x,s.z-P.pos.z);if(d<bd){bd=d;tgt={x:s.x,z:s.z,label:g.id==='ladder'&&M.talked.linda?"Linda's ladder":g.name}}}
    const dg=hyp(GARY.x-P.pos.x,GARY.z-P.pos.z);if(!tgt||nG>=2&&dg<bd*1.3||nG>=4)tgt={x:GARY.x,z:GARY.z-2.8,label:"Gary's driveway"}}
  F.target=tgt}
function resetLadder(M){const l=M.vis.ladder;if(!l)return;if(l.parent!==A().L.group&&l.parent)l.parent.remove(l);A().L.group.add(l);l.rotation.set(-1.32,0,0);l.position.set(53.4,2.05,21.05);l.visible=true}
function vanRear(M){const v=M.car||A().VAN,S=A().carSize(v),f=[-Math.sin(v.yaw),-Math.cos(v.yaw)];return{x:v.pos.x-f[0]*(S.l/2+.8),z:v.pos.z-f[1]*(S.l/2+.8)}}
/* a carried load slows you (applied as a fraction of this frame's movement) */
function slow(M,k){const P=A().P;if(M.prevP){const dx=P.pos.x-M.prevP.x,dz=P.pos.z-M.prevP.z;if(dx*dx+dz*dz<1){P.pos.x=M.prevP.x+dx*k;P.pos.z=M.prevP.z+dz*k}}M.prevP={x:P.pos.x,z:P.pos.z}}

/* ---------------- the plan board (HT.Plan) ---------------- */
function planCtx(M){return{photo:Object.assign({},M.tags),gear:Object.assign({},M.gear),flags:{weird:!!M.weirdFlag},perks:{}}}
function starsOf(M,rid,cid){const Pl=PL();return Pl?Pl.stars(PLAN_DEF,cid,rid,planCtx(M)):1}
function forecast(M,st){const out=[],as=st.assign||{},g=M.gear,t=M.tags,app=st.entry;const s=r=>as[r]?starsOf(M,r,as[r]):0,n=r=>as[r]?DADNAME[as[r]]:'Nobody';
  if(!app)out.push({text:'Pick an approach: quiet, the bluff, or loud.'});
  if(app==='quiet')out.push({text:t.keypad?'In through the gate with the code (7-4-1).':g.ladder?"Over the fence on Linda's ladder, then the gate button from inside.":'',tone:'good'});
  if(app==='bluff')out.push({text:'You talk Dwayne round at closing time. Win the conversation or it goes loud.',tone:''});
  if(app==='loud')out.push({text:'Ron\'s truck through the gate. Guards fight back, and the fence\'s cousins chase you home.',tone:'bad'});
  if(as.lookout){const k=s('lookout');out.push({text:n('lookout')+' on lookout: warnings about '+(K.lead[k-1]|0)+' seconds before Reggie turns your way'+(as.lookout==='dave'?' (when he isn\'t eating).':'.'),tone:k>=3?'good':k<=1?'bad':''});
    if(!g.walkies)out.push({text:'No walkie-talkies: warnings come by text, late, and the guard isn\'t on your minimap.',tone:'bad'})}
  if(as.driver){const k=s('driver'),d=as.driver;out.push({text:d==='gary'?'Gary drives: the truck beeps when it reverses. Reggie will hear it.':d==='doug'?'Doug drives: he backs in "Tokyo style". Slowly.':d==='rick'?'Rick drives: lights off, silent, fast.':n('driver')+' drives: steady.',tone:d==='gary'?'bad':k>=3?'good':''});
    if(app==='loud')out.push({text:K.chasers[k-1]+' chase car'+(K.chasers[k-1]>1?'s':'')+' will follow the truck home.',tone:K.chasers[k-1]>1?'bad':''})}
  if(as.lifter){const k=s('lifter'),d=as.lifter;out.push({text:d==='dave'?'Big Dave lifts: two things a trip. The grill goes under one arm.':d==='gary'?'Gary lifts: slowly, and he will pull something.':d==='doug'?'Doug lifts: the fanny pack gets in the way.':n('lifter')+' lifts: one thing a trip, quick.',tone:k>=3?'good':k<=1?'bad':''})}
  if(as.distraction){const k=s('distraction');out.push({text:n('distraction')+' keeps Dwayne busy for about '+K.busy[k-1]+' seconds'+(app==='bluff'?' once you\'re in.':'. After that the cameras have an audience.'),tone:k>=3?'good':k<=1?'bad':''})}
  if(app==='quiet')out.push({text:t.cams?'Cameras: you photographed them; you\'ll see where they look.':'You never photographed the cameras. They\'re there. You won\'t see where they look.',tone:t.cams?'good':'bad'});
  if(app==='quiet')out.push({text:t.board?'Guard rota: Reggie\'s round shows on the ground.':'No guard rota: Reggie\'s round is a surprise.',tone:t.board?'good':'bad'});
  if(!g.dolly)out.push({text:'No hand truck: the grill, the kayak and the mower are the lifter\'s problem.',tone:'bad'});
  if(g.blankets&&app!=='loud')out.push({text:'Moving blankets: the padlock and the loading stay quiet.',tone:'good'});
  if(g.pack&&app==='quiet')out.push({text:"Doug's laser pointer: fire to make Reggie look somewhere else (3 tries).",tone:'good'});
  return out.filter(x=>x.text)}
function intel(M){const t=M.tags;return[{label:'Keypad',ok:t.keypad},{label:'Cameras',ok:t.cams},{label:'Guard rota',ok:t.board},{label:'Dwayne',ok:t.dwayne&&!M.weirdFlag,note:M.weirdFlag?'He remembers you':''},{label:'Unit 47',ok:t.u47}]}
function openBoard(M){const a=A(),Pl=PL();if(!Pl||M.board)return;
  if(M.stage!=='plan'){a.CP.mark('plan');if(!M.said.board){M.said.board=1;seq(M,L.board,2.2)}}
  const saved=M.plan||Pl.load('heist')||Pl.auto(PLAN_DEF,planCtx(M));
  M.board=Pl.open({def:PLAN_DEF,ctx:planCtx(M),state:saved,kicker:'Good Fences · the plan',title:'Who does what',you:"You're the inside man: unit 47, then the truck, then home.",intel:()=>intel(M),
    forecast:s=>forecast(M,s),goLabel:"That's the plan",backLabel:'Not yet',
    onChange:s=>{M.planDraft=s},
    onGo:s=>{M.board=null;M.plan=s;Pl.save('heist',s);beginJob(M,false)},
    onBack:()=>{M.board=null}});
  if(M.board&&!M.said.boardTip){M.said.boardTip=1;feed(L.boardTip,'info')}}

/* =====================================================================
   STAGE 4: THE JOB (you're the inside man; the crew plays the plan)
   ===================================================================== */
function roleOf(M,r){return M.plan&&M.plan.assign&&M.plan.assign[r]}
function st(M,r){const c=roleOf(M,r);return c?starsOf(M,r,c):1}
function gearVisOff(M){for(const g of GEAR){const p=M.gp&&M.gp[g.id];if(p)p.d.root.visible=false;const r=M.vis['ring_'+g.id];if(r)r.visible=false}
  if(M.vis.ladder)M.vis.ladder.visible=false;if(M.vis.board)M.vis.board.visible=false;if(M.vis.ringBoard)M.vis.ringBoard.visible=false;for(const id of DADS){const p=M.crewP&&M.crewP[id];if(p)p.d.root.visible=false}
  if(M.dw)M.dw.d.root.visible=false}
function gateObj(){const O=window.HT&&HT.OpenWorld;return O&&O.prop?O.prop('storage.gate'):null}
function setGate(M,k){const g=gateObj();if(!g)return;if(M.gate0==null)M.gate0=g.position.z;g.position.z=M.gate0+S_.gate.closeDz*(1-k);M.gateK=k;
  if(M.gateCol){const c=M.gateCol;if(k<.6){c.x0=208.95;c.x1=209.75;c.z0=145.9;c.z1=150.1}else{c.x0=c.x1=c.z0=c.z1=-999}}}
function smashGate(M){const g=gateObj();if(!g)return;if(M.gate0==null)M.gate0=g.position.z;g.position.z=M.gate0+S_.gate.closeDz;g.rotation.z=-1.35;g.position.y=.12;g.position.x=-.6;M.gateSmashed=true;if(M.gateCol){const c=M.gateCol;c.x0=c.x1=c.z0=c.z1=-999}}
function gateRestore(M){const g=gateObj();if(g&&M.gate0!=null){g.position.z=M.gate0;g.rotation.z=0;g.position.y=0;g.position.x=0}M.gate0=null}
/* set up the night: teleport to the staging spot on Industrial Way, build the unit, the truck, the people, the stealth session */
function beginJob(M,fromLoad){const a=A(),P=a.P,app=M.plan&&M.plan.entry||'quiet';M.app=app;M.stage0='job';
  gearVisOff(M);const Ph=PH();if(Ph)try{Ph.end()}catch(_){}M.item=null;
  try{a.setNight(app==='bluff'?.42:1,true)}catch(_){}
  if(a.CV)try{a.exitCar()}catch(_){}
  const V=a.VAN;if(V&&V.pos){V.pos.set(S_.stage.van.x,0,S_.stage.van.z);V.yaw=S_.stage.van.yaw;V.spd=0;if(V.car){V.car.spd=0;V.car.x=V.pos.x;V.car.z=V.pos.z;V.car.yaw=V.yaw}a.syncCar(V);M.car=V}
  P.pos.set(S_.stage.you.x,0,S_.stage.you.z);a.collide(P.pos,.35);P.yaw=gyaw(0,1);P.pitch=-.1;
  if(!fromLoad){a.banner(L.night[app].split(' · ')[0],L.night[app].split(' · ')[1],3.2);seq(M,L.jobOpen[app],3,{t:1.2})}
  jobInit(M);
  M.noGuns=app==='loud'?false:L.noGuns;
  if(app==='loud')goLoud(M,'planned');
  if(!fromLoad)a.CP.mark('job')}
function jobInit(M){const a=A(),T3=a.THREE;if(M.jobbed)return;M.jobbed=true;const app=M.app;
  buildDoor(M);setDoor(M,M.door||0);buildTruck(M);
  M.gateCol=a.wmCol({x0:-999,z0:-999,x1:-999,z1:-999,s:'fence'});
  if(app==='bluff')setGate(M,1);else setGate(M,M.gateOpen?1:0);
  /* the twelve things */
  M.it=ITEMS.map((it,i)=>{const p=pilePos(i),m=itemMesh(M,it);m.position.set(p.x,0,p.z);m.rotation.y=p.yaw;a.wmAdd(m);m.visible=false;
    return{def:it,i,mesh:m,x:p.x,z:p.z,yaw:p.yaw,state:M.loadedIds&&M.loadedIds.includes(it.id)?'loaded':'pile',o:{}}});
  for(const t of M.it)if(t.state==='loaded')t.mesh.visible=false;
  /* the crew on the night */
  M.cr={};const lk=roleOf(M,'lookout'),li=roleOf(M,'lifter'),di=roleOf(M,'distraction');
  if(lk){const p=person(M,lk,S_.stage.lookout.x,S_.stage.lookout.z,Math.PI/2);M.cr.lookout=p;p.bino=true}
  if(li){M.cr.lifter=person(M,li,S_.stage.crew.x,S_.stage.crew.z,Math.PI);M.cr.lifter.st='wait'}
  if(di){M.cr.distraction=person(M,di,S_.stage.crew.x+.9,S_.stage.crew.z-1.1,Math.PI);M.cr.distraction.st='wait'}
  /* the people on the other side */
  M.dw=person(M,'dwayne',S_.office.desk.x,S_.office.desk.z-1.2,Math.PI);M.dw.st=app==='bluff'?'door':'desk';if(app==='bluff'){M.dw.pos.x=S_.office.door.x;M.dw.pos.z=S_.office.door.z-1.1}
  M.rg=person(M,'reggie',ROUTE[0].go[0],ROUTE[0].go[1],Math.PI/2);M.rg.k=M.rgK||0;M.rg.t=0;M.rg.lt=0;M.rg.mode2='route';if(app==='bluff')M.rg.d.root.visible=false;
  if(app==='quiet')stealthInit(M);
  if(M.lock==='cut'){setDoor(M,1);for(const t of M.it)if(t.state==='pile')t.mesh.visible=true}
  if(M.truckIn)placeTruckIn(M);
  try{music('tension',app==='loud'?.6:.25)}catch(_){}}
/* ---------------- quiet: HT.Stealth (Reggie with his flashlight, four cameras), the lookout's ghost ---------------- */
function stealthInit(M){const a=A(),Sx=ST();if(!Sx||M.S)return;const T3=a.THREE;
  const S=M.S=Sx.create({night:true,diff:1}),S2=M.S2=Sx.create({night:true,diff:1});/* S2: cameras you never photographed (no cones drawn) */
  for(const c of a.L.colliders){const k=c.s||c.k;if(c.x1<204||c.x0>276||c.z1<128||c.z0>160||c.ob)continue;if(k==='wall'||k==='crate'||k==='dock'){const o={x0:c.x0,z0:c.z0,x1:c.x1,z1:c.z1,h:k==='dock'?1.2:3};S.occluder(o);S2.occluder(o)}}
  const tr=M.truck,TS=a.carSize(tr);M.truckOcc={x0:0,z0:0,x1:0,z1:0,h:1.9};S.occluder(M.truckOcc);S2.occluder(M.truckOcc);
  M.rg.ob=S.addObserver({id:'reggie',kind:'guard',pos:M.rg.pos,yaw:M.rg.yaw,lamp:true,headY:1.9,handY:1.15});
  M.cams=S_.cams.map((c,i)=>{const yaw=[-2.356,2.356,.785,0][i]+Math.PI;/* the site's game yaws, turned to the stealth convention */const ses=M.tags.cams?S:S2;
    return ses.addObserver({id:'cam'+i,kind:'camera',pos:{x:c.x,z:c.z},yaw,eye:c.y,R:K.cam.R,half:K.cam.half,mul:K.cam.mul})});
  /* the lights over the aisles */
  S.light({x:238,y:4,z:148,r:8,i:.8});S.light({x:269.3,y:6.5,z:140,r:9,i:.75});S.light({x:215,y:3,z:150.5,r:5,i:.9});
  S2.lights.push(...S.lights);
  const paths=M.tags.board?[{pts:ROUTE.filter(s=>s.go).map(s=>({x:s.go[0],z:s.go[1]})),loop:true,color:'#ffe28a'}]:[];
  const grp=new T3.Group();grp.name='heistStealth';a.wmAdd(grp);M.vis.sg=grp;
  M.viz=Sx.viz(S,{THREE:T3,parent:grp,paths});M.hud=Sx.hud(S,{project:(x,y,z)=>a.project(x,y,z),mount:el=>{try{a.overlay('stealth',el)}catch(_){}}});Sx.bindHud(a.HUD);
  S.on('alert',b=>{if(b.id==='reggie')escalate(M,'reggie');else if(b.kind==='camera'&&watched(M))escalate(M,'camera')});
  S2.on('alert',b=>{if(watched(M))escalate(M,'camera')});
  /* the lookout's ghost: the same round, run lead seconds ahead */
  M.ghost2={pos:{x:M.rg.pos.x,z:M.rg.pos.z},yaw:M.rg.yaw,k:M.rg.k,t:0};}
function watched(M){return!M.busy||M.busy<=0}
function playerSt(M){const a=A(),P=a.P,N=window.NIGHT;const carry=!!M.carrying||!!(P.carry&&P.carry.kind==='heist');const stance=M.hide?'crouch':carry?'carry':P.crouch?'crouch':(a.keys.shift&&P.moving)?'sprint':'stand';
  const base=typeof window.nightLight==='function'?window.nightLight(P.pos.x,P.pos.z):.4;let lit=M.S.lightAt(P.pos.x,P.pos.z,stance==='crouch'?.8:1.3,base);if(N&&N.flash)lit=1;
  return{x:P.pos.x,z:P.pos.z,stance,lit,hidden:!!M.hide}}
/* Reggie's round, step by step (deterministic on dt); g is Reggie or his ghost */
function roundStep(g,dt,real){const s=ROUTE[g.k%ROUTE.length];g.t+=dt;
  if(s.go){const dx=s.go[0]-g.pos.x,dz=s.go[1]-g.pos.z,l=hyp(dx,dz),sp=1.15;if(l<.2){g.k=(g.k+1)%ROUTE.length;g.t=0;return false}const m=Math.min(l,sp*dt);g.pos.x+=dx/l*m;g.pos.z+=dz/l*m;g.yaw+=wrap(cyaw(dx,dz)-g.yaw)*Math.min(1,dt*6);return true}
  if(s.look){const base=s.a,sw=Math.sin(g.t*1.5)*.85;g.yaw+=wrap(base+sw-g.yaw)*Math.min(1,dt*3);if(g.t>=s.look){g.k=(g.k+1)%ROUTE.length;g.t=0}return false}return false}
function reggieTick(M,dt){const g=M.rg,ob=g.ob;if(!g||g.tied){if(g){g.mode='kneel';g.moving=false;posePerson(g,dt)}return}
  const stt=ob?ob.state:'calm';let moving=false;
  if(g.mode2==='lured'||stt==='curious'||stt==='searching'){/* turn to look, walk over if it's worth it */const lk=ob&&ob.lkp||g.lure;g.mode2=g.mode2==='lured'?'lured':'look';
    if(lk){const d=hyp(lk.x-g.pos.x,lk.z-g.pos.z);if((stt==='searching'||g.mode2==='lured')&&d>1.2)moving=!walk(g,lk.x,lk.z,1.35,dt);else face(g,lk.x,lk.z,dt,3)}
    g.lookT=(g.lookT||0)+dt;if(g.mode2==='lured'&&g.lookT>7){g.mode2='back';g.lure=null}
    if(!M.said['rg'+stt]&&stt!=='calm'){M.said['rg'+stt]=1;say(M,'Reggie',stt==='curious'?pick(["Hm?","...Hello?","Somebody there?"]):pick(["Somebody's back here. I can hear you breathing. Or that's me.","Come on out. I've got a flashlight and nowhere to be."]))}}
  else if(g.mode2==='look'||g.mode2==='back'){/* back to the round where he left it */g.lookT=0;const s=ROUTE[g.k%ROUTE.length];const p=s.go?{x:s.go[0],z:s.go[1]}:g.left||g.pos;
    if(walk(g,p.x,p.z,1.15,dt)){g.mode2='route'}else moving=true}
  else{moving=roundStep(g,dt,true);g.left={x:g.pos.x,z:g.pos.z}}
  g.moving=moving;g.mode='stand';if(ob)ob.yaw=g.yaw;posePerson(g,dt)}
/* the lookout: watches Reggie's ghost (the same round, lead seconds ahead); if the ghost would see you and Reggie can't yet, call it */
function lookoutTick(M,dt){const lk=M.cr.lookout,P=A().P;if(lk){lk.mode='stand';lk.moving=false;face(lk,236,148,dt,2);posePerson(lk,dt)}
  if(!M.S||!M.rg||M.rg.tied||M.loud||!M.inside)return;const lead=K.lead[st(M,'lookout')-1];const G2=M.ghost2;
  /* re-sync the ghost onto Reggie's round (cheap: re-run it forward from his state when he's on the round) */
  if(M.rg.mode2!=='route'){M.warnCool=Math.max(M.warnCool||0,1);return}
  G2.pos.x=M.rg.pos.x;G2.pos.z=M.rg.pos.z;G2.yaw=M.rg.yaw;G2.k=M.rg.k;G2.t=M.rg.t;for(let s=0;s<lead;s+=.25)roundStep(G2,.25,false);
  const pl=M.pl,dx=pl.x-G2.pos.x,dz=pl.z-G2.pos.z,d=hyp(dx,dz);let would=false;
  if(!pl.hidden&&d<15){const df=Math.abs(wrap(cyaw(dx,dz)-G2.yaw));if(df<.95&&!M.S.blocked(G2.pos.x,G2.pos.z,1.65,pl.x,pl.z,pl.stance==='crouch'?.9:1.45))would=true}
  M.warnCool=Math.max(0,(M.warnCool||0)-dt);
  if(would&&M.rg.ob.v<=0&&!M.warned&&M.warnCool<=0){M.warned=true;M.warnCool=6;M.nWarn=(M.nWarn||0)+1;
    if(roleOf(M,'lookout')==='dave'&&!M.said.sandwich){M.said.sandwich=1;M.q.push({t:lead+1,w:'dave',x:L.lookoutMiss[1]});return}
    const who=roleOf(M,'lookout'),txt=pickN(L.lookoutWarn,M.nWarn-1).replace('{G}','Reggie');
    if(M.gear.walkies){say(M,who,txt,{front:true});tone({f:1400,type:'square',d:.05,gain:.03,bus:'ui'});tone({f:1100,type:'square',d:.05,gain:.03,at:.07,bus:'ui'})}
    else{const Ph=PH();M.q.push({t:K.textLag,fn:()=>{if(Ph&&Ph.notify)Ph.notify(DADNAME[who],pickN(L.textWarn,M.nWarn-1),{color:'linear-gradient(#8fd18a,#3b8a3f)'});tone({f:1800,type:'sine',d:.06,gain:.04,bus:'ui'})}})}}
  if(!would&&M.warned&&M.warnCool<3){M.warned=false;if(M.gear.walkies&&Math.random()<.5)say(M,roleOf(M,'lookout'),pick(L.allClear))}}
/* the distraction: on the intercom at the gate keeping Dwayne off his monitors */
function distractTick(M,dt){const p=M.cr.distraction;if(!p)return;const app=M.app;
  if(p.st==='wait'){p.mode='stand';face(p,S_.keypad.x,S_.keypad.z,dt,2);if((M.inside&&app==='quiet')||(app==='bluff'&&M.bluffWon)){p.st='go'}}
  else if(p.st==='go'){const tgt=app==='bluff'?{x:S_.office.door.x+.8,z:S_.office.door.z-1.4}:{x:S_.keypad.x-.5,z:S_.keypad.z+.3};if(walk(p,tgt.x,tgt.z,1.4,dt)){p.st='talk';M.busy=K.busy[st(M,'distraction')-1];M.busy0=M.busy;
      seq(M,L.distract[roleOf(M,'distraction')]||[],2.6,{front:true});feed('Dwayne is busy','trust','Cameras unwatched for about '+M.busy+' s')}}
  else if(p.st==='talk'){p.mode='stand';face(p,app==='bluff'?S_.office.door.x:S_.keypad.x,app==='bluff'?S_.office.door.z:S_.keypad.z+.1,dt,3);M.busy-=dt;p.talkT=(p.talkT||0)+dt;
    if(M.busy<=0){p.st='done';say(M,roleOf(M,'distraction'),L.distractEnd[roleOf(M,'distraction')]||'Okay, I\'m done.');if(app==='quiet')say(M,L.monitors[0],L.monitors[1],{t:2.5,front:true});feed('Dwayne is back on the monitors','bad')}}
  else{p.mode='stand';face(p,236,148,dt,2)}
  p.moving=p.st==='go';posePerson(p,dt)}
/* ---------------- the truck: the driver backs it down the aisle to the unit ---------------- */
const TRUCK_PATH=[{x:203.2,z:137.6},{x:203.3,z:142.6},{x:204.6,z:146.2},{x:207.6,z:147.9},{x:216,z:148},{x:S_.truckIn.x,z:S_.truckIn.z}];
function placeTruckIn(M){const e=M.truck;e.pos.set(S_.truckIn.x,0,S_.truckIn.z);e.yaw=gyaw(-1,0);A().syncCar(e);updTruckOcc(M);M.truckIn=true}
function updTruckOcc(M){if(!M.truckOcc)return;const e=M.truck,S=A().carSize(e),a=Math.abs(Math.sin(e.yaw)),b=Math.abs(Math.cos(e.yaw)),hx=a*S.l/2+b*S.w/2,hz=b*S.l/2+a*S.w/2;Object.assign(M.truckOcc,{x0:e.pos.x-hx,x1:e.pos.x+hx,z0:e.pos.z-hz,z1:e.pos.z+hz})}
function truckTick(M,dt){const a=A(),e=M.truck;if(!e||M.truckIn||!M.truckGo)return;const drv=roleOf(M,'driver'),sp=M.app==='loud'||M.loud?4.6:K.reverse[st(M,'driver')-1];
  const T=M.tp||(M.tp={k:1,s:0});const p=TRUCK_PATH[T.k],dx=p.x-e.pos.x,dz=p.z-e.pos.z,l=hyp(dx,dz);
  if(l<.3){T.k++;if(T.k>=TRUCK_PATH.length){placeTruckIn(M);vehUpd(e.obj,{speed:0,steer:0,braking:true,headlights:false,dt});say(M,L.truckIn[0],L.truckIn[1]);if(M.cr.lifter)M.cr.lifter.st='go';return}}
  else{const m=Math.min(l,sp*dt);e.pos.x+=dx/l*m;e.pos.z+=dz/l*m;const want=gyaw(-dx,-dz);/* reversing: the nose points away from where it's going */e.yaw+=wrap(want-e.yaw)*Math.min(1,dt*(drv==='doug'?2.2:4));
    if(drv==='doug')e.yaw+=Math.sin(M.t*3)*.006;a.syncCar(e);updTruckOcc(M);vehUpd(e.obj,{speed:-sp,steer:0,braking:false,headlights:drv!=='rick'&&M.app!=='bluff',reverse:true,dt})}
  /* knock the gate down on the way in when it's loud and the gate's shut */
  if((M.app==='loud'||M.loud)&&M.gateK<.5&&!M.gateSmashed&&hyp(e.pos.x-S_.gate.x,e.pos.z-S_.gate.z)<4){smashGate(M);tone({f:90,to:40,type:'square',d:.4,gain:.12});tone({f:400,to:120,type:'sawtooth',d:.3,gain:.06});feed('Through the gate','bad')}
  /* Gary's beeper */
  if(drv==='gary'&&!M.loud&&M.app!=='loud'){M.beepT=(M.beepT||0)-dt;if(M.beepT<=0){M.beepT=K.beep.every;tone({f:1150,type:'square',d:.18,gain:.035});if(M.S){M.S.noise({x:e.pos.x,z:e.pos.z,r:K.beep.r,kind:'beep'});if(M.viz)M.viz.ring(e.pos.x,e.pos.z,K.beep.r,[1,.7,.3])}
      if(!M.said.beep){M.said.beep=1;say(M,L.beep[0],L.beep[1],{front:true});say(M,L.beepG[0],L.beepG[1],{t:2})}}}
  if(drv==='doug'&&!M.said.drift){M.said.drift=1;say(M,L.drift[0],L.drift[1])}if(drv==='rick'&&!M.said.quietIn){M.said.quietIn=1;say(M,L.quietIn[0],L.quietIn[1])}}
/* ---------------- carrying: you, and the lifter ---------------- */
function carryCap(M){return M.gear.dolly?2:1}
function pickUp(M,t){const a=A(),P=a.P;if(t.state!=='pile')return;if(t.def.heavy&&!M.gear.dolly){say(M,'you',L.heavy);return}
  t.state='you';M.carrying=(M.carrying||[]).concat([t]);t.mesh.visible=true;restack(M);tone({f:300,to:420,type:'triangle',d:.08,gain:.04});
  if(!M.said['own_'+t.def.id]&&Math.random()<.5){M.said['own_'+t.def.id]=1;say(M,'you',t.def.owner.replace(/^the /,'The ')+"'s "+t.def.label.toLowerCase()+'.')}}
/* the carried things ride in front of you (on the hand truck, two stack) */
function restack(M){const a=A(),P=a.P,c=M.carrying||[];let y=.75;for(const t of c){const m=t.mesh;if(m.parent!==P.dude.root){if(m.parent)m.parent.remove(m);P.dude.root.add(m)}m.position.set(0,M.gear.dolly?y-.45:y,.5);m.rotation.set(0,Math.PI/2,0);m.scale.setScalar(t.def.kind==='kayak'?.85:1);y+=t.def.heavy?.55:.42}
  if(M.gear.dolly&&c.length){if(!M.vis.dolly){M.vis.dolly=dollyMesh(M)}if(M.vis.dolly.parent!==P.dude.root)P.dude.root.add(M.vis.dolly);M.vis.dolly.visible=true}else if(M.vis.dolly)M.vis.dolly.visible=false}
function dollyMesh(M){const T3=A().THREE,g=new T3.Group(),m=mats(M);for(const x of[-.22,.22])part(M,g,'box',m.red,x,.65,.62,.04,1.25,.04,-.18,0,0);part(M,g,'box',m.steel,0,.06,.82,.5,.03,.24);for(const x of[-.27,.27])part(M,g,'cyl',m.rubber,x,.12,.64,.12,.07,.12,0,0,Math.PI/2);part(M,g,'cyl',m.black,0,1.25,.48,.025,.5,.025,0,0,Math.PI/2);return g}
function loadAll(M,who){const c=M.carrying||[];if(!c.length)return;const a=A();for(const t of c){t.state='loaded';if(t.mesh.parent)t.mesh.parent.remove(t.mesh);t.mesh.visible=false;M.loaded++;(M.loadedIds||(M.loadedIds=[])).push(t.def.id)}
  M.carrying=[];restack(M);const n=M.loaded;tone({f:180,to:120,type:'square',d:.12,gain:.05});if(M.S&&!M.loud){const r=M.gear.blankets?K.noise.loadB:K.noise.load,R=truckRear(M);M.S.noise({x:R.x,z:R.z,r,kind:'load'});if(M.viz)M.viz.ring(R.x,R.z,r)}
  loadedFx(M,n)}
function loadedFx(M,n){feed('Loaded '+n+'/12','trust',(M.loadedIds||[]).slice(-1).map(id=>{const d=ITEMS.find(x=>x.id===id);return d.owner+"'s "+d.label.toLowerCase()})[0]);
  if(n===K.minLoad&&n<12&&!M.said.enough){M.said.enough=1;say(M,L.enough[0],L.enough[1],{front:true})}if(n>=12&&!M.said.all){M.said.all=1;say(M,L.all[0],L.all[1],{front:true})}}
function lifterTick(M,dt){const p=M.cr.lifter;if(!p)return;const who=roleOf(M,'lifter'),k=st(M,'lifter'),sp=K.lift.speed[k-1];
  if(p.st==='wait'){p.mode='stand';face(p,S_.gate.x,S_.gate.z,dt,2);p.moving=false;posePerson(p,dt);return}
  if(p.strain>0){p.strain-=dt;p.mode='kneel';p.moving=false;posePerson(p,dt);return}
  const R=truckRear(M),U={x:S_.u47.x-.4,z:S_.u47.front.z-.9};
  if(p.st==='go'){if(M.lock!=='cut'){/* waits by the truck until the unit is open */if(walk(p,R.x-.6,R.z-1.2,1.4,dt)){p.moving=false;face(p,U.x,U.z,dt,2)}}else if(walk(p,U.x,U.z,sp,dt))p.st='pick'}
  else if(p.st==='pick'){p.moving=false;p.wt=(p.wt||0)+dt;if(p.wt<K.lift.pause[k-1]*.5){posePerson(p,dt);return}p.wt=0;
    /* the heavy things first (that's what the lifter is for), then the nearest */
    const left=M.it.filter(t=>t.state==='pile').sort((a,b)=>(b.def.heavy?1:0)-(a.def.heavy?1:0));if(!left.length){p.st='done';return}
    const n=Math.min(K.lift.carry[k-1],left[0].def.heavy?1:K.lift.carry[k-1]);p.load=left.slice(0,n).filter((t,i)=>i===0||!t.def.heavy);for(const t of p.load){t.state='lifter';t.mesh.visible=true}
    const g=new (A().THREE).Group();p.load.forEach((t,i)=>{if(t.mesh.parent)t.mesh.parent.remove(t.mesh);t.mesh.position.set(0,i*.45,0);t.mesh.rotation.set(0,0,0);g.add(t.mesh)});hand(M,p,g);p.st='carry';
    if(Math.random()<.45)say(M,who,pick(L.liftLine[who]||['Got it.']))}
  else if(p.st==='carry'){if(walk(p,R.x,R.z-.3,sp*.9,dt)){p.st='drop';p.wt=0}}
  else if(p.st==='drop'){p.moving=false;p.wt+=dt;if(p.wt>K.lift.pause[k-1]*.5){for(const t of p.load){t.state='loaded';if(t.mesh.parent)t.mesh.parent.remove(t.mesh);t.mesh.visible=false;M.loaded++;(M.loadedIds||(M.loadedIds=[])).push(t.def.id);(M.byLifter=(M.byLifter||0)+1)}
      const g=p.carry;hand(M,p,null);p.load=null;loadedFx(M,M.loaded);if(M.S&&!M.loud){const r=M.gear.blankets?K.noise.loadB:K.noise.load;M.S.noise({x:R.x,z:R.z,r,kind:'load'})}
      p.trips=(p.trips||0)+1;if(who==='gary'&&p.trips===2&&!M.said.strain){M.said.strain=1;p.strain=K.lift.strain;seq(M,L.strain,2)}p.st='go'}}
  else if(p.st==='done'){p.moving=false;face(p,R.x,R.z,dt,2)}
  p.mode='stand';posePerson(p,dt)}
/* ---------------- escalation: spotted -> a fight (the clean bonus is gone) ---------------- */
function escalate(M,why){const a=A();if(M.loud)return;M.alarmWhy=why;
  if(why==='reggie')say(M,L.spotted[0],L.spotted[1],{front:true});else if(why==='camera')say(M,L.camSpot[0],L.camSpot[1],{front:true});else if(why==='bluff')seq(M,L.bluffLose,1.8,{front:true});
  try{a.spotted(why==='camera'?'Dwayne saw you on camera':why==='bluff'?'Dwayne called Vince':'Reggie saw you')}catch(_){}goLoud(M,why)}
function goLoud(M,why){const a=A();if(M.loud)return;M.loud=true;M.ghost=false;M.noGuns=false;M.hide=null;
  if(M.S){try{M.S.release()}catch(_){}try{M.S2.release()}catch(_){}try{if(M.viz)M.viz.dispose()}catch(_){}try{if(M.hud)M.hud.dispose()}catch(_){}M.viz=M.hud=null}
  if(M.board)try{M.board.close(true)}catch(_){}if(M.ch){try{M.ch.close()}catch(_){}M.ch=null}
  const n=why==='planned'?[4,3,2][st(M,'distraction')-1]:why==='bluff'?3:2;M.enemies=[];
  const spots=[{x:M.rg?M.rg.pos.x:238,z:M.rg?M.rg.pos.z:148},{x:S_.office.door.x+1,z:S_.office.door.z-1.4},{x:247,z:140.2},{x:230,z:140.2}];
  if(M.rg&&!M.rg.tied)M.rg.d.root.visible=false;
  for(let i=0;i<n;i++){const s=why==='bluff'?{x:206+i*1.2,z:144+i}:spots[i%spots.length];try{const e=a.spawnEnemy(s.x,s.z);if(e){e.loud=1;e.noLeash=true;M.enemies.push(e)}}catch(err){console.warn('[heist] spawn',err)}}
  try{a.rebuildTargets()}catch(_){}
  M.cousins=K.alarm.cousins;if(why!=='planned')say(M,L.loudGo[0],L.loudGo[1],{t:2,front:true});
  if(!M.truckGo){M.truckGo=true;if(why!=='planned')say(M,L.truckCall[0],L.truckCall[1],{t:3})}
  if(M.cr.lifter&&M.cr.lifter.st==='wait')M.cr.lifter.st='go';if(M.gateK<1&&why!=='planned'){/* the driver doesn't wait for the button */}
  try{music('combat',.9)}catch(_){}}
function alarmTick(M,dt){if(!M.loud)return;M.alarmT=(M.alarmT||0)-dt;if(M.alarmT<=0){M.alarmT=1.1;const P=A().P,d=hyp(P.pos.x-238,P.pos.z-146),v=.05*clamp(1-d/90,.15,1);tone({f:880,to:660,type:'square',d:.45,gain:v});tone({f:660,to:880,type:'square',d:.45,gain:v,at:.5})}
  if(M.cousins>0){M.cousins-=dt;if(M.cousins<=0){say(M,L.cousins[0],L.cousins[1],{front:true});const a=A();for(let i=0;i<2;i++){try{const e=a.spawnEnemy(205+i*1.5,141+i*1.2);if(e){e.loud=1;e.noLeash=true;M.enemies.push(e)}}catch(_){}}try{a.rebuildTargets()}catch(_){}}}}
/* ---------------- the bluff: Dwayne at closing time (HT.Social's conversation engine, the HUD's choice strip) ---------------- */
const BLUFF=[
  {prompt:"We close in five. What do you need?",mood:'bored',options:[
    {reg:'joke',text:"My brother-in-law's moving out. I'm the muscle. Don't laugh. ...You can laugh a little.",reply:{hit:"(snorts) ...Okay. That's a little funny.",miss:"Mm."}},
    {reg:'real',text:"Helping a buddy move out of forty-seven. He's having a rough year.",reply:"Everybody's having a rough year."},
    {reg:'over',text:"Honestly? My doctor says I need a hobby. I've chosen moving. Other people's stuff. It's going great.",reply:"...That's a weird hobby, man."}]},
  {prompt:"Forty-seven? That's Vince's unit.",mood:'defensive',options:[
    {reg:'real',text:"Vince said it's fine. Me and Vince go way back. To Tuesday.",reply:"Vince doesn't say anything's fine."},
    {reg:'joke',text:"Which Vince? Big Vince? Little Vince? I know a lot of Vinces.",reply:"There's one Vince. Trust me."},
    {reg:'over',text:"Between us? I've never met Vince. I'm doing this for my friend Gary, and Gary cried at a spreadsheet this week. I just want Gary to be okay.",reply:{hit:"...Aw, man. Spreadsheets'll do that.",miss:"Who's Gary?"}}]},
  {prompt:"Vince doesn't like people touching his stuff. Vince doesn't like people.",mood:'scared',options:[
    {reg:'real',text:"Nobody's in trouble, Dwayne. One load. You're home by eight. You didn't see a thing.",reply:"...Home by eight. I'd like that."},
    {reg:'joke',text:"Then he'll hate me. Everybody does at first. Then they warm up. Like a minivan in winter.",reply:"That's not how minivans work."},
    {reg:'comp',text:"You seem like the only guy here who actually does his job.",reply:"I am. I really am. Nobody notices."}]},
  {prompt:"...You've got a truck?",mood:'friendly',options:[
    {reg:'real',text:"Ron's truck. Blankets, hand truck, the works. In and out.",gear:true,reply:{hit:"...Blankets. Okay. You look like movers. Sort of."}},
    {reg:'comp',text:"You run a tight ship, Dwayne. We'll leave it cleaner than we found it.",reply:"It's not a ship. But thanks."},
    {reg:'joke',text:"It beeps when it reverses. That's how you know it's professional.",reply:"(laughs) ...Okay, okay."}]}];
function bluffStart(M){const a=A(),So=window.HT&&HT.Social,H=a.HUD;if(M.ch||M.bluffDone)return;M.bluffOn=true;M.bluffR=0;
  const rounds=BLUFF.map(r=>({prompt:r.prompt,options:r.options.map(o=>Object.assign({},o,o.gear?{custom:(C,s)=>({dr:s.dr+((M.gear.blankets||M.gear.dolly)?10:-4)})}:{}))}));
  M.cv=So&&So.convo?So.convo({npc:'dwayne',name:'Dwayne',mood:'bored',win:999,lose:100,rounds,seed:47}):null;
  say(M,L.bluffHi[0],L.bluffHi[1],{front:true});M.chT=1.2}
function bluffRound(M){const a=A(),H=a.HUD,C=M.cv,R=BLUFF[M.bluffR];if(!R||!C)return bluffEnd(M);C.st.mood=R.mood;const opts=C.options();const tell=C.tell?C.tell():null;
  const o={speaker:'Dwayne',prompt:R.prompt,tell:tell?tell.replace(/\{n(ame)?\}/g,'Dwayne').replace(/^\[|\]$/g,''):null,options:opts.map(x=>({text:x.text,reg:x.reg})),onPick:(i)=>bluffPick(M,i)};
  if(M.ch)M.ch.set(o);else{M.ch=H.kit.choices(o);a.overlay('bluff',M.ch.el)}}
function bluffPick(M,i){const C=M.cv;if(!C||M.chWait)return;const res=C.pick(i);if(!res)return;M.chWait=true;const l=res.line;say(M,'you',l.text);
  if(res.reply)say(M,'Dwayne',res.reply,{t:Math.min(3.2,1.2+l.text.length*.03)});tone({f:res.hit==='miss'?220:660,to:res.hit==='miss'?160:880,type:'triangle',d:.12,gain:.04,bus:'ui'});
  M.bluffR++;M.chT=Math.min(4.2,1.8+l.text.length*.03+(res.reply?res.reply.length*.025:0))}
function bluffEnd(M){const a=A(),C=M.cv;if(M.ch){try{M.ch.close()}catch(_){}M.ch=null;try{a.overlay('bluff',null)}catch(_){}}M.bluffOn=false;M.bluffDone=true;
  const won=C&&C.st.rapport>=K.bluff.win&&C.st.awkward<100;if(won){M.bluffWon=true;seq(M,L.bluffWin,2.2,{front:true});M.truckGo=true;M.dw.st='office';feed('Dwayne buys it','trust','Rapport '+Math.round(C.st.rapport))}
  else escalate(M,'bluff')}
function bluffTick(M,F,dt){const a=A(),P=a.P,dw=M.dw;
  if(M.bluffOn){if(M.chT>0){M.chT-=dt;if(M.chT<=0){M.chWait=false;if(M.bluffR>=BLUFF.length)bluffEnd(M);else bluffRound(M)}}
    F.objs.push(['Talk your way in · keys 1-3 (read his mood: the line in brackets)',false]);const C=M.cv;
    if(C){F.meters.push({id:'rap',label:'Rapport',v:C.st.rapport,max:100,style:'bar',marker:K.bluff.win/100,icon:'chat'});F.meters.push({id:'awk',label:'Awkward',v:C.st.awkward,max:100,style:'bar',warn:.7})}
    face(dw,P.pos.x,P.pos.z,dt,4);dw.mode='stand';dw.moving=false;posePerson(dw,dt);return true}
  if(!M.bluffDone){/* walk up to Dwayne at his door */const d=hyp(P.pos.x-dw.pos.x,P.pos.z-dw.pos.z);if(d<8)face(dw,P.pos.x,P.pos.z,dt,3);dw.mode='stand';dw.moving=false;posePerson(dw,dt);
    F.objs.push(['Walk in the gate and talk to Dwayne at the office door',false]);F.target={x:dw.pos.x,z:dw.pos.z-1.6,label:'Dwayne'};
    F.taps.push({x:dw.pos.x,z:dw.pos.z,r:2.6,txt:'Talk to Dwayne',fn:()=>bluffStart(M)});return true}
  /* after: Dwayne goes back in; when the distraction runs out he comes out to watch, and starts to wonder */
  if(M.bluffWon&&!M.loud){if(M.dw.st==='office'){if(walk(dw,S_.office.door.x,S_.office.door.z+.2,1.2,dt)){dw.d.root.visible=false;dw.st='inside'}}
    else if(dw.st==='inside'){if(M.busy0&&M.busy<=0){dw.st='out';dw.d.root.visible=true;dw.pos.x=S_.office.door.x;dw.pos.z=S_.office.door.z-1}}
    else if(dw.st==='out'){if(walk(dw,241,147.4,1.0,dt)){dw.st='watch';say(M,L.bluffSee[0],L.bluffSee[1])}}
    else if(dw.st==='watch'){face(dw,256,148.5,dt,2);dw.moving=false;
      const see=(who,carry,blank)=>{if(!carry)return 0;const dx=who.x-dw.pos.x,dz=who.z-dw.pos.z,d=hyp(dx,dz);if(d>22)return 0;return(M.gear.blankets?K.bluff.susB:K.bluff.sus)*(d<10?1.4:1)};
      const r=see(P.pos,(M.carrying||[]).length)+(M.cr.lifter&&M.cr.lifter.st==='carry'?see(M.cr.lifter.pos,1)*.6:0);M.sus=clamp((M.sus||0)+(r>0?r:-.05)*dt,0,1);
      if(M.sus>.5&&!M.said.bsus){M.said.bsus=1;say(M,'Dwayne',"Huh. That's a nice grill. Whose grill is that?",{front:true})}
      if(M.sus>=1){say(M,L.bluffSus[0],L.bluffSus[1],{front:true});escalate(M,'bluff')}}
    dw.mode='stand';posePerson(dw,dt);
    if(dw.st==='watch'||dw.st==='out')F.meters.push({id:'sus',label:'Dwayne',v:M.sus||0,max:1,style:'ring',icon:'eye',sub:M.gear.blankets?'Blankets help':'Watching'})}
  return false}
/* ---------------- the job, every frame ---------------- */
const HIDE_R=1.3;
function jobTick(M,F,dt){const a=A(),P=a.P,app=M.app,quiet=app==='quiet'&&!M.loud;M.t+=dt;
  if(!M.loud&&app!=='loud'){M.clock-=dt;if(M.clock<=180&&!M.said.c3){M.said.c3=1;say(M,L.clock3[0],L.clock3[1],{front:true})}if(M.clock<=60&&!M.said.c1){M.said.c1=1;say(M,L.clock1[0],L.clock1[1],{front:true})}
    if(M.clock<=0)return a.endMission(false,L.clockFail,'Shift change.')}
  /* inside the fence yet? (the distraction starts when you are) */
  if(!M.inside&&P.pos.x>209.4&&P.pos.x<271&&P.pos.z>132&&P.pos.z<156){M.inside=true}
  if(app==='bluff'&&bluffTick(M,F,dt))return crewTicks(M,dt);
  /* hiding in the unit */
  if(M.hide){P.pos.set(S_.u47.front.x,0,S_.u47.front.z+.35);if(P.dude)P.dude.root.visible=false;setDoor(M,.62);
    F.taps.push({d:0,r:2,txt:L.hideOut,fn:()=>{M.hide=null;setDoor(M,1);if(P.dude)P.dude.root.visible=true;P.pos.set(S_.u47.front.x,0,S_.u47.front.z-.6);tone({f:240,to:330,type:'square',d:.25,gain:.025})}});
    F.objs.push(['Hidden in unit 47. Wait for the all clear, then step out (E)',true]);}
  else if(quiet&&M.lock==='cut'&&!(M.carrying||[]).length&&hyp(P.pos.x-S_.u47.front.x,P.pos.z-S_.u47.front.z)<HIDE_R)
    F.holds.push({x:S_.u47.front.x,z:S_.u47.front.z,r:HIDE_R,o:M.hdO||(M.hdO={}),time:K.hold.hide,txt:L.hideIn,fn:()=>{M.hide='unit';(M.carrying||[]).length||0;tone({f:330,to:200,type:'square',d:.3,gain:.025})}});
  if(quiet){M.pl=playerSt(M);M.S.tick(dt,M.pl);M.S2.tick(dt,M.pl);
    if(!watched(M))for(const ses of[M.S,M.S2])for(const b of ses.obs)if(b.kind==='camera'&&b.sus>.55)b.sus=.55;
    reggieTick(M,dt);lookoutTick(M,dt)}else{lookoutTick(M,dt);if(M.rg&&!M.loud&&app!=='bluff')reggieTick(M,dt)}
  crewTicks(M,dt);truckTick(M,dt);alarmTick(M,dt);
  if(M.loud&&M.rg)M.rg.d.root.visible=false;
  /* ---- getting in ---- */
  const outside=!M.inside;const gateShut=M.gateK<.6&&!M.gateSmashed;
  if(app==='quiet'&&gateShut){
    if(M.tags.keypad&&hyp(P.pos.x-S_.keypad.x,P.pos.z-S_.keypad.z)<1.6)F.holds.push({x:S_.keypad.x,z:S_.keypad.z,r:1.6,o:M.kpO||(M.kpO={}),time:K.hold.code,txt:'Punch in the gate code (7-4-1)',fn:()=>openGate(M,'code')});
    if(M.gear.ladder&&!M.ladderUp&&hyp(P.pos.x-S_.ladder.out.x,P.pos.z-S_.ladder.out.z)<1.7)F.holds.push({x:S_.ladder.out.x,z:S_.ladder.out.z,r:1.7,o:M.lgO||(M.lgO={}),time:K.hold.ladder,txt:"Set up Linda's ladder and climb the fence",fn:()=>climb(M,true)});
    if(M.ladderUp&&!(M.carrying||[]).length){for(const[from,to]of[[S_.ladder.out,true],[S_.ladder.in,false]])if(hyp(P.pos.x-from.x,P.pos.z-from.z)<1.5)F.holds.push({x:from.x,z:from.z,r:1.5,o:M.lcO||(M.lcO={}),time:.8,txt:'Climb the ladder',fn:()=>climb(M,to)})}
    if(M.inside&&hyp(P.pos.x-S_.gateBox.x,P.pos.z-S_.gateBox.z)<1.5)F.holds.push({x:S_.gateBox.x,z:S_.gateBox.z,r:1.5,o:M.gbO||(M.gbO={}),time:K.hold.gateIn,txt:'Press the gate button (inside)',fn:()=>openGate(M,'button')})}
  /* ---- the padlock and the door ---- */
  if(M.lock!=='cut'&&M.inside&&hyp(P.pos.x-S_.u47.front.x,P.pos.z-S_.u47.front.z)<1.6)F.holds.push({x:S_.u47.front.x,z:S_.u47.front.z,r:1.6,o:M.lkO||(M.lkO={}),time:K.hold.lock,txt:M.gear.blankets?'Cut the padlock (muffled in a moving blanket)':'Cut the padlock',fn:()=>cutLock(M)});
  if(M.lkO&&M.lkO.prog>0&&quiet){M.lkT=(M.lkT||0)-dt;if(M.lkT<=0){M.lkT=.6;const r=M.gear.blankets?K.noise.lockB:K.noise.lock;M.S.noise({x:S_.u47.front.x,z:S_.u47.front.z,r,kind:'lock'});if(M.viz)M.viz.ring(S_.u47.front.x,S_.u47.front.z,r);tone({f:520,to:380,type:'square',d:.06,gain:.03})}}
  if(M.doorT!=null){M.doorT+=dt;const k=clamp(M.doorT/1.4,0,1);setDoor(M,k);if(k>=1){M.doorT=null;M.door=1;for(const t of M.it)if(t.state==='pile')t.mesh.visible=true;seq(M,L.doorUp,2.6);if(!M.truckGo&&(M.gateK>=.6||M.gateSmashed||app==='bluff')){M.truckGo=true;say(M,L.truckCall[0],L.truckCall[1],{t:5})}}}
  /* the gate's open after the door: the truck comes as soon as it can */
  if(M.lock==='cut'&&!M.truckGo&&(M.gateK>=.6||M.gateSmashed||app==='bluff'||M.loud)){M.truckGo=true;say(M,L.truckCall[0],L.truckCall[1])}
  /* ---- the things: pick up at the pile, load at the back of the truck ---- */
  const carrying=(M.carrying||[]).length,cap=carryCap(M);
  if(!M.hide&&M.lock==='cut'&&M.door>=1&&carrying<cap){let best=null,bd=1.5;for(const t of M.it){if(t.state!=='pile')continue;if(carrying&&(t.def.heavy||M.carrying[0].def.heavy))continue;const d=hyp(P.pos.x-t.x,P.pos.z-t.z);if(d<bd){bd=d;best=t}}
    if(best)F.holds.push({x:best.x,z:best.z,r:1.5,o:best.o,time:K.hold.pick,txt:'Pick up: '+best.def.owner.replace(/^the /,'the ')+"'s "+best.def.label.toLowerCase()+(best.def.heavy&&!M.gear.dolly?' (too heavy alone)':''),fn:()=>pickUp(M,best)})}
  if(carrying){if(M.truckIn){const R=truckRear(M);F.taps.push({x:R.x,z:R.z,r:2.3,txt:'Load it into the truck',fn:()=>loadAll(M)})}slow(M,M.gear.dolly?K.dollyMul:K.carryMul);P.crouch=false}else M.prevP=null;
  /* ---- Reggie, up close: a silent zip-tie from behind ---- */
  if(quiet&&M.rg&&!M.rg.tied&&!carrying&&M.S.canTakedown(M.rg.ob,M.pl))F.holds.push({x:M.rg.pos.x,z:M.rg.pos.z,r:1.4,o:M.tieO||(M.tieO={}),time:2,txt:'Zip-tie Reggie from behind',fn:()=>tieReggie(M)});
  /* the laser pointer (Doug's fanny pack): fire to make Reggie look somewhere else */
  M.item=quiet&&M.gear.pack&&!carrying&&M.laser>0?'heist_laser':null;
  /* ---- leaving: the truck's cab ---- */
  if(M.truckIn&&M.loaded>=K.minLoad&&!carrying){const c=truckCab(M);F.taps.push({x:c.x,z:c.z,r:2.6,txt:"Get in Ron's truck and drive ("+M.loaded+'/12 loaded)',fn:()=>getaway(M)})}
  else if(M.truckIn&&M.loaded<K.minLoad&&!carrying&&hyp(P.pos.x-truckCab(M).x,P.pos.z-truckCab(M).z)<2.2)F.prompt='Load at least '+K.minLoad+' things first';
  /* ---- objectives and the marker ---- */
  objectives(M,F)}
function crewTicks(M,dt){if(!M.cr)return;distractTick(M,dt);lifterTick(M,dt);if(M.app!=='quiet'||M.loud){const lk=M.cr.lookout;if(lk&&!M.S){lk.mode='stand';lk.moving=false;face(lk,236,148,dt,2);posePerson(lk,dt)}}
  if(M.dw&&M.app!=='bluff'){M.dw.d.root.visible=false}}
function openGate(M,how){if(M.gateOpening)return;M.gateOpening=0.001;M.gateHow=how;if(how==='code'){seq(M,L.codeOk,1.6);for(let i=0;i<3;i++)tone({f:[1320,990,1180][i],type:'square',d:.08,gain:.03,at:i*.18,bus:'ui'});if(M.S)M.S.noise({x:S_.keypad.x,z:S_.keypad.z,r:K.noise.code,kind:'beep'})}
  else say(M,L.gateIn[0],L.gateIn[1]);if(M.S)M.S.noise({x:S_.gate.x,z:S_.gate.z,r:K.noise.motor,kind:'motor'});if(M.viz)M.viz.ring(S_.gate.x,S_.gate.z,K.noise.motor)}
function gateTick(M,dt){if(M.gateOpening){M.gateOpening+=dt;const k=clamp(M.gateOpening/4,0,1);setGate(M,k);tone&&(M.gmT=(M.gmT||0)-dt);if(M.gmT<=0){M.gmT=.35;tone({f:70,type:'sawtooth',d:.3,gain:.018})}if(k>=1){M.gateOpening=0;M.gateOpen=true}}}
function climb(M,inward){const a=A(),P=a.P;if(!M.ladderUp){M.ladderUp=true;say(M,L.overFence[0],L.overFence[1]);const l=ladderMesh(M,4.3);l.rotation.set(-1.1,Math.PI/2,0);l.position.set(208.2,1.6,141.2);a.wmAdd(l);M.vis.fenceLadder=l;
    if(M.S){M.S.noise({x:208,z:141.2,r:2.5,kind:'rattle'})}tone({f:260,to:200,type:'square',d:.15,gain:.03})}
  const to=inward?S_.ladder.in:S_.ladder.out;P.pos.set(to.x,0,to.z);a.collide(P.pos,.35);if(inward)M.inside=true}
function cutLock(M){M.lock='cut';M.doorT=0;feed(L.lockCut,'trust');tone({f:200,to:90,type:'square',d:.2,gain:.06});if(M.S&&!M.loud){const r=M.gear.blankets?K.noise.doorB:K.noise.door;M.S.noise({x:S_.u47.front.x,z:S_.u47.front.z,r,kind:'door'});if(M.viz)M.viz.ring(S_.u47.front.x,S_.u47.front.z,r)}
  for(let i=0;i<5;i++)tone({f:180+i*25,type:'square',d:.08,gain:.025,at:i*.25})}
function tieReggie(M){const a=A(),g=M.rg;g.tied=true;M.S.takedown(g.ob);M.ties=(M.ties||0)+1;try{a.addTrust(3,'maple')}catch(_){}try{a.snd&&a.snd('cuff')}catch(_){}
  say(M,'Reggie',"Oh, come ON. This is my second job.",{front:true});say(M,'you',"Very assertive cable management. Somebody'll be by in the morning.",{t:2.2});feed('Reggie zip-tied','trust','+3 trust')}
J.item('heist_laser',{name:'Laser pointer',use(M){if(!M||!M.S||M.loud||M.laser<=0)return;const a=A(),T3=a.THREE,C=a.camera,P=a.P;const dir=new T3.Vector3(0,0,-1).applyQuaternion(C.quaternion);let t=14;if(dir.y<-.03)t=Math.min(26,(C.position.y-.05)/-dir.y);
  const x=C.position.x+dir.x*t,z=C.position.z+dir.z*t;M.laser--;if(M.rg&&!M.rg.tied&&hyp(x-M.rg.pos.x,z-M.rg.pos.z)<24){M.rg.lure={x,z};M.rg.mode2='lured';M.rg.lookT=0;M.S.poke(M.rg.ob,x,z,.4,'laser')}
  laserDot(M,x,z);if(!M.said.laser){M.said.laser=1;say(M,'Reggie',"...Is that a laser? Who has a laser?")}feed('Laser pointer · '+M.laser+' left','info')}});
function laserDot(M,x,z){const a=A(),T3=a.THREE;if(!M.vis.dot){M.vis.dot=new T3.Mesh(own(M,new T3.CircleGeometry(.07,12)),own(M,new T3.MeshBasicMaterial({color:new T3.Color(3,.1,.1),toneMapped:false,transparent:true,depthWrite:false})));M.vis.dot.rotation.x=-Math.PI/2;a.wmAdd(M.vis.dot)}
  M.vis.dot.position.set(x,.03,z);M.vis.dot.visible=true;M.dotT=3}
function objectives(M,F){const a=A(),P=a.P,app=M.app,quiet=app==='quiet'&&!M.loud,carrying=(M.carrying||[]).length;let tgt=null;
  const gateShut=M.gateK<.6&&!M.gateSmashed;
  if(!M.inside&&app==='quiet'){if(M.tags.keypad){F.objs.push(['Get in: punch the code into the keypad by the gate (hold E)',false]);tgt={x:S_.keypad.x,z:S_.keypad.z-.4,label:'Keypad'}}
    if(M.gear.ladder){F.objs.push([(M.tags.keypad?'Or: ':'Get in: ')+"put Linda's ladder over the fence north of the gate (hold E)",false]);if(!tgt)tgt={x:S_.ladder.out.x,z:S_.ladder.out.z,label:'Fence'}}}
  else if(M.lock!=='cut'){F.objs.push(['Unit 47: cut the padlock (hold E) · the far end of the middle aisle',false]);tgt={x:S_.u47.front.x,z:S_.u47.front.z-.6,label:'Unit 47'};
    if(quiet&&gateShut&&!M.gateOpening)F.objs.push(['Open the gate for the truck: the button inside by the office (hold E)',false])}
  else{if(quiet&&gateShut&&!M.gateOpening){F.objs.push(['The truck needs the gate: press the button inside by the office (hold E)',false]);tgt={x:S_.gateBox.x,z:S_.gateBox.z,label:'Gate button'}}
    else if(!M.truckIn)F.objs.push([(roleOf(M,'driver')?DADNAME[roleOf(M,'driver')]:'The driver')+' is backing the truck in',false]);
    F.objs.push(['Load the truck · '+M.loaded+'/12'+(M.loaded<K.minLoad?' (at least '+K.minLoad+' to leave)':''),M.loaded>=12]);
    if(carrying){F.objs.push(['Carry it to the back of the truck and press E',false]);if(M.truckIn){const R=truckRear(M);tgt={x:R.x,z:R.z,label:'Truck'}}}
    else if(M.it.some(t=>t.state==='pile')&&!tgt){F.objs.push(['Hold E at the pile to pick something up'+(M.gear.dolly?' (two at a time on the hand truck)':''),false]);tgt={x:S_.u47.front.x,z:S_.u47.front.z-.8,label:'Unit 47'}}
    if(M.loaded>=K.minLoad&&!carrying&&M.truckIn){F.objs.push(["Get in Ron's truck when you're ready (the driver's door)",M.loaded>=12]);if(M.loaded>=12||!M.it.some(t=>t.state==='pile')){const c=truckCab(M);tgt={x:c.x,z:c.z,label:'Cab'}}}}
  if(quiet&&M.S){if(M.busy>0)F.objs.push(['Dwayne is off the monitors · '+Math.ceil(M.busy)+' s',true]);else if(M.inside)F.objs.push(['Dwayne is watching the cameras',false,'warn']);
    if(M.gear.pack&&M.laser>0)F.objs.push(["Doug's laser pointer: left mouse to make Reggie look away ("+M.laser+')',false])}
  if(M.loud){const alive=(M.enemies||[]).filter(e=>e.state!=='dead'&&e.state!=='cuffed'&&e.state!=='surrender').length;if(alive)F.objs.push(['The fence\'s guys: '+alive+' (zip-tie them, or just load faster)',false,'warn'])}
  F.target=tgt;
  /* HUD */
  if(quiet&&M.S){const mx=Math.max(M.S.max(),M.S2.max());F.meters.push({id:'eye',label:mx>=.6?'Searching':mx>=.35?'Noticed':'Unseen',style:'ring',v:mx,max:1,icon:'eye'})}
  F.meters.push({id:'load',label:'Loaded',v:M.loaded,max:12,style:'pips',icon:'star'});
  if(app!=='loud'&&!M.loud)F.widgets.push({id:'clock',kind:'timer',label:'Shift change',v:Math.max(0,M.clock),max:K.clock,hot:M.clock<60});
  else if(M.cousins>0)F.widgets.push({id:'cous',kind:'timer',label:'Cousins',v:M.cousins,max:K.alarm.cousins,hot:M.cousins<30});
  if(quiet&&M.busy>0)F.widgets.push({id:'busy',kind:'timer',label:'Dwayne busy',v:M.busy,max:M.busy0||M.busy})}

/* =====================================================================
   STAGE 5: THE GETAWAY (drive Ron's truck to Gary's; loud: the cousins follow)
   ===================================================================== */
const DROP={x:27,z:15,r:4.5};
function getaway(M){const a=A();if(M.stage0==='getaway')return;M.stage0='getaway';if(M.hide){M.hide=null;setDoor(M,1)}
  if(a.P.dude)a.P.dude.root.visible=true;try{a.enterCar(M.truck)}catch(e){console.warn(e)}
  /* the crew piles into your van and follows (they're off screen) */
  for(const k in M.cr){const p=M.cr[k];if(p){p.d.root.visible=false;if(p.carry)hand(M,p,null)}}
  for(const t of M.it)if(t.state==='lifter'){t.state='pile'}
  const e=M.truck;if(e.car){e.car.hpMul=K.truckHp[st(M,'driver')-1]}
  M.truckHp0=a.carHp(e);say(M,L.drive[0],L.drive[1],{front:true});a.CP.mark('getaway');getawayInit(M)}
function getawayInit(M){const a=A();if(M.gotInit)return;M.gotInit=true;M.dropRing=ringMesh(M,DROP.x,DROP.z,DROP.r);
  if(M.loud&&!M.chasers){const n=K.chasers[st(M,'driver')-1];M.chasers=[];for(let i=0;i<n;i++)spawnChaser(M,i);
    if(n>1)say(M,L.chase[0],L.chase[1],{t:2,front:true});else seq(M,[L.chase,L.chase1],2.5,{t:2,front:true});try{music('combat',1)}catch(_){}}
  else try{music('home',.25)}catch(_){}}
function spawnChaser(M,i){const a=A(),CA=a.CarAI();const v=a.makeVehicle('sedan',i?'#3c4048':'#5a2a2a')||a.makeVanBox('#555');a.wmAdd(v);
  const x=203.4,z=162+i*7;let c;if(CA&&CA.make){c=CA.make('sedan',{x,z,yaw:0});CA.follow(c,[{x,z},{x:203.4,z:120}],{speed:16,turnSpeed:4.5})}else c={x,z,yaw:0,spd:0};
  M.chasers.push({c,v,hp:60,far:0,gone:false,ri:0,rt:0,hitT:0})}
function chaseTick(M,dt){const a=A(),CA=a.CarAI(),e=M.truck,G=a.roads&&a.roads();if(!M.chasers||!e)return;const tc=e.car||{x:e.pos.x,z:e.pos.z,spd:0},tx=e.pos.x,tz=e.pos.z;
  for(const C of M.chasers){if(C.gone)continue;const c=C.c;C.rt-=dt;
    if(C.rt<=0&&CA&&CA.follow){C.rt=.9;let pts=[{x:c.x,z:c.z},{x:tx,z:tz}];try{const r=G&&G.route?G.route({x:c.x,z:c.z},{x:tx,z:tz}):null;if(r&&r.points&&r.points.length>1)pts=r.points.concat([{x:tx,z:tz}])}catch(_){}
      const d=hyp(tx-c.x,tz-c.z),truckMax=(e.stats&&e.stats.maxSpeed)||20;const drvK=st(M,'driver');
      CA.follow(c,pts,{speed:clamp(truckMax*(1.02-.05*drvK)+(d>45?5:d<12?-2:0),8,30),turnSpeed:4.5})}
    if(CA&&CA.step)try{CA.step(c,dt,{collide:(p,r)=>a.collide(p,r)})}catch(_){}
    C.v.position.set(c.x,a.groundAt(c.x,c.z),c.z);C.v.rotation.set(0,c.yaw+Math.PI/2,0);vehUpd(C.v,{speed:c.spd||0,steer:0,braking:false,headlights:true,dt});
    /* contact: they ram the truck; you can ram them back */
    const d=hyp(tx-c.x,tz-c.z);C.hitT-=dt;
    if(d<3.4&&C.hitT<=0&&a.CV===e){C.hitT=.8;const rel=Math.abs((tc.spd||0)-(c.spd||0))+3;const mine=Math.abs(tc.spd||0)>(c.spd||0)+2;
      const dmg=(mine?.35:1)*rel*.9/(e.car&&e.car.hpMul||1);try{a.carDamage(e,dmg,'ram')}catch(_){}C.hp-=mine?rel*3.2:rel*1.1;
      const nx=(c.x-tx)/(d||1),nz=(c.z-tz)/(d||1);c.x+=nx*.9;c.z+=nz*.9;c.spd=(c.spd||0)*.55;tone({f:120,to:60,type:'square',d:.2,gain:.08});
      if(!mine&&Math.random()<.5)say(M,'gary',pick(L.truckHit))}
    if(d>85)C.far+=dt;else C.far=Math.max(0,C.far-dt*.5);
    if(C.hp<=0||C.far>3.5){C.gone=true;c.spd=0;if(CA&&CA.follow)CA.follow(c,[{x:c.x,z:c.z}],{speed:0});feed(L.shaken,'trust',C.hp<=0?'Rammed off the road':'Left behind');M.shook=(M.shook||0)+1;
      if(M.chasers.every(q=>q.gone))say(M,L.chaseDone[0],L.chaseDone[1],{t:1.5,front:true})}}}
function getawayTick(M,F,dt){const a=A(),P=a.P,e=M.truck;M.t+=dt;if(!e)return;
  if(a.CV!==e){/* out of the truck: get back in */const c=truckCab(M);F.objs.push(["Get back in Ron's truck",false]);F.target={x:e.pos.x,z:e.pos.z,label:'Truck'};
    if(hyp(P.pos.x-c.x,P.pos.z-c.z)<3.2)F.taps.push({x:c.x,z:c.z,r:3.2,txt:"Get in Ron's truck",fn:()=>{try{a.enterCar(e)}catch(_){}}})}
  chaseTick(M,dt);
  const hp=a.carHp(e),mx=a.carHpMax(e);if(hp<=0)return a.endMission(false,L.truckDead,"Ron's truck is done.");
  const left=M.chasers?M.chasers.filter(c=>!c.gone).length:0;
  F.objs.push(["Drive Ron's truck to Gary's house",false]);if(left)F.objs.push(['Lose them: get 85 m ahead, or ram them · '+left+' left',false,'warn']);
  F.meters.push({id:'truck',label:"Ron's truck",v:hp,max:mx,style:'bar',warn:.3,warnBelow:true,icon:'car'});F.meters.push({id:'load',label:'Loaded',v:M.loaded,max:12,style:'pips',icon:'star'});
  F.target={x:DROP.x,z:DROP.z,label:"Gary's"};
  if(a.CV===e&&hyp(e.pos.x-DROP.x,e.pos.z-DROP.z)<DROP.r){const sp=Math.abs(e.spd||(e.car&&e.car.spd)||0);if(left)F.prompt='Lose them first';else if(sp>2.5)F.prompt='Stop the truck';else finish(M)}}
function finish(M){const a=A();if(M.finished)return;M.finished=true;
  /* Rick brought your van round; park it at the curb behind the truck */
  try{a.exitCar()}catch(_){}const V=a.VAN;if(V&&V.pos){V.pos.set(DROP.x+9,0,DROP.z+.4);V.yaw=gyaw(-1,0);V.spd=0;if(V.car){V.car.x=V.pos.x;V.car.z=V.pos.z;V.car.yaw=V.yaw;V.car.spd=0}a.syncCar(V);M.car=V}
  M.ladderBack=!!M.gear.ladder;const ln=(M.ghost?[L.arriveGhost[0]]:[]).concat(L.arrive);for(const l of ln)try{a.radio(l[0],l[1],true)}catch(_){}if(M.ladderBack)try{a.radio(L.ladderBack[0],L.ladderBack[1])}catch(_){}
  stinger('win');M.score=M.loaded;a.endMission(true)}

/* =====================================================================
   THE REGISTRATION
   ===================================================================== */
function fresh(M){M.vis={own:[]};M.q=[];M.said={};M.t=0;M.tags={};M.weird=0;M.weirdFlag=false;M.gear={};M.talked={};M.spend=0;M.plan=null;M.app=null;M.loaded=0;M.loadedIds=[];M.carrying=[];
  M.lock=null;M.door=0;M.truckIn=false;M.truckGo=false;M.gateOpen=false;M.gateK=0;M.loud=false;M.ghost=true;M.clock=K.clock;M.busy=0;M.busy0=0;M.laser=3;M.ties=0;M.inside=false;M.hide=null;M.stage0='scope';
  M.people={};M.cr={};M.live=true;LIVE.M=M}
J.register('heist',{
  def:{giver:'gary',hood:'maple',title:'Good Fences',role:'Gary · The Accountant',place:'Discount Storage Unlimited, Industrial Way',
    lines:["I made a spreadsheet. Then I made a pivot table. Then I cried a little. Then I found the warehouse. Tre was right: unit forty-seven.",
      "Eleven hundred and forty stolen things from three neighbourhoods, and the trail ends at one storage unit. It's guarded, it has cameras, and it's full of other people's lawnmowers.",
      "So we plan it. We scope it, we gear up, we pick roles, and then we steal everybody's stuff back. Politely."],
    obj:"Scope the storage lot, gather gear around Maple, plan the crew's roles and approach, then load the twelve stolen things into Ron's truck and drive them home.",
    crew:[],weapons:['pistol'],from:{place:'g_gary'},start:{x:S_.ring.x,z:S_.ring.z},site:'storage',
    unlock:{done:['talk']},pay:K.pay.base,par:900,winTrust:16,roam:true,night:false,order:40,
    noGuns:L.noGunsDay,
    stages:['scope','gear','plan','job','getaway'],
    stageLabels:{scope:'Scope the place',gear:'Gear up',plan:'The plan',job:'The job',getaway:'Get it home'},failPolicy:'escalate',
    medals:['Finished','All twelve things home','All twelve, and nobody ever raised the alarm'],
    radio:[['gary',"Pull up on Industrial, by the gate. Look like a man who needs storage."]],
    endLine:"Sunday morning, Gary's driveway: a folding table, a hand-lettered LOST & FOUND sign, and a line of neighbours down the block. Some of them came from Riverside. A couple of them stayed for coffee."},
  start(M,o){fresh(M);
    if(!castReady()){M.waitCast=true;preloadCast().then(()=>{M.waitCast=false})}
    try{A().setNight(0,true)}catch(_){}},
  upd(dt,M,F){const a=A(),P=a.P;
    if(M.waitCast){F.objs.push(['Gary is finding his reading glasses...',false]);if(castReady())M.waitCast=false;return}
    if(M.loadState){const s=M.loadState;M.loadState=null;applyLoad(M,s)}
    qTick(M,dt);
    if(M.dotT>0){M.dotT-=dt;if(M.dotT<=0&&M.vis.dot)M.vis.dot.visible=false}
    switch(M.stage0){
      case'scope':scopeInit(M);scopeTick(M,F,dt);break;
      case'gear':case'plan':gearInit(M);if(M.board){F.objs.push(['The plan board is open',false]);for(const id of DADS){const p=M.crewP&&M.crewP[id];if(p)posePerson(p,dt)}break}gearTick(M,F,dt);break;
      case'job':jobInit(M);gateTick(M,dt);jobTick(M,F,dt);break;
      case'getaway':jobInit(M);getawayTick(M,F,dt);break}
    M.score=M.loaded},
  /* [CP] what a stage needs to come back */
  save(M){return{st:M.stage0,tags:M.tags,weird:+(M.weird||0).toFixed(2),wf:!!M.weirdFlag,gear:M.gear,talked:M.talked,spend:M.spend,plan:M.plan,loaded:M.loadedIds||[],lock:M.lock||null,
    truckIn:!!M.truckIn,gateOpen:!!M.gateOpen,loud:!!M.loud,ghost:M.ghost!==false,clock:Math.round(M.clock||0),laser:M.laser,ties:M.ties||0,rgK:M.rg?M.rg.k:0,
    truck:M.truck&&M.stage0==='getaway'?{x:+M.truck.pos.x.toFixed(2),z:+M.truck.pos.z.toFixed(2),yaw:+M.truck.yaw.toFixed(3)}:null}},
  load(M,s){if(!s)return;M.loadState=s},
  payout(M,ok){if(!ok)return[];const out=[],n=M.loaded||0,perk=hasPerk();
    out.push(['Recovered things ×'+n+(perk?' (Itemised +15%)':''),Math.round(K.pay.item*n*(perk?1.15:1))]);
    if(M.ghost)out.push(['Ghost · nobody raised the alarm',K.pay.ghost]);
    if(M.ladderBack)out.push(["Linda's ladder, back by Sunday",K.pay.ladder]);
    if(!M.kills&&M.loud)out.push(['It went loud and nobody got hurt',150]);
    if(M.owe)out.push(['Paid Hank back for the walkie-talkies',-M.owe]);
    return out},
  medal:M=>(M.loaded>=12?(M.ghost?3:2):1),
  end(M,ok){if(!ok)return;const a=A(),s=a.SV(),Sv=window.HT&&HT.Save;if(!s)return;s.flags=s.flags||{};
    s.flags.lostFound=true;const prev=new Set(s.flags.heistReturned||[]);for(const id of M.loadedIds||[])prev.add(id);s.flags.heistReturned=[...prev];
    /* each thing is +0.5 trust where it came from; a ghost run is +8; the ladder back on time +1 */
    let tm=0,tr=0;for(const id of M.loadedIds||[]){const d=ITEMS.find(x=>x.id===id);if(d&&d.hood==='river')tr+=K.trust.item;else tm+=K.trust.item}
    if(M.ghost)tm+=K.trust.ghost;if(M.ladderBack)tm+=K.trust.ladder;try{if(tm)a.addTrust(tm,'maple');if(tr)a.addTrust(tr,'river')}catch(_){}
    try{if(Sv&&Sv.household&&(M.loadedIds||[]).includes('kayak'))Sv.household(null,'ferreira');if(Sv&&Sv.perk&&s.jobs&&s.jobs.talk&&s.jobs.talk.done&&!Sv.perk(null,'gary'))Sv.perk(null,'gary',true)}catch(_){}
    try{a.save()}catch(_){}HOME.dirty=true},
  hud(st_){const M=A().M;if(!M||M.def.id!=='heist'||M.state!=='go')return;
    if(M.stage0==='job'&&M.app==='quiet'&&!M.loud&&M.viz){const nv=!!(window.NIGHT&&window.NIGHT.nvg);try{M.viz.update(1/30,{nvg:nv,night:true});const vis=M.pl?(M.pl.hidden?0:clamp((M.pl.lit-.32)/.68,0,1)):0;if(M.hud)M.hud.update(1/30,{vis,noise:0,hidden:!!M.hide})}catch(_){}}
    /* the guard on the minimap: only with the walkie-talkies (the lookout calls him in) */
    if(M.stage0==='job'&&M.rg&&!M.loud&&M.app==='quiet'&&M.gear.walkies&&!M.rg.tied){st_.enemies=(st_.enemies||[]).concat([{id:'reggie',x:M.rg.pos.x,z:M.rg.pos.z,alert:M.rg.ob&&M.rg.ob.state!=='calm',seen:true}])}},
  pose(dt){},
  test:{give(a){const H=window.__ht,s=a.SV();for(const id of['gary','rick','dave','doug','dee','talk']){const i=a.MISSIONS.findIndex(m=>m.id===id);if(i>=0&&H&&H.prog)H.prog.done[i]=true;if(s&&window.HT.Save&&HT.Save.jobRec)HT.Save.jobRec(s,id).done=true}
      if(s&&s.flags){s.flags.talkUnit47=true;s.flags.act2Intro=true}if(s&&s.world)s.world.bridgeOpen=true;if(s)s.cash=Math.max(s.cash||0,500);
      const PP=window.HT.People;if(PP&&PP.preload)try{PP.preload(castKeys().filter(k=>PP.keys.includes(k)&&!PP.has(k))).catch(()=>{})}catch(_){}},
    step:(a,t,o)=>bot(a,t,o||{}),
    sample:()=>({stage0:'job',tags:{keypad:true,u47:true,cams:true},weird:.2,weirdFlag:false,gear:{walkies:true,dolly:true},talked:{hank:true,dave:true},spend:60,
      plan:{assign:{lookout:'doug',driver:'rick',lifter:'dave',distraction:'gary'},entry:'quiet'},loadedIds:['grill','gnome'],lock:'cut',truckIn:true,gateOpen:true,loud:false,ghost:true,clock:300,laser:3,ties:0,cpNode:true})}
});
function hasPerk(){try{const s=A().SV();return!!(s&&s.perks&&s.perks.gary)}catch(_){return false}}
/* back from a checkpoint: rebuild what the stage needs */
function applyLoad(M,s){const a=A();M.tags=s.tags||{};M.weird=s.weird||0;M.weirdFlag=!!s.wf;M.gear=s.gear||{};M.talked=s.talked||{};M.spend=s.spend||0;M.plan=s.plan||null;M.loadedIds=(s.loaded||[]).slice();M.loaded=M.loadedIds.length;
  M.lock=s.lock;M.door=s.lock==='cut'?1:0;M.truckIn=!!s.truckIn;M.truckGo=M.truckIn;M.gateOpen=!!s.gateOpen;M.loud=false;M.ghost=s.ghost!==false;M.clock=s.clock||K.clock;M.laser=s.laser==null?3:s.laser;M.ties=s.ties||0;M.rgK=s.rgK||0;
  M.retryScope=true;M.said.gearOpen=1;M.said.board=1;
  if(s.st==='scope'){M.stage0='scope'}
  else if(s.st==='gear'||s.st==='plan'){M.stage0=s.st;gearEnter(M);gearInit(M);gearSync(M)}
  else if(s.st==='job'||s.st==='getaway'){M.app=M.plan&&M.plan.entry||'quiet';M.stage0='job';const wasLoud=!!s.loud;beginJob(M,true);M.inside=M.gateOpen||M.lock==='cut';
    if(wasLoud&&M.app!=='loud')goLoud(M,'retry');
    if(s.st==='getaway'){if(s.truck){const e=M.truck;e.pos.set(s.truck.x,0,s.truck.z);e.yaw=s.truck.yaw;a.syncCar(e)}M.stage0='job';M.loud=wasLoud||M.app==='loud';
      /* the getaway restarts in the cab */M.stage0='x';getaway(M)}}
  feed('Back at: '+(M.def.stageLabels[s.st]||s.st),'info')}

/* =====================================================================
   AFTERWARDS: the result card (a Lost & Found list) and the porches in free roam
   ===================================================================== */
J.on('hud',()=>{const a=A(),M=a&&a.M;if(!M||M.def.id!=='heist'||M.state==='go'||M.resDone)return;const r=document.querySelector('.ht-result .col');if(!r)return;M.resDone=true;
  const won=M.state==='won',n=M.loaded||0;const h2=r.querySelector('h2');
  if(h2&&won)h2.textContent=n>=12?(M.ghost?'Nobody saw a thing. Everybody gets their stuff back.':'Loud, but everything came home.'):n+' of 12 came home. Gary has the rest on a spreadsheet.';
  const stt=r.querySelector('.ht-stats');if(stt){const medal=stt.lastElementChild&&won?stt.lastElementChild.outerHTML:'';const secs=Math.round(M.elapsed||0);
    const crew=M.plan?['lookout','driver','lifter','distraction'].map(k=>M.plan.assign[k]?DADNAME[M.plan.assign[k]]+' '+'★'.repeat(starsOf(M,k,M.plan.assign[k])):'').filter(Boolean).join(' · '):'';
    const cell=(k,v,s)=>`<div><b>${k}</b><span class="ht-num">${v}</span>${s?`<small>${s}</small>`:''}</div>`;
    stt.innerHTML=cell('Recovered',n+'/12',n>=12?'every last one':'')+cell('Approach',M.app==='bluff'?'The bluff':M.app==='loud'?'Loud':M.app?'Quiet':'—',M.loud&&M.app!=='loud'?'it went loud':M.ghost&&M.app?'no alarm':'')+
      cell('Crew',M.plan?'4 dads':'—',crew)+cell('Time',Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0'),'')+medal}
  if(won&&n){const w=document.createElement('div');w.className='htp-lf';const rows=ITEMS.map(it=>{const got=(M.loadedIds||[]).includes(it.id);return`<li class="${got?'ok':''}"><i></i><span>${it.label}</span><em>${it.owner}</em></li>`}).join('');
    w.innerHTML='<div class="hk">Lost &amp; Found · Gary\'s driveway, Sunday</div><ul>'+rows+'</ul>';const pay=r.querySelector('.ht-payout');r.insertBefore(w,pay||r.querySelector('.ht-btns'))}});
/* free roam: the things that came home sit on their owners' porches; walk by and the owner has a word (once a visit) */
const HOME={L:null,built:false,M:null,said:{},dirty:false,list:[]};
function homeTeardown(){const H=HOME;for(const o of H.list)if(o.g&&o.g.parent)o.g.parent.remove(o.g);for(const x of(H.M&&H.M.vis.own)||[])try{x.dispose()}catch(_){}H.list=[];H.M=null;H.built=false;H.L=null}
function homeBuild(a,s){const H=HOME;homeTeardown();const ret=new Set(s.flags.heistReturned||[]);if(!ret.size)return;H.M={vis:{own:[]}};H.L=a.L;H.built=true;
  for(const h of HOMECOMING){const its=h.items.filter(id=>ret.has(id));if(!its.length)continue;const T3=a.THREE,g=new T3.Group();g.name='heistHome';
    its.forEach((id,k)=>{const d=ITEMS.find(x=>x.id===id),m=itemMesh(H.M,d);m.position.set(k*.75,0,0);m.rotation.y=k*.4;g.add(m)});
    g.position.set(h.x,a.groundAt?a.groundAt(h.x,h.z):0,h.z);g.rotation.y=h.yaw;a.L.group.add(g);H.list.push({g,h})}
  /* the sign on Gary's lawn */
  const T3=a.THREE,st=canvasTex(H.M,256,160,(c,w,h)=>{c.fillStyle='#fbf7ea';c.fillRect(0,0,w,h);c.strokeStyle='#1d3f8a';c.lineWidth=6;c.strokeRect(4,4,w-8,h-8);c.fillStyle='#1d3f8a';c.font='900 36px "Arial Narrow",Arial';c.textAlign='center';c.fillText('LOST & FOUND',w/2,56);
    c.fillStyle='#c63a2e';c.font='700 24px Arial';c.fillText('SUNDAY · 10 AM',w/2,92);c.fillStyle='#2b2b2b';c.font='italic 18px Arial';c.fillText('(bring a list, Gary has one)',w/2,128)});
  const g=new T3.Group();const face=new T3.Mesh(own(H.M,new T3.PlaneGeometry(.9,.56)),own(H.M,new T3.MeshStandardMaterial({map:st,roughness:.7})));face.position.y=.95;face.rotation.y=Math.PI;g.add(face);
  const post=new T3.Mesh(own(H.M,new T3.BoxGeometry(.05,1,.05)),own(H.M,new T3.MeshStandardMaterial({color:a.lin('#8a6640'),roughness:.9})));post.position.y=.5;g.add(post);g.position.set(GARY.x-3.2,0,GARY.z-.2);a.L.group.add(g);H.list.push({g,h:{x:GARY.x-3.2,z:GARY.z,who:'Gary',line:"Sunday at ten. I've made name tags. For the things. And for the people."}})}
J.on('pose',()=>{const a=A();if(!a||!a.L)return;const M=a.M,inJob=M&&M.state==='go';const s=a.SV&&a.SV();
  if(!s||!s.flags||!(s.flags.heistReturned||[]).length){if(HOME.built)homeTeardown();return}
  if(a.mode!=='hub'&&a.mode!=='mission'){if(HOME.built)homeTeardown();return}
  if(!HOME.built||HOME.L!==a.L||HOME.dirty){HOME.dirty=false;homeBuild(a,s)}
  /* hidden while Good Fences itself runs (they're in the unit then) */
  const hide=inJob&&M.def.id==='heist';for(const o of HOME.list)o.g.visible=!hide;
  if(inJob||a.CV)return;const P=a.P;for(const o of HOME.list){const h=o.h;if(HOME.said[h.who])continue;if(hyp(P.pos.x-h.x,P.pos.z-h.z)<5.5){HOME.said[h.who]=1;try{a.radio(h.who,h.line)}catch(_){}}}});

/* ---------------- cleanup: when the job ends, is retried or replayed, free everything it built ---------------- */
const LIVE={M:null};
function cleanup(M){if(!M||M.cleaned)return;M.cleaned=true;M.live=false;const a=A();
  try{if(M.board)M.board.close(true)}catch(_){}M.board=null;try{if(M.ch)M.ch.close()}catch(_){}M.ch=null;try{a.overlay('bluff',null)}catch(_){}
  try{const Ph=PH();if(Ph&&Ph.S&&Ph.S.job==='heist')Ph.end()}catch(_){}
  try{gateRestore(M)}catch(_){}
  try{if(M.viz)M.viz.dispose()}catch(_){}try{if(M.hud)M.hud.dispose()}catch(_){}M.viz=M.hud=null;
  try{if(M.S)M.S.dispose()}catch(_){}try{if(M.S2)M.S2.dispose()}catch(_){}M.S=M.S2=null;
  const v=M.vis||{};
  if(v.vanLadder&&v.vanLadder.parent)v.vanLadder.parent.remove(v.vanLadder);if(v.dolly&&v.dolly.parent)v.dolly.parent.remove(v.dolly);
  for(const t of M.it||[])if(t.mesh&&t.mesh.parent)t.mesh.parent.remove(t.mesh);
  if(M.truck&&M.truck.obj){try{const ud=M.truck.obj.userData;if(ud.dispose)ud.dispose()}catch(_){}if(M.truck.obj.parent)M.truck.obj.parent.remove(M.truck.obj)}
  for(const C of M.chasers||[]){try{const ud=C.v.userData;if(ud.dispose)ud.dispose()}catch(_){}if(C.v.parent)C.v.parent.remove(C.v)}
  for(const k in M.people||{}){const p=M.people[k];if(p&&p.d&&p.d.root&&p.d.root.parent)p.d.root.parent.remove(p.d.root);if(p&&p.carry&&p.carry.parent)p.carry.parent.remove(p.carry)}
  if(a.P&&a.P.dude)a.P.dude.root.visible=true;
  for(const x of v.own||[])try{x.dispose()}catch(_){}
  M.vis={own:[]};M.people={};M.cr={};M.it=[];M.truck=null;M.chasers=null;M.q=[];if(LIVE.M===M)LIVE.M=null}
J.on('pose',()=>{const M=LIVE.M;if(!M)return;const a=A(),cur=a&&a.M;if(cur!==M||M.state!=='go'){if(M.state!=='go'&&cur===M){M.endT=(M.endT||0)+1;if(M.endT<3)return}cleanup(M)}});
const _start=J.get('heist').start;J.get('heist').start=function(M,o){if(LIVE.M&&LIVE.M!==M)cleanup(LIVE.M);return _start.call(this,M,o)};

/* =====================================================================
   THE SCRIPTED PLAYER (dev/jobs-check.js): plays every stage. Teleports between moments, acts only when nobody would see it.
   Normal runs go quiet; a replay goes in with the bluff; o.fail plans it loud with Gary driving and sits in the truck until the
   cousins wreck it (a real fail state), so the retry starts at the getaway.
   ===================================================================== */
const BOTSHOTS=[['keypad',{x:206.3,z:143.6}],['cams',{x:212.6,z:138.6}],['board',{x:219,z:146.6}],['dwayne',null],['u47',{x:262,z:144.6}]];
function botSafe(M,x,z,stance){const S=M.S;if(!S||M.loud)return true;if(Math.max(S.max(),M.S2.max())>.3)return false;const lit=S.lightAt(x,z,1,.4),pr=S.probe({x,z,stance:stance||'crouch',lit}),pr2=M.S2.probe({x,z,stance:stance||'crouch',lit});
  if(pr.v>0||pr2.v>0&&watched(M))return false;const g=M.rg;if(g&&!g.tied){const d=hyp(g.pos.x-x,g.pos.z-z);if(d<6)return false;if(d<22){const ang=Math.abs(wrap(cyaw(x-g.pos.x,z-g.pos.z)-g.yaw));if(ang<1.5)return false}
    /* where he'll be in 6 s (his round is deterministic) */const G2={pos:{x:g.pos.x,z:g.pos.z},yaw:g.yaw,k:g.k,t:g.t};for(let s=0;s<6;s+=.5){roundStep(G2,.5);const d2=hyp(G2.pos.x-x,G2.pos.z-z);if(d2<15&&Math.abs(wrap(cyaw(x-G2.pos.x,z-G2.pos.z)-G2.yaw))<1.2)return false}}
  /* cameras that could see it once Dwayne's back */if(!watched(M))return true;for(const ses of[S,M.S2])for(const b of ses.obs)if(b.kind==='camera'&&hyp(b.pos.x-x,b.pos.z-z)<K.cam.R+1){const ang=Math.abs(wrap(cyaw(x-b.pos.x,z-b.pos.z)-b.yaw));if(ang<K.cam.half+.25&&!S.blocked(b.pos.x,b.pos.z,b.eye||3.4,x,z,1.2))return false}
  return true}
function bot(a,t,o){const M=a.M,P=a.P;if(!M||M.state!=='go'||M.waitCast)return null;const k=a.keys,B=M.bot||(M.bot={i:0,w:0,log:[]}),Ph=PH();
  const tp=(x,z)=>{P.pos.set(x,0,z);a.collide(P.pos,.35)};k.e=false;
  if(B.w>0){B.w--;return null}
  switch(M.stage0){
    case'scope':{if(a.CV){if(!M.tags.u47)a.exitCar();return null}
      const next=BOTSHOTS.find(s=>!M.tags[s[0]]);if(!next){if(Ph&&Ph.isRaised()){P.aim=false;return null}const v=M.car;tp(v.pos.x+2.6,v.pos.z+.5);a.enterCar(v);return null}
      const id=next[0],sub=subjects(M).find(s=>s.item===id);const spot=next[1]||{x:M.dw.pos.x+.3,z:M.dw.pos.z-3.4};
      if(B.id!==id){B.id=id;B.n=0;tp(spot.x,spot.z);P.aim=false;return null}B.n++;
      if(!Ph)return null;if(!Ph.isRaised()){P.aim=true;return null}if(Ph.zoom!==(id==='cams'?4:id==='keypad'||id==='board'?2:1))Ph.setZoom(id==='cams'?2:id==='keypad'||id==='board'?1:0);
      Ph.aimAt(sub.pos.x,sub.pos.y+sub.h/2,sub.pos.z);if(!Ph.focus.locked&&B.n<60)return null;if(B.n%12===0){const pv=Ph.preview(),h=pv&&pv.hits.find(h=>h.item===id);if(h&&h.stars>=1||B.n>90)Ph.shoot()}
      if(B.n>200){M.tags[id]=true}return null}
    case'gear':case'plan':{if(a.CV){a.exitCar();return null}if(M.board){/* the board: the same keys a player presses */const Pl=PL(),ctx=planCtx(M);
        const want=o.fail?{assign:{lookout:'doug',driver:'gary',lifter:'dave',distraction:'rick'},entry:'loud'}:M.replay&&!Pl.locks(PLAN_DEF,ctx).bluff?Object.assign(Pl.auto(PLAN_DEF,ctx),{entry:'bluff'}):Object.assign(Pl.auto(PLAN_DEF,ctx),{entry:'quiet'});
        if(!B.planSet){B.planSet=1;M.board.set(want);return null}M.board.key('Enter');return null}
      const order=M.replay?['walkies','dolly','blankets','pack','ladder']:['walkies','dolly','pack','ladder','blankets'];const need=order.find(id=>!M.gear[id]);
      if(M.ladderCarry){const r=vanRear(M);tp(r.x,r.z);a.useTap=true;B.w=3;return null}
      if(need==='ladder'&&M.talked.linda){tp(53.2,19.6);k.e=true;return null}
      if(need&&!(need!=='ladder'&&M.talked[GEAR.find(g=>g.id===need).who])){const g=GEAR.find(x=>x.id===need);tp(g.ring.x,g.ring.z);a.useTap=true;B.w=4;return null}
      if(need)return null;/* waiting on someone to hand it over */
      tp(GARY.x,GARY.z-2.6);a.useTap=true;B.w=4;return null}
    case'job':{if(a.CV)return null;const quiet=M.app==='quiet'&&!M.loud;
      if(M.app==='bluff'&&!M.bluffDone){if(!M.bluffOn){tp(M.dw.pos.x+.4,M.dw.pos.z-1.6);a.useTap=true;B.w=6;return null}
        if(M.ch&&!M.chWait){const C=M.cv,opts=C.options(),best=opts.reduce((bi,x,i)=>{const sc=(C.table[C.st.mood]||{})[x.reg]||[0,0];const b=opts[bi],sb=(C.table[C.st.mood]||{})[b.reg]||[0,0];return(sc[0]+(x.gear?10:0))>(sb[0]+(b.gear?10:0))?i:bi},0);M.ch.pick?M.ch.pick(best):bluffPick(M,best)}return null}
      if(M.hide){if(botSafe(M,S_.u47.front.x,S_.u47.front.z-.6,'crouch')&&(B.hideT=(B.hideT||0)+1)>20){B.hideT=0;a.useTap=true}return null}
      const act=(x,z,stance,hold)=>{if(quiet&&!botSafe(M,x,z,stance)){return false}tp(x,z);P.crouch=stance==='crouch';if(hold)k.e=true;else a.useTap=true;return true};
      const goHide=()=>{if(M.lock==='cut'&&quiet&&!(M.carrying||[]).length){tp(S_.u47.front.x,S_.u47.front.z);k.e=true}else tp(S_.stage.you.x,S_.stage.you.z)};
      if(!M.inside&&M.app==='quiet'&&!M.loud){if(M.tags.keypad){if(!act(S_.keypad.x-.3,S_.keypad.z-.6,'crouch',true))tp(S_.stage.you.x,S_.stage.you.z)}else if(M.gear.ladder){if(!act(S_.ladder.out.x,S_.ladder.out.z,'crouch',true))tp(S_.stage.you.x,S_.stage.you.z)}return null}
      if(M.app==='loud'&&!M.inside){tp(212,148);M.inside=true;return null}
      if(M.lock!=='cut'){if(!act(S_.u47.front.x,S_.u47.front.z-.3,'crouch',true))goHide();return null}
      if(M.app==='quiet'&&!M.loud&&M.gateK<.6&&!M.gateOpening&&!M.gateSmashed){if(!act(S_.gateBox.x,S_.gateBox.z,'crouch',true))goHide();return null}
      if(M.doorT!=null||!M.truckIn){if(quiet&&!botSafe(M,S_.u47.front.x,S_.u47.front.z,'crouch'))goHide();return null}
      const car=(M.carrying||[]).length;
      if(o.fail&&M.loaded>=K.minLoad&&!car){const c=truckCab(M);tp(c.x,c.z);a.useTap=true;return null}
      if(car){const R=truckRear(M);if(car<carryCap(M)&&M.it.some(t=>t.state==='pile'&&!t.def.heavy&&!M.carrying[0].def.heavy)){const t=M.it.find(t=>t.state==='pile'&&!t.def.heavy);if(act(t.x,t.z,'stand',true))return null}
        if(!act(R.x,R.z,'stand',false)){/* can't load right now: wait in the unit's shadow */}B.w=2;return null}
      const left=M.it.filter(t=>t.state==='pile'&&(M.gear.dolly||!t.def.heavy));
      if(left.length){const t=left[0];if(!act(t.x,t.z,'stand',true))goHide();return null}
      if(M.it.some(t=>t.state==='pile'||t.state==='lifter')&&M.loaded<12){if(quiet&&!botSafe(M,S_.u47.front.x,S_.u47.front.z,'crouch'))goHide();return null}
      if(M.loaded>=K.minLoad){const c=truckCab(M);if(act(c.x,c.z,'stand',false))return null}return null}
    case'getaway':{const e=M.truck;if(a.CV!==e){const c=truckCab(M);tp(c.x,c.z);a.useTap=true;return null}
      if(o.fail){/* out onto Industrial Way, then sit there */if(!B.out){B.out=botDrive(a,M,{x:203.6,z:140},B)}else{k.w=k.a=k.d=false;k.s=Math.abs(e.spd||0)>.5}return null}
      botDrive(a,M,DROP,B);return null}}
  return null}
/* drive the current car toward a point along the road graph (the harness's own driver, steering by keys) */
function botDrive(a,M,tgt,B){const e=a.CV,k=a.keys;if(!e)return false;const G=a.roads&&a.roads();
  if(!B.route||B.rtT--<=0){B.rtT=90;let pts=[tgt];const inLot=e.pos.x>209&&e.pos.z>131&&e.pos.z<157;try{const r=G&&G.route?G.route({x:inLot?205:e.pos.x,z:inLot?148:e.pos.z},tgt):null;if(r&&r.points)pts=r.points.slice()}catch(_){}
    if(inLot)pts=[{x:212,z:148},{x:206.2,z:147.4},{x:203.6,z:143}].concat(pts);B.route=pts;B.wi=0}
  const pts=B.route;while(B.wi<pts.length-1&&hyp(pts[B.wi].x-e.pos.x,pts[B.wi].z-e.pos.z)<5)B.wi++;const d0=hyp(tgt.x-e.pos.x,tgt.z-e.pos.z),w=d0<10?tgt:pts[Math.min(B.wi,pts.length-1)];
  if(d0<2.2){k.w=k.a=k.d=false;k.s=Math.abs(e.spd||0)>.4;return true}
  const dx=w.x-e.pos.x,dz=w.z-e.pos.z;let d=Math.atan2(-dx,-dz)-e.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;
  const want=d0<10?Math.max(1.2,d0*.35):Math.abs(d)>.5?6:12;k.a=d>.05;k.d=d<-.05;k.w=(e.spd||0)<want;k.s=(e.spd||0)>want+2;
  if(Math.abs(e.spd||0)<.4){B.stuck=(B.stuck||0)+1;if(B.stuck>120){B.stuck=0;const q=pts[Math.min(B.wi+1,pts.length-1)];e.pos.set(q.x,0,q.z);if(e.car){e.car.x=q.x;e.car.z=q.z;e.car.spd=0}e.yaw=Math.atan2(-(q.x-e.pos.x),-(q.z-e.pos.z))||e.yaw;try{a.syncCar(e)}catch(_){}}}else B.stuck=0;return false}
})();
