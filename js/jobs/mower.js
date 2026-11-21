/* =====================================================================
   THE GRASS IS GREENER (SPEC3 2.13): the Maple Heights Ride-On Mower Grand Prix, Linden Park. Giver: Big Dave.
   A race and a cross-neighbourhood trust event. Beats: pick a mower (3 stock mowers) -> qualifying (one flying lap alone: cone
   gates, +1 s a cone, +2 s a missed gate) -> the race (3 laps, 6 mowers, grid from qualifying, countdown) -> lap 2: Marcus (Riverside)
   has his fuel line cut by two hustlers who bet on the race: keep racing, or pull into the pit, fit your spare, chase the
   hustlers on foot under a yellow flag (tackle + zip-tie) and get back out there -> photo finish -> podium.
   Bumping is allowed, deliberate bumps are scored by Gary (marshal, clipboard): 3 = black flag (disqualified, lighter payout).
   Fails (retry from the stage): leaving the park mid-session, or breaking your mower.
   Also registers 'mowertt' (the repeatable Linden Park time trial, after done.mower) and, after done.mower, a ride-on mower
   parked by the Linden Park gate in free roam (borrowable like a neighbour's car; it stripes every lawn it drives over).
   Uses HT.Race (js/jobs/_race.js), HT.CarAI.drive with VEH.mower (js/carai.js), HT.Vehicles.make('mower') (js/vehicles.js).
   Registers its index.html handling row and seat at load: CAR_FEEL.mower and SEATS.mower (see the report: a framework hook for
   vehicle feel rows would replace this).
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
const RACE=()=>window.HT&&HT.Race;
/* ---------------------------------------------------------------- tuning */
const LAPS=3,LINE_X=92,BUMP_VN=2.8,BUMPS_DQ=3,YELLOW_V=2.4,LEAVE_T=3.5,CHASE_MAX=40,HUSTLER_V=5.1,ESCAPE_D=46,CONE_PEN=1,GATE_PEN=2,
  RUBBER={ahead:12,behind:10,k:.008,max:.16,kb:.005,maxb:.08},PARK={x0:61,z0:99,x1:124,z1:131};
/* the racing line (clockwise from the start straight): Gil's Oak squeeze, the east straight with the hay-bale chicane, the
   sprinkler run and Dave's grill squeeze along the south, "The Stripes" (two hairpins round hay walls: mow it like a lawn),
   the gnome garden up the west side, then round the oak at the north-west back onto the start straight. */
const LINE=[[80,106.4],[86,105.4],[92,105.3],[100,105.2],[105,105.0],[109,105.0],[113.2,106.0],[116.2,108.4],[117.3,111.5],[117.3,113.6],[115.4,116.4],[115.6,118.2],[118.2,120.2],[118.0,122.8],[116.8,125.2],[114.4,126.7],[110,127.0],[104,127.1],[96,127.2],[88,127.2],[83,126.9],[79.6,125.4],[78.4,122.6],[78.4,119.0],[77.6,116.9],[75.6,115.9],[73.7,116.7],[72.8,118.8],[72.8,123.6],[71.9,125.9],[70.2,126.8],[68.4,126.2],[67.0,124.2],[66.6,121],[66.6,113],[66.9,110.6],[68.6,108.9],[71,108.8],[74,109.2],[77,108.0]];
const WALLS=[[75.6,119.0,128.4],[70.4,113.0,123.4]];/* hay walls: x, z0, z1 (the Stripes) */
const BLOCKS=[[118.4,115.9,120.6,117.0],[113.5,119.6,115.2,120.7]];/* the hay-bale chicane */
const GRID=[[89.6,104.7],[87.2,106.3],[84.8,104.7],[82.4,106.3],[80.0,104.9],[77.6,106.6]];
const PIT={x:98.6,z:109.8,r:3.4},PODIUM={x:86,z:111},PADDOCK=[{x:96.4,z:113.2},{x:99.2,z:113.4},{x:102,z:113.6}];
const QGATES=[{id:'g1',x:100,z:105.2},{id:'g2',x:117.3,z:113},{id:'g3',x:100,z:127.1},{id:'g4',x:66.6,z:117}];
const SPRINKLERS=[{x:107.5,z:124.6,r:3.2,ph:0},{x:99,z:125,r:2.8,ph:2.1}];
const GNOMES=[[64.9,121.5],[68.4,119.2],[64.9,116.6],[68.5,113.8],[65,111.5],[72.6,111.6]];
/* the field: you + five neighbours. skill scales top speed; quali = their flying-lap time (s) on this course */
const FIELD=[
  {id:'marcus',name:'Marcus',num:23,col:'#2f6fb5',seat:'#1d2a44',skill:.99,quali:19.3,hood:'river',look:'marcus'},
  {id:'phil',name:'Phil Kowalski',short:'Phil',num:88,col:'#e9e3cf',seat:'#5b2a20',skill:.975,quali:19.6,look:'phil'},
  {id:'dave',name:'Big Dave',short:'Dave',num:7,col:'#c8331f',seat:'#1c1c1f',skill:.965,quali:20.0,look:'dave'},
  {id:'gil',name:'Gil',num:1,col:'#7b8f3a',seat:'#3a2a1c',skill:.9,quali:21.0,look:'gil'},
  {id:'walt',name:'Walt',num:4,col:'#d9a521',seat:'#1c1c1f',skill:.885,quali:21.9,look:'walt'}];
/* the three stock mowers (pick one): multipliers on VEH.mower */
const MOWERS={
  reliable:{name:'The Old Reliable',col:'#3e8a35',blurb:'Balanced. Grippy. Has never once let you down, or been asked to go fast.',max:1,acc:1,turn:1,grip:1,steer:1,bars:[3,3,3],
    say:"Old Reliable. She's never let me down. She's never been asked to go fast, either."},
  zero:{name:'The Zero-Turn',col:'#e0661f',blurb:'Turns on a dime. Twitchy at the top end. Steers like a shopping cart full of bees.',max:.955,acc:1.1,turn:1.28,grip:.88,steer:1.3,bars:[2,5,2],
    say:"Zero-turn. Turns on a dime. Stops on a nickel. Steers like a shopping cart full of bees."},
  estate:{name:'The Estate 4000',col:'#f1ead2',blurb:'Fastest in a straight line. Heated seat. Turns like a pontoon boat.',max:1.07,acc:.9,turn:.84,grip:1.1,steer:.85,bars:[5,2,4],
    say:"The Estate 4000. Heated seat. Cupholder fits a two-liter. I'm home."}};
/* ---------------------------------------------------------------- dialogue (wholesome register; Barb on a megaphone) */
const SAY={
  intro:[['dave',"Six years. Six years since the last Grand Prix. Since the Incident."],['you',"What incident?"],['dave',"We don't say it out loud. Gil knows."],['Gil',"I know."]],
  intro2:[['dave',"It's for charity. The bake sale matched it. And Riverside entered a team. First time ever. Be nice."],['dave',"Pick a mower from the paddock. Then Barb times you for qualifying."]],
  pick:"Okay. Which one of you wants to be famous.",
  qualiGo:[['Barb',"Qualifying! One flying lap! The clock starts at the line! Hit a cone, that's a second! Miss a gate, that's two!"]],
  quali:{good:["Barb: Now THAT is a lap. Somebody tell Phil.","Barb: Oh, that's tidy. That's a well-mown lap."],ok:["Barb: A respectable lap. Respectable is good. Respectable gets invited back."],
    bad:["Barb: That... was a lap! Technically! The cones would like a word."]},
  grid:[['Barb',"Drivers, to your mowers! Blades off, please, Walt."],['walt',"In my day we raced push mowers. Uphill. Both ways."],['phil',"I've walked this course eleven times. In socks. For feel."],
    ['dave',"Brisket's in the smoker. Mower's in the red. Let's go, boys."],['marcus',"First time over the bridge for a race. The kids made me a cape. I'm wearing the cape."],['gil',"Not like last time. Not like last time. Not like last time."]],
  hustle:[['Hustler',"Nice mower. Real nice. Shame if it had a... mower problem."],['marcus',"...Thanks?"]],
  go:"And they're OFF! Six grown men on lawn equipment! This is what the bake sale paid for!",
  barb:{chicane:["And Big Dave takes the hay-bale chicane like a man who's eaten hay before!","Through the chicane! Somebody's going to be finding straw in places for a week!"],
    gnome:["Gnome down! The gnome is fine! The gnome has seen worse!","Through the gnome garden! Mrs. Petrakis is watching through her fingers!"],
    sprink:["The sprinklers are ON! Who turned on the sprinklers? Walt, did you set a timer?"],
    dog:["Biscuit is on the course! Biscuit is NOT a registered competitor!","There goes Biscuit! Good boy! Please leave the track, good boy!"],
    lap2:"Lap two! And... oh no. Marcus is slowing down. That's not a strategy, folks. That's smoke.",
    last:["Final lap! Ring the bell, Gary!","Last lap! Nobody wave at your wife! Okay, one wave."],
    pass:["A pass! On a riding mower! My heart!","He's through! Clean as a fresh-cut lawn!","Position change! Somebody write that down! Gary, write that down!"],
    passed:["Oh, and he's been passed! On a mower! In front of his neighbours!","Swapped places! The crowd is going mild!"],
    yellow:"Yellow flag! Yellow flag! There's a dad on the course! Everybody slow down and look disappointed!",
    green:"Green flag! Back to racing! Mow, mow, mow!",
    photo:"It's close! It's VERY close! Somebody get Gary's camera!"},
  marshal:["Gary: One. That's one bump. I'm writing it down. In pen.","Gary: Two. That's two. I'm underlining it. Twice.","Gary: Three. Black flag. I'm sorry. I'm not sorry. Rules are rules."],
  marshalSoft:["Gary: That's a racing incident. I'm allowing it. I'm watching you, though."],
  trash:{
    dave:{pass:["Coming through! Brisket waits for no man!","Sorry, buddy! Not sorry! Love you!"],passed:["Hey! I fed you last Fourth of July!","That's fine. That's FINE. I'm pacing myself."]},
    phil:{pass:["Inside line, neighbour. It's in my spreadsheet.","Optimal apex. You're welcome to watch."],passed:["That's not in the spreadsheet.","I'm recalculating. I'm RECALCULATING."]},
    marcus:{pass:["Excuse me! Sorry! Riverside coming through!","On your left! Cape coming through!"],passed:["Nice line! Respect!","Okay, okay, I see you! Maple's got jets!"]},
    gil:{pass:["Oh! I passed somebody! Is that allowed?"],passed:["Go ahead! Please! Give me room! Lots of room!","Not like last time. Not like last time."]},
    walt:{pass:["Still got it. Never had it, but still got it."],passed:["Go on, sonny. I've got a thermos and all afternoon.","In my day we'd have stopped to chat."]}},
  stall:[['marcus',"No no no no. Come on, girl. Come on..."],['marcus',"She's dead. The fuel line's cut. Somebody CUT it."]],
  choice:"Marcus is stranded in the pit. Pull in to help him, or keep racing.",
  help:[['you',"Here. Spare fuel line. I always carry a spare. Don't ask why."],['marcus',"You're losing the race for this."],['you',"It's a lawnmower race, Marcus."]],
  daveHelp:"He stopped. He STOPPED. That's the most Maple Heights thing I've ever seen.",
  bolt:[['Hustler',"He's fixing it! Abort! ABORT!"],['you',"Hey! You two! Stay right there!"]],
  tackle:["Okay okay okay! It was twenty bucks! On Phil!","We bet on the guy with the spreadsheet! EVERYBODY bets on the spreadsheet!","Ow. Grass stains. My mom's gonna kill me."],
  escaped:"One of them made it over the fence. That's fine. Gary got a photo. Gary always gets a photo.",
  back:"Back on the mower. Green flag's waiting on you.",
  kept:[['dave',"Marcus is gonna be okay. Probably. He's got a cape."]],
  keptEnd:"And Marcus finishes last, but the cape finished strong.",
  dq:[['Barb',"Black flag on number twelve! Gary's clipboard has spoken!"],['dave',"Aw, man. Aw, buddy."]],
  chant:"DAD! DAD! DAD! DAD!",
  trophy:"And the trophy goes to... everyone's a little bit of a winner. No, the trophy goes to one person. Hold on.",
  podium:{1:["Barb: Your winner! Get this man some lemonade!"],2:["Barb: Second place! First loser! I'm kidding! I love you!"],3:["Barb: Third! On the podium! Your kids are SCREAMING!"],x:["Barb: A strong finish! Not a podium finish! But a finish!"]},
  marcusEnd:"Marcus: Next time you come over the bridge, the grill's on me. That's a promise.",
  leave:"You left the Grand Prix. Barb is announcing it. On the megaphone.",broke:"Your mower gave up the ghost. Somewhere, Gil is nodding.",
  ttIntro:[['Barb',"Time trial! One flying lap! I've got my stopwatch. I always have my stopwatch."]]};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const pf=(n,d=2)=>(Math.round(n*Math.pow(10,d))/Math.pow(10,d)).toFixed(d);
const tfmt=t=>t==null||!isFinite(t)?'—':Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0');
const ord=n=>n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th');
const COARSE=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;
/* ---------------------------------------------------------------- the mower in the game's driving code
   index.html keeps its per-type handling rows (CAR_FEEL) and seats (SEATS) inside its closure, so a job can't add a type. Until the
   framework offers api.carFeel(type,row,seats), the mower is driven as an entry whose stats this file sets after enterCar (mount),
   the rider is re-seated and the chase camera pulled in from the hud hook, and the engine voice is HT.Audio.vehicle wrapped (below). */
const FEEL={label:'ride-on mower',seats:1,bed:0,max:9,boostMax:11,acc:5.2,boostAcc:6.4,brake:13,hbrake:11,turn:2.4,steerResp:11,grip:7,roll:.55,cam:[4.4,1.15],eng:1.9,gears:1,horn:'short',door:'close',rear:1,torque:0};
function glue(){try{const a=A();if(a&&typeof a.carFeel==='function'&&!glue.done){a.carFeel('mower',FEEL,[[-.42,.8,0]]);glue.done=true}}catch(e){}}
function mowerStats(base,opt){const o=MOWERS[opt]||MOWERS.reliable,s=base;
  s.maxSpeed=9*o.max;s.boostMax=11*o.max;s.accel=5.2*o.acc;s.boostAccel=6.4*o.acc;s.turn=2.4*o.turn;s.grip=7*o.grip;s.steerResp=11*o.steer;s.turnFade=.3;
  s.brake=13;s.hbrake=11;s.coast=4;s.revMax=3;s.revAccel=4;s.ramMult=.55;s.ramDealtFront=1;s.impactTakenFront=1;s.mass=.45;s.len=2;s.wid=1.18;return s}
/* ---------------------------------------------------------------- props (procedural, cached geometry and textures) */
const C={};/* per-session caches: textures, materials, geometry */
function canvasTex(key,w,h,draw){if(C['t'+key])return C['t'+key];const a=A(),T=a.THREE,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;return C['t'+key]=t}
const lin=h=>{const a=A();return new a.THREE.Color(h).convertSRGBToLinear()};
function std(key,o){if(C['m'+key])return C['m'+key];const T=A().THREE;return C['m'+key]=new T.MeshStandardMaterial(Object.assign({roughness:.75},o))}
function vcol(g,hex){const c=lin(hex),n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b}g.setAttribute('color',new (A().THREE).BufferAttribute(a,3));return g}
/* merge non-indexed geometries (position, normal, uv?, color) with a matrix each: [[geo,mat4|null,hex?],...] */
function merge(parts){const T=A().THREE,P=[],N=[],Cc=[];for(const[g0,m,hex]of parts){let g=g0.index?g0.toNonIndexed():g0.clone();if(m)g.applyMatrix4(m);if(!g.attributes.normal)g.computeVertexNormals();
    if(hex)vcol(g,hex);const p=g.attributes.position.array,n=g.attributes.normal.array,c=g.attributes.color?g.attributes.color.array:null;for(let i=0;i<p.length;i++){P.push(p[i]);N.push(n[i]);Cc.push(c?c[i]:1)}}
  const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(P,3));out.setAttribute('normal',new T.Float32BufferAttribute(N,3));out.setAttribute('color',new T.Float32BufferAttribute(Cc,3));out.computeBoundingSphere();return out}
