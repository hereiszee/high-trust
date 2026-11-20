/* Aim: Hold / Toggle (QA): real mouse and keyboard in headless Chromium.
   1. default Hold: right button down aims, up lowers
   2. pause menu (P) -> Controls -> Aim: Toggle (a real click) -> saved in ht-cfg
   3. Toggle: right click aims and stays up with nothing held; left click fires while aiming (no second held button); right click lowers
   4. a job with def.aimToggle (Crossing Guard) is a toggle even when the setting is Hold
   node dev/aim-toggle.js */
const {open}=require('./ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(300);await ev(async()=>{await window.__ht.jobs.ready;window.__ht.step(3)});
  const aim=()=>ev(()=>!!window.__ht.P.aim);const step=n=>ev(n=>window.__ht.step(n),n);
  /* a gun in hand (free roam starts holstered): the Maple job loadout */
  await ev(()=>{const H=window.__ht;H.startMission(0);H.step(30)});
  await p.mouse.move(640,360);await p.mouse.down({button:'right'});await step(2);await p.mouse.up({button:'right'});await step(1);/* the first click may only ask for pointer lock */
  await p.mouse.down({button:'right'});await step(2);const h1=await aim();await p.mouse.up({button:'right'});await step(2);const h2=await aim();
  ok(h1&&!h2,'Hold (default): right down aims ('+h1+'), up lowers ('+h2+')');
  await p.keyboard.press('p');await step(1);await p.waitForTimeout(200);
  const tab=await p.$('[data-tab=controls]');if(tab)await tab.click().catch(()=>{});
  const btn=await p.$('.ht-seg3[data-k=aimMode] button[data-v=toggle]');ok(!!btn,'pause menu has Aim: Hold / Toggle');if(btn)await btn.click();
  const cfg=await ev(()=>{try{return JSON.parse(localStorage.getItem('ht-cfg')||'{}').aimMode}catch(e){return null}});ok(cfg==='toggle','saved: ht-cfg.aimMode='+cfg);
  await p.keyboard.press('Escape');await ev(()=>{window.__ht.running=true});await step(2);
  await p.mouse.down({button:'right'});await step(1);await p.mouse.up({button:'right'});await step(3);const t1=await aim();
  const a0=await ev(()=>{const H=window.__ht;return H.P.ammo&&H.P.cur&&H.P.ammo[H.P.cur]?H.P.ammo[H.P.cur].mag:null});
  await p.mouse.down({button:'left'});await step(3);await p.mouse.up({button:'left'});await step(10);const t2=await aim();
  const a1=await ev(()=>{const H=window.__ht;return H.P.ammo&&H.P.cur&&H.P.ammo[H.P.cur]?H.P.ammo[H.P.cur].mag:null});
  await p.mouse.down({button:'right'});await step(1);await p.mouse.up({button:'right'});await step(2);const t3=await aim();
  ok(t1&&t2&&!t3,'Toggle: right click aims and stays up ('+t1+'), a left click fires while aiming ('+a0+'->'+a1+', still aiming '+t2+'), right click lowers ('+t3+')');
  ok(a0!=null&&a1<a0,'fired a shot while aim was toggled up (mag '+a0+'->'+a1+')');
  /* back to Hold, then a job that forces the toggle */
  await p.keyboard.press('p');await step(1);await p.waitForTimeout(150);{const t2_=await p.$('[data-tab=controls]');if(t2_)await t2_.click().catch(()=>{});const hb=await p.$('.ht-seg3[data-k=aimMode] button[data-v=hold]');if(hb)await hb.click()}
  await p.keyboard.press('Escape');await ev(()=>{window.__ht.running=true});await step(2);
  await p.mouse.down({button:'right'});await step(2);const h3=await aim();await p.mouse.up({button:'right'});await step(2);const h4=await aim();ok(h3&&!h4,'back to Hold: down aims, up lowers ('+h3+','+h4+')');
  const forced=await ev(()=>{const H=window.__ht;if(H.M&&H.M.state==='go')H.jobs.finish(false);H.step(50);if(H.UIacts&&H.UIacts['result:go'])H.UIacts['result:go']();H.step(3);
    const c=H.MISSIONS.find(m=>m.id==='crossing');return c?!!c.aimToggle:null});ok(forced===true,'Crossing Guard declares aimToggle');
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,5).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
