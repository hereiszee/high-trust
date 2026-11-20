/* =====================================================================
   DAD TAXI (SPEC3 2.4): a timed errand chain with passengers. Giver: Jen, from the fridge at home (her list).
   Home -> 1 School (Maddie + the carpool kids) -> 2 Linden Park (soccer drop) -> 3 Hank's (orange slices) -> 4 Dr. Feld (Tyler, 11:00 SHARP)
   -> the bike thieves: block their pickup on Route 9 (stay in its path 3 s) while Rick handles them on foot; zip-ties or a ride to the crossing guard
   -> 5 School (the bikes go back on the rack) -> 6 Home before Jen does.
   One forgotten item (shin guard, Hank's card, the retainer, the trombone) appears on one of stops 2-5: an optional detour.
   Passengers sit in the car, care about smooth driving (comfort) and have opinions about the radio (R / tap the radio chip).
   Built on js/jobs/_stops.js (HT.Stops). No index.html changes.

   TUNING (all in one place, see T below):
   - targets: each leg = route length / 9.4 m/s + 2.4 s per corner + 3 s, plus the dwell at the stop before it. Soft window 30 s (late after that).
     Hard deadlines: Dr. Feld target + 50 s, home target + 50 s. Clock: 1 game second = 8 clock seconds, Dr. Feld's target reads 11:00.
   - comfort (HT.Stops.CF): braking past 10 m/s², corners past 7.5 m/s² lateral, kerbs, impacts, over 19.5 m/s. Regains 1.3/s after 2 s of calm,
     +/-0.8/s from the radio mood. The ride score is the time-weighted average while anyone rides.
   - block: the thieves' pickup cruises at 12.5 m/s, starts 7 s after the call; you need it stopped in front of you for 3 s (decays at half speed).
     After 1.1 s stuck it tries to go around (±2.9 m), so you have to shuffle to stay in its way.
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;const SX=()=>window.HT.Stops;
const T={reverse:1.4,soft:30,v:9.4,turn:2.4,pad:3,hardOrtho:50,hardHome:50,dwell:{pickup:5,drop:4,errand:6,appt:7,bikes:6,home:2},bikesAllow:60,scale:8,
  thiefSpeed:12.5,thiefDelay:7,blockNeed:3,swerveAfter:1.1,swerveOff:2.9,noticeD:38,abandonR:70,seatsNeed:5,itemPay:50,stopPay:40,smoothPay:100,videoPay:30};
const hyp=Math.hypot,pickA=a=>a[Math.floor(Math.random()*a.length)];
const ITEMS=[{k:1,id:'shin',name:'shin guard',owner:'ava',where:'Linden Park',
    notice:[['Tyler',"Whose shin guard is this?"],['Maddie',"That's Ava's. She has a game. In like four minutes."],['you',"Okay. Okay. Back to the park."]],
    got:[['Ava',"My shin guard! Coach says no guard, no game."],['you',"Shin guard delivered. We were never here."]]},
  {k:2,id:'card',name:'credit card',owner:'maddie',where:"Hank's",
    notice:[['Hank (text)',"You left your card on the box. It's taped to my register now. Like a trophy."],['you',"Back to Hank's. Nobody say anything."]],
    got:[['Maddie',"Hank says hi. Hank says you do this every time."],['you',"Hank is exaggerating. Twice is not every time."]]},
  {k:3,id:'retainer',name:'retainer',owner:'tyler',where:'Dr. Feld',
    notice:[['Tyler',"...Where's my retainer."],['you',"In your mouth?"],['Tyler',"It's in the little case. The little case is in the waiting room."],['you',"That retainer cost more than this van. We're going back."]],
    got:[['Tyler',"Got it. The receptionist did a slow clap."]]},
  {k:4,id:'trombone',name:'trombone',owner:'maddie',where:'the school',
    notice:[['Tyler',"Dad. The trombone."],['Maddie',"I left it by the rack! It was a whole thing with the bikes!"],['you',"Nobody move. We're getting the trombone."]],
    got:[['Maddie',"Trombone secured. Mom never has to know."]]}];
const CHATTER=[[['Ava',"Mr. Maddie's dad, are we going to be late? Coach makes late kids run laps."],['you',"Nobody's running laps today. Except me, maybe. Emotionally."]],
  [['Mason',"Do you know any jokes?"],['you',"Why did the minivan cross the road?"],['Mason',"Why?"],['you',"Carpool."],['Mason',"...That's not a joke."],['you',"It's a lifestyle."]],
  [['Maddie',"Dad. Ava is breathing on my side."],['Ava',"I'm breathing in the MIDDLE."]],
  [['Tyler',"Mason says his dad's car goes two hundred."],['you',"Mason's dad drives a Corolla."],['Mason',"A FAST Corolla."]],
  [['Mason',"Is this the car that smells like fries?"],['Tyler',"It's the car that smells like fries."]]];
const REACT={brake:["Whoa!","Dad! My juice box!","I felt that in my teeth.","My whole face went forward.","Mom brakes like a cloud."],
  corner:["Wheee!","I'm on Ava's side now. Sorry, Ava.","Dad, this isn't a race.","The car leaned! The car leaned!","My stomach went left."],
  kerb:["Was that the curb?","That was the curb.","Mom never hits the curb."],bump:["What was THAT?","Is the van okay? Are WE okay?","I'm telling Mom."],
  speed:["Dad. DAD. The speed limit.","Mom says thirty-five on Oak.","Faster! ...No, Mom said don't say faster."],
  sick:["I don't feel so good.","Can we open a window? All the windows?","I can see my breakfast. In my mind."],
  smooth:["This is the smoothest ride ever.","You drive like a bus driver. A good one.","I didn't even spill my juice."]};
const RADIO_LINES={like:{kidz:["Yes! KIDZ 98!","This is my SONG.","Turn it up! ...Please?"],talk:["Ooh, is the Huddle on?","Sports talk! Is Gary calling in again?"],rock:["Dad music. Okay. I can work with this."],jazz:["Smooth. Like the ride. Hopefully."]},
  hate:{kidz:["Nooo. Not the bop one.","Dad, change it, this song is about nothing."],talk:["Not the talk one. Please. They just yell about punting.","Why do grown-ups yell about punting?"],rock:["Is this from the olden days?"],jazz:["This is elevator music. Are we in an elevator?"],off:["Why is it so QUIET.","Silence is weird. Put something on."]}};

/* ---------- places: curbside points computed from the road graph (the school site if the world has one) ---------- */
function curb(a,x,z,toward,off){const G=a.roads&&a.roads();const r=G&&G.nearestRoad(x,z);if(!r)return{x,z,yaw:0};const A_=G.nodes[r.a],B_=G.nodes[r.b],dx=B_.x-A_.x,dz=B_.z-A_.z,l=hyp(dx,dz)||1;
  const nx=-dz/l,nz=dx/l,s=((toward.x-r.x)*nx+(toward.z-r.z)*nz)>=0?1:-1;return{x:r.x+nx*s*(off||1.7),z:r.z+nz*s*(off||1.7),yaw:Math.atan2(-dx,-dz),side:{x:nx*s,z:nz*s}}}
let PL=null;
function places(){const a=A(),W=a&&a.WORLD;if(!W)return null;if(PL&&PL.W===W)return PL;const pl=W.places||{},st=W.sites||{};
  const homeP=pl.home||{x:39,z:15},hankP=pl.hank||{x:45,z:17},park=st.dave&&st.dave.ring||{x:91,z:97};
  const sch=st.school&&st.school.ring?st.school.ring:{x:144,z:11};
  const P_={W,home:curb(a,homeP.x-2,homeP.z,{x:homeP.x-2,z:homeP.z+8}),hank:curb(a,hankP.x+3,hankP.z,{x:hankP.x+3,z:hankP.z+8}),
    school:curb(a,sch.x,sch.z,{x:sch.x,z:sch.z-6}),park:curb(a,park.x,park.z,{x:park.x,z:park.z+8}),ortho:curb(a,213,43,{x:213,z:35}),
    bridge:{x:279,z:44.5},gas:pl.gas?{x:pl.gas.x-8,z:pl.gas.z-1}:{x:219,z:28},site:!!(st.school&&st.school.ring)};
  P_.rack={x:P_.school.x-1+P_.school.side.x*2.6,z:P_.school.z+P_.school.side.z*2.6};P_.guard={x:P_.school.x+9+P_.school.side.x*2.4,z:P_.school.z+P_.school.side.z*2.4};
  P_.field={x:park.x+3,z:park.z+8};P_.hankBox={x:P_.hank.x+P_.hank.side.x*2.2,z:P_.hank.z+P_.hank.side.z*2.2};P_.orthoDoor={x:211,z:36.5};
  return PL=P_}

/* ---------- props: procedural, merged per material (a bike is 3 draw calls) ---------- */
const GC={},MC={};
function mergeTo(group,parts){const a=A(),T3=a.THREE,by=new Map();for(const p of parts){if(!by.has(p.m))by.set(p.m,[]);by.get(p.m).push(p)}
  for(const[m,list]of by){const pos=[],nor=[];for(const p of list){let g=p.g.clone();g.applyMatrix4(p.mx);if(g.index)g=g.toNonIndexed();const P_=g.attributes.position.array,N_=g.attributes.normal.array;for(let i=0;i<P_.length;i++){pos.push(P_[i]);nor.push(N_[i])}g.dispose()}
    const bg=new T3.BufferGeometry();bg.setAttribute('position',new T3.Float32BufferAttribute(pos,3));bg.setAttribute('normal',new T3.Float32BufferAttribute(nor,3));bg.computeBoundingSphere();
    const mesh=new T3.Mesh(bg,m);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh)}return group}
function M3(px,py,pz,rx,ry,rz,sx,sy,sz){const T3=A().THREE,m=new T3.Matrix4();m.compose(new T3.Vector3(px,py,pz),new T3.Quaternion().setFromEuler(new T3.Euler(rx||0,ry||0,rz||0)),new T3.Vector3(sx||1,sy||1,sz||1));return m}
function std(col,r,mt){const k=col+'|'+r+'|'+mt;if(MC[k])return MC[k];const a=A();return MC[k]=new a.THREE.MeshStandardMaterial({color:a.lin(col),roughness:r==null?.5:r,metalness:mt||0})}
/* a tube between two points (x,y,z) */
function tubeP(parts,m,ax,ay,az,bx,by,bz,r){const a=A(),T3=a.THREE,l=Math.hypot(bx-ax,by-ay,bz-az),g=GC['cyl'+r]||(GC['cyl'+r]=new T3.CylinderGeometry(r,r,1,7));
  const d=new T3.Vector3(bx-ax,by-ay,bz-az).normalize(),q=new T3.Quaternion().setFromUnitVectors(new T3.Vector3(0,1,0),d),mx=new T3.Matrix4().compose(new T3.Vector3((ax+bx)/2,(ay+by)/2,(az+bz)/2),q,new T3.Vector3(1,l,1));parts.push({g,m,mx})}
