/* C-1: with Fire/Aim rebound (left-handed swap), a click on the 3D view never reaches the canvas's pointer-lock request.
   node dev/audit/code/c1-rebind-lock.js */
const {open}=require('../../ai-ingame-lib.js');
(async()=>{const {b,p}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(2);localStorage.removeItem('ht-keys');HT.Keys.reset();
    const cv=document.getElementById('c');window.__lockReq=0;cv.requestPointerLock=function(){window.__lockReq++;return Promise.reject(new Error('stub'))}});
  const box=await p.locator('#c').boundingBox();const cx=box.x+box.width/2,cy=box.y+box.height/2;
  for(const [label,setup] of [['defaults',()=>HT.Keys.reset()],['fire<->aim swapped',()=>{HT.Keys.reset();HT.Keys.set('fire','mouse2')}],['fire on J',()=>{HT.Keys.reset();HT.Keys.set('fire','j')}]]){
    await ev(setup);await ev(()=>{window.__lockReq=0});
    const st=await ev(()=>({running:HT.Input.running,paused:HT.Input.paused,locked:!!document.pointerLockElement,map:HT.Keys.map}));
    await p.mouse.click(cx,cy);await p.waitForTimeout(150);
    const r=await ev(()=>({lockRequests:window.__lockReq,mouseDown:HT.Roam&&HT.Roam.mouseDown,aim:__ht.P.aim}));
    console.log(label.padEnd(20),JSON.stringify(st),'-> after one left click on the view:',JSON.stringify(r));
    await ev(()=>{__ht.P.aim=false;HT.Input.fire(false)});}
  await b.close()})().catch(e=>{console.error(e);process.exit(1)});
