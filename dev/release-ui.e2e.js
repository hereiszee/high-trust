/* Release UX checks in the real game, with real key and mouse events where a player would use them.
   node dev/release-ui.e2e.js [--shots]   (screenshots to docs/screenshots/release/)
   first-run hints (look, walk, jog, talk ... each once, dismissed by doing it) · aim is a mouse toggle · pause → Controls lists
   foot, guns, cars, tank, jet · WebGL context loss pauses with a message and recovers · finale guidance in the objective, home
   marker, fridge calendar · "Not yet" is offered again next visit · Small Talk's zip-tie gate is spelled out · one Dave, one Doug ·
   quitting mid-job warns first */
const {open}=require('./ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const SHOTS=process.argv.includes('--shots'),DIR=path.join(__dirname,'../docs/screenshots/release');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open({init:()=>{if(!sessionStorage.getItem('s')){sessionStorage.setItem('s','1');localStorage.clear()}}});const ev=(f,a)=>p.evaluate(f,a);
  const live=()=>ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
  const shot=async n=>{if(!SHOTS)return;fs.mkdirSync(DIR,{recursive:true});await p.waitForTimeout(600);await p.screenshot({path:path.join(DIR,n+'.jpg'),type:'jpeg',quality:84})};
  const run=()=>ev(()=>{const H=window.__ht;if(H.HUD.screen==='pause')H.HUD.hide('pause');H.running=true});
  const st=()=>ev(()=>{const H=window.__ht;return{mode:H.mode,running:H.running,screen:H.HUD.screen,cur:H.TUT.cur&&H.TUT.cur.id,gap:H.TUT.gap,van:H.VAN.on,job:H.JOB}});
  const tut=()=>ev(()=>{const e=document.querySelector('.ht-tut');return e&&!e.classList.contains('off')?e.querySelector('.tt').textContent:null});
  await live();await p.waitForTimeout(800);
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(2500);
  ok(await ev(()=>window.__ht.mode)==='hub','new game: in the hub');
  /* 1. hints */
  let t=await tut();ok(/look around/i.test(t||''),'first hint: look ('+t+')');await shot('hint-look');
  /* headless SwiftShader runs a few frames a second: hold each action until its hint is dismissed and the next one shows */
  const until=async(re,ms)=>{try{await p.waitForFunction(r=>{const e=document.querySelector('.ht-tut');return e&&!e.classList.contains('off')&&new RegExp(r,'i').test(e.querySelector('.tt').textContent)},re,{timeout:ms||40000,polling:200});return await tut()}catch(e){return(await tut())+' '+JSON.stringify(await st())}};
  /* no pointer lock headless: turn the camera the way mouse look does */
  const turn=setInterval(()=>{ev(()=>{window.__ht.P.yaw+=.05}).catch(()=>{})},60);t=await until('^Walk');clearInterval(turn);ok(/^walk/i.test(t||''),'after looking: walk ('+t+')');
  await run();await p.keyboard.down('w');t=await until('jog');ok(/jog/i.test(t||''),'after walking (W held): jog ('+t+')');
  await p.keyboard.down('Shift');t=await until('press E',60000);await p.keyboard.up('Shift');await p.keyboard.up('w');
  ok(/press E/i.test(t||''),'after jogging (Shift+W): talk to someone with a ring ('+t+')');await shot('hint-talk');
  const done=await ev(()=>Object.keys(JSON.parse(localStorage.getItem('ht-tut')||'{}')));ok(['look','walk','jog'].every(k=>done.includes(k)),'done hints persist: '+done.join(','));
  /* 2. aim toggle on the mouse */
  const box=await p.$eval('#c',c=>{const r=c.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
  await p.mouse.move(box.x,box.y);await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});await p.waitForTimeout(100);const a1=await ev(()=>window.__ht.P.aim);
  await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});await p.waitForTimeout(100);const a2=await ev(()=>window.__ht.P.aim);
  ok(a1===true&&a2===false,'right mouse toggles aim: click → '+a1+', click again → '+a2+' (no hold)');
  /* 3. pause → Controls */
  await p.keyboard.press('Escape');await p.waitForTimeout(500);await p.click('.ht-pause [data-tab=keys]');await p.waitForTimeout(300);
  const keysTxt=await ev(()=>document.querySelector('.ht-pane').textContent);
  ok(['On foot','Guns','Cars','Tank','Jet','Afterburner','Landing gear','Flashlight','Zip-tie','Aim (click to raise'].every(w=>keysTxt.includes(w)),'pause → Controls lists foot, guns, cars, tank, jet');
  await shot('controls');
  await p.keyboard.press('Escape');await p.waitForTimeout(400);
  /* 4. WebGL context loss. The picture is compared with itself before the loss (a grid of pixels read right after a draw): the centre
     pixel alone is often the dad's dark jacket. dev/ctxrestore.e2e.js loops lose/restore 10x in the hub, at Fort Sensible and mid-job. */
  const grid=()=>ev(()=>{const H=window.__ht;H.draw();const gl=H.renderer.getContext(),W=gl.drawingBufferWidth,Hh=gl.drawingBufferHeight,b=new Uint8Array(4);let s=0,n=0;
    for(let i=1;i<8;i++)for(let j=1;j<6;j++){gl.readPixels(Math.floor(W*i/8),Math.floor(Hh*j/6),1,1,gl.RGBA,gl.UNSIGNED_BYTE,b);s+=(b[0]+b[1]+b[2])/3;n++}return Math.round(s/n)});
  const g0=await grid();
  await ev(()=>{window.__ht.running=true});await ev(()=>window.__ht.renderer.forceContextLoss());await p.waitForTimeout(600);
  const lost=await ev(()=>({dlg:document.querySelector('.ht-dlg h3')&&document.querySelector('.ht-dlg h3').textContent,running:window.__ht.running,lost:window.__ht.GLX.lost}));
  ok(lost.lost&&/graphics/i.test(lost.dlg||'')&&!lost.running,'context lost: paused with a message '+JSON.stringify(lost));await shot('webgl-lost');
  await ev(()=>window.__ht.renderer.forceContextRestore());await p.waitForTimeout(1500);
  const back=await ev(()=>({dlg:!!document.querySelector('.ht-dlg'),lost:window.__ht.GLX.lost,gl:!window.__ht.renderer.getContext().isContextLost()}));
  ok(!back.lost&&!back.dlg&&back.gl,'context restored: message gone, GL back '+JSON.stringify(back));
  await p.keyboard.press('Escape');await p.waitForTimeout(1200);
  const px=await p.screenshot({type:'png'});const {PNG}=(()=>{try{return require('pngjs')}catch(e){return{}}})();
  if(PNG){const im=PNG.sync.read(px);let s=0,n=0;for(let i=0;i<im.data.length;i+=4*97){s+=im.data[i]+im.data[i+1]+im.data[i+2];n++}ok(s/n/3>25,'the world draws again after the restore (mean '+(s/n/3).toFixed(0)+')')}
  else{const g1=await grid();ok(g1>20&&g1>=g0*.75,'the world draws again after the restore (picture mean '+g1+', before the loss '+g0+')')}
  await shot('webgl-restored');
  /* 5. finale guidance, decline, zip-tie gate, dedupe */
  await ev(()=>{window.__rafOn=false});
  await p.evaluate(async()=>{await window.__ht.jobs.ready});
  const fin=await ev(()=>{const H=window.__ht,S=HT.Save,s=S.data;s.flags.act2Intro=true;H.prog.act=2;const ids=H.jobs.registry.get('finale').def.unlock.done;
    for(const id of ids.slice(0,20)){S.jobRec(s,id).done=true;const i=H.jobs.index(id);if(i>=0)H.prog.done[i]=true}H.prog.trust=61;H.prog.trustR=44;H.enterHub();H.step(3);
    const o1=JSON.stringify(H.UIobj);for(const id of ids){S.jobRec(s,id).done=true;const i=H.jobs.index(id);if(i>=0)H.prog.done[i]=true}H.prog.trust=85;H.prog.trustR=82;H.enterHub();H.step(40);
    return{o1,o2:JSON.stringify(H.UIobj),marker:H.marker,info:H.finaleInfo()}});
  ok(/Finale: 20 of 27 jobs · Maple trust 61\/80 · Riverside trust 44\/80/.test(fin.o1),'Act 3: objective shows "Finale: 20 of 27 jobs · Maple trust 61/80 · Riverside trust 44/80" '+fin.o1+' '+JSON.stringify(fin.info));
  ok(/go home and talk to the family/.test(fin.o2)&&fin.marker&&/Home/.test(fin.marker.label||''),'all done + 80/80: objective says go home, marker points home '+JSON.stringify(fin.marker));
  if(SHOTS){await ev(()=>{const H=window.__ht;if(H.HUD.screen)H.HUD.hide(H.HUD.screen);H.running=true});await live();await p.waitForTimeout(2500);await shot('finale-objective');await ev(()=>{window.__rafOn=false})}
  const dec=await p.evaluate(async()=>{const H=window.__ht;H.enterHome();for(let i=0;i<200&&H.mode!=='home';i++)await new Promise(r=>setTimeout(r,100));H.step(3);
    const a=H.jobs.homeUse('family');H.step(1);const br=!!(H.UIacts&&H.UIacts['brief:no']);if(br)H.UIacts['brief:no']();H.step(1);const again=H.jobs.homeUse('family');H.step(1);if(H.UIacts&&H.UIacts['brief:no'])H.UIacts['brief:no']();
    H.exitHome('front');H.step(3);H.enterHome();for(let i=0;i<200&&H.mode!=='home';i++)await new Promise(r=>setTimeout(r,100));H.step(3);const next=H.jobs.homeUse('family');H.step(1);const title=H.UIacts&&H.UIacts['brief:no']?document.querySelector('.ht-brief h2')&&document.querySelector('.ht-brief h2').textContent:null;if(H.UIacts&&H.UIacts['brief:no'])H.UIacts['brief:no']();
    return{first:a&&br,sameVisit:!!again,nextVisit:!!next,title}});
  ok(dec.first&&dec.nextVisit&&/Everybody Waves/i.test(dec.title||''),'"Not yet" on the finale: offered again on the next visit home '+JSON.stringify(dec));
  await ev(()=>window.__ht.jobs.calendar());if(SHOTS){await live();await p.waitForTimeout(900);await shot('calendar-finale');await ev(()=>{window.__rafOn=false})}
  const cal=await ev(()=>{const g=document.querySelector('.ht-cal .goal');const t=g?g.textContent:'none '+JSON.stringify(window.__ht.finaleInfo())+' '+window.__ht.HUD.screen;try{window.__ht.UIacts['calendar:close']()}catch(_){}return t});
  ok(/festival is ready/i.test(cal||''),'fridge calendar shows the finale line ('+cal+')');
  const tie=await ev(()=>{const H=window.__ht,S=HT.Save,s=S.data;s.jobs.talk.done=false;const i=H.jobs.index('talk');if(i>=0)H.prog.done[i]=false;H.prog.cuffed=3;H.exitHome&&H.mode==='home'&&H.exitHome('front');H.enterHub();H.step(3);return{g:H.tieGoal(),o:JSON.stringify(H.UIobj)}});
  ok(/zip-tie 10 people alive · 3\/10/.test(tie.o),'Small Talk gate in the objective: '+tie.g);
  const dd=await ev(()=>{const H=window.__ht,S=HT.Save,s=S.data;for(const id of Object.keys(s.jobs))s.jobs[id].done=false;H.prog.done.fill(false);for(const id of['gary','rick']){S.jobRec(s,id).done=true;H.prog.done[H.jobs.index(id)]=true}
    H.enterHub();H.step(3);const by={};for(const n of H.npcs)by[n.id]=(by[n.id]||0)+1;return by});
  ok((dd.dave||0)<=1&&(dd.doug||0)<=1,'one Dave, one Doug in the hub '+JSON.stringify(dd));
  /* 6. quit mid-job warns */
  const q=await p.evaluate(async()=>{const H=window.__ht;await HT.People.preload(H.jobs.castKeys('porch')).catch(()=>{});H.jobs.start('porch');const w=H.jobs.castWait;if(w)await w;H.step(5);return H.mode});
  await live();await ev(()=>{window.__ht.running=true});await p.keyboard.press('Escape');await p.waitForTimeout(500);await p.click('.ht-pause [data-act=quit]');await p.waitForTimeout(300);
  const qd=await ev(()=>({txt:document.querySelector('.ht-dlg')&&document.querySelector('.ht-dlg').textContent,foc:document.activeElement&&document.activeElement.dataset.dlg}));
  ok(q==='mission'&&/will be lost/.test(qd.txt||'')&&qd.foc==='cancel','Quit to title mid-job asks first, Keep playing focused '+JSON.stringify({q,foc:qd.foc}));await shot('quit-warning');
  await p.keyboard.press('Enter');await p.waitForTimeout(300);ok(await ev(()=>window.__ht.mode)==='mission','Keep playing: still in the job');
  const bad=errs.filter(e=>!/favicon|net::ERR|context lost|CONTEXT_LOST/i.test(e));ok(!bad.length,'no console errors '+bad.slice(0,3).join(' | '));
  await b.close();console.log(fails?`FAIL ${fails}`:'PASS');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
