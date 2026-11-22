/* JOBS-AUDIT: Minivan Roundup, after "Retry from Convoy out" the job's own bot never reaches "The driveways".
   node dev/audit/jobs/repro-roundup-convoy.js
   1. control: the bot plays from the start; game seconds from the 'convoy' checkpoint to 'home'
   2. fail right after the convoy checkpoint, real click on "Retry from Convoy out", the same bot for up to 12000 frames (400 s) */
const {boot,click,waitCard}=require('./lib.js');
(async()=>{const {b,p,errs}=await boot();const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>window.__A.unlock('roundup'));await ev(()=>window.__A.cast('roundup'));
  const S=()=>ev(()=>{const H=window.__ht,M=H.M;const vans=M&&M.vans?Object.keys(M.vans).map(k=>k+':'+M.vans[k].st+(M.vans[k].m?'/'+M.vans[k].m.st:'')):null;
    return{state:M&&M.state,stage:M&&M.stage,ph:M&&M.ph,el:M&&Math.round(M.elapsed),noGuns:!!(M&&M.noGuns),holster:!!(M&&M.holster),gunInHand:!!(H.P.dude&&H.P.dude.gun&&H.P.dude.gun.visible!==false),vans,car:H.CV?H.CV.type:null,pos:[Math.round(H.P.pos.x),Math.round(H.P.pos.z)]}});
  await ev(()=>{window.__ht.jobs.start('roundup');window.__ht.step(3)});
  await ev(()=>window.__A.play('roundup',{},15000,"M.stage==='convoy'"));const c0=await S();console.log('control: convoy checkpoint',JSON.stringify(c0));
  await ev(()=>window.__A.play('roundup',{},15000,"M.stage==='home'"));const c1=await S();console.log('control: after the convoy',JSON.stringify(c1),'convoy took',c1.el-c0.el,'s');
  await ev(()=>window.__ht.jobs.api.endMission(false,'audit'));await waitCard(p);await click(p,'result:restart');await ev(()=>window.__ht.step(3));
  await ev(()=>window.__A.play('roundup',{},15000,"M.stage==='convoy'"));const r0=await S();console.log('run 2: convoy checkpoint',JSON.stringify(r0));
  await ev(()=>window.__ht.jobs.api.endMission(false,'audit: wrecked a van in the convoy'));const c=await waitCard(p);console.log('fail card',JSON.stringify(c.btns.map(x=>x.label)));
  await click(p,'result:retry');await ev(()=>window.__ht.step(5));const r1=await S();console.log('after retry',JSON.stringify(r1));
  await ev(()=>window.__A.play('roundup',{},12000,"M.stage==='home'"));const r2=await S();console.log('after up to 400 s of the bot',JSON.stringify(r2));
  console.log('page errors',JSON.stringify(errs.filter(e=>!/favicon/.test(e)).slice(0,3)));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
