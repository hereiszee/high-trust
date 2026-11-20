/* =====================================================================
   CROSSING GUARD (SPEC3 2.11): Pastor Dee's strand 2/2, an escort on foot in Riverside.
   The youth group lets out just as a turf flare-up starts on 2nd St. Eleven kids live south of it and Dee's van is in the
   shop. You get a reflective vest and a stop sign. No guns at all (children are with you the whole time): the sign is the tool.

   The duckling line: the kids follow the trail you walk, each one behind the one ahead (1.25 m, the first 2 m behind you),
   bunch up when you stop, straggle when you hurry, stop at every kerb until you wave them across, and wander off after dogs,
   cats and chalk. Each kid has a personality (the dog petter, the crack avoider, the runner, the "why" kid, the twins who swap
   places, the tired one, the one who wants the sign, the cool older one, the quiet last one) and a stoop with a grown-up waiting.
   The sign (hold right mouse / AIM) stops traffic within 25 m (a driver on the phone takes 3 s, so step in front of him),
   makes street-crew members step back, and shields the kids behind it. Crossings are set pieces: sign up in the road, then
   hold E to wave them across. The flare-up is pressure you route around, outwait, de-escalate (talk), block with the sign,
   or hand to Coach Rick (call-in). Nothing violent ever happens near the kids: the crews only shout.
   Fails: a car has to slam on its brakes for a kid ("Too close"), a kid on their own > 30 m away for 10 s.
   Shared helpers: HT.Stops.talk (paced radio queue). Test player: test.step below; dev/jobs/crossing.js for the shots.
   Owner rules: no guns, nothing violent near the kids, no religious dress or symbols, generic signage, Riverside's change is
   people coming back and staying; the dad crew and family are never restyled (kid clones get their own material copies).
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
const G=()=>window.__ht||{};
const AUD=()=>window.HT&&HT.Audio&&HT.Audio.init?HT.Audio:null;
const PPL=()=>window.HT&&HT.People&&HT.People.ok?HT.People:null;
const OWm=()=>window.HT&&HT.OpenWorld;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,hyp=Math.hypot;
const pick=a=>a[Math.floor(Math.random()*a.length)];

/* ---------------- tuning (seconds, metres, m/s) ---------------- */
const TUNE={
  gap0:2.0,gap:1.25,gapTight:.8,gapShield:.65,         /* first kid behind the dad, kid behind kid (walking / bunched / behind the raised sign) */
  kidWalk:1.45,kidRun:3.9,kidAcc:5,catchK:1.7,         /* chain speeds: a kid closes the gap at catchK x the gap, up to kidRun */
  kerb:.55,                                            /* kids stop this far short of the first road point until waved */
  waveT:.45,waveLife:45,                               /* hold E to wave them across; a wave covers that stretch of road this long */
  signR:25,signLat:7,signStop:3.5,phoneT:3,            /* cars stop for the sign within 25 m, 3.5 m short of you; a driver on the phone needs 3 s */
  car:{cruise:9.5,acc:2.6,brake:4.2,hard:9.5,len:4.6,lane:1.45,queue:2.2,honkT:8},
  nearMissDecel:6.8,                                   /* a car that needs more than this to stop for a kid = "Too close" */
  lostR:30,lostT:10,warnR:20,                          /* a kid on their own this far away this long = fail */
  flare:{rate:1/24,len:6,after:.3,freezeR:18,thinkR:13,signCool:.35,storeEvery:50,storeFor:24},
  gatherR:3.2,whistleR:26,rejoinR:12,
  traffic:{max:6,gap:[6,11],near:42,spawnBack:62,minSpawnD:38}};

/* ---------------- the neighbourhood (metres; Riverside streets: Main z40-46, Ash z68-74, Mill z96-102; River Rd x312-318,
   2nd St x344-350 (south of Ash only: the Fellowship Hall laundromat lot covers it between Main and Ash), 3rd St x376-382) ---------------- */
const CHURCH={dee:{x:331,z:37.6},dad:{x:332.4,z:40.9},kids:{x0:326,x1:337,z:35.6}};
/* the eleven, in their suggested drop-off order; homes are WORLD.porchesAll ids (sidewalk point in front of the door) */
const KIDS=[
  {id:'priya',name:'Priya',base:'daughter',top:'#22a99a',sc:.84,trait:'cracks',home:'rp15',grown:{key:'nb_mei',who:'Priya\'s mom'},bag:'#f6d55c'},
  {id:'wen',name:'Wen',base:'son',top:'#f2c230',sc:.82,trait:'why',home:'rp9',grown:{key:'nb_kenji',who:'Wen\'s dad'},cap:'#2a4d8f'},
  {id:'jaylen',name:'Jaylen',base:'nb_kid',top:'#7a4fd0',sc:.93,trait:'chalk',home:'rp43',grown:{key:'nb_sweater',who:'Jaylen\'s dad'},bag:'#e0503a'},
  {id:'theo',name:'Theo',base:'son',top:'#e0503a',sc:.86,trait:'dogs',home:'rp46',grown:{key:'nb_pops',who:'Theo\'s grandpa'},bag:'#3a7bd5'},
  {id:'ana',name:'Ana',base:'daughter',top:'#ff79b0',sc:.8,trait:'twin',home:'rp0',grown:{key:'nb_office',who:'Ms. Okafor'},bag:'#ffffff'},
  {id:'ava',name:'Ava',base:'daughter',top:'#ff79b0',sc:.8,trait:'twin',home:'rp0',grown:null,bag:'#ffffff'},
  {id:'benji',name:'Benji',base:'nb_kid',top:'#f08a24',sc:.84,trait:'sign',home:'rp5',grown:{key:'nb_marcus',who:'Benji\'s dad'},cap:'#d23b3b'},
  {id:'dash',name:'Dash',base:'nb_kid',top:'#2c9d4b',sc:.89,trait:'runner',home:'rp39',grown:{key:'nb_lucia',who:'Dash\'s mom'},cap:'#1d1f24'},
  {id:'rosie',name:'Rosie',base:'daughter',top:'#a6d84a',sc:.74,trait:'tired',home:'rp31',grown:{key:'nb_gran',who:'Rosie\'s grandma'},bag:'#b56cd9'},
  {id:'malik',name:'Malik',base:'son',top:'#3b404a',sc:.97,trait:'cool',home:'rp19',grown:{key:'nb_teen',who:'Malik\'s sister'}},
  {id:'gloria',name:'Gloria',base:'daughter',top:'#c43b5a',sc:.79,trait:'quiet',home:'rp16',grown:{key:'thug_cap',who:'Gloria\'s brother',work:true},bag:'#5cc7e0'}];
const KEVIN={id:'kevin',name:'Kevin',base:'nb_kid',top:'#3a7bd5',sc:.8,trait:'stray',home:null,join:{x:318.9,z:59},gran:{x:336.2,z:75.3}};
/* fallback stoops if a planned one is boarded up at this trust (rowhouses open as their block recovers) */
const FALLBACK={rp15:['rp15','rp36'],rp9:['rp9','rp36'],rp43:['rp43','rp38'],rp46:['rp46','rp11'],rp0:['rp0','rp11'],rp5:['rp5','rp0'],rp39:['rp39','rp31'],rp31:['rp31','rp18'],rp19:['rp19','rp18'],rp16:['rp16','rp6']};
/* marked crosswalks (zebra paint, timed set pieces): the rectangle of road you cross and which street the traffic is on */
const XINGS=[
  {id:'main',name:'Main St',x0:318.1,x1:320.9,z0:40,z1:46,street:'h'},
  {id:'ash',name:'Ash St',x0:318.1,x1:320.9,z0:68,z1:74,street:'h'},
  {id:'2nd-n',name:'2nd St',x0:344,x1:350,z0:93.4,z1:96,street:'v'},
  {id:'mill',name:'Mill St',x0:373.1,x1:375.9,z0:96,z1:102,street:'h'},
  {id:'2nd-s',name:'2nd St',x0:344,x1:350,z0:102,z1:104.6,street:'v'}];
/* traffic lanes (right-hand traffic, 1.5 m from the centreline); 2nd St south of Ash is a T: its lanes turn onto Ash */
const LANES=[
  {id:'mainE',st:'main',pts:[[262,44.5],[430,44.5]]},{id:'mainW',st:'main',pts:[[430,41.5],[262,41.5]]},
  {id:'ashE',st:'ash',pts:[[262,72.5],[430,72.5]]},{id:'ashW',st:'ash',pts:[[430,69.5],[262,69.5]]},
  {id:'millE',st:'mill',pts:[[262,100.5],[430,100.5]]},{id:'millW',st:'mill',pts:[[430,97.5],[262,97.5]]},
  {id:'2ndS',st:'2nd',pts:[[430,69.5],[345.5,69.5],[345.5,160]]},{id:'2ndN',st:'2nd',pts:[[348.5,160],[348.5,72.5],[430,72.5]]},
  {id:'riverS',st:'river',pts:[[313.5,-10],[313.5,160]]},{id:'riverN',st:'river',pts:[[316.5,160],[316.5,-10]]},
  {id:'3rdS',st:'3rd',pts:[[377.5,-10],[377.5,160]]},{id:'3rdN',st:'3rd',pts:[[380.5,160],[380.5,-10]]}];
const STREETS={main:{o:'h',c:43},ash:{o:'h',c:71},mill:{o:'h',c:99},river:{o:'v',c:315},'2nd':{o:'v',c:347},'3rd':{o:'v',c:379}};
const BOXES=[[312,40,318,46],[344,40,350,46],[376,40,382,46],[312,68,318,74],[344,68,350,74],[376,68,382,74],[312,96,318,102],[344,96,350,102],[376,96,382,102]];
/* the flare-up: two crews shouting across 2nd St, mid-block between Ash and Mill (armband colours from docs/riverside-heat.md) */
const CREWS={
  A:{name:'Coupon Boys',band:'#2aa39a',side:-1,spots:[{x:342.95,z:83.2},{x:342.7,z:84.7},{x:343.15,z:86.1}],wall:342.25,keys:['thug_hoodie','thug_track','thug_f_hood'],store:{x:342.9,z:66.8}},
  B:{name:'Dock St Discount',band:'#e0a82e',side:1,spots:[{x:351.1,z:85.4},{x:351.35,z:86.9},{x:350.95,z:88.3}],wall:351.75,keys:['thug_beanie','thug_red','thug_jacket'],store:{x:351.2,z:110}}};
const DETOUR=[[370,48,386,91.5],[306,77,322,100]];/* 3rd St between Main and Mill, River Rd south of Ash: the long way round */
const STAGES=['gear','main','river','corner','mill'];
const LABELS={gear:'Vest and sign',main:'Across Main St',river:'River Rd',corner:'2nd St',mill:'Mill St'};
/* things the kids want to go and look at (off the trail, never across a road) */
const POIS=[{id:'dog1',kind:'dog',x:319.1,z:62.4,for:'theo',r:6.5},{id:'cat1',kind:'cat',x:333.4,z:76.25,for:'theo',r:6},
  {id:'chalk1',kind:'chalk',x:327,z:74.9,for:'jaylen',r:4.5},{id:'chalk2',kind:'chalk',x:357,z:94.9,for:'jaylen',r:4.5},{id:'chalk3',kind:'chalk',x:359,z:103.1,for:'jaylen',r:4.5}];

/* ---------------- lines ---------------- */
const L_={
  dee:["Vest. Sign. Smile. If the sign doesn't work, smile harder.","Head count every corner. They will lie to you. Lovingly."],
  sign:["Can I hold the sign?","Can I hold it now?","What about now?","Is it heavy? I bet I could hold it.","When you're tired can I hold it?"],
  signNo:["No.","Not now, Benji.","...Maybe.","After the next corner. Maybe."],
  why:[["Why is it a stop sign and not a go sign?","Because going is the default, Wen. Stopping takes a sign."],["Why do cars listen to a sign?","Because it's red and it means it. Like your mom."],
    ["Why are those guys yelling?","Because they haven't been walked home in a while."],["Why do you have a vest?","So the cars can see me. And so I can feel important."],
    ["Why is the sky?","...Next question."],["Why do dads walk so fast?","Because your bedtime's at eight, Wen."],["Why can't we take the car?","Pastor Dee's van is in the shop. Sal says it's the alternator. It's never the alternator."]],
  cracks:["Step on a crack...","Don't look, I'm concentrating.","That one was a big one.","Twenty-six cracks. Twenty-seven."],
  dog:["DOGGY!","Can I pet him? I'm petting him.","Who's a good boy! You are!","He likes me. He said so."],
  cat:["Kitty!","It's a dog in its heart.","It looked at me. We're friends now."],
  chalk:["Hold on, it needs a sun.","I'm adding a dinosaur.","Art takes time!"],
  dash:["I WIN!","Beat you! I stopped at the line, I always stop at the line!","Race you!"],
  rosieSit:"My legs are broken.",
  twins:["...seven, eight. Wait. Did you two just swap?","No.","Yes."],
  freeze:["I don't like this.","Mister? It's loud.","Can we go a different way?"],
  calm:["Eyes on the sign. Look at the sign.","Hey. Look at me. We're just walking. That's all we're doing.","Sign's up. You're behind the sign. Nobody's behind the sign but us."],
  gather:["Come on, buddy. Back in line.","Ducklings! Line up!","There you are. In you get."],
  whistle:["Ducklings! Line up!","Everybody to me!","Headcount! Let's go!"],
  wait:["Everybody freeze like statues!","Wait right here. Hold hands with your neighbour."],
  go:["Okay, statues. Unfreeze.","And... we're walking."],
  kerbWait:["Waiting at the line!","We're at the line!","Line! We stopped!"],
  wave:["Go, go, go. Walk, don't run.","Across you go. Hold hands.","Nice and easy. Eyes on me."],
  honk:["Yes, sir. I see you. Thank you, sir.","Kids crossing! Kids. Crossing.","Wave at the nice impatient man, everybody."],
  driver:["Is that a real stop sign?","Okay, okay. Go ahead.","Aw, look at 'em.","Take your time. Not that much time."],
  phone:["Hey. HEY. Phone down.","Sir. SIR. Eyes up.","That's a phone, not a windshield, buddy."],
  crewA:["This is our corner.","Then go stand on it.","You stand on it.","Somebody moved my scooter.","Nobody touched your scooter."],
  crewB:["Whose corner? Show me the paperwork.","Y'all owe me a scooter.","It's a public sidewalk, genius.","You want to do this? We can do this."],
  think:["...is that a stop sign?","Bro. He's got a stop sign.","Respect the sign, man.","Okay. Okay. We see you.","Is he a cop? He's a dad. That's worse."],
  rick:["ALRIGHT, GENTLEMEN! PRACTICE IS OVER!","HIT THE SHOWERS! ALL OF YOU! I SAID HUSTLE!"],
  rickCrew:["Is that Coach Rick? Aw, man.","He coached my cousin. Run.","Not the whistle. Anything but the whistle."]};

/* ---------------- small helpers ---------------- */
function T_(){return A().THREE}
function reg(M,o){(M.cg.dis||(M.cg.dis=[])).push(o);return o}
function mat(M,col,o){const T=T_(),m=new T.MeshStandardMaterial(Object.assign({color:A().lin(col),roughness:.75,metalness:0},o||{}));return reg(M,m)}
function geo(M,g){return reg(M,g)}
function mesh(M,g,m,x,y,z,parent){const T=T_(),o=new T.Mesh(geo(M,g),m);o.position.set(x||0,y||0,z||0);o.castShadow=true;o.receiveShadow=true;if(parent)parent.add(o);return o}
function canvasTex(M,w,h,draw){const T=T_(),c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.anisotropy=4;if(T.sRGBEncoding)t.encoding=T.sRGBEncoding;return reg(M,t)}
function ground(x,z){try{return A().groundAt(x,z)||0}catch(_){return 0}}
function tileAt(x,z){const W=A().WORLD;const tx=Math.floor(x/2),tz=Math.floor(z/2);return W&&W.map&&W.map[tz]?W.map[tz][tx]:'#'}
/* a road surface (lanes, not sidewalk): inside a street band of WORLD.roads and not a wall/site */
function isRoad(x,z){return roadTile(x,z)&&roadTile(x+.45,z)&&roadTile(x-.45,z)&&roadTile(x,z+.45)&&roadTile(x,z-.45)}/* the outer 45 cm of a street counts as kerb */
function roadTile(x,z){const W=A().WORLD;if(!W||!W.roads)return false;const tx=Math.floor(x/2),tz=Math.floor(z/2);const c=W.map[tz]&&W.map[tz][tx];if(c!==','&&c!=='='&&c!=='!')return false;
  for(const r of W.roads){if(r.o==='h'){if(tz>=r.k&&tz<=r.k+2&&tx>=r.a&&tx<=r.b)return true}else if(tx>=r.k&&tx<=r.k+2&&tz>=r.a&&tz<=r.b)return true}return false}
function inRect(x,z,r,m){m=m||0;return x>=r[0]-m&&x<=r[2]+m&&z>=r[1]-m&&z<=r[3]+m}
function yawTo(dx,dz){return Math.atan2(-dx,-dz)}
function angDiff(a,b){let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d}
function turn(a,b,k){return a+angDiff(a,b)*Math.min(1,k)}
function tone(o){const Au=AUD();try{Au&&Au.tone&&Au.tone(o)}catch(_){}}
function voice(kind,pos,o){const Au=AUD();try{Au&&Au.voice&&Au.voice(kind,pos||null,o||{})}catch(_){}}
function music(state,int){const Au=AUD();try{Au&&Au.music&&Au.music(state,{intensity:int})}catch(_){}}
function horn(kind){tone({f:418,type:'sawtooth',d:kind==='long'?.8:.26,gain:.07});tone({f:527,type:'sawtooth',d:kind==='long'?.8:.26,gain:.06});if(kind==='double'){tone({f:418,type:'sawtooth',d:.16,gain:.07,at:.22});tone({f:527,type:'sawtooth',d:.16,gain:.06,at:.22})}}
function screech(){tone({f:1500,to:1150,type:'triangle',d:.7,gain:.05});tone({f:2100,to:1700,type:'sawtooth',d:.55,gain:.018})}
function whistleSnd(){tone({f:2650,to:2900,type:'sine',d:.18,gain:.08});tone({f:2700,to:2500,type:'sine',d:.35,gain:.08,at:.2})}
function chime(){tone({f:784,type:'sine',d:.18,gain:.05,bus:'ui'});tone({f:1046,type:'sine',d:.3,gain:.05,at:.14,bus:'ui'})}
function thwack(){tone({f:180,to:90,type:'square',d:.09,gain:.05})}

