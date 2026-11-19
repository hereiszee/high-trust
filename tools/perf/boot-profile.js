/* where Stage A time goes on the main thread: node tools/perf/boot-profile.js [url] */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1' } : undefined });
  const p = await b.newPage();
  await p.addInitScript(() => { const r = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = f => setTimeout(() => r(f), 200);
    window.__marks = []; const mark = n => window.__marks.push([n, Math.round(performance.now())]);
    document.addEventListener('DOMContentLoaded', () => mark('DOMContentLoaded'));
    const iv = setInterval(() => { if (window.THREE && !window.__m1) { window.__m1 = 1; mark('three ready') } if (window.__htBoot && !window.__m2) { window.__m2 = 1; window.__htBoot.pack.then(() => mark('boot pack received'), () => mark('boot pack failed')) }
      const a = window.__ht && window.__ht.assets; if (a && !window.__m3) { window.__m3 = 1; mark('game script done'); a.ready.then(() => mark('ASSETS.ready')) }
      if ((()=>{const b=document.querySelector('.ht-title [data-act=newgame]')||document.getElementById('bStart');return !!b&&!b.disabled})() && !window.__m4) { window.__m4 = 1; mark('Start enabled'); clearInterval(iv) } }, 5) });
  await p.goto(process.argv[2] || 'http://127.0.0.1:8001/');
  await p.waitForFunction(() => window.__m4, null, { timeout: 60000 });
  console.log((await p.evaluate(() => window.__marks)).map(m => m.join(' @ ')).join('\n'));
  const t = await p.evaluate(() => { const h = window.__ht; const a = performance.now(); h.enterHub(); const b = performance.now(); h.draw(); const c = performance.now(); h.draw(); return { enterHubMs: b - a, firstDrawMs: c - b, secondDrawMs: performance.now() - c } });
  console.log(JSON.stringify(t)); await b.close();
})();
