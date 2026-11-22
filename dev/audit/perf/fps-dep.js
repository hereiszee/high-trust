/* perf audit: is the simulation frame-rate dependent? Runs the same inputs for the same simulated time with __ht.step(n, dt) at
   dt = 1/30, 1/60, 1/144 (and 0.05, the frame() clamp), from the same start state, and compares:
   jump peak height and air time, on-foot distance in 3 s of W (+Shift), minivan speed and distance after 4 s of W, yaw change
   after 2 s of W+A, braking distance from that speed, pistol reload duration (time until the magazine is full),
   a job timer (M.elapsed after 10 s), mean speed of ambient traffic over 10 s, and a fire-rate check (rounds out in 2 s of fire).
   node dev/audit/perf/fps-dep.js */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
(async()=>{const {b,p,errs}=await lib.open();const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(10)});
  const DTS=[1/30,1/60,1/144,.05];const out={};
  for(const dt of DTS){const r=await ev(dt=>{const H=window.__ht,P=H.P,k=H.keys,V=H.VAN;const steps=s=>Math.round(s/dt);const run=(sec,f)=>{const n=steps(sec);for(let i=0;i<n;i++){if(f)f(i);H.step(1,dt)}};
      const res={};const clr=()=>{for(const x in k)k[x]=false};
      /* on foot at a fixed open spot */
      if(V.on){V.spd=0;H.exitVan()}clr();P.pos.set(39,0,20);P.yaw=0;P.pitch=0;H.step(1,dt);run(.5);
      let peak=0,air=0,y0=P.pos.y;k[' ']=true;H.step(1,dt);k[' ']=false;run(2,()=>{peak=Math.max(peak,P.pos.y-y0);if(!P.onGround)air+=dt});res.jumpPeak=+peak.toFixed(3);res.jumpAir=+air.toFixed(3);
      P.pos.set(39,0,20);P.yaw=-Math.PI/2;H.step(1,dt);run(.3);let x0=P.pos.x,z0=P.pos.z;k.w=true;run(3);k.w=false;res.walk3s=+Math.hypot(P.pos.x-x0,P.pos.z-z0).toFixed(2);
      P.pos.set(39,0,20);H.step(1,dt);run(.3);x0=P.pos.x;z0=P.pos.z;k.w=true;k.shift=true;run(3);clr();res.sprint3s=+Math.hypot(P.pos.x-x0,P.pos.z-z0).toFixed(2);
      /* reload: pistol, one round out of the mag, then reload */
      try{P.cur='pistol';const a=P.ammo.pistol;a.mag=1;a.res=50;H.step(1,dt);H.reload();let t=0;const full=()=>P.ammo.pistol.mag>1;while(!full()&&t<6){H.step(1,dt);t+=dt}res.reloadS=+t.toFixed(3)}catch(e){res.reloadS='err '+e.message}
      /* minivan on Route 9 (long straight) */
      clr();H.OWS.noTraffic=true;V.pos.set(200,0,41.5);V.yaw=-Math.PI/2;V.spd=0;if(V.car){V.car.spd=0;V.car.x=200;V.car.z=41.5;V.car.yaw=V.yaw}H.syncVan();if(!V.on)H.enterVan();if(V.car){V.car.spd=0}V.spd=0;H.step(1,dt);
      x0=V.pos.x;z0=V.pos.z;k.w=true;run(4);k.w=false;res.van4sSpeed=+Math.abs(V.spd).toFixed(2);res.van4sDist=+Math.hypot(V.pos.x-x0,V.pos.z-z0).toFixed(2);
      x0=V.pos.x;z0=V.pos.z;k.s=true;let bt=0;while(Math.abs(V.spd)>.3&&bt<8){H.step(1,dt);bt+=dt}k.s=false;res.brakeDist=+Math.hypot(V.pos.x-x0,V.pos.z-z0).toFixed(2);res.brakeS=+bt.toFixed(2);
      V.pos.set(200,0,41.5);V.yaw=-Math.PI/2;V.spd=0;if(V.car){V.car.spd=0;V.car.x=200;V.car.z=41.5;V.car.yaw=V.yaw}H.syncVan();H.step(1,dt);k.w=true;run(1.5);const yaw0=V.yaw;k.a=true;run(1.5);clr();res.vanTurnYaw=+(V.yaw-yaw0).toFixed(3);
      V.spd=0;if(V.car)V.car.spd=0;run(.5);
      /* traffic: mean speed over 10 s */
      H.OWS.noTraffic=false;run(3);let sum=0,n=0;run(10,i=>{if(i%5)return;for(const c of H.ow.trafficCars()){sum+=Math.abs(c.spd||0);n++}});res.trafficMeanSpd=n?+(sum/n).toFixed(2):null;H.OWS.noTraffic=true;
      V.spd=0;if(V.car)V.car.spd=0;H.exitVan();clr();return res},dt);
    out[(1/dt).toFixed(0)+'Hz']=r;console.log((1/dt).toFixed(0).padStart(3)+' Hz',JSON.stringify(r))}
  /* a job timer and fire rate: start job 0, 10 s at each dt */
  for(const dt of DTS){const r=await ev(async dt=>{const H=window.__ht,P=H.P,k=H.keys;H.startMissionWorld(0);for(let i=0;i<100&&H.mode!=='mission';i++)await new Promise(r=>setTimeout(r,100));
      const e0=H.M.elapsed;const n=Math.round(10/dt);for(let i=0;i<n;i++)H.step(1,dt);const el=H.M.elapsed-e0;
      let shots=null;try{P.cur='smg';if(P.ammo.smg){P.ammo.smg.mag=999;const m0=P.ammo.smg.mag;H.setJob&&0;for(let i=0;i<Math.round(2/dt);i++){H.fire&&H.fire();H.step(1,dt)}shots=m0-P.ammo.smg.mag}}catch(e){shots='err '+e.message}
      H.M.state='abandoned';H.enterHub();H.step(3);return{jobElapsed10s:+el.toFixed(3),smgShots2s:shots}},dt);console.log((1/dt).toFixed(0).padStart(3)+' Hz',JSON.stringify(r))}
  console.log('console errors',errs.length,errs.slice(0,5));await b.close()})();
