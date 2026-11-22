/* =====================================================================
   PORCH LIGHT (SPEC3 2.22): the repeatable package guard, and the worked example docs/JOBS.md points at (the whole job path:
   home giver -> brief -> drive -> stages with [CP] 'deliveries' / 'pirates' -> checkpoint retry -> result card -> payout -> save
   -> fridge replay). Read this file top to bottom to see every piece a job needs.
   The Dadazon tracking page on the laptop: "Out for delivery". A delivery truck drops parcels on 4-5 porches of one street, on Maple
   or, once Riverside has asked you over, on a Riverside block (alternating runs; seeded, and the seed and street ride in the
   checkpoint so a retry gets the same street). Porch pirates come for them on foot, and from the second run a car pirate cruises
   the street with a passenger who hops out. Set up the lawn chair somewhere sensible and SIT in it (E): a seated dad scares off
   anyone heading for a porch within 12 m (6 m standing). That's reverse stealth: you're the one being avoided, so where you put
   yourself is the game.
   The response is proportionate: a word first (E near a pirate: "That's not yours, friend. Put it back." and he does), and only
   if he runs do you run him down (run into him: he gives up; E zip-ties). A car pirate who gets back in with a parcel stops for
   a dad standing in the lane ahead and hands it over. A parcel 40 m away (or driven off) is lost; 3 lost fails the job.
   Gate: done.hoa (SPEC3 3.3); "out for delivery" every 2nd in-game day after the first run. No guns: it's a porch.
   Medals: finished / no parcel lost / no parcel lost, nobody hurt, and every pirate scared off by the chair or turned round with a word.
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
const ID='porch';
const TUNE={truck:7,seatR:12,standR:6,lostD:40,brisk:2.8,run:4.6,sprintR:12,wordR:3.6,catchR:1.6,spawnFirst:6,spawnGap:13,carSpeed:6,carFlee:9,blockR:9,lose:3};
const CONTENTS=["Turbo Nose Hair Trimmer","Inflatable Hot Tub (Deluxe)","Forty Pounds of Birdseed","Novelty Mug: WORLD'S OKAYEST DAD","Replacement Gnome","A Smaller Box","Self-Stirring Soup Pot","Ukulele (Beginner)","Industrial Quantity of Glitter","Back Massager, Do Not Ask"];
const LINES={deter:["That dad's in a lawn chair. Facing the street. With a lemonade. Abort.","Nope. Lawn chair guy. Lawn chair guys see everything.","He waved at me. Why did he wave. I'm out."],
  carDeter:["Lawn chair dad. Keep driving. KEEP DRIVING.","Is he... saluting us? Go. Go go go."],
  grab:["Thanks for shopping!","Free shipping, baby!","Mine now!"],give:["Okay okay okay. It's a nose hair trimmer. I don't even want it.","I do cardio! ...I don't do cardio."],
  word:{prompt:"He's got a parcel that isn't his.",opts:[["That's not yours, friend. Put it back.",true],["I know your aunt. She'd want you to put that back.",true],["FREEZE, DIRTBAG!",false]],
    back:["...Yeah. Okay. Okay. Sorry.","My aunt WOULD want that. Ugh.","Putting it back. Putting it back. Don't tell anybody."],run:["NOPE!","You'll never take me alive! ...Wait, you can, I'm slow."]},
  block:"Whoa! WHOA. A dad. In the road. Okay. Here. Take your stupid parcel.",carGo:"Go go go! Drive!",
  ret:["Ma'am, your package. It's a... '{c}.'","Your parcel, sir. '{c}.' Sorry, it's been through a lot.","Signed, sealed, re-delivered. '{c}.'"],thanks:["Please don't tell anyone.","Oh! You're the Watch now? Thank you!","You are a saint. A sweaty saint."],
  chair:"Perfect. Shade, sightlines, cupholder.",sit:["Ahh. Lawn chair.","This is the life. Vigilance and lemonade.","Sitting. Watching. Hydrating."],
  noGuns:"It's a porch, not a standoff. Lawn chair. Lemonade. Eyebrows."};
const pick=(a,r)=>a[Math.floor((r?r():Math.random())*a.length)];
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const SV=()=>{const a=A();return a&&a.SV?a.SV():null};
function plan(s){s=s||SV();if(!s||!window.HT.Save||!HT.Save.jobRec)return{runs:0};const r=HT.Save.jobRec(s,ID);if(!r.plan||typeof r.plan!=='object')r.plan={};if(!isFinite(r.plan.runs))r.plan.runs=0;return r.plan}
function riversideOpen(){const s=SV(),d=s&&s.jobs;return !!(d&&((d.crossing&&d.crossing.done)||(d.dee&&d.dee.done)))}
/* today's street: Maple first; every other run on a Riverside block once Riverside has asked */
function todayHood(){return riversideOpen()&&(plan().runs%2===1)?'river':'maple'}

/* ================= the street: 4-5 porches in a row, parcels on the steps, the truck's lane in front ================= */
const STREETS={};
/* the Maple street is fixed (the brief's ring must match it); Riverside streets come from the run's seed */
const START_SEED=1;
function street(hood,seed){const k=hood+':'+(seed>>>0);if(STREETS[k])return STREETS[k];const a=A(),W=a&&a.WORLD,T=2;if(!W||!W.houses)return null;const R=rng(seed||1);let porches=null,face=1;
  if(hood==='river'&&W.porches&&W.porches.length){/* rows of rowhouse stoops: same row, same side, side by side */const rows={};for(const p of W.porches){if(p.face[0])continue;const key=p.tz+':'+p.face[1];(rows[key]=rows[key]||[]).push(p)}
    const good=Object.values(rows).map(l=>l.sort((p,q)=>p.x-q.x)).filter(l=>l.length>=4);if(good.length){const row=good[Math.floor(R()*good.length)];const n=Math.min(row.length,4+(R()<.5?1:0)),st=Math.floor(R()*(row.length-n+1));
      face=row[0].face[1];porches=row.slice(st,st+n).map((p,k)=>({k,x:p.x,z:p.z+face*.9,hx:p.x,hz:p.z-face*1.5,face}))}}
  if(!porches){/* Maple: the houses nearest home (not ours), porch points on their street side */const home=W.houses.find(h=>h.home)||W.houses[0];
    const cand=W.houses.filter(h=>!h.home&&h.face&&Math.hypot(h.cx-home.cx,h.cz-home.cz)>8&&Math.hypot(h.cx-home.cx,h.cz-home.cz)<90).sort((p,q)=>Math.hypot(p.cx-home.cx,p.cz-home.cz)-Math.hypot(q.cx-home.cx,q.cz-home.cz));
    const sameFace=cand.filter(h=>h.face===cand[0].face&&Math.abs((h.face==='s'?h.z1:h.z0)-(cand[0].face==='s'?cand[0].z1:cand[0].z0))<=1).slice(0,4);
    const hs=(sameFace.length>=4?sameFace:cand.slice(0,4)).sort((p,q)=>p.cx-q.cx);porches=hs.map((h,k)=>{const s=h.face==='s'?1:-1,z=(s>0?(h.z1+1)*T:h.z0*T)+s*1.1;return{k,x:h.cx,z,hx:h.cx,hz:h.cz,face:s}});face=porches[0].face;hood='maple'}
  const cx=porches.reduce((s,p)=>s+p.x,0)/porches.length,cz=porches.reduce((s,p)=>s+p.z,0)/porches.length;
  return STREETS[k]={hood,porches,cx,cz,road:{x:cx,z:cz+face*7},face}}
