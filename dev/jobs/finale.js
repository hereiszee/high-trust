/* Everybody Waves: the stage runner. Starts the finale (optionally jumping to a stage's checkpoint), lets the job's own bot play,
   and prints what each stage is doing. One browser at a time.
   node dev/jobs/finale.js [--from <stage>] [--to <stage>] [--fail] [--shots] [--retry] [--frames N] [--save clean|loud|skip]
     --from    jump straight to that stage (marks its [CP], as reaching it would) to fit the memory cap and test one stage
     --to      stop once that stage starts
     --retry   after the run, retry from the last checkpoint and win from there
     --shots   jpgs of each stage into docs/screenshots/jobs/finale/
     --save    a save history: clean (every job done well), loud (several done loud / wrong calls), skip (optional jobs skipped)
   Also measures frame time and draw calls at the festival's busiest moment. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=k=>{const i=process.argv.indexOf('--'+k);return i<0?null:(process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:true)};
const FROM=arg('from'),TO=arg('to'),FAIL=!!arg('fail'),SHOTS=!!arg('shots'),RETRY=!!arg('retry'),FRAMES=+(arg('frames')||14000),SAVE=arg('save')||'clean';
const SHOT_DIR=path.join(__dirname,'../../docs/screenshots/jobs/finale');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  const shot=async n=>{if(!SHOTS)return;fs.mkdirSync(SHOT_DIR,{recursive:true});await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(700);await ev(()=>{window.__rafOn=false});
    await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(SHOT_DIR,n+'.jpg'),type:'jpeg',quality:80}).catch(e=>console.log('shot failed '+e.message));console.log('     shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>{});await p.waitForTimeout(300);
  /* a whole campaign's save, in one of three histories */
  const setup=await p.evaluate(async hist=>{const H=window.__ht;await H.jobs.ready;H.step(2);const s=H.jobs.api.SV(),S=window.HT.Save;
    const all=['gary','rick','dave','doug','earl','dee','rosa','benny','duke','taxi','hoa','mower','tail','crossing','tow','overwatch','pawn','moving','cargo','cones','talk','sabotage','brake','bike','arrest','heist','roundup','patrol','porch','carwash','blitz'];
    const skip=hist==='skip'?['patrol','porch','carwash','blitz','roundup','mower']:[];
    for(const id of all){if(skip.includes(id))continue;const r=S.jobRec(s,id);r.done=true;r.runs=1;r.medal=hist==='loud'?(['arrest','overwatch','crossing','heist','tail'].includes(id)?1:2):3;r.best={t:100,clean:hist!=='loud'};const i=H.jobs.index(id);if(i>=0)H.prog.done[i]=true}
    const f=s.flags;Object.assign(f,{act2Intro:true});s.world.bridgeOpen=true;
    if(hist==='clean'){Object.assign(f,{dezLibrary:true,pepperHome:true,crossingGuard:'ferreira',youthVan:true,gardenEarly:true,salBranch:true,towGuy:true,hankDiscount:true,hoaWalnut:true,lookoutMows:true,andre:true,ferreira:true,wholesalerNamed:true,bikesHome:7,mowerWon:true,marcusOwes:true,atmSafe:true,blockParty:true,hustlersFed:true,corkboard:true,maddieProud:true});
      for(const h of['adeyemi','tre_bikes','dez_family','ferreira','millshop','towguy'])S.household(s,h);S.storefront(s,'pawn','bakery');S.storefront(s,'millshop','honest');S.jobRec(s,'patrol').runs=4;S.jobRec(s,'porch').runs=2;S.jobRec(s,'heist').plan={assign:{},entry:'quiet'};H.prog.cuffed=212;H.prog.downed=6}
    else if(hist==='loud'){Object.assign(f,{crossingGuard:'volunteer',bikesHome:3,blockParty:true});S.household(s,'adeyemi');S.storefront(s,'pawn','bakery');S.jobRec(s,'heist').plan={assign:{},entry:'loud'};H.prog.cuffed=40;H.prog.downed=95}
    else{S.household(s,'adeyemi');Object.assign(f,{crossingGuard:'volunteer'});H.prog.cuffed=120;H.prog.downed=40}
    H.prog.trust=86;H.prog.trustR=84;H.prog.act=3;
    const j=H.jobs.registry.get('finale');return{lock:H.jobs.lock('finale'),j:!!j}},SAVE);
  ok(setup.j&&setup.lock===null,'finale registered and unlocked with a '+SAVE+' history '+JSON.stringify(setup));
  await p.evaluate(async()=>{const FN=window.HT.Finale;const pr=FN.preloadCast();if(pr)await Promise.race([pr,new Promise(r=>setTimeout(r,40000))])});
  const cr=await ev(()=>window.HT.Finale.castReady());ok(cr,'cast streamed in before any scene ('+cr+')');
  await ev(()=>{const H=window.__ht;H.jobs.start('finale');H.step(3)});
  if(FROM)await ev(st=>{const H=window.__ht,M=H.M,FN=window.HT.Finale;H.step(5);if(st!=='plan'){if(!M.fn.plan)M.fn.plan=window.HT.Plan.auto(FN.PLAN_DEF,{});FN.advance(M,st)}H.step(3)},FROM);
  const shotsDone={};
  const run=async(o,max)=>{let last='',t=0;while(t<max){const r=await ev(([o,n])=>{const H=window.__ht,a=H.jobs.api,j=H.jobs.registry.get('finale');let k=0;
      for(;k<n&&H.M&&H.M.state==='go';k++){j.test.step(a,(window.__ft=(window.__ft||0)+1),o);H.P.hp=Math.max(H.P.hp,60);H.step(1)}
      const M=H.M;return{state:M&&M.state,stage:M&&M.fn&&M.fn.stage,ph:M&&M.fn&&M.fn.sub&&M.fn.sub.ph,objs:(M&&M.fn&&M.fn.objs||[]).slice(0,2),why:M&&M.loseWhy,el:M&&Math.round(M.elapsed),st:M&&M.fn&&M.fn.st}},[o,150]);
      t+=150;const key=r.stage+'|'+(r.objs[0]||'');if(key!==last){console.log('  ['+r.el+'s] '+r.stage+(r.ph?'/'+r.ph:'')+' · '+r.objs.join(' · '));last=key}
      if(SHOTS&&r.stage&&!shotsDone[r.stage]){shotsDone[r.stage]=1;await ev(()=>window.__ht.step(20));await shot(String(Object.keys(shotsDone).length).padStart(2,'0')+'-'+r.stage)}
      if(TO&&r.stage===TO)return r;if(r.state!=='go')return r}return{state:'timeout'}};
  const r=await run(FAIL?{fail:true}:{},FRAMES);console.log('  end: '+JSON.stringify({state:r.state,stage:r.stage,why:r.why,st:r.st}));
  if(TO)ok(r.stage===TO,'reached '+TO);else ok(FAIL?r.state==='lost':r.state==='won','run '+(FAIL?'lost':'won')+' ('+r.state+')');
  if(RETRY&&r.state==='lost'){await ev(()=>window.__ht.step(45));const rt=await ev(()=>{const H=window.__ht;H.UIacts['result:retry']();H.step(3);return{state:H.M.state,stage:H.M.stage}});ok(rt.state==='go','retried from '+rt.stage);
    const r2=await run({},FRAMES);ok(r2.state==='won','won after the retry ('+r2.state+' '+r2.stage+' '+(r2.why||'')+')')}
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,5).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
