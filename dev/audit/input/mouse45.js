/* Mouse back / forward buttons (Mouse 4 / 5) with trusted CDP events: does the browser navigate away from the game?
   node dev/audit/input/mouse45.js   (case A: in play, nothing bound; case B: in play, Jump bound to Mouse 4; case C: on the Key bindings capture) */
const {boot}=require('./lib.js');
async function once(label,prep,where){const r=await boot();const {ev,p}=r;const cdp=await p.context().newCDPSession(p);
  await p.click('.ht-title [data-act=newgame]');await r.wait(300);await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);HT.Keys.reset()});
  const pt=await prep(r);
  for(const t of['mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type:t,x:pt.x,y:pt.y,button:'back',buttons:t==='mousePressed'?8:0,clickCount:1});
  await r.wait(600);const res={case:label,url:p.url(),gameAlive:await ev(()=>!!window.HT).catch(()=>false)};
  if(res.gameAlive)res.jumpBuf=await ev(()=>HT.Keys.get('jump'));console.log(JSON.stringify(res));await r.b.close()}
(async()=>{
  const centre=async r=>r.ev(()=>{const b=window.__ht.renderer.domElement.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}});
  await once('A: playing, Mouse 4 unbound',centre);
  await once('B: playing, Jump on Mouse 4',async r=>{await r.ev(()=>HT.Keys.set('jump','mouse4'));return centre(r)});
  await once('C: Key bindings screen, capturing Jump',async r=>{const {ev,p}=r;await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
    await ev(()=>{if(!HT.Input.paused)window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))});await r.wait(500);await p.click('.ht-pause [data-tab=keys]');await r.wait(200);
    const bb=await p.locator('[data-rebind=jump]').boundingBox();await p.click('[data-rebind=jump]');return{x:bb.x+bb.width/2,y:bb.y+bb.height/2}});
})().catch(e=>{console.error(e);process.exit(1)});
