# Perf audit: budgets, leaks, long-session stability

Branch `audit/perf`. All numbers are hardware-independent (draw calls, triangles, programs, GPU-resource counts, JS heap, DOM,
listeners, timers). Frame times on this SwiftShader container are never used as a finding. Probes live in `dev/audit/perf/`;
each one prints its own numbers and writes nothing to the repo except where noted.

Build measured: `96965c7` (HEAD of main when the audit started). Comparison builds: `50a8ff6` (main just before the rack commit),
`12dceec` (main about two days ago, named in the brief).


## PERF-01 · MAJOR · The range's rental rack costs ~342 draw calls whenever the camera is within 170 m of it

**This is the regression the brief asked about** (air-check Maple 100 ft ~830 → ~1183, base 366 → 723).

* **Commit:** `8ba2da5` "Range rental rack (owner's playtest)…" (it came in through merge `a3d59ca`). Bisected with git worktrees and the
  same probe (`dev/audit/perf/air-probe.js`, which copies dev/air-check.js's 100 ft approach, plus `budget-probes.js --settle=12`):

  | build | Maple 100 ft | base 100 ft | mapleSE probe (Medium, budget 450) |
  |---|---|---|---|
  | `12dceec` (main two days ago) | 815 | 334 | 435 |
  | `50a8ff6` (`8ba2da5^`, main just before the rack) | 839 | 377 | 435 |
  | `8ba2da5` (rack) | **1183** | **720** | **642** |
  | `96965c7` (HEAD) | **1167** | **691** | **596** (606 in the stock `openworld-ingame.js`) |

  The other suspects in the brief (people.js pending/real swap, festival/finale dressing, traffic hero swaps, jet ground map /
  buildAhead, vendored libs) explain ~0–40 calls at most between `12dceec` and `50a8ff6`; the +344 step is entirely the rack.
* **Cause:** `js/range.js:227-233` `rackGuns()` hangs nine full first-person gun models from `HT.Guns.model(id)` on the rack. Those are
  procedural, many-part models (the SMG alone is ~120 meshes: 55 bore cylinders, 55 torus rings, 12 cylinders…), each part its
  own draw call, marked `noBatch`, so static batching never merges them. The only culling is range.js's own `cull()`
  (`js/range.js:285-289`): a child of the post is drawn when the camera is within **170 m** of its bounds. 170 m is far for nine
  0.5 m guns: it covers the south half of Maple Heights (mapleSE probe at 123 m), the whole base, and the jet's 100 ft approach over Maple.
  The per-object draw breakdown (`air-probe.js --deep`, evidence `docs/audit/perf/evidence/air-probe-HEAD-deep-top.txt`) shows
  `gun_smg/gunBody/smg` 55+55+12 calls, `gun_shotgun`/`gun_beanbag` 19 each, nailer magazine 16, revolver rounds 12…: 335–342 calls in
  every view where the rack is in range and in the frustum. Same cost at Low (castShadow is off, so the shadow pass is unaffected).
* **Repro:** `node dev/audit/perf/budget-probes.js --q=med,low --settle=12` (prints "rack calls 342 (rack visible true, 123 m)" on
  mapleSE and OVER budget); `node dev/audit/perf/air-probe.js --deep --nobridge`. Run twice each on HEAD, same numbers ±15.
* **Expected:** the dev/openworld-ingame.js budget (main ≤ 450) holds at mapleSE as it did before; a rack of nine guns costs a few
  dozen calls up close and nothing from 100+ m (merge each gun, or a tight distance cull such as 25–40 m, or a cheap LOD/impostor).
* **Confidence:** CONFIRMED (bisected, attributed per object, reproduced twice).

## PERF-02 · MINOR · `dev/openworld-ingame.js` budgets are order- and history-dependent, so they fail or pass by accident

The brief's "midBridge 465 over its 450 budget" is not a stable number:

* On a fresh hub the midBridge view measures **427–431** at Medium, before and after the rack commit, with or without traffic, with the
  bridge open or closed, after the four Maple ring jobs, and with the minivan parked in view (+5): `midbridge-order.js [--traffic] [--open]`,
  `mission-residue.js --rounds=3`, `van-in-view.js`.
* The stock test measured **461** on `50a8ff6` (and 465 in the brief) after its own fuzz/drive/mission sequence, and on HEAD it measures
  **dadsAuto 675, midBridge 777** (evidence `docs/audit/perf/evidence/openworld-ingame-HEAD.txt`). The HEAD numbers are PERF-01's rack
  left **visible** from the previous probe: the test teleports and measures after `H.step(2)`, but range.js re-evaluates its cull only every
  0.33 s of simulated time (10 steps), so the rack stays on from mapleSE (123 m) through dadsAuto (182 m) and midBridge (239 m).
  `budget-probes.js --settle=2` vs `--settle=12` shows the difference (dadsAuto 634 vs 425 at Low).
* The extra ~30 calls on `50a8ff6` come from state the test builds up before the budget block (it drives, fuzzes 3000 steps and launches
  four jobs first); in isolation I could not make the midBridge view exceed 431. Unattributed.
* The stock test also gets the container's renderer killed for memory ("Target crashed") in its last (traffic) block on both `50a8ff6` and
  HEAD, so it never reports its traffic and console-error checks here. The renderer sits at ~2.4 GB RSS with SwiftShader (textures live
  in system RAM); JS heap is only ~80–90 MB.
* **Expected:** a budget gate that measures the same view the same way each time (settle ≥ 12 steps, or call range's cull directly; fresh
  state), so the 20-call headroom at midBridge/riversideMain3rd/scrapyardGate is meaningful.
* **Confidence:** CONFIRMED for the stale-cull effect and the isolated numbers; the +30 on the stock run is LIKELY state-dependent, unattributed.

## PERF-03 · MINOR · A second, unreferenced copy of the boot pack (3.46 MB) ships in the Steam build

* `assets/opt/boot.webp.pack.7444d6a7.bin` is byte-identical to `assets/opt/boot.webp.7444d6a7.bin` (`cmp` reports identical); the
  manifest names only the latter. Same for `boot.jpg.pack.9d994e31.bin` (3.56 MB). They are the only files in `assets/opt` not named in
  `assets/opt/manifest.json` (besides `.cache.json` and the manifest itself).
* `desktop/electron-builder.config.js:13` excludes `assets/opt/boot.jpg*` but not `boot.webp.pack.*`, so 3.46 MB of dead data goes
  into every desktop build; the web deploy (GitHub Pages) serves both (7.0 MB never fetched).
* **Cause:** `tools/build-assets.js:160-161` emits the pack as `boot.<fmt>.pack.<hash>.bin` and renames it to `boot.<fmt>.<hash>.bin`
  only if that file does not exist yet; when the hash is unchanged (incremental build) the `.pack.` copy is left behind, and the
  "delete outputs nobody references" sweep does not remove it.
* **Repro:** `cmp assets/opt/boot.webp.7444d6a7.bin assets/opt/boot.webp.pack.7444d6a7.bin && grep -c pack assets/opt/manifest.json`.
* **Confidence:** CONFIRMED.


## PERF-04 · MAJOR · Every armed character's gun meshes leak on the GPU: +18 geometries, ~2.8 MB heap per job, unbounded

* **What:** starting a job and leaving it (pause → Abandon job, or a finished/failed job returning to the hub) never frees the
  merged gun geometries that js/people.js builds for every armed enemy/crew member. Cycling all 34 registered jobs once
  (`node dev/audit/perf/leaks.js jobs --n=34`, evidence `docs/audit/perf/evidence/leaks-jobs.txt`): `renderer.info.memory.geometries`
  285 → 936, **exactly +18 per job, every job**; JS heap after forced GC 85 → 170 MB (+2.8 MB/job); renderer process RSS 2.40 → 2.97 GB.
  Nothing levels off. Repeating one job (`geo-leak.js --job=0 --n=5`): 305 → 584 geometries in 5 cycles.
* **Owner** (`dev/audit/perf/geo-leak.js` records every geometry the renderer draws and every `dispose()`): of the geometries still on
  the GPU but no longer in the scene, 50 are `…/Bip01_R_Hand/gunHold/rb_merged`, 25 `…/gunHold/rb_gunlod`, and the remaining
  ~15 per cycle are parts of the same third-person guns (`gun_shotgun/…/stock`, `pump`, sphere/lathe parts), about 10+5+3 per cycle.
* **Cause:** `js/people.js:281` (`mergeStatic` makes a new `BufferGeometry` per gun per character, `rb_merged`) and `js/people.js:306`
  (`buildGunLod`, `rb_gunlod`) allocate per character; when the job ends `clearChars()` (`index.html:1295`) calls `dudeFree()`
  (`index.html:1294`), which disposes only skeleton bone textures. three r128 keeps every undisposed geometry in
  `WebGLGeometries`/`WebGLAttributes` for the life of the renderer, so the GPU buffers and their CPU arrays are never released.
* **Player impact:** memory grows with every job attempt (retries included) over a session. A long Steam session (an evening of
  jobs + retries) keeps adding GPU buffers and heap; nothing returns it until the game is restarted.
* **Expected:** geometry count and heap return to the hub baseline after a job (dispose `rb_merged`/`rb_gunlod` and the per-character
  gun parts in `dudeFree`, or share one batched gun geometry per gun type).
* **Confidence:** CONFIRMED (two independent probes; the slope is identical across all 34 jobs).

## PERF-05 · MAJOR · 25 interior-furniture models are fetched as source files at boot: 404s and 25 console errors in the Steam build, +2.8 MB before Start on the web

* **What:** `js/world.js:306-309` (`loadExtras()`, called from `W.init` at boot) loads 25 models with a plain
  `new THREE.GLTFLoader().load('assets/home/<name>.glb')` (sofa, armchair, bookshelf, TV, fridge, bed, dartboard…). They are
  requested by **source path** before the asset manifest's URL modifier maps them to `assets/opt/home/*.{l,m}.glb`.
  * **Steam build:** `desktop/electron-builder.config.js` ships only `assets/opt/**` (+ fonts, credits) unless `HT_FULL_ASSETS=1`.
    Served that way (`node dev/audit/perf/desktop-sources.js`, run twice): **25 requests 404, 25 console errors** ("Failed to load
    resource… 404") on every launch, and world.js's `EXTRA` table settles with every model missing, so the job interiors that use
    them (world.js `partsOf` → `staticModel`/`place`, e.g. world.js:639) fall back to procedural boxes or skip the piece, unless
    `ASSETS.gltf(name)` happens to have the model already (only after the house has been entered).
  * **Web build:** the raw files (Sofa_01.glb 492 kB source vs 253 kB `l` / 109 kB `m`) come down at t ≈ 1.15–3.85 s, in parallel with
    the boot pack, on a 10 Mbit link: 2.8 MB that PERF.md says should never load before Start.
* **Load numbers now** (`tools/perf/measure.js --throttle --rafcap --nosw`, two runs, evidence `docs/audit/perf/evidence/load-*.json`):
  Start enabled at **6.93 s / 7.04 s**, **102 requests, 7.57 MB** before Start (unthrottled 4.49 s, 99 requests). docs/PERF.md
  records 3.8–4.2 s and 3.1–3.4 MB for the same measurement. Where the time goes: boot pack 2.51 MB (1.71 → 6.57 s; it shares the
  link with the furniture until 3.85 s), then `dad_player.l` + `anims.l` (0.92 MB, 5.60 → 6.71 s; PERF.md says they live in the boot
  pack) and Start at 7.0 s. Stage B's thug models and guns start right before Start and compete with it.
* **Introduced:** `12084fa` (2026-11-20, "New job: Small Talk") added `loadExtras`.
* **Expected:** no 404s or console errors in the shipped build; furniture loads through `ASSETS.gltf()` (optimised tier, on demand or in
  the job's group), not at boot.
* **Confidence:** CONFIRMED (404s and console errors reproduced twice; the visual fallback in a specific interior was not screenshotted, so
  "interiors lose furniture in the Steam build" is LIKELY).

## PERF-06 · BLOCKER (if real) · SUSPECTED · After a WebGL context loss the render loop died once: frozen game behind the dialog

* **What happened once:** `node dev/audit/perf/ctxloss-loop.js` (job 0, the page's real rAF loop, `WEBGL_lose_context`): while the
  context was lost a page error fired, `Cannot read properties of null (reading 'trim')`, and after `restoreContext()` and closing the
  pause menu the loop never ran again (0 loop callbacks, 0 renderer frames, simT frozen for 5 s). The "Graphics reset" dialog came up
  correctly before that. Output of that run:
  `lost: loop callbacks 2 … restored: loop callbacks 0 … after Esc resume: loop callbacks 0, renderer frames 0, simT +0.00`,
  `pageerror Cannot read properties of null (reading 'trim')`.
* **Not reproduced** in four further runs (job and free roam, with and without forcing a never-compiled material into the scene while
  lost): the loop keeps running, the context restores, programs recompile and the job continues.
* **Suspected cause:** three r128 reads `gl.getProgramInfoLog(program).trim()` / `getShaderInfoLog(...).trim()`; those return `null`
  on a lost context. `renderer.render()` skips while lost, but anything that compiles outside it (PMREM env-map rebuild when a light probe
  streams in, `renderer.compile`, an offscreen thumbnail/icon render) would throw from inside `frame()` (`index.html:4486-4505`) before
  its trailing `requestAnimationFrame(frame)`, ending the loop for good. `dev/release-ui.e2e.js` checks restore by calling
  `__ht.draw()` itself, so it would not notice a dead loop.
* **Confidence:** SUSPECTED (1 failure in 5 runs; the stack was not captured on the failing run). Worth a guard in `frame()` (try/finally
  around the body so the next frame is always requested).

## PERF-07 · MINOR · High preset is over the 450-call budget at most probes (pre-existing)

The 450 / 120 budget in `dev/openworld-ingame.js` is checked only at Medium and Low. At High, without the rack, mapleSE 523,
dadsAuto 465, midBridge 471, scrapyardGate 478, baseCenter 480 on `12dceec`, and the same on HEAD (461–636 with the rack). The
docs give no High budget; if 450 is meant for every preset, High misses it (far tree LOD and longer shadow range). Shadow calls stay
within 120 everywhere (max 98). CONFIRMED (two builds).

---

## Budget table (main-pass draw calls, worst of 4 headings; budget main ≤ 450, shadow ≤ 120)

`node dev/audit/perf/budget-probes.js --q=low,med,high --settle=12 --extra [--night=flash|nvg]` on HEAD and on `12dceec` (main two days
ago). The six probes are dev/openworld-ingame.js's; baseRange/baseCenter are two extra views on Fort Sensible. Evidence:
`docs/audit/perf/evidence/budgets-HEAD.txt`, `budgets-12dceec.txt`. **Bold** = over budget.

| probe | Low HEAD | Low 2 days ago | Med HEAD | Med 2 days ago | High HEAD | High 2 days ago | Med night + flashlight | Med night + NVG |
|---|---|---|---|---|---|---|---|---|
| home (Maple) | 270 | 270 | 304 | 304 | 361 | 361 | 292 | 292 |
| mapleSE | **580** | 400 | **583** | 421 | **636** | **523** | **623** | **623** |
| dadsAuto (Route 9) | 319 | 321 | 412 | 414 | **461** | **465** | 386 | 386 |
| midBridge | 344 | 345 | 410 | 411 | **466** | **471** | 394 | 394 |
| riversideMain3rd | 413 | 415 | 423 | 425 | 436 | 440 | 395 | 395 |
| scrapyardGate | 409 | 413 | 429 | 433 | **471** | **478** | 401 | 402 |
| baseRange (11 m from the rack) | **518** | 359 | **522** | 371 | **556** | 450 | **529** | **529** |
| baseCenter | **561** | 337 | **588** | 401 | **611** | **480** | **578** | **578** |
| shadow calls, worst | 77 | 77 | 78 | 78 | 98 | 98 | 78 | 78 |

Every new overage is PERF-01 (+342 when the rack is in range). Night + flashlight / NVG costs no extra draw calls (the light and the
goggles are uniforms and post, not passes); NVG and flashlight read the same.

Jet (air-check 100 ft, Medium): Maple 1167 (839 before the rack), base 691 (377), see PERF-01.

**Not re-measured:** each job's busiest moment (`--shots` points) and the finale wave. I ran out of time for 34 job play-throughs;
the leak run started every job and stepped it 120 frames without errors, but did not measure its peak scene.

## Leak / growth table

`node dev/audit/perf/leaks.js <scenario> --n=N`: after every cycle, two forced GCs (CDP), then JS heap, `renderer.info.memory`,
programs, scene objects, DOM elements, all DOM nodes incl. detached (CDP `Memory.getDOMCounters`), JS listeners, live intervals,
pending timeouts, AudioContexts, renderer/GPU process RSS. Slope = least squares over cycles 2..N. Evidence: `docs/audit/perf/evidence/leaks-*.txt`.

| scenario | cycles | geometries | textures | programs | heap MB/cycle | DOM / listeners / timers | verdict |
|---|---|---|---|---|---|---|---|
| start job → Esc → Quit to title → Continue | 6 (+8 in a first run) | flat (254) | flat | flat | +0.9, tapering | DOM flat; detached nodes +160/cycle (texture canvases and name tags, pruned by people.js after 90 frames); intervals 3, timeouts 0 | clean |
| every job once, Esc → Abandon | 34 | **+18 per job** | +0.3 | bounded (101→153 as new jobs bring shaders) | **+2.8** | DOM flat (614–630); JS listeners +16/job | **PERF-04** |
| fast travel home ↔ Community Center (corrected run, `evidence/leaks-travel2.txt`) | 8 | 258 → 296, levelling off | flat | +2 | **+2.2** | DOM flat; scene objects +45/cycle (`Mesh` +126, `dressing` +30 over the run) | SUSPECTED growth: scene objects and heap still rising after 8 round trips; too few cycles to say if it is unbounded |
| enter/exit a parked car | 12 | streaming growth (the loop also drove) | | | +0.6 | flat | inconclusive (see gaps) |
| tank board/exit (E) | 6 | flat (301) | flat | flat | +0.7 | flat | clean |
| jet board/exit (E) | 6 | flat (584) | flat | flat | +0.7 | flat | clean |
| eject (E E in the air), land, walk back | 4 | +1 | flat | flat | +0.9 | flat | clean |
| shop, garage shop, locker, map, calendar, pause | 7 | flat (256) | flat | flat | +0.8 | DOM flat (568), no stuck screens | clean |
| quit → title → New game → confirm | 6 | flat | flat | flat | +1.4 | detached +137/cycle (as the first row) | clean |
| day ↔ night with flashlight and NVG (×3 per cycle) | 6 | plateau after cycle 3 (344) | plateau | plateau (139) | plateau 99 MB | flat | clean |
| free roam, driving with traffic, 1 sample per simulated minute | 15 min | rises while new chunks stream, flat from minute 11 (1489) | flat from 11 | flat | flat from 11 (133 MB) | DOM flat | clean (the streamed world is kept, by design) |

The steady +0.7–0.9 MB/cycle in the clean rows did not show up in free roam once the map was streamed, so it tracks newly built content,
not time. Intervals stay at 3 and pending timeouts at 0–2 in every scenario; no unhandled promise rejections anywhere; zero console
errors in every leak run. The only console warnings are four "THREE.GLTFLoader: Custom UV sets in KHR_texture_transform not yet
supported" at boot.

## Stability

| check | result |
|---|---|
| WebGL context loss mid-job and restore | dialog shown, game paused, programs rebuilt, job continues (4 runs); once the loop died (PERF-06, SUSPECTED) |
| page frozen 20 s (CDP lifecycle frozen → active) | no position or job-timer jump; dt clamp 0.05 s holds |
| 3 s main-thread stall | no simulation jump (dt clamp) |
| AudioContext suspend → resume (all 3 contexts) | all back to running, no errors |
| system clock ±1 h / −2 h | saves still write; only cosmetic ids and the save's timestamp use `Date.now()` (overwatch.js:128 throttles a roof search on `Date.now()`, so a backwards clock change would delay that search, SUSPECTED, harmless) |
| frame-rate dependence, same inputs at 20 / 30 / 60 / 144 Hz (`fps-dep.js`, `fps-jump.js`) | walk 12.9 m and sprint 19.8 m in 3 s at every rate; jump peak 1.05 m, air 0.60–0.62 s; pistol reload 1.10–1.13 s; minivan 25.0 m/s after 4 s, 65.4–65.9 m; braking 12.4–12.9 m (±2.5%); steering yaw 1.03–1.06 rad (±2%); job timer exactly 10.0 s in 10 s. Frame-rate independent within 2.5%. |
| below 20 fps | simulation slows by design (dt clamped to 0.05 s in `frame()`, index.html:4488) |
| tab hidden for 5 minutes | not run at 5 minutes (20 s frozen run above); the web build stops rAF while hidden and dt is clamped, so a long hide behaves like the 20 s one; the desktop shell pauses on blur/visibilitychange (js/platform.js:76-80) |

## Load (web build, `tools/perf/measure.js`, gzip server, SwiftShader, 1280×720)

* First visit at 10 Mbit/s + 40 ms: Start at 6.93 / 7.04 s, 102 requests / 7.57 MB before Start; everything streamed after
  48–54 s, 207–210 requests / 28 MB. Unthrottled: Start at 4.49 s.
* Before Start: people 4.25 MB (9 req), `assets/home` source furniture 2.74 MB (25 req, PERF-05), boot pack 2.46 MB, guns 2.16 MB
  (3), optimised textures 0.81 MB (18), js 0.63 MB (24 scripts + 1 job file), index.html 0.19 MB, vendor three.js 0.19 MB gz (11),
  fonts 0.15 MB (7). 37 synchronous `<script>` tags (2.6 MB uncompressed) parse before anything runs.
* What blocks first interaction: Start waits for Stage A (boot pack) and the player model + animation set, which now load after the pack
  instead of inside it (5.6 → 6.7 s on the throttled run).
* Biggest safe cuts: (1) the 25 furniture source files at boot (2.8 MB, PERF-05); (2) put `dad_player` + `anims` back into the boot pack
  or start them in parallel with it (~1 s); (3) start Stage B thugs/guns after Start, not just before it; (4) the duplicate boot packs
  (PERF-03, 3.46 MB in the Steam build, 7 MB on the web host).
* Package: `assets/opt` 70 MB (465 files), js 4.3 MB, index.html 0.5 MB, vendor 0.9 MB, css 0.2 MB, fonts 0.2 MB. Largest items: boot
  packs (2 × 3.5 MB, one of each pair dead), `ph_bolt_rifle.l` 1.4 MB (+0.6 MB `m`), `anims.l` 1.2 MB, ~25 Rocketbox characters at
  0.6–0.8 MB each per tier.

## Covered and found clean

* The air-check / midBridge regression explained and bisected (PERF-01, PERF-02).
* Frame-rate independence of movement, jumping, driving, braking, steering, reloads and job timers.
* Vehicles (car, tank, jet, eject), menus, night switching, New game/Continue loops, free roam: no unbounded growth in GPU
  resources, DOM, listeners, intervals or timeouts (per-job geometry leak aside).
* Zero console errors and zero unhandled rejections in every probe run except PERF-05's 404s (Steam file set) and PERF-06's one page error.

## Not covered, and why

* **Each job's busiest moment and the finale wave** (budget table rows): not measured, out of time (one browser at a time, ~3 min
  per stepped job sample here).
* **Fast travel ×20 and car ×20:** the first fast-travel loop called `fastTravel` twice in one evaluate and the player never moved
  (travel completes asynchronously); the car loop drove the car each cycle, so world streaming confounds its numbers. Both are
  fixed in `leaks.js`. The corrected fast-travel run (8 round trips) is in the table; 20 round trips and a corrected car run were not done.
* **Tab hidden for a full 5 minutes**, real 30 vs 144 Hz displays, audio glitches by ear, and real-GPU VRAM: not possible headless.
  Frame-rate dependence was tested with stepped time instead.
* **Desktop (Electron) cold start** and its request list: not run here; the Steam file-set check was done by serving the repo the way
  electron-builder packages it.
* PERF-06's stack trace (the failing run did not capture it).

## Probes (all in `dev/audit/perf/`)

`air-probe.js` (air-check + midBridge with per-object draw attribution, `--deep`), `budget-probes.js` (budget views, rack attribution,
`--extra`, `--night`), `gun-where.js`, `mission-residue.js`, `van-in-view.js`, `midbridge-order.js`, `leaks.js` (all leak scenarios),
`geo-leak.js` (per-owner leaked geometries), `detached-dom.js` (heap-snapshot retainers), `stability.js`, `ctxloss-loop.js`,
`fps-dep.js`, `fps-jump.js`, `desktop-sources.js`.

## Counts

BLOCKER 0 confirmed (1 SUSPECTED: PERF-06) · MAJOR 3 (PERF-01, PERF-04, PERF-05) · MINOR 3 (PERF-02, PERF-03, PERF-07).

