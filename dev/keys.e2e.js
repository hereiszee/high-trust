/* Key rebinding (js/keys.js) in the real game, headless: node dev/keys.e2e.js
   remap at the door (the new key drives the action, the old one is swallowed), swap on conflict, the Key bindings screen captures
   a key, reserved keys are refused, keycaps relabel, bindings persist, reset. Console errors fail the run. */
const {open}=require('./ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(2);localStorage.removeItem('ht-keys');HT.Keys.reset()});
  ok(await ev(()=>!!window.HT.Keys&&HT.Keys.get('fwd')==='w'),'HT.Keys loaded, defaults in place');
  await ev(()=>HT.Keys.set('fwd','i'));
  await p.keyboard.down('i');const w1=await ev(()=>window.__ht.keys.w);await p.keyboard.up('i');const w2=await ev(()=>window.__ht.keys.w);
  ok(w1===true&&w2===false,'rebound key I drives Move forward (keys.w '+w1+' -> '+w2+')');
  await p.keyboard.down('w');const w3=await ev(()=>window.__ht.keys.w);await p.keyboard.up('w');
  ok(w3!==true,'the old key W is swallowed');
  const p0=await ev(()=>({x:__ht.P.pos.x,z:__ht.P.pos.z}));await p.keyboard.down('i');await ev(()=>__ht.step(30));await p.keyboard.up('i');
  const p1=await ev(()=>({x:__ht.P.pos.x,z:__ht.P.pos.z}));ok(Math.hypot(p1.x-p0.x,p1.z-p0.z)>1,'the dad walks on I');
  await ev(()=>HT.Keys.set('reload','e'));
  ok(await ev(()=>HT.Keys.get('use')==='r'&&HT.Keys.get('reload')==='e'),'taking E for Reload swaps Use onto R');
  ok(await ev(()=>HT.Keys.relabel('E')==='R'&&HT.Keys.relabel('R')==='E'&&HT.Keys.relabel('Space')===null),'keycaps relabel (prompt E shows R)');
  ok(await ev(()=>JSON.parse(localStorage.getItem('ht-keys')).fwd==='i'),'bindings saved (ht-keys)');
  ok(await ev(()=>HT.Keys.set('jump','escape')===false&&HT.Keys.set('jump','1')===false),'Esc and 1-3 are reserved');
  /* mouse: Fire onto a key, Use onto the middle button, Aim as a toggle on the right button */
  await ev(()=>HT.Keys.reset());await ev(()=>{HT.Keys.set('fire','j');HT.Keys.set('use','mouse3')});
  await p.keyboard.down('j');const f1=await ev(()=>window.HT.Roam.mouseDown);await p.keyboard.up('j');const f2=await ev(()=>window.HT.Roam.mouseDown);
  ok(f1===true&&f2===false,'Fire on J: the trigger follows the key ('+f1+' -> '+f2+')');
  const box=await p.locator('#c').boundingBox();const cx=box.x+box.width/2,cy=box.y+box.height/2;
  await p.mouse.move(cx,cy);await p.mouse.down({button:'middle'});const e1=await ev(()=>window.__ht.keys.e);await p.mouse.up({button:'middle'});const e2=await ev(()=>window.__ht.keys.e);
  ok(e1===true&&e2===false,'Use on Mouse 3: middle button holds E ('+e1+' -> '+e2+')');
  ok(await ev(()=>HT.Keys.relabel('E')==='Mouse 3'),'the E prompt reads Mouse 3');
  await ev(()=>{HT.Keys.reset();HT.Keys.aimMode='toggle'});await p.mouse.click(cx,cy);/* first click on the view asks for pointer lock (refused headless) */await ev(()=>{window.__ht.P.aim=false;window.HT.Roam.mouseDown=false});
  await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});const a1=await ev(()=>window.__ht.P.aim);
  await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});const a2=await ev(()=>window.__ht.P.aim);
  ok(a1===true&&a2===false,'Aim: Toggle: right click on, right click off ('+a1+', '+a2+')');
  await ev(()=>{HT.Keys.aimMode='hold'});await p.mouse.click(cx,cy);/* first click on the view asks for pointer lock (refused headless) */await ev(()=>{window.__ht.P.aim=false;window.HT.Roam.mouseDown=false});
  await p.mouse.down({button:'right'});const a3=await ev(()=>window.__ht.P.aim);await p.mouse.up({button:'right'});const a4=await ev(()=>window.__ht.P.aim);
  ok(a3===true&&a4===false,'Aim: Hold works as before');
  await ev(()=>{HT.Keys.set('fwd','i');HT.Keys.set('reload','e')});
  /* the screen */
  await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
  await ev(()=>{try{document.exitPointerLock()}catch(e){}});await p.waitForTimeout(200);/* a held pointer lock would eat the Esc below */
  await ev(()=>{if(!window.HT.Input.paused)window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))});await p.waitForTimeout(500);
  await p.click('.ht-pause [data-tab=keys]');
  ok(await p.isVisible('[data-rebind=crouch]'),'Key bindings tab lists rebindable actions');
  await p.click('[data-rebind=crouch]');await p.keyboard.press('KeyK');await p.waitForTimeout(200);
  ok(await ev(()=>HT.Keys.get('crouch')==='k'),'click + press K rebinds Crouch');
  ok((await p.textContent('[data-rebind=crouch]')).trim()==='K','the button shows K');
  await p.click('[data-rebind=crouch]');await p.keyboard.press('Escape');await p.waitForTimeout(200);
  const esc=await ev(()=>({crouch:HT.Keys.get('crouch'),paused:window.HT.Input.paused,running:window.HT.Input.running,screen:window.__ht.HUD.screen,lock:!!document.pointerLockElement,wait:!!document.querySelector('.ht-rb.wait')}));
  ok(esc.crouch==='k'&&esc.paused&&!esc.wait,'Esc cancels a capture without closing the pause menu '+JSON.stringify(esc));
  await p.click('[data-rebind-reset]');
  ok(await ev(()=>HT.Keys.get('fwd')==='w'&&HT.Keys.get('crouch')==='c'&&!HT.Keys.changed&&Object.keys(HT.Keys.map).length===0&&HT.Keys.aimMode==='toggle'),'reset restores defaults (Aim: Toggle)');
  await p.click('[data-rebind=jump]');await p.mouse.click(5,5);await p.waitForTimeout(200);
  ok(await ev(()=>HT.Keys.get('jump')===' '&&window.HT.Input.paused),'clicking elsewhere cancels a capture');
  ok(errs.length===0,'no console errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
