/* Desktop shell end-to-end check (Playwright's Electron driver).
   node desktop/test/e2e.js                 runs the dev shell (desktop/main.js serving the repo)
   node desktop/test/e2e.js --exe <path>    runs a packaged build (e.g. desktop/dist/linux-unpacked/high-trust)
   --shots writes docs/screenshots/steam/*.png
   Checks: title screen, new game into free roam, zero console errors, zero requests to remote hosts, pause menu with Quit to desktop,
   settings, the save file written to <profile>/saves/save.json and read back on a second launch, a scripted controller walking and
   driving the pad glyphs, Quit to desktop closing the app. Needs a display: run under xvfb-run on a headless box. */
const { _electron } = require('playwright'), path = require('path'), fs = require('fs'), os = require('os');
const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null }, has = k => process.argv.includes('--' + k);
const EXE = arg('exe'), SHOTS = has('shots'), SHOT_DIR = path.join(__dirname, '../../docs/screenshots/steam');
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-e2e-'));
/* software GL by default (headless Linux, Windows runners); HT_E2E_NATIVE_GPU=1 keeps the platform's own GL (macOS: Metal; SwiftShader isn't usable there) */
const GPU = process.env.HT_E2E_NATIVE_GPU === '1' ? [] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
/* failure evidence for CI artifacts: desktop/test-output/ */
const OUT_DIR = path.join(__dirname, '..', 'test-output');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m) };

async function launch(extra = [], env = {}) {
  const args = EXE ? [...GPU, '--no-sandbox', '--windowed', ...extra] : [path.join(__dirname, '..'), ...GPU, '--no-sandbox', '--windowed', '--no-devtools', ...extra];
  const app = await _electron.launch({ executablePath: EXE || require(path.join(__dirname, '../node_modules/electron')), args, env: Object.assign({}, process.env, { HT_USER_DATA: PROFILE, HT_WINDOW_SIZE: '1280x720', HT_TEST_HOOKS: '1' /* C-5: a packaged build only lets tests drive it */ }, env), timeout: 120000 });
  const out = []; app.process().stdout.on('data', d => out.push(String(d))); app.process().stderr.on('data', d => out.push(String(d)));
  const p = await app.firstWindow(); p.setDefaultTimeout(120000); /* software-GL runners can take over 30 s to settle a click */ const errs = [], remote = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  p.on('request', r => { const u = r.url(); if (!/^(app|data|blob):/.test(u)) remote.push(u) });
  return { app, p, errs, remote, out };
}
const shot = async (p, n) => { if (!SHOTS) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await p.waitForTimeout(700); await p.screenshot({ path: path.join(SHOT_DIR, n + '.png'), timeout: 180000 }); console.log('     shot ' + n) };
const { FAKE_PAD } = require('./fake-pad.js');

/* C-5: a packaged build started without the test gate refuses the remote-debugging switch (exits at once, no window) */
function gateCheck() {
  if (!EXE) return;
  const t0 = Date.now(), r = require('child_process').spawnSync(EXE, ['--remote-debugging-port=0', '--no-sandbox', '--windowed', '--no-steam', ...GPU],
    { env: Object.assign({}, process.env, { HT_USER_DATA: fs.mkdtempSync(path.join(os.tmpdir(), 'ht-gate-')), HT_TEST_HOOKS: '' }), timeout: 60000 });
  ok(r.status === 0 && Date.now() - t0 < 60000, 'packaged build refuses --remote-debugging-port without the test gate (exit ' + r.status + ', ' + (Date.now() - t0) + ' ms)');
}
async function deckRun() {
  let L, app, p;
  /* ---------- third launch as a Steam Deck (SteamDeck=1, 1280x800): controller prompts from the start, Interface size 110% ---------- */
  /* a fresh profile: the main run seeded Low graphics, and a saved Graphics choice (rightly) keeps Auto off the Deck rung */
  L = await launch([], { SteamDeck: '1', HT_WINDOW_SIZE: '1280x800', HT_USER_DATA: fs.mkdtempSync(path.join(os.tmpdir(), 'ht-deck-')) }); ({ app, p } = L);
  await p.waitForFunction(() => window.__ht && window.__ht.assets && window.__ht.assets.done, null, { timeout: 180000 });
  const deck = await p.evaluate(() => ({ deck: window.HTDesktop.deck, pad: document.documentElement.classList.contains('ht-pad'), deckCss: document.documentElement.classList.contains('ht-deck'), rung: window.__ht.render.auto.i, q: window.__ht.render.q, scale: window.__ht.render.scale, dpr: window.devicePixelRatio, w: innerWidth, h: innerHeight }));
  ok(deck.deck && deck.pad && deck.deckCss && deck.rung >= 2 && Math.abs(deck.dpr - 1.1) < .02, 'Steam Deck: controller prompts before any input, Interface size 110%, Deck text sizes, Auto starts a rung lower (' + JSON.stringify(deck) + ')');
  await shot(p, 'deck-title');
  ok(L.errs.length === 0 && L.remote.length === 0, 'Deck launch: zero errors, zero remote requests');
  await app.close();
}

