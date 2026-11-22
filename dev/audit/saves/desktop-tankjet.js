/* Audit probe (saves/achievements): borrow the tank and get in the jet at Fort Sensible in the PACKAGED build, then Quit to desktop from
   the pause menu. Do base.tank.borrows / base.jet.flights (the only inputs to ACH_BORROWED / ACH_CLEARED_FOR_TAKEOFF) reach the save file?
   Run: xvfb-run -a node dev/audit/saves/desktop-tankjet.js */
'use strict';
const L = require('./lib.js'); const { launch, ready, diskSave, sleep, ok, info } = L;
const stepN = (p, n) => p.evaluate(n => { const H = window.__ht; for (let i = 0; i < n; i += 15) H.step(15) }, n);
(async () => {
  const prof = L.mkProfile('tank'); let S = await launch(prof); let p = S.p; await ready(p);
  await L.click(p, '.ht-title [data-act=newgame]'); await p.waitForFunction(() => window.__ht.mode === 'hub' && window.__ht.running, null, { timeout: 60000 }); await sleep(1500);
  /* give the save some progress first so it exists on disk (a real player arrives here after jobs) */
  await p.evaluate(() => { window.HT.Save.addCash(500, 'probe'); window.HT.Save.saveNow() }); await sleep(1000);
  await p.evaluate(() => { const H = window.__ht; H.openBridge(); H.P.pos.set(H.VAN.pos.x + 2, 0, H.VAN.pos.z); H.enterVan(); H.fastTravel('base') }); await sleep(1500); await stepN(p, 90); await sleep(1500);
  info('at base: region ' + await p.evaluate(() => window.__ht.region) + ', vehicles: ' + JSON.stringify(await p.evaluate(() => window.__ht.vehicles.map((v, i) => i + ':' + (v.type || v.kind || v.name)).filter(s => /tank|jet/i.test(s)))));
  for (const kind of ['tank', 'jet']) {
    const r = await p.evaluate(async kind => { const H = window.__ht; if (H.CV) H.exitVehicle(); const i = H.vehicles.findIndex(v => (v.type || v.kind) === kind); if (i < 0) return 'no ' + kind;
      const v = H.vehicles[i]; H.P.pos.set(v.pos.x + 3, 0, v.pos.z); const okIn = H.enterVehicle(i); for (let k = 0; k < 6; k++) H.step(15); return { okIn, cv: H.CV && (H.CV.type || H.CV.kind) } }, kind);
    await sleep(2500);
    const mem = await p.evaluate(() => JSON.parse(JSON.stringify(window.HT.Save.data.base)));
    const d = diskSave(prof);
    info(`${kind}: entered ${JSON.stringify(r)}; in memory tank.borrows=${mem.tank.borrows} jet.flights=${mem.jet.flights}; on disk tank.borrows=${d && d.base.tank.borrows} jet.flights=${d && d.base.jet.flights}`);
  }
  await p.evaluate(() => { const H = window.__ht; if (H.CV) H.exitVehicle() }); await sleep(500);
  for (let i = 0; i < 4 && !(await p.evaluate(() => !!document.querySelector('.ht-pause [data-act=quitDesktop]'))); i++) { await p.keyboard.press('Escape'); await sleep(1200) }
  await p.evaluate(() => document.querySelector('.ht-pause [data-act=quitDesktop]').click()); await Promise.race([S.exited, sleep(15000)]);
  const d = diskSave(prof);
  ok(d && d.base.tank.borrows >= 1, 'tank borrow survives Quit to desktop (on disk ' + (d && d.base.tank.borrows) + ')');
  ok(d && d.base.jet.flights >= 1, 'jet flight survives Quit to desktop (on disk ' + (d && d.base.jet.flights) + ')');
  console.log(L.fails ? L.fails + ' FAILED' : 'all ok'); process.exit(L.fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(99) });
