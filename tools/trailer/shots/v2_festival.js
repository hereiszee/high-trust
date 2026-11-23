/* v2 RELEASE: "Everybody Waves" (js/jobs/finale.js, _finale-fest.js), from a finished campaign save (dev/jobs/finale-saves.js 'clean'):
   the Riverside street festival, the speech, then the wave. v1 used the game's own crane from its first frame. v2 starts CLOSE on the
   front row's faces (family and crew waving, 3 m away, at eye level) and hands over to the game's own crane as it rises over the street:
   the camera is blended from the close set-up into the crane's pose (position lerp, orientation slerp) over frames 40..95.
   HUD: the game's own banner ("Everybody waves."), as v1. */
const setupSave=require('../../../dev/jobs/finale-saves.js');
module.exports={frames:240,warm:2,keepBanner:true,
  async stage(s){const p=s.p;const st=await p.evaluate(setupSave,'clean');console.log('  save',JSON.stringify(st));
    await p.evaluate(async()=>{window.__T.flags();await window.HT.Finale.preloadCast()});
    const r=await p.evaluate(()=>{const H=window.__ht,FN=window.HT.Finale,T=window.__T;H.jobs.start('finale');H.step(4);T.flags();const M=H.M;M.fn.plan=window.HT.Plan.auto(FN.PLAN_DEF,{});FN.advance(M,'festival');
      for(let i=0;i<10;i++)H.step(1);
      for(let i=0;i<150;i++)H.step(1);
      M.fn.sub.talked=6;H.step(2);H.P.pos.set(FN.W.stage.x+2.2,0,FN.W.stage.z+.6);H.step(1);H.jobs.api.useTap=true;H.step(2);
      return{ph:M.fn.sub.ph,ch:!!M.fn.sub.ch,n:(FN.live||[]).length}});console.log('  ',JSON.stringify(r))},
  async after(s){
    /* the game's banner would sit across the faces in the close set-up: the edit puts the same line up as a card once the crane is up */
    await s.p.evaluate(()=>window.__T.hide('.ht-bn'));
    await s.p.evaluate(()=>{const M=window.__ht.M;window.__pickNow=()=>{if(M.fn.sub.ch)M.fn.sub.ch.pick(0)}});
    await s.p.evaluate(()=>{const H=window.__ht,THREE=window.THREE;let close=null;const q0=new THREE.Quaternion(),q1=new THREE.Quaternion(),m=new THREE.Matrix4();
      window.__camFn=cam=>{const i=window.__trFrame||0;
        /* the game's crane pose this frame (it has just placed the camera) */const cp=cam.position.clone(),cq=cam.quaternion.clone(),cf=cam.fov;
        if(!close){/* the close set-up, fixed at the first frame: along the crane's view to 3 m short of the nearest waver in front of it, at eye level */
          const dir=new THREE.Vector3(0,0,-1).applyQuaternion(cq);let best=null;
          H.scene.traverse(o=>{if(!o.isSkinnedMesh||!o.visible)return;const w=o.getWorldPosition(new THREE.Vector3());const v=w.clone().sub(cp);const al=v.dot(dir);if(al<3)return;const off=v.clone().addScaledVector(dir,-al).setY(0).length();if(off<4&&(!best||al<best))best=al});
          const d=Math.max(0,(best||12)-4.4);const pos=cp.clone().addScaledVector(dir.clone().setY(0).normalize(),d);pos.y=1.65;
          const look=pos.clone().add(dir.clone().setY(0).normalize().multiplyScalar(5));look.y=1.5;m.lookAt(pos,look,new THREE.Vector3(0,1,0));q0.setFromRotationMatrix(m);close={pos,q:q0.clone(),fov:38,d}}
        const t=Math.max(0,Math.min(1,(i-30)/60)),k=t*t*(3-2*t);
        cam.position.lerpVectors(close.pos,cp,k);cam.quaternion.copy(close.q).slerp(cq,k);/* a slow push while close */if(k===0)cam.position.addScaledVector(new THREE.Vector3(0,0,-1).applyQuaternion(close.q),i*.012);
        const f=close.fov+(cf-close.fov)*k;if(Math.abs(cam.fov-f)>1e-3){cam.fov=f;cam.updateProjectionMatrix()}}})},
  frame:i=>{if(window.__pickNow){window.__pickNow();window.__pickNow=null;window.__T.ev('wave')}}};
