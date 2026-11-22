# Audit: saves, settings and the packaged desktop build

Area: persistence (`js/save.js`, `js/platform.js`, `desktop/save-store.js`, `desktop/main.js`), settings, the packaged Linux build, achievements, credits, CI.
Branch `audit/saves`. Build under test: `desktop/` packaged with `npx electron-builder -c electron-builder.config.js --linux --dir`
(electron 45.4.1, electron-builder 26.0.12), run as `desktop/dist/linux-unpacked/HighTrust` under xvfb with SwiftShader.

Probes live in `dev/audit/saves/` (run from the repo root). Their raw output is in this folder (`*.runN.txt`).

| Probe | What it does |
|---|---|
| `save-probe.js` | Node: js/save.js against empty, "null", truncated, wrong-type, future, v0 and v2 saves; New game → restore loops; quota; storage disabled; two tabs |
| `achievements-probe.js` | Node: every Steam achievement evaluated by `HT.Steam`'s own rules against crafted saves after a real load. Also checks the docs table |
| `desktop-session.js` | Packaged build: Maple → hardware store → Riverside → Fort Sensible → home → two jobs, then a zip-tie inside a job and Quit to title, then SIGKILL / SIGTERM / window close / second instance |
| `desktop-settings.js` | Packaged build: every pause setting changed through the settings UI, then Quit to desktop, a second launch, New game, and Reset key bindings |
| `desktop-corrupt.js` | Packaged build: damaged, missing, newer-version and 20 MB save files |
| `desktop-tankjet.js` | Packaged build: borrow the tank, get in the jet, Quit to desktop |
| `fpscap-sim.js` | The Frame rate cap gate from `index.html`, simulated at common refresh rates |
| `credits-diff.js` | In-game credits text vs `assets/credits/credits.txt` |

Counts: **0 BLOCKER, 5 MAJOR, 10 MINOR.**

---

## MAJOR

### SAV-01 · The Aim Hold/Toggle setting does nothing when clicked
- **Severity:** MAJOR. The setting is broken. The default (Toggle) still meets the owner rule, so this is not a BLOCKER.
- **Confidence:** CONFIRMED (two runs: `desktop-settings.run1.txt`, `desktop-settings.run2.txt`).
- **Repro:** Pause → **Controls & keys** → Aim: click **Hold**.
  `xvfb-run -a node dev/audit/saves/desktop-settings.js` checks "clicking Aim: Hold in Key bindings sets HT.Keys.aimMode".
- **Expected:** Aim becomes press-and-hold for Mouse 2, the scope and binoculars, and the controller's LT follows it. The choice persists.
- **Actual:**
  - `HT.Keys.aimMode` stays `toggle`. The button re-renders as Toggle.
  - Nothing reaches `ht-keys`.
  - `ht-cfg` gains a junk key: `"undefined":"hold"`.
  - After a relaunch Aim is still Toggle. The pad's LT stays on "hold until you pick", because no pick is ever recorded.
- **Cause:** `js/keys.js:105` sets `onclick` on `[data-aim] button`. Then `js/hud.js:790` sets `onclick` on every `.ht-seg3 button` in the pane. The aim row's container carries the class `ht-seg3` (`js/keys.js` `table()`), so hud.js's handler replaces keys.js's. hud.js then emits `setting('undefined', 'hold')`, because the container has no `data-k`.
- **Why the tests miss it:** `dev/aim-toggle.e2e.js:27` renders `HT.Keys.table()` into a bare `div` and calls `HT.Keys.bind` on it, never through `renderPane`, so the override never happens there.

### SAV-02 · The tank borrow and jet flight are never saved: two Steam achievements don't fire, and are lost on quit
- **Severity:** MAJOR. Achievements fail to unlock when earned, and progress is lost.
- **Confidence:** CONFIRMED (two runs: `desktop-tankjet.run1.txt`, `desktop-tankjet.run2.txt`).
- **Repro:** `xvfb-run -a node dev/audit/saves/desktop-tankjet.js`.
  1. New game, then a purchase, so that a save exists.
  2. Fast travel to Fort Sensible.
  3. Get in the tank, then in the jet.
  4. Pause → Quit to desktop.
