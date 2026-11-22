/* exploratory: title with a pad, what does A do, where does a new game land */
const {boot,LEAK_SRC}=require('./lib.js');
(async()=>{const r=await boot();const {ev,p}=r;await r.pad();
  await ev(()=>{__T.tick(3)});console.log('title focus',await r.focus(),await ev(()=>({screen:__ht.HUD.screen,mode:__ht.mode,pad:document.documentElement.classList.contains('ht-pad')})));
  console.log('title leaks',JSON.stringify(await ev(LEAK_SRC)));
  await r.shot('pad-title');
  await ev(()=>__T.tap(0));await r.wait(800);await ev(()=>__T.tick(3));
  console.log('after A',await ev(()=>({screen:__ht.HUD.screen,mode:__ht.mode,running:HT.Input.running,paused:HT.Input.paused,menus:HT.Menus&&HT.Menus.isOpen()})),await r.focus());
  await r.step(30);console.log('leaks',JSON.stringify(await ev(LEAK_SRC)));
  await r.shot('pad-after-newgame');
  console.log(await ev(()=>({obj:document.querySelector('.ht-obj')&&document.querySelector('.ht-obj').innerText,pr:document.querySelector('.ht-pr')&&document.querySelector('.ht-pr').innerText,tut:JSON.stringify(window.__ht.TUT).slice(0,300)})));
  console.log('errs',r.errs.slice(0,5));await r.b.close()})().catch(e=>{console.error(e);process.exit(1)});
