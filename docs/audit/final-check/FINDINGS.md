# Final check: fixed bugs on the merged build, and the drag strip

Build: `origin/main` @ `0013c04` (branch `audit/final-check` is that commit plus these files). Headless Chromium + SwiftShader, one browser at
a time, Chromium killed between runs (`dev/audit/final-check/run-queue.sh`). Raw logs of every run: `dev/audit/final-check/out/`.

## Part 1: are the fixed BLOCKER / MAJOR findings still fixed?

Result key: FIXED = the bad behaviour no longer occurs. Evidence = the run that shows it (log under `dev/audit/final-check/out/<name>.txt`).

| Finding | Area | Sev | Result | Evidence |
|---|---|---|---|---|
| W-14 | world | BLOCKER | FIXED | `kid-boxed.e2e.js` and `kids-safe.e2e.js` (all ok): a kid/daughter whose model never loads stays hidden and retrying, never boxed, still protected; Q refused 8 m away; pistol/beanbag/van: no hit |
| J-01 | jobs | BLOCKER | FIXED | `repro-gunnull-freeze.js tow` and `porch`: "PASS J-01: no throw, the disarmed enemy stays unarmed"; `repro-moving-fresh.js`: Heavy Lifting won by its bot, no page errors; `ai.test.js` disarmed-enemy block 4/4 ok |
| IN-01 | input | BLOCKER | FIXED | `input-blockers.e2e.js` (24 ok, all ok): pad raises the Crossing Guard sign |
| IN-02 | input | BLOCKER | FIXED | same run: holding Y hitches the car, a tap gets out |
| IN-03 | input | BLOCKER | FIXED | same run: Aim on Mouse 5 / a key raises the sign |
| IN-04 | input | BLOCKER | FIXED | same run: pad B opens/closes Decorate, the panel shows pad buttons only |
| P-1 | code (paperwork) | BLOCKER | FIXED | docs/steam/STORE.md:143-153 now declares Pre-Generated AI content for code, dialogue and UI text |
| PERF-06 | perf | BLOCKER (suspected) | FIXED | its regression test, run as `dev/audit/final-check/ctxloss-frame-domclick.js --n=12` (a copy identical but for a DOM click on New game, see Not covered): forced null shader log + real `WEBGL_lose_context` lose/restore 12 times, "render loop alive after every cycle (12 cycles, dead 0)", no uncaught "trim" error | |
| C-1 | code | MAJOR | FIXED | `input-blockers.e2e.js` C-1 ×3 ok (defaults, Fire/Aim swapped, Fire on J: a click asks for pointer lock, no aim). The old `c1-rebind-lock.js` still prints 0 lock requests for the 2nd/3rd case: its stub rejects the first request, which sets `lockFailed` and the game's deliberate cursor-free fallback (index.html:2038) takes over; a real browser grants the lock, so this is the probe, not the game |
| C-2 | code | MAJOR | FIXED | `c2-chute-quit.js`: after Quit to title chute null, after Continue on the ground at home (31,19); `base-reset.js` all ok |
| W-01 | world | MAJOR | FIXED | `fasttravel.e2e.js`: on foot far from the van it refuses ("Fast travel is by minivan…"), moved 0 m |
| W-02 | world | MAJOR | FIXED | same: tank and jet don't move; a borrowed sedan is refused with a line |
| W-03 | world | MAJOR | FIXED | `traffic-peds.e2e.js`: 0/4 drove through a crew member, a kid, a neighbour; no hit reactions |
| W-12 | world | MAJOR | FIXED | `fasttravel.e2e.js`: fade lifts only with 0 unbuilt within 120 m; `base-arrive.e2e.js`: ground under the camera on the first frame |
| W-13 | world | MAJOR | FIXED | `borrow-repair.e2e.js`: prompt shows in the borrowed sedan, Repair tab is for it, 45 → 100 HP, +1 trust once |
| PT-01 | playthrough | MAJOR | FIXED | `guidance.e2e.js` (all passed): after job 1 the marker and first line point home to Dad Taxi; real E at the fridge opens its brief |
| PT-02 | playthrough | MAJOR | FIXED | `guidance.e2e.js`: at every story step, standing at side giver Hank, the marker stays on the next story job; `story-walk.js` (the original repro) ran 23 hub steps with 0 REPEATABLE markers before Chromium was OOM-killed at Heavy Lifting |
| SAV-01 | saves | MAJOR | FIXED | `aim-toggle.e2e.js`: clicking Hold in the real pause pane switches it and saves it; Toggle default; scope/breath/camera/tank sight follow it |
| SAV-02 | saves | MAJOR | FIXED | `base-check.js`: "the borrow is on disk at once (0 → 1) and meets ACH_BORROWED", "wheels-up counts the flight on disk (0 → 1) and meets ACH_CLEARED_FOR_TAKEOFF" (desktop: `desktop-tankjet.js` under xvfb: tank borrow on disk 1 after Quit to desktop; its jet line FAILs because the probe only sits in the jet, and the fix (rightly) counts a flight at wheels-up, not on entering, which `base-check.js` verifies) |
| SAV-03 | saves | MAJOR | FIXED | `fpscap.test.js` + `fpscap-sim.js`: 75/90/144/165 Hz give 75/90/120/144 at caps 120/144 (no more 60) |
| SAV-04 | saves | MAJOR | FIXED | `job-rollback.e2e.js` (all ok): quit/abandon/fail roll zip-ties and trust back, disk keeps the pre-job counts, a win commits |
| SAV-05 | saves | MAJOR | FIXED | `check-build.js`: "notices and credits OK"; js/credits.js credits nisu for the carbine, Amal Kumar present |
| PERF-01 | perf | MAJOR | FIXED | `budget-probes.js --q=med`: mapleSE main 431 (≤ 450), rack calls 0 at every probe |
| PERF-04 | perf | MAJOR | FIXED | `geo-leak.js --job=0 --n=5` (the original repro, same job 5×): geometries 452 → 560 → 594 → 632 → **633**, levelling off (was 305 → 584 and climbing); `leaks.js jobs --n=8`: 345 flat over jobs 2–5, 369 flat over 6–8. Still 27 geometries never disposed after 5 cycles (4 `gunHold/rb_merged`, a few thug meshes): a bounded residue, not the per-job leak | |
| PERF-05 | perf | MAJOR | FIXED | `desktop-sources.js`: 0 requests for files the Steam build doesn't ship, 0 console errors. Its regression test `extras-lazy.e2e.js` passed its first check (nothing from assets/home before Start) and then timed out twice on Playwright's New game click (see Not covered) |
| IN-05 … IN-15 | input | MAJOR | FIXED | `input-majors.e2e.js` (all ok): IN-05 ×4, IN-06 ×5, IN-07, IN-08 ×2, IN-09 ×4, IN-10, IN-11, IN-12 ×2, IN-13, IN-14 ×4, IN-15 (and IN-15 again in input-blockers) |
| IN-16 | input | MAJOR | FIXED | `prompt-sweep.js`: 110 strings name an input, 0 still read as keyboard/mouse on the pad |
| IN-17 | input | MAJOR | FIXED | `layout.js deck --shots` → docs/audit/final-check/in17-deck-jet.jpg: the feed sits bottom right, clear of the teach box and the heading tape |
| J-02 | jobs | MAJOR | FIXED | `repro-roundup-lot.js`: "PASS J-02: the stealth HUD and every guard are back after Retry from The lot" |
| J-03 | jobs | MAJOR | FIXED | `repro-overwatch-loadout.js`: "PASS overwatch: no loadout or overlay leak after abandoning on the roof" |
| J-04 | jobs | MAJOR | FIXED | `repro-fail-pay.js porch 5`: +$34 total over 5 deliberate fails (was $40 × trust each); `save.test.js` "gas money once per job per day" ok |
| P-2 | code (paperwork) | MAJOR | FIXED | js/credits.js names nisu, Amal Kumar; `check-build.js` credits OK |
| P-3 | code (paperwork) | MAJOR | FIXED | assets/credits/THIRD-PARTY-NOTICES.txt:5-6, 86-90 cover Electron/Chromium/Node; `check-build.js` notices OK |
| P-4 | code (paperwork) | MAJOR | FIXED | STORE.md:26 "27 story jobs and a festival finale"; `store-claims.test.js` all ok |
| P-5 | code (paperwork) | MAJOR | FIXED | `store-claims.test.js`: LICENSE, electron-builder copyright and package.json author all hereiszee; appId/RELEASE_APP_ID/depot ids listed as owner inputs in CHECKLIST.md (still unset: an owner input, not a defect) |

