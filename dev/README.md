# dev/: world, roads and car AI (SPEC2 modules)

Plain scripts with no build step. Each one attaches to `window.HT` in the browser and to `module.exports` in Node.

| file | global | what |
|---|---|---|
| `js/worldgen.js` | `HT.World` | the 232×80 world def (SPEC2 A): map, regions, places, sites, doors, chunk lists, trust-tier dressing |
| `js/roadgraph.js` | `HT.Roads` | road graph, shortest path, right-lane polylines, nearest road, stop points, tile GPS |
| `js/carai.js` | `HT.Garage`, `HT.CarAI` | vehicle stats + upgrades + buy rules, van physics/damage, AI controllers (follow, flee, wander), ramming/PIT, chase sim |

```
node dev/run-tests.js     # all unit tests (Node only, no dependencies)
node dev/shoot.js         # screenshots of dev/world.html -> docs/screenshots/world/ (pre-installed Playwright)
open dev/world.html       # 2D visualiser: regions, sites, graph, chunks, trust tiers, simulated chases
```

## API

```js
const def = HT.World.build({save, bridgeOpen, missions});   // save: SAVE (bridge opens after prog.done[1] or world.bridgeOpen); missions: live MISSIONS to override embedded maps
def.map / def.ground            // 80 strings of 232 chars (buildLevel legend + SPEC2 chars) / ground colour char per tile (, . g s b = ~)
def.sites[id]                   // {x0,z0,x1,z1 tiles, box metres, win (leash window, tiles), park, huddle, ring{x,z,r}, spawns[{boss}], items, bonus, stashes, ammo, waveSpawns, grill, bounce, getaway, beds, wall, place, hood, after}
def.places / def.doors / def.markers / def.start / def.vanStart / def.parked / def.barricade
def.chunks[i]                   // 24 chunks (8x3 of 32x32 tiles): {box, trees, lamps, houses, rowUnits, walls, warehouses, chainlink, hedges, rails, crates, tables, pumps, parked, buildings, water, tags, chalk, trash, porches, barricade, beds}
HT.World.regionAt(x,z)          // metres -> 'maple'|'route9'|'river'
HT.World.chunkAt(x,z), chunkIndex(tx,tz), chunksNear(x,z,r)
HT.World.dressing(def, trustR, scrubbedIds) // {tier,line,flags,tags,lampsLit,lampsBroken,trash,chalk,boarded,neighbourAnchors,garden}
HT.World.neighbourSlots(def, trustR, x, z, 10, 50)
HT.World.openBridge(def)        // then rebuild the road graph

const G = HT.Roads.build(def);  // G.nodes[{id,tx,tz,x,z,e[{to,len,dir,road}]}], G.edges
G.path(a,b), G.route(fromXZ,toXZ) -> {nodes,len,points}, G.lane(ids), G.nearestNode(x,z), G.nearestRoad(x,z), G.stopPoints(id), G.components()
HT.Roads.gps(def, fromXZ, toXZ) -> {tiles, points, cost} | null

HT.Garage.apply(type, SAVE.garage.vehicles[type], SAVE.garage.util) // {maxSpeed,boostMax,accel,boostAccel,brake,hbrake,coast,revMax,revAccel,steerResp,turn,turnFade,grip,absGrip,hp,bulletMul,bullBar,ramMult,ramDealtFront,impactTakenFront,sport*,ammoBonus,slots,firstAid,len,wid,mass,seats}
HT.Garage.req(id, {owned,trust,trustR,done}), buy(SAVE.garage, id, {cash,trust,trustR,done}), vehicleOpts(SAVE.garage), hornNotes(id), defaultGarage()
const car = HT.CarAI.make(type, {x,z,yaw,vehicle,util});
HT.CarAI.drive(car, {thr,st,boost,hb,sport}, dt, collide)   // player van model, returns {front,speed} on a wall hit
HT.CarAI.follow(car, points, {speed,waitDist}) | flee(car, G, {max,seed}) | wander(car, G)
HT.CarAI.step(car, dt, {van, G, collide, blocked, canSnap})
HT.CarAI.ram(van, car), crewFire(van, car, n, dt, los), impact(van, speed, front, inMission), bullet(van, dmg), state(van), repairCost(van)
HT.CarAI.simulateChase({seed, carType, max, vehicle, crew, gap, trace})
```

## Differences from SPEC2 (all deliberate)
- **Bridge** opens after Rick's job (`prog.done[1]`), per the owner's decision. SPEC2 said after the Kingpin.
- **Old giver markers** `1`–`4` are kept in the world grid at their HUB tiles, so `buildLevel` still finds them.
- **Riverside parked cars** moved to kerb rows off the escort route: (165,8), (213,36), (183,50). SPEC2 had them mid-street.
- **Road graph** is 60 nodes / 81 edges, not 64/85: dead-end stubs under 4 tiles are pruned (riverbank and lot-fence ends).
- **Rubber band** retuned to d>80 ×0.65, d>50 ×0.8, d<20 ×1.05 so a stock van usually catches the Duke.
- **AI cars** don't steer around parked cars. Keep parked cars off AI routes, or pass `ctx.blocked`.

