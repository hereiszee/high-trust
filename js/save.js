/* High Trust: save game, economy, shops and gun locker.
   Exposes on window.HT (and module.exports under Node):
     HT.CATALOG  all shop/catalogue data (guns, attachments, furniture, supplies, vehicle upgrades)
     HT.Save     versioned 'ht-save' storage with migration, corruption recovery, change events, export/import
     HT.Economy  payout maths, prices, buy/sell rules, unlock conditions, weapon/vehicle stat helpers, payout renderer
     HT.Shop     full-screen store menu (Dadazon, Hank’s Hardware, the auto shop)
     HT.Locker   gun locker / workbench menu
   No dependencies. The DOM parts only run in a browser. */
(function(root){
'use strict';
const HT=root.HT=root.HT||{};
const hasDOM=typeof document!=='undefined';

/* =====================================================================
   CATALOGUE
   ===================================================================== */
const MISSIONS=[
  {id:'gary',giver:'gary',who:'Gary',title:'Return to Sender',base:400,par:300},
  {id:'rick',giver:'rick',who:'Coach Rick',title:'Fourth Quarter',base:550,par:0},
  {id:'dave',giver:'dave',who:'Big Dave',title:'Block Party',base:700,par:240},
  {id:'doug',giver:'doug',who:'Doug',title:'The Kingpin',base:1000,par:300}];

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
  double:{name:"Uncle Ray's Side-by-Side",short:'Side-by-Side',slot:'prim',ammo:'12ga',cls:'Shotgun',auto:false,dmg:16,head:1.5,pellets:10,rate:.18,mag:2,reserve:30,range:22,fall:[5,18,.15],
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
  smg:{name:'The Carpool',short:'Carpool',slot:'prim',ammo:'9mm',cls:'SMG',auto:true,dmg:17,head:1.6,pellets:1,rate:.07,mag:32,reserve:192,range:50,fall:[12,35,.45],
    spread:{hip:.022,ads:.012,move:1.15,bloomAdd:.0025,bloomMax:.025,bloomDec:9},rc:{v:.006,h:.009,hBias:0,adsMul:.7,rec:10},ads:{zoom:.85,t:.13,speed:.8},speed:1.04,
    reload:{tac:1.6,empty:2},equip:.28,fsa:false,price:900,unlock:{buyAfter:1,collect:2},
    blurb:"Named for the minivan it rides in. Rattles like a juice box on a gravel road."},
  hunter:{name:'Deer Season',short:'Deer Season',slot:'prim',ammo:'308',cls:'Bolt-action',auto:false,dmg:95,head:2.5,pellets:1,rate:1.1,mag:5,reserve:25,range:160,fall:[160,160,1],
    spread:{hip:.06,ads:.0005,move:3,bloomAdd:.02,bloomMax:.06,bloomDec:3},rc:{v:.09,h:.01,hBias:0,adsMul:1,rec:3},ads:{zoom:.3,t:.32,speed:.55},speed:.9,
    reload:{tac:2.6,empty:3.1},equip:.55,fsa:true,price:1200,unlock:{buyAfter:2,collect:1},
    blurb:"Deer season never really ended. It just moved to Ridgeview."}};
const GUN_ORDER=['pistol','revolver','nailer','shotgun','double','beanbag','rifle','smg','hunter'];

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

/* Consumables, Hank’s Hardware only. Each sets a flag the next mission reads and clears. */
const SUPPLIES={
  rangeDay:{name:'Range Day Box',price:40,flag:'rangeDay',fx:'+1 extra mag of every ammo type at the next mission',blurb:"Bulk ammo, the same way you buy paper towels: too much, and proud of it."},
  zipPack:{name:'Zip-Tie Contractor Pack',price:30,flag:'zipPack',fx:'Zip-tie 25% faster during the next mission',blurb:"Five hundred zip-ties. Also good for cable management, which you will never do."},
  icePack:{name:'Ice Packs & Ibuprofen',price:35,flag:'icePack',fx:'Your crew gets back up 30% faster during the next mission',blurb:"For hamstrings, lower backs and the knee you hurt getting out of the van."}};

/* Minivan upgrades. Tiered: level 0 = stock. fx multipliers are what HT.Economy.vehicleStats() returns. */
const VEHICLE={
  engine:{name:'Engine Tune',tab:'perf',tiers:[
    {name:'New Spark Plugs',price:400,fx:{top:1.08,accel:1.12},blurb:"Jen asked why the van sounds \"angry.\" It sounds motivated."},
    {name:'Cold Air Intake',price:900,unlock:{done:1},fx:{top:1.16,accel:1.25},blurb:"It inhales. It exhales. It's doing better than you on the stairs."},
    {name:'The Midlife Crisis',price:1800,unlock:{done:2},fx:{top:1.28,accel:1.45},blurb:"Zero to sixty before the kids finish asking \"are we there yet.\""}]},
  tyres:{name:'Tyres',tab:'perf',tiers:[
    {name:'All-Terrain Tread',price:250,fx:{grip:1.15},blurb:"Grips gravel, wet leaves and the moral high ground."},
    {name:'Performance Rubber',price:600,unlock:{done:1},fx:{grip:1.3},blurb:"Corners like the cart at the warehouse store. The good cart."}]},
  brakes:{name:'Brakes',tab:'perf',tiers:[
    {name:'Ceramic Pads',price:200,fx:{brake:1.2},blurb:"Stops on a dime. Also stops the squeal you've been ignoring since March."},
    {name:'Big Red Calipers',price:500,unlock:{done:2},fx:{brake:1.45},blurb:"You'll tell everyone. Everyone will nod politely."}]},
  bullBar:{name:'Push Bar',tab:'prot',tiers:[
    {name:'Church Parking Lot Edition',price:650,unlock:{done:0},fx:{ram:2,frontDmg:.5},blurb:"Gently encourages parked thugs to move along."}]},
  panels:{name:'Door Panels',tab:'prot',tiers:[
    {name:'Kevlar-Lined Doors',price:700,fx:{armor:1.5,crewDmg:.6},blurb:"The sliding door finally closes with authority."},
    {name:'Full Soccer-Mom Armor',price:1500,unlock:{done:2},fx:{armor:2.2,crewDmg:.35},blurb:"Rated for gunfire and three seasons of travel soccer."}]},
  tint:{name:'Window Tint',tab:'prot',tiers:[
    {name:'Legal Tint',price:150,fx:{notice:.8},blurb:"Enemies notice the van a beat later. Neighbors assume you're famous."},
    {name:'Limo Tint',price:350,unlock:{trust:40},fx:{notice:.65},blurb:"Tyler keeps waving at people. They can't see him. He keeps waving."}]},
  roofBox:{name:'Rooftop Cargo Box',tab:'util',tiers:[
    {name:'Rooftop Cargo Box',price:300,fx:{spareMags:1},blurb:"Holds a spare mag of everything, plus the tent from the camping trip."}]},
  gunRack:{name:'Overhead Gun Rack',tab:'util',tiers:[
    {name:'Overhead Gun Rack',price:550,unlock:{done:1},fx:{vanSwap:true},blurb:"Change your loadout at the van mid-job. Where the fishing rods used to go."}]},
  medkit:{name:'Glovebox First Aid',tab:'util',tiers:[
    {name:'The Good First-Aid Kit',price:350,fx:{vanHeal:1,revive:1.5},blurb:"One full patch-up at the van per job. Not the kit with three band-aids and a coupon."}]},
  lightBar:{name:'Amber Light Bar',tab:'util',tiers:[
    {name:'Amber Light Bar',price:400,unlock:{trust:30},fx:{surrender:1.1},blurb:"Looks official. Isn't. Thugs give up 10% more easily for the first 20 seconds after you roll up."}]}};
const VEH_ORDER=['engine','tyres','brakes','bullBar','panels','tint','roofBox','gunRack','medkit','lightBar'];

/* Cosmetic picks: one active choice per group, owned options can be re-selected free. */
const COSMETICS={
  paint:{name:'Paint',opts:[
    {id:'stock',name:'Factory Silver',price:0,col:'#b9c0c7',blurb:"The color of every minivan in every school pickup line."},
    {id:'beige',name:'HOA Beige',price:120,col:'#d8c7a3',blurb:"Pre-approved by the board. Blends in with every house on the street."},
    {id:'blue',name:'Little League Blue',price:180,col:'#2f5d9e',blurb:"Matches the polos. Coach Rick wept a single tear."},
    {id:'red',name:'Fire Station Red',price:250,col:'#c23b2e',blurb:"Fast-looking. Legally, it is not faster."},
    {id:'green',name:'Lawn Envy Green',price:250,col:'#4f8a4a',blurb:"The same green as your lawn will be, one day."},
    {id:'yellow',name:'Hazard Yellow',price:300,col:'#ffc94a',blurb:"Visible from space. Visible from the HOA president's porch."},
    {id:'black',name:'Midnight Carpool',price:500,col:'#24272c',unlock:{done:3},blurb:"Blacked out. Very serious. Still has a stick-figure family decal."}]},
  rims:{name:'Wheels',opts:[
    {id:'stock',name:'Hubcaps (3 of 4)',price:0,style:'hub',blurb:"The fourth one is somewhere on Route 9."},
    {id:'steel',name:'Black Steelies',price:200,style:'steel',blurb:"Tough. Simple. Like your stance on daylight saving time."},
    {id:'chrome',name:'Chrome Five-Spokes',price:350,style:'chrome',blurb:"Shiny enough to check your hair in."},
    {id:'gold',name:'Gold Mesh',price:450,style:'gold',unlock:{trust:50},blurb:"Maddie refuses to be dropped off within a block of school."},
    {id:'offroad',name:'Off-Road Beadlocks',price:400,style:'offroad',unlock:{done:2},blurb:"For the dirt road to the lake house you don't own."}]},
  horn:{name:'Horn',opts:[
    {id:'stock',name:'Polite Beep',price:0,notes:[[392,.3],[494,.3]],wave:'square',blurb:"Two notes. Both apologetic."},
    {id:'duck',name:'Duck Call',price:60,notes:[[620,.09],[540,.09],[620,.09],[520,.2]],wave:'sawtooth',blurb:"Quack. Quack. Moves people out of the way through sheer confusion."},
    {id:'train',name:'Freight Train',price:180,notes:[[220,.7],[277,.7],[330,.7]],wave:'sawtooth',chord:true,blurb:"Somebody on Maple will call the city about this."},
    {id:'jingle',name:'Ice Cream Jingle',price:120,notes:[[784,.15],[659,.15],[784,.15],[880,.15],[784,.3]],wave:'triangle',blurb:"Every kid in a two-block radius is now outside. Use responsibly."},
    {id:'whistle',name:'Dad Whistle',price:90,notes:[[1400,.12],[1900,.35]],wave:'sine',blurb:"The two-note whistle that means \"car. Now.\""},
    {id:'air',name:'Stadium Air Horn',price:250,notes:[[466,.5]],wave:'sawtooth',chord:true,unlock:{done:1},blurb:"Coach Rick's halftime horn. He'd want you to have it. He has three."}]}};

const STORES={
  dadazon:{name:'Dadazon',who:'Kitchen desk · Laptop',tag:'Free shipping on everything. Delivered after your next outing.',tabs:[['guns','Guns'],['att','Attachments'],['furn','Furniture']],deliver:'pending'},
  hardware:{name:'Hank’s Hardware',sub:'& Sporting',who:'Maple Street · Since 1962',tag:'Take it home today. Neighbors save 10%.',tabs:[['guns','Guns'],['att','Attachments'],['furn','Furniture'],['sup','Supplies']],deliver:'now'},
  auto:{name:'Dad’s Auto',sub:'Auto',who:'Maple Street · Bay 2',tag:'We work on minivans. We do not judge minivans.',tabs:[['perf','Performance'],['prot','Protection'],['util','Utility'],['cos','Cosmetics']],deliver:'now'}};

const CATALOG={missions:MISSIONS,ammo:AMMO,guns:GUNS,gunOrder:GUN_ORDER,attachments:ATTACHMENTS,attSlots:ATT_SLOTS,furniture:FURNITURE,furnOrder:FURN_ORDER,
  supplies:SUPPLIES,vehicle:VEHICLE,vehOrder:VEH_ORDER,cosmetics:COSMETICS,stores:STORES,family:FAMILY};
HT.CATALOG=CATALOG;

/* =====================================================================
   SAVE  (localStorage 'ht-save', schema v1 per SPEC E, plus optional extension fields)
   ===================================================================== */
const SAVE_KEY='ht-save',BAK_KEY='ht-save-bak',BAD_KEY='ht-save-corrupt',SAVE_V=1;
const isObj=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const clone=o=>JSON.parse(JSON.stringify(o));
const num=(v,d)=>typeof v==='number'&&isFinite(v)?v:d;
const clampN=(v,a,b)=>v<a?a:v>b?b:v;
function starterPlaced(){return[{uid:'st1',id:'sofa',x:22,z:8,r:0},{uid:'st2',id:'coffeetable',x:22,z:10,r:0},{uid:'st3',id:'armchair',x:28,z:9,r:3},
  {uid:'st4',id:'dining',x:34,z:20,r:0},{uid:'st5',id:'chair',x:33,z:20,r:1},{uid:'st6',id:'chair',x:36,z:20,r:3},{uid:'st7',id:'dogbed',x:36,z:12,r:0},{uid:'st8',id:'picnic',x:20,z:32,r:0}]}
const SAVE_DEFAULT=()=>({v:SAVE_V,t:0,
  prog:{done:[false,false,false,false],trust:12,cuffed:0,downed:0,shotSurr:0,missionsRun:0},
  cash:0,stats:{earned:0,spent:0},
  owned:{guns:['pistol','shotgun'],att:[]},
  attOn:{},
  loadout:{side:'pistol',p1:'shotgun',p2:null},
  armory:{seen:{}},
  pending:[],
  furniture:{owned:{sofa:1,coffeetable:1,armchair:1,dining:1,chair:2,dogbed:1,picnic:1},placed:starterPlaced()},
  family:{firstVisit:true,seen:[],pets:0,lastShotSurr:0},
  events:[],
  flags:{rangeDay:false,beanbagGift:false,zipPack:false,icePack:false},
  /* extensions (optional; filled from defaults when missing) */
  vehicle:{engine:0,tyres:0,brakes:0,bullBar:0,panels:0,roofBox:0,gunRack:0,medkit:0,paint:'stock',rims:'stock',tint:0,lightBar:0,horn:'stock',
    cos:{paint:['stock'],rims:['stock'],horn:['stock']}},
  world:{hood:'maple',trust2:12,done2:[],places:['maple','home','hardware']}});

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

/* Old shapes we may meet: v0 = the pre-save prototype ({done,trust,cash,guns}) or anything without a version. */
const MIGRATIONS={
  0:s=>{const o={v:1};
    o.prog=isObj(s.prog)?s.prog:{done:s.done,trust:s.trust,cuffed:s.cuffed,downed:s.downed,shotSurr:s.shotSurr,missionsRun:s.missionsRun};
    for(const k in o.prog)if(o.prog[k]===undefined)delete o.prog[k];
    o.cash=s.cash;
    if(Array.isArray(s.guns))o.owned={guns:s.guns.slice(),att:Array.isArray(s.att)?s.att.slice():[]};
    else if(isObj(s.owned))o.owned=s.owned;
    for(const k in s)if(!(k in o)&&!['done','trust','cuffed','downed','shotSurr','missionsRun','guns','att'].includes(k))o[k]=s[k];
    o.v=1;return o}};
function migrate(s){
  let v=typeof s.v==='number'?s.v:0,guard=0;
  while(v<SAVE_V&&MIGRATIONS[v]&&guard++<20){s=MIGRATIONS[v](s);v=s.v}
  return s}

function sanitize(s){
  s=deepMerge(SAVE_DEFAULT(),s);s.v=SAVE_V;
  const p=s.prog;
  p.done=[0,1,2,3].map(i=>!!(Array.isArray(p.done)&&p.done[i]));
  p.trust=clampN(num(p.trust,12),0,100);
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
  for(const k in L)if(!['side','p1','p2'].includes(k))delete L[k];
  const seen={};for(const g in s.armory.seen)if(GUNS[g])seen[g]=Math.max(0,Math.floor(num(s.armory.seen[g],0)));s.armory.seen=seen;
  s.pending=s.pending.filter(e=>isObj(e)&&((e.kind==='gun'&&GUNS[e.id])||(e.kind==='att'&&ATTACHMENTS[e.id])||(e.kind==='furn'&&FURNITURE[e.id])));
  const fo={};for(const f in s.furniture.owned)if(FURNITURE[f])fo[f]=Math.max(0,Math.floor(num(s.furniture.owned[f],0)));
  const uids=new Set(),placed=[];
  for(const e of s.furniture.placed){if(!isObj(e)||!FURNITURE[e.id])continue;
    const x=num(e.x,NaN),z=num(e.z,NaN);if(!isFinite(x)||!isFinite(z))continue;
    let uid=typeof e.uid==='string'&&e.uid?e.uid:'f'+Math.random().toString(36).slice(2,8);while(uids.has(uid))uid+='x';uids.add(uid);
    placed.push({uid,id:e.id,x:Math.round(x),z:Math.round(z),r:((Math.round(num(e.r,0))%4)+4)%4})}
  s.furniture.placed=placed;
  for(const e of placed)fo[e.id]=Math.max(fo[e.id]||0,placed.filter(q=>q.id===e.id).length);
  s.furniture.owned=fo;
  const vh=s.vehicle;
  for(const k of VEH_ORDER)vh[k]=clampN(Math.floor(num(vh[k],0)),0,VEHICLE[k].tiers.length);
  if(!isObj(vh.cos))vh.cos={};
  for(const g in COSMETICS){const ids=COSMETICS[g].opts.map(o=>o.id);
    vh.cos[g]=uniq(['stock',...(Array.isArray(vh.cos[g])?vh.cos[g]:[]).filter(i=>ids.includes(i))]);
    if(!vh.cos[g].includes(vh[g]))vh[g]='stock'}
  s.world.trust2=clampN(num(s.world.trust2,12),0,100);
  s.world.places=uniq(['maple','home','hardware',...s.world.places.filter(x=>typeof x==='string')]);
  if(typeof s.world.hood!=='string')s.world.hood='maple';
  s.family.seen=s.family.seen.filter(x=>typeof x==='string');
  s.events=s.events.filter(x=>typeof x==='string').slice(-50);
  for(const k in s.flags)s.flags[k]=!!s.flags[k];
  s.t=num(s.t,0);
  return s}

/* storage adapter: localStorage in the browser, a Map elsewhere (tests can swap it with Save.useStorage) */
function memStore(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
let store=(()=>{try{if(root.localStorage){const k='__ht_probe';root.localStorage.setItem(k,'1');root.localStorage.removeItem(k);return root.localStorage}}catch(e){}return memStore()})();
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

const Save={
  KEY:SAVE_KEY,VERSION:SAVE_V,
  defaults:SAVE_DEFAULT,starterPlaced,migrate,sanitize,MIGRATIONS,
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
    const ok=sSet(SAVE_KEY,JSON.stringify(data));emit('saved',data);return ok},
  flush(){if(timer)Save.saveNow()},
  reset(){clearTimeout(timer);timer=null;sDel(SAVE_KEY);sDel(BAK_KEY);data=SAVE_DEFAULT();attachProg();Save.saveNow();
    for(const k in data)emit(k,data[k]);emit('load',data);return data},
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
  if(kind==='sup')return SUPPLIES[id].price;
  if(kind==='veh'){const u=VEHICLE[id],lv=s.vehicle[id]||0;return lv<u.tiers.length?u.tiers[lv].price:0}
  if(kind==='cos'){const[g,o]=id.split(':');const opt=COSMETICS[g].opts.find(x=>x.id===o);return opt?opt.price:0}
  return 0}
function discountFor(store,s){s=S(s);return store==='hardware'&&s.prog.trust>=60?.1:0}
function priceOf(kind,id,store,s){const b=basePrice(kind,id,s),d=discountFor(store,s);return{price:Math.round(b*(1-d)),base:b,discount:d}}

/* Full status of a catalogue entry in a store: what the buy button should say. */
function status(kind,id,store,s){s=S(s);const pr=priceOf(kind,id,store,s),cash=s.cash;
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
  if(kind==='veh'){const u=VEHICLE[id],lv=s.vehicle[id]||0;out.level=lv;out.max=u.tiers.length;
    if(lv>=u.tiers.length){out.state='maxed';out.reason='Fully upgraded';return out}
    const r=condReason(u.tiers[lv].unlock,s);if(r){out.state='locked';out.reason=r;return out}return afford()}
  if(kind==='cos'){const[g,o]=id.split(':');const opt=COSMETICS[g].opts.find(x=>x.id===o);
    if(s.vehicle.cos[g].includes(o)){out.state=s.vehicle[g]===o?'equipped':'owned';return out}
    const r=condReason(opt.unlock,s);if(r){out.state='locked';out.reason=r;return out}return afford()}
  out.state='locked';out.reason='Unknown item';return out}

const canAfford=(price,s)=>S(s).cash>=price;

function buy(kind,id,store,s){s=S(s);store=store||'hardware';
  const st=status(kind,id,store,s);
  if(st.state==='poor')return{ok:false,reason:'Not enough cash. You need '+money(st.short)+' more.',code:'poor',status:st};
  if(st.state==='locked')return{ok:false,reason:/^Back-ordered/.test(st.reason||'')?'back-ordered: '+st.reason:st.reason,code:'locked',status:st};
  if(st.state!=='buy')return{ok:false,reason:st.state==='maxed'?st.reason:'Already yours.',code:st.state,status:st};
  const oldCash=s.cash;s.cash-=st.price;s.stats.spent+=st.price;
  const deliverLater=STORES[store]&&STORES[store].deliver==='pending'&&(kind==='gun'||kind==='att'||kind==='furn');
  let ev=null;
  if(deliverLater){s.pending.push({kind,id});}
  else if(kind==='gun'){s.owned.guns.push(id);ev='boughtGun';autoSlot(id,s)}
  else if(kind==='att'){s.owned.att.push(id);ev='boughtAttachment';autoAttach(id,s)}
  else if(kind==='furn'){s.furniture.owned[id]=(s.furniture.owned[id]||0)+1;ev='boughtFurniture'}
  else if(kind==='sup'){s.flags[SUPPLIES[id].flag]=true}
  else if(kind==='veh'){s.vehicle[id]=(s.vehicle[id]||0)+1;ev='boughtUpgrade'}
  else if(kind==='cos'){const[g,o]=id.split(':');s.vehicle.cos[g].push(o);s.vehicle[g]=o;ev='boughtUpgrade'}
  if(ev)s.events.push(ev);
  if(mine(s)){emit('cash',s.cash,oldCash);Save.touch('owned','pending','furniture','vehicle','flags','loadout','attOn','events','stats')}
  return{ok:true,price:st.price,delivered:deliverLater?'pending':'now',status:st}}

/* a new gun fills an empty primary slot; a new attachment goes on the first owned compatible gun with that slot free */
function autoSlot(id,s){const L=s.loadout;if(GUNS[id].slot==='prim'&&!L.p2&&L.p1!==id)L.p2=id}
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
  else return{ok:false,reason:"Dad’s Auto doesn't do refunds."};
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
    s.pending=s.pending.filter(e=>!(e.kind==='gun'&&e.id===id))}
  if(mine(s))Save.touch('armory','owned','events');
  return{unlocked,n:s.armory.seen[id],need:need||0,name:GUNS[id].name}}

