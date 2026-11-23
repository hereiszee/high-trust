/* The family on the front lawn waving (js/jet.js family(): Jen, Tyler, Maddie come out when you buzz the house) as the jet screams over
   the roof. HUD off, camera on the street looking up at the house; the player is the pilot. No weapons anywhere near: it's a jet ride. */
module.exports={frames:105,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(async()=>{const H=window.__ht,d=HT.Base.def();await window.__T.cast(['wife','son','daughter']);H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});
    await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(4));
    const r=await p.evaluate(async()=>{const H=window.__ht,F=HT.Jet.F,h=H.L.start;HT.Jet.family();
      for(let k=0;k<12;k++){H.step(5);await new Promise(r=>setTimeout(r,400))}
      const fam=(HT.Jet.S&&HT.Jet.S.fam||[]).map(f=>{const q=f.d.root.position;return[+q.x.toFixed(1),+q.z.toFixed(1)]});window.__fam=fam;
      /* v2: the jet comes from behind the house, over the roof, straight over the family and the camera (~2.3 s in) */
      const fc=fam.length?fam.reduce((a,b)=>[a[0]+b[0]/fam.length,a[1]+b[1]/fam.length],[0,0]):[h.x,h.z];F.air=true;F.gear=0;F.gearK=0;F.spd=82;F.thr=.75;F.pos.set(fc[0]+4,32,fc[1]+200);
      F.q.setFromEuler(new THREE.Euler(0,Math.PI/2,0,'YZX'));H.step(2);
      /* the camera: across the street from the family, low, looking up over their heads */
      const c=fam.length?fam.reduce((a,b)=>[a[0]+b[0]/fam.length,a[1]+b[1]/fam.length],[0,0]):[h.x,h.z];window.__fc=c;
      return{fam,h,famS:!!HT.Jet.S}});console.log('  ',JSON.stringify(r));
    await p.evaluate(()=>{const T=window.__T;T.hud(false);const c=window.__fc,h=window.__ht.L.start;
      /* they face -z (rotation.y = PI), toward the street: low, 6.5 m in front and to the right (clear of the parked van), looking up past them at the roof */
      const cx=c[0]+5.6,cz=c[1]-5.2;
      window.__camFn=cam=>{const f=Math.min(1,(window.__trFrame||0)/105);cam.position.set(cx-f*.6,1.0,cz+f*.4);cam.lookAt(c[0]-1.2,2.5+f*1.2,c[1]+4);if(cam.fov!==46){cam.fov=46;cam.updateProjectionMatrix()}}})},
  frame:i=>{const F=HT.Jet.F;F.pos.y+=(26-F.pos.y)*.08}};
