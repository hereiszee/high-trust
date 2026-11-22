/* Full story walk from a brand-new save, in the order the game itself offers jobs (the yellow marker = the first giver in the hub;
   home jobs only when nothing else is signposted, noted as such). Stepped time (paused rAF, __ht.step) for speed.
   Per step it records what the player is told (objective panel, marker, giver rings, locked tags), takes the job with a REAL 'E'
   key press at the giver, accepts the brief, drives the van into the ring (route bot), completes the job:
     registered jobs: the job's own scripted player (test.step), with finish(true) as a fallback (noted);
     built-in jobs (the nine originals): endMission(true) via __ht.jobs.finish (base trust only, no in-job zip-ties: the lethal case)
   then reads the result card, trust/cash/day deltas and any card that follows (Act 2, the "one month later" ending...).
   node dev/audit/playthrough/story-walk.js [--json out.json] [--max 45] [--builtin-bot]
*/
const {open}=require('./lib.js'),fs=require('fs'),path=require('path');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d};
const OUT=arg('json',path.join(__dirname,'../../../docs/audit/playthrough/story-walk.json')),MAX=+arg('max',45);
const L=[];const log=(...a)=>{const s=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ');L.push(s);console.log(s)};
(async()=>{const r=await open({fresh:true}),{p,b,errs}=r,ev=r.ev;
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(400);
  await p.evaluate(async()=>{await window.__ht.jobs.ready});
  await ev(()=>{const H=window.__ht,k=H.keys,T=window.__W={};
    T.hubState=()=>{const MI=H.MISSIONS,J=H.jobs;H.step(4);try{H.draw()}catch(e){}
      const givers=H.npcs.filter(n=>n.marker).map(n=>({id:MI[n.marker.i].id,who:n.id,x:+n.pos.x.toFixed(1),z:+n.pos.z.toFixed(1),lock:n.lockTag||null}));
      const avail=MI.map((m,i)=>({m,i})).filter(({m,i})=>!J.lock(m.id)&&(m.repeatable||!H.prog.done[i])).map(({m})=>m.id);
      const locked=MI.map((m,i)=>({m,i})).filter(({m,i})=>J.lock(m.id)&&!H.prog.done[i]).map(({m})=>m.id+':'+J.lock(m.id));
      const home=MI.filter((m,i)=>m.from&&m.from.home&&!J.lock(m.id)&&(m.repeatable||!H.prog.done[i])).map(m=>m.id+'@'+m.from.home);
      return{mode:H.mode,screen:H.HUD.screen,obj:H.UIobj?[H.UIobj.title,...H.UIobj.lines.map(l=>l.text)]:null,marker:H.marker?{label:H.marker.label,x:+H.marker.x.toFixed(1),z:+H.marker.z.toFixed(1)}:null,
        givers,avail,locked,home,trust:+H.prog.trust.toFixed(1),trustR:+(H.prog.trustR||0).toFixed(1),cuffed:H.prog.cuffed,act:H.prog.act,day:(HT.Save.data||{}).day,cash:(HT.Save.data||{}).cash,
        bridge:!!(H.WORLD&&H.WORLD.bridgeOpen),fin:H.finaleInfo(),tie:H.tieGoal(),done:MI.filter((m,i)=>H.prog.done[i]).map(m=>m.id)}};
    T.screenText=()=>{const s=H.HUD.screen;if(!s)return null;const el=[...document.querySelectorAll('.ht-result,.ht-brief,.ht-scr')].filter(e=>e.offsetParent!==null).pop();return{screen:s,text:el?el.textContent.replace(/\s+/g,' ').trim().slice(0,900):null,acts:Object.keys(H.UIacts||{})}};
    T.toGiver=i=>{const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return null;if(H.CV)H.exitVehicle();H.P.pos.set(n.pos.x+1.6,0,n.pos.z);H.collide(H.P.pos,.35);H.step(2);return{d:+Math.hypot(n.pos.x-H.P.pos.x,n.pos.z-H.P.pos.z).toFixed(2),prompt:H.prompt}};
    T.drive=(tgt,steps)=>{const G=H.ow.roads(),e=H.CV;if(!e)return{err:'not driving'};let route=G.route({x:e.pos.x,z:e.pos.z},tgt),pts=route?route.points:[tgt],wi=1,s=0,stuck=0;
      for(;s<steps;s++){const d0=Math.hypot(tgt.x-e.pos.x,tgt.z-e.pos.z);if(H.mode!=='hub')break;
        while(wi<pts.length-1&&Math.hypot(pts[wi].x-e.pos.x,pts[wi].z-e.pos.z)<6)wi++;const w=d0<12?tgt:pts[Math.min(wi,pts.length-1)];
        const dx=w.x-e.pos.x,dz=w.z-e.pos.z;let d=Math.atan2(-dx,-dz)-e.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;
        const want=d0<12?Math.max(1.5,d0*.4):Math.abs(d)>.5?7:13;k.a=d>.05;k.d=d<-.05;k.w=e.spd<want;k.s=e.spd>want+2;
        if(Math.abs(e.spd)<.5){stuck++;if(stuck>90){stuck=0;const q=pts[Math.min(wi+1,pts.length-1)];e.pos.set(q.x,0,q.z);H.syncVan&&H.syncVan()}}else stuck=0;H.step(1)}
      for(const x of['w','a','s','d'])k[x]=false;return{steps:s,mode:H.mode,d:+Math.hypot(tgt.x-e.pos.x,tgt.z-e.pos.z).toFixed(1)}};
    T.toRing=i=>{const d=H.L.dests[i],G=H.ow.roads(),V=H.VAN;if(!d)return{err:'no dest ring for job '+i};if(H.CV)H.exitVehicle();const rr=G.nearestRoad(d.x,d.z),A_=G.nodes[rr.a],B_=G.nodes[rr.b];
      const far=Math.hypot(A_.x-d.x,A_.z-d.z)>Math.hypot(B_.x-d.x,B_.z-d.z)?A_:B_;V.pos.set(far.x,0,far.z);V.yaw=Math.atan2(-(d.x-far.x),-(d.z-far.z));V.spd=0;if(V.car)V.car.spd=0;H.syncVan();
      H.P.pos.set(far.x+2.5,0,far.z);H.enterVan();H.step(2);/* the crew must ride along */for(const a of H.allies){a.ride=true;if(a.dude)a.dude.root.visible=false}const mk=H.marker;return Object.assign(T.drive({x:d.x,z:d.z},2400),{dest:{x:+d.x.toFixed(1),z:+d.z.toFixed(1)},markerWhileDriving:mk&&mk.label})};
    T.play=(id,max)=>{const j=H.jobs.registry.get(id),a=H.jobs.api;let t=0;for(;t<max&&H.M&&H.M.state==='go';t++){if(j&&j.test&&j.test.step)j.test.step(a,t,{});H.P.hp=Math.max(H.P.hp,60);H.step(1)}
      for(const x of['w','a','s','d','e'])k[x]=false;return{t,state:H.M&&H.M.state,stage:H.M&&H.M.stage}}});
  const steps=[],jobsLog=[],problems=[];const prob=(s)=>{problems.push(s);log('  ! '+s)};
  const settle=async()=>{/* close cards that follow a job / the Act 2 beat; record their text */const cards=[];for(let k=0;k<6;k++){await p.waitForTimeout(2200);const s=await ev(()=>window.__W.screenText());if(!s)break;cards.push(s);
      const go=s.acts.find(a=>a==='result:go')||s.acts.find(a=>/close|go$/.test(a));if(!go)break;await ev(a=>{const H=window.__ht;H.UIacts[a]();H.step(2)},go)}
    await ev(()=>{const H=window.__ht;if(H.mode==='home'){H.exitHome('front');H.step(3)}if(H.mode!=='hub'){H.enterHub();H.step(2)}if(H.HUD.screen&&H.HUD.screen!=='pause'){try{H.HUD.hide(H.HUD.screen)}catch(e){}}H.running=true});return cards};
  let cards=await settle();if(cards.length)log('cards at start',cards);
  for(let k=0;k<MAX;k++){
    const st=await ev(()=>window.__W.hubState());steps.push(st);
    const storyLeft=(await ev(()=>window.__ht.MISSIONS.filter((m,i)=>!m.repeatable&&!window.__ht.prog.done[i]).map(m=>m.id)));
    log('\n== step '+k+'  trust '+st.trust+' / R '+st.trustR+'  cuffed '+st.cuffed+'  day '+st.day+'  cash '+st.cash+'  act '+st.act+'  bridge '+st.bridge);
    log('   OBJECTIVE: '+(st.obj||[]).join(' | '));log('   MARKER: '+JSON.stringify(st.marker));
    log('   givers: '+st.givers.map(g=>g.who+':'+g.id+'@'+g.x+','+g.z+(g.lock?'['+g.lock+']':'')).join('  '));
    log('   available: '+st.avail.join(' ')+'   home: '+st.home.join(' '));log('   locked: '+st.locked.join(' '));
    /* checks */
    for(let a=0;a<st.givers.length;a++)for(let c=a+1;c<st.givers.length;c++){const A=st.givers[a],C=st.givers[c];if(Math.hypot(A.x-C.x,A.z-C.z)<2)prob('step '+k+': givers stacked: '+A.id+' & '+C.id+' at '+A.x+','+A.z);if(A.who===C.who)prob('step '+k+': '+A.who+' twice: '+A.id+' & '+C.id)}
    const storyAvail=st.avail.filter(id=>storyLeft.includes(id));
    const hidden=storyAvail.filter(id=>!st.givers.some(g=>g.id===id)&&!st.home.some(h=>h.startsWith(id+'@')));if(hidden.length)log('   (available story jobs with no giver standing right now: '+hidden.join(' ')+')');
    const homeStory=st.home.filter(h=>storyLeft.includes(h.split('@')[0]));
    for(const h of homeStory){const id=h.split('@')[0];const said=(st.obj||[]).some(l=>new RegExp(id==='taxi'?'Jen|fridge|list|Taxi':id==='finale'?'family|festival|home':id,'i').test(l));if(!said)log('   NOTE home story job '+h+' is available but the objective panel does not mention it')}
    if(!storyLeft.length){log('ALL STORY JOBS DONE');}
    /* choose: the marker's giver; else a home story job; else a repeatable (to show what's offered); else dead end */
    let pick=null,how=null;
    if(st.marker){const g=st.givers.find(g=>Math.hypot(g.x-st.marker.x,g.z-st.marker.z)<1)||null;if(g&&!g.lock){pick=g.id;how='marker'}else if(g&&g.lock)log('   marker points at a LOCKED giver '+g.id+' ['+g.lock+']');else if(/Home/.test(st.marker.label||'')){const f=st.home.find(h=>h.startsWith('finale@'));if(f){pick='finale';how='marker-home'}}}
    if(pick){const m=await ev(id=>{const MI=window.__ht.MISSIONS;return MI.find(x=>x.id===id)},pick);if(m.repeatable&&storyAvail.length){/* a repeatable is first in line while story jobs wait: note it, take the story job the panel lists */
        log('   marker points at a REPEATABLE ('+pick+') while story jobs are available: '+storyAvail.join(' '));const g2=st.givers.find(g=>storyAvail.includes(g.id)&&!g.lock);if(g2){pick=g2.id;how='giver-list'}else pick=null}}
    if(!pick&&homeStory.length){pick=homeStory[0].split('@')[0];how='home (not signposted by the marker)'}
    if(!pick&&storyLeft.length){const why=await ev(ids=>ids.map(id=>id+':'+window.__ht.jobs.lock(id)),storyLeft);prob('DEAD END at step '+k+': story jobs left '+why.join(' '));
      if(st.cuffed<10&&storyLeft.includes('talk')){log('   forcing cuffed=10 (the zip-tie gate) to continue');await ev(()=>{window.__ht.prog.cuffed=10;window.__ht.enterHub()});continue}
      break}
    if(!pick){log('nothing left to pick');break}
    log('-> TAKE '+pick+' ('+how+')');
    const before=await ev(()=>{const H=window.__ht;return{t:H.prog.trust,r:H.prog.trustR||0,cash:(HT.Save.data||{}).cash,cuffed:H.prog.cuffed,day:(HT.Save.data||{}).day}});
    const idx=await ev(id=>window.__ht.jobs.index(id),pick);
    await p.evaluate(async id=>{const H=window.__ht,pm=window.HT&&HT.People;if(pm&&pm.preload)await Promise.race([pm.preload(H.jobs.castKeys(id)).catch(()=>{}),new Promise(r=>setTimeout(r,25000))])},pick);
    let brief=null;
    if(how.startsWith('home')||how==='marker-home'){const hm=await ev(id=>window.__ht.MISSIONS.find(m=>m.id===id).from.home,pick);
      await ev(()=>window.__ht.enterHome());await p.waitForFunction(()=>window.__ht.mode==='home',null,{timeout:60000}).catch(()=>{});
      const homeObj=await ev(()=>{const H=window.__ht;H.step(3);return H.UIobj?[H.UIobj.title,...H.UIobj.lines.map(l=>l.text)]:null});log('   home objective: '+JSON.stringify(homeObj));
      await ev(h=>{const H=window.__ht;H.jobs.homeUse(h);H.step(1)},hm);brief=await ev(()=>window.__W.screenText());
      if(!brief||!brief.acts.includes('brief:go')){prob('home giver '+hm+' did not offer '+pick+' '+JSON.stringify(brief));break}
      if(pick==='finale'){log('   FINALE brief: '+brief.text);jobsLog.push({id:pick,brief:brief.text});break}
      await ev(()=>{const H=window.__ht;H.UIacts['brief:go']();H.step(2);H.exitHome('front');H.step(3)})}
    else{const g=await ev(i=>window.__W.toGiver(i),idx);await p.keyboard.press('e');await ev(()=>window.__ht.step(2));brief=await ev(()=>window.__W.screenText());
      if(!brief||!brief.acts.includes('brief:go')){prob('E at the giver of '+pick+' did not open a brief ('+JSON.stringify(g)+' '+JSON.stringify(brief)+')');
        await ev(i=>{const H=window.__ht;H.use=true;H.step(1)},idx);brief=await ev(()=>window.__W.screenText());if(!brief||!brief.acts.includes('brief:go'))break}
      await ev(()=>{const H=window.__ht;H.UIacts['brief:go']();H.step(2)})}
    const accepted=await ev(()=>{const H=window.__ht;H.step(2);return{job:H.JOB,obj:H.UIobj?[H.UIobj.title,...H.UIobj.lines.map(l=>l.text)]:null,marker:H.marker&&H.marker.label,screen:H.HUD.screen}});
    log('   accepted: '+JSON.stringify(accepted));
    if(accepted.screen){const s=await ev(()=>window.__W.screenText());log('   a screen is open after accepting: '+JSON.stringify(s));}
    let dr=await ev(i=>window.__W.toRing(i),idx);
    if(dr.mode==='hub'){dr=Object.assign(dr,await p.evaluate(async()=>{const H=window.__ht;const w=H.jobs.castWait;if(w)await Promise.race([w,new Promise(r=>setTimeout(r,30000))]);H.step(3);return{mode:H.mode,waited:!!w}}))}
    log('   drive: '+JSON.stringify(dr));
    if(dr.mode!=='mission'){prob(pick+': driving into the ring did not start the job '+JSON.stringify(dr));const f=await ev(id=>{window.__ht.jobs.start(id);return window.__ht.mode},pick);await p.evaluate(async()=>{const w=window.__ht.jobs.castWait;if(w)await w;window.__ht.step(2)});}
    const mObj=await ev(()=>{const H=window.__ht;H.step(3);return H.UIobj?[H.UIobj.title,...H.UIobj.lines.map(l=>l.text)]:null});log('   job objective: '+JSON.stringify(mObj));
    const reg=await ev(id=>{const j=window.__ht.jobs.registry.get(id);return!!(j&&!j.builtin&&j.test&&j.test.step)},pick);let play=null,how2;
    if(reg){play=await ev(id=>window.__W.play(id,14000),pick);how2='bot'}
    if(!play||play.state!=='won'){if(play)log('   bot result '+JSON.stringify(play)+' -> finish(true)');await ev(()=>{const H=window.__ht;if(H.M&&H.M.state==='go')H.jobs.finish(true);H.step(2)});how2=reg?'bot failed, finish(true)':'finish(true)'}
    await ev(()=>window.__ht.step(40));await p.waitForTimeout(600);
    const res=await ev(()=>{const H=window.__ht,el=[...document.querySelectorAll('.ht-result')].filter(e=>e.offsetParent!==null).pop();return{state:H.M&&H.M.state,pay:H.M&&H.M.pay?H.M.pay.total:null,lines:H.M&&H.M.pay?H.M.pay.lines.map(l=>l.label+':'+l.amount):null,trustGain:H.M&&H.M.trustGain,medal:H.M&&H.M.medal,card:el?el.textContent.replace(/\s+/g,' ').trim().slice(0,500):null}});
    cards=await settle();
    const after=await ev(()=>{const H=window.__ht;return{t:H.prog.trust,r:H.prog.trustR||0,cash:(HT.Save.data||{}).cash,cuffed:H.prog.cuffed,day:(HT.Save.data||{}).day,done:H.jobs.lock?null:null}});
    const rec={id:pick,how,complete:how2,dT:+(after.t-before.t).toFixed(1),dR:+(after.r-before.r).toFixed(1),cash:after.cash-before.cash,dCuffed:after.cuffed-before.cuffed,day:[before.day,after.day],pay:res.pay,state:res.state,medal:res.medal,cards:cards.map(c=>c.text&&c.text.slice(0,300))};
    jobsLog.push(rec);log('   RESULT '+JSON.stringify(rec));if(res.state!=='won')prob(pick+' did not end won: '+res.state);
    fs.writeFileSync(OUT,JSON.stringify({steps,jobs:jobsLog,problems},null,1))}
  const bad=errs.filter(e=>!/favicon/.test(e));log('\nconsole errors: '+bad.length+' '+bad.slice(0,8).join(' | '));
  log('\nJOBS: '+jobsLog.map(j=>j.id+'(M'+j.dT+' R'+j.dR+')').join(' '));log('problems: '+problems.length);problems.forEach(x=>log(' - '+x));
  fs.writeFileSync(OUT,JSON.stringify({steps,jobs:jobsLog,problems,errs:bad},null,1));fs.writeFileSync(OUT.replace(/\.json$/,'.txt'),L.join('\n'));await b.close()})().catch(e=>{console.error(e);fs.writeFileSync(OUT.replace(/\.json$/,'.txt'),L.join('\n')+'\nCRASH '+e.stack);process.exit(1)});
