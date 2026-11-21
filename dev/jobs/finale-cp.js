/* Everybody Waves: a retry from EVERY checkpoint wins, and nothing leaks across retries.
   For each stage: start the finale, reach that stage's [CP], play a little, lose, press "Retry from <stage>", and win from there
   with the job's own bot. Between runs it reports the renderer's geometries/textures/programs, the JS heap and the draw calls,
   which must not climb run after run. One browser for all of it.
   node dev/jobs/finale-cp.js [--only stage,stage] */
const {open}=require('../ai-ingame-lib.js');
const only=(()=>{const i=process.argv.indexOf('--only');return i<0?null:process.argv[i+1].split(',')})();
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(400);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const s=H.jobs.api.SV();s.flags.act2Intro=true;s.world.bridgeOpen=true;await window.HT.Finale.preloadCast()});
  const stages=(only||['plan','tail','roof','roadblock','defend','chase','handsup','festival']);const mem=[];
  const play=(o,max)=>ev(([o,max])=>{const H=window.__ht,a=H.jobs.api,j=H.jobs.registry.get('finale');let t=0;for(;t<max&&H.M&&H.M.state==='go';t++){j.test.step(a,t,o);H.P.hp=Math.max(H.P.hp,60);H.step(1)}return{t,state:H.M&&H.M.state,stage:H.M&&H.M.fn&&H.M.fn.stage,why:H.M&&H.M.loseWhy}},[o,max]);
  for(const st of stages){
    const s0=await ev(st=>{const H=window.__ht;if(H.UIacts&&H.UIacts['result:go'])try{H.UIacts['result:go']()}catch(_){}H.step(2);H.jobs.start('finale');H.step(4);const M=H.M,FN=window.HT.Finale;
      if(st!=='plan'){M.fn.plan=window.HT.Plan.auto(FN.PLAN_DEF,{});FN.advance(M,st)}for(let i=0;i<60;i++)H.step(1);
      const j=H.jobs.registry.get('finale');for(let t=0;t<90&&H.M.state==='go';t++){j.test.step(H.jobs.api,t,{});H.step(1)}
      const at=H.M.fn.stage;M.loseWhy='test:'+at;H.jobs.api.endMission(false,'A test failure, on purpose.','Test.');for(let i=0;i<45;i++)H.step(1);
      return{at,cp:H.jobs.CP.last()&&H.jobs.CP.last().stage,acts:Object.keys(H.UIacts||{})}},st);
    ok(s0.acts.includes('result:retry')&&s0.cp===s0.at,st+': lost at "'+s0.at+'", the card offers Retry from that checkpoint ('+s0.cp+')');
    const rt=await ev(()=>{const H=window.__ht;H.UIacts['result:retry']();H.step(4);return{state:H.M.state,stage:H.M.fn.stage,retried:H.M.retried}});
    ok(rt.state==='go'&&rt.stage===s0.at&&rt.retried,st+': retried into "'+rt.stage+'"');
    const w=await play({},12000);ok(w.state==='won',st+': won from the checkpoint ('+JSON.stringify(w)+')');
    await ev(()=>window.__ht.step(40));
    const m=await ev(()=>{const H=window.__ht;if(H.UIacts&&H.UIacts['result:go'])try{H.UIacts['result:go']()}catch(_){}H.step(3);const R=H.renderer,i=R.info;H.draw();return{geo:i.memory.geometries,tex:i.memory.textures,prog:(i.programs||[]).length,calls:i.render.calls,heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null,live:(window.HT.Finale.live||[]).length}});
    mem.push(m);console.log('     after '+st+': '+JSON.stringify(m))}
  if(mem.length>=3){const a=mem[1],z=mem[mem.length-1];ok(z.geo-a.geo<400&&z.tex-a.tex<60,'no runaway geometry/texture growth across retries ('+a.geo+'->'+z.geo+' geometries, '+a.tex+'->'+z.tex+' textures)');ok(z.live===0,'no finale people left alive after the job ('+z.live+')')}
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,3).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