Counts: 45 findings checked (8 BLOCKER, 37 MAJOR, counting IN-05 … IN-15 one by one): **45 FIXED, 0 STILL BROKEN, 0 REGRESSED DIFFERENTLY, 0 COULD NOT RUN**.

### Still broken or regressed

None. No BLOCKER or MAJOR finding reproduces on `0013c04`, and none came back in a different form. Two probes read the wrong way round on the fixed build and are explained in the table (C-1's stubbed lock, SAV-02's desktop probe that only sits in the jet).

### The once-each runs the brief asked for

| Run | Result |
|---|---|
| `node dev/run-tests.js` | all 88 passed |
| `dev/jobs-registry.test.js` | 9/9 |
| `dev/save.test.js` | 43/43 |
| `dev/prompt-sweep.js` | 110 strings, 0 keyboard/mouse words on the pad |
| `jobs-check` porch, taxi, crossing, tow, overwatch, moving, roundup, finale | all 8 "all ok": scripted win, paid, saved, no console errors |
| extra: `fpscap.test.js`, `store-claims.test.js`, `check-build.js`, `edge-bounds.e2e.js`, `release-ui.e2e.js` (2nd run), `dragstrip-check.js` | all ok |
| extra: `ai.test.js --quick` | 62 passed, 2 failed: The Kingpin scripted dad wins 3/6, and "alerted enemies end in cover that blocks the dad's line of sight" 74% for Doug's job. Balance checks on a quick (6-seed) run, not in any finding's scope; the J-01 block passes |
| extra: `base-check.js` (17 min, run once) | 91 ok, 2 FAIL not tied to any finding: "with the child gone it fires again" (the test removes the kid from the scene by hand, not through HT.People, so it may still count as near) and "and jogged up (4.5 m)" (crew distance after the jet lands far out). Not rerun (time); SUSPECTED harness, worth one rerun |

