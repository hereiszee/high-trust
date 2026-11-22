/* Audit probe (saves): js/save.js edge cases under Node, no browser.
   Run: node dev/audit/saves/save-probe.js
   Prints one line per probe: OK / DEFECT / INFO with the evidence. Exit code = number of DEFECT lines. */
'use strict';
require('../../../js/carai.js');
const HT = require('../../../js/save.js');
const { Save } = HT;
const PL = require('../../../js/platform.js');
let bad = 0;
const out = (tag, name, msg) => { if (tag === 'DEFECT') bad++; console.log(tag.padEnd(6), name.padEnd(34), msg) };
function quotaStore(limit) { const m = new Map(); const size = () => { let n = 0; for (const [k, v] of m) n += k.length + v.length; return n };
  return { getItem: k => m.has(k) ? m.get(k) : null, removeItem: k => m.delete(k), _m: m,
    setItem: (k, v) => { v = String(v); const old = m.get(k); m.set(k, v); if (size() > limit) { if (old == null) m.delete(k); else m.set(k, old); const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e } } } }
function boot(st) { Save.useStorage(st); return Save.load() }
function played(cash) { const st = Save.useStorage(Save.memoryStorage()); Save.load(); const d = Save.data; d.cash = cash; d.prog.missionsRun = 3; d.prog.trust = 40;
  Save.recordRun(null, 'gary', { ok: true, medal: 2 }); Save.saveNow(); return st }

/* 1. ht-save truncated to an empty string while the backup is good (a crash mid-write in a store that truncates first) */
{ const st = played(1234); Save.data.cash = 1500; Save.saveNow(); /* bak=1234, save=1500 */
  st.setItem('ht-save', ''); boot(st);
  const got = Save.data.cash, ll = Save.lastLoad.status;
  out(got === 1234 || got === 1500 ? 'OK' : 'DEFECT', 'empty ht-save, good backup', `lastLoad=${ll} cash=${got} (backup had 1234) bak still=${JSON.parse(st.getItem('ht-save-bak')).cash}`);
  Save.saveNow(); Save.saveNow();
  out('INFO', '  ...after two more autosaves', `ht-save-bak cash=${JSON.parse(st.getItem('ht-save-bak')).cash}`); }
/* 1b. the literal string "null" */
{ const st = played(900); st.setItem('ht-save', 'null'); boot(st);
  out(Save.data.cash === 900 ? 'OK' : 'DEFECT', '"null" ht-save, good backup', `lastLoad=${Save.lastLoad.status} cash=${Save.data.cash} (backup 900)`); }
/* 2. truncated JSON */
{ const st = played(700); Save.data.cash = 750; Save.saveNow(); const raw = st.getItem('ht-save'); st.setItem('ht-save', raw.slice(0, raw.length >> 1)); boot(st);
  out(Save.data.cash === 700 ? 'OK' : 'DEFECT', 'truncated JSON', `lastLoad=${JSON.stringify(Save.lastLoad)} cash=${Save.data.cash} corrupt kept=${!!st.getItem('ht-save-corrupt')}`); }
/* 3. JSON of the wrong shape everywhere */
{ const st = Save.useStorage(Save.memoryStorage()); st.setItem('ht-save', JSON.stringify({ v: 3, cash: 'lots', prog: [], jobs: 5, calendar: null, owned: { guns: 'x' }, garage: 7, furniture: { placed: [1, null, { id: 'sofa', x: 'a' }] }, world: [], album: {}, day: -4 }));
  let err = null; try { Save.load() } catch (e) { err = e }
  out(err ? 'DEFECT' : 'OK', 'wrong types everywhere', err ? String(err) : `lastLoad=${Save.lastLoad.status} cash=${Save.data.cash} day=${Save.data.day} guns=${Save.data.owned.guns}`); }
/* 4. newer version, no backup (a Steam beta -> default rollback) */
{ const st = Save.useStorage(Save.memoryStorage()); const fut = { v: 4, cash: 5000, prog: { missionsRun: 9, done: [true, true] } }; st.setItem('ht-save', JSON.stringify(fut)); st.setItem('ht-save-bak', JSON.stringify(Object.assign({}, fut, { cash: 4900 })));
  Save.load(); const ll = Save.lastLoad; Save.data.cash = 10; Save.saveNow();
  out('INFO', 'future v4 save + v4 backup', `lastLoad=${JSON.stringify(ll)} -> plays a fresh save; v4 kept only in ht-save-future=${!!st.getItem('ht-save-future')}; ht-save now v${JSON.parse(st.getItem('ht-save')).v}. Nothing in index.html reads lastLoad except hasSave(): the player is not told.`); }
/* 5. v2 save from before the newest jobs, plus unknown job ids */
{ const st = Save.useStorage(Save.memoryStorage());
  st.setItem('ht-save', JSON.stringify({ v: 2, cash: 3000, prog: { done: [true, true, true, true, true, false, false, false, false], trust: 55, trustR: 22, missionsRun: 7, cuffed: 4, act: 2 }, world: { bridgeOpen: true }, jobs: { zz_unknown: { done: true, medal: 3 } } }));
  Save.load(); const d = Save.data, j = Object.keys(d.jobs).filter(k => d.jobs[k].done);
  out(j.length === 6 && d.day === 6 ? 'OK' : 'DEFECT', 'v2 -> v3 migration', `lastLoad=${JSON.stringify(Save.lastLoad)} done=${j} day=${d.day} cal=${d.calendar.entries.map(e => e.id)}`);
  const ach = PL.evaluate(d);
  out(ach.includes('ACH_GOLD_STAR') ? 'INFO' : 'OK', '  achievements from migrated v2', ach.join(',') + ' (ACH_GOLD_STAR from an unknown job id "zz_unknown" medal 3; ACH_FIRST_JOB counts it too)'); }
