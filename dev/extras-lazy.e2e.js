/* PERF-05 regression. node dev/extras-lazy.e2e.js
   Serves the repo the way the Steam build ships it (only assets/opt, fonts, credits: any other assets/ path 404s), then checks:
   nothing from assets/home is requested before Start; no 404s or console errors through title -> hub; the interior furniture
   (HT.World.needExtras) loads on demand from assets/opt/home, every model. */
const {open}=require('./ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const miss=[],home=[];let startAt=null;
  const {b,p,errs}=await open({before:async p=>{
    p.on('request',r=>{const u=r.url();if(/\/assets\/(opt\/)?home\//.test(u))home.push({u:u.replace(/^.*?\/assets\//,'assets/'),t:Date.now()})});
    await p.route(/http:\/\/ht\.local\/assets\/(?!opt\/|fonts\/|credits\/|CREDITS\.md)/,r=>{miss.push(new URL(r.request().url()).pathname);r.fulfill({status:404,body:'nf'})})}});
  startAt=Date.now();
  ok(home.length===0,'nothing from assets/home requested before Start ('+home.length+')');
  const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
  await p.click('.ht-title [data-act=newgame]');await p.waitForFunction(()=>window.__ht.mode==='hub',null,{timeout:60000});
  const r=await ev(async()=>{await HT.World.needExtras();return{ready:HT.World.extrasReady(),loaded:HT.World.extrasLoaded(),of:HT.World.EXTRA_MODELS.length}});
  ok(r.ready&&r.loaded===r.of,'interior furniture loads on demand: '+r.loaded+'/'+r.of);
  ok(home.length>0&&home.every(h=>/^assets\/opt\/home\//.test(h.u)),'every furniture request is the optimised tier ('+home.length+' requests, e.g. '+(home[0]&&home[0].u)+')');
  ok(miss.length===0,'no request for a file the Steam build does not ship'+(miss.length?': '+miss.slice(0,5).join(' '):''));
  ok(errs.length===0,'no console errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(99)});
