/* Crossing Guard with REAL input (Playwright mouse and keyboard on the game canvas; pointer lock requested the way the game does it).
   The owner can't hold one button while doing something else, so nothing in this job is hold-to-use:
     the stop sign is a toggle (right-click up, it STAYS up with nothing held while you walk with W, right-click or Q puts it down),
     and every E action is a single press that completes on its own: take the vest and sign, wave them across, hold Rosie's hand.
   Setup goes through __ht (start the job, let the cast build, park at a kerb); every action under test is a real event.
   node dev/jobs/crossing-mouse.js */
const {open}=require('../ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;const j=H.jobs.registry.get('crossing');j.test.give(H.jobs.api);H.prog.done[H.jobs.index('dee')]=true;
    const pp=window.HT.People;await Promise.race([pp.preload(['dee','son','daughter','nb_kid','nb_gran','thug_hoodie','thug_track','thug_f_hood','thug_beanie','thug_red','thug_jacket']),new Promise(r=>setTimeout(r,20000))]);
    H.jobs.start('crossing');for(let i=0;i<400&&!H.M.cg.built;i++)H.step(1);H.P.pos.set(331,0,39.4);H.P.yaw=0;H.step(3)});
  const steps=n=>ev(n=>window.__ht.step(n),n);
  const st=()=>ev(()=>{const H=window.__ht,M=H.M,C=M.cg;return{gear:!!C.gear,up:!!(C.sign&&C.sign.up),on:!!C.signOn,aim:!!H.P.aim,x:+H.P.pos.x.toFixed(2),z:+H.P.pos.z.toFixed(2),lock:!!document.pointerLockElement,
    wave:+(C.waveT||0).toFixed(2),rosie:(C.kids.find(k=>k.id==='rosie')||{}).state}});
  const box=await p.locator('canvas').first().boundingBox();const cx=box.x+box.width/2,cy=box.y+box.height/2;
  await p.mouse.move(cx,cy);await p.mouse.click(cx,cy);await p.waitForTimeout(150);await steps(2);/* the first click may only ask for pointer lock */
  let s=await st();console.log('     pointer lock: '+(s.lock?'locked':'not granted by headless Chromium (events still reach the game)'));
  /* E at Pastor Dee: one press, no hold */
  ok(!s.gear,'starts without the vest and sign');await p.keyboard.press('e');await steps(3);s=await st();ok(s.gear,'one E press at Pastor Dee: vest and sign on (tap, nothing held)');
  await steps(40);s=await st();ok(!s.on,'the sign starts down');
  /* right-click: up, and it stays up while walking with W held */
  await p.mouse.click(cx,cy,{button:'right'});await steps(2);s=await st();ok(s.up&&s.on&&!s.aim,'one right-click raises the sign (no aim held) '+JSON.stringify(s));
  const x0=s.x,z0=s.z;await ev(()=>{window.__ht.P.yaw=-Math.PI/2});/* east along the church sidewalk */await p.keyboard.down('w');await steps(90);s=await st();await p.keyboard.up('w');
  ok(s.up&&hypot(s.x-x0,s.z-z0)>3,'still up after 3 s of walking with W held (moved '+hypot(s.x-x0,s.z-z0).toFixed(1)+' m) '+JSON.stringify(s));
  await p.mouse.click(cx,cy,{button:'right'});await steps(2);s=await st();ok(!s.up&&!s.on,'right-click again lowers it '+JSON.stringify(s));
  await p.mouse.down({button:'right'});await steps(2);await p.waitForTimeout(400);await p.mouse.up({button:'right'});await steps(2);s=await st();ok(s.up,'a long right press raises it and releasing leaves it up (pure toggle)');
  await p.keyboard.press('q');await steps(2);s=await st();ok(!s.up,'Q lowers it');
  /* touch: the HUD aim button toggles it too */
  await ev(()=>{const H=window.__ht;H.HUD.emit&&H.HUD.emit('touch','aim',true);H.step(2)});s=await st();const tUp=s.up;
  await ev(()=>{const H=window.__ht;H.HUD.emit&&H.HUD.emit('touch','aim',true);H.step(2)});s=await st();ok(tUp&&!s.up,'touch AIM button toggles it up and down');
  /* the wave: walk the line to the Main St kerb with the scripted player, then one real E press */
  const k=await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('crossing'),a=H.jobs.api,C=H.M.cg;let t=0;for(;t<2400&&!(C.atKerb&&C.atKerb.length&&C.cs!==0&&H.P.pos.z>40.5);t++){j.test.step(a,t,{});H.step(1)}/* stop the scripted player as soon as the line waits at the kerb, before it waves */
    H.jobs.api.useTap=false;H.M.cg.signOn=true;
    /* stop the scripted player at the kerb: put the line back on the near side, sign up, nothing waved */
    for(const id in C.trail.runs){C.trail.runs[id].ok=0}C.waveT=0;for(let i=0;i<30;i++)H.step(1);return{t,atKerb:C.atKerb?C.atKerb.map(k=>k.id):null}});
  ok(k.atKerb&&k.atKerb.length,'the line waits at the Main St kerb '+JSON.stringify(k));
  await p.keyboard.press('e');await steps(2);s=await st();ok(s.wave>0,'one E press waves them across (no hold) '+JSON.stringify(s));
  /* Rosie: she sits down; one E press next to her and she holds your hand */
  await ev(()=>{const H=window.__ht,M=H.M,C=M.cg,r=C.kids.find(k=>k.id==='rosie');r.state='free';r.free={mode:'act',x:r.x,z:r.z,speed:1,dur:999,crouch:true,sit:true,gatherable:false,t:0};H.P.pos.set(r.x+1.2,0,r.z);H.step(3)});
  await p.keyboard.press('e');await steps(2);s=await st();ok(s.rosie==='hand','one E press: Rosie holds your hand '+JSON.stringify(s));
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,3).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
function hypot(a,b){return Math.hypot(a,b)}