/* Loadout rules (SPEC C.4) */
function setLoadout(slot,gun,s){s=S(s);const L=s.loadout;
  if(!['side','p1','p2'].includes(slot))return{ok:false,reason:'No such slot.'};
  if(gun==null){if(slot!=='p2')return{ok:false,reason:slot==='p1'?'Primary 1 can\'t be empty.':'You need a sidearm.'};L.p2=null}
  else{if(!GUNS[gun])return{ok:false,reason:'Unknown gun.'};
    if(!s.owned.guns.includes(gun))return{ok:false,reason:"You don't own the "+GUNS[gun].name+' yet.'};
    if(slot==='side'&&GUNS[gun].slot!=='side')return{ok:false,reason:'That one is too big for a holster.'};
    if(slot!=='side'&&GUNS[gun].slot!=='prim')return{ok:false,reason:'Sidearms go in the sidearm slot.'};
    const other=slot==='p1'?'p2':slot==='p2'?'p1':null;
    if(other&&L[other]===gun)return{ok:false,code:'dup',reason:"It's already in "+(other==='p1'?'Primary 1':'Primary 2')+'.'};
    L[slot]=gun}
  if(mine(s))Save.touch('loadout');
  return{ok:true,loadout:Object.assign({},L)}}
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

/* Minivan: multipliers for js/vehicles.js */
function vehicleStats(s){s=S(s);const v=s.vehicle,out={top:1,accel:1,grip:1,brake:1,armor:1,crewDmg:1,ram:1,frontDmg:1,notice:1,spareMags:0,vanSwap:false,vanHeal:0,revive:1,surrender:1};
  for(const k of VEH_ORDER){const lv=v[k]||0;if(lv>0)Object.assign(out,VEHICLE[k].tiers[lv-1].fx)}
  const pick=g=>COSMETICS[g].opts.find(o=>o.id===v[g])||COSMETICS[g].opts[0];
  out.levels={};for(const k of VEH_ORDER)out.levels[k]=v[k]||0;
  out.paint=pick('paint');out.rims=pick('rims');out.horn=pick('horn');out.tint=v.tint;out.bullBar=v.bullBar>0;out.roofBox=v.roofBox>0;out.lightBar=v.lightBar>0;out.gunRack=v.gunRack>0;out.medkit=v.medkit>0;
  return out}
