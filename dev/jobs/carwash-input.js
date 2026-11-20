/* Suds Up with real input: Playwright keyboard and mouse events on the game canvas (no __ht calls for the actions themselves;
   __ht only places the dad and turns his head, like moving the mouse would).
   node dev/jobs/carwash-input.js
   1 E at the reel picks up the hose            2 holding the left mouse button sprays (and fills the bucket you look at)
   3 letting go stops the water                 4 holding R sprays too, releasing stops it
   5 E on Jaylen: Jaylen follows                6 E at the kerb spot sends Jaylen to the sign
   7 the shift opens; a car arrives and parks   8 holding E at a car being soaped scrubs it (progress goes up)
   9 G calls Gary (once there's trouble)        10 the talk-down choices answer to the 1 key
   11 no console errors */
const {open}=require('../ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(400);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('carwash');j.test.give(H.jobs.api);
    await Promise.race([window.HT.People.preload(['dee','nb_teen','nb_kid','thug_cap','thug_jacket','dad_gary']).catch(()=>{}),new Promise(r=>setTimeout(r,30000))]);H.jobs.start('carwash')});
  await p.waitForFunction(()=>{const H=window.__ht;H.step(5);return H.M&&H.M.cw&&H.M.cw.phase==='setup'},null,{timeout:60000,polling:300});
  const box=await p.locator('canvas').first().boundingBox();const cx=box.x+box.width/2,cy=box.y+box.height/2;
  await p.mouse.move(cx,cy);await p.mouse.click(cx,cy);await ev(()=>window.__ht.step(2));/* the first click may only ask for pointer lock */
  const st=()=>ev(()=>{const C=window.__ht.M.cw;return{held:C.hose.held,spray:C.hose.spray,b0:+C.buckets[0].toFixed(2),b1:+C.buckets[1].toFixed(2),tut:C.tut,phase:C.phase,follow:C.follow&&C.follow.name,jay:C.kids.find(k=>k.id==='jaylen').st,lock:!!document.pointerLockElement}});
  const look=(x,y,z)=>ev(([x,y,z])=>{const H=window.__ht,P=H.P;for(let i=0;i<6;i++){const c=H.camera.position;const dx=x-c.x,dy=y-c.y,dz=z-c.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));H.step(1)}},[x,y,z]);
  const at=(x,z)=>ev(([x,z])=>{const H=window.__ht;H.P.pos.set(x,0,z);H.collide(H.P.pos,.35);H.step(2)},[x,z]);
  const steps=n=>ev(n=>window.__ht.step(n),n);
  /* 1 */await at(330.9,33.6);await p.keyboard.press('e');await steps(2);let s=await st();ok(s.held,'E at the reel picks up the hose (pointer lock: '+(s.lock?'locked':'not locked, headless')+')');
  /* 2 */await at(324.6,41.1);await look(323.35,.3,38.55);await p.mouse.down();await steps(45);s=await st();ok(s.spray&&s.b0>.3,'holding the left button sprays and fills the bucket ('+JSON.stringify(s)+')');
  /* 3 */await p.mouse.up();await steps(3);s=await st();const b0=s.b0;ok(!s.spray,'releasing the button stops the water');await steps(20);s=await st();ok(s.b0===b0,'and the bucket stops filling ('+b0+')');
  /* 4 */await at(338.4,41.1);await look(339.65,.3,38.55);await p.keyboard.down('r');await steps(60);s=await st();ok(s.spray&&s.b1>.5,'holding R sprays too ('+s.b1+')');await p.keyboard.up('r');await steps(3);s=await st();ok(!s.spray,'releasing R stops it');
  await ev(()=>{const C=window.__ht.M.cw;C.buckets=[1,1]});await steps(3);s=await st();ok(s.tut===2,'both buckets full: the tutorial moves on to Jaylen (tut '+s.tut+')');
  /* 5 */const j=await ev(()=>{const k=window.__ht.M.cw.kids.find(k=>k.id==='jaylen');return{x:k.x,z:k.z}});await at(j.x+1,j.z+.6);await p.keyboard.press('e');await steps(3);s=await st();ok(s.follow==='Jaylen','E on Jaylen: following ('+s.follow+')');
  /* 6 */await at(342.1,39.6);await steps(25);await p.keyboard.press('e');await steps(3);s=await st();ok(s.jay==='sign','E at the kerb spot: Jaylen takes the sign ('+s.jay+')');
  /* 7 */await steps(6);s=await st();ok(s.phase==='open','the shift opens');
  const car=await ev(()=>{const H=window.__ht;for(let i=0;i<900;i++){H.step(1);const c=H.M.cw.cars.find(c=>c.st==='soap');if(c)return{x:c.x,z:c.z,soap:c.soap,bay:c.bay}}return null});ok(!!car,'a car arrived and parked in a bay ('+JSON.stringify(car)+')');
  /* 8 */if(car){await ev(()=>{const C=window.__ht.M.cw;for(const k of C.kids)if(k.st==='w0'||k.st==='w1')k.st='table'});await at(car.x+(car.bay?1.9:-1.9),car.z);const s0=await ev(()=>window.__ht.M.cw.cars.find(c=>c.st==='soap').soap);
    await p.keyboard.down('e');await steps(60);await p.keyboard.up('e');const s1=await ev(()=>{const c=window.__ht.M.cw.cars.find(c=>c.bay>=0);return c.soap});ok(s1>s0+.15,'holding E scrubs the car yourself ('+s0.toFixed(2)+' -> '+s1.toFixed(2)+')')}
  /* 9 */await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('carwash');});const g0=await ev(()=>window.__ht.M.cw.gary.left);
  await ev(()=>{const C=window.__ht.M.cw;C.sc.ev.length=0;});await ev(()=>{const H=window.__ht,M=H.M,C=M.cw;C.signFree=true});await p.keyboard.press('g');await steps(3);
  const g1=await ev(()=>({left:window.__ht.M.cw.gary.left,busy:window.__ht.M.cw.gary.busy}));ok(g1.left===g0-1&&g1.busy==='sign','G calls Gary to the FREE sign ('+JSON.stringify(g1)+')');
  /* 10 */const tk=await ev(()=>{const H=window.__ht,C=H.M.cw;C.sc.ev=[{k:'mud',t:0}];C.evI=0;H.step(2);const t=C.trouble.find(t=>t.k==='mud');return t?{x:t.p.x,z:t.p.z}:null});
  if(tk){await at(tk.x+1,tk.z+.5);await p.keyboard.press('e');await steps(4);const on=await ev(()=>!!window.__ht.M.cw.talk);ok(on,'E on a Coupon Boy opens the talk-down choices');await p.keyboard.press('1');await steps(4);
    const r=await ev(()=>{const C=window.__ht.M.cw;const t=C.trouble.find(t=>t.k==='mud');return{talk:!!C.talk,talked:!!t.talked}});ok(!r.talk&&r.talked,'the 1 key answers, and he walks off ('+JSON.stringify(r)+')')}else ok(false,'no Coupon Boy spawned');
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,3).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
