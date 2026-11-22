# High Trust

A browser shooter about a group of suburban dads who restore a high-trust neighborhood through violence they would really prefer wasn't necessary.

Play it: https://hereiszee.github.io/high-trust/

It's a single `index.html` built on Three.js r128 (vendored in `vendor/`, no network needed). There's no build step. Open the file in a browser, or serve the folder with any static server.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move |
| Shift | Jog |
| C | Crouch |
| Mouse | Look (click the view to lock the cursor) |
| Esc | Pause: look speed, aim speed, field of view, invert look, first person |
| Left click | Fire |
| Right click | Aim down sights |
| R | Reload |
| 1 / 2 / 3, Q, mouse wheel | Switch guns |
| E | Talk, zip-tie, smash stashes (hold) |
| V | Over-the-shoulder or first-person view |
| E (near the minivan) | Get in or out |
| W / S, A / D | Drive: gas and brake or reverse, steer |
| Shift / Space / H | Drive: boost, handbrake, horn |

On a phone, drag on the left half of the screen to move and on the right half to look. Use the on-screen buttons for everything else.

With a controller (Xbox, PlayStation, Steam Deck): left stick moves, right stick looks, RT fires, LT aims while held, A uses or jumps, Y gets in or out, Menu pauses. The menus work with the D-pad, A and B. The full layout is under Pause → Key bindings.

The desktop (Steam) build wraps this same page in Electron (`desktop/`). See `docs/steam/BUILD.md`.

## Releasing on Steam

Start with `docs/steam/START-HERE.md`: a one-page, step-by-step walkthrough from downloading the builds to pressing Release.

| File | What it's for |
| --- | --- |
| `docs/steam/START-HERE.md` | The short walkthrough. Read this first. |
| `docs/steam/BUILD.md` | Building the Windows, macOS and Linux packages, uploading with steamcmd, Steam Cloud, Steam Deck, Mac signing. |
| `docs/steam/CHECKLIST.md` | Every release step in order, with what only the owner can do and the placeholders still to fill in (App ID, depot IDs). |
| `docs/steam/STORE.md` | Store page text, tags, system requirements, required image sizes, the AI disclosure text. |
| `docs/steam/achievements.md` | The 23 achievements to enter in Steamworks. |
| `docs/steam/PLAYTEST.md` | How to download and launch a build, and what to check on real hardware. |
| `docs/steam/LICENCES.md` | Every third-party asset and library, with its licence. |
| `.github/workflows/desktop-build.yml` | Builds all three packages on GitHub (Actions → Desktop build → Run workflow). |
| `docs/steam/vdf/` | steamcmd upload scripts with `APP_ID` and depot ID placeholders. |


## Missions

Talk to each dad at his yellow marker in Maple Heights. Take the job, get in the minivan, and drive the crew to the job site at the edge of the neighborhood (or pick "Skip the drive" in the brief). Finish his job and he joins the crew for every raid after it.

1. **Return to Sender** (Gary): recover stolen packages from a chop shop on Industrial Way.
2. **Fourth Quarter** (Coach Rick): smash three stash tables in the duplex on Birch before reinforcements arrive.
3. **Block Party** (Big Dave): hold Linden Park through three waves.
4. **The Kingpin** (Doug): find the Porch Pirate King and give him the chance to surrender.

Hurt enemies sometimes give up. Zip-tie them instead of finishing the job, because trust is the whole point.

## Layout

- `index.html`: the game
- `legacy/top-down.html`: the original 2D top-down prototype
