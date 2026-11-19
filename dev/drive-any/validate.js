const open=require('./harness.js');(async()=>{const o=await open();const p=o.page;const R={};
const ev=(f,a)=>p.evaluate(f,a);
// helper installed in page
await ev(()=>{const h=__ht;window.T={h,
  car:(t,own)=>h.vehicles.find(v=>v.type===t&&(own?v.owner==='player':v.owner!=='player')),
  clear(){for(const k in h.keys)h.keys[k]=false},
  get(e){h.P.pos.set(e.pos.x,0,e.pos.z);return h.enterVehicle(e)},
  insideBuilding(x,z){const L=h.L;for(const hs of L.houses||[])if(x>hs.x0+.3&&x<hs.x1-.3&&z>hs.z0+.3&&z<hs.z1-.3)return 'house';const g=L.g[Math.floor(z/2)];const c=g&&g[Math.floor(x/2)];if(c==='h'||c==='#')return 'tile '+c;if(x<0||z<0||x>L.W*2||z>L.H*2)return 'outside';return null}}});
// B: enter / exit / collider / re-enter for each type
R.enterExit=await ev(()=>{const h=T.h,out={};for(const t of['minivan','hatch','sedan','suv','pickup','workvan']){const e=T.car(t,t==='minivan');T.clear();const ok1=T.get(e);const lod=e.obj.userData.lod;
  h.keys.w=true;h.step(30);h.keys.w=false;h.keys[' ']=true;h.step(45);h.keys[' ']=false;h.step(5);const at={x:e.pos.x,z:e.pos.z};h.use=true;h.step(1);
  const out1=!h.CV,c=e.col,colOk=c.x0<e.pos.x&&c.x1>e.pos.x&&c.z0<e.pos.z&&c.z1>e.pos.z&&c.x0>-1e3;
  const q=new THREE.Vector3(e.pos.x,0,e.pos.z);const pl={x:q.x,z:q.z};h.P.pos.set(q.x,0,q.z);h.step(1);const pushed=Math.hypot(h.P.pos.x-q.x,h.P.pos.z-q.z);
  let solid=false;e.obj.traverse(m=>{if(m.isMesh&&h.dude.solids.includes(m))solid=true});const ok2=T.get(e);h.exitVehicle();
  out[t]={entered:ok1,heroWhileDriving:lod===0,moved:+Math.hypot(at.x-e.home.x,at.z-e.home.z).toFixed(1),exitedWithE:out1,colliderAtCar:colOk,playerPushedOut:+pushed.toFixed(2),meshesSolidAgain:solid||t==='minivan',reEnter:ok2}}return out});
console.log('enterExit',JSON.stringify(R.enterExit));
// LOD swap back after walking away
R.lod=await ev(()=>{const h=T.h,e=T.car('suv');T.get(e);h.exitVehicle();const a=e.obj.userData.lod;h.P.pos.set(e.pos.x+40,0,e.pos.z);for(let i=0;i<5;i++)h.step(1);return{afterExit:a,afterWalkAway:e.obj.userData.lod}});
console.log('lod',JSON.stringify(R.lod));
// D: trust effects
R.trust=await ev(()=>{const h=T.h,e=T.car('sedan'),t0=h.prog.trust;T.get(e);/* drive out, come back */e.odo+=120;e.pos.set(e.home.x,0,e.home.z);h.step(2);h.exitVehicle();
  const v=T.car('minivan',true);T.get(v);const t1=h.prog.trust;h.exitVehicle();
  T.get(e);e.odo+=120;h.step(2);h.exitVehicle();T.get(v);const t2=h.prog.trust;h.exitVehicle();/* same owner again: no farming */
  const s=T.car('hatch');T.get(s);e.odo;s.odo+=200;s.pos.set(s.home.x+70>110?s.home.x-70:s.home.x+70,0,s.home.z);h.step(2);h.exitVehicle();T.get(v);const t3=h.prog.trust;h.exitVehicle();/* abandoned far away */
  T.get(s);h.exitVehicle();T.get(v);const t4=h.prog.trust;h.exitVehicle();
  return{start:t0,afterReturn:t1,afterSecondReturnSameCar:t2,afterAbandon:t3,afterSecondAbandonSameOwner:t4,ledger:{plus:h.BORROW.plus,minus:h.BORROW.minus}}});
console.log('trust',JSON.stringify(R.trust));
// E: fuzz
R.fuzz=await ev(()=>{const h=T.h,out={};let seed=7;const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647);
  for(const t of['minivan','hatch','sedan','suv','pickup','workvan']){const e=T.car(t,t==='minivan');T.clear();T.get(e);let bad=0,first=null,hits=0,maxSp=0;
    for(let i=0;i<2000;i++){if(i%25===0){T.clear();const r=rnd();h.keys.w=r<.7;h.keys.s=r>.85;const s=rnd();h.keys.a=s<.3;h.keys.d=s>.7;h.keys[' ']=rnd()<.15;h.keys.shift=rnd()<.3}
      h.step(1);maxSp=Math.max(maxSp,Math.abs(e.spd));const ib=T.insideBuilding(e.pos.x,e.pos.z);if(ib){bad++;if(!first)first=[i,ib,+e.pos.x.toFixed(1),+e.pos.z.toFixed(1)]}}
    T.clear();h.exitVehicle();out[t]={steps:2000,insideBuilding:bad,first,maxSpeed:+maxSp.toFixed(1),dents:+e.dmg.toFixed(2),odo:Math.round(e.odo)}}return out});
console.log('fuzz',JSON.stringify(R.fuzz));
console.log('errors',o.errs);await o.close()})();
