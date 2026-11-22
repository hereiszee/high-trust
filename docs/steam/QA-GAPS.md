# QA gaps a paying player would hit

Audit date: 2026-11-21. Sources:
- reading `docs/`, `dev/README.md`, `js/` and `index.html`
- running the Node suites: `dev/run-tests.js` 74/74, `dev/jobs-registry.test.js` 38/38, `dev/save.test.js` pass, `dev/check-build.js` up to date
- running the headless story walk `dev/givers-audit.js`

Items are ranked by severity. "Not verifiable here" means it needs a real GPU, a desktop wrapper or a human play-through.

## What the tests cover, and what they don't

**Covered:** unit suites (worldgen, roads, car AI, jobs registry, save migration and corruption, AI, social, stealth, tail, tow, convoy, photo, sites, brake), per-job headless runs (`dev/jobs-check.js <id> --retry --replay`, `dev/jobs/*.js` including finale checkpoints, saves and epilogue), menus e2e (keyboard, gamepad and touch in menus), and headless perf probes.

**Not covered:**
- a real full play-through from a fresh save. `jobs-check` unlocks jobs with `test.give`, so it never tests whether a job can be reached.
- real pointer lock (headless refuses it, `docs/base.md`)
- real-GPU frame times
- offline first launch, a desktop wrapper, localStorage clearing or quota (now covered by desktop/test/e2e.js: offline, packaged shell, save file)
- a gamepad in gameplay (scripted pad covered by desktop/test/e2e.js; a real pad is still untested)
- the "Not yet" decline flow
- finale discoverability

**Known red:** `jobs-check mower` fails on main (`docs/base.md:153`), and mower is a required story job. `givers-audit.js` always exits 1 because its `step()` never runs the HUD (artefact explained below), so it cannot gate a release.

## Start-to-finale: what unlocks what

There are 27 story jobs:
- **9 built-in:** the four Maple raids (`const MISSIONS=` in index.html) and five Riverside jobs (`const RIVER_JOBS=`); `node dev/store-claims.test.js` counts them.
- **18 registered** in `js/jobs/*.js`.

There are also 5 repeatables (Honey-Do Blitz, Watch Your Step, Porch Light, Suds Up, Mower Time Trial) and the finale. The repeatables are not required.

**The finale "Everybody Waves" unlocks when** (`js/jobs/finale.js:264-265`):
- all 27 story jobs are done: `gary rick dave doug earl dee rosa benny duke taxi hoa mower tail crossing tow overwatch pawn moving cargo cones talk sabotage brake bike arrest heist roundup`
- **and** Maple trust ≥ 80
- **and** Riverside trust ≥ 80

Nothing else is checked: no act, money or time of day. `docs/design/SPEC3.md` also says "Act 3", but the code does not check it. The finale is offered by pressing **E on any family member at home** (`finale.js:263`, `index.html:4272-4274`).

**Gating chain** (`index.html:3624-3629` for built-ins, `def.unlock` through `js/jobs/_registry.js:72-80` for the rest):

```
gary → rick (Route 9 bridge to Riverside opens) → dave → doug
gary → taxi (Jen, fridge), hoa (Barb)      rick → mower (Dave), tail (Doug)
rick → earl → dee [R≥15] → rosa [R≥25] → benny [R≥35] → duke [R≥50 + all 4 Maple raids]
earl → tow [R≥20] → sabotage          earl → blitz (rep.)
dee → pawn [R≥30] → crossing → carwash (rep.)
rosa → overwatch → arrest             rosa → moving [R≥40]
benny → cargo     tail + benny → cones           tail → patrol (rep.)
duke → brake → roundup                earl + taxi → bike
(dee or duke) + 10 zip-ties total → talk → heist
hoa → porch (rep.)    mower → mowertt (rep.)
all 27 + trust 80/80 → finale (talk to family at home)
```

**A documented order that reaches the finale** (the headless walk reached "done finale" with no dead end, `dev/givers-audit.js`):

gary → rick → dave → doug → taxi, hoa, mower, tail → earl → dee → tow, pawn → crossing → rosa → overwatch → arrest → moving → benny → cargo, cones → duke → brake → roundup → sabotage → bike → *(10 zip-ties)* talk → heist → *(trust 80/80)* finale.

Trust from first-time wins alone comes to about 122 for Maple and about 126 for Riverside, both capped at 100. Trust can drop (−10 for shooting a surrendered enemy, `index.html:2155`), but zip-ties, replays and repeatables always earn it back. **So there is no permanent lock, but three things can stall a player.** See items 4, 5 and 7 below.

## Ranked gaps

### Blocker

