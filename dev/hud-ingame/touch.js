const L=require('./lib.js');
(async()=>{const {browser,page,errs}=await L.open({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const ev=(f,a)=>page.evaluate(f,a);const step=n=>page.evaluate(n=>__ht.step(n),n);
  const frames=(n=3)=>page.evaluate(n=>new Promise(r=>{let k=0;const f=()=>{if(++k>=n)r();else requestAnimationFrame(f)};requestAnimationFrame(f)}),n);
  const cdp=await page.context().newCDPSession(page);
  const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y],i)=>({x,y,id:i}))});
  await page.waitForFunction(()=>window.__ht&&__ht.assets.done,null,{timeout:60000});await page.waitForTimeout(400);
  console.log('coarse',await ev(()=>document.querySelector('.ht-root').classList.contains('touch')));
  await L.shot(page,'title_tall');
  await page.tap('.ht-title [data-act=newgame]');await page.waitForTimeout(400);await frames(3);
  await L.shot(page,'hub_tall');
  // joystick: drag up from the left half
  const p0=await ev(()=>[__ht.P.pos.x,__ht.P.pos.z]);
  await touch('touchStart',[[90,700]]);await touch('touchMove',[[90,640]]);await frames(2);
  console.log('stick on',await ev(()=>document.querySelector('.ht-stick').classList.contains('on')));
  await L.shot(page,'joystick_tall');
  await step(30);await touch('touchEnd',[]);await frames(2);
  const p1=await ev(()=>[__ht.P.pos.x,__ht.P.pos.z]);console.log('moved',Math.hypot(p1[0]-p0[0],p1[1]-p0[1]).toFixed(2),'stick off',await ev(()=>!document.querySelector('.ht-stick').classList.contains('on')));
  // drive cluster vs joystick
  await ev(()=>{const V=__ht.VAN,P=__ht.P;P.pos.set(V.pos.x+3,0,V.pos.z+.5)});await step(3);await ev(()=>{__ht.use=true});await step(1);
  console.log('van',await ev(()=>__ht.VAN.on));
  await touch('touchStart',[[90,700]]);await touch('touchMove',[[90,640]]);await step(40);await frames(3);
  const r=await ev(()=>{const b=e=>{const r=document.querySelector(e).getBoundingClientRect();return[Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)]};return{drv:b('.ht-drv'),stick:b('.ht-stick'),use:b('.ht-tb[data-a=use]'),view:b('.ht-tb[data-a=view]'),mm:b('.ht-mm')}});console.log('rects',JSON.stringify(r));
  await L.shot(page,'drive_tall');await touch('touchEnd',[]);
  // mission: buttons
  await ev(()=>__ht.startMission(0));await page.waitForTimeout(4500);await step(5);await frames(3);
  await L.shot(page,'mission_tall');
  const m0=await ev(()=>__ht.P.ammo[__ht.P.cur].mag);
  await page.tap('.ht-tb[data-a=fire]');await step(2);console.log('fire mag',m0,'->',await ev(()=>__ht.P.ammo[__ht.P.cur].mag));
  await step(10);await page.tap('.ht-tb[data-a=reload]');await step(1);console.log('reload',await ev(()=>__ht.P.reloadT>0));
  await page.tap('.ht-tb[data-a=crouch]');console.log('crouch',await ev(()=>__ht.P.crouch));
  const g=await ev(()=>__ht.P.cur);await step(40);await page.tap('.ht-tb[data-a=swap]');console.log('swap',g,'->',await ev(()=>__ht.P.cur));
  await page.tap('.ht-tb[data-a=view]');console.log('view fp',await ev(()=>__ht.P.fp));await page.tap('.ht-tb[data-a=view]');
  await page.tap('.ht-tb[data-a=aim]');console.log('aim',await ev(()=>__ht.P.aim));await page.tap('.ht-tb[data-a=aim]');
  await page.tap('.ht-tb[data-a=map]');await page.waitForTimeout(500);console.log('map',await ev(()=>HT.HUD.minimap.mapOpen));await L.shot(page,'map_tall');
  await page.tap('.ht-map .zb button[data-z="0"]');await page.waitForTimeout(400);console.log('map closed',await ev(()=>!HT.HUD.minimap.mapOpen));
  await page.tap('.ht-tb[data-a=pause]');await page.waitForTimeout(500);console.log('pause',await ev(()=>HT.HUD.screen));await L.shot(page,'pause_tall');
  await page.tap('.ht-pause [data-act=resume]');await page.waitForTimeout(400);console.log('resumed',await ev(()=>HT.HUD.screen));
  console.log('ERRS',errs);await browser.close()})();
