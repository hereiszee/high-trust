/* The Grass Is Greener: play the whole mission by script at the game's own pace and log what happens (stage, laps, positions,
   the pit choice, the chase, the finish), with screenshots of every stage under docs/screenshots/jobs/mower/.
   node dev/jobs/mower.js [--keep] [--shots] [--tt] [--seed=n]
     --keep   keep racing past Marcus (the other branch)     --tt   play the repeatable time trial (mowertt) instead
   Uses the job's own scripted player (test.step) but steps the game frame by frame, so every timing below is in-game seconds. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const has=k=>process.argv.includes('--'+k),SHOTS=has('shots'),TT=has('tt'),ID=TT?'mowertt':'mower',DIR=path.join(__dirname,'../../docs/screenshots/jobs/mower');
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});const ev=(f,a)=>p.evaluate(f,a);let n=0;
  const shot=async(name)=>{if(!SHOTS)return;fs.mkdirSync(DIR,{recursive:true});await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(700);
    await ev(()=>{window.__rafOn=false});await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(DIR,(TT?'tt-':'')+String(++n).padStart(2,'0')+'-'+name+'.jpg'),type:'jpeg',quality:84});console.log('     shot '+name)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>{});await p.waitForTimeout(300);
  await ev(async id=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get(id);for(const d of[].concat(j.def.unlock.done||[])){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true;const s=H.jobs.api.SV();if(s)HT.Save.jobRec(s,d).done=true}
    H.jobs.start(id);H.step(3)},ID);
  const st=()=>ev(()=>{const H=window.__ht,M=H.M;if(!M)return{mode:H.mode};const me=M.me,R=M.R;return{mode:H.mode,state:M.state,phase:M.phase,stage:M.stage,t:+M.elapsed.toFixed(1),
    lap:me?me.lap:null,pos:R&&me?R.pos(me):null,q:M.qTime,bumps:M.bumps,choice:M.choice,cuffed:M.cuffedN,esc:M.escN,place:M.place,hp:M.ride&&M.ride.car?Math.round(M.ride.car.hp):null,
    order:R?R.order().map(r=>r.id+(r.finished?'*':'')).join(' '):'',mem:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):0,best:R?R.racers.map(r=>r.id+':'+(r.best||0).toFixed(1)+(r.stuckT>0?'!':'')).join(' '):''}});
  const step=(frames,o)=>ev(([f,o,id])=>{const H=window.__ht,j=H.jobs.registry.get(id),a=H.jobs.api;let t=window.__t||0;for(let i=0;i<f&&H.M&&H.M.state==='go';i++){j.test.step(a,t++,o);H.P.hp=Math.max(H.P.hp,60);H.step(1)}window.__t=t;return t},[frames,o,ID]);
  const sk=(process.argv.find(a=>a.startsWith('--skill='))||'').split('=')[1];const o={keep:has('keep'),skill:sk?+sk:undefined};let last='',shotsDone={};const want={pick:'pick',toLine:'ride-out',quali:'qualifying',qdone:'qualified',count:'grid-countdown',race:'race',fix:'pit-stop',chase:'chase',back:'back-on',finish:'finish',podium:'podium'};
  for(let k=0;k<1400;k++){await step(10,o);const s=await st();const key=s.phase+'|'+s.lap+'|'+s.pos+'|'+s.choice+'|'+s.cuffed;if(key!==last){last=key;console.log(JSON.stringify(s))}
    if(s.phase&&want[s.phase]&&!shotsDone[s.phase]){shotsDone[s.phase]=1;if(s.phase==='race'||s.phase==='podium'||s.phase==='chase'||s.phase==='quali')await step(s.phase==='race'?45:s.phase==='quali'?140:60,o);await shot(want[s.phase])}
    if(s.phase==='finish'&&!shotsDone.top){shotsDone.top=1;await ev(()=>{window.__ht.M.shotCam=[92,34,150,92,0,115,55]});await shot('stripes-overhead');await ev(()=>{window.__ht.M.shotCam=null})}
    if(s.phase==='race'&&s.lap===1&&!shotsDone.race2){shotsDone.race2=1;await step(70,o);await shot('race-lap2')}
    if(s.state!=='go')break}
  await ev(()=>window.__ht.step(45));const res=await ev(()=>{const H=window.__ht;return{state:H.M&&H.M.state,pay:H.M&&H.M.pay?H.M.pay.lines.map(l=>l.label+':'+l.amount):null,total:H.M&&H.M.pay&&H.M.pay.total,medal:H.M&&H.M.medal}});
  console.log('result',JSON.stringify(res),JSON.stringify(await ev(()=>({frames:window.__t,el:window.__ht.M&&window.__ht.M.elapsed,screen:window.__ht.HUD&&window.__ht.HUD.screen,phase:window.__ht.M&&window.__ht.M.phase}))));await shot('result-card');
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'console errors: '+bad.slice(0,6).join(' | '):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
