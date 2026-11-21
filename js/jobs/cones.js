/* =====================================================================
   CONE ZONE (SPEC3 2.9): roadblock and convoy ambush. Earl's strand. Uses HT.Props (js/jobs/_props.js).
   The box truck from Following Distance (its plate in SAVE.flags.boxTruckPlate) runs a stolen-goods convoy every Thursday:
   one truck, two escort cars, out of Discount Storage Unlimited, up Industrial Way, left on Route 9 and out to the highway
   past Cedar Lane. Ninety seconds, a pile of cones, three sawhorses, a ROAD WORK AHEAD sign, two flares, a flagger's paddle,
   your crew, your minivan and whatever's parked in Sal's lot. Build a roadblock. The convoy drivers read exactly what you built:

     a clean lane 3 m wide       -> they take it ("Look, they left a lane open. Amateurs.")
     only cones in the way       -> they slow to 6 m/s and drive through them
     sawhorses in the way        -> they slow and plough through (props scatter)
     one car and fluff           -> the lead SUV shoves the car aside (the owner will hear about it)
     two cars wall to wall, or a closure that looks official   -> they stop 10 m short and the escorts get out
       ("official" = any two of: the ROAD WORK sign 4-50 m before the wall, a flagger with the paddle, a lit flare in the line)
     stopped + two cars + a lit flare = AIRTIGHT  -> nobody wants to fight a wall: walk up without firing and they give up
   Not stopped -> the escorts bail and the truck runs for the highway: chase it, ram it, box it. Stopped (not airtight) -> a
   short street fight. Then the unarmed driver, the truck (20 catalytic converters, a crate of packages, Mrs. Lindqvist's goat
   Pepper), the goat home to Ash St (optional), and pick up your cones (-1 trust each time you don't).

   Stages ([CP]): build (the 90 s) -> convoy (the clock hit zero: the roadblock as built). Fail: the truck makes the on-ramp,
   or the whole crew is down. The setup can't be failed: whatever's placed at 0:00 is the roadblock.
   Keys: Tab = bird's-eye planning view (click/tap the road: the dad walks there and puts down what he carries), G = post a crew
   dad where you're looking ("Dave, stand there and look official"; again recalls him). Touch: Plan / Post crew buttons.
   Shared-file additions (owned): js/carai.js ctx.speedCap(x,z,car). Tests: node dev/jobs/cones.js (the roadblock reader),
   node dev/jobs-check.js cones --retry --replay --shots.
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
const PR=()=>window.HT&&HT.Props;

/* ---------------- tuning ---------------- */
const K={build:90,need:3.0,coneCap:6,stopShort:10,cruise:11,truckMax:12,chaseMax:9.5,corner:5,escortFlee:15,gapCap:8,approachCap:9,freezeD:30,
  shoveDmg:34,truckHp:110,escapeX:24,boxT:2,blockT:3,surrR:13,stock:{cone:12,sawhorse:3,sign:1,flare:2},
  airtight:250,goat:50,coneTrust:-1,airTrust:8,carTrust:1};
const D2R=Math.PI/180,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const fwd=y=>[-Math.sin(y),-Math.cos(y)],rgt=y=>[Math.cos(y),-Math.sin(y)];
const pick=a=>a[Math.floor(Math.random()*a.length)];
/* ---------------- places (metres; Industrial Way is tiles x 100-102: road x 200-206, walks 198-200 / 206-208, the storage fence at 208) ---------------- */
const ZONE={xl:194.6,xr:207.6,z0:52,z1:140};            /* the convoy reads everything on Industrial Way from the storage gate to Route 9 */            /* where a roadblock counts: tree line to fence, storage gate to the pile */
const LANE=204.5,ROAD_X=203;
const RING={x:199,z:70};
const PILE={cone:{x:197.4,z:88.4},sawhorse:{x:195.2,z:88.9},sign:{x:195.6,z:86.7},flare:{x:199.2,z:87.6}};
const EARL={x:197.6,z:86.3},PICKUP={x:196.8,z:82.8,yaw:0};
const LOT=[{name:'Pam',type:'sedan',color:'#8a2f2a',label:'Dowager',why:'in for brakes',x:214,z:77.2,
    hurt:"Is that my Dowager? Why is it SIDEWAYS?",fine:"Not a scratch. Sal, you can do the brakes now."},
  {name:'Hal',type:'hatch',color:'#c79a2b',label:'hatchback',why:'in for an oil change',x:220,z:77.2,
    hurt:"My hatchback was in for an OIL CHANGE.",fine:"Still smells like oil and optimism. Thanks."},
  {name:'Rhonda',type:'suv',color:'#3d4a3a',label:'SUV',why:'in for inspection',x:227,z:77.2,
    hurt:"That SUV has a baby seat in it. It has a BABY SEAT.",fine:"You parked it better than I do. Don't tell anyone."}];
const STORE_Z=148,SPAWN=[{x:224,role:'lead',type:'suv',color:'#24272b'},{x:234.5,role:'truck'},{x:245.5,role:'rear',type:'sedan',color:'#2c2f36'}];
const LINDQVIST={x:333,z:66.6},ASH='Ash St';
const PLATE0='7HXK 418';

/* ---------------- lines ---------------- */
const L_={
  hintTouch:"Plan view: the bird's-eye view. Post crew: put a man somewhere official.",
  brief:[['earl',"Thursday, 3:52. Industrial Way. Never late. Like me. I hate that I respect it."],
    ['earl',"Ninety seconds. Cones. Sawhorses. Your minivan. Whatever's lying around. Make a wall."],
    ['earl',"Sal says the cars in his lot are fair game. Customers' cars. Bring them back like you found them."]],
  hint:"Tab: bird's-eye view. G: put a man somewhere official.",
  t60:['earl',"Sixty seconds. My buses ran tighter than this."],t30:['earl',"Thirty. I can hear the truck. That's a lie. I can feel the truck."],t10:['earl',"Ten. Look natural. Look like road work."],
  stack:[['gary',"I'm going to put a cone on a cone. For height."]],
  post:{dave:[['you',"Dave, stand there and look official."],['dave',"Is this a legal roadblock?"],['earl',"It's a suggestion. A very orange suggestion."]],
    gary:[['you',"Gary. Stand there. Be a wall."],['gary',"I've been called worse. I've been called a cul-de-sac."]],
    other:[['you',"Stand right there."],['gary',"Standing. Officially."]]},
  recall:["Okay, back to the pile.","Never mind. You're more of a cone guy."],
  ready:[['earl',"Ready? Good. I'll radio the truck. ...I don't have a radio. They're just coming."]],
  arrive:[['earl',"There. White box truck, two escorts. Three fifty-two on the dot."]],
  noPlan:[['earl',"That's not a roadblock. That's a garage sale."]],
  convoy:{gap:[['Escort',"Look, they left a lane open. Amateurs."]],
    cones:[['Escort',"My mom raised me to respect cones."],['Other escort',"Just drive through the cones, man."],['Escort',"...Gently."]],
    bully:[['Escort',"Sawhorses? Those are just horses that gave up."]],
    shove:[['Escort',"One car? That's not a wall. That's a parking spot."]],
    stop:[['Escort',"Road work? On a Thursday? Nobody does road work on a Thursday."],['Other escort',"Pull over. We'll ask them."]],
    clear:[['Escort',"Huh. Quiet Thursday."]]},
  fight:[['Escort',"It's a bunch of dads. Get 'em!"],['gary',"Rude."]],
  air:[['Escort',"That's two cars and a flare. That's a real roadblock."],['Other escort',"Is it, though?"],['Escort',"There's a man with a STOP sign, Kevin."]],
  airGive:[['Escort',"Okay! Okay. We're on a break. Union rules."],['Other escort',"I knew it was real. I said it was real."]],
  airShot:[['Escort',"He SHOT at us! At a ROADBLOCK!"]],
  bail:[['Escort',"We're out, man. Good luck, Truck."],['earl',"He's running for the highway. Out past Cedar Lane. Get in something with wheels."]],
  chaseRam:["That's a box truck. It has feelings. Mostly dents.","Again! Gently! No, not gently!","Sal's going to love this."],
  stopped:[['earl',"He's stopped. The driver's not armed. Go knock on his door."]],
  driver:[['Truck driver',"I just drive the truck. I don't even know what's in it."],['earl',"It's a goat."],['Truck driver',"WHAT."]],
  open:[['earl',"Twenty catalytic converters. A crate of somebody's packages."],['earl',"And Mrs. Lindqvist's goat. That's Mrs. Lindqvist's goat. Don't ask."],['gary',"I'm asking."],['earl',"Don't."]],
  manifest:[['earl',"Converters: Pam's. Hal's. The church van's. Seventeen more on this list, all from Riverside driveways."],['earl',"The packages say Maple Heights. Rosa can run them round tonight."]],
  goatTake:[['you',"Come on, Pepper. Ash Street."],['Pepper','(bleat)']],
  goatHome:[['Mrs. Lindqvist',"Pepper! Oh, Pepper. Did the bad men feed you?"],['Pepper','(bleat)'],['Mrs. Lindqvist',"She only eats the good hedge. She has standards."]],
  goatEarl:[['earl',"Leave her with me. Pepper and I go way back. Don't ask."]],
  cones:[['earl',"Pick up your cones. Leave it better than you found it."]],
  coneLeft:[['earl',"Pick up your cones."]],
  tidy:[['earl',"Clean road. That's how you do a Thursday."]],
  escape:"The truck made the on-ramp. Somewhere a goat is heading out of state.",
  crewDown:"The crew's down and the convoy's gone. Earl is filing it under 'next Thursday'."};

/* ---------------- resources (disposed on every ending, retry and replay) ---------------- */
let RES=null;const res=()=>RES||(RES={geo:[],mat:[],tex:[],veh:[],ov:{},listeners:[],props:null,cars:[],hudWrap:null});
const G_=g=>{res().geo.push(g);return g},M_=m=>{res().mat.push(m);return m},T_=t=>{res().tex.push(t);return t};
const std=(c,o)=>M_(new (A().THREE.MeshStandardMaterial)(Object.assign({color:A().lin?A().lin(c):c,roughness:.6,metalness:0},o||{})));
function canvasTex(w,h,f){const T3=A().THREE,c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);const t=new T3.CanvasTexture(c);if(T3.sRGBEncoding)t.encoding=T3.sRGBEncoding;t.anisotropy=4;return T_(t)}
function mesh(g,m,x,y,z,parent,rx,ry,rz){const T3=A().THREE,o=new T3.Mesh(G_(g),m);o.position.set(x||0,y||0,z||0);if(rx||ry||rz)o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=true;o.receiveShadow=true;if(parent)parent.add(o);return o}
const bx=(w,h,d)=>new (A().THREE.BoxGeometry)(w,h,d),cy=(r0,r1,h,s)=>new (A().THREE.CylinderGeometry)(r0,r1,h,s||14);
function listen(t,ev,fn,o){t.addEventListener(ev,fn,o);res().listeners.push([t,ev,fn,o])}
function freeAll(){const R=RES;RES=null;if(!R)return;const a=A();
  for(const o of Object.keys(R.ov))try{a&&a.overlay&&a.overlay(o,null)}catch(_){}
  if(R.props)try{R.props.dispose()}catch(_){}
  for(const e of R.cars)unregisterCar(e);
  for(const v of R.veh)try{if(v.parent)v.parent.remove(v);v.userData&&v.userData.dispose&&v.userData.dispose()}catch(_){}
  for(const g of R.geo)try{g.dispose()}catch(_){}for(const m of R.mat)try{m.dispose()}catch(_){}for(const t of R.tex)try{t.dispose()}catch(_){}
  for(const[t,ev,fn,o]of R.listeners)try{t.removeEventListener(ev,fn,o)}catch(_){}
  if(R.crewOut)try{restoreCrew(R.crewOut)}catch(_){}}
/* registerCar adds a collider, solids and an L.cars entry: take all three back out */
function unregisterCar(e){const a=A(),L=a&&a.L;if(!L||!e)return;try{if(a.CV===e)a.exitCar()}catch(_){}
  const i=L.cars?L.cars.indexOf(e):-1;if(i>=0)L.cars.splice(i,1);if(e.col){const k=L.colliders.indexOf(e.col);if(k>=0)L.colliders.splice(k,1);L._hc=null}
  if(e.obj){const s=new Set();e.obj.traverse(m=>s.add(m));L.solids=L.solids.filter(m=>!s.has(m));if(e.obj.parent)e.obj.parent.remove(e.obj);try{e.obj.userData.dispose&&e.obj.userData.dispose()}catch(_){}}
  e.meshes=null;e.obj=null}

/* ---------------- the roadblock reader (pure: used by the convoy, the meter and dev/jobs/cones.js) ----------------
   items: [{x0,x1,z0,z1,cls:'hard'|'medium'|'soft'|'signal',kind,lit,flagger}]  convoy drives toward -z through the zone
   -> {groups:[{z0,z1,zc,verdict,rank,pass:{x,w}|null,cars,cred,why,airtight}], first (the group that decides), verdict, rank, airtight, text} */
