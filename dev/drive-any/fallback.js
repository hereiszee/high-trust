const open=require('./harness.js');(async()=>{const o=await open({block:['js/vehicles.js']});const p=o.page;
const r=await p.evaluate(()=>{const h=__ht;const list=h.vehicles.map(v=>v.type+':'+v.owner);h.P.pos.set(h.VAN.pos.x,0,h.VAN.pos.z+1.5);h.step(2);h.draw();const pr=document.querySelector('.ht-pr').textContent;
  h.use=true;h.step(1);const on=h.VAN.on;h.keys.w=true;h.step(40);h.keys.w=false;h.keys[' ']=true;h.step(40);h.keys[' ']=false;const spd=h.VAN.spd,x=h.VAN.pos.x;h.use=true;h.step(1);
  return{hasVehiclesModule:!!(window.HT&&HT.Vehicles),list,prompt:pr,entered:on,moved:+(x-39).toFixed(1),exited:!h.VAN.on}});
console.log(JSON.stringify(r));console.log('errors',o.errs);await o.close()})();
