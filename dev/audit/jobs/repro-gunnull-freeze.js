/* JOBS-AUDIT J-01: an enemy that a job spawns and disarms in the same frame (e.gun=null: moving.js:558, porch.js:160, tow.js:397,
   mower.js:403, brake.js:521, cones.js:608, arrest.js:394, _finale-street.js:202/261) makes AI.shotFired -> memOf throw
   (ai.js:387: typeof null==='object', so gun=null, then gun.mag at ai.js:390) the first time any gun goes off nearby.
   frame() (index.html:4486-4501) has no try/catch and calls requestAnimationFrame(frame) last, so the real loop stops: frozen game.
   node dev/audit/jobs/repro-gunnull-freeze.js [job=tow]
   1. start the job, spawn + disarm + script one enemy exactly like the jobs do, pistol out
   2. real left clicks on the canvas (the first asks for pointer lock, refused headless; the second holds the trigger), __ht.step -> the throw
   3. the real rAF loop with the trigger held: does simT keep moving? */
const {boot}=require('./lib.js');const JOB=process.argv[2]||'tow';
(async()=>{const {b,p,errs}=await boot();const ev=(f,a)=>p.evaluate(f,a);
  await ev(id=>{window.__A.unlock(id)},JOB);await ev(id=>window.__A.cast(id),JOB);
  const s=await ev(id=>{const H=window.__ht,a=H.jobs.api;H.jobs.start(id);H.step(5);const M=H.M;M.noGuns=false;M.holster=false;
    const e=a.spawnEnemy(H.P.pos.x+14,H.P.pos.z+3,false);a.equip(e.dude,null);e.gun=null;e.noLeash=true;e.script={kind:'to',x:e.pos.x+40,z:e.pos.z,speed:1.2};
    H.give('pistol');H.swap&&H.swap('pistol');H.step(2);return{mode:H.mode,squads:!!M.squads,nav:!!H.L.nav,eAi:!!(e.ai&&e.ai.v),cur:H.P.cur}},JOB);
  console.log('setup',JSON.stringify(s));
  /* the same call aiShot() makes for every player or crew shot in a mission (index.html:2401, from fire() :2217 and shootAt() :2272) */
  const r=await ev(()=>{const H=window.__ht,P=H.P,e=H.enemies[H.enemies.length-1];try{H.AI.shotFired(P.pos.x,P.pos.z,e.pos.x+2,e.pos.z,H.enemies,H.simT);return{ok:true}}catch(x){return{threw:String(x&&x.message),at:String(x&&x.stack).split('\n').slice(0,3).join(' | ')}}});
  console.log('a gunshot near the disarmed enemy:',JSON.stringify(r));
  /* frame() runs the same updates as step() with no try/catch and schedules the next frame last (index.html:4486-4501), so in the real loop this throw stops the game */
  /* regression (fix/jobs): drop his script so the AI drives him toward the dad, keep shooting near him for 10 s of game time */
  const r2=await ev(()=>{const H=window.__ht,P=H.P,e=H.enemies[H.enemies.length-1];e.script=null;const hp0=H.P.hp;let threw=null;
    try{for(let i=0;i<300;i++){H.step(1);if(i%15===0)H.AI.shotFired(P.pos.x,P.pos.z,e.pos.x+1,e.pos.z,H.enemies,H.simT)}}catch(x){threw=String(x&&x.stack).split('\n').slice(0,2).join(' | ')}
    return{threw,unarmed:!!(e.ai&&e.ai.gun&&e.ai.gun.unarmed),aiMode:e.ai&&e.ai.mode,state:e.state,hpLost:Math.round(hp0-H.P.hp),mode:H.mode}});
  console.log('10 s with the AI driving him:',JSON.stringify(r2));
  const pe=errs.filter(e=>!/favicon/.test(e));console.log('page errors:',JSON.stringify(pe.slice(0,3)));
  const ok=r.ok&&!r2.threw&&r2.unarmed&&!pe.length;console.log(ok?'PASS J-01: no throw, the disarmed enemy stays unarmed':'FAIL J-01');
  await b.close();process.exit(ok?0:1)})().catch(e=>{console.error(e);process.exit(1)});
