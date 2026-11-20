/* Screenshots of the SPEC3 small sites in the real game: node dev/sites-shots.js [filter] [--q=high]
   -> docs/screenshots/jobs-framework/site-<id>.jpg. Headless Chromium + SwiftShader, driven through window.__ht.
   Each shot stands the (hidden) dad at the site so streaming and the sun's shadow box follow, then renders from a fixed camera. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'../docs/screenshots/jobs-framework');fs.mkdirSync(OUT,{recursive:true});
const args=process.argv.slice(2),filter=args.find(a=>!a.startsWith('--'))||'',Q=(args.find(a=>a.startsWith('--q='))||'--q=high').slice(4);
/* name: [camera position, look-at] in metres */
const SHOTS={
  school:[[162,7.5,17],[141,2.2,4]],
  'school-rack':[[134,2.6,13.5],[127,.9,5]],
  walnut:[[109,3.6,61],[118,1.4,53]],
  storage:[[192,17,170],[238,0,144]],
  'storage-doors':[[246,3,148],[262,1.5,140]],
  parkride:[[246,15,98],[268,0,70]],
  pawn:[[366,3.6,44],[358,2.6,36]],
  millshop:[[444,13,92],[427,1,112]],
  market:[[344,7.5,43],[392,0,43]],
  roof:[[454,9.5,68],[432,5,54]],
  ladder:[[446,4,50],[438,4,55]],
  ortho:[[226,4.2,30],[215,2.6,8]],
  bus:[[331,2.6,44],[321,1.6,39]],
  potholes:[[226,5,52],[244,0,43]],
};
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});
  await p.evaluate(async q=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(2);H.render.apply(q);H.ow.quality(q);H.openBridge();H.ow.buildAll();
    for(let i=0;i<60&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500));
    /* hide the HUD: everything in the body but the game canvas */
    const cv=H.renderer.domElement;for(const el of document.body.querySelectorAll('*'))if(el!==cv&&!el.contains(cv)&&el.style)el.style.visibility='hidden';cv.style.visibility='visible'},Q);
  const stats={};
  for(const name in SHOTS){if(filter&&!name.includes(filter))continue;const[c,t]=SHOTS[name];
    const info=await p.evaluate(([c,t])=>{const H=window.__ht,P=H.P,cam=H.camera,R=H.renderer;if(H.VAN.on){H.VAN.spd=0;H.exitVan&&H.exitVan()}
      P.pos.set(t[0],0,t[2]);H.step(2);H.draw();P.dude&&(P.dude.root.visible=false);
      const shoot=()=>{cam.position.set(c[0],c[1],c[2]);cam.lookAt(t[0],t[1],t[2]);cam.updateMatrixWorld();H.ow.update(cam);if(HT.World&&HT.World.update)HT.World.update(H.L,cam.position);H.render.draw()};
      shoot();shoot();R.info.autoReset=false;R.info.reset();cam.updateMatrixWorld();R.setRenderTarget(null);R.render(H.scene,cam);const calls=R.info.render.calls,tris=R.info.render.triangles;R.info.autoReset=true;shoot();
      return{calls,tris}},[c,t]);
    await p.evaluate(()=>{const b=document.getElementById('banner');if(b)b.classList.remove('on')});
    await p.screenshot({path:path.join(OUT,'site-'+name+'.jpg'),type:'jpeg',quality:84});stats[name]=info;console.log('shot',name,JSON.stringify(info))}
  console.log(errs.length?'CONSOLE:\n'+errs.slice(0,10).join('\n'):'no console errors');
  await b.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