const M4=(x,y,z,rx,ry,rz,s)=>{const T=A().THREE;return new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx||0,ry||0,rz||0)),new T.Vector3(s||1,s||1,s||1))};
const M4s=(x,y,z,rx,ry,rz,sx,sy,sz)=>{const T=A().THREE;return new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx||0,ry||0,rz||0)),new T.Vector3(sx,sy,sz))};
const VC=()=>C.vc||(C.vc=new (A().THREE).MeshStandardMaterial({vertexColors:true,roughness:.7,metalness:.02}));
function strawTex(){return canvasTex('straw',256,128,(g,w,h)=>{g.fillStyle='#cfae5c';g.fillRect(0,0,w,h);let s=11;const R=()=>{s=(s*16807)%2147483647;return s/2147483647};
  for(let i=0;i<1400;i++){const x=R()*w,y=R()*h,l=6+R()*18,a=(R()-.5)*.5;g.strokeStyle=['#e6c879','#b8913f','#d9bb6a','#a07c34','#f0da94'][i%5];g.globalAlpha=.55+R()*.45;g.lineWidth=1+R();g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}
  g.globalAlpha=1;g.fillStyle='rgba(70,48,20,.75)';g.fillRect(0,h*.3,w,5);g.fillRect(0,h*.68,w,5)})}
/* hay bales: one InstancedMesh for every bale on the course */
function hayBales(list){const a=A(),T=a.THREE;const g=new T.BoxGeometry(1.02,.46,.5,1,1,1);const m=std('hay',{map:strawTex(),roughness:.95});
  const im=new T.InstancedMesh(g,m,list.length);im.castShadow=true;im.receiveShadow=true;list.forEach((b,i)=>im.setMatrixAt(i,M4(b.x,b.y,b.z,0,b.yaw||0,0)));im.instanceMatrix.needsUpdate=true;a.wmAdd(im,true);return im}
/* a hay wall along x=const from z0 to z1, two bales high, with its collider */
function hayRun(list,x0,z0,x1,z1,high){const L=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.round(L/1.02)),yaw=Math.atan2(-(z1-z0),x1-x0);
  for(let i=0;i<n;i++){const t=(i+.5)/n,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;list.push({x,y:.23,z,yaw});if(high&&i%3!==1)list.push({x:x+(Math.random()-.5)*.06,y:.69,z,yaw:yaw+(Math.random()-.5)*.08})}
  A().wmCol({x0:Math.min(x0,x1)-.26,z0:Math.min(z0,z1)-.26,x1:Math.max(x0,x1)+.26,z1:Math.max(z0,z1)+.26})}
/* traffic cones: dynamic (knocked over, tumble, lie) */
function coneGeo(){if(C.cone)return C.cone;const T=A().THREE;return C.cone=merge([[new T.BoxGeometry(.4,.04,.4),M4(0,.02,0),'#d4520f'],[new T.CylinderGeometry(.035,.15,.52,14,1,true),M4(0,.3,0),'#ff6a14'],
  [new T.CylinderGeometry(.084,.112,.1,14,1,true),M4(0,.25,0),'#f4f4ef'],[new T.CylinderGeometry(.05,.07,.07,14,1,true),M4(0,.42,0),'#f4f4ef']])}
function cones(pts){const a=A(),T=a.THREE,im=new T.InstancedMesh(coneGeo(),VC(),pts.length);im.castShadow=true;const list=pts.map((p,i)=>({x:p[0],z:p[1],y:0,rx:0,rz:0,yaw:Math.random()*6,vx:0,vy:0,vz:0,spin:0,down:false,i,gate:p[2]||null}));
  for(const c of list)im.setMatrixAt(c.i,M4(c.x,0,c.z,0,c.yaw,0));im.instanceMatrix.needsUpdate=true;a.wmAdd(im);return{im,list}}
function conesUpd(K,dt,movers,onHit){let dirty=false;for(const c of K.list){
    if(!c.down||c.vy||c.vx||c.vz){for(const m of movers){const dx=c.x-m.x,dz=c.z-m.z,d=Math.hypot(dx,dz);if(d<.85&&Math.abs(m.spd)>1.2&&!c.flying){const sp=Math.abs(m.spd);c.vx=dx/(d||1)*sp*.7+m.fx*sp*.5;c.vz=dz/(d||1)*sp*.7+m.fz*sp*.5;c.vy=2+sp*.25;c.spin=6+sp;c.flying=true;c.down=true;if(onHit)onHit(c,m)}}}
    if(c.flying){c.vy-=9.8*dt;c.x+=c.vx*dt;c.z+=c.vz*dt;c.y+=c.vy*dt;c.rx+=c.spin*dt;if(c.y<=0){c.y=0;c.vy=c.vy<-1.5?-c.vy*.3:0;c.vx*=.6;c.vz*=.6;c.spin*=.5;if(!c.vy&&Math.hypot(c.vx,c.vz)<.3){c.flying=false;c.rx=Math.PI/2;c.vx=c.vz=0;c.y=.15}}dirty=true;K.im.setMatrixAt(c.i,M4(c.x,c.y,c.z,c.rx,c.yaw,0))}}
  if(dirty)K.im.instanceMatrix.needsUpdate=true}
/* garden gnomes: red hat, white beard, blue coat; they fly when hit and land face down */
function gnomeGeo(){if(C.gnome)return C.gnome;const T=A().THREE;return C.gnome=merge([[new T.CylinderGeometry(.11,.14,.06,12),M4(0,.03,0),'#6b6b66'],[new T.CylinderGeometry(.1,.13,.22,12),M4(0,.17,0),'#2c5ea8'],
  [new T.BoxGeometry(.25,.035,.15),M4(0,.18,0),'#3a2412'],[new T.SphereGeometry(.085,12,10),M4(0,.33,0),'#f2c7a5'],[new T.ConeGeometry(.12,.2,12),M4(0,.27,.04,-.3),'#f4f4ef'],
  [new T.SphereGeometry(.025,8,6),M4(0,.33,.085),'#e08a7a'],[new T.ConeGeometry(.095,.26,12),M4(0,.5,-.02,-.25),'#d6281c'],[new T.SphereGeometry(.05,8,6),M4(.1,.2,.05),'#f2c7a5'],[new T.SphereGeometry(.05,8,6),M4(-.1,.2,.05),'#f2c7a5']])}
function gnomes(pts){const a=A(),T=a.THREE,list=[];for(const[x,z]of pts){const m=new T.Mesh(gnomeGeo(),VC());m.castShadow=true;m.position.set(x,0,z);m.rotation.y=Math.atan2(92-x,115-z);m.scale.setScalar(1.25);a.wmAdd(m);list.push({m,x,z,y:0,vx:0,vy:0,vz:0,flying:false,down:false})}return list}
/* a sign on a stake with painted text */
function sign(lines,o){const a=A(),T=a.THREE;o=o||{};const w=o.w||1.2,h=o.h||.7,key='sg'+lines.join('|')+(o.bg||'');
  const tex=canvasTex(key,512,Math.round(512*h/w),(g,W,H)=>{g.fillStyle=o.bg||'#f6f1e2';g.fillRect(0,0,W,H);g.strokeStyle=o.edge||'#2b3a2a';g.lineWidth=14;g.strokeRect(7,7,W-14,H-14);
    let y=H*.2;lines.forEach((t,k)=>{const big=k===0;g.fillStyle=k===0?(o.ink||'#2b3a2a'):'#4a4a44';g.font=(big?'800 ':'600 ')+(big?(o.big||64):(o.small||38))+'px Barlow Condensed, Arial Narrow, sans-serif';g.textAlign='center';g.textBaseline='middle';
      if(t.startsWith('#BARS')){const v=t.slice(5).split(',').map(Number);const labels=['TOP SPEED','TURNING','GRIP'];v.forEach((n,i)=>{const yy=y+i*44;g.font='700 30px Barlow Condensed, Arial Narrow, sans-serif';g.textAlign='left';g.fillText(labels[i],40,yy);for(let p=0;p<5;p++){g.fillStyle=p<n?'#e8a21a':'#d8d2c0';g.fillRect(230+p*48,yy-14,40,28)}g.fillStyle='#4a4a44'});y+=v.length*44;return}
      g.fillText(t,W/2,y);y+=big?H*.24:H*.16})});
  const gr=new T.Group(),b=new T.Mesh(new T.BoxGeometry(w,h,.04),[std('wood',{color:lin('#8a6a46')}),std('wood',{}),std('wood',{}),std('wood',{}),new T.MeshStandardMaterial({map:tex,roughness:.8}),std('wood',{})]);
  b.position.y=(o.y||.95)+h/2;b.castShadow=true;gr.add(b);for(const s of o.legs===2?[-w*.4,w*.4]:[0]){const p=new T.Mesh(new T.BoxGeometry(.06,(o.y||.95)+h*.6,.06),std('wood',{}));p.position.set(s,((o.y||.95)+h*.6)/2,-.04);p.castShadow=true;gr.add(p)}
  if(o.x!=null){gr.position.set(o.x,0,o.z);gr.rotation.y=o.yaw||0;a.wmAdd(gr)}return gr}
/* the start/finish gantry, chequered line and starting lights */
function gantry(){const a=A(),T=a.THREE,g=new T.Group();const pole=std('pole',{color:lin('#e9e6dc'),roughness:.5}),dark=std('dark',{color:lin('#1d1f22'),roughness:.6});
  for(const z of[103.6,107.6]){const p=new T.Mesh(new T.CylinderGeometry(.07,.08,3.4,10),pole);p.position.set(LINE_X,1.7,z);p.castShadow=true;g.add(p)}
  const tex=canvasTex('banner',1024,160,(c,W,H)=>{c.fillStyle='#1f5a2e';c.fillRect(0,0,W,H);for(let i=0;i<W;i+=40){c.fillStyle=(i/40)%2?'#f4f1e6':'#16181a';c.fillRect(i,0,40,20);c.fillStyle=(i/40)%2?'#16181a':'#f4f1e6';c.fillRect(i,H-20,40,20)}
    c.fillStyle='#ffd34a';c.font='800 70px Barlow Condensed, Arial Narrow, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('MAPLE HEIGHTS RIDE-ON GRAND PRIX',W/2,H/2+2);
    c.fillStyle='#f4f1e6';c.font='700 22px Barlow Condensed, Arial Narrow, sans-serif';c.fillText('FOR CHARITY  ·  BLADES UP  ·  NO GOATS',W/2,H-36)});
  for(const sd of[1,-1]){const bn=new T.Mesh(new T.PlaneGeometry(4.2,.66),new T.MeshStandardMaterial({map:tex,roughness:.85}));bn.position.set(LINE_X+sd*.012,3.0,105.6);bn.rotation.y=sd>0?Math.PI/2:-Math.PI/2;g.add(bn)}
  const bar=new T.Mesh(new T.BoxGeometry(.08,.08,4.2),pole);bar.position.set(LINE_X,3.36,105.6);g.add(bar);
  /* lights: 3 red + 1 green on the pole */
  const box=new T.Mesh(new T.BoxGeometry(.18,.9,.2),dark);box.position.set(LINE_X-.12,2.2,103.6);g.add(box);const lamps=[];
  for(let k=0;k<4;k++){const m=new T.MeshStandardMaterial({color:lin(k<3?'#3a0a08':'#0a2a10'),emissive:lin(k<3?'#ff2a14':'#2aff5a'),emissiveIntensity:0});const s=new T.Mesh(new T.SphereGeometry(.07,12,8),m);s.position.set(LINE_X-.22,2.52-k*.2,103.6);g.add(s);lamps.push(m)}
  const ch=canvasTex('chq',256,32,(c,W,H)=>{for(let x=0;x<16;x++)for(let y=0;y<2;y++){c.fillStyle=(x+y)%2?'#f4f1e6':'#16181a';c.fillRect(x*16,y*16,16,16)}});
  const line=new T.Mesh(new T.PlaneGeometry(.55,4.2),new T.MeshStandardMaterial({map:ch,roughness:.9,polygonOffset:true,polygonOffsetFactor:-2}));line.rotation.x=-Math.PI/2;line.rotation.z=Math.PI/2;line.position.set(LINE_X,.025,105.6);line.receiveShadow=true;g.add(line);
  a.wmAdd(g);return{g,lamps}}
/* bunting: little triangle flags on a sagging string, merged */
function bunting(runs){const a=A(),T=a.THREE,parts=[],cols=['#d6281c','#f4f1e6','#2c5ea8','#ffd34a','#2f8f5a'];
  for(const[x0,z0,y0,x1,z1,y1]of runs){const L=Math.hypot(x1-x0,z1-z0),n=Math.floor(L/.45),yaw=Math.atan2(-(z1-z0),x1-x0);
    for(let i=0;i<n;i++){const t=(i+.5)/n,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t,y=y0+(y1-y0)*t-Math.sin(t*Math.PI)*.45;const tri=new T.BufferGeometry();
      tri.setAttribute('position',new T.Float32BufferAttribute([-.15,0,0,.15,0,0,0,-.3,0],3));tri.computeVertexNormals();parts.push([tri,M4(x,y,z,0,yaw,(Math.random()-.5)*.15),cols[i%5]])}}
  const m=new T.Mesh(merge(parts),new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.8}));a.wmAdd(m);return m}
/* pit canopy: white and blue pop-up tent, table, toolbox, fuel can */
function pitTent(x,z){const a=A(),T=a.THREE,g=new T.Group(),leg=std('leg',{color:lin('#c9ccd0'),metalness:.7,roughness:.35});
  for(const[sx,sz]of[[-1.5,-1.5],[1.5,-1.5],[-1.5,1.5],[1.5,1.5]]){const l=new T.Mesh(new T.CylinderGeometry(.03,.03,2.3,8),leg);l.position.set(sx,1.15,sz);g.add(l)}
  const tex=canvasTex('tent',256,64,(c,W,H)=>{for(let i=0;i<8;i++){c.fillStyle=i%2?'#f4f4ef':'#2c5ea8';c.fillRect(i*32,0,32,H)}});
  const roof=new T.Mesh(new T.ConeGeometry(2.25,.7,4,1,true),new T.MeshStandardMaterial({map:tex,side:T.DoubleSide,roughness:.8}));roof.position.y=2.65;roof.rotation.y=Math.PI/4;roof.castShadow=true;g.add(roof);
  const val=new T.Mesh(new T.BoxGeometry(3.1,.22,3.1),new T.MeshStandardMaterial({color:lin('#2c5ea8'),roughness:.8,side:T.DoubleSide,transparent:true,opacity:.98}));val.position.y=2.2;g.add(val);
  const tb=merge([[new T.BoxGeometry(1.6,.05,.7),M4(0,.75,0),'#d8d2c0'],[new T.BoxGeometry(.05,.73,.05),M4(-.7,.37,-.3),'#888'],[new T.BoxGeometry(.05,.73,.05),M4(.7,.37,-.3),'#888'],[new T.BoxGeometry(.05,.73,.05),M4(-.7,.37,.3),'#888'],[new T.BoxGeometry(.05,.73,.05),M4(.7,.37,.3),'#888'],
    [new T.BoxGeometry(.45,.22,.25),M4(-.4,.89,0),'#c4231a'],[new T.BoxGeometry(.47,.04,.27),M4(-.4,1.0,0),'#9a1a12'],[new T.BoxGeometry(.25,.32,.14),M4(.45,.93,0),'#d6281c'],[new T.CylinderGeometry(.025,.025,.08,8),M4(.52,1.12,0,0,0,.6),'#f2c12e'],
    [new T.CylinderGeometry(.04,.04,.14,10),M4(.05,.85,.1),'#f2d23a'],[new T.CylinderGeometry(.04,.04,.14,10),M4(.15,.85,-.12),'#e9e9e9']]);
  const t=new T.Mesh(tb,VC());t.position.set(0,0,-.9);t.castShadow=true;g.add(t);g.position.set(x,0,z);a.wmAdd(g);
  a.wmCol({x0:x-.85,z0:z-1.3,x1:x+.85,z1:z-.5});return g}
/* podium: three white blocks with gold/silver/bronze numbers */
function podium(x,z){const a=A(),T=a.THREE,g=new T.Group();[[0,1,.75,'#d4a017'],[-1.1,2,.5,'#b9c0c7'],[1.1,3,.32,'#b0703a']].forEach(([dx,n,h,c])=>{
    const tex=canvasTex('pod'+n,128,128,(g2,W,H)=>{g2.fillStyle='#f4f1e6';g2.fillRect(0,0,W,H);g2.fillStyle=c;g2.font='800 96px Barlow Condensed, Arial Narrow, sans-serif';g2.textAlign='center';g2.textBaseline='middle';g2.fillText(String(n),W/2,H/2+6)});
    const side=new T.MeshStandardMaterial({color:lin('#f4f1e6'),roughness:.6}),face=new T.MeshStandardMaterial({map:tex,roughness:.6});
    const b=new T.Mesh(new T.BoxGeometry(1.05,h,.9),[side,side,side,side,face,side]);b.position.set(dx,h/2,0);b.castShadow=true;b.receiveShadow=true;g.add(b)});
  g.position.set(x,0,z);g.rotation.y=0;a.wmAdd(g);return g}
