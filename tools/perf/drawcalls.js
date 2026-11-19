/* per-pass draw calls and the biggest mesh groups in a level: node tools/perf/drawcalls.js [level=-1 hub | 0..3] */
const { chromium } = require('playwright');
(async () => {
  const lvl = +(process.argv[2] ?? -1);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1' } : undefined });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => console.log('err', e.message));
  await p.goto(process.argv[3] || 'http://127.0.0.1:8001/');
  await p.waitForFunction(() => !document.getElementById('bStart').disabled, null, { timeout: 120000 });
  const r = await p.evaluate(lvl => {
    const h = window.__ht, R = h.renderer; document.getElementById('bStart').click(); if (lvl >= 0) h.startMission(lvl); h.step(5);
    const passes = []; const orig = R.render.bind(R);
    R.info.autoReset = false;
    R.render = (s, c) => { const a = R.info.render.calls, t = R.info.render.triangles; orig(s, c); passes.push([s === h.scene ? 'scene' : s.type || 'other', c.type, R.getRenderTarget() ? 'rt' : 'screen', R.info.render.calls - a, R.info.render.triangles - t]) };
    /* shadow map renders go through renderer.shadowMap.render, counted as part of the first scene render */
    const sm = R.shadowMap, so = sm.render.bind(sm); sm.render = (...a) => { const c0 = R.info.render.calls, t0 = R.info.render.triangles; so(...a); passes.push(['shadowmap', '', '', R.info.render.calls - c0, R.info.render.triangles - t0]) };
    R.info.reset(); h.draw(); R.render = orig; sm.render = so; R.info.autoReset = true;
    const groups = {}; let n = 0, shadow = 0, shadowTris = 0;
    const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(h.camera.projectionMatrix, h.camera.matrixWorldInverse));
    h.scene.traverse(o => { if (!(o.isMesh || o.isInstancedMesh || o.isPoints || o.isLine) || !o.visible) return; let vis = true; for (let q = o; q; q = q.parent) if (!q.visible) vis = false; if (!vis) return;
      const g = o.geometry, tris = g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0), inst = o.isInstancedMesh ? o.count : 1;
      let key = o.userData.wkey || o.name || ''; let q = o.parent; while (!key && q) { key = q.userData && (q.userData.kind || q.userData.wkey) || q.name; q = q.parent }
      key = (key || 'anon') + (o.isInstancedMesh ? ' [inst]' : '');
      const gg = groups[key] || (groups[key] = { meshes: 0, tris: 0, shadow: 0, inView: 0 }); gg.meshes++; gg.tris += tris * inst; n++;
      if (o.castShadow) { gg.shadow++; shadow++; shadowTris += tris * inst }
      if (!o.frustumCulled || (g.boundingSphere || (g.computeBoundingSphere(), g.boundingSphere)) && fr.intersectsObject(o)) gg.inView++ });
    const top = Object.entries(groups).sort((a, b) => b[1].meshes - a[1].meshes).slice(0, 25);
    return { passes, meshes: n, castShadow: shadow, shadowTris, top };
  }, lvl);
  console.log('passes [scene, camera, target, calls, tris]:'); r.passes.forEach(x => console.log('  ', JSON.stringify(x)));
  console.log('visible meshes', r.meshes, 'castShadow', r.castShadow, 'shadow tris', r.shadowTris);
  r.top.forEach(([k, v]) => console.log('  ', k.padEnd(28), JSON.stringify(v)));
  await b.close();
})();
