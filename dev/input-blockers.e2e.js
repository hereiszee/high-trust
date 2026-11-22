/* Regression test for the input audit's blockers and the two menu/lock bugs (docs/audit/input/FINDINGS.md IN-01..04, saves SAV-01, code C-1).
   Real input only for the thing under test: the scripted Gamepad that js/gamepad.js polls, Playwright's trusted keys / mouse, CDP for Mouse 5.
   node dev/input-blockers.e2e.js
   IN-01 pad: LT raises / lowers the Crossing Guard stop sign (Hold until an Aim mode is picked, then Toggle), the chip shows LT
   IN-03 keyboard: Aim on K / on Mouse 5 raises the sign
   IN-02 pad: in the tow truck lined up, the prompt shows Y, holding Y hitches, a quick tap of Y gets out
   IN-04 pad: at home B opens Decorate, the panel shows pad glyphs only, B closes it
   C-1   any click on the view asks for pointer lock, with Fire/Aim swapped or Fire on a key */
const {boot,LEAK_SRC}=require('./audit/input/lib.js');
let fails=0;const ok=(m,c,x)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''))};
async function crossing(r){return r.ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);HT.Keys.reset();const j=H.jobs.registry.get('crossing');j.test.give(H.jobs.api);H.jobs.start('crossing');H.step(3);
  let f=0;for(;f<3000&&!(H.M&&H.M.cg&&H.M.cg.gear);f++){j.test.step(H.jobs.api,f,{});H.step(1)}for(const k in H.keys)H.keys[k]=false;H.M.cg.signOn=false;H.step(2);return{gear:!!H.M.cg.gear,stage:H.M.cg.stage}})}
