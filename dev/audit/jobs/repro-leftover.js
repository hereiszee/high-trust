/* JOBS-AUDIT: what a job leaves behind in the hub when you leave it mid-stage.
   node dev/audit/jobs/repro-leftover.js <job> <stage> <how>     how = abandon (Esc -> Abandon job) | home (fail -> "Head home") | title (Esc -> Quit to title -> Quit -> Continue)
   Real Escape key and real clicks; the job's own bot plays up to <stage>. After leaving, the real rAF loop runs for 4 s, then the hub is
   compared with the hub before the job (night, overlays, fov, keys, gun, vehicles, job props). */
const {boot,click,live,waitCard}=require('./lib.js');const [JOB,STAGE,HOW]=process.argv.slice(2);
(async()=>{const {b,p,errs}=await boot();const ev=(f,a)=>p.evaluate(f,a);
  await ev(id=>window.__A.unlock(id),JOB);await ev(id=>window.__A.cast(id),JOB);await ev(()=>{const H=window.__ht;H.enterHub();H.step(10)});await live(p,1500);
  const base=await ev(()=>window.__A.snap());
  await ev(id=>{window.__ht.jobs.start(id);window.__ht.step(3)},JOB);
  const adv=await ev(([id,st])=>window.__A.play(id,{},15000,"M.stage==='"+st+"'"),[JOB,STAGE]);console.log('advanced',JSON.stringify(adv));
  await live(p,800);const mid=await ev(()=>window.__A.snap());console.log('mid-job: night',JSON.stringify(mid.night),'overlays',JSON.stringify(mid.overlays),'fov',mid.fov);
  if(HOW==='abandon'){await p.keyboard.press('Escape');await p.waitForTimeout(300);console.log('Abandon clicked',await click(p,'abandon'))}
  else if(HOW==='home'){await ev(()=>window.__ht.jobs.api.endMission(false,'audit: forced fail'));const c=await waitCard(p);console.log('card',JSON.stringify(c&&c.btns));console.log('Head home clicked',await click(p,'result:go'))}
  else if(HOW==='title'){await p.keyboard.press('Escape');await p.waitForTimeout(300);await click(p,'quit');await p.waitForTimeout(400);
    await ev(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Quit to title'&&b.offsetParent&&b.closest('[class*=dialog],[class*=dlg]'));if(b)b.click()});await p.waitForTimeout(600);
    await live(p,1500);const t=await ev(()=>({mode:window.__ht.mode,night:window.__ht.night.target,ov:[...document.querySelectorAll('.ht-ovl > *')].filter(e=>!e.classList.contains('out')).map(e=>e.dataset.ov)}));console.log('on the title screen',JSON.stringify(t));
    console.log('Continue clicked',await click(p,'continue'))}
  await p.waitForTimeout(300);await live(p,4000);const after=await ev(()=>window.__A.snap());
  const keys=['mode','night','loadout','CV','vanOn','wmInScene','enemies','allies','overlays','fov','keysHeld','widgets','carsHidden','gunShown','noTraffic'];
  const d={};for(const k of keys)if(JSON.stringify(base[k])!==JSON.stringify(after[k]))d[k]=[base[k],after[k]];
  console.log('hub after leaving vs hub before the job:',JSON.stringify(d));
  const extra=await ev(()=>({bodyClasses:document.body.className,fixedEls:[...document.body.children].filter(e=>getComputedStyle(e).position==='fixed'&&+getComputedStyle(e).opacity>0.3&&getComputedStyle(e).display!=='none'&&!/^ht|^hud|^tags|^sub/.test(e.className+e.id)).map(e=>e.id||e.className).slice(0,8)}));
  console.log('page extras',JSON.stringify(extra));
  if(process.argv.includes('--shot')){await ev(()=>window.__ht.draw());await p.screenshot({path:require('path').join(__dirname,'../../../docs/audit/jobs/leftover-'+JOB+'-'+HOW+'.jpg'),type:'jpeg',quality:80})}
  console.log('page errors',JSON.stringify(errs.filter(e=>!/favicon/.test(e)).slice(0,4)));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