/* the number boards on a racing mower (both hood sides and the seat back), and Marcus's cape */
function numberTex(n,bg,ink){return canvasTex('num'+n+bg,128,128,(g,W,H)=>{g.fillStyle=bg;g.beginPath();g.arc(W/2,H/2,60,0,6.3);g.fill();g.lineWidth=8;g.strokeStyle=ink;g.stroke();g.fillStyle=ink;g.font='800 70px Barlow Condensed, Arial Narrow, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(n),W/2,H/2+4)})}
function dressMower(obj,n,o){const a=A(),T=a.THREE;o=o||{};const br=obj.userData.bodyRoot||obj,mat=new T.MeshStandardMaterial({map:numberTex(n,'#f4f1e6','#16181a'),roughness:.6,transparent:true,polygonOffset:true,polygonOffsetFactor:-2});
  for(const s of[-1,1]){const p=new T.Mesh(new T.PlaneGeometry(.2,.2),mat);p.position.set(.6,.6,s*.282);p.rotation.y=s>0?0:Math.PI;br.add(p)}
  const back=new T.Mesh(new T.PlaneGeometry(.22,.22),mat);back.position.set(-.76,.97,0);back.rotation.y=-Math.PI/2;back.rotation.z=0;br.add(back);
  if(o.cape){const tex=canvasTex('cape',128,160,(g,W,H)=>{g.fillStyle='#c4231a';g.fillRect(0,0,W,H);g.fillStyle='#ffd34a';g.font='800 90px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('★',W/2,H*.42);
      g.fillStyle='#fff';g.font='700 22px Arial';g.fillText('DAD',W/2,H*.78)});
    const geo=new T.PlaneGeometry(.5,.62,4,6);geo.translate(0,-.31,0);const cape=new T.Mesh(geo,new T.MeshStandardMaterial({map:tex,side:T.DoubleSide,roughness:.9}));cape.position.set(-.62,1.5,0);cape.rotation.y=-Math.PI/2;br.add(cape);obj.userData.cape=cape}
  if(o.flag){const pole=new T.Mesh(new T.CylinderGeometry(.008,.008,1.1,6),std('leg',{}));pole.position.set(-.95,1.05,.3);br.add(pole);const fl=new T.Mesh(new T.PlaneGeometry(.32,.2),new T.MeshStandardMaterial({color:lin(o.flag),side:T.DoubleSide}));fl.position.set(-1.11,1.5,.3);br.add(fl);obj.userData.flag=fl}}
/* Biscuit the beagle (the LOST DOG flyer): trots, wags, ears flop */
function dogModel(){const a=A(),T=a.THREE,g=new T.Group(),body=new T.Group();g.add(body);const tan='#b8763a',wht='#f2eee4',blk='#2a221c';
  const mk=(geo,col,x,y,z,rx,ry,rz,p)=>{const m=new T.Mesh(geo,std('dog'+col,{color:lin(col),roughness:.85}));m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,rz||0);m.castShadow=true;(p||body).add(m);return m};
  mk(T.CapsuleGeometry?new T.CapsuleGeometry(.13,.34,4,10):new T.CylinderGeometry(.13,.13,.5,12),tan,0,.36,0,Math.PI/2);mk(new T.SphereGeometry(.13,10,8),tan,0,.36,.25);mk(new T.SphereGeometry(.13,10,8),wht,0,.32,-.22);mk(new T.SphereGeometry(.12,10,8),blk,0,.43,.05);
  const head=new T.Group();head.position.set(0,.5,-.33);body.add(head);mk(new T.SphereGeometry(.11,12,10),tan,0,0,0,0,0,0,head);mk(new T.BoxGeometry(.1,.08,.14),wht,0,-.04,-.11,0,0,0,head);mk(new T.SphereGeometry(.025,8,6),blk,0,-.02,-.19,0,0,0,head);
  const ears=[-1,1].map(s=>mk(new T.BoxGeometry(.03,.16,.08),'#6b4424',s*.1,-.05,.02,0,0,s*.15,head));
  const legs=[[-.08,-.17],[.08,-.17],[-.08,.17],[.08,.17]].map(([x,z])=>{const p=new T.Group();p.position.set(x,.28,z);body.add(p);mk(new T.CylinderGeometry(.03,.025,.28,6),wht,0,-.14,0,0,0,0,p);return p});
  const tail=new T.Group();tail.position.set(0,.45,.27);body.add(tail);mk(new T.CylinderGeometry(.015,.025,.2,6),tan,0,.08,.04,-.6,0,0,tail);mk(new T.SphereGeometry(.025,6,5),wht,0,.17,.1,0,0,0,tail);
  g.userData={legs,tail,ears,head,body,ph:0};a.wmAdd(g);return g}
function dogAnim(d,dt,spd){const u=d.userData;u.ph+=dt*(4+spd*2.2);const k=Math.min(1,spd/2);u.legs.forEach((l,i)=>l.rotation.x=Math.sin(u.ph+(i%2?Math.PI:0)+(i>1?Math.PI/2:0))*.7*k);
  u.tail.rotation.z=Math.sin(u.ph*2.2)*.6;u.ears.forEach((e,i)=>e.rotation.x=Math.sin(u.ph+i)*.4*k);u.body.position.y=Math.abs(Math.sin(u.ph))*.04*k}
/* water from an impact sprinkler: a rotating arc of droplets (Points) */
function sprinkler(s){const a=A(),T=a.THREE,g=new T.Group(),n=160;const head=new T.Mesh(merge([[new T.CylinderGeometry(.012,.012,.35,6),M4(0,.17,0),'#7a7a74'],[new T.CylinderGeometry(.035,.035,.06,10),M4(0,.36,0),'#b08d3a'],[new T.BoxGeometry(.16,.02,.03),M4(.06,.4,0),'#7a7a74']]),VC());g.add(head);
  const pos=new Float32Array(n*3),geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));
  const pts=new T.Points(geo,new T.PointsMaterial({color:0xd8ecff,size:.07,transparent:true,opacity:.75,depthWrite:false}));pts.frustumCulled=false;g.add(pts);g.position.set(s.x,0,s.z);a.wmAdd(g);
  const drops=[];for(let i=0;i<n;i++)drops.push({t:Math.random(),a:0});return{g,head,pts,pos,drops,ang:s.ph,dir:1,s}}
function sprinklerUpd(S,dt){S.ang+=S.dir*dt*1.1;if(S.ang>S.s.ph+1.4||S.ang<S.s.ph-1.4)S.dir*=-1;S.head.rotation.y=S.ang;
  for(let i=0;i<S.drops.length;i++){const d=S.drops[i];d.t+=dt*.9;if(d.t>1){d.t-=1;d.a=S.ang+(Math.random()-.5)*.12;d.r=S.s.r*(.6+Math.random()*.45)}const r=d.r*d.t||0;
    S.pos[i*3]=Math.cos(d.a)*r;S.pos[i*3+1]=.42+Math.sin(d.t*Math.PI)*1.1*(d.r/3);S.pos[i*3+2]=-Math.sin(d.a)*r}S.pts.geometry.attributes.position.needsUpdate=true}
/* ---------------------------------------------------------------- lawn stripes: every mower lays down a mown strip (light when
   mown one way, dark the other, like a real striped lawn) on grass tiles. One InstancedMesh ring buffer per level. */
const STRIPE_N=3200,STRIPE_W=1.04,STRIPE_STEP=.55;
const STR={mesh:null,L:null,i:0,n:0};HT.Mower=Object.assign(HT.Mower||{},{stripes:STR});/* (dev: the stripe buffer) */
function grassAt(x,z){const a=A(),W=a.WORLD;if(!W||!W.map)return false;const tx=Math.floor(x/2),tz=Math.floor(z/2),row=W.map[tz];if(!row)return false;let c=row[tx];if(W.under&&W.under[c])c=W.under[c];return c==='g'}
function stripeMesh(){const a=A(),T=a.THREE,L=a.L;if(!L)return null;if(STR.mesh&&STR.L===L&&STR.mesh.parent)return STR.mesh;
  const g=new T.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);const m=new T.MeshStandardMaterial({color:0xffffff,roughness:.95,transparent:true,opacity:.3,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  const im=new T.InstancedMesh(g,m,STRIPE_N);im.frustumCulled=false;im.renderOrder=1;im.receiveShadow=true;const c=new T.Color(1,1,1);for(let i=0;i<STRIPE_N;i++)im.setColorAt(i,c);im.count=0;/* (colours first: setColorAt sizes the buffer from count) */
  (L.group||a.scene).add(im);STR.mesh=im;STR.L=L;STR.i=0;STR.n=0;return im}
function stripeLay(m,x,z,yaw,w){if(!grassAt(x,z))return false;const im=stripeMesh();if(!im)return false;const a=A(),T=a.THREE;
  /* shade from the direction of travel: the grass leans the way the deck pushed it */
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw),k=(fx*.55+fz*.83),light=k>0;
  const col=light?(C.sL||(C.sL=lin('#9fd25a'))):(C.sD||(C.sD=lin('#3f6e26')));
  im.setMatrixAt(STR.i,M4s(x,(a.groundAt?a.groundAt(x,z):0)+.035,z,0,yaw,0,w||STRIPE_W,1,STRIPE_STEP*1.7));im.setColorAt(STR.i,col);
  STR.i=(STR.i+1)%STRIPE_N;STR.n=Math.min(STRIPE_N,STR.n+1);im.count=STR.n;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;return true}
/* call per mower per frame: lays a stripe each STRIPE_STEP metres under the deck; returns true while it is cutting grass */
function mowTick(m,x,z,yaw,spd){const fx=-Math.sin(yaw),fz=-Math.cos(yaw),dx=x+fx*.06,dz=z+fz*.06;if(m.lx==null){m.lx=dx;m.lz=dz;return false}
  const d=Math.hypot(dx-m.lx,dz-m.lz);if(d<STRIPE_STEP)return m.cut;m.cut=Math.abs(spd)>.4&&stripeLay(m,(dx+m.lx)/2,(dz+m.lz)/2,yaw,STRIPE_W);m.lx=dx;m.lz=dz;return m.cut}
/* grass clippings out of the side chute: a small shared particle pool */
const CLIP={pts:null,L:null,p:[],i:0};
function clipPool(){const a=A(),T=a.THREE,L=a.L;if(CLIP.pts&&CLIP.L===L&&CLIP.pts.parent)return CLIP;const n=260,geo=new T.BufferGeometry(),pos=new Float32Array(n*3).fill(-999),col=new Float32Array(n*3);
  for(let i=0;i<n;i++){const c=lin(['#5f9a2e','#8cc24a','#3f7a22','#a9d46a'][i%4]);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
  geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('color',new T.BufferAttribute(col,3));const pts=new T.Points(geo,new T.PointsMaterial({size:.055,vertexColors:true,transparent:true,opacity:.95,depthWrite:false}));pts.frustumCulled=false;
  (L.group||a.scene).add(pts);CLIP.pts=pts;CLIP.L=L;CLIP.p=[];for(let i=0;i<n;i++)CLIP.p.push({x:0,y:-999,z:0,vx:0,vy:0,vz:0,t:0});return CLIP}
function clipEmit(x,z,yaw,spd,dt){if(Math.abs(spd)<.8)return;const P_=clipPool(),rx=Math.cos(yaw),rz=-Math.sin(yaw),fx=-Math.sin(yaw),fz=-Math.cos(yaw),n=Math.min(4,Math.floor(dt*60*Math.min(1,Math.abs(spd)/6)+Math.random()));
  for(let k=0;k<n;k++){const q=P_.p[P_.i];P_.i=(P_.i+1)%P_.p.length;q.x=x+rx*.82+fx*.08;q.z=z+rz*.82+fz*.08;q.y=.22;const s=2+Math.random()*2.2;q.vx=rx*s+(Math.random()-.5)*.8;q.vz=rz*s+(Math.random()-.5)*.8;q.vy=.6+Math.random()*1.4;q.t=.5+Math.random()*.6}}
function clipUpd(dt){if(!CLIP.pts)return;const pos=CLIP.pts.geometry.attributes.position;let live=false;CLIP.p.forEach((q,i)=>{if(q.t<=0){if(q.y>-900){q.y=-999;pos.setXYZ(i,0,-999,0)}return}live=true;q.t-=dt;q.vy-=6*dt;q.vx*=.96;q.vz*=.96;q.x+=q.vx*dt;q.z+=q.vz*dt;q.y=Math.max(.02,q.y+q.vy*dt);pos.setXYZ(i,q.x,q.y,q.z)});if(live)pos.needsUpdate=true}
/* ---------------------------------------------------------------- sound: a single-cylinder putt and blade whine over the game's
   engine note for the mower you ride, and a buzzing pack for the field. WebAudio on HT.Audio's context, gain-staged low. */
const SND={on:false};
function sndStart(){const Au=window.HT&&HT.Audio;if(SND.on||!Au||!Au.ctx||!Au.output)return;try{const ctx=Au.ctx,out=ctx.createGain();out.gain.value=0;out.connect(Au.output);
    const putt=ctx.createOscillator();putt.type='sawtooth';putt.frequency.value=28;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=520;lp.Q.value=2.2;
    const am=ctx.createGain();am.gain.value=.5;const lfo=ctx.createOscillator();lfo.type='square';lfo.frequency.value=14;const lfoG=ctx.createGain();lfoG.gain.value=.5;lfo.connect(lfoG);lfoG.connect(am.gain);
    putt.connect(lp);lp.connect(am);const pg=ctx.createGain();pg.gain.value=.55;am.connect(pg);pg.connect(out);
    const blade=ctx.createOscillator();blade.type='triangle';blade.frequency.value=260;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=900;bp.Q.value=3;const bg=ctx.createGain();bg.gain.value=0;blade.connect(bp);bp.connect(bg);bg.connect(out);
    const pack=ctx.createOscillator();pack.type='sawtooth';pack.frequency.value=34;const pack2=ctx.createOscillator();pack2.type='sawtooth';pack2.frequency.value=41;const plp=ctx.createBiquadFilter();plp.type='lowpass';plp.frequency.value=380;const pkg=ctx.createGain();pkg.gain.value=0;
    pack.connect(plp);pack2.connect(plp);plp.connect(pkg);pkg.connect(out);
    for(const o of[putt,lfo,blade,pack,pack2])o.start();out.gain.setTargetAtTime(.9,ctx.currentTime,.3);
    Object.assign(SND,{on:true,ctx,out,putt,lfo,lp,blade,bg,pack,pack2,pkg,pg,nodes:[putt,lfo,blade,pack,pack2]})}catch(e){SND.on=false}}
function sndSet(o){if(!SND.on)return;const t=SND.ctx.currentTime,P=(p,v,tc)=>p.setTargetAtTime(v,t,tc||.06);const r=Math.max(0,Math.min(1,o.rpm||0));
  P(SND.putt.frequency,24+r*30);P(SND.lfo.frequency,12+r*16);P(SND.lp.frequency,380+r*700+(o.thr?300:0));P(SND.pg.gain,o.riding?(.32+.25*r):0,.12);
  P(SND.blade.frequency,240+r*120);P(SND.bg.gain,o.riding&&o.cut?.035+.03*r:0,.1);
  P(SND.pkg.gain,Math.min(.16,(o.pack||0)*.16),.2);P(SND.pack.frequency,30+(o.packR||0)*18);P(SND.pack2.frequency,37+(o.packR||0)*22)}
function sndStop(){if(!SND.on)return;try{const t=SND.ctx.currentTime;SND.out.gain.setTargetAtTime(0,t,.2);for(const n of SND.nodes)n.stop(t+.8)}catch(e){}SND.on=false}
function cheer(v){const Au=window.HT&&HT.Audio;if(!Au||!Au.ctx)return;try{const ctx=Au.ctx,len=1.8,b=ctx.createBuffer(1,ctx.sampleRate*len,ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++){const t=i/ctx.sampleRate,env=Math.min(1,t*5)*Math.exp(-t*1.2);d[i]=(Math.random()*2-1)*env*(.6+.4*Math.sin(t*37+Math.sin(t*5)*3))}
    const s=ctx.createBufferSource();s.buffer=b;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=1300;f.Q.value=.6;const g=ctx.createGain();g.gain.value=.16*(v||1);s.connect(f);f.connect(g);g.connect(Au.output);s.start()}catch(e){}}
function beep(hi){const Au=window.HT&&HT.Audio;if(!Au||!Au.ctx)return;try{const ctx=Au.ctx,o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;o.type='square';o.frequency.value=hi?1320:660;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+(hi?.7:.22));o.connect(g);g.connect(Au.output);o.start(t);o.stop(t+.8)}catch(e){}}
function music(state,i){try{const Au=window.HT&&HT.Audio;if(Au&&Au.music)Au.music(state,i!=null?{intensity:i}:{})}catch(e){}}
/* ---------------------------------------------------------------- overlays (HUD.overlay layers; styles inline, HUD palette) */
const FONT="font-family:var(--ui,'Barlow Condensed','Arial Narrow',sans-serif)";
function el(tag,css,html,parent){const e=document.createElement(tag);if(css)e.style.cssText=css;if(html!=null)e.innerHTML=html;if(parent)parent.appendChild(e);return e}
const OV={};
/* each overlay is a full-screen, click-through layer holding one positioned node (the layer class sets inset:0) */
function ovMount(id,node){const wrap=el('div','pointer-events:none');wrap.appendChild(node);node._wrap=wrap;OV[id]=node;try{A().overlay(id,wrap)}catch(e){}}
function ovDrop(id){const n=OV[id];if(!n)return;OV[id]=null;try{A().overlay(id,null)}catch(e){if(n._wrap)n._wrap.remove()}}
function ovDropAll(){for(const k in OV)ovDrop(k)}
/* standings tower: right side, under the trust meter */
function towerEl(){if(OV.tower)return OV.tower;const w=el('div','position:absolute;left:18px;top:'+(COARSE?'170px':'138px')+';width:200px;pointer-events:none;'+FONT+';color:#f4f1e6;text-shadow:0 1px 2px rgba(0,0,0,.6)');
  el('div','font-size:12px;letter-spacing:.14em;opacity:.8;margin-bottom:4px','GRAND PRIX · STANDINGS',w);w.list=el('div','',null,w);ovMount('mowtower',w);return w}
