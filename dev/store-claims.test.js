/* P-4 / P-6 / P-5: the numbers and claims in the store draft come from the code.  node dev/store-claims.test.js
   Story jobs = the built-in missions (index.html MISSIONS + RIVER_JOBS) + every registered job that is not repeatable and not the finale
   (js/jobs/*.js loaded through HT.Jobs.FILES, the way the game loads them). Prints the derived counts and fails on any mismatch with
   docs/steam/STORE.md / CHECKLIST.md, or on a copyright holder other than the developer name in LICENSE. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), R = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m) };
global.window = global;
const J = require('../js/jobs/_registry.js');
const MISSIONS = [], catalog = []; J._reset(); J.bind({ MISSIONS, catalog, active: () => null });
const ctx = vm.createContext({ window: null, HT: global.HT, console: { log() { }, warn() { }, error() { } }, document: { createElement: () => ({}), getElementById: () => null }, Math, JSON }); ctx.window = ctx;
for (const f of J.FILES) { const p = path.join(R, 'js/jobs', f + '.js'); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p }) }
const html = rd('index.html');
const block = a => { const i = html.indexOf(a); let d = 0; const j = html.indexOf('[', i); for (let k = j; k < html.length; k++) { if (html[k] === '[') d++; else if (html[k] === ']' && !--d) return html.slice(j, k + 1) } return '' };
const builtin = ['const MISSIONS=[', 'const RIVER_JOBS=['].flatMap(a => [...block(a).matchAll(/(?:^|\n)\s*\{\s*id:'(\w+)'/g)].map(m => m[1]));
const reg = J.list().filter(j => !j.builtin);
const story = reg.filter(j => !j.def.repeatable && j.id !== 'finale').map(j => j.id), rep = reg.filter(j => j.def.repeatable).map(j => j.id);
const STORY = builtin.length + story.length;
console.log(`built-in ${builtin.length} (${builtin}) + registered story ${story.length} (${story}) = ${STORY} story jobs; finale: ${!!J.get('finale')}; repeatables ${rep.length} (${rep})`);
const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const store = rd('docs/steam/STORE.md'), check = rd('docs/steam/CHECKLIST.md');
ok(builtin.length === 9, 'nine built-in missions found in index.html');
ok(new RegExp('\\*\\*' + STORY + ' story jobs and a festival finale\\*\\*').test(store), `STORE.md headline says "${STORY} story jobs and a festival finale"`);
const counts = [...(store + check).matchAll(/(\d+) story jobs/g)].map(m => +m[1]);
ok(counts.length > 0 && counts.every(n => n === STORY), 'every "N story jobs" in STORE.md/CHECKLIST.md is ' + STORY + ' (' + counts.join(',') + ')');
ok(J.get('finale') && J.get('finale').def && !J.get('finale').def.repeatable, 'the finale is a registered job');
ok(new RegExp(words[rep.length] + ' repeatable side gigs', 'i').test(store), `STORE.md: "${words[rep.length]} repeatable side gigs"`);
/* catalogue claims */
require('../js/carai.js'); const S = require('../js/save.js'), C = S.CATALOG;
const guns = Object.keys(C.guns), att = Object.values(C.attachments), withAtt = guns.filter(g => att.some(a => (a.compat || []).includes(g)));
ok(new RegExp(words[guns.length] + ' sensible firearms', 'i').test(store), `STORE.md: "${words[guns.length]} sensible firearms" (${guns.length} in HT.CATALOG.guns)`);
ok(withAtt.length === guns.length ? !/most have attachments/i.test(store) : !/Each has attachments/i.test(store), `attachment claim matches the catalogue (${withAtt.length}/${guns.length} guns take attachments)`);
ok(new RegExp(Object.keys(C.furniture).length + ' pieces of furniture').test(store), `STORE.md: "${Object.keys(C.furniture).length} pieces of furniture"`);
/* menu path and install size */
ok(!/Pause → Key bindings|Settings → Key bindings/.test(store + rd('docs/steam/BUILD.md') + rd('docs/steam/PLAYTEST.md')), 'no "Key bindings" menu path left (the tab is "Controls & keys")');
ok(!/source assets 80 MB/.test(store), 'install size no longer counts source assets that do not ship');
/* P-5: one copyright holder */
const holder = /Copyright \(c\) \d{4} (\w+)/.exec(rd('LICENSE'))[1];
const cfg = rd('desktop/electron-builder.config.js'), pkg = JSON.parse(rd('desktop/package.json'));
ok(holder === 'hereiszee', 'LICENSE holder is hereiszee');
ok(new RegExp("copyright: 'Copyright © \\d{4} " + holder).test(cfg), 'electron-builder copyright names ' + holder);
ok(pkg.author === holder, 'desktop/package.json author is ' + holder + ' (' + pkg.author + ')');
ok(!/neighborhood back/.test(pkg.description), 'desktop/package.json description no longer says "taking their neighborhood back"');
ok(/appId/.test(check) && /RELEASE_APP_ID/.test(check) && /DEPOT_ID|depot id/i.test(check), 'CHECKLIST.md lists appId, RELEASE_APP_ID and the depot ids as owner inputs');
console.log(fails ? fails + ' FAILED' : 'all ok'); process.exitCode = fails ? 1 : 0;
