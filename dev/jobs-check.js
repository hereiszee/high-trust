/* Job harness (SPEC3 wave 0, docs/JOBS.md "Testing a job"): plays a registered job by script in the real game.
   node dev/jobs-check.js <id> [--retry] [--replay] [--shots] [--no-giver]
   Headless Chromium + SwiftShader through dev/ai-ingame-lib.js; only window.__ht.step() advances the game.
   1. new game, wait for the job files, unlock the job (its test.give(api) or its unlock.done ids)
   2. giver: from home (laptop, fridge...) or a giver in the world -> the brief -> accept -> drive the van into the job's ring
   3. the job's own scripted player, test.step(api, frame, opts), until the job ends -> checks: won, paid, saved (jobs[id], calendar)
   --retry   first a run with opts.fail (the bot gives up) -> fail card offers "Retry from <stage>" and "Restart job" -> retry -> win
   --replay  then the fridge calendar at home -> Replay -> win again: half pay, no new day, done stays, households unchanged
   --shots writes jpgs to docs/screenshots/jobs/<id>/.
   --save <file.json> starts from that save instead of a new game (e.g. dev/fixtures/all-done-save.json: every job done)
   Exit code 1 on any failure; console errors fail the run. */
const {open}=require('./ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const ID=process.argv[2];if(!ID||ID.startsWith('--')){console.log('usage: node dev/jobs-check.js <id> [--retry] [--replay] [--shots]');process.exit(2)}
const has=k=>process.argv.includes('--'+k),SHOTS=has('shots'),SHOT_DIR=path.join(__dirname,'../docs/screenshots/jobs/'+ID);
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
const SAVE_I=process.argv.indexOf('--save'),SAVE_F=SAVE_I>0?process.argv[SAVE_I+1]:null;/* --save file.json: start from that save (title -> Continue) */
(async()=>{const {b,p,errs}=await open(SAVE_F?{init:{fn:s=>{try{if(!sessionStorage.getItem('__seeded')){localStorage.setItem('ht-save',s);sessionStorage.setItem('__seeded','1')}}catch(e){}},arg:fs.readFileSync(SAVE_F,'utf8')}}:{});const ev=(f,a)=>p.evaluate(f,a);
  const shot=async(n,prep)=>{if(!SHOTS)return;fs.mkdirSync(SHOT_DIR,{recursive:true});if(prep)await ev(prep);
    /* cards fade in on animation frames: let the page run live for a moment, then pause it again */
    await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(900);await ev(()=>{window.__rafOn=false});await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(SHOT_DIR,n+'.jpg'),type:'jpeg',quality:82,timeout:120000,animations:'disabled'}).catch(e=>console.log('     (shot '+n+' failed: '+e.message.split('\n')[0]+')'))};
  await p.click('.ht-title [data-act='+(SAVE_F?'continue':'newgame')+']').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));
  await p.waitForTimeout(300);
  const reg=await p.evaluate(async id=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get(id);return j?{title:j.def.title,from:j.def.from||null,index:H.jobs.index(id),stages:j.def.stages,test:!!j.test,builtin:!!j.builtin}:null},ID);
  ok(!!reg&&!reg.builtin,'registered: '+JSON.stringify(reg));if(!reg||reg.builtin){await b.close();process.exit(1)}
  /* page-side helpers: unlock, drive into the ring, run the bot */
  await ev(()=>{const H=window.__ht,T=window.__J={};const k=H.keys;
    T.api=()=>H.jobs.api;T.SV=()=>H.jobs.api.SV();
    T.unlock=id=>{const j=H.jobs.registry.get(id),u=j.def.unlock||{},s=T.SV();for(const d of[].concat(u.done||[])){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true;if(s&&window.HT.Save.jobRec)window.HT.Save.jobRec(s,d).done=true}
      if(u.trust)H.prog.trust=Math.max(H.prog.trust,u.trust);if(u.trustR)H.prog.trustR=Math.max(H.prog.trustR||0,u.trustR);/* one person, one place: a giver with several jobs offers the earlier (story) ones first, so take those as a player would have */
      {const me=j.def,MI=H.MISSIONS;for(let pass=0;pass<4;pass++)for(const m2 of MI){const k=MI.indexOf(m2);if(m2===me||m2.repeatable||H.prog.done[k]||H.jobs.lock(m2.id))continue;if(m2.giver!==me.giver)continue;
          H.prog.done[k]=true;if(s&&window.HT.Save.jobRec)window.HT.Save.jobRec(s,m2.id).done=true}}
      if(j.test&&j.test.give)j.test.give(T.api());/* the Act 2 'bridge is open' card would pop over the test and pause the game */try{const sv=H.save;if(sv&&sv.flags&&H.prog.done[1]){sv.flags.act2Intro=true;H.prog.act=Math.max(H.prog.act||1,2)}}catch(e){}return H.jobs.lock(id)};
    T.drive=(tgt,steps)=>{const G=H.ow.roads(),e=H.CV;if(!e)return{err:'not driving'};let route=G.route({x:e.pos.x,z:e.pos.z},tgt),pts=route?route.points:[tgt],wi=1,s=0,stuck=0;
      for(;s<steps;s++){const d0=Math.hypot(tgt.x-e.pos.x,tgt.z-e.pos.z);if(H.mode!=='hub')break;
        while(wi<pts.length-1&&Math.hypot(pts[wi].x-e.pos.x,pts[wi].z-e.pos.z)<6)wi++;const w=d0<12?tgt:pts[Math.min(wi,pts.length-1)];
        const dx=w.x-e.pos.x,dz=w.z-e.pos.z;let d=Math.atan2(-dx,-dz)-e.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;
        const want=d0<12?Math.max(1.5,d0*.4):Math.abs(d)>.5?7:13;k.a=d>.05;k.d=d<-.05;k.w=e.spd<want;k.s=e.spd>want+2;
        if(Math.abs(e.spd)<.5){stuck++;if(stuck>90){stuck=0;const q=pts[Math.min(wi+1,pts.length-1)];e.pos.set(q.x,0,q.z);H.syncVan&&H.syncVan()}}else stuck=0;H.step(1)}
      for(const x of['w','a','s','d'])k[x]=false;return{steps:s,mode:H.mode,d:Math.hypot(tgt.x-e.pos.x,tgt.z-e.pos.z)}};
    T.toRing=i=>{const d=H.L.dests[i],G=H.ow.roads(),V=H.VAN;if(!d)return{err:'no dest'};if(H.CV)H.exitVehicle();const r=G.nearestRoad(d.x,d.z),A_=G.nodes[r.a],B_=G.nodes[r.b];
      const far=Math.hypot(A_.x-d.x,A_.z-d.z)>Math.hypot(B_.x-d.x,B_.z-d.z)?A_:B_;V.pos.set(far.x,0,far.z);V.yaw=Math.atan2(-(d.x-far.x),-(d.z-far.z));V.spd=0;if(V.car)V.car.spd=0;H.syncVan();
      H.P.pos.set(far.x+2.5,0,far.z);H.enterVan();H.step(2);return T.drive({x:d.x,z:d.z},2400)};
    T.play=(id,o,max)=>{const j=H.jobs.registry.get(id),a=T.api();let t=0;for(;t<max&&H.M&&H.M.state==='go';t++){if(j.test&&j.test.step)j.test.step(a,t,o||{});H.P.hp=Math.max(H.P.hp,60);H.step(1)}
      for(const x of['w','a','s','d','e'])k[x]=false;return{t,state:H.M&&H.M.state,stage:H.M&&H.M.stage,elapsed:H.M&&Math.round(H.M.elapsed)}};
    T.res=()=>({acts:Object.keys(H.UIacts||{}),pay:H.M&&H.M.pay?{total:H.M.pay.total,rerun:H.M.pay.rerun,lines:H.M.pay.lines.map(l=>l.label+':'+l.amount)}:null,medal:H.M&&H.M.medal,replay:!!(H.M&&H.M.replay),retried:!!(H.M&&H.M.retried)});
    T.rec=id=>{const s=T.SV();return s?{job:s.jobs&&s.jobs[id],cal:(s.calendar&&s.calendar.entries||[]).find(e=>e.id===id)||null,day:s.day,cash:s.cash,hh:(s.world&&s.world.households||[]).length}:null}});
  const lk=await ev(id=>window.__J.unlock(id),ID);ok(lk===null,'unlocked (lock='+lk+')');
  /* the job start waits for its cast (crew, giver, thugs) to stream in; synchronous stepping never resolves that wait, so load it first */
  const cast=await p.evaluate(async id=>{const H=window.__ht,pm=window.HT&&HT.People;if(!pm||!pm.ok||!pm.preload)return'no People';const want=H.jobs.castKeys(id);
    await Promise.race([pm.preload(want).catch(()=>{}),new Promise(r=>setTimeout(r,25000))]);return want.join(',')||'already loaded'},ID);console.log('     cast: '+cast);
  /* rebuild the hub so world givers for the newly unlocked job spawn */
  await ev(()=>{const H=window.__ht;if(H.mode==='hub'){H.enterHub();H.step(2)}});
  /* ---- the giver -> brief -> drive ---- */
  const from=reg.from||{};
  if(!has('no-giver')){
    if(from.home){await ev(()=>window.__ht.enterHome());await p.waitForFunction(()=>window.__ht.mode==='home',null,{timeout:60000}).catch(()=>{});
      const g=await ev(h=>{const H=window.__ht;H.step(3);const r=H.jobs.homeUse(h);H.step(1);return{used:r,acts:Object.keys(H.UIacts||{})}},from.home);
      ok(g.used&&g.acts.includes('brief:go'),'home giver "'+from.home+'" offers the brief ('+JSON.stringify(g)+')');await shot(ID+'-brief',()=>{const H=window.__ht;if(H.mode==='home'){H.P.pos.set(1.9,0,6.3);H.P.yaw=0;H.P.pitch=-.12}});
      const go=await ev(i=>{const H=window.__ht;H.UIacts['brief:go']();H.step(2);H.exitHome('front');H.step(3);return{mode:H.mode,job:H.JOB,i}},reg.index);
      ok(go.mode==='hub'&&go.job===reg.index,'accepted at home, out the front door with the job on the list ('+JSON.stringify(go)+')')}
    else{const g=await ev(i=>{const H=window.__ht;const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver',givers:H.npcs.map(n=>n.marker&&n.marker.i)};H.P.pos.set(n.pos.x+1.6,0,n.pos.z);H.collide(H.P.pos,.35);H.step(1);H.use=true;H.step(1);
        const br=!!(H.UIacts&&H.UIacts['brief:go']);if(br)H.UIacts['brief:go']();H.step(1);return{brief:br,job:H.JOB}},reg.index);ok(g.brief&&g.job===reg.index,'giver in the world offers the brief ('+JSON.stringify(g)+')')}
    let dr=await ev(i=>window.__J.toRing(i),reg.index);
    /* the start may be waiting on a model still streaming in (startMissionWhenReady's castWait): let it finish, then step */
    if(dr.mode==='hub')dr=await p.evaluate(async()=>{const H=window.__ht;const w=H.jobs.castWait;if(w)await w;H.step(2);return{mode:H.mode,waited:!!w}});ok(dr.mode==='mission','drove into the ring, the job started ('+JSON.stringify(dr)+')')}
  else await ev(id=>window.__ht.jobs.start(id),ID);
  let st=await ev(id=>{const H=window.__ht;return{mode:H.mode,id:H.M&&H.M.def.id,stage:H.M&&H.M.stage}},ID);ok(st.mode==='mission'&&st.id===ID,'job running '+JSON.stringify(st));await shot(ID+'-start');
  const r0=await ev(id=>window.__J.rec(id),ID);
  /* ---- --retry: lose on purpose, then retry from the stage checkpoint ---- */
  if(has('retry')){const f=await ev(id=>window.__J.play(id,{fail:true},9000),ID);ok(f.state==='lost','scripted failure: '+JSON.stringify(f));await ev(()=>window.__ht.step(45));
    const fr=await ev(()=>{const H=window.__ht,r=window.__J.res();const lab=[...document.querySelectorAll('button,[data-act]')].map(e=>e.textContent.trim()).filter(t=>/Retry|Restart/.test(t));return Object.assign(r,{labels:lab,stage:H.jobs.CP.last()&&H.jobs.CP.last().stage})});
    ok(fr.acts.includes('result:retry')&&fr.acts.includes('result:restart'),'fail card: retry and restart ('+JSON.stringify(fr)+')');await shot(ID+'-fail');
    const rt=await ev(()=>{const H=window.__ht;H.UIacts['result:retry']();H.step(3);return{state:H.M.state,stage:H.M.stage,retried:H.M.retried,elapsed:Math.round(H.M.elapsed)}});
    ok(rt.state==='go'&&rt.retried&&rt.stage===fr.stage,'retried from the "'+fr.stage+'" checkpoint ('+JSON.stringify(rt)+')')}
  const w=await ev(id=>window.__J.play(id,{},12000),ID);ok(w.state==='won','scripted win: '+JSON.stringify(w));await ev(()=>window.__ht.step(40));
  const res=await ev(()=>window.__J.res());ok(res.pay&&res.pay.total>0,'paid: '+JSON.stringify(res));await shot(ID+'-result');
  const r1=await ev(id=>window.__J.rec(id),ID);
  ok(r1.job&&r1.job.done&&r1.job.runs>=1&&r1.cal&&r1.cash>r0.cash,'saved: jobs.'+ID+' '+JSON.stringify(r1.job)+' calendar '+JSON.stringify(r1.cal)+' day '+r0.day+'->'+r1.day);
  if(has('retry'))ok(res.medal<=2&&res.retried,'gold needs a run without a stage retry (medal '+res.medal+')');
  /* ---- --replay: the fridge calendar at home ---- */
  if(has('replay')){await ev(()=>{const H=window.__ht;H.UIacts['result:go']&&H.UIacts['result:go']();H.step(2)});
    await ev(()=>window.__ht.enterHome());await p.waitForFunction(()=>window.__ht.mode==='home',null,{timeout:60000}).catch(()=>{});
    const c=await ev(id=>{const H=window.__ht;H.step(2);H.jobs.calendar();H.step(1);const e=H.jobs.calEntries();return{entries:e.map(x=>x.id+':'+x.medal),acts:Object.keys(H.UIacts||{}),card:!!document.querySelector('.ht-cal,[data-screen=calendar],.cal-card')}},ID);
    ok(c.entries.some(x=>x.startsWith(ID+':'))&&c.acts.includes('calendar:replay'),'fridge calendar lists the job with Replay ('+JSON.stringify(c)+')');await shot(ID+'-calendar',()=>{const H=window.__ht;if(H.mode==='home'){H.P.pos.set(1.9,0,6.3);H.P.yaw=0;H.P.pitch=-.12}});
    const rp=await ev(id=>{const H=window.__ht;H.UIacts['calendar:replay'](id);H.step(3);return{mode:H.mode,replay:H.M&&H.M.replay,id:H.M&&H.M.def.id}},ID);ok(rp.mode==='mission'&&rp.replay&&rp.id===ID,'replay started from the calendar '+JSON.stringify(rp));
    const r2a=await ev(id=>window.__J.rec(id),ID);const w2=await ev(id=>window.__J.play(id,{},12000),ID);ok(w2.state==='won','replay won '+JSON.stringify(w2));await ev(()=>window.__ht.step(40));
    const res2=await ev(()=>window.__J.res()),r2=await ev(id=>window.__J.rec(id),ID);
    ok(res2.pay&&res2.pay.rerun&&r2.day===r2a.day&&r2.job.done&&r2.job.replays>=1&&r2.hh===r2a.hh,'replay: half pay, same day, done kept, households unchanged ('+JSON.stringify({pay:res2.pay&&res2.pay.total,rerun:res2.pay&&res2.pay.rerun,day:[r2a.day,r2.day],replays:r2.job.replays})+')')}
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,5).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
