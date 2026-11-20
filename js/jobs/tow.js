/* =====================================================================
   HITCH HAPPENS (SPEC3 2.3): repo with a tow hitch. Sal's strand 1/2. The first user of HT.Tow (js/tow.js, loaded from here).
   A "towing company" with no licence (Quik-Hook Towing & "Impound") has been hooking Riverside cars on street-sweeping day and
   asking $400 cash to give them back. Sal bolts his loaner hitch rig onto your ride. Five cars sit booted in a chain-link pen at
   the river end of Dock St. Talk (or push) past the three "attendants", then back up to each car's front bumper, hitch it, and tow
   it across Riverside to its owner's curb. A scratched car is a less grateful owner. After car 2 the Quik-Hook truck starts
   tailing you and tries to unhook the car you're towing whenever you stop: brake-check him, or get out and zip-tie him.
   He turns out to be a laid-off tow driver; Sal offers him a job. Optional: tow his truck back to Dad's Auto ("Evidence. And a
   nice truck."). Then drive back to Sal before street sweeping ends (12 min).

   Stages ([CP]): lot (Sal's, the drive, the gate) -> car1 .. car5 (one per tow) -> sal (back to Dad's Auto).
   Fail: your ride breaks down; three owners' cars wrecked; street sweeping ends before the fifth car is home.
   Files: js/jobs/tow.js, js/tow.js (HT.Tow), js/carai.js (towMul in drive, the hitch catalog item). Tests: node dev/tow.test.js,
   node dev/jobs-check.js tow --retry --replay --shots, node dev/jobs/tow.js (human-paced, screenshots in docs/screenshots/jobs/tow/).
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api,H=()=>window.__ht||{};
/* the tow system rides along with this job (loaded once; later jobs reuse HT.Tow) */
(function(){const d=typeof document!=='undefined'?document:null;if(!d||!d.head)return;
  if(!(window.HT.Tow&&HT.Tow.S)&&!d.getElementById('ht-tow-js')){const s=d.createElement('script');s.id='ht-tow-js';s.src='js/tow.js';s.onload=()=>{try{HT.Tow.bind&&HT.Tow.bind()}catch(_){}};d.head.appendChild(s)}})();
const TW=()=>window.HT&&HT.Tow&&HT.Tow.S?HT.Tow:null;

/* ---------------- tuning ---------------- */
const K={sweep:720,goldT:540,talkR:3.2,dropR:3.4,dropYaw:32,ownerSee:85,pounceSlow:1.3,pounceD:20,unhook:4.5,tailGap:11,brakeDv:5.5,stall:9,
  stealSpd:10.5,fakeMax:15,carPay:80,clean:200,truck:250,talk:50,hire:3,wreckFail:3};
const D2R=Math.PI/180;
/* the lot: grass at the river end of Dock St, in line with River Rd; gate on the north side */
const LOT={x0:308.4,x1:319.3,z0:133,z1:158.2,g0:310.9,g1:318.9,desk:{x:309.6,z:131.3},ring:{x:322,z:127}};
const SLOTS=[{x:313.4,z:136.7},{x:317.1,z:136.7},{x:313.4,z:143.5},{x:317.1,z:143.5},{x:313.4,z:150.3}];/* front bumper points; cars face north */
const SAL={x:221,z:55},SAL_RING={x:232,z:52},SAL_BAY={x:224,z:51};
const OWNERS=[
  {id:'kim',name:'Mrs. Kim',who:'neighbour',v:0,type:'sedan',color:'#9db7cf',street:'Oak St',at:[340,16.5],
    hi:"That's my car! On a CHAIN!",good:[['Mrs. Kim',"My car! And it's been washed? Who washed it?"],['you',"Long story."]],
    ok:[['Mrs. Kim',"Oh, thank you! There's a little scrape. There's always a little scrape. Thank you."]],
    bad:[['Mrs. Kim',"Why does it make that noise now. It didn't make a noise before."],['you',"It's... settling in."]],
    wreck:[['Mrs. Kim',"Is it... supposed to be smoking?"],['you',"Tell Sal I sent you. He fixes anything."]]},
  {id:'hollis',name:'Mr. Hollis',who:'neighbour',v:3,type:'hatch',color:'#c79a2b',street:'4th St',at:[409.5,62],
    hi:"Is that a tow boom on a minivan? I love this neighbourhood.",good:[['Mr. Hollis',"Not a mark on her. Well. The marks she came with."]],
    ok:[['Mr. Hollis',"It's got a new dent."],['you',"It's got a new... character."]],
    bad:[['Mr. Hollis',"The mirror's pointing at the sky. Why is the mirror pointing at the sky."]],
    wreck:[['Mr. Hollis',"That's not my car. That's a modern art piece about my car."]]},
  {id:'rosa',name:'Rosa',who:'rosa',type:'sedan',color:'#3d7550',street:'Ash St, by the garden',at:[400,72.5],
    hi:"Careful with her, she pulls left!",good:[['rosa',"You brought her back, and the seed trays are still in the trunk. You're a good man."]],
    ok:[['rosa',"There's a hedge in my bumper. ...It's a nice hedge. Thank you."]],
    bad:[['rosa',"I'm a nurse. I know a sprain when I see one. This car has a sprain."]],
    wreck:[['rosa',"I'm going to put her in a sling and hope for the best."]]},
  {id:'benny',name:'Benny',who:'benny',type:'hatch',color:'#f0a8c4',street:'Oak St, by the depot',at:[428,16.5],
    hi:"Do NOT hit the mailbox, that's MY mailbox!",good:[['benny',"My car! Free cone. Free cone for life! ...For a month. A week. Free cone."]],
    ok:[['benny',"It's fine, it's fine! The dents match the truck now. It's a fleet look."]],
    bad:[['benny',"It's playing the ice cream song. Why is my car playing the ice cream song."]],
    wreck:[['benny',"I'll just drive the truck. Everywhere. Forever."]]},
  {id:'earl',name:'Earl',who:'earl',type:'sedan',color:'#6e2a26',street:'5th St',at:[441.5,110],
    hi:"Slow down for the speed bump, son. There's no speed bump. Slow down anyway.",good:[['earl',"Thirty-six years I drove a bus and never lost a vehicle. Thank you for keeping my record clean."]],
    ok:[['earl',"Bus drivers notice mirrors, son. That one's new."],['you',"It's the same mirror. It's just been through something."]],
    bad:[['earl',"I've seen buses come back from the zoo field trip in better shape."]],
    wreck:[['earl',"Well. She had a good run. Mostly a good run."]]}];
const GARY_COUNT=["That's one. Four hundred dollars nobody had to pay.","Two. Eight hundred. I'm keeping a running total.","Three. Twelve hundred. That's a lot of bus fare.","Four. Sixteen hundred. One more and I get to say my line."];
const TALK=[
  {speaker:'Manager',prompt:"This is a legal impound. Four hundred, cash, and you can have your car back.",tell:"[He taps a laminated sign that says LEGAL IMPOUND in three different fonts.]",
    options:[{text:"Where's your licence?",reg:'real',reply:[['Manager',"...In the other truck."],['Vest Guy',"We have a lot of trucks."]]},
      {text:"Do you take coupons?",reg:'joke',reply:[['Manager',"...What kind of coupons."],['Vest Guy',"Don't. He's doing a bit."]]},
      {text:"How about I impound YOU.",reg:'Bad cop',bad:true,reply:[['Manager',"Did he just threaten us? Kyle. He threatened us."]]}]},
  {speaker:'Manager',prompt:"We got a permit. Kyle, show him the permit.",tell:"[Kyle holds up a laminated sheet. It has pictures of food on it.]",
    options:[{text:"That's a takeout menu.",reg:'real',reply:[['Kyle',"...It's laminated."],['Manager',"It's LAMINATED, man."]]},
      {text:"Ooh. Do they do a lunch special?",reg:'joke',reply:[['Kyle',"Tuesdays. The sesame chicken is— wait."]]},
      {text:"Hand it over. Now.",reg:'Bad cop',bad:true,reply:[['Kyle',"Okay, that's aggressive. That's aggressive, right?"]]}]},
  {speaker:'Manager',prompt:"Look, man. We just work here. Sort of. It's a gig. There's an app.",tell:"[He's sweating through the vest.]",
    options:[{text:"Then clock out. Nobody has to get hurt, and nobody has to get towed.",reg:'real',reply:[['Manager',"...Is it lunch? It feels like lunch."],['Kyle',"It's 10:40."],['Manager',"It's LUNCH, Kyle."]]},
      {text:"Or I call Officer Dana and she checks the paperwork with you.",reg:'real',reply:[['Manager',"You know what? Gate's open. We're on break. Hands up, that's a break thing."]]},
      {text:"You've got five seconds.",reg:'Bad cop',bad:true,reply:[['Manager',"Five seconds to WHAT?"]]}]}];
const pick=a=>a[Math.floor(Math.random()*a.length)];
const fwd=y=>[-Math.sin(y),-Math.cos(y)],rgt=y=>[Math.cos(y),-Math.sin(y)],wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};

/* ---------------- props: chain-link, gate, the "office", boots, the drop zones ---------------- */
let TEX=null;
function tex(){if(TEX)return TEX;const T3=A().THREE,mk=(w,h,f)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');f(g,w,h);const t=new T3.CanvasTexture(c);if(T3.sRGBEncoding)t.encoding=T3.sRGBEncoding;t.anisotropy=4;return t};
  const chain=mk(64,64,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='rgba(200,206,210,.95)';g.lineWidth=2.2;for(let i=-64;i<128;i+=16){g.beginPath();g.moveTo(i,0);g.lineTo(i+64,64);g.stroke();g.beginPath();g.moveTo(i+64,0);g.lineTo(i,64);g.stroke()}});
  chain.wrapS=chain.wrapT=T3.RepeatWrapping;
  const sign=mk(512,256,(g,w,h)=>{g.fillStyle='#fbfbf5';g.fillRect(0,0,w,h);g.fillStyle='#d33a2c';g.fillRect(0,0,w,64);g.fillStyle='#fff';g.font='bold 46px Arial';g.textAlign='center';g.fillText('QUIK-HOOK TOWING',w/2,48);
    g.fillStyle='#1d1d1d';g.font='bold 40px Arial';g.fillText('LEGAL IMPOUND LOT',w/2,118);g.font='bold 30px Arial';g.fillText('$400 · CASH ONLY · NO CHECKS',w/2,168);g.font='italic 22px Arial';g.fillStyle='#555';g.fillText('No trespassing (please)',w/2,218)});
  const desk=mk(512,128,(g,w,h)=>{g.fillStyle='#d33a2c';g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='bold 56px Arial';g.textAlign='center';g.fillText('IMPOUND OFFICE',w/2,84)});
  const sticker=mk(256,128,(g,w,h)=>{g.fillStyle='#ff8a1c';g.fillRect(0,0,w,h);g.fillStyle='#111';g.font='bold 40px Arial';g.textAlign='center';g.fillText('IMPOUNDED',w/2,56);g.font='bold 22px Arial';g.fillText('CALL QUIK-HOOK · $400',w/2,96)});
  const drop=mk(256,64,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='rgba(255,255,255,.95)';g.font='bold 44px Arial';g.textAlign='center';g.fillText('DROP OFF',w/2,48)});
  return TEX={chain,sign,desk,sticker,drop}}
