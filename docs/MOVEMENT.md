# Movement: jumping, low cover, vault and mantle, automatic ammo

All of this lives in `index.html` (plus a small procedural layer in `js/people.js`). Tests: `node dev/movement-check.js [--shots] [--only=jump,crate,vault,mantle,fuzz,curb,ammo,crew,fpshot,missions]`. It needs no server. Screenshots go to `docs/screenshots/movement/`.

## Numbers
| | |
|---|---|
| gravity | 22 m/s² (`MOVE.g`) |
| take-off speed | 6.8 m/s, so the apex is 1.05 m and a jump lasts 0.62 s on flat ground |
| coyote time | 0.10 s after walking off an edge |
| jump buffer | 0.12 s before landing |
| air control | the horizontal velocity eases toward the input at a rate of 2.6/s (on the ground it is instant, as before) |
| step-up | 0.26 m, both up and down without leaving the ground (curbs are 0.12 m) |
| vault | waist-high (top up to 1.3 m above the feet) and up to 1.3 m deep with room beyond. Takes 0.42 s plus 0.04 s per metre |
| climb | waist-high but too deep to vault (crates): onto the top in 0.36 s |
| mantle | chest-high (1.3–2.05 m) with a standable top: 0.62 s |
| landing | a short slow-down (0.06–0.38 s, scaled by fall height), a camera dip, two footsteps whose volume scales with the fall, and a light shake above 1.4 m |

## Colliders
`L.colliders` entries are still 2D boxes `{x0,z0,x1,z1}`. An optional `h` gives the world height of the top, and `s` gives the footstep surface on top. With no `h`, the box is full height (walls, houses, trees, lamps, vehicles, the grill and the bounce house).
- `c` crate: h 1.15, wood
- `f` hedge: h 1.2, grass
- `T` stash table: h 0.85, wood

Vehicles are deliberately kept full height: one box spans hood and roof, so standing on it would float over the hood.

## Functions
- `collide(p,r,feet)`: with `feet` given, a box whose top is at or below the feet (within the step height) is stood on, not pushed against. NPC calls pass no feet, so everything blocks them as before.
- `supportAt(x,z,feet)` returns what the feet rest on: the highest low top within a step, else the ground (`HT.World.groundY` for the hub's lowered roads).
- `worldGroundAt(x,z)` is the same with no height limit. It is passed to `FX.init` as `groundAt`, so shells and debris land on crate tops.
- `solidAt(x,z,r,feet)` is the overlap test used for vault clearance and for the anti-pinch fallback, which slides one axis at a time when two boxes are closer together than a body.
- Player state lives on `P`: `pos.y` is the feet height, plus `vy onGround coyoteT jumpBuf landT vault visY hv dip vmJ`. `visY` is a smoothed feet height used by the camera and the body, so curb steps never pop. `resetMove()` runs at every teleport (level start, hub, van exit, fast travel).
- Enemy sight: `losClearFor` and the AI threat's `crouch` flag ignore crouching while the player stands on something higher than 0.6 m, so low cover no longer hides you up there.

## Animation
- **Third person:** `pose(d,dt,{…,air})` passes `{k:'jump'|'fall'|'land'|'vault'|'climb'|'mantle',t,…}`. `People.applyAir` then:
  - tucks the knees, one leg leading
  - leans the spine
  - spreads the arms for balance when no gun is raised
  - sinks the hips on landing
  - slows the locomotion clip while airborne

  It runs after the mixer and before the aim layer, and its leg offsets are undone each frame like the other procedural bones.
- **Touch:** the Jump button is part of the HUD touch layer (`js/hud.js` button list, `css/hud.css` position, hidden while driving) and arrives as `HUD.on('touch')` action `jump`.
- **First person:** `vmAir()` makes the gun lag on take-off, dip on landing and sway with vertical speed. During a vault it drops and cants the gun.
- **Firing:** there is no firing mid-vault. Firing in the air has 1.9× spread.

## Automatic ammo
Within 1.25 m:
- ammo bags (`a` tiles) and dropped ammo boxes
- the ammo in a dropped gun of a type you carry

These fly to you over 0.22 s, play the pickup sound and post `+24 9mm` to the HUD feed. If you have room for only part of it, the rest stays on the floor. A full pouch posts `9mm full` once per ammo type until you spend some. A gun you don't carry still needs hold-E. A surrendered man's gun waits for the zip-tie, so confiscation still counts.

## Test hooks
`__ht.jump()`, `__ht.move` (`{y,vy,onGround,vault,landT,peakY,airT}`), `__ht.ground(x,z)`, `__ht.support(x,z,y)`, `__ht.solidAt(x,z,r,y)` and `__ht.MOVE`.
