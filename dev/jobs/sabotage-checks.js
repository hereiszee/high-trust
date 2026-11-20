/* Sign of the Times: job-specific checks in the real game (headless Chromium + SwiftShader). node dev/jobs/sabotage-checks.js [--shots]
   1. memory: start the job five times (fail, retry, replay-style restarts); after each one ends, the renderer's geometry and texture
      counts and the live HT.Stealth sessions must come back to where they were (everything the job built is disposed)
   2. the night: def.night puts the night preset on; leaving the job puts the day back
   3. goggles: without them N does nothing and the patrol paths stay faint; with them N turns them on and the paths, the noisy ground
      and the hole in the fence light up; the HUD's NV / Light chips toggle on touch (HUD 'gadget' events)
   4. the deflate hook: setDeflate sags the truck body at that wheel; setDeflate(0) restores it
   5. no guns: firing tosses a treat (a noise where it lands), never a shot
   6. a touch-layout screenshot (844x390) with --shots */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const SHOTS=process.argv.includes('--shots'),OUT=path.join(__dirname,'../../docs/screenshots/jobs/sabotage');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{
  {const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
    await ev(async()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('sabotage');j.test.give(H.jobs.api);await window.HT.People.preload(['nb_pops','thug_track','thug_jacket']).catch(()=>{})});
    /* a warm-up run so shared caches (vehicle kits, people templates, shader programs) exist before we count */
    const mem=()=>ev(()=>{const H=window.__ht,m=H.renderer.info.memory;return{g:m.geometries,t:m.textures,live:window.HT.Stealth.live.length}});
    const run=async(kind)=>ev(k=>{const H=window.__ht;H.jobs.start('sabotage');H.step(240);const M=H.M;const r={night:H.night.k,trucks:M.vis.trucks.length,S:!!M.S};
      if(k==='fail'){H.jobs.finish(false,'test');H.step(60)}else{H.jobs.finish(true);H.step(60)}H.UIacts['result:go']&&H.UIacts['result:go']();H.step(80);r.after=H.night.k;r.mode=H.mode;return r},kind);
    const w=await run('fail');ok(w.night===1&&w.trucks===4&&w.S,'the job builds its yard at night ('+JSON.stringify(w)+')');ok(w.after===0&&w.mode==='hub','day is back after the job');
    const m0=await mem();const seq=[];for(const k of['fail','win','fail','win','fail']){await run(k);seq.push(await mem())}
    console.log('     memory after warm-up '+JSON.stringify(m0)+' then '+seq.map(m=>m.g+'/'+m.t+'/'+m.live).join(' '));
    const last=seq[seq.length-1];ok(last.g<=m0.g+6&&last.t<=m0.t+2&&last.live===0,'repeated runs do not grow memory (geometries '+m0.g+' -> '+last.g+', textures '+m0.t+' -> '+last.t+', live stealth sessions '+last.live+')');
    /* goggles and touch chips */
    const g=await ev(()=>{const H=window.__ht,s=H.jobs.api.SV();if(s&&s.gadgets)delete s.gadgets.nvg;H.jobs.start('sabotage');H.step(60);const M=H.M,out={};
      out.noNvg=H.nvg(true)===false;const pathOp=()=>{const l=[];M.viz.grp.traverse(o=>{if(o.isLine)l.push(o.material.opacity)});return Math.max(...l)};H.step(30);out.faint=pathOp();
      H.giveNvg(1);out.on=H.nvg(true)===true;H.step(40);out.bright=pathOp();out.noisy=M.vis.noisyMat.opacity;out.hole=M.vis.holeRing.material.opacity;
      /* touch: the HUD's gadget chip emits 'gadget' */const chips=[...document.querySelectorAll('.ht-gc')];H.draw();const chips2=[...document.querySelectorAll('.ht-gc')];
      const nv=chips2.find(c=>/NV/.test(c.textContent));if(nv){nv.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));out.chipOff=H.night.nvg===false;nv.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));out.chipOn=H.night.nvg===true}
      const fl=chips2.find(c=>/Light/.test(c.textContent));if(fl){const f0=H.night.flash;fl.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));out.flashTap=H.night.flash!==f0;fl.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))}
      /* the deflate hook on a truck */const ud=M.vis.trucks[0].obj.userData;ud.setDeflate([1,0,0,0]);out.sag=+ud.bodyRoot.position.y.toFixed(3);out.roll=+ud.bodyRoot.rotation.x.toFixed(4);ud.setDeflate(0);out.back=ud.bodyRoot.position.y===0&&Math.abs(ud.bodyRoot.rotation.x)<1e-9;
      /* no guns: fire = toss a treat */const P=H.P,n0=M.treats,heard=[];const un=window.HT.Jobs.on('noise',n=>heard.push(n.kind));const S=M.S;const orig=S.noise;S.noise=n=>{heard.push(n.kind);orig(n)};
      H.jobs.api.JH.fire();H.step(60);out.treat=n0-M.treats===1&&heard.includes('treat')&&!heard.includes('gun');S.noise=orig;un();
      H.jobs.finish(false,'test');H.step(60);return out});
    ok(g.noNvg,'N does nothing without goggles');ok(g.faint<.15,'patrol paths faint without goggles ('+g.faint.toFixed(2)+')');ok(g.on&&g.bright>.45,'goggles on: patrol paths bright ('+(g.bright||0).toFixed(2)+')');
    ok(g.noisy>.2&&g.hole>.2,'goggles light up the noisy ground and the hole in the fence ('+g.noisy.toFixed(2)+', '+g.hole.toFixed(2)+')');
    ok(g.chipOff&&g.chipOn,'touch: tapping the NV chip toggles the goggles');ok(g.flashTap,'touch: tapping the Light chip toggles the flashlight');
    ok(g.sag<-.015&&g.roll>0&&g.back,'setDeflate sags the body at the flat (y '+g.sag+', roll '+g.roll+') and setDeflate(0) restores it');ok(g.treat,'fire tosses a treat (a treat noise, never a gun)');
    const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,3).join(' | '):''));await b.close()}
  if(SHOTS){const {b,p,errs}=await open({viewport:{width:844,height:390},dpr:2});const ev=(f,a)=>p.evaluate(f,a);fs.mkdirSync(OUT,{recursive:true});
    await ev(async()=>{const H=window.__ht;try{H.render.apply('high')}catch(_){}H.HUD.hide('title');H.enterHub();await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('sabotage');j.test.give(H.jobs.api);H.giveNvg(1);
      await window.HT.People.preload(['nb_pops','thug_track','thug_jacket']).catch(()=>{});for(let i=0;i<40&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500));
      H.jobs.start('sabotage');H.step(200);const P=H.P,M=H.M;P.pos.set(424.6,0,116.4);P.crouch=true;P.yaw=Math.atan2(-(421.3-424.6),-(115.52-116.4))-.3;P.pitch=-.25;H.step(30);
      H.ow&&H.ow.buildAll&&H.ow.buildAll();H.ow&&H.ow.update&&H.ow.update(H.camera);H.draw()});
    await p.screenshot({path:path.join(OUT,'touch-yard.jpg'),type:'jpeg',quality:82});console.log('     shot touch-yard.jpg');await b.close()}
  console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
