# Performance: loading and frame rate

The live site showed "SLOW CONNECTION · 16 FILES DIDN'T LOAD · USING THE BACKYARD LOOK": the old loader fetched
27.6 MB in 118 files before the Start button enabled and gave up after 25 s. This page records what was measured,
what changed, and how to keep it fast.

@@NUMBERS@@

## How loading works now

**Stage A (blocks Start).** A tiny script in `<head>` starts fetching `assets/opt/manifest.json` and then one
**boot pack** (`assets/opt/boot.webp.<hash>.bin`, or `boot.jpg.<hash>.bin` without WebP) while three.js is
still downloading. The pack holds everything the title screen and the first view of the hub need at the reduced
tier: the sky (1k), a 256×128 RGBE light probe, the hub's ground / yard / house textures (512 albedo, 256 normal
and roughness), the buildings atlas sources, and the hub's trees, bush and mailbox. One request, about 1.5 MB.

**Stage B (background, from the moment Stage A is in).** A priority queue (8 parallel fetches) streams:
1. full-tier versions of what the hub shows (1k albedo, 512 normal/roughness, 2k sky, 512×256 light probe),
2. each mission's models, textures and decals (a mission is bumped to the front when its brief opens, so the drive
   to the job site is the loading screen),
3. everything else known to the loader.

