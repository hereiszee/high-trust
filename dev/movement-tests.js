module.exports=[
{key:'jump',async run(p,ok,shot){
  const r=await p.evaluate(()=>{const H=__ht;H.startMission(0);M_.calm();H.P.fp=false;
    /* open floor: a spot with nothing within 3 m */
    const L=H.L;let s=null;for(let z=3;z<L.H-3&&!s;z++)for(let x=3;x<L.W-3&&!s;x++){const X=x*2+1,Z=z*2+1;if(!H.solidAt(X,Z,3,0))s={x:X,z:Z}}
    M_.place(s.x,s.z);H.jump();const tr=M_.run(80);const air=tr.filter(t=>t[3]==='a').length/60;const apex=Math.max(...tr.map(t=>t[1]));
    /* coyote: walk off a crate, jump 0.06 s after leaving it */
    return{apex:+apex.toFixed(3),air:+air.toFixed(3),spot:s}});
  ok('jump apex 1.0-1.1 m',r.apex>=1&&r.apex<=1.1,r.apex);ok('airtime ~0.6 s',r.air>.55&&r.air<.68,r.air);
  const c=await p.evaluate(()=>{const H=__ht,P=H.P;const L=H.L;
    /* coyote: step off a ledge, press jump 0.07 s later */
    const crate=M_.tiles('c').map(t=>M_.col(t.x,t.z)).find(c=>c&&M_.approach(c).length);const cx=(crate.x0+crate.x1)/2,cz=(crate.z0+crate.z1)/2;
    const o=M_.approach(crate)[0];M_.place(cx,cz,1.15);M_.face(-o.dx,-o.dz);H.keys.w=true;let left=-1,jumped=false;
    for(let i=0;i<90;i++){M_.god();H.step(1,1/60);if(left<0&&!P.onGround){left=i}if(left>=0&&i===left+4){H.jump()}if(left>=0&&i>left+4&&P.vy>3)jumped=true}
    H.keys.w=false;
    /* buffer: press jump 0.1 s before touching down */
    M_.place(o.x,o.z);H.jump();let buf=false,pressed=-1;for(let i=0;i<120;i++){H.step(1,1/60);if(pressed<0&&!P.onGround&&P.vy<0&&P.pos.y<P.vy*-0.1+0.0){}
      if(pressed<0&&!P.onGround&&P.vy<0&&P.pos.y<1.0*0.25){pressed=i;H.jump()}if(pressed>=0&&i>pressed&&P.vy>4){buf=i-pressed;break}}
    /* crouched jump: stands, then hops */
    M_.place(o.x,o.z);P.crouch=true;H.jump();let cj=null;for(let i=0;i<40;i++){H.step(1,1/60);if(!P.onGround&&cj===null)cj={i,crouch:P.crouch}}
    return{coyote:jumped,buf,cj}});
  ok('coyote time: jump just after walking off a crate',c.coyote,c);ok('jump buffer: early press jumps on landing',c.buf>0&&c.buf<10,c.buf);ok('crouch + jump stands up then hops',c.cj&&!c.cj.crouch&&c.cj.i>=6,c.cj);
}},
];
