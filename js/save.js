/* High Trust: save game, economy, shops and gun locker.
   Exposes on window.HT (and module.exports under Node):
     HT.CATALOG  all shop/catalogue data (guns, attachments, furniture, supplies, vehicle upgrades)
     HT.Save     versioned 'ht-save' storage with migration, corruption recovery, change events, export/import
     HT.Economy  payout maths, prices, buy/sell rules, unlock conditions, weapon/vehicle stat helpers, payout renderer
     HT.Shop     full-screen store menu (Dadazon, Maple Hardware, the auto shop)
     HT.Locker   gun locker / workbench menu
   No dependencies. The DOM parts only run in a browser. */
(function(root){
'use strict';
const HT=root.HT=root.HT||{};
const hasDOM=typeof document!=='undefined';

/* =====================================================================
   CATALOGUE
   ===================================================================== */
/* bonus: mission-specific payout lines (SPEC D.1 + SPEC2 B.1-B.5). r = the result object passed to computePayout. */
const MISSIONS=[
  {id:'gary',giver:'gary',who:'Gary',title:'Return to Sender',base:400,par:300,hood:'maple',
    bonus:[r=>r.got&&['packages','Returned packages ×'+r.got,30*r.got]]},
  {id:'rick',giver:'rick',who:'Coach Rick',title:'Fourth Quarter',base:550,par:0,hood:'maple',
    bonus:[r=>r.ok&&r.timeLeft>0&&['clock','Clock bonus · '+Math.round(r.timeLeft)+'s left',3*Math.round(r.timeLeft)]]},
  {id:'dave',giver:'dave',who:'Big Dave',title:'Block Party',base:700,par:240,hood:'maple',bonus:[]},
  {id:'doug',giver:'doug',who:'Doug',title:'The Kingpin',base:1000,par:300,hood:'maple',
    bonus:[r=>r.bossDone==='cuffed'&&['bail',"King's bail refund",500]]},
  {id:'earl',giver:'earl',who:'Earl',title:'End of the Line',base:650,par:300,hood:'river',
    bonus:[r=>r.bikes&&['bikes','Bikes back with their kids ×'+r.bikes,40*r.bikes],r=>r.converters&&['converters','Converters to the bike library fund ×'+r.converters,60*r.converters]]},
  {id:'dee',giver:'dee',who:'Pastor Dee',title:'Fellowship Hall',base:800,par:0,hood:'river',
    bonus:[r=>r.ok&&r.cleanStakeout&&['stakeout','Clean stakeout',200],r=>r.ids&&['ids','Faces matched to names ×'+r.ids,50*r.ids],r=>r.bossDone==='cuffed'&&['courier','The Courier gets a second chance',250]]},
  {id:'rosa',giver:'rosa',who:'Rosa',title:'Garden Variety',base:900,par:0,hood:'river',
    bonus:[r=>r.ok&&r.beds!=null&&(r.beds>=10?['tomatoes','Tomatoes saved',200]:r.beds>0&&['tomatoes','Garden beds standing ×'+r.beds,15*r.beds])]},
  {id:'benny',giver:'benny',who:'Benny',title:'Brain Freeze',base:1000,par:0,hood:'river',
    bonus:[r=>r.ok&&r.truckHp>.66&&['truck','Truck in one piece',200],r=>r.ok&&r.chaseT!=null&&r.chaseT<45&&['chase','Chased it down under 45 s',150]]},
  {id:'duke',giver:'earl',who:'Earl',title:'The Duke',base:1400,par:0,hood:'river',
    bonus:[r=>r.bossDone==='cuffed'&&['bail',"The Duke's bail refund",600],r=>r.ok&&r.chaseT!=null&&r.chaseT<60&&['chase','Caught him under 60 s',150],r=>r.ok&&r.vanHp>=.9&&['dents',"Sal's no-dents bonus",100]]}];
const MISSION_COUNT=MISSIONS.length;
const AMMO={'9mm':{name:'9mm',cap:192,col:'#e9b949'},'357':{name:'.357',cap:36,col:'#a9adb3'},nails:{name:'Nails',cap:200,col:'#cfd6dd'},
  '12ga':{name:'12 ga',cap:40,col:'#d8553f'},bean:{name:'Beanbags',cap:30,col:'#f08a2c'},'556':{name:'5.56',cap:180,col:'#6fb35a'},'308':{name:'.308',cap:25,col:'#4f7fc4'}};

/* Gameplay numbers mirror docs/design/SPEC.md A.2 so menus can compare guns without the game loaded. */
const GUNS={
  pistol:{name:'Garage Pistol',short:'Pistol',slot:'side',ammo:'9mm',cls:'Pistol',auto:false,dmg:30,head:2,pellets:1,rate:.2,mag:12,reserve:84,range:70,fall:[25,60,.6],
    spread:{hip:.014,ads:.004,move:1.5,bloomAdd:.004,bloomMax:.02,bloomDec:6},rc:{v:.012,h:.003,hBias:0,adsMul:.6,rec:6},ads:{zoom:.85,t:.14,speed:.75},speed:1,
    reload:{tac:1.1,empty:1.4},equip:.25,fsa:false,price:0,unlock:{start:true},
    blurb:"Found in a coffee can behind the paint thinner. Honest, quick, and older than your marriage."},
  revolver:{name:'The Retirement Plan',short:'.357',slot:'side',ammo:'357',cls:'Revolver',auto:false,dmg:58,head:2.2,pellets:1,rate:.42,mag:6,reserve:36,range:90,fall:[40,90,.75],
    spread:{hip:.02,ads:.002,move:2,bloomAdd:.012,bloomMax:.03,bloomDec:4},rc:{v:.045,h:.012,hBias:0,adsMul:.7,rec:4},ads:{zoom:.8,t:.18,speed:.72},speed:.98,
    reload:{tac:2.2,empty:2.2},equip:.35,fsa:true,price:450,unlock:{buyAfter:0,collect:1},
    blurb:"Six shots. Every one of them a decision you'll have to explain to your financial advisor."},
  nailer:{name:'Weekend Nailer',short:'Nailer',slot:'side',ammo:'nails',cls:'Power tool',auto:true,dmg:11,head:1.5,pellets:1,rate:.075,mag:40,reserve:160,range:26,fall:[8,20,.3],
    spread:{hip:.03,ads:.018,move:1.2,bloomAdd:.002,bloomMax:.02,bloomDec:10},rc:{v:.002,h:.004,hBias:0,adsMul:.8,rec:12},ads:{zoom:.95,t:.1,speed:.85},speed:1.05,
    reload:{tac:1.6,empty:2},equip:.3,fsa:false,price:180,unlock:{any:true,collect:1},
    blurb:"Cordless, 800 nails a minute, and technically a power tool. The warranty does not cover this."},
  shotgun:{name:"Grandpa's Pump",short:'Pump',slot:'prim',ammo:'12ga',cls:'Shotgun',auto:false,dmg:15,head:1.5,pellets:9,rate:.85,mag:6,reserve:36,range:28,fall:[6,24,.2],
    spread:{hip:.075,ads:.055,move:1.3,bloomAdd:0,bloomMax:0,bloomDec:0},rc:{v:.06,h:.02,hBias:0,adsMul:.7,rec:5},ads:{zoom:.9,t:.2,speed:.7},speed:.94,
    reload:{shell:{start:.35,each:.5,end:.25,emptyExtra:.45}},equip:.45,fsa:false,price:0,unlock:{start:true},
    blurb:"Grandpa's. It lived in the garage rafters next to the Christmas lights. He'd want you to oil it more."},
  double:{name:"Uncle Ray's Side-by-Side",short:'Double',slot:'prim',ammo:'12ga',cls:'Shotgun',auto:false,dmg:16,head:1.5,pellets:10,rate:.18,mag:2,reserve:30,range:22,fall:[5,18,.15],
    spread:{hip:.09,ads:.07,move:1.2,bloomAdd:0,bloomMax:0,bloomDec:0},rc:{v:.11,h:.03,hBias:.3,adsMul:.8,rec:3.5},ads:{zoom:.92,t:.22,speed:.7},speed:.95,
    reload:{tac:2,empty:2},equip:.4,fsa:false,price:700,unlock:{buyAfter:2,collect:2},
    blurb:"Uncle Ray says it \"settles disagreements.\" Uncle Ray is no longer invited to Thanksgiving."},
  beanbag:{name:'The Talking-To',short:'Beanbag',slot:'prim',ammo:'bean',cls:'Less-lethal',auto:false,dmg:34,head:1,pellets:1,rate:.8,mag:5,reserve:30,range:40,fall:[25,40,.5],
    spread:{hip:.03,ads:.008,move:1.4,bloomAdd:.006,bloomMax:.02,bloomDec:5},rc:{v:.05,h:.01,hBias:0,adsMul:.7,rec:5},ads:{zoom:.88,t:.2,speed:.7},speed:.95,
    reload:{shell:{start:.35,each:.55,end:.25,emptyExtra:.45}},equip:.45,fsa:true,nonlethal:true,price:600,unlock:{trust:40,gift:'zipties10'},
    blurb:"Never kills. Always makes a point. The orange stock means it's for feelings."},
  rifle:{name:"Rick's Carbine",short:'Carbine',slot:'prim',ammo:'556',cls:'Rifle',auto:true,dmg:24,head:2,pellets:1,rate:.105,mag:30,reserve:180,range:110,fall:[40,110,.7],
    spread:{hip:.02,ads:.006,move:1.7,bloomAdd:.003,bloomMax:.03,bloomDec:7},rc:{v:.009,h:.005,hBias:0,adsMul:.6,rec:7},ads:{zoom:.7,t:.2,speed:.7},speed:.97,
    reload:{tac:1.9,empty:2.4},equip:.4,fsa:false,price:0,unlock:{gift:'rick'},
    blurb:"Rick's spare. Climbs a little; pull down and to the left, same as his lawn mower."},
  smg:{name:'The Carpool',short:'SMG',slot:'prim',ammo:'9mm',cls:'SMG',auto:true,dmg:17,head:1.6,pellets:1,rate:.07,mag:32,reserve:192,range:50,fall:[12,35,.45],
    spread:{hip:.022,ads:.012,move:1.15,bloomAdd:.0025,bloomMax:.025,bloomDec:9},rc:{v:.006,h:.009,hBias:0,adsMul:.7,rec:10},ads:{zoom:.85,t:.13,speed:.8},speed:1.04,
    reload:{tac:1.6,empty:2},equip:.28,fsa:false,price:900,unlock:{buyAfter:1,collect:2},
    blurb:"Named for the minivan it rides in. Rattles like a juice box on a gravel road."},
  hunter:{name:'Deer Season',short:'.308',slot:'prim',ammo:'308',cls:'Bolt-action',auto:false,dmg:95,head:2.5,pellets:1,rate:1.1,mag:5,reserve:25,range:160,fall:[160,160,1],
    spread:{hip:.06,ads:.0005,move:3,bloomAdd:.02,bloomMax:.06,bloomDec:3},rc:{v:.09,h:.01,hBias:0,adsMul:1,rec:3},ads:{zoom:.3,t:.32,speed:.55},speed:.9,
    reload:{tac:2.6,empty:3.1},equip:.55,fsa:true,price:1200,unlock:{buyAfter:2,collect:1},
    blurb:"Deer season never really ended. It just moved to Ridgeview."}};
const GUN_ORDER=['pistol','revolver','nailer','shotgun','double','beanbag','rifle','smg','hunter'];
/* SPEC A.2 feel data: recoil pattern rc.pat, view-model kick vm, sound recipe snd (gunSnd layers), extra mech clicks on reload */
const V=(back,rise,roll,side,k,damp,reloadStyle)=>({back,rise,roll,side,k,damp,reloadStyle});
const FEEL={
  pistol:{pat:[[1,0]],vm:V(.04,.10,.02,.005,140,16,'mag'),snd:{crack:[3200,1.2,.03,.5],body:[2200,.16,.45],thump:['sine',150,45,.12,.32],tail:[900,.35,.12],mech:[]}},
  revolver:{pat:[[1,0]],vm:V(.07,.28,.05,.01,90,11,'cylinder'),snd:{crack:[2600,.9,.04,.7],body:[1500,.25,.7],thump:['sine',110,38,.2,.5],tail:[700,.7,.22,.12,.25],mech:[[.38,3000,.03,.12]]}},
  nailer:{pat:[[1,0]],vm:V(.015,.02,.03,.02,220,22,'tilt'),snd:{crack:[6000,3,.015,.25],body:[4000,.05,.15],thump:['square',220,180,.04,.06],tail:null,mech:[[.03,7000,.08,.08]]}},
  shotgun:{pat:[[1,0]],vm:V(.09,.16,.03,.01,80,10,'shell'),snd:{crack:[1800,.7,.05,.8],body:[900,.4,.9],thump:['sine',90,35,.16,.45],tail:[500,.8,.25],mech:[[.32,2500,.06,.25],[.42,1800,.06,.25]]}},
  double:{pat:[[1,0],[1.25,.4]],vm:V(.12,.22,.06,.015,70,9,'break'),snd:{crack:[1500,.6,.06,1],body:[700,.55,1],thump:['sine',70,28,.25,.6],tail:[400,1.1,.35,.15,.3],mech:[],reloadMech:[[0,3500,.04,.3]],secondPitch:.94}},
  beanbag:{pat:[[1,0]],vm:V(.07,.12,.02,.01,90,12,'shell'),snd:{crack:[1200,1,.04,.45],body:[600,.25,.5],thump:['sine',120,60,.1,.4],tail:[400,.3,.1],mech:[[.32,2750,.06,.25],[.42,1980,.06,.25]],impact:[300,.1]}},
  rifle:{pat:[[1.4,0],[1.3,0],[1.2,0],[1.1,0],[1,0],[1,0],[.7,.6],[.6,.8]],vm:V(.025,.035,.01,.006,160,18,'mag'),snd:{crack:[3500,1.4,.025,.55],body:[3000,.12,.5],thump:['sine',140,40,.1,.3],tail:[1200,.45,.14],mech:[]}},
  smg:{pat:[[1,0],[1,-.3],[1,.3]],vm:V(.018,.02,.015,.012,200,20,'mag'),snd:{crack:[4200,1.6,.02,.4],body:[3500,.07,.35],thump:['triangle',180,60,.06,.2],tail:[1500,.25,.08],mech:[]}},
  hunter:{pat:[[1,0]],vm:V(.10,.20,.02,0,60,8,'bolt'),bolt:.45,snd:{crack:[5000,2,.02,.9],body:[2000,.2,.8],thump:['sine',100,30,.2,.55],tail:[600,1.6,.3,.22,.3],mech:[[.45,2200,.05,.2],[.6,1500,.05,.2]]}}};
/* game-owned feel fields (index.html WEAPONS), kept identical here so the deep merge never changes them:
   chamber (+1 round on a tactical reload), shell (brass type ejected, null = none), shellDelay, quiet (alert radius), root (nail pin chance), scope */
const GAME_FEEL={pistol:{chamber:1,shell:'9mm'},revolver:{shell:null},nailer:{shell:null,quiet:6,root:.2},shotgun:{shell:'12ga',shellDelay:.32},double:{shell:null},
  beanbag:{shell:'bean',shellDelay:.32},rifle:{chamber:1,shell:'556'},smg:{chamber:1,shell:'9mm'},hunter:{shell:'308',shellDelay:.45,scope:true}};
for(const g in GAME_FEEL)Object.assign(GUNS[g],GAME_FEEL[g]);
for(const g in FEEL){Object.assign(GUNS[g].rc,{pat:FEEL[g].pat});GUNS[g].vm=FEEL[g].vm;GUNS[g].snd=FEEL[g].snd;if(FEEL[g].bolt)GUNS[g].bolt=FEEL[g].bolt}
GUNS.nailer.special={rootChance:.2,rootT:.6,quietR:6};GUNS.smg.special={adsBreak:.08};GUNS.hunter.special={scope:true,sway:[.0015,1.3,.0012,.9],laser:.8};
GUNS.double.special={bothBarrelsWindow:.3};GUNS.beanbag.special={surrenderBelow:.6,tracer:'#f08a2c'};
/* SPEC A.3 NPC profiles: enemy [acc,dmg,burst,cooldown,wantMin,wantMax], ally [acc,dmg,cooldown]; dmg may be [near,far,within] */
const NPC_GUNS={
  pistol:{enemy:[.40,9,1,.9,7,15],ally:[.50,24,.75]},revolver:{enemy:[.45,16,1,1.3,8,16],ally:[.55,40,1.1]},nailer:{enemy:[.35,4,6,1,3,8]},
  shotgun:{enemy:[.60,[22,7,8],1,1.4,3,7],ally:[.65,[55,16,9],1.1]},double:{enemy:[.60,[26,8,7],2,1.8,3,6]},rifle:{enemy:[.34,8,3,1.3,7,15],ally:[.42,18,.35]},
  smg:{enemy:[.30,6,5,1.2,4,10]},hunter:{enemy:[.55,24,1,2.6,16,30],laser:.8}};

const ATTACHMENTS={
  reddot:{name:'Red Dot',slot:'optic',price:300,compat:['pistol','revolver','shotgun','beanbag','rifle','smg'],
    fx:'ADS spread ×0.75 · ADS time ×0.9 · wider zoom on scoped-in guns',blurb:"Like a laser pointer, but for responsibility."},
  extmag:{name:'Extended Mag',slot:'mag',price:220,compat:['pistol','nailer','rifle','smg'],
    fx:'Mag ×1.5 · reload ×1.15 · ADS time ×1.1 · equip +0.05 s',blurb:"For the dad who overpacks. Snacks, wipes, and now eighteen rounds."},
  grip:{name:'Foregrip',slot:'under',price:180,compat:['shotgun','beanbag','rifle','smg'],
    fx:'Vertical recoil ×0.75 · sideways ×0.7 · hip spread ×0.9',blurb:"Firm handshake. Steady eye contact. Recoil managed."},
  muffler:{name:'The HOA-Approved Muffler',slot:'muzzle',price:450,compat:['pistol','rifle','smg','hunter'],
    fx:'Quiet shots: enemies hear you at 3 m, not 8 · damage ×0.92',blurb:"Quieter than your neighbor's leaf blower at 7 a.m. on a Sunday."}};
const ATT_SLOTS=[['optic','Optic'],['mag','Magazine'],['under','Underbarrel'],['muzzle','Muzzle']];
for(const g in GUNS)GUNS[g].att=ATT_SLOTS.map(s=>s[0]).filter(sl=>Object.values(ATTACHMENTS).some(a=>a.slot===sl&&a.compat.includes(g)));

/* Furniture. cells = footprint in 1 m decor cells (w×d before rotation); zone in|out|any; model is optional (procedural fallback in home.js). */
const H='assets/home/';
const FURNITURE={
  sofa:{name:'Sectional of Peace',room:'Living room',price:650,cells:[3,1],zone:'in',tags:['seat','seat','tv-facing'],model:H+'Sofa_01.glb',fans:['jen','maddie'],blurb:"Seats three dads, or one dad lying down \"just resting my eyes.\""},
  armchair:{name:'The Thinking Chair',room:'Living room',price:280,cells:[1,1],zone:'in',tags:['seat'],model:H+'ArmChair_01.glb',fans:['jen'],blurb:"Where big decisions get made, like whether to get up."},
  lounge:{name:'Mid-Century Lounger',room:'Living room',price:520,cells:[1,1],zone:'in',tags:['seat'],model:H+'mid_century_lounge_chair.glb',fans:['maddie'],blurb:"It costs more than the minivan's last repair and Maddie finally thinks you have taste."},
  rocker:{name:"Grandpa's Rocker",room:'Porch',price:240,cells:[1,1],zone:'any',tags:['seat'],model:null,fans:['biscuit'],blurb:"Squeaks on the backswing. That's how you know it's working."},
  coffeetable:{name:'Coffee Table',room:'Living room',price:160,cells:[2,1],zone:'in',tags:[],model:H+'modern_coffee_table_01.glb',fans:['jen'],blurb:"Coasters are mandatory. This is not a democracy."},
  tv:{name:'65-Inch TV & Stand',room:'Living room',price:900,cells:[2,1],zone:'in',tags:['tv'],model:H+'kenney_televisionModern.glb',max:1,fans:['maddie','tyler'],blurb:"You can see every blade of grass on the field. And the dust. So much dust."},
  bookshelf:{name:'Bookshelf of Unread Books',room:'Living room',price:220,cells:[2,1],zone:'in',tags:[],model:H+'wooden_bookshelf_worn.glb',fans:['jen'],blurb:"Holds forty books you'll read \"this summer.\""},
  lamp:{name:'Big Floor Lamp',room:'Living room',price:110,cells:[1,1],zone:'in',tags:[],model:H+'kenney_lampRoundFloor.glb',fans:['jen'],blurb:"Turn it off when you leave the room. We don't own the power company."},
  dining:{name:'Dining Table',room:'Dining',price:480,cells:[2,2],zone:'in',tags:['dining'],model:H+'WoodenTable_03.glb',fans:['jen','maddie'],blurb:"Family dinner, phones in the basket. Including yours."},
  roundtable:{name:'Round Breakfast Table',room:'Kitchen',price:340,cells:[2,2],zone:'in',tags:['dining'],model:H+'round_wooden_table_02.glb',fans:['jen'],blurb:"No head of the table. Very diplomatic. Very HOA."},
  chair:{name:'Dining Chair',room:'Dining',price:90,cells:[1,1],zone:'in',tags:['seat'],model:H+'painted_wooden_chair_02.glb',fans:[],blurb:"Wobbles slightly. You'll fix it. You won't."},
  beanbag:{name:'Bean Bag',room:'Kids',price:70,cells:[1,1],zone:'in',tags:['seat'],model:null,fans:['maddie','tyler'],blurb:"Easy to sit in. Impossible to leave with dignity."},
  rug:{name:'Big Area Rug',room:'Living room',price:90,cells:[3,2],zone:'in',tags:['layer:floor'],model:H+'kenney_rugRectangle.glb',layer:'floor',fans:['biscuit'],blurb:"Really ties the room together. Goes under other furniture."},
  roundrug:{name:'Round Rug',room:'Living room',price:75,cells:[2,2],zone:'in',tags:['layer:floor'],model:H+'kenney_rugRounded.glb',layer:'floor',fans:['biscuit'],blurb:"Biscuit already picked the spot where he'll throw up."},
  plant:{name:'Fiddle-Leaf Fig',room:'Anywhere',price:45,cells:[1,1],zone:'any',tags:[],model:H+'potted_plant_04.glb',fans:['jen'],blurb:"Will die. It's not you. It's definitely a little bit you."},
  frame:{name:'Family Portrait',room:'Wall',price:55,cells:[1,1],zone:'in',tags:[],model:H+'fancy_picture_frame_01.glb',fans:['jen'],blurb:"Everyone's eyes are open in this one. A miracle, framed."},
  plaque:{name:"World's Okayest Dad Plaque",room:'Wall',price:60,cells:[1,1],zone:'in',tags:[],model:H+'pixel_award_plaque.glb',fans:['tyler'],blurb:"Tyler made it at camp. It's engraved, so it's legally binding."},
  trophy:{name:'Fantasy League Trophy',room:'Den',price:150,cells:[1,1],zone:'in',tags:[],model:H+'pixel_tall_trophy_cup.glb',fans:[],blurb:"2019 champion. Rick still says the playoffs were rigged."},
  dartboard:{name:'Dartboard',room:'Garage',price:85,cells:[1,1],zone:'in',tags:['play'],model:H+'dartboard.glb',fans:['tyler'],blurb:"The wall around it has seen things."},
  shelves:{name:'Steel Garage Shelving',room:'Garage',price:150,cells:[2,1],zone:'in',tags:[],model:null,hw:true,fans:[],blurb:"A place for everything, and everything on the floor anyway."},
  toolchest:{name:'Rolling Tool Chest',room:'Garage',price:120,cells:[1,1],zone:'in',tags:[],model:H+'metal_tool_chest.glb',hw:true,fans:['tyler'],blurb:"Eleven drawers. Ten of them are just 10 mm sockets you can't find."},
  vice:{name:'Bench Vice',room:'Garage',price:90,cells:[1,1],zone:'in',tags:[],model:H+'bench_vice_01.glb',hw:true,fans:[],blurb:"Grips like Grandpa's handshake."},
  safe:{name:'Combination Safe',room:'Garage',price:400,cells:[1,1],zone:'in',tags:[],model:H+'pixel_combination_safe.glb',hw:true,fans:['jen'],blurb:"The combination is everyone's birthday. You'll forget anyway."},
  minifridge:{name:'Beverage Fridge',room:'Garage',price:300,cells:[1,1],zone:'in',tags:['garage'],model:null,hw:true,fans:[],blurb:"Holds exactly one Saturday's worth of root beer."},
  footlocker:{name:'Army Footlocker',room:'Garage',price:130,cells:[1,1],zone:'in',tags:[],model:H+'pixel_footlocker.glb',hw:true,fans:['tyler'],blurb:"Full of camping gear from the one time you went camping."},
  grill:{name:'Kettle Grill Upgrade',room:'Backyard',price:600,cells:[1,1],zone:'out',tags:['gather'],model:H+'pixel_barbecue_grill.glb',hw:true,max:1,fans:['jen'],blurb:"The second grill. For when the first grill needs backup."},
  picnic:{name:'Picnic Table',room:'Backyard',price:350,cells:[2,2],zone:'out',tags:['seat','seat','dining'],model:null,hw:true,fans:['jen','tyler'],blurb:"Splinters included at no extra charge."},
  patio:{name:'Patio Set',room:'Backyard',price:420,cells:[2,2],zone:'out',tags:['seat','seat'],model:null,hw:true,fans:['jen','maddie'],blurb:"Umbrella opens on the third try, every time."},
  firepit:{name:'Fire Pit',room:'Backyard',price:380,cells:[2,2],zone:'out',tags:['gather'],model:null,hw:true,fans:['maddie','tyler'],blurb:"S'mores, stories, and a long talk about sparks and pajamas."},
  trampoline:{name:'Trampoline',room:'Backyard',price:550,cells:[3,3],zone:'out',tags:['play'],model:null,max:1,fans:['tyler'],blurb:"The net is for safety. Tyler sees it as a challenge."},
  doghouse:{name:'Biscuit Manor',room:'Backyard',price:250,cells:[2,2],zone:'out',tags:['dogbed'],model:H+'pixel_doghouse.glb',hw:true,max:1,fans:['biscuit'],blurb:"Nicer than your first apartment. He will still sleep on your bed."},
  dogbed:{name:'Orthopedic Dog Bed',room:'Anywhere',price:60,cells:[1,1],zone:'any',tags:['dogbed'],model:H+'pixel_pet_bed.glb',hw:true,fans:['biscuit'],blurb:"Memory foam. Biscuit remembers everything anyway."},
  flamingo:{name:'Lawn Flamingo',room:'Backyard',price:15,cells:[1,1],zone:'out',tags:[],model:null,hw:true,fans:['tyler'],hates:['jen'],blurb:"Jen hates it. You'll call him Frank."}};
const FURN_ORDER=Object.keys(FURNITURE);
const FAMILY={jen:{name:'Jen',col:'#c25b7a'},maddie:{name:'Maddie',col:'#4a8a7a'},tyler:{name:'Tyler',col:'#e5a83a'},biscuit:{name:'Biscuit',col:'#d9a45b'}};

/* Consumables, Maple Hardware only. Each sets a flag the next mission reads and clears. */
const SUPPLIES={
  rangeDay:{name:'Range Day Box',price:40,flag:'rangeDay',fx:'+1 extra mag of every ammo type at the next mission',blurb:"Bulk ammo, the same way you buy paper towels: too much, and proud of it."},
  zipPack:{name:'Zip-Tie Contractor Pack',price:30,flag:'zipPack',fx:'Zip-tie 25% faster during the next mission',blurb:"Five hundred zip-ties. Also good for cable management, which you will never do."},
  icePack:{name:'Ice Packs & Ibuprofen',price:35,flag:'icePack',fx:'Your crew gets back up 30% faster during the next mission',blurb:"For hamstrings, lower backs and the knee you hurt getting out of the van."}};
/* Gadgets (Hank's Hardware, "Gadgets" tab). Kept forever in SAVE.gadgets[id]={owned,equipped,charge?}; equipped = shows up on its key in the field. */
const GADGETS={
  flashlight:{name:"Dad's Maglite",price:0,key:'F',free:true,fx:'Toggle with F · runs forever · doubles as a doorstop',on:'Clip it on',off:'Leave it in the junk drawer',
    blurb:"Four D-cells and thirty years of \"who touched my flashlight.\" Nobody touched your flashlight."},
  nvg:{name:'NightOwl Gen-1 Goggles',price:650,key:'N',battery:240,fx:'Toggle with N · battery 4 min · recharges at home',on:'Strap them on',off:'Put them back in the box',
    blurb:"Doug owns two pairs. He won't say why. Now you own one, and you also won't say why."}};
const GADGET_ORDER=['flashlight','nvg'];

const STORES={
  dadazon:{name:'Dadazon',who:'Kitchen desk · Laptop',tag:'Free shipping on everything. Boxes land on your porch after your next job.',tabs:[['guns','Guns'],['att','Attachments'],['furn','Furniture'],['resale','Resale']],deliver:'pending'},
  hardware:{name:"Hank's Hardware",sub:'& Sporting',who:'Maple Street · Since 1962',tag:'Take it home today. Neighbors save 10%.',tabs:[['guns','Guns'],['att','Attachments'],['furn','Furniture'],['sup','Supplies'],['gad','Gadgets']],deliver:'now',discount:{hood:'trust',at:60}},
  mart:{name:'Ramos Corner Mart',who:'Riverside Flats · Open late',tag:'"Your friend with the mustache bought all my beef jerky." Mrs. Ramos',tabs:[['sup','Supplies'],['stick','Stickers']],deliver:'now',discount:{hood:'trustR',at:60}},
  auto:{name:"Dad's Auto",who:'Route 9 · Sal Benedetto, proprietor',tabs:[['perf','Performance'],['prot','Protection'],['util','Utility'],['looks','Looks'],['cars','Vehicles'],['repair','Repair']],deliver:'now',
    lines:["Every van's a sports car if you believe in it.","I put a V6 in a minivan once. The man cried. Good tears.","Bull bar's off a snowplow. It's fine. It's mostly fine.",
      "You want the spinners? I'm not going to stop you. I'm going to judge you.","Everybody calls me Dad, including my actual dad."],
    lineRosa:"Your nurse friend told me to stop eating gas station sushi. I'm considering it."}};
/* Vehicle data (VEH, upgrade CATALOG, COSMETICS, HORNS) lives in js/carai.js as HT.Garage: read it there, not here. */
const CATALOG={missions:MISSIONS,ammo:AMMO,guns:GUNS,gunOrder:GUN_ORDER,npcGuns:NPC_GUNS,attachments:ATTACHMENTS,attSlots:ATT_SLOTS,furniture:FURNITURE,furnOrder:FURN_ORDER,
  supplies:SUPPLIES,gadgets:GADGETS,gadgetOrder:GADGET_ORDER,stores:STORES,family:FAMILY,get garage(){return HT.Garage||null}};
HT.CATALOG=CATALOG;

/* =====================================================================
   SAVE  (localStorage 'ht-save': v1 per SPEC E, v2 per SPEC2 D, v3 per SPEC3 4.0/4.8, plus optional extension fields)
   ===================================================================== */
const SAVE_KEY='ht-save',BAK_KEY='ht-save-bak',PREV_KEY='ht-save-prev',BAD_KEY='ht-save-corrupt',SAVE_V=3;
const isObj=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const clone=o=>JSON.parse(JSON.stringify(o));
const num=(v,d)=>typeof v==='number'&&isFinite(v)?v:d;
const clampN=(v,a,b)=>v<a?a:v>b?b:v;
/* starter furniture: HT.Home (js/home.js) owns the house and its 0.5 m grid, so its starter layout is the default when loaded.
   The fallback below is the same layout (for Node and pages without THREE). OLD_STARTER = the SPEC.md 1 m coordinates, migrated away. */
const HOME_STARTER=[{uid:'st1',id:'sofa',x:8,z:2,r:1},{uid:'st2',id:'coffeetable',x:11,z:3,r:1},{uid:'st3',id:'armchair',x:12,z:6,r:2},{uid:'st4',id:'dining',x:12,z:13,r:1},
  {uid:'st5',id:'chair',x:11,z:15,r:1},{uid:'st6',id:'chair',x:15,z:14,r:3},{uid:'st7',id:'dogbed',x:16,z:8,r:0},{uid:'st8',id:'picnic',x:2,z:28,r:0}];
const OLD_STARTER=JSON.stringify([{uid:'st1',id:'sofa',x:22,z:8,r:0},{uid:'st2',id:'coffeetable',x:22,z:10,r:0},{uid:'st3',id:'armchair',x:28,z:9,r:3},
  {uid:'st4',id:'dining',x:34,z:20,r:0},{uid:'st5',id:'chair',x:33,z:20,r:1},{uid:'st6',id:'chair',x:36,z:20,r:3},{uid:'st7',id:'dogbed',x:36,z:12,r:0},{uid:'st8',id:'picnic',x:20,z:32,r:0}]);
function starterPlaced(){try{if(HT.Home&&HT.Home.starterLayout)return clone(HT.Home.starterLayout().items)}catch(e){}return clone(HOME_STARTER)}
/* garage shape (SPEC2 D); HT.Garage.defaultGarage is used when js/carai.js is loaded, this copy otherwise */
const defVehicle=()=>HT.Garage?HT.Garage.defaultVehicle():{paint:'slate',rims:'steel',tint:'none',lightBar:false,spoiler:false,perf:{engine:0,tyres:0,brakes:0,sport:false},prot:{bullBar:false,armor:0}};
const defGarage=()=>HT.Garage?HT.Garage.defaultGarage():{active:'minivan',owned:['minivan'],purchases:0,dirt:0,vehicles:{minivan:defVehicle()},hp:{minivan:100},
  util:{cargo:false,rack:false,aid:false},stickers:[null,null,null],ownedStickers:[],horn:'stock',ownedHorns:['stock'],ownedCos:{paint:['slate'],rims:['steel'],tint:['none']}};
const WORLD_PINS=['home','hank','auto','gas','mart','community','church','garden','depot','earl'];
const SAVE_DEFAULT=()=>({v:SAVE_V,t:0,
  prog:{done:Array(MISSION_COUNT).fill(false),trust:12,trustR:5,act:1,cuffed:0,downed:0,shotSurr:0,missionsRun:0},
  cash:0,stats:{earned:0,spent:0},
  owned:{guns:['pistol','shotgun'],att:[]},
  attOn:{},
  loadout:{side:'pistol',p1:'shotgun',p2:null,p3:null},
  armory:{seen:{}},
  pending:[],
  furniture:{owned:{sofa:1,coffeetable:1,armchair:1,dining:1,chair:2,dogbed:1,picnic:1},placed:starterPlaced()},
  family:{firstVisit:true,seen:[],pets:0,lastShotSurr:0},
  crew:{rosa:false},
  events:[],
  base:{visited:false,met:false,range:{},rentals:0,eggs:{},tank:{borrows:0,shots:0,crushed:0},jet:{flights:0,boom:false,bridge:false,buzz:false,ejects:0}},   /* Fort Sensible (js/base.js, docs/base.md): range bests per gun, easter eggs found */
  flags:{rangeDay:false,beanbagGift:false,zipPack:false,icePack:false,hotPursuit:false,act2Intro:false,hankDiscount:false},
  world:{bridgeOpen:false,visited:{river:false},pins:['home','hank','auto','gas'],scrubbed:[],scrubTrust:0,tier:0,lastPos:null,hotPursuitAt:0,households:[],storefronts:{}},
  garage:defGarage(),
  /* v3 (SPEC3 4.0, 4.5, 4.8). Crew strand perks live in perks[crewId]=true, not crew[id].perk: crew[id] stays the v2 boolean index.html tests for truthiness. */
  day:1,calendar:{entries:[]},album:[],gear:[],perks:{},jobs:{},
  gadgets:{nvg:{owned:false,equipped:true,charge:1},flashlight:{owned:true,equipped:true}}});
/* SAVE.jobs[id]: one per job id, legacy MISSIONS ids and any id a js/jobs/* file registers at runtime. best={t,score,trustGain,clean} (each field its own personal best) */
const JOB_DEFAULT=()=>({done:false,best:null,medal:0,runs:0,replays:0,plan:null,medalPaid:0});
const ALBUM_MAX=24,MEDAL_PAY={2:100,3:250};

/* Fill missing keys from defaults, keep unknown keys (other modules may add their own), reject wrong types. */
function deepMerge(def,s){
  if(!isObj(s))return clone(def);
  const out={};
  for(const k in def){const d=def[k],v=s[k];
    if(isObj(d))out[k]=deepMerge(d,v);
    else if(Array.isArray(d))out[k]=Array.isArray(v)?clone(v):clone(d);
    else if(d===null)out[k]=v===undefined?null:v;
    else if(typeof d==='boolean'&&(v===0||v===1))out[k]=!!v;
    else out[k]=typeof v===typeof d?v:d}
  for(const k in s)if(!(k in def))out[k]=clone(s[k]);
  return out}

/* Old shapes we may meet: v0 = the pre-save prototype ({done,trust,cash,guns}); v1 = SPEC.md E (+ this module's early 'vehicle' extension). */
const V1_PAINT={stock:'slate',beige:'sand',blue:'slate',red:'cranberry',green:'forest',yellow:'orange',black:'black'},V1_RIMS={stock:'steel',steel:'steel',chrome:'chrome',gold:'gold',offroad:'alloy'};
const MIGRATIONS={
  0:s=>{const o={v:1};
    o.prog=isObj(s.prog)?s.prog:{done:s.done,trust:s.trust,cuffed:s.cuffed,downed:s.downed,shotSurr:s.shotSurr,missionsRun:s.missionsRun};
    for(const k in o.prog)if(o.prog[k]===undefined)delete o.prog[k];
    o.cash=s.cash;
    if(Array.isArray(s.guns))o.owned={guns:s.guns.slice(),att:Array.isArray(s.att)?s.att.slice():[]};
    else if(isObj(s.owned))o.owned=s.owned;
    for(const k in s)if(!(k in o)&&!['done','trust','cuffed','downed','shotSurr','missionsRun','guns','att'].includes(k))o[k]=s[k];
    o.v=1;return o},
  1:s=>{ /* SPEC2 D */
    const d=s.prog&&Array.isArray(s.prog.done)?s.prog.done:[];s.prog=isObj(s.prog)?s.prog:{};s.prog.done=[...d,...Array(MISSION_COUNT).fill(false)].slice(0,MISSION_COUNT);
    const w=isObj(s.world)?s.world:{};
    if(s.prog.trustR==null)s.prog.trustR=typeof w.trust2==='number'?w.trust2:5;
    s.prog.act=s.prog.done.slice(0,4).every(Boolean)?2:1;
    s.world={bridgeOpen:s.prog.act===2};for(const k in w)if(!['trust2','done2','places','hood'].includes(k))s.world[k]=w[k];
    if(isObj(s.loadout)&&!('p3' in s.loadout))s.loadout.p3=null;
    if(isObj(s.vehicle)&&!s.garage){const v=s.vehicle,g=defGarage(),mv=g.vehicles.minivan;
      mv.perf.engine=Math.min(3,v.engine|0);mv.perf.tyres=Math.min(2,v.tyres|0);mv.perf.brakes=Math.min(2,v.brakes|0);
      mv.prot.bullBar=!!v.bullBar;mv.prot.armor=Math.min(2,v.panels|0);mv.lightBar=!!v.lightBar;
      g.util.cargo=!!v.roofBox;g.util.rack=!!v.gunRack;g.util.aid=!!v.medkit;
      mv.paint=V1_PAINT[v.paint]||'slate';mv.rims=V1_RIMS[v.rims]||'steel';mv.tint=['none','light','limo'][v.tint|0]||'none';
      g.ownedCos.paint=[...new Set(['slate',...((v.cos&&v.cos.paint)||[]).map(x=>V1_PAINT[x]).filter(Boolean)])];
      g.ownedCos.rims=[...new Set(['steel',...((v.cos&&v.cos.rims)||[]).map(x=>V1_RIMS[x]).filter(Boolean)])];
      g.ownedCos.tint=['none',...(mv.tint!=='none'?[mv.tint]:[])];s.garage=g}
    delete s.vehicle;s.v=2;return s},
  2:s=>{ /* SPEC3 4.0: prog.done (by MISSIONS index) -> jobs[id].done + a bronze calendar pin on day 1. prog.done itself stays (index.html reads it). */
    const d=s.prog&&Array.isArray(s.prog.done)?s.prog.done:[];
    const jobs=isObj(s.jobs)?s.jobs:{},cal=isObj(s.calendar)&&Array.isArray(s.calendar.entries)?s.calendar:{entries:[]};let n=0;
    MISSIONS.forEach((m,i)=>{if(!d[i])return;n++;const j=jobs[m.id]=Object.assign(JOB_DEFAULT(),isObj(jobs[m.id])?jobs[m.id]:{});
      j.done=true;j.medal=Math.max(1,num(j.medal,0));j.medalPaid=Math.max(j.medalPaid|0,j.medal);j.runs=Math.max(1,num(j.runs,0));
      if(!cal.entries.some(e=>isObj(e)&&e.id===m.id))cal.entries.push({id:m.id,day:1,medal:j.medal,best:{t:null,trustGain:null,clean:false},runs:j.runs})});
    s.jobs=jobs;s.calendar=cal;if(typeof s.day!=='number')s.day=1+n;
    s.v=3;return s}};
function migrate(s){
  let v=typeof s.v==='number'?s.v:0,guard=0;
  while(v<SAVE_V&&MIGRATIONS[v]&&guard++<20){s=MIGRATIONS[v](s);v=s.v}
  return s}

function sanitizeGarage(s){const g=s.garage,G=HT.Garage,def=defGarage();
  const VT=G?Object.keys(G.VEH).filter(k=>G.VEH[k].price!=null):['minivan','workvan','pickup','suv'];
  g.owned=[...new Set(['minivan',...(Array.isArray(g.owned)?g.owned:[]).filter(t=>VT.includes(t))])];
  if(!g.owned.includes(g.active))g.active='minivan';
  if(!isObj(g.vehicles))g.vehicles={};
  for(const k in g.vehicles)if(!g.owned.includes(k))delete g.vehicles[k];
  const P=G?G.COSMETICS.paint:null,RIMS=G?Object.keys(G.COSMETICS.rims):['steel','alloy','chrome','spinner','gold'],TINT=G?Object.keys(G.COSMETICS.tint):['none','light','limo'];
  for(const t of g.owned){const v=g.vehicles[t]=deepMerge(defVehicle(),g.vehicles[t]);
    v.perf.engine=clampN(Math.floor(num(v.perf.engine,0)),0,3);v.perf.tyres=clampN(Math.floor(num(v.perf.tyres,0)),0,2);v.perf.brakes=clampN(Math.floor(num(v.perf.brakes,0)),0,2);
    v.perf.sport=!!v.perf.sport;v.prot.armor=clampN(Math.floor(num(v.prot.armor,0)),0,2);v.prot.bullBar=!!v.prot.bullBar;v.lightBar=!!v.lightBar;v.spoiler=!!v.spoiler;
    if(P&&!P[v.paint])v.paint='slate';if(!RIMS.includes(v.rims))v.rims='steel';if(!TINT.includes(v.tint))v.tint='none'}
  if(!isObj(g.hp))g.hp={};
  for(const k in g.hp)if(!g.owned.includes(k))delete g.hp[k];
  for(const t of g.owned){const mx=vehMaxHp(t,g);g.hp[t]=clampN(num(g.hp[t],mx),0,mx)}
  /* wear the HP bar can't show: smashed lamps [front A, front B, rear A, rear B] and a flat tyre, per owned vehicle; Sal's tab (an unpaid tow) */
  if(!isObj(g.wear))g.wear={};for(const k in g.wear)if(!g.owned.includes(k))delete g.wear[k];
  for(const t of g.owned){const w=isObj(g.wear[t])?g.wear[t]:{};g.wear[t]={lamps:[0,1,2,3].map(i=>Array.isArray(w.lamps)&&w.lamps[i]?1:0),tyre:w.tyre?1:0}}
  g.tab=Math.max(0,Math.round(num(g.tab,0)));g.patchAt=Math.max(0,Math.floor(num(g.patchAt,0)));
  g.util=deepMerge(def.util,g.util);for(const k in g.util)g.util[k]=!!g.util[k];
  g.purchases=Math.max(0,Math.floor(num(g.purchases,0)));g.dirt=clampN(num(g.dirt,0),0,100);
  const SN=G?G.COSMETICS.stickers.length:12,okSt=i=>Number.isInteger(i)&&i>=0&&i<SN;
  g.ownedStickers=[...new Set(g.ownedStickers.filter(okSt))];g.stickers=[0,1,2].map(i=>okSt(g.stickers[i])&&g.ownedStickers.includes(g.stickers[i])?g.stickers[i]:null);
  const HN=G?Object.keys(G.HORNS):['stock'];g.ownedHorns=[...new Set(['stock',...g.ownedHorns.filter(h=>HN.includes(h))])];if(!g.ownedHorns.includes(g.horn))g.horn='stock';
  g.ownedCos=deepMerge(def.ownedCos,g.ownedCos);
  g.ownedCos.paint=[...new Set(['slate',...g.ownedCos.paint.filter(x=>!P||P[x])])];g.ownedCos.rims=[...new Set(['steel',...g.ownedCos.rims.filter(x=>RIMS.includes(x))])];
  g.ownedCos.tint=[...new Set(['none',...g.ownedCos.tint.filter(x=>TINT.includes(x))])];
  for(const t of g.owned){const v=g.vehicles[t];if(!g.ownedCos.paint.includes(v.paint))v.paint='slate';if(!g.ownedCos.rims.includes(v.rims))v.rims='steel';if(!g.ownedCos.tint.includes(v.tint))v.tint='none'}
  if(!g.util.rack)s.loadout.p3=null}
function vehMaxHp(type,g){const v=g.vehicles[type]||defVehicle();if(HT.Garage)return HT.Garage.apply(type,v,g.util).hp;return({minivan:100,workvan:130,pickup:120,suv:140}[type]||100)+[0,40,90][v.prot.armor|0]}
function sanitize(s){
  s=deepMerge(SAVE_DEFAULT(),s);s.v=SAVE_V;
  const p=s.prog;
  p.done=MISSIONS.map((m,i)=>!!(Array.isArray(p.done)&&p.done[i]));
  p.trust=clampN(num(p.trust,12),0,100);p.trustR=clampN(num(p.trustR,5),0,100);p.act=p.act===2?2:1;
  for(const k of['cuffed','downed','shotSurr','missionsRun'])p[k]=Math.max(0,Math.floor(num(p[k],0)));
  s.cash=Math.max(0,Math.round(num(s.cash,0)));
  s.stats.earned=Math.max(0,num(s.stats.earned,0));s.stats.spent=Math.max(0,num(s.stats.spent,0));
  const uniq=a=>[...new Set(a)];
  s.owned.guns=uniq(['pistol','shotgun',...s.owned.guns.filter(g=>GUNS[g])]);
  s.owned.att=uniq(s.owned.att.filter(a=>ATTACHMENTS[a]));
  const attOn={};
  for(const g of s.owned.guns){const cur=isObj(s.attOn[g])?s.attOn[g]:{};const row={};
    for(const[sl]of ATT_SLOTS){const a=cur[sl];row[sl]=a&&ATTACHMENTS[a]&&ATTACHMENTS[a].slot===sl&&ATTACHMENTS[a].compat.includes(g)&&s.owned.att.includes(a)?a:null}
    if(GUNS[g].att.length)attOn[g]=row}
  s.attOn=attOn;
  const L=s.loadout,own=g=>g&&GUNS[g]&&s.owned.guns.includes(g);
  if(!(own(L.side)&&GUNS[L.side].slot==='side'))L.side='pistol';
  if(!(own(L.p1)&&GUNS[L.p1].slot==='prim'))L.p1=own(L.p2)&&GUNS[L.p2].slot==='prim'?L.p2:'shotgun';
  if(!(own(L.p2)&&GUNS[L.p2].slot==='prim'&&L.p2!==L.p1))L.p2=null;
  if(!(own(L.p3)&&GUNS[L.p3].slot==='prim'&&L.p3!==L.p1&&L.p3!==L.p2))L.p3=null;
  for(const k in L)if(!['side','p1','p2','p3'].includes(k))delete L[k];
  const seen={};for(const g in s.armory.seen)if(GUNS[g])seen[g]=Math.max(0,Math.floor(num(s.armory.seen[g],0)));s.armory.seen=seen;
  s.pending=s.pending.filter(e=>isObj(e)&&((e.kind==='gun'&&GUNS[e.id])||(e.kind==='att'&&ATTACHMENTS[e.id])||(e.kind==='furn'&&FURNITURE[e.id])));
  const fo={};for(const f in s.furniture.owned)if(FURNITURE[f])fo[f]=Math.max(0,Math.floor(num(s.furniture.owned[f],0)));
  const uids=new Set(),placed=[];
  for(const e of s.furniture.placed){if(!isObj(e)||!FURNITURE[e.id])continue;
    const x=num(e.x,NaN),z=num(e.z,NaN);if(!isFinite(x)||!isFinite(z))continue;
    let uid=typeof e.uid==='string'&&e.uid?e.uid:'f'+Math.random().toString(36).slice(2,8);while(uids.has(uid))uid+='x';uids.add(uid);
    placed.push({uid,id:e.id,x:Math.round(x),z:Math.round(z),r:((Math.round(num(e.r,0))%4)+4)%4})}
  s.furniture.placed=JSON.stringify(placed)===OLD_STARTER?starterPlaced():placed;
  for(const e of placed)fo[e.id]=Math.max(fo[e.id]||0,placed.filter(q=>q.id===e.id).length);
  s.furniture.owned=fo;
  sanitizeGarage(s);
  const w=s.world;w.pins=w.pins.filter(x=>WORLD_PINS.includes(x));w.scrubbed=w.scrubbed.filter(x=>typeof x==='string'||typeof x==='number');
  w.scrubTrust=Math.max(0,num(w.scrubTrust,0));w.tier=Math.max(0,Math.floor(num(w.tier,0)));w.bridgeOpen=!!w.bridgeOpen;
  if(!(isObj(w.lastPos)&&isFinite(w.lastPos.x)&&isFinite(w.lastPos.z)))w.lastPos=null;
  s.crew.rosa=!!s.crew.rosa;
  sanitizeV3(s);
  s.family.seen=s.family.seen.filter(x=>typeof x==='string');
  s.events=s.events.filter(x=>typeof x==='string').slice(-50);
  for(const k in s.flags)s.flags[k]=!!s.flags[k];
  s.t=num(s.t,0);
  return s}

const optN=v=>typeof v==='number'&&isFinite(v)?v:null;
const normBest=(b,keys)=>{if(!isObj(b))return null;const o={};for(const k of keys)o[k]=k==='clean'?!!b[k]:optN(b[k]);return o};
function normJob(j){j=deepMerge(JOB_DEFAULT(),j);j.done=!!j.done;
  for(const k of['medal','medalPaid'])j[k]=clampN(Math.floor(num(j[k],0)),0,3);for(const k of['runs','replays'])j[k]=Math.max(0,Math.floor(num(j[k],0)));
  j.best=normBest(j.best,['t','score','trustGain','clean']);if(!isObj(j.plan))j.plan=null;return j}
function sanitizeV3(s){const w=s.world;
  s.day=Math.max(1,Math.floor(num(s.day,1)));
  const jobs={};for(const id in s.jobs)if(isObj(s.jobs[id]))jobs[id]=normJob(s.jobs[id]);s.jobs=jobs;
  MISSIONS.forEach((m,i)=>{if(s.prog.done[i]){const j=jobs[m.id]=jobs[m.id]||JOB_DEFAULT();j.done=true}});
  const seen=new Set();s.calendar.entries=s.calendar.entries.filter(e=>isObj(e)&&typeof e.id==='string'&&!seen.has(e.id)&&seen.add(e.id)).map(e=>(
    {id:e.id,day:Math.max(1,Math.floor(num(e.day,1))),medal:clampN(Math.floor(num(e.medal,0)),0,3),best:normBest(e.best,['t','trustGain','clean'])||{t:null,trustGain:null,clean:false},runs:Math.max(0,Math.floor(num(e.runs,0)))}));
  s.album=capAlbum(s.album.filter(p=>isObj(p)));
  w.households=[...new Set(w.households.filter(x=>typeof x==='string'))];if(!isObj(w.storefronts))w.storefronts={};
  s.gear=s.gear.filter(g=>isObj(g)&&typeof g.id==='string');
  for(const k in s.perks)s.perks[k]=!!s.perks[k];
  for(const k in s.gadgets){const g=s.gadgets[k];if(!isObj(g)){delete s.gadgets[k];continue}g.owned=!!g.owned;g.equipped=g.equipped!==false;if('charge'in g)g.charge=clampN(num(g.charge,1),0,1)}
  s.gadgets.flashlight.owned=true}
/* album cap: oldest goes first, but 3-star photos outlive the rest */
function capAlbum(a){while(a.length>ALBUM_MAX){const i=a.findIndex(p=>!(p.stars>=3));a.splice(i<0?0:i,1)}return a}

/* ---------- v3 helpers (pure: pass a save object, or null for the live one; the live one emits change events and schedules a write) ---------- */
function jobRec(s,id){s=S(s);return s.jobs[id]=isObj(s.jobs[id])?s.jobs[id]:JOB_DEFAULT()}
/* r={ok,t,score,medal,replay,trustGain,clean,story}. story:false = a repeatable side job (no day passes). Returns {medalUp,bonus,first,rec}.
   bonus = [CAL] medal-upgrade pay (+100 silver, +250 gold), each once per job, only on a run that improves a medal you already had; the caller pays it. */
function recordRun(s,id,r){s=S(s);r=r||{};const j=jobRec(s,id),replay=!!r.replay,ok=!!r.ok;
  j.runs++;if(replay)j.replays++;
  const out={medalUp:false,bonus:0,first:false,rec:j};
  if(ok){const b=j.best||(j.best={t:null,score:null,trustGain:null,clean:false}),t=optN(r.t),sc=optN(r.score),tg=optN(r.trustGain);
    if(t!=null&&(b.t==null||t<b.t))b.t=t;if(sc!=null&&(b.score==null||sc>b.score))b.score=sc;if(tg!=null&&(b.trustGain==null||tg>b.trustGain))b.trustGain=tg;if(r.clean)b.clean=true;
    const m=clampN(Math.floor(num(r.medal,1)),0,3),prev=j.medal,had=j.done||prev>0;
    if(m>prev){j.medal=m;out.medalUp=true}
    if(had&&m>prev)for(const k of[2,3])if(m>=k&&j.medalPaid<k)out.bonus+=MEDAL_PAY[k];
    j.medalPaid=Math.max(j.medalPaid,m);
    if(!replay&&!j.done){j.done=true;out.first=true}
    let e=s.calendar.entries.find(x=>x.id===id);
    if(!e){e={id,day:s.day,medal:0,best:{t:null,trustGain:null,clean:false},runs:0};s.calendar.entries.push(e)}
    e.medal=j.medal;e.best={t:b.t,trustGain:b.trustGain,clean:b.clean};
    if(!replay&&r.story!==false)s.day++}
  const e=s.calendar.entries.find(x=>x.id===id);if(e)e.runs=j.runs;
  if(mine(s))Save.touch('jobs','calendar','day');
  return out}
/* photo={id,job,item,stars,day,jpg}; same id replaces; returns the stored photo */
function addPhoto(s,p){s=S(s);if(!isObj(p))return null;p=Object.assign({id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),job:null,item:null,stars:0,day:s.day,jpg:null},p);
  const i=s.album.findIndex(x=>x.id===p.id);if(i>=0)s.album.splice(i,1);s.album.push(p);capAlbum(s.album);
  if(mine(s))Save.touch('album');return p}
/* returns true when the household is new */
function household(s,id){s=S(s);const h=s.world.households;if(h.includes(id))return false;h.push(id);if(mine(s))Save.touch('world');return true}
/* storefront(s,id) reads, storefront(s,id,state) sets; returns the state */
function storefront(s,id,state){s=S(s);const f=s.world.storefronts;if(state===undefined)return f[id];if(f[id]!==state){f[id]=state;if(mine(s))Save.touch('world')}return state}
function gadget(s,id){s=S(s);return s.gadgets[id]=isObj(s.gadgets[id])?s.gadgets[id]:{owned:!!(GADGETS[id]&&GADGETS[id].free),equipped:true}}
/* perk(s,id) reads, perk(s,id,true) grants */
function perk(s,id,on){s=S(s);if(on!==undefined){on=!!on;if(!!s.perks[id]!==on){s.perks[id]=on;if(mine(s))Save.touch('perks')}}return!!s.perks[id]}

/* storage adapter: localStorage in the browser, HTDesktop.storage in the desktop shell, a Map elsewhere (tests can swap it with Save.useStorage) */
function memStore(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
let store=(()=>{/* desktop shell (desktop/preload.js): a file in the user's profile folder instead of localStorage */if(root.HTDesktop&&root.HTDesktop.storage)return root.HTDesktop.storage;
  try{if(root.localStorage){const k='__ht_probe';root.localStorage.setItem(k,'1');root.localStorage.removeItem(k);return root.localStorage}}catch(e){}return memStore()})();
const sGet=k=>{try{return store.getItem(k)}catch(e){return null}};
const sSet=(k,v)=>{try{store.setItem(k,v);return true}catch(e){return false}};
const sDel=k=>{try{store.removeItem(k)}catch(e){}};

const listeners={};
function emit(key,val,old){for(const k of[key,'*'])for(const f of(listeners[k]||[]).slice()){try{f(val,old,key)}catch(e){console.error(e)}}}
let data=null,boundProg=null,timer=null,lastLoad={status:'fresh'};

function parseRaw(raw){
  if(raw==null||raw==='')return{state:'empty'};
  let s;try{s=JSON.parse(raw)}catch(e){return{state:'bad',err:'not JSON'}}
  if(s===null)return{state:'empty'};
  if(!isObj(s))return{state:'bad',err:'not an object'};
  if(typeof s.v==='number'&&s.v>SAVE_V)return{state:'future',s};
  return{state:'ok',s,migrated:(s.v||0)<SAVE_V}}

function attachProg(){if(!boundProg)return;Object.assign(boundProg,data.prog);data.prog=boundProg}
/* a job in progress (SAV-04): what it earns (zip-ties, trust) is only committed when the job is won. jobOpen() keeps the
   pre-job values; until jobCommit() every write and every 'saved' listener sees the save as it was before the job, plus any trust
   the job LOST (penalties are never undone by quitting). jobRollback() puts the live prog back the same way (quit, abandon, fail). */
const JOB_GAIN=['cuffed','trust','trustR'];
let jobHold=null;
function jobView(p){const o={};if(!jobHold||!p)return o;for(const k of JOB_GAIN){const b=jobHold[k],v=p[k];if(typeof b!=='number'||typeof v!=='number')continue;o[k]=k==='cuffed'?b:Math.min(v,b)}return o}
function committed(){if(!data)return data;const p=boundProg||data.prog;if(!jobHold)return data;return Object.assign({},data,{prog:Object.assign({},p,jobView(p))})}

const Save={
  KEY:SAVE_KEY,VERSION:SAVE_V,
  defaults:SAVE_DEFAULT,starterPlaced,migrate,sanitize,MIGRATIONS,
  jobRec,recordRun,album:addPhoto,household,storefront,gadget,perk,jobDefault:JOB_DEFAULT,ALBUM_MAX,MEDAL_PAY,
  get data(){if(!data)Save.load();return data},
  get lastLoad(){return lastLoad},
  useStorage(s){store=s||memStore();data=null;return store},
  memoryStorage:memStore,
  load(){
    const r=parseRaw(sGet(SAVE_KEY));let s=null;
    if(r.state==='ok'){s=r.s;lastLoad={status:r.migrated?'migrated':'ok',from:r.s.v||0}}
    else if(r.state==='empty'){s=null;lastLoad={status:'fresh'}}
    else{
      if(r.state==='bad'){sSet(BAD_KEY,sGet(SAVE_KEY)||'')}else sSet('ht-save-future',sGet(SAVE_KEY)||'');
      const b=parseRaw(sGet(BAK_KEY));
      if(b.state==='ok'){s=b.s;lastLoad={status:'recovered',why:r.state==='bad'?r.err:'newer version'}}
      else{s=null;lastLoad={status:'reset',why:r.state==='bad'?r.err:'newer version'}}}
    try{data=sanitize(s?migrate(s):SAVE_DEFAULT())}catch(e){data=SAVE_DEFAULT();lastLoad={status:'reset',why:String(e&&e.message||e)}}
    attachProg();
    if(lastLoad.status!=='ok'&&lastLoad.status!=='fresh')Save.saveNow();
    emit('load',data);return data},
  /* debounced write; call freely after every change */
  save(){if(!data)return;clearTimeout(timer);timer=setTimeout(()=>Save.saveNow(),250)},
  saveNow(){if(!data)return false;clearTimeout(timer);timer=null;
    if(boundProg)data.prog=boundProg;
    data.t=Date.now();
    const prev=sGet(SAVE_KEY);if(prev&&parseRaw(prev).state==='ok')sSet(BAK_KEY,prev);
    const out=committed();
    const ok=sSet(SAVE_KEY,JSON.stringify(out));emit('saved',out);return ok},
  flush(){if(timer)Save.saveNow()},
  /* a new game: the old save moves to the 'previous' slot (Save.restorePrevious brings it back) instead of being deleted */
  reset(){clearTimeout(timer);timer=null;jobHold=null;
    if(data){if(boundProg)data.prog=boundProg;if(Save.hasProgress(data))sSet(PREV_KEY,JSON.stringify(data))}
    sDel(SAVE_KEY);sDel(BAK_KEY);data=SAVE_DEFAULT();attachProg();Save.saveNow();
    for(const k in data)emit(k,data[k]);emit('load',data);return data},
  hasProgress(d){d=d||data;return!!(d&&d.prog&&((d.prog.missionsRun||0)>0||(d.cash||0)>0||(d.stats&&d.stats.spent||0)>0))},
  /* the save a New game replaced: {t,cash,jobs} or null */
  previous(){const r=parseRaw(sGet(PREV_KEY));if(r.state!=='ok')return null;const p=r.s.prog||{},j=r.s.jobs&&typeof r.s.jobs==='object'?r.s.jobs:{};
    return{t:r.s.t||0,cash:r.s.cash||0,jobs:Object.keys(j).filter(k=>j[k]&&j[k].done).length,runs:p.missionsRun||0}},
  /* swap the current save and the previous slot (so a restore can itself be undone) */
  restorePrevious(){const r=parseRaw(sGet(PREV_KEY));if(r.state!=='ok')return false;clearTimeout(timer);timer=null;jobHold=null;
    if(data){if(boundProg)data.prog=boundProg;if(Save.hasProgress(data))sSet(PREV_KEY,JSON.stringify(data));else sDel(PREV_KEY)}
    const old=data;data=sanitize(migrate(r.s));attachProg();sDel(BAK_KEY);Save.saveNow();lastLoad={status:'ok',from:r.s.v||0};
    for(const k in data)emit(k,data[k],old&&old[k]);emit('load',data);return true},
  /* jobs (SAV-04): open when a job starts, commit when it is won, roll back on quit/abandon/fail */
  jobOpen(){const p=boundProg||(data&&data.prog);if(!p)return;jobHold={};for(const k of JOB_GAIN)jobHold[k]=p[k]},
  get jobOpenNow(){return!!jobHold},
  jobCommit(){if(!jobHold)return;jobHold=null;Save.save()},
  jobRollback(){if(!jobHold)return false;const p=boundProg||(data&&data.prog),v=jobView(p);jobHold=null;let ch=false;
    if(p)for(const k in v)if(p[k]!==v[k]){p[k]=v[k];ch=true}if(ch){emit('prog',p);Save.save()}return ch},
  /* what the open job has earned so far ({cuffed,trust,trustR} >= 0), for a checkpoint to hand back on a retry from it */
  jobGain(){const p=boundProg||(data&&data.prog);if(!jobHold||!p)return null;const g={};for(const k of JOB_GAIN)g[k]=Math.max(0,(+p[k]||0)-(+jobHold[k]||0));return g},
  jobApply(g){const p=boundProg||(data&&data.prog);if(!g||!p)return;for(const k of JOB_GAIN)if(+g[k]>0)p[k]=k==='cuffed'?(p[k]|0)+(g[k]|0):Math.min(100,(+p[k]||0)+(+g[k]))},
  /* the save as it would be written now (an open job's gains left out) */
  committed(){if(!data)Save.load();return committed()},
  /* link the game's live prog object: SAVE.prog becomes that same object */
  bindProg(p){boundProg=p;if(data)attachProg();return p},
  on(key,f){(listeners[key]=listeners[key]||[]).push(f);return()=>Save.off(key,f)},
  off(key,f){const a=listeners[key];if(a){const i=a.indexOf(f);if(i>=0)a.splice(i,1)}},
  emit,
  /* after changing Save.data directly, announce what changed and schedule a write */
  touch(...keys){for(const k of keys)emit(k,Save.data[k]);Save.save()},
  get(path){let o=Save.data;for(const k of String(path).split('.')){if(o==null)return undefined;o=o[k]}return o},
  set(path,val){const ks=String(path).split('.');let o=Save.data;for(let i=0;i<ks.length-1;i++){if(!isObj(o[ks[i]]))o[ks[i]]={};o=o[ks[i]]}
    const old=o[ks[ks.length-1]];o[ks[ks.length-1]]=val;emit(ks[0],Save.data[ks[0]],ks.length===1?old:undefined);Save.save();return val},
  addCash(n,why){const d=Save.data,old=d.cash;d.cash=Math.max(0,Math.round(old+n));if(n>0)d.stats.earned+=n;emit('cash',d.cash,old,why);Save.save();return d.cash},
  /* text save code: HT1-<base64 json>-<checksum> */
  export(){if(boundProg)Save.data.prog=boundProg;const j=JSON.stringify(Save.data);return'HT1-'+b64e(j)+'-'+fnv(j)},
  import(code){
    try{const c=String(code||'').replace(/\s+/g,'');const m=/^HT1-([A-Za-z0-9+/=_-]+)-([0-9a-f]{8})$/.exec(c);
      if(!m)return{ok:false,error:"That doesn't look like a High Trust save code."};
      const j=b64d(m[1]);if(fnv(j)!==m[2])return{ok:false,error:'The code is damaged (checksum mismatch). Copy the whole thing.'};
      const r=parseRaw(j);if(r.state==='future')return{ok:false,error:'This code is from a newer version of the game.'};
      if(r.state!=='ok')return{ok:false,error:'The code is damaged.'};
      const old=data;data=sanitize(migrate(r.s));attachProg();Save.saveNow();
      for(const k in data)emit(k,data[k],old&&old[k]);emit('load',data);return{ok:true}}
    catch(e){return{ok:false,error:'The code is damaged.'}}}};
function fnv(str){let h=0x811c9dc5;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return('0000000'+h.toString(16)).slice(-8)}
function b64e(str){const u=unescape(encodeURIComponent(str));return(typeof btoa==='function'?btoa(u):Buffer.from(u,'binary').toString('base64')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function b64d(b){b=b.replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';const u=typeof atob==='function'?atob(b):Buffer.from(b,'base64').toString('binary');return decodeURIComponent(escape(u))}
if(hasDOM){root.addEventListener('pagehide',()=>Save.flush());root.addEventListener('beforeunload',()=>Save.flush())}
HT.Save=Save;

/* =====================================================================
   ECONOMY
   ===================================================================== */
const money=n=>(n<0?'−$':'$')+Math.abs(Math.round(n)).toLocaleString('en-US');
const S=s=>s||Save.data;
const mine=s=>s===data;
function missionOf(m){if(typeof m==='number')return MISSIONS[m];if(typeof m==='string')return MISSIONS.find(x=>x.id===m||x.giver===m);if(isObj(m))return missionOf(m.i!=null?m.i:m.id);return null}

/* condition {done:i} | {trust:n}; returns null when met, else a human reason */
function condReason(c,s){
  if(!c)return null;const p=S(s).prog;
  if(c.done!=null&&!p.done[c.done])return'Unlocks after "'+MISSIONS[c.done].title+'"';
  if(c.trust!=null&&p.trust<c.trust)return'Unlocks at '+c.trust+'% neighborhood trust';
  return null}

function gunAvail(id,s){s=S(s);const g=GUNS[id],u=g.unlock;
  const seen=s.armory.seen[id]||0,collect=u.collect?{n:Math.min(seen,u.collect),need:u.collect}:null;
  if(s.owned.guns.includes(id))return{owned:true,collect,how:u.start?'start':u.gift==='rick'?'gift':seen>=(u.collect||1e9)?'collected':'bought'};
  if(s.pending.some(e=>e.kind==='gun'&&e.id===id))return{pending:true,collect};
  if(u.gift==='rick')return{buyable:false,reason:'Coach Rick has this one',collect};
  let reason=null;
  if(u.buyAfter!=null&&!s.prog.done[u.buyAfter])reason='Back-ordered until after "'+MISSIONS[u.buyAfter].title+'"';
  if(u.trust!=null&&s.prog.trust<u.trust)reason='Back-ordered until '+u.trust+'% neighborhood trust';
  return{buyable:!reason,reason,collect}}

function basePrice(kind,id,s){s=S(s);
  if(kind==='gun')return GUNS[id].price;if(kind==='att')return ATTACHMENTS[id].price;if(kind==='furn')return FURNITURE[id].price;
  if(kind==='sup')return SUPPLIES[id].price;if(kind==='gad')return GADGETS[id]?GADGETS[id].price:0;
  if(GARAGE_KINDS.includes(kind))return garPrice(kind,id,s);
  return 0}
function discountFor(store,s){s=S(s);const st=STORES[store];
  if(store==='auto')return(s.garage.purchases||0)>=5?.05:0;
  if(store==='hardware'&&s.flags.hankDiscount)return .1; /* SPEC3 2.17: Hank's lifetime 10% (same size as the neighbor discount; they don't stack) */
  if(st&&st.discount)return(s.prog[st.discount.hood]||0)>=st.discount.at?.1:0;return 0}
function priceOf(kind,id,store,s){const b=basePrice(kind,id,s),d=discountFor(store,s);return{price:Math.round(b*(1-d)),base:b,discount:d}}

/* Full status of a catalogue entry in a store: what the buy button should say. */
function status(kind,id,store,s){if(kind==='resale')return HT.Resale.status(id);s=S(s);const pr=priceOf(kind,id,store,s),cash=s.cash;
  const out={kind,id,store,price:pr.price,base:pr.base,discount:pr.discount,state:'buy',reason:null};
  const afford=()=>{if(out.state==='buy'&&cash<out.price){out.state='poor';out.short=out.price-cash}return out};
  if(kind==='gun'){const a=gunAvail(id,s);out.collect=a.collect;
    if(a.owned){out.state=Object.values(s.loadout).includes(id)?'equipped':'owned';out.how=a.how;return out}
    if(a.pending){out.state='pending';return out}
    if(!a.buyable){out.state='locked';out.reason=a.reason;return out}
    return afford()}
  if(kind==='att'){if(s.owned.att.includes(id)){out.state=Object.values(s.attOn).some(r=>r&&Object.values(r).includes(id))?'equipped':'owned';return out}
    if(s.pending.some(e=>e.kind==='att'&&e.id===id)){out.state='pending';return out}return afford()}
  if(kind==='furn'){const f=FURNITURE[id];if(store==='hardware'&&!f.hw){out.state='locked';out.reason='Dadazon only';return out}
    const pend=s.pending.filter(e=>e.kind==='furn'&&e.id===id).length,have=(s.furniture.owned[id]||0)+pend;out.have=have;out.pend=pend;
    if(f.max&&have>=f.max){if(pend){out.state='pending';return out}out.state='maxed';out.reason=f.max===1?"You've got one. One is plenty.":'That is enough of those.';return out}
    return afford()}
  if(kind==='sup'){if(s.flags[SUPPLIES[id].flag]){out.state='owned';out.reason='Packed for the next job';return out}return afford()}
  if(kind==='gad'){if(!GADGETS[id]){out.state='locked';out.reason='Unknown item';return out}const g=gadget(s,id);
    if(g.owned){out.state=g.equipped?'equipped':'owned';return out}if(store!=='hardware'){out.state='locked';out.reason="Only at Hank's Hardware";return out}return afford()}
  if(GARAGE_KINDS.includes(kind)){if(!HT.Garage){out.state='locked';out.reason="Dad's Auto is closed (js/carai.js not loaded)";return out}
    garStatus(kind,id,store,s,out);return afford()}
  out.state='locked';out.reason='Unknown item';return out}

/* ---------- Dad's Auto: thin layer over HT.Garage (js/carai.js), the single source of vehicle truth ----------
   kinds: gar  = an HT.Garage.CATALOG id (eng1, tyre2, bull, cargo, v_pickup, ...)
          car  = a vehicle type you own or can buy (minivan, workvan, pickup, suv): owned -> "drive this one"
          cos  = 'paint:silver' | 'rims:alloy' | 'tint:light' | 'lightBar:amber' | 'spoiler:on' | 'horn:ode'
          stick= sticker index into HT.Garage.COSMETICS.stickers          rep = 'active' (repair at $2/HP) */
const GARAGE_KINDS=['gar','car','cos','stick','rep'];
const doneIds=s=>MISSIONS.filter((m,i)=>s.prog.done[i]).map(m=>m.id);
function garCtx(s){const G=HT.Garage,g=s.garage;return{owned:G.ownedIds(g),trust:s.prog.trust,trustR:s.prog.trustR,done:doneIds(s),cash:s.cash}}
const actV=s=>s.garage.vehicles[s.garage.active];
function cosReq(r,s){if(!r)return null;if(r.trustR!=null&&s.prog.trustR<r.trustR)return'Needs Riverside trust '+r.trustR+'%';if(r.done){for(const d of r.done)if(!doneIds(s).includes(d))return'Unlocks after '+MISSIONS.find(m=>m.id===d).title}return null}
const STICKER_REQ={10:{done:['earl']},11:{trustR:70,mart:true}};
function garPrice(kind,id,s){const G=HT.Garage;if(!G)return 0;const C=G.COSMETICS;
  if(kind==='gar'){const it=G.CATALOG.find(c=>c.id===id);return it?it.price:0}
  if(kind==='car')return G.VEH[id]&&G.VEH[id].price||0;
  if(kind==='stick')return C.sticker;
  if(kind==='rep')return repPrice(id,s);
  const[gp,o]=id.split(':');
  if(gp==='paint')return(C.paint[o]||{}).price||0;if(gp==='rims')return C.rims[o]||0;if(gp==='tint')return(C.tint[o]||[0,0])[1];
  if(gp==='lightBar')return C.lightBar.amber.price;if(gp==='spoiler')return C.spoiler;if(gp==='horn')return(G.HORNS[o]||{}).price||0;return 0}
function garStatus(kind,id,store,s,out){const G=HT.Garage,g=s.garage,v=actV(s);const set=(st,r)=>{out.state=st;if(r)out.reason=r};
  if(kind==='gar'){const it=G.CATALOG.find(c=>c.id===id);out.item=it;
    if(G.ownedIds(g).includes(id))return set(it.group==='vehicle'?'owned':'equipped');
    const r=G.req(id,garCtx(s));if(r)set('locked',r);return}
  if(kind==='car'){out.item=G.VEH[id];if(g.owned.includes(id))return set(g.active===id?'equipped':'owned');const r=G.req('v_'+id,garCtx(s));if(r)set('locked',r);return}
  if(kind==='rep'){const q=repairQuote(s);out.hp=q.hp;out.maxHp=q.maxHp;out.car=q.car;
    if(!q.total)return set('maxed',q.car.own?'Not a scratch on her':'Not a scratch on it. '+q.car.owner+' will never know.');
    if(id==='lights'&&!q.rows.some(r=>r.id==='lights'))return set('maxed','Every lamp works');
    if(id==='tyre'&&!q.rows.some(r=>r.id==='tyre'))return set('maxed','Four round tyres');
    if(id==='patch'&&out.price<2)return set('locked','Sal needs at least $2 to pick up a hammer');return}
  if(kind==='stick'){const i=+id;if(g.stickers.includes(i))return set('equipped');if(g.ownedStickers.includes(i))return set('owned');
    const q=STICKER_REQ[i];if(q){if(q.mart&&store!=='mart')return set('locked','Only at Ramos Corner Mart');const r=cosReq(q,s);if(r)set('locked',r)}return}
  const[gp,o]=id.split(':'),C=G.COSMETICS;
  if(gp==='paint'||gp==='rims'||gp==='tint'){if(v[gp]===o)return set('equipped');if(g.ownedCos[gp].includes(o))return set('owned');
    if(gp==='paint'){const r=cosReq((C.paint[o]||{}).req,s);if(r)set('locked',r)}return}
  if(gp==='lightBar'){if(v.lightBar)return set('equipped');const r=cosReq(C.lightBar.amber.req,s);if(r)set('locked',r);return}
  if(gp==='spoiler'){if(v.spoiler||v.perf.sport)return set('equipped',v.perf.sport&&!v.spoiler?'Comes with Sport Mode':null);return}
  if(gp==='horn'){if(g.horn===o)return set('equipped');if(g.ownedHorns.includes(o))return set('owned');if(o==='entertainer'){const r=cosReq({done:['benny']},s);if(r)set('locked',r)}return}}
/* applies a paid purchase (status already checked) */
function garApply(kind,id,s,st){const G=HT.Garage,g=s.garage,v=actV(s);
  if(kind==='gar'||kind==='car'){const before=vehMaxHp(g.active,g);const r=G.buy(g,kind==='car'?'v_'+id:id,Object.assign(garCtx(s),{cash:1e12}));
    if(r.ok&&kind==='gar'){const after=vehMaxHp(g.active,g);g.hp[g.active]=Math.min(after,(g.hp[g.active]||before)+(after-before))}
    return}
  g.purchases=(g.purchases||0)+(kind==='rep'?0:1);
  if(kind==='rep'){repApply(id,s,st);return}
  if(kind==='stick'){const i=+id;g.ownedStickers.push(i);putSticker(g,i);return}
  const[gp,o]=id.split(':');
  if(gp==='paint'||gp==='rims'||gp==='tint'){g.ownedCos[gp].push(o);v[gp]=o}
  else if(gp==='lightBar')v.lightBar=true;else if(gp==='spoiler')v.spoiler=true;
  else if(gp==='horn'){g.ownedHorns.push(o);g.horn=o}}
/* ---------- repairs: whichever car the dad pulls in with ----------
   The game hands Dad's Auto the car being driven with Economy.setRepairCar(t) (a borrowed neighbour's car); without one the
   active owned vehicle is repaired straight in SAVE.garage (hp + wear). t = {name, owner, type, own, hp, maxHp, lamps:[4], tyre, color, onRepair(fix, info)}.
   Prices: $2 per HP (dents above 50% are body work, below it the engine), $30 a lamp, $45 a tyre; Dad's Auto's family discount applies. */
let REPAIR_CAR=null;
function setRepairCar(t){REPAIR_CAR=t||null}
function repCar(s){if(REPAIR_CAR)return REPAIR_CAR;const g=s.garage,w=(g.wear&&g.wear[g.active])||{lamps:[0,0,0,0],tyre:0};
  return{own:true,type:g.active,name:HT.Garage&&HT.Garage.VEH[g.active]?HT.Garage.VEH[g.active].name:g.active,hp:g.hp[g.active],maxHp:vehMaxHp(g.active,g),lamps:w.lamps,tyre:w.tyre}}
const REP_LAMP=30,REP_TYRE=45;
function repairQuote(s){s=S(s);const t=repCar(s),mx=t.maxHp||100,hp=clampN(num(t.hp,mx),0,mx),D=mx-hp,eng=Math.max(0,Math.min(D,mx*.5-hp)),body=D-eng,
    lamps=(t.lamps||[]).filter(Boolean).length,tyre=t.tyre?1:0,rows=[];
  if(body>.5)rows.push({id:'body',label:'Body work',detail:Math.round(body)+' HP of dents, scrapes and a bumper held on by hope',price:Math.ceil(body*2)});
  if(eng>.5)rows.push({id:'engine',label:'Engine & radiator',detail:hp<=0?"Broken down. Sal: \"She's not dead. She's resting.\"":Math.round(eng)+' HP · steam, smoke, the noise',price:Math.ceil(eng*2)});
  if(lamps)rows.push({id:'lights',label:'Lights',detail:lamps+' smashed lamp'+(lamps>1?'s':''),price:lamps*REP_LAMP});
  if(tyre)rows.push({id:'tyre',label:'Tyre',detail:'Flat. Thump, thump, thump.',price:REP_TYRE});
  return{car:t,rows,total:rows.reduce((a,r)=>a+r.price,0),hp,maxHp:mx}}
function repPrice(id,s){const q=repairQuote(s),row=k=>(q.rows.find(r=>r.id===k)||{price:0}).price;
  if(id==='lights'||id==='tyre')return row(id);
  if(id==='patch'){const d=discountFor('auto',s);return Math.max(0,Math.min(q.total-1,Math.floor(s.cash/(1-d)/2)*2))}
  return q.total}
/* what a repair job leaves the car at: {hp, lamps, tyre} */
function repFix(id,s,st){const q=repairQuote(s),t=q.car,f={hp:q.hp,lamps:(t.lamps||[0,0,0,0]).slice(0,4),tyre:t.tyre?1:0};
  if(id==='lights')f.lamps=[0,0,0,0];else if(id==='tyre')f.tyre=0;
  else if(id==='patch')f.hp=Math.min(q.maxHp,q.hp+(st?st.base:repPrice('patch',s))/2);/* the engine first: it is the bottom of the bar */
  else{f.hp=q.maxHp;f.lamps=[0,0,0,0];f.tyre=0}
  return f}
function repApply(id,s,st){const t=repCar(s),f=repFix(id,s,st),g=s.garage;
  if(t.own&&!REPAIR_CAR){g.hp[g.active]=f.hp;g.wear=g.wear||{};g.wear[g.active]={lamps:f.lamps,tyre:f.tyre}}
  else{t.hp=f.hp;t.lamps=f.lamps;t.tyre=f.tyre}
  if(t.onRepair)try{t.onRepair(f,{id})}catch(e){console.error(e)}
  return f}
/* a tow from Dad's Auto: paid in cash, or the rest goes on Sal's tab (paid off from the next payout) */
function towCharge(fee,s){s=S(s);const old=s.cash,paid=Math.min(fee,Math.max(0,s.cash)),owe=fee-paid;s.cash-=paid;s.stats.spent+=paid;s.garage.tab=(s.garage.tab||0)+owe;
  if(mine(s)){if(paid)emit('cash',s.cash,old);Save.touch('garage','stats')}return{paid,tab:owe,owed:s.garage.tab}}
function putSticker(g,i){if(g.stickers.includes(i))return;const e=g.stickers.indexOf(null);if(e>=0)g.stickers[e]=i;else{g.stickers.shift();g.stickers.push(i)}}
/* free actions on things you already own: drive another car, re-apply a cosmetic, (un)stick a sticker */
function garUse(kind,id,s){s=S(s);const g=s.garage,v=actV(s);
  if(kind==='car'){if(!g.owned.includes(id))return{ok:false,reason:"You don't own that one."};g.active=id}
  else if(kind==='stick'){const i=+id;if(!g.ownedStickers.includes(i))return{ok:false,reason:'Buy it first.'};const k=g.stickers.indexOf(i);if(k>=0)g.stickers[k]=null;else putSticker(g,i)}
  else if(kind==='cos'){const[gp,o]=id.split(':');
    if(gp==='horn'){if(!g.ownedHorns.includes(o))return{ok:false,reason:'Buy it first.'};g.horn=o}
    else if(['paint','rims','tint'].includes(gp)){if(!g.ownedCos[gp].includes(o))return{ok:false,reason:'Buy it first.'};v[gp]=o}
    else return{ok:false,reason:'Nothing to change.'}}
  else return{ok:false,reason:'Nothing to change.'};
  if(mine(s))Save.touch('garage');return{ok:true}}

const canAfford=(price,s)=>S(s).cash>=price;
/* equip / unequip an owned gadget (on = true|false, or omitted to toggle) */
function gadgetUse(id,on,s){s=S(s);if(!GADGETS[id])return{ok:false,reason:'Unknown gadget.'};const g=gadget(s,id);
  if(!g.owned)return{ok:false,reason:'Buy it first.'};g.equipped=on===undefined?!g.equipped:!!on;if(mine(s))Save.touch('gadgets');return{ok:true,equipped:g.equipped}}

function buy(kind,id,store,s){s=S(s);store=store||'hardware';
  const st=status(kind,id,store,s);
  if(st.state==='poor')return{ok:false,reason:'Not enough cash. You need '+money(st.short)+' more.',code:'poor',status:st};
  if(st.state==='locked')return{ok:false,reason:/^Back-ordered/.test(st.reason||'')?'back-ordered: '+st.reason:st.reason,code:'locked',status:st};
  if(st.state!=='buy')return{ok:false,reason:st.state==='maxed'?st.reason:'Already yours.',code:st.state,status:st};
  const oldCash=s.cash;s.cash-=st.price;s.stats.spent+=st.price;
  const deliverLater=STORES[store]&&STORES[store].deliver==='pending'&&(kind==='gun'||kind==='att'||kind==='furn');
  let ev=null;
  if(deliverLater){s.pending.push(kind==='gun'?{kind,id,paid:st.price}:{kind,id});}
  else if(kind==='gun'){s.owned.guns.push(id);ev='boughtGun';autoSlot(id,s)}
  else if(kind==='att'){s.owned.att.push(id);ev='boughtAttachment';autoAttach(id,s)}
  else if(kind==='furn'){s.furniture.owned[id]=(s.furniture.owned[id]||0)+1;ev='boughtFurniture'}
  else if(kind==='sup'){s.flags[SUPPLIES[id].flag]=true}
  else if(kind==='gad'){const g=gadget(s,id);g.owned=true;g.equipped=true;if(GADGETS[id].battery)g.charge=1}
  else if(GARAGE_KINDS.includes(kind)){garApply(kind,id,s,st);if(kind!=='rep')ev='boughtCar'}
  if(ev)s.events.push(ev);
  if(mine(s)){emit('cash',s.cash,oldCash);Save.touch('owned','pending','furniture','garage','flags','loadout','attOn','events','stats','gadgets')}
  return{ok:true,price:st.price,delivered:deliverLater?'pending':'now',status:st}}

/* a new gun fills an empty primary slot; a new attachment goes on the first owned compatible gun with that slot free */
function autoSlot(id,s){const L=s.loadout;if(GUNS[id].slot!=='prim'||[L.p1,L.p2,L.p3].includes(id))return;if(!L.p2)L.p2=id;else if(!L.p3&&s.garage.util.rack)L.p3=id}
function autoAttach(id,s){const a=ATTACHMENTS[id];const order=[s.loadout.p1,s.loadout.p2,s.loadout.side,...s.owned.guns].filter(Boolean);
  for(const g of order){if(!a.compat.includes(g)||!s.owned.guns.includes(g))continue;const row=s.attOn[g]=s.attOn[g]||{optic:null,mag:null,under:null,muzzle:null};if(!row[a.slot]){row[a.slot]=id;return g}}return null}

function sellValue(kind,id,s){if(kind==='gun'){const g=GUNS[id];if(g.unlock.start||g.unlock.gift==='rick')return 0;return Math.round(g.price*.5)}
  if(kind==='att')return Math.round(ATTACHMENTS[id].price*.5);if(kind==='furn')return Math.round(FURNITURE[id].price*.5);return 0}
function sell(kind,id,s){s=S(s);const v=sellValue(kind,id,s);
  if(kind==='gun'){if(!s.owned.guns.includes(id))return{ok:false,reason:"You don't own that."};
    if(!v)return{ok:false,reason:GUNS[id].unlock.gift?"Rick would never forgive you.":"Grandpa would never forgive you."};
    if(s.loadout.side===id||s.loadout.p1===id)return{ok:false,reason:'Unequip it first.'};
    if(s.loadout.p2===id)s.loadout.p2=null;s.owned.guns=s.owned.guns.filter(g=>g!==id);delete s.attOn[id]}
  else if(kind==='att'){if(!s.owned.att.includes(id))return{ok:false,reason:"You don't own that."};
    s.owned.att=s.owned.att.filter(a=>a!==id);for(const g in s.attOn)for(const sl in s.attOn[g])if(s.attOn[g][sl]===id)s.attOn[g][sl]=null}
  else if(kind==='furn'){const own=s.furniture.owned[id]||0,placed=s.furniture.placed.filter(p=>p.id===id).length;
    if(own-placed<1)return{ok:false,reason:own?'Pick it up off the floor first (Decorate mode).':"You don't own that."};
    s.furniture.owned[id]=own-1}
  else return{ok:false,reason:"Lug Nuts & Sons doesn't do refunds."};
  const old=s.cash;s.cash+=v;
  if(mine(s)){emit('cash',s.cash,old);Save.touch('owned','loadout','attOn','furniture')}
  return{ok:true,amount:v}}

/* Dadazon orders arrive at home. Returns what arrived. */
function deliverPending(s){s=S(s);const got=s.pending.splice(0);
  for(const e of got){
    if(e.kind==='gun'&&!s.owned.guns.includes(e.id)){s.owned.guns.push(e.id);autoSlot(e.id,s);s.events.push('boughtGun')}
    else if(e.kind==='att'&&!s.owned.att.includes(e.id)){s.owned.att.push(e.id);autoAttach(e.id,s);s.events.push('boughtAttachment')}
    else if(e.kind==='furn'){s.furniture.owned[e.id]=(s.furniture.owned[e.id]||0)+1;s.events.push('boughtFurniture')}}
  if(got.length&&mine(s))Save.touch('owned','pending','furniture','loadout','attOn','events');
  return got}

/* Armory (SPEC B.5): count one distinct enemy's gun; unlocks when the threshold is reached. */
function collectGun(id,s){s=S(s);if(!GUNS[id])return{unlocked:false};const need=GUNS[id].unlock.collect;
  s.armory.seen[id]=(s.armory.seen[id]||0)+1;
  let unlocked=false;if(need&&s.armory.seen[id]>=need&&!s.owned.guns.includes(id)){s.owned.guns.push(id);s.events.push('armory');unlocked=true;
    /* a Dadazon order for the same gun is cancelled: refund what was paid for it so the purchase isn't lost */
    const refund=s.pending.filter(e=>e.kind==='gun'&&e.id===id).reduce((t,e)=>t+(+e.paid||0),0);
    s.pending=s.pending.filter(e=>!(e.kind==='gun'&&e.id===id));if(refund>0){const old=s.cash;s.cash+=refund;s.stats.spent=Math.max(0,s.stats.spent-refund);if(mine(s))emit('cash',s.cash,old)}}
  if(mine(s))Save.touch('armory','owned','events','pending');
  return{unlocked,n:s.armory.seen[id],need:need||0,name:GUNS[id].name}}

/* Loadout rules (SPEC C.4) */
function setLoadout(slot,gun,s){s=S(s);const L=s.loadout;
  if(!['side','p1','p2','p3'].includes(slot))return{ok:false,reason:'No such slot.'};
  if(slot==='p3'&&!s.garage.util.rack)return{ok:false,code:'rack',reason:"Needs the gun rack from Dad's Auto."};
  if(gun==null){if(slot==='p1'||slot==='side')return{ok:false,reason:slot==='p1'?'Primary 1 can\'t be empty.':'You need a sidearm.'};L[slot]=null}
  else{if(!GUNS[gun])return{ok:false,reason:'Unknown gun.'};
    if(!s.owned.guns.includes(gun))return{ok:false,reason:"You don't own the "+GUNS[gun].name+' yet.'};
    if(slot==='side'&&GUNS[gun].slot!=='side')return{ok:false,reason:'That one is too big for a holster.'};
    if(slot!=='side'&&GUNS[gun].slot!=='prim')return{ok:false,reason:'Sidearms go in the sidearm slot.'};
    const dup=slot==='side'?null:['p1','p2','p3'].find(k=>k!==slot&&L[k]===gun);
    if(dup)return{ok:false,code:'dup',reason:"It's already in "+SLOT_NAME[dup]+'.'};
    L[slot]=gun}
  if(mine(s))Save.touch('loadout');
  return{ok:true,loadout:Object.assign({},L)}}
const SLOT_NAME={side:'Sidearm',p1:'Primary 1',p2:'Primary 2',p3:'Gun rack'};
function swapPrimaries(s){s=S(s);const L=s.loadout;if(!L.p2)return{ok:false,reason:'Primary 2 is empty.'};[L.p1,L.p2]=[L.p2,L.p1];if(mine(s))Save.touch('loadout');return{ok:true}}
function setAttachment(gun,slot,att,s){s=S(s);
  if(!s.owned.guns.includes(gun))return{ok:false,reason:"You don't own that gun."};
  if(att){const a=ATTACHMENTS[att];if(!a||a.slot!==slot)return{ok:false,reason:'Wrong slot.'};if(!a.compat.includes(gun))return{ok:false,reason:"Doesn't fit the "+GUNS[gun].name+'.'};
    if(!s.owned.att.includes(att))return{ok:false,reason:'Buy it first.'}}
  const row=s.attOn[gun]=s.attOn[gun]||{optic:null,mag:null,under:null,muzzle:null};row[slot]=att||null;
  if(mine(s))Save.touch('attOn');return{ok:true}}

/* Effective weapon stats with attachments (SPEC D.4). attOn = {optic,mag,under,muzzle} or omitted. */
function weaponStats(id,attOn){const w=clone(GUNS[id]);if(!w)return null;
  const on=attOn===undefined?(data&&data.attOn[id])||{}:attOn||{};
  const mul={spread:1,adsT:1,rv:1,rh:1,equip:0,dmg:1};w.muffled=false;w.attOn=Object.assign({optic:null,mag:null,under:null,muzzle:null},on);
  if(on.optic==='reddot'){w.spread.ads*=.75;w.ads.t*=.9;if(w.ads.zoom<.82)w.ads.zoom=.82;mul.adsT*=.9}
  if(on.mag==='extmag'){w.mag=Math.round(w.mag*1.5);const r=w.reload;if(r.tac)r.tac*=1.15;if(r.empty)r.empty*=1.15;if(r.shell){for(const k in r.shell)r.shell[k]*=1.15}w.ads.t*=1.1;w.equip+=.05;mul.adsT*=1.1;mul.equip+=.05}
  if(on.under==='grip'){w.rc.v*=.75;w.rc.h*=.7;w.spread.hip*=.9;w.equip+=.05;w.speed-=.01;mul.rv*=.75;mul.rh*=.7;mul.spread*=.9;mul.equip+=.05}
  if(on.muzzle==='muffler'){w.muffled=true;w.dmg*=.92;w.fall[1]*=.85;w.hearR=3;w.hearLos=10;mul.dmg*=.92}else{w.hearR=8;w.hearLos=26}
  w.attMul=mul;return w}

/* 0-10 bars. sqrt for stats that span orders of magnitude. */
const BAR_DEFS=[
  ['dmg','Damage',w=>Math.sqrt(w.dmg*w.pellets*Math.pow(w.head,.3))],
  ['rate','Fire rate',w=>Math.sqrt(w.mag>2?1/w.rate:2/(w.rate+(w.reload.tac||2)))],
  ['range','Range',w=>w.fall[1]],
  ['acc','Accuracy',w=>Math.sqrt(1/w.spread.ads)],
  ['ctl','Control',w=>Math.sqrt(1/(w.rc.v+w.rc.h))],
  ['hand','Handling',w=>1/(w.ads.t+w.equip)],
  ['mob','Mobility',w=>w.speed*w.ads.speed/w.spread.move]];
const BAR_MAX={};for(const[k,,f]of BAR_DEFS)BAR_MAX[k]=Math.max(...GUN_ORDER.map(g=>f(GUNS[g])));
function gunBars(w){if(typeof w==='string')w=weaponStats(w);return BAR_DEFS.map(([k,label,f])=>({k,label,v:Math.max(.3,Math.min(10,10*f(w)/BAR_MAX[k]))}))}

/* Active vehicle, straight from HT.Garage.apply (fields: maxSpeed, boostMax, accel, boostAccel, brake, hbrake, grip, steerResp, turn, hp,
   bulletMul, ramDealtFront, impactTakenFront, sport*, ammoBonus, slots, firstAid, ...) plus the cosmetics and HT.Vehicles.make options. */
function vehicleStats(s,type){s=S(s);const G=HT.Garage,g=s.garage;type=type||g.active;const v=g.vehicles[type]||defVehicle();
  const st=G?G.apply(type,v,g.util):{type,maxSpeed:25,boostMax:33,accel:9,boostAccel:12,brake:24,grip:9,hp:100,bulletMul:1,ammoBonus:g.util.cargo?2:0,slots:g.util.rack?4:3,firstAid:!!g.util.aid,stock:true};
  st.curHp=g.hp[type]!=null?g.hp[type]:st.hp;st.active=type===g.active;
  st.paint=Object.assign({id:v.paint},G?G.COSMETICS.paint[v.paint]:{hex:'#35577d',finish:'solid'});st.rims=v.rims;st.tint=v.tint;st.lightBar=v.lightBar;st.spoiler=!!(v.spoiler||v.perf.sport);
  st.horn={id:g.horn,notes:G?G.hornNotes(g.horn):null};st.stickers=g.stickers.map(i=>i==null?null:G?G.COSMETICS.stickers[i]:String(i));
  st.makeOpts=G?G.vehicleOpts(g,type):{color:st.paint.hex,upgrades:{}};return st}
const VBAR=[['top','Top speed',st=>st.boostMax/40],['accel','Acceleration',st=>st.boostAccel/20],['hand','Handling',st=>st.grip/16],['brake','Braking',st=>st.brake/40],['tough','Toughness',st=>st.hp/240]];
function vanBars(st){return VBAR.map(([k,label,f])=>({k,label,v:Math.max(.3,Math.min(10,10*f(st)))}))}
/* stats as they would be after buying/using an item (for the comparison bars and the live preview) */
function vanStatsWith(kind,id,s){s=S(s);const c=clone(s);c.cash=1e12;
  if(kind==='car'){if(!c.garage.owned.includes(id)){c.garage.owned.push(id);c.garage.vehicles[id]=defVehicle()}c.garage.active=id}
  else if(kind==='stick'){}else if(HT.Garage){const st=status(kind,id,'auto',c);if(st.state==='buy')garApply(kind,id,c);else garUse(kind,id,c)}
  return vehicleStats(c)}

/* ammo carried by a loadout (SPEC B.6: per type, the largest reserve among guns using it) */
function ammoFor(s,loadout){s=S(s);const L=loadout||s.loadout,vs=vehicleStats(s);const by={};
  for(const g of[L.side,L.p1,L.p2,s.garage.util.rack?L.p3:null]){if(!g)continue;const w=weaponStats(g,s.attOn[g]||{});const a=w.ammo;
    const e=by[a]=by[a]||{type:a,name:AMMO[a].name,cap:AMMO[a].cap,col:AMMO[a].col,reserve:0,mag:0,guns:[]};e.reserve=Math.max(e.reserve,w.reserve);e.mag=Math.max(e.mag,w.mag);e.guns.push(g)}
  return Object.values(by).map(e=>{e.extra=((vs.ammoBonus||0)+(s.flags.rangeDay?1:0))*e.mag;e.total=Math.min(e.cap,e.reserve+e.extra);return e})}

/* Payout (SPEC D.1). r: {mission, ok, cuffs, confiscated, allyDowns, got, timeLeft, elapsed, bossDone, exec, trust, rerun} */
function computePayout(r,s){r=r||{};
  const m=missionOf(r.mission!=null?r.mission:r.i!=null?r.i:r.id)||MISSIONS[0];
  const ok=!!r.ok,k=r.rerun?.5:1,n=v=>Math.max(0,Math.floor(num(v,0)));
  const river=m.hood==='river',sv=s||data?S(s):null;
  const trust=num(r.trust,sv?(river?sv.prog.trustR:sv.prog.trust):12);
  const lines=[];let pos=0,pen=0;
  const add=(id,label,amt,kind)=>{amt=Math.round(amt);if(!amt)return;lines.push({id,label,amount:amt,kind:kind||'bonus'});if(amt>0)pos+=amt;else pen-=amt};
  if(ok)add('base','Bake sale fund',m.base*k,'base');
  else add('gas','Gas money',40,'base');
  if(n(r.cuffs))add('cuffs','Second chances ×'+n(r.cuffs),60*n(r.cuffs)*k);
  if(n(r.confiscated))add('guns','Guns turned in to Officer Dana ×'+n(r.confiscated),25*n(r.confiscated)*k);
  if(ok&&n(r.allyDowns)===0)add('hamstring','Nobody pulled a hamstring',150*k);
  const rr=Object.assign({},r,{ok,got:n(r.got),bikes:n(r.bikes),converters:n(r.converters),ids:n(r.ids),timeLeft:num(r.timeLeft,0)});
  for(const f of m.bonus){const l=f(rr);if(l)add(l[0],l[1],l[2]*k)}
  if(ok&&m.par&&r.elapsed!=null){const e=num(r.elapsed,1e9);if(e<m.par)add('quick','Quick work',100*k);else if(e<m.par*1.5)add('quick','Pretty quick work',50*k)}
  for(const l of Array.isArray(r.extra)?r.extra:[])if(l&&l.label&&isFinite(l.amount))add(l.id||'extra',l.label,l.amount*(l.amount>0?k:1),l.amount<0?'penalty':'bonus');
  const mult=.8+trust/250,adj=Math.round(pos*mult)-pos;
  if(adj)lines.push({id:'trust',label:adj>0?'Neighbors chipped in':'Neighbors are nervous',amount:adj,kind:'mult',note:'×'+mult.toFixed(2)+' at '+Math.round(trust)+'% '+(river?'Riverside ':'')+'trust'});
  if(n(r.exec))add('legal','Legal fees ×'+n(r.exec),-200*n(r.exec),'penalty');
  const total=Math.max(0,pos+adj-pen);
  return{lines,subtotal:pos,multiplier:mult,penalties:pen,total,ok,rerun:!!r.rerun,mission:m.id}}

/* Credit a payout to the save and queue the home event (SPEC D.2) */
function applyPayout(p,s){s=S(s);const old=s.cash;s.cash+=p.total;s.stats.earned+=p.total;s.events.push(p.ok?'win_'+p.mission:'fail');
  const g=s.garage;if(g&&g.tab>0){const pay=Math.min(g.tab,s.cash);s.cash-=pay;g.tab-=pay;s.stats.spent+=pay;p.tabPaid=pay}
  if(mine(s)){emit('cash',s.cash,old);Save.touch('stats','events','garage')}return s.cash}

const resultLines=p=>p.lines.map(l=>({label:l.label,text:(l.amount<0?'−$':'+$')+Math.abs(l.amount).toLocaleString('en-US'),neg:l.amount<0,kind:l.kind,note:l.note||''}));

const Economy={money,missionOf,condReason,gunAvail,priceOf,basePrice,discountFor,status,canAfford,buy,sell,sellValue,deliverPending,collectGun,
  setLoadout,swapPrimaries,setAttachment,weaponStats,gunBars,vehicleStats,vanBars,vanStatsWith,garUse,gadgetUse,doneIds,GARAGE_KINDS,ammoFor,computePayout,applyPayout,resultLines,BAR_DEFS,
  setRepairCar,repairQuote,towCharge,vehMaxHp:(t,s)=>{s=S(s);return vehMaxHp(t||s.garage.active,s.garage)}};
HT.Economy=Economy;

/* =====================================================================
   ICONS  (160×100 sticker-style vector thumbnails, used unless HT.Shop.thumbRenderer supplies one)
   ===================================================================== */
const K='#16181c',MT='#565d67',DK='#2c3036',WD='#8a5a3a',WL='#b9824f',SUN='#ffc94a',POLO='#2f5d9e',RED='#e5533d',LEAF='#7ed36b',PAP='#f6f1e3',ORG='#f08a2c',WHT='#fbfaf6';
const R=(x,y,w,h,f,rx)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx||0}" fill="${f}"/>`;
const P=(d,f)=>`<path d="${d}" fill="${f||'none'}"/>`;
const Ci=(x,y,r,f)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`;
const El=(x,y,rx,ry,f)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"/>`;
const T=(x,y,s,txt,f,w)=>`<text x="${x}" y="${y}" font-family="Rubik,Arial,sans-serif" font-weight="${w||800}" font-size="${s}" fill="${f}" stroke="none" text-anchor="middle">${txt}</text>`;
const shade=(d,o)=>`<path d="${d}" fill="#000" opacity="${o||.18}" stroke="none"/>`;
const hi=(d)=>`<path d="${d}" fill="none" stroke="#fff" stroke-width="2.5" opacity=".55"/>`;
const ground=(rx,y)=>`<ellipse cx="80" cy="${y||91}" rx="${rx||54}" ry="5" fill="#000" opacity=".2" stroke="none"/>`;
function svg(body,vb){return`<svg viewBox="${vb||'0 0 160 100'}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><g stroke="${K}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`}

const GUN_ICONS={
  pistol:()=>ground(44,82)+P('M44 54h22l-5 28H38z',WD)+shade('M44 54h22l-1 6H43z')+P('M40 50h74v8H76l-6 4H40z',DK)+P('M36 32h86a4 4 0 0 1 4 4v14H36z',MT)+hi('M40 36h80')+
    P('M46 37v9M51 37v9M56 37v9',null)+R(118,27,6,5,DK)+P('M70 58c0 9 4 12 12 12h4v-10',null)+P('M78 58v6',null),
  revolver:()=>ground(46,84)+P('M40 46c-6 12-8 24-4 36h22c-2-10 0-20 6-30z',WD)+shade('M54 52c-4 8-4 16-2 26h4c-2-10 0-18 4-24z',.15)+P('M38 30h24v20H42z',MT)+
    R(58,30,28,22,'#6b737e',4)+P('M64 34v14M71 34v14M78 34v14',null)+R(84,32,50,10,MT,2)+R(84,42,40,6,DK)+hi('M88 35h42')+R(128,27,5,5,DK)+P('M36 30l-6-8 8-2 6 10',DK)+P('M58 52c0 9 4 12 12 12h4v-12',null),
  nailer:()=>ground(52,86)+P('M26 30c0-6 4-10 10-10h62c8 0 12 4 12 10v18c0 5-3 8-8 8H36c-6 0-10-4-10-10z',SUN)+shade('M28 44h80v4c0 5-3 8-8 8H36c-6 0-8-4-8-8z',.16)+
    P('M110 26h20l6 6v14l-6 6h-20z',DK)+R(136,34,10,8,MT,1)+P('M58 56h16l-4 22H54z','#2b2f35')+R(40,76,46,12,DK,3)+R(46,79,10,5,LEAF,1)+
    P('M84 56l40 16-4 8-40-16z',MT)+P('M90 60l2 6M98 63l2 6M106 66l2 6M114 69l2 6',null)+hi('M36 26h60')+T(66,44,11,'NAILER',K),
  shotgun:()=>ground(66,80)+P('M8 52l38-10h20v14l-14 4-6 14H34l-6-6-20 4z',WD)+shade('M10 60l18-4 6 6-26 4z',.2)+R(58,38,40,18,MT,2)+R(96,40,56,7,DK,1)+R(96,48,40,6,MT,1)+
    R(102,45,30,13,WL,3)+P('M106 47v9M112 47v9M118 47v9M124 47v9',null)+hi('M62 42h32')+P('M72 56c0 8 3 11 10 11h3v-11',null)+R(148,36,4,4,DK),
  double:()=>ground(66,80)+P('M6 54l40-12h16v12l-12 6-6 14H30l-4-8-20 4z',WL)+shade('M8 62l18-4 4 8-22 4z',.2)+R(58,36,22,22,'#6b737e',3)+R(78,36,74,8,DK,2)+R(78,44,74,8,MT,2)+
    P('M84 52h34l-4 8H86z',WD)+Ci(69,47,3,DK)+hi('M82 39h66')+P('M66 58c0 8 3 11 10 11h3v-11',null)+R(60,30,8,6,DK),
  beanbag:()=>ground(66,80)+P('M8 52l38-10h20v14l-14 4-6 14H34l-6-6-20 4z',ORG)+shade('M10 60l18-4 6 6-26 4z',.2)+R(58,38,40,18,DK,2)+R(96,40,56,7,DK,1)+R(96,48,40,6,MT,1)+
    R(102,45,30,13,ORG,3)+P('M106 47v9M112 47v9M118 47v9M124 47v9',null)+R(62,42,30,6,SUN)+hi('M14 50l30-8')+P('M72 56c0 8 3 11 10 11h3v-11',null),
  rifle:()=>ground(68,84)+P('M10 40h30l10 4v14l-10 2-10 10H14l2-12-6-4z','#3a3f46')+P('M16 46h20',null)+R(48,34,52,18,'#3a3f46',2)+R(54,28,40,6,DK)+P('M58 28v6M66 28v6M74 28v6M82 28v6M90 28v6',null)+
    R(100,34,34,15,DK,3)+P('M106 39h4M114 39h4M122 39h4',null)+R(134,39,20,5,MT)+R(126,26,4,8,DK)+P('M72 52h16l4 12c2 6 4 10 8 14l-14 4c-4-6-6-12-6-18z',DK)+P('M58 52h12l-6 22h-12z','#2b2f35')+hi('M52 38h44'),
  smg:()=>ground(56,86)+P('M20 40h30M20 40v12h30M20 52l4 10',null)+R(48,34,70,18,'#3a3f46',3)+R(118,38,16,8,DK,1)+R(52,28,30,6,DK)+R(72,52,13,34,DK,2)+P('M75 58h7M75 66h7M75 74h7',null)+
    P('M94 52h14l-4 22h-12z','#2b2f35')+P('M56 52c0 8 3 11 10 11',null)+hi('M54 38h58'),
  hunter:()=>ground(70,82)+P('M6 50c10-6 30-10 44-10h70v10H74l-10 6c-6 4-10 10-14 16H22c-4-6-10-10-16-12z',WD)+shade('M8 58c8 2 12 6 14 14h12c2-6 2-10 0-14z',.15)+hi('M14 50c12-5 26-7 36-7')+
    R(72,36,82,7,DK,1)+R(84,44,40,6,WL,2)+R(54,18,62,11,DK,4)+P('M50 14h12v19H50z',DK)+P('M108 14h14v19h-14z',DK)+El(122,23,2,7,'#7fb7e6')+R(76,29,8,7,MT)+P('M66 44l-2 10',null)+Ci(64,56,4,MT),
};
const ATT_ICONS={
  reddot:()=>ground(36)+R(46,62,68,10,DK,2)+P('M52 62V40c0-6 4-10 10-10h34c6 0 10 4 10 10v22z',MT)+P('M60 60V42c0-4 2-6 6-6h28c4 0 6 2 6 6v18z','#9fd1ef')+
    `<path d="M66 40l8-4M86 60l12-14" stroke="#fff" stroke-width="3" opacity=".7"/>`+Ci(80,48,4.5,'#ff2a1a')+`<circle cx="80" cy="48" r="9" fill="#ff2a1a" opacity=".25" stroke="none"/>`+R(110,42,8,10,DK,2),
  extmag:()=>ground(30)+P('M62 12h30v8l4 30c2 12 6 22 12 32l-30 8c-6-10-10-22-12-34z',DK)+P('M66 26h26M68 38h26M70 50h26M74 62h24',null)+R(60,10,34,8,MT,2)+hi('M70 20l3 40'),
  grip:()=>ground(26)+R(48,22,64,14,DK,2)+P('M54 22v14M62 22v14M70 22v14M78 22v14M86 22v14M94 22v14M102 22v14',null)+P('M68 36h24l-2 48c0 4-3 6-6 6h-8c-3 0-6-2-6-6z',MT)+P('M70 50h20M70 60h20M70 70h20',null)+hi('M74 40v40'),
  muffler:()=>ground(58,78)+R(18,38,124,26,DK,6)+R(18,40,16,22,MT,3)+R(126,40,16,22,MT,3)+hi('M40 44h80')+R(52,44,56,14,SUN,2)+T(80,55,11,'HOA ✓',K)+El(142,51,3,6,'#000'),
};
const FURN_ICONS={
  sofa:()=>ground(66)+R(22,30,116,30,'#5f86b8',10)+R(14,46,22,36,'#4c6f9e',8)+R(124,46,22,36,'#4c6f9e',8)+R(32,56,96,20,'#6f95c6',6)+P('M80 56v20',null)+R(26,80,6,8,DK)+R(128,80,6,8,DK)+hi('M30 38h100'),
  armchair:()=>ground(44)+R(46,24,68,36,'#c06b4f',10)+R(36,44,20,38,'#a95a41',8)+R(104,44,20,38,'#a95a41',8)+R(52,56,56,20,'#d27a5d',6)+R(44,82,6,8,DK)+R(110,82,6,8,DK)+hi('M54 30h52'),
  lounge:()=>ground(54)+P('M40 26c-4 18 0 34 12 40h40c4 0 6-3 6-6v-4H60c-6-8-8-18-6-28z',DK)+P('M44 28c-2 14 2 26 10 32h38',null)+P('M48 30c0 10 2 18 8 26h34','#b06a3a')+
    R(100,56,40,12,'#b06a3a',4)+P('M60 70l-8 18M88 70l6 18M108 68l-4 20M132 68l4 20',null),
  rocker:()=>ground(44)+P('M56 16h44v42H56z',WL)+P('M62 22v30M72 22v30M82 22v30M92 22v30',null)+R(50,56,58,10,WD,3)+P('M56 66v16M102 66v16',null)+P('M40 82c20 8 60 8 80 0',null)+hi('M60 20h36'),
  coffeetable:()=>ground(60)+P('M28 46l14-12h76l14 12z',WL)+R(28,46,104,10,WD,2)+R(34,56,8,26,WD)+R(118,56,8,26,WD)+El(96,40,8,3,PAP)+hi('M44 38h70'),
  tv:()=>ground(58)+R(18,12,124,64,DK,4)+R(24,18,112,52,'#3f8f4a')+P('M80 18v52M24 44h112',null)+`<circle cx="80" cy="44" r="10" fill="none" stroke="#fff" stroke-width="2" opacity=".8"/>`+
    `<path d="M24 18h112v20c-30 8-70 8-112 0z" fill="#fff" opacity=".12" stroke="none"/>`+R(56,76,48,8,MT,2)+R(36,84,88,6,WD,2),
  bookshelf:()=>ground(48)+R(38,8,84,82,WD,3)+R(44,14,72,70,'#5c3b26')+P('M44 37h72M44 60h72',null)+R(48,18,7,18,RED)+R(56,20,7,16,POLO)+R(64,17,9,19,SUN)+R(76,22,6,14,LEAF)+
    R(50,42,8,17,SUN)+R(60,44,7,15,'#9b59b6')+R(70,41,10,18,RED)+P('M86 58l10-14 6 4-10 14z',POLO)+R(50,66,22,16,PAP,2)+R(92,64,8,18,LEAF)+R(102,66,8,16,RED),
  lamp:()=>ground(30)+P('M58 12h44l10 30H48z',SUN)+`<path d="M48 42h64L130 88H30z" fill="${SUN}" opacity=".18" stroke="none"/>`+R(78,42,4,42,DK)+El(80,86,18,4,DK)+hi('M62 18h36'),
  dining:()=>ground(62)+P('M22 44l18-14h80l18 14z',WL)+R(22,44,116,9,WD,2)+R(30,53,8,34,WD)+R(122,53,8,34,WD)+R(56,53,6,24,WD)+R(98,53,6,24,WD)+El(80,38,12,3,PAP)+hi('M44 34h72'),
  roundtable:()=>ground(46)+El(80,40,52,14,WL)+P('M28 40v6c0 8 24 14 52 14s52-6 52-14v-6',WD)+R(74,58,12,24,WD)+El(80,86,24,5,WD)+hi('M50 34c18-6 42-6 60 0'),
  chair:()=>ground(36)+R(58,10,44,40,'#4f8a7a',4)+P('M66 16v28M80 16v28M94 16v28',null)+P('M50 50h60l-6 10H56z','#3f7365')+P('M56 60l-4 28M104 60l4 28M66 60v20M94 60v20',null),
  beanbag:()=>ground(52)+P('M30 82c-8-22 4-50 30-58 22-6 52 0 66 22 10 16 4 34-8 38-24 6-60 6-88-2z','#e05a8a')+P('M44 78c4-14 20-24 40-24',null)+hi('M54 34c12-6 30-6 42 2'),
  rug:()=>ground(66,84)+P('M30 40h112l-12 40H18z',RED)+P('M34 46h100l-8 28H26z',SUN)+P('M38 52h90l-5 16H32z',POLO)+P('M30 40l-4-6M50 40l-2-6M70 40v-6M90 40v-6M110 40l2-6M130 40l4-6',null),
  roundrug:()=>ground(60,82)+El(80,58,62,24,'#4f8a7a')+El(80,58,46,17,PAP)+El(80,58,28,10,'#e05a8a')+El(80,58,12,4,SUN),
  plant:()=>ground(30)+P('M62 62h36l-4 26H66z','#c96f43')+R(58,58,44,8,'#b05f37',2)+P('M80 60V20',null)+P('M80 40c-14-2-24-10-24-22 12 0 22 8 24 22z',LEAF)+P('M80 30c12-2 20-10 20-20-10 0-18 8-20 20z',LEAF)+
    P('M80 52c14 0 24-8 26-20-14 0-24 8-26 20z','#5fb04f')+P('M80 56c-12 0-22-6-26-16 12-2 22 4 26 16z','#5fb04f'),
  frame:()=>ground(40)+R(44,10,72,80,SUN,3)+R(52,18,56,64,'#bfe0f2')+R(52,62,56,20,LEAF)+Ci(66,50,6,PAP)+P('M66 56v14M60 62h12M66 70l-4 8M66 70l4 8',null)+Ci(82,52,5,PAP)+P('M82 57v12M82 69l-3 7M82 69l3 7',null)+
    Ci(96,56,4,PAP)+P('M96 60v9M96 69l-2 5M96 69l2 5',null)+Ci(98,28,6,SUN),
  plaque:()=>ground(44)+P('M40 14h80l6 6v60l-6 6H40l-6-6V20z',WD)+R(46,22,68,56,SUN,2)+T(80,40,10,"WORLD'S",K)+T(80,54,13,'OKAYEST',K)+T(80,70,13,'DAD',K)+hi('M44 18h70'),
  trophy:()=>ground(34)+P('M56 12h48v18c0 16-10 26-24 26S56 46 56 30z',SUN)+P('M56 20H44c0 14 6 20 14 20M104 20h12c0 14-6 20-14 20',null)+R(74,56,12,12,SUN)+R(58,68,44,8,WD,2)+R(52,76,56,10,WD,2)+T(80,84,7,'2019',PAP)+hi('M64 18v14'),
  dartboard:()=>ground(36)+Ci(80,50,38,DK)+Ci(80,50,30,RED)+Ci(80,50,23,PAP)+Ci(80,50,16,LEAF)+Ci(80,50,9,PAP)+Ci(80,50,4,RED)+
    P('M80 12v76M42 50h76M53 23l54 54M107 23l-54 54',null)+P('M108 20l-20 22',SUN)+P('M104 16l8 2-2 8',null),
  shelves:()=>ground(54)+P('M32 10v80M128 10v80M44 10v80M116 10v80',null)+R(30,24,100,5,MT)+R(30,50,100,5,MT)+R(30,76,100,5,MT)+R(50,8,26,16,'#c69a5d',2)+R(80,12,22,12,RED,2)+
    R(52,36,30,14,POLO,2)+R(88,30,22,20,'#c69a5d',2)+R(54,62,20,14,SUN,3)+R(80,60,30,16,'#c69a5d',2),
  toolchest:()=>ground(44)+R(36,14,88,70,RED,4)+R(40,18,80,10,'#c2402f',2)+R(42,32,76,12,'#c2402f',2)+R(42,48,76,12,'#c2402f',2)+R(42,64,76,14,'#c2402f',2)+
    R(66,36,28,3,MT,1)+R(66,52,28,3,MT,1)+R(66,69,28,3,MT,1)+Ci(46,88,4,DK)+Ci(114,88,4,DK)+hi('M42 20h70'),
  vice:()=>ground(46)+R(28,62,104,20,WD,2)+R(50,40,30,22,'#4f7fc4',3)+R(80,44,24,18,'#4f7fc4',3)+R(46,32,24,10,MT)+R(84,34,20,10,MT)+R(104,50,30,5,MT)+R(132,44,4,16,DK,2),
  safe:()=>ground(44)+R(38,10,84,78,'#3a3f46',6)+R(46,18,68,62,'#4a5059',4)+Ci(80,46,14,MT)+Ci(80,46,6,DK)+P('M80 32v6M94 46h-6M80 60v-6M66 46h6',null)+R(100,40,6,14,SUN,2)+hi('M50 22h58'),
  minifridge:()=>ground(40)+R(46,12,68,76,WHT,6)+R(52,20,56,58,'#bfe0f2',3)+P('M52 38h56M52 58h56',null)+R(58,26,8,12,RED,2)+R(70,26,8,12,SUN,2)+R(82,26,8,12,RED,2)+
    R(58,44,8,14,LEAF,2)+R(70,44,8,14,'#c69a5d',2)+R(94,44,8,14,RED,2)+R(102,30,4,30,MT,2),
  footlocker:()=>ground(54)+R(30,40,100,44,'#4f6a3a',4)+P('M30 52h100',null)+R(30,32,100,20,'#5c7a44',6)+R(74,48,12,12,SUN,2)+R(40,40,8,44,MT)+R(112,40,8,44,MT)+T(80,76,10,'DAD',PAP),
  grill:()=>ground(38)+P('M44 40c0 22 16 34 36 34s36-12 36-34z',DK)+P('M42 40c0-14 16-24 38-24s38 10 38 24z',RED)+R(76,10,8,8,MT,2)+P('M60 74l-8 16M100 74l8 16M80 74v16',null)+Ci(52,90,4,DK)+hi('M58 24c10-4 34-4 44 0'),
  picnic:()=>ground(64)+P('M22 40l14-12h88l14 12z','#c88c4e')+R(22,40,116,8,WD,2)+P('M40 48l-14 40M120 48l14 40M56 48l-8 26M104 48l8 26',null)+R(10,64,52,7,'#c88c4e',2)+R(98,64,52,7,'#c88c4e',2),
  patio:()=>ground(60)+P('M30 34c10-20 90-20 100 0z',RED)+P('M50 34c4-14 26-18 30-18M110 34c-4-14-26-18-30-18',null)+P('M30 34c5 4 15 4 20 0 5 4 15 4 20 0 5 4 15 4 20 0 5 4 15 4 20 0 5 4 15 4 20 0',PAP)+
    R(78,34,4,44,MT)+El(80,66,30,7,WHT)+P('M58 70l-4 18M102 70l4 18',null)+R(18,58,20,24,WHT,3)+R(122,58,20,24,WHT,3),
  firepit:()=>ground(56)+P('M58 60c-6-16 6-28 12-40 2 10 10 14 10 24 4-6 4-12 2-18 12 10 16 22 10 34z',ORG)+P('M70 60c-2-8 2-14 6-20 2 6 6 8 6 14 2-2 3-6 2-8 6 6 6 10 4 14z',SUN)+
    El(80,72,52,14,'#8d8a84')+El(80,68,38,9,'#3a2a20')+P('M34 70h10M52 80h12M84 82h12M112 76h12',null),
  trampoline:()=>ground(64,90)+El(80,58,64,16,'#2c3036')+El(80,58,56,12,'#3a4f7a')+P('M24 58v26M136 58v26M54 70v18M106 70v18',null)+P('M16 58V24M144 58V24',null)+
    `<path d="M16 24c40 8 88 8 128 0M16 40c40 8 88 8 128 0" fill="none" stroke="${K}" stroke-width="2" opacity=".6"/>`+El(80,58,64,16,'none'),
  doghouse:()=>ground(54)+P('M28 46l52-34 52 34z',RED)+R(36,44,88,42,SUN,2)+P('M64 86V66c0-10 6-16 16-16s16 6 16 16v20z',DK)+R(56,46,48,10,PAP,2)+T(80,54,8,'BISCUIT',K),
  dogbed:()=>ground(58)+El(80,64,60,20,POLO)+El(80,62,46,13,'#6e9bd4')+P('M64 58h32l4-4 4 4-4 4 4 4-4 4-4-4H64l-4 4-4-4 4-4-4-4 4-4z',PAP),
  flamingo:()=>ground(26)+P('M80 52v36M80 70l10 4',null)+P('M66 38c0-10 12-16 26-12 10 4 12 16 4 22-8 6-24 6-30-2z','#f27aa4')+P('M88 30c4-10 2-20 6-24 4-2 8 0 8 4',null)+
    P('M100 8c4-2 8 0 8 4l-6 4z',DK)+Ci(98,10,2,'#f27aa4'),
};
/* side-view vehicles (vector fallback when HT.Vehicles is not loaded). type: minivan | workvan | pickup | suv */
const BODY={
  minivan:{d:'M14 70V44c0-6 4-10 10-12l20-16c3-2 6-4 12-4h64c14 0 22 10 26 26l2 30c0 4-2 6-6 6H18c-2 0-4-2-4-4z',win:'M48 20l-16 14h28V20zM66 20h30v14H66zM102 20h18c6 0 12 6 14 14h-32z',w:[42,118],roof:[50,130],door:'M98 18v54M62 38v32'},
  workvan:{d:'M12 72V20c0-6 4-10 10-10h92c10 0 16 4 22 14l10 18c2 4 2 8 2 12v16c0 4-2 6-6 6H16c-2 0-4-2-4-4z',win:'M116 16h6c6 0 10 4 14 10l6 12h-26z',w:[38,124],roof:[24,110],door:'M112 14v60'},
  pickup:{d:'M10 72V48c0-4 2-6 6-6h58V22c0-6 4-10 10-10h30c8 0 14 6 18 14l8 16c8 0 12 4 12 10v16c0 4-2 6-6 6H14c-2 0-4-2-4-4z',win:'M84 18h12v20H84zM102 18h10c4 0 8 4 10 8l6 12h-26z',w:[36,124],roof:[84,122],door:'M100 16v58M74 42v32',bed:true},
  suv:{d:'M12 72V40c0-6 4-10 10-10l18-18c3-2 6-4 12-4h66c10 0 18 8 22 18l6 14c4 0 6 4 6 8v20c0 4-2 6-6 6H16c-2 0-4-2-4-4z',win:'M44 14l-16 16h30V14zM64 14h32v16H64zM102 14h16c6 0 10 6 14 16h-30z',w:[40,122],roof:[44,124],door:'M98 12v62M60 34v38'}};
function carSVG(type,col,rims,o){o=o||{};const b=BODY[type]||BODY.minivan;col=col||'#35577d';let x='';
  if(o.cargo)x+=P(`M${b.roof[0]} 8c4-8 14-10 26-10h${b.roof[1]-b.roof[0]-40}c8 0 14 4 16 10z`,'#2c3036');
  else if(type!=='pickup')x+=P(`M${b.roof[0]} 10h${b.roof[1]-b.roof[0]}`,null);
  if(o.lightBar)x+=R(b.roof[0]+8,o.cargo?-4:2,54,8,DK,3)+R(b.roof[0]+11,o.cargo?-2:4,14,4,SUN,1)+R(b.roof[0]+28,o.cargo?-2:4,14,4,'#fff',1)+R(b.roof[0]+45,o.cargo?-2:4,14,4,SUN,1);
  x+=P(b.d,col)+`<path d="M12 62h138v8c0 4-2 6-6 6H16c-2 0-4-2-4-4z" fill="#000" opacity=".2" stroke="none"/>`;
  if(o.finish==='twotone')x+=`<path d="${b.d}" fill="#e8dcc0" stroke="none" style="clip-path:inset(0 0 62% 0)"/><path d="M14 40h134" stroke="#7a4b2a" stroke-width="4"/>`;
  if(o.finish==='wood')x+=`<path d="M16 46h130v16H16z" fill="#9a6a3c" stroke="${K}" stroke-width="2"/><path d="M16 52h130M16 57h130" stroke="#6e4826" stroke-width="1.5"/>`;
  if(o.finish==='mural')x+=`<path d="M18 62c20-14 40 6 60-8s40 4 66-6v14H18z" fill="#e5533d" stroke="none" opacity=".9"/><path d="M22 54c16-12 36 0 54-10s32 6 46-4" stroke="#7fdc6e" stroke-width="5" fill="none"/><circle cx="118" cy="50" r="6" fill="#ffc94a" stroke="none"/>`;
  if(b.bed)x+=R(14,44,58,8,'rgba(0,0,0,.25)',1);
  x+=P(b.win,'#2b3440');if(o.tint)x+=`<path d="${b.win}" fill="#000" opacity="${o.tint>.5?.55:.3}" stroke="none"/>`;
  x+=P(b.door,null)+R(146,46,7,6,SUN,2)+R(10,48,6,8,RED,2);
  if(o.spoiler)x+=P(`M${type==='pickup'?10:12} ${type==='workvan'?10:type==='pickup'?42:30}h18l-4 -6h-14z`,DK);
  if(o.bullBar)x+=P('M150 42h10v32h-10',DK)+P('M154 46h8M154 58h8M154 70h8',null);
  if(o.stickers)x+=R(14,52,22,7,'#fff',1)+`<path d="M17 55.5h16" stroke="#e5533d" stroke-width="2"/>`;
  return ground(70,90)+x+wheel(b.w[0],74,rims)+wheel(b.w[1],74,rims)}
function wheel(x,y,st,k){k=k||1;const rimC={steel:'#3a3f46',alloy:'#c9cfd6',chrome:'#eef2f6',spinner:'#e6eaee',gold:'#e8b93a'}[st]||'#c9cfd6';
  let s=Ci(x,y,14*k,'#1b1d21')+Ci(x,y,8.5*k,rimC);const sp=(n,r,w)=>{for(let i=0;i<n;i++){const a=i*2*Math.PI/n-1.57;s+=`<path d="M${x} ${y}L${(x+Math.cos(a)*r*k).toFixed(1)} ${(y+Math.sin(a)*r*k).toFixed(1)}" stroke="${K}" stroke-width="${w*Math.min(k,1.8)}"/>`}};
  if(st==='steel')for(const[dx,dy]of[[-4,0],[4,0],[0,-4],[0,4]])s+=Ci(x+dx*k,y+dy*k,1.4*k,'#8a9099');
  if(st==='alloy')sp(6,8.5,1.6);if(st==='chrome'||st==='gold')sp(5,8.5,2.2);
  if(st==='spinner'){s+=`<path d="M${x-8*k} ${y}Q${x} ${y-9*k} ${x+8*k} ${y}Q${x} ${y+9*k} ${x-8*k} ${y}" fill="#ffc94a" stroke="${K}" stroke-width="${1.5*Math.min(k,1.8)}"/>`}
  s+=Ci(x,y,2.6*k,'#2c3036');
  if(k>1)s+=`<circle cx="${x}" cy="${y}" r="${11.5*k}" fill="none" stroke="#33373d" stroke-width="${2.5*k}" stroke-dasharray="${2*k} ${3*k}"/>`;
  return s}
/* the active vehicle as it is now (or previewed), from Economy.vehicleStats() */
function carFull(st){return svg(carSVG(st.type,st.paint.hex,st.rims,{finish:st.paint.finish,tint:{none:0,light:.35,limo:.7}[st.tint]||0,lightBar:st.lightBar,spoiler:st.spoiler,
  bullBar:st.bullBar,cargo:(st.ammoBonus||0)>((HT.Garage&&HT.Garage.VEH[st.type]||{}).cargo||0),stickers:st.stickers&&st.stickers.some(Boolean)}),'0 -12 164 112')}
function ammoIcon(type){const a=AMMO[type];let b=ground(50);
  b+=R(34,46,92,40,'#4f6a3a',3)+R(34,40,92,12,'#5c7a44',3)+T(80,74,13,a.name.toUpperCase(),PAP);
  for(let i=0;i<5;i++)b+=P(`M${46+i*15} 40v-16c0-5 3-9 5-11 2 2 5 6 5 11v16z`,a.col);
  return svg(b)}
const GAR_ICONS={
  engine:(n)=>ground(54)+R(36,34,88,46,'#5b636e',6)+R(46,22,68,16,RED,4)+P('M52 22v-6h10v6M72 22v-6h10v6M92 22v-6h10v6',null)+R(28,46,10,22,DK,2)+R(122,46,10,22,DK,2)+
    P('M50 50h60M50 60h60M50 70h60',null)+T(80,34,10,n===3?'S/C':n===2?'V6':'TUNE',PAP)+(n===3?Ci(124,28,12,'#9aa1a9')+Ci(124,28,5,DK):'')+hi('M50 26h56'),
  tyres:()=>ground(46)+Ci(80,50,40,'#1b1d21')+Ci(80,50,22,'#cfd5db')+Ci(80,50,7,MT)+`<circle cx="80" cy="50" r="33" fill="none" stroke="#4a4f57" stroke-width="5" stroke-dasharray="6 5"/>`+hi('M56 26c8-6 20-8 30-6'),
  brakes:()=>ground(46)+Ci(76,50,38,'#9aa1a9')+Ci(76,50,26,'#b8bec5')+Ci(76,50,12,DK)+P('M76 22v8M76 70v8M48 50h8M96 50h8',null)+P('M98 18c18 6 26 20 26 32s-8 26-26 32l-6-10c10-4 16-12 16-22s-6-18-16-22z',RED),
  sport:()=>ground(48)+P('M30 70a50 50 0 0 1 100 0z','#2c3036')+P('M40 70a40 40 0 0 1 80 0',null)+`<path d="M104 40a40 40 0 0 1 16 30" stroke="${RED}" stroke-width="6" fill="none"/>`+P('M80 70l30-26',null)+Ci(80,70,6,SUN)+T(80,90,11,'SPORT',SUN),
  panels:()=>ground(40)+P('M80 10l40 14v26c0 22-18 36-40 42-22-6-40-20-40-42V24z',POLO)+P('M80 20l30 10v20c0 16-12 26-30 32z','#4a78bd')+P('M66 50l10 10 20-20',null),
  gunRack:()=>ground(54)+R(24,24,112,10,WD,3)+R(24,60,112,10,WD,3)+P('M40 34v26M80 34v26M120 34v26',null)+P('M30 46h92l8-4v8l-8-2H30z',DK)+P('M36 46l-8 6 8 6',WL)+R(56,40,40,8,MT,2)+T(80,86,10,'SLOT 4',K),
  hitch:()=>ground(56)+R(22,30,70,26,'#3a3f46',4)+R(30,36,54,14,'#5b636e',3)+R(84,38,30,10,MT,2)+R(108,34,8,18,DK,2)+Ci(126,34,12,'#c8ccd0')+R(120,42,12,10,'#9aa1a9',2)+P('M40 64c10 10 30 10 40 0',null)+hi('M30 34h50'),
  medkit:()=>ground(50)+R(34,24,92,62,RED,8)+R(64,14,32,12,DK,4)+R(70,36,20,40,PAP)+R(60,46,40,20,PAP)+hi('M42 32h76'),
  repair:()=>ground(46)+P('M46 78l42-42c-4-12 2-24 14-26l-8 12 6 8 10-4c2 12-8 22-22 18L46 86z','#9aa1a9')+Ci(52,82,4,DK)};
const GAR_MAP={eng1:()=>GAR_ICONS.engine(1),eng2:()=>GAR_ICONS.engine(2),eng3:()=>GAR_ICONS.engine(3),tyre1:GAR_ICONS.tyres,tyre2:GAR_ICONS.tyres,brk1:GAR_ICONS.brakes,brk2:GAR_ICONS.brakes,
  sport:GAR_ICONS.sport,bull:()=>carSVG('minivan','#35577d','steel',{bullBar:true}),armor1:GAR_ICONS.panels,armor2:GAR_ICONS.panels,cargo:()=>carSVG('minivan','#35577d','steel',{cargo:true}),
  rack:GAR_ICONS.gunRack,aid:GAR_ICONS.medkit,hitch:GAR_ICONS.hitch};
function stickerSVG(txt){const words=String(txt).split(' ');const lines=[];let cur='';for(const w of words){if((cur+' '+w).trim().length>16){lines.push(cur.trim());cur=w}else cur+=' '+w}lines.push(cur.trim());
  return ground(60,84)+`<g transform="rotate(-4 80 50)">`+R(14,26,132,48,'#fffdf7',4)+R(14,26,10,48,'#2f5d9e',2)+lines.slice(0,3).map((l,i)=>T(86,46+i*13-(lines.length-1)*6,12,l.replace(/&/g,'&amp;').replace(/</g,'&lt;').toUpperCase(),K)).join('')+`</g>`}
const SUP_ICONS={
  rangeDay:()=>ground(54)+R(30,36,100,48,'#4f6a3a',3)+R(30,28,100,14,'#5c7a44',3)+R(68,30,24,8,SUN,2)+T(80,66,14,'AMMO',PAP)+R(44,16,8,14,SUN,2)+R(56,14,8,16,SUN,2)+R(96,16,8,14,'#c79b2a',2)+R(108,18,8,12,'#c79b2a',2),
  zipPack:()=>ground(46)+R(36,30,88,56,'#2b2f35',4)+R(42,24,76,10,SUN,2)+T(80,66,11,'500 PACK',PAP)+
    `<path d="M48 22c-6-14 0-22 8-18M62 22c-4-14 4-20 10-16M98 22c4-14-4-20-10-16M112 22c6-14 0-22-8-18" fill="none" stroke="${K}" stroke-width="3"/>`,
  icePack:()=>ground(48)+R(34,26,92,56,'#7fc4ec',16)+R(42,34,76,40,'#b6e0f6',12)+T(80,60,14,'OUCH',POLO)+R(54,14,10,14,RED,2)+R(68,12,8,16,PAP,2)+P('M100 30l10-16 8 4-10 16z',SUN),
};
const GAD_ICONS={
  nvg:()=>ground(52)+P('M34 30c10-10 82-10 92 0',null)+R(30,34,100,34,DK,10)+Ci(56,62,18,MT)+Ci(104,62,18,MT)+Ci(56,62,11,'#5fe08a')+Ci(104,62,11,'#5fe08a')+
    Ci(52,58,3,WHT)+Ci(100,58,3,WHT)+R(74,40,12,14,K,3)+R(72,22,16,8,SUN,2),
  flashlight:()=>ground(50)+P('M118 40l20-10v40l-20-10z','#fff6b8')+R(30,40,72,20,'#3a3f47',8)+R(96,34,24,32,'#4a5059',6)+R(40,44,8,12,MT,2)+R(56,44,8,12,MT,2)+Ci(120,50,9,'#fff6b8')};
function horn(ids){return ground(46)+P('M40 40h18l40-22v64L58 60H40z',SUN)+R(30,40,12,20,DK,2)+
  `<path d="M108 34c8 6 8 26 0 32M118 26c14 10 14 38 0 48M128 18c20 14 20 50 0 64" fill="none" stroke="${K}" stroke-width="3" opacity="${ids==='stock'?.4:.9}"/>`}
function iconSVG(kind,id){
  let f;const G=HT.Garage;
  if(kind==='gun')f=GUN_ICONS[id];else if(kind==='att')f=ATT_ICONS[id];else if(kind==='furn')f=FURN_ICONS[id];else if(kind==='sup')f=SUP_ICONS[id];else if(kind==='gad')f=GAD_ICONS[id];
  else if(kind==='gar'){if(id.startsWith('v_'))return svg(carSVG(id.slice(2),'#6b7d8f','steel'),'0 -12 164 112');f=GAR_MAP[id]}
  else if(kind==='car')return svg(carSVG(id,id==='minivan'?'#35577d':{workvan:'#f2f2ee',pickup:'#8a2f2a',suv:'#1f2226'}[id],'steel'),'0 -12 164 112');
  else if(kind==='rep')f=GAR_ICONS.repair;
  else if(kind==='stick')return svg(stickerSVG(G?G.COSMETICS.stickers[+id]:'Sticker'));
  else if(kind==='cos'){const[g,o]=id.split(':');
    if(g==='paint'){const c=G&&G.COSMETICS.paint[o]||{hex:'#35577d'};return svg(carSVG('minivan',c.hex,'steel',{finish:c.finish}),'0 -12 164 112')}
    if(g==='rims')return svg(ground(46)+wheel(80,50,o,2.8));
    if(g==='tint')return svg(carSVG('minivan','#35577d','steel',{tint:{none:0,light:.35,limo:.7}[o]}),'0 -12 164 112');
    if(g==='lightBar')return svg(carSVG('minivan','#35577d','steel',{lightBar:true}),'0 -12 164 112');
    if(g==='spoiler')return svg(carSVG('minivan','#35577d','steel',{spoiler:true}),'0 -12 164 112');
    if(g==='horn')return svg(horn(o))}
  return svg(f?f():ground(30)+R(56,26,48,48,PAP,6)+T(80,58,24,'?',K))}

HT.icon=iconSVG;
/* =====================================================================
   MENU FRAMEWORK  (shared by Shop and Locker): sound, input (keyboard, gamepad, touch), spatial navigation
   ===================================================================== */
if(hasDOM){
const pick=a=>a[Math.floor(Math.random()*a.length)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced=()=>root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow=()=>root.innerWidth<=760;
const coarse=()=>root.matchMedia&&root.matchMedia('(pointer:coarse)').matches;
const Menus=HT.Menus=HT.Menus||{};Menus.volume=Menus.volume==null?.6:Menus.volume;

/* --- tiny UI synth (overridable: HT.Shop.sfx = name => true to swallow) --- */
let AC=null;
function ac(){if(!AC){try{const A=root.AudioContext||root.webkitAudioContext;AC=A?new A():null}catch(e){AC=null}}if(AC&&AC.state==='suspended')AC.resume().catch(()=>{});return AC}
function tone(f,t0,dur,vol,type,f1){const a=ac();if(!a)return;const t=a.currentTime+t0,o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol*Menus.volume,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+.03)}
function noise(t0,dur,vol,hp){const a=ac();if(!a)return;const n=Math.floor(a.sampleRate*dur),b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=b;f.type='highpass';f.frequency.value=hp||1000;g.gain.value=vol*Menus.volume;s.connect(f);f.connect(g);g.connect(a.destination);s.start(a.currentTime+t0)}
const SFX={
  move:()=>tone(1900,0,.028,.035,'triangle'),
  tab:()=>{tone(640,0,.05,.05,'triangle');tone(960,.035,.06,.045,'triangle')},
  open:()=>{noise(0,.16,.05,600);tone(330,0,.12,.04,'sine',520)},
  close:()=>{noise(0,.12,.04,900);tone(520,0,.1,.035,'sine',300)},
  arm:()=>{tone(880,0,.07,.06,'square');tone(1175,.06,.08,.05,'square')},
  buy:()=>{noise(0,.05,.14,2500);tone(1318,.04,.55,.11,'triangle');tone(1760,.11,.65,.09,'triangle');tone(2637,.11,.45,.035,'sine');noise(.18,.25,.05,6000)},
  order:()=>{tone(660,0,.09,.07,'triangle');tone(880,.08,.09,.07,'triangle');tone(1320,.16,.25,.07,'triangle')},
  error:()=>{tone(160,0,.16,.08,'square');tone(118,.08,.2,.08,'square')},
  equip:()=>{noise(0,.05,.12,1200);tone(240,.015,.09,.08,'square',120);noise(.09,.04,.08,3000)},
  toggle:()=>{noise(0,.03,.1,2500);tone(1400,0,.04,.04,'square')},
  tick:()=>tone(2600,0,.018,.03,'square'),
  stamp:()=>{noise(0,.09,.16,200);tone(90,0,.14,.12,'sine',50)}};
/* game sounds first: HT.Audio.ui (js/audio.js) when it is running, the built-in blips otherwise */
const AUDIO_UI={move:'hover',tab:'click',open:'click',close:'back',arm:'click',buy:'cash',order:'objective',error:'denied',equip:'pickup',toggle:'click',tick:'hover',stamp:'click'};
function sfx(n){if(!Menus.volume)return;try{const o=HT.Shop&&HT.Shop.sfx;if(typeof o==='function'&&o(n)===true)return;
  const A=HT.Audio;if(A&&A.ready&&typeof A.ui==='function'&&AUDIO_UI[n]){A.ui(AUDIO_UI[n],{vol:Menus.volume/.6});return}SFX[n]&&SFX[n]()}catch(e){}}
const hornOf=id=>({notes:HT.Garage?HT.Garage.hornNotes(id):[{f:392,t:0,d:.38},{f:494,t:0,d:.38}],wave:'square'});
function playHorn(opt){if(!opt||!opt.notes)return;
  if(opt.notes[0]&&opt.notes[0].f){for(const n of opt.notes){tone(n.f,n.t,n.d,.06,opt.wave||'square');tone(n.f*1.005,n.t,n.d,.03,'triangle')}return}let t=0;for(const[f,d]of opt.notes){tone(f,opt.chord?0:t,d,.07,opt.wave||'square');if(opt.chord)tone(f*1.26,0,d,.05,opt.wave||'square');t+=d*.9}}
Menus.sfx=sfx;Menus.playHorn=playHorn;

function countTo(el,from,to,ms,fmt){fmt=fmt||money;if(!el)return;if(reduced()||ms<=0||from===to){el.textContent=fmt(to);return}
  const t0=performance.now();cancelAnimationFrame(el._raf);
  const step=now=>{const k=Math.min(1,(now-t0)/ms),e=1-Math.pow(1-k,3);el.textContent=fmt(Math.round(from+(to-from)*e));if(k<1)el._raf=requestAnimationFrame(step)};el._raf=requestAnimationFrame(step)}
Menus.countTo=countTo;

/* --- thumbnails: game-supplied 3D renders when available, vector fallback otherwise --- */
const thumbCache=new Map(),thumbWait=new Set();
function asThumbHTML(out){if(!out)return null;if(out.toDataURL)return'<img alt="" src="'+out.toDataURL()+'">';if(out.tagName==='IMG')return'<img alt="" src="'+esc(out.src)+'">';
  if(typeof out==='string')return out.trim().startsWith('<')?out:'<img alt="" src="'+esc(out)+'">';return null}
/* thumbRenderer(item) may return a canvas, an <img>, a URL / HTML string, or a Promise of one; null keeps the vector icon.
   item = catalogue data + {kind, id, key, vehicle?:{type, opts}} (vehicle = what HT.Vehicles.make should build, incl. a previewed upgrade). */
function hashStr(x){return fnv(JSON.stringify(x))}
/* saved attachments ({optic,mag,under,muzzle}) -> HT.Guns.model attachments */
const gunMods=on=>{on=on||{};return{redDot:on.optic==='reddot',extMag:on.mag==='extmag',foregrip:on.under==='grip',suppressor:on.muzzle==='muffler'}};
function vecFallback(kind,id,veh){if(veh&&veh.gun)return iconSVG(kind,id);if(veh&&HT.Garage){if(veh.stats)return carFull(veh.stats);const u=veh.opts.upgrades||{};
    return svg(carSVG(veh.type,veh.opts.color,u.rims||'steel',{finish:u.paint,tint:u.tint,lightBar:!!u.lightBar,spoiler:u.spoiler,bullBar:u.bullBar,cargo:u.roofRack==='cargo'}),'0 -12 164 112')}
  return iconSVG(kind,id)}
function thumbHTML(kind,id,veh){if(kind==='resale')return`<span class="htm-ti htm-rendered">${HT.Resale.photo(id)}</span>`;const key=kind+':'+id+(veh?':'+hashStr(veh.gun?veh.gun:[veh.type,veh.opts]):'');
  let inner=null;const r=HT.Shop&&HT.Shop.thumbRenderer;
  if(r){if(thumbCache.has(key))inner=thumbCache.get(key);
    else if(!thumbWait.has(key)){try{const out=r(Object.assign({kind,id,key},itemData(kind,id),veh?(veh.gun?{gun:veh.gun}:{vehicle:{type:veh.type,opts:veh.opts}}):{}));
      if(out&&typeof out.then==='function'){thumbWait.add(key);out.then(v=>{const h=asThumbHTML(v);thumbCache.set(key,h);thumbWait.delete(key);
          if(h)for(const el of document.querySelectorAll(`[data-tk="${key}"]`)){el.innerHTML=h;el.classList.add('htm-rendered')}},()=>{thumbCache.set(key,null);thumbWait.delete(key)})}
      else{inner=asThumbHTML(out);thumbCache.set(key,inner)}}catch(e){thumbCache.set(key,null)}}}
  return`<span class="htm-ti${inner?' htm-rendered':''}" data-tk="${key}">${inner||vecFallback(kind,id,veh)}</span>`}

/* --- gamepad polling --- */
const pad={on:false,prev:[],rep:{},raf:0,handler:null};
function padLoop(){pad.raf=requestAnimationFrame(padLoop);const gps=navigator.getGamepads?navigator.getGamepads():[];const g=[...gps].find(x=>x&&x.connected);if(!g||!pad.handler)return;
  if(!pad.on){pad.on=true;pad.handler('padconnect')}
  const b=i=>!!(g.buttons[i]&&g.buttons[i].pressed),ax=g.axes||[],now=performance.now();
  const dirs={up:b(12)||ax[1]<-.55,down:b(13)||ax[1]>.55,left:b(14)||ax[0]<-.55,right:b(15)||ax[0]>.55};
  for(const d in dirs){if(dirs[d]){const r=pad.rep[d];if(!r){pad.rep[d]=now+320;pad.handler('nav',d)}else if(now>r){pad.rep[d]=now+110;pad.handler('nav',d)}}else pad.rep[d]=0}
  const map={0:'ok',1:'back',2:'alt',3:'alt2',4:'tabprev',5:'tabnext',6:'tabprev',7:'tabnext',9:'back'};
  for(const i in map){const p=b(+i);if(p&&!pad.prev[i])pad.handler(map[i]);pad.prev[i]=p}}
function padStart(h){pad.handler=h;pad.prev=[];const gps=navigator.getGamepads?navigator.getGamepads():[];const g=[...gps].find(x=>x&&x.connected);
  if(g)g.buttons.forEach((bt,i)=>pad.prev[i]=bt.pressed); // don't re-fire the press that opened the menu
  if(!pad.raf)padLoop()}
function padStop(){pad.handler=null;cancelAnimationFrame(pad.raf);pad.raf=0}

/* --- spatial navigation among [data-nav] --- */
function navList(rootEl){return[...rootEl.querySelectorAll('[data-nav]')].filter(e=>!e.disabled&&e.offsetParent!==null&&!e.closest('[hidden]')&&!e.closest('[inert]'))}
function navMove(rootEl,dir,from){const list=navList(rootEl);if(!list.length)return null;
  if(!from||!list.includes(from))return list[0];
  const a=from.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2;let best=null,bs=1e9;
  for(const e of list){if(e===from)continue;const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,dx=x-ax,dy=y-ay;
    let p,o;if(dir==='right'){if(r.left<a.right-6&&dx<=4)continue;p=dx;o=Math.abs(dy)}else if(dir==='left'){if(r.right>a.left+6&&dx>=-4)continue;p=-dx;o=Math.abs(dy)}
    else if(dir==='down'){if(r.top<a.bottom-6&&dy<=4)continue;p=dy;o=Math.abs(dx)}else{if(r.bottom>a.top+6&&dy>=-4)continue;p=-dy;o=Math.abs(dx)}
    if(p<=0)continue;const s=p+o*2.2;if(s<bs){bs=s;best=e}}
  return best}

/* --- shell: overlay, panel, header, tabs, body, footer --- */
let current=null;
Menus.isOpen=()=>!!current;Menus.close=()=>{if(current)current.close()};
const LOGOS={
  dadazon:`<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#16181c" stroke-width="3.5" stroke-linejoin="round"><path d="M8 22l24-12 24 12v26L32 60 8 48z" fill="#d7a86e"/><path d="M8 22l24 12 24-12M32 34v26" fill="none"/><path d="M20 16l24 12v8" fill="none" stroke="#f6f1e3" stroke-width="5"/><path d="M20 16l24 12v8" fill="none" stroke="#16181c" stroke-width="1.5"/><path d="M20 46l6-5 6 5v7h-12z" fill="#2e5e3e" stroke-width="2.5"/></g></svg>`,
  hardware:`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="#f6f1e3" stroke="#16181c" stroke-width="3.5"/><path d="M32 8l5 11 7-3-2 11 8-2-4 8 6 3-12 7 2 6-10-2v12h-2V47l-10 2 2-6-12-7 6-3-4-8 8 2-2-11 7 3z" fill="#c23b2e" stroke="#16181c" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
  auto:`<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#16181c" stroke-width="3.5" stroke-linejoin="round"><path d="M32 4l24 14v28L32 60 8 46V18z" fill="#ffc94a"/><circle cx="32" cy="32" r="11" fill="#16181c"/><circle cx="32" cy="32" r="5" fill="#ffc94a"/></g></svg>`,
  mart:`<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#16181c" stroke-width="3.5" stroke-linejoin="round"><path d="M8 26l6-16h36l6 16z" fill="#f08a2c"/><path d="M8 26c0 5 4 8 8 8s8-3 8-8c0 5 4 8 8 8s8-3 8-8c0 5 4 8 8 8s8-3 8-8" fill="#fff"/><rect x="12" y="34" width="40" height="24" fill="#f6f1e3"/><rect x="18" y="40" width="12" height="18" fill="#2fa39a"/><rect x="35" y="40" width="12" height="9" fill="#9fd1ef"/></g></svg>`,
  locker:`<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#16181c" stroke-width="3.5" stroke-linejoin="round"><rect x="10" y="4" width="44" height="56" rx="3" fill="#5d7356"/><path d="M32 4v56" fill="none"/><path d="M16 12h10M16 17h10M16 22h10M38 12h10M38 17h10M38 22h10" stroke-width="2.5"/><rect x="24" y="32" width="5" height="10" rx="1" fill="#ffc94a"/><rect x="35" y="32" width="5" height="10" rx="1" fill="#ffc94a"/></g></svg>`};

function shell(cfg){
  const el=document.createElement('div');el.className='htm htm-'+cfg.kind;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',cfg.title);
  el.innerHTML=`<div class="htm-panel">
    <header class="htm-head">
      <div class="htm-brand"><span class="htm-logo">${LOGOS[cfg.logo]||''}</span><div class="htm-brandtx"><div class="htm-who">${esc(cfg.who)}</div><h2 class="htm-title">${esc(cfg.title)}${cfg.sub?` <small>${esc(cfg.sub)}</small>`:''}</h2></div></div>
      <div class="htm-chips"></div>
      ${cfg.cash?`<div class="htm-cash" aria-live="polite"><span>Cash</span><b>${money(Save.data.cash)}</b></div>`:''}
      <button class="htm-x" data-act="close" aria-label="Close">${coarse()?'':'<kbd>Esc</kbd>'}<span aria-hidden="true">✕</span></button>
    </header>
    <nav class="htm-tabs" role="tablist"><kbd class="htm-tk">Q</kbd><div class="htm-tabrow"></div><kbd class="htm-tk">E</kbd></nav>
    <div class="htm-body"><div class="htm-gridwrap"><div class="htm-grid" role="list"></div></div><aside class="htm-detail" aria-live="polite"></aside></div>
    <footer class="htm-foot"><span class="htm-tagline">${esc(cfg.tagline||'')}</span><span class="htm-keys"></span></footer>
  </div><div class="htm-scrim" data-act="sheetclose"></div><div class="htm-toast" role="status"></div>`;
  (document.querySelector('.ht-root')||document.body).appendChild(el); // inside the HUD root: shares its design tokens
  return{el,panel:el.querySelector('.htm-panel'),grid:el.querySelector('.htm-grid'),gridwrap:el.querySelector('.htm-gridwrap'),detail:el.querySelector('.htm-detail'),
    tabrow:el.querySelector('.htm-tabrow'),chips:el.querySelector('.htm-chips'),cash:el.querySelector('.htm-cash b'),keys:el.querySelector('.htm-keys'),toast:el.querySelector('.htm-toast')}}

function keysHTML(list){const gp=pad.on;return list.map(([k,g,t])=>`<span><kbd>${gp?g:k}</kbd>${t}</span>`).join('')}

/* Controller base: wires input to the menu-specific handlers. */
function runMenu(m){
  if(current)current.close(true);current=m;
  const prevFocus=document.activeElement;
  const onKey=e=>{if(!m.alive)return;const k=e.key;
    e.stopPropagation();
    if(k==='Tab'){e.preventDefault();const l=navList(m.ui.el);if(!l.length)return;const i=l.indexOf(document.activeElement);focusEl(m,l[(i+(e.shiftKey?-1:1)+l.length)%l.length]);return}
    const lk=k.toLowerCase();
    if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(lk)){if(e.target&&e.target.tagName==='TEXTAREA')return;e.preventDefault();
      m.input('nav',{arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'}[lk]);return}
    if(e.repeat&&!['enter',' '].includes(lk))return;
    if(lk==='enter'||lk===' '){if(e.target&&e.target.tagName==='TEXTAREA')return;e.preventDefault();m.input('ok');return}
    if(lk==='escape'||lk==='backspace'){e.preventDefault();m.input('back');return}
    if(lk==='q'||lk==='['||lk==='pageup'){e.preventDefault();m.input('tabprev');return}
    if(lk==='e'||lk===']'||lk==='pagedown'){e.preventDefault();m.input('tabnext');return}
    if(lk==='x'){m.input('alt');return}
    if(/^[1-9]$/.test(lk)){m.input('num',+lk);return}};
  root.addEventListener('keydown',onKey,true); // keyups pass through so the game releases held keys
  padStart((a,d)=>{if(!m.alive)return;if(a==='padconnect'){m.refreshKeys&&m.refreshKeys();return}m.input(a,d)});
  m.ui.el.addEventListener('click',e=>{ac();const t=e.target.closest('[data-act],[data-key]');if(!t||!m.ui.el.contains(t))return;m.click(t,e)});
  m.ui.el.addEventListener('focusin',e=>{const t=e.target.closest('[data-key]');if(t)m.focusItem&&m.focusItem(t)});
  m.close=(silent)=>{if(!m.alive)return;m.alive=false;root.removeEventListener('keydown',onKey,true);padStop();
    m.offs.forEach(f=>f());m.ui.el.classList.add('htm-out');if(!silent)sfx('close');
    const el=m.ui.el;setTimeout(()=>el.remove(),reduced()?0:180);if(current===m)current=null;
    try{if(prevFocus&&prevFocus.focus)prevFocus.focus({preventScroll:true})}catch(e){}
    Save.flush();if(!silent&&m.onClose)m.onClose()};
  m.alive=true;sfx('open');
  requestAnimationFrame(()=>m.ui.el.classList.add('htm-in'));
  return m}
function focusEl(m,el,quiet){if(!el)return;el.focus({preventScroll:true});
  const wrap=el.closest('.htm-gridwrap,.htm-detail');
  if(wrap){const r=el.getBoundingClientRect(),w=wrap.getBoundingClientRect(),pad=14;
    if(r.top<w.top+pad)wrap.scrollTop-=w.top+pad-r.top;else if(r.bottom>w.bottom-pad)wrap.scrollTop+=r.bottom-(w.bottom-pad)}
  if(!quiet)sfx('move')}
function toast(m,txt,kind){const t=m.ui.toast;t.textContent=txt;t.className='htm-toast on '+(kind||'');clearTimeout(t._t);t._t=setTimeout(()=>t.className='htm-toast',2200)}
function shake(el){el.classList.remove('htm-shake');void el.offsetWidth;el.classList.add('htm-shake')}
function floatText(m,from,txt,cls){const r=from.getBoundingClientRect(),c=(m.ui.cash||m.ui.chips).getBoundingClientRect();const f=document.createElement('div');f.className='htm-float '+(cls||'');f.textContent=txt;
  f.style.left=(r.left+r.width/2)+'px';f.style.top=(r.top)+'px';document.body.appendChild(f);
  requestAnimationFrame(()=>{f.style.transform=`translate(${c.left+c.width/2-(r.left+r.width/2)}px,${c.top-r.top}px) scale(.8)`;f.style.opacity='0'});setTimeout(()=>f.remove(),900)}

/* --- shared detail-panel pieces --- */
function barsHTML(cur,next,opts){opts=opts||{};
  return`<div class="htm-bars">${next.map((b,i)=>{const c=cur?cur[i].v:b.v,n=b.v,d=n-c,dir=Math.abs(d)<.05?'eq':d>0?'up':'down';
    const lo=Math.min(c,n),hiV=Math.max(c,n);
    return`<div class="htm-bar" data-d="${dir}"><span class="l">${esc(b.label)}</span><span class="tr"><i class="b" style="width:${lo*10}%"></i>${dir==='eq'?'':`<i class="dl" style="left:${lo*10}%;width:${(hiV-lo)*10}%"></i>`}<s></s></span>`+
      `<span class="v">${n.toFixed(1)}${dir==='eq'?'':`<em>${d>0?'▲':'▼'}${Math.abs(d).toFixed(1)}</em>`}</span></div>`}).join('')}</div>`}
function factsHTML(rows){return`<div class="htm-facts">${rows.filter(Boolean).map(([k,v,d])=>`<div><span>${esc(k)}</span><b>${v}${d?` <em class="${d[0]==='+'||d[0]==='▲'?'up':'down'}">${esc(d)}</em>`:''}</b></div>`).join('')}</div>`}
const fmtS=x=>(Math.round(x*100)/100).toString().replace(/^0\./,'.')+' s';
function reloadTime(w){return w.reload.tac?w.reload.tac:w.reload.shell.start+w.reload.shell.each*w.mag+w.reload.shell.end}
function gunFacts(w,base){const d=(a,b,fmt,lowGood)=>{if(!base||Math.abs(a-b)<1e-6)return null;const up=lowGood?a<b:a>b;return(up?'▲ ':'▼ ')+fmt(Math.abs(a-b))};
  return factsHTML([['Ammo',AMMO[w.ammo].name],['Magazine',w.mag,base&&d(w.mag,base.mag,x=>x)],['Carried',w.reserve],['Reload',fmtS(reloadTime(w)),base&&d(reloadTime(w),reloadTime(base),fmtS,true)],
    ['Fire',w.auto?'Full auto':w.pellets>1?w.pellets+' pellets':'Semi'],w.muffled?['Sound','Muffled']:null])}
const slotName={side:'Sidearm',prim:'Primary',p1:'Primary 1',p2:'Primary 2',p3:'Gun rack'};

/* =====================================================================
   SHOP
   ===================================================================== */
const TAG_TXT={seat:'Seating','tv-facing':'TV time',tv:'TV time',dining:'Dinner',play:'Playtime',dogbed:'Dog naps',gather:'Hangouts',garage:'Garage hangs'};
const SECTION_OF_ROOM={'Living room':'Living room',Dining:'Dining & kitchen',Kitchen:'Dining & kitchen',Garage:'Garage',Backyard:'Backyard',Porch:'Backyard'};
/* display copy for HT.Garage cosmetics (numbers and prices stay in HT.Garage) */
const COS_TXT={
  paint:{slate:['Slate Blue','The color it came in. The color of quiet competence.'],silver:['Minivan Silver','Blends into every school pickup line in America.'],cranberry:['Cranberry','Thanksgiving, but make it a vehicle.'],
    forest:['Forest','For the dad who owns more than one flannel.'],sand:['Sandstone','HOA pre-approved. The board wept with relief.'],white:['Soccer-Ball White','Shows every speck of mud. Which is the point, apparently.'],
    orange:['Hi-Vis Orange','Visible from space. Visible from the principal\'s office.'],black:['Grill-Master Black','Very serious. Still has a stick-figure family on the back.'],
    twotone:['Two-Tone Sunday','Cream over brown, like your grandfather\'s station wagon and your grandfather\'s couch.'],wood:['Wood-Grain Side Panels','The faux wood is real faux wood.'],mural:['Riverside Mural Wrap','Painted by the Second Gear kids. Every tag on it is a thank-you.']},
  rims:{steel:['Steelies','Stock. Honest. A little rusty around the lug nuts.'],alloy:['Alloys','Lighter, shinier, and somehow more expensive to clean.'],chrome:['Chrome','You can check your hair in them. You will.'],
    spinner:['Hubcap Spinners','They keep spinning at red lights. Tyler is in heaven.'],gold:['Gold','For the dad who has everything.']},
  tint:{none:['No Tint','Everyone can see you singing along.'],light:['Light Tint · 35%','Just enough to hide the snack wrappers.'],limo:['Limo Tint · 70%',"Tyler keeps waving at people. They can't see him. He keeps waving."]},
  lightBar:{amber:['Neighborhood Watch Light Bar','Amber and white. Never red and blue: you are a dad, not a police car. Hold H to flash it.']},
  spoiler:{on:['Spoiler','Adds 0 mph. Adds 40 cool.']},
  horn:{stock:['Two-Tone (stock)','Two notes. Both apologetic.'],shave:['Shave and a Haircut','The answer is always "two bits."'],ode:['Ode to Joy','Beethoven, 1824. Your neighbors, 7:15 a.m.'],
    ballgame:['Take Me Out to the Ball Game','Plays the first line. The whole street finishes it.'],elise:['Für Elise','Every piano lesson in Maple Heights, in one honk.'],
    tell:['William Tell Finale','Good for chases. Great for drive-thrus.'],entertainer:['The Entertainer',"Benny's truck song. Kids appear from nowhere."]}};
const COS_GROUP={paint:'Paint',rims:'Wheels',tint:'Tint',lightBar:'Extras',spoiler:'Extras',horn:'Horn'};
const VEH_BLURB={minivan:'The one that started it all. Seven seats, a cup holder for every mood.',workvan:'For the dad who owns a ladder. Three seats, room for two extra mags of everything.',
  pickup:'Bed holds two coolers or one Big Dave. Five seats, hits like a tailgate.',suv:'Seats seven. Fits one ego. The toughest and fastest thing on the lot.'};
function garItem(id){return HT.Garage&&HT.Garage.CATALOG.find(c=>c.id===id)}
function garFx(it){const G=HT.Garage;if(!it)return'';const n=v=>(v>=1?'×':'×')+(+v.toFixed(2));
  if(it.slot==='engine'){const e=G.ENGINE[it.lvl];return'Top speed +'+e.m+' m/s, boost +'+e.b+' m/s, acceleration '+n(e.a)}
  if(it.slot==='tyres'){const t=G.TYRES[it.lvl];return'Grip '+n(t.g)+', steering '+n(t.s)+', turning '+n(t.t)}
  if(it.slot==='brakes'){const b=G.BRAKES[it.lvl];return'Brakes '+n(b.b)+', handbrake '+n(b.h)+(it.lvl>=2?', no sliding under braking':'')}
  if(it.slot==='armor'){const a=G.ARMOR[it.lvl];return'Van HP +'+a.hp+', bullet damage '+n(a.bul)}
  return{sport:'Press N (or SPORT): '+G.SPORT.dur+' s burst, acceleration ×'+G.SPORT.accMul+', top speed boost +'+G.SPORT.maxAdd+' m/s, '+G.SPORT.cool+' s recharge. Spoiler included.',
    bullBar:'Front ram damage ×2, front impact damage ×0.5',cargo:'+2 reserve mags of every carried ammo type at each mission start',
    rack:'A 4th loadout slot (key 4) for another primary',aid:'Once per job: get back up at 50 HP instead of going down. Or instantly revive a downed buddy.',
    hitch:"Tow broken-down cars (and anything else that holds still). Hold E behind a car's front bumper."}[it.slot]||''}
function itemData(kind,id){if(kind==='gun')return GUNS[id];if(kind==='att')return ATTACHMENTS[id];if(kind==='furn')return FURNITURE[id];if(kind==='sup')return SUPPLIES[id];if(kind==='gad')return GADGETS[id];
  const G=HT.Garage;
  if(kind==='gar'){const it=garItem(id)||{};return it.group==='vehicle'?{name:it.name,blurb:VEH_BLURB[it.type]||it.blurb}:{name:it.name,blurb:it.blurb}}
  if(kind==='car')return{name:G?G.VEH[id].name:id,blurb:VEH_BLURB[id]};
  if(kind==='cos'){const[g,o]=id.split(':');const t=(COS_TXT[g]||{})[o]||[o,''];return{name:t[0],blurb:t[1]}}
  if(kind==='stick')return{name:'"'+(G?G.COSMETICS.stickers[+id]:id)+'"',blurb:'Bumper sticker. Three slots on the back. Peel one off anytime, Sal has a razor blade.'};
  if(kind==='rep'){const t=repCar(Save.data);
    if(id==='lights')return{name:'New Lamps',blurb:'Bulbs, lenses, a bead of silicone. Sal stopped using tape in 2009.'};
    if(id==='tyre')return{name:'Fresh Tyre',blurb:'Sal swaps the flat and checks the other three. Thump-free driving.'};
    if(id==='patch')return{name:'Patch What You Can Afford',blurb:'Sal starts with whatever is smoking and works outward until the money runs out.'};
    if(!t.own)return{name:'Fixing '+t.name+' before '+t.owner+' notices',blurb:'Sal knows '+t.owner+'. Sal will not tell '+t.owner+'. Dents, lamps, the works, $2 a hit point. Bring it back looking like this and '+t.owner+' might even say thanks.'};
    return{name:'Full Repair',blurb:'Sal hammers out the dents, tapes the mirror, and does not ask what happened. $2 a hit point.'}}
  return{}}
/* which vehicle (and look) a tile or the hero should show; null = not a vehicle picture */
function vehicleFor(kind,id,hero){const G=HT.Garage;if(!G)return null;const g=Save.data.garage;
  if(kind==='car'||(kind==='gar'&&id.startsWith('v_'))){const t=kind==='car'?id:id.slice(2);return{type:t,opts:g.owned.includes(t)?G.vehicleOpts(g,t):{color:{workvan:'#f2f2ee',pickup:'#8a2f2a',suv:'#1f2226'}[t]||'#35577d',upgrades:{}}}}
  if((kind==='cos'&&!id.startsWith('horn'))||(kind==='gar'&&['bull','cargo','sport'].includes(id))||(hero&&kind==='stick')){const st=vanStatsWith(kind,id);return{type:st.type,opts:st.makeOpts,stats:st}}
  return null}
/* attachment thumbnails show a real gun wearing the part: the chosen target, else your first equipped compatible gun */
function gunFor(kind,id,target){if(kind!=='att')return null;const a=ATTACHMENTS[id],s=Save.data;
  const g=target&&a.compat.includes(target)?target:[s.loadout.p1,s.loadout.p2,s.loadout.side].find(x=>x&&a.compat.includes(x))||a.compat.find(x=>s.owned.guns.includes(x))||a.compat[0];
  return{gun:{type:g,attachments:gunMods({[a.slot]:id})}}}
function shopEntries(store,tab){
  const E=[],G=HT.Garage;
  if(tab==='resale'){for(const l of HT.Resale.list())E.push({kind:'resale',id:l.id,key:'resale:'+l.id,sec:l.sec||null});return E}
  if(tab==='guns'){for(const id of GUN_ORDER)E.push({kind:'gun',id,sec:GUNS[id].slot==='side'?'Sidearms':'Primaries'})}
  else if(tab==='att'){for(const id in ATTACHMENTS)E.push({kind:'att',id})}
  else if(tab==='furn'){const secs=['Living room','Dining & kitchen','Garage','Backyard','Odds & ends'];
    const list=FURN_ORDER.filter(id=>store!=='hardware'||FURNITURE[id].hw).map(id=>({kind:'furn',id,sec:SECTION_OF_ROOM[FURNITURE[id].room]||'Odds & ends'}));
    list.sort((a,b)=>secs.indexOf(a.sec)-secs.indexOf(b.sec));E.push(...list)}
  else if(tab==='sup'){for(const id in SUPPLIES)E.push({kind:'sup',id})}
  else if(tab==='gad'){for(const id of GADGET_ORDER)E.push({kind:'gad',id})}
  else if(!G){}
  else if(tab==='perf'||tab==='prot'||tab==='util'){const secN={engine:'Engine',tyres:'Tyres',brakes:'Brakes',sport:'Sport',bullBar:'Front',armor:'Panels',cargo:'Utility',rack:'Utility',aid:'Utility',hitch:'Utility'};
    for(const c of G.CATALOG)if(c.group===tab)E.push({kind:'gar',id:c.id,sec:secN[c.slot]})}
  else if(tab==='looks'){const C=G.COSMETICS;
    for(const o in C.paint)E.push({kind:'cos',id:'paint:'+o,sec:'Paint'});for(const o in C.rims)E.push({kind:'cos',id:'rims:'+o,sec:'Wheels'});
    for(const o in C.tint)E.push({kind:'cos',id:'tint:'+o,sec:'Tint'});E.push({kind:'cos',id:'lightBar:amber',sec:'Extras'},{kind:'cos',id:'spoiler:on',sec:'Extras'});
    for(const o in G.HORNS)E.push({kind:'cos',id:'horn:'+o,sec:'Horn'});C.stickers.forEach((t,i)=>{if(!(STICKER_REQ[i]&&STICKER_REQ[i].mart))E.push({kind:'stick',id:String(i),sec:'Bumper stickers'})})}
  else if(tab==='stick'){G.COSMETICS.stickers.forEach((t,i)=>E.push({kind:'stick',id:String(i)}))}
  else if(tab==='cars'){for(const t of['minivan','workvan','pickup','suv'])E.push({kind:'car',id:t})}
  else if(tab==='repair'){const s=Save.data,q=repairQuote(s);E.push({kind:'rep',id:'active',sec:q.car.own?null:'Borrowed'});
    if(q.total&&s.cash<Math.round(q.total*(1-discountFor('auto',s)))&&s.cash>=2)E.push({kind:'rep',id:'patch'});
    if(q.rows.some(r=>r.id==='lights')&&q.rows.length>1)E.push({kind:'rep',id:'lights'});if(q.rows.some(r=>r.id==='tyre')&&q.rows.length>1)E.push({kind:'rep',id:'tyre'})}
  for(const e of E){e.key=e.kind+':'+e.id}
  return E}
function entryName(kind,id){if(kind==='resale')return(HT.Resale.get(id)||{}).title||id;const d=itemData(kind,id);return d&&d.name||id}
function entrySub(kind,id){const G=HT.Garage;if(kind==='resale'){const l=HT.Resale.get(id)||{};return esc((l.seller||'')+' · '+(l.where||'Neighbourly Resale')+(l.ago?' · '+l.ago:''))}
  if(kind==='gun'){const g=GUNS[id];return slotName[g.slot]+' · '+AMMO[g.ammo].name}
  if(kind==='att'){const a=ATTACHMENTS[id];return ATT_SLOTS.find(s=>s[0]===a.slot)[1]+' · fits '+a.compat.length+' guns'}
  if(kind==='furn'){const f=FURNITURE[id];return f.room+' · '+f.cells[0]+'×'+f.cells[1]+' m'}
  if(kind==='sup')return'Next mission only';
  if(kind==='gad'){const g=GADGETS[id];return'Gadget · key '+g.key+(g.battery?' · '+Math.round(g.battery/60)+' min battery':' · no batteries to buy')}
  if(kind==='gar'){const it=garItem(id);if(it.group==='vehicle'){const v=G.VEH[it.type];return v.seats+' seats · '+v.hp+' HP'}
    if(it.lvl&&G.CATALOG.filter(c=>c.slot===it.slot).length>1){const n=G.CATALOG.filter(c=>c.slot===it.slot).length;return`<span class="htm-pips">${Array.from({length:n},(x,i)=>`<i class="${i<it.lvl?'on':''}"></i>`).join('')}</span>Stage ${it.lvl}`}
    return({perf:'Performance',prot:'Protection',util:'Utility · moves with you'})[it.group]}
  if(kind==='car'){const v=G.VEH[id];return v.seats+' seats · '+v.hp+' HP'+(v.cargo?' · +'+v.cargo+' mags':'')}
  if(kind==='cos'){const[g]=id.split(':');return COS_GROUP[g]}
  if(kind==='stick')return'Bumper sticker';
  if(kind==='rep'){const q=repairQuote(Save.data),n=q.rows.length;
    if(id==='lights'||id==='tyre')return(q.rows.find(r=>r.id===id)||{detail:''}).detail;
    if(id==='patch')return'+'+Math.round(repPrice('patch',Save.data)/2)+' HP · engine first';
    return esc(q.car.name)+' · '+Math.round(q.hp)+' / '+q.maxHp+' HP'+(n?' · '+n+' thing'+(n>1?'s':'')+' wrong':'')}
  return''}

function tagHTML(st){if(st.kind==='resale')return st.state==='owned'?'<span class="htm-chip s-owned">Messaged</span>':st.state==='locked'?'<span class="htm-chip s-locked">'+esc(st.reason||'Sold')+'</span>':`<span class="htm-price">${st.price?money(st.price):'Free'}</span>`;
  if(st.state==='buy'||st.state==='poor')return`<span class="htm-price${st.state==='poor'?' poor':''}">${st.discount?`<s>${money(st.base)}</s>`:''}${st.price?money(st.price):'Free'}</span>`;
  const lab={owned:st.kind==='car'?'In the driveway':'Owned',equipped:st.kind==='car'?'Driving':st.kind==='gar'||st.kind==='stick'?'Installed':st.kind==='cos'?'On the van':'Equipped',
    pending:'On its way',maxed:st.kind==='furn'?'Have one':st.kind==='rep'?'Like new':'Maxed',locked:'Locked'}[st.state];
  return`<span class="htm-chip s-${st.state}">${st.state==='locked'?'<i class="htm-lock"></i>':''}${lab}</span>`}

const tCls=k=>k==='gad'?'sup':k;
function shopTile(e,st,sel){
  const lockR=st.state==='locked'?`<span class="htm-ireason">${esc(st.reason||'')}</span>`:'';
  return`<button class="htm-item${sel?' sel':''}" data-nav data-key="${e.key}" data-state="${st.state}" role="listitem" aria-label="${esc(entryName(e.kind,e.id))}">
    <span class="htm-thumb t-${tCls(e.kind)}">${thumbHTML(e.kind,e.id,vehicleFor(e.kind,e.id)||gunFor(e.kind,e.id))}${e.kind==='att'?`<span class="htm-attbadge">${iconSVG('att',e.id)}</span>`:''}</span>
    <span class="htm-itx"><span class="htm-iname">${esc(entryName(e.kind,e.id))}</span><span class="htm-isub">${entrySub(e.kind,e.id)}</span>${lockR}</span>
    <span class="htm-tag">${tagHTML(st)}</span></button>`}

function buyButtonHTML(st,armed,store){
  const t=coarse()?'Tap':'Press Enter';
  if(st.state==='buy'){const verb=store==='dadazon'?'Order':st.kind==='rep'?'Repair':st.kind==='gar'&&!(st.item&&st.item.group==='vehicle')?'Install':'Buy';
    return armed?`<button class="htm-btn armed" data-nav data-act="primary"><span>Confirm · ${money(st.price)}</span><small>${t} again</small></button>`
      :`<button class="htm-btn" data-nav data-act="primary"><span>${verb} · ${st.price?money(st.price):'Free'}</span></button>`}
  if(st.state==='poor')return`<button class="htm-btn poor" data-nav data-act="primary" aria-disabled="true"><span>Need ${money(st.short)} more</span></button>`;
  if(st.state==='locked')return`<button class="htm-btn off" data-nav data-act="primary" aria-disabled="true"><span><i class="htm-lock"></i>${esc(st.reason||'Locked')}</span></button>`;
  if(st.state==='pending')return`<button class="htm-btn off" data-nav data-act="primary" aria-disabled="true"><span>On its way · on the porch after your next job</span></button>`;
  if(st.state==='maxed')return`<button class="htm-btn off" data-nav data-act="primary" aria-disabled="true"><span>${esc(st.reason||'Maxed out')}</span></button>`;
  const use={car:'Drive this one',cos:'Use this one',stick:'Stick it on'}[st.kind];
  if(st.state==='owned'&&use)return`<button class="htm-btn" data-nav data-act="primary"><span>${use}</span></button>`;
  if(st.state==='equipped'&&st.kind==='stick')return`<button class="htm-btn alt" data-nav data-act="primary"><span>Peel it off</span></button>`;
  if(st.kind==='sup')return`<button class="htm-btn off" data-nav data-act="primary" aria-disabled="true"><span>Packed for the next job</span></button>`;
  if(st.kind==='gad'){const g=GADGETS[st.id];return st.state==='equipped'?`<button class="htm-btn alt" data-nav data-act="primary"><span>${esc(g.off)}</span></button>`:`<button class="htm-btn" data-nav data-act="primary"><span>${esc(g.on)}</span></button>`}
  const off={car:"You're driving it",cos:'On the van now',gar:'Installed'}[st.kind];
  return`<button class="htm-btn off" data-nav data-act="primary" aria-disabled="true"><span>${off||(st.state==='equipped'?'Equipped':'In your locker')}</span></button>`}

function stampHTML(st,store){
  if(st.state==='equipped')return`<span class="htm-stamp s-eq">${st.kind==='car'?'Driving':st.kind==='cos'||st.kind==='stick'?'On the van':st.kind==='gar'?'Installed':'Equipped'}</span>`;
  if(st.state==='owned')return`<span class="htm-stamp s-own">${st.how==='collected'?'Collected':st.kind==='car'?'Yours':'Owned'}</span>`;
  if(st.state==='pending'||st.pend)return`<span class="htm-stamp s-pend">Ordered</span>`;
  if(st.kind==='furn'&&st.have)return`<span class="htm-stamp s-own">Own ${st.have}</span>`;
  if(st.state==='maxed'&&st.kind==='rep')return`<span class="htm-stamp s-own">Like new</span>`;
  return''}

function hpBar(cur,max,label){return`<div class="htm-hp"><div class="htm-hph"><span>${esc(label)}</span><b>${Math.round(cur)} / ${max} HP</b></div><div class="htm-hpt"><i style="width:${100*cur/max}%" class="${cur<max*.3?'low':cur<max*.7?'mid':''}"></i></div></div>`}
function shopDetail(m,e){if(e.kind==='resale')return HT.Resale.detail(m,e);
  const s=Save.data,st=status(e.kind,e.id,m.store),d=itemData(e.kind,e.id)||{},armed=m.armed===e.key,G=HT.Garage;
  let kicker='',body='',name=entryName(e.kind,e.id),blurb=d.blurb||'',fx='';
  if(e.kind==='gun'){const g=GUNS[e.id];kicker=slotName[g.slot]+' · '+g.cls+' · '+AMMO[g.ammo].name;
    const L=s.loadout;let cmp=g.slot==='side'?L.side:(L.p1===e.id?L.p2:L.p1);if(cmp===e.id)cmp=null;
    const me=weaponStats(e.id,s.attOn[e.id]||{}),other=cmp?weaponStats(cmp,s.attOn[cmp]||{}):null;
    body=`<div class="htm-cmp">${cmp?`Compared with your <b>${esc(GUNS[cmp].name)}</b> <span class="htm-legend"><i class="up"></i>better <i class="down"></i>worse</span>`:st.state==='equipped'?'In your loadout':'Nothing to compare with'}</div>`+
      barsHTML(other?gunBars(other):null,gunBars(me))+gunFacts(me,other);
    if(g.unlock.collect&&st.state!=='equipped'&&st.state!=='owned'){const c=st.collect||{n:0,need:g.unlock.collect};
      body+=`<div class="htm-collect"><span>Armory: pick up ${c.need} from crooks to get it free</span><span class="htm-meter"><i style="width:${100*c.n/c.need}%"></i></span><b>${c.n}/${c.need}</b></div>`}}
  else if(e.kind==='att'){const a=ATTACHMENTS[e.id];kicker=ATT_SLOTS.find(x=>x[0]===a.slot)[1]+' attachment';
    const owned=a.compat.filter(g=>s.owned.guns.includes(g)),eq=[s.loadout.p1,s.loadout.p2,s.loadout.side].filter(g=>g&&a.compat.includes(g));
    const pool=eq.length?[...new Set([...eq,...owned])]:owned.length?owned:a.compat;
    if(!m.attTarget||!pool.includes(m.attTarget))m.attTarget=pool[0];const g=m.attTarget;
    const cur=Object.assign({optic:null,mag:null,under:null,muzzle:null},s.attOn[g]||{});const before=weaponStats(g,Object.assign({},cur,{[a.slot]:null})),after=weaponStats(g,Object.assign({},cur,{[a.slot]:e.id}));
    body=`<div class="htm-cmp">Try it on <button class="htm-cycle" data-nav data-act="target" ${pool.length<2?'disabled':''}><span>‹</span><b>${esc(GUNS[g].name)}</b><span>›</span></button></div>`+
      barsHTML(gunBars(before),gunBars(after))+gunFacts(after,before)+
      `<div class="htm-fx" style="margin-top:12px"><b>What it does</b>${esc(a.fx)}</div><div class="htm-fits"><span>Fits</span>${a.compat.map(id=>`<i class="${s.owned.guns.includes(id)?'own':''}">${esc(GUNS[id].short)}</i>`).join('')}</div>`}
  else if(e.kind==='furn'){const f=FURNITURE[e.id];const zn={in:'Indoors',out:'Outdoors',any:'Inside or out'}[f.zone];kicker=f.room===zn||f.room==='Backyard'?f.room:f.room+' · '+zn;
    const own=s.furniture.owned[e.id]||0,placed=s.furniture.placed.filter(p=>p.id===e.id).length;
    const cells=[];for(let z=0;z<3;z++)for(let x=0;x<3;x++)cells.push(`<i class="${x<f.cells[0]&&z<f.cells[1]?'on':''}"></i>`);
    body=`<div class="htm-furn"><div class="htm-fp"><div class="htm-fpg">${cells.join('')}</div><span>${f.cells[0]} × ${f.cells[1]} m${f.layer==='floor'?' · goes under things':''}</span></div>
      <div class="htm-fans"><span>Who'll love it</span><div>${(f.fans||[]).length?f.fans.map(w=>`<b style="--c:${FAMILY[w].col}"><i>${FAMILY[w].name[0]}</i>${FAMILY[w].name}</b>`).join(''):'<em>Mostly you</em>'}${(f.hates||[]).map(w=>`<b class="hate" style="--c:${FAMILY[w].col}"><i>${FAMILY[w].name[0]}</i>${FAMILY[w].name} hates it</b>`).join('')}</div></div></div>`+
      factsHTML([['You own',own?own+(placed?` · ${placed} placed`:''):'None yet'],['Family uses it',[...new Set(f.tags.map(t=>TAG_TXT[t]).filter(Boolean))].join(', ')||'Just looks nice']]);
    if(st.state==='owned'||own-placed>0)m.canSell=true}
  else if(e.kind==='sup'){const u=SUPPLIES[e.id];kicker='Supplies · next mission';fx=u.fx}
  else if(e.kind==='gad'){const u=GADGETS[e.id],g=gadget(s,e.id);kicker='Gadget · press '+u.key;fx=u.fx;
    if(g.owned)body=factsHTML([['In the field',g.equipped?'On your belt · key '+u.key:'Left at home'],u.battery?['Battery',Math.round(100*num(g.charge,1))+'% · '+Math.round(u.battery/60)+' min full']:null])}
  else if(G&&(e.kind==='gar'||e.kind==='car')){const it=e.kind==='gar'?garItem(e.id):null,veh=it&&it.group==='vehicle'?it.type:e.kind==='car'?e.id:null,g=s.garage,active=G.VEH[g.active].name;
    const now=vehicleStats();
    if(veh){const v=G.VEH[veh];kicker='Vehicle · '+v.seats+' seats';const then=vehicleStats(Object.assign(clone(s),{garage:Object.assign(clone(g),{owned:[...new Set([...g.owned,veh])],active:veh,vehicles:Object.assign(clone(g.vehicles),{[veh]:g.vehicles[veh]||defVehicle()})})}));
      body=(veh===g.active?'':`<div class="htm-cmp">Compared with your <b>${esc(active)}</b> <span class="htm-legend"><i class="up"></i>better <i class="down"></i>worse</span></div>`+barsHTML(vanBars(now),vanBars(then)))+
        (veh===g.active?barsHTML(null,vanBars(now)):'')+factsHTML([['Seats',v.seats+(v.seats<7?' · crew of '+(v.seats-1):'')],['Built-in cargo',v.cargo?'+'+v.cargo+' mags each':'None'],['Length',v.len+' m'],['Ramming','×'+v.ram]])+
        (g.owned.includes(veh)?'':'<div class="htm-note left">Your upgrades stay on the old ride. Utility items, stickers and horns move over free.</div>')}
    else{kicker=active+' · '+({perf:'Performance',prot:'Protection',util:'Utility'}[it.group]);fx=garFx(it);
      const then=st.state==='buy'||st.state==='poor'||st.state==='locked'?vanStatsWith('gar',e.id):now,bn=vanBars(now),bt=vanBars(then),moves=bt.some((b,i)=>Math.abs(b.v-bn[i].v)>.01);
      const ladder=G.CATALOG.filter(c=>c.slot===it.slot&&c.group!=='vehicle');
      body=(moves?`<div class="htm-cmp">Your ${esc(active)} <span class="htm-legend"><i class="up"></i>after install</span></div>`+barsHTML(bn,bt):'')+
        (ladder.length>1?`<ol class="htm-tiers">${ladder.map(c=>{const has=G.ownedIds(g).includes(c.id);return`<li class="${has?'done':c.id===e.id?'next':''}"><i></i><span>${esc(c.name)}</span><b>${has?'Installed':money(c.price)}</b></li>`}).join('')}</ol>`:'')+
        (it.group==='util'?'<div class="htm-note left">Utility items move with you to any vehicle you drive.</div>':'')}}
  else if(G&&e.kind==='cos'){const[gp,o]=e.id.split(':'),g=s.garage,v=g.vehicles[g.active];kicker=G.VEH[g.active].name+' · '+COS_GROUP[gp];
    if(gp==='horn')body=`<button class="htm-ghost" data-nav data-act="honk">▶ Honk it</button>`;
    if(gp==='paint'){const c=G.COSMETICS.paint[o];body=`<div class="htm-swatch" style="--c:${c.hex}"><i class="f-${c.finish}"></i><span>${esc(name)}</span></div>`}
    const cur={paint:v.paint,rims:v.rims,tint:v.tint,horn:g.horn}[gp];
    if(cur!=null)body+=factsHTML([['On it now',esc(((COS_TXT[gp]||{})[cur]||[cur])[0])],gp==='horn'?['Collected',s.garage.ownedHorns.length+' of '+Object.keys(G.HORNS).length]:['Preview','Live on the van above']])}
  else if(G&&e.kind==='stick'){const g=s.garage;kicker='Bumper sticker · '+g.stickers.filter(x=>x!=null).length+' of 3 slots used';
    body=`<div class="htm-stickers">${g.stickers.map(i=>`<span class="${i==null?'empty':''}">${i==null?'Empty slot':esc(G.COSMETICS.stickers[i])}</span>`).join('')}</div>`}
  else if(G&&e.kind==='rep'){const q=repairQuote(s),t=q.car;kicker=t.name+(t.own?'':' · borrowed from '+t.owner)+' · Repair';
    body=hpBar(q.hp,q.maxHp,t.own?'Health':t.owner+"'s car")+(q.rows.length?`<ul class="htm-reprows">${q.rows.map(r=>`<li><span><b>${esc(r.label)}</b><small>${esc(r.detail)}</small></span><em>${money(r.price)}</em></li>`).join('')}</ul>`:'')+
      `<div class="htm-note left">${t.own?(s.garage.tab?'Sal\'s tab: '+money(s.garage.tab)+' (comes out of your next payout). ':'')+'Free patch-up at home after a job: Tyler hammers it back to 60%. Mostly.':'Paying for it yourself keeps '+esc(t.owner)+' happy. Bringing it back wrecked costs trust.'}</div>`}
  const sellV=(e.kind==='gun'||e.kind==='att')&&(st.state==='owned')?sellValue(e.kind,e.id):e.kind==='furn'&&m.canSell?sellValue('furn',e.id):0;m.canSell=false;
  return`<div class="htm-hero t-${tCls(e.kind)}"><div class="htm-heroimg">${thumbHTML(e.kind,e.id,vehicleFor(e.kind,e.id,true)||gunFor(e.kind,e.id,m.attTarget))}</div>${stampHTML(st,m.store)}</div>
    <div class="htm-dscroll"><div class="htm-kicker">${esc(kicker)}</div><h3 class="htm-name">${esc(name)}</h3>
    ${blurb?`<p class="htm-blurb">${esc(blurb)}</p>`:''}${fx?`<div class="htm-fx"><b>What it does</b>${esc(fx)}</div>`:''}${body}</div>
    <div class="htm-buy"><div class="htm-buyrow">${buyButtonHTML(st,armed,m.store)}${sellV?`<button class="htm-ghost" data-nav data-act="sell">Sell · ${money(sellV)}</button>`:''}</div>
    ${m.store==='dadazon'&&st.state==='buy'?'<div class="htm-note">Free shipping · arrives on your porch after your next job</div>':st.discount&&st.state==='buy'?'<div class="htm-note">'+(m.store==='auto'?'Family discount':'Neighbor discount')+': you save '+money(st.base-st.price)+'</div>':''}</div>
    <button class="htm-sheetx" data-act="sheetclose" aria-label="Back to list">✕</button>`}

/* Thumbnail renderer for real 3D: glTF files (item.model), guns via HT.Guns.model(type), vehicles via HT.Vehicles.make(type,{color,upgrades}).
   One shared offscreen WebGL renderer, studio light, transparent background (the card supplies the pegboard / garage / room backdrop).
     HT.Shop.thumbRenderer = HT.Shop.gltfThumbs(THREE, new THREE.GLTFLoader(), {kinds:['furn','gun','car','gar','cos']})   */
function gltfThumbs(THREE,loader,o){o=o||{};const W=o.width||320,Hh=o.height||200;let R=null,queue=Promise.resolve();
  const toObj=x=>x&&(x.isObject3D?x:x.group&&x.group.isObject3D?x.group:x.scene&&x.scene.isObject3D?x.scene:null);
  const source=item=>{
    if(item.vehicle&&HT.Vehicles&&HT.Vehicles.make){return Promise.resolve(HT.Vehicles.make(item.vehicle.type,Object.assign({lod:0},item.vehicle.opts))).then(h=>({obj:toObj(h),view:'car',done:()=>{try{h&&h.dispose&&h.dispose()}catch(e){}}}))}
    const gq=item.gun||(item.kind==='gun'?{type:item.id}:null);
    if(gq&&HT.Guns&&HT.Guns.model){return Promise.race([HT.Guns.ready||null,new Promise(r=>setTimeout(r,3000))]).then(()=>HT.Guns.model(gq.type,{attachments:gq.attachments||{}})).then(x=>({obj:toObj(x),view:'gun',done:()=>{}}))}
    if(item.model&&loader)return new Promise((res,rej)=>loader.load((o.base||'')+item.model,g=>res({obj:g.scene,view:'furn',done:()=>g.scene.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)[].concat(n.material).forEach(m=>{for(const k in m)if(m[k]&&m[k].isTexture)m[k].dispose();m.dispose()})})}),undefined,rej));
    return null};
  const VIEW={furn:[[.75,.55,1],.86,.14],gun:[[1,.16,.08],.5,0],car:[[.95,.38,.85],.56,.04]};
  const render=src=>{const obj=src.obj;if(!obj)throw new Error('no object');
    if(!R){R=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});R.setPixelRatio(o.pixelRatio||2);R.setSize(W,Hh);R.outputEncoding=THREE.sRGBEncoding;
      if(THREE.ACESFilmicToneMapping){R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.15}}
    const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight(0xfff4e0,0x6b5a48,1.05));const k1=new THREE.DirectionalLight(0xffffff,1.7);k1.position.set(3,5,4);sc.add(k1);
    const k2=new THREE.DirectionalLight(0xbcd2ff,.6);k2.position.set(-4,2,-2);sc.add(k2);const k3=new THREE.DirectionalLight(0xffe2b0,.5);k3.position.set(0,1,-5);sc.add(k3);
    const parent=obj.parent;sc.add(obj);obj.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(obj),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
    const[dv,zoom,lift]=VIEW[src.view];const rad=Math.max(size.x,size.y*1.25,size.z)*.5||1;const cam=new THREE.PerspectiveCamera(28,W/Hh,.01,500);
    cam.position.copy(c).addScaledVector(new THREE.Vector3(...dv).normalize(),rad/Math.sin(THREE.MathUtils.degToRad(13))*(o.zoom||zoom));cam.lookAt(c.x,c.y+size.y*lift,c.z);
    R.setClearColor(0x000000,0);R.clear();R.render(sc,cam);const url=R.domElement.toDataURL('image/png');
    sc.remove(obj);if(parent)parent.add(obj);src.done();return url};
  return item=>{if(o.kinds&&!o.kinds.includes(item.kind)&&!(item.gun&&o.kinds.includes('gun')))return null;const s0=source(item);if(!s0)return null;
    const p=queue.then(()=>s0).then(render);queue=p.catch(()=>{});return p}}

const Shop={thumbRenderer:null,sfx:null,gltfThumbs,
  isOpen:()=>!!(current&&current.type==='shop'),
  close:()=>{if(current&&current.type==='shop')current.close()},
  clearThumbCache:()=>thumbCache.clear(),
  open(opts){opts=opts||{};const store=STORES[opts.kind]?opts.kind:'dadazon',S0=STORES[store];
    const sal=store==='auto'?'Sal: "'+(Save.data.crew.rosa&&Math.random()<.3?S0.lineRosa:pick(S0.lines))+'"':S0.tag;
    const ui=shell({kind:store,logo:store,title:S0.name,sub:S0.sub,who:S0.who,tagline:sal,cash:true});
    const m={type:'shop',store,ui,onClose:opts.onClose,onBuy:opts.onBuy,onPreview:opts.onPreview,tab:null,sel:null,armed:null,armT:0,offs:[],sheet:false};
    const tabs=S0.tabs;
    ui.tabrow.innerHTML=tabs.map(([id,lab])=>`<button class="htm-tab" role="tab" data-act="tab" data-tab="${id}" aria-selected="false">${esc(lab)}<i></i></button>`).join('');
    const chips=()=>{const s=Save.data,c=[];
      if(store==='hardware'&&discountFor('hardware')>0)c.push('<span class="htm-hchip good">Neighbor discount −10%</span>');
      if(store==='hardware'&&discountFor('hardware')===0)c.push('<span class="htm-hchip">Neighbor discount at 60% trust</span>');
      if(store==='mart')c.push(discountFor('mart')>0?'<span class="htm-hchip good">Neighbor discount −10%</span>':'<span class="htm-hchip">Neighbor discount at 60% Riverside trust</span>');
      if(store==='auto'){const g=s.garage;c.push(g.purchases>=5?'<span class="htm-hchip good">Family discount −5%</span>':`<span class="htm-hchip">Family discount after ${5-g.purchases} more</span>`)}
      if(store==='dadazon')c.push('<span class="htm-hchip good">Free shipping</span>');
      const pend=s.pending.length;if(pend&&store==='dadazon')c.push(`<span class="htm-hchip warn">${pend} order${pend>1?'s':''} on the way</span>`);
      ui.chips.innerHTML=c.join('')};
    m.refreshKeys=()=>{ui.keys.innerHTML=keysHTML([['↑↓←→','✥','Browse'],['Enter','Ⓐ',store==='dadazon'?'Order':'Buy'],['Q E','LB RB','Tabs'],['Esc','Ⓑ','Close']])};
    const tabCount=id=>shopEntries(store,id).filter(e=>status(e.kind,e.id,store).state==='buy').length;
    const renderTabs=()=>{for(const b of ui.tabrow.children){const on=b.dataset.tab===m.tab;b.classList.toggle('on',on);b.setAttribute('aria-selected',on);const n=tabCount(b.dataset.tab);b.querySelector('i').textContent=n||''}};
    const entries=()=>shopEntries(store,m.tab);
    const bay=store==='auto'?document.createElement('div'):null;
    if(bay){bay.className='htm-bay';ui.gridwrap.prepend(bay)}
    /* the bay: your current vehicle, previewing the selected look/part (and telling the game, so it can call h.setUpgrades on the real van) */
    let lastPrev=null;
    const renderBay=()=>{if(!bay)return;const G=HT.Garage;if(!G){bay.innerHTML='<div class="htm-baytx"><div class="htm-kicker">Dad\'s Auto</div><p class="htm-blurb">Sal is out. (js/carai.js is not loaded.)</p></div>';return}
      const e=m.sel&&entries().find(x=>x.key===m.sel);let pv=null;
      if(e&&(e.kind==='cos'||e.kind==='gar'||e.kind==='stick')&&!(e.kind==='gar'&&e.id.startsWith('v_'))&&!(e.kind==='cos'&&e.id.startsWith('horn'))){const st=status(e.kind,e.id,store);if(st.state!=='equipped')pv=vanStatsWith(e.kind,e.id)}
      if(REPAIR_CAR&&!REPAIR_CAR.own&&m.tab==='repair'){/* fixing a borrowed car: it's the one on the lift */const t=REPAIR_CAR,q=repairQuote(Save.data);
        bay.innerHTML=`<div class="htm-bayvan">${thumbHTML('car',t.type,{type:t.type,opts:{color:t.color,upgrades:{}}})}</div><div class="htm-baytx"><div class="htm-kicker">${esc(t.name)} · borrowed</div>
          <p class="htm-blurb">${q.total?esc(t.owner)+' lent you this in good faith. Sal can make it look like it never happened.':'Good as the day '+esc(t.owner)+' lent it to you.'}</p>${hpBar(q.hp,q.maxHp,t.owner+"'s car")}</div>`;
        if(lastPrev!==null){lastPrev=null;if(m.onPreview)try{m.onPreview(null)}catch(err){}}return}
      const now=vehicleStats(),vs=pv||now,g=Save.data.garage,bars=vanBars(vs),b0=vanBars(now);
      const inst=G.ownedIds(g).map(id=>garItem(id)).filter(c=>c.group!=='vehicle').map(c=>c.name);
      const veh={type:vs.type,opts:vs.makeOpts,stats:vs};
      bay.innerHTML=`<div class="htm-bayvan">${thumbHTML('car',vs.type,veh)}${pv?'<span class="htm-prev">Preview</span>':''}</div><div class="htm-baytx">
        <div class="htm-kicker">${esc(G.VEH[g.active].name)} · ${esc(((COS_TXT.paint[vs.paint.id]||[vs.paint.id])[0]))}</div>
        <div class="htm-baybars">${bars.map((b,i)=>`<div class="${b.v>b0[i].v+.01?'up':''}"><span>${b.label}</span><i><b style="width:${b.v*10}%"></b></i></div>`).join('')}</div>
        ${(()=>{const q=repairQuote(Save.data);return hpBar(q.hp,q.maxHp,q.car.own?'Health':q.car.name)})()}
        <div class="htm-bayinst">${inst.length?inst.map(x=>`<em>${esc(x)}</em>`).join(''):'<em class="none">Bone stock. Like the day you drove it off the lot.</em>'}</div></div>`;
      const key=pv?JSON.stringify(pv.makeOpts):null;if(key!==lastPrev){lastPrev=key;if(m.onPreview)try{m.onPreview(pv?{type:pv.type,opts:pv.makeOpts}:null)}catch(err){console.error(err)}}};
    m.renderGrid=(keepFocus)=>{renderBay();const list=entries();let html='',sec=null;
      for(const e of list){if(e.sec&&e.sec!==sec){sec=e.sec;html+=`<div class="htm-sec" role="presentation">${esc(sec)}</div>`}html+=shopTile(e,status(e.kind,e.id,store),e.key===m.sel)}
      const had=keepFocus&&document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.key;
      ui.grid.innerHTML=html;if(had){const el=ui.grid.querySelector(`[data-key="${had}"]`);if(el)el.focus({preventScroll:true})}renderTabs();chips()};
    m.renderDetail=()=>{const e=entries().find(x=>x.key===m.sel);if(!e){ui.detail.innerHTML='';return}
      const keepAct=document.activeElement&&ui.detail.contains(document.activeElement)?document.activeElement.dataset.act:null;
      ui.detail.innerHTML=shopDetail(m,e);if(keepAct){const b=ui.detail.querySelector(`[data-act="${keepAct}"]`);if(b)b.focus({preventScroll:true})}};
    m.select=(key,how)=>{if(m.sel===key&&how!=='force')return;m.sel=key;if(m.armed&&m.armed!==key)m.armed=null;
      for(const b of ui.grid.querySelectorAll('.htm-item'))b.classList.toggle('sel',b.dataset.key===key);m.renderDetail();renderBay()};
    m.setTab=(id,dir)=>{if(m.tab===id)return;m.tab=id;m.armed=null;ui.el.dataset.tab=id;ui.gridwrap.scrollTop=0;m.renderGrid();
      const first=ui.grid.querySelector('.htm-item:not([data-state=locked])')||ui.grid.querySelector('.htm-item');
      if(first){m.select(first.dataset.key,'force');if(!narrow())focusEl(m,first,true)}m.sheetOpen(false);
      ui.grid.classList.remove('htm-swap','l','r');void ui.grid.offsetWidth;ui.grid.classList.add('htm-swap',dir<0?'l':'r')};
    m.sheetOpen=on=>{m.sheet=!!on&&narrow();ui.el.classList.toggle('sheet',m.sheet);ui.detail.toggleAttribute('inert',narrow()&&!m.sheet);
      if(m.sheet){const b=ui.detail.querySelector('[data-act=primary]');if(b)setTimeout(()=>b.focus({preventScroll:true}),30)}};
    m.focusItem=t=>{if(t.closest('.htm-grid'))m.select(t.dataset.key)};
    const curEntry=()=>entries().find(x=>x.key===m.sel);
    m.primary=(btn)=>{const e=curEntry();if(!e)return;if(e.kind==='resale'){HT.Resale.act(m,'msg',e.id);return}const st=status(e.kind,e.id,store);
      if(st.state==='buy'){if(m.armed!==e.key){m.armed=e.key;clearTimeout(m.armT);m.armT=setTimeout(()=>{if(m.armed===e.key){m.armed=null;m.alive&&m.renderDetail()}},4000);sfx('arm');m.renderDetail();return}
        clearTimeout(m.armT);m.armed=null;const res=buy(e.kind,e.id,store);
        if(!res.ok){sfx('error');toast(m,res.reason,'bad');m.renderDetail();return}
        const from=ui.detail.querySelector('[data-act=primary]')||ui.detail;floatText(m,from,'−'+money(res.price),'spend');
        sfx(res.delivered==='pending'?'order':'buy');setTimeout(()=>sfx('stamp'),160);
        m.renderGrid(true);m.renderDetail();const stp=ui.detail.querySelector('.htm-stamp');if(stp){stp.classList.add('slam')}
        const tile=ui.grid.querySelector(`[data-key="${e.key}"]`);if(tile){tile.classList.add('htm-pop');setTimeout(()=>tile.classList.remove('htm-pop'),600)}
        toast(m,res.delivered==='pending'?entryName(e.kind,e.id)+' ordered. Biscuit will open it for you.':thanks(e),'good');
        if(m.onBuy)try{m.onBuy({kind:e.kind,id:e.id,price:res.price,store,delivered:res.delivered})}catch(err){console.error(err)}
        return}
      if(st.kind==='gad'&&(st.state==='owned'||st.state==='equipped')){const r=gadgetUse(e.id);
        if(r.ok){sfx('equip');toast(m,r.equipped?entryName('gad',e.id)+' packed. Press '+GADGETS[e.id].key+' in the field.':entryName('gad',e.id)+' stays home.','good');m.renderGrid(true);m.renderDetail();
          if(m.onBuy)try{m.onBuy({kind:'gad',id:e.id,price:0,store,delivered:'now',use:true})}catch(err){console.error(err)}}else{sfx('error');toast(m,r.reason,'bad')}return}
      if((st.state==='owned'&&['car','cos','stick'].includes(st.kind))||(st.state==='equipped'&&st.kind==='stick')){const r=garUse(e.kind,e.id);
        if(r.ok){sfx('equip');if(e.id.startsWith('horn:'))playHorn(hornOf(e.id.slice(5)));toast(m,st.kind==='car'?'Keys to the '+entryName('car',e.id)+'. Sal moved your utility gear over.':st.kind==='stick'?(st.state==='equipped'?'Peeled off. It left a rectangle.':'Stuck on. Slightly crooked. Perfect.'):'Done. Looks good on her.','good');
          m.renderGrid(true);m.renderDetail();if(m.onBuy)try{m.onBuy({kind:e.kind,id:e.id,price:0,store,delivered:'now',use:true})}catch(err){console.error(err)}}else{sfx('error');toast(m,r.reason,'bad')}return}
      sfx('error');shake(btn||ui.detail.querySelector('[data-act=primary]')||ui.detail);
      if(st.state==='poor')toast(m,'Not enough cash. Run a job, or rerun one for half pay.','bad');else if(st.state==='locked')toast(m,st.reason,'bad')};
    const thanks=e=>store==='auto'?(e.kind==='rep'?(REPAIR_CAR&&!REPAIR_CAR.own?'Sal: "'+REPAIR_CAR.owner+' will never know. I will know. I\'ll take it to my grave."':'Sal: "Good as new. Better, actually. Don\'t tell her I said that."'):pick(['Sal: "Installed. Drives like a dream. A minivan dream."','Sal: "She purrs now. Don\'t make her growl."','Sal: "Done. Topped up your wiper fluid. On the house."'])):
      pick(['Thanks for shopping local!','Bag? No? Good man.','Receipt is in the bag. Jen will find it.','Pleasure doing business, neighbor.']);
    m.input=(a,d)=>{const f=document.activeElement;
      if(a==='nav'){if(m.sheet&&!ui.detail.contains(f)){m.sheetOpen(false)}const scope=m.sheet?ui.detail:ui.el;const n=navMove(scope,d,scope.contains(f)?f:null);if(n)focusEl(m,n);return}
      if(a==='ok'){if(f&&f.dataset&&f.dataset.key){m.select(f.dataset.key);if(narrow()){m.sheetOpen(true);return}m.primary(f);return}if(f&&ui.el.contains(f)&&f.click){f.click();return}return}
      if(a==='back'){if(m.armed){m.armed=null;m.renderDetail();sfx('tick');return}if(m.sheet){m.sheetOpen(false);const t=ui.grid.querySelector(`[data-key="${m.sel}"]`);if(t)focusEl(m,t,true);return}m.close();return}
      if(a==='tabprev'||a==='tabnext'){const i=tabs.findIndex(t=>t[0]===m.tab),n=(i+(a==='tabnext'?1:-1)+tabs.length)%tabs.length;sfx('tab');m.setTab(tabs[n][0],a==='tabnext'?1:-1);return}
      if(a==='alt'){const s=ui.detail.querySelector('[data-act=sell]');if(s)s.click();return}
      if(a==='num'&&m.tab==='resale'&&HT.Resale.chatting(m)){const b=ui.detail.querySelector('[data-act="resale:say"][data-i="'+(d-1)+'"]');if(b)b.click();return}
      if(a==='num'&&d<=tabs.length){sfx('tab');m.setTab(tabs[d-1][0],1)}};
    m.click=(t,ev)=>{const act=t.dataset.act;
      if(t.dataset.key&&!act){m.select(t.dataset.key);if(narrow())m.sheetOpen(true);else if(ev.detail>=2)m.primary(t);return}
      if(act==='close')return m.close();
      if(act==='tab'){sfx('tab');return m.setTab(t.dataset.tab,1)}
      if(act==='primary')return m.primary(t);
      if(act==='sheetclose')return m.sheetOpen(false);
      if(act&&act.startsWith('resale:')){const e=curEntry();if(e)HT.Resale.act(m,act.slice(7),e.id,+t.dataset.i);return}
      if(act==='honk'){const e=curEntry();playHorn(hornOf(e.id.split(':')[1]));return}
      if(act==='target'){const e=curEntry(),a=ATTACHMENTS[e.id],s=Save.data;const owned=a.compat.filter(g=>s.owned.guns.includes(g));const pool=owned.length?owned:a.compat;
        m.attTarget=pool[(pool.indexOf(m.attTarget)+1)%pool.length];sfx('toggle');m.renderDetail();return}
      if(act==='sell'){const e=curEntry();if(m.armed!=='sell:'+e.key){m.armed='sell:'+e.key;t.classList.add('armed');t.textContent='Sure? Sell for '+money(sellValue(e.kind,e.id));sfx('arm');return}
        m.armed=null;const r=sell(e.kind,e.id);if(r.ok){sfx('buy');floatText(m,t,'+'+money(r.amount),'earn');toast(m,'Sold. '+money(r.amount)+' back in your pocket.','good')}else{sfx('error');toast(m,r.reason,'bad')}
        m.renderGrid(true);m.renderDetail()}};
    m.offs.push(Save.on('cash',(v,old)=>{countTo(ui.cash,old==null?v:old,v,650);ui.cash.parentNode.classList.remove('bump','drop');void ui.cash.offsetWidth;ui.cash.parentNode.classList.add(old!=null&&v<old?'drop':'bump')}));
    runMenu(m);m.refreshKeys();
    if(store==='dadazon')HT.Resale.css();
    const t0=tabs.find(t=>t[0]===opts.tab)?opts.tab:tabs[0][0];m.setTab(t0,1);
    if(t0==='resale'&&opts.select){const el=ui.grid.querySelector('[data-key="resale:'+opts.select+'"]');if(el){m.select('resale:'+opts.select,'force');focusEl(m,el,true)}}
    if(opts.select){const k=opts.select.includes(':')?opts.select:null;if(k)m.select(k,'force')}
    if(narrow())ui.detail.setAttribute('inert','');
    return{close:()=>m.close(),el:ui.el,setTab:id=>m.setTab(id,1),select:k=>m.select(k,'force'),_m:m}}};
HT.Shop=Shop;
/* ---- Neighbourly Resale (the laptop's 4th Dadazon tab; SPEC3 4.9, built with Chain Reaction, reused by Porch Light) ----
   Listings from your neighbours: a few evergreen ones here, more added by jobs. Each listing: {id,title,price,seller,where,ago,blurb,details:[..],
   photo(ctx,w,h) (canvas drawing), chat:{prompt, options:[text,...], reply(i,listing)->{text,ok,done,note}}, sec}. "Message the seller" opens a
   little chat in the detail panel: keys 1-3 or a click pick a line, the seller answers (job listings decide what happens).
   HT.Resale.add(listing) / remove(id) / clear(tag) / get(id) / list() / on('open', fn) / open(id) (select it next time the tab shows) */
const Resale=(()=>{const L=[],state={},hooks={open:[]};let want=null;const ph={};
  const joke=(id,title,price,seller,blurb,details,draw,reply)=>({id,title,price,seller,where:'Maple Heights',ago:'',blurb,details,photo:draw,evergreen:true,
    chat:{prompt:'Message '+seller,options:['Is this still available?','Would you take less?','Can I see it first?'],reply:i=>({text:reply[i%reply.length]})}});
  const bg=(g,w,h,a,b)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,a);gr.addColorStop(1,b);g.fillStyle=gr;g.fillRect(0,0,w,h)};
  L.push(joke('treadmill','Treadmill (currently a clothes rack)',25,'DebbieOnElm',"Works great. Haven't checked since 2019. Comes with the shirts on it.",['Folding','Used as a clothes rack','Shirts included'],
      (g,w,h)=>{bg(g,w,h,'#d9d2c4','#a89f90');g.fillStyle='#333';g.fillRect(w*.2,h*.62,w*.6,h*.08);g.fillRect(w*.7,h*.25,w*.04,h*.4);g.fillStyle='#6a8fc8';g.fillRect(w*.58,h*.22,w*.2,h*.22);g.fillStyle='#c86a6a';g.fillRect(w*.6,h*.3,w*.16,h*.24)},
      ["Yes. It's available. So available.","Make me an offer. Any offer. Please.","It's in the garage under the shirts. You'll find it."]),
    joke('flamingo','Inflatable flamingo, possibly haunted',0,'pool_guy_gil','Free to a good home. It moves at night. Not by itself. Probably.',['Inflatable','Pink','Possibly haunted'],
      (g,w,h)=>{bg(g,w,h,'#8fd0ec','#4aa2c8');g.fillStyle='#ff7ab6';g.beginPath();g.ellipse(w*.5,h*.66,w*.22,h*.13,0,0,6.3);g.fill();g.fillRect(w*.62,h*.25,w*.05,h*.4);g.beginPath();g.ellipse(w*.66,h*.24,w*.07,h*.06,0,0,6.3);g.fill();g.fillStyle='#222';g.fillRect(w*.71,h*.23,w*.04,h*.02)},
      ["It's available. It's always available. It comes back.","It's free.","Please come get it."]),
    joke('exbike','Exercise bike. Never exercised.',50,'Ron_K','Like new. My wife says I have to sell it. I say it has sentimental value. She says I never used it. Both of us are right.',['Stationary','Never used','Not a real bike'],
      (g,w,h)=>{bg(g,w,h,'#e9e4da','#c9c1b2');g.strokeStyle='#2a2a2a';g.lineWidth=w*.03;g.beginPath();g.moveTo(w*.3,h*.8);g.lineTo(w*.45,h*.4);g.lineTo(w*.68,h*.35);g.moveTo(w*.45,h*.45);g.lineTo(w*.6,h*.8);g.stroke();g.fillStyle='#2a2a2a';g.beginPath();g.arc(w*.55,h*.66,h*.13,0,6.3);g.fill();g.fillRect(w*.38,h*.33,w*.14,h*.05)},
      ["It's still available. It's always been available.","Sure, less. Less is fine.","It's in the bedroom holding up a pile of laundry."]),
    joke('unicycle','Unicycle (wheel not included)',5,'ClownCollegeDropout',"Seat, post and the will to try. The wheel left in 2018.",['No wheel','Seat in good shape'],
      (g,w,h)=>{bg(g,w,h,'#dbe7d0','#a9bf96');g.fillStyle='#222';g.fillRect(w*.47,h*.3,w*.05,h*.5);g.fillStyle='#c0392b';g.beginPath();g.ellipse(w*.5,h*.28,w*.12,h*.05,0,0,6.3);g.fill()},
      ["Yes. Bring your own wheel.","It's five dollars.","I'll throw in the juggling pins."]),
    joke('gnomes','Lawn gnome collection (17). Will not separate.',90,'GnomeDad',"They're a family. They stay together.",['17 gnomes','One is a pirate'],
      (g,w,h)=>{bg(g,w,h,'#9fcf8a','#5f9a4a');for(let i=0;i<5;i++){const x=w*(.18+i*.16);g.fillStyle='#3e6fb8';g.fillRect(x-w*.04,h*.55,w*.08,h*.2);g.fillStyle='#f2d0b0';g.beginPath();g.arc(x,h*.5,w*.035,0,6.3);g.fill();g.fillStyle='#d23b3b';g.beginPath();g.moveTo(x-w*.045,h*.48);g.lineTo(x,h*.3);g.lineTo(x+w*.045,h*.48);g.fill();g.fillStyle='#eee';g.fillRect(x-w*.03,h*.52,w*.06,h*.05)}},
      ["They are available. As a set.","No.","They're watching the driveway. Come anytime."]));
  const get=id=>L.find(l=>l.id===id)||null;
  const R={list:()=>L.map((l,i)=>[l,l.order!=null?l.order:i*10]).sort((a,b)=>a[1]-b[1]).map(x=>x[0]),get,
    add(l){if(!l||!l.id)return;const k=L.findIndex(x=>x.id===l.id);if(k>=0)L[k]=l;else L.push(l);delete ph[l.id];return l},
    remove(id){const k=L.findIndex(x=>x.id===id);if(k>=0)L.splice(k,1);delete state[id];delete ph[id]},
    clear(tag){for(const l of L.filter(l=>l.tag&&l.tag===tag))R.remove(l.id)},
    on(h,fn){(hooks[h]||(hooks[h]=[])).push(fn);return()=>{const a=hooks[h],k=a.indexOf(fn);if(k>=0)a.splice(k,1)}},
    open(id){want=id},state:id=>state[id]||(state[id]={chat:null,said:[],done:false}),
    status(id){const l=get(id)||{},st=R.state(id);return{kind:'resale',id,store:'dadazon',price:l.price||0,base:l.price||0,discount:0,state:l.sold?'locked':st.said.length?'owned':'buy',reason:l.sold||null}},
    photo(id){if(ph[id])return ph[id];const l=get(id);if(!l||!l.photo||typeof document==='undefined')return'';try{const c=document.createElement('canvas');c.width=320;c.height=200;const g=c.getContext('2d');l.photo(g,320,200);
        g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,186,320,14);g.fillStyle='#fff';g.font='10px Arial';g.fillText('IMG_'+(1000+id.length*97%8999)+'.JPG',6,196);ph[id]=`<img alt="" src="${c.toDataURL('image/jpeg',.86)}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`}catch(e){ph[id]=''}return ph[id]},
    chatting:m=>{const e=m.sel&&m.sel.startsWith('resale:')?get(m.sel.slice(7)):null;return!!(e&&R.state(e.id).chat==='open')},
    detail(m,e){const l=get(e.id);if(!l)return'';const st=R.state(l.id);if(want===l.id)want=null;
      const thread=st.said.map(x=>`<div class="rs-b me">${esc(x.me)}</div><div class="rs-b them"><b>${esc(l.seller)}</b>${esc(x.them)}</div>`).join('');
      const opts=st.chat==='open'&&l.chat?l.chat.options.map((t,i)=>`<button class="rs-opt" data-nav data-act="resale:say" data-i="${i}"><kbd>${i+1}</kbd> ${esc(t)}</button>`).join(''):'';
      const btn=l.sold?'':st.done?`<div class="htm-note">${esc(st.note||'Chat closed.')}</div>`:st.chat==='open'?'':`<button class="htm-btn" data-nav data-act="primary"><span>${esc(l.chat&&l.chat.prompt||'Message the seller')}</span></button>`;
      return`<div class="htm-dscroll"><div class="rs-ph">${R.photo(l.id)}</div><div class="htm-kicker">${esc(l.seller)} · ${esc(l.where||'')}${l.ago?' · '+esc(l.ago):''}</div><h3 class="htm-name">${esc(l.title)}</h3>
        <div class="rs-price">${l.price?money(l.price):'Free'}</div><p class="htm-blurb">${esc(l.blurb||'')}</p>${l.details&&l.details.length?'<ul class="rs-dt">'+l.details.map(d=>'<li>'+esc(d)+'</li>').join('')+'</ul>':''}
        ${thread?'<div class="rs-thread">'+thread+'</div>':''}${opts?'<div class="rs-opts">'+opts+'</div>':''}</div><div class="htm-buy"><div class="htm-buyrow">${btn}</div></div>
        <button class="htm-sheetx" data-act="sheetclose" aria-label="Back to list">✕</button>`},
    act(m,what,id,i){const l=get(id);if(!l||l.sold)return;const st=R.state(id);
      if(what==='msg'){if(st.done||!l.chat)return;st.chat='open';sfx('arm');m.renderDetail();const b=m.ui.detail.querySelector('.rs-opt');if(b)focusEl(m,b,true);return}
      if(what==='say'&&st.chat==='open'){const t=l.chat.options[i];if(t==null)return;let r={};try{r=l.chat.reply(i,l)||{}}catch(err){console.error(err)}
        st.said.push({me:t,them:r.text||'...'});st.chat=r.again&&!r.done?'open':null;if(r.done){st.done=true;st.note=r.note||null}sfx(r.ok?'buy':'tick');
        m.renderGrid(true);m.renderDetail();if(r.toast)toast(m,r.toast,r.ok?'good':'bad');if(r.close)setTimeout(()=>{if(m.alive)m.close()},r.close)}},
    css(){if(typeof document==='undefined'||document.getElementById('rs-css'))return;const st=document.createElement('style');st.id='rs-css';st.textContent=
      '.htm .rs-ph{width:100%;aspect-ratio:16/10;margin:0 0 10px;border-radius:8px;overflow:hidden;background:#222}.htm .rs-price{font:800 22px/1 var(--display,inherit);margin:4px 0 8px;color:var(--good,#7fd87a)}'+
      '.htm .rs-dt{margin:6px 0 10px 18px;padding:0;font-size:13px;line-height:1.5}.htm .rs-thread{display:flex;flex-direction:column;gap:6px;margin:8px 0}.htm .rs-b{max-width:88%;padding:7px 10px;border-radius:12px;font-size:13px;line-height:1.35}'+
      '.htm .rs-b.me{align-self:flex-end;background:#2f6fd6;color:#fff;border-bottom-right-radius:3px}.htm .rs-b.them{align-self:flex-start;background:rgba(255,255,255,.12);border-bottom-left-radius:3px}.htm .rs-b.them b{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-bottom:2px}'+
      '.htm .rs-opts{display:flex;flex-direction:column;gap:6px;margin:6px 0}.htm .rs-opt{display:flex;gap:8px;align-items:flex-start;width:100%;padding:8px 10px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);color:inherit;font:600 13px/1.3 inherit;text-align:left;cursor:pointer}'+
      '.htm .rs-opt:hover,.htm .rs-opt:focus{border-color:#ffcf5a;background:rgba(255,207,90,.14);outline:none}.htm .rs-opt kbd{flex:none;min-width:18px;text-align:center}';document.head.appendChild(st)}};
  return R})();
