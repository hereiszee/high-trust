/* =====================================================================
   SIGN OF THE TIMES (SPEC3 2.14): night sabotage. Sal's strand 2/2, the first job built on HT.Stealth (js/stealth.js, loaded from here).
   The fake tow outfit from Hitch Happens is back as "Mill St Auto Recovery". Its four tow trucks roll at dawn to hook Riverside cars.
   Sal wants them to not roll: nobody hurt, nothing broken a pump can't fix. Park two blocks away, get into the yard (the gate crack
   by Walt's lawn chair, over the east fence, through the shop bay past Tiny, or the hole behind the tarp you only notice in the dark
   corner), let the air out of two tyres on each truck (hold E, crouched; it hisses), hang Sal's sign over the bay, and get out unseen.
   Optional: the dispatch ledger off the manager's desk, Tiny's squeaky hot dog in Tiny's bed. Fail-soft (owner decision 2): being
   seen sends a guard after you; break his line of sight and hide, or get caught and go back to the checkpoint. Dawn (5:00) is the
   hard clock. No guns tonight. Zip-ties are allowed from behind ("very assertive cable management"), but gold means you never
   touched anyone. Night-vision goggles (N, from Hank's) show the patrol routes, the noisy ground and the dark corners; never required.

   Stages ([CP]): approach -> job1..job4 (after each finished objective: a truck or the sign) -> exfil (all done, back to the van).
   Files: js/jobs/sabotage.js, js/stealth.js, js/vehicles.js (setDeflate), js/ai.js (ai.blind). Tests: node dev/stealth.test.js,
   node dev/jobs-check.js sabotage --retry --replay --shots, node dev/jobs/sabotage.js [--shots] [--nvg] (human-paced, screenshots).
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api,H=()=>window.__ht||{};
(function(){const d=typeof document!=='undefined'?document:null;if(!d||!d.head||!d.createElement)return;
  if(!(window.HT.Stealth&&HT.Stealth.ready)&&!d.getElementById('ht-stealth-js')){const s=d.createElement('script');s.id='ht-stealth-js';s.src='js/stealth.js';s.onload=()=>{try{HT.Stealth.bind()}catch(_){}};d.head.appendChild(s)}})();
const ST=()=>window.HT&&HT.Stealth&&HT.Stealth.ready?HT.Stealth:null;

/* ---------------- tuning ---------------- */
const K={dawn:840,clock0:190,clock1:300,/* real seconds to dawn; 3:10 AM -> 5:00 AM */
  valveHold:2,hiss:3,hissEvery:.45,flatAfter:4,drillR:8,signHold:3.2,ledgerHold:1.2,toyHold:1,tieHold:2,tieNoise:2,
  treats:3,tossMin:3,tossMax:11,plap:3.2,tinyEat:6.5,chew:22,chain:5.6,barkCd:3,
  caughtR:1.3,seenMax:3.2,seenDecay:.6,
  walk:{walt:1.05,kyle:1.35,boss:1.25},run:{walt:2.5,kyle:3.7,boss:3.3},
  carryMul:.62,leash:95,
  pay:{ghost:400,toy:50,ledger:150},trust:{ghost:8,tie:3}};
const D2R=Math.PI/180,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a},clamp=(v,a,b)=>v<a?a:v>b?b:v,hyp=Math.hypot;
const yawTo=(dx,dz)=>Math.atan2(dx,dz);/* character convention: forward = (sin, cos) */
const pickN=(a,n)=>a[((n%a.length)+a.length)%a.length];

/* ---------------- the yard (metres; site millshop: office x418-424 z106-110, shop x426-436 z106-110, yard x418-436 z112-120.9) ---------------- */
const Y={x0:417.2,x1:436.8,z0:112,z1:120.85,gateX0:424,gateX1:430,gateZ:121,gateShift:5.1,
  trucks:[{id:'t1',x:421.3,z:114.05,yaw:-Math.PI/2,name:'the northwest truck'},{id:'t2',x:432.7,z:114.05,yaw:Math.PI/2,name:'the northeast truck'},
    {id:'t3',x:421.3,z:118.95,yaw:-Math.PI/2,name:'the southwest truck'},{id:'t4',x:432.7,z:118.95,yaw:Math.PI/2,name:'the southeast truck'}],
  chair:{x:426.1,z:119.85,yaw:Math.PI-.25},gateLight:{x:430.25,y:2.35,z:121.05},
  floods:[{x:420,z:112.25,y:2.95},{x:434,z:112.25,y:2.95}],shopLight:{x:430,z:107.6,y:3.2},
  desk:{x:419.6,z:107.3},officeDoor:{x:421,z:111.4},bed:{x:432.2,z:108.9},bay:{x:428,z:104.6},
  sign:{x:427,z:103.86,y:3.98,w:9,h:1.75},mount:{x:427.4,z:102.95},
  tarp:{x:418.55,z:116.85},potty:{x:435.85,z:117.35},hole:{x:417,z:115.6},vault:{x:437,z:115.6},
  tyres:[{x:427.7,z:115.55,n:4},{x:425.9,z:118.55,n:3},{x:418.2,z:112.7,n:3}],drums:[{x:431.4,z:116.85},{x:430.7,z:117.3}],
  metal:[{x:427,z:119.55,w:1.6,d:1.1,yaw:.12},{x:424.4,z:116.6,w:1.3,d:1,yaw:-.3}],chains:[{x:434.6,z:116.1,w:1.2,d:.8}],gravel:{x0:423.6,z0:120.3,x1:430.6,z1:121.8}};
/* the routes the three of them walk (deterministic: dt only), with what they do at each stop */
const ROUTES={
  walt:[{sit:34},{go:[427,117.6]},{go:[419.8,116.6]},{look:3.2,a:-Math.PI/2,s:.9},{go:[427,116.6]},{go:[434.6,116.6]},{look:3,a:Math.PI/2,s:.9},{go:[427,116.4]},
    {go:[425.4,112.6]},{go:[421,112.55]},{act:'refill',t:6,a:Math.PI},{go:[425.4,112.6]},{go:[427,117.4]},{go:[Y.chair.x,Y.chair.z+.05]}],
  kyle:[{go:[414.7,122.7]},{look:2.6,a:Math.PI/2,s:.8},{go:[427,122.75]},{look:2.2,a:Math.PI,s:.6},{go:[439.3,122.7]},{look:2.6,a:-Math.PI/2,s:.8},{go:[439.35,112.5]},{go:[439.3,102.7]},
    {look:2.4,a:-Math.PI/2,s:.8},{go:[427,102.6]},{look:2,a:Math.PI,s:.5},{go:[414.7,102.7]},{look:2.4,a:Math.PI/2,s:.8},{go:[414.65,112.5]}],
  boss:[{act:'desk',t:26},{go:[421,110.4]},{go:[421,112.5]},{go:[427.2,112.5]},{go:[429.4,110.4]},{go:[431.2,109.6]},{act:'pet',t:4.5},{go:[428.6,106.3]},{go:[428.2,105.1]},
    {look:5,a:Math.PI,s:.7},{go:[428.6,106.6]},{go:[427.2,111.2]},{go:[427.2,112.5]},{go:[421,112.5]},{go:[421,110.4]},{go:[Y.desk.x+.9,Y.desk.z+.2]}]};
const CAST={walt:{key:'nb_pops',name:'WALT',look:{shirt:'#4f6b8a',pants:'#3b3b3b',cap:'#24364d'}},kyle:{key:'thug_track',name:'KYLE',look:{shirt:'#e88a1a',pants:'#2b2b2b'}},
  boss:{key:'thug_jacket',name:'MANAGER',look:{shirt:'#2d2d33',pants:'#22252b'}}};
const ORDER=['walt','kyle','boss'];

/* ---------------- lines ---------------- */
const L={
  open:[['sal',"Park's good. Two blocks is close enough to walk and far enough that nobody writes down a minivan."],
    ['sal',"Walt's on the gate tonight. Thermos, radio, lawn chair. He's sixty-eight and he sees everything. Eventually."],
    ['sal',"Kyle walks the fence with a flashlight. The manager's in the office, and then there's Tiny."],['you',"Tiny?"],['sal',"You'll see Tiny."],
    ['sal',"Stay low, stay dark, stay quiet. Floodlights are the enemy. The shadows behind the trucks are your friends."]],
  nvgYes:['sal',"Those goggles from Hank's? Put 'em on. N. You'll see their walking routes like somebody painted them on the ground."],
  nvgNo:['sal',"Hank sells night-vision goggles, by the way. For next time. You can do this one the old-fashioned way: squinting."],
  flash:['sal',"Flashlight off. Nothing says 'burglar' like a flashlight. Except a mask. Don't wear a mask."],
  route:['sal',"Ways in: the crack in the gate by Walt's chair, over the east fence, or through the shop bay on Mill. Mind the dog in the bay."],
  sign:['sal',"My sign's in the back of your van. It's big. You'll walk slow and you can't crouch with it, so pick your moment."],
  noGuns:"No guns tonight. Sal's rules: nobody gets hurt, nothing gets broken that a pump can't fix.",
  hiss:["Tsssss.","That's the sound of justice.","Sorry, buddy. It's for the neighbourhood.","Quarter turn. Tsssss.","Easy... easy..."],
  tyreDone:["One down.","Flat as a pancake. A sad, expensive pancake.","That one's sitting on its rim now.","Tyre's having a lie-down."],
  truckDone:[['sal',"That's one truck taking a personal day."],['sal',"Two trucks down. They'll be calling somebody for a pump. Guess who has a pump."],
    ['sal',"Three. I can hear my phone ringing in the morning already."],['sal',"All four trucks sitting on their rims. Beautiful. Don't get cocky."]],
  heardHiss:[['Kyle',"You hear hissing?"],['Walt',"That's the radiator. It's always the radiator."]],
  curious:{walt:["Hm?","Somebody there?","...Raccoon?","Walter, you're hearing things."],kyle:["Huh.","Hello?","Is that... no.","Who's there? ...Nobody. Cool."],boss:["Kyle, is that you?","Hello?","Somebody back there?"]},
  search:{walt:["Somebody back there? ...It's a raccoon. Big raccoon. In cargo shorts.","I've got a flashlight and a bad hip. Don't make me use either.","Come on out. I won't tell anybody. I'll tell everybody."],
    kyle:["I'm gonna check it out. I'm checking it out. I'm brave.","If you're a raccoon, make a raccoon noise.","Okay, okay, okay. Just looking. Just a guy looking."],
    boss:["If that's you, Kyle, I'm docking your pay.","This is a legal impound lot! ...At night it's more of a lot.","Who's out here?"]},
  calm:{walt:["Nothing. Getting old, Walter.","Must've been the wind. Or my knees.","Back to the chair."],kyle:["Probably the wind. Do we have wind?","Nope. Nobody. Nobody's ever there.","Cool. Cool cool cool."],
    boss:["Nothing. Great. Love that.","I'm gonna install cameras. Real ones this time.","Back to work. Back to... sitting."]},
  alert:{walt:["Hey! I see you! I see you... slowly!","Hey! Stop right there! Or slow down, at least!"],kyle:["Hey! HEY! ...You again?!","It's the minivan guy! HEY!"],boss:["Kyle. KYLE. It's the minivan guy!","You! From the impound thing!"]},
  lost:{walt:["Where'd he go? I swear he was right there.","Lost him. He's quick for a dad."],kyle:["Where'd he go? Where'd he GO?","He was right... okay. Okay. I'm telling people."],boss:["Find him! ...Somebody find him!","Unbelievable. Un-be-lievable."]},
  caught:{walt:"Gotcha. Sit down on that tyre, son. I'm calling Officer Dana.",kyle:"Got you! Sit! Sit on that tyre! Walt, call Dana!",boss:"Got you. Sit. Kyle, call Officer Dana. Use your phone, not the fake one."},
  tied:{walt:"Is this... is this a zip tie? At my age?",kyle:"Oh, come ON.",boss:"This is a legal impou— mmf. Fine. Fine."},
  tiedYou:["Very assertive cable management.","Sorry. You'll be fine. Morning shift'll cut you loose.","Shh. Think of it as a hug from a hardware store."],
  findTied:{walt:"Kyle? Why are you zip-tied to a tyre?",kyle:"Walt? Walt, are you... are you in time-out?",boss:"Why is everybody sitting down? Who's sitting everybody down?"},
  bark:["*WOOF* *WOOF*","*WOOF*","*ruff* *WOOF*"],
  treatLand:[['you',"Shh. Shhh. Good boy. Who's a good boy. Not your owner."],['Tiny',"*happy chewing*"]],
  treatMiss:["That landed somewhere. Loudly.","Plap. That's a treat in the dirt."],
  toy:[['you',"That's yours, buddy. Squeaky hot dog. Sal says it's your favourite."],['Tiny',"*squeak* *squeak* *happy chewing*"]],
  goodBoy:"Good boy. Tiny won't make a peep for the rest of the night.",
  pet:["Shh. Good boy. Keep chewing.","Who's a good boy. You are. Don't tell anyone I was here."],
  ledger:[['you',"Dispatch ledger. 'Impound fees, Riverside: lots.' Sal's going to frame this."]],
  signGrab:"Okay. Big sign. Walk slow. Look like a guy who carries signs at three in the morning.",
  signUp:[['you',"Bolting it up. Quietly. This drill has one setting and it's 'neighbour'."]],
  signDone:[['you',"UNDER NEW MANAGEMENT. Call Sal. Honest Towing."],['sal',"Ooh. Crooked? Doesn't matter. It's perfect."]],
  allDone:['sal',"That's all four and the sign. Back to the van. Walk, don't run. Running is how you get remembered."],
  dawn30:['sal',"Sky's getting lighter. Half an hour till those trucks are supposed to roll."],dawn10:['sal',"Ten minutes. The birds are up. Move it."],
  dawnFail:"The sun's up, the trucks rolled out on time, and somebody on Oak St is about to pay four hundred bucks.",
  leash:"You're wandering off. The yard's back that way.",
  ending:[['Walt',"'Honest Towing'? ...Who's Sal?"],['sal',"Four trucks with flat tyres. Guess who they'll call. Guess who's honest. Guess who has a payment plan."]],
  caughtFail:"Caught. Officer Dana gives you a ride back to your van and a long, tired look. Try it again from the checkpoint."};

