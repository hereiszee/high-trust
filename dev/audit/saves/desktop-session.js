/* Audit probe (saves): a real session in the PACKAGED Linux build, then what survives each way of leaving.
   Run (repo root, after `cd desktop && npx electron-builder -c electron-builder.config.js --linux --dir`):
     xvfb-run -a node dev/audit/saves/desktop-session.js
   Stage A: new game (real click) -> Maple -> Hardware store -> Riverside -> Fort Sensible -> home -> job 1 (gary) -> job 2 (earl), tracking
            remote requests, page errors and [app] 404s in the shell log.
   Stage B: zip-tie inside a job, quit the job from the pause menu (real keys/clicks), check what trust/cuff counts persist.
   Stage C: first session: Quit to title -> is Continue offered?
   Stage D: SIGKILL straight after a job's result card; SIGTERM with a debounced save pending; window close (the WM's X / Alt+F4 path).
   Stage E: second instance. */
'use strict';
const L = require('./lib.js'); const { launch, ready, diskSave, log404, sleep, ok, info } = L;
const fs = require('fs'), path = require('path'), { spawnSync, spawn } = require('child_process');

const stepN = (p, n) => p.evaluate(n => { const H = window.__ht; for (let i = 0; i < n; i += 15) H.step(15) }, n);
async function gotoPlace(p, id) {
  const r = await p.evaluate(id => { const H = window.__ht; if (!H.VAN.on) { H.P.pos.set(H.VAN.pos.x + 2, 0, H.VAN.pos.z); H.enterVan() } return H.fastTravel(id) }, id);
  await sleep(1500); await stepN(p, 60); await sleep(1500); return r;
}
async function startJob(p, id) { await p.evaluate(id => window.__ht.jobs.start(id), id); await p.waitForFunction(() => window.__ht.mode === 'mission', null, { timeout: 60000 }); await sleep(2000); await stepN(p, 90) }