const BIKE_COLS=['#e8463a','#2f7fd6','#f2b134','#3fae6a','#c04fd0','#18b5b0','#ff7aa8'];
function bike(col,k){const a=A(),T3=a.THREE,g=new T3.Group(),paint=std(col,.32,.35),dark=std('#1b1c1f',.85,0),chrome=std('#c9cdd2',.22,.9),parts=[];
  const R=.25,W=.42,hy=R+.01;
  for(const sx of[-W,W]){parts.push({g:GC.tyre||(GC.tyre=new T3.TorusGeometry(R,.034,8,26)),m:dark,mx:M3(sx,hy,0)});parts.push({g:GC.rim||(GC.rim=new T3.TorusGeometry(R-.035,.011,5,24)),m:chrome,mx:M3(sx,hy,0)});
    parts.push({g:GC.hub||(GC.hub=new T3.CylinderGeometry(.03,.03,.09,8)),m:chrome,mx:M3(sx,hy,0,Math.PI/2)});
    for(let i=0;i<8;i++){const t=i*Math.PI/8;parts.push({g:GC.spk||(GC.spk=new T3.BoxGeometry(.006,(R-.04)*2,.006)),m:chrome,mx:M3(sx,hy,0,0,0,t)})}}
  const bb={x:-.02,y:hy},st={x:-.1,y:.66},ht={x:.3,y:.64},hl={x:.33,y:.55};
  for(const z of[-.045,.045]){tubeP(parts,paint,-W,hy,z,bb.x,bb.y,0,.016);tubeP(parts,paint,-W,hy,z,st.x+.02,st.y-.04,0,.014);tubeP(parts,chrome,W,hy,z,hl.x,hl.y,0,.015)}
  tubeP(parts,paint,bb.x,bb.y,0,st.x,st.y,0,.022);tubeP(parts,paint,st.x+.01,st.y-.05,0,ht.x,ht.y-.02,0,.021);tubeP(parts,paint,bb.x,bb.y,0,hl.x,hl.y+.02,0,.024);tubeP(parts,paint,hl.x-.01,hl.y-.03,0,ht.x+.01,ht.y+.06,0,.026);
  tubeP(parts,chrome,ht.x,ht.y+.05,0,ht.x+.02,ht.y+.17,0,.014);tubeP(parts,chrome,ht.x+.02,ht.y+.17,-.24,ht.x+.02,ht.y+.17,.24,.012);
  for(const z of[-.21,.21])tubeP(parts,dark,ht.x+.02,ht.y+.17,z*.86,ht.x+.02,ht.y+.17,z*1.18,.019);
  tubeP(parts,chrome,st.x,st.y,0,st.x-.02,st.y+.08,0,.012);parts.push({g:GC.saddle||(GC.saddle=new T3.BoxGeometry(.22,.045,.1)),m:dark,mx:M3(st.x-.03,st.y+.1,0,0,0,-.05)});
  parts.push({g:GC.ring||(GC.ring=new T3.TorusGeometry(.075,.012,5,18)),m:chrome,mx:M3(bb.x,bb.y,.06)});
  tubeP(parts,chrome,bb.x,bb.y,.07,bb.x+.06,bb.y-.13,.07,.012);tubeP(parts,chrome,bb.x,bb.y,-.07,bb.x-.06,bb.y+.13,-.07,.012);
  for(const s of[1,-1])parts.push({g:GC.ped||(GC.ped=new T3.BoxGeometry(.08,.02,.07)),m:dark,mx:M3(bb.x+.06*s,bb.y-.13*s,.11*s)});
  tubeP(parts,chrome,-.05,hy-.02,.06,-.18,.02,.14,.008);/* kickstand */
  if(k%2===0)for(const z of[-.25,.25])for(let i=0;i<3;i++)parts.push({g:GC.str||(GC.str=new T3.BoxGeometry(.012,.16,.02)),m:std(['#ff4fa3','#4fd1ff','#ffe14f'][i],.6,0),mx:M3(ht.x+.03,ht.y+.09,z*1.2+(i-1)*.015,0,0,.15*(i-1))});
  if(k%3===1)parts.push({g:GC.bell||(GC.bell=new T3.SphereGeometry(.03,10,8)),m:std('#d6b84a',.25,.9),mx:M3(ht.x+.03,ht.y+.2,.12)});
  if(k%3===2){tubeP(parts,chrome,-W+.08,.5,-.09,-.12,.52,-.09,.008);tubeP(parts,chrome,-W+.08,.5,.09,-.12,.52,.09,.008)}/* a little rear rack */
  mergeTo(g,parts);g.userData.bike=true;return g}
function rackModel(n){const a=A(),T3=a.THREE,g=new T3.Group(),m=std('#9aa3ab',.35,.8),parts=[];const sp=.72;
  tubeP(parts,m,0,.05,-.2,(n-1)*sp,.05,-.2,.025);tubeP(parts,m,0,.05,.2,(n-1)*sp,.05,.2,.025);
  for(let i=0;i<n;i++){const x=i*sp;parts.push({g:GC.hoop||(GC.hoop=new T3.TorusGeometry(.36,.026,6,16,Math.PI)),m,mx:M3(x,.05,0,0,Math.PI/2)})}
  mergeTo(g,parts);return g}
function crateModel(){const a=A(),T3=a.THREE,g=new T3.Group(),wood=std('#b9874f',.8,0),or=std('#ff9a1f',.55,0),parts=[];
  for(const y of[.05,.17])for(const s of[-1,1]){parts.push({g:GC.slat||(GC.slat=new T3.BoxGeometry(.56,.08,.02)),m:wood,mx:M3(0,y,s*.19)});parts.push({g:GC.slatS||(GC.slatS=new T3.BoxGeometry(.02,.08,.38)),m:wood,mx:M3(s*.27,y,0)})}
  parts.push({g:GC.base||(GC.base=new T3.BoxGeometry(.56,.02,.4)),m:wood,mx:M3(0,.01,0)});
  for(let i=0;i<12;i++)parts.push({g:GC.orange||(GC.orange=new T3.SphereGeometry(.055,10,8)),m:or,mx:M3(-.2+(i%4)*.13,.25+(i>7?.05:0),-.1+((i>>2)%3)*.1)});
  mergeTo(g,parts);const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');x.fillStyle='#fdf6d8';x.fillRect(0,0,256,128);x.fillStyle='#283040';x.font='bold 30px Arial';x.textAlign='center';x.fillText("FOR JEN'S",128,52);x.fillText('HUSBAND · HANK',128,94);
  const t=new T3.CanvasTexture(c);t.encoding=T3.sRGBEncoding;const card=new T3.Mesh(new T3.PlaneGeometry(.32,.16),new T3.MeshStandardMaterial({map:t,roughness:.8}));card.position.set(0,.16,.205);g.add(card);return g}
function toothSign(){const a=A(),T3=a.THREE,g=new T3.Group(),white=std('#f6f7f2',.22,0),pole=std('#5d646c',.4,.7),parts=[];
  tubeP(parts,pole,0,0,0,0,3.1,0,.07);
  const crown=GC.crown||(GC.crown=(()=>{const pts=[];for(let i=0;i<=14;i++){const t=i/14;pts.push(new T3.Vector2(.55*Math.sin(t*Math.PI*.5)+.06*Math.sin(t*Math.PI*3),.7*t))}return new T3.LatheGeometry(pts,20)})());
  parts.push({g:crown,m:white,mx:M3(0,3.55,0,Math.PI,0,0,1,.75,.8)});
  parts.push({g:GC.cap||(GC.cap=new T3.SphereGeometry(.56,20,10,0,Math.PI*2,0,Math.PI/2)),m:white,mx:M3(0,3.55,0,0,0,0,1,.48,.82)});
  for(const s of[-1,1])parts.push({g:GC.root||(GC.root=new T3.ConeGeometry(.2,.62,12)),m:white,mx:M3(s*.27,2.86,0,Math.PI,0,s*.12)});
  mergeTo(g,parts);
  /* a smile, because it's a happy tooth */
  const c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d');x.strokeStyle='#2b6fb3';x.lineWidth=9;x.lineCap='round';x.beginPath();x.arc(64,52,30,.15*Math.PI,.85*Math.PI);x.stroke();x.fillStyle='#2b6fb3';x.beginPath();x.arc(46,40,7,0,7);x.arc(82,40,7,0,7);x.fill();
  const t=new T3.CanvasTexture(c);t.encoding=T3.sRGBEncoding;for(const s of[1,-1]){const f=new T3.Mesh(new T3.PlaneGeometry(.62,.62),new T3.MeshBasicMaterial({map:t,transparent:true}));f.position.set(0,3.55,s*.47);if(s<0)f.rotation.y=Math.PI;g.add(f)}
  return g}
function caseModel(){const a=A(),T3=a.THREE,g=new T3.Group(),blk=std('#202226',.6,0),parts=[];parts.push({g:GC.case||(GC.case=new T3.CylinderGeometry(.16,.1,.9,12)),m:blk,mx:M3(0,.16,0,0,0,Math.PI/2,1,1,.7)});
  parts.push({g:GC.bell2||(GC.bell2=new T3.SphereGeometry(.2,12,10)),m:blk,mx:M3(.45,.18,0,0,0,0,1,.85,.7)});tubeP(parts,std('#b08a3a',.3,.8),-.1,.33,0,.15,.33,0,.015);mergeTo(g,parts);return g}
function paddle(){const a=A(),T3=a.THREE,g=new T3.Group(),parts=[];tubeP(parts,std('#d9d4c8',.5,.3),0,0,0,0,1.55,0,.022);
  parts.push({g:GC.oct||(GC.oct=new T3.CylinderGeometry(.27,.27,.02,8)),m:std('#f2f2ee',.5,0),mx:M3(0,1.75,0,Math.PI/2,0,Math.PI/8)});mergeTo(g,parts);
  const c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d');x.fillStyle='#c8282a';x.beginPath();for(let i=0;i<8;i++){const t=(i+.5)*Math.PI/4;x.lineTo(64+58*Math.cos(t),64+58*Math.sin(t))}x.fill();x.fillStyle='#fff';x.font='bold 34px Arial';x.textAlign='center';x.fillText('STOP',64,76);
  const t=new T3.CanvasTexture(c);t.encoding=T3.sRGBEncoding;for(const s of[1,-1]){const f=new T3.Mesh(new T3.PlaneGeometry(.5,.5),new T3.MeshBasicMaterial({map:t,transparent:true}));f.position.set(0,1.75,s*.012);if(s<0)f.rotation.y=Math.PI;g.add(f)}return g}
