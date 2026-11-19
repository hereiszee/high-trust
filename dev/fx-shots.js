/* Screenshot every FX demo headlessly: node dev/fx-shots.js [outDir] [comma list]. Serves the repo through request interception, no server needed. */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const out=process.argv[2]||'docs/screenshots/fx';const only=process.argv[3];
const MIME={'.html':'text/html','.js':'application/javascript','.jpg':'image/jpeg','.png':'image/png','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.json':'application/json'};
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:1280,height:720}});
 /* serve the repo from disk for http://repo.local/ (no server process) */
 await ctx.route('http://repo.local/**',r=>{const u=new URL(r.request().url());const f=path.join(ROOT,decodeURIComponent(u.pathname));
   if(!f.startsWith(ROOT)||!fs.existsSync(f))return r.fulfill({status:404,body:'nf'});r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':MIME[path.extname(f)]||'application/octet-stream'}})});
 const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+' '+m.text())});
 await p.goto('http://repo.local/dev/fx.html');await p.waitForFunction(()=>window.demo&&demo.loaded(),null,{timeout:120000});
 await p.evaluate(()=>{demo.pause();document.body.classList.add('shot')});
 const V='new THREE.Vector3';
 const shots=[
  ['flashes',`demo.demo('flashes');demo.step(1)`],
  ['flash_smoke',`demo.demo('flashes');demo.tickOnly(40);demo.step(1)`],
  ['fp_flash',`demo.demo('fpflash');demo.step(1)`],
  ['fp_smoke',`demo.demo('fpflash');for(let i=0;i<6;i++){demo.tickOnly(6);demo.fireAlong(${V}(0,0,-1).applyQuaternion(demo.camera.quaternion),'rifle')}demo.step(20)`],
  ['tracers',`demo.demo('tracers');demo.step(3)`],
  ['impacts_burst',`demo.demo('impacts');demo.step(5)`],
  ['impacts_settle',`demo.demo('impacts');demo.tickOnly(80);demo.step(1)`],
  ['decals_close',`demo.demo('holes');demo.tickOnly(240);demo.setCam(${V}(-6,1.4,-1.7),0,-.04);demo.step(1)`],
  ['decals_close2',`demo.demo('holes');demo.tickOnly(240);demo.setCam(${V}(3,1.4,-1.7),0,-.04);demo.step(1)`],
  ['shells',`demo.demo('shells');demo.tickOnly(150);demo.step(1)`],
  ['shells_air',`demo.demo('shells');demo.step(8)`],
  ['explosion_01',`demo.demo('explosion');demo.step(4)`],
  ['explosion_02',`demo.demo('explosion');demo.tickOnly(20);demo.step(1)`],
  ['explosion_03',`demo.demo('explosion');demo.tickOnly(80);demo.step(1)`],
  ['explosion_04',`demo.demo('explosion');demo.tickOnly(240);demo.step(1)`],
  ['skid',`demo.demo('skid');demo.tickOnly(100,1/30);demo.step(1)`],
  ['ambient',`demo.demo('ambient');demo.tickOnly(400,1/30);demo.step(1)`],
  ['motes',`demo.demo('motes');demo.tickOnly(60,1/30);demo.step(1)`],
  ['flies',`demo.demo('flies');demo.tickOnly(30,1/30);demo.step(1)`],
  ['interact',`demo.demo('interact');demo.tickOnly(20);demo.step(1)`],
  ['damage',`demo.demo('damage');demo.tickOnly(10);demo.step(1)`],
  ['cloth',`demo.demo('cloth');demo.step(4)`],
 ];
 if(process.env.DBG)shots.push(['dbg',process.env.DBG]);
 for(const[n,code]of shots){if(only&&!only.split(',').includes(n))continue;const t=Date.now();await p.evaluate(code);await p.screenshot({path:`${ROOT}/${out}/${n}.jpg`,type:'jpeg',quality:86});console.log(n,Date.now()-t,'ms')}
 if(process.env.EXTRA){console.log(await p.evaluate(process.env.EXTRA))}
 console.log(JSON.stringify(await p.evaluate(()=>demo.FX.stats())));
 console.log('ERRORS:',errs.length?errs.join('\n'):'none');await b.close()})();
