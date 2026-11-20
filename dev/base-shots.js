/* Fort Sensible screenshots from fixed cameras: node dev/base-shots.js [filter] [--q=med] -> docs/screenshots/base/<name>.jpg
   (the staged views; dev/base-check.js takes the play-through shots). Headless Chromium + SwiftShader through window.__ht. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'../docs/screenshots/base');fs.mkdirSync(OUT,{recursive:true});
const args=process.argv.slice(2),filter=args.find(a=>!a.startsWith('--'))||'',Q=(args.find(a=>a.startsWith('--q='))||'--q=med').slice(4);
const SHOTS={
  'gate':[[201,2.4,156],[204,3,176]],
  'gate-inside':[[212,2.2,184],[203,2.4,170]],
  'overview':[[150,60,120],[190,0,210]],
  'range':[[117,1.8,212],[60,1,204]],
  'range-office':[[134,2.2,214],[121,2,201]],
  'barracks':[[150,4,196],[160,3,176]],
  'hangar':[[250,4,238],[253,4,200]],
  'motorpool':[[200,5,214],[216,2,198]],
  'runway':[[290,14,250],[150,0,236]],
  'r9sign':[[200,3,30],[209,3,50]],
};
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});
  await p.evaluate(async q=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(2);H.render.apply(q);H.ow.quality(q);H.openBridge();H.ow.buildAll();
    for(let i=0;i<60&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500));
    const cv=H.renderer.domElement;for(const el of document.body.querySelectorAll('*'))if(el!==cv&&!el.contains(cv)&&el.style)el.style.visibility='hidden';cv.style.visibility='visible'},Q);
  for(const name in SHOTS){if(filter&&!name.includes(filter))continue;const[c,t]=SHOTS[name];
    const info=await p.evaluate(([c,t])=>{const H=window.__ht,P=H.P,cam=H.camera,R=H.renderer;if(H.VAN.on){H.VAN.spd=0;H.exitVan&&H.exitVan()}
      P.pos.set(t[0],0,t[2]);H.step(2);H.draw();P.dude&&(P.dude.root.visible=false);
      const shoot=()=>{cam.position.set(c[0],c[1],c[2]);cam.lookAt(t[0],t[1],t[2]);cam.updateMatrixWorld();H.ow.update(cam);if(HT.World&&HT.World.update)HT.World.update(H.L,cam.position);H.render.draw()};
      shoot();shoot();R.info.autoReset=false;R.info.reset();cam.updateMatrixWorld();R.setRenderTarget(null);R.render(H.scene,cam);const calls=R.info.render.calls,tris=R.info.render.triangles;R.info.autoReset=true;shoot();
      return{calls,tris}},[c,t]);
    await p.screenshot({path:path.join(OUT,name+'.jpg'),type:'jpeg',quality:84});console.log('shot',name,JSON.stringify(info))}
  console.log(errs.length?'CONSOLE:\n'+errs.slice(0,10).join('\n'):'no console errors');
  await b.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
