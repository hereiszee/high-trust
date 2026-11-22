/* Dad's Auto with a borrowed car. node dev/audit/world/borrow-repair.e2e.js
   index.html openShop() says "Dad's Auto repairs whichever car you pulled in with (a borrowed one included)". A player would:
   borrow a neighbour's car (E), dent it, drive it into the service-bay ring, press E. Compare with the minivan in the same spot.
   Also on foot next to the borrowed car at the shop door. */
const {open,log,ok,out}=require('./lib.js');
(async()=>{const W=await open();const {p,ev,step}=W;
  await ev(()=>{const H=window.__ht;H.step(3)});await step(10);
  const prompt=()=>ev(()=>{const H=window.__ht;H.draw();return [...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.offsetParent&&/Pull into|Dad's Auto|Repair|cars only/i.test(e.textContent)).map(e=>e.textContent.trim()).slice(0,4)});
  const bay=await ev(()=>{const H=window.__ht;const b=H.WORLD.places.autoBay||H.WORLD.places.auto;return{x:b.x,z:b.z-4,door:H.WORLD.places.auto}});log('bay',bay);
  const drive=(which)=>ev(([which,b])=>{const H=window.__ht;H.running=true;if(H.CV)H.exitVehicle();let e;
      if(which==='van')e=H.VAN;else e=H.vehicles.find(c=>c.owner==='neighbour'&&c.type!=='tank'&&c.type!=='jet'&&c.type!=='mower');
      H.P.pos.set(e.pos.x+2,0,e.pos.z);H.enterVehicle(e);const c=H.CV;c.pos.set(b.x,0,b.z);c.yaw=0;if(c.car){c.car.x=b.x;c.car.z=b.z;c.car.yaw=0;c.car.spd=0}H.step(1);
      H.crash(c,22,{angle:.3});H.step(6);return{type:c.type,name:c.name,hp:Math.round(H.carHp(c))}},[which,bay]);
  for(const which of['van','borrowed']){const c=await drive(which);await step(6);const pr=await prompt();
    await p.keyboard.press('e');await p.waitForTimeout(500);await step(2);
    const shop=await ev(()=>{const m=[...document.querySelectorAll('.htm-panel')].find(x=>x.offsetParent);const t=document.querySelector('.htm-tab.on');return{open:!!(m&&m.offsetParent),tab:t&&t.dataset.tab,txt:m?m.textContent.slice(0,160):''}});
    log(which,c,'prompt',pr,'after E',shop);
    ok(pr.some(t=>/Pull into/i.test(t))&&shop.open,'in the '+which+' at the service bay: "Pull into Dad\'s Auto" shows and E opens the shop',{prompt:pr,shop});
    await p.keyboard.press('Escape');await p.waitForTimeout(400);await step(2);await ev(()=>{window.__ht.running=true})}
  /* W-13 regression: the shop opened from the borrowed car repairs THAT car; paying for it and handing it back is +1 trust, once per car */
  await drive('borrowed');await step(6);await p.keyboard.press('e');await p.waitForTimeout(500);await step(2);
  const q=await ev(()=>{const Q=HT.Economy.repairQuote();return{name:Q.car&&Q.car.name,own:Q.car&&Q.car.own,hp:Q.hp}});log('repair target',q);
  ok(q.name&&/Linda|'s/.test(q.name)&&q.own===false,'the Repair tab is for the borrowed car, not the minivan',q);
  await ev(()=>window.__ht.grant(3000));await ev(()=>{document.querySelector('[data-act=tab][data-tab=perf]').click();document.querySelector('[data-act=tab][data-tab=repair]').click()});await p.waitForTimeout(300);
  const fix=await ev(async()=>{const it=document.querySelector('[data-key="rep:active"]');if(!it)return{none:true};it.click();await new Promise(r=>setTimeout(r,150));
    document.querySelector('[data-act=primary]').click();await new Promise(r=>setTimeout(r,100));document.querySelector('[data-act=primary]').click();await new Promise(r=>setTimeout(r,300));
    const H=window.__ht,c=H.CV;return{hp:Math.round(H.carHp(c)),fixed:!!c.fixed,name:c.name}});log('repaired',fix);
  ok(fix.hp===100&&fix.fixed,'paid at Dad\'s Auto: the borrowed car is back to 100 HP',fix);
  await p.keyboard.press('Escape');await p.waitForTimeout(400);await step(2);
  const tr=await ev(()=>{const H=window.__ht,t0=H.prog.trust+(H.prog.trustR||0);H.exitVehicle();const r=H.settleBorrow(false);const t1=H.prog.trust+(H.prog.trustR||0);
    /* the same car again, fixed again: no second thank-you */const e=H.vehicles.find(c=>c.name===window.__ht.vehicles.find(x=>x.fixed)?.name)||null;let r2=null;if(e){H.P.pos.set(e.pos.x+2,0,e.pos.z);H.enterVehicle(e);e.fixed=true;H.exitVehicle();r2=H.settleBorrow(false)}
    return{r,d:+(t1-t0).toFixed(2),again:r2,d2:+(H.prog.trust+(H.prog.trustR||0)-t1).toFixed(2)}});log('trust',tr);
  ok(tr.r===1&&tr.d===1&&!tr.again&&tr.d2===0,'handing it back fixed: +1 trust, once per car',tr);
  /* the tank, the jet and the mower at the bay: Sal says no, nothing opens */
  for(const kind of['tank','jet','mower']){const r=await ev(([kind,b])=>{const H=window.__ht;if(H.CV)H.exitVehicle();const e=H.vehicles.find(c=>c.type===kind);if(!e)return null;H.P.pos.set(e.pos.x+3,0,e.pos.z);if(!H.enterVehicle(e)&&H.CV!==e)return{err:'not entered'};
      const c=H.CV;c.pos.set(b.x,0,b.z);c.yaw=0;if(c.car){c.car.x=b.x;c.car.z=b.z;c.car.yaw=0;c.car.spd=0}c.spd=0;H.step(2);return{type:c.type}},[kind,bay]);
    if(!r||r.err){log(kind,'not available here',r);continue}await step(6);const pr=await prompt();
    const said=await ev(k=>[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.offsetParent&&/Sal/.test(e.textContent)&&new RegExp(k==='tank'?'tank':k==='jet'?'jet':'mower').test(e.textContent)).map(e=>e.textContent.trim()).slice(-1),kind);
    await p.keyboard.press('e');await p.waitForTimeout(400);await step(2);
    const after=await ev(()=>{const m=[...document.querySelectorAll('.htm-panel')].find(x=>x.offsetParent);return{open:!!m,cv:window.__ht.CV&&window.__ht.CV.type}});
    log(kind,'prompt',pr,'said',said,'after E',after);ok(!after.open&&said.length>0&&!after.cv,'in the '+kind+' at the bay: Sal says no as you roll in, no shop, and E still gets you out',{pr,said,after});
    if(after.open){await p.keyboard.press('Escape');await p.waitForTimeout(300)}}
  await W.shot('borrow-repair-bay');
  require('fs').writeFileSync(__dirname+'/borrow-repair.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