Every texture the game gets from `ASSETS` is a **live `THREE.Texture`**: at first a 2×2 placeholder in the
texture's average colour (from the manifest), then its image is swapped in place (`texture.image = img;
needsUpdate = true`) when the reduced and then the full file arrive. Materials never need rebuilding.
Models whose reduced and full files differ (characters, guns) upgrade by moving the new images into the textures
the game already holds. A small "Streaming details · N" chip sits bottom-left while Stage B works.

**Failures.** Nothing is ever marked dead. A failed file retries with backoff (1.5 s, 3.8 s, 9 s … capped at
2 min, with jitter); every second attempt goes to the original source file in case the optimised one is
missing. If the boot pack fails, its entries load one by one. If the manifest is missing, the loader falls back
to the original files. Stage A never blocks Start for more than 20 s; anything still missing streams in behind
the game (a hub model that lands while the title card is up rebuilds the hub). Only when the network is really
gone does the title card say so, with a **Retry** button (it also retries by itself on the `online` event).

**Other modules.** `THREE.DefaultLoadingManager` has a URL modifier: any `TextureLoader` / `GLTFLoader` that loads
a source path listed in the manifest (for example `assets/guns/ph_pistol.glb` from js/guns.js, or
`assets/home/*.glb` from js/save.js) transparently gets the optimised variant for the current tier, and every
`new THREE.GLTFLoader()` gets the meshopt decoder. Raw `new Image()` loads are not covered: use `ASSETS.image()`.

**Service worker (`sw.js`).** Hashed files under `assets/opt/` and the pinned CDN files are cache-first, so the
second visit loads Stage A from disk. `index.html`, `js/`, `css/`, `manifest.json` and source assets are network-first
with the cache as the offline fallback, so a deploy is picked up immediately. `tools/build-assets.js` rewrites
`ASSET_VERSION` in `sw.js`, which makes browsers install the new worker; on activate it deletes cached asset files the
new manifest no longer lists. Bump `SHELL_VERSION` by hand only to throw away the cached app shell. The game works
without the worker (blocked, unsupported, `file://`).

**Network.** `preconnect` for both CDNs and Google Fonts, `preload` for three.min.js, and the ten three r128 add-ons
(loaders, meshopt decoder, SkeletonUtils, post-processing) come from one jsDelivr `combine` request instead of ten.

## Asset pipeline (for everyone adding assets)

```
cd tools && npm install        # once: gltf-transform, meshoptimizer, sharp, playwright is pre-installed
node tools/build-assets.js     # from the repo root; ~35 s cold, under a second when nothing changed
```

Then commit the source file **and** the changes under `assets/opt/` plus `sw.js`.

Rules:
- Put sources where they always went: `assets/tex/<name>_col|_nrm|_rgh|_alpha.jpg`, `assets/tex2/…`,
  `assets/props/*.glb`, `assets/world/*.glb|*.png`, `assets/people/rocketbox/*.glb`, `assets/guns/*.glb`,
  `assets/home/*.glb`, `assets/sky/`. New folders must be added to `roots` in `tools/assets.config.js`.
- Texture suffixes matter: `_nrm`, `_rgh` and `_alpha` are treated as data maps (linear, one size step below
  albedo). Sources up to 1024 px (2048 for the sky).
- Always load through the source path (`assets/props/crate.glb`), never an `assets/opt/` path: the manifest picks
  the tier and format, and the names there change with every content change. In game code prefer
  `ASSETS.gltf(name)` / `ASSETS.tex(name)` / `ASSETS.texture(path)` / `ASSETS.image(path, cb)`; plain three loaders
  also work through the URL modifier.
- Never edit `assets/opt/` by hand; re-run the build. It deletes outputs nobody references.
- Models under `assets/props/`, `assets/world/`, `assets/home/` get quantized positions (`KHR_mesh_quantization`).
  r128's raycaster reads raw attribute values, so do not raycast those meshes directly: use colliders (the game
  already does). Characters and guns keep float positions.
- Textures with alpha inside glbs are stored as lossless WebP (lossy WebP repaints colour under transparent
  pixels and alpha-tested foliage loses its edges).
- If an asset belongs on the first screen of the hub, add its source path prefix to `boot` in
  `tools/assets.config.js` **and** to `GROUPS.hub` in the ASSETS block of index.html; mission assets go in
  `GROUPS.m0`…`m3`.
- Check a conversion with `dev/asset-ab.html?src=<source path>&tier=l|m` (source left, optimised right), or in bulk:
  `node tools/perf/ab.js <outdir> l <source paths…>` with `node tools/perf/serve.js 8001` running.

Tiers: `m` = reduced (boot pack, Low preset, devices with ≤ 2 GB memory, browsers without WebP),
`l` = full (Medium / High). Outputs: `<path>.<tier>.<hash>.webp|jpg|png|glb|hdr`; jpg/png fallbacks exist for `m`.
When WebP would be larger than an already well-compressed source jpg at the same size, the source bytes are shipped.

## Frame rate

**Quality presets.** Low / Medium / High as before plus **Auto** (the default for players who never picked one; an
explicit choice is saved as before). Auto starts at Medium and, once the title card is gone, reads real frame times
(75th percentile over 1.5 s windows) and walks this ladder:

| step | preset | resolution scale |
|---|---|---|
| 0 | High (4096 soft shadows over ±34 m, AO 16 samples, full bloom, far tree LOD) | 1.0 |
| 1 | Medium (2048 soft shadows over ±28 m, AO 8, half bloom) — start | 1.0 |
| 2–4 | Medium | 0.85 / 0.72 / 0.6 |
| 5–6 | Low (1024 hard shadows, no post, no grass tufts, near tree LOD, 512 textures, 2× aniso) | 0.8 / 0.6 |

Slower than ~45 fps steps down (two steps when below ~30 fps) and blocks climbing back for 30 s; three steady
60 fps windows step up; a level that proved too slow twice is never retried. The pause menu shows the current
Auto level. Resolution scale is applied as renderer pixel ratio (preset cap × scale).

**Static batching.** On a level's first frame, house and parked-car meshes that share a material are merged per
32 m cell (originals stay in place, invisible, so raycasts and colliders are unchanged; their matrices are
frozen). Parts smaller than 0.45 m (lenses, plates, nuts, small trims) stop casting shadows. Glass, interior
cards, skirts and glow strips from js/buildings.js no longer cast shadows (the game used to override that).

**Smaller things.** AO pass no longer allocates a Vector2 per frame; AO shader recompiles only when the sample count
changes; anisotropy capped per preset (2 / 4 / 8); env map rebuilt only when a new light probe arrives and the old
one is disposed.

## Measuring

```
node tools/perf/serve.js 8001                  # GitHub-Pages-like static server: gzip, max-age=600, ETag
node tools/perf/measure.js --url http://127.0.0.1:8001/ --throttle --rafcap --nosw         # first visit at 10 Mbit/s, 40 ms
node tools/perf/measure.js --url http://127.0.0.1:8001/ --throttle --rafcap --repeat       # second visit through the service worker
node tools/perf/measure.js --url http://127.0.0.1:8001/ --nosw --levels --shots <dir>      # renderer.info + JS ms per level
node tools/perf/measure.js ... --fail boot. --fail tree_oak                                 # make files 404
node tools/perf/drawcalls.js [-1|0..3]          # draw calls per pass and the biggest mesh groups
node tools/perf/usage.js                        # which loaded assets each level really shows
node tools/perf/autotest.js                     # Auto quality ladder with faked frame times
```

Headless Chromium renders with SwiftShader on the CPU: frame times there say nothing about a GPU. Load timings use
`--rafcap` (render loop at 5 fps) for both before and after, because an uncapped SwiftShader loop eats the main
thread a real GPU would leave free. Requests a service worker answers are invisible to the page's network log, so
first-visit byte counts are taken with `--nosw`. The local server speaks HTTP/1.1 (6 connections per host), so it is
slower than GitHub Pages' HTTP/2.

@@WEAK@@
