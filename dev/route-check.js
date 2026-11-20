/* HUD minimap route search (js/hud.js findRoute) in the real game: bounded time and memory from a roof, to unreachable or
   off-map targets, and under a target that changes every frame (the Higher Ground roof hang). node dev/route-check.js */
const {open}=require('./ai-ingame-lib.js');let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{const H=window.__ht,F=H.HUD.minimap.findRoute,W=H.WORLD,c=W.places.center,roof=W.sites.roof,far=W.sites.duke.ring,out={};
    const time=f=>{const t=performance.now();const v=f();return[v,Math.round(performance.now()-t)]};
    let[v,ms]=time(()=>F({x:c.x,z:c.z},far));out.roof={n:v.length,ms};
    [v,ms]=time(()=>F({x:c.x,z:c.z},far,{drive:true}));out.roofDrive={n:v.length,ms};
    [v,ms]=time(()=>F({x:5,z:5},{x:W.W*2-5,z:W.H*2-5}));out.corner={n:v.length,ms};
    [v,ms]=time(()=>F({x:-100,z:-100},{x:1e6,z:1e6}));out.offMap={n:v.length,ms};
    [v,ms]=time(()=>F({x:NaN,z:0},far));out.nan={n:v.length,ms};
    const heap0=performance.memory?performance.memory.usedJSHeapSize:0;const t=performance.now();for(let i=0;i<60;i++)F({x:c.x,z:c.z},{x:far.x+i,z:far.z});out.burst={ms:Math.round(performance.now()-t),heapMB:performance.memory?Math.round((performance.memory.usedJSHeapSize-heap0)/1e6):0};
    /* the live path: stand on the roof, a target object that changes every frame, 300 rendered HUD frames */
    H.P.pos.set(c.x,0,c.z);const t2=performance.now();for(let i=0;i<300;i++){H.step(1);H.HUD.update({mode:'mission',player:{x:c.x,z:c.z},routeTo:{x:far.x+i*.1,z:far.z},hp:100,hpMax:100},1/30)}out.live={ms:Math.round(performance.now()-t2),stats:H.HUD.minimap.routeStats()};return out});
  console.log(JSON.stringify(r));
  ok(r.roof.n>1&&r.roof.ms<400,'from the community-center roof to the scrapyard: '+r.roof.n+' points in '+r.roof.ms+' ms');
  ok(r.roofDrive.n>1&&r.roofDrive.ms<400,'same, driving: '+r.roofDrive.ms+' ms');ok(r.corner.ms<600,'corner to corner: '+r.corner.ms+' ms');
  ok(r.offMap.ms<600&&r.nan.n===0,'off-map and NaN targets answer fast ('+r.offMap.ms+' ms) and NaN gives no route');
  ok(r.burst.ms<60*300&&r.burst.heapMB<200,'60 searches: '+r.burst.ms+' ms, heap +'+r.burst.heapMB+' MB');
  ok(r.live.stats.runs<=150&&r.live.ms<60000,'300 live HUD frames on the roof with a moving target: '+r.live.ms+' ms, '+JSON.stringify(r.live.stats));
  ok(!errs.length,'no console errors '+errs.slice(0,3).join(' | '));await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