/* 6. v0 prototype save */
{ const st = Save.useStorage(Save.memoryStorage()); st.setItem('ht-save', JSON.stringify({ done: [true, false, false, false], trust: 30, cash: 250, guns: ['pistol', 'shotgun', 'rifle'] }));
  let err = null; try { Save.load() } catch (e) { err = e }
  out(err ? 'DEFECT' : 'OK', 'v0 prototype save', err ? String(err) : `lastLoad=${JSON.stringify(Save.lastLoad)} cash=${Save.data.cash} trust=${Save.data.prog.trust} gary=${!!(Save.data.jobs.gary && Save.data.jobs.gary.done)}`); }
/* 7. New game -> restore, twice in a row (the title flow: metaTitleAction('newgame') = Save.reset(); Restore = Save.restorePrevious()) */
{ const st = played(4242); /* save A */
  Save.reset(); const afterNew = Save.data.cash; Save.data.cash = 10; Save.data.prog.missionsRun = 1; Save.saveNow(); /* B with a little progress */
  const r1 = Save.restorePrevious(); const c1 = Save.data.cash;  /* A back, B in prev */
  const r2 = Save.restorePrevious(); const c2 = Save.data.cash;  /* B back, A in prev */
  const r3 = Save.restorePrevious(); const c3 = Save.data.cash;  /* A again */
  out(afterNew === 0 && c1 === 4242 && c2 === 10 && c3 === 4242 ? 'OK' : 'DEFECT', 'new game, restore x3', `new=${afterNew} r1=${r1}:${c1} r2=${r2}:${c2} r3=${r3}:${c3}`);
  /* New game, then New game again straight away (no progress in between), then restore */
  played(5555); Save.reset(); Save.reset(); const ok = Save.restorePrevious();
  out(ok && Save.data.cash === 5555 ? 'OK' : 'DEFECT', 'new game twice, then restore', `restored=${ok} cash=${Save.data.cash}`);
  /* New game, play a bit, New game again: A is gone (documented: "until you start another new game") */
  played(6000); Save.reset(); Save.data.cash = 1; Save.saveNow(); Save.reset(); Save.restorePrevious();
  out('INFO', 'new, play, new, restore', `cash=${Save.data.cash} (6000 save is gone, as the dialog warns)`); }
/* 7b. New game while the current save's progress is only things hasProgress() ignores */
{ const st = Save.useStorage(Save.memoryStorage()); Save.load(); const d = Save.data; d.base.eggs = { bigfoot: 1, gnome: 1 }; d.base.visited = true; d.prog.trust = 30; Save.saveNow();
  Save.reset(); const pv = Save.previous();
  out('INFO', 'reset with eggs only', `previous slot=${JSON.stringify(pv)} (hasProgress counts missionsRun/cash/spent only; such a save also shows no Continue)`); }
/* 8. quota: localStorage full. 3 copies (save, bak, prev) of one save live side by side */
{ const st = quotaStore(250000); boot(st); const d = Save.data;
  for (let i = 0; i < 24; i++) Save.album(null, { id: 'p' + i, stars: 2, jpg: 'data:image/jpeg;base64,' + 'A'.repeat(14000) });
  d.cash = 99; let saved = 0; const off = Save.on('saved', () => saved++); const ok = Save.saveNow(); off();
  const onDisk = st.getItem('ht-save') ? JSON.parse(st.getItem('ht-save')).cash : null;
  out(!ok && saved ? 'DEFECT' : 'OK', 'quota exceeded on write', `saveNow()=${ok}, 'saved' event fired ${saved}x anyway, on-disk cash=${onDisk} (game cash 99). No UI anywhere reads the return value.`); }
/* 9. storage disabled entirely (localStorage throws on access) */
{ const thrower = { getItem() { throw new Error('SecurityError') }, setItem() { throw new Error('SecurityError') }, removeItem() { throw new Error('SecurityError') } };
  let err = null; try { boot(thrower); Save.data.cash = 5; Save.saveNow() } catch (e) { err = e }
  out(err ? 'DEFECT' : 'OK', 'storage throws on every call', err ? String(err) : `game runs, lastLoad=${Save.lastLoad.status}; progress silently not kept`); }
/* 10. two tabs: both load the same save, each writes its own copy */
{ const st = played(1000); const A = JSON.parse(st.getItem('ht-save'));
  /* tab B */ Save.load(); Save.data.cash = 3000; Save.recordRun(null, 'rick', { ok: true, medal: 1 }); Save.saveNow();
  /* tab A (stale in-memory copy) writes later */ st.setItem('ht-save-bak', st.getItem('ht-save')); A.cash = 1100; st.setItem('ht-save', JSON.stringify(A));
  boot(st); out('INFO', 'two tabs, last writer wins', `cash=${Save.data.cash} rick done=${!!(Save.data.jobs.rick && Save.data.jobs.rick.done)} (tab B's job + $2000 lost; js/save.js has no 'storage' event listener)`); }
/* 11. achievements on a fresh save */
{ boot(Save.memoryStorage()); const a = PL.evaluate(Save.data); out(a.length ? 'DEFECT' : 'OK', 'fresh save unlocks nothing', JSON.stringify(a)); }
process.exitCode = bad;
