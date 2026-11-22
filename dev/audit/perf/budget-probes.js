/* perf audit: the dev/openworld-ingame.js draw-call budget probes (main <= 450, shadow <= 120, worst of 4 headings), in the same
   order, at a given quality, reporting for each probe how many main-pass draw calls belong to the range's rental rack and whether
   the rack was visible. --settle=N steps N frames at each probe before measuring (openworld-ingame uses 2).
   node dev/audit/perf/budget-probes.js [--q=med,low,high] [--settle=2] */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
const args=process.argv.slice(2);const arg=(k,d)=>{const a=args.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
(async()=>{const {b,p,errs}=await lib.open();
  await p.evaluate(()=>{const H=window.__ht;H.enterHub();H.HUD.hide('title');H.step(3);window.__sun=null;H.scene.traverse(o=>{if(o.isDirectionalLight)window.__sun=o});
    const R=H.renderer,orig=R.renderBufferDirect.bind(R);window.__rk=-1;
    R.renderBufferDirect=function(c,s,g,m,o,gr){if(window.__rk>=0){let q=o;while(q){if(q.name==='rentalRack'){window.__rk++;break}q=q.parent}}return orig(c,s,g,m,o,gr)}});
  for(const q of arg('q','med,low').split(',')){const r=await p.evaluate(([q,settle])=>{const H=window.__ht;H.render.apply(q);H.ow.quality(q);H.ow.buildAll();H.dress(5);
      const probes={home:[39,15],mapleSE:[177,97],dadsAuto:[221,55],midBridge:[294,43],riversideMain3rd:[379,43],scrapyardGate:[400,127]};const out={};
      for(const n in probes){const[x,z]=probes[n];if(H.VAN.on){H.VAN.spd=0;H.exitVan()}H.P.pos.set(x,0,z);H.step(settle);let w={main:0,shadow:0,tris:0,rack:0};
        const rr=H.scene.getObjectByName('rentalRack');
        for(let h=0;h<4;h++){const a=h*Math.PI/2,fx=Math.sin(a),fz=Math.cos(a);const c=H.camera;c.position.set(x-fx*6,3.2,z-fz*6);c.lookAt(x+fx*20,1.5,z+fz*20);c.updateMatrixWorld();H.ow.update(c);H.ow.update(c);if(HT.World.update)HT.World.update(H.L,c.position);
          const R=H.renderer,sun=window.__sun;R.info.autoReset=false;R.info.reset();R.shadowMap.needsUpdate=true;R.setRenderTarget(null);R.render(H.scene,c);const all=R.info.render.calls;
          sun.castShadow=false;R.info.reset();window.__rk=0;R.render(H.scene,c);const rk=window.__rk;window.__rk=-1;const main=R.info.render.calls,tris=R.info.render.triangles;sun.castShadow=true;R.info.autoReset=true;
          w={main:Math.max(w.main,main),shadow:Math.max(w.shadow,all-main),tris:Math.max(w.tris,tris),rack:Math.max(w.rack,rk)}}
        w.rackVisible=!!(rr&&rr.visible);w.rackDist=rr?Math.round(Math.hypot(x-117,z-204)):null;out[n]=w}
      return out},[q,+arg('settle',2)]);
    for(const n in r){const w=r[n];console.log((w.main<=450&&w.shadow<=120?'ok   ':'OVER ')+q+' '+n.padEnd(17)+' main '+w.main+' shadow '+w.shadow+' tris '+Math.round(w.tris/1000)+'k  rack calls '+w.rack+' (rack visible '+w.rackVisible+', '+w.rackDist+' m)')}}
  console.log('console errors',errs.length,errs.slice(0,3));await b.close()})();
