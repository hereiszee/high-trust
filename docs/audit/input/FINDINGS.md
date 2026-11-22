# Input audit — findings

Branch `audit/input`. Area: keyboard + mouse, controller only, Steam Deck / screen sizes.
Every probe is under `dev/audit/input/` (shared helpers in `lib.js`, which reuses `dev/ai-ingame-lib.js` and the
scripted pad from `desktop/test/fake-pad.js`). Screenshots are under `docs/audit/input/` (and `layout/` for the screen × size walk).
Probes send real input: Playwright keyboard/mouse (trusted events), CDP `Input.dispatchKeyEvent` / `dispatchMouseEvent` for
layouts and the back/forward mouse buttons, and a scripted Gamepad that `js/gamepad.js` polls (`HT.Pad._tick`). Job set-up
(unlocking a job, walking to the point where the input matters) uses each job's own `test.give` / `test.step` bot; the input
under test is always the real event.

Counts: **BLOCKER 4 · MAJOR 13 · MINOR 8**

Pre-existing suites run first and all pass: `dev/keys.e2e.js` (20/20), `dev/pad.e2e.js` (18/18), `dev/aim-toggle.e2e.js` (all passed).

---

## BLOCKER

### IN-01 · Controller: the Crossing Guard stop sign can't be raised, so the job can't be played on a pad
- **Severity** BLOCKER (pad-only player cannot finish *Crossing Guard*). **Confidence** CONFIRMED (run twice).
- **Repro** `node dev/audit/input/pad-crossing.js`. New game → crossing unlocked (`test.give`) → job started → the bot
  walks to Pastor Dee and takes the vest and sign → sign forced down → pad becomes the last device → every pad input tried.
- **Output**
  ```
  sign up after each pad input: {"LT_held":false,"LT_released":false,"A":false,"B":false,"X":false,"Y":false,"RB":false,"LB":false,"L3":false,"R3":false,"DUP":false,"LB_layer_all":false}
  control: real right click -> true
  ```