function fencePanel(g,x0,z0,x1,z1,h){const a=A(),T3=a.THREE,len=Math.hypot(x1-x0,z1-z0),t=tex().chain.clone();t.needsUpdate=true;t.repeat.set(len/.5,h/.5);
  const m=new T3.Mesh(new T3.PlaneGeometry(len,h),new T3.MeshStandardMaterial({map:t,transparent:true,alphaTest:.35,side:T3.DoubleSide,roughness:.4,metalness:.6}));
  m.position.set((x0+x1)/2,h/2+.05,(z0+z1)/2);m.rotation.y=-Math.atan2(z1-z0,x1-x0);m.castShadow=true;g.add(m);
  const post='#a9b0b6';const n=Math.max(1,Math.round(len/2.6));for(let i=0;i<=n;i++){const x=x0+(x1-x0)*i/n,z=z0+(z1-z0)*i/n;const p=new T3.Mesh(new T3.CylinderGeometry(.04,.04,h+.15,8),a.mat(post));p.position.set(x,(h+.15)/2,z);p.castShadow=true;g.add(p)}
  const rail=new T3.Mesh(new T3.CylinderGeometry(.03,.03,len,6),a.mat(post));rail.position.set((x0+x1)/2,h+.08,(z0+z1)/2);rail.rotation.z=Math.PI/2;rail.rotation.y=-Math.atan2(z1-z0,x1-x0);g.add(rail);
  return m}
function wallCol(x0,z0,x1,z1){const a=A(),t=.12;return a.wmCol({x0:Math.min(x0,x1)-t,z0:Math.min(z0,z1)-t,x1:Math.max(x0,x1)+t,z1:Math.max(z0,z1)+t})}
function buildLot(M){const a=A(),T3=a.THREE,g=new T3.Group();g.name='towLot';a.wmAdd(g);const h=2.1,L_=LOT;
  fencePanel(g,L_.x0,L_.z0,L_.g0,L_.z0,h);fencePanel(g,L_.g1,L_.z0,L_.x1,L_.z0,h);fencePanel(g,L_.x0,L_.z0,L_.x0,L_.z1,h);fencePanel(g,L_.x1,L_.z0,L_.x1,L_.z1,h);fencePanel(g,L_.x0,L_.z1,L_.x1,L_.z1,h);
  wallCol(L_.x0,L_.z0,L_.g0,L_.z0);wallCol(L_.g1,L_.z0,L_.x1,L_.z0);wallCol(L_.x0,L_.z0,L_.x0,L_.z1);wallCol(L_.x1,L_.z0,L_.x1,L_.z1);wallCol(L_.x0,L_.z1,L_.x1,L_.z1);
  /* the gate: two leaves on hinges, a chain and padlock in the middle */
  const gw=(L_.g1-L_.g0)/2,leaves=[];for(const s of[0,1]){const hinge=new T3.Group();hinge.position.set(s?L_.g1:L_.g0,0,L_.z0);g.add(hinge);const lf=new T3.Group();hinge.add(lf);
    const pm=fencePanel(lf,0,0,(s?-1:1)*gw,0,h-.1);const fr=a.mat('#a9b0b6');for(const y of[.12,h-.05]){const b=new T3.Mesh(new T3.CylinderGeometry(.035,.035,gw,6),fr);b.rotation.z=Math.PI/2;b.position.set((s?-1:1)*gw/2,y,0);lf.add(b)}
    leaves.push(hinge)}
  const lock=new T3.Mesh(new T3.TorusGeometry(.12,.025,6,14),a.mat('#7d7f83'));lock.position.set((L_.g0+L_.g1)/2,1.05,L_.z0-.04);g.add(lock);
  const pad=a.box(.09,.12,.04,'#c9a227',(L_.g0+L_.g1)/2,.92,L_.z0-.06,g);
  M.gate={leaves,col:a.wmCol({x0:L_.g0,z0:L_.z0-.12,x1:L_.g1,z1:L_.z0+.12}),open:0,want:0,lock:[lock,pad]};
  /* sign on the fence */
  const sg=new T3.Mesh(new T3.PlaneGeometry(2.2,1.1),new T3.MeshStandardMaterial({map:tex().sign,roughness:.6}));sg.position.set(L_.g1+.2+.0,1.55,L_.z0-.06);sg.position.x=(L_.g1+L_.x1)/2;sg.rotation.y=Math.PI;g.add(sg);
  /* the "office": a pop-up canopy, a folding table, a cash box, a cooler, two folding chairs */
  const d=L_.desk,can=new T3.Group();can.position.set(d.x,0,d.z);g.add(can);
  const red=a.mat('#d33a2c'),wht=a.mat('#f2f2ee'),alu=a.mat('#b7bcc2');
  for(const[x,z]of[[-1.05,-.8],[1.05,-.8],[-1.05,.8],[1.05,.8]]){const p=new T3.Mesh(new T3.CylinderGeometry(.025,.025,2.2,6),alu);p.position.set(x,1.1,z);can.add(p)}
  const roof=new T3.Mesh(new T3.ConeGeometry(1.55,.45,4,1,true),red);roof.position.y=2.42;roof.rotation.y=Math.PI/4;roof.scale.set(1,1,.78);can.add(roof);
  for(const[w,x,z,ry]of[[2.2,0,-.82,0],[2.2,0,.82,0],[1.7,-1.07,0,Math.PI/2],[1.7,1.07,0,Math.PI/2]]){const v=a.box(w,.2,.01,'#d33a2c',x,2.12,z,can);v.rotation.y=ry}
  const ban=new T3.Mesh(new T3.PlaneGeometry(2.1,.5),new T3.MeshStandardMaterial({map:tex().desk,roughness:.6}));ban.position.set(0,2.0,-.83);ban.rotation.y=Math.PI;can.add(ban);
  a.box(1.6,.04,.62,'#e9e7e1',0,.74,-.15,can);for(const x of[-.7,.7])for(const z of[-.4,.1]){const l=a.box(.03,.74,.03,'#9aa0a6',x,.37,z,can)}
  a.box(.34,.14,.24,'#2f4d6b',-.3,.83,-.15,can);a.box(.3,.02,.2,'#1f3349',-.3,.91,-.15,can);/* cash box */
  a.box(.5,.32,.32,'#2a68c8',.55,.16,.5,can);a.box(.52,.06,.34,'#f2f2ee',.55,.34,.5,can);/* cooler */
  a.box(.14,.2,.1,'#e3d9c0',.35,.86,-.2,can);/* a coffee */
  M.deskCol=a.wmCol({x0:d.x-.85,z0:d.z-.6,x1:d.x+.85,z1:d.z+.35});
  /* cones on the kerb */
  for(const x of[L_.g0-.4,L_.g1+.4]){const c=new T3.Mesh(new T3.ConeGeometry(.17,.55,10),a.mat('#ff7a1a'));c.position.set(x,.28,L_.z0-.7);c.castShadow=true;g.add(c)}
  M.lotG=g}
function gateTick(M,dt){const G=M.gate;if(!G)return;G.open+=(G.want-G.open)*Math.min(1,dt*1.6);const k=G.open;
  G.leaves[0].rotation.y=-k*1.5;G.leaves[1].rotation.y=k*1.5;for(const l of G.lock)l.visible=k<.05;
  if(k>.5&&G.col.x0>-1e3){G.col.x0=G.col.z0=-1e4;G.col.x1=G.col.z1=-1e4+1}}
/* a yellow wheel boot on the front-left wheel and an orange sticker on the driver's window (model space: +x forward, +z right) */
function boot(e){const a=A(),T3=a.THREE,S=a.carSize(e),g=new T3.Group();g.name='boot';const y=a.mat('#f2c230'),k=a.mat('#1c1c1c');
  const x=S.l/2-.85,z=-S.w/2-.06;const ring=new T3.Mesh(new T3.TorusGeometry(.2,.05,8,16),y);ring.position.set(x,.33,z-.02);g.add(ring);
  a.box(.5,.1,.08,'#f2c230',x,.33,z-.1,g);a.box(.12,.4,.08,'#f2c230',x+.22,.25,z-.1,g);a.box(.08,.08,.1,'#1c1c1c',x,.33,z-.16,g);
  const st=new T3.Mesh(new T3.PlaneGeometry(.42,.21),new T3.MeshStandardMaterial({map:tex().sticker,roughness:.7}));st.position.set(.25,S.h*.68,-S.w/2+.08);st.rotation.y=Math.PI;st.rotation.x=-.05;g.add(st);
  e.obj.add(g);e.boot=g}
function dropZone(o){const a=A(),T3=a.THREE,g=new T3.Group(),m=new T3.MeshBasicMaterial({color:new T3.Color('#3ee07a'),transparent:true,opacity:.7,depthWrite:false});
  const bar=(w,d,x,z)=>{const p=new T3.Mesh(new T3.PlaneGeometry(w,d),m);p.rotation.x=-Math.PI/2;p.position.set(x,0,z);g.add(p)};
  bar(2.3,.12,0,-2.7);bar(2.3,.12,0,2.7);bar(.12,5.4,-1.15,0);bar(.12,5.4,1.15,0);
  const t=new T3.Mesh(new T3.PlaneGeometry(2,.5),new T3.MeshBasicMaterial({map:tex().drop,transparent:true,depthWrite:false,color:new T3.Color('#ffffff')}));t.rotation.x=-Math.PI/2;t.rotation.z=Math.PI/2;g.add(t);
  g.position.set(o.spot.x,a.groundAt(o.spot.x,o.spot.z)+.03,o.spot.z);g.rotation.y=o.spot.yaw;a.wmAdd(g);g.visible=false;g.userData.m=m;return g}

/* ---------------- the five cars ---------------- */
function mkCar(M,o,i){const a=A(),obj=a.makeVehicle(o.type,o.color)||a.makeVanBox(o.color);a.wmAdd(obj);
  const e={type:o.type,obj,pos:a.V3(0,0,0),yaw:0,spd:0,steer:0,col:a.wmCol({x0:0,z0:0,x1:0,z1:0}),bump:0,stats:null,owner:'impound',name:o.name,color:o.color,home:null,dmg:0,odo:0,tile:null,meshes:null,
    towName:o.name+"'s "+(o.type==='hatch'?'hatchback':'sedan'),o,i,st:'lot'};
  const h=H();e.hp=h.carHpMax?h.carHpMax(e):100;place(e,SLOTS[i]);boot(e);solid(e,true);return e}
function place(e,s,yaw){const a=A(),S=a.carSize(e);e.yaw=yaw!=null?yaw:0;const f=fwd(e.yaw);e.pos.set(s.x-f[0]*S.l/2,0,s.z-f[1]*S.l/2);a.syncCar(e);if(e.obj)e.obj.rotation.z=0}
/* bullets and the camera: a parked car is solid, a towed one isn't (so the chase camera never snags on it) */
function solid(e,on){const a=A(),Ls=a.L&&a.L.solids;if(!Ls||!e.obj)return;if(on){if(e.meshes)return;e.meshes=[];e.obj.traverse(m=>{if(m.isMesh&&m!==e.obj.userData.contactShadow){Ls.push(m);e.meshes.push(m)}});return}
  if(!e.meshes)return;const s=new Set(e.meshes);let j=0;for(let i=0;i<Ls.length;i++)if(!s.has(Ls[i]))Ls[j++]=Ls[i];Ls.length=j;e.meshes=null}
