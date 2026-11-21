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
npm run dist:win       # dist/win-unpacked/ + zip (see notes below)
npm run dist:mac       # macOS: run this on a Mac (see notes below)
npm run dist:full      # same as dist, also ships the source assets (only needed if assets/opt is stale)
xvfb-run -a node test/e2e.js --exe dist/linux-unpacked/HighTrust   # end-to-end check of a packaged build
```

Shell flags: `--windowed`, `--fullscreen`, `--no-steam`, `--dev` (devtools in a packaged build).
Env: `HT_USER_DATA=<dir>` (alternate profile, used by tests), `HT_STEAM_APPID=<id>`.

Before packaging, run `node dev/check-build.js` from the repo root. The package ships `assets/opt/` (the optimised variants the game
loads), not the source assets, so `assets/opt` has to be up to date (`node tools/build-assets.js`).

SIZE_SECTION

## Steam setup (owner)

### Depots and upload with steamcmd

Templates are in `docs/steam/vdf/`. Replace `APP_ID`, `WINDOWS_DEPOT_ID` and `LINUX_DEPOT_ID` with the ids from Steamworks.

1. Steamworks → your app → *SteamPipe → Depots*: add a Windows depot (OS: Windows, 64-bit) and a Linux depot (OS: Linux + SteamOS).
2. *Installation → General*: add launch options:
   - Windows: executable `HighTrust.exe`, OS Windows.
   - Linux: executable `HighTrust`, OS Linux. Arguments: none. On Steam Deck the native Linux build runs as-is. If a driver
     ever misbehaves, users can force Proton with the Windows build.
   - Optional extra entry "Windowed": the same executable with `--windowed`.
3. Build the two folders (`npm run dist`), then upload:

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

## Steam Deck checklist

- [ ] Native Linux depot uploaded. Launch option set for Linux. Deck: verify it starts fullscreen at 1280×800 and the title fits (16:10).
- [ ] Controller: every menu (title, pause, settings tabs, brief, result, shops, calendar, map) works with the D-pad/stick, A and B.
  The pause menu "Key bindings" tab lists the controller layout. Prompts switch to pad glyphs as soon as the pad is used.
- [ ] Steam Input: set the default controller config to **Gamepad** (the game reads the standard mapping). Do not ship a
  keyboard/mouse template as the default.
- [ ] Text input: the game has no free-text fields, so no on-screen keyboard is needed.
- [ ] Performance: Graphics Auto starts on Medium and steps down. On Deck test *Low* + *Resolution scale 75%* + *Frame rate cap 30/60*.
  The Deck's own frame limiter also works.
- [ ] Suspend/resume: the shell keeps rendering in the background (throttling off) and Steam suspends the process. Check that audio comes back.
- [ ] Save: play, quit from the pause menu, relaunch, Continue. Check Steam Cloud sync between Deck and PC.
- [ ] Fonts: all local (`assets/fonts`). Nothing is fetched.
- [ ] Offline: works in airplane mode (the shell blocks all network requests anyway).
- [ ] Deck Verified review: the default controller config, glyphs matching the device (the game shows Xbox glyphs, or PlayStation glyphs for
  Sony pads), no launcher, readable text at 1280×800 (smallest HUD text is 10-11 px: check it).

## Things only the owner can do

- Steamworks partner account, the $100 app fee, tax/bank info, the app id, depot ids.
- Store page: capsules, screenshots, trailer, description, age rating questionnaire (it's a shooter), price, release date.
- Achievement icons and publishing them, the rich presence file, Steam Cloud settings, Steam Input default config.
- Code signing: a Windows code-signing certificate (otherwise SmartScreen warns on the zip build; Steam installs aren't affected), and an Apple
  Developer ID + notarization for macOS.
- The build account for steamcmd, and pushing builds live.
- Set `RELEASE_APP_ID` (desktop/steam.js) and `appId`/`copyright` (desktop/electron-builder.config.js).
