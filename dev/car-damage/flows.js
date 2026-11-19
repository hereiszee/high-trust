/* Car damage flows in the real game (node dev/car-damage/flows.js [--shots]): bands with visuals + HUD, breakdown, Dad's Auto repairs
   for a borrowed car and the family van (with save/reload), tows, trust scaling, the chase API. Screenshots: docs/screenshots/car-damage/ */
const open=require('../drive-any/harness.js'),fs=require('fs'),path=require('path');const SHOTS=process.argv.includes('--shots');
const DIR=path.join(__dirname,'..','..','docs','screenshots','car-damage');fs.mkdirSync(DIR,{recursive:true});
let fails=0;const ok=(c,m,x)=>{console.log((c?'  ok   ':'  FAIL ')+m+(x!==undefined?'  '+JSON.stringify(x):''));if(!c)fails++};
(async()=>{const o=await open();const p=o.page;
const shot=async n=>{if(!SHOTS)return;await p.evaluate(()=>__ht.draw());await p.screenshot({path:path.join(DIR,n+'.jpg'),type:'jpeg',quality:82})};
/* a borrowed sedan, parked on an open bit of road, seen from the front three-quarters */
const setup=await p.evaluate(()=>{const h=__ht;const e=h.vehicles.find(v=>v.owner==='neighbour'&&v.type==='sedan');window.__e=e;h.P.pos.set(e.pos.x,0,e.pos.z);h.enterVehicle(e);
  h.prog.trust=40;return{name:e.name,type:e.type,max:h.carHpMax(e),cash:h.cash}});
ok(setup.max===100,'borrowed '+setup.name+"'s "+setup.type,setup);
const view=()=>p.evaluate(()=>{const h=__ht,e=__e;h.P.yaw=e.yaw+2.35;h.P.pitch=-.2;h.step(40);h.P.yaw=e.yaw+2.35;h.P.pitch=-.2});
const hud=()=>p.evaluate(()=>{__ht.draw();const q=s=>document.querySelector(s);return{pct:q('.ht-drv .vh b').textContent,band:q('.ht-drv .vh').dataset.band,warn:q('.ht-drv .vw').textContent,name:q('.ht-drv .vh .row span').textContent}});
/* crash it through every band (17 m/s ~ 38 mph wall hits) */
const seen=new Set();let last=null;
for(let i=0;i<12;i++){const r=await p.evaluate(()=>{const h=__ht,e=__e;const lost=h.crash(e,17,{angle:(Math.random()-.5)*1.2});h.step(3);return{lost,hp:h.carHp(e),band:h.carBand(e),dents:e.obj.userData.dentN|0,lamps:e.wear.lamps.slice()}});
  const H=await hud();last=r;if(!seen.has(r.band)){seen.add(r.band);await view();await shot('band'+r.band+'-'+['fine','dented','pulling','smoking','limp','broken'][r.band]);
    ok(+H.pct.replace('%','')===Math.round(r.hp)&&+H.band===r.band,'HUD shows '+H.pct+' band '+H.band+(H.warn?' · "'+H.warn+'"':''),r)}
  if(r.hp<=0)break}
ok(seen.size>=5&&last.hp===0,'health fell through the bands to 0 (no 20% floor)',[...seen]);
const bd=await p.evaluate(()=>{const e=__e;return{haz:!!e.obj.userData._s.haz,hood:!!(e.fx&&e.fx.hood),carHp:e.car.hp}});ok(bd.haz&&bd.hood&&bd.carHp===0,'broken down: hazards + hood steam, CarAI hp 0',bd);
await p.evaluate(()=>{const h=__ht,e=__e;h.step(9);h.P.yaw=e.yaw+Math.PI*.78;h.P.pitch=-.18;h.step(30);h.P.yaw=e.yaw+Math.PI*.78;h.P.pitch=-.18;e.obj.userData._s.t=.1;e.obj.userData.setHazard(true)});await shot('breakdown-hazards');
/* drive it (well, push it) into Dad's Auto: the Repair tab shows the real damage */
const shop=await p.evaluate(()=>{const h=__ht,e=__e,s=h.hubx.shops.find(x=>x.kind==='auto');h.carRepair(e,8);/* limps in at 8% */e.pos.set(s.bay.x,0,s.bay.z);e.car.spd=0;h.step(2);
  const q=HT.Economy.repairQuote;const ok=h.openShop('auto');return{ok,sh:!!s}});
ok(shop.ok,'Dad\'s Auto opens while driving the borrowed car');await p.waitForTimeout(700);
const rt=await p.evaluate(()=>{const q=HT.Economy.repairQuote(),el=document.querySelector('.htm-reprows');return{name:q.car.name,hp:q.hp,total:q.total,rows:q.rows.map(r=>r.id+' '+r.price),tab:document.querySelector('.htm-tab.on')&&document.querySelector('.htm-tab.on').dataset.tab,listed:el?el.textContent:null,cash:__ht.cash}});
ok(rt.tab==='repair'&&rt.hp===8&&rt.total>=184&&/Body work/.test(rt.listed)&&/Engine/.test(rt.listed),'Repair tab: '+rt.name+' · '+rt.hp+' HP · '+rt.rows.join(', ')+' = $'+rt.total,rt);
await p.screenshot({path:path.join(DIR,'repair-tab-borrowed.jpg'),type:'jpeg',quality:82});
/* short on cash: only the patch is affordable */
await p.evaluate(()=>__ht.grant(60));await p.evaluate(()=>{document.querySelector('[data-act=tab][data-tab=perf]').click();document.querySelector('[data-act=tab][data-tab=repair]').click()});await p.waitForTimeout(300);
const patch=await p.evaluate(async()=>{const it=document.querySelector('[data-key="rep:patch"]');if(!it)return{none:true};it.click();await new Promise(r=>setTimeout(r,150));
  const b=document.querySelector('.htm-detail [data-act=primary]')||document.querySelector('[data-act=primary]');b.click();await new Promise(r=>setTimeout(r,100));document.querySelector('[data-act=primary]').click();await new Promise(r=>setTimeout(r,300));
  return{hp:__ht.carHp(__e),cash:__ht.cash}});
ok(!patch.none&&patch.hp===38&&patch.cash===0,'partial repair with $60: +30 HP (engine first), cash 0',patch);
await p.evaluate(()=>__ht.grant(2000));await p.evaluate(()=>{document.querySelector('[data-act=tab][data-tab=perf]').click();document.querySelector('[data-act=tab][data-tab=repair]').click()});await p.waitForTimeout(300);
const full=await p.evaluate(async()=>{const it=document.querySelector('[data-key="rep:active"]');it.click();await new Promise(r=>setTimeout(r,150));const pr=HT.Economy.status('rep','active','auto').price;
  document.querySelector('[data-act=primary]').click();await new Promise(r=>setTimeout(r,100));document.querySelector('[data-act=primary]').click();await new Promise(r=>setTimeout(r,300));
  return{price:pr,hp:__ht.carHp(__e),cash:__ht.cash,lamps:__e.wear.lamps.join(''),dents:__e.obj.userData.dentN|0,fixed:__e.fixed}});
ok(full.hp===100&&full.lamps==='0000'&&full.dents===0&&full.fixed,'full repair: 100 HP, lamps fixed, fresh body ($'+full.price+')',full);
await p.screenshot({path:path.join(DIR,'repair-tab-borrowed-after.jpg'),type:'jpeg',quality:82});
await p.evaluate(()=>{HT.Shop.close()});await p.waitForTimeout(300);
const st=await p.evaluate(()=>{const e=__e;return{top:e.stats.maxSpeed,base:e.base.maxSpeed,band:__ht.carBand(e)}});ok(st.band===0,'handling back to stock after the repair',st);
await view();await shot('after-repair-borrowed');
/* returning it repaired: a thank-you instead of a ding */
const tr=await p.evaluate(()=>{const h=__ht,t0=h.prog.trust;h.exitVehicle();const r=h.settleBorrow(false);return{r,d:h.prog.trust-t0}});ok(tr.r===1&&tr.d===1,'paid-for repair: thank-you, +1 trust',tr);
/* trust scales with damage left, fires once per owner, capped */
const sc=await p.evaluate(()=>{const h=__ht,out=[];const cs=h.vehicles.filter(v=>v.owner==='neighbour'&&v!==__e).slice(0,5);const amt=[5,15,40,70,90];
  cs.forEach((e,i)=>{h.P.pos.set(e.pos.x,0,e.pos.z);const t0=h.prog.trust;h.enterVehicle(e);h.carDamage(e,h.carHpMax(e)*amt[i]/100,'test');h.exitVehicle();const r=h.settleBorrow(false);out.push([e.name,amt[i],r,h.prog.trust-t0])});
  const again=cs[2];h.P.pos.set(again.pos.x,0,again.pos.z);h.enterVehicle(again);h.carDamage(again,30,'test');h.exitVehicle();out.push(['again',again.name,h.settleBorrow(false)]);return out});
ok(sc[0][3]===0&&sc[1][3]===-1&&sc[2][3]===-2&&sc[3][3]===-3&&sc[5][2]===0,'trust scales with damage left (5%:0, 15%:-1, 40%:-2, 70%:-3), once per owner, session cap -6',sc);
/* a broken-down borrowed car goes home on a flatbed */
const th=await p.evaluate(()=>{const h=__ht;h.BORROW.minus=0;h.BORROW.dinged.clear();const e=h.vehicles.filter(v=>v.owner==='neighbour'&&v!==__e)[6];h.P.pos.set(e.pos.x,0,e.pos.z);h.enterVehicle(e);
  h.carDamage(e,1e3,'test');h.step(10);h.exitVehicle();const t0=h.prog.trust,c0=h.cash;h.P.pos.set(e.pos.x+Math.cos(e.yaw)*2,0,e.pos.z-Math.sin(e.yaw)*2);h.step(1);__ht.draw();const pr=h.prompt&&h.prompt.text||h.prompt;const r=h.towCar(e);
  return{prompt:pr,r,trust:h.prog.trust-t0,cash:h.cash-c0,home:Math.hypot(e.pos.x-e.home.x,e.pos.z-e.home.z),hp:h.carHp(e),tab:h.save.garage.tab}});
ok(/towed home/.test(th.prompt||'')&&th.trust===-3&&th.cash===-120&&th.home<.01,'broken borrowed car: towed home, -$120, -3 trust',th);
/* parked car you hit: damaged, its owner notices (capped) */
const pk=await p.evaluate(()=>{const h=__ht,cs=h.vehicles.filter(v=>v.owner==='neighbour');const a=cs[8],b=cs[9];h.P.pos.set(a.pos.x,0,a.pos.z);h.enterVehicle(a);
  /* line it up nose-to-side with b and crash */const t0=h.prog.trust;a.pos.set(b.pos.x+Math.sin(b.yaw+Math.PI/2)*3.2,0,b.pos.z+Math.cos(b.yaw+Math.PI/2)*3.2);a.yaw=b.yaw+Math.PI/2;a.car.x=a.pos.x;a.car.z=a.pos.z;a.car.yaw=a.yaw;
  const lost=h.crash(a,18);return{lost,victim:h.carHp(b),vmax:h.carHpMax(b),trust:h.prog.trust-t0}});
ok(pk.lost>0&&pk.victim<pk.vmax&&pk.trust===-1,'hit a parked car: it takes damage, owner notices (-1)',pk);
await p.evaluate(()=>{const h=__ht;h.exitVehicle();h.BORROW.car=null});
/* the family van: damage persists in the save, the Repair tab shows it, tow when broken */
const van=await p.evaluate(()=>{const h=__ht,V=h.VAN;h.P.pos.set(V.pos.x,0,V.pos.z);h.enterVehicle(V);for(let i=0;i<4;i++){h.crash(V,18);h.step(3)}h.saveGame();return{hp:h.carHp(V),save:h.save.garage.hp.minivan,lamps:h.save.garage.wear.minivan.lamps.join('')}});
ok(van.hp<70&&van.save===van.hp,'van damage is the save value',van);
await p.evaluate(()=>{__ht.exitVehicle()});
await p.reload();await p.waitForFunction(()=>window.__ht&&__ht.assets&&__ht.assets.done&&document.querySelector('.ht-title [data-act=continue]'),null,{timeout:90000});await p.waitForTimeout(500);
await p.evaluate(()=>document.querySelector('.ht-title [data-act=continue]').click());await p.waitForTimeout(2500);
const re=await p.evaluate(()=>{const h=__ht,V=h.VAN;return{hp:h.carHp(V),dents:V.obj.userData.dentN|0,dmg:+(V.dmg||0).toFixed(2)}});
ok(Math.abs(re.hp-van.hp)<.01&&re.dents>0,'after reload the van still has '+re.hp.toFixed(1)+' HP and its dents',re);
const vs=await p.evaluate(async()=>{const h=__ht,V=h.VAN,s=h.hubx.shops.find(x=>x.kind==='auto');h.P.pos.set(V.pos.x,0,V.pos.z);h.enterVehicle(V);V.pos.set(s.bay.x,0,s.bay.z);V.car.spd=0;h.step(2);h.grant(500);
  h.openShop('auto');await new Promise(r=>setTimeout(r,700));const q=HT.Economy.repairQuote();return{name:q.car.name,own:q.car.own,hp:q.hp,total:q.total,rows:q.rows.map(r=>r.id),tab:document.querySelector('.htm-tab.on').dataset.tab}});
ok(vs.own&&vs.tab==='repair'&&Math.abs(vs.hp-re.hp)<.01&&vs.total>0,'van Repair tab: '+vs.name+' '+vs.hp.toFixed(0)+' HP, $'+vs.total,vs);
await p.screenshot({path:path.join(DIR,'repair-tab-van.jpg'),type:'jpeg',quality:82});
const vr=await p.evaluate(async()=>{document.querySelector('[data-key="rep:active"]').click();await new Promise(r=>setTimeout(r,150));document.querySelector('[data-act=primary]').click();await new Promise(r=>setTimeout(r,100));
  document.querySelector('[data-act=primary]').click();await new Promise(r=>setTimeout(r,300));HT.Shop.close();await new Promise(r=>setTimeout(r,300));const h=__ht;return{hp:h.carHp(h.VAN),save:h.save.garage.hp.minivan,dents:h.VAN.obj.userData.dentN|0}});
ok(vr.hp===100&&vr.save===100&&vr.dents===0,'van repaired: save 100 HP, fresh body',vr);
/* tow: break the van, get out, call Dad's Auto with no cash: goes on the tab, van at the shop at 60% */
const tw=await p.evaluate(()=>{const h=__ht,V=h.VAN;V.pos.x+=40;h.step(2);h.carDamage(V,1e3,'test');h.step(5);h.exitVehicle();h.save.cash=0;h.P.pos.set(V.pos.x+1.8,0,V.pos.z);h.step(1);__ht.draw();const pr=h.prompt&&h.prompt.text||h.prompt;
  const r=h.towCar(V);const s=h.hubx.shops.find(x=>x.kind==='auto');return{prompt:pr,r,hp:h.carHp(V),max:h.carHpMax(V),atShop:Math.hypot(V.pos.x-s.bay.x,V.pos.z-s.bay.z),tab:h.save.garage.tab}});
ok(/Dad's Auto/.test(tw.prompt||'')&&Math.abs(tw.hp-tw.max*.6)<.01&&tw.atShop<.01&&tw.tab===75,'tow with no cash: on Sal\'s tab ($75), van at the shop at 60%',tw);
await p.evaluate(()=>{const h=__ht;h.P.yaw=h.VAN.yaw+2.3;h.P.pitch=-.25;h.step(20)});await shot('tow-at-dads-auto');
/* chase API on a bare HT.CarAI car */
const ch=await p.evaluate(()=>{const h=__ht,c=HT.CarAI.make('sedan',{x:0,z:0});let n=0;const off=h.onBreakdown(x=>{if(x===c)n++});const a=h.carHp(c);h.carDamage(c,60,'ram');const b=h.carHp(c);h.carDamage(c,60,'ram');const d=h.carHp(c);h.carRepair(c,'full');off();return{a,b,d,n,after:h.carHp(c)}});
ok(ch.a===100&&ch.b===40&&ch.d===0&&ch.n===1&&ch.after===100,'chase API: carHp/carDamage/carRepair/onBreakdown on an HT.CarAI car',ch);
ok(o.errs.length===0,'no console errors',o.errs.slice(0,5));
console.log(fails?fails+' FAILED':'all passed');await o.close();process.exitCode=fails?1:0})();
