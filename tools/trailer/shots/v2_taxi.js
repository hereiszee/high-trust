/* v2 (G, HUD on): taxi.js with a closer chase camera (5 m behind, 2 m up, over the van's roof), golden hour.
   Family beat: Dad Taxi (js/jobs/taxi.js). Jen's list on the fridge, the kids picked up at Maple Heights Elementary, the minivan on the
   school run with the clock running. HUD on (the job's own list, clock and ride meter); no guns in this job, weapon panel hidden anyway.
   Played by the job's own scripted driver from the moment the kids are aboard. */
module.exports={frames:120,warm:2,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T;H.step(2);await T.cast(['son','daughter','thug_hoodie','thug_brown','thug_beanie','jen']);
      H.prog.done[H.jobs.index('gary')]=true;T.flags();H.jobs.start('taxi');H.step(2);T.flags();const a=H.jobs.api;
      const r=T.play('taxi',M=>a.M.live&&a.M.live.K&&a.M.live.K.inCar().length>=3,20000);
      /* a little way down the road, rolling */T.play('taxi',null,120);return Object.assign(r,{inCar:a.M.live.K.inCar().length})});console.log('  ',JSON.stringify(r));
    await s.p.evaluate(()=>{window.__T.hide('.ht-wp,.ht-wi');const H=window.__ht,R=window.__R;R.golden({el:14,az:230,exp:1.05,hemi:.6});let sm=null,sl=null;
      window.__camFn=cam=>{const e=H.CV||H.VAN,f=[-Math.sin(e.yaw),-Math.cos(e.yaw)];const pos=[e.pos.x-f[0]*5.2,2.05,e.pos.z-f[1]*5.2],look=[e.pos.x+f[0]*6,1.2,e.pos.z+f[1]*6];
        if(!sm){sm=pos.slice();sl=look.slice()}else for(let k=0;k<3;k++){sm[k]+=(pos[k]-sm[k])*.25;sl[k]+=(look[k]-sl[k])*.25}
        cam.position.set(sm[0],sm[1],sm[2]);cam.up.set(0,1,0);cam.lookAt(sl[0],sl[1],sl[2]);if(cam.fov!==58){cam.fov=58;cam.updateProjectionMatrix()}R.sunPlace([e.pos.x,0,e.pos.z])}})},
  frame:i=>{window.__T.bot('taxi')}};
