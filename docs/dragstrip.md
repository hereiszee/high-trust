# Sensible Dragway: the drag strip

An eighth-mile drag strip south of Fort Sensible, open from the first minute of free roam (not during jobs). No giver. It is on the
full map from the start (a chequered-flag pin), signposted on Industrial Way, reachable by road, and fast-travel from the minivan once
you have been there. Two things to do: **try any car in the game** (test & tune, free) and **race for money / bet** (the race office).

| File | What it does |
|---|---|
| `js/worldgen.js` | The grid grew from 128 to **152 rows**. Rows 127-150 west of the river are the strip (`HOODS.strip`, region `'strip'`); `def.strip` holds every spot in metres. Access: Industrial Way east along the old tree line (rows 81-83), then down the grass corridor east of the post's fence (cols 139-141). None of it is in `def.roads`, so the road graph (traffic, AI cars) never comes here. |
| `js/dragsim.js` | `HT.Drag`: the race model (one model for the player's pass, the AI, spectator races and the odds), the cars' straight-line numbers, the racers, the money rules. Pure: Node and browser. |
| `js/dragstrip.js` | `HT.Strip`: the place (set pieces + runtime pieces), test & tune, races, bracket night, bets, the HUD, menus, save, reset. |
| `index.html` | Small hooks: two script tags, the map pin kind, the region banner line, `ftRefusal` (a loaner can't fast travel). |
| `js/hud.js` | The `strip` pin icon (a chequered flag). |
| `js/save.js` | `SAVE.strip` defaults (garage book, history, ladder, daily tallies, stats). |
| `js/platform.js`, `docs/steam/achievements.md` | Three achievements: Eighth-Mile Dad, Top of the Ladder, Perfect Light. |

## Why an eighth mile

The map is 464 m wide and the river cuts it at 284 m; nowhere has 402 m of straight plus run-off. So it is an **eighth mile
(201.17 m)** from a start line at x = 258 m running west, ~50 m of shutdown and a sand trap and catch net. The timeslip shows a
**1/4-mile estimate** (ET × 1.56, speed × 1.27, the usual rule of thumb), always labelled "est.".

## The place

Two 4 m lanes; a concrete launch pad with rubber laid down in the grooves; a burnout box; staging lanes; a working Christmas tree
(pre-stage and stage bulbs, three ambers, green, red, per lane); timing boards (ET, trap speed, reaction time, the win lamp and the
margin per lane) at the finish (facing the start) and on the tower (facing the stands); the timing tower with the race office window;
two small grandstands with a canopy and seated spectators from the neighbour pool (adults only; fenced in on all four sides with the
'z' chain-link tiles and the track wall, so no car and no dad can reach them); the paddock with the six street loaners lined up under a
canopy (the mower is lent from the picker; its 29-part model would cost more draw calls than the other six together), the test & tune board, tyre stacks, a fuel cage; light poles that glow at night with pools of light on the track; distance
boards (60 ft, 330 ft, trap, 1/8); a road sign on Industrial Way.

Static parts are three open-world set pieces (`strip_e`, `strip_w`, `strip_sign`, merged per material through the base kit's painter,
culled per unit). Runtime parts (tree bulbs: one mesh; boards: one mesh, one canvas; light pools: one mesh; the loaner row; the people)
are built when the camera comes within 190 m and dropped (geometry, people, colliders) beyond 320 m. See "Draw calls" below.

## Test & tune

Walk up to the paddock board (`use`) → the car picker: all seven cars the strip lends (HT.Garage's six and the mower), each with its
power, weight, drivetrain, gears and top speed and your best slip in it. Pick one → a loaner rolls into the beams. The pass:

* Hold **brake** (Jump/handbrake, or Move back; pad A or LT) and **throttle** (Move forward; pad RT, analog) to rev against the brake.
  The HUD tach shows the car's **launch window** (green band). Let go of the brake **on the green**.
* Too few revs: it bogs. Too many: the tyres light up. Holding full throttle on a car with more torque than grip (the pickup, the
  sedan) builds wheelspin; easing off lets it hook up again (pad RT is analog; on a keyboard, tap it).
* Leaving before the green is a **red light** (negative reaction time).
* After the finish the car lifts and brakes itself to a stop before the sand. Then the timeslip: reaction time, 60 ft, 330 ft, 1/8 ET and
  speed, the 1/4-mile estimate, the launch (clean / a little spin / wheelspin / bogged), the delta to your best in that car, and the
  **garage book** (your best slip in every car, quickest first). Run it again, change car, or done (the loaner goes back).
* Loaners stay at the strip: drive one past the strip's edge and it is handed back; get out and it goes back; it can't fast travel.

### Making the cars feel different

The game's handling rows (`CAR_FEEL`, `HT.Garage.VEH`) are linear acceleration to a cap: every car feels much the same in a straight
line. **They are untouched** (no job changes). The strip has its own straight-line numbers in `HT.Drag.SPEC`: mass, power, drivetrain,
tyre grip, first-gear pull (torque), gear speeds and shift time, drag area and the launch window. The model per 1/240 s: force =
min(torque, power / speed) per gear; traction = grip × weight on the driven wheels (FWD loses weight off the front, RWD gains on the
rear, AWD uses all four); asking for more than traction builds wheelspin, spinning tyres give 50-100% of their grip; automatic shifts
with a short power cut; aero drag and rolling resistance. Upgrades on your own car (engine: power and gearing; tyres: grip) count.

Typical clean passes (the bot, dev/test-dragsim.js): sedan ~9.4 s @ 77 mph; SUV ~9.7 @ 72 (AWD, forgiving); pickup ~9.8 @ 78
(the most torque, the lightest rear: spins if floored, ~11.2 s); minivan ~10.6 @ 71; hatchback ~10.7 @ 67; work van ~11.0 @ 63;
the mower ~22.5 s @ 21 mph. A minivan with every engine and tyre upgrade runs about a second quicker.

**Simplest version, said plainly:** the car is held in its lane during a pass (no steering on the strip; a wiggle when it spins); the
gearbox is an automatic for everyone; no clutch; weight transfer is a fixed lean per drivetrain.

## Racing for money (the race office, in the tower's west window)

* **The ladder** (heads-up, one pass each, first to the stripe; a red light loses; both red: the first one loses): Dutch Hendricks
  (work van) → Marisol Vega (hatchback) → Walt Okafor (minivan "Brenda") → Tomás Reyes (pickup, out of town) → Priya Raman (SUV) →
  June Abernathy (sedan, a grandmother of six) → "Rook" Delacroix (sedan, out of town). Each has a fixed profile: reaction-time mean
  and spread, launch quality, chance of a red light, chance of a missed shift. You race the next unbeaten one or anyone you have beaten.
* **Turf class:** Gus Lindqvist and his mower. Mowers only (the strip lends one free).
* **Bracket night** every third in-game day: three rounds against ladder racers near your level, **dial-ins** (yours: your best in
  that car + .05, or the tower's guess with no book time; theirs: their typical run + .04), the quicker dial waits the difference
  (each lane gets its own green), running quicker than your dial is a **breakout** and loses.
* Your own car (if it's a street car and it's at the strip: upgrades count) or a rental.
* **Class rules:** street class = the six garage cars; the mower races Gus only; the tank, the jet, the bike, the tow rig and Dave's
  brisket truck are turned away at the line with a line from the starter.
* Close finishes: the board shows the margin (seconds; the slip also shows metres).

## Betting

* **On yourself**, before a race: the tower prices you from your own last 12 passes (reaction times, red lights, launch quality; a new
  driver is priced as a novice until three passes) against the racer, by 240 simulated races of the same model.
* **On other races**, at the office: two regulars within two rungs of each other. Two races in three are **spec races** (both in the
  same loaner, so the drivers decide it: odds around 25-35% / 65-75%, payouts ~1.3× / ~3×); the third is in their own cars, which is
  often lopsided (a car gap is worth more than a driver gap) and priced that way (down to 1.05× / up to 12×). Both lanes priced by 500 simulated races; back one, pick a stake, watch it from the
  tower camera (any `use`/Enter/Esc or pad A/B skips to the result, which is then simulated to the end by the same model).
* Payout multiplier = (1 − 8% house edge) / p, kept to 1.05×-12×. The result is a fresh run of the model after the bet (nothing is
  rigged). dev/test-dragsim.js and dev/dragstrip-check.js run 2,000 races per matchup against the stated p (within 3.5 points).

## Money: the numbers

Jobs pay $400-1,400 base plus bonuses. The strip is a side line that can't replace them:

| | |
|---|---|
| Test & tune | free, any car |
| Heads-up entry | $25 (refunded with the purse on a win) |
| Purse | $30 + $10 × tier (Dutch $40 … Rook $100); repeat wins over the same racer the same day pay × 0.55 each time (never under 20%) |
| First win over each racer | one-off bonus, not capped: $50, 75, 100, 150, 200, 250, 300 (ladder total $1,125) + $50 for Gus |
| Rental (money races) | $20; the mower is free |
| Turf class | $10 entry, $20 purse |
| Bracket night | every 3rd in-game day, $60 entry, $300 winner, $90 runner-up |
| **Daily cap on strip winnings** | **$400 per in-game day** (purses and bracket prizes; first-win bonuses are outside it) |
| Bets | $10-100 a bet; at most **+$300 won and −$200 lost per in-game day**; a bet never takes cash below **$150**; you can't stake what you don't have (no tab, no borrowing) |
| House edge | 8% |

In-game days only move when you finish story jobs, so the caps can't be farmed by waiting. Everything is settled when a race is over;
quitting, a job start, fast travel or a reset mid-race changes no money and no ladder state.

## Fit with the game

* The pin is on the map from the start; the first time free roam has been running ~25 s, a crew member barks about it and the feed
  says where it is. The first visit opens fast travel and gives a marker to the paddock board until your first pass. While you're
  there, the objective panel lists test & tune, the race office and today's tallies.
* Prompts and the teach lines come from the action layer (`HT.Keys.label`) or the pad's buttons (`HT.Pad.btn`); menus run on
  arrows/1-9/`use`/Enter/Esc, the mouse, and the pad through `HT.Pad.modal` (D-pad, A, B).
* No gun comes out on the property (`HT.Base.line` answers like Maple's rule; a gun already drawn is holstered when you walk on).
* Reset (`HT.Base.on('reset')`: quit to title, job start, home, the tow, death) and any teleport: the loaner, the opponent's car, the
  HUD, the menus and a watched race go away; nothing is saved from a half-run race.
* Saves (`SAVE.strip`): the garage book, the last 20 passes (for the odds), the ladder (beaten, wins), the per-day tallies, stats.

## Draw calls

Counted per draw in the renderer (`renderBufferDirect`, our objects only: the `strip_*` units and the `dragstrip` group), main pass +
shadows, by dev/dragstrip-check.js `perf` (Medium):

| Where | Ours | Whole frame |
|---|---|---|
| Paddock, looking down the track | 37 | 266 |
| Start line | 38 | 253 |
| Stands | 30 | 120 |
| Finish line | 27 | 242 |
| The Industrial Way sign | 16 | 312 |
| Fort Sensible range / gate (the strip is in view across the fence) | 24 / 15 | 412 / 304 |
| Maple Heights, Riverside | 0 | 319 / 483 |

How: the base kit's materials folded to seven (vertex colours carry the look); only the near unit's paint and concrete cast shadows;
the six parked loaners merged to 7 calls (body + wheels per car, one mesh for all the contact shadows) and only drawn from the paddock
and not during a pass; spectators don't cast shadows; the tree, both boards and the night light pools are one mesh each. Runtime
pieces are built within 60 m of the strip and dropped (geometry, people, colliders) beyond 200 m. A race adds the opponent's car
(LOD1, 3) while the loaner row (7) is hidden.

## Tests

```
node dev/test-dragsim.js                      # (also in dev/run-tests.js) the model, order of the cars, wheelspin, red light, bracket, odds vs 2,000 races, money, caps, classes, achievements
node dev/dragstrip-check.js [travel,tune,red,race,bets,caps,quit,pad,perf] [--shots]
```

## Weaknesses (honest)

* An eighth mile, not a quarter: the map has no room. The quarter-mile numbers are an estimate.
* Lane-locked passes: no steering skill on the strip. The car can't hit the wall.
* Racers appear as names, lines and their cars; they aren't standing around in person (the spectators and Dolores at the window are).
* The spectators sit; they stand up while a race is on; no cheering animation of their own.
* The odds for a bet on yourself come from your history; if you drive very differently from your history, the price is off (for or
  against you).
* Keyboard throttle is on/off; feathering a spin means tapping. The pad's RT is analog.
* The strip asphalt between the walls is the world's lot asphalt; the start area's concrete pad and rubber are drawn over it.
