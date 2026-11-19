/* Screenshot every menu tab/state at 1280x720 and 390x844 into docs/screenshots/menus/.
   Run: node dev/shots.js [filter]   (serves the repo on a free port itself) */
'use strict';
const {chromium,devices}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'docs/screenshots/menus');
const filter=process.argv[2]||'';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.glb':'model/gltf-binary','.svg':'image/svg+xml'};
const srv=http.createServer((q,r)=>{const p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));if(!p.startsWith(ROOT)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end()}
  r.writeHead(200,{'content-type':MIME[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(r)});

const wait=ms=>new Promise(r=>setTimeout(r,ms));
/* each shot: url query + optional steps(page, mobile) */
const SHOTS=[
  ['dadazon-guns','preset=mid&open=dadazon&tab=guns'],
  ['dadazon-guns-locked','preset=fresh&open=dadazon&tab=guns',async(p,m)=>{await pick(p,m,'gun:smg')}],
  ['dadazon-attachments','preset=mid&open=dadazon&tab=att',async(p,m)=>{await pick(p,m,'att:extmag')}],
  ['dadazon-furniture','preset=mid&open=dadazon&tab=furn',async(p,m)=>{await pick(p,m,'furn:sofa')}],
  ['dadazon-furniture-3d','preset=mid&thumbs=3d&open=dadazon&tab=furn',async(p,m)=>{await wait(6000);await pick(p,m,'furn:lounge');await wait(1500)}],
  ['dadazon-confirm','preset=mid&open=dadazon&tab=furn',async(p,m)=>{await pick(p,m,'furn:trampoline');await primary(p)}],
  ['dadazon-ordered','preset=mid&open=dadazon&tab=furn',async(p,m)=>{await pick(p,m,'furn:trampoline');await primary(p);await primary(p);await wait(450)}],
  ['hardware-guns','preset=mid&open=hardware&tab=guns',async(p,m)=>{await pick(p,m,'gun:smg')}],
  ['hardware-bought','preset=mid&open=hardware&tab=guns',async(p,m)=>{await pick(p,m,'gun:smg');await primary(p);await primary(p);await wait(450)}],
  ['hardware-poor','preset=broke&open=hardware&tab=guns',async(p,m)=>{await pick(p,m,'gun:revolver')}],
  ['hardware-furniture','preset=mid&open=hardware&tab=furn',async(p,m)=>{await pick(p,m,'furn:firepit')}],
  ['hardware-supplies','preset=mid&open=hardware&tab=sup',async(p,m)=>{await pick(p,m,'sup:rangeDay')}],
  ['auto-performance','preset=mid&open=auto&tab=perf',async(p,m)=>{await pick(p,m,'veh:engine')}],
  ['auto-protection','preset=mid&open=auto&tab=prot',async(p,m)=>{await pick(p,m,'veh:panels')}],
  ['auto-utility','preset=mid&open=auto&tab=util',async(p,m)=>{await pick(p,m,'veh:roofBox')}],
  ['auto-cosmetics','preset=mid&open=auto&tab=cos',async(p,m)=>{await pick(p,m,'cos:paint:red')}],
  ['locker-loadout','preset=mid&locker=loadout',async(p,m)=>{await pick(p,m,'gun:rifle')}],
  ['locker-locked','preset=mid&locker=loadout',async(p,m)=>{await pick(p,m,'gun:smg')}],
  ['locker-workbench','preset=rich&locker=attach',async(p,m)=>{await pick(p,m,'gun:rifle')}],
  ['locker-ammo','preset=rich&locker=ammo'],
  ['payout-win','preset=mid&payout=win',async p=>{await wait(4200)}],
  ['payout-fail','preset=mid&payout=fail',async p=>{await wait(3000)}],
];
async function pick(p,mobile,key){const el=p.locator(`.htm-grid [data-key="${key}"]`);await el.scrollIntoViewIfNeeded();await el.click();await wait(mobile?450:500)}
async function primary(p){await p.locator('.htm-detail [data-act=primary]').click();await wait(250)}

(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  fs.mkdirSync(OUT,{recursive:true});
  const browser=await chromium.launch();const errors=[];
  for(const[mode,ctxOpts]of[['desktop',{viewport:{width:1280,height:720},deviceScaleFactor:1}],['mobile',{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}]]){
    const ctx=await browser.newContext(ctxOpts);
    for(const[name,qs,steps]of SHOTS){if(filter&&!name.includes(filter)&&!mode.includes(filter))continue;
      const page=await ctx.newPage();page.on('pageerror',e=>errors.push(mode+'/'+name+': '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push(mode+'/'+name+' console: '+m.text())});
      await page.addInitScript(()=>{try{localStorage.clear()}catch(e){}});
      await page.goto(`http://localhost:${port}/dev/shop.html?${qs}`);await page.evaluate(()=>document.fonts.ready);await wait(600);
      if(steps)await steps(page,mode==='mobile');
      await page.screenshot({path:path.join(OUT,`${mode}-${name}.png`)});await page.close();process.stdout.write('.')}
    await ctx.close()}
  await browser.close();srv.close();
  console.log('\n'+(errors.length?'ERRORS:\n'+errors.join('\n'):'no page errors'));
  process.exit(errors.length?1:0)})();
