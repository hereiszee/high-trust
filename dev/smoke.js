/* Smoke test (QA slices): new game from the title button -> into the van with a real E press -> drive with real W/A keys ->
   each of the four original missions starts (and runs 4 s) -> back to the hub; zero console errors.
   node dev/smoke.js */
const {open}=require('./ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(300);
  await ev(async()=>{await window.__ht.jobs.ready;window.__ht.step(3)});
  const hub=await ev(()=>({mode:window.__ht.mode}));ok(hub.mode==='hub','new game -> hub '+JSON.stringify(hub));
  /* walk to the van and press E for real */
  const near=await ev(()=>{const H=window.__ht,V=H.VAN;H.P.pos.set(V.pos.x+2.4,0,V.pos.z);H.collide(H.P.pos,.35);H.step(2);return{prompt:H.prompt&&H.prompt.text}});
  await p.keyboard.down('e');await ev(()=>window.__ht.step(2));await p.keyboard.up('e');await ev(()=>window.__ht.step(2));
  const inV=await ev(()=>({cv:!!window.__ht.CV}));ok(inV.cv,'E at the van ("'+near.prompt+'") -> driving');
  const p0=await ev(()=>{const e=window.__ht.CV;return e?{x:e.pos.x,z:e.pos.z}:null});
  await p.keyboard.down('w');await ev(()=>window.__ht.step(60));await p.keyboard.down('a');await ev(()=>window.__ht.step(20));await p.keyboard.up('a');await ev(()=>window.__ht.step(40));await p.keyboard.up('w');await ev(()=>window.__ht.step(30));
  const d=await ev(p0=>{const e=window.__ht.CV;return e&&p0?Math.hypot(e.pos.x-p0.x,e.pos.z-p0.z):0},p0);ok(d>8,'drove '+d.toFixed(1)+' m with W/A');
  for(let i=0;i<4;i++){const r=await ev(i=>{const H=window.__ht;H.startMission(i);H.step(120);const o={i,mode:H.mode,id:H.M&&H.M.def.id,state:H.M&&H.M.state};
      if(H.M&&H.M.state==='go')H.jobs.finish(false);H.step(50);if(H.UIacts&&H.UIacts['result:go'])H.UIacts['result:go']();H.step(3);o.back=H.mode;return o},i);
    ok(r.mode==='mission'&&r.state==='go'&&r.back==='hub','mission '+i+' starts and runs: '+JSON.stringify(r))}
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,5).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