const hpF=e=>{const h=H();try{return h.carFrac?h.carFrac(e):e.hp/100}catch(_){return 1}};
const hpOf=e=>{const h=H();try{return h.carHp?h.carHp(e):e.hp}catch(_){return e.hp}};
/* the owner's curb: the right-hand lane at the address, nudged to the kerb */
function curb(o){const a=A(),s=a.wmSnapRoad(o.at[0],o.at[1]),r=rgt(s.yaw);return{x:s.x+r[0]*.85,z:s.z+r[1]*.85,yaw:s.yaw,side:{x:s.x+r[0]*4.4,z:s.z+r[1]*4.4}}}

/* ---------------- people: Sal, the owners, the attendants, Lyle ---------------- */
function person(role,look,x,z,ry){const a=A(),PP=window.HT&&HT.People;let d=null;
  if(PP&&PP.ok&&role){try{if(role==='neighbour')d=PP.make('neighbour',{variant:look&&look.v});else if(PP.has(role))d=PP.make(role,{})}catch(_){d=null}}
  if(!d)d=a.makeDude(look&&look.look||{shirt:'#6a7f99',pants:'#3a3a3a'});d.root.position.set(x,0,z);d.root.rotation.y=ry||0;a.wmAdd(d.root);return d}
function posePerson(d,dt,o){const PP=window.HT&&HT.People;if(d&&d.rb&&PP&&PP.pose)try{PP.pose(d,dt,o||{moving:false,aim:false,mode:'stand'})}catch(_){}}
function wave(d){const PP=window.HT&&HT.People;if(d&&d.rb&&PP&&PP.interact)try{PP.interact(d)}catch(_){}}
function faceTo(d,x,z,dt){const r=d.root,want=Math.atan2(x-r.position.x,z-r.position.z);let da=wrap(want-r.rotation.y);r.rotation.y+=da*Math.min(1,(dt||1)*4)}
function walk(d,t,sp,dt){const r=d.root.position,dx=t.x-r.x,dz=t.z-r.z,l=Math.hypot(dx,dz);if(l<.3)return true;const s=Math.min(l,sp*dt);r.x+=dx/l*s;r.z+=dz/l*s;d.root.rotation.y=Math.atan2(dx,dz);posePerson(d,dt,{moving:true,aim:false,mode:'stand'});return false}
function attendant(M,x,z,name,gun,yaw){const a=A(),e=a.spawnEnemy(x,z,false);e.gun=gun;a.equip(e.dude,gun);e.noLeash=false;e.home={x,z};e.yaw=yaw;e.script={kind:'post'};if(e.tag)e.tag.textContent=name;e.att=name;
  /* peaceful until somebody makes it loud: out of the combat list, so the crew doesn't open fire on a conversation */
  e.peace=true;const k=a.enemies.indexOf(e);if(k>=0)a.enemies.splice(k,1);return e}
function unpeace(e){const a=A();if(!e.peace)return;e.peace=false;if(!a.enemies.includes(e))a.enemies.push(e)}
function peaceTick(M,dt){const a=A(),P=a.P;for(const e of M.att){if(!e.peace)continue;const d=e.dude,dx=P.pos.x-e.pos.x,dz=P.pos.z-e.pos.z,near=Math.hypot(dx,dz)<14;
  const want=near?Math.atan2(dx,dz):e.yaw;e.face=e.face==null?e.yaw:e.face+wrap(want-e.face)*Math.min(1,dt*3);d.root.position.set(e.pos.x,0,e.pos.z);d.root.rotation.y=e.face;posePerson(d,dt,{moving:false,aim:false,mode:'stand'})}}

J.register('tow',{
  def:{giver:'sal',hood:'river',title:'Hitch Happens',role:"Sal · Dad's Auto, Since 1987",place:'Dock St, Riverside',
    lines:["Some outfit calling itself Quik-Hook has been 'impounding' cars in Riverside on street-sweeping day. No licence. No paperwork. Four hundred bucks cash to get your own car back.",
      "Five cars are sitting in a pen at the river end of Dock Street. Five families taking the bus this week. I'll bolt my loaner hitch on your ride.",
      "Back up to the front bumper, hook it, tow it home. One at a time. Back up slow. Slower. You're not parallel parking at a funeral."],
    obj:"Get past the \"impound\" crew, then hitch each of the five cars and tow it to its owner's curb before street sweeping ends.",
    crew:['gary'],weapons:['pistol','beanbag'],from:{place:'auto'},start:{x:SAL_RING.x,z:SAL_RING.z},
    unlock:{done:['earl'],trustR:20},pay:700,par:600,winTrust:0,roam:true,stay:true,order:30,
    stages:['lot','car1','car2','car3','car4','car5','sal'],
    stageLabels:{lot:'The impound lot',car1:'Car 1 of 5',car2:'Car 2 of 5',car3:'Car 3 of 5',car4:'Car 4 of 5',car5:'Car 5 of 5',sal:"Back to Sal's"},failPolicy:'escalate',
    medals:['Finished','All five cars home, none wrecked','All five home, not a scratch (all 90%+), in under 9 minutes'],
    radio:[['sal',"Hold still. I'm bolting it on. Don't touch the gas, I like my toes."]],
    endLine:"Five cars home. A tow driver with a new job. And a hitch you didn't know you needed."},

  start(M,o){const a=A(),Tw=TW();M.ph='fit';M.fitT=0;M.cars=[];M.done=0;M.wrecked=0;M.sweep=0;M.sweepOn=true;M.said={};M.lotClear=false;M.talked=false;M.fought=false;M.bot=null;
    M.ft=null;M.truckOut=false;M.lyleCuffed=false;M.brought=false;M.slowT=0;M.spdHist=[];M.owners=[];M.sweepDone=null;
    if(Tw){Tw.reset();Tw.lend(false);Tw.targets(e=>targets(M));Tw.dropAt((t,k)=>dropAt(M,t,k))}
    buildLot(M);OWNERS.forEach((ow,i)=>{const e=mkCar(M,ow,i);M.cars.push(e);const c=curb(ow);M.owners.push({o:ow,curb:c,zone:dropZone({spot:c}),d:null,st:'wait',waveT:0,said:false})});
    const PP=window.HT&&HT.People;if(PP&&PP.preload)try{PP.preload(['rosa','benny','earl']).catch(()=>{})}catch(_){}
    /* the three "attendants" on the kerb by the office */
    M.att=[attendant(M,LOT.desk.x+.1,LOT.desk.z+.95,'MANAGER','pistol',Math.PI),attendant(M,LOT.desk.x+2.6,LOT.desk.z+.2,'KYLE','nailer',Math.PI*.85),attendant(M,LOT.g1+.9,LOT.z0-.9,'VEST GUY','pistol',Math.PI*1.2)];
    a.rebuildTargets();a.wmSetWindow(a.wmWindow(314,138,16));
    /* Sal behind your ride with the hitch kit */
    const c=M.car;if(c){const f=fwd(c.yaw),S=a.carSize(c);const r=rgt(c.yaw);M.salTo={x:c.pos.x-f[0]*(S.l/2+1.1),z:c.pos.z-f[1]*(S.l/2+1.1)};M.sal=person(null,{look:a.HOMIES.sal},M.salTo.x+r[0]*3.2-f[0]*1.5,M.salTo.z+r[1]*3.2-f[1]*1.5,0);
      const kit=a.box(.6,.3,.4,'#c0392b',M.salTo.x+.6,.15,M.salTo.z+.3);a.wmAdd(kit);M.kit=kit}
    if(o&&o.checkpoint)return;
    const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.music('tension',{intensity:.3})}catch(_){}},

  upd(dt,M,F){const a=A(),Tw=TW();if(!Tw){F.objs.push(['Sal is finding the hitch kit...',false]);return}
    gateTick(M,dt);sweepTick(M,dt,F);if(M.state!=='go')return;
    const e=a.CV,c=e&&(e.car||e);
    /* your ride: broken down = Sal's flatbed, job over */
    if(M.car&&hpOf(M.car)<=0&&!M.downT){M.downT=1;M.towed=true;return a.endMission(false,"Your ride's done. Sal's flatbed is on the way, and the impound crew is laughing at you from a lawn chair.","Broken down")}
    if(M.wrecked>=K.wreckFail)return a.endMission(false,"Three of the neighbours' cars came home in pieces. Nobody is calling that a rescue.","Too many wrecks");
    speedHist(M,dt);
    if(M.ph==='fit')fitTick(M,dt,F);
    else if(M.ph==='drive')driveTick(M,dt,F);
    else if(M.ph==='lot')lotTick(M,dt,F);
    else if(M.ph==='tow')towTick(M,dt,F);
    else if(M.ph==='sal')salTick(M,dt,F);
    ownersTick(M,dt);truckTick(M,dt,F);
    if(M.ph!=='fit'&&M.ph!=='drive'){const n=M.cars.filter(x=>x.st==='done').length;F.meters.unshift({id:'cars',label:'Cars home',v:n,max:5,style:'pips'})}
    const k=Tw.link;if(k&&M.cars.includes(k.ref)){const t=k.ref,f=hpF(t);F.meters.push({id:'cond',label:t.o.name.replace(/^(Mrs?\.) /,'$1 ')+"'s car",v:Math.round(f*100),max:100,style:'bar',warn:60,warnBelow:true,sub:Math.round(f*100)+'%'})}
    sal_lines(M,dt)},

  /* [CP] what a stage needs to resume: each car's state, hp and pose; the gate; Lyle and his truck; the sweeping clock */
  save:M=>({ph:M.ph==='fit'||M.ph==='drive'||M.ph==='lot'?M.ph:M.ph,sweep:Math.round(M.sweep*10)/10,gate:!!(M.gate&&M.gate.want),lot:!!M.lotClear,talked:!!M.talked,fought:!!M.fought,
    cars:M.cars.map(e=>({st:e.st==='tow'||e.st==='stolen'?(e.loose?'loose':'lot'):e.st,hp:Math.round(hpOf(e)*10)/10,x:Math.round(e.pos.x*100)/100,z:Math.round(e.pos.z*100)/100,y:Math.round(e.yaw*1000)/1000})),
    truck:M.truckOut?{cuffed:!!M.lyleCuffed,x:M.ft?Math.round(M.ft.e.pos.x*10)/10:0,z:M.ft?Math.round(M.ft.e.pos.z*10)/10:0,y:M.ft?Math.round(M.ft.e.yaw*100)/100:0,brought:!!M.brought}:null}),
  load(M,s){const a=A();if(!s)return;M.sweep=s.sweep||0;M.talked=!!s.talked;M.fought=!!s.fought;
    if(s.lot){lotCleared(M,true)}
    s.cars.forEach((cs,i)=>{const e=M.cars[i];if(!e)return;const h=H(),mx=h.carHpMax?h.carHpMax(e):100;e.hp=cs.hp;if(h.carRepair)try{h.carRepair(e,0)}catch(_){}e.dmg=1-cs.hp/mx;
      try{const ud=e.obj.userData;if(ud.setDamage)ud.setDamage(e.dmg)}catch(_){}
      if(cs.st==='done'){deliverNow(M,e,true)}else if(cs.st==='loose'){e.st='lot';e.loose=true;e.pos.set(cs.x,0,cs.z);e.yaw=cs.y;a.syncCar(e)}});
    M.done=M.cars.filter(e=>e.st==='done').length;M.wrecked=M.cars.filter(e=>e.st==='done'&&e.wreck).length;
    if(s.truck){spawnTruck(M,{x:s.truck.x,z:s.truck.z,yaw:s.truck.y});if(s.truck.cuffed){M.lyleCuffed=true;M.ft.state='parked';hideLyle(M)}}
    if(M.done>=5){M.ph='sal';M.sweepOn=false}else if(s.lot){M.ph='tow'}else M.ph=s.ph==='fit'?'fit':s.ph;
    if(M.ph!=='fit'){finishFit(M,true)}},
  payout(M,ok){if(!ok)return[];const n=M.cars.filter(e=>e.st==='done').length,out=[['Cars returned ×'+n,K.carPay*n]];
    if(n===5&&M.cars.every(e=>(e.dropF||0)>=.9))out.push(['Not a scratch',K.clean]);
    if(M.brought)out.push(['Brought me the truck',K.truck]);
    if(M.talked&&!M.fought)out.push(['Talked past the "attendants"',K.talk]);
    return out},
  medal:M=>{const n=M.cars.filter(e=>e.st==='done'&&!e.wreck).length;if(n<5)return 1;const clean=M.cars.every(e=>(e.dropF||0)>=.9);return clean&&(M.sweepDone||M.sweep)<K.goldT?3:2},
  end(M,ok){if(!ok)return;const a=A(),s=a.SV(),Sv=window.HT&&HT.Save;if(!s)return;
    s.flags=s.flags||{};s.flags.noImpound=true;if(M.lyleCuffed){s.flags.towGuy=true;try{Sv&&Sv.household&&Sv.household(null,'towguy')}catch(_){}}
    /* the hitch stays on: "on your tab" */
    try{const g=s.garage;if(g&&g.util&&!g.util.hitch){g.util.hitch=true;g.tab=(g.tab||0)+350;Sv&&Sv.touch&&Sv.touch('garage')}}catch(_){}
    try{a.save()}catch(_){}},
  noise(n){const M=A().M;if(!M||M.ph!=='lot'||M.lotClear||M.fight)return;if(n&&n.kind==='gun'&&Math.hypot(n.x-LOT.desk.x,n.z-LOT.desk.z)<40)fight(M,'shots')},
  test:{give(a){/* the bridge opens after Rick's job (and Earl's job is across it) */const h=window.__ht,s=a.SV();for(const id of['gary','rick','earl']){const i=a.MISSIONS.findIndex(m=>m.id===id);if(i>=0&&h&&h.prog)h.prog.done[i]=true;if(s&&window.HT.Save&&HT.Save.jobRec)HT.Save.jobRec(s,id).done=true}if(s&&s.world)s.world.bridgeOpen=true},step:(a,t,o)=>bot(a,t,o),
    sample:()=>({ph:'tow',sweep:100,gate:true,lot:true,talked:true,fought:false,cars:[0,1,2,3,4].map(i=>({st:i<2?'done':'lot',hp:90,x:0,z:0,y:0})),truck:null})}
});

