/* Brake Check with a REAL keyboard (Playwright page.keyboard on the game page), no __ht input calls for the core loop:
   the play is picked with the "2" key (Fence), the van is driven with W/A/S/D (the job's scripted driver only DECIDES which keys a
   person would hold this frame; Playwright presses and releases them), the stop is braked with S, then E gets out, Shift+W runs
   Dante down, E zip-ties, a held E takes the cash box, E hands it to Rick and E is "hands in". Setup (unlock, start at the ring) and
   the on-foot view direction go through __ht. node dev/jobs/brake-keys.js [--play=sandwich] */
const {open}=require('../ai-ingame-lib.js');
const PLAY=(process.argv.find(a=>a.startsWith('--play='))||'--play=fence').split('=')[1];
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);const K=p.keyboard;
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('brake'),a=H.jobs.api;for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}j.test.give(a);H.enterHub();H.step(3)});
  await p.evaluate(async()=>{const H=window.__ht,pm=window.HT&&HT.People;if(pm&&pm.preload)await Promise.race([pm.preload(H.jobs.castKeys('brake')).catch(()=>{}),new Promise(r=>setTimeout(r,20000))])});
  const st=await ev(()=>{const H=window.__ht;H.enterHub();H.step(2);H.jobs.start('brake');H.step(3);return{mode:H.mode,ph:H.M&&H.M.ph,car:!!H.CV}});
  ok(st.mode==='mission'&&st.ph==='huddle','job started in the huddle '+JSON.stringify(st));
  const steps=n=>ev(n=>window.__ht.step(n),n);const S=()=>ev(()=>{const H=window.__ht,M=H.M;try{H.draw()}catch(_){}return{state:M.state,ph:M.ph,play:M.play,box:M.boxPh,held:M.held,el:Math.round(M.elapsed),flags:M.flags,civ:M.civHits,kiss:M.civKiss,run:M.run&&M.run.st,cash:M.cash&&M.cash.st,hands:M.handsIn,exit:M.exitOpen,car:!!H.CV,objs:(document.body.innerText.match(/Pick Rick's play[^\n]*/)||[''])[0]}});
  await steps(20);let s=await S();ok(!s.play&&/press 1 for SANDWICH or 2 for FENCE/i.test(s.objs),'first objective says which key picks the play '+JSON.stringify(s.objs));
  await K.press(PLAY==='fence'?'2':'1');await steps(3);s=await S();ok(s.play===PLAY,'the "'+(PLAY==='fence'?'2':'1')+'" key picked '+s.play);
  /* drive: each 3 frames ask what a driver would hold, press it for real */
  const held={w:false,a:false,s:false,d:false};const set=async want=>{for(const k of['w','a','s','d']){const v=!!(want&&want[k]);if(v!==held[k]){held[k]=v;await (v?K.down(k):K.up(k))}}};
  let saw={},t=0;for(;t<3000;t++){const w=await ev(()=>{const H=window.__ht;return window.__brakeBot.want(H.jobs.api)});await set(w);await steps(3);
    if(t%10===0){s=await S();saw[s.box]=1;if(s.state!=='go'||s.ph==='collar')break}}
  await set(null);s=await S();ok(s.ph==='collar'&&s.state==='go','box closed and stopped with real W/A/S/D (saw '+Object.keys(saw).join(',')+', flags '+s.flags+', civ '+s.civ+') '+JSON.stringify({el:s.el,box:s.box}));
  ok(saw.stop,'braked as one (the stop phase ran with S held by the driver)');
  await steps(10);await K.press('e');await steps(5);s=await S();ok(!s.car,'E gets you out of the van');
  /* on foot: look at whoever we need, hold Shift+W */
  const face=w=>ev(w=>{const H=window.__ht,M=H.M,P=H.P;let t=null;if(w==='dan'){t=M.dan.pos}else if(w==='sur'){const e=[M.kev,M.dan].find(e=>e&&e.state==='surrender');t=e&&e.pos}else if(w==='trunk'){const g=M.tg,f=[-Math.sin(g.yaw),-Math.cos(g.yaw)];t={x:g.x-f[0]*(g.len/2+1),z:g.z-f[1]*(g.len/2+1)}}else if(w==='rick')t=M.rick.root.position;else if(w==='post')t=M.post.c;else if(w==='car')t=M.car.pos;
    if(!t)return 99;const dx=t.x-P.pos.x,dz=t.z-P.pos.z;P.yaw=Math.atan2(-dx,-dz);return Math.hypot(dx,dz)},w);
  const walkTo=async(w,r,run)=>{if(run)await K.down('Shift');await K.down('w');for(let i=0;i<300;i++){const d=await face(w);if(d<r)break;await steps(2)}await K.up('w');if(run)await K.up('Shift');await steps(2)};
  for(let i=0;i<60;i++){s=await S();if(s.run!=='wait')break;await steps(5)}
  await walkTo('dan',1.2,true);await steps(4);s=await S();ok(s.run==='spent'||s.run==='run','ran Dante down on foot ('+s.run+')');
  for(let n=0;n<2;n++){await walkTo('sur',1.4);await K.press('e');await steps(6)}
  s=await ev(()=>window.__ht.M.cuffs);ok(s>=2,'zip-tied both with E ('+s+')');
  await walkTo('trunk',1.2);await K.down('e');await steps(40);await K.up('e');s=await S();ok(s.cash==='carry','held E took the cash box ('+s.cash+')');
  await walkTo('rick',1.8);await K.press('e');await steps(4);s=await S();ok(s.cash==='given','E handed it to Rick');
  await walkTo('post',1.5);await K.press('e');await steps(4);s=await S();ok(s.hands&&s.exit,'E: hands in, and back to your ride is open');
  await walkTo('car',3);await K.press('e');await steps(60);s=await S();ok(s.state==='won','got in the car: won ('+s.state+')');
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,4).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
