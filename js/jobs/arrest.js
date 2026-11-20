/* =====================================================================
   HANDS OFF (SPEC3 2.19): capture alive in a crowd. Rosa's strand 2/2, Riverside Farmers' Market (site 'market'), Saturday morning.
   Somebody in a charity vest is collecting "for the garden" and keeping all of it. Four collectors work the market; one is the skimmer.
   Half 1, the detective work: keep a collector in the middle of your view to watch him (his tells only count while you watch:
   he pockets the bills instead of the tin, he swings wide around Rosa's real garden stall, he checks his phone when the duffel guy
   waves, his lanyard has no logo, his patter changes). Vendors gossip (E): two of them narrow it down by what he wears and carries.
   The notebook (top left) keeps it all. 3 s of watched tells and Rosa confirms; or point him out yourself (a wrong guess is a costly,
   funny mistake, not a fail).
   Half 2, the takedown: get him away from the crowd (a fake donation he follows you for, "your car's being towed", or Gary as a
   decoy), then ONE beanbag round. G or right-click toggles the draw; the ring goes green when nobody is within 2 m of the line of
   fire. A panic meter fills with everybody who can see the gun and everybody near the shot; 100 is a stampede. No drawing within
   25 m of a stroller or a kid (owner rule): the strollers keep to the west block, every ruse goes east.
   Then the twist: Gary gave his zip-ties to the kettle corn guy, so Rosa does it herself, and the duffel guy bolts on foot.
   Files: js/jobs/arrest.js (this), dev/jobs/arrest.js (real mouse/keyboard test), docs/screenshots/jobs/arrest/.
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
const AUD=()=>window.HT&&HT.Audio&&HT.Audio.ready?HT.Audio:null;
const FX=()=>window.HT&&HT.FX&&HT.FX.ready?HT.FX:null;
const PPL=()=>window.HT&&HT.People;

/* ---------------- tuning ---------------- */
const K={
  watchAng:.105,watchD:30,       /* a collector is "watched" inside ~6 degrees of the view centre, up to 30 m, in line of sight */
  idTell:3,                      /* seconds of watched tells that make Rosa sure (SPEC3) */
  lanyardD:6,lanyardT:1,         /* close enough to read a lanyard, and for how long */
  patterD:11,                    /* close enough to hear the pitch */
  pitchGap:[7,11],pitchT:4.6,    /* a collector between pitches, and one pitch */
  waveGap:[18,26],phoneT:2.4,    /* the duffel guy waves, the skimmer looks at his phone */
  alertT:35,                     /* after a wrong accusation the skimmer is careful (tells halved) */
  kidR:25,                       /* owner rule: no gun out within 25 m of a kid or a stroller */
  lineR:2,lineBeyond:6,          /* crowd-safe: nobody within 2 m of the line of fire (and 6 m past him) */
  seeR:22,                       /* who can see the gun */
  panicSee:5.5,panicNear:7,panicShot:30,panicHear:10,panicDecay:6,panicCap:42,
  shotR:34,spread:.0035,moveSpread:.016,capR:.3,
  follow:{gap:1.7,lose:16,loseT:5,max:60},
  towWait:16,garyWait:24,
  dufSpeed:4.5,dufTackle:1.5,dufLost:44,
  runSpeed:4.4,runTackle:1.5,runLost:48,runMax:40};
const WEST_X=374;/* strollers and kids stay west of here */

/* ---------------- the market plan (world metres; Main St x 350-408, the road z 40-46, sidewalks z 38-40 and 46-48) ---------------- */
const AISLE={x0:353,x1:405,z0:41.4,z1:44.8};
const STALLS=[
  {id:'apples', side:'n',x:355.2,name:'ORCHARD ROW',     board:['APPLES','3 lb · $5','PEARS $2/lb'],  goods:'apples', cloth:0,awn:0},
  {id:'peach',  side:'n',x:365.4,name:'PEACH PIT',       board:['PEACHES','4 for $3','ripe today!'],  goods:'peach',  cloth:1,awn:1,clue:'carry'},
  {id:'kettle', side:'n',x:370.6,name:'KETTLE CORN',     board:['KETTLE','CORN','bag $5'],           goods:'kettle', cloth:2,awn:2},
  {id:'flowers',side:'n',x:358.9,name:'BLOOMS',          board:['TULIPS','$8 bunch','2 for $15'],    goods:'flowers',cloth:0,awn:3,clue:'tip'},
  {id:'bread',  side:'n',x:398.4,name:'RISE & SHINE',    board:['SOURDOUGH','$7','rolls 6/$4'],      goods:'bread',  cloth:1,awn:0},
  {id:'tamale', side:'n',x:403.6,name:'TAMALES',         board:['TAMALES','6 for $10','pork · bean'],goods:'tamale', cloth:2,awn:1},
  {id:'eggs',   side:'s',x:356.2,name:'GREENS & EGGS',   board:['EGGS','dozen $6','KALE $3'],        goods:'eggs',   cloth:2,awn:2},
  {id:'garden', side:'s',x:366.0,name:'RIVERSIDE COMMUNITY GARDEN',board:['SEEDLINGS','$2 each','ask Rosa'],goods:'garden',cloth:0,awn:1,rosa:true},
  {id:'honey',  side:'s',x:373.4,name:'BUZZ OFF HONEY',  board:['RAW HONEY','jar $8','comb $12'],    goods:'honey',  cloth:1,awn:3,clue:'hat'},
  {id:'tomato', side:'s',x:390.0,name:'TOMATO TOMATO',   board:['HEIRLOOM','TOMATOES','$4/lb'],      goods:'tomato', cloth:2,awn:0},
  {id:'candle', side:'s',x:396.0,name:'WICK & CO',       board:['CANDLES','$6','3 for $15'],         goods:'candle', cloth:0,awn:2},
  {id:'lemon',  side:'s',x:402.0,name:'LEMONADE',        board:['LEMONADE','$2 cup','fresh!'],       goods:'lemon',  cloth:1,awn:1}];
const stallZ=s=>s.side==='n'?39.4:46.6;                /* the stall's origin; its counter faces the aisle */
const front=s=>({x:s.x,z:s.side==='n'?41.25:44.95});  /* where a shopper stands to browse */
const vendorAt=s=>({x:s.x+(s.rosa?-.6:0),z:s.side==='n'?38.75:47.25});
const ROSA_STALL=STALLS.find(s=>s.rosa);let ROSA_FRONT=front(ROSA_STALL);
const BUSKER={x:383.7,z:39.05,yaw:2.6};
const GARY_SPOT={x:372.9,z:41.9};
const DUFFEL={x:406.4,z:39.1};
const CAR={x:401.2,z:13.3,yaw:Math.PI/2};             /* the skimmers' hatchback: up 4th St and round the corner, behind the court */
const TOW_SPOT={x:401.4,z:15.3};
const GARY_SPOT2={x:411.2,z:60.5};                    /* "my chequebook's in the car": the bins down 4th St */
const ROUTE_N=[{x:405.5,z:43},{x:410.8,z:41.5},{x:410.8,z:16.2},{x:405,z:15.6},TOW_SPOT];
const ROUTE_S=[{x:405.5,z:43.2},{x:410.8,z:45.5},{x:410.8,z:54},GARY_SPOT2];
const ESCAPES=[{x:410.8,z:6,via:[{x:410.8,z:41.5}]},{x:410.8,z:70,via:[{x:410.8,z:45.5}]},{x:379,z:70,via:[{x:379,z:46.5}]}];

/* ---------------- the cast ---------------- */
/* four collectors: what they look like is fixed; which one is the skimmer is drawn per run. Vendor gossip splits them by hat and by what they carry. */
const COLS=[
  {id:'lime',  vest:'#b9e23f',trim:'#f4f6ef',label:'Lime vest',  hat:'cap',   hatCol:'#26375e',carry:'clip',charity:'the Rotary Club',      logo:'#1f4fa0',logoTxt:'ROTARY',
    real:["Rotary Club! Twenty years on this corner!","Rotary! Youth league uniforms!","Every dollar to the youth league. Rotary!"],cleared:"I'm with the Rotary Club. I've been with them twenty years."},
  {id:'orange',vest:'#ff8a2a',trim:'#f4f6ef',label:'Orange vest',hat:null,    carry:'clip',charity:'the Friends of the Library',logo:'#2f7a46',logoTxt:'LIBRARY',
    real:["Friends of the Library! New picture books!","Library fund! Story time needs chairs!","Books for the branch! Every little bit!"],cleared:"Friends of the Library, sir. We do a bake sale too. You'd remember the bake sale."},
  {id:'sky',   vest:'#56b8ec',trim:'#f4f6ef',label:'Blue vest',  hat:'cap',   hatCol:'#7a1f2a',carry:'tin', charity:'the Paws & Claws shelter',logo:'#c2482b',logoTxt:'PAWS',
    real:["Paws and Claws! Kibble for the kennels!","For the shelter dogs! Look at this face!","Paws and Claws! Every dollar feeds a dog!"],cleared:"Paws and Claws. There's a photo of Biscuit on the tin. Biscuit is real."},
  {id:'violet',vest:'#a072dc',trim:'#f4f6ef',label:'Purple vest',hat:'bucket',hatCol:'#d9cfb1',carry:'tin', charity:'the Riverside Scouts',   logo:'#7a5a1f',logoTxt:'SCOUTS',
    real:["Riverside Scouts! Camp fund!","Scouts! New tents this year!","Scout camp! Every dollar a marshmallow!"],cleared:"Riverside Scouts. I'm a den leader. I have a whistle. I've never needed the whistle."}];
const SKIM_LINES=["For the garden! Every dollar goes to the garden! Mostly.","For the library! Kids need... books!","For the kids! The kids, generally!","Community fund! Very official!","For the garden! The big one. With plants."];
/* the neighbour pool (SPEC3: casts come from HT.People's mixed pools; no one is marked out by who they are, only by what they do) */
const ADULTS=['nb_pops','nb_office','nb_sweater','nb_kenji','nb_marcus','nb_mei','nb_lucia','nb_gran','nb_teen'];
const CAST_KEYS=ADULTS.concat(['nb_kid','rosa','dad_gary']);
const VENDOR_NAMES={apples:'Mr. Okoro',peach:'Peach Lady',kettle:'Kettle Corn Guy',flowers:'Flower Stand',bread:'Baker',tamale:'Tamale Lady',eggs:'Egg Stand',honey:'Honey Lady',tomato:'Tomato Guy',candle:'Candle Stand',lemon:'Lemonade Kid'};

const LINES={
  rosaBrief:[["rosa","Strollers. Toddlers. Mr. Ferreira with his cane. If this turns into a stampede I'm going to be very calm and very angry."],
    ["rosa","Four people in vests with tins and clipboards. One of them is collecting 'for the garden'. I AM the garden. I don't have collectors."],
    ["rosa","Here. Notebook. Watch his hands. Charity people don't put the money in their own pocket. That's the whole job."]],
  rosaWatchTip:"Look right at one of them. Keep him in the middle of your view and you'll see what his hands do.",
  rosaWatchGood:"Good. That's watching. Now find the one who's wrong.",
  rosaGossip:"The vendors see everything. Ask around. Press E at a stall.",
  rosaConfirm:["That's him. I saw it too.","That's our guy. I'd know that pocket anywhere.","Him. Absolutely him."],
  rosaAside:"Don't you dare draw on him here. There are strollers. Get him somewhere quiet. East end. Talk to him.",
  rosaQuiet:"Nobody near him. Strollers are way behind you. Draw. G. Wait for green.",
  rosaGreen:["Green reticle. Nobody behind him. Now. Not 'in a second'. Now.","Green. Now.","That's clear. Take it."],
  rosaRed:["Red. There's somebody behind him. Move.","Not with her behind him. Step left.","Crowd behind him. Find an angle."],
  rosaKids:["Stroller. Twenty metres. Not a chance.","There are kids right there. Put that away.","No. Kids. Further east."],
  rosaPanic:["People are looking. Holster it.","They've seen it. Put it away before somebody screams.","Too many eyes. Away. Now."],
  wrong:[["you","Excuse me, sir—"],["you","...Great work. Love the Rotary."]],
  hit:["OOF. Okay, wow, okay.","OW. That's a— that's a beanbag. Okay. I'm sitting down.","Hhhk. Fine. FINE. I'm down."],
  missRun:["Nope! Nope nope!","Not today, dad!","You MISSED! Ha— ow, my knee—"],
  crowdGasp:["Is that a— is that a gun?","Oh my god, he's got a—","Honey. Honey, walk.","Why does that man have a gun at a farmers' market?","Is this a movie?"],
  crowdShot:["Did that man just get shot with a beanbag?","He was skimming the garden money.","...Good shot.","I've been saying that vest was fake for weeks."],
  crowdClap:["Whoo!","Got 'im!","That's the guy who sold me a 'donation receipt'!","Rosa! Rosa, I KNEW it!"],
  tieTwist:[["gary","Okay. Zip-ties. Zip-ties, zip-ties..."],["gary","I gave my zip-ties to the kettle corn guy. He needed to close a bag. It was a big bag."],
    ["rosa","Move."],["rosa","Hands behind your back. You know the drill. Or you're about to."]],
  dufBolt:[["Duffel guy","Oh no. Nope. Not my circus!"],["rosa","Duffel! He's running! You're out of beans. Use your legs. Dad legs."]],
  dufDrop:["He dropped the duffel. Too heavy to run with. Amateur.","He ditched the duffel! That's the stolen tools. Evidence, gift-wrapped."],
  dufCaught:["Okay! OKAY! I just carry the bag!","I'm out of breath. You're out of breath. Let's both just stop."],
  dufGone:"He's gone round the corner. He's on foot, he left the bag, and the whole street saw his face. Let him go.",
  win:[["rosa","Every dollar. Back to the actual garden. Mateo is buying a second pumpkin."],["Market lady","That was the most exciting thing that's ever happened at this market. Including the goat."],
    ["gary","I got my zip-ties back. They smell like kettle corn now. That's fine."]],
  garyIdle:["This kettle corn is, and I mean this, life-changing.","Do you think they'd give me the recipe? I'd sign something.","I'm on lookout. Lookout with corn."],
  garyDecoy:[["gary","Excuse me! Is this for the garden? I'd like to donate. A lot. It's a cheque. It's a big cheque."],["gary","It's in my car. Round the corner. Walk with me. I'll tell you about my car."]],
  garyMove:"Oh! Right. Me. I'm in the way. Moving!",
  donate:[["you","I'd like to make a donation. A big one. Not in front of everybody, though."],["Skimmer","...Say no more. Lead the way, friend."]],
  tow:[["you","Hey, is that your hatchback on 4th? They're towing it."],["Skimmer","They're WHAT?"]],
  towNone:["Where's the tow truck? There's no tow truck.","Why would you say there's a tow truck?"],
  followTalk:["So. This donation.","Big donation, you said.","We're walking a lot for a donation.","Is it in your car? It's fine if it's in your car."],
  followQuit:"You know what? Keep it. I'll be at the market.",
  fail:{panic:"The market emptied in about four seconds. Nobody was hurt. Somebody lost a shoe. Rosa is very calm and very angry.",
    civ:"You hit a shopper with a beanbag. She's fine. She's furious. Rosa has her on an ice pack and you on a long look.",
    gary:"You beanbagged Gary. Gary is fine. Gary is lying on the sidewalk saying 'I'm fine' in a voice that is not fine.",
    escape:"He got away round the corner with the tin. Rosa says the garden will survive. Rosa says it through her teeth."}};

/* ---------------- small helpers ---------------- */
const pick=a=>a[Math.floor(Math.random()*a.length)];
const rr=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const hyp=(x,z)=>Math.hypot(x,z);
const yawTo=(dx,dz)=>Math.atan2(-dx,-dz);/* the game's yaw: 0 faces -z */
function angWrap(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a}
function H(){return M_()&&M_().ho}
function M_(){const a=A();return a&&a.M&&a.M.def&&a.M.def.id==='arrest'?a.M:null}
function say(who,text,front){const a=A();try{a.radio(who,text,front)}catch(_){}}
function later(sec,fn,tag){const O=H();if(!O)return;O.later.push({t:O.clock+sec,fn,tag})}
/* a beat's pending lines are dropped when the beat is over (a takedown cancels the ruse's small talk) */
function cancel(O,tag){O.later=O.later.filter(x=>x.tag!==tag)}
function laterStep(O){if(!O.later.length)return;const due=O.later.filter(x=>x.t<=O.clock);if(!due.length)return;O.later=O.later.filter(x=>x.t>O.clock);
  for(const x of due){try{x.fn()}catch(e){console.warn('[arrest] timer',e)}}}
function seq(list,gap,start,tag){let t=start||0;for(const[w,x]of list){later(t,()=>say(w,x,true),tag);t+=gap||2.6}return t}
function music(state,int){const Au=AUD();try{Au&&Au.music&&Au.music(state,{intensity:int})}catch(_){}}
function tone(o){const Au=AUD();if(!Au||!Au.tone)return;try{Au.tone(o)}catch(_){}}
function pose(d,dt,o){try{A().pose(d,dt,o||{})}catch(_){}}
function touch(){try{return matchMedia('(pointer:coarse)').matches&&!!document.querySelector('.ht-touch')}catch(_){return false}}
const KEY_E=()=>touch()?'USE':'E';

/* ---------------- disposables: everything this job builds is freed at cleanup ---------------- */
function own(O,x){O.own.push(x);return x}
function stdMat(O,col,o){const a=A();return own(O,new a.THREE.MeshStandardMaterial(Object.assign({color:a.lin(col),roughness:.8,metalness:0},o||{})))}
function canvasTex(O,w,h,draw){const T=A().THREE,c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);if(T.sRGBEncoding)t.encoding=T.sRGBEncoding;t.anisotropy=4;return own(O,t)}
/* merge simple parts: textured or see-through materials keep a mesh each; every plain-coloured part goes into ONE vertex-coloured mesh.
   parts: [{geo, mat, x,y,z, rx,ry,rz, sx,sy,sz, uv:[u0,v0,u1,v1]}] */
function mergeParts(O,parts,parent,opt){const T=A().THREE,byMat=new Map();opt=opt||{};O=opt.O||O||H();
  for(const p of parts){const g=p.geo.clone();if(p.uv){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,p.uv[0]+uv.getX(i)*(p.uv[2]-p.uv[0]),p.uv[1]+uv.getY(i)*(p.uv[3]-p.uv[1]))}
    const m4=new T.Matrix4().compose(new T.Vector3(p.x||0,p.y||0,p.z||0),new T.Quaternion().setFromEuler(new T.Euler(p.rx||0,p.ry||0,p.rz||0,'YXZ')),new T.Vector3(p.sx||1,p.sy||1,p.sz||1));
    g.applyMatrix4(m4);const gi=g.index?g.toNonIndexed():g;if(gi!==g)g.dispose();const plain=!p.mat.map&&!p.mat.transparent&&p.mat.side!==T.DoubleSide;
    if(plain){const c=p.mat.color,col=new Float32Array(gi.attributes.position.count*3);for(let i=0;i<col.length;i+=3){col[i]=c.r;col[i+1]=c.g;col[i+2]=c.b}gi.setAttribute('color',new T.BufferAttribute(col,3))}
    const key=plain?'vc':p.mat;(byMat.get(key)||byMat.set(key,[]).get(key)).push(gi)}
  const out=[];for(const[k,gs]of byMat){let n=0;for(const g of gs)n+=g.attributes.position.count;const vc=k==='vc';const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2),C=vc?new Float32Array(n*3):null;let i=0;
    for(const g of gs){P.set(g.attributes.position.array,i*3);if(g.attributes.normal)N.set(g.attributes.normal.array,i*3);if(g.attributes.uv)U.set(g.attributes.uv.array,i*2);if(C)C.set(g.attributes.color.array,i*3);i+=g.attributes.position.count;g.dispose()}
    const bg=new T.BufferGeometry();bg.setAttribute('position',new T.BufferAttribute(P,3));bg.setAttribute('normal',new T.BufferAttribute(N,3));bg.setAttribute('uv',new T.BufferAttribute(U,2));if(C)bg.setAttribute('color',new T.BufferAttribute(C,3));bg.computeBoundingSphere();own(O,bg);
    const m=vc?(O.vcStall||(O.vcStall=own(O,new T.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.04})))):k;
    const mesh=new T.Mesh(bg,m);mesh.castShadow=opt.shadow!==false&&!m.transparent;mesh.receiveShadow=true;mesh.userData.ho=1;parent.add(mesh);out.push(mesh)}
  return out}