/* ---------------- small helpers ---------------- */
const pick=a=>a[Math.floor(Math.random()*a.length)];
function radio(a,w,t,front){try{a.radio(w,t,front)}catch(_){}}
function lineSeq(M,list,gap){for(const[i,l]of list.entries())M.queue.push({t:(gap||3.2)*i,w:l[0],x:l[1]})}
function say(M,who,txt,front){const a=A();M.queue.push({t:0,w:who,x:txt,front})}
/* things this job builds and must dispose: geometries, materials, textures (shared across the job, freed in cleanup) */
function own(M,x){(M.vis.own||(M.vis.own=[])).push(x);return x}
function matC(M,col,o){const a=A();const m=new a.THREE.MeshStandardMaterial(Object.assign({color:a.lin(col),roughness:.7,metalness:.05},o||{}));return own(M,m)}
function canvasTex(M,w,h,draw){const T3=A().THREE,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new T3.CanvasTexture(c);if(T3.sRGBEncoding)t.encoding=T3.sRGBEncoding;t.anisotropy=4;return own(M,t)}
/* merge simple parts into one mesh per material: [{geo, mat, x,y,z, rx,ry,rz, sx,sy,sz}] */
function mergeParts(M,parts,parent,o){const a=A(),T3=a.THREE,byMat=new Map();o=o||{};
  for(const p of parts){const g=p.geo.clone();const m4=new T3.Matrix4().compose(new T3.Vector3(p.x||0,p.y||0,p.z||0),new T3.Quaternion().setFromEuler(new T3.Euler(p.rx||0,p.ry||0,p.rz||0,'YXZ')),new T3.Vector3(p.sx||1,p.sy||1,p.sz||1));
    g.applyMatrix4(m4);const gi=g.index?g.toNonIndexed():g;if(gi!==g)g.dispose();(byMat.get(p.mat)||byMat.set(p.mat,[]).get(p.mat)).push(gi)}
  const out=[];for(const[m,gs]of byMat){let n=0;for(const g of gs)n+=g.attributes.position.count;const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2);let k=0;
    for(const g of gs){P.set(g.attributes.position.array,k*3);if(g.attributes.normal)N.set(g.attributes.normal.array,k*3);if(g.attributes.uv)U.set(g.attributes.uv.array,k*2);k+=g.attributes.position.count;g.dispose()}
    const bg=new T3.BufferGeometry();bg.setAttribute('position',new T3.BufferAttribute(P,3));bg.setAttribute('normal',new T3.BufferAttribute(N,3));bg.setAttribute('uv',new T3.BufferAttribute(U,2));bg.computeBoundingSphere();own(M,bg);
    const mesh=new T3.Mesh(bg,m);mesh.castShadow=o.shadow!==false;mesh.receiveShadow=true;parent.add(mesh);out.push(mesh)}
  for(const p of parts)if(p.tmp)p.geo.dispose();return out}

/* ---------------- props: the yard dressing, lights, the trucks, Sal's sign ---------------- */
function buildYard(M){const a=A(),T3=a.THREE,g=new T3.Group();g.name='sabotageYard';a.wmAdd(g);M.vis.g=g;
  const G={box:new T3.BoxGeometry(1,1,1),cyl:new T3.CylinderGeometry(1,1,1,16),cyl8:new T3.CylinderGeometry(1,1,1,8),tor:new T3.TorusGeometry(.31,.12,8,18),sph:new T3.SphereGeometry(1,12,8)};
  const m={tarp:matC(M,'#3b5f86',{roughness:.85}),tarp2:matC(M,'#2f4e70',{roughness:.9}),wood:matC(M,'#7a5a3a',{roughness:.9}),rubber:matC(M,'#121212',{roughness:.92}),
    steel:matC(M,'#8d969c',{roughness:.38,metalness:.75}),rust:matC(M,'#7b4a2c',{roughness:.8,metalness:.35}),drum:matC(M,'#2e5e8a',{roughness:.5,metalness:.35}),drum2:matC(M,'#a8322a',{roughness:.5,metalness:.35}),
    potty:matC(M,'#2f7d4f',{roughness:.6}),pottyR:matC(M,'#e8e4da',{roughness:.6}),dark:matC(M,'#1d1f22',{roughness:.7}),al:matC(M,'#c8ccd0',{roughness:.35,metalness:.6}),
    webG:matC(M,'#2f8f5a',{roughness:.8}),webW:matC(M,'#f2efe6',{roughness:.8}),thermos:matC(M,'#b8322c',{roughness:.35,metalness:.4}),desk:matC(M,'#5d4630',{roughness:.6}),paper:matC(M,'#efe9d8',{roughness:.9}),
    cab:matC(M,'#6f7880',{roughness:.5,metalness:.5}),chain:matC(M,'#9aa0a4',{roughness:.3,metalness:.85})};M.vis.m=m;
  const P=[];const B=(mat,x,y,z,w,h,d,ry,rx,rz)=>P.push({geo:G.box,mat,x,y,z,sx:w,sy:h,sz:d,ry:ry||0,rx:rx||0,rz:rz||0});const C=(mat,x,y,z,r,h,o)=>P.push(Object.assign({geo:G.cyl,mat,x,y,z,sx:r,sy:h,sz:r},o||{}));
  /* tarp-covered pallet of parts (hide under it): pallet slats, lumpy tarp, bungee cords */
  {const t=Y.tarp;for(let i=0;i<3;i++)B(m.wood,t.x,.06,t.z-.45+i*.45,1.25,.12,.14);B(m.wood,t.x,.15,t.z,1.3,.06,1.1);
    P.push({geo:G.sph,mat:m.tarp,x:t.x-.18,y:.42,z:t.z-.2,sx:.66,sy:.4,sz:.5},{geo:G.sph,mat:m.tarp,x:t.x+.25,y:.38,z:t.z+.22,sx:.55,sy:.34,sz:.45},{geo:G.sph,mat:m.tarp2,x:t.x+.05,y:.55,z:t.z,sx:.5,sy:.32,sz:.45});
    B(m.tarp2,t.x,.3,t.z,1.32,.42,1.12);B(m.drum2,t.x,.47,t.z-.24,1.36,.025,.03);B(m.drum2,t.x,.47,t.z+.26,1.36,.025,.03)}
  /* porta-potty (hide inside): shell, roof, vent pipe, door with a latch dial */
  {const p=Y.potty;B(m.potty,p.x,1.15,p.z,1.12,2.3,1.12);B(m.pottyR,p.x,2.36,p.z,1.2,.12,1.2);C(m.dark,p.x+.32,2.6,p.z+.3,.05,.5);B(m.pottyR,p.x-.565,1.05,p.z,.03,1.9,.8);C(m.dark,p.x-.585,1.12,p.z+.28,.03,.06,{rz:Math.PI/2})}
  /* tyre stacks, drums, sheet-metal plates on the ground, a heap of tow chains */
  for(const s of Y.tyres)for(let i=0;i<s.n;i++)P.push({geo:G.tor,mat:m.rubber,x:s.x+(i%2)*.04,y:.13+i*.24,z:s.z,rx:Math.PI/2,sx:1.25,sy:1.25,sz:1.6});
  Y.drums.forEach((d,i)=>{C(i?m.drum2:m.drum,d.x,.45,d.z,.29,.9);C(m.dark,d.x,.91,d.z,.3,.02)});
  for(const s of Y.metal)B(m.rust,s.x,.012,s.z,s.w,.022,s.d,s.yaw);
  for(const c of Y.chains)for(let i=0;i<7;i++)P.push({geo:G.tor,mat:m.chain,x:c.x-.45+i*.15,y:.04+(i%3)*.03,z:c.z+((i*37)%5-2)*.07,rx:Math.PI/2+(i%2)*.9,ry:i*.7,sx:.32,sy:.32,sz:.6});
  /* Walt's post: lawn chair, side crate with the thermos and the radio */
  {const c=Y.chair,cs=Math.cos(c.yaw),sn=Math.sin(c.yaw),Q=(u,v)=>[c.x+u*cs+v*sn,c.z-u*sn+v*cs];
    for(const s of[-1,1]){let q=Q(s*.27,0);B(m.al,q[0],.36,q[1],.03,.03,.62,c.yaw);q=Q(s*.27,-.28);B(m.al,q[0],.18,q[1],.03,.42,.03,c.yaw);q=Q(s*.27,.26);B(m.al,q[0],.18,q[1],.03,.42,.03,c.yaw);q=Q(s*.27,-.36);B(m.al,q[0],.62,q[1],.03,.6,.03,c.yaw,.25)}
    for(let i=0;i<5;i++){const q=Q(0,-.24+i*.12);B(i%2?m.webG:m.webW,q[0],.37,q[1],.54,.012,.07,c.yaw)}for(let i=0;i<5;i++){const q=Q(0,-.36-i*.026);B(i%2?m.webG:m.webW,q[0],.46+i*.1,q[1],.54,.07,.012,c.yaw,.25)}
    const k=Q(.62,.05);B(m.wood,k[0],.22,k[1],.42,.44,.36,c.yaw);M.vis.radioAt={x:k[0],z:k[1]};
    C(m.thermos,k[0]-.09,.56,k[1]+.04,.055,.22);C(m.dark,k[0]-.09,.69,k[1]+.04,.058,.05);B(m.dark,k[0]+.08,.53,k[1]-.02,.2,.14,.08,c.yaw);C(m.steel,k[0]+.15,.68,k[1]-.02,.006,.22)}
  /* the office: desk, chair, filing cabinet; the ledger (its own mesh: it can be taken) */
  {const d=Y.desk;B(m.desk,d.x,.74,d.z,1.5,.06,.75);for(const[u,v]of[[-.68,-.32],[.68,-.32],[-.68,.32],[.68,.32]])B(m.dark,d.x+u,.36,d.z+v,.05,.72,.05);
    B(m.cab,418.55,.65,109.3,.5,1.3,.6);B(m.dark,d.x+.2,.45,d.z+.75,.5,.08,.5);B(m.dark,d.x+.2,.75,d.z+.98,.5,.55,.06);
    B(m.paper,d.x-.35,.78,d.z-.1,.3,.01,.22,.2);C(m.thermos,d.x+.55,.82,d.z-.2,.045,.12);C(m.dark,d.x-.62,.9,d.z-.25,.07,.3);B(m.dark,d.x-.62,1.06,d.z-.15,.06,.04,.25,0,.6)}
  /* the stepladder under the sign on Mill St */
  {const s=Y.mount;for(const u of[-.24,.24]){B(m.al,s.x+u,1.0,s.z+.25,.05,2.05,.05,0,.18);B(m.al,s.x+u,.95,s.z-.18,.05,1.95,.05,0,-.22)}for(let i=1;i<6;i++)B(m.al,s.x,i*.34,s.z+.25-i*.06,.5,.035,.08)}
  mergeParts(M,P,g);
  /* noisy ground: gravel decal at the gate, plus a faint amber outline on the plates/chains that the goggles pick out */
  const gt=canvasTex(M,256,64,(c,w,h)=>{c.clearRect(0,0,w,h);for(let i=0;i<900;i++){const v=110+Math.random()*90|0;c.fillStyle=`rgba(${v},${v-6},${v-14},${.55+Math.random()*.4})`;c.beginPath();c.arc(Math.random()*w,Math.random()*h,.8+Math.random()*1.8,0,6.28);c.fill()}});
  const gv=Y.gravel,gp=own(M,new T3.PlaneGeometry(gv.x1-gv.x0,gv.z1-gv.z0));gp.rotateX(-Math.PI/2);const gm=new T3.Mesh(gp,own(M,new T3.MeshStandardMaterial({map:gt,transparent:true,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})));
  gm.position.set((gv.x0+gv.x1)/2,.015,(gv.z0+gv.z1)/2);gm.receiveShadow=true;g.add(gm);
  const hl=own(M,new T3.MeshBasicMaterial({color:new T3.Color(1,.62,.12),transparent:true,opacity:0,depthWrite:false,blending:T3.AdditiveBlending,toneMapped:false,fog:false}));M.vis.noisyMat=hl;
  const pg=own(M,new T3.PlaneGeometry(1,1));pg.rotateX(-Math.PI/2);for(const s of[...Y.metal,...Y.chains,{x:(gv.x0+gv.x1)/2,z:(gv.z0+gv.z1)/2,w:gv.x1-gv.x0,d:gv.z1-gv.z0,yaw:0}]){const q=new T3.Mesh(pg,hl);q.scale.set(s.w+.2,1,s.d+.2);q.rotation.y=s.yaw||0;q.position.set(s.x,.03,s.z);q.renderOrder=3;g.add(q)}
  /* the hole in the west fence behind the tarp: a peeled-back flap of chain-link (dark, easy to miss without goggles) */
  {const ct=canvasTex(M,64,64,(c,w,h)=>{c.clearRect(0,0,w,h);c.strokeStyle='rgba(190,196,200,.9)';c.lineWidth=2;for(let i=-64;i<128;i+=16){c.beginPath();c.moveTo(i,0);c.lineTo(i+64,64);c.stroke();c.beginPath();c.moveTo(i+64,0);c.lineTo(i,64);c.stroke()}});
    ct.wrapS=ct.wrapT=T3.RepeatWrapping;ct.repeat.set(1.5,1.6);const fg=own(M,new T3.PlaneGeometry(.95,1.05));fg.translate(.475,.525,0);
    const fl=new T3.Mesh(fg,own(M,new T3.MeshStandardMaterial({map:ct,transparent:true,alphaTest:.3,side:T3.DoubleSide,roughness:.5,metalness:.6})));fl.position.set(Y.hole.x-.02,0,Y.hole.z-.45);fl.rotation.y=-Math.PI/2-.9;fl.rotation.z=-.08;g.add(fl);
    const hg=own(M,new T3.PlaneGeometry(.12,1.1));const ring=new T3.Mesh(hg,hl);ring.position.set(Y.hole.x+.03,.55,Y.hole.z);ring.rotation.y=Math.PI/2;ring.scale.set(8,1,1);g.add(ring);M.vis.holeRing=ring}
  /* lights: two floods over the yard, the work light on the gate post, the shop's fluorescent tube, the desk lamp */
  const glowT=canvasTex(M,128,128,(c,w,h)=>{const r=c.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,.9)');r.addColorStop(.45,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=r;c.fillRect(0,0,w,h)});
  const poolG=own(M,new T3.PlaneGeometry(1,1));poolG.rotateX(-Math.PI/2);
  const pool=(x,z,sx,sz,col,op)=>{const mm=own(M,new T3.MeshBasicMaterial({map:glowT,color:new T3.Color(col),transparent:true,opacity:op,depthWrite:false,blending:T3.AdditiveBlending,toneMapped:false,fog:false,polygonOffset:true,polygonOffsetFactor:-4}));
    const q=new T3.Mesh(poolG,mm);q.position.set(x,.04,z);q.scale.set(sx,1,sz);q.renderOrder=2;g.add(q);return q};
  const q=H().render&&H().render.q,shadows=q==='high'||q==='med';M.vis.lights=[];
  for(const f of Y.floods){const s=new T3.SpotLight(0xfff1d6,0,16,58*D2R,.45,1.3);s.position.set(f.x,f.y,f.z+.15);s.target.position.set(f.x,0,f.z+6.2);
    if(shadows){s.castShadow=true;s.shadow.mapSize.set(512,512);s.shadow.camera.near=.5;s.shadow.camera.far=16;s.shadow.bias=-.0008}g.add(s);g.add(s.target);M.vis.lights.push({l:s,i:3.2});
    pool(f.x,f.z+4.2,9,8.5,'#fff0d0',.32);
    const bg=own(M,new T3.CylinderGeometry(.18,3.6,f.y,20,1,true));bg.translate(0,-f.y/2,0);const bm=own(M,new T3.MeshBasicMaterial({map:glowT,color:new T3.Color('#fff2d8'),transparent:true,opacity:.07,depthWrite:false,blending:T3.AdditiveBlending,side:T3.DoubleSide,toneMapped:false,fog:false}));
    const beam=new T3.Mesh(bg,bm);beam.position.set(f.x,f.y,f.z+.2);beam.rotation.x=-.55;beam.renderOrder=4;g.add(beam);
    M.S.light({x:f.x,y:f.y,z:f.z+.15,r:10.5,i:.95,yaw:0,half:62*D2R})}
  {const gl=Y.gateLight,s=new T3.PointLight(0xffd9a0,0,8,1.6);s.position.set(gl.x-.3,gl.y,gl.z-.3);g.add(s);M.vis.lights.push({l:s,i:1.3});pool(gl.x-1.6,gl.z-1.4,6.5,5.5,'#ffd9a0',.3);
    const fx=[];B(m.dark,gl.x,gl.y,gl.z,.22,.16,.2);M.S.light({x:gl.x-.3,y:gl.y,z:gl.z-.3,r:5.2,i:.92});
    const lamp=new T3.Mesh(G.box,own(M,new T3.MeshBasicMaterial({color:new T3.Color(2.2,1.9,1.3),toneMapped:false})));lamp.scale.set(.18,.08,.14);lamp.position.set(gl.x-.12,gl.y-.06,gl.z-.12);g.add(lamp)}
  {const sl=Y.shopLight,s=new T3.PointLight(0xe8f4ff,0,10,1.5);s.position.set(sl.x,sl.y-.2,sl.z);g.add(s);M.vis.lights.push({l:s,i:1.1});pool(sl.x,sl.z,7,4.2,'#e8f4ff',.22);
    const tube=new T3.Mesh(G.box,own(M,new T3.MeshBasicMaterial({color:new T3.Color(2.1,2.3,2.5),toneMapped:false})));tube.scale.set(1.4,.05,.07);tube.position.set(sl.x,sl.y,sl.z);g.add(tube);M.S.light({x:sl.x,y:sl.y,z:sl.z,r:6.2,i:.9})}
  {const d=Y.desk;pool(d.x-.4,d.z-.1,2.8,2.4,'#ffcf8a',.3);const s=new T3.PointLight(0xffc888,0,4.5,1.8);s.position.set(d.x-.62,1.25,d.z-.1);g.add(s);M.vis.lights.push({l:s,i:.7});M.S.light({x:d.x-.6,y:1.1,z:d.z-.1,r:2.4,i:.9})}
  /* Sal's sign: rides in the van, then goes up over the bay */
  const st=canvasTex(M,1024,200,(c,w,h)=>{c.fillStyle='#1c3150';c.fillRect(0,0,w,h);c.fillStyle='#f2c230';c.fillRect(0,0,w,48);c.fillRect(0,h-40,w,40);c.fillStyle='#1c3150';c.font='900 34px "Arial Narrow",Arial';c.textAlign='center';c.fillText('UNDER NEW MANAGEMENT',w/2,36);
    c.fillStyle='#f4f1ea';c.font='900 96px "Arial Narrow",Arial';c.fillText('HONEST TOWING',w/2,140);c.fillStyle='#1c3150';c.font='800 28px "Arial Narrow",Arial';c.fillText("CALL SAL · DAD'S AUTO · 24/7 · PAYMENT PLANS",w/2,h-10);
    c.fillStyle='rgba(255,255,255,.06)';for(let i=0;i<40;i++)c.fillRect(Math.random()*w,48+Math.random()*(h-88),2+Math.random()*30,1)});
  const sg=new T3.Group();const face=new T3.Mesh(own(M,new T3.PlaneGeometry(1,1)),own(M,new T3.MeshStandardMaterial({map:st,roughness:.5,metalness:.05,emissive:new T3.Color('#ffffff'),emissiveMap:st,emissiveIntensity:.05})));
  sg.add(face);const back=new T3.Mesh(G.box,m.dark);back.scale.set(1.02,1.02,.03);back.position.z=-.02;sg.add(back);sg.traverse(o=>{if(o.isMesh)o.castShadow=true});M.vis.sign=sg;g.add(sg);
  for(const k in G)G[k].dispose();M.vis.G=null}
/* the four tow trucks: Benny-white pickups with Sal's wrecker body from HT.Tow, the new name magnet-signed over the old one */
function buildTrucks(M){const a=A(),T3=a.THREE,Tw=window.HT&&HT.Tow;M.vis.trucks=[];
  const dt=canvasTex(M,512,160,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='rgba(211,58,44,.9)';c.font='bold 70px Arial';c.textAlign='center';c.fillText('QUIK-HOOK',w/2,68);
    c.fillStyle='#f6f3ea';c.fillRect(30,18,452,128);c.strokeStyle='#1d1d1d';c.lineWidth=3;c.strokeRect(34,22,444,120);c.fillStyle='#1d2a36';c.font='bold 46px Arial';c.fillText('MILL ST',w/2,68);c.font='bold 34px Arial';c.fillText('AUTO RECOVERY',w/2,108);
    c.font='italic 20px Arial';c.fillStyle='#555';c.fillText('a totally different company',w/2,134);c.fillStyle='rgba(211,58,44,.9)';c.font='bold 26px Arial';c.fillText('K',475,62);c.fillText('Q',38,62)});
  const dm=own(M,new T3.MeshStandardMaterial({map:dt,transparent:true,roughness:.5})),dg=own(M,new T3.PlaneGeometry(1.05,.33));
  for(const t of Y.trucks){const obj=a.makeVehicle('pickup','#ece8df')||a.makeVanBox('#ece8df');a.wmAdd(obj);const S=a.carSize({obj});let rig=null;
    if(Tw&&Tw.truckRig){try{rig=Tw.truckRig(obj,S,{color:'#ece8df',accent:'#b8892a'});const ud=obj.userData;if(ud.bodyRoot&&rig){ud.bodyRoot.add(rig)}
        /* the rig's own door signs say QUIK-HOOK: replace them with the magnet sign; its per-truck materials are freed in cleanup */
        rig.traverse(o=>{if(o.isMesh&&o.material&&o.material.map&&o.geometry&&o.geometry.type==='PlaneGeometry'){own(M,o.material.map);own(M,o.material);own(M,o.geometry);o.material=dm;o.geometry=dg}});
        for(const lm of rig.userData.lights||[])own(M,lm)}catch(e){console.warn('[sabotage] truck rig',e)}}
    obj.position.set(t.x,0,t.z);obj.rotation.set(0,t.yaw+Math.PI/2,0);obj.updateMatrixWorld(true);
    const f=[-Math.sin(t.yaw),-Math.cos(t.yaw)],r=[Math.cos(t.yaw),-Math.sin(t.yaw)],hl=S.l/2,hw=S.w/2;
    a.wmCol({x0:t.x-Math.abs(f[0])*hl-Math.abs(r[0])*hw,x1:t.x+Math.abs(f[0])*hl+Math.abs(r[0])*hw,z0:t.z-Math.abs(f[1])*hl-Math.abs(r[1])*hw,z1:t.z+Math.abs(f[1])*hl+Math.abs(r[1])*hw,s:'metal'});
    /* the two tyres facing the corridor between the rows (wheel order: front +z, front -z, rear +z, rear -z in the model): valve points just outside them */
    const ud=obj.userData,wp=(ud.wheels||[]).map((w,i)=>{const v=new T3.Vector3();w.parent.getWorldPosition(v);return{i,x:v.x,z:v.z}});
    const side=t.z<116.5?1:-1,two=wp.length===4?wp.slice().sort((p,q)=>Math.abs(p.z-116.5)-Math.abs(q.z-116.5)).slice(0,2).sort((p,q)=>p.x-q.x):[{i:0,x:t.x-1.4,z:t.z+side*.9},{i:2,x:t.x+1.4,z:t.z+side*.9}];
    const valves=two.map(w=>({x:w.x,z:w.z+side*.62,wx:w.x,wz:w.z,wi:w.i,flat:0,prog:0,done:false}));
    M.vis.trucks.push({t,obj,valves,S})}}