const VBAR=[['top','Top speed',1.28],['accel','Accel.',1.45],['grip','Grip',1.3],['brake','Braking',1.45],['armor','Armor',2.2],['ram','Ramming',2]];
function vanBars(vs){return VBAR.map(([k,label,mx])=>({k,label,v:4+6*((vs[k]||1)-1)/(mx-1)}))}
function vanStatsWith(id,s){s=S(s);const c=clone(s);c.vehicle[id]=Math.min((c.vehicle[id]||0)+1,VEHICLE[id].tiers.length);return vehicleStats(c)}

/* ammo carried by a loadout (SPEC B.6: per type, the largest reserve among guns using it) */
function ammoFor(s,loadout){s=S(s);const L=loadout||s.loadout,vs=vehicleStats(s);const by={};
  for(const g of[L.side,L.p1,L.p2]){if(!g)continue;const w=weaponStats(g,s.attOn[g]||{});const a=w.ammo;
    const e=by[a]=by[a]||{type:a,name:AMMO[a].name,cap:AMMO[a].cap,col:AMMO[a].col,reserve:0,mag:0,guns:[]};e.reserve=Math.max(e.reserve,w.reserve);e.mag=Math.max(e.mag,w.mag);e.guns.push(g)}
  return Object.values(by).map(e=>{e.extra=(vs.spareMags+(s.flags.rangeDay?1:0))*e.mag;e.total=Math.min(e.cap,e.reserve+e.extra);return e})}

/* Payout (SPEC D.1). r: {mission, ok, cuffs, confiscated, allyDowns, got, timeLeft, elapsed, bossDone, exec, trust, rerun} */
function computePayout(r,s){r=r||{};
  const m=missionOf(r.mission!=null?r.mission:r.i!=null?r.i:r.id)||MISSIONS[0];
  const ok=!!r.ok,k=r.rerun?.5:1,n=v=>Math.max(0,Math.floor(num(v,0)));
  const trust=num(r.trust,s||data?S(s).prog.trust:12);
  const lines=[];let pos=0,pen=0;
  const add=(id,label,amt,kind)=>{amt=Math.round(amt);if(!amt)return;lines.push({id,label,amount:amt,kind:kind||'bonus'});if(amt>0)pos+=amt;else pen-=amt};
  if(ok)add('base','Bake sale fund',m.base*k,'base');
  else add('gas','Gas money',40,'base');
  if(n(r.cuffs))add('cuffs','Second chances ×'+n(r.cuffs),60*n(r.cuffs)*k);
  if(n(r.confiscated))add('guns','Guns turned in to Officer Dana ×'+n(r.confiscated),25*n(r.confiscated)*k);
  if(ok&&n(r.allyDowns)===0)add('hamstring','Nobody pulled a hamstring',150*k);
  if(n(r.got)&&m.id==='gary')add('packages','Returned packages ×'+n(r.got),30*n(r.got)*k);
  if(ok&&m.id==='rick'&&num(r.timeLeft,0)>0){const t=Math.round(r.timeLeft);add('clock','Clock bonus · '+t+'s left',3*t*k)}
  if(ok&&m.par&&r.elapsed!=null){const e=num(r.elapsed,1e9);if(e<m.par)add('quick','Quick work',100*k);else if(e<m.par*1.5)add('quick','Pretty quick work',50*k)}
  if(r.bossDone==='cuffed')add('bail',"King's bail refund",500*k);
  const mult=.8+trust/250,adj=Math.round(pos*mult)-pos;
  if(adj)lines.push({id:'trust',label:adj>0?'Neighbors chipped in':'Neighbors are nervous',amount:adj,kind:'mult',note:'×'+mult.toFixed(2)+' at '+Math.round(trust)+'% trust'});
  if(n(r.exec))add('legal','Legal fees ×'+n(r.exec),-200*n(r.exec),'penalty');
  const total=Math.max(0,pos+adj-pen);
  return{lines,subtotal:pos,multiplier:mult,penalties:pen,total,ok,rerun:!!r.rerun,mission:m.id}}

/* Credit a payout to the save and queue the home event (SPEC D.2) */
function applyPayout(p,s){s=S(s);const old=s.cash;s.cash+=p.total;s.stats.earned+=p.total;s.events.push(p.ok?'win_'+p.mission:'fail');
  if(mine(s)){emit('cash',s.cash,old);Save.touch('stats','events')}return s.cash}

const resultLines=p=>p.lines.map(l=>({label:l.label,text:(l.amount<0?'−$':'+$')+Math.abs(l.amount).toLocaleString('en-US'),neg:l.amount<0,kind:l.kind,note:l.note||''}));