/* ---------------- the clock: street sweeping ends at 12:00 ---------------- */
function sweepTick(M,dt,F){if(M.sweepOn&&M.ph!=='fit')M.sweep+=dt;const left=Math.max(0,K.sweep-M.sweep);
  if(M.sweepOn&&M.ph!=='fit')F.widgets.push({id:'sweep',kind:'timer',label:'Sweeping ends',v:left,max:K.sweep,hot:left<60});
  if(M.sweepOn&&left<=0)A().endMission(false,"Street sweeping's over. The 'fines' kick in, and you can't out-tow a fine.","Out of time");
  if(M.sweepOn&&left<120&&!M.said.t120){M.said.t120=1;A().radio('gary',"Two minutes of sweeping left. I'm not panicking. I'm narrating.",true)}}
function speedHist(M,dt){const e=A().CV;const v=e?(e.car||e).spd:0;M.spdHist.push(v);if(M.spdHist.length>30)M.spdHist.shift();M.slowT=Math.abs(v)<2?M.slowT+dt:0}

/* ---------------- 1. Sal fits the hitch ---------------- */
function fitTick(M,dt,F){const a=A(),Tw=TW();M.fitT+=dt;F.objs.push(['Sal is fitting the tow hitch',false]);const d=M.sal;
  if(d){const arrived=walk(d,M.salTo,1.5,dt);if(arrived){faceTo(d,M.car.pos.x,M.car.pos.z,dt);posePerson(d,dt,{moving:false,aim:false,mode:'crouch'});
      M.wrenchT=(M.wrenchT||0)-dt;if(M.wrenchT<=0&&M.fitT<6){M.wrenchT=.55+Math.random()*.4;Tw.sfx('clank');try{const h=H(),T3=a.THREE;h.FX&&h.FX.impact&&h.FX.impact(new T3.Vector3(M.salTo.x+fwd(M.car.yaw)[0]*.6,.5,M.salTo.z+fwd(M.car.yaw)[1]*.6),new T3.Vector3(0,1,0),'metal',{decal:false})}catch(_){}}}}
  if(M.fitT>2.6&&!M.said.fit1){M.said.fit1=1;a.radio('sal',"There. Receiver, wheel-lift, a little boom I welded out of a swing set. And a light on the roof so people know you mean business.")}
  if(M.fitT>4.2&&!M.lend){M.lend=true;Tw.lend(true);Tw.sfx('clank')}
  if(M.fitT>6.5&&!M.said.fit2){M.said.fit2=1;a.radio('sal',"The lot's at the river end of Dock Street. Bring 'em home in one piece. The owners notice scratches. I notice scratches.")}
  if(M.fitT>8.5)finishFit(M,false)}
function finishFit(M,quiet){const a=A(),Tw=TW();if(Tw){Tw.lend(true)}M.lend=true;if(M.sal){M.sal.root.position.set(SAL.x,0,SAL.z);M.sal.root.rotation.y=Math.PI}if(M.kit)M.kit.visible=false;
  if(M.ph==='fit'){M.ph='drive';if(!quiet){a.radio('gary',"GPS says Dock Street. I say we take River Road and avoid the bridge traffic.");a.radio('you',"There's no bridge traffic, Gary.");a.radio('gary',"Not with that attitude.")}}}

/* ---------------- 2. drive to the lot ---------------- */
function driveTick(M,dt,F){const a=A(),P=a.P;F.objs.push(['Drive to the impound lot · Dock St, Riverside',false]);F.target={x:LOT.ring.x,z:LOT.ring.z,label:'Impound lot'};
  posePerson(M.sal,dt);
  if(Math.hypot(P.pos.x-LOT.ring.x,P.pos.z-LOT.ring.z)<26){M.ph='lot';a.radio('gary',"Chain-link, a gate, a pop-up tent and three guys in vests. Very official. Very 'my cousin has a printer'.",true)}}

/* ---------------- 3. the lot: talk or fight past the attendants ---------------- */
function lotTick(M,dt,F){const a=A(),P=a.P;posePerson(M.sal,dt);peaceTick(M,dt);
  const alive=M.att.filter(e=>e.state!=='dead'&&e.state!=='cuffed'&&e.state!=='surrender');
  if(!M.lotClear&&(M.fight||M.talkDone)&&!alive.length){a.rebuildTargets();lotCleared(M,false)}
  if(M.lotClear){F.objs.push(['The gate is open',true]);return}
  /* anybody hurt or shot at: it's a fight now */
  if(!M.fight&&M.att.some(e=>e.hp<e.maxhp||e.state==='dead'))fight(M,'hurt');
  if(M.fight){F.objs.push(['Deal with the "attendants" · '+(3-alive.length)+'/3',false]);const n=a.wmNearest(alive.length?alive:M.att);if(n)F.target={x:n.pos.x,z:n.pos.z,label:n.att||'Attendant'};return}
  if(M.talk){F.objs.push(['Talk your way past',false]);return}
  F.objs.push([a.CV?'Park and walk up to the impound "office"':'Walk up to the impound "office"',false]);F.target={x:LOT.desk.x,z:LOT.desk.z-.9,label:'Impound office'};
  F.objs.push(['(or don\'t: they\'re armed, and it gets loud)',false]);
  if(!a.CV&&Math.hypot(P.pos.x-M.att[0].pos.x,P.pos.z-M.att[0].pos.z)<K.talkR+.6)F.taps.push({d:0,r:1,txt:'Ask about the impound',fn:()=>talkStart(M)})}
function fight(M,why){const a=A();if(M.fight||M.lotClear)return;M.fight=true;M.fought=true;if(M.talk)talkEnd(M);
  for(const e of M.att){unpeace(e);if(e.state==='dead'||e.state==='cuffed'||e.state==='surrender')continue;e.script=null;e.loud=1;e.alert=true}a.rebuildTargets();
  a.spotted(why);a.radio('Manager',why==='talk'?"That's it! Kyle! Get the— the nail thing!":"Okay! OKAY! Impound's CLOSED!",true);a.radio('gary',"So we're doing it the loud way. Noted.");
  const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.music('combat')}catch(_){}}
function lotCleared(M,quiet){const a=A();M.lotClear=true;if(M.gate)M.gate.want=1;
  if(quiet){if(M.gate){M.gate.open=1;gateTick(M,0)}for(const e of M.att){e.script={kind:'incar'};e.state='dead';e.hp=0;if(e.tag){e.tag.remove();e.tag=null}if(e.dude.root.parent)e.dude.root.parent.remove(e.dude.root);const k=a.enemies.indexOf(e);if(k>=0)a.enemies.splice(k,1)}a.rebuildTargets();M.ph='tow';return}
  try{TW()&&TW().sfx('clank')}catch(_){}
  a.radio('gary',M.fight?"Gate's open. Somebody had the key on a lanyard that says 'BOSS'.":"Gate's open. I'll be honest, I thought that'd be harder.",true);
  a.radio('gary',"The boot's on the front wheel. The front wheels are going in the air. That's a legal loophole.");
  a.CP.mark('car1');M.ph='tow';const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.music('hub',{intensity:.4})}catch(_){}}
/* the conversation: three rounds, dad-polite or dad-funny gets you through; one Bad Cop line and it's a fight */
function talkStart(M){const a=A(),HD=a.HUD;if(M.talk||M.fight)return;M.talk={r:0,wait:0};M.talked=true;
  for(const e of M.att)if(e.script)e.script={kind:'post'};
  const kit=HD&&HD.kit&&HD.kit.choices?HD.kit.choices({speaker:TALK[0].speaker,color:'#ff8a7a',prompt:TALK[0].prompt,tell:TALK[0].tell,options:TALK[0].options,onPick:(i,op)=>talkPick(M,i)}):null;
  M.talk.kit=kit;if(kit)a.overlay('tow-talk',kit.el);a.radio('you',"Morning. I'm here about the cars.",true)}
