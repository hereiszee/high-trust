/* Breakdown + tow screenshots on a fresh page (node dev/car-damage/shots.js): docs/screenshots/car-damage/breakdown-hazards.jpg, tow-at-dads-auto.jpg */
const open=require('../drive-any/harness.js'),path=require('path');const DIR=path.join(__dirname,'..','..','docs','screenshots','car-damage');
(async()=>{const o=await open();const p=o.page;const shot=async n=>{await p.evaluate(()=>__ht.draw());await p.screenshot({path:path.join(DIR,n+'.jpg'),type:'jpeg',quality:82})};
/* a borrowed sedan rolled out onto the open road, crashed to nothing: coasting stop, hazards, steam, "Broken down" */
const r=await p.evaluate(()=>{const h=__ht;const e=h.vehicles.find(v=>v.owner==='neighbour'&&v.type==='sedan');window.__e=e;h.P.pos.set(e.pos.x,0,e.pos.z);h.enterVehicle(e);
  for(let i=0;i<7;i++)h.crash(e,17,{angle:(i%3-1)*.6});h.carDamage(e,1e3,'test');for(let i=0;i<120;i++)h.step(1);
  h.P.yaw=e.yaw+2.35;h.P.pitch=-.32;h.step(20);h.P.yaw=e.yaw+2.35;h.P.pitch=-.32;e.obj.userData._s.t=.1;e.obj.userData.setHazard(true);return{band:h.carBand(e),spd:e.spd}});
await p.waitForTimeout(400);await shot('breakdown-hazards');
/* the van broken down, towed with no cash: on Sal's tab, at Dad's Auto at 60% */
const t=await p.evaluate(()=>{const h=__ht,V=h.VAN;h.exitVehicle();h.P.pos.set(V.pos.x,0,V.pos.z);h.enterVehicle(V);for(let i=0;i<5;i++)h.crash(V,16,{angle:(i%3-1)*.5});h.carDamage(V,1e3,'t');h.step(3);h.exitVehicle();
  h.save.cash=0;const r=h.towCar(V);const s=h.hubx.shops.find(x=>x.kind==='auto');h.P.yaw=V.yaw+2.5;h.P.pitch=-.28;h.step(4);h.P.yaw=V.yaw+2.5;h.P.pitch=-.28;return{r,hp:h.carHp(V)}});
await p.waitForTimeout(2000);await shot('tow-at-dads-auto');console.log(JSON.stringify({r,t}),o.errs);await o.close()})();
