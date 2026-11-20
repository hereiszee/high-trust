# HUD module (js/hud.js + css/hud.css)

`window.HT.HUD`. Test bench: `dev/hud.html?s=<scenario>` (mission, hub, lowhp, shotgun, scope, drive, interior, home, banner, done, map, title, title-loading, brief, result, pause, pause-display, pause-keys). Screenshots: `docs/screenshots/hud/<scenario>_{wide,tall}.jpg` (1280x720 and 390x844 touch, @2x).

## Status in index.html

Integrated. index.html builds one state object per frame in `hud(dt)`; `setObj/setPrompt/banner/radio/showMarker` keep their signatures and only fill that state. Feed lines (zip-tie, neutralized, shot a surrendered man, packages, stashes, crew down/up) and damage arcs come from diffing game counters in `hudEvents()`, so combat and AI code make no HUD calls (the only exception is `HUD.hit()` in `fire()`). Spawn code still writes name-tag elements into the hidden `#tags` sink; `hud()` reads their text/class into `state.tags`. Fonts are self-hosted (assets/fonts, OFL) and preloaded. In-game screenshots: `docs/screenshots/hud-ingame/`, scripts: `dev/hud-ingame/`.

## Integrating into index.html

1. In `<head>`, add `<link rel="stylesheet" href="css/hud.css">`. Before the game script, add `<script src="js/hud.js"></script>`.
2. Remove the old HUD:
   - CSS rules for `.hud #vig #xh #hm #obj #trust .bar #wpn #hp #crew #sub #prompt #banner #mk .tag #touch .tb #t*`, `.card` and its children, `.keys .btns .btn .ld .set`, plus the two `@media` blocks.
   - DOM: `#vig #xh #hm #obj #trust #hp #wpn #sub #prompt #banner #mk #tags #touch`, and the cards `#cTitle #cBrief #cPause #cResult`.
   - Keep `#lock` (or show it as a feed/info line) and keep the `--display/--body` tokens if other modules use them.
