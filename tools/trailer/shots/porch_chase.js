/* Cold open + the mercy beat: Porch Light (js/jobs/porch.js). A porch pirate walks off with a parcel, the dad sprints after him,
   the pirate bolts ("You'll never take me alive! ...Wait, you can, I'm slow."), gets caught, gives up, and is zip-tied. HUD on. */
module.exports={frames:330,warm:6,
  async stage(s){const p=s.p;
    await p.evaluate(async()=>{const H=window.__ht,T=window.__T;T.unlock('porch');await T.castJob('porch');await T.cast(['dad_gary','dad_rick','dad_dave','dad_doug']);
      H.jobs.start('porch');H.step(4);T.flags()});
    /* the job's own bot sets the chair and sits until the first pirate has a parcel */
    const r=await p.evaluate(()=>{const H=window.__ht,a=H.jobs.api,j=H.jobs.registry.get('porch');let t=0;
      while(H.M&&H.M.state==='go'&&t<12000){const M=H.M;if(M.pir&&M.pir.some(q=>q.st==='brisk'))break;j.test.step(a,t++,{});H.P.hp=100;H.step(1)}
      window.__T.release();const M=H.M;return{t,st:M.pir.map(q=>q.st),stage:M.stage}});
    console.log('  bot:',JSON.stringify(r));
    await p.evaluate(()=>{const H=window.__ht,M=H.M,P=H.P,T=window.__T;const q=M.pir.find(q=>q.st==='brisk');window.__pir=q;
      /* let him get off the porch first (the porch's yellow parcel marker stays out of frame) */for(let k=0;k<75;k++){H.P.hp=100;H.step(1)}
      if(M.pc.sit){M.pc.sit=false;try{HT.People.force(P.dude,null)}catch(_){}}
      /* the dad 11 m behind him, on his line from the porch */
      const e=q.e,dx=e.pos.x-q.exit.x,dz=e.pos.z-q.exit.z,L=Math.hypot(dx,dz)||1;P.pos.set(e.pos.x+dx/L*11,0,e.pos.z+dz/L*11);H.collide(P.pos,.35);T.face(e.pos.x,e.pos.z);P.pitch=-.08;
      H.step(2)})},
  /* page-side, before each frame */
  frame:i=>{const H=window.__ht,P=H.P,q=window.__pir,e=q.e,k=H.keys,T=window.__T,d=Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z);
    if(window.__rnd){Math.random=window.__rnd;window.__rnd=null}
    if(i<18){k.w=true;k.shift=false;T.face(e.pos.x,e.pos.z);return}            /* a brisk walk after him, then the sprint */
    if(q.st==='brisk'||q.st==='run'){k.w=true;k.shift=true;const y=Math.atan2(-(e.pos.x-P.pos.x),-(e.pos.z-P.pos.z));P.yaw+=(y-P.yaw)*.25;
      if(q.st==='brisk'&&d<12.2){window.__rnd=Math.random;Math.random=()=>.99}/* the funny line */return}
    if(e.state==='surrender'){window.__caught=window.__caught||i;k.shift=false;k.w=d>1.9;T.face(e.pos.x,e.pos.z);if(i-window.__caught===40)H.use=true;return}
    T.release()}};
