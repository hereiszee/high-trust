/* HT.Photo with real input (SPEC3 4.3): Playwright mouse and keyboard events on the game canvas, not __ht calls.
   node dev/photo-mouse.js   — starts Exhibit HOA, stands on Phil's porch, then:
   1 one right-click raises the phone and it stays up      2 one left-click takes a photo
   3 right button held + left click (two buttons) shoots   4 a held right press (>250 ms) that raised it lowers on release
   5 Space and Enter shoot, 1-2-3 zoom, F toggles the flash, Q lowers     6 right-click when up lowers
   7 left-click when down raises (trackpads)   8 pointer lock state is reported (headless may refuse it; the phone works either way) */
const {open}=require('./ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(400);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);H.jobs.registry.get('hoa').test.give(H.jobs.api);H.jobs.start('hoa')});
  await p.waitForFunction(()=>{const H=window.__ht;H.step(5);return H.M&&H.M.ph==='intro'},null,{timeout:60000,polling:300});
  await ev(()=>{const H=window.__ht,M=H.M;M.ph='stake0';H.step(3);H.P.pos.set(102.3,0,48.65);H.P.yaw=-1.3;H.step(5)});
  const st=()=>ev(()=>{const H=window.__ht,Ph=window.HT.Photo;H.step(3);return{up:Ph.isRaised(),n:Ph.gallery.length,zoom:Ph.zoom,flash:document.querySelector('.ph-fl')&&document.querySelector('.ph-fl').classList.contains('on'),lock:!!document.pointerLockElement}});
  const box=await p.locator('canvas').first().boundingBox();const cx=box.x+box.width/2,cy=box.y+box.height/2;
  await p.mouse.move(cx,cy);await p.mouse.click(cx,cy);await p.waitForTimeout(150);/* the first click may only ask for pointer lock */
  let s=await st();console.log('     pointer lock: '+(s.lock?'locked':'not locked (headless)'));if(s.up){await p.keyboard.press('q');s=await st()}
  ok(!s.up,'starts lowered');
  await p.mouse.click(cx,cy,{button:'right'});s=await st();ok(s.up,'one right-click raises the phone');
  await ev(()=>window.__ht.step(30));s=await st();ok(s.up,'and it stays up with nothing held');
  const n0=s.n;await ev(()=>window.__ht.step(20));await p.mouse.click(cx,cy);s=await st();ok(s.n===n0+1,'one left-click takes a photo ('+n0+' -> '+s.n+')');
  await ev(()=>window.__ht.step(15));await p.keyboard.press(' ');s=await st();ok(s.n===n0+2,'Space takes a photo');
  await ev(()=>window.__ht.step(15));await p.keyboard.press('Enter');s=await st();ok(s.n===n0+3,'Enter takes a photo');
  await p.keyboard.press('3');s=await st();ok(s.zoom===4,'3 zooms to 4x');await p.keyboard.press('1');s=await st();ok(s.zoom===1,'1 back to 1x');
  await p.mouse.wheel(0,-120);s=await st();ok(s.zoom===2,'wheel up zooms in (2x)');
  const f0=s.flash;await p.keyboard.press('f');s=await st();ok(s.flash===!f0,'F toggles the flash');
  await p.mouse.click(cx,cy,{button:'right'});s=await st();ok(!s.up,'right-click again lowers it');
  await p.mouse.click(cx,cy);s=await st();ok(s.up,'left-click while lowered raises it (one-button trackpads)');
  await p.keyboard.press('q');s=await st();ok(!s.up,'Q lowers it');
  /* both buttons: right held, left clicked */
  await p.mouse.down({button:'right'});s=await st();ok(s.up,'right button down raises');const n1=s.n;await ev(()=>window.__ht.step(20));
  await p.mouse.click(cx,cy,{button:'left'});s=await st();ok(s.n===n1+1,'left click with right still held takes a photo');
  await p.waitForTimeout(300);await p.mouse.up({button:'right'});s=await st();ok(!s.up,'releasing a long right press lowers it (hold-to-raise)');
  await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});s=await st();ok(s.up,'a quick right click still toggles up');
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,3).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
