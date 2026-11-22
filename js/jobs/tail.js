/* =====================================================================
   FOLLOWING DISTANCE (SPEC3 2.1): the tail. Doug's strand 1/2. The first user of HT.Tail (js/tail.js, loaded from here).
   Doug has noticed the same grey sedan fill up at Fill-Er-Up every Tuesday at 4:10 and drive off with a full trunk. You tail it
   from the pumps, over the bridge and round a kilometre of Riverside figure eights without being made: hang back, keep a car
   between you, take a parallel street, lose sight and pick him up again, and never pull up right behind him at the light. When he
   starts recognising the minivan, swap into a neighbour's parked car while he's stopped. At the Duke's old Dock St lot, park with
   a view of the back of a box truck, watch the handoff through Doug's binoculars (the trunk is full of Maple Heights' missing
   stuff, including Doug's pressure washer) and photograph the plate. Then put the borrowed car back where you found it.

   Stages ([CP]): gas (the pumps) -> tail (tail start) -> swap (after the swap) -> drop (the handoff) -> home (the borrowed car).
   Fail: lost (12 s in the losing/lost bands, or 160 m), spooked (suspicion 100), rammed him, or the crew at the drop makes you.
   Files: js/jobs/tail.js, js/tail.js (HT.Tail). Tests: node dev/tail.test.js, node dev/jobs-check.js tail --retry --replay --shots,
   node dev/jobs/tail.js (human-paced play, screenshots in docs/screenshots/jobs/tail/).
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api,H=()=>window.__ht||{};
/* the tail system rides along with this job (loaded once; later jobs reuse HT.Tail) */
(function(){const d=typeof document!=='undefined'?document:null;if(!d||!d.head||!d.createElement)return;
  if(!(window.HT.Tail&&HT.Tail.create)&&!(d.getElementById&&d.getElementById('ht-tail-js'))){const s=d.createElement('script');s.id='ht-tail-js';s.src='js/tail.js';if(d.head.appendChild)d.head.appendChild(s)}})();
const TL=()=>window.HT&&HT.Tail&&HT.Tail.create?HT.Tail:null;

/* ---------------- tuning ---------------- */
const K={pay:450,par:240,goldT:240,silverMax:70,goldMax:40,cleanMax:50,neverMade:150,returned:50,itemPay:20,
  r9Max:13.5,townMax:11,corner:6.2,gasT:15,pullT:17,lightT:8,stopT:1.1,dropNear:22,dropSus:18,coverMax:2,coverCd:8,oncomingCd:6.5,
  pulloverCd:45,pulloverT:6,ramV:3.2,touchV:.6};
const D=Math.PI/180,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const fwd=y=>[-Math.sin(y),-Math.cos(y)],rgt=y=>[Math.cos(y),-Math.sin(y)],yawTo=(dx,dz)=>Math.atan2(-dx,-dz);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const CAR_NAME={minivan:'minivan',sedan:'sedan',hatch:'hatchback',suv:'SUV',pickup:'pickup',workvan:'work van'};

/* ---------------- places (metres) ---------------- */
const START={x:210,z:18};                                  /* the dad parks in the north-west corner of the Fill-Er-Up lot */
const PUMP={x:227.2,z:28.3,yaw:-Math.PI/2};               /* the grey sedan at pump 4, nose east */
const EXIT=[[227.2,28.3],[232,28.6],[236.4,31],[239.4,35.4],[241.5,40.4],[245,43.7],[252,44.5]];
/* the route: Route 9 east, over the bridge, then a figure-eight tour of Riverside that ends on 4th St at Dock St */
/* (4th St between Ash and Mill runs through the community garden's props and 2nd St between Ash and Main through the laundromat's
   walls: the route never uses either; dev/jobs/tail.js checks the whole lane for static colliders) */
const RT=[[203,43],[315,43],[347,43],[379,43],[411,43],[443,43],[443,71],[443,99],[443,127],[411,127],[379,127],[347,127],[315,127],[315,99],[315,71],[347,71],[379,71],
  [379,43],[379,15],[411,15],[443,15],[443,43],[443,71],[443,99],[411,99],[379,99],[347,99],[315,99],[315,71],[315,43],[347,43],[379,43],[379,71],[379,99],[379,127],[411,127]];
const DROP=[[397,128.6],[400.6,129.4],[403.2,131.6],[404,134.6],[403.2,137.6],[401.4,139.4],[399.6,139.9]];/* east along Dock, then right through the gate */
const STOPS=[5,8,12,18,23];                              /* full stops at these route nodes (he's a careful driver: it's suspicious) */
const LIGHT_NODE=31;                                      /* the red light: 3rd & Main, eastbound, his second time through */
const FIG8_NODE=17;                                       /* where the loop crosses itself */
const TRUCK={x:393,z:135.5,yaw:Math.PI/2};               /* the box truck, nose west, its back (and the plate) toward Dock St east */
const SEDAN_PARK={x:399.6,z:139.9};
const WATCH=[{x:429,z:126.4,label:'Watch spot · Dock St'},{x:442.6,z:138,label:'Watch spot · 5th St'}];
const SIGNAL={x:383.4,z:47.4};                            /* the traffic light on the far corner of 3rd & Main */

/* ---------------- Doug ---------------- */
const L_={
  gas:[["doug","There. Gray sedan, pump four. Four-ten on the dot. Every Tuesday."],["doug","Rule one of tailing: be boring. You're a minivan. You're already halfway there."],
    ["doug","When he pulls out, count to three. Then count to three again. Then go."]],
  go:[["doug","He's moving. One... two... three. And again. Okay. Go. Gently. Like a sloth with somewhere to be."]],
  bridge:[["doug","Over the bridge. He drives like a man with a full trunk and an empty conscience."]],
  indicate:[["you","He's indicating right."],["doug","Nobody indicates. It's a trick."]],
  fig8:[["doug","He's doing a figure eight. He's checking for tails. Or he's lost."],["doug","Either way: don't copy every turn. Take a parallel street. We'll pick him up on the far side."]],
  close:["Two cars back. Two. Not one. Not zero. Zero is called 'following'.","Too close. I can read his air freshener. It says 'New Car'. It's lying.","Back off. Back OFF. He can see my glasses.",
    "This is tailgating. Tailing is a whole other word. Different letters.","If you can see the dust on his bumper, he can see the panic on your face."],
  tailgate:["He's checked his mirror three times. That's not a mirror check, that's a relationship.","We're dead center in his mirror. Drift. Drift like you're thinking about soup."],
  ideal:["Good. Thirty meters. Doug-approved.","Textbook. There's no textbook. If there were, this would be in it.","Maintain a three-second following interval. I didn't make that up. It's on the internet.",
    "Match his speed. Matching speed is key. Unless he stops. Don't match that.","Line of sight is a two-way street. If you can see his mirror, his mirror can see you.","I've read four books on this. Three were fiction. One was about birds. Same principles."],
  cover:["Perfect. A car between us. That's our human shield. Car shield.","Somebody's {c} is between us. Bless that {c}. Stay behind it.","Two cars back. Textbook. Write that down. Somebody write that down."],
  losing:["He's getting away. Gently. Gently close it up.","Losing him. I have partial visual. I have... a feeling.","He's pulling ahead. Not too fast. Pretend you just remembered the speed limit exists."],
  hidden:["He's round the corner. Don't panic. Panic quietly.","No visual. He's on the next block. Trust the route. Trust Doug."],
  reacq:["Reacquired! I love that word. Reacquired.","There he is. Gray sedan, twelve o'clock. I've always wanted to say twelve o'clock.","Got him. He never left. He was just... around a corner."],
  streak:["That's three turns in a row we copied. Take the next one wide. Or don't take it at all. Live a little.","We're taking every turn he takes. That's not a tail, that's a dance."],
  ahead:["You're in FRONT of him. That's not tailing, that's leading.","He's behind us now. Pull over. Pretend to look at a house. Point at it. Nod."],
  fam3:["He's looked at the van twice. Minivans are invisible until they're not."],
  made:["He's made the van. He knows the van. The van is compromised.","He's made us. Next time he stops, we swap cars."],
  pull:["He's pulling over. Drive past. Don't look at him. Look at me. No, don't look at me either.","He's stopped to see who stops with him. Don't stop with him."],
  fast:["He's speeding up. That's either suspicion or he really needs a bathroom."],
  horn:["Did you just HONK? At the man we're TAILING?","The horn. You used the horn. On a tail."],
  bump:["Subtle. Very subtle. Nobody notices a fender bender.","That's going to be a whole thing at the block party."],
  touch:["You TOUCHED him. You touched his CAR. With OUR car."],
  light:[["doug","Light's red. Do NOT pull up behind him. Pretend you're reading a text. Not while driving. Pretend."]],
  lightBad:["We're right behind him at a red light. This is the worst place on earth.","He's looking in his mirror. Smile. No! Don't smile. Neutral. Neutral face."],
  lightGood:["Hanging back at a light. Beautiful. That's the stuff they don't teach. Because nobody teaches this."],
  arrive:[["doug","He's turning into the old Dock Street lot. The Duke's place. Don't follow him in. Never follow him in."],
    ["doug","Park somewhere boring with a view of the back of that truck. Thirty, sixty meters. The plate's on the back. Plates live on the back."]],
  bino:[["doug","Binoculars. Right-click. I keep a pair in every car. Including yours, now. Surprise."]],
  plate:[["doug","Box truck. Get the plate. Steady. Steadier. Breathe like a sniper. A sniper who coaches T-ball."]],
  photo:[["doug","Got it. That's going on the corkboard. With red string."],["doug","Same truck, same lot, every week, I'd bet my glasses. Earl knows every timetable in this town. I'll ask Earl."]],
  photoBad:["Closer to the back. I need the plate, not a lovely shot of a truck's personality.","That's the side of the truck. The plate's on the back. I'm repeating myself because I care."],
  dropNear:["Too close. They're going to look up. Back off before somebody waves at us.","We're close enough to help them load. Let's not."]};
/* the swap: Doug picks the nearest neighbour's car */
const SWAP_CALL=(n,fam)=>[["doug",(fam>=.5?"He's had the minivan in his mirror for ten blocks. Swap. ":"He's stopped. Fresh car, fresh start. Swap. ")+"Grab "+n.name+"'s "+n.label+". "+n.name+" won't mind. "+n.name+" is at pickleball."],["doug","Pull up beside it and hold E. I'll bring the snacks."]];
const SWAP_IN={sedan:"This smells like menthol and regret. Perfect cover.",hatch:"My knees are in my ears. Nobody would ever suspect a man with his knees in his ears.",
  suv:"Heated seats. In a tail. I may cry.",pickup:"We're in a pickup. Everybody trusts a pickup.",workvan:"No windows back here. Very professional. Very 'we fix gutters'.",minivan:"Back in the van. It's like we never left. Because, emotionally, we never left."};
/* the handoff: what comes out of the trunk */
const ITEMS=[{id:'blower',label:"Phil's leaf blower",col:'#e8752a',line:"That's a leaf blower. That's Phil's leaf blower. Phil's been blaming his kid for a month.",miss:"Missed that. Something orange. Loud-looking."},
  {id:'heater',label:"The Hendersons' patio heater",col:'#8d9399',line:"Patio heater. The Hendersons'. They've been eating dinner in parkas since March.",miss:"Something tall. Like a lamp. A sad lamp."},
  {id:'gnome',label:"Bev's garden gnome",col:'#c8352c',line:"A gnome. Bev's gnome. Bev put up FLYERS. With a reward. It was a coupon.",miss:"Something small with a pointy red hat. It's a gnome. It's always a gnome."},
  {id:'bike',label:"A kid's bike with streamers",col:'#2fa8d8',line:"A kid's bike. With streamers. That's... that's just mean.",miss:"A small bike? I saw streamers. I'll be thinking about the streamers."},
  {id:'washer',label:"Doug's pressure washer",col:'#f2c230',line:"...That's my pressure washer. That's MY pressure washer. I told everyone I lent it to Ken. I've been cold to Ken for a MONTH.",miss:"Something yellow. Something... familiar."}];

/* ---------------- resources (disposed when the job ends, even on a replay or a retry) ---------------- */
let RES=null;const res=()=>RES||(RES={geo:[],mat:[],tex:[],veh:[],listeners:[],ov:{}});
const G_=g=>{res().geo.push(g);return g},M_=m=>{res().mat.push(m);return m},T_=t=>{res().tex.push(t);return t};
function freeAll(){const R=RES;RES=null;if(!R)return;const a=A();
  if(R.near0!=null&&a&&a.camera){a.camera.near=R.near0;a.camera.updateProjectionMatrix()}
  for(const o of Object.keys(R.ov))try{a&&a.overlay&&a.overlay(o,null)}catch(_){}
  for(const g of R.geo)try{g.dispose()}catch(_){}for(const m of R.mat)try{m.dispose()}catch(_){}for(const t of R.tex)try{t.dispose()}catch(_){}
  for(const v of R.veh)try{v.userData&&v.userData.dispose&&v.userData.dispose()}catch(_){}
  for(const[t,ev,fn]of R.listeners)try{t.removeEventListener(ev,fn)}catch(_){}
  for(const e of R.dom||[])try{e.remove()}catch(_){}hudHide(false)}
function listen(t,ev,fn){t.addEventListener(ev,fn);res().listeners.push([t,ev,fn])}
const std=(c,o)=>M_(new (A().THREE.MeshStandardMaterial)(Object.assign({color:A().lin?A().lin(c):c,roughness:.6,metalness:0},o||{})));
function canvasTex(w,h,f){const T3=A().THREE,c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);const t=new T3.CanvasTexture(c);if(T3.sRGBEncoding)t.encoding=T3.sRGBEncoding;t.anisotropy=4;return T_(t)}
function mesh(g,m,x,y,z,parent,rx,ry,rz){const T3=A().THREE,o=new T3.Mesh(G_(g),m);o.position.set(x||0,y||0,z||0);if(rx||ry||rz)o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=true;o.receiveShadow=true;if(parent)parent.add(o);return o}
const bx=(w,h,d)=>new (A().THREE.BoxGeometry)(w,h,d),cy=(r0,r1,h,s)=>new (A().THREE.CylinderGeometry)(r0,r1,h,s||14);

