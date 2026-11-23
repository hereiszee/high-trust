/* v2 THE CREW: the dad and his crew (Gary, Rick, Big Dave, Doug: the allies who follow him in the open world) walk down the middle of
   Maple toward a long lens on the asphalt, the family minivan parked behind them, at golden hour. The dad walks with W; the crew follow
   on their own AI. Guns stowed (equip null): it's a walk, not a raid. HUD: none. */
module.exports={frames:110,from:28,warm:4,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T;await T.cast(['dad_gary','dad_rick','dad_dave','dad_doug']);
      H.OWS.noTraffic=true;H.startMissionWorld(2);H.step(2);T.flags();H.OWS.noTraffic=true;
      if(H.CV)H.exitVehicle();H.step(2);
      /* staging: with the job's nav cleared the crew use the game's plain follow (index.html updAlly: the formation that flanks the dad)
         instead of holding the park's cover points */
      if(H.L)H.L.nav=null;try{H.dude.equip(H.P.dude,null)}catch(_){}
      /* the van parked on the north kerb behind them, nose east */const V=H.VAN;V.pos.set(49,0,17.3);V.yaw=-Math.PI/2;try{HT.Jobs.api.syncCar(V)}catch(_){}
      const P=H.P;P.pos.set(56,0,15.4);H.collide(P.pos,.35);P.yaw=-Math.PI/2;P.pitch=0;
      /* the crew in a loose line abreast of him */const sl=[[-.6,-2.2],[-.9,2.1],[-1.6,-4.3],[-1.9,4.0]];
      H.allies.forEach((a,k)=>{const o=sl[k%4];a.pos.set(56+o[0],0,15.4+o[1]);a.gun=null;try{H.dude.equip(a.dude,null)}catch(_){}a.dude.root.position.copy(a.pos)});
      for(let k=0;k<6;k++){H.step(3);await new Promise(r=>setTimeout(r,300))}
      return{allies:H.allies.map(a=>[a.id,+a.pos.x.toFixed(1),+a.pos.z.toFixed(1),!!a.ride]),mode:H.mode,M:H.M&&H.M.def.id}});console.log('  ',JSON.stringify(r));
    await s.p.evaluate(()=>{const H=window.__ht,R=window.__R,P=H.P;R.golden({el:11,az:245,exp:1.05});R.cine(true);
      /* long lens on the asphalt 24 m ahead, a slow creep back so their walk holds its size */
      R.use([{f:0,pos:[76,.6,15.3],look:i=>[P.pos.x-1,1.2,15.4],fov:20},{f:110,pos:[77.5,.62,15.3],look:i=>[P.pos.x+.5,1.25,15.4],fov:18,ease:'sine'}],{shake:.006,sunAt:()=>[P.pos.x,0,P.pos.z]});
      window.__T.hide('.ht-wp,.ht-wi,.ht-wg')})},
  frame:i=>{const H=window.__ht;H.keys.w=i>=0;H.keys.shift=false;H.P.yaw=-Math.PI/2;for(const a of H.allies){if(a.gun){a.gun=null;try{H.dude.equip(a.dude,null)}catch(_){}}}try{if(H.P.dude&&H.P.dude.gun)H.dude.equip(H.P.dude,null)}catch(_){}}};
