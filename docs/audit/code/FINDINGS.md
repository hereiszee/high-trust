# Code + paperwork audit (area: code)

Branch `audit/code`. Part 1 is from reading the code, with probe scripts in `dev/audit/code/` (each `*.out.txt` beside a script is its saved output). Every CONFIRMED finding was run twice with the same result. Part 2 (paperwork) is in full in [PAPERWORK.md](PAPERWORK.md); I spot-checked P-1, P-2 and P-4 against the repo myself, and its BLOCKER and MAJORs are summarised below.

Counts: **BLOCKER 1** (paperwork) · **MAJOR 6** (2 code, 4 paperwork) · **MINOR 16** (4 code, 12 paperwork) · plus 1 SUSPECTED code item.

---

## Part 1: code

### C-1 · MAJOR · Rebinding Mouse 1 (Fire on another input, or Fire/Aim swapped) means a click on the view never re-captures the mouse
- **Repro:** `node dev/audit/code/c1-rebind-lock.js` (output in `c1-rebind-lock.out.txt`). In free roam with the pointer unlocked, one real left click on the 3D view:
  - defaults: `lockRequests: 2`
  - Fire↔Aim swapped (`HT.Keys.set('fire','mouse2')`): `lockRequests: 0`, and the click toggles aim instead
  - Fire on J: `lockRequests: 0`, and the click is swallowed
- **Expected:** a click on the view always asks for pointer lock when the game is running unlocked. index.html:2853 says "a refused re-lock waits for the next click".
- **What happens:** js/keys.js:68-71 handles mousedown in the window capture phase. When `mouse1` is in the remap table it calls `stopImmediatePropagation`, so index.html's `cv.addEventListener('mousedown')` (index.html:1985), the only click-to-lock path, never runs.
- **Player impact (LIKELY, from the code):** the lock is refused whenever the player leaves a shop, locker or map with Esc (`metaRelock`), and whenever Resume is clicked too soon after Esc. `lockFailed` is then reset to false, so the cursor-look fallback is off too. A left-handed player with Fire and Aim swapped is left with no mouse look until they pause and press Resume.
- **Confidence:** CONFIRMED for the mechanism. The end-to-end shop path is LIKELY: headless Chromium refuses pointer lock, so I couldn't reproduce the loss directly.

### C-2 · MAJOR · An ejector seat ride survives Quit to title: after Continue (or New game) the dad is back in the sky under a parachute
- **Repro:** `node dev/audit/code/c2-chute-quit.js`. Board DAD-1 (real E), put it 150 m up, eject (E, E), then Pause → Quit to title → Continue.
- **Output:** `after quit to title: {"mode":"title","chute":{"y":158.7,...}}` → `after Continue: {"mode":"hub","chute":{"y":161.7,...},"P":[38.3,40],"dudeY":161.7}`
- **Expected:** quitting ends the flight. Continue starts on the ground at the save's spot.
- **What happens:** `F.chute` (js/jet.js:241) is cleared only by landing or `Jet.air(...)`. `quitToTitle()` (index.html:2027) doesn't reset it, and the jet's tick runs from the pose hook, which doesn't run on the title. The first hub frame after Continue moves `P.pos` back to the canopy position (js/jet.js:254-255), 160 m up. The canopy mesh belonged to the old level group, so the dad most likely floats down with no visible chute (SUSPECTED; not screenshotted). New game goes through the same path.
- **Confidence:** CONFIRMED (run twice).

### C-3 · MINOR · Merge debris: `function owNeighbours` is declared twice in index.html. The first version is dead, and the second runs twice per hub frame
- **Repro:** `node dev/audit/code/c4-neighbours-twice.js`. It prints `index.html:1444 declares function owNeighbours(dt,bT)…` and `index.html:2708 declares function owNeighbours(dt)…`, call sites at 1434, 1440 and 2647, and `{"steps":10,"calls":20,…,"OWS_nb":"never created (first owNeighbours is dead)"}`.
- **Effect:** the later declaration wins (hoisting), so `HT.OpenWorld.neighbours` runs twice per hub frame. Its timers (`N.t` re-plan, `N.quiet`, the gunfire cower calls) run at double speed and the CPU cost doubles. The older pool (`OWS.nb`) is never built, but js/tank.js:177 still reads `OWS.nb` for its "never fire near a person" check. That check is harmless today only because the same people are also in `HT.People.live`.
- **Fix hint (not applied):** delete the first declaration and one of the two calls in owUpdate.
- **Confidence:** CONFIRMED.

