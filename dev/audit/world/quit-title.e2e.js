/* C-4: quitting a job to the title must clean up like an abort. node dev/audit/world/quit-title.e2e.js [ids...]
   For each job (default: sabotage, the night stealth job, plus a day job): start it in the world, run a few seconds, open the pause menu
   (Escape), Quit to title, confirm. Then on the title screen: no job overlay left (the stealth gem "Lit up / Dim / In shadow / Hidden"),
   night back to day, no job widgets/meters in the DOM. Then New game: the hub is daylight and clean too. */
const {open,log,ok,out}=require('./lib.js');
const IDS=process.argv.slice(2).filter(a=>!a.startsWith('--'));const JOBS=IDS.length?IDS:['sabotage','tail'];
/* every requestAnimationFrame callback made while the harness is paused is queued (the harness keeps only the last one, which may not be
   the game's own frame loop); __resume() hands them all back, so the title screen runs real frames like a player's would */
const init=()=>{const inner=window.requestAnimationFrame;window.__rafQ=[];window.requestAnimationFrame=cb=>{if(window.__rafOn)return inner(cb);window.__rafQ.push(cb);return 0};
  window.__resume=()=>{window.__rafOn=true;const q=window.__rafQ.splice(0);for(const cb of q)inner(cb)}};
(async()=>{const W=await open({init});const {p,ev,step}=W;
  for(const id of JOBS){
    const st=await p.evaluate(async id=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get(id);if(!j)return{err:'no job '+id};
      const u=j.def.unlock||{},s=H.jobs.api.SV();for(const d of[].concat(u.done||[])){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true;if(s&&HT.Save.jobRec)HT.Save.jobRec(s,d).done=true}
      if(u.trust)H.prog.trust=Math.max(H.prog.trust,u.trust);if(u.trustR)H.prog.trustR=Math.max(H.prog.trustR||0,u.trustR);try{if(s&&s.flags&&H.prog.done[1]){s.flags.act2Intro=true;H.prog.act=Math.max(H.prog.act||1,2)}}catch(e){}
      const pm=HT.People;if(pm&&pm.ok&&pm.preload)await Promise.race([pm.preload(H.jobs.castKeys(id)).catch(()=>{}),new Promise(r=>setTimeout(r,25000))]);
      if(H.mode!=='hub'){H.enterHub();H.step(2)}const i=H.jobs.index(id);H.startMissionWorld(i);const w=H.jobs.castWait;if(w)await w;H.step(2);return{i,mode:H.mode,state:H.M&&H.M.state}},id);
    log(id,'started',st);if(st.err||st.mode!=='mission'){ok(false,id+': job started',st);continue}
    /* run ~4 s, giving js/stealth.js time to load and mount its HUD */
    for(let k=0;k<8;k++){await step(15);await p.waitForTimeout(150)}await ev(()=>window.__ht.draw());
    const before=await ev(()=>{const H=window.__ht;const gem=[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.offsetParent&&/^(Lit up|Dim|In shadow|Hidden)$/.test(e.textContent.trim())).map(e=>e.textContent.trim());
      return{gem,night:+(H.night&&H.night.k!=null?H.night.k:(window.__ht.NIGHT||{}).k||0).toFixed(2),mode:H.mode}});
    log(id,'during the job',before);
    /* Escape -> pause, Quit to title, confirm */
    await ev(()=>{window.__oldM=window.__ht.M});await p.keyboard.press('Escape');await p.waitForTimeout(300);
    let clicked=await ev(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&/quit to title/i.test(b.textContent));if(b){b.click();return true}return false});
    await p.waitForTimeout(300);
    const conf=await ev(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&/^quit to title$/i.test(b.textContent.trim())&&b.closest('.ht-dialog,[role=dialog],.dialog'));if(b){b.click();return true}return false});
    if(!clicked){log(id,'(no Quit button found: calling quitToTitle)');await ev(()=>window.__ht.quitToTitle())}
    await p.waitForTimeout(300);await ev(()=>window.__resume());await p.waitForTimeout(3000);/* real frames on the title */await ev(()=>{window.__rafOn=false});await p.waitForTimeout(200);
    if(process.argv.includes('--dbg'))log('dbg',await ev(()=>{const o=window.__oldM;const f0=JSON.stringify(HT.Jobs.stats.fired);let err=null;try{HT.Jobs.hooks.pose(.016)}catch(e){err=String(e)}return{f0,err,cleaned:!!o.cleaned,raf:window.__rafOn,pend:!!window.__rafPending}}));
    const after=await ev(()=>{const H=window.__ht;const gem=[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.offsetParent&&/^(Lit up|Dim|In shadow|Hidden)$/.test(e.textContent.trim())).map(e=>e.textContent.trim());
      const o=window.__oldM;return{gem,night:+(H.night&&H.night.k!=null?H.night.k:(window.__ht.NIGHT||{}).k||0).toFixed(2),mode:H.mode,screen:H.HUD.screen,M:!!H.M,old:o?{state:o.state,cleaned:!!o.cleaned,live:!!o.live}:null}});
    log(id,'on the title',after,{clicked,conf});await W.shot('quit-title-'+id);
    ok(after.mode==='title'&&!after.M,id+': back on the title screen',after);
    ok(!after.gem.length,id+': no stealth indicator left on the title ('+after.gem.join(',')+')');
    ok(after.night<.05,id+': daylight on the title (night '+after.night+')');
    /* back into a new game from the title: daylight, no leftovers */
    await p.click('.ht-title [data-act=newgame]',{timeout:5000}).catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(400);
    await ev(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&/start over|new game/i.test(b.textContent)&&b.closest('.ht-dialog,.dialog,[role=dialog]'));if(b)b.click()});await p.waitForTimeout(400);
    await step(10);const hub=await ev(()=>{const H=window.__ht;const gem=[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.offsetParent&&/^(Lit up|Dim|In shadow|Hidden)$/.test(e.textContent.trim())).map(e=>e.textContent.trim());return{mode:H.mode,gem,night:+((window.__ht.NIGHT||{}).k||0).toFixed(2)}});
    log(id,'new game after',hub);ok(hub.mode==='hub'&&!hub.gem.length&&hub.night<.05,id+': a new game after quitting is daylight with no job HUD left',hub)}
  require('fs').writeFileSync(__dirname+'/quit-title.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
