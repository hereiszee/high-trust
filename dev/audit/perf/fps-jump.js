/* perf audit: jump height / air time at different fixed steps, with a real Space key press. node dev/audit/perf/fps-jump.js */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
(async()=>{const {b,p,errs}=await lib.open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]');await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(10)});
  for(const dt of[1/20,1/30,1/60,1/144]){await ev(dt=>{const H=window.__ht,P=H.P;P.pos.set(39,0,20);H.step(Math.round(.5/dt),dt)},dt);
    await p.keyboard.down(' ');const r=await ev(dt=>{const H=window.__ht,P=H.P;const y0=P.pos.y;let peak=0,air=0,t=0;for(let i=0;i<Math.round(2/dt);i++){H.step(1,dt);t+=dt;peak=Math.max(peak,P.pos.y-y0);if(!P.onGround)air+=dt;if(i===2)window.__up=true}return{peak:+peak.toFixed(3),air:+air.toFixed(3)}},dt);await p.keyboard.up(' ');
    await ev(dt=>window.__ht.step(Math.round(.5/dt),dt),dt);console.log((1/dt).toFixed(0).padStart(3)+' Hz jump',JSON.stringify(r))}
  console.log('console errors',errs.length);await b.close()})();