const RANK={clear:0,gap:1,cones:2,bully:3,shove:3.5,stop:4,airtight:5};
const VLABEL={clear:'Open road',gap:'Gap',cones:'Speed bump',bully:'Flimsy',shove:'Shove',stop:'Stop',airtight:'Airtight'};
function readBlock(items,o){o=o||{};const Z=o.zone||ZONE,need=o.need||K.need,lane=o.lane||LANE,step=.1;
  const phys=items.filter(it=>it.cls!=='signal'&&it.x1>Z.xl&&it.x0<Z.xr&&it.z1>Z.z0&&it.z0<Z.z1).sort((p,q)=>q.z1-p.z1);
  const groups=[];for(const it of phys){const g=groups.find(g=>it.z0<=g.z1+2.5&&it.z1>=g.z0-2.5);if(g){g.items.push(it);g.z0=Math.min(g.z0,it.z0);g.z1=Math.max(g.z1,it.z1)}else groups.push({items:[it],z0:it.z0,z1:it.z1})}
  /* merging can make two groups touch: one more pass */
  for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){const A_=groups[i],B=groups[j];if(B.z0<=A_.z1+2.5&&B.z1>=A_.z0-2.5){A_.items.push(...B.items);A_.z0=Math.min(A_.z0,B.z0);A_.z1=Math.max(A_.z1,B.z1);groups.splice(j,1);j=i}}
  groups.sort((p,q)=>q.z1-p.z1);
  const n=Math.round((Z.xr-Z.xl)/step),lv={hard:3,medium:2,soft:1};
  for(const g of groups){const cells=new Uint8Array(n);let cars=0;
    for(const it of g.items){const l=lv[it.cls]||0;if(it.cls==='hard')cars++;const a0=Math.max(0,Math.floor((it.x0-Z.xl)/step)),a1=Math.min(n,Math.ceil((it.x1-Z.xl)/step));for(let k=a0;k<a1;k++)if(cells[k]<l)cells[k]=l}
    const runs=lev=>{const out=[];let s=-1;for(let k=0;k<=n;k++){const ok=k<n&&cells[k]<=lev;if(ok&&s<0)s=k;if(!ok&&s>=0){out.push({x:Z.xl+(s+k)/2*step,w:(k-s)*step,x0:Z.xl+s*step,x1:Z.xl+k*step});s=-1}}
      /* drivers keep to the road: the passage nearest their lane wins, then the widest */
      const off=r=>{const lo=r.x0+need/2,hi=r.x1-need/2;return lane<lo?lo-lane:lane>hi?lane-hi:0};
      return out.filter(r=>r.w>=need).sort((p,q)=>(off(p)-off(q))||(q.w-p.w)).map(r=>Object.assign(r,{x:Math.max(r.x0+need/2,Math.min(r.x1-need/2,lane))}))};
    /* credibility: the sign 4-50 m before the wall, a flagger with the paddle at the wall, a lit flare at the wall */
    const sign=items.some(it=>it.kind==='sign'&&it.z0>g.z1+4&&it.z0<g.z1+50&&it.x1>Z.xl-2&&it.x0<Z.xr+2&&!it.down);
    const flagger=items.some(it=>it.flagger&&it.z1>g.z0-3&&it.z0<g.z1+3);
    const flare=items.some(it=>it.kind==='flare'&&it.lit&&it.z1>g.z0-3.5&&it.z0<g.z1+3.5&&it.x1>Z.xl&&it.x0<Z.xr);
    const credN=(sign?1:0)+(flagger?1:0)+(flare?1:0),cred=credN>=2;let verdict,pass=null,why;
    const r0=runs(0),r1=runs(1),r2=runs(2);
    if(r0.length){verdict='gap';pass=r0[0];why='a clear lane '+pass.w.toFixed(1)+' m wide'}
    else if(r1.length){verdict=cred?'stop':'cones';pass=cred?null:r1[0];why=cred?'it looks official':'only cones in the way'}
    else if(r2.length){verdict=cred?'stop':'bully';pass=cred?null:r2[0];why=cred?'it looks official':'sawhorses they can push'}
    else if(cars>=2){verdict='stop';why='two cars, wall to wall'}
    else{verdict=cred?'stop':'shove';why=cred?'it looks official':'one car they can shove';
      if(!cred){let best=null;for(const it of g.items)if(it.cls==='hard'){const w=it.x1-it.x0;if(!best||Math.abs((it.x0+it.x1)/2-lane)<Math.abs((best.x0+best.x1)/2-lane))best=it}pass=best?{x:(best.x0+best.x1)/2,w:best.x1-best.x0,car:best}:null}}
    const airtight=verdict==='stop'&&cars>=2&&flare;if(airtight){verdict='airtight';why='two cars and a lit flare'}
    Object.assign(g,{zc:(g.z0+g.z1)/2,verdict,rank:RANK[verdict],pass,cars,cred,credN,sign,flagger,flare,why,airtight,cells})}
  const first=groups.find(g=>g.rank>=4)||null;
  const top=first||groups.reduce((b,g)=>!b||g.rank>b.rank?g:b,null);const verdict=top?top.verdict:'clear';
  return{groups,first,top,verdict,rank:RANK[verdict],airtight:!!(first&&first.airtight),text:predict(top)}}
function predict(g){if(!g)return'Nothing in the road. They won\'t even slow down.';
  const side=g.pass?(g.pass.x<ROAD_X-3?'on the left':g.pass.x>ROAD_X+3?'on the right':'down the middle'):'';
  return{gap:'They\'ll take the gap '+side+'.',cones:'They\'ll slow down and drive through the cones.',bully:'They\'ll push through the sawhorses.',shove:'The SUV will shove the car aside.',
    stop:'They\'ll stop. Then the escorts get out.',airtight:'Airtight. Nobody fights a wall.'}[g.verdict]}

/* ---------------- the box truck (white, roll-up door; nose -z in its own space, so rotation.y = yaw) ---------------- */
function truckModel(plate){const a=A(),T3=a.THREE,g=new T3.Group();g.name='coneBoxTruck';
  const white=std('#eef0ee',{roughness:.42,metalness:.08}),cab=std('#e9ebe8',{roughness:.35,metalness:.12}),dark=std('#26292c',{roughness:.7}),chrome=std('#c9ced3',{roughness:.22,metalness:.85}),
    tyre=std('#151617',{roughness:.92}),rim=std('#a7adb3',{roughness:.35,metalness:.7}),glass=std('#1d2a36',{roughness:.08,metalness:.55}),trim=std('#3a3e42',{roughness:.55,metalness:.3}),
    lamp=M_(new T3.MeshStandardMaterial({color:a.lin('#fff6dd'),emissive:a.lin('#fff1cc'),emissiveIntensity:.6,roughness:.2})),
    red=M_(new T3.MeshStandardMaterial({color:a.lin('#8c1010'),emissive:a.lin('#ff2a1a'),emissiveIntensity:.5,roughness:.3})),
    amber=M_(new T3.MeshStandardMaterial({color:a.lin('#9a5a08'),emissive:a.lin('#ffa21a'),emissiveIntensity:.6,roughness:.3}));
  const sh=new T3.Shape();[[-3.7,.58],[-3.74,1.28],[-3.58,1.47],[-3.26,2.42],[-3.08,2.58],[-1.62,2.58],[-1.62,.58]].forEach(([z,y],i)=>i?sh.lineTo(z,y):sh.moveTo(z,y));
  const cg=new T3.ExtrudeGeometry(sh,{depth:2.18,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:3,steps:1});cg.translate(0,0,-1.09);cg.rotateY(-Math.PI/2);mesh(cg,cab,0,0,0,g);
  const w=mesh(new T3.PlaneGeometry(2.02,.98),glass,0,1.96,-3.44,g,0,Math.PI,0);w.rotation.order='YXZ';w.rotation.x=-.33;
  for(const s of[-1,1]){const sw=mesh(new T3.PlaneGeometry(1.02,.72),glass,s*1.155,1.98,-2.42,g,0,s*Math.PI/2,0);sw.castShadow=false}
  mesh(bx(1.36,.46,.06),trim,0,.98,-3.79,g);for(let i=0;i<4;i++)mesh(bx(1.3,.03,.03),chrome,0,.82+i*.11,-3.83,g);
  for(const s of[-1,1]){mesh(bx(.34,.2,.05),lamp,s*.86,1.08,-3.78,g);mesh(bx(.14,.1,.05),amber,s*1.04,.86,-3.77,g)}
  mesh(bx(2.42,.24,.26),dark,0,.62,-3.84,g);
  for(const s of[-1,1]){mesh(bx(.36,.035,.035),trim,s*1.3,2.08,-3.05,g);mesh(bx(.07,.38,.2),dark,s*1.5,2.02,-3.05,g)}
  for(const s of[-1,1]){mesh(bx(.012,1.6,.012),trim,s*1.158,1.55,-1.72,g);mesh(bx(.012,1.6,.012),trim,s*1.158,1.55,-3.0,g);mesh(bx(.03,.04,.18),chrome,s*1.17,1.5,-2.0,g)}
  for(const s of[-1,1])mesh(bx(.16,.22,6.9),dark,s*.48,.52,0,g);
  const tank=mesh(cy(.24,.24,1.0,16),chrome,-1.0,.6,-.95,g);tank.rotation.set(Math.PI/2,0,0);
  for(const s of[-1,1])mesh(bx(.28,.05,.5),trim,s*1.12,.42,-2.5,g);
  /* the cargo box from panels: open at the back, so the roll-up door shows what's inside */
  const Lz=5.22,cz=1.09;for(const sx of[-1,1])mesh(bx(.06,2.52,Lz),white,sx*1.16,2.26,cz,g);mesh(bx(2.38,.06,Lz),white,0,3.5,cz,g);mesh(bx(2.38,2.52,.06),white,0,2.26,-1.5,g);mesh(bx(2.38,.1,Lz),trim,0,1.0,cz,g);
  for(const s of[-1,1]){mesh(bx(.07,2.56,.07),trim,s*1.17,2.26,3.72,g);mesh(bx(.07,2.56,.07),trim,s*1.17,2.26,-1.53,g)}
  mesh(bx(2.42,.1,.09),trim,0,3.5,3.74,g);mesh(bx(2.42,.14,.12),trim,0,1.02,3.76,g);
  const inner=M_(new T3.MeshStandardMaterial({color:a.lin('#4a4c4e'),roughness:.9,side:T3.BackSide}));const inb=mesh(bx(2.2,2.38,5.0),inner,0,2.24,1.1,g);inb.castShadow=false;inb.scale.z=.999;
  const floor=mesh(bx(2.2,.04,5.0),std('#6b5a44',{roughness:.85}),0,1.07,1.1,g);floor.castShadow=false;
  const slats=canvasTex(256,512,(c,W,Hh)=>{c.fillStyle='#e4e6e4';c.fillRect(0,0,W,Hh);for(let y=0;y<Hh;y+=32){const gr=c.createLinearGradient(0,y,0,y+32);gr.addColorStop(0,'#f4f5f3');gr.addColorStop(.75,'#d9dcd9');gr.addColorStop(1,'#a9adaa');c.fillStyle=gr;c.fillRect(0,y,W,32)}
    c.fillStyle='#55595c';c.fillRect(W/2-26,Hh-58,52,14);c.fillStyle='rgba(60,50,40,.18)';for(let i=0;i<40;i++)c.fillRect((i*53)%W,Hh-60+(i*37)%60,2,1)});
  const pivot=new T3.Group();pivot.position.set(0,3.42,3.73);g.add(pivot);const door=mesh(new T3.PlaneGeometry(2.2,2.36),std('#ffffff',{map:slats,roughness:.5,metalness:.15}),0,-1.18,0,pivot);door.castShadow=false;
  mesh(bx(2.3,.16,.22),dark,0,.78,3.84,g);for(const s of[-1,1]){mesh(bx(.16,.3,.05),red,s*.98,1.16,3.79,g);mesh(bx(.1,.06,.04),amber,s*.95,3.42,3.79,g)}
  for(const x of[-.3,0,.3])mesh(bx(.08,.05,.04),amber,x,3.42,3.79,g);
  const plateT=canvasTex(512,256,(c,W,Hh)=>{c.fillStyle='#f6f6f0';c.fillRect(0,0,W,Hh);c.strokeStyle='#22314d';c.lineWidth=10;c.strokeRect(8,8,W-16,Hh-16);c.fillStyle='#1d2c4f';c.font='bold 34px Arial';c.textAlign='center';c.fillText('COMMERCIAL',W/2,52);
    c.font='bold 118px "Arial Narrow",Arial';c.fillStyle='#14203a';c.fillText(plate,W/2,182);c.font='bold 22px Arial';c.fillText('TRUCK',W/2,236)});
  const pl=mesh(new T3.PlaneGeometry(.52,.26),M_(new T3.MeshStandardMaterial({map:plateT,roughness:.45,metalness:.2})),0,.9,3.955,g);pl.castShadow=false;
  const side=canvasTex(1024,256,(c,W,Hh)=>{c.clearRect(0,0,W,Hh);c.fillStyle='rgba(32,72,120,.85)';c.fillRect(0,Hh-46,W,20);c.fillStyle='rgba(200,60,40,.8)';c.fillRect(0,Hh-22,W,10);
    c.fillStyle='rgba(32,72,120,.78)';c.font='bold 92px Arial';c.textAlign='left';c.fillText('ALL-PURPOSE',40,96);c.font='bold 64px Arial';c.fillText('HAULING · LOCAL & LONG DISTANCE',40,170)});
  for(const s of[-1,1]){const p=mesh(new T3.PlaneGeometry(4.6,1.15),M_(new T3.MeshStandardMaterial({map:side,transparent:true,roughness:.5,depthWrite:false})),s*1.2,2.25,1.08,g,0,s*Math.PI/2,0);p.castShadow=false;if(s<0)p.scale.x=-1}
  const wheels=[];const wheel=(x,z,dual)=>{const wg=new T3.Group();wg.position.set(x,.5,z);g.add(wg);mesh(cy(.5,.5,dual?.56:.32,22),tyre,0,0,0,wg,0,0,Math.PI/2);
    const r=mesh(cy(.3,.3,.02,18),rim,Math.sign(x)*(dual?.285:.165),0,0,wg,0,0,Math.PI/2);mesh(cy(.09,.12,.06,10),chrome,Math.sign(x)*(dual?.31:.19),0,0,wg,0,0,Math.PI/2);wheels.push(wg)};
  wheel(-1.0,-2.82,false);wheel(1.0,-2.82,false);wheel(-.92,2.3,true);wheel(.92,2.3,true);
  for(const s of[-1,1])mesh(bx(.06,.5,.04),dark,s*1.0,.45,3.05,g);
  /* the cargo: 20 catalytic converters on two pallets, a crate of packages, a hay bale (Pepper stands on the floor at the back) */
  const cargo=new T3.Group();cargo.position.set(0,1.09,0);g.add(cargo);const pal=std('#b08a5a',{roughness:.85}),cat=std('#d4d8dc',{roughness:.35,metalness:.35,emissive:A().lin('#3a3c3e'),emissiveIntensity:.5}),pipe=std('#9a9fa4',{roughness:.4,metalness:.4});
  for(const pz of[-.6,.55]){mesh(bx(1.0,.12,1.0),pal,-.5,.06,pz,cargo);for(let i=0;i<10;i++){const c=mesh(cy(.11,.11,.34,10),cat,-.78+(i%3)*.27,.24+Math.floor(i/6)*.24,pz-.3+(Math.floor(i/3)%2)*.3,cargo,0,0,Math.PI/2);c.scale.z=.7;mesh(cy(.03,.03,.12,6),pipe,c.position.x+.22,c.position.y,c.position.z,cargo,0,0,Math.PI/2)}}
  const crate=std('#9c7a4a',{roughness:.85});mesh(bx(.9,.6,.8),crate,.55,.3,-.3,cargo);for(let i=0;i<5;i++)mesh(bx(.28+(i%2)*.1,.2,.24),std(['#c69c66','#b8874f','#d1a874'][i%3],{roughness:.8}),.35+(i%3)*.22,.7+(i>2?.2:0),-.45+(i%2)*.3,cargo);
  mesh(bx(.7,.42,.42),std('#d8c070',{roughness:.95}),.5,.21,1.0,cargo);
  g.userData={door:pivot,doorMesh:door,wheels};return g}
