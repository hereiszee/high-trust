/* Audit probe (saves): damaged save files in the PACKAGED build. For each case: seed a profile, launch, report what loaded, what the
   title offers, and which files are left. Run: xvfb-run -a node dev/audit/saves/desktop-corrupt.js */
'use strict';
const L = require('./lib.js'); const { launch, ready, sleep, ok, info } = L;
const fs = require('fs'), path = require('path');
const wrap = keys => JSON.stringify({ format: 'ht-desktop-save', v: 1, t: Date.now(), keys });
const game = (cash, jobs) => JSON.stringify({ v: 3, cash, prog: { missionsRun: 4, done: [true, true, false, false, false, false, false, false, false], trust: 40 }, jobs: Object.fromEntries((jobs || ['gary', 'rick']).map(j => [j, { done: true, medal: 1 }])) });
const CASES = [
  ['save.json truncated, good .bak', d => { const g = wrap({ 'ht-save': game(5000) }); fs.writeFileSync(d + '/save.json', g.slice(0, g.length >> 1)); fs.writeFileSync(d + '/save.json.bak', wrap({ 'ht-save': game(4800) })) }, r => r.cash === 4800 && r.cont],
  ['save.json 0 bytes, good .bak', d => { fs.writeFileSync(d + '/save.json', ''); fs.writeFileSync(d + '/save.json.bak', wrap({ 'ht-save': game(4800) })) }, r => r.cash === 4800 && r.cont],
  ['save.json missing, good .bak', d => { fs.writeFileSync(d + '/save.json.bak', wrap({ 'ht-save': game(4800) })) }, r => r.cash === 4800 && r.cont],
  ['save.json truncated, no .bak', d => { const g = wrap({ 'ht-save': game(5000) }); fs.writeFileSync(d + '/save.json', g.slice(0, g.length >> 1)) }, r => r.told],
  ['both truncated', d => { const g = wrap({ 'ht-save': game(5000) }); fs.writeFileSync(d + '/save.json', g.slice(0, 100)); fs.writeFileSync(d + '/save.json.bak', g.slice(0, 150)) }, r => r.told],
  ['inner ht-save corrupt, inner ht-save-bak good', d => { fs.writeFileSync(d + '/save.json', wrap({ 'ht-save': game(5000).slice(0, 50), 'ht-save-bak': game(4900) })) }, r => r.cash === 4900 && r.cont],
  ['inner ht-save from a newer version (v4)', d => { fs.writeFileSync(d + '/save.json', wrap({ 'ht-save': JSON.stringify({ v: 4, cash: 9000 }), 'ht-save-bak': JSON.stringify({ v: 4, cash: 8900 }) })) }, r => r.told],
  ['plain JSON (not the wrapper), e.g. a hand-copied web save', d => { fs.writeFileSync(d + '/save.json', game(5000)) }, r => r.cash === 5000 || r.told],
  ['huge save: 20 MB inside', d => { const s = JSON.parse(game(5000)); s.album = Array.from({ length: 24 }, (_, i) => ({ id: 'p' + i, stars: 1, jpg: 'data:image/jpeg;base64,' + 'A'.repeat(800000) })); fs.writeFileSync(d + '/save.json', wrap({ 'ht-save': JSON.stringify(s) })) }, r => r.cash === 5000 && r.cont],
];
(async () => {
  for (const [name, seed, want] of CASES) {
    const prof = L.mkProfile('corrupt'); const dir = path.join(prof, 'saves'); fs.mkdirSync(dir, { recursive: true }); seed(dir);
    const t0 = Date.now(); const S = await launch(prof); const p = S.p; let r;
    try { await ready(p); await sleep(1500);
      r = await p.evaluate(() => ({ from: window.HTDesktop.saveFrom, status: window.HT.Save.lastLoad.status, why: window.HT.Save.lastLoad.why || null, cash: window.HT.Save.data.cash,
        cont: !!document.querySelector('.ht-title [data-act=continue]:not([hidden])'), dlg: document.querySelector('.ht-dlg')?.innerText || null,
        feed: [...document.querySelectorAll('.ht-feed *, .ht-banner *, .ht-toast')].map(e => e.textContent).filter(Boolean).slice(0, 3) }));
      r.told = !!r.dlg || r.feed.length > 0; r.ms = Date.now() - t0;
    } catch (e) { r = { error: e.message.split('\n')[0] } }
    await S.app.close().catch(() => { });
    r.files = fs.readdirSync(dir).map(f => f + ':' + fs.statSync(path.join(dir, f)).size);
    ok(!r.error && want(r), name + ' -> ' + JSON.stringify(r));
  }
  console.log(L.fails ? L.fails + ' FAILED' : 'all ok'); process.exit(L.fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(99) });