/* ---------------- the box truck (procedural; nose toward -z in its own space, so rotation.y = yaw) ---------------- */
const PLATE_TXT='7HXK 418';
function truckModel(){const a=A(),T3=a.THREE,g=new T3.Group();g.name='tailBoxTruck';
  const white=std('#eef0ee',{roughness:.42,metalness:.08}),cab=std('#e9ebe8',{roughness:.35,metalness:.12}),dark=std('#26292c',{roughness:.7}),chrome=std('#c9ced3',{roughness:.22,metalness:.85}),
    tyre=std('#151617',{roughness:.92}),rim=std('#a7adb3',{roughness:.35,metalness:.7}),glass=std('#1d2a36',{roughness:.08,metalness:.55}),trim=std('#3a3e42',{roughness:.55,metalness:.3}),
    lamp=M_(new T3.MeshStandardMaterial({color:a.lin('#fff6dd'),emissive:a.lin('#fff1cc'),emissiveIntensity:.6,roughness:.2})),
    red=M_(new T3.MeshStandardMaterial({color:a.lin('#8c1010'),emissive:a.lin('#ff2a1a'),emissiveIntensity:.5,roughness:.3})),
    amber=M_(new T3.MeshStandardMaterial({color:a.lin('#9a5a08'),emissive:a.lin('#ffa21a'),emissiveIntensity:.6,roughness:.3}));
  /* cab: a side profile extruded across the width, softly bevelled */
  const sh=new T3.Shape();[[-3.7,.58],[-3.74,1.28],[-3.58,1.47],[-3.26,2.42],[-3.08,2.58],[-1.62,2.58],[-1.62,.58]].forEach(([z,y],i)=>i?sh.lineTo(z,y):sh.moveTo(z,y));
  const cg=new T3.ExtrudeGeometry(sh,{depth:2.18,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:3,steps:1});cg.translate(0,0,-1.09);cg.rotateY(-Math.PI/2);
  mesh(cg,cab,0,0,0,g);
  /* windscreen and side glass */
  const ws=new T3.PlaneGeometry(2.02,.98);const w=mesh(ws,glass,0,1.96,-3.44,g,0,Math.PI,0);w.rotation.order='YXZ';w.rotation.x=-.33;
  for(const s of[-1,1]){const sw=mesh(new T3.PlaneGeometry(1.02,.72),glass,s*1.155,1.98,-2.42,g,0,s*Math.PI/2,0);sw.castShadow=false}
  /* grille, headlights, bumper, indicators */
  mesh(bx(1.36,.46,.06),trim,0,.98,-3.79,g);for(let i=0;i<4;i++)mesh(bx(1.3,.03,.03),chrome,0,.82+i*.11,-3.83,g);
  for(const s of[-1,1]){mesh(bx(.34,.2,.05),lamp,s*.86,1.08,-3.78,g);mesh(bx(.14,.1,.05),amber,s*1.04,.86,-3.77,g)}
  mesh(bx(2.42,.24,.26),dark,0,.62,-3.84,g);
  /* mirrors on arms */
  for(const s of[-1,1]){mesh(bx(.36,.035,.035),trim,s*1.3,2.08,-3.05,g);mesh(bx(.07,.38,.2),dark,s*1.5,2.02,-3.05,g)}
  /* door seams and handles */
  for(const s of[-1,1]){mesh(bx(.012,1.6,.012),trim,s*1.158,1.55,-1.72,g);mesh(bx(.012,1.6,.012),trim,s*1.158,1.55,-3.0,g);mesh(bx(.03,.04,.18),chrome,s*1.17,1.5,-2.0,g)}
  /* chassis rails, fuel tank, steps */
  for(const s of[-1,1])mesh(bx(.16,.22,6.9),dark,s*.48,.52,.0,g);
  const tank=mesh(cy(.24,.24,1.0,16),chrome,-1.0,.6,-.95,g,0,0,Math.PI/2);tank.rotation.set(Math.PI/2,0,0);
  for(const s of[-1,1])mesh(bx(.28,.05,.5),trim,s*1.12,.42,-2.5,g);
  /* the cargo box */
  const bs=new T3.Shape();bs.moveTo(-1.52,1.0);bs.lineTo(3.7,1.0);bs.lineTo(3.7,3.52);bs.lineTo(-1.52,3.52);bs.lineTo(-1.52,1.0);
  const bg=new T3.ExtrudeGeometry(bs,{depth:2.32,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,steps:1});bg.translate(0,0,-1.16);bg.rotateY(-Math.PI/2);
  const box=mesh(bg,white,0,0,0,g);
  /* corner posts and the rear frame */
  for(const s of[-1,1]){mesh(bx(.07,2.56,.07),trim,s*1.17,2.26,3.72,g);mesh(bx(.07,2.56,.07),trim,s*1.17,2.26,-1.53,g)}
  mesh(bx(2.42,.1,.09),trim,0,3.5,3.74,g);mesh(bx(2.42,.14,.12),trim,0,1.02,3.76,g);
  /* the interior (seen when the door rolls up) */
  const inner=M_(new T3.MeshStandardMaterial({color:a.lin('#4a4c4e'),roughness:.9,side:T3.BackSide}));const inb=mesh(bx(2.2,2.38,5.0),inner,0,2.24,1.1,g);inb.castShadow=false;
  const floor=mesh(bx(2.2,.04,5.0),std('#6b5a44',{roughness:.85}),0,1.07,1.1,g);floor.castShadow=false;
  /* the roll-up door */
  const slats=canvasTex(256,512,(c,W,Hh)=>{c.fillStyle='#e4e6e4';c.fillRect(0,0,W,Hh);for(let y=0;y<Hh;y+=32){const gr=c.createLinearGradient(0,y,0,y+32);gr.addColorStop(0,'#f4f5f3');gr.addColorStop(.75,'#d9dcd9');gr.addColorStop(1,'#a9adaa');c.fillStyle=gr;c.fillRect(0,y,W,32)}
    c.fillStyle='#55595c';c.fillRect(W/2-26,Hh-58,52,14);c.fillStyle='rgba(60,50,40,.18)';for(let i=0;i<40;i++){c.fillRect(Math.random()*W,Hh-60+Math.random()*60,2,1)}});
  const doorM=std('#ffffff',{map:slats,roughness:.5,metalness:.15});const pivot=new T3.Group();pivot.position.set(0,3.42,3.73);g.add(pivot);
  const door=mesh(new T3.PlaneGeometry(2.2,2.36),doorM,0,-1.18,0,pivot);door.castShadow=false;
  /* rear: bumper, tail lights, markers, the plate */
  mesh(bx(2.3,.16,.22),dark,0,.78,3.84,g);for(const s of[-1,1]){mesh(bx(.16,.3,.05),red,s*.98,1.16,3.79,g);mesh(bx(.1,.06,.04),amber,s*.95,3.42,3.79,g)}
  for(const x of[-.3,0,.3])mesh(bx(.08,.05,.04),amber,x,3.42,3.79,g);
  const plateT=canvasTex(512,256,(c,W,Hh)=>{c.fillStyle='#f6f6f0';c.fillRect(0,0,W,Hh);const gr=c.createLinearGradient(0,0,0,Hh);gr.addColorStop(0,'rgba(60,110,190,.3)');gr.addColorStop(.5,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(190,60,60,.2)');
    c.fillStyle=gr;c.fillRect(0,0,W,Hh);c.strokeStyle='#22314d';c.lineWidth=10;c.strokeRect(8,8,W-16,Hh-16);c.fillStyle='#1d2c4f';c.font='bold 34px Arial';c.textAlign='center';c.fillText('COMMERCIAL',W/2,52);
    c.font='bold 118px "Arial Narrow",Arial';c.fillStyle='#14203a';c.fillText(PLATE_TXT,W/2,182);c.font='bold 22px Arial';c.fillText('TRUCK',W/2,236)});
  const plate=mesh(new T3.PlaneGeometry(.52,.26),M_(new T3.MeshStandardMaterial({map:plateT,roughness:.45,metalness:.2})),0,.9,3.955,g);plate.castShadow=false;
  /* side lettering: generic, faded */
  const side=canvasTex(1024,256,(c,W,Hh)=>{c.clearRect(0,0,W,Hh);c.fillStyle='rgba(32,72,120,.85)';c.fillRect(0,Hh-46,W,20);c.fillStyle='rgba(200,60,40,.8)';c.fillRect(0,Hh-22,W,10);
    c.fillStyle='rgba(32,72,120,.78)';c.font='bold 92px Arial';c.textAlign='left';c.fillText('ALL-PURPOSE',40,96);c.font='bold 64px Arial';c.fillText('HAULING · LOCAL & LONG DISTANCE',40,170)});
  for(const s of[-1,1]){const p=mesh(new T3.PlaneGeometry(4.6,1.15),M_(new T3.MeshStandardMaterial({map:side,transparent:true,roughness:.5,depthWrite:false})),s*1.2,2.25,1.08,g,0,s*Math.PI/2,0);p.castShadow=false;if(s<0)p.scale.x=-1}
  /* wheels: singles at the front, duals at the back; arches; mud flaps */
  const wheel=(x,z,dual)=>{const wg=new T3.Group();wg.position.set(x,.5,z);g.add(wg);const t=mesh(cy(.5,.5,dual?.56:.32,22),tyre,0,0,0,wg,0,0,Math.PI/2);
    for(const s of dual?[-1,1]:[1]){const r=mesh(cy(.3,.3,.02,18),rim,Math.sign(x)*((dual?.28:.16)+.005)*1,0,0,wg,0,0,Math.PI/2);r.position.x=Math.sign(x)*(dual?.285:.165);
      mesh(cy(.09,.12,.06,10),chrome,Math.sign(x)*(dual?.31:.19),0,0,wg,0,0,Math.PI/2)}return wg};
  const wheels=[wheel(-1.0,-2.82,false),wheel(1.0,-2.82,false),wheel(-.92,2.3,true),wheel(.92,2.3,true)];
  for(const s of[-1,1]){mesh(bx(.06,.5,.04),dark,s*1.0,.45,3.05,g);const ar=mesh(new T3.CylinderGeometry(.62,.62,.34,16,1,true,0,Math.PI),dark,s*1.03,.52,-2.82,g,0,0,Math.PI/2);ar.rotation.set(0,Math.PI/2,Math.PI/2)}
  g.userData={door:pivot,doorMesh:door,wheels,plate,lamp,red};return g}
function doorSet(tr,k){const d=tr.userData.doorMesh;/* rolled-up: the curtain shortens toward the top */const s=Math.max(.06,1-k*.94);d.scale.y=s;d.position.y=-1.18*s}

/* ---------------- the traffic light at 3rd & Main ---------------- */
function signalModel(){const a=A(),T3=a.THREE,g=new T3.Group();g.name='tailSignal';const pole=std('#4b5450',{roughness:.5,metalness:.5}),head=std('#20262a',{roughness:.6});
  mesh(cy(.11,.14,5.4,12),pole,0,2.7,0,g);mesh(cy(.22,.26,.25,12),pole,0,.12,0,g);
  const arm=mesh(cy(.07,.07,4.4,10),pole,0,5.2,-2.1,g,Math.PI/2,0,0);arm.castShadow=true;mesh(cy(.04,.04,2.0,8),pole,0,4.5,-.8,g,-.9,0,0);
  const lens=c=>{const m=M_(new T3.MeshStandardMaterial({color:a.lin(c),emissive:a.lin(c),emissiveIntensity:0,roughness:.25}));return m};
  const heads=[];for(const[hz,ry]of[[-3.6,-Math.PI/2],[-3.6,Math.PI/2]]){const h=new T3.Group();h.position.set(0,4.55,hz);h.rotation.y=ry;g.add(h);
    mesh(bx(.36,1.06,.3),head,0,0,0,h);mesh(bx(.5,1.22,.03),head,0,0,-.16,h);const L={r:lens('#ff3020'),y:lens('#ffb020'),g:lens('#30e070')};
    [['r',.33],['y',0],['g',-.33]].forEach(([k,y])=>{const c=mesh(new T3.CircleGeometry(.12,18),L[k],0,y,.152,h);c.castShadow=false;const v=mesh(new T3.CylinderGeometry(.15,.15,.18,14,1,true,0,Math.PI),head,0,y+.04,.24,h,Math.PI/2,0,0);v.rotation.set(Math.PI/2,0,Math.PI)});heads.push(L)}
  g.userData={heads,state:'g'};return g}
function signalSet(sig,st){if(!sig||sig.userData.state===st)return;sig.userData.state=st;for(const L of sig.userData.heads){L.r.emissiveIntensity=st==='r'?3.2:.04;L.y.emissiveIntensity=st==='y'?3:.04;L.g.emissiveIntensity=st==='g'?2.6:.04}}

/* ---------------- loot props (what comes out of the trunk) ---------------- */
function itemModel(it){const a=A(),T3=a.THREE,g=new T3.Group(),m=std(it.col,{roughness:.5,metalness:.1}),k=std('#2a2c2e',{roughness:.7});
  if(it.id==='blower'){mesh(bx(.32,.3,.42),m,0,0,0,g);mesh(cy(.05,.06,.9,10),k,0,.02,-.55,g,Math.PI/2-.2,0,0);mesh(bx(.1,.16,.1),k,0,.22,.08,g)}
  else if(it.id==='heater'){mesh(cy(.05,.05,1.6,10),m,0,0,0,g,0,0,Math.PI/2-.15);mesh(cy(.42,.1,.2,16),m,.78,.1,0,g,0,0,Math.PI/2-.15);mesh(cy(.22,.24,.12,14),k,-.78,-.1,0,g,0,0,Math.PI/2-.15)}
  else if(it.id==='gnome'){mesh(cy(.13,.17,.3,12),std('#3b6fb0'),0,-.05,0,g);mesh(new T3.SphereGeometry(.11,12,10),std('#f1c7a3'),0,.17,0,g);mesh(new T3.ConeGeometry(.12,.3,12),m,0,.36,0,g);mesh(new T3.SphereGeometry(.07,10,8),std('#f4f4f0'),0,.08,-.1,g)}
  else if(it.id==='bike'){for(const z of[-.36,.36]){const w=mesh(new T3.TorusGeometry(.2,.035,8,18),k,0,-.12,z,g,0,Math.PI/2,0)}mesh(cy(.025,.025,.72,8),m,0,.02,0,g,Math.PI/2,0,0);
    mesh(cy(.025,.025,.36,8),m,0,-.02,-.22,g,.6,0,0);mesh(bx(.36,.03,.03),k,0,.24,-.36,g);for(const s of[-1,1])mesh(bx(.012,.36,.012),std(s>0?'#ff5fa8':'#ffe14a'),s*.17,.06,-.37,g)}
  else if(it.id==='washer'){mesh(bx(.46,.4,.36),m,0,0,0,g);mesh(bx(.36,.08,.3),k,0,.24,0,g);for(const s of[-1,1])mesh(cy(.09,.09,.06,12),k,s*.25,-.18,.12,g,0,0,Math.PI/2);mesh(new T3.TorusGeometry(.14,.025,6,14),k,0,.06,-.2,g)}
  return g}

/* ---------------- people (non-combatants: the driver and the three loaders) ---------------- */
function dude(look,x,z,ry){const a=A(),d=a.makeDude(look||{shirt:'#56606b',pants:'#2f3236'});d.root.position.set(x,0,z);d.root.rotation.y=ry||0;a.wmAdd(d.root);return d}
function pose(d,dt,o){const PP=window.HT&&HT.People;if(d&&d.rb&&PP&&PP.pose)try{PP.pose(d,dt,o||{moving:false,aim:false,mode:'stand'})}catch(_){}}
function walkTo(d,t,sp,dt){const r=d.root.position,dx=t.x-r.x,dz=t.z-r.z,l=Math.hypot(dx,dz);if(l<.25){pose(d,dt);return true}const s=Math.min(l,sp*dt);r.x+=dx/l*s;r.z+=dz/l*s;d.root.rotation.y=Math.atan2(dx,dz);pose(d,dt,{moving:true,speed:sp,aim:false,mode:'stand'});return false}
function faceTo(d,x,z,dt){const r=d.root,w=Math.atan2(x-r.position.x,z-r.position.z);r.rotation.y+=wrap(w-r.rotation.y)*Math.min(1,(dt||1)*5)}

/* ---------------- vehicles on rails: the sedan, cover traffic, oncoming traffic ---------------- */
/* traffic uses the light LOD-1 models like the game's own ambient traffic; the sedan you stare at for three minutes gets the hero model */
function lightCar(type,color){const VM=window.HT&&HT.Vehicles;if(!VM||!VM.make)return null;try{const v=VM.make(type,{color,lod:1});if(!v)return null;v.userData.mod=true;v.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.userData.noBatch=true}});return v}catch(_){return null}}
function railCar(M,type,color,path,o){const a=A(),Tl=TL(),obj=(o&&o.kind!=='target'&&lightCar(type,color))||a.makeVehicle(type,color,o&&o.kind==='target'?{rims:'stock'}:undefined)||a.makeVanBox(color);a.wmAdd(obj);if(obj.userData&&obj.userData.dispose)res().veh.push(obj);
  const S=a.carSize({obj}),rail=Tl.Rail(path,Object.assign({len:S.l,gap:7},o||{}));const col=a.wmCol({x0:-1e4,z0:-1e4,x1:-1e4+1,z1:-1e4+1});
  const v={type,color,obj,rail,col,S,kind:o&&o.kind||'cover',doneT:0,id:(M.vid=(M.vid||0)+1)};rail.pri=(o&&o.pri||0)+v.id*1e-4;v.pri=rail.pri;/* unique priorities: no two-way standoffs */syncRail(v,0);return v}