function doorSet(tr,k){const d=tr.userData.doorMesh;const s=Math.max(.06,1-k*.94);d.scale.y=s;d.position.y=-1.18*s}

/* ---------------- Pepper (a white goat with a bell) and Earl's pickup ---------------- */
function goatModel(){const a=A(),T3=a.THREE,G0=new T3.Group(),g=new T3.Group();G0.add(g);g.scale.setScalar(.78);G0.name='pepper';const wool=std('#f1ede4',{roughness:.95}),dark=std('#2b2622',{roughness:.7}),horn=std('#9b8c74',{roughness:.6}),pink=std('#d9a39a',{roughness:.8}),bell=std('#d1a238',{roughness:.3,metalness:.7});
  const body=mesh(new T3.SphereGeometry(.32,14,10),wool,0,.58,0,g);body.scale.set(.85,.82,1.45);
  const neck=mesh(cy(.1,.13,.32,10),wool,0,.78,-.4,g);neck.rotation.x=-.6;
  const head=new T3.Group();head.position.set(0,.95,-.56);g.add(head);const hd=mesh(new T3.SphereGeometry(.15,12,9),wool,0,0,0,head);hd.scale.set(.85,.95,1.25);
  mesh(new T3.SphereGeometry(.07,10,8),pink,0,-.05,-.17,head).scale.set(1,.8,1);for(const s of[-1,1]){mesh(new T3.SphereGeometry(.025,8,6),dark,s*.08,.04,-.1,head);const e=mesh(bx(.16,.05,.06),wool,s*.15,.03,0,head);e.rotation.z=s*.5;const h=mesh(cy(.012,.03,.18,6),horn,s*.05,.15,.04,head);h.rotation.x=.6}
  mesh(cy(.02,.005,.12,6),wool,0,-.15,-.12,head);/* the beard */
  for(const[x,z]of[[-.13,-.3],[.13,-.3],[-.13,.3],[.13,.3]]){mesh(cy(.04,.035,.42,8),wool,x,.21,z,g);mesh(cy(.04,.04,.06,8),dark,x,.03,z,g)}
  mesh(cy(.04,.02,.12,6),wool,0,.72,.46,g).rotation.x=-1;const b=mesh(new T3.SphereGeometry(.05,10,8),bell,0,.66,-.5,g);
  for(const[x,z]of[[-.13,-.3],[.13,-.3],[-.13,.3],[.13,.3]])mesh(cy(.045,.045,.05,8),dark,x,.02,z,g);
  G0.userData.head=head;return G0}
function pickupModel(){const a=A();const o=a.makeVehicle('pickup','#6e2a26')||a.makeVanBox('#6e2a26');a.wmAdd(o,true);res().veh.push(o);return o}
/* a person: HT.People when it's loaded, else a makeDude stand-in */
function person(role,look,x,z,ry,o){const a=A(),PP=window.HT&&HT.People;let d=null;
  if(PP&&PP.ok&&role){try{if(role==='neighbour')d=PP.make('neighbour',{variant:o&&o.variant});else if(PP.has(role))d=PP.make(role,{})}catch(_){d=null}}
  if(!d)d=a.makeDude(look||{shirt:'#6a7f99',pants:'#3a3a3a'});d.root.position.set(x,0,z);d.root.rotation.y=ry||0;a.wmAdd(d.root);return d}
function posePerson(d,dt,o){try{A().pose(d,dt,o||{moving:false,aim:false,mode:'stand'})}catch(_){}}
function faceTo(d,x,z,dt){const r=d.root,w=Math.atan2(x-r.position.x,z-r.position.z);r.rotation.y+=wrap(w-r.rotation.y)*Math.min(1,(dt||1)*5)}
function walkTo(d,t,sp,dt){const a=A(),r=d.root.position,dx=t.x-r.x,dz=t.z-r.z,l=Math.hypot(dx,dz);if(l<.25){posePerson(d,dt);return true}const s=Math.min(l,sp*dt);r.x+=dx/l*s;r.z+=dz/l*s;
  const q={x:r.x,z:r.z};a.collide(q,.3);r.x=q.x;r.z=q.z;d.root.rotation.y=Math.atan2(dx,dz);posePerson(d,dt,{moving:true,speed:sp,aim:false,mode:'stand'});return false}

/* ---------------- dialogue queue (paced by dt; nothing ever holds the player) ---------------- */
/* say(M,lines,front,{ph,ttl}): a line is dropped if the job moved on to another phase or it waited past its ttl */
function say(M,lines,front,o){o=o||{};if(typeof lines[0]==='string')lines=[lines];const ex=lines.map(l=>[l[0],l[1],o.ph||null,M.elapsed+(o.ttl||(front?14:30))]);
  if(front){M.q.unshift(...ex);if(M.q.length>8)M.q.length=8}else{M.q.push(...ex);if(M.q.length>10)M.q.splice(2,M.q.length-10)}}
function lineTick(M,dt){M.qT-=dt;if(M.qT>0||!M.q.length)return;const[w,t,ph,exp]=M.q.shift();if(ph&&ph!==M.ph||exp<M.elapsed)return;A().radio(w,t);M.qT=Math.max(1.8,t.length*.05)+.3;if(w==='Pepper')bleat()}
function once(M,k){if(M.said[k])return false;M.said[k]=1;return true}

/* ---------------- sound (HT.Audio.tone only) ---------------- */
const AU=()=>{const x=window.HT&&HT.Audio;return x&&x.tone?x:null};
function tone(o){const au=AU();if(au)try{au.tone(o)}catch(_){}}
function bleat(){tone({f:520,to:380,type:'sawtooth',d:.42,gain:.08});tone({f:540,to:420,type:'triangle',d:.4,gain:.05,at:.03})}
function thunk(kind,sp){const k=Math.min(1,sp/14);if(kind==='cone')tone({f:300+Math.random()*80,to:160,type:'triangle',d:.12,gain:.08+.1*k});else if(kind==='sawhorse'){tone({f:140,to:70,type:'square',d:.18,gain:.08+.12*k});tone({f:900,to:500,type:'triangle',d:.07,gain:.05,at:.02})}else tone({f:220,to:110,type:'triangle',d:.14,gain:.08})}
function blip(up){tone({f:up?660:520,to:up?880:420,type:'sine',d:.08,gain:.06,bus:'ui'})}
function music(st,i){try{const x=window.HT&&HT.Audio;if(x&&x.music)x.music(st,i!=null?{intensity:i}:{})}catch(_){}}

/* ================================================================ the job ================================================================ */
J.register('cones',{
  def:{giver:'earl',hood:'river',title:'Cone Zone',role:'Earl · Knows every timetable in town',place:'Industrial Way',
    lines:["That box truck Doug photographed. Same plate, every Thursday, 3:52, out of Discount Storage Unlimited, up Industrial Way and out to the highway. One truck, two escort cars.",
      "I drove the 9 for thirty-six years. I know what stops traffic and what just annoys it. You've got ninety seconds before they roll. I've got a truck full of cones.",
      "Build me a roadblock. A real one. If they stop, nobody has to get hurt. If they don't, you'd better be good at chasing a box truck."],
    obj:'Build a roadblock on Industrial Way in 90 seconds, stop the stolen-goods convoy, and get the truck back.',
    crew:['gary','dave'],weapons:['pistol','beanbag'],
    start:{x:RING.x,z:RING.z},site:null,
    unlock:{done:['tail','benny']},
    pay:950,par:330,roam:true,order:40,
    stages:['build','convoy'],stageLabels:{build:'The roadblock',convoy:'The convoy'},failPolicy:'escalate',
    medals:['Finished','Stopped cold: no chase','Airtight (two cars and a lit flare), not a single shot fired'],
    radio:[['earl',"Cones are in the back of my truck. Ninety seconds once you're there. Don't be late. Nobody's ever late on a Thursday."]],
    endLine:"Earl: Twenty converters back in twenty driveways. A goat back in a yard. And not one cone on Industrial Way. Thursday."},

  start(M,o){const a=A();freeAll();const R=res(),Pp=PR();
    Object.assign(M,{ph:'build',clock:K.build,q:[],qT:.6,said:{},stock:Object.assign({},K.stock),posted:[],plan:null,planT:0,frozen:null,shots:0,cones0:0,
      branch:null,conv:[],convT:0,esc:[],driver:null,goat:null,goatSt:'truck',goatPaid:false,opened:0,manifest:false,airtight:false,stoppedCold:false,carsHurt:{},knocked:0,
      chase:null,chaseT:0,blockT:0,boxT:0,planOn:false,touch:false,tl:[],left:0,lineBuilt:null,driverDone:false});
    a.wmSetWindow(a.wmWindow(ROAD_X,104,28));
    R.props=Pp.create(a);R.props.onKnock=(p,sp,who)=>{thunk(p.kind,sp);if(p.knocked===1)M.knocked++;if(p.kind==='sawhorse'&&once(M,'sawhorseDown'))say(M,[['dave',"Sawhorse down! Sawhorse DOWN!"]],true)};
    /* Earl's pickup, the pile, Earl */
    const pk=pickupModel();pk.position.set(PICKUP.x,a.groundAt(PICKUP.x,PICKUP.z),PICKUP.z);pk.rotation.y=PICKUP.yaw+Math.PI/2;
    R.pickCol=a.wmCol({x0:PICKUP.x-1.02,x1:PICKUP.x+1.02,z0:PICKUP.z-2.6,z1:PICKUP.z+2.6});
    M.pile=buildPile(M);
    M.earl=person('earl',{shirt:'#3d5a80',pants:'#5b5b5b',cap:'#3d5a80'},EARL.x,EARL.z,Math.PI*.85);
    M.paddleHolder=null;
    /* Sal's lot: three customers' cars, borrowable */
    M.lot=LOT.map((c,i)=>{const obj=a.makeVehicle(c.type,c.color);if(!obj)return null;a.L.group.add(obj);const yaw=Math.PI;obj.position.set(c.x,0,c.z);obj.rotation.y=yaw+Math.PI/2;
      const e=a.registerCar(obj,c.x,c.z);if(!e){if(obj.parent)obj.parent.remove(obj);return null}e.name=c.name;e.lot=i;e.yaw=yaw;e.home={x:c.x,z:c.z,yaw};a.syncCar(e);R.cars.push(e);return e}).filter(Boolean);
    /* the crew are mine during the build: off the combat list, posted where they're told */
    M.crew=a.allies.slice();R.crewOut=M.crew;for(const c of M.crew){const k=a.allies.indexOf(c);if(k>=0)a.allies.splice(k,1);c.post=null;c.idle={x:EARL.x+1.6+M.crew.indexOf(c)*1.3,z:EARL.z+2.6};if(c.tag)c.tag.style.display='none'}
    M.goatG=null;
    hookHud();touchButtons(M,true);
    if(!(o&&o.checkpoint)){say(M,L_.brief,false,{ph:'build',ttl:40});music('tension',.25)}},

  upd(dt,M,F){const a=A(),R=res();if(!R.props)return;lineTick(M,dt);tlTick(M,dt);R.props.step(dt);
    if(M.ph==='build')buildTick(M,dt,F);
    else if(M.ph==='convoy')convoyTick(M,dt,F);
    else if(M.ph==='standoff')standoffTick(M,dt,F);
    else if(M.ph==='chase')chaseTick(M,dt,F);
    else if(M.ph==='driver')driverTick(M,dt,F);
    else if(M.ph==='open')openTick(M,dt,F);
    else if(M.ph==='wrap')wrapTick(M,dt,F);
    crewTick(M,dt);vehicles(M,dt);carWatch(M);goatTick(M,dt,F);
    if(M.earl){const P=a.P;if(Math.hypot(P.pos.x-EARL.x,P.pos.z-EARL.z)<14)faceTo(M.earl,P.pos.x,P.pos.z,dt);posePerson(M.earl,dt)}
    if(M.state!=='go')return;
    /* the crew all down = the job's over (unless the truck's already ours) */
    const cr=a.allies.length?a.allies:null;if(cr&&cr.every(c=>c.down)&&['standoff'].includes(M.ph))return a.endMission(false,L_.crewDown,'Crew down');
    M.score=M.rankBest!=null?M.rankBest:0},

  save(M){/* the roadblock as built, the borrowed cars where they stand, who's posted where */
    const R=RES,props=R&&R.props?R.props.list.filter(p=>p.state!=='flying').map(p=>({k:p.kind,x:+p.x.toFixed(2),z:+p.z.toFixed(2),y:+(p.yaw||0).toFixed(3),l:p.lit?1:0,s:p.stackOn?1:0})):(M.saved&&M.saved.props)||[];
    const cars=(M.lot||[]).map(e=>e&&e.pos?{x:+e.pos.x.toFixed(2),z:+e.pos.z.toFixed(2),y:+(e.yaw||0).toFixed(3)}:null);
    const posts=(M.crew||[]).map(c=>c.post?{x:+c.post.x.toFixed(2),z:+c.post.z.toFixed(2),p:c===M.paddleHolder?1:0}:null);
    return{ph:M.ph==='build'?'build':'convoy',props,cars,posts,stock:Object.assign({},M.stock||K.stock)}},
  load(M,s){const a=A(),R=RES;M.saved=s;if(!s)return;M.stock=Object.assign({},K.stock,s.stock||{});
    if(R&&R.props){for(const p of R.props.list.slice())R.props.remove(p);let last=null;for(const q of s.props||[]){const st=q.s&&last&&last.kind==='cone'&&last.x===q.x&&last.z===q.z?last:null;last=R.props.add(q.k,q.x,q.z,q.y,{lit:!!q.l,stackOn:st})}}
    (s.cars||[]).forEach((c,i)=>{const e=M.lot&&M.lot[i];if(!c||!e)return;e.pos.set(c.x,0,c.z);e.yaw=c.y;a.syncCar(e)});
    (s.posts||[]).forEach((p,i)=>{const c=M.crew&&M.crew[i];if(!p||!c)return;c.post={x:p.x,z:p.z};c.pos.set(p.x,0,p.z);c.dude.root.position.set(p.x,0,p.z);if(p.p)givePaddle(M,c)});
    if(s.ph==='convoy'){M.clock=0;M.said.t60=M.said.t30=M.said.t10=1;startConvoy(M,true)}},
  payout(M,ok){if(!ok)return[];const out=[];
    if(M.stoppedCold)out.push([M.airtight?'Airtight · stopped cold, no chase':'Stopped cold · no chase',K.airtight]);
    out.push(['Catalytic converters back ×20',0]);
    if(M.goatPaid)out.push(['Goat returned · Pepper',K.goat]);
    return out},
  medal(M){return M.stoppedCold?(M.shots===0&&M.airtight?3:2):1},
  end(M,ok){const a=A(),s=a.SV();if(!ok||!s)return;try{settle(M)}catch(e){console.warn('[cones] settle',e)}s.flags=s.flags||{};s.flags.coneZone=true;if(M.goatPaid)s.flags.pepperHome=true},
  fire(){const M=A().M;if(!M||M.state!=='go')return;if(M.planOn&&M.ph==='build')return planFire(M)||true;M.shots=(M.shots||0)+1;if(M.ph==='standoff'&&M.peace)breakPeace(M,true)},
  camera(dt){const M=A().M;if(!M||M.state!=='go'||!M.planOn)return undefined;return planCam(M,dt)},
  interact(prompt){return undefined},
  test:{give(a){const h=window.__ht,s=a.SV();for(const id of['gary','rick','earl','benny','tail']){const i=a.MISSIONS.findIndex(m=>m.id===id);if(i>=0&&h&&h.prog)h.prog.done[i]=true;if(s&&window.HT.Save&&HT.Save.jobRec)HT.Save.jobRec(s,id).done=true}
      if(s&&s.world)s.world.bridgeOpen=true;if(s&&s.flags){s.flags.act2Intro=true;s.flags.boxTruckPlate=s.flags.boxTruckPlate||PLATE0}if(h&&h.prog)h.prog.act=Math.max(h.prog.act||1,2);
      const PP=window.HT.People;if(PP&&PP.preload)try{PP.preload(['dad_gary','dad_dave','earl','nb_gran','thug_hoodie','thug_track','thug_beanie','thug_red','boss','benny','rosa','dee'].filter(k=>PP.keys&&PP.keys.includes(k)&&!PP.has(k))).catch(()=>{})}catch(_){}},
    step:(a,t,o)=>bot(a,t,o),cpNode:false,read:readBlock,
    sample:()=>({ph:'build',stock:{cone:8,sawhorse:2,sign:1,flare:2},lot:[],crew:[]})}
});
HT.Jobs.get('cones').readBlock=readBlock;

