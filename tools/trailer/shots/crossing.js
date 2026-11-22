/* Family beat: Crossing Guard (js/jobs/crossing.js) at dusk on 2nd St, Riverside: the dad in a hi-vis vest holds the STOP sign while the
   line of kids crosses. No guns exist in this job; the HUD's weapon panel is hidden anyway so nothing gun-shaped shares a frame with the kids.
   Played by the job's own scripted player, captured from the moment the 2nd St crossing starts (away from the church). */
module.exports={frames:150,warm:4,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T;const j=H.jobs.registry.get('crossing');j.test.give(H.jobs.api);H.prog.done[H.jobs.index('dee')]=true;T.flags();
      await T.cast(['dee','son','daughter','nb_kid','nb_gran','nb_pops','nb_office','nb_sweater','nb_teen','nb_kenji','nb_marcus','nb_mei','nb_lucia','thug_cap','thug_hoodie','thug_track','thug_f_hood','thug_beanie','thug_red','thug_jacket']);
      H.jobs.start('crossing');H.step(22);T.flags();
      return T.play('crossing',M=>{const C=M.cg,B=C&&C.bot;return B&&B.i===17},20000)});console.log('  ',JSON.stringify(r));
    await s.p.evaluate(()=>{const T=window.__T;T.hide('.ht-wp,.ht-wi,.ht-wg');for(const e of document.querySelectorAll('.ht-bn'))e.style.visibility='hidden'})},
  frame:i=>{window.__T.bot('crossing')}};
