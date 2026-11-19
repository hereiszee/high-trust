/* follow-up checks: title premise, ammo toast, headshot marker, M blocked under a menu, key bindings, result card + payout at 720p */
const L=require('./lib.js');const DPR=+process.env.DPR||1;
(async()=>{const {browser,page,errs}=await L.open({deviceScaleFactor:DPR});const ev=(f,a)=>page.evaluate(f,a);
  const frames=(n=3)=>page.evaluate(n=>new Promise(r=>{let k=0;const f=()=>{if(++k>=n)r();else requestAnimationFrame(f)};requestAnimationFrame(f)}),n);
  await page.waitForFunction(()=>window.__ht&&__ht.assets.done,null,{timeout:90000});await page.waitForTimeout(400);
  console.log('premise',await ev(()=>(document.querySelector('.ht-title .premise')||{}).textContent));await L.shot(page,'title_wide');
  await L.click(page,'.ht-title [data-act=newgame]');await page.waitForTimeout(400);
  // M map blocked while HT.Menus says a menu is open
  const hasMenus=await ev(()=>!!(window.HT&&HT.Menus&&HT.Menus.isOpen));
  await ev(()=>{window.__menuOpen=true;if(HT.Menus){HT.Menus._io=HT.Menus.isOpen;HT.Menus.isOpen=()=>window.__menuOpen}});
  await page.keyboard.press('m');await page.waitForTimeout(300);const blocked=!(await ev(()=>HT.HUD.minimap.mapOpen));
  await ev(()=>{window.__menuOpen=false});await page.keyboard.press('m');await page.waitForTimeout(300);const opens=await ev(()=>HT.HUD.minimap.mapOpen);
  await page.keyboard.press('m');await page.waitForTimeout(300);await ev(()=>{if(HT.Menus&&HT.Menus._io)HT.Menus.isOpen=HT.Menus._io});
  console.log('menus api',hasMenus,'M blocked under menu',blocked,'M opens otherwise',opens);
  // mission: ammo toast + headshot marker
  await ev(()=>__ht.startMission(0));await page.waitForTimeout(4500);await ev(()=>__ht.step(5));
  await ev(()=>{HT.HUD.ammoToast('+24 9mm','#9fe58a');HT.HUD.ammoToast('12ga full');for(const e of document.querySelectorAll('.ht-at'))for(const a of e.getAnimations()){a.currentTime=600;a.pause()}});
  console.log('ammo toast',await ev(()=>[...document.querySelectorAll('.ht-wp .ht-at')].map(e=>e.textContent)));
  await L.shot(page,'ammo_toast_wide');
  await ev(()=>HT.HUD.hit('headhit'));await ev(()=>{for(const a of document.getAnimations()){const t=a.effect&&a.effect.target;if(t&&(t.classList.contains('ht-hm')||t.classList.contains('hs'))){a.currentTime=120;a.pause()}}});
  await page.screenshot({path:'docs/screenshots/hud-ingame/headshot_marker.jpg',type:'jpeg',quality:84,clip:{x:560,y:280,width:160,height:160},timeout:180000});
  // pause -> key bindings
  await page.keyboard.press('Escape');await page.waitForTimeout(500);await L.click(page,'.ht-pause [data-tab=keys]');await page.waitForTimeout(300);
  console.log('keys',await ev(()=>[...document.querySelectorAll('.ht-keys>div')].map(d=>d.firstChild.textContent).filter(t=>/Jump|Decorate|Map/.test(t))));
  await L.shot(page,'pause_keys_wide');await L.click(page,'.ht-pause [data-act=resume]');await page.waitForTimeout(400);
  // result card at 720p with the payout
  await ev(()=>{__ht.M.got=4;for(const it of __ht.L.items)it.got=true});await ev(()=>__ht.step(2));await ev(()=>{const x=__ht.L.exit;__ht.P.pos.set(x.x,0,x.z)});await ev(()=>__ht.step(1));
  await page.waitForFunction(()=>HT.HUD.screen==='result',null,{timeout:20000});await page.waitForTimeout(5000);
  const r=await ev(()=>{const b=document.querySelector('.ht-result [data-act="result:go"]').getBoundingClientRect(),col=document.querySelector('.ht-result .col');return{btnTop:Math.round(b.top),btnBottom:Math.round(b.bottom),vh:innerHeight,scrollH:col.scrollHeight,clientH:col.clientHeight,rows:document.querySelectorAll('.ht-result .htp-line,.ht-result .ht-pay-row').length,label:document.querySelector('.ht-result [data-act="result:go"]').textContent}});
  console.log('result',JSON.stringify(r),'button visible',r.btnBottom<=r.vh&&r.btnTop>=0);
  await L.shot(page,'result_payout_wide');
  console.log('ERRS',errs);await browser.close()})();
