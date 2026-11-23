/* v2 SENSIBLE DRAGWAY (js/dragstrip.js): the family minivan, a solo pass driven with real keys (shared driving in _drag.js, the way
   dev/dragstrip-check.js drives it). One take, three set-ups:
     A: tight on the Christmas tree: ambers, green;
     B: low front quarter at the line, 7 m ahead: the launch, the van squats and comes at the lens;
     C: at the finish, under the timing board, as the van crosses the stripe and the board lights its ET and speed.
   The run between is simulated but not drawn (keep: 'page'). Golden hour. HUD: none. */
const D=require('./_drag.js');const st={i:0};
module.exports={frames:420,warm:0,keep:'page',
  async stage(s){const r=await D.toLine(s,/^Your /);console.log('  ',JSON.stringify(r));
    for(let n=0;n<600;n++){const q=await s.p.evaluate(()=>{const R=HT.Strip.state();return R.run&&R.run.phase});if(q&&q!=='roll')break;await s.p.evaluate(()=>{const H=window.__ht;H.step(1)})}
    const g=await s.p.evaluate(()=>{const H=window.__ht,d=HT.Strip.def(),e=H.CV;return{start:d.start,finish:d.finish,board:d.board,track:d.track,van:e&&[e.pos.x,e.pos.z,e.yaw],keys:Object.keys(d).slice(0,40)}});console.log('  geo',JSON.stringify(g));
    await s.p.evaluate(()=>{const H=window.__ht,R=window.__R,d=HT.Strip.def(),e=H.CV;R.golden({el:12,az:250,exp:1.05,far:420});R.cine(true);
      const f=[-Math.sin(e.yaw),-Math.cos(e.yaw)],rt=[-f[1],f[0]],v0=[e.pos.x,e.pos.z];
      const tree=[252.5,2.1,278];/* the tree (dev/dragstrip-check.js tree view looks at it from [256.8,1.7,281.2]) */
      let mode='A',sm=null,sl=null;window.__T.ev('A');
      window.__keepFn=i=>{if(mode!=='C')return i<150;return true};
      window.__camFn=cam=>{const i=window.__trFrame||0,S=HT.Strip.state(),run=S.run||{};let pos,look,fv;
        if(mode==='A'&&run.launched){mode='B';sm=null;window.__T.ev('B')}
        const bx=d.board?d.board.x:d.finish;if(mode==='B'&&Math.abs(e.pos.x-bx)<70&&i>150){mode='C';sm=null;window.__T.ev('C')}
        if(mode==='A'){pos=[tree[0]+2.6,tree[1]+.15,tree[2]+1.9];look=tree;fv=30}
        else if(mode==='B'){pos=[v0[0]+f[0]*15+rt[0]*-2.4,.45,v0[1]+f[1]*15+rt[1]*-2.4];look=[e.pos.x+f[0]*1.5,.85,e.pos.z+f[1]*1.5];fv=40}
        else{/* past the finish on the track's edge, looking back up the strip: the van comes at the lens under the board, its numbers lit */const b=d.board||{x:d.finish,z:v0[1]-10};pos=[b.x+f[0]*16+rt[0]*-3.0,1.0,v0[1]+f[1]*16+rt[1]*-3.0];look=[b.x-f[0]*6,2.6,(v0[1]*.7+b.z*.3)];fv=50}
        if(!sm){sm=pos.slice();sl=look.slice()}else for(let k=0;k<3;k++){sm[k]+=(pos[k]-sm[k])*.6;sl[k]+=(look[k]-sl[k])*.6}
        const sh=R.shake(i,mode==='A'?.004:.012);cam.position.set(sm[0]+sh[0],sm[1]+sh[1],sm[2]+sh[2]);cam.up.set(0,1,0);cam.lookAt(sl[0],sl[1],sl[2]);
        if(cam.fov!==fv){cam.fov=fv;cam.updateProjectionMatrix()}R.sunPlace([sl[0],0,sl[2]])}})},
  frameNode:async(s,i)=>{st.i=i;await D.drive(s,st);if(st.green===i&&!st.ev){st.ev=1;await s.p.evaluate(()=>window.__T.ev('green'))}}};
