#!/usr/bin/env node
/* High Trust asset build.
     cd tools && npm install          (once)
     node tools/build-assets.js       (from the repo root, or `npm run build-assets` in tools/)
   Reads the source assets listed in tools/assets.config.js and writes to assets/opt/:
     <path>.<tier>.<hash>.webp|jpg|png   textures (tier m and l; jpg/png fallback for m only)
     <path>.<tier>.<hash>.glb            meshopt-compressed models with WebP textures
     <path>.<tier>.<hash>.hdr            RGBE environment maps, box-downsampled
     boot.<fmt>.<hash>.bin              Stage A pack (one request): every config.boot entry at tier m
     manifest.json                      source path -> variants, average colour, sizes, boot pack
   and bumps the service worker version in sw.js. Unchanged sources reuse their previous output (cache in assets/opt/.cache.json). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);
const CFG = require('./assets.config.js');
const sharp = require('sharp');
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS, EXTMeshoptCompression } = require('@gltf-transform/extensions');
const { dedup, prune, resample, reorder, quantize, textureCompress } = require('@gltf-transform/functions');

const OUT = CFG.out, hash = b => crypto.createHash('sha1').update(b).digest('hex').slice(0, 8);
const rel = p => p.split(path.sep).join('/');
const isMap = p => /_(nrm|rgh|alpha)\.[a-z]+$/.test(p), isExact = p => CFG.exact.some(e => p.startsWith(e));
const kindOf = p => p.startsWith('assets/sky/') ? 'sky' : (p.startsWith('assets/world/') && p.endsWith('.png')) ? 'decal' : isMap(p) ? 'map' : 'col';

function walk(d) { let o = []; if (!fs.existsSync(d)) return o; for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const s = fs.statSync(p); if (s.isDirectory()) o = o.concat(walk(p)); else o.push(rel(p)) } return o }

/* ---------- RGBE (.hdr) read / downsample / write ---------- */
function readHDR(buf) {
  let i = 0; const line = () => { let s = ''; while (buf[i] !== 10) s += String.fromCharCode(buf[i++]); i++; return s };
  if (!line().startsWith('#?')) throw new Error('not RGBE');
  for (let l = line(); l !== ''; l = line());
  const m = /-Y (\d+) \+X (\d+)/.exec(line()); const H = +m[1], W = +m[2];
  const px = new Uint8Array(W * H * 4), sl = new Uint8Array(W * 4);
  for (let y = 0; y < H; y++) {
    if (buf[i] === 2 && buf[i + 1] === 2 && ((buf[i + 2] << 8) | buf[i + 3]) === W) {
      i += 4;
      for (let c = 0; c < 4; c++) { let x = 0; while (x < W) { let n = buf[i++]; if (n > 128) { n -= 128; const v = buf[i++]; while (n--) sl[(x++) * 4 + c] = v } else { while (n--) sl[(x++) * 4 + c] = buf[i++] } } }
    } else { for (let x = 0; x < W; x++) for (let c = 0; c < 4; c++) sl[x * 4 + c] = buf[i++] }
    px.set(sl, y * W * 4);
  }
  return { W, H, px };
}
function hdrToFloat({ W, H, px }) { const f = new Float32Array(W * H * 3); for (let k = 0; k < W * H; k++) { const e = px[k * 4 + 3]; const s = e ? Math.pow(2, e - 136) : 0; for (let c = 0; c < 3; c++) f[k * 3 + c] = px[k * 4 + c] * s } return { W, H, f } }
function halve({ W, H, f }) { const w = W >> 1, h = H >> 1, o = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) o[(y * w + x) * 3 + c] = (f[((2 * y) * W + 2 * x) * 3 + c] + f[((2 * y) * W + 2 * x + 1) * 3 + c] + f[((2 * y + 1) * W + 2 * x) * 3 + c] + f[((2 * y + 1) * W + 2 * x + 1) * 3 + c]) / 4;
  return { W: w, H: h, f: o } }
