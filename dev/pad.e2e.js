/* Controller layer (js/gamepad.js) in the real game, headless, with a scripted pad: node dev/pad.e2e.js
   menus (first D-pad press moves), the LB layer for job keys, job keycaps as pad glyphs, tank and jet mappings, map pan / zoom /
   places / travel / close, Aim hold vs toggle on LT. The page's rAF is held by the harness, so the test ticks the pad loop itself. */
const {open}=require('./ai-ingame-lib.js'),{FAKE_PAD}=require('../desktop/test/fake-pad.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(2)});
  await ev(FAKE_PAD);
  /* page helpers: press = set buttons/axes and tick; log every key event the pad sends */
  await ev(()=>{const T=window.__T={keys:[],t:1000};
    for(const ty of['keydown','keyup'])addEventListener(ty,e=>{if(!e.isTrusted)T.keys.push(ty[3]==='d'?e.key:'^'+e.key)},true);
    T.tick=(n=1)=>{for(let i=0;i<n;i++){T.t+=16;HT.Pad._tick(T.t)}};
    T.set=o=>{window.__pad.set(o);T.tick()};
    T.tap=(i,n=1)=>{T.set({buttons:{[i]:1}});T.tick(n);T.set({buttons:{[i]:0}});T.tick()};
    T.clear=()=>{T.keys.length=0}});
  await ev(()=>{__T.set({axes:[0,0,.6,0]});__T.set({axes:[0,0,0,0]})});
  ok(await ev(()=>document.documentElement.classList.contains('ht-pad')),'a pad input switches to controller prompts');
  /* LB layer */
  await ev(()=>{__T.clear();__T.tap(4)});ok(await ev(()=>__T.keys.includes('g')),'LB tapped alone sends G');
  await ev(()=>{__T.clear();__T.set({buttons:{4:1}});__T.tap(0);__T.tap(12);__T.tap(14);__T.set({buttons:{4:0}});__T.tick()});
  const lay=await ev(()=>__T.keys.filter(k=>!k.startsWith('^')));
  ok(lay.join(',')==='1,t,z','LB + A / D-pad ↑ / D-pad ← send 1, T, Z and nothing else ('+lay.join(',')+')');
  /* job keycaps */
  const gl=await ev(()=>{const d=document.createElement('div');d.className='ht-root';d.innerHTML='<b class="ht-kc">G</b><b class="ht-kc">T</b><b class="ht-kc">Tab</b><b class="ht-kc">2</b><b class="ht-kc">E</b>';document.body.appendChild(d);HT.Pad.swapGlyphs();const r=[...d.children].map(x=>x.textContent);d.remove();return r});
  ok(gl.join(',')==='LB,LB+↑,LB+↓,LB+B,A','job keycaps become pad glyphs: '+gl.join(','));
  /* key names inside sentences (objectives, radio, prompts) */
  const tx=await ev(()=>{const d=document.createElement('div');d.className='ht-root';d.innerHTML='<p>Climb down: hold E at the ladder</p><p>Press G to call the box</p><p>BRAKE TOGETHER: hold S and stop</p><p>Hello there, Gary</p>';document.body.appendChild(d);HT.Pad.swapGlyphs();
    const pad=[...d.children].map(x=>x.textContent);HT.Pad.setLast('kb');const kb=[...d.children].map(x=>x.textContent);HT.Pad.setLast('pad');d.remove();return{pad,kb}});
  ok(tx.pad.join('|')==='Climb down: hold A at the ladder|Press LB to call the box|BRAKE TOGETHER: hold LT and stop|Hello there, Gary','sentences name pad buttons: '+tx.pad.join(' | '));
  ok(tx.kb.join('|')==='Climb down: hold E at the ladder|Press G to call the box|BRAKE TOGETHER: hold S and stop|Hello there, Gary','and go back to keys on the keyboard');
  /* LT hold vs toggle */
  await ev(()=>{__T.set({buttons:{6:1}})});const h1=await ev(()=>__ht.P.aim);await ev(()=>{__T.set({buttons:{6:0}})});const h2=await ev(()=>__ht.P.aim);
  ok(h1===true&&h2===false,'LT holds aim');
  await ev(()=>{HT.Keys.aimMode='toggle';__T.set({buttons:{6:1}});__T.set({buttons:{6:0}})});const t1=await ev(()=>__ht.P.aim);
  await ev(()=>{__T.set({buttons:{6:1}});__T.set({buttons:{6:0}})});const t2=await ev(()=>__ht.P.aim);
  ok(t1===true&&t2===false,'Aim: Toggle: LT press on, press off');await ev(()=>{HT.Keys.aimMode='hold'});
  /* tank and jet: in the van, with the vehicle type faked */
  await ev(()=>{const H=window.__ht;H.P.pos.set(H.VAN.pos.x+2.2,0,H.VAN.pos.z);H.enterVan();H.step(2)});
  const fake=t=>ev(t=>{const real=window.__htReal||(window.__htReal=window.__ht);window.__ht=Object.create(real,{CV:{get:()=>t?{type:t}:real.CV}})},t);
  await fake('tank');
  await ev(()=>{HT.Roam.mouseDown=false;__T.set({buttons:{7:1}})});const tf=await ev(()=>HT.Roam.mouseDown);await ev(()=>{__T.set({buttons:{7:0}})});
  await ev(()=>{__T.set({axes:[0,-1,0,0]})});const ts=await ev(()=>HT.Input.stick.y);await ev(()=>{__T.set({axes:[0,0,0,0]})});
  ok(tf===true&&ts<-.9,'tank: RT fires the gun, the stick drives (stick.y '+ts+')');
  await fake('jet');
  await ev(()=>{__T.clear();__T.set({buttons:{7:1}});__T.set({buttons:{7:0}});__T.set({buttons:{6:1}});__T.set({buttons:{6:0}});__T.set({axes:[0,0,1,0]});__T.set({axes:[0,0,0,0]});__T.tap(5);__T.tap(2)});
  const jk=await ev(()=>__T.keys);
  ok(['w','^w','s','^s','x','^x','Shift','g'].every(k=>jk.includes(k)),'jet: RT/LT throttle (W/S held), RS rudder (X), RB afterburner, X gear ('+jk.join(' ')+')');
  const y0=await ev(()=>__ht.P.pitch);await ev(()=>{__T.set({axes:[0,1,0,0]});__T.set({axes:[0,0,0,0]})});
  ok(await ev(y=>__ht.P.pitch!==y,y0),'jet: left stick pitches (through look())');
  await fake(null);await ev(()=>{window.__ht=window.__htReal;const H=window.__ht;H.exitVan&&H.exitVan();H.step(5)});
  /* map */
  await ev(()=>{__T.tap(8)});ok(await ev(()=>__ht.HUD.minimap.mapOpen),'View opens the map');
  await ev(()=>{__T.clear();__T.set({axes:[-1,0,0,0]});__T.tick(30);__T.set({axes:[0,0,0,0]});__T.set({buttons:{7:1}});__T.set({buttons:{7:0}});__T.tap(5);__T.tap(0)});
  const mk=await ev(()=>__T.keys.filter(k=>!k.startsWith('^')));
  ok(mk.filter(k=>k==='ArrowLeft').length>=2&&mk.includes('+')&&mk.includes('Tab')&&mk.includes('Enter'),'map: stick pans (repeating), RT zooms, RB next place, A travels ('+[...new Set(mk)].join(' ')+')');
  await ev(()=>{if(!__ht.HUD.minimap.mapOpen){__T.tap(8)}});await ev(()=>{__T.tap(1)});
  ok(await ev(()=>!__ht.HUD.minimap.mapOpen),'B closes the map');
  /* pause: the first D-pad press moves the focus */
  await p.waitForTimeout(400);/* the game swallows Esc for 300 ms after the map closes */
  await ev(()=>{__T.tap(9)});
  ok(await ev(()=>HT.Input.paused),'Menu pauses');
  const f0=await ev(()=>{const f=document.querySelector('.pad-focus');return f&&f.textContent.trim()});
  await ev(()=>__T.tap(13));const f1=await ev(()=>{const f=document.querySelector('.pad-focus');return f&&f.textContent.trim()});
  ok(!!f0&&!!f1&&f0!==f1,'focus starts on "'+f0+'"; the first D-pad ↓ moves it to "'+f1+'"');
  await ev(()=>{const k=document.querySelector('.ht-pause [data-tab=keys]');k.click()});
  ok(await ev(()=>!!document.querySelector('.ht-paddia')),'Key bindings shows the controller diagram');
  ok(errs.length===0,'no console errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