function syncRail(v,dt){const a=A(),r=v.rail,o=v.obj;o.position.set(r.x,a.groundAt(r.x,r.z),r.z);o.rotation.set(0,r.yaw+Math.PI/2,0);
  const hl=v.S.l/2+.04,hw=v.S.w/2+.04,s=Math.abs(Math.sin(r.yaw)),c=Math.abs(Math.cos(r.yaw)),hx=s*hl+c*hw,hz=c*hl+s*hw;
  Object.assign(v.col,{x0:r.x-hx,x1:r.x+hx,z0:r.z-hz,z1:r.z+hz,ob:o.userData&&o.userData.mod?{x:r.x,z:r.z,fx:-Math.sin(r.yaw),fz:-Math.cos(r.yaw),hl,hw}:null});
  const VM=window.HT&&HT.Vehicles;if(o.userData&&o.userData.mod&&VM&&VM.update&&dt)try{VM.update(o,{speed:r.v,steer:r.steer,braking:r.brake,headlights:false,dt})}catch(_){}}
function dropRail(M,v){const a=A();if(v.obj.parent)v.obj.parent.remove(v.obj);v.col.x0=v.col.z0=-1e4;v.col.x1=v.col.z1=-1e4+1;v.col.ob=null;try{v.obj.userData.dispose&&v.obj.userData.dispose()}catch(_){}
  const R=res(),k=R.veh.indexOf(v.obj);if(k>=0)R.veh.splice(k,1)}

/* the route as road-graph nodes and a right-lane polyline */
function buildRoute(M){const a=A(),Tl=TL(),G=a.roads();if(!G||!Tl)return false;const ids=RT.map(([x,z])=>G.nearestNode(x,z));M.ids=ids;
  const lane=G.lane(ids);let k=0;while(k<lane.length-1&&lane[k].x<254)k++;let e=lane.length;while(e>k+2&&lane[e-1].z>120&&lane[e-1].x>394)e--;
  const pts=EXIT.map(([x,z])=>({x,z})).concat(lane.slice(k,e),DROP.map(([x,z])=>({x,z})));const P=Tl.poly(pts);M.P=P;
  /* where each route node sits along the poly (searched forward from the last one, so loops resolve in order) */
  let hint=0;M.nodeS=ids.map((id,i)=>{const n=G.nodes[id];if(i===0)return 0;const r=P.project(n.x,n.z,hint+60,90);hint=r.s;return r.s});
  M.turns=ids.map((id,i)=>{if(i===0||i===ids.length-1)return null;const A_=G.nodes[ids[i-1]],B=G.nodes[id],C=G.nodes[ids[i+1]];const y1=yawTo(B.x-A_.x,B.z-A_.z),y2=yawTo(C.x-B.x,C.z-B.z),d=wrap(y2-y1);
    return Math.abs(d)<.3?null:{dir:d>0?'L':'R',out:y2,x:B.x,z:B.z}});
  M.bridgeS=P.project(284,44.5,120,60).s;M.lotS=P.len-DROP.length*2.6;return true}
function speedAt(M){return s=>s<(M.bridgeS||0)+30?K.r9Max:K.townMax}

/* ---------------- the job ---------------- */
J.register('tail',{
  def:{giver:'doug',hood:'maple',title:'Following Distance',role:'Doug · Neighborhood Watch (Self-Appointed)',place:'Fill-Er-Up to Dock St',
    lines:["Same gray sedan. Fill-Er-Up, every Tuesday, four-ten. Fills the tank, drives off with the trunk riding low. Every Tuesday.",
      "I want to know where it goes. And no, we can't just ask. You don't just ASK. That's not how surveillance works. Or manners.",
      "We tail him. You drive, I commentate. Hang back, keep a car between us, and if he starts recognizing the minivan, we swap cars. I've thought about this a lot. Too much, my wife says."],
    obj:"Tail the gray sedan from Fill-Er-Up to wherever it's going without being made, then photograph whoever it meets.",
    crew:['doug'],weapons:['pistol'],from:{place:'g_doug'},start:{x:START.x,z:START.z},site:null,
    unlock:{done:['rick']},pay:K.pay,par:K.par,winTrust:10,roam:true,stay:true,order:20,
    noGuns:"Doug: We are OBSERVERS. Observers don't shoot. Observers take notes.",
    stages:['gas','tail','swap','drop','home'],stageLabels:{gas:'Fill-Er-Up',tail:'Tail start',swap:'After the swap',drop:'The handoff',home:'The borrowed car'},failPolicy:'soft',
    medals:['Finished','One car swap, suspicion never above 70%','Suspicion never above 40%, done in under 4:00'],
    radio:[['doug',"Park where he can't see us. North corner. Behind the air pump. Nobody looks at the air pump."]],
    endLine:"Doug: A gray sedan, a box truck, and my pressure washer. That's not a coincidence. That's a corkboard."},

  start(M,o){const a=A(),Tl=TL();freeAll();M.ph='gas';M.t=0;M.said={};M.cool={};M.q=[];M.qT=0;M.swaps=0;M.borrowed=[];M.items={};M.photo=null;M.vid=0;
    M.covers=[];M.oncoming=[];M.coverT=4;M.oncT=3;M.pullT=20;M.lightSt='g';M.rams=0;M.maxSus=0;M.everMade=false;M.tl=[];M.lastLos=true;M.seenT=0;M.dropSus=0;M.returned=false;
    M.hornPrev=false;M.score=0;M.s0=M.s0||0;
    if(!Tl||!buildRoute(M)){M.broken=true;return}
    M.T=Tl.create({carId:'van',carType:'minivan'});
    /* the sedan at pump 4, its driver at the pump */
    const path=M.P;M.tg=railCar(M,'sedan','#8f969c',path,{max:K.r9Max,corner:K.corner,kind:'target',pri:2,acc:2.8,dec:6.5,maxAt:speedAt(M)});M.tg.rail.place(0);syncRail(M.tg,0);
    M.driver=dude({shirt:'#4d5965',pants:'#2b2e33',cap:'#2a2d31'},PUMP.x-2.4,PUMP.z+1.6,Math.PI/2);M.driverIn=false;
    /* stops along the way */
    const st=[];for(const k of STOPS)st.push({s:M.nodeS[k]-6.6,t:K.stopT,kind:'stop',node:k});
    st.push({s:M.nodeS[LIGHT_NODE]-6.8,t:K.lightT,kind:'light',node:LIGHT_NODE,onHold:()=>{M.lightHold=true},onGo:()=>{M.lightHold=false;M.lightDone=true}});
    if(!(o&&o.checkpoint))carsHome(M);const sw=swapSpot(M);M.swapCar=sw?sw.car:null;st.push({s:sw?sw.stopS:M.nodeS[27]+12,t:K.pullT,lat:1.25,kind:'pull',until:()=>pullUntil(M),onHold:()=>{M.pullAt=M.t;pullHold(M)},onGo:()=>{M.pullDone=true}});
    M.tg.rail.stops=st.sort((p,q)=>p.s-q.s);M.tg.rail.max=K.r9Max;
    M.truck=truckModel();M.truck.position.set(TRUCK.x,a.groundAt(TRUCK.x,TRUCK.z),TRUCK.z);M.truck.rotation.y=TRUCK.yaw;a.wmAdd(M.truck,true);doorSet(M.truck,0);
    {const S=7.6,W=2.4,s=Math.abs(Math.sin(TRUCK.yaw)),c=Math.abs(Math.cos(TRUCK.yaw));a.wmCol({x0:TRUCK.x-(s*S/2+c*W/2),x1:TRUCK.x+(s*S/2+c*W/2),z0:TRUCK.z-(c*S/2+s*W/2),z1:TRUCK.z+(c*S/2+s*W/2)})}
    M.signal=signalModel();M.signal.position.set(SIGNAL.x,a.groundAt(SIGNAL.x,SIGNAL.z),SIGNAL.z);a.wmAdd(M.signal);signalSet(M.signal,'g');a.wmCol({x0:SIGNAL.x-.2,x1:SIGNAL.x+.2,z0:SIGNAL.z-.2,z1:SIGNAL.z+.2});
    /* the ambient traffic froze where it was when the job began: clear it, the job runs its own */
    try{const O=H().ow;if(O&&O.traffic)O.traffic(0,{player:a.P.pos,car:null,camera:a.camera,off:true})}catch(_){}
    a.wmSetWindow(a.wmWindow(START.x,START.z,20));
    /* the binoculars are a toggle (nothing held down): right-click raises and lowers, left-click / E / Space shoots, Esc lowers */
    if(typeof window!=='undefined'&&window.addEventListener){listen(window,'mousedown',e=>{if(M!==A().M||M.state!=='go')return;if(e.button===2)binoToggle(M);else if(e.button===0&&M.vfOn)snap(M)});
      listen(window,'keydown',e=>{if(M!==A().M||M.state!=='go'||e.repeat)return;if(e.key==='Escape'&&M.binoUp)binoToggle(M,false);else if((e.key===' '||e.code==='Space')&&M.vfOn)snap(M)})}
    if(o&&o.checkpoint)return;
    /* parked properly: nose toward the exit, so getting out after him is a drive, not a seven-point turn */
    {const e=a.CV;if(e&&Math.hypot(e.pos.x-START.x,e.pos.z-START.z)<12){e.pos.set(START.x,0,START.z);e.yaw=-Math.PI/2+.25;a.owStopCar(e);a.syncCar(e);a.P.yaw=e.yaw}}
    for(const l of L_.gas)say(M,l[1],{who:l[0]});
    const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.music('tension',{intensity:.25})}catch(_){}},

  upd(dt,M,F){const a=A();if(M.broken){F.objs.push(['(the tail system failed to load)',false]);return}
    M.t+=dt;tlTick(M);lineTick(M,dt);
    if(M.ph==='gas')gasTick(M,dt,F);
    else if(M.ph==='tail'||M.ph==='spook'||M.ph==='lost')tailTick(M,dt,F);
    else if(M.ph==='drop')dropTick(M,dt,F);
    else if(M.ph==='wrap')wrapTick(M,dt,F);
    else if(M.ph==='home')homeTick(M,dt,F);
    trafficTick(M,dt);
    if(M.tg)syncRail(M.tg,dt);signalTick(M,dt);
    if(M.T)M.maxSus=Math.max(M.maxSus,M.T.S.maxSus);
    const Au=window.HT&&HT.Audio;if(Au&&Au.ready&&M.T&&(M.muT=(M.muT||0)-dt)<=0){M.muT=.6;try{Au.setIntensity&&Au.setIntensity(.2+M.T.S.sus/100*.8)}catch(_){}}},

  /* [CP] what a stage needs: where the sedan is on its route, the meters, the swap, where the minivan was left */
  save(M){const r=M.tg&&M.tg.rail,T=M.T,V=A()&&A().VAN,cars=A()&&A().L&&A().L.cars;
    const bi=(M.borrowed&&M.borrowed.length&&cars)?cars.indexOf(M.borrowed[M.borrowed.length-1]):(M.bi!=null?M.bi:-1);
    return{ph:M.ph,s:Math.round((r?r.s:M.s0||0)*100)/100,T:T?T.save():(M.Ts||null),sw:M.swaps||0,bi,
      van:M.vanAt||null,pull:!!M.pullDone,light:!!M.lightDone,items:Object.keys(M.items||{}).sort(),photo:M.photo||null,max:Math.round((M.maxSus||0)*10)/10,made:!!M.everMade}},
  load(M,s){if(!s)return;const a=A();M.s0=s.s;M.Ts=s.T;M.swaps=s.sw||0;M.bi=s.bi;M.vanAt=s.van;M.pullDone=!!s.pull;M.lightDone=!!s.light;M.items={};for(const k of s.items||[])M.items[k]=true;M.photo=s.photo||null;M.maxSus=s.max||0;M.everMade=!!s.made;M.ph=s.ph;
    if(!M.T||!M.tg)return;M.T.load(s.T);M.T.S.maxSus=M.maxSus;const r=M.tg.rail;r.place(s.s);r.v=s.ph==='tail'?6:0;r.stops=r.stops.filter(q=>q.s>s.s+.5);
    if(M.pullDone)r.stops=r.stops.filter(q=>q.kind!=='pull');if(M.lightDone)r.stops=r.stops.filter(q=>q.kind!=='light');
    M.driverIn=true;if(M.driver)M.driver.root.visible=false;
    const cars=a.L&&a.L.cars,b=cars&&s.bi>=0?cars[s.bi]:null;if(b&&b!==a.VAN&&M.swaps){M.borrowed=[b];if(!b.home)b.home={x:b.pos.x,z:b.pos.z,yaw:b.yaw}}
    if(M.vanAt&&M.swaps&&a.VAN&&a.CV!==a.VAN){const V=a.VAN;V.pos.set(M.vanAt.x,0,M.vanAt.z);V.yaw=M.vanAt.yaw;a.owStopCar(V);a.syncCar(V)}
    M.nextNode=M.nodeS.findIndex(n=>n>s.s);if(M.nextNode<1)M.nextNode=M.ids.length;M.said.bridge=s.s>M.bridgeS?1:0;M.said.ind=1;if(s.s>M.nodeS[FIG8_NODE])M.said.fig8=1;
    if(s.ph==='tail'){M.ph='tail';M.saidGo=true}
    else if(s.ph==='drop'){r.place(M.P.len);r.done=true;r.v=0;M.ph='drop';dropStart(M,true)}
    else if(s.ph==='home'){r.place(M.P.len);r.done=true;M.ph='home';dropStart(M,true);finishHandoff(M);homeStart(M,true)}},
  payout(M,ok){if(!ok)return[];const out=[];if(!M.everMade)out.push(['Never made',K.neverMade]);
    const n=Object.keys(M.items||{}).length;if(n)out.push(['Itemised the trunk ×'+n,K.itemPay*n]);if(M.returned)out.push(['Returned '+(M.retName||'the borrowed car'),K.returned]);
    if(M.photo&&M.photo.stars>=3)out.push(['Sharp plate photo',30]);return out},
  medal(M){const mx=M.maxSus||0;if(mx<=K.goldMax&&M.elapsed<K.goldT)return 3;if(M.swaps>=1&&mx<=K.silverMax)return 2;return 1},
  end(M,ok){const a=A(),s=a.SV();if(!s)return;s.flags=s.flags||{};
    if(ok){s.flags.boxTruckPlate=PLATE_TXT;s.flags.corkboard=true;if((M.maxSus||0)<=K.cleanMax){a.addTrust(4,'maple');a.feed('Clean tail · +4 Maple trust','good','Suspicion never above 50%')}}
    else if(M.rammed){a.addTrust(-2,'maple')}
    try{a.save()}catch(_){}},
  /* E actions: the car swap, the binocular photo, leaving the borrowed car */
  interact(prompt){const M=A().M;if(!M||M.state!=='go')return null;return interactFor(M,prompt)},
  camera(dt){const M=A().M;if(!M||M.state!=='go')return undefined;return binoCam(M,dt)||undefined},
  hud(st){const M=A().M;if(!M)return;if(M.ph==='tail'||M.ph==='spook'||M.ph==='lost')st.routeTo=null;if(M.vfOn&&st.crosshair)st.crosshair.hidden=true},
  test:{give(a){const h=window.__ht,s=a.SV();for(const id of['gary','rick']){const i=a.MISSIONS.findIndex(m=>m.id===id);if(i>=0&&h&&h.prog)h.prog.done[i]=true;if(s&&window.HT.Save&&HT.Save.jobRec)HT.Save.jobRec(s,id).done=true}if(s&&s.world)s.world.bridgeOpen=true;/* the Act 2 "bridge is open" card was seen after Rick's job */if(s&&s.flags)s.flags.act2Intro=true;if(h&&h.prog)h.prog.act=Math.max(h.prog.act||1,2);
      const PP=window.HT.People;if(PP&&PP.preload)try{PP.preload(['dad_doug','thug_hoodie','thug_red','thug_cap','thug_jacket'].filter(k=>PP.keys&&PP.keys.includes(k)&&!PP.has(k))).catch(()=>{})}catch(_){}},
    step:(a,t,o)=>bot(a,t,o),
    sample:()=>({ph:'tail',s0:412.5,Ts:{sus:22.5,max:48,lose:1.2,fam:{van:.62},made:[],car:'van',type:'minivan'},swaps:0,bi:-1,vanAt:null,pullDone:false,lightDone:false,items:{},photo:null,maxSus:48,everMade:false})}
});

