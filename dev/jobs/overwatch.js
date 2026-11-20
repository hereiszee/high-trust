/* Higher Ground (js/jobs/overwatch.js): a play-through driver with a readable log and stage screenshots.
   node dev/jobs/overwatch.js [--shots] [--fail] [--human] [--max=12000] [--quiet]
     --shots  jpgs of every stage, the scope and the result card into docs/screenshots/jobs/overwatch/
     --fail   the bot sits on its hands (checks the pinned / witness fail)
     --human  slower, human-ish bot: it re-acquires targets with a reaction delay and scans before shooting
   Starts the job directly (the giver -> brief -> drive path is dev/jobs-check.js's job), with the world streamed in and the
   Riverside cast preloaded, so the screenshots show the real models. Prints every radio line with its game time. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const has=k=>process.argv.includes('--'+k),arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
const OUT=path.join(__dirname,'../../docs/screenshots/jobs/overwatch');const SHOTS=has('shots'),MAX=+arg('max',12000);
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});const ev=(f,a)=>p.evaluate(f,a);
  const shot=async(n,prep)=>{if(!SHOTS)return;fs.mkdirSync(OUT,{recursive:true});if(prep)await ev(prep);
    await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(700);await ev(()=>{window.__rafOn=false});
    await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(OUT,n+'.jpg'),type:'jpeg',quality:84});console.log('     shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.openBridge();H.ow.buildAll();const pp=window.HT.People;
    await Promise.race([pp.preload(['rosa','nb_pops','nb_kid','nb_gran','nb_marcus','nb_kenji','nb_mei','thug_hoodie','dad_doug','dad_gary']),new Promise(r=>setTimeout(r,20000))]);
    const j=H.jobs.registry.get('overwatch');j.test.give(H.jobs.api);const i=H.jobs.index('overwatch');H.prog.done[H.jobs.index('rosa')]=true;
    for(let k=0;k<60&&H.assets.stream&&!H.assets.stream.idle();k++)await new Promise(r=>setTimeout(r,500));
    H.jobs.start('overwatch');H.step(2);
    /* the log: radio lines, stage changes, feed */
    const A=H.jobs.api,L=window.__owLog=[];const r0=A.radio;A.radio=(w,t,f)=>{L.push([+(H.M&&H.M.elapsed||0).toFixed(1),'radio',w,t]);return r0(w,t,f)};
    const f0=A.feed;A.feed=(t,k,s)=>{L.push([+(H.M&&H.M.elapsed||0).toFixed(1),'feed',t,s||'']);return f0(t,k,s)}});
  for(let i=0;i<40;i++){const n=await ev(()=>{const H=window.__ht;H.step(1);return H.assets.stream.idle()});if(n)break;await p.waitForTimeout(400)}
  await shot('01-ladder',()=>{const H=window.__ht;H.P.yaw=Math.PI/2+.35;H.P.pitch=.05});
  const opts={fail:has('fail'),human:has('human')};
  let t=0,lastStage='',shots={},lastLog=0;const T0=Date.now();
  while(t<MAX){const r=await ev(([n,o,t0])=>{const H=window.__ht,j=H.jobs.registry.get('overwatch'),a=H.jobs.api;let t=t0;
      for(let k=0;k<n&&H.M&&H.M.state==='go';k++,t++){j.test.step(a,t,o);H.P.hp=Math.max(H.P.hp,60);H.step(1)}
      const M=H.M,O=M&&M.ow,E=O&&O.esc;return{t,state:M&&M.state,stage:O&&O.stage,el:M&&+M.elapsed.toFixed(1),s:E?+E.s.toFixed(1):null,es:E&&E.state,pin:E?+E.pinT.toFixed(1):0,hp:O&&O.witHp,
        roof:O&&O.roof.on,threats:O?O.threats.map(x=>x.id+':'+x.st+(x.e?'/'+x.e.state:'')+(x.marked?'*':'')).join(' '):'',car:O&&O.car?{x:+O.car.c.x.toFixed(0),flats:O.car.flats.join(''),done:O.car.done}:null,
        last:O&&O.lastHit,stats:O&&O.stats,scoped:O&&O.rifle.scopeT>.9,exit:M&&M.exitOpen}},[60,opts,t]);
    t=r.t;const L=await ev(k=>window.__owLog.slice(k),lastLog);lastLog+=L.length;if(!has('quiet'))for(const l of L)console.log(String(l[0]).padStart(6)+'  '+l[1].padEnd(5)+' '+l[2]+': '+l[3]);
    if(r.stage!==lastStage){console.log('--- stage '+r.stage+' @'+r.el+'s  escort s='+r.s+' '+r.es);lastStage=r.stage}
    if(t%600===0||r.state!=='go')console.log('   t='+r.el+' s='+r.s+' '+r.es+' pin='+r.pin+' hp='+r.hp+' | '+r.threats+(r.car?' | car '+JSON.stringify(r.car):'')+' last '+JSON.stringify(r.last));
    /* screenshots at moments that tell the story */
    const want=[[r.stage==='ladder'&&r.roof&&r.scoped,'02-sight-in-scope'],[r.stage==='garden'&&r.s>12&&r.scoped,'03-garden-scope'],[r.stage==='garden'&&r.s>20&&!r.scoped,'04-garden-roof'],
      [r.stage==='court'&&r.s>48&&r.scoped,'05-court-scope'],[r.stage==='court'&&/hoop:aim/.test(r.threats),'06-court-threat'],[r.stage==='church'&&r.s>95&&r.scoped,'07-church-scope'],[r.stage==='car'&&r.car&&r.car.x<445&&r.scoped,'08-car-scope'],[r.exit,'09-done']];
    for(const[c,n]of want)if(c&&!shots[n]){shots[n]=1;await shot(n)}
    if(r.state!=='go'){console.log('END '+r.state+' @'+r.el+'s stats '+JSON.stringify(r.stats));break}}
  await ev(()=>window.__ht.step(40));
  const res=await ev(()=>{const H=window.__ht,M=H.M;return{pay:M&&M.pay?{total:M.pay.total,lines:M.pay.lines.map(l=>l.label+':'+l.amount)}:null,medal:M&&M.medal,trustR:Math.round(H.prog.trustR)}});
  console.log('result '+JSON.stringify(res));await shot('10-result');
  console.log('wall '+((Date.now()-T0)/1000).toFixed(0)+'s');const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'CONSOLE ERRORS:\n'+bad.slice(0,8).join('\n'):'no console errors');
  await b.close()})().catch(e=>{console.error(e);process.exit(1)});
