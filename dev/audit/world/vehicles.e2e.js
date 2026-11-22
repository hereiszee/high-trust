/* Every drivable type in free roam: enter from the left and the right side with a real E, get out with E, clear of everything.
   Then the minivan: limp mode (top speed), a breakdown, the tow prompt (E) to Dad's Auto, and the dents after a full repair.
   node dev/audit/world/vehicles.e2e.js */
const {open,log,ok,out}=require('./lib.js');
(async()=>{const W=await open();const {p,ev,step,key}=W;
  await ev(()=>{const H=window.__ht;for(const j of[0,1,2,3])H.prog.done[j]=true;try{const s=HT.Jobs.api.SV();s.jobs=s.jobs||{};s.jobs.mower={done:true}}catch(e){}H.enterHub();H.running=true;H.step(3)});await step(10);
  const types=await ev(()=>{const H=window.__ht;const seen={};for(const e of H.vehicles){if(!e.obj)continue;const k=e.type+(e===H.VAN?'(van)':'');if(!seen[k])seen[k]={i:H.vehicles.indexOf(e),x:+e.pos.x.toFixed(1),z:+e.pos.z.toFixed(1),owner:e.owner,name:e.name}}return seen});
  log('types in free roam',types);
  const res=[];
  for(const [k,v] of Object.entries(types))for(const side of[-1,1]){
    const r=await ev(([i,side])=>{const H=window.__ht;H.running=true;if(H.CV)H.exitVehicle();const e=H.vehicles[i];const S=e.obj.userData.size||{l:4.5,w:2};const rx=Math.cos(e.yaw),rz=-Math.sin(e.yaw);
      const d=S.w/2+1.0;H.P.pos.set(e.pos.x+rx*d*side,0,e.pos.z+rz*d*side);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(-(e.pos.x-H.P.pos.x),-(e.pos.z-H.P.pos.z));H.step(3);
      const pr=[...document.querySelectorAll('*')].filter(x=>x.children.length===0&&x.offsetParent&&/Climb|Borrow|Drive|Get in|Ride/i.test(x.textContent||'')).map(x=>x.textContent).slice(0,2);return{pr,at:[+H.P.pos.x.toFixed(1),+H.P.pos.z.toFixed(1)]}},[v.i,side]);
    await p.keyboard.press('e');await step(4);
    const inn=await ev(i=>{const H=window.__ht;return H.CV===H.vehicles[i]},v.i);
    let ex=null;if(inn){await step(10);await p.keyboard.press('e');await step(6);
      ex=await ev(i=>{const H=window.__ht,e=H.vehicles[i];const c=H.solidAt(H.P.pos.x,H.P.pos.z,.3,H.P.pos.y);return{out:!H.CV,dad:[+H.P.pos.x.toFixed(1),+H.P.pos.z.toFixed(1)],dist:+Math.hypot(H.P.pos.x-e.pos.x,H.P.pos.z-e.pos.z).toFixed(1),inSolid:!!c,walk:H.walkable(Math.floor(H.P.pos.x/2),Math.floor(H.P.pos.z/2))}},v.i)}
    const row={type:k,side:side<0?'left':'right',prompt:r.pr,entered:inn,exit:ex};res.push(row);log(JSON.stringify(row))}
  const bad=res.filter(r=>!r.entered||!r.exit||!r.exit.out||r.exit.inSolid||!r.exit.walk);
  ok(!bad.length,'every type: E from either side gets in, E gets out clear ('+res.length+' tries)',bad);
  /* limp mode: top speed of the van healthy vs at 10% */
  const top=async(frac)=>{await ev(f=>{const H=window.__ht;H.running=true;if(H.CV)H.exitVehicle();const V=H.VAN;H.repairCar(V,'full');if(f<1)H.carDamage(V,H.carHpMax(V)*(1-f),'test');const a=H.WORLD.places.auto;
      /* a long straight: Route 9 eastbound */V.pos.set(150,0,43);V.yaw=-Math.PI/2;H.P.pos.set(150,0,41);H.enterVan();const e=H.CV;e.pos.set(150,0,43);e.yaw=-Math.PI/2;if(e.car){e.car.x=150;e.car.z=43;e.car.yaw=-Math.PI/2;e.car.spd=0;e.car.vdx=1;e.car.vdz=0}H.step(2)},frac);
    await key('w',true);let mx=0;for(let i=0;i<20;i++){await step(6);mx=Math.max(mx,await ev(()=>Math.abs(window.__ht.CV?window.__ht.CV.spd:0)))}await key('w',false);
    const b=await ev(()=>{const H=window.__ht;return{band:H.carBand(H.VAN),hp:Math.round(H.carHp(H.VAN))}});return{max:+mx.toFixed(1),...b}};
  const healthy=await top(1),limp=await top(.1);log('top speed healthy',healthy,'limp',limp);
  ok(limp.max<healthy.max*.8&&limp.max>3,'limp mode: slower but still drivable',{healthy,limp});
  /* breakdown and the tow */
  const brk=await ev(()=>{const H=window.__ht;H.running=true;const V=H.VAN;H.carDamage(V,999,'test');H.step(10);H.exitVehicle();H.step(4);H.draw();
    const pr=[...document.querySelectorAll('*')].filter(x=>x.children.length===0&&x.offsetParent&&/tow|Dad's Auto/i.test(x.textContent||'')).map(x=>x.textContent).slice(0,3);return{hp:H.carHp(V),pr,cash:HT.Jobs.api.SV().cash}});
  log('broken down',brk);
  await p.keyboard.press('e');await step(20);await p.waitForTimeout(2200);await step(6);
  const tow=await ev(()=>{const H=window.__ht,V=H.VAN,a=H.WORLD.places.auto;return{hp:Math.round(H.carHp(V)),max:H.carHpMax(V),van:[+V.pos.x.toFixed(1),+V.pos.z.toFixed(1)],distAuto:+Math.hypot(V.pos.x-a.x,V.pos.z-a.z).toFixed(1),dad:[+H.P.pos.x.toFixed(1),+H.P.pos.z.toFixed(1)]}});
  log('after tow',tow);ok(tow.hp>0&&tow.distAuto<40,"broken-down van: E calls the tow, the van ends up patched at Dad's Auto",tow);
  /* dents gone after a full repair at Dad's Auto (the shop's own Repair tab) */
  const rep=await ev(async()=>{const H=window.__ht;H.running=true;const V=H.VAN;H.crash(V,22,{angle:.3});H.crash(V,20,{angle:-.4});const d0=V.obj.userData.dentN|0,hp0=Math.round(H.carHp(V));
    try{H.grant&&H.grant(5000)}catch(_){}const a=H.WORLD.places.auto;H.P.pos.set(a.x,0,a.z);const opened=H.openShop?H.openShop('auto'):false;await new Promise(r=>setTimeout(r,300));
    const t=document.querySelector('[data-act=tab][data-tab=repair]');if(t)t.click();await new Promise(r=>setTimeout(r,300));
    const btn=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&/repair all|full repair|fix (it|everything)|like new/i.test(b.textContent));const lbl=btn&&btn.textContent;if(btn)btn.click();await new Promise(r=>setTimeout(r,400));
    try{H.HUD.hide&&H.HUD.hide('shop')}catch(_){}document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await new Promise(r=>setTimeout(r,300));
    return{opened,btn:lbl,d0,hp0,d1:H.VAN.obj.userData.dentN|0,hp1:Math.round(H.carHp(H.VAN)),max:H.carHpMax(H.VAN)}});
  log('repair',rep);ok(rep.hp1===rep.max&&rep.d1===0,"Dad's Auto full repair: HP topped up, dents gone",rep);
  await W.shot('vehicles-after-repair');
  require('fs').writeFileSync(__dirname+'/vehicles.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
