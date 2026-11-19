const open=require('./harness.js');const OUT=require('path').join(__dirname,'..','..','docs/screenshots/drive-any/');const only=process.argv[2]||'';
(async()=>{const o=await open();const p=o.page;const ev=(f,a)=>p.evaluate(f,a);
await ev(()=>{__ht.prog.done=[true,true,true,false];__ht.enterHub();const h=__ht;window.T={h,car:(t,own)=>h.vehicles.find(v=>v.type===t&&(own?v.owner==='player':v.owner!=='player')),clear(){for(const k in h.keys)h.keys[k]=false},
  get(e){h.P.pos.set(e.pos.x,0,e.pos.z);return h.enterVehicle(e)},home(e){if(h.CV)h.exitVehicle();e.pos.set(e.home.x,0,e.home.z);e.yaw=e.home.yaw;h.enterVehicle(e);h.exitVehicle()},
  place(e,x,z,yaw){e.pos.set(x,0,z);e.yaw=yaw;if(e.car){e.car.x=x;e.car.z=z;e.car.yaw=yaw;e.car.spd=0;const f=[-Math.sin(yaw),-Math.cos(yaw)];e.car.vdx=f[0];e.car.vdz=f[1]}h.P.yaw=yaw;h.P.pitch=-.2}}});
const shot=async n=>{await ev(()=>{__ht.draw()});await p.waitForTimeout(250);await ev(()=>{__ht.draw()});await p.screenshot({path:OUT+n+'.jpg',quality:82});console.log('shot',n)};
const want=n=>!only||only.split(',').includes(n);
if(want('prompt-sedan')){await ev(()=>{const h=T.h,e=T.car('sedan');const r={x:Math.cos(e.yaw),z:-Math.sin(e.yaw)},S=e.obj.userData.size;h.P.pos.set(e.pos.x-r.x*(S.w/2+1),0,e.pos.z-r.z*(S.w/2+1));
  h.P.yaw=e.yaw+Math.PI/2+.5;h.P.pitch=-.18;h.step(6)});await shot('prompt-sedan')}
for(const t of['minivan','hatch','sedan','suv','pickup','workvan']){if(!want('chase-'+t))continue;
  await ev(t=>{const h=T.h,e=T.car(t,t==='minivan');T.clear();T.get(e);T.place(e,5,43.4,-Math.PI/2);h.keys.w=true;h.step(t==='workvan'?75:55);h.keys.w=false;h.keys.d=true;h.step(4);h.keys.d=false;h.step(3)},t);
  await shot('chase-'+t);await ev(t=>{T.clear();T.home(T.car(t,t==='minivan'))},t)}
if(want('hood-sedan')){await ev(()=>{const h=T.h,e=T.car('sedan');T.get(e);T.place(e,5,43.4,-Math.PI/2);h.P.fp=true;h.keys.w=true;h.step(40);T.clear();h.step(2)});await shot('hood-sedan');
  await ev(()=>{const h=T.h;h.keys.c=true;h.step(2)});await shot('lookback-hood-sedan');await ev(()=>{const h=T.h;T.clear();h.P.fp=false;h.keys.c=true;h.step(3)});await shot('lookback-chase-sedan');
  await ev(()=>{T.clear();T.home(T.car('sedan'))})}
if(want('handbrake-smoke')){await ev(()=>{const h=T.h,e=T.car('hatch');T.get(e);T.place(e,5,43.4,-Math.PI/2);h.keys.w=true;h.keys.shift=true;h.step(48);T.clear();h.keys[' ']=true;h.keys.a=true;h.keys.w=true;h.step(16);
  h.P.yaw=e.yaw+2.3;h.P.pitch=-.25;h.step(1)});await shot('handbrake-smoke');await ev(()=>{T.clear();T.home(T.car('hatch'))})}
if(want('dented-sedan')){const info=await ev(()=>{const h=T.h,e=T.car('sedan');T.get(e);const L=h.L;
  const hs=L.houses.filter(q=>q.z1<41&&q.z1>30&&q.x0>14&&q.x1<100).sort((a,b)=>a.x0-b.x0);const log=[];
  const ram=(x,z,yaw,n)=>{T.place(e,x,z,yaw);e.bump=0;h.keys.w=true;h.keys.shift=true;let mx=0;for(let i=0;i<n;i++){h.step(1);mx=Math.max(mx,e.spd)}T.clear();h.keys[' ']=true;h.step(25);T.clear();log.push([+mx.toFixed(1),+e.dmg.toFixed(2)])};
  for(const q of hs.slice(0,3)){const cx=(q.x0+q.x1)/2;ram(cx+(log.length-1)*.8,q.z1+13,(log.length-1)*.35,45)}
  T.place(e,30,43.4,-Math.PI/2+.25);h.step(1);h.exitVehicle();
  const f={x:-Math.sin(e.yaw),z:-Math.cos(e.yaw)},r={x:Math.cos(e.yaw),z:-Math.sin(e.yaw)};h.P.pos.set(e.pos.x+f.x*4.4-r.x*1.4,0,e.pos.z+f.z*4.4-r.z*1.4);
  for(const a of h.allies){a.pos.set(e.pos.x-f.x*5+r.x*3,0,e.pos.z-f.z*5+r.z*3)}
  h.P.yaw=Math.atan2(-(e.pos.x-h.P.pos.x),-(e.pos.z-h.P.pos.z))-.5;h.P.pitch=-.3;h.step(2);return{log,dmg:e.dmg,houses:hs.length}});
  console.log('dent',JSON.stringify(info));await shot('dented-sedan')}
if(want('returned-toast')){await ev(()=>{const h=T.h,e=T.car('sedan'),v=T.car('minivan',true);if(h.CV)h.exitVehicle();e.dmg=0;h.BORROW.dinged.clear();h.BORROW.thanked.clear();h.BORROW.car=null;
  const t=T.car('suv');T.get(t);T.place(t,5,43.4,-Math.PI/2);for(let k=0;k<3;k++){h.keys.w=true;h.step(50);T.clear();h.keys[' ']=true;h.step(30);T.clear();h.keys.s=true;h.step(70);T.clear();h.keys[' ']=true;h.step(20);T.clear()}window.__odo=t.odo;const back=t.home;T.place(t,back.x,back.z,back.yaw);h.step(2);h.exitVehicle();
  h.P.pos.set(v.pos.x,0,v.pos.z);h.enterVehicle(v);h.P.yaw=v.yaw+.5;h.step(6);window.__tr=h.prog.trust});console.log('odo',await ev(()=>window.__odo),'trust',await ev(()=>window.__tr));await p.waitForTimeout(900);await p.screenshot({path:OUT+'returned-toast.jpg',quality:82})}
if(want('pickup-bed')){await ev(()=>{const h=T.h,e=T.car('pickup');T.get(e);T.place(e,5,43.4,-Math.PI/2);h.keys.w=true;h.step(30);T.clear();h.keys.s=true;h.step(12);T.clear();h.step(10);h.P.yaw=e.yaw+2.4;h.P.pitch=-.38;h.step(1)});await shot('pickup-bed-crew');await ev(()=>{T.clear();T.home(T.car('pickup'))})}
console.log('errors',o.errs);await o.close()})();
