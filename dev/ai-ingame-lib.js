/* shared setup for the in-game AI checks (dev/ai-ingame*.js).
   Serves the repo to headless Chromium under http://ht.local/ through Playwright request routing (no server process,
   no file:// CORS errors), pauses the page's own render loop once assets are loaded so only window.__ht.step() advances the
   simulation, and collects console errors. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const TYPES={'.html':'text/html','.js':'application/javascript','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.hdr':'application/octet-stream','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.css':'text/css','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
async function open(o={}){
  const b=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:o.viewport||{width:1280,height:720},deviceScaleFactor:o.dpr||1});const errs=[];
  p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.route('http://ht.local/**',async r=>{const u=new URL(r.request().url());const f=path.join(ROOT,decodeURIComponent(u.pathname));
    if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'not found'});
    r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':TYPES[path.extname(f).toLowerCase()]||'application/octet-stream','access-control-allow-origin':'*'}})});
  if(o.before)await o.before(p);
  await p.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);window.__rafOn=true;
    window.requestAnimationFrame=cb=>{if(window.__rafOn)return raf(cb);window.__rafPending=cb;return 0}});
  const t0=Date.now();await p.goto('http://ht.local/index.html');
  await p.waitForFunction(()=>window.__ht&&window.__ht.assets&&window.__ht.assets.done,null,{timeout:90000});
  await p.evaluate(()=>{window.__rafOn=false});await p.waitForTimeout(300);
  return{b,p,errs,loadMs:Date.now()-t0};
}
module.exports={open,ROOT};