/* ================= props ================= */
function parcel(){const a=A(),g=new a.THREE.Group();a.box(.46,.3,.36,'#b8874f',0,.15,0,g);a.box(.47,.035,.08,'#d9c9a0',0,.3,0,g);a.box(.2,.004,.14,'#f4f1ea',.08,.302,.09,g);
  a.box(.06,.004,.06,'#3f8f5a',-.14,.302,.11,g);return g}
function lawnChair(){const a=A(),g=new a.THREE.Group(),al='#c8ccd0';
  for(const s of[-1,1]){a.box(.03,.03,.62,al,s*.27,.36,0,g);a.box(.03,.42,.03,al,s*.27,.18,.28,g);a.box(.03,.42,.03,al,s*.27,.18,-.24,g);const back=a.box(.03,.62,.03,al,s*.27,.62,.34,g);back.rotation.x=-.25;a.box(.03,.03,.36,al,s*.27,.58,-.02,g)}
  for(let i=0;i<5;i++){a.box(.54,.012,.07,i%2?'#2f8f5a':'#f4f1ea',0,.37,-.24+i*.12,g)}
  for(let i=0;i<5;i++){const w=a.box(.54,.07,.012,i%2?'#2f8f5a':'#f4f1ea',0,.46+i*.1,.36+i*.026,g);w.rotation.x=-.25}
  const cup=new a.THREE.Mesh(new a.THREE.CylinderGeometry(.04,.035,.12,10),a.mat('#f2e35a'));cup.position.set(.33,.42,-.1);g.add(cup);RESL.push(cup.geometry);return g}
/* the watch radius on the ground: shows where the chair scares pirates off (while you carry it, and faintly while you sit) */
function ringModel(){const a=A(),T=a.THREE,g=new T.RingGeometry(.94,1,64),m=new T.MeshBasicMaterial({color:new T.Color('#ffd23f').convertSRGBToLinear(),transparent:true,opacity:.55,depthWrite:false,side:T.DoubleSide});
  RESL.push(g,m);const r=new T.Mesh(g,m);r.rotation.x=-Math.PI/2;r.position.y=.05;r.renderOrder=2;a.wmAdd(r);return r}
function truckModel(){const a=A();const o=a.makeVehicle('workvan','#2e5e3e')||a.makeVanBox('#2e5e3e');a.wmAdd(o);if(o.userData&&o.userData.dispose)RESO.push(o);return o}
let RESL=[],RESO=[];function freeRes(){for(const r of RESL)try{r.dispose()}catch(_){}for(const o of RESO)try{o.userData.dispose()}catch(_){}RESL=[];RESO=[]}