/* ---------------- Tiny: a very large, very soft fawn mastiff on a long chain (no one ever targets the dog) ---------------- */
function dogModel(M){const a=A(),T3=a.THREE,g=new T3.Group(),body=new T3.Group();g.add(body);
  const fawn=matC(M,'#c4955c',{roughness:.88}),fawn2=matC(M,'#a97b45',{roughness:.9}),blk=matC(M,'#2a211b',{roughness:.7}),nose=matC(M,'#141010',{roughness:.35}),red=matC(M,'#b52b2b',{roughness:.5}),gold=matC(M,'#d9b44a',{roughness:.3,metalness:.8}),eye=matC(M,'#0e0b09',{roughness:.15}),pink=matC(M,'#c46a6a',{roughness:.6});
  const S=own(M,new T3.SphereGeometry(1,16,12)),C=own(M,new T3.CylinderGeometry(1,1,1,12)),Tr=own(M,new T3.TorusGeometry(1,.16,8,20));
  const mk=(geo,mat,p,x,y,z,sx,sy,sz)=>{const o=new T3.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;p.add(o);return o};
  /* barrel body, deep chest, rump; front of the dog faces +z */
  mk(S,fawn,body,0,.66,0,.33,.31,.58);mk(S,fawn,body,0,.66,.36,.34,.34,.32);mk(S,fawn2,body,0,.64,-.4,.3,.29,.28);mk(S,fawn2,body,0,.52,.42,.22,.18,.18);
  const neck=new T3.Group();neck.position.set(0,.82,.58);body.add(neck);mk(S,fawn,neck,0,.02,.06,.2,.22,.2);mk(Tr,red,neck,0,0,.05,.2,.2,.2).rotation.x=Math.PI/2.4;mk(C,gold,neck,0,-.17,.2,.035,.008,.035).rotation.x=Math.PI/2;
  const head=new T3.Group();head.position.set(0,.12,.18);neck.add(head);mk(S,fawn,head,0,.04,0,.21,.19,.21);
  const muz=mk(S,blk,head,0,-.04,.2,.13,.11,.14);mk(S,blk,head,0,.04,.1,.2,.12,.12);mk(S,nose,head,0,0,.33,.05,.035,.03);
  for(const s of[-1,1]){mk(S,blk,head,s*.15,.12,-.02,.08,.12,.05).rotation.z=s*.5;mk(S,eye,head,s*.085,.08,.17,.026,.026,.02);mk(S,fawn2,head,s*.09,-.09,.2,.05,.06,.06)}
  const jaw=new T3.Group();jaw.position.set(0,-.09,.12);head.add(jaw);mk(S,blk,jaw,0,-.02,.08,.1,.05,.11);const tongue=mk(S,pink,jaw,0,-.04,.15,.05,.012,.06);tongue.visible=false;
  const legs=[];for(const[x,z]of[[-.17,.38],[.17,.38],[-.16,-.38],[.16,-.38]]){const hip=new T3.Group();hip.position.set(x,.58,z);body.add(hip);mk(C,z>0?fawn:fawn2,hip,0,-.2,0,.075,.4,.075);
    const knee=new T3.Group();knee.position.set(0,-.38,0);hip.add(knee);mk(C,fawn,knee,0,-.1,.01,.06,.22,.06);mk(S,fawn2,knee,0,-.2,.05,.07,.04,.09);legs.push({hip,knee})}
  const tail=new T3.Group();tail.position.set(0,.74,-.62);body.add(tail);mk(C,fawn2,tail,0,0,-.18,.04,.38,.04).rotation.x=Math.PI/2.6;
  g.userData={body,neck,head,jaw,tongue,legs,tail,ph:0,lie:1,wag:0};return g}
