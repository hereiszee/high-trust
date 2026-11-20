/* Following Distance: repeated runs must not grow memory. Starts the job, plays ~25 s of the tail (traffic spawning and
   despawning), quits through the fail card, back to the hub; five times. Prints renderer geometries/textures, scene objects,
   window listeners added by the job, and live People after each run. node dev/jobs/tail-mem.js */
const {open}=require('../ai-ingame-lib.js');
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('tail');j.test.give(H.jobs.api);for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}H.enterHub();H.step(3);
    const add=EventTarget.prototype.addEventListener,rem=EventTarget.prototype.removeEventListener;window.__L=0;EventTarget.prototype.addEventListener=function(t,f,o){if(this===window&&t==='mousedown')window.__L++;return add.call(this,t,f,o)};
    EventTarget.prototype.removeEventListener=function(t,f,o){if(this===window&&t==='mousedown')window.__L--;return rem.call(this,t,f,o)}});
  const rows=[];for(let k=0;k<6;k++){const r=await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('tail'),a=H.jobs.api;H.jobs.start('tail');H.step(3);
      for(let t=0;t<1200&&H.M&&H.M.state==='go';t++){j.test.step(a,t,{});H.step(1)}const cars=(H.M.covers||[]).length+(H.M.oncoming||[]).length;
      H.jobs.finish(false);H.step(50);H.UIacts['result:go']&&H.UIacts['result:go']();H.step(10);let objs=0;H.scene.traverse(()=>objs++);const m=H.renderer.info.memory;
      return{geo:m.geometries,tex:m.textures,objs,listeners:window.__L,cars,mode:H.mode}});rows.push(r);console.log('run '+(k+1),JSON.stringify(r))}
  const a=rows[1],z=rows[rows.length-1];const grow={geo:z.geo-a.geo,tex:z.tex-a.tex,objs:z.objs-a.objs,listeners:z.listeners};console.log('growth run 2 -> run 6',JSON.stringify(grow));
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'console errors: '+bad.slice(0,4).join(' | '):'no console errors');
  const ok=grow.geo<=8&&grow.tex<=2&&grow.listeners<=0&&!bad.length;console.log(ok?'ok   no growth':'FAIL memory grows');await b.close();process.exit(ok?0:1)})().catch(e=>{console.error(e);process.exit(1)});