/* ---------------- props ---------------- */
/* the stop paddle: an octagon on a pole, both faces printed (canvas), white rim */
function stopSign(M,scale){const T=T_(),g=new T.Group();const tex=M.cg.signTex||(M.cg.signTex=canvasTex(M,256,256,(c,W,H)=>{c.fillStyle='#ffffff';oct(c,W/2,H/2,W/2-2);c.fill();c.fillStyle='#c8102e';oct(c,W/2,H/2,W/2-14);c.fill();
    c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=5;oct(c,W/2,H/2,W/2-22);c.stroke();c.fillStyle='#ffffff';c.font='bold 74px Arial, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('STOP',W/2,H/2+3)}));
  const face=M.cg.signMat||(M.cg.signMat=reg(M,new T.MeshStandardMaterial({map:tex,roughness:.45,metalness:.05,transparent:true,alphaTest:.5,side:T.DoubleSide})));
  const plate=new T.Mesh(geo(M,new T.PlaneGeometry(.46,.46)),face);plate.position.y=1.28;plate.castShadow=true;g.add(plate);
  const back=new T.Mesh(geo(M,new T.CylinderGeometry(.226,.226,.012,8)),mat(M,'#c8102e',{roughness:.5}));back.rotation.x=Math.PI/2;back.rotation.y=Math.PI/8;back.position.y=1.28;back.rotation.z=Math.PI/8;g.add(back);
  const pole=mesh(M,new T.CylinderGeometry(.016,.016,1.42,8),mat(M,'#c9ccd0',{metalness:.6,roughness:.35}),0,.62,-.012,g);
  const grip=mesh(M,new T.CylinderGeometry(.022,.022,.2,8),mat(M,'#1d1f22',{roughness:.9}),0,.1,-.012,g);
  if(scale)g.scale.setScalar(scale);g.userData.plate=plate;return g}
function oct(c,cx,cy,r){c.beginPath();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4;c[i?'lineTo':'moveTo'](cx+Math.cos(a)*r,cy+Math.sin(a)*r)}c.closePath()}
/* the hi-vis vest: front and back panels with reflective bands, on the dad's chest bone */
function vest(M){const T=T_(),g=new T.Group();const tex=canvasTex(M,256,128,(c,W,H)=>{c.fillStyle='#d4ef22';c.fillRect(0,0,W,H);c.fillStyle='#eef0ea';c.fillRect(0,70,W,12);c.fillRect(0,94,W,12);
    c.fillStyle='rgba(60,70,0,.18)';for(let i=0;i<W;i+=4)c.fillRect(i,0,1,H);c.fillStyle='#e6e9e2';c.fillRect(W*.25-3,0,6,H);c.fillRect(W*.75-3,0,6,H)});
  const m=reg(M,new T.MeshStandardMaterial({map:tex,roughness:.65,side:T.DoubleSide,emissive:A().lin('#2b3600'),emissiveIntensity:.25}));
  /* a fitted tube around the chest (slightly narrower at the shoulders), with straps over the shoulders */
  const body=new T.Mesh(geo(M,new T.CylinderGeometry(.92,1,.44,20,1,true)),m);body.scale.set(.205,1,.142);body.castShadow=true;g.add(body);
  const sm=mat(M,'#d4ef22',{roughness:.65});for(const sx of[-1,1]){const st=new T.Mesh(geo(M,new T.BoxGeometry(.07,.018,.27)),sm);st.position.set(sx*.1,.225,0);st.castShadow=true;g.add(st)}
  return g}
/* zebra stripes for a crosswalk rectangle (one merged mesh per crossing, painted on the road) */
function zebra(M,X){const T=T_(),g=new T.Group();const m=M.cg.zebraMat||(M.cg.zebraMat=reg(M,new T.MeshStandardMaterial({color:A().lin('#eeeae0'),roughness:.85,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})));
  const across=X.street==='h';/* stripes run along the walking direction */const L=across?X.z1-X.z0:X.x1-X.x0,W=across?X.x1-X.x0:X.z1-X.z0;const n=Math.floor(L/.9);
  const parts=[];for(let i=0;i<n;i++){const p=new T.PlaneGeometry(across?W:.45,across?.45:W);p.rotateX(-Math.PI/2);const c=(i+.5)*(L/n);p.translate(across?(X.x0+X.x1)/2:X.x0+c,0,across?X.z0+c:(X.z0+X.z1)/2);parts.push(p)}
  const merged=mergeGeo(parts);const o=new T.Mesh(geo(M,merged),m);o.receiveShadow=true;o.position.y=ground((X.x0+X.x1)/2,(X.z0+X.z1)/2)+.012;g.add(o);for(const p of parts)p.dispose();return g}
function mergeGeo(parts){const T=T_(),P=[],N=[],U=[];for(const g0 of parts){const g=g0.index?g0.toNonIndexed():g0;P.push(...g.attributes.position.array);N.push(...g.attributes.normal.array);if(g.attributes.uv)U.push(...g.attributes.uv.array);if(g!==g0)g.dispose()}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('normal',new T.Float32BufferAttribute(N,3));if(U.length)g.setAttribute('uv',new T.Float32BufferAttribute(U,2));g.computeBoundingSphere();return g}
/* a four-legged friend: a merged body (vertex colours) and four legs and a tail that move. kind 'dog' (a scruffy golden mutt) or 'cat' */
function critter(M,kind){const T=T_(),g=new T.Group(),cat=kind==='cat',s=cat?.62:1;const coat=cat?'#5b5d62':'#c98d4a',light=cat?'#e9e4da':'#e7c48f',dark='#2b211b';
  const parts=[];const col=new T.Color();const add=(gg,c)=>{col.set(c);col.convertSRGBToLinear();const n=gg.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=col.r;a[i*3+1]=col.g;a[i*3+2]=col.b}gg.setAttribute('color',new T.BufferAttribute(a,3));parts.push(gg)};
  const sp=(r,sx,sy,sz,x,y,z,c)=>{const q=new T.SphereGeometry(r,14,10);q.scale(sx,sy,sz);q.translate(x,y,z);add(q,c)};
  sp(.2*s,1,cat?.85:.95,1.7,0,.42*s,0,coat);sp(.15*s,1,1,1,0,.47*s,.22*s,light);/* body, chest */
  sp(.12*s,1.05,1,1.05,0,.66*s,.36*s,coat);/* head */
  if(cat){sp(.06*s,1,.8,1,0,.62*s,.46*s,light);for(const e of[-1,1]){const c=new T.ConeGeometry(.045*s,.09*s,4);c.translate(e*.07*s,.78*s,.35*s);add(c,coat)}}
  else{const sn=new T.CylinderGeometry(.055,.065,.14,10);sn.rotateX(Math.PI/2);sn.translate(0,.62,.48);add(sn,light);sp(.03,1,.8,1,0,.64,.555,dark);
    for(const e of[-1,1]){const ear=new T.SphereGeometry(.06,8,6);ear.scale(.55,1.25,.9);ear.translate(e*.1,.62,.33);add(ear,'#8a5a2e')}}
  for(const e of[-1,1])sp(.016*s,1,1,.6,e*.05*s,.7*s,.46*s+(cat?.0:.0),dark);/* eyes */
  if(!cat){const collar=new T.TorusGeometry(.105,.018,6,14);collar.rotateX(Math.PI/2.4);collar.translate(0,.56,.3);add(collar,'#d23b3b')}
  const bodyGeo=mergeVC(parts);const bm=M.cg.critterMat||(M.cg.critterMat=reg(M,new T.MeshStandardMaterial({vertexColors:true,roughness:.92})));
  const body=new T.Mesh(geo(M,bodyGeo),bm);body.castShadow=true;g.add(body);for(const p of parts)p.dispose();
  const legM=mat(M,coat,{roughness:.95});const legs=[];
  for(const[x,z]of[[-.09,.2],[.09,.2],[-.09,-.22],[.09,-.22]]){const pv=new T.Group();pv.position.set(x*s,.38*s,z*s);const l=mesh(M,new T.CylinderGeometry(.035*s,.03*s,.38*s,8),legM,0,-.19*s,0,pv);
    const paw=mesh(M,new T.SphereGeometry(.04*s,8,6),mat(M,cat?light:'#e7c48f'),0,-.37*s,.015,pv);g.add(pv);legs.push(pv)}
  const tail=new T.Group();tail.position.set(0,.5*s,-.3*s);const tl=mesh(M,new T.CylinderGeometry(.03*s,.018*s,cat?.42:.32,8),legM,0,cat?.21:.16,0,tail);tail.rotation.x=cat?-.25:-.7;g.add(tail);
  g.userData={legs,tail,cat,t:Math.random()*9,head:body};return g}
function mergeVC(parts){const T=T_(),P=[],N=[],C=[];for(const g0 of parts){const g=g0.index?g0.toNonIndexed():g0;P.push(...g.attributes.position.array);N.push(...g.attributes.normal.array);C.push(...g.attributes.color.array);if(g!==g0)g.dispose()}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('normal',new T.Float32BufferAttribute(N,3));g.setAttribute('color',new T.Float32BufferAttribute(C,3));g.computeBoundingSphere();return g}
function critterStep(o,dt,mode){const u=o.userData;u.t+=dt;const wag=mode==='happy'?14:mode==='walk'?6:3;u.tail.rotation.z=Math.sin(u.t*wag)*(mode==='happy'?.75:.35);
  const walk=mode==='walk';for(let i=0;i<4;i++)u.legs[i].rotation.x=walk?Math.sin(u.t*9+(i===0||i===3?0:Math.PI))*.55:0}
/* a porch lantern by the door: dark until that kid is home, then warm (glass, a halo and a pool of light on the stoop) */
function lantern(M){const T=T_(),g=new T.Group();if(!M.cg.lanM){M.cg.lanM={off:reg(M,new T.MeshStandardMaterial({color:A().lin('#6b6455'),roughness:.4,emissive:A().lin('#000000')})),
      on:reg(M,new T.MeshStandardMaterial({color:A().lin('#fff1c8'),roughness:.3,emissive:A().lin('#ffc46b'),emissiveIntensity:2.4,toneMapped:false})),
      metal:reg(M,new T.MeshStandardMaterial({color:A().lin('#1f2124'),roughness:.5,metalness:.6})),
      halo:reg(M,new T.MeshBasicMaterial({map:canvasTex(M,64,64,(c,W,H)=>{const r=c.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,214,150,.95)');r.addColorStop(.35,'rgba(255,190,110,.35)');r.addColorStop(1,'rgba(255,170,90,0)');c.fillStyle=r;c.fillRect(0,0,W,H)}),transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false})),
      pool:reg(M,new T.MeshBasicMaterial({map:canvasTex(M,64,64,(c,W,H)=>{const r=c.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,200,130,.55)');r.addColorStop(1,'rgba(255,180,110,0)');c.fillStyle=r;c.fillRect(0,0,W,H)}),transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}))}}
  const Lm=M.cg.lanM;const cap=mesh(M,new T.BoxGeometry(.2,.04,.2),Lm.metal,0,.2,0,g);const glass=mesh(M,new T.BoxGeometry(.15,.22,.15),Lm.off,0,.07,0,g);const base=mesh(M,new T.BoxGeometry(.12,.04,.12),Lm.metal,0,-.05,0,g);
  const arm=mesh(M,new T.BoxGeometry(.04,.04,.16),Lm.metal,0,.12,-.1,g);
  const halo=new T.Mesh(geo(M,new T.PlaneGeometry(1.1,1.1)),Lm.halo);halo.position.y=.07;halo.visible=false;g.add(halo);
  const pool=new T.Mesh(geo(M,new T.PlaneGeometry(3.4,3.4)),Lm.pool);pool.rotation.x=-Math.PI/2;pool.visible=false;g.add(pool);
  g.userData={glass,halo,pool,on:false};return g}
function lanternOn(M,l,on){const u=l.userData;u.on=on;u.glass.material=on?M.cg.lanM.on:M.cg.lanM.off;u.halo.visible=on;u.pool.visible=on}
/* a crew armband: an open band on the left upper arm (same look as the free-roam crews) */
function armband(M,d,col){const T=T_(),b=d.rb&&d.rb.bones&&d.rb.bones.Bip01_L_UpperArm;const m=mat(M,col,{roughness:.8,side:T.DoubleSide});
  const band=new T.Mesh(geo(M,new T.CylinderGeometry(.062,.062,.07,12,1,true)),m);if(!b){band.position.set(.2,1.35,0);d.root.add(band);return band}
  b.updateMatrixWorld(true);const s=new T.Vector3();b.getWorldScale(s);const k=1/(s.x||1);band.scale.setScalar(k*(d.root.scale.x||1));band.position.set(.13*k,0,0);band.rotation.z=Math.PI/2;b.add(band);return band}
/* attach a prop to a bone of a People character (rocketbox bones carry their own scale: undo it) */
function toBone(d,obj,bone,off){const T=T_(),b=d&&d.rb&&d.rb.bones&&(d.rb.bones[bone]||d.body.getObjectByName(bone));if(!b){if(d&&d.root){obj.position.set(0,1,0);d.root.add(obj)}return obj}
  b.updateMatrixWorld(true);const s=new T.Vector3();b.getWorldScale(s);const k=1/(s.x||1);obj.scale.multiplyScalar(k*(d.root.scale.x||1));
  if(off){obj.position.set(off[0]*k,off[1]*k,off[2]*k);if(off[3]!=null)obj.rotation.set(off[3],off[4]||0,off[5]||0)}b.add(obj);return obj}

/* ---------------- the kids' looks ----------------
   Three base kid models (son, daughter, nb_kid) are single skinned meshes. Each kid gets its own clone of the material (sharing
   the texture) with a tiny shader edit that recolours only the top's hue range of the clothing half of the atlas: twelve
   distinct kids, one program, zero new textures, one draw call each. The family's own materials are never touched. */
const GARM={son:{h:.6,w:.07,s:.42,v:.25,ref:.62},daughter:{h:.83,w:.08,s:.4,v:.25,ref:.74},nb_kid:{h:.055,w:.045,s:.5,v:.45,ref:.82,hand:1}};
const TINT_GLSL=`#ifdef USE_MAP
  vec4 texelColor = texture2D( map, vUv );
  if(vUv.x<0.5){vec3 c=texelColor.rgb;float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b)),dl=mx-mn;float s=mx>0.001?dl/mx:0.;float h=0.;
    if(dl>0.0001){if(mx==c.r)h=mod((c.g-c.b)/dl,6.);else if(mx==c.g)h=(c.b-c.r)/dl+2.;else h=(c.r-c.g)/dl+4.;h/=6.;}
    float dh=abs(h-uSrc.x);dh=min(dh,1.-dh);float m=(1.-smoothstep(uSrc.y*.6,uSrc.y,dh))*smoothstep(uSrc.z-.12,uSrc.z,s)*smoothstep(uSrc.w-.1,uSrc.w,mx);
    if(uHand>.5&&(vUv.x<.16||vUv.x>.34)&&vUv.y>.8)m=0.;
    texelColor.rgb=mix(c,clamp(uDst*(mx/uRef),0.,1.),m);}
  texelColor = mapTexelToLinear( texelColor );
  diffuseColor *= texelColor;
#endif`;
function kidTint(M,d,base,top){const T=T_(),P=GARM[base];if(!P||!d||!d.rb)return;const sk=d.rb.skinned&&d.rb.skinned[0];if(!sk||!sk.material||!sk.material.map)return;
  const c=new T.Color(top),m=sk.material.clone();reg(M,m);const U={uDst:{value:new T.Vector3(c.r,c.g,c.b)},uSrc:{value:new T.Vector4(P.h,P.w,P.s,P.v)},uRef:{value:P.ref},uHand:{value:P.hand?1:0}};
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);sh.fragmentShader='uniform vec3 uDst;uniform vec4 uSrc;uniform float uRef;uniform float uHand;\n'+sh.fragmentShader.replace('#include <map_fragment>',TINT_GLSL)};
  m.customProgramCacheKey=()=>'ht-kid-tint';sk.material=m}
/* place obj at a root-space spot, then hand it to a bone (keeps its world pose, follows the animation) */
function onBone(d,obj,bone,pos,rot){const b=d.rb&&d.rb.bones&&(d.rb.bones[bone]||d.body.getObjectByName(bone));obj.position.set(pos[0],pos[1],pos[2]);if(rot)obj.rotation.set(rot[0],rot[1],rot[2]);d.root.add(obj);
  if(b){d.root.updateMatrixWorld(true);b.attach(obj)}return obj}
/* a small backpack or a cap, one merged mesh each (vertex colours, a shared material) */
function backpack(M,col){const T=T_(),parts=[],c=new T.Color();const add=(g,h)=>{c.set(h);c.convertSRGBToLinear();const n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b}g.setAttribute('color',new T.BufferAttribute(a,3));parts.push(g)};
  const b=new T.BoxGeometry(.26,.3,.13);add(b,col);const p=new T.BoxGeometry(.2,.12,.04);p.translate(0,-.06,-.08);add(p,col);const z=new T.BoxGeometry(.21,.012,.012);z.translate(0,.0,-.1);add(z,'#26282c');
  for(const s of[-1,1]){const st=new T.BoxGeometry(.035,.26,.02);st.translate(s*.08,.02,.075);add(st,'#26282c')}
  const g=mergeVC(parts);for(const q of parts)q.dispose();return new T.Mesh(geo(M,g),M.cg.vcMat||(M.cg.vcMat=reg(M,new T.MeshStandardMaterial({vertexColors:true,roughness:.8}))))}
function cap(M,col){const T=T_(),parts=[],c=new T.Color();const add=(g,h)=>{c.set(h);c.convertSRGBToLinear();const n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b}g.setAttribute('color',new T.BufferAttribute(a,3));parts.push(g)};
  const dome=new T.SphereGeometry(.105,14,8,0,Math.PI*2,0,Math.PI/2);dome.scale(1,.8,1.08);add(dome,col);const brim=new T.CylinderGeometry(.1,.1,.012,14,1,false,-Math.PI/2,Math.PI);brim.scale(1,1,.9);brim.translate(0,.004,.05);add(brim,col);
  const btn=new T.SphereGeometry(.014,6,4);btn.translate(0,.085,0);add(btn,'#f4f1ea');const g=mergeVC(parts);for(const q of parts)q.dispose();
  return new T.Mesh(geo(M,g),M.cg.vcMat||(M.cg.vcMat=reg(M,new T.MeshStandardMaterial({vertexColors:true,roughness:.8}))))}
function soakerBack(M){const T=T_(),g=new T.Group();mesh(M,new T.BoxGeometry(.07,.1,.42),mat(M,'#3fd15a',{roughness:.35}),0,0,0,g);const t=mesh(M,new T.CylinderGeometry(.055,.055,.2,10),mat(M,'#ff8a1e',{roughness:.3}),0,.09,.02,g);t.rotation.x=Math.PI/2;return g}
/* People bones: world position of a bone (for placing accessories) */
function boneW(d,name){const T=T_(),b=d.rb&&d.rb.bones&&(d.rb.bones[name]||d.body.getObjectByName(name));const v=new T.Vector3();if(!b){d.root.getWorldPosition(v);v.y+=1;return v}d.root.updateMatrixWorld(true);b.getWorldPosition(v);return v}
function person(M,key,o){o=o||{};const pp=PPL();let d=null;try{d=pp?pp.make(key,{scale:o.scale,idle:o.idle}):null}catch(_){d=null}
  if(!d){try{d=A().makeDude(o.look||{shirt:o.top||'#888',pants:'#444'})}catch(_){d=null}if(d&&o.scale)d.root.scale.setScalar(o.scale)}
  if(!d)return null;M.cg.root.add(d.root);M.cg.people.push(d);try{A().equip(d,null)}catch(_){}return d}

/* ---------------- the trail: where the dad walked (the kids walk it too) ---------------- */
function trailNew(){return{pts:[],run:0,runs:{}}}
/* a step onto the lip of the street (around a lamp post) isn't a crossing: the kids' trail stays on the kerb */
function kerbSide(x,z){if(!isRoad(x,z))return null;const deep=roadTile(x+1.4,z)&&roadTile(x-1.4,z)&&roadTile(x,z+1.4)&&roadTile(x,z-1.4);if(deep)return null;
  for(let r=.5;r<=1.6;r+=.25)for(let i=0;i<8;i++){const a=i*Math.PI/4,qx=x+Math.cos(a)*r,qz=z+Math.sin(a)*r;if(!isRoad(qx,qz)&&!roadTile(qx,qz))return{x:qx,z:qz}}return null}
function trailPush(M,x,z,force){const T=M.cg.trail,p=T.pts;const ks=kerbSide(x,z);if(ks){x=ks.x;z=ks.z}const last=p[p.length-1];if(last&&!force&&hyp(x-last.x,z-last.z)<.35)return;
  const s=last?last.s+hyp(x-last.x,z-last.z):0,road=isRoad(x,z);let run=0;if(road){if(!last||!last.road){T.run++;T.runs[T.run]={s0:s,s1:s,ok:0,okT:0,xing:xingAt(x,z)}}run=T.run;T.runs[run].s1=s;if(!T.runs[run].xing)T.runs[run].xing=xingAt(x,z)}
  /* shortcuts: back near an earlier point (fetching a stray, a step into the road and back) -> the kids skip the loop */
  if(!road)for(let j=p.length-6;j>=0&&j>p.length-260;j--){const q=p[j];if(q.road)continue;const d=hyp(q.x-x,q.z-z);if(d<2.2&&s-q.s>2*d+2.5&&!isRoad((q.x+x)/2,(q.z+z)/2)){trailCut(M,j);return trailPush(M,x,z,true)}}
  p.push({x,z,s,road,run});if(p.length>460)p.splice(0,60)}
function trailCut(M,j){const C=M.cg,p=C.trail.pts,cut=p[j].s;p.length=j+1;const line=lineKids(M);let i=0;for(const k of line){const lim=cut-(i?TUNE.gapTight:1.2)-i*TUNE.gapTight;if(k.s>lim)k.s=Math.max(trailFirst(M),lim);i++}
  for(const k of C.kids)if(k.state==='free'&&k.free&&k.free.s!=null&&k.free.s>cut)k.free.s=cut-.5}
function xingAt(x,z){for(const X of XINGS)if(x>=X.x0-.6&&x<=X.x1+.6&&z>=X.z0-.6&&z<=X.z1+.6)return X.id;return null}
function trailHead(M){const p=M.cg.trail.pts;return p.length?p[p.length-1].s:0}
function trailFirst(M){const p=M.cg.trail.pts;return p.length?p[0].s:0}
/* index of the last point at or before s (binary search) */
function trailIdx(p,s){let lo=0,hi=p.length-1;if(hi<0)return -1;if(s<=p[0].s)return 0;if(s>=p[hi].s)return hi;while(hi-lo>1){const m=(lo+hi)>>1;if(p[m].s<=s)lo=m;else hi=m}return lo}
function trailAt(M,s){const p=M.cg.trail.pts;if(!p.length)return{x:0,z:0,dx:0,dz:-1};const i=trailIdx(p,s),a=p[i],b=p[Math.min(p.length-1,i+1)];const L=b.s-a.s;
  if(L<1e-4){const c=p[Math.max(0,i-1)],dx=a.x-c.x,dz=a.z-c.z,l=hyp(dx,dz)||1;return{x:a.x,z:a.z,dx:dx/l,dz:dz/l}}const t=clamp((s-a.s)/L,0,1);return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,dx:(b.x-a.x)/L,dz:(b.z-a.z)/L}}
/* the kerb: the first road point after s (up to sMax) whose stretch of road nobody has waved this kid across */
function kerbAhead(M,s,sMax,kid){const T=M.cg.trail,p=T.pts;let i=trailIdx(p,s);if(i<0)return null;if(p[i].s<s)i++;
  for(;i<p.length&&p[i].s<=sMax+.01;i++){const q=p[i];if(!q.road)continue;const r=T.runs[q.run];if(r&&r.ok&&r.okFor&&r.okFor[kid.id]&&M.cg.clock<r.okT){i=Math.max(i,trailIdx(p,r.s1));continue}const pv=i>0?p[i-1]:null;return{s:pv&&!pv.road?Math.min(q.s,pv.s+TUNE.kerb):q.s,run:q.run}}return null}
function onRoadKid(k){return k.d&&isRoad(k.x,k.z)}if(typeof window!=='undefined')window.__onR=k=>onRoadKid(k);
/* rebuild a straight-ish trail behind a point (start, checkpoint) from a list of points, oldest first */
function trailSeed(M,pts){M.cg.trail=trailNew();for(const q of pts)trailPush(M,q[0],q[1],true)}

/* ---------------- the kids ---------------- */
function homeOf(M,def){if(!def.home)return null;const a=A(),W=a.WORLD,all=W.porchesAll||W.porches||[];const ow=OWm(),ru=W.rowUnits||[];
  const open=id=>{const p=all.find(q=>q.id===id);if(!p)return null;const u=ru.find(u=>u.porch!=null&&'rp'+u.porch===id);if(u&&u.boardedUntil>0&&ow&&ow.blockTrust&&ow.blockTrust(u.cx,u.cz)<u.boardedUntil)return null;return p};
  for(const id of(FALLBACK[def.home]||[def.home])){const p=open(id);if(p)return homeRec(p)}const p=all.find(q=>q.id===def.home);return p?homeRec(p):null}
function homeRec(p){const fz=p.face?p.face[1]:-1;/* face points out of the door toward the street */return{id:p.id,x:p.x,z:p.z,fz,door:{x:p.x,z:p.z-fz*.95},stoop:{x:p.x,z:p.z-fz*.25},lamp:{x:p.x+.95,z:p.z-fz*1.02},yaw:yawTo(0,fz)}}
function makeKid(M,def,i){const d=person(M,def.base,{scale:def.sc,top:def.top});const k={def,id:def.id,name:def.name,d,state:'mill',s:0,x:0,z:0,yaw:0,v:0,side:((i*37)%11/11-.5)*.5,ph:i*1.7,
    fz:0,frozen:false,said:{},lostT:0,free:null,bub:null,home:null,pass:0,hop:0,cr:0,whyI:0,poiDone:{},col:def.top};
  if(d){kidTint(M,d,def.base,def.top);d.kid=true;try{
      const nk=boneW(d,'Bip01_Neck'),hd=boneW(d,'Bip01_Head'),r=d.root.position;const sc=d.root.scale.x||1;
      if(def.bag){const b=backpack(M,def.bag);b.scale.setScalar(sc);onBone(d,b,'Bip01_Spine2',[0,(nk.y-r.y)/sc*sc-.2*sc,-.15*sc])}
      if(def.cap){const c=cap(M,def.cap);c.scale.setScalar(sc*1.02);onBone(d,c,'Bip01_Head',[0,(hd.y-r.y)+.1*sc,.0])}
      if(def.trait==='stray'){const s=soakerBack(M);s.scale.setScalar(sc);onBone(d,s,'Bip01_Spine2',[0,(nk.y-r.y)-.24*sc,-.15*sc],[.5,0,.3])}}catch(e){console.warn('[crossing] kid props',e)}}
  return k}
function kidPlace(M,k,x,z,yaw){k.x=x;k.z=z;if(yaw!=null)k.yaw=yaw;if(k.d){k.d.root.position.set(x,ground(x,z),z);k.d.root.rotation.y=k.yaw+Math.PI}}
function lineKids(M){return M.cg.kids.filter(k=>k.state==='line').sort((a,b)=>b.s-a.s)}
function activeKids(M){return M.cg.kids.filter(k=>k.state!=='home'&&k.state!=='gone'&&k.state!=='homeward'&&k.state!=='mill')}
function say(M,who,text,o){const C=M.cg;o=o||{};if(C.talk)C.talk.say(who,text,o);else A().radio(who,text,true)}
function kidSay(M,k,text,o){o=o||{};bubble(M,k,o.bub||text.split(/[.!?]/)[0].slice(0,28)+(text.length>28&&!o.bub?'…':/[!?]$/.test(text)?text.slice(-1):''),o.t||2.6);if(o.radio!==false)say(M,k.name,text,Object.assign({voice:'kid',pitch:1+(k.def.sc<.8?.12:0)},o))}
function bubble(M,k,txt,t){k.bub={txt,t:t||2.4}}

/* the chain: every kid in line follows the one ahead along the trail; kerbs, the raised sign, waits and freezes shape it */
function chainStep(dt,M){const C=M.cg,P=A().P,head=trailHead(M),first=trailFirst(M);const line=lineKids(M);
  let prevS=head,prevMov=C.dadMov>.4,prevId=null;const shield=C.sign.up&&C.threatNear;
  for(let i=0;i<line.length;i++){const k=line[i];let gap=i===0?TUNE.gap0:TUNE.gap;if(!prevMov)gap=i===0?1.4:TUNE.gapTight;if(shield)gap=i===0?1.1:TUNE.gapShield;
    let ref=prevS;
    /* a twin overtaking: aim past the twin ahead */
    if(k.pass>0&&i>0&&line[i-1].def.trait==='twin'){k.pass-=dt;ref=i>1?line[i-2].s:head;gap=i>1?TUNE.gap*.55:TUNE.gap0}
    let tgt=Math.min(ref-gap,head-.4);if(C.waitAll&&k.waitS!=null)tgt=Math.min(tgt,k.waitS);
    const kb=kerbAhead(M,k.s,tgt+.2,k);k.kerb=null;if(kb){const ks=kb.s-TUNE.kerb;if(tgt>=ks-.05){tgt=ks;k.kerb=kb}}
    /* waved across but the dad isn't right there: look both ways before stepping off the kerb */
    if(!kb&&tgt>k.s){const nx=trailAt(M,Math.min(tgt,k.s+.7));if(isRoad(nx.x,nx.z)&&!isRoad(k.x,k.z)&&hyp(P.pos.x-k.x,P.pos.z-k.z)>7&&carNear(M,nx.x,nx.z)){tgt=k.s;k.look=1}else k.look=0}
    if(k.fz>0)tgt=k.s;
    /* the crack-avoider hops: tiny pauses every ~0.75 m */
    let max=k.def.trait==='cracks'?2.5:k.def.trait==='tired'?3.5:k.def.trait==='cool'?4.2:TUNE.kidRun;
    if(k.def.trait==='cracks'){k.hop-=dt;if(k.hop<0&&k.v>.4){k.hop=.55+Math.random()*.35;k.hopP=.16}if(k.hopP>0){k.hopP-=dt;max=.25}}
    const want=clamp((tgt-k.s)*TUNE.catchK,0,max);k.v+=clamp(want-k.v,-TUNE.kidAcc*2*dt,TUNE.kidAcc*dt);if(k.v<0)k.v=0;
    k.s=Math.min(Math.max(tgt,k.s),k.s+k.v*dt);if(k.s<first)k.s=first;
    prevS=k.s;prevMov=k.v>.3;prevId=k.id;
    /* to world: on the trail, a little to the side (more when bunched up) */
    const tp=trailAt(M,k.s),tight=!prevMov||shield,tpRoad=isRoad(tp.x,tp.z);let side=k.side*(tight?1.6:1)+Math.sin(C.clock*.7+k.ph)*.1+(k.pass>0?.45:0);if(tpRoad)side=clamp(side,-.3,.3);
    let tx=tp.x+tp.dz*side,tz=tp.z-tp.dx*side;if(isRoad(tx,tz)&&!tpRoad){tx=tp.x;tz=tp.z}const mv=hyp(tx-k.x,tz-k.z);k.x+=(tx-k.x)*Math.min(1,dt*10);k.z+=(tz-k.z)*Math.min(1,dt*10);
    if(!tpRoad&&isRoad(k.x,k.z)){k.x=tp.x;k.z=tp.z}/* never drift off the kerb on your own */
    if(k.v>.25&&mv>.01)k.yaw=turn(k.yaw,yawTo(tp.dx,tp.dz),dt*8);else k.yaw=turn(k.yaw,yawTo(P.pos.x-k.x,P.pos.z-k.z),dt*2.5);
    k.mov=k.v>.2;k.spd=k.v}
  /* twins: every so often the one behind sneaks past the other (and the dad's count goes sideways) */
  C.twinT-=dt;if(C.twinT<=0){C.twinT=26+Math.random()*16;for(let i=1;i<line.length;i++)if(line[i].def.trait==='twin'&&line[i-1].def.trait==='twin'&&line[i].v>.4){line[i].pass=1.6;bubble(M,line[i],'hee hee',1.6);C.swaps++;
      if(C.swaps===1||C.swaps===3)later(M,2.2,()=>{say(M,'you',L_.twins[0]);say(M,'Ana',L_.twins[1],{voice:'kid'});say(M,'Ava',L_.twins[2],{voice:'kid'})});break}}}

/* off the trail: errands (a dog, chalk, a sprint to the corner, sitting down), walking home, being gathered back in */
function freeStep(dt,M){const C=M.cg,a=A(),P=a.P;
  for(const k of C.kids){if(k.state!=='free'&&k.state!=='hand'&&k.state!=='stray')continue;const f=k.free;
    if(k.state==='hand'){/* Rosie: hand in hand at the dad's left */const r={x:Math.cos(P.yaw),z:-Math.sin(P.yaw)},fw={x:-Math.sin(P.yaw),z:-Math.cos(P.yaw)};
      const tx=P.pos.x-r.x*.62-fw.x*.12,tz=P.pos.z-r.z*.62-fw.z*.12,d0=hyp(tx-k.x,tz-k.z);k.x+=(tx-k.x)*Math.min(1,dt*9);k.z+=(tz-k.z)*Math.min(1,dt*9);k.mov=C.dadMov>.4;k.spd=C.dadMov;k.yaw=turn(k.yaw,P.yaw,dt*6);continue}
    if(k.state==='stray'){/* Kevin, before he spots the line */k.mov=false;k.spd=0;k.yaw=turn(k.yaw,yawTo(P.pos.x-k.x,P.pos.z-k.z),dt*2);continue}
    if(!f){k.state='line';continue}
    const dx=f.x-k.x,dz=f.z-k.z,dd=hyp(dx,dz);
    if(dd>.12&&f.mode!=='act'){const sp=Math.min(f.speed,dd*3+.4);k.x+=dx/dd*Math.min(dd,sp*dt);k.z+=dz/dd*Math.min(dd,sp*dt);k.yaw=turn(k.yaw,yawTo(dx,dz),dt*8);k.mov=true;k.spd=sp}
    else{k.mov=false;k.spd=0;if(f.face)k.yaw=turn(k.yaw,yawTo(f.face.x-k.x,f.face.z-k.z),dt*5);
      if(f.mode==='go'){f.mode='act';f.t=0;if(f.arrive)f.arrive(k)}
      else if(f.mode==='act'){f.t+=dt;if(f.tick)f.tick(k,dt);if(f.dur!=null&&f.t>=f.dur&&f.done){const g=f.done;f.done=null;g(k)}}
      else if(f.mode==='back'){joinLine(M,k)}}
    /* anybody waiting on their own comes back when the dad is right there */
    if(k.state==='free'&&f&&f.gatherable&&hyp(P.pos.x-k.x,P.pos.z-k.z)<TUNE.gatherR)gather(M,k)}}
function errand(M,k,o){k.hist=(k.hist||'')+'E'+(o.kind||o.mode||'')+';';k.state='free';k.free=Object.assign({mode:'go',speed:2.4,t:0,gatherable:true},o);k.v=0}
/* back in line: walk to the nearest trail point (behind the dad), then the chain takes over */
function rejoin(M,k,quick){const C=M.cg,p=C.trail.pts,head=trailHead(M);let best=null,bd=1e9;
  for(let i=p.length-1;i>=0&&head-p[i].s<90;i--){const q=p[i];if(q.road||head-q.s<1.2)continue;const d=hyp(q.x-k.x,q.z-k.z);if(d<bd){bd=d;best=q}}
  if(!best){k.state='line';k.s=Math.max(trailFirst(M),head-3);return}
  k.state='free';k.free={mode:'back',x:best.x,z:best.z,speed:quick?3.6:2.6,s:best.s,gatherable:false}}
function joinLine(M,k){k.hist=(k.hist||'')+'J@'+k.x.toFixed(1)+','+k.z.toFixed(1)+';';const f=k.free;k.state='line';k.s=f&&f.s!=null?f.s:trailHead(M)-2;k.free=null;k.v=1;k.fz=0}
function gather(M,k,whistle){if(k.state!=='free'||!k.free||!k.free.gatherable)return false;if(k.free.onGather&&k.free.onGather(k)===false)return false;M.cs.gathered++;
  if(!whistle&&Math.random()<.6)say(M,'you',pick(L_.gather));rejoin(M,k,true);return true}
/* the personalities: who wanders off where */
function traitStep(dt,M){const C=M.cg,a=A(),P=a.P;if(C.stage==='gear')return;
  for(const k of C.kids){if(k.state!=='line')continue;
    /* dogs, cats and chalk drawings within reach of the trail */
    for(const q of C.pois){if(q.for!==k.id||k.poiDone[q.id]||!q.obj)continue;if(hyp(q.x-k.x,q.z-k.z)>q.r)continue;k.poiDone[q.id]=1;poiErrand(M,k,q);break}
    if(k.state!=='line')continue;
    if(k.def.trait==='runner'&&C.stageN>=2&&!C.flareNear&&C.dadMov>2.4&&C.clock>(k.nextRun||40)&&Math.random()<dt*.08)dash(M,k);
    if(k.def.trait==='tired'&&!k.said.sat&&C.stageN>=3&&k.v>.5&&C.dadMov>.5&&C.clock>(C.tiredAt||0)&&Math.random()<dt*.05)tired(M,k);
    if(k.def.trait==='cracks'&&k.v>.5&&Math.random()<dt*.045)kidSay(M,k,pick(L_.cracks),{radio:Math.random()<.35});
    if(k.def.trait==='sign'&&C.sign.up&&!C.sign.asked&&Math.random()<dt*.5){C.sign.asked=1;kidSay(M,k,L_.sign[k.signI%L_.sign.length|0]||L_.sign[0]);later(M,1.6,()=>say(M,'you',L_.signNo[Math.min(L_.signNo.length-1,k.signI||0)]));k.signI=(k.signI||0)+1;later(M,25,()=>{C.sign.asked=0})}
    if(k.def.trait==='why'&&C.clock>(k.nextWhy||14)&&!C.talk.busy()){k.nextWhy=C.clock+22+Math.random()*14;const w=L_.why[k.whyI++%L_.why.length];kidSay(M,k,w[0]);say(M,'you',w[1])}}}
function poiErrand(M,k,q){const o=q.obj;const ox=q.kind==='chalk'?.0:Math.cos(q.ang||0)*.55,oz=q.kind==='chalk'?.0:Math.sin(q.ang||0)*.55;
  errand(M,k,{x:q.x+ox,z:q.z+oz+(q.kind==='chalk'?.0:0),speed:3.2,face:{x:q.x,z:q.z},dur:q.kind==='chalk'?5.5:6.5,kind:q.kind,crouch:true,
    arrive:kk=>{kidSay(M,kk,pick(q.kind==='dog'?L_.dog:q.kind==='cat'?L_.cat:L_.chalk));if(q.sun)q.sun.visible=true;if(q.kind!=='chalk'){q.happy=6.5;voice(q.kind==='dog'?'dog':'dog_whine',null,{vol:.5,pitch:q.kind==='cat'?1.6:1})}
      if(!M.cs.poiSaid[q.kind]){M.cs.poiSaid[q.kind]=1;later(M,1.4,()=>say(M,'you',q.kind==='dog'?"Theo. Theo. We talked about this. Every dog is not your dog.":q.kind==='cat'?"That's a cat, Theo.":"Jaylen, the sidewalk is not a canvas. ...Okay, it's a little bit a canvas."))}},
    done:kk=>{const C=M.cg,tail=lineKids(M).slice(-1)[0];const near=tail?hyp(tail.x-kk.x,tail.z-kk.z)<TUNE.rejoinR:hyp(A().P.pos.x-kk.x,A().P.pos.z-kk.z)<TUNE.rejoinR;
      if(near){rejoin(M,kk)}else{kk.free.dur=null;kk.free.wander=true;bubble(M,kk,q.kind==='chalk'?'(drawing)':'(petting)',99)}}})}
function dash(M,k){const a=A(),P=a.P,fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);let best=null;
  for(let d=3;d<=11;d+=.5){const x=P.pos.x+fx*d,z=P.pos.z+fz*d;if(isRoad(x,z)||!a.walkable(Math.floor(x/2),Math.floor(z/2)))break;best={x,z,d}}
  if(!best||best.d<6)return;k.nextRun=M.cg.clock+50;kidSay(M,k,"Race you!",{radio:false});
  errand(M,k,{x:best.x,z:best.z,speed:4.8,face:{x:P.pos.x,z:P.pos.z},dur:999,
    arrive:kk=>{kidSay(M,kk,pick(L_.dash));if(!M.cs.dashed){M.cs.dashed=1;later(M,1.5,()=>say(M,'you',"Dash! You stop at the line, you wait for the sign. That's the deal."))}},
    onGather:kk=>{kk.free={mode:'back',x:kk.x,z:kk.z,s:trailHead(M)-.6,gatherable:false};return false}})}
function tired(M,k){const C=M.cg;k.said.sat=1;kidSay(M,k,L_.rosieSit);later(M,1.8,()=>say(M,'you',"Your legs are not broken, Rosie."));later(M,3.6,()=>say(M,'Rosie',"They're a little broken.",{voice:'kid'}));
  errand(M,k,{x:k.x,z:k.z,speed:1,dur:999,crouch:true,sit:true,onGather:()=>false,gatherable:false,hand:true})}
function handRosie(M,k){k.state='hand';k.free=null;kidSay(M,k,"Okay. But you have to say I'm the fastest.");later(M,2,()=>say(M,'you',"You're the fastest, Rosie."));M.cs.hand=1}
/* a kid near their own stoop, with their grown-up at the door, peels off home */
function homeStep(dt,M){const C=M.cg,a=A(),P=a.P;
  for(const h of C.homes){if(h.grown)growStep(dt,M,h);const kids=C.kids.filter(k=>k.home===h&&k.state!=='home');if(!kids.length)continue;const dP=hyp(P.pos.x-h.x,P.pos.z-h.z);
    if(!h.grown&&dP<34&&!h.gone)grownUp(M,h);
    for(const k of kids){if(k.state!=='line'&&k.state!=='hand')continue;const dk=hyp(k.x-h.x,k.z-h.z);if(dk>7.5||dP>12||onRoadKid(k))continue;
      if(k.def.trait==='quiet'&&C.kids.some(o=>o!==k&&o.def.home&&o.state!=='home'&&o.state!=='homeward')){if(!k.said.notYet){k.said.notYet=1;kidSay(M,k,"I'm not last yet. I'm always last. It's my thing.")}continue}
      if(!h.grown||h.grownT<.6)continue;goHome(M,k,h)}}}
function goHome(M,k,h){const C=M.cg;k.state='homeward';k.free=null;if(k.def.trait==='tired')M.cs.hand=0;
  const twin=k.def.trait==='twin';const off=twin?(k.id==='ana'?-.35:.35):0;k.walk={x:h.stoop.x+off,z:h.stoop.z,t:0,phase:'to'}}
function homewardStep(dt,M){const C=M.cg,a=A(),P=a.P;
  for(const k of C.kids){if(k.state!=='homeward')continue;const w=k.walk,h=k.home;w.t+=dt;
    if(w.phase==='to'){const dx=w.x-k.x,dz=w.z-k.z,dd=hyp(dx,dz);if(dd>.1){const sp=Math.min(2.6,dd*3+.5);k.x+=dx/dd*Math.min(dd,sp*dt);k.z+=dz/dd*Math.min(dd,sp*dt);k.yaw=turn(k.yaw,yawTo(dx,dz),dt*8);k.mov=true;k.spd=sp}
      else{w.phase='wave';w.t=0;k.mov=false;arrived(M,k,h)}}
    else if(w.phase==='wave'){k.mov=false;k.yaw=turn(k.yaw,yawTo(P.pos.x-k.x,P.pos.z-k.z),dt*5);if(w.t>(k.def.trait==='quiet'?6.5:k.def.trait==='sign'?5:3.2)){w.phase='in';w.t=0}}
    else if(w.phase==='in'){const dx=h.door.x-k.x,dz=h.door.z-k.z,dd=hyp(dx,dz);if(dd>.08){k.x+=dx/dd*Math.min(dd,1.4*dt);k.z+=dz/dd*Math.min(dd,1.4*dt);k.yaw=turn(k.yaw,yawTo(dx,dz),dt*8);k.mov=true;k.spd=1.4}
      else{k.state='home';k.mov=false;if(k.d)k.d.root.visible=false;if(k.signProp){k.signProp.parent&&k.signProp.parent.remove(k.signProp);k.signProp=null}}}}}
/* the moment at the stoop: porch light, a wave, a line from home, trust for the block */
function arrived(M,k,h){const C=M.cg,a=A();if(M.cs.home.includes(k.id))return;M.cs.home.push(k.id);if(k.d)try{a.HUD;HT.People.interact&&HT.People.interact(k.d)}catch(_){}
  if(h.lamp&&!h.lit){h.lit=true;lanternOn(M,h.lamp,true);tone({f:660,type:'sine',d:.12,gain:.03,at:.25})}
  const ow=OWm();a.addTrust(1,'river');let bt=null;
  /* the block feels it: re-dress Riverside at the new trust (lamps, stoops, planters follow their block) and read this block's trust back */
  try{const H=G();if(ow&&ow.dress&&H.prog)ow.dress(H.prog.trustR||0);bt=ow&&ow.blockTrust?Math.round(ow.blockTrust(h.x,h.z)):null}catch(_){}chime();const n=M.cs.home.length,tot=KIDS.length;
  a.feed(k.name+' is home','trust','+1 Riverside trust'+(bt!=null?' · this block '+bt+'%':'')+' · '+n+'/'+tot);
  const lines=HOME_LINES[k.id];if(lines)for(const[w,t]of lines)say(M,w==='kid'?k.name:w==='grown'?(h.who||'Neighbour'):w,t,w==='kid'?{voice:'kid'}:{});
  if(k.def.trait==='sign')benjiSign(M,k);
  M.score=n;if(n>=tot)C.allHome=true}
const HOME_LINES={
  priya:[['grown',"Priya! Did you step on any?"],['kid',"Zero. Well. One. It was a small one."]],
  wen:[['grown',"You're home early. Is everything okay?"],['you',"Everything's perfect."],['kid',"Why is everything perfect?"]],
  jaylen:[['grown',"Is that chalk on your knees?"],['kid',"It's art on my knees."]],
  theo:[['grown',"Biscuit's been waiting at the door for an hour."],['kid',"BISCUIT!"]],
  ana:[['grown',"Which one of you is which today?"],['you',"Honestly, ma'am? I stopped knowing at 3rd St."]],
  benji:[['kid',"Can I hold it now?"],['you',"...Yeah, Benji. You can hold it now."]],
  dash:[['grown',"Did he run?"],['you',"He stopped at every line."],['kid',"EVERY line!"]],
  rosie:[['grown',"Was she any trouble?"],['you',"She's the fastest, ma'am."]],
  malik:[['grown',"Malik. Mom says get inside. And thank the man."],['kid',"...Thanks, Mr. Minivan."]],
  gloria:[['kid',"My brother used to do the laundromat thing. He works at the auto shop now."],['you',"I know."],['grown',"Thanks for walking her. Tell Sal I'll be in at seven."]]};
function benjiSign(M,k){const C=M.cg;if(!k.d)return;const s=stopSign(M,.78);const h=boneW(k.d,'Bip01_R_Hand'),r=k.d.root.position;s.position.set(0,0,0);
  try{onBone(k.d,s,'Bip01_R_Hand',[ (h.x-r.x),(h.y-r.y)-.1,(h.z-r.z)])}catch(_){k.d.root.add(s)}k.signProp=s;C.sign.lent=4.2;bubble(M,k,'STOP!',3)}
/* grown-ups: out the door when the line is near, wave at the dad, back in with their kid */
function grownUp(M,h){const C=M.cg;const g=h.who0;if(!g)return;const d=person(M,g.key,{idle:g.key==='thug_cap'?'idle':'idle_arms_folded'});h.grown=d;h.grownT=0;h.waved=0;if(!d)return;
  d.root.position.set(h.door.x,ground(h.door.x,h.door.z),h.door.z);d.root.rotation.y=h.yaw+Math.PI}
function growStep(dt,M,h){const C=M.cg,a=A(),P=a.P,d=h.grown;if(!d)return;h.grownT+=dt;const kids=C.kids.filter(k=>k.home===h);const inside=kids.length&&kids.every(k=>k.state==='home');
  const r=d.root;if(inside){h.inT=(h.inT||0)+dt;const tx=h.door.x,tz=h.door.z+(h.fz>0?-.5:.5);r.position.x+=(tx-r.position.x)*Math.min(1,dt*2);r.position.z+=(tz-r.position.z)*Math.min(1,dt*2);a.pose(d,dt,{moving:true,speed:.7,aim:false});
    if(h.inT>1.2){r.visible=false;if(r.parent)r.parent.remove(r);h.grown=null;h.gone=true}return}
  const near=hyp(P.pos.x-r.position.x,P.pos.z-r.position.z);const tgt=near<16?yawTo(P.pos.x-r.position.x,P.pos.z-r.position.z)+Math.PI:h.yaw+Math.PI;r.rotation.y=turn(r.rotation.y,tgt,dt*3);
  if(near<14&&h.grownT>1&&(h.waved||0)<2&&C.clock>(h.waveAt||0)){h.waveAt=C.clock+6;h.waved++;try{HT.People.interact&&HT.People.interact(d)}catch(_){}}
  a.pose(d,dt,{moving:false,aim:false})}

/* ---------------- traffic: the job's own cars on the streets around the line ----------------
   Straight lanes (2nd St's turn onto Ash), a cruise speed, comfortable and hard braking, queues, one car at a time through each
   intersection box. They stop for anyone in the lane; they stop for the raised sign within 25 m if they can do it comfortably (a
   driver on the phone takes 3 s to notice); a car that has to stand on its brakes for a kid ends the job ("Too close"). */
const LANE={};for(const l of LANES){const c=[0];for(let i=1;i<l.pts.length;i++)c.push(c[i-1]+hyp(l.pts[i][0]-l.pts[i-1][0],l.pts[i][1]-l.pts[i-1][1]));LANE[l.id]={id:l.id,st:l.st,pts:l.pts,cum:c,len:c[c.length-1]}}
function laneAt(L,s){s=clamp(s,0,L.len);let i=1;while(i<L.cum.length-1&&L.cum[i]<s)i++;const a=L.pts[i-1],b=L.pts[i],l=L.cum[i]-L.cum[i-1]||1,t=(s-L.cum[i-1])/l;
  return{x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,dx:(b[0]-a[0])/l,dz:(b[1]-a[1])/l,i,toCorner:i<L.cum.length-1?L.cum[i]-s:1e9}}
function laneProj(L,x,z){let best={s:0,d:1e9};for(let i=1;i<L.pts.length;i++){const a=L.pts[i-1],b=L.pts[i],dx=b[0]-a[0],dz=b[1]-a[1],l2=dx*dx+dz*dz,t=clamp(((x-a[0])*dx+(z-a[1])*dz)/l2,0,1),px=a[0]+dx*t,pz=a[1]+dz*t,d=hyp(px-x,pz-z);
    if(d<best.d)best={s:L.cum[i-1]+Math.sqrt(l2)*t,d}}return best}
const CAR_TYPES=['sedan','hatch','suv','sedan','pickup','hatch','workvan'],CAR_COLS=['#b9c0c7','#8a2f2a','#2e4a6b','#d8d4c8','#3d4a3a','#6d7378','#7a5a3a','#c9b48a','#2b2f36','#9a4f8f'];
function trafficStep(dt,M){const C=M.cg,a=A(),P=a.P,Tr=C.traffic;if(!Tr)return;
  if(!Tr.off){/* spawn on the lanes near the line */for(const id in LANE){const L=LANE[id];const t=Tr.t[id]=(Tr.t[id]==null?Math.random()*3:Tr.t[id])-dt;if(t>0)continue;
      const pr=laneProj(L,P.pos.x,P.pos.z);if(pr.d>TUNE.traffic.near){Tr.t[id]=1.5;continue}Tr.t[id]=TUNE.traffic.gap[0]+Math.random()*(TUNE.traffic.gap[1]-TUNE.traffic.gap[0])*(C.rush||1);
      if(Tr.cars.length>=TUNE.traffic.max)continue;const s0=Math.max(0,pr.s-TUNE.traffic.spawnBack),q=laneAt(L,s0);if(hyp(q.x-P.pos.x,q.z-P.pos.z)<TUNE.traffic.minSpawnD)continue;
      if(Tr.cars.some(c=>c.lane===L&&Math.abs(c.s-s0)<16))continue;spawnCar(M,L,s0)}}
  const people=[{x:P.pos.x,z:P.pos.z,dad:true}];for(const k of C.kids)if(k.d&&k.state!=='home'&&k.state!=='mill'&&k.state!=='stray'&&isRoad(k.x,k.z))people.push({x:k.x,z:k.z,kid:k});/* the sidewalk is safe: only kids on the street count */
  if(M.car&&M.car.pos)people.push({x:M.car.pos.x,z:M.car.pos.z,van:true});
  /* who is in each intersection box */for(const b of Tr.boxes){b.occ=null}for(const c of Tr.cars)for(const b of Tr.boxes)if(inRect(c.x,c.z,b.r,.6)){if(!b.occ)b.occ=c}
  for(let ci=Tr.cars.length-1;ci>=0;ci--){const c=Tr.cars[ci],L=c.lane,q=laneAt(L,c.s),fx=q.dx,fz=q.dz,half=TUNE.car.len/2;
    let limit=c.rick?7:TUNE.car.cruise;if(q.toCorner<14)limit=Math.min(limit,4.5+q.toCorner*.3);if(c.stopS!=null)limit=Math.min(limit,Math.sqrt(2*TUNE.car.brake*Math.max(0,c.stopS-c.s)));
    let d=1e9,why=null,kidHit=null;
    for(const o of Tr.cars){if(o===c)continue;if(o.lane===L){if(o.s>c.s){const g=o.s-c.s-TUNE.car.len-TUNE.car.queue;if(g<d){d=g;why='car'}}}
      else{const rx=o.x-c.x,rz=o.z-c.z,ah=rx*fx+rz*fz,lat=Math.abs(rx*fz-rz*fx);if(ah>0&&ah<14&&lat<1.9){const g=ah-TUNE.car.len-1;if(g<d){d=g;why='car'}}}}
    for(const p of people){const rx=p.x-c.x,rz=p.z-c.z,ah=rx*fx+rz*fz,lat=Math.abs(rx*fz-rz*fx),sl=-rx*fz+rz*fx;if(ah<=-.5||ah>45)continue;
      if(p.van){if(lat<1.9){const g=ah-TUNE.car.len-1.5;if(g<d){d=g;why='van'}}continue}
      if(p.kid?(sl>-4.6&&sl<.95):lat<1.3){/* a kid anywhere in this street ahead (lane to the far kerb): every driver stops */const g=ah-half-1.2;if(g<d){d=g;why=p.kid?'kid':'dad';kidHit=p.kid&&Math.abs(sl)<1.45?p.kid:null;if(p.kid&&!kidHit)why='kidfar'}}}
    /* the sign: you in or beside the road, ahead of the car, paddle up */
    c.forSign=false;if(C.sign.up&&!c.rick){const rx=P.pos.x-c.x,rz=P.pos.z-c.z,ah=rx*fx+rz*fz,lat=Math.abs(rx*fz-rz*fx);
      if(ah>half&&ah<TUNE.signR+half&&lat<TUNE.signLat){c.signSeen+=dt;const g=ah-half-TUNE.signStop;const need=c.v*c.v/(2*Math.max(.05,g));
        if((!c.phone||c.signSeen>=TUNE.phoneT)&&(c.signOk||need<5.2)){c.signOk=true;if(g<d){d=g;why='sign'}c.forSign=true}}else{c.signSeen=Math.max(0,c.signSeen-dt*.5);if(ah<half)c.signOk=false}}
    else{c.signSeen=Math.max(0,c.signSeen-dt*.5);c.signOk=false}
    /* one car at a time through an intersection */
    for(const b of Tr.boxes){if(b.occ===c||!b.occ||b.occ.lane.st===L.st)continue;const cx=(b.r[0]+b.r[2])/2,cz=(b.r[1]+b.r[3])/2,rx=cx-c.x,rz=cz-c.z,ah=rx*fx+rz*fz,lat=Math.abs(rx*fz-rz*fx);
      if(ah>0&&ah<14&&lat<3.5&&!inRect(c.x,c.z,b.r,.3)){const g=ah-3.6-half;if(g<d){d=g;why='box'}}}
    const need=c.v*c.v/(2*Math.max(.05,d));c.why=d<30?why:null;
    if(why==='kid'&&kidHit&&c.v>2.5&&need>TUNE.nearMissDecel&&!C.nearMiss){nearMiss(M,c,kidHit)}
    let tv=Math.min(limit,d<1e8?Math.sqrt(2*TUNE.car.brake*Math.max(0,d)):limit);if(d<.15)tv=0;
    const br=need>TUNE.car.brake?Math.min(TUNE.car.hard*1.4,need*1.05):TUNE.car.brake;c.braking=tv<c.v-.05;
    if(tv<c.v)c.v=Math.max(tv,c.v-br*dt);else c.v=Math.min(tv,c.v+TUNE.car.acc*dt);if(d<=.02)c.v=0;
    c.s+=c.v*dt;if(d<1e8&&c.v===0&&d<0)c.s+=0;
    const q2=laneAt(L,c.s),q3=laneAt(L,c.s+2.5);c.x=q2.x;c.z=q2.z;const yaw=yawTo(q3.x-q2.x,q3.z-q2.z);c.yaw=c.yaw==null?yaw:turn(c.yaw,yaw,dt*6);
    /* waiting: count it, honk now and then */
    if(c.v<.2&&(why==='sign'||why==='kid'||why==='kidfar'||why==='dad')){c.waitT+=dt;if(c.waitT>TUNE.car.honkT&&C.clock>(c.honkAt||0)){c.honkAt=C.clock+7;horn(c.waitT>16?'long':'double');M.cs.honks++;if(Math.random()<.6)say(M,'you',pick(L_.honk))}
      if(why==='sign'&&!c.spoke&&Math.random()<dt*.35){c.spoke=1;driverLine(M,c)}}else if(c.v>2)c.waitT=0;
    c.obj.position.set(c.x,ground(c.x,c.z),c.z);c.obj.rotation.set(0,c.yaw+Math.PI/2,0);
    const VM=window.HT&&HT.Vehicles;if(VM&&VM.update)try{VM.update(c.obj,{speed:c.v,steer:0,braking:c.braking||c.v<.1,headlights:C.dusk>.3,dt})}catch(_){}
    if(c.col){const ax=Math.abs(fx),az=Math.abs(fz),hx=ax*2.2+az*.95,hz=az*2.2+ax*.95;Object.assign(c.col,{x0:c.x-hx,x1:c.x+hx,z0:c.z-hz,z1:c.z+hz})}
    if(c.s>=L.len-1||c.gone){removeCar(M,c);Tr.cars.splice(ci,1)}}}
function spawnCar(M,L,s,o){const C=M.cg,a=A();o=o||{};const k=(C.carN=(C.carN||0)+1);const type=o.type||CAR_TYPES[k%CAR_TYPES.length],col=o.color||CAR_COLS[(k*3)%CAR_COLS.length];
  let obj=null;try{obj=a.makeVehicle(type,col)}catch(_){obj=null}if(!obj){try{obj=a.makeVanBox(col)}catch(_){obj=null}}if(!obj)return null;
  C.root.add(obj);const q=laneAt(L,s);const c={lane:L,s,v:o.v!=null?o.v:TUNE.car.cruise*.85,obj,type,x:q.x,z:q.z,yaw:yawTo(q.dx,q.dz),phone:o.phone!=null?o.phone:(k>2&&Math.random()<.24),signSeen:0,waitT:0,gary:!!o.gary,rick:!!o.rick,stopS:o.stopS,spoke:0};
  try{c.col=a.wmCol({x0:0,z0:0,x1:0,z1:0,h:1.5})}catch(_){c.col=null}
  C.traffic.cars.push(c);return c}
function removeCar(M,c){if(c.obj&&c.obj.parent)c.obj.parent.remove(c.obj);if(c.col)Object.assign(c.col,{x0:-1e4,z0:-1e4,x1:-1e4,z1:-1e4})}
function driverLine(M,c){const C=M.cg;if(c.phone){say(M,'you',pick(L_.phone));return}
  if(!M.cs.garySaid&&C.stageN>=3){M.cs.garySaid=1;say(M,'Driver',"Is that a real stop sign?");say(M,'you',"It's real enough for you, Gary.");say(M,'gary',"Sorry! Sorry.");return}
  if(Math.random()<.5)say(M,'Driver',pick(L_.driver))}
function nearMiss(M,c,k){const C=M.cg;C.nearMiss=true;if(typeof window!=='undefined')window.__cgNM={kid:k.id,st:k.state,k:[+k.x.toFixed(2),+k.z.toFixed(2)],car:[+c.x.toFixed(1),+c.z.toFixed(1),c.lane.id,+c.v.toFixed(1)],road:roadTile(k.x,k.z),tp:(q=>[+q.x.toFixed(2),+q.z.toFixed(2),isRoad(q.x,q.z)])(trailAt(M,k.s)),dad:[+A().P.pos.x.toFixed(1),+A().P.pos.z.toFixed(1)],kerb:!!k.kerb,v:+k.v.toFixed(2),hist:k.hist};M.cs.nearMiss++;screech();horn('long');c.v=Math.min(c.v,1.5);
  /* the car stops short of the kid, every time: nothing happens to anyone, but that was too close */
  const fx=-Math.sin(c.yaw),fz=-Math.cos(c.yaw),ah=(k.x-c.x)*fx+(k.z-c.z)*fz,stopAt=ah-TUNE.car.len/2-1;if(stopAt<0)c.s+=stopAt;c.v=0;c.stopS=c.s;
  k.fz=3;kidSay(M,k,"!!",{radio:false,bub:'!!'});say(M,'you',"WHOA. WHOA. Everybody stop.",{now:true});
  later(M,1.6,()=>{if(M.state==='go')A().endMission(false,"Too close. Nobody got hurt, and nobody's going to. Let's go back and do that crossing properly.","Too close.")})}

/* ---------------- the flare-up on 2nd St ----------------
   Two crews shout at each other across 2nd St between Ash and Mill. Tension builds while both are there; at the top it flares
   (they step to the kerb and get loud: kids who can see it within 18 m freeze, unless they're behind your raised sign).
   No weapons, no fighting, ever: this is pressure to route around. The sign held at a group within 13 m makes them step back
   against the wall and cools things off. Talk a group down (E, sign lowered) and they stand down for good. Every ~50 s one crew
   wanders to the corner store for ~24 s (outwait it). Coach Rick (call-in, once) breaks the whole thing up with his whistle. */
const FC={x:347,z:86};
function crewsBuild(M){const C=M.cg;C.crews={};for(const id of['A','B']){const def=CREWS[id],g={id,def,members:[],state:'posture',t:0,said:{},aside:0,lineT:3+Math.random()*4};
    def.spots.forEach((sp,i)=>{const d=person(M,def.keys[i],{idle:i===1?'idle_angry':'idle_nervous'});if(d){try{armband(M,d,def.band)}catch(_){}}
      const m={d,g,i,home:{x:sp.x,z:sp.z},x:sp.x,z:sp.z,yaw:yawTo(-def.side,0),tx:sp.x,tz:sp.z};try{m.col=A().wmCol({x0:0,z0:0,x1:0,z1:0,h:1.8})}catch(_){m.col=null}g.members.push(m)});
    C.crews[id]=g}
  C.flare={heat:.35,flareT:0,n:0,storeT:TUNE.flare.storeEvery*.6,storeG:'B',quiet:0}}
function crewPresent(g){return g&&(g.state==='posture'||g.state==='aside')}
function crewCentre(g){let x=0,z=0;for(const m of g.members){x+=m.x;z+=m.z}return{x:x/g.members.length,z:z/g.members.length}}
function flareStep(dt,M){const C=M.cg,a=A(),P=a.P,F=C.flare;if(!F)return;const cA=C.crews.A,cB=C.crews.B;
  const dF=hyp(P.pos.x-FC.x,P.pos.z-FC.z);C.flareNear=dF<30;C.threatNear=false;
  const both=crewPresent(cA)&&crewPresent(cB);const fw={x:-Math.sin(P.yaw),z:-Math.cos(P.yaw)};
  for(const g of[cA,cB]){if(!crewPresent(g))continue;const c=crewCentre(g),dx=c.x-P.pos.x,dz=c.z-P.pos.z,dd=hyp(dx,dz);if(dd<22)C.threatNear=true;
    const facing=(dx*fw.x+dz*fw.z)/(dd||1)>.45;
    if(C.sign.up&&dd<TUNE.flare.thinkR&&facing){g.aside=2.5;F.heat=Math.max(0,F.heat-TUNE.flare.signCool*dt);if(!g.saidThink||C.clock>g.saidThink){g.saidThink=C.clock+18;say(M,g.def.name,pick(L_.think));if(!M.cs.thought){M.cs.thought=1;later(M,1.8,()=>say(M,'you',"That's right. It's a sign. Signs are the law. Sort of."))}}}
    g.aside=Math.max(0,g.aside-dt);g.state=g.aside>0?'aside':'posture'}
  if(C.stageN>=2&&both&&F.flareT<=0){F.heat+=dt*TUNE.flare.rate*(dF<55?1:.5)}else if(F.flareT<=0)F.heat=Math.max(0,F.heat-dt*.04);
  if(F.heat>=1&&F.flareT<=0&&both){F.flareT=TUNE.flare.len;F.heat=TUNE.flare.after;F.n++;M.cs.flares++;if(dF<45){tone({f:120,to:90,type:'sawtooth',d:.4,gain:.04});say(M,'Coupon Boys',pick(["You want to DO this?!","Say it again! SAY IT!","Back UP, man!"]),{now:true});say(M,'Dock St Discount',pick(["Make me!","You back up!","Oh, it's like that?!"]))}
    if(dF<40&&!M.cs.flareTip){M.cs.flareTip=1;later(M,2.4,()=>say(M,'you',"Okay. Sign up. Everybody behind the sign. We go when they quiet down."))}}
  if(F.flareT>0){F.flareT-=dt;if(!both)F.flareT=0}
  /* outwait: one crew goes to the corner store now and then */
  if(both&&C.stageN>=2&&F.flareT<=0){F.storeT-=dt;if(F.storeT<=0){const g=C.crews[F.storeG];F.storeG=F.storeG==='A'?'B':'A';F.storeT=TUNE.flare.storeEvery;g.state='store';g.storeT=TUNE.flare.storeFor;g.storeHome=true;
      if(dF<60){say(M,g.def.name,pick(["I'm getting chips. Don't nobody move.","Corner store. Hold my spot.","I'm hungry. This ain't over."]));if(!M.cs.storeTip){M.cs.storeTip=1;later(M,2,()=>say(M,'you',"One bunch went for chips. That's our window, ducklings."))}}}}
  for(const g of[cA,cB])crewMembers(dt,M,g);
  /* kids who see it get scared (behind the raised sign, they don't) */
  const loud=F.flareT>0;for(const k of C.kids){if(k.state!=='line'&&k.state!=='hand')continue;let scare=0;
    for(const g of[cA,cB]){if(!crewPresent(g)&&g.state!=='flare')continue;for(const m of g.members){const d=hyp(m.x-k.x,m.z-k.z);if(loud&&d<TUNE.flare.freezeR)scare=Math.max(scare,1.4);else if(!loud&&g.state==='posture'&&d<2.3)scare=Math.max(scare,.9)}}
    if(scare>0&&shielded(M,k))scare=0;if(scare>0){if(k.fz<=0){M.cs.frozen++;if(!k.said.fz||C.clock>k.said.fz){k.said.fz=C.clock+20;kidSay(M,k,pick(L_.freeze),{radio:Math.random()<.5})}}k.fz=Math.max(k.fz,scare)}}
  for(const k of C.kids)if(k.fz>0){k.fz-=dt;if(C.sign.up&&hyp(k.x-P.pos.x,k.z-P.pos.z)<5)k.fz-=dt*1.5;if(k.fz<=0&&C.sign.up&&!C.calmSaid){C.calmSaid=1;say(M,'you',pick(L_.calm));later(M,30,()=>{C.calmSaid=0})}}
  /* posturing chatter when you're close enough to hear it */
  if(dF<34&&both&&F.flareT<=0){for(const g of[cA,cB]){g.lineT-=dt;if(g.lineT<=0){g.lineT=7+Math.random()*6;say(M,g.def.name,pick(g.id==='A'?L_.crewA:L_.crewB),{low:true})}}}}
function shielded(M,k){const C=M.cg,P=A().P;if(!C.sign.up)return false;const dk=hyp(k.x-P.pos.x,k.z-P.pos.z);if(dk>7.5)return false;
  for(const id of['A','B']){const g=C.crews[id];if(!crewPresent(g))continue;const c=crewCentre(g);if(hyp(c.x-k.x,c.z-k.z)<hyp(c.x-P.pos.x,c.z-P.pos.z)-.4)return false}return true}
function crewMembers(dt,M,g){const C=M.cg,a=A(),P=a.P,F=C.flare,def=g.def;
  if(g.state==='store'){g.storeT-=dt;if(g.storeT<=0&&g.storeHome){g.state='back'}}
  for(const m of g.members){let tx=m.home.x,tz=m.home.z,face=yawTo(-def.side,0),sp=1.3,mode='stand';
    if(g.state==='aside'){tx=def.wall+(def.side<0?.15:-.15);tz=m.home.z+(m.i-1)*.35;face=yawTo(def.side,0)+(m.i-1)*.6}
    else if(g.state==='posture'&&F.flareT>0){tx=m.home.x-def.side*.55;face=yawTo(-def.side,0)}
    else if(g.state==='down'){tx=def.wall+(def.side<0?.25:-.25);tz=m.home.z+(m.i-1)*.6;face=yawTo(-def.side,0)+(m.i-1)*.3;mode=m.i===1?'sit':'stand'}
    else if(g.state==='store'){tx=def.store.x+(m.i-1)*.6;tz=def.store.z+m.i*.8;sp=1.6}
    else if(g.state==='back'){tx=m.home.x;tz=m.home.z;sp=1.6}
    else if(g.state==='scatter'||g.state==='gone'){tx=m.away.x;tz=m.away.z;sp=2.4}
    const dx=tx-m.x,dz=tz-m.z,dd=hyp(dx,dz);let moving=false;if(dd>.08){const st=Math.min(dd,sp*dt);m.x+=dx/dd*st;m.z+=dz/dd*st;m.yaw=turn(m.yaw,yawTo(dx,dz),dt*7);moving=st>dt*.3}else m.yaw=turn(m.yaw,face,dt*4);
    if(m.d){m.d.root.position.set(m.x,ground(m.x,m.z)-(mode==='sit'?.02:0),m.z);m.d.root.rotation.y=m.yaw+Math.PI;a.pose(m.d,dt,{moving,speed:sp/1.3,aim:false,mode:mode==='sit'?'sit':'stand'});m.d.root.visible=g.state!=='gone'||dd>.5}
    if(m.col){if(g.state==='gone'||g.state==='store'&&dd>3)Object.assign(m.col,{x0:-1e4,z0:-1e4,x1:-1e4,z1:-1e4});else Object.assign(m.col,{x0:m.x-.24,x1:m.x+.24,z0:m.z-.24,z1:m.z+.24})}}
  if(g.state==='back'&&g.members.every(m=>hyp(m.x-m.home.x,m.z-m.home.z)<.3))g.state='posture';
  if(g.state==='scatter'&&g.members.every(m=>hyp(m.x-m.away.x,m.z-m.away.z)<.6)){g.state='gone';for(const m of g.members)if(m.d)m.d.root.visible=false}}
/* talking a crew down: E near them, sign lowered; three lines, one dad joke, real talk always lands with one of them */
const TALKS={
  A:{speaker:'Coupon Boys',color:'#2aa39a',prompt:"\"Can we help you, Dad?\"",tell:'arms folded, bored of each other',
    options:[{text:"Fellas. Kids. Here. Two minutes, then you can go back to whatever this is.",reg:'real',win:true,reply:[['Coupon Boys',"...Fine. Two minutes."],['Coupon Boys',"Two. Then we're back to it."]]},
      {text:"Whoever's corner this is, I'd like to speak to the manager.",reg:'joke',win:false,reply:[['Coupon Boys',"...Did he just ask for our manager?"],['Coupon Boys',"Get your ducklings off our block, man."]]},
      {text:"Move. Now.",reg:'tough',win:false,heat:.35,reply:[['Coupon Boys',"Or what? You'll call our moms?"],['you',"...I might."]]}]},
  B:{speaker:'Dock St Discount',color:'#e0a82e',prompt:"\"Is that a stop sign?\"",tell:'defensive, watching the other side',
    options:[{text:"There are kids here. Can we not.",reg:'real',win:true,reply:[['Dock St Discount',"...Fine. Two minutes."],['Dock St Discount',"Hey. Is that Malik? Malik, get home."]]},
      {text:"I've got eleven kids, one sign, and this vest is giving me a rash. Please.",reg:'over',win:true,reply:[['Dock St Discount',"A rash? Man. Okay. Go. Go."],['Dock St Discount',"Put some cream on that."]]},
      {text:"You guys ever think about carpooling? Less yelling.",reg:'joke',win:false,heat:.2,reply:[['Dock St Discount',"Did he just say carpool?"],['Dock St Discount',"My mom says you guys are the minivan gang."],['you',"We prefer 'carpool'."]]}]}};
function talkOpen(M,g){const C=M.cg,a=A(),HD=a.HUD;if(C.talking)return;const T=TALKS[g.id];const order=[0,1,2].sort(()=>Math.random()-.5);const opts=order.map(i=>T.options[i]);
  C.talking={g,opts,busy:false};say(M,'you',g.id==='A'?"Gentlemen. Quick word.":"Evening. Quick word, fellas.",{now:true});
  const kit=HD&&HD.kit&&HD.kit.choices?HD.kit.choices({speaker:T.speaker,color:T.color,prompt:T.prompt,tell:T.tell,options:opts.map(o=>({text:o.text,reg:o.reg})),onPick:(i)=>talkPick(M,i)}):null;
  C.talking.kit=kit;if(kit)a.overlay('crossing-talk',kit.el)}
function talkPick(M,i){const C=M.cg,Tk=C.talking;if(!Tk||Tk.busy)return;const op=Tk.opts[i];if(!op)return;Tk.busy=true;const g=Tk.g;M.cs.talks++;
  say(M,'you',op.text,{now:true});for(const[w,t]of op.reply)say(M,w,t);
  later(M,1.2,()=>{if(op.win){g.state='down';M.cs.talked[g.id]=1;g.aside=0;voice('thug_laugh',null,{vol:.4});const n=(M.cs.talked.A?1:0)+(M.cs.talked.B?1:0);A().feed(g.def.name+' stood down','trust',n>=2?'both crews · nobody raised their voice':'one crew to go');
      if(g.id==='B'&&!M.cs.malik){M.cs.malik=1;const mk=C.kids.find(k=>k.id==='malik'&&k.state!=='home');if(mk)later(M,3.5,()=>kidSay(M,mk,"...Yeah. Okay. I'm going."))}
      if(n>=2&&!M.cs.bothSaid){M.cs.bothSaid=1;later(M,4,()=>say(M,'you',"Two minutes. That's all anybody needed."))}}
    else{g.cool=C.clock+8;C.flare.heat=Math.min(.95,C.flare.heat+(op.heat||.15))}});
  later(M,2.8,()=>talkClose(M))}
function talkClose(M){const C=M.cg;if(!C||!C.talking)return;if(C.talking.kit)try{A().overlay('crossing-talk',null)}catch(_){}C.talking=null}
/* Coach Rick: one phone call, his minivan, his whistle. It ends the flare-up (and the gold medal) */
function callRick(M){const C=M.cg;if(M.cs.rick||!C.crews||C.stageN<2)return;const live=['A','B'].some(id=>crewPresent(C.crews[id]));if(!live)return;M.cs.rick=1;
  say(M,'you',"Rick. It's me. 2nd St, between Ash and Mill. Bring the whistle.",{now:true});say(M,'rick',"Say no more. I'm two blocks out. I was ALREADY wearing the whistle.");
  const L=LANE['2ndN'];const pr=laneProj(L,FC.x,FC.z);const car=spawnCar(M,L,Math.max(0,pr.s-70),{type:'minivan',color:'#3d5a80',rick:true,phone:false,stopS:pr.s-1,v:8});if(car)C.rickCar=car;C.rickT=0}
function rickStep(dt,M){const C=M.cg,c=C.rickCar;if(!c)return;C.rickT+=dt;
  if(!c.arrived&&c.v<.2&&c.stopS!=null&&c.s>c.stopS-1.5){c.arrived=true;horn('triple');whistleSnd();later(M,.5,whistleSnd);say(M,'rick',L_.rick[0],{now:true});say(M,'rick',L_.rick[1]);
    later(M,1.6,()=>{for(const id of['A','B']){const g=C.crews[id];if(g.state==='gone'||g.state==='down')continue;g.state='scatter';g.members.forEach((m,i)=>{m.away={x:m.home.x,z:id==='A'?66.2-i*.9:112+i*.9}})}say(M,'Coupon Boys',pick(L_.rickCrew))});
    later(M,6,()=>{c.stopS=null;say(M,'rick',"Coach Rick, out. Hydrate, ducklings!")})}}

/* ---------------- the HUD: the headcount strip (always right; funny when the number isn't what it should be) and speech bubbles ---------------- */
const CSS=`.cgx{position:absolute;inset:0;pointer-events:none;font-family:inherit}
.cgx-card{position:absolute;right:22px;bottom:186px;display:flex;align-items:center;gap:12px;padding:8px 12px 8px 14px;border-radius:14px;background:rgba(14,18,26,.62);backdrop-filter:blur(6px);box-shadow:0 6px 24px rgba(0,0,0,.28);color:#f4f1ea}
.cgx-n{display:flex;flex-direction:column;align-items:flex-start;min-width:92px}.cgx-k{font-size:10px;letter-spacing:.14em;opacity:.75;font-weight:700}
.cgx-big{font-size:26px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}.cgx-big small{font-size:15px;opacity:.65;font-weight:700}.cgx-big.warn{color:#ffcf5a}.cgx-big.bad{color:#ff7b6b}
.cgx-sub{font-size:11px;opacity:.85;max-width:200px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cgx-row{display:flex;gap:5px;align-items:flex-end}.cgx-c{position:relative;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff!important;text-shadow:0 1px 2px rgba(0,0,0,.45);box-shadow:inset 0 -2px 0 rgba(0,0,0,.18),0 1px 3px rgba(0,0,0,.35);transition:transform .2s,opacity .3s}
.cgx-c.out{background:transparent!important;border:2px dashed currentColor;box-shadow:none;animation:cgxb 1s infinite}.cgx-c.fz{outline:2px solid #9fd3ff;outline-offset:1px}.cgx-c.lost{animation:cgxp .6s infinite}
.cgx-c.home{opacity:.38;transform:scale(.82)}.cgx-c.home::after{content:'';position:absolute;right:-3px;bottom:-3px;width:11px;height:11px;border-radius:50%;background:#6fd08c url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M2 5.2l2 2 4-4.4' stroke='white' stroke-width='1.6' fill='none'/%3E%3C/svg%3E") center/9px no-repeat}
.cgx-c.kev{width:20px;height:20px;font-size:10px}.cgx-c i{position:absolute;bottom:-13px;font-style:normal;font-size:9px;font-weight:700;color:#ffe08a;white-space:nowrap;text-shadow:0 1px 2px #000}
@keyframes cgxb{50%{transform:translateY(-3px)}}@keyframes cgxp{50%{box-shadow:0 0 0 4px rgba(255,90,70,.6)}}
.cgx-b{position:absolute;transform:translate(-50%,-100%);padding:3px 8px;border-radius:10px;background:#fffdf6;color:#1d2230;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.cgx-b::after{content:'';position:absolute;left:50%;bottom:-5px;margin-left:-5px;border:5px solid transparent;border-bottom:0;border-top-color:#fffdf6}.cgx-b.loud{background:#ffe1d6;color:#8a1d10}.cgx-b.tag{background:#1d2230;color:#ffd36b}.cgx-b.tag::after{border-top-color:#1d2230}
@media (max-width:700px){.cgx-card{bottom:auto;top:118px;right:10px;gap:8px;padding:6px 9px}.cgx-c{width:19px;height:19px;font-size:9px}.cgx-big{font-size:20px}.cgx-n{min-width:70px}.cgx-sub{max-width:120px}}`;
function hudBuild(M){const C=M.cg;if(C.hudEl||typeof document==='undefined'||!document.createElement)return;
  if(!document.getElementById('cgx-css')){const st=document.createElement('style');st.id='cgx-css';st.textContent=CSS;document.head.appendChild(st)}
  const el=document.createElement('div');el.className='cgx';el.innerHTML='<div class="cgx-card"><div class="cgx-n"><div class="cgx-k">HEADCOUNT</div><div class="cgx-big"></div><div class="cgx-sub"></div></div><div class="cgx-row"></div></div><div class="cgx-bubs"></div>';
  C.hudEl=el;C.hudBig=el.querySelector('.cgx-big');C.hudSub=el.querySelector('.cgx-sub');C.hudRow=el.querySelector('.cgx-row');C.hudBubs=el.querySelector('.cgx-bubs');C.chips={};C.bubs=[];
  for(const k of C.kids){const c=document.createElement('div');c.className='cgx-c'+(k.id==='kevin'?' kev':'');c.style.background=k.col;c.style.color=k.col;c.textContent=k.name[0];c.title=k.name;
    if(k.id==='kevin')c.style.display='none';C.hudRow.appendChild(c);C.chips[k.id]=c}
  try{A().overlay('crossing',el)}catch(_){}}
function hudTick(dt,M){const C=M.cg,a=A(),P=a.P;if(!C.hudEl)return;C.hudAcc=(C.hudAcc||0)+dt;const card=C.hudEl.firstChild,show=C.talking?'none':'';if(card.style.display!==show)card.style.display=show;/* the talk strip owns the bottom of the screen */
  /* chips */const out=[];let withN=0,home=0;for(const k of C.kids){if(k.id==='kevin')continue;const c=C.chips[k.id];let cls='cgx-c',lab='';
    if(k.state==='home'||k.state==='homeward'){cls+=' home';home++}else if(k.state==='line'||k.state==='hand'){withN++;if(k.fz>0){cls+=' fz';lab='!'}else if(k.kerb&&k.v<.2)lab=''}
    else if(k.state==='free'){cls+=' out';out.push(k);lab=k.free&&k.free.kind?k.free.kind:k.free&&k.free.sit?'tired':k.free&&k.free.mode==='back'?'':k.def.trait==='runner'?'ahead':''}
    if(k.lostT>2)cls+=' lost';if(k.state==='mill')cls='cgx-c';
    const key=cls+'|'+lab;if(c.__k!==key){c.__k=key;c.className=cls;c.innerHTML=k.name[0]+(lab?'<i>'+lab+'</i>':'')}}
  const kv=C.kevin,kvIn=kv&&(kv.state==='line'||kv.state==='free'&&kv.free&&kv.free.mode==='back');if(kv&&C.chips.kevin){C.chips.kevin.style.display=kvIn?'':'none'}if(kvIn)withN++;
  const exp=KIDS.length-home;let txt=withN+'<small>/'+exp+'</small>',cls='cgx-big',sub='';
  if(C.stage==='gear'){txt=KIDS.length+'<small>/'+KIDS.length+'</small>';sub='Waiting on the church steps'}
  else if(kvIn&&withN>exp-out.length){cls+=' warn';sub=withN>exp?"Hang on. That's "+withN+". ...That one's Kevin.":"Kevin's in the line. Kevin is not on the list."}
  else if(out.length){cls+=' warn';const k=out[0],f=k.free||{};sub=f.sit?k.name+"'s legs are 'broken'":f.kind==='dog'?k.name+' is petting a dog':f.kind==='cat'?k.name+' is petting a cat':f.kind==='chalk'?k.name+' is drawing a sun':k.def.trait==='runner'?k.name+' "won"':k.name+' is coming back';if(out.length>1)sub+=' (+'+(out.length-1)+')'}
  else if(C.kids.some(k=>k.lostT>0)){cls+=' bad';sub='Somebody\'s too far back'}
  else if(C.kids.some(k=>k.fz>0)){cls+=' warn';sub='Scared stiff · get the sign up'}
  else if(exp===0)sub='Everybody\'s home';else sub=['All ducklings accounted for','Nobody left behind','Ducks in a row',home+' home · '+exp+' to go'][Math.floor(C.clock/6)%4];
  if(C.hudBig.__t!==txt+cls){C.hudBig.__t=txt+cls;C.hudBig.innerHTML=txt;C.hudBig.className=cls}if(C.hudSub.__t!==sub){C.hudSub.__t=sub;C.hudSub.textContent=sub}
  /* bubbles over heads (kids, the phone drivers, the crews when it's loud) */
  const list=[];for(const k of C.kids){if(k.bub&&k.d&&k.d.root.visible&&k.state!=='home'){k.bub.t-=dt;if(k.bub.t<=0){k.bub=null;continue}list.push({x:k.x,y:ground(k.x,k.z)+1.62*(k.def.sc||1)+.15,z:k.z,txt:k.bub.txt,cls:''})}}
  if(C.traffic)for(const c of C.traffic.cars)if(c.phone&&c.signSeen<TUNE.phoneT&&hyp(c.x-P.pos.x,c.z-P.pos.z)<40)list.push({x:c.x,y:2.2,z:c.z,txt:'on the phone',cls:'tag'});
  if(C.flare&&C.flare.flareT>0)for(const id of['A','B']){const g=C.crews[id];if(!crewPresent(g))continue;const m=g.members[1];list.push({x:m.x,y:2.25,z:m.z,txt:'!!',cls:'loud'})}
  while(C.bubs.length<list.length){const b=document.createElement('div');b.className='cgx-b';C.hudBubs.appendChild(b);C.bubs.push(b)}
  C.bubs.forEach((b,i)=>{const q=list[i];if(!q){if(b.style.display!=='none')b.style.display='none';return}const p=a.project(q.x,q.y,q.z);const far=hyp(q.x-P.pos.x,q.z-P.pos.z)>45;
    if(p.behind||far){b.style.display='none';return}b.style.display='';if(b.__t!==q.txt+q.cls){b.__t=q.txt+q.cls;b.textContent=q.txt;b.className='cgx-b '+q.cls}b.style.left=p.x.toFixed(0)+'px';b.style.top=p.y.toFixed(0)+'px'})}

/* ---------------- the sign and the dad ---------------- */
function signStep(dt,M){const C=M.cg,a=A(),P=a.P;const can=C.gear&&!a.CV&&!(C.sign.lent>0);C.sign.up=!!(can&&P.aim);C.sign.k+=((C.sign.up?1:0)-C.sign.k)*Math.min(1,dt*9);
  if(C.sign.lent>0){C.sign.lent-=dt}if(C.signObj)C.signObj.visible=C.gear&&!a.CV&&!(C.sign.lent>0);
  if(C.sign.up&&!C.sign.was){thwack();if(!M.cs.signUps)later(M,.3,()=>{})}if(C.sign.up&&!C.sign.was)M.cs.signUps++;C.sign.was=C.sign.up;
  if(C.waveT>0)C.waveT-=dt}
const _q={};function rotWorld(b,axis,ang){const T=T_();if(!_q.a){_q.a=new T.Quaternion();_q.p=new T.Quaternion();_q.w=new T.Quaternion()}
  b.parent.getWorldQuaternion(_q.p);b.getWorldQuaternion(_q.w);_q.a.setFromAxisAngle(axis,ang);_q.w.premultiply(_q.a);b.quaternion.copy(_q.p.invert().multiply(_q.w))}
/* after the animation: the sign arm up (or the wave), then the paddle goes in the hand, upright, facing the way you face */
function dadPose(dt,M){const C=M.cg,a=A(),P=a.P,d=P.dude;if(!d||!d.rb||!C.signObj||!C.gear)return;const T=T_(),B=d.rb.bones;
  const yaw=P.yaw,right=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),fwd=new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));const k=C.sign.k;
  try{if(B.Bip01_R_UpperArm&&k>.01){rotWorld(B.Bip01_R_UpperArm,right,1.25*k);if(B.Bip01_R_Forearm)rotWorld(B.Bip01_R_Forearm,right,.35*k)}
    if(C.waveT>0&&B.Bip01_L_UpperArm){const w=Math.sin(C.clock*9)*.35;rotWorld(B.Bip01_L_UpperArm,fwd,-(1.9+w)*Math.min(1,C.waveT*3));if(B.Bip01_L_Forearm)rotWorld(B.Bip01_L_Forearm,fwd,-.5)}}catch(_){}
  const h=boneW(d,'Bip01_R_Hand');const s=C.signObj;s.position.set(h.x+fwd.x*.04,h.y-.72+(k*.05),h.z+fwd.z*.04);s.rotation.set(0,yaw,0)}

/* ---------------- crossings: kerbs, the wave, the timed set piece ---------------- */
function crossStep(dt,M,F){const C=M.cg,a=A(),P=a.P;const line=lineKids(M);
  const waiting=line.filter(k=>k.kerb&&k.v<.35&&k.fz<=0);C.atKerb=waiting.length?waiting:null;
  if(waiting.length&&!C.kerbSaid){C.kerbSaid=1;const k=waiting[0];if(!M.cs.kerbTip){M.cs.kerbTip=1;kidSay(M,k,pick(L_.kerbWait))}later(M,20,()=>{C.kerbSaid=0})}
  const onRoad=C.kids.filter(k=>(k.state==='line'||k.state==='hand')&&onRoadKid(k));
  /* stragglers who cross a few seconds later are the same crossing: the toast waits until the whole line is over */
  if(onRoad.length&&!C.cross&&C.lastCross&&C.clock-C.crossEnd<8){const L0=C.lastCross,k=onRoad[0],xi=xingAt(k.x,k.z);if(xi&&xi===L0.xing){C.cross=L0;L0.clear=0;L0.t+=C.clock-C.crossEnd;C.lastCross=null}}
  if(C.lastCross&&C.clock-C.crossEnd>=8)crossToast(M,C.lastCross);
  if(onRoad.length&&!C.cross){const k=onRoad[0],p=C.trail.pts[trailIdx(C.trail.pts,k.s)];const run=p&&p.run?p.run:0;const r=C.trail.runs[run];C.cross={run,xing:r&&r.xing||xingAt(k.x,k.z),t:0,honks:M.cs.honks,fz:M.cs.frozen,sign:0,cars:0};music('tension',.45)}
  const runOf=k=>{const p=C.trail.pts[trailIdx(C.trail.pts,k.s)];return p&&p.run?p.run:0};
  if(C.cross&&C.cross.run){const mine=onRoad.filter(k=>k.state==='hand'||runOf(k)===C.cross.run||!runOf(k));if(mine.length<onRoad.length&&!mine.length)C.cross.clear=9}
  if(C.cross){const X=C.cross;X.t+=dt;if(C.sign.up)X.sign+=dt;if(C.traffic)X.cars=Math.max(X.cars,C.traffic.cars.filter(c=>c.v<.3&&hyp(c.x-P.pos.x,c.z-P.pos.z)<30).length);
    F.widgets.push({id:'xing',kind:'timer',label:'Crossing',v:X.t,hot:X.t>12});
    X.clear=X.clear>=9?X.clear:onRoad.length?0:(X.clear||0)+dt;
    if(X.clear>1.1&&X.t>.8){X.t-=X.clear;C.lastCross=X;C.crossEnd=C.clock;C.cross=null;music('hub',.35)}}}
function crossToast(M,X){const C=M.cg,a=A();C.lastCross=null;if(X.t<1.2)return;const clean=M.cs.honks===X.honks&&M.cs.frozen===X.fz;const name=X.xing?(XINGS.find(x=>x.id===X.xing)||{}).name:null;
  M.cs.xings.push({id:X.xing||'street',t:+X.t.toFixed(1),clean:clean?1:0});
  a.feed('Crossing'+(name?' · '+name:''),clean?'trust':'info',X.t.toFixed(1)+' s'+(X.cars?' · '+X.cars+' car'+(X.cars>1?'s':'')+' waited':'')+(clean?' · clean':''));if(clean)chime()}
function carNear(M,x,z){const C=M.cg;if(!C.traffic)return false;for(const c of C.traffic.cars){if(c.v<1)continue;const fx=-Math.sin(c.yaw),fz=-Math.cos(c.yaw),ah=(x-c.x)*fx+(z-c.z)*fz,lat=Math.abs((x-c.x)*fz-(z-c.z)*fx);if(ah>-2&&ah<30&&lat<5.5)return true}return false}
/* is it safe to wave them across? (no car still rolling toward the crossing) — for the HUD line and the test player */
function carsComing(M,x,z){const C=M.cg;if(!C.traffic)return 0;let n=0;for(const c of C.traffic.cars){const fx=-Math.sin(c.yaw),fz=-Math.cos(c.yaw),ah=(x-c.x)*fx+(z-c.z)*fz,lat=Math.abs((x-c.x)*fz-(z-c.z)*fx);
    if(ah>-1&&ah<34&&lat<6&&(c.v>.6||c.why==='dad')&&!c.forSign&&!(c.why==='car'||c.why==='kid'||c.why==='kidfar'||c.why==='sign'))n++}return n}
function waveAcross(M){const C=M.cg,line=lineKids(M);if(!C.atKerb)return;const ok={};for(const k of C.kids)if(k.state==='line'||k.state==='hand'||k.state==='free')ok[k.id]=1;if(C.kevin)ok.kevin=1;
  const s0=Math.min(...C.atKerb.map(k=>k.s)),head=trailHead(M);for(const id in C.trail.runs){const r=C.trail.runs[id];if(r.s1<s0-1||r.s0>head+.1)continue;r.ok=1;r.okT=C.clock+TUNE.waveLife;r.okFor=ok}
  C.waveT=1.4;M.cs.waves++;say(M,'you',pick(L_.wave),{now:true});const cc=carsComing(M,C.atKerb[0].x,C.atKerb[0].z);if(cc&&!C.sign.up)later(M,.5,()=>{})}

/* ---------------- Kevin, Pastor Dee, the critters ---------------- */
function kevinStep(dt,M){const C=M.cg,a=A(),P=a.P,k=C.kevin;if(!k)return;
  if(k.state==='stray'){if(C.stageN<1){if(k.d)k.d.root.visible=false;return}if(k.d)k.d.root.visible=true;const near=hyp(P.pos.x-k.x,P.pos.z-k.z)<4.5||lineKids(M).some(o=>hyp(o.x-k.x,o.z-k.z)<3.5);
    if(near){M.cs.kevin='line';kidSay(M,k,"Hi! I'm walking home too.");later(M,1.6,()=>say(M,'you',"Kevin. You're not on the list."));later(M,3.2,()=>kidSay(M,k,"I'm on every list."));rejoin(M,k)}}
  if(M.cs.kevin==='line'&&k.state==='line'||k.state==='free'&&M.cs.kevin==='line'){const g=KEVIN.gran;const dG=hyp(P.pos.x-g.x,P.pos.z-g.z);
    if(!C.gran&&dG<19){C.gran=person(M,'nb_gran',{idle:'idle_arms_folded'});if(C.gran){C.gran.root.position.set(g.x,ground(g.x,g.z),g.z);C.gran.root.rotation.y=yawTo(-1,0)+Math.PI}say(M,'Mrs. Alvarez',"KEVIN! Where is your OTHER SHOE?")}
    if(C.gran&&k.state==='line'&&hyp(k.x-g.x,k.z-g.z)<6.5){M.cs.kevin='home';k.state='free';k.free={mode:'go',x:g.x-.6,z:g.z,speed:2.6,face:{x:g.x,z:g.z},gatherable:false,dur:2.5,arrive:kk=>{kidSay(M,kk,"Bye, sign guy!");try{HT.People.interact&&HT.People.interact(C.gran)}catch(_){}},
        done:kk=>{kk.state='gone';kk.walkOff={x:335,z:76.6};}};later(M,1,()=>say(M,'Mrs. Alvarez',"Thank you, mister. He follows anything with a line."))}}
  if(k.state==='gone'&&k.walkOff){const w=k.walkOff,dx=w.x-k.x,dz=w.z-k.z,dd=hyp(dx,dz);if(dd>.1){k.x+=dx/dd*Math.min(dd,1.4*dt);k.z+=dz/dd*Math.min(dd,1.4*dt);k.yaw=yawTo(dx,dz);k.mov=true;k.spd=1.4;
      if(C.gran){const r=C.gran.root;r.position.x+=(w.x+.5-r.position.x)*Math.min(1,dt*1.5);r.position.z+=(w.z-r.position.z)*Math.min(1,dt*1.5);a.pose(C.gran,dt,{moving:true,speed:.8,aim:false})}}
    else{k.walkOff=null;if(k.d)k.d.root.visible=false;if(C.gran){C.gran.root.visible=false;if(C.gran.root.parent)C.gran.root.parent.remove(C.gran.root)}C.gran=null;k.mov=false}}
  else if(C.gran)a.pose(C.gran,dt,{moving:false,aim:false})}
function critterTick(dt,M){const C=M.cg;for(const q of C.pois){if(!q.obj||q.kind==='chalk')continue;q.happy=Math.max(0,(q.happy||0)-dt);critterStep(q.obj,dt,q.happy>0?'happy':'sit')}
  if(C.biscuit)critterStep(C.biscuit,dt,'happy');
  if(C.walker){A().pose(C.walker,dt,{moving:false,aim:false})}
  if(C.dee){const a=A(),P=a.P,r=C.dee.root;r.rotation.y=turn(r.rotation.y,yawTo(P.pos.x-r.position.x,P.pos.z-r.position.z)+Math.PI,dt*3);a.pose(C.dee,dt,{moving:false,aim:false})}}

/* ---------------- poses for everyone we move ---------------- */
function kidPoses(dt,M){const C=M.cg,a=A();for(const k of C.kids){if(!k.d||!k.d.root.visible||k.state==='home')continue;const r=k.d.root;r.position.set(k.x,ground(k.x,k.z),k.z);r.rotation.y=k.yaw+Math.PI;
    const f=k.free;const crouch=k.fz>0||(k.state==='free'&&f&&f.mode==='act'&&f.crouch);a.pose(k.d,dt,{moving:!!k.mov,speed:Math.max(.6,Math.min(1.8,(k.spd||1)/1.25)),aim:false,mode:crouch?'crouch':'stand'})}}

/* ---------------- stages ---------------- */
function stageStep(dt,M,F){const C=M.cg,a=A(),P=a.P;const act=activeKids(M).filter(k=>k.id!=='kevin');const zs=act.map(k=>k.z);const minZ=zs.length?Math.min(...zs):999;
  if(C.stage==='main'&&minZ>47.6&&P.pos.z>47.6)setStage(M,'river');
  else if(C.stage==='river'&&minZ>74.2&&P.pos.z>74&&!C.kids.some(k=>(k.state==='line'||k.state==='hand')&&onRoadKid(k)))setStage(M,'corner');
  else if(C.stage==='corner'&&P.pos.z>92.5&&minZ>86)setStage(M,'mill');
  /* the long way round */for(const k of act)if(k.state==='line'&&DETOUR.some(r=>inRect(k.x,k.z,r))&&!M.cs.detour){M.cs.detour=1;if(C.stageN>=2)say(M,'you',"Scenic route, everybody. Nobody tell Dee.")}}
function setStage(M,st){const C=M.cg;C.stage=st;C.stageN=STAGES.indexOf(st);M.cs.st=st;A().CP.mark(st);
  if(st==='river'){music('hub',.3);later(M,3,()=>{const g=C.kids.find(k=>k.id==='gloria');if(g&&g.state==='line')kidSay(M,g,"That's where my brother used to work. The laundromat. The bad laundromat.")})}
  if(st==='corner'){later(M,1.5,()=>say(M,'you',"2nd St's loud. We can talk to them, wait them out, or go the long way round by 3rd. Sign stays handy."));C.rush=.85}
  if(st==='mill'){C.rush=.8;later(M,2,()=>say(M,'you',"Mill St. Home stretch, ducklings."))}}
function separation(dt,M,F){const C=M.cg,a=A(),P=a.P;let worst=null;
  for(const k of C.kids){if(k.state==='home'||k.state==='homeward'||k.state==='mill'||k.state==='gone'||k.state==='stray'||k.id==='kevin'){k.lostT=0;continue}const d=hyp(k.x-P.pos.x,k.z-P.pos.z);
    k.far=d;if(d>TUNE.lostR){k.lostT+=dt;if(!worst||k.lostT>worst.lostT)worst=k}else k.lostT=Math.max(0,k.lostT-dt*2);if(d>TUNE.warnR&&k.id!=='kevin'&&(!worst||(!worst.lostT&&d>worst.far)))worst=k}
  if(worst&&worst.lostT>0)F.objs.push([worst.name+' is on their own · '+Math.ceil(TUNE.lostT-worst.lostT)+' s',false,'warn']);
  else if(worst)F.objs.push([worst.name+' is '+Math.round(worst.far||0)+' m back',false,'warn']);
  const lost=C.kids.find(k=>k.lostT>=TUNE.lostT);if(lost)a.endMission(false,lost.name+" was on their own too long. Pastor Dee says that's how ducklings end up in the wrong pond. Walk it again.","Lost a duckling.")}
function objectives(M,F){const C=M.cg,a=A(),P=a.P;
  if(C.stage==='gear'){F.objs.push(['Get the vest and the stop sign from Pastor Dee',false]);F.target={x:CHURCH.dee.x,z:CHURCH.dee.z+.8,label:'Pastor Dee'};return}
  const left=C.kids.filter(k=>k.def.home&&k.state!=='home'&&k.state!=='homeward');F.objs.push([left.length?'Walk the kids home · '+left.length+' to go':'Everybody is home',!left.length]);
  if(C.atKerb){const k=C.atKerb[0],cc=carsComing(M,k.x,k.z);F.objs.push([C.sign.up?(cc?'Car coming · keep the sign up and wait':'Hold '+(touch()?'USE':'E')+' to wave them across'):'At the kerb · sign up in the road ('+(touch()?'AIM':'right mouse')+')',false,cc&&!C.sign.up?'warn':undefined])}
  if(C.flareNear&&!M.cs.talked.A&&!M.cs.talked.B&&C.stageN>=3&&!M.cs.rick)F.objs.push(['2nd St: talk them down ('+(touch()?'USE':'E')+'), wait for a quiet moment, or go round by 3rd'+(M.cs.rick?'':' · '+(touch()?'Rick chip':'X')+': call Rick'),false]);
  /* next stop on the marker: the nearest home of a kid who's with you */
  let best=null,bd=1e9;for(const k of C.kids){if(k.state!=='line'&&k.state!=='hand'||!k.home)continue;if(k.def.trait==='quiet'&&left.length>1)continue;const d=hyp(k.home.x-P.pos.x,k.home.z-P.pos.z)+KIDS.indexOf(k.def)*1.5;if(d<bd){bd=d;best=k}}
  const free=C.kids.find(k=>k.state==='free'&&k.free&&k.free.gatherable&&k.lostT>0||k.state==='free'&&k.free&&k.free.sit);
  if(free){F.target={x:free.x,z:free.z,label:free.name};F.objs.push([free.free&&free.free.sit?'Go back for Rosie (hold '+(touch()?'USE':'E')+')':'Go get '+free.name+' (or whistle: '+(touch()?'chip':'G')+')',false,'warn'])}
  else if(best){F.target={x:best.home.x,z:best.home.z,label:best.name+"'s house"};F.objs.push(['Next stop: '+best.name+"'s house",false])}}
function touch(){try{return!!(matchMedia&&matchMedia('(pointer:coarse)').matches)}catch(_){return false}}
/* game-time timers */
function later(M,sec,fn){const C=M.cg;if(!C)return;C.later.push({t:C.clock+sec,fn})}
function laterStep(dt,M){const C=M.cg;C.clock+=dt;if(!C.later.length)return;const due=C.later.filter(x=>x.t<=C.clock);if(!due.length)return;C.later=C.later.filter(x=>x.t>C.clock);for(const x of due){if(M.state!=='go')continue;try{x.fn()}catch(e){console.warn('[crossing] timer',e)}}}

/* ---------------- building the job ---------------- */
const CAST=['dee','son','daughter','nb_kid','nb_gran','nb_pops','nb_office','nb_sweater','nb_teen','nb_kenji','nb_marcus','nb_mei','nb_lucia','thug_cap','thug_hoodie','thug_track','thug_f_hood','thug_beanie','thug_red','thug_jacket'];
function preloadCast(){const pp=window.HT&&HT.People;if(!pp||!pp.preload)return Promise.resolve();const want=CAST.filter(k=>!pp.has||!pp.has(k));if(!want.length)return Promise.resolve();
  return Promise.race([pp.preload(want).catch(()=>{}),new Promise(r=>setTimeout(r,12000))])}
function castReady(){const pp=window.HT&&HT.People;if(!pp||!pp.ok)return true;if(!pp.has)return true;return CAST.every(k=>pp.has(k))}
function freshState(){return{st:'gear',home:[],talked:{A:0,B:0},rick:0,detour:0,kevin:'stray',hand:0,honks:0,frozen:0,xings:[],gathered:0,waves:0,flares:0,talks:0,signUps:0,nearMiss:0,poiSaid:{},trail:[]}}
function build(M){const C=M.cg,a=A(),T=T_();C.built=true;
  for(const X of XINGS)C.root.add(zebra(M,X));
  C.kids=KIDS.map((d,i)=>makeKid(M,d,i));C.kevin=makeKid(M,KEVIN,11);C.kids.push(C.kevin);C.kevin.state='stray';kidPlace(M,C.kevin,KEVIN.join.x,KEVIN.join.z,yawTo(-1,0));if(C.kevin.d)C.kevin.d.root.visible=false;
  /* homes: one per stoop (the twins share one) */const byId={};C.homes=[];
  for(const k of C.kids){const h0=homeOf(M,k.def);if(!h0)continue;let h=byId[h0.id];if(!h){h=byId[h0.id]=Object.assign(h0,{who0:k.def.grown,who:k.def.grown&&k.def.grown.who,lit:false});
      const l=lantern(M);l.position.set(h.lamp.x,ground(h.lamp.x,h.lamp.z)+2.15,h.lamp.z);l.rotation.y=h.fz>0?0:Math.PI;l.userData.pool.position.set(0,-2.13,h.fz*1.2);C.root.add(l);h.lamp=l;C.homes.push(h)}
    else if(!h.who0&&k.def.grown){h.who0=k.def.grown;h.who=k.def.grown.who}k.home=h}
  /* the church steps: Pastor Dee and the kids milling about */
  C.dee=person(M,'dee',{idle:'f_idle'});if(C.dee){C.dee.root.position.set(CHURCH.dee.x,ground(CHURCH.dee.x,CHURCH.dee.z),CHURCH.dee.z);C.dee.root.rotation.y=Math.PI}
  C.kids.forEach((k,i)=>{if(k.id==='kevin')return;const x=CHURCH.kids.x0+(i%6)*1.9+(i>5?.9:0)+Math.sin(i*2.3)*.3,z=CHURCH.kids.z-(i>5?1.5:0)+Math.cos(i*1.7)*.25;kidPlace(M,k,x,z,yawTo(CHURCH.dee.x-x,CHURCH.dee.z+1.2-z))});
  /* critters, the dog walker, Theo's dog Biscuit */
  C.pois=POIS.map(q=>Object.assign({},q));for(const q of C.pois){if(q.kind==='chalk'){q.obj=chalkSpot(M,q);continue}q.obj=critter(M,q.kind);q.obj.position.set(q.x,ground(q.x,q.z),q.z);q.obj.rotation.y=q.kind==='dog'?-Math.PI/2:Math.PI;q.ang=q.kind==='dog'?Math.PI:Math.PI*1.5;C.root.add(q.obj)}
  C.walker=person(M,'nb_marcus',{idle:'idle_look'});if(C.walker){C.walker.root.position.set(319.6,ground(319.6,63.6),63.6);C.walker.root.rotation.y=-Math.PI/2+Math.PI*.15}
  const th=C.kids.find(k=>k.id==='theo');if(th&&th.home){C.biscuit=critter(M,'dog');C.biscuit.scale.setScalar(.8);C.biscuit.position.set(th.home.door.x+.8,ground(th.home.door.x,th.home.door.z),th.home.door.z+th.home.fz*.35);C.biscuit.rotation.y=th.home.fz>0?0:Math.PI;C.root.add(C.biscuit)}
  crewsBuild(M);
  C.signObj=stopSign(M);C.signObj.visible=false;C.root.add(C.signObj);
  hudBuild(M)}
/* Jaylen's chalk: a little sun appears where he crouched */
function chalkSpot(M,q){const T=T_();const tex=M.cg.chalkTex||(M.cg.chalkTex=canvasTex(M,128,128,(c,W,H)=>{c.clearRect(0,0,W,H);c.strokeStyle='rgba(255,214,90,.92)';c.lineWidth=7;c.lineCap='round';c.beginPath();c.arc(64,64,20,0,Math.PI*2);c.stroke();
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;c.beginPath();c.moveTo(64+Math.cos(a)*30,64+Math.sin(a)*30);c.lineTo(64+Math.cos(a)*46,64+Math.sin(a)*46);c.stroke()}c.fillStyle='rgba(255,140,180,.9)';c.beginPath();c.arc(57,60,3,0,7);c.arc(71,60,3,0,7);c.fill();
    c.strokeStyle='rgba(255,140,180,.9)';c.lineWidth=4;c.beginPath();c.arc(64,66,8,.2,Math.PI-.2);c.stroke()}));
  const m=M.cg.chalkMat||(M.cg.chalkMat=reg(M,new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3})));
  const o=new T.Mesh(geo(M,new T.PlaneGeometry(1,1)),m);o.rotation.x=-Math.PI/2;o.position.set(q.x+.3,ground(q.x,q.z)+.01,q.z);o.scale.setScalar(.01);o.visible=false;M.cg.root.add(o);q.sun=o;return o}
