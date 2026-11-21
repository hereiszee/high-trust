# High Trust on Steam: building, uploading, Steam Deck

The web build (GitHub Pages, `index.html`) and the desktop build run the same game files. The desktop build wraps them in an
Electron shell (`desktop/`). It serves the files from disk, needs no network, keeps the save in a file Steam Cloud can sync, and talks to Steamworks
when Steam is running.

## What's in `desktop/`

| File | What it does |
|---|---|
| `main.js` | Main process: serves the game from local files under the `app://game/` scheme and cancels every non-local request. Also handles: single instance, fullscreen by default, F11 / Alt+Enter toggle, no menu bar, devtools only in dev, background throttling off, the window icon, the save file, quit. |
| `preload.js` | The `window.HTDesktop` bridge (contextIsolation on, sandboxed). The page gets no Node access. |
| `save-store.js` | Writes `<userData>/saves/save.json` atomically and keeps `save.json.bak`. Tested by `test/save-store.test.js`. |
| `steam.js` | steamworks.js behind a guard. Without Steam, a Steam app id or the native module, every call is a no-op. |
| `electron-builder.config.js` | Packaging config. The game files go into `resources/game`. `dev/ docs/ legacy/ tools/` and `desktop/` never ship. |
| `test/e2e.js` | Launches the shell (dev, or a packaged exe with `--exe`) and checks title, free roam, zero errors, zero remote requests, pause and Quit, settings, save written and read back, the controller. |
| `steam_appid.txt` | **480, a placeholder** (Valve's public Spacewar test app) for local testing only. It is never packaged. |

Game-side pieces (shared with the web build, all no-ops on the web unless noted):
- `js/platform.js`: `HT.Steam` (achievements, rich presence) and the desktop-only settings (Display mode, VSync) and Quit to desktop.
- `js/gamepad.js`: the controller layer. It also works in the web build.
- `js/keys.js`: keyboard rebinding (Pause → Key bindings), web and desktop. Tested by `dev/keys.e2e.js`.
- `vendor/`: Three.js r128 and its add-ons, vendored, so neither build depends on a CDN.
- `js/save.js` and `index.html`: in the shell, both use `HTDesktop.storage` (the save file) instead of localStorage.

## Build

Requirements: Node 20+ and npm. Run everything from `desktop/`.

```sh
cd desktop
npm ci                 # electron, electron-builder, steamworks.js
npm start              # run the shell on the repo (dev: devtools on F12)
npm test               # save file unit tests
npm run dist:linux     # dist/linux-unpacked/ + dist/high-trust-1.0.0.tar.gz
npm run dist:win       # dist/win-unpacked/ + zip. Without wine the exe keeps Electron's icon: build releases on Windows
npm run dist:mac       # macOS only: universal (arm64 + x64) .app in dist/mac-universal + zip. Use CI (below) from Linux/Windows
npm run dist:full      # same as dist, also ships the source assets (only needed if assets/opt is stale)
xvfb-run -a node test/e2e.js --exe dist/linux-unpacked/HighTrust   # end-to-end check of a packaged build
```

Shell flags: `--windowed`, `--fullscreen`, `--no-steam`, `--dev` (devtools in a packaged build).
Env: `HT_USER_DATA=<dir>` (alternate profile, used by tests), `HT_STEAM_APPID=<id>`.

Before packaging, run `node dev/check-build.js` from the repo root. The package ships `assets/opt/` (the optimised variants the game
loads), not the source assets, so `assets/opt` has to be up to date (`node tools/build-assets.js`).

## What gets built, and its size

Measured on this branch (electron 45.4.1, electron-builder 26.0.12):

| Output | Size |
|---|---|
| `dist/linux-unpacked/` (Linux depot) | 344 MB |
| `dist/high-trust-1.0.0.tar.gz` | 180 MB |
| `dist/win-unpacked/` (Windows depot) | 387 MB |
| `dist/High Trust-1.0.0-win.zip` | 203 MB |
| of which `resources/game` (the game itself) | 69 MB (assets/opt 63 MB, js 4.3 MB, vendor 0.9 MB) |
| `resources/app.asar` + steamworks.js natives | 9 MB |
| Electron/Chromium runtime | about 265 MB Linux, 310 MB Windows |

Steam compresses depots, so the download is close to the zip/tar.gz size (about 180-200 MB), and patches are delta-encoded.

**The asset cut already applied:** `assets/` is about 150 MB in the repo, but the game loads the optimised, content-hashed files in
`assets/opt/` (docs/PERF.md) and every source file is listed in `assets/opt/manifest.json`. So the package ships only `assets/opt`
(minus the JPEG boot pack, since Chromium always takes the WebP one), fonts and credits. `npm run dist:full` ships everything instead (+82 MB) if
the manifest ever lags behind. A loader that asks for a source path before the manifest has arrived (js/world.js's interior furniture
does this at startup) is served the optimised file the manifest maps it to (`optFor` in main.js). The e2e test fails on any file that is still
missing (`[app] 404` in the log).

**How to cut more:**
1. *Electron itself is most of the package.* `electronLanguages: ['en-US']` already drops the other locales. A Steam-only build could
   swap Electron for a smaller WebView shell (Tauri or a CEF build), but that drops the steamworks.js overlay path. Not recommended for launch.
2. *Textures:* `assets/opt` keeps both tiers (`m` and `l`). Dropping the reduced tier would save roughly 10-15 MB, but Graphics Auto/Low uses it. Better: convert
   the largest `l` textures to KTX2/Basis (GPU-compressed). That is smaller on disk and in VRAM, which matters on the Deck. It's a renderer change, so plan it separately.
3. *People GLBs* (36 MB of sources, 31 MB in assets/opt) are the biggest single group. Meshopt + quantization is already on; draco
   wouldn't add much.
4. Strip the macOS/Windows natives from the Linux depot and vice versa (`node_modules/steamworks.js/dist/*`, about 6 MB).


## CI: all three platforms (`.github/workflows/desktop-build.yml`)

To try a CI build by hand on Windows, Mac or Linux/Deck, see **docs/steam/PLAYTEST.md** (download, unzip, the Gatekeeper/SmartScreen steps, a 20-minute hardware checklist).

Actions → **Desktop build** → *Run workflow* (or push a `v*` tag). It runs three jobs:

| Runner | Builds | Artifact (= depot content) |
|---|---|---|
| `windows-latest` | `HighTrust.exe` x64, with the High Trust icon (rcedit works there) | `high-trust-windows-x64` |
| `macos-latest` | `High Trust.app`, **universal** (arm64 + x64 merged by @electron/universal, which only runs on macOS) | `high-trust-macos-universal` |
| `ubuntu-latest` | `HighTrust` x64, then the packaged e2e test under xvfb | `high-trust-linux-x64` |

Each job also runs the save-file unit tests and `dev/check-build.js` (assets/opt up to date). Download the artifacts, put each in
`desktop/dist/{win-unpacked,mac-universal,linux-unpacked}`, and run steamcmd (below). The repo holds no secrets. Signing steps run only
when the repository secrets listed at the top of the workflow exist.

## macOS: signing and notarisation (owner)

**An unsigned or un-notarised Mac build is blocked by Gatekeeper, even when Steam installs it** ("High Trust can't be opened because Apple
cannot check it for malicious software"). Players can override it in System Settings, but that is not shippable. What you need:

1. An **Apple Developer Program** membership ($99/year) for your team.
2. A **Developer ID Application** certificate (Xcode → Settings → Accounts → Manage Certificates → +, or developer.apple.com → Certificates).
   Export it from Keychain as a `.p12` with a password.
3. An **app-specific password** for your Apple ID (appleid.apple.com → Sign-In and Security), and your **Team ID** (developer.apple.com → Membership).
4. Add GitHub repository secrets: `MAC_CERT_P12_BASE64` (`base64 -i cert.p12 | pbcopy`), `MAC_CERT_PASSWORD`, `APPLE_ID`,
   `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. The next CI run signs with the hardened runtime, notarises and staples. The
   "macOS signature / notarisation report" step prints `codesign -dv` and `spctl` output so you can confirm it.
   Locally on a Mac the same env vars work (`CSC_LINK=cert.p12 CSC_KEY_PASSWORD=… APPLE_ID=… npm run dist:mac`).

Entitlements (`desktop/build/entitlements.mac.plist`): `allow-jit` and `allow-unsigned-executable-memory` (V8 and WebGL),
`disable-library-validation` (Valve's `libsteam_api.dylib` loaded by the steamworks.js addon), and `allow-dyld-environment-variables`
(the Steam overlay injects `gameoverlayrenderer.dylib` with `DYLD_INSERT_LIBRARIES`; without it there is no overlay on Mac).

Other macOS details, handled in the shell:
- **Cmd+Q** quits, flushing the save first. macOS keeps a minimal app menu (Quit, Hide, Ctrl+Cmd+F fullscreen), since without a menu
  Cmd+Q does nothing.
- **Fullscreen** is native macOS fullscreen: its own Space, the menu bar slides in at the top edge, and switching animates for about 0.7 s.
  F11, Alt/Option+Enter and Ctrl+Cmd+F all toggle it. Simple (pre-Lion) fullscreen would be instant but breaks Mission Control and multi-display;
  `win.setSimpleFullScreen` is the one-line switch if testing prefers it.
- **Pointer lock** is Chromium's and works the same as on Windows. Esc releases it and opens the pause menu, as in the browser.
- **Retina:** the graphics presets cap the pixel ratio (Low 1, Medium 1.25, High 2) and Auto starts on Medium, so a 2× display doesn't
  render at 4× the pixels by default. Resolution scale goes lower still.
- **Apple Silicon:** WebGL runs through ANGLE on Metal, natively in the universal build (no Rosetta). WebGL2 + half-float render targets
  are supported there. **This has not been run on a real Mac** (no Mac here). First test on CI artifacts: start → free roam →
  post effects on High → pause → Cmd+Q → relaunch → Continue.
- The minimum macOS is 12 (Electron 45's floor is 12).

## Steam setup (owner)

### Depots and upload with steamcmd

Templates are in `docs/steam/vdf/` (one depot per OS). Replace `APP_ID`, `WINDOWS_DEPOT_ID`, `MAC_DEPOT_ID` and `LINUX_DEPOT_ID` with the ids from Steamworks.

1. Steamworks → your app → *SteamPipe → Depots*: add three depots: Windows (OS: Windows, 64-bit), macOS (OS: macOS), Linux (OS: Linux + SteamOS).
2. *Installation → General*: add launch options:
   - Windows: executable `HighTrust.exe`, OS Windows.
   - Linux: executable `HighTrust`, OS Linux. Arguments: none. On Steam Deck the native Linux build runs as-is. If a driver
     ever misbehaves, users can force Proton with the Windows build.
   - macOS: executable `High Trust.app`, OS macOS.
   - Optional extra entry "Windowed": the same executable with `--windowed`.
3. Get the three folders (CI artifacts, or `npm run dist` + a Mac build), then upload:

```sh
steamcmd +login <builder_account> +run_app_build "$(pwd)/docs/steam/vdf/app_build.vdf" +quit
```

   Use a dedicated build account with Steam Guard. Never commit credentials. Set `"Preview" "1"` first for a dry run.
4. *Builds*: set the uploaded build live on a `beta` branch, test, then on `default`.
5. Once Steamworks assigns the app id, set `RELEASE_APP_ID` in `desktop/steam.js`. Packaged builds started outside Steam then relaunch through Steam. Leave it at 0 for a DRM-free build.

### Steam Cloud (Auto-Cloud)

The save is one small file: `save.json` (+ `save.json.bak`) in the `saves` folder of the profile directory.

*Steam Cloud → Settings*: byte quota 50 MB (the save holds up to 24 photos as JPEG data), files 10. Root paths:

| OS | Root | Subdirectory | Pattern |
|---|---|---|---|
| Windows | `WinAppDataRoaming` | `High Trust/saves` | `save.json*` |
| Linux / Deck | `LinuxXdgConfigHome` | `High Trust/saves` | `save.json*` |
| macOS | `MacAppSupport` | `High Trust/saves` | `save.json*` |

These are `%APPDATA%\High Trust\saves`, `~/.config/High Trust/saves` and `~/Library/Application Support/High Trust/saves`.
Settings (graphics, volume, sensitivity) are inside the same file (`ht-cfg`), so they sync too. The window mode and VSync are
per machine (`desktop-settings.json`, not synced).

### Achievements and rich presence

See `docs/steam/achievements.md` (23 achievements with API names, plus the rich presence localization file).

### Overlay

`steam.js` calls `electronEnableSteamOverlay()` after a successful init. That adds the `in-process-gpu` and
`disable-direct-composition` switches and keeps repainting the window, so the overlay (Shift+Tab) draws over WebGL. Without
Steam none of that happens.

## Steam Deck checklist (Deck Verified criteria, item by item)

Status key: **done** = implemented and checked in a packaged build with the Deck emulated (`SteamDeck=1`, 1280×800, scripted pad;
`node desktop/test/e2e.js --exe … --deck-only`); **device** = implemented, needs a real Deck; **owner** = a Steamworks setting.

| Valve criterion | Status | How High Trust meets it |
|---|---|---|
| **Input: default controller config** is a gamepad config | owner | Set *Steam Input → Default configuration → Gamepad* (the game reads the standard mapping itself). Do not publish a keyboard/mouse template as the default. |
| **Input: full controller support**, no keyboard or mouse needed | done (device for feel) | `js/gamepad.js`: on foot, driving, tank, jet, every menu (title, pause, settings, brief, result, calendar, map with pan/zoom/fast travel; shops and locker keep their own pad code). Job keys (G, T, Tab, Z, X, 1-4) via the LB layer. Covered by `dev/pad.e2e.js` and `desktop/test/e2e.js`. Not yet played through every job on a pad. |
| **Input: glyphs** match the controller (Steam Deck or Xbox) | done | Xbox glyphs by default, PlayStation glyphs for Sony pads. Keycaps and sentences ("hold E" becomes "hold A") switch when the pad is the last device. On a Deck it is pad-first from the first frame. Deck-specific art (Valve's own glyph images) is optional, not added. |
| **Input: on-screen keyboard** when text entry is needed | done (N/A) | The game has no free-text fields. |
| **Display: 1280×800 (or 720p) supported, the default** | done | Fullscreen at the display's size by default. A windowed fallback on a Deck opens at 1280×800. Every screen is laid out for 1280×720 CSS px or more. |
| **Display: text legible**, smallest at least 9 px at 1280×800 | done | On a Deck, Interface size defaults to 110% and `html.ht-deck` raises the 9-10 px HUD text to 11 px CSS, so nothing renders under about 12 px. Screenshot: `docs/screenshots/steam/deck-title.png`. |
| **Display: default graphics** run well | device | Graphics Auto. On a Deck the first run starts one rung lower (Medium at 85% resolution) and climbs while frames allow; the frame rate cap and the Deck's own limiter both work. Measure on hardware. |
| **Seamlessness: no launcher**, nothing that needs a mouse before play | done | Electron opens straight to the title screen. Focus starts on a button; A presses it. |
| **Seamlessness: no unsupported-device warnings** | done | None shown. |
| **System: runs on SteamOS** | device | Native Linux depot (x64). The Windows build under Proton also works in principle; not tested. |
| **System: suspend / resume** | done (device) | The OS suspend event (`powerMonitor`) and the page going hidden both write the save and pause the game. On resume, frame time is capped at 50 ms, so nothing jumps. Verify sleep/wake on a Deck. |
| **System: no anti-cheat or online requirement** | done | None. Offline by design: the shell blocks all network requests. |
| **Cloud saves** (recommended) | owner | Auto-Cloud on `LinuxXdgConfigHome / High Trust/saves` (table above). |

## Things only the owner can do

- Steamworks partner account, the $100 app fee, tax/bank info, the app id, depot ids.
- Store page: capsules, screenshots, trailer, description, age rating questionnaire (it's a shooter), price, release date.
- Achievement icons and publishing them, the rich presence file, Steam Cloud settings, Steam Input default config.
- Code signing: a Windows code-signing certificate (otherwise SmartScreen warns on the zip build; Steam installs aren't affected), and an Apple
  Developer ID + notarisation for macOS (required: Gatekeeper blocks unsigned Mac builds).
- The build account for steamcmd, and pushing builds live.
- Set `RELEASE_APP_ID` (desktop/steam.js) and `appId`/`copyright` (desktop/electron-builder.config.js).
- Apple Developer Program, Developer ID certificate, app-specific password, Team ID → GitHub secrets (see the macOS section).
