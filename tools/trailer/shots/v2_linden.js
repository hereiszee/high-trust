/* v2 (G, HUD on): linden.js with the gameplay camera pulled in over the shoulder (25% closer to the dad, a slightly longer lens).
   Action: Big Dave's job at Linden Park (built-in mission 2, waves). The crew in cover, the dad with The Talking-To (the beanbag shotgun)
   knocking the fight out of the wave; real mouse clicks fire, the script only aims. HUD on. */
module.exports={frames:105,warm:2,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T;await T.cast(['dad_gary','dad_rick','dad_dave','dad_doug']);
      H.startMissionWorld(2);H.step(2);T.flags();try{H.give('beanbag');H.swap('beanbag')}catch(e){}
      let n=0;while(n<900&&H.enemies.filter(e=>e.state!=='dead'&&e.alert).length<3){H.step(1);H.P.hp=100;n++}
      for(let k=0;k<6;k++){H.step(3);await new Promise(r=>setTimeout(r,300))}
      return{n,enemies:H.enemies.map(e=>[e.state,Math.round(e.pos.x),Math.round(e.pos.z)]),P:[H.P.pos.x,H.P.pos.z],cur:H.P.cur}});console.log('  ',JSON.stringify(r));
    await s.p.evaluate(()=>{const H=window.__ht,P=H.P;window.__camFn=cam=>{const piv=new THREE.Vector3(P.pos.x,P.visY+1.55,P.pos.z);cam.position.lerp(piv,.25);const f=cam.fov*.92;cam.fov=f;cam.updateProjectionMatrix()}})},
  frame:i=>{const H=window.__ht,P=H.P;P.hp=100;window.__fire=false;const c=H.camera.position;
    const live=H.enemies.filter(e=>e.state!=='dead'&&e.state!=='surrender'&&e.state!=='cuffed').sort((a,b)=>Math.hypot(a.pos.x-P.pos.x,a.pos.z-P.pos.z)-Math.hypot(b.pos.x-P.pos.x,b.pos.z-P.pos.z));
    const e=live[0];P.aim=true;if(!e)return;const y=Math.atan2(-(e.pos.x-c.x),-(e.pos.z-c.z)),pt=Math.atan2(1.2-c.y,Math.hypot(e.pos.x-c.x,e.pos.z-c.z));
    let d=y-P.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));P.yaw+=d*.22;P.pitch+=(pt-P.pitch)*.22;window.__aimT=Math.abs(d)<.02?(window.__aimT||0)+1:0;if(window.__aimT>=8){window.__fire=true;window.__aimT=-14}},
  frameNode:async(s,i)=>{const f=await s.p.evaluate(()=>window.__fire);if(f){await s.p.mouse.move(960,540);await s.p.mouse.down();await s.p.evaluate(()=>window.__T.ev('shot_beanbag'))}else await s.p.mouse.up()}};
