/* Everybody Waves: the festival epilogue against three save histories, and the festival's busiest moment on the clock.
   node dev/jobs/finale-epilogue.js [--shots]
   For each history (clean / loud / skip): start the finale at the festival, read what every guest says (first and second line)
   and check the lines reflect THEIR job as the save has it; check the epilogue card; and at "everybody waves" measure draw calls
   and frame time. One browser, a fresh page per history. Prints every line, so a person can read them too. */
const {open}=require('../ai-ingame-lib.js'),setupSave=require('./finale-saves.js'),path=require('path'),fs=require('fs');
const SHOTS=process.argv.includes('--shots'),DIR=path.join(__dirname,'../../docs/screenshots/jobs/finale');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
/* what each history must make people say (substrings), and must not */
const EXPECT={
  clean:{must:{earl:'Dez runs the bike library',dee:'Mr. Ferreira does the 2nd St crossing',rosa:'bloomed early',sal:'Honest Towing',barb:'1418 Walnut',adeyemi:'The piano survived',ferreira:'Now people wave',ramos:'Ramos Bakery opens',tre:'There\'s a polo',dez:'flower boxes',marcus:'fair and square',gary:'Good Fences, in quiet',rick:'Textbook',dave:'brisket made it',doug:'WE WAVE',jen:'orthodontist',maddie:'surveillance',porch:'Turbo Nose Hair Trimmer',lyle:'Three weeks'},epi:'Everybody waves.'},
  loud:{must:{earl:'waiting list',dee:'Kevin still talks',rosa:'Next time, one beanbag',sal:'impounded',barb:'nine HOA violations',ferreira:'First time I\'ve been out',gary:'loud at the storage place',doug:'I\'m on the roof',tre:'thinking about getting a real job',jen:'home for dinner'},not:{lyle:true},epi:'People wave. Some of them still flinch.'},
  skip:{must:{dee:'Eleven kids walk across',ramos:'I\'d put a bakery there',doug:'I\'m on the roof',porch:'I sit in my lawn chair',gary:'spreadsheet for next year'},not:{lyle:true,kid:true},epi:'Most people wave.'}};
(async()=>{for(const hist of['clean','loud','skip']){const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
    await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(300);const st=await p.evaluate(setupSave,hist);ok(st.lock===null,hist+': the finale is open ('+st.lock+')');
    await ev(async()=>{await window.HT.Finale.preloadCast()});
    const r=await ev(()=>{const H=window.__ht;H.jobs.start('finale');H.step(4);const M=H.M,FN=window.HT.Finale;M.fn.plan=window.HT.Plan.auto(FN.PLAN_DEF,{});FN.advance(M,'festival');for(let i=0;i<10;i++)H.step(1);
      const c=FN.ctx(),S=M.fn.sub,out={};for(const p of S.cast.concat(S.fam)){const L=FN.LINES[p.lid];if(L)out[p.lid]=L(c)}return{lines:out,epi:FN.epilogue(),n:S.cast.length+S.fam.length+S.crowd.length}});
    console.log('     '+hist+': '+r.n+' people at the festival · epilogue "'+r.epi+'"');for(const k in r.lines)console.log('       '+k.padEnd(9)+r.lines[k].join(' / ').slice(0,230));
    const E=EXPECT[hist];for(const k in E.must){const L=r.lines[k];ok(!!L&&L.join(' ').includes(E.must[k]),hist+': '+k+' says "'+E.must[k]+'"')}
    for(const k in E.not||{})ok(!r.lines[k],hist+': '+k+' is not at the festival (that history never made it happen)');
    ok(r.epi===E.epi,hist+': the epilogue card reads "'+E.epi+'" ('+r.epi+')');
    /* the busiest moment: everybody waving, string lights on, the crane over the stage */
    const perf=await ev(async()=>{const H=window.__ht,M=H.M,FN=window.HT.Finale,P=H.P;M.fn.sub.talked=6;H.step(2);P.pos.set(FN.W.stage.x+2.2,0,FN.W.stage.z+.6);H.step(1);H.jobs.api.useTap=true;H.step(2);
      M.fn.sub.ch&&M.fn.sub.ch.pick(0);for(let i=0;i<120;i++)H.step(1);
      for(let k=0;k<40;k++){H.draw();await new Promise(r=>setTimeout(r,50))}/* streamed in */
      const R=H.renderer;R.info.autoReset=false;R.info.reset();H.draw();const calls=R.info.render.calls,tris=R.info.render.triangles;R.info.autoReset=true;
      const t0=performance.now();for(let i=0;i<20;i++){H.step(1);H.draw()}const ms=(performance.now()-t0)/20;
      return{ph:M.fn.sub.ph,calls,tris,ms:+ms.toFixed(1),people:(FN.live||[]).length,heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null}});
    console.log('     busiest moment ('+hist+'): '+JSON.stringify(perf));ok(perf.ph==='wave','festival is mid-wave when measured');
    if(SHOTS&&hist==='clean'){fs.mkdirSync(DIR,{recursive:true});await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(600);await ev(()=>{window.__rafOn=false});await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(DIR,'20-the-wave.jpg'),type:'jpeg',quality:82})}
    const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,hist+': no console errors'+(bad.length?': '+bad.slice(0,3).join(' | '):''));await b.close()}
  console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