function talkPick(M,i){const a=A(),T=M.talk;if(!T||T.busy)return;const R=TALK[T.r],op=R.options[i];if(!op)return;T.busy=true;T.picked=(T.picked||[]).concat(i);
  a.radio('you',op.text,true);let t=1.1;for(const[w,x]of op.reply){setT(M,t,()=>a.radio(w,x));t+=1.6}
  setT(M,t+.4,()=>{if(!M.talk)return;if(op.bad){talkEnd(M);fight(M,'talk');return}
    T.r++;T.busy=false;if(T.r>=TALK.length){talkEnd(M);talkWin(M);return}const n=TALK[T.r];if(T.kit)T.kit.set({speaker:n.speaker,prompt:n.prompt,tell:n.tell,options:n.options})})}
function talkEnd(M){const a=A();if(M.talk&&M.talk.kit){try{a.overlay('tow-talk',null)}catch(_){}}M.talk=null}
function talkWin(M){const a=A();M.talkDone=true;for(const e of M.att){unpeace(e);if(e.state==='dead')continue;e.script=null;a.surrender(e);if(e.tag)e.tag.textContent=(e.att||'')+' · ON BREAK'}
  a.radio('gary',"They're on break. Zip-ties are optional. Recommended, but optional.",true);lotCleared(M,false)}
/* tiny timeline (runs off the mission clock, so it pauses with the game and stops when the job does) */
function setT(M,t,fn){(M.tl||(M.tl=[])).push({at:M.elapsed+t,fn})}
function tlTick(M){if(!M.tl||!M.tl.length)return;const now=M.elapsed;for(let i=0;i<M.tl.length;i++){const q=M.tl[i];if(q.at<=now){M.tl.splice(i--,1);try{q.fn()}catch(e){console.warn('[tow]',e)}}}}

/* ---------------- 4. towing ---------------- */
function targets(M){if(!M||!M.cars)return[];const out=M.cars.filter(e=>(e.st==='lot')&&e.obj);
  if(M.ft&&M.ft.state==='parked'&&!M.brought)out.push(M.ft.e);return out}
function towTick(M,dt,F){const a=A(),Tw=TW(),k=Tw.link,P=a.P;posePerson(M.sal,dt);
  const t=k&&k.ref;
  if(t&&M.cars.includes(t)){if(t.st!=='tow'){t.st='tow';t.loose=false;solid(t,false);onHitch(M,t)}
    const ow=M.owners[t.i],cb=ow.curb,d=Math.hypot(t.pos.x-cb.x,t.pos.z-cb.z);
    F.objs.push(['Tow '+t.towName+' to '+ow.o.street,false]);F.target={x:cb.x,z:cb.z,label:t.o.name};
    if(d<22)F.objs.push([dropOk(t,ow)?'Stop and hold E to drop it at the curb':'Line it up in the green box at the curb',false]);
    if(M.ft&&M.ft.state==='unhook')F.objs.push(['He\'s unhooking it! Drive off, or get out and stop him',false,'warn'])}
  else if(t&&M.ft&&t===M.ft.e){F.objs.push(["Bonus: tow the Quik-Hook truck to Sal's",false]);F.target={x:SAL_BAY.x,z:SAL_BAY.z,label:"Dad's Auto"}}
  else{const left=M.cars.filter(e=>e.st==='lot');
    if(left.length){const cv=a.CV;F.objs.push([cv?'Back up to a car\'s front bumper, then hold E to hitch it':'Get back in and hitch the next car',false]);
      /* the nearest front bumper (the guide does the rest) */let best=null,bd=1e9;for(const e of left){const S=a.carSize(e),f=fwd(e.yaw),bx=e.pos.x+f[0]*S.l/2,bz=e.pos.z+f[1]*S.l/2,dd=Math.hypot(bx-P.pos.x,bz-P.pos.z);if(dd<bd){bd=dd;best={x:bx+f[0]*2,z:bz+f[1]*2,e}}}
      if(best)F.target={x:best.x,z:best.z,label:best.e.o.name+"'s car"};
      const stolen=M.cars.find(e=>e.st==='stolen');if(stolen)F.objs.push(['The Quik-Hook truck has '+stolen.o.name+"'s car! Stop him",false,'warn'])}}
  if(M.ft&&M.ft.state==='parked'&&!M.brought&&!(t&&t===M.ft.e))F.objs.push(["Bonus: hitch the Quik-Hook truck and bring it to Sal's",false]);
  /* every car is home (or wrecked): back to Sal */
  if(M.cars.every(e=>e.st==='done')&&M.ph==='tow'){M.ph='sal';M.sweepOn=false;M.sweepDone=M.sweep;a.CP.mark('sal');
    a.radio('gary',"That's five cars. That's two thousand dollars nobody had to pay. I did the math.",true);setT(M,3,()=>a.radio('sal',"Bring my hitch home. I'll put the coffee on. It's bad on purpose."))}
  tlTick(M)}
function onHitch(M,t){const a=A();if(!M.said.hitch){M.said.hitch=1;a.radio('sal',"Hear that clunk? That's the good clunk.",true)}
  if(t.boot){/* the boot rides along on the lifted wheel */}
  const n=M.cars.filter(e=>e.st==='done').length;if(n>=2&&!M.truckOut)setT(M,2.5,()=>{if(!M.truckOut)spawnTruck(M)})}
function dropOk(t,ow){const cb=ow.curb,d=Math.hypot(t.pos.x-cb.x,t.pos.z-cb.z),dy=Math.abs(wrap(t.yaw-cb.yaw)),dy2=Math.abs(wrap(t.yaw-cb.yaw-Math.PI));return d<K.dropR&&Math.min(dy,dy2)<K.dropYaw*D2R}
function dropAt(M,t,k){if(M.ph==='fit')return false;if(M.ft&&t===M.ft.e){const d=Math.hypot(t.pos.x-SAL_BAY.x,t.pos.z-SAL_BAY.z);return{txt:d<14?"Leave the truck at Sal's":'Unhitch the Quik-Hook truck',fn:()=>{solid(t,true);if(d<14&&!M.brought){M.brought=true;broughtTruck(M)}}}}
  if(!M.cars.includes(t))return null;const ow=M.owners[t.i];
  if(dropOk(t,ow))return{txt:'Drop '+t.o.name+"'s car at the curb",fn:()=>deliver(M,t)};
  return{txt:'Unhitch '+t.towName+' here',fn:()=>{t.st='lot';t.loose=true;solid(t,true);A().radio('gary',pick(["Leaving it here? Bold. I'll put a note on the windshield.","We're parking it in the middle of the street. Okay. Okay."]))}}}
function deliver(M,t){const a=A(),ow=M.owners[t.i],f=hpF(t);deliverNow(M,t,false);t.dropF=f;M.done=M.cars.filter(e=>e.st==='done').length;
  const tier=hpOf(t)<=0?'wreck':f>=.9?'good':f>=.6?'ok':'bad';t.tier=tier;if(tier==='wreck'){t.wreck=true;M.wrecked++}
  const tr=tier==='good'||tier==='ok'?2:tier==='bad'?1:0;if(tr)a.addTrust(tr,'river');
  a.feed(t.towName+' is home',tier==='wreck'?'bad':'trust',tr?'+'+tr+' Riverside trust':'They are not happy');
  try{const h=H(),T3=a.THREE;if(h.FX&&h.FX.trustPop&&tr)h.FX.trustPop(new T3.Vector3(t.pos.x,2.4,t.pos.z),'+'+tr+' TRUST',{sub:ow.o.name,color:'#7fdc6e'})}catch(_){}
  ow.st='react';ow.reactT=0;let tt=.4;for(const[w,x]of ow.o[tier]){const ww=w;setT(M,tt,()=>a.radio(ww,x,true));tt+=2.2}
  if(M.done<5)setT(M,tt+.6,()=>a.radio('gary',GARY_COUNT[M.done-1]||''));
  const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.ui&&Au.ui(tier==='wreck'?'denied':'objective')}catch(_){}
  if(M.done<5)a.CP.mark('car'+(M.done+1))}
function deliverNow(M,t,quiet){const a=A(),ow=M.owners[t.i],cb=ow.curb;t.st='done';t.loose=false;
  if(quiet){/* a checkpoint: it's already at the curb */t.yaw=cb.yaw;t.pos.set(cb.x,0,cb.z);a.syncCar(t);ow.st='home'}
  if(t.boot){t.boot.parent&&t.boot.parent.remove(t.boot);t.boot=null}if(t.obj)t.obj.rotation.z=0;solid(t,true);ow.zone.visible=false;
  if(quiet&&t.dropF==null)t.dropF=hpF(t);if(quiet&&hpOf(t)<=0)t.wreck=true}

/* ---------------- the owners on their kerbs ---------------- */
function ownersTick(M,dt){const a=A(),Tw=TW(),k=Tw&&Tw.link,P=a.P;
  for(const ow of M.owners){const t=M.cars[M.owners.indexOf(ow)],towing=k&&k.ref===t,near=Math.hypot(P.pos.x-ow.curb.x,P.pos.z-ow.curb.z);
    ow.zone.visible=!!towing&&near<60;if(ow.zone.visible){const m=ow.zone.userData.m;m.opacity=.45+.3*Math.sin(a.simT*5);m.color.set(dropOk(t,ow)?'#3ee07a':'#ffc94a')}
    if(!ow.d&&(towing&&near<K.ownerSee||t.st==='done')){ow.d=person(ow.o.who,{v:ow.o.v,look:{shirt:'#7a8fb0',pants:'#3a3a3a'}},ow.curb.side.x,ow.curb.side.z,0);if(t.st==='done')ow.st='home'}
    const d=ow.d;if(!d)continue;
    if(ow.st==='wait'){faceTo(d,P.pos.x,P.pos.z,dt);ow.waveT-=dt;if(near<45&&ow.waveT<=0){ow.waveT=4+Math.random()*3;wave(d)}posePerson(d,dt);
      if(towing&&near<38&&!ow.said){ow.said=true;a.radio(ow.o.who==='neighbour'?ow.o.name:ow.o.who,ow.o.hi)}}
    else if(ow.st==='react'){ow.reactT+=dt;const to={x:t.pos.x+rgt(t.yaw)[0]*1.6,z:t.pos.z+rgt(t.yaw)[1]*1.6};if(walk(d,to,1.6,dt)){faceTo(d,t.pos.x,t.pos.z,dt);posePerson(d,dt);if(ow.reactT>2&&!ow.waved){ow.waved=true;if(t.tier!=='wreck')wave(d)}}if(ow.reactT>8)ow.st='home'}
    else{const tp={x:t.pos.x+rgt(t.yaw)[0]*1.6,z:t.pos.z+rgt(t.yaw)[1]*1.6};d.root.position.set(tp.x,0,tp.z);faceTo(d,near<12?P.pos.x:t.pos.x,near<12?P.pos.z:t.pos.z,dt);posePerson(d,dt)}}}