function gearUp(M){const C=M.cg,a=A(),P=a.P;if(C.gear)return;C.gear=true;C.signObj.visible=true;thwack();
  if(P.dude){C.vest=vest(M);try{const sp=boneW(P.dude,'Bip01_Spine2'),loc=P.dude.root.worldToLocal(sp.clone());onBone(P.dude,C.vest,'Bip01_Spine2',[0,loc.y+.04,.01])}catch(_){P.dude.root.add(C.vest)}}
  say(M,'dee',L_.dee[0],{now:true});say(M,'dee',L_.dee[1]);
  /* line up: on the lot, then along the sidewalk to you */
  trailSeed(M,[[325.5,34.6],[337.6,34.6],[339.2,36.2],[337.6,38.85],[P.pos.x,P.pos.z]]);const head=trailHead(M);
  C.kids.forEach((k,i)=>{if(k.id==='kevin')return;const s=head-TUNE.gap0-i*TUNE.gap-.3,q=trailAt(M,s);k.state='free';k.free={mode:'back',x:q.x,z:q.z,s,speed:2.2+Math.random()*.6,gatherable:false}});
  later(M,2.5,()=>{const k=C.kids.find(k=>k.id==='wen');if(k)kidSay(M,k,"Are you a cop?");say(M,'you',"I'm a dad.");later(M,2.2,()=>{if(k)kidSay(M,k,"That's worse.")})});
  later(M,8,()=>{const k=C.kids.find(k=>k.id==='benji');if(k){kidSay(M,k,"Can I hold the sign?");say(M,'you',"No.");later(M,2,()=>kidSay(M,k,"Can I hold it later?"));later(M,3.6,()=>say(M,'you',"...Maybe."))}});
  C.stage='main';C.stageN=1;M.cs.st='main';later(M,.1,()=>{if(M.state==='go')A().CP.mark('main')});music('hub',.3)}
