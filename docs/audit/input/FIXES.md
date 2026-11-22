# Input audit — fixes (branch fix/input)

Every finding was re-run on main (2dd92c6) with the audit's probe before anything changed; all BLOCKER and MAJOR ones reproduced.
The probes live on in `dev/audit/input/` (and `dev/audit/code/c1-rebind-lock.js`); the regression tests that replace them are below.

## The design (the class, not the instances)

**One action layer, `js/keys.js`, loaded first** (before `js/hud.js`, so its window capture listeners run before every module's).

- **Bindings are by physical key** (`KeyboardEvent.code`; stored as `{"__v":2,...}`, old key-name `ht-keys` migrate). At the door every
  trusted key becomes its action's *canonical* default event (the US key + code), so every module keeps reading `'w'`, `'e'`, `'x'`… and an
  AZERTY / Dvorak player gets the WASD-position block, the map on the M-position key, digits without Shift, the range card on the Use key.
  Keys no action uses are rewritten to their US character by position; Esc, Enter, arrows, F-keys and the numpad pass untouched.
- **Held keys are tracked by code** (a Shift in between can't strand one); everything held is released on blur, on the tab going hidden and
  on losing pointer lock.
- **Labels**: `navigator.keyboard.getLayoutMap()` when the browser has it, else learned from the keys pressed, else US.
  `HT.Keys.label(action)`, `HT.Keys.relabel(defaultCapText)`.
- **Aim and Fire are actions**, fed by whatever is bound to them, the pad's LT / RT and the touch AIM button through
  `HT.Keys.aimInput(down, dev)` / `fireInput(down, dev)`. Tools claim them first: `HT.Keys.claim('aim'|'fire', fn(down,{mode,dev}) -> used)`.
  The crossing sign, the phone, the tail binoculars, the arrest draw, the finale scope and the carwash hose moved off raw mouse buttons.
  The Aim setting (Toggle default / Hold) applies to all of them; the pad keeps Hold until a mode is picked.
- **Job keys are actions** (G whistle/draw/glovebox, T, X, Z: "Job keys" group in Controls & keys). Taking one swaps it and the note says so.
  Arrows, + −, 4-9 and 0 are reserved with the reason.
- **One prompt helper** (`HT.Pad.keyText`, `js/gamepad.js`) for the pad *and* for rebound / non-QWERTY keyboards, over the whole page
  (`document.body`, incl. `<kbd>`): "press / hold / tap / with / release / or KEY", a key leading a line or after `·` (`E · zip-tie`, `G to draw`,
  `X: call Rick`), mouse phrases (right-click, left click, click to…, RMB / LMB / Mouse 1-2), WASD, W/S, A/D. Keycaps (`.ht-kc`, `kbd`) swap per
  device and context (in a vehicle Use is Y; in a car Aim is D-pad ↑; in the tank V is LT; on the map Click/Wheel/Tab/Enter/M are A, RT/LT,
  LB/RB, A, B; in shops Q/E/Esc are LB/RB/B). `HT.Pad.btn(name)` gives PlayStation shapes on a PlayStation pad.
  Text a module builds for itself (jet steps and strip, tank teach line, range rack line, tutorial lines, decorate panel) asks the device / labels directly.
- **`HT.Pad.modal({move, ok, back, x, y})`**: a picker over live play owns the pad while it is up (range rack, conversation replies).
  **`HT.Pad.useAt(fn)`**: a Use with no HUD prompt (the range rack) makes A use rather than jump.

## Findings

| ID | Status | What changed |
|---|---|---|
| IN-01 | CONFIRMED + FIXED | pad LT → `aimInput` → the crossing claim raises / lowers the sign; chip `RMB` shows LT |
| IN-02 | CONFIRMED + FIXED | pad Y is Use held as long as the button (hold hitches, tap gets out); Use reads Y in any vehicle, so prompt, meter and objective agree |
| IN-03 | CONFIRMED + FIXED | Aim on K / Mouse 5 raises the sign, phone, binoculars (the claims) |
| IN-04 | CONFIRMED + FIXED | at home pad B opens / closes Decorate; A place, X rotate, RB / D→ next, D← previous, LB+→ put away, View move; panel keycaps are `.ht-kc` with a pad row |
| SAV-01 | CONFIRMED + FIXED | `js/hud.js` binds only `.ht-seg3[data-k]`; `setting('undefined')` ignored; a stray `"undefined"` is deleted from `ht-cfg` at load; `dev/aim-toggle.e2e.js` clicks Hold inside the real pause pane |
| C-1 | CONFIRMED + FIXED | `js/keys.js` asks `HT.Input.lockClick()` first for every mousedown on the view, whatever the bindings |
| IN-05 | CONFIRMED + FIXED | while scoped, L3 is Jog held as long as it is pressed (tap-to-hold / press-and-hold per Aim) |
| IN-06 | CONFIRMED + FIXED | rack menu is a pad modal (D-pad / stick / LB RB move, A takes, X own guns, B closes); its line names pad buttons; backdrop .88 |
| IN-07 | CONFIRMED + FIXED | `glyphFor` maps Use → Y whenever driving, not only inside `.ht-drv` |
| IN-08 | CONFIRMED + FIXED | jet steps, strip and teach lines, tank teach line built per device / per binding; tank hint bar says Sight, V → LT |
| IN-09 | CONFIRMED + FIXED | conversation replies are a pad modal (D-pad / stick move, A picks); the badge shows A on the selected reply |
| IN-10 | CONFIRMED + FIXED | LT raises the phone (claim); binoculars on Aim, and D-pad ↑ is Aim in a car |
| IN-11 | CONFIRMED + FIXED | sentences and `<kbd>` relabel for rebound keys; decorate panel and RMB chips too |
| IN-12 | CONFIRMED + FIXED | job keys are bindable actions; conflicts swap with a note; other fixed keys refused with the reason |
| IN-13 | CONFIRMED + FIXED | held keys by code; release-all on blur / hidden / pointer-lock loss |
| IN-14 | CONFIRMED + FIXED | bindings by code with layout labels (see design) |
| IN-15 | CONFIRMED + FIXED | Mouse 4/5 prevented on down / up / auxclick; a beforeunload guard while a job is in progress (web build only) |
| IN-16 | CONFIRMED + FIXED | prompt helper over the page; tutorial steps have pad lines; `dev/prompt-sweep.js` (static, 0 leaks of 108 strings); range sign no longer prints a key |
| IN-17 | CONFIRMED + FIXED (CSS) | feed lines wrap inside a 30vw column on compact screens; in the jet the feed sits bottom right above the strip; range menu backdrop .88 |
| IN-18 | FIXED | shop footers follow the last device, in the pad's own glyphs |
| IN-19 | FIXED (setting) | Pause → Controls → Button prompts: Auto / Xbox / PlayStation (Steam Input shows every pad as Xbox) |
| IN-20 | FIXED | pad A at the rack opens it (`HT.Pad.useAt`) |
| IN-21 | FIXED | binoculars follow Aim: Hold |
| IN-22 | FIXED (CSS) | map title smaller under 780 px tall |
| IN-23 | FIXED (CSS) | `--t-2xs` 11 px everywhere (was 10) |
| IN-24 | NOT DONE | crossing leftovers after the job: not input, for the jobs owner |
| IN-25 | FIXED | Controls page rows: L3 note, replies / pickers, binoculars in a car, decorate, jet look back / eject |
| IN-26 | FIXED (option) | Interface size offers 150% (the shell's limit) |

## Tests

- `dev/input-blockers.e2e.js` — IN-01..04, IN-03, IN-15, C-1 (scripted pad, trusted keys, CDP Mouse 5).
- `dev/input-majors.e2e.js` — IN-05..14 (pad half and keyboard half; AZERTY via a layout map + CDP key/code pairs).
- `dev/pad-run.e2e.js --part=a|b|c` — controller-only acceptance run from the title, no keyboard or mouse event at all; every prompt
  screenshotted under `docs/screenshots/input/pad-run-*/` and checked for keyboard / mouse names (`prompts.json`).
- `dev/kb-run.e2e.js` — the same list keyboard-only on a simulated AZERTY layout with every action (Fire and Aim included) on a non-default key.
- `dev/prompt-sweep.js` — static sweep of every string literal through the real helper.
- `dev/aim-toggle.e2e.js` now clicks inside the real pause pane; `dev/keys.e2e.js` stores codes and retries the headless lock race once.

## Honest limits

- In the acceptance runs, the job's own scripted player (`test.step`) walks / drives between beats for Crossing Guard, Hitch Happens,
  Higher Ground and Neighborhood Blitz; each time it wants the sign, the hitch, the scope, a shot or a tool, the run undoes its direct call and
  the pad (or the rebound key) does it. Free-roam walking, the van, tank, jet, map, shop, rack, decorate and menus are pure pad / key input.
  Some set-ups (unlocking a job, teleporting next to a door or vehicle, a thug's surrender) are direct; the input under test never is.
- Keyboard-only has no mouse look: the keyboard run sets the view direction where a player would use the mouse.
- Headless Chromium refuses pointer lock and has no real layout or Steam Input; Deck layout and real controllers are untested here.
- The door rewrites the events modules see (rewritten ones are untrusted); modules that check `isTrusted` would need the original.
