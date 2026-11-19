# Performance: loading and frame rate

The live site showed "SLOW CONNECTION · 16 FILES DIDN'T LOAD · USING THE BACKYARD LOOK": the old loader fetched
27.6 MB in 118 files before the Start button enabled and gave up after 25 s. This page records what was measured,
what changed, and how to keep it fast.

## Before → after

Measured with `tools/perf/measure.js` against `tools/perf/serve.js` (gzip like GitHub Pages), headless Chromium
with SwiftShader, 1280×720. "Before" is commit c6acded (what the live site ran), "after" is this branch.

### Loading

| | before | after |
|---|---|---|
| bytes on the wire before Start (gzip, like Pages) | 19.5 MB (27.6 MB uncompressed) | **2.1 MB** (1.5 MB of it the boot pack) |
| requests before Start | 131 (118 from this site, 10 CDN scripts, 3 font files) | **19** (14 from this site, 2 CDN scripts, 3 font files) |
| first visit, 10 Mbit/s + 40 ms (CDP throttling) | 21.2 s (20.9 s in a second run); the live site hit the 25 s timeout | **3.4–3.6 s** (three runs) |
| first visit, unthrottled local | 9.9 s | **1.5 s** |
| second visit, throttled | 6.2 s (HTTP cache, 118 revalidations) | **1.6 s** (service worker) |
| second visit, network off | page fails | Start in 3.4 s from the worker cache; "You're offline" + Retry; resumes when back online |
| boot pack, a tree, the grass texture and the light probe all 404 | n/a | Start in 2.7 s, files fetched one by one, failed ones keep retrying |
| manifest 404 (degraded: original files) | n/a | Start in 13.9 s with 8.6 MB of source files |
| everything the game can show (hub full res + all 4 missions) | 19.5 MB, all before Start | 8.2 MB, streamed after Start |

Time to Start in headless is CPU-bound (decode, hub build, shader compiles on a CPU rasterizer); on a laptop
with a GPU it is lower. "All streamed" takes ~30 s headless for the same reason; the network part of 6 MB at
10 Mbit/s is about 6 s.

### Which files the boot used to fetch, and whether the game showed them

Measured with `tools/perf/usage.js` (texture and geometry identity of everything in the scene, hub and every
mission). Fetched at boot but **never shown anywhere**: all 6 `assets/chars` models (7.0 MB; characters are
box dudes in index.html), the 3 `props/gun_*` models, the 4 `props/car_*` models (cars come from js/vehicles.js),
`street_lamp`, `trash_can`, `utility_box`, `cardboard_box`, `chest_wood`, `pull_chain_light_socket`,
`wooden_picnic_table`, `shrub_02`, and the `fence` texture set. The hub itself shows 9 texture sets, the tex2
house set, 5 models (three trees, bush, mailbox), one decal and the sky.

Repo inventory after cleanup:
- **deleted** (no references outside the old loader list and one dev page): `assets/chars/` (6 files, 7.0 MB),
  `assets/family/` (4, 4.1 MB), `assets/guns2/` (7, 0.3 MB), `assets/props/gun_pistol|rifle|shotgun.glb`.
  `assets/people/mpfb` does not exist on this branch. dev/fx.html now uses `people/rocketbox/dad_player.glb` and
  `guns/ph_pistol.glb`.
- **kept, loaded only on demand**: the unused props/world models above (`ASSETS.gltf(name)` fetches them the first
  time code asks), `assets/people/rocketbox/` (for the character work), `assets/guns/` (js/guns.js),
  `assets/home/` (js/save.js). All of them have optimised variants in `assets/opt/`.

### Payload per asset class (source → full tier `l` → reduced tier `m`, uncompressed bytes)

| | source | l | m |
|---|---|---|---|
| tiled textures (tex + tex2, 74 files) | 9.4 MB jpg | 5.0 MB (WebP, normal/roughness at 512) | 1.2 MB (512 / 256) |
| props + world models (31) | 10.4 MB | 4.0 MB (meshopt, quantized, WebP) | same |
| rocketbox characters (13) + anims | 15.2 MB | 8.2 MB (anims 1.8 → 1.1 MB) | 4.8 MB |
| guns (3) | 4.3 MB | 2.5 MB | 1.4 MB |
| home furniture (32) | 4.3 MB | 2.3 MB | 2.2 MB |
| light probe | 1.4 MB (1024×512) | 0.37 MB (512×256) | 0.1 MB (256×128) |
| sky panorama | 121 kB | 50 kB | 20 kB |