/* ---------------- the market dressing (built once per run, merged by material: a few draw calls for forty-odd props) ---------------- */
/* one text atlas for every banner, chalkboard and sign: 4 x 8 cells of 256 x 128 */
function atlas(O){const cells=[];const add=(kind,lines,o)=>{cells.push({kind,lines,o:o||{}});return cells.length-1};
  for(const s of STALLS){s.banCell=add('banner',[s.name],{bg:s.rosa?'#2f6b3a':['#f4ecd8','#fbe3c2','#e8f1e0','#f6e0e6'][s.awn],fg:s.rosa?'#f4efe2':'#3a2a1c'});s.boardCell=add('chalk',s.board)}
  O.cellClosed=add('banner',['ROAD CLOSED','FARMERS’ MARKET TODAY'],{bg:'#f4f1e6',fg:'#b23a1e',two:true});
  O.cellBusk=add('card',['SONGS','4 TIPS'],{bg:'#d8c29a',fg:'#2a2a2a'});
  O.cellMarket=add('banner',["RIVERSIDE FARMERS’ MARKET",'SATURDAYS · 8 TO 1'],{bg:'#2e5e8a',fg:'#fff3d6',two:true});
  O.cellJar=add('card',['GARDEN','FUND'],{bg:'#f4efe2',fg:'#2f6b3a'});
  const tex=canvasTex(O,1024,1024,(g,W,Hh)=>{cells.forEach((c,i)=>{const x=(i%4)*256,y=Math.floor(i/4)*128;g.save();g.beginPath();g.rect(x,y,256,128);g.clip();
      if(c.kind==='chalk'){g.fillStyle='#1f2a24';g.fillRect(x,y,256,128);for(let k=0;k<70;k++){g.fillStyle='rgba(255,255,255,'+(.015+Math.random()*.03)+')';g.fillRect(x+Math.random()*256,y+Math.random()*128,Math.random()*30,1+Math.random()*2)}
        const cols=['#f6f1d8','#ffd96b','#ff9f8a'];c.lines.forEach((t,k)=>{g.fillStyle=cols[k%3];g.font=(k===0?'bold italic 34px':'italic 26px')+' Georgia, serif';g.textAlign='center';g.textBaseline='middle';g.fillText(t,x+128,y+30+k*36)});
        g.strokeStyle='#8a6a44';g.lineWidth=8;g.strokeRect(x+4,y+4,248,120)}
      else{g.fillStyle=c.o.bg;g.fillRect(x,y,256,128);g.fillStyle=c.o.fg;g.textAlign='center';g.textBaseline='middle';
        if(c.o.two||c.lines.length>1){g.font='bold 30px sans-serif';fit(g,c.lines[0],240,30,'bold');g.fillText(c.lines[0],x+128,y+44);g.font='bold 22px sans-serif';fit(g,c.lines[1],240,22,'bold');g.fillText(c.lines[1],x+128,y+88)}
        else{fit(g,c.lines[0],236,46,'bold');g.fillText(c.lines[0],x+128,y+66)}
        g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=4;g.strokeRect(x+3,y+3,250,122)}
      g.restore()})});
  O.atlas=stdMat(O,'#ffffff',{map:tex,roughness:.85});O.atlas.color.setRGB(1,1,1);
  return i=>{const u0=(i%4)/4,v1=1-Math.floor(i/4)/8;return[u0+.004,v1-1/8+.006,u0+.25-.004,v1-.006]}}
function fit(g,t,w,px,wt){let s=px;g.font=wt+' '+s+'px sans-serif';while(g.measureText(t).width>w&&s>10){s-=2;g.font=wt+' '+s+'px sans-serif'}}
function stripes(O,a,b){return canvasTex(O,128,64,(g,W,Hh)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?b:a;g.fillRect(i*16,0,16,Hh)}g.fillStyle='rgba(0,0,0,.06)';for(let i=0;i<8;i++)g.fillRect(i*16+15,0,1,Hh)})}
/* the stalls dodge the street trees: the open world plants them in sidewalk pits by a hash of the tile (js/openworld.js streetLife),
   so the same hash finds them here; a stall on a pit slides along the kerb to the nearest clear spot */
let LAID=false;
function layoutStalls(){if(LAID)return;const a=A(),W=a.WORLD;if(!W||!W.map)return;LAID=true;const h=(x,z)=>((x*73856093)^(z*19349663))>>>0,map=W.map,TILE=2,tc=t=>t*TILE+1;
  const trees=[];for(const z of[19,23])for(let x=172;x<=206;x++){if(map[z][x]!=='s'||h(x,z)%7!==0)continue;let lamp=false;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(map[z+dz]&&map[z+dz][x+dx]==='l')lamp=true;if(lamp)continue;
    const dz=z===19?1:-1;trees.push({x:tc(x),z:tc(z)+dz*.45,side:z===19?'n':'s'})}
  const lamps=(W.lamps||[]).filter(l=>l.z>36&&l.z<50),porches=(W.porches||[]).filter(p=>p.z>45&&p.z<49);
  const ok=(s,x)=>{if(x-1.8<AISLE.x0-2.6||x+1.8>AISLE.x1+2.6)return false;if(x+1.8>375.6&&x-1.8<382.4)return false;/* 3rd St stays open */
    for(const t of trees)if(t.side===s.side&&Math.abs(t.x-x)<2.2)return false;for(const l of lamps)if((l.z<43)===(s.side==='n')&&Math.abs(l.x-x)<2)return false;
    if(s.side==='s')for(const p of porches)if(Math.abs(p.x-x)<2.2)return false;for(const o of STALLS)if(o!==s&&o.side===s.side&&o.placed&&Math.abs(o.x-x)<3.7)return false;return true};
  for(const s of STALLS){if(ok(s,s.x)){s.placed=true;continue}for(let k=1;k<=16;k++){const d=Math.ceil(k/2)*.4*(k%2?1:-1);if(ok(s,s.x+d)){s.x=+(s.x+d).toFixed(2);break}}s.placed=true}
  ROSA_FRONT=front(ROSA_STALL);stallBoxes()}
function buildMarket(O){const a=A(),T=a.THREE,g=new T.Group();g.name='handsOffMarket';a.wmAdd(g);O.g=g;
  const G={box:own(O,new T.BoxGeometry(1,1,1)),cyl:own(O,new T.CylinderGeometry(1,1,1,12)),cyl6:own(O,new T.CylinderGeometry(1,1,1,6)),sph:own(O,new T.SphereGeometry(1,8,6)),
    plane:own(O,new T.PlaneGeometry(1,1)),cone:own(O,new T.ConeGeometry(1,1,6))};O.G=G;
  const m={wood:stdMat(O,'#8a6440',{roughness:.9}),woodD:stdMat(O,'#5e4128',{roughness:.9}),crate:stdMat(O,'#b48a58',{roughness:.95}),metal:stdMat(O,'#b9bec4',{roughness:.4,metalness:.6}),
    dark:stdMat(O,'#26282b',{roughness:.6}),white:stdMat(O,'#f2efe6'),
    cloth:['#efe6d2','#3f6d8e','#c9543c'].map(c=>stdMat(O,c,{roughness:.95})),
    awn:[['#ffffff','#d23c32'],['#ffffff','#2f8a5a'],['#ffffff','#2c6ab0'],['#ffffff','#e8a52a']].map(([p,q])=>stdMat(O,'#ffffff',{map:stripes(O,p,q),roughness:.9})),
    red:stdMat(O,'#c8322a',{roughness:.55}),green:stdMat(O,'#6aa83a',{roughness:.6}),orange:stdMat(O,'#f08a3a',{roughness:.6}),peach:stdMat(O,'#f4a07a',{roughness:.7}),
    yellow:stdMat(O,'#f2d23a',{roughness:.55}),pink:stdMat(O,'#e8709a',{roughness:.7}),leaf:stdMat(O,'#3f7a36',{roughness:.85}),bread:stdMat(O,'#c58a4a',{roughness:.9}),
    honey:stdMat(O,'#d98a1a',{roughness:.25}),gold:stdMat(O,'#d8b44a',{roughness:.35,metalness:.6}),terra:stdMat(O,'#b8643a',{roughness:.9}),pumpkin:stdMat(O,'#e8782a',{roughness:.7}),
    egg:stdMat(O,'#f3e9d6',{roughness:.8}),carton:stdMat(O,'#a8a296',{roughness:1}),foil:stdMat(O,'#d6d9dc',{roughness:.3,metalness:.7}),
    candle:['#f2e6c8','#c94a4a','#5a8ac2','#8ac25a'].map(c=>stdMat(O,c,{roughness:.6})),lemonade:stdMat(O,'#f6e27a',{roughness:.15,transparent:true,opacity:.82}),
    sawW:stdMat(O,'#f4f1e6'),sawO:stdMat(O,'#e8641e'),cord:stdMat(O,'#ece6d4',{roughness:1}),
    flag:['#d23c32','#f2c230','#2f8a5a','#2c6ab0','#f4f1e6','#e8709a'].map(c=>stdMat(O,c,{roughness:.9,side:T.DoubleSide}))};
  O.mats=m;const uvOf=atlas(O);const parts=[];
  /* a part in a stall's frame: local x along the counter, local z toward the aisle */
  const P_=(s,geo,mat,lx,y,lz,sx,sy,sz,o)=>{const yaw=s.side==='n'?0:Math.PI,c=Math.cos(yaw),sn=Math.sin(yaw);const x=s.x+lx*c+lz*sn,z=stallZ(s)-lx*sn+lz*c;
    parts.push(Object.assign({geo,mat,x,y,z,sx,sy,sz,ry:yaw},o||{}))};
  const fruit=(s,mat,cx,cz,r,n,y0,spread)=>{for(let i=0;i<n;i++){const ang=i*2.4,rad=Math.sqrt(i/n)*spread;P_(s,G.sph,mat,cx+Math.cos(ang)*rad*1.3,y0+r*.85+(i%3)*.012,cz+Math.sin(ang)*rad*.75,r,r*.92,r)}};
  const crate=(s,lx,lz,y)=>{P_(s,G.box,m.crate,lx,y+.09,lz,.5,.18,.36);P_(s,G.box,m.woodD,lx,y+.185,lz,.52,.012,.38)};
  for(const s of STALLS){
    /* frame: four poles, a striped canopy with a valance, a cloth-draped table */
    for(const[px,pz]of[[-1.62,-1.05],[1.62,-1.05],[-1.62,1.02],[1.62,1.02]])P_(s,G.cyl,m.metal,px,1.36,pz,.025,2.72,.025);
    P_(s,G.box,m.awn[s.awn],0,2.76,0,3.46,.05,2.26,{rx:-.07});
    P_(s,G.box,m.awn[s.awn],0,2.56,1.1,3.46,.28,.025);P_(s,G.box,m.awn[s.awn],-1.72,2.62,0,.025,.2,2.2);P_(s,G.box,m.awn[s.awn],1.72,2.62,0,.025,.2,2.2);
    P_(s,G.box,m.wood,0,.8,.25,3.0,.05,.86);P_(s,G.box,m.cloth[s.cloth],0,.55,.69,3.02,.5,.02);P_(s,G.box,m.cloth[s.cloth],-1.5,.55,.25,.02,.5,.88);P_(s,G.box,m.cloth[s.cloth],1.5,.55,.25,.02,.5,.88);
    P_(s,G.box,m.cloth[s.cloth],0,.815,.25,3.04,.012,.9);
    for(const lx of[-1.42,1.42])P_(s,G.box,m.woodD,lx,.4,-.12,.05,.8,.05);
    /* the name banner hangs off the valance, readable from the aisle */
    P_(s,G.plane,O.atlas,0,2.24,1.125,s.rosa?2.9:2.2,s.rosa?.46:.42,1,{uv:uvOf(s.banCell)});
    /* a chalkboard A-frame at the aisle edge */
    const bx=s.rosa?-1.05:1.05;P_(s,G.box,m.woodD,bx,.42,1.5,.56,.84,.03,{rx:-.18});P_(s,G.plane,O.atlas,bx,.44,1.522,.5,.36,1,{uv:uvOf(s.boardCell),rx:-.18});
    P_(s,G.box,m.woodD,bx,.42,1.32,.56,.84,.03,{rx:.18});
    /* stock under and beside the table */
    crate(s,-1.15,-.55,0);crate(s,-1.15,-.55,.19);crate(s,1.2,-.6,0);
    goods(s,P_,fruit,crate,G,m)}
  /* closures at both ends: sawhorses with a gap in the middle for people on foot */
  for(const c of[{x:351.2,yaw:1},{x:406.8,yaw:-1}]){for(const z of[40.9,45.1]){const s={x:c.x,side:'n'};const add=(geo,mat,x,y,z_,sx,sy,sz,o)=>parts.push(Object.assign({geo,mat,x,y,z:z_,sx,sy,sz,ry:Math.PI/2},o||{}));
      for(const k of[0,1])add(G.box,k?m.sawO:m.sawW,c.x,.82-k*.001,z+(k?-.3:.3)*0+(k?.0:0),2.0,.16,.04,{});for(let i=0;i<5;i++)add(G.box,m.sawO,c.x+.025,.82,z-.8+i*.4,.012,.16,.18);
      for(const dz of[-.9,.9])for(const dx of[-.18,.18])add(G.box,m.woodD,c.x+dx,.4,z+dz,.04,.82,.06,{rz:dx*.6});
      add(G.plane,O.atlas,c.x+.03*c.yaw,1.28,z,1.6,.8,1,{uv:uvOf(O.cellClosed),ry:c.yaw>0?Math.PI/2:-Math.PI/2});add(G.cyl,m.woodD,c.x,1.0,z-.7,.02,.6,.02);add(G.cyl,m.woodD,c.x,1.0,z+.7,.02,.6,.02);
      a.wmCol({x0:c.x-.2,z0:z-1,x1:c.x+.2,z1:z+1,h:1.2})}}
  /* a market banner over the crossing at 3rd */
  parts.push({geo:G.plane,mat:O.atlas,x:379,y:4.3,z:39.2,sx:5.2,sy:1.3,sz:1,uv:uvOf(O.cellMarket)});parts.push({geo:G.plane,mat:O.atlas,x:379,y:4.3,z:39.19,sx:5.2,sy:1.3,sz:1,ry:Math.PI,uv:uvOf(O.cellMarket)});
  for(const x of[376.2,381.8])parts.push({geo:G.cyl,mat:m.metal,x,y:2.5,z:39.2,sx:.05,sy:5,sz:.05});
  /* bunting: sagging strings across the street, triangle flags every 42 cm */
  const tri=own(O,new T.BufferGeometry());tri.setAttribute('position',new T.BufferAttribute(new Float32Array([-.13,0,0,.13,0,0,0,-.3,0]),3));tri.setAttribute('normal',new T.BufferAttribute(new Float32Array([0,0,1,0,0,1,0,0,1]),3));tri.setAttribute('uv',new T.BufferAttribute(new Float32Array([0,1,1,1,.5,0]),2));
  let fk=0;for(const[xn,xs]of[[361.2,362.8],[368,370],[386,386],[392.2,392.9],[401,404.4]]){const x0=xn,x1=xs,z0=39.85,z1=46.15,y0=4.1,n=Math.floor(hyp(x1-x0,z1-z0)/.42);
    for(let i=0;i<=n;i++){const t=i/n,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t,y=y0-Math.sin(t*Math.PI)*.6;const ry=Math.atan2(x1-x0,z1-z0)+Math.PI/2;
      if(i<n)parts.push({geo:G.cyl6,mat:m.cord,x:x+(x1-x0)/n/2,y:y-.04,z:z+(z1-z0)/n/2,sx:.008,sy:.43,sz:.008,rx:Math.PI/2,ry:ry-Math.PI/2});
      parts.push({geo:tri,mat:m.flag[(fk++)%m.flag.length],x,y,z,ry})}
    for(const[x,z]of[[x0,z0],[x1,z1]]){parts.push({geo:G.cyl,mat:m.metal,x,y:2.07,z,sx:.04,sy:4.14,sz:.04});parts.push({geo:G.cyl,mat:m.woodD,x,y:.1,z,sx:.14,sy:.2,sz:.14})}}
  /* the busker's corner: a crate, an open guitar case, a cardboard sign */
  const bk=BUSKER;parts.push({geo:G.box,mat:m.crate,x:bk.x,y:.22,z:bk.z-.1,sx:.46,sy:.44,sz:.36});
  parts.push({geo:G.box,mat:m.dark,x:bk.x-.55,y:.05,z:bk.z+.75,sx:.42,sy:.1,sz:1.0,ry:bk.yaw});parts.push({geo:G.box,mat:m.cloth[2],x:bk.x-.55,y:.1,z:bk.z+.75,sx:.36,sy:.02,sz:.92,ry:bk.yaw});
  for(let i=0;i<7;i++)parts.push({geo:G.cyl,mat:m.gold,x:bk.x-.55+rr(-.12,.12),y:.115,z:bk.z+.75+rr(-.3,.3),sx:.012,sy:.004,sz:.012});
  parts.push({geo:G.plane,mat:O.atlas,x:bk.x-.55,y:.3,z:bk.z+1.28,sx:.4,sy:.2,sz:1,ry:bk.yaw,rx:-.5,uv:uvOf(O.cellBusk)});
  /* Rosa's real fund: a big glass jar on her counter */
  const rs=ROSA_STALL;P_(rs,G.cyl,m.lemonade,.95,.98,.35,.11,.32,.11,{});P_(rs,G.plane,O.atlas,.95,.98,.465,.18,.09,1,{uv:uvOf(O.cellJar)});
  for(let i=0;i<6;i++)P_(rs,G.box,m.green,.95+rr(-.05,.05),.86+i*.035,.35+rr(-.04,.04),.12,.02,.06,{ry:rr(0,3)});
  mergeParts(O,parts,g,{O});
  for(const s of STALLS){const z=stallZ(s),z0=s.side==='n'?z-.25:z-.69,z1=s.side==='n'?z+.69:z+.25;a.wmCol({x0:s.x-1.52,z0,x1:s.x+1.52,z1,h:.95})}
  /* the hatchback round the corner (part of the tow ruse) */
  const car=a.makeVehicle('hatch','#7d2f2f')||a.makeVanBox('#7d2f2f');car.position.set(CAR.x,a.groundAt(CAR.x,CAR.z),CAR.z);car.rotation.y=CAR.yaw+Math.PI/2;a.wmAdd(car,true);O.car=car;
  a.wmCol({x0:CAR.x-.95,z0:CAR.z-2.1,x1:CAR.x+.95,z1:CAR.z+2.1,h:1.4})}
