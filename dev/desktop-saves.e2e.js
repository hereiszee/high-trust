/* Packaged-build regressions for the saves fixes (fix/saves). xvfb-run -a node dev/desktop-saves.e2e.js   (HT_EXE overrides the exe)
   SAV-08 a payout is on disk even if the process is SIGKILLed right after it (no main-process debounce for urgent saves)
   SAV-12 tutorial flags land in the save file; SAV-13 graphics settings land in desktop-settings.json, not the synced save
   SAV-14 windowed size/position is remembered, and clamped back onto the display
   SAV-07 a damaged save.json + .bak: dated copy kept and the player is told where; a newer-version inner save: kept as a dated file,
          not overwritten
   C-5    without HT_TEST_HOOKS a packaged build refuses --remote-debugging-port (and so can't be driven from outside) */
'use strict';
const L = require('./audit/saves/lib.js'); const { launch, ready, diskSave, sleep, ok, info } = L;
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const GPU = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const readJSON = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { return null } };
const dialogText = p => p.evaluate(() => { const d = document.querySelector('.ht-dlg'); return d ? d.innerText.replace(/\s+/g, ' ') : null });
(async () => {
  /* ---------- SAV-08 ---------- */
  let prof = L.mkProfile('urgent'); let S = await launch(prof); let p = S.p; await ready(p);
  await p.click('.ht-title [data-act=newgame]'); await p.waitForFunction(() => window.__ht.mode === 'hub' && window.__ht.running, null, { timeout: 90000 });
  for (const n of [1, 2, 3]) {
    const cash = await p.evaluate(n => { window.HT.Save.addCash(100 * n, 'payout'); window.HT.Save.saveNow(true); return window.HT.Save.data.cash }, n);
    if (n === 3) { process.kill(S.pid, 'SIGKILL'); await S.exited } else await sleep(30);
    const sv = diskSave(prof); ok(sv && sv.cash === cash, `urgent save #${n}${n === 3 ? ', then SIGKILL at once' : ''}: on disk $${sv && sv.cash}, game $${cash}`);
  }
  /* ---------- SAV-12 / SAV-13 ---------- */
  S = await launch(prof); p = S.p; await ready(p);
  await p.evaluate(() => { const H = window.__ht; for (const [k, v] of [['gfx', 'low'], ['rscale', '70'], ['fpsCap', '30'], ['sens', 13]]) H.HUD.emit('setting', k, v) });
  /* a tutorial hint finishing: the same write tutTick makes */
  await p.evaluate(() => { const H = window.__ht; H.TUT.done.probe = 1; const st = { id: 'probe', k: '', t: '', when: () => true, done: () => true }; H.TUT.cur = st; H.TUT.t = 1; H.tutTick(.1) });
  await p.evaluate(() => window.HTDesktop.flush()); await sleep(300);
  await p.evaluate(() => window.HTDesktop.quit()); await Promise.race([S.exited, sleep(15000)]);
  const keys = (readJSON(path.join(prof, 'saves', 'save.json')) || {}).keys || {};
  const dset = readJSON(path.join(prof, 'desktop-settings.json')) || {};
  const cfg = JSON.parse(keys['ht-cfg'] || '{}'), dev = JSON.parse((dset.device || {})['ht-cfg-device'] || '{}');
  ok(!('gfx' in cfg) && !('rscale' in cfg) && !('fpsCap' in cfg) && cfg.sens === 13, 'synced save: player settings only (ht-cfg ' + keys['ht-cfg'] + ')');
  ok(dev.gfx === 'low' && String(dev.rscale) === '70' && String(dev.fpsCap) === '30', 'desktop-settings.json (this machine): graphics settings (' + JSON.stringify(dev) + ')');
  ok(/"probe":1/.test(keys['ht-tut'] || ''), 'tutorial flags are in the save file (ht-tut ' + keys['ht-tut'] + ')');
  S = await launch(prof); p = S.p; await ready(p);
  const back = await p.evaluate(() => ({ q: window.__ht.render.sel, rscale: window.__ht.render.rscale, tut: !!window.__ht.TUT.done.probe }));
  ok(back.q === 'low' && Math.abs(back.rscale - .7) < .01 && back.tut, 'relaunch: graphics and tutorial state come back ' + JSON.stringify(back));
  await S.app.close().catch(() => { });
  /* ---------- SAV-14 ---------- */
  prof = L.mkProfile('bounds');
  const { _electron } = require('playwright');
  const env = Object.assign({}, process.env, { HT_USER_DATA: prof, HT_TEST_HOOKS: '1', HT_WINDOW_SIZE: '' });
  const open = async () => { const app = await _electron.launch({ executablePath: L.EXE, args: [...GPU, '--no-sandbox', '--windowed', '--no-steam'], env, timeout: 120000 }); const w = await app.firstWindow(); await w.waitForTimeout(2500); return app };
  const bounds = app => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds());
  let app = await open();
  const scr = await app.evaluate(({ screen }) => screen.getPrimaryDisplay().workArea);
  const b0 = await bounds(app);
  ok(b0.width <= scr.width && b0.height <= scr.height, `first windowed launch fits the display (${b0.width}x${b0.height} in ${scr.width}x${scr.height})`);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 40, y: 30, width: 1000, height: 600 }));
  await sleep(1200); await app.close().catch(() => { });
  app = await open(); const b1 = await bounds(app); await app.close().catch(() => { });
  ok(Math.abs(b1.width - 1000) <= 2 && Math.abs(b1.height - 600) <= 40 && Math.abs(b1.x - 40) <= 40 && Math.abs(b1.y - 30) <= 60, 'windowed size and position remembered: ' + JSON.stringify(b1));
  const cf = path.join(prof, 'desktop-settings.json'), c = readJSON(cf); c.bounds = { x: 9000, y: 9000, width: 5000, height: 4000 }; fs.writeFileSync(cf, JSON.stringify(c));
  app = await open(); const b2 = await bounds(app); await app.close().catch(() => { });
  ok(b2.x < scr.x + scr.width && b2.y < scr.y + scr.height && b2.width <= scr.width && b2.height <= scr.height, 'an off-screen remembered window comes back on screen: ' + JSON.stringify(b2));
  /* ---------- SAV-07: damaged save.json and .bak ---------- */
  prof = L.mkProfile('corrupt'); fs.mkdirSync(path.join(prof, 'saves'), { recursive: true });
  fs.writeFileSync(path.join(prof, 'saves', 'save.json'), '{"format":"ht-desktop-save","keys":{"ht-save":"{\\"v\\":3,\\"cash\\":4'); fs.writeFileSync(path.join(prof, 'saves', 'save.json.bak'), 'garbage');
  S = await launch(prof); p = S.p; await ready(p); await sleep(2000);
  let t = await dialogText(p);
  const kept = fs.readdirSync(path.join(prof, 'saves')).filter(n => /^save\.json\.corrupt-\d{4}/.test(n));
  ok(kept.length === 1 && !!t && t.includes(kept[0]), 'damaged save + backup: kept as ' + kept[0] + ', and the dialog says where: ' + (t || '').slice(0, 240));
  await S.app.close().catch(() => { });
  /* ---------- SAV-07: newer-version inner save ---------- */
  prof = L.mkProfile('future'); fs.mkdirSync(path.join(prof, 'saves'), { recursive: true });
  fs.writeFileSync(path.join(prof, 'saves', 'save.json'), JSON.stringify({ format: 'ht-desktop-save', v: 1, keys: { 'ht-save': JSON.stringify({ v: 9, cash: 9999 }) } }));
  S = await launch(prof); p = S.p; await ready(p); await sleep(2000);
  t = await dialogText(p);
  const f = fs.readdirSync(path.join(prof, 'saves')).filter(n => /^unreadable-save-/.test(n));
  ok(f.length === 1 && (readJSON(path.join(prof, 'saves', f[0])) || {}).cash === 9999 && !!t && /newer version/.test(t) && t.includes(f[0]), 'newer-version save kept as ' + f[0] + '; dialog: ' + (t || ''));
  await p.evaluate(() => window.HTDesktop.flush()); await S.app.close().catch(() => { });
  ok((diskSave(prof) || {}).v === 9, 'and the newer save is not overwritten by launching');
  /* ---------- C-5 ---------- */
  const g = spawnSync(L.EXE, ['--dev', '--remote-debugging-port=0', '--no-sandbox', '--windowed', '--no-steam', ...GPU], { env: Object.assign({}, process.env, { HT_USER_DATA: L.mkProfile('gate'), HT_TEST_HOOKS: '' }), timeout: 60000 });
  ok(g.status === 0, 'packaged build without the test gate refuses --remote-debugging-port (exit ' + g.status + (g.error ? ', ' + g.error.message : '') + ')');
  info('done');
  console.log(L.fails ? L.fails + ' FAILED' : 'all ok'); process.exit(L.fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(99) });