const Economy={money,missionOf,condReason,gunAvail,priceOf,basePrice,discountFor,status,canAfford,buy,sell,sellValue,deliverPending,collectGun,
  setLoadout,swapPrimaries,setAttachment,weaponStats,gunBars,vehicleStats,vanBars,vanStatsWith,ammoFor,computePayout,applyPayout,resultLines,BAR_DEFS};
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
/* minivan side view; paint colour and wheel style vary */
function vanSVG(col,rims,extra){col=col||'#b9c0c7';
  return ground(66,90)+(extra&&extra.under||'')+P('M14 70V44c0-6 4-10 10-12l20-16c3-2 6-4 12-4h64c14 0 22 10 26 26l2 30c0 4-2 6-6 6H18c-2 0-4-2-4-4z',col)+
    `<path d="M14 62h134v8c0 4-2 6-6 6H18c-2 0-4-2-4-4z" fill="#000" opacity=".18" stroke="none"/>`+
    P('M48 20l-16 14h28V20z','#2b3440')+R(66,20,30,14,'#2b3440',2)+P('M102 20h18c6 0 12 6 14 14h-32z','#2b3440')+P('M98 18v54M62 38v32',null)+R(70,46,12,3,DK,1)+
    R(140,46,8,6,SUN,2)+R(12,48,6,8,RED,2)+wheel(42,74,rims)+wheel(118,74,rims)+(extra&&extra.over||'')}
function wheel(x,y,st,k){k=k||1;const rimC={hub:'#cfd5db',steel:'#2c3036',chrome:'#e9eef2',gold:'#e8b93a',offroad:'#8a9099'}[st]||'#cfd5db';
  let s=Ci(x,y,14*k,'#1b1d21')+Ci(x,y,8*k,rimC);
  if(st==='chrome'||st==='gold')for(let i=0;i<5;i++){const a=i*1.2566-1.57;s+=`<path d="M${x} ${y}L${(x+Math.cos(a)*8*k).toFixed(1)} ${(y+Math.sin(a)*8*k).toFixed(1)}" stroke="${K}" stroke-width="${2*Math.min(k,1.6)}"/>`}
  if(st==='offroad')s+=`<circle cx="${x}" cy="${y}" r="${11*k}" fill="none" stroke="${K}" stroke-width="2" stroke-dasharray="${3*k} ${3*k}"/>`;
  if(st==='hub')s+=Ci(x,y,3*k,MT);if(st==='steel')for(const[dx,dy]of[[-4,0],[4,0],[0,-4],[0,4]])s+=Ci(x+dx*k,y+dy*k,1.5*k,'#888');
  if(k>1)s+=`<circle cx="${x}" cy="${y}" r="${11.5*k}" fill="none" stroke="#3a3e45" stroke-width="${2.5*k}" stroke-dasharray="${2*k} ${3*k}"/>`;
  return s}
function vanFull(vs){const lv=vs.levels;let under='',over='';
  if(lv.roofBox)under+=P('M50 14c4-10 16-12 30-12h30c10 0 18 4 20 12z','#2c3036')+R(60,10,6,6,MT)+R(104,10,6,6,MT);
  else if(lv.lightBar)under+=R(48,6,72,10,DK,3)+R(52,8,14,6,SUN,2)+R(70,8,14,6,ORG,2)+R(88,8,14,6,SUN,2)+R(104,8,12,6,ORG,2);
  if(lv.roofBox&&lv.lightBar)over+=R(122,8,24,8,DK,3)+R(125,10,8,4,SUN,1)+R(135,10,8,4,ORG,1);
  if(lv.bullBar)over+=P('M146 42h10v34h-10',DK)+P('M150 46h8M150 58h8M150 70h8',null);
  if(lv.tint)over+=`<path d="M48 20l-16 14h28V20zM66 20h30v14H66zM102 20h18c6 0 12 6 14 14h-32z" fill="#000" opacity="${.2*lv.tint}" stroke="none"/>`;
  if(lv.panels)over+=`<path d="M64 40h32v28H64z" fill="none" stroke="${POLO}" stroke-width="2" stroke-dasharray="4 3"/>`;
  return svg(vanSVG(vs.paint.col,vs.rims.style,{under,over}),'0 -8 160 108')}
function ammoIcon(type){const a=AMMO[type];let b=ground(50);
  b+=R(34,46,92,40,'#4f6a3a',3)+R(34,40,92,12,'#5c7a44',3)+T(80,74,13,a.name.toUpperCase(),PAP);
  for(let i=0;i<5;i++)b+=P(`M${46+i*15} 40v-16c0-5 3-9 5-11 2 2 5 6 5 11v16z`,a.col);
  return svg(b)}
const VEH_ICONS={
  engine:()=>ground(54)+R(36,34,88,46,'#5b636e',6)+R(46,22,68,16,RED,4)+P('M52 22v-6h10v6M72 22v-6h10v6M92 22v-6h10v6',null)+R(28,46,10,22,DK,2)+R(122,46,10,22,DK,2)+
    P('M50 50h60M50 60h60M50 70h60',null)+T(80,34,10,'V6',PAP)+hi('M50 26h56'),
  tyres:()=>ground(46)+Ci(80,50,40,'#1b1d21')+Ci(80,50,22,'#cfd5db')+Ci(80,50,7,MT)+
    `<circle cx="80" cy="50" r="33" fill="none" stroke="#4a4f57" stroke-width="5" stroke-dasharray="6 5"/>`+hi('M56 26c8-6 20-8 30-6'),
  brakes:()=>ground(46)+Ci(76,50,38,'#9aa1a9')+Ci(76,50,26,'#b8bec5')+Ci(76,50,12,DK)+P('M76 22v8M76 70v8M48 50h8M96 50h8',null)+P('M98 18c18 6 26 20 26 32s-8 26-26 32l-6-10c10-4 16-12 16-22s-6-18-16-22z',RED)+T(112,54,8,'HT',PAP),
  bullBar:()=>vanSVG(null,'hub',{over:P('M146 42h10v34h-10',DK)+P('M150 46h8M150 58h8M150 70h8',null)}),
  panels:()=>ground(40)+P('M80 10l40 14v26c0 22-18 36-40 42-22-6-40-20-40-42V24z',POLO)+P('M80 20l30 10v20c0 16-12 26-30 32z','#4a78bd')+P('M66 50l10 10 20-20',null)+hi('M54 30c8-4 16-6 24-8'),
  tint:()=>ground(54)+P('M30 82V36c0-10 8-18 18-18h64c10 0 18 8 18 18v46z',MT)+P('M38 74V38c0-6 4-12 12-12h60c6 0 12 6 12 12v36z','#1e2530')+
    `<path d="M44 30l30 40M70 30l20 26" stroke="#fff" stroke-width="3" opacity=".25"/>`+P('M88 54c4-4 10-4 14 0',null)+Ci(92,50,1.5,'#fff')+Ci(100,50,1.5,'#fff'),
  roofBox:()=>vanSVG(null,'hub',{under:P('M50 14c4-10 16-12 30-12h30c10 0 18 4 20 12z','#2c3036')+R(60,10,6,6,MT)+R(104,10,6,6,MT)}),
  gunRack:()=>ground(54)+R(24,24,112,10,WD,3)+R(24,60,112,10,WD,3)+P('M40 34v26M80 34v26M120 34v26',null)+
    P('M30 46h92l8-4v8l-8-2H30z',DK)+P('M36 46l-8 6 8 6',WL)+R(56,40,40,8,MT,2)+T(80,86,10,'NO FISHING RODS',K),
  medkit:()=>ground(50)+R(34,24,92,62,RED,8)+R(64,14,32,12,DK,4)+R(70,36,20,40,PAP)+R(60,46,40,20,PAP)+hi('M42 32h76'),
  lightBar:()=>vanSVG(null,'hub',{under:R(48,6,72,10,DK,3)+R(52,8,14,6,SUN,2)+R(70,8,14,6,ORG,2)+R(88,8,14,6,SUN,2)+R(104,8,12,6,ORG,2)+
    `<path d="M60 2l-6-8M84 0v-8M108 2l6-8" stroke="${SUN}" stroke-width="3"/>`}),
};
const SUP_ICONS={
  rangeDay:()=>ground(54)+R(30,36,100,48,'#4f6a3a',3)+R(30,28,100,14,'#5c7a44',3)+R(68,30,24,8,SUN,2)+T(80,66,14,'AMMO',PAP)+R(44,16,8,14,SUN,2)+R(56,14,8,16,SUN,2)+R(96,16,8,14,'#c79b2a',2)+R(108,18,8,12,'#c79b2a',2),
  zipPack:()=>ground(46)+R(36,30,88,56,'#2b2f35',4)+R(42,24,76,10,SUN,2)+T(80,66,11,'500 PACK',PAP)+
    `<path d="M48 22c-6-14 0-22 8-18M62 22c-4-14 4-20 10-16M98 22c4-14-4-20-10-16M112 22c6-14 0-22-8-18" fill="none" stroke="${K}" stroke-width="3"/>`,
  icePack:()=>ground(48)+R(34,26,92,56,'#7fc4ec',16)+R(42,34,76,40,'#b6e0f6',12)+T(80,60,14,'OUCH',POLO)+R(54,14,10,14,RED,2)+R(68,12,8,16,PAP,2)+P('M100 30l10-16 8 4-10 16z',SUN),
};
function horn(ids){return ground(46)+P('M40 40h18l40-22v64L58 60H40z',SUN)+R(30,40,12,20,DK,2)+
  `<path d="M108 34c8 6 8 26 0 32M118 26c14 10 14 38 0 48M128 18c20 14 20 50 0 64" fill="none" stroke="${K}" stroke-width="3" opacity="${ids==='stock'?.4:.9}"/>`}
