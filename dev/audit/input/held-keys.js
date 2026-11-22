/* A movement key held through: the pause menu, the full map, a shop, a window blur, a job brief. Released while the overlay is up.
   After the overlay closes, is the dad still walking? Real key events. node dev/audit/input/held-keys.js */
const {boot}=require('./lib.js');
(async()=>{const r=await boot();const {ev,p}=r;const out={};
  await p.click('.ht-title [data-act=newgame]');await r.wait(300);await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);HT.Keys.reset()});
  const live=()=>ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
  const hold=()=>ev(()=>{window.__rafOn=false});
  const moved=async()=>{const a=await ev(()=>[__ht.P.pos.x,__ht.P.pos.z]);await r.step(20);const b=await ev(()=>[__ht.P.pos.x,__ht.P.pos.z]);return{w:await ev(()=>window.__ht.keys.w),moved:+Math.hypot(b[0]-a[0],b[1]-a[1]).toFixed(2)}};
  const clear=()=>ev(()=>{for(const k in __ht.keys)__ht.keys[k]=false});
  /* pause */
  await clear();await p.keyboard.down('w');await p.keyboard.press('Escape');await r.wait(200);out.pausedOpen=await ev(()=>HT.Input.paused);await p.keyboard.up('w');
  await p.keyboard.press('Escape');await r.wait(300);out.pause=await moved();
  /* map */
  await clear();await p.keyboard.down('w');await p.keyboard.press('m');await r.wait(200);out.mapOpen=await ev(()=>__ht.HUD.minimap.mapOpen);await p.keyboard.up('w');await p.keyboard.press('m');await r.wait(400);out.map=await moved();
  /* shop */
  await clear();await p.keyboard.down('w');await ev(()=>__ht.openShop('hardware'));await r.wait(400);out.shopOpen=await ev(()=>HT.Menus.isOpen());await p.keyboard.up('w');await p.keyboard.press('Escape');await r.wait(500);out.shop=await moved();
  /* blur */
  await clear();await p.keyboard.down('w');await ev(()=>window.dispatchEvent(new Event('blur')));await p.keyboard.up('w');out.blur=await moved();
  /* holding W and pressing E on a shop opens it; keep holding through close (keyup after close) */
  await clear();await p.keyboard.down('w');await ev(()=>__ht.openShop('hardware'));await r.wait(400);await p.keyboard.press('Escape');await r.wait(500);const held=await moved();await p.keyboard.up('w');out.heldThroughShop_thenReleased={whileHeld:held,afterRelease:await moved()};
  console.log(JSON.stringify(out,null,1));console.log('errs',r.errs.slice(0,3));await r.b.close()})().catch(e=>{console.error(e);process.exit(1)});
