/* second visit with the network gone: the service worker serves the shell and cached assets.
   node tools/perf/offline.js [url] */
const { chromium } = require('playwright'); const fs = require('fs'), os = require('os'), path = require('path');
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'htoff-'));
  const ctx = await chromium.launchPersistentContext(dir, { headless: true, args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1' } : undefined });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const url = process.argv[2] || 'http://127.0.0.1:8001/';
  await p.goto(url); await p.waitForFunction(() => !document.getElementById('bStart').disabled, null, { timeout: 60000 });
  await p.waitForTimeout(12000);/* let the worker install, warm its cache and Stage B get going */
  console.log('cached', JSON.stringify(await p.evaluate(async () => { const o = {}; for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).length; return o })));
  const state = () => p.evaluate(() => { const A = window.__ht.assets; return { text: document.getElementById('ldT').textContent, retry: !document.getElementById('ldRetry').hidden, start: !document.getElementById('bStart').disabled, pending: A.stream.pending() } });
  await ctx.setOffline(true); const t0 = Date.now();
  await p.reload(); await p.waitForFunction(() => !document.getElementById('bStart').disabled, null, { timeout: 60000 });
  console.log('offline reload: Start after', Date.now() - t0, 'ms', JSON.stringify(await state()));
  await p.waitForTimeout(3000); console.log('3 s later', JSON.stringify(await state()));
  await ctx.setOffline(false); await p.waitForTimeout(6000); console.log('back online', JSON.stringify(await state()));
  console.log('page errors', errs.length ? errs : 'none'); await ctx.close(); fs.rmSync(dir, { recursive: true, force: true });
})();
