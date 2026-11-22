# Playtesting the desktop build on your own machines

The CI builds are the real Steam builds, just not uploaded to Steam yet. This page covers getting them onto a Windows PC, a Mac and a
Steam Deck or Linux box. It ends with a 20-minute checklist of things only a person with real hardware can judge.

## 1. Download a build

1. Open the repository on GitHub → **Actions** → **Desktop build**. Pick the newest run with a green tick, or start one:
   **Run workflow**, branch `main`.
2. Scroll to **Artifacts** at the bottom of the run page. Each is a zip:
   | Artifact | For |
   |---|---|
   | `high-trust-windows-x64` | Windows 10/11 (x64) |
   | `high-trust-linux-x64` | Linux, Steam Deck desktop mode |
   | `high-trust-macos-universal-archive` | macOS 12+ on Apple Silicon or Intel: the zip inside holds `HighTrust.app` (only the zip keeps the app bundle intact) |
   | `high-trust-windows-x64-archive`, `high-trust-linux-x64-archive` | the Windows / Linux builds as one zip / tar.gz |
   | `*-test-output` | screenshots and logs from the CI test (ignore unless something failed) |
   Artifacts expire after 14 days. GitHub needs you to be signed in to download them.

## 2. Unzip and launch

**Windows.** Unzip anywhere, then run `HighTrust.exe`. SmartScreen may say "Windows protected your PC" because the exe isn't code-signed yet.
Click **More info → Run anyway**. Steam installs don't show this.

**macOS.** Download `high-trust-macos-universal-archive`, unzip it, then unzip `High Trust-…-universal-mac.zip` inside (double-click it in Finder; Finder keeps the bundle intact), then move `HighTrust.app` (it may show as "High Trust") to Applications or anywhere.
The CI build is **ad-hoc signed but not notarised** (that needs your Apple Developer ID, see BUILD.md), so Gatekeeper blocks a double-click:
- **Right-click the app → Open → Open.** You only need to do this once. On recent macOS you may also have to allow it under
  **System Settings → Privacy & Security → "HighTrust was blocked" → Open Anyway**.
- Or in Terminal: `xattr -dr com.apple.quarantine /path/to/HighTrust.app`, then open it normally.
- If it says the app "is damaged and can't be opened", that is the quarantine flag on an un-notarised download. Run the `xattr`
  line above.
- Players won't see any of this once the build is signed and notarised.

**Linux / Steam Deck (desktop mode).** Unzip, then `chmod +x HighTrust` if needed and run `./HighTrust`.
If it exits at once with a sandbox error, run `./HighTrust --no-sandbox` (some distros restrict unprivileged namespaces).
To try the Deck experience from desktop mode: Steam → *Add a Non-Steam Game* → pick `HighTrust`, then launch it in Game Mode.
In Game Mode, set the environment variable `SteamDeck=1` in launch options (`SteamDeck=1 %command%`) to get the Deck defaults.
A real Steam install sets it for you.

Useful flags on every OS: `--windowed`, `--no-steam`, `--dev` (opens devtools with F12).
The log is `high-trust.log` in the profile folder: `%APPDATA%\High Trust`, `~/Library/Application Support/High Trust`,
`~/.config/High Trust`. The save is `saves/save.json` in the same folder.

## 3. The 20-minute checklist

Tick these on each machine you have. Write down the machine (CPU/GPU, OS, display) next to anything odd.

**Start-up (2 min)**
- [ ] It opens fullscreen to the title in under about 15 s, with no white flash and the right icon in the taskbar or Dock.
- [ ] F11 / Alt+Enter (Option+Enter or Ctrl+Cmd+F on Mac) switches window ↔ fullscreen. Settings → Display → Display mode follows it.
- [ ] Works with the network unplugged (turn Wi-Fi off and relaunch).

**Frame rate and looks (4 min)**
- [ ] Clock in, walk and drive around Maple Heights for a minute on Graphics **Auto**. Does it feel smooth (aim for 60 fps on a
  desktop GPU, 30+ on a Deck or iGPU)? Settings → Display shows "Auto · now …"; note which level it settled on.
- [ ] Try **High** and **Low**, Resolution scale 75%, Frame rate cap 30/60. Each should visibly change something with no glitches.
- [ ] On a high-DPI display (Retina, 4K): text is sharp and the 3D view isn't blurry on High.
- [ ] Mac on Apple Silicon: post effects (bloom, colour grade) look the same as on Windows.

**Mouse and keyboard (3 min)**
- [ ] Click to lock the cursor. Look speed feels right at the default, and Invert look works.
- [ ] Esc opens pause and a second Esc resumes. Alt-tab or Cmd-Tab away pauses the game, and coming back doesn't spin the camera.
- [ ] Pause → Controls & keys: rebind Reload to T and Fire to Mouse 4 (if your mouse has it). Both work in game, and the prompts show the new keys.
  Then Reset to defaults.

**Controller (5 min).** Use whatever you have: Xbox, PlayStation, the Deck itself.
- [ ] Touching the pad swaps prompts to pad buttons. PlayStation pads show ✕ ○ □ △.
- [ ] On foot: the move and look sticks feel right (not twitchy, no drift). RT fires, LT aims, A talks/jumps, X reloads, B crouches.
- [ ] Driving: RT throttle, LT brake, steering feels OK, Y gets out.
- [ ] Menus: title, pause, settings tabs (LB/RB), a job brief, the map (View; stick pans, A fast-travels). Everything is reachable with no mouse.
- [ ] One job start to finish on the pad (Porch Light or Dad Taxi). Note any prompt that still shows a keyboard key.
- [ ] Fort Sensible: drive the tank (RT fires) and fly the jet (left stick pitch/roll, triggers throttle) for a minute.

**Audio (1 min)**
- [ ] Music, effects and ambience play. The volume sliders work. Sound comes back after alt-tab and after sleep.

**Steam (2 min, only once the app id exists and the build runs through Steam)**
- [ ] Shift+Tab opens the Steam overlay over the game, and closing it returns to the game (paused).
- [ ] Your Steam friends see "Out and about in Maple Heights" or "On a job: …".
- [ ] Finishing your first job unlocks *Clocked In*.

**Saves (3 min)**
- [ ] Do a job or buy something, Quit to desktop (pause menu), relaunch, Continue. Everything is there.
- [ ] Close the window mid-game (Alt+F4 or Cmd+Q), relaunch. At most the last few seconds are lost.
- [ ] Steam Deck: suspend with the power button mid-game, wake. The game is paused and fine.
- [ ] With Steam Cloud on: play on one machine, then launch on another and Continue.

Send back: the machines tried, the Auto level each settled on, anything that felt off, and `high-trust.log` from any machine that
misbehaved.
