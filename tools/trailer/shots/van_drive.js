/* Rolling out: the family minivan pulls away and drives down the longest Maple Heights street, chase camera, HUD on (speedometer,
   minimap, Doors Locked). Driven with the game's own keys (W, A/D) by a lane-keeping script; light ambient traffic left on. */
module.exports={frames:120,warm:2,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T,O=H.ow,G=O.roads();
      const edges=[];for(const [i,n] of G.nodes.entries())for(const e of n.e){const m=G.nodes[e.to],l=Math.hypot(m.x-n.x,m.z-n.z);if(O.regionAt((n.x+m.x)/2,(n.z+m.z)/2)==='maple')edges.push({a:i,b:e.to,l})}
      edges.sort((p,q)=>q.l-p.l);const E=edges[0],A=G.nodes[E.a],B=G.nodes[E.b],ux=(B.x-A.x)/E.l,uz=(B.z-A.z)/E.l;
      if(!H.CV){H.P.pos.copy(H.VAN.pos);H.enterVan();H.step(2)}
      const x=A.x+ux*4-uz*1.5,z=A.z+uz*4+ux*1.5,yaw=Math.atan2(-ux,-uz),e=H.CV;e.pos.set(x,0,z);e.yaw=yaw;e.spd=0;if(e.car)Object.assign(e.car,{x,z,yaw,spd:0,steer:0,vdx:-Math.sin(yaw),vdz:-Math.cos(yaw)});
      H.P.yaw=yaw;H.P.pitch=-.08;H.step(20);window.__lane={x0:A.x-uz*1.5,z0:A.z+ux*1.5,ux,uz,yaw,L:E.l};
      for(let k=0;k<8;k++){H.step(3);await new Promise(r=>setTimeout(r,300))}
      return{E,len:E.l,yaw}});console.log('  ',JSON.stringify(r))},
  frame:i=>{const H=window.__ht,e=H.CV,k=H.keys,L=window.__lane;if(!e||!L)return;
    const lat=(e.pos.x-L.x0)*-L.uz+(e.pos.z-L.z0)*L.ux;let d=L.yaw-e.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));const st=d*2.2+lat*.18;
    k.a=st>.03&&i%2===0;k.d=st<-.03&&i%2===0;k.w=i>=6&&e.spd<13;k.s=false;if(i===6)window.__T.ev('pull')}};
