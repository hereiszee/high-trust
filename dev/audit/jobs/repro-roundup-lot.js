/* JOBS-AUDIT: Minivan Roundup, "Retry from The lot" comes back with no stealth HUD (the guards' sight cones / detection meter).
   stealthHud() is only called from lotBegin() (roundup.js:516), which needs M.ph==='gate'; applyLoad() (:887) sets ph='lot' and never mounts it.
   node dev/audit/jobs/repro-roundup-lot.js   (real click on the fail card's retry button) */
const {boot,click,waitCard}=require('./lib.js');
(async()=>{const {b,p,errs}=await boot();const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>window.__A.unlock('roundup'));await ev(()=>window.__A.cast('roundup'));
  const S=()=>ev(()=>{const H=window.__ht,M=H.M;return{state:M&&M.state,stage:M&&M.stage,ph:M&&M.ph,alarm:!!(M&&M.alarm),stealth:!!(M&&M.S),shud:!!(M&&M.shud),overlay:!!H.HUD.overlay('roundup-stealth'),guards:M&&M.guards?M.guards.length:0,watch:M&&M.guards?M.guards.filter(g=>g.id!=='att'&&g.e.state==='idle').length:0,scam:M&&M.scam,att:!!(M&&M.att&&M.att.state==='idle'&&H.enemies.includes(M.att))}});
  await ev(()=>{window.__ht.jobs.start('roundup');window.__ht.step(3)});
  /* --scam=pay|receipt: answer the attendant that way first (the bot always lets Rick handle it) */
  const SC=(process.argv.find(x=>x.startsWith('--scam='))||'').split('=')[1];
  if(SC)console.log('scam',await ev(sc=>{const H=window.__ht;for(let i=0;i<30*20&&!(H.M.choices&&H.M.choices.pick);i++)H.step(1);if(!(H.M.choices&&H.M.choices.pick))return'no choices';H.M.choices.pick(['pay','receipt','coach'].indexOf(sc));return H.M.scam},SC));
  await ev(()=>window.__A.play('roundup',{},15000,"M.stage==='lot'"));await ev(()=>window.__ht.step(5));const s0=await S();console.log('first time in the lot',JSON.stringify(s0));
  await ev(()=>window.__ht.jobs.api.endMission(false,'audit: caught in the lot'));const c=await waitCard(p);console.log('fail card',JSON.stringify(c.btns.map(x=>x.label)));
  await click(p,'result:retry');await ev(()=>window.__ht.step(60));const s1=await S();console.log('2 s after "Retry from The lot"',JSON.stringify(s1));
  await ev(()=>window.__A.play('roundup',{},600));const s2=await S();console.log('20 s later',JSON.stringify(s2));
  const pe=errs.filter(e=>!/favicon/.test(e));console.log('page errors',JSON.stringify(pe.slice(0,3)));
  /* regression (fix/jobs): the retry must look like the first visit; s2 may have moved on (the bot keeps playing), so it only has to stay mounted while still in the lot */
  const ok=s1.state==='go'&&s1.ph==='lot'&&s1.shud&&s1.overlay&&s1.watch===s0.watch&&s1.att===(s1.scam==='pay'||s1.scam==='receipt')&&(s2.ph!=='lot'||s2.alarm||s2.shud)&&!pe.length;
  console.log(ok?'PASS J-02: the stealth HUD and every guard are back after "Retry from The lot"':'FAIL J-02');await b.close();process.exit(ok?0:1)})().catch(e=>{console.error(e);process.exit(1)});