- **Expected** LT (the pad's aim, which the Controls page and pad diagram name) or some pad button toggles the sign.
  **Happened** no pad input raises it. Waving kids across needs `C.sign.up` ("Press E to wave them across" only appears with the sign up),
  so the kids can't cross.
- **Cause** the sign listens only to a raw `mousedown` with `button===2` on the canvas, `Q` (down only), the touch AIM button and
  a HUD chip that only reacts to `pointerdown` (`js/jobs/crossing.js:837`, `:841`, `:830`). The pad's LT calls `HT.Input.aim()`,
  which sets `P.aim` — and `signStep` forces `P.aim=false` every frame while the gear is on (`js/jobs/crossing.js:646`).
  The chip's keycap reads `RMB` on the pad too (`:903`; `KEY2PAD` has no `RMB`).
- **Evidence** `docs/audit/input/pad-crossing-sign.png`.

### IN-02 · Controller: towing is impossible — "Hold Y · hitch up" can't be held, Y gets you out instead, the prompt says A (handbrake)
- **Severity** BLOCKER (*Hitch Happens* and free-roam towing can't be done on a pad). **Confidence** CONFIRMED (run twice).
- **Repro** `node dev/audit/input/pad-tow.js`. Tow job started; the job's bot reverses the tow truck up to a car until the
  hitch check is OK, then hands over to the pad. Pad holds Y for one second, then holds A for 40 frames.
- **Output**
  ```
  "setup": {"cv":"minivan","ok":true,"link":false,"state":"go"},
  "afterHoldY": {"inCar":true,"link":false},
  "afterHoldA": {"inCar":true,"link":false,"e":false,"space":true},
  "keys": "e ^e   ^ "
  ```
- **Expected** the action the screen tells you to hold hitches the car. **Happened** the screen shows three different
  instructions, none of which works: the objective says "hold **Y** to hitch it", the meter says "Hold **Y** · hitch up",
  the prompt shows **A** "HOLD · hitch up … · tap: get out". Y is sent as a 50 ms tap (`tap('e')`, `js/gamepad.js:201`); at real frame
  rates that is a "tap" under 0.22 s, which `js/tow.js:296-302` treats as **get out**. A in any vehicle presses Space (handbrake,
  `js/gamepad.js:193`), never E. There is no way to hold E from a pad while driving.
- **Evidence** `docs/audit/input/pad-tow-lineup.png` (shows all three contradictory instructions at once).

### IN-03 · Keyboard: rebinding Aim off Mouse 2 makes the Crossing Guard stop sign impossible (and the phone / binoculars can't be raised with Aim)
- **Severity** BLOCKER (a keyboard player who moves Aim cannot finish *Crossing Guard*). **Confidence** see run below.
- **Repro** `node dev/audit/input/rebind-aim-mouse2.js` — crossing set up as IN-01, then real right clicks / key presses.
- **Output** RESULT_AIM
- **Expected** Aim's new input toggles the sign (and the phone in HOA/Grand Opening, binoculars in the tail job), since Key
  bindings says "Aim, scope, binoculars". **Happened** with Aim on K or Mouse 5, the new input only calls `HT.Input.aim()`,
  which those tools never read; the old right click is swallowed by `js/keys.js` (capture listener + `stopImmediatePropagation`, `js/keys.js:68-76`)
  before `crossing.js` / `photo.js` / `tail.js` see it. The sign has no other "up" input on keyboard (Q only lowers it).
- **Cause** job tools read `mousedown` button 2 directly: `js/jobs/crossing.js:837`, `js/photo.js:333`, `js/jobs/tail.js:259`,
  `js/jobs/arrest.js:889` (arrest still has G).

### IN-04 · Controller: Decorate (home) can't be opened from a pad
- **Severity** BLOCKER for a pad-only / Steam Deck player (a whole feature can't be started); MAJOR if you count keyboard as available on Deck.
  **Confidence** CONFIRMED (run twice).
- **Repro** `node dev/audit/input/pad-range-home.js` (second half). At home, the pad tries all 12 buttons and the whole LB layer.
- **Output** `"decoAfterAll": false, "keysSent": "  e q n c Escape r g v f 1 2 3 4 t Tab z x", "decoKeyboardB": true`
- **Expected** some pad input opens Decorate (the home objective says "B · decorate the house"). **Happened** no pad input sends `b`;
  the pad's B is crouch (`c`). Once open (via keyboard), the decorate panel still lists only keyboard keys
  (`Click/E place · R rotate · Tab/wheel next item · M move · X/right click put away · B done`) — the panel's `<i>` keycaps are not
  `.ht-kc`, so the glyph swap and rebinding never touch them (`index.html:3160`, `:3177`; `js/gamepad.js:37` has no `B`).
- **Evidence** `docs/audit/input/pad-home.png`, `docs/audit/input/pad-decorate-panel.png`.

---

## MAJOR

### IN-05 · Controller: Higher Ground "hold breath" can't be done while standing still on the scope
- **Confidence** CONFIRMED (run twice). **Repro** `node dev/audit/input/pad-jobs.js` (first block).
- **Output**
  ```
  "LT_scope_held": {"aim":true,"scopeT":1,"held":false}
  "L3_breath": {"aim":true,"scopeT":1,"held":false}            <- L3 clicked, stick centred
  "L3_held_breath": {"aim":true,"scopeT":1,"held":false}       <- L3 held 30 ticks
  "L3_with_stick_breath": {"aim":true,"scopeT":1,"held":true}  <- only works while pushing the stick (walks the dad)
  ```
- **Expected** the pad equivalent of Shift (L3, per `KEY2PAD`) holds the breath. **Happened** L3 toggles "sprint", and the same
  frame cancels sprint because the stick is centred (`js/gamepad.js:183`), so Shift is never pressed. A scoped sniper never pushes the stick.
  The sentence "Hold breath (scoped; tap…) Shift" on pad shows nothing usable.

### IN-06 · Controller: the range rental rack menu can't be navigated or backed out of
- **Confidence** CONFIRMED (run twice). **Repro** `node dev/audit/input/pad-range-home.js` (first half): at the rack, Y opens it.
- **Output**
  ```
  "afterA": {"open":false}                      <- A at the rack with no prompt on screen = jump
  "afterY": {"open":true,"i":1,"id":"revolver"}
  "menu_dpadRight": same index; "menu_dpadDown": same; "menu_stickRight": same; "menu_RB": same; "menu_B": still open
  "menu_MENU": closes
  "menuLeaks": "Free on the range. ← → or 1-9 to choose · E / Enter takes it · 0 your own guns · Esc closes"
  ```
- **Expected** D-pad/stick move between the nine guns, A takes, B backs out (as every other menu). **Happened** only the
  pre-selected gun can be taken; the menu is not a game "menu" for `js/gamepad.js` (game not paused), so the pad keeps sending
  gameplay keys (`f`, `n`, `q`, a wheel event) that the menu's capture listener swallows (`js/range.js:254-258`). B sends `c`. "Your own guns" (0) is unreachable.
- **Evidence** `docs/audit/input/pad-range-menu.png`, `docs/audit/input/layout/deck-range-menu.jpg`.

### IN-07 · Controller: every vehicle prompt shows A for "Get out" / "Hold · hitch up", but A is handbrake / nose-up; Y gets out
- **Confidence** CONFIRMED (screenshots from two runs). **Repro** `node dev/audit/input/layout.js deck --shots` (jet, tank) and `pad-tow.js`.
- **Happened** the centre prompt reads **Ⓐ GET OUT** in the jet and the tank and **Ⓐ HOLD hitch up** in the tow truck, while the
  driving hint bar beside it correctly says **Ⓨ EXIT**. Pressing A does the handbrake (car) or pitches the nose (jet).
- **Cause** `glyphFor` only maps E→Y inside `.ht-drv` (the hint bar); the prompt `.ht-pr` is outside it (`js/gamepad.js:41`).
- **Evidence** `docs/audit/input/layout/deck-jet.jpg`, `deck-tank.jpg`, `docs/audit/input/pad-tow-lineup.png`.

### IN-08 · Controller: jet and tank teach text are keyboard-only
- **Confidence** CONFIRMED (screenshot, pad prompts active — the A glyph proves pad mode).
- **Happened** jet strip: `W / S throttle · SPACE / Q nose up/down (or mouse, ↑ ↓) · A / D bank · G gear down · SHIFT burner · V·C view · look back · E E eject`;
  centre teach "Tap **W** to roll, **A / D** to steer onto the runway"; feed "JET: TAP RT … · SPACE / Q NOSE UP / DOWN · A / D STEER · SHIFT BURNER".
  Tank feed "W/S DRIVE · A/D TURN · MOUSE AIMS THE TURRET · LEFT CLICK FIRES · V GUNNER SIGHT · E GETS OUT", meter "Main gun ready · left click".
  The pad mappings exist (RT/LT throttle, LS pitch/roll, RS rudder, X gear, RB burner, B look back, Y eject) but no text tells a pad player.
- **Cause** compound keycaps (`W / S`, `V · C`, `E E`) have no `KEY2PAD` entry; the teach box is not inside a `textRoots()` element; feed/meter
  strings like "left click" / "SPACE / Q" don't match `TXT_KEY` (`js/gamepad.js:37`, `:47`, `:69`; `js/jet.js:447`; `js/tank.js:278`).
- **Evidence** `docs/audit/input/layout/deck-jet.jpg`, `deck-tank.jpg`. The tank hint bar also offers "R3 HOOD" (R3 is the gunner's sight there).

### IN-09 · Controller: conversation choices — D-pad toggles the flashlight / night vision instead of moving the choice
- **Confidence** RESULT_TALK_CONF. **Repro** `node dev/audit/input/pad-talk.js`.
- **Output** RESULT_TALK
- **Expected** D-pad / stick move between the numbered replies, A picks. **Happened** HT.Social choices aren't `.ht-ch`, so
  `js/gamepad.js:188` doesn't treat them as a choice strip; the D-pad sends `f`/`n` (`:194`), which the conversation lets through
  (`js/social.js:262-266`). Only LB + A/B/X/Y (= 1–4) can pick another reply, and the replies are labelled "1 2 3 4", not with the pad combo.

### IN-10 · Controller: phone camera and binoculars — LT (the pad's aim) does nothing; the text says "Right-click"
- **Confidence** phone CONFIRMED (run twice, `pad-jobs.js` second block); binoculars LIKELY (code only).
- **Output** `"LT_phone_raised_while_held": false, "LT_toggle_phone_raised": false, "P_aim": true`
- **Happened** LT raises the gun-aim state (`P.aim`) under the phone instead of the phone. The phone only rises from the
  right mouse button or the fire path (RT works as "raise, then shutter", so HOA is finishable). Teach text "Right-click to raise your phone · it stays up"
  (`js/jobs/hoa.js:366`) and the chip keycap `RMB` (`js/photo.js:319`) are shown to pad players. The tail job's binoculars rise only on
  `mousedown` button 2 (`js/jobs/tail.js:259`); in a car the pad's LT is the brake, so a pad player can't raise them at all (the plate photo bonus is lost).

### IN-11 · Keyboard: after rebinding, sentences still name the old key (only keycaps update)
- **Confidence** CONFIRMED (run twice). **Repro** `node dev/audit/input/rebind.js` (step 1): Use rebound to U, tutorial reached.
- **Output** `"tut": {"shown":true,"keycap":"U","text":"Walk up to the minivan and press E to drive"}`
- **Happened** the keycap beside the line says **U**, the sentence says **press E**. Same for every objective / teach / radio line
  ("Hold E · hitch up", "E to get out", "G to draw, click to fire", "Press G to call the box", "X: call Rick", "Z: zoom", "B · decorate").
  Non-`.ht-kc` keycaps never relabel: `<kbd>` in Grand Opening (`js/jobs/pawn.js:636,644,751,882`), the decorate panel `<i>`, gadget chips keyed `RMB`.
- **Cause** `swapText()` only rewrites sentences for the pad (`js/gamepad.js:66-71`); the keyboard path only relabels `.ht-kc` (`:80-82`).
- **Evidence** `docs/audit/input/rebind-use-U-tutorial.png`.

### IN-12 · Keyboard: binding an action onto a key a job or vehicle reads directly silently kills that job key
- **Confidence** CONFIRMED (run twice). **Repro** `node dev/audit/input/rebind.js` (step 2).
- **Output**
  ```
  "boundX_press_X_reaches_window_as": ["c/KeyC*"]     <- Crouch on X: X never reaches crossing's "call Rick" or the jet rudder
  "boundZ_press_Z_reaches_window_as": [" /Space*"]    <- Jump on Z: Higher Ground zoom / jet rudder left gone
  "relabel_X_Z": {"X":null,"Z":null}                  <- and the prompts keep saying X / Z
  ```
- **Expected** the Key bindings screen refuses or warns about keys the game uses elsewhere (it only knows Esc/P/1-3/Enter/Tab, `js/keys.js:19`).
  **Happened** the key is swallowed and re-sent as the action's default; nothing warns. Affected fixed keys: X, Z, T, arrows (jet pitch, menus),
  `+ - =` (phone/map zoom), `[ ]`, `,` `.`, 4–9 (Riverside, conversations, range rack).

### IN-13 · Keyboard: a rebound key on a non-letter key gets stuck down if Shift changes between press and release
- **Confidence** CONFIRMED (run twice). **Repro** `node dev/audit/input/rebind.js` (step 3): Move forward on `4`; press 4, press Shift (jog), release 4, release Shift.
- **Output** `"fwdOn4_shiftRelease": {"down":true,"afterRelease":true,"movedAfterRelease":4.16}` — the dad keeps walking with no key held.
- **Cause** `js/keys.js` keys its `held` map by `e.key` (`'4'` on press, `'$'` on release), so the release never matches (`js/keys.js:56-60`); the
  game's own `keys[]` is also keyed by `e.key` (`index.html:2053,2070`). Jogging is Shift, so this happens in normal play for any digit/symbol binding.

### IN-14 · Keyboard: AZERTY / non-QWERTY layouts — bindings are by typed character, the map key by physical position
- **Confidence** CONFIRMED (run twice, CDP trusted events with AZERTY key/code pairs). **Repro** `node dev/audit/input/rebind.js` (step 4).
- **Output**
  ```
  "physW_types_z": {"keys":["z"]}  "physA_types_q": {"keys":["q"]}   <- AZERTY's ZQSD block does not move the dad out of the box
  "labelled_M_key_opens_map": false, "comma_key_opens_map": true    <- the key labelled M doesn't open the map; "," does
  ```
- **Happened** out of the box an AZERTY player's left hand is on Z Q S D: Z does nothing, Q switches guns. Rebinding works, but then Z
  (needed for Fwd) collides with the scope zoom / jet rudder (IN-12). The map opens on `e.code==='KeyM'` (`js/hud.js:1187`), so on AZERTY
  it's the `,` key, while every prompt says M. Map pan and the calendar also use `e.code` (`js/hud.js:675-678`, `:1160-1163`), the range
  result card closes on `code KeyE` (`js/range.js:206`, on Dvorak that's the `.` key), movement and everything else use `e.key`.

### IN-15 · Web build: pressing a back/forward mouse button on the Key bindings screen navigates away and unloads the game
- **Confidence** CONFIRMED (run twice). **Repro** `node dev/audit/input/mouse45.js`.
- **Output**
  ```
  {"case":"A: playing, Mouse 4 unbound","url":"http://ht.local/index.html","gameAlive":true}
  {"case":"B: playing, Jump on Mouse 4","url":"http://ht.local/index.html","gameAlive":true}
  {"case":"C: Key bindings screen, capturing Jump","url":"about:blank","gameAlive":false}
  ```
- **Happened** the screen invites "press a key or mouse button"; Mouse 4 goes back in browser history (unsaved progress since the last
  autosave is lost). Only during capture: the capture branch prevents the mousedown but not the mouseup/navigation (`js/keys.js:63`).
  The desktop shell has no history to go back to, so this is the web (GitHub Pages) build only.

### IN-16 · Controller: tutorial and objective lines show keyboard/mouse words on the pad
- **Confidence** CONFIRMED for the keycaps (`glyphFor` returns null for them), LIKELY for where they show.
- **Happened** tutorial keycaps `WASD`, `Mouse`, `RMB` have no pad glyph (`KEY2PAD` has `W A S D` with spaces, no `MOUSE`/`RMB`; `index.html:4448-4458`);
  "Move the mouse to look around", "Right mouse raises your aim, click again to lower · left mouse fires", "Esc pauses", "Hold Shift while walking to jog"
  becomes "Hold L3" (L3 is a click toggle). Other leaks found in code: "E · zip-tie", "E · walk him away" (carwash), "G · check the glovebox (parked)",
  "E to get out" (finale, HOA), "G to draw, click to fire" / "G or right-click" (arrest), "Click: beanbag · Z: zoom" (finale street),
  "Move the cursor, click: …" (cones), "lost dog: E to take him home" (patrol) — none match `TXT_KEY` (it needs press/hold/tap before the key).

### IN-17 · Steam Deck (1280×800, 110 %): the jet HUD's feed lines run under the teach box and heading tape
- **Confidence** CONFIRMED (screenshot). **Repro** `node dev/audit/input/layout.js deck --shots` → `docs/audit/input/layout/deck-jet.jpg`.
- **Happened** at a 1164 CSS-px-wide viewport the right-hand feed lines extend left across the centre; the "Tap W to roll…" teach box and the
  `270 HDG / DAD-1` readout sit on top of them, so both are unreadable for the first seconds in the jet. The range "Now entering FORT SENSIBLE"
  banner and the feed also show through the rental rack menu (`deck-range-menu.jpg`).

---

## MINOR

- **IN-18** Shops/locker choose keyboard vs pad glyphs by "a gamepad is connected" (`js/save.js:1058`, never flips back), the HUD by
  "last device used" — a keyboard player with a pad plugged in sees Ⓐ/Ⓑ in shops and keys elsewhere. Shop glyphs are Xbox-only (Ⓐ Ⓑ, no PlayStation set). LIKELY (code).
- **IN-19** PlayStation glyphs are chosen only from the pad id string (`/054c|sony|dualsense|dualshock|playstation/`, `js/gamepad.js:131`).
  Under Steam Input a PS pad is presented as an Xbox 360 pad, so PS players get Xbox letters. Switch Pro (standard mapping = position) shows A where the
  physical label is B. SUSPECTED (not testable headless).
- **IN-20** A at the range rack with no prompt on screen jumps; keyboard E opens the menu from anywhere in front of the rack (`js/range.js:265`). CONFIRMED (IN-06 output).
- **IN-21** Tail binoculars ignore Aim: Hold (always a toggle; no mouseup handler, `js/jobs/tail.js:259`), although Key bindings says the Aim setting
  covers binoculars. LIKELY (code).
- **IN-22** Full map at 1280×720: the big title "MAPLE HEIGHTS · ROUTE 9 · RIVERSIDE FLATS" overlaps the region labels and the Maple trust bar
  (`docs/audit/input/layout/720-map.jpg`). CONFIRMED (screenshot).
- **IN-23** Health label, health value and weapon slot numbers render at 10 px at 1280×720 and 1080p (fine on Deck, which forces 11 px). CONFIRMED (layout JSON).
- **IN-24** Crossing job leftovers after it ends: an off-screen "Are you a cop?" element (`.cgx-b` at x≈1915) and Pastor Dee's subtitles keep playing over
  later screens (range menu, credits) (`deck-range-menu.jpg`, `deck-credits.jpg`). Not input, noted for the jobs auditor. CONFIRMED (screenshots, after `jobs.finish`).
- **IN-25** Pad diagram / Controls page: "Jog (click) L3" doesn't say it drops when the stick is released (which is what breaks IN-05); no row for
  choice strips (D-pad ↑↓ + A), the phone (RT), decorate (none), or the jet's B look back. "Esc" on Calendar/pause keycaps maps to Menu, but B is the back button everywhere else.

---

## Screen × size

Method: `dev/audit/input/layout.js <size> --shots` opens each screen in the live page and checks every visible text box for: outside the viewport,
truncated in an `overflow:hidden` box, overlapping another text box, under 11 device px. The overlap check flags tight kicker-over-heading line boxes
on every size (design, not defects) — the table counts only what was confirmed by eye in the screenshot. Deck = 1280×800 at 110 % (CSS 1164×727 @1.1),
`html.ht-deck`, pad prompts.

LAYOUT_TABLE

---

## Covered and found clean
- Aim Toggle/Hold (default Toggle) across gun aim, Higher Ground scope and Shift breath, the job camera and the tank sight with real mouse/keys (existing suite, re-run green); pad LT follows Hold until a mode is picked, then the setting.
- Rebinding UI: capture, Esc cancels without closing pause, click-away cancels, swap on conflict, reserved keys refused, reset, persistence, Mouse 3 for Use, Fire on a key (keys.e2e re-run green); Mouse 4 capture works in the desktop shell's absence of history (web only issue, IN-15).
- Held keys: a movement key held while Pause, the full map or a shop opens and released inside, or a window blur, never leaves the dad walking (`held-keys.js`).
- Mouse 4/5 during play (bound or not) do not navigate (`mouse45.js` A, B).
- Pad: title → New game with A, map open/pan/zoom/places/travel/close, pause focus and tabs, LB layer keys, tank RT fire / stick drive, jet throttle/rudder/gear/pitch (pad.e2e re-run green; title flow in `explore.js`).
- Deck: no text under 11 px on any walked screen; no text outside the viewport on title, pause tabs, shops, locker, map, brief, calendar, result, credits.

## Not covered (and why)
- A full start-to-finish pad playthrough of the first job, a blitz/roundup choice job and an LB-layer job: SwiftShader stepping makes a scripted pad drive
  across town impractically slow; I tested the pad at each job's decisive input instead (sign, scope, hitch, rack, choices). Blitz (1–4, Q) and roundup orders (1–4 in the
  convoy) map to LB+A/B/X/Y and RB by code and pad.e2e confirms the LB layer sends 1–4; not run in those jobs.
- Jet landing, eject and the ride back on the pad: the key mapping is verified (pad.e2e), the flight itself was not flown.
- Pointer-lock loss/regain: headless Chromium refuses pointer lock, so lock-specific behaviour (re-lock prompt after Esc) can't be exercised here.
- Real Steam Deck hardware, Steam Input remapping, real AZERTY/Dvorak OS layouts (simulated with CDP key/code pairs), key auto-repeat timing from a real keyboard.
- 3840×2160 at DPR 1 is very heavy for SwiftShader; see the table for what completed.
