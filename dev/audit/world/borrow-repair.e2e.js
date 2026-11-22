/* Dad's Auto with a borrowed car. node dev/audit/world/borrow-repair.e2e.js
   index.html openShop() says "Dad's Auto repairs whichever car you pulled in with (a borrowed one included)". A player would:
   borrow a neighbour's car (E), dent it, drive it into the service-bay ring, press E. Compare with the minivan in the same spot.
   Also on foot next to the borrowed car at the shop door. */
const {open,log,ok,out}=require('./lib.js');
(async()=>{const W=await open();const {p,ev,step}=W;
  await ev(()=>{const H=window.__ht;H.step(3)});await step(10);
  const prompt=()=>ev(()=>{const H=window.__ht;H.draw();return [...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.offsetParent&&/Pull into|Dad's Auto|Repair/i.test(e.textContent)).map(e=>e.textContent.trim()).slice(0,4)});
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
  await W.shot('borrow-repair-bay');
  require('fs').writeFileSync(__dirname+'/borrow-repair.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
