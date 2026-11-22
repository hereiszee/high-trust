/* Leaving the house, then going somewhere: is the open world still there?
   node dev/audit/world/home-exit.e2e.js [--net]   (--net: the same failing people-model network as people-wide.e2e.js)
   Fresh save. Walk to the front door, E (enter home), E at "Head outside", then (a) look down the home street, (b) teleport to
   the Fort Sensible motor pool (as fast travel would), (c) fast travel by the map (M, Tab, Enter) to Dad's Auto.
   At each: visible open-world chunk count, the world group in the scene, a screenshot. */
const {open,log,ok,out}=require('./lib.js');
const NET=process.argv.includes('--net');const MODEL=/\/assets\/(opt\/)?people\/rocketbox\/([^/]+)\.glb(\?|$)/;let nAb=6;
(async()=>{const W=await open(NET?{before:async p=>{await p.route(MODEL,async r=>{if(nAb>0){nAb--;return r.abort()}await new Promise(s=>setTimeout(s,2000));if(Math.random()<.4)return r.abort();return r.fallback()})}}:{});
  const {p,ev,step}=W;await ev(()=>{const H=window.__ht;H.step(3)});await step(10);
  const world=()=>ev(()=>{const H=window.__ht,O=H.ow;const s=O&&O.stats();let root=H.L&&H.L.group;let inScene=false;for(let a=root;a;a=a.parent)if(a===H.scene)inScene=true;
    let meshes=0;if(root)root.traverse(o=>{if(o.isMesh&&o.visible)meshes++});return{mode:H.mode,lid:H.L&&H.L.def&&H.L.def.id,world:!!(H.L&&H.L.world),groupInScene:inScene,visChunks:s?s.chunks.filter(c=>c.visible).length:null,built:s?s.chunks.filter(c=>c.built).length:null,meshes,p:[+H.P.pos.x.toFixed(1),+H.P.pos.z.toFixed(1)]}});
  log('start',await world());
  /* the front door: the home pin, then E */
  await ev(()=>{const H=window.__ht;H.homeInit()});for(let i=0;i<40;i++){await p.waitForTimeout(250);if(await ev(()=>!!(HT.Home&&HT.Home.ready||window.__ht.homeReady)))break}
  await ev(()=>{const H=window.__ht,h=H.WORLD.places.home;H.P.pos.set(h.x,0,h.z+1.5);H.collide(H.P.pos,.35);H.P.yaw=0;H.step(3)});
  let pr=await ev(()=>{const H=window.__ht;H.draw();return [...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.offsetParent&&/home|door|inside/i.test(e.textContent)).map(e=>e.textContent).slice(0,3)});log('at door prompt',pr);
  for(let i=0;i<20;i++){await p.keyboard.press('e');await step(4);await p.waitForTimeout(300);if((await ev(()=>window.__ht.mode))==='home')break}
  log('inside',await world());await W.shot('homeexit-inside');
  /* E at "Head outside" */
  await ev(()=>{window.__ht.running=true});
  pr=await ev(()=>{const H=window.__ht;H.draw();return [...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.offsetParent&&/outside/i.test(e.textContent)).map(e=>e.textContent).slice(0,3)});log('inside prompt',pr);
  for(let i=0;i<10;i++){await p.keyboard.press('e');await step(4);await p.waitForTimeout(300);if((await ev(()=>window.__ht.mode))==='hub')break}
  await step(30);const a=await world();log('outside',a);await W.live(2000);await W.shot('homeexit-street');
  ok(a.mode==='hub'&&a.groupInScene&&a.visChunks>0&&a.meshes>200,'after Head outside: the open world is there',a);
  await ev(()=>{const H=window.__ht;H.running=true;const d=HT.Base.def();H.P.pos.set(d.tank.x+8,0,d.tank.z+8);H.collide(H.P.pos,.35);H.P.yaw=Math.PI/4;H.P.pitch=-.1});await step(60);
  const b=await world();log('base',b);await W.live(2000);await W.shot('homeexit-base');
  ok(b.groupInScene&&b.visChunks>0,'after Head outside, at Fort Sensible: the open world is there',b);
  await ev(()=>{window.__ht.running=true});await p.keyboard.press('m');await p.waitForTimeout(200);
  for(let i=0;i<40;i++){await p.keyboard.press('Tab');await p.waitForTimeout(40);if(await ev(()=>{const t=document.querySelector('.tip h3');return t&&t.textContent==="Dad's Auto"}))break}
  await p.keyboard.press('Enter');await p.waitForTimeout(700);await step(40);const c=await world();log('auto',c);await W.live(2000);await W.shot('homeexit-auto');
  ok(c.groupInScene&&c.visChunks>0,"after Head outside, map to Dad's Auto: the open world is there",c);
  require('fs').writeFileSync(__dirname+'/home-exit'+(NET?'-net':'')+'.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
