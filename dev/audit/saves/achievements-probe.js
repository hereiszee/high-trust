/* Audit probe (saves): every achievement in docs/steam/achievements.md, evaluated by HT.Steam's own rules (js/platform.js evaluate())
   against crafted saves AFTER a real HT.Save load (migrate + sanitize), so a field the loader drops would show up as "unreachable".
   Run: node dev/audit/saves/achievements-probe.js */
'use strict';
require('../../../js/carai.js');
const { Save } = require('../../../js/save.js');
const { ACHIEVEMENTS, evaluate } = require('../../../js/platform.js');
const fs = require('fs'), path = require('path');
let bad = 0; const out = (t, m) => { if (t === 'DEFECT') bad++; console.log(t.padEnd(6), m) };
const load = o => { const st = Save.useStorage(Save.memoryStorage()); st.setItem('ht-save', JSON.stringify(Object.assign({ v: 3 }, o))); Save.load(); return JSON.parse(JSON.stringify(Save.data)) };
const done = (...ids) => { const j = {}; for (const id of ids) j[id] = { done: true, medal: 1 }; return j };
const STORY = ['gary', 'rick', 'dave', 'doug', 'earl', 'dee', 'rosa', 'benny', 'duke', 'taxi', 'hoa', 'mower', 'tail', 'crossing', 'tow', 'overwatch', 'pawn', 'moving', 'cargo', 'cones', 'talk', 'sabotage', 'brake', 'bike', 'arrest', 'heist', 'roundup'];
const CASES = {
  ACH_FIRST_JOB: { jobs: done('hoa') }, ACH_RETURN_TO_SENDER: { jobs: done('gary') }, ACH_FOURTH_QUARTER: { jobs: done('rick') }, ACH_BLOCK_PARTY: { jobs: done('dave') },
  ACH_KINGPIN: { jobs: done('doug') }, ACH_BRIDGE: { world: { bridgeOpen: true } }, ACH_RIVERSIDE: { jobs: done('earl', 'dee', 'rosa', 'benny') }, ACH_THE_DUKE: { jobs: done('duke') },
  ACH_PORCH_LIGHT: { jobs: done('porch') }, ACH_DAD_TAXI: { jobs: done('taxi') }, ACH_EXHIBIT_HOA: { jobs: done('hoa') }, ACH_BUSY_WEEKEND: { jobs: done(...STORY.slice(0, 15)) },
  ACH_EVERYBODY_WAVES: { flags: { festival: true } }, ACH_GOLD_STAR: { jobs: { gary: { done: true, medal: 3 } } },
  ACH_HONOR_ROLL: { jobs: Object.fromEntries(STORY.slice(0, 10).map(id => [id, { done: true, medal: 3 }])) }, ACH_DUE_PROCESS: { prog: { cuffed: 25 } },
  ACH_DOORS_UNLOCKED: { prog: { trust: 80 } }, ACH_SIDE_HUSTLE: { stats: { earned: 10000 } }, ACH_FIRST_FIND: { base: { eggs: { gnome: { day: 1 } } } },
  ACH_PROOF: { base: { eggs: { bigfoot: { day: 1 } } } }, ACH_SEEN_IT_ALL: { base: { eggs: Object.fromEntries(['gnome', 'lights', 'phone', 'smoker', 'honk', 'mug', 'bigfoot'].map(k => [k, { day: 1 }])) } },
  ACH_CLEARED_FOR_TAKEOFF: { base: { jet: { flights: 1 } } }, ACH_BORROWED: { base: { tank: { borrows: 1 } } } };
/* docs table matches the code */
const md = fs.readFileSync(path.join(__dirname, '../../../docs/steam/achievements.md'), 'utf8');
const docIds = [...md.matchAll(/^\| `(ACH_[A-Z_]+)` \| ([^|]+) \| ([^|]+) \|/gm)].map(m => ({ id: m[1], name: m[2].trim(), desc: m[3].trim() }));
const codeIds = ACHIEVEMENTS.map(a => a.id);
out(docIds.length === codeIds.length && docIds.every((d, i) => d.id === codeIds[i]) ? 'OK' : 'DEFECT', `docs table ${docIds.length} ids vs code ${codeIds.length} ids, same order`);
for (const d of docIds) { const a = ACHIEVEMENTS.find(x => x.id === d.id); if (a && (a.name !== d.name || a.desc.replace(/\\'/g, "'") !== d.desc)) out('DEFECT', `${d.id} name/desc differ: docs "${d.name} / ${d.desc}" code "${a.name} / ${a.desc}"`) }
/* reachable from a crafted save after a real load */
for (const a of ACHIEVEMENTS) { const c = CASES[a.id]; if (!c) { out('DEFECT', a.id + ': no case'); continue }
  const got = evaluate(load(c)); out(got.includes(a.id) ? 'OK' : 'DEFECT', `${a.id.padEnd(26)} reachable from ${JSON.stringify(c).slice(0, 80)} -> ${got.join(',')}`) }
/* nothing on a fresh save, nothing on a save that has only started (missionsRun, cash, a purchase) */
out(evaluate(load({})).length === 0 ? 'OK' : 'DEFECT', 'fresh save: ' + JSON.stringify(evaluate(load({}))));
out(evaluate(load({ cash: 400, prog: { missionsRun: 1, trust: 20 }, stats: { earned: 400, spent: 120 } })).length === 0 ? 'OK' : 'DEFECT', 'started save (1 run, $400, no job done): ' + JSON.stringify(evaluate(load({ cash: 400, prog: { missionsRun: 1 } }))));
/* a v1 save from before Riverside existed should not get Riverside/finale achievements */
const v1 = evaluate(load({ v: 1, prog: { done: [true, true, true, true] }, cash: 2000 }));
out('INFO', 'v1 save with the 4 Maple raids done: ' + v1.join(','));
/* a failed-only run (recordRun ok:false) does not mark done */
{ Save.useStorage(Save.memoryStorage()); Save.load(); Save.recordRun(null, 'gary', { ok: false }); out(evaluate(Save.data).length ? 'DEFECT' : 'OK', 'a failed run unlocks nothing: ' + JSON.stringify(evaluate(Save.data))) }
/* a repeatable counts toward "Finish your first job" / Busy Weekend */
{ Save.useStorage(Save.memoryStorage()); Save.load(); Save.recordRun(null, 'blitz', { ok: true, medal: 3, story: false }); out('INFO', 'one repeatable (Honey-Do Blitz, gold) on a fresh save unlocks: ' + evaluate(Save.data).join(',')) }
process.exitCode = bad;
