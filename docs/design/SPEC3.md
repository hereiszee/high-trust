# High Trust: Mission Catalogue (SPEC3)

Extends `docs/design/SPEC.md` (arsenal, home, economy) and `docs/design/SPEC2.md` (world, Riverside, Dad's Auto). Everything there still holds. Same conventions: code is named by function, constant or section header, never by line number. `TILE=2` m. World tile coordinates are `(x,z)` from `js/worldgen.js`. `window.__ht` is the test surface.

This document answers the owner's question: *"how many missions currently exist? how differentiated are they? i want to take gta style missions and make them fit what we're building here"*. It takes the **generic structures** of open-world crime-game missions (tail, stakeout, repo, timed errands, pursuit, heist, infiltration, overwatch, roadblock, defend, escort, recovery, race, sabotage, interrogation, rescue, rampage, repeatable side jobs, finale) and rebuilds each one around suburban dads, zip-ties, borrowed cars and a trust meter. No mission, character, name, line or set piece is taken from any existing game.

---

## 0) Two-minute summary

**Today:** 4 jobs are live on `main` and 5 Riverside jobs are built on `work/riverside-jobs` (not merged). Riverside free roam with heat is on `work/riverside-heat`, and car damage and tows are on `work/car-damage`. **The 4 live jobs are one verb loop:** walk into a den, shoot or zip-tie whoever is there, and do a hold-E objective (loot, smash, hold, boss). The Riverside five add real variety (stakeout from the van, carrying loot to a car, an escort, two car chases), but 7 of the 9 still end as "clear a walled lot on foot." Nothing in the game yet asks you to **stay unseen, talk, take photos, tow, race, plan, place things, or fix things.**

**Proposal: 23 new missions, each with its own verb loop: 19 story jobs, a finale that uses everything, and 3 repeatable side jobs.**

| Archetype | Mission | Hook (one line) |
|---|---|---|
| **Tail** | *Following Distance* (Doug) | Tail a getaway sedan from Fill-Er-Up to its drop without being made. Swap into a neighbour's car when they start to recognise the minivan. |
| **Stakeout / evidence** | *Exhibit HOA* (Barb, HOA president) | Photograph a fencing operation run out of a "for sale" house on Walnut Dr. The HOA won't act without a 3-star photo of every violation. |
| **Repo / tow** | *Hitch Happens* (Sal) | A fake tow company has been "impounding" Riverside cars. Hook them up and tow them back to their owners, one at a time. |
| **Timed errands** | *Dad Taxi* (Jen) | School run, soccer gear, the orthodontist, a forgotten trombone. Then the carpool kids' bikes get stolen off the rack mid-route. |
| **Pursuit, reversed** | *Brake Check* (Coach Rick) | You are the pursuit. Three dad cars run a play to box in a smash-and-grab crew. No ramming the civilians. |
| **Heist, reversed** | *Good Fences* (Gary) | Four stages: scope the fence's storage warehouse, gather gear (Linda's ladder, walkie-talkies from Hank's), assign crew roles, then steal everyone's stuff back. |
| **Infiltration** | *Grand Opening* (Pastor Dee) | Crash a pawn shop's grand opening in a fake mustache and a lanyard. Nobody calls you out because everybody's too polite. Don't fire a shot. |
| **Overwatch** | *Higher Ground* (Doug) | Cover the crew from the Community Center roof with the hunting rifle and beanbag rounds while Rosa walks a witness to the church. |
| **Roadblock / convoy** | *Cone Zone* (Earl) | Ninety seconds to build a roadblock on Industrial Way out of cones, sawhorses and borrowed cars before the stolen-goods convoy arrives. |
| **Defend while it finishes** | *Heavy Lifting* (Ms. Okafor) | A new family is moving onto 3rd St. Hold the street while the truck unloads, and carry boxes yourself to speed it up. |
| **Escort on foot** | *Crossing Guard* (Pastor Dee) | Walk eleven kids home across 2nd St during a turf flare-up. They follow you like ducklings. Your stop sign is a shield. |
| **Vehicle recovery** | *Minivan Roundup* (Coach Rick) | The whole carpool fleet was stolen and parked at the Route 9 Park & Ride. Get all five back, with the crew driving in convoy. |
| **Race / trust event** | *The Grass Is Greener* (Big Dave) | The Linden Park ride-on mower grand prix. Fair racing earns trust. A Riverside crew sabotages the pit. |
| **Sabotage** | *Sign of the Times* (Sal) | At night, sneak into a new chop shop on Mill St. Let the air out of the tyres on its tow fleet, swap its sign and get out unseen. |
| **Interrogation** | *Small Talk* (Gary) | A cuffed lookout won't talk. Big Dave grills burgers while you try awkward dad conversation until he gives up the warehouse. |
| **Rescue / trace** | *Chain Reaction* (Tyler) | Tyler's bike is gone. Follow the clue chain (neighbours, a resale listing, a kid on a fast bike) to a garage full of stolen bikes. |
| **Rampage, inverted** | *Honey-Do Blitz* (Hank) | Three minutes to fix as much of Riverside as you can: fences, bulbs, graffiti, carts, a cat. Combos. A leaderboard. |
| **Fragile delivery** | *Handle With Care* (Big Dave) | Drive fourteen hours of brisket across the river to a block party. A g-force meter, potholes and a crew who want the brisket. |
| **Capture alive in a crowd** | *Hands Off* (Rosa) | Pick out the "charity collector" who's skimming the Riverside farmers' market and drop him with one beanbag without starting a panic. |
| **Finale** | *Everybody Waves* (everyone) | The Wholesaler tries to stop the first Riverside street festival. Uses tail, overwatch, roadblock, defend, chase and zip-ties, and ends at Riverside trust 100. |
| **Repeatable** | *Watch Your Step* | Neighbourhood-watch patrols: walk or drive a route, check the porches and handle what you find. |
| **Repeatable** | *Porch Light* | Guard a delivery-day porch from a pirate, then catch him without a scratch on the parcel. |
| **Repeatable** | *Suds Up* | Run the youth-group car wash fundraiser while a crew keeps trying to ruin it. |

**Structure:** three acts that interleave both neighbourhoods (Act 1 *Our Street*, Act 2 *Over the Bridge*, Act 3 *Good People Stay*). Every crew member and contact gets a 2-job strand with a perk. A pacing chart keeps two jobs of the same main kind from ever running back to back. Riverside's visible transformation is driven by a **households** counter: each Riverside job brings a specific family or shop back to a specific address.

**New shared systems (8, each specified once in section 4):** stealth and detection, tailing bands, photo evidence, tow hitch, crew roles card, disguise and politeness, stage checkpoints, and the fridge-calendar replay.

**First build wave (section 5), chosen for the most variety per unit of work:** *Dad Taxi* (timed driving), *Honey-Do Blitz* (fix-it spree), *Small Talk* (dialogue), *The Grass Is Greener* (race) and *Higher Ground* (overwatch). That's five different verbs. Each one is a new file plus at most one new small system, and none of them needs stealth, towing or the roles card.

**Decisions I need from the owner:**
1. **Family on missions.** SPEC.md C.5 says the family never goes on raids. *Dad Taxi* puts the kids in the car (no combat near them: the crew handles the trouble while you keep driving), and *Chain Reaction* has Tyler at home and on the phone. OK? (Recommended: yes, with no guns drawn within 25 m of a family member.)
2. **Stealth failure.** If you're spotted, does the stealth part of the job **escalate into a fight** (you lose the "clean" bonus) or **fail and retry from the stage checkpoint**? Recommended: escalate everywhere except *Grand Opening* and *Sign of the Times*, which fail softly to their checkpoint.
3. **Act 3 antagonist.** *"Good people move in"* can read as gentrification. I recommend framing Riverside's change as **people returning and staying** (Earl's neighbours, Rosa's kids' friends, Ms. Okafor's cousins) and making the Act 3 villain **The Wholesaler**, a regional fence who buys stolen goods, not a landlord. Do you agree with that framing and name?
4. **Night.** *Sign of the Times* and the *Watch Your Step* evening patrol need a night mood (`MOODS.night`: dark sky, lamps, headlights). Is one night preset in scope?
5. **One new vehicle.** The ride-on mower (*The Grass Is Greener*, and a garage unlock) is the only new vehicle model. Do you want it, or should the race use go-karts built from the existing `hatch`?
6. **Bridge timing.** `work/riverside-jobs` opens the bridge after job 2 (Rick). SPEC2 opened it after job 4. This catalogue assumes **after job 2**, so both neighbourhoods interleave from early on. Please confirm.

---

## 1) Audit: the 9 jobs that exist or are being built

"Live" means on `main`. "Branch" means `work/riverside-jobs` (3498b37), where all five Riverside jobs have code (`WJ[id].start/upd` in *RIVERSIDE JOBS: per-job logic*, *ESCORT*, *CHASE*, *STAKEOUT VIEW*).

| # | Job | State | Verb loop (what your hands do) | What's actually different in play | What's missing / samey |
|---|---|---|---|---|---|
| 0 | *Return to Sender* (Gary), chop shop | live | drive → walk in → shoot/zip-tie → hold E on 4 piles → back to van | Tutorial pacing: 2 guns, a small den, packages to collect | Same den-clear as everything after it. Collecting is a hold-E on the floor; nothing about it is physical. |
| 1 | *Fourth Quarter* (Rick), Birch duplex | live | den-clear → hold E on 3 tables against a 2:30 clock | The only clock in the live game, and it pushes you forward | The clock is the only twist. The rooms play like job 0. |
| 2 | *Block Party* (Dave), Linden Park | live | hold the grill ring against 3 waves | Open ground, enemies come to you, the `AI.director` | The only defend job, and it's pure combat: nothing to build, carry or protect except a point. |
| 3 | *The Kingpin* (Doug), Ridgeview compound | live | den-clear → find the boss → he surrenders or drops | The surrender moment (`surrender(e)` on the boss, `HANDS UP`) is the best beat in the game | Structurally job 0 with a boss at the end. |
| 4 | *Exact Change* (Earl), Spoke Shop | branch | den-clear → **carry** bikes one at a time → load them into the car (`wmCarry`/`wmLoad`, pickup beds hold more) | Carrying (no gun while carrying) and choosing which car to bring | Still a walled lot full of hostiles. Carrying is new, but the job around it isn't. |
| 5 | *Fellowship Hall* (Dee), laundromat | branch | **stakeout:** binoculars from the van, ID 4 suspects without suspicion rising → Dee walks the kids off → den raid | First non-combat phase, first suspicion meter (`M.sus`), first social beat (Dee talks kids away) | The stakeout is a 60 s gallery. Nothing moves. It ends in a den raid. |
| 6 | *Garden Variety* (Rosa), garden | branch | waves + protect beds (`bedHp`) | Area protection: beds trample, and a non-combat stake you can partly lose | It's job 2 with flowerbeds. |
| 7 | *Brain Freeze* (Benny), route | branch | **escort** the truck (it waits for you) → ambushes → the truck is stolen → **chase** (`chaseUpdate`, rubber band, ram/PIT) | The first job that is mostly driving, the twist, the first chase | The ambushes are small den-clears in the street. The chase is a single target with no tactics. |
| 8 | *The Duke* (Earl), scrapyard | branch | den-clear → boss flees at 50% → **chase** → bails → cuff | Two-phase finale, and a boss who runs | Den-clear plus job 7's chase. |
| — | Free roam heat (`work/riverside-heat`) | branch | draw in Riverside → heat 0–5 → crews, turf wars, incidents (porch pirate, car break-in, scuffle) | A sandbox for fights, the zip-tie trust economy outside jobs, and three small incidents | It's all combat escalation. The incidents are good seeds for repeatable jobs (section 3.3). |

**Verb coverage today (9 jobs):** clear a den on foot ×7, timer ×1, hold a point ×2, carry ×1, stakeout ×1, escort ×1, chase ×2. **Nothing yet for:** stealth, tailing, photos, towing, racing, planning, building/placing, talking, fixing, on-foot escort, timed driving errands, fragile driving, picking someone out of a crowd, multi-vehicle coordination.

**Systems that already exist and that new missions should lean on:**
- **Driving and cars:** `updVan`/`HT.CarAI.drive`, 6 vehicle classes, upgrades (`HT.Garage`), borrowing any car (`BORROW`, `settleBorrow`, trust plus or minus for how you return it), car HP, damage bands and tows (`carHp`, `towCar`, branch `car-damage`), AI cars on the road graph (`HT.CarAI.follow/flee/wander`, `HT.Roads`), chases with rubber banding (`chaseUpdate`).
- **People and AI:** `HT.AI` squads with a view cone (`fov` 1.1 rad idle, 2.2 alert), hearing (`world.noises`), `investigate`/`search` modes, barks, surrender chance, the crew (`AI.ally`) with follow/cover/stack/revive, and the wave `director`.
- **Combat:** 9 guns including the **beanbag** (non-lethal, `opt.nonlethal`) and the **hunting rifle** (scope), zip-ties and confiscation, pickups.
- **Mission scaffolding:** `startMissionWorld`, `activateSite`, the leash, `M.phase`, `M.checkpoint` (retry the chase), `wmCarry`, `wmBino`, giver markers, `WM_AFTER` after-signs.
- **Meta:** two trust meters (`prog.trust`, `prog.trustR`), Riverside dressing tiers (`TIERS`, `FLAGS`), home with interactables (`fridge`, the cork board and calendar in `js/home.js`), Hank's supplies (`rangeDay`, `zipPack`, `icePack`), Dadazon, family NPCs, and `SAVE` (`js/save.js`).

---

## 2) Mission designs

Every design uses the same fields. **Reuses** lists existing systems by name. **New** names the shared systems from section 4 by their tag: `[STEALTH]` `[TAIL]` `[PHOTO]` `[TOW]` `[ROLES]` `[SOCIAL]` `[CP]` (stage checkpoint) `[CAL]` (calendar). **Size:** S is about 1 worker-day, M is 2–3, L is 4 or more. A size covers the job file only; a shared system is costed once in section 4.

**Payout** follows SPEC.md D.1: base, plus the job's own lines, plus the usual zip-tie, confiscation, hamstring and legal-fee lines, times the trust multiplier of the neighbourhood the job is in. Every job also has three **calendar medals** for [CAL] (bronze = finished, silver and gold as listed).

**Trust signature:** each job states what moves which meter. Unless it says otherwise: a Maple job affects `prog.trust`, a Riverside job affects `prog.trustR`, and a Route 9 job affects both at half weight.

New givers in addition to SPEC2's (all built with `makeDude`, no combat role): **Barb** (HOA president, Maple, from `NEIGHBOURS`), **Hank** (Hank's Hardware), **Sal** (Dad's Auto, already in SPEC2), **Ms. Okafor** (mom of the Okafor twins, 3rd St), **Jen** and **Tyler** (family, from home), **Marcy** (carpool coordinator, Maple).

New small sites, specified here once (all stamped by `js/worldgen.js` like the existing ones; there are no new regions):

| Site id | Name | Tiles | Notes |
|---|---|---|---|
| `school` | Maple Heights Elementary | x63–80, z1–3 (replaces 3 houses on Oak St's north row) | Drop-off loop on Oak St, a bike rack `k`, a crossing. Used by *Dad Taxi* and *Chain Reaction*. |
| `walnut` | 1418 Walnut Dr ("for sale" house) | the house at x57–61, z25–27 | An ordinary house lot with an `I`-marked garage interior. Used by *Exhibit HOA*. |
| `storage` | Discount Storage Unlimited | x104–135, z67–77 (the tree strip south of the chop shop) | 3 rows of roll-up units, an office, a loading dock. The Act 3 fence warehouse in *Good Fences*. |
| `parkride` | Route 9 Park & Ride | x124–139, z44–62 (east half of the chain-link ring around the chop shop) | Flat lot with 24 marked bays and one gated exit onto Route 9 via Industrial Way. |
| `pawn` | Cash-4-Yer-Stuff | x176–181, z16–18 (west end of the mart block) | A storefront with a back room `k` marked staff-only. |
| `millshop` | Mill St Auto Recovery | x208–218, z52–60 (Riverside block 3,3) | Chop shop and tow yard. Night job. |
| `market` | Riverside Farmers' Market | Main St closed between x172 and x204 on Saturday mornings (stalls, no tiles changed) | Props only, while the job runs. |
| `roof` | Community Center roof | `places.center` building, roof height 7 m, reached by a ladder `L` on the east wall | A raised player position for *Higher Ground*. |

---

### 2.1 *Following Distance*: tail (Doug, strand 1/2)

- **Giver:** Doug, at `g_doug`. **Location:** starts at Fill-Er-Up (`places.gas`), crosses the bridge, ends at the Duke's old Dock St lot (`site duke`, now empty).
- **Premise:** Doug has noticed the same grey sedan fill up at Fill-Er-Up every Tuesday at 4:10, then drive somewhere with a full trunk. He wants to know where, and he's very clear that you can't just ask.
- **Beat sheet:**
  1. Park at Fill-Er-Up. Doug is in the passenger seat. The target sedan (`HT.CarAI.follow` on a scripted road route, `max` 17 m/s, obeys stop points) pulls out.
  2. **Tail** from Route 9 into Riverside along a 1.6 km route that loops twice ("He's doing a figure eight. He's checking for tails. Or he's lost.").
  3. **Familiarity:** after 40 s close behind, the driver starts recognising the minivan (familiarity HUD pips). Doug: "He's made the van. Swap." Pull up beside any parked neighbour car (`BORROW`), switch cars (hold E, 1.2 s, Doug follows you), and continue. The swap resets familiarity for the new car.
  4. **Red light:** the target stops at a scripted "light" (a road-graph stop) for 8 s. Pulling up directly behind it doubles suspicion.
  5. The target arrives at Dock St and parks. Find a spot within 30–60 m with line of sight and **watch the handoff** (binoculars, `wmBino`): 3 people load the trunk into a box truck.
  6. Photograph the box truck's plate (one [PHOTO] shot, any star rating) → job done. The plate seeds *Cone Zone*.
- **Core new mechanic:** [TAIL] distance bands plus **car familiarity and swapping**.
- **Reuses:** `HT.CarAI.follow`, `HT.Roads` routes, `BORROW`/`settleBorrow` (the swap is a real borrow, so returning the car later is the usual trust plus or minus), `wmBino`, the GPS route line (hidden during the tail).
- **Fail states:** the target is lost (in the "lost" band for 12 s); the target is spooked (suspicion 100); you ram the target. Retry from [CP] "tail start" or "after the swap".
- **Trust / zip-tie twist:** nobody gets hurt. *Clean tail* (suspicion never above 50%): +4 Maple trust. If you borrowed a car, bringing it back undamaged gives the usual `BORROW` +1. If you ram the target, Doug sighs and trust is −2.
- **Payout and gate:** $450 base; "Never made" +$150; "Returned the borrowed car" +$50. Unlock: `done.rick` (the bridge is open). Medals: silver = one swap and never above 70%; gold = never above 40% and under 4:00.
- **Dialogue samples:**
  - Doug: "Rule one of tailing: be boring. You're a minivan. You're already halfway there."
  - Doug: "Two cars back. Two. Not one. Not zero. Zero is called 'following'."
  - You: "He's indicating left." Doug: "Nobody indicates. It's a trick."
  - Doug: "He's checked his mirror three times. That's not a mirror check, that's a relationship."
  - Doug: "Swap. Grab Ted's Dowager. Ted won't mind. Ted is at pickleball."
  - Doug (in Ted's car): "This smells like menthol and regret. Perfect cover."
  - Doug: "Light's red. Do NOT pull up behind him. Pretend you're reading a text. Not while driving. Pretend."
  - Doug: "Box truck. Get the plate. Steady. Steadier. Breathe like a sniper. A sniper who coaches T-ball."
  - Doug: "That's going on the corkboard. With red string."
  - Ted (feed, on return): "Ted found his car with a full tank and a new air freshener. Ted is suspicious but grateful."
- **Size:** M. **Depends on:** [TAIL], [PHOTO] (one shot, can be stubbed as the binocular ID from `wmBino`), [CP].

### 2.2 *Exhibit HOA*: stakeout with photo evidence (Barb, with Maddie as tech support)

- **Giver:** Barb, HOA president, at her house on Elm St (z34). **Location:** `site walnut` (1418 Walnut Dr) and the sidewalks and yards around it.
- **Premise:** The "for sale" house on Walnut has had a moving truck in the driveway every night for a month and has never sold. Barb thinks it's a fence. The HOA bylaws need **photographic evidence** before they'll do anything, and Barb's bylaws are very specific.
- **Beat sheet:**
  1. Barb hands you the checklist (an evidence board card): **6 violations** (a stolen bike in the garage, a crate with a Maple porch label, the van's plate, the lookout's face, money changing hands, a "SOLD" sign that's been sitting in the garage for weeks). Maddie texts: "dad the camera app has zoom. pinch. no the other pinch."
  2. **Free stakeout** for 6 in-game minutes, compressed to 4 real minutes. People come and go on a schedule (a 4-actor routine: driver, two loaders, a lookout walking a loop).
  3. Move between 5 vantage points: the bushes, Barb's neighbour's porch (talk your way on: "Hi Phil, just birdwatching"), a parked car (`BORROW`), the backyard fence (crouch), and the hedge by the garage window (risky).
  4. The lookout's loop has a vision cone [STEALTH]. Being seen on someone else's lawn raises suspicion. Being seen on the sidewalk with a phone is fine ("everyone on Walnut walks and stares at their phone").
  5. Each photo is graded 1–3 stars [PHOTO]. The board needs at least 2★ on 5 of the 6 items.
  6. **Hand it in:** Barb holds an emergency HOA meeting. The fence's crew packs up and leaves by the next day. No raid at all. Optional: the lookout is a 16-year-old from Riverside. If your board has his 3★ face photo, Barb offers him a summer job instead of reporting him (+trust).
- **Core new mechanic:** [PHOTO], an evidence checklist with photo quality.
- **Reuses:** [STEALTH] cones on 1 actor, `BORROW` for the parked-car vantage, the `wmBino` FOV zoom, `HUD.banner`, the home cork board (the board card reuses the `#cBrief` `.card` markup).
- **Fail states:** the operation spooks (suspicion 100 → the truck leaves early; the job fails with "They'll be back next week" and retries from [CP] "night 1"); the clock runs out with fewer than 5 items.
- **Trust / zip-tie twist:** no zip-ties at all. +6 Maple trust on success. The lookout gets a job: +3 Maple and +3 Riverside trust, and he appears later as a neighbour mowing lawns.
- **Payout and gate:** $500 base ("the HOA's discretionary fund"); +$30 per 3★ photo; "Not a single complaint about you" (suspicion never above 60%) +$100. Unlock: `done.gary`. Medals: silver = 6/6 items; gold = 6/6 at 3★.
- **Dialogue samples:**
  - Barb: "Article Nine, Section C. Visible evidence. Dated. In focus. I will not be laughed out of my own meeting."
  - Barb: "A blurry photo is a rumour. A sharp photo is a bylaw."
  - Maddie (text): "dad turn the flash OFF"
  - Maddie (text): "that photo is of your thumb"
  - You (to Phil on his porch): "Phil. Hi. Bird."
  - Phil: "...Sure. Want an iced tea?"
  - Lookout: "Somebody in the hedge? Nah. Hedges don't wear cargo shorts."
  - Barb: "Three stars. Look at that grain. You can see his regret."
  - Barb (meeting): "Motion to ask them to leave. Motion carries. Unanimously. Even Gil."
  - Gil (feed): "Gil voted yes. Gil has never voted yes."
- **Size:** M. **Depends on:** [PHOTO], [STEALTH] (one actor), [CP].

### 2.3 *Hitch Happens*: repo with a tow truck (Sal, strand 1/2)

- **Giver:** Sal, at Dad's Auto (`places.auto`). **Location:** a fake impound lot on Riverside's Dock St (empty Warehouse Row alleys), and owners' addresses across Riverside.
- **Premise:** A "towing company" with no licence has been hooking up Riverside cars on street-sweeping day and asking $400 to give them back. Sal lends you the shop's hitch. Tow every car back to its owner's curb.
- **Beat sheet:**
  1. Sal fits a **tow hitch** to your vehicle for this job (free here; buy it later at Dad's Auto). The pickup and workvan get it for free.
  2. Drive to the lot: 5 cars behind chain-link, 3 "attendants" (armed, `arms` pistol and nailer) and a gate.
  3. Enter on foot: clear or talk past the attendants. The gate opens either way. Then **hitch** a car [TOW]: reverse to its front, line up, hold E.
  4. **Tow** it to its owner's address (5 addresses, GPS on), drop it at the curb, and the owner comes out (a neighbour NPC). Each round trip is 300–500 m.
  5. After car 2, the fake tow company's own tow truck starts to **tail you** and tries to re-hook the car you're towing at red lights (an AI car that pulls up behind you, and a guy who gets out). Brake-check him, or stop and zip-tie him.
  6. Optional: tow the fake tow truck itself to Sal's ("Evidence. And a nice truck.").
- **Core new mechanic:** [TOW] physics and reversing to line up, plus the multi-trip structure.
- **Reuses:** `HT.CarAI` (towed car as a trailer), car damage (towed cars take damage, and the owner's thanks depend on it, using the `BORROW` trust maths), a short den-clear, `HT.CarAI.follow` for the pursuing tow truck, GPS, `HT.Garage` (new catalog item `hitch`).
- **Fail states:** your vehicle breaks down (`carHp<=0` → `towVan`); 3 owners' cars wrecked (HP 0); the timer runs out (12 min; street sweeping ends and the "fines" start).
- **Trust / zip-tie twist:** each car returned gives +2 Riverside trust, scaled by its condition (100–60% HP: +2; below 60%: +1 and a funny complaint). The fake tow driver who surrenders (+zip-tie) turns out to be a laid-off tow driver. Sal offers him a job at Dad's Auto (+3 trust, he becomes the shop's tow guy and `towVan` lines name him).
- **Payout and gate:** $700 base; +$80 per car returned; "Not a scratch" (all cars ≥ 90%) +$200; "Brought me the truck" +$250. Unlock: `done.earl`, `trustR ≥ 20`. Medals: silver = 5/5; gold = 5/5 not a scratch under 9 min.
- **Dialogue samples:**
  - Sal: "Hitching's easy. Back up slow. Slower. You're not parallel parking at a funeral."
  - Sal: "If it fishtails, ease off. Don't brake. Don't panic. Don't do what you're doing right now."
  - Attendant: "This is a legal impound." You: "Where's your licence?" Attendant: "...In the other truck."
  - Mrs. Kim: "My car! And it's been washed? Who washed it?" You: "Long story."
  - Mr. Hollis: "It's got a new dent." You: "It's got a new... character."
  - Fake tow driver: "I'm not even a bad guy, man, I'm a guy with a truck payment."
  - Sal: "Tell him to come by Monday. Bring his own coffee. Ours is bad on purpose."
  - Crew (Gary): "That's five cars. That's two thousand dollars nobody had to pay. I did the math."
  - Sal: "Keep the hitch. I'll put it on your tab. You don't have a tab. You do now."
- **Size:** M. **Depends on:** [TOW], car damage (`work/car-damage`), [CP] per car.

### 2.4 *Dad Taxi*: timed errand chain (Jen)

- **Giver:** Jen, at home (a kitchen interaction, not a marker). **Location:** Maple Heights: home → `site school` → Linden Park (soccer) → Hank's → the orthodontist (a new business pin on Route 9, a `B` lot at x104, z7 beside Fill-Er-Up) → home.
- **Premise:** It's Saturday and Jen has a shift. You have a list, two kids, two carpool kids, a trombone, and the kind of confidence that comes from never having done this before.
- **Beat sheet:**
  1. Jen's list (a sticky note card): **6 stops in a fixed order, each with a time window** (soft target ±30 s, hard deadline).
  2. Stop 1, Maple Heights Elementary: pick up Maddie and two carpool kids (they get in; seat count matters, and the minivan seats 7). Stop 2: drop the carpool kids at Linden Park soccer. Stop 3: Hank's for orange slices. Stop 4: the orthodontist for Tyler.
  3. **The sideways moment:** at stop 4, the carpool parents call. Somebody stole all the kids' bikes off the school rack. The job branches: 2 thieves with a pickup heading for the bridge. The kids are still in the car. **You don't stop to fight.** Your crew dad (Rick, called in) deals with the thieves on foot at the bridge. You **block the pickup** with the minivan (stay in its path for 3 s), while Maddie films it from the back seat (an automatic [PHOTO] for the payout).
  4. Stop 5: back to the school with the bikes in Rick's truck. Stop 6: home before Jen does.
  5. A **forgotten item** randomly appears on 1 of stops 2–5 (the trombone, a shin guard, the retainer) and needs a short detour.
- **Core new mechanic:** a chain of **timed stops with passengers**: a stop schedule, comfort (passengers complain about hard braking and kerb hits), and a non-combat blocking objective.
- **Reuses:** GPS (`HUD.minimap.route`) to each stop, the stop ring markers (the `travel` marker kind), `CV` seats and passenger count, the family models (`FAMILY`), `HT.CarAI.follow` for the thief pickup, `HUD` timer, car damage (kids notice), [PHOTO] automatic.
- **Fail states:** a hard deadline missed at stop 4 or 6; a family member in the car while a gun is drawn (you can't draw while kids are in the car, so this is a guard, not a fail); the van wrecked. No death fail: the kids are never in danger. The thieves never shoot at a car with kids in it, and that's said out loud ("Not with kids in it, man, are you crazy?").
- **Trust / zip-tie twist:** comfort score affects the payout. Rick zip-ties the thieves while you're blocking (+2 Maple trust each). If you **give the thieves a ride to the crossing guard instead of cuffing them** (dialogue option at the block, available if the thieves are under 18), you get +5 trust and Maddie's opinion of you goes up (a home line).
- **Payout and gate:** $400 base ("Jen's rate"); +$40 per on-time stop; "Smooth ride" (comfort ≥ 80) +$100; "Nobody forgot anything" +$50. Unlock: available from the start of Act 1 after `done.gary` (teaches driving). Repeatable afterwards as **Dad Taxi rides** (section 3.3). Medals: silver = all stops on time; gold = all on time with comfort ≥ 90.
- **Dialogue samples:**
  - Jen: "Orthodontist at eleven. Not eleven-ish. He charges for eleven-ish."
  - Maddie: "Can we not be the first car in line. Please. Everyone will see."
  - Carpool kid: "My mom lets me sit in the front." You: "Your mom is not here."
  - Tyler: "You braked like Grandpa." You: "Grandpa is a very safe driver." Tyler: "Grandpa hit a mailbox."
  - Thief: "Is that a minivan blocking us? Just go around." Other thief: "There's like eight kids in there. Don't."
  - Rick (radio): "You hold the road. I've got the two guys. This is a two-man drill."
  - Maddie: "I'm filming this. For evidence. And also for content."
  - Jen (text): "Why is Rick's truck full of bikes in the school parking lot"
  - You: "Long story. Everyone's on time." Jen: "...Okay. I love you. Who has the trombone."
  - Tyler: "Dad. The trombone."
- **Size:** M. **Depends on:** nothing new beyond a stop-schedule helper inside the job file. Optional [PHOTO].

### 2.5 *Brake Check*: reverse getaway, you are the pursuit (Coach Rick, strand 1/2)

- **Giver:** Rick, at the soccer field (Linden Park). **Location:** starts at Fill-Er-Up, runs along Route 9, Industrial Way, the bridge and Riverside's grid.
- **Premise:** A smash-and-grab crew hits Fill-Er-Up's ATM once a week. Rick's plan comes from the playbook: three cars, one play, **box them in**. No ramming civilians, no shooting at a moving car. "We're not animals. We're a zone defence."
- **Beat sheet:**
  1. Pre-play huddle (a small [ROLES] card: who drives the **wing** cars, Rick or Dave, and which play, "Funnel" or "Sandwich").
  2. The crew's hatchback (`hatch`, `max` 28) leaves Fill-Er-Up with the ATM in the back. You and two AI crew cars give chase.
  3. **Box-in**: the target is boxed when the player car is in front and two crew cars are on its sides (or behind) within 4 m for 3 s **while its speed is under 8 m/s**. A HUD play diagram shows the 3 slots filling. Calls like "Go left!" tell the AI cars which side to take (`HT.CarAI.follow` with offset targets relative to the target).
  4. **Funnel** the target: calling the "Cut 4th" play sends a crew car ahead to block a cross street via the road graph, which forces the target onto a route you choose.
  5. Civilian traffic (`wander` cars) is in play. Hitting a civilian gives −2 trust and the coach blows a whistle.
  6. Once boxed, the crew bails. Zip-tie 2–3 (the driver tries to run: a foot chase). The ATM goes back.
- **Core new mechanic:** **multi-car pursuit with play calls**: AI allied cars that hold formation slots relative to the target, plus a box-in condition instead of a ram.
- **Reuses:** `chaseUpdate` (target AI, rubber band), `HT.CarAI.follow/flee`, `HT.Roads`, the civilian traffic from SPEC2 W1, car damage, foot surrender plus zip-ties, a light [ROLES].
- **Fail states:** the target escapes (more than 220 m for 15 s); your car breaks down; 3 civilian hits ("Coach is benching you").
- **Trust / zip-tie twist:** boxing without contact gives +6 trust (both meters at half weight, because it's Route 9). Every ram on the target costs −1 ("Flag on the play"). Zip-tie the driver after he runs instead of beanbagging him: +2.
- **Payout and gate:** $800 base; "Clean box" (0 contact) +$250; "No civilians touched" +$100; "Under 2:00" +$100. Unlock: Act 3, `done.duke`. Medals: silver = clean box; gold = clean box under 1:30.
- **Dialogue samples:**
  - Rick: "Sandwich play. I'm bread. Dave's bread. You're the meat. No. Wait. They're the meat."
  - Dave: "I'm always bread."
  - Rick: "Left wing, close the gap! Close it! Like a fall-back line on a corner kick!"
  - Rick (whistle sound): "That's a civilian, that's a yellow card, eyes up!"
  - Thief driver: "Why are there three minivans?" Passenger: "It's a coordinated minivan attack, Dante!"
  - Rick: "They're slowing. Hold the box. Hold it. Hold... that's a W."
  - Dave: "Nobody's even scratched. My insurance guy is going to send me a fruit basket."
  - Thief (running): "You can't catch me, I do cardio!" You (later, zip-tying): "So do I. Badly. But a lot."
  - Rick: "Bring it in. Hands in. 'Box' on three."
- **Size:** L (formation AI). **Depends on:** `chaseUpdate` on main, car-damage, a formation-slot helper (`HT.CarAI.slot`, specified in 4.2's TAIL module as a shared "relative target" function).

### 2.6 *Good Fences*: multi-stage heist to recover stolen goods (Gary, strand 2/2)

- **Giver:** Gary, at home over a laptop of spreadsheets. **Location:** `site storage` (Discount Storage Unlimited, Industrial Way south).
- **Premise:** Gary has matched 1,140 stolen items from three neighbourhoods to one place: a storage-unit lot run by The Wholesaler's fence. It's guarded, it has cameras, and it's full of other people's lawnmowers. This one gets planned.
- **Beat sheet (four stages, each a [CP]):**
  1. **Scope** (stealth-light): visit the storage lot as a "customer" (a [SOCIAL] check with the clerk: rent a unit, $20). Walk the rows, photograph 4 things [PHOTO]: the camera positions, the gate keypad, the guard schedule board, and unit 47 (the fence's). Each photo you get unlocks an **option** in stage 3.
  2. **Gear** (errands in the world, any order, all optional, each opens a plan option):
     - **Linda's extension ladder** (knock on her door in Maple. She wants it back by Sunday, and you carry it to your car with `wmCarry`) → *roof entry* option.
     - **Walkie-talkies** from Hank's ($60, a new `supplies` item) → crew callouts during execution: enemies are marked on the minimap when any crew member sees them.
     - **Benny's truck** (ask at the depot; needs `done.benny`) → a *distraction* option: the jingle draws the guards to the gate.
     - **A box truck** (borrow from Sal; needs [TOW] or the workvan) → *haul all of it* option: 2× recovered items.
     - **Bolt cutters** (Hank's, $35) → *fence cut* option.
  3. **Plan** ([ROLES] card): choose an **entry** (gate keypad code if photographed, roof via ladder, or fence cut), then assign **Driver** (stays with the getaway truck), **Lookout** (on overwatch; warns you 4 s early), **Muscle** (handles the guards first) and **Talker** (keeps the clerk busy at the office). Each crew member is better at some roles (see 4.5).
  4. **Execute**: at night. Enter by the chosen route. The guards' [STEALTH] cones and the cameras (fixed cones that sweep 60°) are live. In unit 47, **carry** items (`wmCarry`) to the truck: 12 items, each with its owner's name tag. When the alarm trips (stealth broken, or at a scripted 75% if you don't loop the camera feed with Gary at the office laptop), it becomes **a hold-out until the truck is full**, then a **getaway** (the crew drives the truck. You drive escort while 2 enemy cars chase; `chaseUpdate` reversed, so the enemies are the chasers).
- **Core new mechanic:** **heist structure**: scope → gear → plan → execute, where earlier choices change later options.
- **Reuses:** [PHOTO], [SOCIAL], [ROLES], [STEALTH], `wmCarry`/`wmLoad`, `BORROW`, `HT.CarAI` (enemies chase you: `follow` with the player as the target), the wave `director` for the alarm hold-out, Hank's `supplies`, Benny's truck model from *Brain Freeze*.
- **Fail states:** the truck is destroyed; you go down during execution (crew revives work as usual); the clock (night ends at 5:00 game time, 9 real minutes) runs out. Each stage retries from its own [CP], so the plan survives a failure.
- **Trust / zip-tie twist:** each item gives +0.5 trust to the neighbourhood it came from, delivered at a **Lost & Found Sunday** event at the church afterwards (cutscene card: neighbours collecting things). The fence himself can be zip-tied if found in the office (+5): he gives up The Wholesaler's festival plan (the hook into the finale). Full stealth (no alarm) is +8 and a home line from Gary that's nearly emotional.
- **Payout and gate:** $1,600 base; +$40 per item; "Ghost" (no alarm) +$500; "Returned Linda's ladder by Sunday" +$50 and +1 Maple trust; "Under budget" (gear spend under $100) +$100. Unlock: Act 3, `done.talk` (*Small Talk* reveals the warehouse). Medals: silver = 12/12 items; gold = 12/12 as a ghost.
- **Dialogue samples:**
  - Gary: "I made a spreadsheet. Then I made a pivot table. Then I cried a little. Then I found the warehouse."
  - Linda: "It's a twenty-eight foot ladder. You're bringing it back. Sunday. Not Sunday-ish."
  - Hank: "Walkie-talkies. Range of two miles, or one mile if you're near the river, or zero if you're Doug."
  - Doug: "Breaker breaker, this is Hawk. Over." Gary: "We're not doing call signs." Doug: "Hawk out."
  - Clerk: "You want a ten-by-ten or a ten-by-twenty?" You: "Whichever's nearest unit forty-seven."
  - Rick (lookout): "Guard turning your way in three, two..."
  - Gary (at the laptop): "I've looped the camera feed. It's showing an empty corridor and, for some reason, a cat."
  - Dave (muscle): "I've got the big guy. We're just... hugging now. It's fine."
  - Gary: "Item thirty-one: Mrs. Patel's leaf blower. Item thirty-two: also Mrs. Patel's leaf blower. She has two."
  - Benny (distraction): "Free cones at the front gate! Free cones!"
  - Gary (at the end): "We returned eleven hundred and forty items. I'm going to frame the pivot table."
- **Size:** L. **Depends on:** [ROLES], [STEALTH], [PHOTO], [SOCIAL], [CP], `wmCarry` (riverside-jobs), and Benny (riverside-jobs).

### 2.7 *Grand Opening*: infiltration without firing a shot (Pastor Dee, strand 1/2)

- **Giver:** Pastor Dee, at `g_dee`. **Location:** `site pawn` (Cash-4-Yer-Stuff, the mart block on Main St).
- **Premise:** A pawn shop that buys "no questions asked" is having a grand opening with balloons, a DJ and free hot dogs. Dee needs its buy ledger, which is in the back office and full of names of kids being paid to steal. Go in. Don't draw. Look like you belong. You won't.
- **Beat sheet:**
  1. **Disguise:** pick 1 of 3 from the van (each changes which [SOCIAL] checks are easy): **"Local Press"** (lanyard, camera: you can take photos openly), **"DJ's Cousin"** (a cap backwards: staff areas are easier, and everyone wants to talk about music), **"Mustache"** (just a fake mustache: everybody can tell, and nobody says anything).
  2. **Mingle:** the floor has 14 guests, 3 staff and 1 manager. The staff-only door is watched. Gain **access** by finding the right conversation: the DJ wants a song request (your choice of dad songs), a staff member needs help with a balloon arch, and the manager wants a photo with the "press".
  3. Every conversation is a short [SOCIAL] exchange (3 choices, one of which is a dad joke). Picking well raises **cover**. Lingering where you shouldn't be, running or picking up items lowers it.
  4. **Politeness buffer:** when someone notices something odd, they **don't call you out right away**. A "politeness" timer (4–8 s, shown as a "…" bubble) lets you fix it: walk away, start small talk, or compliment their shoes.
  5. Back office: photograph the ledger pages (3 shots) or take the book (heavier: cover −30%, but it counts double).
  6. Leave through the front door **during the raffle** (a scripted crowd moment).
- **Core new mechanic:** [SOCIAL] (disguise, cover, conversations, politeness buffer) with **guns locked**.
- **Reuses:** `HT.AI` cones for staff awareness via [STEALTH] (suspicion is driven by cover instead of visibility), [PHOTO], civilian crowd NPCs (`HT.People` neighbour models, standing and walking routines), `HUD.prompt`.
- **Fail states:** cover 0 → "Sir, I'm going to have to ask you to leave." The job soft-fails to [CP] "back at the van, new disguise". Drawing a gun is disabled and the attempt plays a line. There's no combat state at all.
- **Trust / zip-tie twist:** no zip-ties. The ledger names 9 kids. Dee doesn't hand it to anyone: she visits their families. Each name gives +1 Riverside trust when you finish *Crossing Guard* (because those kids are in the line). The shop closes within a week. The storefront becomes **Ramos Bakery** (a visible change).
- **Payout and gate:** $900 base; "Never questioned" (cover never below 40%) +$250; "Ledger and pictures" +$100. Unlock: Act 2, `done.dee`, `trustR ≥ 30`. Medals: silver = no politeness timer triggered; gold = done in under 5:00 with the mustache.
- **Dialogue samples:**
  - Dee: "No guns, no shouting, and if anyone asks, you're with the Riverside Gazette. We don't have a Gazette. Make one up."
  - Guest (to Mustache): "Love the... uh. Great event."
  - Staff (politeness bubble): "Is he... is that... no, it's fine. It's fine. Probably fine."
  - You (compliment option): "Those are great shoes. Are those orthotic?" Staff: "...They are, actually!"
  - DJ: "Any requests?" You: "Do you have anything from before 1998?" DJ: "...I have one song."
  - Manager: "Press! Get one of me with the giant scissors!" You: "Say 'no questions asked'!"
  - Manager: "No questions asked!" (shutter)
  - Staff: "You're not supposed to be back here." You: "Balloon emergency." Staff: "...Oh no. Go, go."
  - Guest (to Mustache): "Hey, didn't you coach my kid in—" You: "No." Guest: "Your mustache is crooked." You: "It's a style."
  - Dee: "You did that without firing a shot. I'm adding you to the prayer list. The good one."
- **Size:** L (the conversation content is most of it). **Depends on:** [SOCIAL], [PHOTO], [STEALTH] (shared detector), [CP].

### 2.8 *Higher Ground*: overwatch (Doug, strand 2/2)

- **Giver:** Doug, at `g_doug` (Maple). The job is in Riverside. **Location:** `site roof` (Community Center roof) overlooking Main St, the basketball court and the church.
- **Premise:** A witness (Mr. Ferreira, who saw the Duke's crew stash converters) wants to give a statement at the church, 300 m away. The crew walks him there. You're on the roof with Doug's old hunting rifle and a bag of beanbags.
- **Beat sheet:**
  1. Climb the ladder (`L` interactable). The roof is a fixed vantage: you can move along its 20 m edge and crouch behind a parapet.
  2. Rosa, Gary and the witness walk a scripted route (a path along Main St → 3rd St → past the court → church steps) at walking pace. They stop when there's a threat.
  3. Threats come in staged waves of 2–4: hoodies on rooftops, a car that slows down, a guy behind a dumpster. **Spot** them first: they're tagged when you hold the scope on them for 0.6 s ("Doug: mark"). Then deal with them:
     - **Beanbag** (loaded rounds `bean`): a body hit at any range = they drop and surrender. Gary walks over and zip-ties them.
     - **Hunting rifle**: a lethal option that's allowed but costs trust, and Doug is disappointed.
     - **Spook**: a shot near them (within 2 m) makes 40% of threats flee. A miss counts as a spook.
  4. One threat is a **decoy**: a kid with a toy water gun. Shooting him at all = −10 trust and a fail-adjacent line. Doug warns you only if you scope him for 1 s ("That's a Soak-o-Matic. Hold fire.").
  5. The escort reaches the church. The last wave is a car: shoot its tyres (new hit zone on AI cars: 4 tyres, 1 hit each) so it stalls before it reaches the steps.
- **Core new mechanic:** **overwatch**: a fixed vantage, a moving escort that reacts to threats, target identification, and non-lethal shot choice.
- **Reuses:** the `hunter` scope and `beanbag` weapons (`opt.nonlethal`), surrender, `HT.AI` (threat agents with `investigate` paths), crew zip-ties, AI cars (`HT.CarAI.follow`), and the escort's waiting logic from *Brain Freeze* (rewritten for walking).
- **Fail states:** the witness drops to 0 HP (he goes down, and Rosa revives him once; a second time is a fail); the escort is pinned for 30 s; you shoot the decoy (an instant fail: "Okay. Let's take a breath and start over.", [CP]).
- **Trust / zip-tie twist:** each threat dropped with a beanbag and zip-tied gives +4 Riverside trust. A hunter kill is −10 and Doug says "Rule one, Hawk." "All non-lethal" gives +8.
- **Payout and gate:** $900 base; "Bean counter" (all non-lethal) +$300; "Witness unscathed" +$150. Unlock: Act 2, `done.rosa` (Rosa is the escort). Medals: silver = all non-lethal; gold = all non-lethal with the witness above 90 HP.
- **Dialogue samples:**
  - Doug: "My father's rifle. Never fired it at a person. Today's not the day either. Beanbags are in the green box."
  - Doug: "Breathe in. Breathe out. Squeeze at the bottom. Like a hug for a really far away man."
  - Rosa (radio): "We're stopping at the corner. Tell me it's clear. Don't just say 'probably'."
  - You: "Probably." Rosa: "Unbelievable."
  - Doug: "Rooftop, two o'clock. Red hat. He's got a bag. Hold... beanbag him."
  - Hoodie (hit): "OW. Okay. Okay! I'm out. I'm SO out."
  - Gary (arriving to cuff): "Hi. I'll be your zip-tie technician today."
  - Doug: "That's a Soak-o-Matic. That's Kevin. Hold fire. Kevin, go home."
  - Kevin: "Aww."
  - Mr. Ferreira: "I've lived on this street forty years. That's the first time I've felt safe walking it."
  - Doug: "Hawk out." Gary: "We're still not doing call signs."
- **Size:** M. **Depends on:** AI-car tyre hit zones (a small addition to `HT.CarAI`), the walking escort helper (shared with *Crossing Guard*), [CP].

### 2.9 *Cone Zone*: roadblock and convoy ambush (Earl, strand 1/2)

- **Giver:** Earl, at `g_earl`. **Location:** Industrial Way (x100, z20–77), between Route 9 and the river road.
- **Premise:** The box truck from *Following Distance* runs a stolen-goods convoy to the highway every Thursday: one truck and two escort cars. Earl knows the timetable because he used to know every timetable. You have **90 seconds and a pile of traffic cones**.
- **Beat sheet:**
  1. **Setup (90 s):** a top-down "planning" camera (the full-map view, zoomed onto Industrial Way) and the dad on foot with a stock of props: 12 cones, 3 sawhorses, 1 "ROAD WORK AHEAD" sign, 2 flares, plus **any cars you drive in and park** (borrowed or your own). Place props by carrying them (`wmCarry`, 2 cones per trip) or with the planning camera (tap a road tile to drop a prop where the dad is standing; the dad walks there).
  2. **Rules for the convoy AI:** cones and sawhorses slow a car (forced to 6 m/s through a tile with a cone); a "ROAD WORK" sign makes the convoy **reroute** onto a different road-graph edge if one exists (so you can funnel them); parked cars block completely (the convoy stops 10 m short); flares make them stop and the escorts get out.
  3. **The convoy arrives:** the escorts react to the roadblock. Fully stopped → the escorts get out and fight (a short street fight). Slowed but not stopped → it becomes a chase (`chaseUpdate`) of the truck alone.
  4. **Driver surrender:** the truck driver is unarmed. Reach his door → he gives up.
  5. Open the truck: 20 stolen catalytic converters, a crate of packages and a bewildered goat (Earl: "That's Mrs. Lindqvist's goat. Don't ask.").
- **Core new mechanic:** **placement**: a timed build phase with props that change how AI drivers route and slow down.
- **Reuses:** `HT.Roads` (the reroute is a graph edge cost that a sign sets to ∞), `HT.CarAI.follow` with a per-tile speed cap (`ctx.speedCap(x,z)`), `wmCarry`, `BORROW` (parked borrowed cars count as blockers, with the usual return trust), the full-map view from `HUD.minimap` as the planning camera, `chaseUpdate` as the fallback, foot combat, zip-ties.
- **Fail states:** the convoy gets past the bridge with the truck; your crew goes down. You can't fail the setup: whatever's placed when the clock hits 0 is the roadblock.
- **Trust / zip-tie twist:** a fully stopped convoy where everyone surrenders without a shot (a roadblock that's "airtight", 2 cars plus flares) gives +8 Riverside trust and a 0-shot medal. Each borrowed car returned with ≤ 10% damage is the usual +1. Cones left on the road after the job: −1 (Earl: "Pick up your cones.").
- **Payout and gate:** $950 base; "Airtight" (convoy stopped without a chase) +$250; "Goat returned" +$50 (walk the goat to Mrs. Lindqvist on Ash St). Unlock: Act 2, `done.tail` and `done.benny`. Medals: silver = airtight; gold = airtight with no shots fired.
- **Dialogue samples:**
  - Earl: "Thursday, 3:52. Industrial Way. Never late. Like me. I hate that I respect it."
  - Earl: "Ninety seconds. Cones. Sawhorses. Your minivan. Whatever's lying around. Make a wall."
  - Gary: "I'm going to put a cone on a cone. For height."
  - Dave: "Is this a legal roadblock?" Earl: "It's a suggestion. A very orange suggestion."
  - Escort driver: "Road work? On a Thursday? Nobody does road work on a Thursday."
  - Other escort: "Just drive through the cones, man." First: "My mom raised me to respect cones."
  - Truck driver: "I just drive the truck. I don't even know what's in it." Earl: "It's a goat." Driver: "WHAT."
  - Mrs. Lindqvist: "Pepper! Oh, Pepper. Did the bad men feed you?" Goat: (bleat).
  - Earl: "Pick up your cones. Leave it better than you found it."
- **Size:** M. **Depends on:** a speed-cap and edge-block hook in `HT.CarAI`/`HT.Roads` (small, owned by this job's worker), `wmCarry`, [CP] (setup and arrival).

### 2.10 *Heavy Lifting*: defend while something finishes (Ms. Okafor, Rosa strand 2/2)

- **Giver:** Ms. Okafor (the Okafor twins' mom; her bikes came back in *Exact Change*), on her stoop on 3rd St. **Location:** 3rd St between Ash St and Mill St (x188, z34–48), a rowhouse front.
- **Premise:** Ms. Okafor's cousin's family, the Adeyemis, are moving into the empty rowhouse next door. It's the first family to move *into* Riverside in two years. The street crew who use that house as a hangout aren't happy about it.
- **Beat sheet:**
  1. A rental moving truck parks on 3rd St. **The unload bar** (0–100%) fills while movers (the Adeyemis plus 2 neighbours) carry boxes from truck to door, 1% per box. That's slow on its own: about 4 minutes at baseline.
  2. **You can carry boxes** (`wmCarry`, a box is "heavy": walk only, no weapon) to add 1% per box and speed it up. Your crew can be told to carry as well (a radio command: "Lift!", which takes crew off defence) or to defend ("Cover!").
  3. Hostiles come in **pressure waves** from both ends of the street and the back alley. If a hostile reaches the truck, **the movers stop** (the bar freezes), and they won't carry while anyone hostile is within 15 m of the truck.
  4. A **couch** stage at 60%: 2 people needed. You and a crew member carry it together (hold E in sync, a cooperative carry that steers like a slow car). The couch blocks one side of the street as cover while it's set down.
  5. At 100% the family is moved in. The crew who hung around stop showing up.
- **Core new mechanic:** **a defence where the objective's progress depends on how much you stop fighting to help**, and a 2-person carry.
- **Reuses:** `AI.director` waves (the defend point is the truck), `wmCarry`, crew radio commands (a small addition to `AI.ally`: `role:'lift'|'cover'`), surrender, zip-ties, and the furniture models from `js/home.js` (boxes, a sofa).
- **Fail states:** a mover goes down (they're NPCs with 60 HP; hostiles avoid targeting movers deliberately, but crossfire happens); the truck is wrecked (HP 400, hit by enemy fire).
- **Trust / zip-tie twist:** +2 Riverside trust per surrendered hostile zip-tied. One of the hostiles is the older brother of a kid in Dee's youth group. If he's zip-tied rather than downed, he comes back at the end and carries the last box (+5 trust, a line). **Households +1** (the Adeyemis appear on that porch for the rest of the game).
- **Payout and gate:** $1,000 base; "Helping hands" (you carried ≥ 25 boxes) +$200; "Not a scuff on the couch" +$100. Unlock: Act 2, `done.rosa`, `trustR ≥ 40`. Medals: silver = you carried 25; gold = under 3:30 total.
- **Dialogue samples:**
  - Ms. Okafor: "First family in two years. They're bringing a piano. I told them not to bring a piano."
  - Mr. Adeyemi: "Box says 'kitchen'. Everything says 'kitchen'. My wife packed."
  - Rosa: "Lift with your legs. I'm not doing a back on a Saturday."
  - Gary: "I'll carry the light boxes. The ones marked 'pillows'. Strategically."
  - Hostile: "This is our block!" Dave (carrying a lamp): "It's everybody's block! Coming through!"
  - You (radio): "Lift!" Rick: "Lifting!" (a beat) "Cover!" Rick: "Covering! Make up your mind!"
  - Mrs. Adeyemi: "Is that couch going to fit?" You: "...No. But it's going in."
  - Older brother: "...Need a hand with that last box?"
  - Rosa: "He's a good kid. He just needed somebody to hand him a box."
  - Mr. Adeyemi: "We'll have you all over. When we find the plates. In a box marked 'kitchen'."
- **Size:** M. **Depends on:** `wmCarry` (riverside-jobs), the `AI.ally` role hook, the 2-person carry (in the job file).

### 2.11 *Crossing Guard*: on-foot escort (Pastor Dee, strand 2/2)

- **Giver:** Pastor Dee, at the church steps. **Location:** from the church (`g_dee`, x165, z19) along 2nd St to the rowhouses on Mill St (x172, z48), crossing Main St and Ash St.
- **Premise:** A turf flare-up has started around 2nd St just as the youth group lets out. Eleven kids live south of it. Dee's van is in the shop. You have a reflective vest and a stop sign.
- **Beat sheet:**
  1. Put on the vest. Take the **stop sign** (a melee item in place of a gun: block with RMB, which absorbs hits and pushes back; the sign is a shield, not a weapon).
  2. Kids form a **follow chain** (each kid follows the one ahead at 1.2 m, the first follows you at 2 m; `AI.ally` follow with a chain target).
  3. **Crossings:** at each of 3 intersections, hold up the sign (hold RMB) to stop traffic (AI cars brake for it within 25 m), then wave the kids across (hold E). Cars that don't stop give you a ramp of 3 s to step in front.
  4. **Turf trouble:** 2 groups from different crews (from `work/riverside-heat`'s crews) are posturing on 2nd St. The kids freeze if a gun comes out within 20 m. You **can't draw** while escorting. Options: route around (a longer path via 3rd St with more crossings), talk them down ([SOCIAL] check: "There are kids here. Can we not."), or block with the sign while Rick, called in, takes care of it.
  5. Drop each kid at their house: one by one they peel off to their door (a parent waves). The last kid is the courier's little sister from *Fellowship Hall*.
- **Core new mechanic:** **on-foot escort of a chain of followers**, traffic control and no-gun de-escalation.
- **Reuses:** `AI.ally` follow (repurposed for kids), `HT.CarAI` (AI cars brake for a "stop" obstacle), the free-roam crews and heat (`frUpdate`'s crews; the job sets heat to 0 and forbids escalation unless you draw), [SOCIAL] for the talk-down, crew call-in.
- **Fail states:** a kid hit by a car (they never take damage: the car stops 1 m short and the job fails with "Too close. Let's go back."); a kid separated by more than 30 m for 10 s; drawing a weapon (disabled, but a stray shot from the crews ends the job if it lands within 10 m of a kid: that's a soft fail to [CP]).
- **Trust / zip-tie twist:** every kid home gives +1. "Nobody even raised their voice" (talk-down succeeded at both groups) +6. Each kid named in the *Grand Opening* ledger who gets home gives +1 more. **Households +1** (the crossing gets a permanent crossing guard NPC, Mr. Ferreira from *Higher Ground*, if done).
- **Payout and gate:** $700 base; "All eleven" +$200; "Talked it down" +$150. Unlock: Act 2, `done.dee`. Repeatable at a lower payout. Medals: silver = no detour; gold = no detour, no call-in.
- **Dialogue samples:**
  - Dee: "Vest. Sign. Smile. If the sign doesn't work, smile harder."
  - Kid: "Are you a cop?" You: "I'm a dad." Kid: "That's worse."
  - Kid: "Can I hold the sign?" You: "No." Kid: "Can I hold it later?" You: "...Maybe."
  - Driver: "Is that a real stop sign?" You: "It's real enough for you, Gary." Gary (driving): "Sorry! Sorry."
  - You (talk-down): "Fellas. Kids. Here. Two minutes, then you can go back to whatever this is."
  - Crew member: "...Fine. Two minutes." Other: "Hey. Is that Malik? Malik, get home."
  - Kid: "My mom says you guys are the minivan gang." You: "We prefer 'carpool'."
  - Parent: "He's home early. Is everything okay?" You: "Everything's perfect."
  - Last kid: "My brother used to do the laundromat thing. He works at the auto shop now." You: "I know."
  - Dee: "Eleven kids home. Nobody shouted. Somebody tell the Lord, He'll want to hear it."
- **Size:** M. **Depends on:** the walking escort helper (shared with *Higher Ground*), [SOCIAL] (one check type), the free-roam crews (`work/riverside-heat`), a sign shield item (small: a `WEAPONS` entry with `melee:'block'`).

### 2.12 *Minivan Roundup*: vehicle recovery (Coach Rick, strand 2/2)

- **Giver:** Rick, with Marcy (carpool coordinator) at Linden Park. **Location:** `site parkride` (Route 9 Park & Ride), and the Maple Heights driveways the vans belong to.
- **Premise:** Five minivans, the entire Maple Heights soccer carpool fleet, were stolen in one night and parked among the commuter cars at the Park & Ride while someone arranges buyers. Tournament's at noon.
- **Beat sheet:**
  1. Arrive. 24 parked cars, 5 of them the fleet (marked with a team sticker you have to find: walk the rows, it's highlighted at 4 m). 3 guards walk loops ([STEALTH] cones, lightly armed).
  2. Each van: get in, it won't start (the thieves pulled the key fob relay). Either **hot-swap a relay** (a quick hold-E minigame, 2 s, and noisy), or **tow it** [TOW].
  3. **Convoy out:** recover 2 vans, then the crew drives the others. Each crew member can drive one van in a convoy behind you (`HT.CarAI.follow` with the player's car as the path head; a convoy is a list of followers 8 m apart). Lose a convoy car (more than 40 m behind for 8 s) and it pulls over and waits.
  4. The gate gets closed when the alarm trips. Ram through it (car damage) or open it from the booth.
  5. Thieves' pursuit car (one sedan) chases the convoy back to Maple: a reverse chase where you protect the line.
  6. Deliver each van to its family's driveway (5 addresses). The tournament starts on time.
- **Core new mechanic:** **AI convoy following the player** and **fleet logistics** (how many trips; who drives what).
- **Reuses:** [STEALTH] (light), [TOW] (optional), `HT.CarAI.follow` (convoy), `chaseUpdate` (reversed: the enemy chases), car damage, `BORROW` (the vans are neighbours' cars, so the trust maths apply), GPS.
- **Fail states:** fewer than 3 vans home by noon (a 10 min timer); your car breaks down; 2 crew cars wrecked.
- **Trust / zip-tie twist:** +3 Maple trust per van home, scaled by condition. Guards who surrender and are zip-tied +2 each. "Nobody saw us" (no alarm) +5.
- **Payout and gate:** $1,100 base; +$100 per van; "Every van, every hubcap" +$250. Unlock: Act 3, `done.brake` (Rick's strand). Medals: silver = 5/5; gold = 5/5 with no alarm.
- **Dialogue samples:**
  - Marcy: "Five vans. Five! I have a spreadsheet of who drives on which Saturday and now it's just a spreadsheet."
  - Rick: "Sticker on the back window. Little soccer ball, says 'Maple Heights Hornets'. Find the bees."
  - Dave: "They all look the same. They're all silver. Why is every minivan silver?"
  - Gary: "Silver hides dirt. It's a known fact. I read it on a forum."
  - Guard: "Why are there four dads checking every minivan?" Other guard: "It's a Park and Ride. Dads ride."
  - You (relay minigame): "Red to red. Blue to... there's two blues."
  - Rick (convoy): "Tight formation! Like a warm-up lap!"
  - Dave: "I'm in the Hendersons' van. It smells like goldfish crackers. All of them. Ever."
  - Marcy: "11:58. You are all getting orange slices."
- **Size:** M. **Depends on:** a convoy helper (`HT.CarAI.convoy`, 4.2), [STEALTH] (light), [TOW] (optional), [CP].

### 2.13 *The Grass Is Greener*: lawnmower grand prix, a race and trust event (Big Dave, strand 1/2)

- **Giver:** Big Dave, at `g_dave`. **Location:** Linden Park (`site dave`), turned into a cone course on Saturday afternoon.
- **Premise:** The Maple Heights Ride-On Mower Grand Prix is back after six years. It's for charity. Riverside has entered a team for the first time, and somebody on that team is getting threatening texts telling them to throw the race.
- **Beat sheet:**
  1. **Pick a mower** (3 stock options with different top speed, turning and grip; a garage unlock for winning).
  2. **Time trial** (qualifying): 1 lap alone. Gates, cones (hitting a cone is +1 s), a hay-bale chicane.
  3. **The race:** 3 laps, 6 racers (AI mowers using `HT.CarAI.follow` on a closed racing line with per-AI skill). Overtaking is allowed. **Bumping** is allowed but scored by the marshal (Gary with a clipboard): 3 deliberate bumps = disqualified.
  4. **The sabotage beat:** at lap 2, the Riverside racer (Tasha's dad, Marcus) has his mower's fuel line cut by a pair of local hustlers who bet on the race. Choice: **keep racing** (you win, he finishes last), or **stop at the pit**, lend him your spare part (the race stops for you both for 10 s), then catch up. If you stop, the hustlers bolt from the pit area: a short foot chase across the park (no guns at the event), and the tackle is a zip-tie.
  5. Podium. If you stopped to help, the crowd chants your name whatever place you got.
- **Core new mechanic:** **racing**: checkpoints, a racing line, AI racers, a lap timer, and a moral choice in the middle of the race.
- **Reuses:** the driving physics (`HT.CarAI.drive` with a new `mower` entry in `VEH`: `max` 9, `boostMax` 11, `turn` 2.4, `grip` 7), AI cars with `follow` (looping path), car damage (mowers dent), `HUD` timer, the foot chase and tackle (the surrender from `hurtEnemy` with `nonlethal`), the crowd NPCs from the riverside-heat `neighbours` system.
- **Fail states:** none for the story (any finish counts). Disqualified → a lighter payout and Dave's sad face.
- **Trust / zip-tie twist:** this is the first **cross-neighbourhood trust event**: +3 Maple and +3 Riverside for finishing; +6 both if you stop to help Marcus; zip-tie both hustlers +2 each. Marcus becomes a crew contact (a phone line in the Act 3 finale).
- **Payout and gate:** $500 base (charity matching); +$300 for 1st, +$150 2nd, +$75 3rd; "Sportsmanship" (you helped Marcus) +$200 regardless of place. Unlock: Act 1, after `done.rick`. Repeatable as a **time trial** for the leaderboard (section 3.3). Medals: silver = podium; gold = win after helping Marcus.
- **Dialogue samples:**
  - Dave: "Six years. Six years since the last Grand Prix. Since the Incident."
  - You: "What incident?" Dave: "We don't say it out loud. Gil knows."
  - Gary (marshal): "One. That's one bump. I'm writing it down. In pen."
  - Marcus: "First time over the bridge for a race. The kids made me a cape. I'm wearing the cape."
  - Announcer (Barb on a megaphone): "And Big Dave takes the hay-bale chicane like a man who's eaten hay before!"
  - Hustler (to Marcus): "Shame if your mower had a... mower problem."
  - You (at the pit): "Here. Spare fuel line. I always carry a spare. Don't ask why."
  - Marcus: "You're losing the race for this." You: "It's a lawnmower race, Marcus."
  - Dave: "He stopped. He STOPPED. That's the most Maple Heights thing I've ever seen."
  - Barb: "And the trophy goes to... everyone's a little bit of a winner. No, the trophy goes to one person. Hold on."
- **Size:** M (needs a mower model, or a re-dressed `hatch`; see the decisions in section 0). **Depends on:** a `VEH.mower` entry, a race-line helper (a looping `follow` path with a checkpoint list; small, in the job file).

### 2.14 *Sign of the Times*: sabotage at night (Sal, strand 2/2)

- **Giver:** Sal, at Dad's Auto (after *Hitch Happens*). **Location:** `site millshop` (Mill St Auto Recovery, Riverside block 3,3), at night.
- **Premise:** The fake tow company from *Hitch Happens* came back under a new name. Its 4 tow trucks go out at dawn. Sal wants them to **not** go out, without anyone getting hurt, and without breaking anything that can't be pumped back up.
- **Beat sheet:**
  1. Night (decision 4 in section 0). Park 2 blocks away. Infiltrate on foot over the back fence (a vault point) or through the gate.
  2. 4 guards on patrol routes ([STEALTH] cones, flashlights = longer, narrower cones at night: 26 m, 25°), a dog (hearing only: 12 m radius for walking, 4 m crouched; a dog that hears you barks, and the nearest guard investigates).
  3. **Sabotage objectives** (in any order):
     - Let the air out of 4 trucks' tyres (2 tyres each; hold E 2 s per tyre, crouched; a soft hiss is a 3 m noise).
     - Swap the yard sign to the one Sal printed ("UNDER NEW MANAGEMENT · CALL SAL · HONEST TOWING"). Carry the sign from the van (`wmCarry`, a big item: slow, no crouch).
     - Optional: get the dispatch ledger from the office ([PHOTO] or carry it).
     - Optional: put the dog's chew toy in the dog's bed (the dog stops barking for the rest of the job: "good boy").
  4. Exfil without being seen. If you're spotted, it escalates to a fight (decision 2) and the payout drops, but the job continues. The guards are the "attendants" from before, and they recognise you ("You again?").
- **Core new mechanic:** **full stealth**, with night vision cones, noise and interaction noise; the first job built around [STEALTH].
- **Reuses:** [STEALTH], `HT.AI` (`investigate`/`search` modes, already present), `world.noises` (interaction noises), `wmCarry`, vault (`docs/MOVEMENT.md`), car models (tyres deflate: a new visual on `HT.Vehicles`, body sinks 0.08 m at the wheel), the night mood.
- **Fail states (soft):** all guards alerted at once → the trucks roll out → the job fails to [CP] "back at the van" (decision 2); you go down.
- **Trust / zip-tie twist:** a ghost run (never spotted) gives +8 Riverside trust. A guard you sneak up behind can be **zip-tied silently** (hold E 2 s from behind while unseen: a "takedown" that's just very assertive cable management), +3 each and no noise. The dog is never harmed (it can't be targeted).
- **Payout and gate:** $1,000 base; "Ghost" +$400; "Good boy" (the dog toy) +$50; "Ledger" +$150. Unlock: Act 3, `done.tow`. Medals: silver = ghost; gold = ghost with no zip-ties, so you never touched anyone.
- **Dialogue samples:**
  - Sal: "Valve core tool. Quarter turn. Tsssss. That's the sound of justice."
  - Sal: "Don't slash them. We're not monsters. We're a full-service shop."
  - Guard: "You hear hissing?" Other guard: "That's the radiator. It's always the radiator."
  - Guard (flashlight): "Somebody back there? ...It's a raccoon. Big raccoon. In cargo shorts."
  - Guard (zip-tied from behind): "Oh, come ON."
  - You (whisper): "Shh. Shhh. Good boy. Who's a good boy. Not your owner."
  - Dog: (happy chewing)
  - Guard (seeing the sign at dawn): "'Honest Towing'? ...Who's Sal?"
  - Sal: "Four trucks with flat tyres. Guess who they'll call. Guess who's honest. Guess who has a payment plan."
- **Size:** M (stealth is the shared system). **Depends on:** [STEALTH], the night mood, [CP], a tyre-deflate visual on `HT.Vehicles`.

### 2.15 *Small Talk*: interrogation by awkward dad conversation (Gary, strand 1/2)

- **Giver:** Gary. **Location:** Big Dave's backyard on Linden Ave (a Maple house lot; no new site, the yard is staged with props).
- **Premise:** A lookout zip-tied at *Fellowship Hall* (or *The Duke*, whichever you've done) won't say where the stolen goods go. He's 19, scared and hungry. Dave fires up the grill. You talk.
- **Beat sheet:**
  1. A sit-down scene: a patio table, the lookout (Tre), Dave at the grill behind you, Gary taking notes.
  2. **Conversation minigame:** each round, 3 lines to choose from in different registers (**Dad Joke**, **Real Talk**, **Overshare**), plus a **"Grill"** button once per scene (Dave brings food).
  3. Two meters: **Rapport** (0–100) and **Awkward** (0–100). Rapport goes up with the right register for Tre's current mood (bored → dad jokes land, scared → real talk lands, defensive → oversharing disarms). Awkward goes up for wrong picks. At Awkward 100 the scene resets with Dave: "Okay, who wants a burger and a fresh start."
  4. **Tells:** Tre's body language (looks away = defensive, taps foot = bored, arms crossed = scared) is animated and also written in the subtitle in brackets for accessibility.
  5. At Rapport ≥ 80 he gives up the **storage warehouse** (unlocks *Good Fences*) and asks if he can stay for a second burger. At Rapport ≥ 95 he also mentions **The Wholesaler** by name (finale foreshadowing).
- **Core new mechanic:** **a dialogue minigame** with register choice, mood reading and twin meters (built on [SOCIAL]'s conversation engine).
- **Reuses:** [SOCIAL] conversation engine, `#cBrief`-style cards, the people models (`HT.People` with emote poses: `pose(d,dt,{mode:'sit'})` exists for family), Dave's grill prop from *Block Party*, the subtitle system.
- **Fail states:** none hard. Awkward resets the round (only medal pressure).
- **Trust / zip-tie twist:** this is the zip-tie paying off: only possible because you cuffed instead of shooting earlier. +4 Maple and +4 Riverside on success. If Rapport hits 100, Tre gets a job at the bike library (Earl), **households +1**.
- **Payout and gate:** $300 base; "No awkward resets" +$150. Unlock: `done.dee` or `done.duke`, and `prog.cuffed ≥ 10` (the game checks that you're someone who zip-ties). Medals: silver = no resets; gold = Rapport 100 in ≤ 8 lines.
- **Dialogue samples:**
  - Gary: "He's nineteen. He's scared. He's eaten nothing but gas-station taquitos for a week. Be gentle."
  - Dave: "I'll be over here. Grilling. Menacingly. Medium-rare."
  - You (Dad Joke): "You know why the warehouse can't keep secrets? Too many... unit... walls." Tre: "...what."
  - You (Real Talk): "Nobody's calling anybody. We just want Mrs. Patel's leaf blower back."
  - You (Overshare): "I cried at a car commercial last week. The dad taught the kid to drive. Anyway."
  - Tre: "...Which commercial?" You: "The one with the golden retriever." Tre: "...Yeah. That one's rough."
  - [Tre looks away. Defensive.]
  - Dave: "Burger. Cheese or no cheese. There is a correct answer."
  - Tre: "Cheese." Dave: "Correct. I like this kid."
  - Tre: "Storage place on Industrial. Unit forty-seven. The guy who runs it works for somebody bigger. 'The Wholesaler'. I never met him."
  - Gary (notes): "Unit forty-seven. Cheese. Retriever commercial. Got it all."
- **Size:** S (the engine is in [SOCIAL]; this is content). **Depends on:** [SOCIAL] conversation engine (built in wave 1 with this job as its first user).

### 2.16 *Chain Reaction*: rescue and trace (Tyler)

- **Giver:** Tyler, at home (crying on the porch: an interactable `kid_upset` event). **Location:** Maple Heights Elementary bike rack (`site school`) → 3 neighbours' doors → the home laptop → Route 9 → a garage in Riverside (the end garage of a rowhouse on 4th St, x204, z50).
- **Premise:** Tyler's bike (red, a playing card in the spokes, "the fastest bike in third grade") was stolen off the school rack. He wants it back. He's eight. You promised.
- **Beat sheet:**
  1. **Investigate the rack** ([PHOTO] or look): clues are a cut lock (bolt cutters: an adult), a dropped snack wrapper from the Riverside corner mart, and tyre tracks of a cargo bike.
  2. **Ask around:** 3 neighbours' doors. Each conversation is a short [SOCIAL] check (no failure, but good picks give better clues). Linda saw a cargo bike with a tarp. Phil has a doorbell camera (watch the clip: a card with a still image).
  3. **The listing:** at the home laptop (Dadazon is the shop; a new "Neighbourly Resale" tab), find Tyler's bike listed for sale by "bikez4cheap". Message the seller (a pick of 3 lines). He agrees to meet at Ramos Corner Mart.
  4. **The meet:** a kid shows up (14, on a fast bike) with Tyler's bike. He spots you and **bolts**. A **foot and bike chase** through Riverside alleys: he's on a bike, you're on foot or in a car (an alley is too narrow for the car, so you have to choose). If he gets away, a fallback: follow him to the garage at a distance ([TAIL] on foot).
  5. **The garage:** 30 kids' bikes, and the adult who pays kids $10 a bike. He's the one with the bolt cutters (2 adult accomplices with pistols, a small fight, or zip-tie the boss after he gives up).
  6. Bring the bike home to Tyler. Every other bike goes to Earl's bike library (`done.earl` callback).
- **Core new mechanic:** **clue chain investigation** (look → ask → search → meet → chase), a short detective structure.
- **Reuses:** [PHOTO] (inspect clues), [SOCIAL] (doorsteps, the message), the home laptop UI (`laptop` interactable → Dadazon card; a new tab), the foot chase (AI runner with a `flee` path on `AI.buildNav`), the bike as a fast `AI.ally`-style runner with a custom speed, [TAIL] (on foot), the small den-fight, zip-ties.
- **Fail states:** none hard before the garage (the fallback route always works). In the garage: the usual combat downs.
- **Trust / zip-tie twist:** the 14-year-old seller: catch him without a weapon (tackle, no guns allowed in the chase) → he's not zip-tied, he's brought to Earl, and he volunteers at the bike library (+5 Riverside trust, he appears there). The adult boss zip-tied: +4. **Households +1** (the kid's family).
- **Payout and gate:** $600 base; "Tyler's bike, unscratched" +$100; "Every bike home" +$200. Unlock: Act 3, `done.earl` and `done.taxi`. Medals: silver = caught him in the chase; gold = caught him on foot without the car.
- **Dialogue samples:**
  - Tyler: "It had the ace of spades in the spokes. It goes brrrrrrr. Now it doesn't go anywhere."
  - You: "I'll get it back, buddy." Tyler: "Pinky promise?" You: "Pinky promise."
  - Linda: "A cargo bike with a tarp. I said 'nice bike' and he said 'thanks, it's mine'. Suspicious."
  - Phil: "Doorbell cam. I mostly use it to watch squirrels. But look. Not a squirrel."
  - Listing: "RED BIKE. FAST. CARD IN SPOKES NOT INCLUDED." You: "The card is INCLUDED."
  - Seller kid (bolting): "Nope! Nope nope nope!"
  - You (chasing): "I'm... a dad... I can do... this... all day..." (you cannot do this all day)
  - Seller kid (caught): "He pays us ten bucks a bike, man. I'm saving for a car."
  - Earl: "Ten bucks a bike? I'll pay you twelve to fix them. Bike library's hiring."
  - Tyler: "Brrrrrrrrr!"
- **Size:** M. **Depends on:** [PHOTO], [SOCIAL] (doorstep check), a laptop "Resale" tab (`js/save.js` UI), a foot-chase runner (in the job file).

### 2.17 *Honey-Do Blitz*: rampage inversion (Hank)

- **Giver:** Hank, at Hank's Hardware. **Location:** a 120 m radius of Riverside around `places.mart` (start), and Maple Heights for a second variant.
- **Premise:** Hank's running a promotion: whoever fixes the most things in Riverside in three minutes wins a lifetime 10% discount. Hank supplies the tools. You supply the dad energy.
- **Beat sheet:**
  1. Grab the tool belt (a loadout swap: no guns, 4 tools on 1–4: **hammer**, **brush**, **lightbulb pole**, **hand truck**).
  2. **Three minutes.** Fixable things are highlighted (only within 40 m on the HUD): a loose fence picket (hammer, 1 s), a graffiti tag (brush, 2 s: the A.7 graffiti from SPEC2), a broken street lamp (pole, 1.5 s: the `LAMP_SPLIT` broken lamps), a tipped trash can (E, 0.5 s), shopping carts (hand truck: push to the mart, 1 per trip), a cat in a tree (pole, 3 s; worth a lot), a flat on a kid's bike (pump, 2 s).
  3. **Combo:** each fix within 4 s of the last adds to the multiplier (×1 to ×5). Variety bonus: different fix types in a row add +0.5. Sprinting with a cart is allowed.
  4. **Neighbour reactions:** each fix spawns a small cheer or a wave from a nearby porch (the riverside-heat neighbours), and the street visibly changes (graffiti gone and lamp on, saved permanently).
  5. Score and leaderboard (a local leaderboard of your best 5 runs, plus ghost scores for Gary "47", Dave "52", Doug "212 (disputed)").
- **Core new mechanic:** **fix-it spree**: timed interact-with-everything, combos, a score, and **permanent world changes** from play.
- **Reuses:** the SPEC2 A.7 graffiti/scrub system (Cleanup Saturday), broken lamps (`LAMP_SPLIT`), `HUD` timer, the interact prompt (`HUD.prompt` with `hold`), neighbours, `wmCarry` (carts), and the world dressing (`O.dress`).
- **Fail states:** none: it's a score attack.
- **Trust / zip-tie twist:** each fix is +0.2 Riverside trust (capped at +6 per run, and +12 per week of game time, so it doesn't replace jobs). A crew member from the heat system who's loitering nearby may **join in** if you've zip-tied fewer than 2 of his crew (a "Hey... can I hold the ladder?" moment, +2, and he becomes a regular at the court).
- **Payout and gate:** $150 + $3 per point; the **10% Hank's discount** for beating 150 points (`SAVE.flags.hankDiscount`). Unlock: Act 2, `done.earl`. Repeatable. Medals: bronze 80, silver 150, gold 250.
- **Dialogue samples:**
  - Hank: "Three minutes. Every fix counts. Cats count double. Cats count triple if they don't scratch."
  - Hank: "Tools are a loan. Bring 'em back. The hammer has a name. It's Gerald."
  - Neighbour: "Did he just fix my fence and leave?" Other: "He's doing a thing for Hank."
  - You: "COMBO!" (nobody else says this)
  - Cat: (hiss) You: "I'm helping." Cat: (hiss) You: "I'm HELPING."
  - Kid: "My bike's flat." You (two seconds later): "Not anymore. Go. Be free."
  - Loiterer: "...You need someone to hold the ladder?" You: "Always."
  - Hank: "Two hundred and four. Doug's claiming two-twelve but Doug counted a squirrel."
  - Doug (radio): "The squirrel was in distress."
- **Size:** S (on top of the A.7 scrub system). **Depends on:** SPEC2 A.7 graffiti (W4 riverside dressing), a tool-belt loadout (a `WEAPONS` set with `tool:true` so the fire button means "use").

### 2.18 *Handle With Care*: fragile delivery (Big Dave, strand 2/2)

- **Giver:** Big Dave, at his house. **Location:** Maple Heights (Dave's) → Route 9 → bridge → the Riverside block party at the basketball court (x197, z14).
- **Premise:** The first Riverside block party since forever. Dave has cooked a 14-hour brisket as a gesture of cross-bridge friendship. It's on a tray. On your back seat. Some local hustlers have heard about the brisket.
- **Beat sheet:**
  1. Load the brisket (a carry from Dave's porch to the car: tilt with A/D to balance; drop it and the job ends).
  2. **Drive with a g-force meter:** brisket integrity (100) loses points for lateral g above 0.45 g, braking above 0.5 g, potholes (new road features: 8 potholes on Route 9 and Riverside, shown as dark patches), kerbs and collisions. Small hits splash sauce on the windscreen (an FX decal).
  3. **The hustlers:** a hatchback pulls alongside at the bridge and tries to box you (the AI uses the same slot logic as *Brake Check*, but against you). You can't shoot (the brisket's in the car, and so is Dave). Out-drive them **smoothly**: hard moves cost integrity, but they also try to make you brake hard.
  4. Crew support: Gary in a second car can block them if you ask on the radio (once).
  5. Arrive. Dave carries the brisket in on his own. The party scene: neighbours from both sides of the bridge, music, a cut to a card.
- **Core new mechanic:** **smooth-driving delivery** (g-force integrity) under pressure.
- **Reuses:** `HT.CarAI.drive` (it already computes acceleration; read `car.ax`, `car.az`), car damage (collisions), *Brake Check*'s slot helper (inverted), the riverside-heat neighbours (party crowd), FX decals (`HT.FX` sauce splash), the GPS.
- **Fail states:** brisket integrity 0 ("It's... it's pulled pork now."), with a retry from [CP] "at the bridge".
- **Trust / zip-tie twist:** **+5 Riverside and +5 Maple** on arrival with integrity ≥ 60 (the first time the two neighbourhoods share a table). Optional: give the hustlers a plate when they show up at the party instead of chasing them off (a line choice): +3 more, and they help clean up.
- **Payout and gate:** $500 base; "Pristine" (integrity ≥ 90) +$300; "Never braked hard" +$100. Unlock: Act 2, `done.benny`. Medals: silver ≥ 90; gold ≥ 98.
- **Dialogue samples:**
  - Dave: "Fourteen hours. Post oak. I slept next to the smoker. My wife moved into the guest room."
  - Dave: "Smooth like a parade. Like a parade float. Carrying a baby. Made of glass."
  - Dave (pothole): "Pothole. POTHOLE. You hit it with your whole chest."
  - Hustler: "Hey! Hey! Pull over! We just want to talk about the brisket!"
  - Dave: "No one talks about the brisket."
  - Gary (radio): "I can block them at the light. I'll pretend I'm lost. I'm very good at being lost."
  - Dave: "The bridge has a seam. Take it at an angle. Like a gentle ollie."
  - Rosa (at the party): "Is that the brisket? I've heard about the brisket. Benny won't stop talking about the brisket."
  - Hustler (later, with a plate): "...This is the best thing I've ever eaten." Dave (quietly): "I know."
- **Size:** S. **Depends on:** pothole road features (worldgen: a list of points; drive code reads them), the slot helper (from *Brake Check*, or a simpler alongside AI).

### 2.19 *Hands Off*: capture alive in a crowd (Rosa)

- **Giver:** Rosa, at `g_rosa`. **Location:** `site market` (the Riverside Farmers' Market on Main St, Saturday morning).
- **Premise:** Someone in a fake charity vest is collecting "for the garden" at the market and keeping all of it, and selling stolen tools out of a duffel on the side. Rosa wants him **caught, not hurt, in front of nobody**, because a panic at a market with strollers is a nightmare she's seen in the ER.
- **Beat sheet:**
  1. The market: about 40 NPCs, stalls, strollers. 4 people in charity vests: 1 is the skimmer. Watch for **tells** (he pockets cash after a donation, he checks his phone when the duffel guy waves, he avoids the real garden stall).
  2. **Identify** him: watch a suspect for 3 s of cumulative "tell time" (the tell has to happen while you're looking). Or [PHOTO] him pocketing cash (instant ID). A wrong accusation (talk + "Excuse me, sir") costs trust and puts the real one on alert.
  3. **Get the angle:** you need a shot with **no civilian within 2 m of the line of fire** (the HUD reticle turns green: a crowd-safe check using `rayTargets` against neighbours). The **beanbag only** (the job locks your loadout to it).
  4. **One shot.** A hit drops him (surrender + kneel). A miss: he runs. The market reacts to the shot: a **panic meter** (civilians near the shot scatter; the meter rises with each shot and with running). Panic 100 = fail.
  5. The duffel accomplice runs for a car: a short chase on foot or by car.
  6. Rosa walks over and zip-ties the skimmer herself: "Hands behind your back. You know the drill. Or you're about to."
- **Core new mechanic:** **picking out one person in a crowd and taking a crowd-safe shot**; a civilian panic meter.
- **Reuses:** [PHOTO] (proof), [SOCIAL] (the accusation is a conversation), the `beanbag` (`opt.nonlethal`), surrender, zip-ties, the neighbour crowd (`HT.People` models with market routines), the riverside-heat neighbour "walk indoors" reaction (repurposed as scatter), a foot chase.
- **Fail states:** panic 100; a civilian hit (instant fail, [CP]); the skimmer reaches the street after an alert (escape).
- **Trust / zip-tie twist:** +6 Riverside trust for a one-shot capture; +3 for zip-tying the accomplice. A wrong accusation −2. Rosa returns the money to the real garden fund: **the garden blooms one tier early** (it already exists as a `WM_AFTER` effect for Rosa's job; this reuses the hook).
- **Payout and gate:** $850 base; "One shot" +$300; "Nobody noticed" (panic < 20) +$150. Unlock: Act 3, `done.overwatch` (you learned the beanbag). Medals: silver = one shot; gold = one shot, panic < 10.
- **Dialogue samples:**
  - Rosa: "Strollers. Toddlers. Mr. Ferreira with his cane. If this turns into a stampede I'm going to be very calm and very angry."
  - Rosa: "Watch his hands. Charity people don't put the money in their own pocket. That's the whole job."
  - Skimmer: "For the garden! Every dollar goes to the garden! Mostly."
  - You (wrong guy): "Excuse me, sir—" Real volunteer: "I'm with the Golden Spatula Club. I've been with them twenty years."
  - You: "...Great work. Love the spatula."
  - Rosa: "Green reticle. Nobody behind him. Now. Not 'in a second'. Now."
  - Skimmer (hit): "OOF. Okay, wow, okay."
  - Market lady: "Did that man just get shot with a beanbag?" Other: "He was skimming the garden money." Market lady: "...Good shot."
  - Rosa: "Hands behind your back. You know the drill. Or you're about to."
  - Rosa: "Every dollar. Back to the actual garden. Mateo is buying a second pumpkin."
- **Size:** M. **Depends on:** [PHOTO], [SOCIAL] (accusation), a crowd-safe shot check (in the job file; uses `rayTargets` with neighbours included only for the check), crowd routines (`HT.People`).

### 2.20 *Everybody Waves*: the finale (everyone)

- **Giver:** a card at home: Earl, Dee, Rosa, Benny and the Maple crew in your kitchen. **Location:** both neighbourhoods; the first **Riverside Flats Street Festival** on Main St, and The Wholesaler's distribution yard at `site storage` (after *Good Fences* he moved to the Dock St warehouse; any Warehouse Row lot works).
- **Premise:** The Wholesaler has bought up the stolen-goods trade for three neighbourhoods, and the first Riverside street festival makes his business look bad. He plans to ruin it: smoke bombs, a stolen stage truck, a crew in the crowd. Everybody you've helped is at the festival. Everybody you've helped helps.
- **Beat sheet (6 stages, each a [CP]):**
  1. **Tail** (*Following Distance*): his courier leaves the festival with a radio. Tail him (bands) to the Dock St yard. This time Earl drives a bus (his old No. 9, borrowed from the depot) as your swap car.
  2. **Overwatch** (*Higher Ground*): Doug and you on the church roof while Dee, Rosa and the crew find the 4 "plants" in the festival crowd (each a [PHOTO]/tell ID, as in *Hands Off*). Beanbags only.
  3. **Roadblock** (*Cone Zone*): the stolen stage truck (with the festival's sound system and the plan to block Main St) heads for the festival. 60 s of setup with what Hank brings from the store, plus the vans from *Minivan Roundup* (the families drive them).
  4. **Defend** (*Heavy Lifting* and *Garden Variety*): while the stage is rebuilt (progress bar), the Wholesaler's crew pushes at the festival from Mill St. Every family you moved in is on a porch. The Adeyemis hand out water.
  5. **The Wholesaler runs** (*The Duke*'s chase): he flees in a car. **Box him in** (*Brake Check*), with 3 crew cars plus Benny's truck.
  6. **Hands up**: he gets out of a boxed-in car. His surrender is the boss surrender beat. If you've played as a zip-tie dad, every crew member and half the festival is standing there when he gives up. The zip-tie is handed to you by Tyler's crossing-guard friend, Malik (a line).
  - **Then:** a fade to the festival at night: string lights, the mural, Riverside trust set to **100** (the `banner` tier, `picnic`), Benny's truck playing, Earl's bus doing laps with kids on it.
- **Core new mechanic:** none new. It's built from the shared systems and the stage [CP], which is the point.
- **Reuses:** everything above: [TAIL], [PHOTO], [STEALTH] (light), roadblock props, the defend progress bar, the slot helper (box-in), the boss surrender, households (all the moved-in families appear), `TIERS` and `FLAGS` at 90+.
- **Fail states:** each stage's own. A retry always starts at the current stage's [CP].
- **Trust / zip-tie twist:** Riverside goes to 100 regardless (it's the ending), but the **epilogue card changes**: the number of zip-ties versus downs across the whole campaign picks one of 3 epilogues ("Everybody waves." / "Most people wave." / "People wave. Some of them still flinch."). The Wholesaler cuffed: a cut to him at Sal's shop a year later, in coveralls.
- **Payout and gate:** $2,500 base; "Everyone home" (no crew downs in any stage) +$500; "Hands up" (cuffed) +$1,000. Unlock: Act 3, every story job done, `trustR ≥ 80`, `prog.trust ≥ 80`. Medals: silver = cuffed; gold = cuffed with no lethal shots in the finale.
- **Dialogue samples:**
  - Earl: "I asked the transit authority for the old No. 9 for one day. They said yes. Then they said 'who is this'."
  - Dee: "Everybody's at the festival. And I do mean everybody. Even the ones who used to stand outside the laundromat."
  - Benny: "I brought the truck. I brought extra cones. Not the traffic kind."
  - Hank: "Every cone in the store. Every sawhorse. Two hundred zip-ties. On the house. Just this once. Don't tell my wife."
  - Rosa: "Families on the porches, crew on the street, and I'm triaging anybody who says 'I'm fine'."
  - Mr. Adeyemi (handing water): "We moved in for the schools. We stayed for whatever this is."
  - The Wholesaler: "You people are fixing a neighborhood with minivans and traffic cones." You: "And zip-ties." The Wholesaler: "And zip-ties."
  - The Wholesaler (boxed in): "...Fine. Fine. Hands up. Is that what you want? Hands up."
  - Malik: "Here. Mr. Gary said you'd want to do this one yourself."
  - Gary: "Nineteen jobs. Four hundred and twelve zip-ties. Zero regrets. One pivot table."
  - Doug: "Hawk out." Everyone: "We're not doing call signs."
- **Size:** L (assembly and content; it needs every system). **Depends on:** all systems, and the stage [CP] as the backbone.

---

### Repeatable side jobs (repeatable story-adjacent jobs; they also feed section 3.3)

### 2.21 *Watch Your Step*: neighbourhood-watch patrols (Doug's corkboard)

- **Giver:** Doug's corkboard at home (an interactable that becomes a patrol board after *Following Distance*), and the Community Center bulletin board in Riverside. **Location:** procedural patrol routes of 6–9 road-graph nodes in either neighbourhood. Day, or evening (night mood).
- **Premise:** Walk or drive the watch route. Check on things. Be seen. Handle whatever comes up.
- **Loop:** a route of **checkpoints** (porches, alleys, a playground). At each: a **check** (look at it for 1 s, or hold E to "knock and wave", which adds +0.1 trust). Random **events** on 30% of checkpoints, picked from the existing free-roam incidents (`frIncident('porch'|'carjack'|'scuffle')`) plus 4 new ones: **open garage** (close it and leave a note: +0.5), **lost dog** (walk it home: +1), **stalled car** (push it off the road with your car, gently: +1), **kids out late** (escort to the corner: +1).
- **Core mechanic:** a route-based patrol with randomised checks, using the existing incident system as the event pool.
- **Reuses:** `frIncident`, `frUpdate` crews (Riverside only), `HT.Roads` routes, `HUD.minimap.route`, neighbours.
- **Fail:** none (abandon anytime). **Trust:** small (+2 to +5 per patrol, capped by the weekly cap). **Payout:** $60 + $20 per event handled. **Size:** S. **Depends on:** `work/riverside-heat` (incidents); its Maple variant uses only the new 4 events.
- **Lines:** Doug: "Watch tip: wave at everyone. If they wave back, they're neighbours. If they don't, they're also neighbours. Wave harder." / Neighbour: "Oh! Is it Thursday already? Hi, Watch!" / You: "Garage open, Mr. Ken. Closed it. Left a note." Note: "YOUR GARAGE WAS OPEN :) — THE WATCH"

### 2.22 *Porch Light*: package guard

- **Giver:** the Dadazon tracking page on the home laptop: "Out for delivery: 4 packages on Maple, 3 in Riverside". **Location:** porches on delivery routes in either neighbourhood (`p` porch anchors in Riverside; Maple house fronts).
- **Loop:** a delivery truck (`workvan`, AI on `follow`) drops packages on 4–6 porches over 3 minutes. Porch pirates (1–3, foot or car) try to grab them. **Guard** from somewhere sensible (a parked car, a lawn chair you carry: the lawn chair is the joke and the mechanic, since sitting gives a wide view cone of your own and a "suspicious dad" deterrent radius of 12 m that pirates avoid). Catch a pirate before he gets 40 m with the package (tackle → surrender → zip-tie), then return the package to its porch unharmed (a carry).
- **Core mechanic:** reverse stealth: **you're the one being avoided**. Pirates route around your deterrent radius, so placing yourself is the game.
- **Reuses:** the free-roam "porch pirate" incident AI, `wmCarry`, `HT.CarAI.follow` (delivery truck), the `p` porch anchors, zip-ties. **Fail:** 3 packages lost. **Trust:** +0.5 per package saved. **Payout:** $50 + $15 per package. **Size:** S.
- **Lines:** Pirate: "That dad's in a lawn chair. Facing the street. With a lemonade. Abort." / You: "Ma'am, your package. It's a... 'Turbo Nose Hair Trimmer.'" / Neighbour: "Please don't tell anyone."

### 2.23 *Suds Up*: the car wash fundraiser

- **Giver:** Pastor Dee (after *Crossing Guard*), at the church lot. **Location:** the church lot (x160–170, z16–18) on Saturdays.
- **Loop:** the youth group washes cars for 4 minutes. Customers' cars (AI `follow`) queue at the lot. Your jobs: **wave cars in** (stand at the kerb: cars within 20 m have a chance to stop, which goes up with the sign you hold), **wash** (a hold-E circuit around the car: 4 sides), and **keep trouble away**: a rival crew sends guys to spray graffiti on the sign, slash the hose and "accidentally" drive through the suds. Each is a short interrupt (chase off, zip-tie or [SOCIAL] talk-down: "There are kids here.").
- **Core mechanic:** **service tycoon-lite plus defence**: throughput (cars washed) against interruptions.
- **Reuses:** AI cars (`follow`, a queue), the scrub interaction from *Honey-Do Blitz*/A.7 (washing is scrubbing), the free-roam crews, [SOCIAL] (one check type), zip-ties. **Fail:** none (score). **Trust:** +0.3 per car washed. **Payout:** a donation total (your cut is 0; the youth group's total unlocks Dee's van upgrades: a church-van livery for the minivan at Dad's Auto). **Size:** S.
- **Lines:** Dee: "Five dollars a car. Ten if they want the inside. Nobody wants the inside." / Kid: "Mister, your van needs it the most." / Crew guy (talked down): "...How much is the inside?"

---

## 3) Structure

### 3.1 Campaign arc

Three acts. Both neighbourhoods interleave from Act 1 (the bridge opens after *Fourth Quarter*, as in `work/riverside-jobs`). Rows marked **new** are from this catalogue. **R** = Riverside, **M** = Maple, **9** = Route 9.

**Act 1, *Our Street*** (Maple Heights trust 12 → ~60; Riverside 5 → ~20). Theme: your own block first. You learn the systems: driving, the zip-tie promise, the camera and the first non-combat jobs.

| # | Job | Where | Kind |
|---|---|---|---|
| 1 | *Return to Sender* | 9 | combat (tutorial) |
| 2 | *Dad Taxi* (new) | M | timed / driving |
| 3 | *Fourth Quarter* | M | combat + timed |
| — | *bridge opens* (Act 2 card from `work/riverside-jobs`) | | |
| 4 | *Exhibit HOA* (new) | M | stealth-light / photo |
| 5 | *Exact Change* | R | combat + carry |
| 6 | *The Grass Is Greener* (new) | M | race / social |
| 7 | *Block Party* | M | combat / defend |
| 8 | *Following Distance* (new) | 9→R | driving / stealth |
| 9 | *The Kingpin* | M | combat / boss (Act 1 climax: Maple's King) |

**Act 2, *Over the Bridge*** (Riverside 20 → ~75; Maple keeps rising through Route 9 jobs and side jobs). Theme: you're guests in somebody else's neighbourhood. Riverside's people are the givers and they set the rules ("My kids walk away from this. That part isn't negotiable.").

| # | Job | Where | Kind |
|---|---|---|---|
| 10 | *Fellowship Hall* | R | stakeout → combat |
| 11 | *Crossing Guard* (new) | R | escort on foot / social |
| 12 | *Hitch Happens* (new) | R | driving / tow |
| 13 | *Garden Variety* | R | combat / defend |
| 14 | *Higher Ground* (new) | R | overwatch / precision |
| 15 | *Grand Opening* (new) | R | infiltration / social |
| 16 | *Heavy Lifting* (new) | R | defend + carry |
| 17 | *Brain Freeze* | R | escort → chase |
| 18 | *Cone Zone* (new) | 9 | placement → combat or chase |
| 19 | *Handle With Care* (new) | 9→R | driving / fragile |
| 20 | *The Duke* | R | combat → chase (Act 2 climax) |

**Act 3, *Good People Stay*** (Riverside ~75 → 100; Maple → 100). Theme: the Wholesaler, the money behind both Kings, and the neighbourhoods working as one. The jobs now use what you've built: the crew roles, the gear you borrowed, the families who moved in.

| # | Job | Where | Kind |
|---|---|---|---|
| 21 | *Small Talk* (new) | M | social / dialogue |
| 22 | *Sign of the Times* (new) | R | stealth / sabotage (night) |
| 23 | *Brake Check* (new) | 9 | multi-car pursuit |
| 24 | *Chain Reaction* (new) | M→R | investigation / chase |
| 25 | *Minivan Roundup* (new) | 9→M | stealth-light / convoy |
| 26 | *Hands Off* (new) | R | crowd / precision |
| 27 | *Good Fences* (new) | 9 | heist: scope, gear, plan, execute |
| 28 | *Everybody Waves* (new) | R + M | finale: everything |

**Job ids** (for `unlock.done`, `SAVE`, tests): existing `gary rick dave doug earl dee rosa benny duke`; new `taxi hoa mower tail crossing tow overwatch pawn moving cargo cones talk sabotage brake bike roundup arrest heist finale`; repeatables `patrol porch carwash blitz`. (`taxi`=*Dad Taxi*, `hoa`=*Exhibit HOA*, `mower`=*The Grass Is Greener*, `tail`=*Following Distance*, `crossing`=*Crossing Guard*, `tow`=*Hitch Happens*, `overwatch`=*Higher Ground*, `pawn`=*Grand Opening*, `moving`=*Heavy Lifting*, `cargo`=*Handle With Care*, `cones`=*Cone Zone*, `talk`=*Small Talk*, `sabotage`=*Sign of the Times*, `brake`=*Brake Check*, `bike`=*Chain Reaction*, `roundup`=*Minivan Roundup*, `arrest`=*Hands Off*, `heist`=*Good Fences*, `finale`=*Everybody Waves*, `blitz`=*Honey-Do Blitz*.)

**Gating rules** (`jobAvailable(id)` from SPEC2 B.0, extended): each job lists `unlock:{done:[...], trust, trustR, cuffed}`. At most **3 givers** are visible at once (one per region), picked in campaign order. Inside an act, a job's predecessors can be done in any order, so the player always has a choice of 2–3 jobs of **different kinds** (the pacing chart below is the default order, not a forced one).

### 3.2 Crew strands (loyalty missions and perks)

Each crew member has a strand of 2 jobs. Finishing a strand unlocks a **perk** (`SAVE.crew[id].perk=true`), shown on the [ROLES] card and in the locker.

| Crew | Strand jobs | Perk | Effect (exact) |
|---|---|---|---|
| **Gary** | *Small Talk* → *Good Fences* | **Itemised** | Recovered-goods lines pay +15%; loot within 30 m appears on the minimap. |
| **Coach Rick** | *Brake Check* → *Minivan Roundup* | **Two-Minute Drill** | Timed objectives +15 s; crew sprint speed +10% when you call "Go!" (a new radio command, 20 s cooldown). |
| **Big Dave** | *The Grass Is Greener* → *Handle With Care* | **Cookout Morale** | Downed allies revive in 6 s instead of 9 when Dave is within 14 m; a home "grill" interactable gives +25 max HP for the next job. |
| **Doug** | *Following Distance* → *Higher Ground* | **Hawk** | Enemies you scope for 0.6 s stay marked for 8 s (through walls); [STEALTH] detection fill −20% when Doug is on the crew. |
| **Rosa** | *Garden Variety* (SPEC2) → *Hands Off* | **Triage+** | Her medic radius 14 → 20 m; zip-ties are 30% faster while she's within 10 m. |
| **Earl** | *Exact Change* (SPEC2) → *Cone Zone* | **Shortcuts** | GPS uses alleys (alley edges added to `HT.Roads` with cost ×0.8); fast travel to 4 bus-stop pins in Riverside. |
| **Pastor Dee** | *Grand Opening* → *Crossing Guard* | **Second Chances** | Enemy surrender chance +15% in Riverside; surrendered Riverside enemies sometimes (30%) mark a stash on the minimap. |
| **Sal** (non-combat) | *Hitch Happens* → *Sign of the Times* | **Shop Account** | Tows are free; repairs −25%; the hitch is permanent and free. |
| **Benny** (non-combat) | *Brain Freeze* (SPEC2) → finale cameo | **Jingle** | Once per job, call Benny's truck as a distraction (draws idle enemies within 40 m of a road node for 10 s). |
| **Family** | *Dad Taxi* (Jen), *Chain Reaction* (Tyler), *Exhibit HOA* (Maddie helps) | **Dad of the Year** | Home morale bonus: family lines change, and the minivan gets a "#1 DAD" bumper sticker (cosmetic, `HT.Vehicles`). |

Perks are all **passive or a single new radio command**, so they don't need new UI beyond a line on the existing cards.

### 3.3 Repeatable side activities

| Activity | Source | Unlock | Repeat | Cap |
|---|---|---|---|---|
| *Watch Your Step* patrols | 2.21 | `done.tail` | any time from the corkboard or Community Center board | trust from patrols ≤ +12/week |
| *Porch Light* | 2.22 | `done.hoa` | laptop, when "out for delivery" (every 2nd in-game day) | — |
| *Suds Up* | 2.23 | `done.crossing` | Saturdays (every 7th day) | — |
| *Dad Taxi* rides | 2.4 | `done.taxi` | Jen's fridge note: 3 random stops with windows (a short taxi-style chain) | 3/day |
| *Honey-Do Blitz* | 2.17 | `done.earl` | Hank's counter | trust ≤ +12/week |
| *Mower time trial* | 2.13 | `done.mower` | Linden Park sign | — |
| *Hot Pursuit* | SPEC2 B.6 | `done.benny` | random, as specified | — |
| *Cleanup Saturday* | SPEC2 A.7 | — | as specified | — |
| *Reruns* | SPEC2 / [CAL] | any done job | the fridge calendar (4.8) | half pay |
| Free roam heat incidents | `work/riverside-heat` | bridge open | as built | — |

"Week" means 7 in-game days. A day passes each time you sleep at home (`bed` interactable) or finish a story job.

### 3.4 Variety mapped onto trust and Riverside's transformation

**What each kind of job does to trust.** The rule is: **combat jobs give trust for restraint; non-combat jobs give trust for care.**

| Kind | Main trust source | Main trust loss |
|---|---|---|
| Combat (den, defend, boss) | zip-ties (+4 R / +2 M each), surrender cuffed | executions (−10), kills (−2 in free roam) |
| Stealth (tail, sabotage, heist scope) | clean / ghost bonuses (+4 to +8) | being spotted (a lost bonus, not a penalty) |
| Social (infiltration, interrogation, talk-downs) | rapport and cover outcomes (+4 to +6) | wrong accusations (−2) |
| Driving (taxi, tow, cargo, pursuit) | condition of borrowed cars, no civilian hits | rams on civilians (−2), wrecked borrowed cars (`BORROW` −1 to −3) |
| Fix-it and events (blitz, race, car wash, patrols) | small per-action (+0.2 to +1), capped weekly | — |

**Riverside's visible transformation: the households counter.** SPEC2's dressing tiers are driven by `prog.trustR`. This adds **named, specific changes** tied to jobs, in `SAVE.world.households` (a list of ids) and `SAVE.world.storefronts` (map of storefront id → state):

| Job | Visible change (permanent, at that address) |
|---|---|
| *Exact Change* | Free Bike Library sign (exists: `WM_AFTER`); after *Chain Reaction* the seller kid works the counter |
| *Fellowship Hall* | Laundromat youth-group folding table (exists) |
| *Crossing Guard* | A crossing guard at 2nd St & Ash St on weekday mornings (Mr. Ferreira if *Higher Ground* is done) |
| *Grand Opening* | The pawn shop storefront becomes **Ramos Bakery** (new sign, awning, a queue at 8 am) |
| *Hitch Happens* | Sal's new tow guy's truck parked on Dock St; cars no longer get "impounded" |
| *Heavy Lifting* | **The Adeyemis** on the 3rd St porch (2 adults, 2 kids, the piano visible through the window) |
| *Small Talk* | Tre at the bike library on Saturdays |
| *Higher Ground* | Mr. Ferreira on his porch on Main St, waving |
| *Hands Off* | The garden blooms one tier early (existing hook), a real charity stall at the market |
| *Sign of the Times* | Mill St Auto Recovery becomes **Sal's Riverside branch** ("Honest Towing") |
| *Chain Reaction* | The seller kid's family's porch has flower boxes |
| *Cone Zone* | Mrs. Lindqvist's goat Pepper in her yard on Ash St |
| *Good Fences* | **Lost & Found Sunday** sign on the church; 4 extra porches with returned items (a grill, a bike, a kayak, a lawn gnome) |
| *Everybody Waves* | The festival's string lights stay up; the mural; Riverside trust 100 |

Every **household** also adds +1 permanent neighbour to the `TIERS` neighbour count, so the street fills up with people you've met, not generic NPCs.

### 3.5 Pacing chart

Kinds: **C** combat, **D** driving, **S** stealth, **So** social, **T** timed, **P** precision, **Pl** planning/placement. Two jobs of the same main kind are never back to back. The 3 combat-heaviest jobs per act are spread out.

```
#   job                    main  also     intensity (1 calm .. 5 frantic)
 1  Return to Sender        C              ███
 2  Dad Taxi                T     D        ██
 3  Fourth Quarter          C     T        ████
 4  Exhibit HOA             S     So       █
 5  Exact Change         C              ███
 6  Grass Is Greener        D     So       ██        <- deliberate breather between two combat jobs
 7  Block Party             C              ████
 8  Following Distance      D     S        ██
 9  The Kingpin             C              █████     ACT 1 CLIMAX
10  Fellowship Hall         S     C        ███
11  Crossing Guard          So    T        ██
12  Hitch Happens           D     C        ███
13  Garden Variety          C              ████
14  Higher Ground           P     C        ███
15  Grand Opening           So    S        █
16  Heavy Lifting           C     T        ████
17  Brain Freeze            D     C        ████
18  Cone Zone               Pl    C/D      ███
19  Handle With Care        D     T        ██        <- calm drive before the climax
20  The Duke                C     D        █████     ACT 2 CLIMAX
21  Small Talk              So             █
22  Sign of the Times       S              ██
23  Brake Check             D     C        ████
24  Chain Reaction          So    D/C      ███
25  Minivan Roundup         D     S        ███
26  Hands Off               P     So       ██
27  Good Fences             Pl    S/C/D    ████
28  Everybody Waves         all            █████     FINALE
```

Counts by main kind: C 8 (of which 7 are existing), D 7, S 3, So 4, P 2, Pl 2, T 1, finale 1. Before this catalogue, combat was the main kind in 7 of 9 jobs. After it, it's 8 of 28.

---

## 4) New shared systems (each specified once)

Every system is a **separate `js/` module** with a pure-logic core that runs in Node (like `js/ai.js`, `js/carai.js`, `js/roadgraph.js`), and only the thinnest glue in `index.html`. That glue goes through the **job registry and hook points** in 4.0, which wave 0 builds, so later workers never edit the same `index.html` region.

### 4.0 Job registry and hook points (wave 0, prerequisite for everything)

`work/riverside-jobs` already has a per-job table (`WJ[id].start(o)` and `.upd(dt,F)` in *RIVERSIDE JOBS: per-job logic*). Wave 0 promotes that table into a registry that lives in its own files:

```js
// js/jobs/_registry.js  (loaded after index.html's main script defines MISSIONS, WJ)
HT.Jobs={
  register(id,{def,       // the MISSIONS entry: id, giver, hood, role, title, place, lines, crew, type:'custom', unlock, site, stages, plan, arms, boss, radio, endLine
               start,     // (M,o) -> void          o.checkpoint = a [CP] snapshot or null
               upd,       // (dt,M,F) -> void        F = {objs, target, taps, prompt, meters}  (same frame object WJ uses today)
               save,load, // [CP]: JSON-safe state of the job
               payout,    // (M,ok) -> [[label,amount]]    added to SPEC.md D.1's lines
               medal,     // (M) -> 0..3                    for [CAL]
               end})      // (M,ok) -> void        households, storefronts, flags
  item(id,def),           // special held items: 'phone', 'stopSign', 'toolbelt' (fire = use, no ammo)
  hooks                   // see below
};
```
`MISSIONS.push(def)` happens inside `register`, so **no job worker edits the `MISSIONS` array**. Load order: `js/jobs/*.js` are `<script defer>` tags, which wave 0 adds once for every planned file. A missing file is just a 404 that's skipped (`onerror` → no registration). This way no later worker has to touch `index.html` to add a script tag.

**Hook points** (wave 0 adds one call each, in the named `index.html` section; each calls the active job's handler and every registered system's handler, and does nothing if none is registered):

| Hook | Section | Called | Used by |
|---|---|---|---|
| `JH.perceive(e,world)` | *AI*, before `AI.think` | per enemy per frame | [STEALTH] (gates sight), [SOCIAL] |
| `JH.noise(n)` | *AI*, inside `aiShot` and footstep code | on noises | [STEALTH] |
| `JH.vehicle(car,dt)` | *MINIVAN*, after `HT.CarAI.drive` in `updVan` | per frame while driving | [TOW], *Handle With Care* (g-force), [TAIL] |
| `JH.camera(dt)` | *PLAYER*, at the start of `updCamera` (as `wmCamera` already does) | per frame | [PHOTO] viewfinder, the *Cone Zone* planning camera, the *Higher Ground* roof |
| `JH.interact(prompt)` | *MISSION LOGIC*, where `updMission` builds the `E` prompt | per frame | everything that adds an `E` action |
| `JH.fire()` | *WEAPONS*, at the top of `fire()` | on trigger | special items (phone, stop sign, tool belt), `M.noGuns` |
| `JH.hud(state)` | *HUD*, before `HUD.update(state)` | per frame | meters, viewfinder, band bar |
| `JH.home(id)` | *META*, home interactable dispatch | on use | [CAL], Doug's corkboard, Jen's fridge note, laptop tabs |

**HUD:** wave 0 adds to `js/hud.js` a generic `state.meters=[{id,label,v,max,warn,icon,style:'bar'|'ring'|'pips'|'bands'}]` (top-centre stack, at most 3) and `HUD.overlay(id,el|null)` (a full-screen layer for viewfinders and cards). Systems use those two and never edit `js/hud.js` again.

**Save v3** (`js/save.js`, migrating from SPEC2 D's v2): adds `calendar`, `album`, `households`, `storefronts`, `gear` (borrowed items with due day), `crew[id].perk`, `jobs[id]={done,best,medal,runs,plan}`, `flags.hankDiscount`, `day`. Migration v2 → v3 maps `prog.done` by id.

**New sites:** all 8 sites from section 2's table, the orthodontist pin, the bus-stop pins and the pothole list (`WORLD.potholes=[{x,z,r}]`, 8 on Route 9 and 6 in Riverside) are stamped by wave 0 in `js/worldgen.js` in one go, so no later wave touches world generation.

**Test (wave 0):** `node dev/jobs-registry.test.js` registers a dummy job and checks it appears in `MISSIONS`, its hooks fire in a headless frame loop, a 404'd file is skipped, save v2 → v3 migrates `done[]`, the world validator (SPEC2 A.2) passes with the new sites, and every new site's park and huddle spot is reachable.

---

### 4.1 [STEALTH] Detection: vision cones, noise, suspicion

**Module:** `js/stealth.js` (`HT.Stealth`), plus a 3-line change in `js/ai.js` (`a.blind` skips sight in `perceive` while true). **Owner:** the wave 2 worker building *Sign of the Times*.

**Data:**
```js
const S=HT.Stealth.create({nav, mood:'day'|'night', diff:AI.DIFFICULTY.normal});
S.addObserver({id, kind:'guard'|'camera'|'dog'|'lookout'|'civilian', pos:{x,z}, yaw, cone?, ear?, lamp?});
S.noise({x,z,r,kind});                         // r in metres
const out=S.tick(dt,{x,z,stance:'stand'|'crouch'|'sprint', lit:0..1, disguise:null|{cover}});
// out: [{id, sus:0..1, state:'calm'|'look'|'investigate'|'alert', lkp:{x,z}, changed}]
S.max(); S.on('alert',fn); S.takedown(id);     // silent zip-tie from behind
```

**Tuning (all in `HT.Stealth.T`):**

| Parameter | Day | Night | Notes |
|---|---|---|---|
| View range R | 24 m | 14 m (26 m inside a flashlight cone) | |
| Cone half-angle | idle 50°, investigating 70°, alert 110° | flashlight 25° | Peripheral band: +25° beyond the cone, at ×0.35 |
| Distance falloff | 1.0 at ≤ 6 m, linear down to 0.25 at R | same | |
| Stance | stand 1.0, crouch 0.55, sprint 1.3 | | Crouched behind low cover (`nav.hides`=`crouch`) = hidden |
| Light | 1.0 | 0.9 within 6 m of a lit lamp, 0.4 otherwise | |
| Fill rate | 0.9/s × the product of the factors above, ×1.5 within 6 m | | |
| Thresholds | 0.35 → `look` (turns head), 0.6 → `investigate` (walks to `lkp`), 1.0 → `alert` | | |
| Decay | −0.12/s after 2.5 s unseen; floor 0.3 for 20 s after `investigate` | | |
| Squad spread | 1.5 s after one `alert`, its `HT.AI` squad gets `sq.alert` | | Unless that observer is zip-tied first |
| Camera | ±30° sweep at 12°/s, R 18 m, fill ×1.2 | | `alert` → `S.on('alarm')`; the job decides what happens |
| Dog | no sight; hearing ×1.8 | | Barks: the nearest guard gets `investigate` at the dog's position |

Worked numbers: a standing player in daylight at 10 m in the cone fills in **1.3 s**, at 20 m in **2.7 s**, and crouched at 10 m in **2.4 s**. At night, unlit, at 10 m it takes about 3.3 s.

**Noise radii (m):** crouch-walk 1, walk 2.5, run 7, sprint 9, vault or landing 5, door 4, car door 8, engine idle 10, horn 40, beanbag shot 25, gunshot 45 (existing). Job interactions give their own (tyre hiss 3, relay swap 6, prybar 8). A noise heard at ≤ r gives +0.35 suspicion and `investigate`; at ≤ 0.5 r it gives +0.6.

**Silent takedown:** within 1.3 m, behind the observer (the angle between its facing and the direction to you is over 120°), its `sus<0.35`. Hold E 2 s (1.4 s with the `zipPack` supply) → state `cuffed` through the existing zip-tie path, with a 2 m noise.

**HUD:** a `ring` meter "eye" = `S.max()` (white → yellow at `look` → orange at `investigate` → red at `alert`); a "?" or "!" tag over each observer's head (the existing `tags` with a new kind `sus`); and screen-edge chevrons for off-screen observers above 0.2.

**Integration:** in `JH.perceive(e)`, while the job's `M.stealth` is on and the enemy is a registered observer, set `e.ai.blind = S.state(e.id)!=='alert'`. When stealth breaks, the job calls `S.release()`: everything goes back to normal `HT.AI` behaviour (decision 2 decides whether that's a fight or a checkpoint).

**Tests:** `node dev/stealth.test.js`: (1) geometry: behind = 0, out of range = 0, crouched behind low cover = 0, peripheral band; (2) the fill times above ±10%; (3) noise radii and the dog relay; (4) decay and the investigate floor; (5) camera sweep timing; (6) takedown angle accept/reject; (7) perf: 12 observers, tick ≤ 0.15 ms (LOS cached for 0.1 s). In-game, `dev/stealth-ingame.js` on *Sign of the Times*: a scripted safe path stays under 0.35, and walking straight across the yard alerts within 3 s. Screenshots go in `docs/screenshots/stealth/`.

### 4.2 [TAIL] Tailing distance bands, familiarity, formation slots

**Module:** `js/tail.js` (`HT.Tail`). **Owner:** the wave 2 *Following Distance* worker. Formation slots (`HT.Tail.slot`) are added by the wave 4 *Brake Check* worker. The convoy is a separate file, `js/convoy.js` (`HT.Convoy`), owned by the wave 4 *Minivan Roundup* worker.

**Data:**
```js
const T=HT.Tail.create({target:car, bands:{close:15, ideal:[15,60], losing:110, lost:160}, lostT:12});
const r=T.tick(dt,{car:CV, carId, los:bool, stopped:bool});
// r: {band:'close'|'ideal'|'losing'|'lost', d, sus:0..100, fam:0..1, lose:0..lostT, made:bool, spooked:bool}
T.swap(newCarId, seenSwap:bool);    // familiarity for the new car starts at 0, or 0.5 if the target had LOS to the swap within 30 m
```

**Tuning:**

| Rule | Value |
|---|---|
| Too close (< 15 m) | sus +20/s; +40/s if you're in the target's mirror cone (60°) and under 25 m |
| Matching its stops | stopping within 6 m behind the target at a stop: +25/s |
| Ideal band (15–60 m) | sus −8/s |
| Losing band (60–110 m) | `lose` +1/s; no LOS also adds +1/s |
| Lost | `lose ≥ 12` or `d > 160` |
| Familiarity | +1/40 per second while within 50 m in the mirror cone, × the car type: minivan 1.0, sedan 0.8, hatch 0.8, suv 1.0, pickup 1.1, workvan 1.3, bus 0.5, ice-cream truck 3.0 |
| Made (fam ≥ 1) | sus gains ×2 for that car |
| Target reactions | sus > 50: an unplanned 2-edge detour (`HT.Roads` route splice); sus > 80: `max` +3 m/s; sus = 100: spooked → `HT.CarAI.flee` (the job decides fail or chase) |

**HUD:** a `bands` meter (4 coloured zones, a marker at the current `d`) and 5 `pips` for familiarity. The GPS route is hidden while tailing.

**`HT.Tail.slot(target, {side:-1|0|1, back:m}, car)`** returns a point relative to the target's pose (for `HT.CarAI.follow` with a 1-point path refreshed at 5 Hz). Box-in check: `HT.Tail.boxed(target,[cars],{r:4,t:3,vmax:8})`.

**`HT.Convoy.create(leader,[cars],{gap:8,wait:40,waitT:8})`** records leader breadcrumbs every 2 m and feeds each follower a path of the crumbs behind its predecessor. A follower more than 40 m behind for 8 s pulls over and waits.

**Tests:** `node dev/tail.test.js` uses `HT.CarAI.simulateChase`-style headless driving: a scripted follower at a constant 30 m stays in `ideal` with sus 0; at 10 m it spooks in under 6 s; a swap resets familiarity; mirror cone maths. `node dev/convoy.test.js`: 3 followers on a 600 m route with four 90° turns keep their gap within ±3 m and never cut a corner off the road. `slot`: 2 AI cars box a scripted target within 20 s in 9/10 seeds.

### 4.3 [PHOTO] Photo mode and evidence

**Module:** `js/photo.js` (`HT.Photo`), plus the `phone` item through `HT.Jobs.item`. **Owner:** the wave 2 *Exhibit HOA* worker.

**Controls:** the phone is a held item (it appears in the weapon list only during jobs that use it, or any time after *Exhibit HOA*, on key `5`). RMB raises it (a `HUD.overlay` viewfinder: frame lines, a zoom readout and a "subject" bracket when a required subject is inside the frame). The mouse wheel or the `+`/`−` buttons on touch set the zoom: **1×, 2×, 4×** (FOV 70°, 35°, 17.5°). LMB takes a shot (0.4 s cooldown). In the van, `wmBino` binoculars take photos with the same grading at 6×.

**Grading (pure function `HT.Photo.grade(cam, subjects, scene)`):** for each subject `{id, label, pos, h, need:'any'|'face'|'plate'}`:
- **In frame:** the projected centre is inside the central 70% of the frame.
- **Visible:** clear LOS from the camera to 2 sample points (head and centre; for a plate, 2 plate corners) against `L` colliders and `LOSBLOCK` tiles.
- **Size:** apparent height ÷ frame height ≥ 0.12 → 1★, ≥ 0.22 → 2★, ≥ 0.35 → 3★ (so a 1.8 m person needs about ≤ 26 m at 4× for 2★).
- **Face:** `need:'face'` caps at 1★ unless the subject's facing is within 70° of the camera.
- **Blur:** camera turn rate > 1.2 rad/s → −1★. **Dark:** night and unlit → −1★.
- Returns `{stars, hits:[{id,stars}]}`.

**Evidence board:** a card (`#cBoard`, the `.card` markup) with the job's required items as slots, each showing the best photo's thumbnail and stars. **Thumbnail:** on a shot that hits at least one subject, render once into a 256×144 `WebGLRenderTarget` from the current camera (post-processing skipped) → canvas → JPEG quality 0.6 (about 8 KB). Cost: ≤ 4 ms, only on the shutter.

**Save:** `SAVE.album=[{id,job,item,stars,day,jpg}]`, at most 24 entries (FIFO, but starred evidence is kept). The album appears in the [CAL] card.

**Tests:** `node dev/photo.test.js` with synthetic cameras and subjects: in or out of frame, occluded, each size threshold, the face rule, blur and dark. In-game: a viewfinder screenshot and a board screenshot (desktop and mobile) in `docs/screenshots/photo/`.

### 4.4 [TOW] Tow hitch physics

**Module:** `js/tow.js` (`HT.Tow`), plus a `towMul` read in `HT.CarAI.drive` (js/carai.js, one line) and a `hitch` item in `HT.Garage.CATALOG` (`{id:'hitch',group:'util',slot:'hitch',price:350,name:'Tow Hitch',blurb:"Rated for 3,500 lb. Sal rated it for 'probably'."}`). **Owner:** the wave 2 *Hitch Happens* worker.

**Model:** a kinematic single-axle trailer. The towed car's rear axle trails the hitch point.
```js
tow={car, L, side:'front'|'rear'}            // L = hitch to towed axle = towed.len*0.75 + 0.6
// per frame (JH.vehicle):  psi' = (v/L) * sin(theta - psi)       theta = tower yaw, psi = towed yaw, v = tower speed
// towed centre = hitch - fwd(psi) * (towed.len/2 + 0.6)
```

| Rule | Value |
|---|---|
| Attach | tower stopped (< 1 m/s), its hitch within 2.5 m of the target's front (or rear) bumper point, relative yaw within 30°, hold E 1.5 s ("Hitch up") |
| Detach | stopped, hold E 1 s |
| Tower limits while towing | `max` ×0.7 (the stock minivan 25 → 17.5 m/s), accel ×0.6, brake ×0.8, `steerResp` ×0.8, no boost |
| Jackknife | wrap(θ − ψ) over 75° at more than 3 m/s → unhitch, 8 damage to each car, a line ("That's... not how that goes.") |
| Reversing | the same equation with v < 0 (naturally unstable); the angle is clamped to 85° |
| Snap | an impact of 9 m/s or more on either body → unhitch |
| Collisions | the towed car keeps its collider and takes damage through `carHp` and `HT.CarAI.ram` as usual |
| Which vehicles | pickup and workvan have it stock; others need `hitch` (free during *Hitch Happens*; permanent with Sal's perk) |

**Tests:** `node dev/tow.test.js`: straight-line tracking error under 0.1 m; a 90° turn at 10 m/s off-tracks under 1.2 m; jackknife triggers in a sharp reverse and not in a gentle one; snap at 9 m/s; attach geometry accept/reject at 2.4/2.6 m and 29°/31°. In-game: `dev/tow-ingame.js` tows a sedan from the Dock St lot to Ash St along the GPS route without leaving the road. Screenshots in `docs/screenshots/tow/`.

### 4.5 [ROLES] Crew role assignment card

**Module:** `js/crewplan.js` (`HT.Plan`), plus `css/plan.css`. **Owner:** the wave 4 *Good Fences* worker. *Brake Check* (also wave 4) uses only a plain two-option choice from its own job file and doesn't wait for this.

**Data:**
```js
def.plan={
  roles:[{id:'driver',label:'Driver',desc:'Stays with the truck. Better drivers lose chasers faster.',need:1},
         {id:'lookout',...},{id:'muscle',...},{id:'talker',...},{id:'tech',...}],
  entries:[{id:'gate',label:'Front gate (keypad code)',req:{photo:['keypad']}},
           {id:'roof',label:'Roof (Linda\'s ladder)',req:{gear:['ladder']}},
           {id:'fence',label:'Cut the back fence',req:{gear:['cutters']}}],
  gear:[{id:'ladder',label:"Linda's ladder",where:'Linda, Elm St',cost:0,due:'Sunday'},
        {id:'walkies',label:'Walkie-talkies',where:"Hank's",cost:60}, ...]};
M.plan={assign:{driver:'rick',lookout:'doug',muscle:'dave',tech:'gary'},entry:'roof',gear:new Set(['ladder','walkies'])};
```

**Aptitudes (1–3 stars):**

| | driver | lookout | muscle | talker | tech |
|---|---|---|---|---|---|
| Gary | 1 | 1 | 1 | 2 | **3** |
| Rick | 2 | 2 | 2 | 2 | 1 |
| Big Dave | 2 | 1 | **3** | 2 | 1 |
| Doug | 1 | **3** | 2 | 1 | 2 |
| Rosa | 2 | 2 | 2 | 2 | 1 |
| Earl | **3** | 2 | 1 | **3** | 1 |

**Effects by stars (1/2/3):** driver → getaway AI `max` +0/+1.5/+3 m/s and path error 1.2/0.8/0.4 m; lookout → warnings 2/4/6 s before a guard turns toward you; muscle → the guards they engage surrender +0/10/20%, and their HP ×1/1.15/1.3; talker → the clerk is busy for 60/90/120 s; tech → the camera loop lasts 45/75/120 s. A strand perk adds +1 star in that crew member's best role.

**UI:** a card with four sections: **Roles** (each role a row; tap the row, then tap a crew chip; one crew per role; unfilled required roles block "Go"), **Gear** (a checklist with where to get each item and whether you have it; missing gear greys out the options it unlocks, with the reason), **Entry** (radio options with lock reasons), and **Forecast** (2–4 plain lines: "Rick drives. Chasers lose you about 1.5 s faster."). Keys 1–9 and touch. The same card shape works for *Brake Check*'s play choice and the finale's stage briefs.

**Persistence:** `SAVE.jobs.heist.plan` (it survives retries and reloads); `SAVE.gear` holds borrowed items with a due day (a returned-on-time item gives +1 trust in its neighbourhood, a late one −1 and a feed line from the owner).

**Tests:** `node dev/plan.test.js` (one crew per role, required roles, gated entries carry the right reasons, the effects table). UI screenshots at 1280×720 and 390×844. An in-game check that the driver's stars change the getaway AI's `max`.

### 4.6 [SOCIAL] Disguise, cover, conversations, the politeness buffer

**Module:** `js/social.js` (`HT.Social`), plus `css/social.css`. **Owner:** the conversation engine is built in wave 1 with *Small Talk*. Disguise and cover are added in wave 3 with *Grand Opening*, in the same file but a separate section (`/* ---- disguise ---- */`), after wave 1 merges.

**(a) Conversation engine:**
```js
const C=HT.Social.convo({npc:'tre', mood:'bored', rapport:0, awkward:0, win:80, lose:100, rounds:[
  {prompt:"...", options:[{reg:'joke',text:"...",reply:"...",to:'defensive'},{reg:'real',...},{reg:'over',...}]}, ...]});
C.pick(i) -> {rapport, awkward, mood, reply, done:'win'|'lose'|null}
HT.Social.check({mood, options}) -> one-round version for doorsteps and talk-downs
```

Rapport (and awkward) per pick, by the NPC's current mood:

| mood \ register | joke | real | overshare | compliment |
|---|---|---|---|---|
| bored | +18 (0) | +6 (+5) | +10 (+8) | +4 (+10) |
| scared | −2 (+15) | +20 (0) | +8 (+5) | +5 (+5) |
| defensive | +4 (+5) | −5 (+10) | +18 (0) | +8 (+5) |
| friendly | +10 (0) | +10 (0) | +10 (+2) | +10 (0) |

Each option also names the mood it moves the NPC to. The current mood is shown as a body pose **and** as a bracketed subtitle tell ("[Tre looks away.]") for accessibility. UI: a dialogue strip at the bottom of the screen, 3 buttons (keys 1–3, tap), the two meters as `bar` meters.

**(b) Disguise and cover:**
```js
P.disguise={id:'press'|'cousin'|'mustache', cover:max, max}   // max: press .9, cousin .85, mustache .7
def.zones=[{x0,z0,x1,z1,kind:'public'|'staff'|'restricted', access:['cousin']}]
```

| While a civilian or staff member has LOS within 10 m | Cover per second |
|---|---|
| Running | −0.08 |
| Crouching (weird) | −0.05 |
| In a staff or restricted zone without access | −0.12 (press −0.18, cousin −0.06) |
| Carrying an item | −0.04 |
| Standing or walking in public | +0.02 (up to `max`) |
| A conversation won / lost | +0.15 / −0.10 |

**Politeness buffer:** when cover drops below 0.35 while an observer has LOS, that observer starts a **politeness timer** of 4–8 s (×1.5 with the mustache, because everybody's too polite), shown as a "…" bubble. Leaving its LOS, starting a conversation with it, or recovering cover above 0.45 cancels it. When it runs out: "Excuse me…", cover −0.3, and that observer watches you (they become a [STEALTH] observer with fill ×1.5 for 20 s). Cover 0 → the job's soft fail. `M.noGuns` blocks drawing (`JH.fire`), with a line.

**Tests:** `node dev/social.test.js`: every cell of the table, mood transitions, win and lose ends; cover rates under each condition; politeness timer start, cancel and expiry; the mustache multiplier. In-game: *Small Talk* played to a win along a scripted pick list, and to a lose (reset). Screenshots in `docs/screenshots/social/`.

### 4.7 [CP] Stage checkpoints and retry

**Where:** `index.html`, section *WORLD MISSIONS*, done in wave 0. It generalises the existing `M.checkpoint` ("Retry the chase" in `work/riverside-jobs`).

```js
def.stages=['scope','gear','plan','execute'];             // optional; one implicit stage if absent
CP.mark(stage)  // at the start of a stage: snapshot={stage, player:{x,z,yaw,hp,weapons,ammo,car}, crew:[{id,x,z}],
                //   cars:[borrowed car ids and poses], job:JOB.save(M)}  (JSON, max 16 KB)
startMissionWorld(i,{checkpoint:snap})  // -> JOB.start(M,{checkpoint}) -> JOB.load(M,snap.job)
```
Rules: one snapshot per stage, kept in memory (`SAVE.jobs[id].plan` and `SAVE.gear` are what survive a reload). The fail card offers **Retry from <stage>** and **Restart job**. A retry sets `M.retried=true`, and gold medals require `!M.retried`. A stage retry refills ammo to the snapshot, not to full. **Tests:** `node dev/cp.test.js` checks a `save`/`load` JSON round trip for every registered job (the registry runs it automatically for each job file), and the in-game harness retries every stage of *Good Fences* once.

### 4.8 [CAL] Mission replay from the home calendar

**Module:** `js/calendar.js` (`HT.Calendar`), plus the home interactable through `JH.home('calendar')` (the cork-board calendar already exists in `js/home.js`; wave 0 makes it an interactable with id `calendar` and adds a fridge-magnet one at the fridge). **Owner:** a system-only worker in wave 2.

**Data:** `SAVE.day` (in-game days: +1 per sleep or per finished story job), `SAVE.calendar={entries:[{id,day,medal,best:{t,trustGain,clean},runs}]}`.

**Card** (`#cCal`, `.card` markup): a month grid. Each finished job is pinned on the day it was finished, with its title, its medal (bronze/silver/gold pin) and the giver's face. Upcoming items appear as sticky notes: available jobs and their givers, and the side activities on their days (*Suds Up* on Saturdays). Tapping a pin opens the details: best time, the medal criteria in plain words (from the job's `medal` description strings), what changed in the world because of it (the household or storefront), and **Replay**.

**Replay rules:** half pay (SPEC2 reruns); trust gains ×0.25; no story flags, households or storefronts change; `activateSite` builds the **pre-job** dressing for the site (it ignores `WM_AFTER` while `M.replay`); a medal upgrade pays +$100 (silver) or +$250 (gold) once. The photo album is a tab on the same card.

**Tests:** `node dev/calendar.test.js` (v2 → v3 migration; pins by day; medal upgrade pays once; replay never sets `done` again or changes `households`). In-game: replay *Fourth Quarter* from the calendar and check the duplex is back to its pre-job dressing.

### 4.9 Small shared pieces (owned by the first job that needs them)

| Piece | Where | Owner (wave) | Used later by |
|---|---|---|---|
| Walking escort helper (`HT.Escort`: a path, a wait radius, stop-on-threat, follow chains) | `js/jobs/_escort.js` | *Higher Ground* (1) | *Crossing Guard* (3), finale |
| Stop-schedule helper (timed stops with windows and passengers) | `js/jobs/_stops.js` | *Dad Taxi* (1) | *Dad Taxi* rides, *Watch Your Step*, *Hitch Happens* |
| Race line and checkpoints | `js/jobs/_race.js` | *The Grass Is Greener* (1) | the time trial |
| `VEH.mower` and the mower model | `js/carai.js`, `js/vehicles.js` | *The Grass Is Greener* (1) | the garage unlock |
| Tyre hit zones on AI cars (computed from the car pose inside the job, no module change) | `js/jobs/overwatch.js` | *Higher Ground* (1) | finale |
| Night mood `MOODS.night` | `index.html` *SKY + ENVIRONMENT* | *Sign of the Times* (2) | patrols, *Good Fences* |
| Tyre-deflate visual | `js/vehicles.js` (`HT.Vehicles.deflate(car,i)`) | *Sign of the Times* (2) | — |
| Prop placement (cones, sawhorses, signs; speed caps and edge blocks) | `js/jobs/_props.js`, plus `ctx.speedCap` in `js/carai.js` and an edge-cost override in `js/roadgraph.js` | *Cone Zone* (3) | finale |
| `AI.ally` role commands (`lift`, `cover`, `go`) | `js/ai.js` | *Heavy Lifting* (3) | Rick's perk |
| Foot-chase runner (`flee` on `AI.buildNav` with a bike speed option) | `js/jobs/_runner.js` | *Chain Reaction* (4) | *Hands Off*, *Porch Light* |
| Laptop "Neighbourly Resale" tab | `js/save.js` menus | *Chain Reaction* (4) | *Porch Light* (Dadazon tracking) |

---

## 5) Build order

**Before wave 0:** merge `work/riverside-jobs`, `work/riverside-heat` and `work/car-damage` into `main`. Several designs build on `WJ`, `wmCarry`, `chaseUpdate`, `M.checkpoint`, `frIncident` and `carHp`.

**Wave 0 (one worker, about 3 days, must merge first):** the job registry and hook points (4.0), HUD meters and overlay, save v3, all new sites and pins in `js/worldgen.js`, [CP] (4.7), and the `calendar` and fridge interactables in `js/home.js`. **Regions touched:** `index.html` sections *AI*, *MINIVAN*, *PLAYER*, *MISSION LOGIC*, *WEAPONS*, *HUD*, *META*, *WORLD MISSIONS*; `js/hud.js`; `js/save.js`; `js/worldgen.js`; `js/home.js`. **After wave 0, no worker edits any of those regions** except where the ownership table below gives a named exception.

**Ownership rule for every later wave:** a job worker owns `js/jobs/<id>.js`, `dev/jobs/<id>.js` (in-game harness: giver → scripted completion → payout, like `dev/riverside-ingame.js`) and `docs/screenshots/jobs/<id>/`. A system worker also owns its module file. Shared files (`js/ai.js`, `js/carai.js`, `js/roadgraph.js`, `js/vehicles.js`, `js/save.js`, `index.html` *SKY*) have **at most one owner per wave**, named below.

### Wave 1: maximum variety per unit of work (5 workers in parallel)

| Job | Verb | Size | Owns (new files) | Shared-file exception | Why it's in wave 1 |
|---|---|---|---|---|---|
| *Dad Taxi* | timed driving with passengers | M | `jobs/taxi.js`, `jobs/_stops.js` | — | The first job that isn't about a den; teaches driving; uses only GPS, markers, seats |
| *Honey-Do Blitz* | fix-it spree, score attack | S | `jobs/blitz.js` | — | Smallest job; permanent world changes; repeatable from day one. Ships with fences, lamps, carts and the cat if SPEC2 A.7 graffiti isn't merged yet |
| *Small Talk* | dialogue | S | `jobs/talk.js`, `js/social.js` (conversation part), `css/social.css` | — | Builds the conversation engine that 5 later jobs reuse |
| *The Grass Is Greener* | race | M | `jobs/mower.js`, `jobs/_race.js` | `js/carai.js` (`VEH.mower`), `js/vehicles.js` (mower model) | A light-hearted trust event and a new vehicle |
| *Higher Ground* | overwatch | M | `jobs/overwatch.js`, `jobs/_escort.js` | — | Uses the hunter and beanbag, which no job uses yet; builds the escort helper |

That gives 5 different main verbs (T, So, fix, race, P) for about 10 worker-days. Only one shared system is built here (conversations), and two helpers that wave 3 reuses. No wave 1 job needs stealth, towing, photos or the roles card.

### Wave 2: the big systems, each built with the job that needs it most (5 job workers + 1 system worker)

| Job / system | Size | Owns | Shared-file exception |
|---|---|---|---|
| *Sign of the Times* + [STEALTH] | M + system | `jobs/sabotage.js`, `js/stealth.js` | `js/ai.js` (`a.blind`), `index.html` *SKY* (`MOODS.night`), `js/vehicles.js` (deflate) |
| *Exhibit HOA* + [PHOTO] | M + system | `jobs/hoa.js`, `js/photo.js` | — (uses `HT.Stealth` through its frozen API from 4.1; the stealth worker publishes a stub on day 1) |
| *Following Distance* + [TAIL] | M + system | `jobs/tail.js`, `js/tail.js` | — |
| *Hitch Happens* + [TOW] | M + system | `jobs/tow.js`, `js/tow.js` | `js/carai.js` (`towMul`, the `hitch` catalog item) |
| *Handle With Care* | S | `jobs/cargo.js` | — (reads acceleration from the car, potholes from `WORLD.potholes`) |
| [CAL] (system only) | M | `js/calendar.js` | — |

### Wave 3: Riverside, on foot and social (5 workers)

| Job | Size | Owns | Shared-file exception |
|---|---|---|---|
| *Crossing Guard* | M | `jobs/crossing.js` | — (uses `_escort.js`, `HT.Social.check`, the free-roam crews) |
| *Grand Opening* | L | `jobs/pawn.js`, the disguise section of `js/social.js` | — |
| *Cone Zone* | M | `jobs/cones.js`, `jobs/_props.js` | `js/carai.js` (`ctx.speedCap`), `js/roadgraph.js` (edge-cost override) |
| *Heavy Lifting* | M | `jobs/moving.js` | `js/ai.js` (`AI.ally` role commands) |
| *Hands Off* | M | `jobs/arrest.js` | — (photo, social check, beanbag) |

### Wave 4: Act 3 systems and set pieces (4 workers)

| Job | Size | Owns | Shared-file exception |
|---|---|---|---|
| *Brake Check* | L | `jobs/brake.js` | `js/tail.js` (adds `slot`, `boxed`) |
| *Minivan Roundup* | M | `jobs/roundup.js`, `js/convoy.js` | — |
| *Chain Reaction* | M | `jobs/bike.js`, `jobs/_runner.js` | `js/save.js` (laptop Resale tab) |
| *Good Fences* + [ROLES] | L + system | `jobs/heist.js`, `js/crewplan.js`, `css/plan.css` | — |

### Wave 5: repeatables and the finale (4 workers)

| Job | Size | Owns | Shared-file exception |
|---|---|---|---|
| *Watch Your Step* | S | `jobs/patrol.js` | — |
| *Porch Light* | S | `jobs/porch.js` | — |
| *Suds Up* | S | `jobs/carwash.js` | — |
| *Everybody Waves* | L | `jobs/finale.js` | — (stages call the other jobs' exported stage functions; nothing is copied) |

**Per-wave definition of done:** every job's `dev/jobs/<id>.js` harness passes (giver → completion → payout → trust → calendar pin); `node dev/cp.test.js` round-trips every job; frame time in the job stays within the SPEC2 A.4 budget (`docs/PERF.md`); screenshots at desktop and phone sizes; no AI model names in files or commits.

---

## Appendix: what each new mission reuses (quick matrix)

`●` = core, `○` = light use.

| Job | den combat | zip-tie | carry | BORROW | chase | CarAI follow | AI squads | STEALTH | TAIL | PHOTO | TOW | ROLES | SOCIAL | CP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Following Distance | | | | ● | | ● | | | ● | ○ | | | | ● |
| Exhibit HOA | | | | ○ | | | | ○ | | ● | | | ○ | ● |
| Hitch Happens | ○ | ○ | | ○ | | ● | ○ | | | | ● | | ○ | ● |
| Dad Taxi | | ○ | | | | ● | | | | ○ | | | | ○ |
| Brake Check | | ● | | | ● | ● | | | ● | | | ○ | | ● |
| Good Fences | ● | ● | ● | ● | ● | ● | ● | ● | | ● | ○ | ● | ● | ● |
| Grand Opening | | | | | | | | ○ | | ● | | | ● | ● |
| Higher Ground | | ● | | | | ● | ● | | | | | | | ● |
| Cone Zone | ○ | ● | ● | ● | ○ | ● | ● | | | | | | | ● |
| Heavy Lifting | ● | ● | ● | | | | ● | | | | | | | ○ |
| Crossing Guard | | | | | | ● | ○ | | | | | | ● | ● |
| Minivan Roundup | | ○ | | ● | ● | ● | | ○ | ● | | ○ | | | ● |
| Grass Is Greener | | ○ | | | | ● | | | | | | | | |
| Sign of the Times | | ● | ● | | | | ● | ● | | ○ | | | | ● |
| Small Talk | | | | | | | | | | | | | ● | |
| Chain Reaction | ○ | ● | | | | | ○ | | ○ | ● | | | ● | ○ |
| Honey-Do Blitz | | | ● | | | | | | | | | | | |
| Handle With Care | | | ○ | | | ● | | | ● | | | | | ● |
| Hands Off | | ● | | | | | | | | ● | | | ● | ● |
| Everybody Waves | ● | ● | ● | ● | ● | ● | ● | ○ | ● | ● | | ○ | ○ | ● |
| Watch Your Step | | ○ | | | | | ○ | | | | | | ○ | |
| Porch Light | | ● | ● | | | ● | | | | | | | | |
| Suds Up | | ○ | | | | ● | | | | | | | ○ | |