3. After the renderer is created, call `HT.HUD.init(document.body.appendChild(document.createElement('div')))`. Pass `{mapKey:false}` if the game handles M itself.
4. In `buildLevel(def)`, call `HT.HUD.minimap.setLevel(def.map, {tile:TILE, lines:def.lines, under:def.under, floor:def.floor, inside:def.inside, interior:def.id!=='hub', name:def.place||'Maple Heights'})`. Set pins once for the hub with `minimap.setPins([{id,kind:'home'|'shop'|'garage'|'travel',label,x,z,fast:true}])`.
5. Replace the body of `hud(dt)` with a call to `HT.HUD.update(buildState(), dt)`. `showMarker`, the `.tag` code and `banner()` become state fields or method calls (see below).
6. Wire the events:
   - Transient events: `HUD.hit('hit'|'kill'|'head')` in `dmgBy`, `HUD.damage({x,z},amt)` where the player takes damage (from the attacker's position), `HUD.feed('Zip-tied','cuff','+4 trust')`, `HUD.feed('Neutralized','kill')`, `HUD.banner({...})`.
   - Screens: `HUD.show('title'|'brief'|'result'|'pause', data)`, `HUD.set('title',{progress,ready,status,warn})` from `ASSETS.onProgress`, `HUD.hide()`.
   - Button presses arrive through `HUD.on('action',(id,data)=>…)`. The ids are `continue newgame brief:go brief:skip brief:no result:go result:retry resume abandon quit resetSave`. Settings changes arrive through `HUD.on('setting',(key,value)=>…)`, with keys `sens ads fov invert fp gfx subs mmRotate master music sfx voice`. Seed the values with `HUD.settings = CFG`. Title → Settings is handled inside the module.
   - Touch: `HUD.on('touch',(act,down)=>…)` with `act` one of `fire aim use reload crouch swap view pause map`. Call `HUD.touch.stick(x,y,active,originX,originY)` from the existing left-half drag code to drive the joystick visuals. Remove the old `#t*` listeners.
   - Fast travel: `HUD.minimap.onFastTravel(pin=>…)`. Mouse cursor: `HUD.on('map',open=>open?releaseLock():requestLock())`.

## State object (all fields optional)

```js
{ mode:'hub'|'mission'|'drive'|'home',
  player:{x,z}, compassYaw:P.yaw,                 // world metres, game yaw
  hp, hpMax, armor, trust, trust2 /*projected, striped*/, cash,
  weapon:{name,type /*pistol revolver nailer shotgun double beanbag rifle smg hunter*/,mag,reserve,magSize,firemode,reloading /*0..1, 0=not*/,holstered},
  weapons:[{key,name,type,active}],
  crew:[{name,hp,down,reviving /*0..1*/,bleed,bleedMax,x,z,color}],
  enemies:[{id,x,z,seen,alert,dead}],             // minimap blips while seen or alert, then a 3.5 s fade
  objective:{kicker,title,lines:[{text /*'Recover packages · 2/4' gets an auto counter*/,done,warn}]}, timer /*seconds|null*/,
  prompt:{key,text,sub,progress,hold}|null,
  speedMph, gear, vanHealth /*0..1 or 0..100*/,
  crosshair:{spread /*radians, as in fire()*/,fov /*current camera fov*/,hit,kill,headshot /*counters or booleans, the edge triggers*/,noFire,hidden,ads,adsT},
  markers:[{id,kind /*obj job shop home garage van revive loot travel*/,label,x,z,dist,screen:project(x,1.8,z),edge,always}],
  tags:[{id,text,kind /*ally down surr homie boss*/,screen}],
  subtitles:{speaker,text,color}|null, banner:{id,kind:'title'|'done'|'fail',kicker,title,sub,stats:[[k,v]],dur},
  routeTo:{x,z}|null /*auto road route, recomputed every 0.6 s*/, zone:'Maple Heights · Birch St' }
```
Instead of `routeTo`, you can pass explicit path points with `HUD.minimap.route(points)`. `HUD.minimap.findRoute(from,to,{drive})` returns the road-preferring path.

## Performance
The HUD writes to the DOM only when a value changes (setters cache the last value). The minimap, compass and full map canvases redraw at 30 Hz at most, and the compass also skips frames whose content is unchanged. Canvas sizes come from a ResizeObserver, so nothing reads layout per frame. In the bench, `update()` costs about 0.2 ms.

## Mission widgets (SPEC3 wave 0)

Generic pieces every job builds on; jobs feed state or call these and never edit `js/hud.js`. Styles live in `css/hud.css` (section *MISSION WIDGETS*). Full API comment at the top of the *MISSION WIDGETS* section in `js/hud.js`. Bench: `dev/hud.html?s=jobs` (demo panel on the right; `&demo=meters|bars|photo|choices|roles|calendar|restart` presets; `&check=1` or `window.jobsCheck()` runs 24 automated checks: meter cap, ring thresholds, band labels, timer format, gadgets, no DOM writes over 30 unchanged frames, nothing within 30 px of the crosshair, keys, roles Go gating, calendar acts and empty state, result restart). Screenshots: `docs/screenshots/jobs-framework/hud-<demo>_{wide,tall}.jpg`.

**State fields** (read each frame in `HUD.update`; DOM is pooled and written only on change):

```js
meters:[{id,label,v,max=1,style:'bar'|'ring'|'pips'|'bands',warn,warnBelow,icon,zones,marker,sub,color,glyph}], // first 3; top-centre under the compass, phones: 2-column grid under the minimap
//  bar   fill v/max; warn: threshold where it turns red (warnBelow:true = red below it); marker: white target notch
//  ring  detection eye: white < .35 <= yellow '?' < .6 <= orange '?' < 1.0 = red '!' (fractions of max); glyph overrides
//  pips  max pips (1..12), fractional v fills the last one part-way; warn as for bar
//  bands zones:[[from,to,'good'|'warn'|'bad',label?],...] over 0..max, marker at v, current zone's label on the right (+ ' · '+sub)
//  icon  'eye' 'car' 'chat' 'star' 'mask' 'clock' 'heart' 'bolt' 'cam' or an '<svg…>' string
widgets:[{id,kind:'timer'|'score'|'combo',label,v,max,hot,sub,n}], // first 4; a row under the compass (phones: strip between minimap and pause)
//  timer v seconds -> m:ss (tenths under 10 s), hot pulses red, max -> draining bar
//  score v, pops and floats "+n" on increase, max -> "/max"; combo: n -> "×n", v 0..1 decaying bar
gadgets:[{id,label,key,on,charge,icon}]  // chips above the gun; ids nv/goggles and flashlight/torch get icons; charge 0..1 battery, < .2 blinks
```
Keep meter and widget labels short (about 12 characters) so they fit on phones.

**Calls**

| | |
|---|---|
| `HUD.overlay(id, el)` / `(id, null)` / `(id)` | Mount / unmount (fade) / get a full-screen layer, above the world HUD and below the map and screens. `el.htModal=true` hides the touch buttons while mounted. |
| `HUD.checkpoint(label, sub?)` | 2.2 s toast, "CHECKPOINT · Stage 2" over "The swap" for `'Stage 2: The swap'`. |
| `HUD.kit.viewfinder()` | `{el, set({zoom,label,bracket:{x,y,w,h,label?,ok?}|null,stars:0..3|null,flash,rec,hint}), close()}`. Bracket in screen px. `flash` fires on its rising edge. `[X]` in `hint` renders a keycap. |
| `HUD.kit.choices({speaker,color?,prompt,tell,options:[{text,reg,disabled?}],onPick(i,opt),keys})` | `{el, set(next round), pick(i), close()}`. Keys 1..n and tap; locks after a pick until `set()`. `reg`: joke, real, over/overshare, compliment. The tell is shown as "[…]". |
| `HUD.kit.roles({kicker,title,roles,crew,assign,entries,entry,gear,forecast,goLabel,backLabel,onChange,onGo,onBack})` | `{el, set(partial), get()->{assign,entry}, close()}`. Tap a role, then a crew chip (one role each). Keys 1..9 pick role rows (entries continue the numbering), then 1..9 pick crew; Enter = Go (all `need>0` roles filled and an unlocked entry picked), Esc = deselect, then `onBack`. Update the forecast from `onChange` with `set({forecast})`. |
| `HUD.show('calendar',{title,kicker,day,entries:[{id,title,giver,place,hood,medal:0..3,best,runs,day,replayable,note}],selected})` | Fridge calendar (30-day pages, in-game day 1 is a Saturday) with medal pins, a list and details. Acts: `calendar:replay` with the **job id as the second argument** (`HUD.on('action',(a,arg)=>…)`; the card stays open, the game hides it) and `calendar:close` (button or Esc; the card hides itself). Up/Down move the selection, Left/Right flip months, Enter replays. An empty list shows "Nothing on the fridge yet". |
| `HUD.show('result',{…, restartLabel})` | Adds a ghost button with act `result:restart` after `result:retry`. |

While a choices strip or roles card is mounted (and no screen, map or shop is open) its keys are taken in the capture phase, so 1–3 don't switch guns. Tapping a gadget chip on touch emits `HUD.on('gadget', id)`.

**index.html integration:** dispatch actions with their argument (`HUD.on('action',(a,arg)=>UI.acts[a](arg))`), register `UI.acts['calendar:replay']`, `UI.acts['calendar:close']` and `UI.acts['result:restart']`, and fill `state.meters/widgets/gadgets` from `JH.hud(state)` before `HUD.update(state)`.
