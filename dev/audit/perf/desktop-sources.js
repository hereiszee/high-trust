/* perf audit: what the game requests that the Steam build does not ship. desktop/electron-builder.config.js ships only assets/opt/**,
   assets/fonts/**, assets/credits/** and CREDITS.md (unless HT_FULL_ASSETS=1). This serves the repo like that (any other assets/ path
   404s), loads the title, enters the hub, waits, and lists every 404 plus whether js/world.js's interior furniture (EXTRA) ended up loaded.
   node dev/audit/perf/desktop-sources.js */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
(async()=>{const miss=[];const {b,p,errs}=await lib.open({before:async p=>{await p.route(/http:\/\/ht\.local\/assets\/(?!opt\/|fonts\/|credits\/|CREDITS\.md)/,r=>{miss.push(new URL(r.request().url()).pathname);r.fulfill({status:404,body:'not shipped'})})}});
  const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]');await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(5);await new Promise(r=>setTimeout(r,8000))});
  const r=await ev(()=>({extrasReady:HT.World&&HT.World.extrasReady?HT.World.extrasReady():null}));
  const by={};for(const u of miss){const k=u.split('/').slice(0,3).join('/');by[k]=(by[k]||0)+1}
  console.log('requests for files the Steam build does not ship:',miss.length,JSON.stringify(by));console.log('first few:',miss.slice(0,8).join(' '));
  console.log('world.js extras settled:',JSON.stringify(r));console.log('console errors',errs.length,errs.slice(0,4));await b.close()})();
