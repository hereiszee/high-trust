/* Story guidance in the hub (playthrough audit PT-01..PT-07), stepped time, one browser.
   At every point of the story order (SPEC3 3.1) it checks that the yellow marker and the first objective line lead to the next
   STORY job (a giver in the world, or home for Jen's list), never to a repeatable or a locked giver while a story job is open,
   and that every open story job has a giver (or a home prompt). Then the specific cases:
     PT-01 Dad Taxi: objective line, marker home, the fridge prompt names it, E there opens its brief; "n left: ..." when few remain
     PT-03 a job taken at home: the panel shows that job only
     PT-04 two open jobs on one giver's spot: the giver offers both (a choice on the brief); a locked job never hides an open one
     PT-05 "in Riverside Flats" only for givers who stand there
     PT-06 the locked-giver line names things that exist
     PT-07 the Act 3 card after the Duke, prog.act 3
   node dev/guidance.e2e.js [--shots]   (screenshots to docs/audit/playthrough/guidance-*.jpg) */
const {open}=require('./ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const SHOTS=process.argv.includes('--shots'),DIR=path.join(__dirname,'../docs/audit/playthrough');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
const ORDER=['gary','taxi','rick','hoa','earl','mower','dave','tail','doug','dee','crossing','tow','rosa','overwatch','pawn','moving','benny','cones','cargo','duke','talk','sabotage','brake','bike','roundup','arrest','heist'];
(async()=>{const {b,p,errs}=await open({init:()=>{if(!sessionStorage.getItem('s')){sessionStorage.setItem('s','1');localStorage.clear()}}});const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(600);await p.evaluate(async()=>{await window.__ht.jobs.ready});
  await ev(()=>{window.__rafOn=false;const H=window.__ht,T=window.__G={};
    /* a save with exactly these story jobs done; trust as a player who played them would have it */
    T.set=(ids,o={})=>{const S=HT.Save,s=S.data;H.prog.done.fill(false);s.jobs={};for(const id of ids){const i=H.jobs.index(id);if(i>=0)H.prog.done[i]=true;S.jobRec(s,id).done=true}
      s.flags.act2Intro=true;s.flags.act3Intro=o.card?false:true;s.flags.finale2=ids.length>1;/* the old ending is retired once any job file has run (finale.js retireOld) */H.WM.beat=true;H.WM.beat3=!o.card;H.prog.act=1;if(s.world)s.world.bridgeOpen=ids.includes('rick');
      H.prog.trust=o.trust!=null?o.trust:Math.min(100,12+ids.length*6);H.prog.trustR=o.trustR!=null?o.trustR:Math.min(100,5+ids.length*7);H.prog.cuffed=o.cuffed!=null?o.cuffed:ids.length*2;
      if(H.HUD.screen)H.HUD.hide(H.HUD.screen);H.enterHub();H.step(3);H.running=true;if(o.at)H.P.pos.set(o.at.x,0,o.at.z);H.step(3);return T.state()};
    T.state=()=>{const MI=H.MISSIONS,mk=H.marker,n=mk?H.npcs.find(n=>Math.hypot(n.pos.x-mk.x,n.pos.z-mk.z)<.6):null;
      return{obj:H.UIobj?[H.UIobj.title,...H.UIobj.lines.map(l=>l.text)]:[],marker:mk?{label:mk.label,x:+mk.x.toFixed(1),z:+mk.z.toFixed(1)}:null,
        lead:n?{who:n.id,jobs:(n.jobs||[]).map(i=>MI[i].id),locked:!!n.locked,repeat:(n.jobs||[]).every(i=>MI[i].repeatable)}:null,
        givers:H.npcs.filter(n=>n.marker).map(n=>({who:n.id,name:H.jobs.api.HOMIES[n.id].name,x:+n.pos.x.toFixed(1),z:+n.pos.z.toFixed(1),jobs:(n.jobs||[]).map(i=>MI[i].id),locked:n.locked||null,tag:n.lockTag||null,first:MI[n.marker.i].id,region:HT.WorldGen.regionAt(n.pos.x,n.pos.z)})),
        openStory:MI.map((m,i)=>({m,i})).filter(({m,i})=>!m.repeatable&&!H.prog.done[i]&&m.id!=='finale'&&!H.jobs.lock(m.id)).map(({m})=>m.id),
        home:MI.filter((m,i)=>m.from&&m.from.home&&m.from.home!=='family'&&!m.repeatable&&!H.prog.done[i]&&!H.jobs.lock(m.id)).map(m=>m.id),
        act:H.prog.act,screen:H.HUD.screen}};
    T.shotPrep=keep=>{if(!keep){if(H.HUD.screen)H.HUD.hide(H.HUD.screen);H.running=true}}});
  const set=(ids,o)=>ev(([ids,o])=>window.__G.set(ids,o||{}),[ids,o]);
  const shot=async(n,keep)=>{if(!SHOTS)return;await ev(k=>window.__G.shotPrep(k),!!keep);await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(2500);
    fs.mkdirSync(DIR,{recursive:true});await p.screenshot({path:path.join(DIR,'guidance-'+n+'.jpg'),type:'jpeg',quality:82,timeout:120000}).catch(e=>console.log('shot fail '+e.message));await ev(()=>{window.__rafOn=false})};

  /* 1. every point of the story: the lead is the next story job */
  for(let k=1;k<ORDER.length;k++){const done=ORDER.slice(0,k);
    const st=await set(done);const next=ORDER.slice(k).find(id=>st.openStory.includes(id));const tag='after '+done[done.length-1]+':';
    if(!next){ok(!st.openStory.length,tag+' no story job open '+JSON.stringify(st.openStory));continue}
    const nextHome=st.home.includes(next);
    if(nextHome)ok(st.marker&&/^Home/.test(st.marker.label)&&/list on the fridge|at home/.test(st.obj[1]||''),tag+' next is '+next+' (home): marker home, first line says so · '+JSON.stringify(st.marker)+' '+st.obj[1]);
    else ok(st.lead&&!st.lead.locked&&!st.lead.repeat&&st.lead.jobs.includes(next)&&(st.obj[1]||'').startsWith(st.givers.find(g=>g.jobs.includes(next)).name),tag+' next is '+next+': marker on its giver, first line names them · '+JSON.stringify(st.lead)+' | '+st.obj[1]);
    const hidden=st.openStory.filter(id=>!st.home.includes(id)&&!st.givers.some(g=>g.jobs.includes(id)));ok(!hidden.length,tag+' every open story job has a giver ('+hidden.join(' ')+')');
    const twice=st.givers.filter((g,j)=>st.givers.some((o,k)=>k<j&&o.who===g.who));ok(!twice.length,tag+' every character stands in one place ('+twice.map(g=>g.who).join(' ')+')');
    const lockedHides=st.givers.filter(g=>g.locked&&st.openStory.some(id=>g.jobs.includes(id)));ok(!lockedHides.length,tag+' no locked giver holds an open job');
    /* walk up to the nearest side-job giver: the marker stays on the story */
    const sideG=st.givers.find(g=>g.jobs.length&&g.jobs.every(id=>!ORDER.includes(id)));
    if(sideG){const s2=await ev(g=>{const H=window.__ht;H.P.pos.set(g.x+2,0,g.z);H.step(3);return window.__G.state()},sideG);ok(s2.marker&&(nextHome?/^Home/.test(s2.marker.label):s2.lead&&s2.lead.jobs.includes(next)),tag+' standing at side giver '+sideG.name+' ('+sideG.jobs+'): marker still on '+next+' · '+JSON.stringify(s2.marker))}
    if(SHOTS&&[1,2,6,17,19].includes(k))await shot('step'+k+'-'+next)}

  /* 2. PT-01 + PT-03: Dad Taxi from the fridge */
  let st=await set(['gary']);ok(st.marker&&st.marker.label==='Home · Dad Taxi','after job 1 the marker is on home for Dad Taxi '+JSON.stringify(st.marker));
  ok(/Jen left you a list on the fridge at home · Dad Taxi/.test(st.obj[1]),'first objective line: '+st.obj[1]);
  const home=await p.evaluate(async()=>{const H=window.__ht;H.enterHome();for(let i=0;i<300&&H.mode!=='home';i++)await new Promise(r=>setTimeout(r,100));H.step(3);
    const f=H.home.interactables.find(i=>i.id==='fridge'),c=H.home.interactables.find(i=>i.id==='calendar');const pr=[];
    for(const it of[f,c]){H.P.pos.set(it.x+.15,0,it.z+.15);H.step(2);pr.push(H.prompt&&H.prompt.text)}
    return{obj:[H.UIobj.title,...H.UIobj.lines.map(l=>l.text)],pr}});
  ok(home.pr.every(t=>/Jen's list · Dad Taxi/.test(t||'')),'at the fridge and the calendar next to it the prompt names the job '+JSON.stringify(home.pr));
  ok(home.obj.some(l=>/Dad Taxi: Jen's list is on the fridge/.test(l)),'home objective names the list '+JSON.stringify(home.obj));
  await shot('home-fridge');
  await ev(()=>{const H=window.__ht;const f=H.home.interactables.find(i=>i.id==='fridge');H.P.pos.set(f.x+.15,0,f.z+.15);H.running=true;H.step(2)});await p.keyboard.press('e');await ev(()=>window.__ht.step(2));
  const br=await ev(()=>{const H=window.__ht,e=document.querySelector('.ht-brief');return{screen:H.HUD.screen,title:e&&e.querySelector('h2')&&e.querySelector('h2').textContent,acts:Object.keys(H.UIacts||{})}});
  ok(br.screen==='brief'&&br.title==='Dad Taxi','a real E at the fridge opens the Dad Taxi brief '+JSON.stringify(br));
  if(br.acts.includes('brief:go')){const af=await ev(()=>{const H=window.__ht;H.UIacts['brief:go']();H.step(2);H.exitHome('front');H.step(90);return{job:H.JOB,obj:[H.UIobj.title,...H.UIobj.lines.map(l=>l.text)],marker:H.marker&&H.marker.label}});
    ok(af.obj[0]==='Dad Taxi'&&af.obj.length===3&&/minivan/.test(af.obj[1]),'PT-03: after taking it at home the panel shows that job only '+JSON.stringify(af));await shot('taxi-accepted')}

  /* 3. PT-04: Earl's spot while the Duke waits on Maple; Dave's spot with two jobs, a choice on the brief */
  st=await set(ORDER.filter(id=>!['doug','cones','cargo','duke','talk','sabotage','brake','bike','roundup','arrest','heist'].includes(id)),{trustR:70});
  const earl=st.givers.find(g=>g.who==='earl');ok(earl&&!earl.locked&&earl.jobs.includes('cones'),'Cone Zone is offered at Earl\'s spot while the Duke is locked '+JSON.stringify(earl));
  st=await set(['gary','taxi','rick','hoa','earl']);const dave=st.givers.find(g=>g.who==='dave');ok(dave&&dave.jobs.length===2&&dave.jobs.includes('dave')&&dave.jobs.includes('mower'),'Big Dave offers both of his open jobs '+JSON.stringify(dave));
  if(dave){const ch=await ev(g=>{const H=window.__ht;H.P.pos.set(g.x+1.6,0,g.z);H.step(2);const pr=H.prompt&&H.prompt.text;H.use=true;H.step(1);const e=document.querySelector('.ht-brief');
      const t1=e&&e.querySelector('h2').textContent,btns=e?[...e.querySelectorAll('.ht-jobs [data-act]')].map(b=>b.textContent):[];return{pr,t1,btns}},dave);
    ok(ch.btns.length===2&&/2 jobs/.test(ch.pr||''),'the brief lists both jobs and the prompt says so '+JSON.stringify(ch));
    await shot('dave-choice',true);
    const other=await p.evaluate(async()=>{const b=[...document.querySelectorAll('.ht-brief .ht-jobs [data-act]')].find(b=>b.getAttribute('aria-pressed')!=='true');b.click();await new Promise(r=>setTimeout(r,400));const h=[...document.querySelectorAll('.ht-brief h2')].pop();return h&&h.textContent});
    ok(other&&other!==ch.t1,'clicking the other job switches the brief ('+ch.t1+' -> '+other+')');await ev(()=>{const H=window.__ht;H.UIacts['brief:no']();H.step(1)})}

  /* 4. PT-05: Handle With Care / Higher Ground / Brake Check givers stand in Maple */
  for(const [ids,who] of [[['gary','taxi','rick','hoa','earl','mower','dave','tail','doug','dee','crossing','tow','rosa','overwatch','pawn','moving','benny','cones'],'Big Dave'],[['gary','taxi','rick','hoa','earl','mower','dave','tail','doug','dee','crossing','tow','rosa'],'Doug'],[ORDER.slice(0,ORDER.indexOf('brake')),'Coach Rick']]){
    st=await set(ids);const g=st.givers.find(g=>g.name===who);const line=st.obj.find(l=>l.startsWith(who+' has'));
    ok(g&&line&&(g.region==='river')===/Riverside Flats/.test(line),who+' stands in '+(g&&g.region)+': "'+line+'"')}

  /* 5. PT-06: a Riverside giver under his trust gate */
  st=await set(['gary','taxi','rick','hoa','earl'],{trustR:10});const dee=st.givers.find(g=>g.who==='dee');
  ok(dee&&dee.locked&&!/Scrub a wall|Wave at people/.test(dee.locked)&&/Hank|zip-tie/.test(dee.locked),'locked Dee says something true: '+(dee&&dee.locked));

  /* 6. PT-01: the finale line names what's left */
  st=await set(ORDER.filter(id=>id!=='taxi'&&id!=='bike'),{trust:85,trustR:85});
  ok(st.obj.some(l=>l==='2 left: Dad Taxi (home), Chain Reaction (Tyler, after Dad Taxi)'),'finale: "2 left" line '+JSON.stringify(st.obj));
  ok(st.marker&&st.marker.label==='Home · Dad Taxi','25 of 27: the marker goes home for Dad Taxi '+JSON.stringify(st.marker));await shot('finale-2-left');
  st=await set(ORDER,{trust:85,trustR:85});ok(st.marker&&st.marker.label==='Home · the family'&&st.obj[1]==='The festival: go home and talk to the family','all done: festival line first, marker home '+JSON.stringify(st.marker)+' '+st.obj[1]);

  /* 7. PT-07: the Act 3 card after the Duke */
  st=await set(ORDER.slice(0,ORDER.indexOf('duke')+1),{card:true});await p.waitForTimeout(2200);
  const a3=await ev(()=>{const H=window.__ht,e=[...document.querySelectorAll('.ht-result')].filter(e=>e.offsetParent!==null).pop();return{screen:H.HUD.screen,act:H.prog.act,flag:HT.Save.data.flags.act3Intro,text:e?e.textContent.replace(/\s+/g,' ').trim():null}});
  ok(a3.screen==='result'&&/Act 3 · Good People Stay/.test(a3.text||'')&&/Wholesaler/.test(a3.text||'')&&a3.act===3&&a3.flag===true,'Act 3 card after the Duke, prog.act 3 '+JSON.stringify(a3).slice(0,300));
  if(SHOTS){await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(1500);await p.screenshot({path:path.join(DIR,'guidance-act3-card.jpg'),type:'jpeg',quality:82});await ev(()=>{window.__rafOn=false})}
  const again=await ev(()=>{const H=window.__ht;H.UIacts['result:go']();H.step(2);H.enterHub();H.step(2);return H.prog.act});await p.waitForTimeout(2000);
  ok(await ev(()=>window.__ht.HUD.screen)==null&&again===3,'the Act 3 card shows once');

  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors '+bad.slice(0,3).join(' | '));
  console.log(fails?fails+' FAILED':'all passed');await b.close();process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
