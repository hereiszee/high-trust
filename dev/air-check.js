/* Fort Sensible: how the world looks and costs from the jet. node dev/air-check.js [tag] [--frames=N]
   Boards DAD-1 (E), puts it in the air 240 m short of each place, heading for it, and flies ~3 s (the game's own streaming runs
   every frame), holding the altitude. Then one warm frame is timed. Places: Maple Heights (home), Riverside (Main St), the base.
   Altitudes: 100 / 300 / 800 ft, and a 60 ft pass down our own street past the house. Prints draw calls, triangles, frame ms, built units; jpgs to docs/screenshots/base/air-check/. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const args=process.argv.slice(2),TAG=(args.find(a=>!a.startsWith('--'))||'now'),FR=+((args.find(a=>a.startsWith('--frames='))||'').split('=')[1]||90);
const OUT=path.join(__dirname,'../docs/screenshots/base/air-check');fs.mkdirSync(OUT,{recursive:true});
/* each approach looks across the place (not out of the map): from = the side the jet comes in from */
const PLACES={maple:{x:120,z:70,from:[-1,-.55]},riverside:{x:400,z:70,from:[.15,-1]},base:{x:160,z:205,from:[1,-.15]},street:{x:39,z:14,from:[1,0],ft:[60]},across:{x:330,z:70,from:[1,.05],ft:[100]}};/* across: from Riverside looking west over the whole town (Maple is past the 100 ft draw radius: the painted ground map) */
const FT={100:30.5,300:91.4,800:243.8};
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3)});
  await ev(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});await p.keyboard.press('e');await ev(()=>window.__ht.step(4));
  const rows=[];
  for(const name in PLACES)for(const ft of (PLACES[name].ft||Object.keys(FT))){const pl=PLACES[name],alt=FT[ft]||ft*.3048;
    const r=await ev(([pl,alt,n])=>{const H=window.__ht,F=HT.Jet.F;const L=Math.hypot(pl.from[0],pl.from[1]),fx=pl.from[0]/L,fz=pl.from[1]/L;
      const sx=pl.x+fx*240,sz=pl.z+fz*240;F.air=true;F.gear=0;F.gearK=0;F.spd=80;F.thr=.62;F.pos.set(sx,alt,sz);
      /* heading toward the place: the jet's nose is +x in its own frame */const yaw=Math.atan2(fz,-fx);F.q.setFromEuler(new THREE.Euler(0,yaw,0,'YZX'));
      const t0=performance.now();let worst=0;for(let i=0;i<n;i++){const s=performance.now();H.step(1);H.ow.update(H.camera);F.pos.y=alt;F.q.setFromEuler(new THREE.Euler(0,yaw,0,'YZX'));worst=Math.max(worst,performance.now()-s)}
      const R=H.renderer;H.draw();const s1=performance.now();H.draw();const ms=performance.now()-s1;R.info.autoReset=false;R.info.reset();H.draw();const calls=R.info.render.calls,tris=R.info.render.triangles;R.info.autoReset=true;
      const us=HT.OpenWorld.units(),near=us.filter(u=>{const c=H.camera.position;const dx=Math.max(u.box.x0-c.x,0,c.x-u.box.x1),dz=Math.max(u.box.z0-c.z,0,c.z-u.box.z1);return Math.hypot(dx,dz)<300});
      return{calls,tris,drawMs:+ms.toFixed(1),worstStepMs:+worst.toFixed(1),flyMs:Math.round(performance.now()-t0),built:us.filter(u=>u.ready).length,units:us.length,near300:near.length,nearBuilt:near.filter(u=>u.ready).length,at:[Math.round(F.pos.x),Math.round(F.pos.z)]}},[pl,alt,FR]);
    const f=name+'-'+ft+'ft-'+TAG+'.jpg';await p.screenshot({path:path.join(OUT,f),type:'jpeg',quality:80});
    const line=name.padEnd(10)+String(ft).padStart(4)+' ft  '+JSON.stringify(r);console.log(line);rows.push(line)}
  fs.writeFileSync(path.join(OUT,'numbers-'+TAG+'.txt'),rows.join('\n')+'\n');
  console.log(errs.length?'CONSOLE ERRORS:\n'+errs.slice(0,8).join('\n'):'no console errors');await b.close()})();
