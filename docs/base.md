# Fort Sensible: the range, the tank, the jet and the easter eggs

A small training post south of Industrial Way, open from the first minute of free roam. No job unlocks it. It is on the full map
(a target pin), signposted on Route 9 ("FORT SENSIBLE ↓ · PUBLIC RANGE") and at the tree line, reachable by road (Industrial Way
now runs south through the old tree line to the gate), and fast-travel from the minivan once you have been there.

| File | What it does |
|---|---|
| `js/worldgen.js` | The grid grew from 80 to **128 rows**. Rows 80-127 west of the river are the post (`HOODS.base`, region `'base'`); east of the river they are meadow. Rows 0-79 are unchanged except Industrial Way's two new rows (78-79) through the tree line. `def.base` holds every spot in metres (gate, guard, range lanes, tank, jet, runway...). Buildings are `'A'` blocks marked `custom` (solid, on the minimap, colliders at their `roofY`) that js/base.js draws. |
| `js/base.js` | The post's look: cull units `base_range`, `base_mid`, `base_east`, `base_air`, `base_r9` through `HT.OpenWorld.addSetpiece` (merged per material, one sign atlas page, culled like the rest of the world). The rules (`HT.Base.armOk`, `inBase`, `onLine`, `line`) and a tiny hook bus (`HT.Base.on('interact')`). |
| `js/range.js` | The gate guard, the barrier, the flag, the range officer, the targets, the timed course, the results card, the leaderboard board, the rental rack. |
| `js/tank.js` | LAWN ORDER, the motor pool's tank. |
| `js/jet.js` | DAD-1, the Air Wing's trainer; the High Bridge; far terrain and roof lids while flying. |
| `js/eggs.js` | Seven easter eggs and the pause-menu list. |
| `js/openworld.js` | `OW.addSetpiece`, `OW.kit`, `OW.flight({R,blod})` (wider draw radius while flying). |
| `index.html` | Small, commented hooks: `HT.Roam` (the free-roam surface these files use), `baseArmOk`/`baseLine` in `frDraw`/`frUpdate`, `roamPrompt` in `updHub`, `userData.onShot` in `fire()`, `e.fly` (skip ground physics) in `updVan`, `e.noExit` and `e.noJobs` in `updHub`, the base region subtitle, the pin kind, the pause menu's `found` list. |
| `js/hud.js` | A `range` pin icon; the pause menu's "Things your dad found" tab. |
| `js/save.js` | `SAVE.base` defaults (`visited, met, range{gun:[top 5]}, rentals, eggs{}, tank{}, jet{}`); old saves get them through the normal default merge. |

## Getting there and the post