(async()=>{
  /* ---------- IN-01 + IN-03 + C-1 ---------- */
  {const r=await boot();const {ev,p}=r;await p.click('.ht-title [data-act=newgame]');await r.wait(300);
    const st=await crossing(r);ok('crossing: vest and sign on',st.gear,st);
    await r.pad();await ev(()=>{__T.set({axes:[0,0,.6,0]});__T.set({axes:[0,0,0,0]})});
    const sign=()=>ev(()=>{window.__ht.step(2);return !!window.__ht.M.cg.signOn});
    await ev(()=>{__T.set({buttons:{6:1}});__T.tick(3)});const h1=await sign();await ev(()=>{__T.set({buttons:{6:0}});__T.tick(2)});const h2=await sign();
    ok('IN-01 pad LT (no Aim mode picked yet: hold) raises the sign while held and lowers it on release',h1&&!h2,{h1,h2});
    await ev(()=>{HT.Keys.aimMode='toggle';window.__ht.M.cg.signOn=false});
    await ev(()=>{__T.set({buttons:{6:1}});__T.tick(3);__T.set({buttons:{6:0}});__T.tick(2)});const t1=await sign();await ev(()=>window.__ht.step(30));const t1b=await sign();
    await ev(()=>{__T.set({buttons:{6:1}});__T.tick(3);__T.set({buttons:{6:0}});__T.tick(2)});const t2=await sign();
    ok('IN-01 pad LT with Aim: Toggle: tap raises (stays up), tap lowers',t1&&t1b&&!t2,{t1,t1b,t2});
    const chip=await ev(async()=>{window.__ht.step(2);for(let i=0;i<3;i++){try{window.__ht.draw()}catch(e){}await new Promise(r=>setTimeout(r,120))}return[...document.querySelectorAll('.ht-gc .ht-kc')].map(e=>e.textContent)});
    ok('IN-01 the sign chip reads LT on the pad',chip.includes('LT'),chip);
    const P_AIM=await ev(()=>window.__ht.P.aim);ok('the gun aim stays down under the sign',!P_AIM);
    /* IN-03: keyboard, Aim rebound */
    const C=await ev(()=>{const b=window.__ht.renderer.domElement.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}});await p.mouse.move(C.x,C.y);
    await ev(()=>{HT.Keys.reset();window.__ht.M.cg.signOn=false});
    await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});const d0=await sign();await ev(()=>{window.__ht.M.cg.signOn=false});
    ok('IN-03 control: default Mouse 2 raises the sign',d0);
    await ev(()=>HT.Keys.set('aim','k'));await p.keyboard.press('KeyK');const k1=await sign();await p.keyboard.press('KeyK');const k2=await sign();
    ok('IN-03 Aim on K: K raises the sign, K again lowers it',k1&&!k2,{k1,k2});
    await ev(()=>{HT.Keys.reset();HT.Keys.set('aim','mouse5');window.__ht.M.cg.signOn=false});const cdp=await p.context().newCDPSession(p);
    for(const t of['mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type:t,x:C.x,y:C.y,button:'forward',buttons:t==='mousePressed'?16:0,clickCount:1});
    const m5=await sign();ok('IN-03 Aim on Mouse 5: Mouse 5 raises the sign',m5);
    const url=await ev(()=>location.href);ok('IN-15 Mouse 5 did not navigate',/index\.html/.test(url),url);
    /* C-1 */
    await ev(()=>{try{window.__ht.jobs.finish(false,'test')}catch(e){}window.__ht.step(3);try{window.__ht.HUD.hide('result')}catch(e){}window.__ht.enterHub();window.__ht.step(3);HT.Keys.reset();
      const cv=document.getElementById('c');window.__lockReq=0;cv.requestPointerLock=function(){window.__lockReq++;return Promise.reject(new Error('stub'))}});
    for(const [label,setup] of [['defaults',()=>HT.Keys.reset()],['fire<->aim swapped',()=>{HT.Keys.reset();HT.Keys.set('fire','mouse2')}],['fire on J',()=>{HT.Keys.reset();HT.Keys.set('fire','j')}]]){
      await ev(setup);await ev(()=>{window.__lockReq=0;window.__ht.P.aim=false});await p.mouse.click(C.x,C.y);await r.wait(150);
      const q=await ev(()=>({lockRequests:window.__lockReq,aim:window.__ht.P.aim}));ok('C-1 '+label+': a click on the view asks for pointer lock (and only that)',q.lockRequests>0&&!q.aim,q)}
    await ev(()=>HT.Keys.reset());
    ok('no console errors (crossing run)',r.errs.length===0,r.errs.slice(0,3));await r.b.close()}
  /* ---------- IN-02 ---------- */
  {const r=await boot();const {ev,p}=r;await p.click('.ht-title [data-act=newgame]');await r.wait(300);
    const setup=await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('tow'),a=H.jobs.api;
      for(const d of j.def.unlock.done||[]){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}H.prog.trustR=Math.max(H.prog.trustR||0,25);j.test.give(a);H.jobs.start('tow');H.step(3);
      let f=0;const S=HT.Tow.S;for(;f<9000;f++){for(const k in H.keys)H.keys[k]=false;j.test.step(a,f,{});if(H.CV&&S.cand&&S.cand.chk&&S.cand.chk.ok&&!S.link&&H.M.state==='go')break;H.step(1)}
      for(const k in H.keys)H.keys[k]=false;S.eT=0;S.hold=0;S.eDown=0;H.step(2);return{f,ok:!!(S.cand&&S.cand.chk.ok),link:!!S.link,state:H.M&&H.M.state}});
    ok('tow: lined up behind the car',setup.ok&&!setup.link,setup);
    await r.pad();await ev(()=>{__T.set({axes:[0,0,.6,0]});__T.set({axes:[0,0,0,0]})});
    const hud=await ev(async()=>{window.__ht.step(2);for(let i=0;i<3;i++){try{window.__ht.draw()}catch(e){}await new Promise(r=>setTimeout(r,120))}const pr=document.querySelector('.ht-pr:not(.off)');return{kc:pr?[...pr.querySelectorAll('.ht-kc')].map(e=>e.textContent):[],txt:[...document.querySelectorAll('.ht-mt,.ht-meter,.ht-pr:not(.off),.ht-obj')].map(e=>e.innerText.replace(/\n/g,' ')).join(' || ')}});
    ok('IN-02/IN-07 the hitch prompt shows Y (the button that does it) and no keyboard key',hud.kc.includes('Y')&&!/\bHold E\b|\bE ·/.test(hud.txt),hud);
    await r.shot('../../screenshots/input/pad-tow-prompt');
    await ev(()=>{__T.set({buttons:{3:1}});for(let i=0;i<60&&!HT.Tow.S.link;i++){__T.tick();window.__ht.step(1)}});
    const held=await ev(()=>({inCar:!!window.__ht.CV,link:!!HT.Tow.S.link}));await ev(()=>{__T.set({buttons:{3:0}});__T.tick();window.__ht.step(2)});
    ok('IN-02 holding Y hitches the car (still in the truck)',held.inCar&&held.link,held);
    await ev(()=>{for(let i=0;i<30;i++)window.__ht.step(1)});
    await ev(()=>{__T.set({buttons:{3:1}});__T.tick();window.__ht.step(1);__T.set({buttons:{3:0}});__T.tick();window.__ht.step(3)});
    const tap=await ev(()=>({inCar:!!window.__ht.CV,link:!!HT.Tow.S.link}));ok('IN-02 a quick tap of Y gets out',!tap.inCar,tap);
    ok('no console errors (tow run)',r.errs.length===0,r.errs.slice(0,3));await r.b.close()}
  /* ---------- IN-04 ---------- */
  {const r=await boot();const {ev,p}=r;await p.click('.ht-title [data-act=newgame]');await r.wait(300);
    const home=await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.WM.beat=true;if(H.save&&H.save.flags)H.save.flags.act2Intro=true;H.step(2);if(H.CV)H.exitVehicle();H.enterHome();for(let i=0;i<80&&H.mode!=='home';i++){await new Promise(r=>setTimeout(r,100));H.step(1)}H.step(5);return{mode:H.mode}});
    ok('at home',home.mode==='home',home);
    await r.pad();await ev(()=>{__T.set({axes:[0,0,.3,0]});__T.set({axes:[0,0,0,0]});window.__ht.step(3)});
    const deco=()=>ev(()=>document.body.classList.contains('decoOn'));
    const objLeaks=await ev(LEAK_SRC);ok('IN-04 the home objective names no keyboard key on the pad',!objLeaks.length,objLeaks);
    await ev(()=>{__T.tap(1);window.__ht.step(3)});const d1=await deco();ok('IN-04 pad B opens Decorate',d1);
    await ev(()=>{__T.tick(2);window.__ht.step(3)});await r.wait(120);
    const panel=await ev(()=>({caps:[...document.querySelectorAll('#deco .ht-kc')].map(e=>e.textContent),plain:[...document.querySelectorAll('#deco .ht-kc:not(.pad-g)')].map(e=>e.textContent)}));
    const leaks=await ev(LEAK_SRC);
    ok('IN-04 the decorate panel shows pad buttons only',panel.caps.length>=5&&!leaks.length&&panel.plain.every(t=>/^(RB|LB|LT|RT|View|Menu|L3|R3|D.)$/.test(t)),{panel,leaks});
    await r.shot('../../screenshots/input/pad-decorate-panel');
    await ev(()=>{__T.tap(1);window.__ht.step(3)});const d2=await deco();ok('IN-04 pad B closes Decorate',!d2);
    ok('no console errors (home run)',r.errs.length===0,r.errs.slice(0,3));await r.b.close()}
  console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