### Linux packaged e2e (CI run 45025851858)

* **Which click:** `desktop/test/e2e.js:134`, `await p.click('.ht-pause [data-tab=keys]')` (the "Controls & keys" tab) right after the
  resolution scale is set back to 100%. Playwright resolved the button and waited 30 s for it to be "visible, enabled and stable".
* **Verdict: test timing, not a game defect.** (1) The re-run of the same job on the same commit passed (job 137220916505, attempt 2,
  success, every step through "packaged build refuses --remote-debugging-port"). (2) Nothing between the last green commit `3541439`
  and `0013c04` touches the pause menu or the settings (index.html changed one line, `carStats` absGrip; the rest is the drag strip).
  (3) Playwright's "stable" check needs two animation frames with the same box; under xvfb + software GL the first frames at full
  resolution after the scale change can take long enough to miss 30 s. Making the test wait for a rendered frame after the scale change
  (or `click({timeout:90000})`) would stop it.
* **Local packaged build** (`npm ci && npm run dist:linux`, then `xvfb-run -a -s "-screen 0 1600x900x24" node test/e2e.js --exe
  dist/linux-unpacked/HighTrust`, twice): run 1 passed every step the CI run failed on and on to "no missing game files" (24 ok), then the
  "Quit to desktop" click lost a race with the app closing ("Target page, context or browser has been closed", which is the expected
  exit); run 2 timed out on the title's New game click. Both are the same slow-click pattern this container shows on every test that runs
  the page's real render loop (also `extras-lazy`, `ctxloss-frame`), so they say nothing against the build.