/* a checkpoint: put the world back the way the stage began (kids home, crews talked down, the line behind you) */
function applyLoad(M){const C=M.cg,S=M.cs,a=A(),P=a.P;C.pend=false;C.stage=S.st||'gear';C.stageN=Math.max(0,STAGES.indexOf(C.stage));if(C.stage==='gear')return;
  C.gear=false;gearUp(M);C.stage=S.st;C.stageN=STAGES.indexOf(S.st);C.later.length=0;
  for(const k of C.kids){if(S.home.includes(k.id)){k.state='home';if(k.d)k.d.root.visible=false;const h=k.home;if(h){if(!h.lit){h.lit=true;lanternOn(M,h.lamp,true)}if(C.kids.filter(o=>o.home===h).every(o=>S.home.includes(o.id)))h.gone=true}}}
  const pts=(S.trail&&S.trail.length>1?S.trail:[[P.pos.x,P.pos.z-6],[P.pos.x,P.pos.z]]).slice();const L_p=pts[pts.length-1];if(hyp(L_p[0]-P.pos.x,L_p[1]-P.pos.z)>.4)pts.push([P.pos.x,P.pos.z]);
  trailSeed(M,pts);const head=trailHead(M);let i=0;for(const k of C.kids){if(k.state==='home'||k.id==='kevin')continue;if(k.id==='rosie'&&S.hand){k.state='hand';k.free=null;kidPlace(M,k,P.pos.x-1,P.pos.z);continue}
    if(k.id==='rosie'&&C.stageN>=3)k.said.sat=1;k.state='line';k.free=null;k.s=Math.max(trailFirst(M),head-TUNE.gap0-i*TUNE.gapTight);const q=trailAt(M,k.s);kidPlace(M,k,q.x,q.z,yawTo(q.dx,q.dz));i++}
  const kv=C.kevin;if(S.kevin==='line'){kv.state='line';kv.s=Math.max(trailFirst(M),head-TUNE.gap0-i*TUNE.gapTight);const q=trailAt(M,kv.s);kidPlace(M,kv,q.x,q.z);if(kv.d)kv.d.root.visible=true}else if(S.kevin==='home'){kv.state='gone';if(kv.d)kv.d.root.visible=false}
  for(const id of['A','B'])if(S.talked[id]){const g=C.crews[id];g.state='down';for(const m of g.members){m.x=g.def.wall+(g.def.side<0?.25:-.25);m.z=m.home.z+(m.i-1)*.6}}
  if(S.rick)for(const id of['A','B']){const g=C.crews[id];if(g.state==='down')continue;g.state='gone';for(const m of g.members){m.away={x:m.home.x,z:id==='A'?66:112};m.x=m.away.x;m.z=m.away.z;if(m.d)m.d.root.visible=false}}
  for(const q of C.pois){const k=C.kids.find(k=>k.id===q.for);if(k&&(k.state==='home'||C.stageN>=4&&q.id!=='chalk3'||C.stageN>=3&&(q.id==='dog1'||q.id==='chalk1'&&false)))k.poiDone[q.id]=1}
  if(C.stageN>=2){const k=C.kids.find(k=>k.id==='theo');if(k)k.poiDone.dog1=1}if(C.stageN>=3){const k=C.kids.find(k=>k.id==='theo');if(k)k.poiDone.cat1=1;const j=C.kids.find(k=>k.id==='jaylen');if(j)j.poiDone.chalk1=1}
  if(C.stageN>=2&&C.dee)C.dee.root.visible=false;C.rush=C.stageN>=3?.85:1}

