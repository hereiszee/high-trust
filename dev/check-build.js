/* node dev/check-build.js : fails (exit 1) when a source asset changed or was added since the last
   `node tools/build-assets.js`, i.e. assets/opt/ is stale. Compares content hashes (file dates are useless
   after a git checkout) against assets/opt/.cache.json. No dependencies. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..'); process.chdir(ROOT);
const CFG = require('../tools/assets.config.js');
let cache = {}, man = null;
try { cache = JSON.parse(fs.readFileSync(path.join(CFG.out, '.cache.json'), 'utf8')) } catch (e) { }
try { man = JSON.parse(fs.readFileSync(path.join(CFG.out, 'manifest.json'), 'utf8')) } catch (e) { }
const walk = d => !fs.existsSync(d) ? [] : fs.readdirSync(d).flatMap(f => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p.split(path.sep).join('/')] });
const bad = [];
if (!man) bad.push('assets/opt/manifest.json missing');
for (const src of CFG.roots.flatMap(walk).filter(p => /\.(jpg|png|glb|hdr)$/.test(p))) {
  const h = crypto.createHash('sha1').update(fs.readFileSync(src)).digest('hex').slice(0, 8);
  const c = cache[src];
  if (!c || !man || !man.files[src]) bad.push('not built: ' + src);
  else if (!c.key.startsWith(h)) bad.push('changed since build: ' + src);
  else for (const t of ['m', 'l']) for (const u of Object.values((man.files[src][t] || {}).f || {})) if (!fs.existsSync(u)) bad.push('missing output: ' + u);
}
if (man) for (const b of Object.values(man.boot || {})) if (!fs.existsSync(b.url)) bad.push('missing boot pack: ' + b.url);
/* PERF-03: no stray boot-pack twin (boot.<fmt>.pack.<hash>.bin) left next to the real one */
for (const f of fs.existsSync(CFG.out) ? fs.readdirSync(CFG.out) : []) if (/^boot\.\w+\.pack\./.test(f)) bad.push('stray boot pack copy (not in the manifest): ' + path.join(CFG.out, f));
/* P-3: every third-party module packed into the desktop app has a notice; Electron's licence files are in a built dist */
{ const NOTICES = fs.readFileSync('assets/credits/THIRD-PARTY-NOTICES.txt', 'utf8');
  let lock = null; try { lock = JSON.parse(fs.readFileSync('desktop/package-lock.json', 'utf8')) } catch (e) { bad.push('desktop/package-lock.json unreadable') }
  if (lock) for (const [k, v] of Object.entries(lock.packages || {})) { if (!k.startsWith('node_modules/') || v.dev) continue; const name = k.replace(/^.*node_modules\//, '');
    if (!NOTICES.includes(name)) bad.push('packaged npm module without a notice in assets/credits/THIRD-PARTY-NOTICES.txt: ' + name) }
  for (const w of ['Electron', 'Chromium', 'Node.js', 'Steamworks SDK', 'LICENSE.electron.txt', 'LICENSES.chromium.html']) if (!NOTICES.includes(w)) bad.push('THIRD-PARTY-NOTICES.txt does not mention ' + w);
  const dist = path.join('desktop', 'dist');
  if (fs.existsSync(dist)) for (const d of fs.readdirSync(dist).filter(d => /-unpacked$|^mac/.test(d) && fs.statSync(path.join(dist, d)).isDirectory())) {
    const app = fs.readdirSync(path.join(dist, d)).find(f => f.endsWith('.app')), res = app ? path.join(dist, d, app, 'Contents', 'Resources') : path.join(dist, d, 'resources');
    for (const f of ['LICENSE.electron.txt', 'LICENSES.chromium.html']) if (!fs.existsSync(path.join(res, f))) bad.push('built package ' + d + ' has no ' + f + ' in ' + res);
    const tpn = app ? path.join(dist, d, app, 'Contents', 'THIRD-PARTY-NOTICES.txt') : path.join(dist, d, 'THIRD-PARTY-NOTICES.txt');
    if (!fs.existsSync(tpn)) bad.push('built package ' + d + ' has no THIRD-PARTY-NOTICES.txt') } }
/* SAV-05: the in-game credits are generated from assets/credits/credits.txt */
{ const r = require('child_process').spawnSync(process.execPath, ['dev/audit/saves/credits-diff.js'], { encoding: 'utf8' }); if (r.status !== 0) bad.push('in-game credits differ from assets/credits/credits.txt (run node tools/gen-credits.js):\n' + r.stdout) }
if (bad.length) { console.log(bad.slice(0, 50).join('\n') + (bad.length > 50 ? `\n… ${bad.length - 50} more` : '')); console.log(`FAIL: ${bad.length} problem(s). Stale assets: (cd tools && npm install) && node tools/build-assets.js; notices: assets/credits/THIRD-PARTY-NOTICES.txt; built package: rebuild it`); process.exit(1) }
console.log('assets/opt is up to date (' + Object.keys(man.files).length + ' sources); notices and credits OK');