/* ================= the job ================= */
J.register(ID,{
  def:{giver:'dadazon',giverName:'Dadazon Tracking',giverLook:{shirt:'#3f8f5a',pants:'#2a2a2a',cap:'#3f8f5a'},hood:'maple',title:'Porch Light',
    role:'Dadazon · Out for delivery today',place:'A delivery street',
    lines:["OUT FOR DELIVERY: parcels on one street today. Estimated arrival: between 9:00 am and the heat death of the universe.",
      "Doug's group chat says the porch pirates are back. Tote bag. Fast walk. And somebody's been cruising in a sedan.",
      "Grab the lawn chair, set it up where you can see the porches, and SIT in it. A dad in a lawn chair is the most powerful deterrent known to science."],
    obj:'Guard the porches while the truck delivers: set up the lawn chair and sit in it. A word first if a pirate takes a parcel; run him down only if he runs.',
    crew:[],weapons:[],noGuns:LINES.noGuns,from:{home:'laptop'},
    get start(){const s=street(todayHood(),START_SEED);return s?{x:s.road.x,z:s.road.z}:null},
    unlock:{done:['hoa'],when:()=>{/* SPEC3 3.3: out for delivery every 2nd in-game day (day 1, 3, 5 ...) once you've done it once */const s=SV();if(!s)return true;const r=s.jobs&&s.jobs[ID];if(!r||!r.runs)return true;return((s.day||1)-1)%2===0}},
    repeatable:true,pay:50,par:0,winTrust:0,roam:true,order:90,
    stages:['deliveries','pirates'],stageLabels:{deliveries:'The deliveries',pirates:'The pirates'},failPolicy:'escalate',
    medals:['Finished','No parcel lost','No parcel lost, nobody hurt, every pirate scared off or turned round with a word'],
    radio:[['you',"Okay. Lawn chair's in the back. Lemonade's in the cupholder. Let's watch some porches."]],
    endLine:"The street's parcels are where they belong. Somebody has a Turbo Nose Hair Trimmer and a secret."},
  start(M,o){const a=A(),cp=o&&o.checkpoint&&o.checkpoint.job;freeRes();
    const seed=(cp&&cp.seed)>>>0||((Math.random()*1e9)>>>0),hood=cp&&cp.hood||todayHood(),S=street(hood,hood==='river'?seed:START_SEED),R=rng(seed),runs=plan().runs|0;
    M.pc={seed,hood:S.hood,S,R,said:{},sit:false,seatT:0,talk:null};M.noCars=false;M.score=0;
    M.porches=S.porches.map(p=>({k:p.k,x:p.x,z:p.z,state:'wait',mesh:null,what:CONTENTS[Math.floor(R()*CONTENTS.length)]}));M.lost=0;M.saved=0;M.caught=0;M.deterred=0;M.talked=0;M.blocked=0;M.hurt=0;M.pir=[];M.spawned=0;M.spawnT=TUNE.spawnFirst;
    M.npir=Math.min(M.porches.length,3+(runs>=2?1:0)+(S.hood==='river'?1:0));M.carPir=runs>=1&&R()<.7;M.carDone=false;
    a.wmSetWindow(a.wmWindow(S.cx,S.cz,26));
    /* the lawn chair rides in the back of your car until you grab it */
    const c=M.car,ch=lawnChair();a.wmAdd(ch);const f={x:-Math.sin(c.yaw),z:-Math.cos(c.yaw)};
    const q=a.wmSnap(c.pos.x-f.x*3.2,c.pos.z-f.z*3.2);ch.position.set(q.x,0,q.z);ch.rotation.y=c.yaw;M.chair={mesh:ch,x:q.x,z:q.z,placed:false,held:false,yaw:c.yaw};M.pc.ring=ringModel();M.pc.ring.visible=false;
    /* the delivery truck drives the street and stops at each porch */
    const ln=S.porches.map(p=>({x:p.x,z:p.z+S.face*6}));const L0={x:ln[0].x-26,z:ln[0].z},L1={x:ln[ln.length-1].x+26,z:ln[ln.length-1].z};M.pc.L0=L0;M.pc.L1=L1;
    M.truck={obj:truckModel(),pts:[L0,...ln.map((p,k)=>Object.assign({stop:k},p)),L1],k:0,x:L0.x,z:L0.z,yaw:-Math.PI/2,wait:0,done:false};
    M.exitsP=[{x:L0.x-6,z:L0.z+S.face*2},{x:L1.x+6,z:L1.z+S.face*2}];
    if(!o||!o.checkpoint)a.radio('you',"There's the truck. Grab the lawn chair out of the back of the car.",true)},
  upd(dt,M,F){const a=A(),P=a.P,C=M.pc;if(!C)return;if(P.dude&&P.dude.gun)a.equip(P.dude,null);
    truck(dt,M);chairUpd(dt,M,F);pirates(dt,M,F);carPirate(dt,M,F);parcels(M,F);talkTick(M,dt);
    const seated=M.pc.sit;M.seated=seated;if(seated)C.seatT+=dt;
    const onPorch=M.porches.filter(p=>p.state==='porch').length,left=M.porches.filter(p=>p.state==='wait').length;
    F.objs.push([M.stage==='deliveries'?'Deliveries · '+(M.porches.length-left)+'/'+M.porches.length:'Parcels safe on porches · '+onPorch+'/'+M.porches.length,false]);
    if(!M.chair.placed)F.objs.push([M.chair.held?'Carry the lawn chair somewhere you can see the porches · E to set it down':'Grab the lawn chair from behind your car · hold E',false]);
    else F.objs.push([seated?'On watch · pirates avoid porches inside the yellow ring ('+TUNE.seatR+' m) · move to stand up':'Sit in the lawn chair · E (the watch ring doubles; hold E there to move it)',seated]);
    if(M.lost)F.objs.push(['Parcels lost · '+M.lost+'/'+TUNE.lose,false,'warn']);
    F.meters.push({id:'parcels',label:'Parcels',v:onPorch,max:M.porches.length,style:'pips'});
    const ch=M.pir.find(p=>p.st==='run'||p.st==='brisk');if(ch&&ch.from){const d=Math.hypot(ch.e.pos.x-ch.from.x,ch.e.pos.z-ch.from.z);F.meters.push({id:'getaway',label:'Getaway',v:d,max:TUNE.lostD,style:'bar',warn:TUNE.lostD*.7,sub:Math.round(TUNE.lostD-d)+' m left'})}
    if(M.lost>=TUNE.lose)return a.endMission(false,"Three parcels gone. Doug is drafting a strongly worded post.","The pirates won this round.");
    const busy=M.pir.some(p=>p.st==='walk'||p.st==='run'||p.st==='brisk'||p.st==='putback')||M.porches.some(p=>p.state==='dropped'||p.state==='carry'||p.state==='stolen'||p.state==='car')||(M.car2&&M.car2.st!=='gone');
    if(M.stage==='pirates'&&M.spawned>=M.npir&&(!M.carPir||M.carDone)&&!busy&&!M.pir.some(p=>p.e.state==='surrender')){if(!M.exitOpen){M.exitOpen=true;M.saved=M.porches.filter(p=>p.state==='porch').length;a.addTrust(.5*M.saved,M.pc.hood==='river'?'river':'maple');standUp(M);a.radio('you',"Street's quiet. Chair goes back in the car.",true)}}},
  /* [CP] the stage snapshot: the seed and the street ride along, so a retry gets the same street and the same parcels */
  save:M=>({seed:(M.pc&&M.pc.seed)>>>0,hood:M.pc&&M.pc.hood||'maple',porches:M.porches.map(p=>p.state==='carry'||p.state==='dropped'||p.state==='stolen'||p.state==='car'?'porch':p.state),lost:M.lost,chair:M.chair.placed?{x:M.chair.x,z:M.chair.z}:null,truck:M.truck.done}),
  load(M,s){const a=A();M.porches.forEach((p,k)=>{p.state=s.porches[k]||'wait';if(p.state==='porch'){p.mesh=parcel();a.wmAdd(p.mesh);p.mesh.position.set(p.x,0,p.z)}});M.lost=s.lost||0;
    if(s.chair){M.chair.placed=true;M.chair.x=s.chair.x;M.chair.z=s.chair.z;M.chair.mesh.position.set(s.chair.x,0,s.chair.z)}
    /* JOBS-AUDIT: the 'pirates' mark fires while the truck drives off its last point (truck.done still false); every parcel already out means it's gone,
       or it drives the street again and re-drops parcels (lost ones come back, restored ones get a second box) */
    if(s.truck||(s.porches||[]).length&&s.porches.every(x=>x&&x!=='wait')){M.truck.done=true;M.truck.obj.visible=false}M.spawned=0;M.spawnT=4},
  payout:(M,ok)=>ok?[['Parcels saved ×'+M.saved,15*M.saved],...(M.talked?[['A word first ×'+M.talked,10*M.talked]]:[]),...(M.caught?[['Pirates zip-tied ×'+M.caught,0]]:[]),...(ok&&!M.lost&&!M.hurt?[['Not a scratch on a single box',40]]:[])]:[],
  medal:M=>{const soft=M.deterred+M.talked+M.blocked,all=M.npir+(M.carPir?1:0);M.score=M.porches.filter(p=>p.state==='porch').length;return M.lost?1:(!M.hurt&&soft>=all)?3:2},
  end(M,ok){const s=SV();if(!s||!ok)return;const pl=plan(s);pl.runs=(pl.runs|0)+1;try{if(HT.Save.touch)HT.Save.touch('jobs')}catch(_){}},
  hud(state){state.weapon=null;state.weapons=[]},
  test:{/* dev/jobs-check.js drives this: place the chair badly so pirates come, have a word with one, tackle the next, put the parcels back */
    give(a){},step:(a,t,o)=>porchBot(a,t,o),
    sample:()=>({pc:{seed:99,hood:'maple'},porches:['wait','wait','wait','wait'].map(state=>({state})),lost:1,chair:{placed:false,mesh:{position:{set(){}}}},truck:{done:false,obj:{}}})}
});
function truck(dt,M){const a=A(),T=M.truck;if(T.done)return;const p=T.pts[T.k];if(!p){T.done=true;T.obj.visible=false;return}
  if(T.wait>0){T.wait-=dt;if(T.wait<=0&&p.stop!=null){const P_=M.porches[p.stop];P_.state='porch';P_.mesh=parcel();a.wmAdd(P_.mesh);P_.mesh.position.set(P_.x,0,P_.z);P_.mesh.rotation.y=Math.random();a.snd&&a.snd('cuff',.4);T.k++}}
  else{const dx=p.x-T.x,dz=p.z-T.z,d=Math.hypot(dx,dz);if(d<.4){if(p.stop!=null)T.wait=2.2;else T.k++}else{const s=Math.min(d,TUNE.truck*dt);T.x+=dx/d*s;T.z+=dz/d*s;T.yaw=Math.atan2(-dx,-dz)}}
  T.obj.position.set(T.x,a.groundAt(T.x,T.z),T.z);T.obj.rotation.set(0,T.yaw+Math.PI/2,0);
  if(T.k>=T.pts.length-1&&!T.done&&M.porches.every(p=>p.state!=='wait')){if(M.stage==='deliveries'){a.CP.mark('pirates');a.radio('you',"Truck's gone. Now we wait. Nobody's porch gets pirated on my watch.",true)}}
  if(T.k>=T.pts.length){T.done=true;T.obj.visible=false}}
