/* Sensible Dragway: the family minivan at the line. The first 45 frames are the game's own tree camera (HT.Strip.debugCam, the view
   dev/dragstrip-check.js uses for the tree shot): ambers, green; then the chase camera for the launch. Real keys throughout.
   In the edit this is two clips (tree / launch). */
const D=require('./_drag.js');const st={i:0};
module.exports={frames:150,warm:0,
  async stage(s){const r=await D.toLine(s,/^Your /);console.log('  ',JSON.stringify(r));
    /* roll in to the beams, then hold until the tree is about to start */
    for(let n=0;n<600;n++){const q=await s.p.evaluate(()=>{const R=HT.Strip.state();return R.run&&R.run.phase});if(q&&q!=='roll')break;await s.p.evaluate(()=>{const H=window.__ht;H.step(1)})}
    await s.p.evaluate(()=>{HT.Strip.debugCam={p:[256.8,1.7,281.2],l:[252.5,2.1,278],fov:46}})},
  frameNode:async(s,i)=>{st.i=i;if(i===45)await s.p.evaluate(()=>{HT.Strip.debugCam=null;window.__T.ev('cut')});const r=await D.drive(s,st);
    if(st.green===i)await s.p.evaluate(()=>window.__T.ev('green'))}};
