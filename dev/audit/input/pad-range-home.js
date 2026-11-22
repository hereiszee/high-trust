/* Pad only: (1) the Fort Sensible range rack menu (pick a gun, back out); (2) Decorate at home (B on the keyboard).
   node dev/audit/input/pad-range-home.js */
const {boot,LEAK_SRC}=require('./lib.js');
(async()=>{const r=await boot();const {ev,p}=r;const out={};
  await p.click('.ht-title [data-act=newgame]');await r.wait(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.WM.beat=true;if(H.save&&H.save.flags)H.save.flags.act2Intro=true;H.step(2);HT.Roam.fastTravel('base');H.step(30)});await r.wait(600);
  out.place=await ev(()=>{const H=window.__ht;if(H.CV)H.exitVehicle();H.step(3);const d=HT.Base.def().range;H.P.pos.set(d.rack.x-1.6,0,d.rack.z);H.P.yaw=-Math.PI/2;H.P.pitch=-.1;H.step(6);return{x:H.P.pos.x,z:H.P.pos.z,menu:HT.Range.menu(),pr:(document.querySelector('.ht-pr:not(.off)')||{}).innerText||null}});
  await r.pad();await ev(()=>{__T.set({axes:[0,0,.3,0]});__T.set({axes:[0,0,0,0]})});
  await ev(()=>{__T.tap(0);window.__ht.step(2)});out.afterA=await ev(()=>HT.Range.menu());if(!out.afterA.open){await ev(()=>{__T.tap(3);window.__ht.step(2)});out.afterY=await ev(()=>HT.Range.menu())}
  out.menuLeaks=await ev(LEAK_SRC);await r.shot('pad-range-menu');
  const tryB=async(n,f)=>{const i0=await ev(()=>HT.Range.menu());await ev(f);await r.wait(80);await ev(()=>{__T.tick(2);window.__ht.step(2)});const i1=await ev(()=>HT.Range.menu());out['menu_'+n]=JSON.stringify(i0)+' -> '+JSON.stringify(i1)};
  await tryB('dpadRight',()=>__T.tap(15));await tryB('dpadDown',()=>__T.tap(13));await tryB('stickRight',()=>{__T.set({axes:[1,0,0,0]});__T.tick(10);__T.set({axes:[0,0,0,0]})});
  await tryB('RB',()=>__T.tap(5));await tryB('B',()=>__T.tap(1));
  out.focusInMenu=await r.focus();
  await tryB('MENU',()=>__T.tap(9));out.pausedAfterMenu=await ev(()=>HT.Input.paused);
  /* home */
  await ev(()=>{if(HT.Input.paused)window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))});await r.wait(400);
  out.home=await ev(async()=>{const H=window.__ht;if(H.CV)H.exitVehicle();H.step(2);H.enterHome();for(let i=0;i<60&&H.mode!=='home';i++){await new Promise(r=>setTimeout(r,100));H.step(1)}H.step(5);return{mode:H.mode,obj:(document.querySelector('.ht-obj')||{}).innerText}});
  await ev(()=>{__T.set({axes:[0,0,.3,0]});__T.set({axes:[0,0,0,0]})});
  out.homeLeaks=await ev(LEAK_SRC);await r.shot('pad-home');
  const deco=()=>ev(()=>document.body.classList.contains('decoOn'));
  for(const [n,b] of [['A',0],['B',1],['X',2],['Y',3],['LB',4],['RB',5],['L3',10],['R3',11],['DUP',12],['DDOWN',13],['DLEFT',14],['DRIGHT',15]]){await ev(b=>{__T.tap(b);window.__ht.step(2)},b);await r.wait(80);const d=await deco();if(d){out.decoBy=n;break}}
  await ev(()=>{__T.set({buttons:{4:1}});for(const b of[0,1,2,3,12,13,14,15])__T.tap(b);__T.set({buttons:{4:0}});__T.tick();window.__ht.step(2)});await r.wait(100);
  out.decoAfterAll=await deco();
  out.keysSent=await ev(()=>[...new Set(__T.keys.filter(k=>!k.startsWith('^')))].join(' '));
  /* control: keyboard B */
  await p.keyboard.press('b');await ev(()=>window.__ht.step(2));out.decoKeyboardB=await deco();
  await ev(()=>{__T.set({axes:[0,0,.3,0]});__T.set({axes:[0,0,0,0]});window.__ht.step(4)});out.decoPanelLeaks=await ev(LEAK_SRC);await r.shot('pad-decorate-panel');
  console.log(JSON.stringify(out,null,1));console.log('errs',r.errs.slice(0,4));await r.b.close()})().catch(e=>{console.error(e);process.exit(1)});