function iconSVG(kind,id){
  let f;
  if(kind==='gun')f=GUN_ICONS[id];else if(kind==='att')f=ATT_ICONS[id];else if(kind==='furn')f=FURN_ICONS[id];else if(kind==='veh')f=VEH_ICONS[id];else if(kind==='sup')f=SUP_ICONS[id];
  else if(kind==='cos'){const[g,o]=id.split(':');const opt=COSMETICS[g].opts.find(x=>x.id===o)||{};
    if(g==='paint')return svg(vanSVG(opt.col,'hub'));if(g==='rims')return svg(ground(46)+wheel(80,50,opt.style,2.8));
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
function sfx(n){if(!Menus.volume)return;try{const o=HT.Shop&&HT.Shop.sfx;if(typeof o==='function'&&o(n)===true)return;SFX[n]&&SFX[n]()}catch(e){}}
function playHorn(opt){if(!opt||!opt.notes)return;let t=0;for(const[f,d]of opt.notes){tone(f,opt.chord?0:t,d,.07,opt.wave||'square');if(opt.chord)tone(f*1.26,0,d,.05,opt.wave||'square');t+=d*.9}}
Menus.sfx=sfx;Menus.playHorn=playHorn;

function countTo(el,from,to,ms,fmt){fmt=fmt||money;if(!el)return;if(reduced()||ms<=0||from===to){el.textContent=fmt(to);return}
  const t0=performance.now();cancelAnimationFrame(el._raf);
  const step=now=>{const k=Math.min(1,(now-t0)/ms),e=1-Math.pow(1-k,3);el.textContent=fmt(Math.round(from+(to-from)*e));if(k<1)el._raf=requestAnimationFrame(step)};el._raf=requestAnimationFrame(step)}
Menus.countTo=countTo;

/* --- thumbnails: game-supplied 3D renders when available, vector fallback otherwise --- */
const thumbCache=new Map(),thumbWait=new Set();
function asThumbHTML(out){if(!out)return null;if(out.toDataURL)return'<img alt="" src="'+out.toDataURL()+'">';if(out.tagName==='IMG')return'<img alt="" src="'+esc(out.src)+'">';
  if(typeof out==='string')return out.trim().startsWith('<')?out:'<img alt="" src="'+esc(out)+'">';return null}
/* thumbRenderer(item) may return a canvas, an <img>, a URL / HTML string, or a Promise of one; null keeps the vector icon. */
function thumbHTML(kind,id){const key=kind+':'+id;
  const r=HT.Shop&&HT.Shop.thumbRenderer;
  if(r){if(thumbCache.has(key))return thumbCache.get(key)||iconSVG(kind,id);
    if(!thumbWait.has(key)){try{const out=r(Object.assign({kind,id,key},itemData(kind,id)));
      if(out&&typeof out.then==='function'){thumbWait.add(key);out.then(v=>{const h=asThumbHTML(v);thumbCache.set(key,h);thumbWait.delete(key);
          if(h)for(const el of document.querySelectorAll(`[data-tk="${key}"]`)){el.innerHTML=h;el.classList.add('htm-rendered')}},()=>{thumbCache.set(key,null);thumbWait.delete(key)})}
      else{const h=asThumbHTML(out);thumbCache.set(key,h);if(h)return h}}catch(e){thumbCache.set(key,null)}}}
  return iconSVG(kind,id)}
const tk=(kind,id)=>`data-tk="${kind}:${id}"${thumbCache.get(kind+':'+id)?' class="htm-rendered"':''}`;
function itemData(kind,id){if(kind==='gun')return GUNS[id];if(kind==='att')return ATTACHMENTS[id];if(kind==='furn')return FURNITURE[id];if(kind==='sup')return SUPPLIES[id];
  if(kind==='veh')return VEHICLE[id];if(kind==='cos'){const[g,o]=id.split(':');return COSMETICS[g].opts.find(x=>x.id===o)}return{}}

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
  dadazon:`<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#16181c" stroke-width="3.5" stroke-linejoin="round"><path d="M8 22l24-12 24 12v26L32 60 8 48z" fill="#d7a86e"/><path d="M8 22l24 12 24-12M32 34v26" fill="none"/><path d="M20 16l24 12v8" fill="none" stroke="#f6f1e3" stroke-width="5"/><path d="M20 16l24 12v8" fill="none" stroke="#16181c" stroke-width="1.5"/><path d="M18 42c4 3 8 3 10 0 2 3 6 3 10 0" fill="none" stroke-width="3"/></g></svg>`,
  hardware:`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="#f6f1e3" stroke="#16181c" stroke-width="3.5"/><path d="M32 8l5 11 7-3-2 11 8-2-4 8 6 3-12 7 2 6-10-2v12h-2V47l-10 2 2-6-12-7 6-3-4-8 8 2-2-11 7 3z" fill="#c23b2e" stroke="#16181c" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
  auto:`<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#16181c" stroke-width="3.5" stroke-linejoin="round"><path d="M32 4l24 14v28L32 60 8 46V18z" fill="#ffc94a"/><circle cx="32" cy="32" r="11" fill="#16181c"/><circle cx="32" cy="32" r="5" fill="#ffc94a"/></g></svg>`,
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
  document.body.appendChild(el);
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
const slotName={side:'Sidearm',prim:'Primary',p1:'Primary 1',p2:'Primary 2'};

/* =====================================================================
   SHOP
   ===================================================================== */
const TAG_TXT={seat:'Seating','tv-facing':'TV time',tv:'TV time',dining:'Dinner',play:'Playtime',dogbed:'Dog naps',gather:'Hangouts',garage:'Garage hangs'};
const SECTION_OF_ROOM={'Living room':'Living room',Dining:'Dining & kitchen',Kitchen:'Dining & kitchen',Garage:'Garage',Backyard:'Backyard',Porch:'Backyard'};
function shopEntries(store,tab){
  const E=[];
  if(tab==='guns'){for(const id of GUN_ORDER)E.push({kind:'gun',id,sec:GUNS[id].slot==='side'?'Sidearms':'Primaries'})}
  else if(tab==='att'){for(const id in ATTACHMENTS)E.push({kind:'att',id})}
  else if(tab==='furn'){const secs=['Living room','Dining & kitchen','Garage','Backyard','Odds & ends'];
    const list=FURN_ORDER.filter(id=>store!=='hardware'||FURNITURE[id].hw).map(id=>({kind:'furn',id,sec:SECTION_OF_ROOM[FURNITURE[id].room]||'Odds & ends'}));
    list.sort((a,b)=>secs.indexOf(a.sec)-secs.indexOf(b.sec));E.push(...list)}
  else if(tab==='sup'){for(const id in SUPPLIES)E.push({kind:'sup',id})}
  else if(tab==='cos'){for(const g in COSMETICS)for(const o of COSMETICS[g].opts)E.push({kind:'cos',id:g+':'+o.id,sec:COSMETICS[g].name})}
  else for(const id of VEH_ORDER)if(VEHICLE[id].tab===tab)E.push({kind:'veh',id});
  for(const e of E){e.key=e.kind+':'+e.id}
  return E}
function entryName(kind,id){if(kind==='veh'){const u=VEHICLE[id],lv=Save.data.vehicle[id]||0;return u.tiers.length>1?u.name:u.tiers[0].name}const d=itemData(kind,id);return d?d.name:id}
function entrySub(kind,id){
  if(kind==='gun'){const g=GUNS[id];return slotName[g.slot]+' · '+AMMO[g.ammo].name}
  if(kind==='att'){const a=ATTACHMENTS[id];return ATT_SLOTS.find(s=>s[0]===a.slot)[1]+' · fits '+a.compat.length+' guns'}
  if(kind==='furn'){const f=FURNITURE[id];return f.room+' · '+f.cells[0]+'×'+f.cells[1]+' m'}
  if(kind==='sup')return'Next mission only';
  if(kind==='veh'){const u=VEHICLE[id],lv=Save.data.vehicle[id]||0;return u.tiers.length>1?`<span class="htm-pips">${u.tiers.map((t,i)=>`<i class="${i<lv?'on':''}"></i>`).join('')}</span>${lv>=u.tiers.length?'Maxed':'Stage '+(lv+1)+': '+esc(u.tiers[lv].name)}`:'One-time install'}
  if(kind==='cos'){const[g]=id.split(':');return COSMETICS[g].name}
  return''}

function tagHTML(st){
  if(st.state==='buy'||st.state==='poor')return`<span class="htm-price${st.state==='poor'?' poor':''}">${st.discount?`<s>${money(st.base)}</s>`:''}${st.price?money(st.price):'Free'}</span>`;
  const lab={owned:'Owned',equipped:'Equipped',pending:'On its way',maxed:st.kind==='furn'?'Have one':'Maxed',locked:'Locked'}[st.state];
  return`<span class="htm-chip s-${st.state}">${st.state==='locked'?'<i class="htm-lock"></i>':''}${lab}</span>`}

function shopTile(e,st,sel){
  const lockR=st.state==='locked'?`<span class="htm-ireason">${esc(st.reason||'')}</span>`:'';
  return`<button class="htm-item${sel?' sel':''}" data-nav data-key="${e.key}" data-state="${st.state}" role="listitem" aria-label="${esc(entryName(e.kind,e.id))}">
    <span class="htm-thumb t-${e.kind}"><span class="htm-ti" ${tk(e.kind,e.id)}>${thumbHTML(e.kind,e.id)}</span></span>
    <span class="htm-itx"><span class="htm-iname">${esc(entryName(e.kind,e.id))}</span><span class="htm-isub">${entrySub(e.kind,e.id)}</span>${lockR}</span>
    <span class="htm-tag">${tagHTML(st)}</span></button>`}

function buyButtonHTML(st,armed,store){
  const t=coarse()?'Tap':'Press Enter';
  if(st.state==='buy'){const verb=store==='dadazon'?'Order':st.kind==='veh'?'Install':'Buy';
    return armed?`<button class="htm-btn armed" data-nav data-act="primary"><span>Confirm ${verb.toLowerCase()} · ${money(st.price)}</span><small>${t} again</small></button>`
      :`<button class="htm-btn" data-nav data-act="primary"><span>${verb} · ${st.price?money(st.price):'Free'}</span></button>`}
  if(st.state==='poor')return`<button class="htm-btn poor" data-nav data-act="primary" aria-disabled="true"><span>Need ${money(st.short)} more</span></button>`;
  if(st.state==='locked')return`<button class="htm-btn off" data-nav data-act="primary" aria-disabled="true"><span><i class="htm-lock"></i>${esc(st.reason||'Locked')}</span></button>`;
  if(st.state==='pending')return`<button class="htm-btn off" data-nav data-act="primary" aria-disabled="true"><span>On its way · arrives at home</span></button>`;
  if(st.state==='maxed')return`<button class="htm-btn off" data-nav data-act="primary" aria-disabled="true"><span>${esc(st.reason||'Maxed out')}</span></button>`;
  if(st.kind==='cos'&&st.state==='owned')return`<button class="htm-btn" data-nav data-act="primary"><span>Use this one</span></button>`;
  if(st.kind==='sup')return`<button class="htm-btn off" data-nav data-act="primary" aria-disabled="true"><span>Packed for the next job</span></button>`;
  return`<button class="htm-btn off" data-nav data-act="primary" aria-disabled="true"><span>${st.state==='equipped'?'Equipped':'In your locker'}</span></button>`}

function stampHTML(st,store){
  if(st.state==='equipped')return`<span class="htm-stamp s-eq">${st.kind==='cos'?'On the van':'Equipped'}</span>`;
  if(st.state==='owned')return`<span class="htm-stamp s-own">${st.how==='collected'?'Collected':'Owned'}</span>`;
  if(st.state==='pending'||st.pend)return`<span class="htm-stamp s-pend">Ordered</span>`;
  if(st.kind==='furn'&&st.have)return`<span class="htm-stamp s-own">Own ${st.have}</span>`;
  if(st.state==='maxed'&&st.kind==='veh')return`<span class="htm-stamp s-own">Installed</span>`;
  return''}

function shopDetail(m,e){
  const s=Save.data,st=status(e.kind,e.id,m.store),d=itemData(e.kind,e.id)||{},armed=m.armed===e.key;
  let kicker='',body='',name=entryName(e.kind,e.id),blurb=d.blurb||'',fx='';
  if(e.kind==='gun'){const g=GUNS[e.id];kicker=slotName[g.slot]+' · '+g.cls+' · '+AMMO[g.ammo].name;
    const L=s.loadout;let cmp=g.slot==='side'?L.side:(L.p1===e.id?L.p2:L.p1);if(cmp===e.id)cmp=null;
    const me=weaponStats(e.id,s.attOn[e.id]||{}),other=cmp?weaponStats(cmp,s.attOn[cmp]||{}):null;
    body=`<div class="htm-cmp">${cmp?`Compared with your <b>${esc(GUNS[cmp].name)}</b> <span class="htm-legend"><i class="up"></i>better <i class="down"></i>worse</span>`:st.state==='equipped'?'In your loadout':'Nothing to compare with'}</div>`+
      barsHTML(other?gunBars(other):null,gunBars(me))+gunFacts(me,other);
    if(g.unlock.collect&&st.state!=='equipped'&&st.state!=='owned'){const c=st.collect||{n:0,need:g.unlock.collect};
      body+=`<div class="htm-collect"><span>Armory: pick up ${c.need} from thugs to get it free</span><span class="htm-meter"><i style="width:${100*c.n/c.need}%"></i></span><b>${c.n}/${c.need}</b></div>`}}
  else if(e.kind==='att'){const a=ATTACHMENTS[e.id];kicker=ATT_SLOTS.find(x=>x[0]===a.slot)[1]+' attachment';fx=a.fx;
    const owned=a.compat.filter(g=>s.owned.guns.includes(g)),eq=[s.loadout.p1,s.loadout.p2,s.loadout.side].filter(g=>g&&a.compat.includes(g));
    const pool=eq.length?[...new Set([...eq,...owned])]:owned.length?owned:a.compat;
    if(!m.attTarget||!pool.includes(m.attTarget))m.attTarget=pool[0];const g=m.attTarget;
    const cur=Object.assign({optic:null,mag:null,under:null,muzzle:null},s.attOn[g]||{});const before=weaponStats(g,Object.assign({},cur,{[a.slot]:null})),after=weaponStats(g,Object.assign({},cur,{[a.slot]:e.id}));
    fx='';body=`<div class="htm-cmp">Try it on <button class="htm-cycle" data-nav data-act="target" ${pool.length<2?'disabled':''}><span>‹</span><b>${esc(GUNS[g].name)}</b><span>›</span></button></div>`+
      barsHTML(gunBars(before),gunBars(after))+gunFacts(after,before)+
      `<div class="htm-fits"><span>Fits</span>${a.compat.map(id=>`<i class="${s.owned.guns.includes(id)?'own':''}">${esc(GUNS[id].short)}</i>`).join('')}</div><div class="htm-fx" style="margin-top:12px"><b>What it does</b>${esc(a.fx)}</div>`}
  else if(e.kind==='furn'){const f=FURNITURE[e.id];const zn={in:'Indoors',out:'Outdoors',any:'Inside or out'}[f.zone];kicker=f.room===zn||f.room==='Backyard'?f.room:f.room+' · '+zn;
    const own=s.furniture.owned[e.id]||0,placed=s.furniture.placed.filter(p=>p.id===e.id).length;
    const cells=[];for(let z=0;z<3;z++)for(let x=0;x<3;x++)cells.push(`<i class="${x<f.cells[0]&&z<f.cells[1]?'on':''}"></i>`);
    body=`<div class="htm-furn"><div class="htm-fp"><div class="htm-fpg">${cells.join('')}</div><span>${f.cells[0]} × ${f.cells[1]} m${f.layer==='floor'?' · goes under things':''}</span></div>
      <div class="htm-fans"><span>Who'll love it</span><div>${(f.fans||[]).length?f.fans.map(w=>`<b style="--c:${FAMILY[w].col}"><i>${FAMILY[w].name[0]}</i>${FAMILY[w].name}</b>`).join(''):'<em>Mostly you</em>'}${(f.hates||[]).map(w=>`<b class="hate" style="--c:${FAMILY[w].col}"><i>${FAMILY[w].name[0]}</i>${FAMILY[w].name} hates it</b>`).join('')}</div></div></div>`+
      factsHTML([['You own',own?own+(placed?` · ${placed} placed`:''):'None yet'],['Family uses it',[...new Set(f.tags.map(t=>TAG_TXT[t]).filter(Boolean))].join(', ')||'Just looks nice']]);
    if(st.state==='owned'||own-placed>0)m.canSell=true}
  else if(e.kind==='sup'){const u=SUPPLIES[e.id];kicker='Supplies · next mission';fx=u.fx}
  else if(e.kind==='veh'){const u=VEHICLE[e.id],lv=s.vehicle[e.id]||0,nt=u.tiers[Math.min(lv,u.tiers.length-1)];kicker='Minivan · '+({perf:'Performance',prot:'Protection',util:'Utility'}[u.tab]);
    name=u.tiers.length>1?(lv<u.tiers.length?nt.name:u.tiers[u.tiers.length-1].name):u.tiers[0].name;blurb=nt.blurb;fx=fxText(nt.fx);
    const now=vehicleStats(),then=lv<u.tiers.length?vanStatsWith(e.id):now,bn=vanBars(now),bt=vanBars(then);
    const rel=bt.map((b,i)=>Math.abs(b.v-bn[i].v)>.01||['top','armor'].includes(b.k));
    const moves=bt.some((b,i)=>Math.abs(b.v-bn[i].v)>.01);
    body=(moves?`<div class="htm-cmp">Your minivan <span class="htm-legend"><i class="up"></i>after install</span></div>`+barsHTML(bn.filter((b,i)=>rel[i]),bt.filter((b,i)=>rel[i])):'')+
      (u.tiers.length>1?`<ol class="htm-tiers">${u.tiers.map((t,i)=>`<li class="${i<lv?'done':i===lv?'next':''}"><i></i><span>${esc(t.name)}</span><b>${i<lv?'Installed':money(t.price)}</b></li>`).join('')}</ol>`:'')}
  else if(e.kind==='cos'){const[g,o]=e.id.split(':');kicker='Minivan · '+COSMETICS[g].name;
    if(g==='horn')body=`<button class="htm-ghost" data-nav data-act="honk">▶ Honk it</button>`;
    if(g==='paint')body=`<div class="htm-swatch" style="--c:${d.col}"><i></i><span>${esc(d.name)}</span></div>`;
    const ownN=s.vehicle.cos[g].length;body+=factsHTML([['On the van now',esc(COSMETICS[g].opts.find(x=>x.id===s.vehicle[g]).name)],['Collected',ownN+' of '+COSMETICS[g].opts.length]])}
  const sellV=(e.kind==='gun'||e.kind==='att')&&(st.state==='owned')?sellValue(e.kind,e.id):e.kind==='furn'&&m.canSell?sellValue('furn',e.id):0;m.canSell=false;
  let heroImg=`<span class="htm-ti" ${tk(e.kind,e.id)}>${thumbHTML(e.kind,e.id)}</span>`;
  if(e.kind==='cos'){const[g,o]=e.id.split(':');if(g==='paint'||g==='rims'){const vs=vehicleStats();vs[g]=COSMETICS[g].opts.find(x=>x.id===o);heroImg=vanFull(vs)}}
  return`<div class="htm-hero t-${e.kind}"><div class="htm-heroimg">${heroImg}</div>${stampHTML(st,m.store)}</div>
    <div class="htm-dscroll"><div class="htm-kicker">${esc(kicker)}</div><h3 class="htm-name">${esc(name)}</h3>
    ${blurb?`<p class="htm-blurb">${esc(blurb)}</p>`:''}${fx?`<div class="htm-fx"><b>What it does</b>${esc(fx)}</div>`:''}${body}</div>
    <div class="htm-buy"><div class="htm-buyrow">${buyButtonHTML(st,armed,m.store)}${sellV?`<button class="htm-ghost" data-nav data-act="sell">Sell · ${money(sellV)}</button>`:''}</div>
    ${m.store==='dadazon'&&st.state==='buy'?'<div class="htm-note">Free shipping · arrives the next time you get home</div>':st.discount&&st.state==='buy'?'<div class="htm-note">Neighbor discount: you save '+money(st.base-st.price)+'</div>':''}</div>
    <button class="htm-sheetx" data-act="sheetclose" aria-label="Back to list">✕</button>`}
function fxText(fx){const p=[];const pct=v=>(v>1?'+':'−')+Math.round(Math.abs(v-1)*100)+'%';
  if(fx.top)p.push('Top speed '+pct(fx.top));if(fx.accel)p.push('Acceleration '+pct(fx.accel));if(fx.grip)p.push('Grip '+pct(fx.grip));if(fx.brake)p.push('Braking '+pct(fx.brake));
  if(fx.armor)p.push('Van armor '+pct(fx.armor));if(fx.crewDmg)p.push('Crew damage in the van '+pct(fx.crewDmg));if(fx.ram)p.push('Ramming damage ×'+fx.ram);if(fx.frontDmg)p.push('Front hits '+pct(fx.frontDmg));
  if(fx.notice)p.push('Enemies spot the van '+Math.round((1-fx.notice)*100)+'% later');if(fx.spareMags)p.push('+'+fx.spareMags+' spare mag of every ammo type each job');if(fx.vanSwap)p.push('Swap your loadout at the van mid-job');
  if(fx.vanHeal)p.push('One full heal at the van per job');if(fx.revive)p.push('Crew revives '+pct(fx.revive));if(fx.surrender)p.push('Surrender chance '+pct(fx.surrender)+' for 20 s after arrival');return p.join(' · ')}

/* Ready-made renderer for glTF furniture (and anything else with a .model path): one shared offscreen WebGL renderer,
   3/4 view framed on the bounding box, warm studio light, transparent background. Usage (game has THREE + GLTFLoader):
     HT.Shop.thumbRenderer = HT.Shop.gltfThumbs(THREE, new THREE.GLTFLoader(), {base:''}) */
function gltfThumbs(THREE,loader,o){o=o||{};const W=o.width||320,Hh=o.height||200;let R=null,queue=Promise.resolve();
  const renderOne=url=>new Promise((res,rej)=>loader.load((o.base||'')+url,g=>{try{
    if(!R){R=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});R.setPixelRatio(o.pixelRatio||2);R.setSize(W,Hh);R.outputEncoding=THREE.sRGBEncoding;
      if(THREE.ACESFilmicToneMapping){R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.15}}
    const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight(0xfff4e0,0x6b5a48,1.05));const d=new THREE.DirectionalLight(0xffffff,1.6);d.position.set(3,5,4);sc.add(d);
    const d2=new THREE.DirectionalLight(0xbcd2ff,.5);d2.position.set(-4,2,-2);sc.add(d2);
    const obj=g.scene;sc.add(obj);const box=new THREE.Box3().setFromObject(obj),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
    const rad=Math.max(size.x,size.y*1.25,size.z)*.5||1;const cam=new THREE.PerspectiveCamera(28,W/Hh,.01,100);
    const dir=new THREE.Vector3(.75,.55,1).normalize();cam.position.copy(c).addScaledVector(dir,rad/Math.sin(THREE.MathUtils.degToRad(13))*(o.zoom||.86));cam.lookAt(c.x,c.y+size.y*.14,c.z);
    R.setClearColor(0x000000,0);R.clear();R.render(sc,cam);const url2=R.domElement.toDataURL('image/png');
    obj.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)[].concat(n.material).forEach(m=>{for(const k in m)if(m[k]&&m[k].isTexture)m[k].dispose();m.dispose()})});res(url2)}catch(e){rej(e)}},undefined,rej));
  return item=>{if(!item.model||(o.kinds&&!o.kinds.includes(item.kind)))return null;const p=queue.then(()=>renderOne(item.model));queue=p.catch(()=>{});return p}}