function ring(col,r){const a=A(),T3=a.THREE,g=new T3.Group();const d=new T3.Mesh(new T3.CylinderGeometry(r,r,.06,36),new T3.MeshBasicMaterial({color:a.lin(col),transparent:true,opacity:.38,depthWrite:false}));d.position.y=.05;g.add(d);
  const w=new T3.Mesh(new T3.CylinderGeometry(r,r,2.6,36,1,true),new T3.MeshBasicMaterial({color:a.lin(col),transparent:true,opacity:.15,side:T3.DoubleSide,depthWrite:false}));w.position.y=1.3;g.add(w);a.wmAdd(g);return g}
/* a cap for the carpool kids (team colours), parented to the head bone */
function capOn(d,col){const a=A(),T3=a.THREE;let head=null;d.root.traverse(o=>{if(!head&&o.isBone&&/Head$/i.test(o.name))head=o});const g=new T3.Group(),m=std(col,.7,0);
  const dome=new T3.Mesh(GC.capd||(GC.capd=new T3.SphereGeometry(.105,14,8,0,Math.PI*2,0,Math.PI/2)),m),brim=new T3.Mesh(GC.capb||(GC.capb=new T3.CylinderGeometry(.09,.09,.012,14,1,false,0,Math.PI)),m);
  g.add(dome);brim.position.set(0,.005,.06);brim.rotation.y=-Math.PI/2;brim.scale.set(1,1,1);g.add(brim);
  if(head){/* Rocketbox bone space: x up the spine, y forward, z left */g.rotation.z=-Math.PI/2;g.rotation.y=0;g.position.set(.12,.01,0);head.add(g)}else{g.position.y=1.9;d.root.add(g)}return g}

