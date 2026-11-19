/* quick in-game smoke test for the AI: node dev/ai-ingame-smoke.js (see dev/ai-ingame-lib.js) */
const {open}=require('./ai-ingame-lib');
(async()=>{const {b,p,errs,loadMs}=await open({viewport:{width:960,height:540}});console.log('loaded',loadMs,'ms');
  for(let i=0;i<4;i++){const r=await p.evaluate(i=>{const H=__ht;H.startMission(i);const L=H.L;const t=performance.now();H.step(300);
      return{i,ms:Math.round(performance.now()-t),rooms:L.nav.rooms.map(r=>r.name),squads:[...H.M.squads.keys()].map(String),en:H.enemies.length,modes:H.enemies.map(e=>e.ai&&e.ai.mode+'/'+e.ai.sub).join(' '),hp:H.P.hp,think:H.aiStats.thinkMs/H.aiStats.thinks}},i);
    console.log(JSON.stringify(r))}
  console.log('errors',errs.length,errs.slice(0,10));await b.close()})();
