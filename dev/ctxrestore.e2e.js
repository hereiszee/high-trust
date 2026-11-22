/* WebGL context lose/restore: the picture comes back, the loop keeps running. node dev/ctxrestore.e2e.js [--n=10]
   In the hub, at Fort Sensible (range rack + jet in view) and mid-job: n times renderer.forceContextLoss() -> forceContextRestore(), then the
   page's own loop must still be drawing (renderer frames advance) and a fresh frame must not be black (mean of a pixel grid read back
   right after a draw). Also: a module that throws every frame for 3 s does not stop the loop, logs that error once, shows the "progress is
   saved" line and saves. */
const {open}=require('./ai-ingame-lib.js');
const N=+((process.argv.find(a=>a.startsWith('--n='))||'--n=10').slice(4));
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a),wait=ms=>p.waitForTimeout(ms);
  await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
  await p.click('.ht-title [data-act=newgame]');await p.waitForFunction(()=>window.__ht.mode==='hub'&&window.__ht.running,null,{timeout:60000});await wait(2500);
  const picture=()=>ev(()=>{const H=window.__ht;H.draw();const gl=H.renderer.getContext(),W=gl.drawingBufferWidth,Hh=gl.drawingBufferHeight,b=new Uint8Array(4);let s=0,n=0,lit=0;
    for(let i=1;i<8;i++)for(let j=1;j<6;j++){gl.readPixels(Math.floor(W*i/8),Math.floor(Hh*j/6),1,1,gl.RGBA,gl.UNSIGNED_BYTE,b);const v=(b[0]+b[1]+b[2])/3;s+=v;n++;if(v>12)lit++}
    return{mean:Math.round(s/n),lit,of:n}});
  /* SwiftShader draws the heavy scenes at about 1 fps: alive = the page's own loop draws a new frame within 5 s */
  const loop=async()=>{const a=await ev(()=>window.__ht.renderer.info.render.frame);try{await p.waitForFunction(a=>window.__ht.renderer.info.render.frame>a,a,{timeout:5000,polling:100})}catch(e){}return(await ev(()=>window.__ht.renderer.info.render.frame))-a};
  const cycles=async(label)=>{const p0=await picture();let worst=null,dead=0;
    for(let i=0;i<N;i++){await ev(()=>window.__ht.renderer.forceContextLoss());await wait(250);await ev(()=>window.__ht.renderer.forceContextRestore());await wait(600);
      await ev(()=>{const H=window.__ht;if(H.HUD.dialogOpen)H.HUD.closeDialog('wait');if(H.HUD.screen==='pause')document.querySelector('.ht-pause [data-act=resume]')?.click()});await wait(200);
      const f=await loop();if(f<=0)dead++;const pic=await picture();if(!worst||pic.mean<worst.mean)worst=pic}
    ok(dead===0,`${label}: render loop alive after each of ${N} lose/restore cycles (dead ${dead})`);
    ok(worst.mean>20&&worst.lit>=worst.of*.6,`${label}: the picture comes back every time (before ${JSON.stringify(p0)}, worst after ${JSON.stringify(worst)})`)};
  await cycles('hub');
  /* Fort Sensible: the range rack and the jet */
  await ev(()=>{const H=window.__ht;H.P.pos.set(H.VAN.pos.x+2,0,H.VAN.pos.z);H.enterVan();return H.fastTravel('base')});await wait(6000);
  await ev(()=>{const H=window.__ht;if(H.CV)H.exitVehicle()});await wait(1500);
  console.log('info at '+await ev(()=>window.__ht.region));
  await cycles('Fort Sensible');
  /* mid-job */
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.jobs.start('gary')});await p.waitForFunction(()=>window.__ht.mode==='mission'&&window.__ht.M&&window.__ht.M.state==='go',null,{timeout:90000});await wait(2500);
  await cycles('mid-job (Return to Sender)');
  /* a module that throws every frame */
  const r=await ev(async()=>{const H=window.__ht,P=window.HT.People,up=P.update;let saved=0;const off=window.HT.Save.on('saved',()=>saved++);const f0=H.renderer.info.render.frame,e0=H.FRAME_ERR.n;
    P.update=function(){throw new Error('injected test failure')};await new Promise(r=>setTimeout(r,3200));P.update=up;
    const f1=H.renderer.info.render.frame;await new Promise(r=>setTimeout(r,800));const f2=H.renderer.info.render.frame;off();
    return{throws:H.FRAME_ERR.n-e0,framesWhileThrowing:f1-f0,framesAfter:f2-f1,saved,feed:[...document.querySelectorAll('.ht-fi')].some(e=>/progress is saved/.test(e.textContent))}});
  ok(r.throws>5&&r.framesAfter>0,'a module throwing every frame does not stop the loop '+JSON.stringify(r));
  ok(r.feed&&r.saved>=1,'after 2 s of the same error: "progress is saved" line and a save');
  const inj=errs.filter(e=>/injected test failure/.test(e));ok(inj.length===1,'the repeated error is logged once ('+inj.length+')');
  const other=errs.filter(e=>!/injected test failure/.test(e));ok(other.length===0,'no other console errors'+(other.length?': '+other.slice(0,3).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(99)});
