/* perf audit: the dev/air-check.js 100 ft probes (Maple, base) + the openworld-ingame midBridge probe, with a per-group
   breakdown of draw calls (which top-level scene object / name each draw belongs to), so a regression can be attributed.
   node dev/audit/perf/air-probe.js [--places=maple,base] [--nobridge] [--json]
   Copy this file into a worktree of an older commit to bisect (it only needs dev/ai-ingame-lib.js there). Writes nothing to the repo. */
const path=require('path');
const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
const args=process.argv.slice(2);const arg=(k,d)=>{const a=args.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
const PLACES={maple:{x:120,z:70,from:[-1,-.55]},riverside:{x:400,z:70,from:[.15,-1]},base:{x:160,z:205,from:[1,-.15]}};
const want=arg('places','maple,base').split(',').filter(Boolean);
(async()=>{const {b,p,errs}=await lib.open({viewport:{width:1280,height:720}});const ev=(f,a)=>p.evaluate(f,a);
  await ev((DEEP)=>{
    /* per-object draw attribution: wrap renderBufferDirect */
    const R=window.__ht.renderer;const orig=R.renderBufferDirect.bind(R);window.__grp=null;window.__deep=DEEP;
    R.renderBufferDirect=function(cam,scene,geo,mat,obj,group){if(window.__grp){let o=obj,top=obj;while(o.parent&&o.parent.type!=='Scene'){o=o.parent}top=o;
        const chain=[];let q=obj.parent;while(q&&q.type!=='Scene'){if(q.name)chain.push(q.name);else if(q.userData&&Object.keys(q.userData).length)chain.push('{'+Object.keys(q.userData).slice(0,3).join(',')+'}');q=q.parent}
        const k=(window.__deep?chain.slice(0,3).reverse().join('/')+' > ':(top.name||top.type)+' > ')+(obj.name||obj.type)+(obj.isInstancedMesh?'[inst]':'')+(obj.isSkinnedMesh?'[skin]':'')+(window.__deep?' mat:'+(mat.name||mat.type)+' geo:'+(geo.type):'');window.__grp[k]=(window.__grp[k]||0)+1}
      return orig(cam,scene,geo,mat,obj,group)}},args.includes('--deep'));
  const res={};
  const hasJet=await ev(()=>!!(window.HT&&HT.Base&&HT.Jet));
  await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3)});
  if(hasJet&&want.length){
    await ev(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});await p.keyboard.press('e');await ev(()=>window.__ht.step(4));
    for(const name of want){const pl=PLACES[name],alt=30.5;
      res[name+'100']=await ev(([pl,alt,n])=>{const H=window.__ht,F=HT.Jet.F;const L=Math.hypot(pl.from[0],pl.from[1]),fx=pl.from[0]/L,fz=pl.from[1]/L;
        F.air=true;F.gear=0;F.gearK=0;F.spd=80;F.thr=.62;F.pos.set(pl.x+fx*240,alt,pl.z+fz*240);const yaw=Math.atan2(fz,-fx);F.q.setFromEuler(new THREE.Euler(0,yaw,0,'YZX'));
        for(let i=0;i<n;i++){H.step(1);H.ow.update(H.camera);F.pos.y=alt;F.q.setFromEuler(new THREE.Euler(0,yaw,0,'YZX'))}
        const R=H.renderer;H.draw();H.draw();R.info.autoReset=false;R.info.reset();window.__grp={};H.draw();const g=window.__grp;window.__grp=null;
        const calls=R.info.render.calls,tris=R.info.render.triangles;R.info.autoReset=true;
        const top=Object.entries(g).sort((a,b)=>b[1]-a[1]).slice(0,400);return{calls,tris,top}},[pl,alt,90])}
    await ev(()=>{const H=window.__ht;try{if(HT.Jet&&HT.Jet.exit)HT.Jet.exit()}catch(e){}H.enterHub();H.step(3)});
  }
  if(!args.includes('--nobridge')){
    res.midBridge=await ev(()=>{const H=window.__ht;let sun=null;H.scene.traverse(o=>{if(o.isDirectionalLight)sun=o});
      H.render.apply('med');H.ow.quality('med');H.ow.buildAll();H.dress(5);const x=294,z=43;if(H.VAN.on){H.VAN.spd=0;H.exitVan()}H.P.pos.set(x,0,z);H.step(2);
      const R=H.renderer,s=H.scene,c=H.camera;let w={main:0,shadow:0,tris:0,top:null};
      for(let h=0;h<4;h++){const a=h*Math.PI/2,fx=Math.sin(a),fz=Math.cos(a);c.position.set(x-fx*6,3.2,z-fz*6);c.lookAt(x+fx*20,1.5,z+fz*20);c.updateMatrixWorld();H.ow.update(c);H.ow.update(c);if(HT.World.update)HT.World.update(H.L,c.position);
        R.info.autoReset=false;R.info.reset();R.shadowMap.needsUpdate=true;R.setRenderTarget(null);R.render(s,c);const all=R.info.render.calls;
        sun.castShadow=false;R.info.reset();window.__grp={};R.render(s,c);const g=window.__grp;window.__grp=null;const main=R.info.render.calls,tris=R.info.render.triangles;sun.castShadow=true;R.info.autoReset=true;
        if(main>w.main)w={main,shadow:all-main,tris,heading:h,top:Object.entries(g).sort((a,b)=>b[1]-a[1]).slice(0,400)}}
      return w})}
  res.errors=errs.slice(0,10);
  if(args.includes('--json'))console.log(JSON.stringify(res));
  else for(const k in res){if(k==='errors'){console.log('errors',res.errors.length,res.errors.slice(0,3));continue}const r=res[k];
    console.log('==',k,'calls',r.calls||r.main,'shadow',r.shadow||'-','tris',r.tris,r.heading!=null?'heading '+r.heading:'');for(const [n,c] of r.top)console.log('   ',String(c).padStart(4),n)}
  await b.close()})();
