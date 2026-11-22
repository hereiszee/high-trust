/* Night: Sign of the Times (js/jobs/sabotage.js). 3 a.m. at Mill St Auto Recovery, the dad crouched in the shadows letting the air out
   of a tow truck's tyres ("Don't slash them. We're not monsters."). HUD on (stealth meter, clock). Played by the job's own scripted player;
   captured from the moment a valve starts hissing. */
module.exports={frames:72,warm:2,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T;T.unlock('sabotage');await T.castJob('sabotage');await T.cast(['nb_pops','thug_track','thug_jacket']);
      H.jobs.start('sabotage');H.step(30);T.flags();
      return T.play('sabotage',M=>M.valves&&M.valves.some(v=>!v.done&&v.prog>.12),30000)});console.log('  ',JSON.stringify(r))},
  /* v2: the default camera sat against the truck's grille; frame the crouching dad from the side instead (HUD stays on) */
  async after(s){await s.p.evaluate(()=>{const H=window.__ht,P=H.P,f=[-Math.sin(P.yaw),-Math.cos(P.yaw)],r=[Math.cos(P.yaw),-Math.sin(P.yaw)];
    const c={x:P.pos.x-r[0]*2.4-f[0]*1.6,z:P.pos.z-r[1]*2.4-f[1]*1.6},l={x:P.pos.x+f[0]*.9,z:P.pos.z+f[1]*.9};
    window.__camFn=cam=>{const k=Math.min(1,(window.__trFrame||0)/72);cam.position.set(c.x+r[0]*k*.5,1.05-k*.15,c.z+r[1]*k*.5);cam.lookAt(l.x,.55,l.z);if(cam.fov!==50){cam.fov=50;cam.updateProjectionMatrix()}}})},
  frame:i=>{window.__T.bot('sabotage')}};
