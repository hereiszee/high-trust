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
      window.__tc=O.trafficAdd({a:E.a,b:E.b,at:at-34,spd:9,max:9,type:'suv',color:'#7a2e2e'});window.__tl=O.trafficLog().length;window.__van=e;window.__tcKeys=window.__tc?Object.keys(window.__tc).slice(0,20):null;
      return{E,x,z,yaw,tc:window.__tcKeys}});console.log('  ',JSON.stringify(r));
    await s.p.evaluate(()=>{const H=window.__ht,R=window.__R,e=window.__van;R.golden({el:20,az:200,exp:1.05});R.cine(true);
      const f=[-Math.sin(e.yaw),-Math.cos(e.yaw)],rt=[-f[1],f[0]];let sm=null,sl=null;
      /* side-on to the gap between the two grilles (the van's nose and the SUV's, wherever it stops), at bumper height on the kerb side,
         as far off the lane as it takes to hold both noses in frame */
      window.__camFn=cam=>{const i=window.__trFrame||0,tc=window.__tc;const vn=[e.pos.x+f[0]*2.4,e.pos.z+f[1]*2.4];
        const sx=tc?(tc.x!=null?tc.x:tc.pos&&tc.pos.x):null,sz=tc?(tc.z!=null?tc.z:tc.pos&&tc.pos.z):null;
        const sn=sx!=null?[sx-f[0]*2.4,sz-f[1]*2.4]:[vn[0]+f[0]*4,vn[1]+f[1]*4];const gap=Math.max(2.5,Math.hypot(sn[0]-vn[0],sn[1]-vn[1]));
        const mid=[(vn[0]+sn[0])/2,(vn[1]+sn[1])/2],off=Math.max(3.4,gap*.62+1.6);
        const pos=[mid[0]+rt[0]*off,.9,mid[1]+rt[1]*off],look=[mid[0],.95,mid[1]];
        if(!sm){sm=pos.slice();sl=look.slice()}else for(let k=0;k<3;k++){sm[k]+=(pos[k]-sm[k])*.08;sl[k]+=(look[k]-sl[k])*.08}
        const sh=R.shake(i,.008);cam.position.set(sm[0]+sh[0],sm[1]+sh[1],sm[2]+sh[2]);cam.up.set(0,1,0);cam.lookAt(sl[0],sl[1],sl[2]);if(cam.fov!==50){cam.fov=50;cam.updateProjectionMatrix()}R.sunPlace([mid[0],0,mid[1]])}})},
  frame:i=>{const H=window.__ht,T=window.__T,L=H.ow.trafficLog();while(window.__tl<L.length){const ev=L[window.__tl++];T.ev(ev.ev||ev.e||JSON.stringify(ev))}}};
