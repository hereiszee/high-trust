/* Eject over town: E twice in the air (real key presses), the seat fires, the canopy opens and the parachute "steers itself home".
   Chase camera, HUD on (tower line: "DAD-1 has ejected. Repeat: DAD-1 is enjoying the parachute."). */
module.exports={frames:105,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});
    await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(4));
    await p.evaluate(()=>{const H=window.__ht,F=HT.Jet.F,h=H.L.start;F.air=true;F.gear=0;F.gearK=0;F.spd=70;F.thr=.6;F.pos.set(h.x+60,150,h.z-180);F.q.setFromEuler(new THREE.Euler(0,Math.PI*.6,0,'YZX'));
      for(let i=0;i<45;i++){H.step(1);H.ow.update(H.camera,1/30)}});
    await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(2))},
  /* the second E lands on frame 8 of the capture, so the ejection itself is on camera */
  async after(s){s.__eject=true},
  frameNode:async(s,i)=>{if(i===8){await s.p.keyboard.press('e');await s.p.evaluate(()=>window.__T.ev('eject'))}}};
