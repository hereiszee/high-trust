/* Everybody Waves: every scripted vehicle route, checked metre by metre: on road tiles all the way, and clear of every parked
   neighbour car and the job's own props (a car's footprint within 1.4 m of the lane centre is a block).
   The courier's tail route, the stolen stage truck up 3rd St, the Wholesaler's three-lap loop, and the credits drive home.
   node dev/jobs/finale-routes.js */
const {open}=require('../ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);H.jobs.api.SV().world.bridgeOpen=true;await window.HT.Finale.preloadCast();H.jobs.start('finale');H.step(6)});
  const r=await ev(()=>{const H=window.__ht,a=H.jobs.api,FN=window.HT.Finale,W=FN.W;const home=a.WORLD.places.home;
    const paths={tail:FN.avoidCars(FN.route(FN.TAIL_WP)),truck:FN.avoidCars(FN.route([{x:W.truck.x+10,z:W.truck.z},{x:380.5,z:112},{x:380.5,z:46}])),chase:FN.chasePath(),
      home:FN.avoidCars([{x:414.5,z:43.6},{x:352,z:43.6}].concat(FN.route([{x:346,z:43.6},{x:home.x+24,z:43.2},{x:home.x+2,z:home.z+8}])))};
    const cars=(a.L.cars||[]).filter(e=>e.obj&&e!==a.VAN).map(e=>({x:e.pos.x,z:e.pos.z,yaw:e.yaw,S:a.carSize(e),name:e.name}));
    const out={};for(const k in paths){const P=paths[k];const off=FN.routeClear(P);let len=0,hits=[];
      for(let i=1;i<P.length;i++){const p=P[i-1],q=P[i],l=Math.hypot(q.x-p.x,q.z-p.z);len+=l;for(let s=0;s<=l;s+=1){const x=p.x+(q.x-p.x)*s/l,z=p.z+(q.z-p.z)*s/l;
          for(const c of cars){const dx=x-c.x,dz=z-c.z,f=[-Math.sin(c.yaw),-Math.cos(c.yaw)],lo=Math.abs(dx*f[0]+dz*f[1]),la=Math.abs(dx*f[1]-dz*f[0]);if(lo<c.S.l/2+.6&&la<c.S.w/2+1.1)hits.push(c.name+'@'+x.toFixed(0)+','+z.toFixed(0))}}}
      out[k]={pts:P.length,len:Math.round(len),offRoad:off.length,offEx:off.slice(0,3),cars:[...new Set(hits)].slice(0,6)}}
    return{out,parked:cars.length}});
  console.log('     parked neighbour cars in the level: '+r.parked);
  for(const k in r.out){const o=r.out[k];ok(o.offRoad===0,k+': '+o.len+' m, on road tiles metre by metre'+(o.offRoad?' ('+o.offRoad+' off: '+JSON.stringify(o.offEx)+')':''));ok(!o.cars.length,k+': clear of parked cars'+(o.cars.length?' (blocked by '+o.cars.join(', ')+')':''))}
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,3).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
