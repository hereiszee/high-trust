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
  /* the world streamed in around the camera before anything is judged */
  const stream=()=>ev(async()=>{const H=window.__ht;let last=-1,same=0;for(let k=0;k<160&&same<8;k++){H.draw();await new Promise(r=>setTimeout(r,60));const s=H.ow&&H.ow.stats&&H.ow.stats();const b=s?s.built:0;if(b===last&&(!H.assets.stream||!H.assets.stream.idle||H.assets.stream.idle()))same++;else{same=0;last=b}}});
  /* a framing per shot (the camera follows the dad): on foot, looking at what the stage is about */
  const POSE={'roadblock-build':[380.5,84,Math.PI,-.12],'roadblock-truck':[380.5,84,Math.PI,-.1],'roadblock-stopped':[383,84,Math.PI,-.1],'defend':[373,44.6,Math.PI/2,-.06],'defend-mid':[394,43.2,Math.PI/2+.25,-.05],
    'festival-walk':[407,43.2,Math.PI/2,-.06],'festival-home':[404,52,-.4,-.1],'plan':[404,46,Math.PI/2+.5,-.1]};
  const pose=n=>ev(([n,P_])=>{const H=window.__ht,a=H.jobs.api,M=H.M;const k=n.replace(/^\d+-/,'');let q=P_[k];
    if(!q&&M&&M.fn&&M.fn.stage==='handsup'&&M.fn.sub.spot){const S=M.fn.sub;{for(const[lr,lf]of[[-4.5,3],[-4.5,-3],[-3,6],[4.5,3],[0,7]]){const cx=S.spot.x+S.rt.x*lr+S.f.x*lf,cz=S.spot.z+S.rt.z*lr+S.f.z*lf;if(a.walkable(a.tx(cx),a.tx(cz))===false)continue;q=[cx,cz,Math.atan2(-(S.spot.x-cx),-(S.spot.z-cz)),-.12];break}}}
    if(!q)return;if(a.CV)a.exitCar();H.P.pos.set(q[0],0,q[1]);H.collide(H.P.pos,.35);H.P.yaw=q[2];H.P.pitch=q[3];H.step(2)},[n,POSE]);
  const shot=async n=>{if(!SHOTS)return;fs.mkdirSync(SHOT_DIR,{recursive:true});if(/festival-credits/.test(n))await ev(()=>{for(let i=0;i<150;i++)window.__ht.step(1)});if(/festival-wave$/.test(n))await ev(()=>{const H=window.__ht;H.M.fn.sub.wt=.9;H.M.fn.sub.wv=0;H.jobs.api.radio('you','We did it because we live here. That\'s it. That\'s the speech.',true);for(let i=0;i<36;i++)H.step(1)});await pose(n);await stream();if(!/postgame|result/.test(n))await ev(()=>{try{window.__ht.HUD.banner(null)}catch(_){}});if(/postgame/.test(n))await ev(()=>{const H=window.__ht,s=H.jobs.api.SV();s.flags.festivalCard=false;H.P.pos.set(394,0,43.2);H.P.yaw=Math.PI/2;H.P.pitch=-.04;H.step(1);H.draw()});await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(700);await ev(()=>{window.__rafOn=false});
    await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(SHOT_DIR,n+'.jpg'),type:'jpeg',quality:80}).catch(e=>console.log('shot failed '+e.message));console.log('     shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>{});await p.waitForTimeout(300);
  /* a whole campaign's save, in one of three histories */
  const setup=await p.evaluate(require('./finale-saves.js'),SAVE);
  ok(setup.j&&setup.lock===null,'finale registered and unlocked with a '+SAVE+' history '+JSON.stringify(setup));
  await p.evaluate(async()=>{const FN=window.HT.Finale;const pr=FN.preloadCast();if(pr)await Promise.race([pr,new Promise(r=>setTimeout(r,40000))])});
  const cr=await ev(()=>window.HT.Finale.castReady());ok(cr,'cast streamed in before any scene ('+cr+')');
  await ev(()=>{const H=window.__ht;H.jobs.start('finale');H.step(3)});
  if(FROM)await ev(st=>{const H=window.__ht,M=H.M,FN=window.HT.Finale;H.step(5);if(st!=='plan'){if(!M.fn.plan)M.fn.plan=window.HT.Plan.auto(FN.PLAN_DEF,{});FN.advance(M,st)}H.step(3)},FROM);
  const shotsDone={};
  if(SHOTS&&!FROM){await ev(()=>{const H=window.__ht;for(let i=0;i<12;i++)H.step(1);window.HT.Finale.openBoard(H.M);H.step(2)});await shot('00-plan-board');await ev(()=>{const H=window.__ht,b=H.M.fn.sub.board;if(b)b.close(true);H.M.fn.sub.board=null})}
  const run=async(o,max)=>{let last='',t=0;while(t<max){const r=await ev(([o,n])=>{const H=window.__ht,a=H.jobs.api,j=H.jobs.registry.get('finale');let k=0;
      for(;k<n&&H.M&&H.M.state==='go';k++){j.test.step(a,(window.__ft=(window.__ft||0)+1),o);H.P.hp=Math.max(H.P.hp,60);H.step(1)}
      const M=H.M;return{state:M&&M.state,stage:M&&M.fn&&M.fn.stage,ph:M&&M.fn&&M.fn.sub&&M.fn.sub.ph,objs:(M&&M.fn&&M.fn.objs||[]).slice(0,2),why:M&&M.loseWhy,el:M&&Math.round(M.elapsed),st:M&&M.fn&&M.fn.st}},[o,150]);
      t+=150;const key=r.stage+'|'+(r.objs[0]||'');if(key!==last){console.log('  ['+r.el+'s] '+r.stage+(r.ph?'/'+r.ph:'')+' · '+r.objs.join(' · '));last=key}
      const sk=r.stage+(r.ph?'-'+r.ph:'');if(SHOTS&&r.stage&&!shotsDone[sk]){shotsDone[sk]=1;await shot(String(Object.keys(shotsDone).length).padStart(2,'0')+'-'+sk);
        if(sk==='festival-wave'){await ev(()=>{const H=window.__ht,S=H.M.fn.sub;S.wt=9.4;S.wv=0;for(let i=0;i<20;i++)H.step(1)});await shot('17b-festival-wave-wide')}}
      if(SHOTS&&r.stage&&!r.ph){const k2=r.stage+'-mid';shotsDone[r.stage+'T']=(shotsDone[r.stage+'T']||0)+1;if(shotsDone[r.stage+'T']===4&&!shotsDone[k2]){shotsDone[k2]=1;await shot(String(Object.keys(shotsDone).length).padStart(2,'0')+'-'+k2)}}
      if(TO&&r.stage===TO)return r;if(r.state!=='go')return r}return{state:'timeout'}};
  const r=await run(FAIL?{fail:true}:{},FRAMES);console.log('  end: '+JSON.stringify({state:r.state,stage:r.stage,why:r.why,st:r.st}));
  if(SHOTS&&r.state==='won'){await ev(()=>window.__ht.step(45));await shot('19-result');
    await ev(()=>{const H=window.__ht;H.UIacts['result:retry']&&H.UIacts['result:retry']();H.step(4)});await shot('20-postgame')}
  if(TO)ok(r.stage===TO,'reached '+TO);else ok(FAIL?r.state==='lost':r.state==='won','run '+(FAIL?'lost':'won')+' ('+r.state+')');
  if(RETRY&&r.state==='lost'){await ev(()=>window.__ht.step(45));const rt=await ev(()=>{const H=window.__ht;H.UIacts['result:retry']();H.step(3);return{state:H.M.state,stage:H.M.stage}});ok(rt.state==='go','retried from '+rt.stage);
    const r2=await run({},FRAMES);ok(r2.state==='won','won after the retry ('+r2.state+' '+r2.stage+' '+(r2.why||'')+')')}
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,5).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
