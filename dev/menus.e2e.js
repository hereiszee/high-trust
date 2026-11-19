/* Interaction tests for the menus in a real browser: keyboard, gamepad, touch, payout.
   Run: node dev/menus.e2e.js */
'use strict';
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.join(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const srv=http.createServer((q,r)=>{const p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));if(!p.startsWith(ROOT)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end()}
  r.writeHead(200,{'content-type':MIME[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(r)});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];
async function T(name,fn){try{await fn();results.push(['ok',name])}catch(e){results.push(['FAIL',name,e.message.split('\n').slice(0,6).join(' | ')])}}

(async()=>{
  await new Promise(r=>srv.listen(0,r));const base=`http://localhost:${srv.address().port}/dev/shop.html`;
  const browser=await chromium.launch();const errors=[];
  const ctx=await browser.newContext({viewport:{width:1280,height:720}});
  const fresh=async(qs)=>{const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
    await p.addInitScript(()=>{localStorage.clear();window.__leak=[];addEventListener('keydown',e=>window.__leak.push(e.key));
      /* fake gamepad driven by window.__pad.buttons[i]=true */
      const pad={connected:true,id:'fake',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};window.__pad=pad;
      navigator.getGamepads=()=>[pad]});
    await p.goto(base+'?'+qs);await p.evaluate(()=>document.fonts.ready);await wait(300);return p};
  const S=p=>p.evaluate(()=>JSON.parse(JSON.stringify(HT.Save.data)));
  const press=async(p,k,n=1)=>{for(let i=0;i<n;i++){await p.keyboard.press(k);await wait(60)}};
  const focusedKey=p=>p.evaluate(()=>document.activeElement&&(document.activeElement.dataset.key||document.activeElement.dataset.act||document.activeElement.className));

  await T('keyboard: browse, tabs, confirm-buy, close',async()=>{const p=await fresh('preset=mid');
    let closed=false;await p.exposeFunction('__closed',()=>{closed=true});
    await p.evaluate(()=>HT.Shop.open({kind:'hardware',onClose:()=>window.__closed()}));await wait(350);
    const k0=await focusedKey(p);assert.match(k0,/^gun:/);
    await press(p,'ArrowRight');const k1=await focusedKey(p);assert.notEqual(k1,k0);
    assert.equal(await p.textContent('.htm-detail .htm-name'),await p.evaluate(k=>HT.CATALOG.guns[k.split(':')[1]].name,k1));
    await press(p,'e');assert.equal(await p.getAttribute('.htm-tab.on','data-tab'),'att');await press(p,'q');assert.equal(await p.getAttribute('.htm-tab.on','data-tab'),'guns');
    await p.focus('[data-key="gun:smg"]');await wait(80);const cash0=(await S(p)).cash;
    await press(p,'Enter');assert.ok(await p.$('.htm-btn.armed'),'first Enter arms');assert.equal((await S(p)).cash,cash0);
    await press(p,'Escape');assert.equal(await p.$('.htm-btn.armed'),null,'Esc disarms');assert.ok(await p.$('.htm'),'menu still open');
    await press(p,'Enter');await press(p,'Enter');await wait(100);const s=await S(p);assert.ok(s.owned.guns.includes('smg'));assert.equal(s.cash,cash0-810);
    assert.equal(await p.getAttribute('[data-key="gun:smg"]','data-state'),'owned');
    await press(p,'Escape');await wait(300);assert.equal(await p.$('.htm'),null);assert.ok(closed,'onClose fired');
    assert.deepEqual(await p.evaluate(()=>window.__leak),[],'no key events leak to the game while open');
    assert.equal(JSON.parse(await p.evaluate(()=>localStorage.getItem('ht-save'))).cash,cash0-810,'saved on close');await p.close()});

  await T('keyboard: insufficient funds shakes and does not buy',async()=>{const p=await fresh('preset=broke');
    await p.evaluate(()=>HT.Shop.open({kind:'hardware'}));await wait(300);await p.focus('[data-key="gun:revolver"]');
    await press(p,'Enter');assert.ok(await p.$('.htm-toast.on.bad'));assert.equal((await S(p)).cash,85);await p.close()});

  await T('gamepad: RB tabs, d-pad browse, A twice buys, B closes',async()=>{const p=await fresh('preset=mid');
    await p.evaluate(()=>HT.Shop.open({kind:'auto'}));await wait(350);
    const tap=async i=>{await p.evaluate(i=>{__pad.buttons[i].pressed=true},i);await wait(80);await p.evaluate(i=>{__pad.buttons[i].pressed=false},i);await wait(80)};
    await tap(5);assert.equal(await p.getAttribute('.htm-tab.on','data-tab'),'prot');await tap(4);assert.equal(await p.getAttribute('.htm-tab.on','data-tab'),'perf');
    const k0=await focusedKey(p);await tap(15);assert.notEqual(await focusedKey(p),k0);
    const before=(await S(p)).vehicle;await tap(0);await tap(0);const after=(await S(p)).vehicle;
    assert.ok(Object.keys(before).some(k=>before[k]!==after[k]&&typeof before[k]==='number'),'an upgrade was installed');
    await tap(1);await wait(300);assert.equal(await p.$('.htm'),null);await p.close()});

  await T('locker: number keys, equip, swap, workbench toggle',async()=>{const p=await fresh('preset=rich');
    await p.evaluate(()=>HT.Locker.open({}));await wait(350);
    await press(p,'3');assert.equal(await p.getAttribute('.htm-slot.tgt','data-slot'),'p2');
    await p.focus('[data-key="gun:smg"]');await press(p,'Enter');let L=(await S(p)).loadout;assert.equal(L.p2,'smg');
    await p.click('.htm-detail [data-act=equip][data-slot=p1]');L=(await S(p)).loadout;assert.deepEqual([L.p1,L.p2],['smg','rifle'],'equipping p2 gun into p1 swaps');
    await p.focus('[data-key="gun:pistol"]');await press(p,'Enter');assert.equal((await S(p)).loadout.side,'pistol');
    await press(p,'e');assert.equal(await p.getAttribute('.htm-tab.on','data-tab'),'attach');
    await p.focus('[data-key="gun:rifle"]');await wait(60);await p.click('.htm-detail [data-act=att][data-slot=muzzle][data-att=""]');
    assert.equal((await S(p)).attOn.rifle.muzzle,null);await p.click('.htm-detail [data-act=att][data-slot=muzzle][data-att=muffler]');assert.equal((await S(p)).attOn.rifle.muzzle,'muffler');
    await press(p,'e');assert.equal(await p.getAttribute('.htm-tab.on','data-tab'),'ammo');assert.equal(await p.locator('.htm-arow').count(),2,'pistol+smg share 9mm, rifle 5.56');
    await press(p,'Escape');await wait(300);assert.equal(await p.$('.htm'),null);await p.close()});

  await T('payout: lines animate, total matches, click skips',async()=>{const p=await fresh('preset=mid');
    await p.evaluate(()=>{window.__r=__bench.payout(true)});await wait(150);
    assert.ok(await p.locator('.htp-line:not(.on)').count()>0,'still animating');await p.click('.htp');
    const n=await p.locator('.htp-line.on').count(),total=await p.textContent('.htp-total b');
    const exp=await p.evaluate(()=>HT.Economy.money(HT.Economy.computePayout({mission:0,ok:true,cuffs:3,confiscated:2,allyDowns:0,got:4,elapsed:212,exec:0,trust:64}).total));
    assert.equal(total,exp);assert.equal(n,await p.locator('.htp-line').count());await p.close()});

  const m=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await T('touch: tap opens sheet, tap twice buys, close sheet',async()=>{const p=await m.newPage();p.on('pageerror',e=>errors.push(e.message));
    await p.addInitScript(()=>localStorage.clear());await p.goto(base+'?preset=mid');await wait(300);
    await p.evaluate(()=>HT.Shop.open({kind:'dadazon',tab:'furn'}));await wait(350);
    const w=await p.evaluate(()=>document.documentElement.scrollWidth);assert.ok(w<=390,'no horizontal overflow: '+w);
    await p.tap('[data-key="furn:plant"]');await wait(400);assert.ok(await p.$('.htm.sheet'));
    await p.tap('.htm-detail [data-act=primary]');await p.tap('.htm-detail [data-act=primary]');await wait(150);
    assert.deepEqual((await S(p)).pending.slice(-1),[{kind:'furn',id:'plant'}]);
    await p.tap('.htm-detail .htm-sheetx');await wait(350);assert.equal(await p.$('.htm.sheet'),null);
    const small=await p.evaluate(()=>[...document.querySelectorAll('.htm-tab,.htm-x,.htm-item')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height<40}).length);
    assert.equal(small,0,'touch targets at least 40px');await p.close()});

  await browser.close();srv.close();
  for(const r of results)console.log(r.join('  '));
  if(errors.length)console.log('page errors:\n'+errors.join('\n'));
  const bad=results.filter(r=>r[0]!=='ok').length+errors.length;console.log(bad?bad+' problem(s)':'all '+results.length+' passed');process.exit(bad?1:0)})();