function nearLamp(x,z){const W=A().WORLD;return(W.lamps||[]).some(l=>hyp(l.x-x,l.z-z)<.8)}
function goods(s,P_,fruit,crate,G,m){
  const T2=(lx,lz)=>crate(s,lx,lz,.83);
  switch(s.goods){
    case'apples':for(const[lx,mat]of[[-.9,m.red],[-.3,m.green],[.3,m.red],[.9,m.yellow]]){T2(lx,.25);fruit(s,mat,lx,.25,.045,16,1.0,.16)}break;
    case'peach':for(const lx of[-.9,-.3,.3,.9]){T2(lx,.25);fruit(s,m.peach,lx,.25,.05,14,1.0,.16)}break;
    case'kettle':P_(s,G.cyl,m.dark,-.9,1.12,.2,.34,.42,.34);P_(s,G.cyl,m.metal,-.9,1.34,.2,.36,.03,.36);fruit(s,m.egg,-.9,.2,.03,22,1.3,.24);
      for(let i=0;i<8;i++)P_(s,G.box,m.white,.05+i*.16,1.0,.3,.12,.3,.07,{ry:(i%2-.5)*.1});break;
    case'flowers':for(let b=0;b<5;b++){const lx=-1.1+b*.55;P_(s,G.cyl,m.metal,lx,.98,.3,.13,.3,.13);for(let i=0;i<7;i++){const fx=lx+rr(-.08,.08),fz=.3+rr(-.08,.08);P_(s,G.cyl6,m.leaf,fx,1.28,fz,.008,.42,.008);P_(s,G.sph,[m.red,m.yellow,m.pink,m.peach,m.white][b],fx,1.5,fz,.05,.04,.05)}}break;
    case'bread':for(let i=0;i<9;i++)P_(s,G.sph,m.bread,-1.1+(i%5)*.52,.9,.12+Math.floor(i/5)*.3,.18,.08,.09,{ry:rr(-.3,.3)});P_(s,G.box,m.crate,.95,.9,.3,.6,.12,.4);fruit(s,m.bread,.95,.3,.04,12,.92,.18);break;
    case'tamale':for(const lx of[-.85,-.2])P_(s,G.cyl,m.foil,lx,1.05,.25,.2,.42,.2);for(let i=0;i<3;i++)P_(s,G.box,m.foil,.4+i*.32,.85,.3,.26,.04,.2);break;
    case'eggs':for(let i=0;i<6;i++){P_(s,G.box,m.carton,-1.1+i*.32,.87,.3,.28,.07,.14);fruit(s,m.egg,-1.1+i*.32,.3,.025,6,.88,.05)}fruit(s,m.leaf,.9,.25,.06,10,.83,.2);break;
    case'garden':for(let i=0;i<12;i++){const lx=-1.2+(i%6)*.32,lz=.1+Math.floor(i/6)*.3;P_(s,G.cyl,m.terra,lx,.89,lz,.07,.12,.07);P_(s,G.sph,m.leaf,lx,1.0,lz,.08,.07,.08)}
      for(const[lx,lz,r]of[[-1.2,1.3,.24],[-.7,1.4,.18],[1.35,1.25,.21]]){P_(s,G.sph,m.pumpkin,lx,r*.8,lz,r,r*.8,r);P_(s,G.cyl6,m.leaf,lx,r*1.55,lz,.025,.08,.025)}break;
    case'honey':for(let i=0;i<10;i++){const lx=-1.15+(i%5)*.3,lz=.15+Math.floor(i/5)*.28;P_(s,G.cyl,m.honey,lx,.93,lz,.06,.16,.06);P_(s,G.cyl,m.gold,lx,1.02,lz,.062,.025,.062)}P_(s,G.box,m.honey,.9,.9,.3,.36,.1,.24);break;
    case'tomato':for(const lx of[-.9,-.3,.3,.9]){T2(lx,.25);fruit(s,lx>0?m.red:m.orange,lx,.25,.055,12,1.0,.16)}break;
    case'candle':for(let i=0;i<16;i++){const lx=-1.2+(i%8)*.32,lz=.12+Math.floor(i/8)*.3,h=.12+(i*7%5)*.04;P_(s,G.cyl,m.candle[i%4],lx,.83+h/2,lz,.05,h,.05)}break;
    case'lemon':P_(s,G.cyl,m.lemonade,-.8,1.1,.25,.17,.5,.17);P_(s,G.cyl,m.metal,-.8,1.37,.25,.18,.04,.18);for(let i=0;i<8;i++)P_(s,G.cyl,m.white,-.2+(i%4)*.14,.89,.2+Math.floor(i/4)*.16,.04,.1,.035);fruit(s,m.yellow,.9,.25,.045,14,.83,.2);break}}

/* ---------------- people: props on bones ---------------- */
/* hand props: rocketbox bones live in their own scale, so the prop's scale undoes it (as in overwatch.js) */
/* hand props, upright in the character's own frame at spawn (front = +z): off = [x,y,z] from the palm in that frame, then rx,ry,rz */
/* a part made with mesh() keeps its size in its scale: it rides inside a group so the attach can set the group's scale */
function wrap(obj){if(!obj.isMesh)return obj;const g=new (A().THREE.Group)();g.add(obj);return g}
function toHandUp(d,obj,side,off){obj=wrap(obj);const T=A().THREE,b=d&&d.rb&&d.rb.bones&&d.rb.bones[side==='L'?'Bip01_L_Hand':'Bip01_R_Hand'];off=off||[0,0,0];
  if(!b){obj.position.set(side==='L'?.25:-.25,.85,.05);d.root.add(obj);return obj}
  d.root.updateMatrixWorld(true);const bp=new T.Vector3().setFromMatrixPosition(b.matrixWorld);const rq=new T.Quaternion(),rs=new T.Vector3();d.root.getWorldQuaternion(rq);d.root.getWorldScale(rs);
  bp.add(new T.Vector3(off[0],off[1],off[2]).multiply(rs).applyQuaternion(rq));const q=rq.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(off[3]||0,off[4]||0,off[5]||0)));
  const want=new T.Matrix4().compose(bp,q,rs);const loc=new T.Matrix4().copy(b.matrixWorld).invert().multiply(want);loc.decompose(obj.position,obj.quaternion,obj.scale);b.add(obj);return obj}
function toHand(d,obj,side,off){obj=wrap(obj);const rb=d&&d.rb,b=rb&&rb.bones&&rb.bones[side==='L'?'Bip01_L_Hand':'Bip01_R_Hand'];
  if(!b){if(d&&d.root){obj.position.set(side==='L'?.25:-.25,.9,.1);d.root.add(obj)}return obj}
  b.updateMatrixWorld(true);const s=new (A().THREE.Vector3)();b.getWorldScale(s);const k=1/(s.x||1);obj.scale.multiplyScalar(k*(d.root.scale.x||1));
  if(off){obj.position.set(off[0]*k,off[1]*k,off[2]*k);if(off[3]!=null)obj.rotation.set(off[3],off[4]||0,off[5]||0)}b.add(obj);return obj}
/* body props (vests, lanyards, hats): parented to a bone but built upright in the character's own frame (front = +z), measured at spawn */
function toBody(d,bone,obj,off){obj=wrap(obj);const T=A().THREE,b=d&&d.rb&&d.rb.bones&&d.rb.bones[bone];
  if(!b){obj.position.set(off[0],off[1]+(bone==='Bip01_Head'?1.62:1.25),off[2]);d.root.add(obj);return obj}
  d.root.updateMatrixWorld(true);const bp=new T.Vector3().setFromMatrixPosition(b.matrixWorld);const rq=new T.Quaternion(),rs=new T.Vector3();d.root.getWorldQuaternion(rq);d.root.getWorldScale(rs);
  bp.add(new T.Vector3(off[0],off[1],off[2]).multiply(rs).applyQuaternion(rq));const want=new T.Matrix4().compose(bp,rq,rs);
  const loc=new T.Matrix4().copy(b.matrixWorld).invert().multiply(want);loc.decompose(obj.position,obj.quaternion,obj.scale);b.add(obj);return obj}
function propKit(O){if(O.kit)return O.kit;const a=A(),T=a.THREE,G=O.G,m=O.mats;const K_={};
  K_.vestGeo=own(O,new T.CylinderGeometry(.165,.185,.44,16,1,true));K_.bandGeo=own(O,new T.CylinderGeometry(.168,.178,.05,16,1,true));
  K_.vest={};for(const c of COLS)K_.vest[c.id]=stdMat(O,c.vest,{roughness:.7,side:T.DoubleSide,emissive:new T.Color(c.vest).multiplyScalar(.08)});
  K_.refl=stdMat(O,'#e9eef0',{roughness:.25,metalness:.3,side:T.DoubleSide});
  K_.card=stdMat(O,'#f7f7f2');K_.strap=stdMat(O,'#202a3a');K_.logo={};for(const c of COLS)K_.logo[c.id]=stdMat(O,c.logo);
  K_.hat={};for(const c of COLS)if(c.hat)K_.hat[c.id]=stdMat(O,c.hatCol,{roughness:.9});
  K_.paper=stdMat(O,'#fbfaf4');K_.board=stdMat(O,'#8a5a2e');K_.tin={};for(const c of COLS)K_.tin[c.id]=stdMat(O,c.vest,{roughness:.35,metalness:.4});
  K_.bill=stdMat(O,'#8fbf7a',{side:T.DoubleSide});K_.phone=stdMat(O,'#16181b');K_.screen=own(O,new T.MeshBasicMaterial({color:0x9fd0ff}));
  K_.wicker=stdMat(O,'#b88a4e',{roughness:1});K_.tote=['#e8dcc2','#6b8f5a','#c46a4a','#3f6d8e'].map(c=>stdMat(O,c,{roughness:1}));
  K_.duffel=stdMat(O,'#2e3b2a',{roughness:.9});K_.guitar=stdMat(O,'#b06a2a',{roughness:.35});K_.neck=stdMat(O,'#3a2516');K_.pram=stdMat(O,'#3f5a7a',{roughness:.8});K_.pram2=stdMat(O,'#7a3f5a',{roughness:.8});
  K_.apron=['#2f5e4a','#7a3f2f','#3f4f7a','#5a5a5a'].map(c=>stdMat(O,c,{roughness:.95,side:T.DoubleSide}));K_.cane=stdMat(O,'#4a2f1c');
  K_.apronGeo=own(O,new T.CylinderGeometry(.19,.22,.5,10,1,true,-1.1,2.2));
  return O.kit=K_}
/* a prop built from parts becomes one mesh: vertex colours from each part's material, one shared material, cached per kind */
function bake(O,g,key,shadow){const T=A().THREE;let geo=key&&O.baked&&O.baked[key];
  if(!geo){g.updateMatrixWorld(true);const inv=new T.Matrix4().copy(g.matrixWorld).invert();const parts=[];
    g.traverse(m=>{if(!m.isMesh)return;const c=m.material&&m.material.color||new T.Color(1,1,1);const q=m.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inv,m.matrixWorld));const n=q.index?q.toNonIndexed():q;if(n!==q)q.dispose();
      const col=new Float32Array(n.attributes.position.count*3);for(let i=0;i<col.length;i+=3){col[i]=c.r;col[i+1]=c.g;col[i+2]=c.b}n.setAttribute('color',new T.BufferAttribute(col,3));parts.push(n)});
    let cnt=0;for(const q of parts)cnt+=q.attributes.position.count;const P=new Float32Array(cnt*3),N=new Float32Array(cnt*3),C=new Float32Array(cnt*3);let k=0;
    for(const q of parts){P.set(q.attributes.position.array,k*3);N.set(q.attributes.normal.array,k*3);C.set(q.attributes.color.array,k*3);k+=q.attributes.position.count;q.dispose()}
    geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(P,3));geo.setAttribute('normal',new T.BufferAttribute(N,3));geo.setAttribute('color',new T.BufferAttribute(C,3));geo.computeBoundingSphere();own(O,geo);
    if(key)(O.baked||(O.baked={}))[key]=geo}
  if(!O.vcMat)O.vcMat=own(O,new T.MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:.05,side:T.DoubleSide}));
  const out=new T.Group();const m=new T.Mesh(geo,O.vcMat);m.castShadow=!!shadow;m.receiveShadow=false;m.userData.ho=1;out.add(m);return out}
const mesh=(geo,mat,x,y,z,sx,sy,sz,rx,ry,rz)=>{const T=A().THREE,o=new T.Mesh(geo,mat);o.position.set(x||0,y||0,z||0);o.scale.set(sx||1,sy||1,sz||1);o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=true;o.userData.ho=1;return o};
function vest(O,d,c,skim){const K_=propKit(O),T=A().THREE,g=new T.Group();
  const v=mesh(K_.vestGeo,K_.vest[c.id],0,0,0,1.06,1,.8);g.add(v);g.add(mesh(K_.bandGeo,K_.refl,0,-.08,0,1.07,1,.81));g.add(mesh(K_.bandGeo,K_.refl,0,.06,0,1.07,1,.81));
  /* the lanyard: a strap V and a card. Real collectors' cards carry their charity's logo; his is blank */
  const card=new T.Group();card.position.set(0,.02,.162);card.add(mesh(O.G.box,K_.card,0,0,0,.07,.095,.006));if(!skim)card.add(mesh(O.G.box,K_.logo[c.id],0,.012,.004,.05,.04,.003));
  else card.add(mesh(O.G.box,K_.card,0,0,.003,.05,.01,.002));g.add(card);
  for(const s of[-1,1])g.add(mesh(O.G.box,K_.strap,s*.045,.12,.15,.012,.2,.004,0,0,s*.35));
  toBody(d,'Bip01_Spine2',bake(O,g,'vest'+c.id+(skim?'s':'')),[0,-.06,0]);return g}
function hat(O,d,c){const K_=propKit(O),T=A().THREE,g=new T.Group();if(!c.hat)return null;const m=K_.hat[c.id];
  if(c.hat==='cap'){g.add(mesh(O.G.sph,m,0,0,0,.115,.075,.122));g.add(mesh(O.G.cyl,m,0,-.01,.1,.09,.012,.08))}
  else{g.add(mesh(O.G.cyl,m,0,.01,0,.105,.08,.11));g.add(mesh(O.G.cyl,m,0,-.03,0,.17,.012,.17))}
  toBody(d,'Bip01_Head',bake(O,g,'hat'+c.id),[0,.13,.0]);return g}
function clipboard(O){const K_=propKit(O),T=A().THREE,g=new T.Group();g.add(mesh(O.G.box,K_.board,0,0,0,.23,.31,.012));g.add(mesh(O.G.box,K_.paper,0,-.01,.008,.2,.25,.003));g.add(mesh(O.G.box,O.mats.metal,0,.14,.01,.08,.03,.012));return bake(O,g,'clip')}
function tin(O,c){const K_=propKit(O),T=A().THREE,g=new T.Group();g.add(mesh(O.G.cyl,K_.tin[c.id],0,0,0,.065,.16,.065));g.add(mesh(O.G.cyl,O.mats.metal,0,.082,0,.067,.008,.067));g.add(mesh(O.G.box,K_.card,0,0,.064,.06,.07,.003));return bake(O,g,'tin'+c.id)}
function billMesh(O){return mesh(O.G.box,propKit(O).bill,0,0,0,.075,.004,.035)}
function phoneMesh(O){const K_=propKit(O),T=A().THREE,g=new T.Group();g.add(mesh(O.G.box,K_.phone,0,0,0,.07,.14,.01));const s=mesh(O.G.plane,K_.screen,0,0,.006,.06,.12,1);s.castShadow=false;g.add(s);return g}
function basket(O){const K_=propKit(O),T=A().THREE,g=new T.Group();g.add(mesh(O.G.cyl,K_.wicker,0,-.27,0,.15,.15,.1));g.add(mesh(O.G.sph,O.mats.red,-.05,-.18,0,.04,.04,.04));g.add(mesh(O.G.sph,O.mats.leaf,.05,-.18,.02,.055,.05,.055));
  const h=mesh(O.G.box,K_.wicker,0,-.1,0,.015,.2,.015);g.add(h);return bake(O,g,'basket')}
function tote(O){const K_=propKit(O),g=new (A().THREE.Group)(),i=Math.floor(Math.random()*K_.tote.length);g.add(mesh(O.G.box,K_.tote[i],0,-.24,0,.3,.34,.06));g.add(mesh(O.G.cyl6,O.mats.leaf,.06,-.02,0,.01,.22,.01));return bake(O,g,'tote'+i)}
function apron(O,d){const K_=propKit(O),g=new (A().THREE.Group)();const m=mesh(K_.apronGeo,pick(K_.apron),0,0,0,1.05,1,.85);m.castShadow=false;g.add(m);toBody(d,'Bip01_Spine',g,[0,-.08,.0]);return g}
function stroller(O,alt){const K_=propKit(O),T=A().THREE,g=new T.Group(),m=O.mats.metal,fab=alt?K_.pram2:K_.pram;
  g.add(mesh(O.G.box,fab,0,.62,0,.42,.26,.66));g.add(mesh(new T.CylinderGeometry(.23,.23,.42,12,1,false,0,Math.PI),fab,0,.75,-.18,1,1,1,0,0,Math.PI/2));
  for(const s of[-1,1]){g.add(mesh(O.G.cyl,m,s*.2,.6,.36,.012,.62,.012,-.5));g.add(mesh(O.G.cyl,m,s*.2,.38,0,.012,.8,.012,Math.PI/2));
    for(const z of[-.28,.3]){const w=mesh(O.G.cyl,O.mats.dark,s*.22,.11,z,.11,.04,.11,0,0,Math.PI/2);g.add(w)}}
  g.add(mesh(O.G.cyl,O.mats.dark,0,.86,.5,.014,.44,.014,0,0,Math.PI/2));const half=g.children[1].geometry;const b=bake(O,g,'pram'+(alt?1:0),true);half.dispose();A().wmAdd(b);return b}
function duffelMesh(O){const K_=propKit(O),g=new (A().THREE.Group)();g.add(mesh(O.G.cyl,K_.duffel,0,.18,0,.18,.62,.18,0,0,Math.PI/2));g.add(mesh(O.G.box,O.mats.dark,0,.37,0,.32,.02,.04));
  g.add(mesh(O.G.box,O.mats.metal,.12,.3,.17,.05,.04,.02));return bake(O,g,'duffel',true)}
function guitar(O){const K_=propKit(O),T=A().THREE,g=new T.Group();g.add(mesh(O.G.cyl,K_.guitar,0,0,0,.18,.08,.22,Math.PI/2));g.add(mesh(O.G.cyl,K_.guitar,0,.0,-.2,.14,.07,.16,Math.PI/2));
  g.add(mesh(O.G.cyl,O.mats.dark,0,.041,.02,.045,.003,.045,Math.PI/2));g.add(mesh(O.G.box,K_.neck,0,0,.42,.05,.025,.5));return bake(O,g,'guitar')}

/* ---------------- people: spawning, walking, the crowd ---------------- */
function loadedKeys(){const pp=PPL();return ADULTS.filter(k=>pp&&pp.has&&pp.has(k))}
function castReady(){const pp=PPL();if(!pp||!pp.ok)return true;/* the box-dude fallback world: nothing to wait for */return loadedKeys().length>=4}
function preload(){const pp=PPL();if(!pp||!pp.ok||!pp.preload)return Promise.resolve();const want=CAST_KEYS.filter(k=>pp.keys.includes(k)&&!pp.has(k));
  return want.length?pp.preload(want).catch(()=>{}):Promise.resolve()}
let BAG=[];function nextKey(no){const ks=loadedKeys().filter(k=>!no||!no.includes(k));if(!ks.length)return null;if(!BAG.length)BAG=ks.slice().sort(()=>Math.random()-.5);const k=BAG.pop();return ks.includes(k)?k:ks[0]}
function person(O,o){const a=A();let d=null;
  if(o.giver)d=a.makeDude({giver:o.giver});else if(o.homie)d=a.makeDude(a.HOMIES[o.homie]);
  else{const key=o.key||nextKey();d=a.makeDude({role:'neighbour',variant:key,shirt:'#888',pants:'#444'})}
  a.equip(d,null);a.wmAdd(d.root);const p=Object.assign({d,x:o.x,z:o.z,yaw:o.yaw||0,vx:0,vz:0,st:'idle',t:0,speed:1.2,moving:false,mode:'stand',fear:0,said:0,h:1.75*(d.root.scale.x||1)},o);
  d.root.position.set(p.x,0,p.z);d.root.rotation.y=p.yaw+Math.PI;O.people.push(p);return p}