/* ---------- the job ---------- */
function rng(seed){let s=seed|0;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function buildStops(M){const a=A(),S=SX(),P_=places();const leg=(p,q)=>S.legTime(a,p,q,{v:T.v,turn:T.turn,pad:T.pad});
  const def=[{id:'school1',at:P_.school,name:'School',full:'Maple Heights Elementary',sub:'Maddie (band) + Ava & Mason',kind:'pickup'},
    {id:'park',at:P_.park,name:'Linden Park',full:'Linden Park · soccer',sub:'Drop Ava & Mason',kind:'drop'},
    {id:'hank',at:P_.hank,name:"Hank's",full:"Hank's Hardware",sub:"Orange slices (don't ask)",kind:'errand'},
    {id:'ortho',at:P_.ortho,name:'Dr. Feld',full:'Dr. Feld Orthodontics',sub:'Tyler · 11:00 SHARP',kind:'appt',hard:T.hardOrtho},
    {id:'school2',at:P_.school,name:'School',full:'Maple Heights Elementary',sub:'Band flyers to the office',kind:'bikes'},
    {id:'home',at:P_.home,name:'Home',full:'Home',sub:'Before Jen gets back',kind:'home',hard:T.hardHome}];
  let t=0,prev=M.car?{x:M.car.pos.x,z:M.car.pos.z}:P_.home;const out=def.map((s,k)=>{const L_=leg(prev,s.at);t+=L_.t+(k===4?T.bikesAllow:0);const st={id:s.id,name:s.name,full:s.full,sub:s.sub,kind:s.kind,x:s.at.x,z:s.at.z,yaw:s.at.yaw,r:3.8,dwell:.5,target:Math.round(t),hard:s.hard||0};
    t+=T.dwell[s.kind]||4;prev=s.at;return st});
  const sch=S.schedule(out,{soft:T.soft,clock:{start:11*3600-out[3].target*T.scale,scale:T.scale}});return sch}
/* the live state the checkpoint keeps (JSON-safe); save() refreshes it from the live objects */
function snap(M){const L_=M.live;if(!L_)return M.st;const st=M.st;st.stops=L_.S.save();st.comfort=L_.C.save();st.radio=L_.R.save();st.riders=L_.K.save();st.item=Object.assign({},M.item);return st}
J.register('taxi',{
  def:{giver:'jen',giverName:'Jen',giverLook:{role:'wife',shirt:'#c25b7a',pants:'#2d3550',hair:'#5a3a22'},hood:'maple',title:'Dad Taxi',
    role:'Jen · Has a shift. Left a list.',place:'Maple Heights, all of it',
    lines:["Saturday. I picked up a double. You have a list. It's on the fridge. Read the WHOLE list.",
      "Band pickup at the school, Ava and Mason to soccer, orange slices from Hank's, then Tyler at the orthodontist. Orthodontist at eleven. Not eleven-ish. He charges for eleven-ish.",
      "Drive like my mother is in the car. Be home before I am. I love you. Seatbelts."],
    obj:'Six stops, one clock, four kids. Hit each stop in its window, drive smoothly (they notice), and be home before Jen.',
    crew:[],weapons:['pistol'],from:{home:'fridge'},
    get start(){const p=places();return p?{x:p.home.x,z:p.home.z}:null},
    unlock:{done:['gary']},pay:400,par:0,stay:true,roam:true,order:10,
    stages:['run','bikes','back'],stageLabels:{run:'The morning run',bikes:'The bike thieves',back:'Home before Jen'},failPolicy:'escalate',
    noGuns:"Not with the kids in the car. Not ever.",
    medals:['Finished','Every stop on time','Every stop on time and a ride score of 90+'],
    radio:[['you',"Okay. The list. School first, then everything else, in order. Like a professional."]],
    endLine:"Everybody got where they were going. Mostly on time. Somebody has the trombone."},
  start(M,o){const a=A(),S=SX();if(!S){console.warn('taxi: HT.Stops missing');return}const P_=places();
    M.noGuns=this.def.noGuns;M.st={seed:(Math.random()*1e9)|0,phase:'run',choice:null,said:{},shown:0,video:0};M.item=null;M.rideCar=M.car;M.t0=0;
    const K=S.riders(),C=S.comfort({on:(k,sev)=>react(M,k,sev)}),R=S.radio({start:0,on:s=>radioReact(M,s)}),Q=S.talk(),Sch=buildStops(M);
    M.live={S:Sch,C,R,K,Q,props:{},rings:[],bikes:[],t:{chat:22,smooth:0,sick:0,route:0,radioNag:30,abandon:0},keys:{},enc:null};
    /* the cast */
    K.add('tyler',{name:'Tyler',role:'son',scale:.9,likes:'talk',hates:'kidz',prefer:[2,3,1]});
    K.add('maddie',{name:'Maddie',role:'daughter',scale:.95,likes:'kidz',hates:'talk',prefer:[3,2,1]});
    K.add('ava',{name:'Ava',role:'daughter',scale:.84,likes:'kidz',hates:'jazz',prefer:[4,6,5],dress:d=>capOn(d,'#d8342c')});
    K.add('mason',{name:'Mason',role:'son',scale:.82,likes:'rock',hates:'off',prefer:[6,4,5],dress:d=>capOn(d,'#d8342c')});
    const P=window.HT&&HT.People;const has=r=>!!(P&&P.ok&&P.has&&P.has(r));
    K.add('guard',{name:'Mr. Alvarez',role:has('neighbour')?'neighbour':'thug_beanie',speed:1.2});
    M.seedR=rng(M.st.seed);
    M.item=Object.assign({noticed:false,done:false,lost:false},ITEMS[Math.floor(M.seedR()*ITEMS.length)]);
    dress(M);
    /* Tyler rides from home */
    if(M.car)K.seatNow(K.get('tyler'),M.car);
    if(!o||!o.checkpoint){M.live.Q.say('Tyler',"Can I pick the station?");M.live.Q.say('you',"You can pick the station when you have a license.");M.live.Q.say('Tyler',"That's like six years.");M.live.Q.say('you',"Then you have six years to think about it.")}
    try{if(P&&P.preload)P.preload(['son','daughter','wife']).catch(()=>{})}catch(_){}},
  upd(dt,M,F){const a=A();if(!M.live)return;tick(dt,M,F)},
  save:M=>snap(M),
  load(M,s){M.st=JSON.parse(JSON.stringify(s));if(s.item)M.item=Object.assign({},s.item);if(M.live&&M.live.S)applyRestore(M);else M.restore=true},
  payout(M,ok){if(!ok||!M.live)return[];const S=M.live.S,n=S.onTime(),avg=M.live.C.avg(),out=[];
    out.push(['On-time stops ×'+n+' of 6',T.stopPay*n]);
    if(avg>=80)out.push(['Smooth ride · score '+Math.round(avg),T.smoothPay]);else out.push(['Ride score '+Math.round(avg)+' · "the braking"',0]);
    if(M.item&&M.item.done)out.push(['Nobody forgot anything ('+M.item.name+')',T.itemPay]);else if(M.item)out.push(['Left behind: the '+M.item.name,0]);
    if(M.st.video)out.push(["Maddie's video · "+M.st.video+' views',T.videoPay]);
    if(M.st.choice==='ride')out.push(['Two teenagers, one crossing guard',0]);else if(M.st.choice==='zip')out.push(['Zip-tied by Rick ×2',0]);
    return out},
  medal(M){if(!M.live)return 1;const all=M.live.S.stops.every(s=>s.done&&s.onTime);return all&&M.live.C.avg()>=90?3:all?2:1},
  end(M,ok){if(!ok||M.replay)return;const SV=A().SV(),H=window.HT&&HT.Save;if(!SV)return;try{SV.flags.taxiDone=true;if(M.st.choice==='ride')SV.flags.maddieProud=true;
      if(H&&H.album&&M.st.video)H.album(null,{id:'taxi-block',job:'taxi',item:'The minivan block on Route 9',stars:M.st.choice==='ride'?3:2,day:SV.day,jpg:null});
      if(H&&H.touch)H.touch('flags')}catch(e){console.warn(e)}},
  test:{give(a){},step:(a,t,o)=>bot(a,t,o||{}),
    sample:()=>({st:{seed:7,phase:'bikes',choice:null,said:{a:1},shown:3,video:0,stops:[{done:true,at:40,late:-3,onTime:true,stars:5,comfort:95}],comfort:{v:88,sum:4000,time:45,n:{brake:1,corner:0,kerb:0,bump:0,speed:0}},radio:1,riders:[{id:'tyler',state:'seat',seat:2,x:0,z:0,yaw:0}],item:{k:2,id:'card',noticed:true,done:false,lost:false}},item:{k:2,id:'card'}})}
});

/* the props for this run: the school rack with the bikes on it, Hank's crate, Dr. Feld's tooth, the crossing guard */
function dress(M){const a=A(),P_=places(),L_=M.live,pr=L_.props;
  const rk=rackModel(6);rk.position.set(P_.rack.x,a.groundAt(P_.rack.x,P_.rack.z),P_.rack.z);const ry=Math.atan2(P_.school.side.x,P_.school.side.z);rk.rotation.y=ry;a.wmAdd(rk);pr.rack=rk;
  M.live.rackYaw=ry;L_.bikes=[];for(let i=0;i<6;i++){const b=bike(BIKE_COLS[i],i);a.wmAdd(b);L_.bikes.push(b)}bikesTo(M,'rack');
  if(!P_.site){const sx=P_.school.x+P_.school.side.x*3.6,sz=P_.school.z+P_.school.side.z*3.6;pr.sign=a.wmSign(['MAPLE HEIGHTS ELEMENTARY','Saturday: band 9-10:30 · Go Cougars'],sx+3,sz,Math.atan2(-P_.school.side.x,-P_.school.side.z),{bg:'#2b4f7a',w:3.6})}
  const cr=crateModel();cr.position.set(P_.hankBox.x,a.groundAt(P_.hankBox.x,P_.hankBox.z),P_.hankBox.z);cr.rotation.y=P_.hank.yaw;a.wmAdd(cr);pr.crate=cr;
  const th=toothSign();th.position.set(206.8,a.groundAt(206.8,37.6),37.6);th.rotation.y=Math.PI/2;a.wmAdd(th);pr.tooth=th;
  pr.ortho=a.wmSign(['DR. FELD ORTHODONTICS','Braces · Retainers · On time, every time'],211.5,37.4,Math.PI,{bg:'#e9f1f6',fg:'#2b6fb3',w:3.4});
  const g=L_.K.get('guard');a.wmAdd(pr.paddle=paddle());L_.K.place(g,P_.guard.x,P_.guard.z,Math.atan2(-P_.school.side.x,-P_.school.side.z));
  pr.paddle.position.set(P_.guard.x+.45,a.groundAt(P_.guard.x,P_.guard.z),P_.guard.z);
  /* the forgotten trombone waits by the rack once it's been left */
  const cs=caseModel();a.wmAdd(cs);cs.visible=false;cs.position.set(P_.rack.x+.6,a.groundAt(P_.rack.x,P_.rack.z),P_.rack.z+.8);pr.trombone=cs}
/* the bikes: on the rack, gone, in a pickup bed (an object to ride on), or back on the rack */
function bikesTo(M,where,host){const a=A(),P_=places(),L_=M.live;L_.bikes.forEach((b,i)=>{if(b.parent&&b.parent!==a.scene&&where!=='bed'){b.parent.remove(b);a.wmAdd(b)}
  if(where==='gone'){b.visible=false;return}b.visible=true;
  if(where==='rack'){const ry=L_.rackYaw,fx=Math.cos(ry),fz=-Math.sin(ry),x=P_.rack.x+fx*(i*.72),z=P_.rack.z+fz*(i*.72);b.position.set(x,a.groundAt(x,z),z);b.rotation.set(0,ry+Math.PI/2+(i%2?Math.PI:0),.02*(i%3-1))}
  else if(where==='bed'&&host){if(b.parent)b.parent.remove(b);host.add(b);/* car model space: x forward (+) along the length, z across */b.position.set(-1.1-(i%3)*.4,1.05+(i>2?.32:0),(i%2?.38:-.38));b.rotation.set(i%2?.5:-.5,(i%2?0:Math.PI)+.15*(i%3),0)}})}

function stopRing(M){const L_=M.live;if(!L_.ringCur)L_.ringCur=ring('#ffc94a',3.8);if(!L_.ringItem)L_.ringItem=ring('#ff8a3d',3.3);return L_}
function inCar(M){return M.live.K.inCar()}
function speaker(M,pref){const ins=inCar(M).filter(r=>r.id!=='guard');if(!ins.length)return null;if(pref){const r=ins.find(x=>x.id===pref);if(r)return r}return pickA(ins)}
function say(M,who,text,o){M.live.Q.say(who,text,o||{})}
function sayAll(M,lines,o){for(const[w,t]of lines)say(M,w,t,o)}
function react(M,k,sev){const L_=M.live;if(!L_)return;const kids=inCar(M).filter(r=>!/thief/.test(r.id));if(!kids.length)return;
  if(k==='brake'&&!M.st.said.grandpa&&kids.some(r=>r.id==='tyler')){M.st.said.grandpa=1;sayAll(M,[['Tyler',"You braked like Grandpa."],['you',"Grandpa is a very safe driver."],['Tyler',"Grandpa hit a mailbox."]]);return}
  if(L_.Q.busy())return;const r=k==='speed'&&kids.some(x=>x.id==='tyler')&&Math.random()<.4?kids.find(x=>x.id==='tyler'):pickA(kids);say(M,r.name,pickA(REACT[k]||REACT.bump))}
function radioReact(M,s){const kids=inCar(M).filter(r=>r.likes);M.live.t.radioNag=40;if(!kids.length)return;const lk=kids.filter(r=>r.likes===s.id),ht=kids.filter(r=>r.hates===s.id);
  M.live.Q.clear();if(lk.length&&(!ht.length||Math.random()<.5)){const r=pickA(lk);say(M,r.name,pickA(RADIO_LINES.like[s.id]||["Ooh. Okay."]))}else if(ht.length){const r=pickA(ht);say(M,r.name,pickA(RADIO_LINES.hate[s.id]||["Ugh."]))}}

/* ---------- per frame ---------- */
function tick(dt,M,F){const a=A(),L_=M.live,S=L_.S,C=L_.C,K=L_.K,P_=places();
  if(M.restore){M.restore=false;applyRestore(M)}
  /* the ride follows the dad into any car close enough that seats everyone */
  if(a.CV&&a.CV!==M.rideCar){const cv=a.CV,old=M.rideCar,riders=inCar(M);const near=old&&hyp(cv.pos.x-old.pos.x,cv.pos.z-old.pos.z)<14;
    if(!riders.length||!old){M.rideCar=cv}else if(near&&SX().seatCount(cv)>riders.length){for(const r of riders){r.seat=-1;r.state='off'}for(const r of riders)K.seatNow(r,cv);M.rideCar=cv;say(M,'you',"Everybody out. Everybody in. New car. Seatbelts.",{now:true})}
    else if(!L_.t.swapSaid){L_.t.swapSaid=1;say(M,riders[0].name,SX().seatCount(cv)<=riders.length?"We don't all fit in that, Dad.":"Dad. We're in THIS car.",{now:true})}}
  const car=M.rideCar,driving=!!(a.CV&&a.CV===car);
  /* timers, comfort, radio */
  const t=M.elapsed;const kids=inCar(M);const offRoad=driving&&offRoadAt(a,car);
  if(driving)C.update(dt,car,{riders:kids.length,mood:L_.R.mood(kids.filter(r=>r.likes)),offRoad});
  L_.R.update(dt,(w,x,o)=>{if(!L_.Q.busy())say(M,w,x,o)});L_.Q.update(dt);K.update(dt,car);
  if(driving&&a.keys.r&&!L_.keys.r)L_.R.next();L_.keys.r=!!a.keys.r;
  for(const k of['1','2'])L_.keys['p'+k]=L_.keys[k],L_.keys[k]=!!a.keys[k];
  chatter(dt,M,kids,driving);
  /* the kids are never left alone, and nobody wrecks the van with them in it */
  if(kids.length&&car&&!driving){const d=hyp(a.P.pos.x-car.pos.x,a.P.pos.z-car.pos.z);if(d>T.abandonR)return a.endMission(false,"You walked away from a car full of kids. Jen has been informed. By all of them.","You left the kids in the car.");
    if(d>25&&!L_.t.walkSaid){L_.t.walkSaid=1;say(M,kids[0].name,"Dad? DAD? Where are you going?",{now:true})}}
  if(car&&car.car&&car.car.hp<=0)return a.endMission(false,"The van's done. Sal's sending the tow truck. Jen is sending a text.","The van gave up.");
  /* the stages */
  if(M.st.phase==='bikes')encounter(dt,M,F);else stopsFlow(dt,M,F);
  if(!M||M.state!=='go')return;
  item(dt,M,F);
  /* hard deadlines */
  const cur=S.cur();if(cur&&cur.hard&&M.st.phase!=='bikes'&&cur.at==null&&S.left(cur,t)<=0){
    if(cur.id==='ortho')return a.endMission(false,"Dr. Feld charges for eleven-ish. Jen is going to see that bill.","Late for the orthodontist.");
    if(cur.id==='home')return a.endMission(false,"Jen got home first. She's reading the list back to you. Out loud.","Jen beat you home.")}
  if(cur&&cur.id==='home')jenCar(dt,M,cur);
  hud(dt,M,F);
  /* the GPS line to the marker (the hub's GPS is off during jobs) */
  L_.t.route-=dt;if(L_.t.route<=0&&F.target&&a.HUD&&a.HUD.minimap&&a.HUD.minimap.route){L_.t.route=1.4;try{const pts=SX().route(a,{x:a.P.pos.x,z:a.P.pos.z},F.target);a.HUD.minimap.route(pts)}catch(_){}}}
function offRoadAt(a,car){const G=a.roads&&a.roads();if(!G)return false;const r=G.nearestRoad(car.pos.x,car.pos.z);if(!r||r.dist<4.4)return false;
  /* parking lots and driveways are paved too: only the kerb/grass counts */const W=a.WORLD,g=a.L&&a.L.g;if(g){const tx=Math.floor(car.pos.x/2),tz=Math.floor(car.pos.z/2),c=(g[tz]||[])[tx];if(c===','||c==='='||c==='V'||c==='l')return false}return true}
function chatter(dt,M,kids,driving){const L_=M.live,C=L_.C;if(!driving||!kids.length)return;
  L_.t.chat-=dt;const ids=kids.map(r=>r.id);if(L_.t.chat<=0&&!L_.Q.busy()){L_.t.chat=26+Math.random()*12;const pool=CHATTER.filter((c,i)=>!M.st.said['c'+i]&&c.every(([w])=>w==='you'||ids.includes(w.toLowerCase())));
    if(pool.length){const c=pickA(pool);M.st.said['c'+CHATTER.indexOf(c)]=1;sayAll(M,c)}}
  if(C.v>=99.5)L_.t.smooth+=dt;else L_.t.smooth=0;if(L_.t.smooth>34&&!L_.Q.busy()){L_.t.smooth=-60;say(M,pickA(kids).name,pickA(REACT.smooth))}
  if(C.v<35){L_.t.sick+=dt;if(L_.t.sick>3&&!L_.Q.busy()){L_.t.sick=-12;say(M,pickA(kids).name,pickA(REACT.sick),{now:true})}}else L_.t.sick=Math.min(L_.t.sick,0);
  /* a passenger who hates the station will say so, now and then */
  L_.t.radioNag-=dt;if(L_.t.radioNag<=0&&!L_.Q.busy()){L_.t.radioNag=45;const s=L_.R.cur(),h=kids.filter(r=>r.hates===s.id);if(h.length)say(M,h[0].name,pickA(RADIO_LINES.hate[s.id]||["Can we change it?"]))}}

/* the stop flow: arrive (parked in the ring) -> the stop's little scene -> rating -> next */
function stopsFlow(dt,M,F){const a=A(),L_=stopRing(M),S=L_.S,C=L_.C,K=L_.K,P_=places(),s=S.cur(),car=M.rideCar,t=M.elapsed;
  if(!s){L_.ringCur.visible=false;return}
  L_.ringCur.visible=!L_.busy;L_.ringCur.position.set(s.x,a.groundAt(s.x,s.z),s.z);
  if(!L_.busy){F.target={x:s.x,z:s.z,label:s.full};
    if(s.id==='school1'&&a.CV&&hyp(a.CV.pos.x-s.x,a.CV.pos.z-s.z)<40)say(M,'Maddie (text)',"Can we not be the first car in line. Please. Everyone will see.",{once:'first'});
    const driving=a.CV&&a.CV===car;
    if(driving&&S.inRing(s,car,dt)){
      if(s.kind==='pickup'&&SX().seatCount(car)<T.seatsNeed){if(!L_.t.seatSay){L_.t.seatSay=1;say(M,'Maddie',"Dad. There are five of us. That's a "+((car.type||'car').replace('hatch','hatchback'))+".",{now:true});say(M,'you',"Right. The minivan. I knew that.")}}
      else{S.arrive(s,t);L_.busy={s,t0:t,step:0};startScene(M,s)}}}
  else{const b=L_.busy;if(!a.CV||a.CV!==car||Math.abs(car.spd)>1.6){if(!b.moved){b.moved=1;const r=inCar(M)[0]||K.list.find(x=>x.state==='boarding');if(r)say(M,r.name,"DAD. I'm not IN yet.",{now:true})}}else b.moved=0;
    if(b.done){L_.busy=null;finishStop(M,s)}}}
function finishStop(M,s){const a=A(),L_=M.live,S=L_.S,C=L_.C;const leg=C.legAvg();S.finish(s,leg);C.legReset();
  const rate=s.stars>=5?"Five stars":s.stars>=4?"Four stars":s.stars>=3?"Three stars":"Two stars";
  L_.panel&&L_.panel.toastShow('Stop '+(s.k+1)+' of 6 · '+s.name,S.timing(s),(s.late<=0?'On the dot':s.onTime?(Math.round(s.late)+' s behind'):Math.round(s.late)+' s late')+' · ride '+C.word(leg).toLowerCase(),s.stars);
  try{const au=window.HT&&HT.Audio;au&&au.ui&&au.ui(s.onTime?'objective':'denied')}catch(_){}
  if(s.id==='park')say(M,'Mason',rate+"! "+(s.stars>=4?"Would ride again.":"The braking, though."));
  if(s.id==='ortho'){startBikes(M);return}
  if(s.id==='home'){finale(M);return}}
/* each stop's scene; set busy.done when it's over */
function startScene(M,s){const a=A(),L_=M.live,K=L_.K,P_=places(),car=M.rideCar,b=L_.busy;
  const walkIn=(r,from,then)=>{K.place(r,from.x,from.z);K.board(r,from,car,then)};
  if(s.id==='school1'){const m=K.get('maddie'),av=K.get('ava'),ms=K.get('mason');const base=P_.rack;let n=0;const fin=()=>{if(++n>=3)b.done=true};
    walkIn(m,{x:base.x+1.5,z:base.z+.5},fin);walkIn(av,{x:base.x+3,z:base.z+.9},()=>{say(M,'Ava',"My mom lets me sit in the front.");say(M,'you',"Your mom is not here.");fin()});walkIn(ms,{x:base.x+4.4,z:base.z+.4},fin);
    av.speed=1.9;ms.speed=2;say(M,'Maddie',"Hi. Don't talk to anyone. Just drive.",{now:true})}
  else if(s.id==='park'){let n=0;const fin=()=>{if(++n>=2)b.done=true};for(const id of['ava','mason']){const r=K.get(id);K.alight(r,{x:P_.field.x+(id==='ava'?-1:1.2),z:P_.field.z},car,fin)}
    say(M,'Ava',"Bye! Thanks for the ride, Mr. Maddie's dad!",{now:true})}
  else if(s.id==='hank'){const m=K.get('maddie');say(M,'you',"Hank's. Orange slices. The list says 'don't ask', so I'm not asking.",{now:true});
    K.alight(m,P_.hankBox,car,()=>{L_.props.crate.visible=false;say(M,'Maddie',"There's a box on the curb that says FOR JEN'S HUSBAND.");say(M,'Hank (text)',"Curbside pickup. I'm trying something. Don't tell anyone it's a hardware store.");
      setTimeout0(M,1.2,()=>K.board(m,{x:m.x,z:m.z},car,()=>{say(M,'Maddie',"It's oranges. From a hardware store. I have questions.");b.done=true}))})}
  else if(s.id==='ortho'){const ty=K.get('tyler');say(M,'Tyler',"If he says 'open wide' I'm leaving.",{now:true});
    K.alight(ty,P_.orthoDoor,car,()=>{K.hide(ty);setTimeout0(M,T.dwell.appt-1,()=>{K.place(ty,P_.orthoDoor.x,P_.orthoDoor.z);K.board(ty,P_.orthoDoor,car,()=>{say(M,'Tyler',"My teeth feel like a fence.");b.done=true})})},{hide:false})}
  else if(s.id==='school2'){arriveSchool2(M,b)}
  else if(s.id==='home'){b.done=true}}
/* a small scheduler on game time (pausing with the game) */
function setTimeout0(M,sec,fn){(M.live.timers||(M.live.timers=[])).push({t:sec,fn})}
function timers(dt,M){const L_=M.live;if(!L_.timers)return;for(const x of L_.timers.slice()){x.t-=dt;if(x.t<=0){L_.timers.splice(L_.timers.indexOf(x),1);try{x.fn()}catch(e){console.warn(e)}}}}

/* ---------- the forgotten item ---------- */
function item(dt,M,F){const a=A(),L_=stopRing(M),S=L_.S,it=M.item,P_=places(),car=M.rideCar;timers(dt,M);L_.ringItem.visible=false;
  if(!it||it.done||it.lost)return;const s=S.stops[it.k];if(!s.done)return;
  if(M.st.phase==='bikes')return;
  const d=car?hyp(car.pos.x-s.x,car.pos.z-s.z):0;
  if(!it.noticed){if(d>T.noticeD&&!L_.busy){it.noticed=true;M.live.Q.clear();for(const[w,x]of it.notice)say(M,w,x);
      if(it.id==='trombone'&&L_.props.trombone)L_.props.trombone.visible=true;try{const au=window.HT&&HT.Audio;au&&au.ui&&au.ui('objective')}catch(_){}}return}
  L_.ringItem.visible=!it.busy;L_.ringItem.position.set(s.x,a.groundAt(s.x,s.z),s.z);
  if(!L_.busy&&!it.busy)F.target={x:s.x,z:s.z,label:'The '+it.name+' · '+it.where};
  if(it.busy||L_.busy)return;
  const driving=a.CV&&a.CV===car;const r=it.owner==='ava'?M.live.K.get('ava'):M.live.K.get(it.owner);
  if(driving&&hyp(car.pos.x-s.x,car.pos.z-s.z)<3.4&&Math.abs(car.spd)<1.4){it.busy=true;const K=M.live.K;
    const fin=()=>{it.done=true;it.busy=false;for(const[w,x]of it.got)say(M,w,x);try{const au=window.HT&&HT.Audio;au&&au.ui&&au.ui('pickup')}catch(_){}};
    if(it.owner==='ava'){/* Ava runs back from the field */const av=K.get('ava'),dr=K.door(car,3);K.goto(av,dr,()=>{say(M,'Tyler',"Here. Your shin guard. It smelled weird so I held it with two fingers.");K.goto(av,{x:places().field.x,z:places().field.z},null,2.2);fin()},2.6)}
    else{const runner=r&&r.state==='seat'?r:inCar(M)[0];const to=it.id==='trombone'?{x:places().rack.x+.6,z:places().rack.z+.8}:it.id==='retainer'?places().orthoDoor:places().hankBox;
      K.alight(runner,to,car,()=>{if(it.id==='trombone'&&L_.props.trombone)L_.props.trombone.visible=false;setTimeout0(M,.6,()=>K.board(runner,{x:runner.x,z:runner.z},car,fin))})}}}

/* ---------- the bike thieves ---------- */
function startBikes(M){const a=A(),L_=M.live;M.st.phase='bikes';a.CP.mark('bikes');encounterInit(M,false)}
function encounterInit(M,restored){const a=A(),L_=M.live,P_=places(),S=SX();bikesTo(M,'gone');
  const obj=a.makeVehicle('pickup','#8c2f25')||a.makeVanBox('#8c2f25');a.wmAdd(obj);const col=a.wmCol({x0:0,z0:0,x1:0,z1:0});
  const startAt={x:P_.school.x+4,z:P_.school.z};const pts=S.route(a,startAt,P_.bridge);
  const cr=S.cruiser({obj,points:pts,speed:T.thiefSpeed,accel:4.5,len:5.6,wid:2.05,col});cr.spd=0;
  bikesTo(M,'bed',obj);
  const E=L_.enc={cr,delay:restored?T.thiefDelay-2:T.thiefDelay,block:0,stuck:0,side:1,state:'call',t:0,thieves:[],rick:null,said:{},rec:false};
  /* the two kids in the cab: teenagers, not monsters */
  const P=window.HT&&HT.People;const K=L_.K;for(const[i,v]of[[0,'thug_hoodie'],[1,'thug_brown']].entries()){let r=K.get('thief'+i);
    if(!r)r=K.add('thief'+i,{name:i?'Kid in the passenger seat':'Kid driving',role:v,scale:.9,speed:3.3});r.state='off';E.thieves.push(r)}
  E.proxy={type:'pickup',get pos(){return{x:cr.x,z:cr.z}},get yaw(){return cr.yaw},obj};
  E.thieves.forEach((r,i)=>{r.seat=i;r.state='cab'});
  if(!restored){const Q=L_.Q;Q.clear();sayAll(M,[['Marcy (phone)',"It's Marcy. From carpool. Somebody just took every bike off the school rack. Two kids in a red pickup. They're heading for the bridge."],
    ['you',"On it. Kids, seatbelts. We're doing a thing."],['Rick (radio)',"I'm at Fill-Er-Up. I see the road. You hold the road, I've got the two guys. This is a two-man drill."],
    ['Maddie',"Are we CHASING someone? In the MINIVAN?"],['you',"We're not chasing. We're parking. Aggressively."]])}
  try{const au=window.HT&&HT.Audio;if(au){au.music('tension');au.setIntensity&&au.setIntensity(.8)}}catch(_){}}
function encounter(dt,M,F){const a=A(),L_=M.live,E=L_.enc,P_=places(),K=L_.K,car=M.rideCar;if(!E)return encounterInit(M,true);if(L_.ringCur)L_.ringCur.visible=false;
  const cr=E.cr;E.t+=dt;
  /* thieves in their seats (a second rider set riding the pickup) */
  for(const r of E.thieves)if(r.state==='cab'){const s=[[.45,.78,-.42],[.45,.78,.42]][r.seat],f={x:-Math.sin(cr.yaw),z:-Math.cos(cr.yaw)},rt={x:Math.cos(cr.yaw),z:-Math.sin(cr.yaw)},sc=r.d.root.scale.y;
    r.d.root.visible=true;r.d.root.position.set(cr.x+f.x*s[0]+rt.x*s[2],cr.obj.position.y+s[1]-.59*sc-(1-sc)*.32,cr.z+f.z*s[0]+rt.z*s[2]);r.d.root.rotation.set(0,cr.yaw+Math.PI,0);try{HT.People.pose(r.d,dt,{mode:'sit',aim:false})}catch(_){}}
  if(E.state==='call'){E.delay-=dt;if(E.delay<=0){E.state='drive';say(M,'Rick (radio)',"Red pickup, coming your way on Route 9. Get in front of it and STOP.")}cr.sync(dt)}
  else if(E.state==='drive'){const blk=a.CV?[{x:a.CV.pos.x,z:a.CV.pos.z,yaw:a.CV.yaw,len:a.carSize?a.carSize(a.CV).l:4.6,wid:a.carSize?a.carSize(a.CV).w:2}]:[];
    cr.update(dt,blk);const near=a.CV&&hyp(a.CV.pos.x-cr.x,a.CV.pos.z-cr.z);
    if(near<26&&!E.said.see){E.said.see=1;sayAll(M,[['Kid driving',"Is that a minivan blocking us? Just go around."],['Kid in the passenger seat',"There's like eight kids in there. Don't."]]);if(!E.rec){E.rec=true;say(M,'Maddie',"I'm filming this. For evidence. And also for content.")}}
    if(near<9&&!E.said.kids){E.said.kids=1;say(M,'Kid in the passenger seat',"Not with kids in it, man, are you crazy?",{now:true})}
    const holding=(cr.blocked&&cr.spd<1.5||cr.revT>0)&&a.CV&&Math.abs(a.CV.spd)<4;
    if(holding){E.block+=dt;if(cr.revT<=0)E.stuck+=dt;if(E.stuck>T.swerveAfter){E.stuck=0;const bs=cr.lastSide||0,side=Math.abs(bs)>.4?-Math.sign(bs):(Math.random()<.5?1:-1);cr.want=side*T.swerveOff;cr.reverse(T.reverse);say(M,'Kid driving',pickA(["Go around! GO AROUND!","Other side! Other side!","Why is he so good at parking?!","Back up! Back UP!"]),{low:true})}}
    else{E.block=Math.max(0,E.block-dt*.5);if(!cr.blocked){E.stuck=0;if(cr.spd>6)cr.want*=Math.max(0,1-dt*.5)}}
    if(E.block>=T.blockNeed){E.state='bail';blocked(M)}
    else if(cr.done){return a.endMission(false,"They made the bridge. Rick got the plate. Officer Dana says 'next time, block the road'.","The bikes got away.")}
    F.target={x:cr.x,z:cr.z,label:'Red pickup · block it'}}
  else if(E.state==='bail'||E.state==='caught'||E.state==='choice'||E.state==='resolve'){cr.sync(dt);rickRun(dt,M,F)}
  /* the HUD meter for the block */
  const p=L_.panel;if(p){const sl=p.slot('block');if(E.state==='drive'){const v=E.block/T.blockNeed,html=`<div class="stx-blk"><div class="k">${E.block>0?'BLOCKING':'BLOCK THE PICKUP'}</div><div class="stx-bar"><i style="width:${Math.round(v*100)}%"></i></div><div class="s">${cr.blocked?'Hold it… stay in its way':'Get in front of it and stop · 3 s'}</div></div>`;if(sl._h!==html){sl._h=html;sl.innerHTML=html}}else if(sl._h){sl._h='';sl.innerHTML=''}
    const rc=p.slot('rec','side');const on=E.rec&&E.state!=='done';const h2=on?'<div class="stx-rec"><b></b> REC · Maddie</div>':'';if(rc._h!==h2){rc._h=h2;rc.innerHTML=h2}}}
function blocked(M){const a=A(),L_=M.live,E=L_.enc,cr=E.cr,K=L_.K,P_=places();cr.spd=0;
  a.banner('BLOCKED','A minivan, a dad, and absolutely no hurry.',2.4);try{const au=window.HT&&HT.Audio;au&&au.ui&&au.ui('objective')}catch(_){}
  M.st.video=280+Math.floor(Math.random()*400);
  /* they bail and run for the bridge on foot; Rick comes out of Fill-Er-Up */
  const f={x:-Math.sin(cr.yaw),z:-Math.cos(cr.yaw)},rt={x:Math.cos(cr.yaw),z:-Math.sin(cr.yaw)};
  E.thieves.forEach((r,i)=>{const s=i?1:-1;r.state='stand';r.x=cr.x+rt.x*s*1.6+f.x*.4;r.z=cr.z+rt.z*s*1.6+f.z*.4;const away={x:r.x+(P_.bridge.x>r.x?1:-1)*18+(i?2:0),z:r.z+rt.z*s*2};K.goto(r,away,()=>{},3.3)});
  sayAll(M,[['Kid driving',"Run!"],['Kid in the passenger seat',"Run WHERE? That's the river!"]]);
  const rk=K.get('rick')||K.add('rick',{name:'Rick',speed:5,make:()=>a.makeDude(a.HOMIES.rick)});const st={x:P_.gas.x,z:P_.gas.z};K.place(rk,st.x,st.z);E.rick=rk;rk.speed=5.2}
function rickRun(dt,M,F){const a=A(),L_=M.live,E=L_.enc,K=L_.K,rk=E.rick,P_=places();if(!rk)return;
  if(E.state==='bail'){const tgt=E.thieves.find(r=>!r.caught);if(!tgt){E.state='caught';return}
    rk.walk={to:{x:tgt.x,z:tgt.z},sp:5.4};rk.state='walking';F.target={x:tgt.x,z:tgt.z,label:'Rick has it'};
    if(hyp(rk.x-tgt.x,rk.z-tgt.z)<1.3){tgt.caught=true;tgt.walk=null;tgt.state='stand';tgt.mode='hands';rk.walk=null;rk.state='stand';
      if(!E.said.coach){E.said.coach=1;sayAll(M,[['Kid driving',"Okay! Okay. ...Coach Rick? From Little League?"],['Rick',"Marcus. You had a great swing. What happened?"]])}
      if(E.thieves.every(r=>r.caught)){E.state='choice';E.choiceT=0;for(const r of E.thieves){r.walk=null;r.state='stand';r.mode='hands'}}
      else{const o=E.thieves.find(r=>!r.caught);o.speed=2.2}}}
  else if(E.state==='choice'){E.choiceT+=dt;F.target={x:rk.x,z:rk.z,label:'Your call'};choiceCard(M)}
  else if(E.state==='resolve'){/* Rick drives the bikes to the school; you go too */}}
function choiceCard(M){const a=A(),L_=M.live,E=L_.enc,p=L_.panel,car=M.rideCar;if(!p)return;const free=car?L_.K.free(car):0,canRide=free>=2;
  if(!E.said.ask){E.said.ask=1;say(M,'Rick',"Your call, chief. Zip-ties, or...?",{now:true})}
  const sl=p.slot('choice');const html=`<div class="stx-choice"><div class="k">Two teenagers, six bikes, one dad</div>
   <button data-c="zip"><span class="key">1</span><b>Zip-ties</b><i>Rick's got them · +2 trust each</i></button>
   <button data-c="ride" ${canRide?'':'disabled'}><span class="key">2</span><b>Give them a ride</b><i>${canRide?"To Mr. Alvarez, the crossing guard · +5 trust":'No room in this car'}</i></button></div>`;
  if(sl._h!==html){sl._h=html;sl.innerHTML=html;sl.querySelectorAll('button').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(!b.disabled)choose(M,b.dataset.c)}))}
  const k=L_.keys;if(k['1']&&!k.p1)choose(M,'zip');else if(k['2']&&!k.p2&&canRide)choose(M,'ride');
  else if(E.choiceT>14){say(M,'Rick',"I'll take that as a zip-tie.");choose(M,'zip')}}
