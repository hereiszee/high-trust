/* v2 MAIN GUN (cinematic): tank.js staged the same way, golden hour, the camera low off the front quarter, 7 m ahead of the muzzle and
   5 m off the line of fire (the gun's safety cone is clear: nobody is downrange on the apron), a kick on the blast. HUD: subtitles only.
   Fort Sensible's tank (js/tank.js): boarded with a real E, the turret swings round with the mouse look and the main gun fires with a
   real left click down the empty apron (the gun refuses whenever a person is in the line of fire; nobody is). Chase camera, HUD on. */
const AIM=Math.PI/2+.25;
module.exports={frames:96,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.tank.x+2.6,0,d.tank.z);H.step(4)});
    await p.keyboard.press('e');
    /* v2: out of the motor-pool shelter (its roof hid the tank) onto the open apron, nose west */
    const r=await p.evaluate(a=>{const H=window.__ht,P=H.P;for(let i=0;i<20;i++){H.step(1)}const e=H.CV,x=246,z=211,yaw=Math.PI/2;
      e.pos.set(x,0,z);e.yaw=yaw;e.spd=0;if(e.car)Object.assign(e.car,{x,z,yaw,spd:0,steer:0,vdx:-Math.sin(yaw),vdz:-Math.cos(yaw)});
      P.yaw=a-.75;P.pitch=-.22;H.step(80);HT.Tank.S.reload=0;return Object.assign(HT.Tank.state(),{at:[e.pos.x,e.pos.z]})},AIM);console.log('  ',JSON.stringify(r));
    await p.evaluate(()=>{const H=window.__ht,R=window.__R,e=H.CV,t=e.obj.userData.tank,m=new THREE.Vector3(),d=new THREE.Vector3();R.golden({el:12,az:150,exp:1.05,hemi:.6});R.cine(true);let C=null,L=null;
      window.__camFn=cam=>{const i=window.__trFrame||0;e.obj.updateMatrixWorld(true);t.muzzle.getWorldPosition(m);d.set(1,0,0).transformDirection(t.mantle.matrixWorld).normalize();
        if(i<30||!C){/* settles with the turret */const px=-d.z,pz=d.x;C=[m.x+d.x*7+px*5,1.0,m.z+d.z*7+pz*5];L=[m.x-d.x*2.2,1.9,m.z-d.z*2.2]}
        const kk=R.kick;if(window.__fired&&!window.__kd){window.__kd=1;R.kick=1}const sh=R.shake(i,.008);const j=R.kick>0?[Math.sin(i*7)*R.kick*.12,Math.sin(i*9+1)*R.kick*.15,0]:[0,0,0];if(R.kick>0){R.kick*=.82;if(R.kick<.02)R.kick=0}
        cam.position.set(C[0]+sh[0]+j[0],C[1]+sh[1]+j[1],C[2]+sh[2]);cam.up.set(0,1,0);cam.lookAt(L[0],L[1],L[2]);if(cam.fov!==42){cam.fov=42;cam.updateProjectionMatrix()}R.sunPlace([e.pos.x,0,e.pos.z])}})},
  frame:i=>{const H=window.__ht,P=H.P,A=Math.PI/2+.25;H.keys.w=i>=0&&i<28;if(i>=0&&i<30){const k=i/30,e=k*k*(3-2*k);P.yaw=A-.75+.75*e;P.pitch=-.22-.08*e}},
  frameNode:async(s,i)=>{if(i===36){await s.p.mouse.move(960,540);await s.p.mouse.down();await s.p.evaluate(()=>{window.__T.ev('tank');window.__fired=1})}if(i===38)await s.p.mouse.up()}};