/* ---------------- per frame ---------------- */
function upd(dt,M,F){const C=M.cg,a=A(),P=a.P;if(!C)return;laterStep(dt,M);
  if(!C.built){C.waitT=(C.waitT||0)+dt;if(castReady()||C.waitT>10)build(M);else{F.objs.push(['Pastor Dee is getting the kids together...',false]);return}}
  if(C.pend)applyLoad(M);
  if(C.talk)C.talk.update(dt);
  /* the dad's trail and pace */const dx=P.pos.x-(C.lx==null?P.pos.x:C.lx),dz=P.pos.z-(C.lz==null?P.pos.z:C.lz);C.lx=P.pos.x;C.lz=P.pos.z;const sp=hyp(dx,dz)/Math.max(dt,1e-3);C.dadMov+=(Math.min(8,sp)-C.dadMov)*Math.min(1,dt*6);
  if(C.gear&&!a.CV)trailPush(M,P.pos.x,P.pos.z);
  signStep(dt,M);
  if(C.stage==='gear'){millStep(dt,M);if(hyp(P.pos.x-CHURCH.dee.x,P.pos.z-CHURCH.dee.z)<3.2)F.holds.push({x:CHURCH.dee.x,z:CHURCH.dee.z,r:3.2,o:C.holdGear,txt:'Take the vest and the stop sign',time:.8,fn:()=>gearUp(M)})}
  else{chainStep(dt,M);freeStep(dt,M);traitStep(dt,M);homeStep(dt,M);homewardStep(dt,M);kevinStep(dt,M);trafficStep(dt,M);flareStep(dt,M);rickStep(dt,M);crossStep(dt,M,F);
    if(C.dee&&C.stageN>=2&&hyp(P.pos.x-CHURCH.dee.x,P.pos.z-CHURCH.dee.z)>40)C.dee.root.visible=false}
  for(const q of C.pois)if(q.sun&&q.sun.visible&&q.sun.scale.x<.95){q.sun.scale.setScalar(Math.min(.95,q.sun.scale.x+dt*.25))}
  critterTick(dt,M);kidPoses(dt,M);
  if(C.stage!=='gear'&&!M.exitOpen){stageStep(dt,M,F);separation(dt,M,F)}if(M.state!=='go')return;
  if(!M.exitOpen)objectives(M,F);actions(M,F);meters(M,F);hudTick(dt,M);
  if(C.allHome&&!C.won){C.won=true;win(M)}}
