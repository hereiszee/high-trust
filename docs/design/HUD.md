# HUD module (js/hud.js + css/hud.css)

`window.HT.HUD`. Test bench: `dev/hud.html?s=<scenario>` (mission, hub, lowhp, shotgun, scope, drive, interior, home, banner, done, map, title, title-loading, brief, result, pause, pause-display, pause-keys). Screenshots: `docs/screenshots/hud/<scenario>_{wide,tall}.jpg` (1280x720 and 390x844 touch, @2x).

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
