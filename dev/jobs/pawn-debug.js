/* Grand Opening: a debug run (start directly, step the bot, log the state). node dev/jobs/pawn-debug.js [frames] [--fail] [--shot=name] */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const N=+(process.argv[2]||3000),FAIL=process.argv.includes('--fail');
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  await p.evaluate(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('pawn');await j.test.give(H.jobs.api);H.jobs.lock('pawn')});
  await ev(()=>window.__ht.jobs.start('pawn'));
  const log=await p.evaluate(async([N,FAIL])=>{const H=window.__ht,j=H.jobs.registry.get('pawn'),a=H.jobs.api,out=[];
    for(let t=0;t<N&&H.M&&H.M.state==='go';t++){j.test.step(a,t,FAIL?{fail:true}:{});H.step(1);const M=H.M;
      if(t%60===0)out.push([t,M.stage,M.ph,M.ready,M.D?Math.round(M.D.cover*100):null,M.chat?M.chat.kind:'',M.bot?M.bot.step:'',Math.round(a.P.pos.x*10)/10,Math.round(a.P.pos.z*10)/10,M.pages,M.book,M.exitOpen].join(' '))}
    const M=H.M;return{out,state:M&&M.state,res:document.querySelector('.ht-result')?document.querySelector('.ht-result').innerText.slice(0,400):null,log:M&&M.bot&&M.bot.log}},[N,FAIL]);
  console.log(log.out.join('\n'));console.log('state',log.state,log.log);await p.waitForTimeout(1500);
  console.log(await ev(()=>{const r=document.querySelector('.ht-result');return r?r.innerText.slice(0,600):'no card'}));
  console.log('errors',errs);await b.close()})().catch(e=>{console.error(e);process.exit(1)});
