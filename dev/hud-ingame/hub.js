const L=require('./lib.js');const DPR=+process.env.DPR||1;
(async()=>{const {browser,page,errs}=await L.open({deviceScaleFactor:DPR});
  const ev=f=>page.evaluate(f);const step=(n)=>page.evaluate(n=>__ht.step(n),n);
  await page.waitForFunction(()=>window.__ht&&__ht.assets.done,null,{timeout:60000});await page.waitForTimeout(400);
  await L.click(page,'.ht-title [data-act=newgame]');await page.waitForTimeout(300);
  console.log('mode after start',await ev(()=>({screen:HT.HUD.screen,running:true})));
  // face the job giver from 7 m
  const mk=await ev(()=>{const m=__ht.L.markers.find(m=>m.i===__ht.prog.done.findIndex(d=>!d));const P=__ht.P;P.pos.set(m.x+2,0,m.z-6.5);P.yaw=Math.atan2(-(m.x-P.pos.x),-(m.z-P.pos.z));P.pitch=-.05;return m});
  await step(20);await page.waitForTimeout(700);await L.shot(page,'hub_wide');
  // alignment: marker x vs NPC screen x (projected through the game camera via the marker element)
  console.log('marker',await ev(()=>{const e=document.querySelector('.ht-mk');const t=document.querySelector('.ht-mk .l');return e&&{tf:e.style.transform,label:t.textContent,edge:e.classList.contains('edge')}}));
  // talk -> brief
  await ev(()=>{const m=__ht.L.markers.find(m=>m.i===0);const P=__ht.P;P.pos.set(m.x+1.8,0,m.z);P.yaw=Math.atan2(-(m.x-P.pos.x),-(m.z-P.pos.z))});
  await step(3);await page.waitForTimeout(300);
  const pr=await ev(()=>document.querySelector('.ht-pr:not(.off) .tt')?.textContent);console.log('prompt',pr);
  
  await page.keyboard.down('e');await page.waitForTimeout(50);await step(1);await page.keyboard.up('e');await page.waitForTimeout(700);
  console.log('screen',await ev(()=>HT.HUD.screen));await L.shot(page,'brief_wide');
  await L.click(page,'.ht-brief [data-act="brief:no"]');await page.waitForTimeout(500);console.log('after no',await ev(()=>HT.HUD.screen));
  await page.keyboard.down('e');await step(1);await page.keyboard.up('e');await page.waitForTimeout(500);console.log('reopen',await ev(()=>({s:HT.HUD.screen,lock:!!document.pointerLockElement,d:(()=>{const m=__ht.L.markers.find(m=>m.i===0);return Math.hypot(m.x-__ht.P.pos.x,m.z-__ht.P.pos.z)})()})));
  await page.keyboard.press('Escape');await page.waitForTimeout(400);console.log('after esc',await ev(()=>HT.HUD.screen));
  await page.keyboard.down('e');await step(1);await page.keyboard.up('e');await page.waitForTimeout(500);
  await ev(()=>{window._acts=[];HT.HUD.on('action',a=>_acts.push(a));document.addEventListener('click',e=>_acts.push('click:'+e.target.className+'@'+e.clientX+','+e.clientY),true)});
  await L.click(page,'.ht-brief [data-act="brief:go"]');await page.waitForTimeout(500);
  await page.waitForTimeout(300);console.log('acts',await ev(()=>_acts));console.log('after go',await ev(()=>({screen:HT.HUD.screen,obj:document.querySelector('.ht-obj .t').textContent,lines:[...document.querySelectorAll('.ht-obj li')].map(l=>l.textContent+(l.classList.contains('done')?' [x]':''))})));
  // walk to van, get in
  await ev(()=>{const V=__ht.VAN,P=__ht.P;P.pos.set(V.pos.x+3,0,V.pos.z+.5);P.yaw=Math.atan2(-(V.pos.x-P.pos.x),-(V.pos.z-P.pos.z))});await step(5);await page.waitForTimeout(400);
  await L.shot(page,'hub_van_wide');
  await ev(()=>{__ht.use=true});await step(1);
  console.log('van on',await ev(()=>__ht.VAN.on));
  await page.keyboard.down('w');for(let i=0;i<6;i++){await step(10)};await page.waitForTimeout(400);
  console.log('drive',await ev(()=>({spd:document.querySelector('.ht-drv .spd').textContent,drv:!document.querySelector('.ht-drv').hidden,wp:document.querySelector('.ht-wp').hidden,lines:[...document.querySelectorAll('.ht-obj li')].map(l=>l.textContent+(l.classList.contains('done')?' [x]':''))})));
  await L.shot(page,'drive_wide');await page.keyboard.up('w');
  // map + keyboard fast travel
  console.log('pre-m',await ev(()=>({scr:HT.HUD.screen,act:document.activeElement.tagName+'.'+document.activeElement.className})));await page.keyboard.press('m');await page.waitForTimeout(500);console.log('map',await ev(()=>HT.HUD.minimap.mapOpen));
  await page.keyboard.press('Tab');await page.waitForTimeout(200);await L.shot(page,'map_wide');
  const before=await ev(()=>[__ht.VAN.pos.x,__ht.VAN.pos.z]);
  await page.keyboard.press('Enter');await page.waitForTimeout(400);
  console.log('travel',before,await ev(()=>[__ht.VAN.pos.x,__ht.VAN.pos.z,HT.HUD.minimap.mapOpen]));
  console.log('ERRS',errs);await browser.close()})();
