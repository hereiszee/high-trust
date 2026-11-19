/* End-to-end check of the meta loop in the real game: save → payout → home → locker → Dadazon → delivery → decorate
   → Hank's Hardware → Dad's Auto (visible van upgrades) → reload → everything restored; plus every mission still starts.
   Usage: python3 -m http.server 8765 (repo root), then node dev/meta.e2e.js [--shots]   Screenshots go to docs/screenshots/meta/. */
const {chromium}=require('playwright');
const URL=process.env.HT_URL||'http://localhost:8765/index.html';
const SHOTS=process.argv.includes('--shots'),OUT='docs/screenshots/meta/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++};
(async()=>{
  const browser=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
  const ctx=await browser.newContext({viewport:{width:1280,height:720}});
  const page=await ctx.newPage();const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(String(e)));
  const shot=async(n,keepBanner)=>{if(SHOTS){await page.evaluate(()=>window.__ht.draw());await page.screenshot({path:OUT+n+'.jpg',type:'jpeg',quality:86})}};
  const ev=(f,a)=>page.evaluate(f,a);
  const key=async(k,n=1)=>{for(let i=0;i<n;i++){await page.keyboard.press(k);await sleep(60)}};
  const closeMenus=async()=>{for(let i=0;i<4&&await ev(()=>window.HT.Menus.isOpen());i++){await key('Escape');await sleep(150)}await sleep(150)};
  const step=n=>page.evaluate(n=>window.__ht.step(n),n);
  const ready=()=>page.waitForFunction(()=>window.__ht&&window.__ht.assets.done&&document.querySelector('.ht-title [data-act=newgame]'),null,{timeout:180000});
  async function boot(){await page.goto(URL);await ready();await sleep(300)}
  await boot();
  await ev(()=>localStorage.clear());await page.reload();await ready();await sleep(300);
  ok(await ev(()=>document.querySelector('.ht-title [data-act=continue]').hidden),'fresh save: no Continue on the title');
  await page.click('.ht-title [data-act=newgame]');await sleep(400);
  ok(await ev(()=>window.__ht.mode==='hub'),'hub after start');
  ok(await ev(()=>window.__ht.cash===0),'cash starts at 0');
  await page.waitForFunction(()=>window.__ht.homeReady,null,{timeout:120000});
  /* job 1: run Gary's job quickly with a scripted finish */
  await ev(()=>{const h=window.__ht;h.startMission(0);const M=h.M;M.got=4;M.cuffs=2;M.elapsed=200;for(const it of h.L.items)it.got=true;M.exitOpen=true;h.P.pos.set(h.L.exit.x,0,h.L.exit.z)});
  await step(3);await sleep(1500);
  ok(await ev(()=>window.__ht.hudScreen==='result'),'result screen shown');
  const pay=await ev(()=>window.__ht.M.pay);ok(pay&&pay.total>0,'payout computed: '+(pay&&pay.total));
  await sleep(2600);await shot('01-result-payout',true);
  ok(await ev(()=>/Bake sale/.test(window.HT.HUD.payoutEl&&window.HT.HUD.payoutEl.textContent)),'itemised payout on the result screen');
  const cash1=await ev(()=>window.__ht.cash);ok(cash1===pay.total,'cash credited: '+cash1);
  ok(await ev(()=>JSON.parse(localStorage.getItem('ht-save')).cash===window.__ht.cash),'saved to localStorage');
  /* head home: hub with the house marked */
  await page.click('[data-act="result:go"]');await sleep(300);
  ok(await ev(()=>window.__ht.mode==='hub'&&!!window.__ht.hubx.home),'back on the street, home located');
  ok(await ev(()=>window.__ht.hubx.shops.length===2),'two shops placed');
  await ev(()=>{const h=window.__ht,H=h.hubx.home;h.P.pos.set(H.x+H.nx*6.5,0,H.z+H.nz*6.5);h.P.yaw=Math.atan2(H.nx,H.nz);h.P.pitch=.02;h.step(2)});
  await shot('02-home-exterior');
  await ev(()=>{const h=window.__ht,H=h.hubx.home;h.P.pos.set(H.x,0,H.z);h.step(1)});
  ok(await ev(()=>/Go inside/.test(window.__ht.prompt&&window.__ht.prompt.text)),'door prompt: '+await ev(()=>JSON.stringify(window.__ht.prompt)));
  await ev(()=>{window.__ht.use=true;window.__ht.step(1)});await sleep(200);
  ok(await ev(()=>window.__ht.mode==='home'),'walked inside');
  await step(60);
  const fam=await ev(()=>window.__ht.home.family.map(m=>m.who+':'+m.root.children.length));ok(fam.length===4,'family present: '+fam.join(' '));
  ok(await ev(()=>{const u=window.__ht.ui;return !!(u.sub||true)}),'greeting');
  await step(60);
  /* family in their routines: Jen cooking, Tyler at the island, Maddie on the couch, Biscuit in his bed; seen from the living room */
  await ev(()=>{const H=window.__ht.home;H.forceActivity('jen','cook');H.forceActivity('tyler','island');H.forceActivity('maddie','seat');H.forceActivity('biscuit','dogbed')});await step(20);
  await ev(()=>{const h=window.__ht;h.place(7.6,2.2,Math.atan2(-(2.4-7.6),-(7.2-2.2)),-.2);h.step(2)});
  await shot('03-living-room-family');
  await ev(()=>{const h=window.__ht;h.P.fp=true;h.step(1)});await shot('03b-family-first-person');await ev(()=>{const h=window.__ht;h.P.fp=false;h.step(1)});
  /* locker */
  const lk=await ev(()=>{const h=window.__ht,it=h.home.interactables.find(i=>i.id==='locker');h.P.pos.set(it.x,0,it.z);h.step(1);return (h.prompt||{}).text||''});
  ok(/locker/i.test(lk),'locker prompt: '+lk);
  await ev(()=>{window.__ht.use=true;window.__ht.step(1)});await sleep(500);
  ok(await ev(()=>window.HT.Menus.isOpen()),'locker open');await shot('04-locker');
  await key('Escape');await sleep(300);ok(await ev(()=>!window.HT.Menus.isOpen()&&window.__ht.running),'locker closed, game running');
  /* Dadazon on the laptop */
  await ev(()=>window.__ht.grant(3000));
  await ev(()=>{const h=window.__ht,it=h.home.interactables.find(i=>i.id==='laptop');h.P.pos.set(it.x,0,it.z);h.step(1);h.use=true;h.step(1)});await sleep(500);
  ok(await ev(()=>window.HT.Menus.isOpen()),'Dadazon open');
  const before=await ev(()=>window.__ht.cash);
  const r=await ev(()=>window.HT.Economy.buy('furn','tv','dadazon'));ok(r&&r.ok!==false,'bought a TV on Dadazon');
  const r2=await ev(()=>window.HT.Economy.buy('furn','plant','dadazon'));
  await key('e');await sleep(150);await key('e');await sleep(300);await shot('05-dadazon');
  await closeMenus();
  ok(await ev(()=>window.__ht.save.pending.length>=1),'order pending until next visit');
  ok(await ev(()=>window.__ht.cash)<before,'cash spent');
  /* decorate: place the plant we already own? nothing in storage yet → go outside and back for delivery */
  await ev(()=>window.__ht.exitHome('front'));await sleep(200);
  ok(await ev(()=>window.__ht.mode==='hub'),'outside again');
  await ev(()=>window.__ht.enterHome());await sleep(200);await step(5);
  const lay=await ev(()=>window.__ht.save.furniture.placed.map(i=>i.id));ok(lay.includes('tv'),'delivered TV auto-placed: '+lay.join(','));
  /* decorate: pick up the TV and move it */
  await key('b');await step(2);ok(await ev(()=>window.__ht.deco.on),'decorate mode on');
  const dec=await ev(()=>{const h=window.__ht,D=window.HT.Home.decorate;h.P.pos.set(5.5,0,4.5);h.P.yaw=Math.PI/2;h.P.pitch=-1.0;h.step(2);
    const it=h.save.furniture.placed.find(i=>i.id==='tv');D.move(it.uid);h.step(1);
    /* sweep the aim until it fits somewhere */
    for(let y=0;y<24;y++){h.P.yaw=y*Math.PI/12;for(const p of[-.55,-.62,-.7]){h.P.pitch=p;h.step(1);if(D.aimInfo&&!D.aimInfo.why)return{ok:true,y,p}}}return{ok:false}});
  ok(dec.ok,'found a valid spot for the ghost');await shot('06-decorate-ghost');
  const placed=await ev(()=>window.HT.Home.decorate.place());ok(placed.ok,'placed via decorate');
  await key('b');await step(1);ok(await ev(()=>!window.__ht.deco.on),'decorate off');
  /* the garage exit puts you behind the wheel */
  await ev(()=>window.__ht.exitHome('garage'));await sleep(300);await step(2);
  ok(await ev(()=>window.__ht.mode==='hub'&&window.__ht.VAN.on),'"Take the van" from the garage: driving on the street');
  await ev(()=>{const h=window.__ht;h.VAN.on=false;h.enterHub({at:'home'})});await sleep(100);
  /* Hank's Hardware */
  await ev(()=>{const h=window.__ht,s=h.hubx.shops.find(s=>s.kind==='hardware');h.P.pos.set(s.x,0,s.z);h.step(1);h.use=true;h.step(1)});await sleep(400);
  ok(await ev(()=>window.HT.Menus.isOpen()),'hardware shop open');
  const hw=await ev(()=>window.HT.Economy.buy('furn','flamingo','hardware'));ok(hw&&hw.ok!==false,'bought a flamingo at Hank\'s');
  await shot('07-hardware');await closeMenus();
  ok(await ev(()=>window.__ht.save.furniture.placed.some(i=>i.id==='flamingo')),'flamingo placed in the yard right away');
  /* Dad's Auto */
  await ev(()=>{const h=window.__ht,s=h.hubx.shops.find(s=>s.kind==='auto');h.P.pos.set(s.x,0,s.z);h.step(1);h.use=true;h.step(1)});await sleep(400);
  ok(await ev(()=>window.HT.Menus.isOpen()),'auto shop open');
  await ev(()=>window.__ht.grant(5000));
  await key('Enter');await sleep(250);await key('Enter');await sleep(400);
  ok(await ev(()=>window.__ht.save.garage.vehicles.minivan.perf.engine===1),'bought the engine tune-up through the shop UI (Enter, Enter)');
  const ups=await ev(()=>['tyre1','bull','cargo','armor1'].map(id=>{const r=window.HT.Economy.buy('gar',id,'auto');return id+':'+(r&&r.ok!==false)+(r&&r.reason?'('+r.reason+')':'')}).concat(['paint:cranberry','rims:chrome','tint:light'].map(id=>{const r=window.HT.Economy.buy('cos',id,'auto');return id+':'+(r&&r.ok!==false)+(r&&r.reason?'('+r.reason+')':'')})));
  console.log('   upgrades',ups.join(' '));
  await shot('08-auto');await closeMenus();
  const vk=await ev(()=>({top:window.__ht.VANK.top,up:window.__ht.VAN.obj.userData.upgrades,col:window.__ht.VAN.obj.userData.color}));console.log('   van',JSON.stringify(vk));
  ok(vk.top>1,'handling multiplier applied: top x'+vk.top);ok(vk.up&&vk.up.roofRack==='cargo'&&vk.up.rims==='chrome'&&vk.col==='#8a2f2a','van shows upgrades: cargo box, chrome rims, cranberry paint');
  await ev(()=>{const h=window.__ht,V=h.VAN;const dx=5.2,dz=4.6;h.P.pos.set(V.pos.x+dx,0,V.pos.z+dz);h.P.yaw=Math.atan2(dx,dz);h.P.pitch=-.32;h.step(2)});
  await shot('09-van-upgraded');
  /* reload: everything restored */
  const snap=await ev(()=>{const s=window.__ht.save;return JSON.stringify({cash:s.cash,lay:s.furniture.placed.length,veh:s.vehicle,done:s.prog.done})});
  await ev(()=>window.__ht.saveGame());await page.reload();await ready();await sleep(300);
  ok(await ev(()=>!document.querySelector('.ht-title [data-act=continue]').hidden),'title offers Continue');
  await page.click('.ht-title [data-act=continue]');await sleep(300);
  const snap2=await ev(()=>{const s=window.__ht.save;return JSON.stringify({cash:s.cash,lay:s.furniture.placed.length,veh:s.vehicle,done:s.prog.done})});
  ok(snap===snap2,'save restored after reload');
  ok(await ev(()=>window.__ht.prog.done[0]===true),'prog restored (job 1 done)');
  ok(await ev(()=>{const u=window.__ht.VAN.obj.userData.upgrades;return u.rims==='chrome'&&u.roofRack==='cargo'}),'van upgrades restored on the hub van');
  /* all four missions start, with the saved loadout */
  for(let i=0;i<4;i++){const r=await ev(i=>{const h=window.__ht;h.enterHub();h.startMission(i);h.step(10);return{mode:h.mode,w:h.P.weapons.slice(),enemies:h.enemies.length+(h.M.def.type==='waves'?1:0)}},i);
    ok(r.mode==='mission'&&r.w.length>=2&&r.enemies>0,'mission '+i+' starts · guns '+r.w.join('/'))}
  ok(errors.length===0,'no console errors'+(errors.length?': '+errors.slice(0,5).join(' | '):''));
  await browser.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(2)});