- **Expected:**
  - `base.tank.borrows` and `base.jet.flights` are written.
  - `ACH_BORROWED` and `ACH_CLEARED_FOR_TAKEOFF` unlock. Both are evaluated only on a save write or load (`js/platform.js:54`).
- **Actual:**
  - In memory: `tank.borrows=1` and `jet.flights=1`.
  - On disk, while playing and after Quit to desktop: `0` and `0`.
  - The achievements never unlock in that session, and the counters are gone on the next launch.
  - The counters would only be written if some other save happened to come later in the same session.
- **Cause:**
  - `js/tank.js:257` and `js/jet.js:127` increment the counters without `persist()` or `HT.Save.save()`. `js/jet.js` calls `persist()` for its boom, buzz and bridge flags, but not for flights.
  - Quit to desktop (`js/platform.js:73`) and `beforeunload` call `HT.Save.flush()`, which writes only if a debounced save is already pending (`js/save.js:455`).
  - Any other direct `Save.data` change without `save()` is lost the same way.
- **Related (MINOR, from the code):** the jet counter increments when you sit in the cockpit (`start()` in `js/jet.js:127`), not when you take off. The achievement says "Take the jet up at Fort Sensible."

### SAV-03 · The Frame rate cap gives the wrong rate on 75/90/144/165 Hz displays, including the Steam Deck OLED
- **Severity:** MAJOR. A setting clearly does the wrong thing on common hardware.
- **Confidence:** CONFIRMED. A deterministic simulation of the exact gate; the probe checks the gate text is still in `index.html`. Not measured on real hardware.
- **Repro:** `node dev/audit/saves/fpscap-sim.js` (`fpscap-sim.run1.txt`).
- **Expected:** Cap 60 gives about 60 fps, and cap 120 gives about 120 fps, on any display.
- **Actual:**

  | Display | Cap 30 | Cap 60 | Cap 120 | Cap 144 |
  |---|---|---|---|---|
  | 60 Hz | 30 | 60 | 60 | 60 |
  | 75 Hz | 25 | 37 | 75 | 75 |
  | 90 Hz (Steam Deck OLED) | 30 | 45 | 90 | 90 |
  | 120 Hz | 30 | 60 | 120 | 120 |
  | 144 Hz | 29 | **48** | **144 (no cap)** | 144 |
  | 165 Hz | 28 | 55 | **83** | 165 |

- **Cause:** `index.html:4487`, `if(cap>0&&now-last<1000/cap-2)`, skips whole vsync intervals and sets `last` to the frame time. So the interval becomes the next multiple of the refresh period at or above `1000/cap-2` ms. It needs an accumulator (`last += 1000/cap`, re-synced when too far behind) instead.

### SAV-04 · Zip-ties and trust from an abandoned job are kept and saved, so the same job can be farmed
- **Severity:** MAJOR. Trust and zip-tie counts are duplicated. They gate Small Talk (10 zip-ties), the finale (trust 80/80), and the Steam achievements Due Process and Doors Unlocked.
- **Confidence:** CONFIRMED by `desktop-session.run1.txt`. The second run's result is in `desktop-session.run2.txt`.
- **Repro:** `xvfb-run -a node dev/audit/saves/desktop-session.js`, stage B.
  1. Start Return to Sender.
  2. An enemy surrenders. Press **E** (the real key) to zip-tie them.
  3. Esc → Quit to title → confirm.
  4. Continue, then make any purchase.
- **Expected:** The dialog says "Progress in this job will be lost." The job's trust and zip-ties go with it.
- **Actual:**
  - Before the job, on disk: `trust=28 cuffed=0`.
  - After quitting the job and one autosave: `trust=32 cuffed=1`.
  - Start → tie → quit can be repeated without limit.
  - A failed run that is retried ("Run it back") keeps its gains the same way. That case is from the code; it was not run.
- **Cause:**
  - `prog.cuffed++` and `addTrust(4)` change the live `prog` object at once (`index.html:2657`, `3898`, `4171`, `1281`). `prog` is the save's own `prog` (`metaBindProg` / `Save.bindProg`).
  - The quit and abandon paths (`index.html:2042-2043`, `quitToTitle`) never roll it back.
  - `metaMissionStart` saves at job start (`index.html:2891`), so a snapshot from before the job exists, but nothing restores it.

