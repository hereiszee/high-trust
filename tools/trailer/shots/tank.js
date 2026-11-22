/* Fort Sensible's tank (js/tank.js): boarded with a real E, the turret swings round with the mouse look and the main gun fires with a
   real left click down the empty apron (the gun refuses whenever a person is in the line of fire; nobody is). Chase camera, HUD on. */
const AIM=Math.PI/2+.25;
module.exports={frames:96,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.tank.x+2.6,0,d.tank.z);H.step(4)});
    await p.keyboard.press('e');
    const r=await p.evaluate(a=>{const H=window.__ht,P=H.P;for(let i=0;i<20;i++){H.step(1)}P.yaw=a-.75;P.pitch=-.22;H.step(80);HT.Tank.S.reload=0;return HT.Tank.state()},AIM);console.log('  ',JSON.stringify(r))},
  frame:i=>{const P=window.__ht.P,A=Math.PI/2+.25;if(i>=0&&i<30){const k=i/30,e=k*k*(3-2*k);P.yaw=A-.75+.75*e;P.pitch=-.22-.08*e}},
  frameNode:async(s,i)=>{if(i===36){await s.p.mouse.move(960,540);await s.p.mouse.down();await s.p.evaluate(()=>window.__T.ev('tank'))}if(i===38)await s.p.mouse.up()}};
