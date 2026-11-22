/* The open world's outer edge (playthrough audit PT-08): walking or driving at the map edge stops inside the tree line, never on
   the far backdrop. Held W (stepped time) toward each edge from inside the map, on foot and in the minivan.
   node dev/edge-bounds.e2e.js [--shots]   (docs/audit/playthrough/edge-west.jpg: the view west from where you stop) */
const {open}=require('./ai-ingame-lib.js'),path=require('path');
const SHOTS=process.argv.includes('--shots');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open({init:()=>{if(!sessionStorage.getItem('s')){sessionStorage.setItem('s','1');localStorage.clear()}}});const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(1500);
  const r=await ev(()=>{window.__rafOn=false;const H=window.__ht,W=H.L.W*2,Hm=H.L.H*2,out=[];
    for(const [sx,sz,yaw,lab] of [[12,15.8,Math.PI/2,'west (Maple, the road out)'],[12,40,Math.PI/2,'west z40'],[60,8,0,'north'],[W-12,60,-Math.PI/2,'east']]){
      H.P.pos.set(sx,0,sz);H.P.yaw=yaw;H.keys.w=true;H.keys.shift=true;for(let i=0;i<600;i++)H.step(1);H.keys.w=false;H.keys.shift=false;
      out.push({lab,x:+H.P.pos.x.toFixed(2),z:+H.P.pos.z.toFixed(2),in:H.P.pos.x>=3.3&&H.P.pos.z>=3.3&&H.P.pos.x<=W-3.3&&H.P.pos.z<=Hm-3.3})}
    /* the minivan down the road out of Maple, west */
    const V=H.VAN;H.P.pos.set(20,0,15.8);V.pos.set(20,0,15.8);V.yaw=Math.PI/2;V.spd=0;H.syncVan();H.enterVan();H.step(2);H.keys.w=true;for(let i=0;i<600;i++)H.step(1);H.keys.w=false;
    out.push({lab:'minivan west',x:+H.CV.pos.x.toFixed(2),z:+H.CV.pos.z.toFixed(2),in:H.CV.pos.x>=3.3});H.exitVehicle&&H.exitVehicle();H.step(2);return out});
  for(const o of r)ok(o.in,o.lab+': stopped at '+o.x+','+o.z);
  if(SHOTS){await ev(()=>{const H=window.__ht;H.P.pos.set(3.4,0,15.8);H.P.yaw=Math.PI/2;H.P.pitch=-.02;H.running=true;window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
    await p.waitForTimeout(3000);await p.screenshot({path:path.join(__dirname,'../docs/audit/playthrough/edge-west.jpg'),type:'jpeg',quality:82,timeout:120000})}
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors '+bad.slice(0,3).join(' | '));
  console.log(fails?fails+' FAILED':'all passed');await b.close();process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