/* ---------- the lawn chair: grab (hold E), carry, set down (E), sit (E); any move key stands you up ---------- */
function chairUpd(dt,M,F){const a=A(),P=a.P,C=M.chair,R_=M.pc.ring;
  if(M.pc.sit){P.pos.set(C.x,P.pos.y,C.z);const k=a.keys;if(k.w||k.a||k.s||k.d)standUp(M);else{try{const pp=HT.People;pp&&pp.force&&P.dude&&pp.force(P.dude,{mode:'sit',moving:false})}catch(_){}}}
  if(R_){const show=C.held||M.pc.sit||(C.placed&&Math.hypot(P.pos.x-C.x,P.pos.z-C.z)<3);R_.visible=show;const r=M.pc.sit?TUNE.seatR:TUNE.standR;const cx=C.held?P.pos.x:C.x,cz=C.held?P.pos.z:C.z;R_.position.set(cx,.05,cz);R_.scale.set(C.held?TUNE.seatR:r,C.held?TUNE.seatR:r,1);R_.material.opacity=M.pc.sit?.35:.6}
  if(C.held){if(!a.P.carry||a.P.carry.kind!=='chair'){C.held=false;return}F.taps.push({d:0,r:1,txt:'Set up the lawn chair here',fn:()=>{const mesh=a.P.carry.mesh;a.wmDrop();a.wmAdd(mesh);
      C.x=P.pos.x;C.z=P.pos.z;C.yaw=P.yaw+Math.PI;mesh.position.set(C.x,0,C.z);mesh.rotation.y=C.yaw;C.held=false;C.placed=true;a.radio('you',LINES.chair,true)}});return}
  if(C.placed&&!M.pc.sit&&!a.P.carry&&Math.hypot(P.pos.x-C.x,P.pos.z-C.z)<1.6)F.taps.push({x:C.x,z:C.z,r:1.6,txt:'Sit in the lawn chair',fn:()=>sitDown(M)});
  /* grab it (hold E); once it's set up, E sits, and to move it you hold E from the chair */if(!a.P.carry&&(!C.placed||M.pc.sit)&&Math.hypot(P.pos.x-C.x,P.pos.z-C.z)<1.8)F.holds.push({x:C.x,z:C.z,r:1.8,o:C,txt:C.placed?'Get up and move the lawn chair':'Grab the lawn chair',time:.6,fn:()=>{if(M.pc.sit)standUp(M);C.held=true;C.placed=false;a.wmCarry('chair',C.mesh,null)}});
  if(!C.placed&&!C.held)F.target={x:C.x,z:C.z,label:'Lawn chair'};else if(C.placed&&!M.pc.sit&&!F.target&&M.stage==='deliveries')F.target={x:C.x,z:C.z,label:'Sit here'}}
