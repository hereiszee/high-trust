/* v2 JET FLY-BY on Maple: the family on their front lawn (js/jet.js family(): Jen, Tyler, Maddie come out and wave when you buzz the
   house) in the foreground; DAD-1 comes over the roof of the house behind them, low, and screams over the street past the lens; the camera
   whips to follow it away down the block. Golden hour. The player is the pilot (boarded with a real E at the base). Nobody is armed.
   HUD: subtitles only (Jen: "Your father is buzzing the house. In a jet. On a Tuesday."). */
module.exports={frames:120,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(async()=>{const H=window.__ht,d=HT.Base.def();await window.__T.cast(['wife','son','daughter']);H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});
    await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(4));
    const r=await p.evaluate(async()=>{const H=window.__ht,F=HT.Jet.F,h=H.L.start;HT.Jet.family();
      for(let k=0;k<12;k++){H.step(5);await new Promise(r=>setTimeout(r,400))}
      const fam=(HT.Jet.S&&HT.Jet.S.fam||[]).map(f=>{const q=f.d.root.position;return[+q.x.toFixed(1),+q.z.toFixed(1),+f.d.root.rotation.y.toFixed(2)]});
      const fc=fam.length?fam.reduce((a,b)=>[a[0]+b[0]/fam.length,a[1]+b[1]/fam.length],[0,0]):[h.x,h.z];window.__fc=fc;
      /* the van moves down the kerb, out of the foreground */const V=H.VAN;V.pos.set(47,0,V.pos.z);try{H.syncVan&&H.syncVan()}catch(_){}try{HT.Jobs.api.syncCar(V)}catch(_){}
      /* the jet: from the south, behind the camera, heading +z (north) at 18 m, over the lens and over the family, away over their roof.
         The family turn to watch it (js/jet.js familyTick), so they face the lens as it comes in. */
      F.air=true;F.gear=0;F.gearK=0;F.spd=84;F.thr=.8;F.pos.set(fc[0]+1.5,24,fc[1]-150);F.q.setFromEuler(new THREE.Euler(0,-Math.PI/2,0,'YZX'));H.step(2);
      return{fam,fc,h,jet:[F.pos.x,F.pos.y,F.pos.z]}});console.log('  ',JSON.stringify(r));
    await p.evaluate(()=>{const H=window.__ht,R=window.__R,F=HT.Jet.F,c=window.__fc;R.golden({el:13,az:200,exp:1.05,far:420});R.cine(true);
      /* camera: on the far (south) kerb, 6 m in front of the family, 0.75 m up, looking up past them at their house's roofline */
      const cx=c[0]-1.4,cz=c[1]-4.6;let sl=null;
      window.__camFn=cam=>{const i=window.__trFrame||0;const j=[F.pos.x,F.pos.y,F.pos.z];const dz=j[2]-cz;
        const base=[c[0]+.3,2.7,c[1]+5];
        /* once the jet is over the lens the look follows it away over the roof */
        /* the framing holds (family below, their roof above); the look only leans a little after the jet as it goes away over the roof */
        const w=Math.max(0,Math.min(1,(dz+5)/45));const ww=.22*w*w*(3-2*w);
        const look=[base[0]+(j[0]-base[0])*ww,base[1]+(j[1]-base[1])*ww,base[2]+(j[2]-base[2])*ww];
        if(!sl)sl=look.slice();else for(let k=0;k<3;k++)sl[k]+=(look[k]-sl[k])*.55;
        /* handheld, plus a jolt as it goes over */const sh=R.shake(i,.02),jo=Math.max(0,1-Math.abs(dz)/25)*.05;
        cam.position.set(cx+sh[0]+Math.sin(i*5.1)*jo,.75+sh[1]+Math.sin(i*6.3)*jo,cz+sh[2]);cam.up.set(0,1,0);cam.lookAt(sl[0],sl[1],sl[2]);
        const f=46;if(cam.fov!==f){cam.fov=f;cam.updateProjectionMatrix()}R.sunPlace([c[0],0,c[1]])}})},
  /* held level on its line (the flight model would otherwise settle the nose): 24 m, down to 17 m over the street, climbing away over the roofs */
  frame:i=>{const F=HT.Jet.F,c=window.__fc,dz=F.pos.z-(c[1]-4.6);const y=dz<-60?24:dz<0?24-10*(dz+60)/60:14+Math.min(16,dz*.22);F.pos.y=y;F.vs=0;F.spd=84;
    F.q.setFromEuler(new THREE.Euler(0,-Math.PI/2,dz>0?Math.min(.18,dz*.006):0,'YZX'));const H=window.__ht;if(H.P.hp<100)H.P.hp=100}};
