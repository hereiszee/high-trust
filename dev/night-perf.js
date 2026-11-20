/* night cost in one fixed view (Maple street at the minivan): node dev/night-perf.js
   Per quality preset: ms per rendered frame (gl.finish, best of 6 x 12 frames, SwiftShader) and renderer.info for day, night,
   night + flashlight, night + goggles, interleaved so drift affects all of them alike. */
const {open}=require('./ai-ingame-lib.js');
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});
  await p.evaluate(async()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(2);H.render.apply('high');H.giveNvg(1);
    for(let i=0;i<60&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500));
    const P=H.P,v=H.L.vanStart;P.pos.set(v.x,0,v.z);H.collide(P.pos,.35);P.yaw=-Math.PI/2+.35;P.pitch=-.1;H.step(4);H.ow.buildAll();H.step(2)});
  const out={};
  for(const q of['high','med','low']){
    const r=await p.evaluate(q=>{const H=window.__ht,gl=H.renderer.getContext();H.render.apply(q);
      const modes={day:()=>{H.nvg(false);H.flash(false);H.setNight(0)},night:()=>{H.nvg(false);H.flash(false);H.setNight(1)},flash:()=>{H.setNight(1);H.flash(true)},nvg:()=>{H.setNight(1);H.flash(false);H.nvg(true)}};
      const best={},info={};for(const k in modes){modes[k]();H.draw();H.draw();gl.finish();best[k]=1e9}
      for(let round=0;round<6;round++)for(const k in modes){modes[k]();H.draw();gl.finish();const t=performance.now();for(let i=0;i<12;i++)H.render.draw();gl.finish();best[k]=Math.min(best[k],(performance.now()-t)/12);
        if(round===0){H.renderer.info.autoReset=false;H.renderer.info.reset();H.render.draw();info[k]={calls:H.renderer.info.render.calls,programs:H.renderer.info.programs.length};H.renderer.info.autoReset=true}}
      for(const k in best)best[k]=+best[k].toFixed(2);return{ms:best,info}},q);
    out[q]=r}
  console.log(JSON.stringify(out,null,1));console.log('console errors:',errs.length?errs.slice(0,5):'none');await b.close()})();
