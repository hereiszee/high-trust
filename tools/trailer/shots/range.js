/* Fort Sensible's range (js/range.js): the timed course with a rented rifle, pop-up targets knocked down one after another.
   Over the shoulder, HUD on (the course timer and score). Targets are aimed by the script, shots are real mouse clicks. */
module.exports={frames:105,warm:2,
  async stage(s){const p=s.p;
    const r=await p.evaluate(async()=>{const H=window.__ht,d=HT.Base.def(),R=d.range;H.P.pos.set(R.line?R.line.x:R.officer.x,0,R.line?R.line.z:R.officer.z);H.step(4);
      try{H.give&&H.give('rifle');H.swap&&H.swap('rifle')}catch(e){}H.step(10);HT.Range.start();H.step(10);
      let n=0;while(HT.Range.state().course&&HT.Range.state().course.state==='count'&&n<400){H.step(1);n++}
      return{st:HT.Range.state(),def:Object.keys(R),line:R.line,P:[H.P.pos.x,H.P.pos.z]}});console.log('  ',JSON.stringify(r).slice(0,500))},
  /* aim at the nearest standing target, settle for 9 frames, fire */
  frame:i=>{const H=window.__ht,P=H.P,C=HT.Range.S&&HT.Range.S.course;const st=C&&C.stage&&C.stage.need||[];window.__fire=false;
    const t=st.find(q=>q&&q.mesh&&!q.down&&!q.hit&&q.mesh.visible!==false);if(!t)return;const v=new THREE.Vector3();t.mesh.getWorldPosition(v);const c=H.camera.position;
    const yaw=Math.atan2(-(v.x-c.x),-(v.z-c.z)),pitch=Math.atan2(v.y+.15-c.y,Math.hypot(v.x-c.x,v.z-c.z));let dy=yaw-P.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));
    P.yaw+=dy*.35;P.pitch+=(pitch-P.pitch)*.35;P.aim=true;window.__aimT=Math.abs(dy)<.01?(window.__aimT||0)+1:0;if(window.__aimT>=6){window.__fire=true;window.__aimT=-6}},
  frameNode:async(s,i)=>{const f=await s.p.evaluate(()=>window.__fire);if(f){await s.p.mouse.move(960,540);await s.p.mouse.down();await s.p.evaluate(()=>window.__T.ev('shot_rifle'))}else await s.p.mouse.up()}};
