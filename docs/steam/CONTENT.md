# Content pass: Steam content survey, age ratings, brands and originality

Audit date: 2026-11-21. Read-only sweep of `index.html`, `js/*.js`, `js/jobs/*.js`, `assets/people/rocketbox/characters.json` and the docs. Dialogue, sign and graffiti strings were found by grep, and the key findings below were re-checked by hand at the cited lines.

Severity key: **HIGH** = fix before submission (legal or content-rule risk, or a stated design rule is broken). **MED** = fix, or accept it knowingly. **LOW** = noted, probably fine.

## State after the release-content pass (2026-11-21, branch `work/release-content`)

The findings below are the original audit notes. This section says what changed since. Job ids and save keys are unchanged.

Owner's scope for brands and originality: change only what is a real legal or store-review risk: copied trade dress or logos, or a real organisation or person shown doing wrong or disparaged. Ordinary passing mentions in dialogue, UI and signs stay verbatim.

### Changed (real risk)

| Old | New | Why | Where |
|---|---|---|---|
| Dadazon trade dress: navy `#232f3e`, orange `#ff9900` wordmark, `#ffa41c` stars, `#b12704` prices, blue smile stripe on porch boxes, orange stickers/uniform, navy van | Name kept. Lawn-green `#2e5e3e` header, cream serif wordmark, tagline "IT'S HERE WHEN IT'S HERE", blue stars, green prices; a small green stamp instead of the stripe; green stickers, courier uniform and delivery van; the shop icon shows a little house instead of the curved mark | copied trade dress | home.js, index.html, save.js, porch.js, patrol.js |
| Rotary Club / ROTARY vest (25% of runs make that collector the fraudster) | the Golden Spatula Club / SPATULA vest ("Flip for it!") | real organisation shown as a fraudster | arrest.js, SPEC3.md |
| Riverside Scouts / SCOUTS vest (same random fraudster pick: the skimmer is any of the 4 collectors) | Riverside Trail Club / TRAIL CLUB | same | arrest.js |

### Reviewed, low risk, kept per owner

Each was checked for disparagement or implied endorsement: none is shown doing wrong or copies a logo or trade dress.