/* the result card: an observation job's numbers (suspicion, the trunk, the plate, the cars) instead of the generic fight stats */
const HEADS=['Nobody saw a thing.','Textbook. There is no textbook.','Boring, on purpose.','Two cars back the whole way.'];
J.on('hud',()=>{const a=A(),M=a&&a.M;if(!M||!M.def||M.def.id!=='tail'||M.state==='go'||M.resDone||typeof document==='undefined')return;
  const r=document.querySelector('.ht-result .col');if(!r)return;M.resDone=true;
  if(M.state==='won'){const h=r.querySelector('h2');if(h)h.textContent=HEADS[Math.min(HEADS.length-1,Math.floor((M.maxSus||0)/26))]}
  const cells=[...r.querySelectorAll('.ht-stats > div')],set=(d,k,v,sub)=>{if(!d)return;d.innerHTML='';const b=document.createElement('b'),sp=document.createElement('span');b.textContent=k;sp.className='ht-num';sp.textContent=v;d.appendChild(b);d.appendChild(sp);
    if(sub){const sm=document.createElement('small');sm.textContent=sub;d.appendChild(sm)}};
  const by=k=>cells.find(d=>{const b=d.querySelector('b');return b&&b.textContent.trim().toLowerCase()===k});
  const mx=Math.round(M.maxSus||0),n=Object.keys(M.items||{}).length;
  set(by('neutralized'),'Max suspicion',mx+'%',mx<=K.goldMax?'textbook':mx<=K.cleanMax?'clean tail':mx<=K.silverMax?'he wondered':'he knew');
  set(by('zip-tied'),'Itemised',n+'/'+ITEMS.length,n>=ITEMS.length?'the whole trunk':'out of the trunk');
  const grid=r.querySelector('.ht-stats');if(grid){const add=(k,v,sub)=>{const d=document.createElement('div');grid.appendChild(d);set(d,k,v,sub)};
    add('Plate',M.photo?'★'.repeat(M.photo.stars)+'☆'.repeat(3-M.photo.stars):'—',M.photo?PLATE_TXT+' · '+M.photo.d+' m':'no photo');
    add('Swaps',String(M.swaps||0),M.swaps?(M.returned?'car returned':'car still borrowed'):'stuck with the minivan')}});

/* free everything once the job is over (any ending: won, failed, quit, replayed). 'pose' runs every frame, headless too. */
J.on('pose',()=>{if(!RES)return;const a=A();if(!a)return;const M=a.M;if(a.mode==='mission'&&M&&M.def&&M.def.id==='tail')return;freeAll()});

/* ---------------- Doug's line queue (the radio keeps 4 lines; Doug paces himself) ---------------- */
function say(M,text,o){o=o||{};const q=M.q;const exp=M.t+(o.ttl||(o.chatter?9:30));if(o.front){q.unshift([o.who||'doug',text,o.if,exp]);if(q.length>4)q.length=4;return}if(o.chatter&&q.length>=1)return;q.push([o.who||'doug',text,o.if,exp]);if(q.length>6)q.splice(1,1)}
function sayAll(M,lines,front){if(front)for(let i=lines.length-1;i>=0;i--)say(M,lines[i][1],{who:lines[i][0],front:true});else for(const l of lines)say(M,l[1],{who:l[0]})}
function lineTick(M,dt){M.qT-=dt;if(M.qT>0||!M.q.length)return;const[w,t,ok,exp]=M.q.shift();if(ok&&!ok()||exp<M.t)return;A().radio(w,t);M.qT=Math.max(2.4,t.length*.055)+.35}
/* chatter with a cooldown per topic */
function chat(M,key,cd,pool,fill){if((M.cool[key]||0)>M.t)return false;M.cool[key]=M.t+cd;let l=pick(pool);if(fill)l=l.replace(/\{c\}/g,fill);say(M,l,{chatter:true});return true}
function once(M,key){if(M.said[key])return false;M.said[key]=1;return true}
function setT(M,t,fn){M.tl.push({at:M.t+t,fn})}
function tlTick(M){for(let i=0;i<M.tl.length;i++){const q=M.tl[i];if(q.at<=M.t){M.tl.splice(i--,1);try{q.fn()}catch(e){console.warn('[tail]',e)}}}}

/* ---------------- 1. the pumps ---------------- */
function gasTick(M,dt,F){const a=A(),d=M.driver;F.objs.push(['Wait. Look casual. Doug is watching pump four.',false]);F.target={x:PUMP.x,z:PUMP.z,label:'Gray sedan'};
  F.widgets.push({id:'pump',kind:'timer',label:'He leaves in',v:Math.max(0,K.gasT-M.t),hot:false});
  const door={x:PUMP.x+.4,z:PUMP.z-1.7};
  if(M.t<K.gasT-4){if(d){faceTo(d,PUMP.x-4,PUMP.z+1.6,dt);pose(d,dt)}}
  else if(!M.driverIn){if(walkTo(d,door,1.4,dt)){M.driverIn=true;d.root.visible=false;try{a.snd('reload',.4)}catch(_){}say(M,"He's in. Engine's on. Nobody breathe. You can breathe. Breathe quietly.",{chatter:true})}}
  if(M.t>=K.gasT&&M.driverIn){M.ph='tail';M.tailT0=M.t;sayAll(M,L_.go,true);a.CP.mark('tail');spawnRoute9Cover(M)}}

/* ---------------- 2. the tail ---------------- */
function playerCar(){const a=A(),e=a.CV;if(e)return{x:e.pos.x,z:e.pos.z,yaw:e.yaw,spd:e.car?e.car.spd:e.spd||0,type:e===a.VAN?'minivan':e.type,id:e===a.VAN?'van':(e.name||'car')+':'+e.type,e};
  const P=a.P;return{x:P.pos.x,z:P.pos.z,yaw:P.yaw,spd:0,type:'foot',id:'foot',e:null}}
function tailTick(M,dt,F){const a=A(),Tl=TL(),tg=M.tg,r=tg.rail,p=playerCar();
  /* the sedan drives (faster when suspicious, floors it when spooked) */
  const sus=M.T.S.sus;r.step(dt,{ahead:me=>Tl.aheadGap(me,obstacles(M,tg),30),speedAdd:M.ph==='spook'?11:sus>Tl.K.fastAt?Tl.K.fastAdd:0});
  if(M.ph!=='tail'){F.objs.push([M.ph==='spook'?'He made you':'You lost him',false,'warn']);M.endT-=dt;if(M.endT<=0)failNow(M);return}
  const t={x:r.x,z:r.z,yaw:r.yaw,spd:r.v,stopped:r.v<.5,light:!!M.lightHold};
  /* line of sight from his mirror to your car: houses, trees, and every car in between */
  if((M.losT=(M.losT||0)-dt)<=0){M.losT=.1;const grid={map:a.WORLD.map,block:a.WORLD.losblock||'#htVcTfrxA',tile:2};M.sight=Tl.los(t.x,t.z,p.x,p.z,{grid});M.los=M.sight&&Tl.los(t.x,t.z,p.x,p.z,{blockers:blockers(M)})}
  const ev=horn(M);if(ev)M.T.event('horn');
  const c=contact(M,p);if(c==='ram'){return rammed(M)}if(c==='touch'){M.T.event('touch');chat(M,'touch',8,L_.touch)}
  if(bumped(M,p,t))M.T.event('bump');
  const R=M.T.tick(dt,{t,p,carId:p.id,carType:p.type,los:M.los,sight:M.sight});
  /* the first seconds out of the pumps are forgiving: you have to get the van out of the lot */
  if(M.t-(M.tailT0||0)<14&&!M.retriedGrace)M.T.S.lose=Math.max(0,M.T.S.lose-dt*2.2);
  /* his turns: copy too many and he notices */
  while(M.nextNode==null||M.nextNode<M.ids.length&&r.s>=M.nodeS[M.nextNode]){M.nextNode=M.nextNode==null?1:M.nextNode+1;const k=M.nextNode-1,tn=M.turns[k];if(tn){M.T.turn(tn,tn.out,R.d<Tl.K.turnD);if(tn.dir&&once(M,'ind'))sayAll(M,tn.dir==='L'?[["you","He's indicating left."],["doug","Nobody indicates. It's a trick."]]:L_.indicate)}
    if(k===FIG8_NODE&&once(M,'fig8'))sayAll(M,L_.fig8);if(M.nextNode>M.ids.length)break}
  if(r.s>M.bridgeS&&once(M,'bridge'))sayAll(M,L_.bridge);
  /* reactions: past 50% he pulls over to see who stops with him; at 100 he's gone */
  if(R.sus>Tl.K.pullAt&&M.t>M.pullT&&!r.holding&&r.s<M.lotS-80){const s=nextClearS(M,r.s+22);if(s){M.pullT=M.t+K.pulloverCd;r.stops.push({s,t:K.pulloverT,lat:1.2,kind:'test',onHold:()=>{M.testing={sus0:M.T.S.sus}},onGo:()=>{M.testing=null}});r.stops.sort((x,y)=>x.s-y.s);chat(M,'pull',20,L_.pull)}}
  if(M.testing&&p.spd<1&&Math.hypot(p.x-t.x,p.z-t.z)<40&&Tl.cone(t,p)&&M.los){M.T.event('stopped',22*dt)}
  if(R.sus>Tl.K.fastAt)chat(M,'fast',30,L_.fast);
  if(R.made){M.everMade=true;if(M.T.S.madeNow){M.T.S.madeNow=null;say(M,pick(L_.made),{front:true})}}
  if(R.spooked){M.ph='spook';M.endT=3.2;M.failWhy='spooked';say(M,"He's made us. He's gone. Well. At least we know he's guilty of something. Speeding.",{front:true});const Au=window.HT&&HT.Audio;try{Au&&Au.ready&&Au.music('combat')}catch(_){}return}
  if(R.lost){M.ph='lost';M.endT=2.4;M.failWhy='lost';say(M,"We lost him. Somewhere out there, a gray sedan is very pleased with itself.",{front:true});return}
  commentary(M,R,t,p);
  /* the swap window (and any time you like, beside any neighbour's parked car) */
  if(r.holding&&r.holding.kind==='pull'&&M.swaps===0&&M.swapCar)F.target={x:M.swapCar.pos.x,z:M.swapCar.pos.z,label:M.swapCar.name+"'s "+(CAR_NAME[M.swapCar.type]||'car')};
  else if(R.seenT<1.2||R.d<60){M.lk={x:t.x,z:t.z};F.target={x:t.x,z:t.z,label:'Gray sedan'}}
  else if(M.lk)F.target={x:M.lk.x,z:M.lk.z,label:'Last seen'};
  /* objectives and meters */
  F.objs.push(['Tail the gray sedan · don\'t get made',false]);
  if(R.made)F.objs.push(['He knows this car: swap into a neighbor\'s parked car when he stops',false,'warn']);
  else if(r.holding&&r.holding.kind==='pull'&&M.swaps===0)F.objs.push(['He\'s stopped. Swap cars now: pull up beside '+(M.swapCar?M.swapCar.name+'\'s '+(CAR_NAME[M.swapCar.type]||'car'):'a parked car')+', hold E',false,'warn']);
  if(M.lightHold)F.objs.push(['Red light: don\'t pull up right behind him',false,'warn']);
  const zones=[[0,15,'bad','Too close'],[15,60,'good','Ideal'],[60,110,'warn','Losing'],[110,160,'bad','Lost']];
  F.meters.push({id:'dist',label:'Distance',v:Math.min(160,R.d),max:160,style:'bands',zones,marker:Math.min(160,R.d),sub:Math.round(R.d)+' m'+(!M.sight?' · no view':!M.los?' · covered':''),icon:'car'});
  F.meters.push({id:'sus',label:'Suspicion',v:R.sus,max:100,style:'ring',icon:'eye'});
  F.meters.push({id:'fam',label:R.made?'Car made':'Car known',v:R.fam*5,max:5,style:'pips',warn:4});
  if(R.lose>.5)F.widgets.push({id:'lose',kind:'timer',label:'Reacquire',v:Math.max(0,R.lostT-R.lose),max:R.lostT,hot:R.lose>R.lostT*.6});
  if(M.swaps)F.widgets.push({id:'car',kind:'score',label:'Car',v:M.swaps,sub:CAR_NAME[p.type]||p.type});
  /* he arrives */
  if(r.s>=M.lotS){M.ph='drop';a.CP.mark('drop');dropStart(M,false)}}
