/* =====================================================================
   SUDS UP (SPEC3 2.23, giver Pastor Dee): the youth-group car wash fundraiser on the Riverside Community Church lawn, Saturdays.
   A management game under pressure. Customers' cars (Riverside and Maple cast, in their own cars, with their own dirt: pollen, a
   bird, "WASH ME" in the dust, Benny's ice-cream drips, the Duke's old car) queue on 2nd St and pull into two bays. Each car goes
   soap -> scrub (the kids, sent to stations by you) -> rinse (you: the hose, a real water stream you aim, dirt comes off where it
   lands) -> dry (a kid with a chamois, or you). Tips scale with shine and speed. The buckets run dry (spray them full).
   The Coupon Boys keep trying to ruin it: a kinked hose, a swapped FREE sign, mud, a rival pop-up across the street, a car through
   the gutter puddle, and Kev going for the cash box. Counter with the hose, a word (E), or Gary (G). NO GUNS: kids are here.
   Controls: E (grab/place/talk), hold E (scrub, dry, fix), Left Mouse or R held: spray, G: call Gary. Touch: Spray and Gary buttons.
   Money raised goes on the big thermometer sign, which stays on the church lawn between runs; at $500 the youth center gets its van
   (parked by the church from then on), at $1,200 the summer-camp banner goes up. Seeded runs (customers, dirt, trouble order),
   scaling gently with runs played. Owns js/jobs/carwash.js only.
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
const ID='carwash';
const TUNE={shift:240,bronze:40,silver:90,gold:140,price:5,tipBase:2,tipShine:8,tipFast:4,spotless:2,
  needClean:.8,foamLeft:.2,scrubOnly:.3,soapRate:1/11,soap2:1.65,youScrub:1/8,dryRate:1/6.5,youDry:1/5.5,wetLeave:24,
  bucketUse:.03,bucketFill:.5,hoseNodes:34,hoseSeg:.8,speed:12.5,kinkSpeed:3.4,eraseR:.58,eraseK:13,
  gap:[15,20],gapMin:9,signMul:.62,freeMul:.55,patience:95,queueMax:4,kidR:14,catchR:1.35,thiefLost:52,
  trustCar:.3,trustRun:4,trustWeek:12,trustTalk:1,trustCuff:1.5,garyUses:2,goals:[500,1200]};
/* tile geometry of the church lawn (worldgen: B('A',160,10,170,15,'church'), lawn 160..170 x 16..18, sidewalk z19, 2nd St z20..22) */
const LOT={x0:320,x1:342,z0:32,z1:38};
const BAY=[{x:326.2,z:35.5},{x:336.8,z:35.5}];/* bay 1 clears the bus stop (321,39) and the lamp (329,39) */
const SPOT={reel:{x:330.9,z:32.55},spigot:{x:330.2,z:32.08},thermo:{x:322.2,z:33.4},table:{x:331.2,z:36.4},dee:{x:331.2,z:35.5},
  sign:{x:342.4,z:39.25},aframe:{x:341.2,z:38.65},chairs:[{x:330.4,z:39.05},{x:331.5,z:39.05},{x:332.6,z:39.05},{x:333.7,z:39.05}],
  bucket:[{x:323.35,z:38.55},{x:339.65,z:38.55}],wash:[{x:323.15,z:36.9},{x:339.85,z:36.9}],dry:{x:334.0,z:37.5},hang:{x:329.4,z:37.2},
  lane:41.7,far:44.6,rival:{x:334.5,z:48.6},rsign:{x:337.0,z:47.6},ring:{x:347,z:28},puddle:{x:333.5,z:40.35}};
const STN={w0:{label:'Bay 1 · Soap & scrub',short:'Bay 1',icon:'soap'},w1:{label:'Bay 2 · Soap & scrub',short:'Bay 2',icon:'soap'},dry:{label:'Drying',short:'Dry',icon:'dry'},sign:{label:'Sign on the kerb',short:'Sign',icon:'sign'},table:{label:'Hanging out',short:'—',icon:'idle'}};
const KIDS=[{id:'jaylen',name:'Jaylen',role:'nb_teen',st:'table',sc:1},{id:'sam',name:'Sam',role:'nb_kid',st:'w0',sc:1},{id:'riley',name:'Riley',role:'nb_kid',st:'dry',sc:.94},{id:'dev',name:'Dev',role:'nb_teen',st:'w1',sc:.97}];
/* customers: who, model, car, dirt, lines (arrive / pay good / pay meh) */
const CUST=[
  {id:'earl',who:'Earl',role:'earl',type:'pickup',col:'#3d5a80',dirt:'pollen',hi:"Bus is in the depot. This one's mine. The pollen got her.",ok:"Like a showroom. A showroom that drives a bus.",meh:"Still a little yellow. Like me."},
  {id:'rosa',who:'Rosa',role:'rosa',type:'minivan',col:'#7b2d3a',dirt:'washme',hi:"My kids wrote that in the dust. They spelled it right. I'm proud.",ok:"Oh, it's GONE. They're going to write something new.",meh:"I can still read 'WASH'. Fair enough."},
  {id:'benny',who:'Benny',role:'benny',type:'workvan',col:'#f4f1ea',dirt:'sticky',hi:"Rocky road. On the roof. Don't ask how.",ok:"Free cones for the youth group. Every Saturday. I mean it.",meh:"It's... a little sticky still. That's on brand."},
  {id:'okafor',who:'Ms. Okafor',role:'nb_office',type:'sedan',col:'#c9a227',dirt:'duke',hi:"Police auction. It was the Duke's. Get him off it.",ok:"There. Now it's mine.",meh:"I can still see a little bit of Duke. Hm."},
  {id:'hank',who:'Hank',role:'nb_pops',type:'pickup',col:'#9c3b2e',dirt:'dust',hi:"Sawdust. Twelve years of sawdust.",ok:"Ten percent tip. Hank's rate.",meh:"Missed a spot. Gerald would've caught it."},
  {id:'gary',who:'Gary',role:'gary',type:'sedan',col:'#5d6b7a',dirt:'light',hi:"It's already clean. I'm here for the receipt.",ok:"Itemised. Beautiful.",meh:"I'll note it in the spreadsheet. Lovingly."},
  {id:'dave',who:'Big Dave',role:'dave',type:'pickup',col:'#c77d2a',dirt:'soot',hi:"Smoker's been going since four a.m. So's the truck, apparently.",ok:"You can see your face in it. Smells like brisket still. Good.",meh:"Bit of bark on it. Brisket bark. Leave it."},
  {id:'doug',who:'Doug',role:'doug',type:'suv',col:'#4a5a3a',dirt:'mud',hi:"Don't ask where I've been. Surveillance. Mostly a ditch.",ok:"Clean. Too clean. Now everybody can see me.",meh:"Good. Keep some mud. Camouflage."},
  {id:'rick',who:'Coach Rick',role:'rick',type:'minivan',col:'#b33a3a',dirt:'mud',hi:"Soccer field. Rain. Thirty kids. This is the result.",ok:"That's fundamentals! Hands in, 'shine' on three.",meh:"Hustle on the next one, team."},
  {id:'ito',who:'Mrs. Ito',role:'nb_mei',type:'hatch',col:'#6fa8a0',dirt:'bird',hi:"One bird. ONE. It had a plan.",ok:"Not a trace. The bird has lost.",meh:"The bird is still winning a little."},
  {id:'lou',who:'Grandma Lou',role:'nb_gran',type:'sedan',col:'#8a8f99',dirt:'bird',hi:"A seagull. We are forty miles from the ocean.",ok:"You dears. Here. Buy yourselves something sugary.",meh:"Close enough for a woman my age."},
  {id:'patel',who:'Mr. Patel',role:'nb_sweater',type:'hatch',col:'#4f6d8f',dirt:'pollen',hi:"Gary says you're the best. Gary says a lot of things.",ok:"Gary was right. Don't tell Gary.",meh:"Gary will hear about this. Gently."},
  {id:'kenji',who:'Kenji',role:'nb_kenji',type:'sedan',col:'#1f2328',dirt:'dust',hi:"Black car. Shows everything. Everything.",ok:"It's black again! Black black!",meh:"Charcoal. It's charcoal now."},
  {id:'adeyemi',who:'Mr. Adeyemi',role:'nb_marcus',type:'suv',col:'#2e4a6b',dirt:'pollen',hh:'adeyemi',hi:"First Saturday on the street. We heard there's a car wash. And a thermometer.",ok:"We're staying, you know. For good.",meh:"Still a few boxes' worth of dust. Like the garage."},
  {id:'teen',who:'Marcus',role:'nb_marcus',type:'hatch',col:'#d4552f',dirt:'mud',hi:"My first car! It's mostly rust. Wash around the rust.",ok:"She's beautiful. She's MINE.",meh:"Rust is a colour. It's fine."},
  {id:'lucia',who:'Lucia',role:'nb_lucia',type:'minivan',col:'#6b5aa0',dirt:'washme',hi:"The twins wrote on it again. In the dust. Shapes, mostly.",ok:"Twins! Look! It's clean! ...Don't touch it.",meh:"The shapes are still sort of there."}];
const DIRT={pollen:{c:'#c9bf4f',top:.6,side:.3,speck:'#e3d873',n:'pollen'},washme:{c:'#9a8a70',top:.55,side:.45,speck:'#b6a68a',n:'dust',text:'WASH ME'},
  sticky:{c:'#d8a7b5',top:.4,side:.3,speck:'#6b3f2a',n:'ice cream',drips:'#8a5a3c'},duke:{c:'#7d6a52',top:.6,side:.52,speck:'#5a4836',n:'grime',hood:'THE DUKE'},
  dust:{c:'#a39478',top:.52,side:.42,speck:'#c2b49a',n:'dust'},light:{c:'#b9b19a',top:.22,side:.14,speck:'#cfc6ae',n:'barely anything'},
  soot:{c:'#4a4744',top:.55,side:.42,speck:'#2a2826',n:'smoke'},mud:{c:'#5e4632',top:.35,side:.82,speck:'#3e2c1e',n:'mud',low:true},
  bird:{c:'#b8b2a2',top:.25,side:.2,speck:'#cfc9ba',n:'a bird',birds:9}};
const LINES={
  hi:[['dee',"You came! Okay. Five dollars a car. Ten if they want the inside. Nobody wants the inside."],['dee',"The kids do the soap. You do the hose. Grab it off the reel by the wall."]],
  hose:"Got it. Now fill both buckets: point at a bucket and hold the mouse button. Or R.",
  buckets:"Buckets full. Jaylen is 'supervising' by the table. Walk up, press E, then send them to the kerb with the sign.",
  open:["We're OPEN!","SUDS! SUDS! FIVE DOLLARS!"],openDee:"There's the first one. Kids soap, you rinse. Rinse every side: top, both sides, front and back.",
  rinseTip:"Rinse it all. Roof, hood, both sides, the back. Walk around it.",
  kidFollow:["Where do you need me?","Okay okay okay. Where?","On it. Where's 'it'?","Following! Like a duckling!"],
  kidPlace:{w0:["Bay one. Soap is life.","Scrub scrub scrub."],w1:["Bay two! My bay!","I'll take the big ones."],dry:["Chamois. Chamois! I love that word.","I'm basically a towel professional."],sign:["SUDS! SUDS! FIVE DOLLARS!","CAR WASH! YOU! YES YOU!"],table:["Snack break.","I'll supervise."]},
  kidBucket:["Bucket's empty!","Mister! Water!","We need WATER over here!"],kidSoak:["AAAH! Again! Do it again!","My SHOES!","Mister Dad! That's COLD!","Water fight! WATER FIGHT!"],
  kidSign:["SUDS! SUDS! FIVE DOLLARS!","HONK IF YOU'RE DIRTY!","We wash cars AND hearts!","Your car is SAD. Make it HAPPY."],
  custSoak:["I'm wearing linen.","Was that for me or the car?","...Refreshing.","I'll take that as a 'please move'."],
  deeSoak:"I'm going to let that go because it's a fundraiser.",
  queueLeave:["Line's too long. Next Saturday.","I'll come back when the line's shorter.","Can't wait. Love the cause, though."],
  rivalGo:["Three dollars? Over there? ...Fine.","Coupon wash? Huh. Cheaper.","No line over there."],
  wetLeave:"I'll just let it air dry. On the highway.",
  free:["It says FREE.","Sign says free! Love it.","Free? Free! I'll tip. A little."],
  thermo:["The thermometer's going up!","Look at the thermometer!","Every dollar's a van tyre."],
  gary:{call:"Gary. We've got a situation at the car wash.",hi:"On my way. Bringing the clipboard.",busy:"Gary's busy. He's still on the last one.",none:"Gary's done for today. He's doing inventory on the cash box.",
    rival:"Gentlemen. Temporary vendor permit? ...I'll wait. I've got all day. I brought a chair.",sign:"There. 'Five dollars'. And I corrected your apostrophe.",kink:"Hose is a tube. Tubes go straight. Fixed.",
    mud:"Sir, that bucket is a liability. I'll be holding it. Thank you.",drive:"Sir. Sir. I have your plate. I have everyone's plate.",thief:"I don't run. I invoice."},
  bad:{kink:["Oops! Hose has a kink in it! Weird!","Just admiring your hose, man."],sign:["Free car wash! You're welcome, Riverside!","I'm a marketing genius."],mud:["Mud's free too!","Oh, it got a little dirty. Oops."],
    rival:["Coupon Wash! Three bucks! No kids, no line, no hose!","We use a mop. It's artisanal."],drive:["BEEP BEEP!","Car wash, baby!"],thief:["Thanks for the donation!","It's a loan! It's a loan!"],
    soaked:["My JACKET!","It's in my SHOES!","Okay! OKAY! I'm going!","Not the hair, man!"],talked:["...How much is the inside?","My aunt goes to this church. Please don't tell my aunt.","Yeah, okay. Okay. There's kids. My bad."],
    caught:["Okay! Okay. It's for the youth group. I know. I KNOW."],walk:"Fine. Fine. Walking. This is so embarrassing."},
  talk:{prompt:"What do you say?",opts:[["There are kids here.",'real'],["Five dollars a car. Ten for the inside.",'joke'],["I know your aunt.",'over']]},
  rivalSign:"Our sign! Our beautiful cardboard sign!",rivalPack:"Pack it up. Pack it up. They've got a HOSE.",
  zipNear:"Not in front of the kids. Walk him down to the corner first.",zip:"Zip-tie. Right here, away from the kids. Officer Ferreira's on her way.",
  box:{grab:"HEY! That's the youth group's cash box!",back:"The cash box! Thank you! Gary is going to itemise that man.",lost:"He's gone with the cash box. That's our tyres. Our TYRES."},
  ten:"Ten seconds! Last car!",time:"That's TIME! Hoses down! Count it up!",
  tally:{bad:"That's not enough to count, but the kids had fun. Next Saturday?",ok:"That's a good Saturday. A good, wet Saturday.",great:"That's the best Saturday this lot has ever seen. Somebody hug the hose guy."}};
const pick=(a,r)=>a[Math.floor((r?r():Math.random())*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const fmtT=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ================= resources: everything built here is tracked and disposed when the job ends ================= */
let RES=null;
function R(){return RES||(RES={geo:[],mat:[],tex:[],own:[],cache:{}})}
function disposeRes(r0){const r=r0||RES;if(!r0)RES=null;if(!r)return;for(const g of r.geo)try{g.dispose()}catch(_){}for(const m of r.mat)try{m.dispose()}catch(_){}for(const t of r.tex)try{t.dispose()}catch(_){}
  for(const o of r.own)try{o.userData.dispose()}catch(_){}}
const T3=()=>A().THREE;
const tg=g=>(R().geo.push(g),g),tm=m=>(R().mat.push(m),m),tt=t=>(R().tex.push(t),t);
function mat(c,o){o=o||{};const k='m|'+c+'|'+JSON.stringify(o);const C=R().cache;if(C[k])return C[k];const T=T3();
  const m=new T.MeshStandardMaterial({color:new T.Color(c).convertSRGBToLinear(),roughness:o.r==null?.7:o.r,metalness:o.m||0});if(o.e){m.emissive=new T.Color(o.e).convertSRGBToLinear();m.emissiveIntensity=o.ek||1}
  if(o.side)m.side=T.DoubleSide;if(o.op!=null&&o.op<1){m.transparent=true;m.opacity=o.op;m.depthWrite=false}return C[k]=tm(m)}
function geoC(k,fn){const C=R().cache;return C['g|'+k]||(C['g|'+k]=tg(fn()))}
const UBOX=()=>geoC('box',()=>new(T3().BoxGeometry)(1,1,1)),UCYL=s=>geoC('cyl'+s,()=>new(T3().CylinderGeometry)(1,1,1,s||12)),USPH=()=>geoC('sph',()=>new(T3().SphereGeometry)(1,12,9));
function bx(w,h,d,m,x,y,z,p,ry,rx,rz){const T=T3(),o=new T.Mesh(UBOX(),typeof m==='string'?mat(m):m);o.scale.set(w,h,d);o.position.set(x||0,y||0,z||0);o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=h>.08||w>.3;o.receiveShadow=true;if(p)p.add(o);return o}
function cy(r,h,m,x,y,z,p,seg,rx,rz){const T=T3(),o=new T.Mesh(UCYL(seg||12),typeof m==='string'?mat(m):m);o.scale.set(r,h,r);o.position.set(x||0,y||0,z||0);o.rotation.set(rx||0,0,rz||0);o.castShadow=true;o.receiveShadow=true;if(p)p.add(o);return o}
function rod(a,b,r,m,p,seg){const T=T3(),dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],L=Math.hypot(dx,dy,dz)||1e-4;const o=new T.Mesh(UCYL(seg||8),typeof m==='string'?mat(m):m);o.scale.set(r,L,r);
  o.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(dx/L,dy/L,dz/L));o.castShadow=true;if(p)p.add(o);return o}
let UIF=null;function uiFont(){if(UIF)return UIF;let f='';try{f=getComputedStyle(document.documentElement).getPropertyValue('--ui').trim()}catch(_){}return UIF=f||'"Barlow Condensed","Arial Narrow",sans-serif'}
function canvasTex(w,h,draw,keep){const T=T3(),c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;if(!keep)tt(t);return t}
function plane(w,h,tex,x,y,z,p,ry,o){const T=T3();o=o||{};const m=tm(new T.MeshStandardMaterial({map:tex,roughness:o.r||.8,side:o.side?T.DoubleSide:T.FrontSide,transparent:!!o.tr,alphaTest:o.tr?.02:0}));
  const g=geoC('pl',()=>new T.PlaneGeometry(1,1)),me=new T.Mesh(g,m);me.scale.set(w,h,1);me.position.set(x,y,z);me.rotation.y=ry||0;me.castShadow=!!o.cast;me.receiveShadow=true;if(p)p.add(me);return me}

