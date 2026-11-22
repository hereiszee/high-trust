/* Keyboard rebinding with real (trusted) input events: node dev/audit/input/rebind.js
   1. sentences vs keycaps after rebinding Use to U (tutorial, prompts)
   2. an action bound onto a key a job reads directly (X = crossing "call Rick", Z = scope zoom / jet rudder)
   3. a rebound non-letter key released after Shift went down (key value changes between down and up)
   4. layout: trusted events with AZERTY / Dvorak key+code pairs (CDP Input.dispatchKeyEvent)
   5. Mouse 4 (back) bound to Jump through the real capture screen, CDP mouse events */
const {boot}=require('./lib.js');
(async()=>{const r=await boot();const {ev,p}=r;const out={};const cdp=await p.context().newCDPSession(p);
  const key=async(type,k,code,vk,text)=>cdp.send('Input.dispatchKeyEvent',{type,key:k,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk,text:type==='keyDown'?text:undefined,unmodifiedText:type==='keyDown'?text:undefined});
  await p.click('.ht-title [data-act=newgame]');await r.wait(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);localStorage.removeItem('ht-keys');HT.Keys.reset();
    window.__seen=[];addEventListener('keydown',e=>window.__seen.push(e.key+'/'+e.code+(e.isTrusted?'':'*')))});
  /* 1 */
  await ev(()=>HT.Keys.set('use','u'));
  out.tut=await ev(()=>{const H=window.__ht;H.TUT.done.look=H.TUT.done.walk=H.TUT.done.jog=1;H.TUT.done.talk=1;H.setJob(0);for(let i=0;i<120;i++){H.step(1);H.tutTick(1/30)}HT.Pad.swapGlyphs();
    const t=document.querySelector('.ht-tut');return t?{shown:!t.classList.contains('off'),keycap:t.querySelector('.ht-kc').textContent,text:t.querySelector('.tt').textContent}:null});
  out.prompt=await ev(()=>{const H=window.__ht,V=H.VAN;H.P.pos.set(V.pos.x+2.4,0,V.pos.z);H.step(6);HT.Pad.swapGlyphs();const pr=document.querySelector('.ht-pr:not(.ht-tut)');return pr?pr.innerText.replace(/\n/g,' '):null});
  await r.shot('rebind-use-U-tutorial');
  await ev(()=>HT.Keys.reset());
  /* 2 */
  await ev(()=>{HT.Keys.set('crouch','x');window.__seen.length=0});await p.keyboard.press('KeyX');
  out.boundX_press_X_reaches_window_as=await ev(()=>window.__seen.slice());
  await ev(()=>{HT.Keys.reset();HT.Keys.set('jump','z');window.__seen.length=0});await p.keyboard.press('KeyZ');
  out.boundZ_press_Z_reaches_window_as=await ev(()=>window.__seen.slice());
  out.relabel_X_Z=await ev(()=>({X:HT.Keys.relabel('X'),Z:HT.Keys.relabel('Z')}));
  await ev(()=>HT.Keys.reset());
  /* 3 */
  await ev(()=>{HT.Keys.set('fwd','4');for(const k in window.__ht.keys)window.__ht.keys[k]=false});
  await p.keyboard.down('Digit4');const w1=await ev(()=>window.__ht.keys.w);await p.keyboard.down('Shift');await p.keyboard.up('Digit4');await p.keyboard.up('Shift');
  const w2=await ev(()=>window.__ht.keys.w);const pos0=await ev(()=>{const P=window.__ht.P;return[P.pos.x,P.pos.z]});await r.step(30);const pos1=await ev(()=>{const P=window.__ht.P;return[P.pos.x,P.pos.z]});
  out.fwdOn4_shiftRelease={down:w1,afterRelease:w2,movedAfterRelease:+Math.hypot(pos1[0]-pos0[0],pos1[1]-pos0[1]).toFixed(2)};
  await ev(()=>{HT.Keys.reset();for(const k in window.__ht.keys)window.__ht.keys[k]=false});
  /* 4 AZERTY: the key in the QWERTY "W" place types z, the "A" place types q, the "M" key sits where QWERTY has ";" and the QWERTY "M" place types "," */
  const az=async(k,code,vk)=>{await ev(()=>{window.__seen.length=0;for(const x in window.__ht.keys)window.__ht.keys[x]=false});await key('keyDown',k,code,vk,k);const s=await ev(()=>({keys:Object.keys(window.__ht.keys).filter(x=>window.__ht.keys[x]),cur:window.__ht.P.cur,map:window.__ht.HUD.minimap.mapOpen}));await key('keyUp',k,code,vk);return s};
  await ev(()=>window.__ht.give('shotgun'));
  out.azerty={physW_types_z:await az('z','KeyW',90),physA_types_q:await az('q','KeyA',81)};
  const m1=await az('m','Semicolon',77);await ev(()=>{if(window.__ht.HUD.minimap.mapOpen)window.__ht.HUD.minimap.toggle&&window.__ht.HUD.minimap.toggle()});
  const m2=await az(',','KeyM',188);out.azerty.labelled_M_key_opens_map=m1.map;out.azerty.comma_key_opens_map=m2.map;
  await r.wait(400);await ev(()=>{const mm=window.__ht.HUD.minimap;if(mm.mapOpen)window.dispatchEvent(new KeyboardEvent('keydown',{key:'m',code:'KeyM'}))});await r.wait(400);
  /* 5 Mouse 4 via the real capture screen */
  await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
  await ev(()=>{try{document.exitPointerLock()}catch(e){}});await r.wait(300);
  await ev(()=>{if(!HT.Input.paused)window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))});await r.wait(500);
  await p.click('.ht-pause [data-tab=keys]');await r.wait(200);
  const bb=await p.locator('[data-rebind=jump]').boundingBox();await p.click('[data-rebind=jump]');
  for(const t of['mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type:t,x:bb.x+bb.width/2,y:bb.y+bb.height/2,button:'back',buttons:t==='mousePressed'?8:0,clickCount:1});
  await r.wait(400);out.url_after_mouse4=p.url();out.game_still_loaded=await ev(()=>!!window.HT);if(!out.game_still_loaded){out.errs=r.errs.slice(0,4);console.log(JSON.stringify(out,null,1));await r.b.close();return}out.mouse4_capture={jump:await ev(()=>HT.Keys.get('jump')),label:(await p.textContent('[data-rebind=jump]')).trim()};
  await r.shot('rebind-screen-mouse4');
  out.errs=r.errs.slice(0,4);console.log(JSON.stringify(out,null,1));await r.b.close()})().catch(e=>{console.error(e);process.exit(1)});