HT.Resale=Resale;

/* =====================================================================
   GUN LOCKER / WORKBENCH
   ===================================================================== */
function lockerTile(id,st,sel,tag){const g=GUNS[id];
  return`<button class="htm-item${sel?' sel':''}" data-nav data-key="gun:${id}" data-state="${st}" role="listitem" aria-label="${esc(g.name)}">
    <span class="htm-thumb t-gun">${thumbHTML('gun',id,{gun:{type:id,attachments:gunMods(Save.data.attOn[id])}})}</span>
    <span class="htm-itx"><span class="htm-iname">${esc(g.name)}</span><span class="htm-isub">${slotName[g.slot]} · ${AMMO[g.ammo].name}</span></span>
    <span class="htm-tag">${tag}</span></button>`}
const Locker={
  isOpen:()=>!!(current&&current.type==='locker'),
  close:()=>{if(current&&current.type==='locker')current.close()},
  open(opts){opts=opts||{};
    const ui=shell({kind:'locker',logo:'locker',title:opts.tab==='attach'?'Workbench':'Gun Locker',who:'Garage · Home',tagline:'Saved the moment you change it. Your loadout rides along on every job.'});
    const m={type:'locker',ui,onClose:opts.onClose,onChange:opts.onChange,tab:null,sel:null,offs:[]};
    const tabs=[['loadout','Loadout'],['attach','Workbench'],['ammo','Ammo']];
    ui.tabrow.innerHTML=tabs.map(([id,lab])=>`<button class="htm-tab" role="tab" data-act="tab" data-tab="${id}">${lab}<i></i></button>`).join('');
    ui.body=ui.el.querySelector('.htm-body');
    const slots=document.createElement('div');slots.className='htm-slots';ui.gridwrap.prepend(slots);
    m.refreshKeys=()=>{ui.keys.innerHTML=keysHTML(m.tab==='attach'?[['↑↓←→','✥','Browse'],['Enter','Ⓐ','Toggle'],['Q E','LB RB','Tabs'],['Esc','Ⓑ','Done']]:
      [['↑↓←→','✥','Browse'],['Enter','Ⓐ','Equip'],['1 2 3','','Slot'],['Q E','LB RB','Tabs'],['Esc','Ⓑ','Done']].filter(k=>k[1]!==''||!pad.on))};
    const renderSlots=()=>{const L=Save.data.loadout;
      const rack=Save.data.garage.util.rack;
      slots.innerHTML=['side','p1','p2','p3'].map((k,i)=>{const id=L[k];
        if(k==='p3'&&!rack)return`<button class="htm-slot locked" data-nav data-act="slot" data-slot="p3"><span class="htm-slotk"><kbd>4</kbd>Gun rack</span><span class="htm-slotimg empty"></span><b class="empty"><i class="htm-lock"></i>Dad's Auto, $700</b></button>`;
        return`<button class="htm-slot${m.target===k?' tgt':''}" data-nav data-act="slot" data-slot="${k}" ${id?`data-key="gun:${id}"`:''}>
        <span class="htm-slotk"><kbd>${i+1}</kbd>${slotName[k]}</span>${id?`<span class="htm-slotimg">${thumbHTML('gun',id,{gun:{type:id,attachments:gunMods(Save.data.attOn[id])}})}</span><b>${esc(GUNS[id].name)}</b>`:'<span class="htm-slotimg empty"></span><b class="empty">Empty</b>'}</button>`}).join('')+
        `<div class="htm-ammostrip">${ammoFor().map(a=>`<span style="--c:${a.col}"><i></i>${esc(a.name)} <b>${a.reserve}${a.extra?'+'+a.extra:''}</b></span>`).join('')}</div>`};
    const gunState=id=>{const s=Save.data,L=s.loadout;if(!s.owned.guns.includes(id))return'locked';return Object.values(L).includes(id)?'equipped':'owned'};
    const gunTag=id=>{const L=Save.data.loadout,st=gunState(id);if(st==='equipped'){const k=Object.keys(L).find(k=>L[k]===id);return`<span class="htm-chip s-equipped">${['side','p1','p2'].indexOf(k)+1} · ${slotName[k]}</span>`}
      if(st==='owned')return'<span class="htm-chip s-owned">Ready</span>';
      const a=gunAvail(id);return a.collect?`<span class="htm-chip s-locked"><i class="htm-lock"></i>${a.collect.n}/${a.collect.need}</span>`:'<span class="htm-chip s-locked"><i class="htm-lock"></i>Locked</span>'};
    const list=()=>{const s=Save.data;return GUN_ORDER.filter(g=>m.tab!=='attach'||GUNS[g].att.length).sort((a,b)=>(s.owned.guns.includes(b)?1:0)-(s.owned.guns.includes(a)?1:0)||GUN_ORDER.indexOf(a)-GUN_ORDER.indexOf(b))};
    m.renderGrid=keep=>{const s=Save.data;renderSlots();
      for(const b of ui.tabrow.children){const on=b.dataset.tab===m.tab;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)}
      if(m.tab==='ammo'){const carry=ammoFor(),c={};carry.forEach(a=>c[a.type]=a);
        ui.grid.innerHTML='<div class="htm-sec">Ammo on the shelf</div>'+Object.keys(AMMO).map(t=>{const a=c[t],users=GUN_ORDER.filter(g=>GUNS[g].ammo===t).map(g=>GUNS[g].short).join(' · ');
          return`<div class="htm-item" data-state="${a?'owned':'locked'}"><span class="htm-thumb t-sup">${ammoIcon(t)}</span><span class="htm-itx"><span class="htm-iname">${esc(AMMO[t].name)}</span><span class="htm-isub">${esc(users)}</span></span>
            <span class="htm-tag">${a?`<span class="htm-chip s-owned">${a.reserve}${a.extra?'+'+a.extra:''}</span>`:'<span class="htm-chip s-locked">Not carried</span>'}</span></div>`}).join('');return}
      let html='',sec=null;
      for(const id of list()){const own=s.owned.guns.includes(id),sc=m.tab==='attach'?(own?'Your guns':'Not yours yet'):own?'In the locker':'Still out there';
        if(sc!==sec){sec=sc;html+=`<div class="htm-sec">${sc}</div>`}
        let tag=gunTag(id);if(m.tab==='attach'&&own){const on=Object.values(s.attOn[id]||{}).filter(Boolean).length;tag=`<span class="htm-chip ${on?'s-equipped':'s-owned'}">${on}/${GUNS[id].att.length} mods</span>`}
        html+=lockerTile(id,gunState(id),('gun:'+id)===m.sel,tag)}
      const had=keep&&document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.key;
      const hadSlot=keep&&document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.slot;
      ui.grid.innerHTML=html;
      if(hadSlot){const el=slots.querySelector(`[data-slot="${hadSlot}"]`);if(el)el.focus({preventScroll:true})}else if(had){const el=ui.grid.querySelector(`[data-key="${had}"]`);if(el)el.focus({preventScroll:true})}};
    m.renderDetail=()=>{if(m.tab==='ammo'){ui.detail.innerHTML=ammoDetail();return}
      const id=m.sel&&m.sel.split(':')[1];if(!id){ui.detail.innerHTML='';return}
      const keepAct=document.activeElement&&ui.detail.contains(document.activeElement)?(document.activeElement.dataset.act+'|'+(document.activeElement.dataset.slot||'')+'|'+(document.activeElement.dataset.att||'')):null;
      ui.detail.innerHTML=m.tab==='attach'?benchDetail(id):loadoutDetail(id);
      if(keepAct){const[a,sl,at]=keepAct.split('|');const b=ui.detail.querySelector(`[data-act="${a}"]${sl?`[data-slot="${sl}"]`:''}${at?`[data-att="${at}"]`:''}`)||ui.detail.querySelector(`[data-act="${a}"]`);if(b)b.focus({preventScroll:true})}};
    const loadoutDetail=id=>{const s=Save.data,g=GUNS[id],L=s.loadout,own=s.owned.guns.includes(id);
      const inSlot=Object.keys(L).find(k=>L[k]===id);
      let tgt=g.slot==='side'?'side':(m.target==='p1'||m.target==='p2')?m.target:(L.p2?'p1':'p2');if(inSlot)tgt=inSlot;
      const cmp=inSlot?null:L[tgt]||(g.slot==='prim'&&tgt==='p2'?L.p1:null);
      const me=weaponStats(id,s.attOn[id]||{}),other=cmp?weaponStats(cmp,s.attOn[cmp]||{}):null;
      let btns='';
      if(own){if(g.slot==='side')btns=inSlot?'<button class="htm-btn off" data-nav data-act="noop" aria-disabled="true"><span>Your sidearm</span></button>':`<button class="htm-btn" data-nav data-act="equip" data-slot="side"><span>Holster it · Sidearm</span></button>`;
        else{btns=['p1','p2',...(s.garage.util.rack?['p3']:[])].map(k=>L[k]===id?`<button class="htm-btn off" data-nav data-act="noop" aria-disabled="true"><span>In ${slotName[k]}</span></button>`:`<button class="htm-btn${k===tgt?'':' alt'}" data-nav data-act="equip" data-slot="${k}"><span>${L[k]?'Swap into':'Put in'} ${slotName[k]}</span></button>`).join('');
          if((inSlot==='p1'||inSlot==='p2')&&L.p2)btns+=`<button class="htm-ghost" data-nav data-act="swapp">⇅ Swap primaries</button>`;if(inSlot==='p2'||inSlot==='p3')btns+=`<button class="htm-ghost" data-nav data-act="unequip" data-slot="${inSlot}">Leave it home</button>`}}
      else{const a=gunAvail(id);const how=g.unlock.gift==='rick'?'Coach Rick has this one. Maybe he\'ll lend it.':a.collect?`Pick up ${a.collect.need} from crooks on jobs${g.price?' · or '+money(g.price)+' at Maple Hardware':''}`:g.price?money(g.price)+' at Maple Hardware or on Dadazon':'';
        btns=`<button class="htm-btn off" data-nav data-act="noop" aria-disabled="true"><span><i class="htm-lock"></i>Not in your locker</span></button>`+(a.collect?`<div class="htm-collect"><span>${esc(how)}</span><span class="htm-meter"><i style="width:${100*a.collect.n/a.collect.need}%"></i></span><b>${a.collect.n}/${a.collect.need}</b></div>`:`<div class="htm-note">${esc(how)}</div>`)}
      const mods=g.att.map(sl=>{const a=(s.attOn[id]||{})[sl];return a?`<i class="on">${esc(ATTACHMENTS[a].name)}</i>`:''}).join('');
      return`<div class="htm-hero t-gun"><div class="htm-heroimg">${thumbHTML('gun',id,{gun:{type:id,attachments:gunMods(s.attOn[id])}})}</div>${inSlot?`<span class="htm-stamp s-eq">${slotName[inSlot]}</span>`:''}</div>
        <div class="htm-dscroll"><div class="htm-kicker">${slotName[g.slot]} · ${esc(g.cls)} · ${AMMO[g.ammo].name}</div><h3 class="htm-name">${esc(g.name)}</h3><p class="htm-blurb">${esc(g.blurb)}</p>
        <div class="htm-cmp">${cmp?`Compared with your <b>${esc(GUNS[cmp].name)}</b> <span class="htm-legend"><i class="up"></i>better <i class="down"></i>worse</span>`:inSlot?'Riding along on the next job':'Nothing to compare with'}</div>
        ${barsHTML(other?gunBars(other):null,gunBars(me))}${gunFacts(me,other)}${mods?`<div class="htm-fits"><span>Mods</span>${mods}</div>`:''}</div>
        <div class="htm-buy"><div class="htm-buyrow">${btns}</div></div><button class="htm-sheetx" data-act="sheetclose" aria-label="Back">✕</button>`};
    const benchDetail=id=>{const s=Save.data,g=GUNS[id],own=s.owned.guns.includes(id),on=Object.assign({optic:null,mag:null,under:null,muzzle:null},s.attOn[id]||{});
      const bare=weaponStats(id,{}),now=weaponStats(id,on);
      const rows=ATT_SLOTS.filter(([sl])=>g.att.includes(sl)).map(([sl,lab])=>{const opts=Object.keys(ATTACHMENTS).filter(a=>ATTACHMENTS[a].slot===sl&&ATTACHMENTS[a].compat.includes(id));
        return`<div class="htm-mod"><span class="htm-modl">${lab}</span><div class="htm-seg">`+
          `<button class="${!on[sl]?'on':''}" data-nav data-act="att" data-slot="${sl}" data-att="" ${own?'':'disabled'}>None</button>`+
          opts.map(a=>{const has=s.owned.att.includes(a);return`<button class="${on[sl]===a?'on':''}${has?'':' need'}" data-nav data-act="att" data-slot="${sl}" data-att="${a}" ${own?'':'disabled'}>${has?'':'<i class="htm-lock"></i>'}${esc(ATTACHMENTS[a].name)}${has?'':`<small>${money(ATTACHMENTS[a].price)}</small>`}</button>`}).join('')+`</div></div>`}).join('');
      return`<div class="htm-hero t-gun"><div class="htm-heroimg">${thumbHTML('gun',id,{gun:{type:id,attachments:gunMods(on)}})}</div>${Object.values(on).some(Boolean)?`<div class="htm-heroatt">${Object.values(on).filter(Boolean).map(a=>`<span>${thumbHTML('att',a)}</span>`).join('')}</div>`:''}</div>
        <div class="htm-dscroll"><div class="htm-kicker">Workbench · ${esc(g.cls)}</div><h3 class="htm-name">${esc(g.name)}</h3>
        ${own?'':'<div class="htm-note warn">Not in your locker yet. You can plan, but not install.</div>'}
        <div class="htm-mods">${rows}</div>
        <div class="htm-cmp">Compared with the bare gun <span class="htm-legend"><i class="up"></i>better <i class="down"></i>worse</span></div>${barsHTML(gunBars(bare),gunBars(now))}${gunFacts(now,bare)}</div>
        <button class="htm-sheetx" data-act="sheetclose" aria-label="Back">✕</button>`};
    const ammoDetail=()=>{const s=Save.data,am=ammoFor(),vs=vehicleStats();
      return`<div class="htm-dscroll htm-ammo"><div class="htm-kicker">What you're carrying</div><h3 class="htm-name">Ammo for this loadout</h3>
        <p class="htm-blurb">Topped up for free before every job. Dad's Ammo Bags on the job refill whatever you carry.</p>
        ${am.map(a=>`<div class="htm-arow" style="--c:${a.col}"><div class="htm-ahead"><i></i><b>${esc(a.name)}</b><span>${a.guns.map(g=>esc(GUNS[g].short)).join(' · ')}</span><em>${a.reserve}${a.extra?` <u>+${a.extra}</u>`:''} <small>/ ${a.cap}</small></em></div>
          <div class="htm-atrack"><i style="width:${100*a.reserve/a.cap}%"></i>${a.extra?`<i class="x" style="left:${100*a.reserve/a.cap}%;width:${100*Math.min(a.extra,a.cap-a.reserve)/a.cap}%"></i>`:''}</div></div>`).join('')}
        <div class="htm-facts">${[['Rooftop cargo box',vs.spareMags?'+1 spare mag each':'Not installed · Lug Nuts & Sons'],['Range Day Box',s.flags.rangeDay?'Packed: +1 mag each':'Not packed · Maple Hardware'],['Zip-ties',s.flags.zipPack?'Contractor pack: 25% faster':'Standard']].map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('')}</div></div>`};
    m.select=(key,how)=>{if(m.sel===key&&how!=='force')return;m.sel=key;for(const b of ui.grid.querySelectorAll('.htm-item'))b.classList.toggle('sel',b.dataset.key===key);m.renderDetail()};
    m.setTab=(id,dir)=>{if(m.tab===id)return;m.tab=id;ui.el.dataset.tab=id;ui.el.querySelector('.htm-title').firstChild.textContent=id==='attach'?'Workbench':'Gun Locker';
      m.refreshKeys();m.renderGrid();ui.gridwrap.scrollTop=0;
      if(id==='ammo'){m.renderDetail();const f=slots.querySelector('[data-slot]');if(f&&!narrow())focusEl(m,f,true);return}
      const L=Save.data.loadout;const want=m.sel&&ui.grid.querySelector(`[data-key="${m.sel}"]`)?m.sel:'gun:'+(L.p1||'pistol');
      m.select(want,'force');const t=ui.grid.querySelector(`[data-key="${want}"]`);if(t&&!narrow())focusEl(m,t,true);m.sheetOpen(false);
      ui.grid.classList.remove('htm-swap','l','r');void ui.grid.offsetWidth;ui.grid.classList.add('htm-swap',dir<0?'l':'r')};
    m.sheetOpen=on=>{m.sheet=!!on&&narrow();ui.el.classList.toggle('sheet',m.sheet);ui.detail.toggleAttribute('inert',narrow()&&!m.sheet&&m.tab!=='ammo');if(m.sheet){const b=ui.detail.querySelector('[data-nav]:not([aria-disabled])');if(b)setTimeout(()=>b.focus({preventScroll:true}),30)}};
    m.focusItem=t=>{if(t.dataset.key)m.select(t.dataset.key)};
    const changed=()=>{m.renderGrid(true);m.renderDetail();if(m.onChange)try{m.onChange(Save.data.loadout,Save.data.attOn)}catch(e){console.error(e)}};
    const equip=(slot,id)=>{const L0=Save.data.loadout;let r;
      if((slot==='p1'||slot==='p2')&&L0[slot==='p1'?'p2':'p1']===id&&L0[slot])r=swapPrimaries();
      else{const from=slot!=='side'&&['p1','p2','p3'].find(k=>k!==slot&&L0[k]===id);if(from){const prev=L0[slot];L0[from]=null;r=setLoadout(slot,id);if(r.ok&&prev&&from!=='p1')L0[from]=prev;else if(!r.ok)L0[from]=id;if(r.ok)Save.touch('loadout')}else r=setLoadout(slot,id)}if(!r.ok){sfx('error');toast(m,r.reason,'bad');return false}m.target=slot;sfx('equip');toast(m,GUNS[id].name+' → '+slotName[slot],'good');changed();
      const sl=slots.querySelector(`[data-slot="${slot}"]`);if(sl){sl.classList.add('htm-pop');setTimeout(()=>sl.classList.remove('htm-pop'),600)}return true};
    m.input=(a,d)=>{const f=document.activeElement;
      if(a==='nav'){if(m.sheet&&!ui.detail.contains(f))m.sheetOpen(false);const scope=m.sheet?ui.detail:ui.el;const n=navMove(scope,d,scope.contains(f)?f:null);if(n)focusEl(m,n);return}
      if(a==='ok'){if(f&&f.dataset&&f.dataset.key&&f.closest('.htm-grid')){m.select(f.dataset.key);if(narrow()){m.sheetOpen(true);return}
          const id=f.dataset.key.split(':')[1];if(m.tab==='loadout'){const b=ui.detail.querySelector(`[data-act=equip][data-slot="${m.target}"]`)||ui.detail.querySelector('[data-act=equip]');if(b)return m.click(b,{});sfx('error');shake(f);return}
          const b=ui.detail.querySelector('[data-act=att]:not([disabled])');if(b)focusEl(m,b);else{sfx('error');shake(f)}return}
        if(f&&ui.el.contains(f)&&f.click)f.click();return}
      if(a==='back'){if(m.sheet){m.sheetOpen(false);return}m.close();return}
      if(a==='tabprev'||a==='tabnext'){const i=tabs.findIndex(t=>t[0]===m.tab),n=(i+(a==='tabnext'?1:-1)+tabs.length)%tabs.length;sfx('tab');m.setTab(tabs[n][0],a==='tabnext'?1:-1);return}
      if(a==='num'&&d<=4){const k=['side','p1','p2','p3'][d-1];if(k==='p3'&&!Save.data.garage.util.rack){sfx('error');toast(m,"The 4th slot needs the gun rack from Dad's Auto.",'bad');return}m.target=k;const id=Save.data.loadout[k];renderSlots();const sl=slots.querySelector(`[data-slot="${k}"]`);if(sl)focusEl(m,sl);if(id&&m.tab!=='ammo')m.select('gun:'+id,'force');return}
      if(a==='alt'){const b=ui.detail.querySelector('[data-act=swapp]');if(b)b.click()}};
    m.click=(t,ev)=>{const act=t.dataset.act;
      if(act==='close')return m.close();if(act==='tab'){sfx('tab');return m.setTab(t.dataset.tab,1)}
      if(act==='sheetclose')return m.sheetOpen(false);
      if(act==='slot'){if(t.dataset.slot==='p3'&&!Save.data.garage.util.rack){sfx('error');shake(t);toast(m,"The 4th slot needs the gun rack from Dad's Auto ($700).",'bad');return}m.target=t.dataset.slot;renderSlots();const nf=slots.querySelector(`[data-slot="${m.target}"]`);if(nf)nf.focus({preventScroll:true});
        if(t.dataset.key&&m.tab!=='ammo'){m.select(t.dataset.key,'force');if(narrow())m.sheetOpen(true)}else if(m.tab==='loadout'){const first=ui.grid.querySelector('.htm-item[data-state=owned]');if(first){m.select(first.dataset.key,'force');focusEl(m,first)}}sfx('toggle');return}
      if(t.dataset.key&&!act){m.select(t.dataset.key);if(narrow())m.sheetOpen(true);else if(ev.detail>=2){const b=ui.detail.querySelector(`[data-act=equip][data-slot="${m.target}"]`)||ui.detail.querySelector('[data-act=equip]');if(b)m.click(b,{})}return}
      if(act==='equip'){const id=m.sel.split(':')[1];equip(t.dataset.slot,id);return}
      if(act==='swapp'){swapPrimaries();sfx('equip');toast(m,'Primaries swapped','good');changed();return}
      if(act==='unequip'){setLoadout(t.dataset.slot||'p2',null);sfx('toggle');toast(m,'Leaving it in the locker','good');changed();return}
      if(act==='noop'){sfx('error');shake(t);return}
      if(act==='att'){const id=m.sel.split(':')[1],sl=t.dataset.slot,a=t.dataset.att||null;
        if(a&&!Save.data.owned.att.includes(a)){sfx('error');shake(t);toast(m,ATTACHMENTS[a].name+': '+money(ATTACHMENTS[a].price)+' at Maple Hardware or on Dadazon','bad');return}
        const r=setAttachment(id,sl,a);if(!r.ok){sfx('error');toast(m,r.reason,'bad');return}sfx(a?'equip':'toggle');changed();return}};
    runMenu(m);m.target='p1';
    m.setTab(tabs.find(t=>t[0]===opts.tab)?opts.tab:'loadout',1);
    if(narrow())ui.detail.setAttribute('inert','');
    return{close:()=>m.close(),el:ui.el,setTab:id=>m.setTab(id,1),select:k=>m.select(k,'force'),_m:m}}};