The gate has a raised barrier (it lifts when anybody comes within 24 m) and Cpl. Doyle, who waves you through ("Range is open to
the public on days ending in Y"). Inside: the parade ground with a flagpole (the plain US flag the school flies, waving), two
barracks, a water tower ("FORT SENSIBLE · HYDRATE"), the control tower, the motor pool, Hangar 2 ("THERE IS NO HANGAR 1"), the
apron and runway 27/09 (258 m), and regulation signs along the main road (REGULATION 4: NO RUNNING. UNLESS SOMETHING IS ON FIRE...).
Insignia are a generic shield with a star and oak leaves. Staff come from the neighbour pool (`HT.People.make('neighbour')`), with a
patrol cap added.

## The range

Walk in (the first visit puts a marker on Sgt. Pruitt). The range compound is a training area: `1`/`2`/`3`/`Q` or Fire draws, `H`
holsters, leaving the compound holsters ("Leaving the range"), and no heat is ever made here. Everywhere else on the post the gun
stays away, like Maple. The muzzle has to point downrange (west): a shot more than ~70° off is refused with a line from the
officer. Free ammo on the line (the reserve of the gun in hand stays full).

* Lanes 1-6 face west. Paper bullseyes at 10, 25 and 50 m (rings score 1-10), a plate rack at 25 m (plates fall), steel gongs at
  50 and 100 m (they ring and swing), five pop-ups at 16 m (a cartoon burglar, or Phil the mailman: don't shoot Phil), and a mover on
  a rail at 22 m.
* **The timed course** (E at the officer): a 3-2-1 countdown, then six stages: pop-ups, plates, shoot/don't shoot, the mover, long
  steel, paper. Score = targets (50 a pop-up, 40 a plate, 60/100 steel, 80 the mover, 8 per paper ring, -100 for Phil) + a time
  bonus (6 per second under 45 s) + an accuracy bonus (100 × hit rate). Medals: bronze 350, silver 600, gold 800. Walking off the
  line cancels it.
* **Results card**: score, time, accuracy, the breakdown, medal, and your top five runs with that gun. E / Enter / Space closes it
  (not Esc: that opens the pause menu). Bests live in `SAVE.base.range[gun]` and the best per gun is painted on the board by Range
  Control.
* **Rental rack**: E rents the next gun in the catalogue you don't own (all of them once you own everything); E again swaps.
  The rental goes back, and your own loadout returns, when you leave the range or get in a car.

## The tank (LAWN ORDER)

Parked in the motor pool. Walk up and press E like any car ("Borrow the motor pool's tank"); Staff Sgt. Ruiz sighs. W/S drive
(top speed ~23 mph), A/D turn on the spot (neutral steering, the treads counter-rotate), the turret follows the mouse at ~55°/s,
V is the gunner's sight, left click fires (touch: Fire). It's armoured: car damage never sticks.

The main gun fires a slow practice round (3.5 s reload): a muzzle blast, a dust-and-smoke burst where it lands, a boom, a hull
rock. It knocks range targets, cones (`HT.Props`) and the motor pool's hay bales and fence about, sets off car alarms within 45 m,
and makes civilians step back and comment. It **never hurts anyone**: it refuses to fire with any person (crew, givers,
neighbours, staff, the family, even job enemies) near the line of fire ("Not with people downrange"), and in a job, enemies near
the impact just give up. Parked cars it rolls over are flattened through the car-damage API (`carDamage` to 0, the owner's line,
-1 trust to the car's neighbourhood). Driving it into Maple Heights costs a little trust once per trip and gets lines from the
street; the next time you walk up to your house, a letter from the HOA is waiting. Jobs refuse it ("You can't bring that to the
bake sale."). Left far away and out of sight, the motor pool tows it home.

## The jet (DAD-1)

On the apron by Hangar 2; E climbs in. Controls (taught on screen the first time):

| | |
|---|---|
| W / S | throttle up / down (S at idle brakes on the ground) |
| Shift | afterburner (at full throttle) |
| mouse up/down, ↑ / ↓ | nose up / down (the game's look convention: mouse up = nose up) |
| mouse left/right, A / D, ← / → | roll (A / D steer the nose wheel on the ground) |
| Z / X | rudder |
| G | gear up / down |
| V / C | cockpit view / look back |
| hold E (in the air) | eject |

Flight model: thrust, drag (top speed ~190 mph, ~250 with the afterburner), gravity along the climb, coordinated turns from bank,
a stall below ~74 mph (the nose drops, the tower nags), take-off past ~94 mph with the nose up. A landing needs the gear down, a
sink rate under ~1400 fpm, wings roughly level. Anything else is a comic crash: a puff, a "boing", and the dad ejects; the jet is
back on the apron ("it's a rental"). The parachute drifts you back toward the post (W A S D steer). The HUD shows speed (mph),
altitude (ft), heading, a pitch ladder, throttle, gear, vertical speed, the callsign and STALL / PULL UP / GEAR warnings.

* **Sonic boom**: faster than ~225 mph under ~260 ft over Maple, Route 9 or Riverside: a double boom, a shake, car alarms, the
  neighbours' lines.
* **Buzzing your house**: under ~160 ft within 80 m of home: Linda and the kids come out on the lawn and wave (the family's own
  People models, untouched).
* **Under the bridge**: the Route 9 bridge sits on the water, so nothing flies under it. North of town the river valley now has
  **the High Bridge**, an old rail viaduct 15 m up (built from the backdrop's own terrain heights). Flying under it is an achievement.
* Boundary: past 1.5 km the tower calls you back; past 2.2 km a gentle hand turns you home.
* While flying: the open world draws out to 900 m (`OW.flight`), camera far 3.6 km with fog pushed out, a far-terrain ring of
  fields and hills to the horizon (built on the first flight), and flat roof lids over interiors that are drawn without a roof
  (mission lots' `.` floors), shown only while you fly so ground play and the planning views never see them.

## Easter eggs ("Things your dad found", pause menu)

| Egg | Where | How |
|---|---|---|
| The Gnome | a Maple Heights lawn, a different one each in-game day | E |
| Still Up | the house nearest Elm & Walnut with its Christmas lights up and a deflating snowman | E at the front walk |
| Wrong Number | the pay phone at the Fill-Er-Up rings as you pass | E (always a wrong number) |
| 225 | the smoker behind Barracks B | E (always exactly 225°F) |
| Two Bits | any car | tap H five times ("shave and a haircut"), wait |
| World's Okayest Dad | Walt's car | G checks the glovebox in a borrowed car |
| Proof | a cardboard Bigfoot on the range's backstop berm | hit it |

## Testing

```
node dev/base-check.js [drive,range,tank,jet,eggs|all] [--shots]   # the play-through, real keys and clicks; jpgs + evidence.txt
node dev/base-shots.js [filter]                                      # staged views of the post
```

Numbers and screenshots: `docs/screenshots/base/` (see `evidence.txt`). The bot aims by setting the view as a mouse would; every
press, hold and click is a Playwright event.

## Weaknesses

See the end of `docs/screenshots/base/evidence.txt` and the notes in the worker report.