function sitDown(M){const a=A(),P=a.P,C=M.chair;M.pc.sit=true;P.pos.set(C.x,P.pos.y,C.z);P.yaw=C.yaw+Math.PI;for(const k of['w','a','s','d'])a.keys[k]=false;if(!M.pc.said.sit){M.pc.said.sit=1;a.radio('you',pick(LINES.sit),true)}}
function standUp(M){const a=A(),P=a.P;if(!M.pc||!M.pc.sit)return;M.pc.sit=false;try{const pp=HT.People;pp&&pp.force&&P.dude&&pp.force(P.dude,null)}catch(_){}P.pos.x+=Math.sin(P.yaw)*-.5;P.pos.z+=Math.cos(P.yaw)*-.5;a.collide(P.pos,.35)}
function deterR(M){const a=A(),P=a.P;return M.pc.sit?{x:M.chair.x,z:M.chair.z,r:TUNE.seatR}:{x:P.pos.x,z:P.pos.z,r:TUNE.standR}}
/* ---------- porch pirates on foot ---------- */
function pirates(dt,M,F){const a=A(),P=a.P;if(M.stage!=='pirates')return;
  if(M.spawned<M.npir){M.spawnT-=dt;if(M.spawnT<=0){M.spawnT=TUNE.spawnGap;spawnPirate(M)}}
  const D=deterR(M),sprinting=P.moving&&a.keys.shift&&!M.pc.sit;
  for(const p of M.pir){const e=p.e;if(e.state==='cuffed'){if(p.st!=='done'){p.st='done';M.caught++}continue}if(e.state==='dead'){if(p.st!=='done'){p.st='done';M.hurt++}continue}
    if(e.hp<e.maxhp&&!p.hit){p.hit=true;M.hurt++}
    if(e.state==='surrender'){if(p.st==='run'||p.st==='brisk')drop(M,p);p.st='surr';continue}
    if(p.st==='walk'){p.walkT=(p.walkT||0)+dt;if(p.walkT>35){p.st='leave';M.deterred++;go(e,p.exit,3.4,()=>vanish(M,p));continue}
      const t=M.porches[p.t];if(!t||t.state!=='porch'){retarget(M,p);continue}
      if(Math.hypot(t.x-D.x,t.z-D.z)<D.r&&Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z)<45){const n=retarget(M,p,true);if(!n){p.st='leave';M.deterred++;a.radio('Porch pirate',pick(LINES.deter),true);a.feed('Scared off by the lawn chair','trust');go(e,p.exit,3.4,()=>vanish(M,p))}}
      else if(!e.script)go(e,t,3.6,()=>grab(M,p))}
    else if(p.st==='leave'){p.leaveT=(p.leaveT||0)+dt;if(p.leaveT>25)vanish(M,p)}
    else if(p.st==='putback'){/* he takes it back to the porch himself */}
    else if(p.st==='brisk'||p.st==='run'){p.runT=(p.runT||0)+dt;const d=Math.hypot(e.pos.x-p.from.x,e.pos.z-p.from.z);F.target={x:e.pos.x,z:e.pos.z,label:p.st==='run'?'Porch pirate (running)':'Porch pirate · a word first'};
      /* he walks off briskly, and only runs if you run at him (or yell) */if(p.st==='brisk'&&sprinting&&Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z)<TUNE.sprintR){p.st='run';a.radio('Porch pirate',pick(LINES.word.run),true);go(e,p.exit,TUNE.run,()=>{})}
      if(p.runT>40&&d<TUNE.lostD)e.pos.set(p.exit.x,0,p.exit.z);
      if(!a.CV&&Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z)<TUNE.catchR&&(sprinting||p.st==='run')){a.surrender(e);a.radio('Porch pirate',pick(LINES.give),true);drop(M,p);p.st='surr'}
      else if(d>TUNE.lostD){M.lost++;const pk=M.porches[p.t];pk.state='lost';if(pk.mesh&&pk.mesh.parent)pk.mesh.parent.remove(pk.mesh);a.feed('Parcel lost','bad',M.lost+'/'+TUNE.lose);p.st='gone';vanish(M,p)}
      else if(!e.script)go(e,p.exit,p.st==='run'?TUNE.run:TUNE.brisk,()=>{})}
    if(e.state==='surrender'&&!F.target)F.target={x:e.pos.x,z:e.pos.z,label:'Zip-tie'}}}
function spawnPirate(M){const a=A(),ex=M.exitsP[M.spawned%2],q=a.wmSnap(ex.x,ex.z),e=a.spawnEnemy(q.x,q.z,false);a.equip(e.dude,null);e.gun=null;e.noLeash=true;e.hp=e.maxhp=40;
  const tag=document.createElement('div');tag.className='tag';tag.textContent='PORCH PIRATE';const host=document.getElementById('tags');if(host)host.appendChild(tag);e.tag=tag;
  const p={e,st:'walk',t:-1,exit:M.exitsP[(M.spawned+1)%2],from:null};M.pir.push(p);M.spawned++;retarget(M,p);a.rebuildTargets();
  if(M.spawned===1)a.radio('you',"Tote bag. Fast walk. There he is.",true)}
function retarget(M,p,avoid){const D=deterR(M),e=p.e;let best=-1,bd=1e9;M.porches.forEach((t,k)=>{if(t.state!=='porch')return;if(avoid&&Math.hypot(t.x-D.x,t.z-D.z)<D.r)return;const d=Math.hypot(t.x-e.pos.x,t.z-e.pos.z);if(d<bd){bd=d;best=k}});
  if(best<0){if(!avoid){p.st='leave';go(e,p.exit,3.4,()=>vanish(M,p))}return false}p.t=best;/* never leave him without a script: the combat AI would take over an unarmed man */go(e,M.porches[best],3.6,()=>grab(M,p));return true}
function go(e,t,speed,then){e.script={kind:'to',x:t.x,z:t.z,speed,then}}
function grab(M,p){const a=A(),t=M.porches[p.t];if(!t||t.state!=='porch'||p.st!=='walk')return retarget(M,p);t.state='stolen';p.st='brisk';p.from={x:t.x,z:t.z};
  if(t.mesh){if(t.mesh.parent)t.mesh.parent.remove(t.mesh);t.mesh.position.set(0,.95,.35);p.e.dude.root.add(t.mesh)}a.radio('Porch pirate',pick(LINES.grab),true);a.feed('A parcel is walking away','bad','walk up and have a word (E)');go(p.e,p.exit,TUNE.brisk,()=>{})}
