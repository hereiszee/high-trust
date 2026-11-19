/* High Trust: procedural vehicles.
   HT.Vehicles.init({assets}) once, then HT.Vehicles.make(type, {color, upgrades}) -> THREE.Group.
   type: 'minivan' | 'sedan' | 'suv' | 'hatch' | 'pickup' | 'workvan'.
   Local frame: metres, length along X with the FRONT at +X, width along Z (+Z = right-hand side), tyres touch y=0, centred on the origin.

   Bodies are lofted surfaces: every type is a set of side-profile / plan-view curves (monotone cubic keys) evaluated at ~90 stations
   along the length; each station gets a cross-section ring (rocker, side bulge, shoulder crease, tumblehome greenhouse, roof crown)
   and the noses close with a superellipse plan corner. Materials are assigned per quad (paint, glass, black trim, cladding...) and
   lamps, grilles, plates, seams and decals are patches projected onto that same surface, so everything sits flush.

   group.userData = {
     type, size:{l,w,h}, len, wid,
     wheels:[Object3D]   spin nodes: rotation.z is the roll angle, NEGATIVE = rolling forward (+X). update() sets it.
     steer:[Object3D]    front wheel pivots: rotation.y = steer angle in radians, positive = turning left (toward -Z).
     lights:{head:[], tail:[], brake:[], bar:[]}  emissive materials (MeshStandardMaterial; drive .emissiveIntensity).
     body:[materials for paint] (body[0] = main paint, body[1] = lower/two-tone paint),
     parts:{body:Object3D (the sprung body that rolls/pitches), glass:Material, wheels:[...], rear:Mesh (sticker slot on the tailgate)},
     colliders:[{x0,z0,x1,z1}] local AABB, wheelRadius, wheelBase,
     setUpgrades(u), setColor(hex), setLights(on), flashBar(t), setDamage(f), dispose()
   }
   HT.Vehicles.update(v, {speed m/s (+ forward), steer (-1..1, + = left), braking bool, headlights bool, dt s}).
   Upgrades (unknown keys ignored, missing = stock): paint ('#hex' colour, or 'solid'|'twotone'|'wood'|'mural' finish),
   rims ('stock'|'steel'|'alloy'|'black'|'chrome'|'gold'|'spinner'), roofRack (bool | 'rails' | 'cargo'), bullBar (bool),
   lightBar (bool | 'amber'), tint (0..1), spoiler (bool). */
