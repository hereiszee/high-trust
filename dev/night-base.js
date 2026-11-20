/* before/after look + cost at two fixed views: node dev/night-base.js <outDir> [high|med|low] [nightK | cycle]
   cycle = a full night (and the flashlight) comes and goes before the daytime shot, to check day is restored exactly.
   Prints ms per draw (gl.finish) and draw calls; writes street.jpg and river.jpg. */
const {open}=require('./ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const OUT=process.argv[2];const Q=process.argv[3]||'high';const CYC=process.argv[4]==='cycle',K=CYC?0:+(process.argv[4]||0);fs.mkdirSync(OUT,{recursive:true});
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});
  await p.evaluate(async(q)=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(2);H.render.apply(q);
    for(let i=0;i<60&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500))},Q);
  const views={street:()=>{const H=window.__ht,P=H.P;const v=H.L.vanStart;P.pos.set(v.x,0,v.z);H.collide(P.pos,.35);P.yaw=-Math.PI/2+.35;P.pitch=-.1;H.step(4);H.ow.buildAll();H.step(2)},
    river:()=>{const H=window.__ht,P=H.P;H.openBridge();P.pos.set(356,0,46);H.collide(P.pos,.35);P.yaw=-Math.PI/2+.25;P.pitch=-.08;H.step(4);H.ow.buildAll();H.step(2)}};
  for(const k in views){await p.evaluate(views[k]);
    if(CYC)await p.evaluate(()=>{const H=window.__ht;H.setNight&&H.setNight(1);H.flash&&H.flash(true);H.step(2);H.draw();H.flash&&H.flash(false);H.setNight(0);H.step(2)});
    if(K)await p.evaluate(k=>{const H=window.__ht;H.setNight&&H.setNight(k);H.step(2)},K);
    await p.evaluate(()=>{const H=window.__ht;H.ow&&H.ow.update(H.camera);H.draw();H.draw()});
    await p.screenshot({path:path.join(OUT,k+'.jpg'),type:'jpeg',quality:88});
    const ms=await p.evaluate(()=>{const H=window.__ht,gl=H.renderer.getContext();H.draw();gl.finish();const t=performance.now();for(let i=0;i<12;i++){H.draw()}gl.finish();return (performance.now()-t)/12});
    console.log(k,'ms/frame',ms.toFixed(1),'calls',await p.evaluate(()=>window.__ht.renderer.info.render.calls))}
  console.log('errors',errs);await b.close()})();
