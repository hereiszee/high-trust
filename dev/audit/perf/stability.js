/* perf audit: stability under hostile timing. node dev/audit/perf/stability.js
   With the page's real render loop running (not stepped): starts job 0, then
   1. WebGL context loss mid-job (WEBGL_lose_context) for 3 s, restore; checks the dialog, that the game paused, that frames render after
      restore (renderer.info.render.frame advances, programs rebuilt) and that the job is still running;
   2. hides the page (CDP Page.setWebLifecycleState frozen, then visibilitychange via Emulation) for 20 s and back: player/van position
      jump, M.elapsed jump, pending timers fired in a burst, audio context state;
   3. a 3 s main-thread stall (busy loop) during driving: position jump of the van (dt clamp), job timer jump;
   4. suspends the AudioContext(s) and resumes them; checks they come back 'running' and no errors;
   5. clock jump: Date.now() +/- 1 h (overridden), 5 s of play, saves still write and load.
   Reports console errors, warnings, unhandled rejections. */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
const INIT=()=>{window.__rej=[];addEventListener('unhandledrejection',e=>window.__rej.push(String(e.reason&&e.reason.stack||e.reason).slice(0,300)));
  window.__acs=[];const AC=window.AudioContext;if(AC){const W=function(...a){const c=new AC(...a);window.__acs.push(c);return c};W.prototype=AC.prototype;window.AudioContext=W;window.webkitAudioContext=W}
  window.__dOff=0;const dn=Date.now;Date.now=()=>dn()+window.__dOff;window.__warns=[];const ow=console.warn;console.warn=function(...a){window.__warns.push(a.map(String).join(' ').slice(0,200));return ow.apply(console,a)}};
(async()=>{const {b,p,errs}=await lib.open({init:INIT});const ev=(f,a)=>p.evaluate(f,a);const cdp=await p.context().newCDPSession(p);
  const live=async on=>ev(on=>{window.__rafOn=on;if(on){const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)}},on);
  const log=(...a)=>console.log(...a);
  await p.click('.ht-title [data-act=newgame]').catch(()=>{});await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(3);H.startMissionWorld(0);for(let k=0;k<100&&H.mode!=='mission';k++)await new Promise(r=>setTimeout(r,100))});
  await live(true);await p.waitForTimeout(1500);
  const st=()=>ev(()=>{const H=window.__ht;return{mode:H.mode,M:H.M&&H.M.state,el:H.M?+H.M.elapsed.toFixed(2):null,screen:H.HUD.screen,dlg:H.HUD.dialogOpen,frame:H.renderer.info.render.frame,progs:H.renderer.info.programs.length,
    p:[+H.P.pos.x.toFixed(2),+H.P.pos.z.toFixed(2)],van:[+H.VAN.pos.x.toFixed(2),+H.VAN.pos.z.toFixed(2)],ac:window.__acs.map(c=>c.state),lost:H.renderer.getContext().isContextLost()}});
  log('start',JSON.stringify(await st()));
  /* 1. context loss */
  await ev(()=>{const gl=window.__ht.renderer.getContext();window.__lc=gl.getExtension('WEBGL_lose_context');window.__lc.loseContext()});await p.waitForTimeout(3000);
  const s1=await st();log('lost 3 s',JSON.stringify(s1),'dialog text:',await ev(()=>{const d=document.querySelector('.ht-dlg');return d?d.innerText.slice(0,80):null}));
  await ev(()=>window.__lc.restoreContext());await p.waitForTimeout(4000);const s2=await st();log('restored',JSON.stringify(s2));
  const shot1=path.join(process.cwd(),'docs/audit/perf/after-context-restore.jpg');await p.screenshot({path:shot1,type:'jpeg',quality:70});
  /* resume if paused */
  if(s2.screen==='pause'){await p.keyboard.press('Escape');await p.waitForTimeout(800)}
  if(await ev(()=>window.__ht.HUD.dialogOpen)){await p.keyboard.press('Escape');await p.waitForTimeout(500);if(await ev(()=>window.__ht.HUD.screen==='pause')){await p.keyboard.press('Escape');await p.waitForTimeout(500)}}
  const s3=await st();await p.waitForTimeout(2000);const s3b=await st();log('after resume, 2 s later',JSON.stringify(s3b),'frames advanced',s3b.frame-s3.frame,'elapsed advanced',+(s3b.el-s3.el).toFixed(2));
  /* 2. hidden / frozen 20 s */
  const h0=await st();await cdp.send('Page.setWebLifecycleState',{state:'frozen'});await new Promise(r=>setTimeout(r,20000));await cdp.send('Page.setWebLifecycleState',{state:'active'});await p.waitForTimeout(1500);
  const h1=await st();log('frozen 20 s -> active',JSON.stringify(h1),'elapsed jump',+(h1.el-h0.el).toFixed(2),'pos jump',+Math.hypot(h1.p[0]-h0.p[0],h1.p[1]-h0.p[1]).toFixed(2));
  if(h1.screen==='pause'){await p.keyboard.press('Escape');await p.waitForTimeout(600)}
  /* 3. 3 s stall while driving in the hub */
  await live(false);await ev(()=>{const H=window.__ht;if(H.M)H.M.state='abandoned';H.enterHub();H.step(3);const V=H.VAN;V.pos.set(200,0,41.5);V.yaw=-Math.PI/2;V.spd=0;H.syncVan();if(!V.on)H.enterVan();H.OWS.noTraffic=true;H.keys.w=true;H.step(60)});await live(true);await p.waitForTimeout(800);
  const d0=await st();const sp0=await ev(()=>window.__ht.VAN.spd);await ev(()=>{const t=performance.now();while(performance.now()-t<3000){}});await p.waitForTimeout(60);const d1=await st();
  log('3 s stall while driving at',sp0.toFixed(1),'m/s: van moved',+Math.hypot(d1.van[0]-d0.van[0],d1.van[1]-d0.van[1]).toFixed(2),'m in the first frame after (dt clamp 0.05 s ->',(sp0*.05).toFixed(2),'m expected)');
  await ev(()=>{window.__ht.keys.w=false});
  /* 4. audio suspend/resume */
  const a0=await ev(async()=>{const out=[];for(const c of window.__acs){try{await c.suspend()}catch(e){out.push('err '+e)}}await new Promise(r=>setTimeout(r,1500));const mid=window.__acs.map(c=>c.state);for(const c of window.__acs){try{await c.resume()}catch(e){out.push('err '+e)}}await new Promise(r=>setTimeout(r,500));return{mid,after:window.__acs.map(c=>c.state),out}});
  log('audio suspend/resume',JSON.stringify(a0));
  /* 5. clock jumps */
  const c0=await ev(async()=>{const H=window.__ht;const out={};for(const off of[3600e3,-7200e3,0]){window.__dOff=off;await new Promise(r=>setTimeout(r,1500));try{HT.Save&&HT.Save.flush&&HT.Save.flush()}catch(e){out['flush'+off]=String(e)}let raw=null;try{raw=JSON.parse(localStorage.getItem('ht-save'))}catch(e){}out[off]=raw?{t:raw.t,ok:true}:'no save'}return out});
  log('clock jumps',JSON.stringify(c0));
  await live(false);
  const x=await ev(()=>({rej:window.__rej,warns:window.__warns.filter(w=>!/KHR_texture_transform/.test(w)).slice(0,10),nw:window.__warns.length}));
  log('console errors',errs.length,JSON.stringify(errs.slice(0,8)));log('unhandled rejections',JSON.stringify(x.rej));log('warnings (minus GLTF UV notice)',JSON.stringify(x.warns),'total',x.nw);
  await b.close()})();