/* ================= props ================= */
function padModel(){/* the wash pad: tarp-free concrete apron over the lawn, darker where it's wet, a drain line to the gutter */const T=T3(),g=new T.Group();
  const tex=canvasTex(512,160,(c,w,h)=>{c.fillStyle='#8d8a84';c.fillRect(0,0,w,h);for(let i=0;i<2600;i++){const v=110+Math.random()*60|0;c.fillStyle='rgba('+v+','+v+','+(v-4)+','+(.08+Math.random()*.1)+')';c.fillRect(Math.random()*w,Math.random()*h,2,2)}
    c.strokeStyle='rgba(40,40,40,.35)';c.lineWidth=2;for(const x of[.27,.5,.73])c.beginPath(),c.moveTo(x*w,0),c.lineTo(x*w,h),c.stroke();
    const wet=(x,y,r,a)=>{const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(38,44,48,'+a+')');gr.addColorStop(1,'rgba(38,44,48,0)');c.fillStyle=gr;c.beginPath();c.ellipse(x,y,r,r*.55,0,0,7);c.fill()};
    wet(w*.15,h*.55,110,.55);wet(w*.85,h*.55,110,.55);wet(w*.5,h*.9,90,.35)});
  const m=tm(new T.MeshStandardMaterial({map:tex,roughness:.55,metalness:.02,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  const p=new T.Mesh(geoC('pl',()=>new T.PlaneGeometry(1,1)),m);p.rotation.x=-Math.PI/2;p.scale.set(LOT.x1-LOT.x0-.3,LOT.z1-LOT.z0-.15,1);p.position.set((LOT.x0+LOT.x1)/2,.022,(LOT.z0+LOT.z1)/2);p.receiveShadow=true;g.add(p);
  /* soap runoff into the gutter */const rt=canvasTex(256,64,(c,w,h)=>{const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(240,246,250,.0)');gr.addColorStop(.5,'rgba(220,232,240,.55)');gr.addColorStop(1,'rgba(240,246,250,0)');c.fillStyle=gr;c.fillRect(0,0,w,h);
    for(let i=0;i<90;i++){c.fillStyle='rgba(255,255,255,'+(.3+Math.random()*.5)+')';c.beginPath();c.arc(Math.random()*w,h*.3+Math.random()*h*.4,1+Math.random()*3,0,7);c.fill()}});
  const rm=tm(new T.MeshStandardMaterial({map:rt,transparent:true,roughness:.15,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
  const r=new T.Mesh(geoC('pl',()=>new T.PlaneGeometry(1,1)),rm);r.rotation.x=-Math.PI/2;r.scale.set(9,1.1,1);r.position.set(SPOT.puddle.x,.035,SPOT.puddle.z);g.add(r);
  return g}
function canopyModel(lines,col){/* pop-up canopy: four legs, a peaked roof, a valance with lettering */const T=T3(),g=new T.Group(),leg=mat('#b9bec4',{r:.3,m:.8}),W=2.9,H=2.25;
  for(const[x,z]of[[-1,-1],[1,-1],[-1,1],[1,1]]){cy(.025,H,leg,x*W/2,H/2,z*W/2,g,8);bx(.18,.02,.18,'#6a6e73',x*W/2,.01,z*W/2,g)}
  const roof=tm(new T.MeshStandardMaterial({color:new T.Color(col).convertSRGBToLinear(),roughness:.85,side:T.DoubleSide}));
  const rg=tg(new T.ConeGeometry(W*.74,.62,4,1,true));const rf=new T.Mesh(rg,roof);rf.rotation.y=Math.PI/4;rf.position.y=H+.31;rf.castShadow=true;g.add(rf);
  const tex=canvasTex(1024,128,(c,w,h)=>{c.fillStyle=col;c.fillRect(0,0,w,h);c.fillStyle='#f6f1e3';c.textAlign='center';c.font='900 78px '+uiFont();c.fillText(lines,w/2,96)});
  for(let k=0;k<4;k++){const a=k*Math.PI/2,m=plane(W,.3,tex,Math.sin(a)*W/2,H-.13,Math.cos(a)*W/2,g,a,{side:true});m.castShadow=false}
  return g}
function tableModel(){const T=T3(),g=new T.Group(),top=mat('#f2f0ea',{r:.6}),leg=mat('#8a9096',{r:.4,m:.7});bx(1.8,.04,.75,top,0,.74,0,g);
  for(const[x,z]of[[-.8,-.3],[.8,-.3],[-.8,.3],[.8,.3]])cy(.016,.74,leg,x,.37,z,g,6);
  /* a tablecloth skirt with the youth group's hand-lettered banner */const tex=canvasTex(512,160,(c,w,h)=>{c.fillStyle='#2f6f8f';c.fillRect(0,0,w,h);c.fillStyle='#ffd23f';c.textAlign='center';c.font='900 52px '+uiFont();c.fillText('YOUTH GROUP',w/2,66);
    c.fillStyle='#f6f1e3';c.font='700 40px '+uiFont();c.fillText('CAR WASH · $5',w/2,124);for(let i=0;i<9;i++){c.fillStyle=['#ff6f91','#7fd1ff','#9fe58a','#ffd23f'][i%4];c.beginPath();c.arc(30+i*56,148,6,0,7);c.fill()}});
  plane(1.78,.56,tex,0,.45,.38,g,0);
  /* cash box, a donation jar with bills in it, a roll of paper towels, a stack of chamois */
  const box=new T.Group();bx(.34,.14,.24,'#3b6e4f',0,.07,0,box,0,0,0);bx(.35,.03,.25,'#2f5a40',0,.15,-.01,box,0,-.2);bx(.06,.03,.02,'#c9a35a',0,.1,.125,box);box.position.set(-.45,.76,0);g.add(box);
  const jar=new T.Mesh(UCYL(16),tm(new T.MeshPhysicalMaterial({color:0xffffff,transmission:0,roughness:.05,transparent:true,opacity:.35,depthWrite:false})));jar.scale.set(.1,.24,.1);jar.position.set(.1,.88,-.05);g.add(jar);
  for(let i=0;i<5;i++)bx(.12,.005,.06,'#7fae5d',.1+(Math.random()-.5)*.06,.78+i*.03,-.05+(Math.random()-.5)*.05,g,Math.random()*3);
  cy(.06,.24,'#f4f1ea',.55,.88,.15,g,12);for(let i=0;i<3;i++)bx(.3,.02,.22,['#4f86c6','#e8a23a','#9fe58a'][i],.6,.77+i*.022,-.15,g,.2*i);
  return{g,box}}
function thermoModel(){/* the thermometer sign: plywood on two posts, a red bulb and a tube filled by a canvas texture */const T=T3(),g=new T.Group(),wood=mat('#c8a678',{r:.85}),post=mat('#6b4a2e',{r:.9});
  for(const x of[-.75,.75])bx(.1,2.7,.1,post,x,1.35,-.06,g);bx(1.7,2.3,.05,wood,0,1.55,0,g);
  const cv=document.createElement('canvas');cv.width=256;cv.height=384;const tex=new T.CanvasTexture(cv);tex.encoding=T.sRGBEncoding;tex.anisotropy=4;tt(tex);
  const face=plane(1.62,2.22,tex,0,1.55,.03,g,0);g.userData={};return{g,cv,tex,face}}
function drawThermo(th,raised,run,goal,label,done){const c=th.cv.getContext('2d'),w=th.cv.width,h=th.cv.height,F=uiFont();c.clearRect(0,0,w,h);c.fillStyle='#f3ead8';c.fillRect(0,0,w,h);
  c.strokeStyle='#2f6f8f';c.lineWidth=8;c.strokeRect(6,6,w-12,h-12);c.fillStyle='#2f6f8f';c.textAlign='center';c.font='900 30px '+F;c.fillText('HELP US GET',w/2,44);c.font='900 34px '+F;c.fillStyle='#c0392b';
  const words=label.toUpperCase().split(' ');let l1='',l2='';for(const wd of words){if((l1+' '+wd).length<15&&!l2)l1=(l1?l1+' ':'')+wd;else l2=(l2?l2+' ':'')+wd}c.fillText(l1,w/2,80);if(l2)c.fillText(l2,w/2,112);
  const tx=w/2-22,ty=128,th_=196,tw=44;c.fillStyle='#fff';c.fillRect(tx,ty,tw,th_);c.strokeStyle='#333';c.lineWidth=4;c.strokeRect(tx,ty,tw,th_);
  const f=clamp(raised/goal,0,1),fr=clamp((raised-run)/goal,0,1);c.fillStyle='#e74c3c';c.fillRect(tx+4,ty+th_-th_*f,tw-8,th_*f);c.fillStyle='#b8322a';c.fillRect(tx+4,ty+th_-th_*fr,tw-8,th_*fr);
  c.beginPath();c.arc(w/2,ty+th_+22,30,0,7);c.fillStyle='#e74c3c';c.fill();c.lineWidth=4;c.stroke();
  for(let k=1;k<5;k++){const y=ty+th_-th_*k/5;c.fillStyle='#333';c.fillRect(tx+tw,y-1,12,3);c.font='700 16px '+F;c.textAlign='left';c.fillText('$'+Math.round(goal*k/5),tx+tw+16,y+6)}
  c.textAlign='center';c.fillStyle=done?'#2f8f5a':'#2f6f8f';c.font='900 30px '+F;c.fillText(done?'WE DID IT! THANK YOU!':money(raised)+' of '+money(goal),w/2,h-22);th.tex.needsUpdate=true}
function priceSign(free){return canvasTex(256,320,(c,w,h)=>{const F=uiFont();c.fillStyle=free?'#fffbe8':'#2f6f8f';c.fillRect(0,0,w,h);c.textAlign='center';
  if(free){c.save();c.translate(w/2,h/2);c.rotate(-.12);c.fillStyle='#d62828';c.font='900 76px "Comic Sans MS",'+F;c.fillText('FREE',0,-30);c.font='900 54px "Comic Sans MS",'+F;c.fillText('CAR',0,34);c.fillText('WASH!!',0,94);c.restore();
    c.strokeStyle='#d62828';c.lineWidth=5;c.beginPath();c.moveTo(30,40);c.lineTo(80,30);c.stroke()}
  else{c.strokeStyle='#ffd23f';c.lineWidth=10;c.strokeRect(8,8,w-16,h-16);c.fillStyle='#f6f1e3';c.font='900 56px '+F;c.fillText('CAR',w/2,80);c.fillText('WASH',w/2,138);c.fillStyle='#ffd23f';c.font='900 88px '+F;c.fillText('$5',w/2,232);
    c.fillStyle='#f6f1e3';c.font='700 26px '+F;c.fillText('YOUTH GROUP',w/2,284)}})}
function aframeModel(){const T=T3(),g=new T.Group(),wood=mat('#7a5a3a',{r:.85});const faces=[];
  for(const s of[-1,1]){const p=new T.Group();p.rotation.x=s*.2;p.position.z=s*.13;g.add(p);bx(.62,.86,.03,wood,0,.46,0,p);
    const m=tm(new T.MeshStandardMaterial({map:priceSign(false),roughness:.9}));const f=new T.Mesh(geoC('pl',()=>new T.PlaneGeometry(1,1)),m);f.scale.set(.54,.74,1);f.position.set(0,.47,s*.017);if(s<0)f.rotation.y=Math.PI;p.add(f);faces.push(m)}
  return{g,faces}}
function bucketModel(){const T=T3(),g=new T.Group(),body=tm(new T.MeshStandardMaterial({color:new T.Color('#e8a23a').convertSRGBToLinear(),roughness:.45,side:T.DoubleSide}));
  const bg=geoC('bucket',()=>new T.CylinderGeometry(.19,.15,.34,20,1,true)),b=new T.Mesh(bg,body);b.position.y=.17;b.castShadow=true;g.add(b);cy(.15,.01,'#c98a2a',0,.005,0,g,20);
  const handle=rod([-.19,.33,0],[0,.48,0],.006,'#8c8f93',g,5);rod([0,.48,0],[.19,.33,0],.006,'#8c8f93',g,5);void handle;
  const wm=tm(new T.MeshStandardMaterial({color:new T.Color('#c7d9e4').convertSRGBToLinear(),roughness:.08,metalness:.1,transparent:true,opacity:.85}));
  const water=new T.Mesh(UCYL(20),wm);water.scale.set(.17,.01,.17);g.add(water);
  const foam=new T.Group();for(let i=0;i<9;i++){const s=new T.Mesh(USPH(),mat('#fbfbf8',{r:.6}));const a=i*.7,r=.05+Math.random()*.08;s.scale.set(.05,.03,.05);s.position.set(Math.cos(a)*r,0,Math.sin(a)*r);foam.add(s)}g.add(foam);
  const sponge=bx(.12,.05,.08,'#ffd23f',.02,.36,.04,g,.4);sponge.userData.sp=1;g.userData={water,foam,sponge};return g}
function setBucket(b,v){const u=b.userData;const y=.02+.28*clamp(v,0,1);u.water.position.y=y;u.water.scale.set(.15+.035*v,.01,.15+.035*v);u.water.visible=v>.02;u.foam.position.y=y+.01;u.foam.visible=v>.15;u.sponge.position.y=Math.max(.36,y+.03)}
function chairModel(){const T=T3(),g=new T.Group(),al='#c8ccd0';
  for(const s of[-1,1]){bx(.03,.03,.5,al,s*.24,.4,0,g);bx(.03,.42,.03,al,s*.24,.2,.22,g);bx(.03,.42,.03,al,s*.24,.2,-.2,g);bx(.03,.5,.03,al,s*.24,.64,.28,g,0,-.2)}
  for(let i=0;i<4;i++)bx(.48,.012,.09,i%2?'#2f6f8f':'#f4f1ea',0,.41,-.16+i*.11,g);for(let i=0;i<4;i++)bx(.48,.09,.012,i%2?'#2f6f8f':'#f4f1ea',0,.48+i*.1,.3+i*.022,g,0,-.2);return g}
function spigotModel(){const T=T3(),g=new T.Group(),brass=mat('#b8873a',{r:.3,m:.85}),green=mat('#2f7d3a',{r:.55});cy(.03,.12,brass,0,.55,.06,g,10,Math.PI/2);cy(.04,.02,brass,0,.62,.1,g,10);
  /* the reel: a drum on a frame with green hose wound on it */const reel=new T.Group();reel.position.set(SPOT.reel.x-SPOT.spigot.x,0,SPOT.reel.z-SPOT.spigot.z);g.add(reel);
  for(const s of[-1,1]){bx(.03,.62,.42,'#3c4a5a',s*.24,.31,0,reel);}const drum=cy(.2,.44,green,0,.4,0,reel,18,0,Math.PI/2);for(const s of[-1,1])cy(.27,.02,'#3c4a5a',s*.23,.4,0,reel,18,0,Math.PI/2);
  reel.userData.drum=drum;g.userData={reel};return g}
function nozzleModel(){/* a pistol-grip spray nozzle, +Z forward, grip at the origin */const T=T3(),g=new T.Group(),y=mat('#f0c02a',{r:.45}),blk=mat('#22252a',{r:.6}),al=mat('#c9ced3',{r:.3,m:.85});
  bx(.035,.11,.04,blk,0,-.03,0,g,0,-.25);cy(.022,.17,y,0,.035,.07,g,10,Math.PI/2);cy(.03,.035,al,0,.035,.165,g,12,Math.PI/2);cy(.016,.05,blk,0,.035,-.03,g,8,Math.PI/2);bx(.012,.07,.03,al,0,-.02,.035,g,0,.35);return g}
function spongeModel(col){const g=new(T3().Group)();bx(.13,.06,.09,col||'#ffd23f',0,0,.04,g);return g}
function signStick(){const g=new(T3().Group)(),T=T3();cy(.014,1.1,'#a8743f',0,.3,0,g,6);const tex=canvasTex(256,192,(c,w,h)=>{const F=uiFont();c.fillStyle='#ffd23f';c.fillRect(0,0,w,h);c.fillStyle='#c0392b';c.textAlign='center';c.font='900 64px '+F;c.fillText('CAR',w/2,70);c.fillText('WASH',w/2,132);c.fillStyle='#2f6f8f';c.font='900 44px '+F;c.fillText('$5 →',w/2,180)});
  const m=tm(new T.MeshStandardMaterial({map:tex,roughness:.85,side:T.DoubleSide}));const p=new T.Mesh(geoC('pl',()=>new T.PlaneGeometry(1,1)),m);p.scale.set(.56,.42,1);p.position.y=.95;g.add(p);return g}
function rivalModel(){const T=T3(),g=canopyModel('COUPON WASH','#2aa39a');g.scale.setScalar(.85);
  const tbl=bx(1.1,.05,.5,'#d8d2c4',0,.72,-.5,g);void tbl;for(const[x,z]of[[-.5,-.7],[.5,-.7],[-.5,-.3],[.5,-.3]])cy(.015,.72,'#8a9096',x,.36,z,g,6);
  const cooler=bx(.5,.36,.34,'#3a7fc4',.8,.18,.6,g);void cooler;const mop=new T.Group();rod([0,0,0],[0,1.3,.1],.015,'#a8743f',mop);bx(.26,.06,.08,'#8a7d62',0,.02,0,mop);mop.position.set(-1,0,.8);mop.rotation.z=.25;g.add(mop);
  const b=bucketModel();b.position.set(-.7,0,.5);setBucket(b,.6);b.userData.water.material=mat('#7d6a4a',{r:.2,op:.9});g.add(b);return g}
function rivalSign(){const T=T3(),g=new T.Group();rod([0,0,0],[0,1.25,0],.02,'#a8743f',g,6);
  const tex=canvasTex(320,240,(c,w,h)=>{const F=uiFont();c.fillStyle='#b88a52';c.fillRect(0,0,w,h);for(let i=0;i<30;i++){c.fillStyle='rgba(90,60,30,.12)';c.fillRect(0,Math.random()*h,w,2)}
    c.fillStyle='#1d1d1d';c.textAlign='center';c.font='900 50px "Comic Sans MS",'+F;c.fillText('COUPON',w/2,58);c.fillText('WASH $3',w/2,112);c.font='700 26px "Comic Sans MS",'+F;c.fillText('NO LINE · NO KIDS',w/2,162);c.fillText('NO HOSE (MOP)',w/2,200)});
  const board=new T.Group();board.position.y=1.15;g.add(board);plane(.9,.66,tex,0,0,0,board,0,{side:true,cast:true});g.userData={board};return g}
function kinkModel(){/* a hose kink: a tight loop of green hose with a crease */const T=T3(),g=new T.Group();const tg_=geoC('kink',()=>new T.TorusGeometry(.13,.022,8,20,Math.PI*1.75)),m=new T.Mesh(tg_,mat('#2f7d3a',{r:.55}));m.rotation.x=-Math.PI/2+.3;m.position.y=.12;m.castShadow=true;g.add(m);return g}
function mudBucket(){const g=bucketModel();setBucket(g,.8);g.userData.water.material=mat('#4a3424',{r:.5});g.userData.foam.visible=false;g.userData.sponge.visible=false;g.userData.foam.scale.setScalar(.001);return g}
function bannerModel(){const T=T3(),tex=canvasTex(1024,192,(c,w,h)=>{const F=uiFont();c.fillStyle='#f6f1e3';c.fillRect(0,0,w,h);c.strokeStyle='#2f6f8f';c.lineWidth=12;c.strokeRect(8,8,w-16,h-16);c.fillStyle='#2f6f8f';c.textAlign='center';c.font='900 84px '+F;c.fillText('SUMMER CAMP',w/2,92);
  c.fillStyle='#c0392b';c.font='800 52px '+F;c.fillText('EVERY KID GOES · THANK YOU, RIVERSIDE',w/2,160)});const g=new T.Group();plane(7,1.3,tex,0,0,0,g,0,{side:true});for(const s of[-1,1])rod([s*3.5,.65,0],[s*3.5,-.65,0],.015,'#d8d8d0',g,5);return g}

/* ================= car dirt skins: the car's own body geometry drawn again with a dirt layer you can wash off =================
   One 512x512 canvas atlas per car: four quadrants [top (x,z)] [side +z (x,y)] [side -z (x,y)] [front | back ends (z,y)], picked per
   fragment by the body normal (triplanar blend). Spray erases soft spots in the canvas and a 64x64 coverage grid (cleanliness). */
const AT=512,Q=256,GN=64,FOAM=256;
const PROF={};/* per vehicle type: profile bins (top, half-width) measured from the paint geometry's vertices */
function profile(type,car){if(PROF[type])return PROF[type];const ud=car.userData,geo=paintGeo(car);if(!geo)return null;geo.computeBoundingBox();const bb=geo.boundingBox,N=48,top=new Float32Array(N),hw=new Float32Array(N);
  const p=geo.attributes.position,L=bb.max.x-bb.min.x;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const k=clamp(Math.floor((x-bb.min.x)/L*N),0,N-1);if(y>top[k])top[k]=y;if(y>.32&&y<1.15&&Math.abs(z)>hw[k])hw[k]=Math.abs(z)}
  for(let k=1;k<N;k++)if(!hw[k])hw[k]=hw[k-1];for(let k=N-2;k>=0;k--)if(!hw[k])hw[k]=hw[k+1];
  const pr={min:{x:bb.min.x,y:Math.max(.2,bb.min.y),z:bb.min.z},size:{x:L,y:bb.max.y-Math.max(.2,bb.min.y),z:bb.max.z-bb.min.z},N,top,hw,len:ud.len||L,wid:ud.wid||(bb.max.z-bb.min.z)};pr.mask=maskCanvas(pr);return PROF[type]=pr}
function paintGeo(car){const ud=car.userData,pm=ud.body&&ud.body[0];let g=null;if(!pm)return null;ud.bodyRoot.traverse(o=>{if(!g&&o.isMesh&&o.material===pm)g=o.geometry});return g}
const binOf=(pr,x)=>clamp(Math.floor((x-pr.min.x)/pr.size.x*pr.N),0,pr.N-1);
/* the valid paintable area of each quadrant (white): dirt is masked by it, and the coverage grid only counts it */
function maskCanvas(pr){const c=document.createElement('canvas');c.width=c.height=AT;const g=c.getContext('2d');g.fillStyle='#fff';const S=pr.size,Mn=pr.min;
  for(let px=0;px<Q;px+=2){const x=Mn.x+(px+1)/Q*S.x,k=binOf(pr,x),top=pr.top[k],hw=pr.hw[k];
    const v0=(Mn.z+S.z/2-hw*.98-Mn.z)/S.z,v1=(hw*.98+S.z/2)/S.z;if(top>.5)g.fillRect(px,v0*Q,2,(v1-v0)*Q);/* top: the width the body has here */
    const yv=y=>(1-(y-Mn.y)/S.y)*Q;const ya=yv(top-.04),yb=yv(.3);if(yb>ya){g.fillRect(Q+px,ya,2,yb-ya);g.fillRect(px,Q+ya,2,yb-ya)}}
  const fr=pr.top[pr.N-1],bk=pr.top[0];const yv=y=>Q+(1-(y-Mn.y)/S.y)*Q;g.fillRect(Q+10,yv(Math.max(.5,fr-.02)),Q/2-20,yv(.3)-yv(Math.max(.5,fr-.02)));g.fillRect(Q+Q/2+10,yv(Math.max(.5,bk-.02)),Q/2-20,yv(.3)-yv(Math.max(.5,bk-.02)));return c}
let BRUSH=null;function brush(){if(BRUSH)return BRUSH;const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(0,0,0,1)');r.addColorStop(.55,'rgba(0,0,0,.85)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return BRUSH=c}
function skinMaterial(S){const T=T3();const m=tm(new T.MeshStandardMaterial({color:0xffffff,roughness:.92,metalness:0,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4}));
  const U={uDirt:{value:S.dirt.tex},uFoam:{value:S.foam.tex},uMin:{value:new T.Vector3(S.pr.min.x,S.pr.min.y,S.pr.min.z)},uSize:{value:new T.Vector3(S.pr.size.x,S.pr.size.y,S.pr.size.z)},uWet:{value:0},uInf:{value:.007}};S.U=U;
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLP;varying vec3 vLN;uniform float uInf;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLP=position;vLN=normal;transformed+=normal*uInf;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vLP;varying vec3 vLN;uniform sampler2D uDirt;uniform sampler2D uFoam;uniform vec3 uMin;uniform vec3 uSize;uniform float uWet;float cwDots;')
      .replace('#include <map_fragment>',`vec3 cn=normalize(vLN);vec3 cq=clamp((vLP-uMin)/uSize,0.,1.);vec3 cw=pow(abs(cn),vec3(4.));cw/=(cw.x+cw.y+cw.z+1e-4);
        vec2 cT=vec2(cq.x,cq.z)*.5;vec2 cS=vec2(cq.x,1.-cq.y)*.5+(cn.z>0.?vec2(.5,0.):vec2(0.,.5));vec2 cE=vec2(cn.x>0.?cq.z*.5:.5+cq.z*.5,1.-cq.y)*.5+vec2(.5);
        vec4 cd=texture2D(uDirt,cT)*cw.y+texture2D(uDirt,cS)*cw.z+texture2D(uDirt,cE)*cw.x;vec4 cf=texture2D(uFoam,cT)*cw.y+texture2D(uFoam,cS)*cw.z+texture2D(uFoam,cE)*cw.x;
        float ca=1.-(1.-cd.a)*(1.-cf.a);vec3 cc=mix(cd.rgb,cf.rgb,cf.a/max(ca,1e-3));
        float cr=fract(sin(dot(floor(vLP*vec3(46.,46.,46.)),vec3(12.9898,78.233,45.164)))*43758.5453);cwDots=step(.9,cr)*uWet*(1.-ca);
        diffuseColor=vec4(mix(cc,vec3(.86,.92,.98),cwDots),max(ca,cwDots*.5)*opacity);if(diffuseColor.a<.008)discard;`)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.06,max(cwDots,uWet*.15*(1.-diffuseColor.a)));')};
  m.customProgramCacheKey=()=>'cw-skin';return m}
function layer(w){const c=document.createElement('canvas');c.width=c.height=w;const T=T3(),t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.flipY=false;t.anisotropy=4;t.generateMipmaps=true;tt(t);return{cv:c,g:c.getContext('2d'),tex:t,w,dirty:false}}
/* draw this customer's dirt into the atlas (seeded), mask it to the body, read back the coverage grid */
function paintDirt(S,kind,R){const D=DIRT[kind]||DIRT.dust,g=S.dirt.g,pr=S.pr;g.clearRect(0,0,AT,AT);
  const blob=(x,y,rx,ry,col,a)=>{g.globalAlpha=a;g.fillStyle=col;g.beginPath();g.ellipse(x,y,rx,ry,R()*3,0,7);g.fill()};
  /* a road film: an even haze, heavier toward the bottom of the sides, fine grain, a few rain streaks; not blotches */
  const film=(x0,y0,w,h,a,col,grad)=>{if(grad){const gr=g.createLinearGradient(0,y0,0,y0+h);gr.addColorStop(0,col);gr.addColorStop(1,col);g.fillStyle=gr}g.fillStyle=col;
    const steps=8;for(let k=0;k<steps;k++){const yy=y0+h*k/steps;g.globalAlpha=a*(grad?.55+.75*k/steps:1);g.fillRect(x0,yy,w,h/steps+1)}
    for(let i=0;i<w*h/30;i++){const x=x0+R()*w,y=y0+R()*h;g.globalAlpha=a*(.12+R()*.22);g.fillStyle=R()<.5?D.speck:'#6d6455';g.fillRect(x,y,1+R()*2.5,1+R()*2.5)}
    for(let i=0;i<w*h/1400;i++)blob(x0+R()*w,y0+R()*h,6+R()*16,4+R()*10,D.c,a*(.15+R()*.2))};
  film(0,0,Q,Q,D.top,D.c);film(Q,0,Q,Q,D.side,D.c,true);film(0,Q,Q,Q,D.side,D.c,true);film(Q,Q,Q,Q,D.side*.95,D.c,true);
  for(const[ox,oy]of[[Q,0],[0,Q],[Q,Q]]){for(let i=0;i<46;i++){const x=ox+R()*Q,y0=oy+R()*Q*.4,l=20+R()*Q*.5;g.globalAlpha=(.1+R()*.14)*D.side*1.4;g.strokeStyle=R()<.5?D.c:'#5d5546';g.lineWidth=1+R()*2;g.beginPath();g.moveTo(x,y0);g.lineTo(x+(R()-.5)*3,y0+l);g.stroke()}}
  if(D.low){/* mud: heavy along the bottom of the sides and the ends, splashes up from the wheels */for(const[ox,oy]of[[Q,0],[0,Q],[Q,Q]]){for(let i=0;i<160;i++){const x=ox+R()*Q,y=oy+Q*(.55+R()*.45);blob(x,y,4+R()*16,3+R()*9,R()<.5?D.c:D.speck,.55+R()*.4)}
      for(let i=0;i<40;i++){const x=ox+R()*Q,y0=oy+Q*(.5+R()*.3);g.globalAlpha=.5;g.strokeStyle=D.speck;g.lineWidth=1+R()*2;g.beginPath();g.moveTo(x,y0);g.lineTo(x+(R()-.5)*8,y0+10+R()*30);g.stroke()}}}
  if(D.birds){/* bird: white splats with a grey heart and a drip, mostly on the top and the upper sides */for(let i=0;i<D.birds;i++){const q=R()<.65?0:1+(R()*2|0);const ox=q===1?Q:0,oy=q===2?Q:0;const x=ox+20+R()*(Q-40),y=oy+(q?20+R()*60:20+R()*(Q-40)),s=6+R()*9;
      blob(x,y,s,s*.8,'#f4f1ea',.95);for(let k=0;k<5;k++)blob(x+(R()-.5)*s*2.2,y+(R()-.5)*s*2,s*.35,s*.3,'#efece4',.9);blob(x+s*.2,y,s*.4,s*.35,'#8d8a80',.8);if(q){g.globalAlpha=.85;g.strokeStyle='#ece8de';g.lineWidth=3;g.beginPath();g.moveTo(x,y);g.lineTo(x+1,y+s*2.5);g.stroke()}}}
  if(D.drips){/* ice cream: pink and brown drips running down from the roof edge */for(let i=0;i<22;i++){const q=R()<.5?1:2,ox=q===1?Q:0,oy=q===2?Q:0,x=ox+R()*Q,y0=oy+18+R()*30,l=20+R()*60;g.globalAlpha=.9;g.strokeStyle=R()<.5?D.c:D.drips;g.lineWidth=3+R()*4;g.lineCap='round';g.beginPath();g.moveTo(x,y0);g.lineTo(x+(R()-.5)*4,y0+l);g.stroke()}
    for(let i=0;i<8;i++)blob(20+R()*(Q-40),20+R()*(Q-40),10+R()*14,8+R()*10,R()<.5?D.c:D.drips,.9)}
  if(D.text){/* "WASH ME" written with a finger in the dust on the back: the letters are where the dust ISN'T */const bx0=Q+Q/2,bw=Q/2,by=Q+Q*.18,bh=Q*.55;g.globalAlpha=1;film(bx0,by,bw,bh,.65,D.c);
    g.save();g.globalCompositeOperation='destination-out';g.globalAlpha=.92;g.strokeStyle='#000';g.lineWidth=5;g.lineCap='round';g.lineJoin='round';g.font='700 34px "Comic Sans MS","Marker Felt",sans-serif';g.textAlign='center';
    g.translate(bx0+bw/2,by+bh*.42);g.rotate(-.05);g.strokeText(D.text,0,0);g.font='700 18px "Comic Sans MS",sans-serif';g.strokeText(':)',38,28);g.restore()}
  if(D.hood){/* the Duke's old car: his name on the hood in grime, where a decal used to be */const cx=Q*.82,cy_=Q*.5;g.save();g.translate(cx,cy_);g.rotate(Math.PI/2);g.globalAlpha=.9;g.fillStyle='#3a2e22';g.font='900 46px '+uiFont();g.textAlign='center';g.fillText(D.hood,0,16);
    g.globalAlpha=.35;g.fillRect(-110,-30,220,6);g.fillRect(-110,26,220,6);g.restore()}
  g.globalAlpha=1;g.globalCompositeOperation='destination-in';g.drawImage(pr.mask,0,0);g.globalCompositeOperation='source-over';
  /* coverage grid (8x8 px cells) */const id=g.getImageData(0,0,AT,AT).data,G=new Float32Array(GN*GN);let sum=0;
  for(let cy_=0;cy_<GN;cy_++)for(let cx=0;cx<GN;cx++){let a=0;for(let yy=0;yy<8;yy+=2)for(let xx=0;xx<8;xx+=2)a+=id[((cy_*8+yy)*AT+cx*8+xx)*4+3];G[cy_*GN+cx]=a/16/255;sum+=G[cy_*GN+cx]}
  S.grid=G;S.sum0=Math.max(1,sum);S.dirt.dirty=true;S.foamAmt=0;S.foamMax=1}
/* water lands at a car-local point: every face within reach of it gets rinsed (the roof edge from the side, the hood from the front),
   and some runs down the side below it */
function eraseHit(S,l,R,s,k){const pr=S.pr,b=binOf(pr,l.x),top=pr.top[b],hw=pr.hw[b],u=clamp((l.x-pr.min.x)/pr.size.x,0,1),vy=clamp(1-(l.y-pr.min.y)/pr.size.y,0,1),vz=clamp((l.z-pr.min.z)/pr.size.z,0,1);
  const r_=d=>Math.sqrt(Math.max(0,R*R-d*d));let d;
  if(Math.abs(l.z)<hw+.12&&(d=Math.abs(l.y-top))<R)eraseAt(S,0,u,vz,r_(d)*1.35+.05,s,k);
  if(l.y<top+.12){if(l.z>-.3&&(d=Math.abs(l.z-hw))<R){eraseAt(S,1,u,vy,r_(d),s,k);eraseAt(S,1,u,Math.min(1,vy+.2),r_(d)*.7,s*.35,k)}
    if(l.z<.3&&(d=Math.abs(l.z+hw))<R){eraseAt(S,2,u,vy,r_(d),s,k);eraseAt(S,2,u,Math.min(1,vy+.2),r_(d)*.7,s*.35,k)}
    if((d=Math.abs(l.x-(pr.min.x+pr.size.x)))<R)eraseAt(S,3,vz*.5,vy,r_(d),s,k);if((d=Math.abs(l.x-pr.min.x))<R)eraseAt(S,3,.5+vz*.5,vy,r_(d),s,k)}}
function cleanOf(S){let s=0;for(let i=0;i<S.grid.length;i++)s+=S.grid[i];return clamp(1-s/S.sum0,0,1)}
/* erase a spot: quadrant q, (u,v) 0..1 within it, radius in metres, strength 0..1; k = dirt factor (unscrubbed dirt comes off slower) */
function eraseAt(S,q,u,v,r,s,k){const pr=S.pr,ox=(q===1||q===3)?Q:0,oy=q>=2?Q:0;let mu=pr.size.x,mv=q===0?pr.size.z:pr.size.y;if(q===3)mu=pr.size.z*2;
  const rx=Math.max(3,r/mu*Q),ry=Math.max(3,r/mv*Q),px=ox+u*Q,py=oy+v*Q;const B=brush();
  const fg=S.foam.g,fs=FOAM/AT;fg.globalCompositeOperation='destination-out';fg.globalAlpha=clamp(s*2.2,0,1);fg.drawImage(B,(px-rx*1.3)*fs,(py-ry*1.3)*fs,rx*2.6*fs,ry*2.6*fs);S.foam.dirty=true;
  S.foamAmt=Math.max(0,S.foamAmt-s*r*r*.9);
  const ds=clamp(s*k,0,1);if(ds<=.001)return;const g=S.dirt.g;g.globalCompositeOperation='destination-out';g.globalAlpha=ds;g.drawImage(B,px-rx,py-ry,rx*2,ry*2);S.dirt.dirty=true;
  const c0=Math.max(0,Math.floor((px-rx)/8)),c1=Math.min(GN-1,Math.floor((px+rx)/8)),r0=Math.max(0,Math.floor((py-ry)/8)),r1=Math.min(GN-1,Math.floor((py+ry)/8));
  for(let cy_=r0;cy_<=r1;cy_++)for(let cx=c0;cx<=c1;cx++){const dx=(cx*8+4-px)/rx,dy=(cy_*8+4-py)/ry,d=dx*dx+dy*dy;if(d>1)continue;const f=d<.3?1:.85*(1-d)/.7+.15*(1-d);S.grid[cy_*GN+cx]*=1-ds*clamp(f,0,1)}}
/* add mud splats (sabotage): brown blobs on the lower sides and the ends, the grid goes back up */
function splatMud(S,side,R,amt){const g=S.dirt.g;g.globalCompositeOperation='source-over';const qs=side==='both'?[1,2,3]:[side];
  for(const q of qs){const ox=(q===1||q===3)?Q:0,oy=q>=2?Q:0;for(let i=0;i<60*amt;i++){const x=ox+R()*Q,y=oy+Q*(.45+R()*.5),rx=5+R()*18;g.globalAlpha=.6+R()*.35;g.fillStyle=R()<.5?'#5e4632':'#3e2c1e';g.beginPath();g.ellipse(x,y,rx,rx*.6,R()*3,0,7);g.fill();
      const cx=Math.floor(x/8),cy_=Math.floor(y/8);for(let a=-2;a<=2;a++)for(let b=-1;b<=1;b++){const i=(cy_+b)*GN+cx+a;if(i>=0&&i<S.grid.length&&cx+a>=0&&cx+a<GN)S.grid[i]=Math.min(1,S.grid[i]+.25)}}}
  g.globalCompositeOperation='destination-in';g.globalAlpha=1;g.drawImage(S.pr.mask,0,0);g.globalCompositeOperation='source-over';S.dirt.dirty=true}
/* foam: kids soap a side; blobs and bubbles where they work */
function addFoam(S,q,u0,u1,n,R){const g=S.foam.g,fs=FOAM/AT,ox=((q===1||q===3)?Q:0)*fs,oy=(q>=2?Q:0)*fs,QQ=Q*fs;g.globalCompositeOperation='source-over';
  for(let i=0;i<n;i++){const x=ox+(u0+(u1-u0)*R())*QQ,y=oy+(q===0?R():.1+R()*.8)*QQ,r=3+R()*7;g.globalAlpha=.55+R()*.4;g.fillStyle=R()<.8?'#fbfcfd':'#e6eef4';g.beginPath();g.arc(x,y,r,0,7);g.fill();
    if(R()<.4){g.globalAlpha=.6;g.strokeStyle='#d4e2ec';g.lineWidth=1;g.beginPath();g.arc(x+r*.3,y-r*.3,r*.4,0,7);g.stroke()}}
  g.globalCompositeOperation='destination-in';g.globalAlpha=1;g.drawImage(S.pr.mask,0,0,FOAM,FOAM);g.globalCompositeOperation='source-over';S.foam.dirty=true;S.foamAmt=Math.min(S.foamMax*1.4,S.foamAmt+n*.004)}
function buildSkin(car,type,kind,R){const pr=profile(type,car);if(!pr)return null;const S={pr,dirt:layer(AT),foam:layer(FOAM)};paintDirt(S,kind,R);const m=skinMaterial(S);
  const ud=car.userData,pm=ud.body&&ud.body[0],gl=ud.glass&&ud.glass[0];const meshes=[];
  ud.bodyRoot.traverse(o=>{if(o.isMesh&&(o.material===pm||o.material===gl))meshes.push(o)});
  for(const o of meshes){const sk=new(T3().Mesh)(o.geometry,m);sk.position.copy(o.position);sk.quaternion.copy(o.quaternion);sk.scale.copy(o.scale);sk.renderOrder=3;sk.castShadow=false;sk.receiveShadow=true;o.parent.add(sk)}
  return S}
function flushSkin(S){if(S.dirt.dirty){S.dirt.dirty=false;S.dirt.tex.needsUpdate=true}if(S.foam.dirty){S.foam.dirty=false;S.foam.tex.needsUpdate=true}}
/* car-local hit test against the measured profile: inside the body? */
function toLocal(c,x,y,z){const dx=x-c.x,dz=z-c.z,cs=Math.cos(c.yaw),sn=Math.sin(c.yaw);return{x:dx*cs-dz*sn,y,z:dx*sn+dz*cs}}
function inside(pr,l){if(l.x<pr.min.x||l.x>pr.min.x+pr.size.x||l.y<.28)return false;const k=binOf(pr,l.x);return Math.abs(l.z)<pr.hw[k]&&l.y<pr.top[k]}

/* ================= audio: HT.Audio for the shared bus; a live noise bed for the hose ================= */
const AU=()=>window.HT&&HT.Audio;
function tone(f,d,o){o=o||{};const a=AU();try{a&&a.tone&&a.tone({f,to:o.to,type:o.type,d,gain:o.vol==null?.12:o.vol,at:o.at,bus:o.bus})}catch(_){}}
const SFX={pick(){tone(660,.06,{type:'square',vol:.05});tone(990,.06,{type:'square',vol:.05,at:.05})},place(){tone(520,.08,{type:'triangle',vol:.08});tone(780,.1,{type:'triangle',vol:.07,at:.06})},
  cash(){const a=AU();try{a&&a.ui&&a.ui('cash')}catch(_){}tone(1320,.08,{type:'triangle',vol:.08,at:.08});tone(1760,.12,{type:'triangle',vol:.07,at:.14})},
  squeak(){tone(2400,.05,{type:'square',vol:.025,to:2900})},sparkle(){for(let i=0;i<4;i++)tone(1760*Math.pow(2,i*4/12),.12,{vol:.05,at:i*.06})},
  open(){tone(523,.16,{type:'square',vol:.08});tone(659,.16,{type:'square',vol:.08,at:.12});tone(784,.4,{type:'square',vol:.1,at:.24})},
  bad(){tone(330,.18,{type:'sawtooth',vol:.06});tone(262,.3,{type:'sawtooth',vol:.06,at:.14})},good(){tone(784,.1,{type:'triangle',vol:.07});tone(1047,.16,{type:'triangle',vol:.07,at:.08})},
  tick(hot){tone(hot?1500:2100,hot?.09:.035,{type:'square',vol:hot?.08:.04})},whistle(){tone(2900,.5,{vol:.1,to:3100});tone(2600,.3,{vol:.07,at:.5})},honk(){tone(370,.35,{type:'square',vol:.07});tone(392,.35,{type:'square',vol:.06})},
  splash(){const a=AU();try{a&&a.impact&&a.impact('dirt',null,{vol:.5})}catch(_){}},
  voice(k,pos){const a=AU();try{a&&a.voice&&a.voice(k,pos?new(T3().Vector3)(pos.x,1.4,pos.z):null,{vol:.7})}catch(_){}}};
const HOSE={src:null,f:null,g:null,on:false};
function hoseSound(on,k,hit){const a=AU();if(!a||!a.ctx||!a.bus)return;const c=a.ctx;if(c.state!=='running')return;
  if(!HOSE.src&&on){const n=c.sampleRate,b=c.createBuffer(1,n,n),d=b.getChannelData(0);let l=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;l=l*.6+w*.4;d[i]=l}
    const s=c.createBufferSource();s.buffer=b;s.loop=true;const f=c.createBiquadFilter();f.type='bandpass';f.Q.value=.8;const g=c.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(a.bus('sfx'));s.start();Object.assign(HOSE,{src:s,f,g})}
  if(!HOSE.src)return;const t=c.currentTime;HOSE.g.gain.setTargetAtTime(on?(.05+.06*k)*(hit?1.25:1):0,t,.05);HOSE.f.frequency.setTargetAtTime(hit?1400+1200*k:900+1600*k,t,.08)}
function hoseSoundKill(){if(HOSE.src){try{HOSE.src.stop();HOSE.src.disconnect();HOSE.f.disconnect();HOSE.g.disconnect()}catch(_){}HOSE.src=HOSE.f=HOSE.g=null}}
function music(st,o){const a=AU();try{if(a&&a.music)a.music(st,o)}catch(_){}}
function intensity(v){const a=AU();try{if(a&&a.setIntensity)a.setIntensity(v)}catch(_){}}

/* ================= people ================= */
const PP=()=>window.HT&&HT.People&&HT.People.ok?HT.People:null;
const CAST_KEYS=()=>['dee','nb_teen','nb_kid','thug_cap','thug_jacket','thug_hoodie','dad_gary'];
function custKeys(list){const pp=PP(),roles=pp&&pp.roles||{};return list.map(c=>{const r=roles[c.role];return typeof r==='string'?r:c.role}).filter(k=>k&&!Array.isArray(k))}
function dude(role,look){const a=A(),pp=PP();let d=null;if(pp&&pp.make){try{d=pp.make(role,{})}catch(_){d=null}}if(!d)d=a.makeDude(Object.assign({shirt:'#7a8796',pants:'#2b2f36'},look||{},{role}));return d}
function npcPose(d,dt,o){const pp=PP();if(d&&d.rb&&pp&&pp.pose){try{pp.pose(d,dt,o||{})}catch(_){}}else if(d&&d.legs){const w=o&&o.moving?Math.sin((d.walk=(d.walk||0)+dt*10))*.5:0;d.legs.forEach((l,i)=>l.rotation.x=i?w:-w)}}
function gesture(d){const pp=PP();if(d&&d.rb&&pp&&pp.interact)try{pp.interact(d)}catch(_){}}
function flinch(d){const pp=PP();if(d&&d.rb&&pp&&pp.hit)try{pp.hit(d,false)}catch(_){}}
function armband(d,col){const T=T3();const m=tm(new T.MeshStandardMaterial({color:new T.Color(col).convertSRGBToLinear().multiplyScalar(1.15),roughness:.75,side:T.DoubleSide}));
  const rb=d.rb,ua=rb&&rb.bones&&rb.bones.Bip01_L_UpperArm,fa=rb&&rb.bones&&rb.bones.Bip01_L_Forearm;
  if(ua&&fa&&fa.parent===ua){d.root.updateMatrixWorld(true);const s=ua.getWorldScale(new T.Vector3()).x/(d.root.scale.x||1)||1,dir=fa.position.clone().normalize();
    const band=new T.Mesh(tg(new T.CylinderGeometry(.054/s,.056/s,.07/s,16,1,true)),m);band.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir);band.position.copy(fa.position).multiplyScalar(.5);ua.add(band)}}
const faceTo=(d,x,z)=>{const dx=x-d.root.position.x,dz=z-d.root.position.z;if(Math.abs(dx)+Math.abs(dz)>1e-3)d.root.rotation.y=Math.atan2(dx,dz)};
function turnTo(p,x,z,dt,k){const want=Math.atan2(x-p.x,z-p.z);let d=want-p.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;p.yaw+=d*Math.min(1,dt*(k||8));p.d.root.rotation.y=p.yaw}
function walk(p,x,z,sp,dt){const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.12)return true;const s=Math.min(d,sp*dt);p.x+=dx/d*s;p.z+=dz/d*s;p.d.root.position.set(p.x,0,p.z);turnTo(p,x,z,dt,10);return false}
function hand(d){return d&&(d.gunHold||d.root)}
/* the talk bubbles over people (DOM, projected) */
function say(M,p,text,dur){const C=M.cw;if(!HUDL)return;const el=document.createElement('div');el.className='say';el.textContent=text;HUDL.fx.appendChild(el);C.bub.push({p,el,t:dur||3})}

/* ================= the run ================= */
const SV=()=>{const a=A();return a&&a.SV?a.SV():null};
function plan(s){s=s||SV();if(!s||!window.HT.Save||!HT.Save.jobRec)return{raised:0,runs:0,best:0,week:{w:-1,g:0},board:[]};const r=HT.Save.jobRec(s,ID);if(!r.plan||typeof r.plan!=='object')r.plan={};const p=r.plan;
  if(!isFinite(p.raised))p.raised=0;if(!isFinite(p.runs))p.runs=0;if(!isFinite(p.best))p.best=0;if(!p.week||typeof p.week!=='object')p.week={w:-1,g:0};if(!Array.isArray(p.board))p.board=[];return p}
const weekOf=s=>Math.floor((((s&&s.day)||1)-1)/7);
function goalOf(total){for(const g of TUNE.goals)if(total<g)return{goal:g,label:g===TUNE.goals[0]?'The youth center van':'Summer camp for every kid',done:false};return{goal:TUNE.goals[TUNE.goals.length-1],label:'Summer camp for every kid',done:true}}
function households(){const s=SV();return s&&s.world&&Array.isArray(s.world.households)?s.world.households:[]}
/* the seeded scenario: who comes, in what order, which trouble when (a retry from the checkpoint gets the same Saturday) */
function scenario(seed,runN){const R=rng(seed),hh=households();let pool=CUST.filter(c=>!c.hh||hh.includes(c.hh));const first=pool.filter(c=>c.dirt==='pollen'||c.dirt==='dust');
  const f=first[Math.floor(R()*first.length)];pool=pool.filter(c=>c!==f);for(let i=pool.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  const list=[f,...pool];const kinds=['kink','sign','mud'];if(runN>=1)kinds.push('rival');if(runN>=2)kinds.push('drive');if(runN>=4)kinds.push(R()<.5?'mud':'sign');
  for(let i=kinds.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]]}
  const n=kinds.length,span=TUNE.shift-70,ev=kinds.map((k,i)=>({k,t:Math.round(28+span*i/n+R()*10)}));ev.push({k:'thief',t:TUNE.shift-34+Math.round(R()*8)});
  return{cust:list.map(c=>c.id),ev,gap:Math.max(TUNE.gapMin,TUNE.gap[0]-Math.min(4,runN*.8)),pat:Math.max(70,TUNE.patience-runN*4)}}
function cw(M){return M&&M.cw}
function newState(M,seed){const s=SV(),pl=plan(s),runN=pl.runs|0;const sc=scenario(seed,runN);
  M.cw={seed,runN,sc,phase:'load',clock:TUNE.shift,raised:0,tips:0,carsDone:0,spotless:0,free:0,cars:[],kids:[],bub:[],pops:[],trouble:[],said:{},ci:0,nextCar:2,
    hose:{held:false,dropped:false,kink:-1,press:1,spray:false,hitT:0},buckets:[0,0],tut:0,gary:{left:TUNE.garyUses,busy:null,cd:0},cuffs:0,talked:0,soaked:0,troubleWon:0,troubleStopped:0,
    signFree:false,rival:null,trustRun:0,shineSum:0,thief:null,box:true,tick:11,ending:null,bot:null};return M.cw}

/* ---------- the lawn's grass tufts poke through the pad: hidden inside the pad while the job runs, put back after ---------- */
const TUFT={done:new Set(),saved:[],t:0};
function tuftsHide(dt){const a=A();TUFT.t-=dt;if(TUFT.t>0||!a||!a.scene)return;TUFT.t=2;const T=T3(),m4=new T.Matrix4(),v=new T.Vector3(),Z=new T.Matrix4().makeScale(0,0,0);
  a.scene.traverse(o=>{if(!o.isInstancedMesh||!o.userData||!o.userData.tufts||TUFT.done.has(o))return;TUFT.done.add(o);o.updateMatrixWorld(true);let ch=false;
    for(let i=0;i<o.count;i++){o.getMatrixAt(i,m4);v.setFromMatrixPosition(m4).applyMatrix4(o.matrixWorld);if(v.x>LOT.x0-.2&&v.x<LOT.x1+.2&&v.z>LOT.z0&&v.z<LOT.z1+.1){TUFT.saved.push([o,i,m4.clone()]);o.setMatrixAt(i,Z);ch=true}}
    if(ch)o.instanceMatrix.needsUpdate=true})}
function tuftsRestore(){for(const[o,i,m]of TUFT.saved){try{o.setMatrixAt(i,m);o.instanceMatrix.needsUpdate=true}catch(_){}}TUFT.saved=[];TUFT.done=new Set();TUFT.t=0}
/* ---------- static set ---------- */
function setup(M){const a=A(),C=cw(M),T=T3();a.wmSetWindow(a.wmWindow(332,40,28));
  const pad=padModel();a.wmAdd(pad);
  const can=canopyModel('YOUTH GROUP CAR WASH','#2f6f8f');can.position.set(SPOT.table.x,0,SPOT.table.z);a.wmAdd(can);C.canopy=can;
  const tb=tableModel();tb.g.position.set(SPOT.table.x,0,SPOT.table.z);a.wmAdd(tb.g);C.box=true;C.boxMesh=tb.box;C.tableG=tb.g;a.wmCol({x0:SPOT.table.x-.9,x1:SPOT.table.x+.9,z0:SPOT.table.z-.38,z1:SPOT.table.z+.38});
  const th=thermoModel();th.g.position.set(SPOT.thermo.x,0,SPOT.thermo.z);th.g.rotation.y=.35;a.wmAdd(th.g);C.thermo=th;a.wmCol({x0:SPOT.thermo.x-.8,x1:SPOT.thermo.x+.8,z0:SPOT.thermo.z-.3,z1:SPOT.thermo.z+.3});
  const sp=spigotModel();sp.position.set(SPOT.spigot.x,0,SPOT.spigot.z);a.wmAdd(sp);C.reel=sp.userData.reel;
  const af=aframeModel();af.g.position.set(SPOT.aframe.x,0,SPOT.aframe.z);af.g.rotation.y=-.5;a.wmAdd(af.g);C.aframe=af;
  C.bk=[0,1].map(i=>{const b=bucketModel();b.position.set(SPOT.bucket[i].x,0,SPOT.bucket[i].z);a.wmAdd(b);setBucket(b,0);return b});
  for(const c of SPOT.chairs){const ch=chairModel();ch.position.set(c.x,0,c.z);a.wmAdd(ch)}
  /* the hose: a rope of segments (one instanced draw), anchored at the reel */
  const N=TUNE.hoseNodes,hg=tg(new T.CylinderGeometry(.024,.024,1,6,1,true)),hm=mat('#2f7d3a',{r:.5});const im=new T.InstancedMesh(hg,hm,N-1);im.castShadow=true;im.frustumCulled=false;a.wmAdd(im);
  const nodes=[];for(let i=0;i<N;i++){const x=SPOT.reel.x-.1-i*.05,z=SPOT.reel.z+.2+i*.02;nodes.push({x,y:.03,z,px:x,py:.03,pz:z})}C.rope={nodes,im,m4:new T.Matrix4(),q:new T.Quaternion(),v:new T.Vector3(),s:new T.Vector3(),up:new T.Vector3(0,1,0)};
  /* the water: droplets (one instanced draw), splashes share it */
  const dg=tg(new T.SphereGeometry(1,6,4)),dm=tm(new T.MeshStandardMaterial({color:new T.Color('#e8f4fb').convertSRGBToLinear(),roughness:.05,metalness:.1,transparent:true,opacity:.62,depthWrite:false}));
  const jg=tg(new T.CylinderGeometry(1,1,1,8,1,true)),jm=tm(new T.MeshStandardMaterial({color:new T.Color('#d9eefa').convertSRGBToLinear(),roughness:.04,metalness:.15,transparent:true,opacity:.5,depthWrite:false,emissive:new T.Color('#5f7d8f').convertSRGBToLinear(),emissiveIntensity:.25}));
  const jet=new T.InstancedMesh(jg,jm,30);jet.frustumCulled=false;jet.count=0;a.wmAdd(jet);C.jet=jet;
  const DN=180,di=new T.InstancedMesh(dg,dm,DN);di.frustumCulled=false;di.count=0;a.wmAdd(di);C.drops={im:di,list:[],max:DN,acc:0};
  /* wet patches on the ground (multiply-blended discs, one draw) */
  const wg=tg(new T.CircleGeometry(1,20)),wm=tm(new T.MeshBasicMaterial({color:0xffffff,blending:T.MultiplyBlending,premultipliedAlpha:true,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));
  const WN=40,wi=new T.InstancedMesh(wg,wm,WN);wi.instanceColor=new T.InstancedBufferAttribute(new Float32Array(WN*3).fill(1),3);wi.frustumCulled=false;wi.count=WN;a.wmAdd(wi);C.wet={im:wi,list:[],k:0,n:WN};
  for(let i=0;i<WN;i++){C.wet.list.push({x:0,z:0,r:.01,a:0});}
  /* station rings (shown when a kid follows you) */
  C.rings={};const rg=tg(new T.RingGeometry(.62,.78,32));for(const id of['w0','w1','dry','sign']){const p=stationPos(id),m=new T.Mesh(rg,tm(new T.MeshBasicMaterial({color:new T.Color(id==='sign'?'#ffd23f':id==='dry'?'#7fd1ff':'#9fe58a').convertSRGBToLinear(),transparent:true,opacity:.85,depthWrite:false})));
    m.rotation.x=-Math.PI/2;m.position.set(p.x,.06,p.z);m.visible=false;a.wmAdd(m);C.rings[id]=m}
  /* the rival pop-up (hidden until it opens) */
  const rv=rivalModel();rv.position.set(SPOT.rival.x,0,SPOT.rival.z);rv.rotation.y=Math.PI;rv.visible=false;a.wmAdd(rv);const rs=rivalSign();rs.position.set(SPOT.rsign.x,0,SPOT.rsign.z);rs.rotation.y=Math.PI+.3;rs.visible=false;a.wmAdd(rs);C.rivalSet={rv,rs};
  /* bay colliders (moved in when a car parks) */
  C.bayCol=[0,1].map(()=>a.wmCol({x0:-9e3,x1:-9e3,z0:-9e3,z1:-9e3}));
  drawThermo(th,plan().raised,0,goalOf(plan().raised).goal,goalOf(plan().raised).label,goalOf(plan().raised).done)}
function stationPos(id){if(id==='w0'||id==='w1')return SPOT.wash[+id[1]];if(id==='dry')return SPOT.dry;if(id==='sign')return SPOT.sign;return SPOT.hang}
function people(M){const a=A(),C=cw(M);
  C.kids=KIDS.map((k,i)=>{const d=dude(k.role,{shirt:'#ffd23f'});if(k.sc!==1)d.root.scale.multiplyScalar(k.sc);const p=stationPos(k.st);const x=p.x+(i%2?.4:-.4),z=p.z+.3;d.root.position.set(x,0,z);a.wmAdd(d.root);
    const tool=k.st==='sign'?signStick():spongeModel(k.st==='dry'?'#4f86c6':'#ffd23f');hand(d).add(tool);if(d.rb){tool.rotation.set(-Math.PI/2,0,0)}
    return{id:k.id,name:k.name,d,x,z,yaw:0,st:k.st,tool,toolKind:k.st==='sign'?'sign':'sponge',ang:Math.random()*6.28,workT:0,soakT:0,lineT:4+i*2,cheerT:0,mode:'idle'}});
  const dee=dude('dee',{shirt:'#3b3f46'});dee.root.position.set(SPOT.dee.x,0,SPOT.dee.z);a.wmAdd(dee.root);C.dee={d:dee,x:SPOT.dee.x,z:SPOT.dee.z,yaw:0,lineT:9};faceTo(dee,SPOT.dee.x,SPOT.dee.z+3)}
function kidTool(k,kind){if(k.toolKind===kind)return;if(k.tool&&k.tool.parent)k.tool.parent.remove(k.tool);k.tool=kind==='sign'?signStick():spongeModel(kind==='dry'?'#4f86c6':'#ffd23f');hand(k.d).add(k.tool);if(k.d.rb)k.tool.rotation.set(-Math.PI/2,0,0);k.toolKind=kind}

/* ---------- customers' cars ---------- */
function custById(id){return CUST.find(c=>c.id===id)||CUST[0]}
function spawnCar(M){const a=A(),C=cw(M);const id=C.sc.cust[C.ci%C.sc.cust.length];C.ci++;const cu=custById(id);const R=rng(C.seed+C.ci*977);
  const V=window.HT&&HT.Vehicles;let car=null;try{car=V&&V.make?V.make(cu.type,{color:cu.col,lod:0,upgrades:{tint:.6}}):null}catch(_){car=null}if(!car)car=a.makeVehicle(cu.type,cu.col);if(!car)return null;
  car.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});if(car.userData&&car.userData.dispose)R_own(car);
  const S=buildSkin(car,cu.type,cu.dirt,R);a.wmAdd(car);
  const c={id:C.ci,cu,car,S,x:392,z:SPOT.lane,yaw:Math.PI,spd:0,st:'arrive',bay:-1,soap:0,dry:0,t0:C.clock,free:C.signFree,path:null,wait:0,owner:null,cleanT:0,clean:S?cleanOf(S):0,wetT:0,soaked:0,said:{},mud:0};
  setCarPose(c);C.cars.push(c);return c}
