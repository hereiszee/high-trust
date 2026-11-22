/* High Trust store-art studio: loads the real game once in headless Chromium (software GL), enters the hub on the
   High preset, waits for characters to stream in, then runs staging jobs dropped into tools/store-art/jobs/*.js.
   Each job file exports {w,h,dpr,hud,run} where run is a page-side function string (body) that poses the scene;
   the studio then lets streaming settle, renders and writes out/<name>.png. Game code is not modified: every
   change goes through the debug hook window.__ht and the public HT.* modules.
   Run: node tools/store-art/studio.js   (stays up; drop jobs in; touch jobs/STOP to quit) */
'use strict';
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..'),JOBS=path.join(__dirname,'jobs'),OUT=path.join(__dirname,'out');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml','.ktx2':'application/octet-stream','.wasm':'application/wasm'};
const log=(...a)=>console.log(new Date().toISOString().slice(11,19),...a);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  await ctx.route('http://repo.local/**',r=>{const u=new URL(r.request().url());const f=path.join(ROOT,decodeURIComponent(u.pathname));
    if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'nf'});
    r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':MIME[path.extname(f)]||'application/octet-stream'}})});
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>{errs.push('pageerror '+e.message);log('PAGEERROR',e.message)});
  p.on('console',m=>{if(m.type()==='error'){errs.push(m.text());log('console.error',m.text().slice(0,200))}});
  await p.addInitScript(()=>{window.requestAnimationFrame=()=>0;
    try{localStorage.setItem('ht-cfg',JSON.stringify({gfx:'high',fov:70}))}catch(e){}});
  await p.goto('http://repo.local/index.html');
  await p.waitForFunction(()=>window.__ht&&__ht.assets.done,null,{timeout:300000,polling:1000});log('assets done');
  await p.evaluate(()=>{const b=document.getElementById('bStart');if(b)b.click()});await p.keyboard.press('Enter');await p.waitForTimeout(500);
  await p.evaluate(()=>{if(!(__ht.L&&__ht.L.def&&__ht.L.def.id==='hub'))__ht.enterHub()});
  await p.waitForFunction(()=>HT.People&&(HT.People.ok||HT.People.failed),null,{timeout:120000,polling:1000});
  await p.evaluate(()=>HT.People.preload(HT.People.keys));
  await p.evaluate(()=>{const P=__ht.P;if(P.dude&&!P.dude.rb)__ht.enterHub()});
  await p.evaluate(fs.readFileSync(path.join(__dirname,'helpers.js'),'utf8'));
  log('ready',await p.evaluate(()=>JSON.stringify({q:__ht.render.q,people:HT.People.ok,keys:HT.People.keys.length})));
  fs.writeFileSync(path.join(OUT,'READY'),'1');
  for(;;){
    if(fs.existsSync(path.join(JOBS,'STOP'))){fs.unlinkSync(path.join(JOBS,'STOP'));break}
    if(fs.existsSync(path.join(JOBS,'RELOAD_HELPERS'))){fs.unlinkSync(path.join(JOBS,'RELOAD_HELPERS'));await p.evaluate(fs.readFileSync(path.join(__dirname,'helpers.js'),'utf8'));log('helpers reloaded')}
    const files=fs.readdirSync(JOBS).filter(f=>f.endsWith('.js')).sort();
    if(!files.length){await p.waitForTimeout(500);continue}
    const f=files[0],name=f.replace(/\.js$/,''),src=fs.readFileSync(path.join(JOBS,f),'utf8');fs.unlinkSync(path.join(JOBS,f));
    let job;try{const m={exports:{}};new Function('module','exports',src)(m,m.exports);job=m.exports}catch(e){log('bad job',f,e.message);fs.writeFileSync(path.join(OUT,name+'.err'),String(e.stack));continue}
    const t0=Date.now();errs.length=0;
    try{
      const w=job.w||1920,h=job.h||1080;await p.setViewportSize({width:w,height:h});
      await p.evaluate(h=>{document.documentElement.classList.toggle('st-nohud',!h);let s=document.getElementById('st-hud-style');if(!s){s=document.createElement('style');s.id='st-hud-style';document.head.appendChild(s)}
        s.textContent=h?'#strm,#lock{visibility:hidden!important}':'.ht-root,#lock,.hud,#banner,#strm{visibility:hidden!important}'},!!job.hud);
      await p.evaluate(()=>{__ht.render.apply('high');window.dispatchEvent(new Event('resize'))});
      const info=await p.evaluate(`(async()=>{${job.run}})()`);
      for(const k of(job.press||[])){if(typeof k==='number'){await p.waitForTimeout(k);continue}await p.keyboard.press(k);await p.waitForTimeout(350)}
      if(job.run2)await p.evaluate(`(async()=>{${job.run2}})()`);
      /* settle: stream chunks / characters around the camera, re-render from the same camera */
      for(let k=0;k<60;k++){await p.waitForTimeout(job.settleMs||500);await p.evaluate(`(async()=>{${job.frame||'T_.redraw()'}})()`);
        if(k+1>=(job.settle||4)){const pe=await p.evaluate(()=>T_.pending());if(!pe.people&&!pe.ow&&!pe.stream&&!pe.box)break}}
      if(job.after)await p.evaluate(`(async()=>{${job.after}})()`);
      const pend=await p.evaluate(()=>T_.pending());
      await p.screenshot({path:path.join(OUT,name+'.png')});
      if(job.matte){try{await p.evaluate(o=>T_.matte(o),job.only||null);await p.screenshot({path:path.join(OUT,name+'-matte.png')})}finally{await p.evaluate(()=>T_.unmatte())}}
      if(job.sky){try{await p.evaluate(()=>T_.skymask());await p.screenshot({path:path.join(OUT,name+'-sky.png')})}catch(e){log('skymask failed',e.message)}}
      fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify({info,pend,errs:errs.slice(0,20),ms:Date.now()-t0},null,1));
      log('done',name,Date.now()-t0+'ms',JSON.stringify(pend))
    }catch(e){log('job failed',name,e.message);fs.writeFileSync(path.join(OUT,name+'.err'),String(e.stack||e))}
  }
  await b.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
