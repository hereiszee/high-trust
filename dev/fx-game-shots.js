/* In-game FX check: loads index.html headlessly (repo served via request interception), starts a mission,
   fires guns, triggers an explosion and an orange beanbag tracer, and screenshots the real game.
   node dev/fx-game-shots.js [outDir] */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');const out=process.argv[2]||'docs/screenshots/fx/game';
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.json':'application/json','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
(async()=>{fs.mkdirSync(path.join(ROOT,out),{recursive:true});
 const b=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:1280,height:720}});
 await ctx.route('http://repo.local/**',r=>{const u=new URL(r.request().url());const f=path.join(ROOT,decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
   if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'nf'});r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':MIME[path.extname(f)]||'application/octet-stream'}})});
 const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
 await p.goto('http://repo.local/index.html');
 await p.waitForFunction(()=>{const b=document.getElementById('bStart');return b&&!b.disabled},null,{timeout:180000});
 await p.click('#bStart').catch(()=>{});
 await p.waitForTimeout(800);
 const shot=async(n,code,wait=250)=>{await p.evaluate(code);await p.waitForTimeout(wait);await p.screenshot({path:path.join(ROOT,out,n+'.jpg'),type:'jpeg',quality:86});console.log('shot',n)};
 const info=await p.evaluate(()=>{const h=__ht;h.startMission(0);h.step(20);return {soft:h.FX.softParticles,q:h.render.q,post:h.render.post}});
 console.log('mission started',JSON.stringify(info));
 await p.waitForTimeout(5500);
 /* face the nearest wall-ish direction: scan yaw for the closest solid hit in front */
 await p.evaluate(()=>{const h=__ht,P=h.P,rc=new THREE.Raycaster();let best=null;
   for(let a=0;a<64;a++){const yaw=a/64*Math.PI*2;rc.set(P.pos.clone().setY(1.5),new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)));rc.far=12;const hit=rc.intersectObjects(h.L.solids,false)[0];
     if(hit&&hit.distance>3&&(!best||hit.distance<best.d))best={d:hit.distance,yaw}}if(best){P.yaw=best.yaw;P.pitch=-.05}h.step(2)});
 await shot('game_aim',`0`);
 await shot('game_fire',`(()=>{const h=__ht;h.give('rifle');h.swap&&h.swap('rifle');for(let i=0;i<6;i++){h.fire();h.step(3)}})()`,60);
 await shot('game_impacts',`__ht.step(20)`,400);
 await shot('game_shotgun',`(()=>{const h=__ht;h.give('shotgun');h.swap('shotgun');h.step(12);h.fire()})()`,40);
 await shot('game_beanbag_tracer',`(()=>{const h=__ht,c=h.camera,o=c.position.clone();for(let i=0;i<5;i++){const a=new THREE.Vector3(-6+i*.4,-.2+i*.1,-4).applyQuaternion(c.quaternion).add(o),b2=new THREE.Vector3(6,0,-14).applyQuaternion(c.quaternion).add(o);h.FX.tracer(a,b2,{color:'#ff7a1a',speed:60})}})()`,30);
 await shot('game_explosion',`(()=>{const h=__ht,c=h.camera,f=new THREE.Vector3(-4,0,-8).applyQuaternion(c.quaternion).add(c.position);f.y=.5;h.FX.explosion(f,1)})()`,350);
 await shot('game_explosion_smoke',`0`,1600);
 /* soft particles in the real game: wrap the game's own scene pass the way docs/fx-integration.md describes (test-only patch) */
 const soft=await p.evaluate(()=>{const h=__ht,R=h.render,sp=R.composer&&R.composer.passes[0];if(!sp||!sp.ensure)return 'no scene pass';const orig=sp.render.bind(sp);
   sp.render=(r,w,rb)=>{orig(r,w,rb);if(sp.ao&&sp.rt){h.FX.bindDepth(sp.rt.depthTexture,h.camera.near,h.camera.far);h.FX.renderSoft(r)}else h.FX.bindDepth(null)};return 'patched ao='+sp.ao});
 console.log('soft patch',soft);
 await shot('game_soft_impacts',`(()=>{const h=__ht;h.FX.clear();h.give('rifle');h.swap('rifle');h.step(12);for(let i=0;i<5;i++){h.fire();h.step(4)}})()`,500);
 await shot('game_soft_explosion',`(()=>{const h=__ht,c=h.camera,f=new THREE.Vector3(-4,0,-8).applyQuaternion(c.quaternion).add(c.position);f.y=.5;h.FX.explosion(f,1)})()`,1200);
 console.log('soft on',await p.evaluate(()=>__ht.FX.softParticles));
 console.log('stats',JSON.stringify(await p.evaluate(()=>__ht.FX.stats())));
 console.log('ERRORS:',errs.length?'\n'+errs.join('\n'):'none');await b.close()})();