(async () => {
  /* ================= A ================= */
  const prof = L.mkProfile('session'); let S = await launch(prof); let p = S.p;
  await ready(p);
  await p.click('.ht-title [data-act=newgame]');
  await p.waitForFunction(() => window.__ht.mode === 'hub' && window.__ht.running, null, { timeout: 60000 });
  await sleep(2000); await stepN(p, 60);
  ok(await gotoPlace(p, 'hank'), 'fast travel to the hardware store (Maple)');
  await p.evaluate(() => { window.__ht.exitVehicle && window.__ht.exitVehicle(); window.__ht.openShop('hardware') }); await sleep(2500);
  const shopOpen = await p.evaluate(() => !!(window.HT.Menus && window.HT.Menus.isOpen && window.HT.Menus.isOpen()));
  ok(shopOpen, 'hardware store menu opened');
  await p.keyboard.press('Escape'); await sleep(800); await p.keyboard.press('Escape'); await sleep(800);
  await p.evaluate(() => { if (!window.__ht.running && window.HT.Input && window.HT.Input.paused) document.querySelector('.ht-pause [data-act=resume]')?.click() });
  await p.evaluate(() => window.__ht.openBridge());
  ok(await gotoPlace(p, 'center'), 'fast travel to Riverside (community center)');
  info('region now ' + await p.evaluate(() => window.__ht.region));
  ok(await gotoPlace(p, 'base'), 'fast travel to Fort Sensible');
  info('region now ' + await p.evaluate(() => window.__ht.region));
  await p.evaluate(() => { const H = window.__ht; if (H.CV) H.exitVehicle(); H.homeInit && H.homeInit() }); await sleep(4000);
  const home = await p.evaluate(async () => { const H = window.__ht; for (let i = 0; i < 60 && !H.enterHome(); i++) await new Promise(r => setTimeout(r, 1000)); return H.mode });
  ok(home === 'home', 'entered home (mode ' + home + ')'); await sleep(3000);
  await p.evaluate(() => window.__ht.exitHome()); await sleep(2500);
  for (const id of ['gary', 'earl']) {
    await startJob(p, id);
    const t0 = Date.now(); await p.evaluate(() => window.__ht.jobs.finish(true)); await sleep(3000);
    const sv = diskSave(prof);
    ok(sv && sv.jobs[id] && sv.jobs[id].done, `job ${id} finished: on disk done=${!!(sv && sv.jobs[id] && sv.jobs[id].done)} cash=${sv && sv.cash} (${Date.now() - t0} ms after finish)`);
    await p.evaluate(() => { const b = document.querySelector('[data-act="result:go"]'); if (b) b.click() }); await sleep(4000);
    await p.evaluate(() => { const H = window.__ht; if (H.mode === 'home') H.exitHome() }); await sleep(2500);
  }
  const nf = log404(prof);
  ok(nf.length === 0, 'no 404s / blocked requests in the shell log over the session' + (nf.length ? ': ' + nf.slice(0, 8).join(' | ') : ''));
  ok(S.remote.length === 0, 'zero remote requests' + (S.remote.length ? ': ' + S.remote.slice(0, 5).join(' ') : ''));
  ok(S.errs.length === 0, 'zero page errors' + (S.errs.length ? ': ' + S.errs.slice(0, 6).join(' | ') : ''));

  /* ================= B: zip-tie inside a job, then quit the job ================= */
  const before = diskSave(prof).prog;
  await startJob(p, 'gary');
  const cuffed = await p.evaluate(async () => {
    const H = window.__ht; const e = H.enemies.find(x => x.state !== 'dead');
    if (!e) return 'no enemy'; e.state = 'surrender'; e.surrT = 0; H.P.pos.set(e.pos.x + 1, 0, e.pos.z); H.P.yaw = Math.atan2(-(e.pos.x - H.P.pos.x), -(e.pos.z - H.P.pos.z));
    return { t0: H.prog.trust, c0: H.prog.cuffed } });
  /* a real E press (the zip-tie prompt) */
  for (let i = 0; i < 6; i++) { await p.keyboard.down('e'); await stepN(p, 3); await sleep(150); await p.keyboard.up('e'); await stepN(p, 3) }
  const mid = await p.evaluate(() => ({ trust: window.__ht.prog.trust, cuffed: window.__ht.prog.cuffed, state: window.__ht.M && window.__ht.M.state }));
  info('zip-tie in job: before ' + JSON.stringify(cuffed) + ' after ' + JSON.stringify(mid));
  /* pause -> Quit to title -> confirm (real key + clicks) */
  await p.keyboard.press('Escape'); await p.waitForSelector('.ht-pause [data-act=quit]', { timeout: 10000 }).catch(() => { });
  info('pause open: ' + await p.isVisible('.ht-pause [data-act=quit]'));
  await p.click('.ht-pause [data-act=quit]'); await p.waitForSelector('.ht-dlg [data-dlg=ok]', { timeout: 10000 }).catch(() => { });
  info('confirm dialog: ' + await p.evaluate(() => document.querySelector('.ht-dlg')?.innerText.replace(/\s+/g, ' ')));
  await p.click('.ht-dlg [data-dlg=ok]');
  await p.waitForFunction(() => window.__ht.mode === 'title', null, { timeout: 30000 }).catch(() => { });
  await sleep(1000);
  const atTitle = await p.evaluate(() => ({ mode: window.__ht.mode, cont: !!document.querySelector('.ht-title [data-act=continue]:not([hidden])'), ng: document.querySelector('.ht-title [data-act=newgame]')?.textContent, trust: window.__ht.prog.trust, cuffed: window.__ht.prog.cuffed, lastLoad: window.HT.Save.lastLoad.status }));
  info('after quitting the job: ' + JSON.stringify(atTitle));
  /* Stage C: first session -> title */
  ok(atTitle.cont, `first session, Quit to title: Continue offered (cont=${atTitle.cont}, main button "${atTitle.ng}", lastLoad=${atTitle.lastLoad})`);
  /* fix/saves: with Continue offered (SAV-06) the main button is Continue; New game now asks first */
  await p.click(atTitle.cont ? '.ht-title [data-act=continue]' : '.ht-title [data-act=newgame]'); await p.waitForFunction(() => window.__ht.mode === 'hub', null, { timeout: 60000 }); await sleep(1500);
  const resumed = await p.evaluate(() => ({ cash: window.HT.Save.data.cash, garyDone: !!window.HT.Save.data.jobs.gary?.done }));
  info('pressing the main title button ("' + atTitle.ng + '") after that: ' + JSON.stringify(resumed) + ' (same save, no new game)');
  /* any later autosave (a purchase) writes the abandoned job's trust/cuffs */
  await p.evaluate(() => { window.HT.Save.addCash(1, 'probe'); window.HT.Save.saveNow() }); await sleep(1200);
  const after = diskSave(prof).prog;
  ok(!(after.cuffed > before.cuffed || after.trust > before.trust), `abandoned job leaves no trace: on disk before job trust=${before.trust} cuffed=${before.cuffed}; after quitting it trust=${after.trust} cuffed=${after.cuffed}`);

  /* ================= D1: SIGKILL right after a result card ================= */
  await startJob(p, 'gary');
  const cashBefore = await p.evaluate(() => window.HT.Save.data.cash);
  await p.evaluate(() => window.__ht.jobs.finish(true)); await sleep(150);
  const cashShown = await p.evaluate(() => window.HT.Save.data.cash);
  process.kill(S.pid, 'SIGKILL'); await S.exited;
  let sv = diskSave(prof);
  ok(sv && sv.cash === cashShown, `SIGKILL 150 ms after the result card: the payout on screen ($${cashBefore} -> $${cashShown}) is on disk ($${sv && sv.cash})`);

  /* ================= D2: SIGTERM with a debounced save pending ================= */
  S = await launch(prof); p = S.p; await ready(p);
  await p.evaluate(() => { window.HT.Save.data.cash = 11111; window.HT.Save.save() });/* the 250 ms debounce, e.g. a purchase a moment ago */
  process.kill(S.pid, 'SIGTERM'); const r2 = await Promise.race([S.exited, sleep(15000).then(() => 'timeout')]);
  sv = diskSave(prof); ok(sv && sv.cash === 11111, `SIGTERM (OS shutdown, Steam stop) with a pending autosave: exit ${JSON.stringify(r2)}, on disk cash=${sv && sv.cash}`);
  if (r2 === 'timeout') { try { process.kill(S.pid, 'SIGKILL') } catch (e) { } }
  /* D3: SIGTERM after saveNow (IPC sent, main-process 400 ms debounce pending) */
  S = await launch(prof); p = S.p; await ready(p);
  await p.evaluate(() => { window.HT.Save.data.cash = 22222; window.HT.Save.saveNow() }); await sleep(50);
  process.kill(S.pid, 'SIGTERM'); await Promise.race([S.exited, sleep(15000)]);
  sv = diskSave(prof); ok(sv && sv.cash === 22222, `SIGTERM 50 ms after a saveNow: on disk cash=${sv && sv.cash}`);
  /* D4: window close button / Alt+F4 with a pending debounced save */
  S = await launch(prof); p = S.p; await ready(p);
  await p.evaluate(() => { window.HT.Save.data.cash = 33333; window.HT.Save.save() });
  await S.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  const r4 = await Promise.race([S.exited, sleep(15000).then(() => 'timeout')]);
  sv = diskSave(prof); ok(sv && sv.cash === 33333, `window close with a pending autosave: exit ${JSON.stringify(r4)}, on disk cash=${sv && sv.cash}`);

  /* ================= E: second instance ================= */
  S = await launch(prof); p = S.p; await ready(p);
  const t0 = Date.now(); const second = spawnSync(L.EXE, ['--no-sandbox', '--windowed', '--no-steam', '--use-gl=angle', '--use-angle=swiftshader'], { env: Object.assign({}, process.env, { HT_USER_DATA: prof }), timeout: 30000 });
  ok(second.status === 0 && Date.now() - t0 < 30000, `second instance exits at once (status ${second.status}, ${Date.now() - t0} ms) and the first keeps running: ${!S.app.process().exitCode && S.app.process().exitCode !== 0}`);
  const wins = await S.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length); ok(wins === 1, 'still one window: ' + wins);
  await S.app.close().catch(() => { });
  console.log(L.fails ? L.fails + ' FAILED' : 'all ok'); process.exit(L.fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(99) });