| Mention | Where | Verdict |
|---|---|---|
| Costco ×5 ("You lost, Costco?", "Wrong car, Costco.", "Mine is Costco.", "the Costco on Route 9", "Wore it to Costco") | index.html, openworld.js, pawn.js, talk.js | passing mention, reviewed, low risk, kept per owner |
| Walgreens parking lot | talk.js | reviewed, low risk, kept per owner |
| Gatorade | crossing.js | reviewed, low risk, kept per owner |
| Buick (Barb's sister's car; Pam's car label in Cone Zone; neither is drivable) | hoa.js, cones.js | reviewed, low risk, kept per owner |
| Sienna, Corolla | ai.js, taxi.js | reviewed, low risk, kept per owner |
| Super Soaker (Kevin's toy) | overwatch.js | reviewed, low risk, kept per owner |
| Mario Kart, Minecraft, Disney strap, Roomba, crockpot, Rocket Pop, Little League | home.js, patrol.js, heist.js, tank.js, jet.js, index.html, taxi.js | reviewed, low risk, kept per owner |
| Obama ("a granola bar from the Obama administration"), Springsteen ("It's mostly Springsteen.") | eggs.js, home.js | neutral real-person references; reviewed, low risk, kept per owner |
| "You can't stop Prime Day!" | ai.js | reviewed, low risk, kept per owner |
| KIDZ 98 "All bop, all day", SMOOTH 88.3 | _stops.js | parody station names; reviewed, low risk, kept per owner |
| BENNY'S BRAIN FREEZE (truck, depot sign, job title) | openworld.js, worldgen.js, _finale-street.js, index.html | common phrase; reviewed, low risk, kept per owner |
| QUIKSTOP · OPEN 24 HOURS, SAV-MOR · BEER · SNACKS · ICE (shop signs) | buildings.js | generic-looking store names, nobody shown doing wrong; kept per owner |
| Poster "THE MULCHERS · live · Elks Lodge · Fri" | world.js | a band gig, nothing disparaging; kept per owner |
| NightOwl Gen-1 Goggles (shop item) | save.js | kept per owner |
| Weekend Nailer yellow + black | guns.js | kept per owner |
| The Suburbanite, SUBURBAN PRIDE, Spin City, LAWN ORDER | carai.js, vehicles.js, worldgen.js, tank.js | ordinary words or puns; reviewed, low risk, kept per owner |

A fresh grep for ~100 common brands, vehicle makes and products over `js/` and `index.html` finds nothing else. All sign and vehicle lettering is procedural canvas text; the only image texture with content (tex2/interiors.jpg) carries no lettering. No vehicle a player drives carries a real make or model name.

### Originality
- "End of the Line" is **kept** (a common phrase; titles are not protected).
- The heat meter, TURF WAR banner and turf map are **kept as they were**: they reuse no asset from another game. (A restyle was tried on this branch and reverted.)

### Enemy presentation (owner rules)
- Every encounter draws from the balanced pool: the four looks loaded first (and preloaded by the Maple raids and by Brake Check, Cone Zone, Heavy Lifting, Following Distance and Hitch Happens) are now `thug_hoodie`, `thug_red`, `thug_cap`, `thug_jacket` (2 darker, 2 lighter by the albedo estimate in section 7). The shuffle bag for the `thug` role now alternates the two halves of the 10-look pool (darker half: hoodie, cap, track, fro, beanie), so consecutive spawns never stack one way. Named pairs fixed: Brake Check ATM thieves (hoodie + jacket), Exhibit HOA crew (driver hoodie, loaders track + jacket, buyer red, lookout brown), Watch Your Step porch pirate (red).
- Allies, crew and family untouched. Nobody gains religious dress or symbols. The church building is unchanged (owner's call).
- "Hoodie" caption on every enemy bark → **"Crew"** (overwatch fallback too). Callouts "Twelve o'clock, hoodie!" → "Twelve o'clock, one guy!", "Hoodie {where}!" → "Somebody {where}!", "Bring the good hoodies!" → "Bring the cousins!", "My good hoodie!" → "My good jacket!". The porch-pirate description "Gray hoodie. Tote bag." → "Tote bag. Fast walk." (porch.js, patrol.js). Overwatch target descriptions say "zip-up" instead of "hoodie".
- Shop text "from thugs" → **"from crooks"** (save.js, both places). Internal `thug_*` keys are not renamed (not user-visible; renaming would touch save data and every job).
- Fellowship Hall lookouts Marcus / Andre / DeShawn → **Owen, Mateo, Jayden**.
- Graffiti: KINGZ → ZOOM, PPK (also a pistol model name) → WAFFLE, NO SNITCH → BLOOP; the crowned DUKE tag → FIZZ with bubbles instead of a crown.

Not in this pass (other workers or owner decisions; **since done in code**: free roam refuses to draw within 25 m of a kid or family member, `frDraw`/`kidNear` in index.html, and Kevin is out of the rifle's hit list with a hold-fire refusal, js/jobs/overwatch.js; re-verify with `node dev/kids-safe.e2e.js`): Kevin in *Higher Ground* and the free-roam 25 m rule (fix list 1-2), more than one neighbour-child model, the church cross, the two "Families are …" lines, store copy, Doug's uniform check.

Screenshots: `docs/screenshots/release-content/`.

## Design-rule verdicts

| Rule | Verdict | Evidence |
|---|---|---|
| No guns drawn within 25 m of family or children | **Fixed in code since this audit** (free roam `frDraw` refuses near a kid/family, overwatch keeps Kevin out of the hit list; re-verify with `dev/kids-safe.e2e.js` before the survey). Original verdict: **VIOLATED in 2 places**, partially elsewhere | Enforced in `arrest.js:30/648/807`, `bike.js:28/526`, `moving.js:28/521`, `_finale-street.js:118/207/226`, and in whole-job `noGuns` jobs. **Not enforced:** (1) *Higher Ground*: Kevin (9, `nb_kid`) is a valid rifle and beanbag target (`js/jobs/overwatch.js:394`, `412`, `528-529`). (2) Riverside free roam: `frDraw` (`index.html:3281-3290`) never checks distance to `nb_kid`/`nb_teen` porch neighbours or the chalk/bike kids (`js/openworld.js:1290-1312`). Minor: fleeing 12-year-old lookouts as the *Fellowship Hall* raid starts (`index.html:3955`, `3967`). Narrative only: "Families are behind the bounce house" (`index.html:1001`) and "Families are in the church hall" (`index.html:3598`) during wave gunfights. |
| Enemy cast is a mixed pool, no group in the majority | **Fixed 2026-11-21** (balanced draws, Crew caption, new lookout names). Original: **Pool passes, presentation fails** | The 10 street-crew variants are about evenly split darker/lighter (heuristic from head-texture albedo; confirm by eye). But the 4 looks that load first and fill the 4 Maple raids (`index.html:154`) are 3 darker to 1 lighter. The darkest model is the one keyed `thug_hoodie`. All 5 dads and the family are light-skinned. Every enemy bark is captioned **"Hoodie"** (`index.html:2325`). Child lookouts are named "Marcus", "Andre" and "DeShawn" (`index.html:3940`). |
| No religious dress or symbols on anyone | **Passes for people.** Fails if the rule covers buildings | Pastor Dee wears a plain suit (no collar or cross). The Riverside church **steeple has a cross** (`js/openworld.js:554`). `crossing.js:15` restates the rule. Decide whether buildings count; the simplest fix is a plain steeple or a "community hall". |
| Signage and graffiti generic | **Graffiti fixed 2026-11-21**; QUIKSTOP, SAV-MOR and the Elks poster reviewed and kept per owner. Original: **3 violations** | Graffiti "NO SNITCH" and "KINGZ" (`js/world.js:99`), and a crown drawn over "DUKE" (`js/openworld.js:153`), are gang-coded. Signs "QUIKSTOP" and "SAV-MOR" (`js/buildings.js:1141`) are real chain names, and the poster "Elks Lodge" (`js/world.js:111`) is a real organisation. |
| Original (no recreation of a specific game) | **Passes (owner, 2026-11-21):** no copied assets; the title and the heat/turf systems stay. Original note: **Mostly passes.** One exact name clash, two system echoes | "End of the Line" (`index.html:3573`, `js/save.js:26`) is the title of the final *GTA: San Andreas* mission; rename it (e.g. "Last Stop", which suits Earl, a retired bus driver). The 0–5 Heat meter with escalating responders and "TURF WAR" banners, plus coloured gang turf on the map, sit close to GTA wanted stars and San Andreas territories. Parody radio stations are a genre convention. No "Wasted", "Busted", "Mission Passed", Pay 'n' Spray or star icons. Music is procedural and original; horn tunes are public domain. |

## Fix list, in priority order

1. **Higher Ground:** remove Kevin from the rifle's ray targets. Make the scope refuse to fire with a child within 25 m of the line of fire, as the finale roof already does. Move him 25 m or more from any line of fire. Stop equipping a hidden real beanbag gun on the child model (`overwatch.js:521`).
2. **Riverside free roam:** add a 25 m child/family check to `frDraw`, plus an auto-holster when a kid or teen comes within 25 m. Also suppress kid porch spawns while heat > 0, or keep them off crew turf.
3. **Coded presentation:**
   - Replace the "Hoodie" caption and callouts (e.g. "Crew" or the crew name, such as "Coupon Boys").
   - Replace "thugs" in the shop text (`js/save.js:1296`, `1599`).
   - Rebalance the first-loaded 4 enemy looks (put a lighter variant in).
   - Rename `thug_*` keys (they show in dev tools and mods).
   - Give child NPCs more than one model (every non-family child uses the darkest child model, `nb_kid`).
   - Reconsider the lookout names.
   - Consider diversifying the dads or the family.
4. **Dadazon:** it copies Amazon's trade dress (exact `#232f3e`/`#ff9900`/`#ffa41c`/`#b12704` palette in `js/home.js:157-159`, a blue "smile" stripe on boxes at `index.html:2894`), and an enemy says "You can't stop Prime Day!" (`js/ai.js:293`). Rename it, recolour it and redraw the boxes.
5. **Brand sweep:** see the table in section 5 below. Costco ×4, Walgreens, Gatorade, Buick (about 30 lines, including UI prompts), Sienna, Corolla, Super Soaker, Mario Kart, Minecraft, Disney, Roomba, Crockpot, Rocket Pop, Little League, Rotary Club (a quarter of runs make the Rotary collector the fraudster: `arrest.js:73`, `786`), Elks Lodge, QUIKSTOP, SAV-MOR, KIDZ 98, NightOwl, the yellow/black nailer (DeWalt trade dress), Obama (`js/eggs.js:110`), Springsteen (`js/home.js:1269`).
6. Rename "End of the Line". Consider reshaping the heat meter and turf map.
7. Replace the graffiti "NO SNITCH", "KINGZ" and the crown on "DUKE".
8. Decide about the church cross. Reword the two "Families are …" lines.
9. **Store and meta copy:** drop "taking their neighborhood back" (`index.html:5`, `9`, `17`). Lead with de-escalation instead (STORE.md already does).
10. **Doug's model** is a retextured Rocketbox `Police_Male_06`. Check it by eye for leftover police insignia, duty belt or radio.

About "Costco in a traffic bark": the word appears 4 times, but none is in traffic AI. Two are street-crew barks, "You lost, Costco?" (`index.html:3103`, free-roam notice bark) and "Wrong car, Costco." (`index.html:3422`, car break-in incident). The other two are dialogue: `js/jobs/pawn.js:163` and `js/jobs/talk.js:105`.

## Steam content survey: suggested answers

Sections per [Steamworks content survey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey). Answer them **after** fixes 1–2 are re-verified (both are in the code now; run `node dev/kids-safe.e2e.js` and check Higher Ground's 25 m distance), otherwise "violence involving children" becomes a truthful answer.

- **Violence:** frequent realistic gun violence against human adults. No blood, gore or dismemberment (hits make grey cloth puffs, `index.html:2125`). Enemies can be killed, or made to surrender and be zip-tied. A non-lethal beanbag gun exists. Killing a surrendered enemy is possible but penalised (−10 trust and condemned by allies and family, `index.html:2156`). Civilians, neighbours, family, animals and police cannot be harmed by the player's guns; they are not hit targets. Pedestrians cannot be run over (`index.html:3843`). There are no explosives except smoke bombs. The tank and jet cannot hurt anyone. Police never appear on screen.
- **Mature content (general):** gun violence; implied drug dealing (stash "bricks" and a scale; "pills" sold to teenagers is the premise of *Fourth Quarter*, `index.html:974`); detention of people with zip-ties, including two teenage bike thieves in *Dad Taxi* if the player chooses (`js/jobs/taxi.js:393-402`).
- **Language:** no profanity or slurs (wordlist sweep: 0 hits). The mildest words are "Oh my god", "dirtbag", "idiots" and "stupid".
- **Alcohol:** one shop sign reads "BEER" (`js/buildings.js:1141`); everyone drinks root beer. **Tobacco:** none. **Gambling:** a LOTTO sign, a raffle and a $20 bet in dialogue. **Simulated gambling (in-game currency only):** at Sensible Dragway (`js/dragstrip.js`, `docs/dragstrip.md`) the player can bet in-game cash on drag races (their own and AI races), with shown odds, $10-100 bets, daily caps and a cash floor; no real money, no purchases, nothing can be cashed out. Answer the survey's simulated-gambling question yes. **Sexual content and nudity:** none.
- **Generative AI disclosure:** **yes, pre-generated.** Seven models from the "Pixel Art Atlas" dataset are listed by their publisher as AI-generated (LICENCES.md B5). Declare them, or replace them and answer no. Also declare any AI-assisted code or text if the owner's policy says so; Valve asks about content "created with the help of AI tools during development". No live-generated AI content.
- **Expected ratings** (self-assessment, not an official rating): PEGI 16 / USK 16 (realistic weapons, people killed, killing defenceless people possible), ESRB T/M borderline (probably M because of the executions and drug references). Germany hides unrated games, and Valve's self-rating from the survey counts as a rating ([contentsurvey/germany](https://partner.steamgames.com/doc/gettingstarted/contentsurvey/germany)).
- **Political optics** (not a survey question, a reputational one): the title "High Trust", white suburban dads against a more diverse neighbourhood across the bridge, "taking their neighborhood back", the "Hoodie" label and a "Neighborhood Watch" dad with binoculars together risk a racial-vigilante reading. That reading can be fixed, and the game's text works against it: kills cost trust, mercy is the core mechanic, Riverside residents give the jobs, and detainees get second chances. Fixes 3 and 9 matter as much as the legal ones.

---

The full evidence follows. It is the audit notes, with exact strings and file:line for every finding.

## 0. Headline findings (most important first)

1. **HIGH: a 9-year-old child can be shot with a sniper rifle.** In *Higher Ground* (`js/jobs/overwatch.js`), "Kevin" (model `nb_kid`, "Kevin is nine") aims a Super Soaker at Gary. His hitboxes are added to the rifle's ray targets (overwatch.js:394), and a hit, beanbag or **live .308**, calls `kevinShot` (overwatch.js:412, 528-529): -10 trust and a mission fail, "You beanbagged Kevin. Kevin is nine…". The design tests whether you shoot a child. There's no hit FX on Kevin, but the player can aim and fire at a child, and the shot registers as a hit. That breaks the "no guns drawn within 25 m of children" rule in spirit and is a ratings red flag (Germany/Australia especially). The roof itself is about 20-40 m away. Note `docs` header line 12 says "no family members in this job", but a neighbourhood child is present.
2. **HIGH: the 25 m "no guns near family/children" rule is NOT enforced in Riverside free roam.** `frDraw` (index.html:3281-3286) checks only region, the base, and the trust tier. It never checks distance to children. Riverside porch neighbours include `nb_kid` (boy about 10) and `nb_teen`: as an ordinary porch neighbour from the shuffled bag (people.js:22, openworld.js:1290-1312) and as the "chalk/bike" kid on blocks at tier 3 or higher (openworld.js:1305-1306). Street-crew gunfights (heat 1-5, reinforcement cars, three-way turf wars) run on the same streets until overall Riverside trust reaches tier 5 (FR_TIER, index.html:3097). Neighbours don't react to heat, gunfire or drawn guns.
3. **HIGH: racial-coding risk in the enemy presentation.**
   - Every enemy bark is captioned with the speaker name **"Hoodie"** (index.html:2325). Ally callouts say "Twelve o'clock, hoodie!" and "Hoodie {where}!" (ai.js:298, 302). Overwatch threats default to "Hoodie" (overwatch.js:503, 509). Combined with a "Neighborhood Watch" dad with binoculars (Doug, index.html:1017 and the patrol job) and armed suburban dads, this closely echoes the Trayvon Martin / George Zimmerman case.
   - The shop UI tells the player to collect guns **"from thugs"** (save.js:1296, 1599). "Thug" is the internal role name throughout and also an audio voice key.
   - A model key is literally `thug_fro` (people.js:19), used for enemies and for "DJ Layaway" (pawn.js:66).
   - Skin-tone estimate (albedo median of each head texture, so treat as approximate; see section 7): the 4 enemy looks that always load first (`thug_hoodie`, `thug_track`, `thug_beanie`, `thug_red`, index.html:154; people.js:25) are 3 dark/medium-dark and 1 light. The darkest model in the game is `thug_hoodie`. All 5 dads and the player's family are light-skinned. Across all 10 street-crew variants the split is about 5 darker to 5 lighter, so the *pool* is mixed. The early game (the 4 Maple raids) and the named enemies (ATM thieves in brake.js:220, `thug_hoodie` and `thug_track`) skew darker.
   - In *Fellowship Hall*, the 12-year-old drug lookouts are given the names "Marcus", "Andre", "DeShawn" (index.html:3940). They use the `son` model tinted toward a hoodie colour (index.html:3928-3930).
   - Graffiti includes "NO SNITCH" and "KINGZ" (world.js:99). The "DUKE" tag has a crown drawn over it (openworld.js:153), and crowns are Latin Kings iconography. Graffiti only appears in Riverside (worldgen.js:426).
4. **HIGH: "Dadazon" is Amazon trade dress, not just a parody name.** The laptop screen (home.js:157-159) uses Amazon's exact palette: `#232f3e` navy header, `#ff9900` orange lowercase wordmark, `#ffa41c` star rating, `#b12704` price red. Porch boxes carry a blue "smile" stripe under the label (index.html:2894). Enemies taunt "You can't stop Prime Day!" (ai.js:293). Recommend a new name, colours and box art.
5. **HIGH (trademark density):** "Costco" ×4, "Walgreens" ×3, "Gatorade" ×2, "Buick" (about 30 user-facing lines in hoa.js and cones.js), "Sienna", "Corolla", "Super Soaker" ×3, "Mario Kart", "Minecraft", "Disney", "Roomba", "Crockpot", "Rocket Pop", "Little League", "Rotary Club" (a real charity, worn by a possible fraudster), "Elks Lodge", and the politician "Obama". Full table in section 5.
6. **MED: an exact GTA mission-name match.** Earl's Riverside job is titled **"End of the Line"** (index.html:3573; save.js:26), which is the final mission of *GTA: San Andreas*. Also MED: the 5-level heat meter with escalating reinforcement cars, coloured gang turf on the map, and "TURF WAR" banners are genre-close to GTA wanted stars and San Andreas gang territories. See section 8.
7. **MED: you can execute surrendered enemies.** Shooting someone with hands up (after a 0.7 s grace period) kills him, costs -10 trust and draws ally lines ("He had his hands UP."). It isn't blocked. index.html:2156, 2164.

---

## 1. Violence

### Who can be shot (structural)
- The player's hitscan only damages entities with `kind==='enemy'` (index.html:2128). Ray targets are `L.solids` plus enemies plus allies (`rebuildTargets`, index.html:1262). Allies are skipped (index.html:2119). Cuffed, dead and downed targets are skipped. Surrendered targets are skipped for 0.7 s after hands go up (`SURR_GRACE`, index.html:2120, 2164).
- **Not shootable** (not in `rayTargets`): job-givers and NPCs (`npcs`), Riverside porch neighbours (index.html:1414-1420; openworld.js), family at home, crowds in job set pieces, police (off-screen only), animals (Biscuit the dog, Tiny in sabotage). By construction they are immune to damage. No "kill civilian" penalty is needed because it can't happen with the main guns.
- **Exceptions (job-specific projectiles or rays):**
  - *Higher Ground* rifle: threats, **Kevin (child)**, the car, the scarecrow. Civilians only near-miss ("civScare", -2 Riverside trust, overwatch.js:540, 53). The escort witness Mr. Ferreira can be hurt by enemy fire (overwatch.js:500).
  - Finale roof beanbag (`_finale-street.js:116-125`): picks the person under the scope from the crowd **and the kids**. The shot is refused if any kid is within 25 m of the target. A kid is 0 m from himself, so kids are effectively immune. A beanbag on a non-plant adult counts as `civHit` ("That was a GRANDPA…", line 123). Two civilian hits fail the stage (line 57): "Two beanbags, two wrong people…". Medal penalty: `civHit*20` (finale.js:286). Payout "Everyone home" requires `!civHit` (finale.js:284).
  - Driving: "the collider only stops people on foot" (index.html:3843). Pedestrians can't be run over. *Brake Check* penalises touching civilian cars (-1 trust, then a "yellow card" fail; brake.js:511-512, 97-98, 112).
- **Police**: never on screen. "Officer Dana" collects zip-tied suspects off-screen (index.html:3745; save.js:781 "Guns turned in to Officer Dana"; arrest.js:736; _finale-fest.js:39).
- **Animals**: none can be harmed. *Sign of the Times* uses jerky treats for a guard dog "Tiny" instead of guns (sabotage.js:492-508).
- **Family**: never armed near, never targetable. Home has no weapons mode. `armedNow()` (index.html:3129) is false in home mode and in Maple free roam (frDraw quips "Not on Maple…", index.html:3101).

### Lethal and non-lethal
- Guns (index.html:886+ and save.js:42-74): Garage Pistol, The Retirement Plan (.357), Weekend Nailer (nail gun), Pump shotgun / double / sawed-off, **The Talking-To (beanbag, "Never kills", save.js:65)**, The Carpool (SMG), Rick's Carbine (AR-pattern rifle), Deer Season (.308 scoped).
- Beanbag: `nonlethal` never kills (hp floor 1) and triggers surrender below 60% (index.html:2153-2155). A beanbag hit on someone already surrendered costs -1 trust (index.html:2154).
- Surrender: below 40% hp an enemy surrenders with 50% chance (bosses always get one chance; index.html:2157-2162). The tag reads "HANDS UP · zip-tie".
- Zip-ties (E): +trust. Kills: -2 Riverside trust in free roam ("Neutralized · that stays with you", index.html:3533). The result card shows "Neutralized N / Zip-tied N" (index.html:1891). The HUD feed says "Neutralized" instead of "killed" (index.html:2652).
- Tackle and zip-tie only in several non-gun jobs (porch, patrol, moving, finale defend).
- **Executions**: shooting a surrendered enemy after 0.7 s → `prog.shotSurr++`, -10 trust, ally line from `LINES.shotSurr` ("Hey! He gave up, man!", "Whoa. That's not who we are.", "He had his hands UP.", index.html:941), and the enemy dies (index.html:2156). Possible, penalised, not blocked. The family reacts at home (`shotSurrUp`, home.js:1293 → trustLow pool, e.g. "When they put their hands up, honey, you use the zip-ties."). The roadblock driver in the finale surrenders unarmed immediately (_finale-street.js about line 202) and can also be shot.
- Overwatch live round: `hurtEnemy(e,999,'player',{gun:'hunter',head})` (overwatch.js:510) is a one-shot kill, allowed "and it costs" (header line 5; lines `lethal`, overwatch.js:52).

### Blood and gore
- **No blood anywhere.** A hit on a person spawns a "cloth" fibre puff, bluish-grey `color:[.35,.45,.6]` (index.html:2125, 2181). The cloth surface has `dec:null` (fx.js:531), so there are no decals. The beanbag puff is orange (overwatch.js:411). No blood, gore, dismemberment or ragdoll terms appear in shipped code.
- Death: a `death` animation clip (Quaternius UAL, CREDITS.md). `P.die` sets the base clip to 'death' (people.js:329). Bodies remain in free roam until 25 s (index.html:3534). There are hit reactions `hit_chest`/`hit_head`, and headshot hitmarkers and a headshot kill icon (hud.js:385-392; index.html:2134).
- Medic: Rosa revives downed allies ("downed", not killed).

### Explosives, tank, jet
- No grenades, rockets or C4. Finale plants carry **smoke bombs** only (finale.js:338; _finale-street.js:56, 85-88).
- Tank "LAWN ORDER" at Fort Sensible (tank.js:1-8): fires a practice round that "never hurts anyone: it will not fire with a person near the line of fire, civilians flee and comment, job enemies give up". It flattens parked cars. Jobs refuse it.
- Jet "DAD-1" (jet.js:1-10): "No weapons." A crash produces a fireball (`FX.explosion`, jet.js:190); you eject and the jet "is fine, it's a rental".
- Car damage: "broken down … no explosion" (index.html:1600).

### Consequences summary
- No kill-civilian penalty exists for the main guns because civilians can't be hit. Job-level civilian penalties: overwatch civScare (-2), Kevin (-10 and fail), finale roof civHit (fail at 2), brake civ car (-1 then fail).
- Kill penalties: free roam -2 Riverside trust; executions -10 trust; mission medals reduced by kills (finale.js:286).

---

## 2. Language

Wordlist searched (case-insensitive, whole words) across index.html, js, js/jobs: fuck*, shit*, damn*, hell, ass, asshole, bitch*, bastard*, crap*, piss*, dick*, cock*, prick, twat, wank*, bollocks, bloody, arse*, douche*, goddamn, cunt, slut, whore, pussy, n-word variants, f-slur, spic, chink, gook, wetback, kike, beaner, tranny, dyke, gyp*, redneck, hick, ghetto, retard*, plus milder words.

**Hard profanity: 0. Slurs: 0.** Hits on "cockpit", "cocking", "arsenal" and "damning" are code or comments.

Mild or borderline (user-facing):
| Term | Count | Locations |
|---|---|---|
| "god" / "Oh my god" / "God bless" / "GOD!" / "God rest" | 4 | arrest.js:104 "Oh my god, he's got a—"; eggs.js:99 "God bless."; overwatch.js:51 "Somebody's shooting at me from GOD!"; pawn.js:156 "God rest his stomach." |
| "Lord" | 1 | crossing.js:818 (Pastor Dee) "Somebody tell the Lord, He'll want to hear it." |
| "lose my religion" | 1 | index.html:3598 (Dave) |
| "idiots" | 1 | index.html:3599 (Rosa) "You guys are idiots and I love you." |
| "you animals" | 1 | index.html:3995 (Rosa, at the enemy crew). Also "We're not animals" ×3 in brake.js:95, 114, 196 |
| "dirtbag" | 2 | porch.js:24 "FREEZE, DIRTBAG!" and patrol.js:49 "Freeze, dirtbag!" (both are the *wrong* dialogue choice) |
| "stupid" | 2 | porch.js:26 "Take your stupid parcel."; pawn.js:182 |
| "loser" | 1 | mower.js:90 "Second place! First loser! I'm kidding!" |
| "cocky" | 1 | sabotage.js:72 |
| "thug(s)" (user-facing) | 2 | save.js:1296 "pick up N from thugs", save.js:1599 "Pick up N from thugs on jobs". Internal identifiers use `thug_*` about 200 times |
| "Hoodie" as a speaker or enemy label | about 9 | index.html:2325, ai.js:298, 302, overwatch.js:503, 509, plus descriptions |
| "Babe" | 1 | home.js:1275 (Jen to husband) |
| "Bro" | 4 | index.html:3115, ai.js:276, 277, 285 |
| "strapped" (gun slang) | 2 | index.html:3103, 3424 |
| "ain't" | 1 | index.html:3113 |

Verdict: the language is clean. The concern is coded usage ("thug", "Hoodie"), not profanity.

---

## 3. Alcohol, drugs, tobacco, gambling

- **Drugs (implicit, central to two raids):**
  - *Fourth Quarter* (Coach Rick): "Three of my players bought pills out of the duplex on Birch. Fifteen years old." / "There are three stash tables in there. We smash them…" (index.html:974). Objective "Smash the stash tables" (index.html:2571).
  - Stash table model: a dining table with 8 wrapped and taped "bricks" and a metal scale (world.js:976-985). This is a classic drug-brick depiction with no explicit drug name.
  - *Fellowship Hall* (Pastor Dee): 12-year-old lookouts "being paid to watch for cars", a "courier" who "comes by and collects", "smash the stash" (index.html:3583-3591, 3922-3927). The courier is 19.
  - Other "stash" uses are stolen goods: the Duke's crew "stashing things under the compost" (index.html:3594), stolen converters (overwatch.js:4), ai.js:202 "the stash room".
  - "pills" also appears in photo.js as UI "zoom pills" (not drugs).
- **Alcohol:** deliberately avoided. "Root beer" stands in everywhere: the fridge (index.html:2988, 2998; save.js:143), Dave's "Root beer kegs" (heist.js:138). Only the shop sign **"SAV-MOR · BEER · SNACKS · ICE"** (buildings.js:1141) mentions beer. home.js:728 has a comment only ("beer-fridge-free corner").
- **Tobacco and vaping:** none. "Smoke" hits are FX, smoke bombs and car smoke.
- **Gambling:** "LOTTO" on corner mart signs ("GROCERY · DELI · LOTTO", buildings.js:1141; openworld.js:419). Hustlers bet $20 on the mower race (mower.js:5, 82: "We bet on the guy with the spreadsheet!"). A raffle at the pawn shop opening (pawn.js:13, 48, 79, 109, "RAFFLE TIME!"). There are no casinos, card games or player gambling mechanics.
- Steam survey: declare "drug reference (implied)" and "gambling reference (non-interactive)".

---

## 4. Minors

### Where children appear
| Place | Who | Model | File |
|---|---|---|---|
| Home (Maple) | Tyler (son, about 10), Maddie (daughter, about 8), Jen, Biscuit | `son`, `daughter`, `wife` | home.js:1258-1285; index.html:2913-2998 |
| Home flyover | the family comes out to wave at the jet | family | jet.js:205-214 |
| *Dad Taxi* | Maddie, carpool kids, Tyler; teen bike thieves zip-tied by Rick (player's choice) | | taxi.js:161 noGuns; 341-402 ("Kid driving", "Kid in the passenger seat", "Zip-ties … +2 trust each", `mode='kneel'`) |
| *Chain Reaction* (bike) | Tyler at home; Dez (kid bike thief, `nb_kid`/kidTall) | | bike.js:12, 29-39, 265-266, 526-544 |
| *Minivan Roundup* | Henderson, Patel and Garcia kids at the driveways | `nb_kid`, `nb_teen` | roundup.js:52-64, 154; noGuns in convoy (162, 653, 900) |
| *Crossing Guard* | 11 kids walking home | | crossing.js:1-16 (no guns at all) |
| *Suds Up* | youth-group car wash kids | | carwash.js:8, 908 (noGuns) |
| *Hands Off* (farmers' market) | a kid following a parent, strollers | `nb_kid` | arrest.js:30, 389, 639, 648, 807, 859 |
| *Heavy Lifting* | Kemi (Adeyemi kid) | `nb_kid` | moving.js:8, 28, 397, 521-523 |
| *Higher Ground* | **Kevin, 9, shootable** | `nb_kid` | overwatch.js:518-529 |
| *Fellowship Hall* | 3 lookouts aged 12 ("Marcus", "Andre", "DeShawn") | `son` tinted | index.html:3584, 3928-3940 |
| *Block Party* | "Kids, bounce house… Families are behind the bounce house" (dialogue only, no models) | | index.html:999-1001, 2581 |
| *Garden Variety* | "Families are in the church hall" (dialogue only) | | index.html:3598 |
| *Mower* | "Your kids are SCREAMING!" (dialogue) | | mower.js:90; noGuns 532 |
| Finale roof, defend, hands-up, festival | festival kids, Malik (`nb_kid` ×0.86), youth-group kid | `nb_kid` | finale.js:74; _finale-street.js:8-13; _finale-end.js:97; _finale-fest.js:64-65 |
| Riverside free roam | porch neighbour pool includes `nb_kid` and `nb_teen`; a chalk or bike kid on tier-3+ blocks | | people.js:22; openworld.js:1290-1312 |
| Range | none (staff from the neighbour pool, "never the crew or the family", range.js:107) | | |

### The 25 m rule: where it is enforced
Code that enforces it:
- `js/jobs/arrest.js:30` `kidR:25` "owner rule: no gun out within 25 m of a kid or a stroller". Draw is refused at :648, the gun is forced away at :807, and the HUD warns at :859.
- `js/jobs/bike.js:28` `dezClear:30,famClear:25`. Guns stay holstered until Dez is 25+ m from the player and 30+ m from the garage (:526-530). The header (:12) states the rule.
- `js/jobs/moving.js:28` `bubble:25`. Hands-only within 25 m of any family member (:521-523). Hostiles holster inside the bubble (:577).
- `js/jobs/_finale-street.js:207` `DK.bubble:25` (defend: holster within 25 m of kids, :225-227; armed enemies holster inside the bubble, :267). On the roof, the beanbag is refused if a kid is within 25 m of the target (`RK.kidR`, :118-120), and a green ring is drawn at 25 m (`_finale-dress.js:197-198`).
- Whole-job `noGuns`: taxi.js:161, carwash.js:908, crossing.js (no weapons), blitz.js:683, mower.js:532, roundup.js:162 (convoy/home), _finale-fest.js:67, _finale-end.js:79, patrol, porch, pawn, sabotage, hoa, tail, heist (day).
- Home and Maple: no gun mode at all.

**Not enforced:**
1. **Riverside free roam** (index.html:3281-3290 `frDraw`/`frKey`; 3512-3514 auto-holster only on car, leaving Riverside, or 20 s of calm). Kid neighbours are present (see above). → **Violation.**
2. **Higher Ground**: Kevin (9) is a valid rifle target (overwatch.js:394, 412). → **Violation (worse: the child is in the line of fire, not just nearby).**
3. **Fellowship Hall**: in the loud branch, lookouts flee ("q.flee", index.html:3955) as the raid starts (`wmDeeRaid(true)`). Fleeing kids run for `life` 3 s (index.html:3932) before despawning while guns come out. Non-fleeing lookouts are removed at raid start (index.html:3967). Brief and minor, but no distance check.
4. **Block Party / Garden Variety**: dialogue puts families "behind the bounce house" and "in the church hall" during full wave gunfights. No models, so technically compliant, but narratively it contradicts the rule. Suggest rewording ("Families went home", "Families are across the street at the church").

### Can children be harmed? Damage immunity
- Main hitscan: kids and family are never in `rayTargets`, so they're structurally immune. No `immune` flag exists; it's implicit.
- Overwatch: **Kevin is hittable** (mission fail, no damage FX).
- Finale roof beanbag: kids are effectively immune (25 m self-distance check).
- Arrest beanbag: drawing is impossible within 25 m of kids or strollers.
- Vehicles: no pedestrian collisions.
- Restraint of minors: in *Dad Taxi*, the player can choose "Zip-ties" for two teenage bike thieves (one a Little League player) who then kneel and ride in the pickup bed (taxi.js:393-402, 413, 450). This is a mild but notable depiction of restraining minors.
- Children with guns: Kevin holds a toy water gun in an aiming pose at Gary (overwatch.js:521-525). His model is `equip`'d with a real 'beanbag' gun that is then hidden (line 521), so a hidden real-gun object is attached to a child model. The lookouts are unarmed.
- Kids and guns in dialogue: Tyler "Can I name it? I'm naming it Gerald." (home.js:1275), "Coach Rick gave you his GUN?" (home.js:1266), "Can I see your zip-ties?" (home.js:1263).

---

## 5. Real brands and trademarks

| Term | file:line | Context | Suggested replacement |
|---|---|---|---|
| **Dadazon** (+ Amazon trade dress) | home.js:157-159 (`#232f3e` header, `#ff9900` wordmark, `#ffa41c` stars, `#b12704` price); index.html:2894 (blue "smile" stripe on boxes); index.html:2988; save.js:170; hoa.js:83; bike.js (resale `store:'dadazon'`, save.js:1512); porch.js:5 | Online shop and delivery company | Rename (e.g. "ParcelPal", "Porchly") with its own colours, no smile stripe |
| "Prime Day" | ai.js:293 "You can't stop Prime Day!" | enemy taunt | "You can't stop Two-Day Shipping!" |
| **Costco** | index.html:3103 "You lost, Costco?" (free-roam crew *notice* bark when they see a drawn gun); index.html:3422 "Wrong car, Costco." (car break-in incident bark); pawn.js:163 "They're from the Costco on Route 9. Box of a hundred."; talk.js:105 "Wore it to Costco." | Claimed to be a "traffic bark". It is actually a street-crew bark in free roam (3103) plus a break-in incident (3422), not traffic AI | "You lost, warehouse club?" / "Wrong car, Bulk Barn." / "the BulkMart on Route 9" |
| Walgreens | talk.js:101, 102, 439 | "Tre's mom: Walgreens parking lot, radio off" | "pharmacy parking lot" |
| Gatorade | crossing.js:820 "you owe him a Gatorade"; crossing.js:911 payout line "Coach Rick's Gatorade" -12 | | "sports drink" / "Coach Rick's sports drink" |
| Buick | hoa.js:11, 199, 204 (×4), 207 (×2), 213, 230, 296, 365, 432-433 (UI "Get in Barb's sister's Buick", "In the Buick · E to get out"); cones.js:42 `label:'Buick'`, 43 "Is that my Buick?" | Car make | "sedan" / "Barb's sister's sedan" |
| Sienna | ai.js:292 "Is that a Sienna? Respect." | Toyota model | "Is that the touring package? Respect." |
| Corolla | taxi.js:37 "Mason's dad drives a Corolla." / "A FAST Corolla." | Toyota model | "a hatchback" |
| "SUBURBAN" | vehicles.js:248 bumper "SUBURBAN PRIDE"; vehicles.js:699 tyre "SUBURBAN TOURING A/S"; carai.js:25 "The Suburbanite" (SUV name) | Chevrolet Suburban is a trademark, but used here as an ordinary word | LOW; keep, or rename the SUV "The Cul-de-Sac" |
| Super Soaker | overwatch.js:6 (comment), 436 "That's a Super Soaker. That's Kevin.", 518 | Hasbro | "water blaster" |
| Mario Kart | home.js:1269 (Tyler) | Nintendo | "racing games" |
| Minecraft | patrol.js:43 "They told me about Minecraft the whole way." | Mojang/Microsoft | "their block-building game" |
| Disney | heist.js:139 "it says 'Disney' on the strap." / "Tactical Disney." | | "it has a cartoon princess on the strap" |
| Roomba | tank.js:284 "Like a Roomba. A seventy-ton Roomba." | iRobot | "robot vacuum" |
| Crockpot | jet.js:26 "Smooth like a crockpot." | Crock-Pot (Sunbeam) | "slow cooker" |
| Rocket Pop | index.html:3609 (Dave) | Popsicle/Unilever | "the red-white-and-blue one" |
| Little League | taxi.js:385 "Coach Rick? From Little League?" | Little League Baseball (registered) | "From T-ball?" / "From the youth league?" |
| **Rotary Club / "ROTARY"** | arrest.js:73-74 (`charity:'the Rotary Club'`, `logoTxt:'ROTARY'`, "Rotary Club! Twenty years on this corner!"), arrest.js:101 | A real charity. **The skimmer (fraudster) is random among the 4 collectors** (`skim:Math.floor(Math.random()*4)`, arrest.js:786), so 25% of runs show a fraudster wearing a Rotary vest | invent: "the Maple Service Club" |
| Scouts / "SCOUTS" | arrest.js:79 "the Riverside Scouts" | Generic word, but Scouting America marks | LOW; "Riverside Trail Club" if cautious |
| Elks Lodge | world.js:111 poster "live · Elks Lodge · Fri" | BPOE (real org) | invent one: "the Grange Hall" or "Maple Social Club" |
| QUIKSTOP | buildings.js:1141 store sign | Quik Stop is a real convenience chain (California) | "CORNER STOP" |
| SAV-MOR | buildings.js:1141 "SAV-MOR · BEER · SNACKS · ICE" | Real pharmacy/grocery names exist | "PENNY MART" |
| Brain Freeze | Benny's truck "BENNY'S BRAIN FREEZE" (openworld.js, worldgen.js, _finale-street.js); job title "Brain Freeze" | 7-Eleven has held BRAIN FREEZE marks (Slurpee) | LOW; keep or "Benny's Cold Front" |
| KIDZ 98 "All bop, all day" | _stops.js:214 | Echoes "Kidz Bop" (registered) | "KIDS 98 · Sing-along all day" |
| SMOOTH 88.3 | _stops.js:216 | "Smooth Radio" (UK, Global) is a real brand | LOW; "MELLOW 88.3" |
| NightOwl Gen-1 Goggles | save.js:165 | Night Owl (security cameras and optics) | "Hoot Gen-1" |
| Spin City Laundromat | index.html:3583, worldgen.js "SPIN CITY · UNDER NEW MANAGEMENT" | TV series title | LOW |
| LAWN ORDER (tank) | tank.js:17 | Pun on *Law & Order* | LOW |
| Weekend Nailer model colours | guns.js:441 (`yellow` `#e0ad17` + black polymer) | Yellow/black is DeWalt's registered trade dress for power tools | Recolour (e.g. teal/grey) |
| Rick's Carbine (AR-15 pattern) | guns.js:224 comment; model `assets/guns/oga_m4a1.glb` | Visual likeness to the M4/AR-15. Names in-game are generic ("Rick's Carbine") | LOW; generic name is fine |
| Garage Pistol | guns.js:211, Poly Haven "Service Pistol" | Check visually for a Glock-like slide | LOW |
| Stock horn tunes | carai.js:68-74: Shave and a Haircut, Ode to Joy, Take Me Out to the Ball Game (1908), Für Elise, William Tell, The Entertainer (1902) | All public domain | OK |
| twitter: meta tags | index.html:15-18 | Not in-game | Fine |

Other brand-adjacent words that are fine: "Kettle Grill", "Root beer", "air fryer", "Wi-Fi", "Bluetooth" (none found in user text), "jerky", "Fill-Er-Up", "Hank's Hardware", "Dad's Auto", "Quik-Hook Towing" (invented), "Ramos Corner Mart", "Brace Yourself Orthodontics", "WDAD 101.5", "AM 860 The Huddle".

No hits for Walmart, Target, Home Depot, Lowe's, Starbucks, McDonald's, Ford, Chevy, Honda, Tesla, F-150, Prius, Odyssey, Camry, Jeep, Hummer, Glock, Remington, Beretta, Colt, Mossberg, DeWalt, Milwaukee, Makita, Ryobi, iPhone, Xbox, PlayStation, Google, Netflix, Coke, Pepsi, Bud, NFL or NBA in user-facing strings.

Note `HOUSE_STYLES` 'craftsman' (index.html:1074, buildings.js) is an architectural style, not the Craftsman tool brand.

---

## 6. Real people
- **"Obama"**: eggs.js:110 glovebox easter egg: "an emergency granola bar from the Obama administration." This is a political figure. Replace with "from 2009".
- **"Springsteen"**: home.js:1269 (Maddie) "It's mostly Springsteen." A real celebrity, mentioned in passing. LOW; consider "mostly dad rock".
- No other politicians, celebrities or real public figures found. Character names are invented (Gary, Coach Rick, Big Dave, Doug, Earl, Pastor Dee, Rosa, Benny, Sal Benedetto, Barb Kowalski, Hank, Mrs. Ramos, Mr./Mrs. Adeyemi, Ms. Okafor, Kemi, Tunde, Tre, Dez, Malik, Vic, Marco, Kev, DJ Layaway, Sgt. Pruitt, Cpl. Doyle, Staff Sgt. Ruiz, Officer Dana, the Wholesaler, the Duke, the Porch Pirate King).
- Real places: "Lagos" (moving.js:99, Grandma's 1978 anecdote). Harmless.

---

## 7. Ethnic and religious targeting

### Enemy cast composition
- Street-crew pool (people.js:19): `thug_hoodie, thug_track, thug_beanie, thug_red, thug_fro, thug_jacket, thug_brown, thug_cap, thug_f_hood, thug_f_leather` (8 male, 2 female). A shuffle bag gives even spread over the *loaded* variants (people.js:271-276).
- **Load order matters**: only the first 4 (`hoodie, track, beanie, red`) are in the title-screen manifest (people.js:25 `GAME_KEYS=KEYS.slice(0,10)`; index.html:154 `THUGS=['thug_hoodie','thug_track','thug_beanie','thug_red']` for missions m0-m3). The other 6 stream in afterwards (`STREAM_KEYS`).
- Estimated skin luminance (median skin-like pixel of the albedo head texture, 0-255; this is a heuristic, so confirm visually):

| key | role | est. luminance | reading |
|---|---|---|---|
| thug_hoodie | enemy (core 4) | 43 | dark |
| thug_track | enemy (core 4) | 80 | medium-dark |
| thug_beanie | enemy (core 4) | 109 | medium |
| thug_red | enemy (core 4) | 130 | light |
| thug_fro | enemy (streamed) | 96 | medium-dark |
| thug_cap | enemy (streamed) | 89 | medium-dark |
| thug_jacket | enemy | 132 | light |
| thug_brown | enemy | 132 | light |
| thug_f_hood | enemy | 142 | light |
| thug_f_leather | enemy | 155 | light |
| boss (Porch Pirate King / Wholesaler) | enemy | 110 | medium |
| dad_player, gary, rick, dave, doug | crew | 124-144 | all light |
| wife, son, daughter | family | 144-151 | light |
| dee (Pastor Dee) | giver | 106 | medium-dark |
| rosa, earl, benny | givers | 132-143 | light |
| nb_kid | neighbour child (Kevin, Dez, Malik, Kemi, chalk kid) | 56 | dark |
| nb_marcus | neighbour (range officer, Mr. Adeyemi, Marcus the racer) | 57 | dark |
| other nb_* | neighbours | 131-154 | light |

- Assessment against the rule "mixed pool, no group in the majority": the full 10-variant pool is roughly balanced (about 5 darker, 5 lighter, by this estimate). **But** (a) the 4-look core set used for the 4 Maple raids is 3 darker to 1 lighter; (b) the darkest model is the one named `thug_hoodie`; (c) the player's side is uniformly light-skinned; (d) the child shot-at in Overwatch and the child bike thief (Dez) both use the darkest child model (`nb_kid`); (e) the Fellowship Hall child drug lookouts carry the names DeShawn, Andre and Marcus. Overall the visual and narrative read is "white suburban dads vs. darker street crews from across the bridge". I recommend: put a lighter variant into the core 4, rename `thug_fro`/`thug_*` keys, drop "Hoodie" as a label, diversify the dads, and pick a different model for Kevin and Dez or give the neighbour-kid pool more than one model.
- Rocketbox `nb_kid` = Children/Male_Child_02 is the only neighbour child model. Every non-family child (Kevin, Dez, Malik, Kemi, lookouts' fallback, festival kids) shares it.

### Religious dress and symbols
- Pastor Dee's model: "plain dark suit, no religious dress or symbols" (characters.json; uses Business_Female_01). Her stand-in colours are purple `#6a4c93` (index.html:3555). There is no collar or cross on her. Her role text is "Pastor Dee · Youth Pastor, Riverside Community Church" (index.html:3583).
- **The church building has a cross**: openworld.js:543-567 "Riverside Community Church: brick nave, steep roof, steeple, stained glass, sign board". Line 554 builds a white cross (two boxes, `stdMat('cross')`) on top of the steeple. Sign boards read "RIVERSIDE COMMUNITY CHURCH" / "R VERS DE COMM NITY CH RCH" (broken letters at low trust) and "SUNDAY 10AM · ALL WELCOME" (openworld.js). worldgen.js:292 names it "RIVERSIDE COMMUNITY CHURCH & YOUTH CENTER". This conflicts with crossing.js:15 "Owner rules: … no religious dress or symbols". The cross is a symbol on a building, not dress, so decide whether the rule covers buildings.
- Religious content in dialogue: "Somebody tell the Lord" (crossing.js:818), "Andre. His grandma sings in my choir." (index.html:3940), "lose my religion" (index.html:3598), "God bless" (eggs.js:99). Pastor Dee's job is titled "Fellowship Hall" and it's a gun raid on a laundromat. *Garden Variety*'s gunfight has "Families are in the church hall" (index.html:3598). The carwash happens on the church lawn (no guns). No other faiths are depicted. Nothing mocks religion.

### Gang names
The Coupon Boys, Third Street Returns, Dock Street Discount (index.html:3092-3095); the Birch Street crew (index.html:999); the Porch Pirate King; the Duke (of Catalytic Converters); the Wholesaler; Quik-Hook Towing; Vic's bike crew; "The Courier". All are retail and consumer puns with no real-gang references. Crews wear coloured armbands (teal, violet, gold) (blitz.js:524). These are colour-coded gangs, a soft echo of real colour-coded gangs, but the colours are not red or blue. LOW.

### Coded language
- "Hoodie" as the enemy label (see section 0). "thug" in the UI (save.js:1296, 1599). "strapped", "Ay … This is our corner", "Bro", "ain't" in crew barks (index.html:3103-3115). The surrender lines are comedic ("It's mostly cat litter!").
- Riverside framing: tier labels go 'Blinds down' → 'Trash day' → 'Lights back on' → 'Chalk on the sidewalk' → 'People wave' → 'Doors unlocked' (index.html:1344). Riverside is lit "flat grey light, haze closing in" at low trust (index.html:362). Graffiti only appears in Riverside. It gets "fixed" as the dads intervene.

### All graffiti strings
- world.js:99 TAGS (wall decal atlas; only the first 4 are drawn into the texture, world.js:101): **"BIRCH", "KINGZ", "PPK", "NO SNITCH"**, plus "RIDGE" and "SK8" (defined, unused in the atlas).
- openworld.js:148 grafTex (Riverside street faces): **"BRZ", "K9", "LOL", "MOOP", "DUKE" (with a crown, line 153)**, "" (smiley face), "~" (squiggle), "HI".
- Chalk (openworld.js:159-166): hopscotch numbers, a sun, **"HI MOM"**, a car with stick figures, a heart, a star.
- Mural: "RIVERSIDE" / "painted by the kids of 3rd St" (openworld.js:1071).
- Flag: "NO SNITCH" (anti-cooperation-with-police street slogan) and "KINGZ"/crown are gang-coded. Replace with neutral tags.

### All sign and poster strings (in-world, drawn on canvas)
- Posters (world.js:110-111): "LOST DOG / BISCUIT / Beagle mix · answers to "Biscuit" / REWARD · 555-0142"; "GARAGE / SALE / SAT 8AM · 14 MAPLE ST / tools · bikes · crib"; "THE / MULCHERS / live · Elks Lodge · Fri / $5 at the door"; "WE BUY / HOUSES / ANY CONDITION · CASH / call today".
- Parcels and street (world.js:124, 137, 156, 159): "SHIP TO: MAPLE HTS", "PRIORITY 1 OF 1", "STOP", "LINDEN PARK BLOCK PARTY", "SEWER".
- Shops (buildings.js:1141 and nearby): "CORNER MART / GROCERY · DELI · LOTTO", "QUIKSTOP / OPEN 24 HOURS", "MAPLE MARKET / FRESH · LOCAL · FRIENDLY", "SAV-MOR / BEER · SNACKS · ICE", "HANK'S HARDWARE / TOOLS · PAINT · LUMBER", "DAD'S AUTO / REPAIR · TIRES · BRAKES".
- Open world (openworld.js:419, 535-537, 647-648, 822, 842, 922, 1071, 1079): "FILL-ER-UP / GAS · SNACKS · BAIT", "RAMOS CORNER MART / GROCERY · DELI · LOTTO", "BENNY'S BRAIN FREEZE / ICE CREAM · DEPOT", "BARB KOWALSKI / REALTY · "I sell porches" / 555-0142", "EXIT", "WE BUY GOLD / OPEN", "MAPLE HEIGHTS", "MAPLE AVE", "ROUTE 9", "SCHOOL", "DROP-OFF ONLY", "RIVERSIDE COMMUNITY CHURCH", "SUNDAY 10AM · ALL WELCOME".
- Worldgen place signs (worldgen.js): "DAD'S AUTO · SINCE 1987 · WE FIX IT RIGHT", "BRACE YOURSELF ORTHODONTICS", "FREE BIKE LIBRARY · RETURN BY SUNDAY", "FUTURE HOME OF RIDGEVIEW T-BALL", "INDUSTRIAL WAY CLIMBING GYM", "MAPLE HEIGHTS ELEMENTARY", "RAMOS BAKERY", "RIVERSIDE COMMUNITY CHURCH & YOUTH CENTER", "RIVERSIDE FLATS COMMUNITY CENTER", "SECOND GEAR AUTO SCHOOL", "SOLD", "SPIN CITY · UNDER NEW MANAGEMENT · YOUTH GROUP FOLDS ON TUESDAYS", "UNDER NEW MANAGEMENT · CALL SAL · HONEST TOWING", "BOUNCE HOUSE STAYS UP ALL SUMMER".
- After-dressing (index.html:4143-4149): "INDUSTRIAL WAY CLIMBING GYM / Formerly a chop shop · Ropes on Tuesdays", "SOLD / The duplex on Birch has a family in it", "BOUNCE HOUSE STAYS UP", "FUTURE HOME OF RIDGEVIEW T-BALL", "FREE BIKE LIBRARY", "LOST & FOUND", "RIVERSIDE COMMUNITY GARDEN / Plant Day every Saturday · Forty families", "SECOND GEAR AUTO SCHOOL / Pastor Dee's youth program · Ask for Sal", "SPIN CITY · UNDER NEW MANAGEMENT", "ROUTE 9 BRIDGE OPEN".
- Fort Sensible (base.js): "FORT SENSIBLE / TRAINING POST · EST. WHENEVER / "WE CAN TURN THIS BASE AROUND"", "PUBLIC RANGE OPEN ON DAYS ENDING IN Y", "ALL VISITORS STOP AT THE GATE", "RANGE RULES 1. MUZZLE DOWNRANGE 2. FINGER OFF THE TRIGGER 3. NO "WATCH THIS" …", "RANGE CONTROL / EYES AND EARS. ALSO BRAINS.", "MOTOR POOL / SPEED LIMIT 5 MPH · NO DONUTS (THE DRIVING KIND)", "TANK PARKING ONLY / VIOLATORS WILL BE FLATTENED", "HANGAR 2 / THERE IS NO HANGAR 1", "TOWER / IT IS NOT A LIGHTHOUSE", "PARADE GROUND / NO MARCHING IN FLIP-FLOPS", "QUIET HOURS 2200-0600 / THE TANK COUNTS.", "REGULATION 4 / NO RUNNING. UNLESS SOMETHING IS ON FIRE. / NOTHING IS ON FIRE.", "THIS POST HAS GONE / 0 DAYS WITHOUT A DAD JOKE", "LIGHTS OUT MEANS LIGHTS OUT", "ALL PERSONNEL WASH HANDS / THAT MEANS YOU, SERGEANT.", "DRIVE SAFE / YOUR FAMILY WANTS YOU HOME FOR DINNER", "LOST? / ASK A GUARD. LOST AND PROUD? SAME GUARD.", "BARRACKS A/B", "VISITORS · PLEASE WAVE", "RWY 27", "FORT SENSIBLE · HYDRATE", "SPEED LIMIT 15 / TANKS 5 · JETS …". Jet: "DAD-1", "FORT SENSIBLE AIR WING", "THE HIGH BRIDGE / RIVERSIDE · MAPLE HEIGHTS RAIL · EST. 1911", "PLEASE BE REASONABLE". Tank: "LAWN ORDER", "FS-02", "LETTER FROM THE MAPLE HEIGHTS HOA".
- Home (home.js): "MY FAMLY", "I ♥ DAD"-style drawing, "BISKIT", "BISCUIT", "WIPE YOUR PAWS", "KNOCK FIRST!!", "TYLER + MADDIE", "DADS 21 HOA 14 4TH 2:0" (TV scoreboard), "dadazon" laptop, "NOVEMBER", "DAD VAULT / EST. 2009" (gun locker), "U.S. DAD" (footlocker, parody of "U.S. ARMY"), "WORLD'S OKAYEST DAD", "LEAGUE CHAMP 2019", "RAID?", "TODO".
- Vehicles (vehicles.js:248-262, 286-366): bumper stickers "SUBURBAN PRIDE", "DAD ON BOARD", "SOCCER"; plates "SOCR DAD", "BIG DAD", "LIL DAD", "CARPOOL", "FIXIT", "HOA PRES", "RIVERSIDE"; tyre "SUBURBAN TOURING A/S 235/60 R18 103H". Shop stickers (carai.js:64-65): "My Kid Is On The Honor Roll", "I Brake For Garage Sales", "Proud Soccer Dad", "Ask Me About My Lawn", "World's Okayest Driver", "Honk If You Love Potato Salad", "My Other Car Is Also A Minivan", "Coach Rick Made Me Do Laps", "I ♥ Linden Park", "Powered By Brisket", "Free Bike Library · Riverside", "I ♥ Riverside Flats". Light bar: "Amber and white. Never red and blue: you are a dad, not a police car." (save.js:1164).
- Job set pieces: arrest.js (market: "GREENS & EGGS", "PEACH PIT", "TOMATO TOMATO", "BUZZ OFF HONEY", "WICK & CO", "RISE & SHINE", "ORCHARD ROW", "BLOOMS", "SATURDAYS · 8 TO 1", "ROAD CLOSED", "GARDEN FUND", vest logos "ROTARY", "LIBRARY", "PAWS", "SCOUTS"); bike.js ("VIC · BIKE GUY", "NO QUESTIONS · CASH ONLY", "CHOCO-LUMPS", "RED BIKE. FAST. CARD IN SPOKES NOT INCLUDED."); blitz.js ("HANK'S DISCOUNT", "RAMOS CORNER MART · GRACIAS", "CART RETURN"); brake.js ("CASH · 24 HR"); cargo.js ("BLOCK PARTY", "RESERVED", "ROAD CLOSED"); carwash.js ("YOUTH GROUP CAR WASH", "COUPON WASH", "NO LINE · NO KIDS", "EVERY KID GOES · THANK YOU, RIVERSIDE", "SUMMER CAMP", "THE YOUTH CENTER VAN", "WASH ME", "THE DUKE"); cones.js/tail.js ("HAULING · LOCAL & LONG DISTANCE", plate "7HXK 418"); heist.js ("RON'S MOVING", "UNIT 47", "GUARD UR WAY", "OPERATION GOOD FENCES"); hoa.js ("MOVIN' ON", "LOCAL · LONG DISTANCE · NO QUESTIONS", "1209 MAPLE AVE", "LEAVE ON PORCH", "DADAZON", "LAND OF NICE LAWNS", "PLEASANT STATE", "NVR·SLD"); moving.js ("TRUCK RENTALS", "MOVE-ALONG", "GRANDMA'S CHINA · THIS SIDE UP", "WELCOME HOME!"); mower.js ("MAPLE HEIGHTS RIDE-ON GRAND PRIX", "FOR CHARITY · BLADES UP · NO GOATS", "GNOME GARDEN", "GIL'S OAK"); patrol.js ("DRIPPY'S / PLUMBING · SINCE 1987", "WE WAVE / NEIGHBOURHOOD WATCH"); pawn.js ("CASH-4-YER-STUFF", "WE BUY GOLD", "WE BUY · NO QUESTIONS ASKED", "GRAND OPENING", "FREE HOT DOGS", "PAN DULCE · BREAD · COFFEE · OPEN 7 AM", "GAZETTE"); roundup.js ("HORNETS", "LINDEN LIONS", "MAPLE HTS", "PROUD SOCCER DAD", "COMMUTER OF THE MONTH", "MY KID IS ON THE HONOR ROLL", "WORLD'S OKAYEST DRIVER"); sabotage.js ("HONEST TOWING", "QUIK-HOOK", "AUTO RECOVERY", "UNDER NEW MANAGEMENT", "CALL SAL · DAD'S AUTO · 24/7 · PAYMENT PLANS"); tow.js ("QUIK-HOOK TOWING", "LEGAL IMPOUND LOT", "IMPOUND OFFICE"); finale ("RIVERSIDE FLATS STREET FESTIVAL / TODAY · EVERYBODY WELCOME", "STREET CLOSED / FESTIVAL TODAY", "STAGE & SOUND · RIVERSIDE FESTIVAL", "REGIONAL WHOLESALE · DISTRIBUTION", "BIG DAVE'S BRISKET", "TAMALES", "CONCHAS", "KETTLE CORN", "FACE PAINTING", "LEMONADE", "THANK YOU, EVERYBODY", "THANK YOU ♥").
- Generic and harmless except: "NO SNITCH", "KINGZ", the DUKE crown, "Elks Lodge", "QUIKSTOP", "SAV-MOR", "ROTARY", "DADAZON".

---

## 8. Originality vs existing games

### Job and mission names (all)
Core Maple (index.html:948-1017, save.js:19-24): **Return to Sender** (Gary), **Fourth Quarter** (Rick), **Block Party** (Dave), **The Kingpin** (Doug).
Riverside (index.html:3573-3611, save.js:26-34): **End of the Line** (Earl), **Fellowship Hall** (Dee), **Garden Variety** (Rosa), **Brain Freeze** (Benny), **The Duke**.
SPEC3 jobs (js/jobs/*.js): Hands Off (arrest), Chain Reaction (bike), Honey-Do Blitz (blitz), Brake Check (brake), Handle With Care (cargo), Suds Up (carwash), Cone Zone (cones), Crossing Guard (crossing), Everybody Waves (finale), Good Fences (heist), Exhibit HOA (hoa), Heavy Lifting (moving), The Grass Is Greener + Mower Time Trial (mower), Higher Ground (overwatch), Watch Your Step (patrol), Grand Opening (pawn), Porch Light (porch), Minivan Roundup (roundup), Sign of the Times (sabotage), Following Distance (tail), Small Talk (talk), Dad Taxi (taxi), Hitch Happens (tow).

Comparison:
- **"End of the Line": exact title of the final story mission of *GTA: San Andreas*.** Rename (e.g. "Last Stop", which fits Earl the retired bus driver better anyway).
- "The Kingpin": a common noun, but also the Marvel villain and a frequent crime-game term. LOW.
- "Return to Sender", "Block Party", "Grand Opening", "Higher Ground", "Hands Off", "Small Talk", "Heavy Lifting", "Chain Reaction", "Sign of the Times", "Handle With Care": common idioms and song titles. I don't know of exact GTA, Saints Row or Watch Dogs matches with confidence; a few may coincide with mission names in large series. LOW. Run a quick title search before release.
- "Dad Taxi": the taxi side activity is a GTA and *Crazy Taxi* staple, but the mechanics here (timed errands with passenger comfort) are different. LOW.
- Mower Grand Prix, the street race, and car wash do not resemble specific games.

### UI and systems
- **Wanted level analogue**: Riverside "Heat 0-5" pips (index.html:3459-3466) with escalation: 1-2 the local crew, 3-4 a three-way "TURF WAR" banner (`kicker:'Heat 3'`, index.html:3352), 5 a reinforcement car. It cools when out of sight, off the block, holstered or driving away (index.html:3084-3099, 3335-3349). Mechanically very close to GTA's 5-star wanted level, except that the responders are rival crews, not police, and the display is skewed bars, not stars. MED. Consider a different scale (3 levels or a single meter) and a different label.
- **Gang territories**: `FR_CREWS` with turf rectangles and "turf tints on the full map" (index.html:3092-3095, 3459). Similar to GTA: San Andreas gang territory colouring and "turf wars". MED.
- **Banners**: "Job done" / "Job failed" (index.html:1890-1892; hud.js:474, 740). Not "Mission Passed" or "Wasted". OK. Player death in a mission: "You took one too many. Gary drove you home…" (index.html:2177). Player death in free roam: wake at home, the van is towed, and there's a small fee (index.html:3108, 3264). This is functionally like GTA's hospital respawn with a fee, but the text is original. LOW.
- **No** "Wasted", "Busted", "Respect +", Pay 'n' Spray (Dad's Auto repairs, upgrades and paint but doesn't clear heat), Ammu-Nation (gun shop is "Hank's Hardware & Sporting"), Grove Street, Los Santos, Sprunk, Cluckin' Bell, etc. (searched).
- **In-car radio** with named parody stations and taglines (_stops.js:213-216): "WDAD 101.5 · Soft rock for hard workers", "KIDZ 98 · All bop, all day", "AM 860 THE HUDDLE · Sports talk" (with call-in talk lines), "SMOOTH 88.3 · Music to merge by". This is a GTA hallmark format (parody stations plus talk radio), though common in the genre. LOW-MED; the "KIDZ" name echoes Kidz Bop.
- Horn tunes are public-domain melodies (carai.js:68-74). There are no sound-alike licensed songs; the music is procedural (audio.js).
- Fort Sensible military base with a tank and jet to steal or borrow: GTA V has Fort Zancudo. The name and treatment are different (open, comedic, non-lethal). LOW.
- HUD: compass, minimap, objective list, crew HP list, weapon panel with "Holstered" and mag counts, trust meter. These are generic shooter conventions.
- Catchphrases: "Trust on three", "WORLD'S OKAYEST DAD" (a common real-world novelty slogan, fine), "We're not animals. We're a zone defence." All original.

---

## 9. Other Steam-sensitive items

- **Sexual content**: none. Searched for sexy, kiss (only "kissed a civilian car"), flirt, naked, underwear, etc. The only hit is "Babe" (Jen). No nudity: Rocketbox models are clothed.
- **Mature humour**: mild dad humour. Mild ethnic food references (pan dulce, tamales, conchas, jerky) are positive. "Is it true you're in a gang now? Mom said 'neighborhood watch' and did the air quotes." (home.js:1262) and "Mrs. Henderson already thinks we're a militia." (index.html:3101) are self-aware jokes about vigilantism.
- **Political framing**:
  - Store and meta copy: README "restore a high-trust neighborhood through violence they would really prefer wasn't necessary"; index.html:5, 9, 17 "An open-world shooter about suburban dads taking their neighborhood back. Politely, where possible." The phrase **"taking their neighborhood back"** is a loaded political slogan (used in anti-crime, vigilante and nativist rhetoric). Combined with "High Trust" (a sociology and online-politics phrase, "high-trust society", sometimes used in ethnonationalist discourse) and the white suburb vs. diverse "across the bridge" setting, this may read as political. Recommend that the store copy foreground de-escalation ("zip-ties, second chances, community") and drop "taking … back".
  - In-game mitigations (worth citing in the survey and store page): kills cost trust, executions are condemned by allies and family, the beanbag "never kills", most SPEC3 jobs are no-gun (patrol: "it's a plumber: ask, don't call it in", patrol.js:8), cuffed and lookout characters get jobs (Fellowship Hall end line, index.html:3591; HOA lookout gets "a summer job mowing lawns", hoa.js:16; Tre and Dez get bike-library jobs), Riverside residents are the job-givers asking for help (Dee, Rosa, Earl, Benny), and the crossing job states "Nothing violent ever happens near the kids" (crossing.js:12). Ally zip-tie lines are paternalistic: "We're getting you a library card.", "Let's talk about trade school." (index.html:940).
  - Gentrification optics: Riverside starts grey and hazy with blinds down and gets "fixed" block by block. The duplex becomes "SOLD · The duplex on Birch has a family in it" (index.html:4147), and "WE BUY HOUSES" posters appear (world.js:111). The realtor Barb is the HOA president.
- **Police depiction**: police never appear on screen. They're referenced as "Officer Dana" collecting suspects and guns (index.html:3745; save.js:781; arrest.js:736; _finale-fest.js:39), and the Wholesaler fears "a street that calls the police on his trucks" (finale.js:5). **Doug's model is a Rocketbox `Police_Male_06` retextured** so the "POLICE" patches read "DAD", the shirt is tinted blue and the badge removed (characters.json; rocketbox/CREDITS.md). Recommend a visual check for leftover police insignia (shoulder patches, duty belt, radio) because the silhouette may still read as a police uniform. He's "Doug · Neighborhood Watch" (index.html:1017) with binoculars, night-vision goggles ("Doug owns two pairs", save.js:166) and the overwatch rifle. The amber light bar is explicitly "never red and blue" (save.js:1164).
- **Military**: Fort Sensible (base.js) with soldiers (Sgt. Pruitt, Cpl. Doyle, Staff Sgt. Ruiz), a public range, a tank and a jet. Comedic and non-lethal. Range targets include a "mailman" pop-up you're penalised for hitting (range.js:128), which is a cardboard civilian target.
- **Vigilante detention**: zip-tying people is the core verb. In *Small Talk* a 19-year-old detainee is "interrogated" on a lawn ("Bad Cop lines always backfire", talk.js:11). Restraint of teenagers in *Dad Taxi* (see section 4).
- **Drug-dealing to minors** as a mission premise (Fourth Quarter, Fellowship Hall). See section 3.
- **Real-gun realism**: realistic firearms (pistol, revolver, pump, double, sawed-off, SMG, AR-pattern carbine, scoped bolt rifle) with recoil patterns, attachments (red dot, extended mag, foregrip, suppressor "The HOA-Approved Muffler", save.js:106-112), and a gun shop UI. Ratings: realistic violence against humans without blood. Expect ESRB T/M borderline, PEGI 16 (realistic weapons, people killed, killing defenceless surrendered persons is possible), USK 16.

---

## 10. Does legacy/ (and dev/) ship?

- The game is a static site; `index.html` does not reference `legacy/` or `dev/` (no `<script>`, link or fetch to them; `grep legacy index.html` hits only the `A.legacy()` audio API at index.html:779 and the `startMission(i,legacy)` parameter at index.html:1864). `sw.js` caches "everything else from this site … network first" (sw.js:4), so on the web build anything reachable is served.
- README "Layout" lists `legacy/top-down.html` as "the original 2D top-down prototype", which is publicly reachable on GitHub Pages today.
- `docs/steam/CHECKLIST.md:41` (B7 Depots) says to leave out `dev/`, `docs/`, `tools/`, `legacy/`, `pause.png`, `assets/og.jpg` from the Steam depot. If that's followed, **legacy/ does not ship on Steam.** `legacy/top-down.html` (645 lines) has no profanity hits. Its objective text includes "Reform offenders. Return carts. Recruit dads at grills." (legacy/top-down.html:69).
- `dev/` holds about 50 test-harness files (ai-ingame-*.js, run-tests.js, world.html, jobs/*, etc.) and is excluded by B7. `assets/people/rocketbox/test.html` is a dev page inside assets: exclude it from the depot too.
- (CONTENT.md is this file.)
- index.html meta tags still say "Play free in your browser" and point to github.io (index.html:5-18). Update them for the Steam build.

---

## 11. Recommended fix list (priority order)

1. Overwatch: remove Kevin as a hittable target. Make the rifle refuse to fire (like the finale roof's 25 m check) or make Kevin a non-hitbox actor, and move him 25+ m from any line of fire. Don't equip the hidden real beanbag gun on the child model (overwatch.js:521).
2. Free roam: add a 25 m child and family check to `frDraw`, plus auto-holster when a neighbour kid or teen comes within 25 m. Either suppress `nb_kid`/`nb_teen` porch spawns while heat > 0 or crews are hostile, or keep kids off crew turf.
3. Replace "Hoodie" as the enemy caption and callout. Replace "thugs" in the shop text. Rename the `thug_fro` key and voice keys (internal, but they show up in dev tools and mods). Rebalance the core-4 enemy looks. Give child NPCs more than one model. Reconsider the lookout names DeShawn, Andre and Marcus.
4. Dadazon: new name, palette and box art. Change "Prime Day".
5. Brand sweep per the table in section 5 (Costco ×4, Walgreens, Gatorade, Buick, Sienna, Corolla, Super Soaker, Mario Kart, Minecraft, Disney, Roomba, Crockpot, Rocket Pop, Little League, Rotary, Elks, QUIKSTOP, SAV-MOR, KIDZ 98, NightOwl, Obama, Springsteen; the nailer's yellow and black).
6. Rename "End of the Line". Consider reshaping the heat meter and turf map away from GTA conventions.
7. Graffiti: replace "NO SNITCH", "KINGZ" and the crown on "DUKE".
8. Decide on the church cross versus the "no religious symbols" rule. Reword "Families are behind the bounce house" and "Families are in the church hall".
9. Store copy: avoid "taking their neighborhood back". Visually verify Doug's model for police insignia.
10. Content survey: realistic violence with guns, no blood, killing surrendered persons possible (penalised), drug references (implied), restraint of people including teens, alcohol reference (sign), gambling references (lotto sign, raffle, betting dialogue), no sexual content, no profanity.
