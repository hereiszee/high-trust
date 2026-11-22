/* Save robustness in the real page (one headless Chromium).  node dev/save-notices.e2e.js
   SAV-07 a newer-version save: a dialog says so and where it is kept, and the save is not overwritten at launch
   SAV-07 a damaged save with a good backup: "Loaded your backup", the damaged copy kept under a dated key
   SAV-06 first session: New game, progress, Quit to title -> Continue is offered (and New game)
   SAV-10 a failed write: no 'saved', a quiet "Couldn't save" line
   SAV-11 two tabs: when one saves, the other stops writing and asks to reload */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const TYPES={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.bin':'application/octet-stream','.webp':'image/webp','.woff2':'font/woff2'};
/* SwiftShader can keep the main thread busy longer than Playwright's click timeout: a real click first, else a DOM click (as dev/audit/saves/lib.js does) */
const click=async(p,sel)=>{try{await p.click(sel,{timeout:15000})}catch(e){console.log('info (click fell back to a DOM click: '+sel+')');await p.evaluate(s=>document.querySelector(s).click(),sel)}};
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:720}});const errs=[];
  await ctx.route('http://ht.local/**',r=>{const u=new URL(r.request().url());const f=path.join(ROOT,decodeURIComponent(u.pathname));
    if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'nf'});
    r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':TYPES[path.extname(f).toLowerCase()]||'application/octet-stream'}})});
  const page=async(seed)=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
    if(seed!==undefined){await p.goto('http://ht.local/css/');await p.evaluate(s=>{localStorage.clear();for(const k in s)localStorage.setItem(k,s[k])},seed)}
    await p.goto('http://ht.local/index.html');await p.waitForFunction(()=>window.__ht&&window.__ht.assets&&window.__ht.assets.done,null,{timeout:120000});await p.waitForTimeout(1500);return p};
  const dlg=p=>p.evaluate(()=>{const d=document.querySelector('.ht-dlg');return d?d.innerText.replace(/\s+/g,' '):null});

  /* SAV-07 newer version */
  let p=await page({'ht-save':JSON.stringify({v:99,cash:5000,t:Date.now()})});
  let t=await dlg(p);ok(t&&/newer version/i.test(t)&&/kept here/i.test(t)&&/ht-save-unread-/.test(t),'newer-version save: dialog explains and says where it is kept: '+(t||'').slice(0,200));
  ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('ht-save')).v)===99,'the newer save is not overwritten at launch');
  await p.keyboard.press('Enter');await p.waitForTimeout(300);ok(!(await dlg(p)),'OK closes it');await p.close();

  /* SAV-07 damaged save + good backup */
  p=await page({'ht-save':'{"v":3,"cash":12','ht-save-bak':JSON.stringify({v:3,cash:777,t:Date.now()-3600e3,prog:{missionsRun:2}})});
  t=await dlg(p);ok(t&&/Loaded your backup/i.test(t),'damaged save + backup: "Loaded your backup" dialog: '+(t||'').slice(0,160));
  ok(await p.evaluate(()=>window.HT.Save.data.cash)===777,'the backup is what loaded');
  ok(await p.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('ht-save-unread-')&&localStorage.getItem(k)==='{"v":3,"cash":12')),'the damaged copy is kept under a dated key');
  await p.close();

  /* SAV-06 first session */
  p=await page({});
  ok(!(await dlg(p)),'a fresh profile shows no save dialog');
  await click(p,'.ht-title [data-act=newgame]');await p.waitForFunction(()=>window.__ht.mode==='hub',null,{timeout:60000});
  await p.evaluate(()=>{window.HT.Save.addCash(250,'test');window.HT.Save.saveNow(true)});
  await p.evaluate(()=>window.__ht.quitToTitle());await p.waitForTimeout(800);
  const tb=await p.evaluate(()=>[...document.querySelectorAll('.ht-title .ht-btns .ht-btn')].filter(b=>!b.hidden&&b.offsetParent).map(b=>b.dataset.act+':'+b.textContent.trim()));
  ok(tb.some(x=>x.startsWith('continue'))&&tb.some(x=>x.startsWith('newgame')),'first session, Quit to title: Continue and New game offered: '+tb.join(' | '));

  /* SAV-10 failed write (in the street, where the feed shows) */
  await click(p,'.ht-title [data-act=continue]');await p.waitForFunction(()=>window.__ht.mode==='hub',null,{timeout:60000});await p.waitForTimeout(500);
  const r=await p.evaluate(()=>{const S=window.HT.Save;let saved=0;const off=S.on('saved',()=>saved++);const real=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){if(k==='ht-save'){const e=new Error('full');e.name='QuotaExceededError';throw e}return real.call(this,k,v)};
    const ok=S.saveNow(true);Storage.prototype.setItem=real;off();return{ok,saved,failing:S.failing}});
  await p.waitForTimeout(300);
  const feed=await p.evaluate(()=>[...document.querySelectorAll('.ht-fi')].some(e=>e.textContent.includes("Couldn't save the game")));
  ok(!r.ok&&r.saved===0&&r.failing&&feed,'a failed write fires no "saved" and shows a quiet warning: '+JSON.stringify(r)+' feed='+feed);
  await p.evaluate(()=>window.HT.Save.saveNow(true));ok(await p.evaluate(()=>!window.HT.Save.failing),'the next save that works clears it');

  /* SAV-11 two tabs */
  await p.evaluate(()=>{window.__se=[];addEventListener('storage',e=>window.__se.push(e.key))});
  const p2=await page();
  await p2.evaluate(()=>{window.HT.Save.addCash(2000,'tab B');window.HT.Save.saveNow(true)});
  await p.waitForFunction(()=>!!window.HT.Save.conflict,null,{timeout:20000}).catch(()=>{});await p.waitForTimeout(500);
  console.log('info tab A conflict state: '+JSON.stringify(await p.evaluate(()=>({c:window.HT.Save.conflict,mode:window.__ht.mode,se:window.__se}))));
  t=await dlg(p);ok(t&&/another tab/i.test(t),'tab A is told another tab saved newer progress: '+(t||'').slice(0,120));
  const before=await p2.evaluate(()=>JSON.parse(localStorage.getItem('ht-save')).cash);
  const wrote=await p.evaluate(()=>window.HT.Save.saveNow(true));
  const after=await p2.evaluate(()=>JSON.parse(localStorage.getItem('ht-save')).cash);
  ok(wrote===false&&after===before,'stale tab A does not overwrite tab B ($'+before+' -> $'+after+')');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(99)});
