/* perf audit: where are the gun models that are drawn from far away? lists every Object3D named gun_* in the scene with its
   ancestor chain, world position, effective visibility, and the camera distance. node dev/audit/perf/gun-where.js */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
(async()=>{const {b,p,errs}=await lib.open();
  const r=await p.evaluate(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.P.pos.set(39,0,15);H.step(30);
    const out=[];const c=H.camera.position;
    H.scene.traverse(o=>{if(!/^gun_/.test(o.name))return;const ch=[];let q=o,vis=true;while(q){ch.push((q.name||q.type)+(q.visible?'':'(hidden)'));if(!q.visible)vis=false;q=q.parent}
      const w=new THREE.Vector3();o.getWorldPosition(w);out.push({name:o.name,chain:ch.join(' < '),pos:[w.x,w.y,w.z].map(v=>+v.toFixed(1)),effVisible:vis,dist:+w.distanceTo(c).toFixed(0)})});
    const rr=H.scene.getObjectByName('rentalRack');let sp=rr&&rr.userData._cs;
    return{cam:[c.x,c.y,c.z].map(v=>+v.toFixed(1)),guns:out,rack:rr?{visible:rr.visible,cs:sp?{c:[sp.center.x,sp.center.y,sp.center.z].map(v=>+v.toFixed(1)),r:+sp.radius.toFixed(1)}:null}:null}});
  console.log(JSON.stringify(r,null,1));console.log('errors',errs.length);await b.close()})();