function writeHDR({ W, H, f }) {
  const parts = [Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${H} +X ${W}\n`, 'latin1')];
  const sl = new Uint8Array(W * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) { const r = f[(y * W + x) * 3], g = f[(y * W + x) * 3 + 1], b = f[(y * W + x) * 3 + 2], m = Math.max(r, g, b);
      if (m < 1e-32) { sl[x * 4] = sl[x * 4 + 1] = sl[x * 4 + 2] = sl[x * 4 + 3] = 0; continue }
      const e = Math.ceil(Math.log2(m) + 1e-9), s = 256 / Math.pow(2, e);
      sl[x * 4] = Math.min(255, Math.floor(r * s)); sl[x * 4 + 1] = Math.min(255, Math.floor(g * s)); sl[x * 4 + 2] = Math.min(255, Math.floor(b * s)); sl[x * 4 + 3] = e + 128 }
    const out = [2, 2, W >> 8, W & 255];
    for (let c = 0; c < 4; c++) { let x = 0; const v = k => sl[k * 4 + c];
      while (x < W) { let run = 1; while (x + run < W && run < 127 && v(x + run) === v(x)) run++;
        if (run >= 4) { out.push(128 + run, v(x)); x += run; continue }
        let s = x, n = 0; while (x < W && n < 128) { let r2 = 1; while (x + r2 < W && r2 < 4 && v(x + r2) === v(x)) r2++; if (r2 >= 4) break; x++; n++ }
        out.push(n); for (let k = s; k < s + n; k++) out.push(v(k)) } }
    parts.push(Buffer.from(out));
  }
  return Buffer.concat(parts);
}

/* ---------- glb ---------- */
let io, MeshoptEncoder;
async function glbIO() {
  if (io) return io;
  const mo = await import('meshoptimizer'); await mo.MeshoptEncoder.ready; await mo.MeshoptDecoder.ready; MeshoptEncoder = mo.MeshoptEncoder;
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': mo.MeshoptDecoder, 'meshopt.encoder': mo.MeshoptEncoder });
  return io;
}
const KEEP_CLIPS = (() => { try { return new Set(Object.keys(JSON.parse(fs.readFileSync(CFG.animsJson, 'utf8')))) } catch (e) { return null } })();
async function buildGlb(src, maxTex) {
  const io = await glbIO(); const doc = await io.read(src), root = doc.getRoot();
  if (KEEP_CLIPS && src.endsWith('/anims.glb')) for (const a of root.listAnimations()) if (!KEEP_CLIPS.has(a.getName())) a.dispose();
  const texMax = Math.max(0, ...root.listTextures().map(t => Math.max(...(t.getSize() || [0]))));
  await doc.transform(
    dedup(), prune({ keepLeaves: true, keepAttributes: true }), resample({ tolerance: 1e-4 }), reorder({ encoder: MeshoptEncoder }),
    /* r128 raycasts read raw attribute values, so positions stay float except for static scenery listed in config.quantizePositions */
    quantize({ pattern: CFG.quantizePositions.some(q => src.startsWith(q)) ? /.*/ : /^(NORMAL|TANGENT|TEXCOORD_\d+|COLOR_\d+|WEIGHTS_\d+)$/ }),
    /* opaque (jpeg) textures go lossy WebP; textures with alpha go lossless, because lossy WebP repaints the colour under
       transparent pixels and alpha-tested foliage loses its edges */
    textureCompress({ encoder: sharp, formats: /jpeg/, targetFormat: 'webp', quality: CFG.quality.glbWebp, resize: [maxTex, maxTex] }),
    textureCompress({ encoder: sharp, formats: /png/, targetFormat: 'webp', lossless: true, resize: [maxTex, maxTex] }));
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  return { buf: Buffer.from(await io.writeBinary(doc)), texMax };
}

/* ---------- images ---------- */
async function avgColour(src) { const s = await sharp(src).stats(); const c = s.channels; const g = c.length < 3; const v = i => Math.round(c[g ? 0 : i].mean);
  return '#' + [v(0), v(1), v(2)].map(x => x.toString(16).padStart(2, '0')).join('') + (c.length === 4 || c.length === 2 ? Math.round(c[c.length - 1].mean).toString(16).padStart(2, '0') : '') }
async function encodeImage(src, max, fmt, exact) {
  const meta = await sharp(src).metadata(); let img = sharp(src);
  if (!exact && Math.max(meta.width, meta.height) > max) img = img.resize({ width: meta.width >= meta.height ? max : null, height: meta.height > meta.width ? max : null, kernel: 'lanczos3' });
  if (fmt === 'webp') img = img.webp({ quality: CFG.quality.webp, effort: 6, alphaQuality: 90 });
  else if (fmt === 'png') img = img.png({ compressionLevel: 9, palette: false });
  else img = img.flatten({ background: '#808080' }).jpeg({ quality: CFG.quality.jpg, mozjpeg: true });
  const buf = await img.toBuffer({ resolveWithObject: true });
  return { buf: buf.data, w: buf.info.width, h: buf.info.height };
}

/* ---------- main ---------- */
(async () => {
  const t0 = Date.now();
  fs.mkdirSync(OUT, { recursive: true });
  const cacheFile = path.join(OUT, '.cache.json');
  let cache = {}; try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) } catch (e) { }
  const cfgHash = hash(fs.readFileSync(__filename) + JSON.stringify(CFG));
  const written = new Set(['manifest.json', '.cache.json']);
  const man = { v: '', files: {} }, newCache = {};
  const emit = (srcRel, tier, ext, buf) => { const name = srcRel.replace(/^assets\//, '').replace(/\.[a-z]+$/, '') + '.' + tier + '.' + hash(buf) + '.' + ext;
    const p = path.join(OUT, name); fs.mkdirSync(path.dirname(p), { recursive: true }); if (!fs.existsSync(p)) fs.writeFileSync(p, buf); written.add(name); return OUT + '/' + name };
  const sources = CFG.roots.flatMap(walk).filter(p => /\.(jpg|png|glb|hdr)$/.test(p)).sort();
  for (const src of sources) {
    const sbuf = fs.readFileSync(src), key = hash(sbuf) + cfgHash;
    if (cache[src] && cache[src].key === key && Object.values(cache[src].entry).every(v => typeof v !== 'object' || !v.f || Object.values(v.f).every(u => fs.existsSync(u)))) {
      man.files[src] = cache[src].entry; newCache[src] = cache[src];
      for (const t of ['m', 'l']) if (cache[src].entry[t]) for (const u of Object.values(cache[src].entry[t].f)) written.add(u.slice(OUT.length + 1));
      continue }
    const e = { kb: Math.round(sbuf.length / 1024) };
    try {
      if (src.endsWith('.glb')) {
        const l = await buildGlb(src, CFG.size.glbTex.l);
        e.l = { f: { glb: emit(src, 'l', 'glb', l.buf) }, kb: Math.round(l.buf.length / 1024) };
        if (l.texMax > CFG.size.glbTex.m) { const m = await buildGlb(src, CFG.size.glbTex.m); e.m = { f: { glb: emit(src, 'm', 'glb', m.buf) }, kb: Math.round(m.buf.length / 1024) } }
        else e.m = e.l;
      } else if (src.endsWith('.hdr')) {
        let im = hdrToFloat(readHDR(sbuf));
        for (const t of ['l', 'm']) { while (im.W > CFG.size.hdr[t]) im = halve(im); const b = writeHDR(im); e[t] = { f: { hdr: emit(src, t, 'hdr', b) }, kb: Math.round(b.length / 1024), w: im.W, h: im.H } }
      } else {
        const kind = kindOf(src), meta = await sharp(src).metadata(), alpha = meta.hasAlpha;
        e.w = meta.width; e.h = meta.height; e.avg = await avgColour(src);
        for (const t of ['m', 'l']) {
          const max = CFG.size[kind][t], f = {}; let kb = 0, w, h;
          for (const fmt of t === 'm' ? ['webp', alpha ? 'png' : 'jpg'] : ['webp']) {
            const r = await encodeImage(src, max, fmt, t === 'l' && isExact(src));
            /* WebP of an already well-compressed jpg can come out bigger: ship the source bytes instead */
            if (fmt === 'webp' && t === 'l' && src.endsWith('.jpg') && r.w === meta.width && r.h === meta.height && r.buf.length > sbuf.length * .92) { f.jpg = emit(src, t, 'jpg', sbuf); kb = Math.round(sbuf.length / 1024); w = r.w; h = r.h; continue }
            f[fmt] = emit(src, t, fmt, r.buf); if (fmt === 'webp') { kb = Math.round(r.buf.length / 1024); w = r.w; h = r.h } }
          e[t] = { f, kb, w, h };
        }
      }
    } catch (err) { console.warn('skip', src, err.message); continue }
    man.files[src] = e; newCache[src] = { key, entry: e };
    console.log(src.padEnd(48), e.kb + 'k ->', 'm ' + e.m.kb + 'k', 'l ' + e.l.kb + 'k');
  }
  /* boot packs: one with WebP images, one with jpg/png for browsers without WebP */
  const bootSrc = Object.keys(man.files).filter(s => CFG.boot.some(b => s.startsWith(b)));
  man.boot = {};
  for (const fmt of ['webp', 'jpg']) {
    const entries = [], blobs = []; let off = 0;
    for (const s of bootSrc) { const v = man.files[s].m.f; const u = v.glb || v.hdr || (fmt === 'webp' ? v.webp : (v.jpg || v.png)); const b = fs.readFileSync(u);
      entries.push({ src: s, url: u, off, len: b.length }); blobs.push(b); off += b.length; const pad = (4 - (b.length % 4)) % 4; if (pad) { blobs.push(Buffer.alloc(pad)); off += pad } }
    const json = Buffer.from(JSON.stringify({ entries })); const jpad = Buffer.alloc((4 - (json.length % 4)) % 4, 32);
    const head = Buffer.alloc(8); head.write('HTPK', 0, 'latin1'); head.writeUInt32LE(json.length + jpad.length, 4);
    const pack = Buffer.concat([head, json, jpad, ...blobs]);
    man.boot[fmt] = { url: emit('assets/boot.' + fmt + '.bin', 'pack', 'bin', pack).replace(/\.pack\./, '.'), kb: Math.round(pack.length / 1024), n: entries.length };
    /* emit() wrote boot.<fmt>.pack.<hash>.bin; the manifest names boot.<fmt>.<hash>.bin. Keep exactly one copy (PERF-03: an incremental build
       with an unchanged hash used to leave the .pack. twin behind, and the stale-output sweep kept it because emit() had listed it) */
    const real = path.join(ROOT, man.boot[fmt].url), packed = path.join(OUT, path.basename(man.boot[fmt].url).replace(/^boot\.(\w+)\./, 'boot.$1.pack.'));
    if (!fs.existsSync(real)) fs.renameSync(packed, real); else if (fs.existsSync(packed)) fs.unlinkSync(packed);
    written.delete(path.basename(packed)); written.add(path.basename(real));
    console.log('boot pack', fmt, man.boot[fmt].n, 'files', man.boot[fmt].kb + 'k');
  }
  man.v = hash(JSON.stringify(man.files) + JSON.stringify(man.boot));
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(man));
  fs.writeFileSync(cacheFile, JSON.stringify(newCache));
  /* remove stale outputs */
  for (const f of walk(OUT)) { const r = f.slice(OUT.length + 1); if (!written.has(r)) fs.unlinkSync(f) }
  /* service worker version */
  const sw = path.join(ROOT, 'sw.js');
  if (fs.existsSync(sw)) { const s = fs.readFileSync(sw, 'utf8'); fs.writeFileSync(sw, s.replace(/const ASSET_VERSION='[^']*'/, `const ASSET_VERSION='${man.v}'`)) }
  const tot = t => Object.values(man.files).reduce((s, e) => s + (e[t] ? e[t].kb : 0), 0);
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s · manifest ${man.v} · sources ${tot('kb') === 0 ? '' : Object.values(man.files).reduce((s, e) => s + e.kb, 0) + 'k'} · m ${tot('m')}k · l ${tot('l')}k`);
})().catch(e => { console.error(e); process.exit(1) });
