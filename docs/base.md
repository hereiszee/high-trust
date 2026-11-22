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
| `js/hiveh.js` | The jet and tank models (procedural, PBR, merged per material); see "Models". |
| `js/openworld.js` | `OW.addSetpiece`, `OW.kit`, `OW.flight({R,blod})` (wider draw radius while flying). |
| `index.html` | Small, commented hooks: `HT.Roam` (the free-roam surface these files use), `baseArmOk`/`baseLine` in `frDraw`/`frUpdate`, `roamPrompt` in `updHub`, `userData.onShot` in `fire()`, `e.fly` (skip ground physics) in `updVan`, `e.noExit` and `e.noJobs` in `updHub`, the base region subtitle, the pin kind, the pause menu's `found` list. |
| `js/hud.js` | A `range` pin icon; the pause menu's "Things your dad found" tab. |
| `js/save.js` | `SAVE.base` defaults (`visited, met, range{gun:[top 5]}, rentals, eggs{}, tank{}, jet{}`); old saves get them through the normal default merge. |

## Getting there and the post

The gate has a raised barrier (it lifts when anybody comes within 24 m) and Cpl. Doyle, who waves you through ("Range is open to
the public on days ending in Y"). Inside: the parade ground with a flagpole (the plain US flag the school flies, waving), two
barracks, a water tower ("FORT SENSIBLE · HYDRATE"), the control tower, the motor pool, Hangar 2 ("THERE IS NO HANGAR 1"), the
apron and runway 27/09 (258 m), and regulation signs along the main road (REGULATION 4: NO RUNNING. UNLESS SOMETHING IS ON FIRE...).
Insignia are a generic shield with a star and oak leaves. Staff come from the neighbour pool (`HT.People.make('neighbour')`, never the crew or the family) in a generic, fictional
utility uniform (`js/staff.js`): their own model with the shirt and trousers recoloured olive on a private copy of its texture (shading
kept, skin left alone) and an olive patrol cap; no insignia, badges or symbols. A street neighbour on the same model keeps his own
clothes. Staff Sgt. Ruiz (motor pool), Sgt. Pruitt and Cpl. Doyle (range), and a controller in the tower cab.
Hangar 2 has an inside: a sealed concrete floor with safety lines and a parking T, a lit corrugated roof underside, the end walls'
inner faces, and a workbench, tool chests, a parts shelf, drums, tyres, a tug and a rolling maintenance stand.

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
* **Rental rack** (inside the range shed, by the office): a wall rack with every gun the player can fire (the catalogue's
  nine: Garage Pistol, The Retirement Plan, Weekend Nailer, Grandpa's Pump, Uncle Ray's Side-by-Side, The Talking-To
  (less-lethal), Rick's Carbine, The Carpool, Deer Season), each the real model on its own peg or shelf under a numbered plate
  with its name and class. Walk up: a frame lights the gun under your crosshair (or the one in front of you) and the prompt names
  it ("E · Take Rick's Carbine · Rifle"). E opens the rack menu on that gun: a card for each one (icon, name, class, ammo,
  magazine); ← → or 1-9 choose (a number takes it at once), E / Enter takes it, 0 gives your own guns back, Esc closes; the
  mouse works too when it isn't locked. Choosing never depends on aim. The HUD shows the rental and its ammo. Free ammo on the
  line, and the rental goes back (your own loadout returns) when you leave the range or get in a car. (The sawed-off in
  js/guns.js is an enemy-only model with no player stats, so it isn't on the rack.)

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

On the apron by Hangar 2; E climbs in. Controls (taught on screen the first time). Every control is a tap or a toggle; nothing has to be held to keep flying:

| | |
|---|---|
| W / S | throttle: each tap steps it 10% (holding ramps it); it stays where you set it. Idle on the ground brakes |
| Shift | afterburner on / off (at 100% throttle) |
| SPACE / Q, mouse up/down, ↑ / ↓ | nose up (climb) / down (dive). Mouse up = nose up, like looking up |
| mouse left/right, A / D, ← / → | roll (A / D steer the nose wheel on the ground) |
| Z / X | rudder |
| G | gear up / down by hand (it is automatic: up above ~150 ft climbing, down on a low slow approach to the runway; G wins for 15 s) |
| V / C | cockpit view / look back (both toggles) |
| E, E (in the air) | eject: the first tap arms it for 3 s, the second ejects |

Flight model: thrust, drag (top speed ~190 mph, ~250 with the afterburner), gravity along the climb, coordinated turns from bank,
a stall below ~74 mph (the nose drops, the tower nags), take-off past ~94 mph with the nose up. A landing needs the gear down, a
sink rate under ~1400 fpm, wings roughly level. With the gear down and the throttle back, the last few metres settle onto the
wheels (an arcade flare, so the jet doesn't float the length of the runway); S at idle brakes hard enough to stop on 258 m. Anything else is a comic crash: a puff, a "boing", and the dad ejects; the jet is
back on the apron ("it's a rental"). The parachute turns and drifts you back toward the post on its own (no keys; see below for far away). The HUD shows speed (mph),
altitude (ft), heading, a pitch ladder, throttle, gear, vertical speed, the callsign and STALL / PULL UP / GEAR warnings.

**For a new pilot** (the owner's playtest: "how do you climb/descend/pick up the landing gear"):

* A controls strip sits bottom right whenever you're in the jet (W / S throttle with the %, SPACE / Q nose, A / D bank, G gear,
  Shift burner, V · C view, E E eject); the gear and burner chips light up with their state, the eject chip when armed.
* Step prompts, upper middle, one at a time, on the first flights (`SAVE.base.jet.tut`): steer onto the runway, tap W, nose up to
  take off, the gear comes up by itself, A / D to bank, and on the approach how to land. Any step comes back if you sit in it for
  6 s without doing it (rolling fast down the runway without rotating, flying around with the gear down).
* Assists: at take-off speed with the throttle up the nose eases up by itself; let go of A / D and the wings level; let go of the
  nose with the wings level and it settles to level flight (or a gentle climb-out right after take-off, gear down).
* After an eject or a crash the feed says where the jet went ("back at Fort Sensible, Hangar 2. It was a rental.") and a marker
  sits on it (map and screen). The parachute drifts you home within 250 m; farther out you land where you are and the screen
  offers "E: ride back to Fort Sensible" (a quick fade to the apron).
* Boarding: the jet collides only with its fuselage (the wings used to be an 8.8 m wall), there's a yellow ladder under the cockpit
  and a "Climb in" marker on it, and "E · Climb into DAD-1" comes up anywhere within 3.5 m of the fuselage, from any side. The
  tank boards from any side within 2.8 m of the hull ("Climb into LAWN ORDER").
* Under the canopy the dad hangs: arms up on the risers, legs loose, a slow sway (no run cycle); a crouched landing step when
  he's down (`HT.Jet.state().pose` is `'chute'`, then `'land'`).
* The crew (index.html's `updAlly` asks `HT.Jet.crew` first): while you fly or hang under the canopy they stay where you left them
  at the base. Down near where they are, they walk over. Down far out, they turn up out of sight (behind you and outside the
  camera's view, on walkable ground, 30-45 m off) and jog up with a line. After "ride back to Fort Sensible" they're at the apron
  with you. In the tank they wait where they are (the game's own rule for any car).
* `node dev/base-check.js pilot`: a player script that only does what the prompts say takes off, lets the gear come up, banks,
  lands (gear down by itself), then ejects over Maple Heights and rides back; with two of the crew along, it checks they never leave the ground, stay put while
  he flies, walk over near the base, appear out of view and jog up far out. Screenshots: `jet-tip-*.jpg`, `jet-strip.jpg`, `jet-board-prompt.jpg`,
  `jet-parachute-pose.jpg`, `jet-crew-jog.jpg`,
  `jet-ride-prompt.jpg`, `jet-ride-back.jpg`.

* **Sonic boom**: faster than ~225 mph under ~260 ft over Maple, Route 9 or Riverside: a double boom, a shake, car alarms, the
  neighbours' lines.
* **Buzzing your house**: under ~200 ft within 90 m of home: Jen and the kids come out on the lawn and wave (the family's own
  People models, untouched; they stream in when you climb into the jet, and if they aren't loaded yet they come out as soon as they are).
* **Under the bridge**: the Route 9 bridge sits on the water, so nothing flies under it. North of town the river valley now has
  **the High Bridge**, an old rail viaduct 15 m up (built from the backdrop's own terrain heights). Flying under it is an achievement.
* Boundary: past 1.5 km the tower calls you back; past 2.2 km a gentle hand turns you home.
* While flying: the open world draws out to 900 m (`OW.flight`), camera far 3.6 km with fog pushed out, a far-terrain ring of
  fields and hills to the horizon (built on the first flight), and flat roof lids over interiors that are drawn without a roof
  (mission lots' `.` floors), shown only while you fly so ground play and the planning views never see them.

### From the air

* Climbing into the jet starts streaming the whole town (`OW.buildAhead(900)`: built, not drawn), so by take-off the ground under
  and ahead of you is real geometry: houses, streets with markings, cars, trees.
* The flight draw radius grows with altitude (420 m under ~150 ft, 620 m under ~425 ft, 900 m above). Past it, the painted ground
  map (`OW.groundMap()`: roads with centre dashes, sidewalks, lots, lawns, water, roofs in each building's colour, tree crowns,
  parked cars) lies just under the streamed ground, so blocks still read.
* The far-terrain ring is built from the backdrop's own grass material and its edge heights (binned once from its vertices),
  so there is no seam or cliff where the backdrop ends, and the first flight no longer freezes (was 1.6 s).
* Wingtip vapour only when you pull, roll hard or light the burner.
* `node dev/air-check.js [tag]`: 100 / 300 / 800 ft over Maple Heights, Riverside and the base, a 60 ft pass down our street and
  a 100 ft look across the whole town; prints draw calls, triangles and frame ms; jpgs and numbers in
  `docs/screenshots/base/air-check/` (`-before` = the previous commit, `-after` = now). Medium, headless (warm frame): Maple 830 /
  706 / 286 calls at 100 / 300 / 800 ft, Riverside 643 / 477 / 116, the base 366 / 270 / 54, the street pass 280; 10-22 ms.

## Models (jet and tank art)

`js/hiveh.js` builds both vehicles in code: no downloaded meshes, textures or files of any kind. Proportions and panel layout
follow public three-view drawings and dimension tables of a modern twin-tail fighter (scaled to the game's 11.4 m trainer, wing
span 8.6 m) and of a modern main battle tank (7.6 m hull, 3.6 m over the skirts), used as reference only; every vertex and every
texture pixel is ours. Names and markings are generic and fictional (DAD-1, LAWN ORDER, FS-02, a shield-and-star badge): no
manufacturer names, designations or real unit insignia.

* Jet: a lofted fuselage (superellipse cross-sections, separate radome), raked boxy intakes with dark mouths, bevelled extruded
  wings / stabilators / canted twin fins with rudders and blue caps, turned nozzles, a tinted reflective canopy with bows over a
  cockpit (seat, displays, stick), pitot and blade antennas, formation-light strips, landing gear with strut, oleo, torque link,
  fork, tyre, hub and doors, the yellow boarding ladder.
* Tank: hull with sloped glacis, fenders, bolted skirt segments, seven rubber-tyred road wheels a side, return rollers, a toothed
  drive sprocket and idler, tracks with thickness and a link-pattern tread (scrolled per side), engine-deck grilles and exhaust
  louvres, lights and tow hooks; an angular bevelled turret with roof plate, bustle rack, the commander's cupola with vision
  blocks and the hatch open, the loader's hatch and MG, smoke dischargers, sights and antennas; a long barrel with thermal-sleeve
  bands, fume extractor and muzzle sensor; and the dad's stowage (jerry cans, cooler, lawn chair).
* Materials are PBR (MeshStandard) with procedural canvas textures: panel lines, rivets, access hatches, streaks, chips, and a
  matching roughness map. Geometry is merged per material, with vertex colours for the tints, so each vehicle is a handful of meshes
  (jet 33 incl. the folding gear legs, tank 14; before: 32 and 13). Collision, seats, camera anchors and the userData the game drives
  are unchanged. `jet.js` / `tank.js` fall back to the old model if this file isn't loaded.
* Before / after from four angles: `docs/screenshots/base/models/{jet,tank}-{front-left,side,rear,top}-{before,after}.jpg`.

## Cost of the rental rack

The nine hung guns are merged once (untextured surfaces into two vertex-coloured materials, each textured or unlit material into one
mesh): 8 draw calls at the rack (was ~342), built the first time you come within 30 m and drawn only within 45 m (0 elsewhere). The
post's other runtime pieces re-cull at once after a jump of more than 20 m (fast travel, a job, a teleport). Auditor's probes
(`dev/audit/perf/budget-probes.js --q=med,low --settle=12 --extra`): every probe within 450 / 120 on Medium and Low.

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

## Leaving: nothing carries over

`HT.Base.reset()` (js/base.js) runs every module's 'reset' hook; index.html `clearChars()` calls it, so it runs on quit to title,
new game, continue, a job starting, going home and the free-roam tow. The jet drops its canopy, flight draw radius, ground map,
fog, crew hold, family, tips, HUD and markers; the tank lets you out (the game's own exit restores the camera), turns the sight off,
clears shells and rebuilds knocked props; the range puts the rental back (your own loadout returns before anything saves), drops a
half-run course and closes its card and rack menu. `HT.Jet.on` (in the jet or under its canopy) and `HT.Tank.on` (in the tank) are
read-only flags for fast travel.

## Testing

```
node dev/base-check.js [drive,range,tank,jet,pilot,eggs|all] [--shots]   # the play-through, real keys and clicks; jpgs + evidence.txt
node dev/base-reset.js                                               # audit C-2: quit / new game / continue / job / tow leave nothing behind
node dev/base-art-check.js                                           # audit W-05/06/07/09: staff uniform, hangar inside, berms, no edge box houses
node dev/base-shots.js [filter]                                      # staged views of the post
```

Numbers and screenshots: `docs/screenshots/base/` (see `evidence.txt`). The bot aims by setting the view as a mouse would; every
press, hold and click is a Playwright event. `node dev/base-air.js` takes the aerial before/after views of the roof lids.

Draw calls (Medium, headless, from `evidence.txt`): base gate driving 489, range 474, tank driving 433, jet climbing out 45,
jet inbound over Maple Heights 195. `dev/openworld-ingame.js` probes stay at or under `origin/main` (worst: riversideMain3rd 432,
scrapyardGate 429, midBridge 435 on Medium; budget 450).

## Weaknesses

* The bot aims by setting the view the way a mouse would (`P.yaw`/`P.pitch`): headless Chromium refuses pointer lock, so raw
  mouse movement is not exercised. Every key press, hold and click is a real Playwright event.
* The flight model is arcade on purpose (turns at ~2.6× real g so a 460 m town is flyable). The base-check autopilot needs long
  straight finals (runway 27 from 700 m out, the river run from 700 m south of town) to be reliable.
* The first flight builds the far-terrain ring (it uses the backdrop's own grass material and is blended from the backdrop's edge
  heights, so there is no seam) and the roof lids; the first frame after new things stream in also compiles shaders (base-check
  times a warm frame). The river set piece stops ~400 m past the map; from very high you can see where it ends.
* `dev/base-air.js` builds every unit at once for its staged views (~1500 draw calls, ~9M triangles); in real flight the
  normal streaming keeps it far lower (45 climbing out, 100-200 over town in base-check).
* Headless numbers are software-rendered; draw-call and triangle counts are the comparable figures, milliseconds are not.
* The family can take a moment to come out on the very first buzz of a session if their models haven't finished streaming.
* The open world's backdrop no longer has its ring of far box houses (audit W-06): past the edge it is wooded hills. Mission
  levels (world.js `W.finish` without `bare`) still build that ring; they were not part of the audit.
* The staff uniform is a recolour of the neighbour models' own clothes: the cut is still a T-shirt or jacket and jeans in olive,
  not a tailored uniform. The tower controller stands in the cab; the cab's glass is a tint, so he reads best from the deck or apron.
* The range berms are heightfield mounds with vertex colour on the existing earth texture; there is no grass growing on them.
* The Route 9 bridge sits on the water, so the "under the bridge" achievement is the new High Bridge north of town.
* `jobs-check mower` and the `openworld-ingame` midBridge probe fail the same way on plain `origin/main` (not caused by the base).
