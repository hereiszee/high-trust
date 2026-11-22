/* Hitch Happens extraction sweep (geometry, no input): for every lot car, in the order the pen empties (front row, second row, third),
   hook it up where a player would (truck nose north, in line), then drive the rig out with the real HT.CarAI.drive + HT.Tow.step along each
   natural exit: straight up River Rd, and right into Dock St toward the eastern routes. At every frame the truck's and the towed car's
   collision probes are tested against every static collider (other lot cars included). Pass = zero overlaps on every path.
   node dev/tow-fix/sweep.js */
const {startTow}=require('./lib.js');
(async()=>{const {b,p,ev,r,errs}=await startTow();console.log('start',JSON.stringify(r));
  const res=await ev(()=>{const H=window.__ht,a=H.jobs.api,M=H.M,Tw=window.HT.Tow,CA=window.HT.CarAI,L=H.L;const wrap=x=>{while(x>Math.PI)x-=2*Math.PI;while(x<-Math.PI)x+=2*Math.PI;return x};
    const dist=(px,pz,c)=>{if(c.ob){const q=c.ob,dx=px-q.x,dz=pz-q.z,u=dx*q.fx+dz*q.fz,v=-dx*q.fz+dz*q.fx,qu=u-Math.max(-q.hl,Math.min(q.hl,u)),qv=v-Math.max(-q.hw,Math.min(q.hw,v));return Math.hypot(qu,qv)}
      return Math.hypot(px-Math.max(c.x0,Math.min(c.x1,px)),pz-Math.max(c.z0,Math.min(c.z1,pz)))};
    const kind=c=>{const e=M.cars.find(x=>x.col===c);if(e)return'car:'+e.o.id;if(c===M.deskCol)return'desk';return c.k||'pen'};
    const hits=(x,z,yaw,len,r,skip)=>{const out=[],f=[-Math.sin(yaw),-Math.cos(yaw)];for(const s of[1,0,-1]){const px=x+f[0]*len/3*s,pz=z+f[1]*len/3*s;
      for(const c of L.colliders){if(c.x0<-1e3||c===skip)continue;if(c.x1<px-r||c.x0>px+r||c.z1<pz-r||c.z0>pz+r)continue;if(dist(px,pz,c)<r-.01)out.push(kind(c)+'@'+((c.x0+c.x1)/2).toFixed(1)+','+((c.z0+c.z1)/2).toFixed(1))}}return out};
    const van=H.CV,Sv=a.carSize(van),st=van.car.stats;
    const order=[['kim',[]],['hollis',[]],['rosa',['kim','hollis']],['benny',['kim','hollis']],['earl',['kim','hollis','rosa','benny']]];
    const SL={},home={};M.cars.forEach(e=>{SL[e.o.id]={x:e.pos.x,z:e.pos.z,yaw:e.yaw};home[e.o.id]={x:-4000-e.i*20,z:-4000}});
    const out=[];
    for(const [id,gone] of order)for(const exit of['north','east']){
      M.cars.forEach(e=>{const s=gone.includes(e.o.id)?home[e.o.id]:SL[e.o.id];e.pos.set(s.x,0,s.z);e.yaw=0;a.syncCar(e)});
      const t=M.cars.find(e=>e.o.id===id),St=a.carSize(t),fb=t.pos.z-St.l/2;/* front bumper */
      const c=CA.make('minivan',{x:t.pos.x,z:fb-Tw.T.gap-Tw.T.hitchBack-Sv.l/2,yaw:0,stats:Object.assign({},st)});c.towMul=Tw.towMul();
      const tw=()=>({x:c.x,z:c.z,yaw:c.yaw,spd:c.spd,len:Sv.l}),body={x:t.pos.x,z:t.pos.z,yaw:0,len:St.l,wid:St.w},k=Tw.make(tw(),body,{instant:true});
      /* the towed car's own collider is off while hooked (js/tow.js): skip it */
      const W=exit==='north'?[{x:t.pos.x,z:124},{x:t.pos.x<314.5?313.5:316.5,z:110},{x:t.pos.x<314.5?313.5:316.5,z:96}]:[{x:t.pos.x,z:130.6},{x:322,z:128.5},{x:332,z:128.5},{x:346,z:128.5}];
      let wi=0,bad=[],maxRel=0,frames=0;
      for(let i=0;i<30*40&&wi<W.length;i++){const w=W[wi];if(Math.hypot(w.x-c.x,w.z-c.z)<2.5){wi++;continue}
        const dy=wrap(Math.atan2(-(w.x-c.x),-(w.z-c.z))-c.yaw);CA.drive(c,{thr:c.spd<4?1:0,st:Math.max(-1,Math.min(1,dy*2.2))},1/30,null);Tw.step(k,tw(),1/30);frames++;
        maxRel=Math.max(maxRel,Math.abs(k.rel||wrap(c.yaw-k.psi)));
        const h1=hits(c.x,c.z,c.yaw,st.len,st.wid/2+.05,null),h2=hits(body.x,body.z,body.yaw,St.l,Math.max(.5,St.w/2-Tw.T.bodyIn),t.col);
        for(const x of h1)bad.push('truck '+x+' at '+c.x.toFixed(1)+','+c.z.toFixed(1));for(const x of h2)bad.push('towed '+x+' at '+body.x.toFixed(1)+','+body.z.toFixed(1))}
      out.push({car:id,exit,reached:wi>=W.length,secs:+(frames/30).toFixed(1),maxHitchDeg:Math.round(maxRel*57.3),overlaps:[...new Set(bad.map(s=>s.replace(/ at .*/,'')))],first:bad[0]||null})}
    /* put the lot back */M.cars.forEach(e=>{const s=SL[e.o.id];e.pos.set(s.x,0,s.z);e.yaw=0;a.syncCar(e)});return out});
  let fail=0;for(const x of res){const ok=x.reached&&!x.overlaps.length;if(!ok)fail++;console.log((ok?'ok   ':'FAIL ')+JSON.stringify(x))}
  const bad=errs.filter(e=>!/favicon/.test(e));if(bad.length){fail++;console.log('ERRORS '+bad.join('|'))}
  console.log(fail?fail+' FAILED':'all clear');await b.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
