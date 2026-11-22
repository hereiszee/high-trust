/* High Trust trailer capture harness.
   Serves the repo to headless Chromium (SwiftShader) through Playwright request routing, boots the real game, and replaces the
   page's clocks with a VIRTUAL clock so every captured frame is exactly 1/FPS s of game time apart, however long it takes to render:
     - requestAnimationFrame callbacks are queued (all of them, not just the last one) and run with the virtual timestamp
     - performance.now() and Date.now() return virtual time once capture starts
     - setTimeout/setInterval created after capture starts fire on virtual time
     - CSS animations/transitions (document.getAnimations()) are paused and advanced by hand each frame
   The game's own loop (frame() in index.html) therefore runs unchanged: physics, AI, particles, camera, HUD, people animation.
   Usage (Node):
     const T=require('./lib.js'); const s=await T.boot({w:1920,h:1080}); ... stage with s.p.evaluate(...) ...
     await T.capture(s,{dir,frames,first,perFrame}) */
'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const SCRATCH=process.env.TRAILER_SCRATCH||'/tmp/ht-trailer';
const FPS=+(process.env.TRAILER_FPS||30);
const TYPES={'.html':'text/html','.js':'application/javascript','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.hdr':'application/octet-stream','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.css':'text/css','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.woff2':'font/woff2','.webp':'image/webp','.ktx2':'application/octet-stream'};

/* runs in the page before any game script */
function clockShim([fps,seed]){
  const R={raf:window.requestAnimationFrame.bind(window),pnow:performance.now.bind(performance),dnow:Date.now,st:window.setTimeout.bind(window),si:window.setInterval.bind(window),ct:window.clearTimeout.bind(window),ci:window.clearInterval.bind(window)};
  /* a seeded Math.random, so a staged moment plays out the same way in the preview and the real take */
  {let a=(seed>>>0)||1;Math.random=()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const V=window.__vt={on:false,live:true,t:0,base:0,dbase:0,q:[],timers:new Map(),seq:1,frame:0,dt:1000/fps,anims:new WeakSet()};
  window.requestAnimationFrame=cb=>{if(V.live&&!V.on)return R.raf(cb);if(!V.q.includes(cb))V.q.push(cb);return 1};
  performance.now=()=>V.on?V.base+V.t:R.pnow();
  Date.now=()=>V.on?V.dbase+V.t:R.dnow();
  const vset=(fn,ms,args,rep)=>{const id=1e6+V.seq++;V.timers.set(id,{fn,at:V.t+Math.max(0,+ms||0),ms:Math.max(1,+ms||0),args,rep});return id};
  window.setTimeout=(fn,ms,...a)=>V.on&&typeof fn==='function'?vset(fn,ms,a,false):R.st(fn,ms,...a);
  window.setInterval=(fn,ms,...a)=>V.on&&typeof fn==='function'?vset(fn,ms,a,true):R.si(fn,ms,...a);
  window.clearTimeout=id=>{if(V.timers.has(id))V.timers.delete(id);else R.ct(id)};
  window.clearInterval=id=>{if(V.timers.has(id))V.timers.delete(id);else R.ci(id)};
  /* pause the page: rAF queues, nothing advances until vt.advance() */
  V.pause=()=>{V.live=false};
  V.start=()=>{if(V.on)return;V.base=R.pnow();V.dbase=R.dnow();V.t=0;V.on=true;V.live=false};
  V.anim=()=>{for(const a of document.getAnimations()){try{if(!V.anims.has(a)){V.anims.add(a);a.pause()}else if(a.playState!=='paused')a.pause();a.currentTime=(+a.currentTime||0)+V.dt}catch(e){}}};
  V.timersRun=()=>{for(let guard=0;guard<500;guard++){let best=null,bid=0;for(const[id,t]of V.timers)if(t.at<=V.t&&(!best||t.at<best.at)){best=t;bid=id}
      if(!best)break;if(best.rep)best.at+=best.ms;else V.timers.delete(bid);try{best.fn(...(best.args||[]))}catch(e){console.warn('vt timer',e)}}};
  /* one frame: time moves by exactly dt, timers due fire, CSS animations move, then every queued rAF callback runs once */
  V.advance=(n=1)=>{for(let i=0;i<n;i++){V.t+=V.dt;V.frame++;V.timersRun();V.anim();const q=V.q.splice(0);for(const cb of q){try{cb(V.base+V.t)}catch(e){console.warn('vt raf',e)}}}};
  /* let the real loop run for a while (staging only, before start()) */
  V.goLive=()=>{V.live=true;const q=V.q.splice(0);for(const cb of q)R.raf(cb)};
}

async function boot(o={}){
  const W=o.w||1920,H=o.h||1080;
  const b=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required','--mute-audio'].concat(o.args||[])});
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});const errs=[];
  p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());if(o.log)console.log('[page]',m.text())});
  p.setDefaultTimeout(600000);
  await p.route('http://ht.local/**',async r=>{const u=new URL(r.request().url());const f=path.join(ROOT,decodeURIComponent(u.pathname));
    if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'not found'});
    r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':TYPES[path.extname(f).toLowerCase()]||'application/octet-stream','access-control-allow-origin':'*'}})});
  /* settings: High preset, full resolution, no fps cap, every tutorial hint already seen, subtitles on */
  await p.addInitScript(gfx=>{try{localStorage.clear();localStorage.setItem('ht-cfg-device',JSON.stringify({gfx,rscale:100,fpsCap:0}));
    localStorage.setItem('ht-tut',JSON.stringify({look:1,walk:1,jog:1,talk:1,van:1,drive:1,map:1,aim:1,reload:1,tie:1,pause:1}))}catch(e){}},o.gfx||'high');
  await p.addInitScript(clockShim,[o.fps||FPS,o.seed||1234]);
  if(o.init)await p.addInitScript(o.init);
  const t0=Date.now();await p.goto('http://ht.local/index.html');
  await p.waitForFunction(()=>window.__ht&&window.__ht.assets&&window.__ht.assets.done,null,{timeout:180000});
  if(o.newGame!==false){await p.click('.ht-title [data-act=newgame]').catch(()=>p.evaluate(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));
    await p.waitForTimeout(500);await p.evaluate(async()=>{await window.__ht.jobs.ready})}
  await p.evaluate(()=>window.__vt.pause());
  return{b,p,errs,loadMs:Date.now()-t0,W,H};
}
const ev=(s,f,a)=>s.p.evaluate(f,a);
/* wait until streaming has finished and no character is still loading */
async function settle(s,ms=120000){const t0=Date.now();
  while(Date.now()-t0<ms){const r=await s.p.evaluate(()=>{const H=window.__ht,A=H.assets;let pend=0;try{pend=A.stream.pending()}catch(e){}
      let pp=0;try{const pm=window.HT&&HT.People;if(pm&&pm.pending)pp=typeof pm.pending==='function'?pm.pending():pm.pending}catch(e){}return{pend,pp}});
    if(!r.pend&&!r.pp)return true;await s.p.waitForTimeout(1000)}return false}

