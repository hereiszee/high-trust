/* Arriving at Fort Sensible in one jump (fast travel / teleport), with and without a visit home first.
   node dev/audit/world/base-arrive.e2e.js
   After the jump: N streaming updates (OW.update, as each real frame does), then count what is drawn near the camera and screenshot.
   Variant A: fresh game -> motor pool. Variant B: same, after entering and leaving the house (HT enterHome / Head outside path).
   Checkpoints at 1, 15, 60 and 180 updates (~0.25 s, 1 s, 3 s of real frames at 60 fps). */
const {open,log,ok,out}=require('./lib.js');
const run=async(variant)=>{const W=await open();const {p,ev,step}=W;await ev(()=>{const H=window.__ht;H.step(3)});await step(10);
  if(variant==='B'){await ev(async()=>{const H=window.__ht;H.homeInit();for(let i=0;i<80;i++){if(H.enterHome())break;await new Promise(r=>setTimeout(r,250))}H.running=true;H.step(4)});
    log(variant,'mode',await ev(()=>window.__ht.mode));await ev(()=>{const H=window.__ht;H.exitHome();H.running=true;H.step(4)});log(variant,'mode',await ev(()=>window.__ht.mode))}
  await ev(()=>{const H=window.__ht;const d=HT.Base.def();H.P.pos.set(d.tank.x+8,0,d.tank.z+8);H.collide(H.P.pos,.35);H.P.yaw=Math.PI/4;H.P.pitch=-.1;H.step(1)});
  const res=[];let done=0;
  for(const n of[1,15,60,180]){const r=await ev(n=>{const H=window.__ht;for(let i=0;i<n;i++){H.step(1);H.ow.update(H.camera)}H.draw();
      const cam=H.camera.position,v=new THREE.Vector3();let near=0,ground=false;const shown=o=>{for(let a=o;a;a=a.parent)if(!a.visible)return false;return true};
      H.scene.traverse(o=>{if(!o.isMesh||!shown(o))return;if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();v.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);if(v.distanceTo(cam)<70)near++});
      const R=new THREE.Raycaster(cam.clone(),new THREE.Vector3(0,-1,0).add(new THREE.Vector3(Math.sin(-H.P.yaw)*.2,0,-Math.cos(H.P.yaw)*.2)).normalize(),0,60);const hits=[];H.scene.traverse(o=>{if(o.isMesh&&shown(o)&&o.material&&o.material.visible!==false)hits.push(o)});const h=R.intersectObjects(hits,false).find(q=>q.object.material&&!q.object.material.transparent);
      const s=H.ow.stats();return{updates:n,nearMeshes:near,groundHit:h?{d:+h.distance.toFixed(1),name:h.object.name||h.object.parent&&h.object.parent.name||'?'}:null,built:s.built,units:s.units,visible:s.visible}},n-done);done=n;
    res.push(r);log(variant,JSON.stringify(r));await W.shot('base-arrive-'+variant+'-'+n)}
  await W.b.close();return res};
(async()=>{const A=await run('A'),B=await run('B');
  ok(B[3].groundHit&&B[3].nearMeshes>=A[3].nearMeshes*.8,'after a visit home, Fort Sensible is drawn like on a fresh game within 3 s of arriving',{A:A[3],B:B[3]});
  ok(A[1].groundHit,'fresh game: ground under the camera 1 s after arriving at the motor pool',A[1]);
  /* W-12 regression: the first frame after the jump already stands on built ground (OW.update builds what is around an arrival) */
  ok(A[0].groundHit&&B[0].groundHit,'the first frame after the jump has ground under the camera (fresh game and after a visit home)',{A:A[0],B:B[0]});
  ok(A[0].nearMeshes>=A[3].nearMeshes*.8,'the first frame after the jump draws most of what is near ('+A[0].nearMeshes+' of '+A[3].nearMeshes+' meshes within 70 m)',A[0]);
  require('fs').writeFileSync(__dirname+'/base-arrive.out.txt',out.join('\n')+'\n')})().catch(e=>{console.error(e);process.exit(1)});
