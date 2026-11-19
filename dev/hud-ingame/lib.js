const {chromium}=require('playwright');
exports.open=async(opts={})=>{
  const browser=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'],proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
  const ctx=await browser.newContext(Object.assign({viewport:{width:1280,height:720},deviceScaleFactor:1,ignoreHTTPSErrors:true},opts));
  const page=await ctx.newPage();const errs=[];
  page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
  page.on('pageerror',e=>errs.push('pageerror: '+e.message));
  await page.goto('http://localhost:8123/index.html'+(opts.q||''));
  return {browser,ctx,page,errs};
};
exports.shot=(page,name)=>page.screenshot({path:'docs/screenshots/hud-ingame/'+name+'.jpg',type:'jpeg',quality:84});
/* real mouse click at the element's centre (Playwright's actionability waits trip on the HUD's entrance animations under slow software GL) */
exports.click=async(page,sel)=>{const lk=await page.evaluate(()=>!!document.pointerLockElement);if(lk){exports.lockWaits=(exports.lockWaits||0)+1;await page.waitForFunction(()=>!document.pointerLockElement,null,{timeout:5000})}const b=await page.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return[r.x+r.width/2,r.y+r.height/2]},sel);await page.mouse.click(b[0],b[1])};
