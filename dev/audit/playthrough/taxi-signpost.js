/* Repro: Dad Taxi (required story job) is offered only by the fridge at home, and nothing tells the player.
   Fresh save -> Return to Sender won (finish) -> hub: objective panel, marker, every giver -> at home: home objective, the prompt on
   the fridge -> E at the fridge (real key) -> the brief -> accept -> out the front door -> objective panel after 3 s of play.
   node dev/audit/playthrough/taxi-signpost.js */
const {open}=require('./lib.js');
(async()=>{const r=await open({fresh:true}),{p,b,errs}=r,ev=r.ev;const out=(k,v)=>console.log(k.padEnd(28),typeof v==='string'?v:JSON.stringify(v));
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(400);await p.evaluate(async()=>{await window.__ht.jobs.ready});
  await ev(()=>{const H=window.__ht;H.step(3);H.startMission(0)});await p.evaluate(async()=>{const w=window.__ht.jobs.castWait;if(w)await w});
  await ev(()=>{const H=window.__ht;H.step(3);H.jobs.finish(true);H.step(40)});await p.waitForTimeout(500);
  await ev(()=>{const H=window.__ht;const a=H.UIacts&&H.UIacts['result:go'];if(a)a();if(H.mode!=='hub')H.enterHub();H.step(10);H.draw()});
  const hub=await ev(()=>{const H=window.__ht;return{obj:[H.UIobj.title,...H.UIobj.lines.map(l=>l.text)],marker:H.marker&&H.marker.label,givers:H.npcs.filter(n=>n.marker).map(n=>n.id+':'+H.MISSIONS[n.marker.i].id),taxiLock:H.jobs.lock('taxi')}});
  out('hub after job 1',hub);out('objective mentions taxi?',String(hub.obj.some(l=>/Jen|fridge|Taxi|list/i.test(l))));
  await ev(()=>window.__ht.enterHome());await p.waitForFunction(()=>window.__ht.mode==='home',null,{timeout:60000});
  const it=await ev(()=>{const H=window.__ht;H.step(3);const f=H.home.interactables.find(i=>i.id==='fridge');return f?{x:f.x,z:f.z}:null});
  const home=await ev(f=>{const H=window.__ht;let pr=null,tries=[];for(let k=0;k<40;k++){const a=k*0.9,rr=.3+.05*(k%10);H.P.pos.set(f.x+Math.cos(a)*rr,0,f.z+Math.sin(a)*rr);H.step(2);H.draw();pr=H.prompt;tries.push(pr&&pr.text);if(pr&&/fridge/i.test(pr.text))break}
    return{obj:[H.UIobj.title,...H.UIobj.lines.map(l=>l.text)],prompt:pr,otherPromptsNearFridge:[...new Set(tries)]}},it);
  out('home objective + fridge prompt',home);
  await p.keyboard.press('e');await ev(()=>window.__ht.step(2));await p.waitForTimeout(500);
  const br=await ev(()=>{const H=window.__ht,e=document.querySelector('.ht-brief');return{screen:H.HUD.screen,title:e&&e.querySelector('h2')&&e.querySelector('h2').textContent,acts:Object.keys(H.UIacts||{})}});out('E at the fridge',br);
  if(br.acts.includes('brief:go')){await ev(()=>{const H=window.__ht;H.UIacts['brief:go']();H.step(2);H.exitHome('front')});await p.waitForTimeout(300);
    const after=await ev(()=>{const H=window.__ht;H.step(90);H.draw();return{job:H.JOB,obj:[H.UIobj.title,...H.UIobj.lines.map(l=>l.text)],marker:H.marker&&H.marker.label,objDom:(document.querySelector('.ht-obj')||{}).textContent}});
    out('3 s after accepting',after);await r.live();await p.waitForTimeout(2500);await r.shot('taxi-accepted-stale-objective');}
  console.log('console errors',errs.length);await b.close()})().catch(e=>{console.error(e);process.exit(1)});