## Part 2: the drag strip

Read js/dragstrip.js, js/dragsim.js, docs/dragstrip.md; ran `dev/dragstrip-check.js travel,tune,red,race,bets,caps,quit,pad` (all ok) and
four new scripts in `dev/audit/final-check/` (`strip-loss-dodge.js`, `strip-fairness.js`, `strip-edges.js`, `strip-oldsave.js`).

**Count: 0 BLOCKER, 1 MAJOR (DS-1), 2 MINOR.**

### DS-1 · MAJOR · A losing race or bet can be walked away from at no cost, so strip betting has no downside · CONFIRMED (run 3 times)

* **What:** the entry, the rental and the stake of a bet on yourself are only taken in `settleRace()` when the race is over
  (js/dragstrip.js:423-438); nothing is held when the race starts (`newRun`, :340). A race that ends any other way changes no money: Quit
  to title (`reset()`, :646), or simply never letting go of the brake ("asleep", `endRun` :377/:416). A player sees they have lost before
  the finish (their own red bulb, or the other car pulling away) and can bail. A spectator bet behaves the same way: its stake is only
  settled in the watch result (:557), so pausing mid-race (P) and quitting to title cancels it.
* **Repro:** `node dev/audit/final-check/strip-loss-dodge.js` (real keys and clicks: E at the office window, number keys in the menus,
  Space/W at the tree, Esc and the pause/title buttons). Fresh save, $1,500, at the strip; race Dutch in a rented hatchback with the
  biggest offered bet on yourself ($100):
  * control: red light on purpose, played out → LOSS, cash 1500 → 1355 (Rental −20, Entry −25, bet −100)
  * A: red light on purpose (the red bulb is lit, the loss is certain), Esc → Quit to title → Continue → cash 1355 → **1355**
  * B: never let go of the brake (Space held; the opponent runs his pass) → "asleep" after 8 s → cash **unchanged**
  * C (`… strip-loss-dodge.js cd`): $100 on a spectator race, P mid-race → Quit to title → Continue → cash **unchanged**, no settlement
  Output: `dev/audit/final-check/out/strip-dodge-r1.txt`, `strip-dodge-r2.txt` (control/A/B both times), `strip-cd.txt`,
  `strip-cd-3.txt`, `strip-cd-4.txt` (C, three runs; `strip-cd-2.txt` is an earlier probe bug: it picked a stake the booth had disabled).
* **Expected:** a certain loss costs what a played-out loss costs (take entry, rental and stake when the race is staged / the bet is
  placed, refund only if the game itself aborts it), or the bet stands and is settled by the model if the player leaves.
* **Impact:** the daily caps still bound what you can *win* (+$300 bets, $400 purses), but the −$200 daily loss cap, every entry and
  every rental become optional, and with a self-bet a red light or a bad launch is free. Combined with the history-based self-bet price
  (below) a player can bank the +$300 bet cap every in-game day with no risk. docs/dragstrip.md says quitting "changes no money" as a
  design choice; the gap is that the player chooses *after* seeing the outcome.

### Minor (one line each)

* Self-bet price comes from your last 12 passes, test & tune included: deliberately slow/red-lit test & tune passes move the price vs
  Priya from x1.05 to x4.11 and vs June from x2.5 to x10 (EV 3.9 / 3.7 per $1 if you then drive clean). Bounded by the +$300/day cap; the
  doc lists it as a weakness (`strip-fairness.js` section 4).
* The booth's price is 240 (self) / 500 (spectator) simulated races with a fresh seed each time it is asked, so re-asking reprices: for
  Walt vs Priya p ranged 0.268–0.380 over 40 asks; the best ask pays above fair (EV 1.02–1.06 per $1), and a lopsided favourite at the
  x1.05 floor with p ≈ 0.99 is +EV (1.04). Bounded by the caps.

### Checked and clean

