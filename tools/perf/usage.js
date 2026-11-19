/* which loaded assets each level actually puts in the scene (matched by texture image / geometry identity):
   node tools/perf/usage.js [url] */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1' } : undefined });
  const p = await b.newPage();
  await p.goto(process.argv[2] || 'http://127.0.0.1:8000/');
  await p.waitForFunction(() => (()=>{const b=document.querySelector('.ht-title [data-act=newgame]')||document.getElementById('bStart');return !!b&&!b.disabled})(), null, { timeout: 120000 });
  const r = await p.evaluate(() => {
    const h = window.__ht, A = h.assets, own = new Map();
    const tag = (o, n) => { if (o && !own.has(o)) own.set(o, n) };
    for (const n in A.gltfs) A.gltfs[n].scene.traverse(o => { if (o.isMesh) { tag(o.geometry.attributes.position.array, 'glb:' + n); for (const m of [].concat(o.material)) for (const k in m) if (m[k] && m[k].isTexture) tag(m[k].image, 'glb:' + n) } });
    for (const n in A.textures) for (const k in A.textures[n]) tag(A.textures[n][k].image, 'tex:' + n);
    for (const n in A.decals) tag(A.decals[n].image, 'decal:' + n);
    if (A.skyTex) tag(A.skyTex.image, 'sky');
    const scan = () => { const s = new Set(); h.scene.traverse(o => { if (!o.isMesh && !o.isInstancedMesh) return; const pa = o.geometry && o.geometry.attributes.position; if (pa && own.has(pa.array)) s.add(own.get(pa.array));
      for (const m of [].concat(o.material || [])) for (const k in m) { const t = m[k]; if (t && t.isTexture && own.has(t.image)) s.add(own.get(t.image)) } }); return [...s].sort() };
    const out = {}; (document.querySelector('.ht-title [data-act=newgame]')||document.getElementById('bStart')).click(); h.step(5); out.hub = scan();
    for (let i = 0; i < 4; i++) { h.startMission(i); h.step(5); out['m' + i] = scan() }
    out.loaded = [...new Set(own.values())].sort();
    return out;
  });
  const used = new Set(); for (const k in r) if (k !== 'loaded') r[k].forEach(x => used.add(x));
  for (const k in r) if (k !== 'loaded') console.log(k + ':', r[k].join(' '));
  console.log('loaded but never in a scene:', r.loaded.filter(x => !used.has(x)).join(' '));
  await b.close();
})();
