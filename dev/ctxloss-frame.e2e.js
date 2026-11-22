/* PERF-06 regression. node dev/ctxloss-frame.e2e.js [--n=30]
   The race the perf audit hit once: the context is already lost (driver reset, WEBGL_lose_context) but three hasn't had the
   'webglcontextlost' event yet, so a frame compiles a shader, gl.getProgramInfoLog() returns null and three's .trim() throws inside frame().
   Forced deterministically: for one frame getProgramInfoLog/getShaderInfoLog return null while a never-compiled material is in view. Then a
   real WEBGL_lose_context lose/restore. Each cycle checks the page's own rAF loop is still running (renderer frames advance, simT advances
   in play). Repeats n times (default 30). */
const {open}=require('./ai-ingame-lib.js');
const N=+((process.argv.find(a=>a.startsWith('--n='))||'--n=30').slice(4));
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a),wait=ms=>p.waitForTimeout(ms);const stacks=[];
  p.on('pageerror',e=>stacks.push((e.stack||e.message).split('\n').slice(0,4).join(' | ')));
  await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
  await p.click('.ht-title [data-act=newgame]');await p.waitForFunction(()=>window.__ht.mode==='hub'&&window.__ht.running,null,{timeout:60000});
  const frames=()=>ev(()=>({f:window.__ht.renderer.info.render.frame,simT:window.__ht.simT}));
  let dead=0,thrown=0;
  for(let i=0;i<N;i++){
    /* 1. the race: null info logs for one compile, with a brand-new material in front of the camera */
    const t=await ev(i=>{const H=window.__ht,T=THREE,gl=H.renderer.getContext();const pl=gl.getProgramInfoLog,sl=gl.getShaderInfoLog;
      gl.getProgramInfoLog=()=>null;gl.getShaderInfoLog=()=>null;
      const m=new T.Mesh(new T.BoxGeometry(.3,.3,.3),new T.MeshStandardMaterial({color:0x10000*((i*37)%255)+i,roughness:.5+(i%7)/20,defines:{PERF06:i}}));
      m.position.copy(H.camera.position).add(new T.Vector3(0,0,-2).applyQuaternion(H.camera.quaternion));H.scene.add(m);window.__p06=m;
      return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>{gl.getProgramInfoLog=pl;gl.getShaderInfoLog=sl;r(true)})))},i);
    await wait(150);
    /* 2. a real loss and restore */
    await ev(()=>{const ext=window.__ht.renderer.getContext().getExtension('WEBGL_lose_context');window.__p06ext=ext;ext&&ext.loseContext()});await wait(400);
    await ev(()=>{const e=window.__p06ext;e&&e.restoreContext()});await wait(700);
    await ev(()=>{if(window.__ht.HUD.dialogOpen)window.__ht.HUD.closeDialog('wait');const H=window.__ht;H.scene.remove(window.__p06)});
    await p.keyboard.press('Escape').catch(()=>{});await wait(300);
    if(await ev(()=>window.__ht.HUD.screen==='pause'))await p.click('.ht-pause [data-act=resume]').catch(()=>{});
    const a=await frames();await wait(900);const z=await frames();
    const alive=z.f>a.f;if(!alive)dead++;
    if(i<3||!alive||i===N-1)console.log(`cycle ${i+1}: renderer frames +${z.f-a.f}, simT +${(z.simT-a.simT).toFixed(2)}${alive?'':'  LOOP DEAD'}`);
    if(!alive)break}
  thrown=stacks.length;
  ok(dead===0,`render loop alive after every cycle (${N} cycles, dead ${dead})`);
  console.log('info page errors during the run: '+thrown+(thrown?' · first: '+stacks[0]:''));
  ok(!stacks.some(s=>/trim/.test(s)),'no uncaught "trim" error reaches the page');
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(99)});