function R_own(o){R().own.push(o)}
function setCarPose(c){c.car.position.set(c.x,0,c.z);c.car.rotation.y=c.yaw}
/* car paths: a list of points; the car drives through them at a speed, forward or reversing (heading from the motion) */
function arc(cx,cz,r,a0,a1,n){const out=[];for(let i=1;i<=n;i++){const a=a0+(a1-a0)*i/n;out.push({x:cx+Math.cos(a)*r,z:cz+Math.sin(a)*r})}return out}
function pathIn(b){const B=BAY[b],r=4.2,ln=SPOT.lane;/* heading west along the lane, then a right turn into the bay, nose to the church */
  return[{x:B.x+r+6,z:ln},{x:B.x+r,z:ln},...arc(B.x+r,ln-r,r,Math.PI/2,Math.PI,8).map(p=>({x:p.x,z:p.z})),{x:B.x,z:B.z}]}
function pathOut(b){const B=BAY[b],r=4.2,ln=SPOT.lane;if(b===0)return[{x:B.x,z:ln-.4,rev:true},{x:B.x+3.6,z:ln+1,rev:true,stop:.7},{x:B.x+.5,z:ln},{x:290,z:ln}];/* bay 1: straight back, swing the rear east in the lane *//* back out: the rear swings east into the lane, then drive away west */
  const a_=arc(B.x+r,ln-r,r,Math.PI,Math.PI/2,8).map(p=>({x:p.x,z:p.z,rev:true}));a_[a_.length-1].stop=.7;return[{x:B.x,z:ln-r,rev:true},...a_,{x:B.x+r-3,z:ln},{x:290,z:ln}]}