/* ---------------- the Quik-Hook truck: tails you, tries to unhook you when you stop, steals it back if he gets the chance ---------------- */
function spawnTruck(M,at){const a=A(),CA=a.CarAI(),G=a.roads(),Tw=TW();if(!CA||!G||M.truckOut)return;M.truckOut=true;
  const P=a.P;let p=at;if(!p){/* 60 m back along the roads, out of sight if possible */const n=G.nearestNode(P.pos.x,P.pos.z);let best=null,bd=-1;for(const nd of G.nodes){const d=Math.hypot(nd.x-P.pos.x,nd.z-P.pos.z);if(d>35&&d<75&&d>bd&&(!a.project||true)){bd=d;best=nd}}const s=best?a.wmSnapRoad(best.x,best.z):a.wmSnapRoad(P.pos.x+40,P.pos.z);p={x:s.x,z:s.z,yaw:s.yaw}}
  const obj=a.makeVehicle('pickup','#ece8df')||a.makeVanBox('#ece8df');a.wmAdd(obj);const S=a.carSize({obj});const rig=Tw.truckRig(obj,S,{});
  const e={type:'pickup',obj,pos:a.V3(p.x,0,p.z),yaw:p.yaw||0,spd:0,steer:0,col:a.wmCol({x0:0,z0:0,x1:0,z1:0}),bump:0,stats:null,owner:'quikhook',name:'Quik-Hook',color:'#ece8df',towName:'the Quik-Hook truck',dmg:0,odo:0,meshes:null};
  const h=H();e.hp=h.carHpMax?h.carHpMax(e):120;const car=CA.make('pickup',{x:p.x,z:p.z,yaw:p.yaw||0});car.hp=999;
  M.ft={e,car,rig,state:'tail',t:0,route:null,rT:0,stunT:0,checks:0,lyle:null,steal:null,said:{}};a.syncCar(e);
  a.radio('Quik-Hook guy',"Sir! SIR! That vehicle is property of Quik-Hook Towing and Recovery!",true);setT(M,2.4,()=>a.radio('gary',"That's their truck. He's got a light bar. Why does he get a light bar."));
  const Au=window.HT&&HT.Audio;if(Au&&Au.ready)try{Au.music('tension',{intensity:.6})}catch(_){}}
function truckCollide(ft){const a=A();return(p,r)=>{const c=ft.e.col,sv={x0:c.x0,z0:c.z0,x1:c.x1,z1:c.z1,ob:c.ob};c.x0=c.z0=-1e4;c.x1=c.z1=-1e4+1;c.ob=null;a.collide(p,r);Object.assign(c,sv)}}
function truckDrive(M,ft,tgt,spd,dt){const a=A(),CA=a.CarAI(),G=a.roads(),c=ft.car;ft.rT-=dt;
  if(ft.rT<=0||!c.ai){ft.rT=1.2;const r=G.route({x:c.x,z:c.z},tgt);const pts=r&&r.points&&r.points.length>1?r.points:[{x:c.x,z:c.z},tgt];CA.follow(c,pts,{speed:spd,turnSpeed:Math.min(spd,7)})}
  c.ai.speed=spd;CA.step(c,dt,{collide:truckCollide(ft)});ft.e.pos.set(c.x,0,c.z);ft.e.yaw=c.yaw;ft.e.spd=c.spd;syncTruck(ft,dt)}
function syncTruck(ft,dt){const a=A();a.syncCar(ft.e);const VM=window.HT&&HT.Vehicles;if(ft.e.obj.userData.mod&&VM&&VM.update)try{VM.update(ft.e.obj,{speed:ft.e.spd,steer:ft.car.steer||0,braking:Math.abs(ft.e.spd)<1,headlights:false,dt:dt||1/30})}catch(_){}
  TW().truckFlash(ft.rig,dt||1/30,ft.state!=='parked'&&ft.state!=='stunned')}
function truckTick(M,dt,F){const ft=M.ft;if(!ft)return;const a=A(),Tw=TW(),P=a.P,c=ft.car,k=Tw.link,e=a.CV;ft.t+=dt;
  const myTow=k&&M.cars.includes(k.ref)?k.ref:null;
  if(ft.state==='parked'){syncTruck(ft,dt);if(k&&k.ref===ft.e)return;return}
  /* ram him: a solid hit from your ride stops him cold */
  if(e&&e.car&&ft.state!=='lyleout'){const CA=a.CarAI(),G_=window.HT.Garage,rs=Object.assign({},G_.apply(e.type==='pickup'||G_.VEH[e.type]?e.type:'minivan')),sh={x:e.car.x,z:e.car.z,yaw:e.car.yaw,spd:e.car.spd,hp:999,stats:Object.assign({},e.car.stats,rs,{hp:999})};
    const r=CA.ram(sh,c);if(r){e.car.x=e.pos.x=sh.x;e.car.z=e.pos.z=sh.z;e.car.spd=e.spd=sh.spd;a.syncCar(e);if(r.vn>4){Tw.sfx('bang');if(ft.state==='steal'||ft.state==='tail')stopTruck(M,'rammed')}}}
  if(ft.state==='tail'){/* sit behind the car you're towing, close but never touching */
    const t=myTow;if(!t||!e){/* nothing to take: hang back near you */truckDrive(M,ft,{x:P.pos.x,z:P.pos.z},Math.hypot(P.pos.x-c.x,P.pos.z-c.z)>30?12:0,dt);return}
    const f=fwd(t.yaw),S=a.carSize(t),back={x:t.pos.x-f[0]*(S.l/2+3.2),z:t.pos.z-f[1]*(S.l/2+3.2)},d=Math.hypot(back.x-c.x,back.z-c.z),pv=Math.abs(e.car?e.car.spd:0);
    const spd=d>40?K.fakeMax:Math.max(0,Math.min(K.fakeMax,pv+(d-K.tailGap+3)*.7));truckDrive(M,ft,back,spd,dt);
    if(!ft.said.tail&&ft.t>8){ft.said.tail=1;a.radio('Quik-Hook guy',"I'm just gonna follow you. Professionally.")}
    /* brake check: you stop hard with him right on your bumper */
    const h=M.spdHist,dv=h.length>8?Math.max(...h.slice(-30))-h[h.length-1]:0;
    if(d<16&&Math.abs(c.spd)>6&&dv>K.brakeDv&&pv<Math.max(...h.slice(-30))-K.brakeDv+.5){brakeChecked(M,ft);return}
    /* he only tries it away from his own lot, once you've been towing a while */
    if(M.slowT>K.pounceSlow&&d<K.pounceD&&ft.t>4&&k.t>6&&Math.hypot(t.pos.x-LOT.ring.x,t.pos.z-LOT.ring.z)>45)lyleOut(M,ft,t)}
  else if(ft.state==='stunned'){ft.stunT-=dt;c.spd*=Math.pow(.2,dt);const CA=a.CarAI();CA.step(c,dt,{collide:truckCollide(ft)});ft.e.pos.set(c.x,0,c.z);ft.e.yaw=c.yaw;syncTruck(ft,dt);if(ft.stunT<=0){ft.state='tail';ft.t=0}}
  else if(ft.state==='lyleout'){syncTruck(ft,dt);lyleTick(M,ft,dt,F)}
  else if(ft.state==='steal'){const s=ft.steal;truckDrive(M,ft,{x:LOT.ring.x,z:LOT.ring.z},K.stealSpd,dt);
    const tw={x:c.x,z:c.z,yaw:c.yaw,spd:c.spd,len:a.carSize(ft.e).l},b={x:s.t.pos.x,z:s.t.pos.z,yaw:s.t.yaw};s.k.car=b;Tw.step(s.k,tw,dt,{});s.t.pos.x=b.x;s.t.pos.z=b.z;s.t.yaw=b.yaw;a.syncCar(s.t);if(s.t.obj)s.t.obj.rotation.z=.08;
    F.target={x:c.x,z:c.z,label:'Quik-Hook truck'};F.objs.push(['Stop the Quik-Hook truck: ram it or box it in',false,'warn']);
    if(e&&Math.hypot(e.pos.x-c.x,e.pos.z-c.z)<7&&Math.abs(c.spd)<1.2){ft.boxT=(ft.boxT||0)+dt;if(ft.boxT>1.5)stopTruck(M,'boxed')}else ft.boxT=0;
    if(Math.hypot(c.x-LOT.ring.x,c.z-LOT.ring.z)<14){/* he made it: back in the pen it goes */const t=s.t;t.st='lot';t.loose=false;const i=t.i;place(t,SLOTS[i]);solid(t,true);ft.steal=null;ft.state='tail';ft.t=-20;
      a.radio('Quik-Hook guy',"And it's back in the lot! Four hundred, cash!",true);a.radio('gary',"He took it back to the pen. That's going to cost us a whole trip.")}}}
function brakeChecked(M,ft){const a=A();ft.checks++;ft.state='stunned';ft.stunT=K.stall;ft.car.spinT=1.1;ft.car.spd*=.5;TW().sfx('bump');
  a.radio('Quik-Hook guy',ft.checks>1?"AGAIN?! Who TAUGHT you to drive?!":"WHOA! What is WRONG with you?!",true);
  if(ft.checks===1)a.radio('gary',"Brake check. Coach Rick would be so proud. He'd draw you a diagram.");else a.radio('gary',"He's going to need a minute. And a new pair of pants.")}
/* Lyle (the Quik-Hook guy) is unarmed and never runs the combat AI: he walks where the job sends him until he gives up */
function spawnLyle(M,ft,x,z){const a=A(),p=a.wmSnap(x,z),L_=a.spawnEnemy(p.x,p.z,false);a.equip(L_.dude,null);L_.gun=null;L_.noLeash=true;L_.hp=L_.maxhp=60;
  if(L_.tag)L_.tag.textContent='QUIK-HOOK GUY';L_.lyle=true;L_.peace=true;const k=a.enemies.indexOf(L_);if(k>=0)a.enemies.splice(k,1);a.rebuildTargets();ft.lyle=L_;return L_}
function lyleGive(M,ft,line){const a=A(),L_=ft.lyle;if(!L_||L_.state!=='idle')return;
  if(ft.lm==='steal'&&!ft.steal){/* he hadn't hooked it yet: it's just sitting there */const t=M.cars.find(e=>e.st==='stolen');if(t){t.st='lot';t.loose=true;solid(t,true)}}L_.walk=null;unpeace(L_);a.rebuildTargets();a.surrender(L_);a.radio('Quik-Hook guy',line,true)}
function lyleMove(L_,dt){const a=A(),w=L_.walk,d=L_.dude;if(!w){d.root.position.set(L_.pos.x,0,L_.pos.z);posePerson(d,dt,{moving:false,aim:false,mode:w===null&&L_.work?'crouch':'stand'});return}
  const dx=w.x-L_.pos.x,dz=w.z-L_.pos.z,l=Math.hypot(dx,dz);if(l<.35){L_.walk=null;if(w.then)w.then();return}
  const s=Math.min(l,w.sp*dt);L_.pos.x+=dx/l*s;L_.pos.z+=dz/l*s;a.collide(L_.pos,.35);L_.yaw=Math.atan2(dx,dz);d.root.position.set(L_.pos.x,0,L_.pos.z);d.root.rotation.y=L_.yaw;posePerson(d,dt,{moving:true,speed:w.sp/3,aim:false,mode:'stand'})}
function lyleOut(M,ft,t){const a=A(),c=ft.car,r=rgt(c.yaw);ft.state='lyleout';ft.lm='go';c.spd=0;
  spawnLyle(M,ft,c.x+r[0]*1.6,c.z+r[1]*1.6);ft.uh=0;ft.target=t;ft.from={x:t.pos.x,z:t.pos.z};
  a.radio('Quik-Hook guy',pick(["Street-sweeping day, my guy. Rules are rules.","Don't mind me. Just reclaiming. Professionally.","Ma'am— sir— this vehicle is in violation."]),true);
  if(!M.said.lyleHint){M.said.lyleHint=1;a.radio('gary',"He's going for the hitch! Drive off, or get out and stop him!")}}