function towerSet(rows,title){const w=towerEl();if(title)w.firstChild.textContent=title;const key=rows.map(r=>r.key).join('|');if(w._k===key)return;w._k=key;
  w.list.innerHTML=rows.map(r=>'<div style="display:flex;align-items:center;gap:6px;margin:2px 0;padding:3px 8px;border-radius:3px;background:'+(r.you?'rgba(255,201,74,.92)':'rgba(16,20,18,.62)')+';color:'+(r.you?'#1a1a16':'#f4f1e6')+';font-weight:'+(r.you?800:600)+';font-size:15px">'
    +'<span style="width:18px;text-align:right;opacity:.85">'+r.pos+'</span><span style="width:4px;height:16px;border-radius:2px;background:'+r.col+'"></span><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+r.name+'</span><span style="font-size:13px;opacity:.85">'+r.sub+'</span></div>').join('')}
/* start lights + big countdown */
function countdownEl(){const w=el('div','position:absolute;left:0;right:0;top:22%;display:flex;flex-direction:column;align-items:center;pointer-events:none;'+FONT);
  const lights=el('div','display:flex;gap:14px;padding:12px 18px;border-radius:12px;background:rgba(14,16,15,.78);box-shadow:0 6px 24px rgba(0,0,0,.45)',null,w);w.l=[];
  for(let k=0;k<4;k++)w.l.push(el('div','width:46px;height:46px;border-radius:50%;background:#2a1412;box-shadow:inset 0 3px 8px rgba(0,0,0,.7);transition:background .08s',null,lights));
  w.t=el('div','margin-top:14px;font-size:96px;font-weight:800;letter-spacing:.04em;color:#ffd34a;text-shadow:0 4px 18px rgba(0,0,0,.6),0 0 2px #000;transform:scale(1);transition:transform .25s','',w);
  w.s=el('div','margin-top:4px;font-size:20px;letter-spacing:.12em;color:#f4f1e6;text-shadow:0 1px 3px #000','',w);ovMount('mowcount',w);return w}
function countdownSet(n,sub){const w=OV.mowcount||countdownEl();w.l.forEach((d,k)=>{d.style.background=n==='GO'?(k===3?'#3cff6a':'#2a1412'):k<n?'#ff3a24':'#2a1412';d.style.boxShadow=(n==='GO'&&k===3)||(n!=='GO'&&k<n)?'0 0 22px '+(n==='GO'?'#3cff6a':'#ff3a24'):'inset 0 3px 8px rgba(0,0,0,.7)'});
  w.t.textContent=n==='GO'?'MOW!':n?String(4-n):'';w.t.style.transform='scale(1.25)';setTimeout(()=>{if(w.t)w.t.style.transform='scale(1)'},90);w.s.textContent=sub||''}
/* the mower picker card (what you're standing next to) */
function pickCard(m,key){let w=OV.mowpick;if(!w){w=el('div','position:absolute;left:50%;bottom:150px;transform:translateX(-50%);min-width:330px;max-width:420px;padding:14px 18px 12px;border-radius:10px;background:rgba(18,22,20,.86);color:#f4f1e6;pointer-events:none;box-shadow:0 8px 28px rgba(0,0,0,.45);'+FONT);ovMount('mowpick',w)}
  if(w._k===key)return;w._k=key;const bar=(l,n)=>'<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font-size:13px;letter-spacing:.1em"><span style="width:84px;opacity:.8">'+l+'</span>'+[0,1,2,3,4].map(i=>'<span style="width:30px;height:9px;border-radius:2px;background:'+(i<n?'#ffc94a':'rgba(255,255,255,.16)')+'"></span>').join('')+'</div>';
  w.innerHTML='<div style="font-size:12px;letter-spacing:.16em;color:#ffc94a">PICK A MOWER</div><div style="font-size:28px;font-weight:800;margin:2px 0 4px">'+m.name+'</div><div style="font-size:15px;opacity:.88;margin-bottom:8px">'+m.blurb+'</div>'
    +bar('TOP SPEED',m.bars[0])+bar('TURNING',m.bars[1])+bar('GRIP',m.bars[2])}
/* the photo finish: the frame at the line, sepia, with the finish line and the margin */
function photoFinish(img,txt,sub){const w=el('div','position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;background:rgba(0,0,0,.25);'+FONT);
  const card=el('div','position:relative;padding:12px 12px 46px;background:#f4f1e6;box-shadow:0 18px 50px rgba(0,0,0,.55);transform:rotate(-2deg) scale(.9);transition:transform .35s',null,w);
  if(img){const im=el('img','display:block;width:min(62vw,720px);filter:sepia(.75) contrast(1.15) brightness(1.02);',null,card);im.src=img;el('div','position:absolute;left:50%;top:12px;bottom:46px;width:3px;background:rgba(220,30,20,.85);box-shadow:0 0 6px rgba(220,30,20,.6)',null,card)}
  el('div','position:absolute;left:0;right:0;bottom:8px;text-align:center;color:#1a1a16;font-weight:800;font-size:24px;letter-spacing:.08em',txt,card);
  if(sub)el('div','position:absolute;right:14px;top:18px;padding:3px 8px;background:#c4231a;color:#fff;font-weight:800;font-size:14px;letter-spacing:.12em',sub,card);
  ovMount('mowphoto',w);setTimeout(()=>{card.style.transform='rotate(-2deg) scale(1)'},30);return w}
/* final classification (Barb's clipboard) */
function classCard(rows,title,sub){const w=el('div','position:absolute;left:max(16px,4vw);top:13%;width:min(92vw,430px);padding:16px 20px 14px;border-radius:6px;background:#f4f1e6;color:#1a1a16;pointer-events:none;box-shadow:0 18px 50px rgba(0,0,0,.5);'+FONT);
  el('div','height:14px;margin:-16px -20px 10px;background:repeating-linear-gradient(90deg,#16181a 0 14px,#f4f1e6 14px 28px);border-radius:6px 6px 0 0',null,w);
  el('div','font-size:12px;letter-spacing:.18em;color:#7a6a4a','MAPLE HEIGHTS RIDE-ON GRAND PRIX · FINAL',w);el('div','font-size:30px;font-weight:800;margin:2px 0 8px',title,w);
  for(const r of rows)el('div','display:flex;gap:10px;align-items:center;padding:4px 6px;border-top:1px solid rgba(0,0,0,.1);font-size:17px;'+(r.you?'background:rgba(255,201,74,.55);font-weight:800':'font-weight:600'),
    '<span style="width:30px">'+r.pos+'</span><span style="width:6px;height:18px;border-radius:2px;background:'+r.col+'"></span><span style="flex:1">'+r.name+'</span><span style="opacity:.75;font-size:15px">'+r.sub+'</span>',w);
  if(sub)el('div','margin-top:10px;font-size:15px;color:#4a4a44;font-style:italic',sub,w);ovMount('mowclass',w);return w}
/* touch: a held "full throttle" button while riding (keys.shift = boost) */
function touchThrottle(on){if(!COARSE){return}if(!on){ovDrop('mowthr');return}if(OV.mowthr)return;const a=A(),b=el('div','position:absolute;right:120px;bottom:210px;width:84px;height:84px;border-radius:50%;background:rgba(255,201,74,.85);color:#1a1a16;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:800;font-size:14px;letter-spacing:.06em;pointer-events:auto;touch-action:none;user-select:none;'+FONT,'FULL<br>THROTTLE');
  const set=v=>{try{a.keys.shift=v}catch(e){}b.style.transform=v?'scale(.92)':'';b.style.background=v?'#ffd34a':'rgba(255,201,74,.85)'};b.addEventListener('pointerdown',e=>{e.preventDefault();set(true)});for(const ev of['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,()=>set(false));
  ovMount('mowthr',b)}
/* ---------------------------------------------------------------- people */
function tint(d,hex,k){if(!d||!d.root)return d;const a=A(),t=new a.THREE.Color(hex);d.root.traverse(o=>{if((o.isSkinnedMesh||o.isMesh)&&o.material&&!o.userData.tinted){o.userData.tinted=1;const one=m=>{const c=m.clone();if(c.color)c.color=c.color.clone().lerp(t,k||.35);return c};o.material=Array.isArray(o.material)?o.material.map(one):one(o.material)}});return d}
const PP=()=>window.HT&&HT.People&&HT.People.ok?HT.People:null;
function has(role){const p=PP();try{return!!(p&&p.has&&p.has(role))}catch(e){return false}}
/* rival riders: the named dads where the game has them, else the street-crew bodies in team colours (the neighbour pool when it lands) */
const LOOK={dave:{h:'dave'},marcus:{nb:'nb_marcus',role:'thug_jacket',tint:'#2f6fb5',shirt:'#2f6fb5'},phil:{nb:'nb_kenji',role:'thug_cap',tint:'#d8cfa8',shirt:'#e9e3cf'},gil:{nb:'nb_sweater',role:'thug_brown',tint:'#6f8a3a',shirt:'#7b8f3a'},walt:{nb:'nb_pops',role:'thug_beanie',tint:'#a08a5a',shirt:'#d9a521'},
  barb:{nb:'nb_office',role:'wife',tint:'#a35ab5',shirt:'#a35ab5'},gary:{h:'gary'},fan:{role:'son'},fan2:{role:'daughter'}};
function dude(id,variant){const a=A(),L_=LOOK[id]||{};let d=null;
  try{if(L_.h&&a.HOMIES[L_.h])d=a.makeDude(a.HOMIES[L_.h]);
    else if(L_.nb&&has(L_.nb))d=a.makeDude({role:L_.nb});/* the named neighbours (Riverside cast pool) */
    else{d=a.makeDude({role:L_.role,variant:variant||id,shirt:L_.shirt||'#5a7a9a',pants:'#3a3a40',skin:'#d9a07a',hat:null});if(L_.tint)tint(d,L_.tint,.38);if(d)d.stand=true}}catch(e){d=null}
  if(!d)return null;d.meshes&&d.meshes.forEach(m=>{m.userData.ent=null});a.wmAdd(d.root);return d}
function poseD(d,dt,o){try{const pp=window.HT&&HT.People;if(d&&d.rb&&pp&&pp.pose)pp.pose(d,dt||1/30,o)}catch(e){}}
function seatDude(d,obj,car,dt){if(!d)return;const a=A(),f={x:-Math.sin(car.yaw),z:-Math.cos(car.yaw)},sc=d.root.scale.y||1,gy=a.groundAt?a.groundAt(car.x,car.z):0;
  d.root.position.set(car.x+f.x*-.42,gy+.8-.59*sc,car.z+f.z*-.42);d.root.rotation.set(0,car.yaw+Math.PI,0);poseD(d,dt,{mode:'sit',aim:false,moving:false})}
function standDude(d,x,z,yaw,dt,o){if(!d)return;d.root.position.set(x,(o&&o.y)||0,z);d.root.rotation.set(0,yaw,0);poseD(d,dt,Object.assign({aim:false,moving:false},o||{}))}
/* ---------------------------------------------------------------- the course */
function clearance(cols){return(x,z)=>{let m=9;for(const c of cols){const d=Math.hypot(Math.max(c.x0-x,0,x-c.x1),Math.max(c.z0-z,0,z-c.z1));if(d<m)m=d}return m}}
function parkCols(){const a=A();return a.L.colliders.filter(c=>c.x1>PARK.x0-4&&c.x0<PARK.x1+4&&c.z1>PARK.z0-4&&c.z0<PARK.z1+4&&!(c.x1-c.x0>30))}
function buildCourse(M){const a=A(),R_=RACE();const bales=[];
  for(const[x,z0,z1]of WALLS)hayRun(bales,x,z0,x,z1,true);
  for(const[x0,z0,x1,z1]of BLOCKS){const n=Math.round((x1-x0)/1.02);for(let i=0;i<n;i++)for(const z of[z0+.3,z1-.3]){bales.push({x:x0+.51+i*1.02,y:.23,z,yaw:0});if((i+(z>z0+.5?1:0))%2===0)bales.push({x:x0+.51+i*1.02,y:.69,z,yaw:.04})}a.wmCol({x0,z0,x1,z1})}
  /* the gate: a barrier either side of the walkway, spectators behind it */
  hayRun(bales,88.3,103.6,89.9,103.6,false);hayRun(bales,94.3,103.6,95.9,103.6,false);
  /* the walkway between them: a timber kerb a dad steps over and a mower can't climb (low collider: h) */
  {const T=a.THREE,k=new T.Mesh(new T.BoxGeometry(4.4,.18,.22),std('kerb',{color:lin('#8a6a46'),roughness:.85}));k.position.set(92.1,.09,103.6);k.castShadow=true;a.wmAdd(k);a.wmCol({x0:89.9,z0:103.45,x1:94.3,z1:103.75,h:.2})}
  M.hay=hayBales(bales);
  M.T=R_.track(LINE,{clear:clearance(parkCols()),step:1,margin:.85,maxHalf:2.1});M.line=M.T.project(LINE_X,105.3,null).s;
  /* cones on the outside of every corner, and the four qualifying gates (pairs) */
  const cp=[],T_=M.T;for(let s=2;s<T_.len;s+=3.2){const p=T_.at(s),q=T_.at(s+3),b=T_.at(s-3),turn=Math.atan2(q.tz,q.tx)-Math.atan2(b.tz,b.tx),tw=Math.atan2(Math.sin(turn),Math.cos(turn));
    if(Math.abs(tw)<.3)continue;const side=tw>0?-1:1,off=Math.max(1.3,p.half+1.15),x=p.x+p.nx*side*off,z=p.z+p.nz*side*off;if(clearance(parkCols())(x,z)>.55&&!cp.some(c=>Math.hypot(c[0]-x,c[1]-z)<2.2))cp.push([x,z])}
  M.gates=QGATES.map(g=>{const q=T_.project(g.x,g.z,null),p=T_.at(q.s),hw=Math.min(2.2,Math.max(1.5,p.half+.8));cp.push([p.x+p.nx*hw,p.z+p.nz*hw,g.id],[p.x-p.nx*hw,p.z-p.nz*hw,g.id]);
    return{id:g.id,s:((q.s-M.line)%T_.len+T_.len)%T_.len,half:hw-.35,x:p.x,z:p.z}});
  M.cones=cones(cp);M.gn=gnomes(GNOMES);M.spr=SPRINKLERS.map(sprinkler);
  M.gan=gantry();
  bunting([[63.6,103.2,2.6,87.8,103.2,2.9],[96.2,103.2,2.9,120.6,103.2,2.6],[88,103.4,2.6,96,103.4,2.6],[63.6,103.6,2.5,63.6,128.2,2.5],[120.8,103.6,2.5,120.8,128.2,2.5]]);
  pitTent(103.6,109.0);podium(PODIUM.x,PODIUM.z);
  sign(['PIT','Marshal: Gary · No goats'],{x:99.4,z:107.4,yaw:Math.PI,w:1,h:.55,y:.6});
  sign(['THE STRIPES','Mow it like you mean it'],{x:81.2,z:121.6,yaw:Math.PI/2,w:1.3,h:.6,y:.5});
  sign(['GNOME GARDEN','Please do not mow the gnomes'],{x:69.2,z:110.4,yaw:-Math.PI/2,w:1.3,h:.6,y:.5,bg:'#fde9e2'});
  sign(['CAUTION','Sprinklers. Walt set a timer.'],{x:111.8,z:123.8,yaw:Math.PI,w:1.2,h:.55,y:.5,bg:'#ffe28a'});
  sign(["GIL'S OAK",'We do not talk about it'],{x:106.2,z:108.6,yaw:Math.PI,w:1.2,h:.55,y:.5});
  sign(['PADDOCK','Pick a mower →'],{x:91.4,z:108.6,yaw:Math.PI,w:1.1,h:.5,y:.6})}
/* the field: AI mowers with riders, number boards, Marcus's cape */
function buildField(M){const a=A(),CA=a.CarAI(),G=window.HT.Garage;
  M.field=FIELD.map((f,k)=>{const obj=a.makeVehicle('mower',f.col);dressMower(obj,f.num,{cape:f.id==='marcus',flag:f.id==='gil'?'#f4f1e6':null});a.wmAdd(obj);
    const st=mowerStats(Object.assign({},G.apply('mower')),'reliable');const car=CA.make('mower',{x:0,z:0,yaw:0,stats:st});car.hp=1e6;
    return Object.assign({},f,{ai:true,obj,car,rider:dude(f.id),home:[.6,-.6,.4,-.4,0][k],mw:{}})});
  for(const r of M.field)r.home=r.home||0}
function parkField(M){/* sitting on their mowers in the infield, watching qualifying */
  const spots=[[81.2,113.1],[83.6,113.1],[88.8,113.0],[91.3,113.0],[93.8,113.0]];M.field.forEach((r,k)=>{const c=r.car,[x,z]=spots[k];c.x=x;c.z=z;c.yaw=-Math.PI/2+.0;c.spd=0;r.parked=true;syncAI(r,0)})}
function syncAI(r,dt,braking){const a=A(),c=r.car,o=r.obj;
  if(r.rider&&r.rider.stand&&LOOK[r.id].nb&&has(LOOK[r.id].nb)){/* the real neighbour streamed in: swap the stand-in */const old=r.rider;if(old.root.parent)old.root.parent.remove(old.root);r.rider=dude(r.id)}o.position.set(c.x,a.groundAt?a.groundAt(c.x,c.z):0,c.z);o.rotation.set(0,c.yaw+Math.PI/2,0);
  try{const VM=window.HT.Vehicles;if(VM&&VM.update&&dt)VM.update(o,{speed:c.spd,steer:c.steer||0,braking:!!braking,dt})}catch(e){}
  if(o.userData.cape){const cp=o.userData.cape;cp.rotation.z=0;cp.rotation.x=-Math.min(1.1,Math.abs(c.spd)*.1)-Math.sin((r.t=(r.t||0)+dt*(3+Math.abs(c.spd)))*1.0)*.08*Math.min(1,Math.abs(c.spd)/3)}
  seatDude(r.rider,o,c,dt||1/30)}
/* your mower: a car entry the game's driving code accepts (enterCar/exitCar), not in the borrowable list */
function makeRide(M,opt,x,z,yaw){const a=A(),CA=a.CarAI(),m=MOWERS[opt]||MOWERS.reliable,obj=a.makeVehicle('mower',m.col);dressMower(obj,12,{});a.wmAdd(obj);
  const e={type:'mower',obj,pos:a.V3(x,0,z),yaw,spd:0,steer:0,col:null,bump:0,stats:null,owner:'grandprix',name:'Grand Prix',color:m.col,home:{x,z,yaw},dmg:0,odo:0,tile:null,meshes:[],opt,mw:{}};
  e.car=CA.make('mower',{x,z,yaw,stats:mowerStats(Object.assign({},window.HT.Garage.apply('mower')),opt)});e._seatObj=obj;e._roof=[9];a.syncCar(e);return e}
function mount(M){const a=A(),e=M.ride;if(!e||a.CV===e)return;if(a.CV)a.exitCar();a.enterCar(e);if(a.CV!==e)return;mowerStats(e.base,e.opt);mowerStats(e.stats,e.opt);e._seatObj=e.obj;e._roof=[9];
  M.mounted=true;touchThrottle(true)}
function dismount(M){const a=A();if(a.CV===M.ride)a.exitCar();M.mounted=false;touchThrottle(false)}
/* ---------------------------------------------------------------- the job */
const NAME={marcus:'Marcus',phil:'Phil',gil:'Gil',walt:'Walt',dave:'dave',gary:'gary',you:'you',Barb:'Barb',Hustler:'Hustler',Gil:'Gil'};
/* dialogue: the game's subtitle queue holds 4 lines, so scenes are fed to it one line at a time, paced by length */
const TALK={q:[],t:0};
const say=(who,t,front)=>{const a=A();if(front){TALK.q.length=0;TALK.t=Math.max(2.2,t.length*.055);a.radio(NAME[who]||who,t,true)}else TALK.q.push([who,t])};
const sayAll=(list,front)=>{if(front&&list.length){say(list[0][0],list[0][1],true);list=list.slice(1)}for(const[w,t]of list)TALK.q.push([w,t])};
function talkTick(dt){TALK.t-=dt;if(TALK.t<=0&&TALK.q.length){const[w,t]=TALK.q.shift();TALK.t=Math.max(2.2,t.length*.055);A().radio(NAME[w]||w,t,false)}}
const barb=(t,front)=>say('Barb',t,front);
function meRacer(M){if(M.me)return M.me;const r={id:'you',name:'You',player:true,col:'#ffc94a',num:12};Object.defineProperty(r,'car',{get:()=>M.ride.car,enumerable:true});return M.me=r}
function freshRace(M,laps,racers){const R_=RACE(),R=R_.make(M.T,{laps,line:M.line,racers,gates:M.gates});R.on(e=>raceEvent(M,e));return R}
function gridSlots(order){return order.map((id,k)=>({id,x:GRID[k][0],z:GRID[k][1],yaw:-Math.PI/2}))}
function placeRide(M,x,z,yaw){const e=M.ride;e.pos.set(x,0,z);e.yaw=yaw;e.spd=0;if(e.car){e.car.x=x;e.car.z=z;e.car.yaw=yaw;e.car.spd=0;e.car.vdx=-Math.sin(yaw);e.car.vdz=-Math.cos(yaw)}A().syncCar(e)}
function choose(M,k,quiet){const a=A();M.opt=k;M.ride=M.choices[k];for(const id in M.choices)if(id!==k)M.choices[id].obj.visible=true;ovDrop('mowpick');mount(M);
  if(!quiet){say('you',MOWERS[k].say,true);a.CP.mark('quali')}M.phase='toLine';music('tension',.3)}
function setupQuali(M){const a=A();M.R=freshRace(M,1,[meRacer(M)]);const e=M.ride;M.R.grid([{x:e.pos.x,z:e.pos.z,yaw:e.yaw}]);M.qPen=0;M.qStarted=false;M.qTime=null;M.phase='quali';
  for(const c of M.cones.list)if(c.down)coneReset(M.cones,c);sayAll(SAY.qualiGo,true)}
function coneReset(K,c){c.down=false;c.flying=false;c.x=c.x0??c.x;c.z=c.z0??c.z;c.y=0;c.rx=0;K.im.setMatrixAt(c.i,M4(c.x,0,c.z,0,c.yaw,0));K.im.instanceMatrix.needsUpdate=true}
function setupRace(M,quiet){const a=A();M.phase='count';M.cT=quiet?4.2:9.5;M.lightN=0;M.yellow=false;
  const order=M.gridOrder||['marcus','phil','dave','you','gil','walt'];const slots=gridSlots(order),me=meRacer(M);
  for(const sl of slots){if(sl.id==='you')placeRide(M,sl.x,sl.z,sl.yaw);else{const r=M.field.find(f=>f.id===sl.id);r.parked=false;r.car.x=sl.x;r.car.z=sl.z;r.car.yaw=sl.yaw;r.car.spd=0;r.car.vdx=-Math.sin(sl.yaw);r.car.vdz=-Math.cos(sl.yaw);syncAI(r,0)}}
  const racers=slots.map(sl=>sl.id==='you'?me:M.field.find(f=>f.id===sl.id));M.R=freshRace(M,LAPS,racers);M.R.grid(slots);M.slot=slots.find(s=>s.id==='you');
  for(const r of M.field){r.stalled=false;r.held=false;r.dnf=false;r.done=false;r.frozen=false;r.passT=0}M.sabot=false;M.choice=null;M.raceT0=null;M.lastPos=null;
  for(const c of M.cones.list)if(c.down)coneReset(M.cones,c);
  if(!M.hustlers)spawnHustlers(M);
  if(!quiet){sayAll(SAY.grid,true);setTimeout(()=>{if(M.state==='go')sayAll(SAY.hustle)},5200)}
  a.CP.mark('race')}
function spawnHustlers(M){const a=A();M.hustlers=[[102.4,112.0],[104.8,112.6]].map(([x,z],k)=>{const e=a.spawnEnemy(x,z,false);a.equip(e.dude,null);e.gun=null;e.noLeash=true;e.hp=e.maxhp=40;e.script={kind:'mow'};e.yaw=Math.PI*.9;
    e.onCuff=()=>{M.cuffedN++;if(M.cuffedN+M.escN>=2)M.chaseDone=true};return{e,k,state:'loiter',path:null}});a.rebuildTargets()}
/* Marcus's fuel line: smoke, a cough, he coasts into the pit box */
function sabotage(M,r){M.sabot=true;r.stalled=true;r.stallT=0;M.sabotT=0;const a=A();barb(SAY.barb.lap2,true);setTimeout(()=>{if(M.state==='go')sayAll(SAY.stall)},2600);
  const me=meRacer(M),pitS=((M.T.project(PIT.x,PIT.z,null).s-M.line)%M.T.len+M.T.len)%M.T.len;M.pitS=pitS;
  const ahead=((pitS+9-me.s)%M.T.len+M.T.len)%M.T.len;M.decideAt=me.prog+ahead+(ahead<6?M.T.len:0);
  for(const h of M.hustlers)if(h.state==='loiter'){h.e.pos.set(PIT.x+2.4+h.k*1.1,0,PIT.z+2.2+h.k*.6);h.e.script={kind:'mow'}}}
function helpStart(M){const a=A();M.choice='help';M.helped=true;M.yellow=true;dismount(M);M.phase='fix';barb(SAY.barb.yellow,true);music('tension',.6);a.CP&&0}
function boltStart(M){M.phase='chase';M.chaseT=0;M.chaseDone=false;say('you',SAY.bolt[1][1],true);music('combat',.9)}
/* while you're bent over Marcus's engine the two of them slip off: a head start of a few metres before you look up */
function runStart(M){const a=A();M.cuffedN=M.cuffedN||0;M.escN=0;say('Hustler',SAY.bolt[0][1],true);
  const paths=[[[106.5,113.8],[101,107.4],[93.2,104.6],[92.4,100.6],[84,98.6],[74,98.4]],[[110,117],[111,124.4],[100,124.2],[88.6,120.6],[81.6,116.4],[73.8,110.6],[66,106.2],[64.2,104]]];
  M.hustlers.forEach((h,k)=>{h.state='run';h.path=paths[k];h.pi=0;const tag=document.createElement('div');tag.className='tag';tag.textContent='HUSTLER';const host=document.getElementById('tags');if(host)host.appendChild(tag);h.e.tag=tag;h.e.script=null;runTo(h)});a.rebuildTargets()}
function runTo(h){const p=h.path[h.pi];h.e.script={kind:'to',x:p[0],z:p[1],speed:HUSTLER_V,then:()=>{h.pi++;if(h.pi<h.path.length)runTo(h);else h.state='out'}}}
function hustlerTick(M,dt){const a=A(),P=a.P;for(const h of M.hustlers){const e=h.e;
    if(h.state==='loiter'){if(!e.script||e.script.kind!=='mow')e.script={kind:'mow'};e.yaw+=Math.sin(a.simT*.7+h.k)*.002;continue}
    if(e.state==='cuffed'){if(h.state!=='cuffed'){h.state='cuffed'}continue}
    if(e.state==='surrender'){if(h.state!=='surr'){h.state='surr'}continue}
    if(h.state==='run'){if(Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z)<1.5&&!a.CV){a.surrender(e);say('Hustler',SAY.tackle[(M.tackles=(M.tackles||0)+1)%SAY.tackle.length],true);h.state='surr';continue}
      if(!e.script&&h.pi<h.path.length)runTo(h)}
    if(h.state==='out'){h.state='gone';M.escN++;e.script={kind:'incar'};e.state='dead';e.hp=0;if(e.tag){e.tag.remove();e.tag=null}if(e.dude.root.parent)e.dude.root.parent.remove(e.dude.root);const i=a.enemies.indexOf(e);if(i>=0)a.enemies.splice(i,1);a.rebuildTargets();say('you',SAY.escaped,true)}}
  if(M.phase==='chase'){M.chaseT+=dt;const left=M.hustlers.filter(h=>h.state==='run'||h.state==='surr').length;if(!left||M.chaseT>CHASE_MAX){if(M.chaseT>CHASE_MAX)for(const h of M.hustlers)if(h.state==='run'){h.state='out'}M.phase='back';say('you',SAY.back,true)}}}
/* every racer that touches you: CarAI.ram (separation, speed exchange, dents). Deliberate bumps go on Gary's clipboard */
function contacts(M,dt){const a=A(),CA=a.CarAI(),cars=[];if(M.mounted&&a.CV===M.ride)cars.push({r:meRacer(M),c:M.ride.car,me:true});for(const r of M.field)if(!r.parked)cars.push({r,c:r.car});
  for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){const A_=cars[i],B_=cars[j];if(Math.hypot(A_.c.x-B_.c.x,A_.c.z-B_.c.z)>3)continue;
    const vA=A_.c.spd,vB=B_.c.spd,res=CA.ram(A_.c,B_.c);if(!res)continue;
    if(A_.me){const e=M.ride;e.pos.x=A_.c.x;e.pos.z=A_.c.z;a.syncCar(e);
      if(res.vn>BUMP_VN&&res.front&&vA>vB+1.5&&vA>3.5&&(a.keys.w||a.keys.arrowup)&&M.phase==='race'&&!M.yellow&&!M.dq){const k='b'+B_.r.id;if((M.bumpCd[k]||0)<=0){M.bumpCd[k]=2.5;M.bumps++;
          if(M.bumps>=BUMPS_DQ){M.dq=true;say('gary',SAY.marshal[2].slice(6),true);setTimeout(()=>{if(M.state==='go')sayAll(SAY.dq)},1800);dqStart(M)}
          else say('gary',SAY.marshal[M.bumps-1].slice(6),true);try{a.feed("Gary's clipboard",'bad','bump '+M.bumps+'/'+BUMPS_DQ)}catch(e){}}}
      else if(res.vn>BUMP_VN&&(M.softCd||0)<=0&&M.phase==='race'){M.softCd=6;say('gary',SAY.marshalSoft[0].slice(6))}}}
  for(const k in M.bumpCd)M.bumpCd[k]-=dt;M.softCd=(M.softCd||0)-dt}
function dqStart(M){const a=A(),me=meRacer(M);me.dnf=true;me.frozen=true;M.finishAt=M.R.t;M.phase='finish';M.finT=6;try{a.banner&&a.banner('BLACK FLAG',"Disqualified · Gary's clipboard has spoken",3)}catch(e){}}
function raceEvent(M,e){const a=A(),r=e.r;
  if(M.phase==='quali'||M.mode==='tt'){if(e.type==='miss'&&r.player){M.qPen+=GATE_PEN;a.feed('Missed a gate','bad','+'+GATE_PEN+' s')}
    if(e.type==='finish'&&r.player)qualiDone(M,r);return}
  if(e.type==='lap'&&r.player){if(e.lap===LAPS-1){barb(pick(SAY.barb.last),true);try{a.banner('FINAL LAP','',1.6)}catch(_){}}else try{a.feed('Lap '+(e.lap+1)+' of '+LAPS,'info',tfmt(r.laps[r.laps.length-1]))}catch(_){}}
  if(e.type==='lap'&&r.id==='marcus'&&e.lap===1&&!M.sabot&&!M.dq)sabotage(M,r);
  if(e.type==='finish'){if(r.player)finishRace(M);else if(M.phase==='finish'&&!M.photoSeen&&Math.abs(e.t-(M.me.finishT||-9))<.35)M.photoWant={a:M.me,b:r}}
  if(e.type==='wrong'&&r.player&&(M.wrongCd||0)<=0){M.wrongCd=3;try{a.banner('WRONG WAY','Turn it around',1.4)}catch(_){}}}
function qualiDone(M,r){const a=A(),raw=r.laps.length?r.laps[r.laps.length-1]:r.finishT-r.lapStart,t=raw+M.qPen;M.qTime=t;M.qRaw=raw;
  if(M.mode==='tt'){M.score=Math.round(t*100)/100;let best=null;try{const j=a.SV().jobs.mowertt;best=j&&j.best&&j.best.score}catch(e){}
    try{a.banner('TIME TRIAL · '+tfmt(t),(M.qPen?'incl. '+M.qPen+' s of penalties · ':'')+(best!=null?(t<best?'New best! Was '+tfmt(best):'Best '+tfmt(best)):'First time on the board'),3.2)}catch(e){}
    barb(t<19.8?"Gold! Somebody call Phil! Actually don't, he'll cry.":t<21?"Silver! That's a lawn you could putt on!":"A time! On the board! In chalk!",true);cheer(.8);M.phase='qdone';M.qdT=3.4;return}
  const all=[{id:'you',t}].concat(FIELD.map(f=>({id:f.id,t:f.quali}))).sort((p,q)=>p.t-q.t);M.gridOrder=all.map(x=>x.id);M.qPos=M.gridOrder.indexOf('you')+1;
  const k=t<19.7?'good':t<21.6?'ok':'bad';say('Barb',pick(SAY.quali[k]).replace(/^Barb: /,''),true);
  try{a.banner('QUALIFIED '+ord(M.qPos).toUpperCase(),tfmt(t)+(M.qPen?' · incl. '+M.qPen+' s of penalties':''),3)}catch(e){}cheer(.6);
  M.phase='qdone';M.qdT=3.2;if(M.qPos===1)M.pole=true}
function finishRace(M){const a=A(),me=meRacer(M);M.phase='finish';M.finT=6;M.finishAt=me.finishT;M.place=M.R.pos(me);cheer(M.place<=3?1.2:.7);
  /* a photo finish: another mower within a third of a second of you at the line */
  for(const r of M.field){const dp=LAPS*M.T.len-r.prog;if(!r.finished&&dp>0&&dp<Math.max(1,r.car.spd)*.35||r.finished&&Math.abs(r.finishT-me.finishT)<.35){M.photoWant={a:me,b:r};break}}
  if(M.photoWant)photoSnap(M)}
function photoSnap(M){try{const H=window.__ht,cv=A().renderer||document.querySelector('canvas');if(H&&H.draw)H.draw();const c=document.querySelector('canvas');M.photoImg=c&&c.toDataURL?c.toDataURL('image/jpeg',.82):null}catch(e){M.photoImg=null}barb(SAY.barb.photo,true)}
function classify(M){const R=M.R,rows=[];const order=R.racers.slice();const est=r=>r.finished?r.finishT:r.dnf?1e9:R.t+Math.max(0,LAPS*M.T.len-r.prog)/Math.max(4.5,(r.car.spd||6)*.9)+(r.stalled&&!r.held?18:0);
  order.sort((p,q)=>est(p)-est(q));const t0=est(order.find(r=>!r.dnf));order.forEach((r,k)=>{r.cls=k+1;r.est=est(r)});
  M.place=M.dq?null:meRacer(M).cls;return order.map(r=>({pos:r.dnf?'DQ':ord(r.cls),name:r.player?'You · #12':r.name+' · #'+r.num,col:r.player?MOWERS[M.opt||'reliable'].col:r.col,you:!!r.player,
    sub:r.dnf?'black flag':r.cls===1?tfmt(r.est-M.raceT0):'+'+pf(r.est-t0,2)+' s',r}))}
function podiumStart(M){const a=A();M.phase='podium';M.podT=0;dismount(M);
  /* the first cross-neighbourhood trust event: both meters move, more if you stopped for Marcus */
  const tr=M.helped?6:3;a.addTrust(tr,'maple');a.addTrust(tr,'river');try{a.feed('Maple Heights and Riverside','trust','+'+tr+' trust each')}catch(e){}const rows=classify(M);M.rows=rows;M.trophyDone=false;
  const top=rows.filter(x=>x.pos!=='DQ').slice(0,3).map(x=>x.r);M.podiumDudes=[];
  top.forEach((r,k)=>{const off=[[0,.75],[-1.1,.5],[1.1,.32]][k];const x=PODIUM.x+off[0],z=PODIUM.z,y=off[1];
    if(r.player){a.P.pos.set(x,0,z);a.P.yaw=Math.PI;M.podiumY=y}else{M.podiumDudes.push({d:r.rider,x,z,y})}});
  if(!top.includes(meRacer(M))){a.P.pos.set(PODIUM.x+2.6,0,PODIUM.z-1.6);a.P.yaw=Math.PI*.8}
  for(const r of M.field){r.parked=true;r.car.spd=0}
  const t=M.dq?'Disqualified':ord(M.place)+' place';classCard(rows,t,M.helped?'Sportsmanship award: you stopped for Marcus.':M.choice==='kept'?'Marcus: DNF (fuel line). The cape finished strong.':'');
  barb(SAY.trophy,true);setTimeout(()=>{if(M.state!=='go')return;barb((SAY.podium[M.place]||SAY.podium.x)[0].replace(/^Barb: /,''));if(M.helped){say('dave',SAY.daveHelp);say('Crowd',SAY.chant);say('marcus',SAY.marcusEnd.replace(/^Marcus: /,''))}
    else if(M.choice==='kept')barb(SAY.keptEnd)},3600);cheer(1.4);music('victory')}
/* ---------------------------------------------------------------- per-frame */
function aiTick(M,dt){const a=A(),CA=a.CarAI(),R=M.R,me=meRacer(M),P=a.P,onFoot=!a.CV;
  const col=(p,r)=>a.collide(p,r);
  const go=M.phase==='race'||M.phase==='fix'||M.phase==='chase'||M.phase==='back'||M.phase==='finish';
  for(const r of M.field){const c=r.car;if(r.parked||!go){if(!r.parked&&Math.abs(c.spd)>.05)CA.drive(c,{thr:c.spd>0?-1:1,st:0},dt,col);if(Math.abs(c.spd)>.05){c.spd*=.9}syncAI(r,dt);continue}
    let inp;
    if(r.finished||r.dnf){/* cool-down lap: roll to the infield and stop */inp=R.ai(r,dt,{cap:4});inp.boost=false;if(r.coolT==null)r.coolT=0;r.coolT+=dt;if(r.coolT>3.5){inp.thr=-1;inp.st=0}}
    else if(r.stalled&&!r.held){/* fuel line cut: coast and pull into the pit box */r.stallT+=dt;const dx=PIT.x-c.x,dz=PIT.z-c.z,d=Math.hypot(dx,dz),err=Math.atan2(-dx,-dz)-c.yaw,e2=Math.atan2(Math.sin(err),Math.cos(err));
      inp={thr:d>1.6&&c.spd<Math.min(4,d*.8)?.5:-1,st:Math.max(-1,Math.min(1,e2*2)),boost:false,hb:false};if(d<1.6)inp.thr=c.spd>.1?-1:0;
      if((r.puffT=(r.puffT||0)-dt)<=0){r.puffT=.45;try{a.puff(a.V3(c.x+Math.sin(c.yaw)*.3,.6,c.z+Math.cos(c.yaw)*.3))}catch(e){}}}
    else if(r.held){inp={thr:c.spd>.2?-1:0,st:0,boost:false,hb:false}}
    else{inp=R.ai(r,dt,{rubber:Object.assign({},RUBBER),player:M.dq?null:me,slow:q=>slowFor(M,q),cap:M.yellow?YELLOW_V/(r.skill||1):null});
      if(M.yellow&&c.spd>YELLOW_V)inp.thr=-1;
      /* never run over a dad on foot (pit stop, chase) */
      if(onFoot){const fx=-Math.sin(c.yaw),fz=-Math.cos(c.yaw),dx=P.pos.x-c.x,dz=P.pos.z-c.z,al=dx*fx+dz*fz,sd=Math.abs(-dx*fz+dz*fx);if(al>0&&al<5&&sd<1.6){inp.thr=c.spd>.3?-1:0;inp.boost=false}}}
    const S=c.stats,g0=S.grip;S.grip=g0*wetMul(M,r,c,dt);CA.drive(c,inp,dt,col);S.grip=g0;
    if(r.mw)stripeAndClip(r.mw,c,dt);syncAI(r,dt,inp.thr<0&&c.spd>.5)}}
function slowFor(M,r){let k=1;const d=M.dog;if(d&&d.run){const c=r.car,dd=Math.hypot(d.x-c.x,d.z-c.z);if(dd<5)k=Math.min(k,.35+dd*.12)}return k}
/* sprinklers: wet grass, less grip for a second after you drive through */
function wetMul(M,r,c,dt){let wet=false;for(const s of SPRINKLERS)if(Math.hypot(c.x-s.x,c.z-s.z)<s.r)wet=true;r.wetT=wet?1.1:Math.max(0,(r.wetT||0)-dt);return r.wetT>0?.6:1}
function stripeAndClip(mw,c,dt){const cut=mowTick(mw,c.x,c.z,c.yaw,c.spd);if(cut)clipEmit(c.x,c.z,c.yaw,c.spd,dt);return cut}
function propsTick(M,dt){const a=A(),movers=[];const add=(c,id)=>movers.push({x:c.x,z:c.z,spd:c.spd,fx:-Math.sin(c.yaw),fz:-Math.cos(c.yaw),id});
  if(M.ride&&a.CV===M.ride)add(M.ride.car,'you');for(const r of M.field||[])if(!r.parked)add(r.car,r.id);
  conesUpd(M.cones,dt,movers,(c,m)=>{a.snd&&a.snd('click',.6);if(m.id==='you'&&M.phase==='quali'&&M.qStarted){M.qPen+=CONE_PEN;a.feed('Cone','bad','+'+CONE_PEN+' s')}if(m.id==='you'&&(M.coneCd||0)<=0&&Math.random()<.35){M.coneCd=8;barb(pick(["That's a cone! The cone had a family!","Cone down! Gary, write it down!"]))}});
  M.coneCd=(M.coneCd||0)-dt;
  for(const g of M.gn){if(!g.down)for(const m of movers){const d=Math.hypot(g.x-m.x,g.z-m.z);if(d<.8&&Math.abs(m.spd)>1){g.down=true;g.flying=true;g.vx=m.fx*m.spd*.9+(g.x-m.x)*2;g.vz=m.fz*m.spd*.9+(g.z-m.z)*2;g.vy=3.2;
        if(m.id==='you'&&M.ride.car){M.ride.car.spd*=.8;if(M.phase==='quali'&&M.qStarted){M.qPen+=CONE_PEN;a.feed('Gnome','bad','+'+CONE_PEN+' s')}}if((M.gnCd||0)<=0){M.gnCd=10;barb(pick(SAY.barb.gnome))}break}}
    if(g.flying){g.vy-=9.8*dt;g.x+=g.vx*dt;g.z+=g.vz*dt;g.y=Math.max(0,g.y+g.vy*dt);g.m.rotation.x+=dt*9;if(g.y<=0&&g.vy<0){g.flying=false;g.m.rotation.x=-Math.PI/2;g.y=.1}g.m.position.set(g.x,g.y,g.z)}}
  M.gnCd=(M.gnCd||0)-dt;
  for(const s of M.spr)sprinklerUpd(s,dt);clipUpd(dt);
  /* the start lights follow the countdown */
  if(M.gan){const n=M.phase==='count'?M.lightN:0,go=M.phase==='race'&&M.raceT0!=null&&a.simT-M.goAt<2;M.gan.lamps.forEach((m,k)=>m.emissiveIntensity=k<3?(k<n?3:0):(go?4:0))}
  /* Gary waves the right flag; Barb and the fans */
  const flag=M.yellow?'#ffd31a':M.dq&&M.phase==='finish'?'#16181a':M.phase==='race'&&meRacer(M).lap===LAPS-1?'#f4f1e6':'#2fbf4a';if(M.flagMat&&M.flagHex!==flag){M.flagHex=flag;M.flagMat.color.copy(lin(flag))}
  if(M.flagObj){M.flagObj.rotation.z=Math.sin(a.simT*(M.phase==='race'?7:2))*.5}
  if(!M.barb&&(has('nb_office')||has('wife')))M.barb=dude('barb');if(!M.fans.length&&has('son')&&has('daughter'))M.fans=[{d:dude('fan'),x:90.4,z:101.6},{d:dude('fan2'),x:93.4,z:101.3}];
  standDude(M.gary,93.2,108.3,0,dt,{});standDude(M.barb,95.8,102.4,Math.PI,dt,{y:.46});(M.fans||[]).forEach((f,k)=>standDude(f.d,f.x,f.z,Math.PI,dt,{}));
  dogTick(M,dt)}
/* Biscuit: runs across the east straight twice in the race (and once in qualifying if you're slow) */
function dogTick(M,dt){const D=M.dog;if(!D)return;const a=A();if(D.run){const t=D.path[D.k];if(!t){D.run=false;D.g.visible=false;return}const dx=t[0]-D.x,dz=t[1]-D.z,d=Math.hypot(dx,dz),sp=5.2;
    if(d<.3)D.k++;else{D.x+=dx/d*Math.min(d,sp*dt);D.z+=dz/d*Math.min(d,sp*dt);D.yaw=Math.atan2(-dx,-dz)}
    /* you nearly got him: he hops sideways and yips */
    const c=M.ride&&M.ride.car;if(c&&a.CV===M.ride&&Math.hypot(c.x-D.x,c.z-D.z)<1.4&&!D.dodged){D.dodged=true;D.x+=Math.cos(c.yaw)*1.4;D.z-=Math.sin(c.yaw)*1.4;barb("Somebody nearly mowed Biscuit! Shame! Shame on number twelve!",true)}
    D.g.position.set(D.x,0,D.z);D.g.rotation.y=D.yaw;dogAnim(D.g,dt,sp)}
  else{D.g.visible=false}}
function dogGo(M){const D=M.dog;if(!D||D.run)return;D.run=true;D.k=0;D.dodged=false;const flip=(D.n=(D.n||0)+1)%2;D.path=flip?[[121.2,117.5],[116.6,118.4],[112.6,117.6],[110.4,113.2],[112,108.8],[116,108.6],[121.4,112.4]]:[[121.4,112.4],[116.4,110.6],[113.2,113.2],[115.8,118.2],[121.2,118.6]];
  D.x=D.path[0][0];D.z=D.path[0][1];D.g.visible=true;barb(pick(SAY.barb.dog),true)}
function myTick(M,dt){const a=A(),e=M.ride;if(!e)return;const me=meRacer(M);
  if(a.CV===e){e._seatObj=e.obj;e._roof=[9];const c=e.car,base=e.base;
    /* sprinkler water and the yellow flag on your own mower */
    const wet=wetMul(M,me,c,dt);if(base){if(base._g0==null)base._g0=base.grip;base.grip=base._g0*wet}
    stripeAndClip(e.mw,c,dt)}
  else sndSet({riding:false,pack:0})}
/* ---------------------------------------------------------------- registration */
const DEF={giver:'dave',hood:'maple',title:'The Grass Is Greener',role:'Big Dave · Grand Prix organiser',place:'Linden Park',
  lines:["The Maple Heights Ride-On Mower Grand Prix is back. Six years. It's for charity, and the bake sale is matching every dollar.",
    "Riverside entered a team for the first time. Marcus. Tasha's dad. Somebody's been texting him to throw the race. Weird, right?",
    "Pick a mower, qualify, race five of us for three laps of Linden Park. Bumping's allowed. Gary's marshalling. Gary has a clipboard."],
  obj:'Pick a mower, set a qualifying lap, then race five neighbours over 3 laps of Linden Park. Race fair: Gary is counting bumps.',
  crew:[],weapons:['pistol'],from:{place:'g_dave'},start:{x:92,z:98},site:null,unlock:{done:['rick']},pay:500,par:0,winTrust:0,roam:true,order:30,
  stages:['pick','quali','race'],stageLabels:{pick:'Pick a mower',quali:'Qualifying',race:'The race'},failPolicy:'soft',
  medals:['Finished the race','On the podium','Won it after stopping for Marcus'],noGuns:"No guns at the Grand Prix. Barb would never let me hear the end of it.",
  radio:[],endLine:"Linden Park smells like cut grass and lemonade. Riverside and Maple Heights shared a podium. Gil says this one doesn't count as an Incident."};
function setupWorld(M,o){const a=A();M.noCars=true;M.noGuns=DEF.noGuns;M.bumpCd={};M.bumps=0;M.cuffedN=0;M.escN=0;M.helped=false;M.choice=null;M.dq=false;
  a.wmSetWindow(a.wmWindow(92,116,19));buildCourse(M);buildField(M);parkField(M);
  M.gary=dude('gary');M.barb=null;M.fans=[];try{const pp=PP();if(pp&&pp.preload)pp.preload(['wife','son','daughter','nb_marcus','nb_kenji','nb_sweater','nb_pops','nb_office']).catch(()=>{})}catch(e){}
  /* Barb's stage (two bales) and megaphone, Gary's flag */
  const T=a.THREE;hayBales([{x:95.8,y:.23,z:102.4,yaw:0}]);const mg=new T.Mesh(merge([[new T.CylinderGeometry(.05,.13,.3,14,1,true),M4(0,0,0,0,0,Math.PI/2),'#f4f1e6'],[new T.CylinderGeometry(.03,.03,.12,8),M4(-.18,-.06,0),'#d6281c']]),VC());mg.position.set(95.8,1.95,102.85);mg.rotation.y=Math.PI/2;a.wmAdd(mg);
  M.flagMat=new T.MeshStandardMaterial({color:lin('#2fbf4a'),side:T.DoubleSide,roughness:.8});const fg=new T.Group(),pole=new T.Mesh(new T.CylinderGeometry(.012,.012,1.2,6),std('leg',{}));pole.position.y=.6;fg.add(pole);
  const fl=new T.Mesh(new T.PlaneGeometry(.5,.34),M.flagMat);fl.position.set(.26,1.0,0);fg.add(fl);fg.position.set(93.7,.9,108.0);a.wmAdd(fg);M.flagObj=fg;
  M.dog={g:dogModel(),x:121,z:117,yaw:0,run:false};M.dog.g.visible=false;
  /* the paddock: three stock mowers with their spec boards */
  M.choices={};Object.keys(MOWERS).forEach((k,i)=>{const p=PADDOCK[i],m=MOWERS[k];M.choices[k]=makeRide(M,k,p.x,p.z,0);sign([m.name.replace('The ','').toUpperCase(),'#BARS'+m.bars.join(',')],{x:p.x,z:p.z+1.6,yaw:0,w:1.05,h:.62,y:.55,big:56,legs:2})});
  M.phase='pick';M.stage='pick'}
J.register('mower',{def:DEF,
  start(M,o){const a=A();M.mode='race';TALK.q.length=0;TALK.t=0;setupWorld(M,o);if(!o||!o.checkpoint){sayAll(SAY.intro,true);setTimeout(()=>{if(M.state==='go'&&M.phase==='pick')sayAll(SAY.intro2)},9000)}music('hub',.4)},
  upd(dt,M,F){mowerUpd(dt,M,F)},
  save:M=>({stage:M.stage,opt:M.opt||null,q:M.qTime==null?null:Math.round(M.qTime*100)/100,grid:M.gridOrder||null,pen:M.qPen||0}),
  load(M,s){if(!s)return;M.stage=s.stage;M.opt=s.opt;M.qTime=s.q;M.gridOrder=s.grid;M.qPen=s.pen||0;M.qPos=s.grid?s.grid.indexOf('you')+1:null;
    const a=A();if(!a||!a.P||!M.choices)return;/* (Node: state only) */if(a.CV&&a.CV!==M.ride)a.exitCar();if(!s.opt){M.phase='pick';return}choose(M,s.opt,true);M.stage=s.stage;
    if(s.stage==='race'&&s.grid)setupRace(M,true);else{placeRide(M,99.2,109.6,Math.PI*.5);M.phase='toLine'}},
  payout(M,ok){if(!ok)return[];const L_=[];if(M.dq)L_.push(["Gary's clipboard: no prize money",0]);else{const b={1:300,2:150,3:75}[M.place];if(b)L_.push([ord(M.place)+' place',b])}
    if(M.helped)L_.push(['Sportsmanship (you stopped for Marcus)',200]);if(M.pole)L_.push(['Pole position · Barb bought the lemonade',25]);if(M.cuffedN)L_.push(['Hustlers zip-tied ×'+M.cuffedN,0]);return L_},
  medal:M=>M.dq?1:M.place===1&&M.helped?3:M.place<=3?2:1,
  end(M,ok){if(!ok)return;try{const a=A(),s=a.SV();if(s){s.flags=s.flags||{};s.flags.marcusContact=true;if(M.helped)s.flags.marcusOwes=true;if(M.place===1&&!M.dq)s.flags.mowerWon=true}}catch(e){}},
  camera(dt){const M=A().M;if(M&&M.shotCam){const c=A().camera,q=M.shotCam;c.position.set(q[0],q[1],q[2]);c.lookAt(q[3],q[4],q[5]);c.fov=q[6]||50;c.updateProjectionMatrix();return true}/* (dev shots) */
    if(!M||M.phase!=='podium')return false;const cam=A().camera,t=M.podT||0;cam.position.set(PODIUM.x-1.2+Math.sin(t*.15)*1.2,2.3+t*.03,PODIUM.z-6.4+t*.08);cam.lookAt(PODIUM.x,1.3,PODIUM.z);cam.fov=48;cam.updateProjectionMatrix();return true},
  test:{give(a){/* the hub spawns registered givers when it builds: unlocked mid-session (the harness), rebuild it */try{if(window.__ht&&__ht.enterHub)__ht.enterHub()}catch(e){}},step:(a,t,o)=>bot(a,t,o),sample:()=>({stage:'race',opt:'zero',qTime:21.4,gridOrder:['marcus','phil','you','dave','gil','walt'],qPen:1})}
});
function leaveCheck(M,dt,loose){const a=A(),p=a.CV===M.ride&&M.ride?M.ride.pos:a.P.pos,b=loose?{x0:PARK.x0-14,z0:PARK.z0-14,x1:PARK.x1+14,z1:PARK.z1+6}:PARK;
  const out=p.x<b.x0||p.x>b.x1||p.z<b.z0||p.z>b.z1;M.leaveT=out?(M.leaveT||0)+dt:0;if(out&&(M.leaveWarn||0)<=0){M.leaveWarn=4;try{a.banner('BACK TO THE COURSE','The Grand Prix is in Linden Park',1.6)}catch(e){}}M.leaveWarn=(M.leaveWarn||0)-dt;
  if(M.leaveT>LEAVE_T){dismount(M);a.endMission(false,SAY.leave,'Did not finish');return true}
  if(M.ride&&a.CV===M.ride&&M.ride.car.hp<=0){dismount(M);a.endMission(false,SAY.broke,'Mower down');return true}return false}
function rows6(M){const R=M.R;return R.order().map((r,k)=>({key:r.id+(k+1)+(r.dnf?'d':'')+(r.stalled&&!r.held?'s':''),pos:r.dnf?'DQ':k+1,name:r.player?'You':r.short||r.name,col:r.player?MOWERS[M.opt||'reliable'].col:r.col,you:!!r.player,
  sub:M.phase==='count'?'#'+r.num:r.finished?'FIN':r.stalled&&!r.held?'PIT':r.dnf?'':r.player?'':gapTxt(M,r)}))}
function gapTxt(M,r){const me=meRacer(M),d=r.prog-me.prog,v=Math.max(5,Math.abs(me.car.spd)||7);return(d>0?'+':'−')+pf(Math.abs(d)/v,1)}
function mowerUpd(dt,M,F){const a=A(),P=a.P,me=M.ride?meRacer(M):null;talkTick(dt);
  /* no guns at the Grand Prix: the dad's hands stay empty */if(!a.CV&&P.dude&&P.dude.gun)a.equip(P.dude,null);
  propsTick(M,dt);if(M.hustlers)hustlerTick(M,dt);aiTick(M,dt);myTick(M,dt);if(M.ride&&!M.ride.mw)M.ride.mw={};
  for(const k in M.choices||{}){const c=M.choices[k];if(c!==M.ride&&c.obj&&a.CV!==c){/* parked */}}
  switch(M.phase){
  case 'pick':{M.stage='pick';F.objs.push(['Pick a mower in the paddock',false]);let near=null,nd=2.6;for(const k in M.choices){const e=M.choices[k],d=Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z);if(d<nd){nd=d;near=k}}
    if(near){pickCard(MOWERS[near],near);F.taps.push({x:M.choices[near].pos.x,z:M.choices[near].pos.z,r:2.6,txt:'Ride '+MOWERS[near].name,fn:()=>choose(M,near)})}else{ovDrop('mowpick');F.target={x:99.2,z:112,label:'Paddock'}}
    break}
  case 'toLine':{F.objs.push(['Ride to the start of the straight for your qualifying lap',false]);F.target={x:80.5,z:106.6,label:'Qualifying'};
    if(a.CV!==M.ride){F.taps.push({x:M.ride.pos.x,z:M.ride.pos.z,r:2.6,txt:'Get on your mower',fn:()=>mount(M)});F.target={x:M.ride.pos.x,z:M.ride.pos.z,label:'Your mower'}}
    else if(Math.hypot(M.ride.pos.x-80.5,M.ride.pos.z-106.6)<5)setupQuali(M);
    if(leaveCheck(M,dt))return;break}
  case 'quali':{M.R.update(dt);if(!M.qStarted&&me.lap===0){M.qStarted=true;music('tension',.55);beep(true)}
    F.objs.push([M.qStarted?'Qualifying lap: hit the gates, miss the cones':'Cross the line to start the clock',false]);
    const lapT=M.qStarted?M.R.t-me.lapStart:0;F.widgets.push({id:'qt',kind:'timer',label:'Lap',v:lapT});F.widgets.push({id:'qp',kind:'score',label:'Penalty',v:M.qPen,sub:'s'});
    if(!M.qStarted)F.target={x:LINE_X,z:105.3,label:'Start line'};else{const g=M.gates.find(g=>!(me.gateDone||{})[g.id]);if(g)F.target={x:g.x,z:g.z,label:'Gate'}}
    if(a.CV!==M.ride){F.taps.push({x:M.ride.pos.x,z:M.ride.pos.z,r:2.6,txt:'Get on your mower',fn:()=>mount(M)})}
    if(M.qStarted&&lapT>14&&!M.dogQ){M.dogQ=1;if(lapT<15)dogGo(M)}
    if(leaveCheck(M,dt))return;break}
  case 'qdone':{M.qdT-=dt;F.objs.push(['Qualified '+ord(M.qPos)+' · '+tfmt(M.qTime),true]);if(M.qdT<=0){M.stage='race';setupRace(M)}break}
  case 'count':{M.stage='race';const sl=M.slot;placeRide(M,sl.x,sl.z,sl.yaw);if(a.CV!==M.ride)mount(M);M.cT-=dt;
    const n=M.cT<=0?4:M.cT<=1.2?3:M.cT<=2.4?2:M.cT<=3.6?1:0;if(n!==M.lightN&&n<4){M.lightN=n;if(n)beep(false)}
    F.objs.push(['Grid: '+ord(M.gridOrder?M.gridOrder.indexOf('you')+1:4)+' · wait for the lights',false]);towerSet(rows6(M),'STARTING GRID');
    if(n>0&&n<4)countdownSet(n,'');else if(M.cT<3.9&&n===0)countdownSet(0,'BLADES UP · LIGHTS COMING');
    if(M.cT<=0){M.phase='race';M.raceT0=M.R.t;M.goAt=a.simT;countdownSet('GO','');beep(true);barb(SAY.go,true);cheer(1);music('combat',.6);setTimeout(()=>ovDrop('mowcount'),1100)}
    break}
  case 'race':case 'fix':case 'chase':case 'back':case 'finish':raceFrame(dt,M,F);break;
  case 'podium':{M.podT+=dt;towerSet([],'');ovDrop('mowtower');for(const p of M.podiumDudes)standDude(p.d,p.x,p.z,Math.PI,dt,{y:p.y});
    if(M.podiumY!=null){const d=a.P.dude;if(d&&d.root){d.root.position.y=M.podiumY}}
    if(M.podT>2.2&&!M.chanted&&M.helped){M.chanted=true;cheer(1.6)}
    F.objs.push([M.dq?'Disqualified · the crowd still clapped':ord(M.place)+' place',true]);
    if(M.podT>9.5){ovDropAll();sndStop();a.endMission(true)}break}}
  if(M.state!=='go')return}
function raceFrame(dt,M,F){const a=A(),P=a.P,R=M.R,me=meRacer(M);R.update(dt);contacts(M,dt);
  const pos=R.pos(me),lap=R.lapOf(me);
  /* chatter on position changes */
  if(M.phase==='race'&&!M.dq){if(M.lastPos!=null&&pos!==M.lastPos&&(M.chatCd||0)<=0){const ord_=R.order(),other=ord_[pos<M.lastPos?pos:pos-2];if(other&&!other.player){M.chatCd=5;const tt=SAY.trash[other.id];
        if(pos<M.lastPos){Math.random()<.55&&tt?say(other.id,pick(tt.passed)):barb(pick(SAY.barb.pass))}else{Math.random()<.6&&tt?say(other.id,pick(tt.pass)):barb(pick(SAY.barb.passed))}}}M.lastPos=pos}
  M.chatCd=(M.chatCd||0)-dt;
  /* Dave through the chicane, the sprinklers, Biscuit */
  const dv=M.field.find(r=>r.id==='dave');if(dv&&!M.saidChic&&dv.lap===0&&Math.hypot(dv.car.x-116,dv.car.z-118)<2.5&&M.phase==='race'){M.saidChic=1;barb(SAY.barb.chicane[0])}
  if(!M.saidSpr&&me.wetT>0){M.saidSpr=1;barb(SAY.barb.sprink[0])}
  if(M.phase==='race'&&me.lap===0&&me.s>18&&!M.dog1){M.dog1=1;dogGo(M)}if(M.phase==='race'&&me.lap===2&&me.s>14&&!M.dog2){M.dog2=1;dogGo(M)}
  /* the choice at the pit */
  if(M.sabot&&M.choice==null&&!M.dq){const mr=M.field.find(r=>r.id==='marcus');F.objs.push([SAY.choice,false]);F.target={x:PIT.x,z:PIT.z,label:'Help Marcus'};
    const c=M.ride.car,d=Math.hypot(c.x-PIT.x,c.z-PIT.z);if(a.CV===M.ride&&d<PIT.r&&Math.abs(c.spd)<1.8){helpStart(M);say('dave',"He's pulling in! He's pulling into the pit!")}
    else if(me.prog>M.decideAt&&!me.finished){M.choice='kept';sayAll(SAY.kept)}}
  if(M.phase==='fix'){const mr=M.field.find(r=>r.id==='marcus');F.objs.push(['Fit your spare fuel line on Marcus\'s mower',false]);F.target={x:mr.car.x,z:mr.car.z,label:'Marcus'};
    if(!M.fixed)F.holds.push({x:mr.car.x,z:mr.car.z,r:2.6,o:M.fixO||(M.fixO={}),txt:'Fit your spare fuel line',time:2.2,fn:()=>{mr.stalled=false;mr.held=true;sayAll(SAY.help);M.fixed=true;runStart(M);M.boltT=1.6}})}
  if(M.phase==='fix'&&M.fixed){M.boltT-=dt;if(M.boltT<=0)boltStart(M)}
  if(M.phase==='chase'){const run=M.hustlers.filter(h=>h.state==='run'),sur=M.hustlers.filter(h=>h.e.state==='surrender');
    F.objs.push(['Catch the hustlers · run into them, then zip-tie them',false]);F.meters.push({id:'hus',label:'Hustlers',v:M.cuffedN,max:2,style:'pips',sub:M.escN?M.escN+' got away':''});
    const tgt=sur[0]||run.sort((p,q)=>Math.hypot(p.e.pos.x-P.pos.x,p.e.pos.z-P.pos.z)-Math.hypot(q.e.pos.x-P.pos.x,q.e.pos.z-P.pos.z))[0];if(tgt)F.target={x:tgt.e.pos.x,z:tgt.e.pos.z,label:tgt.e.state==='surrender'?'Zip-tie':'Hustler'};
    F.widgets.push({id:'yel',kind:'timer',label:'Yellow flag',v:Math.max(0,CHASE_MAX-M.chaseT),hot:M.chaseT>CHASE_MAX-10})}
  if(M.phase==='back'){M.backT=(M.backT||0)+dt;F.objs.push(['Back on your mower: the field is waiting under the yellow',false]);F.target={x:M.ride.pos.x,z:M.ride.pos.z,label:'Your mower'};
    F.taps.push({x:M.ride.pos.x,z:M.ride.pos.z,r:2.6,txt:'Get on your mower',fn:()=>{mount(M);M.yellow=false;M.phase='race';const mr=M.field.find(r=>r.id==='marcus');if(mr){mr.held=false;mr.skill=1.0}barb(SAY.barb.green,true);music('combat',.75);cheer(.8)}})}
  if(M.phase==='race'||M.phase==='finish'){if(a.CV!==M.ride&&M.phase==='race'){F.taps.push({x:M.ride.pos.x,z:M.ride.pos.z,r:2.6,txt:'Get on your mower',fn:()=>mount(M)});F.target={x:M.ride.pos.x,z:M.ride.pos.z,label:'Your mower'}}
    if(M.phase==='race')F.objs.push(['Lap '+lap+' of '+LAPS+' · '+ord(pos)+' place',false])}
  if(M.phase!=='finish'){F.widgets.push({id:'pos',kind:'score',label:'Position',v:pos,max:6});F.widgets.push({id:'lap',kind:'score',label:'Lap',v:lap,max:LAPS});
    F.widgets.push({id:'rt',kind:'timer',label:'Race',v:Math.max(0,R.t-(M.raceT0||0))});F.meters.push({id:'bumps',label:"Gary's clipboard",v:M.bumps,max:BUMPS_DQ,style:'pips',warn:2,sub:M.bumps?M.bumps+' bump'+(M.bumps>1?'s':''):'clean'})}
  towerSet(rows6(M),M.yellow?'YELLOW FLAG · NO PASSING':'GRAND PRIX · LAP '+lap+'/'+LAPS);
  if(M.phase==='finish'){M.finT-=dt;F.objs.push([M.dq?'Black flag: pull off and watch the finish':'Finished '+ord(R.pos(me)),true]);if(a.CV===M.ride&&M.ride.car.spd>.3)a.keys.s=false;
    if(M.photoWant&&!M.photoShown&&M.finT<5.2){M.photoShown=true;const b=M.photoWant.b,gap=Math.abs((b.finishT||R.t)-(me.finishT||R.t));photoFinish(M.photoImg,'PHOTO FINISH · '+(R.pos(me)<R.pos(b)?'YOU':(b.short||b.name).toUpperCase())+' BY '+pf(Math.max(.01,gap),2)+' s',ord(R.pos(me)).toUpperCase());setTimeout(()=>ovDrop('mowphoto'),2600)}
    if(M.finT<=0)podiumStart(M)}
  const loose=M.phase==='fix'||M.phase==='chase'||M.phase==='back';if(M.phase!=='finish'&&leaveCheck(M,dt,loose))return}
/* ---------------------------------------------------------------- the repeatable time trial (SPEC3 3.3: Linden Park, after done.mower) */
J.register('mowertt',{def:{giver:'dave',hood:'maple',title:'Mower Time Trial',role:'Big Dave · holding the stopwatch by the Linden Park sign',place:'Linden Park',
    lines:["The course is still up. Barb won't let anybody take the cones down.","One flying lap. Cones cost a second, gates cost two. The board by the gate keeps your best.","Phil's been out here every night. In socks."],
    obj:'One flying lap of the Grand Prix course on a mower. Beat your best.',crew:[],weapons:['pistol'],from:{x:97.6,z:100.8},start:{x:92,z:98},site:null,unlock:{done:['mower']},
    repeatable:true,pay:60,par:0,winTrust:0,roam:true,order:80,stages:['lap'],stageLabels:{lap:'The lap'},medals:['Set a time','Under 21.0 s','Under 19.8 s'],noGuns:DEF.noGuns,radio:[],
    endLine:"Barb wrote your time on the board in chalk. Phil photographed it."},
  start(M,o){M.mode='tt';setupWorld(M,o);for(const r of M.field){r.obj.visible=false;if(r.rider)r.rider.root.visible=false;r.parked=true;r.car.x=-999;r.car.z=-999}
    M.field=[];if(!o||!o.checkpoint)sayAll(SAY.ttIntro,true);music('hub',.3)},
  upd(dt,M,F){talkTick(dt);if(M.phase==='qdone'){M.qdT-=dt;F.objs.push(['Time: '+tfmt(M.qTime),true]);if(M.qdT<=0){ovDropAll();sndStop();A().endMission(true)}propsTick(M,dt);myTick(M,dt);return}
    if(M.phase==='quali'&&M.R&&M.R.racers[0].finished&&M.phase!=='qdone'){}
    mowerUpd(dt,M,F)},
  save:M=>({opt:M.opt||null}),load(M,s){if(!s)return;M.opt=s.opt;const a=A();if(!a||!a.P||!M.choices||!s.opt)return;choose(M,s.opt,true);placeRide(M,99.2,109.6,Math.PI*.5);M.phase='toLine'},
  payout:(M,ok)=>ok&&M.qTime!=null?[['Lap · '+tfmt(M.qTime),0]]:[],medal:M=>M.qTime==null?1:M.qTime<19.8?3:M.qTime<21?2:1,end(){},
  test:{give(a){try{if(window.__ht&&__ht.enterHub)__ht.enterHub()}catch(e){}},step:(a,t,o)=>bot(a,t,o),sample:()=>({opt:'reliable'})}});
/* ---------------------------------------------------------------- free roam: after the Grand Prix, Dave's spare mower waits by the
   Linden Park gate. Borrow it like a neighbour's car; it stripes every lawn it crosses. */
const FR={L:null,e:null};
function freeRoam(){const a=A();if(!a||a.mode!=='hub'||!a.L||!a.L.ow||typeof a.registerCar!=='function'||typeof a.carFeel!=='function')return;glue();if(FR.L===a.L&&FR.e)return;
  let done=false;try{const s=a.SV();done=!!(s&&s.jobs&&s.jobs.mower&&s.jobs.mower.done)}catch(e){}if(!done)return;FR.L=a.L;
  try{const v=a.makeVehicle('mower','#3e8a35');dressMower(v,12,{});v.position.set(100.6,0,100.9);v.rotation.y=0;const e=a.registerCar(v,100.6,100.9);if(e){e.name='Big Dave';e.type='mower';e.yaw=-Math.PI/2;e.home={x:100.6,z:100.9,yaw:-Math.PI/2};a.syncCar(e);e.mw={};FR.e=e}}catch(err){console.warn('[mower] free roam',err)}}
J.on('vehicle',(car,dt)=>{if(!car||car.type!=='mower'||!car.car)return;car._seatObj=car.obj;car._roof=[9];const a=A();if(a.mode==='hub'){const c=car.car;car.mw=car.mw||{};stripeAndClip(car.mw,c,dt);clipUpd(dt)}});
/* the engine voice: HT.Audio.vehicle() for a mower keeps its road, skid and crash layers but mutes the car engine (stall) and drives
   the single-cylinder putt and the blades from the same set() calls */
(function wrapVoice(){const Au=window.HT&&HT.Audio;if(!Au||!Au.vehicle||Au.vehicle._mower)return;const orig=Au.vehicle;
  Au.vehicle=function(){const v=orig.apply(this,arguments);let cv=null;try{cv=A()&&A().CV}catch(e){}if(!v||!cv||cv.type!=='mower')return v;
    try{v.stall(true)}catch(e){}sndStart();const set0=v.set,stop0=v.stop;
    v.set=p=>{set0.call(v,Object.assign({},p,{rpm:0,throttle:0}));const sp=Math.abs(p.speed||0),c=cv.car,M=A().M,pk=M&&M.field?M.field.reduce((m,r)=>r.parked?m:Math.min(m,Math.hypot(r.car.x-c.x,r.car.z-c.z)),99):99;
      sndSet({riding:true,rpm:Math.min(1,.12+sp/11*.88+(p.throttle?.08:0)),thr:!!p.throttle,cut:!!(cv.mw&&cv.mw.cut),pack:pk<30?1-pk/30:0,packR:Math.random()})};
    v.stall=()=>{};v.stop=()=>{sndStop();stop0.call(v)};return v};Au.vehicle._mower=true})();
/* every frame before the HUD and the render: the rider in the mower's seat, the chase camera pulled in for a 2 m vehicle, the HUD name,
   and cleanup when a mower job ends */
J.on('hud',st=>{const a=A();if(!a)return;freeRoam();const cv=a.CV;
  if(cv&&cv.type==='mower'&&cv.car){const c=cv.car,P=a.P,d=P.dude;if(d&&d.root&&d.root.visible)seatDude(d,cv.obj,{x:cv.pos.x,z:cv.pos.z,yaw:cv.yaw},0);
    const cam=a.camera,gy=a.groundAt?a.groundAt(cv.pos.x,cv.pos.z):0,tx=cv.pos.x,ty=gy+1.19,tz=cv.pos.z,dx=cam.position.x-tx,dy=cam.position.y-ty,dz=cam.position.z-tz,dl=Math.hypot(dx,dz);
    if(dl>3&&!P.fp&&!(a.M&&a.M.phase==='podium')){const k=Math.max(.5,4.6/dl);cam.position.set(tx+dx*k,Math.max(gy+1.0,ty+dy*k*.85+.25),tz+dz*k)}
    st.vehicleName=(MOWERS[cv.opt]||{name:'Ride-on mower'}).name+' · #12';if(st.speedMph!=null)st.gear='D'}
  const mine=a.mode==='mission'&&a.M&&a.M.def&&(a.M.def.id==='mower'||a.M.def.id==='mowertt')&&a.M.state==='go';
  if(mine&&st.weapon){st.weapon.holstered=true;st.weapons=[];if(st.crosshair)st.crosshair.hidden=true}
  if(!mine){if(SND.on&&!(cv&&cv.type==='mower'))sndStop();if(Object.values(OV).some(Boolean))ovDropAll()}});
/* ---------------------------------------------------------------- the scripted player (dev/jobs-check.js): drives with the keys like
   a person would (steering duty-cycled, throttle, full throttle on straights), stops for Marcus, chases the hustlers on foot.
   opts.fail: rides straight out of the park during qualifying (fails to the 'quali' checkpoint). opts.keep: keeps racing. */
function bot(a,t,o){const M=a.M;o=o||{};if(!M||M.state!=='go'||!M.phase)return null;const k=a.keys,P=a.P,ride=M.ride;
  const tp=(x,z)=>{P.pos.set(x,0,z);a.collide(P.pos,.35)};const keysOff=()=>{k.w=k.a=k.s=k.d=k.shift=false;k.e=false};
  const steer=(c,tx,tz,vmax)=>{const dx=tx-c.x,dz=tz-c.z,d=Math.hypot(dx,dz);let err=Math.atan2(-dx,-dz)-c.yaw;err=Math.atan2(Math.sin(err),Math.cos(err));const duty=Math.min(1,Math.abs(err)*2.2);
    k.a=err>0&&(t%5)/5<duty;k.d=err<0&&(t%5)/5<duty;const want=Math.min(vmax,1+d*1.1);k.w=c.spd<want;k.s=c.spd>want+1.2;k.shift=want>9;return d};
  const walk=(x,z,sp)=>{const dx=x-P.pos.x,dz=z-P.pos.z,d=Math.hypot(dx,dz),s=Math.min(d,(sp||6.5)/30),x0=P.pos.x,z0=P.pos.z;P.pos.x+=dx/(d||1)*s;P.pos.z+=dz/(d||1)*s;P.yaw=Math.atan2(-dx,-dz);
    /* a person steps round a crate: if the straight line is blocked, slide sideways for a moment */if((M._side||0)>0){M._side--;P.pos.x+=-dz/(d||1)*s*.9;P.pos.z+=dx/(d||1)*s*.9}a.collide(P.pos,.35,0);if(s>.05&&Math.hypot(P.pos.x-x0,P.pos.z-z0)<s*.3)M._side=12;return d};
  switch(M.phase){
  case 'pick':{keysOff();if(a.CV)a.exitCar();const id=o.fail?'zero':(M.mode==='tt'?'estate':'reliable'),e=M.choices[id];
    /* a car between you and the gate (a replay parks the van on the start ring, right in the walkway): go round it like a player */
    {const cv=(a.L.cars||[]).find(c=>c.obj&&!c.convoy&&Math.abs(c.pos.x-P.pos.x)<2.6&&c.pos.z>P.pos.z-.5&&c.pos.z-P.pos.z<4.5);if(cv&&P.pos.z<103){walk(cv.pos.x+(P.pos.x<=cv.pos.x?-2.8:2.8),P.pos.z+.1);return null}}
    /* in through the gate walkway, then across the infield to the paddock */if(P.pos.z<106.5&&Math.hypot(P.pos.x-e.pos.x,P.pos.z-e.pos.z)>4){if(P.pos.z<105.6)walk(Math.abs(P.pos.x-92)>.6&&P.pos.z<103?92:92,P.pos.z<103&&Math.abs(P.pos.x-92)>.6?P.pos.z:106.2);else walk(98.8,108.8);return null}
    if(walk(e.pos.x,e.pos.z)<1.2||Math.hypot(P.pos.x-e.pos.x,P.pos.z-e.pos.z)<2.2)a.useTap=true;return null}
  case 'toLine':{if(o.fail&&!a.CV){keysOff();const W=[[92,106],[92,101],[92,94],[74,94]];M._bf=M._bf||0;if(walk(W[M._bf][0],W[M._bf][1],4.3)<.4&&M._bf<W.length-1)M._bf++;return null}
    if(a.CV!==ride){keysOff();if(walk(ride.pos.x,ride.pos.z)<1.2||Math.hypot(P.pos.x-ride.pos.x,P.pos.z-ride.pos.z)<2.2)a.useTap=true;return null}const c=ride.car;
    if(o.fail){/* gives up: off the mower and out of the gate on foot */if(a.CV)a.exitCar();const W=[[92,106],[92,101],[92,94],[74,94]];M._bf=M._bf||0;if(walk(W[M._bf][0],W[M._bf][1],4.3)<.4&&M._bf<W.length-1)M._bf++;return null}
    const W=[[99.6,108.6],[90,108.4],[82.8,107.6],[80.5,106.6]];M._bw=M._bw||0;while(M._bw<W.length-1&&Math.hypot(W[M._bw][0]-c.x,W[M._bw][1]-c.z)<2)M._bw++;steer(c,W[M._bw][0],W[M._bw][1],5.5);return null}
  case 'qdone':case 'count':case 'podium':keysOff();return null;
  case 'fix':{keysOff();const mr=M.field.find(r=>r.id==='marcus');if(walk(mr.car.x+1.3,mr.car.z)<.3)k.e=true;return null}
  case 'chase':{keysOff();const sur=M.hustlers.find(h=>h.e.state==='surrender');if(sur){if(walk(sur.e.pos.x+.8,sur.e.pos.z)<.3)a.useTap=true;return null}
    const run=M.hustlers.filter(h=>h.state==='run').sort((p,q)=>Math.hypot(p.e.pos.x-P.pos.x,p.e.pos.z-P.pos.z)-Math.hypot(q.e.pos.x-P.pos.x,q.e.pos.z-P.pos.z))[0];if(run)walk(run.e.pos.x,run.e.pos.z,6.4);return null}
  case 'back':{keysOff();if(walk(ride.pos.x,ride.pos.z)<1.2||Math.hypot(P.pos.x-ride.pos.x,P.pos.z-ride.pos.z)<2.2)a.useTap=true;return null}}
  /* racing: the same line the AI drives, the throttle and steering as key presses */
  if(a.CV!==ride){keysOff();if(walk(ride.pos.x,ride.pos.z)<1.2||Math.hypot(P.pos.x-ride.pos.x,P.pos.z-ride.pos.z)<2.2)a.useTap=true;return null}
  const me=meRacer(M),c=ride.car;
  if(M.phase==='race'&&M.sabot&&M.choice==null&&!o.keep){const dS=((M.pitS-me.s)%M.T.len+M.T.len)%M.T.len;if(dS<26||Math.hypot(c.x-PIT.x,c.z-PIT.z)<6){steer(c,PIT.x,PIT.z,Math.max(1.2,Math.hypot(c.x-PIT.x,c.z-PIT.z)*.9));if(Math.hypot(c.x-PIT.x,c.z-PIT.z)<2){k.w=false;k.s=c.spd>.4}return null}}
  if(M.phase==='finish'){k.w=false;k.shift=false;k.s=c.spd>.5;k.a=k.d=false;return null}
  me.skill=o.skill||.97;const inp=M.R.ai(me,1/30,{});const duty=Math.min(1,Math.abs(inp.st)*1.2);k.a=inp.st>.04&&(t%3)/3<duty;k.d=inp.st<-.04&&(t%3)/3<duty;k.w=inp.thr>.1;k.s=inp.thr<-.4;k.shift=!!inp.boost;
  return null}
})();
