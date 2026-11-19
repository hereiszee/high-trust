const L=require('./lib.js');const DPR=+process.env.DPR||1;
(async()=>{let {browser,ctx,page,errs}=await L.open({deviceScaleFactor:DPR});
  const ev=(f,a)=>page.evaluate(f,a);const step=n=>page.evaluate(n=>__ht.step(n),n);
  const frames=(n=3)=>page.evaluate(n=>new Promise(r=>{let k=0;const f=()=>{if(++k>=n)r();else requestAnimationFrame(f)};requestAnimationFrame(f)}),n);
  await page.waitForFunction(()=>window.__ht&&__ht.assets.done,null,{timeout:60000});await page.waitForTimeout(300);
  // title -> settings -> back (Esc)
  await L.click(page,'.ht-title [data-act=settings]');await page.waitForTimeout(500);console.log('title settings',await ev(()=>HT.HUD.screen));
  await page.keyboard.press('Escape');await page.waitForTimeout(400);console.log('after esc',await ev(()=>HT.HUD.screen));
  await L.click(page,'.ht-title [data-act=newgame]');await page.waitForTimeout(300);
  await ev(()=>__ht.startMission(0));await step(10);
  // damage arc
  await ev(()=>{const P=__ht.P,e=__ht.enemies[0];e.alert=true;e.target=P;P.hp-=30});await frames(2);await ev(()=>{for(const p of document.querySelectorAll('.ht-dmg path'))for(const a of p.getAnimations()){a.currentTime=300;a.pause()}});
  console.log('dmg arcs',await ev(()=>document.querySelectorAll('.ht-dmg path').length));
  await page.screenshot({path:'docs/screenshots/hud-ingame/damage_arc_wide.jpg',type:'jpeg',quality:84});
  // Esc opens pause, P closes, P opens, Esc closes
  const st=()=>ev(()=>({screen:HT.HUD.screen}));
  await page.keyboard.press('Escape');await page.waitForTimeout(400);console.log('esc ->',await st());
  await L.shot(page,'pause_wide');
  await page.keyboard.press('p');await page.waitForTimeout(400);console.log('p ->',await st());
  await page.keyboard.press('p');await page.waitForTimeout(400);console.log('p ->',await st());
  await page.keyboard.press('Escape');await page.waitForTimeout(400);console.log('esc ->',await st());
  await page.keyboard.press('Escape');await page.waitForTimeout(400);
  // controls tab
  const range=async(k,v)=>{await page.$eval('#hts-'+k,(r,v)=>{r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}))},v)};
  await range('sens',13);await range('ads',80);
  await L.click(page,'#hts-invert');await L.click(page,'#hts-fp');
  await L.click(page,'.ht-pause [data-tab=display]');await page.waitForTimeout(200);
  await range('fov',92);await L.click(page,'.ht-seg3[data-k=gfx] button[data-v=low]');await L.click(page,'#hts-mmRotate');
  await L.shot(page,'pause_display_wide');
  await L.click(page,'.ht-pause [data-tab=audio]');await page.waitForTimeout(200);await range('master',40);
  console.log('audio items',await ev(()=>[...document.querySelectorAll('.ht-pane input')].map(i=>i.dataset.k)));
  const cfg=await ev(()=>JSON.parse(localStorage.getItem('ht-cfg')));console.log('cfg',cfg,'P.fp',await ev(()=>__ht.P.fp),'gfx',await ev(()=>__ht.render.q));
  await L.click(page,'.ht-pause [data-act=resume]');await page.waitForTimeout(400);await step(20);await frames(4);
  console.log('resume ->',await st());
  // abandon from pause
  await page.keyboard.press('Escape');await page.waitForTimeout(300);await L.click(page,'.ht-pause [data-act=abandon]');await page.waitForTimeout(400);console.log('abandon ->',await ev(()=>({screen:HT.HUD.screen,M:!!__ht.M})));
  // reload page: settings persisted
  await page.reload();await page.waitForFunction(()=>window.__ht&&__ht.assets.done,null,{timeout:60000});await page.waitForTimeout(300);
  await L.click(page,'.ht-title [data-act=newgame]');await page.waitForTimeout(300);await page.keyboard.press('Escape');await page.waitForTimeout(400);
  console.log('persisted',await ev(()=>({sens:document.querySelector('#hts-sens').value,ads:document.querySelector('#hts-ads').value,inv:document.querySelector('#hts-invert').getAttribute('aria-checked'),fp:document.querySelector('#hts-fp').getAttribute('aria-checked'),Pfp:__ht.P.fp,gfx:__ht.render.q})));
  // quit to title
  await ev(()=>{window._acts=[];HT.HUD.on('action',a=>_acts.push(a));document.addEventListener('mousedown',e=>_acts.push('down:'+e.target.className),true);document.addEventListener('click',e=>_acts.push('click:'+e.target.className),true)});await L.click(page,'.ht-pause [data-act=quit]');await page.waitForTimeout(300);console.log('acts',await ev(()=>_acts));await page.waitForTimeout(500);console.log('quit ->',await st());
  await L.click(page,'.ht-title [data-act=newgame]');await page.waitForTimeout(300);
  // finale
  await ev(()=>{__ht.prog.done=[true,true,true,true];__ht.prog.trust=78;__ht.prog.cuffed=5;__ht.enterHub()});await page.waitForTimeout(800);
  console.log('finale',await ev(()=>({screen:HT.HUD.screen,h:document.querySelector('.ht-result h2').textContent})));await L.shot(page,'finale_wide');
  await L.click(page,'.ht-result [data-act="result:go"]');await page.waitForTimeout(400);console.log('new saturday',await ev(()=>({screen:HT.HUD.screen,done:__ht.prog.done,trust:__ht.prog.trust})));
  await ev(()=>localStorage.removeItem('ht-cfg'));
  console.log('lock waits',L.lockWaits||0);console.log('ERRS',errs);await browser.close()})();