function choose(M,c){const a=A(),L_=M.live,E=L_.enc,K=L_.K,car=M.rideCar,P_=places();if(E.state!=='choice')return;E.state='resolve';M.st.choice=c;const sl=L_.panel&&L_.panel.slot('choice');if(sl){sl._h='';sl.innerHTML=''}
  try{const au=window.HT&&HT.Audio;au&&au.ui&&au.ui('click')}catch(_){}
  const done=()=>{E.state='done';rickDrive(M);M.st.phase='back';L_.ringCur&&(L_.ringCur.visible=true);a.CP.mark('back');try{L_.R.apply()}catch(_){}};
  if(c==='zip'){for(const r of E.thieves){r.mode='kneel';a.addTrust(2);a.feed('Zip-tied by Rick','trust','+2 trust')}try{window.HT.Audio.zipTie&&window.HT.Audio.zipTie()}catch(_){}
    sayAll(M,[['Rick',"Two zip-ties, zero drama. They can ride in the back with the bikes and think about it."],['Kid in the passenger seat',"Can you not post that?"],['Maddie',"It already has "+M.st.video+" views."]]);
    setTimeout0(M,2.2,()=>{for(const r of E.thieves){r.state='off';r.d.root.visible=false}E.thieves.forEach((r,i)=>{r.bed=i});done()})}
  else{let n=0;sayAll(M,[['you',"Get in. Back row. Seatbelts. I'm not asking."],['Kid driving',"Is this a kidnapping?"],['Maddie',"It's a carpool."]]);
    for(const r of E.thieves){r.mode=null;r.prefer=[5,6,4];K.board(r,{x:r.x,z:r.z},car,()=>{if(++n>=2){sayAll(M,[['Tyler',"Do you guys want a granola bar?"],['Kid in the passenger seat',"...What kind?"]]);done()}})}}}
