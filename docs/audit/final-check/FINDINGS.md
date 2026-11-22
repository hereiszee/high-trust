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
| PERF-06 | perf | BLOCKER (suspected) | __PERF06__ |
| C-1 | code | MAJOR | FIXED | `input-blockers.e2e.js` C-1 ×3 ok (defaults, Fire/Aim swapped, Fire on J: a click asks for pointer lock, no aim). The old `c1-rebind-lock.js` still prints 0 lock requests for the 2nd/3rd case: its stub rejects the first request, which sets `lockFailed` and the game's deliberate cursor-free fallback (index.html:2038) takes over; a real browser grants the lock, so this is the probe, not the game |
| C-2 | code | MAJOR | FIXED | `c2-chute-quit.js`: after Quit to title chute null, after Continue on the ground at home (31,19); `base-reset.js` all ok |
| W-01 | world | MAJOR | FIXED | `fasttravel.e2e.js`: on foot far from the van it refuses ("Fast travel is by minivan…"), moved 0 m |
| W-02 | world | MAJOR | FIXED | same: tank and jet don't move; a borrowed sedan is refused with a line |
| W-03 | world | MAJOR | FIXED | `traffic-peds.e2e.js`: 0/4 drove through a crew member, a kid, a neighbour; no hit reactions |
| W-12 | world | MAJOR | FIXED | `fasttravel.e2e.js`: fade lifts only with 0 unbuilt within 120 m; `base-arrive.e2e.js`: ground under the camera on the first frame |
| W-13 | world | MAJOR | FIXED | `borrow-repair.e2e.js`: prompt shows in the borrowed sedan, Repair tab is for it, 45 → 100 HP, +1 trust once |
| PT-01 | playthrough | MAJOR | FIXED | `guidance.e2e.js` (all passed): after job 1 the marker and first line point home to Dad Taxi; real E at the fridge opens its brief |
| PT-02 | playthrough | MAJOR | FIXED | `guidance.e2e.js`: at every story step, standing at side giver Hank, the marker stays on the next story job__PT02__ |
| SAV-01 | saves | MAJOR | FIXED | `aim-toggle.e2e.js`: clicking Hold in the real pause pane switches it and saves it; Toggle default; scope/breath/camera/tank sight follow it |
| SAV-02 | saves | MAJOR | FIXED | `base-check.js`: "the borrow is on disk at once (0 → 1) and meets ACH_BORROWED", "wheels-up counts the flight on disk (0 → 1) and meets ACH_CLEARED_FOR_TAKEOFF" (desktop: __TANKJET__) |
| SAV-03 | saves | MAJOR | FIXED | `fpscap.test.js` + `fpscap-sim.js`: 75/90/144/165 Hz give 75/90/120/144 at caps 120/144 (no more 60) |
| SAV-04 | saves | MAJOR | FIXED | `job-rollback.e2e.js` (all ok): quit/abandon/fail roll zip-ties and trust back, disk keeps the pre-job counts, a win commits |
| SAV-05 | saves | MAJOR | FIXED | `check-build.js`: "notices and credits OK"; js/credits.js credits nisu for the carbine, Amal Kumar present |
| PERF-01 | perf | MAJOR | FIXED | `budget-probes.js --q=med`: mapleSE main 431 (≤ 450), rack calls 0 at every probe |
| PERF-04 | perf | MAJOR | __PERF04__ |
| PERF-05 | perf | MAJOR | FIXED | `desktop-sources.js`: 0 requests for files the Steam build doesn't ship, 0 console errors__PERF05__ |
| IN-05 … IN-15 | input | MAJOR | FIXED | `input-majors.e2e.js` (all ok): IN-05 ×4, IN-06 ×5, IN-07, IN-08 ×2, IN-09 ×4, IN-10, IN-11, IN-12 ×2, IN-13, IN-14 ×4, IN-15 (and IN-15 again in input-blockers) |
| IN-16 | input | MAJOR | FIXED | `prompt-sweep.js`: 110 strings name an input, 0 still read as keyboard/mouse on the pad |
| IN-17 | input | MAJOR | FIXED | `layout.js deck --shots` → docs/audit/input/layout/deck-jet.jpg: the feed sits bottom right, clear of the teach box and the heading tape |
| J-02 | jobs | MAJOR | FIXED | `repro-roundup-lot.js`: "PASS J-02: the stealth HUD and every guard are back after Retry from The lot" |
| J-03 | jobs | MAJOR | FIXED | `repro-overwatch-loadout.js`: "PASS overwatch: no loadout or overlay leak after abandoning on the roof" |
| J-04 | jobs | MAJOR | FIXED | `repro-fail-pay.js porch 5`: +$34 total over 5 deliberate fails (was $40 × trust each); `save.test.js` "gas money once per job per day" ok |
| P-2 | code (paperwork) | MAJOR | FIXED | js/credits.js names nisu, Amal Kumar; `check-build.js` credits OK |
| P-3 | code (paperwork) | MAJOR | FIXED | assets/credits/THIRD-PARTY-NOTICES.txt:5-6, 86-90 cover Electron/Chromium/Node; `check-build.js` notices OK |
| P-4 | code (paperwork) | MAJOR | FIXED | STORE.md:26 "27 story jobs and a festival finale"; `store-claims.test.js` all ok |
| P-5 | code (paperwork) | MAJOR | FIXED | `store-claims.test.js`: LICENSE, electron-builder copyright and package.json author all hereiszee; appId/RELEASE_APP_ID/depot ids listed as owner inputs in CHECKLIST.md (still unset: an owner input, not a defect) |

Counts: __COUNTS__

### Still broken or regressed

__PART1_BROKEN__

### The once-each runs the brief asked for

__PART1_RUNS__

### Linux packaged e2e (CI run 45025851858)

__LINUX__

## Part 2: the drag strip

__PART2__

## Not covered

__GAPS__