function lyleTick(M,ft,dt,F){const a=A(),L_=ft.lyle,P=a.P,Tw=TW(),k=Tw.link,t=ft.target;if(!L_)return;
  if(L_.state==='cuffed'){lyleCuffed(M,ft);return}
  if(L_.state==='surrender'){F.target={x:L_.pos.x,z:L_.pos.z,label:'Zip-tie'};F.objs.push(['Zip-tie the Quik-Hook guy',false]);return}
  if(L_.state==='dead'){ft.state='parked';hideLyle(M);return}
  lyleMove(L_,dt);
  /* you walked into him: he gives up */
  if(!a.CV&&Math.hypot(P.pos.x-L_.pos.x,P.pos.z-L_.pos.z)<1.9){lyleGive(M,ft,"Okay! Okay! I'm not even a bad guy, man, I'm a guy with a truck payment.");return}
  if(ft.lm==='back'||ft.lm==='steal')return;
  const stillHooked=k&&k.ref===t;
  if(!stillHooked){lyleBackTo(M,ft);return}
  const S=a.carSize(t),f=fwd(t.yaw),rr=rgt(t.yaw),hp={x:t.pos.x+f[0]*(S.l/2+.35)+rr[0]*1.15,z:t.pos.z+f[1]*(S.l/2+.35)+rr[1]*1.15};
  if(Math.hypot(t.pos.x-ft.from.x,t.pos.z-ft.from.z)>3){/* you drove off */a.radio('Quik-Hook guy',pick(["HEY! HEY! I was WORKING!","Come ON, man!","That's— okay. Okay. I'll just follow you again."]),true);lyleBackTo(M,ft);return}
  if(ft.lm==='go'){if(!L_.walk)L_.walk={x:hp.x,z:hp.z,sp:3.6,then:()=>{ft.lm='work'}};else{L_.walk.x=hp.x;L_.walk.z=hp.z}return}
  /* at the hitch, working the pin */
  L_.work=true;L_.walk=null;const d=L_.dude;d.root.rotation.y=Math.atan2(t.pos.x-L_.pos.x+f[0]*S.l/2,t.pos.z-L_.pos.z+f[1]*S.l/2);posePerson(d,dt,{moving:false,aim:false,mode:'crouch'});
  ft.uh+=dt/K.unhook;F.meters.push({id:'unhook',label:"He's unhooking",v:ft.uh,max:1,style:'bar',warn:.6,color:'#ff6a4d'});
  if(Math.random()<dt*3)Tw.sfx('rattle');
  if(ft.uh>=1){Tw.detach('stolen');t.st='stolen';stealStart(M,ft,t)}}
function lyleBackTo(M,ft){const L_=ft.lyle;if(!L_)return;ft.lm='back';L_.work=false;const c=ft.car,r=rgt(c.yaw);
  L_.walk={x:c.x+r[0]*1.5,z:c.z+r[1]*1.5,sp:4.4,then:()=>{hideDude(L_);ft.lyle=null;ft.state='tail';ft.t=-6}}}
function stealStart(M,ft,t){const a=A(),Tw=TW(),L_=ft.lyle;ft.lm='steal';a.radio('Quik-Hook guy',"GOT IT! Thank you for your patience!",true);a.radio('gary',"He's got "+t.o.name+"'s car! Stop that truck!");
  if(L_){L_.work=false;const c=ft.car,r=rgt(c.yaw);L_.walk={x:c.x+r[0]*1.5,z:c.z+r[1]*1.5,sp:5,then:()=>{}}}
  setT(M,1.6,()=>{if(ft.lyle&&ft.lyle.state==='idle'){hideDude(ft.lyle);ft.lyle=null}else if(ft.lyle)return;
    const c=ft.car,tw={x:c.x,z:c.z,yaw:c.yaw,spd:0,len:a.carSize(ft.e).l},b={x:t.pos.x,z:t.pos.z,yaw:t.yaw,len:a.carSize(t).l,wid:a.carSize(t).w};
    /* onto his hook: the stolen car swings round to his hitch */const k=Tw.make(tw,b,{side:'front',instant:true});t.pos.x=b.x;t.pos.z=b.z;t.yaw=b.yaw;a.syncCar(t);ft.steal={t,k};ft.state='steal';ft.rT=0;Tw.sfx('clank')})}
function stopTruck(M,why){const a=A(),ft=M.ft;if(!ft)return;const c=ft.car,stealing=ft.state==='steal';c.spd=0;ft.state='lyleout';ft.lm='give';ft.uh=-1;
  if(stealing&&ft.steal){const t=ft.steal.t;t.st='lot';t.loose=true;solid(t,true);if(t.obj)t.obj.rotation.z=0;ft.steal=null}
  const r=rgt(c.yaw);if(!ft.lyle)spawnLyle(M,ft,c.x+r[0]*1.8,c.z+r[1]*1.8);
  lyleGive(M,ft,why==='rammed'?"OKAY! Okay! I'm out! I'm not even a bad guy, man, I'm a guy with a truck payment.":"Okay, you got me. I'm not even a bad guy, man, I'm a guy with a truck payment.")}
function lyleCuffed(M,ft){const a=A();if(M.lyleCuffed)return;M.lyleCuffed=true;ft.state='parked';ft.car.spd=0;
  setT(M,1.2,()=>a.radio('Quik-Hook guy',"I drove for Riverside Towing eleven years. They closed. These Quik-Hook guys pay cash. ...Not a lot of cash."));
  setT(M,4.4,()=>a.radio('you',"You know Sal? Dad's Auto?"));setT(M,6,()=>a.radio('Quik-Hook guy',"Everybody knows Sal."));
  setT(M,7.8,()=>a.radio('gary',"His truck's just sitting there. Sal did say 'evidence'."));
  setT(M,9.6,()=>a.radio('sal',"Evidence. And a nice truck. Hitch it up and bring it in, if you've got room on the chain."))}
function hideDude(e){const a=A();if(e.tag){e.tag.remove();e.tag=null}if(e.dude&&e.dude.root.parent)e.dude.root.parent.remove(e.dude.root);e.state='dead';e.hp=0;const k=a.enemies.indexOf(e);if(k>=0)a.enemies.splice(k,1);a.rebuildTargets()}
function hideLyle(M){const ft=M.ft;if(ft&&ft.lyle){hideDude(ft.lyle);ft.lyle=null}}
function broughtTruck(M){const a=A();a.radio('sal',"Evidence. And a nice truck. I'm keeping the light bar.",true);a.feed("The Quik-Hook truck is at Dad's Auto",'cash','+$'+K.truck)}

/* ---------------- 5. back to Sal ---------------- */
function salTick(M,dt,F){const a=A(),P=a.P,Tw=TW(),k=Tw.link;posePerson(M.sal,dt);tlTick(M);
  const towingTruck=k&&M.ft&&k.ref===M.ft.e;F.objs.push(["Bring Sal's hitch home · Dad's Auto",false]);
  if(M.ft&&M.ft.state==='parked'&&!M.brought)F.objs.push([towingTruck?"Bonus: the Quik-Hook truck is on the hook":"Bonus: hitch the Quik-Hook truck on the way",towingTruck]);
  F.target={x:SAL_BAY.x,z:SAL_BAY.z,label:"Dad's Auto"};
  const e=a.CV;if(e&&Math.hypot(e.pos.x-SAL_BAY.x,e.pos.z-SAL_BAY.z)<11&&Math.abs((e.car||e).spd)<1.5&&!M.salDone){M.salDone=true;
    if(towingTruck&&!M.brought){M.brought=true;Tw.detach('drop');broughtTruck(M)}
    a.radio('sal',"Five for five. You know what the best part of towing is? Nobody's ever happy to see you. Except today.",true);
    if(M.lyleCuffed){setT(M,2.6,()=>a.radio('sal',"The driver? Laid-off tow guy, right? Tell him to come by Monday. Bring his own coffee. Ours is bad on purpose."));setT(M,3.2,()=>{a.addTrust(K.hire,'river');a.feed("Sal's hiring Lyle",'trust','+'+K.hire+' Riverside trust')})}
    setT(M,M.lyleCuffed?5.6:2.8,()=>a.radio('sal',"And keep the hitch. I'll put it on your tab. You don't have a tab. You do now."));
    setT(M,M.lyleCuffed?8:5.2,()=>{if(M.state==='go')a.endMission(true)})}}

/* ---------------- the radio: Sal's coaching, once each ---------------- */
function sal_lines(M,dt){const a=A(),Tw=TW();if(!Tw)return;const k=Tw.link,cd=Tw.S.cand,e=a.CV;tlTick(M);
  if(cd&&cd.chk.d<8&&!M.said.slow){M.said.slow=1;a.radio('sal',"Hitching's easy. Back up slow. Slower. You're not parallel parking at a funeral.",true)}
  if(k&&e&&Math.abs(k.rel||0)>40*D2R&&Math.abs((e.car||e).spd)>7&&!M.said.fish){M.said.fish=1;a.radio('sal',"If it fishtails, ease off. Don't brake. Don't panic. Don't do what you're doing right now.",true)}}
/* events from the hitch */
let _off=null;
function hookEvents(){const Tw=TW();if(!Tw||_off)return;_off=Tw.on((type,d)=>{const a=A(),M=a&&a.M;if(!M||!M.def||M.def.id!=='tow'||M.state!=='go')return;
  if(type==='jackknife'){a.radio('you',"That's... not how that goes.",true);a.radio('gary',pick(["The car is now beside us. Cars aren't supposed to be beside us.","I've seen this on a nature show. It doesn't end well for the antelope."]))}
  else if(type==='snap'){a.radio('gary',"The chain let go. I'm noting that the chain let go.",true)}
  else if(type==='scrape'&&!M.said.scrape){M.said.scrape=1;a.radio('sal',"That's coming off the owner's thank-you.",true)}
  else if(type==='hit'&&d&&d.sp>8){a.radio('gary',pick(["That's going in "+(d.car.o?d.car.o.name:'the owner')+"'s newsletter.","Was that a mailbox? Tell me that wasn't a mailbox."]),false)}
  else if(type==='bump'){a.radio('sal',"Gently! You're hitching it, not proposing to it.",true)}
  if((type==='jackknife'||type==='snap')&&d&&d.car&&M.cars&&M.cars.includes(d.car)){d.car.st='lot';d.car.loose=true;solid(d.car,true)}
  if(type==='detach'&&d&&d.car&&M.cars&&M.cars.includes(d.car)&&d.car.st==='tow'&&d.why!=='drop'){d.car.st='lot';d.car.loose=true;solid(d.car,true)}})}
