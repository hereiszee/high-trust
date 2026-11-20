/* Giver audit (QA): walks the story from a fresh save, finishing one job at a time in story order, and at every step lists the
   world givers in the hub: who stands where, which job each offers, and problems:
     - two givers on the same spot (< 1.2 m) or a giver inside a solid (collide() moves him) or inside a parked car
     - the same character visible twice at once (Dee, Earl, Dave, Doug...)
     - an unlocked, not-done job with no way to take it (no giver in the world and not a home job)
     - a dead end: nothing story-wise left to take while story jobs are still not done
   Trust per win: def.winTrust if set, else +16 Maple / +14 Riverside (index.html endMission); jobs with winTrust:0 give their own
   small steps in play, counted here as 0 (the conservative case).
   node dev/givers-audit.js [--json out.json]
   Exit code 1 on any problem. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs');
const OUT=(i=>i>0?process.argv[i+1]:null)(process.argv.indexOf('--json'));
(async()=>{const {b,p,errs}=await open();
  await p.click('.ht-title [data-act=newgame]').catch(()=>p.evaluate(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));
  await p.waitForTimeout(300);
  const rep=await p.evaluate(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);
    const MI=H.MISSIONS,J=H.jobs,s=J.api.SV(),steps=[],problems=[];let finaleAt=null;
    const jg=m=>{const P_=J.api.WORLD.places,f=m.from||{};if(f.place&&P_[f.place])return P_[f.place];if(f.x!=null)return f;if(f.tile)return{x:f.tile[0]*2+1,z:f.tile[1]*2+1};return P_['g_'+m.giver]||null};const giverOf=n=>{const m=n.marker&&MI[n.marker.i];return m?m.giver:n.id};
    const snap=label=>{if(H.mode!=='hub'){H.enterHub()}H.enterHub();H.step(3);
      const gs=H.npcs.filter(n=>n.marker).map(n=>{const m=MI[n.marker.i],q=new J.api.THREE.Vector3(n.pos.x,0,n.pos.z);J.api.collide(q,.3);
        const inCar=(J.api.L.cars||[]).filter(c=>c.pos&&Math.hypot(c.pos.x-n.pos.x,c.pos.z-n.pos.z)<2.2).map(c=>c.name||c.type);
        return{job:m.id,who:m.giver,x:+n.pos.x.toFixed(1),z:+n.pos.z.toFixed(1),lock:n.locked?n.lockTag||'locked':null,pushed:+q.distanceTo(n.pos).toFixed(2),inCar}});
      const avail=MI.map((m,i)=>({m,i})).filter(({m,i})=>!H.jobs.lock(m.id)&&(m.repeatable||!H.prog.done[i])).map(({m})=>m.id);
      const pr=[],queued=[];
      for(let a=0;a<gs.length;a++)for(let c=a+1;c<gs.length;c++){const A=gs[a],C=gs[c];if(Math.hypot(A.x-C.x,A.z-C.z)<1.2)pr.push('same spot: '+A.job+' & '+C.job+' at '+A.x+','+A.z);if(A.who===C.who)pr.push('two '+A.who+'s visible: '+A.job+' @'+A.x+','+A.z+' & '+C.job+' @'+C.x+','+C.z)}
      for(const g of gs){if(g.pushed>.05)pr.push(g.job+' giver inside a solid (pushed '+g.pushed+' m)');if(g.inCar.length)pr.push(g.job+' giver inside/at a parked car '+g.inCar.join(','))}
      for(const id of avail){const m=MI.find(x=>x.id===id);if(gs.some(g=>g.job===id))continue;if(m.from&&m.from.home)continue;
        const blocker=gs.find(g=>g.who===m.giver||Math.hypot(g.x-(jg(m)||{x:1e9}).x,g.z-(jg(m)||{z:1e9}).z)<1.5);if(blocker){queued.push(id+' waits for '+m.giver+"'s "+blocker.job);continue}pr.push('no giver for available '+id)}
      steps.push({queued,label,trust:Math.round(H.prog.trust),trustR:Math.round(H.prog.trustR||0),cuffed:H.prog.cuffed,avail,givers:gs,problems:pr});problems.push(...pr.map(x=>label+': '+x))};
    const finish=id=>{const i=MI.findIndex(m=>m.id===id),m=MI[i];H.prog.done[i]=true;if(s&&window.HT.Save.jobRec){const r=window.HT.Save.jobRec(s,id);r.done=true;r.runs=(r.runs||0)+1}
      const t=m.winTrust!=null?m.winTrust:m.hood==='river'?14:16;if(m.hood==='river')H.prog.trustR=Math.min(100,(H.prog.trustR||0)+t);else H.prog.trust=Math.min(100,H.prog.trust+t);
      if(H.prog.done[1]&&s&&s.flags){s.flags.act2Intro=true;H.prog.act=Math.max(H.prog.act||1,2)}
      /* the finale card fires once every built-in job is done: a player picks "Keep driving" (flags.finale2) */
      if(MI.every((m,k)=>m.reg||H.prog.done[k])&&s&&s.flags&&!s.flags.finale2){const left=MI.filter((m,k)=>m.reg&&!m.repeatable&&!H.prog.done[k]).map(m=>m.id);finaleAt={after:id,storyLeft:left};s.flags.finale2=true}};
    snap('fresh');
    for(let k=0;k<60;k++){const avail=steps[steps.length-1].avail.filter(id=>{const m=MI.find(x=>x.id===id);return!m.repeatable});
      const left=MI.filter((m,i)=>!m.repeatable&&!H.prog.done[i]).map(m=>m.id);if(!left.length)break;
      if(!avail.length){const why=left.map(id=>id+':'+H.jobs.lock(id));problems.push('DEAD END after '+steps[steps.length-1].label+': '+why.join(' '));
        /* what would open it: the cuffed gate is play-dependent, try it at 10 cuffs */if(H.prog.cuffed<10&&left.some(id=>/cuffed/.test(JSON.stringify((MI.find(x=>x.id===id).unlock)||{})))){H.prog.cuffed=10;snap('(cuffed 10)');continue}break}
      /* story order: the first available job by the hub's own order (built-ins in MISSIONS order, then registered by def.order) */
      const pickId=avail.sort((a,c)=>{const A=MI.find(x=>x.id===a),C=MI.find(x=>x.id===c);return(A.reg?1:0)-(C.reg?1:0)||((A.order||99)-(C.order||99))||MI.indexOf(A)-MI.indexOf(C)})[0];
      finish(pickId);snap('done '+pickId)}
    return{steps,problems,finaleAt,order:steps.map(s=>s.label)}});
  for(const st of rep.steps){console.log('-- '+st.label+'  trust '+st.trust+' / R '+st.trustR+'  avail: '+st.avail.join(' '));for(const g of st.givers)console.log('     '+g.who.padEnd(8)+g.job.padEnd(10)+' @'+g.x+','+g.z+(g.lock?' ['+g.lock+']':''));if(st.queued.length)console.log('   (one at a time: '+st.queued.join('; ')+')');for(const x of st.problems)console.log('   ! '+x)}
  if(rep.finaleAt)console.log('NOTE finale card after '+rep.finaleAt.after+' with story jobs left: '+rep.finaleAt.storyLeft.join(' '));
  if(OUT)fs.writeFileSync(OUT,JSON.stringify(rep,null,1));
  const bad=errs.filter(e=>!/favicon/.test(e));if(bad.length)console.log('console errors: '+bad.slice(0,5).join(' | '));
  console.log(rep.problems.length?rep.problems.length+' problems':'no problems');await b.close();process.exit(rep.problems.length||bad.length?1:0)})().catch(e=>{console.error(e);process.exit(1)});