function loseWhy(M,why){const S=M.T&&M.T.S,r=M.tg&&M.tg.rail,p=playerCar();M.loseWhy={why,t:Math.round(M.t),stage:M.stage,s:r?Math.round(r.s):0,d:r?Math.round(Math.hypot(r.x-p.x,r.z-p.z)):0,
  sus:S?Math.round(S.sus):0,lose:S?+S.lose.toFixed(1):0,fam:S?+(S.fam[S.carId]||0).toFixed(2):0,made:S?!!S.made[S.carId]:false,cause:S?S.why||null:null,car:p.id,swaps:M.swaps,sight:!!M.sight}}
function failNow(M){const a=A();loseWhy(M,M.failWhy);if(M.failWhy==='spooked')a.endMission(false,"He spotted the tail and floored it. Doug says it was the minivan. It was the minivan.","Made");
  else a.endMission(false,"You lost the gray sedan. Doug is drawing the route from memory on a napkin.","Lost him")}
function rammed(M){const a=A();loseWhy(M,'rammed');M.rammed=true;M.rams++;say(M,"You RAMMED him. That's not tailing. That's the opposite of tailing.",{front:true});
  a.endMission(false,"You rammed the man you were tailing. He's fine. He's furious. Doug sighs a sigh you will remember.","Rammed him")}
/* chatter: band, cover, the light, familiarity, being ahead */
function commentary(M,R,t,p){const a=A(),Tl=TL();
  if(R.band==='close'&&!t.stopped){if(R.why==='ahead')chat(M,'ahead',14,L_.ahead);else chat(M,'close',9,L_.close)}
  else if(R.why==='tailgate')chat(M,'tailgate',18,L_.tailgate);
  else if(R.band==='losing'||R.band==='lost')chat(M,'losing',14,L_.losing);
  else if(R.band==='ideal'){const cv=coverBetween(M,p);if(cv)chat(M,'cover',30,L_.cover,CAR_NAME[cv.type]||'car');else chat(M,'ideal',24,L_.ideal)}
  if(!M.sight&&R.seenT>2.5&&R.d>25)chat(M,'hidden',30,L_.hidden);
  if(M.sight&&M.wasHidden&&R.d<110)chat(M,'reacq',30,L_.reacq);M.wasHidden=!M.sight&&R.seenT>2.5?true:M.sight?false:M.wasHidden;
  if(R.streak>=3&&R.streak!==M.lastStreak){M.lastStreak=R.streak;chat(M,'streak',20,L_.streak)}
  if(R.fam>=.6&&!R.made&&once(M,'fam3'+(p.id)))say(M,pick(L_.fam3),{chatter:true});
  if(M.lightHold&&once(M,'light'))sayAll(M,L_.light,true);
  if(M.lightHold&&Math.hypot(p.x-t.x,p.z-t.z)<14&&Math.abs(p.spd)<1)chat(M,'lightBad',8,L_.lightBad);
  if(M.lightHold&&Math.hypot(p.x-t.x,p.z-t.z)>20&&Math.abs(p.spd)<1&&M.los!==undefined)chat(M,'lightGood',60,L_.lightGood)}
function nextClearS(M,s){for(let k=0;k<6;k++,s+=12){if(M.nodeS.every(n=>Math.abs(n-s)>14)&&s<M.lotS-60)return s}return null}
/* the horn (H): a rising edge while driving within 60 m of him */
function horn(M){const a=A(),h=!!(a.keys&&a.keys.h&&a.CV);const edge=h&&!M.hornPrev;M.hornPrev=h;if(!edge||!M.tg)return false;const p=playerCar();if(Math.hypot(p.x-M.tg.rail.x,p.z-M.tg.rail.z)>60)return false;chat(M,'horn',6,L_.horn);return true}
/* contact with the sedan (circle pairs, like HT.CarAI.ram): a real hit fails the job, a kiss is very suspicious */
function circles(x,z,yaw,l,w){const f=fwd(yaw),o=l/4,r=w/2+.12;return[{x:x+f[0]*o,z:z+f[1]*o,r},{x:x-f[0]*o,z:z-f[1]*o,r}]}
function contact(M,p){if(!p.e)return null;const a=A(),r=M.tg.rail,S=a.carSize(p.e),A_=circles(p.x,p.z,p.yaw,S.l,S.w),B=circles(r.x,r.z,r.yaw,M.tg.S.l,M.tg.S.w);let hit=null;
  for(const u of A_)for(const v of B){const dx=v.x-u.x,dz=v.z-u.z,d=Math.hypot(dx,dz);if(d<u.r+v.r+.25){const nx=dx/(d||1),nz=dz/(d||1),fp=fwd(p.yaw),ft=fwd(r.yaw);
    const vn=(fp[0]*p.spd-ft[0]*r.v)*nx+(fp[1]*p.spd-ft[1]*r.v)*nz;if(!hit||vn>hit)hit=vn}}
  if(hit==null){M.touchT=0;return null}if(hit>K.ramV)return'ram';if(hit>K.touchV&&(M.touchT=(M.touchT||0)-1)<0){M.touchT=60;return'touch'}return null}
/* a bump into other traffic near him (he hears it) */
function bumped(M,p,t){if(!p.e)return false;const v=Math.abs(p.spd),dv=(M.pv||0)-v;M.pv=v;if(dv>4.5&&Math.hypot(p.x-t.x,p.z-t.z)<45&&(M.bumpT=(M.bumpT||0)-1)<0){M.bumpT=90;chat(M,'bump',10,L_.bump);return true}return false}

/* ---------------- the swap ---------------- */
function neighbourCars(){const a=A();return(a.L&&a.L.cars||[]).filter(e=>e&&e.obj&&e!==a.CV&&(e.owner==='neighbour'||e===a.VAN))}
/* the parked neighbour's car the route passes before his stop, and a stop ~30 m on round the corner */
/* the swap beat depends on neighbours' cars being where they live: whoever borrowed one last time (you, in an earlier run) has
   brought it back by now. Cars within 12 m of the route go home (never the car you're sitting in) */
function carsHome(M){const a=A();for(const e of neighbourCars()){if(e===a.VAN||e===a.CV||!e.home)continue;const h=e.home;if(Math.hypot(e.pos.x-h.x,e.pos.z-h.z)<1.5&&Math.abs(wrap(e.yaw-h.yaw))<.2)continue;
    if(M.P.project(h.x,h.z).d>12)continue;e.pos.set(h.x,0,h.z);e.yaw=h.yaw;try{a.owStopCar(e);a.syncCar(e)}catch(_){}}}
function swapSpot(M){let best=null;for(const e of neighbourCars()){if(e===A().VAN)continue;const r=M.P.project(e.pos.x,e.pos.z,700,260);if(r.d>9||r.s<420||r.s>M.lotS-150)continue;if(!best||r.s>best.s)best={car:e,s:r.s}}
  if(!best)return null;/* just round the next corner after the car: out of his mirror while you swap */const nx=M.nodeS.find(n=>n>best.s+8);let s=nx!=null?nx+12:best.s+30;for(let k=0;k<6;k++){if(M.nodeS.every(n=>Math.abs(n-s)>11))break;s+=4}return{car:best.car,stopS:s}}
/* he waits a little longer while you're parked beside the swap car (never more than 10 s extra) */
function pullUntil(M){const p=playerCar(),c=M.swapCar;if(M.swaps||!c||!p.e)return true;return!(Math.hypot(c.pos.x-p.x,c.pos.z-p.z)<9&&M.t-(M.pullAt||0)<K.pullT+10)}
function pullHold(M){if(M.swaps>0){say(M,"He's stopped. Phone call. Stay back. Look at a mailbox.",{chatter:true});return}
  const c=M.swapCar;if(c){const L2=SWAP_CALL({name:c.name,label:CAR_NAME[c.type]||'car'},M.T.S.fam[M.T.S.carId]||0);say(M,L2[1][1],{front:true,if:()=>!M.swaps});say(M,L2[0][1],{front:true,if:()=>!M.swaps})}else say(M,"He's stopped. If you're going to swap cars, it's now. Any parked car. Somebody's. Everybody's.",{front:true})}
function swapTarget(M){const p=playerCar();if(!p.e||Math.abs(p.spd)>3)return null;let best=null,bd=6.5;for(const e of neighbourCars()){if(e===p.e)continue;const d=Math.hypot(e.pos.x-p.x,e.pos.z-p.z);if(d<bd){bd=d;best=e}}return best}
function doSwap(M,e){const a=A(),Tl=TL();const from=a.CV,wasVan=from===a.VAN;if(!e||!from)return;if(wasVan)M.vanAt={x:from.pos.x,z:from.pos.z,yaw:from.yaw};
  const r=M.tg.rail,seen=Math.hypot(e.pos.x-r.x,e.pos.z-r.z)<30&&Tl.los(r.x,r.z,e.pos.x,e.pos.z,{grid:{map:a.WORLD.map,block:a.WORLD.losblock||'#htVcTfrxA',tile:2}})&&Tl.cone({x:r.x,z:r.z,yaw:r.yaw},{x:e.pos.x,z:e.pos.z},45);
  a.exitCar();a.enterCar(e);M.car=e;if(e!==a.VAN){if(!e.home)e.home={x:e.pos.x,z:e.pos.z,yaw:e.yaw};M.borrowed=[e]}
  const id=e===a.VAN?'van':(e.name||'car')+':'+e.type;M.T.swap(id,e===a.VAN?'minivan':e.type,seen);M.swaps++;M.swapHold=0;
  if(r.holding&&r.holding.kind==='pull')r.hold=Math.min(r.hold,4.5);
  setT(M,.6,()=>say(M,SWAP_IN[e===a.VAN?'minivan':e.type]||SWAP_IN.sedan,{front:true}));
  if(seen)setT(M,3.2,()=>say(M,"He saw that. He definitely saw a man change cars. Okay. He's half suspicious. We can work with half.",{front:true}));
  else if(M.swaps>1)setT(M,3.2,()=>say(M,"Every car we borrow is a car we owe somebody. I'm keeping a list. It's on the corkboard.",{chatter:true}));
  a.CP.mark('swap')}
function interactFor(M,prompt){const a=A();
  if(M.ph==='tail'&&a.CV){const e=swapTarget(M);if(e){const lab=e===a.VAN?'the minivan':e.name+"'s "+(CAR_NAME[e.type]||'car');return{txt:'Swap into '+lab,hold:1.2,fn:()=>doSwap(M,e)}}}
  if(M.vfOn&&a.CV&&M.ph!=='drop')return{txt:'Binoculars up',fn:()=>{}};/* E never drops you out of the car mid-look */
  if(M.vfOn&&a.CV&&M.ph==='drop'){const g=grade(M);return{txt:M.handoff==='done'?(g.ok?'Take the photo · '+'★'.repeat(g.stars):'Line up the plate · '+(g.why||'')):'Photo (once they shut the truck)',fn:()=>snap(M)}}
  if(M.ph==='home'&&a.CV&&a.CV!==a.VAN&&Math.abs(a.CV.car?a.CV.car.spd:0)<1){const b=M.borrowed[0];if(b&&Math.hypot(b.pos.x-b.home.x,b.pos.z-b.home.z)>12)return{txt:"Call it a day (leave "+b.name+"'s car here)",hold:1.5,fn:()=>homeEnd(M,false)}}
  return null}

