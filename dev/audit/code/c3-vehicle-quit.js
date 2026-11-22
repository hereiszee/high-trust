/* C-3: board the tank (real E), raise the gunner's sight (V), Pause -> Quit to title, then Continue.
   What vehicle state survives?  node dev/audit/code/c3-vehicle-quit.js */
const {open}=require('../../ai-ingame-lib.js');
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  const st=()=>ev(()=>{const H=window.__ht,r=document.querySelector('.ht-tank-ret,[class*=tank][class*=ret]');const R=HT.Tank&&HT.Tank.S&&HT.Tank.S.ret;
    return{mode:H.mode,screen:H.HUD.screen,CV:H.CV?H.CV.type||'car':null,driving:HT.Input.driving,fp:H.P.fp,reticleShown:!!(R&&R.style.display!=='none'),P:[+H.P.pos.x.toFixed(1),+H.P.pos.z.toFixed(1)],dudeVis:H.P.dude&&H.P.dude.root.visible}});
  await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3)});
  await ev(()=>{const H=window.__ht,d=HT.Base.def();H.step(3);const e=HT.Tank.S.e;H.P.pos.set(e.pos.x+2.6,0,e.pos.z);H.step(3)});
  await p.keyboard.press('e');await ev(()=>window.__ht.step(6));
  await p.keyboard.press('v');await ev(()=>window.__ht.step(4));
  console.log('in tank, sight up:',JSON.stringify(await st()));
  await ev(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true})));await p.waitForTimeout(300);
  await ev(()=>{const b=document.querySelector('.ht-pause [data-act=quit]');b&&b.click()});await p.waitForTimeout(400);
  await ev(()=>window.__ht.step(3));
  console.log('title:',JSON.stringify(await st()));
  await ev(()=>{const b=document.querySelector('.ht-title [data-act=continue]');b&&b.click()});await p.waitForTimeout(500);await ev(()=>window.__ht.step(6));
  console.log('after Continue:',JSON.stringify(await st()));
  await p.screenshot({path:'docs/audit/code/c3-after-continue.jpg',type:'jpeg',quality:70});
  console.log(errs.length?'console errors: '+errs.slice(0,4).join(' | '):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