function drive(c,dt,sp){const P=c.path;if(!P||!P.length){c.spd=0;return true}if(c.stopT>0){c.stopT-=dt;c.spd=0;return false}
  const p=P[0],dx=p.x-c.x,dz=p.z-c.z,d=Math.hypot(dx,dz);const slow=P.length===1||p.stop;const want=slow?Math.min(sp,.8+d*1.3):sp;c.spd+=(want-c.spd)*Math.min(1,dt*2.5);c.rev=!!p.rev;
  if(d<.2+c.spd*dt){c.x=p.x;c.z=p.z;P.shift();if(p.stop){c.stopT=p.stop;c.spd=0}if(!P.length){c.spd=0;return true}return false}
  const s=Math.min(d,c.spd*dt);c.x+=dx/d*s;c.z+=dz/d*s;/* heading: the nose points along the motion (or away from it when reversing); car local +x is forward */
  let want_=Math.atan2(-dz,dx);if(p.rev)want_+=Math.PI;let dy=want_-c.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;c.yaw+=dy*Math.min(1,dt*6);c.steer=clamp(dy*2,-1,1);return false}
function carTick(c,dt){setCarPose(c);const V=window.HT&&HT.Vehicles;if(V&&V.update)try{V.update(c.car,{dt,speed:(c.rev?-1:1)*c.spd,steer:c.steer||0,braking:c.spd<.5&&c.st!=='wash'})}catch(_){}c.steer=(c.steer||0)*.9}
/* the queue lane: slots east of the lot */
const QX=[354.5,360.5,366.5,372.5,378.5];
function queueTick(M,dt){const C=cw(M);const q=C.cars.filter(c=>c.st==='queue'||c.st==='arrive').sort((a,b)=>a.id-b.id);
  q.forEach((c,i)=>{const tx=QX[Math.min(i,QX.length-1)]+(i>=QX.length?6*(i-QX.length+1):0);if(c.st==='arrive'||Math.abs(c.x-tx)>.3){const d=c.x-tx;c.spd+=((d>.3?Math.min(9,1.2+d*.9):0)-c.spd)*Math.min(1,dt*2);c.x-=Math.min(d,c.spd*dt);if(d<=.3){c.x=tx;c.spd=0;if(c.st==='arrive'){c.st='queue';c.qT=0}}}
    c.qT=(c.qT||0)+dt;c.yaw=Math.PI;
    if(c.st==='queue'&&c.qT>C.sc.pat&&i>0){/* tired of waiting */c.st='leave';c.path=[{x:c.x-1,z:SPOT.far},{x:290,z:SPOT.far}];say(M,{x:c.x,z:c.z,y:2.2},pick(LINES.queueLeave),2.6);C.lostCust=(C.lostCust||0)+1}});
  /* a free bay takes the head of the queue */for(let b=0;b<2;b++){if(C.cars.some(c=>c.bay===b&&c.st!=='leave'&&c.st!=='gone'))continue;const h=q.find(c=>c.st==='queue');if(!h)break;h.st='pull';h.bay=b;h.path=pathIn(b)}}
function setBayCol(C,b,on){const c=C.bayCol[b],B=BAY[b];if(on){c.x0=B.x-1.05;c.x1=B.x+1.05;c.z0=B.z-2.45;c.z1=B.z+2.45}else{c.x0=c.x1=c.z0=c.z1=-9e3}}

/* ---------- the hose: rope, nozzle, water stream, hits ---------- */
function ropeTick(M,dt){const a=A(),C=cw(M),Rp=C.rope,N=Rp.nodes,P=a.P,H=C.hose,seg=TUNE.hoseSeg;
  const end=H.held&&!a.CV?handPos(a):null;N[0].x=SPOT.reel.x-.05;N[0].y=.4;N[0].z=SPOT.reel.z+.12;
  for(let i=1;i<N.length;i++){const n=N[i];const fr=n.y<=.035?.5:.9;const vx=(n.x-n.px)*fr,vy=(n.y-n.py)*.9,vz=(n.z-n.pz)*fr;n.px=n.x;n.py=n.y;n.pz=n.z;n.x+=vx;n.y+=vy-9.8*dt*dt;n.z+=vz}
  if(end){const L=N[N.length-1];L.x=end.x;L.y=end.y;L.z=end.z}
  for(let it=0;it<5;it++){for(let i=0;i<N.length-1;i++){const p=N[i],q=N[i+1],dx=q.x-p.x,dy=q.y-p.y,dz=q.z-p.z,d=Math.hypot(dx,dy,dz)||1e-4;if(d<=seg)continue;const k=(d-seg)/d;
      const fixA=i===0,fixB=end&&i+1===N.length-1;if(fixA&&fixB)continue;const wa=fixA?0:fixB?1:.5,wb=1-wa;p.x+=dx*k*wa;p.y+=dy*k*wa;p.z+=dz*k*wa;q.x-=dx*k*wb;q.y-=dy*k*wb;q.z-=dz*k*wb}
    for(let i=1;i<N.length;i++){const n=N[i];if(n.y<.03)n.y=.03;/* around parked cars and the table: pushed out sideways */for(const c of C.cars){if(c.bay<0||c.st==='leave')continue;const l=toLocal(c,n.x,n.y,n.z);const pr=c.S&&c.S.pr;if(!pr)continue;
        if(l.x>pr.min.x-.05&&l.x<pr.min.x+pr.size.x+.05&&Math.abs(l.z)<pr.hw[binOf(pr,l.x)]+.06&&n.y<1.2){const s=l.z>=0?1:-1,nz=(pr.hw[binOf(pr,l.x)]+.07)*s,cs=Math.cos(c.yaw),sn=Math.sin(c.yaw);n.x=c.x+l.x*cs+nz*sn;n.z=c.z-l.x*sn+nz*cs}}}}
  /* too far: the hose comes out of your hand */
  const tail=N[N.length-1],t2=N[N.length-2];if(end&&Math.hypot(tail.x-t2.x,tail.z-t2.z)>seg*2.4){H.held=false;H.dropped=true;say(M,{x:P.pos.x,z:P.pos.z,y:2.2},"Hose won't reach.",1.8);A().radio('you',"That's the end of the hose. Literally.",true)}
  /* draw */const im=Rp.im;for(let i=0;i<N.length-1;i++){const p=N[i],q=N[i+1],dx=q.x-p.x,dy=q.y-p.y,dz=q.z-p.z,L=Math.hypot(dx,dy,dz)||1e-4;Rp.v.set(dx/L,dy/L,dz/L);Rp.q.setFromUnitVectors(Rp.up,Rp.v);
    Rp.s.set(1,L+.02,1);Rp.m4.compose(Rp.v.set((p.x+q.x)/2,(p.y+q.y)/2,(p.z+q.z)/2),Rp.q,Rp.s);im.setMatrixAt(i,Rp.m4)}im.instanceMatrix.needsUpdate=true;
  if(C.reel&&C.reel.userData.drum)C.reel.userData.drum.rotation.x+=(H.held?.4:0)*dt*(H.spray?3:1)}
function handPos(a){const d=a.P.dude,T=T3();if(d&&(d.gunHold)){const v=new T.Vector3();d.gunHold.getWorldPosition(v);return{x:v.x,y:v.y,z:v.z}}return{x:a.P.pos.x+Math.sin(a.P.yaw)*-.3,y:1.1,z:a.P.pos.z+Math.cos(a.P.yaw)*-.3}}
function nozzleOn(M,on){const a=A(),C=cw(M),d=a.P.dude;if(on){if(!C.noz){C.noz=nozzleModel()}if(d&&C.noz.parent!==hand(d)){if(C.noz.parent)C.noz.parent.remove(C.noz);hand(d).add(C.noz);C.noz.rotation.set(d.rb?-Math.PI/2:0,0,0);C.noz.position.set(0,0,0)}}
  else if(C.noz&&C.noz.parent){C.noz.parent.remove(C.noz);const N=C.rope.nodes,L=N[N.length-1];if(C.hose.dropped){a.wmAdd(C.noz);C.noz.position.set(L.x,.05,L.z);C.noz.rotation.set(0,Math.random()*6,Math.PI/2)}}}
function kinkPress(C){return C.hose.kink>=0?TUNE.kinkSpeed/TUNE.speed:1}
/* the stream: aim where the crosshair points (the camera ray), lob it so it lands there (within range) */
const AIM={};
function aimPoint(M){const a=A(),C=cw(M),cam=a.camera,T=T3();const o=cam.position,dir=new T.Vector3();cam.getWorldDirection(dir);let best=14;let hit=null;
  /* cars, buckets, people, the rival sign: the first thing along the ray within 14 m */
  for(const c of C.cars){if(!c.S||c.st==='gone')continue;const pr=c.S.pr;for(let t=1;t<best;t+=.1){const x=o.x+dir.x*t,y=o.y+dir.y*t,z=o.z+dir.z*t;if(Math.hypot(x-c.x,z-c.z)>3.4)continue;const l=toLocal(c,x,y,z);
      if(inside(pr,l)){best=t;hit={x,y,z};break}/* aim assist: a ray skimming just over the roof or hood lands on it */const b=binOf(pr,l.x);if(l.x>pr.min.x&&l.x<pr.min.x+pr.size.x&&Math.abs(l.z)<pr.hw[b]-.1&&l.y>=pr.top[b]&&l.y<pr.top[b]+.3){best=t;hit={x,y:pr.top[b]-.02,z};break}}}
  for(const t of targetsOf(M)){const tt_=((t.x-o.x)*dir.x+(t.y-o.y)*dir.y+(t.z-o.z)*dir.z);if(tt_<.5||tt_>best)continue;const px=o.x+dir.x*tt_,py=o.y+dir.y*tt_,pz=o.z+dir.z*tt_;if(Math.hypot(px-t.x,pz-t.z)<t.r&&Math.abs(py-t.y)<t.h){best=tt_;hit={x:px,y:py,z:pz}}}
  if(!hit){if(dir.y<-.02){const t=-o.y/dir.y;if(t<best)hit={x:o.x+dir.x*t,y:0,z:o.z+dir.z*t}}if(!hit)hit={x:o.x+dir.x*best,y:o.y+dir.y*best,z:o.z+dir.z*best}}return hit}
function targetsOf(M){const C=cw(M),out=[];for(let i=0;i<2;i++)out.push({x:SPOT.bucket[i].x,y:.25,z:SPOT.bucket[i].z,r:.3,h:.3,kind:'bucket',i});
  for(const k of C.kids)out.push({x:k.x,y:1,z:k.z,r:.38,h:.8,kind:'kid',o:k});if(C.dee)out.push({x:C.dee.x,y:1,z:C.dee.z,r:.38,h:.85,kind:'dee'});
  for(const c of C.cars)if(c.owner&&c.owner.d.root.visible)out.push({x:c.owner.x,y:1,z:c.owner.z,r:.38,h:.8,kind:'owner',o:c});
  for(const t of C.trouble)if(t.p&&t.p.d.root.visible&&!t.done)out.push({x:t.p.x,y:1,z:t.p.z,r:.42,h:.85,kind:'bad',o:t});
  if(C.rival&&C.rival.on)out.push({x:SPOT.rsign.x,y:1.3,z:SPOT.rsign.z,r:.55,h:.45,kind:'rsign'});
  for(const t of C.trouble)if(t.k==='drive'&&t.car&&!t.done)out.push({x:t.car.x,y:1.1,z:t.car.z,r:1.6,h:.7,kind:'dcar',o:t});
  if(C.gary&&C.gary.p)out.push({x:C.gary.p.x,y:1,z:C.gary.p.z,r:.4,h:.85,kind:'gary'});return out}
function streamTick(M,dt){const a=A(),C=cw(M),H=C.hose,T=T3();const on=H.held&&!a.CV&&H.spray&&C.phase!=='load';
  const press=kinkPress(C),sp=TUNE.speed*press;let hit=null;
  if(on){const n=nozzleWorld(a,C);const tgt=aimPoint(M);AIM.t=tgt;/* lob: aim above the target by the drop over the flight time */
    let dx=tgt.x-n.x,dy=tgt.y-n.y,dz=tgt.z-n.z;const dist=Math.hypot(dx,dz)||.01;const tf=dist/sp;dy+=.5*9.8*tf*tf;const L=Math.hypot(dx,dy,dz)||1;const vx=dx/L*sp,vy=dy/L*sp,vz=dz/L*sp;
    /* march the main stream for the hit */let px=n.x,py=n.y,pz=n.z,pvx=vx,pvy=vy,pvz=vz;const st=1/90,TG=targetsOf(M);
    for(let t=0;t<1.6;t+=st){px+=pvx*st;py+=pvy*st;pz+=pvz*st;pvy-=9.8*st;if(py<=0){hit={x:px,y:0,z:pz,kind:'ground'};break}
      let h=null;for(const c of C.cars){if(!c.S||c.st==='gone'||Math.hypot(px-c.x,pz-c.z)>3.4)continue;const l=toLocal(c,px,py,pz);if(inside(c.S.pr,l)){h={x:px,y:py,z:pz,kind:'car',c,l,prev:toLocal(c,px-pvx*st,py-pvy*st,pz-pvz*st)};break}}
      if(!h)for(const tg_ of TG){if(Math.hypot(px-tg_.x,pz-tg_.z)<tg_.r&&Math.abs(py-tg_.y)<tg_.h){h=Object.assign({x:px,y:py,z:pz},tg_);break}}if(h){hit=h;break}}
    H.vel={x:vx,y:vy,z:vz};H.n=n;H.hit=hit;
    /* droplets: spawn along the nozzle velocity with a little spread */const D=C.drops;D.acc+=dt*(press<1?40:110);while(D.acc>=1){D.acc--;if(D.list.length>=D.max)D.list.shift();const j=press<1?.18:.045;
      D.list.push({x:n.x,y:n.y,z:n.z,vx:vx*(1+(Math.random()-.5)*j)+(Math.random()-.5)*j*sp,vy:vy*(1+(Math.random()-.5)*j)+(Math.random()-.5)*j*sp,vz:vz*(1+(Math.random()-.5)*j)+(Math.random()-.5)*j*sp,t:0,s:.028+Math.random()*.02,sp:0})}
    if(hit)applyHit(M,hit,dt,press);jetDraw(C,n,vx,vy,vz,hit?Math.min(1.6,Math.hypot(hit.x-n.x,hit.z-n.z)/Math.max(.5,Math.hypot(vx,vz))+.02):1.1,press)}else{H.hit=null;C.jet.count=0}
  hoseSound(on,press,!!(hit&&hit.kind==='car'));dropsTick(M,dt);H.hitT=hit?H.hitT+dt:0}
function jetDraw(C,n,vx,vy,vz,tEnd,press){const J_=C.jet,R=C.rope,N=Math.min(30,Math.max(4,Math.round(tEnd/.045)));const w=C.t*31;let k=0;let px=n.x,py=n.y,pz=n.z;
  for(let i=1;i<=N;i++){const t=tEnd*i/N;const wob=(Math.sin(w+i*1.7)*.012+Math.sin(w*1.3+i*.9)*.008)*t*4;const x=n.x+vx*t+wob,y=n.y+vy*t-4.9*t*t+wob*.5,z=n.z+vz*t-wob;
    const dx=x-px,dy=y-py,dz=z-pz,L=Math.hypot(dx,dy,dz)||1e-4;R.v.set(dx/L,dy/L,dz/L);R.q.setFromUnitVectors(R.up,R.v);const r=(press<1?.012:.014)+t*(press<1?.02:.045);R.s.set(r,L*1.05,r);
    R.m4.compose(R.v.set((x+px)/2,(y+py)/2,(z+pz)/2),R.q,R.s);J_.setMatrixAt(k++,R.m4);px=x;py=y;pz=z}J_.count=k;J_.instanceMatrix.needsUpdate=true}
/* the right arm points the nozzle at the water's target (a bone layer after the base pose; People restores the bones next frame) */
const ARM={};function aimArm(a,C){const d=a.P.dude,rb=d&&d.rb,bs=rb&&rb.bones;if(!bs)return;const ua=bs.Bip01_R_UpperArm,fa=bs.Bip01_R_Forearm,hd=bs.Bip01_R_Hand;if(!ua||!fa)return;const T=T3();
  const V=ARM.v||(ARM={v:new T.Vector3(),w:new T.Vector3(),q:new T.Quaternion(),q2:new T.Quaternion(),pq:new T.Quaternion(),s:new T.Vector3()});const tgt=AIM.t;d.root.updateMatrixWorld(true);
  ua.getWorldPosition(V.s);let dir;if(tgt&&C.hose.spray)dir=V.v.set(tgt.x-V.s.x,tgt.y+.2-V.s.y,tgt.z-V.s.z);else{a.camera.getWorldDirection(V.v);dir=V.v;dir.y=Math.max(-.5,dir.y-.35)}dir.normalize();
  const k=C.hose.spray?1:.55;/* lowered a little when not spraying */
  fa.getWorldPosition(V.w);V.w.sub(V.s).normalize();V.q.setFromUnitVectors(V.w,dir);ua.getWorldQuaternion(V.q2);V.q2.premultiply(V.q);ua.parent.getWorldQuaternion(V.pq);V.pq.invert().multiply(V.q2);ua.quaternion.slerp(V.pq,k);
  ua.updateMatrixWorld(true);if(hd){fa.getWorldPosition(V.s);hd.getWorldPosition(V.w);V.w.sub(V.s).normalize();V.q.setFromUnitVectors(V.w,dir);fa.getWorldQuaternion(V.q2);V.q2.premultiply(V.q);fa.parent.getWorldQuaternion(V.pq);V.pq.invert().multiply(V.q2);fa.quaternion.slerp(V.pq,k*.9);fa.updateMatrixWorld(true)}
  if(C.noz&&C.noz.parent===hand(d)){/* the nozzle points down the arm */}}
function nozzleWorld(a,C){const T=T3();if(C.noz&&C.noz.parent){const v=new T.Vector3(0,.035,.19);C.noz.localToWorld(v);return{x:v.x,y:v.y,z:v.z}}const h=handPos(a);return h}
function dropsTick(M,dt){const C=cw(M),D=C.drops,T=T3(),m4=C.rope.m4,q=C.rope.q,v=C.rope.v,s=C.rope.s,up=C.rope.up;let n=0;const keep=[];
  for(const p of D.list){p.t+=dt;p.vy-=9.8*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;let dead=p.y<=0||p.t>1.8;
    if(!dead&&!p.sp){for(const c of C.cars){if(!c.S||Math.hypot(p.x-c.x,p.z-c.z)>3.4)continue;if(inside(c.S.pr,toLocal(c,p.x,p.y,p.z))){dead=true;break}}}
    if(dead){if(!p.sp&&Math.random()<.35&&keep.length<D.max-10){/* splash: a few droplets bounce back up */for(let k=0;k<2;k++)keep.push({x:p.x,y:Math.max(.02,p.y),z:p.z,vx:(Math.random()-.5)*2.4-p.vx*.08,vy:1+Math.random()*2.2,vz:(Math.random()-.5)*2.4-p.vz*.08,t:0,s:.02+Math.random()*.015,sp:1})}continue}
    keep.push(p)}
  D.list=keep.slice(-D.max);for(const p of D.list){const sp=Math.hypot(p.vx,p.vy,p.vz)||1;v.set(p.vx/sp,p.vy/sp,p.vz/sp);q.setFromUnitVectors(up,v);const st=p.sp?1.4:Math.min(5,1+sp*.35);s.set(p.s,p.s*st,p.s);m4.compose(v.set(p.x,p.y,p.z),q,s);D.im.setMatrixAt(n++,m4)}
  D.im.count=n;D.im.instanceMatrix.needsUpdate=true}
function wetAt(C,x,z,r){const W=C.wet;for(const w of W.list){if(w.a>0&&Math.hypot(w.x-x,w.z-z)<w.r*.6){w.a=Math.min(1,w.a+.05);w.r=Math.min(1.6,w.r+.006);return}}const w=W.list[W.k=(W.k+1)%W.n];w.x=x;w.z=z;w.r=r;w.a=.6}
function wetTick(C,dt){const W=C.wet,m4=C.rope.m4,q=C.rope.q,v=C.rope.v,s=C.rope.s,col=W.col||(W.col=new(T3().Color)());q.setFromAxisAngle(v.set(1,0,0),-Math.PI/2);
  W.list.forEach((w,i)=>{if(w.a>0)w.a=Math.max(0,w.a-dt/40);s.set(w.r,w.r,1);m4.compose(v.set(w.x,.04,w.z),q,s);W.im.setMatrixAt(i,m4);const k=1-.32*w.a;col.setRGB(k,k*1.01,k*1.03);W.im.setColorAt(i,col)});
  W.im.instanceMatrix.needsUpdate=true;if(W.im.instanceColor)W.im.instanceColor.needsUpdate=true}
function applyHit(M,h,dt,press){const a=A(),C=cw(M);C.hitAcc=(C.hitAcc||0)+dt;
  if(h.kind==='ground'){wetAt(C,h.x,h.z,.35);return}
  if(h.kind==='car'){const c=h.c,S=c.S,l=h.l;const dist=Math.hypot(h.x-C.hose.n.x,h.z-C.hose.n.z);const r=TUNE.eraseR*(.85+dist*.06)*(press<1?.6:1),s=clamp(TUNE.eraseK*dt*press,0,.9);
    const k=c.st==='soap'||c.st==='pull'||c.st==='queue'||c.st==='arrive'?(c.soap>=.98?1:TUNE.scrubOnly+.4*c.soap):1;eraseHit(S,l,r,s,k);
    c.rinsed=(c.rinsed||0)+dt;wetAt(C,h.x+(Math.random()-.5)*1.5,h.z+(Math.random()-.5)*1.5,.5);if(c.st==='dry'&&c.dry>.05){c.dry=Math.max(0,c.dry-dt*.4)}return}
  if(h.kind==='bucket'){const i=h.i;const was=C.buckets[i];C.buckets[i]=Math.min(1,C.buckets[i]+TUNE.bucketFill*dt*press);setBucket(C.bk[i],C.buckets[i]);if(was<1&&C.buckets[i]>=1){SFX.good();popAt(M,SPOT.bucket[i].x,.9,SPOT.bucket[i].z,'Full','',"#7fd1ff")}return}
  if(h.kind==='kid'){const k=h.o;if(k.soakT<=0){k.soakT=2.2;C.soaked++;flinch(k.d);SFX.voice('kid',k);say(M,k,pick(LINES.kidSoak),2)}return}
  if(h.kind==='dee'){if(!C.said.deeSoak){C.said.deeSoak=1;flinch(C.dee.d);a.radio('dee',LINES.deeSoak,true)}return}
  if(h.kind==='owner'){const c=h.o;if(c.soaked<=0){c.soaked=1;c.soakPen=(c.soakPen||0)+1;flinch(c.owner.d);say(M,c.owner,pick(LINES.custSoak),2.4)}return}
  if(h.kind==='gary'){if(!C.said.garySoak){C.said.garySoak=1;a.radio('gary',"I'm going to put that in the spreadsheet. Under 'water'.",true)}return}
  if(h.kind==='bad'){const t=h.o;t.wet=(t.wet||0)+dt*press;if(t.wet>(t.k==='thief'?.9:.45)&&!t.soaked)soakBad(M,t);return}
  if(h.kind==='rsign'){const Rv=C.rival;Rv.wet=(Rv.wet||0)+dt*press;const b=C.rivalSet.rs.userData.board;b.rotation.x=Math.min(1.4,Rv.wet*.55);b.position.y=1.15-Rv.wet*.12;if(Rv.wet>2.4&&!Rv.wilted){Rv.wilted=true;rivalClose(M,'spray')}return}
  if(h.kind==='dcar'){const t=h.o;t.wet=(t.wet||0)+dt*press;if(t.wet>.6&&!t.stopped){t.stopped='spray';troubleStop(M,t,'spray')}return}}