function drop(M,p){const a=A(),t=M.porches[p.t];if(!t||t.state!=='stolen')return;t.state='dropped';if(t.mesh){if(t.mesh.parent)t.mesh.parent.remove(t.mesh);a.wmAdd(t.mesh);const q=a.wmSnap(p.e.pos.x+.8,p.e.pos.z);t.mesh.position.set(q.x,0,q.z);t.dx=q.x;t.dz=q.z}}
function vanish(M,p){const a=A(),e=p.e;e.script={kind:'incar'};e.state='dead';e.hp=0;if(e.tag){e.tag.remove();e.tag=null}if(e.dude.root.parent)e.dude.root.parent.remove(e.dude.root);const k=a.enemies.indexOf(e);if(k>=0)a.enemies.splice(k,1);if(p.st!=='gone')p.st='done';a.rebuildTargets()}
/* ---------- a word first ---------- */
function talkTo(M,p){const a=A(),H=a.HUD;if(M.pc.talk)return;const L=LINES.word;const opts=L.opts.map(o=>({text:o[0]}));const done=i=>{if(!M.pc.talk)return;M.pc.talk=null;try{a.overlay('porch-talk',null)}catch(_){}a.radio('you',L.opts[i][0],true);
    if(L.opts[i][1]&&p.st==='brisk'){a.radio('Porch pirate',pick(L.back));M.talked++;p.st='putback';p.talked=true;const t=M.porches[p.t];go(p.e,{x:t.x+.6,z:t.z},2.4,()=>{/* parcel back on its porch, and he goes */if(t.state==='stolen'){if(t.mesh){if(t.mesh.parent)t.mesh.parent.remove(t.mesh);a.wmAdd(t.mesh);t.mesh.position.set(t.x,0,t.z)}t.state='porch'}
        a.feed('He put it back','trust','a word first');p.st='leave';go(p.e,p.exit,3.2,()=>vanish(M,p))})}
    else if(p.st==='brisk'){p.st='run';a.radio('Porch pirate',pick(L.run));go(p.e,p.exit,TUNE.run,()=>{})}
    else if(p.car){carTalked(M,L.opts[i][1])}};
  let ch=null;try{ch=H&&H.kit&&H.kit.choices?H.kit.choices({speaker:'You',color:'#ffd23f',prompt:L.prompt,tell:'tote bag, avoiding eye contact',options:opts,onPick:i=>done(i)}):null}catch(_){ch=null}
  if(ch){try{a.overlay('porch-talk',ch.el)}catch(_){}}M.pc.talk={t:7,ch,done}}
function talkTick(M,dt){const T=M.pc.talk;if(T){T.t-=dt;if(T.t<=0)T.done(0)}}
/* ---------- the car pirate: a sedan cruises the street, a passenger hops out for a parcel ---------- */
function carPirate(dt,M,F){const a=A(),P=a.P,S=M.pc.S;if(M.stage!=='pirates'||!M.carPir||M.carDone)return;
  if(!M.car2){if(M.spawned<1||(M.carT=(M.carT||0)+dt)<9)return;const o=a.makeVehicle('sedan','#4a4f57');if(!o){M.carDone=true;return}a.wmAdd(o);if(o.userData&&o.userData.dispose)RESO.push(o);
    const L0=M.pc.L1,z=L0.z;M.car2={o,x:L0.x+10,z,dir:-1,spd:TUNE.carSpeed,st:'cruise',t:-1};a.radio('you',"Gray sedan. Slow. Too slow. Nobody drives that slow on purpose.",true)}
  const C=M.car2;C.o.position.set(C.x,0,C.z);C.o.rotation.y=C.dir<0?Math.PI:0;const V=window.HT&&HT.Vehicles;if(V&&V.update)try{V.update(C.o,{dt,speed:C.spd,steer:0,braking:C.st==='wait'||C.st==='blocked'})}catch(_){}
  const D=deterR(M);
  if(C.st==='cruise'){C.x+=C.dir*C.spd*dt;if(C.t<0){/* pick a parcel outside the watch radius, coming up ahead */const ok=M.porches.filter(p=>p.state==='porch'&&(p.x-C.x)*C.dir>4&&Math.hypot(p.x-D.x,p.z-D.z)>=D.r);
      if(ok.length)C.t=ok.sort((p,q)=>Math.abs(p.x-C.x)-Math.abs(q.x-C.x))[0].k;else if(M.porches.some(p=>p.state==='porch'&&(p.x-C.x)*C.dir>4)&&!C.said){C.said=1;a.radio('Car pirate',pick(LINES.carDeter),true);M.deterred++;a.feed('The sedan kept driving','trust','lawn chair dad')}}
    if(C.t>=0&&Math.abs(M.porches[C.t].x-C.x)<.6){C.st='wait';C.spd=0;const t=M.porches[C.t];const q=a.wmSnap(C.x,C.z-S.face*1.4),e=a.spawnEnemy(q.x,q.z,false);a.equip(e.dude,null);e.gun=null;e.noLeash=true;e.hp=e.maxhp=40;
      const tag=document.createElement('div');tag.className='tag';tag.textContent='CAR PIRATE';const host=document.getElementById('tags');if(host)host.appendChild(tag);e.tag=tag;
      const p={e,st:'walk',t:C.t,exit:{x:C.x,z:C.z-S.face*1.2},car:true,from:null};C.p=p;a.rebuildTargets();go(e,t,3.4,()=>{if(t.state!=='porch'||p.st!=='walk'){p.st='back';go(e,p.exit,3.4,()=>carBoard(M));return}
        t.state='car';p.st='back';if(t.mesh){if(t.mesh.parent)t.mesh.parent.remove(t.mesh);t.mesh.position.set(0,.95,.35);e.dude.root.add(t.mesh)}a.radio('Car pirate',pick(LINES.grab),true);a.feed('A car pirate has a parcel','bad','a word (E), or stand in the lane ahead of the car');go(e,p.exit,3.6,()=>carBoard(M))})}
    if(C.x<M.pc.L0.x-30){C.st='gone';C.o.visible=false;M.carDone=true}}
  else if(C.st==='wait'){const p=C.p;if(p&&p.e.state==='surrender'){const t=M.porches[p.t];if(t.state==='car'){t.state='dropped';if(t.mesh){if(t.mesh.parent)t.mesh.parent.remove(t.mesh);a.wmAdd(t.mesh);const q=a.wmSnap(p.e.pos.x+.8,p.e.pos.z);t.mesh.position.set(q.x,0,q.z);t.dx=q.x;t.dz=q.z}}C.st='flee';C.spd=TUNE.carFlee;a.radio('Car pirate driver',"Forget him! GO!",true)}
    if(p&&p.e.state==='cuffed'&&!p.counted){p.counted=1;M.caught++}
    if(p&&p.st==='back'&&!a.CV&&Math.hypot(p.e.pos.x-P.pos.x,p.e.pos.z-P.pos.z)<TUNE.catchR&&P.moving&&a.keys.shift){a.surrender(p.e);a.radio('Car pirate',pick(LINES.give),true)}}
  else if(C.st==='flee'||C.st==='blocked'){/* a dad standing in the lane ahead: he stops and hands the parcel over */const ahead=(P.pos.x-C.x)*C.dir;const inLane=!a.CV&&Math.abs(P.pos.z-C.z)<2.2&&ahead>0&&ahead<TUNE.blockR;
    if(C.st==='flee'&&inLane&&C.parcel!=null){C.st='blocked';C.spd=0;M.blocked++;const t=M.porches[C.parcel];t.state='dropped';if(!t.mesh){t.mesh=parcel()}if(t.mesh.parent)t.mesh.parent.remove(t.mesh);a.wmAdd(t.mesh);const q=a.wmSnap(C.x-C.dir*0,C.z-S.face*1.6);t.mesh.position.set(q.x,0,q.z);t.dx=q.x;t.dz=q.z;C.parcel=null;a.radio('Car pirate',LINES.block,true);a.feed('The sedan stopped for a dad in the road','trust','parcel handed over');C.waitT=2.5}
    if(C.st==='blocked'){C.waitT-=dt;if(C.waitT<=0){C.st='flee';C.spd=TUNE.carFlee*.7}}else C.x+=C.dir*C.spd*dt;
    if(C.st==='flee'&&C.parcel!=null){F.target={x:C.x+C.dir*6,z:C.z,label:'Stand in the lane ahead'};F.objs.push(['The sedan has a parcel: stand in the lane ahead of it',false,'warn'])}
    if(C.x<M.pc.L0.x-34||C.x>M.pc.L1.x+34){if(C.parcel!=null){const t=M.porches[C.parcel];t.state='lost';M.lost++;a.feed('Parcel lost','bad',M.lost+'/'+TUNE.lose)}C.st='gone';C.o.visible=false;M.carDone=true;if(C.p&&C.p.e.state!=='surrender'&&C.p.e.state!=='cuffed'&&C.p.e.state!=='dead')vanish(M,C.p)}}
  else if(C.st==='gone')M.carDone=true;
  /* the passenger: a word works on him too */const p=C.p;if(p&&p.st==='back'&&p.e.state==='idle'&&!M.pc.talk&&!a.CV&&Math.hypot(p.e.pos.x-P.pos.x,p.e.pos.z-P.pos.z)<TUNE.wordR)F.taps.push({x:p.e.pos.x,z:p.e.pos.z,r:TUNE.wordR,txt:'Have a word',fn:()=>talkTo(M,p)});
  if(p&&(p.st==='walk'||p.st==='back')&&!F.target)F.target={x:p.e.pos.x,z:p.e.pos.z,label:'Car pirate'}}
