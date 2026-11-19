# Audio engine (`js/audio.js`)

Everything is synthesized: no audio files. Short sounds (gunshots, tails, mechanics, impacts, footsteps, UI, voices) are rendered once into AudioBuffers with small JS DSP routines and cached, so playing them costs one buffer source plus a short gain → low-pass → pan chain. Continuous sounds (minivan engine, ambience beds, music) run live in WebAudio.

Signal flow: voices → `sfx` / `ui` / `music` / `ambience` buses → master → compressor → limiter → soft clipper → output. There are procedurally generated convolution reverbs for a small room, outdoors and a music plate. Music and ambience duck briefly under the player's own shots.

Test page: `dev/audio.html` has a button for every sound, plus vehicle sliders, ambience and music switching, volumes and a scope.
Tests: `node dev/audio-test.js` renders everything offline and checks levels, clipping and that every gun sounds measurably different. `node dev/audio-live-test.js` runs a real-time smoke test. `node dev/audio-spectrogram.js 2 "A.gun('rifle')"` renders spectrograms to a PNG.

## API (`window.HT.Audio`)

| Call | Notes |
|---|---|
| `init()` | Call on the first user gesture. Safe to call again (it resumes a suspended context). Pre-renders buffers in idle time (about 1.3 s of idle CPU spread over frames). |
| `setVolume({master,sfx,music,ambience})` | 0..1 each (up to 1.5). |
| `listener(x,y,z,yaw)` | Same yaw convention as `P.yaw`: forward is `(-sin yaw, 0, -cos yaw)`. Call every frame with the camera position. |
| `pause(bool)` | Suspends or resumes the whole context (pause menu). |
| `setIndoor(bool)` | Default room acoustics for sounds that don't pass `indoor`. |
| `gun(type,{pos,indoor,suppressed,vol,cycle,rate})` | `pos:null` means the player's own gun: centred, with a sub-bass punch, and it ducks music and ambience. A position means another shooter: inverse-distance attenuation, low-pass with distance, a speed-of-sound delay (capped at 0.4 s), stereo pan, and a tail that falls off more slowly than the bang, so far shots are mostly echo. Types: `pistol revolver nailer shotgun double beanbag rifle smg hunter flare`. Aliases: `hunting`, `sawedoff`, `carbine`, `nailgun`, `flaregun`. The pump, bolt and hammer follow-ups play automatically; pass `cycle:false` if the game triggers them itself. |
| `mech(type, action, {pos,delay,vol})` | Actions: `reload_out reload_in pump bolt dry equip shell` (`hammer` is internal). They differ by gun family: magazine, tool, cylinder, tube, break-open, bolt. |
| `shellCasing(surface,{type,pos})` | Brass tinkle, or a plastic hull for shotguns, bouncing on `concrete asphalt tile wood metal grass dirt carpet`. |
| `impact(surface,pos)` | `concrete wood metal glass dirt cloth beanbag` (plus aliases such as `asphalt`, `brick`, `body`, `car`, `window`). Metal and concrete sometimes ricochet. |
| `whizz(pos)` | Bullet pass-by with a supersonic snap. |
| `footstep(surface,{run,crouch,pos,side})` | `asphalt concrete grass gravel wood tile metal carpet`, with 5 variants each. `side:±1` alternates feet slightly. |
| `ui(kind)` | `hitmarker kill headshot ziptie pickup cash objective hover click back denied start win fail`. There are shortcuts too: `hitmarker() headshot() zipTie() pickup() cash() uiHover() uiClick()`. |
| `stinger('start'\|'win'\|'fail')` | Short musical cues on the UI bus, independent of music volume. |
| `voice(kind,pos,{radio,word,pitch,vol})` | Returns the duration in seconds. Kinds: `dad dad_alert dad_hurt dad_cheer dad_laugh dad_think dad_ok dad_aw thug thug_alert thug_hurt thug_surrender thug_laugh kid kid_laugh kid_yay dog dog_whine radio_in radio_out`. `radio:true` band-limits the voice and wraps it in squelch in and out. |
| `vehicle({start,inside})` | Returns `{set({rpm,throttle,speed,skid,inside}), horn(kind), hornDown(), hornUp(), door(kind), crash(intensity), stop(), alive}`. Horn kinds: `tap short long double triple shave`. Door kinds: `open close slide trunk`. |
| `ambience(kind)` | `suburb industrial den dusk home`, or `null`/`'none'`. Crossfades over 2.5 s. |
| `music(state,{intensity,quick})` | `hub tension combat victory home`, or `null`/`'off'`. Changes on the next bar. Entering `combat` from another song changes on the next beat. `victory` plays 4 bars, then stops. `setIntensity(0..1)` adds or removes layers. |
| `legacy(kind,vol)` | A drop-in for the old `snd(kind,vol)`. |
| `state` | `{ctx, voices, music, ambience, cached}` for debugging. |

