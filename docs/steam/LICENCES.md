# Licences and third-party inventory

Audit date: 2026-11-21, branch `work/steam-audit`. Scope: every file under `assets/` (263 source files; the 465 files in `assets/opt/` are build outputs of those same sources made by `tools/build-assets.js` and inherit their licence row), every library loaded by `index.html`, and runtime-fetched resources. Method: `assets/CREDITS.md`, `assets/credits/*.md`, `assets/people/rocketbox/CREDITS.md`, licence files in the repo, glTF `asset`/node/image names, JPEG/PNG metadata (none of the images carry EXIF/XMP), `tools/` scripts, and git history. Git history before commit `6d95d66` (2026-11-19) is squashed into one import commit, so history cannot prove where a file came from. A file is only marked OK when a credits file in the repo names its source and licence. Name-pattern guesses are recorded but do not count as proof.

Status key: **OK** = commercial use allowed, nothing to show in-game. **NEEDS ATTRIBUTION** = commercial use allowed, but a notice or licence text has to ship with the game. **UNKNOWN** = the repo does not prove where it came from (none left). **NOT ALLOWED COMMERCIALLY** = none found.

## Release blockers

| # | Blocker | Files | Suggested fix |
|---|---|---|---|
| B1 | ~~UNKNOWN provenance: 4 surface texture sets~~ **RESOLVED 2026-11-21.** All four are Poly Haven CC0 sets: mulch = Brown Mud Leaves 01 (Rob Tuytel), paintwall = Painted Plaster Wall (Amal Kumar), pavers = Concrete Pavement (Charlotte Baglioni), plywood = Plywood (Rob Tuytel). Found by comparing every Poly Haven texture; all three maps match. | `tex/mulch_*`, `tex/paintwall_*`, `tex/pavers_*`, `tex/plywood_*` | Recorded in `assets/CREDITS.md`. Nothing replaced. |
| B2 | ~~UNKNOWN provenance: 3 decal PNGs~~ **RESOLVED 2026-11-21.** ambientCG CC0: asphalt_patch = AsphaltDamage001, leak_a = Leaking012A, leak_b = Leaking016A (the leaks are wall drip streaks, alpha taken from the source colour map). | `world/leak_a.png`, `world/leak_b.png`, `world/asphalt_patch.png` | Recorded in `assets/CREDITS.md`. Nothing replaced. |
| B3 | ~~UNKNOWN provenance: 4 models~~ **RESOLVED 2026-11-21.** Poly Haven CC0: grass_medium_02, shrub_02, potted_plant_02 (Rico Cilliers), pull_chain_light_socket (Josh Dean). The three world/ files are byte-for-byte equivalent exports (same vertex counts and bounds); potted_plant_02 is a simplified copy whose names, bounds and textures match. | `world/grass_medium_02.glb`, `world/shrub_02.glb`, `world/pull_chain_light_socket.glb`, `home/potted_plant_02.glb` | Recorded in `assets/CREDITS.md`. |
| B4 | **Own-code licence is CC0.** `LICENSE` puts the repository, which includes the game code, in the public domain. Anyone may legally copy, repackage and sell the game. This is not a third-party problem, but for a paid release it is the owner's decision. | `LICENSE` | Owner decides: keep CC0 (allowed on Steam, but no legal recourse against clones), or relicense future versions under "all rights reserved". Earlier commits stay CC0. The third-party CC0/MIT assets are unaffected either way. |
| B5 | **AI-generated assets need declaring.** The CC0 licence is fine, but Hugging Face lists the 7 "Pixel Art Atlas" models as generated with an AI image model plus a pixel-art LoRA. Steam's content survey requires AI-generated content to be disclosed. | `home/pixel_{award_plaque,barbecue_grill,combination_safe,doghouse,footlocker,pet_bed,tall_trophy_cup}.glb` | Either declare them in the Steamworks AI disclosure (see CONTENT.md) or replace them with Kenney/Poly Haven/Quaternius CC0 equivalents, which removes the question. The barbecue, safe and doghouse all have CC0 equivalents. |
| B6 | **Licence notices not shipped in-game.** The MIT notices for Rocketbox, three.js and meshoptimizer must be included with every copy of the game. Today they are only in repo markdown, and the game has no credits/licences screen (see below). | — | Add a "Credits & licences" screen to the main menu and also ship a `THIRD-PARTY-NOTICES.txt` in the depot. Text is provided below. |

### B5 detail: where the 7 Pixel Art Atlas models are used (checked 2026-11-21, nothing replaced yet)

Placed furniture in the house is **not** these models: `js/home.js` builds every one of these items procedurally (`FURN` builders for `plaque`, `trophy`, `safe`, `footlocker`, `grill`, `doghouse`, `dogbed`, home.js:938-958). The `.glb` files are only used in two places:

