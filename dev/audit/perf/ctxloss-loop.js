/* perf audit: does the real render loop survive a WebGL context loss + restore? node dev/audit/perf/ctxloss-loop.js [--hub] [--newmat]
   Runs the page's own requestAnimationFrame loop live, counts loop callbacks and renderer.info.render.frame / calls per second
   before the loss, while lost (3 s) and after restore (resume with Esc), in a job (default) or in free roam (--hub). --newmat adds a mesh with a never-compiled material while the context is lost. */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
const HUB=process.argv.includes('--hub');
(async()=>{const {b,p,errs}=await lib.open({init:()=>{/* replaces the lib's single-slot rAF pause with a queue, and counts callbacks */window.__rafN=0;window.__rafQ=[];const raf=window.__realRaf||(window.__realRaf=Object.getPrototypeOf(window).requestAnimationFrame||window.requestAnimationFrame);const realRaf=Window.prototype.requestAnimationFrame?Window.prototype.requestAnimationFrame.bind(window):raf.bind(window);window.requestAnimationFrame=function(cb){const w=t=>{window.__rafN++;cb(t)};if(window.__rafOn)return realRaf(w);window.__rafQ.push(w);return 0};window.__flushRaf=()=>{const q=window.__rafQ.splice(0);for(const w of q)realRaf(w)}}});
  const ev=(f,a)=>p.evaluate(f,a);const stacks=[];p.on('pageerror',e=>stacks.push((e.stack||e.message).split('\n').slice(0,6).join(' | ')));
  await p.click('.ht-title [data-act=newgame]');await ev(async(hub)=>{const H=window.__ht;await H.jobs.ready;H.step(3);if(!hub){H.startMissionWorld(0);for(let k=0;k<100&&H.mode!=='mission';k++)await new Promise(r=>setTimeout(r,100))}},HUB);
  await ev(()=>{window.__rafOn=true;window.__flushRaf()});
  const win=async(label,ms=2000)=>{const a=await ev(()=>({n:window.__rafN,f:window.__ht.renderer.info.render.frame,simT:window.__ht.simT}));await p.waitForTimeout(ms);
    const z=await ev(()=>({n:window.__rafN,f:window.__ht.renderer.info.render.frame,simT:window.__ht.simT,screen:window.__ht.HUD.screen,dlg:window.__ht.HUD.dialogOpen,lost:window.__ht.renderer.getContext().isContextLost(),calls:window.__ht.renderer.info.render.calls,progs:window.__ht.renderer.info.programs.length}));
    console.log(label.padEnd(26),'loop callbacks',z.n-a.n,' renderer frames',z.f-a.f,' simT +'+(z.simT-a.simT).toFixed(2),' screen',z.screen,'dlg',z.dlg,'lost',z.lost,'calls',z.calls,'programs',z.progs);return z};
  await win('before loss');
  await ev(()=>{window.__lc=window.__ht.renderer.getContext().getExtension('WEBGL_lose_context');window.__lc.loseContext()});
  if(process.argv.includes('--newmat'))await ev(()=>{/* a material the renderer has never compiled appears while the context is lost (as a streamed character, an FX burst or a job prop would) */const H=window.__ht;const m=new THREE.MeshPhongMaterial({color:0x3366ff,shininess:7});m.defines={AUDIT_NEW:1};const g=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),m);g.position.copy(H.camera.position);g.translateZ(-4);g.frustumCulled=false;H.scene.add(g)});
  await win('lost',3000);
  await ev(()=>window.__lc.restoreContext());await win('restored (pause still up)');
  for(let i=0;i<3;i++){const s=await ev(()=>({scr:window.__ht.HUD.screen,dlg:window.__ht.HUD.dialogOpen}));if(!s.scr&&!s.dlg)break;await p.keyboard.press('Escape');await p.waitForTimeout(400)}
  await win('after Esc resume',3000);
  const px=await ev(()=>{const c=window.__ht.renderer.domElement;const t=document.createElement('canvas');t.width=64;t.height=36;const x=t.getContext('2d');x.drawImage(c,0,0,64,36);const d=x.getImageData(0,0,64,36).data;let s=0;for(let i=0;i<d.length;i+=4)s+=d[i]+d[i+1]+d[i+2];return +(s/(d.length/4)/3).toFixed(1)});
  console.log('mean canvas brightness after resume',px);await p.screenshot({path:path.join(process.cwd(),'docs/audit/perf/ctxloss-after-resume'+(HUB?'-hub':'')+'.jpg'),type:'jpeg',quality:70});
  console.log('console errors',errs.length,errs.slice(0,5));for(const st of stacks.slice(0,3))console.log('  stack:',st);await b.close()})();