/* Rick takes the pickup and the bikes back to the school */
function rickDrive(M){const a=A(),L_=M.live,E=L_.enc,P_=places(),S=SX(),cr=E.cr;if(E.rick){E.rick.state='off';E.rick.d.root.visible=false}
  const dst={x:P_.school.x+9,z:P_.school.z};const pts=S.route(a,{x:cr.x,z:cr.z},dst);const nc=S.cruiser({obj:cr.obj,points:pts,speed:9,accel:3.5,len:5.6,wid:2.05,col:cr.col});nc.spd=0;E.cr=nc;E.rickDriving=true;
  E.rickSeat=true;if(M.st.choice==='zip')E.thieves.forEach((r,i)=>{r.state='bed';r.d.root.visible=true})}
/* the pickup keeps rolling to school while you drive the rest */
function rickTick(dt,M){const a=A(),L_=M.live,E=L_.enc;if(!E||!E.rickDriving)return;const cr=E.cr;if(!cr.done)cr.update(dt,a.CV?[{x:a.CV.pos.x,z:a.CV.pos.z,yaw:a.CV.yaw,len:4.8,wid:2}]:[]);else cr.sync(dt);
  if(!E.rickDude){E.rickDude=true;const rk=E.rick;if(rk)rk.d.root.visible=true}
  const rk=E.rick;if(rk){const f={x:-Math.sin(cr.yaw),z:-Math.cos(cr.yaw)},rt={x:Math.cos(cr.yaw),z:-Math.sin(cr.yaw)};rk.state='x';rk.d.root.visible=true;rk.d.root.position.set(cr.x+f.x*.45-rt.x*.42,cr.obj.position.y+.78-.59,cr.z+f.z*.45-rt.z*.42);rk.d.root.rotation.set(0,cr.yaw+Math.PI,0);try{HT.People.pose(rk.d,dt,{mode:'sit',aim:false})}catch(_){}}
  for(const r of E.thieves)if(r.state==='bed'){const i=r.bed||0,s=[[-1.35,1.12,-.62,-Math.PI/2],[-2.15,1.12,.62,Math.PI/2]][i],f={x:-Math.sin(cr.yaw),z:-Math.cos(cr.yaw)},rt={x:Math.cos(cr.yaw),z:-Math.sin(cr.yaw)};
    r.d.root.position.set(cr.x+f.x*s[0]+rt.x*s[2],cr.obj.position.y+s[1]-.59*.9-.03,cr.z+f.z*s[0]+rt.z*s[2]);r.d.root.rotation.set(0,cr.yaw+Math.PI+s[3],0);try{HT.People.pose(r.d,dt,{mode:'sit',aim:false})}catch(_){}}}
