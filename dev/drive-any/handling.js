const open=require('./harness.js');(async()=>{const o=await open();const p=o.page;
const r=await p.evaluate(()=>{const h=__ht,K=h.keys,out={};const types=['minivan','hatch','sedan','suv','pickup','workvan'];
 const clear=()=>{for(const k in K)K[k]=false};
 for(const t of types){const e=h.vehicles.find(v=>v.type===t&&(t!=='minivan'||v.owner==='player'));if(!e){out[t]='missing';continue}
   clear();h.P.pos.set(e.pos.x,0,e.pos.z);const ok=h.enterVehicle(e);const saved=h.L.colliders.splice(0);const sv={x:e.pos.x,z:e.pos.z,yaw:e.yaw};
   e.pos.set(60,0,40);e.car.spd=0;
   K.w=true;let tTop=null,max=0;const S=e.stats;for(let i=0;i<360;i++){h.step(1);max=Math.max(max,e.spd);if(tTop==null&&e.spd>=S.maxSpeed*.97)tTop=(i+1)/30}
   // turning circle at 8 m/s steady: hold W+A, cap speed by toggling
   K.w=false;for(let i=0;i<300&&e.spd>8;i++)h.step(1);K.a=true;let y0=null,n=0,sp=0;
   for(let i=0;i<240;i++){K.w=e.spd<8;h.step(1);if(i===120)y0=e.yaw;if(i>=120){sp+=Math.abs(e.spd);n++}}
   const w=Math.abs(e.yaw-y0)/(n/30),R=(sp/n)/w;
   // boost top speed
   clear();K.w=true;K.shift=true;let bmax=0;for(let i=0;i<300;i++){h.step(1);bmax=Math.max(bmax,e.spd)}
   // braking 60->0 style: from current speed to stop
   clear();const v0=e.spd;let d=0,bt=0;K.s=true;for(let i=0;i<300&&e.spd>.3;i++){h.step(1);d+=Math.abs(e.spd)/30;bt++}clear();for(let i=0;i<30;i++)h.step(1);
   h.L.colliders.push(...saved);e.pos.set(sv.x,0,sv.z);e.yaw=sv.yaw;e.car.spd=0;
   h.exitVehicle();
   out[t]={entered:ok,top:+max.toFixed(2),boostTop:+bmax.toFixed(2),zeroToTop:tTop,turnDiameter_at8:+(2*R).toFixed(1),brake_from:+v0.toFixed(1),brakeDist:+d.toFixed(1),lod:e.obj.userData.lod}}
 return out});
console.log(JSON.stringify(r,null,1));console.log(o.errs);await o.close()})();