/* ---------------- timeline (job-time, from dt) ---------------- */
function setT(M,t,fn){M.tl.push({t,fn})}
function tlTick(M,dt){for(let i=0;i<M.tl.length;i++){const q=M.tl[i];q.t-=dt;if(q.t<=0){M.tl.splice(i--,1);try{q.fn()}catch(e){console.warn('[cones]',e)}}}}

/* ---------------- the pile at Earl's tailgate ---------------- */
function buildPile(M){const a=A(),S=res().props,T3=a.THREE,g=new T3.Group();a.wmAdd(g);const pile={g,meshes:{cone:[],sawhorse:[],sign:[],flare:[]}};
  const one=(k,x,y,z,ry)=>{const h=S.carryMesh(k,1),m=h.children[0];m.scale.setScalar(1);m.position.set(0,0,0);m.rotation.set(0,0,0);m.traverse(o=>{if(o.isMesh&&o.material===S.mats.shadow)o.visible=true});h.position.set(x,y,z);h.rotation.y=ry||0;g.add(h);pile.meshes[k].push(h);return h};
  /* three nested stacks of four cones (a nested cone sits 9 cm higher) */
  for(let i=0;i<K.stock.cone;i++){const st=Math.floor(i/4),n=i%4;one('cone',PILE.cone.x+(st-1)*.48,n*.09,PILE.cone.z+(st===1?.25:0))}
  /* sawhorses stacked flat on blocks, the sign folded against the truck, the flares in a box */
  for(let i=0;i<K.stock.sawhorse;i++){const h=one('sawhorse',PILE.sawhorse.x,.4+i*.46,PILE.sawhorse.z,Math.PI/2);h.children[0].rotation.x=-Math.PI/2;h.children[0].position.z=.5}
  mesh(bx(.5,.06,.12),std('#7a6248',{roughness:.9}),PILE.sawhorse.x,.03,PILE.sawhorse.z-.6,g);mesh(bx(.5,.06,.12),std('#7a6248',{roughness:.9}),PILE.sawhorse.x,.03,PILE.sawhorse.z+.6,g);
  {const h=one('sign',PILE.sign.x,0,PILE.sign.z,-.5)}
  {mesh(bx(.42,.22,.3),std('#3b4a5c',{roughness:.7}),PILE.flare.x,.11,PILE.flare.z,g);for(let i=0;i<K.stock.flare;i++){const h=one('flare',PILE.flare.x-.08+i*.16,.22,PILE.flare.z,Math.PI/2);h.children[0].children.forEach(o=>{if(o.geometry&&o.geometry.type==='PlaneGeometry')o.visible=false})}}
  return pile}
function pileSync(M){const P_=M.pile;for(const k in P_.meshes)P_.meshes[k].forEach((m,i)=>{m.visible=i<M.stock[k]})}

/* ---------------- the build ---------------- */
function buildTick(M,dt,F){const a=A(),S=res().props,P=a.P;pileSync(M);
  if(!M.paused)M.clock=Math.max(0,M.clock-dt);
  const t=M.clock,B={ph:'build',ttl:6};if(t<=62&&!M.said.stack&&once(M,'stackIdea'))say(M,L_.stack,false,B);if(t<=60&&once(M,'t60'))say(M,[L_.t60],false,B);if(t<=30&&once(M,'t30')){say(M,[L_.t30],false,B);music('tension',.6)}if(t<=10&&once(M,'t10'))say(M,[L_.t10],true,B);
  if(M.clock<=0)return startConvoy(M,false);
  if(M.elapsed>6&&once(M,'hint'))a.feed(M.touch?L_.hintTouch:L_.hint,'info');
  /* carry + place */
  const c=P.carry;const carrying=c&&c.kind&&c.kind.startsWith('cz:');
  if(carrying&&!a.CV){const kind=c.kind.slice(3),f=fwd(P.yaw),want=M.planGo&&M.planGo.place?M.planGo:M.planOn&&M.planCursor?M.planCursor:null;
    const px=want?want.x:P.pos.x+f[0]*1.7,pz=want?want.z:P.pos.z+f[1]*1.7,yaw=kind==='sawhorse'?0:kind==='sign'?Math.PI:P.yaw;
    const sn=S.snap(kind,px,pz,yaw,{yaw:kind==='sawhorse'||kind==='sign'?yaw:Math.round(P.yaw/(Math.PI/4))*(Math.PI/4)});const ok=a.walkable(a.tx(sn.x),a.tx(sn.z))!==false;
    S.ghost(kind,sn.x,sn.z,sn.yaw,ok);M.ghostAt=sn;
    F.taps.push({d:0,r:1,txt:(sn.stack?'Stack the cone. For height':'Put down the '+PR().KINDS[kind].label.replace('ROAD WORK AHEAD sign','sign'))+(c.it.n>1?' ('+c.it.n+' in hand)':''),fn:()=>placeHeld(M,sn)});
    F.objs.push(['Carrying: '+c.it.n+' × '+PR().KINDS[kind].label,false])}
  else S.ghostOff();
  if(!carrying&&!a.CV){
    for(const k of['cone','sawhorse','sign','flare'])if(M.stock[k]>0){const p=PILE[k];F.holds.push({x:p.x,z:p.z,r:1.15,o:M.pile.meshes[k],txt:'Grab '+(k==='cone'?Math.min(2,M.stock.cone)+' cones':k==='flare'?Math.min(2,M.stock.flare)+' flares':'the '+PR().KINDS[k].label),time:.35,fn:()=>grab(M,k)})}
    const near=S.near(P.pos.x,P.pos.z,1.5,p=>p.state!=='flying');if(near)F.holds.push({x:near.x,z:near.z,r:1.5,o:near,txt:near.state==='down'?'Stand it back up':'Pick up the '+PR().KINDS[near.kind].label,time:.3,fn:()=>{if(near.state==='down'){S.upright(near);return}pickUp(M,near)}});
}
  if(!a.CV)F.holds.push({x:EARL.x,z:EARL.z,r:1.6,o:M.readyO||(M.readyO={}),txt:"We're ready. Bring them on",time:1.0,fn:()=>{say(M,L_.ready,true);M.clock=Math.min(M.clock,3);M.said.t60=M.said.t30=M.said.t10=1}})
  /* the plan, the meter */
  M.planT-=dt;if(M.planT<=0){M.planT=.2;M.plan=readBlock(items(M));M.rankBest=M.plan.rank;drawPlan(M)}
  const pl=M.plan||readBlock(items(M));
  F.widgets.push({id:'cz-clock',kind:'timer',label:'Convoy',v:M.clock,hot:M.clock<15});
  F.meters.push(meter(pl));
  F.objs.push(['Build a roadblock before the convoy rolls',false]);
  F.objs.push(['Stock: '+M.stock.cone+' cones · '+M.stock.sawhorse+' sawhorses · '+M.stock.sign+' sign · '+M.stock.flare+' flares',false]);
  const lotFree=M.lot.filter(e=>Math.hypot(e.pos.x-e.home.x,e.pos.z-e.home.z)<3).length;if(lotFree)F.objs.push(["Sal's lot: "+lotFree+" borrowable car"+(lotFree>1?'s':'')+" next door",false]);
  F.objs.push([pl.text,pl.rank>=4,pl.rank<2?'warn':undefined]);
  if(!carrying&&!a.CV&&Object.values(M.stock).some(v=>v>0)&&Math.hypot(P.pos.x-PILE.cone.x,P.pos.z-PILE.cone.z)>14)F.target={x:PILE.cone.x,z:PILE.cone.z,label:'Cones'};
  planCursorTick(M,dt);planWalk(M,dt);planOverlay(M)}
function meter(pl){return{id:'cz-block',label:'Roadblock',style:'bands',max:6,v:Math.min(5.9,(pl.rank|0)+.5),
  zones:[[0,1,'bad','Open road'],[1,2,'bad','Gap'],[2,3,'warn','Speed bump'],[3,4,'warn','Flimsy'],[4,5,'good','Stop'],[5,6,'good','Airtight']],sub:pl.top?pl.top.why:'nothing placed'}}
function grab(M,k){const a=A(),S=res().props,n=Math.min(PR().KINDS[k].carry,M.stock[k]);if(n<=0)return;M.stock[k]-=n;const g=S.carryMesh(k,n);a.wmCarry('cz:'+k,g,{n,kind:k});blip(true);
  if(k==='flare'&&once(M,'flareHint'))a.feed('Flares light when you put them down','info');if(k==='sign'&&once(M,'signHint'))a.feed('Put the sign before the wall, facing the convoy','info')}
function pickUp(M,p){const a=A(),S=res().props;if(p.state==='flying')return;const k=p.kind;S.remove(p);M.stock[k]+=1;if(p.kind==='flare'&&p.lit)M.stock.flare-=0;grab(M,k);blip(true)}
function placeHeld(M,sn){const a=A(),S=res().props,P=a.P,c=P.carry;if(!c||!c.kind.startsWith('cz:'))return;const k=c.kind.slice(3);
  const p=S.add(k,sn.x,sn.z,sn.yaw,{lit:k==='flare',stackOn:sn.stack});blip(false);
  if(sn.stack&&once(M,'stack'))say(M,L_.stack,true);
  c.it.n--;S.free(c.mesh);a.wmDrop();if(c.it.n>0){const g=S.carryMesh(k,c.it.n);a.wmCarry('cz:'+k,g,c.it)}
  if(M.planGo&&M.planGo.place)M.planGo=null;M.planT=0}
/* what the convoy sees: props, parked cars, posted crew */
function items(M){const a=A(),S=res().props,out=[];if(!S)return out;
  for(const p of S.list){if(p.state==='flying')continue;const f=S.foot(p),cls=p.state==='down'?(p.kind==='flare'?'signal':'soft'):PR().KINDS[p.kind].cls;out.push({x0:f.x0,x1:f.x1,z0:f.z0,z1:f.z1,cls:p.kind==='sign'&&p.state!=='down'?'medium':cls,kind:p.kind,lit:p.lit,down:p.state==='down',p})}
  for(const e of a.L.cars||[]){if(!e.obj||e===a.CV||e.convoy)continue;const S_=a.carSize(e),c=Math.abs(Math.cos(e.yaw)),s=Math.abs(Math.sin(e.yaw)),hl=S_.l/2,hw=S_.w/2,hx=s*hl+c*hw,hz=c*hl+s*hw;
    out.push({x0:e.pos.x-hx,x1:e.pos.x+hx,z0:e.pos.z-hz,z1:e.pos.z+hz,cls:'hard',kind:'car',car:e})}
  if(M.ph==='build'||M.ph==='convoy')for(const c of M.crew||[])if(c.post&&!c.down){out.push({x0:c.pos.x-.45,x1:c.pos.x+.45,z0:c.pos.z-.3,z1:c.pos.z+.3,cls:'soft',kind:'crew',flagger:c===M.paddleHolder,crew:c})}
  return out}

/* ---------------- the crew during the build: posted or idle by the pile ---------------- */
function crewTick(M,dt){const a=A(),P=a.P;if(!(M.ph==='build'||M.ph==='convoy'))return;
  /* G (or the touch button): post the next dad where you're looking; again on a posted dad recalls him */
  const g=!!a.keys.g;if(g&&!M.gPrev&&!a.CV)postCrew(M);M.gPrev=g;
  for(const c of M.crew){const d=c.dude;const tgt=c.post||c.idle;const r=d.root.position;
    if(Math.hypot(tgt.x-r.x,tgt.z-r.z)>.3){walkTo(d,tgt,c.post?5.6:3.2,dt)}else{posePerson(d,dt);if(c.post){faceTo(d,ROAD_X+(c.post.x<ROAD_X?2:-2),c.post.z+8,dt)}else faceTo(d,P.pos.x,P.pos.z,dt)}
    c.pos.set(r.x,0,r.z);
    /* in the convoy's path with a car coming: dive for the verge */
    if(M.ph==='convoy'&&c.post&&!c.dove){for(const v of M.conv){const dz=v.c.z-c.pos.z,dx=Math.abs(v.c.x-c.pos.x);if(dz>0&&dz<7&&dx<1.8&&Math.abs(v.c.spd)>2){c.dove=true;const side=c.pos.x<ROAD_X?-1:1;c.post={x:Math.min(207.2,Math.max(195,c.pos.x+side*2.4)),z:c.pos.z};a.radio(c.id,pick(["Nope!","Not today!","I have a family!"]),true);break}}}}}
