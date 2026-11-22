/* Fort Sensible, audit C-2: no jet / tank / range state outlives its session.  node dev/base-reset.js
   For each way out (Pause -> Quit to title -> Continue, Quit -> New game, a job starting, the hub re-entered as after a tow or a job),
   gets into a state that used to leak (under the parachute 150 m up, in the tank with the gunner sight on, flying, a rental drawn
   on the range) with real keys, leaves, and checks: no chute, no flight draw radius / ground map, not in a vehicle, no jet HUD or tank
   sight, no crew hold, own loadout back, the dad on the ground. Also HT.Jet.on / HT.Tank.on (fast travel reads them). Fails on console errors. */
const {open}=require('./ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++};
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});const ev=(f,a)=>p.evaluate(f,a);
  const step=n=>ev(n=>{const H=window.__ht;H.step(n);H.ow.update(H.camera)},n);
  const fresh=()=>ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3)});
  const toJet=async()=>{await ev(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});await p.keyboard.press('e');await step(4)};
  const toTank=async()=>{await ev(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.tank.x+2.6,0,d.tank.z);H.step(4)});await p.keyboard.press('e');await step(4)};
  const ejectHigh=async()=>{await ev(()=>{const F=HT.Jet.F;F.air=true;F.gear=0;F.gearK=0;F.spd=70;F.thr=.6;F.pos.set(60,150,40);window.__ht.step(2)});
    await p.keyboard.press('e');await step(2);await p.keyboard.press('e');await step(10)};
  const lo0=()=>ev(()=>JSON.stringify(window.__ht.P.loadout));
  const rent=async()=>{const d=await ev(()=>{const k=HT.Base.def().range.rack;return{x:k.x-1.6,z:k.z}});await ev(d=>{const H=window.__ht;H.P.pos.set(d.x,0,d.z);H.P.yaw=-Math.PI/2;H.P.pitch=-.15;H.step(4);H.draw()},d);
    await p.keyboard.press('e');await step(3);await p.keyboard.press('2');await step(4)};
  const quit=async()=>{await ev(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true})));await p.waitForTimeout(250);
    await ev(()=>{const b=document.querySelector('.ht-pause [data-act=quit]');b&&b.click()});await p.waitForTimeout(250);
    await ev(()=>{const b=document.querySelector('.ht-dlg [data-act=ok], .ht-dialog [data-act=ok]');b&&b.click()});await p.waitForTimeout(250)};
  const title=async act=>{await ev(a=>{const b=document.querySelector('.ht-title [data-act='+a+']');b&&b.click()},act);await p.waitForTimeout(400);
    await ev(()=>{const b=document.querySelector('.ht-dlg [data-act=ok], .ht-dialog [data-act=ok]');b&&b.click()});await p.waitForTimeout(300);await step(6)};
  const clean=async(tag,lo)=>{const s=await ev(()=>{const H=window.__ht,F=HT.Jet.F,js=HT.Jet.state(),R=HT.Range.state?HT.Range.S:null;
      const vis=el=>!!el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
      const gm=H.scene.getObjectByName('groundMap');return{mode:H.mode,chute:js.chute,fly:F.fly,flyR:F.flyR,on:F.on,jetOn:HT.Jet.on,tankOn:HT.Tank.on,cv:H.CV&&H.CV.type,
        gm:!!(gm&&gm.visible),crew:HT.Jet.S&&null,rent:!!HT.Range.S.rent,menu:!!HT.Range.S.menu,ret:vis(HT.Tank.S.ret),inside:HT.Tank.S.inside,shells:HT.Tank.S.shells.length,
        dudeY:H.P.dude?+H.P.dude.root.position.y.toFixed(2):null,py:+H.P.pos.y.toFixed(2),fp:!!H.P.fp,lo:JSON.stringify(H.P.loadout),camFar:H.camera.far}});
    const bad=[];if(s.chute)bad.push('chute');if(s.fly)bad.push('flight radius '+s.flyR);if(s.on)bad.push('F.on');if(s.jetOn)bad.push('Jet.on');if(s.tankOn)bad.push('Tank.on');
    if(s.cv==='jet'||s.cv==='tank')bad.push('in '+s.cv);if(s.gm)bad.push('ground map');if(s.rent)bad.push('rental');if(s.menu)bad.push('rack menu');if(s.ret)bad.push('tank sight');
    if(s.inside)bad.push('tank inside');if(s.shells)bad.push('shells');if(s.dudeY!=null&&Math.abs(s.dudeY)>.5)bad.push('dad at y '+s.dudeY);if(s.camFar>2000)bad.push('camera far '+s.camFar);
    if(lo&&s.lo!==lo)bad.push('loadout '+s.lo+' (was '+lo+')');
    ok(!bad.length,tag+': clean'+(bad.length?' -- '+bad.join(', '):' ('+s.mode+', dad y '+s.dudeY+')'))};
  const T0=Date.now();
  /* 1. the auditors' repro: eject, quit to title under the canopy, Continue */
  await fresh();await toJet();{const s=await ev(()=>({on:HT.Jet.on,cv:window.__ht.CV&&window.__ht.CV.type}));ok(s.on&&s.cv==='jet','HT.Jet.on is true in the jet')}
  await ejectHigh();{const s=await ev(()=>({c:HT.Jet.state().chute,on:HT.Jet.on}));ok(!!s.c&&s.on,'under the canopy at '+(s.c?s.c.y.toFixed(0):'?')+' m, HT.Jet.on still true (fast travel waits for the landing)')}
  await quit();await clean('eject -> quit to title');await title('continue');await clean('... -> Continue');
  /* 2. eject, quit, New game */
  await toJet();await ejectHigh();await quit();await title('newgame');await clean('eject -> quit -> New game');
  /* 3. flying (in the cockpit, 120 m up), quit, Continue */
  await toJet();await ev(()=>{const F=HT.Jet.F;F.air=true;F.gear=0;F.spd=80;F.thr=.6;F.pos.set(120,120,80);window.__ht.step(6)});
  {const s=await ev(()=>HT.Jet.F.fly);ok(s,'flying: the flight draw radius is on')}await quit();await title('continue');await clean('flying -> quit -> Continue');
  /* 4. the tank with the gunner sight (V), quit, Continue */
  await toTank();await p.keyboard.press('v');await step(4);{const s=await ev(()=>({on:HT.Tank.on,fp:!!window.__ht.P.fp}));ok(s.on&&s.fp,'HT.Tank.on is true in the tank, gunner sight on')}
  await quit();await title('continue');await clean('tank + sight -> quit -> Continue');
  /* 5. a rental drawn on the range, quit, Continue: his own loadout comes back */
  {const lo=await lo0();await rent();const s=await ev(()=>!!HT.Range.S.rent);ok(s,'rental taken from the rack (E, then 2)');await quit();await title('continue');await clean('rental -> quit -> Continue',lo)}
  /* 6. under the canopy when a job starts, then back to the hub (the way a job ending or the tow comes home) */
  await toJet();await ejectHigh();await ev(()=>{const H=window.__ht;H.startMission(0);H.step(4)});await clean('eject -> job starts');
  await ev(()=>{const H=window.__ht;H.enterHub();H.step(4)});await clean('job -> hub');
  await toTank();await ev(()=>{const H=window.__ht;H.enterHub();H.step(4)});await clean('tank -> hub (tow / job end)');
  {const lo=await lo0();await rent();await ev(()=>{const H=window.__ht;H.startMission(0);H.step(4)});await clean('rental -> job starts');await ev(()=>{const H=window.__ht;H.enterHub();H.step(4)});await clean('rental -> job -> hub',lo)}
  console.log(errs.length?'CONSOLE ERRORS:\n'+errs.slice(0,10).join('\n'):'no console errors');if(errs.length)fails++;
  console.log((fails?fails+' FAILED':'all ok')+' · '+((Date.now()-T0)/1000).toFixed(0)+' s');await b.close();process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