/* ---------- kids ---------- */
function kidTick(M,dt){const a=A(),C=cw(M),P=a.P;
  for(const k of C.kids){k.lineT-=dt;if(k.soakT>0){k.soakT-=dt;npcPose(k.d,dt,{});continue}
    if(k.cheerT>0){k.cheerT-=dt}
    if(k.st==='follow'){const bx_=P.pos.x+Math.sin(P.yaw)*1.4+(k===C.kids[0]?.5:-.5)*0,bz=P.pos.z+Math.cos(P.yaw)*1.4;const d=Math.hypot(bx_-k.x,bz-k.z);const mv=d>.7&&!walk(k,bx_,bz,d>4?5.2:3,dt);if(!mv)turnTo(k,P.pos.x,P.pos.z,dt,6);npcPose(k.d,dt,{moving:mv,speed:d>4?1.5:1});continue}
    if(k.st==='sign'){const p=SPOT.sign;if(!walk(k,p.x,p.z,3.2,dt)){npcPose(k.d,dt,{moving:true});continue}turnTo(k,368,SPOT.lane,dt,4);k.workT-=dt;if(k.tool){k.tool.rotation.z=Math.sin(C.t*5)*.35}
      if(k.workT<=0){k.workT=1.4+Math.random();gesture(k.d)}if(k.lineT<=0&&C.phase==='open'){k.lineT=7+Math.random()*5;say(M,k,pick(LINES.kidSign),2.4)}npcPose(k.d,dt,{});continue}
    if(k.st==='w0'||k.st==='w1'){const b=+k.st[1],car=C.cars.find(c=>c.bay===b&&(c.st==='soap')),bkt=C.buckets[b];
      if(car&&bkt>.01){/* orbit the car, scrubbing */const B=BAY[b],ex=1.75,ez=3.15;const kids=C.kids.filter(o=>o.st===k.st);const idx=kids.indexOf(k);
        k.ang+=dt*.32;const ang=k.ang+idx*Math.PI;let tx_=B.x+Math.cos(ang)*ex,tz=Math.max(32.55,B.z+Math.sin(ang)*ez);if(tz<34.2&&Math.abs(tx_-B.x)<1.45)tx_=B.x+(tx_>=B.x?1.45:-1.45);const there=walk(k,tx_,tz,1.6,dt);turnTo(k,B.x,B.z,dt,6);
        const rate=TUNE.soapRate*(kids.length>1?TUNE.soap2/2:1);car.soap=Math.min(1,car.soap+rate*dt);C.buckets[b]=Math.max(0,bkt-TUNE.bucketUse*dt);setBucket(C.bk[b],C.buckets[b]);
        k.workT-=dt;if(k.workT<=0){k.workT=1.05;gesture(k.d);/* foam on the side the kid is on */if(car.S){const l=toLocal(car,k.x,1,k.z),pr=car.S.pr,u=clamp((l.x-pr.min.x)/pr.size.x,0,1);const q=Math.abs(l.z)>pr.size.z*.45?(l.z>0?1:2):3;
            addFoam(car.S,q,Math.max(0,u-.18),Math.min(1,u+.18),26,Math.random);addFoam(car.S,0,Math.max(0,u-.2),Math.min(1,u+.2),14,Math.random);if(car.soap>.5)addFoam(car.S,3,0,1,6,Math.random)}}
        npcPose(k.d,dt,{moving:!there});continue}
      const p=stationPos(k.st);if(bkt<=.01&&car){if(!walk(k,SPOT.bucket[b].x+.6,SPOT.bucket[b].z-.4,3,dt)){npcPose(k.d,dt,{moving:true});continue}turnTo(k,P.pos.x,P.pos.z,dt,4);if(k.lineT<=0){k.lineT=6;say(M,k,pick(LINES.kidBucket),2.2)}npcPose(k.d,dt,{});continue}
      const there=walk(k,p.x,p.z,3,dt);if(there)turnTo(k,BAY[b].x,BAY[b].z,dt,3);npcPose(k.d,dt,{moving:!there});continue}
    if(k.st==='dry'){const car=C.cars.filter(c=>c.st==='dry'&&c.bay>=0).sort((p,q)=>Math.hypot(p.x-k.x,p.z-k.z)-Math.hypot(q.x-k.x,q.z-k.z))[0];
      if(car){const B=BAY[car.bay];const others=C.kids.filter(o=>o.st==='dry');const idx=others.indexOf(k);k.ang+=dt*.42;const ang=k.ang+idx*Math.PI;let tx_=B.x+Math.cos(ang)*1.7,tz=Math.max(32.55,B.z+Math.sin(ang)*3.1);if(tz<34.2&&Math.abs(tx_-B.x)<1.45)tx_=B.x+(tx_>=B.x?1.45:-1.45);const there=walk(k,tx_,tz,1.8,dt);turnTo(k,B.x,B.z,dt,6);
        if(Math.hypot(k.x-B.x,k.z-B.z)<4){car.dry=Math.min(1,car.dry+TUNE.dryRate*(others.length>1?.8:1)*dt);k.workT-=dt;if(k.workT<=0){k.workT=.9;gesture(k.d);SFX.squeak()}}npcPose(k.d,dt,{moving:!there});continue}
      const p=stationPos('dry');const there=walk(k,p.x,p.z,3,dt);if(there)turnTo(k,P.pos.x,P.pos.z,dt,2);npcPose(k.d,dt,{moving:!there});continue}
    /* table: goofing around */const p=SPOT.hang,there=walk(k,p.x+(k.id==='jaylen'?0:.8),p.z+.3,2.5,dt);if(there){turnTo(k,SPOT.table.x,SPOT.table.z+2,dt,2)}npcPose(k.d,dt,{moving:!there});
    if(there&&k.lineT<=0&&C.phase!=='load'){k.lineT=9+Math.random()*6;say(M,k,pick(["Is it snack time?","I'm supervising.","Can I hold the hose? Please? Please?","My mom says I have to stay till four."]),2.4)}}}
function sendKid(M,k,st){const C=cw(M);k.st=st;kidTool(k,st==='sign'?'sign':st==='dry'?'dry':'sponge');if(k.toolKind==='dry'){}say(M,k,pick(LINES.kidPlace[st]||['Okay!']),2.2);SFX.place();C.follow=null;
  if(k.id==='jaylen'&&st==='sign'&&C.tut===2)C.tut=3}

/* ---------- the customers' visit ---------- */
function ownerOut(M,c){const a=A(),C=cw(M);if(!c.S)return;const d=dude(c.cu.role,{shirt:'#8aa0b8'});const B=BAY[c.bay];const x=B.x+(c.bay?-1.6:1.6),z=B.z+.4;d.root.position.set(x,0,z);a.wmAdd(d.root);
  const chairs=SPOT.chairs.map((p,i)=>i).filter(i=>!C.cars.some(o=>o.owner&&o.owner.chair===i));const ch=chairs.sort((p,q)=>Math.abs(SPOT.chairs[p].x-B.x)-Math.abs(SPOT.chairs[q].x-B.x))[0];
  c.owner={d,x,z,yaw:0,chair:ch==null?-1:ch,mode:'walk',t:0};say(M,c.owner,c.cu.who+': '+c.cu.hi,3.6)}
function ownerTick(M,c,dt){const o=c.owner;if(!o)return;o.t+=dt;if(c.soaked>0)c.soaked-=dt*.25;
  if(o.mode==='walk'){const p=o.chair>=0?SPOT.chairs[o.chair]:{x:BAY[c.bay].x+(c.bay?-2.4:2.4),z:38.4};if(walk(o,p.x,p.z-(o.chair>=0?.1:0),1.5,dt)){o.mode=o.chair>=0?'sit':'stand';o.d.root.rotation.y=o.chair>=0?Math.PI:o.yaw;o.yaw=o.d.root.rotation.y}npcPose(o.d,dt,{moving:o.mode==='walk'});return}
  if(o.mode==='sit'||o.mode==='stand'){if(o.mode==='sit'){o.d.root.position.set(o.x,0,o.z+.12);o.d.root.rotation.y=Math.PI}npcPose(o.d,dt,{mode:o.mode==='sit'?'sit':'stand'});return}
  if(o.mode==='back'){const B=BAY[c.bay];const tx_=B.x+(c.bay?-1.5:1.5),tz=B.z+.6;if(walk(o,tx_,tz,1.5,dt)){o.mode='in';o.d.root.visible=false;o.inCar=true}npcPose(o.d,dt,{moving:o.mode==='back'})}}
function carState(M,c,dt){const a=A(),C=cw(M);if(c.S){if(c.st==='pull'||c.st==='soap'||c.st==='rinse'||c.st==='dry'){c.cleanT-=dt;if(c.cleanT<=0){c.cleanT=.25;c.clean=cleanOf(c.S)}}flushSkin(c.S)}
  if(c.bay>=0&&!c.owner&&c.ownerWait!=null&&(c.st==='soap'||c.st==='rinse'||c.st==='dry')){c.ownerWait+=dt;const pp=PP(),key=custKeys([c.cu])[0];if(!pp||!pp.has||pp.has(key)||c.ownerWait>6)ownerOut(M,c);else if(!c.askedM){c.askedM=1;try{pp.preload([key]).catch(()=>{})}catch(_){}}}
  if(c.st==='pull'){if(drive(c,dt,4.2)){c.st='soap';c.x=BAY[c.bay].x;c.z=BAY[c.bay].z;c.yaw=Math.PI/2;setBayCol(C,c.bay,true);c.ownerWait=0;c.tWash=C.clock;
      if(!C.said.first){C.said.first=1;a.radio('dee',LINES.openDee,true)}}}
  else if(c.st==='soap'){if(c.soap>=1){c.st='rinse';c.foamPeak=c.S?Math.max(.05,foamFrac(c.S)):1;c.foamT=0;say(M,{x:c.x,z:c.z,y:2.2},'Soaped! Rinse it!',1.8);if(!C.said.rinse){C.said.rinse=1;a.radio('you',LINES.rinseTip,true)}}}
  else if(c.st==='rinse'){c.foamT=(c.foamT||0)-dt;if(c.foamT<=0&&c.S){c.foamT=.5;c.foamLeft=clamp(foamFrac(c.S)/(c.foamPeak||1),0,1)}const foamLeft=c.foamLeft||0;if(c.clean>=TUNE.needClean&&foamLeft<TUNE.foamLeft){c.st='dry';c.dry=0;c.wetT=0;if(c.S)c.S.U.uWet.value=1;SFX.good();popAt(M,c.x,2.2,c.z,Math.round(c.clean*100)+'% clean','Rinsed','#7fd1ff')}}
  else if(c.st==='dry'){c.wetT+=dt;if(c.S)c.S.U.uWet.value=clamp(1-c.dry,0,1);if(c.dry>=1||c.wetT>TUNE.wetLeave){finishCar(M,c)}}
  else if(c.st==='rival'){if(drive(c,dt,6)){c.st='gone'}}
  else if(c.st==='pay'){if(!c.owner||c.owner.inCar){c.st='leave';c.path=pathOut(c.bay);setBayCol(C,c.bay,false)}}
  else if(c.st==='leave'){if(drive(c,dt,c.path&&c.path[0]&&c.path[0].rev?2.2:7)){c.st='gone';if(c.bay>=0){c.bay=-1}}}
  if(c.st==='gone'){freeCar(c);return}
  if(c.st!=='gone')carTick(c,dt);if(c.owner)ownerTick(M,c,dt)}
function freeCar(c){if(c.freed)return;c.freed=true;const o=c.car;if(o.parent)o.parent.remove(o);if(c.owner&&c.owner.d.root.parent)c.owner.d.root.parent.remove(c.owner.d.root);
  if(c.S){try{c.S.dirt.tex.dispose();c.S.foam.tex.dispose()}catch(_){}c.S.dirt.cv.width=c.S.foam.cv.width=1}try{o.userData&&o.userData.dispose&&o.userData.dispose()}catch(_){}o.traverse(m=>{if(m.isMesh&&m.renderOrder===3&&m.material)try{m.material.dispose()}catch(_){}})}
/* the share of foam still on the car (canvas read back twice a second while rinsing) */
function foamFrac(S){const g=S.foam.g,d=g.getImageData(0,0,FOAM,FOAM).data;let s=0;for(let i=3;i<d.length;i+=16)s+=d[i];return s/(d.length/16)/255}
function finishCar(M,c){const a=A(),C=cw(M);const wet=c.dry<1;c.st='pay';if(c.S)c.S.U.uWet.value=wet?.6:0;
  const shine=clamp((c.clean-.6)/.4,0,1)*(.7+.3*clamp(c.dry,0,1)),total=c.t0-C.clock,fast=clamp((150-total)/90,0,1);const spot=c.clean>=.97&&!wet;
  const price=c.free?0:TUNE.price;let tip=Math.round(TUNE.tipBase+shine*TUNE.tipShine+fast*TUNE.tipFast)+(spot?TUNE.spotless:0)-(c.soakPen?2:0);if(c.free)tip=Math.round(tip*.5);tip=Math.max(0,tip);
  const amt=price+tip;C.raised+=amt;C.tips+=tip;C.carsDone++;C.shineSum+=shine;if(spot)C.spotless++;if(c.free)C.free++;
  const line=c.free?pick(LINES.free):shine>.7?c.cu.ok:c.cu.meh;if(c.owner){c.owner.mode='back';c.owner.d.root.visible=true;say(M,c.owner,wet?LINES.wetLeave:line,3)}
  popAt(M,c.x,2.4,c.z,'+'+money(amt),(c.free?'"free" · ':'$'+price+' + ')+money(tip)+' tip'+(spot?' · spotless!':wet?' · still wet':''),'#9fe58a');SFX.cash();if(spot){SFX.sparkle();try{const F=window.HT.FX;if(F&&F.trustPop)F.trustPop(new(T3().Vector3)(c.x,1.8,c.z),'SPARKLING',{color:'#7fd1ff'})}catch(_){}}
  /* trust: small steps, capped per run and per week */const s=SV(),pl=plan(s),wk=weekOf(s);if(pl.week.w!==wk)pl.week={w:wk,g:0};const room=Math.min(TUNE.trustRun-C.trustRun,TUNE.trustWeek-pl.week.g);
  if(room>0&&!M.replay){const v=Math.min(TUNE.trustCar,room);a.addTrust(v,'river');C.trustRun+=v;pl.week.g=+(pl.week.g+v).toFixed(2)}
  for(const k of C.kids)if(Math.hypot(k.x-c.x,k.z-c.z)<5&&k.soakT<=0){k.cheerT=1.2;gesture(k.d)}if(Math.random()<.5)SFX.voice('kid_yay',{x:c.x,z:c.z});
  thermoDraw(M);if(C.carsDone%3===0)say(M,C.dee,pick(LINES.thermo),2.4)}
function thermoDraw(M){const C=cw(M),pl=plan(),tot=pl.raised+C.raised,g=goalOf(pl.raised);drawThermo(C.thermo,tot,C.raised,g.goal,g.label,g.done||tot>=g.goal);C.thermoNow=tot}

/* ---------- trouble (the Coupon Boys) ---------- */
const BADROLES=['thug_cap','thug_jacket','thug_hoodie','thug_beanie','thug_track'];
function badDude(M,x,z,i){const a=A(),d=dude(BADROLES[i%BADROLES.length],{shirt:'#2aa39a',hood:true});d.root.position.set(x,0,z);a.wmAdd(d.root);try{armband(d,'#2aa39a')}catch(_){}return{d,x,z,yaw:0}}
function startTrouble(M,k){const a=A(),C=cw(M),R=rng(C.seed+k.length*131+C.trouble.length*17);const t={k,st:'go',t:0,done:false,id:C.trouble.length};C.trouble.push(t);const W=C.sc.ev.length;
  const fromE=R()<.5,sx=fromE?354:310,sz=SPOT.lane-2.9;/* along the sidewalk, from out of the way */
  if(k==='kink'){const N=C.rope.nodes;/* a node out in the open (not under a car), where a person can reach it */let bi=Math.round(N.length*(.35+R()*.25));for(let tries=0;tries<20;tries++){const n=N[bi];const clear=C.cars.every(c=>c.bay<0||Math.hypot(n.x-c.x,n.z-c.z)>3.4)&&n.z>32.6&&n.z<41;if(clear)break;bi=Math.max(3,Math.min(N.length-3,Math.round(N.length*(.2+R()*.65))))}t.node=bi;const n=N[t.node];t.at={x:n.x,z:n.z};t.p=badDude(M,sx,sz,C.trouble.length)}
  else if(k==='sign'){t.at={x:SPOT.aframe.x+.9,z:SPOT.aframe.z+.4};t.p=badDude(M,354,sz,C.trouble.length)}
  else if(k==='mud'){t.p=badDude(M,sx,sz,C.trouble.length);t.bucket=mudBucket();hand(t.p.d).add(t.bucket);t.bucket.scale.setScalar(.8);t.bucket.rotation.set(t.p.d.rb?-Math.PI/2:0,0,0)}
  else if(k==='rival'){C.rival={on:true,t:0,wet:0,ppl:[]};C.rivalSet.rv.visible=true;C.rivalSet.rs.visible=true;const rs=C.rivalSet.rs.userData.board;rs.rotation.x=0;rs.position.y=1.15;
    t.p=badDude(M,SPOT.rival.x-1,SPOT.rival.z-.9,1);t.p2=badDude(M,SPOT.rival.x+1.3,SPOT.rival.z-.6,2);faceTo(t.p.d,SPOT.rival.x,40);faceTo(t.p2.d,SPOT.rival.x,40);t.st='open';a.radio('Coupon Boy',pick(LINES.bad.rival),true);a.feed('A rival car wash opened across the street','bad','spray their sign, have a word, or call Gary');SFX.bad()}
  else if(k==='drive'){t.st='drive';const car=a.makeVehicle('sedan','#2aa39a');if(car){a.wmAdd(car);if(car.userData&&car.userData.dispose)R_own(car)}t.car={o:car,x:292,z:SPOT.lane,yaw:0,spd:11};SFX.honk();a.radio('Coupon Boy',pick(LINES.bad.drive),true);a.feed('A car is coming through the gutter puddle','bad','spray the windshield, or stand in the lane')}
  else if(k==='thief'){t.p=badDude(M,356,SPOT.lane-2.8,0);t.at={x:SPOT.table.x+.4,z:SPOT.table.z+.95};C.thief=t}
  if(t.p&&k!=='rival'){t.p.d.root.rotation.y=-Math.PI/2}return t}
function troubleTick(M,dt){const a=A(),C=cw(M),P=a.P;
  for(const t of C.trouble){if(t.done&&t.st==='gone')continue;t.t+=dt;const p=t.p;
    if(t.soaked&&p){/* soaked: run away dripping */t.fleeT=(t.fleeT||0)+dt;const ex=p.x>332?370:296;walk(p,ex,SPOT.lane-2.8,5.5,dt);npcPose(p.d,dt,{moving:true,speed:1.5});if(t.fleeT>7){p.d.root.visible=false;t.st='gone'}
      if(t.p2){walk(t.p2,ex+2,SPOT.lane+5,5,dt);npcPose(t.p2.d,dt,{moving:true,speed:1.4});if(t.fleeT>7)t.p2.d.root.visible=false}continue}
    if(t.talked&&p){t.fleeT=(t.fleeT||0)+dt;const ex=p.x>332?372:294;walk(p,ex,SPOT.lane-2.8,2.2,dt);npcPose(p.d,dt,{moving:true});if(t.fleeT>10){p.d.root.visible=false;t.st='gone'}
      if(t.p2){walk(t.p2,ex+2,SPOT.lane+5,2.2,dt);npcPose(t.p2.d,dt,{moving:true});if(t.fleeT>10)t.p2.d.root.visible=false}continue}
    if(t.k==='kink'){if(t.st==='go'){const n=C.rope.nodes[t.node];t.at={x:n.x,z:n.z};if(walk(p,n.x+.5,n.z,1.9,dt)){t.st='kink';t.w=1.4;p.d.root.visible=true}npcPose(p.d,dt,{moving:t.st==='go'})}
      else if(t.st==='kink'){t.w-=dt;npcPose(p.d,dt,{mode:'crouch'});if(t.w<=0){t.st='leave';C.hose.kink=t.node;t.kinkT=0;const km=kinkModel();a.wmAdd(km);t.km=km;a.radio('Coupon Boy',pick(LINES.bad.kink),true);a.feed('Your hose has a kink in it','bad','hold E on the kink to fix it');SFX.bad()}}
      else if(t.st==='leave'){walk(p,296,SPOT.lane-2.8,2.4,dt);npcPose(p.d,dt,{moving:true});if(p.x<300)p.d.root.visible=false}
      if(t.km){const n=C.rope.nodes[t.node];t.km.position.set(n.x,n.y,n.z);t.kinkT+=dt;if(t.kinkT>30&&!t.counted){t.counted=1;C.troubleWon++}}continue}
    if(t.k==='sign'){if(t.st==='go'){if(walk(p,t.at.x,t.at.z,2.2,dt)){t.st='swap';t.w=1.6}npcPose(p.d,dt,{moving:t.st==='go'})}
      else if(t.st==='swap'){t.w-=dt;turnTo(p,SPOT.aframe.x,SPOT.aframe.z,dt,6);if(t.w<1.2&&!t.g){t.g=1;gesture(p.d)}npcPose(p.d,dt,{});if(t.w<=0){t.st='leave';setFree(M,true);a.radio('Coupon Boy',pick(LINES.bad.sign),true);a.feed('Somebody swapped the sign to FREE','bad','hold E at the sign to swap it back');SFX.bad()}}
      else if(t.st==='leave'){walk(p,374,SPOT.lane-2.8,3,dt);npcPose(p.d,dt,{moving:true});if(p.x>370)p.d.root.visible=false}
      if(C.signFree){t.freeT=(t.freeT||0)+dt;if(t.freeT>30&&!t.counted){t.counted=1;C.troubleWon++}}if(t.st==='leave'&&!C.signFree&&!t.done){t.done=true}continue}
    if(t.k==='mud'){if(t.st==='go'){const tgt=C.cars.filter(c=>c.bay>=0&&(c.st==='dry'||c.st==='rinse'||c.st==='pay')).sort((q,r)=>r.clean-q.clean)[0]||C.cars.find(c=>c.bay>=0&&c.st!=='leave');
        if(tgt){t.tgt=tgt;const B=BAY[tgt.bay],tx_=B.x+(tgt.bay?2.6:-2.6),tz=38.6;if(walk(p,tx_,tz,2.3,dt)){t.st='throw';t.w=1.1;gesture(p.d)}}else{walk(p,BAY[1].x+3,38.6,1.6,dt)}npcPose(p.d,dt,{moving:t.st==='go'})}
      else if(t.st==='throw'){t.w-=dt;turnTo(p,t.tgt.x,t.tgt.z,dt,8);npcPose(p.d,dt,{});if(t.w<=0){t.st='leave';const c=t.tgt;if(c.S&&c.st!=='leave'&&c.st!=='gone'){splatMud(c.S,c.bay?1:2,rng(C.seed+77),1.2);splatMud(c.S,3,rng(C.seed+78),.5);c.clean=cleanOf(c.S);
            if(c.st==='dry'||c.st==='pay'&&!c.owner.inCar){c.st='rinse';c.dry=0;c.S.U.uWet.value=0}}SFX.splash();a.radio('Coupon Boy',pick(LINES.bad.mud),true);a.radio('you',"Oh, COME ON.");C.troubleWon++;t.counted=1;if(t.bucket)t.bucket.visible=false;
          for(const k of C.kids)if(Math.hypot(k.x-p.x,k.z-p.z)<6){k.soakT=1.6;say(M,k,"EW! MUD!",1.6)}}}
      else{walk(p,p.x>332?374:294,SPOT.lane-2.8,4,dt);npcPose(p.d,dt,{moving:true,speed:1.3});if(Math.abs(p.x-332)>38)p.d.root.visible=false;t.done=true}continue}
    if(t.k==='rival'){const Rv=C.rival;if(t.st==='open'){Rv.t+=dt;npcPose(p.d,dt,{});npcPose(t.p2.d,dt,{});if(!t.lineT||t.lineT<0){t.lineT=9;say(M,p,pick(LINES.bad.rival),2.6)}t.lineT-=dt;
        if(Rv.t>60&&!t.counted){t.counted=1;C.troubleWon++}if(Rv.t>95){rivalClose(M,'time')}}continue}
    if(t.k==='drive'){const c=t.car;if(!c||!c.o){t.done=true;t.st='gone';continue}
      if(t.st==='drive'){/* stand in the lane in front of him and he stops */const block=!a.CV&&Math.abs(P.pos.z-SPOT.lane)<2.2&&P.pos.x>c.x+2&&P.pos.x<c.x+14;if(block&&!t.stopped){t.stopped='block';troubleStop(M,t,'block')}
        c.x+=c.spd*dt;if(c.x>SPOT.puddle.x-5&&c.x<SPOT.puddle.x+5&&!t.splashed){t.splashed=true;splash(M,t)}if(c.x>392){t.st='gone';c.o.visible=false;t.done=true}}
      else if(t.st==='stop'){c.spd=Math.max(-4,c.spd-dt*14);c.x+=c.spd*dt;if(c.x<290){t.st='gone';c.o.visible=false}}
      c.o.position.set(c.x,0,c.z);c.o.rotation.y=c.spd>=0?0:0;const V=window.HT&&HT.Vehicles;if(V&&V.update)try{V.update(c.o,{dt,speed:c.spd,steer:0,braking:t.st==='stop'})}catch(_){}continue}
    if(t.k==='thief')thiefTick(M,t,dt)}}