HT.Locker=Locker;

/* =====================================================================
   PAYOUT RENDERER (mission result card)
   ===================================================================== */
Economy.renderPayout=function(el,p,opts){opts=opts||{};
  const lines=resultLines(p),speed=opts.speed||1,instant=reduced()||opts.instant;
  const box=document.createElement('div');box.className='htp'+(p.ok?'':' fail');
  box.innerHTML=`<div class="htp-head"><span>${p.rerun?'Payout · rerun, half pay':'Payout'}</span><span>${p.ok?'Neighborhood Watch fund':'Better luck next Saturday'}</span></div>`+
    '<div class="htp-lines">'+lines.map((l,i)=>`<div class="htp-line ${l.neg?'neg':''} k-${l.kind}" style="--i:${i}"><span class="htp-l">${esc(l.label)}${l.note?`<small>${esc(l.note)}</small>`:''}</span><i class="htp-dots"></i><b data-v="${p.lines[i].amount}">${instant?esc(l.text):(l.neg?'−$0':'+$0')}</b></div>`).join('')+'</div>'+
    `<div class="htp-total"><span>Total</span><b>${instant?money(p.total):'$0'}</b><em class="htp-stamp">${p.ok?'Paid':'Gas money'}</em></div>`;
  el.appendChild(box);
  let skip=false,doneRes;const done=new Promise(r=>doneRes=r);
  const rows=[...box.querySelectorAll('.htp-line')],tot=box.querySelector('.htp-total b');
  const finish=()=>{rows.forEach((r,i)=>{r.classList.add('on');cancelAnimationFrame(r.querySelector('b')._raf);r.querySelector('b').textContent=lines[i].text});cancelAnimationFrame(tot._raf);tot.textContent=money(p.total);box.classList.add('done');doneRes(p);if(opts.onDone)opts.onDone(p)};
  if(instant){rows.forEach(r=>r.classList.add('on'));box.classList.add('done');doneRes(p);if(opts.onDone)opts.onDone(p);return{done,skip:()=>{},el:box}}
  const fmtL=(neg)=>v=>(neg?'−$':'+$')+Math.abs(v).toLocaleString('en-US');
  let i=0;const per=420/speed;
  const next=()=>{if(skip)return;if(i<rows.length){const r=rows[i],l=lines[i],b=r.querySelector('b');r.classList.add('on');sfx('tick');countTo(b,0,Math.abs(p.lines[i].amount),per*.8,fmtL(l.neg));i++;setTimeout(next,per);return}
    box.classList.add('tot');countTo(tot,0,p.total,700/speed);setTimeout(()=>{if(skip)return;box.classList.add('done');sfx(p.total>0?'buy':'stamp');doneRes(p);if(opts.onDone)opts.onDone(p)},750/speed)};
  setTimeout(next,(opts.delay==null?250:opts.delay)/speed);
  const sk=()=>{if(box.classList.contains('done'))return;skip=true;finish()};
  box.addEventListener('click',sk);
  return{done,skip:sk,el:box}};
}

})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined'&&module.exports)module.exports=(typeof window!=='undefined'?window:globalThis).HT;
