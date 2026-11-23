/* v2 JET TAKE-OFF: DAD-1 (js/jet.js), boarded with a real E on the apron, on its take-off roll down runway 27 (west), full throttle
   (W held): the nose comes up on the game's own rotate assist, it leaves the ground beside a lens on the runway edge 0.35 m off the
   concrete, and the gear comes up (a real G press). The camera follows it away as it climbs. Golden hour. HUD: subtitles only. */
const CX=176,CZ=245.2;
module.exports={frames:130,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});
    await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(4));
    const r=await p.evaluate(async()=>{const H=window.__ht,F=HT.Jet.F;
      F.air=false;F.gear=1;F.gearK=1;F.spd=34;F.thr=1;F.pos.set(232,0,237);F.q.setFromEuler(new THREE.Euler(0,Math.PI,0,'YZX'));H.P.yaw=Math.PI/2;
      for(let k=0;k<6;k++){H.step(2);F.pos.set(232,0,237);F.spd=34;await new Promise(r=>setTimeout(r,250))}
      return{st:HT.Jet.state()}});console.log('  ',JSON.stringify(r).slice(0,300));
    await p.evaluate(([CX,CZ])=>{const H=window.__ht,R=window.__R,F=HT.Jet.F;R.golden({el:12,az:268,exp:1.05,far:420});R.cine(true);R.jetClean();let sl=null;
      window.__camFn=cam=>{const i=window.__trFrame||0;const j=[F.pos.x,F.pos.y,F.pos.z];
        /* look at the jet (a little ahead of its nose as it passes), slight lag */const pass=j[0]<CX+20;const look=[j[0]-(pass?6:2),j[1]+1.6,j[2]];
        if(!sl)sl=look.slice();else for(let k=0;k<3;k++)sl[k]+=(look[k]-sl[k])*.5;
        const d=Math.hypot(j[0]-CX,j[2]-CZ),jo=Math.max(0,1-d/30)*.04,sh=R.shake(i,.012);
        cam.position.set(CX+sh[0]+Math.sin(i*5.7)*jo,.35+sh[1]+Math.sin(i*7.1)*jo,CZ+sh[2]);cam.up.set(0,1,0);cam.lookAt(sl[0],sl[1],sl[2]);
        const u=Math.max(0,Math.min(1,(CX+60-j[0])/50)),f=30+18*u*u*(3-2*u);if(cam.fov!==f){cam.fov=f;cam.updateProjectionMatrix()}R.sunPlace([j[0],0,j[2]])}},[CX,CZ])},
  frame:i=>{const H=window.__ht,F=HT.Jet.F;H.keys.w=true;F.thr=1;if(H.P.hp<100)H.P.hp=100;if(F.air&&!window.__air){window.__air=i;window.__T.ev('liftoff')}},
  frameNode:async(s,i)=>{const a=await s.p.evaluate(()=>window.__air);if(a!=null&&i===a+12){await s.p.keyboard.press('g');await s.p.evaluate(()=>window.__T.ev('gear'))}}};