function splash(M,t){const a=A(),C=cw(M);SFX.splash();a.radio('Coupon Boy',"SPLASH ZONE!",true);let any=false;
  for(const c of C.cars)if(c.bay>=0&&c.S&&c.st!=='leave'&&c.st!=='gone'){splatMud(c.S,3,rng(C.seed+c.id),.8);splatMud(c.S,c.bay?1:2,rng(C.seed+c.id+1),.5);c.clean=cleanOf(c.S);if(c.st==='dry'){c.st='rinse';c.dry=0;c.S.U.uWet.value=0}any=true}
  for(const k of C.kids)if(k.z>36.5){k.soakT=2;say(M,k,"AAAH! GROSS!",1.8)}if(any)C.troubleWon++;t.counted=1;for(let i=0;i<8;i++)wetAt(C,SPOT.puddle.x-4+i,39.5+Math.random(),.6)}
function troubleStop(M,t,how){const a=A(),C=cw(M);if(t.k==='drive'){t.st='stop';t.done=true;C.troubleStopped++;a.radio('Coupon Boy',how==='spray'?"I CAN'T SEE! WIPERS! WHERE ARE THE WIPERS!":"Whoa whoa whoa. Okay. Not today.",true);a.feed('Car turned away','trust',how==='spray'?'windshield wash':'dad in the road');SFX.good()}}
function soakBad(M,t){const a=A(),C=cw(M),p=t.p;t.soaked=true;flinch(p.d);SFX.voice('thug_hurt',p);say(M,p,pick(LINES.bad.soaked),2.2);
  if(t.k==='thief'){thiefCaught(M,t,'spray');return}
  const before=t.k==='kink'?t.st==='go':t.k==='sign'?t.st==='go'||t.st==='swap':t.k==='mud'?t.st==='go'||t.st==='throw':false;if(t.bucket&&before){t.bucket.visible=false}
  if(before){t.done=true;C.troubleStopped++;a.feed('Soaked before he could do it','trust','+0.5 trust');a.addTrust(.5,'river');SFX.good()}else{t.done=t.done||t.k==='mud'}
  if(t.k==='rival')rivalClose(M,'spray')}
function setFree(M,on){const C=cw(M);C.signFree=on;const tex=priceSign(on);for(const m of C.aframe.faces){if(m.map&&m.map!==tex){m.map=tex}m.needsUpdate=true}}
function rivalClose(M,how){const a=A(),C=cw(M),Rv=C.rival;if(!Rv||!Rv.on)return;Rv.on=false;const t=C.trouble.find(t=>t.k==='rival');
  if(how==='spray'){a.radio('Coupon Boy',LINES.rivalSign,true);a.radio('Coupon Boy',LINES.rivalPack)}else if(how==='gary'){}else if(how==='talk'){a.radio('Coupon Boy',LINES.rivalPack,true)}
  if(how!=='time'){C.troubleStopped++;SFX.good();a.feed('The coupon wash packed up','trust',how==='gary'?'permit check':how==='talk'?'a word':'cardboard vs. hose')}
  if(t){t.done=true;if(how==='spray')t.soaked=true;else t.talked=true}Rv.closeT=0}
function thiefTick(M,t,dt){const a=A(),C=cw(M),P=a.P,p=t.p;
  if(t.st==='go'){if(walk(p,t.at.x,t.at.z,1.7,dt)){t.st='grab';t.w=.9;gesture(p.d)}npcPose(p.d,dt,{moving:t.st==='go'});return}
  if(t.st==='grab'){t.w-=dt;turnTo(p,SPOT.table.x,SPOT.table.z,dt,8);npcPose(p.d,dt,{});if(t.w<=0){t.st='run';C.box=false;const bm=C.boxMesh;if(bm.parent)bm.parent.remove(bm);bm.position.set(0,0,.25);bm.rotation.set(0,0,0);hand(p.d).add(bm);if(p.d.rb)bm.rotation.set(-Math.PI/2,0,0);
      a.radio('dee',LINES.box.grab,true);a.radio('Kev',pick(LINES.bad.thief));a.feed('Kev grabbed the cash box','bad','catch him: run into him, or soak him');SFX.bad();music('combat',{intensity:.4});t.from={x:p.x,z:p.z};
      t.route=[{x:p.x+2,z:39.3},{x:318,z:39.3},{x:300,z:39.3},{x:270,z:39.3}]}return}
  if(t.st==='run'){const w=t.route[0];if(w&&walk(p,w.x,w.z,4.6,dt))t.route.shift();npcPose(p.d,dt,{moving:true,speed:1.5});if(!a.CV&&Math.hypot(P.pos.x-p.x,P.pos.z-p.z)<TUNE.catchR)thiefCaught(M,t,'tackle');
    if(Math.hypot(p.x-SPOT.table.x,p.z-SPOT.table.z)>TUNE.thiefLost){t.st='gone';t.done=true;p.d.root.visible=false;const lost=Math.min(25,Math.round(C.raised*.25));C.raised-=lost;C.boxLost=lost;C.troubleWon++;a.radio('dee',LINES.box.lost,true);a.feed('The cash box is gone','bad','-'+money(lost));thermoDraw(M);music('tension',{intensity:.4})}return}
  if(t.st==='surr'){npcPose(p.d,dt,{mode:'hands'});turnTo(p,P.pos.x,P.pos.z,dt,4);return}
  if(t.st==='walk'){/* he walks with you, away from the kids */const tx_=P.pos.x+Math.sin(P.yaw)*1.6,tz=P.pos.z+Math.cos(P.yaw)*1.6;const d=Math.hypot(tx_-p.x,tz-p.z);const mv=d>.8&&!walk(p,tx_,tz,d>4?4.5:2.6,dt);if(!mv)turnTo(p,P.pos.x,P.pos.z,dt,4);npcPose(p.d,dt,{moving:mv});return}
  if(t.st==='cuffed'){npcPose(p.d,dt,{mode:'kneel'});return}}
function thiefCaught(M,t,how){const a=A(),C=cw(M);if(t.st!=='run'&&t.st!=='go'&&t.st!=='grab')return;t.st='surr';t.done=true;C.troubleStopped++;flinch(t.p.d);a.radio('Kev',pick(LINES.bad.caught),true);
  if(!C.box){const bm=C.boxMesh;if(bm.parent)bm.parent.remove(bm);a.wmAdd(bm);bm.position.set(t.p.x+.6,0,t.p.z);bm.rotation.set(0,1,0);t.boxDrop={x:t.p.x+.6,z:t.p.z}}
  a.feed(how==='spray'?'Soaked him. He slipped.':'Caught him','trust','zip-tie him away from the kids');music('tension',{intensity:.5})}
function kidNear(C,x,z){let d=1e9;for(const k of C.kids)d=Math.min(d,Math.hypot(k.x-x,k.z-z));return d}

/* ---------- Gary ---------- */
function callGary(M){const a=A(),C=cw(M),G=C.gary;if(C.phase!=='open')return;if(G.busy){a.radio('you',LINES.gary.busy,true);return}if(G.left<=0){a.radio('gary',LINES.gary.none,true);return}
  const open=C.trouble.filter(t=>!t.done&&t.k!=='thief'&&!(t.k==='drive'));const kink=C.hose.kink>=0,free=C.signFree;
  const job=C.rival&&C.rival.on?'rival':free?'sign':kink?'kink':open.find(t=>t.k==='mud'&&t.st==='go')?'mud':C.thief&&C.thief.st==='run'?'thief':null;
  if(!job){a.radio('gary',"Nothing to audit yet. Call me when there's trouble. I'll be in the car. Doing a crossword.",true);return}
  a.radio('you',LINES.gary.call,true);if(job==='thief'){a.radio('gary',LINES.gary.thief);return}a.radio('gary',LINES.gary.hi);G.left--;
  const d=dude('gary',{});const x=356,z=39.2;d.root.position.set(x,0,z);a.wmAdd(d.root);G.p={d,x,z,yaw:0};G.busy=job;G.st='go';G.t=0;C.garyUsed=(C.garyUsed||0)+1}
function garyTick(M,dt){const a=A(),C=cw(M),G=C.gary;if(!G.p)return;const p=G.p;G.t+=dt;
  const tgt=G.busy==='rival'?{x:SPOT.rival.x+1.2,z:46.6}:G.busy==='sign'?{x:SPOT.aframe.x+.8,z:SPOT.aframe.z+.4}:G.busy==='kink'?(()=>{const n=C.rope.nodes[C.hose.kink>=0?C.hose.kink:10];return{x:n.x+.5,z:n.z}})():G.busy==='mud'?(()=>{const t=C.trouble.find(t=>t.k==='mud'&&!t.done);return t?{x:t.p.x+.8,z:t.p.z}:{x:p.x,z:p.z}})():{x:360,z:39.2};
  if(G.st==='go'){if(walk(p,tgt.x,tgt.z,3.8,dt)||G.t>14){G.st='do';G.w=2.2;gesture(p.d);a.radio('gary',LINES.gary[G.busy]||'Done.',true)}npcPose(p.d,dt,{moving:G.st==='go'})}
  else if(G.st==='do'){G.w-=dt;npcPose(p.d,dt,{});if(G.w<=0){const j=G.busy;
      if(j==='rival')rivalClose(M,'gary');else if(j==='sign'){setFree(M,false);const t=C.trouble.find(t=>t.k==='sign');if(t){t.done=true}C.troubleStopped++}else if(j==='kink'){fixKink(M)}else if(j==='mud'){const t=C.trouble.find(t=>t.k==='mud'&&!t.done);if(t){t.done=true;t.talked=true;if(t.bucket)t.bucket.visible=false;C.troubleStopped++}}
      G.st='back';SFX.good()}}
  else if(G.st==='back'){const done=walk(p,362,39.2,3.4,dt);npcPose(p.d,dt,{moving:!done});if(done||G.t>40){p.d.root.visible=false;G.p=null;G.busy=null}}}
function fixKink(M){const C=cw(M),t=C.trouble.find(t=>t.k==='kink'&&t.km);C.hose.kink=-1;if(t){if(t.km.parent)t.km.parent.remove(t.km);t.km=null;t.done=true;if(!t.counted)C.troubleStopped++}SFX.good()}
function talkTo(M,t){const a=A(),C=cw(M),H=a.HUD;if(C.talk)return;const opts=LINES.talk.opts.map(o=>({text:o[0],reg:o[1]}));let ch=null;
  const done=i=>{if(!C.talk)return;C.talk=null;try{a.overlay('cw-talk',null)}catch(_){}const p=t.p;t.talked=true;t.done=true;C.talked++;C.troubleStopped++;
    a.radio('you',opts[i].text,true);a.radio(t.k==='thief'?'Kev':'Coupon Boy',i===1?LINES.bad.talked[0]:i===2?LINES.bad.talked[1]:LINES.bad.talked[2]);if(i===1&&!C.convert){C.convert=t;C.sc.cust.splice(C.ci,0,'teen')}
    if(t.bucket)t.bucket.visible=false;if(t.k==='rival')rivalClose(M,'talk');a.addTrust(TUNE.trustTalk*.5,'river');SFX.good();void p};
  try{ch=H&&H.kit&&H.kit.choices?H.kit.choices({speaker:'You',color:'#ffd23f',prompt:LINES.talk.prompt,tell:t.k==='rival'?'two Coupon Boys, a mop':'a Coupon Boy, mid-scheme',options:opts,onPick:i=>done(i)}):null}catch(_){ch=null}
  if(ch){try{a.overlay('cw-talk',ch.el)}catch(_){}}C.talk={t:5.5,ch,done}}

/* ================= HUD layer (DOM): car chips, kid chips, trouble markers, roster, thermometer, popups, tally ================= */
const CSS=`
#cwh{position:fixed;inset:0;pointer-events:none;z-index:8;font-family:var(--ui,"Barlow Condensed","Arial Narrow",sans-serif);color:#f6f1e3;-webkit-user-select:none;user-select:none}
#cwh .chip{position:absolute;left:0;top:0;transform:translate(-50%,-100%);background:rgba(20,24,30,.8);border:2px solid rgba(246,241,227,.16);border-radius:12px;padding:4px 8px 5px;white-space:nowrap;text-align:center;font:700 13px/1.1 var(--ui);will-change:transform}
#cwh .chip .who{font:800 12px/1 var(--ui);letter-spacing:.06em;opacity:.85}
#cwh .chip .steps{display:flex;gap:4px;margin-top:4px;justify-content:center}
#cwh .chip .st{font:800 11px/1 var(--ui);letter-spacing:.08em;padding:3px 5px;border-radius:6px;background:rgba(246,241,227,.12);color:rgba(246,241,227,.55);position:relative;overflow:hidden}
#cwh .chip .st i{position:absolute;left:0;bottom:0;height:3px;background:#9fe58a}
#cwh .chip .st.on{background:#ffd23f;color:#16181c}#cwh .chip .st.dn{background:rgba(159,229,138,.25);color:#9fe58a}
#cwh .chip .st.on.r{background:#7fd1ff}#cwh .chip .st.on.d{background:#c9a6ff}
#cwh .chip .pc{font:900 15px/1 var(--ui);margin-top:3px;color:#7fd1ff}
#cwh .chip.warn{border-color:#ff8a5a}
#cwh .kid{position:absolute;left:0;top:0;transform:translate(-50%,-100%);font:800 12px/1 var(--ui);letter-spacing:.05em;background:rgba(20,24,30,.7);border-radius:999px;padding:3px 8px;white-space:nowrap;will-change:transform}
#cwh .kid b{color:#ffd23f}#cwh .kid.fol{background:#ffd23f;color:#16181c}#cwh .kid.fol b{color:#16181c}#cwh .kid.alert{background:#c93a2b}
#cwh .bad{position:absolute;left:0;top:0;transform:translate(-50%,-100%);font:900 13px/1 var(--ui);letter-spacing:.08em;background:#c93a2b;border:2px solid #ffd23f;border-radius:10px;padding:4px 8px;white-space:nowrap;animation:cwPulse 1s infinite;will-change:transform}
#cwh .stn{position:absolute;left:0;top:0;transform:translate(-50%,-100%);font:800 13px/1 var(--ui);background:rgba(255,210,63,.92);color:#16181c;border-radius:8px;padding:4px 8px;white-space:nowrap;will-change:transform}
#cwh .say{position:absolute;left:0;top:0;transform:translate(-50%,-100%);max-width:260px;white-space:normal;text-align:center;background:#f6f1e3;color:#16181c;font:700 14px/1.2 var(--ui);padding:6px 10px;border-radius:12px;box-shadow:0 3px 12px rgba(0,0,0,.3)}
#cwh .say:after{content:'';position:absolute;left:50%;bottom:-7px;margin-left:-7px;border:7px solid transparent;border-bottom:0;border-top-color:#f6f1e3}
#cwh .pop{position:absolute;left:0;top:0;transform:translate(-50%,-50%);font:900 30px/1 var(--ui);text-shadow:0 2px 0 #16181c,0 0 12px rgba(0,0,0,.4);text-align:center;white-space:nowrap}
#cwh .pop small{display:block;font:700 13px/1.2 var(--ui);color:#f6f1e3}
#cwh .roster{position:absolute;right:14px;top:150px;background:rgba(20,24,30,.72);border-radius:12px;padding:8px 10px;min-width:184px;font:700 14px/1.35 var(--ui)}
#cwh .roster h4{margin:0 0 4px;font:800 11px/1 var(--ui);letter-spacing:.18em;text-transform:uppercase;opacity:.65}
#cwh .roster .r{display:flex;justify-content:space-between;gap:12px}#cwh .roster .r span:last-child{color:#ffd23f}
#cwh .roster .keys{margin-top:6px;border-top:1px solid rgba(246,241,227,.15);padding-top:5px;font:600 12px/1.45 var(--ui);opacity:.9}
#cwh kbd{display:inline-block;min-width:16px;text-align:center;background:#f6f1e3;color:#16181c;border-radius:4px;padding:0 4px;font:800 11px/16px var(--ui);margin-right:3px}
#cwh .therm{position:absolute;right:22px;top:330px;width:54px;text-align:center}
#cwh .therm .tube{position:relative;margin:0 auto;width:18px;height:150px;border-radius:9px;background:rgba(246,241,227,.85);overflow:hidden;border:2px solid rgba(20,24,30,.6)}
#cwh .therm .tube i{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(#ff6f5a,#c0392b)}#cwh .therm .tube b{position:absolute;left:0;right:0;bottom:0;background:#8e2a20}
#cwh .therm .bulb{width:32px;height:32px;border-radius:50%;background:#c0392b;margin:-6px auto 0;border:2px solid rgba(20,24,30,.6)}
#cwh .therm .lab{font:800 13px/1.1 var(--ui);margin-top:4px;text-shadow:0 1px 2px #000}#cwh .therm .g{font:600 11px/1.1 var(--ui);opacity:.85;text-shadow:0 1px 2px #000}
#cwh .big{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font:900 120px/1 var(--ui);color:#ffd23f;text-shadow:0 6px 0 #16181c;animation:cwBig .95s ease-out forwards}
#cwh .touch{position:absolute;right:120px;bottom:120px;display:none;gap:12px;pointer-events:auto}
#cwh.touch .touch{display:flex}#cwh .tb{width:76px;height:76px;border-radius:50%;background:rgba(127,209,255,.55);border:3px solid #f6f1e3;font:900 15px/1 var(--ui);display:flex;align-items:center;justify-content:center;color:#16181c}
#cwh .tb.g{background:rgba(255,210,63,.6)}#cwh .tb.on{background:#7fd1ff}
#cwh .tally{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(20,24,30,.92);border:3px solid #2f6f8f;border-radius:18px;padding:18px 26px;min-width:380px;animation:cwIn .4s ease-out}
#cwh .tally h2{margin:0;font:900 40px/1 var(--ui);color:#ffd23f}#cwh .tally .sub{opacity:.75;font:600 15px/1.3 var(--ui);margin:4px 0 10px}
#cwh .tally .ln{display:flex;justify-content:space-between;font:700 18px/1.5 var(--ui)}#cwh .tally .tot{font:900 54px/1 var(--ui);color:#9fe58a;text-align:center;margin-top:8px}
@keyframes cwPulse{0%,100%{filter:none}50%{filter:brightness(1.35)}}
@keyframes cwBig{0%{opacity:0;transform:translate(-50%,-50%) scale(1.5)}20%{opacity:1;transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(.94)}}
@keyframes cwIn{from{opacity:0;transform:translate(-50%,-46%)}to{opacity:1;transform:translate(-50%,-50%)}}
@media (max-width:700px){#cwh .roster{bottom:auto;top:150px;left:8px;min-width:150px;font-size:12px}#cwh .roster .keys{display:none}#cwh .therm{right:8px;top:62%}#cwh .big{font-size:80px}#cwh .tally{min-width:300px;padding:14px}#cwh .touch{right:96px;bottom:96px}}
`;
let HUDL=null;
function hudMount(){if(HUDL)return HUDL;if(!document.getElementById('cwCss')){const st=document.createElement('style');st.id='cwCss';st.textContent=CSS;document.head.appendChild(st)}
  const r=document.createElement('div');r.id='cwh';const touch=window.matchMedia&&matchMedia('(pointer:coarse)').matches;if(touch)r.classList.add('touch');
  r.innerHTML='<div class="mk"></div><div class="fx"></div><div class="roster"><h4>Youth group</h4><div class="rows"></div><div class="keys"></div></div>'+
    '<div class="therm"><div class="tube"><b></b><i></i></div><div class="bulb"></div><div class="lab"></div><div class="g"></div></div><div class="touch"><div class="tb s">SPRAY</div><div class="tb g">GARY</div></div>';
  document.body.appendChild(r);
  const tS=r.querySelector('.tb.s'),tG=r.querySelector('.tb.g');tS.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();INPUT.touch=true;tS.classList.add('on')});
  const up=e=>{INPUT.touch=false;tS.classList.remove('on')};tS.addEventListener('pointerup',up);tS.addEventListener('pointercancel',up);tS.addEventListener('pointerleave',up);
  tG.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const a=A();if(a&&a.M&&a.M.cw)callGary(a.M)});
  HUDL={r,mk:r.querySelector('.mk'),fx:r.querySelector('.fx'),rows:r.querySelector('.roster .rows'),keys:r.querySelector('.roster .keys'),roster:r.querySelector('.roster'),therm:r.querySelector('.therm'),
    tube:r.querySelector('.therm .tube i'),tube0:r.querySelector('.therm .tube b'),tlab:r.querySelector('.therm .lab'),tg:r.querySelector('.therm .g'),pool:{},shown:{}};return HUDL}
function hudKill(){if(HUDL){HUDL.r.remove();HUDL=null}}
function hText(el,k,v){if(!HUDL||HUDL.shown[k]===v)return;HUDL.shown[k]=v;el.textContent=v}
function hHtml(el,k,v){if(!HUDL||HUDL.shown[k]===v)return;HUDL.shown[k]=v;el.innerHTML=v}
function poolEl(kind,i){const P=HUDL.pool[kind]||(HUDL.pool[kind]=[]);let e=P[i];if(!e){e=document.createElement('div');e.className=kind;HUDL.mk.appendChild(e);P[i]=e}e.style.display='';return e}
function poolHide(kind,from){const P=HUDL.pool[kind]||[];for(let i=from;i<P.length;i++)P[i].style.display='none'}
function at(el,p,dy){el.style.transform='translate('+p.x.toFixed(0)+'px,'+(p.y+(dy||0)).toFixed(0)+'px) translate(-50%,-100%)'}
function popAt(M,x,y,z,txt,sub,col){const C=cw(M);if(!HUDL)return;const d=document.createElement('div');d.className='pop';if(col)d.style.color=col;d.innerHTML=txt+(sub?'<small>'+sub+'</small>':'');HUDL.fx.appendChild(d);C.pops.push({el:d,x,y,z,t:1.6})}
function bigText(M,txt){if(!HUDL)return;const d=document.createElement('div');d.className='big';d.textContent=txt;HUDL.fx.appendChild(d);cw(M).pops.push({el:d,t:1,big:true})}
function hudTick(M,dt){if(!HUDL)return;const a=A(),C=cw(M),P=a.P,H=HUDL;const W=innerWidth,Ht=innerHeight;const vis=p=>!p.behind&&p.x>-60&&p.y>-60&&p.x<W+60&&p.y<Ht+60;
  /* car chips */let n=0;for(const c of C.cars){if(c.bay<0||!(c.st==='soap'||c.st==='rinse'||c.st==='dry'||c.st==='pull'))continue;const p=a.project(c.x,2.35,c.z);if(!vis(p))continue;const e=poolEl('chip',n++);at(e,p);
    const s=c.st,soapP=Math.round(c.soap*100),cl=Math.round(c.clean*100),dr=Math.round(c.dry*100);const key=c.id+'|'+s+'|'+(s==='soap'?soapP:s==='rinse'?cl+'|'+Math.round((c.foamLeft||0)*10):dr)+'|'+(c.free?1:0);
    if(e._k!==key){e._k=key;const st=(id,lab,on,dn,pc,cls)=>'<span class="st'+(on?' on '+cls:'')+(dn?' dn':'')+'">'+lab+(on?'<i style="width:'+pc+'%"></i>':'')+'</span>';
      e.innerHTML='<div class="who">'+c.cu.who+(c.free?' · "FREE"':'')+'</div><div class="steps">'+st('s','SOAP',s==='soap'||s==='pull',s!=='soap'&&s!=='pull',soapP,'s')+st('r','RINSE',s==='rinse',s==='dry',Math.min(100,cl/TUNE.needClean),'r')+st('d','DRY',s==='dry',false,dr,'d')+'</div>'+
        (s==='rinse'?'<div class="pc">'+cl+'% clean'+((c.foamLeft||0)>TUNE.foamLeft?' · rinse the suds':'')+'</div>':s==='soap'?'<div class="pc" style="color:#ffd23f">'+(C.kids.some(k=>k.st==='w'+c.bay)?'kids scrubbing · '+soapP+'%':'no kids here! send one, or hold E')+'</div>':s==='dry'?'<div class="pc" style="color:#c9a6ff">'+(C.kids.some(k=>k.st==='dry')?'drying · ':'nobody drying · hold E · ')+dr+'%</div>':'');
      e.classList.toggle('warn',s==='soap'&&!C.kids.some(k=>k.st==='w'+c.bay)||s==='dry'&&!C.kids.some(k=>k.st==='dry'))}}poolHide('chip',n);
  /* kid chips: near you, following you, or calling for water */n=0;for(const k of C.kids){const b=k.st.startsWith('w')?C.buckets[+k.st[1]]<=.01:false;if(!b&&C.follow!==k&&Math.hypot(k.x-P.pos.x,k.z-P.pos.z)>9&&C.phase!=='setup')continue;const p=a.project(k.x,1.95*(k.d.root.scale.y||1),k.z);if(!vis(p))continue;const e=poolEl('kid',n++);at(e,p);
    const key=k.name+k.st+(C.follow===k)+b;if(e._k!==key){e._k=key;e.innerHTML=k.name+' · <b>'+(C.follow===k?'following you':b?'bucket empty!':STN[k.st]?STN[k.st].short:'')+'</b>';e.classList.toggle('fol',C.follow===k);e.classList.toggle('alert',b)}}poolHide('kid',n);
  /* trouble markers */n=0;for(const t of C.trouble){if(t.done&&!(t.k==='thief'&&(t.st==='surr'||t.st==='walk')))continue;let x,z,lab;
    if(t.k==='kink'){if(C.hose.kink<0&&t.st!=='go')continue;const nd=C.rope.nodes[t.node];x=nd.x;z=nd.z;lab=t.st==='go'?'! COUPON BOY':'! KINK · hold E'}
    else if(t.k==='sign'){if(t.st==='leave'&&!C.signFree)continue;x=t.st==='leave'?SPOT.aframe.x:t.p.x;z=t.st==='leave'?SPOT.aframe.z:t.p.z;lab=t.st==='leave'?'! FREE?! · hold E':'! COUPON BOY'}
    else if(t.k==='mud'){if(t.st!=='go'&&t.st!=='throw')continue;x=t.p.x;z=t.p.z;lab='! MUD · soak him'}
    else if(t.k==='rival'){if(!C.rival||!C.rival.on)continue;x=SPOT.rsign.x;z=SPOT.rsign.z;lab='! COUPON WASH · spray the sign'}
    else if(t.k==='drive'){if(t.st!=='drive'||!t.car)continue;x=t.car.x;z=t.car.z;lab='! SPLASHER · spray him'}
    else if(t.k==='thief'){if(t.st==='go'||t.st==='gone'||t.st==='cuffed')continue;x=t.p.x;z=t.p.z;lab=t.st==='run'?'! CASH BOX · catch him':t.st==='surr'?(kidNear(C,t.p.x,t.p.z)<TUNE.kidR?'E · walk him away':'E · zip-tie'):'walk him away from the kids'}
    const p=a.project(x,2.3,z);if(!vis(p))continue;const e=poolEl('bad',n++);at(e,p);if(e._k!==lab){e._k=lab;e.textContent=lab}}poolHide('bad',n);
  /* station labels while a kid follows you */n=0;if(C.follow){for(const id of['w0','w1','dry','sign']){const s=stationPos(id),p=a.project(s.x,.9,s.z);if(!vis(p))continue;const e=poolEl('stn',n++);at(e,p);if(e._k!==id){e._k=id;e.textContent='E · '+STN[id].label}}}poolHide('stn',n);
  /* bubbles and popups */for(const b of C.bub){b.t-=dt;const x=b.p.d?b.p.x:b.p.x,z=b.p.z,y=b.p.y||2.15;const p=a.project(x,y,z);if(b.t<=0||!vis(p))b.el.style.display='none';else{b.el.style.display='';at(b.el,p,-4)}if(b.t<=0)b.el.remove()}C.bub=C.bub.filter(b=>b.t>0);
  if(C.bub.length>7){const old=C.bub.shift();old.el.remove()}
  for(const q of C.pops){q.t-=dt;if(!q.big){const p=a.project(q.x,q.y+(1.6-q.t)*.5,q.z);if(p.behind)q.el.style.display='none';else{q.el.style.display='';q.el.style.transform='translate('+p.x.toFixed(0)+'px,'+p.y.toFixed(0)+'px) translate(-50%,-50%)';q.el.style.opacity=Math.min(1,q.t*1.5)}}if(q.t<=0)q.el.remove()}C.pops=C.pops.filter(q=>q.t>0);
  /* roster */const rows=C.kids.map(k=>'<div class="r"><span>'+k.name+'</span><span>'+(C.follow===k?'with you':STN[k.st]?STN[k.st].short:'')+'</span></div>').join('');hHtml(H.rows,'rows',rows);
  const keys=(C.hose.held?'<kbd>LMB</kbd>/<kbd>R</kbd> hold: spray<br>':'<kbd>E</kbd> grab the hose<br>')+'<kbd>E</kbd> on a kid, then <kbd>E</kbd> at a station<br>'+(C.phase==='open'?'<kbd>G</kbd> call Gary · '+C.gary.left+' left':'');hHtml(H.keys,'keys',keys);
  hudShow(H.roster,C.phase!=='load'&&C.phase!=='tally'&&!a.CV);
  const pl=plan(),g=goalOf(pl.raised),tot=pl.raised+C.raised;H.tube.style.height=(clamp(tot/g.goal,0,1)*100).toFixed(1)+'%';H.tube0.style.height=(clamp(pl.raised/g.goal,0,1)*100).toFixed(1)+'%';
  hText(H.tlab,'tl',money(tot));hText(H.tg,'tg','of '+money(g.goal)+' · '+g.label.replace('The youth center ','').replace(' for every kid',''));hudShow(H.therm,C.phase!=='load'&&C.phase!=='tally')}
