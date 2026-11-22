/* Fort Sensible's tank ploughs east down the apron through the cone slalom and the hay bales and rolls over a neighbour's parked car (the car-damage API flattens it; js/tank.js S.flat), the way
   dev/base-check.js tests it. Chase camera, HUD on. Boarded with a real E; driven with W. Nobody is in or near the car. */
module.exports={frames:135,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.tank.x+2.6,0,d.tank.z);H.step(4)});
    await p.keyboard.press('e');
    const r=await p.evaluate(()=>{const H=window.__ht,P=H.P;for(let i=0;i<20;i++)H.step(1);const e=H.CV,x=206,z=213,yaw=-Math.PI/2;/* west end of the cone and hay-bale slalom (dev/base-check.js drives 214,213 -> 245,213), nose east */
      e.pos.set(x,0,z);e.yaw=yaw;e.spd=0;if(e.car)Object.assign(e.car,{x,z,yaw,spd:0,steer:0,vdx:-Math.sin(yaw),vdz:-Math.cos(yaw)});P.yaw=yaw;P.pitch=-.18;H.step(30);
      const cars=H.L.cars.filter(q=>q!==e&&q!==H.VAN&&q.owner==='neighbour');const v=cars[0];if(!v)return{err:'no car'};const fx=-Math.sin(yaw),fz=-Math.cos(yaw);
      v.pos.set(e.pos.x+fx*20,0,e.pos.z+fz*20);v.yaw=yaw+Math.PI/2;window.HT.Jobs.api.syncCar(v);H.step(10);return{car:v.name,hp:window.HT.Jobs.api.carHp(v),tank:[e.pos.x,e.pos.z]}});
    console.log('  ',JSON.stringify(r))},
  frame:i=>{const H=window.__ht;H.keys.w=i>=4;H.P.yaw=-Math.PI/2;if(HT.Tank.state().flat>=1&&!window.__fl){window.__fl=1;window.__T.ev('flat')}}};
