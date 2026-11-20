/* Following Distance: the binoculars with a REAL mouse (Playwright page.mouse on the game canvas, pointer lock requested the way
   the game does it). The owner can't hold one button and press another, so the binoculars are a toggle:
     right-click raises them and they STAY up with nothing held -> left-click takes the plate photo -> right-click lowers; Esc lowers too.
   Setup only goes through __ht (start the job at its "drop" checkpoint, park at the Dock St watch spot, let the handoff finish, point the
   view at the plate); every binocular action is a real mouse/keyboard event. node dev/jobs/tail-mouse.js */
const {open}=require('../ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  const st=await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('tail'),a=H.jobs.api;j.test.give(a);for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}H.enterHub();H.step(3);
    /* the "drop" checkpoint: in the minivan, parked on Dock St 30 m from the back of the box truck */
    const snap={stage:'drop',player:{x:429,z:128.5,yaw:-Math.PI/2,hp:100,weapons:Object.assign({},H.P.loadout),cur:H.P.cur,ammo:{},pool:{},inCar:true,car:{i:-1,van:true,x:429,z:128.5,yaw:Math.PI/2,hp:null}},crew:[],cars:[],
      job:{ph:'drop',s:5000,T:{sus:0,max:10,lose:0,fam:{},made:[],car:'van',type:'minivan'},sw:0,bi:-1,van:null,pull:true,light:true,items:[],photo:null,max:10,made:false},t:150};
    H.jobs.start('tail',{checkpoint:snap});H.step(3);const M=H.M;
    for(let i=0;i<2400&&M.handoff!=='done';i++)H.step(1);/* the loaders finish (about 25 s) */
    return{ph:M.ph,handoff:M.handoff,inCar:!!H.CV}});
  ok(st.ph==='drop'&&st.handoff==='done'&&st.inCar,'parked at the drop, handoff finished '+JSON.stringify(st));
  /* the game's canvas, and pointer lock as a click would ask for it */
  const box=await p.locator('canvas').first().boundingBox();const cx=box.x+box.width/2,cy=box.y+box.height/2;
  const aim=()=>ev(()=>{const H=window.__ht,M=H.M,e=H.CV,f=[-Math.sin(Math.PI/2),-Math.cos(Math.PI/2)],px=393+3.955,pz=135.5;/* the plate */const c=M.camInfo||{x:e.pos.x,y:1.6,z:e.pos.z};
    H.P.yaw=Math.atan2(-(px-c.x),-(pz-c.z));H.P.pitch=Math.atan2(.9-c.y,Math.hypot(px-c.x,pz-c.z))});
  const state=()=>ev(()=>{const H=window.__ht,M=H.M;return{up:!!M.binoUp,vf:!!M.vfOn,aim:!!H.P.aim,photo:M.photo,lock:!!document.pointerLockElement,ph:M.ph}});
  const steps=n=>ev(n=>window.__ht.step(n),n);
  await p.mouse.click(cx,cy,{button:'right'});await steps(2);await aim();await steps(2);let s=await state();
  ok(s.up&&s.vf,'right-click raises the binoculars '+JSON.stringify(s));
  await steps(90);await aim();await steps(2);s=await state();ok(s.up&&s.vf&&!s.aim,'they stay up with no button held (3 s later) '+JSON.stringify(s));
  const g=await ev(()=>{const H=window.__ht;return H.jobs.registry.get('tail')&&H.M.camInfo?true:false});
  await p.mouse.click(cx,cy,{button:'left'});await steps(3);s=await state();
  ok(!!s.photo&&s.photo.stars>=1,'left-click photographs the plate '+JSON.stringify(s.photo));
  /* a fresh start at the same checkpoint to check lowering (the photo moves the job on) */
  await ev(()=>{const H=window.__ht,M=H.M;M.ph='drop';M.photo=null;M.binoUp=false;H.step(2)});
  await p.mouse.click(cx,cy,{button:'right'});await steps(3);s=await state();ok(s.up&&s.vf,'right-click raises them again '+JSON.stringify(s));
  await p.mouse.click(cx,cy,{button:'right'});await steps(3);s=await state();ok(!s.up&&!s.vf,'right-click lowers them '+JSON.stringify(s));
  /* Esc lowers them (and, being Esc, also opens the pause menu: Esc again resumes, and the view is the normal one) */
  await p.mouse.click(cx,cy,{button:'right'});await steps(3);s=await state();ok(s.up,'up again before Esc');await p.keyboard.press('Escape');await p.waitForTimeout(100);
  const paused=await ev(()=>window.__ht.HUD.screen||null);await p.keyboard.press('Escape');await p.waitForTimeout(100);await steps(3);s=await state();
  ok(!s.up&&!s.vf,'Esc lowers them (pause menu: '+paused+', resumed) '+JSON.stringify(s));
  const obj=await ev(()=>{const o=window.__ht;const t=[...document.querySelectorAll('.ht-obj, .ht-tr')].map(e=>e.textContent).join(' ');return t});
  console.log('     pointer lock during the test: '+(s.lock?'held':'not granted by headless Chromium (events still reach the game)'));
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,4).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
