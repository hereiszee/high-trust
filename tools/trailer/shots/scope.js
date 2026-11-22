/* Higher Ground (js/jobs/overwatch.js): Doug's beanbag rifle on the Community Center roof in Riverside, through the scope, during the
   'garden' stage (threats: a man behind the alley dumpster and one on the rowhouse roof; adults only). Played by the job's own scripted
   player. The court stage is deliberately avoided: Kevin (a kid with a Super Soaker) is in that stage's view. The 'car' stage was tried
   and rejected (the scope sat on the roof parapet). */
module.exports={frames:105,warm:2,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T;H.openBridge();T.flags();
      await T.cast(['rosa','nb_pops','nb_kid','nb_gran','nb_marcus','nb_kenji','nb_mei','thug_hoodie','dad_doug','dad_gary']);
      const j=H.jobs.registry.get('overwatch');j.test.give(H.jobs.api);H.prog.done[H.jobs.index('rosa')]=true;T.flags();H.jobs.start('overwatch');H.step(30);T.flags();
      const q=T.play('overwatch',M=>{const O=M.ow,E=O&&O.esc;return O&&O.stage==='garden'&&E&&E.s>10&&O.rifle.scopeT>.9},20000);
      const O=H.M.ow;return Object.assign(q,{s:O.esc&&O.esc.s,threats:O.threats.map(t=>t.id+':'+t.st),kevin:!!O.kevin})});console.log('  ',JSON.stringify(r))},
  frame:i=>{window.__T.bot('overwatch');const O=window.__ht.M&&window.__ht.M.ow;if(O&&O.kevin)window.__T.ev('KEVIN-PRESENT');if(O&&O.stage!=='garden')window.__T.ev('stage:'+O.stage)}};