### SAV-05 · The in-game Credits screen is not `assets/credits/credits.txt`: a wrong author and missing credits
- **Severity:** MAJOR. This is a release and licensing item. CC0 does not require attribution, but the screen credits the wrong person for the carbine.
- **Confidence:** CONFIRMED.
- **Repro:** `node dev/audit/saves/credits-diff.js` (`credits-diff.run1.txt`).
- **Expected:** The screen shows `credits.txt` verbatim. `docs/steam/LICENCES.md:65` calls that file the "single source of truth" and says the screen "loads or embeds that file verbatim".
- **Actual:** `js/credits.js:9` embeds an older copy. 9 lines differ:
  - The carbine is credited to **BigWhyaaa** in game, but **nisu (from 3dmodelscc0.com)** in `credits.txt`.
  - Poly Haven author **Amal Kumar** is missing.
  - "Furniture icons: Pixel Art Atlas GLB models, CodePawl / Angais (CC0)" is missing.
  - "Textures and decals" appears in game as "Textures".
- **Fine:** `THIRD-PARTY-NOTICES.txt` ships at the package root, byte-identical to `assets/credits/`. The MIT notices, OFL font texts and vendor licences are in `resources/game`.

---

## MINOR

### SAV-06 · First session: after Quit to title there is no Continue, and the button reads "Clock in"
- **Severity:** MINOR. Confusing, but nothing is lost.
- **Confidence:** CONFIRMED (`desktop-session` stage C).
- **Repro:** On a fresh profile:
  1. New game.
  2. Finish two jobs (the save now has $1,381 and two jobs done).
  3. Pause → Quit to title.
- **Expected:** "Continue · 2/9 jobs · $1,381", plus New game behind the confirmation.
- **Actual:**
  - No Continue. The only button reads **Clock in**, which looks like a new game; it silently continues the same save.
  - There is no way to start a new game until the app is restarted.
  - A save whose only progress is eggs, trust or visits never shows Continue at all. `hasProgress` counts only runs, cash and spending (`js/save.js:461`).
- **Cause:** `hasSave()` (`index.html:2838`) requires `SAVEM.lastLoad.status!=='fresh'`, and `lastLoad` stays `fresh` for the whole session that created the save.

### SAV-07 · An unreadable save starts a fresh game with no message
- **Severity:** MINOR. Rare, because writes are atomic and keep a `.bak`, but when it happens the player is not told.
- **Confidence:** CONFIRMED (two runs: `desktop-corrupt.run1.txt`, `desktop-corrupt.run2.txt`).
- **Repro:** `xvfb-run -a node dev/audit/saves/desktop-corrupt.js`.
- **Actual:**
  - `save.json` and `save.json.bak` both truncated: `HTDesktop.saveFrom='reset'` and a fresh title, with no dialog or toast. The data survives only in `save.json.corrupt`, which nothing points the player to.
  - An inner save from a newer version (a Steam beta branch → default rollback): `lastLoad={status:'reset', why:'newer version'}`. js/save.js immediately writes a fresh v3 over `ht-save` at launch (`js/save.js:446`). The newer progress is left only under `ht-save-future`, which no version reads back.
- **Cause:** Nothing in `index.html` reads `HT.Save.lastLoad` or `HTDesktop.saveFrom` except `hasSave()`.
- **Fine:** a truncated, 0-byte or missing `save.json` with a good `.bak`, and a corrupt inner `ht-save` with a good inner backup, all recover correctly.

