/* audit/jobs fail-path probe: node dev/audit/jobs/probe.js <id> [--ways=down,leash,car,bot] [--quit=go|abandon|title|reload] [--out=file.json]
   1. new game, unlock <id>, snapshot the hub (baseline)
   2. start the job; for every stage: play the job's own bot until that stage, snapshot it, fail it one way (rotating through
      --ways), read the fail card, press "Retry from <stage>" with a real click, check the stage/state/leaks
   3. at the last stage: fail, press "Restart job" -> must be back at stage 0
   4. leave the job by --quit (result card "Back to the cul-de-sac", pause -> Abandon job, pause -> Quit to title -> Continue,
      or a page reload) and compare the hub with the baseline
   Prints one JSON line per step; exit 0 always (it is a probe, the FINDINGS decide). */
const {boot,click,live,waitCard,install}=require('./lib.js'),fs=require('fs');
const ID=process.argv[2];const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
const WAYS=arg('ways','down,leash,car,bot').split(','),QUIT=arg('quit','go'),LOG=[];
const log=(step,o)=>{const l=Object.assign({step},o);LOG.push(l);console.log(JSON.stringify(l))};
(async()=>{const {b,p,errs}=await boot();const ev=(f,a)=>p.evaluate(f,a);
  const info=await ev(id=>{const j=window.__ht.jobs.registry.get(id);return j?{stages:j.def.stages||[],roam:!!j.def.roam,night:!!j.def.night,noGuns:!!j.def.noGuns,stay:!!j.def.stay,fp:j.def.failPolicy,builtin:!!j.builtin}:null},ID);
  if(!info){console.log('no job '+ID);await b.close();return}
  log('info',info);
  log('unlock',{lock:await ev(id=>window.__A.unlock(id),ID)});await ev(id=>window.__A.cast(id),ID);
  await ev(()=>{const H=window.__ht;H.enterHub();H.step(30)});await live(p,1200);
  const base=await ev(()=>window.__A.snap());log('base',base);
  const fail=async(way)=>{return ev(([way,id])=>{const H=window.__ht,a=H.jobs.api,M=H.M;if(!M||M.state!=='go')return{err:'not running',state:M&&M.state};
    if(way==='down'){/* hurtPlayer is not reachable from the page: same path it takes at 0 hp */H.P.hp=0;a.endMission(false,"You took one too many. Gary drove you home doing exactly the speed limit. Nobody blames you.")}
    else if(way==='leash'){if(H.CV){const c=H.CV;c.pos.x+=260;H.syncVan&&H.syncVan()}else H.P.pos.x+=260;for(let i=0;i<30*14&&H.M.state==='go';i++){H.step(1);if(!H.CV)H.P.pos.x=H.P.pos.x}}
    else if(way==='car'){const c=M.car||H.CV||H.VAN;H.carDamage(c,1e5,'test');for(let i=0;i<90&&H.M.state==='go';i++)H.step(1)}
    else if(way==='bot'){window.__A.play(id,{fail:true},9000)}
    return{state:H.M&&H.M.state,stage:H.M&&H.M.stage}},[way,ID])};
  /* ---- stages ---- */
  const r0=await ev(id=>{window.__ht.jobs.start(id);window.__ht.step(3);return window.__A.snap()},ID);log('start',r0);
  const stages=info.stages.length?info.stages:[null];let wi=0;const atStage={};
  for(let si=0;si<stages.length;si++){const st=stages[si];
    if(st){const adv=await ev(([id,st])=>window.__A.play(id,{},15000,"M.stage==='"+st+"'"),[ID,st]);if(adv.state!=='go'||adv.stage!==st){log('advance',{stage:st,adv,note:'bot did not reach the stage'});break}}
    const s0=await ev(()=>window.__A.snap());atStage[st]=s0;log('at',{stage:st,snap:s0});
    const way=WAYS[wi++%WAYS.length];const f=await fail(way);
    if(f.state==='go'){log('fail',{stage:st,way,f,note:'this way did not fail the job'});
      const f2=await fail('bot');if(f2.state!=='lost'){log('fail',{stage:st,way:'bot',f:f2,note:'bot fail did not fail either'});break}}
    else log('fail',{stage:st,way,f});
    const c=await waitCard(p);log('card',{stage:st,c});
    const last=si===stages.length-1;const act=last&&c&&c.btns.some(x=>x.act==='result:restart')?'result:restart':'result:retry';
    const ok=await click(p,act);await ev(()=>window.__ht.step(5));
    const s1=await ev(()=>window.__A.snap());
    const ref=act==='result:restart'?atStage[stages[0]]||r0:s0;
    log('after',{stage:st,act,clicked:ok,snap:s1,diff:{stage:[ref.M&&ref.M.stage,s1.M&&s1.M.stage],wmObjs:[ref.wmObjs,s1.wmObjs],lgroup:[ref.lgroup,s1.lgroup],enemies:[ref.enemies,s1.enemies],allies:[ref.allies,s1.allies],solids:[ref.solids,s1.solids],cols:[ref.cols,s1.cols],overlays:[ref.overlays,s1.overlays]}});
    if(!s1.M||s1.M.state!=='go'){log('stop',{why:'not running after '+act});break}
    if(act==='result:restart')break}
  /* ---- leave the job ---- */
  await ev(()=>{for(let i=0;i<2;i++)window.__ht.draw()});const pre=await ev(()=>window.__A.snap());log('preQuit',pre);
  if(QUIT==='go'){const f=await fail('bot');if(f.state==='go')await fail('down');const c=await waitCard(p);log('card',{c});await click(p,'result:go')}
  else if(QUIT==='abandon'||QUIT==='title'){await p.keyboard.press('Escape');await p.waitForTimeout(300);const ps=await ev(()=>({screen:window.__ht.HUD.screen,btns:[...document.querySelectorAll('.ht-pause [data-act],[data-act=quit],[data-act=abandon]')].filter(b=>b.offsetParent).map(b=>b.dataset.act+':'+b.textContent.trim())}));log('pause',ps);
    if(QUIT==='abandon')log('abandon',{clicked:await click(p,'abandon')});
    else{await click(p,'quit');await p.waitForTimeout(300);const d=await ev(()=>[...document.querySelectorAll('.ht-dialog [data-act],.ht-dlg [data-act]')].map(b=>b.dataset.act+':'+b.textContent.trim()));log('dialog',{d});
      await ev(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Quit to title'&&b.offsetParent&&b.closest('[class*=dialog],[class*=dlg]'));if(b)b.click()});await p.waitForTimeout(500);
      log('title',{screen:await ev(()=>window.__ht.HUD.screen),mode:await ev(()=>window.__ht.mode)});await click(p,'continue');await p.waitForTimeout(500)}}
  else if(QUIT==='reload'){await p.reload();await p.waitForFunction(()=>window.__ht&&window.__ht.assets&&window.__ht.assets.done,null,{timeout:90000});await p.evaluate(()=>{window.__rafOn=false});
    await click(p,'continue');await p.waitForTimeout(500);await p.evaluate(async()=>{await window.__ht.jobs.ready});await p.evaluate(install)}
  await ev(()=>{const H=window.__ht;for(let i=0;i<4;i++){H.step(5);if(H.L)H.draw()}});await live(p,1500);
  const after=await ev(()=>window.__A?window.__A.snap():null);log('hub',after);
  if(after){const keys=['mode','night','loadout','CV','vanOn','wmObjs','wmInScene','enemies','overlays','fov','keysHeld','noTraffic','widgets','cars','carsHidden','solids','cols','lgroup','gunShown','obj'];
    const d={};for(const k of keys)if(JSON.stringify(base[k])!==JSON.stringify(after[k]))d[k]=[base[k],after[k]];log('hubDiff',{quit:QUIT,d})}
  const bad=errs.filter(e=>!/favicon/.test(e));log('errors',{n:bad.length,errs:bad.slice(0,8)});
  if(arg('out'))fs.writeFileSync(arg('out'),JSON.stringify(LOG,null,1));
  await b.close()})().catch(e=>{console.error(e);process.exit(1)});