function spawnCrowd(O){const a=A();O.people=O.people||[];
  /* vendors behind their counters (Rosa runs the garden stall) */
  for(const s of STALLS){if(s.rosa)continue;const v=vendorAt(s);const p=person(O,{kind:'vendor',x:v.x,z:v.z,yaw:s.side==='n'?Math.PI:0,stall:s,name:VENDOR_NAMES[s.id]||'Vendor'});apron(O,p.d);p.home={x:v.x,z:v.z,yaw:p.yaw}}
  /* Rosa, Gary, the busker */
  const rv=vendorAt(ROSA_STALL);O.rosa=person(O,{kind:'rosa',giver:'rosa',x:rv.x,z:rv.z,yaw:0,name:'Rosa'});O.rosa.home={x:rv.x,z:rv.z,yaw:0};
  O.gary=person(O,{kind:'gary',homie:'gary',x:GARY_SPOT.x,z:GARY_SPOT.z,yaw:0,name:'Gary'});O.gary.home={x:GARY_SPOT.x,z:GARY_SPOT.z,yaw:0};
  const pop=propKit(O)&&mesh(O.G.box,O.mats.white,0,0,0,.11,.2,.07);pop.castShadow=false;O.gary.pop=toHandUp(O.gary.d,pop,'L',[0,.03,.06]);
  O.busk=person(O,{kind:'busker',x:BUSKER.x,z:BUSKER.z,yaw:BUSKER.yaw,mode:'sit'});const gt=guitar(O);toBody(O.busk.d,'Bip01_Spine1',gt,[.02,-.12,.22]);gt.rotation.z+=.0;O.busk.guitar=gt;
  /* the collectors: one of them is the skimmer (O.skim), drawn at the start */
  O.cols=COLS.map((c,i)=>{const sp=AISLE.x0+6+i*13;const p=person(O,{kind:'col',col:c,i,x:sp,z:rr(41.8,44.4),yaw:rr(-3,3),speed:1.15,name:c.label});
    p.skim=i===O.skim;p.tells={pocket:0,rosa:0,phone:0,lanyard:0,patter:0};p.heard=[];p.next=rr(2,6);p.tell=null;vest(O,p.d,c,p.skim);hat(O,p.d,c);
    const prop=c.carry==='tin'?tin(O,c):clipboard(O);toHandUp(p.d,prop,'L',c.carry==='tin'?[0,-.02,.05]:[0,.02,.07,-.35,0,0]);p.prop=prop;
    if(c.carry==='clip'){const t2=tin(O,c);t2.scale.multiplyScalar(.8);toHandUp(p.d,t2,'R',[0,-.03,.04]);p.tinR=t2}
    return p});
  /* shoppers: families with strollers and kids keep to the west block; everyone else wanders the whole market */
  const westStalls=STALLS.filter(s=>s.x<WEST_X),allStalls=STALLS;
  for(let i=0;i<2;i++){const s=westStalls[i*2],f=front(s);const par=person(O,{kind:'shop',x:f.x+rr(-1,1),z:43,yaw:rr(-3,3),west:true,speed:.85,stroller:stroller(O,i)});par.kidSafe=true}
  for(let i=0;i<2;i++){const s=westStalls[1+i*2],f=front(s);const par=person(O,{kind:'shop',x:f.x+1,z:43.2,west:true,speed:.95});
    const kid=person(O,{kind:'kid',key:'nb_kid',x:f.x+1.6,z:43.8,west:true,speed:1.1,follow:par});par.kid=kid}
  const ferr=person(O,{kind:'shop',key:'nb_pops',x:362,z:43.4,speed:.7,name:'Mr. Ferreira'});const cn=mesh(O.G.cyl6,propKit(O).cane,0,-.43,0,.013,.86,.013);cn.castShadow=false;toHandUp(ferr.d,cn,'R',[0,0,.06,.12,0,0]);
  for(let i=0;i<15;i++){const s=pick(allStalls),f=front(s);const p=person(O,{kind:'shop',x:clamp(f.x+rr(-1.4,1.4),AISLE.x0,AISLE.x1),z:rr(41.6,44.6),yaw:rr(-3,3),speed:rr(1,1.3)});
    const r=Math.random();if(r<.4)toHandUp(p.d,basket(O),'L',[0,.13,.03]);else if(r<.7)toHandUp(p.d,tote(O),'R',[0,.14,.0])}
  /* the duffel guy: a real (unarmed) street-crew member from the game's mixed pool, held still by a script until he bolts */
  const e=a.spawnEnemy(DUFFEL.x,DUFFEL.z,false);a.equip(e.dude,null);e.gun=null;e.noLeash=true;e.script={kind:'handsoff'};e.yaw=Math.PI*.85;if(e.tag){e.tag.remove();e.tag=null}e.hp=e.maxhp=60;
  const bag=duffelMesh(O);a.wmAdd(bag);bag.position.set(DUFFEL.x+.55,0,DUFFEL.z+.2);bag.rotation.y=.3;O.duf={e,bag,st:'post',waveT:rr(...K.waveGap),t:0};a.rebuildTargets();
  for(const p of O.people)if(p.kind==='shop'||p.kind==='kid'){p.st='browse';p.t=rr(0,4);p.stall=nearestStall(p)}
  O.spawned=true}
function nearestStall(p){let b=null,bd=1e9;for(const s of STALLS){if(p.west&&s.x>=WEST_X)continue;const f=front(s),d=hyp(f.x-p.x,f.z-p.z);if(d<bd){bd=d;b=s}}return b}
/* a step toward (x,z): separation from everybody nearby and the dad, kept on walkable ground */
function stepTo(O,p,x,z,sp,dt,stop){const dx=x-p.x,dz=z-p.z,d=hyp(dx,dz);if(d<(stop||.25)){p.moving=false;return true}
  let vx=dx/d*sp,vz=dz/d*sp;const P=A().P;
  for(const q of O.people){if(q===p||q.gone)continue;const ox=p.x-q.x,oz=p.z-q.z,od=ox*ox+oz*oz;if(od>.64||od<1e-6)continue;const l=Math.sqrt(od),f=(.8-l)/.8*1.8;vx+=ox/l*f;vz+=oz/l*f}
  {const ox=p.x-P.pos.x,oz=p.z-P.pos.z,l=hyp(ox,oz);if(l<.95&&l>1e-3){const f=(.95-l)/.95*2.4;vx+=ox/l*f;vz+=oz/l*f}}
  const l=hyp(vx,vz),cap=sp*1.15;if(l>cap){vx*=cap/l;vz*=cap/l}
  const nx=p.x+vx*dt,nz=p.z+vz*dt,a=A();if(a.walkable(a.tx(nx),a.tx(nz))){p.x=nx;p.z=nz}
  p.yaw=turn(p.yaw,yawTo(dx,dz),dt*6);p.moving=true;p.spd=sp;return false}
function turn(y,want,k){const d=angWrap(want-y);return y+clamp(d,-k,k)}
function face(p,x,z,dt){p.yaw=turn(p.yaw,yawTo(x-p.x,z-p.z),dt*5)}
function place(p,dt){if(p.gone)return;const r=p.d.root,a=A();r.position.set(p.x,a.groundAt(p.x,p.z),p.z);r.rotation.y=p.yaw+Math.PI;
  pose(p.d,dt,{moving:p.moving,speed:Math.max(.7,(p.spd||1)/1.15),aim:false,mode:p.mode||'stand'});p.moving=false;
  if(p.stroller){const f={x:-Math.sin(p.yaw),z:-Math.cos(p.yaw)};p.stroller.position.set(p.x+f.x*.75,a.groundAt(p.x,p.z),p.z+f.z*.75);p.stroller.rotation.y=p.yaw}}
/* the crowd's routine: browse a stall, walk to another; strollers and kids stay west; scared people stop, stare, back away, run */
function crowdStep(O,dt){const a=A(),P=a.P;
  for(const p of O.people){if(p.kind!=='shop'&&p.kind!=='kid')continue;p.t-=dt;
    if(p.kind==='kid'&&p.follow&&p.st!=='flee'&&p.st!=='look'){const f=p.follow,side={x:Math.cos(f.yaw)*.8,z:-Math.sin(f.yaw)*.8};if(hyp(f.x+side.x-p.x,f.z+side.z-p.z)>.5)stepTo(O,p,f.x+side.x,f.z+side.z,Math.max(1,f.spd||1)*1.1,dt,.4);else face(p,f.x-Math.sin(f.yaw)*3,f.z-Math.cos(f.yaw)*3,dt);continue}
    if(p.st==='browse'){const s=p.stall;if(s){const f=front(s);face(p,s.x+(p.off||0),stallZ(s),dt)}if(p.t<=0){p.st='walk';p.stall=pickStall(p);const f=front(p.stall);p.tx=clamp(f.x+rr(-1.2,1.2),AISLE.x0,AISLE.x1);p.tz=f.z+(p.stall.side==='n'?rr(0,.5):-rr(0,.5));p.off=p.tx-p.stall.x}}
    else if(p.st==='walk'){if(stepTo(O,p,p.tx,p.tz,p.speed,dt,.3)){p.st='browse';p.t=rr(4,11);if(Math.random()<.35)vendorServe(O,p.stall)}}
    else if(p.st==='pitched'){if(p.by)face(p,p.by.x,p.by.z,dt);if(p.t<=0)p.st='browse'}
    else if(p.st==='look'){face(p,P.pos.x,P.pos.z,dt);if(p.t<=0){p.st=O.drawn?'back':'browse';p.t=rr(2,4)}}
    else if(p.st==='back'){const ax=p.x-P.pos.x,az=p.z-P.pos.z,l=hyp(ax,az)||1;stepTo(O,p,p.x+ax/l*2,clamp(p.z+az/l*2,AISLE.z0,AISLE.z1),.9,dt);p.yaw=turn(p.yaw,yawTo(-ax,-az),dt*6);if(p.t<=0&&!O.drawn)p.st='browse'}
    else if(p.st==='flee'){if(stepTo(O,p,p.tx,p.tz,3.6,dt,.6)){p.st='cower';p.t=rr(5,9)}}
    else if(p.st==='cower'){face(p,P.pos.x,P.pos.z,dt);p.mode=p.kind==='kid'?'stand':'stand';if(p.t<=0&&O.panic<30){p.st='walk';p.stall=pickStall(p);const f=front(p.stall);p.tx=f.x;p.tz=f.z}}
    else if(p.st==='gather'){if(p.tx!=null&&stepTo(O,p,p.tx,p.tz,1.1,dt,.5))p.tx=null;if(p.tx==null&&O.down)face(p,O.down.x,O.down.z,dt)}}}
function pickStall(p){const list=STALLS.filter(s=>(!p.west||s.x<WEST_X)&&s!==p.stall);return pick(list)}
function vendorServe(O,s){const v=O.people.find(q=>q.kind==='vendor'&&q.stall===s);if(v&&!v.busy){v.busy=2.5;try{PPL().interact&&PPL().interact(v.d)}catch(_){}}}
function vendorStep(O,dt){const a=A(),P=a.P;for(const v of O.people){if(v.kind!=='vendor'&&v.kind!=='rosa')continue;if(v.busy>0)v.busy-=dt;if(v.away)continue;
    const near=O.people.find(q=>(q.kind==='shop')&&q.st==='browse'&&q.stall===v.stall&&hyp(q.x-v.x,q.z-v.z)<3.2);
    const pd=hyp(P.pos.x-v.x,P.pos.z-v.z);if(pd<3.4&&!O.drawn)face(v,P.pos.x,P.pos.z,dt);else if(near)face(v,near.x,near.z,dt);else v.yaw=turn(v.yaw,v.home?v.home.yaw:v.yaw,dt*2)}}

/* ---------------- the collectors: pitch, take the money, and (one of them) give himself away ---------------- */
function colStep(O,dt){const a=A();for(const c of O.cols){if(c.gone)continue;
    if(c.skim&&(c.ruse||c.down||O.run))continue;/* the takedown drives him */
    if(O.down&&!c.skim){/* the others stop to look */if(c.st==='walk'||c.st==='idle'){face(c,O.down.x,O.down.z,dt);continue}}
    c.next-=dt;if(c.tell){c.tell.t-=dt;if(c.tell.t<=0)c.tell=null}
    if(c.st==='idle'||c.st==='walk'){
      /* the skimmer: the duffel guy waved, he checks his phone */
      if(c.skim&&c.phoneDue){c.phoneDue=false;c.st='phone';c.t=K.phoneT*(O.alertT>0?.5:1);showProp(O,c,'phone',true);setTell(O,c,'phone',c.t);continue}
      if(c.st==='idle'&&c.next<=0){const s=pickMark(O,c);if(s){c.mark=s;c.st='walk'}else c.next=2}
      if(c.st==='walk'){const s=c.mark;if(!s||s.st!=='browse'&&s.st!=='walk'){c.st='idle';c.next=1;continue}
        let tx=s.x+Math.sin(s.yaw)*-1.05,tz=s.z+Math.cos(s.yaw)*-1.05;tx=clamp(tx,AISLE.x0,AISLE.x1);tz=clamp(tz,AISLE.z0-.2,AISLE.z1+.2);
        /* the long way round Rosa's stall: he hugs the far side of the aisle and watches it out of the corner of his eye */
        if(c.skim&&Math.abs(c.x-ROSA_STALL.x)<7.5&&(Math.sign(tx-ROSA_STALL.x)!==Math.sign(c.x-ROSA_STALL.x)||Math.abs(tx-ROSA_STALL.x)<7)){tz=AISLE.z0-.1;if(c.z<42.4)setTell(O,c,'rosa',.35)}
        if(stepTo(O,c,tx,tz,c.speed,dt,.35)&&hyp(s.x-c.x,s.z-c.z)<1.6){c.st='pitch';c.t=K.pitchT;c.donated=false;c.stage=0;s.st='pitched';s.by=c;s.t=K.pitchT+.4;
          const line=c.skim?SKIM_LINES[(c.pn=(c.pn||0)+1)%SKIM_LINES.length]:pick(c.col.real);bubble(O,c,line,2.6);heard(O,c,line)}}}
    else if(c.st==='pitch'){c.t-=dt;const s=c.mark;if(s)face(c,s.x,s.z,dt);const el=K.pitchT-c.t;
      if(c.stage===0&&el>1.7){c.stage=1;if(s&&Math.random()<.75){c.donated=true;try{PPL().interact&&PPL().interact(s.d)}catch(_){}showProp(O,c,'bill',true)}}
      if(c.stage===1&&el>2.5){c.stage=2;if(c.donated){try{PPL().interact&&PPL().interact(c.d)}catch(_){}
          if(c.skim&&!c.forShow){setTell(O,c,'pocket',1.5*(O.alertT>0?.5:1))}else c.tinT=1.4}}
      if(c.stage===2&&el>3.3){c.stage=3;if(c.donated){showProp(O,c,'bill',false);if(!c.skim||c.forShow){clink(O,c);c.forShow=false}}}
      if(c.t<=0){c.st='idle';c.next=rr(...K.pitchGap);if(s&&s.st==='pitched')s.st='browse'}}
    else if(c.st==='phone'){c.t-=dt;if(O.duf&&O.duf.e)face(c,O.duf.e.pos.x,O.duf.e.pos.z,dt);if(c.t<=0){showProp(O,c,'phone',false);c.st='idle';c.next=1}}
    else if(c.st==='rosa'){/* a real collector says hello to Rosa on the way past */c.t-=dt;face(c,ROSA_STALL.x,ROSA_STALL.z,dt);if(c.t<=0){c.st='idle';c.next=1}}
    if(c.tinT>0)c.tinT-=dt;
    if(!c.skim&&c.st==='walk'&&!c.greeted&&hyp(c.x-ROSA_FRONT.x,c.z-ROSA_FRONT.z)<2.6){c.greeted=true;c.st='rosa';c.t=1.4;bubble(O,c,pick(["Morning, Rosa!","Hi Rosa! Tomatoes look great!","Rosa! Save me a pumpkin!"]),2);later(9,()=>{c.greeted=false})}}
  /* the duffel guy waves at his partner every so often */
  const D=O.duf;if(D&&D.st==='post'){D.waveT-=dt;if(D.waveT<=0){D.waveT=rr(...K.waveGap);const sk=O.cols[O.skim];if(sk&&!sk.ruse&&!O.down){D.wave=1.6;sk.phoneDue=true}}
    if(D.wave>0){D.wave-=dt;try{A().pose(D.e.dude,0,{mode:'hands',aim:false})}catch(_){}}}}
function pickMark(O,c){let best=null,bd=1e9;for(const s of O.people){if(s.kind!=='shop'||s.st!=='browse'||s.west&&c.skim&&false)continue;
    if(c.skim&&hyp(s.x-ROSA_FRONT.x,s.z-ROSA_FRONT.z)<6)continue;/* never pitches anyone near Rosa's stall */
    if(O.cols.some(o=>o!==c&&o.mark===s))continue;const d=hyp(s.x-c.x,s.z-c.z)+rr(0,10);if(d<bd){bd=d;best=s}}return best}
function setTell(O,c,kind,t){c.tell={kind,t};if(kind!=='rosa'||!c.tellSaid){}}
function showProp(O,c,kind,on){const T=A().THREE;if(kind==='bill'){if(on&&!c.bill){c.bill=toHandUp(c.d,billMesh(O),'R',[0,-.01,.07,.3,0,0])}else if(!on&&c.bill){if(c.bill.parent)c.bill.parent.remove(c.bill);c.bill=null}}
  if(kind==='phone'){if(on&&!c.phone){c.phone=toHandUp(c.d,phoneMesh(O),'R',[0,.02,.06,-.6,0,0])}else if(!on&&c.phone){if(c.phone.parent)c.phone.parent.remove(c.phone);c.phone=null}}}
function clink(O,c){const a=A(),P=a.P,d=hyp(P.pos.x-c.x,P.pos.z-c.z);if(d>16)return;const g=.06*(1-d/16);tone({f:2400,to:1800,type:'triangle',d:.09,gain:g});tone({f:3100,to:2600,type:'triangle',d:.07,gain:g*.7,at:.06})}

/* ---------------- watching: the collector nearest the centre of the view, in line of sight, accrues what you see ---------------- */
/* line of sight across the tiles (walls, fences) and through the stalls (a canopy, a table, a vendor: you can't see past one) */
let STALL_BOX=[];const stallBoxes=()=>{STALL_BOX=STALLS.map(s=>({x0:s.x-1.75,x1:s.x+1.75,z0:s.side==='n'?38.3:45.4,z1:s.side==='n'?40.6:47.7}))};stallBoxes();
function segBox(x0,z0,x1,z1,b){if(x0>b.x0&&x0<b.x1&&z0>b.z0&&z0<b.z1||x1>b.x0&&x1<b.x1&&z1>b.z0&&z1<b.z1)return false;let t0=0,t1=1;const dx=x1-x0,dz=z1-z0;
  for(const[p,d,lo,hi]of[[x0,dx,b.x0,b.x1],[z0,dz,b.z0,b.z1]]){if(Math.abs(d)<1e-9){if(p<lo||p>hi)return false;continue}let a_=(lo-p)/d,b_=(hi-p)/d;if(a_>b_){const q=a_;a_=b_;b_=q}t0=Math.max(t0,a_);t1=Math.min(t1,b_);if(t0>t1)return false}return true}
function losGrid(x0,z0,x1,z1){const a=A(),d=hyp(x1-x0,z1-z0),n=Math.ceil(d/.9);for(let i=1;i<n;i++){const t=i/n,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;if(!a.walkable(a.tx(x),a.tx(z)))return false}
  for(const b of STALL_BOX)if(segBox(x0,z0,x1,z1,b))return false;return true}
function camRay(){const a=A(),P=a.P,cam=a.camera;const f={x:-Math.sin(P.yaw)*Math.cos(P.pitch),y:Math.sin(P.pitch),z:-Math.cos(P.yaw)*Math.cos(P.pitch)};return{o:{x:cam.position.x,y:cam.position.y,z:cam.position.z},d:f}}
function watchStep(O,dt){const a=A(),P=a.P,R=camRay();let best=null,ba=K.watchAng;
  for(const c of O.cols){if(c.gone)continue;const tx=c.x-R.o.x,ty=1.25-R.o.y,tz=c.z-R.o.z,l=Math.hypot(tx,ty,tz);if(l>K.watchD||l<.6)continue;
    const ang=Math.acos(clamp((tx*R.d.x+ty*R.d.y+tz*R.d.z)/l,-1,1));const tol=Math.max(ba,Math.atan(.45/l));if(ang<tol){ba=ang;best=c}}
  if(best&&!losGrid(P.pos.x,P.pos.z,best.x,best.z))best=null;
  const W=O.watch;if(best!==W.c){W.c=best;W.t=0}if(!best)return;W.t+=dt;O.watchedAny=(O.watchedAny||0)+dt;
  const c=best,d=hyp(P.pos.x-c.x,P.pos.z-c.z);
  /* a tell only counts while you're looking */
  if(c.tell&&c.skim){const k=c.tell.kind;c.tells[k]+=dt;c.seen=(c.seen||0)+dt;if(c.tells[k]>=.45&&!c['n_'+k]){c['n_'+k]=1;note(O,c,k)}}
  if(!c.skim&&c.tinT>0&&!c.n_tin){c.n_tin=1;note(O,c,'tin')}
  if(d<K.lanyardD&&W.t>K.lanyardT&&!c.n_lanyard){c.n_lanyard=1;note(O,c,'lanyard');if(c.skim)c.seen=(c.seen||0)+.8}
  if(c.skim&&!O.ided&&(c.seen||0)>=K.idTell)identify(O,'tells')}
function heard(O,c,line){const P=A().P;if(hyp(P.pos.x-c.x,P.pos.z-c.z)>K.patterD)return;c.heard.push(line);
  if(c.skim){const kinds=new Set(c.heard.map(l=>/garden/i.test(l)?'garden':/library/i.test(l)?'library':/kids/i.test(l)?'kids':'fund'));if(kinds.size>=2&&!c.n_patter){c.n_patter=1;c.seen=(c.seen||0)+1;note(O,c,'patter')}}
  else if(c.heard.length>=2&&!c.n_same){c.n_same=1;note(O,c,'same')}}
const NOTE={pocket:['$','Pocketed the bills, not the tin'],rosa:['R',"Went the long way round Rosa's stall"],phone:['P','On his phone when the duffel guy waved'],
  lanyard:['ID',null],patter:['"','Changed his patter (garden? library?)'],tin:['✓','Put the money in the tin'],same:['✓','Same charity every time'],
  hat:['✗',null],carry:['✗',null],cleared:['✓','Cleared: a real volunteer']};
