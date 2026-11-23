/* v2 TRAFFIC STAND-OFF: the family minivan stopped in an SUV's lane on a long Maple Heights street (js/openworld.js traffic). The SUV
   comes up, stops nose-to-nose, honks, and its driver says his line (the game's traffic bark: "Wave me through or move. I'm begging you.").
   Camera side-on between the two bumpers at 1 m, both grilles filling the frame. Golden hour. HUD: subtitles only. */
module.exports={frames:240,warm:4,
  async stage(s){const r=await s.p.evaluate(()=>{const H=window.__ht,T=window.__T,O=H.ow,G=O.roads(),OWS=H.OWS;
      OWS.trafficWant=0;OWS.noTraffic=true;H.step(1);OWS.noTraffic=false;
      if(!H.CV){H.P.pos.copy(H.VAN.pos);H.enterVan();H.step(2)}
      const edges=[];for(const [i,n] of G.nodes.entries())for(const e of n.e){const m=G.nodes[e.to],l=Math.hypot(m.x-n.x,m.z-n.z);if(l>=40&&O.regionAt((n.x+m.x)/2,(n.z+m.z)/2)==='maple')edges.push({a:i,b:e.to,l})}
      edges.sort((p,q)=>q.l-p.l);if(!edges.length)throw new Error('no maple edge');const E=edges[0],A=G.nodes[E.a],B=G.nodes[E.b],ux=(B.x-A.x)/E.l,uz=(B.z-A.z)/E.l,s_=1.5,at=Math.min(E.l-8,Math.max(36,E.l*.62));
      const x=A.x+ux*at-uz*s_,z=A.z+uz*at+ux*s_,yaw=Math.atan2(ux,uz),e=H.CV;e.pos.set(x,0,z);e.yaw=yaw;e.spd=0;if(e.car)Object.assign(e.car,{x,z,yaw,spd:0,steer:0,vdx:-Math.sin(yaw),vdz:-Math.cos(yaw)});
      H.P.yaw=yaw;H.P.pitch=-.06;H.step(30);
      window.__tc=O.trafficAdd({a:E.a,b:E.b,at:at-34,spd:9,max:9,type:'suv',color:'#7a2e2e'});window.__tl=O.trafficLog().length;window.__van=e;
      return{E,x,z,yaw,tc:!!window.__tc}});console.log('  ',JSON.stringify(r));
    await s.p.evaluate(()=>{const H=window.__ht,R=window.__R,e=window.__van;R.golden({el:20,az:200,exp:1.05});R.cine(true);
      const f=[-Math.sin(e.yaw),-Math.cos(e.yaw)],rt=[-f[1],f[0]];
      /* the gap between the grilles is ~4 m ahead of the van's centre; 5.2 m off to the side (the van's right: the kerb side), 1 m up */
      const mid=[e.pos.x+f[0]*5.7,e.pos.z+f[1]*5.7],side=1;const C=[mid[0]+rt[0]*3.3*side,.85,mid[1]+rt[1]*3.3*side];
      R.use([{f:0,pos:[C[0]+f[0]*.5,C[1],C[2]+f[1]*.5],look:[mid[0],.9,mid[1]],fov:54},{f:240,pos:[C[0]-f[0]*.3,C[1]-.05,C[2]-f[1]*.3],look:[mid[0],.95,mid[1]],fov:50,ease:'sine'}],{shake:.01})})},
  frame:i=>{const H=window.__ht,T=window.__T,L=H.ow.trafficLog();while(window.__tl<L.length){const ev=L[window.__tl++];T.ev(ev.ev||ev.e||JSON.stringify(ev))}}};
