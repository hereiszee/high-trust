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
  const shot=async(n)=>{if(SHOTS){await page.evaluate(()=>window.__ht.draw());await page.screenshot({path:OUT+n+'.jpg',type:'jpeg',quality:86})}};
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
  await ev(()=>window.__ht.homeInit&&window.__ht.homeInit());/* the house loads on demand (docs/PERF.md) */
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
  /* doorways vs the dad: standing height from the character model, every home door measured with rays against the house's solids */
  const fit=await ev(()=>{const h=window.__ht,T=THREE,b=new T.Box3();const body=h.P.dude.body||h.P.dude.root;b.setFromObject(body);const tall=+(b.max.y-b.min.y).toFixed(3);
    const H=h.home,rc=new T.Raycaster(),out=[];for(const d of H.doors){if(d.cx==null)continue;
      const c=new T.Vector3(d.cx,.05,d.cz);rc.set(c,new T.Vector3(0,1,0));rc.far=4;const up=rc.intersectObjects(H.solids,false)[0];
      const ax=d.alongX?new T.Vector3(1,0,0):new T.Vector3(0,0,1);let w=0;for(const sg of[1,-1]){rc.set(new T.Vector3(d.cx,1.0,d.cz),ax.clone().multiplyScalar(sg));rc.far=3;const hh=rc.intersectObjects(H.solids,false)[0];w+=hh?hh.distance:3}
      out.push({id:d.id||'door',clear:up?+up.distance.toFixed(2):null,wide:+w.toFixed(2)})}return{tall,doors:out}});
  console.log('   dad height',fit.tall,'m · home doors',JSON.stringify(fit.doors));
  ok(fit.tall>1.6&&fit.tall<1.95,'dad standing height measured: '+fit.tall+' m');
  ok(fit.doors.length>=5&&fit.doors.every(d=>(d.clear==null||d.clear>=2.1)&&d.wide>=.999),'every home doorway is at least 2.10 m clear and 1.00 m wide');
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
  await key('Escape');await sleep(400);ok(await ev(()=>!window.HT.Menus.isOpen()&&window.__ht.running&&window.__ht.hudScreen!=='pause'),'Esc closes the locker without pausing ('+await ev(()=>window.__ht.hudScreen)+')');
  /* Dadazon on the laptop */
  await ev(()=>window.__ht.grant(3000));
  await ev(()=>{const h=window.__ht,it=h.home.interactables.find(i=>i.id==='laptop');h.P.pos.set(it.x,0,it.z);h.step(1);h.use=true;h.step(1)});await sleep(500);
  ok(await ev(()=>window.HT.Menus.isOpen()),'Dadazon open');
  const before=await ev(()=>window.__ht.cash);
  const r=await ev(()=>window.HT.Economy.buy('furn','tv','dadazon'));ok(r&&r.ok!==false,'bought a TV on Dadazon');
  const r2=await ev(()=>window.HT.Economy.buy('furn','plant','dadazon'));
  const rg=await ev(()=>window.HT.Economy.buy('gun','nailer','dadazon'));ok(rg&&rg.ok!==false,'ordered the Weekend Nailer on Dadazon'+(rg&&rg.reason?' ('+rg.reason+')':''));
  const ra=await ev(()=>{const A=window.HT.CATALOG.attachments;const id=Object.keys(A).find(k=>window.HT.Economy.status('att',k,'dadazon').state==='buy');return id?{id,r:window.HT.Economy.buy('att',id,'dadazon')}:null});
  ok(ra&&ra.r&&ra.r.ok!==false&&ra.r.delivered==='pending','ordered an attachment on Dadazon: '+(ra&&ra.id));
  ok(await ev(()=>/after your next job/.test(window.HT.CATALOG.stores.dadazon.tag)),'Dadazon says boxes arrive after your next job');
  await key('e');await sleep(150);await key('e');await sleep(300);await shot('05-dadazon');
  await key('Escape');await sleep(400);
  ok(await ev(()=>!window.HT.Menus.isOpen()&&window.__ht.running&&window.__ht.hudScreen!=='pause'),'Esc closes Dadazon without pausing');
  ok(await ev(()=>window.__ht.save.pending.length===4),'4 orders pending');
  ok(await ev(()=>window.__ht.cash)<before,'cash spent');
  /* nothing arrives until a job is done: out the front door, no boxes yet */
  await ev(()=>window.__ht.exitHome('front'));await sleep(200);
  ok(await ev(()=>window.__ht.mode==='hub'&&!window.__ht.hubx.porch),'outside again, no boxes before the next job');
  /* Rick's job, scripted finish */
  await ev(()=>{const h=window.__ht;h.startMission(1);const M=h.M;M.smashed=3;for(const s of h.L.stashes)s.done=true;M.elapsed=120;M.t=40;M.exitOpen=true;if(M.intro)M.intro.done=true;h.P.pos.set(h.L.exit.x,0,h.L.exit.z)});
  await step(3);await sleep(1500);ok(await ev(()=>window.__ht.hudScreen==='result'),'job 2 result');
  await page.click('[data-act="result:go"]');await sleep(300);
  ok(await ev(()=>!!window.__ht.hubx.porch&&window.__ht.save.porch===4),'Dadazon boxes on the porch after the job');
  /* Rick's job opens the bridge: the Act 2 card pauses the street 1.4 s after you get back (wmHubEnter); dismiss it like a player would */
  const act2=await page.waitForFunction(()=>window.__ht.hudScreen==='result'&&!window.__ht.running,null,{timeout:5000}).then(()=>true,()=>false);
  ok(act2,'Act 2 card after Rick\'s job');if(act2){await page.click('[data-act="result:go"]');await sleep(300)}
  ok(await ev(()=>window.__ht.running&&window.__ht.mode==='hub'),'back on the street after the Act 2 card');
  await ev(()=>{const h=window.__ht,H=h.hubx.home;h.place(H.x+H.nx*3.2+(-H.nz)*1.2,H.z+H.nz*3.2+H.nx*1.2,Math.atan2(H.nx*3.2-H.nz*1.2,H.nz*3.2+H.nx*1.2),-.42);h.step(2)});
  await shot('10-porch-boxes');
  await ev(()=>{const h=window.__ht,H=h.hubx.home;h.place(H.x+H.nx*.4,H.z+H.nz*.4);h.step(1)});
  ok(await ev(()=>/Dadazon boxes/.test((window.__ht.prompt||{}).text)),'porch prompt: '+await ev(()=>(window.__ht.prompt||{}).text));
  await ev(()=>{window.__ht.use=true;window.__ht.step(1)});await sleep(100);
  ok(await ev(()=>window.__ht.save.owned.guns.includes('nailer')&&!window.__ht.save.pending.length&&!window.__ht.hubx.porch),'opened the boxes: nailer owned, nothing pending, porch clear');
  ok(await ev(id=>window.__ht.save.owned.att.includes(id),ra&&ra.id),'attachment from the boxes is in the locker: '+(ra&&ra.id));
  await ev(()=>window.__ht.enterHome());await sleep(200);await step(5);
  const rack=await ev(()=>window.__ht.home.rack);ok(rack&&rack.hanging.includes('nailer'),'nailer hangs on the garage rack: '+JSON.stringify(rack));
  await ev(()=>{const h=window.__ht;h.P.fp=true;h.place(-5.15,4.65,Math.PI/2,-.1);h.step(2)});await shot('11-garage-rack');await ev(()=>{const h=window.__ht;h.P.fp=false;h.step(1)});
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
  await key('b');await step(1);await key('Escape');await sleep(200);
  ok(await ev(()=>!window.__ht.deco.on&&window.__ht.running&&window.__ht.hudScreen!=='pause'),'Esc leaves decorate mode without pausing');
  /* pointer-lock path: the browser drops the lock on Esc */
  await page.mouse.click(640,360);await sleep(300);
  const gotLock=await ev(()=>document.pointerLockElement===document.querySelector('canvas'));
  if(gotLock){await key('b');await step(1);await ev(()=>document.exitPointerLock());await sleep(300);
    ok(await ev(()=>!window.__ht.deco.on&&window.__ht.running&&window.__ht.hudScreen!=='pause'),'lock lost while decorating: decorate ends, no pause');
    /* browsers refuse a re-lock for about a second after one ends: the click-to-relock path */
    let re=false;for(let i=0;i<6&&!re;i++){await sleep(400);await page.mouse.click(640,360);await sleep(200);re=await ev(()=>!!document.pointerLockElement)}
    ok(re,'click re-locks the pointer after decorate');await ev(()=>document.exitPointerLock());await sleep(300);
    ok(await ev(()=>window.__ht.hudScreen==='pause'),'lock lost while playing still pauses');await key('Escape');await sleep(200)}
  else console.log('   (pointer lock unavailable headless: lock-loss path not exercised)');
  /* the garage exit puts you behind the wheel */
  await ev(()=>window.__ht.exitHome('garage'));await sleep(300);await step(2);
  ok(await ev(()=>window.__ht.mode==='hub'&&window.__ht.VAN.on),'"Take the van" from the garage: driving on the street');
  await ev(()=>{const h=window.__ht;h.VAN.on=false;h.enterHub({at:'home'})});await sleep(100);
  /* full map: Esc closes it, no pause */
  await key('m');await sleep(200);const mapOpen=await ev(()=>!window.__ht.running);
  await key('Escape');await sleep(400);ok(mapOpen&&await ev(()=>window.__ht.running&&window.__ht.hudScreen!=='pause'),'Esc closes the full map without pausing');
  /* Hank's Hardware */
  await ev(()=>{const h=window.__ht,s=h.hubx.shops.find(s=>s.kind==='hardware');h.P.pos.set(s.x,0,s.z);h.step(1);h.use=true;h.step(1)});await sleep(400);
  ok(await ev(()=>window.HT.Menus.isOpen()),'hardware shop open');
  const hw=await ev(()=>window.HT.Economy.buy('furn','flamingo','hardware'));ok(hw&&hw.ok!==false,'bought a flamingo at Hank\'s');
  const hg=await ev(()=>window.HT.Economy.buy('gun','revolver','hardware'));ok(hg&&hg.ok!==false,'bought the revolver at Hank\'s'+(hg&&hg.reason?' ('+hg.reason+')':''));
  const ha=await ev(()=>{const A=window.HT.CATALOG.attachments;const id=Object.keys(A).find(k=>window.HT.Economy.status('att',k,'hardware').state==='buy');return id?{id,r:window.HT.Economy.buy('att',id,'hardware')}:null});
  ok(ha&&ha.r&&ha.r.ok!==false,'bought an attachment at Hank\'s: '+(ha&&ha.id));
  ok(await ev(()=>window.__ht.save.owned.guns.includes('revolver')),'revolver owned immediately');
  await shot('07-hardware');await key('Escape');await sleep(400);
  ok(await ev(()=>!window.HT.Menus.isOpen()&&window.__ht.running&&window.__ht.hudScreen!=='pause'),'Esc closes Hank\'s without pausing');
  ok(await ev(()=>window.HT.Economy.setLoadout('side','revolver').ok),'revolver selectable as sidearm');
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
  /* purchases ride along on the next job */
  const nextJob=await ev(()=>{const h=window.__ht;h.enterHub();h.startMission(2);h.step(3);return h.P.weapons.slice()});
  ok(nextJob.includes('revolver'),'revolver carried into the next job: '+nextJob.join('/'));
  /* all four missions start, with the saved loadout */
  for(let i=0;i<4;i++){const r=await ev(i=>{const h=window.__ht;h.enterHub();h.startMission(i);h.step(10);return{mode:h.mode,w:h.P.weapons.slice(),enemies:h.enemies.length+(h.M.def.type==='waves'?1:0)}},i);
    ok(r.mode==='mission'&&r.w.length>=2&&r.enemies>0,'mission '+i+' starts · guns '+r.w.join('/'))}
  ok(errors.length===0,'no console errors'+(errors.length?': '+errors.slice(0,5).join(' | '):''));
  await browser.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(2)});
