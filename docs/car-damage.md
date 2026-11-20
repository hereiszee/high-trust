# Car damage

Every car has one health value. The HUD bar, the dents, the handling, the hood smoke, the sounds, Dad's Auto and the chase code all read it. Code lives in `index.html` (MINIVAN section, block "car health"), `js/save.js` (Dad's Auto repairs, tows), `js/vehicles.js` (lamps, hazards), `js/fx.js` (`hood` and `drag` emitters), `js/audio.js` (vehicle controller: `misfire`, `rattle`, `chime`, `tick`, `thump`, `stall`, `set({damage})`) and `js/hud.js` (band colours, warning line).

## Where the value lives

| Car | Health | Max |
|---|---|---|
| Your own vehicle (`VAN`) | `SAVE.garage.hp[active]`, plus `SAVE.garage.wear[active] = {lamps:[4], tyre}` | `HT.Garage.apply(type, vehicle).hp` (reinforced panels add 40 / 90) |
| A neighbour's car (`L.cars`) | `e.hp`, `e.wear` (session only) | `HT.Garage.apply(type).hp` |
| A bare `HT.CarAI` car (chase targets) | `car.hp` | `car.stats.hp` |

While you drive a car, `e.car.hp` (the `HT.CarAI` body) is an accessor onto the same value, so `e.car.hp -= x`, `HT.CarAI.impact` and `HT.CarAI.ram` land in `carDamage`.

## API (globals in `index.html`, also on `window.__ht`)

- `carHp(e)`, `carHpMax(e)`, `carFrac(e)`, `carBand(e)` (0 to 5), `carWear(e)`
- `carDamage(e, hp, cause)`: returns HP lost. Crossing into a worse band while you drive plays the crew quip, the chime and the warning; reaching 0 breaks the car down.
- `carRepair(e, 'full' | hp, opts)`: a full repair gives a fresh body and fixes every lamp and the tyre.
- `CAR_HOOKS.damage.push(fn)`: `fn(e, hpLost, cause)` runs on every hit (causes: `crash`, `parked`, `bullet`, `ai` for writes to `e.car.hp`).
- `onBreakdown(fn)`: `fn(e, cause)` runs when any car reaches 0. Returns an unsubscribe function. Chase missions use this instead of polling.
- `towCar(e)`: your van goes to Dad's Auto (fee $75, or on Sal's tab, patched to 60%). A neighbour's car goes home on a flatbed ($120 and up to −3 trust).
- `__ht.crash(e, speed, {angle, rear})` runs a wall impact through the real crash path. `__ht.repairCar(e, amount)`.

## Impacts

`carImpact`: no damage below `CRASH_MIN` = 6.5 m/s (about 15 mph), so taps and kerb bumps are free. Above it:

`hp = 0.13 × (speed − 6.5)² × mass × (0.35 + 0.65 × how square-on) × bull bar (front ×0.5) × panels (×0.85 / ×0.7)`, capped at 45% of max per hit.

For a stock sedan hitting a wall head-on: 22 mph costs 1 HP, 34 mph costs 8, 45 mph costs 21, 56 mph costs 40, and 67 mph hits the 45 cap. A side scrape at 45 mph costs 7.

Lamps break on hard nose or tail hits (above 10 m/s, 60% chance, on the side that hit). A hard angled hit (above 13 m/s) can flatten a tyre, 30% chance: the car pulls to that side and thumps. A parked car on the other end takes 85% of the impact, gets dented, and its owner notices: −1 trust, once per owner, −3 per session at most. Bullets aimed at the driving dad split: the car takes 60% (×panels), the dad 55%. Shooting a parked car dents it.

## Bands (fraction of max HP)

| Band | Range | Effect |
|---|---|---|
| 0 fine | ≥ 70% | none |
| 1 dented | < 70% | dents and rattles only |
| 2 pulling | < 50% | pulls to one side, top speed −10%, a wisp of steam |
| 3 smoking | < 30% | acceleration ×0.7, top speed −25%, brakes ×0.75, rough engine and misfires, grey smoke, chime, HUD "Check engine. Also check everything." |
| 4 limp | < 12% | 25 mph max, acceleration ×0.5, heavy smoke, sputtering, sparks from a dragging bumper |
| 5 broken down | 0 | no throttle; it coasts to a stop. Hazards blink, the hood steams, and you are told to get out. No explosion. |

Measured on a sedan (`node dev/car-damage/handling.js`): top speed 67 → 67 → 60 → 50 → 25 mph across bands 0 to 4. Braking from 20 m/s takes 7.2 m at full health and 10 m in band 3. The pull with the wheel centred is 0 / 0 / ~12 / ~21 / ~29 degrees per 4 s.

## Dad's Auto

`openShop('auto')` hands the car you are driving to `HT.Economy.setRepairCar` and opens on the Repair tab if it is hurt. The tab lists what is wrong (body work, engine and radiator, lights, tyre) with prices: $2 per HP, $30 per lamp, $45 per tyre. The family discount applies. If you are short, "Patch what you can afford" spends what you have, fixing the engine first. Paying for a borrowed car's repair cancels the trust loss and earns a thank-you (+1) when you return it.

## Jobs and chases

- When a job starts, the crew gives the van a once-over up to `JOB_PATCH` (85%), because the jobs are balanced for a healthy van.
- During a chase, an escort or an ambush (`carChasing()`), bands 3 and 4 use a milder chase band: top speed ×0.75, acceleration and brakes ×0.85, no limp mode. Wall crashes do half damage to the car you drive. Rams and gunfire count in full, and 0 still ends the chase (the world-mission code calls `wmVanDown`).
- Ambient traffic cars are not in `L.cars`. Hitting one damages your car but not theirs, and costs no trust.

## Consequences

- **Borrowing.** `settleBorrow` scales with the damage left on the car compared with when you took it: 10% costs −1, 30% costs −2, 60% costs −3. Leaving it far from home costs −2. A broken-down car is towed home. Each owner counts once, with a cap of −6 per session. Trust goes to the neighbourhood where the car lives (`carHood`: Maple Heights or Riverside).
- **Home.** After a job, Tyler patches the van back to 60% the next time you go home (once per job run) and fits the spare tyre.
- **Tows.** A tow is always affordable: whatever cash can't cover goes on Sal's tab (`SAVE.garage.tab`), and the next payout pays it off.
