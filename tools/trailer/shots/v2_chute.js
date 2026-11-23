/* v2 EJECT AND LAND: DAD-1 slow and low over Maple Heights; E twice (real key presses): the seat fires, the canopy opens and the parachute
   "steers itself home" (js/jet.js chuteTick: it drifts to land beside his car). Two set-ups from one take:
     A: from below, 14 m under him, looking up against the evening sky as the canopy blooms;
     B: on the ground beside the minivan, low, as he comes down the last metres and lands next to it.
   The minutes of drifting in between are simulated but not drawn (keep: 'page'). HUD: subtitles only
   (Tower: "DAD-1 has ejected. Repeat: DAD-1 is enjoying the parachute."). */
module.exports={frames:150,from:60,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});
    await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(4));
    await p.evaluate(()=>{const H=window.__ht,F=HT.Jet.F,h=H.L.start;F.air=true;F.gear=0;F.gearK=0;F.spd=55;F.thr=.5;F.pos.set(h.x-30,62,h.z-90);F.q.setFromEuler(new THREE.Euler(0,-Math.PI/2*0.9,0,'YZX'));
      for(let i=0;i<45;i++){H.step(1);H.ow.update(H.camera,1/30);F.pos.y=62}});
    await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(2));
    await p.evaluate(()=>{const H=window.__ht,R=window.__R,F=HT.Jet.F;R.golden({el:12,az:215,exp:1.05,far:420});R.cine(true);R.jetClean();
      let mode='A',sl=null,sm=null;window.__mode=()=>mode;
      window.__keepFn=i=>{const c=F.chute;if(i<100)return true;if(!c)return window.__landed!=null&&i<window.__landed+40;return c.p.y<16};
      window.__camFn=cam=>{const i=window.__trFrame||0,c=F.chute,P=H.P;let pos,look,f;
        if(c&&c.p.y<16&&mode==='A'){mode='B';sm=null;window.__T.ev('camB')}
        if(!c&&mode==='B'&&window.__landed==null){window.__landed=i;window.__T.ev('landed')}
        if(mode==='A'){if(!c){/* before the seat fires: under the jet */pos=[F.pos.x+5,F.pos.y-16,F.pos.z+3];look=[F.pos.x,F.pos.y,F.pos.z];f=46}
          else{const k=Math.min(1,c.t/1.6);pos=[c.p.x+3.2-k*.8,c.p.y-12+k*4.5,c.p.z+2.6-k*.6];look=[c.p.x,c.p.y+1.6+k*.8,c.p.z];f=48}}
        else{/* by the van: 6 m off his landing spot, low */const d=c?(c.drop||{x:c.p.x,z:c.p.z}):{x:P.pos.x,z:P.pos.z};if(!window.__lc)window.__lc=[d.x+5.5,.7,d.z-4];
          const q=c?c.p:{x:P.pos.x,y:1,z:P.pos.z};pos=window.__lc;look=[q.x,Math.max(1.2,q.y+(c?1.5:0)),q.z];f=40}
        if(!sm){sm=pos.slice();sl=look.slice()}else for(let k=0;k<3;k++){sm[k]+=(pos[k]-sm[k])*(mode==='A'?.7:.3);sl[k]+=(look[k]-sl[k])*.5}
        const sh=R.shake(i,.02);cam.position.set(sm[0]+sh[0],sm[1]+sh[1],sm[2]+sh[2]);cam.up.set(0,1,0);cam.lookAt(sl[0],sl[1],sl[2]);
        if(cam.fov!==f){cam.fov=f;cam.updateProjectionMatrix()}if(P.dude)P.dude.root.visible=true;R.sunPlace([sl[0],0,sl[2]])}})},
  frameNode:async(s,i)=>{if(i===8){await s.p.keyboard.press('e');await s.p.evaluate(()=>window.__T.ev('eject'))}},
  frame:i=>{const H=window.__ht;if(H.P.hp<100)H.P.hp=100;const F=HT.Jet.F;if(!F.chute&&i<8)F.pos.y=62}};