/* pose the dog: spd m/s, lie 0..1 (lying down), wag 0..1, chew 0..1, alert (ears up, head high) */
function dogAnim(d,dt,o){const u=d.userData;u.ph+=dt*(3+o.spd*3.2);u.lie+=((o.lie?1:0)-u.lie)*Math.min(1,dt*3);u.wag+=((o.wag||0)-u.wag)*Math.min(1,dt*4);
  const k=Math.min(1,o.spd/1.6),l=u.lie;u.legs.forEach((g,i)=>{const s=Math.sin(u.ph+(i%2?Math.PI:0)+(i>1?Math.PI*.5:0))*.65*k;g.hip.rotation.x=s*(1-l)+(i<2?-1.35:1.25)*l*(i<2?1:-1)*-1;g.knee.rotation.x=Math.max(0,-s)*.7*(1-l)+(i<2?.2:-1.9)*l});
  u.body.position.y=-.36*l+Math.abs(Math.sin(u.ph))*.02*k;u.body.rotation.x=-.05*l;
  u.neck.rotation.x=o.alert?-.35:(o.chew?.35:.1*l);u.head.rotation.y=o.look||0;
  u.jaw.rotation.x=o.chew?(.12+.12*Math.sin(u.ph*3)):o.bark?.45:0;u.tongue.visible=!!o.pant&&!o.chew;u.tail.rotation.y=Math.sin(u.ph*4.2)*.75*u.wag;u.tail.rotation.x=-.4*u.wag}

/* ---------------- the people on shift ---------------- */
function person(M,c,x,z,yaw){const a=A(),PP=window.HT&&HT.People;let d=null;
  if(PP&&PP.ok&&PP.has&&PP.has(c.key)){try{d=PP.make(c.key,{})}catch(_){d=null}}
  if(!d)d=a.makeDude(c.look);d.root.position.set(x,0,z);d.root.rotation.y=yaw||0;a.wmAdd(d.root);return d}
function pose(d,dt,o){const PP=window.HT&&HT.People;if(d&&d.rb&&PP&&PP.pose)try{PP.pose(d,dt,o)}catch(_){}}
function handProp(M,g,kind){const a=A(),T3=a.THREE,d=g.d;if(g.prop){if(g.prop.parent)g.prop.parent.remove(g.prop);g.prop=null}if(!kind||!d.gunHold)return;const p=new T3.Group();
  if(kind==='flash'){const b=new T3.Mesh(M.vis.hg.cyl,M.vis.m.dark);b.scale.set(.025,.24,.025);b.rotation.x=Math.PI/2;b.position.z=.06;p.add(b);const h=new T3.Mesh(M.vis.hg.cyl,M.vis.m.al);h.scale.set(.036,.06,.036);h.rotation.x=Math.PI/2;h.position.z=.19;p.add(h);
    const lens=new T3.Mesh(M.vis.hg.cyl,M.vis.lens);lens.scale.set(.03,.01,.03);lens.rotation.x=Math.PI/2;lens.position.z=.224;p.add(lens)}
  else if(kind==='thermos'){const b=new T3.Mesh(M.vis.hg.cyl,M.vis.m.thermos);b.scale.set(.05,.24,.05);p.add(b);const c=new T3.Mesh(M.vis.hg.cyl,M.vis.m.dark);c.scale.set(.052,.05,.052);c.position.y=.14;p.add(c);p.rotation.x=-Math.PI/2}
  d.gunHold.add(p);g.prop=p}
function makeGuards(M){const a=A(),T3=a.THREE;M.vis.hg={cyl:own(M,new T3.CylinderGeometry(1,1,1,10))};M.vis.lens=own(M,new T3.MeshBasicMaterial({color:new T3.Color(2.4,2.2,1.8),toneMapped:false}));
  M.g={};for(const id of ORDER){const c=CAST[id],R=ROUTES[id],s0=id==='walt'?{x:Y.chair.x,z:Y.chair.z+.05}:id==='kyle'?{x:427,z:122.75}:{x:Y.desk.x+.9,z:Y.desk.z+.2};
    const d=person(M,c,s0.x,s0.z,0);const g={id,c,d,pos:{x:s0.x,z:s0.z},yaw:id==='walt'?Y.chair.yaw:id==='kyle'?-Math.PI/2:Math.PI,look:0,k:id==='kyle'?3:0,t:0,mode:'route',path:null,said:{},tied:false,speed:K.walk[id],sit:false,act:null,prop:null,lineT:0};
    g.ob=M.S.addObserver({id,kind:'guard',pos:g.pos,yaw:g.yaw,lamp:id!=='walt',headY:1.9,handY:1.15});
    handProp(M,g,id==='walt'?null:'flash');M.g[id]=g}}
/* walk toward (x,z) along the site nav when the straight line is blocked; true on arrival */
function walkTo(M,g,x,z,sp,dt){const a=A(),nav=a.L&&a.L.nav;
  if(!g.path||g.path.tx!==x||g.path.tz!==z){let pts=[{x,z}];if(nav&&nav.walkLine&&!nav.walkLine(g.pos.x,g.pos.z,x,z)&&nav.path){const r=nav.path(g.pos.x,g.pos.z,x,z);if(r&&r.pts&&r.pts.length)pts=r.pts.slice(1).concat([{x,z}])}g.path={tx:x,tz:z,pts,k:0,stuck:0,last:1e9}}
  const P=g.path,t=P.pts[Math.min(P.k,P.pts.length-1)];if(hyp(t.x-g.pos.x,t.z-g.pos.z)<.45&&P.k<P.pts.length-1)P.k++;
  const dx=t.x-g.pos.x,dz=t.z-g.pos.z,l=hyp(dx,dz),dEnd=hyp(x-g.pos.x,z-g.pos.z);if(dEnd<.32){g.path=null;return true}
  if(l>1e-3){const s=Math.min(l,sp*dt);g.pos.x+=dx/l*s;g.pos.z+=dz/l*s;const v=a.V3(g.pos.x,0,g.pos.z);a.collide(v,.33);g.pos.x=v.x;g.pos.z=v.z;g.yaw+=wrap(yawTo(dx,dz)-g.yaw)*Math.min(1,dt*6)}
  if(dEnd<P.last-.02){P.last=dEnd;P.stuck=0}else{P.stuck+=dt;if(P.stuck>2.5){g.path=null;return true}}return false}
function faceYaw(g,y,dt,r){g.yaw+=wrap(y-g.yaw)*Math.min(1,dt*(r||4))}
function gLine(M,g,kind,force){const L_=L[kind]&&L[kind][g.id];if(!L_)return;if(!force&&M.t-(g.lineT||-99)<4)return;g.lineT=M.t;const txt=typeof L_==='string'?L_:pickN(L_,(g.said[kind]=(g.said[kind]||0)+1)-1);
  const P=A().P,d=hyp(g.pos.x-P.pos.x,g.pos.z-P.pos.z);if(d<34||force)say(M,g.c.name.charAt(0)+g.c.name.slice(1).toLowerCase(),txt,kind==='alert'||kind==='caught')}
/* one frame of a guard: his routine, or what HT.Stealth says he's thinking */
function guardTick(M,g,dt){const a=A(),d=g.d,ob=g.ob,P=a.P;
  if(g.tied){d.root.position.set(g.pos.x,0,g.pos.z);d.root.rotation.y=g.yaw;pose(d,dt,{moving:false,aim:false,mode:'kneel'});return}
  const st=ob.state,prev=g.mode;
  if(st==='alerted'){if(g.mode!=='alert'){g.mode='alert';g.sit=false;gLine(M,g,'alert',true)}}
  else if(st==='searching'){if(g.mode!=='search'){if(g.mode==='alert')gLine(M,g,'lost',true);else gLine(M,g,'search');g.mode='search';g.searchT=0;g.sit=false;g.path=null}}
  else if(st==='curious'){if(g.mode==='route'){g.mode='curious';g.curT=0;gLine(M,g,'curious')}}
  else if(g.mode==='search'||g.mode==='curious'||g.mode==='alert'){if(g.mode==='search')gLine(M,g,'calm');g.mode='return';g.path=null}
  let moving=false,mode='stand';const lk=ob.lkp;
  if(g.mode==='route'||g.mode==='return'){const R=ROUTES[g.id];
    if(g.mode==='return'){/* back to the nearest stop on the route */if(g.retK==null){let bk=0,bd=1e9;R.forEach((s,i)=>{const p=stepPos(g,s);if(!p)return;const dd=hyp(p.x-g.pos.x,p.z-g.pos.z);if(dd<bd){bd=dd;bk=i}});g.retK=bk}
      const p=stepPos(g,R[g.retK])||{x:g.pos.x,z:g.pos.z};if(walkTo(M,g,p.x,p.z,g.speed,dt)){g.mode='route';g.k=g.retK;g.t=0;g.retK=null}else moving=true}
    else{const s=R[g.k];g.t+=dt;
      if(s.go){moving=!walkTo(M,g,s.go[0],s.go[1],g.speed,dt);if(!moving)next(g)}
      else if(s.look){const base=s.a,sw=Math.sin(g.t*1.6)*s.s;faceYaw(g,base+sw,dt,3);if(g.t>=s.look)next(g)}
      else if(s.sit){if(!g.sit){const c=Y.chair;if(walkTo(M,g,c.x,c.z+.05,g.speed,dt)){g.sit=true;g.t=0}else{moving=true;g.t=0}}else{faceYaw(g,Y.chair.yaw+Math.sin(g.t*.35)*.35,dt,2);mode='sit';if(g.t>=s.sit){g.sit=false;next(g)}}}
      else if(s.act){g.act=s.act;if(s.act==='desk'){faceYaw(g,Math.PI,dt,3);mode='sit';ob.lamp=false}else if(s.act==='pet'){faceYaw(g,yawTo(Y.bed.x-g.pos.x,Y.bed.z-g.pos.z),dt,4);mode='crouch';M.tinyPet=.5}
        else if(s.act==='refill'){faceYaw(g,s.a,dt,4);if(!g.thermos){g.thermos=true;handProp(M,g,'thermos')}}
        if(g.t>=s.t){if(s.act==='refill'){g.thermos=false;handProp(M,g,null)}g.act=null;next(g)}}}
    if(g.id==='boss')ob.lamp=g.act!=='desk';if(g.mode==='route'&&!(ROUTES[g.id][g.k].look))g.look+=(0-g.look)*Math.min(1,dt*3)}
  else if(g.mode==='curious'){g.curT+=dt;if(lk){const want=yawTo(lk.x-g.pos.x,lk.z-g.pos.z);if(g.sit){g.look+=(clamp(wrap(want-g.yaw),-1.2,1.2)-g.look)*Math.min(1,dt*3);mode='sit'}else faceYaw(g,want,dt,2.2)}else if(g.sit)mode='sit'}
  else if(g.mode==='search'){g.searchT+=dt;g.look=0;
    if(lk&&!g.lookAround){if(walkTo(M,g,lk.x,lk.z,g.speed*1.2,dt)){g.lookAround=0.001;g.lkp0={x:lk.x,z:lk.z}}else moving=true}
    if(g.lookAround){g.lookAround+=dt;faceYaw(g,g.yaw+Math.sin(g.lookAround*1.3)*.08,dt,2);if(lk&&g.lkp0&&hyp(lk.x-g.lkp0.x,lk.z-g.lkp0.z)>1.5)g.lookAround=0;knock(M,g)}}
  else if(g.mode==='alert'){if(lk)faceYaw(g,yawTo(lk.x-g.pos.x,lk.z-g.pos.z),dt,6);mode='stand'}
  if(g.mode!=='search')g.lookAround=0;
  if(g.sit&&mode!=='sit')mode='sit';
  ob.yaw=g.yaw+g.look;
  const sitAt=g.id==='walt'?{x:Y.chair.x,z:Y.chair.z}:{x:Y.desk.x+.2,z:Y.desk.z+.78};
  if(mode==='sit'){d.root.position.set(sitAt.x,0,sitAt.z);d.root.rotation.y=g.id==='walt'?Y.chair.yaw:Math.PI}else{d.root.position.set(g.pos.x,0,g.pos.z);d.root.rotation.y=g.yaw}
  pose(d,dt,{moving,aim:false,mode,speed:Math.max(.5,g.speed/1.2)});
  /* a guard who walks into a zip-tied colleague goes to look (once each) */
  if(st==='calm'||st==='curious')for(const o of ORDER){const h=M.g[o];if(!h.tied||h===g||g.said['found_'+o])continue;const dx=h.pos.x-g.pos.x,dz=h.pos.z-g.pos.z,dd=hyp(dx,dz);
    if(dd<9&&Math.abs(wrap(yawTo(dx,dz)-ob.yaw))<1&&!M.S.blocked(g.pos.x,g.pos.z,1.65,h.pos.x,h.pos.z,.9)){g.said['found_'+o]=1;M.S.poke(ob,h.pos.x,h.pos.z);ob.cause='found';say(M,g.c.name.charAt(0)+g.c.name.slice(1).toLowerCase(),L.findTied[g.id],true)}}}
function stepPos(g,s){if(s.go)return{x:s.go[0],z:s.go[1]};if(s.sit)return{x:Y.chair.x,z:Y.chair.z+.05};return null}
function next(g){g.k=(g.k+1)%ROUTES[g.id].length;g.t=0}
/* a searching guard right next to the porta-potty knocks (once a run) */
function knock(M,g){if(M.hide!=='potty'||M.said.knock)return;if(hyp(g.pos.x-Y.potty.x,g.pos.z-Y.potty.z)>2.4)return;M.said.knock=1;
  say(M,g.c.name.charAt(0)+g.c.name.slice(1).toLowerCase(),g.id==='walt'?"...Kyle? You in there? Take your time, son.":g.id==='kyle'?"Walt? That you in there? ...Okay. Okay. Sorry.":"Occupied. Of course it's occupied. Who's in there? ...Never mind. Don't answer.");
  M.queue.push({t:2.6,w:'you',x:"(Occupied.)"})}