| Model | Catalogue item (`js/save.js`) | Where it appears |
|---|---|---|
| `home/pixel_award_plaque.glb` | `plaque` "World's Okayest Dad Plaque" (save.js:136) | 3D thumbnail on the shop / storage card (Dadazon furniture tab, Hank's) via `gltfThumbs` (save.js:1354) |
| `home/pixel_tall_trophy_cup.glb` | `trophy` "Fantasy League Trophy" (save.js:137) | shop / storage thumbnail |
| `home/pixel_combination_safe.glb` | `safe` "Combination Safe" (save.js:142) | shop / storage thumbnail **and** a set-dressing prop in Doug's raid (*The Kingpin*) boss room (`js/world.js:305` EXTRA_MODELS, placed at world.js:657) |
| `home/pixel_footlocker.glb` | `footlocker` "Army Footlocker" (save.js:144) | shop / storage thumbnail |
| `home/pixel_barbecue_grill.glb` | `grill` "Kettle Grill Upgrade" (save.js:145) | shop / storage thumbnail |
| `home/pixel_doghouse.glb` | `doghouse` "Biscuit Manor" (save.js:150) | shop / storage thumbnail |
| `home/pixel_pet_bed.glb` | `dogbed` "Orthopedic Dog Bed" (save.js:151) | shop / storage thumbnail |

**Replacement estimate: about half a day.** (1) Thumbnails: point the 7 catalogue entries at the existing procedural builders instead of a `.glb` (expose home.js's `FURN` builders to the thumbnail renderer, or render a `model:null` item from the builder), then check the 7 cards in the shop: 2-3 h. This also makes the shop card match what you actually get in the house. (2) The Kingpin safe: reuse the procedural `safe` builder, or swap in a CC0 Poly Haven/Kenney safe-like prop, and check the boss room: about 1 h. (3) Delete the 7 files, rebuild `assets/opt/`, drop the CREDITS row, and answer "no pre-generated AI content" in the survey: under 1 h. Low risk: the in-house versions already exist and are what players see in the house.

Not blockers, but they should be fixed in the same pass:
- **Stale credits rows (FIXED 2026-11-21).** `assets/CREDITS.md` listed `chars/dad_beard.glb`, `dad_worker`, `thug_hoodie`, `thug_punk`, `boss_suit`, `props/gun_*.glb` and a whole `guns2/` folder. None of these files exist any more. Those rows are deleted.
- `world/hanging_industrial_lamp.glb` and `world/shrub_04.glb` are separate exports of assets that are credited under `home/`. Explicit `world/` rows added (FIXED).
- The `people/rocketbox/README.md` said "13 characters"; the folder ships 33. Fixed.
- `oga_m4a1.glb` (RESOLVED 2026-11-21): the OpenGameArt page answers again and says "Author: nisu", "License(s): CC0" (upstream 3dmodelscc0.com, now 404). BigWhyaaa was only a commenter; credits corrected. Evidence: `docs/steam/evidence/oga_m4a1.txt`.
- Poly Haven home additions are credited only as "Poly Haven contributors". That is fine for CC0, but the credits screen will look better with names, which the asset pages list.
- `assets/og.jpg` (web link preview) and the repo-root `pause.png` (1280×760, not referenced by any code) have no recorded origin. Neither needs to be in the Steam depot. Leave them out of the build (see below).
- Not shipped and not in the inventory, but check they stay out of the depot: `dev/` (contains `bg_hub_*.jpg` and test pages), `legacy/`, `tools/`, `docs/`, `assets/people/rocketbox/test.html`.

## Libraries and runtime-fetched resources

| Thing | How it ships today | Author | Licence | Commercial | Attribution | Evidence | Status |
|---|---|---|---|---|---|---|---|
| three.js r128 `three.min.js` | CDN: cdnjs.cloudflare.com (`index.html:71`) | three.js authors (mrdoob and contributors) | MIT | yes | MIT notice must accompany copies | three.js repo LICENSE (MIT); not vendored in repo | NEEDS ATTRIBUTION |
| three.js r128 examples: GLTFLoader, RGBELoader, SkeletonUtils, EffectComposer, ShaderPass, UnrealBloomPass, CopyShader, LuminosityHighPassShader, FXAAShader | CDN: cdn.jsdelivr.net combine (`index.html:73`) | three.js authors (FXAA shader after NVIDIA/T. Lottes, bloom after a three.js contributor) | MIT (as part of the three.js package) | yes | same notice as three.js | npm three@0.128.0 package licence | NEEDS ATTRIBUTION |
| `meshopt_decoder.js` (three@0.128.0/examples/js/libs) | CDN: jsdelivr (`index.html:73`) | Arseny Kapoulkine (meshoptimizer) | MIT | yes | MIT notice | meshoptimizer licence (MIT) | NEEDS ATTRIBUTION |
| Google Fonts CSS `@import` (Barlow, Barlow Condensed, Bowlby One) | `css/menus.css:5` fetches from fonts.googleapis.com, a duplicate of the self-hosted woff2 files | see fonts rows | OFL 1.1 | yes | — | — | OK (remove the @import for the Steam build: it is a network call and a privacy point) |
| Service worker `sw.js` | own code | High Trust | repo licence | — | — | — | OK (disable it in the desktop wrapper; see QA-GAPS.md) |
| Horn tunes (`js/carai.js:67-74`): Shave and a Haircut (1899), Ode to Joy (Beethoven 1824), Take Me Out to the Ball Game (von Tilzer/Norworth 1908), Für Elise (Beethoven), William Tell Overture (Rossini 1829), The Entertainer (Joplin 1902) | note data, synthesized | composers listed | public domain compositions; no recordings used | yes | no | `assets/credits/menus.md` | OK |
| Music, SFX, voices (`js/audio.js`) | synthesized at runtime, "original material" (`js/audio.js:491`); no audio files in repo | High Trust | repo licence | yes | no | `docs/AUDIO.md:3` | OK |
| Effects textures, vehicles, in-world signage, icons | procedural (`js/fx.js`, `js/vehicles.js`, `js/world.js`, `js/save.js`) | High Trust | repo licence | yes | no | `assets/credits/fx.md`, `CREDITS.md` "Vehicles" | OK |
| Build tools (not shipped): glTF-Transform 4.1.1 (MIT), meshoptimizer 0.22.0 (MIT), sharp 0.33.5 (Apache-2.0, bundles libvips LGPL-3.0), Blender 5.0 (GPL; its output is not covered by the GPL) | `tools/package.json`, `tools/rocketbox/*` | — | — | — | not needed (not distributed) | — | OK |

**For Steam, vendor the libraries.** Copy `three.min.js` r128 and the ten example files into `vendor/three-r128/`, along with three.js's `LICENSE`. A Steam build must run offline, so it should not load code from a CDN. See QA-GAPS.md.

## Does the game have a credits screen?

**No, not in the sense Steam or the licences need.** The only credits are the in-fiction roll at the end of the finale (`js/jobs/_finale-fest.js:139-151`). It lists the characters ("Gary · spreadsheets, morale, one pivot table", and so on), it only appears after the last mission, and it names no developer or third-party asset. The title and pause menus have no Credits or Licences entry (`js/save.js`, `docs/design/MENUS.md`). Fix: add **Main menu → Credits** showing the text below, and put a link to it from the end of the finale roll.

## In-game CREDITS text

**Single source of truth: `assets/credits/credits.txt`.** The in-game Credits screen loads or embeds that file verbatim; edit it there, never in code, and copy it here when it changes. Copy as of 2026-11-21:

```
HIGH TRUST

Design, code, procedural art, music and sound
  [Studio / developer name]

Built with three.js (r128), (c) three.js authors, MIT License
Mesh decoding: meshoptimizer, (c) Arseny Kapoulkine, MIT License

PEOPLE
Characters and motion capture: Microsoft Rocketbox Avatar Library
  (c) 2020 Microsoft, MIT License (modified: retextured, re-rigged, retargeted)
Additional animation: Quaternius, Universal Animation Library 1 & 2 (CC0)
Family stand-ins and animation: Quaternius, Ultimate Modular Characters,
  Ultimate Animated Animals (CC0)

WORLD
Textures, HDRI sky and props: Poly Haven (CC0)
  Rob Tuytel, Greg Zaal, Jarod Guest, Dimitrios Savva, Rico Cilliers,
  Guillaume Monsergent, Jenelle van Heerden, Charlotte Baglioni,
  Dario Barresi, Sergej Majboroda, Amal Kumar, Josh Dean, GurJas Studios,
  Jorge Camacho, Serhii Khromov, Kirill Sannikov, Ethan Place,
  Aron Łyczek, Benny Weimer, MP, James Ray Cock, Rahul Chaudhary,
  Jurita Burger, Kuutti Siitonen, Amin, Ulan Cabanilla, Gabriel Radić,
  Antanas Kep, Yann Kervran, John Hutcheson, Satyaki Mandal,
  Mateusz Sadek, and the Poly Haven contributors
Textures and decals: ambientCG, Lennart Demes (CC0)
Models: Kenney, Car Kit, Furniture Kit, Mini Arena (CC0)
Models: Quaternius, Stylized Nature MegaKit (CC0)
Models via OpenGameArt (CC0): lucian-pavel (crates and pallet),
  braveo (mailbox), nisu (carbine, from 3dmodelscc0.com)
Furniture icons: Pixel Art Atlas GLB models, CodePawl / Angais (CC0)

TYPE
Barlow and Barlow Condensed by Jeremy Tribby; Bowlby One by Vernon Adams
  SIL Open Font License 1.1

MUSIC
Horn tunes after public-domain compositions by Beethoven, Rossini,
  Joplin, and von Tilzer & Norworth

Full licence texts: see THIRD-PARTY-NOTICES.txt in the install folder.
Thank you to everyone who gives their work away.
```

`THIRD-PARTY-NOTICES.txt` (written: `assets/credits/THIRD-PARTY-NOTICES.txt`; copy it to the depot root at build time) must contain the full MIT text three times, once each for Microsoft Rocketbox (© 2020 Microsoft; the text is already in `assets/people/rocketbox/CREDITS.md`), three.js (© 2010-2021 three.js authors) and meshoptimizer (© Arseny Kapoulkine), plus the three `assets/fonts/OFL-*.txt` files.

## Full asset inventory (every file under `assets/`, excluding `assets/opt/` build outputs)

Generated from the file tree on 2026-11-21 and checked against the credits files. Counts: 263 files, 221 OK, 42 NEEDS ATTRIBUTION (Rocketbox MIT and font binaries), 0 UNKNOWN. Updated 2026-11-21 on `work/release-content`: the 19 former UNKNOWN files were matched to their official CC0 sources (see the B1-B3 rows).

| File | Source | Author | Licence | Commercial | Attribution | Evidence | Status |
|---|---|---|---|---|---|---|---|
| `CREDITS.md` | Project documentation / metadata | High Trust | project licence (see LICENSE) | yes | no | — | OK (own work; test.html is a dev viewer, exclude from build) |
| `chars/dad_casual.glb` | Quaternius Ultimate Modular Men, Male/Casual_2 (via GitHub mirror LuanDucate/Ducz.CharacterCreator, which ships LICENSE-Quaternius.txt) | Quaternius | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `credits/fx.md` | Project documentation / metadata | High Trust | project licence (see LICENSE) | yes | no | — | OK (own work; test.html is a dev viewer, exclude from build) |
| `credits/guns.md` | Project documentation / metadata | High Trust | project licence (see LICENSE) | yes | no | — | OK (own work; test.html is a dev viewer, exclude from build) |
| `credits/menus.md` | Project documentation / metadata | High Trust | project licence (see LICENSE) | yes | no | — | OK (own work; test.html is a dev viewer, exclude from build) |
| `credits/world.md` | Project documentation / metadata | High Trust | project licence (see LICENSE) | yes | no | — | OK (own work; test.html is a dev viewer, exclude from build) |
| `family/dog_shiba.glb` | Quaternius Ultimate Animated Animals ShibaInu (via GitHub mirror Dustyluc123/goblo) | Quaternius | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `family/kid_daughter.glb` | Quaternius Ultimate Modular Women Female/Adventurer | Quaternius | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `family/kid_son.glb` | Quaternius Ultimate Modular Men Male/Beach | Quaternius | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `family/spouse_casual.glb` | Quaternius Ultimate Modular Women Female/Casual | Quaternius | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `fonts/OFL-barlow.txt` | Google Fonts "Barlow" (Latin subset) | Jeremy Tribby | SIL OFL 1.1 | yes | licence text must ship with the font (present); no in-game credit required | assets/CREDITS.md + OFL-*.txt | OK |
| `fonts/OFL-barlowcondensed.txt` | Google Fonts "Barlow Condensed" (Latin subset) | Jeremy Tribby | SIL OFL 1.1 | yes | licence text must ship with the font (present); no in-game credit required | assets/CREDITS.md + OFL-*.txt | OK |
| `fonts/OFL-bowlbyone.txt` | Google Fonts "Bowlby One" (Latin subset) | Vernon Adams | SIL OFL 1.1 | yes | licence text must ship with the font (present); no in-game credit required | assets/CREDITS.md + OFL-*.txt | OK |
| `fonts/barlow-500.woff2` | Google Fonts "Barlow" (Latin subset) | Jeremy Tribby | SIL OFL 1.1 | yes | licence text must ship with the font (present); no in-game credit required | assets/CREDITS.md + OFL-*.txt | NEEDS ATTRIBUTION |
| `fonts/barlow-600.woff2` | Google Fonts "Barlow" (Latin subset) | Jeremy Tribby | SIL OFL 1.1 | yes | licence text must ship with the font (present); no in-game credit required | assets/CREDITS.md + OFL-*.txt | NEEDS ATTRIBUTION |
| `fonts/barlow-700.woff2` | Google Fonts "Barlow" (Latin subset) | Jeremy Tribby | SIL OFL 1.1 | yes | licence text must ship with the font (present); no in-game credit required | assets/CREDITS.md + OFL-*.txt | NEEDS ATTRIBUTION |
| `fonts/barlow-condensed-500.woff2` | Google Fonts "Barlow Condensed" (Latin subset) | Jeremy Tribby | SIL OFL 1.1 | yes | licence text must ship with the font (present); no in-game credit required | assets/CREDITS.md + OFL-*.txt | NEEDS ATTRIBUTION |
| `fonts/barlow-condensed-600.woff2` | Google Fonts "Barlow Condensed" (Latin subset) | Jeremy Tribby | SIL OFL 1.1 | yes | licence text must ship with the font (present); no in-game credit required | assets/CREDITS.md + OFL-*.txt | NEEDS ATTRIBUTION |
| `fonts/barlow-condensed-700.woff2` | Google Fonts "Barlow Condensed" (Latin subset) | Jeremy Tribby | SIL OFL 1.1 | yes | licence text must ship with the font (present); no in-game credit required | assets/CREDITS.md + OFL-*.txt | NEEDS ATTRIBUTION |
| `fonts/barlow-condensed-800.woff2` | Google Fonts "Barlow Condensed" (Latin subset) | Jeremy Tribby | SIL OFL 1.1 | yes | licence text must ship with the font (present); no in-game credit required | assets/CREDITS.md + OFL-*.txt | NEEDS ATTRIBUTION |
| `fonts/bowlby-one-400.woff2` | Google Fonts "Bowlby One" (Latin subset) | Vernon Adams | SIL OFL 1.1 | yes | licence text must ship with the font (present); no in-game credit required | assets/CREDITS.md + OFL-*.txt | NEEDS ATTRIBUTION |
| `guns/oga_m4a1.glb` | OpenGameArt "M4A1 Assault Rifle" (https://opengameart.org/content/m4a1-assault-rifle), originally from 3dmodelscc0.com; page re-checked 2026-11-21 (HTTP 200: "Author: nisu", "License(s): CC0"); node names and normal map match the page's m4a1.zip | nisu | CC0 1.0 | yes | no | assets/credits/guns.md, docs/steam/evidence/oga_m4a1.txt | OK |
| `guns/ph_bolt_rifle.glb` | Poly Haven "Bolt Action Rifle 7.62" | Mateusz Sadek | CC0 1.0 | yes | no | assets/credits/guns.md | OK |
| `guns/ph_pistol.glb` | Poly Haven "Service Pistol" | Mateusz Sadek | CC0 1.0 | yes | no | assets/credits/guns.md | OK |
| `home/ArmChair_01.glb` | Poly Haven "ArmChair_01" | Kirill Sannikov | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/Ottoman_01.glb` | Poly Haven "Ottoman_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/Rockingchair_01.glb` | Poly Haven "Rockingchair_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/Shelf_01.glb` | Poly Haven "Shelf_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/Sofa_01.glb` | Poly Haven "Sofa_01" | Kirill Sannikov | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/WoodenTable_03.glb` | Poly Haven "WoodenTable_03" | Gabriel Radić | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/adjustable_wrench.glb` | Poly Haven "adjustable_wrench" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/american_football.glb` | Poly Haven "american_football" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/bench_vice_01.glb` | Poly Haven "bench_vice_01" | Antanas Kep, Yann Kervran | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/cardboard_box_lo.glb` | Derived from props/cardboard_box.glb (Poly Haven Cardboard Box 01) | Rahul Chaudhary | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/ceiling_fan.glb` | Poly Haven "ceiling_fan" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/ceramic_vase_01.glb` | Poly Haven "ceramic_vase_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/cross_pein_hammer.glb` | Poly Haven "cross_pein_hammer" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/dartboard.glb` | Poly Haven "dartboard" | Satyaki Mandal | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/dining_chair_02.glb` | Poly Haven "dining_chair_02" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/dining_table.glb` | Poly Haven "dining_table" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/fancy_picture_frame_01.glb` | Poly Haven "fancy_picture_frame_01" | Rob Tuytel, Rico Cilliers | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/flathead_screwdriver.glb` | Poly Haven "flathead_screwdriver" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/food_apple_01.glb` | Poly Haven "food_apple_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/football.glb` | Poly Haven "football" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/gamepad.glb` | Poly Haven "gamepad" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/garden_gnome.glb` | Poly Haven "garden_gnome" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/garden_hose_wall_mounted_01.glb` | Poly Haven "garden_hose_wall_mounted_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/handsaw_wood.glb` | Poly Haven "handsaw_wood" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/hanging_industrial_lamp.glb` | Poly Haven "hanging_industrial_lamp" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/hanging_picture_frame_01.glb` | Poly Haven "hanging_picture_frame_01" | James Ray Cock | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/jug_01.glb` | Poly Haven "jug_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/kenney_bedDouble.glb` | Kenney Furniture Kit 2.1 | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/kenney_cabinetTelevision.glb` | Kenney Furniture Kit 2.1 | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/kenney_kitchenCabinet.glb` | Kenney Furniture Kit 2.1 | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/kenney_kitchenFridgeLarge.glb` | Kenney Furniture Kit 2.1 | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/kenney_kitchenSink.glb` | Kenney Furniture Kit 2.1 | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/kenney_kitchenStove.glb` | Kenney Furniture Kit 2.1 | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/kenney_lampRoundFloor.glb` | Kenney Furniture Kit 2.1 | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/kenney_rugRectangle.glb` | Kenney Furniture Kit 2.1 | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/kenney_rugRounded.glb` | Kenney Furniture Kit 2.1 | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/kenney_televisionModern.glb` | Kenney Furniture Kit 2.1 | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/kenney_trophy.glb` | Kenney Mini Arena (trophy) | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/measuring_tape_01.glb` | Poly Haven "measuring_tape_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/metal_tool_chest.glb` | Poly Haven "metal_tool_chest" | John Hutcheson, Yann Kervran | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/mid_century_lounge_chair.glb` | Poly Haven "mid_century_lounge_chair" | Kuutti Siitonen | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/modern_arm_chair_01.glb` | Poly Haven "modern_arm_chair_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/modern_ceiling_lamp_01.glb` | Poly Haven "modern_ceiling_lamp_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/modern_coffee_table_01.glb` | Poly Haven "modern_coffee_table_01" | Amin | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/modern_wooden_cabinet.glb` | Poly Haven "modern_wooden_cabinet" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/outdoor_table_chair_set_01.glb` | Poly Haven "outdoor_table_chair_set_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/painted_wooden_chair_02.glb` | Poly Haven "painted_wooden_chair_02" | Kirill Sannikov | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/painted_wooden_nightstand.glb` | Poly Haven "painted_wooden_nightstand" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/pixel_award_plaque.glb` | "Pixel Art Atlas" GLB dataset (huggingface.co/datasets/codepawl/pixel-atlas-glb) | CodePawl / Angais; dataset page lists the assets as generated with an AI image model + pixel-art LoRA | CC0 1.0 | yes (as licensed) | no | assets/CREDITS.md + dataset page (checked 2026-11-21) | OK licence-wise, but AI-GENERATED: must be declared in Steam AI disclosure, or replace |
| `home/pixel_barbecue_grill.glb` | "Pixel Art Atlas" GLB dataset (huggingface.co/datasets/codepawl/pixel-atlas-glb) | CodePawl / Angais; dataset page lists the assets as generated with an AI image model + pixel-art LoRA | CC0 1.0 | yes (as licensed) | no | assets/CREDITS.md + dataset page (checked 2026-11-21) | OK licence-wise, but AI-GENERATED: must be declared in Steam AI disclosure, or replace |
| `home/pixel_combination_safe.glb` | "Pixel Art Atlas" GLB dataset (huggingface.co/datasets/codepawl/pixel-atlas-glb) | CodePawl / Angais; dataset page lists the assets as generated with an AI image model + pixel-art LoRA | CC0 1.0 | yes (as licensed) | no | assets/CREDITS.md + dataset page (checked 2026-11-21) | OK licence-wise, but AI-GENERATED: must be declared in Steam AI disclosure, or replace |
| `home/pixel_doghouse.glb` | "Pixel Art Atlas" GLB dataset (huggingface.co/datasets/codepawl/pixel-atlas-glb) | CodePawl / Angais; dataset page lists the assets as generated with an AI image model + pixel-art LoRA | CC0 1.0 | yes (as licensed) | no | assets/CREDITS.md + dataset page (checked 2026-11-21) | OK licence-wise, but AI-GENERATED: must be declared in Steam AI disclosure, or replace |
| `home/pixel_footlocker.glb` | "Pixel Art Atlas" GLB dataset (huggingface.co/datasets/codepawl/pixel-atlas-glb) | CodePawl / Angais; dataset page lists the assets as generated with an AI image model + pixel-art LoRA | CC0 1.0 | yes (as licensed) | no | assets/CREDITS.md + dataset page (checked 2026-11-21) | OK licence-wise, but AI-GENERATED: must be declared in Steam AI disclosure, or replace |
| `home/pixel_pet_bed.glb` | "Pixel Art Atlas" GLB dataset (huggingface.co/datasets/codepawl/pixel-atlas-glb) | CodePawl / Angais; dataset page lists the assets as generated with an AI image model + pixel-art LoRA | CC0 1.0 | yes (as licensed) | no | assets/CREDITS.md + dataset page (checked 2026-11-21) | OK licence-wise, but AI-GENERATED: must be declared in Steam AI disclosure, or replace |
| `home/pixel_tall_trophy_cup.glb` | "Pixel Art Atlas" GLB dataset (huggingface.co/datasets/codepawl/pixel-atlas-glb) | CodePawl / Angais; dataset page lists the assets as generated with an AI image model + pixel-art LoRA | CC0 1.0 | yes (as licensed) | no | assets/CREDITS.md + dataset page (checked 2026-11-21) | OK licence-wise, but AI-GENERATED: must be declared in Steam AI disclosure, or replace |
| `home/planter_box_01.glb` | Poly Haven "planter_box_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/pliers.glb` | Poly Haven "pliers" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/potted_plant_02.glb` | Poly Haven "potted_plant_02" (https://polyhaven.com/a/potted_plant_02); simplified/quantized copy: all node, material and image names match, bounds within 3 mm, textures match; checked 2026-11-21 | Rico Cilliers | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `home/potted_plant_04.glb` | Poly Haven "potted_plant_04" | James Ray Cock | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/propane_tank.glb` | Poly Haven "propane_tank" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/round_wooden_table_02.glb` | Poly Haven "round_wooden_table_02" | Ulan Cabanilla | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/shrub_04.glb` | Poly Haven "shrub_04" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/side_table_01.glb` | Poly Haven "side_table_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/standing_picture_frame_01.glb` | Poly Haven "standing_picture_frame_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/standing_picture_frame_02.glb` | Poly Haven "standing_picture_frame_02" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/steel_frame_shelves_01.glb` | Poly Haven "steel_frame_shelves_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/stone_fire_pit.glb` | Poly Haven "stone_fire_pit" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/tex/linen_col.jpg` | Poly Haven "Rough Linen" | Poly Haven (author not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/tex/linen_nrm.jpg` | Poly Haven "Rough Linen" | Poly Haven (author not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/tex/linen_rgh.jpg` | Poly Haven "Rough Linen" | Poly Haven (author not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/tex/oakfloor_col.jpg` | Poly Haven "Laminate Floor 02" | Poly Haven (author not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/tex/oakfloor_nrm.jpg` | Poly Haven "Laminate Floor 02" | Poly Haven (author not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/tex/oakfloor_rgh.jpg` | Poly Haven "Laminate Floor 02" | Poly Haven (author not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/tex/stonetile_col.jpg` | Poly Haven "Marble 01" | Poly Haven (author not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/tex/stonetile_nrm.jpg` | Poly Haven "Marble 01" | Poly Haven (author not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/tex/stonetile_rgh.jpg` | Poly Haven "Marble 01" | Poly Haven (author not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/tex/wallpaint_col.jpg` | Poly Haven "Plastered Wall 04" | Poly Haven (author not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/tex/wallpaint_nrm.jpg` | Poly Haven "Plastered Wall 04" | Poly Haven (author not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/tex/wallpaint_rgh.jpg` | Poly Haven "Plastered Wall 04" | Poly Haven (author not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/throw_pillows_01.glb` | Poly Haven "throw_pillows_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/tool_cart.glb` | Poly Haven "tool_cart" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/wall_clock.glb` | Poly Haven "wall_clock" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/watering_can_metal_01.glb` | Poly Haven "watering_can_metal_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/wicker_basket_01.glb` | Poly Haven "wicker_basket_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/wooden_bookshelf_worn.glb` | Poly Haven "wooden_bookshelf_worn" | Ulan Cabanilla | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `home/wooden_bowl_01.glb` | Poly Haven "wooden_bowl_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/wooden_cutting_board.glb` | Poly Haven "wooden_cutting_board" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/wooden_display_shelves_01.glb` | Poly Haven "wooden_display_shelves_01" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `home/wooden_picnic_table.glb` | Poly Haven "wooden_picnic_table" | Poly Haven contributors (individual authors not recorded) | CC0 1.0 | yes | no | assets/CREDITS.md (Home interior additions) | OK |
| `og.jpg` | Link-preview image (1200x630) for the web build; no metadata; content presumed an in-game render but not recorded | High Trust (presumed) | not recorded | ? | ? | index.html og:image; commit ff52c02 | OK only if it is a game screenshot (owner to confirm); not needed in the Steam build |
| `people/rocketbox/CREDITS.md` | Project documentation / metadata | High Trust | project licence (see LICENSE) | yes | no | — | OK (own work; test.html is a dev viewer, exclude from build) |
| `people/rocketbox/README.md` | Project documentation / metadata | High Trust | project licence (see LICENSE) | yes | no | — | OK (own work; test.html is a dev viewer, exclude from build) |
| `people/rocketbox/anims.glb` | Rocketbox mocap (MIT) + Quaternius Universal Animation Library 1 & 2 and Ultimate Modular Men clips (CC0) + project-authored IK poses | Microsoft; Quaternius; High Trust | MIT + CC0 | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/anims.json` | Project documentation / metadata | High Trust | project licence (see LICENSE) | yes | no | — | OK (own work; test.html is a dev viewer, exclude from build) |
| `people/rocketbox/benny.glb` | Microsoft Rocketbox Avatar Library `Professions/Business_Male_06` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/boss.glb` | Microsoft Rocketbox Avatar Library `Professions/Business_Male_05` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/characters.json` | Project documentation / metadata | High Trust | project licence (see LICENSE) | yes | no | — | OK (own work; test.html is a dev viewer, exclude from build) |
| `people/rocketbox/dad_dave.glb` | Microsoft Rocketbox Avatar Library `Adults/Male_Adult_13` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/dad_doug.glb` | Microsoft Rocketbox Avatar Library `Professions/Police_Male_06` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/dad_gary.glb` | Microsoft Rocketbox Avatar Library `Adults/Male_Adult_03` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/dad_player.glb` | Microsoft Rocketbox Avatar Library `Assets/Avatars/Adults/Male_Adult_14` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/dad_rick.glb` | Microsoft Rocketbox Avatar Library `Adults/Male_Adult_01` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/daughter.glb` | Microsoft Rocketbox Avatar Library `Children/Female_Child_01` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/dee.glb` | Microsoft Rocketbox Avatar Library `Professions/Business_Female_01` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/earl.glb` | Microsoft Rocketbox Avatar Library `Professions/Business_Male_07` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/nb_gran.glb` | Microsoft Rocketbox Avatar Library `Professions/Business_Female_02` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/nb_kenji.glb` | Microsoft Rocketbox Avatar Library `Adults/Male_Adult_09` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/nb_kid.glb` | Microsoft Rocketbox Avatar Library `Children/Male_Child_02` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/nb_lucia.glb` | Microsoft Rocketbox Avatar Library `Adults/Female_Adult_11` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/nb_marcus.glb` | Microsoft Rocketbox Avatar Library `Adults/Male_Adult_12` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/nb_mei.glb` | Microsoft Rocketbox Avatar Library `Adults/Female_Adult_03` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/nb_office.glb` | Microsoft Rocketbox Avatar Library `Professions/Business_Female_03` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/nb_pops.glb` | Microsoft Rocketbox Avatar Library `Adults/Male_Adult_05` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/nb_sweater.glb` | Microsoft Rocketbox Avatar Library `Adults/Male_Adult_02` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/nb_teen.glb` | Microsoft Rocketbox Avatar Library `Adults/Female_Party_02` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/rosa.glb` | Microsoft Rocketbox Avatar Library `Professions/Medical_Female_01` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/son.glb` | Microsoft Rocketbox Avatar Library `Children/Male_Child_01` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/test.html` | Project documentation / metadata | High Trust | project licence (see LICENSE) | yes | no | — | OK (own work; test.html is a dev viewer, exclude from build) |
| `people/rocketbox/thug_beanie.glb` | Microsoft Rocketbox Avatar Library `Professions/Delivery_Male_01` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/thug_brown.glb` | Microsoft Rocketbox Avatar Library `Adults/Male_Adult_20` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/thug_cap.glb` | Microsoft Rocketbox Avatar Library `Professions/Wood_Male_01` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/thug_f_hood.glb` | Microsoft Rocketbox Avatar Library `Adults/Female_Adult_12` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/thug_f_leather.glb` | Microsoft Rocketbox Avatar Library `Adults/Female_Adult_04` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/thug_fro.glb` | Microsoft Rocketbox Avatar Library `Adults/Male_Adult_04` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/thug_hoodie.glb` | Microsoft Rocketbox Avatar Library `Adults/Male_Adult_18` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/thug_jacket.glb` | Microsoft Rocketbox Avatar Library `Adults/Male_Adult_07` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/thug_red.glb` | Microsoft Rocketbox Avatar Library `Adults/Male_Adult_10` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/thug_track.glb` | Microsoft Rocketbox Avatar Library `Adults/Male_Adult_17` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `people/rocketbox/wife.glb` | Microsoft Rocketbox Avatar Library `Adults/Female_Adult_01` (github.com/microsoft/Microsoft-Rocketbox), modified | Microsoft | MIT | yes | yes: MIT copyright + permission notice must be included | assets/people/rocketbox/CREDITS.md | NEEDS ATTRIBUTION |
| `props/barrel_blue.glb` | Poly Haven Barrel 03 | Serhii Khromov | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/barrel_red.glb` | Poly Haven Barrel 01 | Jorge Camacho | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/bush.glb` | Quaternius Stylized Nature MegaKit | Quaternius | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/car_hatchback.glb` | Kenney Car Kit 3.1 | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/car_sedan.glb` | Kenney Car Kit 3.1 | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/car_suv.glb` | Kenney Car Kit 3.1 | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/car_van.glb` | Kenney Car Kit 3.1 (via GitHub mirror) | Kenney | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/cardboard_box.glb` | Poly Haven Cardboard Box 01 | Rahul Chaudhary | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/chest_wood.glb` | Poly Haven Wooden Crate 02 | James Ray Cock, Jurita Burger | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/couch.glb` | Poly Haven Sofa 02 | Kirill Sannikov | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/crate.glb` | OGA "CC0 Crates & Wooden Pallet" | lucian-pavel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/crate_long.glb` | OGA "CC0 Crates & Wooden Pallet" | lucian-pavel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/crate_slat.glb` | OGA "CC0 Crates & Wooden Pallet" | lucian-pavel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/mailbox.glb` | OGA "Low Poly Textured Mailbox" | braveo | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/pallet.glb` | OGA "CC0 Crates & Wooden Pallet" | lucian-pavel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/street_lamp.glb` | Poly Haven Street Lamp 01 | Josh Dean | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/table_dining.glb` | Poly Haven Dining Table | Aron Łyczek | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/table_low.glb` | Poly Haven Wooden Table 01 | Ethan Place | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/trash_can.glb` | Poly Haven Metal Trash Can | GurJas Studios | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/trashbag.glb` | Poly Haven Trashbag | Benny Weimer | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/tree_oak.glb` | Quaternius Stylized Nature MegaKit | Quaternius | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/tree_pine.glb` | Quaternius Stylized Nature MegaKit | Quaternius | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/tree_tall.glb` | Quaternius Stylized Nature MegaKit | Quaternius | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/tyre.glb` | Poly Haven Old Tyre | MP | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `props/utility_box.glb` | Poly Haven Utility Box 01 | James Ray Cock | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `sky/sky_1k.hdr` | Poly Haven "Kloofendal 48d Partly Cloudy (Pure Sky)" | Greg Zaal, Jarod Guest | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `sky/sky_2k.jpg` | Poly Haven "Kloofendal 48d Partly Cloudy (Pure Sky)" | Greg Zaal, Jarod Guest | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/asphalt_col.jpg` | Poly Haven "Asphalt 02" (polyhaven.com/a/asphalt_02) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/asphalt_nrm.jpg` | Poly Haven "Asphalt 02" (polyhaven.com/a/asphalt_02) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/asphalt_rgh.jpg` | Poly Haven "Asphalt 02" (polyhaven.com/a/asphalt_02) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/brick_col.jpg` | Poly Haven "Red Brick" (polyhaven.com/a/red_brick) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/brick_nrm.jpg` | Poly Haven "Red Brick" (polyhaven.com/a/red_brick) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/brick_rgh.jpg` | Poly Haven "Red Brick" (polyhaven.com/a/red_brick) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/concfloor_col.jpg` | Poly Haven "Concrete Floor Worn 001" (polyhaven.com/a/concrete_floor_worn_001) | Dimitrios Savva, Rico Cilliers | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/concfloor_nrm.jpg` | Poly Haven "Concrete Floor Worn 001" (polyhaven.com/a/concrete_floor_worn_001) | Dimitrios Savva, Rico Cilliers | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/concfloor_rgh.jpg` | Poly Haven "Concrete Floor Worn 001" (polyhaven.com/a/concrete_floor_worn_001) | Dimitrios Savva, Rico Cilliers | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/fence_alpha.jpg` | ambientCG Fence001 (ambientcg.com/view?id=Fence001) | Lennart Demes | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/fence_col.jpg` | ambientCG Fence001 (ambientcg.com/view?id=Fence001) | Lennart Demes | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/fence_nrm.jpg` | ambientCG Fence001 (ambientcg.com/view?id=Fence001) | Lennart Demes | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/fence_rgh.jpg` | ambientCG Fence001 (ambientcg.com/view?id=Fence001) | Lennart Demes | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/grass_col.jpg` | ambientCG Grass004 (ambientcg.com/view?id=Grass004) | Lennart Demes | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/grass_nrm.jpg` | ambientCG Grass004 (ambientcg.com/view?id=Grass004) | Lennart Demes | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/grass_rgh.jpg` | ambientCG Grass004 (ambientcg.com/view?id=Grass004) | Lennart Demes | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/metal_col.jpg` | Poly Haven "Corrugated Iron" (polyhaven.com/a/corrugated_iron) | Jenelle van Heerden, Dimitrios Savva | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/metal_nrm.jpg` | Poly Haven "Corrugated Iron" (polyhaven.com/a/corrugated_iron) | Jenelle van Heerden, Dimitrios Savva | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/metal_rgh.jpg` | Poly Haven "Corrugated Iron" (polyhaven.com/a/corrugated_iron) | Jenelle van Heerden, Dimitrios Savva | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/mulch_col.jpg` | Poly Haven "Brown Mud Leaves 01" (https://polyhaven.com/a/brown_mud_leaves_01); identified 2026-11-21 by image match against all 853 Poly Haven textures (mean diff 0.1/255 vs 3-7/255 for the next best) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `tex/mulch_nrm.jpg` | Poly Haven "Brown Mud Leaves 01" (https://polyhaven.com/a/brown_mud_leaves_01); identified 2026-11-21 by image match against all 853 Poly Haven textures (mean diff 0.1/255 vs 3-7/255 for the next best) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `tex/mulch_rgh.jpg` | Poly Haven "Brown Mud Leaves 01" (https://polyhaven.com/a/brown_mud_leaves_01); identified 2026-11-21 by image match against all 853 Poly Haven textures (mean diff 0.1/255 vs 3-7/255 for the next best) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `tex/paintwall_col.jpg` | Poly Haven "Painted Plaster Wall" (https://polyhaven.com/a/painted_plaster_wall); identified 2026-11-21 by image match against all 853 Poly Haven textures (mean diff 0.1/255 vs 3-7/255 for the next best) | Amal Kumar | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `tex/paintwall_nrm.jpg` | Poly Haven "Painted Plaster Wall" (https://polyhaven.com/a/painted_plaster_wall); identified 2026-11-21 by image match against all 853 Poly Haven textures (mean diff 0.1/255 vs 3-7/255 for the next best) | Amal Kumar | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `tex/paintwall_rgh.jpg` | Poly Haven "Painted Plaster Wall" (https://polyhaven.com/a/painted_plaster_wall); identified 2026-11-21 by image match against all 853 Poly Haven textures (mean diff 0.1/255 vs 3-7/255 for the next best) | Amal Kumar | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `tex/pavers_col.jpg` | Poly Haven "Concrete Pavement" (https://polyhaven.com/a/concrete_pavement); identified 2026-11-21 by image match against all 853 Poly Haven textures (mean diff 0.1/255 vs 3-7/255 for the next best) | Charlotte Baglioni | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `tex/pavers_nrm.jpg` | Poly Haven "Concrete Pavement" (https://polyhaven.com/a/concrete_pavement); identified 2026-11-21 by image match against all 853 Poly Haven textures (mean diff 0.1/255 vs 3-7/255 for the next best) | Charlotte Baglioni | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `tex/pavers_rgh.jpg` | Poly Haven "Concrete Pavement" (https://polyhaven.com/a/concrete_pavement); identified 2026-11-21 by image match against all 853 Poly Haven textures (mean diff 0.1/255 vs 3-7/255 for the next best) | Charlotte Baglioni | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `tex/plaster_col.jpg` | Poly Haven "Decrepit Wallpaper" (polyhaven.com/a/decrepit_wallpaper) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/plaster_nrm.jpg` | Poly Haven "Decrepit Wallpaper" (polyhaven.com/a/decrepit_wallpaper) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/plaster_rgh.jpg` | Poly Haven "Decrepit Wallpaper" (polyhaven.com/a/decrepit_wallpaper) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/plywood_col.jpg` | Poly Haven "Plywood" (https://polyhaven.com/a/plywood); identified 2026-11-21 by image match against all 853 Poly Haven textures (mean diff 0.1/255 vs 3-7/255 for the next best) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `tex/plywood_nrm.jpg` | Poly Haven "Plywood" (https://polyhaven.com/a/plywood); identified 2026-11-21 by image match against all 853 Poly Haven textures (mean diff 0.1/255 vs 3-7/255 for the next best) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `tex/plywood_rgh.jpg` | Poly Haven "Plywood" (https://polyhaven.com/a/plywood); identified 2026-11-21 by image match against all 853 Poly Haven textures (mean diff 0.1/255 vs 3-7/255 for the next best) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `tex/roof_col.jpg` | Poly Haven "Grey Roof 01" (polyhaven.com/a/grey_roof_01) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/roof_nrm.jpg` | Poly Haven "Grey Roof 01" (polyhaven.com/a/grey_roof_01) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/roof_rgh.jpg` | Poly Haven "Grey Roof 01" (polyhaven.com/a/grey_roof_01) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/rustmetal_col.jpg` | Poly Haven "Rusty Corrugated Iron" (polyhaven.com/a/rusty_corrugated_iron) | Charlotte Baglioni | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/rustmetal_nrm.jpg` | Poly Haven "Rusty Corrugated Iron" (polyhaven.com/a/rusty_corrugated_iron) | Charlotte Baglioni | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/rustmetal_rgh.jpg` | Poly Haven "Rusty Corrugated Iron" (polyhaven.com/a/rusty_corrugated_iron) | Charlotte Baglioni | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/sidewalk_col.jpg` | Poly Haven "Concrete Floor 02" (polyhaven.com/a/concrete_floor_02) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/sidewalk_nrm.jpg` | Poly Haven "Concrete Floor 02" (polyhaven.com/a/concrete_floor_02) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/sidewalk_rgh.jpg` | Poly Haven "Concrete Floor 02" (polyhaven.com/a/concrete_floor_02) | Rob Tuytel | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/siding_col.jpg` | ambientCG WoodSiding009 (ambientcg.com/view?id=WoodSiding009) | Lennart Demes | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/siding_nrm.jpg` | ambientCG WoodSiding009 (ambientcg.com/view?id=WoodSiding009) | Lennart Demes | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/siding_rgh.jpg` | ambientCG WoodSiding009 (ambientcg.com/view?id=WoodSiding009) | Lennart Demes | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/woodfloor_col.jpg` | Poly Haven "Old Wood Floor" (polyhaven.com/a/old_wood_floor) | Guillaume Monsergent | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/woodfloor_nrm.jpg` | Poly Haven "Old Wood Floor" (polyhaven.com/a/old_wood_floor) | Guillaume Monsergent | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex/woodfloor_rgh.jpg` | Poly Haven "Old Wood Floor" (polyhaven.com/a/old_wood_floor) | Guillaume Monsergent | CC0 1.0 | yes | no | assets/CREDITS.md | OK |
| `tex2/concrete_col.jpg` | Procedural, generated for this project (numpy script; script not in repo) | High Trust | CC0 (own) | yes | no | Building textures table | OK |
| `tex2/concrete_nrm.jpg` | Procedural, generated for this project (numpy script; script not in repo) | High Trust | CC0 (own) | yes | no | Building textures table | OK |
| `tex2/concrete_rgh.jpg` | Procedural, generated for this project (numpy script; script not in repo) | High Trust | CC0 (own) | yes | no | Building textures table | OK |
| `tex2/corrugated_col.jpg` | Poly Haven Corrugated Iron 02 | Sergej Majboroda, Jenelle van Heerden | CC0 1.0 | yes | no | assets/credits/world.md (Building textures table) | OK |
| `tex2/corrugated_nrm.jpg` | Poly Haven Corrugated Iron 02 | Sergej Majboroda, Jenelle van Heerden | CC0 1.0 | yes | no | assets/credits/world.md (Building textures table) | OK |
| `tex2/corrugated_rgh.jpg` | Poly Haven Corrugated Iron 02 | Sergej Majboroda, Jenelle van Heerden | CC0 1.0 | yes | no | assets/credits/world.md (Building textures table) | OK |
| `tex2/door6_col.jpg` | Procedural, generated for this project (numpy script; script not in repo) | High Trust | CC0 (own) | yes | no | Building textures table | OK |
| `tex2/door6_nrm.jpg` | Procedural, generated for this project (numpy script; script not in repo) | High Trust | CC0 (own) | yes | no | Building textures table | OK |
| `tex2/door6_rgh.jpg` | Procedural, generated for this project (numpy script; script not in repo) | High Trust | CC0 (own) | yes | no | Building textures table | OK |
| `tex2/garagedoor_col.jpg` | Procedural, generated for this project (numpy script; script not in repo) | High Trust | CC0 (own) | yes | no | Building textures table | OK |
| `tex2/garagedoor_nrm.jpg` | Procedural, generated for this project (numpy script; script not in repo) | High Trust | CC0 (own) | yes | no | Building textures table | OK |
| `tex2/garagedoor_rgh.jpg` | Procedural, generated for this project (numpy script; script not in repo) | High Trust | CC0 (own) | yes | no | Building textures table | OK |
| `tex2/interiors.jpg` | Procedural, generated for this project (numpy script; script not in repo) | High Trust | CC0 (own) | yes | no | Building textures table | OK |
| `tex2/lapsiding_col.jpg` | Procedural + Poly Haven White Planks Clean detail | High Trust / Rob Tuytel | CC0 1.0 | yes | no | assets/credits/world.md (Building textures table) | OK |
| `tex2/lapsiding_nrm.jpg` | Procedural + Poly Haven White Planks Clean detail | High Trust / Rob Tuytel | CC0 1.0 | yes | no | assets/credits/world.md (Building textures table) | OK |
| `tex2/lapsiding_rgh.jpg` | Procedural + Poly Haven White Planks Clean detail | High Trust / Rob Tuytel | CC0 1.0 | yes | no | assets/credits/world.md (Building textures table) | OK |
| `tex2/shingle_col.jpg` | Procedural, generated for this project (numpy script; script not in repo) | High Trust | CC0 (own) | yes | no | Building textures table | OK |
| `tex2/shingle_nrm.jpg` | Procedural, generated for this project (numpy script; script not in repo) | High Trust | CC0 (own) | yes | no | Building textures table | OK |
| `tex2/shingle_rgh.jpg` | Procedural, generated for this project (numpy script; script not in repo) | High Trust | CC0 (own) | yes | no | Building textures table | OK |
| `tex2/shutter_col.jpg` | Poly Haven Painted Metal Shutter | Charlotte Baglioni, Dario Barresi, Rico Cilliers | CC0 1.0 | yes | no | assets/credits/world.md (Building textures table) | OK |
| `tex2/shutter_nrm.jpg` | Poly Haven Painted Metal Shutter | Charlotte Baglioni, Dario Barresi, Rico Cilliers | CC0 1.0 | yes | no | assets/credits/world.md (Building textures table) | OK |
| `tex2/shutter_rgh.jpg` | Poly Haven Painted Metal Shutter | Charlotte Baglioni, Dario Barresi, Rico Cilliers | CC0 1.0 | yes | no | assets/credits/world.md (Building textures table) | OK |
| `tex2/stucco_col.jpg` | Poly Haven White Stucco 02 | Dimitrios Savva | CC0 1.0 | yes | no | assets/credits/world.md (Building textures table) | OK |
| `tex2/stucco_nrm.jpg` | Poly Haven White Stucco 02 | Dimitrios Savva | CC0 1.0 | yes | no | assets/credits/world.md (Building textures table) | OK |
| `tex2/stucco_rgh.jpg` | Poly Haven White Stucco 02 | Dimitrios Savva | CC0 1.0 | yes | no | assets/credits/world.md (Building textures table) | OK |
| `world/asphalt_patch.png` | ambientCG "AsphaltDamage001" (https://ambientcg.com/a/AsphaltDamage001); alpha = source opacity map (correlation 1.000); checked 2026-11-21 | ambientCG (Lennart Demes) | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `world/grass_medium_02.glb` | Poly Haven "grass_medium_02" (https://polyhaven.com/a/grass_medium_02); unmodified 1k glTF: node names, vertex counts and bounding boxes identical; checked 2026-11-21 | Rico Cilliers | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `world/hanging_industrial_lamp.glb` | Poly Haven "hanging_industrial_lamp" (same asset as assets/home/hanging_industrial_lamp.glb, credited there; this copy is a separate export, Blender I/O generator) | Poly Haven contributors | CC0 1.0 | yes | no | assets/CREDITS.md (home list), inferred same source | OK (explicit world/ row added to assets/CREDITS.md) |
| `world/leak_a.png` | ambientCG "Leaking012A" (https://ambientcg.com/a/Leaking012A); alpha = inverted source colour map (correlation 0.994); checked 2026-11-21 | ambientCG (Lennart Demes) | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `world/leak_b.png` | ambientCG "Leaking016A" (https://ambientcg.com/a/Leaking016A); alpha = inverted source colour map (correlation 0.998); checked 2026-11-21 | ambientCG (Lennart Demes) | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `world/pull_chain_light_socket.glb` | Poly Haven "pull_chain_light_socket" (https://polyhaven.com/a/pull_chain_light_socket); unmodified 1k glTF: node names, vertex counts and bounding boxes identical; checked 2026-11-21 | Josh Dean | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `world/shrub_02.glb` | Poly Haven "shrub_02" (https://polyhaven.com/a/shrub_02); unmodified 1k glTF: node names, vertex counts and bounding boxes identical; checked 2026-11-21 | Rico Cilliers | CC0 1.0 | yes | no | assets/CREDITS.md (re-established 2026-11-21) | OK |
| `world/shrub_04.glb` | Poly Haven "shrub_04" (same asset as assets/home/shrub_04.glb, credited there; this copy is a separate export, Blender I/O generator) | Poly Haven contributors | CC0 1.0 | yes | no | assets/CREDITS.md (home list), inferred same source | OK (explicit world/ row added to assets/CREDITS.md) |
| `world/wooden_picnic_table.glb` | Poly Haven "wooden_picnic_table" | Poly Haven contributors | CC0 1.0 | yes | no | assets/credits/world.md + CREDITS.md home list | OK |
