# Act 2: world missions and the Riverside jobs (implementation notes)

What `docs/design/SPEC2.md` layers W3 and W6 became in `index.html`, and where to look.

## Where the code is

One block in `index.html`, just before `LOOP`. Its sections are RIVERSIDE JOBS (people and data), WORLD MISSIONS, CHASE, RIVERSIDE JOBS (per-job logic), ESCORT, the Duke, STAKEOUT VIEW and HUB. Everything else is a small hook in an existing function:

| hook | what it does |
|---|---|
| `startMission(i, legacy)` | Sends the job to `startMissionWorld(i)` when `missionInWorld(i)`. `legacy=true` or `CFG.inWorld=false` keeps the old separate level for the Maple jobs. |
| `updMission` | `wmMission(dt)` runs first. It handles the leash, leaving the job, Rosa the medic and the chase. The Riverside jobs run their own frame; the Maple jobs then go on into the classic branches. |
| `endMission` | Riverside trust (+14; the Duke +20 if cuffed, +8 if not), `m.endLine`, `wmWin` (Rosa joins), `wmResult` (**Keep driving**, or a chase-checkpoint retry). |
| `enterHub` | `wmHubEnter` (after-signs, the Act 2 card), `wmHubGivers` (every available giver, locked givers with their reason), `wmHubCrew` (adds Rosa once she has joined). |
| `updEnemy` / `updAlly` / `updVan` / `updCamera` | Scripted enemies (walking home, the Duke running to his car, drivers bailing), crew riding along, Rosa reviving, van impacts in jobs, the stakeout binoculars. |
| `hud()` | Drive HUD during jobs, trust for the current region (`trustLabel`, js/hud.js), van health from the car's HP, the chase car's dot on the minimap. |
| `metaResult` | Riverside trust multiplier, plus `M.payX` (bikes, converters, ids, cleanStakeout, beds, truckHp, chaseT, vanHp) for `HT.Economy.computePayout`. |

## How a job runs in the world

- **Activation.** `activateSite(WORLD.sites[id])` fills `L.items`, `bonus`, `stashes`, `ammo`, `spawns`, `waveSpawns` and `grill` with fresh meshes. It builds an AI nav (`wmNav`) for the site window: the whole world grid, with every tile outside the window turned into wall, so enemies are leashed by construction. This takes 2–12 ms and is cached per window. An enemy pushed outside the window walks back to his spawn along a GPS route (`script:'home'`).
- **Exit.** The exit is the dad's own vehicle. The ring sits beside it, and you finish by getting in. Any car you take during a job becomes the exit.
- **Leaving the job.** More than 30 m outside the site starts an 8 s countdown, then the job fails with the windshield note. This doesn't apply during chases, escorts or the stakeout.
- **Riverside rings.** The Riverside lots are fenced, so their rings sit on the street at the gate (`wmDests`). Dee's ring is the stakeout spot on Main St. Benny's is at his depot.
- **After-signs.** `wmAfter` puts up signs at finished sites: the climbing gym, SOLD with flower pots, the bike library, Spin City, the T-ball field and Second Gear Auto School.

## New systems

- **Chase.** `chaseStart`/`chaseUpdate` run the getaway with `HT.CarAI.flee` on `HT.Roads` and a seeded RNG (`wmRng`). On top of CarAI's own rubber band, the car eases off more the further a chasing dad falls behind (×0.85/0.72/0.62). With nobody in a car it just leaves.
  - **Contact.** Ram and PIT both ways go through `HT.CarAI.ram`; the car's collider only blocks people on foot.
  - **Crew fire.** 3 HP/s per dad, up to 3, out to 30 m.
  - **Passenger fire.** 3 HP per hit, 55% hit chance, every 1.2 s.
  - **Wall scrapes.** These do half damage and can't take the van below 25% in a chase. Rams and gunfire can finish it.
  - **End.** Stopped (HP 0, or boxed in for 2 s), the occupants bail: they flee 25 m, then put their hands up or fight. If the car escapes (110 m for 8 s), the job fails and **Retry the chase** restarts from the scrapyard gate. A wrecked van fails the job and is towed to Dad's Auto (**Keep driving** puts it there, repaired).
- **Escort.** Benny's truck (workvan, its own decals and a cone on the roof) runs `HT.CarAI.follow` along the route lane. It waits when you're more than 28 m behind or right in front of it. There are three ambushes, and the ambushers shoot the truck. Surrendered stragglers get zip-tied by the crew when you leave. At the court the truck is stolen, and the truck chase follows (19 m/s, 110 HP).
- **Stakeout.** You stay in the van. Hold aim for binoculars (11° FOV with an overlay), and hold a suspect for 1.5 s to ID him. Suspicion rises on foot within 12 m (+35/s) or with a honk (+40), and falls 5/s otherwise. A clean ID gets Dee walking her kids out, then the raid starts. At 100% suspicion the kids scatter and every enemy starts alerted.
- **Carryable loot.** You carry bikes and converters one at a time and load them into your ride. Capacity: minivan 8, pickup and work van 12, SUV 9, sedan and hatch 3. A full ride means the item gets set down next to it.
- **Garden defence.** The waves come from `HT.AI.director`, aimed at the shed. Enemies flatten beds by walking on them (−20 HP/s, 60 HP per bed).
- **Medic.** Rosa walks to a downed dad within 14 m and kneels; he's back up in about 3 s instead of 9. She also gives the dad +25 HP once per job when he's below 30.

## Unlocks

The bridge opens after Rick's job (owner decision F.1). Each gate needs the previous job done:

| job | Riverside trust needed |
|---|---|
| Earl | none (Rick's job opens the bridge) |
| Dee | 15 |
| Rosa | 25 |
| Benny | 35 |
| The Duke | 50, and all four Maple jobs done |

The finale card shows after the Duke. It offers **New Saturday** (reset) or **Keep driving**.

## Casting needed (temporary stand-ins today)

`giverModel(id)` is the only place to change. Every stand-in is the base character with an outfit tint; the crown and chain are hidden on the boss base.

| character | where they appear | stand-in today |
|---|---|---|
| Earl Booker (retired bus driver, 60s) | giver for End of the Line and The Duke; radio | `boss` base, blue tint |
| Pastor Dee (youth pastor) | giver for Fellowship Hall; walks the kids out during the stakeout | `wife` base, purple tint |
| Rosa (ER nurse, scrubs) | giver for Garden Variety; then a crew member and medic on later jobs and in the hub | `wife` base, teal tint |
| Benny (ice-cream man, apron, pink cap) | giver for Brain Freeze; hands out cones at the court | `boss` base, pale pink tint |
| Sal Benedetto (Dad's Auto) | not spawned yet (Dad's Auto is a menu); `HOMIES.sal` is ready | `boss` base, grey tint |
| Stakeout lookouts (three 12-year-olds) | Fellowship Hall stakeout | the family `son` model in a hoodie tint (preloaded when Dee's job opens; a smaller street-crew figure if it hasn't streamed in) |

## Tests

`node dev/riverside-ingame.js [--only=…] [--seeds=10] [--shots]` and `node dev/riverside-shots.js` (screenshots in `docs/screenshots/riverside-jobs/`).
