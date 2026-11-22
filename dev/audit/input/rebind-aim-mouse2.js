/* Keyboard + mouse: Aim rebound away from Mouse 2 (to K, or to Mouse 5). Do the job tools that listen for the right button
   directly still work with the new Aim input? Crossing's stop sign; HOA's phone. Real (trusted) key and mouse events.
   node dev/audit/input/rebind-aim-mouse2.js */
const {boot}=require('./lib.js');
(async()=>{const r=await boot();const {ev,p}=r;const out={};const cdp=await p.context().newCDPSession(p);
  await p.click('.ht-title [data-act=newgame]');await r.wait(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);HT.Keys.reset();const j=H.jobs.registry.get('crossing');j.test.give(H.jobs.api);H.jobs.start('crossing');H.step(3);
    for(let f=0;f<3000&&!(H.M&&H.M.cg&&H.M.cg.gear);f++){j.test.step(H.jobs.api,f,{});H.step(1)}for(const k in H.keys)H.keys[k]=false;H.M.cg.signOn=false;H.step(2)});
  const C=await ev(()=>{const b=window.__ht.renderer.domElement.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}});await p.mouse.move(C.x,C.y);
  const sign=()=>ev(()=>{window.__ht.step(2);return !!window.__ht.M.cg.signOn});const off=()=>ev(()=>{window.__ht.M.cg.signOn=false});
  await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});out.default_rightClick=await sign();await off();
  await ev(()=>HT.Keys.set('aim','k'));await p.keyboard.press('KeyK');out.aimOnK_pressK=await sign();await off();
  await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});out.aimOnK_rightClick=await sign();await off();
  await ev(()=>{HT.Keys.reset();HT.Keys.set('aim','mouse5')});
  for(const t of['mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type:t,x:C.x,y:C.y,button:'forward',buttons:t==='mousePressed'?16:0,clickCount:1});
  out.aimOnMouse5_pressMouse5=await sign();await off();
  out.objectiveText=await ev(()=>{window.__ht.step(2);return [...document.querySelectorAll('.ht-obj li,.ht-obj .t')].map(e=>e.textContent).join(' | ')});
  out.chipKeycap=await ev(()=>[...document.querySelectorAll('.ht-gc .ht-kc')].map(e=>e.textContent).join(','));
  console.log(JSON.stringify(out,null,1));console.log('errs',r.errs.slice(0,3));await r.b.close()})().catch(e=>{console.error(e);process.exit(1)});
