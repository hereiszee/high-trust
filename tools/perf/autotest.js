/* Auto quality controller check: fake slow / fast frames and watch the ladder. node tools/perf/autotest.js */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1' } : undefined });
  const p = await b.newPage(); p.on('pageerror', e => console.log('err', e.message));
  await p.goto('http://127.0.0.1:8001/'); await p.waitForFunction(() => (()=>{const b=document.querySelector('.ht-title [data-act=newgame]')||document.getElementById('bStart');return !!b&&!b.disabled})(), null, { timeout: 120000 });
  const r = await p.evaluate(async () => {
    const h = window.__ht, R = h.render, log = []; (document.querySelector('.ht-title [data-act=newgame]')||document.getElementById('bStart')).click();
    let t = performance.now(); const real = performance.now.bind(performance); const run = (ms, n) => { for (let i = 0; i < n; i++) { t += ms; performance.now = () => t; R.draw = R.draw; } };
    /* drive autoTick through R.draw's clock: call the controller via draw with a fake clock (rendering skipped) */
    const draw = R.draw; const sk = h.renderer.render; h.renderer.render = () => { };
    const step = (ms, n) => { for (let i = 0; i < n; i++) { t += ms; performance.now = () => t; try { draw() } catch (e) { } } performance.now = real; log.push(ms + 'ms x' + n + ' -> ' + R.q + ' ' + R.scale + ' pr ' + h.renderer.getPixelRatio()) };
    step(16.7, 400); step(30, 200); step(30, 200); step(45, 200); step(16.7, 600); step(16.7, 3000);
    h.renderer.render = sk; return log;
  });
  console.log(r.join('\n')); await b.close();
})();
