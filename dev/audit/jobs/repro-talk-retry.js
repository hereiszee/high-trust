/* JOBS-AUDIT: Small Talk, "Retry from The walk up" skips the walk and never marks "The conversation" checkpoint.
   talk.js:266 load() sets M.resume to the snapshot even when it is the walk-up one (ph 'walk'), upd (:257) then calls sitDown(M,resume)
   on the first frame, and sitDown (:320) only marks the 'talk' checkpoint when resume is falsy.
   node dev/audit/jobs/repro-talk-retry.js
   1. fresh run: the bot walks up and sits -> stage 'talk' is marked (control)
   2. fail at the walk up, real click on "Retry from The walk up": where is the dad one frame later, is he seated, which stage?
   3. play into the conversation and fail it: which checkpoint does the fail card offer? */
const {boot,click,waitCard}=require('./lib.js');
(async()=>{const {b,p,errs}=await boot();const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>window.__A.unlock('talk'));await ev(()=>window.__A.cast('talk'));
  const st=()=>ev(()=>{const H=window.__ht,M=H.M;return{state:M&&M.state,stage:M&&M.stage,ph:M&&M.ph,seated:!!(M&&M.seated),pos:[+H.P.pos.x.toFixed(1),+H.P.pos.z.toFixed(1)],el:M&&+M.elapsed.toFixed(1),snaps:H.jobs.JRS.cp?H.jobs.JRS.cp.snaps.map(s=>s.stage):null}});
  await ev(()=>{window.__ht.jobs.start('talk');window.__ht.step(3)});console.log('1 start',JSON.stringify(await st()));
  await ev(()=>window.__A.play('talk',{},6000,"M.seated"));console.log('1 control: seated by the bot',JSON.stringify(await st()));
  /* back to a fresh run for the retry case */
  await ev(()=>{window.__ht.jobs.api.endMission(false,'audit');});await waitCard(p);await click(p,'result:restart');await ev(()=>window.__ht.step(3));
  console.log('2 restarted',JSON.stringify(await st()));
  await ev(()=>{window.__ht.jobs.api.endMission(false,'audit: fail at the walk up')});const c=await waitCard(p);console.log('2 fail card',JSON.stringify(c.btns.map(x=>x.label)));
  await click(p,'result:retry');await ev(()=>window.__ht.step(1));console.log('2 one frame after "Retry from The walk up"',JSON.stringify(await st()));
  await ev(()=>window.__ht.step(30));console.log('2 one second later',JSON.stringify(await st()));
  await ev(()=>window.__ht.jobs.api.endMission(false,'audit: fail in the conversation'));const c2=await waitCard(p);console.log('3 fail card in the conversation offers',JSON.stringify(c2.btns.map(x=>x.label)));
  console.log('page errors',JSON.stringify(errs.filter(e=>!/favicon/.test(e)).slice(0,3)));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
