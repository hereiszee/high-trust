/* v2 CROSSING GUARD (js/jobs/crossing.js) at dusk on 2nd St, Riverside: the job's own scripted player walks the eleven kids home; at the
   2nd St crossing the dad holds the STOP sign up in the road and waves the line across. Two cars come up 2nd St and stop for the sign
   (the job's own rule: cars stop within 25 m of the raised sign). Camera at a kid's eye height (0.9 m), at the back of the line,
   looking past the kids to the dad and the stopped cars. No guns exist in this job. HUD: none. */
module.exports={frames:176,from:66,warm:4,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T;const j=H.jobs.registry.get('crossing');j.test.give(H.jobs.api);H.prog.done[H.jobs.index('dee')]=true;T.flags();
      await T.cast(['dee','son','daughter','nb_kid','nb_gran','nb_pops','nb_office','nb_sweater','nb_teen','nb_kenji','nb_marcus','nb_mei','nb_lucia','thug_cap','thug_hoodie','thug_track','thug_f_hood','thug_beanie','thug_red','thug_jacket']);
      H.jobs.start('crossing');H.step(22);T.flags();
      return T.play('crossing',M=>{const C=M.cg,B=C&&C.bot;return B&&B.i===17},20000)});console.log('  ',JSON.stringify(r));
    const r2=await s.p.evaluate(()=>{const H=window.__ht,O=H.ow,G=O.roads(),P=H.P;
      /* the 2nd St edge under the dad, and a car coming each way along it */
      let best=null;for(const[i,n]of G.nodes.entries())for(const e of n.e){const m=G.nodes[e.to],dx=m.x-n.x,dz=m.z-n.z,l=Math.hypot(dx,dz);if(l<10)continue;
        const t=Math.max(0,Math.min(1,((P.pos.x-n.x)*dx+(P.pos.z-n.z)*dz)/(l*l))),d=Math.hypot(n.x+dx*t-P.pos.x,n.z+dz*t-P.pos.z);if(!best||d<best.d)best={a:i,b:e.to,l,t,d}}
      window.__road=best;const cars=[];
      if(best){cars.push(O.trafficAdd({a:best.a,b:best.b,at:Math.max(2,best.t*best.l-24),spd:8,max:8,type:'sedan',color:'#3e5f8a'}));
        cars.push(O.trafficAdd({a:best.b,b:best.a,at:Math.max(2,(1-best.t)*best.l-26),spd:8,max:8,type:'suv',color:'#8a3e3e'}))}
      return{best,cars:cars.map(c=>!!c),P:[P.pos.x,P.pos.z],kids:H.M.cg.kids.filter(k=>k.d).map(k=>[+k.d.root.position.x.toFixed(1),+k.d.root.position.z.toFixed(1),k.state])}});
    console.log('  ',JSON.stringify(r2));
    await s.p.evaluate(()=>{const H=window.__ht,R=window.__R,P=H.P;R.cine(true);R.golden({el:18,az:225,exp:1.05,hemi:.65});T=window.__T;T.hide('.ht-wp,.ht-wi,.ht-wg');
      let sm=null,sl=null;
      window.__camFn=cam=>{const i=window.__trFrame||0;const ks=H.M.cg.kids.filter(k=>k.d&&k.d.root.visible&&k.state!=='stray'&&k.state!=='home');if(!ks.length)return;
        /* the middle of the line, and its direction toward the dad: the lens sits just behind the middle kids at their eye height, long-ish
           lens on the dad with the sign up and the stopped cars behind him */
        const ds=ks.map(k=>[k,Math.hypot(k.d.root.position.x-P.pos.x,k.d.root.position.z-P.pos.z)]).sort((a,b)=>a[1]-b[1]);const mid=ds[Math.floor(ds.length*.6)],t=mid[0].d.root.position,fd=mid[1];
        const ux=(P.pos.x-t.x)/(fd||1),uz=(P.pos.z-t.z)/(fd||1),rx=-uz,rz=ux;
        const pos=[t.x-ux*1.5+rx*1.0,.92,t.z-uz*1.5+rz*1.0],look=[P.pos.x,1.55,P.pos.z];
        if(!sm){sm=pos.slice();sl=look.slice()}else for(let k=0;k<3;k++){sm[k]+=(pos[k]-sm[k])*.06;sl[k]+=(look[k]-sl[k])*.1}
        const sh=R.shake(i,.01);cam.position.set(sm[0]+sh[0],sm[1]+sh[1],sm[2]+sh[2]);cam.up.set(0,1,0);cam.lookAt(sl[0],sl[1],sl[2]);if(cam.fov!==34){cam.fov=34;cam.updateProjectionMatrix()}R.clearLens(cam,[[P.pos.x,1.5,P.pos.z],[P.pos.x,2.4,P.pos.z]]);R.sunPlace([P.pos.x,0,P.pos.z])}})},
  frame:i=>{window.__T.bot('crossing')}};
