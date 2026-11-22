/* Night: Sign of the Times (js/jobs/sabotage.js). 3 a.m. at Mill St Auto Recovery, the dad crouched in the shadows letting the air out
   of a tow truck's tyres ("Don't slash them. We're not monsters."). HUD on (stealth meter, clock). Played by the job's own scripted player;
   captured from the moment a valve starts hissing. */
module.exports={frames:105,warm:2,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T;T.unlock('sabotage');await T.castJob('sabotage');await T.cast(['nb_pops','thug_track','thug_jacket']);
      H.jobs.start('sabotage');H.step(30);T.flags();
      return T.play('sabotage',M=>M.valves&&M.valves.some(v=>!v.done&&v.prog>.12),30000)});console.log('  ',JSON.stringify(r))},
  frame:i=>{window.__T.bot('sabotage')}};
