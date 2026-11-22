/* perf audit: the midBridge budget view measured (a) straight after teleporting from home and (b) after [--open: opening the bridge, then] first visiting
   the earlier probes (home, mapleSE, dadsAuto) like openworld-ingame does; per-group diff. node dev/audit/perf/midbridge-order.js [--traffic] */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
(async()=>{const {b,p,errs}=await lib.open();
  const r=await p.evaluate(([traffic,OPEN])=>{const H=window.__ht;H.enterHub();H.HUD.hide('title');H.step(3);H.OWS.noTraffic=!traffic;let sun;H.scene.traverse(o=>{if(o.isDirectionalLight)sun=o});
    const R=H.renderer,orig=R.renderBufferDirect.bind(R);let grp=null;
    R.renderBufferDirect=function(c,s,g,m,o,gr){if(grp){const ch=[];let q=o.parent;while(q&&q.type!=='Scene'){if(q.name)ch.push(q.name);q=q.parent}const k=ch.slice(0,2).reverse().join('/')+' > '+(o.name||o.type)+' '+(m.name||m.type);grp[k]=(grp[k]||0)+1}return orig(c,s,g,m,o,gr)};
    H.render.apply('med');H.ow.quality('med');H.ow.buildAll();H.dress(5);
    const meas=(x,z)=>{H.P.pos.set(x,0,z);H.step(12);let best={n:0};for(let h=0;h<4;h++){const a=h*Math.PI/2,fx=Math.sin(a),fz=Math.cos(a),c=H.camera;c.position.set(x-fx*6,3.2,z-fz*6);c.lookAt(x+fx*20,1.5,z+fz*20);c.updateMatrixWorld();H.ow.update(c);H.ow.update(c);if(HT.World.update)HT.World.update(H.L,c.position);
        R.info.autoReset=false;sun.castShadow=false;R.info.reset();grp={};R.render(H.scene,c);const g=grp;grp=null;sun.castShadow=true;R.info.autoReset=true;if(R.info.render.calls>best.n)best={n:R.info.render.calls,g,h}}return best};
    const a=meas(294,43);if(OPEN){H.openBridge();H.step(5)}meas(39,15);meas(177,97);meas(221,55);const b2=meas(294,43);
    const keys=new Set([...Object.keys(a.g),...Object.keys(b2.g)]);const diff=[];for(const k of keys){const d=(a.g[k]||0)-(b2.g[k]||0);if(d)diff.push([d,k])}diff.sort((x,y)=>Math.abs(y[0])-Math.abs(x[0]));
    return{direct:a.n,directHeading:a.h,afterTour:b2.n,tourHeading:b2.h,diff:diff.slice(0,25)}},[process.argv.includes('--traffic'),process.argv.includes('--open')]);
  console.log(JSON.stringify(r,null,1),'errors',errs.length);await b.close()})();
