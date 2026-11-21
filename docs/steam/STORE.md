# Steam store page draft

Everything below comes from what is actually in the build (README, `docs/`, `js/jobs/*.js`, `index.html`, and QA-GAPS.md for the job and feature inventory). Asset sizes and rules were checked against Steamworks docs on 2026-11-21, and the sources are linked.

## Short description

Valve asks for "a few hundred characters", plain text, with nothing time-based ([description](https://partner.steamgames.com/doc/store/page/description)). The common 300-character cap is not on any official page, but we keep to it anyway.

> Four suburban dads, one minivan and a neighbourhood that stopped waving. Take jobs from the guys on your street, clear out the porch pirates, zip-tie the ones who give up, and win back two neighbourhoods' trust one block at a time. Doors Locked to Doors Unlocked.

(263 characters)

## About this game

**High Trust** is an open-world action comedy about a group of suburban dads. They would really prefer violence wasn't necessary.

Somebody's been taking packages off porches in Maple Heights, and now nobody waves any more. You're a dad with a minivan, a garage pistol and a lawn that needs mowing. Gary has a spreadsheet. Coach Rick has a whistle. Big Dave has a grill. Doug has opinions about call signs. Together you're going to fix this.

**Earn the town's trust back**
- **28 story jobs and a festival finale**, taken from the people on your street and across the river:
  - raid a chop shop for stolen packages
  - hold Linden Park through three waves
  - tail a car without being made
  - walk eleven kids home with a stop sign
  - run a heist on a storage lot (scope it, gear up, plan the crew, get away)
  - and the Riverside street festival that ends it all
- **Two neighbourhoods, two trust meters.** Maple Heights and Riverside Flats remember what you did. Wins, mercy and good manners move the needle from *Doors Locked* to *Doors Unlocked*, and the streets change as they do.
- **Mercy is a mechanic.** Hurt enemies sometimes give up. Zip-tie them instead of finishing the job, use the beanbag shotgun, or "have a word first". Shooting someone who surrendered costs you.

**A whole dad life**
- **A home that is actually yours.** Walk around it, decorate it with 33 pieces of furniture, keep your guns in the garage locker, and check the fridge calendar for replays and medals. Your family (Jen, Tyler, Maddie and Biscuit the dog) has opinions.
- **Dad's Auto.** Upgrade the family minivan or buy The Contractor, The Tailgater or The Suburbanite. V6 swaps, bull bars, reinforced panels, a gun rack, rims, paint, stickers and novelty horns.
- **Nine sensible firearms**, including Garage Pistol, Grandpa's Pump, Weekend Nailer, The Carpool, Deer Season and The Talking-To (non-lethal beanbag). Each has attachments, including The HOA-Approved Muffler.
- **More than shooting.** Stealth at night with a Maglite and night-vision, conversation jobs where tone matters, tailing, towing, convoys, a mower race, and a phone camera for collecting evidence for the HOA.

**Fort Sensible**
- The old post at the edge of town is open from the first minute. There's a shooting range with a timed course and a leaderboard for every gun, a tank that never hurts anyone, and a jet you probably shouldn't fly under the bridge.
- **Seven things your dad can find.** One involves a pay phone, one is about the horn, and one is a long shot.

**Built for one evening at a time**
- Every job has stage checkpoints, medals and a half-pay replay on the fridge calendar. Five repeatable side gigs keep going after the story.
- Original procedural soundtrack and sound design, with a score that reacts to combat.
- Auto graphics quality adjusts itself to keep the frame rate up.

*Before publishing, check this copy against CONTENT.md and the open QA items:*
- *"28 story jobs" counts the 27 story jobs plus the finale; recount if jobs are added or cut.*
- *Leave "takes about 10 hours" out until timed play-throughs exist.*
- *Don't claim controller support (see below).*
- *Valve does not allow links or fake Steam UI in this section ([description](https://partner.steamgames.com/doc/store/page/description)).*

## Genre and tags

- **Genre fields:** Action, Adventure, Indie.
- **Tags:** you need at least 5 before launch, and up to 20 are recommended. The first 5 carry the most weight ([tags](https://partner.steamgames.com/doc/store/tags)).

Suggested order:
1. Open World
2. Action
3. Third-Person Shooter
4. Comedy
5. Driving
6. Singleplayer
7. Stealth
8. First-Person
9. Sandbox
10. Funny
11. Indie
12. Shooter
13. Vehicular Combat
14. Life Sim (only if the home is pitched hard)
15. Crime
16. Story Rich
17. Family Friendly *(do not use: there is gunplay)*
18. Colorful
19. Atmospheric
20. 3D

Leave out **Crime** if the owner wants to stay clear of open-world-crime comparisons (CONTENT.md, originality section). Leave out **Family Friendly** either way.

## System requirements

These are derived from the render budgets, because no real-hardware numbers exist yet (QA-GAPS item 10). Treat them as provisional until measured on the three test machines listed there.

Evidence (`docs/PERF.md`, Medium preset):
- **Hub:** about 530–820 draw calls, about 1.4–1.7 M triangles, about 44–62 shader programs, and 174–209 MB estimated texture memory.
- **Heaviest mission:** about 1,650 draw calls, about 1.3 M triangles and 231 MB texture memory.
- **Low preset:** uses the 512-px texture tier (about ¼ of the texture memory), 1024 hard shadows, no post-processing, and resolution scale down to 0.6.
- **Auto mode:** targets 60 fps and steps down below about 45 fps.
- **Install size:** about 155 MB of game data (`assets/opt` 70 MB plus source assets 80 MB, JS 4 MB) plus the Electron runtime (about 250–300 MB).

WebGL 2 through the bundled Chromium is the hard floor. Draw-call submission in WebGL is CPU-bound, so a 4-thread CPU matters as much as the GPU.

| | Minimum (Low / Auto, 1280×720, 30+ fps) | Recommended (Medium–High, 1080p, 60 fps) |
|---|---|---|
| OS | Windows 10 64-bit | Windows 10/11 64-bit |
| CPU | 4 threads, 2.0 GHz (e.g. Intel Core i5-6200U / Ryzen 3 2200U) | 4 cores, 3.0 GHz (e.g. Intel Core i5-8400 / Ryzen 5 2600) |
| Memory | 4 GB RAM | 8 GB RAM |
| Graphics | WebGL 2 capable, 1 GB VRAM or shared (Intel UHD 620 / Radeon Vega 3, GTX 750) | 2 GB VRAM (GTX 1050 Ti / RX 570 or better) |
| Storage | 1 GB available space | 1 GB available space |
| Additional | Requires up-to-date GPU drivers; no internet connection needed (once the libraries are vendored, see QA-GAPS item 1) | — |

Add Linux and SteamOS only if a Linux depot is built (CHECKLIST B7). Add macOS only if it is tested.

## Supported languages

- **English only:** interface and subtitles. There is no recorded audio; voices are synthesized babble with subtitles. On Steam, tick **Interface** and **Subtitles** for English, and leave **Full Audio** unticked. Valve's review checks every ticked language ([review_process](https://partner.steamgames.com/doc/store/review_process), [localization](https://partner.steamgames.com/doc/store/localization)).
- **Text is hard-coded, not externalised.** There is no i18n layer anywhere in `js/` or `index.html`. Dialogue, barks, briefs, HUD text, menus and shop catalogues are inline string literals spread across about 30 job files, `index.html` (500 KB), `js/social.js`, `js/save.js`, `js/hud.js` and others.
- **In-world signage is drawn on canvases in code:** about 207 `fillText` call sites (store names, signs, posters, plates, stickers). Localising those means either redrawing per language or leaving the signs in English, which is acceptable.
- **Size:** a conservative scan finds **about 3,900 full-sentence strings, about 38,000 words**. That is a lower bound: it misses template-built and short strings. Realistically it is 45–55k words including UI.
- **Effort to localise:**
  - Engineering: extract strings to per-language tables with keys, handle plurals and number/currency formatting, and check text overflow in HUD and choice strips. About 2–3 weeks.
  - Translation: about 50k words per language. Humour and wordplay are heavy (dad jokes, puns in item names), so it needs transcreation, not plain translation.
  - **Recommendation:** launch in English. Add languages after launch based on wishlist geography.

## Controller support

| Area | Status | Evidence |
|---|---|---|
| Shop and locker menus | Gamepad navigation works | `js/save.js:1044-1114`, tested by `dev/menus.e2e.js` |
| Title, pause, briefs, results, calendar | Keyboard and mouse only | QA-GAPS item 8 |
| On-foot movement, aiming, shooting, driving, flying | **Keyboard and mouse only** | no Gamepad API polling in the game loop |

**Declare "keyboard and mouse only" for launch**, or declare **Partial Controller Support** only after publishing a Steam Input template that maps the keyboard and mouse. Do not declare Full: Full requires that the controller reaches all content and that prompts match the controller ([controller questionnaire](https://store.steampowered.com/news/group/4145017/view/3684558162504860650), [Steam Input dev guide](https://partner.steamgames.com/doc/features/steam_controller/getting_started_for_devs)). Full support is also what Deck Verified needs ([steamdeck/compat](https://partner.steamgames.com/doc/steamdeck/compat)).

## Graphical assets: exact sizes

Since August 2024 Steam uses the larger capsule sizes, and the old dimensions are no longer accepted ([store/assets](https://partner.steamgames.com/doc/store/assets), [standard](https://partner.steamgames.com/doc/store/assets/standard), [library](https://partner.steamgames.com/doc/store/assets/libraryassets), [rules](https://partner.steamgames.com/doc/store/assets/rules), [events](https://partner.steamgames.com/doc/store/assets/eventassets)).

**Capsule rules:** capsules may show only artwork, the game name and an official subtitle. No review quotes, awards, discount text or calls to action.

| Asset | Size (px) | Our plan |
|---|---|---|
| Header capsule | 920×430 | Four dads shoulder to shoulder at the end of a driveway at golden hour, minivan behind, logo across the lower third |
| Small capsule | 462×174 | Logo only (must read at tiny sizes), with a sliver of the minivan grille |
| Main capsule | 1232×706 | Same scene as the header, wider: the Maple Heights street with porch lights, a neighbour mid-wave, the logo |
| Vertical capsule | 748×896 | The crew stacked vertically: Big Dave at the grill, Rick with the whistle, Gary with the clipboard, Doug in shades. Logo on top |
| Page background (optional) | 1438×810 | Soft-focus Riverside festival string lights, low contrast |
| Screenshots | at least 1920×1080, 16:9; at least 5; gameplay only; at least 4 marked all-ages ([review_process](https://partner.steamgames.com/doc/store/review_process)) | See the shot list below |
| Library capsule | 600×900 | The vertical capsule art, recomposed |
| Library header | 920×430 | Same as the header capsule |
| Library hero | 3840×1240, **no text or logo**, keep the key art inside the 860×380 central safe area | Wide Maple Heights street at dusk, no characters at the edges |
| Library logo | transparent PNG, 1280 px wide and/or 720 px tall | The "High Trust" wordmark in Bowlby One (OFL, so OK to use in the logo) |
| Shortcut icon | 256×256 or 512×512, ICO/PNG | A yellow zip-tie loop, or the dad cap |
| App icon | 184×184 JPG | same |
| Event cover / header | 800×450 / 1920×622 | for launch and update announcements |
| Trailer | up to 1920×1080, H.264 .mp4, ≥ 5,000 kbps, 30/60 fps, AAC 44.1/48 kHz, 16:9. At least 1 gameplay trailer; release is blocked while a trailer is still processing ([trailer](https://partner.steamgames.com/doc/store/trailer)) | Beat sheet below |

### Screenshot shot list

Capture at 1920×1080 or 2560×1440 on High, with the HUD on for at least 3 shots. Pick from the existing harness renders in `docs/screenshots/` and `dev/*-shots.js` as a starting point, but recapture on a real GPU. Shots marked [18+?] are the ones not to mark all-ages.

1. **Maple Heights at golden hour.** The minivan on the street, a neighbour waving, trust meter visible. (all-ages)
2. **A raid in the chop shop.** Over-the-shoulder aim, muzzle flash, crew behind cover. [18+?]
3. **A surrendering enemy being zip-tied.** The "second chance" prompt is visible. The game's thesis in one image. (all-ages)
4. **The home interior.** Decorate mode, the family in the kitchen, the fridge calendar. (all-ages)
5. **Dad's Auto garage.** The upgraded minivan with rims and stickers, the upgrade menu open. (all-ages)
6. **Fort Sensible.** The jet over the town, or the tank "LAWN ORDER" on the range. (all-ages)
7. **Night stealth job.** Flashlight cone, guard silhouette, NVG tint. [18+?]
8. **Riverside festival (finale setting, no spoiler).** String lights and the crowd. (all-ages)
9. **Conversation job.** The choice strip with the dad-talk tone options. (all-ages)
10. **Map.** Both neighbourhoods with trust tints. (all-ages)

### Trailer beat sheet (75 s)

| Time | Beat | Picture | Sound and text |
|---|---|---|---|
| 0:00–0:06 | Cold open | A porch at dawn. A package disappears. A sprinkler ticks. | Sprinkler, birds. Super: *"Maple Heights used to wave."* |
| 0:06–0:14 | The problem | Locked doors, a neighbour pulls the blinds, the trust meter reads **Doors Locked** | Ambience drops out |
| 0:14–0:22 | The crew | Quick character cards: Gary (spreadsheet), Coach Rick (whistle), Big Dave (grill), Doug (shades). One line of dialogue each from the game | Procedural hub theme comes in |
| 0:22–0:26 | The minivan | Sliding door slams, crew piles in, minivan pulls out | Horn: *Shave and a Haircut* |
| 0:26–0:42 | Action montage | Chop-shop raid, park waves, a car chase, a beanbag shot, a night stealth flashlight sweep | Combat music. Cuts on the beat |
| 0:42–0:48 | **The turn** | An enemy drops his gun, hands up. Dad walks over, zip-tie. Prompt: *second chance* | Music cuts to silence, then a single UI chime. Super: *"Trust is the whole point."* |
| 0:48–0:58 | Dad life | Decorating the house, upgrading the van, Biscuit the dog, the fridge calendar, mower race | Lighter music layer |
| 0:58–1:06 | Fort Sensible | Range, tank on the lawn, jet over the neighbourhood, family waving from the yard | Sonic boom |
| 1:06–1:12 | Payoff | The meter climbs to **Doors Unlocked**; a neighbour waves back (no finale spoilers) | Music resolves |
| 1:12–1:15 | Title | Logo, "Wishlist on Steam" (calls to action are fine in trailers, just not on capsules) | Final horn honk |

Recording notes: capture at 60 fps in the desktop build on a real GPU, not headless. Hide debug overlays. Use the in-game audio only, since the soundtrack is original procedural music with no licensing questions.