(function () {
  'use strict';
  const HT = window.HT = window.HT || {};
  const T = THREE;
  let ASSETS = null;

  /* ------------------------------------------------------------------ helpers */
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lin = h => new T.Color(h).convertSRGBToLinear();

  /* monotone cubic interpolation through [[x,v],...] (Fritsch-Carlson): smooth profiles with no overshoot */
  function curve(keys) {
    keys = keys.slice().sort((a, b) => a[0] - b[0]);
    const n = keys.length, X = keys.map(k => k[0]), Y = keys.map(k => k[1]), d = [], m = [];
    for (let i = 0; i < n - 1; i++) d[i] = (Y[i + 1] - Y[i]) / (X[i + 1] - X[i]);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return x => {
      if (x <= X[0]) return Y[0]; if (x >= X[n - 1]) return Y[n - 1];
      let i = 0; while (i < n - 2 && x > X[i + 1]) i++;
      const h = X[i + 1] - X[i], t = (x - X[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * Y[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * Y[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }
  function RNG(seed) { let a = seed >>> 0 || 0x9e3779b9; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ------------------------------------------------------------------ geometry buckets (one merged mesh per material) */
  class Buckets {
    constructor() { this.b = {}; }
    get(k) { return this.b[k] || (this.b[k] = { p: [], n: [], u: [], c: [] }); }
    /* vertex = [p, n, uv, c] */
    tri(k, a, b, c) { const B = this.get(k); for (const v of [a, b, c]) { B.p.push(v[0][0], v[0][1], v[0][2]); B.n.push(v[1][0], v[1][1], v[1][2]); B.u.push(v[2] ? v[2][0] : 0, v[2] ? v[2][1] : 0); const c_ = v[3] || 1; B.c.push(c_, c_, c_); } }
    /* quad a b c d (counter-clockwise seen from the outside) */
    quad(k, a, b, c, d) { this.tri(k, a, b, c); this.tri(k, a, c, d); }
    /* append a THREE geometry transformed by matrix m */
    geo(k, g, m, shade = 1) {
      g = g.index ? g.toNonIndexed() : g.clone(); if (m) g.applyMatrix4(m);
      if (!g.attributes.normal) g.computeVertexNormals();
      const B = this.get(k), P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      for (let i = 0; i < P.count; i++) { B.p.push(P.getX(i), P.getY(i), P.getZ(i)); B.n.push(N.getX(i), N.getY(i), N.getZ(i)); B.u.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0); B.c.push(shade, shade, shade); }
      g.dispose();
    }
    build(mats, parent, names) {
      const out = {};
      for (const k in this.b) {
        const B = this.b[k]; if (!B.p.length || !mats[k]) continue;
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(B.n, 3));
        g.setAttribute('uv', new T.Float32BufferAttribute(B.u, 2)); g.setAttribute('color', new T.Float32BufferAttribute(B.c, 3));
        g.computeBoundingSphere();
        const m = new T.Mesh(g, mats[k]); m.name = (names || '') + k; m.castShadow = k !== 'glass' && k !== 'shadow'; m.receiveShadow = true;
        if (k === 'glass') m.renderOrder = 2;
        parent.add(m); out[k] = m;
      }
      return out;
    }
  }
  /* rounded box geometry (w,h,d with corner radius r), centred */
  function rbox(w, h, d, r, seg = 3) {
    r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const g = new T.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2), P = g.attributes.position;
    const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ix = clamp(x, -hx, hx), iy = clamp(y, -hy, hy), iz = clamp(z, -hz, hz);
      const n = nrm([x - ix, y - iy, z - iz]); P.setXYZ(i, ix + n[0] * r, iy + n[1] * r, iz + n[2] * r);
    }
    g.computeVertexNormals(); return g;
  }
  const M4 = () => new T.Matrix4();
  const place = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => M4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz, 'YXZ')), new T.Vector3(s, s, s));
  /* matrix that puts local +Z along normal n, local +Y roughly up, at point p */
  function frameAt(p, n, upHint = [0, 1, 0]) {
    const z = new T.Vector3(n[0], n[1], n[2]).normalize(), up = new T.Vector3(upHint[0], upHint[1], upHint[2]);
    let x = new T.Vector3().crossVectors(up, z); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize();
    const y = new T.Vector3().crossVectors(z, x);
    return M4().makeBasis(x, y, z).setPosition(p[0], p[1], p[2]);
  }

  /* ------------------------------------------------------------------ canvas textures */
  const TEX = {};
  function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
  /* normal map from a height function h(u,v) in 0..1 */
  function normalTex(w, h, fn, strength, repeat) {
    const H = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) H[y * w + x] = fn(x / w, y / h);
    const c = canvas(w, h, (g) => {
      const im = g.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const hl = H[y * w + (x - 1 + w) % w], hr = H[y * w + (x + 1) % w], hu = H[((y - 1 + h) % h) * w + x], hd = H[((y + 1) % h) * w + x];
        const n = nrm([(hl - hr) * strength, (hd - hu) * strength, 1]), o = (y * w + x) * 4;
        im.data[o] = (n[0] * .5 + .5) * 255; im.data[o + 1] = (n[1] * .5 + .5) * 255; im.data[o + 2] = (n[2] * .5 + .5) * 255; im.data[o + 3] = 255;
      }
      g.putImageData(im, 0, 0);
    });
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; if (repeat) t.repeat.set(repeat[0], repeat[1]); return t;
  }
  function getTex(name) {
    if (TEX[name]) return TEX[name];
    let t;
    if (name === 'tread') {
      /* u = around the tyre (one tread pitch), v = across the width */
      t = normalTex(64, 128, (u, v) => {
        const across = Math.abs(v - .5) * 2; if (across > .78) return .5 + .5 * Math.sin(u * Math.PI * 2 * 2) * .2;
        const block = (Math.abs(((u + (v > .5 ? .5 : 0) + across * .35) % 1) - .5) < .06) ? 0 : 1;
        const rib = [.18, .5, .82].some(g => Math.abs(across - g) < .035) ? 0 : 1;
        return block * rib;
      }, 3, [64, 1]);
    } else if (name === 'grille') {
      t = normalTex(128, 128, (u, v) => { /* hex mesh */
        const s = 8, x = u * s, y = v * s * 1.1547, r = Math.floor(y), xo = x + (r % 2 ? .5 : 0), fx = xo - Math.floor(xo) - .5, fy = y - r - .5;
        return Math.hypot(fx, fy * .9) < .36 ? 0 : 1;
      }, 4, [1, 1]);
    } else if (name === 'grilleCol') {
      const c = canvas(128, 128, (g, w, h) => {
        g.fillStyle = '#2a2b2d'; g.fillRect(0, 0, w, h); g.fillStyle = '#050505';
        const s = 16; for (let r = 0; r < 10; r++) for (let k = -1; k < 9; k++) { const cx = (k + (r % 2 ? .5 : 0) + .5) * s, cy = (r + .5) * s * .866; g.beginPath(); for (let a = 0; a < 6; a++) { const an = a * Math.PI / 3 + Math.PI / 6; g.lineTo(cx + Math.cos(an) * s * .4, cy + Math.sin(an) * s * .4); } g.fill(); }
      });
      t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping;
    } else if (name === 'shadow') {
      const c = canvas(128, 128, (g, w, h) => {
        const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(.55, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      });
      t = new T.CanvasTexture(c);
    } else if (name === 'wood') {
      const c = canvas(1024, 256, (g, w, h) => {
        const R = RNG(7); g.fillStyle = '#6b4128'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 260; i++) { const y = R() * h, a = .05 + R() * .18; g.strokeStyle = R() < .5 ? `rgba(40,20,8,${a})` : `rgba(160,110,60,${a})`; g.lineWidth = .5 + R() * 2.5; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * .01 + i) * 3 + (R() - .5) * 2); g.stroke(); }
        g.strokeStyle = 'rgba(25,12,4,.7)'; g.lineWidth = 2; for (let x = 0; x < w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      });
      t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    } else if (name === 'mural') {
      const c = canvas(1024, 256, (g, w, h) => {
        const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#2b5f9e'); sky.addColorStop(.6, '#f08a4b'); sky.addColorStop(1, '#f6c35a'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
        g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(w * .62, h * .62, 60, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1e3b2f'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 16) g.lineTo(x, h * .72 - Math.sin(x * .012) * 30 - Math.sin(x * .05) * 8); g.lineTo(w, h); g.fill();
        g.fillStyle = '#163024'; for (let i = 0; i < 9; i++) { const x = 40 + i * 115; g.fillRect(x - 4, h * .5, 8, h * .5); g.beginPath(); g.arc(x, h * .5, 34, 0, Math.PI * 2); g.fill(); }
        g.font = 'bold 54px Georgia, serif'; g.fillStyle = '#fff6e0'; g.strokeStyle = '#4a2410'; g.lineWidth = 6; g.textAlign = 'center'; g.strokeText('RIVERSIDE', w * .3, 84); g.fillText('RIVERSIDE', w * .3, 84);
      });
      t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    } else if (name === 'soccer') {
      const c = canvas(512, 128, (g, w, h) => {
        g.fillStyle = '#f7f5ee'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1b3f8a'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
        const cx = 64, cy = 64, r = 46; g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.lineWidth = 3; g.strokeStyle = '#111'; g.stroke();
        g.fillStyle = '#111'; const pent = (x, y, s, a0) => { g.beginPath(); for (let i = 0; i < 5; i++) { const a = a0 + i * Math.PI * 2 / 5; g.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); } g.fill(); };
        pent(cx, cy, 14, -Math.PI / 2); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + Math.PI / 5 + i * Math.PI * 2 / 5; pent(cx + Math.cos(a) * 36, cy + Math.sin(a) * 36, 11, a); }
        g.fillStyle = '#1b3f8a'; g.font = 'bold 44px Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('SOCCER DAD', 128, 50);
        g.font = 'bold 22px Arial, sans-serif'; g.fillStyle = '#c0392b'; g.fillText('ORANGE SLICES AT HALFTIME', 130, 94);
      });
      t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    }
    return TEX[name] = t;
  }
  function plateTex(text, front) {
    const c = canvas(256, 128, (g, w, h) => {
      const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#fdfdfb'); bg.addColorStop(1, '#dfe4ea'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#1d3d7a'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = '#1d3d7a'; g.font = 'bold 18px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('MAPLE STATE', w / 2, 26);
      g.fillStyle = '#152238'; g.font = 'bold 54px "Arial Narrow", Arial, sans-serif'; g.fillText(text, w / 2, 86);
      g.fillStyle = '#8a2f2a'; g.font = 'italic 14px Georgia, serif'; g.fillText('The High-Trust State', w / 2, 112);
    });
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }

  /* ------------------------------------------------------------------ shared materials */
  let SH = null;
  function shared() {
    if (SH) return SH;
    const std = (o) => new T.MeshStandardMaterial(o);
    SH = {
      under: std({ color: lin('#1a1a1a'), roughness: .95, vertexColors: true }),
      trim: std({ color: lin('#1c1d1f'), roughness: .62, metalness: 0, vertexColors: true }),
      gloss: new T.MeshPhysicalMaterial({ color: lin('#0b0c0d'), roughness: .15, metalness: 0, clearcoat: 1, clearcoatRoughness: .05 }),
      chrome: std({ color: lin('#e6e8ea'), roughness: .07, metalness: 1 }),
      satin: std({ color: lin('#a9adb2'), roughness: .3, metalness: 1 }),
      seam: std({ color: lin('#050505'), roughness: .9 }),
      rubber: std({ color: lin('#121212'), roughness: .85 }),
      interior: std({ color: lin('#2b2a28'), roughness: .95, vertexColors: true }),
      dash: std({ color: lin('#1e1e1f'), roughness: .7 }),
      grille: std({ color: lin('#ffffff'), roughness: .45, metalness: .35, map: getTex('grilleCol'), normalMap: getTex('grille') }),
      drl: new T.MeshBasicMaterial({ color: lin('#ffffff').multiplyScalar(2.2), toneMapped: false }),
      amber: std({ color: lin('#c26a10'), roughness: .2, metalness: .1, emissive: lin('#ff8a1a'), emissiveIntensity: .25 }),
      reflector: std({ color: lin('#6b0b08'), roughness: .25, emissive: lin('#ff1a10'), emissiveIntensity: .08 }),
      tyre: std({ color: lin('#1c1c1c'), roughness: .9, normalMap: getTex('tread') }),
      sidewall: std({ color: lin('#1e1e1e'), roughness: .85 }),
      disc: std({ color: lin('#7a7a7a'), roughness: .42, metalness: .9 }),
      caliper: std({ color: lin('#3a3c40'), roughness: .5, metalness: .4 }),
      caliperRed: std({ color: lin('#b0141a'), roughness: .35, metalness: .1 }),
      bedliner: std({ color: lin('#202020'), roughness: .97, normalMap: getTex('grille'), normalScale: new T.Vector2(.25, .25) }),
      shadow: new T.MeshBasicMaterial({ color: 0x000000, map: getTex('shadow'), transparent: true, opacity: .75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      wood: std({ color: lin('#ffffff'), map: getTex('wood'), roughness: .35, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
      mural: std({ color: lin('#ffffff'), map: getTex('mural'), roughness: .3, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
      rims: {
        steel: std({ color: lin('#b9bdc2'), roughness: .32, metalness: .75 }),
        alloy: std({ color: lin('#cfd3d8'), roughness: .2, metalness: 1 }),
        black: std({ color: lin('#141516'), roughness: .25, metalness: .6 }),
        chrome: std({ color: lin('#f0f0f0'), roughness: .04, metalness: 1 }),
        gold: std({ color: lin('#d6aa4c'), roughness: .18, metalness: 1 }),
        spinner: std({ color: lin('#f0f0f0'), roughness: .04, metalness: 1 })
      }
    };
    SH.tyre.normalScale.set(.8, .8);
    return SH;
  }

  /* ------------------------------------------------------------------ vehicle definitions (metres) */
  /* keys are [x, value]; x = +front. width/roof = half widths. bottom = sill/bumper underside, belt = shoulder (window base) line,
     top = centre-line top (hood/roof/deck). gh = greenhouse x range, ws = windshield range, rw = rear window on the top surface,
     side = side-glass x ranges, paintPillar = pillars in body colour (others blacked out), rearFace = upright rear glass on the tail. */
  const TYPES = {
    minivan: {
      L: 5.1, R: .36, tw: .235, axles: [1.57, -1.46], noseF: .42, noseR: .2, powF: 2.4, powR: 3, crown: .05, flare: .012,
      width: [[-2.55, .93], [-2.25, .975], [-1.5, .99], [1.2, .99], [2.0, .975], [2.55, .9]],
      bottom: [[-2.55, .42], [-2.3, .31], [-1.95, .24], [-1.0, .2], [1.0, .2], [2.05, .25], [2.35, .3], [2.55, .36]],
      belt: [[-2.55, 1.0], [-2.3, 1.04], [-1.6, 1.06], [0, 1.03], [1.1, .99], [1.5, .95], [2.1, .86], [2.55, .76]],
      top: [[-2.55, 1.6], [-2.4, 1.69], [-2.1, 1.73], [-1.5, 1.76], [-.4, 1.76], [.12, 1.71], [.45, 1.53], [.85, 1.31], [1.25, 1.08], [1.75, .99], [2.3, .9], [2.55, .8]],
      roof: [[-2.55, .84], [-2.0, .85], [0, .86], [.3, .87], [1.0, .93], [1.3, .955], [2.55, .9]],
      gh: [-2.42, 1.25], ws: [.2, 1.22], side: [[.12, 1.2], [-1.2, .02], [-2.3, -1.32]], pillar: 'gloss', rearFace: true, rearGlassY: [0, 9],
      clad: .3, archTrim: false,
      seams: [1.23, .07, -1.25], handles: [.22, -.07], slideTrack: [-1.27, -2.3], fuel: [-1.95],
      hl: { z: [.4, .955], yIn: [.67, .79], yOut: [.76, .9] }, grille: { z: .36, y: [.6, .73] }, intake: { z: .5, y: [.37, .53] }, platesF: [.41, .53],
      tl: { z: [.76, .985], y: [.86, 1.32] }, plateR: [.72, .86], cham: [.89, .92], stop: [1.57, 1.6],
      mirrorX: 1.12, rails: true, rearWiper: true, sticker: true, seats: [-.15, -1.1, -2.0], seatTop: 1.38
    },
    sedan: {
      L: 4.85, R: .335, tw: .225, axles: [1.43, -1.42], noseF: .38, noseR: .3, powF: 2.4, powR: 2.6, crown: .045, flare: .015,
      width: [[-2.425, .86], [-2.0, .91], [-1.2, .925], [1.0, .925], [1.9, .905], [2.425, .84]],
      bottom: [[-2.425, .42], [-2.2, .32], [-1.9, .22], [-1, .17], [1, .17], [2.0, .22], [2.3, .27], [2.425, .33]],
      belt: [[-2.425, .92], [-2.0, .98], [-1.2, .99], [0, .95], [1.0, .9], [1.8, .84], [2.425, .72]],
      top: [[-2.425, .93], [-2.2, .99], [-1.85, 1.0], [-1.65, 1.03], [-1.25, 1.24], [-.85, 1.42], [-.45, 1.45], [-.05, 1.4], [.45, 1.18], [.95, .96], [1.3, .92], [1.8, .86], [2.25, .8], [2.425, .74]],
      roof: [[-2.425, .82], [-1.9, .88], [-1.62, .86], [-1.0, .74], [-.5, .72], [0, .73], [.5, .8], [.95, .87], [1.5, .89], [2.425, .82]],
      gh: [-1.65, .95], ws: [0, .92], rw: [-1.62, -.88], side: [[.02, .93], [-.95, -.07]], paintPillar: [[-1.7, -.95]], pillar: 'gloss',
      clad: 0, archTrim: false,
      seams: [.95, -.02, -.98], handles: [.15, -.85], fuel: [-1.6],
      hl: { z: [.42, .965], yIn: [.63, .73], yOut: [.71, .84] }, grille: { z: .38, y: [.56, .7] }, intake: { z: .55, y: [.33, .48] }, platesF: [.38, .5],
      tl: { z: [.45, .99], y: [.82, .95] }, plateR: [.64, .78], cham: [.8, .83], stop: [1.4, 1.43],
      mirrorX: .86, seats: [-.25, -1.15], seatTop: 1.18
    },
    suv: {
      L: 4.7, R: .37, tw: .245, axles: [1.42, -1.37], noseF: .34, noseR: .2, powF: 2.6, powR: 3, crown: .05, flare: .028,
      width: [[-2.35, .9], [-2.05, .95], [1.3, .955], [2.0, .94], [2.35, .87]],
      bottom: [[-2.35, .5], [-2.1, .37], [-1.8, .27], [-1, .24], [1, .24], [1.9, .31], [2.2, .37], [2.35, .43]],
      belt: [[-2.35, 1.07], [-2.1, 1.12], [-1, 1.11], [0, 1.07], [.9, 1.03], [1.5, 1.0], [2.35, .9]],
      top: [[-2.35, 1.56], [-2.2, 1.66], [-1.9, 1.7], [-1.0, 1.72], [-.4, 1.72], [.05, 1.66], [.52, 1.4], [1.0, 1.13], [1.6, 1.08], [2.15, 1.02], [2.35, .95]],
      roof: [[-2.35, .82], [-2.0, .82], [0, .83], [.4, .86], [1.0, .92], [2.35, .88]],
      gh: [-2.2, 1.0], ws: [.1, .97], side: [[.05, .95], [-.95, -.03], [-2.0, -1.03]], pillar: 'gloss', rearFace: true, rearGlassY: [0, 9],
      clad: .4, archTrim: true,
      seams: [1.0, 0, -.98], handles: [.2, -.8], fuel: [-1.75],
      hl: { z: [.5, .955], yIn: [.82, .91], yOut: [.86, .98] }, grille: { z: .48, y: [.64, .86] }, intake: { z: .55, y: [.44, .58] }, platesF: [.47, .59],
      tl: { z: [.62, .99], y: [.95, 1.17] }, plateR: [.78, .92], cham: [.94, .97], stop: [1.56, 1.59],
      mirrorX: .95, rails: true, seats: [-.25, -1.2], seatTop: 1.38
    },
    hatch: {
      L: 4.2, R: .315, tw: .205, axles: [1.24, -1.36], noseF: .34, noseR: .22, powF: 2.4, powR: 2.8, crown: .045, flare: .012,
      width: [[-2.1, .84], [-1.85, .885], [1.0, .895], [1.7, .88], [2.1, .82]],
      bottom: [[-2.1, .44], [-1.9, .32], [-1.65, .21], [-1, .17], [1, .17], [1.6, .22], [1.95, .28], [2.1, .33]],
      belt: [[-2.1, .96], [-1.8, 1.0], [-1, .98], [0, .94], [.8, .88], [1.5, .82], [2.1, .71]],
      top: [[-2.1, 1.12], [-1.95, 1.3], [-1.75, 1.4], [-1.4, 1.46], [-.5, 1.48], [-.05, 1.45], [.42, 1.19], [.9, .93], [1.5, .86], [1.9, .8], [2.1, .73]],
      roof: [[-2.1, .76], [-1.7, .76], [0, .74], [.4, .78], [.9, .85], [2.1, .82]],
      gh: [-1.98, .92], ws: [0, .88], side: [[.02, .88], [-.85, -.06]], paintPillar: [[-2.0, -.85]], pillar: 'gloss', rearFace: true, rearGlassY: [1.0, 9],
      clad: 0, archTrim: false,
      seams: [.92, -.02, -.9], handles: [.12, -.75], fuel: [-1.45],
      hl: { z: [.45, .96], yIn: [.63, .72], yOut: [.7, .82] }, grille: { z: .4, y: [.54, .67] }, intake: { z: .55, y: [.33, .47] }, platesF: [.37, .48],
      tl: { z: [.62, .99], y: [.88, 1.03] }, plateR: [.66, .79], cham: [.81, .84], stop: [1.38, 1.41],
      mirrorX: .84, seats: [-.2, -1.05], seatTop: 1.2
    },
    pickup: {
      L: 5.6, R: .4, tw: .265, axles: [1.95, -1.75], noseF: .28, noseR: .12, powF: 3, powR: 4, crown: .04, flare: .035,
      width: [[-2.8, .97], [-2.6, .995], [2.2, 1.0], [2.6, .98], [2.8, .93]],
      bottom: [[-2.8, .62], [-2.6, .55], [-2.3, .43], [-1, .38], [1.2, .38], [2.4, .43], [2.8, .52]],
      belt: [[-2.8, 1.24], [-.7, 1.26], [0, 1.24], [1.0, 1.22], [1.6, 1.2], [2.8, 1.12]],
      top: [[-2.8, 1.28], [-.67, 1.28], [-.6, 1.31], [-.55, 1.78], [-.48, 1.9], [.1, 1.92], [.4, 1.88], [.78, 1.6], [1.15, 1.33], [2.0, 1.26], [2.6, 1.21], [2.8, 1.16]],
      roof: [[-2.8, .965], [-.68, .965], [-.6, .84], [-.4, .82], [.4, .84], [1.1, .95], [2.8, .95]],
      gh: [-.6, 1.15], ws: [.42, 1.12], rw: [-.6, -.49], rwY: [1.38, 1.8], side: [[.1, 1.1], [-.48, .02]], pillar: 'gloss',
      bed: [-2.74, -.66], bedFloor: .9,
      clad: 0, archTrim: true,
      seams: [1.15, .06, -.53, -.63], handles: [.3, -.36], fuel: [-1.2],
      hl: { z: [.62, .965], yIn: [.96, 1.1], yOut: [.96, 1.11] }, grille: { z: .6, y: [.76, 1.13], chrome: true }, intake: { z: .7, y: [.5, .66] }, platesF: [.53, .65],
      tl: { z: [.87, 1.0], y: [.96, 1.25] }, plateR: [.6, .73], bumperR: [.47, .76], stop: [1.82, 1.85],
      mirrorX: 1.02, seats: [-.05, -.45], seatTop: 1.6
    },
    workvan: {
      L: 5.4, R: .36, tw: .235, axles: [1.72, -1.6], noseF: .3, noseR: .1, powF: 3, powR: 4, crown: .05, flare: .015,
      width: [[-2.7, .97], [-2.5, 1.0], [1.6, 1.0], [2.3, .97], [2.7, .88]],
      bottom: [[-2.7, .5], [-2.45, .42], [-1, .3], [1.2, .3], [2.2, .36], [2.7, .42]],
      belt: [[-2.7, 1.1], [-1, 1.12], [.8, 1.1], [1.4, 1.05], [2.0, .98], [2.7, .86]],
      top: [[-2.7, 2.38], [-2.5, 2.47], [0, 2.48], [.45, 2.44], [.85, 2.24], [1.2, 1.76], [1.55, 1.28], [2.0, 1.12], [2.45, 1.0], [2.7, .92]],
      roof: [[-2.7, .9], [-2.4, .92], [.3, .92], [.9, .92], [1.5, .95], [2.7, .86]],
      gh: [-2.62, 1.58], ws: [.9, 1.55], side: [[.62, 1.5]], pillar: 'paint', rearFace: true, rearGlassY: [1.38, 2.0], rearGlassZ: .82,
      clad: .44, archTrim: false,
      seams: [1.58, .6, .45, -.85], handles: [.75, .32], slideTrack: [-.87, -2.5], slideY: 1.78, rearSplit: true,
      hl: { z: [.55, .95], yIn: [.78, .9], yOut: [.8, .94] }, grille: { z: .52, y: [.62, .8] }, intake: { z: .6, y: [.38, .5] }, platesF: [.4, .52],
      tl: { z: [.87, 1.0], y: [.72, 1.32] }, plateR: [.6, .74], stop: [2.32, 2.36],
      mirrorX: 1.45, seats: [.25], seatTop: 1.62, bulkhead: -.3
    }
  };

  /* ------------------------------------------------------------------ body loft */
  function makeProfile(S) {
    const P = { width: curve(S.width), bottom: curve(S.bottom), belt: curve(S.belt), top: curve(S.top), roof: curve(S.roof) };
    P.xF = S.L / 2; P.xR = -S.L / 2; P.Ra = S.R + .075;
    P.inR = (x, rs) => rs.some(r => x >= r[0] && x <= r[1]);
    /* wheel arch height at x (or null) */
    P.arch = (x, force) => {
      for (const ax of S.axles) {
        const dx = x - ax; if (force === false) continue;
        if (Math.abs(dx) < P.Ra || (force === true && Math.abs(dx) <= P.Ra + 1e-6)) return S.R + .02 + Math.sqrt(Math.max(0, P.Ra * P.Ra - dx * dx));
      }
      return null;
    };
    P.flareK = x => { let k = 0; for (const ax of S.axles) k = Math.max(k, 1 - sstep(P.Ra - .05, P.Ra + .3, Math.abs(x - ax))); return k; };
    return P;
  }
  /* control points of the right half cross-section at x */
  function ringAt(S, P, x, archForce) {
    const yb = P.bottom(x), ya = P.arch(x, archForce), yS = ya != null ? Math.max(yb, ya) : yb;
    const yBelt = P.belt(x), yTop = Math.max(P.top(x), yBelt + .015), w = P.width(x), fk = P.flareK(x) * S.flare;
    const wr = Math.min(P.roof(x), w - .015), g = yTop - yBelt;
    const y5 = yBelt + Math.min(.035, .15 * g), y7 = yTop - Math.min(S.crown, .45 * g), y6 = y7 - Math.min(.06, .2 * g);
    const zG = y => lerp(w - .012, wr, (y - yBelt) / Math.max(1e-4, y7 - yBelt));
    const inArch = ya != null && ya > yb + .01;
    const zU = inArch ? w - .36 : w - .16, yU = inArch ? yS : yb;
    const yMid = lerp(yS, yBelt, .42);
    const ctrl = [
      [[0, yb], [zU, yU]],
      [[zU, yU], [w - .04 + fk * .6, yS + .035], [w + .018 + fk, lerp(yS, yBelt, .25)], [w + .022 + fk * .4, yMid], [w, yBelt]],
      [[w, yBelt], [zG(y5) - .012, y5], [zG(y6), y6], [wr, y7]],
      [[wr, y7], [wr * .55, yTop - (yTop - y7) * .12], [0, yTop]]
    ];
    const counts = [[2], [2, 3, 3, 4], [1, 3, 1], [3, 3]], segBase = [0, 1, 4, 7];
    const ring = [];
    ctrl.forEach((C, gi) => {
      const n = C.length, tan = i => i === 0 ? [C[1][0] - C[0][0], C[1][1] - C[0][1]] : i === n - 1 ? [C[n - 1][0] - C[n - 2][0], C[n - 1][1] - C[n - 2][1]] : [(C[i + 1][0] - C[i - 1][0]) * .5, (C[i + 1][1] - C[i - 1][1]) * .5];
      for (let i = 0; i < n - 1; i++) {
        const m0 = tan(i), m1 = tan(i + 1), c = counts[gi][i], lin_ = gi === 0 || gi === 2;
        for (let k = 0; k < c; k++) {
          const t = k / c, t2 = t * t, t3 = t2 * t;
          const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
          const z = lin_ ? lerp(C[i][0], C[i + 1][0], t) : h00 * C[i][0] + h10 * m0[0] + h01 * C[i + 1][0] + h11 * m1[0];
          const y = lin_ ? lerp(C[i][1], C[i + 1][1], t) : h00 * C[i][1] + h10 * m0[1] + h01 * C[i + 1][1] + h11 * m1[1];
          ring.push({ z, y, seg: gi === 1 ? Math.min(3, 1 + i) : segBase[gi] + i, g: gi });
        }
      }
      ring.push({ z: C[n - 1][0], y: C[n - 1][1], seg: -1, g: gi, end: true });
    });
    return { ring, yBelt, yTop, y5, y6, y7, yS, w, wr, inArch };
  }
  function makeStations(S, P) {
    const st = [];
    const nose = (front) => {
      const Rx = front ? S.noseF : S.noseR, pw = front ? S.powF : S.powR, n = 12, out = [];
      for (let k = 0; k <= n; k++) {
        const th = (k / n) * Math.PI / 2, s = Math.pow(Math.sin(th), 2 / pw), dx = Rx * Math.pow(Math.cos(th), 2 / pw);
        out.push({ x: front ? P.xF - Rx + dx : P.xR + Rx - dx, s: Math.max(s, 0), nose: front ? 'f' : 'r' });
      }
      return front ? out.reverse() : out;
    };
    const rear = nose(false), front = nose(true);
    rear[rear.length - 1].s = 1; front[0].s = 1;
    const x0 = rear[rear.length - 1].x, x1 = front[0].x;
    const feat = [];
    for (let x = x0 + .09; x < x1 - .05; x += .09) feat.push(x);
    const edges = [S.gh, S.ws, S.rw, S.bed, ...(S.side || []), ...(S.paintPillar || [])].filter(Boolean);
    for (const e of edges) feat.push(e[0], e[1]);
    if (S.bed) for (let x = S.bed[1] + .02; x < S.bed[1] + .2; x += .035) feat.push(x);
    for (const ax of S.axles) for (let k = 1; k < 18; k++) feat.push(ax - P.Ra * Math.cos(k / 18 * Math.PI));
    const archE = []; for (const ax of S.axles) archE.push(ax - P.Ra, ax + P.Ra);
    let xs = feat.filter(x => x > x0 + .02 && x < x1 - .02 && !archE.some(e => Math.abs(x - e) < .02)).sort((a, b) => a - b);
    xs = xs.filter((x, i) => i === 0 || x - xs[i - 1] > .012);
    const mid = xs.map(x => ({ x, s: 1 }));
    for (const ax of S.axles) {
      const a = ax - P.Ra, b = ax + P.Ra;
      mid.push({ x: a, s: 1, arch: false, o: 0 }, { x: a, s: 1, arch: true, o: 1 }, { x: b, s: 1, arch: true, o: 0 }, { x: b, s: 1, arch: false, o: 1 });
    }
    mid.sort((p, q) => p.x - q.x || (p.o || 0) - (q.o || 0));
    st.push(...rear.slice(0, -1), rear[rear.length - 1], ...mid, front[0], ...front.slice(1));
    for (const s of st) { const r = ringAt(S, P, s.x, s.arch); Object.assign(s, r); }
    return st;
  }

  /* material of a body quad */
  function quadMat(S, P, st, q) {
    const { seg, x, y, s, nose, yS } = q;
    if (seg === 0) return 'under';
    if (S.bed && x > S.bed[0] && x < S.bed[1] && seg >= 5) return null;
    if (seg <= 3) {
      if (S.archTrim && P.arch(x) != null) { const a = P.arch(x); if (y < a + .07) return 'trim'; }
      if (S.archTrim) { for (const ax of S.axles) { const d = Math.hypot(x - ax, y - S.R - .02); if (d < P.Ra + .065 && d > P.Ra - .02 && y > S.R - .1) return 'trim'; } }
      if (S.clad && y < S.clad && !(nose && y > S.clad - .02)) return 'trim';
      if (nose && y < P.bottom(x) + .09) return 'trim';
      return y < q.twoY ? 'paint2' : 'paint';
    }
    const inGh = x >= S.gh[0] && x <= S.gh[1];
    const pillarMat = S.paintPillar && P.inR(x, S.paintPillar) ? 'paint' : (S.pillar === 'paint' ? 'paint' : 'gloss');
    if (nose === 'r' && S.rearFace) {
      const inY = y > S.rearGlassY[0] && y < S.rearGlassY[1] && (!S.rearGlassZ || q.zAbs < S.rearGlassZ * P.width(x));
      if (seg === 5 && s < .93 && inY) return 'glass';
      if ((seg === 4 || seg === 6) && s < .97) return S.pillar === 'paint' ? 'paint' : 'gloss';
      if (seg === 5 && s >= .93) return pillarMat === 'paint' ? 'paint' : 'gloss';
      if (seg === 5) return 'paint';
    }
    if (seg === 4 || seg === 6 || seg === 5) {
      if (!inGh || nose) return 'paint';
      const nearGlass = (S.side || []).some(r => x > r[0] - .1 && x < r[1] + .1) || (x > S.ws[0] - .1);
      if (seg === 5) return (S.side || []).some(r => x >= r[0] && x <= r[1]) ? 'glass' : pillarMat;
      return nearGlass ? 'gloss' : pillarMat;
    }
    /* roof / hood / deck */
    if (x >= S.ws[0] && x <= S.ws[1] && !nose) return 'glass';
    if (S.rw && x >= S.rw[0] && x <= S.rw[1] && (!S.rwY || (y > S.rwY[0] && y < S.rwY[1]))) return 'glass';
    return 'paint';
  }

  function buildBody(S, P, st, B, opt) {
    const NS = st.length, NR = st[0].ring.length;
    const G = []; /* G[i][j] = [x,y,z] right half */
    for (let i = 0; i < NS; i++) { const row = []; for (let j = 0; j < NR; j++) { const r = st[i].ring[j]; row.push([st[i].x, r.y, r.z * st[i].s]); } G.push(row); }
    const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7 && Math.abs(a[2] - b[2]) < 1e-7;
    const N = [];
    for (let i = 0; i < NS; i++) {
      const row = [];
      const ip = i > 0 && Math.abs(st[i - 1].x - st[i].x) > 1e-6 ? i - 1 : i, inx = i < NS - 1 && Math.abs(st[i + 1].x - st[i].x) > 1e-6 ? i + 1 : i;
      for (let j = 0; j < NR; j++) {
        let jp = j - 1, jn = j + 1;
        if (jp < 0 || st[i].ring[j - 1].end) jp = j; if (jn >= NR || st[i].ring[j].end) jn = j;
        let tj = sub(G[i][jn], G[i][jp]);
        if (Math.hypot(...tj) < 1e-7) tj = [0, 1, 0];
        let ti = sub(G[inx][j], G[ip][j]); if (Math.hypot(...ti) < 1e-7) ti = [1, 0, 0];
        let n = nrm(cross(ti, tj));
        if (st[i].s < .02) { n = [st[i].nose === 'f' ? 1 : -1, 0, 0]; }
        row.push(n);
      }
      N.push(row);
    }
    /* per-vertex grime/occlusion: darker low down and inside the wheel arches */
    const shade = (p, i) => {
      let c = 1 - .22 * (1 - sstep(.15, .62, p[1]));
      if (st[i].inArch) c *= .85;
      return c;
    };
    const twoY = opt.twoY;
    for (let i = 0; i < NS - 1; i++) {
      const dupX = Math.abs(st[i + 1].x - st[i].x) < 1e-6;
      for (let j = 0; j < NR - 1; j++) {
        if (st[i].ring[j].end) continue;
        const a = G[i][j], b = G[i + 1][j], c = G[i + 1][j + 1], d = G[i][j + 1];
        if (same(a, b) && same(d, c)) continue;
        const cx = (a[0] + b[0] + c[0] + d[0]) / 4, cy = (a[1] + b[1] + c[1] + d[1]) / 4, cz = (a[2] + b[2] + c[2] + d[2]) / 4;
        const nose = st[i].nose && st[i + 1].nose ? st[i].nose : (st[i].nose === 'f' || st[i + 1].nose === 'f') && st[i].s + st[i + 1].s < 1.99 ? 'f' : (st[i].nose === 'r' || st[i + 1].nose === 'r') && st[i].s + st[i + 1].s < 1.99 ? 'r' : null;
        const k = quadMat(S, P, st, { seg: st[i].ring[j].seg, x: cx, y: cy, s: Math.min(st[i].s, st[i + 1].s), nose, zAbs: cz, twoY });
        if (!k) continue;
        let na = N[i][j], nb = N[i + 1][j], nc = N[i + 1][j + 1], nd = N[i][j + 1];
        if (dupX) { const fn = nrm(cross(sub(c, a), sub(d, b))); na = nb = nc = nd = Math.hypot(...cross(sub(c, a), sub(d, b))) > 1e-9 ? fn : [0, 0, 1]; }
        const uvs = [[a[0] / 2, a[1] / 2], [b[0] / 2, b[1] / 2], [c[0] / 2, c[1] / 2], [d[0] / 2, d[1] / 2]];
        const V = [[a, na, uvs[0], shade(a, i)], [b, nb, uvs[1], shade(b, i + 1)], [c, nc, uvs[2], shade(c, i + 1)], [d, nd, uvs[3], shade(d, i)]];
        /* right half: (a,b,c,d) runs +x then +ring, which faces outward for this parametrisation */
        B.quad(k, V[0], V[1], V[2], V[3]);
        const M = v => [[v[0][0], v[0][1], -v[0][2]], [v[1][0], v[1][1], -v[1][2]], v[2], v[3]];
        B.quad(k, M(V[0]), M(V[3]), M(V[2]), M(V[1]));
        /* cabin liner: the same surface seen from inside, pushed in 2.5 cm, so the windows show a dark interior instead of the far side */
        if (k !== 'under' && st[i].ring[j].seg >= 3 && !st[i].nose && !(S.bed && cx < S.bed[1] + .02) && cx > S.gh[0] - .05 && cx < S.gh[1] + .15) {
          const In = v => [[v[0][0] - v[1][0] * .025, v[0][1] - v[1][1] * .025, v[0][2] - v[1][2] * .025], [-v[1][0], -v[1][1], -v[1][2]], v[2], .55];
          const L = V.map(In);
          B.quad('interior', L[0], L[3], L[2], L[1]);
          B.quad('interior', M(L[0]), M(L[1]), M(L[2]), M(L[3]));
        }
      }
    }
    return { G, N };
  }

  /* ------------------------------------------------------------------ surface lookups for projected parts */
  function makeSurf(S, P, st) {
    const sideRange = (s) => { let a = -1, b = -1; s.ring.forEach((r, j) => { if (r.g === 1 && a < 0) a = j; if (r.g === 2 && r.end) b = j; }); return [a, b]; };
    const [ja, jb] = sideRange(st[0]);
    const zSideAt = (s, y) => {
      const R = s.ring; let prev = null;
      for (let j = ja; j <= jb; j++) {
        const r = R[j]; if (prev && r.y >= y && prev.y <= y && r.y - prev.y > 1e-6) return lerp(prev.z, r.z, (y - prev.y) / (r.y - prev.y)) * s.s;
        if (!prev || r.y > prev.y) prev = r;
      }
      return (y < R[ja].y ? R[ja].z : R[jb].z) * s.s;
    };
    let jt0 = -1; st[0].ring.forEach((r, j) => { if (r.g === 2 && jt0 < 0) jt0 = j; });
    const yTopAt = (s, z) => { /* height of the upper surface at |z| */
      const R = s.ring; z = Math.abs(z);
      for (let j = jt0; j < R.length - 1; j++) { const a = R[j], b = R[j + 1]; const za = a.z * s.s, zb = b.z * s.s; if (za >= z && zb <= z && za - zb > 1e-6) return lerp(a.y, b.y, (za - z) / (za - zb)); }
      return R[R.length - 1].y;
    };
    const mids = st.filter(s => s.s > .999);
    const bracket = (x) => {
      let i = 0; while (i < st.length - 2 && st[i + 1].x <= x) i++;
      let i1 = i + 1; while (i1 < st.length - 1 && Math.abs(st[i1].x - st[i].x) < 1e-6) i1++;
      const t = clamp((x - st[i].x) / Math.max(1e-6, st[i1].x - st[i].x), 0, 1); return [st[i], st[i1], t];
    };
    const sideP = (x, y) => { const [a, b, t] = bracket(x); return [x, y, lerp(zSideAt(a, y), zSideAt(b, y), t)]; };
    const topP = (x, z) => { const [a, b, t] = bracket(x); return [x, lerp(yTopAt(a, z), yTopAt(b, z), t), z]; };
    const fr = st.filter(s => s.nose === 'f' || s === mids[mids.length - 1]).sort((a, b) => a.x - b.x);
    const rr = st.filter(s => s.nose === 'r' || s === mids[0]).sort((a, b) => b.x - a.x);
    const endP = (list, z, y) => {
      const sg = Math.sign(z) || 1; z = Math.abs(z);
      let pz = zSideAt(list[0], y), px = list[0].x;
      if (z >= pz) return [px, y, pz * sg];
      for (let i = 1; i < list.length; i++) { const cz = zSideAt(list[i], y), cx = list[i].x; if (cz <= z) { const t = (pz - z) / Math.max(1e-6, pz - cz); return [lerp(px, cx, t), y, z * sg]; } pz = cz; px = cx; }
      return [list[list.length - 1].x, y, z * sg];
    };
    const e = .004;
    const withN = (f, a, b, flip) => { const p = f(a, b), pa = sub(f(a + e, b), f(a - e, b)), pb = sub(f(a, b + e), f(a, b - e)); let n = nrm(cross(pa, pb)); if (flip) n = n.map(v => -v); return { p, n }; };
    return {
      side: (x, y) => withN(sideP, x, y, false),          /* right side, normal +z */
      top: (x, z) => withN(topP, x, z, true),             /* normal +y */
      front: (z, y) => withN((zz, yy) => endP(fr, zz, yy), z, y, true),  /* normal +x */
      rear: (z, y) => withN((zz, yy) => endP(rr, zz, yy), z, y, false),  /* normal -x */
      zSideAt, yTopAt, bracket
    };
  }
  /* projected patch: map(u,v) -> {p,n}; emits a grid offset along the normal */
  function patch(B, key, map, nu, nv, off, opt = {}) {
    const g = [];
    for (let i = 0; i <= nu; i++) { const row = []; for (let j = 0; j <= nv; j++) { const s = map(i / nu, j / nv); row.push({ p: [s.p[0] + s.n[0] * off, s.p[1] + s.n[1] * off, s.p[2] + s.n[2] * off], n: s.n, uv: [opt.flipU ? 1 - i / nu : i / nu, j / nv] }); } g.push(row); }
    const emit = (mz) => {
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
        const q = [g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]].map(v => [[v.p[0], v.p[1], v.p[2] * mz], [v.n[0], v.n[1], v.n[2] * mz], mz < 0 ? [1 - v.uv[0], v.uv[1]] : v.uv, opt.shade || 1]);
        const fn = cross(sub(q[2][0], q[0][0]), sub(q[3][0], q[1][0])), avg = [q[0][1][0] + q[2][1][0], q[0][1][1] + q[2][1][1], q[0][1][2] + q[2][1][2]];
        if (fn[0] * avg[0] + fn[1] * avg[1] + fn[2] * avg[2] >= 0) B.quad(key, q[0], q[1], q[2], q[3]); else B.quad(key, q[0], q[3], q[2], q[1]);
      }
    };
    emit(1); if (opt.mirror) emit(-1);
    /* optional raised rim/edge: walls down to the surface so thick parts read as solid */
    if (opt.depth) {
      const ring = []; for (let i = 0; i <= nu; i++) ring.push(g[i][0]); for (let j = 1; j <= nv; j++) ring.push(g[nu][j]); for (let i = nu - 1; i >= 0; i--) ring.push(g[i][nv]); for (let j = nv - 1; j > 0; j--) ring.push(g[0][j]);
      const emitW = (mz) => { for (let k = 0; k < ring.length; k++) { const a = ring[k], b = ring[(k + 1) % ring.length];
        const dn = v => [v.p[0] - v.n[0] * opt.depth, v.p[1] - v.n[1] * opt.depth, (v.p[2] - v.n[2] * opt.depth)];
        const P4 = [a.p, b.p, dn(b), dn(a)].map(p => [p[0], p[1], p[2] * mz]);
        const fn = nrm(cross(sub(P4[1], P4[0]), sub(P4[3], P4[0])));
        B.quad(opt.depthKey || key, [P4[0], fn, [0, 0]], [P4[3], fn, [0, 0]], [P4[2], fn, [0, 0]], [P4[1], fn, [0, 0]]);
        B.quad(opt.depthKey || key, [P4[0], fn.map(v => -v), [0, 0]], [P4[1], fn.map(v => -v), [0, 0]], [P4[2], fn.map(v => -v), [0, 0]], [P4[3], fn.map(v => -v), [0, 0]]); } };
      emitW(1); if (opt.mirror) emitW(-1);
    }
  }

  /* ------------------------------------------------------------------ wheels */
  const WGEO = {};
  function tyreGeo(R, W) {
    const key = 't' + R + '|' + W; if (WGEO[key]) return WGEO[key];
    const Rr = R * .63, h = W / 2, pts = [];
    /* profile from the inner bead across the tread to the outer bead (radius, axial) */
    const prof = [[Rr + .005, -h + .012], [Rr + .02, -h], [lerp(Rr, R, .45), -h - .006], [lerp(Rr, R, .8), -h - .002], [R - .018, -h + .008], [R - .004, -h + .025]];
    const tread = [];
    for (let k = 0; k <= 8; k++) { const a = lerp(-h + .04, h - .04, k / 8); tread.push([R - (k % 2 === 1 && k !== 1 && k !== 7 ? 0 : 0), a]); }
    const full = [...prof, ...tread, ...prof.slice().reverse().map(p => [p[0], -p[1]])];
    for (const p of full) pts.push(new T.Vector2(p[0], p[1]));
    const g = new T.LatheGeometry(pts, 44);
    /* lathe v follows the point index; remap so the tread normal map only covers the tread */
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { const v = uv.getY(i), idx = Math.round(v * (full.length - 1)); const tv = idx < prof.length ? 0 : idx >= prof.length + tread.length ? 1 : (idx - prof.length) / (tread.length - 1); uv.setXY(i, uv.getX(i), idx < prof.length || idx >= prof.length + tread.length ? .5 + (idx < prof.length ? -.49 : .49) : .1 + tv * .8); }
    g.rotateX(Math.PI / 2); g.computeVertexNormals();
    return WGEO[key] = g;
  }
  function rimGeo(R, W, style) {
    const key = 'r' + R + '|' + W + '|' + style; if (WGEO[key]) return WGEO[key];
    const Rr = R * .63, h = W / 2, face = h - .028, parts = [];
    const spokes = { steel: 0, alloy: 5, black: 10, chrome: 5, gold: 6, spinner: 7 }[style] ?? 5;
    const outer = new T.Shape(); outer.absarc(0, 0, Rr - .006, 0, Math.PI * 2, false);
    const hub = Rr * .3, rin = Rr * .84;
    if (style === 'steel') {
      /* hubcap: domed plastic disc with slots */
      for (let k = 0; k < 10; k++) {
        const a0 = k / 10 * Math.PI * 2 + .1, a1 = a0 + .38, hole = new T.Path(), n = 6;
        for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); hole.lineTo(Math.cos(a) * rin * .96, Math.sin(a) * rin * .96); }
        for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n); hole.lineTo(Math.cos(a) * rin * .78, Math.sin(a) * rin * .78); }
        outer.holes.push(hole);
      }
    } else {
      const sw = style === 'black' ? .028 : style === 'spinner' ? .022 : .05;
      for (let k = 0; k < spokes; k++) {
        const a0 = k / spokes * Math.PI * 2, a1 = (k + 1) / spokes * Math.PI * 2, hole = new T.Path(), n = 10;
        const pad = r => Math.asin(Math.min(.95, (sw / 2 + (style === 'black' ? 0 : .004)) / r));
        for (let i = 0; i <= n; i++) { const a = lerp(a0 + pad(rin), a1 - pad(rin), i / n); hole.lineTo(Math.cos(a) * rin, Math.sin(a) * rin); }
        const rh = hub * 1.15;
        for (let i = n; i >= 0; i--) { const a = lerp(a0 + pad(rh) * 1.6, a1 - pad(rh) * 1.6, i / n); hole.lineTo(Math.cos(a) * rh, Math.sin(a) * rh); }
        outer.holes.push(hole);
      }
    }
    const disc = new T.ExtrudeGeometry(outer, { depth: .022, bevelEnabled: true, bevelThickness: .008, bevelSize: .006, bevelSegments: 2, curveSegments: 40 });
    /* dish the face: centre pushed out, spokes curve back toward the rim */
    const P = disc.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), r = Math.hypot(x, y); P.setZ(i, P.getZ(i) + (style === 'steel' ? .025 * (1 - (r / Rr) ** 2) : .03 * (1 - r / Rr))); }
    disc.computeVertexNormals(); disc.translate(0, 0, face - .045); parts.push(disc);
    /* barrel + lip */
    const lip = new T.LatheGeometry([new T.Vector2(Rr - .03, -h + .02), new T.Vector2(Rr - .012, -h + .02), new T.Vector2(Rr - .012, face - .01), new T.Vector2(Rr + .012, face + .004), new T.Vector2(Rr + .016, face + .012), new T.Vector2(Rr - .004, face + .014)], 44);
    lip.rotateX(Math.PI / 2); parts.push(lip);
    const cap = new T.CylinderGeometry(hub * .55, hub * .62, .02, 20); cap.rotateX(Math.PI / 2); cap.translate(0, 0, face + .008); parts.push(cap);
    if (style !== 'steel') for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + .3, nut = new T.CylinderGeometry(.011, .011, .02, 6); nut.rotateX(Math.PI / 2); nut.translate(Math.cos(a) * hub * .8, Math.sin(a) * hub * .8, face - .005); parts.push(nut); }
    const g = mergeGeos(parts); return WGEO[key] = g;
  }
  function brakeGeo(R, W) {
    const key = 'b' + R + '|' + W; if (WGEO[key]) return WGEO[key];
    const Rr = R * .63, d = new T.CylinderGeometry(Rr * .78, Rr * .78, .026, 32); d.rotateX(Math.PI / 2); d.translate(0, 0, W / 2 - .1);
    const hub = new T.CylinderGeometry(Rr * .3, Rr * .3, .06, 16); hub.rotateX(Math.PI / 2); hub.translate(0, 0, W / 2 - .11);
    return WGEO[key] = mergeGeos([d, hub]);
  }
  function caliperGeo(R, W) {
    const key = 'c' + R + '|' + W; if (WGEO[key]) return WGEO[key];
    const Rr = R * .63, c = rbox(.11, .07, .06, .018, 2); c.translate(0, Rr * .68, W / 2 - .1);
    c.rotateZ(.55); return WGEO[key] = c;
  }
  function mergeGeos(list) {
    const P = [], N = [], U = [];
    for (let g of list) { g = g.index ? g.toNonIndexed() : g; if (!g.attributes.normal) g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); U.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.computeBoundingSphere(); return g;
  }

  /* ------------------------------------------------------------------ the vehicle */
  const PLATES = ['DAD 4LYF', 'GRL DAD', 'BBQ KING', 'MOW 2DAY', '7GT 482', '4KD 119', 'RT 66 DAD', 'HOA OK', 'CUL DSAC', '2FUN 4U', 'LWN CARE', 'DIY GUY'];
  let plateN = 0;

  function make(type, opts = {}) {
    const S = TYPES[type] || TYPES.sedan; type = TYPES[type] ? type : 'sedan';
    const P = makeProfile(S), st = makeStations(S, P), surf = makeSurf(S, P, st), sh = shared();
    const up0 = Object.assign({}, opts.upgrades || {});
    const root = new T.Group(); root.name = 'vehicle_' + type;
    const body = new T.Group(); body.name = 'body'; root.add(body);
    const ud = root.userData;

    /* per-vehicle materials */
    const paint = new T.MeshPhysicalMaterial({ color: lin('#888'), roughness: .3, metalness: .5, clearcoat: 1, clearcoatRoughness: .05, vertexColors: true });
    const paint2 = new T.MeshPhysicalMaterial({ color: lin('#888'), roughness: .3, metalness: .5, clearcoat: 1, clearcoatRoughness: .05, vertexColors: true });
    const glass = new T.MeshPhysicalMaterial({ color: lin('#1a2228'), roughness: .03, metalness: .25, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .6, envMapIntensity: 1.6 });
    const headLens = new T.MeshStandardMaterial({ color: lin('#c8cdd2'), roughness: .08, metalness: .95, emissive: lin('#fff1dc'), emissiveIntensity: 0 });
    const tail = new T.MeshStandardMaterial({ color: lin('#7a0a0a'), roughness: .15, metalness: .3, emissive: lin('#ff1608'), emissiveIntensity: .12 });
    const brake = new T.MeshStandardMaterial({ color: lin('#8a0b0b'), roughness: .15, metalness: .3, emissive: lin('#ff1608'), emissiveIntensity: .12 });
    const reverse = new T.MeshStandardMaterial({ color: lin('#d8d8d8'), roughness: .1, metalness: .8, emissive: lin('#ffffff'), emissiveIntensity: 0 });
    const bar = new T.MeshStandardMaterial({ color: lin('#ffb347'), roughness: .2, metalness: .1, emissive: lin('#ffa020'), emissiveIntensity: .3 });
    const barW = new T.MeshStandardMaterial({ color: lin('#f4f4f4'), roughness: .2, metalness: .1, emissive: lin('#ffffff'), emissiveIntensity: .3 });
    const sticker = new T.MeshStandardMaterial({ color: lin('#ffffff'), roughness: .45, map: S.sticker ? getTex('soccer') : null, transparent: !S.sticker, opacity: S.sticker ? 1 : 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const plateF = new T.MeshStandardMaterial({ color: lin('#ffffff'), roughness: .35, metalness: .2, map: plateTex(opts.plate || PLATES[plateN++ % PLATES.length]) });
    const mats = Object.assign({}, sh, { paint, paint2, glass, headLens, tail, brake, reverse, plate: plateF, sticker, bar, barW });

    const B = new Buckets();
    const twoY = (up0.paint === 'twotone') ? lerp(P.bottom(0), P.belt(0), .5) : -1;
    buildBody(S, P, st, B, { twoY: -1 });
    const R = S.R, xF = P.xF, xR = P.xR;

    /* --- front fascia */
    const fz = (z, y) => surf.front(z, y), rz = (z, y) => surf.rear(z, y);
    const wF = P.width(xF - S.noseF), wRr = P.width(xR + S.noseR);
    const hl = S.hl;
    const hlMap = (u, v) => { const z = lerp(hl.z[0], hl.z[1], u) * wF, y0 = lerp(hl.yIn[0], hl.yOut[0], u), y1 = lerp(hl.yIn[1], hl.yOut[1], u); return fz(z, lerp(y0, y1, v)); };
    patch(B, 'gloss', (u, v) => { const z = lerp(hl.z[0] - .015, Math.min(1.01, hl.z[1] + .012), u) * wF, y0 = lerp(hl.yIn[0], hl.yOut[0], u) - .012, y1 = lerp(hl.yIn[1], hl.yOut[1], u) + .012; return fz(z, lerp(y0, y1, v)); }, 10, 3, .003, { mirror: true });
    patch(B, 'headLens', hlMap, 12, 4, .009, { mirror: true, depth: .006, depthKey: 'chrome' });
    /* DRL strip along the lower edge of the lamp, and an amber corner */
    patch(B, 'drl', (u, v) => { const z = lerp(hl.z[0] + .04, hl.z[1] - .01, u) * wF, y0 = lerp(hl.yIn[0], hl.yOut[0], u); return fz(z, y0 + .008 + v * .014); }, 12, 1, .012, { mirror: true });
    patch(B, 'amber', (u, v) => { const z = lerp(hl.z[1] - .05, hl.z[1] - .005, u) * wF, y0 = lerp(hl.yIn[0], hl.yOut[0], .95), y1 = lerp(hl.yIn[1], hl.yOut[1], .95); return fz(z, lerp(y0 + .02, y1 - .01, v)); }, 2, 2, .011, { mirror: true });
    /* grille with chrome or gloss surround */
    const gr = S.grille;
    patch(B, gr.chrome ? 'chrome' : 'gloss', (u, v) => fz(lerp(-gr.z - .025, gr.z + .025, u) * wF, lerp(gr.y[0] - .02, gr.y[1] + .015, v)), 14, 4, .004, { depth: .004 });
    patch(B, 'grille', (u, v) => { const p = fz(lerp(-gr.z, gr.z, u) * wF, lerp(gr.y[0], gr.y[1], v)); return p; }, 14, 4, .009);
    if (gr.chrome) for (let k = 1; k < 4; k++) { const yy = lerp(gr.y[0], gr.y[1], k / 4); patch(B, 'chrome', (u, v) => fz(lerp(-gr.z, gr.z, u) * wF, yy - .012 + v * .024), 14, 1, .014); }
    const it = S.intake;
    patch(B, 'grille', (u, v) => fz(lerp(-it.z, it.z, u) * wF, lerp(it.y[0], it.y[1], v)), 14, 3, .002);
    patch(B, 'gloss', (u, v) => fz(lerp(-it.z - .02, it.z + .02, u) * wF, lerp(it.y[0] - .015, it.y[0], v)), 14, 1, .003);
    /* fog lamps */
    for (const sgn of [1, -1]) { const z = (it.z + .13) * wF * sgn, y = lerp(it.y[0], it.y[1], .5), c = fz(z, y), m = frameAt(c.p, c.n);
      const ring = new T.CylinderGeometry(.05, .055, .03, 18); ring.rotateX(Math.PI / 2); B.geo('gloss', ring, m);
      const lens = new T.CylinderGeometry(.038, .038, .034, 18); lens.rotateX(Math.PI / 2); B.geo('headLens', lens, m); }
    /* front plate */
    const pf = S.platesF;
    patch(B, 'plate', (u, v) => fz(lerp(.15, -.15, u), lerp(pf[0], pf[1], v)), 4, 2, .018, { depth: .012, depthKey: 'trim' });

    /* --- tail */
    const tl = S.tl;
    const tlMap = (u, v) => rz(lerp(tl.z[0], tl.z[1], u) * wRr, lerp(tl.y[0], tl.y[1], v));
    patch(B, 'tail', tlMap, 8, 6, .009, { mirror: true, depth: .006, depthKey: 'gloss' });
    patch(B, 'brake', (u, v) => rz(lerp(tl.z[0] + (tl.z[1] - tl.z[0]) * .15, tl.z[1] - (tl.z[1] - tl.z[0]) * .1, u) * wRr, lerp(tl.y[0], tl.y[1], .55 + v * .3)), 6, 2, .013, { mirror: true });
    patch(B, 'reverse', (u, v) => rz(lerp(tl.z[0] + (tl.z[1] - tl.z[0]) * .15, tl.z[1] - (tl.z[1] - tl.z[0]) * .1, u) * wRr, lerp(tl.y[0], tl.y[1], .12 + v * .2)), 4, 1, .013, { mirror: true });
    /* centre high-mount stop lamp */
    patch(B, 'brake', (u, v) => rz(lerp(-.22, .22, u), lerp(S.stop[0], S.stop[1], v)), 6, 1, .012);
    /* rear plate + recess, chrome handle bar */
    const pr = S.plateR;
    patch(B, 'trim', (u, v) => rz(lerp(-.2, .2, u), lerp(pr[0] - .03, pr[1] + .03, v)), 4, 2, .002);
    patch(B, 'plate', (u, v) => rz(lerp(-.155, .155, u), lerp(pr[0], pr[1], v)), 4, 2, .01, { depth: .006, depthKey: 'trim' });
    if (S.cham) patch(B, 'chrome', (u, v) => rz(lerp(-.32, .32, u), lerp(S.cham[0], S.cham[1], v)), 8, 1, .008, { depth: .006 });
    if (S.bumperR) patch(B, 'chrome', (u, v) => rz(lerp(-.995, .995, u) * P.width(xR), lerp(S.bumperR[0], S.bumperR[1], v)), 18, 3, .03, { depth: .03 });
    /* rear reflectors low on the bumper */
    patch(B, 'reflector', (u, v) => rz(lerp(.62, .86, u) * wRr, lerp(P.bottom(xR + .1) + .1, P.bottom(xR + .1) + .125, v)), 3, 1, .006, { mirror: true });
    /* parts.rear: sticker slot on the tailgate, left of the plate */
    const stickerB = new Buckets();
    const sy = (S.plateR[0] + S.plateR[1]) / 2;
    patch(stickerB, 'sticker', (u, v) => rz(lerp(-.78, -.38, u), lerp(sy - .05, sy + .05, v)), 6, 1, .011);

    /* --- side details: door seams, handles, sliding track, fuel door, side markers */
    const beltAt = x => P.belt(x);
    const sideLow = x => { const a = P.arch(x); return (a != null ? a : P.bottom(x)) + .06; };
    for (const sx of S.seams) {
      const yb = Math.max(sideLow(sx), S.clad ? S.clad + .01 : 0), yt = (x => { const s = surf.bracket(x)[0]; return s.y7 - .01; })(sx);
      patch(B, 'seam', (u, v) => surf.side(sx - .0035 + u * .007, lerp(yb, yt, v)), 1, 8, .0015, { mirror: true });
    }
    for (const hx of S.handles) {
      const y = beltAt(hx) - .1, c = surf.side(hx, y), m = frameAt(c.p, c.n);
      const g = rbox(.2, .035, .03, .012, 2); B.geo('chrome', g, m);
      const cup = rbox(.19, .06, .01, .004, 1); cup.translate(0, -.004, -.008); B.geo('gloss', cup, m);
      const mm = frameAt([c.p[0], c.p[1], -c.p[2]], [c.n[0], c.n[1], -c.n[2]]); B.geo('chrome', g, mm); B.geo('gloss', cup, mm);
    }
    if (S.slideTrack) {
      const yOf = S.slideY ? (() => S.slideY) : (x => beltAt(x) - .025);
      patch(B, 'seam', (u, v) => { const x = lerp(S.slideTrack[0], S.slideTrack[1], u); return surf.side(x, yOf(x) - .012 + v * .024); }, 16, 1, .002, { mirror: true });
      patch(B, 'satin', (u, v) => { const x = lerp(S.slideTrack[0], S.slideTrack[1], u); return surf.side(x, yOf(x) - .003 + v * .006); }, 16, 1, .004);
    }
    if (S.fuel) for (const fx of S.fuel) {
      const y = beltAt(fx) - .17, w = .085, h = .07;
      for (const [a0, a1, b0, b1] of [[-w, w, -h, -h + .006], [-w, w, h - .006, h], [-w, -w + .006, -h, h], [w - .006, w, -h, h]])
        patch(B, 'seam', (u, v) => surf.side(fx + lerp(a0, a1, u), y + lerp(b0, b1, v)), 1, 1, .0015);
    }
    patch(B, 'amber', (u, v) => surf.side(lerp(xF - S.noseF - .12, xF - S.noseF - .02, u), lerp(-.018, .018, v) + P.belt(xF - S.noseF) - .1), 2, 1, .004, { mirror: true, depth: .004, depthKey: 'gloss' });
    patch(B, 'reflector', (u, v) => surf.side(lerp(xR + S.noseR + .03, xR + S.noseR + .13, u), lerp(-.015, .015, v) + P.belt(xR + S.noseR) - .2), 2, 1, .004, { mirror: true });
    /* hood shut lines */
    const cowl = S.ws[1] + .04;
    if (!S.bed || true) {
      const wr = P.roof(cowl + .1);
      patch(B, 'seam', (u, v) => surf.top(cowl + .02 + v * .006, lerp(-wr + .05, wr - .05, u)), 10, 1, .002);
      patch(B, 'seam', (u, v) => { const x = lerp(cowl + .02, xF - S.noseF * .3, u); return surf.top(x, P.roof(x) - .03 - v * .006); }, 10, 1, .002, { mirror: true });
    }
    /* cowl panel + wipers */
    patch(B, 'trim', (u, v) => { const x = S.ws[1] + .005 + v * .055, w = P.roof(x) - .03; return surf.top(x, lerp(-w, w, u)); }, 12, 1, .003);
    for (const zs of [-.08, .52]) {
      const x0 = S.ws[1] - .02, c = surf.top(x0, zs), m = frameAt(c.p, c.n, [1, 0, 0]);
      const arm = rbox(.62, .016, .012, .005, 1); arm.translate(-.31, 0, .01); arm.rotateZ(Math.PI); const mm = m.clone().multiply(M4().makeRotationZ(-1.62 + (zs > 0 ? .08 : -.05)));
      B.geo('rubber', arm, mm);
    }
    if (S.rearWiper) {
      const c = rz(0, S.stop[0] - .38), m = frameAt(c.p, c.n);
      const arm = rbox(.04, .42, .012, .005, 1); arm.translate(0, .19, .01); B.geo('rubber', arm, m.clone().multiply(M4().makeRotationZ(-1.25)));
    }

    /* --- mirrors */
    {
      const mx = S.mirrorX, my = P.belt(mx) + .09, c = surf.side(mx, my);
      for (const sg of [1, -1]) {
        const p = [c.p[0], c.p[1], c.p[2] * sg];
        const shell = rbox(.17, .14, .25, .05, 3); shell.translate(0, 0, .17);
        const m = M4().makeTranslation(p[0] - .02, p[1], p[2]).multiply(M4().makeRotationY(sg > 0 ? -.08 : .08)).multiply(M4().makeScale(1, 1, sg));
        B.geo('paint', shell, m);
        const arm = rbox(.08, .05, .09, .015, 1); arm.translate(.0, -.03, .045); B.geo('gloss', arm, m);
        const glassM = rbox(.012, .11, .21, .03, 2); glassM.translate(-.085, 0, .17); B.geo('chrome', glassM, m);
        const sig = rbox(.03, .012, .12, .005, 1); sig.translate(.07, -.05, .2); B.geo('amber', sig, m);
      }
    }
    /* --- roof rails (stock on minivan/SUV) */
    const roofParts = new T.Group(); roofParts.name = 'roofRails'; body.add(roofParts);
    const railZ = (x) => P.roof(x) * .82;
    const railX0 = S.gh[0] + .15, railX1 = (S.ws[0] + S.gh[0]) / 2 + (S.ws[0] - S.gh[0]) * .38;
    const roofY = (x, z) => surf.top(x, z).p[1];
    if (S.rails) {
      const rb = new Buckets();
      for (const sg of [1, -1]) {
        const pts = []; for (let k = 0; k <= 10; k++) { const x = lerp(railX0, railX1, k / 10), z = railZ(x) * sg; pts.push(new T.Vector3(x, roofY(x, z) + .055, z)); }
        const tube = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, .017, 8, false); rb.geo('satin', tube);
        for (const x of [railX0, railX1]) { const z = railZ(x) * sg; const foot = rbox(.14, .07, .045, .02, 2); rb.geo('gloss', foot, place(x + (x === railX0 ? .04 : -.04), roofY(x, z) + .03, z)); }
      }
      rb.build(mats, roofParts, 'rail_');
    }
    /* --- underbody shadow blob */
    {
      const sg = new T.PlaneGeometry(S.L * 1.06, P.width(0) * 2.25); sg.rotateX(-Math.PI / 2); sg.translate(0, .012, 0);
      const m = new T.Mesh(sg, sh.shadow); m.name = 'shadowBlob'; m.renderOrder = 1; m.castShadow = false; m.receiveShadow = false; root.add(m); m.userData.noShadow = true;
    }
    /* --- interior: floor, dash, seats, steering wheel */
    {
      const fl = P.bottom(0) + .2, cw = P.width(0) - .1;
      const ib = B;
      const floor = new T.BoxGeometry(S.gh[1] - S.gh[0], .04, cw * 2); ib.geo('dash', floor, place((S.gh[1] + S.gh[0]) / 2, fl, 0));
      const dashX = S.ws[1] - .2, dy = P.belt(dashX);
      const dash = rbox(.55, .22, cw * 2 - .04, .08, 2); ib.geo('dash', dash, place(dashX - .05, dy - .02, 0));
      const sw = new T.TorusGeometry(.18, .022, 8, 24); ib.geo('dash', sw, place(dashX - .38, dy + .02, -cw * .45, 0, Math.PI / 2 - .45, 0).multiply(M4().makeRotationY(0)));
      const seatTop = S.seatTop;
      S.seats.forEach((sx, row) => {
        const n = row === 0 ? 2 : (type === 'minivan' && row === 1 ? 2 : 1), seatW = n === 2 ? .52 : cw * 1.6;
        for (let k = 0; k < n; k++) {
          const z = n === 2 ? (k ? 1 : -1) * cw * .45 : 0;
          const cush = rbox(.5, .14, seatW, .06, 2); ib.geo('interior', cush, place(sx + .12, fl + .32, z), .7);
          const back = rbox(.14, seatTop - fl - .45, seatW, .06, 2); ib.geo('interior', back, place(sx - .12, (seatTop + fl + .3) / 2, z, 0, 0, .18), .7);
          if (n === 2 || row === 0) { const hr = rbox(.1, .2, .26, .05, 2); ib.geo('interior', hr, place(sx - .17, seatTop + .02, z, 0, 0, .18), .7); }
        }
      });
      if (S.bulkhead != null) { const bh = new T.BoxGeometry(.04, 1.6, cw * 2); ib.geo('dash', bh, place(S.bulkhead, fl + .8, 0)); }
    }
    /* --- pickup bed */
    if (S.bed) {
      const [b0, b1] = S.bed, yF = S.bedFloor, yR = P.top((b0 + b1) / 2) - .005, wi = P.width((b0 + b1) / 2) - .055, L_ = b1 - b0;
      const fl = new T.BoxGeometry(L_, .03, wi * 2); B.geo('bedliner', fl, place((b0 + b1) / 2, yF, 0));
      for (const sg of [1, -1]) { const wall = new T.BoxGeometry(L_, yR - yF, .03); B.geo('bedliner', wall, place((b0 + b1) / 2, (yR + yF) / 2, sg * wi));
        const cap = rbox(L_ + .02, .04, .085, .015, 1); B.geo('gloss', cap, place((b0 + b1) / 2, yR + .01, sg * (wi + .03)));
        const wh = new T.CylinderGeometry(P.Ra - .02, P.Ra - .02, .2, 20, 1, false, 0, Math.PI); wh.rotateX(Math.PI / 2); wh.rotateZ(-Math.PI / 2); wh.rotateZ(Math.PI / 2);
        const whb = new T.BoxGeometry(P.Ra * 2 - .1, .3, .22); B.geo('bedliner', whb, place(S.axles[1], yF + .15, sg * (wi - .11)));
      }
      const fw = new T.BoxGeometry(.04, yR - yF, wi * 2); B.geo('bedliner', fw, place(b1 - .02, (yR + yF) / 2, 0));
      const tg = new T.BoxGeometry(.04, yR - yF, wi * 2); B.geo('bedliner', tg, place(b0 + .02, (yR + yF) / 2, 0));
      const tcap = rbox(.07, .04, wi * 2 + .1, .015, 1); B.geo('gloss', tcap, place(b0 + .02, yR + .01, 0));
      /* tailgate handle + seam */
      const th = rz(0, yR - .12); B.geo('gloss', rbox(.03, .06, .26, .012, 1), M4().makeTranslation(th.p[0] - .012, th.p[1], 0));
      patch(B, 'seam', (u, v) => rz(lerp(-.99, .99, u) * P.width(xR + .05), yR - .42 + v * .007), 16, 1, .002);
    }
    if (S.rearSplit) patch(B, 'seam', (u, v) => rz(-.004 + u * .008, lerp(P.bottom(xR) + .2, S.stop[0] - .08, v)), 1, 8, .002);

    /* build the static body */
    const bodyMeshes = B.build(mats, body, '');
    const stickerMeshes = stickerB.build(mats, body, '');

    /* --- wheels */
    const wheels = [], steer = [], track = P.width(0) - S.tw / 2 - .04;
    const wheelHolders = [];
    for (const ax of S.axles) for (const sg of [1, -1]) {
      const pivot = new T.Group(); pivot.position.set(ax, R, sg * track); pivot.name = 'wheelPivot';
      const spin = new T.Group(); spin.name = 'wheelSpin'; pivot.add(spin);
      const holder = new T.Group(); if (sg < 0) holder.rotation.y = Math.PI; spin.add(holder);
      const tyre = new T.Mesh(tyreGeo(R, S.tw), sh.tyre); tyre.castShadow = tyre.receiveShadow = true; holder.add(tyre);
      const rim = new T.Mesh(rimGeo(R, S.tw, 'steel'), sh.rims.steel); rim.castShadow = true; rim.receiveShadow = true; holder.add(rim);
      const bh = new T.Group(); if (sg < 0) bh.rotation.y = Math.PI; pivot.add(bh);
      const disc = new T.Mesh(brakeGeo(R, S.tw), sh.disc); bh.add(disc);
      const cal = new T.Mesh(caliperGeo(R, S.tw), sh.caliper); bh.add(cal);
      root.add(pivot); wheels.push(spin); if (ax > 0) steer.push(pivot);
      wheelHolders.push({ holder, rim, tyre, cal, pivot });
    }

    /* --- optional parts (built once, toggled by setUpgrades) */
    const opt = {};
    const roofTopY = P.top(0);
    /* roof rack crossbars + cargo box */
    {
      const g = new T.Group(); g.name = 'roofRack'; const rb = new Buckets();
      const xa = S.bed ? .15 : lerp(railX0, railX1, .18), xb = S.bed ? -.35 : lerp(railX0, railX1, .82), wz = railZ(0) + .02;
      const yAt = x => roofY(x, 0) + (S.rails ? .085 : .07);
      for (const x of [xa, xb]) {
        const barG = rbox(.07, .03, wz * 2 + .08, .012, 1); rb.geo('gloss', barG, place(x, yAt(x), 0));
        if (!S.rails) for (const sg of [1, -1]) rb.geo('gloss', rbox(.1, .08, .06, .015, 1), place(x, yAt(x) - .04, sg * wz));
      }
      if (type === 'workvan' || type === 'pickup') {
        /* ladder */
        const ly = Math.max(yAt(xa), yAt(xb)) + .04, lx0 = S.bed ? -1.2 : xb - .6, lx1 = S.bed ? .25 : xa + .5;
        for (const z of [-.22, .22]) rb.geo('satin', rbox(lx1 - lx0, .05, .03, .008, 1), place((lx0 + lx1) / 2, ly, z + .15));
        for (let x = lx0 + .15; x < lx1; x += .3) rb.geo('satin', new T.CylinderGeometry(.014, .014, .44, 8).rotateX(Math.PI / 2), place(x, ly, .15));
        if (S.bed) for (const x of [xa, xb]) { for (const sg of [1, -1]) rb.geo('gloss', rbox(.05, ly - P.top(x) + .02, .05, .01, 1), place(x, (ly + P.top(x)) / 2 - .04, sg * (wz - .02))); }
      } else {
        /* aerodynamic cargo box: rounded box, nose tapered */
        const bl = Math.min(1.9, (xa - xb) + .9), bw = 0.82, bh = .4, cx = (xa + xb) / 2 - .05, cy = Math.max(yAt(xa), yAt(xb)) + .03 + bh / 2;
        const box_ = rbox(bl, bh, bw, .14, 4), Pp = box_.attributes.position;
        for (let i = 0; i < Pp.count; i++) { const x = Pp.getX(i), y = Pp.getY(i), t = clamp((x + bl / 2) / bl, 0, 1); const k = t > .6 ? sstep(.6, 1, t) : 0; Pp.setY(i, y - (y > -bh * .2 ? k * (y + bh * .2) * .55 : 0)); Pp.setZ(i, Pp.getZ(i) * (1 - k * .12)); }
        box_.computeVertexNormals();
        rb.geo('gloss', box_, place(cx, cy, 0));
        rb.geo('satin', rbox(bl * .7, .012, .02, .005, 1), place(cx - .05, cy - bh * .1, bw / 2 + .002));
        rb.geo('satin', rbox(bl * .7, .012, .02, .005, 1), place(cx - .05, cy - bh * .1, -bw / 2 - .002));
      }
      rb.build(mats, g, 'rack_'); body.add(g); opt.rack = g; g.visible = false;
    }
    /* bull bar */
    {
      const g = new T.Group(); g.name = 'bullBar'; const bb = new Buckets(); const w = P.width(xF - S.noseF);
      const yLo = P.bottom(xF) + .02, yHi = Math.min(S.hl.yIn[1] + .02, P.top(xF) - .02), xOf = (z, y) => fz(z, y).p[0] + .09;
      const zs = [-.42, .42].map(k => k * w);
      for (const z of zs) { const pts = []; for (let k = 0; k <= 6; k++) { const y = lerp(yLo, yHi, k / 6); pts.push(new T.Vector3(xOf(z, y), y, z)); } bb.geo('gloss', new T.TubeGeometry(new T.CatmullRomCurve3(pts), 12, .032, 10, false)); }
      const hoop = []; for (let k = 0; k <= 12; k++) { const t = k / 12, z = lerp(zs[0], zs[1], t), y = yHi + Math.sin(t * Math.PI) * .03; hoop.push(new T.Vector3(xOf(z, Math.min(y, yHi)) + .01, y, z)); }
      bb.geo('gloss', new T.TubeGeometry(new T.CatmullRomCurve3(hoop), 24, .034, 10, false));
      for (const fy of [.35, .62]) { const y = lerp(yLo, yHi, fy), pts = []; for (let k = 0; k <= 8; k++) { const z = lerp(zs[0], zs[1], k / 8); pts.push(new T.Vector3(xOf(z, y) - .005, y, z)); } bb.geo('gloss', new T.TubeGeometry(new T.CatmullRomCurve3(pts), 16, .022, 8, false)); }
      const plate_ = rbox(.04, .26, zs[1] * 2 + .12, .015, 1); bb.geo('gloss', plate_, place(xOf(0, yLo + .14) - .02, yLo + .14, 0));
      bb.build(mats, g, 'bull_'); body.add(g); opt.bull = g; g.visible = false;
    }
    /* LED light bar on the roof front */
    {
      const g = new T.Group(); g.name = 'lightBar'; const lb = new Buckets();
      const x = S.bed ? .25 : Math.min(railX1 - .12, S.ws[0] - .12), ww = Math.min(.62, railZ(x) - .02), y = roofY(x, 0) + .09;
      lb.geo('gloss', rbox(.17, .085, ww * 2 + .08, .03, 2), place(x, y, 0));
      for (let k = 0; k < 8; k++) { const z = lerp(-ww, ww, (k + .5) / 8), seg = rbox(.02, .05, ww * 2 / 8 - .03, .008, 1); lb.geo(k % 2 ? 'barW' : 'bar', seg, place(x + .085, y, z)); }
      for (const sg of [1, -1]) lb.geo('gloss', rbox(.08, .07, .04, .01, 1), place(x - .02, y - .06, sg * (ww - .05)));
      lb.build(mats, g, 'bar_'); body.add(g); opt.bar = g; g.visible = false;
    }
    /* spoiler */
    {
      const g = new T.Group(); g.name = 'spoiler'; const sb = new Buckets();
      if (type === 'sedan') {
        const x = xR + .32, yd = P.top(x), w = P.width(x) - .12;
        sb.geo('paint', rbox(.24, .035, w * 2, .015, 2), place(x - .02, yd + .2, 0, 0, 0, .1));
        sb.geo('gloss', rbox(.26, .1, .02, .008, 1), place(x - .02, yd + .2, w));
        sb.geo('gloss', rbox(.26, .1, .02, .008, 1), place(x - .02, yd + .2, -w));
        for (const sg of [1, -1]) sb.geo('gloss', rbox(.06, .2, .03, .01, 1), place(x, yd + .1, sg * (w - .25), 0, 0, -.2));
      } else if (type === 'pickup') {
        const x = S.bed[0] + .02, y = P.top(x) + .05, w = P.width(x) - .05;
        sb.geo('paint', rbox(.12, .03, w * 2, .012, 2), place(x + .03, y, 0, 0, 0, .25));
      } else {
        const x = xR + S.noseR * .6, yr = P.top(xR + S.noseR + .02), w = P.roof(xR + .3);
        const wing = rbox(.34, .04, w * 2 + .04, .02, 2); sb.geo('paint', wing, place(x - .04, yr + .005, 0, 0, 0, .13));
        sb.geo('gloss', rbox(.3, .012, w * 2 + .05, .005, 1), place(x - .06, yr - .015, 0, 0, 0, .13));
      }
      sb.build(mats, g, 'spoiler_'); body.add(g); opt.spoiler = g; g.visible = false;
    }
    /* finish panels: wood-grain side panels and the mural wrap */
    {
      const mk = (key) => {
        const g = new T.Group(); const pb = new Buckets();
        const xa = S.axles[1] + P.Ra + .06, xb = S.axles[0] - P.Ra - .06, xEnd = key === 'mural' ? xR + S.noseR + .25 : xa;
        const ya = x => Math.max(P.bottom(x) + .12, S.clad ? S.clad + .05 : 0), yb = x => P.belt(x) - (key === 'wood' ? .09 : .04);
        patch(pb, key, (u, v) => { const x = lerp(xb, xEnd, u); return surf.side(x, lerp(ya(x), yb(x), v)); }, 40, 6, .003, { mirror: true, flipU: true });
        if (key === 'wood') for (const yy of [0, 1]) patch(pb, 'satin', (u, v) => { const x = lerp(xb, xEnd, u); return surf.side(x, (yy ? yb(x) : ya(x)) - .008 + v * .016); }, 40, 1, .005, { mirror: true });
        pb.build(mats, g, key + '_'); body.add(g); g.visible = false; return g;
      };
      opt.wood = mk('wood'); opt.mural = mk('mural');
    }

    /* --- state + API */
    const size = { l: S.L, w: P.width(0) * 2 + .2, h: P.top(-.5) };
    Object.assign(ud, {
      type, size, len: S.L, wid: P.width(0) * 2, wheels, steer, wheelRadius: R, wheelBase: S.axles[0] - S.axles[1],
      lights: { head: [headLens], tail: [tail], brake: [brake], reverse: [reverse], bar: [bar, barW] },
      body: [paint, paint2], glassMat: glass,
      parts: { body, glass, wheels, rear: stickerMeshes.sticker || null, meshes: bodyMeshes },
      colliders: [{ x0: -S.L / 2, z0: -P.width(0), x1: S.L / 2, z1: P.width(0) }],
      upgrades: {}, _st: { spin: 0, roll: 0, pitch: 0, last: 0, acc: 0, bar: 0, head: false, flash: 0 }
    });
    const setColor = (hex) => {
      const c = lin(hex), hsl = {}; new T.Color(hex).getHSL(hsl);
      paint.color.copy(c); paint.metalness = hsl.l > .78 || (hsl.s > .55 && hsl.l > .45) ? .12 : .55; paint.roughness = paint.metalness > .3 ? .33 : .22;
      ud.color = hex;
      const fin = ud.upgrades.paint;
      if (fin === 'twotone') { paint2.color.copy(lin('#5a3a28')); paint2.metalness = .4; } else { paint2.color.copy(c); paint2.metalness = paint.metalness; }
      paint2.roughness = paint.roughness;
    };
    const setUpgrades = (u = {}) => {
      u = Object.assign({}, u); ud.upgrades = u;
      let color = opts.color || ud.color || '#b9c0c7';
      if (typeof u.paint === 'string' && u.paint[0] === '#') color = u.paint;
      if (typeof u.paint === 'number') color = '#' + u.paint.toString(16).padStart(6, '0');
      setColor(color);
      const rs = { stock: 'steel', steel: 'steel', alloy: 'alloy', black: 'black', chrome: 'chrome', gold: 'gold', spinner: 'spinner', spinners: 'spinner' }[u.rims] || 'steel';
      for (const w of wheelHolders) { w.rim.geometry = rimGeo(R, S.tw, rs); w.rim.material = sh.rims[rs]; w.cal.material = rs === 'alloy' || rs === 'black' ? sh.caliperRed : sh.caliper; }
      const rack = u.roofRack === true || u.roofRack === 'cargo'; opt.rack.visible = rack;
      opt.bull.visible = !!u.bullBar; opt.bar.visible = !!u.lightBar; opt.spoiler.visible = !!u.spoiler;
      opt.wood.visible = u.paint === 'wood'; opt.mural.visible = u.paint === 'mural';
      const t = clamp(+u.tint || 0, 0, 1); glass.opacity = lerp(.55, .93, t); glass.color.copy(lin(t > .5 ? '#0a0d10' : '#1a2228'));
      const amber = u.lightBar === 'amber' || u.lightBar === true; bar.emissive.copy(lin(amber ? '#ffa020' : '#ffffff'));
    };
    ud.setUpgrades = setUpgrades; ud.setColor = (h) => { opts.color = h; setColor(h); };
    ud.setLights = on => { ud._st.head = !!on; applyLights(root, false); };
    ud.flashBar = t => { ud._st.flash = t || 0; };
    ud.setDamage = f => { ud.damage = clamp(f, 0, 1); };
    ud.dispose = () => { root.traverse(o => { if (o.isMesh && o.geometry && !Object.values(WGEO).includes(o.geometry)) o.geometry.dispose(); }); for (const m of [paint, paint2, glass, headLens, tail, brake, reverse, bar, barW, sticker, plateF]) m.dispose(); if (plateF.map) plateF.map.dispose(); };
    setUpgrades(up0);
    applyLights(root, false);
    return root;
  }

  function applyLights(v, braking) {
    const ud = v.userData, s = ud._st;
    const head = s.head || (ud.damage > .7 ? false : s.head);
    ud.lights.head[0].emissiveIntensity = head ? 2.4 : 0;
    ud.lights.tail[0].emissiveIntensity = head ? .9 : .12;
    ud.lights.brake[0].emissiveIntensity = braking ? 5 : head ? .9 : .12;
    ud.lights.reverse[0].emissiveIntensity = s.reversing ? 2.5 : 0;
    const bars = ud.lights.bar;
    if (s.flash > 0) { const ph = Math.floor(s.barT * 6) % 2; bars[0].emissiveIntensity = ph ? 5 : .2; bars[1].emissiveIntensity = ph ? .2 : 4; }
    else { bars[0].emissiveIntensity = head ? 2.5 : .4; bars[1].emissiveIntensity = head ? 2.5 : .4; }
  }

  function update(v, o = {}) {
    const ud = v && v.userData; if (!ud || !ud._st) return;
    const s = ud._st, dt = Math.min(.1, Math.max(0, o.dt || 0)), speed = o.speed || 0, R = ud.wheelRadius;
    s.spin = (s.spin - speed * dt / R) % (Math.PI * 2);
    for (const w of ud.wheels) w.rotation.z = s.spin;
    const steer = clamp(o.steer || 0, -1, 1), ang = steer * .52;
    for (const p of ud.steer) p.rotation.y += (ang - p.rotation.y) * Math.min(1, dt * 14 || 1);
    if (dt > 0) {
      const a = (speed - s.last) / dt; s.last = speed; s.acc += (clamp(a, -12, 12) - s.acc) * Math.min(1, dt * 5);
      const lat = speed * speed * Math.tan(ang) / ud.wheelBase;
      const rollT = clamp(lat * .0055, -.055, .055), pitchT = clamp(s.acc * .0032, -.035, .03);
      s.roll += (rollT - s.roll) * Math.min(1, dt * 5); s.pitch += (pitchT - s.pitch) * Math.min(1, dt * 5);
      const b = ud.parts.body; b.rotation.x = s.roll; b.rotation.z = s.pitch; b.position.y = -Math.abs(s.pitch) * .4 - Math.abs(s.roll) * .15;
    }
    if (o.headlights != null) s.head = !!o.headlights;
    s.reversing = speed < -.3;
    s.barT = (s.barT || 0) + dt; if (s.flash > 0) s.flash = Math.max(0, s.flash - dt);
    applyLights(v, !!o.braking);
  }

  HT.Vehicles = {
    TYPES: Object.keys(TYPES),
    init(o = {}) { ASSETS = o.assets || null; shared(); return HT.Vehicles; },
    make, update,
    stats(v) { let tris = 0, calls = 0; v.traverse(o => { if (o.isMesh && o.visible) { let vis = true; let p = o; while (p) { if (!p.visible) vis = false; p = p.parent; } if (!vis) return; calls++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return { tris: Math.round(tris), calls }; }
  };
})();