function arriveSchool2(M,b){const a=A(),L_=M.live,K=L_.K,E=L_.enc,P_=places(),car=M.rideCar;
  bikesTo(M,'rack');if(E&&E.cr&&!E.cr.done){/* Rick was slower than you: he pulls in now */E.cr.d=E.cr.total-.01}
  say(M,'Rick',"Bikes are back on the rack. Every one. The red one has a bell. Somebody's crying a little. It's me.",{now:true});
  try{const au=window.HT&&HT.Audio;au&&au.voice&&au.voice('kid_yay',null,{vol:.6})}catch(_){}
  const g=K.get('guard');
  if(M.st.choice==='ride'){let n=0;const th=[K.get('thief0'),K.get('thief1')].filter(r=>r&&r.state==='seat');
    th.forEach((r,i)=>K.alight(r,{x:g.x+(i?.8:-.8),z:g.z+.9},car,()=>{if(++n>=th.length){sayAll(M,[['Mr. Alvarez',"Marcus Delgado. I walked you across this street for six years."],['Kid driving',"...Hi, Mr. Alvarez."],
      ['Mr. Alvarez',"You two are helping me with this crosswalk every Saturday until June. Bring a vest."],['Maddie',"That was actually kind of nice, Dad."]]);a.addTrust(5);a.feed('A ride instead of zip-ties','trust','+5 trust');jenText(M);b.done=true}}));if(!th.length){jenText(M);b.done=true}}
  else{sayAll(M,[['Mr. Alvarez',"Officer Dana's on her way. I'll keep an eye on them. I've got a stop sign and I'm not afraid to use it."]]);jenText(M);setTimeout0(M,2.5,()=>{b.done=true})}}
function jenText(M){const S=M.live.S,late=S.stops.filter(s=>s.done&&!s.onTime).length;
  sayAll(M,[['Jen (text)',"Why is Rick's truck full of bikes in the school parking lot"],['you',late?"Long story. Mostly on time.":"Long story. Everyone's on time."],['Jen (text)',"...Okay. I love you. Who has the trombone."]]);
  const it=M.item;if(!(it&&it.id==='trombone'))say(M,'Maddie',"I have the trombone. I always have the trombone.")}
/* the last leg: Jen's car comes up Oak St on the hard deadline */
function jenCar(dt,M,s){const a=A(),L_=M.live,S=L_.S,P_=places();const rem=S.left(s,M.elapsed),lead=32;if(rem>lead||s.at!=null&&!L_.jen)return;
  if(!L_.jen){const obj=a.makeVehicle('sedan','#6d7f93')||a.makeVanBox('#6d7f93');a.wmAdd(obj);const from={x:P_.home.x+150,z:P_.home.z-1.5};const pts=SX().route(a,from,{x:P_.home.x+6,z:P_.home.z});
    L_.jen={obj,pts,len:SX().polyLen(pts),col:null};say(M,'Jen (text)',"Leaving now. Ten minutes.",{now:true});say(M,'Tyler',"Mom's car! I can see Mom's car! Dad, GO!")}
  const J_=L_.jen;if(s.at!=null){J_.arr=(J_.arr||0)+dt}const k=s.at!=null?Math.min(1,J_.k+dt/8):Math.max(0,1-rem/lead);J_.k=k;const p=SX().polyAt(J_.pts,J_.len*k);J_.obj.position.set(p.x,a.groundAt(p.x,p.z),p.z);J_.obj.rotation.set(0,p.yaw+Math.PI/2,0);
  try{const VM=HT.Vehicles;J_.obj.userData.mod&&VM&&VM.update&&VM.update(J_.obj,{speed:k<1?10:0,steer:0,braking:k>=1,headlights:false,dt})}catch(_){}}
function finale(M){const a=A(),L_=M.live,K=L_.K,it=M.item;if(it&&!it.done)it.lost=true;M.st.phase='done';
  const lines=[['Jen',"Everybody alive? Everybody fed? Who's sticky?"],['Tyler',L_.C.n.brake?"Dad braked like Grandpa.":"Dad drove like a bus driver. A good one."],['Jen',L_.C.n.brake?"Grandpa hit a mailbox.":"Who are you and what have you done with my husband."]];
  if(it&&it.lost)lines.push(['Tyler',it.id==='trombone'?"Dad. The trombone.":"Dad. The "+it.name+"."]);
  sayAll(M,lines);const avg=Math.round(L_.C.avg()),n=L_.S.onTime();
  M.def.endLine=(n===6?'Six stops, six on time. ':n+' of 6 stops on time. ')+'Ride score '+avg+'. '+(M.st.choice==='ride'?'Two teenagers have a Saturday job with a stop sign. ':'Officer Dana has two teenagers and a strongly worded talk. ')+(it&&it.lost?'Somebody still has to go back for the '+it.name+'.':'Jen: "...Okay. Who has the trombone." Maddie: "I do. I always do."');
  M.score=Math.round(avg*10+n*100);setTimeout0(M,3.2,()=>{if(M.state==='go')a.endMission(true)})}

/* ---------- restore after a checkpoint retry ---------- */
function applyRestore(M){const a=A(),L_=M.live,st=M.st,K=L_&&L_.K;if(!L_||!st)return;L_.S.load(st.stops);L_.C.load(st.comfort);if(st.radio!=null)L_.R.i=st.radio;L_.R.applied=false;
  const car=M.rideCar=M.car||M.rideCar;let E=null;
  if(st.phase==='back'){/* Rick and the bikes are already on the way to school */encounterInit(M,true);E=L_.enc;E.state='done';E.rick=K.get('rick')||K.add('rick',{name:'Rick',make:()=>a.makeDude(a.HOMIES.rick),speed:5});rickDrive(M)}
  for(const r of K.list)if(r.state==='seat'){r.state='off';r.seat=-1}
  for(const x of st.riders||[]){const r=K.get(x.id);if(!r)continue;r.seat=-1;if(x.state==='seat'){r.state='off';K.seatNow(r,car)}else if(x.state==='stand')K.place(r,x.x,x.z,x.yaw);else if(!(E&&/thief/.test(x.id)))K.hide(r)}
  if(E&&st.choice==='zip')E.thieves.forEach((r,i)=>{r.state='bed';r.bed=i;r.d.root.visible=true});
  bikesTo(M,st.phase==='back'?'rack':st.stops&&st.stops[0]&&st.stops[0].done?'gone':'rack');if(st.phase==='back')bikesTo(M,'bed',L_.enc.cr.obj);
  if(st.phase==='bikes')L_.enc=null;
  if(M.item&&M.item.id==='trombone'&&M.item.noticed&&!M.item.done&&L_.props.trombone)L_.props.trombone.visible=true}

