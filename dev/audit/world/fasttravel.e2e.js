/* Map fast travel with real keys (M, Tab, Enter). node dev/audit/world/fasttravel.e2e.js
   A: on foot, minivan far away (>30 m): does fast travel go, and what does the player see?
   B: in the minivan: where do the van and dad end up, and what does the feed say ("Saved you N seconds")?
   C: driving the tank / flying the jet: does the map move the war machine into town? */
const {open,log,ok,out}=require('./lib.js');
(async()=>{const W=await open();const {p,ev,step}=W;
  await ev(()=>{const H=window.__ht;H.step(3)});await step(30);
  const st=()=>ev(()=>{const H=window.__ht,V=H.VAN,CV=H.CV;return{p:{x:+H.P.pos.x.toFixed(1),z:+H.P.pos.z.toFixed(1)},van:{x:+V.pos.x.toFixed(1),z:+V.pos.z.toFixed(1)},cv:CV?{type:CV.type,x:+CV.pos.x.toFixed(1),y:+(CV.obj.position.y).toFixed(1),z:+CV.pos.z.toFixed(1)}:null,mode:H.mode}});
  const feedTxt=()=>ev(()=>{const r=[];document.querySelectorAll('*').forEach(e=>{if(e.children.length===0&&e.offsetParent&&/fast travel|minivan|Saved you|argument/i.test(e.textContent))r.push(e.textContent.trim())});return [...new Set(r)]});
  const pins=await ev(()=>{const H=window.__ht;const m=H.HUD.minimap;return (m.pins||m._pins||[]).map?.(x=>x.id)||null});
  log('pins api',pins);
  /* travel by map: open with M, Tab until the label matches, Enter */
  const mapTravel=async(label)=>{await p.keyboard.press('m');await p.waitForTimeout(200);let got=null;
    for(let i=0;i<40;i++){await p.keyboard.press('Tab');await p.waitForTimeout(40);const t=await ev(()=>{const t=document.querySelector('.tip h3');const b=document.querySelector('.tip button');return t&&{l:t.textContent,btn:b&&!b.hidden}});if(t&&t.l===label){got=t;break}}
    if(!got){await p.keyboard.press('Escape');return {err:'no pin '+label}}
    await p.keyboard.press('Enter');await p.waitForTimeout(600);await step(6);return got};
  /* A: walk the dad 60 m from the van (teleport him; the van stays put) */
  let s0=await st();log('start',s0);
  await ev(()=>{const H=window.__ht;H.P.pos.set(H.VAN.pos.x+60,0,H.VAN.pos.z);H.collide(H.P.pos,.35)});await step(6);
  const before=await st();
  const labels=await ev(()=>{const H=window.__ht;const m=document.querySelector('.tip');return null});
  const r1=await mapTravel("Dad's Auto");const a1=await st();const f1=await feedTxt();
  log('A on foot, van',Math.round(Math.hypot(before.p.x-before.van.x,before.p.z-before.van.z)),'m away ->',r1,a1,f1);
  const moved=Math.hypot(a1.p.x-before.p.x,a1.p.z-before.p.z);
  ok(!(moved>20&&f1.some(t=>/Get back to the minivan/i.test(t))),'A: fast travel on foot either refuses (needs the minivan) or goes, never both (moved '+moved.toFixed(0)+' m)',f1);
  ok(!(moved>20&&Math.hypot(a1.p.x-a1.van.x,a1.p.z-a1.van.z)>100),'A: after fast travel the minivan is not left far behind',{dad:a1.p,van:a1.van});
  /* B: in the minivan */
  await ev(()=>{const H=window.__ht;const a=H.WORLD.places.auto;H.VAN.pos.set(a.x,0,a.z+10);H.syncVan&&H.syncVan();H.P.pos.set(a.x+3,0,a.z+10);H.enterVan();const e=H.CV;e.pos.set(a.x,0,a.z+10);if(e.car){e.car.x=a.x;e.car.z=a.z+10;e.car.spd=0}H.step(2)});await step(4);
  const b0=await st();const r2=await mapTravel('Home');await p.waitForTimeout(500);await step(6);const b1=await st();const f2=await feedTxt();
  log('B in van ->',r2,b0,b1,f2);
  const sv=f2.map(t=>(t.match(/Saved you (\d+) seconds/)||[])[1]).filter(Boolean);
  ok(!sv.length||+sv[0]>8||Math.hypot(b1.cv.x-b0.cv.x,b1.cv.z-b0.cv.z)<120,'B: "Saved you N seconds" reflects the distance (trip '+Math.round(Math.hypot(b1.cv.x-b0.cv.x,b1.cv.z-b0.cv.z))+' m, said '+sv[0]+')');
  /* C: tank and jet */
  for(const kind of['tank','jet']){
    const r=await ev(k=>{const H=window.__ht;if(H.CV)H.exitVehicle();const e=H.vehicles.find(c=>c.type===k);if(!e)return null;H.P.pos.set(e.pos.x+4,0,e.pos.z);const okk=H.enterVehicle(e);H.step(2);return okk},kind);
    if(!r){log('C',kind,'not found / not entered');continue}
    if(kind==='jet')await ev(()=>{const H=window.__ht,e=H.CV;/* get it airborne the quick way */ if(HT.Jet&&HT.Jet.state)log=0});
    const c0=await st();const rr=await mapTravel('Home');await p.waitForTimeout(500);await step(10);const c1=await st();const f3=await feedTxt();
    log('C',kind,c0.cv,'->',rr,c1.cv,f3);
    ok(!(c1.cv&&c1.cv.type===kind&&Math.hypot(c1.cv.x-c0.cv.x,c1.cv.z-c0.cv.z)>100),'C: fast travel does not take the '+kind+' into town',{from:c0.cv,to:c1.cv})}
  await W.shot('fasttravel-after');
  require('fs').writeFileSync(__dirname+'/fasttravel.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
