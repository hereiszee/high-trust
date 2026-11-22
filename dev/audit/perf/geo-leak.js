/* perf audit: which GPU geometries leak per job start -> pause -> Abandon? node dev/audit/perf/geo-leak.js [--job=0] [--n=6] [--quit]
   Records every geometry the renderer draws (renderBufferDirect) with the name chain of the object that drew it, and every dispose().
   After N cycles (job start, 60 steps, Esc, pause "Abandon job" button; --quit uses "Quit to title" + Continue instead) it lists the
   geometries that are still allocated on the GPU (seen, never disposed) but are no longer in the scene, grouped by owner. */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
const args=process.argv.slice(2);const arg=(k,d)=>{const a=args.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
const JOB=+arg('job',0),N=+arg('n',6),QUIT=args.includes('--quit');
(async()=>{const {b,p,errs}=await lib.open();const ev=(f,a)=>p.evaluate(f,a);const step=n=>ev(n=>window.__ht.step(n),n);
  await ev(()=>{const R=window.__ht.renderer,orig=R.renderBufferDirect.bind(R);const G=window.__G=new Map();window.__cyc=0;
    R.renderBufferDirect=function(c,s,g,m,o,gr){if(!G.has(g)){const ch=[];let q=o;while(q&&q.type!=='Scene'){if(q.name)ch.push(q.name);q=q.parent}G.set(g,{owner:ch.slice(0,4).reverse().join('/')||o.type,type:g.type,cyc:window.__cyc,obj:o})}return orig(c,s,g,m,o,gr)};
    const od=THREE.BufferGeometry.prototype.dispose;THREE.BufferGeometry.prototype.dispose=function(){G.delete(this);return od.call(this)}});
  await p.click('.ht-title [data-act=newgame]');await ev(async()=>{await window.__ht.jobs.ready;window.__ht.step(5);window.__ht.draw()});
  const geo=[];geo.push(await ev(()=>{window.__ht.draw();return window.__ht.renderer.info.memory.geometries}));
  for(let i=0;i<N;i++){await ev(c=>{window.__cyc=c},i+1);
    const st=await ev(async j=>{const H=window.__ht;H.startMissionWorld(j);for(let k=0;k<100&&H.mode!=='mission';k++)await new Promise(r=>setTimeout(r,100));for(let k=0;k<6;k++){H.step(10);H.draw()}return H.mode},JOB);
    await p.keyboard.press('Escape');await step(2);
    if(QUIT){await p.click('.ht-pause [data-act=quit]');await step(2);await p.click('.ht-dlg [data-dlg=ok]');await step(5);await p.click('.ht-title [data-act=continue]');await step(8)}
    else{await p.click('.ht-pause [data-act=abandon]');await step(10)}
    geo.push(await ev(()=>{const H=window.__ht;for(let k=0;k<3;k++){H.step(5);H.draw()}return H.renderer.info.memory.geometries}));console.log('cycle',i+1,'job mode',st,'info.memory.geometries',geo[geo.length-1])}
  const r=await ev(()=>{const H=window.__ht,inScene=new Set();H.scene.traverse(o=>{if(o.geometry)inScene.add(o.geometry)});const by={};let n=0;
    for(const [g,v] of window.__G){if(inScene.has(g))continue;n++;const k='c'+v.cyc+' '+v.owner+' ['+v.type+']';by[k]=(by[k]||0)+1}
    const agg={};for(const [g,v] of window.__G){if(inScene.has(g))continue;const k=v.owner+' ['+v.type+']';agg[k]=(agg[k]||0)+1}
    return{orphans:n,byOwner:Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,25),byCycle:Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,12)}});
  console.log('geometries drawn at least once, never disposed, no longer in the scene:',r.orphans);for(const [k,c] of r.byOwner)console.log('  ',String(c).padStart(4),k);
  console.log('by cycle (top):');for(const [k,c] of r.byCycle)console.log('  ',String(c).padStart(4),k);
  console.log('console errors',errs.length,errs.slice(0,4));await b.close()})();