const Shop={thumbRenderer:null,sfx:null,gltfThumbs,
  isOpen:()=>!!(current&&current.type==='shop'),
  close:()=>{if(current&&current.type==='shop')current.close()},
  clearThumbCache:()=>thumbCache.clear(),
  open(opts){opts=opts||{};const store=STORES[opts.kind]?opts.kind:'dadazon',S0=STORES[store];
    const ui=shell({kind:store,logo:store,title:S0.name,sub:S0.sub,who:S0.who,tagline:S0.tag,cash:true});
    const m={type:'shop',store,ui,onClose:opts.onClose,onBuy:opts.onBuy,tab:null,sel:null,armed:null,armT:0,offs:[],sheet:false};
    const tabs=S0.tabs;
    ui.tabrow.innerHTML=tabs.map(([id,lab])=>`<button class="htm-tab" role="tab" data-act="tab" data-tab="${id}" aria-selected="false">${esc(lab)}<i></i></button>`).join('');
    const chips=()=>{const s=Save.data,c=[];
      if(store==='hardware'&&discountFor('hardware')>0)c.push('<span class="htm-hchip good">Neighbor discount −10%</span>');
      if(store==='hardware'&&discountFor('hardware')===0)c.push('<span class="htm-hchip">Neighbor discount at 60% trust</span>');
      if(store==='dadazon')c.push('<span class="htm-hchip good">Free shipping</span>');
      const pend=s.pending.length;if(pend&&store==='dadazon')c.push(`<span class="htm-hchip warn">${pend} order${pend>1?'s':''} on the way</span>`);
      ui.chips.innerHTML=c.join('')};
    m.refreshKeys=()=>{ui.keys.innerHTML=keysHTML([['↑↓←→','✥','Browse'],['Enter','Ⓐ',store==='dadazon'?'Order':'Buy'],['Q E','LB RB','Tabs'],['Esc','Ⓑ','Close']])};
    const tabCount=id=>shopEntries(store,id).filter(e=>status(e.kind,e.id,store).state==='buy').length;
    const renderTabs=()=>{for(const b of ui.tabrow.children){const on=b.dataset.tab===m.tab;b.classList.toggle('on',on);b.setAttribute('aria-selected',on);const n=tabCount(b.dataset.tab);b.querySelector('i').textContent=n||''}};
    const entries=()=>shopEntries(store,m.tab);
    const bay=store==='auto'?document.createElement('div'):null;
    if(bay){bay.className='htm-bay';ui.gridwrap.prepend(bay)}
    const renderBay=()=>{if(!bay)return;const vs=vehicleStats(),bars=vanBars(vs);const inst=VEH_ORDER.filter(k=>vs.levels[k]).map(k=>{const u=VEHICLE[k];return u.tiers.length>1?u.name+' '+vs.levels[k]:u.tiers[0].name});
      bay.innerHTML=`<div class="htm-bayvan">${vanFull(vs)}</div><div class="htm-baytx"><div class="htm-kicker">Your minivan · ${esc(vs.paint.name)}</div>
        <div class="htm-baybars">${bars.map(b=>`<div><span>${b.label}</span><i><b style="width:${b.v*10}%"></b></i></div>`).join('')}</div>
        <div class="htm-bayinst">${inst.length?inst.map(x=>`<em>${esc(x)}</em>`).join(''):'<em class="none">Bone stock. Like the day you drove it off the lot.</em>'}</div></div>`};
    m.renderGrid=(keepFocus)=>{renderBay();const list=entries();let html='',sec=null;
      for(const e of list){if(e.sec&&e.sec!==sec){sec=e.sec;html+=`<div class="htm-sec" role="presentation">${esc(sec)}</div>`}html+=shopTile(e,status(e.kind,e.id,store),e.key===m.sel)}
      const had=keepFocus&&document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.key;
      ui.grid.innerHTML=html;if(had){const el=ui.grid.querySelector(`[data-key="${had}"]`);if(el)el.focus({preventScroll:true})}renderTabs();chips()};
    m.renderDetail=()=>{const e=entries().find(x=>x.key===m.sel);if(!e){ui.detail.innerHTML='';return}
      const keepAct=document.activeElement&&ui.detail.contains(document.activeElement)?document.activeElement.dataset.act:null;
      ui.detail.innerHTML=shopDetail(m,e);if(keepAct){const b=ui.detail.querySelector(`[data-act="${keepAct}"]`);if(b)b.focus({preventScroll:true})}};
    m.select=(key,how)=>{if(m.sel===key&&how!=='force')return;m.sel=key;if(m.armed&&m.armed!==key)m.armed=null;
      for(const b of ui.grid.querySelectorAll('.htm-item'))b.classList.toggle('sel',b.dataset.key===key);m.renderDetail()};
    m.setTab=(id,dir)=>{if(m.tab===id)return;m.tab=id;m.armed=null;ui.el.dataset.tab=id;ui.gridwrap.scrollTop=0;m.renderGrid();
      const first=ui.grid.querySelector('.htm-item:not([data-state=locked])')||ui.grid.querySelector('.htm-item');
      if(first){m.select(first.dataset.key,'force');if(!narrow())focusEl(m,first,true)}m.sheetOpen(false);
      ui.grid.classList.remove('htm-swap','l','r');void ui.grid.offsetWidth;ui.grid.classList.add('htm-swap',dir<0?'l':'r')};
    m.sheetOpen=on=>{m.sheet=!!on&&narrow();ui.el.classList.toggle('sheet',m.sheet);ui.detail.toggleAttribute('inert',narrow()&&!m.sheet);
      if(m.sheet){const b=ui.detail.querySelector('[data-act=primary]');if(b)setTimeout(()=>b.focus({preventScroll:true}),30)}};
    m.focusItem=t=>{if(t.closest('.htm-grid'))m.select(t.dataset.key)};
    const curEntry=()=>entries().find(x=>x.key===m.sel);
    m.primary=(btn)=>{const e=curEntry();if(!e)return;const st=status(e.kind,e.id,store);
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
      if(st.kind==='cos'&&st.state==='owned'){const[g,o]=e.id.split(':');Save.data.vehicle[g]=o;Save.touch('vehicle');sfx('equip');if(g==='horn')playHorn(itemData('cos',e.id));m.renderGrid(true);m.renderDetail();return}
      sfx('error');shake(btn||ui.detail.querySelector('[data-act=primary]')||ui.detail);
      if(st.state==='poor')toast(m,'Not enough cash. Run a job, or rerun one for half pay.','bad');else if(st.state==='locked')toast(m,st.reason,'bad')};
    const thanks=e=>store==='auto'?pick(['Installed. Drives like a dream. A minivan dream.','The boys in Bay 2 say she purrs now.','Done. We also topped up your wiper fluid. On the house.']):
      pick(['Thanks for shopping local!','Bag? No? Good man.','Receipt is in the bag. Jen will find it.','Pleasure doing business, neighbor.']);
    m.input=(a,d)=>{const f=document.activeElement;
      if(a==='nav'){if(m.sheet&&!ui.detail.contains(f)){m.sheetOpen(false)}const scope=m.sheet?ui.detail:ui.el;const n=navMove(scope,d,scope.contains(f)?f:null);if(n)focusEl(m,n);return}
      if(a==='ok'){if(f&&f.dataset&&f.dataset.key){m.select(f.dataset.key);if(narrow()){m.sheetOpen(true);return}m.primary(f);return}if(f&&ui.el.contains(f)&&f.click){f.click();return}return}
      if(a==='back'){if(m.armed){m.armed=null;m.renderDetail();sfx('tick');return}if(m.sheet){m.sheetOpen(false);const t=ui.grid.querySelector(`[data-key="${m.sel}"]`);if(t)focusEl(m,t,true);return}m.close();return}
      if(a==='tabprev'||a==='tabnext'){const i=tabs.findIndex(t=>t[0]===m.tab),n=(i+(a==='tabnext'?1:-1)+tabs.length)%tabs.length;sfx('tab');m.setTab(tabs[n][0],a==='tabnext'?1:-1);return}
      if(a==='alt'){const s=ui.detail.querySelector('[data-act=sell]');if(s)s.click();return}
      if(a==='num'&&d<=tabs.length){sfx('tab');m.setTab(tabs[d-1][0],1)}};
    m.click=(t,ev)=>{const act=t.dataset.act;
      if(t.dataset.key&&!act){m.select(t.dataset.key);if(narrow())m.sheetOpen(true);else if(ev.detail>=2)m.primary(t);return}
      if(act==='close')return m.close();
      if(act==='tab'){sfx('tab');return m.setTab(t.dataset.tab,1)}
      if(act==='primary')return m.primary(t);
      if(act==='sheetclose')return m.sheetOpen(false);
      if(act==='honk'){const e=curEntry();playHorn(itemData('cos',e.id));return}
      if(act==='target'){const e=curEntry(),a=ATTACHMENTS[e.id],s=Save.data;const owned=a.compat.filter(g=>s.owned.guns.includes(g));const pool=owned.length?owned:a.compat;
        m.attTarget=pool[(pool.indexOf(m.attTarget)+1)%pool.length];sfx('toggle');m.renderDetail();return}
      if(act==='sell'){const e=curEntry();if(m.armed!=='sell:'+e.key){m.armed='sell:'+e.key;t.classList.add('armed');t.textContent='Sure? Sell for '+money(sellValue(e.kind,e.id));sfx('arm');return}
        m.armed=null;const r=sell(e.kind,e.id);if(r.ok){sfx('buy');floatText(m,t,'+'+money(r.amount),'earn');toast(m,'Sold. '+money(r.amount)+' back in your pocket.','good')}else{sfx('error');toast(m,r.reason,'bad')}
        m.renderGrid(true);m.renderDetail()}};
    m.offs.push(Save.on('cash',(v,old)=>{countTo(ui.cash,old==null?v:old,v,650);ui.cash.parentNode.classList.remove('bump','drop');void ui.cash.offsetWidth;ui.cash.parentNode.classList.add(old!=null&&v<old?'drop':'bump')}));
    runMenu(m);m.refreshKeys();
    const t0=tabs.find(t=>t[0]===opts.tab)?opts.tab:tabs[0][0];m.setTab(t0,1);
    if(opts.select){const k=opts.select.includes(':')?opts.select:null;if(k)m.select(k,'force')}
    if(narrow())ui.detail.setAttribute('inert','');
    return{close:()=>m.close(),el:ui.el,setTab:id=>m.setTab(id,1),select:k=>m.select(k,'force'),_m:m}}};
