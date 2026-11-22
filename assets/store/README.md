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

### Alternates (owner's choice)

The key art went through three rounds (round 1: a static line-up; round 2: the walk; round 3: framing per format, low-angle
and standing variants). Three directions are kept, each as a 3840×2160 master plus a header and main capsule built the same way:

- **A — "the walk" (used above).** Eye level, low; the crew walking down Maple toward camera, the minivan nose-on behind with its
  `HT 4DAD` plate, the low sun over the camera's shoulder. Reads best at thumbnail size: one clear focal figure, symmetrical, open sky for the logo.
- **C — "the low angle".** Camera at knee height, sun behind the crew (rim light), minivan side-on. More dynamic and the dad's face
  reads a little better under his cap, but the sky is busier and the group is less even.
- **B — "the line-up".** The crew standing by the van, two with arms folded. Warmer and more comic, but static; weakest at small size.

Files: `alternates/key_art_{A,B,C}_3840x2160.jpg`, `alternates/key_art_A_crew_matte.png` (the crew cut-out matte, for
an illustrator or for event art), `alternates/header_capsule_920x430_{B,C}.jpg`, `alternates/main_capsule_1232x706_{B,C}.jpg`.

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

SCREENSHOTS_TABLE

## What an illustrator would still do better

Being honest about the limits of rendering the game itself:

- **Poses.** The characters use the game's walk and idle animations; there is no "hero pose", gesture or expression. An
  illustrator would give each person a beat (Gary with his spreadsheet, Rick's whistle, Dave's tongs, Doug's call-sign shades)
  and the comedy would read without the page copy. Right now "a little funny" comes from the line-up itself and the
  `HT 4DAD` plate, not from the acting.
- **The dad's cap.** The player model's cap sits low and its underside shades his eyes; at capsule size it reads fine, but at
  full size it looks a little like a blindfold. A painted pass would fix the brim.
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
