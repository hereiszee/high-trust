/* Higher Ground (js/jobs/overwatch.js): Doug's rifle with beanbags on the Community Center roof in Riverside, through the scope while
   the crew walks the witness past the basketball court. Played by the job's own scripted player (it marks, calls clear, fires beanbags). */
module.exports={frames:120,warm:2,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T;H.openBridge();T.flags();
      await T.cast(['rosa','nb_pops','nb_kid','nb_gran','nb_marcus','nb_kenji','nb_mei','thug_hoodie','dad_doug','dad_gary']);
      const j=H.jobs.registry.get('overwatch');j.test.give(H.jobs.api);H.prog.done[H.jobs.index('rosa')]=true;T.flags();H.jobs.start('overwatch');H.step(30);
      return T.play('overwatch',M=>{const O=M.ow,E=O&&O.esc;return O&&O.stage==='court'&&E&&E.s>44&&O.rifle.scopeT>.9},20000)});console.log('  ',JSON.stringify(r))},
  frame:i=>{window.__T.bot('overwatch')}};
