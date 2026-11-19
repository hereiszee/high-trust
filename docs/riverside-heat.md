# Riverside free roam and heat

Outside a job, Riverside Flats is the one place where the dad can take his gun out. Three made-up crews of petty thieves hang around their own blocks. Firing raises **heat**, and heat brings the crews out: first the local one, then a second crew, and the two crews end up fighting each other as well as the dads. Heat cools off once nobody is firing. Zip-tying crew members raises Riverside trust and thins that crew out. As trust climbs, the crews fade away, and at the top tier the whole system switches off.

All of the code lives in one section of `index.html`, **FREE ROAM / HEAT**, just above `LOOP`. The section header lists every hook it uses. The checks are in `node dev/riverside-heat.js [--write]` and the staged screenshots in `node dev/riverside-heat-shots.js`. Both write to `docs/screenshots/riverside-heat/` (`evidence.txt` plus six jpgs).

## Player rules

| | |
|---|---|
| Draw | `1` `2` `3` `Q`, or Fire. This only works on foot, in Riverside, with no job running, and with the setting On. In Maple Heights and on Route 9 the gun stays holstered and the dad says a line ("Not on Maple. Mrs. Henderson already thinks we're a militia."). |
| Holster | Press `H`. It also happens automatically after 20 s of calm (no shots, heat below 1, no alert crew within 40 m, not aiming), when you get into a car, or when you leave Riverside. |
| While drawn | Aiming, ADS, firing, reloading, the scope, crosshair spread, picking up dropped guns, ammo magnets, zip-ties and confiscation all work exactly as they do in missions. The HUD switches to mission mode. |
| Zip-tie | Press `E` within 2.4 m of a crew member who has surrendered. You get +1.5 Riverside trust, the crew thins out, and heat drops by 0.5. A crew member might be carrying stolen goods (all porch pirates and car thieves do, and others 45% of the time). |
| Stolen goods | Hand them to a neighbour, leave them on the porch they came from, or put them in the **Lost & Found** drop box outside the Community Center. Each one pays $10-30 plus 0.5 trust. |
| Kills | -2 Riverside trust if the dad did it, -1 if a crew dad did it. Crew-on-crew kills cost nothing. |
| Going down | Fade to black, then you wake up at home. Sal from Dad's Auto towed the van home ($40, or whatever cash you have left). Heat resets and the gun is holstered. |
| Setting | Pause → Controls → **Riverside street trouble: On / Calm** (`CFG.streetTrouble`, default On). Calm removes the crews, the incidents and the heat, and the gun stays holstered. |

## Crews (fictional, identified only by a neutral armband colour)

| Crew | Armband | Turf (tiles) | Guns |
|---|---|---|---|
| The Coupon Boys | teal `#2aa39a` | x152-188, z0-47 (west: River Rd, 2nd St, the laundromat) | pistol, nailer, double |
| Third Street Returns | lilac `#9b7fd8` | x189-231, z0-36 (north-east: the court, the Community Center) | pistol, SMG, pump |
| Dock Street Discount | mustard `#e0a82e` | x152-231, z48-79 (south: Mill St, Dock St, Warehouse Row) | pistol, pump, nailer |

The garden band (x189-231, z37-47) belongs to no crew. Crew members come from the existing street-crew pool exactly as it is (`makeDude` → `HT.People` shuffle bag). The only thing added to a crew member is the armband: an open cylinder on `Bip01_L_UpperArm`, halfway to the elbow, or a band on the arm block for box dudes.

**Loitering spots** are the corner sidewalk tiles at every Riverside intersection, the porches (stoops) and the basketball court. A spot inside a mission lot, or within 3 tiles of one, is never used. Groups of 2-4 stand facing each other and glance at the dad when he comes within 9 m. If he is within 16 m, one of them says a line every 9-16 s. They carry no visible gun until they turn hostile.

**Becoming hostile:** a crew turns hostile in four ways:
- pointing a drawn gun at a group within 13 m for about 1.5 s (0.8 s while aiming)
- a shot whose path passes within 5 m of a member, or any shot within 45 m
- hurting one of them
- walking into a car break-in

## Heat (0-5 pips under the trust meter, Riverside only)

