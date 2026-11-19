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
if (bad.length) { console.log(bad.slice(0, 50).join('\n') + (bad.length > 50 ? `\n… ${bad.length - 50} more` : '')); console.log(`FAIL: ${bad.length} problem(s). Run: (cd tools && npm install) && node tools/build-assets.js`); process.exit(1) }
console.log('assets/opt is up to date (' + Object.keys(man.files).length + ' sources)');
