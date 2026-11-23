/* v2 JET FLY-BY on Maple: the family on their front lawn (js/jet.js family(): Jen, Tyler, Maddie come out and wave when you buzz the
   house) in the foreground; DAD-1 comes over the roof of the house behind them, low, and screams over the street past the lens; the camera
   whips to follow it away down the block. Golden hour. The player is the pilot (boarded with a real E at the base). Nobody is armed.
   HUD: subtitles only (Jen: "Your father is buzzing the house. In a jet. On a Tuesday."). */
module.exports={frames:150,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(async()=>{const H=window.__ht,d=HT.Base.def();await window.__T.cast(['wife','son','daughter']);H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});
    await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(4));
    const r=await p.evaluate(async()=>{const H=window.__ht,F=HT.Jet.F,h=H.L.start;HT.Jet.family();
      for(let k=0;k<12;k++){H.step(5);await new Promise(r=>setTimeout(r,400))}
      const fam=(HT.Jet.S&&HT.Jet.S.fam||[]).map(f=>{const q=f.d.root.position;return[+q.x.toFixed(1),+q.z.toFixed(1),+f.d.root.rotation.y.toFixed(2)]});
      const fc=fam.length?fam.reduce((a,b)=>[a[0]+b[0]/fam.length,a[1]+b[1]/fam.length],[0,0]):[h.x,h.z];window.__fc=fc;
      /* the van moves down the kerb, out of the foreground */const V=H.VAN;V.pos.set(47,0,V.pos.z);try{H.syncVan&&H.syncVan()}catch(_){}try{HT.Jobs.api.syncCar(V)}catch(_){}
      /* the jet: from the NORTH, over the roofs behind the house, heading -z, low over the street and the lens, away south.
         (Flown from the south it vanished behind the houses: something in the world culls it north of the street when seen from the
         ground, so the take keeps it on the camera's side of the roofline.) */
      F.air=true;F.gear=0;F.gearK=0;F.spd=84;F.thr=.8;F.pos.set(fc[0]+5,26,fc[1]-150);F.q.setFromEuler(new THREE.Euler(0,-Math.PI/2,0,'YZX'));H.step(2);
      return{fam,fc,h,jet:[F.pos.x,F.pos.y,F.pos.z]}});console.log('  ',JSON.stringify(r));
    await p.evaluate(()=>{const H=window.__ht,R=window.__R,F=HT.Jet.F,c=window.__fc;R.golden({el:13,az:200,exp:1.05,far:420});R.cine(true);R.jetClean();
      /* One continuous shot from just behind the family, low on their front walk, looking south across the street: Jen and the kids
         in the foreground waving, the jet coming in over the rooftops opposite (top-right), growing, and screaming over their heads and
         the lens. (Seen from the ground the jet is culled once it is north of the street, so it is flown toward this side.) */
      const A={p:[c[0]-1.4,1.05,c[1]+2.8],l:[c[0]-1.0,5.5,c[1]-22],f:48};
      window.__camFn=cam=>{const i=window.__trFrame||0;const j=[F.pos.x,F.pos.y,F.pos.z];const dz=A.p[2]-j[2];
        /* the last few frames tilt up after it as it goes over */const w=Math.max(0,Math.min(1,(30-Math.max(dz,4))/26));const ww=w*w*(3-2*w)*.28;
        const look=[A.l[0]+(j[0]-A.l[0])*ww,A.l[1]+(j[1]-A.l[1])*ww,A.l[2]+(j[2]-A.l[2])*ww];
        const sh=R.shake(i,.012),jo=Math.max(0,1-Math.abs(dz)/25)*.04;
        cam.position.set(A.p[0]+sh[0]+Math.sin(i*5.1)*jo,A.p[1]+sh[1]+Math.sin(i*6.3)*jo,A.p[2]+sh[2]);cam.up.set(0,1,0);cam.lookAt(look[0],look[1],look[2]);
        if(cam.fov!==A.f){cam.fov=A.f;cam.updateProjectionMatrix()}R.sunPlace([c[0],0,c[1]])}})},
  /* held level on its line: 24 m over the far roofs, 13 m over the street, climbing a little as it goes over */
  frame:i=>{const F=HT.Jet.F,c=window.__fc,dz=(c[1]+2.8)-F.pos.z;F.pos.x=c[0]+5;const y=dz>45?26:dz>0?14.5+11.5*dz/45:14.5+Math.min(20,-dz*.3);F.pos.y=y;F.vs=0;F.spd=84;
    F.q.setFromEuler(new THREE.Euler(0,-Math.PI/2,dz<0?Math.min(.3,-dz*.01):0,'YZX'));const H=window.__ht;if(H.P.hp<100)H.P.hp=100;if(i%10===0)window.__T.ev('j '+[F.pos.x,F.pos.y,F.pos.z].map(v=>v.toFixed(0)).join(','))}};
