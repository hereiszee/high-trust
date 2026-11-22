/* JOBS-AUDIT: every failed run pays "Gas money" ($40 x the trust multiplier, save.js:791), and Retry starts the job again at once,
   so failing on purpose is a cash loop with no cap. node dev/audit/jobs/repro-fail-pay.js [job=porch] [n=5]
   Each loop: the job fails the way a player can do it on purpose (the leave-the-job timer, index.html:3866: walk 30 m+ away for 8 s;
   on roam jobs, endMission with the same line), real click on the retry button. Prints cash before/after and the time spent. */
const {boot,click,waitCard}=require('./lib.js');const JOB=process.argv[2]||'porch',N=+process.argv[3]||5;
(async()=>{const {b,p,errs}=await boot();const ev=(f,a)=>p.evaluate(f,a);
  await ev(id=>window.__A.unlock(id),JOB);await ev(id=>window.__A.cast(id),JOB);
  await ev(id=>{window.__ht.jobs.start(id);window.__ht.step(3)},JOB);const c0=await ev(()=>window.__A.SV().cash);let sim=0;
  for(let i=0;i<N;i++){const r=await ev(()=>{const H=window.__ht,M=H.M,t0=M.elapsed;if(!M.def.roam&&M.site){H.P.pos.x+=80;for(let k=0;k<30*12&&M.state==='go';k++){H.P.pos.x+=0;H.step(1)}}
      if(M.state==='go')H.jobs.api.endMission(false,"The crew went home. Doug left a note on your windshield.","You left the job.");return{state:M.state,secs:+(M.elapsed-t0).toFixed(1),pay:M.pay&&M.pay.total,lines:M.pay&&M.pay.lines.map(l=>l.label+' '+l.amount)}});
    sim+=r.secs;const c=await waitCard(p);console.log('fail',i+1,JSON.stringify(r),'cash now',await ev(()=>window.__A.SV().cash));await click(p,'result:retry');await ev(()=>window.__ht.step(3))}
  const c1=await ev(()=>window.__A.SV().cash);console.log('cash',c0,'->',c1,'(+'+(c1-c0)+') after',N,'deliberate fails,',sim.toFixed(0),'s of game time');
  console.log('page errors',JSON.stringify(errs.filter(e=>!/favicon/.test(e)).slice(0,3)));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
