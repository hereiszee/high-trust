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
