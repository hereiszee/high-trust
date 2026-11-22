# Audit: jobs, the unhappy paths

Branch `audit/jobs`. Auditor area: every mission's fail, retry, restart, quit, pause, reload and replay paths, and leaks from one job into the next.

All scripts are in `dev/audit/jobs/`. They run headless Chromium with SwiftShader through `dev/ai-ingame-lib.js`, one browser at a time.

- **Real input:** the title button, Escape for pause, the pause menu buttons, the quit dialog, and the fail-card buttons are all real key presses and mouse clicks.
- **Harness:** the jobs' own scripted players (`test.step`) and `__ht.step` advance the game.
- **Logs:** raw probe logs are in `docs/audit/jobs/logs/`.

| script | what it does |
|---|---|
| `probe.js <id> --quit=go\|abandon\|title\|reload` | For every stage: the bot plays to the stage, the stage is failed one way (rotating: player down, leaving the job, vehicle destroyed, the bot's own fail), the fail card is read, and **Retry from <stage>** is clicked. The last stage uses **Restart job**. Then the probe leaves the job the chosen way and compares the hub with the hub before the job. |
| `runall.sh <quit>` | `probe.js` over every registered job |
| `pairs.js A B --a=fail\|abandon` | Job B after job A against job B in a clean session |
| `repro-*.js` | One script per finding below |

Severity follows the brief: BLOCKER, MAJOR, MINOR.

## Findings

Counts: **1 BLOCKER, 3 MAJOR, 3 MINOR**, plus 1 SUSPECTED (J-08) that is not counted. Each entry names its reproducing script, and every script's output is quoted.

### J-01 · BLOCKER · A disarmed job enemy crashes the AI on the next gunshot, which stops the game loop

- **Confidence:** the exception is CONFIRMED (a unit repro, plus 3 of 3 natural runs of *Heavy Lifting*). The frozen game is LIKELY: it follows from the code, and real-time rendering here is too slow to watch it happen.
- **Where:** jobs spawn an enemy and disarm it in the same frame, with `a.equip(e.dude,null); e.gun=null`:
  - `moving.js:558`, `:565`
  - `porch.js:160`, `:188`
  - `tow.js:397`
  - `mower.js:403`
  - `brake.js:521`
  - `cones.js:608`
  - `arrest.js:394`
  - `overwatch.js:506`
  - `_finale-street.js:202`, `:261`
- **What happens:** while that enemy has no AI memory yet (`e.ai` unset), the next player or crew shot in the mission runs `aiShot` (index.html:2401), then `AI.shotFired` (ai.js:655), then `memOf(a)`. In `memOf` (ai.js:387), `typeof null==='object'` gives `gun=null`, and `mag:gun.mag` (ai.js:390) throws `TypeError: Cannot read properties of null (reading 'mag')`.
- **Why it freezes:** `frame()` (index.html:4486-4501) has no try/catch and calls `requestAnimationFrame(frame)` as its last line. The throw ends the loop, so the picture freezes mid-job. The only way out is a reload, and the job is lost.
- **Reproduce:**
  1. `node dev/audit/jobs/repro-gunnull-freeze.js tow`. It spawns and disarms one enemy exactly the way the jobs do, then makes the same `AI.shotFired` call a gunshot makes. Output:
     ```
     setup {"mode":"mission","squads":true,"nav":true,"eAi":false,"cur":"pistol"}
     a gunshot near the disarmed enemy: {"threw":"Cannot read properties of null (reading 'mag')","at":"TypeError: ... at memOf (ai.js:390:134) | at AI.shotFired (ai.js:655:56)"}
     ```
  2. Natural play: `node dev/audit/jobs/probe.js moving --quit=abandon`. The job's own bot plays and the crew shoots. It threw 3 out of 3 times, each time after a stage retry ("unload" once, "couch" twice). Logs: `logs/moving.abandon.log`, `moving.abandon2.log`, `moving.title.log`. The stack is the same every time: `memOf ← AI.shotFired ← aiShot ← shootAt (index.html:2272)`, so a crew member's shot triggers it.
  3. `repro-moving-fresh.js` is the control run with no retry: it played start to finish (unload → couch → piano → won, 186 s) with no throw, so the job's normal path is fine. The retry path is the trigger: restored stages spawn and disarm hostiles before their first think. Any other job that does the same during a firefight is exposed: `tow.js:397` Lyle, `brake.js:521`, `cones.js:608`, `arrest.js:394`.
- **Expected:** a disarmed enemy is ignored by the shot-noise pass, and the game never stops.
- **Suspected fix area:** `memOf` (use a pistol when `a.gun` is null), or skip `gun==null` in `shotFired`. A try/catch around the frame body would turn every future error of this kind into a log line instead of a freeze.

### J-02 · MAJOR · Minivan Roundup: "Retry from The lot" brings the job back with no stealth HUD

- **Confidence:** CONFIRMED (2 runs).
- **What happens:** the guards' sight and detection overlay (`roundup-stealth`) is mounted only by `stealthHud()`. That is called only from `lotBegin()` (roundup.js:516), which needs `M.ph==='gate'`. A retry restores `ph='lot'` through `applyLoad()` (roundup.js:887), and the HUD is never mounted. The player is back in the stealth section with nothing telling them how close they are to being seen. One guard fewer is also restored: 4 the first time, 3 after the retry.
- **Reproduce:** `node dev/audit/jobs/repro-roundup-lot.js`. The retry is a real click on the fail card. Output:
  ```
  first time in the lot {"stage":"lot","ph":"lot","alarm":false,"stealth":true,"shud":true,"overlay":true,"guards":4}
  fail card ["Head home","Retry from The lot","Restart job"]
  2 s after "Retry from The lot" {"stage":"lot","ph":"lot","alarm":false,"stealth":true,"shud":false,"overlay":false,"guards":3}
  20 s later {... "shud":false,"overlay":false,"guards":3}
  ```
  The probe sweep found the same (`logs/roundup.abandon.log`: overlays `["roundup-stealth"]` before the fail and `[]` after the retry).

### J-03 · MAJOR · Higher Ground: "Abandon job" on the roof leaves the hub loadout corrupted

- **Confidence:** CONFIRMED (2 of 2 runs, plus the overwatch → finale pair).
- **What happens:**
  - On the roof the job borrows your guns (`borrowRifle`, overwatch.js:155).
  - Pause → **Abandon job** does not run `end()`. Instead, the job's `hud` safety net (overwatch.js:693) calls `returnRifle()` on the first real frame after `enterHub()` has already set the hub loadout.
  - `returnRifle()` (overwatch.js:159-164) clears all three slots and `give()`s the *mission* loadout back. The result in the hub is `{"side":null,"p1":"rifle","p2":null,"undefined":"pistol"}` instead of `{"side":"pistol","p1":null,"p2":null}`: no sidearm, a rifle the player may not own yet, and a junk `undefined` slot.
  - Two mission HUD widgets also stay up in the hub (`widgets` 0 → 2).
  - If the next job starts before a frame runs, the same safety net overwrites *that* job's loadout. Seen in `pairs.js overwatch finale --a=abandon`: the finale started with `{"side":null,"p1":"rifle",...,"undefined":"pistol"}`.
- **Not affected:** failing and choosing "Head home" is fine, because `end()` returns the rifle while the job is still current.
- **Reproduce:** `node dev/audit/jobs/repro-leftover.js overwatch garden abandon`. The bot climbs to the roof, then real Escape and a real click on "Abandon job". Output:
  ```
  mid-job: night {"target":0,"k":0} overlays ["overwatch"] fov 74
  Abandon clicked true
  hub after leaving vs hub before the job: {"loadout":["{\"side\":\"pistol\",\"p1\":null,\"p2\":null}","{\"side\":null,\"p1\":\"rifle\",\"p2\":null,\"undefined\":\"pistol\"}"],"widgets":[0,2]}
  ```
  With `home` instead of `abandon`: `{"widgets":[0,2]}`, and the loadout is clean.
- **Suspected cause:** the safety net runs against a world that has already moved on. `returnRifle` should only restore into the job's own `M`, or the core should give jobs an `abandon`/`cleanup` call before `enterHub()`. The same pattern is the hub hook in `crossing.js:855`, `heist.js:962`, `pawn.js:941`, `sabotage.js:625` and `arrest.js:902`; those clean up props and overlays only, and were clean in the sweeps.

### J-04 · MAJOR · Deliberately failing a job is an uncapped cash loop

- **Confidence:** CONFIRMED (the script plus the code).
- **What happens:** every failed run pays "Gas money" of $40, scaled by the trust multiplier (save.js:791), and Retry restarts the job at once. Walking 30 m off the site fails any non-roaming job in 8 seconds (index.html:3866). Replays are not halved either, because gas money does not use `k`.
- **Reproduce:** `node dev/audit/jobs/repro-fail-pay.js rick 4`. Each loop walks 80 m off the site, waits 8 s for the leave-the-job fail, then clicks the retry button on the fail card. Output:
  ```
  fail 1 {"state":"lost","secs":8,"pay":34,"lines":["Gas money 40","Neighbors are nervous -6"]} cash now 34
  ...
  cash 0 -> 136 (+136) after 4 deliberate fails, 32 s of game time
  ```
  That is about $250 a minute of game time. A whole Riverside job pays $400-700 for several minutes of play, and the shop sells upgrades for a few hundred dollars.
- **Expected:** no pay, or pay only once per job per day, for a fail with no progress.

### J-05 · MINOR · Small Talk: "Retry from The walk up" skips the walk and never marks "The conversation" checkpoint

- **Confidence:** CONFIRMED (2 runs).
- **What happens:**
  - `load()` (talk.js:266) stores the walk-up snapshot in `M.resume`.
  - The first `upd` (talk.js:257) calls `sitDown(M, resume)`, so the dad is put straight into the chair (`seated:true` one frame after the retry).
  - `sitDown` marks the `talk` checkpoint only when `resume` is falsy (talk.js:320), so it is never marked.
  - Every later fail in the conversation offers "Retry from The walk up", and the result card calls it the wrong stage. The resume line plays as well ("Take two. Page three.").
  - The chair spot also differs: (55.5, 66) after the retry against (56.4, 67.1) normally.
- **Reproduce:** `node dev/audit/jobs/repro-talk-retry.js`. Output:
  ```
  1 control: seated by the bot {"stage":"talk","ph":"talk","seated":true,"pos":[56.4,67.1],"snaps":["arrive","talk"]}
  2 one frame after "Retry from The walk up" {"stage":"arrive","ph":"talk","seated":true,"pos":[55.5,66],"el":0,"snaps":["arrive"]}
  3 fail card in the conversation offers ["Head home","Retry from The walk up","Restart job"]
  ```

### J-06 · MINOR · After "Quit to title" in the session the game was started in, the title has no Continue, only "Clock in"

- **Confidence:** CONFIRMED.
- **What happens:** `hasSave()` needs `SAVEM.lastLoad.status!=='fresh'`, and a game started this session stays `fresh` until a reload. The quit dialog says "Everything from finished jobs and purchases is saved". The player then finds only "Clock in", the new-game button, focused and with no Continue.
- **Is anything lost?** No. Pressing it re-enters the hub with the progress kept, because `metaTitleAction` does nothing when `!hasSave()`. After a reload, "Continue 1/9 jobs · $500" is back. A player who believes the save is gone may still quit the game, or press "Clock in" expecting a wipe.
- **Reproduce:** `node dev/audit/jobs/repro-title-continue.js`. Screenshot: `docs/audit/jobs/title-after-quit.jpg`. Output:
  ```
  title after quitting {"mode":"title","btns":["newgame:Clock in","settings:Settings","credits:Credits & licences"],"focus":"Clock in","cash":500,"status":"fresh"}
  after Enter on the focused button {"mode":"hub","cash":500,"done0":true}
  after a reload {"btns":["continue:Continue1/9 jobs · $500","newgame:New game",...]}
  ```

### J-07 · MINOR · The "You left the job" fail line blames Doug in every job

- **Confidence:** CONFIRMED by reading the code; the script output shows the line.
- **What happens:** `wmLeaving` (index.html:3868) always says "The crew went home. Doug left a note on your windshield." The line shows on solo jobs, on jobs before you have met Doug, on Barb's and Jen's jobs, and on Riverside jobs with Earl or Rosa.
- **Reproduce:** the output of `repro-fail-pay.js` above, or leave any non-roaming job for 8 s.


### J-08 · SUSPECTED · Minivan Roundup: after "Retry from Convoy out", the job's bot never reaches "The driveways"

- **Seen:** in 2 probe runs (`logs/roundup.abandon.log` and `roundup.title.log`). After the retry, the job's own bot drove for 15000 frames (534 s of game time) and stayed in `convoy`. In the control run the convoy takes 78 s.
- **Not confirmed:** the dedicated repro (`repro-roundup-convoy.js`) restored correctly to `ph:convoy` with all five vans `convoy/park`, then the headless tab ran out of memory before the drive finished. The retry also restored 0 of the 3 enemies present at the first convoy start.
- **Could be the bot:** it may simply not handle the restored state. A human should drive one convoy retry.

## Per-job results

How to read the table:

- **Fail ways:** `down` = the player-down path (`endMission` with the death line), `leave` = walk or drive 260 m off the site for 14 s, `car` = the vehicle destroyed, `bot` = the job's own scripted fail.
- **n/a:** that way cannot fail this stage by design (roaming jobs, or no vehicle).
- **retry** = real click on "Retry from <stage>". **restart** = real click on "Restart job". After each, the stage and job state were checked, along with props (`WM.objs`), enemies, crew and overlays against the first visit to that stage.
- **Leave columns** compare the hub with the hub before the job, after these exits: Esc → Abandon job; Esc → Quit to title → confirm → title → Continue (or "Clock in", see J-06); fail → Head home; a page reload mid-job → Continue.
- **"bot won"** means the job's scripted player finished the job before the probe could leave it that way.
- **OOM** means the headless tab ran out of memory while rendering. Each was rerun alone at least once; see the gaps section.

| job | stages: fail way → card → retry/restart | abandon | quit to title | head home | reload | pairs |
|---|---|---|---|---|---|---|
| porch | deliveries down→ok·retry ok · pirates leave n/a, bot→ok·restart ok | ok | ok | ok | ok | — |
| talk | arrive down→ok·retry **J-05** · talk: bot won from arrive | bot won | bot won | — | ok | — |
| blitz | belt down ok·retry ok · blitz leave n/a, bot ok·restart ok | ok | ok | — | — | — |
| tow | lot/car1-5/sal: down, car, bot all fail→retry ok · leave n/a (roam) · restart ok | ok | ok | — | ok | tow→cargo ok |
| mower | pick down ok·retry ok · quali leave ok·retry ok · race car n/a, bot won | — | OOM after win | — | — | mower→carwash ok |
| taxi | run down ok·retry ok · bikes leave n/a·retry ok · back car ok·restart ok | ok | ok | — | ok | crossing→taxi ok |
| overwatch | ladder down ok · garden leave n/a · court car n/a · church bot ok · car down ok · all retry ok · restart ok | **J-03** | ok | ok | ok | overwatch→finale **J-03** |
| hoa | stakeout down ok·retry ok · meeting: no way fails it (soft) | ok | OOM ×2 (render in meeting) | — | OOM | tail→hoa ok |
| tail | gas down · tail leave · swap car n/a · drop bot won · all retry ok | ok | ok | — | ok | tail→hoa ok |
| sabotage | approach/job1-4/exfil: down, leave, bot fail→retry ok · car n/a · restart ok | ok | ok | — | ok | sabotage→heist ok |
| cargo | load down ok·retry ok · drive leave n/a · bridge car ok·retry ok · party: bot can't fail | ok | ok | — | ok | tow→cargo, cargo→roundup ok |
| moving | unload down ok·retry ok · couch leave n/a·retry ok → **J-01** throw | crashed (J-01) | crashed (J-01) | — | — | — |
| cones | build down ok·retry ok · convoy leave n/a·restart ok | ok | ok | — | — | — |
| crossing | gear down · main leave · corner bot · mill down: all fail→retry ok · river car n/a · restart ok | ok | ok | — | ok | crossing→taxi ok |
| brake | huddle down ok·retry ok · chase leave n/a · collar car ok·restart ok | ok | ok | — | — | — |
| bike | rack down ok·retry ok · leads leave n/a·retry ok · later stages: bot won | bot won | bot won | — | — | — |
| arrest | market down ok·retry ok · aside leave ok·restart ok | ok | ok | — | — | — |
| pawn | party down ok · office leave ok · exit car n/a · retry ok · restart ok | ok | ok | — | — | — |
| heist | scope down ok·retry ok · gear leave n/a → bot to getaway·retry ok | bot won | bot won | — | ok | sabotage→heist ok |
| carwash | setup down ok·retry ok · wash leave n/a·restart ok | ok | ok | — | — | mower→carwash ok |
| patrol | route down ok·restart ok | ok | ok | — | — | — |
| roundup | gate down ok·retry ok · lot retry **J-02** · convoy car ok·retry **J-08?** | ok | OOM | — | OOM | cargo→roundup ok |
| finale | plan down ok·retry ok · tail leave n/a · bot won to festival | — | — | OOM | — | overwatch→finale **J-03** |
| gary rick dave rosa benny duke (built-in) | one stage: down ok → "Retry" ok | — | — | ok (rings rebuilt, no props left) | — | — |
| doug earl dee (built-in) | down ok → card ok | — | — | OOM | — | — |


## Covered and clean

- **Fail cards.** Every registered job with stages offers "Head home", "Retry from <last stage>" and "Restart job". Built-ins offer "Head home" and "Retry". Every retry and restart came back running at the right stage, with the same number of job props (`WM.objs`), crew and job overlays as the first visit, and no duplicated props. The exceptions are J-02 and J-05.
- **Gold medal rule.** Gold is capped after a stage retry (`medalOf`, `_registry.js:82`) and replays pay half (`M.rerun`). Both are checked by `jobs-check --retry --replay` and agree with the code. Restart from the beginning clears `retried`, so gold stays possible.
- **Leaving a job.** Abandon, quit to title and Continue, and Head home all clean up the hub, apart from J-03. Checked: night back to day (the crossing dawn and the heist/sabotage night), no job overlays left, fov back to 74, no held keys, crew and enemies cleared, job props out of the scene, traffic on, the van present. Jobs that hang their cleanup on the `hud` hook (crossing, sabotage, heist, pawn, arrest) do clean up on the first real frame. My first sweep reported crossing leaving night and an overlay behind, but that was a harness artefact: `__ht.step` never runs `hud()`. `repro-leftover.js crossing main abandon` confirms the cleanup.
- **Pause.** Esc mid-stage opens pause with "Abandon job" and "Quit to title". Quitting asks first ("Quit to title?" with "Keep playing" focused). Esc on a result card does not open pause.
- **Reload mid-job, then Continue.** Tested on porch, talk, tow, taxi, overwatch, tail, sabotage, cargo, crossing and heist. The hub is clean and nothing from the job persists, apart from what QA-- **SwiftShader memory.** Rendering a frame in some late stages crashed the headless tab ("Target crashed") when run alone, at least twice each: hoa (meeting), roundup (convoy), and doug, earl and dee after a fail. Those exits (quit to title, reload, Head home) are unverified for those jobs. I do not report these as bugs.
- **J-01 freeze.** That the real `requestAnimationFrame` loop dies is inferred from the code. Live rendering here runs at about 2 fps, too slow to show it reliably. The exception itself is confirmed.
- **Pointer lock and real-time timers.** Real pointer lock and alt-tab (`visibilitychange`) on a real window were not covered. The desktop shell pauses on blur and visibility (`platform.js:79`). On the web, timers are frame-based, so they stop with the tab. Some job lines use `setTimeout` (`hoa.js:351` ends the stakeout 2.5 s later even while paused), which is SUSPECTED minor and not pursued.
- **Fail ways specific to one job.** Escort down, wrong choice and target lost come from each job's own `test.step({fail:true})`. Where the bot's "fail" instead won or ran ahead (tail drop, bike, heist, talk), those stages got only the generic down and leave fails.
- **Mashing E on overlapping prompts, and dying in odd places.** Not done by hand. The hold and tap list is a single `F.prompt` per frame.
- **Calendar replay (e).** Only via the existing `jobs-check --replay`, not re-run here.
- **Missing finale stages.** Its "roof" through "festival" stages were played by its bot without a fail at each one. `dev/jobs/finale-cp.js` covers its checkpoints.
 #9 already lists: the run is lost.
- **Next job after a job.** Checked pairs: tail→hoa (camera), tow→cargo, cargo→roundup (vehicles and convoy), sabotage→heist (night and stealth), crossing→taxi (kids), mower→carwash. Job B's state after job A, both failed and abandoned, matches job B in a clean session (fov, night, overlays, loadout, noGuns, vehicles, enemies). Remaining differences are random job seeds and bot timing. The one exception is overwatch→finale (J-03).
- **No-gun rule.** In taxi, crossing, carwash, hoa, cargo, bike and moving (family or kids present), `M.noGuns` was true and no gun model was in hand at every stage start, including after each retry.
- **Tank, jet and range.** They refuse jobs (`e.noJobs`), and their interactions are hub-only (`tank.js:285`, `jet.js:551`, `range.js:350`). Fast travel and the map are blocked outside the hub (`onFastTravel` checks `mode!=='hub'`).


## Not covered, and why

- **SwiftShader memory.** Rendering a frame in some late stages crashed the headless tab ("Target crashed") when run alone, at least twice each: hoa (meeting), roundup (convoy), and doug, earl and dee after a fail. Those exits (quit to title, reload, Head home) are unverified for those jobs. I do not report these as bugs.
- **J-01 freeze.** That the real `requestAnimationFrame` loop dies is inferred from the code. Live rendering here runs at about 2 fps, too slow to show it reliably. The exception itself is confirmed.
- **Pointer lock and real-time timers.** Real pointer lock and alt-tab (`visibilitychange`) on a real window were not covered. The desktop shell pauses on blur and visibility (`platform.js:79`). On the web, timers are frame-based, so they stop with the tab. Some job lines use `setTimeout` (`hoa.js:351` ends the stakeout 2.5 s later even while paused), which is SUSPECTED minor and not pursued.
- **Fail ways specific to one job.** Escort down, wrong choice and target lost come from each job's own `test.step({fail:true})`. Where the bot's "fail" instead won or ran ahead (tail drop, bike, heist, talk), those stages got only the generic down and leave fails.
- **Mashing E on overlapping prompts, and dying in odd places.** Not done by hand. The hold and tap list is a single `F.prompt` per frame.
- **Calendar replay (e).** Only via the existing `jobs-check --replay`, not re-run here.
- **Missing finale stages.** Its "roof" through "festival" stages were played by its bot without a fail at each one. `dev/jobs/finale-cp.js` covers its checkpoints.

