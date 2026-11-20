const open=require('../drive-any/harness.js');(async()=>{const o=await open();const p=o.page;
const r=await p.evaluate(()=>{const h=__ht,out={};const e=h.vehicles.find(v=>v.owner==='neighbour'&&v.type==='sedan')||h.vehicles.find(v=>v.owner==='neighbour');
  h.P.pos.set(e.pos.x,0,e.pos.z);h.enterVehicle(e);out.name=e.name+' '+e.type;out.max=h.carHpMax(e);const seq=[];
  for(let i=0;i<14;i++){h.crash(e,17);h.step(15);seq.push([+h.carHp(e).toFixed(1),h.carBand(e),h.ui?0:0,document.querySelector('.ht-drv .vh b').textContent,document.querySelector('.ht-drv .vw').textContent,e.stats.maxSpeed.toFixed(1)])}
  out.seq=seq;return out});
console.log(JSON.stringify(r));console.log(o.errs);await o.close()})();