/* ---------- the HUD ---------- */
const XCSS=`.stx-blk,.stx-choice{background:rgba(14,20,30,.78);border-radius:12px;padding:10px 16px 12px;min-width:320px;text-align:center;backdrop-filter:blur(5px);border-top:3px solid #ff8a3d}
.stx-blk .k,.stx-choice .k{font:700 12px/1 var(--ht-ui);letter-spacing:.2em;color:#ffb36a;text-transform:uppercase;margin-bottom:8px}
.stx-blk .stx-bar{height:12px;border-radius:6px}.stx-blk .s{font:500 14px/1.2 var(--ht-body);margin-top:6px;color:rgba(255,255,255,.85)}
.stx-choice{pointer-events:auto;display:flex;flex-direction:column;gap:8px}
.stx-choice button{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:10px;text-align:left;align-items:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:9px;color:#fff;padding:8px 12px;cursor:pointer;font-family:var(--ht-body)}
.stx-choice button:hover{background:rgba(255,211,106,.16);border-color:#ffd36a}.stx-choice button[disabled]{opacity:.45;cursor:default}
.stx-choice .key{grid-row:span 2;font:700 14px/1 var(--ht-ui);padding:5px 8px;border-radius:5px;background:#f2efe6;color:#1b2230}
.stx-choice b{font:700 18px/1.1 var(--ht-ui);letter-spacing:.03em;text-transform:uppercase}.stx-choice i{font-style:normal;font-size:13px;color:rgba(255,255,255,.75)}
.stx-rec{align-self:flex-end;font:700 12px/1 var(--ht-ui);letter-spacing:.16em;background:rgba(14,20,30,.62);padding:6px 9px;border-radius:6px}
.stx-rec b{display:inline-block;width:9px;height:9px;border-radius:50%;background:#ff3b30;margin-right:4px;animation:stxPulse 1s infinite}
.stx-hint{font:600 12px/1.3 var(--ht-body);color:rgba(255,255,255,.8);background:rgba(14,20,30,.5);padding:6px 9px;border-radius:8px}`;
function hud(dt,M,F){const a=A(),L_=M.live,S=L_.S,C=L_.C,t=M.elapsed,cur=S.cur();
  if(!L_.panel){if(!document.getElementById('stx-taxi-css')){const s=document.createElement('style');s.id='stx-taxi-css';s.textContent=XCSS;document.head.appendChild(s)}
    L_.panel=SX().panel({id:'taxi',onRadio:()=>{if(a.CV&&a.CV===M.rideCar)L_.R.next()}});ACTIVE.p=L_.panel}
  const p=L_.panel;p.show(true);p.tick(dt);
  const hot=cur&&cur.hard&&cur.at==null&&M.st.phase!=='bikes'&&S.left(cur,t)<20;
  p.clockSet(S.clockStr(t),cur?(cur.hard&&cur.at==null&&M.st.phase!=='bikes'?'Hard stop '+S.due({target:cur.target+cur.hard}):'Next due '+S.due(cur)):'Saturday',hot);
  const rows=S.stops.map((s,k)=>{const st=s.done?'done':s===cur&&M.st.phase!=='bikes'?'cur':'';let time=s.done?(s.onTime?'✓ '+S.clockStr(s.at):'late '+Math.round(s.late)+'s'):(s.hard?S.due(s)+'!':S.due(s));
    return{name:s.name,sub:s.sub,time,state:st,cls:s.done?(s.onTime?'ok':'late'):(s===cur&&t>s.target+S.soft?'late':''),stars:s.done?s.stars:0}});
  if(M.st.phase==='bikes')rows.splice(4,0,{name:'BIKE THIEVES',sub:'Block the red pickup · Route 9',time:'NOW',state:'alert'});
  const it=M.item;if(it&&it.noticed&&!it.done&&!it.lost)rows.splice(Math.min(rows.length-1,S.i+(M.st.phase==='bikes'?1:0)),0,{name:'The '+it.name,sub:'Back to '+it.where+' · optional',time:'+$'+T.itemPay,state:'alert'});
  p.list("Jen's list",S.onTime()+'/6 on time',rows);
  p.rideSet(C.v,C.word(),C.avg(),90);
  const kids=inCar(M).filter(r=>r.likes),s=L_.R.cur();const moods=kids.map(r=>r.likes===s.id?'😀':r.hates===s.id?'😖':'😐').join('');
  const touch=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);p.radioSet(s,L_.R.i,moods,touch);
  /* objectives (left HUD) */
  if(M.st.phase==='bikes'){const E=L_.enc;F.objs.push([E&&E.state==='choice'?'Your call: zip-ties or a ride':E&&(E.state==='bail'||E.state==='caught')?'Rick has the two kids · stay with the car':'Block the red pickup on Route 9 · stay in its way 3 s',false])}
  else if(cur){F.objs.push([(L_.busy?'At ':'Stop '+(cur.k+1)+' · ')+cur.full,false]);F.objs.push([cur.sub,false]);if(!L_.busy&&!a.CV)F.objs.push(['Back in the car',false,'warn']);
    if(cur.hard&&cur.at==null){const left=Math.ceil(S.left(cur,t));F.objs.push([(cur.id==='home'?'Jen gets home in ':'Dr. Feld closes the door in ')+Math.floor(left/60)+':'+String(left%60).padStart(2,'0'),false,left<25?'warn':''])}}
  if(it&&it.noticed&&!it.done&&!it.lost)F.objs.push(['Optional: go back for the '+it.name,false]);
  if(a.CV&&a.CV===M.rideCar&&!L_.t.hintSaid){L_.t.hintSaid=1;p.toastShow('Dad Taxi','Stop in the ring',"They notice how you drive. "+(touch?'Tap the radio':'R')+" changes the station.",null,5.5)}
  rickTick(dt,M)}
/* the panel lives while this job runs; a system HUD hook takes it down after (the result card, quitting, a retry) */
const ACTIVE={p:null};
J.on('hud',()=>{const a=A();if(!ACTIVE.p)return;const M=a&&a.M;const on=a&&a.mode==='mission'&&M&&M.def&&M.def.id==='taxi'&&M.state==='go'&&M.live&&M.live.panel===ACTIVE.p;
  if(!on){ACTIVE.p.remove();ACTIVE.p=null;try{a.HUD&&a.HUD.minimap&&a.HUD.minimap.route&&a.HUD.minimap.route(null)}catch(_){}}});

/* ---------- the scripted player (dev/jobs-check.js) ---------- */
/* drives like a careful dad: ~12 m/s on straights, slows to ~6 for corners, parks in each ring; blocks the pickup. o.fail: lets the pickup go */
function bot(a,t,o){const M=a.M;if(!M||M.state!=='go'||!M.live)return null;const L_=M.live,k=a.keys,car=M.rideCar;
  const stopKeys=()=>{k.w=k.s=k.a=k.d=false;k[' ']=false};
  if(!a.CV){stopKeys();if(car){a.P.pos.set(car.pos.x+2.4,0,car.pos.z);a.useTap=true}return null}
  const E=L_.enc;
  if(M.st.phase==='bikes'&&E){if(E.state==='choice'){stopKeys();k['2']=!o.zip&&(t%20<10);k['1']=!!o.zip&&(t%20<10);return null}k['1']=k['2']=false;
    if(E.state!=='drive'){stopKeys();k[' ']=true;return null}
    if(o.fail){stopKeys();k[' ']=true;return null}
    /* get ahead of it on its route and stop across its path */
    const cr=E.cr,ahead=SX().polyAt(cr.pts,Math.min(cr.total-4,cr.d+(L_.bt||0)+Math.max(30,cr.spd*3.2)));if(!L_.bt)L_.bt=0;
    const d=hyp(ahead.x-a.CV.pos.x,ahead.z-a.CV.pos.z);if(!L_.blockAt||(cr.d>L_.blockD-6&&!cr.blocked))L_.blockAt={x:ahead.x,z:ahead.z},L_.blockD=cr.d+Math.max(30,cr.spd*3.2);
    /* nudge into the swerve lane */
    const tg=L_.blockAt;const fx=-Math.sin(cr.yaw),fz=-Math.cos(cr.yaw),rx=Math.cos(cr.yaw),rz=-Math.sin(cr.yaw);const want={x:tg.x+rx*cr.want*.9,z:tg.z+rz*cr.want*.9};
    driveTo(a,want,{stop:true,r:1.2,max:14});return null}
  /* the forgotten item, then the next stop */
  const it=M.item,S=L_.S;let tgt=null;if(L_.busy){stopKeys();k[' ']=Math.abs(a.CV.spd)>.3;return null}
  if(it&&it.noticed&&!it.done&&!it.lost&&!o.skipItem){const s=S.stops[it.k];tgt={x:s.x,z:s.z}}
  else{const s=S.cur();if(s)tgt={x:s.x,z:s.z}}
  if(it&&it.busy){stopKeys();k[' ']=true;return null}
  if(tgt)driveTo(a,tgt,{stop:true,r:1.4,max:o.max||13});else stopKeys();return null}
function driveTo(a,tgt,o){const e=a.CV,k=a.keys,B=driveTo;if(!e)return;const key=Math.round(tgt.x)+','+Math.round(tgt.z);
  if(B.key!==key||!B.pts||B.age++>90){B.key=key;B.age=0;B.pts=SX().route(a,{x:e.pos.x,z:e.pos.z},tgt);B.i=1}
  const pts=B.pts;while(B.i<pts.length-1&&hyp(pts[B.i].x-e.pos.x,pts[B.i].z-e.pos.z)<5)B.i++;
  const d0=hyp(tgt.x-e.pos.x,tgt.z-e.pos.z),w=d0<9?tgt:pts[Math.min(B.i,pts.length-1)];
  /* corner ahead? look at the turn angle at the next waypoint */
  let corner=0;if(B.i<pts.length-1){const p=pts[B.i],q=pts[B.i+1],h1=Math.atan2(p.x-e.pos.x,p.z-e.pos.z),h2=Math.atan2(q.x-p.x,q.z-p.z);let dd=Math.abs(h2-h1);if(dd>Math.PI)dd=2*Math.PI-dd;const dp=hyp(p.x-e.pos.x,p.z-e.pos.z);if(dd>.5&&dp<16)corner=1}
  const dx=w.x-e.pos.x,dz=w.z-e.pos.z;let d=Math.atan2(-dx,-dz)-e.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;
  let want=o.stop&&d0<16?Math.max(0,(d0-o.r)*.75):Math.abs(d)>.6?4.5:corner?6:o.max||13;if(o.stop&&d0<o.r)want=0;
  k.a=d>.06;k.d=d<-.06;const sp=e.spd;k.w=sp<want-.3;k.s=sp>want+1.6&&sp>.5;k[' ']=o.stop&&d0<o.r&&Math.abs(sp)>.2;
  if(Math.abs(sp)<.4&&d0>3){B.stuck=(B.stuck||0)+1;if(B.stuck>150){B.stuck=0;const q=pts[Math.min(B.i+1,pts.length-1)];e.pos.set(q.x,0,q.z);e.yaw=Math.atan2(-(tgt.x-q.x),-(tgt.z-q.z));if(e.car){e.car.x=q.x;e.car.z=q.z;e.car.yaw=e.yaw}a.syncCar(e)}}else B.stuck=0}
})();