function carBoard(M){const a=A(),C=M.car2,p=C&&C.p;if(!p||p.e.state!=='idle')return;const t=M.porches[p.t];if(t.state==='car'){C.parcel=p.t;if(t.mesh&&t.mesh.parent)t.mesh.parent.remove(t.mesh)}
  p.st='done';const e=p.e;e.script={kind:'incar'};e.state='dead';e.hp=0;if(e.tag){e.tag.remove();e.tag=null}if(e.dude.root.parent)e.dude.root.parent.remove(e.dude.root);const k=a.enemies.indexOf(e);if(k>=0)a.enemies.splice(k,1);a.rebuildTargets();C.p=null;
  C.st='flee';C.spd=TUNE.carFlee;a.radio('Car pirate',LINES.carGo,true)}
function carTalked(M,good){const a=A(),C=M.car2,p=C&&C.p;if(!p)return;const t=M.porches[p.t];
  if(good){a.radio('Car pirate',pick(LINES.word.back));M.talked++;if(t.state==='car'){t.state='porch';if(t.mesh){if(t.mesh.parent)t.mesh.parent.remove(t.mesh);a.wmAdd(t.mesh);t.mesh.position.set(t.x,0,t.z)}}a.feed('He put it back','trust','a word first');go(p.e,p.exit,3.2,()=>carBoard(M))}
  else{a.radio('Car pirate',pick(LINES.word.run));go(p.e,p.exit,5,()=>carBoard(M))}}
/* ---------- parcels back to their porches; a word for the pirates on foot ---------- */
function parcels(M,F){const a=A(),P=a.P;
  for(const p of M.pir){if(p.st==='brisk'&&!M.pc.talk&&!a.CV&&Math.hypot(p.e.pos.x-P.pos.x,p.e.pos.z-P.pos.z)<TUNE.wordR)F.taps.push({x:p.e.pos.x,z:p.e.pos.z,r:TUNE.wordR,txt:'Have a word',fn:()=>talkTo(M,p)})}
  for(const t of M.porches){if(t.state==='dropped'&&!a.P.carry)F.holds.push({x:t.dx,z:t.dz,r:1.7,o:t,txt:'Pick up the parcel',time:.7,fn:()=>{t.state='carry';a.wmCarry('box',t.mesh,t)}});
    if(t.state==='dropped'&&!F.target)F.target={x:t.dx,z:t.dz,label:'Parcel'}}
  const c=a.P.carry;if(c&&c.kind==='box'){const t=c.it;F.target={x:t.x,z:t.z,label:'Porch'};F.objs.push(['Carry the parcel back to its porch',false]);
    F.taps.push({x:t.x,z:t.z,r:2.2,txt:'Put the parcel back',fn:()=>{const mesh=c.mesh;a.wmDrop();a.wmAdd(mesh);mesh.position.set(t.x,0,t.z);t.state='porch';a.radio('you',pick(LINES.ret).replace('{c}',t.what),true);a.radio('Neighbor',pick(LINES.thanks));a.feed('Parcel returned','trust','+0.5 trust')}})}}
