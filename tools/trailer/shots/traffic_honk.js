/* Driving beat: the minivan nose-to-nose with an SUV on a Maple Heights street. The SUV stops short, honks, and the driver complains
   (subtitle from js/openworld.js traffic barks). HUD on, chase camera behind the van. Horns are logged for the sound mix. */
module.exports={frames:240,warm:4,
  async stage(s){const r=await s.p.evaluate(()=>{const H=window.__ht,T=window.__T,O=H.ow,G=O.roads(),OWS=H.OWS;
      OWS.trafficWant=0;OWS.noTraffic=true;H.step(1);OWS.noTraffic=false;
      if(!H.CV){H.P.pos.copy(H.VAN.pos);H.enterVan();H.step(2)}
      /* a long straight Maple street, well away from junction clutter */
      const edges=[];for(const [i,n] of G.nodes.entries())for(const e of n.e){const m=G.nodes[e.to],l=Math.hypot(m.x-n.x,m.z-n.z);if(l>=40&&O.regionAt((n.x+m.x)/2,(n.z+m.z)/2)==='maple')edges.push({a:i,b:e.to,l})}
      edges.sort((p,q)=>q.l-p.l);if(!edges.length)throw new Error('no maple edge');const E=edges[0],A=G.nodes[E.a],B=G.nodes[E.b],ux=(B.x-A.x)/E.l,uz=(B.z-A.z)/E.l,s_=1.5,at=Math.min(E.l-8,Math.max(36,E.l*.62));
      /* the van in the SUV's lane, facing it */
      const x=A.x+ux*at-uz*s_,z=A.z+uz*at+ux*s_,yaw=Math.atan2(ux,uz),e=H.CV;e.pos.set(x,0,z);e.yaw=yaw;e.spd=0;if(e.car)Object.assign(e.car,{x,z,yaw,spd:0,steer:0,vdx:-Math.sin(yaw),vdz:-Math.cos(yaw)});
      H.P.yaw=yaw;H.P.pitch=-.06;H.step(30);
      window.__tc=O.trafficAdd({a:E.a,b:E.b,at:at-34,spd:9,max:9,type:'suv',color:'#7a2e2e'});window.__tl=O.trafficLog().length;
      return{E,x,z,yaw,tc:!!window.__tc}});console.log('  ',JSON.stringify(r))},
  frame:i=>{const H=window.__ht,T=window.__T,L=H.ow.trafficLog();while(window.__tl<L.length){const ev=L[window.__tl++];T.ev(ev.ev||ev.e||JSON.stringify(ev))}}};
