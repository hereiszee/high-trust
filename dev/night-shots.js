/* Night preset, flashlight and night-vision screenshots + cost: node dev/night-shots.js [outDir]  ->  docs/screenshots/jobs-framework/
   Headless Chromium + SwiftShader driven by window.__ht (setNight, flash, nvg, giveNvg). Prints ms per rendered frame (gl.finish)
   for the same view by day and by night on each quality preset, and any console errors. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const OUT=process.argv[2]||path.join(__dirname,'../docs/screenshots/jobs-framework');fs.mkdirSync(OUT,{recursive:true});
const ONLY=process.argv[3]?process.argv[3].split(','):null;
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});
  await p.evaluate(async()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(2);H.render.apply('high');
    for(let i=0;i<60&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500))});
  const draw=()=>p.evaluate(()=>{const H=window.__ht;H.ow&&H.ow.update(H.camera);H.draw();H.draw()});
  const shot=async(name,fn,arg)=>{if(ONLY&&!ONLY.includes(name))return;try{await p.evaluate(fn,arg);await draw();await p.waitForTimeout(120);
      await p.screenshot({path:path.join(OUT,name+'.jpg'),type:'jpeg',quality:86});console.log('shot',name)}catch(e){console.log('FAIL',name,String(e).slice(0,300))}};
  /* best of 4 runs of 12 frames: SwiftShader timings are noisy, the minimum is the stable number */
  const ms=()=>p.evaluate(()=>{const H=window.__ht,gl=H.renderer.getContext();H.draw();gl.finish();let best=1e9;for(let r=0;r<4;r++){const t=performance.now();for(let i=0;i<12;i++)H.draw();gl.finish();best=Math.min(best,(performance.now()-t)/12)}return +best.toFixed(1)});
  /* views */
  const street=()=>{const H=window.__ht,P=H.P;if(H.CV)H.exitVehicle();if(H.mode!=='hub')H.enterHub();const v=H.L.vanStart;P.pos.set(v.x,0,v.z);H.collide(P.pos,.35);P.yaw=-Math.PI/2+.35;P.pitch=-.1;P.fp=false;H.step(90);H.ow.buildAll();H.step(2)};
  const river=()=>{const H=window.__ht,P=H.P;if(H.CV)H.exitVehicle();H.openBridge();H.dress(55);H.prog.trustR=55;P.pos.set(356,0,46);H.collide(P.pos,.35);P.yaw=-Math.PI/2+.25;P.pitch=-.08;P.fp=false;H.step(90);H.ow.buildAll();H.step(2)};
  /* a back yard between houses, away from the street lamps */
  const yard=()=>{const H=window.__ht,P=H.P;if(H.CV)H.exitVehicle();const v=H.L.vanStart;P.pos.set(v.x+30,0,v.z+12);H.collide(P.pos,.35);P.yaw=0;P.pitch=-.22;P.fp=false;H.step(90);H.ow.buildAll();H.step(2)};
  await p.evaluate(()=>{const H=window.__ht;H.giveNvg(1)});
  /* day, after a night has come and gone: must match a day that never saw one */
  await shot('day-unchanged',k=>{const H=window.__ht;(0,eval)('('+k+')')();H.setNight(1);H.flash(true);H.nvg(true);H.step(2);H.draw();H.nvg(false);H.flash(false);H.setNight(0)},street.toString());
  await p.evaluate(street);await draw();const dayMs=await ms();
  await shot('night-street',k=>{const H=window.__ht;H.setNight(1);(0,eval)('('+k+')')()},street.toString());
  const nightMs=await ms();
  await shot('night-nvg',()=>{const H=window.__ht;H.nvg(true);H.step(3)});
  const nvgMs=await ms();
  await shot('night-riverside',k=>{const H=window.__ht;H.nvg(false);(0,eval)('('+k+')')()},river.toString());
  /* (the region banner from coming back across the river fades on the wall clock: wait it out) */
  await shot('night-flashlight-fp',k=>{const H=window.__ht;(0,eval)('('+k+')')();H.flash(true);H.P.fp=true;H.step(6);return new Promise(r=>setTimeout(r,3500))},yard.toString());
  await shot('night-flashlight',()=>{const H=window.__ht;H.P.fp=false;H.step(6)});
  const flashMs=await ms();
  await shot('night-car-headlights',k=>{const H=window.__ht;H.flash(false);H.P.fp=false;(0,eval)('('+k+')')();H.enterVan();H.step(2);const K=H.keys;K.w=true;H.step(50);K.w=false;H.step(8);H.P.pitch=-.12},street.toString());
  await shot('night-low',k=>{const H=window.__ht;H.exitVan&&H.CV&&H.exitVehicle();H.render.apply('low');(0,eval)('('+k+')')();H.flash(true);H.step(2)},street.toString());
  const lowMs=await ms();
  await shot('night-low-nvg',()=>{const H=window.__ht;H.nvg(true);H.step(3)});
  await p.evaluate(()=>{const H=window.__ht;H.nvg(false);H.flash(false);H.setNight(0);H.step(2)});const lowDayMs=await ms();
  /* medium: day vs night in the street view */
  await p.evaluate(k=>{const H=window.__ht;H.render.apply('med');(0,eval)('('+k+')')()},street.toString());await draw();const medDay=await ms();
  await p.evaluate(()=>{const H=window.__ht;H.setNight(1);H.step(2)});await draw();const medNight=await ms();
  console.log(JSON.stringify({high:{day:dayMs,night:nightMs,nvg:nvgMs,flashYard:flashMs},med:{day:medDay,night:medNight},low:{day:lowDayMs,nightFlash:lowMs}}));
  console.log('console errors:',errs.length?errs.slice(0,8):'none');await b.close()})();
