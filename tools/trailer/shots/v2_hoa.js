/* v2 STINGER (G, HUD on): the morning after the tank. The save remembers that LAWN ORDER was driven on Maple (js/tank.js sets
   save.hoaTank), so when the dad walks up his front path the game hands him a letter (js/tank.js letter()): "LETTER FROM THE MAPLE
   HEIGHTS HOA · RE: The Tank · Dear Resident, ... Bylaw 14(c)" and his line "There's a letter from the HOA. About the tank. They said
   it's very nice." The flag is set directly here (the tank shot is a separate take). */
module.exports={frames:150,warm:4,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T,h=H.L.start;T.flags();
      const sv0=H.save;if(sv0){sv0.base=sv0.base||{};sv0.base.hoaTank=true}const sv=sv0&&sv0.base;
      const P=H.P;P.pos.set(h.x+3,0,h.z-9);H.collide(P.pos,.35);P.yaw=Math.atan2(-(h.x-P.pos.x),-(h.z-P.pos.z));P.pitch=-.1;H.step(4);
      for(let k=0;k<8;k++){H.step(3);await new Promise(r=>setTimeout(r,300))}
      return{P:[P.pos.x,P.pos.z],h,flag:!!(sv&&sv.hoaTank)}});console.log('  ',JSON.stringify(r));
    await s.p.evaluate(()=>{const R=window.__R;R.golden({el:16,az:220,exp:1.05,hemi:.6})})},
  async after(s){await s.p.evaluate(()=>window.__R.subBig())},
  frame:i=>{const H=window.__ht,P=H.P,h=H.L.start;const d=Math.hypot(h.x-P.pos.x,h.z-P.pos.z);H.keys.w=d>4;P.yaw=Math.atan2(-(h.x-P.pos.x),-(h.z-P.pos.z));
    if(document.querySelector('.ht-hoa')&&!window.__l){window.__l=1;window.__T.ev('letter')}}};