/* ---------------- setup: the stealth session, the yard, the cast ---------------- */
function init(M){const a=A(),Sx=ST(),T3=a.THREE;if(!Sx||M.S)return!!M.S;M.vis=M.vis||{own:[]};
  const S=M.S=Sx.create({night:true,diff:1});
  /* sight blockers: the buildings' walls (chain-link fences are see-through), the crate in the shop, and everything we put down */
  for(const c of a.L.colliders){const k=c.s||c.k;if(c.x1<410||c.x0>444||c.z1<98||c.z0>128)continue;if(k==='wall')S.occluder({x0:c.x0,z0:c.z0,x1:c.x1,z1:c.z1,h:4});else if(k==='crate')S.occluder({x0:c.x0,z0:c.z0,x1:c.x1,z1:c.z1,h:c.h||1.15})}
  buildYard(M);buildTrucks(M);
  const solid=(x0,z0,x1,z1,h,k)=>{a.wmCol({x0,z0,x1,z1,h:h>=2.2?undefined:h,s:k||'wood'});S.occluder({x0,z0,x1,z1,h})};
  for(const tr of M.vis.trucks){const t=tr.t,hl=tr.S.l/2,hw=tr.S.w/2;S.occluder({x0:t.x-hl,x1:t.x+hl,z0:t.z-hw,z1:t.z+hw,h:Math.min(1.95,tr.S.h||1.9)})}
  solid(Y.tarp.x-.66,Y.tarp.z-.56,Y.tarp.x+.66,Y.tarp.z+.56,.72);solid(Y.potty.x-.56,Y.potty.z-.56,Y.potty.x+.56,Y.potty.z+.56,2.4,'metal');
  for(const s of Y.tyres)solid(s.x-.42,s.z-.42,s.x+.42,s.z+.42,.13+s.n*.24);for(const d of Y.drums)solid(d.x-.3,d.z-.3,d.x+.3,d.z+.3,.92,'metal');
  solid(Y.desk.x-.76,Y.desk.z-.38,Y.desk.x+.76,Y.desk.z+.38,.78);solid(418.3,109,418.8,109.6,1.3,'metal');
  /* the gate panel slid nearly shut: Walt leaves a crack so he can get to his car */
  a.wmCol({x0:417.95+Y.gateShift,x1:423.9+Y.gateShift,z0:Y.gateZ-.12,z1:Y.gateZ+.12,s:'fence'});/* the panel parks at x 417.95-423.9 when open */
  a.wmSetWindow(a.wmWindow(427,113,13));
  makeGuards(M);makeTiny(M);
  const paths=ORDER.map(id=>({pts:ROUTES[id].filter(s=>s.go||s.sit).map(s=>s.go?{x:s.go[0],z:s.go[1]}:{x:Y.chair.x,z:Y.chair.z}),loop:true,color:id==='walt'?'#9fffb0':id==='kyle'?'#ffe28a':'#9fd6ff'}));
  M.viz=Sx.viz(S,{THREE:T3,parent:M.vis.g,paths});
  M.hud=Sx.hud(S,{project:(x,y,z)=>a.project(x,y,z),mount:el=>{try{a.overlay('stealth',el)}catch(_){}}});Sx.bindHud(a.HUD);
  /* ledger and the chew toy (their own meshes: they move) */
  const lg=new T3.Group();const b=new T3.Mesh(own(M,new T3.BoxGeometry(.3,.05,.22)),matC(M,'#2f5d3a',{roughness:.6}));lg.add(b);const pg=new T3.Mesh(own(M,new T3.BoxGeometry(.28,.035,.2)),M.vis.m.paper);pg.position.y=.012;pg.position.x=.008;lg.add(pg);
  lg.position.set(Y.desk.x+.1,.8,Y.desk.z+.05);lg.rotation.y=-.3;M.vis.g.add(lg);M.vis.ledger=lg;
  const toy=new T3.Group(),bun=matC(M,'#d9a35a'),dog=matC(M,'#b8462e'),cg=own(M,T3.CapsuleGeometry?new T3.CapsuleGeometry(.05,.2,4,8):new T3.CylinderGeometry(.05,.05,.3,8));
  const tb=new T3.Mesh(cg,bun);tb.rotation.z=Math.PI/2;tb.scale.set(1.15,1,.75);toy.add(tb);const td=new T3.Mesh(cg,dog);td.rotation.z=Math.PI/2;td.scale.set(.75,1.2,.75);td.position.y=.04;toy.add(td);toy.visible=false;M.vis.g.add(toy);M.vis.toy=toy;
  /* the banner roll Sal printed (in the back of the van) */
  const roll=new T3.Group(),rr=new T3.Mesh(own(M,new T3.CylinderGeometry(.09,.09,1.7,14)),matC(M,'#1c3150',{roughness:.5}));rr.rotation.z=Math.PI/2;roll.add(rr);
  for(const s of[-1,1]){const e=new T3.Mesh(own(M,new T3.CylinderGeometry(.092,.092,.12,14)),matC(M,'#f2c230',{roughness:.5}));e.rotation.z=Math.PI/2;e.position.x=s*.78;roll.add(e)}
  roll.traverse(o=>{if(o.isMesh)o.castShadow=true});M.vis.roll=roll;M.vis.g.add(roll);placeRoll(M);
  /* audio: the noise buffer for hisses (shared bus, freed in cleanup) */
  const Au=window.HT&&HT.Audio;if(Au&&Au.ctx&&!M.vis.noiseBuf){try{const c=Au.ctx,n=c.sampleRate|0,buf=c.createBuffer(1,n,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;M.vis.noiseBuf=buf}catch(_){}}
  S.on('alert',b=>onAlert(M,b));
  S.on('state',(b,prev,next)=>{if(next==='searching'&&b.kind==='guard'&&b.cause!=='treat'&&b.cause!=='found'&&M.ghost){M.ghost=false;if(!M.said.ghostLost){M.said.ghostLost=1;a.feed('Somebody came looking · no ghost bonus','bad')}}});
  S.on('heard',(b,n)=>{if(n.kind==='hiss'&&b.kind==='guard'&&!M.said.hiss&&b.sus>.3){M.said.hiss=1;lineSeq(M,L.heardHiss,2.4);M.queue.push({t:5,fn:()=>{b.sus=Math.min(b.sus,.18);b.floorUntil=-1}})}});
  S.on('bark',(b,n)=>bark(M,n));
  return true}
function placeRoll(M){const a=A(),c=M.car,r=M.vis.roll;if(!r||!c||M.sign)return;const f=[-Math.sin(c.yaw),-Math.cos(c.yaw)],S=a.carSize(c);r.position.set(c.pos.x-f[0]*(S.l/2-.5),.95,c.pos.z-f[1]*(S.l/2-.5));r.rotation.set(0,c.yaw+Math.PI/2,0);M.rollAt={x:c.pos.x-f[0]*(S.l/2+.7),z:c.pos.z-f[1]*(S.l/2+.7)}}
function makeTiny(M){const d=dogModel(M);A().wmAdd(d);const T={d,pos:{x:Y.bed.x,z:Y.bed.z},yaw:Math.PI*.15,st:'bed',t:0,alertT:0,barkT:-9,tx:0,tz:0};d.position.set(Y.bed.x,0,Y.bed.z);d.rotation.y=T.yaw;M.tiny=T;
  T.ob=M.S.addObserver({id:'tiny',kind:'dog',pos:T.pos,yaw:T.yaw,sight:false,headY:1.1})}

/* ---------------- events ---------------- */
function onAlert(M,b){const a=A();if(M.spot||M.state!=='go'||b.kind!=='guard')return;const g=M.g[b.id];M.ghost=false;M.spot={g,t:0};
  try{const Au=window.HT&&HT.Audio;if(Au&&Au.music)Au.music('tension',{intensity:1})}catch(_){}
  if(g)gLine(M,g,'alert',true)}
function bark(M,n){const a=A(),T=M.tiny;if(!T||T.ob.off||T.st!=='bed')return;if(M.t-T.barkT<K.barkCd)return;T.barkT=M.t;T.alertT=2.6;T.lookTo={x:n.x,z:n.z};
  try{const Au=window.HT&&HT.Audio;if(Au&&Au.voice)Au.voice('dog',{x:T.pos.x,y:.9,z:T.pos.z})}catch(_){}
  say(M,'Tiny',pick(L.bark));
  /* the nearest guard who isn't zip-tied goes to see what Tiny's on about */
  let best=null,bd=1e9;for(const id of ORDER){const g=M.g[id];if(g.tied)continue;const d=hyp(g.pos.x-T.pos.x,g.pos.z-T.pos.z);if(d<bd){bd=d;best=g}}
  if(best&&best.ob.state!=='alerted')M.S.poke(best.ob,n.x,n.z,undefined,'bark')}
function noiseRing(M,x,z,r,col){if(M.viz)M.viz.ring(x,z,r,col)}
function hissSnd(M,x,z){const Au=window.HT&&HT.Audio,buf=M.vis&&M.vis.noiseBuf;if(!Au||!Au.ctx||!buf)return;try{const c=Au.ctx,src=c.createBufferSource(),bp=c.createBiquadFilter(),g=c.createGain(),t=c.currentTime;
  src.buffer=buf;src.loop=true;bp.type='bandpass';bp.frequency.value=3600+Math.random()*900;bp.Q.value=.9;const P=A().P,d=hyp(x-P.pos.x,z-P.pos.z),v=.09*clamp(1-d/10,0,1);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.04);g.gain.setValueAtTime(v,t+.4);g.gain.linearRampToValueAtTime(0,t+.52);src.connect(bp);bp.connect(g);g.connect(Au.bus('sfx'));src.start(t);src.stop(t+.55);
  src.onended=()=>{src.disconnect();bp.disconnect();g.disconnect()}}catch(_){}}
function tone(o){const Au=window.HT&&HT.Audio;if(Au&&Au.tone)try{Au.tone(o)}catch(_){}}
/* Walt's radio: a lazy AM-station tune from the crate by his chair (louder as you get closer) */
const RADIO=[[392,.5],[440,.5],[494,.5],[587,1],[523,.5],[494,.5],[440,1],[392,.5],[330,.5],[392,1.5],[0,.5],[440,.5],[494,.5],[523,.5],[494,.5],[440,.5],[392,2]];
function radioTick(M,dt){const P=A().P,r=M.vis.radioAt;if(!r)return;M.radioT=(M.radioT||0)-dt;if(M.radioT>0)return;M.radioK=((M.radioK||0)+1)%RADIO.length;const n=RADIO[M.radioK],beat=.42;M.radioT=n[1]*beat;
  const d=hyp(P.pos.x-r.x,P.pos.z-r.z),v=.05*clamp(1-d/16,0,1);if(!n[0]||v<.004)return;tone({f:n[0],type:'triangle',d:n[1]*beat*.9,gain:v});tone({f:n[0]/2,type:'sine',d:n[1]*beat*.6,gain:v*.5})}

/* ---------------- the player's side: stance, light, hiding, carrying ---------------- */
const HIDES=[{id:'tarp',x:Y.tarp.x,z:Y.tarp.z,r:1.25,txt:'Hide under the tarp',out:'Crawl out from under the tarp'},{id:'potty',x:Y.potty.x-.95,z:Y.potty.z,r:1.1,txt:'Duck into the porta-potty',out:'Step out of the porta-potty',at:{x:Y.potty.x,z:Y.potty.z}}];
function playerState(M){const a=A(),P=a.P,N=window.NIGHT,keys=a.keys;
  const carry=P.carry&&P.carry.kind==='banner',sprint=!!keys.shift&&P.moving&&!P.crouch&&!carry;
  const stance=M.hide?'crouch':carry?'carry':P.crouch?'crouch':sprint?'sprint':'stand';
  const base=typeof window.nightLight==='function'?window.nightLight(P.pos.x,P.pos.z):.4;let lit=M.S.lightAt(P.pos.x,P.pos.z,stance==='crouch'?.8:1.3,base);
  if(N&&N.flash)lit=1;return{x:P.pos.x,z:P.pos.z,stance,lit,hidden:!!M.hide}}
function hideTick(M,F){const a=A(),P=a.P;
  if(M.hide){const h=HIDES.find(h=>h.id===M.hide),at=h.at||h;P.pos.set(at.x,0,at.z);if(M.hide==='tarp')P.crouch=true;
    F.taps.push({d:0,r:2,txt:h.out,fn:()=>{const h2=HIDES.find(q=>q.id===M.hide);M.hide=null;P.pos.set(h2.x,0,h2.z);a.collide(P.pos,.35);setPotty(M,false);a.snd&&a.snd('click',.3)}});return}
  if(P.carry)return;for(const h of HIDES){const d=hyp(P.pos.x-h.x,P.pos.z-h.z);if(d<h.r)F.taps.push({x:h.x,z:h.z,r:h.r,txt:h.txt,fn:()=>{M.hide=h.id;if(h.id==='potty')setPotty(M,true);
    if(!M.said['hide_'+h.id]){M.said['hide_'+h.id]=1;say(M,'you',h.id==='tarp'?"I'm a tarp. I'm a lumpy, dad-shaped tarp.":"Occupied. Very occupied. Go away, everyone.")}}})}}
function setPotty(M,on){const v=M.vis;if(!v)return;if(!v.latch){const a=A(),T3=a.THREE;v.latch=new T3.Mesh(own(M,new T3.PlaneGeometry(.16,.07)),own(M,new T3.MeshBasicMaterial({color:new T3.Color(.15,.8,.25),toneMapped:false})));
  v.latch.position.set(Y.potty.x-.585,1.32,Y.potty.z+.28);v.latch.rotation.y=-Math.PI/2;v.g.add(v.latch)}v.latch.material.color.setRGB(on?1:.15,on?.15:.8,on?.12:.25)}
/* the banner slows you down and you can't crouch with it */
function carryTick(M){const a=A(),P=a.P;if(!(P.carry&&P.carry.kind==='banner')){M.prevP=null;return}P.crouch=false;
  if(M.prevP){const dx=P.pos.x-M.prevP.x,dz=P.pos.z-M.prevP.z;P.pos.x=M.prevP.x+dx*K.carryMul;P.pos.z=M.prevP.z+dz*K.carryMul}M.prevP={x:P.pos.x,z:P.pos.z}}
