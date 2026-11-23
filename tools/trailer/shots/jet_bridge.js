/* The topper: Fort Sensible's jet down on the river at 7 m and UNDER the High Bridge (js/jet.js HB, the "flew under the High Bridge"
   flight-log entry and the tower's line). Chase camera, HUD on. Boarded with a real E. */
module.exports={frames:96,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});
    await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(4));
    const r=await p.evaluate(()=>{const H=window.__ht,F=HT.Jet.F,B=HT.Jet.HB;const x=(B.river[0]+B.river[1])/2;
      F.air=true;F.gear=0;F.gearK=0;F.spd=70;F.thr=.65;F.pos.set(x,9,B.z+150);F.q.setFromEuler(new THREE.Euler(0,Math.PI/2,0,'YZX'));H.P.yaw=Math.PI;H.P.pitch=-.05;
      for(let i=0;i<20;i++){H.step(1);H.ow.update(H.camera,1/30);F.pos.y=9;F.pos.x=x}window.__jx=x;
      return{B,F:[F.pos.x,F.pos.y,F.pos.z],st:HT.Jet.state().on}});console.log('  ',JSON.stringify(r))},
  frame:i=>{const F=HT.Jet.F;F.pos.y+=(7-F.pos.y)*.15;F.pos.x+=(window.__jx-F.pos.x)*.1;if(Math.abs(F.pos.z-HT.Jet.HB.z)<3)window.__T.ev('under')}};
