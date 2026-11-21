/* High Trust: procedural buildings (suburban houses, shops, shells).
   HT.Buildings.init({assets, base}) once (assets = the game's ASSETS object, base = path prefix to the repo root, default '').
   house/shop/shell return a THREE.Group built from merged BufferGeometry (one mesh per material).
   Local frame: footprint w (X) x d (Z) centred on the origin, ground at y=0, front door on the 'facing' side.
   The walls fill the footprint; eaves overhang it by up to 0.6 m and front steps/stoops/porticos by up to 1.8 m on the door side. */
(function () {
  'use strict';
  const HT = window.HT = window.HT || {};
  const T = THREE;

  /* ------------------------------------------------------------------ small maths */
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const nrm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const UP = [0, 1, 0];

  function hashSeed(s) {
    if (typeof s === 'number' && isFinite(s)) s = String(s);
    s = String(s == null ? 'x' : s); let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function RNG(seed) {
    let a = hashSeed(seed) || 0x9e3779b9;
    const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    f.r = (lo, hi) => lo + f() * (hi - lo);
    f.i = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    f.chance = p => f() < p;
    return f;
  }
  const LIN = {};
  function lc(hex, k = 1) { /* sRGB hex -> linear rgb array (vertex colours are linear) */
    const key = hex + '|' + k; if (LIN[key]) return LIN[key];
    const c = new T.Color(hex).convertSRGBToLinear(); return LIN[key] = [c.r * k, c.g * k, c.b * k];
  }
  const cmul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const WHITE = [1, 1, 1];

  /* ------------------------------------------------------------------ geometry builder */
  /* Buckets of triangles keyed by material name; everything is merged into one mesh per material at the end. */
  class Builder {
    constructor() { this.g = {}; this.col = WHITE; this.mats = {}; }
    B(k) { return this.g[k] || (this.g[k] = { p: [], n: [], u: [], c: [], i: [] }); }
    /* convex polygon; uv: array of [u,v] or a projector fn(P)->[u,v]; cols: per-vertex colours or null; expN: wanted facing */
    poly(k, P, uv, cols, expN) {
      let nx = 0, ny = 0, nz = 0;
      for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); }
      const l = Math.hypot(nx, ny, nz); if (l < 1e-10) return; nx /= l; ny /= l; nz /= l;
      let UV = typeof uv === 'function' ? P.map(uv) : (uv || P.map(() => [0, 0]));
      let C = cols;
      if (expN && nx * expN[0] + ny * expN[1] + nz * expN[2] < 0) { P = P.slice().reverse(); UV = UV.slice().reverse(); if (C) C = C.slice().reverse(); nx = -nx; ny = -ny; nz = -nz; }
      const b = this.B(k), base = b.p.length / 3;
      for (let j = 0; j < P.length; j++) {
        const p = P[j], c = C ? C[j] : this.col;
        b.p.push(p[0], p[1], p[2]); b.n.push(nx, ny, nz); b.u.push(UV[j][0], UV[j][1]); b.c.push(c[0], c[1], c[2]);
      }
      for (let j = 1; j < P.length - 1; j++) b.i.push(base, base + j, base + j + 1);
    }
    /* oriented box: centre c, unit axes ex,ey,ez (right handed), half sizes. o: {mpr, skip:'px nz..', atlas:{pz:[u0,v0,u1,v1]}, col} */
    obox(k, c, ex, ey, ez, hx, hy, hz, o = {}) {
      const mpr = o.mpr || 1, F = [
        ['px', ex, mul(ez, -1), ey, hx, hz, hy], ['nx', mul(ex, -1), ez, ey, hx, hz, hy],
        ['pz', ez, ex, ey, hz, hx, hy], ['nz', mul(ez, -1), mul(ex, -1), ey, hz, hx, hy],
        ['py', ey, ex, mul(ez, -1), hy, hx, hz], ['ny', mul(ey, -1), ex, ez, hy, hx, hz]];
      const prev = this.col; if (o.col) this.col = o.col;
      for (const [nm, N, U, V, hn, hu, hv] of F) {
        if (o.skip && o.skip.indexOf(nm) >= 0) continue;
        const fc = add(c, mul(N, hn));
        const P = [add(fc, add(mul(U, -hu), mul(V, -hv))), add(fc, add(mul(U, hu), mul(V, -hv))), add(fc, add(mul(U, hu), mul(V, hv))), add(fc, add(mul(U, -hu), mul(V, hv)))];
        let uv;
        const at = o.atlas && o.atlas[nm];
        if (at) uv = o.flipU ? [[at[2], at[1]], [at[0], at[1]], [at[0], at[3]], [at[2], at[3]]] : [[at[0], at[1]], [at[2], at[1]], [at[2], at[3]], [at[0], at[3]]];
        else uv = P.map(p => [dot(p, U) / mpr, dot(p, V) / mpr]);
        const C = o.cols && o.cols[nm] ? [o.cols[nm], o.cols[nm], o.cols[nm], o.cols[nm]] : null;
        this.poly(k, P, uv, C, null);
      }
      this.col = prev;
    }
    box(k, x0, y0, z0, x1, y1, z1, o) { this.obox(k, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [1, 0, 0], [0, 1, 0], [0, 0, 1], Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2, o); }
    /* box whose long axis runs p0->p1 (centre line), 'side' picks the width direction, w = width, h = height */
    beam(k, p0, p1, side, w, h, o) {
      const d = sub(p1, p0), L = len(d); if (L < 1e-5) return; const ex = mul(d, 1 / L);
      let ez = nrm(sub(side, mul(ex, dot(side, ex)))), ey = cross(ez, ex);
      if (ey[1] < 0) { ey = mul(ey, -1); ez = mul(ez, -1); }
      this.obox(k, mul(add(p0, p1), .5), ex, ey, ez, L / 2, h / 2, w / 2, o);
    }
    /* append a THREE.BufferGeometry transformed by matrix m (THREE.Matrix4) */
    geo(k, g, m, col) {
      const b = this.B(k), base = b.p.length / 3, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      const v = new T.Vector3(), nm = new T.Matrix3().getNormalMatrix(m), c = col || this.col;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(m); b.p.push(v.x, v.y, v.z);
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); b.n.push(v.x, v.y, v.z);
        b.u.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0); b.c.push(c[0], c[1], c[2]);
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) b.i.push(base + g.index.getX(i));
      else for (let i = 0; i < P.count; i++) b.i.push(base + i);
    }
    /* merge into a group; rot = rotation about Y applied to everything (facing) */
    build(rot) {
      const grp = new T.Group(), cs = Math.cos(rot), sn = Math.sin(rot);
      let tris = 0;
      for (const k of Object.keys(this.g)) {
        const b = this.g[k]; if (!b.i.length) continue;
        const m = this.mats[k] || MAT[k]; if (!m) { console.warn('buildings: no material', k); continue; }
        const p = new Float32Array(b.p), n = new Float32Array(b.n);
        if (rot) for (let i = 0; i < p.length; i += 3) {
          const x = p[i], z = p[i + 2]; p[i] = x * cs + z * sn; p[i + 2] = -x * sn + z * cs;
          const a = n[i], c = n[i + 2]; n[i] = a * cs + c * sn; n[i + 2] = -a * sn + c * cs;
        }
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(p, 3));
        g.setAttribute('normal', new T.BufferAttribute(n, 3));
        g.setAttribute('uv', new T.BufferAttribute(new Float32Array(b.u), 2));
        g.setAttribute('color', new T.BufferAttribute(new Float32Array(b.c), 3));
        const vc = p.length / 3;
        g.setIndex(new T.BufferAttribute(vc > 65535 ? new Uint32Array(b.i) : new Uint16Array(b.i), 1));
        g.computeBoundingSphere(); g.computeBoundingBox();
        const mesh = new T.Mesh(g, m); mesh.name = k;
        const noShadow = NOSHADOW.has(k) || (m.userData && m.userData.noShadow);
        mesh.castShadow = !noShadow; mesh.receiveShadow = !(k === 'glow' || k === 'skirt'); if (noShadow) mesh.userData.noShadow = true;
        if (k === 'glass' || k === 'skirt' || k === 'grime') mesh.renderOrder = 2;
        grp.add(mesh); tris += b.i.length / 3;
      }
      grp.userData.tris = tris; grp.userData.drawCalls = grp.children.length;
      return grp;
    }
  }
  const NOSHADOW = new Set(['glass', 'interior', 'skirt', 'glow', 'grime']);

  /* ------------------------------------------------------------------ materials + textures */
  let A = null, BASE = '', MAT = null, ATL = null, INTL = null, NIGHT = 0;
  const MPR = { siding: 1.6, brick: 1.4, stucco: 2.0, shingle: 2.24, concrete: 2.0, corr: 2.7, metalroof: 2.7, trim: 1, block: 1.6 };
  const loader = () => new T.TextureLoader();
  function tex2(name, srgb, onload) {
    /* the game's ASSETS streams a reduced image first and swaps in the full one (same texture object) */
    if (A && A.texture && !onload) return A.texture(BASE + 'assets/tex2/' + name + '.jpg', srgb);
    const t = loader().load(BASE + 'assets/tex2/' + name + '.jpg', onload, undefined, () => console.warn('buildings: texture failed', name));
    t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; if (srgb) t.encoding = T.sRGBEncoding; return t;
  }
  function std(o) { const m = new T.MeshStandardMaterial(Object.assign({ roughness: .8, metalness: 0, vertexColors: true }, o)); return m; }
  function setMaps(m, set, ns) {
    if (!set) return m; if (set.map) m.map = set.map; if (set.normalMap) { m.normalMap = set.normalMap; m.normalScale = new T.Vector2(ns, ns); }
    if (set.roughnessMap) { m.roughnessMap = set.roughnessMap; m.roughness = 1; } m.needsUpdate = true; return m;
  }
  function set2(name) { return { map: tex2(name + '_col', true), normalMap: tex2(name + '_nrm', false), roughnessMap: tex2(name + '_rgh', false) }; }

  /* fixtures atlas: doors, garage doors, shutters, vents, roll-up door, plywood, digits, backboard, flag, AC grille */
  const AW = 2048, AH = 1024;
  const RG = {
    gar1: [0, 0, 512, 448], gar2: [512, 0, 1024, 448], door: [1536, 0, 256, 576], shut: [1792, 0, 128, 512], vent: [1920, 0, 128, 128],
    roll: [0, 448, 512, 512], ply: [512, 448, 256, 512], digits: [768, 448, 640, 96], board: [768, 544, 256, 160], flag: [1024, 544, 256, 136],
    grille: [1280, 544, 256, 256], door2: [1792, 512, 256, 512], panel: [1536, 576, 256, 256], vent2: [1920, 128, 128, 128]
  };
  function rgUV(r, inset = 2) { return [(r[0] + inset) / AW, 1 - (r[1] + r[3] - inset) / AH, (r[0] + r[2] - inset) / AW, 1 - (r[1] + inset) / AH]; }
  function digitUV(d) { const r = RG.digits, w = r[2] / 10; return rgUV([r[0] + d * w, r[1], w, r[3]], 3); }

  function buildAtlas() {
    const col = document.createElement('canvas'), nor = document.createElement('canvas');
    col.width = nor.width = AW; col.height = nor.height = AH;
    const cx = col.getContext('2d'), nx = nor.getContext('2d');
    cx.fillStyle = '#dcdcdc'; cx.fillRect(0, 0, AW, AH); nx.fillStyle = 'rgb(128,128,255)'; nx.fillRect(0, 0, AW, AH);
    const tCol = new T.CanvasTexture(col), tNor = new T.CanvasTexture(nor);
    tCol.encoding = T.sRGBEncoding; tCol.anisotropy = 8; tNor.anisotropy = 8;
    const imgs = {}; let pending = 0;
    const want = [['gd', 'assets/tex2/garagedoor_col.jpg'], ['gdn', 'assets/tex2/garagedoor_nrm.jpg'], ['d6', 'assets/tex2/door6_col.jpg'], ['d6n', 'assets/tex2/door6_nrm.jpg'],
      ['sh', 'assets/tex2/shutter_col.jpg'], ['shn', 'assets/tex2/shutter_nrm.jpg'], ['wf', 'assets/tex/woodfloor_col.jpg'], ['wfn', 'assets/tex/woodfloor_nrm.jpg']];
    const redraw = () => {
      const R = RG, I = imgs;
      const put = (ctx, img, r, sx, sy, sw, sh) => { if (img) ctx.drawImage(img, sx || 0, sy || 0, sw || img.width, sh || img.height, r[0], r[1], r[2], r[3]); };
      /* garage doors */
      put(cx, I.gd, R.gar1); put(nx, I.gdn, R.gar1);
      put(cx, I.gd, [R.gar2[0], 0, 512, 448]); put(cx, I.gd, [R.gar2[0] + 512, 0, 512, 448]);
      put(nx, I.gdn, [R.gar2[0], 0, 512, 448]); put(nx, I.gdn, [R.gar2[0] + 512, 0, 512, 448]);
      /* six panel door */
      put(cx, I.d6, R.door); put(nx, I.d6n, R.door);
      /* half-glass craftsman door: panels below, 3x2 lites above */
      { const r = R.door2; const ds = im => im.width / 256; if (I.d6) cx.drawImage(I.d6, 0, 288 * ds(I.d6), 256 * ds(I.d6), 288 * ds(I.d6), r[0], r[1] + 256, 256, 256); if (I.d6n) nx.drawImage(I.d6n, 0, 288 * ds(I.d6n), 256 * ds(I.d6n), 288 * ds(I.d6n), r[0], r[1] + 256, 256, 256);
        cx.fillStyle = '#e0e0e0'; cx.fillRect(r[0], r[1], 256, 256); nx.fillStyle = 'rgb(128,128,255)'; nx.fillRect(r[0], r[1], 256, 256);
        for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
          const x = r[0] + 34 + i * 98, y = r[1] + 28 + j * 72, w = 90, h = 64;
          const g = cx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#2c3238'); g.addColorStop(.5, '#4b5560'); g.addColorStop(1, '#1d2226');
          cx.fillStyle = g; cx.fillRect(x, y, w, h);
          nx.fillStyle = 'rgb(128,200,220)'; nx.fillRect(x - 3, y - 3, w + 6, 3); nx.fillStyle = 'rgb(128,56,220)'; nx.fillRect(x - 3, y + h, w + 6, 3);
          nx.fillStyle = 'rgb(56,128,220)'; nx.fillRect(x - 3, y, 3, h); nx.fillStyle = 'rgb(200,128,220)'; nx.fillRect(x + w, y, 3, h);
        } }
      /* louvered shutter: slats from the shutter texture inside painted stiles/rails */
      { const r = R.shut; put(cx, I.sh, r, 0, 0, 380, 1024); put(nx, I.shn, r, 0, 0, 380, 1024);
        cx.fillStyle = '#d8d8d8'; nx.fillStyle = 'rgb(128,128,255)';
        for (const [x, y, w, h] of [[0, 0, 14, 512], [114, 0, 14, 512], [0, 0, 128, 16], [0, 496, 128, 16], [0, 248, 128, 14]]) { cx.fillRect(r[0] + x, r[1] + y, w, h); nx.fillRect(r[0] + x, r[1] + y, w, h); }
        nx.fillStyle = 'rgb(160,128,240)'; nx.fillRect(r[0] + 14, r[1], 3, 512); nx.fillStyle = 'rgb(96,128,240)'; nx.fillRect(r[0] + 111, r[1], 3, 512); }
      /* gable vent: louvers in a frame */
      for (const r of [R.vent, R.vent2]) { put(cx, I.sh, r, 0, 0, 260, 260); put(nx, I.shn, r, 0, 0, 260, 260);
        cx.fillStyle = '#e4e4e4'; nx.fillStyle = 'rgb(128,128,255)';
        for (const [x, y, w, h] of [[0, 0, 12, 128], [116, 0, 12, 128], [0, 0, 128, 12], [0, 116, 128, 12]]) { cx.fillRect(r[0] + x, r[1] + y, w, h); nx.fillRect(r[0] + x, r[1] + y, w, h); } }
      /* roll-up door */
      { const r = R.roll; put(cx, I.sh, r); put(nx, I.shn, r); cx.fillStyle = 'rgba(40,40,40,.35)'; cx.fillRect(r[0], r[1] + r[3] - 22, r[2], 22); }
      /* plywood boards (boarded-up windows) */
      { const r = R.ply; if (I.wf) { cx.drawImage(I.wf, 0, 0, I.wf.width / 2, I.wf.height, r[0], r[1], r[2], r[3]); cx.globalCompositeOperation = 'screen'; cx.fillStyle = '#7a5a36'; cx.fillRect(r[0], r[1], r[2], r[3]); cx.globalCompositeOperation = 'source-over'; }
        if (I.wfn) nx.drawImage(I.wfn, 0, 0, I.wfn.width / 2, I.wfn.height, r[0], r[1], r[2], r[3]);
        cx.fillStyle = 'rgba(30,20,10,.55)'; cx.fillRect(r[0], r[1] + 250, r[2], 4); nx.fillStyle = 'rgb(128,60,230)'; nx.fillRect(r[0], r[1] + 250, r[2], 4);
        cx.fillStyle = '#3a3430'; for (let i = 0; i < 6; i++) for (const y of [20, 240, 262, 490]) cx.fillRect(r[0] + 18 + i * 42, r[1] + y, 4, 4); }
      /* digits: black on white, for house numbers */
      { const r = R.digits, w = r[2] / 10; cx.fillStyle = '#f2f0ea'; cx.fillRect(r[0], r[1], r[2], r[3]);
        cx.fillStyle = '#16171a'; cx.font = 'bold 80px Georgia, "Times New Roman", serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        for (let d = 0; d < 10; d++) cx.fillText(String(d), r[0] + w * d + w / 2, r[1] + r[3] / 2 + 4); }
      /* basketball backboard */
      { const r = R.board; cx.fillStyle = '#f4f4f2'; cx.fillRect(r[0], r[1], r[2], r[3]); cx.strokeStyle = '#d0451b'; cx.lineWidth = 6;
        cx.strokeRect(r[0] + 6, r[1] + 6, r[2] - 12, r[3] - 12); cx.strokeRect(r[0] + 88, r[1] + 62, 80, 62); }
      /* flag */
      { const r = R.flag, sh = r[3] / 13; for (let i = 0; i < 13; i++) { cx.fillStyle = i % 2 ? '#f3f1ec' : '#b0202c'; cx.fillRect(r[0], r[1] + i * sh, r[2], Math.ceil(sh)); }
        cx.fillStyle = '#26305e'; cx.fillRect(r[0], r[1], r[2] * .4, sh * 7); cx.fillStyle = '#f3f1ec';
        for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) { cx.beginPath(); cx.arc(r[0] + 9 + j * 16.5, r[1] + 8 + i * 15.5, 2.2, 0, 7); cx.fill(); } }
      /* AC grille */
      { const r = R.grille; cx.fillStyle = '#2b2d2f'; cx.fillRect(r[0], r[1], r[2], r[3]); cx.fillStyle = '#8d8f8c';
        for (let i = 0; i < 64; i++) cx.fillRect(r[0], r[1] + i * 4, r[2], 1.5); for (let i = 0; i < 64; i++) cx.fillRect(r[0] + i * 4, r[1], 1, r[3]);
        nx.fillStyle = 'rgb(128,150,240)'; for (let i = 0; i < 64; i++) nx.fillRect(r[0], r[1] + i * 4, r[2], 1.5); }
      /* plain painted sheet metal panel with a seam */
      { const r = R.panel; cx.fillStyle = '#d6d6d4'; cx.fillRect(r[0], r[1], r[2], r[3]); cx.fillStyle = 'rgba(0,0,0,.15)'; cx.fillRect(r[0], r[1] + 128, r[2], 2); }
      tCol.needsUpdate = true; tNor.needsUpdate = true;
    };
    for (const [k, url] of want) {
      pending++;
      if (A && A.image) { A.image(BASE + url, im => { imgs[k] = im; redraw(); }); continue; }
      const im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = () => { imgs[k] = im; redraw(); }; im.onerror = () => console.warn('buildings: atlas image failed', url);
      im.src = BASE + url;
    }
    redraw();
    return { col: tCol, nor: tNor };
  }

  /* interior cards seen through glass: 8 cells of 256x512 */
  function buildInteriors() {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 512; const x = c.getContext('2d');
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
    const room = (i, top, bot) => { const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, top); g.addColorStop(.78, bot); g.addColorStop(.781, '#1e1915'); g.addColorStop(1, '#141210'); x.fillStyle = g; x.fillRect(i * 256, 0, 256, 512); };
    const draw = img => {
      for (let i = 0; i < 4; i++) room(i, '#4a4440', '#2c2724');
      if (img) x.drawImage(img, 0, 0, img.width, img.height, 0, 0, 1024, 512);
      /* 4: store shelves */
      { const o = 4 * 256; room(4, '#d8dad6', '#a9aba6'); const r = RNG('shelf');
        for (let s = 0; s < 5; s++) { const y = 150 + s * 62; x.fillStyle = '#6d7175'; x.fillRect(o, y + 46, 256, 6);
          for (let px = o + 2; px < o + 254;) { const w = 8 + r() * 16, h = 18 + r() * 26; x.fillStyle = `hsl(${Math.floor(r() * 360)},${15 + r() * 30}%,${28 + r() * 30}%)`; x.fillRect(px, y + 46 - h, w - 2, h); px += w; } }
        x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 3; i++) x.fillRect(o + 20 + i * 80, 20, 50, 8); }
      /* 5: workshop / garage interior */
      { const o = 5 * 256; room(5, '#5b5a55', '#3a3936'); x.fillStyle = '#8a1d1d'; x.fillRect(o + 20, 300, 70, 100); x.fillStyle = '#25282b'; x.fillRect(o + 120, 210, 120, 8);
        x.fillStyle = '#6c6a60'; for (let i = 0; i < 6; i++) x.fillRect(o + 125 + i * 19, 150, 10, 55); x.fillStyle = 'rgba(255,250,230,.7)'; x.fillRect(o + 30, 24, 190, 6); }
      /* 6: office: desk + window light */
      { const o = 6 * 256; room(6, '#c9c4b8', '#8f8a80'); x.fillStyle = '#4b3a2a'; x.fillRect(o + 30, 300, 190, 18); x.fillRect(o + 40, 318, 10, 80); x.fillRect(o + 200, 318, 10, 80);
        x.fillStyle = '#1d1f22'; x.fillRect(o + 90, 250, 60, 46); x.fillStyle = '#e8e4da'; x.fillRect(o + 170, 120, 50, 70); }
      /* 7: dark, empty and grimy */
      { const o = 7 * 256; room(7, '#26221f', '#14110f'); x.fillStyle = 'rgba(80,70,50,.4)'; x.fillRect(o + 40, 260, 120, 160); x.fillStyle = '#0a0908'; x.fillRect(o + 170, 140, 70, 270); }
      t.needsUpdate = true;
    };
    draw(null);
    if (A && A.image) A.image(BASE + 'assets/tex2/interiors.jpg', draw);
    else { const im = new Image(); im.onload = () => draw(im); im.onerror = () => draw(null); im.src = BASE + 'assets/tex2/interiors.jpg'; }
    return t;
  }
  const intUV = (i, flip) => { const u0 = i / 8 + .002, u1 = (i + 1) / 8 - .002; return flip ? [u1, 0, u0, 1] : [u0, 0, u1, 1]; };

  function gradTex() {
    const c = document.createElement('canvas'); c.width = 4; c.height = 64; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#000'); g.addColorStop(.55, '#555'); g.addColorStop(1, '#fff'); x.fillStyle = g; x.fillRect(0, 0, 4, 64);
    const t = new T.CanvasTexture(c); return t;
  }
  function grimeTex() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
    const r = RNG('grime');
    for (let i = 0; i < 70; i++) { const px = r() * 256, w = 2 + r() * 10, h = 40 + r() * 200, g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, `rgba(255,255,255,${.25 + r() * .5})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(px, 0, w, h); }
    for (let i = 0; i < 25; i++) { const px = r() * 256, py = r() * 256, rr = 10 + r() * 40, g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }

  function makeMaterials() {
    const M = {};
    M.siding = setMaps(std({}), set2('lapsiding'), 1);
    M.stucco = setMaps(std({}), set2('stucco'), .8);
    M.shingle = setMaps(std({}), set2('shingle'), 1);
    M.corr = setMaps(std({ metalness: .05 }), set2('corrugated'), 1);
    const bt = A && A.tex && A.tex('brick'); M.brick = setMaps(std({}), bt, 1);
    if (!bt) M.brick.color = new T.Color(lc('#8a4a3a')[0], lc('#8a4a3a')[1], lc('#8a4a3a')[2]);
    M.concrete = setMaps(std({}), set2('concrete'), 1);
    const rt = A && A.tex && A.tex('rustmetal'); M.rust = setMaps(std({ metalness: .3 }), rt, 1);
    M.trim = std({ roughness: .55 });
    M.metal = std({ roughness: .42, metalness: .55 });
    M.fixt = std({ roughness: .55, map: ATL.col, normalMap: ATL.nor, normalScale: new T.Vector2(1, 1) });
    M.glass = new T.MeshStandardMaterial({ color: new T.Color(.075, .08, .085), metalness: 1, roughness: .04, envMapIntensity: 1, transparent: true, opacity: .5, depthWrite: false,
      blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor });
    M.interior = new T.MeshBasicMaterial({ map: INTL, color: new T.Color(.5, .5, .5), vertexColors: true });
    M.glow = new T.MeshBasicMaterial({ color: new T.Color(2, 1.6, 1.05), toneMapped: false, vertexColors: true });
    M.skirt = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .5, alphaMap: gradTex(), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    M.grime = new T.MeshStandardMaterial({ color: new T.Color(.05, .045, .03), roughness: 1, transparent: true, opacity: .55, alphaMap: grimeTex(), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    return M;
  }

  /* ------------------------------------------------------------------ palettes (real exterior paint colours, sRGB) */
  const PAINT = ['#EDEAE0', '#D1CBC1', '#CCC9C0', '#C2C0BB', '#CDD2CA', '#D1C7B8', '#E8DDB5', '#A7AE9A', '#95978A', '#7D8A96', '#5F6E78', '#434C56', '#54504A', '#B9B3A5', '#8C9A8E', '#C7B79A', '#E3E0D7', '#9AA3A6', '#6F7D6A', '#B8A58A'];
  const PAINT_HOME = ['#5F6E78', '#EDEAE0', '#8C9A8E', '#C7B79A'];
  const TRIM = ['#F2F0EA', '#F2F0EA', '#F2F0EA', '#E9E2D0', '#ECEBE6'];
  const ACCENT = ['#1E1F21', '#24344B', '#2E4636', '#7A2626', '#3E3A36', '#5B3A29', '#2F3D4C', '#4B5A3B', '#7A1F2B'];
  const DOORC = ['#7A2626', '#24344B', '#1E1F21', '#2E4636', '#6B4A2E', '#B5462E', '#F2F0EA', '#3C5872'];
  const ROOFC = ['#5a5b5e', '#4a4b4d', '#6b6156', '#807a70', '#3c3d40', '#5d5248', '#6a6d70'];

  /* ------------------------------------------------------------------ wall frames */
  /* side: f(+z) b(-z) l(-x) r(+x) of a rectangular volume; s runs along the wall, outward normal N */
  function frame(v, side) {
    let o, U, N, L;
    if (side === 'f') { o = [v.x0, 0, v.z1]; U = [1, 0, 0]; N = [0, 0, 1]; L = v.x1 - v.x0; }
    else if (side === 'r') { o = [v.x1, 0, v.z1]; U = [0, 0, -1]; N = [1, 0, 0]; L = v.z1 - v.z0; }
    else if (side === 'b') { o = [v.x1, 0, v.z0]; U = [-1, 0, 0]; N = [0, 0, -1]; L = v.x1 - v.x0; }
    else { o = [v.x0, 0, v.z0]; U = [0, 0, 1]; N = [-1, 0, 0]; L = v.z1 - v.z0; }
    const P = (s, y, dep = 0) => [o[0] + U[0] * s - N[0] * dep, y, o[2] + U[2] * s - N[2] * dep];
    const toS = c => side === 'f' ? c - v.x0 : side === 'r' ? v.z1 - c : side === 'b' ? v.x1 - c : c - v.z0;
    return { side, o, U, N, L, P, toS };
  }
  /* box in wall space: s0..s1 along, y0..y1, depth d0..d1 (positive = into the wall, negative = proud) */
  function wbox(b, F, k, s0, s1, y0, y1, d0, d1, o) {
    const c = F.P((s0 + s1) / 2, (y0 + y1) / 2, (d0 + d1) / 2);
    b.obox(k, c, F.U, UP, F.N, Math.abs(s1 - s0) / 2, Math.abs(y1 - y0) / 2, Math.abs(d1 - d0) / 2, o);
  }
  function wquad(b, F, k, s0, s1, y0, y1, dep, uv, cols, facing) {
    b.poly(k, [F.P(s0, y0, dep), F.P(s1, y0, dep), F.P(s1, y1, dep), F.P(s0, y1, dep)], uv, cols, facing || F.N);
  }

  /* wall surface with rectangular holes, split so AO gradients (vertex colours) read near the ground and under the eaves */
  function wallSurf(b, v, F, k, y0, y1, holes, cover, paint, eave) {
    const mpr = MPR[k] || 1.6;
    const xs = new Set([0, F.L]), ys = new Set([y0, y1]);
    const addY = y => { if (y > y0 && y < y1) ys.add(y); };
    for (const h of holes) { xs.add(clamp(h.s - h.w / 2, 0, F.L)); xs.add(clamp(h.s + h.w / 2, 0, F.L)); addY(h.y0); addY(h.y0 + h.h); }
    for (const c of cover) { xs.add(clamp(c.s0, 0, F.L)); xs.add(clamp(c.s1, 0, F.L)); addY(c.y1); }
    addY(v.base + .45); if (eave) addY(eave - .7);
    for (let y = y0 + 1.2; y < y1 - .3; y += 1.2) addY(y);
    const X = [...xs].sort((a, b) => a - b), Y = [...ys].sort((a, b) => a - b);
    const ao = y => { let k2 = 1 - .26 * (1 - sstep(v.base - .1, v.base + .45, y)); if (eave) k2 *= 1 - .32 * sstep(eave - .7, eave, y); return k2; };
    const proj = p => [dot(p, F.U) / mpr, p[1] / mpr];
    for (let i = 0; i < X.length - 1; i++) for (let j = 0; j < Y.length - 1; j++) {
      const s0 = X[i], s1 = X[i + 1], ya = Y[j], yb = Y[j + 1]; if (s1 - s0 < 1e-4 || yb - ya < 1e-4) continue;
      const sm = (s0 + s1) / 2, ym = (ya + yb) / 2;
      if (holes.some(h => sm > h.s - h.w / 2 && sm < h.s + h.w / 2 && ym > h.y0 && ym < h.y0 + h.h)) continue;
      if (cover.some(c => sm > c.s0 && sm < c.s1 && ym < c.y1)) continue;
      const ca = cmul(paint, ao(ya)), cb = cmul(paint, ao(yb));
      wquad(b, F, k, s0, s1, ya, yb, 0, proj, [ca, ca, cb, cb]);
    }
  }
  const covered = (cover, s, y) => cover.some(c => s >= c.s0 - 1e-3 && s <= c.s1 + 1e-3 && y < c.y1);

  /* ------------------------------------------------------------------ roofs */
  /* volume roof in a ridge frame: a = along the ridge, b = across. ridge 'x': (a,b)=(x,z); ridge 'z': (a,b)=(z,-x) (a proper rotation) */
  function roofFrame(v) {
    if (v.ridge === 'z') return { M: (a, y, b) => [-b, y, a], a0: v.z0, a1: v.z1, b0: -v.x1, b1: -v.x0, endSide: ['b', 'f'] };
    return { M: (a, y, b) => [a, y, b], a0: v.x0, a1: v.x1, b0: v.z0, b1: v.z1, endSide: ['l', 'r'] };
  }
  function gableRoof(b, v, H) {
    const R = roofFrame(v), M = R.M, t = v.pitch, oE = v.oE, oR = v.oR, th = .16, heel = .1;
    const { a0, a1, b0, b1 } = R, hd = (b1 - b0) / 2, bc = (b0 + b1) / 2, sec = Math.sqrt(1 + t * t);
    const yP = v.plate + heel, yE = yP - oE * t, yR = yP + hd * t;
    const e0 = v.ends[0], e1 = v.ends[1];
    const ea0 = e0 === 'gable' ? a0 - oR : e0 === 'hip' ? a0 - oE : a0, ea1 = e1 === 'gable' ? a1 + oR : e1 === 'hip' ? a1 + oE : a1;
    let ra0 = e0 === 'hip' ? a0 + hd : ea0, ra1 = e1 === 'hip' ? a1 - hd : ea1;
    if (ra0 > ra1) ra0 = ra1 = (ra0 + ra1) / 2;
    const Ad = M(1, 0, 0), Bd = M(0, 0, 1);
    const roofCol = v.roofCol, soffit = v.trimCol;
    const sl0 = nrm(add(Bd, mul(UP, t))), sl1 = nrm(add(mul(Bd, -1), mul(UP, t)));
    const projS0 = p => [dot(p, Ad) / MPR.shingle, (dot(p, sl0) - dot(M(0, yE, b0 - oE), sl0)) / MPR.shingle];
    const projS1 = p => [-dot(p, Ad) / MPR.shingle, (dot(p, sl1) - dot(M(0, yE, b1 + oE), sl1)) / MPR.shingle];
    const n0 = nrm(add(mul(Bd, -t), UP)), n1 = nrm(add(mul(Bd, t), UP));
    const slope = (P, proj, n) => { b.col = roofCol; b.poly('shingle', P, proj, null, n); b.col = soffit; b.poly('trim', P.map(p => [p[0], p[1] - th, p[2]]), null, null, mul(n, -1)); };
    const P0 = [M(ea0, yE, b0 - oE), M(ea1, yE, b0 - oE), M(ra1, yR, bc), M(ra0, yR, bc)].filter((p, i, arr) => i === 0 || len(sub(p, arr[i - 1])) > 1e-4);
    const P1 = [M(ea0, yE, b1 + oE), M(ea1, yE, b1 + oE), M(ra1, yR, bc), M(ra0, yR, bc)].filter((p, i, arr) => i === 0 || len(sub(p, arr[i - 1])) > 1e-4);
    slope(P0, projS0, n0); slope(P1, projS1, n1);
    const hipEnd = (ea, ra, sgn) => {
      const Hd = mul(Ad, -sgn), sl = nrm(add(mul(Ad, sgn), mul(UP, t))), base = M(ea, yE, 0);
      const proj = p => [dot(p, Bd) * sgn / MPR.shingle, (dot(p, sl) - dot(base, sl)) / MPR.shingle];
      slope([M(ea, yE, b0 - oE), M(ea, yE, b1 + oE), M(ra, yR, bc)], proj, nrm(add(mul(Hd, t), UP)));
    };
    if (e0 === 'hip') hipEnd(ea0, ra0, 1); if (e1 === 'hip') hipEnd(ea1, ra1, -1);
    /* fascia + gutters on the eaves, rake boards on gable ends */
    b.col = v.trimCol;
    const gut = v.gutterCol || v.trimCol;
    const eaveRun = (p0, p1, outB) => {
      b.beam('trim', add(p0, add(mul(outB, .015), [0, -.08, 0])), add(p1, add(mul(outB, .015), [0, -.08, 0])), outB, .03, .22);
      if (!v.noGutter) {
        b.col = gut;
        b.beam('trim', add(p0, add(mul(outB, .09), [0, -.06, 0])), add(p1, add(mul(outB, .09), [0, -.06, 0])), outB, .13, .11);
        b.beam('trim', add(p0, add(mul(outB, .155), [0, -.03, 0])), add(p1, add(mul(outB, .155), [0, -.03, 0])), outB, .02, .1);
        b.col = v.trimCol;
      }
    };
    eaveRun(M(ea0 - (e0 === 'hip' ? .03 : 0), yE, b0 - oE), M(ea1 + (e1 === 'hip' ? .03 : 0), yE, b0 - oE), mul(Bd, -1));
    eaveRun(M(ea0 - (e0 === 'hip' ? .03 : 0), yE, b1 + oE), M(ea1 + (e1 === 'hip' ? .03 : 0), yE, b1 + oE), Bd);
    if (e0 === 'hip') eaveRun(M(ea0, yE, b0 - oE), M(ea0, yE, b1 + oE), mul(Ad, -1));
    if (e1 === 'hip') eaveRun(M(ea1, yE, b0 - oE), M(ea1, yE, b1 + oE), Ad);
    const rake = (ea, out) => {
      for (const [bb, s] of [[b0 - oE, 1], [b1 + oE, -1]]) {
        const pa = M(ea + out * .015, yE + .02, bb), pb = M(ea + out * .015, yR + .02, bc);
        const dir = nrm(sub(pb, pa)); let nn = cross(dir, mul(Ad, out)); if (nn[1] > 0) nn = mul(nn, -1);
        b.beam('trim', add(pa, mul(nn, .11)), add(pb, mul(nn, .11)), Ad, .035, .24);
      }
    };
    if (e0 === 'gable') rake(ea0, -1); if (e1 === 'gable') rake(ea1, 1);
    /* ridge cap and hip caps */
    b.col = cmul(roofCol, .85);
    if (ra1 - ra0 > .01) {
      const w = .17, prism = (pa, pb) => {
        const top0 = add(pa, [0, .05, 0]), top1 = add(pb, [0, .05, 0]);
        for (const s of [-1, 1]) {
          const o = add(mul(Bd, s * w), [0, -w * t + .02, 0]);
          b.poly('shingle', [top0, top1, add(pb, o), add(pa, o)], [[0, 0], [len(sub(pb, pa)) / MPR.shingle, 0], [len(sub(pb, pa)) / MPR.shingle, .08], [0, .08]], null, add(mul(Bd, s), UP));
        }
      };
      prism(M(ra0 - (e0 === 'gable' ? 0 : 0), yR, bc), M(ra1, yR, bc));
    }
    const hipCap = (ea, ra) => { for (const bb of [b0 - oE, b1 + oE]) { const pa = M(ra, yR + .03, bc), pb = M(ea, yE + .03, bb); b.beam('shingle', pa, pb, cross(nrm(sub(pb, pa)), UP), .22, .06, { mpr: MPR.shingle }); } };
    if (e0 === 'hip') hipCap(ea0, ra0); if (e1 === 'hip') hipCap(ea1, ra1);
    /* gable end walls (triangles above the plate) */
    const gk = v.gableMat || v.mat, gpaint = v.gablePaint || v.paint;
    const gTri = (a, out) => {
      if (v.noGableWall) return;
      const N = mul(Ad, out), mpr = MPR[gk] || 1.6, proj = p => [dot(p, Bd) / mpr, p[1] / mpr];
      const ao = cmul(gpaint, .78);
      b.poly(gk, [M(a, v.plate, b0), M(a, v.plate, b1), M(a, v.plate + hd * t, bc)], proj, [gpaint, gpaint, ao], N);
      if (v.gableVent) {
        const vy = v.plate + hd * t * .42, vh = Math.min(.7, hd * t * .45), vw = vh * .75; b.col = v.trimCol;
        b.obox('fixt', add(M(a + out * .03, vy, bc), [0, 0, 0]), mul(Bd, -out), UP, N, vw / 2 + .06, vh / 2 + .06, .03, { atlas: { pz: rgUV(RG.vent) }, col: v.trimCol });
      }
    };
    if (e0 === 'gable') gTri(a0, -1); if (e1 === 'gable') gTri(a1, 1);
    /* craftsman exposed rafter tails + gable knee braces */
    if (v.rafters) {
      b.col = v.trimCol;
      for (let a = a0 + .3; a < a1 - .1; a += .6) for (const [bw, s] of [[b0, -1], [b1, 1]]) {
        const pa = M(a, yP - th - .07, bw), pb = M(a, yE - th - .07 + .03, bw + s * (oE - .05));
        b.beam('trim', pa, pb, Ad, .05, .13);
      }
      for (const [ae, out, e, bi] of [[a0, -1, e0, 0], [a1, 1, e1, 1]]) if (e === 'gable' && !(v.noBrace && v.noBrace[bi])) for (const bb of [b0 + .35, bc, b1 - .35]) {
        const ytop = yP - th + (hd - Math.abs(bb - bc)) * t - .05;
        const w0 = M(ae + out * .05, ytop - .75, bb), w1 = M(ae + out * (oR - .08), ytop - .02, bb), w2 = M(ae + out * .05, ytop - .06, bb);
        b.beam('trim', w0, w1, Bd, .08, .1); b.beam('trim', w2, w1, Bd, .08, .1);
      }
    }
    /* downspouts at exterior corners on eave sides */
    if (!v.noGutter && !v.noDownspout) {
      b.col = gut;
      for (const [bw, s] of [[b0, -1], [b1, 1]]) for (const [ae, sg, e] of [[a0, 1, e0], [a1, -1, e1]]) {
        if (e === 'none') continue;
        const a = ae + sg * .14, bg = bw + s * (oE + .09), bwall = bw + s * .045;
        const wallSide = R.M(0, 0, s); const outN = wallSide;
        const p1 = M(a, yE - .12, bg), p2 = M(a, yE - .5, bwall), p3 = M(a, .32, bwall), p4 = M(a, .06, bwall + s * .32);
        b.beam('trim', p1, p2, Ad, .07, .055); b.beam('trim', add(p2, [0, .03, 0]), p3, Ad, .075, .055); b.beam('trim', p3, p4, Ad, .075, .055);
        b.col = lc('#9a968c'); b.beam('concrete', M(a, .025, bwall + s * .5), M(a, .025, bwall + s * .95), Ad, .3, .05, { mpr: 2 }); b.col = gut;
        void outN;
      }
    }
    b.col = WHITE;
    return { yE, yR, yP, ea0, ea1, ra0, ra1, R };
  }

  /* single-slope roof (porches, lean-tos): eave line along x at z=zE, high side at the wall z=zW */
  function shedRoof(b, x0, x1, zW, zE, yW, yEv, roofCol, trimCol, gutCol, ends) {
    const th = .14, sgn = Math.sign(zE - zW) || 1;
    const P = [[x0, yEv, zE], [x1, yEv, zE], [x1, yW, zW], [x0, yW, zW]];
    const n = nrm([0, Math.abs(zE - zW), (yW - yEv) * sgn]);
    const sl = nrm([0, yW - yEv, zW - zE]);
    b.col = roofCol; b.poly('shingle', P, p => [p[0] * sgn / MPR.shingle, (dot(p, sl) - dot([0, yEv, zE], sl)) / MPR.shingle], null, n);
    b.col = trimCol; b.poly('trim', P.map(p => [p[0], p[1] - th, p[2]]), null, null, mul(n, -1));
    b.beam('trim', [x0 - .02, yEv - .08, zE + sgn * .015], [x1 + .02, yEv - .08, zE + sgn * .015], [0, 0, 1], .03, .22);
    for (const [x, s] of [[x0, -1], [x1, 1]]) if (!ends || ends[s < 0 ? 0 : 1]) {
      const pa = [x + s * .015, yEv - .06, zE], pb = [x + s * .015, yW - .06, zW];
      b.beam('trim', pa, pb, [1, 0, 0], .03, .22);
    }
    b.col = gutCol || trimCol;
    b.beam('trim', [x0, yEv - .06, zE + sgn * .09], [x1, yEv - .06, zE + sgn * .09], [0, 0, 1], .13, .11);
    b.col = WHITE;
  }

  /* ------------------------------------------------------------------ openings */
  /* window: {s,y0,w,h,kind:'dh'|'pic'|'small'|'slider'|'case', grille, shutters, card, lit, frameCol} */
  function windowAt(b, v, F, o) {
    const { s, y0, w, h } = o, sL = s - w / 2, sR = s + w / 2, y1 = y0 + h;
    const trim = v.trimCol, frameCol = o.frameCol || v.windowCol || trim;
    const brick = v.mat === 'brick', stucco = v.mat === 'stucco';
    /* exterior casing / masonry sill + lintel */
    if (brick) {
      b.col = lc('#bdb6a8'); wbox(b, F, 'concrete', sL - .1, sR + .1, y0 - .08, y0, -.05, .06, { mpr: 2, skip: 'nz' });
      b.col = lc('#a39b8e'); wbox(b, F, 'concrete', sL - .12, sR + .12, y1, y1 + .16, -.012, .02, { mpr: 2, skip: 'nz' });
      b.col = trim; const bw = .05;
      wbox(b, F, 'trim', sL - bw, sL, y0, y1, -.012, .02, { skip: 'nz' }); wbox(b, F, 'trim', sR, sR + bw, y0, y1, -.012, .02, { skip: 'nz' }); wbox(b, F, 'trim', sL - bw, sR + bw, y1 - .0, y1 + .0001 + .0, -.012, .02, { skip: 'nz' });
    } else {
      const cw = stucco ? .12 : .1, pr = stucco ? -.02 : -.026; b.col = trim;
      wbox(b, F, 'trim', sL - cw, sL, y0, y1, pr, .01, { skip: 'nz' }); wbox(b, F, 'trim', sR, sR + cw, y0, y1, pr, .01, { skip: 'nz' });
      wbox(b, F, 'trim', sL - cw - .02, sR + cw + .02, y1, y1 + .13, pr - .006, .01, { skip: 'nz' });
      if (!stucco) wbox(b, F, 'trim', sL - cw - .04, sR + cw + .04, y1 + .13, y1 + .155, pr - .03, .01, { skip: 'nz' });
      wbox(b, F, 'trim', sL - cw - .04, sR + cw + .04, y0 - .045, y0, -.065, .06, { skip: 'nz' });
      if (!stucco) wbox(b, F, 'trim', sL - .03, sR + .03, y0 - .14, y0 - .045, -.02, .01, { skip: 'nz' });
    }
    /* reveal (jambs) */
    const rd = .13, jc = cmul(trim, .9);
    b.col = jc;
    b.poly('trim', [F.P(sL, y0, 0), F.P(sL, y1, 0), F.P(sL, y1, rd), F.P(sL, y0, rd)], null, null, F.U);
    b.poly('trim', [F.P(sR, y0, 0), F.P(sR, y1, 0), F.P(sR, y1, rd), F.P(sR, y0, rd)], null, null, mul(F.U, -1));
    b.poly('trim', [F.P(sL, y1, 0), F.P(sR, y1, 0), F.P(sR, y1, rd), F.P(sL, y1, rd)], null, null, [0, -1, 0]);
    b.poly('trim', [F.P(sL, y0, 0), F.P(sR, y0, 0), F.P(sR, y0, rd), F.P(sL, y0, rd)], null, null, [0, 1, 0]);
    /* room box behind the glass */
    const id = .62, ic = o.lit ? lc('#8a7a66') : lc('#4a4643');
    b.col = ic;
    b.poly('trim', [F.P(sL, y0, rd), F.P(sL, y1, rd), F.P(sL, y1, id), F.P(sL, y0, id)], null, null, F.U);
    b.poly('trim', [F.P(sR, y0, rd), F.P(sR, y1, rd), F.P(sR, y1, id), F.P(sR, y0, id)], null, null, mul(F.U, -1));
    b.col = cmul(ic, .7); b.poly('trim', [F.P(sL, y1, rd), F.P(sR, y1, rd), F.P(sR, y1, id), F.P(sL, y1, id)], null, null, [0, -1, 0]);
    b.col = cmul(ic, .5); b.poly('trim', [F.P(sL, y0, rd), F.P(sR, y0, rd), F.P(sR, y0, id), F.P(sL, y0, id)], null, null, [0, 1, 0]);
    const cu = intUV(o.card | 0, o.flipCard), cc = o.lit ? [1.6, 1.4, 1.1] : WHITE;
    b.col = cc; wquad(b, F, 'interior', sL, sR, y0, y1, id, [[cu[0], cu[1]], [cu[2], cu[1]], [cu[2], cu[3]], [cu[0], cu[3]]]);
    /* glass */
    b.col = WHITE; wquad(b, F, 'glass', sL, sR, y0, y1, .085, null);
    /* frame + sashes + muntins */
    b.col = frameCol; const fw = .055, fd0 = .045, fd1 = .13, kind = o.kind || 'dh';
    const frameRect = (a0, a1, c0, c1, wdt, d0, d1) => {
      wbox(b, F, 'trim', a0, a0 + wdt, c0, c1, d0, d1, { skip: 'nz' }); wbox(b, F, 'trim', a1 - wdt, a1, c0, c1, d0, d1, { skip: 'nz' });
      wbox(b, F, 'trim', a0 + wdt, a1 - wdt, c1 - wdt, c1, d0, d1, { skip: 'nz' }); wbox(b, F, 'trim', a0 + wdt, a1 - wdt, c0, c0 + wdt * 1.2, d0, d1, { skip: 'nz' });
    };
    const muntins = (a0, a1, c0, c1, nx, ny, dep) => {
      const mw = .022; for (let i = 1; i < nx; i++) { const x = lerp(a0, a1, i / nx); wbox(b, F, 'trim', x - mw / 2, x + mw / 2, c0, c1, dep - .012, dep + .012, { skip: 'nz' }); }
      for (let j = 1; j < ny; j++) { const y = lerp(c0, c1, j / ny); wbox(b, F, 'trim', a0, a1, y - mw / 2, y + mw / 2, dep - .012, dep + .012, { skip: 'nz' }); }
    };
    frameRect(sL, sR, y0, y1, fw * .7, fd0 + .02, fd1);
    const g = o.grille || 'none';
    if (kind === 'dh') {
      const ym = y0 + h * .52, sw = .045;
      frameRect(sL + fw * .7, sR - fw * .7, ym - .02, y1 - fw * .7, sw, fd0, fd0 + .04);
      frameRect(sL + fw * .7, sR - fw * .7, y0 + fw * .7, ym + .02, sw, fd0 + .04, fd0 + .08);
      const ia = sL + fw * .7 + sw, ib = sR - fw * .7 - sw;
      if (g === 'colonial') { const nx = w > 1.05 ? 3 : 2; muntins(ia, ib, ym + .02, y1 - fw * .7 - sw, nx, 2, fd0 + .02); muntins(ia, ib, y0 + fw * .7 + sw * 1.2, ym - .02, nx, 2, fd0 + .06); }
      else if (g === 'craftsman') muntins(ia, ib, ym + .02, y1 - fw * .7 - sw, 3, 1, fd0 + .02);
      else if (g === 'prairie') { const e = .12; for (const x of [ia + e, ib - e]) wbox(b, F, 'trim', x - .011, x + .011, ym + .02, y1 - fw, fd0 + .01, fd0 + .035, { skip: 'nz' }); wbox(b, F, 'trim', ia, ib, y1 - fw - e - .011, y1 - fw - e + .011, fd0 + .01, fd0 + .035, { skip: 'nz' }); }
    } else if (kind === 'pic') {
      /* fixed centre + operable flankers */
      const fl = Math.min(.55, w * .24);
      for (const x of [sL + fl, sR - fl]) wbox(b, F, 'trim', x - .05, x + .05, y0, y1, fd0, fd1, { skip: 'nz' });
      for (const [a0, a1] of [[sL + fw * .7, sL + fl - .05], [sR - fl + .05, sR - fw * .7]]) {
        const ym = y0 + h * .52; frameRect(a0, a1, y0 + fw * .7, y1 - fw * .7, .04, fd0 + .02, fd0 + .06); wbox(b, F, 'trim', a0, a1, ym - .03, ym + .03, fd0 + .02, fd0 + .06, { skip: 'nz' });
        if (g === 'colonial') { muntins(a0, a1, ym, y1 - fw, 1, 2, fd0 + .03); muntins(a0, a1, y0 + fw, ym, 1, 2, fd0 + .03); }
      }
      if (g === 'colonial') muntins(sL + fl + .05, sR - fl - .05, y0 + fw, y1 - fw, 4, 3, fd0 + .03);
    } else if (kind === 'slider') {
      const sm = s; wbox(b, F, 'trim', sm - .04, sm + .04, y0, y1, fd0, fd1, { skip: 'nz' });
      frameRect(sL + fw * .7, sm, y0 + fw * .7, y1 - fw * .7, .06, fd0, fd0 + .05); frameRect(sm, sR - fw * .7, y0 + fw * .7, y1 - fw * .7, .06, fd0 + .05, fd0 + .1);
      b.col = lc('#9a9a96'); wbox(b, F, 'metal', sm - .1, sm - .08, y0 + .95, y0 + 1.15, fd0 - .03, fd0, { skip: 'nz' });
    } else if (kind === 'case') {
      wbox(b, F, 'trim', s - .03, s + .03, y0, y1, fd0, fd1, { skip: 'nz' });
    } else if (kind === 'store') {
      /* aluminium storefront: mullions every ~1.5 m, transom bar, kick panel */
      b.col = frameCol; const n = Math.max(1, Math.round(w / 1.6));
      for (let i = 0; i <= n; i++) { const x = lerp(sL + .04, sR - .04, i / n); wbox(b, F, 'metal', x - .04, x + .04, y0, y1, .02, .14, { skip: 'nz' }); }
      wbox(b, F, 'metal', sL, sR, y0, y0 + .32, .03, .14, { skip: 'nz' }); wbox(b, F, 'metal', sL, sR, y1 - .9, y1 - .82, .02, .14, { skip: 'nz' }); wbox(b, F, 'metal', sL, sR, y1 - .06, y1, .02, .14, { skip: 'nz' });
    }
    /* shutters */
    if (o.shutters && !(kind === 'pic' && w > 2) && kind !== 'store') {
      const sw2 = clamp(w * .5, .32, .55), off = brick ? .02 : .12; b.col = o.shutterCol || v.accent;
      for (const [a, flip] of [[sL - off - sw2, false], [sR + off, true]]) wbox(b, F, 'fixt', a, a + sw2, y0 - .02, y1 + .02, -.055, -.015, { atlas: { pz: rgUV(RG.shut) }, flipU: flip, skip: 'nz' });
    }
    if (o.flowerBox) {
      b.col = trim; wbox(b, F, 'trim', sL - .05, sR + .05, y0 - .32, y0 - .1, -.26, -.03, { skip: 'nz' });
      const r = RNG(o.s * 13 + o.y0); const sp = new T.IcosahedronGeometry(.07, 0), m = new T.Matrix4();
      for (let i = 0; i < Math.floor(w / .09); i++) {
        const p = F.P(sL + .02 + i * .09 + r() * .03, y0 - .08 + r() * .06, -.15 + r() * .08);
        m.makeTranslation(p[0], p[1], p[2]);
        b.geo('trim', sp, m, r() < .45 ? lc(r() < .5 ? '#b0213a' : '#d8577a') : lc('#3f6a2c', .9));
      }
    }
    b.col = WHITE;
  }

  /* door: {s,y0,w,h,kind:'door'|'door2'|'garage'|'garage2'|'roll'|'glass', col, transom, wreath} */
  function doorAt(b, v, F, o) {
    const { s, y0, w, h } = o, sL = s - w / 2, sR = s + w / 2, y1 = y0 + h, trim = v.trimCol, kind = o.kind || 'door';
    const garage = kind === 'garage' || kind === 'garage2' || kind === 'roll';
    const cw = garage ? .14 : .11; b.col = o.casingCol || trim;
    if (v.mat !== 'brick' || garage) {
      wbox(b, F, 'trim', sL - cw, sL, y0, y1, -.028, .01, { skip: 'nz' }); wbox(b, F, 'trim', sR, sR + cw, y0, y1, -.028, .01, { skip: 'nz' });
      wbox(b, F, 'trim', sL - cw - .02, sR + cw + .02, y1, y1 + .15, -.034, .01, { skip: 'nz' });
      if (!garage && v.mat === 'siding') wbox(b, F, 'trim', sL - cw - .04, sR + cw + .04, y1 + .15, y1 + .175, -.06, .01, { skip: 'nz' });
    } else {
      wbox(b, F, 'trim', sL - .06, sL, y0, y1, -.015, .01, { skip: 'nz' }); wbox(b, F, 'trim', sR, sR + .06, y0, y1, -.015, .01, { skip: 'nz' }); wbox(b, F, 'trim', sL - .06, sR + .06, y1, y1 + .06, -.015, .01, { skip: 'nz' });
      b.col = lc('#a39b8e'); wbox(b, F, 'concrete', sL - .14, sR + .14, y1 + .06, y1 + .24, -.012, .02, { mpr: 2, skip: 'nz' });
    }
    const rd = garage ? .16 : .14; b.col = cmul(trim, .9);
    b.poly('trim', [F.P(sL, y0, 0), F.P(sL, y1, 0), F.P(sL, y1, rd), F.P(sL, y0, rd)], null, null, F.U);
    b.poly('trim', [F.P(sR, y0, 0), F.P(sR, y1, 0), F.P(sR, y1, rd), F.P(sR, y0, rd)], null, null, mul(F.U, -1));
    b.poly('trim', [F.P(sL, y1, 0), F.P(sR, y1, 0), F.P(sR, y1, rd), F.P(sL, y1, rd)], null, null, [0, -1, 0]);
    let dh = h;
    if (o.transom) {
      dh = h - .42; b.col = trim; wbox(b, F, 'trim', sL, sR, y0 + dh, y0 + dh + .06, .02, rd, { skip: 'nz' });
      b.col = lc('#3a3632'); wquad(b, F, 'interior', sL, sR, y0 + dh + .06, y1, rd + .05, (() => { const c = intUV(3); return [[c[0], .55], [c[2], .55], [c[2], .75], [c[0], .75]]; })());
      b.col = WHITE; wquad(b, F, 'glass', sL, sR, y0 + dh + .06, y1, .07, null);
      b.col = trim; for (let i = 1; i < 4; i++) { const x = lerp(sL, sR, i / 4); wbox(b, F, 'trim', x - .012, x + .012, y0 + dh + .06, y1, .05, .08, { skip: 'nz' }); }
    }
    if (kind === 'glass') {
      /* commercial glass door pair */
      b.col = lc('#3b3d3f');
      const mid = s; for (const [a, c] of [[sL, mid], [mid, sR]]) {
        wbox(b, F, 'metal', a, a + .09, y0, y0 + dh, .03, .12, { skip: 'nz' }); wbox(b, F, 'metal', c - .09, c, y0, y0 + dh, .03, .12, { skip: 'nz' });
        wbox(b, F, 'metal', a, c, y0, y0 + .22, .03, .12, { skip: 'nz' }); wbox(b, F, 'metal', a, c, y0 + dh - .09, y0 + dh, .03, .12, { skip: 'nz' });
        wbox(b, F, 'metal', a + .12, c - .12, y0 + 1.0, y0 + 1.04, -.04, .03, { skip: 'nz', col: lc('#b9bbbd') });
      }
      const c = intUV(o.card != null ? o.card : 4); b.col = WHITE; wquad(b, F, 'interior', sL, sR, y0, y0 + dh, .6, [[c[0], c[1]], [c[2], c[1]], [c[2], c[3]], [c[0], c[3]]]);
      b.col = cmul(trim, .8); for (const [a, nn] of [[sL, F.U], [sR, mul(F.U, -1)]]) b.poly('trim', [F.P(a, y0, rd), F.P(a, y0 + dh, rd), F.P(a, y0 + dh, .6), F.P(a, y0, .6)], null, null, nn);
      b.col = WHITE; wquad(b, F, 'glass', sL, sR, y0, y0 + dh, .075, null);
    } else {
      const reg = kind === 'garage' ? RG.gar1 : kind === 'garage2' ? RG.gar2 : kind === 'roll' ? RG.roll : kind === 'door2' ? RG.door2 : RG.door;
      b.col = o.col || WHITE;
      const dd = garage ? .1 : .085;
      wbox(b, F, 'fixt', sL, sR, y0, y0 + dh, dd, dd + .045, { atlas: { pz: rgUV(reg) }, skip: 'nz' });
      if (!garage) {
        b.col = lc('#b8a26a'); const hs = o.hinge === 'l' ? sR - .085 : sL + .085;
        wbox(b, F, 'metal', hs - .025, hs + .025, y0 + .92, y0 + 1.08, dd - .05, dd, { skip: 'nz' });
        wbox(b, F, 'metal', hs - .018, hs + .018, y0 + 1.16, y0 + 1.2, dd - .03, dd, { skip: 'nz' });
        b.col = lc('#9c9890'); wbox(b, F, 'metal', sL, sR, y0, y0 + .025, -.03, rd, { skip: 'nz' });
      } else if (kind === 'roll') {
        b.col = lc('#5d6063'); wbox(b, F, 'metal', sL - .1, sR + .1, y1, y1 + .4, -.35, .02, { skip: 'nz' });
        for (const a of [sL - .1, sR]) wbox(b, F, 'metal', a, a + .1, y0, y1, -.08, .02, { skip: 'nz' });
      }
    }
    if (o.wreath) {
      const m = new T.Matrix4(), p = F.P(s, y0 + 1.55, -.0), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(F.N[0], 0, F.N[2]));
      m.compose(new T.Vector3(p[0] + F.N[0] * .03, p[1], p[2] + F.N[2] * .03), q, new T.Vector3(1, 1, 1));
      b.geo('trim', new T.TorusGeometry(.2, .065, 7, 20), m, lc('#2f4f2a'));
      const r = RNG('wreath'), sp = new T.IcosahedronGeometry(.025, 0);
      for (let i = 0; i < 9; i++) { const a = r() * 6.28, mm = new T.Matrix4().makeTranslation(.2 * Math.cos(a), .2 * Math.sin(a), .06); b.geo('trim', sp, m.clone().multiply(mm), lc('#a4161a')); }
      const bow = new T.Matrix4().makeTranslation(0, -.21, .07).multiply(new T.Matrix4().makeScale(1.6, .8, .6)); b.geo('trim', new T.IcosahedronGeometry(.06, 0), m.clone().multiply(bow), lc('#a4161a'));
    }
    b.col = WHITE;
  }

  /* wall lantern (porch light); pushes a light descriptor */
  function lantern(b, F, s, y, lights, kind) {
    const blk = lc('#1c1c1c');
    b.col = blk; wbox(b, F, 'metal', s - .06, s + .06, y - .12, y + .12, -.02, 0, { skip: 'nz' });
    wbox(b, F, 'metal', s - .025, s + .025, y + .04, y + .08, -.1, -.02, { skip: 'nz' });
    wbox(b, F, 'metal', s - .1, s + .1, y + .14, y + .19, -.24, -.04, { skip: 'nz' });
    b.col = WHITE; wbox(b, F, 'glow', s - .075, s + .075, y - .1, y + .14, -.215, -.065, { skip: 'nz' });
    b.col = blk; for (const [a, c] of [[-.085, -.07], [.07, .085]]) for (const [d0, d1] of [[-.23, -.215], [-.065, -.05]]) wbox(b, F, 'metal', s + a, s + c, y - .11, y + .15, d0, d1, {});
    wbox(b, F, 'metal', s - .09, s + .09, y - .14, y - .1, -.235, -.05, {});
    const p = F.P(s, y + .02, -.4); lights.push({ x: p[0], y: p[1], z: p[2], color: 0xffcf96, intensity: 1, distance: 7, kind: kind || 'porch' });
    b.col = WHITE;
  }

  /* house number plaque */
  function numberPlaque(b, F, s, y, num, col) {
    const ds = String(num), dw = .075, w = ds.length * dw + .08;
    b.col = col || lc('#f2f0ea'); wbox(b, F, 'trim', s - w / 2, s + w / 2, y - .08, y + .08, -.02, 0, { skip: 'nz' });
    b.col = WHITE;
    for (let i = 0; i < ds.length; i++) { const a = s - ds.length * dw / 2 + i * dw, u = digitUV(+ds[i]); wquad(b, F, 'fixt', a, a + dw, y - .055, y + .055, -.021, [[u[0], u[1]], [u[2], u[1]], [u[2], u[3]], [u[0], u[3]]]); }
  }

  /* steps from a landing at height top down to grade, running out along the wall normal */
  function steps(b, F, s, w, top, dep0, opts = {}) {
    const n = Math.max(1, Math.round(top / .18)), rise = top / n, run = .29;
    b.col = opts.col || lc('#c9c4ba');
    for (let i = 0; i < n; i++) {
      const yTop = top - rise * (i + 1) + rise; const d0 = dep0 - i * run;
      wbox(b, F, opts.mat || 'concrete', s - w / 2, s + w / 2, -.1, yTop - rise + rise, d0 - run, d0, { mpr: 2 });
    }
    b.col = WHITE;
    return dep0 - n * run;
  }
  function railingRun(b, p0, p1, h, col, opts = {}) {
    const d = sub(p1, p0), L = len(d), dir = mul(d, 1 / L), side = cross(UP, dir);
    b.col = col;
    b.beam('trim', add(p0, [0, h, 0]), add(p1, [0, h, 0]), side, .085, .05);
    b.beam('trim', add(p0, [0, .1, 0]), add(p1, [0, .1, 0]), side, .06, .05);
    const n = Math.floor(L / (opts.sp || .13));
    for (let i = 1; i < n; i++) { const p = add(p0, mul(dir, i * L / n)); b.box('trim', p[0] - .019, p[1] + .125, p[2] - .019, p[0] + .019, p[1] + h - .025, p[2] + .019, { skip: 'py ny' }); }
    b.col = WHITE;
  }
  function post(b, x, z, y0, y1, col, style) {
    b.col = col;
    if (style === 'craft') {
      /* brick pier + tapered column */
      b.col = WHITE; b.box('brick', x - .27, y0, z - .27, x + .27, y0 + .95, z + .27, { mpr: MPR.brick });
      b.col = lc('#bdb6a8'); b.box('concrete', x - .3, y0 + .95, z - .3, x + .3, y0 + 1.02, z + .3, { mpr: 2 });
      b.col = col; const g = new T.CylinderGeometry(.13 * Math.SQRT2, .2 * Math.SQRT2, y1 - y0 - 1.12, 4, 1, true); g.rotateY(Math.PI / 4);
      b.geo('trim', g, new T.Matrix4().makeTranslation(x, y0 + 1.02 + (y1 - y0 - 1.12) / 2, z), col);
      b.box('trim', x - .2, y1 - .1, z - .2, x + .2, y1, z + .2);
    } else if (style === 'round') {
      b.box('trim', x - .17, y0, z - .17, x + .17, y0 + .1, z + .17);
      const g = new T.CylinderGeometry(.1, .115, y1 - y0 - .26, 14, 1, true); b.geo('trim', g, new T.Matrix4().makeTranslation(x, y0 + .1 + (y1 - y0 - .26) / 2, z), col);
      b.box('trim', x - .16, y1 - .16, z - .16, x + .16, y1, z + .16);
    } else {
      b.box('trim', x - .075, y0, z - .075, x + .075, y1, z + .075);
      b.box('trim', x - .1, y0, z - .1, x + .1, y0 + .14, z + .1);
      b.box('trim', x - .1, y1 - .12, z - .1, x + .1, y1 - .04, z + .1);
    }
    b.col = WHITE;
  }

  /* ------------------------------------------------------------------ volumes */
  function vol(o) {
    return Object.assign({ open: { f: [], b: [], l: [], r: [] }, doors: { f: [], b: [], l: [], r: [] }, cover: { f: [], b: [], l: [], r: [] }, ends: ['gable', 'gable'], ridge: 'x', oE: .45, oR: .32, pitch: .5, base: .45, roof: 'gable', roofCol: lc('#5a5b5e'), trimCol: lc('#F2F0EA'), paint: WHITE, accent: lc('#1E1F21'), mat: 'siding' }, o);
  }
  const SIDES = ['f', 'r', 'b', 'l'];
  /* walls, foundation, corner boards and ground AO for one volume */
  function volWalls(b, v) {
    const mpr = MPR[v.mat] || 1.6;
    /* foundation */
    b.col = lc('#a9a59d');
    if (v.base > .12) b.box('stucco', v.x0 + .015, -.15, v.z0 + .015, v.x1 - .015, v.base - .02, v.z1 - .015, { mpr: 2, skip: 'ny py' });
    const R = roofFrame(v);
    for (const side of SIDES) {
      const F = frame(v, side), holes = [...v.open[side], ...v.doors[side]];
      const isEave = v.roof === 'flat' ? false : (v.ridge === 'x' ? (side === 'f' || side === 'b') : (side === 'l' || side === 'r')) || (v.roof === 'gable' && ((side === R.endSide[0] && v.ends[0] === 'hip') || (side === R.endSide[1] && v.ends[1] === 'hip')));
      const wallTop = v.wallTop || v.plate;
      if (v.cover[side].some(c => c.s0 <= 0 && c.s1 >= F.L && c.y1 > 50)) continue;
      const y0 = v.base - (v.mat === 'brick' ? .02 : .06);
      if (v.band && v.mat2) {
        wallSurf(b, v, F, v.mat2, y0, v.band, holes, v.cover[side], v.paint2 || WHITE, 0);
        wallSurf(b, v, F, v.mat, v.band, wallTop, holes, v.cover[side], v.paint, isEave ? wallTop : 0);
        b.col = lc('#bdb6a8'); for (const [s0, s1] of uncovered(F.L, v.cover[side], v.band)) wbox(b, F, 'concrete', s0, s1, v.band - .04, v.band + .02, -.05, .01, { mpr: 2, skip: 'nz' });
      } else wallSurf(b, v, F, v.mat, y0, wallTop, holes, v.cover[side], v.paint, isEave ? wallTop : 0);
      if (v.floorBand && v.mat !== 'brick') { b.col = v.trimCol; for (const [s0, s1] of uncovered(F.L, v.cover[side], v.floorBand)) wbox(b, F, 'trim', s0, s1, v.floorBand - .1, v.floorBand + .1, -.03, .01, { skip: 'nz' }); }
      /* frieze board under the soffit */
      if (isEave && v.mat !== 'brick' && v.roof !== 'flat') { b.col = v.trimCol; for (const [s0, s1] of uncovered(F.L, v.cover[side], wallTop - .1)) wbox(b, F, 'trim', s0, s1, wallTop - .32, wallTop, -.024, .01, { skip: 'nz' }); }
      /* ground AO skirt */
      for (const [s0, s1] of uncovered(F.L, v.cover[side], .2)) b.poly('skirt', [F.P(s0, .02, 0), F.P(s1, .02, 0), F.P(s1, .02, -.9), F.P(s0, .02, -.9)], [[0, 1], [1, 1], [1, 0], [0, 0]], null, UP);
    }
    /* corner boards */
    if (v.mat !== 'brick' && !v.noCorners) {
      b.col = v.trimCol; const cw = v.mat === 'stucco' ? .0 : .1;
      if (cw) for (const [x, z, sx, sz, sa, sb] of [[v.x0, v.z1, -1, 1, 'l', 'f'], [v.x1, v.z1, 1, 1, 'r', 'f'], [v.x1, v.z0, 1, -1, 'r', 'b'], [v.x0, v.z0, -1, -1, 'l', 'b']]) {
        const Fa = frame(v, sa), Fb = frame(v, sb), sA = Fa.toS(z), sB = Fb.toS(x);
        if (covered(v.cover[sa], sA, v.base + .2) || covered(v.cover[sb], sB, v.base + .2)) continue;
        const top = v.plate, y0 = v.base - .06;
        b.box('trim', Math.min(x, x - sx * cw), y0, Math.min(z + sz * .028, z), Math.max(x, x - sx * cw), top, Math.max(z + sz * .028, z), { skip: 'ny' });
        b.box('trim', Math.min(x + sx * .028, x), y0, Math.min(z, z - sz * cw), Math.max(x + sx * .028, x), top, Math.max(z, z - sz * cw), { skip: 'ny' });
      }
    }
    /* openings */
    for (const side of SIDES) { const F = frame(v, side); for (const o of v.open[side]) windowAt(b, v, F, o); for (const o of v.doors[side]) doorAt(b, v, F, o); }
    b.col = WHITE;
  }
  function uncovered(L, cover, y) {
    let segs = [[0, L]];
    for (const c of cover) if (y < c.y1) segs = segs.flatMap(([a, z]) => { const r = []; if (c.s0 > a) r.push([a, Math.min(z, c.s0)]); if (c.s1 < z) r.push([Math.max(a, c.s1), z]); return r.filter(q => q[1] - q[0] > .01); });
    return segs;
  }

  /* distribute windows along a wall span, avoiding reserved intervals */
  function fillWindows(list, a, bnd, reserve, mk, spacing) {
    const span = bnd - a; if (span < 1.2) return;
    const n = Math.max(1, Math.round(span / spacing));
    for (let i = 0; i < n; i++) {
      const s = a + span * (i + .5) / n, w0 = mk(s);
      if (!w0) continue;
      if (reserve.some(([r0, r1]) => s + w0.w / 2 + .45 > r0 && s - w0.w / 2 - .45 < r1)) continue;
      if (s - w0.w / 2 < a + .2 || s + w0.w / 2 > bnd - .2) continue;
      list.push(w0); reserve.push([s - w0.w / 2, s + w0.w / 2]);
    }
  }

  /* ------------------------------------------------------------------ extras */
  function chimneyExt(b, v, side, s, topY, colliders) {
    /* exterior brick chimney on a gable-end wall */
    const F = frame(v, side); b.col = WHITE;
    const wB = 1.5, wT = .95, dep = .62, sh = v.plate - .3;
    wbox(b, F, 'brick', s - wB / 2, s + wB / 2, -.1, sh, -dep, .05, { mpr: MPR.brick });
    /* sloped shoulder approximated by a stepped course */
    wbox(b, F, 'brick', s - (wB + wT) / 4, s + (wB + wT) / 4, sh, sh + .35, -dep, .05, { mpr: MPR.brick });
    wbox(b, F, 'brick', s - wT / 2, s + wT / 2, sh + .35, topY, -dep, .05, { mpr: MPR.brick });
    b.col = lc('#9d978d'); wbox(b, F, 'concrete', s - wT / 2 - .06, s + wT / 2 + .06, topY, topY + .1, -dep - .06, .11, { mpr: 2 });
    b.col = lc('#5c4a40'); wbox(b, F, 'concrete', s - .14, s + .14, topY + .1, topY + .32, -dep / 2 - .14, -dep / 2 + .14, { mpr: 2 });
    const p0 = F.P(s - wB / 2, 0, -dep), p1 = F.P(s + wB / 2, 0, .05);
    colliders.push({ x0: Math.min(p0[0], p1[0]), z0: Math.min(p0[2], p1[2]), x1: Math.max(p0[0], p1[0]), z1: Math.max(p0[2], p1[2]) });
    b.col = WHITE;
  }
  function chimneyRoof(b, x, z, y0, y1) {
    b.col = WHITE; b.box('brick', x - .4, y0, z - .32, x + .4, y1, z + .32, { mpr: MPR.brick });
    b.col = lc('#9d978d'); b.box('concrete', x - .46, y1, z - .38, x + .46, y1 + .09, z + .38, { mpr: 2 });
    b.col = lc('#5c4a40'); b.box('concrete', x - .13, y1 + .09, z - .13, x + .13, y1 + .3, z + .13, { mpr: 2 }); b.col = WHITE;
  }
  function acUnit(b, F, s, colliders) {
    const w = .78, d0 = -1.0, d1 = -.22;
    b.col = lc('#c6c6c0'); wbox(b, F, 'concrete', s - .5, s + .5, -.05, .08, d0 - .1, d1 + .08, { mpr: 2 });
    const c = F.P(s, .5, (d0 + d1) / 2);
    b.obox('fixt', c, F.U, UP, F.N, w / 2, .41, (d1 - d0) / 2, { atlas: { pz: rgUV(RG.grille), px: rgUV(RG.grille), nx: rgUV(RG.grille), nz: rgUV(RG.grille), py: rgUV(RG.panel) }, col: lc('#cfcfc8'), skip: 'ny' });
    b.col = lc('#8a8a86'); for (const sx of [-1, 1]) for (const dz of [d0, d1]) wbox(b, F, 'metal', s + sx * w / 2 - .03, s + sx * w / 2 + .03, .08, .92, dz - .03, dz + .03, {});
    b.col = lc('#1f1f1f'); const g = new T.CylinderGeometry(.3, .3, .02, 18); const p = F.P(s, .925, (d0 + d1) / 2); b.geo('metal', g, new T.Matrix4().makeTranslation(p[0], p[1], p[2]), lc('#262626'));
    b.col = lc('#3a3a3a'); b.beam('metal', F.P(s + .3, .6, d1), F.P(s + .3, .6, 0), F.U, .05, .05); b.beam('metal', F.P(s + .3, .6, -.02), F.P(s + .3, 1.2, -.02), F.U, .05, .05);
    const p0 = F.P(s - .5, 0, d0 - .1), p1 = F.P(s + .5, 0, 0);
    colliders.push({ x0: Math.min(p0[0], p1[0]), z0: Math.min(p0[2], p1[2]), x1: Math.max(p0[0], p1[0]), z1: Math.max(p0[2], p1[2]) });
    b.col = WHITE;
  }
  function meter(b, F, s) {
    b.col = lc('#9ea19f'); wbox(b, F, 'metal', s - .15, s + .15, 1.25, 1.65, -.14, 0, { skip: 'nz' });
    b.col = lc('#bfc7c9'); const g = new T.CylinderGeometry(.075, .075, .08, 14); const p = F.P(s, 1.5, -.18); const m = new T.Matrix4().makeTranslation(p[0], p[1], p[2]).multiply(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(F.N[0], 0, F.N[2])))); b.geo('glass', g, m);
    b.col = lc('#6f716f'); wbox(b, F, 'metal', s - .03, s + .03, .2, 1.25, -.07, -.01, {}); b.col = WHITE;
  }
  function hoseAndVent(b, F, s) {
    b.col = lc('#e9e7e1'); wbox(b, F, 'trim', s - .07, s + .07, .55, .69, -.06, 0, { skip: 'nz' });
    b.col = lc('#7a6a3a'); wbox(b, F, 'metal', s + .9, s + .96, .62, .7, -.08, 0, { skip: 'nz' }); b.col = WHITE;
  }
  function hoop(b, F, s, y) {
    b.col = WHITE; wbox(b, F, 'fixt', s - .56, s + .56, y, y + .72, -.42, -.38, { atlas: { pz: rgUV(RG.board) } });
    b.col = lc('#4a4a4a'); wbox(b, F, 'metal', s - .25, s - .2, y + .1, y + .5, -.38, 0, {}); wbox(b, F, 'metal', s + .2, s + .25, y + .1, y + .5, -.38, 0, {});
    const p = F.P(s, y + .2, -.66), m = new T.Matrix4().makeTranslation(p[0], p[1], p[2]).multiply(new T.Matrix4().makeRotationX(Math.PI / 2));
    b.geo('metal', new T.TorusGeometry(.23, .012, 6, 24), m, lc('#d0451b'));
    const net = new T.CylinderGeometry(.23, .15, .4, 12, 1, true); b.geo('trim', net, new T.Matrix4().makeTranslation(p[0], p[1] - .2, p[2]), lc('#e4e4e0', .9));
    b.col = WHITE;
  }
  function flag(b, F, s, y) {
    const p0 = F.P(s, y, -.04), dir = nrm(add(mul(F.N, 1), [0, .9, 0])), p1 = add(p0, mul(dir, 1.5));
    b.col = lc('#d8d6d0'); b.beam('metal', p0, p1, F.U, .025, .025); b.col = lc('#2a2a2a'); wbox(b, F, 'metal', s - .05, s + .05, y - .08, y + .08, -.05, 0, {});
    const fa = add(p0, mul(dir, .3)), fb = add(p0, mul(dir, 1.45)), hang = .85, n = 5, r = rgUV(RG.flag);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, w0 = Math.sin(t0 * 7) * .06 * t0, w1 = Math.sin(t1 * 7) * .06 * t1;
      const q0 = add(add(fa, mul(sub(fb, fa), t0)), mul(F.U, w0)), q1 = add(add(fa, mul(sub(fb, fa), t1)), mul(F.U, w1));
      const P = [q0, q1, add(q1, [0, -hang, 0]), add(q0, [0, -hang, 0])], u0 = lerp(r[0], r[2], t0), u1 = lerp(r[0], r[2], t1);
      const uv = [[u0, r[3]], [u1, r[3]], [u1, r[1]], [u0, r[1]]];
      b.col = WHITE; b.poly('fixt', P, uv, null, F.U); b.poly('fixt', P, uv, null, mul(F.U, -1));
    }
    b.col = WHITE;
  }

  /* ------------------------------------------------------------------ house */
  const FACE_ROT = { '+z': 0, '+x': Math.PI / 2, '-z': Math.PI, '-x': -Math.PI / 2 };
  const STYLES = ['ranch', 'colonial', 'craftsman', 'split'];
  function finish(b, rot, colliders, door, lights, extra) {
    const g = b.build(rot), cs = Math.cos(rot), sn = Math.sin(rot);
    const R2 = (x, z) => [x * cs + z * sn, -x * sn + z * cs];
    const cols = colliders.map(c => { const a = R2(c.x0, c.z0), d = R2(c.x1, c.z1); return { x0: Math.min(a[0], d[0]), z0: Math.min(a[1], d[1]), x1: Math.max(a[0], d[0]), z1: Math.max(a[1], d[1]) }; });
    const dp = R2(door.x, door.z), dn = R2(door.nx, door.nz);
    const ls = lights.map(l => { const p = R2(l.x, l.z); return Object.assign({}, l, { x: p[0], z: p[1] }); });
    g.userData = Object.assign({ colliders: cols, door: { x: dp[0], z: dp[1], nx: Math.round(dn[0] * 1e6) / 1e6, nz: Math.round(dn[1] * 1e6) / 1e6 }, lights: ls, tris: g.userData.tris, drawCalls: g.userData.drawCalls }, extra || {});
    if (door.step) { const s = R2(door.step[0], door.step[1]); g.userData.doorStep = { x: s[0], z: s[1] }; }
    if (extra && extra.driveway) { const s = R2(extra.driveway.x, extra.driveway.z); g.userData.driveway = Object.assign({}, extra.driveway, { x: s[0], z: s[1] }); }
    return g;
  }

  function house(opts = {}) {
    if (!MAT) init({});
    const w = Math.max(6, opts.w || 11), d = Math.max(6, opts.d || 8), facing = FACE_ROT[opts.facing] != null ? opts.facing : '+z';
    const rot = FACE_ROT[facing], swap = facing === '+x' || facing === '-x';
    const W = swap ? d : w, D = swap ? w : d;
    const r = RNG('house:' + (opts.seed != null ? opts.seed : 1) + ':' + W.toFixed(2) + 'x' + D.toFixed(2));
    let style = opts.style && STYLES.includes(opts.style) ? opts.style : r.pick(STYLES);
    const home = !!opts.home;
    const b = new Builder(), colliders = [], lights = [];
    const x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2;
    /* palette */
    const paint = lc(home ? r.pick(PAINT_HOME) : r.pick(PAINT));
    const trimCol = lc(r.pick(TRIM)), accent = lc(r.pick(ACCENT)), doorCol = lc(home ? '#7A2626' : r.pick(DOORC)), roofCol = lc(r.pick(ROOFC));
    const dark = (paint[0] + paint[1] + paint[2]) / 3 < .12;
    const wallMat = style === 'colonial' ? r.pick(['siding', 'siding', 'brick']) : style === 'ranch' ? r.pick(['brick', 'siding', 'siding', 'stucco']) : style === 'split' ? r.pick(['siding', 'brick']) : 'siding';
    const common = { trimCol, accent, roofCol, paint: wallMat === 'brick' ? WHITE : paint, mat: wallMat, windowCol: dark && r.chance(.5) ? lc('#2a2a2a') : trimCol, gutterCol: r.chance(.7) ? trimCol : lc('#4a3f35') };
    const shutters = style === 'colonial' || (style === 'ranch' && r.chance(.6)) || (style === 'split' && r.chance(.4));
    const grille = style === 'colonial' ? 'colonial' : style === 'craftsman' ? 'craftsman' : r.pick(['none', 'colonial', 'prairie', 'none']);
    const vols = [];
    let door = null, frontDoorF = null, frontVol = null;
    const num = opts.number != null ? opts.number : 100 + (hashSeed('n' + opts.seed) % 880);
    let card = r.i(0, 3);
    const nextCard = () => { card = (card + 1 + r.i(0, 2)) % 4; return card; };
    const dh = (s, y0, wd = .86, ht = 1.42, extra = {}) => Object.assign({ s, y0, w: wd, h: ht, kind: 'dh', grille, shutters, card: nextCard(), flipCard: r.chance(.5), lit: r.chance(.25) }, extra);

    /* garage on a side? */
    let gW = 0, gSide = r.chance(.5) ? 'l' : 'r';
    const wantGarage = style !== 'craftsman' && (home || r.chance(.7)) && style !== 'split';
    if (wantGarage && W >= 10.5) gW = W >= 14 ? 6.6 : W - 7 >= 3.6 ? (W >= 13 && r.chance(.5) ? Math.min(6.6, W - 7.2) : 3.8) : 0;
    if (gW && W - gW < 6.4) gW = 0;
    const gD = Math.min(D, gW > 5 ? 7 : 6.6);
    const mx0 = gW && gSide === 'l' ? x0 + gW : x0, mx1 = gW && gSide === 'r' ? x1 - gW : x1;

    if (style === 'ranch' || style === 'colonial' || style === 'craftsman') {
      const two = style === 'colonial';
      const base = style === 'ranch' ? .45 : style === 'colonial' ? .6 : .75;
      const porchD = style === 'craftsman' && D >= 7.6 ? clamp(D * .26, 1.9, 2.5) : 0;
      const mz1 = z1 - porchD;
      const plate = base + (two ? 2.95 + 2.75 : 2.75);
      const pitch = style === 'ranch' ? r.r(.4, .5) : style === 'colonial' ? r.r(.5, .62) : r.r(.42, .52);
      const hip = style === 'ranch' && r.chance(.45);
      const ridge = style === 'craftsman' ? 'z' : 'x';
      const main = vol(Object.assign({}, common, { x0: mx0, x1: mx1, z0, z1: mz1, base, plate, pitch, ridge, oE: style === 'craftsman' ? .62 : style === 'colonial' ? .32 : .55, oR: style === 'craftsman' ? .55 : .28, floorBand: two && wallMat === 'siding' && r.chance(.3) ? base + 2.95 : 0, rafters: style === 'craftsman', gableVent: true, noBrace: porchD ? [0, 1] : null }));
      main.ends = ridge === 'x' ? [hip && !(gW && gSide === 'l') ? 'hip' : 'gable', hip && !(gW && gSide === 'r') ? 'hip' : 'gable'] : ['gable', 'gable'];
      if (style === 'craftsman') { main.gableMat = 'siding'; main.gablePaint = lc(r.pick(['#8C9A8E', '#C7B79A', '#6F7D6A', '#B8A58A', '#5F6E78'])); }
      if (wallMat === 'brick') { main.gableMat = 'siding'; main.gablePaint = lc(r.pick(['#EDEAE0', '#D1CBC1', '#C2C0BB', '#E3E0D7'])); }
      vols.push(main); frontVol = main;
      const mW = mx1 - mx0, F = frame(main, 'f');
      /* front door position */
      let doorS;
      if (style === 'colonial') doorS = mW / 2;
      else if (style === 'craftsman') doorS = mW * r.pick([.5, .35, .65]);
      else doorS = gW ? (gSide === 'l' ? mW * .28 : mW * .72) : mW * r.pick([.35, .62]);
      const dKind = style === 'craftsman' ? 'door2' : 'door';
      const transom = style === 'colonial' && r.chance(.6);
      main.doors.f.push({ s: doorS, y0: base, w: .92, h: transom ? 2.45 : 2.05, kind: dKind, col: doorCol, transom, wreath: home, hinge: r.chance(.5) ? 'l' : 'r' });
      frontDoorF = F;
      const reserve = [[doorS - .75, doorS + .75]];
      if (style === 'colonial') {
        /* symmetric bays */
        const bays = mW >= 9.5 ? 5 : mW >= 7.4 ? 3 : 2, sp = mW / bays;
        for (let i = 0; i < bays; i++) {
          const s = sp * (i + .5);
          main.open.f.push(dh(s, base + 2.95 + .78, .86, 1.42));
          if (Math.abs(s - doorS) > 1) main.open.f.push(dh(s, base + .78, .9, 1.5));
        }
      } else if (style === 'ranch') {
        const ps = gW ? (gSide === 'l' ? mW * .62 : mW * .38) : (doorS < mW / 2 ? mW * .7 : mW * .3);
        const picW = Math.min(2.4, mW * .26);
        if (Math.abs(ps - doorS) > picW / 2 + 1) { main.open.f.push(dh(ps, base + .72, picW, 1.45, { kind: 'pic', shutters: false })); reserve.push([ps - picW / 2, ps + picW / 2]); }
        fillWindows(main.open.f, 0, mW, reserve, s => dh(s, base + .85), 2.4);
      } else {
        fillWindows(main.open.f, 0, mW, reserve, s => dh(s, base + .8, .9, 1.45, { kind: r.chance(.4) ? 'case' : 'dh' }), 1.7);
      }
      /* sides */
      for (const side of ['l', 'r']) {
        if (gW && side === gSide && gD >= D - porchD - .2) {
          if (two) fillWindows(main.open[side], 0, D - porchD, [], s => dh(s, base + 2.95 + .78), 3.2);
          continue;
        }
        const Fs = frame(main, side), sideL = mz1 - z0;
        const lim = gW && side === gSide ? [[sideL - gD - .4 + (side === 'l' ? 0 : 0), sideL]] : [];
        const res = side === 'l' ? lim : lim.map(([a, c]) => [a, c]);
        fillWindows(main.open[side], 0, sideL, side === 'r' ? res.map(([a, c]) => [Fs.L - c, Fs.L - a]) : res, s => r.chance(.2) ? dh(s, base + 1.45, .6, .7, { kind: 'case', shutters: false }) : dh(s, base + .85), 3.2);
        if (two) fillWindows(main.open[side], 0, sideL, [], s => dh(s, base + 2.95 + .78), 3.4);
      }
      /* back */
      { const bres = []; const sl = mW * r.r(.3, .7); if (mW > 7) { main.doors.b.push({ s: sl, y0: base, w: 1.8, h: 2.05, kind: 'glassSlider' }); bres.push([sl - 1, sl + 1]); }
        main.doors.b = main.doors.b.filter(o => o.kind !== 'glassSlider');
        if (mW > 7) { main.open.b.push({ s: sl, y0: base, w: 1.8, h: 2.05, kind: 'slider', grille: 'none', card: nextCard(), lit: false }); }
        fillWindows(main.open.b, 0, mW, bres, s => dh(s, base + .85), 2.8);
        if (two) fillWindows(main.open.b, 0, mW, [], s => dh(s, base + 2.95 + .78), 2.8); }
      /* stoop / porch / portico */
      const doorWorldX = mx0 + doorS;
      if (style === 'craftsman' && porchD) {
        const px0 = mx0 + .25, px1 = mx1 - .25, pz0 = mz1, pz1 = z1, py = base - .05;
        b.col = lc('#b9b3a8'); b.box('concrete', px0, -.15, pz0, px1, py, pz1, { mpr: 2 });
        b.col = lc('#8f8a82'); b.box('concrete', px0 - .03, py - .04, pz0, px1 + .03, py, pz1 + .03, { mpr: 2 });
        const postStyle = 'craft', topY = base + 2.55;
        const xs = [px0 + .25, px1 - .25]; if (px1 - px0 > 7) xs.splice(1, 0, (px0 + px1) / 2);
        for (const x of xs) post(b, x, pz1 - .3, py, topY, trimCol, postStyle);
        b.col = trimCol; b.box('trim', px0, topY, pz1 - .45, px1, topY + .28, pz1 - .15);
        shedRoof(b, px0 - .25, px1 + .25, pz0, pz1 + .35, base + 2.95 + .05, topY + .28 + .02, roofCol, trimCol, common.gutterCol, [1, 1]);
        /* railing between posts except the stair opening */
        const sx = doorWorldX; const stW = 1.6;
        for (let i = 0; i < xs.length - 1; i++) {
          const a = xs[i] + .28, c = xs[i + 1] - .28;
          if (sx > a && sx < c) { if (sx - stW / 2 - a > .3) railingRun(b, [a, py, pz1 - .3], [sx - stW / 2, py, pz1 - .3], .86, trimCol); if (c - sx - stW / 2 > .3) railingRun(b, [sx + stW / 2, py, pz1 - .3], [c, py, pz1 - .3], .86, trimCol); }
          else railingRun(b, [a, py, pz1 - .3], [c, py, pz1 - .3], .86, trimCol);
        }
        for (const x of [xs[0], xs[xs.length - 1]]) railingRun(b, [x, py, pz1 - .55], [x, py, pz0 + .15], .86, trimCol);
        const FS = frame({ x0: px0, x1: px1, z0: pz0, z1: pz1 }, 'f');
        const end = steps(b, FS, sx - px0, stW, py, 0, {});
        door = { x: doorWorldX, z: mz1, nx: 0, nz: 1, step: [sx, pz1 - end + .3] };
        lantern(b, F, doorS + .75, base + 1.95, lights);
        /* ceiling light */
        b.col = WHITE; b.box('glow', sx - .1, topY + .1, (pz0 + pz1) / 2 - .1, sx + .1, topY + .16, (pz0 + pz1) / 2 + .1);
        lights.push({ x: sx, y: topY, z: (pz0 + pz1) / 2, color: 0xffd7a0, intensity: 1, distance: 8, kind: 'porch' });
      } else {
        const stoopD = style === 'colonial' ? 1.5 : 1.25, stW = style === 'colonial' ? 2.4 : 1.8;
        b.col = lc('#c4bfb5'); wbox(b, F, 'concrete', doorS - stW / 2, doorS + stW / 2, -.15, base - .03, -stoopD, 0, { mpr: 2 });
        const FS = F; const end = steps(b, FS, doorS, stW - .3, base - .03 - .0, -stoopD, {});
        door = { x: doorWorldX, z: mz1, nx: 0, nz: 1, step: [doorWorldX, mz1 - end + .3] };
        if (style === 'colonial' && r.chance(.75)) {
          /* portico: two round columns + front-facing gable */
          const pw = 2.4, ph = base + 2.75, zf = mz1 + 1.35;
          for (const sx of [-1, 1]) post(b, doorWorldX + sx * (pw / 2 - .2), zf - .2, base - .03, ph - .25, trimCol, 'round');
          b.col = trimCol; b.box('trim', doorWorldX - pw / 2, ph - .25, mz1, doorWorldX + pw / 2, ph, zf);
          const pv = vol(Object.assign({}, common, { x0: doorWorldX - pw / 2, x1: doorWorldX + pw / 2, z0: mz1, z1: zf, base, plate: ph - .05, pitch: .55, ridge: 'z', oE: .15, oR: .15, ends: ['none', 'gable'], gableMat: 'trim', gablePaint: trimCol, noDownspout: true, noGutter: true }));
          gableRoof(b, pv);
          b.col = WHITE; b.box('glow', doorWorldX - .1, ph - .32, mz1 + .55, doorWorldX + .1, ph - .25, mz1 + .75);
          lights.push({ x: doorWorldX, y: ph - .35, z: mz1 + .65, color: 0xffd7a0, intensity: 1, distance: 7, kind: 'porch' });
        } else {
          lantern(b, F, doorS + (doorS > mW / 2 ? -.8 : .8), base + 1.95, lights);
          if (style === 'colonial' || r.chance(.5)) { b.col = WHITE; }
        }
        if (style !== 'colonial') {
          /* low iron railing on the stoop */
          const rc = lc('#1f1f1f'); for (const sx of [-1, 1]) { const x = doorWorldX + sx * (stW / 2 - .05); railingRun(b, [x, base - .03, mz1 + .1], [x, base - .03, mz1 + stoopD - .05], .9, rc, { sp: .15 }); }
        }
      }
      numberPlaque(b, F, doorS + (doorS > mW / 2 ? -.72 : .72), base + 1.5, num);
      /* chimney */
      if (main.ends[0] === 'gable' && ridge === 'x' && !(gW && gSide === 'l') && r.chance(.6)) {
        const yR = plate + .1 + (D - porchD) / 2 * pitch; chimneyExt(b, main, 'l', (mz1 - z0) * r.r(.35, .65), yR + .7, colliders);
      } else if (main.ends[1] === 'gable' && ridge === 'x' && !(gW && gSide === 'r') && r.chance(.6)) {
        const yR = plate + .1 + (D - porchD) / 2 * pitch; chimneyExt(b, main, 'r', (mz1 - z0) * r.r(.35, .65), yR + .7, colliders);
      } else if (r.chance(.6)) {
        const cx = lerp(mx0, mx1, r.r(.25, .75)), cz = z0 + (mz1 - z0) * .32; const hd = (mz1 - z0) / 2;
        const yAt = ridge === 'x' ? plate + .1 + (hd - Math.abs(cz - (z0 + mz1) / 2)) * pitch : plate + .1 + (W / 2 - Math.abs(cx)) * pitch;
        chimneyRoof(b, cx, cz, yAt - .6, Math.max(yAt + .9, plate + .1 + hd * pitch * (ridge === 'x' ? 1 : 0) + .6));
      }
    } else {
      /* split-level: two-storey half (garage below) + raised one-storey wing */
      const aW = clamp(W * .45, 4.2, 6.6), aLeft = r.chance(.5);
      const ax0 = aLeft ? x0 : x1 - aW, ax1 = aLeft ? x0 + aW : x1, bx0 = aLeft ? ax1 : x0, bx1 = aLeft ? x1 : ax0;
      const pitch = r.r(.42, .52);
      const A2 = vol(Object.assign({}, common, { x0: ax0, x1: ax1, z0, z1, base: .2, plate: .2 + 2.8 + 2.75, pitch, oE: .45, oR: .3, floorBand: wallMat === 'siding' ? 3.0 : 0, gableVent: true }));
      const Bz1 = z1 - .7, B1 = vol(Object.assign({}, common, { x0: bx0, x1: bx1, z0: z0 + .3, z1: Bz1, base: 1.35, plate: 1.35 + 2.75, pitch, oE: .45, oR: .3, gableVent: true }));
      if (wallMat === 'siding') { A2.mat2 = 'brick'; A2.band = 2.9; A2.paint2 = WHITE; }
      if (wallMat === 'brick') { A2.gableMat = B1.gableMat = 'siding'; A2.gablePaint = B1.gablePaint = lc('#D1CBC1'); }
      A2.ends = ['gable', 'gable']; B1.ends = aLeft ? ['none', r.chance(.5) ? 'hip' : 'gable'] : [r.chance(.5) ? 'hip' : 'gable', 'none'];
      vols.push(A2, B1); frontVol = B1;
      const sideA = aLeft ? 'r' : 'l', sideB = aLeft ? 'l' : 'r';
      const FB = frame(B1, sideB);
      void FB;
      B1.cover[sideA].push({ s0: -1, s1: 99, y1: 99 });
      const FA = frame(A2, sideA);
      A2.cover[sideA].push({ s0: FA.toS(aLeft ? Bz1 : z0 + .3) - (aLeft ? 0 : 0), s1: FA.toS(aLeft ? z0 + .3 : Bz1), y1: B1.plate + .1 });
      /* fix ordering of cover interval */
      const cv = A2.cover[sideA][0]; if (cv.s0 > cv.s1) { const t = cv.s0; cv.s0 = cv.s1; cv.s1 = t; }
      /* A front: garage door below, two windows above */
      const aWl = ax1 - ax0;
      A2.doors.f.push({ s: aWl / 2, y0: .1, w: Math.min(2.75, aWl - 1), h: 2.13, kind: 'garage', col: r.chance(.7) ? lc('#F2F0EA') : lc('#c9c0b0') });
      fillWindows(A2.open.f, 0, aWl, [], s => dh(s, 3.0 + .78, .9, 1.42), 2.2);
      fillWindows(A2.open.b, 0, aWl, [], s => dh(s, 3.0 + .78), 2.4); fillWindows(A2.open.b, 0, aWl, [], s => dh(s, .2 + 1.2, .9, 1.0), 2.6);
      fillWindows(A2.open[sideB], 0, D, [], s => dh(s, 3.0 + .78), 3.2); fillWindows(A2.open[sideB], 0, D, [], s => dh(s, .2 + 1.2, .9, 1.0), 3.4);
      const bWl = bx1 - bx0, F = frame(B1, 'f');
      const doorS = aLeft ? .9 : bWl - .9;
      B1.doors.f.push({ s: doorS, y0: 1.35, w: .92, h: 2.05, kind: 'door', col: doorCol, wreath: home });
      const ps = aLeft ? bWl * .62 : bWl * .38, picW = Math.min(2.4, bWl * .4);
      B1.open.f.push(dh(ps, 1.35 + .72, picW, 1.45, { kind: 'pic', shutters: false }));
      fillWindows(B1.open.f, 0, bWl, [[doorS - .8, doorS + .8], [ps - picW / 2, ps + picW / 2]], s => dh(s, 1.35 + .85), 2.4);
      fillWindows(B1.open.b, 0, bWl, [], s => dh(s, 1.35 + .85), 2.6);
      fillWindows(B1.open[sideB], 0, Bz1 - z0 - .3, [], s => dh(s, 1.35 + .85), 3);
      frontDoorF = F;
      const stoopD = 1.4; const dX = bx0 + doorS;
      b.col = lc('#c4bfb5'); wbox(b, F, 'concrete', doorS - .9, doorS + .9, -.15, 1.32, -stoopD, 0, { mpr: 2 });
      const end = steps(b, F, doorS, 1.5, 1.32, -stoopD, {});
      const rc = lc('#1f1f1f'); for (const sx of [-1, 1]) { const x = dX + sx * .85; railingRun(b, [x, 1.32, Bz1 + .1], [x, 1.32, Bz1 + stoopD - .05], .9, rc, { sp: .15 }); }
      door = { x: dX, z: Bz1, nx: 0, nz: 1, step: [dX, Bz1 - end + .3] };
      lantern(b, F, doorS + (aLeft ? .75 : -.75), 1.35 + 1.95, lights);
      numberPlaque(b, frame(A2, 'f'), aLeft ? aWl - .5 : .5, 2.6, num);
      const FAf = frame(A2, 'f'); lantern(b, FAf, aWl / 2 - Math.min(2.75, aWl - 1) / 2 - .35, 2.2, lights, 'garage');
      b.col = lc('#bdb8ae'); b.box('concrete', ax0 + aWl / 2 - 1.8, -.1, z1, ax0 + aWl / 2 + 1.8, .03, z1 + 1.6, { mpr: 2 });
      opts._drive = { x: ax0 + aWl / 2, z: z1 + 1.6, w: 3.6 };
      if (home) { hoop(b, FAf, aWl / 2, 2.9); flag(b, F, aLeft ? doorS + .6 : doorS - .6, 1.35 + 1.7); }
    }

    /* garage wing */
    if (gW) {
      const main = vols[0];
      const gx0 = gSide === 'l' ? x0 : x1 - gW, gx1 = gSide === 'l' ? x0 + gW : x1;
      const gz0 = z1 - gD;
      const gv = vol(Object.assign({}, common, { x0: gx0, x1: gx1, z0: gz0, z1, base: .12, plate: .12 + 2.7, pitch: main.pitch, oE: main.oE, oR: .3, gableVent: true }));
      gv.mat = wallMat; gv.paint = common.paint; if (wallMat === 'brick') { gv.gableMat = 'siding'; gv.gablePaint = main.gablePaint; }
      gv.ends = gSide === 'l' ? [r.chance(.5) && main.ends[1] === 'hip' ? 'hip' : 'gable', 'none'] : ['none', r.chance(.5) && main.ends[0] === 'hip' ? 'hip' : 'gable'];
      if (main.ridge === 'z') gv.ends = gSide === 'l' ? ['gable', 'none'] : ['none', 'gable'];
      const inner = gSide === 'l' ? 'r' : 'l';
      gv.cover[inner].push({ s0: -1, s1: 99, y1: 99 });
      const Fm = frame(main, gSide);
      const sA = Fm.toS(gz0), sB = Fm.toS(z1);
      main.cover[gSide].push({ s0: Math.min(sA, sB), s1: Math.max(sA, sB), y1: gv.plate + .12 });
      main.open[gSide] = main.open[gSide].filter(o => !(o.s + o.w / 2 > Math.min(sA, sB) - .2 && o.s - o.w / 2 < Math.max(sA, sB) + .2 && o.y0 < gv.plate + .2));
      const dbl = gW > 5.5, gdw = dbl ? 4.88 : 2.75, F = frame(gv, 'f');
      const gdc = r.chance(.75) ? lc('#F2F0EA') : r.chance(.5) ? lc('#d9d2c3') : lc('#5b4a3a');
      gv.doors.f.push({ s: gW / 2, y0: .12, w: gdw, h: 2.13, kind: dbl ? 'garage2' : 'garage', col: gdc });
      fillWindows(gv.open[gSide], 0, gD, [], s => dh(s, 1.1, .8, 1.1, { shutters: false }), 3.5);
      if (r.chance(.6)) gv.doors.b.push({ s: gW * .3, y0: .12, w: .86, h: 2.03, kind: 'door', col: trimCol });
      vols.push(gv);
      for (const sx of [-1, 1]) lantern(b, F, gW / 2 + sx * (gdw / 2 + .35), 2.0, lights, 'garage');
      b.col = lc('#bdb8ae'); b.box('concrete', gx0 + gW / 2 - gdw / 2 - .4, -.1, z1, gx0 + gW / 2 + gdw / 2 + .4, .03, z1 + 1.6, { mpr: 2 });
      b.col = lc('#9b968c'); b.box('concrete', gx0 + gW / 2 - gdw / 2 - .4, .028, z1 + .78, gx0 + gW / 2 + gdw / 2 + .4, .033, z1 + .8, { mpr: 2 });
      opts._drive = { x: gx0 + gW / 2, z: z1 + 1.6, w: gdw + .8 };
      if (home) hoop(b, F, gW / 2, 2.85);
    }
    if (home && frontDoorF && style !== 'split') {
      const dS = frontVol.doors.f[0].s; flag(b, frontDoorF, dS + (dS > (frontVol.x1 - frontVol.x0) / 2 ? -.62 : .62), frontVol.base + 1.75);
      for (const o of frontVol.open.f) if (o.kind === 'dh' && o.y0 < frontVol.base + 1.5) o.flowerBox = true;
    }
    /* utilities on a side wall */
    {
      const v0 = vols[0], sd = gW ? (gSide === 'l' ? 'r' : 'l') : r.pick(['l', 'r']), F = frame(v0, sd);
      if (!v0.cover[sd].some(c => c.y1 > 50)) {
        const occ = v0.open[sd].map(o => [o.s - o.w / 2, o.s + o.w / 2]);
        const free = s => !occ.some(([a, c]) => s + .5 > a && s - .5 < c);
        const sAC = [F.L * .25, F.L * .72, F.L * .5].find(free); if (sAC != null) acUnit(b, F, sAC, colliders);
        const sM = [F.L * .85, F.L * .12, F.L * .6].find(s => free(s) && Math.abs(s - (sAC || -9)) > 1); if (sM != null) meter(b, F, sM);
        hoseAndVent(b, frame(v0, 'b'), F.L * .2);
      }
    }
    /* build volumes */
    for (const v of vols) {
      volWalls(b, v);
      if (v.roof !== 'flat') gableRoof(b, v);
      colliders.push({ x0: v.x0, z0: v.z0, x1: v.x1, z1: v.z1 });
    }
    return finish(b, rot, colliders, door, lights, { style, home, number: num, doorY: frontVol.base, driveway: opts._drive || null, size: { w, d } });
  }

  /* ------------------------------------------------------------------ signs */
  function signMaterial(lines, o = {}) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d');
    x.fillStyle = o.bg || '#1d2a3a'; x.fillRect(0, 0, 1024, 256);
    x.strokeStyle = o.border || 'rgba(255,255,255,.25)'; x.lineWidth = 8; x.strokeRect(10, 10, 1004, 236);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = o.fg || '#f4efe2';
    x.font = `${o.weight || 'bold'} ${o.size || 118}px ${o.font || 'Arial Black, Impact, Arial, sans-serif'}`;
    x.fillText(lines[0], 512, lines[1] ? 108 : 132, 960);
    if (lines[1]) { x.font = `bold 46px Arial, Helvetica, sans-serif`; x.fillStyle = o.fg2 || o.fg || '#f4efe2'; x.fillText(lines[1], 512, 205, 900); }
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8;
    const m = new T.MeshStandardMaterial({ map: t, roughness: .5, emissive: new T.Color(1, 1, 1), emissiveMap: t, emissiveIntensity: .25 });
    m.userData.sign = true; SIGNS.push(m); return m;
  }
  const SIGNS = [];
  function awningMaterial(c1, c2) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? c2 : c1; x.fillRect(i * 32, 0, 32, 64); }
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping;
    return new T.MeshStandardMaterial({ map: t, roughness: .85, side: T.DoubleSide });
  }

  /* flat-roof box with parapet and coping */
  function flatTop(b, v, top, opts = {}) {
    const mpr = MPR[v.mat] || 1.6, pt = .25;
    /* roof membrane */
    b.col = lc(opts.membrane || '#8d8b86'); b.poly('concrete', [[v.x0, top - .5, v.z0], [v.x1, top - .5, v.z0], [v.x1, top - .5, v.z1], [v.x0, top - .5, v.z1]], p => [p[0] / 3, p[2] / 3], null, UP);
    /* parapet inner faces */
    b.col = v.mat === 'brick' ? WHITE : v.paint;
    for (const side of SIDES) { const F = frame(v, side); wquad(b, F, v.mat, 0, F.L, top - .5, top, pt, p => [dot(p, F.U) / mpr, p[1] / mpr], null, mul(F.N, -1)); }
    b.col = lc(opts.coping || '#9a9690');
    for (const side of SIDES) { const F = frame(v, side); wbox(b, F, 'metal', -pt, F.L + pt, top, top + .06, -.04, pt + .02, {}); }
    /* rooftop units */
    const r = RNG('rtu' + v.x0 + v.z0);
    b.col = lc('#b8b8b2');
    const n = Math.max(1, Math.floor((v.x1 - v.x0) / 8));
    for (let i = 0; i < n; i++) {
      const cx = lerp(v.x0 + 2, v.x1 - 2, (i + .5) / n) + r.r(-.5, .5), cz = lerp(v.z0 + 1.5, v.z1 - 1.5, r.r(.2, .5));
      b.obox('fixt', [cx, top - .5 + .55, cz], [1, 0, 0], UP, [0, 0, 1], .9, .55, .6, { atlas: { pz: rgUV(RG.grille), nz: rgUV(RG.grille), px: rgUV(RG.panel), nx: rgUV(RG.panel), py: rgUV(RG.panel) }, col: lc('#bdbdb6'), skip: 'ny' });
    }
    b.col = WHITE;
  }

  /* ------------------------------------------------------------------ shops */
  const SHOP_NAMES = { hardware: ["HANK'S HARDWARE", 'TOOLS · PAINT · LUMBER'], auto: ["DAD'S AUTO", 'REPAIR · TIRES · BRAKES'], store: null };
  const STORES = [['CORNER MART', 'GROCERY · DELI · LOTTO'], ['QUICK-ISH', 'OPEN 24-ISH HOURS'], ['MAPLE MARKET', 'FRESH · LOCAL · FRIENDLY'], ['CENT-SIBLE', 'SNACKS · ICE · ROOT BEER']];
  function shop(opts = {}) {
    if (!MAT) init({});
    const w = Math.max(6, opts.w || 16), d = Math.max(6, opts.d || 12), facing = FACE_ROT[opts.facing] != null ? opts.facing : '+z';
    const rot = FACE_ROT[facing], swap = facing === '+x' || facing === '-x', W = swap ? d : w, D = swap ? w : d;
    const kind = ['hardware', 'auto', 'store'].includes(opts.kind) ? opts.kind : 'store';
    const r = RNG('shop:' + kind + ':' + (opts.seed != null ? opts.seed : 1));
    const b = new Builder(), colliders = [], lights = [];
    const x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2;
    const trimCol = lc('#ECEBE6');
    let door, top;
    if (kind === 'auto') {
      top = 5.2;
      const v = vol({ x0, x1, z0, z1, base: .1, plate: top - .5, wallTop: top, mat: 'stucco', paint: lc(r.pick(['#D1C7B8', '#CCC9C0', '#E3E0D7'])), trimCol, accent: lc('#24344B'), roof: 'flat', noCorners: true, mat2: 'brick', band: 1.0, paint2: WHITE });
      /* office on one end, bays on the rest */
      const offW = Math.min(4.2, W * .3), bays = Math.max(1, Math.floor((W - offW - .6) / 4.1)), bw = 3.3;
      const F = frame(v, 'f');
      for (let i = 0; i < bays; i++) { const s = offW + .3 + (W - offW - .3) * (i + .5) / bays; v.doors.f.push({ s, y0: .1, w: bw, h: 3.6, kind: 'roll', col: lc(i === 1 ? '#c9ccce' : '#d8dadb') }); lights.push(Object.assign({}, (p => ({ x: p[0], y: p[1], z: p[2] }))(F.P(s, 4.2, -.6)), { color: 0xfff2d8, intensity: 1.2, distance: 10, kind: 'flood' })); }
      v.doors.f.push({ s: offW * .3, y0: .1, w: 1.0, h: 2.15, kind: 'glass', card: 6 });
      v.open.f.push({ s: offW * .68, y0: 1.0, w: offW * .45, h: 1.6, kind: 'store', frameCol: lc('#3b3d3f'), card: 6, lit: true });
      fillWindows(v.open.b, 0, W, [], s => ({ s, y0: 2.2, w: 1.2, h: .8, kind: 'case', card: 5, frameCol: lc('#3b3d3f') }), 4);
      v.doors.b.push({ s: W * .8, y0: .1, w: .95, h: 2.1, kind: 'door', col: lc('#5d6063') });
      volWalls(b, v); flatTop(b, v, top);
      /* sign band */
      const sm = signMaterial(SHOP_NAMES.auto, { bg: '#1c3150', fg: '#f6f1e4', fg2: '#f2b632' }); b.mats.sign = sm;
      const sw = Math.min(W - 1, 9), sc = W / 2;
      wbox(b, F, 'metal', sc - sw / 2 - .1, sc + sw / 2 + .1, 4.05, 5.05, -.16, 0, { col: lc('#222') });
      b.col = WHITE; wquad(b, F, 'sign', sc - sw / 2, sc + sw / 2, 4.1, 5.0, -.165, [[0, 0], [1, 0], [1, 1], [0, 1]]);
      for (let i = 0; i < 3; i++) lantern(b, F, sc - sw / 2 + sw * (i + .5) / 3, 5.3, lights, 'sign');
      b.col = lc('#bdb8ae'); b.box('concrete', x0, -.1, z1, x1, .03, z1 + 2.5, { mpr: 2 });
      /* tyre rack & oil sign stand: a few simple tyres stacked by the office */
      const tg = new T.TorusGeometry(.3, .11, 8, 18); tg.rotateX(Math.PI / 2);
      for (let i = 0; i < 4; i++) b.geo('metal', tg, new T.Matrix4().makeTranslation(x0 + offW * .5 + .9, .11 + i * .22, z1 + .55), lc('#151515'));
      door = { x: x0 + offW * .3, z: z1, nx: 0, nz: 1, step: [x0 + offW * .3, z1 + 1] };
    } else {
      top = kind === 'hardware' ? 5.6 : 4.8;
      const mat = kind === 'hardware' ? 'brick' : r.pick(['stucco', 'brick']);
      const v = vol({ x0, x1, z0, z1, base: .12, plate: top - .5, wallTop: top, mat, paint: mat === 'brick' ? WHITE : lc(r.pick(['#E3E0D7', '#D1C7B8', '#C7B79A'])), trimCol, accent: lc('#24344B'), roof: 'flat', noCorners: true });
      const F = frame(v, 'f');
      const doorS = W / 2, sfW = W - 2.2;
      /* storefront: two glazed runs either side of the entry */
      const left = [1.1, doorS - 1.0], right = [doorS + 1.0, W - 1.1];
      for (const [a, c] of [left, right]) if (c - a > 1) v.open.f.push({ s: (a + c) / 2, y0: .12, w: c - a, h: 3.1, kind: 'store', frameCol: lc('#3b3d3f'), card: 4, lit: true });
      v.doors.f.push({ s: doorS, y0: .12, w: 1.9, h: 3.1, kind: 'glass', transom: true, card: 4 });
      v.doors.b.push({ s: W * .25, y0: .12, w: 2.8, h: 3.0, kind: 'roll', col: lc('#cfd1d2') });
      v.doors.b.push({ s: W * .6, y0: .12, w: .95, h: 2.1, kind: 'door', col: lc('#5d6063') });
      volWalls(b, v); flatTop(b, v, top);
      /* awning across the storefront */
      const am = kind === 'hardware' ? awningMaterial('#b3202a', '#f1ece2') : awningMaterial(r.pick(['#2c5a3b', '#1f3f66', '#7a2626']), '#ebe6da');
      b.mats.awning = am; am.userData.noShadow = false;
      const ay = 3.55, aD = 1.35;
      const P = [F.P(.4, ay - .75, -aD), F.P(W - .4, ay - .75, -aD), F.P(W - .4, ay, 0), F.P(.4, ay, 0)];
      b.col = WHITE; b.poly('awning', P, [[0, 0], [(W - .8) / 1.2, 0], [(W - .8) / 1.2, 1], [0, 1]], null, add(F.N, [0, 1, 0]));
      b.poly('awning', [F.P(.4, ay - 1.0, -aD), F.P(W - .4, ay - 1.0, -aD), F.P(W - .4, ay - .75, -aD), F.P(.4, ay - .75, -aD)], [[0, 0], [(W - .8) / 1.2, 0], [(W - .8) / 1.2, .3], [0, .3]], null, F.N);
      for (const s of [.4, W - .4]) b.poly('awning', [F.P(s, ay - .75, -aD), F.P(s, ay, 0), F.P(s, ay - .75, 0)], [[0, 0], [1, 1], [0, 1]], null, mul(F.U, s < 1 ? -1 : 1));
      /* sign */
      const nm = opts.name || (kind === 'hardware' ? SHOP_NAMES.hardware : r.pick(STORES));
      const sm = signMaterial(nm, kind === 'hardware' ? { bg: '#7d1d1d', fg: '#fbf6ea', fg2: '#f3d27a', font: 'Georgia, "Times New Roman", serif', size: 112 } : { bg: '#f4f0e6', fg: '#1d3a5f', fg2: '#a12a2a' });
      b.mats.sign = sm;
      const sw = Math.min(W - 1.4, 11), sc = W / 2, sy0 = 3.85, sy1 = top - .25;
      wbox(b, F, 'metal', sc - sw / 2 - .08, sc + sw / 2 + .08, sy0 - .06, sy1 + .06, -.14, 0, { col: lc('#2a2a2a') });
      b.col = WHITE; wquad(b, F, 'sign', sc - sw / 2, sc + sw / 2, sy0, sy1, -.145, [[0, 0], [1, 0], [1, 1], [0, 1]]);
      for (let i = 0; i < 3; i++) lantern(b, F, sc - sw / 2 + sw * (i + .5) / 3, top + .05, lights, 'sign');
      b.col = lc('#bdb8ae'); b.box('concrete', x0, -.1, z1, x1, .1, z1 + 2.2, { mpr: 2 });
      if (kind === 'hardware') {
        /* sidewalk display: pallets of bagged stuff + a mulch pile edge */
        const bag = new T.BoxGeometry(.6, .14, .4);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) b.geo('trim', bag, new T.Matrix4().makeTranslation(x0 + 1.4 + (i % 2) * .05, .2 + j * .15, z1 + 1.2 + i * .45), lc(j % 2 ? '#6e5a3c' : '#4c6b3a'));
        b.col = lc('#8a6a42'); b.box('trim', x0 + 1.05, .1, z1 + .9, x0 + 1.75, .2, z1 + 2.15);
      }
      door = { x: x0 + doorS, z: z1, nx: 0, nz: 1, step: [x0 + doorS, z1 + 1.2] };
    }
    colliders.push({ x0, z0, x1, z1 });
    return finish(b, rot, colliders, door, lights, { kind, size: { w, d }, height: top, doorY: .12 });
  }

  /* ------------------------------------------------------------------ shells */
  function shell(opts = {}) {
    if (!MAT) init({});
    const w = Math.max(6, opts.w || 14), d = Math.max(6, opts.d || 10), facing = FACE_ROT[opts.facing] != null ? opts.facing : '+z';
    const rot = FACE_ROT[facing], swap = facing === '+x' || facing === '-x', W = swap ? d : w, D = swap ? w : d;
    const kind = ['warehouse', 'duplex', 'rowhouse'].includes(opts.kind) ? opts.kind : 'warehouse';
    const r = RNG('shell:' + kind + ':' + (opts.seed != null ? opts.seed : 1));
    const b = new Builder(), colliders = [], lights = [];
    const x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2;
    let door, H;
    if (kind === 'warehouse') {
      H = Math.max(4.5, opts.h || 6.5);
      const pitch = .14;
      const v = vol({ x0, x1, z0, z1, base: .15, plate: H, mat: 'corr', paint: lc(r.pick(['#a9b0b3', '#c3c0b6', '#8f9a92', '#b5a58c'])), trimCol: lc('#6d7275'), accent: lc('#3b4a5c'), pitch, oE: .3, oR: .25, ridge: 'x', noCorners: false, gutterCol: lc('#6d7275') });
      v.ends = ['gable', 'gable'];
      const F = frame(v, 'f');
      const dockS = W * .3, dw = 3.0, rollS = W * .72;
      v.doors.f.push({ s: dockS, y0: 1.2, w: dw, h: 3.0, kind: 'roll', col: lc('#d1d3d4') });
      if (W > 12) v.doors.f.push({ s: rollS, y0: .15, w: 4.0, h: Math.min(4.4, H - 1), kind: 'roll', col: lc('#c8cacb') });
      const manS = W > 12 ? (dockS + rollS) / 2 : W * .78;
      v.doors.f.push({ s: manS, y0: .15, w: .95, h: 2.1, kind: 'door', col: lc('#4f5b66') });
      fillWindows(v.open.l, 0, D, [], s => ({ s, y0: H - 1.6, w: 1.6, h: .7, kind: 'case', card: 7, frameCol: lc('#3b3d3f') }), 4);
      fillWindows(v.open.r, 0, D, [], s => ({ s, y0: H - 1.6, w: 1.6, h: .7, kind: 'case', card: 5, frameCol: lc('#3b3d3f') }), 4);
      v.doors.b.push({ s: W * .5, y0: .15, w: .95, h: 2.1, kind: 'door', col: lc('#4f5b66') });
      volWalls(b, v);
      /* metal roof: shingle buckets reused with corrugated material by swapping keys */
      const rb = new Builder(); rb.mats = b.mats; gableRoof(rb, v);
      if (rb.g.shingle) { b.g.metalroof = rb.g.shingle; delete rb.g.shingle; }
      for (const k in rb.g) { const src = rb.g[k], dst = b.B(k), base = dst.p.length / 3; dst.p.push(...src.p); dst.n.push(...src.n); dst.u.push(...src.u); dst.c.push(...src.c); for (const i of src.i) dst.i.push(i + base); }
      if (b.g.metalroof) { const u = b.g.metalroof.u; for (let i = 0; i < u.length; i += 2) { const t = u[i]; u[i] = u[i + 1] * MPR.shingle / MPR.corr; u[i + 1] = t * MPR.shingle / MPR.corr; } const c = b.g.metalroof.c; for (let i = 0; i < c.length; i++) c[i] = [.62, .64, .65][i % 3]; }
      b.mats.metalroof = MAT.corr;
      /* loading dock */
      b.col = lc('#b5b0a6'); wbox(b, F, 'concrete', dockS - dw / 2 - .8, dockS + dw / 2 + .8, -.1, 1.2, -2.4, 0, { mpr: 2 });
      b.col = lc('#1a1a1a'); for (const sx of [-1, 1]) wbox(b, F, 'metal', dockS + sx * (dw / 2 - .1) - .15, dockS + sx * (dw / 2 - .1) + .15, .7, 1.15, -2.55, -2.4, {});
      b.col = lc('#d9b62a'); wbox(b, F, 'metal', dockS - dw / 2 - .8, dockS + dw / 2 + .8, 1.15, 1.21, -2.42, -2.38, {});
      railingRun(b, F.P(dockS + dw / 2 + .75, 1.2, -2.3), F.P(dockS + dw / 2 + .75, 1.2, -.1), 1.0, lc('#d9b62a'), { sp: .5 });
      steps(b, F, dockS - dw / 2 - .45, .7, 1.2, -2.4 + 0, { col: lc('#b5b0a6') });
      for (const s of [dockS, W > 12 ? rollS : manS]) lantern(b, F, s, Math.min(H - .6, 4.9), lights, 'flood');
      b.col = lc('#9b968c'); b.box('concrete', x0, -.1, z1, x1, .02, z1 + 3, { mpr: 2.5 });
      colliders.push({ x0, z0, x1, z1 }); const dk = [F.P(dockS - dw / 2 - .8, 0, -2.4), F.P(dockS + dw / 2 + .8, 0, 0)];
      colliders.push({ x0: Math.min(dk[0][0], dk[1][0]), z0: Math.min(dk[0][2], dk[1][2]), x1: Math.max(dk[0][0], dk[1][0]), z1: Math.max(dk[0][2], dk[1][2]) });
      door = { x: x0 + manS, z: z1, nx: 0, nz: 1, step: [x0 + manS, z1 + 1] };
    } else if (kind === 'duplex') {
      /* run-down side-by-side duplex: two storeys, two front doors, boarded window, grime */
      const base = .5; H = base + 2.95 + 2.75;
      const paint = lc(r.pick(['#B9B3A5', '#9AA3A6', '#C7B79A', '#8C9A8E']), .82);
      const v = vol({ x0, x1, z0, z1, base, plate: H, mat: 'siding', paint, trimCol: lc('#d8d4c8'), accent: lc('#3E3A36'), roofCol: lc('#6a645a'), pitch: .5, oE: .38, oR: .28, gableVent: true, gutterCol: lc('#b8b4a8') });
      v.ends = ['gable', 'gable'];
      const F = frame(v, 'f'), half = W / 2;
      const dh2 = (s, y0, ex = {}) => Object.assign({ s, y0, w: .86, h: 1.4, kind: 'dh', grille: 'none', shutters: false, card: r.pick([1, 3, 7]), lit: false }, ex);
      for (const [a, c, mir] of [[0, half, 0], [half, W, 1]]) {
        const dS = mir ? a + 1.1 : c - 1.1;
        v.doors.f.push({ s: dS, y0: base, w: .9, h: 2.05, kind: 'door', col: lc(mir ? '#5b3a29' : '#2F3D4C', .8), hinge: mir ? 'r' : 'l' });
        const wS = mir ? c - (c - a) * .38 : a + (c - a) * .38;
        v.open.f.push(dh2(wS, base + .85));
        v.open.f.push(dh2((a + c) / 2, base + 2.95 + .8));
        lantern(b, F, mir ? dS + .7 : dS - .7, base + 1.95, lights);
      }
      fillWindows(v.open.b, 0, W, [], s => dh2(s, base + .85), 2.5); fillWindows(v.open.b, 0, W, [], s => dh2(s, base + 2.95 + .8), 2.5);
      fillWindows(v.open.l, 0, D, [], s => dh2(s, base + .85), 3); fillWindows(v.open.r, 0, D, [], s => dh2(s, base + 2.95 + .8), 3);
      volWalls(b, v); gableRoof(b, v);
      /* boarded-up window: plywood over one ground floor window, another with a broken blind */
      const bw = v.open.f[0];
      b.col = WHITE; wbox(b, F, 'fixt', bw.s - bw.w / 2 - .12, bw.s + bw.w / 2 + .12, bw.y0 - .1, bw.y0 + bw.h + .1, -.07, -.04, { atlas: { pz: rgUV(RG.ply) }, skip: 'nz' });
      const bw2 = v.open.f[3]; b.col = lc('#cfc9bb'); wbox(b, F, 'fixt', bw2.s - bw2.w / 2 - .1, bw2.s + bw2.w / 2 + .1, bw2.y0 - .08, bw2.y0 + bw2.h + .08, -.07, -.04, { atlas: { pz: rgUV(RG.ply) }, skip: 'nz' });
      /* grime streaks under windows / eaves and along the base */
      b.col = WHITE;
      for (const side of SIDES) {
        const Fs = frame(v, side);
        b.poly('grime', [Fs.P(0, H - 2.2, -.012), Fs.P(Fs.L, H - 2.2, -.012), Fs.P(Fs.L, H, -.012), Fs.P(0, H, -.012)], [[0, 0], [Fs.L / 3, 0], [Fs.L / 3, 1], [0, 1]], null, Fs.N);
        for (const o of v.open[side]) b.poly('grime', [Fs.P(o.s - o.w / 2 - .1, o.y0 - 1.4, -.03), Fs.P(o.s + o.w / 2 + .1, o.y0 - 1.4, -.03), Fs.P(o.s + o.w / 2 + .1, o.y0 - .05, -.03), Fs.P(o.s - o.w / 2 - .1, o.y0 - .05, -.03)], [[.2, .1], [.5, .1], [.5, .9], [.2, .9]], null, Fs.N);
        b.poly('grime', [Fs.P(0, base - .1, -.012), Fs.P(Fs.L, base - .1, -.012), Fs.P(Fs.L, base + 1.0, -.012), Fs.P(0, base + 1.0, -.012)], [[0, 1], [Fs.L / 4, 1], [Fs.L / 4, .55], [0, .55]], null, Fs.N);
      }
      /* sagging stoop slabs and a dead window AC */
      for (const o of v.doors.f) { b.col = lc('#a39e94'); wbox(b, F, 'concrete', o.s - .8, o.s + .8, -.15, base - .03, -1.1, 0, { mpr: 2 }); steps(b, F, o.s, 1.2, base - .03, -1.1, { col: lc('#a39e94') }); }
      { const o = v.open.f[2]; b.col = lc('#b9b5a8'); wbox(b, F, 'fixt', o.s - .32, o.s + .32, o.y0 + .02, o.y0 + .42, -.35, .2, { atlas: { pz: rgUV(RG.grille) } }); }
      numberPlaque(b, F, v.doors.f[0].s + .7, base + 1.5, 100 + (hashSeed('d' + opts.seed) % 800));
      colliders.push({ x0, z0, x1, z1 });
      door = { x: x0 + v.doors.f[0].s, z: z1, nx: 0, nz: 1, step: [x0 + v.doors.f[0].s, z1 + 1.6] };
    } else {
      /* rowhouse: attached brick units with stoops, flat roofs with cornice */
      H = Math.max(6, opts.h || 9);
      const n = Math.max(1, Math.round(W / 5.2)), uw = W / n, base = 1.05;
      let first = null;
      for (let i = 0; i < n; i++) {
        const ux0 = x0 + i * uw, ux1 = ux0 + uw, top = H + (i % 2 ? .25 : 0);
        const tint = r.pick(['#ffffff', '#f0e0d8', '#e8d8c8', '#ffffff']);
        const v = vol({ x0: ux0, x1: ux1, z0, z1, base, plate: top - .6, wallTop: top, mat: 'brick', paint: lc(tint), trimCol: lc(r.pick(['#ECEBE6', '#E9E2D0', '#2a2a2a'])), accent: lc('#1E1F21'), roof: 'flat', noCorners: true });
        if (i > 0) v.cover.l.push({ s0: -1, s1: 99, y1: 99 });
        if (i < n - 1) v.cover.r.push({ s0: -1, s1: 99, y1: 99 });
        const F = frame(v, 'f'), dS = i % 2 ? uw - 1.0 : 1.0;
        v.doors.f.push({ s: dS, y0: base, w: 1.0, h: 2.45, kind: 'door', transom: true, col: lc(r.pick(DOORC)) });
        const wl = { s: i % 2 ? uw * .36 : uw * .64, y0: base + .7, w: 1.0, h: 1.8, kind: 'dh', grille: r.pick(['none', 'colonial']), card: r.i(0, 3), lit: r.chance(.3) };
        v.open.f.push(wl);
        for (let fl = 1; fl * 2.95 + base + 2.5 < top - .4; fl++) for (const s of [uw * .28, uw * .72]) v.open.f.push({ s, y0: base + fl * 2.95 + .6, w: .95, h: 1.7, kind: 'dh', grille: wl.grille, card: r.i(0, 3), lit: r.chance(.25) });
        fillWindows(v.open.b, 0, uw, [], s => ({ s, y0: base + .9, w: .9, h: 1.4, kind: 'dh', card: r.i(0, 3) }), 2.6);
        volWalls(b, v); flatTop(b, v, top, { membrane: '#6b6965', coping: '#d5d1c8' });
        /* cornice */
        b.col = lc('#e6e2d8'); wbox(b, F, 'trim', -.05, uw + .05, top - .45, top - .15, -.35, 0, {}); wbox(b, F, 'trim', -.1, uw + .1, top - .15, top - .05, -.45, 0, {});
        for (let k = 0; k < Math.floor(uw / .5); k++) wbox(b, F, 'trim', .25 + k * .5 - .05, .25 + k * .5 + .05, top - .6, top - .45, -.25, 0, {});
        /* stoop with iron railings */
        b.col = lc('#b9b3a8'); wbox(b, F, 'concrete', dS - .75, dS + .75, -.15, base - .03, -1.2, 0, { mpr: 2 });
        const end = steps(b, F, dS, 1.3, base - .03, -1.2, { col: lc('#b9b3a8') });
        for (const sx of [-1, 1]) { const p0 = F.P(dS + sx * .68, base - .03, -.05), p1 = F.P(dS + sx * .68, base - .03, -1.15); railingRun(b, p0, p1, .9, lc('#1a1a1a'), { sp: .15 }); }
        lantern(b, F, dS + (i % 2 ? -.75 : .75), base + 2.0, lights);
        numberPlaque(b, F, dS + (i % 2 ? -.75 : .75), base + 1.55, 200 + i * 2 + (hashSeed('r' + opts.seed) % 50) * 2, lc('#e8e3d6'));
        if (!first) first = { x: ux0 + dS, z: z1, nx: 0, nz: 1, step: [ux0 + dS, z1 - end + .3] };
      }
      colliders.push({ x0, z0, x1, z1 });
      door = first;
    }
    return finish(b, rot, colliders, door, lights, { kind, size: { w, d }, height: H });
  }

  /* ------------------------------------------------------------------ public api */
  function init(o = {}) {
    if (MAT) return HT.Buildings;
    A = o.assets || (window.__ht && window.__ht.assets) || null; BASE = o.base || '';
    ATL = buildAtlas(); INTL = buildInteriors(); MAT = makeMaterials();
    return HT.Buildings;
  }
  /* 0 = day, 1 = night: drives porch lights, sign glow and lit interiors. k = 0 is exactly the material set's daytime look.
     gain (default 1) scales the tone-mapped parts (interiors, signs) against a darker night exposure; the glow is unlit HDR. */
  function setNight(k, gain) {
    NIGHT = clamp(k, 0, 1); if (!MAT) return; const g = gain > 0 ? gain : 1;
    MAT.glow.color.setRGB(lerp(2, 6, NIGHT), lerp(1.6, 4.6, NIGHT), lerp(1.05, 2.8, NIGHT));
    /* lamps on inside: a warm room light */
    MAT.interior.color.setRGB(lerp(.5, 5.5 * g, NIGHT), lerp(.5, 4.1 * g, NIGHT), lerp(.5, 2.4 * g, NIGHT));
    for (const m of SIGNS) m.emissiveIntensity = lerp(.25, 1.1 * g, NIGHT);
  }
  function stats(g) { let tris = 0, draws = 0; g.traverse(o => { if (o.isMesh) { draws++; tris += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; } }); return { draws, tris }; }
  HT.Buildings = { init, house, shop, shell, setNight, stats, get materials() { return MAT; }, STYLES };
})();
