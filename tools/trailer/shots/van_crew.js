/* The crew rolls out: Gary, Rick and Big Dave (and the player's dad at the wheel) in the family minivan, pulling away toward the camera.
   A built-in Maple Heights job is started only to put the crew in play (allies exist during jobs); E-equivalent enterVan seats them
   (index.html seatCrew). HUD off, low camera ahead of the van. */
module.exports={frames:105,warm:2,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T;await T.cast(['dad_gary','dad_rick','dad_dave','dad_doug']);
      H.startMissionWorld(2);H.step(2);T.flags();H.OWS.noTraffic=true;
      const V=H.M&&H.M.car||H.VAN;H.P.pos.set(V.pos.x+2,0,V.pos.z);H.enterVan();H.step(4);
      for(let k=0;k<10;k++){H.step(3);await new Promise(r=>setTimeout(r,300))}
      const e=H.CV,f=[-Math.sin(e.yaw),-Math.cos(e.yaw)],rt=[Math.cos(e.yaw),-Math.sin(e.yaw)];window.__v0={x:e.pos.x,z:e.pos.z,f,rt};
      return{ride:H.allies.map(a=>[a.id,!!a.ride,a.dude.root.visible]),van:[e.pos.x,e.pos.z,e.yaw],type:e.type,enemies:H.enemies.length,region:H.ow.regionAt(e.pos.x,e.pos.z)}});console.log('  ',JSON.stringify(r));
    await s.p.evaluate(()=>{const T=window.__T;T.hud(false);const v=window.__v0;
      const cx=v.x+v.f[0]*17+v.rt[0]*4.2,cz=v.z+v.f[1]*17+v.rt[1]*4.2;
      window.__camFn=c=>{const H=window.__ht,e=H.CV||H.VAN;c.position.set(cx,1.35,cz);c.lookAt(e.pos.x+v.f[0]*1.5,1.1,e.pos.z+v.f[1]*1.5);if(c.fov!==45){c.fov=45;c.updateProjectionMatrix()}}})},
  frame:i=>{const H=window.__ht;for(const e of H.enemies)e.hp=e.hp;H.keys.w=i>=12;if(i===12)window.__T.ev('pull')}};