1. **FIXED (work/steam-desktop): vendored in `vendor/three-r128/`, Google Fonts import removed, the desktop shell blocks all network requests.** ~~The game cannot start offline.~~ three.js r128 is loaded from cdnjs (`index.html:26`, `71`), and the loaders, meshopt decoder, SkeletonUtils and post-processing come from a jsDelivr combine URL (`index.html:73`). `css/menus.css:5` also `@import`s Google Fonts. The service worker is skipped on `file://` (`index.html:45`). Fix: vendor everything into the build (LICENCES.md, CHECKLIST B4).
2. **One key press on the title screen deletes the save.** When loading finishes, focus moves to the **New game** button even when a save exists (`index.html:4358`). Pressing Enter or Space (or A, if gamepad navigation reaches the title later) runs `metaTitleAction('newgame')` (`index.html:1949`, `2744`). That calls `SAVEM.reset()`, which deletes **both** `ht-save` and the backup `ht-save-bak` (`js/save.js:455`), with no confirmation. Pause → Reset save has a two-tap guard (`js/hud.js:770`); New game does not. Fix: focus Continue when a save exists, add an "Overwrite your save?" confirmation, and keep the backup.
3. **FIXED (desktop/save-store.js): the shell keeps the save in `<userData>/saves/save.json` (Steam Auto-Cloud), independent of the page origin.** ~~Saves are tied to the browser storage origin.~~ They live in `localStorage` (`js/save.js:407`). In a wrapper, any change to the origin between builds (port, custom-protocol host, app id, profile path) makes all saves silently "disappear": the game starts fresh with no error. There is no Steam Cloud. Fix: write the save JSON to the user-data folder and enable Steam Auto-Cloud (CHECKLIST B6). Not verifiable here.
4. **FIXED: title and pause have "Credits & licences" (generated from `assets/credits/credits.txt`); THIRD-PARTY-NOTICES.txt and Electron's licence files ship.** ~~No credits or licence screen.~~

### High

5. **The finale gate can't be discovered.** Locked registered jobs are simply not spawned (`index.html:4205-4208`), and nothing tells the player:
   - that 80/80 trust is needed, or
   - that the finale is offered by the family at home.

   After the 27th job a player on 79% trust sees "Saturday. Nothing on the list. Go grill something." (`index.html:4131`). Fix: once all 27 are done, add an objective line ("Trust in Riverside: 72/80 – help out around the neighbourhood") and a family prompt or marker at home.
6. **Declining the finale with "Not yet" blocks it until the app restarts.** Declining sets `JRS.declined[id]=SAVE.day` (`index.html:1845`), and `jrHomeGiver` skips declined jobs that day (`index.html:4273`). The day only advances on first-time story completions (`js/save.js:389`), and after the 27th job none are left, so the finale is never offered again this session. `JRS` lives in memory (`index.html:4175`), so even Quit to title does not clear it. Dad Taxi has the same problem if it is the last story job left. Fix: clear the decline on hub re-entry, or advance the day on sleep.
7. **The zip-tie gate is hidden.** Small Talk needs `prog.cuffed ≥ 10` (`js/jobs/talk.js:228`), and Good Fences and the finale depend on it. A strictly lethal player stalls with "nothing on the list", and the headless walk had to force `cuffed=10`. The crew's auto-cuff when you leave a wave site helps (`index.html:4063`). Fix: Gary mentions it ("Bring in ten folks alive and we'll talk"), or show the job as locked with its reason.
8. **FIXED (work/steam-desktop): js/gamepad.js covers movement, look, fire/aim, driving, title, pause, briefs, results, map and choice strips; js/keys.js adds keyboard rebinding.** ~~No gamepad in gameplay.~~ Gamepad support exists only in the shop and locker menus (`js/save.js:1044-1114`). It is not in movement, aiming, driving, the title, pause, briefs, results or the calendar. This decides the store declaration (Keyboard & Mouse only, Partial, or Full) and Deck status. See STORE.md.
9. **Quitting mid-job loses progress.** Stage checkpoints are in memory only (`JRS.cp`, `index.html:4175`). Quitting, crashing or a Steam shutdown mid-job loses the run, including the 8-stage finale (`finale.js:282`; only `seen` flags persist, `finale.js:303-306`). Players quit far more abruptly on desktop than on the web.
10. **No performance data from real hardware.** Every number in `docs/PERF.md` comes from headless SwiftShader. At Medium: hub 532–821 draw calls and about 1.4–1.7 M triangles, mission 4 up to about 1,650 draw calls, texture memory 105–233 MB. Triangle count does not drop at Low (`docs/PERF.md`, remaining weaknesses). The Auto ladder (Medium → resolution 0.6 → Low) is good, but it has never run on an integrated GPU or a Steam Deck. Fix: measure on (a) an Intel UHD 620 laptop, (b) a GTX 1050-class card, (c) a Deck at 1280×800, before stating system requirements as fact.
11. **Two copies of the same character stand on one spot.** Until the built-in job is done, two Daves at Linden Park and two Dougs at 89,37 show with two rings (`index.html:4119-4122`; `jrGivers` de-duplicates only registered jobs, `4208`).

### Medium

