/* Car damage → handling, per health band, in the real game (node dev/car-damage/handling.js).
   Borrows a sedan, sets its health to the middle of each band, and measures top speed, time to 95% of it, braking distance from 20 m/s,
   and the pull (heading drift over 4 s with the wheel centred at ~15 m/s). Then checks the breakdown and a gentle bump. */
const open=require('../drive-any/harness.js');(async()=>{const o=await open();const p=o.page;
const r=await p.evaluate(()=>{const h=__ht,K=h.keys,out={bands:[]};const clear=()=>{for(const k in K)K[k]=false};
  const e=h.vehicles.find(v=>v.owner==='neighbour'&&v.type==='sedan');h.P.pos.set(e.pos.x,0,e.pos.z);h.enterVehicle(e);
  const saved=h.L.colliders.splice(0),cg=h.L.cgrid,M=h.carHpMax(e);h.L.cgrid=null;/* open road: no colliders while measuring */
  out.bandsAtStart=[];for(const f of[1,.6,.4,.2,.06]){clear();h.carRepair(e,'full');h.carDamage(e,M*(1-f),'test');e.wear.tyre=0;e.pullDir=1;out.bandsAtStart.push(h.carBand(e));e.pos.set(60,0,40);e.yaw=0;e.car.spd=0;e.car.vdx=0;e.car.vdz=-1;h.step(2);
    K.w=true;let top=0,t95=null;const ts=[];for(let i=0;i<450;i++){h.step(1);top=Math.max(top,e.spd);ts.push(e.spd)}
    const ref=Math.max(...ts);t95=(ts.findIndex(v=>v>=ref*.95)+1)/30;const t30=(ts.findIndex(v=>v>=13.4)+1)/30;
    clear();for(let i=0;i<400&&e.spd>20.5;i++){K.s=true;h.step(1)}clear();K.w=true;for(let i=0;i<200&&e.spd<20;i++)h.step(1);K.w=false;
    let d=0;const v0=e.spd;K.s=true;for(let i=0;i<300&&e.spd>.3;i++){h.step(1);d+=Math.abs(e.spd)/30}clear();
    K.w=true;for(let i=0;i<200&&e.spd<15;i++)h.step(1);K.w=false;const y0=e.yaw;for(let i=0;i<120;i++){K.w=e.spd<15;h.step(1)}const drift=(e.yaw-y0)*180/Math.PI;clear();
    out.bands.push({hpFrac:f,band:h.carBand(e),top_mph:+(top*2.237).toFixed(1),t95:+t95.toFixed(2),zeroTo30mph_s:+t30.toFixed(2),brakeFrom:+v0.toFixed(1),brakeDist_m:+d.toFixed(1),pull_deg_per_4s:+drift.toFixed(1)})}
  /* breakdown while moving: coasts to a stop, throttle does nothing, hazards on */
  clear();h.carRepair(e,'full');e.car.spd=0;K.w=true;for(let i=0;i<150;i++)h.step(1);const v1=e.spd;let broke=0;const off=h.onBreakdown(c=>{if(c===e)broke++});h.carDamage(e,1e3,'test');
  for(let i=0;i<300;i++)h.step(1);out.breakdown={speedBefore:+v1.toFixed(1),speedAfter10s:+e.spd.toFixed(2),hooks:broke,hazard:!!e.obj.userData._s.haz,band:h.carBand(e),hp:h.carHp(e)};off();clear();
  /* gentle bump */
  h.carRepair(e,'full');const b0=h.carHp(e);h.crash(e,5.5);h.crash(e,6.4);out.gentle={before:b0,after:h.carHp(e)};
  out.impact={at10:(h.carRepair(e,'full'),h.crash(e,10)),at15:(h.carRepair(e,'full'),h.crash(e,15)),at20:(h.carRepair(e,'full'),h.crash(e,20)),at25:(h.carRepair(e,'full'),h.crash(e,25)),at30:(h.carRepair(e,'full'),h.crash(e,30)),
    at20side:(h.carRepair(e,'full'),h.crash(e,20,{angle:Math.PI/2}))};
  h.L.colliders.push(...saved);h.L.cgrid=cg;return out});
console.log(JSON.stringify(r,null,1));console.log('errors',o.errs);await o.close()})();
