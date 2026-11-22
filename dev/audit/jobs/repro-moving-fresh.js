/* JOBS-AUDIT J-01 control: Heavy Lifting played start to finish by its own bot, no retry. Does the null-gun throw happen without a retry?
   node dev/audit/jobs/repro-moving-fresh.js */
const {boot}=require('./lib.js');
(async()=>{const {b,p,errs}=await boot();const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>window.__A.unlock('moving'));await ev(()=>window.__A.cast('moving'));await ev(()=>{window.__ht.jobs.start('moving');window.__ht.step(3)});
  for(let i=0;i<20;i++){const r=await ev(()=>{try{return window.__A.play('moving',{},1000)}catch(e){return{threw:String(e.message),stage:window.__ht.M&&window.__ht.M.stage,disarmed:window.__ht.enemies.filter(x=>x.gun===null&&!(x.ai&&x.ai.v)).length}}});
    console.log(JSON.stringify(r));if(r.threw||r.state!=='go')break}
  console.log('page errors',JSON.stringify(errs.filter(e=>!/favicon/.test(e)).slice(0,3)));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