function postCrew(M){const a=A(),P=a.P,f=fwd(P.yaw);const at=M.planOn&&M.planCursor?M.planCursor:{x:P.pos.x+f[0]*2.6,z:P.pos.z+f[1]*2.6};
  const posted=M.crew.find(c=>c.post&&Math.hypot(c.post.x-at.x,c.post.z-at.z)<1.6);
  if(posted){posted.post=null;a.radio('you',pick(L_.recall),true);if(posted===M.paddleHolder)takePaddle(M);M.planT=0;return}
  const c=M.crew.find(c=>!c.post&&c.id==='dave')||M.crew.find(c=>!c.post);if(!c){a.feed('Everyone is posted. G on a dad sends him back.','info');return}
  const q={x:Math.round(at.x*2)/2,z:Math.round(at.z*2)/2};c.post=q;c.dove=false;M.planT=0;
  if(!M.paddleHolder)givePaddle(M,c);
  const L=L_.post[c.id]||L_.post.other;if(once(M,'post_'+c.id))say(M,L,true)}
function givePaddle(M,c){const S=res().props;if(M.paddleHolder===c)return;if(M.paddleHolder)takePaddle(M);const p=S.paddle();p.position.set(.36,.15,.12);p.scale.setScalar(.95);c.dude.root.add(p);M.paddle=p;M.paddleHolder=c}
function takePaddle(M){const S=res().props;if(M.paddle)S.free(M.paddle);M.paddle=null;M.paddleHolder=null}
function restoreCrew(list){const a=A();if(!a)return;for(const c of list){if(!a.allies.includes(c))a.allies.push(c);if(c.tag)c.tag.style.display=''}}
function crewBack(M){const a=A();restoreCrew(M.crew);if(RES)RES.crewOut=null;for(const c of M.crew){c.post=null}}

/* ---------------- the planning view: a bird's-eye camera over the zone, click to walk and place ---------------- */
function planToggle(M,on){const a=A();on=on==null?!M.planOn:!!on;if(M.planOn===on)return;M.planOn=on;M.planGo=null;
  /* the pointer stays locked (dropping it pauses the game): the mouse moves a cursor on the road, a click is the trigger (consumed) */
  if(on){M.planCursor={x:a.P.pos.x,z:Math.max(ZONE.z0,Math.min(ZONE.z1,a.P.pos.z+8))};M.planYaw=a.P.yaw;M.planPitch=a.P.pitch;M.planClickT=.3;if(once(M,'planHint'))a.feed(M.touch?'Tap the road: he walks there and puts it down.':'Move the cursor, click: he walks there and puts it down. G posts a dad there.','info')}
  else{a.P.yaw=M.planYaw!=null?M.planYaw:a.P.yaw;a.P.pitch=M.planPitch!=null?M.planPitch:a.P.pitch}
  cursorMesh(M,on);drawPlan(M);planOverlay(M)}
function cursorMesh(M,on){const a=A(),T3=a.THREE,R=res();if(!R.cur&&on){const g=new T3.Group();const m=M_(new T3.MeshBasicMaterial({color:new T3.Color('#ffffff'),transparent:true,opacity:.9,depthWrite:false}));
    const ring=new T3.Mesh(G_(new T3.RingGeometry(.55,.75,32)),m);ring.rotation.x=-Math.PI/2;g.add(ring);for(let i=0;i<4;i++){const t=new T3.Mesh(G_(new T3.PlaneGeometry(.12,.6)),m);t.rotation.x=-Math.PI/2;t.rotation.z=i*Math.PI/2;t.position.set(Math.sin(i*Math.PI/2)*1.1,0,Math.cos(i*Math.PI/2)*1.1);g.add(t)}
    g.renderOrder=3;a.wmAdd(g);R.cur=g}
  if(R.cur)R.cur.visible=!!on}
/* locked mouse -> cursor: the look deltas move it, then the view is put back */
function planCursorTick(M,dt){const a=A(),P=a.P;if(!M.planOn)return;M.planClickT=Math.max(0,(M.planClickT||0)-dt);
  if(M.planYaw!=null){const dy=wrap(P.yaw-M.planYaw),dp=P.pitch-M.planPitch;if(dy||dp){const c=M.planCursor;c.x=Math.max(ZONE.xl-6,Math.min(ZONE.xr+6,c.x-dy*38));c.z=Math.max(ZONE.z0-14,Math.min(ZONE.z1+6,c.z-dp*38))}
    if(!M.planGo)P.yaw=M.planYaw;P.pitch=M.planPitch}
  const R=res();if(R.cur&&M.planCursor){R.cur.position.set(M.planCursor.x,(a.groundAt(M.planCursor.x,M.planCursor.z)||0)+.08,M.planCursor.z);R.cur.rotation.y+=dt*.8}}
function planFire(M){if(!M.planOn||M.ph!=='build'||M.planClickT>0)return false;M.planClickT=.3;const a=A(),c=a.P.carry;const p=M.planCursor;if(!p)return true;
  M.planGo={x:p.x,z:p.z,place:!!(c&&c.kind&&c.kind.startsWith('cz:'))};blip(true);return true}
function planCam(M,dt){const a=A(),cam=a.camera;/* north up, the whole zone and the pile in frame, a little tilt so cars and sawhorses read */
  cam.position.set(ROAD_X-4,44,128);cam.lookAt(ROAD_X-4,0,108);return true}
function planRay(M,ev){const a=A(),T3=a.THREE,cam=a.camera,r=(a.L&&a.L.renderer)||null;const el=ev.target&&ev.target.getBoundingClientRect?ev.target:document.body,b=el.getBoundingClientRect();
  const x=((ev.clientX-b.left)/b.width)*2-1,y=-((ev.clientY-b.top)/b.height)*2+1;const rc=new T3.Raycaster();rc.setFromCamera(new T3.Vector2(x,y),cam);const o=rc.ray.origin,d=rc.ray.direction;if(Math.abs(d.y)<1e-4)return null;const t=-o.y/d.y;return t>0?{x:o.x+d.x*t,z:o.z+d.z*t}:null}
function planClick(ev){const a=A(),M=a&&a.M;if(!M||M.state!=='go'||!M.planOn||M.ph!=='build')return;if(document.pointerLockElement)return;if(ev.target&&ev.target.closest&&ev.target.closest('button,.cz-btn'))return;const p=planRay(M,ev);if(!p)return;
  ev.preventDefault();ev.stopPropagation();M.planCursor=p;M.planYaw=a.P.yaw;M.planPitch=a.P.pitch;const c=a.P.carry;M.planGo={x:p.x,z:p.z,place:!!(c&&c.kind&&c.kind.startsWith('cz:'))};blip(true)}
function planWalk(M,dt){const a=A(),P=a.P,g=M.planGo;if(!g||a.CV)return;const f=fwd(P.yaw);
  /* walk to 1.7 m short of the spot, facing it, so the ghost (always 1.7 m ahead) lands on it */
  const dx=g.x-P.pos.x,dz=g.z-P.pos.z,d=Math.hypot(dx,dz);P.yaw=Math.atan2(-dx,-dz);
  if(d>1.75){const s=Math.min(d-1.7,6.2*dt);M.planYaw=P.yaw;P.pos.x+=dx/d*s;P.pos.z+=dz/d*s;a.collide(P.pos,.35);P.moving=true}else if(g.place){const c=P.carry;if(c&&c.kind.startsWith('cz:')&&M.ghostAt)placeHeld(M,M.ghostAt);M.planGo=null}else M.planGo=null}
function planOverlay(M){const a=A();if(typeof document==='undefined')return;const R=res();
  if(!M.planOn||M.ph!=='build'){if(R.ov['cz-plan']){a.overlay('cz-plan',null);delete R.ov['cz-plan'];M.planEl=null}return}
  if(!M.planEl){const wrapEl=document.createElement('div');wrapEl.style.cssText='position:absolute;inset:0;pointer-events:none';const el=document.createElement('div');wrapEl.appendChild(el);el.className='cz-plan';el.style.cssText='position:absolute;left:16px;top:178px;width:min(300px,calc(100vw - 32px));max-height:calc(100vh - 440px);overflow:hidden;padding:10px 12px;border-radius:14px;background:rgba(14,18,24,.78);color:#f3efe6;font:500 12px/1.4 system-ui,sans-serif;pointer-events:none;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,.12)';
    el.innerHTML='<div style="font:700 11px/1 system-ui;letter-spacing:.14em;color:#ffb35c;margin-bottom:6px">PLANNING · INDUSTRIAL WAY</div><div class="cz-v" style="font:700 17px/1.25 system-ui;margin-bottom:6px"></div><div class="cz-g"></div>'+
      '<div style="margin-top:8px;color:#b8b4aa;font-size:12px"><b style="color:#fff">Click</b> the road: walk there, put it down · <b style="color:#fff">G</b> post a dad · <b style="color:#fff">Tab</b> back<br>Sell it with any two: the sign 4-50 m before the wall, a flagger with the paddle, a lit flare. Two cars wall to wall stop anyone.</div>'+
      '<div style="margin-top:8px;display:flex;gap:10px;font-size:11px;color:#cfcac0"><span><i style="display:inline-block;width:10px;height:10px;background:#e8473b;border-radius:2px"></i> car</span><span><i style="display:inline-block;width:10px;height:10px;background:#ff9a2e;border-radius:2px"></i> sawhorse/sign</span><span><i style="display:inline-block;width:10px;height:10px;background:#ffd84a;border-radius:2px"></i> cones/crew</span><span><i style="display:inline-block;width:10px;height:10px;background:#47e08a;border-radius:2px"></i> their way</span></div>';
    /* short screens (phones): a compact strip under the meter, verdict and lines only */
    if(innerHeight<520){el.style.cssText+=';left:50%;top:150px;transform:translateX(-50%);max-height:none;width:min(380px,calc(100vw - 32px));padding:8px 12px';for(const d of[...el.children].slice(3))d.style.display='none'}
    if(M.touch){const h=el.children[3];if(h)h.innerHTML='<b style="color:#fff">Tap</b> the road: walk there, put it down · <b style="color:#fff">Post crew</b> sends a dad there · <b style="color:#fff">Plan view</b> back<br>Sell it with any two: the sign 4-50 m before the wall, a flagger with the paddle, a lit flare. Two cars wall to wall stop anyone.'}
    M.planEl=el;a.overlay('cz-plan',wrapEl);R.ov['cz-plan']=1}
  const pl=M.plan;if(!pl)return;const key=pl.verdict+'|'+pl.groups.map(g=>g.verdict+g.zc.toFixed(0)).join(',');if(M.planKey===key)return;M.planKey=key;
  M.planEl.querySelector('.cz-v').textContent=pl.text;
  const shown=[];for(const g of pl.groups){shown.push(g);if(g.rank>=4)break}
  M.planEl.querySelector('.cz-g').innerHTML=shown.length?shown.map(g=>'<div>'+(g.rank>=4?'⛔ ':'↪ ')+'<b>'+VLABEL[g.verdict]+'</b> · '+g.why+(g.rank<4&&g.rank>=2?' · official '+g.credN+'/2':'')+'</div>').join('')+(shown.length<pl.groups.length?'<div style="color:#b8b4aa">(and '+(pl.groups.length-shown.length)+' more past the wall)</div>':''):'<div style="color:#b8b4aa">Nothing on the road yet.</div>'}
/* the predicted line on the road (always, during the build) and the coverage strips (planning view) */
function drawPlan(M){const a=A(),T3=a.THREE,R=res();if(R.planMesh){if(R.planMesh.parent)R.planMesh.parent.remove(R.planMesh);R.planMesh.geometry.dispose();R.planMesh=null}
  if(M.ph!=='build'&&M.ph!=='convoy')return;const pl=M.plan;if(!pl)return;
  const pos=[],col=[],C=(h)=>{const c=new T3.Color(h);return[c.r,c.g,c.b]};const quad=(x0,z0,x1,z1,y,c)=>{const v=[[x0,z0],[x1,z0],[x1,z1],[x0,z0],[x1,z1],[x0,z1]];for(const[x,z]of v){pos.push(x,y,z);col.push(...c)}};
  /* their path: dashes from the gate to the decisive line (or through) */
  const path=pathPts(M,{x:LANE,z:ZONE.z1+6},pl),stopG=pl.first;let s=0;for(let i=1;i<path.length;i++){const p0=path[i-1],p1=path[i];if(p1.z<ZONE.z0-4)break;if(stopG&&p1.z<stopG.z1+K.stopShort-4)break;
    const L=Math.hypot(p1.x-p0.x,p1.z-p0.z);for(let u=0;u<L;u+=1.2){const t0=u/L,t1=Math.min(1,(u+.7)/L);const ax=p0.x+(p1.x-p0.x)*t0,az=p0.z+(p1.z-p0.z)*t0,bx_=p0.x+(p1.x-p0.x)*t1,bz=p0.z+(p1.z-p0.z)*t1;
      const nx=-(bz-az),nz=bx_-ax,nl=Math.hypot(nx,nz)||1,w=.14;const v=[[ax+nx/nl*w,az+nz/nl*w],[bx_+nx/nl*w,bz+nz/nl*w],[bx_-nx/nl*w,bz-nz/nl*w],[ax+nx/nl*w,az+nz/nl*w],[bx_-nx/nl*w,bz-nz/nl*w],[ax-nx/nl*w,az-nz/nl*w]];
      for(const[x,z]of v){pos.push(x,.06,z);col.push(...C(stopG?'#ffd84a':'#47e08a'))}}}
  if(stopG){const z=stopG.z1+K.stopShort-3;quad(LANE-1.6,z-.2,LANE+1.6,z+.2,.065,C('#e8473b'))}
  if(M.planOn)for(const g of pl.groups){const n=g.cells.length,st=(ZONE.xr-ZONE.xl)/n,cols=['#47e08a','#ffd84a','#ff9a2e','#e8473b'];for(let k=0;k<n;){let j=k;while(j<n&&g.cells[j]===g.cells[k])j++;quad(ZONE.xl+k*st,g.z1+1.1,ZONE.xl+j*st,g.z1+1.7,.07,C(cols[g.cells[k]]));k=j}}
  if(!pos.length)return;const geo=new T3.BufferGeometry();geo.setAttribute('position',new T3.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T3.Float32BufferAttribute(col,3));
  if(!R.planMat)R.planMat=M_(new T3.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.85,depthWrite:false,side:T3.DoubleSide}));
  const m=new T3.Mesh(geo,R.planMat);m.renderOrder=2;m.frustumCulled=false;a.wmAdd(m);R.planMesh=m}