function hudShow(el,on){if(!HUDL)return;const k='show'+(el.className||'');if(HUDL.shown[k]===on)return;HUDL.shown[k]=on;el.style.display=on?'':'none'}
function showTally(M){if(!HUDL)return;const C=cw(M);const pl=plan(),g=goalOf(pl.raised),tot=pl.raised+C.raised;const el=document.createElement('div');el.className='tally';
  const ln=(k,v)=>'<div class="ln"><span>'+k+'</span><b>'+v+'</b></div>';
  el.innerHTML='<h2>Suds Up</h2><div class="sub">Pastor Dee counts the cash box'+(C.boxLost?' (what\'s left of it)':'')+'</div>'+ln('Cars washed',C.carsDone)+ln('Spotless',C.spotless)+ln('Tips',money(C.tips))+(C.free?ln('"Free" washes',C.free):'')+ln('Trouble stopped',C.troubleStopped+(C.troubleWon?' · '+C.troubleWon+' got through':''))+
    '<div class="tot">'+money(C.raised)+'</div><div class="sub" style="text-align:center">Thermometer: '+money(tot)+' of '+money(g.goal)+'</div>';HUDL.fx.appendChild(el);C.tallyEl=el}

/* ================= input: hold the left mouse button (or R) to spray; G calls Gary ================= */
const INPUT={lmb:false,r:false,touch:false,ping:-1,bound:false};
function live(){const a=A();return a&&a.mode==='mission'&&a.M&&a.M.def&&a.M.def.id===ID&&a.M.state==='go'&&a.M.cw}
function bindInput(){if(INPUT.bound)return;INPUT.bound=true;
  document.addEventListener('mousedown',e=>{if(e.button===0&&live())INPUT.lmb=true},true);addEventListener('mouseup',e=>{if(e.button===0)INPUT.lmb=false},true);addEventListener('blur',()=>{INPUT.lmb=INPUT.r=false});
  document.addEventListener('keydown',e=>{if(!live())return;const k=(e.key||'').toLowerCase();if(k==='r'){INPUT.r=true;e.stopPropagation()}else if(k==='g'&&!e.repeat){callGary(A().M);e.stopPropagation()}},true);
  document.addEventListener('keyup',e=>{const k=(e.key||'').toLowerCase();if(k==='r')INPUT.r=false},true)}
/* the hose as the job's held item: a click (or a touch-fire held) reaches use() through the game's fire path */
J.item('cw_hose',{name:'Hose',use(M){const C=M&&M.cw;if(!C)return;INPUT.ping=C.t}});

/* ================= per frame ================= */
function upd(dt,M,F){const a=A(),C=cw(M),P=a.P;if(!C)return;C.t=(C.t||0)+dt;C.dt=dt;
  if(!HUDL)hudMount();bindInput();tuftsHide(dt);
  if(P.dude&&P.dude.gun)a.equip(P.dude,null);
  if(C.phase==='load'){loadTick(M,dt,F);hudTick(M,dt);return}
  /* spraying: LMB / R held, the touch button, or the fire path pinged this frame */
  const H=C.hose;H.spray=!!(H.held&&(INPUT.lmb||INPUT.r||INPUT.touch||C.botSpray||(C.t-INPUT.ping)<.12));M.item=H.held?'cw_hose':null;
  if(C.canopy){const cp=a.camera.position,inC=Math.abs(cp.x-SPOT.table.x)<1.75&&Math.abs(cp.z-SPOT.table.z)<1.75&&cp.y<2.9;for(const ch of C.canopy.children)if(ch.position.y>2)ch.visible=!inC}
  ropeTick(M,dt);streamTick(M,dt);wetTick(C,dt);kidTick(M,dt);
  /* Dee */if(C.dee){npcPose(C.dee.d,dt,{});const dd=Math.hypot(P.pos.x-C.dee.x,P.pos.z-C.dee.z);if(dd<9)turnTo(C.dee,P.pos.x,P.pos.z,dt,2)}
  if(C.talk){C.talk.t-=dt;if(C.talk.t<=0)C.talk.done(0)}
  if(C.phase==='setup')setupTick(M,dt,F);
  else if(C.phase==='open')openTick(M,dt,F);
  else if(C.phase==='over'||C.phase==='tally')overTick(M,dt,F);
  for(const c of C.cars)carState(M,c,dt);C.cars=C.cars.filter(c=>!c.freed);
  troubleTick(M,dt);garyTick(M,dt);
  if(C.phase!=='over'&&C.phase!=='tally')interact(M,F);
  hudTick(M,dt);
  F.widgets.push({id:'cw-clock',kind:'timer',label:C.phase==='setup'?'Setup':'Shift',v:C.phase==='setup'?TUNE.shift:Math.max(0,C.clock),hot:C.phase==='open'&&C.clock<=15});
  F.widgets.push({id:'cw-raised',kind:'score',label:'Raised $',v:Math.round(C.raised)});F.widgets.push({id:'cw-cars',kind:'score',label:'Cars',v:C.carsDone});
  if(H.kink>=0&&H.held)F.meters.push({id:'cw-press',label:'Water pressure',v:kinkPress(C),max:1,style:'bar',warn:.5,warnBelow:true,sub:'kinked hose'})}
function loadTick(M,dt,F){const C=cw(M),pp=PP();C.loadT=(C.loadT||0)+dt;F.objs.push(['Setting up the car wash…',false]);
  const want=['dee','nb_teen','nb_kid'];const ready=!pp||want.every(k=>pp.has&&pp.has(k));if(!C.asked&&pp&&pp.preload){C.asked=1;try{pp.preload(want.concat(CAST_KEYS())).catch(()=>{})}catch(_){}}
  if(ready||C.loadT>20){people(M);C.phase=C.startPhase||'setup';if(C.phase==='setup'){LINES.hi.forEach(([w,t],i)=>A().radio(w,t,i===0));music('hub',{intensity:.4})}else openShift(M,true)}}
function setupTick(M,dt,F){const a=A(),C=cw(M),H=C.hose,P=a.P;
  if(C.tut===0){F.objs.push(['Grab the hose off the reel by the church wall · E',false]);F.target={x:SPOT.reel.x,z:SPOT.reel.z,label:'Hose reel'};if(H.held){C.tut=1;a.radio('dee',LINES.hose,true)}}
  else if(C.tut===1){const b0=C.buckets[0]>=.9,b1=C.buckets[1]>=.9;F.objs.push(['Fill both buckets: aim at a bucket, hold Left Mouse (or R) · '+((b0?1:0)+(b1?1:0))+'/2',b0&&b1]);
    const t=!b0?SPOT.bucket[0]:SPOT.bucket[1];F.target={x:t.x,z:t.z,label:'Bucket'};if(!H.held)F.objs.push(['Pick the hose back up · E',false,'warn']);
    if(b0&&b1){C.tut=2;a.radio('dee',LINES.buckets,true)}C.tutT=(C.tutT||0)+dt;if(C.tutT>40&&!C.said.tutHelp){C.said.tutHelp=1;a.radio('dee',"Point the crosshair right at the orange bucket and hold the button. The water goes where you look.",true)}}
  else if(C.tut===2){const j=C.kids.find(k=>k.id==='jaylen');F.objs.push(C.follow===j?['Send Jaylen to the kerb with the sign · E at the SIGN spot',false]:['Get Jaylen: walk up and press E',false]);
    F.target=C.follow===j?{x:SPOT.sign.x,z:SPOT.sign.z,label:'Sign spot'}:{x:j.x,z:j.z,label:'Jaylen'}}
  else if(C.tut===3){openShift(M)}
  F.objs.push(['Kids soap and scrub. You rinse with the hose. Kids dry.',false])}
function openShift(M,fromCP){const a=A(),C=cw(M);C.phase='open';C.clock=TUNE.shift;C.nextCar=fromCP?3:2.5;if(!fromCP)a.CP.mark('wash');
  bigText(M,'OPEN!');SFX.open();a.radio('Jaylen',LINES.open[1],true);music('tension',{intensity:.35});C.evI=0}
function openTick(M,dt,F){const a=A(),C=cw(M);C.clock-=dt;const el=TUNE.shift-C.clock;
  /* arrivals */C.nextCar-=dt*(C.kids.some(k=>k.st==='sign'&&Math.hypot(k.x-SPOT.sign.x,k.z-SPOT.sign.z)<1)?1/TUNE.signMul:1)*(C.signFree?1/TUNE.freeMul:1);
  if(C.nextCar<=0&&C.clock>18){const R=rng(C.seed+C.ci*31);C.nextCar=C.sc.gap+R()*5;const inLine=C.cars.filter(c=>c.st==='queue'||c.st==='arrive').length;
    if(inLine>=TUNE.queueMax){C.passed=(C.passed||0)+1}else if(C.rival&&C.rival.on&&R()<.42){rivalCar(M)}else spawnCar(M)}
  queueTick(M,dt);
  /* trouble on schedule */const ev=C.sc.ev;while(C.evI<ev.length&&el>=ev[C.evI].t){startTrouble(M,ev[C.evI].k);C.evI++}
  if(C.rival&&!C.rival.on&&C.rival.closeT!=null){C.rival.closeT+=dt;const t=C.trouble.find(t=>t.k==='rival');if(C.rival.closeT>1.5&&C.rivalSet.rv.visible&&C.rival.closeT>8){C.rivalSet.rv.visible=false;C.rivalSet.rs.visible=false}}
  /* clock */const sec=Math.ceil(C.clock);if(sec<=10&&sec>=1&&sec<C.tick){C.tick=sec;SFX.tick(sec<=3)}if(C.clock<=10&&!C.said.ten){C.said.ten=1;a.radio('dee',LINES.ten,true);intensity(1)}
  const busy=C.cars.filter(c=>c.bay>=0&&c.st!=='leave').length+C.cars.filter(c=>c.st==='queue').length*.5+C.trouble.filter(t=>!t.done).length;intensity(Math.min(1,.25+busy*.12));
  objectives(M,F);
  if(C.clock<=0){C.phase='over';C.overT=0;SFX.whistle();bigText(M,'TIME!');a.radio('dee',LINES.time,true);music('hub',{intensity:.35});
    /* cars still in the bays get finished as they are (the kids hurry) */}}
function rivalCar(M){const a=A(),C=cw(M);const c=spawnCar(M);if(!c)return;c.st='rival';c.path=[{x:SPOT.rival.x+3,z:SPOT.far},{x:SPOT.rival.x,z:SPOT.far,stop:14},{x:280,z:SPOT.far}];c.yaw=Math.PI;C.lostRival=(C.lostRival||0)+1;
  say(M,{x:c.x,z:c.z,y:2.2},pick(LINES.rivalGo),2.4)}
function objectives(M,F){const a=A(),C=cw(M),H=C.hose,P=a.P;
  const bays=[0,1].map(b=>C.cars.find(c=>c.bay===b&&c.st!=='leave'&&c.st!=='gone'&&c.st!=='pay'));
  const thief=C.thief&&!['gone','cuffed'].includes(C.thief.st)&&C.thief.st!=='go'&&C.thief.st!=='grab'?C.thief:null;
  if(thief){F.objs.push([thief.st==='run'?'Kev has the cash box! Catch him (run into him) or soak him':thief.st==='surr'?(kidNear(C,thief.p.x,thief.p.z)<TUNE.kidR?'Walk him away from the kids · E':'Zip-tie him · E'):'Walk him at least '+TUNE.kidR+' m from the kids, then E',false,'warn']);F.target={x:thief.p.x,z:thief.p.z,label:'Kev'};}
  if(!H.held)F.objs.push(['Pick up the hose · E',false,'warn']);
  const need=bays.filter(c=>c&&c.st==='rinse').sort((p,q)=>p.id-q.id)[0];
  if(need){F.objs.push(['Rinse '+need.cu.who+"'s car · "+Math.round(need.clean*100)+'% clean (need '+Math.round(TUNE.needClean*100)+')',false]);if(!F.target)F.target={x:need.x,z:need.z+3.2,label:'Rinse'}}
  for(let b=0;b<2;b++){if(C.buckets[b]<.12&&bays[b]&&bays[b].st==='soap'&&C.kids.some(k=>k.st==='w'+b)){F.objs.push(['Bay '+(b+1)+' bucket is empty: spray it full',false,'warn']);if(!F.target)F.target={x:SPOT.bucket[b].x,z:SPOT.bucket[b].z,label:'Bucket'}}}
  for(let b=0;b<2;b++)if(bays[b]&&bays[b].st==='soap'&&!C.kids.some(k=>k.st==='w'+b))F.objs.push(['Nobody on bay '+(b+1)+': send a kid (E on a kid, E at the bay) or hold E to scrub',false,'warn']);
  if(C.cars.some(c=>c.st==='dry')&&!C.kids.some(k=>k.st==='dry'))F.objs.push(['Nobody drying: send a kid to the drying spot, or hold E at the car',false,'warn']);
  const tr=C.trouble.filter(t=>!t.done&&t.k!=='thief');for(const t of tr){if(t.k==='kink'&&C.hose.kink>=0){F.objs.push(['Hose kinked: hold E on the kink',false,'warn']);if(!F.target){const n=C.rope.nodes[t.node];F.target={x:n.x,z:n.z,label:'Kink'}}}
    if(t.k==='sign'&&C.signFree){F.objs.push(['The sign says FREE: hold E at the sign to fix it',false,'warn'])}if(t.k==='rival'&&C.rival&&C.rival.on)F.objs.push(['Coupon Wash is stealing customers: spray their sign, have a word (E), or call Gary (G)',false,'warn']);
    if(t.k==='mud'&&t.st==='go')F.objs.push(['Coupon Boy with a mud bucket: soak him or have a word',false,'warn']);if(t.k==='drive'&&t.st==='drive')F.objs.push(['A car is aiming for the gutter puddle: spray the windshield',false,'warn'])}
  if(!F.objs.length||F.objs.every(o=>o[1]))F.objs.push(['Keep the cars moving · '+C.carsDone+' washed',false]);if(F.objs.length>4)F.objs.length=4}
function overTick(M,dt,F){const a=A(),C=cw(M);C.overT+=dt;F.objs.push(['Time! Dee is counting the cash box',false]);
  /* anyone mid-wash gets finished as they are */if(!C.flushed){C.flushed=true;for(const c of C.cars){if(c.bay>=0&&(c.st==='rinse'||c.st==='dry')&&c.clean>.6){c.dry=Math.max(c.dry,.5);finishCar(M,c)}}
    const t=C.thief;if(t&&(t.st==='run')){t.st='gone';t.p.d.root.visible=false}}
  if(C.overT>2.2&&C.phase==='over'){C.phase='tally';C.tallyT=4.2;tally(M)}
  if(C.phase==='tally'){C.tallyT-=dt;if(C.tallyT<=0)finish(M)}}
function tally(M){const a=A(),C=cw(M),s=SV(),pl=plan(s),n=Math.round(C.raised);M.score=n;showTally(M);
  a.radio('dee',n<TUNE.bronze?LINES.tally.bad:n<TUNE.gold?LINES.tally.ok:LINES.tally.great,true);if(C.carsDone>=8)a.radio('Jaylen',"Can we do this every Saturday? Like, forever?");}
function finish(M){const a=A(),C=cw(M);if(C.ending)return;C.ending=true;const n=Math.round(C.raised);
  if(n>=TUNE.bronze)a.endMission(true);else a.endMission(false,"Pastor Dee: "+money(n)+". That's a lemonade stand, not a car wash. Same time next Saturday?",'Not enough to count.')}

/* ---------- interactions: E prompts (taps and holds) ---------- */
function interact(M,F){const a=A(),C=cw(M),P=a.P,H=C.hose;if(a.CV)return;
  const thief=C.thief;
  if(thief&&thief.st==='surr'){const near=kidNear(C,thief.p.x,thief.p.z)<TUNE.kidR;F.taps.push({x:thief.p.x,z:thief.p.z,r:2.4,txt:near?'Walk him away from the kids':'Zip-tie him',fn:()=>{if(near){thief.st='walk';a.radio('you',LINES.zipNear,true);a.radio('Kev',LINES.bad.walk)}else cuffThief(M)}})}
  if(thief&&thief.st==='walk'){if(kidNear(C,thief.p.x,thief.p.z)>=TUNE.kidR)F.holds.push({x:thief.p.x,z:thief.p.z,r:2.6,o:thief,txt:'Zip-tie him',time:.7,fn:()=>cuffThief(M)});}
  if(thief&&thief.boxDrop&&!C.box){const b=thief.boxDrop;F.taps.push({x:b.x,z:b.z,r:1.8,txt:'Pick up the cash box',fn:()=>returnBox(M)})}
  /* the hose */
  if(!H.held){const N=C.rope.nodes,L=N[N.length-1];const atReel=Math.hypot(P.pos.x-SPOT.reel.x,P.pos.z-SPOT.reel.z)<2.2,atEnd=Math.hypot(P.pos.x-L.x,P.pos.z-L.z)<2;
    if(atReel||atEnd)F.taps.push({x:atEnd?L.x:SPOT.reel.x,z:atEnd?L.z:SPOT.reel.z,r:2.2,txt:'Grab the hose',fn:()=>{H.held=true;H.dropped=false;nozzleOn(M,true);SFX.pick()}});
    if(!F.target&&C.phase==='open')F.target={x:L.x,z:L.z,label:'Hose'}}
  /* kink */if(H.kink>=0){const n=C.rope.nodes[H.kink];F.holds.push({x:n.x,z:n.z,r:2.4,o:C.trouble.find(t=>t.k==='kink')||H,txt:'Fix the kink',time:.8,fn:()=>{fixKink(M);a.radio('you',"There. Straight as Gary's posture.",true)}})}
  /* sign */if(C.signFree){const s=SPOT.aframe;F.holds.push({x:s.x,z:s.z,r:2,o:C.aframe,txt:'Swap the sign back to $5',time:1,fn:()=>{setFree(M,false);const t=C.trouble.find(t=>t.k==='sign');if(t){t.done=true;if(!t.counted)C.troubleStopped++}a.radio('you',"Five dollars. Like it says. Now.",true);SFX.good()}})}
  /* kids: E picks one up, E at a station sends them */
  if(C.follow){let best=null,bd=2.6;for(const id of['w0','w1','dry','sign']){const s=stationPos(id),d=Math.hypot(P.pos.x-s.x,P.pos.z-s.z);if(d<bd){bd=d;best=id}}
    for(const id in C.rings)C.rings[id].visible=true;
    if(best){const k=C.follow;F.taps.push({d:0,r:1,txt:'Send '+k.name+' to: '+STN[best].label,fn:()=>sendKid(M,k,best)})}
    else{const k=C.follow;F.taps.push({x:k.x,z:k.z,r:1.6,txt:'Never mind, '+k.name+' (back to '+(STN[k.prev]?STN[k.prev].short:'the table')+')',fn:()=>sendKid(M,k,k.prev||'table')})}}
  else for(const id in C.rings)C.rings[id].visible=false;
  for(const k of C.kids){if(k===C.follow)continue;F.taps.push({x:k.x,z:k.z,r:1.9,txt:k.name+': come with me',fn:()=>{if(C.follow){C.follow.st=C.follow.prev||'table'}k.prev=k.st;k.st='follow';C.follow=k;say(M,k,pick(LINES.kidFollow),1.8);SFX.pick()}})}
  /* help: scrub or dry a car yourself (hold E) */
  for(const c of C.cars){if(c.bay<0)continue;const d=Math.hypot(P.pos.x-c.x,P.pos.z-c.z);if(d>3.6)continue;
    /* the hold bar shows the car's own progress; the work itself goes in through handWork() */
    if(c.st==='soap'){c.prog=c.soap;F.holds.push({x:c.x,z:c.z,r:3.6,o:c,txt:'Scrub '+c.cu.who+"'s car",time:1e6,fn:()=>{}})}
    if(c.st==='dry'){c.prog=c.dry;F.holds.push({x:c.x,z:c.z,r:3.6,o:c,txt:'Dry '+c.cu.who+"'s car",time:1e6,fn:()=>{}})}}
  /* the troublemakers: have a word */for(const t of C.trouble){if(t.done||!t.p||t.soaked||t.talked||t.k==='thief')continue;const p=t.k==='rival'?t.p:t.p;if(Math.hypot(P.pos.x-p.x,P.pos.z-p.z)<2.4)F.taps.push({x:p.x,z:p.z,r:2.4,txt:'Have a word',fn:()=>talkTo(M,t)})}
  handWork(M,cw(M).dt||1/30)}
