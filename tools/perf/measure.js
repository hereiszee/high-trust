#!/usr/bin/env node
/* Load-time and frame-cost measurement for High Trust.
   Serve the repo first:  python3 -m http.server 8000 --bind 127.0.0.1
   Then:                  node tools/perf/measure.js [--url http://127.0.0.1:8000/] [--throttle] [--repeat] [--levels] [--shots dir] [--json out.json]
   --throttle  emulate ~10 Mbit/s down, 40 ms latency (CDP Network.emulateNetworkConditions)
   --repeat    load twice in the same profile (second visit: HTTP cache + service worker)
   --levels    after load, enter hub, drive, and each mission; report renderer.info and JS ms/frame
   --shots d   write jpg screenshots of the hub into d
   --nosw      block the service worker
   --fail p    make every request whose URL contains p return 404 (repeatable)
   --rafcap    run the page's render loop at ~5 fps: SwiftShader draws on the CPU, so an uncapped loop starves loading
               of main-thread time that a real GPU would not take. Use it for load timings, never for frame costs.
   Bytes of requests a service worker answers are invisible to the page, so first-visit byte counts use --nosw. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), has = f => args.includes(f), val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d };
const URL_ = val('--url', 'http://127.0.0.1:8000/');
const fails = args.reduce((a, v, i) => (args[i - 1] === '--fail' ? a.concat(v) : a), []);
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;

(async () => {
  const userDataDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'htperf-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true, proxy, viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1,
    serviceWorkers: has('--nosw') ? 'block' : 'allow',
    args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const out = { url: URL_, throttle: has('--throttle'), visits: [] };
  const page = ctx.pages()[0] || await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  if (has('--rafcap')) await page.addInitScript(() => { const r = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = f => setTimeout(() => r(f), 200) });
  if (fails.length) await page.route(u => fails.some(f => u.href.includes(f)), r => r.fulfill({ status: 404, body: 'nope' }));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  if (has('--throttle')) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 5e6 / 8 });
  let reqs = new Map();
  cdp.on('Network.requestWillBeSent', e => /^(blob|data):/.test(e.request.url) || reqs.set(e.requestId, { url: e.request.url, t0: e.timestamp, bytes: 0 }));
  cdp.on('Network.responseReceived', e => { const r = reqs.get(e.requestId); if (r) { r.status = e.response.status; r.fromSW = e.response.fromServiceWorker; r.fromCache = e.response.fromDiskCache } });
  cdp.on('Network.loadingFinished', e => { const r = reqs.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.t1 = e.timestamp } });
  cdp.on('Network.loadingFailed', e => { const r = reqs.get(e.requestId); if (r) { r.failed = e.errorText; r.t1 = e.timestamp } });

  async function visit(label) {
    reqs = new Map();
    const t0 = Date.now();
    await page.goto(URL_, { waitUntil: 'commit' });
    await page.waitForFunction(() => (()=>{const b=document.querySelector('.ht-title [data-act=newgame]')||document.getElementById('bStart');return !!b&&!b.disabled})(), null, { timeout: 120000, polling: 50 });
    const tStart = Date.now() - t0;
    const atStart = [...reqs.values()].map(r => ({ ...r }));
    const ldText = await page.evaluate(() => ((document.querySelector('.ht-title .st')||document.getElementById('ldT')||{}).textContent));
    /* wait for background streaming to settle (if the page exposes it) */
    let tFull = null;
    try {
      await page.waitForFunction(() => { const a = window.__ht && window.__ht.assets; return !a || !a.stream || a.stream.idle() }, null, { timeout: 180000, polling: 200 });
      tFull = Date.now() - t0;
    } catch (e) { tFull = 'timeout' }
    const all = [...reqs.values()];
    const sum = l => l.reduce((s, r) => s + (r.bytes || 0), 0);
    const local = l => l.filter(r => r.url.startsWith(URL_.replace(/\/[^/]*$/, '')));
    const v = { label, tStartMs: tStart, tFullMs: tFull, ldText,
      atStart: { requests: atStart.length, bytes: sum(atStart), localRequests: local(atStart).length, localBytes: sum(local(atStart)), fromSW: atStart.filter(r => r.fromSW).length },
      total: { requests: all.length, bytes: sum(all) },
      failed: all.filter(r => r.failed || r.status >= 400).map(r => r.url + ' ' + (r.failed || r.status)),
      files: all.map(r => ({ url: r.url.replace(URL_, ''), kb: Math.round((r.bytes || 0) / 1024), t: +((r.t0 - all[0].t0)).toFixed(2), dur: +((r.t1 || r.t0) - r.t0).toFixed(2), beforeStart: atStart.some(a => a.url === r.url && a.t0 === r.t0), sw: !!r.fromSW })) };
    out.visits.push(v);
    console.log(`${label}: Start enabled after ${tStart} ms · ${v.atStart.requests} requests / ${(v.atStart.bytes / 1048576).toFixed(2)} MB before Start (local ${v.atStart.localRequests} / ${(v.atStart.localBytes / 1048576).toFixed(2)} MB, ${v.atStart.fromSW} from SW) · all streamed after ${tFull} ms, ${v.total.requests} req / ${(v.total.bytes / 1048576).toFixed(2)} MB · "${ldText}"`);
    return v;
  }
  await visit('first visit');
  if (has('--repeat')) { await page.waitForTimeout(1500); await visit('second visit') }

  if (has('--levels') || val('--shots')) {
    const shots = val('--shots');
    if (shots) fs.mkdirSync(shots, { recursive: true });
    /* frame costs are compared at Medium: Auto would react to this harness's back-to-back draws */
    await page.evaluate(q => { (document.querySelector('.ht-title [data-act=newgame]')||document.getElementById('bStart')).click(); window.__ht.render.apply(q) }, val('--q', 'med'));
    await page.waitForTimeout(1500);
    const sample = async (name, setup, arg) => {
      await page.evaluate(setup, arg);
      await page.waitForTimeout(800);
      const r = await page.evaluate(async () => {
        const h = window.__ht, ren = h.renderer;
        /* render a handful of frames through the real loop and time the JS update separately */
        const info = () => ({ calls: ren.info.render.calls, tris: ren.info.render.triangles, textures: ren.info.memory.textures, geometries: ren.info.memory.geometries, programs: ren.info.programs ? ren.info.programs.length : null });
        ren.info.autoReset = false; ren.info.reset();
        h.draw(); const i1 = info(); ren.info.autoReset = true;
        const t = []; for (let k = 0; k < 30; k++) { const a = performance.now(); h.step(1); t.push(performance.now() - a) }
        t.sort((a, b) => a - b);
        h.draw(); ren.getContext().finish();
        const c = []; for (let k = 0; k < 9; k++) { const a = performance.now(); h.draw(); c.push(performance.now() - a); ren.getContext().finish() }
        c.sort((a, b) => a - b);
        const d = []; for (let k = 0; k < 6; k++) { const a = performance.now(); h.draw(); ren.getContext().finish(); d.push(performance.now() - a) }
        d.sort((a, b) => a - b);
        let texBytes = 0; const seen = new Set();
        h.scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) for (const k in m) { const tx = m[k]; if (tx && tx.isTexture && !seen.has(tx)) { seen.add(tx); const im = tx.image; if (im && im.width) texBytes += im.width * im.height * 4 * (tx.generateMipmaps !== false ? 1.33 : 1) } } });
        return { ...i1, stepMsMedian: +t[15].toFixed(2), stepMsP90: +t[27].toFixed(2), submitMsMedian: +c[4].toFixed(2), drawMsMedian: +d[3].toFixed(1), texMB: +(texBytes / 1048576).toFixed(1), q: h.render.q, pr: h.renderer.getPixelRatio() };
      });
      out[name] = r; console.log(name.padEnd(10), JSON.stringify(r));
      if (shots) await page.screenshot({ path: path.join(shots, name + '.jpg'), type: 'jpeg', quality: 85, timeout: 180000 });
    };
    await sample('hub', () => { });
    if (has('--levels')) {
      await sample('drive', () => { const h = window.__ht; if (h.VAN && h.VAN.obj) { h.P.pos.set(h.VAN.pos.x + 1.5, 0, h.VAN.pos.z); h.use = true; h.step(2) } });
      for (let i = 0; i < 4; i++) await sample('mission' + i, i2 => { window.__ht.startMission(i2); window.__ht.step(10) }, i).catch(e => console.log('mission', i, 'failed', e.message));
    }
  }
  out.errors = errors;
  if (errors.length) console.log('console errors:', errors.slice(0, 20));
  if (val('--json')) fs.writeFileSync(val('--json'), JSON.stringify(out, null, 1));
  await ctx.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1) });
