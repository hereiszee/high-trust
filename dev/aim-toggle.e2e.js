/* Owner rule, keyboard & mouse: every aim / raise mode is a TOGGLE (click Mouse 2 and the view holds until you click again; never
   hold-two-buttons). Real mouse and key events through Playwright, in the real game, one headless browser:
   node dev/aim-toggle.e2e.js
   1. gun aim: right click raises and it stays up, right click lowers; Key bindings → Aim: Toggle (default) / Hold (press-and-hold)
   2. Higher Ground (overwatch): on the roof, right click scopes and stays scoped; Shift tap holds the breath and it
      stays held after the key is up, tap again breathes; left alone it lets go by itself when the lungs run out (gasp, recovery);
      in Hold mode Shift is press-and-hold again
   3. the camera / binoculars (js/photo.js): right click raises, stays, right click lowers
   4. the tank gunner's sight: V toggles it (stays after the key is up), V again leaves */
const {open}=require('./ai-ingame-lib.js');
let fails=0;const ok=(m,c,x)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''))};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  const step=n=>ev(n=>{const H=window.__ht;H.step(n);if(H.ow&&H.ow.update)H.ow.update(H.camera)},n);
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));
  await p.waitForTimeout(300);await ev(()=>{const H=window.__ht;H.WM.beat=true;if(H.save&&H.save.flags)H.save.flags.act2Intro=true;H.step(2)});
  const C=await ev(()=>{const r=window.__ht.renderer.domElement.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
  await p.mouse.move(C.x,C.y);
  const rclick=async()=>{await p.mouse.down({button:'right'});await step(2);await p.mouse.up({button:'right'});await step(2)};
  /* the first click may only ask for pointer lock: click until a right click reaches the game */
  await p.mouse.click(C.x,C.y);await step(2);
  const aim=()=>ev(()=>window.__ht.P.aim);
  await ev(()=>{window.__ht.P.aim=false;HT.Keys.aimMode='toggle'});
  /* 1. gun aim */
  await rclick();let a1=await aim();if(!a1){await rclick();a1=await aim()}
  await step(60);const a1b=await aim();await rclick();const a2=await aim();
  ok('gun aim: right click raises and it stays up 2 s after the button is released, right click lowers',a1&&a1b&&!a2,{a1,a1b,a2});
  const ui=await ev(()=>{const d=document.createElement('div');document.body.appendChild(d);HT.Keys.reset();const render=()=>{d.innerHTML=HT.Keys.table();HT.Keys.bind(d,render)};render();
    const on=()=>{const b=d.querySelector('[data-aim] button[aria-pressed=true]');return b&&b.dataset.v};const t0=on();d.querySelector('[data-aim] button[data-v=hold]').click();const t1=on(),m=HT.Keys.aimMode;d.remove();return{t0,t1,m}});
  ok('Key bindings: Aim is Toggle by default (also after Reset) and the Hold button switches it',ui.t0==='toggle'&&ui.t1==='hold'&&ui.m==='hold',ui);
  await p.mouse.click(C.x,C.y);await ev(()=>{window.__ht.P.aim=false});
  await p.mouse.down({button:'right'});await step(10);const h1=await aim();await p.mouse.up({button:'right'});await step(2);const h2=await aim();
  ok('Aim: Hold brings back press-and-hold (down: up, release: down)',h1&&!h2,{h1,h2});
  await ev(()=>{HT.Keys.aimMode='toggle';window.__ht.P.aim=false});
  /* 2. Higher Ground */
  const st=await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.openBridge&&H.openBridge();const r=H.jobs.start('overwatch');H.step(3);return{mode:H.mode,id:H.M&&H.M.def&&H.M.def.id}});
  ok('overwatch started',st.mode==='mission'&&st.id==='overwatch',st);
  /* climb: the job's own test hook (climbing is a hold-E action, not an aim mode) */
  await ev(()=>{const H=window.__ht,M=H.M;for(let i=0;i<300&&M.ow.stage!=='ladder';i++)H.step(1);H.jobs.registry.get('overwatch').test.roof();H.step(5)});
  const up=await ev(()=>window.__ht.M.ow.roof.on);
  ok('on the roof with the rifle',up,{up});
  const sc=()=>ev(()=>{const H=window.__ht,O=H.M.ow,R=O.rifle;return{aim:H.P.aim,cur:H.P.cur,scopeT:+R.scopeT.toFixed(2),held:R.breath.held,holdT:+R.breath.holdT.toFixed(2),recover:+R.breath.recover.toFixed(2)}});
  await ev(()=>{window.__ht.P.aim=false});await step(10);
  await rclick();await step(30);let s1=await sc();await step(60);const s1b=await sc();
  ok('scope: right click scopes in and it stays (2 s later, button long released)',s1.aim&&s1b.aim&&s1b.scopeT>.9,{s1,s1b});
  await p.keyboard.press('Shift');await step(30);const b1=await sc();
  await p.keyboard.press('Shift');await step(4);const b2=await sc();
  ok('Shift tap holds the breath and it stays held with the key up; tap again breathes',b1.held&&b1.holdT>.8&&!b2.held,{b1,b2});
  await step(130);/* past the gasp recovery from any earlier hold */
  await p.keyboard.press('Shift');await step(30);const b3=await sc();await step(7*30);const b4=await sc();
  ok('left alone, the held breath lets go by itself when the lungs run out (4.5 s steady + 1.8 s shake), then a gasp',b3.held&&!b4.held&&b4.recover>0,{b3,b4});
  await step(120);await ev(()=>{HT.Keys.aimMode='hold'});
  await p.keyboard.down('Shift');await step(30);const h3=await sc();await p.keyboard.up('Shift');await step(3);const h4=await sc();
  ok('Aim: Hold: Shift is press-and-hold for the breath again',h3.held&&!h4.held,{h3,h4});
  await ev(()=>{HT.Keys.aimMode='toggle'});
  await rclick();await step(10);const s2=await sc();ok('right click again lowers the scope',!s2.aim,s2);
  await ev(()=>{try{window.__ht.jobs.finish(false,'test')}catch(e){}window.__ht.step(3);try{window.__ht.HUD.hide('result')}catch(e){}window.__ht.enterHub();window.__ht.step(3)});
  /* 3. the camera (js/photo.js), in the HOA job (the phone item) */
  const hs=await ev(()=>{const H=window.__ht;H.jobs.start('hoa');H.step(5);/* the job opens the camera at its stakeout; open it now */if(HT.Photo&&!HT.Photo.S)HT.Photo.begin({job:'test'});return{mode:H.mode,item:H.M&&H.M.item,photo:!!(HT.Photo&&HT.Photo.S)}});
  if(hs.mode==='mission'&&hs.photo){await ev(()=>{window.__ht.P.aim=false;HT.Photo.raise(false)});await step(10);
    await rclick();await step(20);const c1=await ev(()=>HT.Photo.isRaised());await step(60);const c1b=await ev(()=>HT.Photo.isRaised());await rclick();await step(20);const c2=await ev(()=>HT.Photo.isRaised());
    ok('camera: right click raises it, it stays raised, right click lowers',c1&&c1b&&!c2,{c1,c1b,c2})
    await ev(()=>{HT.Keys.aimMode='hold'});await p.mouse.down({button:'right'});await step(20);const c3=await ev(()=>HT.Photo.isRaised());await p.mouse.up({button:'right'});await step(20);const c4=await ev(()=>HT.Photo.isRaised());await ev(()=>{HT.Keys.aimMode='toggle'});
    ok('camera, Aim: Hold: up while the button is down, down on release',c3&&!c4,{c3,c4})}
  else ok('camera: the HOA job starts with the phone',false,hs);
  await ev(()=>{try{window.__ht.jobs.finish(false,'test')}catch(e){}window.__ht.step(3);try{window.__ht.HUD.hide('result')}catch(e){}window.__ht.enterHub();window.__ht.step(3)});
  /* 4. tank gunner's sight */
  const tk=await ev(()=>{const H=window.__ht,e=(H.vehicles||[]).find(c=>c.type==='tank');return e?{x:e.pos.x,z:e.pos.z}:null});
  if(tk){await ev(()=>{const H=window.__ht,e=H.vehicles.find(c=>c.type==='tank');H.P.pos.set(e.pos.x+3,0,e.pos.z);H.step(2);H.enterVehicle(e);H.step(4)});
    const inT=await ev(()=>window.__ht.CV&&window.__ht.CV.type);
    await ev(()=>{window.__ht.P.fp=false});await p.keyboard.press('v');await step(30);const v1=await ev(()=>window.__ht.P.fp);await step(60);const v1b=await ev(()=>window.__ht.P.fp);
    await p.keyboard.press('v');await step(4);const v2=await ev(()=>window.__ht.P.fp);
    ok("tank gunner's sight: V toggles it on, it stays with the key up, V leaves it",inT==='tank'&&v1&&v1b&&!v2,{inT,v1,v1b,v2})}
  else ok("tank gunner's sight: tank found",false,tk);
  const bad=errs.filter(e=>!/net::ERR/.test(e));ok('no console errors',bad.length===0,bad.slice(0,4));
  await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