| Heat | What happens |
|---|---|
| +1.3 | The first shot (from 0). Each later shot adds 0.16, a hit on a crew member 0.05, a kill 0.6. A nearby gunfight adds 0.035/s, and a crew-on-crew shot adds 0.015. |
| 1-2 | The crew you startled (or the turf you're standing on) comes out. Any group within 45 m arms itself. Reinforcements of 2-3 come in from out of sight until (2 + level) members are hostile, at most every 9 s. |
| 3-4 | **Turf war.** The nearest other crew joins (banner: TURF WAR). Each crew's AI world lists the other crew's members as threats alongside the dad and his crew dads, so you get a three-way fight with cover, fire tokens and suppression from `HT.AI`. A war that lasts more than 45 s scars the block: the dressing tier drops by up to 20 trust points and heals at 0.12 per second. |
| 5 | A reinforcement sedan: a road route from `HT.Roads` (`OW().roads().route`) is driven with `HT.CarAI.follow/step`. It starts 60-120 m away, out of sight, and stops 18 m from the dad. Three crew members bail out, and the car stays parked as a collider. Cooldown is 75 s. |

**Cooling off:** heat doesn't drop until 7 s after the dad's last shot. From then on it falls at 0.1/s, multiplied by:

| Condition | Multiplier |
|---|---|
| holstered | ×2 |
| no hostile can see you | ×1.6 |
| a hostile can see you | ×0.5 |
| more than 55 m from where it started | ×2 |
| out of Riverside | ×3 |
| driving faster than 6 m/s | ×2.5 |

Each zip-tie takes 0.5 off straight away.

Below 1, once the guns have been quiet for 7 s and no crew has been provoked in the last 15 s, the crews lose interest. The war ends, every hostile holsters and walks off, and they despawn out of sight. The pips turn blue, the label reads **Cooling off**, and the music drops from `combat` to `tension`, then back to `hub` at 0. A crew dad remarks on it ("Okay. It's cooling off.").

**Scaling with Riverside trust** (`HT.World` tiers):

| trustR | max heat | loitering groups per crew | group size | incidents |
|---|---|---|---|---|
| 0+ | 5 | 3 | 3-4 | every 55-95 s |
| 20+ | 5 | 3 | 2-3 | ×1.3 gap |
| 35+ | 4 (no car) | 2 | 2-3 | ×1.7 |
| 50+ | 3 | 1 | 2 | ×2.4 |
| 70+ | 2 (no war) | 1, Dock St only | 2 | ×4 |
| 90+ | **0, the system is off** | none | | none |

At 90+ the gun won't come out ("Nobody's out here but kids with chalk, man. Put it away."). Two zip-ties on a crew take one group off its quota, and that heals one step every 4 minutes.

## Incidents (optional, one at a time, only at heat 0)

These start 32-75 m away and out of sight. At 70%+ only the Dock St crew is left, so the only incidents are its porch pirates and car break-ins. Each shows a banner, an objective line ("… · optional") and a marker.
- **Porch pirate:** a thief grabs a package off a stoop, walks off, and runs if you get close. Catch him (3.2 m) and he gives up. Zip-tie him, then take the package back to the porch.
- **Car break-in:** two crew members at a parked neighbour's car. Walk up with your gun drawn (14 m), or holstered (10 m) and lose a coin flip, and they fight. Otherwise they run.
- **Scuffle:** two members each from two crews shoving at a corner. Holstered, `E` within 6.5 m breaks it up (+1 trust). With your gun drawn they scatter. Shooting near them starts a war between the two crews.

## Safety valves

- **Spawning:** never within 25 m of the dad or in his sight. "In sight" means a clear line on the grid from the dad (rowhouses, walls and trees block it; chain-link and hedges don't), or in the camera frustum with a clear line from the camera. The check runs for every member's own position, not just the spot, because a corner can hide the spot and still show a shoulder. Ambient groups spawn 30-85 m away. At the cap, the farthest quiet group that nobody can see goes home, so the street life follows the dad. and reinforcements spawn 32-58 m away on sidewalks and roads. Nothing ever spawns on a mission lot or within its margin. The only exception is the heat-5 car: its riders get out of a car you watched drive in.
- **Caps:** at most 10 hostiles. Past that, a provoked loiterer runs off instead. At most 12 loiterers.
- **Story missions:** a job start clears free roam. `clearChars()` calls `frReset()`, and `frUpdate` only runs from `updHub`.
- **Neighbours:** up to 4, depending on tier, on their porches. Kids appear from 50%. Their meshes never go into `rayTargets`, so they can't be hit. At heat ≥ 1, or with anyone hostile, they walk indoors and disappear. They come back after 6 s of calm.
- **Crew dads:** with a free-roam fight on, they use `HT.AI.ally`, the same code as in missions. They go down and get back up exactly as they do in missions.

## Hooks in index.html (outside the section)

- `clearChars`: `frReset()`.
- `hurtEnemy`: `frHurt(e,by)` (heat, provoke, who did it).
- `hurtPlayer`: hub → `frHurtPlayer`.
- `aiShot`: hub → `frNoise`, for gunfire from the dad and the crew dads.
- `updEnemy`: crew members → `frEnemy`, after the dead/cuffed/surrender branches.
- `updAlly`: hub → `frAlly`.
- `updWeapon` / `updPlayer` / `updCamera` / `hud`: `mode==='mission'` became `armedNow()` (mission, or drawn in free roam).
- `hud`: `frObj` (objective lines), `frMarkers` (incident, drop box, porch markers, plus the heat meter update), `frBlips` (minimap blips for alert hostiles only).
- `keydown`: `frKey` (draw / holster / Maple quip).
- `updHub`: `frUpdate` (returns the zip-tie / hand-over / break-it-up / pickup prompt).
- `owUpdate`: `O.dress(frDressT(prog.trustR))` (the war scar).
- `js/hud.js`: `HUD.minimap.overlay(fn)` draws the crew turf tints on the full map. It fades out as trust rises and is gone at 90+.

The nav window is `HT.AI.buildNav` over a grid the **same size** as `L.g`. Cells outside a 61×61-tile window around the dad are filled with `~`, which is solid but doesn't block line of sight, so cell ids and covers stay valid when the window moves. The window is rebuilt when the dad moves 10 tiles from its centre, at most every 2 s, and each rebuild takes about 15 ms. Colliders come from `L.cnear`.

## Test hooks (`window.__ht`)

`heat` (get/set), `setHeat(v)`, `crews`, `fr` (the state), `frArmed`, `spawnCrew(id,x,z,n,{hostile})`, `frDraw(id)`, `frHolster()`, `frKey(k)`, `frIncident('porch'|'carjack'|'scuffle')`, `frReset()`, `frNav()`, `frSeen(x,z)`, `frWant(crewId)`, `frTrust(v,why)`, `frCuff(e)`, `frHurtPlayer(d,src)`, `frUpdate(dt)`. `fr.stats` holds the counters: `ms` and `frames` (cost), `spawnLog`, `hits_player`, `hits_ally`, `hits_crew`, `kills`, `cuffs`, `wars`, `cars`, `incidents`, `reinf`, `navBuilds`, `navMs`, `downs`. `fr.noEsc` freezes escalation for the decay tests.