* **Fairness** (`dev/audit/final-check/strip-fairness.js`, pure Node, output `strip-fairness.out.txt`): stated odds vs 5,000 fresh races
  for Walt–Priya, Dutch–Marisol, June–Rook, Tomás–Priya, and a spec-car pair: every |diff| ≤ 0.015, inside 3 SE. A red light always
  loses: the red lane won 0 of 2,504 one-red races; when both are red the first jump won 0 of 871. Upgrades: engine 1/2/3 and tyres
  1/2 each quicker than stock, all four 9.00 s vs 9.95 s; armour 2 and the bull bar slower; every loaner/rental spec is stock
  (`own:false`, no upgrades) and the owned car with no upgrades equals the stock loaner.
* **Money rules in the page** (`dragstrip-check.js race,bets,caps`): cash moves by exactly the settlement; a loss costs rental + entry +
  bet; first-win bonus once; repeat win capped at the $400 day cap; bets stop at −$200 / +$300 a day; no stake below the $150 floor or
  without the cash.
* **Day counter:** `SAVE.day` only advances on the first completion of a story job (js/save.js:390, `!replay && story`), so the caps
  can't be reset by waiting, replays or repeatables.
* **Quit mid-race** leaves no run, loaner, HUD or menu behind and no ladder change (`dragstrip-check.js quit`).
* **Controller only** (`dragstrip-check.js pad`, scripted pad): A opens the picker, D-pad moves, the teach line names A and RT, a pass to
  the slip, D-pad to Done, A returns the loaner; menu footer names pad buttons only.
* **The map's growth to 152 rows** (`strip-edges.js`, run twice, shots `docs/audit/final-check/edge-south-*.jpg`): held W due south on foot
  and in the minivan at x 60, 200 (the base fence stops you at z 250), 292 (river bank), 330 and 420 (east of the river): every run stops
  inside the map at z ≈ 300 of 304, on grass with trees, no void past the old row-128 edge. (Its "ray down" column reads null everywhere,
  including the base lot: a probe fault, the screenshots show the ground. Its 10 console errors are that probe's own sprite raycasts.)
* **A save from before the strip** (`strip-oldsave.js`, the all-done fixture with no `strip` key, 27,376 cash, day 17): Continue keeps the
  cash and day, `SAVE.strip` gets its defaults, the office and the car picker open, 0 console errors. (`strip-edges.js` part 2 tried this by
  reloading the page and is not valid: the page's unload flush overwrote the fixture.)


## Not covered

* **Drag strip, not run in game** (code read only, nothing seen wrong): keyboard-only with Use/Fire/Aim rebound (the strip reads the
  canonical keys after HT.Keys' door remapping, js/dragstrip.js:356, so rebinding should carry through; prompts come from `HT.Keys.label`);
  starting a job, entering home, the tank/jet, death or arrest mid-race (all go through `HT.Base` `reset`, :646); alt-tab mid-race (blur
  releases the keys, the race runs on; no money path); guns on the property (`holster` at :608); traffic/pedestrians (the strip is not in
  `def.roads`); children (spectators come from adult pools, fenced in); mower rental (free by design); the bracket-night forfeit case
  (`strip-loss-dodge.js` scenario D did not get a bracket offered in time; the same settle-at-the-end code applies, so DS-1 most likely
  covers it, unverified); the minimap/full-map pin and fast travel to the strip beyond what `dragstrip-check.js travel` covers.
* **Tests that drive the page's real render loop** time out on Playwright's New game click in this container (main thread busy on
  SwiftShader): `extras-lazy.e2e.js` (2/2), `ctxloss-frame.e2e.js` (2/2, run instead as a DOM-click copy, see PERF-06), the local Linux
  e2e run 2. `release-ui.e2e.js` failed the same way once and passed on its rerun.
* `base-check.js`'s two FAILs (above) were seen once and not rerun (17-minute run).
* `story-walk.js` (PT-02's original repro) was OOM-killed at step 23 of the story; `guidance.e2e.js` covers the whole order.
* Several original repro scripts overwrite their own evidence files under `docs/audit/<area>/` when run; those changes were reverted, not
  committed. Logs of every run here are in `dev/audit/final-check/out/`.
