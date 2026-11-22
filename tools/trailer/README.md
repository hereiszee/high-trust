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

<!-- SHOTLIST -->
