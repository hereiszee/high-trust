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

<!-- FINDINGS -->
