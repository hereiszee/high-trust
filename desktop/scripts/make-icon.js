/* node desktop/scripts/make-icon.js : renders desktop/build/icon.png (1024 px) from the title logo (roof + "HT" in Bowlby One).
   electron-builder turns it into icon.ico / icon.icns. Uses the repo's Playwright Chromium. */
const { chromium } = require('playwright'), path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..'), font = fs.readFileSync(path.join(ROOT, 'assets/fonts/bowlby-one-400.woff2')).toString('base64');
const html = `<style>@font-face{font-family:B;src:url(data:font/woff2;base64,${font})}html,body{margin:0;background:transparent}
.i{width:1024px;height:1024px;border-radius:200px;background:radial-gradient(circle at 30% 20%,#2a2f37,#16181c 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box}
svg{width:640px;height:184px;color:#ffc94a;margin-bottom:24px}.t{font:400 420px/.8 B;color:#fff;letter-spacing:-8px}.t b{font-weight:400;color:#ffc94a}</style>
<div class="i"><svg viewBox="0 0 118 34" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><path d="M4 30L59 5l55 25"/><path d="M88 18V7h10v15" stroke-width="5"/></svg><div class="t">H<b>T</b></div></div>`;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  await p.setContent(html); await p.evaluate(() => document.fonts.ready);
  const out = path.join(__dirname, '..', 'build', 'icon.png'); fs.mkdirSync(path.dirname(out), { recursive: true });
  await p.locator('.i').screenshot({ path: out, omitBackground: true }); await b.close(); console.log('wrote', out) })();
