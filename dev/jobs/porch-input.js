/* Porch Light with real input: Playwright keyboard events (hold E, E, W, the 1 key); __ht only places the dad, like walking would.
   node dev/jobs/porch-input.js
   1 holding E at the lawn chair picks it up          2 E sets it down where you stand
   3 E at the chair sits you down (the watch ring grows to 12 m)   4 pressing W stands you back up
   5 a pirate walking off with a parcel: E opens "a word first"    6 the 1 key answers; he takes the parcel back to its porch
   7 no console errors */
const {open}=require('../ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(400);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const s=H.jobs.api.SV();window.HT.Save.jobRec(s,'hoa').done=true;H.jobs.start('porch');for(let i=0;i<10;i++)H.step(1)});
  await p.waitForFunction(()=>{const H=window.__ht;H.step(3);return H.M&&H.M.pc&&H.M.state==='go'},null,{timeout:60000,polling:300});
  const box=await p.locator('canvas').first().boundingBox();await p.mouse.click(box.x+box.width/2,box.y+box.height/2);
  const steps=n=>ev(n=>window.__ht.step(n),n);const at=(x,z)=>ev(([x,z])=>{const H=window.__ht;if(H.CV)H.jobs.api.exitCar();H.P.pos.set(x,0,z);H.collide(H.P.pos,.35);H.step(2)},[x,z]);
  const st=()=>ev(()=>{const M=window.__ht.M;return{held:M.chair.held,placed:M.chair.placed,sit:M.pc.sit,ring:M.pc.ring.visible?+M.pc.ring.scale.x.toFixed(1):0,talk:!!M.pc.talk,cx:M.chair.x,cz:M.chair.z}});
  const c0=await ev(()=>{const M=window.__ht.M;return{x:M.chair.x,z:M.chair.z,sx:M.pc.S.cx,sz:M.pc.S.cz,f:M.pc.S.face}});
  /* 1 */await at(c0.x+.9,c0.z);await p.keyboard.down('e');await steps(30);await p.keyboard.up('e');await steps(2);let s=await st();ok(s.held,'holding E at the lawn chair picks it up ('+JSON.stringify(s)+')');
  /* 2 */await at(c0.sx,c0.sz+c0.f*3);await p.keyboard.press('e');await steps(3);s=await st();ok(s.placed&&!s.held,'E sets it down where you stand');
  /* 3 */await at(s.cx+.6,s.cz);await steps(2);await p.keyboard.press('e');await steps(4);s=await st();ok(s.sit&&s.ring===12,'E at the chair sits you down; the watch ring is 12 m ('+JSON.stringify(s)+')');
  /* 4 */await p.keyboard.down('w');await steps(3);await p.keyboard.up('w');await steps(2);s=await st();ok(!s.sit,'W stands you back up');
  /* 5 */const pk=await ev(()=>{const H=window.__ht,M=H.M;for(let i=0;i<3000&&!M.pir.some(p=>p.st==='brisk');i++){H.P.pos.set(M.pc.S.cx+60,0,M.pc.S.cz);H.step(1)}const q=M.pir.find(p=>p.st==='brisk');return q?{x:q.e.pos.x,z:q.e.pos.z}:null});
  if(!pk){ok(false,'no pirate took a parcel')}else{await at(pk.x+1.6,pk.z);await p.keyboard.press('e');await steps(3);s=await st();ok(s.talk&&!!(await ev(()=>!!document.querySelector('.ht-ch'))),'E near the pirate opens "a word first"');
    /* 6 */await p.keyboard.press('1');const r=await ev(()=>{const H=window.__ht,M=H.M;for(let i=0;i<400;i++){H.step(1);if(M.talked&&M.porches.filter(p=>p.state==='porch').length>=M.porches.filter(p=>p.state!=='lost'&&p.state!=='wait').length)break}return{talked:M.talked,parcels:M.porches.map(p=>p.state[0]).join('')}});
    ok(r.talked===1&&!/s/.test(r.parcels),'the 1 key answers; he puts the parcel back ('+JSON.stringify(r)+')')}
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,3).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
