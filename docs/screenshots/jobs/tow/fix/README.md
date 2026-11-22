# Hitch Happens: towing vs. the scenery (fix/tow)

The owner's report: *"cars are hard to take out because the fences and such get in the way. towing the cars thru streets can be hard
because parked cars are impossible to get around, and if you get stuck on a parked car it's very hard to get unstuck."*

All reproduction runs use real input: `page.keyboard` W/A/S/D/Space/E (or a fake standard pad through `navigator.getGamepads`) into the
game, with `__ht.step()` advancing the sim. The job's own bot is only used to get through the lot's talk scene to the open gate.
Scripts are in `dev/tow-fix/`. Raw before/after output is next to them (`before-*.txt`, `after-*.txt`).

## What was wrong, where (before)

| # | Where | What happened | Evidence |
|---|-------|---------------|----------|
| 1 | Every tow, any tight turn or reverse | **The towed car stayed a static collider while hooked.** Past ~70° hitch angle its corner overlapped the truck's rear collision probe, so the truck was shoved by, or wedged against, its own load. The hitch angle could reach 85° (clamp), so reversing with the wheel over always got there. | `pickup.js`: Hollis pull-out logged `truck touched impound:hollis` on every variant, plus 2 jack-knives while pulling out. `street.js` fold: truck touching its own car while driving away on all 3 streets. Node: rear probe vs towed OBB distance 1.06 m at 70°, 0.78 m at 85° (probe radius 1.045). |
| 2 | Ash St (427,73) and the 99 street (367,101) | **Nose into a kerbside parked car at walking pace, reverse, and you're stuck for good.** The towed car folded to 87° while reversing, the truck pinned against it and a fence/lamp. On Ash St a phantom "30 m/s hit" (push-out jump counted as speed) **snapped the hitch** too. Neither run got going again in 100 s. | `before-street.txt`: `ash-east hit` and `st99 hit` both `done:false, secs:100`; screenshots `before/ash-east-hit.jpg`, `before/st99-hit.jpg` |
| 3 | Oak St, Mrs. Kim's curb (340,17) | A parked car sits **in the kerb lane 9 m before her drop box** (collider x 328.5–333.5). The 10.8 m rig has to pass it in the oncoming lane and get the towed car back into a box that starts 4 m after it. | `map.js`, `geo.js` |
| 4 | The impound lot | **The swept path had about 0.6 m to spare.** The east gate post (318.8) and a street lamp inside the pen at (319,137) were 0.63 m from a truck backed up to the east column (317.1). The west post (311) and the office table also sat close. A hook-up 0.6 m off-line or 8° skewed (well inside the hitch zone) clipped a post, the lamp or the table on the way out. | `sweep.js` on the old code: 8 of 50 off-line extractions FAIL (`before-sweep.txt`, 8 of 50 with the probes modelled as `collide()` does (squares against box colliders): `pen@319.1,133`, `lamp@319,137`, `pen@309.6,133`) |
| 5 | The lot, cars 3–5 | **The Quik-Hook truck parked in the reversing path.** With nothing on your hook it "hangs back" within 30 m of you, which at the lot meant the stub between Dock St and the gate. | `pickup.js`: Benny 0/5 and Earl 0/5 hook-ups (blocked at the stub, `job-fence@316,127.8`) |
| 5b | Streets, cars 3–5 | Once within 30 m of you with nothing to tail, the Quik-Hook truck **stopped wherever it was**. After a drop, when you turn back for the lot, that was usually your lane, so it became a parked obstacle you had to get round. | `full-keys.js` trace: the empty truck stuck at (392.6,71) on Ash St behind it |
| 6 | Streets | **Traffic drove through the towed car.** The traffic only saw the player's own vehicle, not the car on the hook or the delivered cars at their curbs. | `index.html` traffic call `others:` list |
| 7 | Hitch-up | A quick press of E that got cancelled mid-hold (rolling, the prompt flicking to "Stop to hitch up") was remembered. The next release could read as a tap and put you out of the car. | `tow.js interact()` kept `S.eT` across a null/info prompt; seen in a harness run |
| 8 | Recovery | There was no way out of a wedge except driving out of it. A snapped or jack-knifed car had to be lined up again from scratch. | n/a |

## What changed

**Tow physics (`js/tow.js`, the tow rig only):**
- While hooked, the towed car's static collider is parked off-world (`colOff`, restored by `syncCar` on detach). It still collides with the world through its own probes, and the traffic sees it (below). It can no longer block or pin its own truck.
- Soft stop on the hitch angle at **62°**, well short of the truck's own corner. Reversing past 38° now self-straightens (castor), so backing straight always recovers. A jack-knife (the hitch lets go) needs a real fishtail: over 60° at 7.5 m/s or more. Reversing never jack-knifes.
- A **snap** needs a real crash (14 m/s, was 9). The towed body's hit speed is capped by what the truck can give it (|v|×1.6+1.5), so the push-out re-aim is no longer read as a crash.
- Tighter tracking (axle at 0.62 × length behind the hitch, was 0.75; off-tracking in a 90° turn at 10 m/s is 0.67 m). The towed collision probes are 0.12 m slimmer than the body each side.
- Generous hitch zone: **3.2 m and 38°** (was 2.5 m / 30°). The winch pulls it the rest of the way into line.
- **Parked cars yield to the rig.** When the truck or towed body leans on a world-parked car (`L.cars`, plus the job's delivered cars via `Tow.yielders`) at walking pace (≤4.5 m/s), the parked car slides mostly sideways toward its kerb at 1.1 m/s, up to 2.6 m, and only where it has room. It comes with a scrape, a 0.8 hp knock to the towed car and a `yield` event. `Tow.reset()` (the job's end) puts every nudged car back.
- **Reset the rig.** After 3 s on the throttle with under 0.7 m of progress, the action helper offers **Hold E (pad: its Use glyph) · Reset the rig**, plus a "Stuck?" HUD meter. A 0.8 s hold fades the screen and puts the truck on the nearest clear right-hand lane spot within 70 m, facing along the road (preferring its current heading), with the car hooked straight behind. Both footprints are checked clear before placing. If the car came off (snap/jack-knife), the same prompt reads **Re-hitch … · reset the rig** for 20 s and puts it back on the hook.
- The E hold forgets a half-counted press when the prompt goes away (fixes the unexpected "get out").
- The hitch-angle meter's red band says "Full lock" at low speed and "Jackknife!" only at speed.

