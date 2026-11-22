/* FINAL-CHECK Part 2 · the map grew from 128 to 152 rows for the strip. node dev/audit/final-check/strip-edges.js [--shots]
   1. Hold W (stepped time, on foot sprinting and in the minivan) due SOUTH from z=240 at several x: the strip side (x 60, 200), the river
      (x 292) and east of it (x 330, 420). Where does the dad stop, is it inside the map, is there ground under him (a ray down hits a mesh)?
      (dev/edge-bounds.e2e.js only walks west/north/east.)
   2. A save from before the strip existed (dev/fixtures/all-done-save.json has no "strip" key): Continue, then the race office opens and
      SAVE.strip gets its defaults; no console errors.
   Shots: docs/audit/final-check/edge-south-<x>.jpg */
const {open}=require('../../ai-ingame-lib.js'),fs=require('fs'),path=require('path');const SHOTS=process.argv.includes('--shots');
const OUT=path.join(__dirname,'../../../docs/audit/final-check');fs.mkdirSync(OUT,{recursive:true});
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const fx=fs.readFileSync(path.join(__dirname,'../../fixtures/all-done-save.json'),'utf8');
  const {b,p,errs}=await open({viewport:{width:1280,height:720},init:()=>{if(!sessionStorage.getItem('s')){sessionStorage.setItem('s','1');localStorage.clear()}}});const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(1500);
  const dims=await ev(()=>({W:window.__ht.L.W*2,H:window.__ht.L.H*2}));console.log('map metres',JSON.stringify(dims));
  for(const veh of[false,true])for(const x of[60,200,292,330,420]){
    const r=await ev(([x,veh])=>{window.__rafOn=false;const H=window.__ht,Hm=H.L.H*2;
      if(veh){if(!H.CV){H.VAN.pos.set(x,0,236);H.VAN.yaw=Math.PI;H.P.pos.set(x+2.2,0,236);H.enterVan()}else{H.CV.pos.set(x,0,236);H.CV.yaw=Math.PI;H.CV.spd=0}}
      else{if(H.CV&&H.exitCar)H.exitCar();H.P.pos.set(x,0,236);H.P.yaw=Math.PI}
      H.step(2);H.ow&&H.ow.update(H.camera);
      /* yaw PI = facing +z (south): the game's forward is -z at yaw 0 */
      H.keys.w=true;H.keys.shift=!veh;for(let i=0;i<(veh?500:700);i++){if(veh&&H.CV)H.CV.yaw=Math.PI;else H.P.yaw=Math.PI;H.step(1)}H.keys.w=false;H.keys.shift=false;for(let i=0;i<30;i++)H.step(1);
      H.ow&&H.ow.update(H.camera);const o=veh&&H.CV?H.CV.pos:H.P.pos;
      const rc=new THREE.Raycaster(new THREE.Vector3(o.x,40,o.z+1),new THREE.Vector3(0,-1,0),0,80);const hits=rc.intersectObjects(H.scene.children,true).filter(h=>h.object.visible&&!(H.P.dude&&H.P.dude.root&&(()=>{let q=h.object;while(q){if(q===H.P.dude.root||q===(H.CV&&H.CV.obj))return true;q=q.parent}return false})()));
      return{veh,x0:x,x:+o.x.toFixed(1),z:+o.z.toFixed(1),inMap:o.z<=Hm-3.3,region:HT.WorldGen?HT.WorldGen.regionAt(o.x,o.z):null,ground:hits.length?{y:+hits[0].point.y.toFixed(2),name:hits[0].object.name||hits[0].object.parent&&hits[0].object.parent.name||'?'}:null,inCar:!!H.CV,swim:!!(H.P.swim||H.P.inWater)}},[x,veh]);
    ok(r.inMap&&!!r.ground,(veh?'minivan':'on foot')+' south from x '+x+': stopped at '+r.x+','+r.z+' (map ends '+dims.H+'), region '+r.region+', ground under: '+JSON.stringify(r.ground)+(r.swim?' (swimming)':''));
    if(SHOTS&&!veh){await ev(()=>{const H=window.__ht;H.P.fp=false;H.draw()});await p.screenshot({path:path.join(OUT,'edge-south-'+x+'.jpg'),type:'jpeg',quality:70})}}
  /* 2. a save from before the strip */
  await ev(fx=>{localStorage.setItem('ht-save',fx)},fx);await p.reload();await p.waitForTimeout(2500);
  const t=await ev(()=>({screen:window.__ht&&window.__ht.HUD.screen,cont:!!document.querySelector('.ht-title [data-act=continue]')}));
  const c=await p.$('.ht-title [data-act=continue]');if(c)await c.click();await p.waitForTimeout(2000);
  const s=await ev(()=>{const H=window.__ht;H.step(3);H.P.pos.set(HT.Strip.def().booth.x-1.4,0,HT.Strip.def().booth.z);H.P.yaw=-Math.PI/2;H.step(4);HT.Strip.open('office');const m=HT.Strip.menu();
    return{mode:H.mode,cash:Math.round(HT.Save.data.cash),strip:!!HT.Save.data.strip,stripKeys:HT.Save.data.strip?Object.keys(HT.Save.data.strip).join(','):null,menu:m.open?m.id+': '+m.items.join(' | '):null,day:HT.Save.data.day}});
  ok(t.cont&&s.mode==='hub'&&s.strip&&s.menu&&/^office/.test(s.menu),'pre-strip save: Continue '+t.cont+', '+JSON.stringify(s));
  ok(!errs.length,'console errors: '+errs.length+' '+errs.slice(0,3).join(' | '));
  console.log(fails?fails+' FAIL':'all ok');await b.close();process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(2)});
