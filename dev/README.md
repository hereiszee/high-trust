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
