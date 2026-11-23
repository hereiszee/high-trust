/* v2 MINIVAN PASS: the family minivan (the player's VAN, driven with W) pulls away from the house and sweeps past a lens on the kerb,
   0.45 m off the ground, about a metre and a half off its flank; the camera whips round to follow it away down Maple. Golden hour.
   HUD: none on this one (subtitles only). */
const LANE=16.2,CX=74,CZ=18.0;
module.exports={frames:120,warm:2,
  async stage(s){const r=await s.p.evaluate(async([LANE])=>{const H=window.__ht;H.OWS.noTraffic=true;
      if(!H.CV){H.P.pos.set(H.VAN.pos.x+2,0,H.VAN.pos.z);H.enterVan();H.step(4)}
      const e=H.CV,x=34,z=LANE,yaw=-Math.PI/2;/* nose east (+x) */
      e.pos.set(x,0,z);e.yaw=yaw;e.spd=0;if(e.car)Object.assign(e.car,{x,z,yaw,spd:0,steer:0,vdx:-Math.sin(yaw),vdz:-Math.cos(yaw)});H.P.yaw=yaw;
      for(let k=0;k<10;k++){H.step(3);await new Promise(r=>setTimeout(r,300))}window.__van=e;
      return{van:[e.pos.x,e.pos.z,e.yaw,e.type]}},[LANE]);console.log('  ',JSON.stringify(r));
    await s.p.evaluate(([CX,CZ])=>{const H=window.__ht,R=window.__R,e=window.__van;R.golden({el:12,az:260,exp:1.05});R.cine(true);let sl=null;
      window.__camFn=cam=>{const i=window.__trFrame||0;const vx=e.pos.x,vz=e.pos.z;
        /* look: at the van's nose while it comes, then lead it as it goes past and away */
        const lead=vx>CX-6?Math.min(4,(vx-(CX-6))*.6):0;const look=[vx+1.8+lead,.95,vz];
        if(!sl)sl=look.slice();else for(let k=0;k<3;k++)sl[k]+=(look[k]-sl[k])*.6;
        const d=Math.abs(vx-CX),jo=Math.max(0,1-d/8)*.03,sh=R.shake(i,.012);
        cam.position.set(CX+sh[0],.45+sh[1]+Math.sin(i*6.1)*jo,CZ+sh[2]);cam.up.set(0,1,0);cam.lookAt(sl[0],sl[1],sl[2]);
        const u=Math.max(0,Math.min(1,(vx-(CX-12))/14)),f=32+12*u*u*(3-2*u);if(cam.fov!==f){cam.fov=f;cam.updateProjectionMatrix()}R.sunPlace([vx,0,vz])}},[CX,CZ])},
  frame:i=>{const H=window.__ht,e=window.__van;H.keys.w=i>=6;const dz=16.2-e.pos.z;/* hold the lane */H.keys.a=dz<-.3;H.keys.d=dz>.3;if(i===6)window.__T.ev('pull')}};
