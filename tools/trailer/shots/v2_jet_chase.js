/* v2 CHASE PLANE: DAD-1 over Maple Heights at golden hour, banked into a slow left turn (A held: the game's own roll and bank-to-turn),
   seen from a chase position off its wing that rolls with it, the town wheeling underneath. HUD: none. */
module.exports={frames:110,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});
    await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(4));
    const r=await p.evaluate(async()=>{const H=window.__ht,F=HT.Jet.F,h=H.L.start;
      F.air=true;F.gear=0;F.gearK=0;F.spd=70;F.thr=.65;F.pos.set(h.x+120,95,h.z+40);F.q.setFromEuler(new THREE.Euler(0,Math.PI*.95,0,'YZX'));
      for(let i=0;i<30;i++){H.step(1);H.ow.update(H.camera,1/30);F.pos.y=95;await new Promise(r=>setTimeout(r,60))}
      return{F:[F.pos.x,F.pos.y,F.pos.z]}});console.log('  ',JSON.stringify(r));
    await p.evaluate(()=>{const H=window.__ht,R=window.__R,F=HT.Jet.F;R.golden({el:10,az:250,exp:1.05,far:600});R.cine(true);R.jetClean();
      const fw=new THREE.Vector3(),up=new THREE.Vector3(),rt=new THREE.Vector3();let sm=null,su=null;
      window.__camFn=cam=>{const i=window.__trFrame||0;fw.set(1,0,0).applyQuaternion(F.q);up.set(0,1,0).applyQuaternion(F.q);rt.set(0,0,1).applyQuaternion(F.q);
        /* off the inside (left) wing, a touch behind and above, closing in slowly */const k=Math.min(1,i/110);const back=15-k*3,side=-(7.5-k*1.5),hi=2.2;
        const pos=[F.pos.x-fw.x*back+rt.x*side+up.x*hi,F.pos.y-fw.y*back+rt.y*side+up.y*hi,F.pos.z-fw.z*back+rt.z*side+up.z*hi];
        if(!sm){sm=pos.slice();su=[up.x,up.y,up.z]}else for(let q=0;q<3;q++){sm[q]+=(pos[q]-sm[q])*.5;su[q]+=([up.x,up.y,up.z][q]-su[q])*.15}
        cam.position.set(sm[0],sm[1],sm[2]);cam.up.set(su[0],su[1],su[2]);cam.lookAt(F.pos.x+fw.x*3,F.pos.y+fw.y*3,F.pos.z+fw.z*3);
        if(cam.fov!==40){cam.fov=40;cam.updateProjectionMatrix()}R.sunPlace([F.pos.x,0,F.pos.z])}})},
  frame:i=>{const H=window.__ht,F=HT.Jet.F;H.keys.a=i<55;H.keys.d=false;F.thr=.7;if(F.pos.y<80)F.pos.y+=(95-F.pos.y)*.05;if(H.P.hp<100)H.P.hp=100}};
