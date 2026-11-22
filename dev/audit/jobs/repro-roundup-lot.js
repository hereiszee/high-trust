/* JOBS-AUDIT: Minivan Roundup, "Retry from The lot" comes back with no stealth HUD (the guards' sight cones / detection meter).
   stealthHud() is only called from lotBegin() (roundup.js:516), which needs M.ph==='gate'; applyLoad() (:887) sets ph='lot' and never mounts it.
   node dev/audit/jobs/repro-roundup-lot.js   (real click on the fail card's retry button) */
const {boot,click,waitCard}=require('./lib.js');
(async()=>{const {b,p,errs}=await boot();const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>window.__A.unlock('roundup'));await ev(()=>window.__A.cast('roundup'));
  const S=()=>ev(()=>{const H=window.__ht,M=H.M;return{state:M&&M.state,stage:M&&M.stage,ph:M&&M.ph,alarm:!!(M&&M.alarm),stealth:!!(M&&M.S),shud:!!(M&&M.shud),overlay:!!H.HUD.overlay('roundup-stealth'),guards:M&&M.guards?M.guards.length:0}});
  await ev(()=>{window.__ht.jobs.start('roundup');window.__ht.step(3)});
  await ev(()=>window.__A.play('roundup',{},15000,"M.stage==='lot'"));await ev(()=>window.__ht.step(5));console.log('first time in the lot',JSON.stringify(await S()));
  await ev(()=>window.__ht.jobs.api.endMission(false,'audit: caught in the lot'));const c=await waitCard(p);console.log('fail card',JSON.stringify(c.btns.map(x=>x.label)));
  await click(p,'result:retry');await ev(()=>window.__ht.step(60));console.log('2 s after "Retry from The lot"',JSON.stringify(await S()));
  await ev(()=>window.__A.play('roundup',{},600));console.log('20 s later',JSON.stringify(await S()));
  console.log('page errors',JSON.stringify(errs.filter(e=>!/favicon/.test(e)).slice(0,3)));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
