/* Honey-Do Blitz playtest (SPEC3 2.17): plays the job by script at human pace and reports the pacing.
   node dev/jobs/blitz.js [--shots] [--runs=N] [--fail]
   Starts the job directly at the mart, lets the scripted player (js/jobs/blitz.js test.step) run the 3 minutes, and logs every 15 s:
   clock, score, fixes, combo, what it is heading for. --shots writes jpgs to docs/screenshots/jobs/blitz/. Exit 1 on console errors. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const has=k=>process.argv.includes('--'+k),arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
const PERFECT=has('perfect'),SHOTS=has('shots'),DIR=path.join(__dirname,'../../docs/screenshots/jobs/blitz'),RUNS=+arg('runs',1);
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  const shot=async n=>{if(!SHOTS)return;fs.mkdirSync(DIR,{recursive:true});await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(DIR,n+'.jpg'),type:'jpeg',quality:82});console.log('shot',n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>{});await p.waitForTimeout(300);
  await ev(async pf=>{window.__perfect=pf;const H=window.__ht;await H.jobs.ready;H.step(2);const s=H.jobs.api.SV();for(const d of['gary','rick','dave','doug','earl']){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true;window.HT.Save.jobRec(s,d).done=true}H.prog.trustR=22},PERFECT);
  const results=[];
  for(let run=0;run<RUNS;run++){
    const st=await ev(()=>{const H=window.__ht;const M=H.jobs.start('blitz');H.step(3);try{window.HT.OpenWorld.buildAll()}catch(e){}return{ok:!!M,stage:H.M&&H.M.stage,fix:H.M.bz.fix.length,kinds:H.M.bz.fix.reduce((o,f)=>(o[f.kind]=(o[f.kind]||0)+1,o),{})}});
    console.log('start',JSON.stringify(st));if(run===0)await shot('01-belt');
    /* walk to the table and take the belt */
    await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('blitz'),a=H.jobs.api;for(let t=0;t<400&&H.M.bz.phase==='belt';t++){j.test.step(a,t,{});H.step(1)}});
    if(run===0){await ev(()=>window.__ht.step(20));await shot('02-countdown')}
    const log=await ev(async o=>{const H=window.__ht,j=H.jobs.registry.get('blitz'),a=H.jobs.api,out=[];let t=0,lastLog=-99;const shotsAt=o.shots?[8,30,60,95,130,172]:[];const taken=[];
      for(;t<9000&&H.M&&H.M.state==='go';t++){j.test.step(a,t,Object.assign({},o,{perfect:window.__perfect}));H.P.hp=100;H.step(1);const B=H.M&&H.M.bz;if(!B)break;const el=180-B.clock;
        if(B.phase==='go'&&el-lastLog>=15){lastLog=el;const f=B.botF;out.push({t:Math.round(el),score:B.score,fixed:B.fixed,mult:B.mult,to:f?f.kind+'@'+Math.round(Math.hypot(f.x-H.P.pos.x,f.z-H.P.pos.z))+'m':null,helper:B.helperState})}
        if(B.phase==='go'&&shotsAt.length&&el>=shotsAt[0]){shotsAt.shift();window.__shotReq=(window.__shotReq||[]).concat([Math.round(el)]);return{out,pause:true,t}}
        if(B.phase==='tally'&&!B._shot){B._shot=1;window.__shotReq=['tally'];return{out,pause:true,t}}}
      return{out,state:H.M&&H.M.state,score:H.M&&H.M.bz&&H.M.bz.score,t}},{shots:SHOTS&&run===0});
    let L=log;const all=[...L.out];while(L.pause){const r=await ev(()=>{const q=window.__shotReq||[];window.__shotReq=[];return q});for(const n of r)if(run===0)await shot('03-blitz-'+n);
      L=await ev(async o=>{const H=window.__ht,j=H.jobs.registry.get('blitz'),a=H.jobs.api,out=[];let lastLog=180-H.M.bz.clock;const shotsAt=[30,60,95,130,172].filter(s=>s>lastLog+1);
        for(let t=o.t;t<o.t+9000&&H.M&&H.M.state==='go';t++){j.test.step(a,t,{perfect:window.__perfect});H.P.hp=100;H.step(1);const B=H.M&&H.M.bz;if(!B)break;const el=180-B.clock;
          if(B.phase==='go'&&el-lastLog>=15){lastLog=el;const f=B.botF;out.push({t:Math.round(el),score:B.score,fixed:B.fixed,mult:B.mult,to:f?f.kind+'@'+Math.round(Math.hypot(f.x-H.P.pos.x,f.z-H.P.pos.z))+'m':null,helper:B.helperState})}
          if(o.shots&&B.phase==='go'&&shotsAt.length&&el>=shotsAt[0]){shotsAt.shift();window.__shotReq=[Math.round(el)];return{out,pause:true,t:t+1}}
          if(B.phase==='tally'&&!B._shot){B._shot=1;window.__shotReq=['tally'];return{out,pause:true,t:t+1}}}
        return{out,state:H.M&&H.M.state,score:H.M&&H.M.bz&&H.M.bz.score,t:o.t}},{t:L.t,shots:SHOTS&&run===0});all.push(...L.out)}
    for(const r of all)console.log('  ',JSON.stringify(r));
    await ev(()=>window.__ht.step(40));if(run===0)await shot('04-result');
    const res=await ev(()=>{const H=window.__ht;return{ev:H.M&&H.M.bz&&H.M.bz.events.map(e=>e.k[0]+Math.round(e.t)+':'+e.p).join(' '),state:H.M&&H.M.state,score:H.M&&H.M.score,medal:H.M&&H.M.medal,by:H.M&&H.M.bz&&H.M.bz.byKind,best:H.M&&H.M.bz&&H.M.bz.bestMult,unstuck:H.M&&H.M.bz&&H.M.bz.bot&&H.M.bz.bot.unstuck,pay:H.M&&H.M.pay&&H.M.pay.total,trust:+(H.M&&H.M.trustGain||0).toFixed(2)}});
    console.log('result',JSON.stringify(res));results.push(res);
    await ev(()=>{const H=window.__ht;if(H.UIacts&&H.UIacts['result:go'])H.UIacts['result:go']();H.step(5)})}
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'console errors: '+bad.slice(0,5).join(' | '):'no console errors');
  console.log('scores',results.map(r=>r.score).join(' '));await b.close();process.exit(bad.length?1:0)})().catch(e=>{console.error(e);process.exit(1)});