The 512×256 probe renders the same as the 1024×512 one (PMREM's sharpest level is 256 px per cube face); see
`docs/screenshots/perf/asset-ab-sheet.jpg` for source vs optimised renders of every asset class.

### Frame cost (Medium, after streaming finished)

| level | draw calls | triangles | shader programs | texture memory (estimate) | JS update ms (median / p90) | draw submit CPU ms |
|---|---|---|---|---|---|---|
| hub | 1300 → **821** | 1.67 M → 1.73 M | 52 → 44 | 206 → 174 MB | 2.0 / 2.6 → 2.1 / 2.3 | 13.6–13.9 → 4.9–11.1 |
| driving | 1218 → **771** | 1.67 M → 1.72 M | 52 → 44 | 206 → 174 MB | 0.6 / 0.8 → 0.4 / 0.6 | 5.0 → 7.5 |
| mission 1 (chop shop) | 542 → 515 | 542 k → 536 k | 70 → 62 | 161 → 153 MB | 1.6 / 3.4 → 1.6 / 7.1 | 5.2 → 3.7 |
| mission 2 (duplex) | 689 → 660 | 737 k → 730 k | 73 → 65 | 182 → 178 MB | 1.4 / 1.8 → 1.4 / 1.8 | 3.5 → 5.7 |
| mission 3 (park) | 312 → 312 | 695 k → 695 k | 75 → 67 | 66 → 66 MB | 0.1 / 0.2 → 0.1 / 0.2 | 1.1 → 2.0 |
| mission 4 (kingpin) | 816 → 797 | 873 k → 862 k | 75 → 67 | 182 → 174 MB | 1.6 / 2.0 → 1.5 / 1.7 | 4.0 → 3.8 |

Draw calls include the shadow pass (hub after: ~285 shadow + ~536 main). Triangles rise slightly because a merged
32 m cell is drawn whole when any part of it is in view. Submit CPU is the time `renderer.render` takes on the main
thread (no GPU wait); it is noisy under SwiftShader, so read it as a trend. Texture memory is estimated from image
sizes (RGBA + mips); Low uses the 512 tier, about a quarter of that. JS update is `__ht.step(1)`.

Screenshots: `docs/screenshots/perf/before-*.jpg` and `after-*.jpg` (same views after streaming), `ab-hub.jpg`
(before above, after below).


## After merging main (d163545: realistic people, guns, HUD, FX, AI, home)

Main had grown to **29.7 MB / 140 local files before Start**, 30.5 s at 10 Mbit/s (12.1 s unthrottled), with a 2-minute
give-up timeout. On the merged branch:

| | main d163545 | merged work/perf-load |
|---|---|---|
| bytes before Start (throttled run) | 29.7 MB | 3.1 MB (2.5 MB boot pack incl. player, Gary and the animation set; 9 module scripts; fonts) |
| requests before Start | 150 | ~20 for Stage A (the rest of the 34 counted are Stage B starting the moment Stage A is in) |
| first visit, 10 Mbit/s + 40 ms | 30.5 s | **3.8–3.9 s** (two runs) |
| second visit | 11.3 s (HTTP cache) | 4.0 s (service worker; CPU-bound, see below) |
| offline second visit | fails | Start in 4.3 s, "You're offline · click here to retry" |
| boot pack + a tree + Gary + light probe 404 | n/a | Start in 4.1 s |
| everything (hub full res, people, guns, missions) | 29.7 MB up front | 16.8 MB, streamed after Start |

| level (Medium) | draw calls main → merged | triangles | programs | texture memory |
|---|---|---|---|---|
| hub | 828 → 532 | 1.34 M → 1.40 M | 73 → 62 | 290 → 209 MB |
| driving | 767 → 479 | 1.29 M → 1.38 M | 73 → 62 | 290 → 209 MB |
| mission 1 | 673 → 757 | 913 k → 789 k | 107 → 91 | 350 → 197 MB |
| mission 2 | 791 → 744 | 1.19 M → 1.06 M | 110 → 94 | 410 → 233 MB |
| mission 3 | 648 → 647 | 928 k → 834 k | 117 → 100 | 276 → 105 MB |
| mission 4 | 1714 → 1648 | 1.51 M → 1.28 M | 118 → 101 | 482 → 231 MB |

Mission numbers vary with which people have streamed in by the time of the sample (box stand-ins have more, smaller meshes).

People: `rb_dad_player`, `rb_dad_gary` and `rb_anims` are in the boot pack (js/people.js prepares characters at
`ASSETS.ready`); the rest of the crew streams right after Stage A, thugs and the boss with the missions (bumped when a
brief opens). Each arrival is handed to `People.preload`. A mission started before its cast has arrived uses box
stand-ins for the missing characters until the next level build. `HT.Guns.init` now runs after Stage A. js/home.js is
not loaded by index.html yet; when it is, init it when the player enters the house (its files are in the pipeline,
and `assets/family/` plus `assets/chars/dad_casual.glb` were restored because home.js uses them).

The second visit is slower than before the merge (4.0 s vs 1.6 s) with all files coming from the worker: the time goes
to parsing nine module scripts, preparing the rigged characters and building the hub on the main thread, which headless
SwiftShader makes worse.

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

## Remaining weaknesses

- **Triangles.** The hub still pushes ~1.7 M triangles a frame across the shadow and main passes. The largest
  contributors are parked-car wheels (~20 k triangles per car from js/vehicles.js lathe geometry), instanced trees
  inside the LOD radius and trims. A wheel LOD (or fewer lathe segments) is the next step; Auto lowers resolution and
  then shadow cost, but triangle count is the same at every preset.
- **Shadows every frame.** The shadow map re-renders every frame; splitting static and moving casters (or updating
  it every other frame when Auto is under pressure) would halve that pass.
- **Static batching scope.** Only houses and parked cars are merged, once per level. If future code hides, moves
  or swaps parts of a house or a parked car after the level is built, it must set `userData.noBatch` on those
  meshes (or the change will not show, because the visible copy is the merged one).
- **HUD DOM writes.** `hud()` runs every frame and writes text/styles; that region belongs to the HUD work, and
  should only touch the DOM when a value changes.
- **Quantized props.** Raycasting props/world/home meshes directly is wrong in r128 (raw quantized values). Nothing
  does it today.
- **Loader hints are hand-kept.** `GROUPS` in index.html and `boot` in tools/assets.config.js list what the hub and
  each mission need. A new hub asset that is not listed still works (requested lazily) but may pop in.
- **Fallback without a manifest** loads full-size source files (8.6 MB before Start).
- **WebP-less browsers** (very old Safari) get the 512 tier everywhere.
- **Headless numbers.** Frame times from SwiftShader say nothing about GPU cost; GPU cost was reasoned from draw
  calls, triangles, passes and resolution. A check on a real integrated-GPU laptop is still worth doing.

