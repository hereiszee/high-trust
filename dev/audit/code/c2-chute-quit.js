/* C-2: eject from DAD-1, then Pause -> Quit to title while the parachute is still up, then Continue.
   Does the parachute (and its hold on the dad's position) survive into the next session?  node dev/audit/code/c2-chute-quit.js */
const {open}=require('../../ai-ingame-lib.js');
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3)});
  await ev(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});await p.keyboard.press('e');await ev(()=>window.__ht.step(4));
  const inJet=await ev(()=>({cv:window.__ht.CV&&window.__ht.CV.type,on:HT.Jet.F.on}));console.log('boarded:',JSON.stringify(inJet));
  /* airborne 150 m up over Maple, then eject (E twice, real keys) */
  await ev(()=>{const F=HT.Jet.F;F.air=true;F.gear=0;F.spd=70;F.thr=.6;F.pos.set(60,150,40);window.__ht.step(2)});
  await p.keyboard.press('e');await ev(()=>window.__ht.step(2));await p.keyboard.press('e');await ev(()=>window.__ht.step(10));
  const s1=await ev(()=>({chute:HT.Jet.state().chute,cv:!!window.__ht.CV,P:[+window.__ht.P.pos.x.toFixed(1),+window.__ht.P.pos.z.toFixed(1)]}));console.log('after eject:',JSON.stringify(s1));
  /* pause and quit to title (the real buttons) */
  await ev(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true})));await p.waitForTimeout(300);
  const ps=await ev(()=>window.__ht.HUD.screen);console.log('screen:',ps);
  await ev(()=>{const b=document.querySelector('.ht-pause [data-act=quit]');b&&b.click()});await p.waitForTimeout(300);
  await ev(()=>{const b=document.querySelector('.ht-dlg [data-act=ok], .ht-dialog [data-act=ok]');b&&b.click()});await p.waitForTimeout(300);
  const s2=await ev(()=>({screen:window.__ht.HUD.screen,mode:window.__ht.mode,chute:HT.Jet.state().chute,F_on:HT.Jet.F.on}));console.log('after quit to title:',JSON.stringify(s2));
  await ev(()=>window.__ht.step(5));
  const s2b=await ev(()=>({P:[+window.__ht.P.pos.x.toFixed(1),+window.__ht.P.pos.z.toFixed(1)],dudeY:window.__ht.P.dude&&+window.__ht.P.dude.root.position.y.toFixed(1),dudeVis:window.__ht.P.dude&&window.__ht.P.dude.root.visible}));console.log('title backdrop, 5 steps later:',JSON.stringify(s2b));
  await ev(()=>{const b=document.querySelector('.ht-title [data-act=continue]');b&&b.click()});await p.waitForTimeout(500);await ev(()=>window.__ht.step(5));
  const s3=await ev(()=>({mode:window.__ht.mode,chute:HT.Jet.state().chute,P:[+window.__ht.P.pos.x.toFixed(1),+window.__ht.P.pos.z.toFixed(1)],dudeY:window.__ht.P.dude&&+window.__ht.P.dude.root.position.y.toFixed(1)}));console.log('after Continue:',JSON.stringify(s3));
  console.log(errs.length?'console errors: '+errs.slice(0,4).join(' | '):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
