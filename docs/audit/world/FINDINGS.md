# World audit: free roam, vehicles, traffic, people, presentation

Branch `audit/world`. Auditor only: no game code changed. Probes are in `dev/audit/world/` (each writes `<name>.out.txt` next to
itself); screenshots are in `docs/audit/world/`. Headless Chromium + SwiftShader at 1280×720 on Medium, one browser at a time, real
Playwright key/mouse events wherever the input matters (M/Tab/Enter on the map, E, H, G, W/A/S/D, Space). Frame rate on this machine is
never reported.

Run any probe with `node dev/audit/world/<name>.e2e.js` from the repo root.

## Summary

| ID | Sev | Title | Confidence |
|---|---|---|---|
| W-01 | MAJOR | Map fast travel on foot both refuses ("Get back to the minivan") and teleports you, stranding the van | CONFIRMED |
| W-02 | MAJOR | Map fast travel moves the borrowed tank into Maple Heights (any borrowed vehicle goes too) | CONFIRMED |
| W-03 | MAJOR | Traffic drives straight through people standing in the road (neighbours; crew; kids) | CONFIRMED (neighbour) |
| W-04 | MINOR | "Saved you 8 seconds…" after every fast travel, whatever the distance | CONFIRMED |
| W-05 | MINOR | Hangar 2: open doors show a black void with sky visible through the inside of the roof | LIKELY |
| W-06 | MINOR | Backdrop houses at the map edge are plain boxes with black squares for windows, 20–40 m from where you can stand | CONFIRMED |
| W-07 | MINOR | Staff Sgt. Ruiz (motor pool) has no patrol cap: a civilian neighbour model in a T-shirt, same as street neighbours | CONFIRMED |
| W-08 | MINOR | Third-person camera has no occlusion handling: a lamp post or a tree trunk can hide the dad completely | LIKELY |
| W-09 | MINOR | Range side berm renders as a flat tan wedge with hard facets | CONFIRMED (screenshot) |
| W-10 | MINOR | Mixed UK/US spelling in player text (neighbour/neighbor 39/37, tyre/tire, colour/color) in an American setting | CONFIRMED |
| W-11 | MINOR | The dad's wife is "Jen" at home but "Linda" in the jet lines (and the buzz subtitle is captioned Linda) | CONFIRMED |

_Details, coverage and gaps below. (Draft: sections still being filled in as probes finish.)_

## Findings

### W-01 · MAJOR · Map fast travel on foot both refuses and teleports, stranding the minivan
- **Repro** (`node dev/audit/world/fasttravel.e2e.js`, part A; fresh save): walk (or be put) 60 m from the minivan, press **M**,
  **Tab** to "Dad's Auto", **Enter**.
- **Expected:** one outcome. Either the game's rule from `owFastTravel` ("Get back to the minivan to fast travel", fast travel is from
  the van) or a trip that brings the van along.
- **Actual:** both. The feed shows "Get back to the minivan to fast travel" **and** "Fast travel · Dad's Auto", and the dad (with
  his crew) is moved 128 m to Dad's Auto while the minivan stays at home: `{"dad":{"x":221,"z":55},"van":{"x":39,"z":15}}`.
  Reproduced on two runs (`dev/audit/world/fasttravel.out.txt`).
- **Cause:** the map's fast-travel button fires two independent handlers: `emit('fastTravel',s)` *and* `MAP.onTravel(s)`
  (`js/hud.js:668`). `index.html:1471` routes the first to `owFastTravel` (refuses on foot, `index.html:1465`), and
  `HUD.minimap.onFastTravel` (`index.html:2049-2052`) teleports the dad or the current vehicle straight to the pin regardless.
  In a vehicle both run, 360 ms apart, and move the car twice.
- **Impact:** the "fast travel from the minivan" rule never holds; the player ends up somewhere without their van and the HUD
  contradicts itself. No softlock (the same bug lets them map-travel back on foot).

