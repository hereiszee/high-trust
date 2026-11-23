/* v2 HOOK: Porch Light (js/jobs/porch.js), the same real chase as porch_chase.js, shot with the free camera at golden hour.
   One take, three camera set-ups switched on the action (the edit cuts between them):
     A (until the dad is ~6 m behind): low, 3.6 m in FRONT of the fleeing pirate, tracking backwards with him, dad sprinting in behind;
     B (closing): side-on at hip height, long lens, the dad closing the gap left to right;
     C (caught): low two-shot, hands up, the dad walks in and zip-ties him (+TRUST).
   HUD: subtitles and the trust pop only (the rest of the HUD hidden: it's a cinematic angle of real play). */
module.exports={frames:175,warm:6,
  async stage(s){const p=s.p;
    await p.evaluate(async()=>{const H=window.__ht,T=window.__T;T.unlock('porch');await T.castJob('porch');await T.cast(['dad_gary','dad_rick','dad_dave','dad_doug']);
      H.jobs.start('porch');H.step(4);T.flags()});
    const r=await p.evaluate(()=>{const H=window.__ht,a=H.jobs.api,j=H.jobs.registry.get('porch');let t=0;
      while(H.M&&H.M.state==='go'&&t<12000){const M=H.M;if(M.pir&&M.pir.some(q=>q.st==='brisk'))break;j.test.step(a,t++,{});H.P.hp=100;H.step(1)}
      window.__T.release();const M=H.M;return{t,st:M.pir.map(q=>q.st),stage:M.stage}});
    console.log('  bot:',JSON.stringify(r));
    const st=await p.evaluate(()=>{const H=window.__ht,M=H.M,P=H.P,T=window.__T;const q=M.pir.find(q=>q.st==='brisk');window.__pir=q;
      for(let k=0;k<150;k++){H.P.hp=100;H.step(1)}q.from={x:q.e.pos.x,z:q.e.pos.z};
      if(M.pc.sit){M.pc.sit=false;try{HT.People.force(P.dude,null)}catch(_){}}
      const e=q.e,dx=e.pos.x-q.exit.x,dz=e.pos.z-q.exit.z,L=Math.hypot(dx,dz)||1;P.pos.set(e.pos.x+dx/L*11,0,e.pos.z+dz/L*11);H.collide(P.pos,.35);T.face(e.pos.x,e.pos.z);P.pitch=-.08;
      H.step(2);
      /* every top-level HUD node, for the cine HUD filter */
      const tops=[...document.body.children].filter(n=>n.tagName!=='CANVAS'&&n.tagName!=='SCRIPT').map(n=>(n.id?'#'+n.id:'')+(n.className&&typeof n.className==='string'?'.'+n.className.split(' ').join('.'):'')+':'+n.tagName);
      return{e:[e.pos.x,e.pos.z],exit:q.exit,P:[P.pos.x,P.pos.z],tops}});
    console.log('  staged',JSON.stringify(st));
    await p.evaluate(()=>{const H=window.__ht,R=window.__R,q=window.__pir,e=q.e,P=H.P;
      R.golden({el:14,az:250,exp:1.05});R.cine(true);
      /* a smoothed heading of the pirate (the direction he runs), so the camera ahead of him doesn't swing with his stride */
      let hx=null,hz=null,lx=e.pos.x,lz=e.pos.z;const head=()=>{const dx=e.pos.x-lx,dz=e.pos.z-lz;lx=e.pos.x;lz=e.pos.z;const L=Math.hypot(dx,dz);
        if(L>.01){const nx=dx/L,nz=dz/L;if(hx==null){hx=nx;hz=nz}else{hx+=(nx-hx)*.08;hz+=(nz-hz)*.08;const m=Math.hypot(hx,hz);hx/=m;hz/=m}}
        if(hx==null){const ux=e.pos.x-P.pos.x,uz=e.pos.z-P.pos.z,m=Math.hypot(ux,uz)||1;hx=ux/m;hz=uz/m}return[hx,hz]};
      window.__head=head;
      let mode='A',sm=null,sl=null,fov=34;window.__mode=()=>mode;
      window.__camFn=cam=>{const i=window.__trFrame||0;const[hx,hz]=head();const rx=-hz,rz=hx;/* right of his heading */
        const d=Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z);
        if(mode==='A'&&(d<5.5||e.state==='surrender')){mode='B';sm=null;window.__T.ev('camB')}
        if(mode==='B'&&e.state==='surrender'&&window.__caught&&i-window.__caught>=2){mode='C';sm=null;window.__T.ev('camC')}
        let pos,look,f;
        if(mode==='A'){/* in front of him, a little to his right, knee height, looking back up the street past him at the dad */
          pos=[e.pos.x+hx*3.8+rx*.9,.62,e.pos.z+hz*3.8+rz*.9];look=[(e.pos.x*.75+P.pos.x*.25),1.25,(e.pos.z*.75+P.pos.z*.25)];f=40}
        else if(mode==='B'){/* side-on, 6 m off whichever side is clear (the street side), long lens, framing both */const mx=(e.pos.x+P.pos.x)/2,mz=(e.pos.z+P.pos.z)/2;
          /* the street side, 3.8 m out: inside the parked cars on the far kerb */
          if(window.__sideB==null){const c=s=>R.clear([mx,1.1,mz],[mx+rx*3.8*s,1.0,mz+rz*3.8*s],.5)&&R.clear([e.pos.x,1.1,e.pos.z],[mx+rx*3.8*s+hx*4,1.0,mz+rz*3.8*s+hz*4],.5);window.__sideB=c(1)?1:c(-1)?-1:1}
          const sd=window.__sideB;pos=[mx+rx*3.8*sd+hx*1.0,1.05,mz+rz*3.8*sd+hz*1.0];look=[mx+hx*.5,1.1,mz+hz*.5];f=44}
        else{/* two-shot from low, 3.2 m, the pirate hands-up camera-left, the dad stepping in */const mx=(e.pos.x+P.pos.x)/2,mz=(e.pos.z+P.pos.z)/2,ux=P.pos.x-e.pos.x,uz=P.pos.z-e.pos.z,m=Math.hypot(ux,uz)||1;
          let sx=-uz/m,sz=ux/m;if(window.__sideC==null){window.__sideC=R.clear([mx,1,mz],[mx+sx*3.2,.85,mz+sz*3.2],.4)?1:-1}sx*=window.__sideC;sz*=window.__sideC;
          pos=[mx+sx*2.9,.85,mz+sz*2.9];look=[mx,1.1,mz];f=44}
        if(!sm){sm=pos.slice();sl=look.slice()}else{for(let k=0;k<3;k++){sm[k]+=(pos[k]-sm[k])*.35;sl[k]+=(look[k]-sl[k])*.35}}
        const sh=R.shake(i,.03);cam.position.set(sm[0]+sh[0],sm[1]+sh[1],sm[2]+sh[2]);cam.up.set(0,1,0);cam.lookAt(sl[0],sl[1],sl[2]);
        if(cam.fov!==f){cam.fov=f;cam.updateProjectionMatrix()}
        R.sunPlace([e.pos.x,0,e.pos.z]);if(P.dude)P.dude.root.visible=true}})},
  frame:i=>{const H=window.__ht,P=H.P,q=window.__pir,e=q.e,k=H.keys,T=window.__T,d=Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z);
    if(window.__rnd){Math.random=window.__rnd;window.__rnd=null}
    if(i===0){const prev=window.__trEv.length;}
    if(i<14){k.w=true;k.shift=false;T.face(e.pos.x,e.pos.z);return}
    if(q.st==='run'&&e.script&&e.script.speed>3.9)e.script.speed=3.9;
    if(q.st==='brisk'||q.st==='run'){k.w=true;k.shift=true;const y=Math.atan2(-(e.pos.x-P.pos.x),-(e.pos.z-P.pos.z));P.yaw+=(y-P.yaw)*.25;
      if(q.st==='brisk'&&d<12.2){window.__rnd=Math.random;Math.random=()=>.99;T.ev('bolt')}return}
    if(e.state==='surrender'){if(!window.__caught){window.__caught=i;T.ev('caught')}k.shift=false;k.w=d>1.9;T.face(e.pos.x,e.pos.z);if(i-window.__caught===40){H.use=true;T.ev('ziptie')}return}
    T.release()}};
