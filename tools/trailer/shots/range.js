/* Fort Sensible's range (js/range.js): the timed course with a rented rifle, pop-up targets knocked down one after another.
   Over the shoulder, HUD on (the course timer and score). Targets are aimed by the script, shots are real mouse clicks. */
module.exports={frames:105,warm:2,
  async stage(s){const p=s.p;
    /* the way dev/base-check.js does it: stand by Sgt. Pruitt, E to talk, E again to start the timed course (real key presses) */
    await p.evaluate(()=>{const H=window.__ht,o=HT.Base.def().range.officer;H.P.pos.set(o.x+1.6,0,o.z);H.collide(H.P.pos,.35);H.step(4)});
    await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(3));await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(3));
    const r=await p.evaluate(()=>{const H=window.__ht;let n=0;while(HT.Range.state().course&&HT.Range.state().course.state!=='run'&&n<600){H.step(1);n++}
      const S=HT.Range.S,c=S.course;for(let k=0;k<200&&!(c.stage&&c.stage.pause<=0&&c.stage.need.size);k++)H.step(1);
      return{n,st:HT.Range.state().course,P:[H.P.pos.x,H.P.pos.z],need:c.stage?c.stage.need.size:0}});console.log('  ',JSON.stringify(r))},
  /* aim at the nearest standing target, settle for 9 frames, fire */
  frame:i=>{const H=window.__ht,P=H.P,C=HT.Range.S&&HT.Range.S.course;window.__fire=false;const stg=C&&C.stage;
    if(!stg||C.state!=='run'||stg.pause>0||!stg.need.size)return;const t=[...stg.need][0];if(!t||!t.mesh)return;t.mesh.updateMatrixWorld();
    const v=new THREE.Vector3();t.mesh.getWorldPosition(v);const c=H.camera.position;
    const yaw=Math.atan2(-(v.x-c.x),-(v.z-c.z)),pitch=Math.atan2(v.y-c.y,Math.hypot(v.x-c.x,v.z-c.z));let dy=yaw-P.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));
    P.bloom=0;P.rDebt=0;P.yaw+=dy*.4;P.pitch+=(pitch-P.pitch)*.4;window.__aimT=Math.abs(dy)<.012?(window.__aimT||0)+1:0;if(window.__aimT>=4){window.__fire=true;window.__aimT=-5}},
  frameNode:async(s,i)=>{const f=await s.p.evaluate(()=>window.__fire);if(f){await s.p.mouse.move(960,540);await s.p.mouse.down();await s.p.evaluate(()=>window.__T.ev('shot_rifle'))}else await s.p.mouse.up()}};