## Game AI in the real game (`js/ai.js`, see `docs/AI.md`)

- `node dev/ai.test.js` — module tests and node mission sims (`--quick`, `--write`).
- `node dev/ai-ingame.js [--missions 0,1,2,3] [--no-shots]` — loads `index.html` in headless Chromium (SwiftShader), plays every mission with a scripted dad through `window.__ht.step()`, and checks cover against the dad's real camera and shoulder rays, crouch hitbox heights, fire tokens, flankers, boss phases, waves, crew vs camera, stacking, and the surrender/zip-tie/trust rules. It writes `docs/screenshots/ai-ingame/evidence.txt`, `evidence.json` and jpg screenshots.
- `node dev/ai-ingame-fair.js [--seeds 6] [--write]` — win rate and health per mission for a steady and a casual scripted player.
- `dev/ai-ingame-lib.js` serves the repo to the browser through Playwright request routing (no server process) and pauses the page's own loop once assets are loaded; `dev/ai-ingame-bot.js` and `dev/ai-ingame-probe.js` are injected into the page.

## Open world in the game (`js/openworld.js`, SPEC2 W1/W2)

`HT.OpenWorld` renders the `HT.WorldGen.build()` def as the hub (`HUB=WORLD` in index.html; the old street grid `HUB_SMALL` is the fallback when a module is missing).
`js/worldgen.js` is exposed as `HT.WorldGen` because `js/world.js` (the dressing module) also claims `HT.World`.

- **Units**: 24 chunks (32x32 tiles) built lazily near the camera, plus mission sites and set pieces (river, bridge + barricade, Fill-Er-Up, church, court, Route 9 signs/frontage, Riverside dressing, backdrop). Visible = distance (tied to fog) + frustum.
- **Reuse**: each chunk runs `HT.World.ground/tree/streetLamp/yard/hedge/crate/fence/walls/finish` on a windowed builder (triangles clipped to the chunk), `HT.Buildings` houses/shops/shells merged per material, `HT.Vehicles` LOD1 parked cars registered through `regCar`.
- **LOD**: street furniture within 65 m, tufts 36 m, trim/markings 110 m (Medium); tree impostors one step nearer than the small hub; buildings cast through one shadow-only caster per chunk (layer 1, seen by the sun's shadow camera).
- **Collision**: static colliders from the grid in a 16 m hash (`L.cgrid`, used by `collide`), dynamic ones (cars, van) after `L.nStatic`; `ph` = raycast proxy height, `h` only on low colliders (crate, table, hedge, bed). Raycasts use invisible proxies within 80 m (`L.solids`, refreshed every 0.5 s).
- **API**: `OW.build(def,lvl,ctx)`, `update(camera)`, `dress(trustR)`, `openBridge()`, `gps(from,to)`, `regionAt(x,z)`, `buildAll()`, `quality(q)`, `stats()`, `reset(lvl)` (cache reuse).
- **Hooks in index.html** (OPEN WORLD block): `owLevel` (buildLevel's world branch, cached), `owEnterHub` (bridge after Rick's job, return to the ring), `owUpdate` (region banners, Riverside mood blend, GPS route + chevrons), `owFastTravel` (map pins), `owShops` (meta shop doors). `__ht`: `WORLD, ow, region, gps, chunks, openBridge(), fastTravel(id), dress(t), drawCalls()`.

```
node dev/openworld-ingame.js [--write]   # in-game checks + budgets -> docs/screenshots/open-world/evidence.txt
```

## Jobs in the world and Act 2 (SPEC2 W3/W6, see `docs/design/ACT2.md`)

Every job runs at its real site in the open world (`startMissionWorld`; `CFG.inWorld=false` keeps the four Maple jobs on their old separate levels). The block in index.html just before `LOOP` holds world missions, the Riverside jobs, chase, escort and stakeout. `__ht` adds `MISSIONS, CFG, WM, WJ, jobLock(i), jobAvailable(i), missionInWorld(i), startMissionWorld(i,{raid,checkpoint}), giverModel(id), wmKeepDriving(), chase, truck, suspects, npcs, UIacts, UIobj, prompt, carry, exitAt, wmRng(seed)`.

```
node dev/riverside-ingame.js [--only=0,4,91] [--seeds=10]   # giver -> drive -> complete -> paid for all 9 jobs, bridge, gates, leash, fallback, chase seeds
node dev/riverside-shots.js                                  # docs/screenshots/riverside-jobs/*.jpg
```
`--only` takes job numbers 0-8, plus 90 (W3 checks: leash, leaving the job, fallback, trust gate) and 91 (chase win/fail over `--seeds`).

## Characters under a bad network, and aim toggles
```
node dev/people-load.e2e.js [--shots]   # first 6 model requests per scenario aborted, 3 s latency on the rest: no box figure ever visible,
                                        # every named character real within 30 s (hub start with crew, Riverside, roundup, hub after a job)
node dev/aim-toggle.e2e.js              # real mouse/keys: gun aim, overwatch scope + Shift breath (tap toggle, auto-release),
                                        # camera, tank gunner's sight are toggles; Key bindings → Aim: Toggle/Hold
```