/* ---------------- the convoy ---------------- */
/* the convoy's road: out of the storage lot, up Industrial Way (bending through the passage at each line), left on Route 9, west */
function pathPts(M,from,pl,east){const pts=[{x:from.x,z:from.z}];const add=(x,z)=>{const q=pts[pts.length-1];if(q.x<208&&x>190&&x<208&&z>47&&q.z<147&&z>=q.z-.05)return;/* never back down Industrial Way */if(Math.hypot(q.x-x,q.z-z)>.4)pts.push({x,z})};
  if(from.x>207){add(213,148.4);add(209.6,148.4);add(207.2,148);add(205.5,146.9);add(LANE,144.6);add(LANE,141)}
  let lx=from.x>207?LANE:from.x;
  for(const g of(pl?pl.groups:[])){if(g.z1>from.z-2&&from.x<=207)continue;const px=g.pass?g.pass.x:LANE;
    if(g.rank>=4){add(lx,g.z1+12);break}
    add(lx,g.z1+11);add(px,g.z1+2.5);add(px,g.z0-2.5);lx=px;add(LANE,g.z0-11);lx=LANE}
  if(east){add(LANE,52);add(LANE,46);add(204.8,44);add(207,43.6);add(211,44.2);add(216,44.5);add(330,44.5)}/* the escorts peel off right, toward the bridge */
  else{add(LANE,52);add(LANE,47.5);add(203.2,44.2);add(200,42.2);add(196,41.6);add(150,41.5);add(60,41.5);add(8,41.5)}return pts.filter((p,i)=>i===0||p.z<=pts[0].z+.01||p.x<pts[0].x)}
function startConvoy(M,fromCP){const a=A(),CA=a.CarAI(),S=res().props;if(!CA)return;M.ph='convoy';M.clock=0;S.ghostOff();planToggle(M,false);
  const c=a.P.carry;if(c&&c.kind&&c.kind.startsWith('cz:')){/* whatever's in your hands goes back on the pile */M.stock[c.kind.slice(3)]+=c.it.n;S.free(c.mesh);a.wmDrop()}
  if(!fromCP)a.CP.mark('convoy');
  M.plan=readBlock(items(M));M.rankBest=M.plan.rank;M.lineBuilt=M.plan;drawPlan(M);
  M.cones0=S.list.length;music('tension',.85);
  const plate=(a.SV()&&a.SV().flags&&a.SV().flags.boxTruckPlate)||PLATE0;
  M.conv=SPAWN.map((s,i)=>{let obj,car;if(s.role==='truck'){obj=truckModel(plate);a.wmAdd(obj);car=CA.make('workvan',{x:s.x,z:STORE_Z,yaw:Math.PI/2});
      car.stats=Object.assign({},car.stats,{maxSpeed:K.truckMax,boostMax:K.truckMax,accel:3.6,brake:10,len:7.6,wid:2.4,hp:K.truckHp,mass:2.2,ramMult:1.5});car.hp=K.truckHp}
    else{obj=a.makeVehicle(s.type,s.color)||a.makeVanBox(s.color);a.wmAdd(obj);res().veh.push(obj);car=CA.make(s.type,{x:s.x,z:STORE_Z,yaw:Math.PI/2});car.stats=Object.assign({},car.stats,{accel:6,brake:14})}
    const v={role:s.role,obj,c:car,col:a.wmCol({x0:-1e4,z0:-1e4,x1:-1e4+1,z1:-1e4+1}),st:'go',len:s.role==='truck'?7.6:a.carSize({obj}).l,gone:false};
    CA.follow(car,pathPts(M,{x:car.x,z:car.z},M.plan,s.role!=='truck'),{speed:s.role==='truck'?K.truckMax:K.cruise,turnSpeed:K.corner});syncV(v,0);return v});
  M.truck=M.conv[1];M.planSig=sig(M.plan);M.frozen=null;
  say(M,L_.arrive,true);if(M.plan.rank===0)say(M,L_.noPlan);
  crewTick(M,0)}
const sig=pl=>pl.groups.map(g=>g.verdict+(g.pass?g.pass.x.toFixed(1):'')).join('|');
function syncV(v,dt){const a=A(),c=v.c,o=v.obj;o.position.set(c.x,a.groundAt(c.x,c.z),c.z);o.rotation.set(0,c.yaw+(v.role==='truck'?0:Math.PI/2),0);
  const S=c.stats,hl=(v.role==='truck'?7.6:S.len)/2,hw=(v.role==='truck'?2.4:S.wid)/2,s=Math.abs(Math.sin(c.yaw)),k=Math.abs(Math.cos(c.yaw)),hx=s*hl+k*hw,hz=k*hl+s*hw;
  if(v.gone||a.CV)Object.assign(v.col,{x0:-1e4,z0:-1e4,x1:-1e4+1,z1:-1e4+1});else Object.assign(v.col,{x0:c.x-hx,x1:c.x+hx,z0:c.z-hz,z1:c.z+hz});
  if(v.role==='truck'){for(const w of o.userData.wheels||[])w.children[0]&&(w.rotation.x-=c.spd*dt/.5)}
  else{const VM=window.HT&&HT.Vehicles;if(o.userData.mod&&VM&&VM.update)try{VM.update(o,{speed:c.spd,steer:c.steer||0,braking:c.spd<1||v.braking,headlights:false,dt:dt||1/30})}catch(_){}}}
/* collide for convoy vehicles: the world, minus the convoy and parked cars (car contact is handled below, with damage) */
function convoyCollide(M){const a=A(),L=a.L;return(p,r)=>{const saved=[];const off=c=>{if(!c)return;saved.push([c,c.x0,c.z0,c.x1,c.z1]);c.x0=c.z0=-1e4;c.x1=c.z1=-1e4+1};
    for(const v of M.conv)off(v.col);for(const e of L.cars||[])off(e.col);off(res().pickCol);a.collide(p,r);for(const[c,x0,z0,x1,z1]of saved){c.x0=x0;c.z0=z0;c.x1=x1;c.z1=z1}}}
function speedCap(M){return(x,z,c)=>{const v=M.conv.find(q=>q.c===c);if(!v)return null;let cap=Infinity;const pl=M.frozen||M.plan,f=fwd(c.yaw),front=v.len/2;
  /* cones: 6 m/s through any stretch with a prop within 9 m ahead in the car's track */
  for(const p of res().props.list){if(p.state==='flying')continue;const dx=p.x-x,dz=p.z-z,al=dx*f[0]+dz*f[1],lat=Math.abs(dx*-f[1]+dz*f[0]);if(al>-front&&al<front+9&&lat<2.6){cap=Math.min(cap,K.coneCap);break}}
  /* out of the storage gate and round the corner at walking pace (a long truck, a tight gate) */
  if(x>205.6&&z>143)cap=Math.min(cap,v.role==='truck'?3.6:4.5);
  /* the decisive line: brake to stop 10 m short */
  if(pl&&pl.first&&M.ph==='convoy'&&z>pl.first.z1){const d=z-front-(pl.first.z1+K.stopShort);cap=Math.min(cap,Math.sqrt(Math.max(0,2*c.stats.brake*.55*d)))}
  else if(pl&&M.ph==='convoy')for(const g of pl.groups){const d=z-front-g.z1;if(d>0&&d<22)cap=Math.min(cap,g.verdict==='gap'?K.gapCap:K.approachCap)}
  /* keep station behind the vehicle ahead */
  const i=M.conv.indexOf(v);if(i>0){const u=M.conv[i-1];if(!u.gone){const gap=Math.hypot(u.c.x-x,u.c.z-z)-(u.len+v.len)/2;cap=Math.min(cap,Math.max(0,Math.sqrt(Math.max(0,2*c.stats.brake*.5*(gap-4)))+(gap>9?u.c.spd:0)))}}
  /* a car parked on the road ahead (a chase block): stop behind it. Measured along the vehicle's own route, 32 m ahead */
  if(M.ph==='chase'&&v.role==='truck'&&c.ai&&c.ai.pts){v.blockedBy=null;const pts=c.ai.pts,i0=(c.ai.tr&&c.ai.tr.i)||0;
    for(const e of A().L.cars||[]){if(!e.obj||e===A().CV)continue;if(Math.hypot(e.pos.x-x,e.pos.z-z)>front+34)continue;
      let along=0,px=x,pz=z,hit=null;for(let k=i0+1;k<pts.length&&along<front+32;k++){const B=pts[k],dx=B.x-px,dz=B.z-pz,L=Math.hypot(dx,dz)||1e-3,t=Math.max(0,Math.min(1,((e.pos.x-px)*dx+(e.pos.z-pz)*dz)/(L*L))),qx=px+dx*t,qz=pz+dz*t;
        if(Math.hypot(e.pos.x-qx,e.pos.z-qz)<2.4){hit=along+t*L;break}along+=L;px=B.x;pz=B.z}
      if(hit!=null&&hit>0){cap=Math.min(cap,Math.sqrt(Math.max(0,2*c.stats.brake*.55*(hit-front-3.2))));v.blockedBy=e}}}
  return cap===Infinity?null:cap}}
function vehicles(M,dt){const a=A(),CA=a.CarAI();if(!M.conv.length||!CA)return;const coll=convoyCollide(M),cap=speedCap(M),S=res().props;
  for(const v of M.conv){if(v.gone)continue;const c=v.c;const hp0=c.hp;
    if(v.st==='go'||v.st==='flee'){/* wedged on a kerb or a post with nowhere it means to stop: slide through the world for a moment */
      const want=v.st==='go'?cap(c.x,c.z,c):null,pg=v.pg||(v.pg={x:c.x,z:c.z,t:0});if(Math.hypot(c.x-pg.x,c.z-pg.z)>1.5||want!=null&&want<2){pg.x=c.x;pg.z=c.z;pg.t=0}else pg.t+=dt;
      if(pg.t>3){v.ghostT=2;pg.t=0;c.revT=0;c.spinT=0}if(v.ghostT>0)v.ghostT-=dt;
      CA.step(c,dt,v.st==='go'?{collide:v.ghostT>0?null:coll,speedCap:cap}:{collide:v.ghostT>0?null:coll})}
    else if(v.st==='parked'){c.spd=0}
    /* props: knocked flying; sawhorses cost speed */
    if(Math.abs(c.spd)>.5){const f=fwd(c.yaw),r=S.hit(CA.circles(c).map(q=>({x:q.x,z:q.z,r:q.r+.05})),f[0]*c.spd,f[1]*c.spd,Math.abs(c.spd),v.role);if(r.slow)c.spd*=1-r.slow}
    contactCars(M,v);
    if(a.CV&&a.CV.car)ramPlayer(M,v);
    syncV(v,dt)}
  /* the escorts peel off after the truck is through, and vanish once they're well away */
  for(const v of M.conv)if(v.st==='flee'&&!v.gone){const d=Math.hypot(v.c.x-a.P.pos.x,v.c.z-a.P.pos.z);if(v.c.x<40||v.c.x>300||(d>70&&!onScreen(v.c.x,v.c.z))){v.gone=true;v.obj.visible=false;syncV(v,0)}}}
function onScreen(x,z){try{const p=A().project(x,1,z);return!p.behind&&p.x>-60&&p.x<innerWidth+60&&p.y>-60&&p.y<innerHeight+60}catch(_){return false}}
/* a convoy vehicle touching a parked car shoves it out of the way (and the owner will hear about it) */
function contactCars(M,v){const a=A(),CA=a.CarAI(),c=v.c;if(Math.abs(c.spd)<.3)return;const circ=v.role==='truck'?[0,1,2,-1,-2].map(k=>{const f=fwd(c.yaw);return{x:c.x+f[0]*k*1.6,z:c.z+f[1]*k*1.6,r:1.25}}):CA.circles(c);
  for(const e of a.L.cars||[]){if(!e.obj||e===a.CV||e.convoy)continue;if(Math.hypot(e.pos.x-c.x,e.pos.z-c.z)>9)continue;const S=a.carSize(e),f=fwd(e.yaw),o=S.l/4,ec=[{x:e.pos.x+f[0]*o,z:e.pos.z+f[1]*o,r:S.w/2+.05},{x:e.pos.x-f[0]*o,z:e.pos.z-f[1]*o,r:S.w/2+.05}];
    let best=null;for(const p of circ)for(const q of ec){const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz),pen=p.r+q.r-d;if(pen>0&&(!best||pen>best.pen))best={pen,nx:d?dx/d:1,nz:d?dz/d:0}}
    if(!best)continue;const sp=Math.abs(c.spd);
    /* shove: mostly sideways, a twist, the convoy loses speed */
    const cf=fwd(c.yaw),lat=best.nx*-cf[1]+best.nz*cf[0],sx=-cf[1]*Math.sign(lat||1),sz=cf[0]*Math.sign(lat||1),k=best.pen*1.1+.04;
    e.pos.x+=(best.nx*.4+sx*.9)*k;e.pos.z+=(best.nz*.4+sz*.9)*k;e.yaw+=Math.sign(lat||1)*k*.18;a.syncCar(e);c.spd*=v.role==='truck'?.985:.97;
    if(sp>2&&(e.bumpT||0)<=0){e.bumpT=.5;const dmg=Math.min(K.shoveDmg,sp*2.6);try{a.carDamage(e,dmg,'convoy')}catch(_){}thunk('sawhorse',sp);
      if(e.lot!=null&&!M.carsHurt[e.lot]){M.carsHurt[e.lot]=1;setT(M,1.2,()=>say(M,[[LOT[e.lot].name,LOT[e.lot].hurt]],true))}else if(e===a.VAN&&once(M,'vanShove'))say(M,[['gary',"They shoved the VAN. The van has done nothing to anybody."]],true)}}
  for(const e of a.L.cars||[])if(e.bumpT>0)e.bumpT-=1/60}
function ramPlayer(M,v){const a=A(),CA=a.CarAI(),e=a.CV,c=v.c;if(Math.hypot(e.pos.x-c.x,e.pos.z-c.z)>9)return;
  const sh={x:e.pos.x,z:e.pos.z,yaw:e.yaw,spd:e.car.spd,hp:e.car.hp,stats:Object.assign({},e.car.stats,{mass:e.car.stats.mass||1,ramMult:e.car.stats.ramMult||1,ramDealtFront:1,impactTakenFront:1})};
  const r=CA.ram(sh,c);if(!r)return;if(v.role==='truck')c.spinT=0;
  e.pos.x=e.car.x=sh.x;e.pos.z=e.car.z=sh.z;e.car.spd=e.spd=sh.spd;e.car.hp=sh.hp;a.syncCar(e);
  if(r.vn>3&&(M.ramT||0)<=0){M.ramT=.4;thunk('sawhorse',r.vn);if(v.role==='truck'&&M.ph==='chase'){M.rams=(M.rams||0)+1;if(M.rams<=3)say(M,[['earl',L_.chaseRam[M.rams-1]]],true)}}}
