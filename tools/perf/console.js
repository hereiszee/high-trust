/* print console output of the game for N seconds: node tools/perf/console.js [url] [seconds] */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1' } : undefined });
  const p = await b.newPage(); const t0 = Date.now();
  p.on('console', m => console.log(((Date.now() - t0) / 1000).toFixed(1), m.type(), m.text().slice(0, 300)));
  p.on('pageerror', e => console.log('PAGEERROR', e.message, e.stack && e.stack.split('\n')[1]));
  p.on('requestfailed', r => console.log('REQFAIL', r.url().slice(0, 120), r.failure() && r.failure().errorText));
  await p.goto(process.argv[2] || 'http://127.0.0.1:8001/');
  await p.waitForTimeout((+process.argv[3] || 12) * 1000);
  console.log(await p.evaluate(() => JSON.stringify({ t: ((document.querySelector('.ht-title .st')||document.getElementById('ldT')||{}).textContent), dis: !(()=>{const b=document.querySelector('.ht-title [data-act=newgame]');return !!b&&!b.disabled})(), done: window.__ht && window.__ht.assets.done, prog: window.__ht && window.__ht.assets.progress, pend: window.__ht && window.__ht.assets.stream.pending() })));
  await b.close();
})();