/* a tossed jerky treat: 0.55 s arc, a soft plap where it lands (guards nearby go and look), and Tiny trots over if he can reach it */
function tossAt(M,x,z){const a=A(),T3=a.THREE,P=a.P;if(M.treats<=0){if(!M.said.noTreat){M.said.noTreat=1;say(M,'you',"Out of jerky. I ate one. It was a long night.")}return false}M.treats--;
  const m=new T3.Mesh(M.vis.hg.cyl,M.vis.treatMat||(M.vis.treatMat=matC(M,'#7a3f1c',{roughness:.7})));m.scale.set(.02,.12,.02);m.rotation.z=Math.PI/2;M.vis.g.add(m);
  M.toss={m,t:0,from:{x:P.pos.x,z:P.pos.z,y:1.4},to:{x,z},dur:.55};a.snd&&a.snd('click',.2);return true}
function tossTarget(){const a=A(),P=a.P,C=a.camera,T3=a.THREE;const dir=new T3.Vector3(0,0,-1).applyQuaternion(C.quaternion);let t=K.tossMax;
  if(dir.y<-.04)t=Math.min(K.tossMax+4,(C.position.y-.05)/-dir.y);let x=C.position.x+dir.x*t,z=C.position.z+dir.z*t;const dx=x-P.pos.x,dz=z-P.pos.z,d=hyp(dx,dz)||1;
  const dd=clamp(d,K.tossMin,K.tossMax);x=P.pos.x+dx/d*dd;z=P.pos.z+dz/d*dd;return{x,z}}
function tossTick(M,dt){const T=M.toss;if(!T)return;T.t+=dt;const k=Math.min(1,T.t/T.dur);const x=T.from.x+(T.to.x-T.from.x)*k,z=T.from.z+(T.to.z-T.from.z)*k,y=T.from.y*(1-k)+Math.sin(k*Math.PI)*1.6+.03;
  T.m.position.set(x,y,z);T.m.rotation.y+=dt*9;if(k<1)return;M.toss=null;T.m.position.y=.03;
  M.S.noise({x:T.to.x,z:T.to.z,r:K.plap,kind:'treat',not:'dog'});noiseRing(M,T.to.x,T.to.z,K.plap,[1,.8,.5]);tone({f:180,to:90,type:'sine',d:.12,gain:.06});
  const Ti=M.tiny,db=hyp(T.to.x-Y.bed.x,T.to.z-Y.bed.z),dt_=hyp(T.to.x-Ti.pos.x,T.to.z-Ti.pos.z);
  if(Ti.st==='bed'||Ti.st==='back'){if(db<=K.chain+.8&&dt_<9){Ti.st='go';Ti.treat=T.m;const k2=Math.min(1,K.chain/Math.max(.01,db));Ti.tx=Y.bed.x+(T.to.x-Y.bed.x)*k2;Ti.tz=Y.bed.z+(T.to.z-Y.bed.z)*k2;Ti.t=0;return}}
  if(!M.said.treatMiss){M.said.treatMiss=1;say(M,'you',pick(L.treatMiss))}M.loose=(M.loose||[]).concat([T.m])}
function tinyTick(M,dt){const a=A(),T=M.tiny,d=T.d;T.t+=dt;if(T.alertT>0)T.alertT-=dt;let spd=0,lie=true,wag=0,chew=false,alert=false,look=0,barkO=false;
  const pet=M.tinyPet>0;if(pet)M.tinyPet-=dt;
  if(T.st==='bed'){T.pos.x+=(Y.bed.x-T.pos.x)*Math.min(1,dt*4);T.pos.z+=(Y.bed.z-T.pos.z)*Math.min(1,dt*4);T.ob.off=false;
    if(T.alertT>0){lie=false;alert=true;barkO=T.alertT>1.8&&Math.sin(T.t*20)>0;if(T.lookTo)T.yaw+=wrap(yawTo(T.lookTo.x-T.pos.x,T.lookTo.z-T.pos.z)-T.yaw)*Math.min(1,dt*5)}
    if(pet){wag=1;lie=false}}
  else if(T.st==='go'||T.st==='back'){const tx=T.st==='go'?T.tx:Y.bed.x,tz=T.st==='go'?T.tz:Y.bed.z,dx=tx-T.pos.x,dz=tz-T.pos.z,l=hyp(dx,dz);lie=false;wag=.8;
    if(l<.35){if(T.st==='go'){T.st='eat';T.t=0}else{T.st=M.toyIn?'happy':'bed';T.t=0;if(T.st==='happy'){say(M,'you',L.goodBoy);lineSeq(M,[['Tiny',"*squeak* *happy chewing*"]],.1);a.feed('Good boy','trust','Tiny is busy for the rest of the night')}}}
    else{const s=Math.min(l,2.1*dt);T.pos.x+=dx/l*s;T.pos.z+=dz/l*s;T.yaw+=wrap(yawTo(dx,dz)-T.yaw)*Math.min(1,dt*8);spd=2.1}T.ob.off=T.st==='go'}
  else if(T.st==='eat'){lie=false;chew=true;wag=1;T.ob.off=true;if(T.t>1.4){if(T.treat){if(T.treat.parent)T.treat.parent.remove(T.treat);T.treat=null}T.st='chew';T.t=0;
      if(!M.said.treat){M.said.treat=1;lineSeq(M,L.treatLand,2.6)}}}
  else if(T.st==='chew'){chew=true;wag=.5;T.ob.off=true;if(T.t>K.chew){T.st='back';T.t=0}}
  else if(T.st==='happy'){chew=true;wag=.7;T.ob.off=true;T.pos.x=Y.bed.x;T.pos.z=Y.bed.z}
  T.ob.yaw=T.yaw;d.position.set(T.pos.x,0,T.pos.z);d.rotation.y=T.yaw;dogAnim(d,dt,{spd,lie,wag,chew,alert,look,bark:barkO,pant:!lie&&!chew});
  if(M.vis.toy){M.vis.toy.visible=!!(M.toyIn||M.toyHeld===false);if(M.toyIn){if(T.st==='happy'){M.vis.toy.position.set(T.pos.x+Math.sin(T.yaw)*.62,.06,T.pos.z+Math.cos(T.yaw)*.62)}else M.vis.toy.position.set(Y.bed.x+.1,.14,Y.bed.z)}}}

/* ---------------- objectives ---------------- */
const tname=k=>Y.trucks[k>>1].name;
function trucksDone(M){let n=0;for(let i=0;i<4;i++)if(M.valves[i*2].done&&M.valves[i*2+1].done)n++;return n}
function jobsDone(M){return trucksDone(M)+(M.sign===2?1:0)}
function wantCP(M){const n=jobsDone(M);M.cpWant=n>=5?'exfil':'job'+n}
function valveDone(M,k){const a=A(),v=M.valves[k];if(v.done)return;v.done=true;v.prog=0;say(M,'you',pickN(L.tyreDone,M.nTyre=(M.nTyre||0)+1));
  const ti=k>>1;if(M.valves[ti*2].done&&M.valves[ti*2+1].done){const n=trucksDone(M);const l=L.truckDone[n-1];if(l)M.queue.push({t:2.2,w:l[0],x:l[1]});a.feed('Truck '+n+' of 4 is going nowhere','trust');wantCP(M)}
  noiseRing(M,v.x,v.z,K.hiss)}
function tie(M,g){const a=A();if(g.tied)return;g.tied=true;M.S.takedown(g.ob);handProp(M,g,null);g.thermos=false;g.sit=false;g.mode='tied';M.ties=(M.ties||0)+1;(M.tiedIds||(M.tiedIds=[])).push(g.id);
  M.S.noise({x:g.pos.x,z:g.pos.z,r:K.tieNoise,kind:'tie'});noiseRing(M,g.pos.x,g.pos.z,K.tieNoise);a.snd&&a.snd('cuff');try{a.addTrust(K.trust.tie,'river')}catch(_){}
  say(M,g.c.name.charAt(0)+g.c.name.slice(1).toLowerCase(),L.tied[g.id],true);M.queue.push({t:2.2,w:'you',x:pickN(L.tiedYou,M.ties-1)});a.feed(g.c.name.charAt(0)+g.c.name.slice(1).toLowerCase()+' zip-tied','trust','+'+K.trust.tie+' trust · no gold medal')}
function objectives(M,F,dt){const a=A(),P=a.P,keys=a.keys,pl=M.pl,busy=!!M.hide;
  /* the banner: from the back of the van to the sign over the bay */
  if(M.sign===0&&!busy&&!P.carry&&M.rollAt)F.holds.push({x:M.rollAt.x,z:M.rollAt.z,r:1.8,o:M.rollO||(M.rollO={}),txt:"Take Sal's banner out of the van",time:.8,fn:()=>{M.sign=1;a.wmCarry('banner',M.vis.roll,null);M.vis.roll.position.set(.05,1.5,-.08);M.vis.roll.rotation.set(0,0,0);say(M,'you',L.signGrab)}});
  if(M.sign===1){if(!(P.carry&&P.carry.kind==='banner')){M.sign=0;placeRoll(M);M.vis.roll.visible=true;if(M.vis.roll.parent!==M.vis.g)M.vis.g.add(M.vis.roll)}
    else{const o=M.mountO||(M.mountO={});F.holds.push({x:Y.mount.x,z:Y.mount.z,r:1.6,o,txt:'Zip-tie the banner over their sign',time:K.signHold,fn:()=>signDone(M)});
      if(o.prog>(M.lastMount||0)+1e-4){M.zipT=(M.zipT||0)-dt;if(M.zipT<=0){M.zipT=.62;M.S.noise({x:Y.mount.x,z:Y.mount.z,r:4,kind:'zip'});noiseRing(M,Y.mount.x,Y.mount.z,4);a.snd&&a.snd('cuff');if(!M.said.zip){M.said.zip=1;lineSeq(M,L.signUp,.1)}}
        const sg=M.vis.sign,k=o.prog;sg.visible=true;sg.position.set(Y.sign.x-Y.sign.w/2*(1-k)*.98,Y.sign.y,Y.sign.z-.04);sg.rotation.set(0,Math.PI,0);sg.scale.set(Math.max(.05,Y.sign.w*k),Y.sign.h,1)}
      else if(!o.prog)M.vis.sign.visible=false;M.lastMount=o.prog||0}}
  /* valves */
  M.vis.valveHint=null;
  for(let k=0;k<M.valves.length;k++){const v=M.valves[k];if(v.done||busy||P.carry)continue;const d=hyp(P.pos.x-v.x,P.pos.z-v.z);if(d>1.15)continue;
    F.holds.push({x:v.x,z:v.z,r:1.15,o:v,txt:'Let the air out · '+tname(k),time:K.valveHold,fn:()=>valveDone(M,k)});
    if(keys.e&&d<1.15&&!P.crouch&&!P.carry){P.crouch=true}}
  /* the ledger, Tiny's toy, petting a busy Tiny */
  const df={x:Y.desk.x,z:Y.desk.z+.78};
  if(!M.ledger&&!busy&&hyp(P.pos.x-df.x,P.pos.z-df.z)<1.25)F.holds.push({x:df.x,z:df.z,r:1.25,o:M.ledO||(M.ledO={}),txt:'Take the dispatch ledger',time:K.ledgerHold,fn:()=>{M.ledger=true;M.vis.ledger.visible=false;lineSeq(M,L.ledger,.1);a.snd&&a.snd('click',.4);a.feed('Dispatch ledger','trust','for Sal')}});
  const T=M.tiny;
  if(!M.toyIn&&!busy&&!P.carry&&T.st!=='bed'&&T.st!=='happy'&&hyp(P.pos.x-Y.bed.x,P.pos.z-Y.bed.z)<1.4)F.holds.push({x:Y.bed.x,z:Y.bed.z,r:1.4,o:M.toyO||(M.toyO={}),txt:"Put Tiny's squeaky hot dog in his bed",time:K.toyHold,fn:()=>{M.toyIn=true;lineSeq(M,L.toy,2.4);tone({f:1250,to:1700,type:'sine',d:.12,gain:.06});tone({f:1300,to:1800,type:'sine',d:.12,gain:.05,at:.2})}});
  else if(T.st==='bed'&&!M.toyIn&&!busy&&hyp(P.pos.x-Y.bed.x,P.pos.z-Y.bed.z)<3&&!M.said.toyHint){M.said.toyHint=1;say(M,'you',"He's lying right on his bed. I'll need him busy with something first.")}
  if((T.st==='chew'||T.st==='happy')&&!busy&&hyp(P.pos.x-T.pos.x,P.pos.z-T.pos.z)<1.6)F.taps.push({x:T.pos.x,z:T.pos.z,r:1.6,txt:'Pet Tiny',fn:()=>{say(M,'you',pickN(L.pet,M.petN=(M.petN||0)+1));M.tinyPet=1.5}});
  /* zip-ties: from behind, while he hasn't started wondering */
  if(!busy&&!P.carry)for(const id of ORDER){const g=M.g[id];if(g.tied||g.sit)continue;if(!M.S.canTakedown(g.ob,pl))continue;
    F.holds.push({x:g.pos.x,z:g.pos.z,r:1.4,o:g.tieO||(g.tieO={}),txt:'Zip-tie '+g.c.name.charAt(0)+g.c.name.slice(1).toLowerCase()+' from behind',time:K.tieHold,fn:()=>tie(M,g)})}
  /* over the east fence (rattles), through the hole behind the tarp (quiet, if you find it) */
  if(!busy&&!P.carry){const V=Y.vault,out={x:V.x+1.15,z:V.z},inn={x:V.x-.95,z:V.z};
    for(const[from,to]of[[out,inn],[inn,out]])if(hyp(P.pos.x-from.x,P.pos.z-from.z)<1.1)F.holds.push({x:from.x,z:from.z,r:1.1,o:M.vaultO||(M.vaultO={}),txt:'Climb the fence',time:.9,fn:()=>{P.pos.set(to.x,0,to.z);a.collide(P.pos,.35);M.S.noise({x:V.x,z:V.z,r:5,kind:'rattle'});noiseRing(M,V.x,V.z,5);tone({f:220,to:180,type:'square',d:.18,gain:.04});tone({f:330,to:260,type:'square',d:.14,gain:.03,at:.12})}});
    const Ho=Y.hole,ho={x:Ho.x-.85,z:Ho.z},hi={x:Ho.x+.85,z:Ho.z};
    for(const[from,to]of[[ho,hi],[hi,ho]])if(hyp(P.pos.x-from.x,P.pos.z-from.z)<1)F.taps.push({x:from.x,z:from.z,r:1,txt:'Squeeze through the gap in the fence',fn:()=>{P.pos.set(to.x,0,to.z);a.collide(P.pos,.35);P.crouch=true;M.S.noise({x:Ho.x,z:Ho.z,r:1.2,kind:'step'});if(!M.said.hole){M.said.hole=1;say(M,'you',"Somebody cut this and never fixed it. Bless whoever you are.")}}})}}