/* the job's own lifecycle: wire HT.Tow while it runs, give the world back when it's over */
J.on('pose',()=>{const a=A(),Tw=TW();if(!a||!Tw)return;hookEvents();const M=a.M,mine=a.mode==='mission'&&M&&M.def&&M.def.id==='tow';
  if(mine&&M.state==='go'){Tw.targets(e=>targets(M));Tw.dropAt((t,k)=>dropAt(M,t,k));if(M.lend)Tw.lend(true);return}
  if(!mine&&Tw.S.lend){Tw.reset();Tw.lend(false);if(M&&M.cars)for(const e of M.cars)solid(e,false)}
  if(mine&&M.state!=='go'&&Tw.link){Tw.detach('end',{quiet:true})}
  if(!mine&&M&&M.def&&M.def.id==='tow'&&M.cars&&!M.cleaned){M.cleaned=true;for(const e of M.cars)solid(e,false);if(M.ft)solid(M.ft.e,false)}
  /* after the job: Sal's new tow guy's truck parked on Dock St (SPEC3 3.4) */
  afterTruck(a)});
let AFTER=null;
function afterTruck(a){if(a.mode!=='hub'||!a.L||!a.L.ow){return}const s=a.SV();if(!s||!s.flags||!s.flags.towGuy){return}
  if(AFTER&&AFTER.L===a.L&&AFTER.g.parent)return;const Tw=TW();if(!Tw)return;
  const obj=a.makeVehicle('pickup','#f4f1ea');if(!obj)return;const S=a.carSize({obj});Tw.truckRig(obj,S,{color:'#f4f1ea',accent:'#1f4f8c'});
  const p={x:332,z:125.6,yaw:Math.PI/2};obj.position.set(p.x,a.groundAt(p.x,p.z),p.z);obj.rotation.set(0,p.yaw+Math.PI/2,0);a.L.group.add(obj);
  const col={x0:p.x-2.7,z0:p.z-1.05,x1:p.x+2.7,z1:p.z+1.05};a.L.colliders.push(col);AFTER={L:a.L,g:obj,col}}

/* ---------------- the scripted player for dev/jobs-check.js ----------------
   Drives the real roads with the real tow physics; lines up for the hook-up by placing the van (the human-paced
   lining-up is dev/jobs/tow.js). o.fail: hitches the first car, then drives the van into walls until it dies. */
function bot(a,t,o){const M=a.M,P=a.P,Tw=TW();if(!M||M.state!=='go'||!Tw)return null;const B=M.bot||(M.bot={t:0,stuck:0});B.t++;const k=a.keys;
  const rel=()=>{for(const x of['w','a','s','d'])k[x]=false;k.e=false};
  const drive=(tgt,maxV,arrive)=>{const e=a.CV;if(!e)return false;const G=a.roads(),c=e.car||e;
    if(!B.route||B.rt!==tgt||B.age++>45){B.route=G.route({x:e.pos.x,z:e.pos.z},tgt);B.pts=B.route?B.route.points:[tgt];B.wi=1;B.rt=tgt;B.age=0}
    const pts=B.pts;while(B.wi<pts.length-1&&Math.hypot(pts[B.wi].x-e.pos.x,pts[B.wi].z-e.pos.z)<7)B.wi++;
    const d0=Math.hypot(tgt.x-e.pos.x,tgt.z-e.pos.z),w=d0<10?tgt:pts[Math.min(B.wi,pts.length-1)];
    const dx=w.x-e.pos.x,dz=w.z-e.pos.z;let dy=Math.atan2(-dx,-dz)-c.yaw;dy=wrap(dy);
    const want=d0<(arrive||3)?0:d0<14?Math.max(2,d0*.5):Math.abs(dy)>.5?6:maxV;
    k.a=dy>.06;k.d=dy<-.06;k.w=c.spd<want-.5;k.s=c.spd>want+1.5;k[' ']=false;
    if(Math.abs(c.spd)<1.2&&want>0){B.stuck++;if(B.stuck>50){B.stuck=0;const q=pts[Math.min(B.wi+1,pts.length-1)];/* unstick like a human would: a nudge */c.x=q.x;c.z=q.z;c.yaw=Math.atan2(-(q.x-e.pos.x),-(q.z-e.pos.z));e.pos.set(q.x,0,q.z);e.yaw=c.yaw;
        if(Tw.link){const kk=Tw.link,tw={x:c.x,z:c.z,yaw:c.yaw,spd:0,len:a.carSize(e).l},H_=Tw.hitchPoint(tw),C=Tw.centreFrom(H_,c.yaw,kk.len);kk.ref.pos.x=C.x;kk.ref.pos.z=C.z;kk.ref.yaw=c.yaw;kk.psi=c.yaw;kk.w=0;kk.H0=null;kk.Cp=null;kk.vt=0;a.syncCar(kk.ref)}}}else B.stuck=0;
    return d0<(arrive||3)&&Math.abs(c.spd)<.6};
  const tp=(x,z)=>{P.pos.set(x,0,z);a.collide(P.pos,.35)},door=e=>{const r=rgt(e.yaw);tp(e.pos.x-r[0]*2,e.pos.z-r[1]*2)};
  if(M.ph==='fit'){rel();return null}
  if(M.ph==='drive'){if(!a.CV){door(M.car);a.useTap=true;return null}drive(LOT.ring,13,4);return null}
  if(M.ph==='lot'&&!M.lotClear){
    if(a.CV){rel();if(Math.abs((a.CV.car||a.CV).spd)>.5){k.s=true;return null}a.useTap=true;return null}
    if(M.fight){/* the bot doesn't aim: it closes in and they give up (a real fight is played in dev/jobs/tow.js --fight) */
      const n=a.wmNearest(M.att.filter(e=>e.state==='surrender'));if(n){tp(n.pos.x+.8,n.pos.z);a.useTap=true;return null}
      const f=M.att.find(e=>e.state==='idle');if(f&&B.t%30===0){tp(f.pos.x+1.2,f.pos.z);a.surrender(f)}return null}
    if(!M.talk){tp(LOT.desk.x+.3,LOT.desk.z-1.4);if(B.t%20===0)a.useTap=true;return null}
    const T=M.talk;if(T.kit&&!T.busy&&(B.wait=(B.wait||0)+1)>(o&&o.fast?4:40)){B.wait=0;T.kit.pick(T.r===2?1:0)}return null}
  /* the surrendered / cuffable: zip-tie them (trust) on the way past */
  const sur=a.enemies.find(e=>e.state==='surrender'&&Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z)<60);
  if(sur&&!(o&&o.fail)){if(a.CV){rel();const c=a.CV.car||a.CV;if(Math.abs(c.spd)>.6){k.s=c.spd>0;k.w=c.spd<0;return null}a.useTap=true;return null}tp(sur.pos.x+.7,sur.pos.z);a.useTap=true;return null}
  /* he's at the hitch: get out and stop him */
  const ft=M.ft;if(ft&&ft.state==='lyleout'&&ft.lyle&&ft.lyle.state!=='surrender'&&ft.lyle.state!=='cuffed'){if(a.CV){rel();a.useTap=true;return null}tp(ft.lyle.pos.x+.6,ft.lyle.pos.z);return null}
  if(ft&&ft.state==='steal'){if(!a.CV){door(M.car);a.useTap=true;return null}const c=ft.car;drive({x:c.x,z:c.z},16,1);return null}
  if(!a.CV){const e=M.car;if(!B.atDoor||Math.hypot(P.pos.x-e.pos.x,P.pos.z-e.pos.z)>3.2){door(e);B.atDoor=1}else{a.useTap=true;B.atDoor++;if(B.atDoor>20)B.atDoor=0}rel();return null}
  const e=a.CV,c=e.car||e,kL=Tw.link;
  if(o&&o.fail){if(!kL){alignTo(a,M,Tw,M.cars.find(x=>x.st==='lot'));k.e=true;return null}k.e=false;if(B.t%12===0){const h=H();h.crash&&h.crash(e,26)}return null}
  if(M.ph==='sal'){if(M.ft&&M.ft.state==='parked'&&!M.brought&&!kL&&!B.skipTruck){if(B.truckTry==null)B.truckTry=B.t;if(B.t-B.truckTry>400){B.skipTruck=true;return null}alignTo(a,M,Tw,M.ft.e);k.e=true;return null}
    k.e=false;drive(SAL_BAY,13,4);return null}
  if(kL&&M.cars.includes(kL.ref)){const t=kL.ref,ow=M.owners[t.i],cb=ow.curb;
    /* aim the van so the towed car ends up in the box: the box centre plus a tow-length along the way we're going */
    if(dropOk(t,ow)&&Math.abs(c.spd)<.8){rel();k.e=true;return null}
    const f=fwd(cb.yaw),dir=Math.cos(wrap(c.yaw-cb.yaw))>=0?1:-1,L=a.carSize(e).l/2+Tw.T.hitchBack+Tw.T.gap+a.carSize(t).l/2,goal={x:cb.x+f[0]*L*dir,z:cb.z+f[1]*L*dir};
    const dd=Math.hypot(t.pos.x-cb.x,t.pos.z-cb.z);k.e=false;
    if(dd<9&&!dropOk(t,ow)&&Math.abs(c.spd)<.5){B.near=(B.near||0)+1;if(B.near>30){B.near=0;/* square it up */const yaw=dir>0?cb.yaw:wrap(cb.yaw+Math.PI);c.yaw=yaw;e.yaw=yaw;c.x=goal.x;c.z=goal.z;e.pos.set(goal.x,0,goal.z);kL.psi=yaw;kL.w=0;kL.H0=null;kL.Cp=null;kL.vt=0;const C=Tw.centreFrom(Tw.hitchPoint({x:c.x,z:c.z,yaw,len:a.carSize(e).l}),yaw,kL.len);t.pos.x=C.x;t.pos.z=C.z;t.yaw=yaw;a.syncCar(t);a.syncCar(e)}}
    drive(goal,12,1.2);return null}
  if(kL){k.e=false;drive(SAL_BAY,12,4);return null}
  const left=M.cars.filter(x=>x.st==='lot');if(!left.length){rel();return null}
  /* the nearest car: drive close, then line up (placing the van where a careful dad would have reversed to) */
  let tgt=left[0],bd=1e9;for(const x of left){const d=Math.hypot(x.pos.x-e.pos.x,x.pos.z-e.pos.z);if(d<bd){bd=d;tgt=x}}
  const S=a.carSize(tgt),f=fwd(tgt.yaw),front={x:tgt.pos.x+f[0]*(S.l/2+6),z:tgt.pos.z+f[1]*(S.l/2+6)};
  if(bd>22){k.e=false;drive(front,13,6);return null}
  alignTo(a,M,Tw,tgt);k.e=true;return null}
function alignTo(a,M,Tw,t){if(!t)return;const e=a.CV;if(!e)return;const c=e.car||e,S=a.carSize(t),Se=a.carSize(e),f=fwd(t.yaw);
  const H_={x:t.pos.x+f[0]*(S.l/2+Tw.T.gap),z:t.pos.z+f[1]*(S.l/2+Tw.T.gap)},o=Se.l/2+Tw.T.hitchBack;
  if(Math.hypot(c.x-(H_.x+f[0]*o),c.z-(H_.z+f[1]*o))>.3||Math.abs(wrap(c.yaw-t.yaw))>.05){c.x=H_.x+f[0]*o;c.z=H_.z+f[1]*o;c.yaw=t.yaw;c.spd=0;e.pos.set(c.x,0,c.z);e.yaw=c.yaw;e.spd=0;a.syncCar(e)}
  for(const x of['w','a','s','d'])a.keys[x]=false}
})();
