# High Trust gameplay trailer

The trailer is captured from the real game, offline, one frame at a time, and cut by script. Nothing in `index.html`, `js/`, `css/` or `desktop/` is changed: the shots drive the game through the debug hook `window.__ht`, the jobs' own scripted players (`test.step`), and real key and mouse events sent by Playwright.

Deliverables (in `assets/store/trailer/`):

| File | What |
|---|---|
| `high-trust-trailer-1080p.mp4` | Final: 1920×1080, 30 fps, H.264 High, yuv420p, about 8 Mbit/s two-pass, AAC-LC 192 kbit/s 48 kHz stereo, `+faststart` |
| `high-trust-trailer-720p.mp4` | The same cut at 1280×720, 5 Mbit/s |
| `poster.jpg` | A 1920×1080 frame from the video with no text on it (Steam wants custom thumbnails to be a frame from the video, without text) |
| `contact-sheet.jpg` | One frame per second, with timecodes |

## Steam's trailer requirements (checked 2026-11-22)

Source: Steamworks documentation, [Trailers](https://partner.steamgames.com/doc/store/trailer), read on 2026-11-22. What it asks for, and what we do:

| Steam says | This trailer |
|---|---|
| "up to 1920 x 1080 resolution"; use a common size such as 1920x1080 or 1280x720 | 1920×1080 master, 1280×720 copy |
| "30/29.97 or 60/59.94 fps" | 30 fps (see "Frame rate" below for why not 60) |
| "high bit rate (5,000+ Kbps)" | 8,000 kbit/s average (two-pass), 10,000 max; 720p copy 5,000 |
| ".mov, .wmv, or .mp4"; "H.264 video and AAC audio is preferred" | .mp4, H.264 High profile, AAC-LC |
| "16:9 aspect ratio is preferred" | 16:9 |
| Audio is reduced to standard stereo; use 44 kHz or 48 kHz (an unsupported rate is a common cause of failed processing); Adobe's preset uses AAC stereo at 192 kbit/s | 48 kHz stereo AAC at 192 kbit/s |
| Steam makes a 600×380 poster and a 232×130 thumbnail itself; a custom thumbnail must be a frame from the video, "1920x1080 .jpg or .png", and should avoid text | `poster.jpg` is a 1920×1080 frame with no supers on it |
| Viewers may have "less than 10 seconds to make an impression" | The first 5 s are gameplay (a porch pirate chase), no logos |
| "We highly recommend that the first trailer ... is primarily gameplay"; HUD elements during gameplay are good | All shots are captured from the game; most keep the HUD on |
| Design for viewers who watch without sound | All messages are on-screen text (supers and the game's own subtitles); no voice-over |
| PEGI- or ESRB-rated videos can be limited to countries | No rating-board slate is used (the game has no rating yet), so no country restriction is needed |
| Steam cuts 6-second looping microtrailers from the first trailer automatically | The trailer has a short cut every 2–4 s, so any 6 s window shows gameplay |
| A game can't be released while a trailer is still processing; deleting and re-uploading sends a trailer to the back of the queue | Upload well before release |

The page gives no maximum file size, no recommended length, and no rules about logos; it says nothing on captions. Steam's asset rules ([store/assets/rules](https://partner.steamgames.com/doc/store/assets/rules)) forbid calls to action and review scores on **capsules**; they don't cover trailers. STORE.md's note that a call to action is fine in a trailer stands, and the end card's line is a variable (below). No review quotes or awards are used.

STORE.md's asset table (written 2026-11-21) matches the live page on every number above.

## The cut (50.0 s, 30 fps): shot list with timecodes

See `SCREENPLAY.md` for the intent. Timecodes come from `build/timeline.json`. "Frames" are the shot's own capture frames.

| Time | Shot (`shots/…`) | Frames | What happens | HUD |
|---|---|---|---|---|
| 0:00.0 | `porch_chase` | 18–130 | **Hook.** A porch pirate bolts with a parcel and the dad sprints after him. Subtitle: "You'll never take me alive! ...Wait, you can, I'm slow." He's caught on the cut. | on |
| 0:03.8 | card `title` | — | Title sting (logo) | — |
| 0:05.0 | `van_drive` | 14–88 | The minivan rolls out down Maple Heights. The hub theme comes in. | on |
| 0:07.5 | `traffic_honk` | 138–231 | An SUV nose-to-nose with the van outside the school honks: "Wave me through or move. I'm begging you." Card: *Maple Heights used to wave.* | on |
| 0:10.6 | `porch_chase` | 130–241 | Hands up ("I do cardio! ...I don't do cardio."), zip-tie, +TRUST. Card: *They would really prefer violence wasn't necessary.* | on |
| 0:14.4 | `crossing` | 44–118 | Crossing Guard: hi-vis vest, STOP sign, the kids crossing. Card: *Walk eleven kids home with a stop sign.* (No guns in this job; the weapon panel is hidden.) | on |
| 0:16.9 | `taxi` | 26–119 | Dad Taxi: "My mom lets me sit in the front." / "Your mom is not here." | on |
| 0:20.0 | `linden` | 24–61 | Linden Park: Coach Rick in cover, the dad with The Talking-To (beanbags) | on |
| 0:21.3 | `scope` | 30–104 | Higher Ground: a man on the rowhouse roof in the scope, beanbag, "OW. Okay. Okay! I'm out. I'm SO out." | on |
| 0:23.8 | `tank_crush` | 36–128 | Sgt. Ruiz: "...don't flatten anything I have to fill out a form for." The tank goes through the hay bales and over Linda's car ("Linda's car is a pancake"). Card: *Fort Sensible. Open from the first minute.* | on |
| 0:26.9 | `jet_buzz` | 76–132 | The jet low over Maple Heights. Jen: "Is that your father? Wave, kids! WAVE!" | on |
| 0:28.8 | `jet_family` | 30–85 | The family on the lawn waving as the jet goes over the roof | off |
| 0:30.6 | `chute` | 5–98 | Eject, the canopy opens. Tower: "DAD-1 is enjoying the parachute." | on |
| 0:33.8 | `drag_launch` | 8–44 | Sensible Dragway's tree, on the game's own tree camera | on |
| 0:35.0 | `drag_launch` | 46–83 | The family minivan launches | on |
| 0:36.3 | `jet_bridge` | 20–75 | The topper: the jet down on the river and under the High Bridge | on |
| 0:38.1 | `festival` | 18–167 | Everybody Waves: the game's crane over the street festival and its banner "Everybody waves." | game cine |
| 0:43.1 | card `end` | — | Logo + "Wishlist on Steam" (config.json), horn | — |
| 0:48.1 | `drag_slip` | 2–57 | Stinger: the minivan's timeslip, pushed in | on |

**Music and sound.** The cold open plays on the suburb ambience. The game's `start` stinger hits on the title, then the hub theme (96 bpm) runs from 0:05 to the festival, and every cut lands on its beat grid. The festival gets the game's `victory` theme and a crowd bed made from the game's voices, and the end card gets the Shave-and-a-Haircut horn. Spot effects: engine pull, a double horn on the SUV's honk, the zip-tie, a beanbag, the rifle, the tank, the jet pass + boom (×2), the parachute tone, drag-tree beeps, and a launch engine.

**Rendered but not used** (frames kept in scratch under `_rejected_*`):
- Riverside trust change: camera under an awning; the dressing switch is an instant pop.
- Night shot in Sign of the Times: the default camera sits against a truck grille; the side camera was blocked by barrels.
- The range course: a rack panel in front of the camera.
- Tank firing: parked under the shelter roof in v1; next to Hangar 2 in v2, where the gun refused with "Not with people downrange."
- Higher Ground court stage: rejected on purpose, because Kevin (a kid with a Super Soaker) is in that stage's view.
- Higher Ground car stage: the scope sat on the roof parapet.
- An exterior minivan-with-crew shot: the seated crew's legs poke through the floor, and the walking crew carry drawn guns past a playground.

## Weaknesses (honest)

- **Length: 50 s, not the 75 s of the STORE.md beat sheet (or 60–70 s).** Every usable shot is in. Padding would have meant slow "standing in a place" shots. Getting to 60–70 s needs about 4–6 more strong shots (golden hour, a night stealth shot that frames properly, a car chase, the mower race) at about 10 min each to render, plus staging time.
- **30 fps, not 60.** Each frame costs about 2–3 s of SwiftShader. 60 fps doubles the cost and Steam accepts 30.
- **Motion.** Every captured frame is exactly 1/30 s of game time, so movement is even. Remaining unevenness comes from the game, not the capture: the jobs' scripted players snap their aim (some micro-jumps in the scope clip, frames 37–49), and the crossing job's bot teleports (those frames are cut out). `qa.sh` lists frame-to-frame jumps per shot.
- **No crew-in-the-van shot, no running two-finger-wave gag** (the player has no wave action). The crew are in the Linden Park shot and the festival's front row.
- **Some shots are only fair compositionally:** the jet over the fields before the town, and the parked minivan in the left of the family shot. A capture team would re-block these with a free camera.
- **Sound is placed by hand**, not recorded with the picture: footsteps, tyre noise and impacts that a real capture gets for free are missing.

What a human editor with a GPU capture would do better: record real-time takes at 60 fps with the game's own synced audio; take many passes of each moment and pick the best; free-camera angles; golden hour and night with working lighting; speed ramps on the launch, the jet and the tank hit; and a proper mix with foley.


## How it works

### Capture: offline, one frame at a time, on a virtual clock

This container has no GPU. Chromium renders through SwiftShader at about one frame per second, so recording in real time is useless. Instead `lib.js` installs a virtual clock before any game script runs:

- `requestAnimationFrame`: every callback is queued while paused (all of them, unlike `dev/ai-ingame-lib.js`, which keeps only the last), then run with the virtual timestamp.
- `performance.now()` and `Date.now()` return virtual time once capture starts.
- `setTimeout` / `setInterval` created during capture fire on virtual time. That covers the result cards, banners and fades the game schedules with timers.
- CSS animations and transitions and Web Animations (`document.getAnimations()`) are paused and advanced by hand by exactly one frame.
- `Math.random` is seeded (mulberry32), so a staged moment plays out the same way in a preview and in the real take.

The game's own loop (`frame()` in `index.html`) runs unchanged once per captured frame, with `dt = 1/30 s` exactly. Physics, AI, people animation, particles (`FX.update`), the camera, the HUD, subtitles, the colour grade's film-grain clock and the open world's trust-tint easing all advance on that clock, so motion is even from frame to frame however long each frame takes to render. After each step, `Page.captureScreenshot` (CDP) grabs the composited page (canvas + DOM HUD) as a 1920×1080 JPEG (q 93) into `/tmp/ht-trailer/frames/<shot>/f00000.jpg…` (set `TRAILER_SCRATCH` to move it). Frames are never committed.

Measured cost on this container: about **2.2–2.9 s per 1080p frame** on the High preset, plus about 2.5 min boot and 2 min staging per shot. The game boots at 960×540 (booting at 1080p took 6 min because SwiftShader renders the title screen every frame) and is resized to 1920×1080 before staging settles.

### Shots

Each file in `shots/` is one take. It exports:

- `stage(s)`: put the game in the right state with `window.__ht`, the job registry and the jobs' own scripted players. Real E presses and mouse clicks go through Playwright where the game reads input events.
- `frame(i)` and/or `frameNode(s, i)`: what happens before frame `i` (page side, or Node side for real key and mouse events).
- `frames`, `warm`.

Before capture, `shoot.js` waits until asset streaming is idle and no character is still loading. Shots log timed events (`T.ev('ziptie')`) into `shot.json`, which is how the sound effects are placed.

```
node tools/trailer/shoot.js <shot>              # capture one shot (skipped if its frames are already on disk)
node tools/trailer/shoot.js <shot> --force      # re-render it
node tools/trailer/shoot.js <shot> --preview    # 960x540, every 15th frame, into /tmp/ht-trailer/preview/<shot>
tools/trailer/run.sh shotA shotB ...            # several, one browser at a time, plus a 5-frame QA strip each in /tmp/ht-trailer/qa/
node tools/trailer/probe.js script.js out.jpg   # staging experiments: run a page-side script in a booted game
```

### Sound

There is no voice-over. The game makes all its sound in WebAudio (`js/audio.js`), and `HT.Audio.init({context})` accepts an `OfflineAudioContext`. `audio.js` boots a blank page with only `js/audio.js` and renders each cue sample-exact through the game's own instruments, sequencer and effects:

- music: `hub` (the hub theme, 96 bpm), `victory`, and the `start`/`win` stingers;
- effects: the minivan horn (`shave`, `double`), engine pulls, tyre chirp, the zip-tie, the tank's report (rebuilt from `js/tank.js boom`), a jet pass and sonic boom (`js/jet.js jetSound/boom`), the parachute tone, the drag-tree beeps (the game's own `beep` voice), and a festival crowd (the game's dad/kid voices).

`build.js` places them on the timeline from `edit.js`, mixes them, and loudness-normalises with two-pass `loudnorm` to −14 LUFS integrated, true peak ≤ −1.5 dBTP. The game's live audio could not be recorded in sync: at ~1 frame/s, audio runs in real time and the picture does not.

### The cut

`edit.js` is the edit decision list. Clip lengths are in beats of the hub theme (0.625 s = 18.75 frames), so every cut lands on the music's grid. Each clip can carry a text super (`cards.js`) and sound effects at frame offsets.

```
node tools/trailer/build.js            # rebuild everything from the frames on disk -> assets/store/trailer/
node tools/trailer/build.js --rough    # missing shots become slates instead of failing
```

### Changing the end card

The call to action is a variable in `tools/trailer/config.json`:

```json
{ "cta": "Wishlist on Steam", "ctaSub": "", "fps": 30 }
```

Set `"cta": "Available now"` (optionally `"ctaSub": "On Steam"`) and run `node tools/trailer/build.js`. The cards are re-rendered and the video is rebuilt from the frames on disk, with no recapture. (If the frames are gone, recapture first with `tools/trailer/run.sh <all shots>`.)

### Re-rendering one shot

```
node tools/trailer/shoot.js tank --force && node tools/trailer/build.js
```

If the new take's timing differs, adjust that clip's `in` (first frame) in `edit.js`. Its `shot.json` lists the logged event frames.

### Fonts

Bowlby One, Barlow and Barlow Condensed, from `assets/fonts`, under the SIL Open Font License 1.1 (`assets/fonts/OFL-*.txt`). The OFL allows using the fonts to render text in a video. The logo on the cards is the game's own title-screen logo, rebuilt with the same markup as `js/hud.js`.
