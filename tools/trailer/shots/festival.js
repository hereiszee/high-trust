/* Finale: "Everybody Waves" (js/jobs/finale.js, _finale-fest.js). A finished campaign save (dev/jobs/finale-saves.js 'clean'), straight to
   the Riverside street festival, the dad's speech from the stage, then the wave: family and crew in the front row, the whole street
   behind them, the game's own crane camera rising, the game's own title banner. Captured from the first frame of the wave. */
const setupSave=require('../../../dev/jobs/finale-saves.js');
module.exports={frames:285,warm:2,keepBanner:true,
  async stage(s){const p=s.p;const st=await p.evaluate(setupSave,'clean');console.log('  save',JSON.stringify(st));
    await p.evaluate(async()=>{window.__T.flags();await window.HT.Finale.preloadCast()});
    const r=await p.evaluate(()=>{const H=window.__ht,FN=window.HT.Finale,T=window.__T;H.jobs.start('finale');H.step(4);T.flags();const M=H.M;M.fn.plan=window.HT.Plan.auto(FN.PLAN_DEF,{});FN.advance(M,'festival');
      for(let i=0;i<10;i++)H.step(1);
      /* let the festival breathe (people walk to their spots, lights on) */for(let i=0;i<150;i++)H.step(1);
      M.fn.sub.talked=6;H.step(2);H.P.pos.set(FN.W.stage.x+2.2,0,FN.W.stage.z+.6);H.step(1);H.jobs.api.useTap=true;H.step(2);
      return{ph:M.fn.sub.ph,ch:!!M.fn.sub.ch,n:(FN.live||[]).length}});console.log('  ',JSON.stringify(r))},
  async after(s){/* the speech, picked as the clock starts, so the wave begins on frame 0 */
    await s.p.evaluate(()=>{const M=window.__ht.M;window.__pickNow=()=>{if(M.fn.sub.ch)M.fn.sub.ch.pick(0)}})},
  frame:i=>{if(window.__pickNow){window.__pickNow();window.__pickNow=null;window.__T.ev('wave')}}};