function millStep(dt,M){const C=M.cg;for(const k of C.kids){if(k.id==='kevin')continue;k.mov=false;k.spd=0;if(Math.random()<dt*.06)bubble(M,k,pick(['Hi!','Is that the sign?','I\'m hungry','Hi Pastor Dee!','We\'re walking?']),2)}}
/* E actions: Rosie's hand, talking to a crew, the wave */
function actions(M,F){const C=M.cg,a=A(),P=a.P;if(C.stage==='gear'||M.exitOpen||C.talking)return;
  const ro=C.kids.find(k=>k.state==='free'&&k.free&&k.free.sit);if(ro)F.holds.push({x:ro.x,z:ro.z,r:2.4,o:C.holdRosie,txt:"Hold Rosie's hand",time:.6,fn:()=>handRosie(M,ro)});
  for(const id of['A','B']){const g=C.crews&&C.crews[id];if(!crewPresent(g)||M.cs.talked[id]||C.clock<(g.cool||0))continue;const c=crewCentre(g);if(hyp(c.x-P.pos.x,c.z-P.pos.z)<4.2)F.taps.push({x:c.x,z:c.z,r:4.2,txt:C.sign.up?'Talk them down (lower the sign first)':'Talk them down',fn:()=>{if(C.sign.up){say(M,'you',"Can't talk with a sign in somebody's face. Lower it.",{now:true});return}talkOpen(M,g)}})}
  if(C.atKerb&&!F.taps.length){const k=C.atKerb[0];if(hyp(k.x-P.pos.x,k.z-P.pos.z)<10)F.holds.push({x:P.pos.x,z:P.pos.z,r:1,o:C.holdWave,txt:'Wave them across',time:TUNE.waveT,fn:()=>waveAcross(M)})}}
