const L=require('./lib.js');const DPR=+process.env.DPR||1;const MI=+(process.env.MI||1);
(async()=>{const {browser,page,errs}=await L.open({deviceScaleFactor:DPR});
  const ev=(f,a)=>page.evaluate(f,a);const step=(n)=>page.evaluate(n=>__ht.step(n),n);
  const frames=(n=3)=>page.evaluate(n=>new Promise(r=>{let k=0;const f=()=>{if(++k>=n)r();else requestAnimationFrame(f)};requestAnimationFrame(f)}),n);
  await page.waitForFunction(()=>window.__ht&&__ht.assets.done,null,{timeout:60000});await page.waitForTimeout(300);
  await L.click(page,'.ht-title [data-act=newgame]');await page.waitForTimeout(200);
  await ev(mi=>__ht.startMission(mi),MI);await page.waitForTimeout(400);await L.shot(page,'mission_intro_wide');
  /* keep the dad alive and the enemies calm while we pose shots */
  const calm=()=>ev(()=>{__ht.P.hp=100;for(const e of __ht.enemies){e.fireT=99}});
  await calm();await step(100);await calm();await page.waitForTimeout(3600);
  // aim at nearest enemy
  /* bring the nearest live enemy 7 m in front of the dad (the start area is open street) */
  const aim=()=>ev(()=>{const P=__ht.P;let b=null,bd=1e9;for(const e of __ht.enemies){if(e.state!=='idle')continue;const d=e.pos.distanceTo(P.pos);if(d<bd){bd=d;b=e}}
    P.pos.copy(__ht.L.start);P.pitch=-.04;const f={x:-Math.sin(P.yaw),z:-Math.cos(P.yaw)};b.pos.set(P.pos.x+f.x*7,0,P.pos.z+f.z*7);b.fireT=99;b.alert=false;b.dude.root.position.copy(b.pos);return __ht.enemies.indexOf(b)});
  let ei=await aim();await step(4);await calm();
  // stand the dad in clear view of the target: fp makes the aim exact
  await ev(()=>{__ht.P.fp=true});await step(2);
  await L.shot(page,'mission_wide');
  // hit
  await ev(i=>{__ht.enemies[i].hp=500},ei);await ev(()=>{__ht.mouse=true});await step(1);await ev(()=>{__ht.mouse=false});await frames(2);await L.shot(page,'hit_wide');
  console.log('hp after hit',await ev(i=>__ht.enemies[i].hp,ei));
  // kill
  await page.waitForTimeout(400);ei=await aim();await step(1);await ev(i=>{__ht.enemies[i].hp=1;__ht.P.fireT=0},ei);await ev(()=>{__ht.mouse=true});await step(1);await ev(()=>{__ht.mouse=false});await frames(2);await L.shot(page,'kill_wide');console.log('kill',await ev(i=>[__ht.enemies[i].state,__ht.M.kills],ei));
  console.log('feed',await ev(()=>[...document.querySelectorAll('.ht-fi')].map(f=>f.textContent)));
  // surrender: force the coin flip
  ei=await aim();await step(2);await page.keyboard.press('1');await step(20);
  /* realistic characters: a single shot can miss the skinned mesh, so retry (re-aimed) until he is hit */
  for(let t=0;t<6;t++){ei=await aim();await step(2);const st=await ev(i=>{const e=__ht.enemies[i];e.hp=e.maxhp*.4+5;e.triedSurr=false;Object.assign(__ht.P,{fireT:0,equipT:0,rl:null});const r=Math.random;Math.random=()=>.1;__ht.fire();Math.random=r;return e.state},ei).catch(()=>null);if(st==='surrender')break}
  await frames(2);console.log('state0',await ev(()=>[__ht.prog.shotSurr,__ht.M.kills]));console.log('state',await ev(i=>__ht.enemies[i].state,ei));
  await calm();await step(30);await ev(i=>{const P=__ht.P,e=__ht.enemies[i];P.yaw=Math.atan2(-(e.pos.x-P.pos.x),-(e.pos.z-P.pos.z));P.pitch=-.06},ei);await step(1);await frames(3);
  console.log('dbg',await ev(i=>{const e=__ht.enemies[i],P=__ht.P;return{shot:__ht.prog.shotSurr,kills:__ht.M.kills,cur:P.cur,st:e.state,d:e.pos.distanceTo(P.pos),running:__ht.M.state,fp:P.fp,pitch:P.pitch}},ei));
  console.log('nofire',await ev(()=>document.querySelector('.ht-xh').classList.contains('nofire')));
  await L.shot(page,'nofire_wide');
  // zip-tie
  await ev(i=>{const e=__ht.enemies[i],P=__ht.P;const d=e.pos.clone().sub(P.pos);d.y=0;d.normalize();P.pos.copy(e.pos).addScaledVector(d,-1.6)},ei);await step(2);await frames(3);
  console.log('prompt',await ev(()=>document.querySelector('.ht-pr:not(.off) .tt')?.textContent));
  await ev(()=>{__ht.use=true});await step(1);await frames(3);
  console.log('feed',await ev(()=>[...document.querySelectorAll('.ht-fi')].map(f=>f.textContent)),'cuffs',await ev(()=>__ht.M.cuffs));
  await ev(()=>{__ht.P.fp=false});await step(10);await L.shot(page,'zip_wide');
  // reload + crosshairs per gun
  await ev(()=>{Object.assign(__ht.P,{equipT:0,fireT:0,rl:null});__ht.P.ammo[__ht.P.cur].mag=3});await page.keyboard.press('r');await step(8);await frames(3);
  console.log('reload ring',await ev(()=>document.querySelector('.ht-rlr').classList.contains('on')));await L.shot(page,'reload_wide');
  for(const k of ['1','2','3']){await step(40);await page.keyboard.press(k);await step(4);await page.waitForTimeout(450);
    console.log('gun',k,await ev(()=>document.querySelector('.ht-xh').dataset.t));
    await page.screenshot({path:'docs/screenshots/hud-ingame/xh_'+k+'.jpg',type:'jpeg',quality:84,clip:{x:540,y:260,width:200,height:200},timeout:180000})}
  // damage + ally down
  await ev(()=>{const P=__ht.P;P.hp=100});await step(1);
  await ev(()=>{const P=__ht.P,e=__ht.enemies.find(e=>e.state==='idle');e.alert=true;e.target=P;P.hp=62;const a=__ht.allies[0];a.down=true;a.hp=0;a.downT=6})
  await step(1);await frames(2);await L.shot(page,'damage_wide');
  console.log('crew',await ev(()=>[...document.querySelectorAll('.ht-cc')].map(c=>c.textContent)));
  // objective progress and check-offs
  console.log('obj',await ev(()=>({t:document.querySelector('.ht-obj .t').textContent,tm:document.querySelector('.ht-obj .tm').textContent,lines:[...document.querySelectorAll('.ht-obj li')].map(l=>l.textContent+(l.classList.contains('done')?' [x]':'')+(l.classList.contains('warn')?' [warn]':''))})));
  await ev(()=>{for(const s of __ht.L.stashes){s.done=true}__ht.M.smashed=3});await step(2);await page.waitForTimeout(300);
  console.log('obj2',await ev(()=>[...document.querySelectorAll('.ht-obj li')].map(l=>l.textContent+(l.classList.contains('done')?' [x]':''))));
  await L.shot(page,'objective_done_wide');
  // back to the van -> result
  await ev(()=>{const x=__ht.L.exit;__ht.P.pos.set(x.x,0,x.z)});await step(1);await page.waitForTimeout(1600);
  console.log('screen',await ev(()=>HT.HUD.screen));await L.shot(page,'result_wide');
  await L.click(page,'.ht-result [data-act="result:go"]');await page.waitForTimeout(500);
  console.log('after result',await ev(()=>({screen:HT.HUD.screen,done:__ht.prog.done})));
  console.log('ERRS',errs);await browser.close()})();
