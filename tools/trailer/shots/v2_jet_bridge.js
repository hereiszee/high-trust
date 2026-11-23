/* v2 UNDER THE HIGH BRIDGE: DAD-1 down on the river at 7 m (js/jet.js HB, the "flew under the High Bridge" flight-log entry and the
   tower's line), seen from the riverbank beyond the bridge, low, looking back up the river: the viaduct fills the top of the frame,
   the jet comes out from under the deck at the lens and goes past on camera-left. Golden hour. HUD: subtitles only. */
module.exports={frames:80,from:30,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});
    await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(4));
    const r=await p.evaluate(async()=>{const H=window.__ht,F=HT.Jet.F,B=HT.Jet.HB;const x=(B.river[0]+B.river[1])/2;
      F.air=true;F.gear=0;F.gearK=0;F.spd=72;F.thr=.7;F.pos.set(x,9,B.z+125);F.q.setFromEuler(new THREE.Euler(0,Math.PI/2,0,'YZX'));H.P.yaw=Math.PI;H.P.pitch=-.05;
      for(let i=0;i<10;i++){H.step(1);H.ow.update(H.camera,1/30);F.pos.y=9;F.pos.x=x;F.pos.z=B.z+125;await new Promise(r=>setTimeout(r,200))}window.__jx=x;
      return{B,F:[F.pos.x,F.pos.y,F.pos.z],gy:H.ground?H.ground(x+9,B.z-28):null}});console.log('  ',JSON.stringify(r));
    await p.evaluate(()=>{const H=window.__ht,R=window.__R,F=HT.Jet.F,B=HT.Jet.HB,x=window.__jx;R.golden({el:11,az:330,exp:1.05,far:420});R.cine(true);R.jetClean();window.__T.hide('.ht-root .ht-sub,#sub');
      /* the bank: 8 m off the jet's line, 17 m downstream of the bridge, 1.2 m above the ground there */
      const gy=(H.ground&&H.ground(x+8,B.z-17))||0;const C=[x+8,gy+1.0,B.z-17];let sl=null;
      window.__camFn=cam=>{const i=window.__trFrame||0;const j=[F.pos.x,F.pos.y,F.pos.z];const dz=j[2]-C[2];
        /* framing: the deck and the arch across the top, the river below; the look comes down onto the jet as it closes */
        const base=[x,B.deck*.55,B.z];const w=Math.max(0,Math.min(1,(40-dz)/40)),ww=w*w*(3-2*w);
        const look=[base[0]+(j[0]-base[0])*ww,base[1]+(j[1]-base[1])*ww,base[2]+(j[2]-base[2])*ww];
        if(!sl)sl=look.slice();else for(let k=0;k<3;k++)sl[k]+=(look[k]-sl[k])*.5;
        const jo=Math.max(0,1-Math.abs(dz)/20)*.05,sh=R.shake(i,.015);
        cam.position.set(C[0]+sh[0]+Math.sin(i*5.3)*jo,C[1]+sh[1]+Math.sin(i*6.7)*jo,C[2]+sh[2]);cam.up.set(0,1,0);cam.lookAt(sl[0],sl[1],sl[2]);
        const f=50;if(cam.fov!==f){cam.fov=f;cam.updateProjectionMatrix()}R.sunPlace([x,0,B.z])}})},
  frame:i=>{const F=HT.Jet.F,B=HT.Jet.HB;F.pos.y+=(6-F.pos.y)*.2;F.pos.x+=(window.__jx-F.pos.x)*.2;F.spd=72;F.q.setFromEuler(new THREE.Euler(0,Math.PI/2,0,'YZX'));
    if(Math.abs(F.pos.z-B.z)<3&&!window.__u){window.__u=1;window.__T.ev('under')}const H=window.__ht;if(H.P.hp<100)H.P.hp=100}};