function meters(M,F){const C=M.cg,a=A(),P=a.P;
  if(C.flare&&C.stageN>=2&&hyp(P.pos.x-FC.x,P.pos.z-FC.z)<48&&(crewPresent(C.crews.A)||crewPresent(C.crews.B))){const F_=C.flare;F.meters.push({id:'flare',label:'2nd St',v:F_.flareT>0?1:F_.heat,max:1,style:'bar',warn:.72,sub:F_.flareT>0?'Loud. Sign up.':crewPresent(C.crews.A)&&crewPresent(C.crews.B)?'Getting heated':'One crew at the store'})}
  if(C.atKerb){const k=C.atKerb[0],cc=carsComing(M,k.x,k.z);F.meters.push({id:'traffic',label:'Traffic',v:cc?1:0,max:1,style:'pips',sub:cc?cc+' car'+(cc>1?'s':'')+' coming':'Clear',warn:.5})}}
function win(M){const C=M.cg,a=A();music('victory',1);C.traffic.off=true;
  later(M,6.8,()=>{say(M,'dee',"Eleven kids home. Nobody shouted. Somebody tell the Lord, He'll want to hear it.");if(M.cs.talked.A&&M.cs.talked.B){a.addTrust(6,'river');a.feed('Nobody even raised their voice','trust','+6 Riverside trust')}
    if(M.cs.kevin==='line')later(M,4,()=>say(M,'dee',"And somebody walk Kevin home. Kevin's not even in youth group."))});
  later(M,10.5,()=>{say(M,'dee',"Rick dropped your van on Mill St. He says you're welcome, and that you owe him a Gatorade.");vanNearby(M);M.noCars=false;M.exitOpen=true})}
function vanNearby(M){const a=A(),c=M.car;if(!c||a.CV===c)return;try{c.pos.set(332.5,0,101.25);c.yaw=-Math.PI/2;if(c.spd!=null)c.spd=0;if(c.car)c.car.spd=0;a.syncCar(c)}catch(e){console.warn('[crossing] van',e)}}

/* ---------------- keys and touch chips: G whistle, T wait/go, X call Rick ---------------- */
function running(){const a=A(),M=a&&a.M;return M&&M.state==='go'&&M.def&&M.def.id==='crossing'&&M.cg&&M.cg.gear&&!a.CV?M:null}
function whistle(M){const C=M.cg,a=A(),P=a.P;if(C.clock<(C.whistleAt||0))return;C.whistleAt=C.clock+4;whistleSnd();say(M,'you',pick(L_.whistle),{now:true});let n=0;
  for(const k of C.kids){if(k.state!=='free'||!k.free||hyp(k.x-P.pos.x,k.z-P.pos.z)>TUNE.whistleR)continue;if(k.free.sit)continue;if(k.free.mode==='back')continue;if(k.free.onGather){k.free={mode:'back',x:k.x,z:k.z,s:trailHead(M)-1,gatherable:false};n++;continue}if(gather(M,k,true))n++}
  if(C.waitAll)toggleWait(M);M.cs.whistles=(M.cs.whistles||0)+1}
function toggleWait(M){const C=M.cg;C.waitAll=!C.waitAll;for(const k of C.kids)k.waitS=C.waitAll?k.s:null;say(M,'you',pick(C.waitAll?L_.wait:L_.go),{now:true})}
if(typeof addEventListener==='function'){addEventListener('keydown',e=>{if(e.repeat)return;const M=running();if(!M)return;const k=(e.key||'').toLowerCase();if(k==='g')whistle(M);else if(k==='t')toggleWait(M);else if(k==='x')callRick(M)})}
function hookTouch(){const a=A();if(!a||!a.HUD||hookTouch.done||!a.HUD.on)return;hookTouch.done=true;a.HUD.on('gadget',id=>{const M=running();if(!M)return;if(id==='cg-whistle')whistle(M);else if(id==='cg-wait')toggleWait(M);else if(id==='cg-rick')callRick(M)})}