**The job (`js/jobs/tow.js`):**
- Lot: the gate now spans 309.2–318.9 (was 310.9–318.9) and opens flat against the side walls. Both car columns moved 0.8 m west (312.6 / 316.3; the east column now lines up with River Rd's northbound lane). The office table moved 0.9 m west. The clearance to the posts, the east wall and the pen's lamp is now about 1.4 m. The scenery stays (same fence, lamp and tent).
- The Quik-Hook truck, with nothing to tail, drives back to wait on Dock St's far kerb (339,124.9), off the lot approach and the turn out, and picks up your tail when you hook the next car. It no longer stops in your lane on the way back.
- Parked cars within 16 m of an owner's curb are taken off the street for the job (hidden, collider and camera/bullet meshes off, removed from `L.cars`) and restored when the job ends. That is only the Oak St car by Mrs. Kim's curb.
- `M.trafficCars` (the delivered cars and any loose ones) goes to the traffic as obstacles.
- Events: `reset` costs **8 s** of the sweeping clock (feed line "Rig reset · −8 s"), with one quip each for `stuck`, `reset` and `yield`. The drop box action is marked `prefer`, so "Drop it" wins over "Reset" when you're stopped in the box.
- Timers/pay unchanged (12:00 sweep, gold under 9:00, $80/car). The routes didn't get longer, and the lot and Kim's curb got easier. A reset costs 8 s, so a couple of resets still fit inside the gold time.

**Shared code (`index.html`), gated to towing:** the traffic `others:` list gets `owTowOthers()`, which is the car on `HT.Tow.link` plus the job's `M.trafficCars`. It's empty when nothing is being towed and the job isn't Hitch Happens.

## After

| Check | Before | After |
|-------|--------|-------|
| `pickup.js --var=all`: real-key back-up, hold E, pull out, 5 cars × 5 line-ups (on line, ±0.7 m, ±7°) | Benny 0/5 and Earl 0/5 hitched (the Quik-Hook truck in the stub); Hollis: truck touching its own car on every pull-out, 2 jack-knives | **25/25 hitched and out**, no touches of their own car. The only contact left is the Quik-Hook truck brushing past on Dock St as the rig turns out (it spawns mid-test here). |
| `sweep.js`: extraction swept path, 5 cars × 2 exits × 5 hook-up offsets (±0.6 m, ±8°), static colliders | 8 of 50 overlap (east gate post, pen lamp, west gate post) | **50/50 clear** |
| `street.js`: pass / nose-in + reverse out / full-lock fold, on Oak St (Kim), Ash St (427,73) and the 99 street (367,101) | 2 of 9 stuck for 100 s (Ash St and 99 street nose-ins), 1 snapped hitch, own-car contact in every fold | **9/9 done, none stuck, no snaps.** Reversing out takes 1.5–1.7 s. The parked car slides 1.5 m toward the kerb. Fold peaks at the soft stop. |
| `full-keys.js`: whole towing part with real keys, all 5 cars (wedge + Reset, nose-in + yield, passes at (427,73) and (367,101)) | n/a | **won**, silver, $1,783, 605 of 720 s used, cars 95–100%. Reset was offered 4.1 s into the deliberate wedge and cost 8.9 s. |
| `full-keys.js --pad`: the same with a fake standard pad only (stick, RT/LT, hold Y) | n/a | **won**, silver, $1,783, 614 of 720 s, cars 92–100% (the deliberate wedge didn't jam with the feathered stick, so Reset wasn't exercised on the pad) |
| `node dev/tow.test.js` | | 8/8 (updated: no lock or jackknife in a full-lock reverse; self-straightening; snap at 15 m/s; hitch zone 3.1/3.3 m, 37/39°) |
| `node dev/jobs-check.js tow --retry --replay` | | all ok |

Screenshots: `before/*.jpg` and `after/*.jpg` (street cases `<street>-pass|hit|fold`, pick-ups `<car>-a-reversing / -b-hitched / -c-pulling-out`, the full key run `fix-*.jpg`), `after-pad/` (the pad run).

## Known weaknesses

- The towed body's push-out still rotates it past the 62° soft stop when it's shoved hard against something (up to ~79° seen). It no longer pins the truck, because the towed car isn't a collider for it.
- Parked cars yield only while towing and at walking pace. An empty truck still has to steer round them like any car.
- Kerbside cars on these 6 m streets stick about 1 m into the lane, so passing one means using some of the oncoming lane. Oncoming traffic now sees the rig and waits, but this headless world had no traffic on the test streets, so the "doesn't box you in" behaviour is from the code path, not an observed run.
- "Reset the rig" is offered after 3 s of no progress on the throttle. Pressing the truck against a lamp at full lock counts. That's intended: it's an offer, and nothing happens unless you hold Use.
- The real-key driver in `full-keys.js` is a scripted thumb. It still clips corner lamps now and then, and when it does it uses Reset as a player would.
