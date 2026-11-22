/* Audit probe (saves): every pause-menu setting in the PACKAGED Linux build, changed through the settings UI (clicks on the toggles and
   segment buttons, range inputs as the e2e test does), then Quit to desktop and a second launch: does each one persist and apply?
   Also: key rebinding incl. a conflict (swap), Aim Hold, Reset to defaults, New game keeps settings, the tutorial flags' location.
   Run: xvfb-run -a node dev/audit/saves/desktop-settings.js */
'use strict';
const L = require('./lib.js'); const { launch, ready, disk, sleep, ok, info } = L;
const fs = require('fs'), path = require('path');
const tab = (p, t) => L.click(p, `.ht-pause [data-tab=${t}]`);
const range = (p, k, v) => p.evaluate(([k, v]) => { const r = document.querySelector('#hts-' + k); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })) }, [k, v]);
const seg = (p, k, v) => p.click(`.ht-seg3[data-k=${k}] button[data-v="${v}"]`);
const tog = (p, k) => p.click(`#hts-${k}`);

(async () => {
  const prof = L.mkProfile('settings'); let S = await launch(prof); let p = S.p; await ready(p);
  await L.click(p, '.ht-title [data-act=newgame]'); await p.waitForFunction(() => window.__ht.mode === 'hub' && window.__ht.running, null, { timeout: 60000 }); await sleep(1500);
  let opened = false;
  for (let i = 0; i < 4 && !opened; i++) { await p.keyboard.press('Escape'); opened = await p.waitForSelector('.ht-pause [data-tab=controls]', { timeout: 5000 }).then(() => true, () => false);
    if (!opened) info('Esc #' + (i + 1) + ' did not open pause: ' + JSON.stringify(await p.evaluate(() => ({ mode: window.__ht.mode, running: window.__ht.running, paused: HT.Input && HT.Input.paused, dlg: document.querySelector('.ht-dlg')?.innerText?.slice(0, 80), scr: [...document.querySelectorAll('.ht-scr')].map(e => e.className) })))) }
  if (!opened) { await p.screenshot({ path: L.ROOT + '/docs/audit/saves/settings-esc.png' }); throw new Error('pause never opened') }
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.ht-pause [data-tab]')].map(b => b.dataset.tab)); info('pause tabs: ' + tabs.join(','));
  await tab(p, 'controls'); await range(p, 'sens', 15); await range(p, 'ads', 80); await tog(p, 'invert'); await tog(p, 'fp'); await seg(p, 'streetTrouble', 'calm');
  await tab(p, 'display'); await range(p, 'fov', 90); await seg(p, 'gfx', 'low'); await range(p, 'rscale', 70); await seg(p, 'fpsCap', '30');
  await seg(p, 'dispMode', 'win'); await tog(p, 'vsync'); await seg(p, 'uiScale', '1.25'); await tog(p, 'subs'); await tog(p, 'mmRotate');
  await tab(p, 'audio'); for (const [k, v] of [['master', 0], ['music', 20], ['sfx', 40], ['ambience', 10]]) await range(p, k, v);
  const live = await p.evaluate(() => ({ dpr: devicePixelRatio, q: window.__ht.render.q, rscale: window.__ht.render.rscale }));
  info('applied live: ' + JSON.stringify(live));
  /* key bindings: Aim -> Hold, Reload -> T, Use -> Q (Next gun's key: a conflict, should swap) */
  await tab(p, 'keys'); await p.click('[data-aim] button[data-v=hold]');
  await p.click('[data-rebind=reload]'); await sleep(100); await p.keyboard.press('t'); await sleep(300);
  await p.click('[data-rebind=use]'); await sleep(100); await p.keyboard.press('q'); await sleep(300);
  const k1 = await p.evaluate(() => ({ aim: HT.Keys.aimMode, reload: HT.Keys.get('reload'), use: HT.Keys.get('use'), gun: HT.Keys.get('gun'), note: document.querySelector('.ht-rb-note')?.textContent }));
  ok(k1.reload === 't' && k1.use === 'q' && k1.gun === 'e', 'rebinding in session, conflict swaps: ' + JSON.stringify(k1));
  ok(k1.aim === 'hold', 'clicking Aim: Hold in Key bindings sets HT.Keys.aimMode (now ' + k1.aim + ', button shows ' + await p.evaluate(() => document.querySelector('[data-aim] button[aria-pressed=true]')?.dataset.v) + ')');
  const cfg1 = await p.evaluate(() => JSON.parse(window.HTDesktop.storage.getItem('ht-cfg'))); info('ht-cfg before quit: ' + JSON.stringify(cfg1));
  /* Esc closes the pause menu: open it again and use Quit to desktop */
  for (let i = 0; i < 4 && !(await p.evaluate(() => !!document.querySelector('.ht-pause [data-act=quitDesktop]'))); i++) { await p.keyboard.press('Escape'); await sleep(1200) }
  await sleep(800); await p.evaluate(() => document.querySelector('.ht-pause [data-act=quitDesktop]').click()); info('quit: ' + JSON.stringify(await Promise.race([S.exited, sleep(15000).then(() => 'timeout')])));
  const dset = JSON.parse(fs.readFileSync(path.join(prof, 'desktop-settings.json'), 'utf8')); info('desktop-settings.json: ' + JSON.stringify(dset));
  const keys = disk(prof); info('save.json keys: ' + Object.keys(keys).join(','));

  /* ---------- second launch, no --windowed flag (so Display mode comes from the setting) ---------- */
  const { _electron } = require('playwright');
  const app2 = await _electron.launch({ executablePath: L.EXE, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--no-steam'], env: Object.assign({}, process.env, { HT_USER_DATA: prof, HT_WINDOW_SIZE: '1280x720' }), timeout: 120000 });
  p = await app2.firstWindow(); await ready(p);
  const sw = await app2.evaluate(({ app, BrowserWindow }) => ({ vsyncOff: app.commandLine.hasSwitch('disable-gpu-vsync'), fs: BrowserWindow.getAllWindows()[0].isFullScreen(), zoom: BrowserWindow.getAllWindows()[0].webContents.getZoomFactor() }));
  const g = await p.evaluate(() => { const H = window.__ht, C = JSON.parse(window.HTDesktop.storage.getItem('ht-cfg') || '{}');
    return { CFG: C, q: H.render.q, sel: H.render.sel, rscale: H.render.rscale, fp: H.P.fp, dpr: devicePixelRatio, subsOn: H.HUD.settings.subs, mmRotate: H.HUD.settings.mmRotate, aim: HT.Keys.aimMode, reload: HT.Keys.get('reload'), use: HT.Keys.get('use'), gun: HT.Keys.get('gun'), hs: Object.assign({}, H.HUD.settings) } });
  info('second launch: ' + JSON.stringify({ sw, g }));
  const C = g.CFG;
  ok(C.sens == 15 && C.ads == 80, `Look/Aim speed persist (sens ${C.sens}, ads ${C.ads})`);
  ok(C.inv === true, 'Invert look persists (CFG.inv ' + C.inv + ')');
  ok(g.fp === true, 'First person persists (P.fp ' + g.fp + ')');
  ok(C.streetTrouble === 'calm', 'Riverside calm persists (' + C.streetTrouble + ')');
  ok(C.fov == 90, 'FOV persists (' + C.fov + ')');
  ok(g.q === 'low', 'Quality Low applies on launch (render.q ' + g.q + ', sel ' + g.sel + ')');
  ok(Math.abs(g.rscale - .7) < .01, 'Resolution scale 70% applies on launch (' + g.rscale + ')');
  ok(String(C.fpsCap) === '30' && g.hs.fpsCap === '30', 'Frame rate cap persists and shows (CFG ' + C.fpsCap + ', shown ' + g.hs.fpsCap + ')');
  ok(!sw.fs && g.hs.dispMode === 'win', 'Windowed persists (fullscreen ' + sw.fs + ', shown ' + g.hs.dispMode + ')');
  ok(sw.vsyncOff && g.hs.vsync === false, 'VSync off applies after restart (switch ' + sw.vsyncOff + ', shown ' + g.hs.vsync + ')');
  ok(Math.abs(g.dpr - 1.25) < .02 && g.hs.uiScale === '1.25', 'Interface size 125% applies on launch (dpr ' + g.dpr + ', zoom ' + sw.zoom + ', shown ' + g.hs.uiScale + ')');
  ok(g.subsOn === false && g.mmRotate === false, 'Subtitles off / Rotate minimap off persist (' + g.subsOn + ', ' + g.mmRotate + ')');
  ok(C.master === 0 && C.music == 20 && C.sfx == 40 && C.ambience == 10 && g.hs.master === 0, 'volumes persist, master 0 stays 0 (CFG ' + [C.master, C.music, C.sfx, C.ambience] + ', shown master ' + g.hs.master + ')');
  ok(g.aim === 'hold' && g.reload === 't' && g.use === 'q' && g.gun === 'e', 'key bindings + Aim Hold persist (' + [g.aim, g.reload, g.use, g.gun] + ')');
  /* New game must not touch settings or bindings */
  await L.click(p, '.ht-title [data-act=newgame]'); await sleep(800);
  if (await p.isVisible('.ht-dlg [data-dlg=ok]')) await p.click('.ht-dlg [data-dlg=ok]');
  await p.waitForFunction(() => window.__ht.mode === 'hub', null, { timeout: 60000 }); await sleep(1000);
  const ng = await p.evaluate(() => ({ cfg: !!window.HTDesktop.storage.getItem('ht-cfg'), reload: HT.Keys.get('reload'), q: window.__ht.render.q }));
  ok(ng.cfg && ng.reload === 't' && ng.q === 'low', 'New game keeps settings and bindings: ' + JSON.stringify(ng));
  /* volumes really silent: the audio module's master gain */
  /* Reset to defaults (key bindings) */
  await p.keyboard.press('Escape'); await p.waitForSelector('.ht-pause [data-tab=keys]'); await tab(p, 'keys'); await L.click(p, '[data-rebind-reset]'); await sleep(300);
  const rs = await p.evaluate(() => ({ aim: HT.Keys.aimMode, reload: HT.Keys.get('reload'), use: HT.Keys.get('use'), stored: window.HTDesktop.storage.getItem('ht-keys') }));
  ok(rs.aim === 'toggle' && rs.reload === 'r' && rs.use === 'e', 'Key bindings Reset to defaults: ' + JSON.stringify(rs));
  /* the tutorial flags: where do they live? */
  const tut = await p.evaluate(() => ({ inSaveFile: window.HTDesktop.storage.getItem('ht-tut'), inLocalStorage: localStorage.getItem('ht-tut') }));
  info('ht-tut: ' + JSON.stringify(tut));
  ok(tut.inSaveFile != null || tut.inLocalStorage == null, 'tutorial flags live in the save file (cloud-synced) like settings: ' + JSON.stringify(tut));
  await app2.close().catch(() => { });
  console.log(L.fails ? L.fails + ' FAILED' : 'all ok'); process.exit(L.fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(99) });