/* ---------------- traffic: cover cars on his route, oncoming cars, Route 9 ---------------- */
const COVER_TYPES=['hatch','suv','sedan','pickup','workvan','sedan'],COVER_COLS=['#b9c0c7','#8a2f2a','#2e4a6b','#d8d4c8','#3d4a3a','#7a5a3a','#c9b48a','#4c5b70'];
function obstacles(M,me){const a=A(),out=[];const add=(v,pri)=>{if(v&&v.rail!==me&&v!==me)out.push({x:v.rail.x,z:v.rail.z,yaw:v.rail.yaw,len:v.S.l,pri:v.pri!=null?v.pri:pri})};
  if(M.tg&&M.tg!==me)add(M.tg,2);for(const v of M.covers)if(v!==me)add(v,1);for(const v of M.oncoming)if(v!==me)add(v,1);
  const p=playerCar();if(p.e){const S=a.carSize(p.e);out.push({x:p.x,z:p.z,yaw:p.yaw,len:S.l,pri:3})}return out}
function blockers(M){const out=[];for(const v of M.covers)out.push({x:v.rail.x,z:v.rail.z,r:v.type==='hatch'?1.0:1.25});for(const v of M.oncoming)out.push({x:v.rail.x,z:v.rail.z,r:1.0});return out}
function coverBetween(M,p){const r=M.tg.rail;for(const v of M.covers){const a1=Math.hypot(v.rail.x-p.x,v.rail.z-p.z),a2=Math.hypot(v.rail.x-r.x,v.rail.z-r.z),d=Math.hypot(r.x-p.x,r.z-p.z);if(a1+a2<d+6)return v}return null}
function spawnRoute9Cover(M){const a=A(),Tl=TL(),G=a.roads();if(!G)return;const ids=M.ids.slice(0,3);const lane=G.lane(ids.concat([G.nearestNode(347,15)]));
  const pts=[{x:150,z:44.5},{x:200,z:44.5}].concat(lane.filter(q=>q.x>202||q.z<40));const P=Tl.poly(pts);
  const v=railCar(M,'suv','#2e4a6b',P,{max:13.5,corner:K.corner,kind:'cover',pri:1});v.rail.place(26);v.rail.v=13;M.covers.push(v);
  const P2=Tl.poly([{x:120,z:44.5},{x:200,z:44.5}].concat(lane.filter(q=>q.x>202||q.z<40)));const v2=railCar(M,'hatch','#8a2f2a',P2,{max:13.5,corner:K.corner,kind:'cover',pri:1});v2.rail.place(0);v2.rail.v=13;M.covers.push(v2)}
function trafficTick(M,dt){if(!M.tg||M.ph==='gas'||M.ph==='home')return gentle(M,dt);const a=A(),Tl=TL(),G=a.roads(),p=playerCar(),r=M.tg.rail;
  const step=v=>{v.rail.step(dt,{ahead:me=>Tl.aheadGap(me,obstacles(M,me),26)});
    /* red light: cover cars on his route stop at the line too */
    if(M.lightSt!=='g'&&v.kind==='cover'&&v.lightS!=null){const ds=v.lightS-v.rail.s;if(ds>-.5&&ds<30&&!v.rail.stops.length)v.rail.stops.push({s:v.lightS,t:.2,kind:'light',until:()=>M.lightSt==='g'})}
    syncRail(v,dt);if(v.rail.done)v.doneT+=dt};
  for(const list of[M.covers,M.oncoming])for(let i=list.length-1;i>=0;i--){const v=list[i];step(v);const dp=Math.hypot(v.rail.x-p.x,v.rail.z-p.z);
    if(dp>170||(v.rail.done&&(dp>40||v.doneT>4))){dropRail(M,v);list.splice(i,1)}}
  if(M.ph!=='tail')return;
  /* a cover car merges onto his route from a side street, between you and him */
  M.coverT-=dt;const gapPT=Math.hypot(r.x-p.x,r.z-p.z);
  if(M.coverT<=0&&M.covers.length<K.coverMax&&!coverBetween(M,p)&&gapPT>32&&!r.holding){M.coverT=K.coverCd;const ps=M.P.project(p.x,p.z,r.s-gapPT,120).s;
    for(let k=1;k<M.ids.length-2;k++){const ns=M.nodeS[k];if(ns<ps+22||ns>r.s-10)continue;const node=G.nodes[M.ids[k]],prev=M.ids[k-1],next=M.ids[k+1];
      const side=node.e.map(e=>e.to).filter(t=>t!==prev&&t!==next);if(!side.length)continue;const sn=side[Math.floor(Math.random()*side.length)],S=G.nodes[sn];
      if(Math.hypot(S.x-p.x,S.z-p.z)<35)continue;const m=Math.min(M.ids.length-1,k+2+Math.floor(Math.random()*3));let nodes=[sn].concat(M.ids.slice(k,m+1));
      const last=G.nodes[M.ids[m]],exits=last.e.map(e=>e.to).filter(t=>t!==M.ids[m-1]&&t!==M.ids[m+1]);if(exits.length)nodes.push(exits[0]);nodes=extend(G,nodes,3);
      const P=Tl.poly(G.lane(nodes));const v=railCar(M,COVER_TYPES[M.vid%COVER_TYPES.length],COVER_COLS[(M.vid*3)%COVER_COLS.length],P,{max:K.townMax+1.5,corner:K.corner,kind:'cover',pri:1});
      v.rail.place(Math.max(0,P.project(S.x,S.z).s+6));v.rail.v=6;if(!M.lightDone&&LIGHT_NODE>=k&&LIGHT_NODE<=m){const nl=G.nodes[M.ids[LIGHT_NODE]];v.lightS=P.project(nl.x,nl.z,null).s-6.8}
      M.covers.push(v);break}}
  /* oncoming cars ahead of him, driving the other way (life on the street; they block sight lines too) */
  M.oncT-=dt;if(M.oncT<=0&&M.oncoming.length<2){M.oncT=K.oncomingCd+Math.random()*3;let k=M.nodeS.findIndex(s=>s>r.s+40);if(k>0&&k+1<M.ids.length){const nodes=extend(G,M.ids.slice(Math.max(0,k-3),k+2).reverse(),2);
      const S0=G.nodes[nodes[0]];if(Math.hypot(S0.x-p.x,S0.z-p.z)>60&&Math.hypot(S0.x-r.x,S0.z-r.z)>30){const P=Tl.poly(G.lane(nodes));const v=railCar(M,COVER_TYPES[(M.vid+2)%COVER_TYPES.length],COVER_COLS[(M.vid*5+1)%COVER_COLS.length],P,{max:K.townMax,corner:K.corner,kind:'oncoming',pri:0});M.oncoming.push(v)}}}}
/* carry a path on past its last node (straight on where possible) so traffic never ends its trip parked in a junction */
function extend(G,nodes,n){const out=nodes.slice();for(let i=0;i<n;i++){const a=G.nodes[out[out.length-2]],b=G.nodes[out[out.length-1]];if(!a||!b)break;const dx=Math.sign(b.x-a.x),dz=Math.sign(b.z-a.z);
    const opts=b.e.filter(e=>e.to!==a.id&&out.indexOf(e.to)<0);if(!opts.length)break;const st=opts.find(e=>e.dir[0]===dx&&e.dir[1]===dz)||opts[0];out.push(st.to)}return out}
function gentle(M,dt){/* outside the tail: keep whatever traffic exists moving out of the way, then let it go */const Tl=TL();if(!Tl)return;const p=playerCar();
  for(const list of[M.covers,M.oncoming])for(let i=list.length-1;i>=0;i--){const v=list[i];v.rail.step(dt,{ahead:me=>Tl.aheadGap(me,obstacles(M,me),26)});syncRail(v,dt);if(v.rail.done)v.doneT+=dt;
    const dp=Math.hypot(v.rail.x-p.x,v.rail.z-p.z);if(dp>170||(v.rail.done&&(dp>45||v.doneT>14))){dropRail(M,v);list.splice(i,1)}}}
/* the light: green until he comes up to it on his second pass, amber 1.8 s, red while he waits 8 s */
function signalTick(M,dt){if(!M.signal||!M.tg)return;const r=M.tg.rail,st=r.stops.find(q=>q.kind==='light');let want='g';
  if(st){const ds=st.s-r.s;if(ds<50){M.amberT=(M.amberT||0)+dt;want=M.amberT<1.8?'y':'r'}}if(r.holding&&r.holding.kind==='light')want='r';
  M.lightSt=want;signalSet(M.signal,want)}

/* ---------------- 3. the drop: the handoff and the plate ---------------- */
function dropStart(M,quiet){const a=A();const r=M.tg.rail;r.stops=[];M.handoff='wait';M.ht=0;M.carry=[];M.loaders=[];M.qItems=ITEMS.map((it,i)=>({it,i,st:'trunk'}));M.inTruck=0;
  /* three loaders by the truck's cab, the driver out by his trunk */
  const looks=[{shirt:'#3c4a5c',pants:'#2b2e33'},{shirt:'#6b4a3a',pants:'#3a3a3a',cap:'#1f2226'},{shirt:'#4a5a48',pants:'#2f3236'}];
  looks.forEach((lk,i)=>{const d=dude(lk,TRUCK.x-3.2+i*.9,TRUCK.z-1.9-i*.3,Math.PI/2);M.loaders.push({d,st:'idle',it:null,wait:1+i*1.6})});
  if(M.driver){M.driver.root.visible=false}
  a.wmSetWindow(a.wmWindow(TRUCK.x+10,TRUCK.z-4,30));
  if(!quiet){sayAll(M,L_.arrive,true);setT(M,9,()=>{if(M.ph==='drop'&&!M.said.bino){M.said.bino=1;sayAll(M,L_.bino)}})}
  else M.said.bino=1}
/* the sedan's trunk, popped open (a lid in the car's colour, hinged at the back window) */
function trunkLid(M){const a=A(),T3=a.THREE;if(M.lid||!M.tg)return;const r=M.tg.rail,f=fwd(r.yaw),S=M.tg.S,g=new T3.Group();
  g.position.set(r.x-f[0]*(S.l/2-1.05),a.groundAt(r.x,r.z)+1.02,r.z-f[1]*(S.l/2-1.05));g.rotation.y=r.yaw;a.wmAdd(g);
  const piv=new T3.Group();piv.rotation.x=1.2;g.add(piv);mesh(bx(S.w*.8,.05,.95),std('#8f969c',{roughness:.35,metalness:.3}),0,0,.47,piv);mesh(bx(S.w*.7,.02,.8),std('#2a2c2f',{roughness:.9}),0,-.035,.47,piv);M.lid=g}
function trunkPt(){return{x:SEDAN_PARK.x+3.1,z:SEDAN_PARK.z+.15}}
function truckPt(i){return{x:TRUCK.x+4.5+.0,z:TRUCK.z+(i-1)*.6}}
function dropTick(M,dt,F){const a=A(),Tl=TL(),r=M.tg.rail,p=playerCar();r.step(dt,{});
  /* the driver gets out once he's parked */
  if(r.done&&!M.driverOut){M.driverOut=true;const d=M.driver;if(d){d.root.visible=true;d.root.position.set(SEDAN_PARK.x+.6,0,SEDAN_PARK.z-1.5);M.handoff='go'}trunkLid(M)}
  if(M.driverOut&&M.driver){const d=M.driver;if(M.handoff!=='done'){if(walkTo(d,{x:SEDAN_PARK.x+3.6,z:SEDAN_PARK.z-1.4},1.3,dt))faceTo(d,TRUCK.x,TRUCK.z,dt)}else{faceTo(d,TRUCK.x+4,TRUCK.z,dt);pose(d,dt)}}
  handoffTick(M,dt);
  /* the crew at the drop: too close (or in the lot) and somebody looks up */
  const near=Math.min(Math.hypot(p.x-TRUCK.x-3,p.z-TRUCK.z-2),Math.hypot(p.x-SEDAN_PARK.x,p.z-SEDAN_PARK.z));
  /* driving past on Dock St is just traffic; stopping close, or rolling into the lot, is not */
  const loiter=Math.abs(p.spd)<3||p.z>131.5&&p.x>385&&p.x<437;
  const seen=loiter&&near<K.dropNear&&Tl.los(TRUCK.x+4,TRUCK.z+1,p.x,p.z,{grid:{map:a.WORLD.map,block:a.WORLD.losblock||'#htVcTfrxA',tile:2}});
  if(seen&&M.handoff!=='done'){M.T.event('drop',K.dropSus*dt);chat(M,'dropNear',10,L_.dropNear)}else M.T.calm(4*dt);
  M.T.S.maxSus=Math.max(M.T.S.maxSus,M.T.S.sus);
  if(M.T.S.sus>=100){M.ph='lost';M.failWhy='crew';loseWhy(M,'crew');M.state==='go'&&a.endMission(false,"The loaders looked up, saw two dads in a car staring at them, and everybody left at once. That's the opposite of a handoff.","They made you");return}
  /* objectives */
  const parked=p.e&&Math.abs(p.spd)<1,dist=Math.hypot(p.x-(TRUCK.x+3.8),p.z-TRUCK.z),g=M.vfOn?grade(M):null;
  F.objs.push([M.handoff==='done'?'Photograph the box truck\'s plate':'Watch the handoff from 30-60 m away',false]);
  F.objs.push([M.touch?'Binoculars button · Photo button for the plate':'Binoculars: right-click · left-click to photograph the plate',!!M.vfOn]);
  const n=Object.keys(M.items).length;F.meters.push({id:'items',label:'Itemised',v:n,max:ITEMS.length,style:'pips'});
  F.meters.push({id:'sus',label:'Suspicion',v:M.T.S.sus,max:100,style:'ring',icon:'eye'});
  if(!M.vfOn){const w=WATCH.reduce((b,q)=>Math.hypot(q.x-p.x,q.z-p.z)<Math.hypot(b.x-p.x,b.z-p.z)?q:b,WATCH[0]);F.target=dist>30&&dist<62&&parked?{x:TRUCK.x+3.8,z:TRUCK.z,label:'Box truck'}:{x:w.x,z:w.z,label:w.label}}
  if(M.handoff==='done'&&once(M,'plate'))say(M,L_.plate[0][1],{front:true,if:()=>!M.photo});
  touchButtons(M,true)}