function note(O,c,k){const n=NOTE[k];let txt=n[1];if(k==='lanyard')txt=c.skim?'Lanyard card: blank. No logo.':'Lanyard: '+c.col.logoTxt+' logo';
  c.notes=c.notes||[];if(c.notes.some(x=>x.k===k))return;const bad=c.skim&&(k==='pocket'||k==='rosa'||k==='phone'||k==='patter'||k==='lanyard');c.notes.push({k,icon:n[0],txt,bad});
  O.nbDirty=true;if(bad){tone({f:660,to:990,type:'sine',d:.12,gain:.06,bus:'ui'});A().feed('Notebook · '+c.col.label,'info',txt)}else if(k!=='hat'&&k!=='carry')tone({f:520,type:'sine',d:.08,gain:.03,bus:'ui'})}

/* ---------------- overlays: the notebook, speech bubbles, the watch bracket, the takedown ring ---------------- */
const CSS=`
.ho-ov{position:fixed;inset:0;pointer-events:none;font-family:var(--ui,system-ui,sans-serif)}
.ho-nb{position:absolute;right:calc(var(--sa-r,0px) + 18px);top:156px;width:262px;background:#f6f0dc;color:#2b2a26;border-radius:6px;padding:10px 12px 9px 26px;
  box-shadow:0 8px 24px rgba(0,0,0,.35);opacity:0;transition:opacity .4s;background-image:repeating-linear-gradient(#f6f0dc 0 21px,#cfdbe6 21px 22px);font-size:12.5px;line-height:1.25}
.ho-nb::before{content:'';position:absolute;left:16px;top:0;bottom:0;width:1.5px;background:#e19a9a}
.ho-nb.on{opacity:.96}.ho-nb h4{margin:0 0 6px;font:700 11px/1 var(--ui,system-ui);letter-spacing:.18em;text-transform:uppercase;color:#7a5a2a}
.ho-nb .r{display:flex;gap:7px;align-items:flex-start;margin:0 0 6px;padding:3px 3px;border-radius:4px;transition:background .25s}
.ho-nb .r.w{background:rgba(255,220,90,.45)}.ho-nb .r.x{opacity:.45}.ho-nb .r.x .d{text-decoration:line-through}.ho-nb .r.id{background:rgba(230,80,60,.18);outline:2px solid #c8402a}
.ho-nb .sw{flex:0 0 12px;height:12px;border-radius:3px;margin-top:2px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
.ho-nb .d{font-weight:700}.ho-nb .n{display:block;font-weight:400;font-size:11.5px;color:#4a463e}.ho-nb .n b{display:inline-block;min-width:14px;padding:0 3px;margin-right:4px;border-radius:3px;font-size:10px;text-align:center;color:#fff;background:#c8402a}
.ho-nb .n b.ok{background:#3f8a4a}.ho-nb .n b.no{background:#8a8a8a}
.ho-nb .bar{height:4px;background:rgba(0,0,0,.12);border-radius:2px;margin-top:3px;overflow:hidden}.ho-nb .bar i{display:block;height:100%;background:#c8402a;width:0;transition:width .2s}
.ho-nb .ft{margin-top:4px;font-size:11px;color:#6a5a3a;font-style:italic}
.ho-bub{position:absolute;transform:translate(-50%,-100%);background:#fffdf6;color:#222;font:600 12.5px/1.25 var(--ui,system-ui);padding:5px 9px;border-radius:10px;max-width:220px;text-align:center;
  box-shadow:0 3px 10px rgba(0,0,0,.3);opacity:0;transition:opacity .25s;white-space:normal}.ho-bub.on{opacity:.95}.ho-bub::after{content:'';position:absolute;left:50%;bottom:-6px;margin-left:-6px;border:6px solid transparent;border-top-color:#fffdf6;border-bottom:0}
.ho-bub.skim{background:#fff6e6}
.ho-br{position:absolute;border:2px solid rgba(255,255,255,.85);border-radius:6px;opacity:0;transition:opacity .15s;-webkit-mask:linear-gradient(#000 0 0) top left/12px 12px no-repeat,linear-gradient(#000 0 0) top right/12px 12px no-repeat,linear-gradient(#000 0 0) bottom left/12px 12px no-repeat,linear-gradient(#000 0 0) bottom right/12px 12px no-repeat}
.ho-br.on{opacity:1}.ho-br.tell{border-color:#ffcf4a}
.ho-brl{position:absolute;transform:translate(-50%,0);font:700 11px/1 var(--ui,system-ui);letter-spacing:.08em;text-transform:uppercase;color:#fff;text-shadow:0 1px 3px #000;opacity:0;transition:opacity .15s;white-space:nowrap}
.ho-brl.on{opacity:1}.ho-brl i{display:block;margin:4px auto 0;width:64px;height:3px;background:rgba(255,255,255,.3);border-radius:2px;overflow:hidden}.ho-brl i b{display:block;height:100%;background:#ffcf4a;width:0}
.ho-ret{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid rgba(255,255,255,.7);opacity:0;transition:opacity .15s,border-color .12s,transform .12s}
.ho-ret.on{opacity:1}.ho-ret.ok{border-color:#47e07a;box-shadow:0 0 14px rgba(71,224,122,.55)}.ho-ret.bad{border-color:#ff5a4a}.ho-ret.ok{transform:scale(.86)}
.ho-retl{position:absolute;left:50%;top:calc(50% + 34px);transform:translateX(-50%);font:800 12px/1 var(--ui,system-ui);letter-spacing:.14em;text-transform:uppercase;color:#fff;text-shadow:0 1px 4px #000;opacity:0}
.ho-retl.on{opacity:1}.ho-retl.ok{color:#7dffa6}.ho-retl.bad{color:#ffb0a6}
@media (max-width:700px),(max-height:520px){.ho-nb{top:auto;bottom:calc(var(--sa-b,0px) + 190px);width:200px;font-size:10.5px;padding:7px 9px 6px 22px}.ho-nb .n{font-size:10px}.ho-nb .n:nth-of-type(n+3){display:none}}
`;
function overlay(O){if(O.ov)return O.ov;const d=document;if(!d.getElementById('ho-css')){const st=d.createElement('style');st.id='ho-css';st.textContent=CSS;d.head.appendChild(st)}
  const el=d.createElement('div');el.className='ho-ov';el.innerHTML='<div class="ho-nb"><h4>Notebook · the collectors</h4><div class="rows"></div><div class="ft"></div></div><div class="ho-br"></div><div class="ho-brl"><span></span><i><b></b></i></div><div class="ho-ret"></div><div class="ho-retl"></div>';
  const bubs=[];for(let i=0;i<5;i++){const b=d.createElement('div');b.className='ho-bub';el.appendChild(b);bubs.push({el:b,p:null,t:0,txt:''})}
  O.ov={el,nb:el.querySelector('.ho-nb'),rows:el.querySelector('.rows'),ft:el.querySelector('.ft'),br:el.querySelector('.ho-br'),brl:el.querySelector('.ho-brl'),brs:el.querySelector('.ho-brl span'),brb:el.querySelector('.ho-brl b'),
    ret:el.querySelector('.ho-ret'),retl:el.querySelector('.ho-retl'),bubs,cache:{}};
  try{A().overlay('handsoff',el)}catch(_){}return O.ov}
function setCls(e,cls,on,cache,key){const k=key+cls;if(cache[k]===on)return;cache[k]=on;e.classList.toggle(cls,on)}
function bubble(O,p,txt,dur){const ov=O.ov;if(!ov)return;const P=A().P;if(hyp(P.pos.x-p.x,P.pos.z-p.z)>16)return;let b=ov.bubs.find(x=>x.p===p)||ov.bubs.find(x=>!x.p)||ov.bubs.reduce((m,x)=>x.t<m.t?x:m);
  b.p=p;b.t=dur||2.6;b.el.textContent=txt;b.el.classList.toggle('skim',!!p.skim);b.el.classList.add('on')}
function overlayStep(O,dt){const ov=O.ov;if(!ov)return;const a=A(),c=ov.cache;
  for(const b of ov.bubs){if(!b.p)continue;b.t-=dt;const p=b.p;const s=a.project(p.x,(p.h||1.75)+.45,p.z);const P=a.P;const far=hyp(P.pos.x-p.x,P.pos.z-p.z)>18;
    if(b.t<=0||s.behind||far||p.gone){b.el.classList.remove('on');b.p=null;continue}b.el.style.transform='translate(-50%,-100%) translate('+s.x.toFixed(0)+'px,'+s.y.toFixed(0)+'px)';b.el.style.left='0';b.el.style.top='0'}
  /* the bracket on whoever you're watching (market stage only) */
  const W=O.watch,w=O.stage==='market'&&W.c&&!O.chat;setCls(ov.br,'on',!!w,c,'br');setCls(ov.brl,'on',!!w,c,'brl');
  if(w){const p=W.c,top=a.project(p.x,(p.h||1.75)+.15,p.z),bot=a.project(p.x,0,p.z);if(!top.behind){const h=Math.max(30,bot.y-top.y),wd=h*.48;
      ov.br.style.left=(top.x-wd/2).toFixed(0)+'px';ov.br.style.top=top.y.toFixed(0)+'px';ov.br.style.width=wd.toFixed(0)+'px';ov.br.style.height=h.toFixed(0)+'px';
      ov.brl.style.left=top.x.toFixed(0)+'px';ov.brl.style.top=(bot.y+6).toFixed(0)+'px';const lab='Watching · '+p.col.label;if(c.brt!==lab){c.brt=lab;ov.brs.textContent=lab}
      const f=p.skim?clamp((p.seen||0)/K.idTell,0,1):0;ov.brb.style.width=(f*100).toFixed(0)+'%';setCls(ov.br,'tell',!!(p.tell&&p.skim),c,'tell')}}
  /* the takedown ring */
  const R=O.ret;setCls(ov.ret,'on',!!O.drawn,c,'ret');setCls(ov.retl,'on',!!O.drawn,c,'retl');
  if(O.drawn){setCls(ov.ret,'ok',R==='ok',c,'rok');setCls(ov.ret,'bad',R==='bad',c,'rbad');setCls(ov.retl,'ok',R==='ok',c,'lok');setCls(ov.retl,'bad',R==='bad',c,'lbad');
    const t=O.round<=0?'Empty':R==='ok'?'Clear · click':R==='bad'?O.retWhy||'Not clear':'Find him';if(c.rt!==t){c.rt=t;ov.retl.textContent=t}}
  /* the notebook */
  const show=O.nbOn&&!O.endSeq;setCls(ov.nb,'on',!!show,c,'nb');if(show&&O.nbDirty){O.nbDirty=false;renderNotebook(O)}
  if(show&&O.cols){for(const p of O.cols){const r=ov.rows.querySelector('[data-c="'+p.col.id+'"]');if(!r)continue;setCls(r,'w',W.c===p&&O.stage==='market',c,'w'+p.col.id);
      const bar=r.querySelector('.bar i');if(bar){const f=p.skim?clamp((p.seen||0)/K.idTell,0,1):clamp((p.cleanSeen||0)/K.idTell,0,1)*0;const v=(f*100).toFixed(0)+'%';if(bar._v!==v){bar._v=v;bar.style.width=v}}}}}
function renderNotebook(O){const ov=O.ov;if(!ov)return;let h='';
  for(const p of O.cols){const c=p.col,notes=(p.notes||[]).slice(-4);const out=(p.notes||[]).some(n=>n.k==='hat'||n.k==='carry'||n.k==='cleared');
    const desc=c.label+' · '+(c.hat==='cap'?'cap':c.hat==='bucket'?'bucket hat':'no hat')+' · '+(c.carry==='tin'?'tin':'clipboard');
    h+='<div class="r'+(out?' x':'')+(O.ided&&p.skim?' id':'')+'" data-c="'+c.id+'"><div class="sw" style="background:'+c.vest+'"></div><div style="flex:1"><span class="d">'+desc+'</span>'+
      notes.map(n=>'<span class="n"><b class="'+(n.bad?'':n.icon==='✗'?'no':'ok')+'">'+esc(n.icon)+'</b>'+esc(n.txt)+'</span>').join('')+(!O.ided?'<div class="bar"><i></i></div>':'')+'</div></div>'}
  ov.rows.innerHTML=h;const ft=O.ided?'It’s him. Get him somewhere quiet.':O.clues.length?O.clues.map(x=>x.txt).join(' '):'Watch their hands. Ask the vendors.';ov.ft.textContent=ft}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- talking: vendors, collectors, Rosa (the HUD's choice strip: keys 1-4 or tap; walking away closes it) ---------------- */
function openChat(O,o){const a=A(),HD=a.HUD;closeChat(O);if(!HD||!HD.kit||!HD.kit.choices)return;
  const kit=HD.kit.choices({speaker:o.speaker,color:o.color||'#ffd27a',prompt:o.prompt,tell:o.tell||'',options:o.options.map(x=>({text:x.text,reg:x.reg||'real'})),onPick:(i)=>{const op=o.options[i];closeChat(O);if(op&&op.fn)op.fn()}});
  O.chat={kit,x:o.x,z:o.z,t:0};a.overlay('handsoff-chat',kit.el)}
function closeChat(O){if(!O.chat)return;O.chat=null;try{A().overlay('handsoff-chat',null)}catch(_){}}
function vendorChat(O,v){const s=v.stall,sk=O.cols[O.skim].col,P=A().P;
  const opts=[{text:"Seen anything funny with the charity folks?",fn:()=>vendorClue(O,v)},
    {text:pick(["I'll take one. Keep the change.","What's good today?","Smells amazing over here."]),reg:'comp',fn:()=>{say('you',"What's good today?",true);say(v.name,pick(["All of it. I grew it. I'm biased.","Take a sample. Take two. Don't tell the honey lady.","You look like a man who needs a tomato."]));tone({f:880,type:'sine',d:.08,gain:.04,bus:'ui'})}},
    {text:"Never mind. Lovely stall.",reg:'over',fn:()=>{}}];
  openChat(O,{speaker:v.name,prompt:pick(["Morning! What can I get you?","Hi there! Free samples on the left.","Hey, neighbour."]),tell:'['+v.name+' leans on the counter.]',options:opts,x:v.x,z:v.z})}
function vendorClue(O,v){const s=v.stall,sk=O.cols[O.skim].col;v.asked=true;
  if(s.clue==='hat'){const cap=sk.hat==='cap';say('you',"Seen anything funny with the charity folks?",true);
    say(v.name,cap?"One of them paid me for honey with a fifty. A fifty! Charity people don't carry fifties. Ball cap, pulled down low.":"One of them bought honey with a fifty. Charity people don't carry fifties. No ball cap on him, I'd have noticed. I notice hats.");
    addClue(O,'hat',cap?'Honey Lady: the fifty guy wore a ball cap.':'Honey Lady: the fifty guy had no ball cap.',c=>(c.hat==='cap')===cap,cap?'Ruled out: no ball cap (Honey Lady)':'Ruled out: ball cap (Honey Lady)')}
  else if(s.clue==='carry'){const t=sk.carry==='tin';say('you',"Seen anything funny with the charity folks?",true);
    say(v.name,t?"One of them rattles a tin all day. I've never once heard anything land in it. Not a coin. Not a button.":"One of them carries a clipboard and never writes on it. Twenty minutes, not one word. Who carries a clipboard and doesn't write?");
    addClue(O,'carry',t?'Peach Lady: his tin never rattles with anything new.':'Peach Lady: clipboard, never writes on it.',c=>(c.carry==='tin')===t,t?'Ruled out: clipboard (Peach Lady)':'Ruled out: tin (Peach Lady)')}
  else if(s.clue==='tip'){say('you',"Seen anything funny with the charity folks?",true);
    say(v.name,"Watch which one goes the long way round Rosa's stall. And the guy with the big duffel by the east barrier? He keeps waving at one of them.");O.tip=true;if(!O.clues.some(x=>x.k==='tip'))O.clues.push({k:'tip',txt:'Flowers: watch who avoids Rosa; the duffel guy waves at him.'});O.nbDirty=true}
  else{say('you',"Seen anything funny with the charity folks?",true);say(v.name,pick(["The vests? They come every Saturday. Well. Three of them come every Saturday.","Ask the honey lady. She sees everybody's money.","The peach lady knows. She knows everything. She knew about the goat.","I just sell bread, man. Ask the flowers."]))}}
function addClue(O,k,txt,match,rule){if(O.clues.some(x=>x.k===k))return;O.clues.push({k,txt});tone({f:740,to:1100,type:'sine',d:.14,gain:.05,bus:'ui'});A().feed('Notebook · a clue','info',txt);
  for(const c of O.cols)if(!match(c.col)){c.notes=c.notes||[];if(!c.notes.some(n=>n.k===k))c.notes.push({k,icon:'✗',txt:rule,bad:false})}
  O.nbDirty=true;const left=O.cols.filter(c=>!(c.notes||[]).some(n=>n.k==='hat'||n.k==='carry'||n.k==='cleared'));
  if(left.length===1&&!O.ided&&!O.saidOne){O.saidOne=true;later(3,()=>!O.ided&&say('rosa',"Your notebook says it's the "+left[0].col.label.toLowerCase()+". Watch him to be sure, or walk up and point him out.",true))}}
function colChat(O,c){const sk=c.skim;
  if(O.stage==='market'){openChat(O,{speaker:c.col.label,prompt:sk?pick(SKIM_LINES):pick(c.col.real),tell:'[He holds out the '+(c.col.carry==='tin'?'tin':'clipboard')+'.]',x:c.x,z:c.z,options:[
      {text:"Which charity is this for?",fn:()=>{const l=sk?SKIM_LINES[(c.pn=(c.pn||0)+1)%SKIM_LINES.length]:pick(c.col.real);say('you',"Which charity is this for?",true);say(c.col.label,l);c.heard.push(l);heard(O,c,l);if(!sk&&!c.n_same&&c.heard.length>=2){c.n_same=1;note(O,c,'same')}}},
      {text:"Here, a dollar for the cause.",reg:'comp',fn:()=>{say('you',"Here. A dollar for the cause.",true);if(sk){c.forShow=true;say(c.col.label,"Bless you. Bless you, sir. Straight into the tin.");later(.8,()=>{clink(O,c)});c.notes=c.notes||[]}else{say(c.col.label,"Thank you! Into the tin it goes.");later(.8,()=>{clink(O,c)});c.tinT=1.5;note(O,c,'tin')}}},
      {text:"Rosa. It's this one. (point him out)",reg:'over',fn:()=>accuse(O,c)},
      {text:"Never mind. Keep up the good work.",reg:'joke',fn:()=>{}}]})}
  else if(O.stage==='aside'&&sk&&!c.ruse&&!O.down){openChat(O,{speaker:'Skimmer',prompt:pick(SKIM_LINES),tell:'[He smiles with all of his teeth.]',x:c.x,z:c.z,options:[
      {text:"I'd like to donate. A big one. Not in front of everybody, though.",reg:'real',fn:()=>ruse(O,'donate')},
      {text:"Hey, is that your hatchback on 4th? They're towing it.",reg:'joke',fn:()=>ruse(O,'tow')},
      {text:"(Wave Gary over: he'll talk him round the corner)",reg:'over',fn:()=>ruse(O,'gary')},
      {text:"Never mind. Lovely vest.",reg:'comp',fn:()=>{}}]})}}
function accuse(O,c){const a=A();if(c.skim){say('you',"Rosa. It's this one.",true);const sure=(c.seen||0)>=1.2||O.cols.filter(q=>!(q.notes||[]).some(n=>n.k==='hat'||n.k==='carry'||n.k==='cleared')).length===1;
    identify(O,sure?'proof':'hunch');return}
  /* the wrong man: funny, costly, never a fail */
  O.wrong++;a.addTrust(-2,'river');a.feed('Wrong guy','bad','-2 Riverside trust');tone({f:330,to:220,type:'triangle',d:.3,gain:.07,bus:'ui'});
  say('you',"Excuse me, sir—",true);later(1.2,()=>say(c.col.label,c.col.cleared,true));later(4.6,()=>say('you',"...Great work. Love the "+c.col.charity.replace(/^the /,'').replace(/ Club$/,'')+".",true));
  later(7,()=>say('rosa',O.wrong>1?"That's two. I'm going to start charging you for apology muffins.":"And now the real one's watching us. Smooth.",true));
  c.notes=c.notes||[];if(!c.notes.some(n=>n.k==='cleared'))c.notes.push({k:'cleared',icon:'✓',txt:'Cleared: a real volunteer. Oops.',bad:false});O.nbDirty=true;O.alertT=K.alertT}
function identify(O,how){if(O.ided)return;const a=A();O.ided=true;O.idHow=how;O.nbDirty=true;const sk=O.cols[O.skim];
  if(how==='tells')say('rosa',pick(LINES.rosaConfirm),true);else if(how==='proof')say('rosa',"Yep. That's him. Look at that blank lanyard.",true);else say('rosa',"Okay. I trust your gut. Your gut had nachos for breakfast, but okay.",true);
  tone({f:523,type:'sine',d:.12,gain:.06,bus:'ui'});tone({f:784,type:'sine',d:.2,gain:.06,bus:'ui',at:.1});a.banner('THAT’S HIM','The '+sk.col.label.toLowerCase()+' is the skimmer',2.2);
  O.stage='aside';try{a.CP.mark('aside')}catch(e){console.warn(e)}later(2.6,()=>say('rosa',LINES.rosaAside,true));music('tension',.3);crewUp(O)}
/* once he's known, Rosa leaves the stall and she and Gary drift to the east end to watch (close enough to come running) */
function crewUp(O){const r=O.rosa,g=O.gary;r.away=true;r.st='watch';r.tx=404.2;r.tz=44.4;if(g&&!g.busy){g.home={x:405.2,z:42.6,yaw:-Math.PI/2};g.st='home'}}

/* ---------------- the ruses: get him alone ---------------- */
function ruse(O,kind){const a=A(),sk=O.cols[O.skim];if(sk.ruse||O.down)return;O.ruses=(O.ruses||0)+1;O.ruseKind=kind;
  if(sk.mark&&sk.mark.st==='pitched')sk.mark.st='browse';sk.mark=null;showProp(O,sk,'bill',false);showProp(O,sk,'phone',false);sk.tell=null;
  if(kind==='donate'){seq(LINES.donate,2.2,0,'ruse');sk.ruse={kind,st:'follow',t:0,talk:6};O.trail=[{x:a.P.pos.x,z:a.P.pos.z}]}
  else if(kind==='tow'){seq(LINES.tow,1.8,0,'ruse');sk.ruse={kind,st:'go',t:0,path:[{x:clamp(sk.x,AISLE.x0,AISLE.x1),z:43}].concat(ROUTE_N),k:0};later(4,()=>say('rosa',"He's heading for 4th. Round the corner. Follow him. Quietly.",true),'ruse')}
  else if(kind==='gary'){const g=O.gary;g.busy=true;g.st='toSkim';g.moved=false;g.drawSeen=0;sk.ruse={kind,st:'wait',t:0};say('you',"Gary. Decoy. Him.",true);later(1.2,()=>say('gary',"On it. I was born for this. I was born to talk about my car.",true),'ruse')}}
function ruseStep(O,dt){const a=A(),P=a.P,sk=O.cols[O.skim],R=sk.ruse;if(!R||O.down||O.run)return;R.t+=dt;
  if(R.kind==='donate'){const tr=O.trail,last=tr[tr.length-1];if(hyp(P.pos.x-last.x,P.pos.z-last.z)>.8)tr.push({x:P.pos.x,z:P.pos.z});
    while(tr.length>1&&hyp(tr[0].x-sk.x,tr[0].z-sk.z)<.7)tr.shift();const d=hyp(P.pos.x-sk.x,P.pos.z-sk.z);
    if(d>K.follow.gap){const t=tr.length>1?tr[0]:{x:P.pos.x,z:P.pos.z};stepTo(O,sk,t.x,t.z,d>4?2.7:1.4,dt,.3)}else face(sk,P.pos.x,P.pos.z,dt);
    R.talk-=dt;if(R.talk<=0){R.talk=rr(7,10);bubble(O,sk,pick(LINES.followTalk),2.4)}
    if(d>K.follow.lose)R.lost=(R.lost||0)+dt;else R.lost=0;
    if(R.lost>K.follow.loseT||R.t>K.follow.max){bubble(O,sk,LINES.followQuit,2.6);say('Skimmer',LINES.followQuit);endRuse(O)}}
  else if(R.kind==='tow'){if(R.st==='go'){const t=R.path[R.k];if(stepTo(O,sk,t.x,t.z,3.0,dt,.5)){R.k++;if(R.k>=R.path.length){R.st='wait';R.t=0;say('Skimmer',pick(LINES.towNone),true)}}}
    else if(R.st==='wait'){face(sk,CAR.x,CAR.z,dt);if(R.t>K.towWait*.5&&!R.said){R.said=1;bubble(O,sk,"There's no tow truck. Is there a tow truck?",2.6)}if(R.t>K.towWait){bubble(O,sk,"Weird. Okay.",2);R.st='back';R.path=ROUTE_N.slice(0,-1).reverse().concat([{x:400,z:43}]);R.k=0}}
    else if(R.st==='back'){const t=R.path[R.k];if(stepTo(O,sk,t.x,t.z,1.3,dt,.5)){R.k++;if(R.k>=R.path.length)endRuse(O)}}}
  else if(R.kind==='gary'){const g=O.gary;
    if(g.st==='toSkim'){if(stepTo(O,g,sk.x+.9,sk.z+.6,2.6,dt,.5)&&R.t>2){g.st='pitch';g.t=0;seq(LINES.garyDecoy,2.8,0,'ruse');R.st='talk';R.t=0}}
    else if(g.st==='pitch'){face(g,sk.x,sk.z,dt);face(sk,g.x,g.z,dt);if(R.t>5.6){g.st='lead';R.st='go';R.path=[{x:clamp(sk.x,AISLE.x0,AISLE.x1),z:43}].concat(ROUTE_S);R.k=0}}
    else if(g.st==='lead'){const t=R.path[R.k];const gt={x:t.x+.8,z:t.z+.2};stepTo(O,g,gt.x,gt.z,2,dt,.4);if(stepTo(O,sk,t.x,t.z,2,dt,.5)){R.k++;if(R.k>=R.path.length){g.st='chat';R.st='wait';R.t=0;later(1,()=>{if(sk.ruse===R)say('gary',"So this is my car. It's a minivan. Let me tell you about the cupholders.",true)},'ruse')}}}
    else if(g.st==='chat'){if(!O.drawn&&!g.moved){face(g,sk.x,sk.z,dt);face(sk,g.x,g.z,dt)}if(R.t>K.garyWait){bubble(O,sk,"You know what, I'll come back for the cheque.",2.4);say('gary',"He's walking. Sorry. I may have spent too long on the cupholders.",true);endRuse(O);g.st='home';g.busy=false}}
    else if(g.st==='aside'){stepTo(O,g,g.tx,g.tz,2.6,dt,.3)}}}
function endRuse(O){const sk=O.cols[O.skim];cancel(O,'ruse');sk.ruse=null;sk.st='idle';sk.next=2;if(O.stage==='aside'&&!O.down)later(1.5,()=>say('rosa',pick(["He's back in the crowd. Try again.","Back to square one. He's working the stalls again.","Lost him to the market. Go again."]),true))}
function garyStep(O,dt){const g=O.gary,r=O.rosa;if(r&&r.st==='watch'&&!O.down){if(hyp(r.tx-r.x,r.tz-r.z)>.4)stepTo(O,r,r.tx,r.tz,1.3,dt,.3);else{const sk=O.cols[O.skim];face(r,sk.x,sk.z,dt)}}if(!g)return;
  if(g.st==='home'||!g.st){if(hyp(g.home.x-g.x,g.home.z-g.z)>.4)stepTo(O,g,g.home.x,g.home.z,1.4,dt,.3);else{g.yaw=turn(g.yaw,g.home.yaw,dt*3);g.st='home'}
    if(!O.down&&O.talked&&(g.idleT=(g.idleT||25)-dt)<=0){g.idleT=rr(40,70);const P=A().P;if(hyp(P.pos.x-g.x,P.pos.z-g.z)<14)say('gary',pick(LINES.garyIdle))}}
  /* he steps out of the line when you draw on the man he's talking to */
  if(g.st==='chat'&&O.drawn&&!g.moved){g.drawSeen=(g.drawSeen||0)+dt;if(g.drawSeen>1.0){g.moved=true;const P=A().P,sk=O.cols[O.skim],ax=sk.x-P.pos.x,az=sk.z-P.pos.z,l=hyp(ax,az)||1;
      const nx=-az/l,nz=ax/l,side=((g.x-sk.x)*nx+(g.z-sk.z)*nz)>=0?1:-1;/* out of the line on his own side, 3 m clear of it */g.tx=sk.x+nx*side*3.2;g.tz=sk.z+nz*side*3.2;const a=A();if(!a.walkable(a.tx(g.tx),a.tx(g.tz))){g.tx=sk.x-nx*side*3.2;g.tz=sk.z-nz*side*3.2}g.st='aside';say('gary',LINES.garyMove,true)}}}

/* ---------------- the takedown: draw (a toggle), witnesses, panic, one round ---------------- */
function civs(O){return O.people.filter(p=>!p.gone&&!(p.skim)&&p.kind!=='duffel')}
/* the people who'd see a gun and panic: everybody but the crew (Rosa and Gary are in on it) */
function crowd(O){return O.people.filter(p=>!p.gone&&!p.skim&&p.kind!=='rosa'&&p.kind!=='gary')}
function kidsNear(O){const P=A().P;let n=null,nd=1e9;for(const p of O.people){if(p.gone||!(p.kind==='kid'||p.stroller))continue;const d=hyp(p.x-P.pos.x,p.z-P.pos.z);if(d<nd){nd=d;n=p}}return nd<=K.kidR?nd:null}
/* who would see the gun: within 22 m, facing roughly your way (or close), with a clear line across the tiles; refreshed a few at a time */
function witnessStep(O){const P=A().P,list=crowd(O);if(!list.length){O.wit=0;return}const n=Math.min(10,list.length);
  for(let i=0;i<n;i++){O.witK=(O.witK+1)%list.length;const p=list[O.witK];const dx=P.pos.x-p.x,dz=P.pos.z-p.z,d=hyp(dx,dz);
    if(d>K.seeR){p.sees=false;continue}const fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw),dot=(fx*dx+fz*dz)/(d||1);p.sees=(dot>.05||d<5)&&losGrid(p.x,p.z,P.pos.x,P.pos.z);p.seeD=d}
  O.wit=list.filter(p=>p.sees).length}