### C-4 · MINOR · Quitting a night stealth job to the title leaves the job's stealth gem on screen and night still set
- **Repro:** `node dev/audit/code/c5-night-quit.js` starts Sabotage, then Pause → Quit to title → confirm, then runs live frames for 2.5 s. Output: `{"stealthGemOnTitle":["Lit up"],"titleVisible":true,"nightTarget":1,"nightK":0.35}`. Screenshot: `docs/audit/code/c5-title-after-night-job.jpg` (the "LIT UP" pill at the bottom centre of the title screen).
- **Cause:** sabotage cleanup runs from the HT.Jobs `pose` hook (js/jobs/sabotage.js:625), and that hook doesn't run on the title. Night is reset only in `jrHubEnter()` (index.html:4405), and `quitToTitle()` (index.html:2027) calls neither. Heist uses the same pattern. Continue clears both on the first hub frame.
- **Confidence:** CONFIRMED.

### C-5 · MINOR · The packaged desktop build still opens devtools when started with `--dev`, which a player can add through Steam launch options. Devtools give full access to `window.__ht` and to Steam achievement unlocks
- desktop/main.js:16-17: `DEV = flag('dev') || !app.isPackaged`, and `DEVTOOLS = flag('dev') || …`. A packaged build launched with `--dev` gets devtools (F12) and the reload/zoom accelerators. From there, `window.__ht` (index.html:4542 onward; never gated by `HTDesktop`) and `HTDesktop.steam.unlock('ACH_…')` can grant any achievement, edit cash, or start any job.
- For a single-player game this is acceptable if it's a deliberate choice. If not, gate `--dev` on `!app.isPackaged`, or on an environment variable.
- **Confidence:** LIKELY (read from the code; no packaged build exists here).

### C-6 · MINOR · Small inconsistencies left by the merges
- The tutorial "shown once" state (`ht-tut`, index.html:4445 and 4469) uses `localStorage` directly, even in the desktop shell. Every other setting goes through `HTDesktop.storage`, the Steam Cloud save file. Tutorials will replay on a second PC.
- The js/keys.js:9 header still says Aim "'hold' (default, as before)". The code (line 21) and the owner rule say Toggle; only the comment is stale.
- The desktop/preload.js header promises a localStorage-shaped `length` that `storage` doesn't have. Nothing reads it today.
- **Confidence:** CONFIRMED by reading.

### S-1 · SUSPECTED · After the 60 s model-retry ceiling, box stand-ins for kids and family drop out of the 25 m no-guns check
`HT.People.protectedNear` (js/people.js:686) only walks `P.live`. `boxIn()` (js/people.js:390) leaves a boxed character out of `P.live` until its real model arrives. `kidNear` (index.html:798) adds `npcs`/`allies`/`enemies`, but a job-spawned kid added straight to the world (patrol.js:176 chalk kid, blitz.js:551) is in none of those lists. So the gun-drawing bubble would ignore that kid while it is a box, and a raycast hit on its box mesh would walk up to a root named `rb_pending_<key>`, which `isProtected` doesn't recognise. This only happens if a character model fails to load for a whole minute, and I did not reproduce it.

