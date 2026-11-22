/* SAV-04 regression: what a job earns (zip-ties, trust) is committed only when the job is won.
   node dev/job-rollback.e2e.js   (one headless Chromium, SwiftShader; real E / Esc / clicks where a player would use them)
   1. Return to Sender (built-in): an enemy gives up, a real E press zip-ties him; an autosave mid-job writes the pre-job counts;
      Esc -> Quit to title -> confirm rolls the live counts back, and the save on disk never had them.
   2. Same, Abandon job from the pause menu, then a fail (finish(false)): rolled back.
   3. A won job keeps its zip-tie and trust.
   4. A registered job with stages: gains made before a checkpoint come back on "Retry from <stage>" but are still uncommitted. */
const {open}=require('./ai-ingame-lib.js');
const info=m=>console.log('info '+m);let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{
  const {b,p,errs}=await open({init:()=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.clear();
    localStorage.setItem('ht-save',JSON.stringify({v:3,cash:500,prog:{missionsRun:2,trust:30,trustR:20,cuffed:4},stats:{spent:10}}))}}});
  const ev=(f,a)=>p.evaluate(f,a),wait=ms=>p.waitForTimeout(ms);
  const step=n=>ev(n=>{const H=window.__ht;for(let i=0;i<n;i+=15)H.step(15)},n);
  const disk=()=>ev(()=>{try{const p=JSON.parse(localStorage.getItem('ht-save')).prog;return{trust:p.trust,trustR:p.trustR,cuffed:p.cuffed}}catch(e){return null}});
  const live=()=>ev(()=>({trust:window.__ht.prog.trust,trustR:window.__ht.prog.trustR,cuffed:window.__ht.prog.cuffed,mode:window.__ht.mode}));
  const startJob=async id=>{await ev(id=>window.__ht.jobs.start(id),id);await p.waitForFunction(()=>window.__ht.mode==='mission'&&window.__ht.M&&window.__ht.M.state==='go',null,{timeout:90000});await step(60)};
  const tieOne=async()=>{const r=await ev(()=>{const H=window.__ht;const e=H.enemies.find(x=>x.state!=='dead'&&x.state!=='cuffed');if(!e)return false;
      e.state='surrender';e.surrT=0;H.P.pos.set(e.pos.x+1,0,e.pos.z);H.P.yaw=Math.atan2(-(e.pos.x-H.P.pos.x),-(e.pos.z-H.P.pos.z));return true});
    if(!r)return false;for(let i=0;i<6;i++){await p.keyboard.down('e');await step(3);await wait(60);await p.keyboard.up('e');await step(3)}return true};
  await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
  await wait(1200);await p.click('.ht-title [data-act=continue]');await p.waitForFunction(()=>window.__ht.mode==='hub',null,{timeout:60000});
  await ev(()=>{window.__rafOn=false});await wait(300);await step(30);
  const d0=await disk();ok(d0&&d0.cuffed===4&&d0.trust===30,'seeded save on disk: '+JSON.stringify(d0));

  /* 1: quit to title */
  await startJob('gary');const before=await live();
  ok(await tieOne(),'an enemy gave up and was zip-tied with a real E press');
  const mid=await live();ok(mid.cuffed===before.cuffed+1&&mid.trust>before.trust,'live counts rise inside the job: '+JSON.stringify(before)+' -> '+JSON.stringify(mid));
  await ev(()=>{window.HT.Save.addCash(1,'test');window.HT.Save.saveNow()});
  let d=await disk();ok(d.cuffed===4&&d.trust===30,'an autosave inside the job writes the pre-job counts: '+JSON.stringify(d));
  await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
  await p.keyboard.press('Escape');await p.waitForSelector('.ht-pause [data-act=quit]',{timeout:15000});
  await p.click('.ht-pause [data-act=quit]');await p.waitForSelector('.ht-dlg [data-dlg=ok]',{timeout:10000});await p.click('.ht-dlg [data-dlg=ok]');
  await p.waitForFunction(()=>window.__ht.mode==='title',null,{timeout:30000});
  await ev(()=>window.HT.Save.saveNow());
  const q=await live();d=await disk();
  ok(q.cuffed===4&&q.trust===30,'Quit to title rolls the live counts back: '+JSON.stringify(q));
  ok(d.cuffed===4&&d.trust===30,'and the save on disk still has the pre-job counts: '+JSON.stringify(d));
  await p.click('.ht-title [data-act=continue]').catch(async()=>{await ev(()=>document.querySelector('.ht-title [data-act=newgame]').click())});
  await p.waitForFunction(()=>window.__ht.mode==='hub',null,{timeout:60000});await ev(()=>{window.__rafOn=false});await wait(300);await step(30);

  /* 2: abandon, then fail */
  await startJob('gary');await tieOne();
  await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
  await p.keyboard.press('Escape');await p.waitForSelector('.ht-pause [data-act=abandon]',{timeout:15000});await p.click('.ht-pause [data-act=abandon]');
  await p.waitForFunction(()=>window.__ht.mode==='hub',null,{timeout:30000});await ev(()=>{window.__rafOn=false});await wait(300);
  let a=await live();ok(a.cuffed===4&&a.trust===30,'Abandon job rolls back: '+JSON.stringify(a));
  await startJob('gary');await tieOne();await ev(()=>window.__ht.jobs.finish(false));await wait(300);
  a=await live();d=await disk();ok(a.cuffed===4&&a.trust===30&&d.cuffed===4&&d.trust===30,'a failed job rolls back (live '+JSON.stringify(a)+', disk '+JSON.stringify(d)+')');
  await ev(()=>{const b=document.querySelector('[data-act="result:go"]');if(b)b.click()});await wait(500);
  if(await ev(()=>window.__ht.mode)!=='hub')await ev(()=>window.__ht.enterHub());await step(30);

  /* 3: win */
  await startJob('gary');await tieOne();const w0=await live();await ev(()=>window.__ht.jobs.finish(true));await wait(300);
  d=await disk();ok(d.cuffed===5&&d.trust>w0.trust-0.001,'a won job commits its zip-tie and trust: disk '+JSON.stringify(d));
  await ev(()=>{const b=document.querySelector('[data-act="result:go"]');if(b)b.click()});await wait(500);
  if(await ev(()=>window.__ht.mode)!=='hub')await ev(()=>window.__ht.enterHub());await step(30);

  /* 4: checkpoint retry hands gains back, uncommitted */
  await ev(()=>window.__ht.jobs.ready);
  const id=await ev(()=>{const J=window.__ht.jobs.registry;const l=J.list().filter(j=>!j.builtin&&!j.def.repeatable&&j.def.stages&&j.def.stages.length>1&&j.def.hood!=='river');return l.length?l[0].id:null});
  if(!id)ok(false,'no registered job with stages found');else{
    await ev(id=>{const t=window.__ht.jobs.registry.get(id);if(t&&t.test&&t.test.give)try{t.test.give(window.__ht.jobs.api)}catch(e){}},id);
    await startJob(id);const c0=await live();
    await ev(()=>{const H=window.__ht;H.prog.cuffed+=2;H.addTrust?H.addTrust(6,'maple'):(H.prog.trust+=6);H.jobs.CP.mark('test-stage',{quiet:true})});
    await ev(()=>window.__ht.jobs.finish(false));
    await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
    await p.waitForFunction(()=>window.__ht.HUD&&window.__ht.HUD.screen==='result',null,{timeout:20000}).catch(()=>{});
    const f=await live();ok(f.cuffed===c0.cuffed,'job '+id+' failed after a checkpoint: rolled back ('+f.cuffed+')');
    const hasRetry=await ev(()=>{const b=[...document.querySelectorAll('[data-act="result:retry"]')].find(b=>b.offsetParent);return b?b.textContent:null});
    info('fail card retry button: '+hasRetry);
    await p.click('[data-act="result:retry"]:visible');
    await p.waitForFunction(()=>window.__ht.mode==='mission'&&window.__ht.M&&window.__ht.M.state==='go',null,{timeout:90000}).catch(()=>{});await step(30);
    const r=await live();await ev(()=>window.HT.Save.saveNow());d=await disk();
    ok(hasRetry&&r.cuffed===c0.cuffed+2,'"Retry from" the checkpoint hands back the zip-ties earned before it (live '+r.cuffed+', want '+(c0.cuffed+2)+')');
    ok(d.cuffed===c0.cuffed,'still uncommitted on disk ('+d.cuffed+')');
    await ev(()=>window.__ht.quitToTitle());const z=await live();ok(z.cuffed===c0.cuffed,'quitting after the retry rolls back again ('+z.cuffed+')')}
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs.slice(0,4).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(99)});
