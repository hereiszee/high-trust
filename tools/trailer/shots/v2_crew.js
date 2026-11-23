/* v2 THE CREW: the dad and his crew (Gary, Rick, Big Dave, Doug: the allies who follow him in the open world) walk down the middle of
   Maple toward a long lens on the asphalt, the family minivan parked behind them, at golden hour. The dad walks with W; the crew follow
   on their own AI. Guns stowed (equip null): it's a walk, not a raid. HUD: none. */
module.exports={frames:110,warm:4,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T;await T.cast(['dad_gary','dad_rick','dad_dave','dad_doug']);
      H.OWS.noTraffic=true;H.startMissionWorld(2);H.step(2);T.flags();H.OWS.noTraffic=true;
      if(H.CV)H.exitVehicle();H.step(2);
      /* the van parked on the north kerb behind them, nose east */const V=H.VAN;V.pos.set(40,0,16.6);V.yaw=-Math.PI/2;try{HT.Jobs.api.syncCar(V)}catch(_){}
      const P=H.P;P.pos.set(45,0,14.6);H.collide(P.pos,.35);P.yaw=-Math.PI/2;P.pitch=0;
      /* the crew in a loose line abreast of him */const sl=[[-.6,-2.2],[-.9,2.1],[-1.6,-4.3],[-1.9,4.0]];
      H.allies.forEach((a,k)=>{const o=sl[k%4];a.pos.set(45+o[0],0,14.6+o[1]);a.gun=null;try{H.dude.equip(a.dude,null)}catch(_){}a.dude.root.position.copy(a.pos)});
      for(let k=0;k<6;k++){H.step(3);await new Promise(r=>setTimeout(r,300))}
      return{allies:H.allies.map(a=>[a.id,+a.pos.x.toFixed(1),+a.pos.z.toFixed(1),!!a.ride]),mode:H.mode,M:H.M&&H.M.def.id}});console.log('  ',JSON.stringify(r));
    await s.p.evaluate(()=>{const H=window.__ht,R=window.__R,P=H.P;R.golden({el:11,az:245,exp:1.05});R.cine(true);
      /* long lens on the asphalt 24 m ahead, a slow creep back so their walk holds its size */
      R.use([{f:0,pos:[70,.55,14.4],look:[45,1.25,14.6],fov:19},{f:110,pos:[71.5,.6,14.4],look:i=>[P.pos.x+1,1.3,14.6],fov:17,ease:'sine'}],{shake:.006,sunAt:()=>[P.pos.x,0,P.pos.z]})})},
  frame:i=>{const H=window.__ht;H.keys.w=i>=0;H.keys.shift=false;H.P.yaw=-Math.PI/2;for(const a of H.allies){if(a.gun){a.gun=null;try{H.dude.equip(a.dude,null)}catch(_){}}}}};
