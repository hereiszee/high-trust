/* perf audit: what is left in the world after jobs? Measures the midBridge budget view (Medium, worst of 4 headings, as
   dev/openworld-ingame.js) with a per-object draw breakdown on a fresh hub, then launches each of the 4 Maple ring jobs and
   returns (exactly as openworld-ingame does), and measures again; prints the groups whose draw count grew, plus
   renderer.info.memory / programs / scene object count / JS heap before and after.
   node dev/audit/perf/mission-residue.js [--rounds=1] */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
const args=process.argv.slice(2);const arg=(k,d)=>{const a=args.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
(async()=>{const {b,p,errs}=await lib.open();const cdp=await p.context().newCDPSession(p);
  const heap=async()=>{await cdp.send('HeapProfiler.collectGarbage');const m=await cdp.send('Runtime.getHeapUsage');return Math.round(m.usedSize/1e6)};
  await p.evaluate(()=>{const H=window.__ht;H.enterHub();H.HUD.hide('title');H.step(3);H.OWS.noTraffic=true;window.__sun=null;H.scene.traverse(o=>{if(o.isDirectionalLight)window.__sun=o});
    const R=H.renderer,orig=R.renderBufferDirect.bind(R);window.__grp=null;
    R.renderBufferDirect=function(c,s,g,m,o,gr){if(window.__grp){const ch=[];let q=o.parent;while(q&&q.type!=='Scene'){if(q.name)ch.push(q.name);q=q.parent}const k=ch.slice(0,3).reverse().join('/')+' > '+(o.name||o.type)+' '+(m.name||m.type);window.__grp[k]=(window.__grp[k]||0)+1}return orig(c,s,g,m,o,gr)};
    window.__meas=()=>{const x=294,z=43;H.render.apply('med');H.ow.quality('med');if(H.VAN.on){H.VAN.spd=0;H.exitVan()}H.P.pos.set(x,0,z);H.step(12);let best={main:0};
      for(let h=0;h<4;h++){const a=h*Math.PI/2,fx=Math.sin(a),fz=Math.cos(a),c=H.camera;c.position.set(x-fx*6,3.2,z-fz*6);c.lookAt(x+fx*20,1.5,z+fz*20);c.updateMatrixWorld();H.ow.update(c);H.ow.update(c);if(HT.World.update)HT.World.update(H.L,c.position);
        const R=H.renderer;R.info.autoReset=false;window.__sun.castShadow=false;R.info.reset();window.__grp={};R.render(H.scene,c);const g=window.__grp;window.__grp=null;window.__sun.castShadow=true;const main=R.info.render.calls;R.info.autoReset=true;
        if(main>best.main)best={main,h,g}}
      let objs=0;H.scene.traverse(()=>objs++);const M=H.renderer.info.memory;return{...best,geo:M.geometries,tex:M.textures,progs:H.renderer.info.programs.length,objs,dom:document.getElementsByTagName('*').length}}});
  const before=await p.evaluate(()=>{window.__ht.ow.buildAll();window.__ht.dress(5);return window.__meas()});before.heap=await heap();
  const rounds=+arg('rounds',1);const hist=[];
  for(let k=0;k<rounds;k++){for(let i=0;i<4;i++)await p.evaluate(async i=>{const H=window.__ht;if(H.mode!=='hub')H.enterHub();const d=H.L.dests[i],V=H.VAN;H.JOB=i;if(!V.on)H.enterVan();V.pos.set(d.x,0,d.z);V.yaw=-Math.PI/2;V.spd=0;if(V.car){V.car.spd=0;V.car.x=d.x;V.car.z=d.z}H.syncVan();H.step(3);
      for(let k=0;k<120&&H.mode!=='mission';k++)await new Promise(r=>setTimeout(r,100));H.step(30);H.enterHub();H.step(2)},i);
    const m=await p.evaluate(()=>{window.__ht.JOB=null;return window.__meas()});m.heap=await heap();hist.push(m);
    console.log('round',k+1,'midBridge main',m.main,'geo',m.geo,'tex',m.tex,'progs',m.progs,'sceneObjs',m.objs,'dom',m.dom,'heapMB',m.heap)}
  const after=hist[hist.length-1];
  console.log('before: midBridge main',before.main,'geo',before.geo,'tex',before.tex,'progs',before.progs,'sceneObjs',before.objs,'dom',before.dom,'heapMB',before.heap);
  const keys=new Set([...Object.keys(before.g),...Object.keys(after.g)]);const diff=[];for(const k of keys){const d=(after.g[k]||0)-(before.g[k]||0);if(d)diff.push([d,k])}
  diff.sort((a,b)=>Math.abs(b[0])-Math.abs(a[0]));console.log('draw groups that changed (after - before):');for(const [d,k] of diff.slice(0,30))console.log('  ',(d>0?'+':'')+d,k);
  console.log('console errors',errs.length,errs.slice(0,5));await b.close()})();