function toggleDraw(O,force){const a=A();if(!O||O.endSeq)return;const want=force!=null?force:!O.drawn;
  if(want){if(O.stage!=='aside'&&!O.run){say('rosa',pick(["Draw on who? The whole market? Find him first.","Put that away. We don't even know which one it is."]),true);return}
    if(O.round<=0&&!O.run){say('rosa',"You're out. Holster it.",true);return}
    const k=kidsNear(O);if(k!=null){if(O.clock-(O.kidSaid||-9)>4){O.kidSaid=O.clock;say('rosa',pick(LINES.rosaKids),true);a.feed('Kids within 25 m','bad','Not here. Get further away.')}tone({f:200,type:'square',d:.12,gain:.04,bus:'ui'});return}
    O.drawn=true;O.drawT=0;O.everDrawn=true;try{a.holster(false);if(a.P.cur!=='beanbag')a.swap('beanbag',true)}catch(_){}a.P.aim=true;tone({f:180,to:120,type:'triangle',d:.12,gain:.05});
    if(!O.saidGreen&&O.wit===0)later(.8,()=>{if(O.drawn&&O.ret==='ok'&&!O.saidGreen){O.saidGreen=1;say('rosa',pick(LINES.rosaGreen),true)}})}
  else{O.drawn=false;try{a.holster(true)}catch(_){}a.P.aim=false}}
function panicStep(O,dt){const a=A(),P=a.P;let rate=0;
  if(O.drawn){O.drawT+=dt;for(const p of crowd(O)){if(!p.sees)continue;const d=p.seeD||10;rate+=K.panicSee*(1-d/K.seeR)+(d<6?K.panicNear:0);
      if(p.kind==='shop'||p.kind==='kid'){if(p.st!=='flee'&&p.st!=='cower'&&p.st!=='look'&&p.st!=='back'){p.st='look';p.t=rr(.6,1.2);if(Math.random()<.35&&O.clock-(O.gaspT||-9)>2.5){O.gaspT=O.clock;bubble(O,p,pick(LINES.crowdGasp),2.2)}}}
      else if(p.kind==='vendor'||p.kind==='col'){face(p,P.pos.x,P.pos.z,dt)}}
    rate=Math.min(rate,K.panicCap);if(rate>4&&O.clock-(O.warnT||-9)>6){O.warnT=O.clock;say('rosa',pick(LINES.rosaPanic),true)}}
  if(O.run){const r=O.cols[O.skim];for(const p of civs(O))if(hyp(p.x-r.x,p.z-r.z)<3){rate+=2.2;if(p.kind==='shop'&&p.st!=='flee')scatter(O,p,r.x,r.z)}}
  if(rate>0){O.panic=Math.min(100,O.panic+rate*dt);O.calmT=0}else{O.calmT=(O.calmT||0)+dt;if(O.calmT>2)O.panic=Math.max(0,O.panic-K.panicDecay*dt)}
  O.panicPeak=Math.max(O.panicPeak,O.panic);
  if(O.panic>55)for(const p of civs(O))if((p.kind==='shop'||p.kind==='kid')&&p.st!=='flee'&&p.st!=='cower'&&p.sees&&Math.random()<dt*.6)scatter(O,p,P.pos.x,P.pos.z);
  if(O.panic>=100&&!O.failed){O.failed=true;fail(O,LINES.fail.panic,'Stampede.')}}
function scatter(O,p,fx,fz){const exits=[{x:379,z:56},{x:379,z:30},{x:347,z:43},{x:411,z:43},{x:349,z:39},{x:349,z:47}].filter(e=>!(p.west&&e.x>400));
  let best=exits[0],bd=-1e9;for(const e of exits){const s=hyp(e.x-fx,e.z-fz)-hyp(e.x-p.x,e.z-p.z)*.6;if(s>bd){bd=s;best=e}}p.st='flee';p.tx=best.x+rr(-2,2);p.tz=best.z+rr(-1.5,1.5);
  if(Math.random()<.25)bubble(O,p,pick(["Run!","Go go go!","Where's Lily? LILY!","Not again!"]),1.6)}
/* the ring: what the round would hit right now, and whether anybody is within 2 m of the line (and 6 m past him) */
function aimCheck(O){const a=A(),R=camRay(),sk=O.cols[O.skim];const hit=castPeople(O,R.o,R.d,K.shotR);
  if(!hit||hit.p!==sk){O.ret=hit&&hit.p?'bad':null;O.retWhy=hit&&hit.p?(hit.p.kind==='gary'?"That's Gary":'Not him'):null;return}
  const L=hit.t+K.lineBeyond;for(const p of civs(O)){if(p===sk)continue;const px=p.x-R.o.x,py=1.1-R.o.y,pz=p.z-R.o.z;const t=clamp(px*R.d.x+py*R.d.y+pz*R.d.z,0,L);
    const cx=R.o.x+R.d.x*t-p.x,cz=R.o.z+R.d.z*t-p.z;if(hyp(cx,cz)<K.lineR){O.ret='bad';O.retWhy=p.kind==='gary'?'Gary’s in the way':'Somebody behind him';return}}
  O.ret='ok';O.retWhy=null}
/* a round against everybody's capsule (radius 0.3, their height) and the world's solids */
function castPeople(O,o,d,maxT){let best=null;const list=O.people.filter(p=>!p.gone);if(O.duf&&O.duf.e&&O.duf.e.state!=='dead')list.push({x:O.duf.e.pos.x,z:O.duf.e.pos.z,h:1.75,duf:true});
  for(const p of list){const h=(p.mode==='sit'?1.25:p.mode==='kneel'||p.mode==='hands'&&p.down?1.15:p.h||1.75),ox=o.x-p.x,oz=o.z-p.z,A_=d.x*d.x+d.z*d.z,B=2*(ox*d.x+oz*d.z),C=ox*ox+oz*oz-K.capR*K.capR,D=B*B-4*A_*C;
    if(D<0||A_<1e-9)continue;const s=Math.sqrt(D);let t0=(-B-s)/(2*A_),t1=(-B+s)/(2*A_);if(t1<0)continue;t0=Math.max(t0,0);const y0=o.y+d.y*t0,y1=o.y+d.y*t1;
    let t=null;if(y0>=0&&y0<=h)t=t0;else if((y0>h&&y1<h)||(y0<0&&y1>0)){t=(y0>h?(h-o.y):(0-o.y))/d.y}if(t==null||t>maxT)continue;if(!best||t<best.t)best={t,p:p.duf?{kind:'duffel'}:p}}
  const a=A(),T=a.THREE;if(!O._ray)O._ray=new T.Raycaster();const r=O._ray;r.set(new T.Vector3(o.x,o.y,o.z),new T.Vector3(d.x,d.y,d.z));r.near=.5;r.far=best?best.t:maxT;
  let sol=null;try{sol=r.intersectObjects(a.L.solids,false)[0]}catch(_){}if(sol&&(!best||sol.distance<best.t))return{t:sol.distance,p:null,point:sol.point};return best}
function shoot(O){const a=A(),P=a.P,T=a.THREE,sk=O.cols[O.skim];
  if(O.round<=0){try{AUD()&&AUD().mech('pistol','dry')}catch(_){}if(O.clock-(O.dryT||-9)>3){O.dryT=O.clock;say('rosa',"That was the one. Holster it. Legs now.",true)}return}
  O.round--;O.shots++;if(P.ammo&&P.ammo.beanbag){P.ammo.beanbag.mag=0;P.ammo.beanbag.res=0}
  const R=camRay(),sp=K.spread+(P.moving?K.moveSpread:0);const dir={x:R.d.x+(Math.random()-.5)*2*sp,y:R.d.y+(Math.random()-.5)*2*sp,z:R.d.z+(Math.random()-.5)*2*sp};const l=Math.hypot(dir.x,dir.y,dir.z);dir.x/=l;dir.y/=l;dir.z/=l;
  const hit=castPeople(O,R.o,dir,K.shotR);const end=hit?{x:R.o.x+dir.x*hit.t,y:R.o.y+dir.y*hit.t,z:R.o.z+dir.z*hit.t}:{x:R.o.x+dir.x*K.shotR,y:R.o.y+dir.y*K.shotR,z:R.o.z+dir.z*K.shotR};
  /* the gun goes bang the game's way: flash, orange tracer, the beanbag's report, a kick */
  const sh={x:P.pos.x+Math.cos(P.yaw)*.3-Math.sin(P.yaw)*.6,y:P.pos.y+(P.crouch?1.1:1.45),z:P.pos.z-Math.sin(P.yaw)*.3-Math.cos(P.yaw)*.6};
  const F_=FX();try{if(F_){F_.muzzleFlash(new T.Vector3(sh.x,sh.y,sh.z),new T.Vector3(dir.x,dir.y,dir.z),{type:'beanbag'});F_.tracer(new T.Vector3(sh.x,sh.y,sh.z),new T.Vector3(end.x,end.y,end.z),{color:'#ff7a1a'})}}catch(_){}
  try{AUD()&&AUD().gun('beanbag',{})}catch(_){}try{PPL().fire&&P.dude&&PPL().fire(P.dude)}catch(_){}P.pitch=clamp(P.pitch+.035,-1.3,1.25);
  /* everybody near the bang */
  let spike=0;for(const p of crowd(O)){const d=hyp(p.x-P.pos.x,p.z-P.pos.z),d2=hyp(p.x-end.x,p.z-end.z);if(d<K.seeR&&losGrid(p.x,p.z,P.pos.x,P.pos.z))spike+=K.panicShot*(1-d/K.seeR);if(d<12)spike+=K.panicHear*(1-d/12);
    if(Math.min(d,d2)<14&&(p.kind==='shop'||p.kind==='kid')){p.st='look';p.t=rr(.8,1.6)}}
  O.panic=Math.min(100,O.panic+spike);O.panicPeak=Math.max(O.panicPeak,O.panic);
  later(.9,()=>{if(O.drawn)toggleDraw(O,false)});
  if(hit&&hit.p===sk){O.oneShot=O.shots===1&&!O.run;try{AUD()&&AUD().impact('beanbag',new T.Vector3(end.x,end.y,end.z))}catch(_){}try{a.HUD.hit&&a.HUD.hit('hit')}catch(_){}takeDown(O,'bean');return}
  if(hit&&hit.p){try{AUD()&&AUD().impact('beanbag',new T.Vector3(end.x,end.y,end.z))}catch(_){}const p=hit.p;if(p.d)try{PPL().hit(p.d,false)}catch(_){}
    if(p.kind==='duffel'){say('Duffel guy',"OW. What did I do?! ...Okay, a lot. Fine.",true);if(O.duf.e.state==='idle')a.surrender(O.duf.e);return}
    O.failed=true;later(.6,()=>fail(O,p.kind==='gary'?LINES.fail.gary:LINES.fail.civ,p.kind==='gary'?'You beanbagged Gary.':'Wrong target.'));return}
  if(hit&&hit.point)try{F_&&F_.impact(new T.Vector3(end.x,end.y,end.z),new T.Vector3(-dir.x,-dir.y,-dir.z),'concrete')}catch(_){}
  /* a miss: he runs */
  if(!O.run&&!O.down)bolt(O)}