HT.Shop=Shop;

/* =====================================================================
   GUN LOCKER / WORKBENCH
   ===================================================================== */
function lockerTile(id,st,sel,tag){const g=GUNS[id];
  return`<button class="htm-item${sel?' sel':''}" data-nav data-key="gun:${id}" data-state="${st}" role="listitem" aria-label="${esc(g.name)}">
    <span class="htm-thumb t-gun">${thumbHTML('gun',id)}</span>
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
      slots.innerHTML=['side','p1','p2'].map((k,i)=>{const id=L[k];return`<button class="htm-slot${m.target===k?' tgt':''}" data-nav data-act="slot" data-slot="${k}" ${id?`data-key="gun:${id}"`:''}>
        <span class="htm-slotk"><kbd>${i+1}</kbd>${slotName[k]}</span>${id?`<span class="htm-slotimg">${thumbHTML('gun',id)}</span><b>${esc(GUNS[id].name)}</b>`:'<span class="htm-slotimg empty"></span><b class="empty">Empty</b>'}</button>`}).join('')+
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
        else{btns=['p1','p2'].map(k=>L[k]===id?`<button class="htm-btn off" data-nav data-act="noop" aria-disabled="true"><span>In ${slotName[k]}</span></button>`:`<button class="htm-btn${k===tgt?'':' alt'}" data-nav data-act="equip" data-slot="${k}"><span>${L[k]?'Swap into':'Put in'} ${slotName[k]}</span></button>`).join('');
          if(inSlot&&L.p2)btns+=`<button class="htm-ghost" data-nav data-act="swapp">⇅ Swap primaries</button>`;if(inSlot==='p2')btns+=`<button class="htm-ghost" data-nav data-act="unequip">Leave it home</button>`}}
      else{const a=gunAvail(id);const how=g.unlock.gift==='rick'?'Coach Rick has this one. Maybe he\'ll lend it.':a.collect?`Pick up ${a.collect.need} from thugs on jobs${g.price?' · or '+money(g.price)+' at Hank’s Hardware':''}`:g.price?money(g.price)+' at Hank’s Hardware or on Dadazon':'';
        btns=`<button class="htm-btn off" data-nav data-act="noop" aria-disabled="true"><span><i class="htm-lock"></i>Not in your locker</span></button>`+(a.collect?`<div class="htm-collect"><span>${esc(how)}</span><span class="htm-meter"><i style="width:${100*a.collect.n/a.collect.need}%"></i></span><b>${a.collect.n}/${a.collect.need}</b></div>`:`<div class="htm-note">${esc(how)}</div>`)}
      const mods=g.att.map(sl=>{const a=(s.attOn[id]||{})[sl];return a?`<i class="on">${esc(ATTACHMENTS[a].name)}</i>`:''}).join('');
      return`<div class="htm-hero t-gun"><div class="htm-heroimg">${thumbHTML('gun',id)}</div>${inSlot?`<span class="htm-stamp s-eq">${slotName[inSlot]}</span>`:''}</div>
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
      return`<div class="htm-hero t-gun"><div class="htm-heroimg">${thumbHTML('gun',id)}</div>${Object.values(on).some(Boolean)?`<div class="htm-heroatt">${Object.values(on).filter(Boolean).map(a=>`<span>${thumbHTML('att',a)}</span>`).join('')}</div>`:''}</div>
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
        <div class="htm-facts">${[['Rooftop cargo box',vs.spareMags?'+1 spare mag each':'Not installed · Dad’s Auto'],['Range Day Box',s.flags.rangeDay?'Packed: +1 mag each':'Not packed · Hank’s Hardware'],['Zip-ties',s.flags.zipPack?'Contractor pack: 25% faster':'Standard']].map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('')}</div></div>`};
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
    const equip=(slot,id)=>{const L0=Save.data.loadout,oth=slot==='p1'?'p2':slot==='p2'?'p1':null;
      const r=oth&&L0[oth]===id&&L0[slot]?swapPrimaries():setLoadout(slot,id);if(!r.ok){sfx('error');toast(m,r.reason,'bad');return false}m.target=slot;sfx('equip');toast(m,GUNS[id].name+' → '+slotName[slot],'good');changed();
      const sl=slots.querySelector(`[data-slot="${slot}"]`);if(sl){sl.classList.add('htm-pop');setTimeout(()=>sl.classList.remove('htm-pop'),600)}return true};
    m.input=(a,d)=>{const f=document.activeElement;
      if(a==='nav'){if(m.sheet&&!ui.detail.contains(f))m.sheetOpen(false);const scope=m.sheet?ui.detail:ui.el;const n=navMove(scope,d,scope.contains(f)?f:null);if(n)focusEl(m,n);return}
      if(a==='ok'){if(f&&f.dataset&&f.dataset.key&&f.closest('.htm-grid')){m.select(f.dataset.key);if(narrow()){m.sheetOpen(true);return}
          const id=f.dataset.key.split(':')[1];if(m.tab==='loadout'){const b=ui.detail.querySelector(`[data-act=equip][data-slot="${m.target}"]`)||ui.detail.querySelector('[data-act=equip]');if(b)return m.click(b,{});sfx('error');shake(f);return}
          const b=ui.detail.querySelector('[data-act=att]:not([disabled])');if(b)focusEl(m,b);else{sfx('error');shake(f)}return}
        if(f&&ui.el.contains(f)&&f.click)f.click();return}
      if(a==='back'){if(m.sheet){m.sheetOpen(false);return}m.close();return}
      if(a==='tabprev'||a==='tabnext'){const i=tabs.findIndex(t=>t[0]===m.tab),n=(i+(a==='tabnext'?1:-1)+tabs.length)%tabs.length;sfx('tab');m.setTab(tabs[n][0],a==='tabnext'?1:-1);return}
      if(a==='num'&&d<=3){const k=['side','p1','p2'][d-1];m.target=k;const id=Save.data.loadout[k];renderSlots();const sl=slots.querySelector(`[data-slot="${k}"]`);if(sl)focusEl(m,sl);if(id&&m.tab!=='ammo')m.select('gun:'+id,'force');return}
      if(a==='alt'){const b=ui.detail.querySelector('[data-act=swapp]');if(b)b.click()}};
    m.click=(t,ev)=>{const act=t.dataset.act;
      if(act==='close')return m.close();if(act==='tab'){sfx('tab');return m.setTab(t.dataset.tab,1)}
      if(act==='sheetclose')return m.sheetOpen(false);
      if(act==='slot'){m.target=t.dataset.slot;renderSlots();const nf=slots.querySelector(`[data-slot="${m.target}"]`);if(nf)nf.focus({preventScroll:true});
        if(t.dataset.key&&m.tab!=='ammo'){m.select(t.dataset.key,'force');if(narrow())m.sheetOpen(true)}else if(m.tab==='loadout'){const first=ui.grid.querySelector('.htm-item[data-state=owned]');if(first){m.select(first.dataset.key,'force');focusEl(m,first)}}sfx('toggle');return}
      if(t.dataset.key&&!act){m.select(t.dataset.key);if(narrow())m.sheetOpen(true);else if(ev.detail>=2){const b=ui.detail.querySelector(`[data-act=equip][data-slot="${m.target}"]`)||ui.detail.querySelector('[data-act=equip]');if(b)m.click(b,{})}return}
      if(act==='equip'){const id=m.sel.split(':')[1];equip(t.dataset.slot,id);return}
      if(act==='swapp'){swapPrimaries();sfx('equip');toast(m,'Primaries swapped','good');changed();return}
      if(act==='unequip'){setLoadout('p2',null);sfx('toggle');toast(m,'Leaving it in the locker','good');changed();return}
      if(act==='noop'){sfx('error');shake(t);return}
      if(act==='att'){const id=m.sel.split(':')[1],sl=t.dataset.slot,a=t.dataset.att||null;
        if(a&&!Save.data.owned.att.includes(a)){sfx('error');shake(t);toast(m,ATTACHMENTS[a].name+': '+money(ATTACHMENTS[a].price)+' at Hank’s Hardware or on Dadazon','bad');return}
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
    lines.map((l,i)=>`<div class="htp-line ${l.neg?'neg':''} k-${l.kind}" style="--i:${i}"><span class="htp-l">${esc(l.label)}${l.note?`<small>${esc(l.note)}</small>`:''}</span><i class="htp-dots"></i><b data-v="${p.lines[i].amount}">${instant?esc(l.text):(l.neg?'−$0':'+$0')}</b></div>`).join('')+
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