function signDone(M){const a=A();M.sign=2;if(a.P.carry&&a.P.carry.kind==='banner')a.wmDrop();M.vis.roll.visible=false;const sg=M.vis.sign;sg.visible=true;sg.position.set(Y.sign.x,Y.sign.y,Y.sign.z-.04);sg.rotation.set(0,Math.PI,.012);sg.scale.set(Y.sign.w+.2,Y.sign.h,1);
  lineSeq(M,L.signDone,2.6);a.feed('Sign swapped','trust','Honest Towing');wantCP(M)}
/* deflation: a held valve hisses and the tyre sags as you go; a finished one keeps sighing down to the rim */
function deflateTick(M,dt){for(let i=0;i<M.vis.trucks.length;i++){const tr=M.vis.trucks[i],f=[0,0,0,0];let ch=false;
  for(let j=0;j<2;j++){const k=i*2+j,v=M.valves[k],pv=v.lastP||0,cur=v.prog||0;
    if(!v.done&&cur>pv+1e-4){v.flat=Math.max(v.flat,cur*.55);v.hissT=(v.hissT||0)-dt;if(v.hissT<=0){v.hissT=K.hissEvery;M.S.noise({x:v.wx,z:v.wz,r:K.hiss,kind:'hiss'});hissSnd(M,v.wx,v.wz);noiseRing(M,v.wx,v.wz,K.hiss,[.7,.9,1]);
        if(!M.said.hissLine){M.said.hissLine=1;say(M,'you',pick(L.hiss))}}}
    if(v.done&&v.flat<1){v.flat=Math.min(1,v.flat+dt/K.flatAfter);v.hissT=(v.hissT||0)-dt;if(v.hissT<=0){v.hissT=K.hissEvery*1.6;hissSnd(M,v.wx,v.wz)}}
    v.lastP=cur;const wi=tr.valves[j].wi;if(Math.abs((v.shown||0)-v.flat)>.004){v.shown=v.flat;ch=true}f[wi]=v.flat}
  if(ch){const ud=tr.obj.userData;if(ud.setDeflate)ud.setDeflate(f)}}}

/* ---------------- per frame ---------------- */
function clockStr(M){const m=Math.floor(K.clock0+(K.clock1-K.clock0)*clamp(M.clock/K.dawn,0,1)),h=Math.floor(m/60),mm=m%60;return h+':'+String(mm).padStart(2,'0')+' AM'}
function queueTick(M,dt){for(const q of M.queue)q.t-=dt;while(M.queue.length&&M.queue[0].t<=0){const q=M.queue.shift();if(q.fn){try{q.fn()}catch(_){}continue}radio(A(),q.w,q.x,!!q.front)}
  M.queue.sort((p,q)=>p.t-q.t)}
function gateTick(M){const O=window.HT&&HT.OpenWorld,g=O&&O.prop&&O.prop('millshop.gate');if(!g)return;if(!M.gate||M.gate.g!==g){M.gate={g,x0:g.position.x}}g.position.x=M.gate.x0+Y.gateShift}
function gateRestore(M){if(M.gate&&M.gate.g){M.gate.g.position.x=M.gate.x0;M.gate=null}}
function nvgOn(){const N=window.NIGHT;return!!(N&&N.nvg)}

function postInit(M,o){const a=A(),P=a.P;
  /* no guns tonight: the hands hold a pocketful of jerky (fire = toss a treat) */
  if(P.dude&&P.dude.gun)a.equip(P.dude,null);if(P.weapons&&P.weapons.length){M.savedW=P.weapons.slice();P.weapons.length=0}M.item='sab_treat';
  if(!(o&&o.checkpoint)){const ex=a.L.exit;if(ex){P.pos.set(ex.x,0,ex.z);a.collide(P.pos,.35);P.yaw=Math.atan2(-(427-ex.x),-(114-ex.z))}
    lineSeq(M,L.open.concat([nvgUsable()?L.nvgYes:L.nvgNo,L.route,L.flash,L.sign]),3.6)}
  try{const Au=window.HT&&HT.Audio;if(Au&&Au.music)Au.music('tension',{intensity:.2})}catch(_){}}
function nvgUsable(){try{const s=A().SV(),g=s&&s.gadgets&&s.gadgets.nvg;return!!(g&&g.owned&&g.equipped!==false)}catch(_){return false}}
function applyLoad(M){const s=M.loadState;if(!s||!M.vis||!M.vis.trucks)return;M.loadState=null;const a=A();
  for(let k=0;k<M.valves.length;k++){const v=M.valves[k];v.shown=-1}deflateTick(M,0);
  if(M.sign===2)signDone(M);else{M.sign=0;placeRoll(M)}
  if(M.ledger&&M.vis.ledger)M.vis.ledger.visible=false;
  if(M.toyIn&&M.tiny){M.tiny.st='happy'}
  for(const gs of s.gs||[]){const g=M.g&&M.g[gs.id];if(!g)continue;g.pos.x=gs.x;g.pos.z=gs.z;g.yaw=gs.yaw;g.k=gs.k%ROUTES[g.id].length;g.t=gs.t||0;g.mode='route';g.sit=false;
    if(gs.tied){g.tied=true;M.S.takedown(g.ob);handProp(M,g,null)}}
  M.S.calm(2.5);M.queue.length=0;M.cpWant=null}

J.item('sab_treat',{name:'Jerky treats',use(M){if(!M||!M.S||M.hide)return;const t=tossTarget();tossAt(M,t.x,t.z)}});

J.register('sabotage',{
  def:{giver:'sal',hood:'river',title:'Sign of the Times',role:"Sal · Dad's Auto, Since 1987",place:'Mill St Auto Recovery, Riverside',
    lines:["Remember Quik-Hook? They're back. New paint, new name: Mill St Auto Recovery. Same four trucks, same 'impound' racket.",
      "Those trucks roll out at dawn to hook Riverside cars. I want them to not roll out. Nobody gets hurt, and nothing gets broken that a pump can't fix.",
      "Valve core tool. Quarter turn. Tsssss. That's the sound of justice. Two tyres a truck, hang my banner over their sign, and don't get seen."],
    obj:"At night, sneak into the yard, let the air out of two tyres on each of the four tow trucks, hang Sal's banner over their sign and get out unseen.",
    crew:[],weapons:[],from:{place:'auto'},start:{x:386,z:125.5},site:'millshop',
    unlock:{done:['tow']},pay:1000,par:420,winTrust:10,roam:true,night:true,order:32,
    noGuns:L.noGuns,
    stages:['approach','job1','job2','job3','job4','exfil'],
    stageLabels:{approach:'The approach',job1:'1 of 5 done',job2:'2 of 5 done',job3:'3 of 5 done',job4:'4 of 5 done',exfil:'Getting out'},failPolicy:'soft',
    medals:['Finished','Ghost: nobody ever came looking','Ghost, and you never laid a hand on anyone (no zip-ties)'],
    radio:[['sal',"Don't slash them. We're not monsters. We're a full-service shop."]],
    endLine:"Four trucks sitting on their rims, a new banner over the bay, and nobody hurt. By lunch Sal has a Riverside branch, and two Riverside mechanics who used to drive forty minutes to work now walk there."},

  start(M,o){M.vis={own:[]};M.queue=[];M.said={};M.t=0;M.clock=0;M.valves=[];M.sign=0;M.ledger=false;M.toyIn=false;M.treats=K.treats;M.ties=0;M.tiedIds=[];M.ghost=true;M.hide=null;M.spot=null;M.noiseV=0;M.allDone=false;M.cpWant=null;M.leaveT=0;
    M.live=true;LIVE.M=M;
    if(init(M)){M.valves=[];for(const tr of M.vis.trucks)for(const v of tr.valves)M.valves.push(v);postInit(M,o)}
    else{for(let i=0;i<8;i++)M.valves.push({flat:0,done:false,prog:0})}},

  upd(dt,M,F){const a=A(),P=a.P;
    if(!M.vis||!M.vis.trucks){if(!init(M)){F.objs.push(['Sal is finding the valve tool...',false]);return}M.valves=[];for(const tr of M.vis.trucks)for(const v of tr.valves)M.valves.push(v);postInit(M,{})}
    if(M.loadState)applyLoad(M);
    M.t+=dt;M.clock+=dt;queueTick(M,dt);gateTick(M);
    const left=K.dawn-M.clock;
    if(left<=0)return a.endMission(false,L.dawnFail,'Dawn.');
    if(left<K.dawn*30/110&&!M.said.d30){M.said.d30=1;say(M,L.dawn30[0],L.dawn30[1])}if(left<K.dawn*10/110&&!M.said.d10){M.said.d10=1;say(M,L.dawn10[0],L.dawn10[1],true)}
    hideTick(M,F);carryTick(M);tossTick(M,dt);
    const pl=M.pl=playerState(M);
    M.S.tick(dt,pl);
    for(const id of ORDER)guardTick(M,M.g[id],dt);tinyTick(M,dt);
    if(M.spot){M.spot.t+=dt;if(M.spot.t>=1.6&&!M.spot.done){M.spot.done=true;const g=M.spot.g;return a.spotted((g?'"'+L.caught[g.id]+'" ':'')+L.caughtFail)}}
    objectives(M,F,dt);deflateTick(M,dt);radioTick(M,dt);
    if(M.cpWant&&M.S.max()<.3&&!M.spot&&!M.hide){const st=M.cpWant;M.cpWant=null;if(st!==M.stage)a.CP.mark(st)}
    /* HUD */
    const nT=M.valves.filter(v=>v.done).length,carry=P.carry&&P.carry.kind==='banner';
    M.allDone=nT>=8&&M.sign===2;
    F.meters.push({id:'eye',label:M.S.max()>=.6?'Searching':M.S.max()>=.35?'Noticed':'Unseen',style:'ring',v:M.S.max(),max:1,icon:'eye'});
    F.meters.push({id:'tyres',label:'Tyres',v:nT,max:8,style:'pips'});
    F.widgets.push({id:'dawn',kind:'timer',label:'Dawn',v:Math.max(0,left),max:K.dawn,hot:left<90,sub:clockStr(M)});
    if(!M.allDone){F.objs.push(['Let the air out: two tyres on each truck · '+nT+'/8',nT>=8]);
      F.objs.push([M.sign===2?"Sal's banner is up":carry?'Carry the banner to the sign over the bay on Mill St · no crouching':"Hang Sal's banner over their sign (it's in the back of your van)",M.sign===2]);
      F.objs.push(['Optional: the dispatch ledger on the office desk',M.ledger]);F.objs.push(["Optional: Tiny's squeaky hot dog, in Tiny's bed",M.toyIn])}
    else{F.objs.push(["Back to the van. Walk, don't run.",false]);if(!M.said.all){M.said.all=1;say(M,L.allDone[0],L.allDone[1],true);lineSeq(M,[],1)}}
    if(M.hide)F.objs.push([M.hide==='tarp'?'Hidden under the tarp':'Hidden in the porta-potty',true]);
    if(M.treats<K.treats||M.t>40)F.objs.push(['Jerky treats · '+M.treats+' (fire to toss: a distraction, or a snack for Tiny)',false]);
    /* the marker: the closest thing left to do */
    let tgt=null;if(M.allDone&&M.car)tgt={x:M.car.pos.x,z:M.car.pos.z,label:'Your van'};
    else if(carry)tgt={x:Y.mount.x,z:Y.mount.z,label:'The sign'};
    else{let bd=1e9;for(let k=0;k<M.valves.length;k++){const v=M.valves[k];if(v.done)continue;const d=hyp(v.x-P.pos.x,v.z-P.pos.z);if(d<bd){bd=d;tgt={x:v.x,z:v.z,label:'Tyre valve'}}}
      if(M.sign===0&&M.rollAt){const d=hyp(M.rollAt.x-P.pos.x,M.rollAt.z-P.pos.z);if(d<bd*.7||!tgt)tgt={x:M.rollAt.x,z:M.rollAt.z,label:"Sal's banner"}}}
    F.target=tgt;
    /* leash: the job is the yard */
    const dy=hyp(P.pos.x-427,P.pos.z-114);if(dy>K.leash&&!a.CV){M.leaveT+=dt;F.objs.push(['Get back to the yard ('+Math.max(0,Math.ceil(12-M.leaveT))+')',false,'warn']);if(M.leaveT>12)return a.endMission(false,"You wandered off and the night got away from you.","You left the job.")}else M.leaveT=0;
    /* the eye, the gem, the cones */
    const st=window.HT.Stealth.T,vis=pl.hidden?0:clamp((pl.lit-.32)/.68,0,1)*(st.stance[pl.stance]||1)/1.1;M.noiseV=Math.max(0,M.noiseV-dt*6);
    if(M.viz)M.viz.update(dt,{nvg:nvgOn(),night:true});if(M.hud)M.hud.update(dt,{vis,noise:M.noiseV,hidden:!!M.hide,hide:false});
    if(M.vis.noisyMat)M.vis.noisyMat.opacity=nvgOn()?.32+.1*Math.sin(M.t*4):.0;if(M.vis.holeRing)M.vis.holeRing.material.opacity=M.vis.noisyMat.opacity;
    for(const l of M.vis.lights||[])l.l.intensity=l.i*(window.NIGHT?window.NIGHT.gain||1:1)*.35;
    M.musT=(M.musT||0)-dt;if(M.musT<=0){M.musT=.5;try{const Au=window.HT&&HT.Audio;if(Au&&Au.music)Au.music('tension',{intensity:M.spot?1:.2+.65*M.S.max()})}catch(_){}}
    /* done: getting in the van ends it (winTrust carries the ghost bonus) */
    M.exitOpen=M.allDone;M.def.winTrust=10+(M.ghost?K.trust.ghost:0);
    if(M.allDone&&M.car&&hyp(P.pos.x-M.car.pos.x,P.pos.z-M.car.pos.z)<14&&!M.said.end){M.said.end=1;lineSeq(M,L.ending,3)}
    M.score=M.ghost?(M.ties?2:3):1},

  /* [CP] what a stage needs: the clock, every valve, the banner, the ledger, the toy, who's zip-tied, where the guards are on their routes */
  save(M){const gs=M.g?ORDER.map(id=>{const g=M.g[id];return{id,x:Math.round(g.pos.x*100)/100,z:Math.round(g.pos.z*100)/100,yaw:Math.round(wrap(g.yaw)*1000)/1000,k:g.k,t:Math.round((g.t||0)*10)/10,tied:!!g.tied}}):(M.gsave||[]);
    return{clock:Math.round((M.clock||0)*10)/10,v:(M.valves||[]).map(v=>v.done?1:Math.round((v.flat||0)*100)/100),sign:M.sign===2?2:0,ledger:!!M.ledger,toy:!!M.toyIn,treats:M.treats==null?K.treats:M.treats,ties:M.ties||0,ghost:M.ghost!==false,gs}},
  load(M,s){if(!s)return;M.clock=s.clock||0;(s.v||[]).forEach((x,k)=>{const v=M.valves&&M.valves[k];if(!v)return;v.done=x===1;v.flat=x===1?1:x;v.prog=0});
    M.sign=s.sign===2?2:0;M.ledger=!!s.ledger;M.toyIn=!!s.toy;M.treats=s.treats;M.ties=s.ties||0;M.ghost=s.ghost!==false;M.gsave=s.gs||[];M.loadState=s;if(M.vis&&M.vis.trucks)applyLoad(M)},
  payout(M,ok){if(!ok)return[];const out=[];
    if(M.ghost)out.push(['Ghost · nobody ever came looking',K.pay.ghost]);
    if(M.toyIn)out.push(["Good boy · Tiny's squeaky hot dog",K.pay.toy]);
    if(M.ledger)out.push(['The dispatch ledger',K.pay.ledger]);
    if(M.ties)out.push(['Zip-ties · very assertive cable management ×'+M.ties,0]);
    return out},
  medal:M=>M.ghost?(M.ties?2:3):1,
  end(M,ok){if(!ok)return;const a=A(),s=a.SV(),Sv=window.HT&&HT.Save;if(!s)return;
    s.flags=s.flags||{};s.flags.salBranch=true;
    try{if(Sv&&Sv.storefront)Sv.storefront(null,'millshop','honest');if(Sv&&Sv.household)Sv.household(null,'millshop');if(Sv&&Sv.perk&&!Sv.perk(null,'sal'))Sv.perk(null,'sal',true)}catch(_){}
    try{a.save()}catch(_){}},
  noise(n){const M=A().M;if(!M||!M.S||M.def.id!=='sabotage')return;if(!n||!n.player||n.kind!=='step')return;let mul=1,kind=null;const x=n.x,z=n.z;
    for(const s of Y.metal)if(Math.abs(x-s.x)<s.w/2+.1&&Math.abs(z-s.z)<s.d/2+.1){mul=2.5;kind='metal'}
    if(!kind)for(const s of Y.chains)if(Math.abs(x-s.x)<s.w/2+.15&&Math.abs(z-s.z)<s.d/2+.15){mul=2.2;kind='chain'}
    const gv=Y.gravel;if(!kind&&x>gv.x0&&x<gv.x1&&z>gv.z0&&z<gv.z1){mul=1.7;kind='gravel'}
    const r=n.r*mul;M.noiseV=Math.max(M.noiseV,r);noiseRing(M,x,z,r,kind?[1,.75,.35]:null);
    if(kind){M.S.noise({x,z,r,kind:'step',player:true,stance:n.r<=1.2?(mul>2?'stand':'crouch'):n.r<=3?'run':'sprint'});
      if(kind==='metal'){tone({f:140,to:90,type:'square',d:.16,gain:.05});tone({f:620,to:420,type:'triangle',d:.3,gain:.035})}
      else if(kind==='chain'){for(let i=0;i<3;i++)tone({f:1800+i*400,type:'square',d:.04,gain:.02,at:i*.05})}
      if(!M.said['surf_'+kind]){M.said['surf_'+kind]=1;say(M,'you',kind==='metal'?"BONG. Great. Sheet metal. Very subtle.":kind==='chain'?"Chains. Who leaves chains lying around? Tow guys. Tow guys do.":"Gravel. Crunchy. Step light.")}}},
  pose(dt){const a=A(),M=a.M;if(!M||M.def.id!=='sabotage'||!M.S)return;if(M.hide&&a.P.dude)a.P.dude.root.visible=false},
  hud(st){const M=A().M;if(!M||!M.S||M.def.id!=='sabotage')return;st.weapon={name:'Jerky treats',type:'treats',mag:M.treats,reserve:0,magSize:K.treats,reloading:0,holstered:false}},
  test:{give(a){/* Hitch Happens done (and the jobs before it), Riverside cast preloaded so the job starts without waiting */
      const h=window.__ht,s=a.SV();for(const id of['gary','rick','earl','tow']){const i=a.MISSIONS.findIndex(m=>m.id===id);if(i>=0&&h&&h.prog)h.prog.done[i]=true;if(s&&window.HT.Save&&HT.Save.jobRec)HT.Save.jobRec(s,id).done=true}
      if(s&&s.world)s.world.bridgeOpen=true;const PP=window.HT.People;
      if(PP&&PP.preload)try{PP.preload(['nb_pops','thug_track','thug_jacket'].filter(k=>PP.keys.includes(k)&&!PP.has(k))).catch(()=>{})}catch(_){}},
    step:(a,t,o)=>bot(a,t,o),
    sample:()=>({clock:212.4,valves:[0,1,2,3,4,5,6,7].map(i=>({flat:i<3?1:i===3?.4:0,done:i<3,prog:0})),sign:0,ledger:true,toyIn:false,treats:2,ties:1,ghost:true,
      gsave:[{id:'walt',x:426.1,z:119.9,yaw:2.9,k:0,t:3,tied:false},{id:'kyle',x:430,z:122.7,yaw:-1.57,k:3,t:0,tied:true},{id:'boss',x:420.5,z:107.5,yaw:3.14,k:0,t:10,tied:false}]})}
});