function carWatch(M){if(M.ramT>0)M.ramT-=1/60}

/* ---- the convoy rolls: re-read the roadblock until the lead is close, then commit ---- */
function convoyTick(M,dt,F){const a=A(),CA=a.CarAI(),lead=M.conv[0],truck=M.truck;
  if(!M.frozen){M.planT-=dt;if(M.planT<=0){M.planT=.25;const pl=readBlock(items(M));M.plan=pl;M.rankBest=Math.max(M.rankBest||0,pl.rank);const s=sig(pl);
      if(s!==M.planSig){M.planSig=s;for(const v of M.conv)if(v.c.z>ZONE.z0&&v.c.x<207.5&&v.c.z<145)CA.follow(v.c,pathPts(M,{x:v.c.x,z:v.c.z},pl,v.role!=='truck'),{speed:v.role==='truck'?K.truckMax:K.cruise,turnSpeed:K.corner});drawPlan(M)}}
    const g=M.plan.first||M.plan.groups[0];if(g&&lead.c.z-g.z1<K.freezeD&&lead.c.x<208){M.frozen=M.plan;commit(M)}else if(!g&&lead.c.x<208&&lead.c.z<ZONE.z1){M.frozen=M.plan;commit(M)}}
  F.objs.push(['The convoy is coming up Industrial Way',false]);
  F.meters.push(meter(M.frozen||M.plan));F.target={x:truck.c.x,z:truck.c.z,label:'Box truck'};
  /* stopped at the wall: everyone out */
  if(M.frozen&&M.frozen.first){const g=M.frozen.first;if(M.conv.every(v=>Math.abs(v.c.spd)<.35)&&lead.c.z<g.z1+K.stopShort+8)return startStandoff(M)}
  /* through: the truck past the last line */
  if(M.frozen&&!M.frozen.first){const last=M.frozen.groups.reduce((m,g)=>Math.min(m,g.z0),ZONE.z0+6);if(truck.c.z<last-8)return startChase(M)}
}
function commit(M){const pl=M.frozen,a=A();const v=pl.first?pl.first.verdict:pl.top?pl.top.verdict:'clear';M.branch=pl.first?'stop':'chase';
  const key=v==='airtight'?'stop':v;say(M,L_.convoy[key]||L_.convoy.clear,true);if(v==='airtight')M.airtight=true;
  M.conv.forEach(q=>q.braking=!!pl.first);music(pl.first?'tension':'combat',1)}

/* ---------------- stopped: the escorts get out ---------------- */
function startStandoff(M){const a=A();M.ph='standoff';drawPlan(M);crewBack(M);M.stoppedCold=true;
  for(const v of M.conv){v.st='parked';v.c.spd=0}
  a.wmSetWindow(a.wmWindow(M.conv[0].c.x,M.conv[0].c.z+6,22));
  M.esc=[];const peace=!!M.airtight&&M.shots===0;M.peace=peace;
  for(const v of[M.conv[0],M.conv[2]]){const c=v.c,r=rgt(c.yaw),f=fwd(c.yaw);for(const s of[-1,1]){const x=c.x+r[0]*s*1.9+f[0]*.4,z=c.z+r[1]*s*1.9+f[1]*.4,q=a.wmSnap(x,z);
      const e=a.spawnEnemy(q.x,q.z,false);e.gun='pistol';a.equip(e.dude,'pistol');e.noLeash=true;e.home={x:q.x,z:q.z};e.yaw=c.yaw;if(e.tag)e.tag.textContent='ESCORT';e.escort=true;
      if(peace){e.peace=true;e.script={kind:'post'};const k=a.enemies.indexOf(e);if(k>=0)a.enemies.splice(k,1)}else{e.loud=1}M.esc.push(e)}}
  a.rebuildTargets();
  if(peace){say(M,L_.air,true);a.feed('Airtight. Walk up. Keep the gun down.','good')}else{say(M,L_.fight,true);music('combat',1)}}
function breakPeace(M,shot){const a=A();if(!M.peace)return;M.peace=false;M.airtight=false;for(const e of M.esc){if(e.state!=='idle')continue;e.peace=false;e.script=null;if(!a.enemies.includes(e))a.enemies.push(e);e.loud=1}a.rebuildTargets();say(M,L_.airShot,true);music('combat',1)}
function standoffTick(M,dt,F){const a=A(),P=a.P;
  if(M.peace){for(const e of M.esc){if(e.state!=='idle')continue;const d=e.dude;d.root.position.set(e.pos.x,0,e.pos.z);faceTo(d,P.pos.x,P.pos.z,dt);posePerson(d,dt,{moving:false,aim:false,mode:'stand'})}
    M.standT=(M.standT||0)+dt;const near=M.standT>8&&M.esc.some(e=>Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z)<K.surrR);
    if(near){M.peace=false;for(const e of M.esc){e.peace=false;e.script=null;if(!a.enemies.includes(e))a.enemies.push(e);a.surrender(e)}say(M,L_.airGive);a.rebuildTargets();
      if(!M.replay)a.addTrust(K.airTrust,'river');a.feed('Nobody fought a wall','trust','+'+K.airTrust+' Riverside trust');music('tension',.2)}
    F.objs.push(['Walk up to the escorts. Keep the gun down.',false]);F.target={x:M.esc[0].pos.x,z:M.esc[0].pos.z,label:'Escorts'};return}
  const left=M.esc.filter(e=>e.state==='idle'||e.state==='surrender').length;
  F.objs.push(['Escorts · '+M.esc.filter(e=>e.state==='cuffed'||e.state==='dead').length+'/'+M.esc.length+' dealt with',left===0]);
  const sur=M.esc.find(e=>e.state==='surrender');if(sur)F.target={x:sur.pos.x,z:sur.pos.z,label:'Zip-tie'};
  if(left===0)startDriver(M)}

/* ---------------- not stopped: the escorts bail, the truck runs ---------------- */
function startChase(M){const a=A(),CA=a.CarAI();M.ph='chase';drawPlan(M);crewBack(M);M.chaseT=0;M.branch='chase';
  for(const v of[M.conv[0],M.conv[2]]){v.st='flee';if(v.c.x>195)CA.follow(v.c,pathPts(M,{x:v.c.x,z:v.c.z},null,true),{speed:K.escortFlee,turnSpeed:7})}
  /* loaded and top-heavy: the truck is quick off the line but tops out at 9.5 m/s in town */
  const t=M.truck;t.st='go';t.c.stats=Object.assign({},t.c.stats,{maxSpeed:K.chaseMax,accel:2.6});CA.follow(t.c,pathPts(M,{x:t.c.x,z:t.c.z},null),{speed:K.chaseMax,turnSpeed:K.corner});
  say(M,L_.bail,true);music('combat',1);a.wmSetWindow(a.wmWindow(120,22,40))}
function chaseTick(M,dt,F){const a=A(),t=M.truck,c=t.c;M.chaseT+=dt;
  const toGo=Math.max(0,c.x-K.escapeX);F.objs.push(['Stop the box truck before the highway',false]);F.target={x:c.x,z:c.z,label:'Box truck'};
  F.meters.push({id:'cz-truck',label:'Truck',style:'bar',v:Math.max(0,c.hp),max:K.truckHp,warn:K.truckHp*.3,warnBelow:true,sub:'ram it, box it, block it'});
  F.meters.push({id:'cz-hwy',label:'Highway',style:'bar',v:Math.max(0,200-Math.min(200,toGo)),max:200,warn:150,sub:Math.round(toGo)+' m to go'});
  /* the crew shoot the tyres from whatever you're driving */
  const e=a.CV;if(e&&e.car){const n=a.allies.filter(q=>q.ride&&!q.down).length;const d=Math.hypot(e.pos.x-c.x,e.pos.z-c.z);if(n&&d<30&&c.hp>0){c.hp=Math.max(0,c.hp-Math.min(3,n)*3*dt);if(once(M,'tyres'))say(M,[['gary','Aim for the tyres!'],['dave','Which ones?'],['gary','The round ones!']])}}
  if(c.hp<=0){t.st='parked';c.spd=Math.max(0,c.spd-8*dt)}
  /* boxed or blocked */
  const vd=e?Math.hypot(e.pos.x-c.x,e.pos.z-c.z):1e9;if(Math.abs(c.spd)<1&&vd<8)M.boxT+=dt;else M.boxT=Math.max(0,M.boxT-dt);
  if(Math.abs(c.spd)<.5&&t.blockedBy)M.blockT+=dt;else M.blockT=0;
  if(c.hp<=0&&c.spd<.3||M.boxT>K.boxT||M.blockT>K.blockT){t.st='parked';c.spd=0;a.banner('STOPPED',c.hp<=0?'Steam, a flat and a very bad Thursday.':'Boxed in. Nowhere to go.',2.2);a.wmSetWindow(a.wmWindow(c.x,c.z,16));say(M,L_.stopped,true);music('tension',.3);return startDriver(M)}
  if(c.x<K.escapeX)return a.endMission(false,L_.escape,'Gone')}

/* ---------------- the driver, the truck, the goat ---------------- */
function cabDoor(M){const c=M.truck.c,f=fwd(c.yaw),r=rgt(c.yaw);return{x:c.x+f[0]*2.4-r[0]*1.9,z:c.z+f[1]*2.4-r[1]*1.9}}
function rearDoor(M){const c=M.truck.c,f=fwd(c.yaw);return{x:c.x-f[0]*4.9,z:c.z-f[1]*4.9}}
function startDriver(M){M.ph='driver'}
function driverTick(M,dt,F){const a=A(),P=a.P,d=cabDoor(M);
  if(!M.driver){F.objs.push(["Go knock on the truck driver's door",false]);F.target={x:d.x,z:d.z,label:'Driver'};
    if(!a.CV&&Math.hypot(P.pos.x-d.x,P.pos.z-d.z)<2.8){const q=a.wmSnap(d.x,d.z),e=a.spawnEnemy(q.x,q.z,false);a.equip(e.dude,null);e.gun=null;e.noLeash=true;e.driver=true;M.driver=e;a.surrender(e);if(e.tag)e.tag.textContent='TRUCK DRIVER · zip-tie';say(M,L_.driver,true);a.rebuildTargets()}
    return}
  const e=M.driver;if(e.state==='surrender'){F.objs.push(['Zip-tie the driver',false]);F.target={x:e.pos.x,z:e.pos.z,label:'Zip-tie'};return}
  M.ph='open';a.CP&&0}
function openTick(M,dt,F){const a=A(),r=rearDoor(M),tr=M.truck.obj;
  if(M.opened<1){F.objs.push(['Open the back of the truck',false]);F.target={x:r.x,z:r.z,label:'Roll-up door'};
    if(M.opening){M.opened=Math.min(1,M.opened+dt*.9);doorSet(tr,M.opened);if(M.opened>=1)afterOpen(M)}
    else F.holds.push({x:r.x,z:r.z,r:2.2,o:M,txt:'Roll up the door',time:.8,fn:()=>{M.opening=true;tone({f:180,to:420,type:'sawtooth',d:.9,gain:.05})}});
    if(!M.goatG){/* Pepper is inside */const g=goatModel();a.wmAdd(g);M.goatG=g;M.goatSt='truck'}placeGoatInTruck(M);return}
  M.ph='wrap'}
function placeGoatInTruck(M){const c=M.truck.c,f=fwd(c.yaw),g=M.goatG;g.position.set(c.x-f[0]*2.9,1.11+A().groundAt(c.x,c.z),c.z-f[1]*2.9);g.rotation.y=c.yaw+Math.PI}
function afterOpen(M){const a=A();say(M,L_.open,true);setT(M,8,()=>say(M,L_.manifest));bleat();
  for(const n of['Pam','Hal','Phil','Bev'])0;a.feed('Stolen goods recovered','good','20 converters · a crate of packages · a goat');M.manifest=true}
function goatTick(M,dt,F){const a=A(),P=a.P,g=M.goatG;if(!g)return;
  if(M.goatSt==='truck'){if(M.ph==='wrap'){placeGoatInTruck(M);const r=rearDoor(M);F.taps.push({x:r.x,z:r.z,r:2.6,txt:'Take Pepper home (Mrs. Lindqvist, '+ASH+')',fn:()=>{M.goatSt='follow';g.position.set(r.x,0,r.z);say(M,L_.goatTake,true)}})}return}
  if(M.goatSt==='follow'){const inCar=!!a.CV;g.visible=!inCar;const tgt=inCar?{x:a.CV.pos.x,z:a.CV.pos.z}:{x:P.pos.x+Math.sin(P.yaw)*1.6,z:P.pos.z+Math.cos(P.yaw)*1.6};
    if(inCar){g.position.set(tgt.x,0,tgt.z)}else{const dx=tgt.x-g.position.x,dz=tgt.z-g.position.z,d=Math.hypot(dx,dz);if(d>12){g.position.set(tgt.x,0,tgt.z)}else if(d>.6){const s=Math.min(d,Math.min(7,1.5+d*1.6)*dt);g.position.x+=dx/d*s;g.position.z+=dz/d*s;g.rotation.y=Math.atan2(-dx,-dz)+Math.PI;
        g.position.y=Math.abs(Math.sin(M.elapsed*14))*.05}else g.position.y=0}
    if(M.goatG.userData.head)M.goatG.userData.head.rotation.x=Math.sin(M.elapsed*3)*.15;
    if(!M.lind){M.lind=person('neighbour',{shirt:'#b07aa1',pants:'#4a4a4a',hair:'#e8e8e8'},LINDQVIST.x,LINDQVIST.z,Math.PI,{variant:'nb_gran'})}
    F.objs.push(['Walk Pepper to Mrs. Lindqvist on '+ASH+' (+$'+K.goat+')',false]);if(!F.target)F.target={x:LINDQVIST.x,z:LINDQVIST.z,label:'Mrs. Lindqvist'};
    if(Math.hypot(EARL.x-P.pos.x,EARL.z-P.pos.z)<2.2)F.taps.push({x:EARL.x,z:EARL.z,r:2.2,txt:'Leave Pepper with Earl',fn:()=>{M.goatSt='earl';say(M,L_.goatEarl,true);g.position.set(EARL.x+1,0,EARL.z+.6)}});
    if(!a.CV&&Math.hypot(g.position.x-LINDQVIST.x,g.position.z-LINDQVIST.z)<3.2){M.goatSt='home';M.goatPaid=true;say(M,L_.goatHome,true);a.feed('Pepper is home','trust','+$'+K.goat);g.position.set(LINDQVIST.x+.9,0,LINDQVIST.z+.4)}}
  if(M.lind){const d=M.lind;faceTo(d,g.position.x,g.position.z,dt);posePerson(d,dt)}}
