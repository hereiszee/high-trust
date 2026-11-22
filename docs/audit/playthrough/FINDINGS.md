# Playthrough audit: the whole game in order, as a new player

Branch `audit/playthrough`. Auditor scope: start from a brand-new save, take every story job in the order the game offers it, through to the *Everybody Waves* finale brief, and record what the player is told at every step. All runs use headless Chromium with SwiftShader, one browser at a time.

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 2 |
| MINOR | 6 |

Headline: the story **can** be finished from a fresh save with no dead end. Both trust gates and the finale gate are reachable without grinding. The problems are in **guidance**:
- **Dad Taxi**, a required story job, is never signposted (PT-01).
- The "Follow the yellow marker" arrow points at the **nearest** giver of any kind, so it often sends the player to repeatables (PT-02).

## How it was played

| Script (all under `dev/audit/playthrough/`) | What it does | Output |
|---|---|---|
| `story-walk.js` | Fresh save, stepped time. At every hub step it records the objective panel, the yellow marker, every giver ring (and its locked tag), available/locked jobs, and home-offered jobs. It picks the job the **marker** points at (falling back to the panel's list when the marker is on a repeatable, and to home jobs only when nothing else is signposted), presses a **real `E` key** at the giver, accepts the brief, and drives the van into the ring with a route bot. Registered jobs are played by their own scripted player (`test.step`), built-in jobs are closed with `__ht.jobs.finish(true)`. It then reads the result card, trust, cash, day and any card that follows. | `docs/audit/playthrough/story-walk-run1.txt` / `.json` (full run, 27 story jobs, then the finale brief); `story-walk-run2-partial.txt` (second run, identical through job 10, then the container OOM-killed the browser during job 11) |
| `taxi-signpost.js` | Repro for PT-01 and PT-03 | `taxi-signpost-run1.txt`, `taxi-signpost-run2.txt`, `taxi-accepted-stale-objective.jpg` |
| `first15.js` | The first minutes with real keyboard and mouse only | `first15-log.txt`, `first15-*.jpg` |
| `dump-jobs.js` | Every MISSIONS entry: giver, hood, unlock, `winTrust`, `from` | `jobs-table.json` |

Order the game led to (run 1):

gary → hoa → rick *(Act 2 card, bridge opens)* → earl → dee → pawn → crossing → tow → sabotage → rosa → moving → benny → tail → overwatch → arrest → dave → cargo → mower → doug → talk → heist → duke *(finale line appears)* → cones → brake → roundup → **taxi (only by going home and trying the fridge)** → bike → finale brief, offered by the family at home.

Console errors over the whole run: 0.

---

## MAJOR

### PT-01 Dad Taxi is a required story job that the game never points to
- **Severity:** MAJOR. Arguably a blocker for a player who never presses E on the fridge: the finale needs Dad Taxi, and Chain Reaction is locked behind it.
- **Confidence:** CONFIRMED. `taxi-signpost.js` was run twice with identical output, and the full walk logged the same at all 25 hub steps where Dad Taxi was available.

**Repro:** `node dev/audit/playthrough/taxi-signpost.js`. From a fresh save it wins Return to Sender, then reads the hub, goes home, and presses E at the fridge.

**Expected:** after job 1, something tells the player that Jen left a list, for example an objective line, a radio line, a marker home, or a fridge prompt that names the job.

**What happens:**
- In the hub after job 1 the objective is `Maple Heights | Coach Rick has a job for you | Barb has a job for you | Follow the yellow marker.` Nothing mentions Jen, the fridge or a list. The walk logged `NOTE home story job taxi@fridge is available but the objective panel does not mention it` at every one of steps 1–25.
- At home the objective is `Gun locker in the garage · laptop on the kitchen desk | B · decorate the house`. The fridge prompt reads **"Root beer · the fridge calendar"**. Pressing E there opens the **Dad Taxi** brief.
- At walk step 25 the panel reads "Finale: 25 of 27 jobs · Maple trust 80/80 · Riverside trust 80/80". No line names what is missing. The marker points at a repeatable (Suds Up). Tyler's giver (Chain Reaction) does not exist until Dad Taxi is done.
- So the player sees **25/27 with no story giver anywhere** and nothing to follow.

**Aggravating:** at home, the fridge (1.35, 4.62, r 1.0), the wall calendar (1.45, 4.8, r 0.6) and the laptop (1.95, 5.25, r 1.1) overlap, and the dog roams there. Probes 0.4 m from the fridge got "Laptop · shop on Dadazon" or "Pet Biscuit" instead. See `js/home.js:654-782`.

**Suspected cause:**
- `wmHubGivers` (`index.html:4227-4244`) only writes objective lines for givers standing in the world. Home jobs (`def.from.home`) get no line.
- `jrHomeGiver` (`index.html:4402`) only fires on E.
- The fridge label is hard-coded at `index.html:3091`.
- Porch Light (the laptop) has the same gap but is a repeatable.

### PT-02 The yellow marker points at the nearest giver of any kind, so repeatables beat story jobs
- **Severity:** MAJOR. The objective always ends "Follow the yellow marker."
- **Confidence:** CONFIRMED. Run 1 and run 2 show it at the same step (7), and the cause is plain in the code.

**Repro:** `node dev/audit/playthrough/story-walk.js` and grep the output for `REPEATABLE`.

**Expected:** the marker leads to the next story job, or at least to a story job.

**What happens:** in run 1 the marker pointed at a **repeatable** while story jobs were waiting at 10 of 27 hub steps:

| Step | Marker pointed at |
|---|---|
| 7, 12, 15, 24, 25 | Suds Up |
| 18, 19, 21, 23 | Mower Time Trial |
| 26 | Honey-Do Blitz |

- At step 25 the only story job left was Dad Taxi, and the marker sat on Suds Up.
- After job 1 it points at Barb's side job rather than Coach Rick's job, which is the one that opens the bridge (run 1, step 1).
- Big Dave's own Maple raid (job 3) never got the marker in 15 steps. The marker kept pulling the player across the river.

**Suspected cause:** `wmHubUpdate` sorts `npcs` by distance each frame (`index.html:4290`). The only priority is `n.prefer`, which covers Earl before job 4. `updHub` then targets the first npc (`index.html:2717`). There is no story-before-repeatable ordering, and a locked giver can be first too.

---

## MINOR

### PT-03 After accepting a job at home, the objective panel still lists other givers
- **Confidence:** CONFIRMED (`taxi-signpost.js`, 2 runs).
- **Repro:** same script. Three seconds of play after taking Dad Taxi at the fridge and leaving by the front door, the panel still shows `Maple Heights | Coach Rick has a job for you | Barb has a job for you | Follow the yellow marker.`
  - The kicker already says "New job · Maple Heights, all of it".
  - The marker says Minivan.
  - Evidence: `taxi-accepted-stale-objective.jpg`.
- **Expected:** "Dad Taxi · Get in the minivan · Drive the crew to …", as after a world giver.
- **When it clears:** only when you get in a car, because `objKey` changes then.
- **Suspected cause:**
  - In `enterHub`, `wmHubEnter()` → `jrHubEnter()` sets `JOB` and calls `hubObj()` (`index.html:4406`).
  - Then `wmHubGivers()` (`index.html:1899`) overwrites the panel with `setObj`.
  - `objKey` is left equal to `JOB|false`, so `hubObj()` never re-applies.
  - The same path serves Porch Light.

### PT-04 Unlocked story jobs are hidden behind another job on the same spot, and the panel never says so
- **Confidence:** CONFIRMED (run 1 log, the lines `available story jobs with no giver standing right now`).
- **What happens:** jobs that share a giver's spot "take turns" (`index.html:4232`, `4338`).
  - **Cone Zone** unlocks at step 12 (Following Distance + Brain Freeze done). It cannot be taken until step 22, because Earl's spot is held by the **locked** Duke giver ("Earl · after Maple Heights is done").
  - Mower was hidden behind Big Dave's raid from step 3 to 17.
  - Higher Ground was hidden behind Following Distance (Doug).
  - Handle With Care was hidden behind Big Dave's raid.
- Not a dead end, since each one frees up later. But a locked giver should not block an unlocked job, and the player is never told a second job is waiting.

### PT-05 "… has a job for you in Riverside Flats" for givers who stand in Maple Heights
- **Confidence:** CONFIRMED (run 1, steps 13, 16, 22).
- **What happens:** the objective names Riverside for three givers who stand in Maple Heights:

| Giver | Job | Where the giver stands |
|---|---|---|
| Big Dave | Handle With Care | 41, 65 |
| Doug | Higher Ground | 89, 37 |
| Coach Rick | Brake Check | 75, 49 |

- **Cause:** `index.html:4240` uses the job's `hood`, not where the giver stands.

### PT-06 The locked-giver line teaches mechanics that don't exist
- **Confidence:** LIKELY. The text is confirmed in code; I did not reach it in play.
- **Text:** a Riverside giver under his trust gate says *"Help out a little. Scrub a wall. Wave at people."* (`index.html:4238`).
- **Why it's wrong:**
  - There is no scrub interaction. `SAVE.world.scrubbed` / `scrubTrust` exist (`js/save.js:216`), but nothing in `index.html` or `js/` writes them.
  - There is no wave input (`js/keys.js` ACTIONS).
  - The finale hint "Raise Riverside trust: zip-ties, repeat jobs, helping out" (`index.html:4252`) is just as vague.
- **When a player sees it:** the gates are always met when playing in order (Riverside 19 ≥ 15, 33 ≥ 25, 47 ≥ 35, 61 ≥ 50 from base wins alone). So the line shows only after losing trust, for example −10 for shooting a surrendered enemy (`index.html:2251`). That is exactly when the player needs advice that works.

### PT-07 There is no Act 3 beat
- **Confidence:** CONFIRMED (run 1: `act 2` from step 3 to the finale).
- **Expected:** an Act 3 card. Act 2 gets a full card ("Act 2 · One week later · The bridge is open").
- **What happens:**
  - Act 3 (*Good People Stay*, SPEC3) has no card, no banner and no radio beat.
  - `prog.act` never becomes 3, and `js/save.js:311` clamps it to 2 on load anyway.
  - The SPEC3 Act 3 jobs (brake, roundup, bike, heist, sabotage, arrest) unlock in the middle of Act 2 on `done` ids alone.
  - The only signal is the "Finale: n of 27" line after the Duke.
- The Wholesaler, the Act 3 antagonist, is named only if the player reaches rapport 95 in Small Talk (`js/jobs/talk.js:429`). Otherwise the finale brief is the first time anyone mentions him.

### PT-08 The west edge of town can be reached on foot and shows flat backdrop houses
- **Confidence:** SUSPECTED.
- **Evidence:** `first15-07-van.jpg`. The player is at x 0.3, z 15.8, about 37 m west of the house, on open grass with blocky, low-detail houses.
- **Why only suspected:** the walk there was an accident of my real-input script (mouse look stopped responding in the headless no-pointer-lock fallback, so W walked straight west). A second probe (`west-edge.js`) was blocked at x 25.6 before reaching it.
- **Needs:** a person with a real mouse to walk west from the house and check whether a boundary or dressing is missing.

---

## Trust economy (from the full run)

Start: Maple 12, Riverside 5. Measured changes per job (run 1; run 2 matched for the first 10 jobs):

| Job | Maple | Riverside | Notes |
|---|---|---|---|
| gary | +16 | | |
| hoa | +9 | +3 | |
| rick | +16 | | |
| earl | | +14 | |
| dee | | +14 | |
| pawn | | +14 | |
| crossing | | +29 | |
| tow | | +21 | 4 zip-ties |
| tail | +14 | | |
| dave | +16 | | |
| cargo | +5 | | |
| mower | +12 | | 2 zip-ties |

- Riverside hit **100 after job 8** and Maple **100 after job 18**. Every job after that was capped. Unclamped `M.trustGain` from run 2: sabotage 18, rosa 14, tow 24.
- **Lethal floor (no zip-ties, base wins only):**

| | Built-in raids | Fixed registered wins | Total |
|---|---|---|---|
| Maple | 12 + 16 + 16 + 16 + 8 (Doug as boss, not cuffed) | hoa 6, tail 10, bike 6, heist 16 | **≈ 106** |
| Riverside | 5 + 14 × 4 + 8 (Duke) | overwatch 6, sabotage 10, crossing 3, moving 6, arrest 8, pawn 14, cones 14 | **≈ 130** |

- So **the 80/80 finale gate is reachable without grinding**, even for a strictly lethal player. The repeatables are never needed.
- Gates checked:
  - The Riverside built-in gates (15/25/35/50) are always met on arrival.
  - Hitch Happens (R ≥ 20), Grand Opening (R ≥ 30) and Heavy Lifting (R ≥ 40) were open the moment their other requirements were.
  - The Small Talk zip-tie gate is signposted in the objective ("Small Talk (Gary): zip-tie 10 people alive · 0/10" from step 5) and by Gary's radio line.

## Covered and found clean
- The bridge opens after job 2 (Coach Rick). The Act 2 card shows with the right text and `bridge true` from step 3.
- The finale requirement (27 story jobs + 80/80) is signposted after the Duke:
  - "Finale: n of 27 jobs · …" in the panel;
  - "The festival: go home and talk to the family" with the marker on "Home · the family";
  - "The family wants to talk: press E near Jen or the kids" at home;
  - E on the family offers the *Everybody Waves* brief.
- No givers stacked within 2 m and no character visible twice at any of the 28 hub steps. One Dave and one Doug.
- No job appeared twice. Every job the marker or panel offered could be started from its giver with a real E key, and its ring started the job.
- Every job ended won and paid. The day advanced on every story win.
- The objective while driving names the job's place, and the marker follows it.
- First minutes, real inputs:
  - The title focuses "Clock in" when there is no save.
  - Hints run in order (look → walk → jog → talk → van → drive) and each cleared when done.
  - E at Gary opens the brief, and Enter accepts it ("Load the van").
  - The objective switches to "Get in the minivan / Drive the crew to …" and the marker to Minivan.

## Could not cover
- **The 15-minute real-input session got only as far as walking from the accepted brief to the van** (about 4 minutes of play). Headless Chromium refuses pointer lock. After the brief closes, the cursor-free mouse-look fallback stopped turning the camera (the yaw stayed fixed in `west-edge.js` too), so a scripted player can't steer by mouse past that point. Real pointer lock and the fallback after a brief need a human check. I am not filing the fallback as a game defect because it only applies when pointer lock is refused.
- **Built-in jobs were closed with `finish(true)`, not played**, so this audit says nothing about their difficulty, and their trust numbers are base wins only. Hitch Happens' bot lost in run 2 and was closed the same way; it won in run 1.
- **The finale itself, the post-game and repeatables after the story** were not played. The walk stops at the finale brief; the finale is covered by `dev/jobs/` and its checkpoints.
- **"Not yet" decline flows** were not re-tested. `dev/release-ui.e2e.js` covers them.
- **Zip-tie, shops, calendar, night/goggles, mower and base explanations:**
  - Zip-ties are taught by a hint and a tip.
  - The calendar is reached only through the fridge or desk prompt.
  - Goggles exist only in the Hank's Hardware → Gadgets shop.
  - I did not walk the shops or Fort Sensible.
- **Run 2 is partial:** the container killed the browser for lack of memory during job 11. Run 1 covers the rest.
