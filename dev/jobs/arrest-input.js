/* Hands Off with real input: Playwright keyboard and mouse events only (no __ht calls for the actions themselves).
   node dev/jobs/arrest-input.js
   Setup may place the dad (teleports between beats), but every action is a key or a mouse button, the way a player with a mouse under
   pointer lock does it: E to talk, 1-4 to pick, the mouse to look, G and right-click to toggle the beanbag, left-click to fire.
   Two sessions, one browser at a time. 1) under pointer lock: keys and mouse buttons (headless Chromium reports a locked mouse's
   movementX as +x then -x per move, so the aim in this session is set as setup); 2) with pointer lock refused, the game's cursor-look
   path: real mouse moves turn the view onto a collector (the watch bracket) and onto the skimmer (the green ring), then a click fires.
   Checks: pointer lock taken by a click; E talks to Rosa; E + 1 at the honey stall gives a clue; mouse-look turns the view onto a collector
   and the watch bracket follows him; E + 3 points him out; E + 2 sends him to his car; G draws and stays drawn after release;
   right-click holsters (a toggle, not a hold); right-click draws again; the mouse puts the ring on him; a left click fires the one round. */
const {open}=require('../ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
async function session(LOCK){const {b,p,errs}=await open({viewport:{width:1280,height:720}});const ev=(f,a)=>p.evaluate(f,a);console.log('-- session: '+(LOCK?'pointer lock':'pointer lock refused (cursor look)'));
  if(!LOCK)await ev(()=>{HTMLCanvasElement.prototype.requestPointerLock=function(){return Promise.reject(new Error('refused'))}});
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  await p.evaluate(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('arrest');j.test.give(H.jobs.api);
    const pm=window.HT.People;await Promise.race([pm.preload(['rosa','dad_gary','nb_pops','nb_office','nb_sweater','nb_kenji','nb_marcus','nb_mei','nb_lucia','nb_gran','nb_teen','nb_kid','thug_hoodie','thug_track','thug_beanie','thug_red']).catch(()=>{}),new Promise(r=>setTimeout(r,40000))]);
    if(H.mode==='hub'){H.enterHub();H.step(2)}H.jobs.start('arrest');H.step(2);const w=H.jobs.castWait;if(w)await w;H.step(30)});
  const step=n=>ev(n=>window.__ht.step(n),n);
  const O=()=>ev(()=>{const M=window.__ht.M,O=M&&M.ho;if(!O)return null;const sk=O.cols&&O.cols[O.skim];return{stage:O.stage,talked:O.talked,clues:O.clues.length,chat:!!O.chat,ided:O.ided,drawn:O.drawn,ret:O.ret,round:O.round,
    down:!!O.down,watch:O.watch.c?O.watch.c.col.id:null,skim:sk&&sk.col.id,ruse:sk&&sk.ruse&&sk.ruse.kind+':'+sk.ruse.st,state:M.state,aim:window.__ht.P.aim,yaw:window.__ht.P.yaw}});
  const place=(x,z,yaw,pitch)=>ev(([x,z,yaw,pitch])=>{const H=window.__ht;H.P.pos.set(x,0,z);H.collide(H.P.pos,.35);H.P.yaw=yaw;H.P.pitch=pitch||-.05;H.step(2)},[x,z,yaw,pitch]);
  /* pointer lock from a real click on the canvas */
  await p.mouse.click(640,360);await step(2);const lock=await ev(()=>!!document.pointerLockElement);console.log('     pointer lock: '+lock);if(LOCK)ok(lock,'a click on the canvas takes pointer lock');
  /* look with the mouse until the view centre is on (x,y,z): closed loop on the real mouse */
  const lookAt=async(who,tol)=>{let mx=640,my=360;for(let i=0;i<40;i++){const d=await ev(aimAt,who);if(!d)return false;if(Math.abs(d.dy)<(tol||.01)&&Math.abs(d.dp)<(tol||.01)*1.5)return true;
      const s=d.s;const px=Math.max(-300,Math.min(300,-d.dy/s)),py=Math.max(-200,Math.min(200,-d.dp/s));mx+=px;my+=py;
      if(lock)await p.mouse.move(mx,my,{steps:2});else{await p.mouse.move(mx,my,{steps:2})}await step(1);if(mx<100||mx>1180||my<80||my>640){mx=640;my=360;await p.mouse.move(mx,my)}}return false};
  const aimAt=who=>{const H=window.__ht,M=H.M,O=M.ho,c=who==='skim'?O.cols[O.skim]:O.cols.find(q=>q.col.id===who);const cam=H.camera.position,dx=c.x-cam.x,dz=c.z-cam.z,dy=1.25-cam.y;
    const want=Math.atan2(-dx,-dz),wp=Math.atan2(dy,Math.hypot(dx,dz));let d=want-H.P.yaw;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
    const CFG=JSON.parse(localStorage.getItem('ht-cfg')||'{}');const sens=CFG.sens||7;const s=sens*.00032*(H.P.adsT>.5?((CFG.ads||55)/100):1);return{dy:d,dp:wp-H.P.pitch,s}};
  const setAim=async who=>{for(let i=0;i<8;i++){const d=await ev(aimAt,who);await ev(d=>{const P=window.__ht.P;P.yaw+=d.dy;P.pitch+=d.dp},d);await step(1)}return true};
  /* 1. E talks to Rosa */
  await place(366,44.2,0);await p.keyboard.press('e');await step(3);let o=await O();ok(o.talked&&o.stage==='market','E at the garden stall talks to Rosa ('+JSON.stringify({talked:o.talked,stage:o.stage})+')');
  await step(90);
  /* 2. the honey stall: E opens the strip, 1 asks about the collectors */
  await place(371.4,44.3,Math.PI);await p.keyboard.press('e');await step(2);o=await O();ok(o.chat,'E at the honey stall opens the choice strip');
  await p.keyboard.press('1');await step(3);o=await O();ok(!o.chat&&o.clues>=1,'key 1 picks "Seen anything funny" and the notebook gets a clue ('+o.clues+')');
  /* 3. the mouse watches a collector */
  const sk=o.skim;/* setup: the other collectors are elsewhere in the market for this beat */await ev(()=>{const H=window.__ht,O=H.M.ho,c=O.cols[O.skim];c.st='idle';c.next=99;O.cols.forEach((q,i)=>{if(q!==c){q.x=c.x<380?402-i:356+i;q.z=41.6;q.st='idle';q.next=99}})});
  const sp=await ev(()=>{const H=window.__ht,O=H.M.ho,c=O.cols[O.skim];return{x:c.x,z:c.z}});await place(Math.min(400,Math.max(356,sp.x+6)),sp.z<43?44.4:41.8,Math.PI/2);
  const looked=await lookAt('skim',.02);await step(10);o=await O();ok(looked&&o.watch===sk,'mouse-look turns the view onto the '+sk+' collector and the watch bracket is on him (watching '+o.watch+')');
  /* 4. E + 3: point him out */
  await ev(()=>{const H=window.__ht,O=H.M.ho,c=O.cols[O.skim];H.P.pos.set(c.x+1.2,0,c.z);H.collide(H.P.pos,.35);H.step(2)});await p.keyboard.press('e');await step(2);o=await O();ok(o.chat,'E next to him opens the strip');
  await p.keyboard.press('3');await step(4);o=await O();ok(o.ided&&o.stage==='aside','key 3 points him out to Rosa: identified ('+o.stage+')');
  await ev(()=>{const O=window.__ht.M.ho;O.cols[O.skim].next=0});await step(150);
  /* 5. G before he's alone: refused near the kids? (west block) -> just check E + 2 sends him to his car */
  await ev(()=>{const H=window.__ht,O=H.M.ho,c=O.cols[O.skim];H.P.pos.set(c.x+1.2,0,c.z);H.collide(H.P.pos,.35);H.step(2)});await p.keyboard.press('e');await step(2);await p.keyboard.press('2');await step(4);o=await O();
  ok(/^tow:/.test(o.ruse||''),'E + key 2: "they\'re towing your hatchback" sends him to his car ('+o.ruse+')');
  /* follow: wait for him to get there (stepping), then stand off to the east */
  for(let i=0;i<40;i++){o=await O();if(o.ruse==='tow:wait')break;await step(30)}ok(o.ruse==='tow:wait','he reached his car round the corner ('+o.ruse+')');
  await place(408.8,15.9,Math.PI/2,-.02);await step(20);
  /* 6. G draws (a toggle: still drawn after the key is released), right-click holsters, right-click draws again */
  await p.keyboard.press('g');await step(6);o=await O();ok(o.drawn&&o.aim,'G draws the beanbag (drawn '+o.drawn+', aim '+o.aim+')');
  await step(10);o=await O();ok(o.drawn,'still drawn after G is released (toggle, not a hold)');
  await p.mouse.down({button:'right'});await step(2);await p.mouse.up({button:'right'});await step(3);o=await O();ok(!o.drawn&&!o.aim,'a right-click holsters it');
  await p.mouse.down({button:'right'});await step(2);await p.mouse.up({button:'right'});await step(3);o=await O();ok(o.drawn&&o.aim,'a second right-click draws again, and it stays drawn after the button is up');
  /* 7. the mouse puts the ring on him; a left click fires the one round */
  const on=LOCK?await setAim('skim'):await lookAt('skim',.006);await step(3);o=await O();ok(o.ret==='ok','the mouse puts the ring on him and it goes green (ret '+o.ret+')');
  await p.mouse.down({button:'left'});await step(1);await p.mouse.up({button:'left'});await step(4);o=await O();ok(o.round===0,'a left click fires the one round (round '+o.round+')');
  ok(o.down,'he\'s down: one beanbag ('+JSON.stringify({down:o.down,state:o.state})+')');
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,4).join(' | '):''));
  await b.close()}
(async()=>{await session(true);await session(false);console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
