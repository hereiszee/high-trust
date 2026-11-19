/* Drive-any checks (headless, real game): node dev/drive-any/<script>.js. Shared Playwright harness: serves the repo, starts the game. */
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.svg':'image/svg+xml','.json':'application/json'};
const srv=http.createServer((q,r)=>{const p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));if(!p.startsWith(ROOT)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end()}
  r.writeHead(200,{'content-type':MIME[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(r)});
module.exports=async function open(opts={}){await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  const br=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'],proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}:undefined});
  const page=await br.newPage({viewport:{width:opts.w||1280,height:opts.h||720}});for(const b of opts.block||[])await page.route('**/'+b,r=>r.abort());const errs=[];
  page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});page.on('pageerror',e=>errs.push('PAGEERR '+e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html${opts.q||''}`);
  await page.waitForFunction(()=>window.__ht&&window.__ht.assets&&window.__ht.assets.done&&document.querySelector('.ht-title [data-act=newgame]'),null,{timeout:90000});
  await page.waitForTimeout(500);await page.evaluate(()=>{const b=document.querySelector('.ht-title [data-act=newgame]')||document.getElementById('bStart');b.click()});await page.waitForTimeout(1500);
  return {page,br,errs,close:async()=>{await br.close();srv.close()}}}
if(require.main===module)(async()=>{const o=await module.exports();const r=await o.page.evaluate(()=>{const h=__ht;return {mode:h.L.def.id,van:[h.VAN.pos.x,h.VAN.pos.z],P:[h.P.pos.x,h.P.pos.z],cars:h.L.colliders.length,people:!!(window.HT.People&&HT.People.ok)}});console.log(r,o.errs);await o.close()})();