function handoffTick(M,dt){const a=A();if(M.handoff==='wait'||M.handoff==='done')return;M.ht+=dt;
  const doorK=M.handoff==='closing'?Math.max(0,1-(M.ht-M.closeAt)/2.2):Math.min(1,Math.max(0,(M.ht-2)/2.2));doorSet(M.truck,doorK);if(Math.abs(doorK-(M.doorPrev||0))>.3){M.doorPrev=doorK}
  if(M.ht>2&&!M.doorSnd){M.doorSnd=1;try{a.snd('reload',.5)}catch(_){}}
  for(const L of M.loaders){const d=L.d;L.wait-=dt;
    if(L.st==='idle'){if(M.handoff==='closing'||M.handoff==='done'){walkTo(d,{x:TRUCK.x-1.8,z:TRUCK.z-1.8},1.3,dt);continue}
      if(L.wait<=0&&M.ht>4){const q=M.qItems.find(x=>x.st==='trunk');if(q){q.st='taken';L.it=q;L.st='toTrunk'}else{faceTo(d,TRUCK.x+4,TRUCK.z,dt);pose(d,dt)}}else pose(d,dt);continue}
    if(L.st==='toTrunk'){if(walkTo(d,trunkPt(),1.7,dt)){L.st='lift';L.wait=.8}continue}
    if(L.st==='lift'){faceTo(d,SEDAN_PARK.x+2.3,SEDAN_PARK.z,dt);pose(d,dt,{moving:false,aim:false,mode:'crouch'});if(L.wait<=0){L.mesh=itemModel(L.it.it);a.wmAdd(L.mesh);L.st='carry'}continue}
    if(L.st==='carry'){const done=walkTo(d,truckPt(M.inTruck%3),1.45,dt);const f=Math.atan2(0,1),ry=d.root.rotation.y;L.mesh.position.set(d.root.position.x+Math.sin(ry)*.45,1.02,d.root.position.z+Math.cos(ry)*.45);L.mesh.rotation.y=ry;
      L.it.pos=L.mesh.position;if(done){L.st='place';L.wait=.6}continue}
    if(L.st==='place'){faceTo(d,TRUCK.x,TRUCK.z,dt);pose(d,dt);if(L.wait<=0){const k=M.inTruck++;/* inside the box, stacked from the front */const lx=(k%2?-.45:.45),lz=-1.1+Math.floor(k/2)*.9;
        L.mesh.position.set(0,0,0);M.truck.add(L.mesh);L.mesh.position.set(lx,1.35,lz+1.5);L.mesh.rotation.set(0,0,0);L.it.st='in';L.it.pos=null;
        if(!M.items[L.it.it.id]){setT(M,.4,()=>say(M,L.it.it.miss,{chatter:true}))}L.it=null;L.mesh=null;L.st='idle';L.wait=.6}continue}}
  if(M.handoff==='go'&&M.qItems.every(x=>x.st==='in')){M.handoff='closing';M.closeAt=M.ht;setT(M,2.4,()=>{M.handoff='done';doorSet(M.truck,0)})}}
/* while the binoculars are up: anything carried near the centre of the view gets itemised */
function spotItems(M,cam){const a=A();for(const L of M.loaders){if(!L.it||!L.it.pos||M.items[L.it.it.id])continue;const p=L.it.pos,dx=p.x-cam.x,dy=p.y-cam.y,dz=p.z-cam.z,d=Math.hypot(dx,dy,dz);
    const f=cam.f,c=(dx*f[0]+dy*f[1]+dz*f[2])/d;if(c>Math.cos(4.5*D)&&d<85){M.items[L.it.it.id]=true;say(M,L.it.it.line,{front:L.it.it.id==='washer'});M.score=Object.keys(M.items).length}}}

/* ---------------- binoculars: from the driver's window, the photo viewfinder kit ---------------- */
function binoCam(M,dt){const a=A(),e=a.CV,P=a.P;const can=e&&(M.ph==='drop'||M.ph==='tail'||M.ph==='wrap'&&M.wrapT<1.4)&&Math.abs(e.car?e.car.spd:e.spd||0)<1.5&&M.binoUp;
  if(!can){if(M.vfOn)vfOff(M);if(M.binoUp&&e&&Math.abs(e.car?e.car.spd:0)>=1.5)M.binoUp=false;/* driving off puts them down */return false}
  const cam=a.camera,S=a.carSize(e),lx=-Math.sin(P.yaw),lz=-Math.cos(P.yaw),f=fwd(e.yaw),rr=rgt(e.yaw),fa=Math.abs(lx*f[0]+lz*f[1]),sa=Math.abs(lx*rr[0]+lz*rr[1]),out=Math.min(fa>.01?S.l/2/fa:99,sa>.01?S.w/2/sa:99)+.45;
  cam.position.set(e.pos.x+lx*out,a.groundAt(e.pos.x,e.pos.z)+Math.max(1.55,S.h*.85),e.pos.z+lz*out);cam.rotation.set(P.pitch,P.yaw,0,'YXZ');
  /* binoculars focus past the foreground: anything within 14 m (a kerbside fence, the wing mirror) is out of the picture */
  if(M.near0==null){M.near0=cam.near;res().near0=cam.near}cam.near=Math.max(M.near0,14);
  cam.fov+=(11-cam.fov)*Math.min(1,dt*10);cam.updateProjectionMatrix();cam.updateMatrixWorld();if(P.dude)P.dude.root.visible=false;
  const cf=[-Math.sin(P.yaw)*Math.cos(P.pitch),Math.sin(P.pitch),-Math.cos(P.yaw)*Math.cos(P.pitch)];M.camInfo={x:cam.position.x,y:cam.position.y,z:cam.position.z,f:cf};
  vfOn(M);if(M.handoff&&M.handoff!=='done'&&M.handoff!=='wait')spotItems(M,M.camInfo);
  {const g=grade(M),pl=plateWorld();let br=null;const show=M.handoff==='done'||!!M.photo;
    if(show&&g.inFrame){const p0=a.project(pl.x,pl.y+.55,pl.z),p1=a.project(pl.x,pl.y-.45,pl.z),hh=Math.max(34,Math.abs(p1.y-p0.y)),ww=hh*1.7;br={x:p0.x-ww/2,y:p0.y,w:ww,h:hh,ok:g.ok,stars:g.ok?g.stars:0,why:g.why}}
    binoDraw(M,{br,phase:M.ph,done:M.handoff==='done',dt})}
  return true}
/* Doug's binoculars: two round lenses (a canvas under the HUD, so the meters and Doug's lines stay readable on top), the zoom and
   the shutter hint at the sides (clear of the subtitles), corner brackets on the plate once it matters, a white flash on the shot.
   While they're up the speedometer and the vehicle prompt step aside. */
function binoEl(M){if(M.bino)return M.bino;if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.id='tail-bino';
  c.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4';document.body.appendChild(c);res().dom=(res().dom||[]).concat([c]);
  M.bino={c,x:c.getContext('2d'),w:0,h:0,key:'',flash:0};return M.bino}
function hudHide(on){if(typeof document==='undefined')return;for(const q of['.ht-drv','.ht-pr'])for(const e of document.querySelectorAll(q)){if(on){if(e.dataset.tailHid==null){e.dataset.tailHid=e.style.visibility||'';e.style.visibility='hidden'}}else if(e.dataset.tailHid!=null){e.style.visibility=e.dataset.tailHid;delete e.dataset.tailHid}}}
function binoDraw(M,o){const B=binoEl(M);if(!B)return;const W=innerWidth,Hh=innerHeight;B.flash=Math.max(0,B.flash-(o.dt||0)*2.4);
  const br=o.br,key=[W,Hh,o.phase,o.done,!!M.photo,br?[Math.round(br.x/2),Math.round(br.y/2),Math.round(br.w/2),br.ok,br.stars,br.why].join(','):'-',B.flash>0?Math.round(B.flash*20):0,M.touch?1:0].join('|');
  if(key===B.key)return;B.key=key;const c=B.c,x=B.x;if(B.w!==W||B.h!==Hh){B.w=c.width=W;B.h=c.height=Hh}
  const r=Math.min(W*.27,Hh*.37),cy=Hh*.5,cxs=[W/2-r*.8,W/2+r*.8];
  x.clearRect(0,0,W,Hh);x.fillStyle='#030405';x.fillRect(0,0,W,Hh);
  /* the lenses: cut out with a soft rim, a faint blue coating near the edge */
  x.globalCompositeOperation='destination-out';for(const cx of cxs){const gr=x.createRadialGradient(cx,cy,r*.86,cx,cy,r);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.beginPath();x.arc(cx,cy,r,0,6.2832);x.fill()}
  x.globalCompositeOperation='source-over';for(const cx of cxs){const gr=x.createRadialGradient(cx,cy,r*.62,cx,cy,r*.98);gr.addColorStop(0,'rgba(40,70,110,0)');gr.addColorStop(1,'rgba(40,70,110,.28)');x.fillStyle=gr;x.beginPath();x.arc(cx,cy,r,0,6.2832);x.fill()}
  /* a fine centre reticle */
  x.strokeStyle='rgba(255,255,255,.45)';x.lineWidth=1;x.beginPath();x.moveTo(W/2,cy-r*.12);x.lineTo(W/2,cy-r*.04);x.moveTo(W/2,cy+r*.04);x.lineTo(W/2,cy+r*.12);x.moveTo(W/2-r*.12,cy);x.lineTo(W/2-r*.04,cy);x.moveTo(W/2+r*.04,cy);x.lineTo(W/2+r*.12,cy);x.stroke();
  /* side labels: zoom on the left, what to do on the right */
  const fs=Math.max(11,Math.round(Hh*.019));x.font='700 '+fs+'px system-ui,Arial';x.textBaseline='middle';x.fillStyle='rgba(255,255,255,.9)';
  const lx=Math.max(16,cxs[0]-r-16);x.textAlign='right';x.fillText('BINOCULARS',lx,cy-fs*.8);x.fillStyle='#ffc94a';x.font='800 '+Math.round(fs*1.5)+'px system-ui,Arial';x.fillText('6×',lx,cy+fs*.7);
  const rx=Math.min(W-16,cxs[1]+r+16);x.textAlign='left';x.font='700 '+fs+'px system-ui,Arial';
  const keyE=M.touch?'Photo':'LMB',keyR=M.touch?'Binoculars':'RMB';
  const hint=o.phase==='drop'?(o.done&&!M.photo?[[keyE,'Photo'],[keyR,'Lower']]:[['','Watch the handoff'],[keyR,'Lower']]):[[keyR,'Lower']];
  /* keep the longest line on screen: start where it fits */
  const lineW=([k,t])=>{x.font='800 '+fs+'px system-ui,Arial';const kw=k?x.measureText(k).width+fs*1.4:0;x.font='700 '+fs+'px system-ui,Arial';return kw+x.measureText(t.toUpperCase()).width};
  const hx=Math.min(rx,W-16-Math.max(...hint.map(lineW)));
  hint.forEach(([k,t],i)=>{const y=cy+(i-(hint.length-1)/2)*fs*2.1;let xx=hx;if(k){x.font='800 '+fs+'px system-ui,Arial';const w=x.measureText(k).width+fs*.9;x.fillStyle='rgba(255,255,255,.92)';x.beginPath();
      if(x.roundRect)x.roundRect(xx,y-fs*.8,w,fs*1.6,fs*.35);else x.rect(xx,y-fs*.8,w,fs*1.6);x.fill();x.fillStyle='#111';x.fillText(k,xx+fs*.45,y+1);xx+=w+fs*.5}
    x.font='700 '+fs+'px system-ui,Arial';x.fillStyle='rgba(255,255,255,.9)';x.fillText(t.toUpperCase(),xx,y+1)});
  /* the plate: corner brackets, green when the shot is good, and the grade */
  if(br){const col=br.ok?'#56e07a':'#ffc94a',L=Math.min(br.w,br.h)*.35;x.strokeStyle=col;x.lineWidth=2.5;x.beginPath();
    for(const[px,py,dx,dy]of[[br.x,br.y,1,1],[br.x+br.w,br.y,-1,1],[br.x,br.y+br.h,1,-1],[br.x+br.w,br.y+br.h,-1,-1]]){x.moveTo(px+dx*L,py);x.lineTo(px,py);x.lineTo(px,py+dy*L)}x.stroke();
    x.font='800 '+fs+'px system-ui,Arial';x.textAlign='left';x.textBaseline='bottom';x.fillStyle=col;x.fillText(br.ok?'PLATE  '+'★'.repeat(br.stars)+'☆'.repeat(3-br.stars):'PLATE · '+String(br.why||'').toUpperCase(),br.x,br.y-6)}
  if(B.flash>0){x.fillStyle='rgba(255,255,255,'+(B.flash*.85).toFixed(3)+')';x.fillRect(0,0,W,Hh)}}
/* raise or lower (on = force). Only while parked in a car during the tail or at the drop */
function binoToggle(M,on){const a=A(),e=a.CV;const want=on!=null?!!on:!M.binoUp;if(want&&!(e&&(M.ph==='drop'||M.ph==='tail')&&Math.abs(e.car?e.car.spd:0)<1.5)){if(e&&M.ph==='drop')chat(M,'binoMove',6,["Park first. Binoculars and driving is how I lost a mailbox."]);return}
  M.binoUp=want;if(a.P)a.P.aim=false}
function vfOn(M){const a=A();if(M.vfOn)return;M.vfOn=true;const B=binoEl(M);if(B){B.c.style.display='block';B.key=''}hudHide(true);
  if(!M.said.binoUp&&M.ph==='drop'){M.said.binoUp=1;say(M,"There. Truck's open. Count what comes out of that trunk. Out loud. I'll count too. We'll compare.",{chatter:true})}}
function vfOff(M){const a=A();if(!M.vfOn)return;M.vfOn=false;if(M.near0!=null){a.camera.near=M.near0;a.camera.updateProjectionMatrix()}if(M.bino)M.bino.c.style.display='none';hudHide(false);
  const e=a.CV;if(a.P.dude&&!e)a.P.dude.root.visible=true}
