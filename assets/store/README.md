# Steam store and library graphics

Everything here was rendered from the real game: the Three.js build in this repo, run headless on the **High** preset, with the
real character models, the real Maple Heights street and the family minivan. The logo is the title screen's own treatment
(the roof mark from `js/hud.js`, HIGH in white and TRUST in sun yellow, set in Bowlby One, SIL OFL 1.1, `assets/fonts/OFL-bowlbyone.txt`),
given an ink outline and a drop shadow so it holds at thumbnail size. No stock, generated or third-party imagery is used.

How it was made, and how to re-make any of it, is in [How to rebuild](#how-to-rebuild) below.

## The files

All sizes are exact. Upload them in Steamworks under **Store presence → Graphical assets** (store and library tabs) and
**Store presence → Screenshots**; the icons go under **App admin → Steam settings → Community / client icons** (the
"Community and Client Icons" section of the asset page).

| File | Size | Steamworks slot | What it is |
|---|---|---|---|
| `header_capsule_920x430.jpg` | 920×430 | Store assets → Header capsule (required) | The crew walking down Maple toward the camera at golden hour, minivan behind, stacked logo on the left over the title screen's dark scrim |
| `small_capsule_462x174.jpg` | 462×174 | Store assets → Small capsule (required; Steam makes 120×45 and 184×69 from it) | The one-line logo nearly filling it, over the same street darkened |
| `main_capsule_1232x706.jpg` | 1232×706 | Store assets → Main capsule (required) | The full key art; one-line logo across the sky |
| `vertical_capsule_748x896.jpg` | 748×896 | Store assets → Vertical capsule (required) | A tall re-render of the scene; stacked logo on top, the dad's cap overlapping it |
| `page_background_1438x810.jpg` | 1438×810 | Store assets → Page background (optional) | The street, blurred and darkened to the UI's ink colour |
| `library_capsule_600x900.jpg` | 600×900 | Library assets → Library capsule (required) | Tall re-render, stacked logo on top |
| `library_header_920x430.jpg` | 920×430 | Library assets → Library header (required; falls back to the header capsule) | Same art as the header capsule |
| `library_hero_3840x1240.png` | 3840×1240 | Library assets → Library hero (required) | The street and the crew, **no text or logo**. The dad's face is inside the central 860×380 at full size, and the whole crew is inside it at the half-size (1920×620) template's scale. The bottom left is calm road, for the logo's "left bottom" position |
| `library_logo.png` | 1113×720, transparent | Library assets → Library logo (required) | Roof mark + wordmark only. 720 px tall (the rule is "1280px wide and/or 720px tall"); suggested position: left bottom or centred bottom |
| `shortcut_icon_256.png` | 256×256, transparent | Community and client icons → Shortcut icon (required; Steam makes the .ico from the PNG) | The roof mark over "HT", sun yellow on the ink colour |
| `shortcut_icon.ico` | 16–256 px | the same slot, if you prefer to upload the .ico | The same icon with every Windows size |
| `app_icon_184.jpg` | 184×184 | Community and client icons → App icon (required) | The same mark, square |
| `screenshots/*.jpg` | 1920×1080 | Store presence → Screenshots | See [Screenshots](#screenshots) |
| `alternates/` | | — | The other hero compositions, for the owner to choose from (see below) |
| `contact-sheet.jpg` | | — | Everything at a glance |

### Key art: round 2 (used on every capsule)

The concept is the contrast between ordinary suburban dads and absurd escalation. The dad stands out front in his khakis, arms folded, big in the frame. Behind him, parked next to the family minivan like a second car, is the Fort Sensible tank, with Coach Rick waving from the hatch. The jet banks low over the rooftops. The flag and "The Millers, 1412 Maple" mailbox are in frame. Everything is the game's own models: `HT.Tank.model()` and `HT.Jet.model()` with the gear and ladder hidden, Rick posed with the wave the game uses when the family waves at the jet. A finishing pass (scene K2 in `scenes.js`) made these fixes:
- **The jet** is about a fifth of the frame wide and sits back over the rooftops. It banks in three-quarter view so the twin tails and swept wings read as a fighter. It has the game's own afterburner cones lit and a faint vapour trail, and it is kept clear of the logo.
- **The dad** is rendered as the game shows him: the cap sits exactly as it does in-game, his head is level, and there is no skin tint. The camera sits low (0.6 m) so it sees under the brim. A soft key light from camera-left sits just above his eye line, a small light near the camera puts catch-lights in his eyes, and a gentle rim outlines him. Together they keep his eyes as open as they are on the in-game model. `alternates/dad-face-check.jpg` compares him with the in-game player model. Note: at eye level, the in-game cap itself covers his eyes.
- **The tank** is closer and angled so Coach Rick's wave reads at header size. The dad stays the single dominant figure, left of centre. Compositing work, all done on the game renders:
- a grade;
- a warm sunset gradient laid over the top of the frame;
- a slight blur on the background plate, with the dad on his own sharp cut-out from a dad-only matte;
- a soft warm edge glow on the dad;
- a vignette.

Three concepts were roughed at main-capsule size and checked at 231 and 120 px wide (`alternates/round2-roughs/thumbnail_check.jpg`):
- **A, tank in the driveway (used).** One big figure, the tank and the jet read even at 120 px.
- **B, the crew on the tank.** The whole crew around and on the tank on the street. Warmer, but at thumbnail size it becomes a row of small people again.
- **C, the porch pirate.** A pirate with a parcel in the foreground and the crew walking up. Funny at full size, but the focal point splits between the pirate and the dad.

`alternates/key_art_K_3696x2118.jpg` is the flattened master without the logo. `alternates/round1/` keeps the whole first set (the walking line-up A/B/C, its capsules, hero and screenshots).

## Steamworks rules this follows (checked 2026-11-22)

Sources, read on the day the art was made:

- Store graphical assets: <https://partner.steamgames.com/doc/store/assets/standard> — header 920×430, small 462×174 ("your logo
  should nearly fill the small capsule"), main 1232×706, vertical 748×896; "Do not include quotes or other strings of text beyond
  the title of your game"; page background 1438×810, "ambient so as not to compete with the content on the page"; screenshots
  1920×1080 minimum, 16:9, at least 5, "should exclusively show the gameplay", no concept art or pre-rendered cinematic stills,
  menus only if they are a unique part of the game, marketing copy and awards belong in the page's own spaces, and at least four
  marked suitable for all ages ("should not contain gore, violence, or suggestive themes").
- Library assets: <https://partner.steamgames.com/doc/store/assets/libraryassets> — capsule 600×900, header 920×430, hero
  3840×1240 ("This image cannot include any text", "a safe area of 860px x 380px" at the centre of the template), logo PNG with a
  transparent background, "1280px wide and/or 720px tall", logotype and optional logomark only.
- Asset overview (formats, icons): <https://partner.steamgames.com/doc/store/assets> — hero and logo are .png; shortcut icon
  256×256 .ico or .png ("We will generate a .ico if a png is provided"); app icon 184×184 .jpg.
- Content rules: <https://partner.steamgames.com/doc/store/assets/rules> — base capsules may show only "game artwork, the game name,
  and any official subtitle": no review scores, award names or logos, discount copy, calls to action, other products or other
  text; "All capsule images (store and library) must have PG-13 appropriate artwork."
- About-section images: <https://partner.steamgames.com/doc/store/page/description> — each under 5 MB, text in images must be
  re-made per language; no pixel size is given.

What that meant here: no text on any capsule but the logo (the title screen's "Maple Heights Neighborhood Watch" tagline is left
off, because it is not an official subtitle); no weapons drawn anywhere in the key art; nobody aims at the viewer; no children in
the key art; nothing time-limited.

Corrections made to `docs/steam/STORE.md` from the live docs: the shortcut icon is 256×256 only (512×512 is not listed); the
hero is a PNG; the screenshot content rules and the PG-13 rule are now spelled out; the asset table now points at these files.

## Screenshots

There are thirteen, all 1920×1080 JPG, all real gameplay on High with the game's HUD unless noted. Upload them in this order. **All-ages** is the Steamworks tick (no gore, violence or suggestive themes); at least four are needed.

| # | File | What it shows | Source | All-ages |
|---|---|---|---|---|
| 1 | `01_jet_low_over_maple_heights.jpg` | DAD-1 at 85 ft over Maple Heights rooftops; the tower: "the jet is fueled, the coffee is not" | studio: jet placed in flight, the game's flight model | yes |
| 2 | `02_zip_tie_second_chance.jpg` | Return to Sender: hands on the zip-tied man, "+TRUST zip-tied", Gary standing by empty-handed. Lower, closer camera (subtitle only, no HUD) | studio: real surrender and zip-tie, guns holstered with the job's holster flag | no (aftermath of a fight) |
| 3 | `03_porch_light_talk_first.jpg` | Porch Light: a porch pirate, three ways to say something first | `dev/jobs/porch.js` | yes |
| 4 | `04_tank_down_maple.jpg` | The tank on Maple's street, the sergeant on the radio ("Please don't left click near my coffee") | studio: the hub, driving the tank | yes |
| 5 | `05_higher_ground_scope.jpg` | Higher Ground through the scope | `dev/jobs/overwatch.js` | no |
| 6 | `06_everybody_waves_festival.jpg` | The festival finale, everyone waving (in-engine cutscene) | `dev/jobs/finale.js` | yes |
| 7 | `07_crossing_guard.jpg` | Crossing Guard: eleven kids and a stop sign | `dev/jobs/crossing.js` | yes |
| 8 | `08_sensible_dragway_launch.jpg` | The Dragway: tree on green, the launch; "Eighth mile. Two lanes. No tanks." | `tools/store-art/drag-launch.js` (real keys) | yes |
| 9 | `09_dad_taxi_school_pickup.jpg` | Dad Taxi school pickup | `dev/jobs/taxi.js` | yes |
| 10 | `10_dad_taxi_route_9_traffic.jpg` | Dad Taxi on Route 9, blocking the red pickup | `dev/jobs/taxi.js` | yes |
| 11 | `11_night_flashlight.jpg` | Maple at night with the flashlight on | studio | yes |
| 12 | `12_home_decorate_mode.jpg` | Decorate mode, the family at home | studio | yes |
| 13 | `13_home_kitchen.jpg` | Jen: "Did you remember the milk?" | studio | yes |

Round 1's free roam, Riverside market, range rack, jet-under-the-bridge, staged dragway and map shots were dropped as flat; they are in `alternates/round1/screenshots_round1/`. The old zip-tie frame (03) is gone. In it, the dad's raised hand read as a rude gesture at store size.

Not shot: a traffic stand-off with a specific bark, night-vision goggles, and the jet in frame from the chase camera. The flight view here is the game's default nose camera.

## What an illustrator would still do better

Being honest about the limits of rendering the game itself:

- **Poses.** The characters use the game's walk and idle animations; there is no "hero pose", gesture or expression. An
  illustrator would give each person a beat (Gary with his spreadsheet, Rick's whistle, Dave's tongs, Doug's call-sign shades)
  and the comedy would read without the page copy. Right now "a little funny" comes from the line-up itself and the
  `HT 4DAD` plate, not from the acting.
- **The dad's cap.** The in-game cap model covers his eyes when seen at eye level; the key art shows them by using a low camera and a key light under the brim.
- **The mailbox.** The tank, now closer, hides "The Millers" mailbox. The flag and the house stay in frame.
- **Faces.** The in-game faces are mid-detail and lit by one sun; key art usually has hand-placed rim and fill light per face.
- **Atmosphere.** The golden-hour sky is the game's daytime panorama tinted warm, not a painted sunset; there is no light
  bloom through the trees, no lens work.
- **Depth.** Everything is in focus; a painted or composited piece would separate the crew from the street with depth of field.

## How to rebuild

Tools are in `tools/store-art/` (none of them change the game):

- `studio.js` loads the game once in headless Chromium (SwiftShader), enters the hub on High, waits for every character to stream in,
  then renders staging jobs from `tools/store-art/jobs/`. Each job poses the scene through the debug hook `window.__ht`
  (`helpers.js`: characters, camera with lens shift, a golden-hour lighting rig, and a characters-only matte pass), waits until
  nothing is still streaming (characters, world chunks, textures), and writes `tools/store-art/out/<name>.png`.
- `scenes.js` holds the key-art scenes (A, B, C) and writes a job for a scene and a camera:
  `node tools/store-art/scenes.js A wide 3840 2160 m01-A`.
- `build.py` lays the capsules out from those plates with `compose.js` (Playwright renders the HTML/CSS layout with the game's
  fonts at 3–4× the final size) and downsamples to the exact sizes.
- `hiq.js` runs the repo's own gameplay harnesses (`dev/jobs/*.js`, `dev/base-check.js`, `dev/dragstrip-check.js`) at 1920×1080
  on High without editing them: `node -r ./tools/store-art/hiq.js dev/jobs/crossing.js --only=03-main-crossing`. Their pictures go
  to `tools/store-art/shots/`, not `docs/`. `shots-batch.sh` runs the set used for the store.

Re-render the plates (about a minute each), then `python3 tools/store-art/build.py`.

## Owner decisions (22 Nov 2026)

- **Gun-range screenshot:** if it is used, mark it all-ages. It is not in the current set of thirteen; the file is `alternates/round1/screenshots_round1/` (range rack).
- **Library logo position over the hero:** bottom left.
- **Key art:** the tank-in-the-driveway version is the one in use. The other concepts stay in `alternates/` for reference only.

### The cap fix (game change)

The player model's cap covered his eyes at eye level, so the cap itself was rebuilt in `js/people.js` (`makeCap`; `skull()` takes an optional height and finds the nose). This is the only game-code change made for the store art.
- **Crown:** a fitted six-panel crown sized to the cranium only. Before, the skull box reached down to the nose, and that ballooned the crown.
- **Band:** sits on the brow line, about 7 cm above the nose tip.
- **Brim:** a 7 cm curved brim projecting forward and slightly down, with a darker underside.
- **Unchanged:** the button, the colour, and Earl's `CAP_LIFT`.

It changes the cap on everyone who wears one made by `makeCap`: the dad, Coach Rick, Earl and Benny. The Fort Sensible staff's patrol caps (`js/staff.js`) are separate and untouched.

Before/after pictures (front at eye level, three-quarter, back, the dad close up, the default third-person camera) are in `alternates/cap-fix/`. Checked with:
- `node dev/run-tests.js` (95 passed)
- `dev/people-load.e2e.js` (all passed)
- `dev/smoke.js` (all ok, no console errors)
- `node dev/jobs-check.js porch` (all ok)

In the key art the dad is now larger (about two-thirds of the frame height, cropped at mid-thigh in the main and header), head level, with a soft key from front-left just above the eye line and catch-lights.