### Checked and clean (code)
- **Electron shell:** contextIsolation on, sandbox on, nodeIntegration off, webSecurity on. `will-navigate` is limited to `app://game/`; window.open is denied (https goes to the OS browser). Every non-`app:`/`data:`/`blob:` request is cancelled. The `app://` handler decodes, normalises and checks the path against `GAME_ROOT + sep` (no traversal), and the manifest fallback goes back through the same check. Every IPC handler checks the sender frame's origin and the types and sizes of its arguments. Permissions are limited to pointerLock, fullscreen and clipboard write. Saves are written atomically with a backup and keep any corrupt file. Steam stays a no-op without an app ID.
- **No leftover absolute URLs** in game code (only the og:/canonical meta tags in index.html:10-18). No `console.log` in game code.
- **Service worker:** the shell (index.html, js, css, vendor/three) is network-first and hashed assets are cache-first, so a returning online web player gets fresh index.html and js together. Old CDN entries just go unused. Offline returns the last cached set, which is consistent with itself. The desktop shell never registers the worker and returns 404 for `/sw.js`.
- **HT.Jobs hooks:** every system-wide camera/interact/fire/home handler (jet, tank, tow, photo, range, eggs, finale-fest) returns `undefined` or `null` when inactive, and `HT.Base.interact` only counts truthy answers. Some job-level handlers answer `false` or `null` when idle (cargo and overwatch camera, overwatch interact). The jet/tank/phone hooks they would hide can't run during those jobs.
- **Checkpoints:** `CP.mark` and `cpRestore` round-trip, size-checked to 16 KB.
- **Tank:** board, gunner's sight, Quit to title, Continue all come back clean (`c3-vehicle-quit.out.txt`: no vehicle, normal view, the dad visible).
- **Range:** the rental goes back when you leave the range or the hub, or get into a vehicle. Rentals only change the in-memory loadout, never the save.
- **people.js:** pending characters are invisible and their hitboxes pass rays through. Fill and swap keep the game's hitbox data, and the hit and death reactions refuse protected characters.
- **gamepad.js:** the LB layer and the synthetic keys go through a separate path from keyboard remapping, because keys.js ignores untrusted events.
- **hud.js:** dialogs trap focus and Esc and restore the previous focus. Credits text is covered under P-2.

### Not covered
- Real pointer lock and Steam overlay behaviour: headless Chromium refuses pointer lock, and there is no Steam client here.
- A packaged Electron build: no `desktop/node_modules` in the container.
- A full input-on-blur matrix with a physical controller.
- Traffic against pedestrians: the traffic obstacle list (js/openworld.js:1310-1318) has the dad, cars and props but no NPCs or kids. I ran out of time to check whether a traffic car can drive through a crossing kid during the Crossing job. **Worth a follow-up given the owner rule.**

---

## Part 2: paperwork (full detail in PAPERWORK.md)

- **P-1 · BLOCKER · The Steam AI disclosure is untrue.** docs/steam/STORE.md:145 says that apart from seven CC0 props "everything else in the game is hand-written code". All 466 commits are authored by an AI coding assistant, and 308 carry AI co-author trailers; that covers the code and all the dialogue and UI text. The disclosure has to cover AI-assisted code and writing. (I checked this myself.)
- **P-2 · MAJOR · The in-game Credits screen (js/credits.js) doesn't match credits.txt or LICENCES.md.** It still credits the carbine to BigWhyaaa instead of nisu (js/credits.js:38; I checked this myself), leaves out Amal Kumar and the Pixel Art Atlas line, and LICENCES.md:65 wrongly says the screen loads credits.txt.
- **P-3 · MAJOR · THIRD-PARTY-NOTICES.txt and LICENCES.md leave out** Electron/Chromium/Node, steamworks.js (MIT), the Steamworks redistributables and two packed npm MIT packages.
- **P-4 · MAJOR · "28 story jobs and a festival finale" (STORE.md:26) counts the finale twice.** The code has 27 plus the finale.
- **P-5 · MAJOR · The copyright holder doesn't match.** electron-builder says "© High Trust" and package.json's author is "High Trust"; LICENSE and STORE say hereiszee. The appId, `RELEASE_APP_ID=0`, the depot ids and the 480 placeholder are still unset (the placeholder is correctly not shipped). The package description still uses the old "taking their neighborhood back" copy.
- **MINOR P-6 to P-17:** "each gun has attachments" is false for Side-by-Side; the shipped LICENSE points to a doc that isn't shipped; a 3.4 MB duplicate boot pack ships; small notices errors; stale CHECKLIST/QA-GAPS/CONTENT entries; the "Pause → Key bindings" path name in the docs; the Mac app name in the docs; the install size; the achievement icon size; the inventory counts; leftover web copy in index.html meta tags; QA-GAPS #17 looks wrong.
- **Clean:** no dev, docs, legacy, tools or test files ship; all 263 inventory rows exist; every fix CONTENT.md claims is on main; controls, achievements (23) and feature claims match the code apart from P-4 and P-6.
