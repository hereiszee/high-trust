/* Fort Sensible's jet (js/jet.js) low over Maple Heights, straight at the dad's own house: chase camera, HUD on (the jet's speed/altitude
   boxes, the minimap). Passing within 90 m of home under 60 m triggers the game's "buzz the house" line from Jen. Boarded with a real E. */
module.exports={frames:135,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(async()=>{const H=window.__ht,d=HT.Base.def();await window.__T.cast(['wife','son','daughter']);H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});
    await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(4));
    const r=await p.evaluate(()=>{const H=window.__ht,F=HT.Jet.F,h=H.L.start;
      /* 520 m out, 48 m up, nose on the house */const dx=.62,dz=.78,L=520;const sx=h.x-dx*L,sz=h.z-dz*L;window.__jt={h,dir:[dx,dz]};
      F.air=true;F.gear=0;F.gearK=0;F.spd=78;F.thr=.62;F.pos.set(sx,48,sz);const yaw=Math.atan2(-dz,dx);F.q.setFromEuler(new THREE.Euler(0,yaw,0,'YZX'));H.P.yaw=yaw+Math.PI/2;H.P.pitch=-.12;
      for(let i=0;i<60;i++){H.step(1);H.ow.update(H.camera,1/30);F.pos.y=48}
      return{on:HT.Jet.state(),home:h}});console.log('  ',JSON.stringify(r).slice(0,300))},
  frame:i=>{const F=HT.Jet.F;F.pos.y+=(44-F.pos.y)*.05;const st=HT.Jet.state();if(st&&st.on&&window.__ht.P.hp<100)window.__ht.P.hp=100}};