/* ---------- the result card: a porch's numbers ---------- */
J.on('hud',()=>{const a=A(),M=a&&a.M;if(!M||!M.def||M.def.id!==ID||!M.pc||M.state==='go'||M.resDone||typeof document==='undefined')return;const r=document.querySelector('.ht-result .col');if(!r)return;M.resDone=true;
  const n=M.porches.length,safe=M.porches.filter(p=>p.state==='porch').length;const h=r.querySelector('h2');
  if(h&&M.state==='won')h.textContent=M.lost?'Most of the parcels made it.':M.talked?'A word first. Every time.':M.deterred>=M.npir?'Nobody even tried. Lawn chair.':'Every box home.';
  const cells=[...r.querySelectorAll('.ht-stats > div')];const set=(d,k,v,sub)=>{if(!d)return;d.innerHTML='';const b=document.createElement('b'),sp=document.createElement('span');b.textContent=k;sp.className='ht-num';sp.textContent=v;d.appendChild(b);d.appendChild(sp);if(sub){const sm=document.createElement('small');sm.textContent=sub;d.appendChild(sm)}};
  const by=k=>cells.find(d=>{const b=d.querySelector('b');return b&&b.textContent.trim().toLowerCase()===k});
  set(by('neutralized'),'Parcels safe',safe+'/'+n,M.pc.hood==='river'?'Riverside block':'Maple Heights');set(by('zip-tied'),'A word first',String(M.talked),M.caught?M.caught+' zip-tied after running':'nobody had to run');
  set(by('time'),'Scared off',String(M.deterred+M.blocked),'by a lawn chair'+(M.blocked?' and a dad in the road':''));set(by('trust'),'Lost',String(M.lost),M.lost?'Doug is drafting a post':'not one box')});
/* free the job's own geometry when it ends */
J.on('pose',()=>{const a=A();if(!a)return;const M=a.M;if(a.mode==='mission'&&M&&M.def&&M.def.id===ID&&M.state==='go')return;if(M&&M.pc&&M.pc.sit)standUp(M);if(M&&M.pc&&M.pc.talk){try{a.overlay('porch-talk',null)}catch(_){}M.pc.talk=null}if(RESL.length||RESO.length)freeRes()});

/* ================= the scripted player for dev/jobs-check.js =================
   o.fail: sets the chair down far away and sits on its hands until three parcels are lost. Otherwise: chair a little way off (so
   pirates come), sits, has a word with a pirate who has a parcel, runs down one who runs, zip-ties, puts parcels back, blocks the
   sedan, then sits back down in the middle of the street to scare the rest off. */
function porchBot(a,t,o){const M=a.M,P=a.P;if(!M||M.state!=='go'||!M.porches||!M.pc)return null;const tp=(x,z)=>{P.pos.set(x,0,z);a.collide(P.pos,.35)};const S=M.pc.S;const k=a.keys;
  if(a.CV){a.exitCar();return null}k.shift=false;k.w=false;const chase=e=>{/* run straight at him, the way a person would */P.yaw=Math.atan2(-(e.pos.x-P.pos.x),-(e.pos.z-P.pos.z));k.w=true;k.shift=true};
  if(M.pc.talk){if(t%15===0&&M.pc.talk.ch){try{M.pc.talk.ch.pick(0)}catch(_){M.pc.talk.done(0)}}return null}
  if(o&&o.fail){if(!M.chair.placed&&!M.chair.held){tp(M.chair.x+1,M.chair.z);k.e=true}else if(M.chair.held){k.e=false;tp(S.cx+60,S.cz);a.useTap=true}else if(!M.pc.sit&&t%20===0){tp(M.chair.x+.5,M.chair.z);a.useTap=true}return null}
  k.e=false;
  if(!M.chair.placed&&!M.chair.held){tp(M.chair.x+1,M.chair.z);k.e=true;return null}
  if(M.chair.held){tp(S.cx+40,S.cz+S.face*4);a.useTap=true;return null}/* far enough that the first pirate comes */
  const stand=()=>{if(M.pc.sit)standUp(M)};
  const sur=M.pir.concat(M.car2&&M.car2.p?[M.car2.p]:[]).find(p=>p.e.state==='surrender');if(sur){stand();tp(sur.e.pos.x+1,sur.e.pos.z);a.useTap=true;return null}
  const run=M.pir.find(p=>p.st==='run');if(run){stand();if(Math.hypot(run.e.pos.x-P.pos.x,run.e.pos.z-P.pos.z)>3)tp(run.e.pos.x+2.2,run.e.pos.z);chase(run.e);return null}
  const brisk=M.pir.find(p=>p.st==='brisk');if(brisk){stand();/* the first one gets a word; the next one, the bot sprints at (testing both paths) */if(!M.pc.worded){tp(brisk.e.pos.x+1.6,brisk.e.pos.z);if(t%10===0){a.useTap=true;M.pc.worded=1}}else{if(Math.hypot(brisk.e.pos.x-P.pos.x,brisk.e.pos.z-P.pos.z)>6)tp(brisk.e.pos.x+4,brisk.e.pos.z);chase(brisk.e)}return null}
  const C=M.car2;if(C&&C.st==='flee'&&C.parcel!=null){stand();tp(C.x+C.dir*6,C.z);return null}
  if(C&&C.p&&C.p.st==='back'&&C.p.e.state==='idle'){stand();tp(C.p.e.pos.x+1.4,C.p.e.pos.z);if(t%10===0)a.useTap=true;return null}
  const c=P.carry;if(c&&c.kind==='box'){stand();tp(c.it.x+.5,c.it.z);a.useTap=true;return null}
  const dr=M.porches.find(t=>t.state==='dropped');if(dr){stand();tp(dr.dx+.5,dr.dz);k.e=true;return null}
  if(M.exitOpen){stand();const e=M.car;tp(e.pos.x+2.5,e.pos.z);a.useTap=true;return null}
  if(M.stage==='pirates'&&M.spawned>=2&&t%60===0&&!M.pc.middle){/* sit back down in the middle of the street: the rest should be scared off */const Ch=M.chair;Ch.x=S.cx;Ch.z=S.cz+S.face*2.5;Ch.mesh.position.set(Ch.x,0,Ch.z);M.pc.middle=1;stand();tp(Ch.x+.5,Ch.z)}
  if(!M.pc.sit&&Math.hypot(P.pos.x-M.chair.x,P.pos.z-M.chair.z)<3){if(t%20===0)a.useTap=true}else if(!M.pc.sit)tp(M.chair.x+.6,M.chair.z);
  return null}
})();