/* he saw it coming (the gun out too long where he could see it), or the round missed: he runs for it */
function bolt(O){const a=A(),P=a.P,sk=O.cols[O.skim];if(O.run||O.down)return;if(sk.ruse){if(O.gary&&O.gary.st!=='aside'){O.gary.st='home';O.gary.busy=false}sk.ruse=null}
  let best=ESCAPES[0],bd=-1e9;for(const e of ESCAPES){const s=hyp(e.x-P.pos.x,e.z-P.pos.z)-hyp(e.x-sk.x,e.z-sk.z);if(s>bd){bd=s;best=e}}
  O.run={t:0,esc:best,k:0,path:best.via.concat([{x:best.x,z:best.z}])};cancel(O,'ruse');say('Skimmer',pick(LINES.missRun),true);later(1,()=>say('rosa',"He's running! Catch him! Run INTO him!",true),'run');music('combat',.6);showProp(O,sk,'bill',false)}
function runStep(O,dt){const a=A(),P=a.P,R=O.run,sk=O.cols[O.skim];if(!R||O.down)return;R.t+=dt;const t=R.path[Math.min(R.k,R.path.length-1)];
  if(stepTo(O,sk,t.x,t.z,K.runSpeed,dt,.6)&&R.k<R.path.length-1)R.k++;
  const d=hyp(P.pos.x-sk.x,P.pos.z-sk.z);if(d<K.runTackle){say('you',"Hands off the garden money!",true);takeDown(O,'tackle');return}
  if(!O.failed&&(d>K.runLost||R.t>K.runMax||R.k>=R.path.length-1&&hyp(sk.x-R.esc.x,sk.z-R.esc.z)<2&&d>10)){O.failed=true;fail(O,LINES.fail.escape,'He got away.')}}
function takeDown(O,how){const a=A(),sk=O.cols[O.skim];cancel(O,'ruse');cancel(O,'run');O.down={x:sk.x,z:sk.z,how};O.run=null;O.stage='down';O.nbOn=false;closeChat(O);if(sk.ruse)sk.ruse=null;
  try{PPL().hit(sk.d,false)}catch(_){}sk.mode='hands';sk.down=true;showProp(O,sk,'bill',false);showProp(O,sk,'phone',false);
  later(.4,()=>say('Skimmer',how==='bean'?pick(LINES.hit):"OKAY. Okay. I yield. I yield to the dad.",true));later(1.3,()=>{sk.mode='kneel'});
  a.feed(how==='bean'?'One beanbag':'Tackled','trust',how==='bean'?(O.oneShot?'one shot':''):'');music('tension',.45);
  /* the market reacts: a beat of silence, then the commentary, then everybody gathers to look */
  let t=1.6;for(const l of LINES.crowdShot){const L_=l;later(t,()=>{const p=nearestCiv(O,sk.x,sk.z,18);if(p)bubble(O,p,L_,2.4)});t+=2}
  later(2.2,()=>{for(const p of civs(O))if((p.kind==='shop'||p.kind==='kid')&&hyp(p.x-sk.x,p.z-sk.z)<26){const ang=Math.random()*6.28,r=rr(4.5,7.5);p.st='gather';p.tx=sk.x+Math.cos(ang)*r;p.tz=sk.z+Math.sin(ang)*r;const q=a.walkable(a.tx(p.tx),a.tx(p.tz));if(!q){p.tx=p.x;p.tz=p.z}}});
  /* the twist: Gary's zip-ties are holding a bag of kettle corn shut; Rosa does it herself. And the duffel guy bolts. */
  const g=O.gary;g.st='toDown';g.busy=true;O.rosa.away=true;O.rosa.st='toDown';
  later(1.5,()=>dufBolt(O));O.endSeq=false}
function nearestCiv(O,x,z,r){let b=null,bd=r;for(const p of civs(O)){if(p.kind!=='shop'&&p.kind!=='vendor')continue;const d=hyp(p.x-x,p.z-z);if(d<bd&&d>2){bd=d;b=p}}return b}
function downStep(O,dt){const a=A(),sk=O.cols[O.skim],g=O.gary,r=O.rosa;if(!O.down)return;
  sk.yaw=sk.yaw;/* he stays where he dropped */
  if(g.st==='toDown'){if(stepTo(O,g,O.down.x+1.1,O.down.z+.7,4,dt,.5)){g.st='fumble';g.t=0;seq(LINES.tieTwist.slice(0,2),2.6)}}
  else if(g.st==='fumble'){face(g,sk.x,sk.z,dt);g.t+=dt}
  if(r.st==='toDown'){const tx=O.down.x-.8,tz=O.down.z-.6;if(stepTo(O,r,tx,tz,(g.st==='fumble'&&g.t>4.5)?4.4:3.2,dt,.45)&&g.st==='fumble'&&g.t>4.5){r.st='tie';r.t=0;seq(LINES.tieTwist.slice(2),1.4)}}
  else if(r.st==='tie'){face(r,sk.x,sk.z,dt);r.t+=dt;if(r.t>1.6&&!O.tied){O.tied=true;try{PPL().interact(r.d)}catch(_){}sk.mode='kneel';const M=A().M;M.cuffs=(M.cuffs||0)+1;tone({f:1400,to:900,type:'square',d:.08,gain:.05});try{AUD()&&AUD().zipTie()}catch(_){}a.feed('Zip-tied by Rosa','trust','she brought her own')}}
  checkWin(O)}
/* the duffel guy: on foot to whichever corner is furthest from you; he ditches the bag halfway; run into him, then zip-tie him (E) */
function dufBolt(O){const a=A(),D=O.duf,e=D.e,P=a.P;if(!e||D.st!=='post')return;D.st='run';D.t=0;
  let best=ESCAPES[0],bd=-1e9;for(const x of ESCAPES){const s=hyp(x.x-P.pos.x,x.z-P.pos.z)-hyp(x.x-e.pos.x,x.z-e.pos.z)*.7;if(s>bd){bd=s;best=x}}D.esc=best;
  D.carry=true;if(D.bag.parent)D.bag.parent.remove(D.bag);D.bag.position.set(.0,.0,.25);D.bag.rotation.set(0,Math.PI/2,0);e.dude.root.add(D.bag);
  const go=(i)=>{const pts=best.via.concat([{x:best.x,z:best.z}]);const t=pts[i];e.script={kind:'to',x:t.x,z:t.z,speed:D.carry?K.dufSpeed*.75:K.dufSpeed,then:()=>{if(i+1<pts.length)go(i+1);else D.arrived=true}}};go(0);
  seq(LINES.dufBolt,1.6);music('combat',.5)}
function dufStep(O,dt){const a=A(),D=O.duf,P=a.P;if(!D||!D.e)return;const e=D.e;
  if(D.st==='post'){e.pos.set(DUFFEL.x,0,DUFFEL.z);return}
  if(D.st!=='run')return;D.t+=dt;
  if(D.carry&&D.t>3.4){D.carry=false;if(e.script&&e.script.speed)e.script.speed=K.dufSpeed;if(D.bag.parent)D.bag.parent.remove(D.bag);a.wmAdd(D.bag);D.bag.position.set(e.pos.x+.4,0,e.pos.z);D.bag.rotation.y=rr(0,3);say('rosa',pick(LINES.dufDrop),true)}
  if(e.state==='surrender'&&!D.surr){D.surr=true;say('Duffel guy',pick(LINES.dufCaught),true)}
  if(e.state==='cuffed'&&!D.cuffed){D.cuffed=true;D.st='done';a.addTrust(3,'river');a.feed('Zip-tied the duffel guy','trust','+3 Riverside trust');say('rosa',"Two for two. Officer Dana's on her way. She sounded delighted. She sounded tired, but delighted.",true)}
  if(e.state==='idle'&&!D.surr){const d=hyp(P.pos.x-e.pos.x,P.pos.z-e.pos.z);if(d<K.dufTackle){e.script=null;a.surrender(e);D.surr=true;say('Duffel guy',pick(LINES.dufCaught),true)}
    else if(D.arrived&&d<14){/* out of road and out of breath */e.script=null;a.surrender(e);D.surr=true;say('Duffel guy',"I'm out of breath. You're out of breath. Let's both just stop.",true)}
    else if(d>K.dufLost||D.arrived){D.st='gone';say('rosa',LINES.dufGone,true);e.script={kind:'incar'};e.state='dead';e.hp=0;if(e.dude.root.parent)e.dude.root.parent.remove(e.dude.root);const k=a.enemies.indexOf(e);if(k>=0)a.enemies.splice(k,1);a.rebuildTargets()}}
  checkWin(O)}
function checkWin(O){const D=O.duf;if(O.won||!O.tied||!(D.st==='done'||D.st==='gone'))return;O.won=true;win(O)}
function win(O){const a=A(),M=a.M;music('victory',1);O.endSeq=false;
  if(O.oneShot){a.addTrust(6,'river');a.feed('One shot, nobody hurt','trust','+6 Riverside trust')}
  for(let i=0;i<4;i++)later(.3+i*.5,()=>{const p=nearestCiv(O,O.down.x,O.down.z,22);if(p)bubble(O,p,pick(LINES.crowdClap),2)});
  for(let i=0;i<10;i++)tone({f:rr(900,2400),type:'triangle',d:.03,gain:.015,at:.4+i*.09+Math.random()*.05});
  seq(LINES.win,3.2,1.2);later(3.4,()=>{if(A().M===M&&M.state==='go'){M.exitOpen=true;O.stage='done'}})}
function fail(O,why,title){const a=A();closeChat(O);if(O.drawn)toggleDraw(O,false);later(.01,()=>{});try{a.endMission(false,why,title)}catch(e){console.warn(e)}}

/* ---------------- the busker: a real tune on the sfx bus, louder as you walk up ---------------- */
const TUNE_=[[57,64,69,72],[55,62,67,71],[53,60,65,69],[52,59,64,68]];/* Am G F E, arpeggiated */
function buskStep(O,dt){const P=A().P,b=O.busk;if(!b||O.panic>40||O.run)return;const d=hyp(P.pos.x-b.x,P.pos.z-b.z);if(d>30)return;O.bt=(O.bt||0)+dt;const step=.21;
  while(O.bt>=step){O.bt-=step;const k=O.bs=(O.bs||0)+1,ch=TUNE_[Math.floor(k/8)%4],n=ch[[0,1,2,3,2,1,2,3][k%8]],g=.045*Math.pow(1-d/30,1.6);
    if(g<.002)continue;const f=440*Math.pow(2,(n-69)/12);tone({f,type:'triangle',d:.42,gain:g,attack:.004});if(k%8===0)tone({f:f/2,type:'sine',d:.7,gain:g*.8,attack:.006})}}

/* ---------------- borrowed gun: the job's one beanbag round; your own loadout waits in the car ---------------- */
let BORROW=null;
function borrow(){const a=A(),P=a.P;if(BORROW)return;BORROW={lo:Object.assign({},P.loadout),ammo:JSON.parse(JSON.stringify(P.ammo||{})),cur:P.cur};
  P.loadout.side=null;P.loadout.p1=null;P.loadout.p2=null;try{a.give('beanbag',{mag:1,extra:0,auto:true})}catch(_){}if(P.ammo.beanbag){P.ammo.beanbag.mag=1;P.ammo.beanbag.res=0}}
function giveBack(){const a=A(),P=a&&a.P;if(!BORROW||!P)return;const b=BORROW;BORROW=null;try{P.loadout.p1=null;P.loadout.p2=null;P.loadout.side=null;
    for(const k of['side','p1','p2']){const id=b.lo[k];if(id)a.give(id,{mag:0,extra:0,auto:false})}for(const id in b.ammo)if(P.ammo[id])Object.assign(P.ammo[id],b.ammo[id]);
    if(P.ammo.beanbag&&!Object.values(b.lo).includes('beanbag'))delete P.ammo.beanbag;if(b.cur&&P.weapons.includes(b.cur))a.swap(b.cur,true)}catch(e){console.warn('[arrest] loadout',e)}}

/* the open world's moving-truck set piece parks at the kerb of whichever Riverside block is mid-renovation, which can be inside the
   market: while the market runs it waits elsewhere (hidden, its collider parked), and it comes back when the job ends */
function truckAway(O){const a=A(),M=O&&a.M;if(!O||O.truckT>0&&(O.truckT-=1/30)>0)return;O.truckT=1;
  if(!O.truck){a.scene.traverse(o=>{if(!O.truck&&o.userData&&o.userData.van&&o.userData.noCompact)O.truck=o})}const T=O.truck;if(!T||!T.visible)return;
  const x=T.position.x,z=T.position.z;if(x<346||x>412||z<36||z>50)return;T.visible=false;O.truckHid=true;
  const col=(a.L.colliders||[]).find(c=>c.k==='truck');if(col&&!col.off){O.truckCol={c:col,was:{x0:col.x0,z0:col.z0,x1:col.x1,z1:col.z1,off:col.off}};Object.assign(col,{x0:-1e4,z0:-1e4,x1:-1e4,z1:-1e4,off:true})}}
function truckBack(O){if(!O)return;if(O.truckHid&&O.truck){O.truck.visible=true;O.truckHid=false}if(O.truckCol){Object.assign(O.truckCol.c,O.truckCol.was);O.truckCol=null}O.truck=null}

/* ---------------- the job ---------------- */
J.register('arrest',{
  def:{giver:'rosa',hood:'river',title:'Hands Off',role:'Rosa · Strand 2/2 · Capture alive in a crowd',place:"Riverside Farmers' Market, Main St",
    lines:["Somebody in a charity vest is working the farmers' market. 'For the garden.' I AM the garden. Not one dollar has made it to the garden.",
      "There are strollers at that market. Toddlers. Mr. Ferreira and his cane. I have seen what a panic at a crowded market does. I've stitched it up.",
      "Find him. Get him somewhere quiet. One beanbag, in front of nobody. Then I'd like a word with him."],
    obj:"Find the fake charity collector at the farmers' market, get him away from the crowd, and drop him with one beanbag without starting a panic.",
    crew:['gary'],weapons:['beanbag'],from:{place:'g_rosa'},site:'market',
    unlock:{done:['overwatch']},pay:850,par:420,winTrust:8,
    stages:['market','aside'],stageLabels:{market:'The market',aside:'Get him alone'},failPolicy:'escalate',
    medals:['Finished','One shot','One shot, panic under 10'],order:26,
    radio:[['rosa',"I'm at the garden stall. Come find me. Walk, don't run. It's a farmers' market, not a fire drill."]],
    endLine:"The tin had $412 in it. Every dollar went to the garden. The market voted to give the real charities a proper table next Saturday."},

  start(M,o){const a=A();if(LIVE.M&&LIVE.M!==M)cleanup(LIVE.M);LIVE.M=M;
    const O=M.ho={clock:0,later:[],own:[],people:[],stage:'arrive',skim:Math.floor(Math.random()*4),watch:{c:null,t:0},clues:[],wrong:0,ided:false,idHow:null,panic:0,panicPeak:0,
      drawn:false,round:1,shots:0,oneShot:false,wit:0,witK:0,ret:null,talked:false,nbOn:false,spawned:false,alertT:0,trail:[],ruses:0};
    O.castP=preload();
    for(const al of a.allies.slice()){if(al.dude&&al.dude.root.parent)al.dude.root.parent.remove(al.dude.root);if(al.tag)al.tag.remove()}a.allies.length=0;a.rebuildTargets();
    /* the street is closed for the market: ambient traffic is cleared for the job */
    try{const H_=window.__ht,OW_=H_&&H_.ow;if(OW_&&OW_.traffic)OW_.traffic(0,{player:a.P.pos,car:null,camera:a.camera,off:true})}catch(_){}
    layoutStalls();buildMarket(O);overlay(O);borrow();O.truckT=0;truckAway(O);try{a.holster(true)}catch(_){}
    if(o&&o.checkpoint)return;
    music('hub',.35)},

  upd(dt,M,F){const a=A(),O=M.ho,P=a.P;if(!O)return;O.clock+=dt;laterStep(O);if(M.state!=='go')return;
    if(!O.spawned){if(castReady()||O.clock>20)spawnCrowd(O);else{F.objs.push(['The market is setting up…',false]);return}}
    if(O.alertT>0)O.alertT-=dt;truckAway(O);
    if(O.pendingLoad)applyLoad(O);
    crowdStep(O,dt);vendorStep(O,dt);colStep(O,dt);ruseStep(O,dt);garyStep(O,dt);runStep(O,dt);downStep(O,dt);dufStep(O,dt);buskStep(O,dt);
    if(O.stage==='market'&&O.talked)watchStep(O,dt);else O.watch.c=null;
    witnessStep(O);if(O.drawn)aimCheck(O);panicStep(O,dt);
    /* drawn where he can see it: he doesn't wait around */
    const sk=O.cols[O.skim];if(O.drawn&&!O.down&&!O.run){const dx=P.pos.x-sk.x,dz=P.pos.z-sk.z,d=hyp(dx,dz),f=(-Math.sin(sk.yaw)*dx-Math.cos(sk.yaw)*dz)/(d||1);
      if(d<26&&(f>.2||d<4)&&losGrid(sk.x,sk.z,P.pos.x,P.pos.z))O.spotT=(O.spotT||0)+dt;else O.spotT=Math.max(0,(O.spotT||0)-dt*.5);
      if(O.spotT>2.6){O.spotT=0;bolt(O);say('rosa',"He saw it! Not 'in a second'. NOW. Go!",true)}}
    if(O.drawn&&kidsNear(O)!=null){/* owner rule: a kid or a stroller came within 25 m: the gun goes away */toggleDraw(O,false);say('rosa',pick(LINES.rosaKids),true)}
    if(O.drawn)P.aim=true;
    for(const p of O.people)if(!p.gone)place(p,dt);
    if(O.chat){const d=hyp(P.pos.x-O.chat.x,P.pos.z-O.chat.z);if(d>4.5)closeChat(O)}
    stageObjs(O,M,F);overlayStep(O,dt)},

  fire(){const O=H();if(!O)return;if(!O.drawn)return true;shoot(O);return true},
  hud(st){const O=H();if(!O)return;if(O.stage==='aside'||O.run||O.drawn){st.gadgets=(st.gadgets||[]).concat([{id:'ho-draw',label:O.drawn?'Holster':'Draw beanbag',key:'G',on:!!O.drawn}])}},
  pose(){const O=H();if(!O)return;const P=A().P;P.aim=!!O.drawn},

  save(M){const O=M.ho;return{st:O.stage==='arrive'||O.stage==='market'?O.stage:'aside',skim:O.skim,ided:O.ided,idHow:O.idHow,wrong:O.wrong,peak:Math.round(O.panicPeak),talked:O.talked,
      clues:O.clues.map(c=>({k:c.k,txt:c.txt})),notes:(O.cols||[]).map(c=>(c.notes||[]).map(n=>[n.k,n.icon,n.txt,n.bad?1:0]))}},
  load(M,s){const O=M.ho;if(!O||!s)return;O.skim=s.skim|0;O.ided=!!s.ided;O.idHow=s.idHow||null;O.wrong=s.wrong|0;O.panicPeak=s.peak|0;O.talked=!!s.talked;O.stage=s.st||'arrive';
    O.clues=(s.clues||[]).slice();O.savedNotes=s.notes||[];O.pendingLoad=true;O.nbOn=O.talked},

  payout(M,ok){const O=M.ho;if(!ok||!O)return[];const out=[];if(O.oneShot)out.push(['One shot',300]);if(O.panicPeak<20)out.push(['Nobody noticed · panic '+Math.round(O.panicPeak),150]);
    if(O.idHow==='tells'||O.idHow==='proof')out.push(['Proof, not a hunch',100]);if(O.wrong)out.push(['Apology muffins ×'+O.wrong,-25*O.wrong]);
    if(O.duf&&O.duf.cuffed)out.push(['Duffel guy zip-tied',0]);return out},
  medal(M){const O=M.ho;if(!O)return 1;return O.oneShot?(O.panicPeak<10?3:2):1},
  end(M,ok){if(!ok)return;const s=A().SV(),SV=window.HT&&HT.Save;if(!s||!SV)return;
    /* the money goes back to the real garden (it blooms a tier early), the market gets a real charity table, and Rosa's Triage+ perk unlocks */
    try{SV.household(s,'garden-fund')}catch(_){}try{SV.storefront(s,'market','charity-table')}catch(_){}try{SV.perk(s,'rosa',true)}catch(_){}
    s.flags=s.flags||{};s.flags.gardenEarly=true},

  test:{give(a){const H_=window.__ht;if(H_&&H_.openBridge)try{H_.openBridge()}catch(_){}a.addTrust&&a.addTrust(30,'river');
      const s=a.SV();for(const id of['gary','rick','rosa','overwatch']){const i=a.MISSIONS.findIndex(m=>m.id===id);if(i>=0&&H_&&H_.prog)H_.prog.done[i]=true;if(s&&window.HT.Save&&HT.Save.jobRec)HT.Save.jobRec(s,id).done=true}
      if(s&&s.world)s.world.bridgeOpen=true;if(s&&s.flags)s.flags.act2Intro=true;preload()},
    step:(a,t,o)=>bot(a,t,o||{}),
    sample:()=>({ho:{stage:'aside',skim:2,ided:true,idHow:'tells',wrong:1,panicPeak:12.4,talked:true,clues:[{k:'hat',txt:'Honey Lady: the fifty guy wore a ball cap.'}],
      cols:[{notes:[{k:'hat',icon:'✗',txt:'Ruled out',bad:false}]},{notes:[]},{notes:[{k:'pocket',icon:'$',txt:'Pocketed the bills, not the tin',bad:true}]},{notes:[]}]}})}
});
/* restoring a checkpoint: the clues and notes come back onto the fresh crowd */
function applyLoad(O){if(!O.spawned)return;O.pendingLoad=false;(O.savedNotes||[]).forEach((ns,i)=>{const c=O.cols[i];if(!c)return;c.notes=ns.map(n=>({k:n[0],icon:n[1],txt:n[2],bad:!!n[3]}));for(const n of c.notes)c['n_'+n.k]=1});
  O.nbDirty=true;if(O.stage==='aside'){const sk=O.cols[O.skim];sk.seen=K.idTell}O.nbOn=O.talked}