/* capture frames [first..first+frames) of a shot into dir/f%05d.jpg; existing files are skipped only for the leading run
   (capture must replay deterministically from frame 0, so we fast-forward the simulation through frames already on disk without screenshotting) */
async function capture(s,o){const dir=o.dir;fs.mkdirSync(dir,{recursive:true});const cdp=await s.p.context().newCDPSession(s.p);
  const n=o.frames;let done=0;const t0=Date.now();
  await s.p.evaluate(()=>window.__vt.start());
  if(o.warm)for(let i=0;i<o.warm;i++){if(o.perFrame)await o.perFrame(-o.warm+i);await s.p.evaluate(()=>window.__vt.advance(1))}
  /* a letterbox requested from a queued rAF during staging can outlive its banner: drop it unless a banner is really up */
  if(!o.keepBanner)await s.p.evaluate(()=>{const H=window.__ht;try{H.HUD.banner(null)}catch(e){}for(const e of document.querySelectorAll('.ht-bn.lbx'))e.classList.remove('lbx');window.__vt.advance(1)});
  for(let i=0;i<n;i++){
    await s.p.evaluate(i=>{window.__trFrame=i},i);
    if(o.perFrame)await o.perFrame(i);
    await s.p.evaluate(()=>window.__vt.advance(1));
    const f=path.join(dir,'f'+String(i).padStart(5,'0')+'.jpg');
    if(o.skipExisting&&fs.existsSync(f))continue;
    if(o.every>1&&i%o.every)continue;
    const r=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:o.q||93,captureBeyondViewport:false});
    fs.writeFileSync(f,Buffer.from(r.data,'base64'));done++;
    if(o.log!==false&&(i%10===0||i===n-1))process.stdout.write(`\r${path.basename(dir)} ${i+1}/${n}  ${((Date.now()-t0)/1000/(i+1)).toFixed(2)} s/frame   `)}
  process.stdout.write('\n');return{done,secPerFrame:(Date.now()-t0)/1000/n}}
