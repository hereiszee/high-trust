/* tight car colliders: walk at every registered car from both sides and both ends (closest approach), and at a car left parked at 30 degrees */
const open=require('./harness.js');(async()=>{const o=await open();const p=o.page;
const r=await p.evaluate(()=>{const h=__ht,out=[];const walk=(e,dirx,dirz,start)=>{h.P.pos.set(e.pos.x+dirx*start,0,e.pos.z+dirz*start);h.P.yaw=Math.atan2(dirx,dirz);for(const k in h.keys)h.keys[k]=false;h.keys.w=true;h.step(50);h.keys.w=false;
    return Math.abs((h.P.pos.x-e.pos.x)*dirx+(h.P.pos.z-e.pos.z)*dirz)};
  for(const e of h.vehicles){const S=e.obj.userData.size,f={x:-Math.sin(e.yaw),z:-Math.cos(e.yaw)},rt={x:Math.cos(e.yaw),z:-Math.sin(e.yaw)};
    const side=Math.min(walk(e,rt.x,rt.z,S.w/2+2.5),walk(e,-rt.x,-rt.z,S.w/2+2.5)),nose=Math.min(walk(e,f.x,f.z,S.l/2+2.5),walk(e,-f.x,-f.z,S.l/2+2.5));out.push({type:e.type,owner:e.owner,halfW:+(S.w/2).toFixed(2),sideStop:+side.toFixed(2),sideGap:+(side-S.w/2-.35).toFixed(2),halfL:+(S.l/2).toFixed(2),noseGap:+(nose-S.l/2-.35).toFixed(2)})}
  /* leave a sedan at an angle and walk at its corner diagonal */
  const e=h.vehicles.find(v=>v.type==='sedan');h.P.pos.set(e.pos.x,0,e.pos.z);h.enterVehicle(e);e.yaw+=Math.PI/6;h.step(1);h.exitVehicle();
  const S=e.obj.userData.size,rt={x:Math.cos(e.yaw),z:-Math.sin(e.yaw)};const ang=walk(e,rt.x,rt.z,S.w/2+2.5);
  const aabbHalf=(e.col.x1-e.col.x0)/2;return{cars:out,angled:{sideGap:+(ang-S.w/2-.35).toFixed(2),aabbHalfX:+aabbHalf.toFixed(2),obb:!!e.col.ob}}});
const bad=r.cars.filter(c=>c.sideGap>.12||c.noseGap>.12||c.sideGap<-.05);console.log(JSON.stringify(r.cars.slice(0,4)),'... total',r.cars.length,'outside 0..0.12 m:',bad.length,JSON.stringify(bad));console.log('angled',JSON.stringify(r.angled));console.log('errors',o.errs);await o.close()})();
