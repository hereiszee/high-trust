/* Riverside Flats changing: Main St @ 2nd looking east, the block's trust eased from Doors Locked to Doors Unlocked on screen
   (OW.dress eases the per-block tint; flower boxes, string lights, chalk and waving neighbours switch on with the tiers).
   HUD off, slow push-in camera. */
module.exports={frames:150,warm:2,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,P=H.P,T=window.__T;H.prog.done[0]=H.prog.done[1]=true;T.flags();H.prog.trustR=8;H.enterHub();T.flags();H.openBridge();H.dress(8);
      P.pos.set(381,0,47);H.collide(P.pos,.35);P.yaw=-0.62;P.pitch=-.05;H.step(4);H.ow.buildAll();H.ow.dress(8,true);H.step(2);
      for(let k=0;k<20;k++){H.step(10);await new Promise(r=>setTimeout(r,300))}
      return{region:H.ow.regionAt(P.pos.x,P.pos.z),trustR:H.prog.trustR}});console.log('  ',JSON.stringify(r));
    await s.p.evaluate(()=>{const T=window.__T,H=window.__ht;T.hud(false);
      /* hide the dad: the camera is the star */H.P.dude.root.visible=false;
      window.__camFn=c=>{const f=Math.min(1,(window.__trFrame||0)/150),e=f*f*(3-2*f);c.position.set(372+e*7,2.3+e*.4,51.5-e*3.5);c.lookAt(398+e*4,2.2,32+e*2);if(c.fov!==55){c.fov=55;c.updateProjectionMatrix()}}})},
  frame:i=>{const H=window.__ht;if(i===24){H.prog.trustR=92;H.ow.dress(92);window.__T.ev('dress')}H.P.dude.root.visible=false}};