async function close(s){try{await s.b.close()}catch(e){}}
/* page-side helpers installed as window.__T after boot */
function helpers(){const H=window.__ht,T=window.__T={};
  T.flags=()=>{try{const s=H.jobs.api.SV();if(s&&s.flags){s.flags.act2Intro=true;s.flags.act3Intro=true}}catch(e){}H.WM.beat=true;H.WM.beat3=true;H.WM.finaleSeen=true;if(H.TUT)H.TUT.all=true};
  T.unlock=id=>{const j=H.jobs.registry.get(id),u=j.def.unlock||{},s=H.jobs.api.SV();for(const d of[].concat(u.done||[])){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true;if(s&&window.HT.Save.jobRec)window.HT.Save.jobRec(s,d).done=true}
    if(u.trust)H.prog.trust=Math.max(H.prog.trust,u.trust);if(u.trustR)H.prog.trustR=Math.max(H.prog.trustR||0,u.trustR);if(u.cuffed)H.prog.cuffed=Math.max(H.prog.cuffed||0,u.cuffed);T.flags();if(j.test&&j.test.give)j.test.give(H.jobs.api);T.flags();return H.jobs.lock(id)};
  T.cast=async keys=>{const pm=window.HT&&HT.People;if(!pm||!pm.preload)return;await Promise.race([pm.preload(keys).catch(()=>{}),new Promise(r=>setTimeout(r,40000))])};
  T.castJob=async id=>T.cast(H.jobs.castKeys(id));
  /* shots log timed events for the sound mix: T.ev('ziptie') records the frame being captured */
  window.__trEv=[];T.ev=n=>{window.__trEv.push([window.__trFrame,n])};
  T.face=(x,z)=>{const P=H.P;P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z))};
  T.release=()=>{for(const k of Object.keys(H.keys))H.keys[k]=false};
  T.hud=on=>{let st=document.getElementById('__trhud');if(!st){st=document.createElement('style');st.id='__trhud';document.head.appendChild(st)}
    st.textContent=(on?'':'.ht-hud,#strm,#lock,.ht-tut{visibility:hidden!important}')+' #strm{display:none!important}'};
  /* cinematic camera: window.__camFn() runs after the game has placed its camera and before the frame is drawn */
  try{HT.Jobs.on('pose',()=>{if(window.__camFn)try{window.__camFn(H.camera)}catch(e){console.warn('camFn',e)}})}catch(e){console.warn('no pose hook',e)}
  T.cam=(pos,look,fov)=>{window.__camFn=c=>{c.position.set(pos[0],pos[1],pos[2]);c.lookAt(look[0],look[1],look[2]);if(fov&&c.fov!==fov){c.fov=fov;c.updateProjectionMatrix()}}};
  T.hide=sel=>{const st=document.createElement('style');st.textContent=sel+'{visibility:hidden!important}';document.head.appendChild(st)};
  /* run a job's own scripted player (test.step) for up to max frames until until(M,H) is true */
  T.play=(id,until,max,o)=>{const j=H.jobs.registry.get(id),a=H.jobs.api;window.__bt=window.__bt||0;let n=0;for(;n<max&&H.M&&H.M.state==='go';n++){if(until&&until(H.M,H))break;j.test.step(a,window.__bt++,o||{});H.P.hp=Math.max(H.P.hp,80);H.step(1)}return{n,state:H.M&&H.M.state,stage:H.M&&H.M.stage}};
  T.bot=(id,o)=>{const j=H.jobs.registry.get(id);j.test.step(H.jobs.api,window.__bt++,o||{});H.P.hp=Math.max(H.P.hp,80)};
  T.hud(true);T.flags()}
module.exports={helpers,boot,settle,capture,close,ev,ROOT,SCRATCH,FPS};
