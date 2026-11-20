/* Aerial audit (the jet's view of the world): node dev/base-air.js -> docs/screenshots/base/air-*.jpg
   Each view twice: lids off ("-before") and on ("-after", what you see while flying: js/jet.js lids() over open interiors),
   plus wide views with the far terrain and the High Bridge. Prints draw calls / triangles per view. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'../docs/screenshots/base');fs.mkdirSync(OUT,{recursive:true});
const VIEWS={chopshop:[[200,70,170],[240,0,110]],storage:[[230,60,190],[230,0,140]],riverside:[[330,90,10],[400,0,90]],maple:[[40,80,-20],[90,0,70]],
  wide:[[-150,220,-200],[232,0,128]],base:[[120,140,330],[150,0,200]],bridge:[[300,6,-10],[294,10,-64]]};
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});
  await p.evaluate(async()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(2);H.openBridge();HT.OpenWorld.flight({R:900,blod:70});H.ow.buildAll();
    for(let i=0;i<60&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500));
    const cv=H.renderer.domElement;for(const el of document.body.querySelectorAll('*'))if(el!==cv&&!el.contains(cv)&&el.style)el.style.visibility='hidden';cv.style.visibility='visible'});
  for(const name in VIEWS)for(const lid of[false,true]){if(name==='wide'&&!lid||name==='bridge'&&!lid)continue;const[c,t]=VIEWS[name];
    const info=await p.evaluate(([c,t,lid])=>{const H=window.__ht,cam=H.camera,R=H.renderer,api=HT.Jobs.api;H.P.pos.set(t[0],0,t[2]);H.step(1);
      HT.Jet.air(api,lid);const shoot=()=>{cam.position.set(c[0],c[1],c[2]);cam.lookAt(t[0],t[1],t[2]);cam.updateMatrixWorld();H.ow.update(cam);HT.Jet.air(api,lid,true);H.render.draw()};
      shoot();shoot();R.info.autoReset=false;R.info.reset();R.render(H.scene,cam);const o={calls:R.info.render.calls,tris:R.info.render.triangles};R.info.autoReset=true;shoot();return o},[c,t,lid]);
    const f='air-'+name+(name==='wide'||name==='bridge'?'':lid?'-after':'-before')+'.jpg';await p.screenshot({path:path.join(OUT,f),type:'jpeg',quality:82});console.log('shot',f,JSON.stringify(info))}
  console.log(errs.length?'CONSOLE:\n'+errs.slice(0,10).join('\n'):'no console errors');await b.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