/* ---------------- cleanup: whatever ends the job (win, fail, quit, retry) ---------------- */
let LAST=null;
function cleanup(M){const C=M&&M.cg;if(!C||C.dead)return;C.dead=true;const a=A();
  try{a.overlay('crossing',null)}catch(_){}try{a.overlay('crossing-talk',null)}catch(_){}
  if(C.traffic)for(const c of C.traffic.cars)removeCar(M,c);
  if(C.crews)for(const id in C.crews)for(const m of C.crews[id].members)if(m.col)Object.assign(m.col,{x0:-1e4,z0:-1e4,x1:-1e4,z1:-1e4});
  for(const d of C.people||[])if(d&&d.root&&d.root.parent)d.root.parent.remove(d.root);
  const P=a.P;if(C.vest&&C.vest.parent)C.vest.parent.remove(C.vest);
  if(C.root&&C.root.parent)C.root.parent.remove(C.root);
  for(const o of C.dis||[])try{o.dispose&&o.dispose()}catch(_){}
  C.dis=[];C.people=[];C.kids=[];C.traffic=null;C.crews=null;C.root=null;C.signObj=null;C.vest=null;C.hudEl=null;C.chips=null;C.bubs=null;
  try{a.setNight(0)}catch(_){}}
J.on('hud',()=>{hookTouch();const a=A();if(!a)return;const M=a.M;if(LAST&&(LAST!==M||M.state!=='go')){const L0=LAST;LAST=null;try{cleanup(L0)}catch(e){console.warn('[crossing] cleanup',e)}}
  if(M&&M.state==='go'&&M.def&&M.def.id==='crossing'&&M.cg)LAST=M});

/* ---------------- registration ---------------- */
J.item('stopSign',{name:'Stop sign',use(M){const C=M&&M.cg;if(!C||!C.gear)return;if(C.clock<(C.shoutAt||0))return;C.shoutAt=C.clock+3;thwack();say(M,'you',pick(["STOP. Thank you.","Stop means stop!","Paddle up. Feet still."]),{now:true})},hud(st){}});
J.register('crossing',{
  def:{giver:'dee',hood:'river',title:'Crossing Guard',role:'Pastor Dee · Strand 2/2 · Escort on foot',place:'2nd St, Riverside',
    lines:["Youth group just let out and there's trouble starting on 2nd St. Eleven of my kids live south of it, and my van is in the shop. Sal says it's the alternator.",
      "I've got a reflective vest and a stop sign. That's the whole plan. You walk them home, one stoop at a time, and every grown-up on that list is waiting at their door.",
      "No guns. Not one, not today, not with my kids. If somebody starts something, you go around it, you wait it out, or you talk. You're good at talking. Too good."],
    obj:'Walk eleven kids home from the church. Stop traffic with the sign, wave them across, and steer them around the trouble on 2nd St. No guns.',
    crew:[],weapons:[],noGuns:"Not with the kids here. The sign's my whole personality today.",
    from:{place:'g_dee'},start:{x:315,z:29},
    unlock:{done:['dee']},pay:700,par:420,winTrust:3,
    stages:STAGES,stageLabels:LABELS,failPolicy:'soft',
    medals:['Finished','No detour','No detour and no call-in'],order:28,
    radio:[['dee',"I'm on the church steps with eleven kids and two juice boxes. Hurry."]],
    endLine:"Eleven porch lights on Ash and Mill. Pastor Dee put the stop sign on the church wall, next to the bake sale photos."},
  start(M,o){const a=A();if(LAST&&LAST!==M){try{cleanup(LAST)}catch(_){}LAST=null}
    const T=T_(),root=new T.Group();root.name='crossing';
    M.cs=freshState();M.cg={root,dis:[],people:[],clock:0,later:[],talk:window.HT&&HT.Stops&&HT.Stops.talk?HT.Stops.talk():null,trail:trailNew(),kids:[],homes:[],pois:[],stage:'gear',stageN:0,
      sign:{up:false,k:0,was:false},traffic:{cars:[],t:{},boxes:BOXES.map(r=>({r,occ:null}))},twinT:30,swaps:0,dusk:.36,dadMov:0,holdGear:{},holdRosie:{},holdWave:{},rush:1};
    a.wmAdd(root);M.noCars=true;M.item='stopSign';LAST=M;preloadCast();
    try{a.setNight(M.cg.dusk)}catch(_){}
    if(!o||!o.checkpoint){a.P.pos.set(CHURCH.dad.x,0,CHURCH.dad.z);a.P.yaw=0;a.P.pitch=-.06;
      later(M,3,()=>{if(M.cg&&M.cg.stage==='gear')say(M,'dee',"Over here! Vest and sign are on me. The kids are not, thank goodness.")})}
    music('hub',.25)},
  upd,
  pose(dt){const M=A().M;if(M&&M.cg&&M.def&&M.def.id==='crossing'&&M.state==='go')dadPose(dt,M)},
  hud(st){const M=A().M;if(!M||!M.cg||!M.cg.gear||M.state!=='go')return;const C=M.cg;const t=touch();
    st.gadgets=(st.gadgets||[]).concat([{id:'cg-whistle',label:'Whistle',key:'G',on:false},{id:'cg-wait',label:C.waitAll?'Let\'s go':'Wait here',key:'T',on:!!C.waitAll}].concat(!M.cs.rick&&C.stageN>=2&&(crewPresent(C.crews.A)||crewPresent(C.crews.B))?[{id:'cg-rick',label:'Call Rick',key:'X',on:false}]:[]))},
  save(M){const S=M.cs||freshState();let trail=S.trail||[];const C=M.cg;
    if(C&&C.trail&&C.trail.pts.length>1){const p=C.trail.pts,head=p[p.length-1].s,out=[];let last=-9;for(const q of p){if(head-q.s>24||q.road)continue;if(q.s-last<1&&q!==p[p.length-1])continue;last=q.s;out.push([+q.x.toFixed(2),+q.z.toFixed(2)])}if(out.length>1)trail=out}
    return{st:S.st||'gear',home:(S.home||[]).slice(),talked:{A:S.talked&&S.talked.A?1:0,B:S.talked&&S.talked.B?1:0},rick:S.rick?1:0,detour:S.detour?1:0,kevin:S.kevin||'stray',hand:S.hand?1:0,
      honks:S.honks|0,frozen:S.frozen|0,xings:(S.xings||[]).slice(-12).map(x=>({id:x.id,t:x.t,clean:x.clean?1:0})),gathered:S.gathered|0,waves:S.waves|0,flares:S.flares|0,talks:S.talks|0,signUps:S.signUps|0,nearMiss:S.nearMiss|0,trail:trail.slice(-30)}},
  load(M,s){if(!s)return;const S=Object.assign(freshState(),s);S.home=(s.home||[]).slice();S.talked={A:s.talked&&s.talked.A?1:0,B:s.talked&&s.talked.B?1:0};S.xings=(s.xings||[]).slice();S.trail=(s.trail||[]).slice();S.poiSaid={};S.nearMiss=0;
    M.cs=S;if(M.cg)M.cg.pend=true},
  payout(M,ok){if(!ok||!M.cs)return[];const S=M.cs,out=[['All eleven home',200]];if(S.talked.A&&S.talked.B)out.push(['Talked it down',150]);
    const clean=S.xings.filter(x=>x.clean).length;if(clean)out.push(['Clean crossings ×'+clean,15*clean]);if(S.kevin==='home')out.push(['Kevin, returned to sender',0]);if(S.rick)out.push(["Coach Rick's Gatorade",-12]);return out},
  medal(M){const S=M.cs;if(!S)return 1;return S.detour?1:S.rick?2:3},
  end(M,ok){if(!ok)return;const a=A(),s=a.SV(),SV=window.HT&&HT.Save;
    if(SV&&s){try{SV.household(s,'crossing')}catch(_){}s.flags=s.flags||{};s.flags.crossingGuard=s.flags.ferreira?'ferreira':'volunteer';s.flags.crossingKids=11;
      /* Grand Opening's ledger: each named kid who's in this line and got home is worth one more */const led=s.flags.ledgerKids;const n=Array.isArray(led)?led.length:typeof led==='number'?led:0;if(n){a.addTrust(Math.min(9,n),'river');a.feed('The ledger kids are home','trust','+'+Math.min(9,n)+' Riverside trust')}}},
  test:{give(a){preloadCast();const H=G();if(H.openBridge)try{H.openBridge()}catch(_){}a.addTrust&&a.addTrust(15,'river')},
    step:(a,t,o)=>bot(a,t,o||{}),
    sample:()=>({cs:{st:'corner',home:['priya','wen'],talked:{A:1,B:0},rick:0,detour:0,kevin:'home',hand:0,honks:1,frozen:2,xings:[{id:'main',t:6.2,clean:1},{id:'ash',t:7.9,clean:0}],gathered:1,waves:2,flares:1,talks:1,signUps:4,nearMiss:0,poiSaid:{},
      trail:[[319,68],[319.2,72],[323,74.8],[330,74.8],[336,74.8]]}})}
});

/* ---------------- the scripted player (dev/jobs-check.js, dev/jobs/crossing.js) ----------------
   Walks the direct route like a careful person: sign up in the road, waits for the cars to stop, waves, walks the kids over,
   talks both crews down, goes back for strays, waits for stragglers. o.fail: walks off and leaves the kids behind. */
const ROUTE=[{act:'gear'},{x:331,z:38.35},{x:327.6,z:38.35},{x:321.2,z:39.45},
  {cross:'main',from:[319.3,39.3],mid:[319.4,43.3],to:[319.2,48.8]},{x:318.38,z:56},{x:318.38,z:66.3},
  {cross:'ash',from:[319.3,67.3],mid:[319.4,71.2],to:[319.8,75.4]},{home:'priya'},{home:'wen'},{x:338.5,z:74.75},{x:342.6,z:76.2},
  {talk:'A',at:[343.55,82.1]},{talk:'B',via:[[345.2,81.4],[349.6,83.6]],at:[350.6,83.9],back:[[349.4,83.4],[344.6,80.6]]},
  {x:342.95,z:82},{x:342.95,z:92.5},{home:'jaylen'},
  {cross:'2nd-n',from:[343.4,94.9],mid:[347,94.9],to:[351.8,94.9]},{home:'theo'},{home:'ana'},{home:'benji'},
  {cross:'mill',from:[374.8,95.3],mid:[374.8,99],to:[374.8,103.7]},{home:'dash'},{home:'rosie'},{home:'malik'},
  {cross:'2nd-s',from:[351.5,103.3],mid:[347,103.3],to:[342.9,103.3]},{home:'gloria'},{act:'exit'}];
function bot(a,t,o){const M=a.M,P=a.P;if(!M||M.state!=='go'||!M.cg)return null;const C=M.cg;if(!C.built)return null;
  const B=C.bot||(C.bot={i:0,ph:'',t:0,hold:0,pause:0});if(!isFinite(P.yaw)){if(typeof window!=='undefined'&&!window.__cgYaw)window.__cgYaw={i:B.i,ph:B.ph,last:B.lastYawSrc};P.yaw=0}const dt=1/30;B.t+=dt;a.keys.e=false;a.keys.w=false;a.keys.shift=false;
  if(a.CV){if(!M.exitOpen)a.exitCar();return null}
  if(C.talking&&!C.talking.busy){B.talkT=(B.talkT||0)+dt;if(B.talkT>.9){const i=C.talking.opts.findIndex(x=>x.win);talkPick(M,i>=0?i:0);B.talkT=0}return null}
  /* a fresh start (a retry) can land mid-route: skip ahead to the nearest step of the current stage */
  if(!B.synced){B.synced=true;if(C.stage!=='gear'){const st={main:1,river:5,corner:8,mill:17}[C.stage];if(st!=null)B.i=st;if(C.stage==='corner'){if(M.cs.home.includes('wen'))B.i=10}if(C.stage==='mill'){B.i=ROUTE.findIndex(r=>r.home==='jaylen')}}}
  if(o.fail){if(C.stage==='gear')return botGear(a,M,B);P.aim=false;go(a,{x:395,z:38.9},true);return null}
  if(M.exitOpen){P.aim=false;const c=M.car;if(c&&hyp(c.pos.x-P.pos.x,c.pos.z-P.pos.z)<3.6){a.useTap=true;return null}if(c)go(a,{x:c.pos.x+2.9,z:c.pos.z+.2});return null}
  const step=ROUTE[B.i];if(!step)return null;
  if(step.act==='gear')return botGear(a,M,B);
  if(step.act==='exit'){P.aim=false;return null}/* Pastor Dee's last word, then the van */
  /* interruptions, the way a person handles them */
  const fz=C.kids.some(k=>(k.state==='line'||k.state==='hand')&&k.fz>0&&hyp(k.x-P.pos.x,k.z-P.pos.z)<9);
  const ro=C.kids.find(k=>k.state==='free'&&k.free&&k.free.sit);
  if(ro&&!step.cross){P.aim=false;if(hyp(ro.x-P.pos.x,ro.z-P.pos.z)>1.6){go(a,{x:ro.x+.8,z:ro.z});return null}a.keys.e=true;return null}
  const out=C.kids.find(k=>k.state==='free'&&k.free&&k.free.gatherable&&(k.free.mode==='act'&&k.free.dur==null||k.lostT>0||k.def.trait==='runner'&&k.free.mode==='act'&&hyp(k.x-P.pos.x,k.z-P.pos.z)>7));
  if(out&&!step.cross&&!step.talk){P.aim=false;if((B.wh||0)<C.clock){B.wh=C.clock+10;whistle(M);return null}if(hyp(out.x-P.pos.x,out.z-P.pos.z)>2.4){go(a,{x:out.x,z:out.z});return null}}
  if(fz&&!step.cross){P.aim=true;return null}
  const line=lineKids(M),tail=line[line.length-1];
  let lag=line.length?trailHead(M)-line[0].s-2.6:0;for(let i=1;i<line.length;i++)lag=Math.max(lag,line[i-1].s-line[i].s-2.2);lag*=2.2;const anyFree=C.kids.some(k=>k.state==='free'&&k.free&&k.free.mode!=='act');
  if(C.atKerb&&!step.talk&&!step.cross){const k=C.atKerb[0];P.aim=true;if(carsComing(M,k.x,k.z)===0&&hyp(k.x-P.pos.x,k.z-P.pos.z)<9)a.keys.e=true;else if(hyp(k.x-P.pos.x,k.z-P.pos.z)>=9)go(a,{x:k.x,z:k.z});return null}
  if(step.home){const k=C.kids.find(k=>k.id===step.home);if(!k||k.state==='home'||k.state==='homeward'){B.i++;B.t=0;return null}const h=k.home;if(!h){B.i++;return null}
    const sx=h.x+(B.dir||1)*1.4,sz=h.z+h.fz*.72;if(hyp(sx-P.pos.x,sz-P.pos.z)>.6&&B.t<25){P.aim=false;if(lag<9||hyp(sx-P.pos.x,sz-P.pos.z)>12)go(a,{x:sx,z:sz},false,true);return null}
    if(B.t>40){B.i++;B.t=0}return null}
  if(step.talk){const g=C.crews[step.id||step.talk];if(!g||g.state==='down'||g.state==='gone'||g.state==='scatter'||M.cs.talked[step.talk]){if(step.back&&B.ph!=='back'&&B.ph!=='done'&&B.went){B.ph='back';B.k=0}
      if(B.ph==='back'){const w=step.back[B.k];if(!w){B.ph='done'}else{if(go(a,{x:w[0],z:w[1]}))B.k++;return null}}B.i++;B.t=0;B.ph='';B.went=false;B.k=0;return null}
    P.aim=false;if(step.via&&!B.went){const w=step.via[B.k||0];if(w){if(go(a,{x:w[0],z:w[1]}))B.k=(B.k||0)+1;return null}B.went=true;B.k=0}
    if(go(a,{x:step.at[0],z:step.at[1]})){P.yaw=yawTo(crewCentre(g).x-P.pos.x,crewCentre(g).z-P.pos.z);if(C.clock>=(g.cool||0)&&(B.tap||0)<C.clock){B.tap=C.clock+1;a.useTap=true}}if(step.via)B.went=true;return null}
  if(B.keepSign){const onR=C.kids.some(k=>(k.state==='line'||k.state==='hand')&&onRoadKid(k));P.aim=onR;if(!onR)B.keepSign=false}
  if(step.cross)return botCross(a,M,B,step);
  /* plain walking: wait for stragglers like a person would */
  if(lag>8||anyFree&&lag>5){if(!B.keepSign)P.aim=false;P.yaw=turn(P.yaw,yawTo(tail.x-P.pos.x,tail.z-P.pos.z),.1);return null}
  if(go(a,step,false,o.human)){B.i++;B.t=0}return null}
function botGear(a,M,B){const C=M.cg,P=a.P;if(C.gear){if(C.kids.every(k=>k.state==='line'||k.id==='kevin')){B.i=Math.max(B.i,1)}return null}
  if(hyp(P.pos.x-CHURCH.dee.x,P.pos.z-CHURCH.dee.z)>2.2){go(a,{x:CHURCH.dee.x,z:CHURCH.dee.z+1.5});return null}a.keys.e=true;return null}
function botCross(a,M,B,s){const C=M.cg,P=a.P;const line=lineKids(M);
  if(B.ph===''){P.aim=false;if(go(a,{x:s.from[0],z:s.from[1]})){B.ph='mid';B.t=0}return null}
  if(B.ph==='mid'){P.aim=true;if(go(a,{x:s.mid[0],z:s.mid[1]},false,true)){B.ph='hold';B.t=0;B.calm=0}return null}
  if(B.ph==='hold'){P.aim=true;const X=XINGS.find(x=>x.id===s.cross);const cx=(X.x0+X.x1)/2,cz=(X.z0+X.z1)/2;P.yaw=X.street==='h'?(B.t%6<3?Math.PI/2:-Math.PI/2):(B.t%6<3?0:Math.PI);
    const cc=carsComing(M,s.from[0],s.from[1])+carsComing(M,cx,cz);B.calm=cc?0:B.calm+1/30;
    if(C.atKerb&&B.calm>.8&&B.t>1.2){a.keys.e=true}if(C.waveT>0||C.atKerb==null&&B.t>4&&!line.some(k=>k.kerb)){B.ph='over';B.t=0}return null}
  if(B.ph==='over'){P.aim=true;const onR=C.kids.some(k=>(k.state==='line'||k.state==='hand')&&onRoadKid(k)),waiting=line.some(k=>k.kerb);
    const arrived=go(a,{x:s.to[0],z:s.to[1]},false,true);if(waiting&&B.t>2&&C.atKerb){a.keys.e=carsComing(M,s.from[0],s.from[1])===0}
    if(arrived&&!waiting&&B.t>1){B.ph='clear';B.t=0}return null}
  if(B.ph==='clear'){P.aim=true;const vx=s.to[0]-s.mid[0],vz=s.to[1]-s.mid[1];const onR=C.kids.some(k=>(k.state==='line'||k.state==='hand')&&(onRoadKid(k)||(k.x-s.mid[0])*vx+(k.z-s.mid[1])*vz<0));const nx=ROUTE[B.i+1]||{};const tgt=nx.x!=null?nx:nx.from?{x:nx.from[0],z:nx.from[1]}:null;
    if(tgt&&hyp(P.pos.x-s.to[0],P.pos.z-s.to[1])<14)go(a,tgt,false,true);if(!onR&&B.t>.5||B.t>25){B.ph='';B.i++;B.t=0;P.aim=false}return null}}
/* walk toward a point (the game's own movement: face it, hold W); true when there */
function go(a,p,run,slow){const P=a.P,dx=p.x-P.pos.x,dz=p.z-P.pos.z,d=hyp(dx,dz);if(d<.45)return true;const U=go.u||(go.u={x:0,z:0,t:0,side:0,sideT:0});
  /* unstick: no progress for half a second (a lamp post, a stoop) -> sidestep for a moment */
  if(hyp(P.pos.x-U.x,P.pos.z-U.z)>.08){U.x=P.pos.x;U.z=P.pos.z;U.t=0}else U.t+=1/30;if(U.t>.4&&U.sideT<=0){U.sideT=.8;U.t=0;const b=yawTo(dx,dz),off=sd=>({x:P.pos.x-Math.sin(b+sd*1.45),z:P.pos.z-Math.cos(b+sd*1.45)});U.side=isRoad(off(1).x,off(1).z)?-1:isRoad(off(-1).x,off(-1).z)?1:(U.side>0?-1:1)}
  let yaw=yawTo(dx,dz);if(U.sideT>0){U.sideT-=1/30;yaw+=U.side*1.45}P.yaw=turn(P.yaw,yaw,.35);a.keys.w=true;a.keys.shift=!!run;if(slow&&d<1.2)a.keys.w=(Math.floor(a.simT*10)%2)===0;return false}
if(typeof module!=='undefined'&&module.exports)module.exports={TUNE,KIDS,XINGS};
})();
