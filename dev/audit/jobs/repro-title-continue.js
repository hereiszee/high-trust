/* JOBS-AUDIT: Quit to title in the session you started a new game in: the title has no Continue, only "Clock in" (the new-game button).
   hasSave() (index.html) needs SAVEM.lastLoad.status!=='fresh', and a new game started this session stays 'fresh' until a reload.
   node dev/audit/jobs/repro-title-continue.js
   new game (real click) -> earn something (a finished job's pay: grant $500, prog.missionsRun 1) -> start a job -> Esc -> Quit to title ->
   confirm -> list the title buttons -> press the visible primary button -> what is left of the save? -> reload -> title buttons again */
const {boot,click}=require('./lib.js');
(async()=>{const {b,p,errs}=await boot();const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{const H=window.__ht;H.grant(500);H.prog.missionsRun=1;H.prog.done[0]=true;try{HT.Save.flush&&HT.Save.flush()}catch(e){}});
  await ev(()=>window.__A.unlock('porch'));await ev(()=>{window.__ht.jobs.start('porch');window.__ht.step(30)});
  await p.keyboard.press('Escape');await p.waitForTimeout(300);await click(p,'quit');await p.waitForTimeout(400);
  console.log('confirm',await ev(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Quit to title'&&b.offsetParent&&b.dataset.act!=='quit');if(b){b.click();return true}return false}));await p.waitForTimeout(800);
  const tb=()=>ev(()=>({mode:window.__ht.mode,btns:[...document.querySelectorAll('.ht-title button')].filter(b=>b.offsetParent).map(b=>b.dataset.act+':'+b.textContent.trim()),focus:document.activeElement&&document.activeElement.textContent.trim(),cash:window.__ht.cash,status:(()=>{try{const l=HT.Save.lastLoad;return typeof l==='function'?l().status:(l&&l.status)}catch(e){return String(e)}})()}));
  const t1=await tb();console.log('title after quitting',JSON.stringify(t1));
  await p.screenshot({path:require('path').join(__dirname,'../../../docs/audit/jobs/title-after-quit.jpg'),type:'jpeg',quality:75});
  await p.keyboard.press('Enter');await p.waitForTimeout(800);
  console.log('after Enter on the focused button',JSON.stringify(await ev(()=>({mode:window.__ht.mode,screen:window.__ht.HUD.screen,dialog:[...document.querySelectorAll('button')].filter(b=>b.offsetParent&&b.closest('[class*=dialog],[class*=dlg]')).map(b=>b.textContent.trim()),cash:window.__ht.cash,done0:window.__ht.prog.done[0]}))));
  await p.reload();await p.waitForFunction(()=>window.__ht&&window.__ht.assets&&window.__ht.assets.done,null,{timeout:90000});await p.waitForTimeout(800);
  console.log('after a reload',JSON.stringify(await tb()));
  const pe=errs.filter(e=>!/favicon/.test(e));console.log('page errors',JSON.stringify(pe.slice(0,3)));
  /* regression (fix/jobs): Continue is offered (and focused) right after quitting, without a reload */
  const ok=t1.btns.some(x=>x.startsWith('continue:'))&&/^Continue/.test(t1.focus||'')&&!pe.length;console.log(ok?'PASS J-06: Continue right after Quit to title':'FAIL J-06');await b.close();process.exit(ok?0:1)})().catch(e=>{console.error(e);process.exit(1)});