### W-02 · MAJOR · Map fast travel takes the borrowed tank (or any borrowed car) anywhere, including Maple Heights
- **Repro:** same script, part C: borrow LAWN ORDER at the motor pool (E), **M**, Tab to "Home", Enter.
- **Expected:** fast travel is offered "from the minivan" (the base's own feed line says so); the tank stays on the post or is refused.
- **Actual:** the tank is placed on the home street: `{"from":{"x":216,"z":199},"to":{"x":40.5,"z":12.8}}`. Same path as W-01
  (`index.html:2050`: `if(VAN.on){const e=CV;e.pos.set(pin.x,0,pin.z)...}` moves whatever is driven). The jet on the ground was
  not moved. Two runs.
- **Impact:** the tank turns up on Maple's narrow streets in one keypress (the HOA/trust gag still fires); it also bypasses
  "Jobs refuse it" positioning for site pins once a job is done.

### W-03 · MAJOR · Traffic drives through people standing in the road
- **Repro:** `node dev/audit/world/traffic-peds.e2e.js`: a traffic car (OW.trafficAdd, as dev/traffic-check.js uses) approaches a
  person standing in its lane on a straight Maple road at 9 and 13 m/s; the player is on foot on the far kerb.
- **Expected:** traffic stops short of anyone on the road, as it does for the player on foot (`k:'foot'`).
- **Actual:** with a neighbour in the lane the car never slows and its box passes through them in 4/4 runs (`minD 0`, `through:true`).
  Crew and kid runs: see the rerun results below.
- **Cause:** the traffic obstacle list (`js/openworld.js` ~1310-1318) contains only the player (`player`/`foot`), other cars,
  parked cars and props. Allies, givers, neighbours and kids are not obstacles for traffic. Nothing hurts them (no hit path), so
  this is visual, but it is a car at speed driving through a person, and the crew follow the dad across roads all the time.
  The player's own car also passes through kids by design (`dev/kids-safe.e2e.js` asserts "nothing happens").

### W-04 · MINOR · "Saved you 8 seconds and one argument about directions." for every trip
- **Repro:** fasttravel probe part B: in the minivan at Dad's Auto, map to Home (187 m). Also part C (tank, ~250 m).
- **Actual:** always "Saved you 8 seconds". `index.html:1470` computes the distance *after* `go()` has already moved the dad to the
  destination, so it is ~0 and `Math.max(8,…)` wins.

### W-05 · MINOR · Hangar 2: black void behind the open doors, sky visible through the inside of the roof
- **Repro:** `node dev/audit/world/tour.e2e.js jet` (stand on the apron east of the jet, look west). `docs/audit/world/tour-jet.jpg`.
- **Actual:** the hangar's open doorway is a flat black void, and above it clouds and tree tops show through where the inside of the
  roof should be (inner faces missing / back-face culled). The jet (the star prop) is parked right in front of it.

### W-06 · MINOR · Backdrop houses at the map edge are bare boxes with black squares for windows
- **Repro:** `node dev/audit/world/tour.e2e.js map-edge` (stand at x≈4 or x≈460). `tour-map-edge-west.jpg`, `tour-map-edge-east.jpg`.
- **Actual:** the ring of far houses (js/world.js backdrop, just past the map edge) is 20-40 m from where the player can stand: flat
  beige boxes, no doors, black square windows, no yards or streets. The rest of the town is detailed, so the contrast is sharp.
  (docs/base.md already notes they look odd from the air; they look odd from the ground too.)

### W-07 · MINOR · Staff Sgt. Ruiz is a civilian neighbour model: no patrol cap, black T-shirt
- **Repro:** walk to the motor pool (`tour-tank.jpg`, right of frame).
- **Expected:** docs/base.md: "Staff come from the neighbour pool with a patrol cap added".
- **Actual:** Ruiz is `PP.make('neighbour',{variant:'nb_kenji'})` with no cap (`js/tank.js:124`); only the range staff go through
  `cap()` (`js/range.js:114-118`). He is the same model as street neighbours and Mr. Ferreira in the finale, so the "Staff Sgt." reads as a
  passer-by.

### W-08 · MINOR · The third-person camera has no occlusion handling
- **Repro:** `tour-home-front.jpg` (a lamp post between camera and dad hides him) and `tour-map-edge-west.jpg` (a tree trunk hides him).
- **Actual:** no fade or pull-in for thin occluders; the dad can disappear completely behind a lamp post or trunk while standing still.
  LIKELY (seen in 2 of 18 framed stops; placement was scripted, but the poses are ordinary ones a player stands in).

### W-09 · MINOR · Range side berm is a flat tan wedge
- **Repro:** `tour-range.jpg` (from the firing line, right side). The berm is a large single-colour prism with hard facets and a
  hard intersection with the ground; it reads as unfinished next to the detailed lanes, benches and targets.

### W-10 · MINOR · Mixed UK/US spelling in player-visible text
- Static scan of string literals in index.html, js/, js/jobs/ (script in the report's coverage notes). "neighbour" 39 / "neighbor" 37,
  "tyre" (HUD "Flat tyre", "patched up") vs "tire" (Pawn intro, glovebox), "colour" 5 / "color" 33, "centre" vs "center",
  "metre" vs "meters", "cheque", "licence"/"license", "apologised"/"apologized". The game is set in an American suburb and its own
  HUD says "NEIGHBORHOOD TRUST" while feed lines say "neighbourhood".

### W-11 · MINOR · The wife's name: Jen at home, Linda in the jet
- `js/home.js:1157` and `js/save.js:154`: the spouse is **Jen** (home subtitles: "JEN You're home!..."). `js/jet.js:215`: buzzing the
  house captions the wife's "Is that your father? Wave, kids!" as **Linda**, and tower lines say "Linda says call when you land",
  "I'll tell Linda", "Linda checked" (`js/jet.js:23,26,35`). Linda is also a neighbour name (`index.html:1497`, car owners, tank/jet
  street lines), so a player sees "Linda" both as a stranger whose car they borrow and as their wife.

## Covered and found clean

| Area | How | Result |
|---|---|---|
| Route 9 bridge before it opens | `traverse.e2e.js bridge`, `sneak.e2e.js` (real W, view turned per waypoint) | Walking into the sawhorses stops at them; the minivan is stopped at x≈280 on every lane and along both parapets. **The sneak still works on foot**: round the north or south end tree (x 281) and between the parapet rail and the sawhorses (3 of 8 lines reach x 296). The straight lines along each parapet are blocked by those trees, so the sneak needs a small dog-leg. |
| Bridge after it opens (Rick's job done, enter the hub) | `traverse.e2e.js bridge` | Barricade group hidden, 0 live barricade colliders, 0 raycast proxies, the van drives across to Riverside (x 358), a ray along the deck is not stopped at the old line. `tour-bridge-open.jpg`. |
| Map edges | `traverse.e2e.js edges`: 24 points round the world, on foot and in the van, W held 5 s straight out | 48/48 stayed inside the map, upright, on the ground. |
| River | `traverse.e2e.js water`: 6 bank points, both banks, on foot and in the van | Nobody gets into the water (bank collider at x 284 / 304). |
| Getting out next to a wall | `traverse.e2e.js exit`: van parallel to a house wall 0.25 m off, wall on the driver's side and on the passenger's side, 3 walls | Always out on the free side (or behind), never inside a collider, walks away 2.9 m. |
| Easter eggs | `eggs.e2e.js` (E, H×5, G) + `dev/base-check.js eggs` (mug, Bigfoot) | Gnome, Still Up, Wrong Number, 225, Two Bits each announce exactly once however often used (5×1 banners), all saved to `ht-save` immediately; mug and Bigfoot found by base-check. base-check's own honk step failed once (its E did not put the dad in the van); the honk itself works with real H taps (`eggs.out.txt`). |
| Characters under a bad network | `people-wide.e2e.js` (first 6 people-model requests aborted, then 40% random failures, 2 s latency) | No box figure at any sample, every character real within 30 s: home (family), Fort Sensible (Doyle, Pruitt, Ruiz), Maple givers with all jobs unlocked (Dad's Auto/Sal), a traffic wreck. Plus `dev/people-load.e2e.js` (hub crew, Riverside, roundup, hub after job): pass. |
| Kids and family | `dev/kids-safe.e2e.js` (baseline): pass. Tank main gun: refuses with any person (including `People.live` kids/family) near the line of fire (`js/tank.js:150-153`); tank shells, crushes and props have no damage path to people; the jet belly-lands instead of a fireball within 25 m of a protected character (`js/jet.js:201`). | No hit/die reaction on any protected character found. See W-03 for the visual side (vehicles pass through people). |
| Traffic vs the player's car | `dev/traffic-check.js --quick` (baseline) | Pass: stops short, horn ladder, push, queue, junctions, tank never pushed. |
| Night | `tour-night-street.jpg` | Lamps, windows, moon; no light leaks seen on the home street. |
| Placeholder/dev strings | static scan of every string literal in index.html, js/, js/jobs/ for TODO/FIXME/lorem/placeholder/debug/TBD | Only the intentional fridge note "TODO: GUTTERS!!" (`js/home.js:563`). |
| Place and character names | static scan | "Fill-Er-Up", "Dad's Auto", "Maple Heights", "Linden Park", "Fort Sensible", "LAWN ORDER", "DAD-1", "Sgt. Pruitt", "Cpl. Doyle", "Staff Sgt. Ruiz" are spelled one way everywhere ("Route9" only in a function name). See W-11 for the wife. |