/* ---------------- cleanup: when the job ends, is retried or replayed, free everything it built (repeated runs must not grow memory) ---------------- */
const LIVE={M:null};
function cleanup(M){if(!M||M.cleaned)return;M.cleaned=true;M.live=false;
  try{gateRestore(M)}catch(_){}
  try{if(M.viz)M.viz.dispose()}catch(_){}try{if(M.hud)M.hud.dispose()}catch(_){}M.viz=M.hud=null;
  try{if(M.S)M.S.dispose()}catch(_){}
  const v=M.vis||{};for(const tr of v.trucks||[]){try{const ud=tr.obj.userData;if(ud.dispose)ud.dispose();if(tr.obj.parent)tr.obj.parent.remove(tr.obj)}catch(_){}}
  for(const l of v.lights||[]){try{if(l.l.shadow&&l.l.shadow.map){l.l.shadow.map.dispose();l.l.shadow.map=null}if(l.l.dispose)l.l.dispose();if(l.l.parent)l.l.parent.remove(l.l)}catch(_){}}
  if(v.g&&v.g.parent)v.g.parent.remove(v.g);if(M.tiny&&M.tiny.d&&M.tiny.d.parent)M.tiny.d.parent.remove(M.tiny.d);
  for(const x of v.own||[])try{x.dispose()}catch(_){}
  v.own=[];v.noiseBuf=null;v.trucks=[];v.lights=[];if(LIVE.M===M)LIVE.M=null}
J.on('pose',()=>{const M=LIVE.M;if(!M)return;const a=A(),cur=a&&a.M;if(cur!==M||M.state!=='go'){if(M.state!=='go'&&cur===M){M.endT=(M.endT||0)+1;if(M.endT<3)return}cleanup(M)}});
const _start=J.get('sabotage').start;J.get('sabotage').start=function(M,o){if(LIVE.M&&LIVE.M!==M)cleanup(LIVE.M);return _start.call(this,M,o)};

/* ---------------- the scripted player (dev/jobs-check.js): teleports between safe moments, but only acts when nobody could see it ---------------- */
function safeAt(M,x,z,stance,dur){const S=M.S;if(S.max()>.3)return false;const pr=S.probe({x,z,stance:stance||'crouch',lit:S.lightAt(x,z,1,.4)});if(pr.v>0)return false;
  for(const id of ORDER){const g=M.g[id];if(g.tied)continue;const d=hyp(g.pos.x-x,g.pos.z-z);if(d<5)return false;const ang=Math.abs(wrap(yawTo(x-g.pos.x,z-g.pos.z)-g.ob.yaw));
    if(d<(dur||2.5)*1.5+6&&ang<2)return false;if(g.ob.lamp&&d<27&&ang<.75&&!M.S.blocked(g.pos.x,g.pos.z,1.65,x,z,stance==='crouch'?.9:1.45))return false}
  const T=M.tiny;if(T&&!T.ob.off&&hyp(T.pos.x-x,T.pos.z-z)<(stance==='crouch'?4.6:12.5))return false;return true}
function bot(a,t,o){const M=a.M,P=a.P;if(!M||M.state!=='go'||!M.S||!M.vis||!M.vis.trucks)return null;const k=a.keys;
  const B=M.bot||(M.bot={act:null,wait:0,log:[]});const tp=(x,z)=>{P.pos.set(x,0,z);a.collide(P.pos,.35)};
  if(a.CV){if(!M.exitOpen)a.exitCar();return null}
  if(M.hide){a.useTap=true;return null}
  const ex=a.L.exit||{x:M.car.pos.x+2.5,z:M.car.pos.z},home={x:ex.x,z:ex.z};
  if(o&&o.fail){k.e=false;P.crouch=false;if(t>20)tp(427,116.6);return null}
  if(M.allDone){k.e=false;if(P.carry)a.wmDrop();tp(M.car.pos.x+2.4,M.car.pos.z+.3);a.useTap=true;return null}
  if(B.act){const c=B.act;c.n++;if(c.done()){B.act=null;k.e=false;B.wait=8;return null}
    if(!safeAt(M,c.x,c.z,c.stance,.5)||c.n>c.max){B.log.push('abort '+c.id+' @'+Math.round(M.t));B.act=null;k.e=false;if(!c.keep)tp(home.x,home.z);B.wait=20;return null}
    tp(c.x,c.z);P.crouch=c.stance==='crouch';k.e=!c.tap;if(c.tap&&c.n===2)a.useTap=true;if(c.yaw!=null)P.yaw=c.yaw;return null}
  k.e=false;if(B.wait>0){B.wait--;return null}
  const T=M.tiny,acts=[];
  /* Tiny first: a treat where he can reach it but off his bed, then the squeaky hot dog in the bed */
  if(!M.toyIn&&T.st==='bed'&&M.treats>0&&!M.toss)acts.push({id:'treat',x:427.2,z:116.7,stance:'crouch',max:4,fire:()=>tossAt(M,430.1,111.6),done:()=>true});
  if(!M.toyIn&&(T.st==='chew'||T.st==='eat'))acts.push({id:'toy',x:Y.bed.x-.6,z:Y.bed.z+.4,stance:'crouch',max:200,done:()=>M.toyIn});
  if(M.sign===0&&!P.carry)acts.push({id:'roll',x:M.rollAt.x,z:M.rollAt.z,stance:'stand',max:200,keep:true,done:()=>M.sign===1});
  if(M.sign===1)acts.push({id:'mount',x:Y.mount.x,z:Y.mount.z,stance:'carry',max:400,done:()=>M.sign===2,first:true});
  if(!P.carry)M.valves.forEach((v,i)=>{if(!v.done)acts.push({id:'valve'+i,x:v.x,z:v.z,stance:'crouch',max:300,done:()=>v.done})});
  if(!M.ledger&&!P.carry)acts.push({id:'ledger',x:Y.desk.x,z:Y.desk.z+.78,stance:'crouch',max:200,done:()=>M.ledger});
  acts.sort((p,q)=>(q.first?1:0)-(p.first?1:0));
  for(const c of acts){if(!safeAt(M,c.x,c.z,c.stance,c.id==='mount'?K.signHold:K.valveHold))continue;c.n=0;B.log.push(c.id+' @'+Math.round(M.t));
    if(c.fire){tp(c.x,c.z);P.crouch=true;c.fire();B.wait=30;return null}B.act=c;tp(c.x,c.z);P.crouch=c.stance==='crouch';return null}
  /* nothing safe right now: wait somewhere nobody looks */
  if(!P.carry&&hyp(P.pos.x-home.x,P.pos.z-home.z)>1)tp(home.x,home.z);if(P.carry&&M.sign===1&&hyp(P.pos.x-home.x,P.pos.z-home.z)>1)tp(home.x,home.z);return null}
})();