### SAV-08 · A crash or kill within about 0.4 s of a payout loses it
- **Severity:** MINOR.
- **Confidence:** CONFIRMED in run 1 (`desktop-session` stage D1). See run 2.
- **Repro:** Finish a job, then SIGKILL the shell 150 ms after the result card.
- **Actual:** The payout on screen ($1,382 → $1,704) is not on disk ($1,382).
- **Cause:** The renderer saves at once, but the main process debounces the file write by 400 ms (`desktop/save-store.js:13`). SIGTERM, window close and Quit all flush correctly. A hard kill (Task Manager, OOM, holding the Deck's power button) does not.
- **Suggestion:** Flush at once on the IPC set that follows a job result.

### SAV-09 · An empty or "null" `ht-save` ignores a good backup, then overwrites it
- **Severity:** MINOR. Mostly web; the desktop wrapper makes an empty inner value unlikely.
- **Confidence:** CONFIRMED (`save-probe.run1.txt`).
- **Actual:** `ht-save` set to `''` or `'null'` with a good `ht-save-bak` loads as `fresh` with $0. After two autosaves the backup also holds the fresh save.
- **Cause:** `parseRaw` returns `empty` (`js/save.js:418-420`), and `load()` only consults the backup for `bad` or `future`.

### SAV-10 · A failed save write is silent and still fires `saved`
- **Severity:** MINOR. Web only. Already listed as QA-GAPS #15.
- **Confidence:** CONFIRMED (`save-probe`, quota case).
- **Actual:** With storage full, `saveNow()` returns `false`, but `emit('saved')` runs anyway (`js/save.js:454`), so Steam checks and listeners see a save that never happened.
- **Note:** Three full copies of the save share the quota: `ht-save`, `ht-save-bak` and `ht-save-prev`.

### SAV-11 · Two browser tabs: the last writer wins
- **Severity:** MINOR. Web only; the desktop build is single-instance (verified).
- **Confidence:** LIKELY. Simulated in Node (`save-probe`); not run in two real tabs.
- **Actual:** Tab B finishes a job and earns $2,000. Stale tab A then writes, and B's job and cash are gone.
- **Cause:** There is no `storage` event listener and no write guard in `js/save.js`.

### SAV-12 · The tutorial flags are not in the save file, so Steam Cloud doesn't carry them
- **Severity:** MINOR.
- **Confidence:** LIKELY, from the code. The probe session finished no tutorial step, so the flag was never written.
- **Cause:**
  - `index.html:4445` and `4469` use `localStorage` (`ht-tut`) directly, not `CFG_STORE()` or `HTDesktop.storage`. Settings and key bindings do use the save file.
  - In the shell, `localStorage` lives in Chromium's `Local Storage` folder under userData, outside `saves/`.
  - So on a second PC or a Deck the hints replay, and the BUILD.md Auto-Cloud table does not cover them.

### SAV-13 · Steam Auto-Cloud: the pattern also syncs `.corrupt`/`.tmp` files, and Graphics settings follow you to the Deck
- **Severity:** MINOR.
- **Confidence:** LIKELY, from the configuration and code.
- **Pattern:** `docs/steam/BUILD.md` uses `save.json*`. That uploads:
  - `save.json.corrupt`, which can be up to the full save size (the 50 MB quota is sized for one save plus its backup);
  - a stray `save.json.tmp` if a write is interrupted.
  A narrower pattern (`save.json` and `save.json.bak`) avoids both.
- **Graphics:** `ht-cfg` (Quality, Resolution scale, Frame rate cap) is inside the synced file. A player who picks High on a desktop PC gets High on the Deck. The Deck's first-run Auto rung lower only applies when `gfx` is unset or `auto` (`js/platform.js:60`).
- **Fine:** the userData paths in the BUILD.md table match Electron's `appData` per OS.

### SAV-14 · Windowed mode doesn't remember its size or position
- **Severity:** MINOR.
- **Confidence:** SUSPECTED for the off-screen part; the rest is from the code.
- **Cause:** The window always opens at a fixed 1600×900 (`desktop/main.js:92`). Only the fullscreen flag is stored.
- **Effect:** On a 1366×768 laptop the window opens larger than the screen. Electron does not clamp the initial size on Windows; this was not verified on Windows.

### SAV-15 · "Achievement ·" toasts for things that are not achievements
- **Severity:** MINOR.
- **Confidence:** LIKELY, from the code.
- **Cause:** `js/jet.js:210`, `214` and `232` show the feed lines "Achievement · Sonic boom over the neighborhood", "… Buzzed your own house" and "… under the bridge".
- **Effect:** None of these is a Steam achievement (`docs/steam/achievements.md`), so on Steam players will expect a pop that never comes.

---

## Covered and found clean

**Saves (Node, `save-probe`, `achievements-probe`)**
- v0 prototype → v3, v1 → v3 and v2 → v3 migrations; a save from before the newest jobs; unknown job ids (kept and harmless).
- Wrong types in every field, and a truncated JSON with a good backup (recovered, the broken copy kept).
- Storage that throws on every call: the game runs, nothing is kept.
- New game → Restore → Restore → Restore swaps correctly. New game twice, then Restore, brings back the original. The two-step New game confirmation exists (`index.html:2032-2035`).

**Desktop (packaged build)**
- Atomic write, `.bak` fallback (file truncated, 0 bytes or missing) and `.corrupt` kept.
- A 20 MB save loads.
- SIGTERM with a pending autosave, SIGTERM 50 ms after a save, and window close with a pending autosave: all saved, exit code 0.
- Second instance exits in about 130 ms, leaving one window.
- Quit to desktop from title (`desktop/test/e2e.js`) and from pause: exit 0.
- `desktop/test/e2e.js --exe dist/linux-unpacked/HighTrust`: **all ok**.
- Over a real session (Maple, hardware store, Riverside, Fort Sensible, home, two jobs): zero remote requests, zero page errors, zero `[app] 404` and zero `[net] blocked`.
- Steam absent (no client, `--no-steam`): clean. `steam_appid.txt` is not packaged.

**Settings, through the UI, then Quit to desktop and relaunch**
- Look speed, Aim speed, Invert, First person, Riverside calm, FOV.
- Quality Low (applied on launch), Resolution scale 70% (applied), Frame rate cap (stored and shown; see SAV-03 for the rate).
- Windowed, VSync off (the switch is applied after the restart), Interface size 125% (zoom applied).
- Subtitles, Rotate minimap, all four volumes (Master 0 stays 0).
- Rebinding with a conflict swaps the two actions and persists. Reset to defaults works. New game keeps settings and bindings.

**Achievements**
- `docs/steam/achievements.md` has the same 23 ids, names and descriptions as `js/platform.js`.
- Each is reachable from a crafted save after a real load.
- None unlock on a fresh save, on a started save (one run, cash, a purchase) or on a failed run.
- Selling items does not count toward "Side Hustle" (`sell()` does not add to `earned`).

**Credits and licences:** `THIRD-PARTY-NOTICES.txt` ships, and the vendor and font licences are in the package. The credits *text* is SAV-05.

## CI ("Desktop build", last run 44966694860 on main @1f4a46a, success)

The Linux job runs the full packaged e2e under xvfb. **The Windows and macOS jobs run only `e2e.js --smoke`:** launch to the title, zero console errors, nothing remote, `HTDesktop.quit()` exits. They do not test:
- New game, free roam, any job or the controller;
- writing or reading the save file (`%APPDATA%\High Trust\saves`, `~/Library/Application Support/High Trust/saves`);
- the settings or desktop-settings.json, fullscreen, window close or Cmd+Q;
- the `[app] 404` scan, single-instance or the Quit button in the UI.

Other notes on the CI runs:
- Their logs report `"webgl":"disabled_off"` in the startup GPU feature status, yet the title renders (screenshots in the artifacts). The smoke would not notice a WebGL failure after the title.
- CI starts the shell with cwd `desktop/`, which holds the placeholder `steam_appid.txt` (480). Steam init is therefore attempted in CI, which a player's install never does.
- macOS is ad-hoc signed only (no Developer ID secrets); Gatekeeper will block it, as BUILD.md says.

## Not covered, and why

- **A real Steam client:** overlay, an achievement actually unlocking, Auto-Cloud sync, `RELEASE_APP_ID` relaunch (still 0, owner TODO). No Steam here.
- **Windows and macOS builds** beyond reading the CI artifacts' logs and screenshots. No such machines here.
- **OS suspend/resume** (`powerMonitor`) and a real window-manager Alt+F4 (`BrowserWindow.close()` was used instead).
- **localStorage quota in a real browser**, and two real tabs (both simulated in Node).
- **Quitting at every kind of moment:** only Return to Sender and End of the Line result cards, the hub, a job and a shop path were exercised. The finale, home decorating, and quitting while inside the tank or jet with a pending save were not. In-job state is in memory by design; the quit dialog says so.
- **Frame-pacing on real displays:** SAV-03 is simulated, not measured.