function wrapTick(M,dt,F){const a=A(),P=a.P,S=res().props;
  if(once(M,'conesLine'))setT(M,M.manifest?12:4,()=>say(M,L_.cones));
  const onRoad=S.list.filter(p=>p.x>ZONE.xl-3&&p.x<ZONE.xr+3&&p.z>ZONE.z0-30&&p.z<ZONE.z1+12);M.left=onRoad.length;
  if(!a.CV){const near=S.near(P.pos.x,P.pos.z,1.6,p=>p.state!=='flying');if(near)F.holds.push({x:near.x,z:near.z,r:1.6,o:near,txt:'Pick up the '+PR().KINDS[near.kind].label+' ('+onRoad.length+' left)',time:.3,fn:()=>{S.remove(near);M.stock[near.kind]=(M.stock[near.kind]||0)+1;blip(true);if(onRoad.length===1)say(M,L_.tidy,true)}})}
  F.objs.push(['Pick up your cones · '+onRoad.length+' left',onRoad.length===0]);
  if(onRoad.length&&!F.target){let b=null,bd=1e9;for(const p of onRoad){const d=Math.hypot(p.x-P.pos.x,p.z-P.pos.z);if(d<bd){bd=d;b=p}}if(b&&bd>3&&M.goatSt!=='follow')F.target={x:b.x,z:b.z,label:'Cone'}}
  const back=M.lot.filter(e=>Math.hypot(e.pos.x-e.home.x,e.pos.z-e.home.z)>6);if(back.length)F.objs.push(["Return "+back.map(e=>e.name+"'s "+LOT[e.lot].label).join(', ')+" to Sal's lot (optional)",false]);
  /* Pepper rides along in whatever you drive, so the job only ends once she's home (or with Earl) */
  M.exitOpen=M.goatSt!=='follow';
  M.def.endLine='Earl: Twenty converters back in twenty driveways. '+(M.goatSt==='home'?'A goat back in a yard. ':M.goatSt==='earl'?'A goat in my truck. Don\'t ask. ':'A goat still in a box truck. We\'ll talk about that. ')+(onRoad.length?'And '+onRoad.length+' of my cones still on Industrial Way. Pick up your cones.':'And not one cone on Industrial Way. Thursday.');
  if(M.goatSt==='truck')F.objs.push(['Pepper the goat needs a ride home (optional)',false])}
/* the cones and the borrowed cars are settled as the job ends (end() never runs on a replay) */
function settle(M){const a=A();if(M.settled)return;M.settled=true;
  if(M.left>0){say(M,L_.coneLeft,true);if(!M.replay)a.addTrust(K.coneTrust,'river');a.feed('Cones left on Industrial Way','bad',K.coneTrust+' trust')}
  for(const e of M.lot){const moved=Math.hypot(e.pos.x-e.home.x,e.pos.z-e.home.z)>.5||M.lotMoved&&M.lotMoved[e.lot];if(!moved&&!M.carsHurt[e.lot])continue;const fr=a.carFrac?a.carFrac(e):1;
    if(fr>=.9&&Math.hypot(e.pos.x-e.home.x,e.pos.z-e.home.z)<10){if(!M.replay)a.addTrust(K.carTrust,'river');a.radio(LOT[e.lot].name,LOT[e.lot].fine)}
    else if(fr<.9)a.radio(LOT[e.lot].name,LOT[e.lot].hurt)}}

/* ---------------- HUD: the result card shows this job's own numbers ---------------- */
function hookHud(){const a=A(),H=a.HUD;if(!H||!H.show||H.show.__cz)return;const orig=H.show;const wrapped=function(name,o,...rest){try{const M=a.M;if(name==='result'&&o&&M&&M.def&&M.def.id==='cones'&&M.state!=='go')o=card(M,o)}catch(e){console.warn('[cones] card',e)}return orig.call(this,name,o,...rest)};
  wrapped.__cz=true;wrapped.__orig=orig;H.show=wrapped}
function card(M,o){const keep=(o.stats||[]).filter(s=>/^(Time|Trust|Medal)$/.test(s[0]));const pl=M.lineBuilt;
  const built=pl?pl.groups.reduce((n,g)=>n+g.items.length,0):0;
  const st=[['Roadblock',pl?VLABEL[pl.verdict]:'—',pl&&pl.top?pl.top.why:''],
    ['Convoy',M.branch==='stop'?(M.airtight?'Gave up':'Stopped'):M.branch==='chase'?(M.state==='won'?'Chased down':'Got away'):'—',M.branch==='chase'&&M.rams?M.rams+' rams':M.knocked?M.knocked+' props knocked flying':''],
    ['Shots fired',M.shots||0,M.shots?'':'not one'],['Zip-tied',M.cuffs||0],
    ['Cones left',M.left||0,M.left?'Earl noticed':'clean road']];
  return Object.assign({},o,{stats:st.concat(keep)})}

/* ---------------- touch: Plan and Post crew ---------------- */
function touchButtons(M,on){const a=A();if(typeof document==='undefined')return;const touch=window.matchMedia&&matchMedia('(pointer:coarse)').matches;M.touch=touch;
  listen(document,'pointerdown',planClick,true);
  const tab=e=>{const k=e.key&&e.key.toLowerCase();if(k!=='tab')return;const M_=a.M;if(!M_||M_.state!=='go'||M_.def.id!=='cones'||M_.ph!=='build')return;if(document.querySelector('.card:not([hidden])'))return;planToggle(M_)};listen(window,'keydown',tab);
  if(!touch)return;const outer=document.createElement('div');outer.style.cssText='position:absolute;inset:0;pointer-events:none';const el=document.createElement('div');outer.appendChild(el);el.style.cssText='position:absolute;right:16px;bottom:200px;display:flex;flex-direction:column;gap:10px;pointer-events:none';
  const b=(txt,fn)=>{const x=document.createElement('button');x.className='cz-btn';x.textContent=txt;x.style.cssText='pointer-events:auto;font:600 15px system-ui;padding:12px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.35);background:rgba(16,20,26,.62);color:#fff;backdrop-filter:blur(4px)';
    x.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();fn()});el.appendChild(x);return x};
  b('Plan view',()=>{const M_=a.M;if(M_&&M_.ph==='build')planToggle(M_)});b('Post crew',()=>{const M_=a.M;if(M_&&(M_.ph==='build'||M_.ph==='convoy'))postCrew(M_)});
  M.tEl=el;a.overlay('cz-touch',outer);res().ov['cz-touch']=1}

/* free everything once the job is over (any ending). 'pose' runs every frame, headless too. */
J.on('pose',()=>{if(!RES)return;const a=A(),M=a&&a.M;if(!M||!M.def||M.def.id!=='cones'||M.state!=='go'){const R=RES;
  if(R.props&&a&&a.P&&a.P.carry&&a.P.carry.kind&&String(a.P.carry.kind).startsWith('cz:'))try{a.wmDrop()}catch(_){}
  try{if(a&&a.HUD&&a.HUD.show&&a.HUD.show.__cz&&(!M||M.state==='go'||!M.def||M.def.id!=='cones')){/* keep the wrapper until the card is up */}}catch(_){}
  freeAll()}});

/* ================================================================ the scripted player (dev/jobs-check.js) ================================================================
   Normal run: two lot cars and the van... no: two lot cars wall to wall, a sawhorse in the last metre, both flares lit at the wall, the sign
   upstream, Dave posted with the paddle, a cone taper; ready early; walk up (no shots); zip-ties; the driver; the door; Pepper to Ash St;
   every cone picked up; back to the van. Fail run (opts.fail): build nothing, watch the truck leave. Retry from 'convoy' (empty road):
   the chase branch, blocked by the van parked across Route 9. */
function bot(a,t,o){o=o||{};const M=a.M;if(!M||M.state!=='go'||!M.ph)return null;const P=a.P,k=a.keys,B=M.bot||(M.bot={i:0,w:0,t:0});
  const tp=(x,z)=>{P.pos.set(x,0,z);a.collide(P.pos,.35)};const S=res().props;B.t++;
  /* o.human: walk there at a jog (5.2 m/s) instead of teleporting; a car trip waits as long as the drive would take */
  const at=(x,z,r)=>{if(!o.human){tp(x,z);return true}const d=Math.hypot(x-P.pos.x,z-P.pos.z);if(B.arr&&Math.hypot(B.arr.x-x,B.arr.z-z)<.05||d<(r||.35)+.2){B.arr=null;return true}B.arr={x,z};
    /* human-ish: the time a jog there takes (5.2 m/s), then arrive */B.w=Math.round(d/5.2*60);P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z));tp(x,z);return false};
  const H=o.human?2:1,off=()=>{for(const x of['w','a','s','d','e','g'])k[x]=false};
  if(B.w>0){B.w--;return null}const pace=n=>{B.w=n*H};
  if(M.ph==='build'){if(o.fail||M.retried){if(a.CV)a.exitCar();if(!B.ready){if(!at(EARL.x+.6,EARL.z))return null;k.e=true;if(M.clock<=3.5){k.e=false;B.ready=1}}return null}
    if(a.CV&&!B.driving){a.exitCar();return null}
    const plan=B.plan||(B.plan=planSteps());const s=plan[B.i];if(!s){if(!B.ready){if(!at(EARL.x+.6,EARL.z)){k.e=false;return null}k.e=true;if(M.clock<=3.5){k.e=false;B.ready=1}}return null}
    k.e=false;
    if(s.car!=null){const e=M.lot[s.car];if(!e){B.i++;return null}if(a.CV!==e){if(a.CV)a.exitCar();if(!at(e.pos.x+2.4,e.pos.z,1))return null;tp(e.pos.x+2.4,e.pos.z);a.enterCar(e);B.driving=1;pace(o.human?150:20);return null}
      e.pos.set(s.x,0,s.z);e.yaw=s.yaw;if(e.car){e.car.x=s.x;e.car.z=s.z;e.car.yaw=s.yaw;e.car.spd=0}a.syncCar(e);a.exitCar();B.driving=0;B.i++;pace(30);return null}
    if(s.post){if(!at(s.x,s.z+2.6))return null;P.yaw=0;k.g=true;B.i++;B.gUp=1;pace(4);return null}
    if(B.gUp){k.g=false;B.gUp=0}
    const c=P.carry;if(!c){const p=PILE[s.k];if(!at(p.x+.3,p.z+.3))return null;k.e=true;B.hold=(B.hold||0)+1;if(B.hold>40){B.hold=0;k.e=false}return null}
    B.hold=0;k.e=false;if(!at(s.x,s.z+1.7))return null;P.yaw=0;a.useTap=true;B.i++;pace(14);return null}
  if(M.ph==='convoy'){off();if(a.CV&&!M.retried&&!o.fail)a.exitCar();if(!a.CV)at(EARL.x+1,EARL.z+1.5);return null}
  if(M.ph==='standoff'){off();const sur=M.esc.find(e=>e.state==='surrender');if(sur){if(!at(sur.pos.x+.9,sur.pos.z))return null;a.useTap=true;pace(8);return null}
    if(M.peace){const e=M.esc[0];at(e.pos.x,e.pos.z-9);P.yaw=Math.PI;return null}
    /* a fight: the bot fires at whoever is up (the crew help) */
    const e=M.esc.find(e=>e.state==='idle');if(e){tp(e.pos.x+3,e.pos.z+3);if(B.t%20===0)a.hurtEnemy(e,40,'player');return null}return null}
  if(M.ph==='chase'){off();const c=M.truck.c;if(o.fail)return null;
    const V=a.VAN;if(!B.blocked){if(a.CV!==V){if(a.CV)a.exitCar();tp(V.pos.x+2.5,V.pos.z);a.enterCar(V);pace(10);return null}
      /* park the van across Route 9 well ahead of the truck */const x=Math.min(c.x-40,150);V.pos.set(x,0,42.6);V.yaw=0;if(V.car){V.car.x=x;V.car.z=42.6;V.car.yaw=0;V.car.spd=0}a.syncCar(V);a.exitCar();B.blocked=1;pace(10);return null}
    return null}
  if(M.ph==='driver'){off();if(a.CV){a.exitCar();return null}const e=M.driver;if(!e){const d=cabDoor(M);at(d.x,d.z);return null}if(e.state==='surrender'){if(!at(e.pos.x+.9,e.pos.z))return null;a.useTap=true;pace(6)}return null}
  if(M.ph==='open'){off();const r=rearDoor(M);if(!at(r.x,r.z))return null;k.e=true;return null}
  if(M.ph==='wrap'){off();
    if(M.goatSt==='truck'&&!o.skipGoat){const r=rearDoor(M);if(!at(r.x,r.z))return null;pace(o.human?60:0);a.useTap=true;pace(6);return null}
    if(M.goatSt==='follow'){if(o.human&&!B.goatT){B.goatT=1;pace(240);return null}/* the drive over the bridge */tp(LINDQVIST.x+2,LINDQVIST.z+1.5);if(M.goatG)M.goatG.position.set(LINDQVIST.x+1.5,0,LINDQVIST.z+1);pace(4);return null}
    if(o.human&&M.goatSt==='home'&&!B.back){B.back=1;tp(203,96);pace(200);return null}
    const p=S.list.find(p=>p.state!=='flying');if(p){if(!at(p.x+.4,p.z+.4))return null;k.e=true;B.hold=(B.hold||0)+1;if(B.hold>30){B.hold=0;k.e=false;S.remove(p)}return null}
    k.e=false;const car=M.car||a.VAN;if(!a.CV){if(!at(car.pos.x+2.6,car.pos.z,1.2))return null;a.useTap=true;pace(20)}return null}
  return null}
/* the airtight wall at z 104: Pam's Dowager and Hal's hatchback nose to tail across the road, a sawhorse in the gap by the fence,
   flares lit in front, Dave with the paddle on the verge, the sign 22 m upstream, a cone taper leading in */
function planSteps(){const W=104;return[
  {car:0,x:198.6,z:W,yaw:Math.PI/2},{car:1,x:203.4,z:W,yaw:Math.PI/2},
  {k:'sawhorse',x:206.6,z:W},{k:'flare',x:201,z:W+3},{k:'flare',x:204,z:W+3},
  {k:'sign',x:203,z:W+30},{post:1,x:196,z:W+1.5},
  {k:'cone',x:206,z:W+24},{k:'cone',x:206,z:W+24},{k:'cone',x:205.5,z:W+21},{k:'cone',x:205,z:W+18},{k:'cone',x:200,z:W+24},{k:'cone',x:200.5,z:W+21},{k:'cone',x:201,z:W+18},{k:'cone',x:200,z:W+24}]}
})();
