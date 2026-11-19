/* screenshot source vs optimised for assets: node tools/perf/ab.js outdir [tier] src1 src2 ...  (server on :8001) */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [out, tier, ...srcs] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1' } : undefined });
  const p = await b.newPage({ viewport: { width: 1200, height: 600 } });
  p.on('pageerror', e => console.log('err', e.message));
  for (const s of srcs) {
    await p.goto(`http://127.0.0.1:8001/dev/asset-ab.html?src=${encodeURIComponent(s)}&tier=${tier}`);
    await p.waitForFunction(() => window.__abDone, null, { timeout: 60000 });
    const f = path.join(out, s.replace(/^assets\//, '').replace(/[\/]/g, '_') + '.' + tier + '.jpg');
    await p.screenshot({ path: f, type: 'jpeg', quality: 85 }); console.log(f);
  }
  await b.close();
})();