12. **No tutorial.** Onboarding is the title premise, random loading tips (`js/hud.js:712`), a 6-second home hint (`index.html:2976`), "Follow the yellow marker", and Rick's scripted rifle hand-over. There is no controls overlay on first launch, and zip-tying (the core "trust" mechanic) is taught only by a tip. Suggest a skippable first-5-minutes card set: move, look, talk (E), fire and ADS, zip-tie a surrendering enemy, enter the van.
13. **Missing settings** (key rebinding is now in Pause → Controls & keys, `js/keys.js`; Display mode, VSync, Interface size, Resolution scale and Frame rate cap exist, `js/platform.js`, index.html CFG; still missing below):
    - a difficulty choice (`AI.DIFFICULTY` exists in `js/ai.js:51-60` but has no UI)
    - colour-blind support (trust and alert rely on colour)
    - a voice/dialogue volume (dropped, `index.html:1246`)
14. **FIXED: index.html handles webglcontextlost/restored (pause + "Graphics reset" dialog), and frame() never stops on an exception and skips rendering while lost (PERF-06).** ~~No WebGL context-loss handling.~~ There is no `webglcontextlost` listener. A driver reset or a fullscreen alt-tab on some GPUs leaves a frozen black canvas.
15. **FIXED (SAV-10): a failed write fires `savefail`, not `saved`; the game shows "Couldn't save the game · trying again" and retries.** ~~Save-write failures are silent.~~ `sSet` returns false on a quota error (`js/save.js:409`), and nothing shows it. Photos are stored inside the save as JPEG data URLs (up to 24).
16. **Save export/import exists but has no menu.** `HT.Save.export/import` (`js/save.js:470-479`) is never called from the UI. It is a cheap manual backup.
17. **Probably not a problem (PAPERWORK P-17, from the code): a fresh save ends the story on day 29, which is odd (Porch Light) and a Saturday (Suds Up). Not traced for migrated v1/v2 saves.** Original note: Repeatables die after the story. The day counter freezes once no story jobs remain (`save.js:389`). Porch Light (odd days, `porch.js:76`) and Suds Up (Saturdays, `carwash.js:910`) can then never come round again, even though the end card promises "Every job is on the fridge calendar" (`_finale-fest.js:178`).
18. **FIXED (work/steam-desktop): the shell never registers it and answers sw.js with 404.** ~~The service worker can serve stale files in a wrapper.~~ `sw.js` caches the shell and the CDN, and `SHELL_VERSION` is bumped by hand. Disable it in the desktop build.
19. **FIXED (P-16): the meta description and og/twitter text no longer say "taking their neighborhood back" or "Play free in your browser".** ~~Web-store copy is shipped in the HTML.~~ "Play free in your browser" (`index.html:5`, `9`), plus og/twitter metadata pointing at the GitHub Pages URL.
20. **No difficulty or assist options for fail loops.** Death or failure means retry from the stage checkpoint, with gold capped after a retry (`_registry.js:82`). That is fair, but a player stuck on a hard stage has no assist.

### Low

21. **`js/carai.js` is loaded twice** (the two `<script src="js/carai.js">` tags in index.html). It is harmless (it reassigns `HT.Garage` and `HT.CarAI` before use) and costs one extra parse. Delete the second tag.
22. **`window.__ht` is exposed in production** (`index.html:4372-4403`): `jobs.start`/`finish`, `setHeat` and similar. Once Steam achievements exist, anyone can unlock them from the console. Gate it behind a dev flag.
23. **Build hygiene.** Keep `legacy/` (a 2D prototype that also uses Google Fonts), `dev/`, `docs/`, `tools/`, `pause.png`, `assets/og.jpg` and `.git` out of the depot.
24. **Leftovers.** Touch/phone code paths, and the README's "On a phone" section. Harmless.
25. **Cast stand-ins.** Sal is "not cast yet", a tinted base model (`index.html:3559-3561`), and Hank reuses the `nb_pops` model (`js/jobs/blitz.js:401`).
26. **`prog.act` is clamped to at most 2 on load** (`js/save.js:311`). There is no effect today, but any future Act 3 gate would break on reload.

### Checked and fine

- **Pointer lock:** uses unadjusted movement with a fallback (`index.html:1910`), losing the lock opens pause, and there is a cursor-free fallback.
- **Alt-tab and resize:** blur clears held keys (`index.html:1981`), and resize is handled (`index.html:117`, `js/hud.js:197`). The Electron shell turns `backgroundThrottling` off (desktop/main.js) and pauses the game itself on blur, minimise and suspend (js/platform.js), so a minimised game doesn't keep running unpaused.
- **Placeholder text:** none a player sees. The only hit is the intentional in-world fridge note "TODO: GUTTERS!!" (`js/home.js:566`).
- **Audio:** complete but entirely synthesized (`docs/AUDIO.md:3`). The procedural music has states hub, tension, combat, victory and home; voices are synthesized babble with subtitles. No files are missing. Set store expectations: no recorded soundtrack or voice acting.
- **No required job can be failed permanently.** Fail and death always offer a retry, and a free-roam death means being towed home for $40 (`index.html:3265`).
- **A job file that fails to load never registers** (`_registry.js`), which would silently make the finale unreachable. That is unlikely in a packaged build, but add a startup check that all 28 job ids registered.
