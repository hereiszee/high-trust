/* day is restored exactly: node dev/night-dayexact.js. Renders the street with grain off and the clock frozen, runs a night with the
   flashlight and goggles on, comes back to day and compares every pixel (0 differing pixels expected on High and Low). */
const {open}=require('./ai-ingame-lib.js');
(async()=>{const {b,p,errs}=await open({viewport:{width:640,height:360}});
  const r=await p.evaluate(async()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(2);
    const v=H.L.vanStart;H.P.pos.set(v.x,0,v.z);H.P.yaw=-Math.PI/2+.35;H.step(4);H.ow.buildAll();H.step(2);
    const T0=performance.now();performance.now=()=>T0;Date.now=()=>1e12;const out={};const gl=H.renderer.getContext();
    for(const q of['high','low']){H.render.apply(q);const G=H.render.mats.grade;if(G)G.uniforms.grain.value=0;
      const snap=()=>{H.render.draw();const px=new Uint8Array(4*640*360);gl.readPixels(0,0,640,360,gl.RGBA,gl.UNSIGNED_BYTE,px);return px};
      const a=snap();const a2=snap();let n0=0;for(let i=0;i<a.length;i++)if(a[i]!==a2[i])n0++;out[q+'ctl']=n0;H.setNight(1);H.flash(true);H.giveNvg();H.nvg(true);snap();H.nvg(false);H.flash(false);H.setNight(0);const c=snap();
      let n=0,mx=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-c[i]);if(d){n++;mx=Math.max(mx,d)}}out[q]={diffPx:n,max:mx,exp:H.renderer.toneMappingExposure}}
    return out});
  console.log(JSON.stringify(r));console.log(errs);await b.close()})();