function plateWorld(){const f=fwd(TRUCK.yaw),bk=3.955;return{x:TRUCK.x-f[0]*bk,y:A().groundAt(TRUCK.x,TRUCK.z)+.9,z:TRUCK.z-f[1]*bk,nx:-f[0],nz:-f[1]}}
/* any star rating is enough; stars for angle, distance and how centred it is */
function grade(M){const c=M.camInfo;if(!c)return{ok:false,inFrame:false,why:'no view',stars:0};const a=A(),pl=plateWorld(),dx=pl.x-c.x,dy=pl.y-c.y,dz=pl.z-c.z,d=Math.hypot(dx,dy,dz);
  const off=Math.acos(Math.max(-1,Math.min(1,(dx*c.f[0]+dy*c.f[1]+dz*c.f[2])/d)))/D,face=Math.acos(Math.max(-1,Math.min(1,-(dx*pl.nx+dz*pl.nz)/Math.hypot(dx,dz))))/D;
  const inFrame=off<5.2,clear=TL().los(c.x,c.z,pl.x,pl.z,{grid:{map:a.WORLD.map,block:a.WORLD.losblock||'#htVcTfrxA',tile:2}});
  let why=null;if(!inFrame)why='off frame';else if(face>68)why='wrong side';else if(d>78)why='too far';else if(!clear)why='blocked';else if(off>3.6)why='center it';
  const stars=why?0:(face<35&&off<2&&d<58?3:face<52&&d<70?2:1);return{ok:!why,inFrame,why,stars,d,face,off}}
function snap(M){const a=A();if(!M.vfOn||M.photo||M.state!=='go')return;if(M.bino)M.bino.flash=1;try{const Au=window.HT&&HT.Audio;if(Au&&Au.ready){Au.ui('click');Au.ui('hover')}else a.snd('reload',.3)}catch(_){}
  if(M.handoff!=='done'){chat(M,'early',6,["Not yet. Let them finish. Rule two: never interrupt a crime mid-crime."]);return}
  const g=grade(M);if(!g.ok){chat(M,'photoBad',5,L_.photoBad);return}
  M.photo={stars:g.stars,d:Math.round(g.d),face:Math.round(g.face)};a.feed('Plate photographed · '+PLATE_TXT,'good','★'.repeat(g.stars)+' · '+Math.round(g.d)+' m');sayAll(M,L_.photo,true);
  M.ph='wrap';M.wrapT=0;try{const Au=window.HT&&HT.Audio;Au&&Au.ready&&Au.music('hub',{intensity:.35})}catch(_){}}
function finishHandoff(M){/* a checkpoint past the handoff: the truck is loaded and shut */M.handoff='done';doorSet(M.truck,0);for(const L of M.loaders){L.st='idle';L.d.root.position.set(TRUCK.x-1.8+Math.random(),0,TRUCK.z-1.8)}for(const q of M.qItems)q.st='in';M.driverOut=true;if(M.driver){M.driver.root.visible=true;M.driver.root.position.set(SEDAN_PARK.x+3.6,0,SEDAN_PARK.z-1.4)}trunkLid(M)}
/* touch: binoculars and shutter buttons while parked at the drop */
function touchButtons(M,on){const a=A();const touch=typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(pointer:coarse)').matches;M.touch=touch;if(!touch||typeof document==='undefined')return;
  if(on&&!M.tbtn){const el=document.createElement('div');el.style.cssText='position:fixed;right:18px;bottom:190px;display:flex;flex-direction:column;gap:10px;z-index:30;pointer-events:none';
    const b=(txt,fn)=>{const x=document.createElement('button');x.textContent=txt;x.style.cssText='pointer-events:auto;font:600 15px system-ui;padding:12px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.35);background:rgba(16,20,26,.62);color:#fff;backdrop-filter:blur(4px)';
      x.addEventListener('touchstart',ev=>{ev.preventDefault();fn()},{passive:false});x.addEventListener('click',fn);el.appendChild(x);return x};
    b('Binoculars',()=>binoToggle(M));b('Photo',()=>{if(M.vfOn)snap(M)});M.tbtn=el;a.overlay('tail-touch',el);res().ov['tail-touch']=1}}

/* ---------------- 4. wrap-up, then the borrowed car ---------------- */
function wrapTick(M,dt,F){const a=A();M.wrapT+=dt;F.objs.push(['Plate on file. Doug is already thinking about red string.',true]);
  if(M.tg)M.tg.rail.step(dt,{});
  for(const L of M.loaders)if(L.d.root.visible){walkTo(L.d,{x:TRUCK.x-1.8,z:TRUCK.z-1.8+(M.loaders.indexOf(L)-1)*.8},1.3,dt)}
  if(M.wrapT>7.5&&!M.wrapDone){M.wrapDone=true;if(M.swaps&&M.borrowed.length&&a.CV===M.borrowed[0])homeStart(M,false);else{say(M,"Let's go home. I have a corkboard to update and a neighbor to apologize to. Sorry, Ken.",{front:true});setT(M,3,()=>A().endMission(true))}}}
function homeStart(M,quiet){const a=A(),b=M.borrowed[0];M.ph='home';vfOff(M);if(!b){a.endMission(true);return}M.retName=b.name+"'s "+(CAR_NAME[b.type]||'car');
  if(!quiet){a.CP.mark('home');say(M,"Now we put "+b.name+"'s car back. Exactly where it was. Tires pointing the same way. "+b.name+" will know.",{front:true})}}
function homeTick(M,dt,F){const a=A(),b=M.borrowed[0];if(!b){a.endMission(true);return}const V=a.VAN,home=b.home,dh=Math.hypot(b.pos.x-home.x,b.pos.z-home.z);
  F.objs.push(['Put '+b.name+"'s "+(CAR_NAME[b.type]||'car')+' back where you found it',dh<10&&a.CV!==b]);F.objs.push(['Get back in the minivan',a.CV===V]);
  if(a.CV===b)F.target={x:home.x,z:home.z,label:b.name+"'s spot"};else if(a.CV!==V)F.target={x:V.pos.x,z:V.pos.z,label:'Minivan'};
  if(a.CV===V&&!M.homeDone){homeEnd(M,dh<10)}}
function homeEnd(M,returned){const a=A(),b=M.borrowed[0];if(M.homeDone)return;M.homeDone=true;M.returned=!!returned;
  if(returned&&b){a.feed(b.name+' found the '+(CAR_NAME[b.type]||'car')+' with a full tank and a new air freshener.','good',b.name+' is suspicious but grateful.');say(M,"Full tank, new air freshener. Leave a note? No. Notes are evidence.",{front:true})}
  else say(M,"I'll text "+(b?b.name:'them')+". 'Your car is on a different street. You're welcome.' That's a normal text.",{front:true});
  setT(M,2.2,()=>A().endMission(true))}

/* ---------------- the scripted player (dev/jobs-check.js) ----------------
   Drives with the keys: follows his route at a 30-40 m gap (o.fail: tucks in at 5 m until he spooks), swaps into the
   neighbour's car when he stops, parks at the Dock St watch spot, raises the binoculars, itemises the trunk, photographs the
   plate, then drives the borrowed car home and walks back to the minivan. */
const V0=()=>A().VAN;
function bot(a,t,o){o=o||{};const M=a.M;if(!M||M.state!=='go'||M.broken)return null;const k=a.keys,P=a.P,B=M.bot||(M.bot={stuck:0,ps:0});
  const off=()=>{k.w=k.a=k.s=k.d=false;k[' ']=false;k.shift=false};
  const steerTo=(c,tx,tz,want)=>{let err=wrap(yawTo(tx-c.x,tz-c.z)-c.yaw);k.a=err>.05;k.d=err<-.05;if(Math.abs(err)>.6)want=Math.min(want,5);k.w=c.spd<want-.3;k.s=c.spd>want+1.2;k[' ']=c.spd>want+5;return err};
  const drive=(tgt,maxV,arrive)=>{const e=a.CV;if(!e)return false;const c=e.car||e,G=a.roads();if(!B.route||B.rt!==tgt||B.age++>60){B.route=G.route({x:e.pos.x,z:e.pos.z},tgt);B.pts=B.route?B.route.points:[tgt];B.wi=1;B.rt=tgt;B.age=0}
    const pts=B.pts;while(B.wi<pts.length-1&&Math.hypot(pts[B.wi].x-e.pos.x,pts[B.wi].z-e.pos.z)<7)B.wi++;const d0=Math.hypot(tgt.x-e.pos.x,tgt.z-e.pos.z),w=d0<12?tgt:pts[Math.min(B.wi,pts.length-1)];
    const want=d0<(arrive||3)?0:d0<16?Math.max(2,d0*.45):maxV;steerTo(c,w.x,w.z,want);unstick(e,c,want,pts);return d0<(arrive||3)+.5&&Math.abs(c.spd)<.6};
  const unstick=(e,c,want,pts)=>{if(Math.abs(c.spd)<1&&want>1){B.stuck++;if(B.stuck>75){B.stuck=0;const q=pts?pts[Math.min((B.wi||1)+1,pts.length-1)]:null;if(q){c.x=q.x;c.z=q.z;e.pos.set(q.x,0,q.z);a.syncCar(e)}}}else B.stuck=0};
  if(M.ph==='gas'){off();return null}
  if(M.ph==='tail'){const e=a.CV;if(!e){off();return null}const c=e.car||e,r=M.tg.rail;
    /* out of the lot round the pumps first (they're solid), then his route */
    if(B.wp==null)B.wp=Math.hypot(c.x-START.x,c.z-START.z)<14?0:9;const WP=[[226,19.5],[227.6,24.5],[232.5,31.5],[240,40]];
    if(B.wp<WP.length){const w=WP[B.wp],r0=M.tg.rail;if(Math.hypot(w[0]-c.x,w[1]-c.z)<3.2){B.wp++;return null}const want=r0.s>6?8:0;steerTo(c,w[0],w[1],want);unstick(e,c,want,null);B.ps=0;return null}
    /* where am I on his route (first time: search behind him, so a checkpoint retry mid-route finds the right pass of the loop) */
    if(!B.init){B.init=1;B.ps=M.P.project(c.x,c.z,Math.max(0,r.s-35),120).s}B.ps=M.P.project(c.x,c.z,B.ps,60).s;
    if(r.holding&&r.holding.kind==='pull'&&M.swaps===0&&M.swapCar&&!o.fail&&!o.noswap){const sc=M.swapCar,d=Math.hypot(sc.pos.x-c.x,sc.pos.z-c.z);
      if(d<5.5){off();k.s=c.spd>.3;k.e=Math.abs(c.spd)<2.5;return null}k.e=false;const goal=M.P.at(M.P.project(sc.pos.x,sc.pos.z,B.ps,60).s);steerTo(c,goal.x,goal.z,Math.min(9,d*.6+1.5));if(d>40)B.ps=M.P.project(c.x,c.z,B.ps,60).s;return null}
    k.e=false;if(o.fail)k.h=(t%40)<3;/* o.fail: tailgates and leans on the horn */const urgent=M.T.S.lose>4;/* the reacquire meter is filling: close up like a person would */const gap=o.fail?5:urgent?20:(M.lightHold?28:30),err=(r.s-B.ps)-gap,look=M.P.at(B.ps+4.5+Math.abs(c.spd)*.3);
    let want=Math.max(0,Math.min(urgent?17:14,r.v+err*.35));if(r.v<.5&&err<4)want=0;
    /* slow for corners like a person: the heading change over the next 16 m */
    {const y0=M.P.at(B.ps).yaw;for(let q=4;q<=16;q+=4){if(Math.abs(wrap(M.P.at(B.ps+q).yaw-y0))>.5){want=Math.min(want,5.5+q*.25);break}}}
    const g=TL().aheadGap({x:c.x,z:c.z,yaw:c.yaw,len:4.6},obstacles(M,null).filter(q=>q.pri<3),18);B.g=g;B.want=want;if(g!=null)want=Math.min(want,Math.max(0,(g-4)*.8));
    steerTo(c,look.x,look.z,want);unstick(e,c,want,[look,M.P.at(B.ps+10)]);return null}
  if(M.ph==='drop'||M.ph==='wrap'){const e=a.CV;if(!e){off();return null}const c=e.car||e;
    if(!B.parked){const WP=[[384,128.5],[396,128.5],[408,128.5],[418,128.5],[424,128.5],[429,128.5]];if(B.dw==null){B.dw=0;let bd=1e9;WP.forEach((w,i)=>{const d=Math.hypot(w[0]-c.x,w[1]-c.z);if(d<bd&&i<WP.length-1){bd=d;B.dw=i}})}
      const w=WP[B.dw],dw=Math.hypot(w[0]-c.x,w[1]-c.z),lastW=B.dw===WP.length-1;if(dw<(lastW?1.6:3)){if(lastW){off();k.s=c.spd>.2;if(Math.abs(c.spd)<.3)B.parked=true;return null}B.dw++;return null}
      steerTo(c,w[0],w[1],lastW?Math.max(1.5,dw*.6):B.dw>=2?6:9);unstick(e,c,6,[{x:w[0],z:w[1]}]);return null}off();k.s=c.spd>.2;k.w=c.spd<-.2;
    if(M.ph==='wrap'){M.binoUp=false;return null}
    M.binoUp=true;let aimAt=M.handoff==='done'?plateWorld():null;if(!aimAt){const L=M.loaders.find(L=>L.it&&L.it.pos);aimAt=L?{x:L.it.pos.x,y:L.it.pos.y,z:L.it.pos.z}:{x:TRUCK.x+5,y:1.2,z:TRUCK.z+2}}
    const cam=M.camInfo||{x:c.x,y:1.6,z:c.z};const dx=aimAt.x-cam.x,dz=aimAt.z-cam.z,dy=(aimAt.y||1)-cam.y;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));
    if(M.handoff==="done"&&M.vfOn&&(B.snapT=(B.snapT||0)+1)>45&&grade(M).ok){a.useTap=true;B.snapT=0}return null}
  if(M.ph==='home'){const b=M.borrowed[0];if(!b){off();return null}if(a.CV===b){const hm=b.home;if(drive({x:hm.x,z:hm.z},11,3)||Math.hypot(b.pos.x-hm.x,b.pos.z-hm.z)<6&&Math.abs((b.car||b).spd)<.5){off();a.exitCar()}return null}
    off();if(!a.CV){const V=a.VAN,r=rgt(V.yaw),sd=Math.hypot(V.pos.x+r[0]*2-b.pos.x,V.pos.z+r[1]*2-b.pos.z)>Math.hypot(V.pos.x-r[0]*2-b.pos.x,V.pos.z-r[1]*2-b.pos.z)?1:-1;
      P.pos.set(V.pos.x+r[0]*2.1*sd,0,V.pos.z+r[1]*2.1*sd);a.collide(P.pos,.35);a.useTap=true;if((B.vanT=(B.vanT||0)+1)>40){B.vanT=0;a.enterCar(V)}}else if(a.CV!==V0())a.exitCar();return null}
  off();return null}
})();