/* ---------------- objectives, markers, prompts ---------------- */
function stageObjs(O,M,F){const a=A(),P=a.P,sk=O.cols[O.skim],E=KEY_E();
  if(M.exitOpen){F.objs.push(['Back to your ride',false]);return}
  if(!O.talked){F.objs.push(['Find Rosa at the garden stall',false]);F.target={x:ROSA_FRONT.x,z:ROSA_FRONT.z,label:'Rosa'};
    F.taps.push({x:ROSA_FRONT.x,z:ROSA_FRONT.z+.4,r:2.8,txt:'Talk to Rosa',fn:()=>talkRosa(O)});return}
  if(O.stage==='market'){
    if((O.watchedAny||0)<1.2){F.objs.push(['Watch a collector: keep one in the middle of your view',false]);F.objs.push(['They wear bright vests and carry tins or clipboards',false]);
      const n=O.cols.slice().sort((p,q)=>hyp(p.x-P.pos.x,p.z-P.pos.z)-hyp(q.x-P.pos.x,q.z-P.pos.z))[0];if(n)F.target={x:n.x,z:n.z,label:n.col.label}}
    else{const s=O.cols[O.skim];F.objs.push(['Find the skimmer: watch their hands',false]);F.objs.push(['Ask the vendors: '+E+' at a stall',O.clues.length>=2]);
      F.objs.push(['Sure? Walk up to him and press '+E+' to point him out',false])}
    if(!O.chat)taps(O,F);return}
  if(O.stage==='aside'){const R=sk.ruse;
    if(O.run){F.objs.push(['He’s running: run into him to stop him',false,'warn']);F.target={x:sk.x,z:sk.z,label:'Skimmer'};if(O.round>0)F.objs.push(['Or one round: G to draw, click to fire',false]);meters(O,F);return}
    if(!R){F.objs.push(['Get him away from the crowd: walk up to him and press '+E,false]);F.target={x:sk.x,z:sk.z,label:'Skimmer'}}
    else if(R.kind==='donate')F.objs.push(['He’s following you. Lead him somewhere quiet (east end, round a corner)',false]);
    else if(R.kind==='tow'){F.objs.push([R.st==='wait'?'He’s at his car on 4th St, looking for the tow truck':'He’s hurrying to his car on 4th St. Follow him',false]);F.target={x:TOW_SPOT.x+6,z:TOW_SPOT.z,label:'His car'}}
    else if(R.kind==='gary'){F.objs.push([R.st==='wait'?'Gary has him by the bins on 4th St':'Gary is walking him round the corner. Follow at a distance',false]);if(R.st!=='talk')F.target={x:GARY_SPOT2.x,z:GARY_SPOT2.z-6,label:'4th St'}}
    const kn=kidsNear(O);if(kn!=null)F.objs.push(['Kids within 25 m: you can’t draw here',false,'warn']);
    else F.objs.push([(O.drawn?'Click to fire when the ring is green · G or right-click holsters':'G or right-click: draw the beanbag (toggle)')+' · one round',false]);
    if(!O.drawn&&kn==null&&R&&(R.st==='wait'||R.kind==='donate')&&O.wit===0&&hyp(P.pos.x-sk.x,P.pos.z-sk.z)<20&&!O.saidQuiet){O.saidQuiet=true;say('rosa',LINES.rosaQuiet,true)}
    if(!O.chat&&!R&&!O.drawn)taps(O,F);meters(O,F);return}
  if(O.stage==='down'){const D=O.duf;if(D.st==='run'){const e=D.e;if(e.state==='surrender'){F.objs.push(['Zip-tie the duffel guy ('+E+')',false]);F.target={x:e.pos.x,z:e.pos.z,label:'Zip-tie'}}
      else{F.objs.push(['Catch the duffel guy: run into him',false]);F.target={x:e.pos.x,z:e.pos.z,label:'Duffel guy'}}}
    else if(!O.tied)F.objs.push([O.rosa.st==='tie'?'Rosa is zip-tying him herself':'Rosa’s on her way over with the zip-ties',false]);if(D.st!=='run'&&O.tied)F.objs.push(['Hold on. Rosa has a few words for him',false]);meters(O,F)}}
function meters(O,F){F.meters.push({id:'panic',label:'Panic',v:O.panic,max:100,style:'bar',warn:60,icon:'eye',sub:O.panic>=60?'they’re scared':''});
  if(O.stage==='aside')F.widgets.push({id:'wit',kind:'score',label:'Eyes on you',v:O.wit,hot:O.wit>0,sub:O.wit?(O.drawn?'seeing the gun':'if you drew now'):'nobody\u2019s looking'})}
/* E goes to whatever you're facing: a collector or a vendor, scored by distance and by how far off your view it is */
function taps(O,F){const a=A(),P=a.P;let best=null,bs=1e9;
  const score=(x,z,r)=>{const d=hyp(x-P.pos.x,z-P.pos.z);if(d>r)return 1e9;const off=Math.abs(angWrap(yawTo(x-P.pos.x,z-P.pos.z)-P.yaw));return d+off*1.6};
  for(const c of O.cols){if(c.gone||c.down)continue;if(O.stage==='aside'&&!c.skim)continue;const sc=score(c.x,c.z,2.6);if(sc<bs){bs=sc;best={c}}}
  if(O.stage==='market')for(const v of O.people){if(v.kind!=='vendor')continue;const f=front(v.stall),sc=Math.min(score(f.x,f.z,2.3),score(v.x,v.z,3.4));if(sc<bs){bs=sc;best={v}}}
  if(!best)return;
  if(best.c){const c=best.c;F.taps.push({x:c.x,z:c.z,r:2.6,txt:O.stage==='aside'?'Talk to him':'Talk to the '+c.col.label.toLowerCase(),fn:()=>colChat(O,c)})}
  else{const v=best.v;F.taps.push({d:0,r:1,txt:'Chat with '+v.name,fn:()=>vendorChat(O,v)})}}
function talkRosa(O){const a=A();if(O.talked)return;O.talked=true;O.nbOn=true;O.nbDirty=true;O.stage='market';
  let t=seq(LINES.rosaBrief,3.6);later(t+.4,()=>{if(O.stage==='market'&&(O.watchedAny||0)<1.2)say('rosa',LINES.rosaWatchTip,true)});
  later(t+14,()=>{if(O.stage==='market'&&!O.clues.length)say('rosa',LINES.rosaGossip,true)});
  tone({f:880,type:'sine',d:.1,gain:.05,bus:'ui'});a.feed('Rosa gave you a notebook','info','the collectors are listed on the left')}
/* the watch tutorial beat waits for the player to actually watch someone */
J.on('pose',()=>{const O=H();if(!O||O.stage!=='market'||O.saidWatch)return;if((O.watchedAny||0)>=1.2){O.saidWatch=true;say('rosa',LINES.rosaWatchGood,true)}});

/* ---------------- input: G and right-click toggle the draw; touch: the aim button or the gadget chip ---------------- */
if(typeof addEventListener==='function'){
  addEventListener('keydown',e=>{if(e.repeat)return;const O=H();if(!O||A().M.state!=='go')return;const k=(e.key||'').toLowerCase();if(k==='g'&&!O.chat)toggleDraw(O)});
  addEventListener('mousedown',e=>{if(e.button!==2)return;const O=H();if(!O||A().M.state!=='go'||!(O.stage==='aside'||O.run))return;if(!document.pointerLockElement&&!(e.target&&e.target.tagName==='CANVAS'))return;toggleDraw(O)},true)}
function hookTouch(){const a=A();if(!a||!a.HUD||hookTouch.done||!a.HUD.on)return;hookTouch.done=true;
  a.HUD.on('gadget',id=>{const O=H();if(O&&id==='ho-draw')toggleDraw(O)});a.HUD.on('touch',(id,down)=>{const O=H();if(O&&id==='aim'&&down&&(O.stage==='aside'||O.run))toggleDraw(O)})}

/* ---------------- cleanup: free everything when the job ends, is retried or replayed ---------------- */
const LIVE={M:null};
function cleanup(M){if(!M||M.hoClean)return;M.hoClean=true;const O=M.ho;giveBack();if(!O)return;closeChat(O);truckBack(O);
  try{A().overlay('handsoff',null)}catch(_){}if(O.ov&&O.ov.el&&O.ov.el.parentNode)O.ov.el.parentNode.removeChild(O.ov.el);O.ov=null;
  for(const p of O.people){if(p.d&&p.d.root.parent)p.d.root.parent.remove(p.d.root);if(p.stroller&&p.stroller.parent)p.stroller.parent.remove(p.stroller);p.d=null;p.stroller=null}
  if(O.g&&O.g.parent)O.g.parent.remove(O.g);if(O.car&&O.car.parent)O.car.parent.remove(O.car);if(O.duf&&O.duf.bag&&O.duf.bag.parent)O.duf.bag.parent.remove(O.duf.bag);
  for(const x of O.own)try{x.dispose()}catch(_){}O.own.length=0;O.people.length=0;O.cols=null;O.g=null;O.kit=null;O.G=null;O.mats=null;O.later.length=0;
  if(document.body)document.body.classList.remove('soc-on');if(LIVE.M===M)LIVE.M=null}
J.on('pose',()=>{const M=LIVE.M;if(!M)return;const a=A(),cur=a&&a.M;if(cur!==M||M.state!=='go'){if(M.state!=='go'&&cur===M){M.hoEndT=(M.hoEndT||0)+1;if(M.hoEndT<3)return}cleanup(M)}});
J.on('hud',()=>{hookTouch();const a=A(),M=a&&a.M;
  /* warm the market cast while the job is on offer in Riverside (neighbour models load on demand) */
  if(!PRE&&a&&a.mode==='hub'){const j=J.get('arrest'),i=j&&a.MISSIONS.indexOf(j.def);if(i>=0){const H_=window.__ht;if(H_&&H_.prog&&H_.prog.done&&H_.prog.done[a.MISSIONS.findIndex(m=>m.id==='overwatch')]){PRE=true;preload()}}}
  /* the result card says what this job was about */
  if(!M||!M.def||M.def.id!=='arrest'||M.state==='go'||!M.ho||M.hoRes)return;const r=document.querySelector('.ht-result .col');if(!r)return;M.hoRes=true;const O=M.ho;
  const h2=r.querySelector('h2');if(h2&&M.state==='won')h2.textContent=O.oneShot?'One bean. Zero panic. Mostly.':'Hands off the garden money.';
  const st=r.querySelector('.ht-stats');if(st){const secs=Math.round(M.elapsed),rows=[['Rounds fired',String(O.shots),O.oneShot?'one shot':''],['Panic, worst',Math.round(O.panicPeak)+'%',O.panicPeak<10?'nobody noticed':O.panicPeak<20?'a few looks':''],
      ['Wrong guesses',String(O.wrong),O.wrong?'apology muffins':''],['Time',Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0'),'']];
    const keep=[...st.children].filter(d=>/Trust|Medal/.test((d.querySelector('b')||{}).textContent||''));st.innerHTML=rows.map(([k,v,s])=>'<div><b>'+esc(k)+'</b><span class="ht-num">'+esc(v)+'</span>'+(s?'<small>'+esc(s)+'</small>':'')+'</div>').join('');for(const d of keep)st.appendChild(d)}});
let PRE=false;

/* ---------------- the scripted player (dev/jobs-check.js) ----------------
   Plays it like a person who has never seen it: talks to Rosa, stands a few metres off and watches collectors one after another
   (the skimmer's tells only count while it looks at him), asks the honey and peach stands, then uses the tow ruse, follows him
   round the corner, draws when nobody's looking, waits for green, fires once, chases the duffel guy and zip-ties him.
   o.fail: draws in the middle of the east end with the crowd watching and stands there until the market stampedes. */
function bot(a,t,o){const M=a.M,P=a.P;if(!M||M.state!=='go'||!M.ho)return null;const O=M.ho,B=O.bot||(O.bot={phase:'',n:0,wi:0,wt:0,react:0});const H_=window.__ht;
  a.keys.e=false;if(H_)H_.mouse=false;
  if(a.CV){a.exitCar();return null}
  const walk=(x,z,sp)=>{/* through the aisle: off it on a sidewalk, go round by the 3rd St crossing first (the counters are in the way) */if((P.pos.z>45.6||P.pos.z<40.4)&&P.pos.x>AISLE.x0-2&&P.pos.x<AISLE.x1-1&&z>40&&z<46&&Math.abs(x-P.pos.x)>2.5&&hyp(x-P.pos.x,z-P.pos.z)>3){if(Math.abs(P.pos.x-378.8)>.4){x=378.8;z=P.pos.z}else{x=378.8;z=43}}
    const dx=x-P.pos.x,dz=z-P.pos.z,d=hyp(dx,dz);if(d<.35)return true;const s=Math.min(d,(sp||4.2)/30);P.pos.x+=dx/d*s;P.pos.z+=dz/d*s;a.collide(P.pos,.35);P.yaw=yawTo(dx,dz);return false};
  const look=(x,y,z)=>{const c=a.camera.position,dx=x-c.x,dz=z-c.z;P.yaw=yawTo(dx,dz);P.pitch=Math.atan2(y-c.y,hyp(dx,dz))};
  const tp=(x,z)=>{P.pos.set(x,0,z);a.collide(P.pos,.35)};
  if(M.exitOpen){const c=M.car;B.ex=(B.ex||0)+1;if(B.ex<60){walk(c.pos.x+2.4,c.pos.z,6);return null}tp(c.pos.x+2.4,c.pos.z);a.useTap=true;return null}
  if(!O.spawned)return null;
  if(!O.talked){if(walk(ROSA_FRONT.x,ROSA_FRONT.z-.6))a.useTap=true;return null}
  /* a choice strip is open: a person reads it for a moment, then picks */
  if(O.chat){B.read=(B.read||0)+1;if(B.read>24&&O.chat.kit){B.read=0;O.chat.kit.pick(B.pickI||0)}return null}
  const sk=O.cols[O.skim];
  if(O.stage==='market'){
    /* gossip first: honey and peach */
    for(const id of['honey','peach']){const v=O.people.find(q=>q.kind==='vendor'&&q.stall.id===id);if(v&&!v.asked){const f=front(v.stall);if(walk(f.x,f.z-(v.stall.side==='n'?-.5:.5))){B.pickI=0;a.useTap=true}return null}}
    /* then watch: cycle through the collectors the notebook hasn't ruled out, a few seconds each, from about 7 m */
    const cand=O.cols.filter(c=>!(c.notes||[]).some(n=>n.k==='hat'||n.k==='carry'||n.k==='cleared'));B.wt-=1/30;
    if(B.wt<=0){B.wi=(B.wi+1)%cand.length;B.wt=cand.length>1?6:999}const c=cand[B.wi%cand.length]||sk;
    const tx=clamp(c.x+(c.x<380?5.5:-5.5),AISLE.x0+1,AISLE.x1-1),tz=c.z<43?44.6:41.6;walk(tx,tz,3);look(c.x,1.3,c.z);
    if(o.wrong&&!O.wrong){const w=O.cols.find(q=>!q.skim);B.pickI=2;if(hyp(w.x-P.pos.x,w.z-P.pos.z)>1.6)walk(w.x+1,w.z,5);else{look(w.x,1.3,w.z);a.useTap=true}return null}
    if(o.accuse||(O.clock>240)){B.pickI=2;if(hyp(sk.x-P.pos.x,sk.z-P.pos.z)>2)walk(sk.x+1,sk.z,5);else a.useTap=true}
    return null}
  if(O.stage==='aside'){
    if(o.fail){if(walk(396,43.2,4.2)){look(sk.x,1.2,sk.z);if(!O.drawn)toggleDraw(O)}return null}
    if(O.run){walk(sk.x,sk.z,6.4);return null}
    const R=sk.ruse;
    if(!R){if(hyp(sk.x-P.pos.x,sk.z-P.pos.z)>1.8){walk(sk.x+.8,sk.z+.3,4.6);return null}B.pickI=o.ruse==='donate'?0:o.ruse==='gary'?2:1;a.useTap=true;return null}
    const fireWhenGreen=()=>{look(sk.x,1.15,sk.z);if(!O.drawn){B.wait=(B.wait||0)+1;if(kidsNear(O)==null&&(O.wit===0||O.wit<=1&&B.wait>150)){B.react=(B.react||0)+1;if(B.react>12){toggleDraw(O);B.react=0}}return}if(O.ret==='ok'){B.hold=(B.hold||0)+1;if(B.hold>10&&H_){H_.mouse=true;B.hold=0}}};
    if(R.kind==='donate'){/* lead him up 4th St and round the corner, at a walk he can keep up with */const way=[{x:405.5,z:43.2},{x:410.8,z:41.6},{x:410.8,z:24},{x:409.5,z:16.5}];B.wk=B.wk||0;
      if(B.wk<way.length){if(hyp(sk.x-P.pos.x,sk.z-P.pos.z)>6)return null;if(walk(way[B.wk].x,way[B.wk].z,2.3))B.wk++;return null}fireWhenGreen();return null}
    if(R.kind==='gary'){const way=[{x:405.5,z:43.2},{x:410.8,z:45.5},{x:410.9,z:55.6}];B.gk=B.gk||0;if(R.st!=='wait'){if(B.gk<2&&hyp(sk.x-P.pos.x,sk.z-P.pos.z)<9&&walk(way[B.gk].x,way[B.gk].z,2.6))B.gk++;return null}
      if(B.gk<way.length){if(walk(way[B.gk].x,way[B.gk].z,3))B.gk++;return null}fireWhenGreen();return null}
    if(R.kind==='tow'){if(R.st==='go'||R.st==='back'){/* follow at a distance */const d=hyp(sk.x-P.pos.x,sk.z-P.pos.z);if(d>9)walk(sk.x,sk.z+3,3.2);return null}
      /* he's at the car: stand off to the south and take the shot */
      if(!walk(TOW_SPOT.x+7.5,TOW_SPOT.z+.6,3.2))return null;look(sk.x,1.15,sk.z);
      if(!O.drawn){if(kidsNear(O)==null&&O.wit===0){B.react=(B.react||0)+1;if(B.react>20){toggleDraw(O);B.react=0}}return null}
      if(O.ret==='ok'){B.hold=(B.hold||0)+1;if(B.hold>12&&H_){H_.mouse=true;B.hold=0}}return null}
    return null}
  if(O.stage==='down'){const D=O.duf,e=D.e;if(D.st==='run'){const d=hyp(e.pos.x-P.pos.x,e.pos.z-P.pos.z);if(B.dd!=null&&d>B.dd-.05)B.stuck=(B.stuck||0)+1;else B.stuck=0;B.dd=d;
      if(B.stuck>20){B.stuck=0;tp(e.pos.x+(P.pos.x-e.pos.x)/d*3,e.pos.z+(P.pos.z-e.pos.z)/d*3)}
      if(e.state==='surrender'){if(walk(e.pos.x+.8,e.pos.z,6))a.useTap=true}else walk(e.pos.x,e.pos.z,6.5)}return null}
  return null}
})();