function handWork(M,dt){/* while E is held on a car, the work goes into the car (the hold itself never completes on its own) */const a=A(),C=cw(M),P=a.P;if(!a.keys.e||a.CV)return;
  let best=null,bd=3.6;for(const c of C.cars){if(c.bay<0||(c.st!=='soap'&&c.st!=='dry'))continue;const d=Math.hypot(P.pos.x-c.x,P.pos.z-c.z);if(d<bd){bd=d;best=c}}if(!best)return;
  if(best.st==='soap'){best.soap=Math.min(1,best.soap+TUNE.youScrub*dt);C.handT=(C.handT||0)-dt;if(C.handT<=0){C.handT=.5;gesture(P.dude);if(best.S){const l=toLocal(best,P.pos.x,1,P.pos.z),pr=best.S.pr,u=clamp((l.x-pr.min.x)/pr.size.x,0,1);addFoam(best.S,Math.abs(l.z)>pr.size.z*.45?(l.z>0?1:2):3,Math.max(0,u-.2),Math.min(1,u+.2),20,Math.random);addFoam(best.S,0,Math.max(0,u-.2),Math.min(1,u+.2),10,Math.random)}}}
  else{best.dry=Math.min(1,best.dry+TUNE.youDry*dt);C.handT=(C.handT||0)-dt;if(C.handT<=0){C.handT=.45;gesture(P.dude);SFX.squeak()}}
}
function cuffThief(M){const a=A(),C=cw(M),t=C.thief;if(!t)return;t.st='cuffed';C.cuffs++;M.cuffs=(M.cuffs||0)+1;a.radio('you',LINES.zip,true);a.addTrust(TUNE.trustCuff,'river');a.feed('Zip-tied','cuff','+'+TUNE.trustCuff+' trust');SFX.good();if(!C.box)returnBox(M)}
function returnBox(M){const a=A(),C=cw(M);if(C.box)return;C.box=true;const bm=C.boxMesh;if(bm.parent)bm.parent.remove(bm);bm.position.set(-.45,.76,0);bm.rotation.set(0,0,0);if(C.tableG)C.tableG.add(bm);else{a.wmAdd(bm);bm.position.set(SPOT.table.x-.45,.76,SPOT.table.z)}
  a.radio('dee',LINES.box.back,true);if(C.thief)C.thief.boxDrop=null;SFX.cash()}

/* ================= free roam: the thermometer stays on the lawn; the van and the banner when the goals are met ================= */
let PERS=null;
function persistTick(dt){const a=A();if(!a)return;const s=SV();const near=a.mode==='hub'&&a.L&&a.L.ow&&s&&Math.hypot(a.P.pos.x-331,a.P.pos.z-36)<110;const pl=near?plan(s):null;const want=near&&pl&&(pl.runs>0||pl.raised>0);
  if(!want){if(PERS){for(const o of PERS.objs)if(o.parent)o.parent.remove(o);disposeRes(PERS.res);PERS=null}return}
  if(PERS&&(PERS.L!==a.L||PERS.raised!==pl.raised)){for(const o of PERS.objs)if(o.parent)o.parent.remove(o);disposeRes(PERS.res);PERS=null}
  if(!PERS){const keep=RES;RES=null;const objs=[];try{const th=thermoModel();th.g.position.set(SPOT.thermo.x,0,SPOT.thermo.z);th.g.rotation.y=.35;a.L.group.add(th.g);objs.push(th.g);const g=goalOf(pl.raised);drawThermo(th,pl.raised,0,g.goal,g.label,g.done);
      if(pl.raised>=TUNE.goals[0]){const V=window.HT&&HT.Vehicles;let van=null;try{van=V&&V.make?V.make('workvan',{color:'#f4f1ea',lod:1}):a.makeVehicle('workvan','#f4f1ea')}catch(_){van=null}
        if(van){van.position.set(316.6,0,30.5);van.rotation.y=Math.PI/2;a.L.group.add(van);objs.push(van);if(van.userData&&van.userData.dispose)R_own(van);
          const tex=canvasTex(512,128,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#2f6f8f';c.textAlign='center';c.font='900 54px '+uiFont();c.fillText('RIVERSIDE',w/2,56);c.font='800 40px '+uiFont();c.fillStyle='#c0392b';c.fillText('YOUTH CENTER',w/2,104)});
          for(const sd of[-1,1]){const p=plane(2.6,.65,tex,0,1.25,sd*1.02,null,sd<0?Math.PI:0,{tr:true});van.add(p)}}}
      if(pl.raised>=TUNE.goals[1]){const b=bannerModel();b.position.set(330,5.4,31.85);a.L.group.add(b);objs.push(b)}}catch(e){console.warn('carwash persist',e)}PERS={L:a.L,raised:pl.raised,objs,res:RES};RES=keep}}
/* lifecycle: the HUD layer, the hose sound and the resources go when the job ends (won, failed, quit, retried, replayed) */
let WAS=false;
J.on('pose',dt=>{const a=A();if(!a)return;const M=a.M,mine=!!(M&&M.def&&M.def.id===ID&&M.cw&&a.mode==='mission');
  if(mine&&M.state==='go'){WAS=true;return}
  if(mine&&M.state!=='go'){if(HUDL)HUDL.r.style.display='none';if(M.cw.talk){try{a.overlay('cw-talk',null)}catch(_){}M.cw.talk=null}hoseSoundKill();INPUT.lmb=INPUT.r=INPUT.touch=false;resultCard(M);return}
  if(WAS||HUDL){WAS=false;hudKill();hoseSoundKill();INPUT.lmb=INPUT.r=INPUT.touch=false}if(TUFT.saved.length&&!mine)tuftsRestore()
  if(RES&&!mine)disposeRes();persistTick(dt||1/60)});
/* the result card: a fundraiser's numbers */
const HEADS=['Not enough to count. The kids had fun, though.','A good, wet Saturday.','Somebody hug the hose guy.','The best Saturday this lot has ever seen.'];
function resultCard(M){if(M.resDone||typeof document==='undefined')return;const r=document.querySelector('.ht-result .col');if(!r)return;M.resDone=true;const C=M.cw;
  const h=r.querySelector('h2');if(h)h.textContent=M.state==='won'?HEADS[clamp(M.medal||1,1,3)]:HEADS[0];
  const cells=[...r.querySelectorAll('.ht-stats > div')];const set=(d,k,v,sub)=>{if(!d)return;d.innerHTML='';const b=document.createElement('b'),sp=document.createElement('span');b.textContent=k;sp.className='ht-num';sp.textContent=v;d.appendChild(b);d.appendChild(sp);if(sub){const sm=document.createElement('small');sm.textContent=sub;d.appendChild(sm)}};
  const by=k=>cells.find(d=>{const b=d.querySelector('b');return b&&b.textContent.trim().toLowerCase()===k});const pl=plan(),g=goalOf(pl.raised);
  set(by('neutralized'),'Raised',money(C.raised),'for the youth group');set(by('zip-tied'),'Cars washed',String(C.carsDone),C.spotless?C.spotless+' spotless':'');set(by('time'),'Trouble',C.troubleStopped+' stopped',C.troubleWon?C.troubleWon+' got through':'nothing got through');
  set(by('trust'),'Thermometer',money(pl.raised+(M.replay?0:0)),g.done?'goal met: '+g.label:'of '+money(g.goal)+' · '+g.label)}

/* ================= register ================= */
J.register(ID,{
  def:{giver:'dee',hood:'river',title:'Suds Up',role:'Pastor Dee · Youth group car wash',place:'Riverside Community Church lawn, 2nd St',
    lines:["Saturday car wash. The youth group is raising money for a van. And the van is raising money for a smaller van. It's complicated.",
      "Five dollars a car. Ten if they want the inside. Nobody wants the inside. The kids do the soap. You do the hose.",
      "The Coupon Boys have been 'helping' all morning. No guns. There are kids here. You've got a hose, a word, and Gary."],
    obj:'Run the car wash for four minutes. Kids soap and dry, you rinse with the hose. Keep the Coupon Boys from ruining it. Raise $'+TUNE.bronze+' to count.',
    crew:[],weapons:[],noGuns:"No guns. Not here. Not with kids around. You've got a hose.",
    start:{x:SPOT.ring.x,z:SPOT.ring.z},
    unlock:{done:['crossing'],when:()=>{/* SPEC3 3.3: after Crossing Guard; the first run any day, then Saturdays (day 1 is a Saturday) */const s=SV();if(!s)return true;const r=s.jobs&&s.jobs[ID];if(!r||!r.runs)return true;return((s.day||1)-1)%7===0}},
    repeatable:true,pay:40,par:0,winTrust:0,roam:false,order:95,stages:['setup','wash'],stageLabels:{setup:'Setting up',wash:'The car wash'},failPolicy:'soft',
    medals:['Raise $'+TUNE.bronze+' (it counts)','Raise $'+TUNE.silver,'Raise $'+TUNE.gold+' and let no trouble through'],
    radio:[['dee',"We're on the church lawn. Park on Ash St, the kids are already soapy."]],
    endLine:"The thermometer went up. The kids are soaked. Somebody's car still says WASH ME, faintly, and that's okay."},
  start(M,o){if(RES)disposeRes();hudKill();const C=newState(M,(o&&o.checkpoint&&o.checkpoint.job&&o.checkpoint.job.seed)||((Math.random()*1e9)>>>0));M.score=0;M.noCars=false;setup(M);
    const a=A();if(a.P.dude)a.equip(a.P.dude,null);if(!o||!o.checkpoint)music('hub',{intensity:.3})},
  upd,
  save:M=>{const C=M.cw||{};return{seed:C.seed>>>0,stage:C.phase==='open'||C.phase==='over'||C.phase==='tally'||C.startPhase==='open'?'wash':'setup'}},
  load(M,s){const C=M.cw;if(!C||!s)return;if((s.seed>>>0)!==C.seed){const nc=newState(M,s.seed>>>0);nc.thermo=C.thermo;nc.rope=C.rope;nc.drops=C.drops;nc.wet=C.wet;nc.rings=C.rings;nc.rivalSet=C.rivalSet;nc.bayCol=C.bayCol;nc.bk=C.bk;nc.aframe=C.aframe;nc.reel=C.reel;nc.boxMesh=C.boxMesh}
    const N=M.cw;if(s.stage==='wash'){N.startPhase='open';N.buckets=[1,1];N.bk.forEach(b=>setBucket(b,1));N.hose.held=true;nozzleOn(M,true);N.tut=4;
      for(const k of KIDS)k._st=k.id==='jaylen'?'sign':k.st}},
  payout(M,ok){const C=M.cw;if(!C)return[];const l=[['Raised for the youth group · '+money(C.raised)+' (it all goes on the thermometer)',0]];if(ok)l.push(["Dee's gas money · "+C.carsDone+' cars',Math.min(60,C.carsDone*4)]);
    if(C.cuffs)l.push(['Kev zip-tied, away from the kids',0]);return l},
  medal:M=>{const C=M.cw;if(!C)return 1;const n=C.raised;return n>=TUNE.gold&&!C.troubleWon?3:n>=TUNE.silver?2:1},
  end(M,ok){const C=M.cw,s=SV();if(!C||!s)return;const pl=plan(s),before=pl.raised;pl.raised=Math.round(before+C.raised);pl.runs=(pl.runs|0)+1;pl.best=Math.max(pl.best|0,Math.round(C.raised));
    for(const g of TUNE.goals)if(before<g&&pl.raised>=g){try{A().banner(g===TUNE.goals[0]?'THE YOUTH CENTER VAN':'SUMMER CAMP','The thermometer hit '+money(g)+'. Riverside did that.',3.2)}catch(_){}if(g===TUNE.goals[0]){s.flags=s.flags||{};s.flags.youthVan=true}}
    try{if(HT.Save.touch)HT.Save.touch('jobs','flags')}catch(_){}},
  pose(dt){const a=A(),M=a&&a.M,C=M&&M.cw;if(!C||!C.hose||!C.hose.held||a.CV||a.P.fp)return;aimArm(a,C)},
  hud(state){state.weapon=null;state.weapons=[];if(state.crosshair){const C=A().M&&A().M.cw;state.crosshair.hidden=!(C&&C.hose.held);state.crosshair.noFire=false}},
  dev:{spawnCar:M=>spawnCar(M),cleanOf,eraseAt,aimPoint,profile:t=>PROF[t],setBayCol,BAY,SPOT,TUNE,quad:S=>{const G=S.grid,o=[];for(let q=0;q<4;q++){const ox=(q===1||q===3)?32:0,oy=q>=2?32:0;let s=0;for(let y=0;y<32;y++)for(let x=0;x<32;x++)s+=G[(oy+y)*64+ox+x];o.push(Math.round(s))}return o}},
  test:{give(a){const pp=PP();if(pp&&pp.preload)try{pp.preload(['dee','nb_teen','nb_kid','thug_cap','thug_jacket','thug_hoodie','dad_gary'].concat(custKeys(CUST))).catch(()=>{})}catch(_){}
      if(a.mode==='hub'&&window.__ht&&window.__ht.enterHub)window.__ht.enterHub()},
    step:(a,t,o)=>bot(a,t,o),sample:()=>({cw:{seed:4242},stage:'setup'})}
});
/* kids' stations after a checkpoint retry: Jaylen is on the sign (load() runs before the people exist; people() reads it) */
const _people=people;people=function(M){_people(M);for(const k of M.cw.kids){const d=KIDS.find(q=>q.id===k.id);if(d&&d._st&&M.cw.startPhase==='open'){k.st=d._st;kidTool(k,k.st==='sign'?'sign':k.st==='dry'?'dry':'sponge');const p=stationPos(k.st);k.x=p.x;k.z=p.z;k.d.root.position.set(k.x,0,k.z)}}for(const q of KIDS)delete q._st};

/* ================= the scripted player (dev/jobs-check.js, dev/jobs/carwash.js) =================
   Plays like a person: walks (real keys), turns toward what it wants, aims the crosshair (yaw/pitch) at a spot and holds the spray,
   sweeps each side of a car from where a person would stand, refills buckets, sends kids, soaks the troublemakers, catches Kev.
   o.fail: grabs the hose and fills the buckets, then just stands there admiring the thermometer. */
function bot(a,t,o){const M=a.M,P=a.P,k=a.keys;o=o||{};if(!M||M.state!=='go'||!M.cw)return null;const C=M.cw;const B=C.bot||(C.bot={tgt:null,aimT:0,sweep:0,stuck:0,px:0,pz:0});
  const stop=()=>{k.w=k.shift=false};C.botSpray=false;
  if(a.CV){stop();if(t%10===0)a.useTap=true;return null}
  if(C.phase==='load'||C.phase==='tally'){stop();k.e=false;return null}
  if(C.phase==='over'){stop();k.e=false;if(C.phase==='over'&&C.overT>2)return null;return null}
  /* around the parked cars and the table: if the straight line crosses one, go by the sidewalk */
  const blocked=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0);for(let s=.5;s<L;s+=.4){const x=x0+(x1-x0)*s/L,z=z0+(z1-z0)*s/L;if(C.cars.some(c=>c.bay>=0&&c.st!=='leave'&&Math.abs(x-c.x)<1.5&&Math.abs(z-c.z)<2.95))return true;if(Math.abs(x-SPOT.table.x)<1.3&&Math.abs(z-SPOT.table.z)<.8)return true}return false};
  const go=(x,z,r)=>{if(Math.hypot(x-P.pos.x,z-P.pos.z)>(r||.6)&&blocked(P.pos.x,P.pos.z,x,z)){const W_=39.7;if(Math.abs(P.pos.z-W_)>.6&&!blocked(P.pos.x,P.pos.z,P.pos.x,W_)){x=P.pos.x;z=W_}else if(!blocked(x,W_,x,z)||Math.abs(z-W_)<.6){if(Math.abs(P.pos.z-W_)<=.8){z=W_}else{x=P.pos.x;z=W_}}r=.4}
    const dx=x-P.pos.x,dz=z-P.pos.z,d=Math.hypot(dx,dz);if(d<(r||.6)){stop();return true}const want=Math.atan2(-dx,-dz);let dy=want-P.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;P.yaw+=clamp(dy,-.22,.22);
    k.w=Math.abs(dy)<1.4;k.shift=d>5&&Math.abs(dy)<.5;if(t%15===0){const mv=Math.hypot(P.pos.x-B.px,P.pos.z-B.pz);if(k.w&&mv<.3)B.stuck++;else B.stuck=0;B.px=P.pos.x;B.pz=P.pos.z;
      if(B.stuck>=3){/* caught on a chair or the canopy leg: sidestep */P.pos.x+=(Math.random()-.5)*1.2;P.pos.z+=(Math.random()-.5)*1.2;a.collide(P.pos,.35);B.stuck=0}}return false};
  const aim=(x,y,z)=>{const c=a.camera.position;const dx=x-c.x,dy=y-c.y,dz=z-c.z,h=Math.hypot(dx,dz);const wy=Math.atan2(-dx,-dz);let d=wy-P.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;P.yaw+=clamp(d,-.35,.35);
    const wp=Math.atan2(dy,h);P.pitch+=clamp(wp-P.pitch,-.25,.25);return Math.abs(d)<.12&&Math.abs(wp-P.pitch)<.1};
  const tap=()=>{if(t%8===0)a.useTap=true};k.e=false;
  const DB=B.dbg||(B.dbg={});if(C.hose.spray){const kk=C.hose.hit?C.hose.hit.kind:'none';DB[kk]=(DB[kk]||0)+1}DB.f=(DB.f||0)+1;
  /* a kid in the way of the water: step aside */const hh=C.hose.hit;B.kidT=hh&&(hh.kind==='kid'||hh.kind==='dee'||hh.kind==='owner')&&C.hose.spray?(B.kidT||0)+1:0;if(B.kidT>25){B.kidT=0;B.side_=(B.side_||1)*-1;P.pos.x+=B.side_*.9;a.collide(P.pos,.35)}
  /* Kev first */const th=C.thief;
  if(th&&th.st==='run'){if(Math.hypot(th.p.x-P.pos.x,th.p.z-P.pos.z)<7&&C.hose.held){stop();if(aim(th.p.x,1.1,th.p.z)||B.aimT>0)C.botSpray=true;B.aimT=C.botSpray?.3:0;go(th.p.x,th.p.z,.5);return null}go(th.p.x,th.p.z,.4);return null}
  if(th&&th.st==='surr'){if(go(th.p.x,th.p.z,1.4))tap();return null}
  if(th&&th.st==='walk'){if(kidNear(C,th.p.x,th.p.z)<TUNE.kidR+1){go(300,39.3,.5);return null}stop();k.e=true;return null}
  if(th&&th.boxDrop&&!C.box){if(go(th.boxDrop.x,th.boxDrop.z,.9))tap();return null}
  if(!C.hose.held&&C.phase!=='load'){const N=C.rope.nodes,L=N[N.length-1];const tg=Math.hypot(P.pos.x-L.x,P.pos.z-L.z)<Math.hypot(P.pos.x-SPOT.reel.x,P.pos.z-SPOT.reel.z)?{x:L.x,z:L.z}:{x:SPOT.reel.x,z:SPOT.reel.z+.9};if(go(tg.x,tg.z,1.1))tap();return null}
  /* buckets (setup, and whenever a bucket is low and kids need it) */
  const lowB=[0,1].find(b=>C.buckets[b]<(C.phase==='setup'?.95:.15)&&(C.phase==='setup'||C.cars.some(c=>c.bay===b&&c.st==='soap')));
  if(o.fail&&C.phase==='open'){stop();return null}
  /* setup: buckets, then Jaylen */
  if(C.phase==='setup'){if(lowB!=null){const b=SPOT.bucket[lowB];if(go(b.x+(lowB?-1.2:1.2),b.z+2.6,.6)){if(aim(b.x,.3,b.z))C.botSpray=true}return null}
    const j=C.kids.find(q=>q.id==='jaylen');if(C.follow!==j){if(go(j.x,j.z,1.2))tap();return null}if(go(SPOT.sign.x,SPOT.sign.z,1))tap();return null}
  /* trouble: soak them, fix things */
  const bad=C.trouble.find(q=>!q.done&&q.p&&!q.soaked&&!q.talked&&(q.k==='mud'&&(q.st==='go'||q.st==='throw')||q.k==='kink'&&q.st==='go'||q.k==='sign'&&(q.st==='go'||q.st==='swap')));
  if(bad&&C.hose.held){const d=Math.hypot(bad.p.x-P.pos.x,bad.p.z-P.pos.z);if(d>6){go(bad.p.x,bad.p.z,5);return null}stop();if(aim(bad.p.x,1.1,bad.p.z))C.botSpray=true;return null}
  if(C.hose.kink>=0&&!(B.kinkGive>t)){const n=C.rope.nodes[C.hose.kink];B.kinkT=(B.kinkT||0)+1;if(B.kinkT>600){B.kinkT=0;B.kinkGive=t+900;callGary(M)}if(go(n.x,n.z,1.2)){k.e=true}return null}
  if(C.signFree){if(go(SPOT.aframe.x,SPOT.aframe.z,1.2))k.e=true;return null}
  const dc=C.trouble.find(q=>q.k==='drive'&&q.st==='drive'&&q.car&&!q.stopped);if(dc){const d=Math.hypot(dc.car.x-P.pos.x,dc.car.z-P.pos.z);if(d<16){stop();if(aim(dc.car.x+1.5,1.2,dc.car.z))C.botSpray=true}else go(dc.car.x+14,SPOT.lane-2.4,1);return null}
  if(C.rival&&C.rival.on){const s=SPOT.rsign;if(go(s.x-.5,40.6,1)){if(aim(s.x,1.3,s.z))C.botSpray=true}return null}
  if(lowB!=null){const b=SPOT.bucket[lowB];if(go(b.x+(lowB?-1.2:1.2),b.z+2.6,.7)){if(aim(b.x,.3,b.z))C.botSpray=true}return null}
  /* drying with nobody on it: do it by hand */const dryCar=C.cars.find(c=>c.st==='dry'&&c.bay>=0);if(dryCar&&!C.kids.some(q=>q.st==='dry')){if(go(dryCar.x+(dryCar.bay?1.9:-1.9),dryCar.z,.6))k.e=true;return null}
  /* rinse: the dirtiest face first, from where a person stands */
  const cars=C.cars.filter(c=>c.bay>=0&&(c.st==='rinse'||c.st==='soap'&&c.soap>.75)).sort((p,q)=>(p.st==='rinse'?0:1)-(q.st==='rinse'?0:1)||p.id-q.id);const c=cars[0];
  if(c&&c.S){const pr=c.S.pr,G=c.S.grid,inner=c.bay?-1:1;
    /* where a person stands for each side, and the sweep of spots they'd spray from there (skipping what's already clean) */
    const ST={E:{x:c.x+3.3,z:c.z+.6},W:{x:c.x-3.3,z:c.z+.6},S:{x:c.x+.5,z:c.z+5.1},N:{x:c.x+inner*2.2,z:32.75}};
    const cellV=(q,u,v)=>{const ox=(q===1||q===3)?32:0,oy=q>=2?32:0;let m=0;const cx=clamp(Math.floor(u*32),0,31),cy_=clamp(Math.floor(v*32),0,31);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const X=cx+dx,Y=cy_+dy;if(X<0||Y<0||X>31||Y>31)continue;m=Math.max(m,G[(oy+Y)*64+ox+X])}return m};
    const spots=sd=>{const out=[];const add=(lx,ly,lz,q,u,v)=>{const val=cellV(q,u,v);if(val>.06)out.push({lx,ly,lz,val})};
      if(sd==='E'||sd==='W'){const sg=sd==='E'?1:-1,q=sd==='E'?1:2;for(let i=0;i<9;i++){const u=(i+.5)/9,lx=pr.min.x+u*pr.size.x,b=binOf(pr,lx);for(const ly of[.45,.75,1.05,pr.top[b]-.12])if(ly<pr.top[b])add(lx,ly,sg*pr.hw[b],q,u,1-(ly-pr.min.y)/pr.size.y);
          for(const f of[.75,.35])add(lx,pr.top[b]-.02,sg*pr.hw[b]*f,0,u,(sg*pr.hw[b]*f-pr.min.z)/pr.size.z)}}
      else{const front=sd==='N',lx=front?pr.min.x+pr.size.x:pr.min.x,b=binOf(pr,lx);for(let i=0;i<5;i++){const v=(i+.5)/5,lz=pr.min.z+v*pr.size.z;for(const ly of[.45,.75,Math.max(.8,pr.top[b]-.1)])if(ly<pr.top[b]+.05)add(lx,ly,lz,3,front?v*.5:.5+v*.5,1-(ly-pr.min.y)/pr.size.y);
          for(let k=1;k<=3;k++){const lx2=front?pr.min.x+pr.size.x*(1-k*.12):pr.min.x+pr.size.x*k*.12,b2=binOf(pr,lx2);add(lx2,pr.top[b2]-.02,lz*.8,0,(lx2-pr.min.x)/pr.size.x,(lz*.8-pr.min.z)/pr.size.z)}}}
      return out};
    if(!B.side||B.faceC!==c||!B.list||!B.list.length){let bs=-1,bf=null;for(const k_ of['E','W','S','N']){if(B.blk&&B.blk[c.id+':'+k_]>t)continue;const L_=spots(k_);const v=L_.reduce((a_,q)=>a_+q.val,0);if(v>bs){bs=v;bf=k_;B.list=L_}}
      if(!bf||bs<=0){B.side=null;B.list=null}else{B.side=bf;B.faceC=c;B.list.sort((p,q)=>q.ly-p.ly||p.lx-q.lx);B.spotT=0;B.walkT=0}}
    if(B.side){const stand=ST[B.side];B.dbgS=B.side+' '+B.list.length+' d'+Math.hypot(P.pos.x-stand.x,P.pos.z-stand.z).toFixed(1);
      if(!go(stand.x,stand.z,.8)){B.walkT=(B.walkT||0)+1;if(B.walkT>360){B.blk=B.blk||{};B.blk[c.id+':'+B.side]=t+600;B.list=null}return null}
      const sp=B.list[0];const cs=Math.cos(c.yaw),sn=Math.sin(c.yaw);const wx=c.x+sp.lx*cs+sp.lz*sn,wz=c.z-sp.lx*sn+sp.lz*cs;if(aim(wx,sp.ly,wz)||B.spotT>0){C.botSpray=true;B.spotT++}
      if(B.spotT>6){B.list.shift();B.spotT=0}return null}}
  /* nothing to rinse: help scrub a bay with no kids */const sc=C.cars.find(q=>q.bay>=0&&q.st==='soap'&&!C.kids.some(kk=>kk.st==='w'+q.bay));if(sc){if(go(sc.x+(sc.bay?1.9:-1.9),sc.z,.6))k.e=true;return null}
  const s=C.cars.find(q=>q.bay>=0&&q.st==='soap');if(s){go(s.x+(s.bay?2.4:-2.4),s.z+3.4,.8);return null}
  go(330.5,38.4,1);return null}
})();