(async () => {
  if (has('smoke')) { /* CI on Windows/macOS runners: launch to the title, no console errors, nothing remote, quit */
    const L = await launch(); const { app, p } = L;
    ok(await p.evaluate(() => !!window.HTDesktop), 'HTDesktop bridge present');
    try {
      await p.waitForFunction(() => window.__ht && window.__ht.assets && window.__ht.assets.done, null, { timeout: 300000 });
      await p.waitForSelector('.ht-title [data-act=newgame]:not([disabled])', { timeout: 120000 });
    } catch (err) {
      /* print and keep everything that explains it: page state, WebGL, console errors, the main process output and log, a screenshot */
      fs.mkdirSync(OUT_DIR, { recursive: true });
      const state = await p.evaluate(() => { let gl = null; try { const c = document.createElement('canvas'), x = c.getContext('webgl2') || c.getContext('webgl'); if (x) { const d = x.getExtension('WEBGL_debug_renderer_info'); gl = { v: x.getParameter(x.VERSION), r: d ? x.getParameter(d.UNMASKED_RENDERER_WEBGL) : x.getParameter(x.RENDERER) } } } catch (e) { gl = 'error ' + e.message }
        return { url: location.href, ht: !!window.__ht, assets: window.__ht && window.__ht.assets ? { done: window.__ht.assets.done, progress: window.__ht.assets.progress, failed: (window.__ht.assets.failed || []).slice(0, 10) } : null,
          title: !!document.querySelector('.ht-title'), loadText: (document.querySelector('.ht-load .st') || {}).textContent || null, webgl: gl } }).catch(e => ({ evalError: e.message }));
      console.log('     state: ' + JSON.stringify(state));
      console.log('     console errors: ' + JSON.stringify(L.errs.slice(0, 20)));
      console.log('     remote requests: ' + JSON.stringify(L.remote.slice(0, 10)));
      const out = L.out.join(''); console.log('     main process output (tail):\n' + out.split('\n').slice(-40).join('\n'));
      try { fs.copyFileSync(path.join(PROFILE, 'high-trust.log'), path.join(OUT_DIR, 'high-trust.log')) } catch (e) { }
      fs.writeFileSync(path.join(OUT_DIR, 'smoke-failure.json'), JSON.stringify({ state, errs: L.errs, remote: L.remote, out }, null, 2));
      await p.screenshot({ path: path.join(OUT_DIR, 'smoke-failure.png'), timeout: 60000 }).catch(() => { });
      throw err;
    }
    ok(true, 'reached the title screen');
    fs.mkdirSync(OUT_DIR, { recursive: true }); await p.screenshot({ path: path.join(OUT_DIR, 'smoke-title.png'), timeout: 180000 }).catch(() => { });
    try { fs.copyFileSync(path.join(PROFILE, 'high-trust.log'), path.join(OUT_DIR, 'high-trust.log')) } catch (e) { }
    ok(L.errs.length === 0, 'zero console errors' + (L.errs.length ? ': ' + L.errs.slice(0, 5).join(' | ') : ''));
    ok(L.remote.length === 0, 'zero remote requests' + (L.remote.length ? ': ' + L.remote.slice(0, 5).join(' ') : ''));
    /* new game, a save written to disk, quit, relaunch: Continue offered with the same save (every OS, not only Linux) */
    await p.click('.ht-title [data-act=newgame]');
    await p.waitForFunction(() => window.__ht.mode === 'hub' && window.__ht.running, null, { timeout: 180000 });
    ok(true, 'new game: free roam');
    const cash = await p.evaluate(() => { window.HT.Save.addCash(321, 'smoke'); window.HT.Save.saveNow(true); return window.HT.Save.data.cash });
    let disk = null; try { disk = JSON.parse(JSON.parse(fs.readFileSync(path.join(PROFILE, 'saves', 'save.json'), 'utf8')).keys['ht-save']) } catch (e) { }
    ok(disk && disk.cash === cash, 'save written to disk at once (' + path.join(PROFILE, 'saves', 'save.json') + ', cash ' + (disk && disk.cash) + ')');
    let exited = new Promise(r => app.process().once('exit', c => r(c)));
    await p.evaluate(() => { window.HT.Save.flush && window.HT.Save.flush(); window.HTDesktop.quit() });
    ok(await Promise.race([exited, new Promise(r => setTimeout(() => r('timeout'), 20000))]) === 0, 'HTDesktop.quit() exits cleanly');
    const L2 = await launch(); const p2 = L2.p;
    await p2.waitForFunction(() => window.__ht && window.__ht.assets && window.__ht.assets.done, null, { timeout: 300000 });
    await p2.waitForSelector('.ht-title [data-act=continue]:not([hidden])', { timeout: 120000 }).catch(() => { });
    const back = await p2.evaluate(() => ({ cont: !!document.querySelector('.ht-title [data-act=continue]:not([hidden])'), cash: window.HT.Save.data.cash, from: window.HT.Save.lastLoad.status }));
    ok(back.cont && back.cash === cash, 'relaunch: Continue offered with the same save (' + JSON.stringify(back) + ')');
    ok(L2.errs.length === 0 && L2.remote.length === 0, 'relaunch: zero console errors, zero remote requests' + (L2.errs.length ? ': ' + L2.errs.slice(0, 3).join(' | ') : '') + (L2.remote.length ? ' ' + L2.remote.slice(0, 3).join(' ') : ''));
    exited = new Promise(r => L2.app.process().once('exit', c => r(c)));
    await p2.evaluate(() => window.HTDesktop.quit()); await Promise.race([exited, new Promise(r => setTimeout(r, 20000))]);
    let lg = ''; try { lg = fs.readFileSync(path.join(PROFILE, 'high-trust.log'), 'utf8'); fs.copyFileSync(path.join(PROFILE, 'high-trust.log'), path.join(OUT_DIR, 'high-trust.log')) } catch (e) { }
    const nf = lg.split('\n').filter(l => l.startsWith('[app] 404') || l.includes('[net] blocked'));
    ok(nf.length === 0, 'no 404s or blocked requests in the shell log' + (nf.length ? ': ' + nf.slice(0, 5).join(' | ') : ''));
    gateCheck();
    console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0) }
  if (has('deck-only')) { await deckRun(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0) }
  /* software GL: start on Low graphics so frames come faster (the saved settings live in the same file as the save) */
  fs.mkdirSync(path.join(PROFILE, 'saves'), { recursive: true });
  fs.writeFileSync(path.join(PROFILE, 'saves', 'save.json'), JSON.stringify({ format: 'ht-desktop-save', v: 1, keys: { 'ht-cfg': JSON.stringify({ gfx: 'low' }) } }));
  console.log('profile ' + PROFILE + (EXE ? ' · exe ' + EXE : ' · dev shell'));
  /* ---------- first launch ---------- */
  let L = await launch(); let { app, p } = L;
  ok(await p.evaluate(() => !!window.HTDesktop && window.HTDesktop.shell === 'electron'), 'HTDesktop bridge present (contextIsolation on, no Node in the page: ' + await p.evaluate(() => typeof require) + ')');
  ok(p.url().startsWith('app://game/'), 'loaded from local files: ' + p.url());
  await p.waitForFunction(() => window.__ht && window.__ht.assets && window.__ht.assets.done, null, { timeout: 180000 });
  await p.waitForSelector('.ht-title [data-act=newgame]:not([disabled])', { timeout: 60000 });
  ok(await p.evaluate(() => !navigator.serviceWorker || navigator.serviceWorker.controller == null), 'no service worker in control');
  ok(await p.isVisible('.ht-title [data-act=quitDesktop]'), 'title screen has Quit to desktop');
  await shot(p, 'title');
  await p.click('.ht-title [data-act=newgame]');
  await p.waitForFunction(() => window.__ht.mode === 'hub' && window.__ht.running, null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  ok(true, 'new game: free roam (mode ' + await p.evaluate(() => window.__ht.mode) + ', region ' + await p.evaluate(() => window.__ht.region) + ')');
  await shot(p, 'free-roam');
  /* pause menu */
  await p.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await p.waitForSelector('.ht-pause [data-act=quitDesktop]', { timeout: 10000 }).catch(() => { });
  ok(await p.isVisible('.ht-pause [data-act=quitDesktop]'), 'pause menu shows Quit to desktop');
  await shot(p, 'pause-menu');
  await p.click('.ht-pause [data-tab=display]');
  const disp = await p.evaluate(() => [...document.querySelectorAll('.ht-pane label')].map(l => l.firstChild.textContent.trim()));
  ok(['Quality', 'Resolution scale', 'Frame rate cap', 'Display mode', 'VSync'].every(x => disp.includes(x)), 'display settings: ' + disp.join(', '));
  await shot(p, 'settings-display');
  /* resolution scale applies */
  const pr0 = await p.evaluate(() => window.__ht.renderer.getPixelRatio());
  await p.evaluate(() => { const r = document.querySelector('#hts-rscale'); r.value = 50; r.dispatchEvent(new Event('input')) });
  const pr1 = await p.evaluate(() => window.__ht.renderer.getPixelRatio());
  ok(pr1 < pr0 || pr0 <= .5, 'resolution scale 50% lowers the pixel ratio (' + pr0 + ' -> ' + pr1 + ')');
  await p.evaluate(() => { const r = document.querySelector('#hts-rscale'); r.value = 100; r.dispatchEvent(new Event('input')) });
  await p.click('.ht-pause [data-tab=keys]');
  ok(await p.isVisible('.ht-padkeys'), 'controls screen lists the controller layout');
  await shot(p, 'settings-controls');
  await p.click('.ht-pause [data-act=resume]');
  /* controller (scripted pad). Software GL renders free roam at a few fps, so every press is held until its effect shows up. */
  await p.evaluate(FAKE_PAD);
  const hold = async (o, until, ms = 20000) => { await p.evaluate(o => window.__pad.set(o), o); const r = await p.waitForFunction(until, null, { timeout: ms }).then(() => true, () => false);
    const off = { axes: [0, 0, 0, 0], buttons: {} }; for (const k in (o.buttons || {})) off.buttons[k] = 0; await p.evaluate(o => window.__pad.set(o), off);
    await p.waitForFunction(ks => ks.every(k => !window.HT.Pad.S.prev[k]), Object.keys(o.buttons || {}), { timeout: ms }).catch(() => { }); return r };
  const before = await p.evaluate(() => ({ x: window.__ht.P.pos.x, z: window.__ht.P.pos.z }));
  ok(await hold({ axes: [0, -1, 0, 0] }, () => window.HT.Input.stick.id === 'pad' && window.HT.Input.stick.y < -.9 && (window.__ht.step(30), true)), 'left stick drives the analog walk input');
  const after = await p.evaluate(() => ({ x: window.__ht.P.pos.x, z: window.__ht.P.pos.z, pad: document.documentElement.classList.contains('ht-pad') }));
  const moved = Math.hypot(after.x - before.x, after.z - before.z);
  ok(after.pad && moved > 1, 'the dad walks (' + moved.toFixed(2) + ' m in 1 s of game time), html.ht-pad set');
  const yaw0 = await p.evaluate(() => window.__ht.P.yaw);
  await p.evaluate(() => window.__pad.set({ axes: [0, 0, 1, 0] })); await p.waitForFunction(y => Math.abs(window.__ht.P.yaw - y) > .1, yaw0, { timeout: 20000 }).catch(() => { }); await p.evaluate(() => window.__pad.set({ axes: [0, 0, 0, 0] }));
  ok(Math.abs(await p.evaluate(() => window.__ht.P.yaw) - yaw0) > .1, 'right stick turns the camera');
  /* into the van: the driving hint keycaps become pad glyphs */
  await p.evaluate(() => { const H = window.__ht; H.P.pos.set(H.VAN.pos.x + 2.2, 0, H.VAN.pos.z); H.enterVan() });
  await p.waitForFunction(() => [...document.querySelectorAll('.ht-drv .hint .ht-kc')].map(e => e.textContent).join(',') === 'X,A,Y,R3', null, { timeout: 20000 }).catch(() => { });
  const gl = await p.evaluate(() => [...document.querySelectorAll('.ht-drv .hint .ht-kc')].map(e => e.textContent));
  ok(gl.join(',') === 'X,A,Y,R3', 'driving hints show pad glyphs: ' + gl.join(','));
  ok(await hold({ buttons: { 7: 1 } }, () => window.HT.Input.stick.y < -.9 && (window.__ht.step(30), true)) && await p.evaluate(() => Math.abs((window.__ht.CV || window.__ht.VAN).spd || 0)) > .5,
    'RT is the throttle (van at ' + (await p.evaluate(() => Math.abs((window.__ht.CV || window.__ht.VAN).spd || 0))).toFixed(1) + ' m/s)');
  await shot(p, 'controller-driving');
  await p.evaluate(() => { const H = window.__ht, e = H.CV || H.VAN; e.spd = 0; if (e.car) e.car.spd = 0; H.step(5) }); /* you can't step out at speed */
  ok(await hold({ buttons: { 3: 1 } }, () => !window.__ht.VAN.on), 'Y gets out of the van');
  /* Menu opens pause; the D-pad moves a focus ring; B closes it */
  ok(await hold({ buttons: { 9: 1 } }, () => window.HT.Input.paused), 'Menu pauses');
  await hold({ buttons: { 13: 1 } }, () => !!document.querySelector('.pad-focus'));
  const foc = await p.evaluate(() => { const f = document.querySelector('.pad-focus'); return f ? f.textContent.trim() : null });
  ok(!!foc, 'D-pad moves the menu focus (on "' + foc + '")');
  await shot(p, 'controller-pause');
  ok(await hold({ buttons: { 1: 1 } }, () => !window.HT.Input.paused && window.HT.Input.running), 'B backs out of the pause menu');
  /* save: write a marker through the game's own save, then quit from the pause menu */
  await p.evaluate(() => { window.HT.Save.data.cash = 4321; window.HT.Save.saveNow() });
  await p.waitForTimeout(800);
  const file = path.join(PROFILE, 'saves', 'save.json');
  let saved = null; try { saved = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { }
  ok(saved && saved.keys && JSON.parse(saved.keys['ht-save']).cash === 4321, 'save written to ' + file);
  ok(saved && saved.keys && !!saved.keys['ht-cfg'], 'settings saved in the same file (ht-cfg)');
  ok(L.errs.length === 0, 'zero console errors' + (L.errs.length ? ': ' + L.errs.slice(0, 5).join(' | ') : ''));
  ok(L.remote.length === 0, 'zero remote requests' + (L.remote.length ? ': ' + L.remote.slice(0, 5).join(' ') : ''));
  const blocked = L.out.join('').split('\n').filter(l => l.includes('[net] blocked'));
  ok(blocked.length === 0, 'main process blocked nothing' + (blocked.length ? ': ' + blocked.slice(0, 3).join(' ') : ''));
  { let lg = ''; try { lg = fs.readFileSync(path.join(PROFILE, 'high-trust.log'), 'utf8') } catch (e) { } const nf = lg.split('\n').filter(l => l.startsWith('[app] 404')); ok(nf.length === 0, 'no missing game files' + (nf.length ? ': ' + nf.slice(0, 5).join(' ') : '')) }
  { let lg = ''; try { lg = fs.readFileSync(path.join(PROFILE, 'high-trust.log'), 'utf8') } catch (e) { } console.log('     ' + (lg.split('\n').find(l => l.startsWith('[steam]')) || 'steam: no log line')) }
  await p.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); await p.waitForTimeout(400);
  const closed = new Promise(r => app.process().once('exit', code => r(code)));
  await p.click('.ht-pause [data-act=quitDesktop]');
  const code = await Promise.race([closed, new Promise(r => setTimeout(() => r('timeout'), 15000))]);
  ok(code === 0, 'Quit to desktop exits the app (code ' + code + ')');
  if (code === 'timeout') await app.close().catch(() => { });
  /* ---------- second launch: the save comes back ---------- */
  L = await launch(); ({ app, p } = L);
  await p.waitForFunction(() => window.__ht && window.__ht.assets && window.__ht.assets.done, null, { timeout: 180000 });
  const back = await p.evaluate(() => ({ cash: window.HT.Save.data.cash, from: window.HTDesktop.saveFrom, status: window.HT.Save.lastLoad.status }));
  ok(back.cash === 4321, 'second launch reads the save back: ' + JSON.stringify(back));
  ok(await p.isVisible('.ht-title [data-act=continue]'), 'title offers Continue');
  ok(L.errs.length === 0 && L.remote.length === 0, 'second launch: zero errors, zero remote requests');
  await app.close();
  await deckRun();
  gateCheck();
  console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
