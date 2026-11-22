/* C-5: start a night job (Sabotage), Pause -> Quit to title (confirm). Is the title backdrop left at night?  node dev/audit/code/c5-night-quit.js */
const {open}=require('../../ai-ingame-lib.js');
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3)});
  await ev(async()=>{await window.__ht.jobs.ready});
  const r0=await ev(()=>{const H=window.__ht;const ok=H.jobs.start('sabotage');H.step(10);return{started:!!ok,mode:H.mode,job:H.M&&H.M.def&&H.M.def.id,state:H.M&&H.M.state,night:window.NIGHT?+window.NIGHT.target:null}});
  console.log('job:',JSON.stringify(r0));
  await ev(()=>{const H=window.__ht;if(H.HUD.screen)H.HUD.hide(H.HUD.screen);H.step(2)});
  await ev(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true})));await p.waitForTimeout(300);
  await ev(()=>{const b=document.querySelector('.ht-pause [data-act=quit]');b&&b.click()});await p.waitForTimeout(300);
  await ev(()=>{const b=document.querySelector('.ht-dlg [data-dlg=ok]');b&&b.click()});await p.waitForTimeout(400);await ev(()=>window.__ht.step(3));
  const r1=await ev(()=>({mode:window.__ht.mode,screen:window.__ht.HUD.screen,nightTarget:window.NIGHT?+window.NIGHT.target:null,nightK:window.NIGHT?+(window.NIGHT.k||0).toFixed(2):null}));
  console.log('title:',JSON.stringify(r1));
  await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(2500);
  const r2=await ev(()=>{const g=[...document.querySelectorAll('.hts-gem')].filter(e=>e.offsetParent&&getComputedStyle(e).display!=='none');return{stealthGemOnTitle:g.map(e=>e.textContent),titleVisible:!!document.querySelector('.ht-title.on'),nightTarget:+NIGHT.target,nightK:+NIGHT.k.toFixed(2)}});console.log('title, live frames for 2.5 s:',JSON.stringify(r2));await p.screenshot({path:'docs/audit/code/c5-title-after-night-job.jpg',type:'jpeg',quality:70});
  console.log(errs.length?'console errors: '+errs.slice(0,4).join(' | '):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
