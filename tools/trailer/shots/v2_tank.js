/* v2 TANK: LAWN ORDER (js/tank.js) borrowed with a real E at Fort Sensible, then put on Maple Heights' delivery street at golden hour,
   rolling west down the street toward Linda's parked car (the car-damage API flattens it: "My CAR! My car is a PANCAKE!").
   Driven with W; the turret follows the dad's look yaw, so sweeping P.yaw traverses the turret toward the lens.
     A (frames 0..~75): low three-quarter front, lens 0.45 m off the asphalt, the hull coming at the lens, turret swinging round to it;
     B (from ~75): side-on at Linda's car, low, the treads climbing over it. Nobody is in or near the car. HUD: subtitles only. */
const Z=13.0;/* the tank's line: over Linda's car (parked at z 12.5) */
module.exports={frames:205,from:66,warm:2,
  async stage(s){const p=s.p;
    await p.evaluate(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.tank.x+2.6,0,d.tank.z);H.step(4)});
    await p.keyboard.press('e');
    const r=await p.evaluate(async Z=>{const H=window.__ht,P=H.P;for(let i=0;i<20;i++)H.step(1);const e=H.CV;if(!e||e.type!=='tank')return{err:'not in tank',cv:e&&e.type};
      const x=97,z=Z,yaw=Math.PI/2;/* nose west */
      e.pos.set(x,0,z);e.yaw=yaw;e.spd=0;if(e.car)Object.assign(e.car,{x,z,yaw,spd:0,steer:0,vdx:-Math.sin(yaw),vdz:-Math.cos(yaw)});P.yaw=yaw;P.pitch=-.1;
      for(let k=0;k<12;k++){H.step(5);await new Promise(r=>setTimeout(r,300))}
      const v=H.L.cars.find(q=>q.name==='Linda');window.__linda=v;
      /* staging: the parked car's push-collider is opened so the hull reaches it and the game's own crush (js/tank.js crush/flatten) fires,
         as it does when the tank meets a car side-on; it would otherwise stop nose-to-bumper */
      if(v&&v.col){v.col.x1=v.col.x0;v.col.z1=v.col.z0}
      return{tank:[e.pos.x,e.pos.z],linda:v&&[v.pos.x,v.pos.z,v.yaw],hood:H.hoodAt(e.pos.x)}},Z);
    console.log('  ',JSON.stringify(r));
    await p.evaluate(Z=>{const H=window.__ht,R=window.__R,e=H.CV,v=window.__linda;window.__tank=e;
      R.golden({el:13,az:235,exp:1.05});R.cine(true);
      let mode='A',sm=null,sl=null;
      window.__camFn=cam=>{const i=window.__trFrame||0;let pos,look,f;
        if(mode==='A'&&e.pos.x<64.5){mode='B';sm=null;window.__T.ev('camB')}
        if(mode==='A'){/* a fixed low spot down the street, ahead and to the tank's left (south kerb side), slow push toward it */
          const k=Math.min(1,i/130);pos=[55.5-k*.6,.42+k*.06,Z+3.7];look=[e.pos.x-2.5,1.45,e.pos.z-.2];f=31}
        else{
          /* ahead of the car on its kerb, low, looking back up the street: the car mid-frame, the tank comes in from the right and
             climbs over it toward the lens (it passes 3 m to camera-right) */
          const cx=v?v.pos.x:51;const k=Math.max(0,Math.min(1,(cx+7-e.pos.x)/12));pos=[cx-8.5,.5,9.4];look=[cx+2.2-k*4,1.1+k*.4,12.7];f=38}
        if(!sm){sm=pos.slice();sl=look.slice()}else{for(let k=0;k<3;k++){sm[k]+=(pos[k]-sm[k])*.3;sl[k]+=(look[k]-sl[k])*.3}}
        const sh=R.shake(i,mode==='A'?.012:.02);const rum=Math.abs(e.spd||0)>1?.006:0;
        cam.position.set(sm[0]+sh[0]+Math.sin(i*2.7)*rum,sm[1]+sh[1]+Math.sin(i*3.3)*rum,sm[2]+sh[2]);cam.up.set(0,1,0);cam.lookAt(sl[0],sl[1],sl[2]);
        if(cam.fov!==f){cam.fov=f;cam.updateProjectionMatrix()}R.sunPlace([e.pos.x-6,0,e.pos.z])}},Z)},
  frame:i=>{const H=window.__ht,e=window.__tank;H.keys.w=i>=2;if(e.pos.x<=64.5&&window.__bI==null)window.__bI=i;
    /* hold the line along the street */const dz=13.0-e.pos.z;H.keys.a=dz>.25;H.keys.d=dz<-.25;
    /* turret: ahead for a beat, then swing round toward the camera on the south kerb (left of the hull), then back ahead for the crush */
    /* the barrel comes round to point straight down the lens (camera A at x 55.3, z 16.7), then back ahead for the crush */
    const ahead=e.yaw,toCam=Math.atan2(-(55.3-e.pos.x),-(16.7-e.pos.z));let t;if(i<30)t=ahead;else if(e.pos.x>64.5)t=ahead+(toCam-ahead)*Math.min(1,(i-30)/60);else t=toCam+(ahead-toCam)*Math.min(1,(i-window.__bI)/25);
    H.P.yaw=t;H.P.pitch=-.12;
    if(HT.Tank.state().flat>=1&&!window.__fl){window.__fl=1;window.__T.ev('flat')}}};
