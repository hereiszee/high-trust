/* perf audit: the openworld-ingame midBridge probe with the player's minivan parked 8 m ahead vs parked at home.
   node dev/audit/perf/van-in-view.js */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
(async()=>{const {b,p,errs}=await lib.open();
  const r=await p.evaluate(()=>{const H=window.__ht;H.enterHub();H.HUD.hide('title');H.step(3);H.OWS.noTraffic=true;let sun;H.scene.traverse(o=>{if(o.isDirectionalLight)sun=o});
    H.render.apply('med');H.ow.quality('med');H.ow.buildAll();H.dress(5);
    const meas=()=>{const x=294,z=43;H.P.pos.set(x,0,z);H.step(12);let best=0;for(let h=0;h<4;h++){const a=h*Math.PI/2,fx=Math.sin(a),fz=Math.cos(a),c=H.camera;c.position.set(x-fx*6,3.2,z-fz*6);c.lookAt(x+fx*20,1.5,z+fz*20);c.updateMatrixWorld();H.ow.update(c);H.ow.update(c);if(HT.World.update)HT.World.update(H.L,c.position);
        const R=H.renderer;R.info.autoReset=false;sun.castShadow=false;R.info.reset();R.render(H.scene,c);sun.castShadow=true;best=Math.max(best,R.info.render.calls);R.info.autoReset=true}const rr=H.scene.getObjectByName("rentalRack");return best+(rr&&rr.visible?" (rack visible)":"")};
    const V=H.VAN;const home=meas();H.enterVan();V.pos.set(302,0,43.5);V.yaw=-Math.PI/2;V.spd=0;if(V.car){V.car.x=302;V.car.z=43.5;V.car.spd=0}H.syncVan();H.step(3);V.spd=0;H.exitVan();const near=meas();return{vanAtHome:home,vanAhead:near}});
  console.log(JSON.stringify(r),'errors',errs.length);await b.close()})();
