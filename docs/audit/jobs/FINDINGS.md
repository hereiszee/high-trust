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

Counts: **1 BLOCKER, 3 MAJOR, 3 MINOR** (the list below is final). Each entry names its reproducing script, and every script's output is quoted.

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
  3. `repro-moving-fresh.js` is the control run with no retry: CONTROL_MOVING
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

J03_BLOCK

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


## Per-job results

PER_JOB

## Covered and clean

CLEAN

## Not covered, and why

GAPS
