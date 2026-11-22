/* Sensible Dragway: a whole pass driven off camera (real keys, stepped), then the timeslip card (.ht-dr) as the player gets it. */
const D=require('./_drag.js');
module.exports={frames:60,warm:4,
  async stage(s){const r=await D.toLine(s,/^Your /);console.log('  ',JSON.stringify(r));const st={i:0};
    for(let n=0;n<2400;n++){st.i=n;const q=await D.drive(s,st);if(q.phase==='done'||(!q.phase&&n>50))break;await s.p.evaluate(()=>{const H=window.__ht;H.step(1)})}
    await D.release(s.p);
    for(let n=0;n<300;n++){const m=await s.p.evaluate(()=>HT.Strip.menu());if(m.open&&m.id==='slip')break;await s.p.evaluate(()=>window.__ht.step(2))}
    console.log('  ',JSON.stringify(await s.p.evaluate(()=>({menu:HT.Strip.menu().id,last:HT.Strip.state().last&&HT.Strip.state().last.slip}))))}};
