/* time spent inside the render call vs the rest of the real rAF frame: node tools/perf/frame-split.js [url] */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(process.argv[2] || 'http://127.0.0.1:8001/');
  await p.waitForFunction(() => (()=>{const b=document.querySelector('.ht-title [data-act=newgame]')||document.getElementById('bStart');return !!b&&!b.disabled})());
  await p.evaluate(() => { (document.querySelector('.ht-title [data-act=newgame]')||document.getElementById('bStart')).click(); window.__ht.render.apply('med') });
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => new Promise(res => {
    const R = window.__ht.render, d = R.draw, gl = window.__ht.renderer.getContext(); let inDraw = 0, fin = 0, n = 0; const t0 = performance.now();
    R.draw = () => { const a = performance.now(); d(); const b = performance.now(); gl.finish(); fin += performance.now() - b; inDraw += b - a; n++ };
    setTimeout(() => { R.draw = d; res({ frames: n, wallMs: Math.round(performance.now() - t0), drawCpuMs: +(inDraw / n).toFixed(1), gpuWaitMs: +(fin / n).toFixed(1) }) }, 6000) }));
  console.log(JSON.stringify(r)); await b.close();
})();