## Wiring it into `index.html`

1. Add `<script src="js/audio.js"></script>` before the main script.
2. Make `initAudio()` call `HT.Audio.init()`. The quickest bridge is `function snd(k,v){HT.Audio.legacy(k,v)}`. Then replace the calls one by one, as listed below.
3. Each frame, in `updCamera` or the main loop: `HT.Audio.listener(camera.position.x,camera.position.y,camera.position.z,P.yaw)`.

| Current code | New call |
|---|---|
| `fire()`: `snd(w.snd)` | `HT.Audio.gun(id,{indoor:L.indoor})`, where `id` is the weapon key. Call it once per trigger pull, not once per pellet. |
| `fire()`: `snd('click')` on an empty mag | `HT.Audio.mech(id,'dry')` |
| `reload()` start / end | `mech(id,'reload_out')` at the start and `mech(id,'reload_in')` at the end. For shell guns, call `mech(id,'shell')` per shell. For `pistol`, `rifle` and `smg` empty reloads, add `mech(id,'bolt')`. |
| `swap()` | `mech(id,'equip')` |
| line ~992, NPC shots: `snd(isEnemy?'enemy':'pistol',…)` | `HT.Audio.gun(src.gunId\|\|'pistol',{pos:src.pos,indoor:L.indoor})`. A THREE.Vector3 works as `pos`. If the bullet passes within about 2 m of the player, also call `whizz(closest point)`. |
| player bullet hits the world | `impact(surface, hitPoint)` |
| hit / kill / headshot on an enemy | `ui('hitmarker')`, `ui('kill')`, `ui('headshot')` |
| `snd('cuff')` (zip-tie) | `ui('ziptie')` |
| loot pickup (`snd('cuff')` in the loot branch) | `ui('pickup')` |
| `snd('smash')` (stash) | `impact('wood',pos)` plus `impact('glass',pos)` |
| `engine(true)` in `enterVan` | `van=HT.Audio.vehicle(); van.door('slide')` |
| `engine(false)` | `van.door('slide'); van.stop()`. `door()`, `horn()` and `crash()` still work after `stop()`. |
| line ~792, `ENG.o.frequency…` | `van.set({rpm,throttle:thr?1:0,speed:VAN.spd,skid:handbrake&&Math.abs(VAN.spd)>4?1:0})`. Fake the gears: `g=Math.abs(VAN.spd)/30; rpm=.08+.85*((g*3)%1)*.7+g*.3`, or simply `clamp(.08+Math.abs(VAN.spd)/22,0,1)`. |
| `honk()` | `van.horn('double')`, or `hornDown()` on keydown and `hornUp()` on keyup |
| `snd('hit',…)` (van bump) | `van.crash(Math.min(1,Math.abs(v)/15))` |
| `radio(who,text)` | `HT.Audio.voice(who==='you'?'dad_ok':'dad',null,{radio:true})`. Rate-limit it to one every 1.5 s. |
| enemy alert / hurt / surrender | `voice('thug_alert',e.pos)`, `voice('thug_hurt',e.pos)`, `voice('thug_surrender',e.pos)` |
| `enterHub()` | `ambience(mood==='dusk'?'dusk':'suburb'); music('hub'); setIndoor(false)` |
| mission start | `stinger('start'); music('tension'); ambience(def.type==='waves'?'suburb':'den')`, plus `setIndoor(true)` inside buildings |
| first enemy alerted | `music('combat')`. When the area is clear, call `music('tension')`. |
| `endMission(ok)` | win: `music('victory')`, then `ui('cash')` per payout line. Fail: `stinger('fail'); music(null)`. |
| home interior | `ambience('home'); music('home'); setIndoor(true)` |
| pause menu | `HT.Audio.pause(true/false)`. Volume sliders call `setVolume`. |
| footsteps (new) | In `updPlayer`, add distance moved each frame, and every 1.7 m walking or 2.3 m jogging call `footstep(surface,{run,crouch,side:s=-s})` |
