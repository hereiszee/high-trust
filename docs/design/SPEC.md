# High Trust: Arsenal, Home & Economy, implementation spec

Target: `/home/user/high-trust/index.html` (single IIFE, Three.js r128). Another workflow is changing rendering (PBR, glTF characters/props/guns) right now, so **refer to code by function and constant name, not by line number**. Everything below fits the existing data shapes: `WEAPONS`, `ORDER`, `MISSIONS`, `prog`, `HOMIES`, `HUB` (IIFE grid generator), `buildLevel(def)` legend, `CFG`/`ht-cfg`, `#cPause`, `openBrief`, `endMission`, `window.__ht.step`.

Conventions used by the current code, which this spec keeps:
- `TILE=2` m. Grid char maps. `SOLID` / `LOSBLOCK` are strings of chars.
- Spread is the scale of a random cube offset added to the unit forward vector, so it is roughly radians.
- `P.pitch` going up means the view goes up, so recoil adds to pitch.
- Enemy HP is 75 (shotgunner 90, King 420). Headshots come from `hit.object.userData.head`. With glTF dudes, keep this behind a helper `isHead(hit)` that returns `userData.head || (hit.point.y - ent.pos.y) > 1.52*scale`.
- Base player speeds: walk 4.3, jog 6.6, crouch 2.3, aim 3.0 m/s.
- `snd(kind,vol)` is the noise-buffer synth. This spec adds `gunSnd(recipe,vol,opts)` next to it.

New `mode` values: `'home'`, plus `'decor'` (a sub-state of home). `frame()` and `__ht.step()` both dispatch `mode==='home' ? updHome(dt)`.

---

## A) Weapon feel

### A.1 Data model (replaces `WEAPONS`, `ORDER`)

```js
const AMMO={ '9mm':{name:'9mm',cap:192}, '357':{name:'.357',cap:36}, nails:{name:'Nails',cap:200},
  '12ga':{name:'12 ga',cap:40}, bean:{name:'Beanbags',cap:30}, '556':{name:'5.56',cap:180}, '308':{name:'.308',cap:25} };
// slot: 'side' | 'prim'.  Times in seconds, distances in metres, angles in radians.
const WEAPONS={ id:{
  name, short, slot, ammo, auto, dmg, head, rate, mag, reserve, pellets, range,
  fall:[near,far,minMul],               // damage multiplier: 1 until near, linear to minMul at far
  spread:{hip, ads, move, bloomAdd, bloomMax, bloomDec},   // move = multiplier at full walk speed
  rc:{v, h, hBias, adsMul, rec, pat},    // pat: per-shot [vScale,hBias] list, last entry repeats
  ads:{zoom, t, speed},                  // zoom = FOV multiplier, t = time to full ADS, speed = move mult while ADS
  speed,                                 // global move multiplier while held
  reload:{tac, empty} | {shell:{start, each, end, emptyExtra}},
  equip, fsa,                            // fsa: first shot after 0.5 s of rest uses ads*0.5 spread
  snd:{crack:[bpHz,Q,dur,vol], body:[lpHz,dur,vol], thump:[wave,f0,f1,dur,vol], tail:[lpHz,dur,vol,echoDelay,echoFb], mech:[[at,hpHz,dur,vol]...]},
  vm:{back, rise, roll, side, k, damp, reloadStyle},
  att:['optic','mag','under','muzzle'], // compatible attachment slots
  price, unlock:{...}, look:{...}, nonlethal?, special?
}};
const SLOT_KEYS=['side','p1','p2'];   // number keys 1,2,3; replaces ORDER
```

### A.2 The arsenal (9 guns)

| id | Name | Slot | Ammo | Feel in one line |
|---|---|---|---|---|
| `pistol` | Garage Pistol | side | 9mm | Honest and quick to aim. The baseline everything else is measured against. |
| `revolver` | The Retirement Plan (.357) | side | 357 | Six heavy shots with a big bark and a slow cock. Every shot is a decision. |
| `nailer` | Weekend Nailer | side | nails | A cordless framing nailer. It sprays at 800 rpm, has almost no kick and is useless past 15 m. |
| `shotgun` | Grandpa's Pump | prim | 12ga | Loads shell by shell. Dominates a room, gone at range. |
| `double` | Uncle Ray's Side-by-Side | prim | 12ga | Two barrels, both shells back to back. Hits the hardest of any gun, then needs a long reload. |
| `beanbag` | The Talking-To | prim | bean | Orange-stocked less-lethal pump. It can't kill. It makes people surrender. |
| `rifle` | Rick's Carbine | prim | 556 | Controllable auto. Climbs for 6 shots, then drifts right. The all-rounder. |
| `smg` | The Carpool | prim | 9mm | Buzzy and twitchy sideways with little climb. The best gun to shoot while moving. Shares 9mm with the pistol. |
| `hunter` | Deer Season | prim | 308 | Scoped bolt-action. Terrible from the hip, a laser through the scope. One body shot drops a thug. |

#### Core damage

| id | dmg | head× | pellets | rate (s) | rpm | auto | mag | reserve | range | fall [near,far,min] | body hits to drop 75 hp at close range |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pistol | 30 | 2.0 | 1 | 0.20 | 300 | no | 12 | 84 | 70 | [25,60,0.6] | 3 |
| revolver | 58 | 2.2 | 1 | 0.42 | 143 | no | 6 | 36 | 90 | [40,90,0.75] | 2 (1 head) |
| nailer | 11 | 1.5 | 1 | 0.075 | 800 | yes | 40 | 160 | 26 | [8,20,0.3] | 7 |
| shotgun | 15 | 1.5 | 9 | 0.85 | 70 | no | 6 | 36 | 28 | [6,24,0.2] | 1 inside 6 m |
| double | 16 | 1.5 | 10 | 0.18 (between barrels) | n/a | no | 2 | 30 | 22 | [5,18,0.15] | 1 inside 5 m |
| beanbag | 34 stun | 1.0 | 1 | 0.80 | 75 | no | 5 | 30 | 40 | [25,40,0.5] | never kills (see special) |
| rifle | 24 | 2.0 | 1 | 0.105 | 571 | yes | 30 | 180 | 110 | [40,110,0.7] | 4 |
| smg | 17 | 1.6 | 1 | 0.070 | 857 | yes | 32 | 192 | 50 | [12,35,0.45] | 5 |
| hunter | 95 | 2.5 | 1 | 1.10 | 55 | no | 5 | 25 | 160 | [160,160,1] | 1 |

Fall-off replaces the shotgun-only `clamp(1.15-dist/range,.25,1)`:
`fallMul(w,d)= d<=w.fall[0]?1 : d>=w.fall[1]?w.fall[2] : 1-(1-w.fall[2])*(d-w.fall[0])/(w.fall[1]-w.fall[0])`.
Pellets keep being summed per target in `dmgBy`; this stays as it is.

#### Accuracy and handling

| id | hip | ADS | move× | bloom add / max / decay | ADS zoom (FOV×) | ADS time | ADS move× | held move× | equip | first-shot accurate |
|---|---|---|---|---|---|---|---|---|---|---|
| pistol | .014 | .004 | 1.5 | .004/.02/6 | 0.85 | 0.14 | 0.75 | 1.00 | 0.25 | no |
| revolver | .020 | .002 | 2.0 | .012/.03/4 | 0.80 | 0.18 | 0.72 | 0.98 | 0.35 | yes |
| nailer | .030 | .018 | 1.2 | .002/.02/10 | 0.95 | 0.10 | 0.85 | 1.05 | 0.30 | no |
| shotgun | .075 | .055 | 1.3 | 0/0/0 | 0.90 | 0.20 | 0.70 | 0.94 | 0.45 | no |
| double | .090 | .070 | 1.2 | 0/0/0 | 0.92 | 0.22 | 0.70 | 0.95 | 0.40 | no |
| beanbag | .030 | .008 | 1.4 | .006/.02/5 | 0.88 | 0.20 | 0.70 | 0.95 | 0.45 | yes |
| rifle | .020 | .006 | 1.7 | .003/.03/7 | 0.70 | 0.20 | 0.70 | 0.97 | 0.40 | no |
| smg | .022 | .012 | 1.15 | .0025/.025/9 | 0.85 | 0.13 | 0.80 | 1.04 | 0.28 | no |
| hunter | .060 | .0005 | 3.0 | .02/.06/3 | 0.30 (scope) | 0.32 | 0.55 | 0.90 | 0.55 | yes |

Spread formula, replacing the `spread` line in `fire()` and the matching line in `hud()`:
```
moveFrac = clamp(currentSpeed/4.3, 0, 1)
spread = lerp(w.spread.hip, w.spread.ads, P.adsT) * lerp(1, w.spread.move, moveFrac) * (P.crouch?.7:1) * attMul.spread + P.bloom
if (w.fsa && simT-P.lastShotT > .5) spread *= .5     // relative to the ADS lerp
```
`P.adsT` ramps toward `P.aim?1:0` at `1/(w.ads.t*attMul.adsT)` per second. Camera FOV becomes `base*lerp(1,w.ads.zoom,P.adsT)`; the current fixed `.7`/`.8` goes away. The sensitivity scale `CFG.ads/100` applies once `adsT>.5`, and is additionally multiplied by `w.ads.zoom` for the hunter scope only, so the scope does not feel twitchy.

Movement: multiply every speed in `updPlayer` (`sp`) by `w.speed`. While aiming, use `4.3*w.ads.speed*w.speed` instead of the flat 3.0.

#### Recoil (vertical climb, horizontal jitter, recovery)

| id | v (rad/shot) | h jitter | hBias | ADS× | recovery rate (1/s) | pattern (vScale,hBias per shot index) | character |
|---|---|---|---|---|---|---|---|
| pistol | .012 | .003 | 0 | .6 | 6 | `[[1,0]]` | Small snap that settles quickly. |
| revolver | .045 | .012 | 0 | .7 | 4 | `[[1,0]]` | Big muzzle flip. You re-acquire the target for every shot. |
| nailer | .002 | .004 | 0 | .8 | 12 | `[[1,0]]` | Almost no climb, wobbly spray. Inaccuracy comes from spread, not kick. |
| shotgun | .060 | .020 | 0 | .7 | 5 | `[[1,0]]` | Heavy shove, fine because of the pump delay. |
| double | .110 | .030 | .3 | .8 | 3.5 | `[[1,0],[1.25,.4]]` | Second barrel kicks harder and to the right. |
| beanbag | .050 | .010 | 0 | .7 | 5 | `[[1,0]]` | Soft thump. |
| rifle | .009 | .005 | 0 | .6 | 7 | `[[1.4,0],[1.3,0],[1.2,0],[1.1,0],[1,0],[1,0],[.7,.6],[.6,.8]]` | Climbs straight up for 6 shots, then flattens and drifts right. You learn it. |
| smg | .006 | .009 | 0 | .7 | 10 | `[[1,0],[1,-.3],[1,.3]]` | Little climb, side-to-side buzz. |
| hunter | .090 | .010 | 0 | 1.0 | 3 | `[[1,0]]` | One big rise, then a slow settle during the bolt cycle. |

Recoil implementation (replaces the `P.pitch += w.recoil...` line and `P.recoilKick`):
```
n = (simT - P.lastShotT < w.rate + .12) ? P.chain+1 : 0;  P.chain=n;  P.lastShotT=simT
p = w.rc.pat[Math.min(n, w.rc.pat.length-1)]
kv = w.rc.v * p[0] * lerp(1, w.rc.adsMul, P.adsT) * (P.crouch?.8:1) * attMul.rv
kh = w.rc.h * (p[1] + w.rc.hBias + rand(-1,1)) * attMul.rh
P.pitch = clamp(P.pitch+kv, -1.3, 1.25); P.yaw -= kh; P.rDebt += kv
P.bloom = Math.min(w.spread.bloomMax, P.bloom + w.spread.bloomAdd)
// each frame in updPlayer:
r = P.rDebt*(1-Math.exp(-w.rc.rec*dt)); P.pitch -= r; P.rDebt -= r
P.bloom *= Math.exp(-w.spread.bloomDec*dt)
// in look(): if the mouse moved the view down while P.rDebt>0, subtract that amount from P.rDebt
// (floored at 0), so recovery never pulls below where the player aimed.
```
Recovery returns about 85-95% of the climb. The rest is what the player pulls down.

#### Reload, equip, economy

| id | reload tactical / empty | reload style | vm kick (back m, rise rad, roll, side, spring k, damp) | price | unlock |
|---|---|---|---|---|---|
| pistol | 1.1 / 1.4 (slide release) | mag | .04 .10 .02 .005 140 16 | owned at start | start |
| revolver | 2.2 / 2.2 (speedloader) | cylinder swing-out | .07 .28 .05 .01 90 11 | $450 | buy after M1 **or** collect 1 |
| nailer | 1.6 / 2.0 (battery + strip) | tilt down | .015 .02 .03 .02 220 22 | $180 | buy any time **or** collect 1 (chop shop) |
| shotgun | shell: start .35, each .50, end .25, empty +.45 (racks the pump) | shell feed | .09 .16 .03 .01 80 10 | owned at start | start ("Grandpa's, in the garage") |
| double | 2.0 / 2.0 (break-open, both shells) | break-open | .12 .22 .06 .015 70 9 | $700 | buy after M3 **or** collect 2 |
| beanbag | shell: start .35, each .55, end .25, empty +.45 | shell feed | .07 .12 .02 .01 90 12 | $600 | buy at trust ≥ 40 **or** gifted at 10 lifetime zip-ties |
| rifle | 1.9 / 2.4 (bolt release) | mag | .025 .035 .01 .006 160 18 | gift | Rick lends it in M2, yours after the M2 win |
| smg | 1.6 / 2.0 | mag | .018 .02 .015 .012 200 20 | $900 | buy after M2 **or** collect 2 |
| hunter | 2.6 / 3.1 (stripper clip); bolt cycle .45 s after every shot | bolt | .10 .20 .02 0 60 8 | $1200 | buy after M3 **or** collect 1 (Ridgeview yard) |

Shell reloads (`reload.shell`) add one round per `each`. Pressing fire cancels the reload after the current shell. Empty reloads add `emptyExtra`. Magazine reloads with `mag>0` use `tac` and keep the round in the chamber, so they refill to `mag+1` for `pistol`, `rifle` and `smg` only. That gives the player a reason to reload early.

Equip: `swap()` sets `P.equipT=w.equip*attMul.equip`. The view model starts 0.35 m low and 0.6 rad pitched and springs into place. Firing is blocked while `P.equipT>0`. The current fixed `P.fireT=.35` goes away.

View-model spring (in `updCamera` for first person, on the right-arm group for third person):
```
on shot: vmS.vz += w.vm.back*60; vmS.vrx += w.vm.rise*60; vmS.vrz += rand(-1,1)*w.vm.roll*60; vmS.vx += rand(-1,1)*w.vm.side*60
each frame, for each channel c: a = -w.vm.k*c - w.vm.damp*v;  v += a*dt;  c += v*dt
vm.position.z += vmS.z; vm.rotation.x += vmS.rx; ...    (added on top of the current ADS/reload offsets)
```
Kick character: the pistol pops, the revolver rocks back hard and slowly, the nailer vibrates (high k, tiny amplitude), the shotgun and double shove into the shoulder (big `back`, low k), the carbine and SMG buzz, and the hunter makes one big slow rise.

#### Sound recipes (`gunSnd`)

`gunSnd(recipe, vol, {dist=0, muffled=false})` plays up to five layers. All of them reuse `noiseBuf` except `thump`, which uses an oscillator.
- **crack**: noise through a bandpass (`bpHz`, `Q`), exponential decay over `dur`. This is the transient.
- **body**: noise through a lowpass (`lpHz`), decay over `dur`.
- **thump**: oscillator `wave` gliding exponentially from `f0` to `f1` Hz over `dur`.
- **tail**: noise through a lowpass, slow decay. If `echoDelay` is set, route it through `DelayNode(echoDelay)` with feedback gain `echoFb`.
- **mech**: highpass noise clicks scheduled at `at` seconds after the shot (pump, bolt, hammer, nail hiss).

Distance: `vol *= clamp(1-dist/45,0,1)`, and every layer's filter frequency is multiplied by `lerp(1,.45,dist/45)`. Enemy shots use their gun's recipe with these rules, which replaces `snd('enemy')`. `muffled` (suppressor) multiplies crack vol ×.15, body lp ×.5 and vol ×.35, tail vol ×.3, and adds one `mech` of `[0,1800,.05,.2]` for the "pfft".

| id | crack [bp,Q,dur,vol] | body [lp,dur,vol] | thump [wave,f0,f1,dur,vol] | tail [lp,dur,vol,echo,fb] | mech | how it reads |
|---|---|---|---|---|---|---|
| pistol | 3200,1.2,.03,.5 | 2200,.16,.45 | sine,150,45,.12,.32 | 900,.35,.12 | none | Dry pop |
| revolver | 2600,.9,.04,.7 | 1500,.25,.7 | sine,110,38,.2,.5 | 700,.7,.22,.12,.25 | [.38,3000,.03,.12] hammer | Boom that rolls out |
| nailer | 6000,3,.015,.25 | 4000,.05,.15 | square,220,180,.04,.06 | none | [.03,7000,.08,.08] air hiss | Ka-chak-pssht. A tool, not a gun. |
| shotgun | 1800,.7,.05,.8 | 900,.4,.9 | sine,90,35,.16,.45 | 500,.8,.25 | [.32,2500,.06,.25],[.42,1800,.06,.25] | Boom, then shk-shk |
| double | 1500,.6,.06,1.0 | 700,.55,1.0 | sine,70,28,.25,.6 | 400,1.1,.35,.15,.3 | reload: [0,3500,.04,.3] break-open clack | The biggest sound in the game. The 2nd barrel is pitched 6% lower. |
| beanbag | 1200,1,.04,.45 | 600,.25,.5 | sine,120,60,.1,.4 | 400,.3,.1 | pump pitched +10% | Dull thoomp. Impact plays a low "whump" (lp 300 noise .1 s). |
| rifle | 3500,1.4,.025,.55 | 3000,.12,.5 | sine,140,40,.1,.3 | 1200,.45,.14 | none | Tight snap, good in auto |
| smg | 4200,1.6,.02,.4 | 3500,.07,.35 | triangle,180,60,.06,.2 | 1500,.25,.08 | none | Buzzy rattle |
| hunter | 5000,2,.02,.9 | 2000,.2,.8 | sine,100,30,.2,.55 | 600,1.6,.3,.22,.3 | [.45,2200,.05,.2],[.6,1500,.05,.2] bolt | Supersonic crack, long echo, chk-chk |

#### Specials (what makes each gun distinct beyond numbers)
- **revolver**: `fsa`. The hammer click plays as a "ready" cue when `fireT` ends.
- **nailer**: each hit has a 20% chance to "pin a pant leg", rooting the enemy for 0.6 s (`e.rootT`). Misses leave a nail decal on walls (small dark box, 8 s, capped at 40). It is the only gun whose sound does not alert enemies beyond 6 m.
- **shotgun / beanbag**: shell reload you can cancel. You can top up between shots.
- **double**: there is no pump. Two shots within 0.18 s. If both barrels hit the same target within 0.3 s, they are summed into one `dmgBy` entry, so the double counts as one blast for surrender logic. Its `mag` is 2, so it auto-reloads after the second shot.
- **beanbag** (`nonlethal:true`): `hurtEnemy(e,dmg,'player',{nonlethal:true})` never sets hp below 1. If the hit leaves `hp<maxhp*.6`, the enemy surrenders with 100% chance, even if `triedSurr` is set. That ignores the current `Math.random()<.5`, and on the King it counts as his one chance. Hitting a surrendered enemy with it is never an execution, but costs -1 trust and plays a crew line ("Okay, he gets it."). Tracer color is orange.
- **rifle**: none beyond the pattern. It is the reference automatic.
- **smg**: lowest `move` multiplier, highest held speed, the jog breaks ADS for only 0.08 s (others 0.15). Shares the 9mm pool with the pistol.
- **hunter**: hip-fire is bad on purpose. ADS shows a DOM `#scope` overlay (black radial mask, thin crosshair, view model hidden), with scope sway `pitch += .0015*sin(simT*1.3)`, `yaw += .0012*sin(simT*.9)`. Hold Shift while scoped to steady the sway for 3 s, then it doubles for 2 s (no sprint while ADS anyway). The bolt cycle blocks fire for 0.45 s and kicks the scope out if `CFG.boltOut` (default false). Enemies with a hunter show a 0.8 s red laser line before firing (fairness telegraph).

### A.3 Enemy profiles (`updEnemy` `G` table and `updAlly` `G` table become `NPC_GUNS`)

`[acc, dmg, burst, cooldown, wantMin, wantMax]` (wantMin/Max replace the `shotgun?[3,7]:[7,15]` line):

| gun | enemy | ally (acc,dmg,cooldown) |
|---|---|---|
| pistol | .40, 9, 1, .9, 7, 15 | .50, 24, .75 |
| revolver | .45, 16, 1, 1.3, 8, 16 | .55, 40, 1.1 |
| nailer | .35, 4, 6, 1.0, 3, 8 | not used |
| shotgun | .60, d<8?22:7, 1, 1.4, 3, 7 | .65, d<9?55:16, 1.1 |
| double | .60, d<7?26:8, 2, 1.8, 3, 6 | not used |
| rifle | .34, 8, 3, 1.3, 7, 15 | .42, 18, .35 |
| smg | .30, 6, 5, 1.2, 4, 10 | not used |
| hunter | .55, 24, 1, 2.6, 16, 30 (with laser telegraph) | not used |

### A.4 Rick hands you the carbine (mission 2 intro)

`MISSIONS[1].lend='rifle'`. In `startMission(1)`, if `!SAVE.owned.guns.includes('rifle')`:
1. Set `M.intro={t:0,done:false}`. The clock does not count down while the intro runs (`M.t` frozen) and enemies are not yet alerted (they are idle by default anyway).
2. Rick's ally spawn is moved to 1.6 m in front of the player, facing him. `radio('rick',"Hold up. You're not walking into Birch with a garage pistol.",true)`, then `radio('rick',"Rick's Carbine. Thirty rounds, climbs a little, pull down and to the left. Bring her back clean.")`.
3. A `hold` job of 0.6 s: prompt `Hold E · Take Rick's Carbine`. While Rick holds the gun out, his right arm points the gun at the player handle-first (pose `aim:false`, arm rotation x −1.2) and `equip(rick.dude,'rifle')`.
4. On completion, the rifle goes into slot `p2` (or `p1` if that is empty) for this mission only (`M.lent=['rifle']`) and is auto-swapped to with its equip animation. `banner("RICK'S CARBINE","On loan from Coach Rick",2.4)`. Rick: "I've got a spare. Don't tell Denise." `snd('reload')`. The clock starts.
5. If the player hasn't taken it after 8 s, it is handed over automatically (same result).
6. On an M2 win, the result card adds: *Coach Rick: "Keep the carbine. Clean it Sundays."* Then `owned.guns.push('rifle')`, banner "New in your gun locker". On a loss or a retry, it stays on loan and the next attempt skips steps 2-5 (the gun is simply in the slot).

---

## B) Pickups

### B.1 Typed enemy guns per mission
Add `MISSIONS[i].arms` as weighted gun tables. Replace the random gun choice in `spawnEnemy(x,z,boss)` with `pickW(M.def.arms)`. Keep the `shotgunner` hp of 90 for `shotgun`/`double`. The `look` (hoodie vs punk model) stays random.

| mission | `arms` | boss |
|---|---|---|
| 0 Gary (chop shop) | pistol 50, nailer 25, shotgun 25 | |
| 1 Rick (duplex) | pistol 40, smg 35, shotgun 25 | |
| 2 Dave (park waves) | smg 30, rifle 30, double 20, pistol 20 | |
| 3 Doug (compound) | rifle 35, smg 25, double 15, revolver 15, hunter 10 (yard `E`s outside the house only) | King: `revolver` with `look.gold=1` (gold material) |

### B.2 Pickup entities
```js
L.pickups=[]  // {id, gun, mag, ammo:{type,n}, x, z, mesh, born, src:'drop'|'surrender'|'swap'|'crate', owner:e|null, confiscated:false}
```
- **Death drop**: `killEnemy(e)` spawns `{gun:e.gun, mag:ceil(W.mag*rand(.3,1)), ammo:{type,n:W.mag}}` at the body, tossed 0.6 m along the shot direction. The mesh is `makeGun(gun)` lying flat (rot z = π/2), with a floating rotating ring (radius .45, 0xffc94a, opacity .35) and a bob of 0.05 m.
- **Surrender drop**: `surrender(e)` already calls `equip(e.dude,null)`. It now also spawns the pickup at the enemy's feet with `src:'surrender', owner:e`.
- **Cuffing confiscates**: when `near.state='cuffed'`, if that enemy's surrender pickup still exists, it is marked `confiscated`. It stays as a pickup, but the armory has already counted it (+1), and on cuff it adds +1 mag of its ammo type to the player's pool if that type is carried. The prompt subtitle shows "Confiscated: The Carpool". It also counts toward the payout (`M.confiscated++`).
- **Ammo drop**: 25% of deaths and cuffs also drop a small typed ammo box (`src:'crate'`, color by ammo type: 9mm yellow, 12ga red, 556 green, 308 blue, 357 grey, nails silver). Walking within 1.2 m auto-collects it, but only if the player carries that ammo type. Otherwise the box stays.
- **Existing `a` tiles** become "Dad's Ammo Bag": +2 mags for each ammo type carried (same as today, per type now).

### B.3 Interaction
Priority in `updMission`: zip-tie > hold job (packages, stash, Rick's carbine) > pickup. The nearest pickup within 1.6 m that is also in front (dot product > 0.3) is the candidate.
- Same gun already carried: tap E, `E · Take ammo (+32 9mm)`, which adds that pickup's `mag+ammo.n` to the pool (capped at `AMMO.cap`) and removes the pickup.
- Different gun: hold E for 0.5 s, `Hold E · Swap Garage Pistol for The Carpool` (progress bar via `setPrompt(t,p)`). Which slot it replaces:
  - a sidearm replaces `side`;
  - a primary replaces the currently held slot if it's a primary, otherwise the first empty primary slot, otherwise `p1`. The prompt always names the gun that will leave.
  - If the target slot is empty, nothing leaves and the prompt is `Hold E · Take The Carpool`.
  - The dropped gun becomes a pickup (`src:'swap'`) with its current mag, so the swap can be undone.
- The mission loadout is temporary. At mission end, `SAVE.loadout` is restored. Picked-up guns are not kept unless the armory unlocks them (B.5).

### B.4 Despawn rules
- At most 14 pickups per level. When over the cap, remove the oldest non-confiscated pickup that is more than 10 m from the player.
- Lifetime 60 s from `born`. It blinks during the last 5 s (`visible` toggles at 8 Hz). It does not expire while within 6 m of the player. `src:'swap'` pickups never expire, so the player can always get their gun back.
- Every pickup is cleared at `buildLevel` (`L` is rebuilt). There are no pickups in the hub or at home.

### B.5 Armory collection
`SAVE.armory={seen:{gun:count}}`. Each **distinct enemy** counts once: the first time the player either picks up that enemy's gun (any `src` except `swap`) or confiscates it. Unlock thresholds: nailer 1, revolver 1, hunter 1, smg 2, double 2. pistol/shotgun/rifle/beanbag are never unlocked by pickups. When a threshold is hit: `banner('ARMORY','The Carpool added to your gun locker',2.4)`, `owned.guns.push(id)`, `SAVE.events.push('armory')`. The locker card shows `Collected 1/2` for guns still locked.

### B.6 Loadout
`SAVE.loadout={side:'pistol', p1:'shotgun', p2:null}`. Keys 1/2/3 map to `SLOT_KEYS` (an empty slot does nothing). Q and the wheel cycle through filled slots. HUD `#wK` shows three slots, `1 Garage Pistol · 2 Grandpa's Pump · 3 —`, with the active one highlighted. In hub and home, the weapon is holstered (current `mode==='mission'` checks stay). `fillAmmo()` gives each carried ammo type `max(W.reserve)` over the guns that use it, plus each gun a full mag.

`openBrief()` meta row "Guns" becomes `Loadout: Garage Pistol · Grandpa's Pump` plus `· Rick lends: Rick's Carbine` when `m.lend` is set and the gun is not owned. Add the hint line *"Change your loadout at the gun locker in your garage."*

---

## C) Home

### C.1 Hub changes (`HUB` IIFE)
- Your house is the block at tiles x17-21, z11-13 (right next to Gary's marker `1` at (13,10), 4 tiles from the start `P` (15,9)). In the placement list `[[c,x,z]...]`, add `['H',19,10]` (door trigger, front lawn) and `['R',25,4]` (hardware store door). Add `H:'g', R:'g'` to `under`.
- `buildLevel` house loop: if any tile directly north of the block (`g[z-1][x..x1-1]`) is `H`, then the door goes on the north face (`fz=back`), the color is fixed to `#e8d9b0`, a mailbox is added (`box(.3,1.1,.3)` + sign "THE DADS"), and `lvl.homeDoor={x:tileC(19),z:tileC(10)}`. If a block's south front tile is `R`, it becomes the hardware store: color `#b3412f`, a canvas-texture sign "MAPLE HARDWARE & SPORTING" (2.6×.6 box over the door), a striped awning, `lvl.store={x,z}`.
- `updHub`: when not driving, within 1.8 m of `homeDoor`, show `E · Go inside` and call `enterHome()`. Within 1.8 m of `store`, show `E · Maple Hardware` and call `openShop('hardware')`. Talk prompts have priority, as they do today.
- `enterHub(opts)`: `opts.at==='home'` puts the player at `homeDoor` +1 tile north (z−2 m), facing north (`P.yaw=0`), instead of `L.start`. Everything else is unchanged.

### C.2 Interior level `HOME`
22×22 tiles (44×44 m including the yard). North wall = front of the house = street side, which matches the hub door on the north face.

```
x→          1111111111222
  0123456789012345678901
0 ##ZZZZ#######O########   Z = roll-up garage door (solid), O = front door (exit)
1 #,,,,,,#wwwwwPwwwwwww#   P = spawn just inside the front door
2 #,,,,,,#wwwwwwwwwwwww#   x1-6 garage (concrete ',')
3 #L,,,,,wwwwwwwwwwwwww#   L = gun locker; (7,3) garage <-> living door
4 #L,,,,,#wwwwwwwwjwwww#   j = Maddie's anchor (by the TV wall)
5 #,,,,,,#wwwwwwwwwwwww#   x8-20 z1-7 living room (wood 'w')
6 #,,,,,,#wwwwwwwwwwwdw#   d = Biscuit's dog bed
7 #,,,,,,#wwwwwwwwwwwww#
8 #W,,,,,###ww#####w####   W = workbench; openings (10-11,8) and (17,8)
9 #W,,,,,#FkkkkYwwwwwww#   F = fridge, Y = laptop desk ("Dadazon")
10#,,,,,,kkkkmkkwwwwwww#   (7,10) garage <-> kitchen door; m = Jen's anchor
11#,,,,,,#kkkkkkwwwwwww#   x8-13 kitchen ('k' tile), x14-20 dining ('w')
12#,,,,,,#KKKKkkwwwwwww#   K = counters/stove
13##########w#####ww####   back door (10,13), sliding door (16-17,13)
14fggggggggggggggggggggf   backyard, fence 'f'
15fggggggggggggggggggngf   n = doghouse
16fgggqggggggggggggggggf   q = grill
17fggggggggggggggggggggf
18fgggggggggggJggggggggf   J = Tyler's anchor
19fggggggggggggggggggggf
20fggggggggggggggggggggf
21ffffffffffffffffffffff
```
Raw `map` rows (validated: all 22 chars wide):
```js
const HOME={id:'home',type:'home',pad:'#',floor:'w',inside:'w',wall:'#e9e1d2',
 under:{O:'w',P:'w',m:'k',j:'w',d:'w',J:'g',L:',',W:',',F:'k',K:'k',Y:'k',q:'g',n:'g',Z:','},
 map:["##ZZZZ#######O########","#,,,,,,#wwwwwPwwwwwww#","#,,,,,,#wwwwwwwwwwwww#","#L,,,,,wwwwwwwwwwwwww#",
 "#L,,,,,#wwwwwwwwjwwww#","#,,,,,,#wwwwwwwwwwwww#","#,,,,,,#wwwwwwwwwwwdw#","#,,,,,,#wwwwwwwwwwwww#",
 "#W,,,,,###ww#####w####","#W,,,,,#FkkkkYwwwwwww#","#,,,,,,kkkkmkkwwwwwww#","#,,,,,,#kkkkkkwwwwwww#",
 "#,,,,,,#KKKKkkwwwwwww#","##########w#####ww####","fggggggggggggggggggggf","fggggggggggggggggggngf",
 "fgggqggggggggggggggggf","fggggggggggggggggggggf","fgggggggggggJggggggggf","fggggggggggggggggggggf",
 "fggggggggggggggggggggf","ffffffffffffffffffffff"]};
```
`buildLevel` legend additions (new chars, none clash with the current legend):

| char | meaning | solid | build |
|---|---|---|---|
| `w` | wood floor | no | `COL.w='#a77d52'` (with PBR: `tex/woodfloor_*`) |
| `k` | kitchen tile | no | `COL.k='#d8d4cc'` (checker stroke like `.`) |
| `O` | front door, exit | no (doorway) | door slab 1×2.1 m in the wall gap, `lvl.exitDoor` |
| `Z` | garage roll door | yes | `box(TILE,3,.15,'#dcdcdc')` + horizontal ribs |
| `L` | gun locker | yes | `box(1.2,2,.6,'#3b4a3a')` against the wall, `lvl.locker[]` |
| `W` | workbench | yes | `box(1.8,.9,.8,'#7a5a3a')` + pegboard, `lvl.bench[]` |
| `F` | fridge | yes | `box(.9,1.9,.8,'#eeeeee')` + magnets (kids' drawings as colored quads) |
| `K` | counter/stove | yes | `box(TILE,.95,.7,'#efe9dc')`; stove top on the tile with the largest x |
| `Y` | laptop desk | yes | desk `box(1.4,.75,.7)` + laptop with an emissive screen, `lvl.laptop` |
| `q` | backyard grill | yes | reuse the `Q` grill mesh **without** the bounce house; `lvl.homeGrill` |
| `n` | doghouse | yes | box + gable cone, sign "BISCUIT" |
| `m j J d` | family anchors | no | `lvl.anchors[ch]={x,z}` |

- Add `'ZLWFKYqn'` to `SOLID` (and `LOSBLOCK`). Interior walls `#` keep 3.2 m. There is no roof, so the third-person camera boom and sun shadows keep working. `def.id==='home'`: fog 30-90, background `0xcfe3ef`, plus one warm `PointLight(0xffe0b0,.6,18)` per room center (4 lights, `castShadow=false`).
- `f` on vertical runs (x=0, x=21): rotate the fence box 90° when the tile's north/south neighbor is also `f`. This fixes a latent bug that the hub `f` also has. The collider is resized to match.
- Windows: optional cosmetic quads on the exterior walls; no gameplay effect.

### C.3 `enterHome()` / `exitHome()`
```
enterHome(): mode='home'; M=null; clearChars(); buildLevel(HOME); makePlayer(); placeSavedFurniture(); spawnFamily();
  P.pos=lvl.start; P.yaw=Math.PI (facing into the house, south); holster (vm.visible=false); engine(false);
  deliverPending(); setObj('Home',[homeObjLine()]); familyGreet(); saveGame(); running=true
exitHome(): saveGame(); enterHub({at:'home'})
```
`homeObjLine()` = "Gun locker in the garage · Dadazon on the kitchen desk" on the first visit, then the next job's giver name (same as the hub text).

`updHome(dt)`: player movement uses `updPlayer` (no firing because `mode!=='mission'`). Prompts, nearest one within 1.6 m wins:
- `O`: `E · Head outside` → `exitHome()`
- `L`: `E · Gun locker` → `openLocker('loadout')`
- `W`: `E · Workbench` → `openLocker('attach')`
- `Y`: `E · Dadazon` → `openShop('dadazon')`
- `q`: `E · Flip burgers` → sizzle (`snd` lowpass noise 1.5 s), Jen line `idle[0]`, 30 s cooldown
- family member: `E · Talk to Jen/Maddie/Tyler`; dog: `E · Pet Biscuit`
- `B`: enter decorate mode (also a button on the Dadazon card)

### C.4 Gun locker card (`#cLocker`, same `.card` markup as `#cBrief`)
```
who: "Garage · Gun locker"      h2: "Pick your loadout."
three slot rows:  Sidearm [Garage Pistol ▾]  Primary 1 [Grandpa's Pump ▾]  Primary 2 [— ▾]
grid of gun tiles (all 9): name, slot tag, five 0-10 stat bars, state line
   owned → button "Equip" (goes into the matching slot; for primaries, the focused primary row)
   locked → greyed, hint "Collected 1/2 · or $900 at Maple Hardware" / "Coach Rick has this one"
tab 'attach' (from the workbench): per owned gun, the 4 slot toggles for owned compatible attachments
buttons: [Done] (primary), Esc closes
```
Stat bars, normalized 0-10 across the arsenal: Damage = `dmg*pellets*head^.3`; Rate = `1/rate`; Range = `fall[1]`; Handling = `1/(ads.t+equip)`; Mobility = `speed*ads.speed/spread.move`. Rules: the same gun can't be in both primary slots, `side` must be a sidearm, `p1` must be non-empty. Changes are written to `SAVE.loadout` and saved at once. Keyboard: the existing Tab trap in the keydown handler works because the card uses `button`/`select`.

### C.5 Family NPCs (never on raids)
`FAMILY` (separate from `HOMIES` so `spawnAlly` can never pick them):
```js
const FAMILY={
 jen:{name:'Jen',role:'spouse',model:'family/jen.glb',look:{shirt:'#c25b7a',pants:'#3a4150',hair:'#6b3e26',skin:'#e8b996'},anchor:'m',likes:['kitchen','sofa','dining','grill','yard']},
 maddie:{name:'Maddie',role:'kid',age:13,scale:.84,model:'family/maddie.glb',look:{shirt:'#4a8a7a',pants:'#2a2a2a',hair:'#3a2c20'},anchor:'j',likes:['sofa','tv','beanbag','yard','dining']},
 tyler:{name:'Tyler',role:'kid',age:8,scale:.68,model:'family/tyler.glb',look:{shirt:'#e5a83a',pants:'#47607a',shorts:1,cap:'#2f5d9e'},anchor:'J',likes:['yard','trampoline','tv','beanbag','garage']},
 biscuit:{name:'Biscuit',role:'dog',anchor:'d',likes:['dogbed','player','yard','doghouse','kitchen']}};
```
- Models: if `assets/family/*.glb` exists, use it through the overhaul's glTF character loader (Quaternius Ultimate Modular **Female/Casual** for Jen, **Female/Adventurer** at scale .84 for Maddie, **Male/Beach** at .68 with the head bone scaled 1.15 for Tyler; same rig as `chars/dad_casual.glb`, so they reuse its clips). Otherwise use `makeDude(look)`. The dog is procedural: `makeDog()` builds a body box .75×.35×.3, a head, ears, 4 legs that swing with `walk`, and a tail with `rotation.y=sin(t*14)*.6` while happy. Golden color `#d9a45b`.
- Routines (`updFamily(f,dt)`, state machine): `idle(2-6 s) → pickPOI → walk → (sit|act)(6-15 s) → idle`. POIs: anchors + placed furniture with tags `seat`, `tv`, `play`, `dogbed` + room centers (`kitchen`, `dining`, `yard`, `garage`). Weighted by `likes` (3× for a liked tag, 1× otherwise). A POI that someone else is using is skipped. Pathing uses `nextStep` on the HOME grid with furniture tiles marked solid (C.6). Speeds: adults 1.6 m/s, kids 2.2 (Tyler sometimes runs at 3.5), dog 2.8.
  - `sit`: play the `Sit`/`Sitting` clip if the glTF has one, otherwise lower the root .45 m with legs rotated −1.4 rad. The member faces the furniture's facing direction.
  - `act`: Jen "cooks" at a `K` (arm bob), Tyler bounces on the trampoline (y = |sin|·.6), Maddie "phones" (arm raised to head), the dog sniffs (head down).
  - Dog: 40% of decisions are "follow the player" (keeps 1.5-3 m, sits when the player stops). On mission return it runs to the front door.
  - When the player is within 3 m, a member turns to face them (`faceTo`, rate 3). A floating name tag uses the existing `.tag ally` class.
- Never on raids: `startMission` never reads `FAMILY`. `clearChars()` also removes `family[]`. `spawnFamily()` returns early unless `mode==='home'`. Test L3-6 asserts this.

### C.6 Contextual lines
On entering home, `SAVE.events` (pushed by `endMission`, purchases, armory) picks the **greeting**. The first family member to reach the player (Jen if present, else the dog) delivers it through `radio(name,text)`. Pressing E on a member gives that member's next line from the highest-priority non-exhausted pool: `firstVisit > lastEvent > trustBand > idle`. Lines are not repeated until a pool is exhausted (`SAVE.family.seen` holds the used line ids). After it is shown, the event is consumed. Dog lines appear as italic subtitles with `radio('Biscuit', ...)`; the `<b>` name renders as "Biscuit".

Key: `who|text`.
```js
const FAMILY_LINES={
 firstVisit:[
  "jen|You're home! Did you remember the milk? You didn't. That's okay. Go save the neighborhood.",
  "jen|Gun locker's in the garage, laptop's on the kitchen desk, and the credit card has a limit. A real one.",
  "maddie|Dad, the Wi-Fi is slow again. Can you do the thing where you unplug it and plug it back in?",
  "tyler|Is it true you're in a gang now? Mom said 'neighborhood watch' and did the air quotes."],
 win:[
  "jen|You smell like a chop shop. Shower first, then tell me everything.",
  "tyler|Did you win? Did you do a cool jump? Tell me about the jump.",
  "maddie|Coach Rick posted a photo of you guys. You're all doing the dad squint.",
  "tyler|Can I see your zip-ties? I just want to hold one. I won't zip anything.",
  "maddie|My friends' dads are doing this now. It's, like, a trend. Please stop.",
  "jen|I'm proud of you. Also the lawn is still a foot tall. Both things are true."],
 win_gary:["jen|Mrs. Patel called. She cried. Then she sent a casserole. We have four casseroles now."],
 win_rick:["tyler|Coach Rick gave you his GUN? He won't even let me hold the orange cones."],
 win_dave:["jen|Dave sent home a whole brisket. I'm not saying I married the wrong guy. I'm saying I get it."],
 win_doug:["jen|The Porch Pirate King is coaching T-ball? The Hendersons' kid is on that team!",
           "jen|Doug says it's over. Doug also says the mailman is 'suspicious.' But I believe him this time."],
 fail:[
  "jen|Hey. You came home. That's the part that counts. Ice pack's in the freezer.",
  "tyler|It's okay, Dad. I lose at go-kart games all the time and I'm still pretty great.",
  "maddie|I made you a playlist. It's called 'Dad Tried His Best.' It's mostly songs about highways.",
  "jen|Rick called. He said 'we regroup at halftime.' I assume that means dinner.",
  "jen|Sit. Eat something. Then go back and finish it. In that order."],
 trustHigh:[   // prog.trust >= 70
  "jen|Somebody returned our recycling bin. Washed. With a thank-you note.",
  "maddie|Mr. Henderson waved at me. He has never waved. At anyone.",
  "tyler|I left my bike on the lawn all day and it's STILL THERE.",
  "jen|The block party committee wants you to give a speech. I said you'd bring chairs instead.",
  "maddie|Doug put the binoculars away. Well. Mostly away."],
 trustLow:[    // prog.trust < 30, or shotSurr went up since the last visit (that pool goes first)
  "jen|When they put their hands up, honey, you use the zip-ties. That's the whole point.",
  "maddie|Kids at school say you guys are scary. Are you? You're not. Right?",
  "tyler|Mrs. Patel crossed the street when she saw our van.",
  "jen|We said 'second chances' at the HOA meeting. Let's mean it.",
  "jen|I want the neighbors to feel safe. Not scared of us. Okay?"],
 boughtGun:[
  "jen|Another gun? Is that the one with the little red light? Babe.",
  "tyler|Can I name it? I'm naming it Gerald.",
  "jen|Locked in the locker, key on your keyring, not on the hook. I'm watching you."],
 boughtFurniture:[
  "jen|A new couch? Okay. I love it. I'm annoyed that I love it.",
  "maddie|First decorating choice you've made since 2011. I'm honestly proud.",
  "tyler|Can the trampoline go in the living room? Just asking. As a question.",
  "jen|Where's the old one going? Don't say the garage. The garage is full of dad."],
 boughtAttachment:[
  "tyler|A muffler for a gun? Like the van? Does it make it go faster?",
  "jen|You'll put a little red dot on your gun but you won't fix the porch light."],
 idle:[
  "jen|Burgers tonight? You grill, I judge.",
  "tyler|Dad, what's a chop shop? Is it for pork chops?",
  "maddie|Can I borrow twenty dollars? For a reason. A good one.",
  "jen|Gutters. Before the next raid. I'm serious."],
 dog:[
  "biscuit|*Biscuit brings you one sock. Not a pair. Just the one.*",
  "biscuit|*Biscuit rolls over. Belly up. Total trust. The neighborhood could learn something.*",
  "biscuit|*Biscuit sniffs your boots for a long time. He's reading the whole mission report.*",
  "biscuit|*Biscuit sits perfectly, looks at the treat jar, then you, then the jar.*",
  "biscuit|*Biscuit leans his full weight on your legs. You are not going anywhere.*",
  "biscuit|*Biscuit does zoomies around the grill. Nobody is safe. Everybody is happy.*",
  "biscuit|*Biscuit growls at the gun locker. He has never forgiven the Garage Pistol.*"]};
```
Total: 47 lines. Pool selection for a member: filter the pool by `who`. If that member has no line in the pool, fall through to the next pool. The dog only ever uses `dog`, and each pet also plays its happy tail animation, a sit, and `SAVE.family.pets++`.

---

## D) Economy

### D.1 Payout (`computePayout(M, ok)` → `{lines:[[label,amount]], total}`)
Base pay comes from the "Neighborhood Watch fund (bake sale proceeds)": gary 400, rick 550, dave 700, doug 1000.

| line | rule | amount |
|---|---|---|
| Bake sale fund | `ok` | base |
| Second chances | each zip-tie `M.cuffs` | +$60 |
| Guns turned in to Officer Dana | each confiscation `M.confiscated` | +$25 |
| Nobody pulled a hamstring | `ok` and `M.allyDowns===0` (count in `hurtAlly` when `down` flips) | +$150 |
| Returned packages (Gary) | `M.got` | +$30 each |
| Clock bonus (Rick) | `ok`, `max(0,M.t)` seconds left | +$3/s, rounded |
| Quick work (Gary, Dave, Doug) | `ok`, `M.elapsed < par` (300/240/300 s) | +$100, or +$50 under 1.5×par |
| King's bail refund (Doug) | `M.bossDone==='cuffed'` | +$500 |
| Legal fees | each execution during this mission (`M.exec`, incremented with `prog.shotSurr`) | −$200 |
| Trust multiplier | applied to the positive subtotal before penalties: `×(0.8+trust/250)` (12% → ×0.85, 100% → ×1.2) | shown as "+$x Neighbors chipped in" or "−$x Neighbors are nervous" |
| Gas money (failed run only) | `!ok`: no base, no clock/quick bonus | +$40 |
| Rerun (L4 optional) | a completed mission replayed from its giver ("Run it again · half pay") | base ×0.5, bonuses ×0.5 |

`total=max(0, round)`. Rough totals for a clean campaign are $4.5k-$6.5k, enough for about two guns, most attachments and a decorated living room. Reruns fill the rest.

### D.2 Result card (`endMission`)
Add to the `.meta` grid, after Trust: `<b>Payout</b><span>$1,240</span>`. Below the meta, add `<div class="pay">` listing each line as `<div><span>Second chances ×3</span><b>+$180</b></div>`, with negatives in the `warn` color. Then `SAVE.cash+=total`, `SAVE.stats.earned+=total`, `SAVE.events.push(ok?'win_'+m.giver:'fail')`, and `saveGame()`. The result button text changes to `Head home` (calls `enterHome()`), and a ghost button `Back to the cul-de-sac` keeps the current behavior. Cash is shown in the `#trust` HUD panel as a second row `Cash · $1,240` in hub and home.

### D.3 Shops (`#cShop`, one card, two flavors)
`openShop(store)`: `store==='dadazon'` (laptop at home) or `'hardware'` (hub store door). Tabs: **Guns · Attachments · Furniture · Ammo** (Ammo only at hardware). Each item row shows name, a one-line joke blurb, the concrete stat effect, the price, and a button `Buy` / `Owned` / locked reason.
- **Dadazon**: every category. Delivery: purchases go into `SAVE.pending` and arrive the next time you enter home after a mission or a hub visit ("Your Dadazon order has arrived. Biscuit has opened it."). Free shipping, no discount. Furniture bought here goes straight into the decor inventory on delivery.
- **Maple Hardware & Sporting**: immediate. **Neighbor discount 10%** when `prog.trust>=60` (a "Neighbor discount" chip). This is the only place that sells boxes of ammo between missions (they're auto-refilled at mission start anyway, so this is flavor: buying "Range day" gives +1 extra mag of every type at the next mission start, $40).
- Gun purchase rules: shown only once its `unlock.buyAfter` condition holds (`prog.done[i]`, trust ≥ 40 for the beanbag). Before that, the row shows "Back-ordered until …". Armory-unlocked guns show `Owned (collected)`.

### D.4 Attachments
Bought once, they unlock for every compatible gun. Toggle per gun at the workbench (`SAVE.attOn[gun]={optic,mag,under,muzzle}`). Effects multiply into `attMul` inside `weaponStats(id)`, which returns the effective stats. Everything reads stats through it.

| id | name | slot | price | stat effects | compatible |
|---|---|---|---|---|---|
| `reddot` | Red Dot ("Like a laser pointer, but for responsibility") | optic | $300 | ADS spread ×0.75, ADS time ×0.9, ADS zoom becomes 0.82 for guns whose zoom was <0.82 (less tunnel vision), adds a red dot mesh on the view model | pistol, revolver, shotgun, beanbag, rifle, smg |
| `extmag` | Extended Mag ("For the dad who overpacks") | mag | $220 | mag ×1.5 (rounded: pistol 18, rifle 45, smg 48, nailer 60), reload time ×1.15, ADS time ×1.1, equip +0.05 s | pistol, nailer, rifle, smg |
| `grip` | Foregrip ("Firm handshake") | under | $180 | vertical recoil ×0.75, horizontal ×0.7, hip spread ×0.9, equip +0.05 s, held move speed −0.01 | shotgun, beanbag, rifle, smg |
| `muffler` | The HOA-Approved Muffler (suppressor) | muzzle | $450 | sound `muffled`, enemy hearing radius 8→3 m and line-of-sight hearing 26→10 m in `fire()`'s alert loop, damage ×0.92, fall far ×0.85, no muzzle-flash light, allies say "Nice and quiet." once | pistol, rifle, smg, hunter |

### D.5 Furniture catalog and decorating
The decor grid is **1 m cells** (2 per tile). The footprint is given in cells as w×d before rotation, with tiles in parentheses. `zone`: `in` (interior floor `w`/`k`/`,`), `out` (backyard `g`), `any`. `tags` feed family POIs. Models come from Poly Haven (CC0, ids verified on api.polyhaven.com). `proc` means built from boxes in code.

| id | name | price | footprint cells (tiles) | zone | tags | model |
|---|---|---|---|---|---|---|
| `sofa` | Sectional of Peace | $650 | 3×1 (1.5×0.5) | in | seat×2, tv-facing | `Sofa_01` |
| `armchair` | The Thinking Chair | $280 | 1×1 (0.5×0.5) | in | seat | `ArmChair_01` |
| `rocker` | Grandpa's Rocker | $240 | 1×1 | any | seat | `Rockingchair_01` |
| `coffeetable` | Coffee Table (coaster-mandatory) | $160 | 2×1 (1×0.5) | in | | `CoffeeTable_01` |
| `tv` | 65-inch TV & Stand | $900 | 2×1 | in | tv | proc (black slab + emissive screen showing a canvas "football") |
| `bookshelf` | Bookshelf of Unread Books | $220 | 2×1 | in | | `wooden_bookshelf_worn` |
| `dining` | Dining Table | $480 | 2×2 (1×1) | in | dining | `dining_table` |
| `chair` | Dining Chair | $90 | 1×1 | in | seat | `dining_chair_02` |
| `beanbag` | Bean Bag | $70 | 1×1 | in | seat (kids) | proc (squashed sphere) |
| `rug` | Big Area Rug | $90 | 3×2 | in | layer:floor (can be under other items) | proc (plane, canvas stripe pattern) |
| `plant` | Fiddle-Leaf Fig (will die) | $45 | 1×1 | any | | proc |
| `shelves` | Steel Garage Shelving | $150 | 2×1 | in | | `steel_frame_shelves_01` |
| `toolcart` | Rolling Tool Cart | $120 | 1×1 | in | | `tool_cart` |
| `minifridge` | Beverage Fridge | $300 | 1×1 | in | garage | proc |
| `picnic` | Picnic Table | $350 | 2×2 | out | seat×2, dining | `wooden_picnic_table` |
| `patio` | Patio Set | $420 | 2×2 | out | seat×2 | `outdoor_table_chair_set_01` |
| `firepit` | Fire Pit | $380 | 2×2 | out | gather | `stone_fire_pit` |
| `trampoline` | Trampoline | $550 | 3×3 (1.5×1.5) | out | play | proc (ring + net) |
| `dogbed` | Orthopedic Dog Bed | $60 | 1×1 | any | dogbed | proc |
| `flamingo` | Lawn Flamingo | $15 | 1×1 | out | (Jen hates it: unique line) | proc |

**Starter layout** (free, `SAVE.furniture.placed` default): `sofa` at cell (22,8) r0, `coffeetable` at (22,10) r0, `armchair` at (28,9) r3, `dining` at (34,20) r0, `chair` ×2 at (33,20) r1 / (36,20) r3, `dogbed` at (36,12) r0 (a dogbed may also cover the `d` anchor; it is the one exception to the anchor rule), `picnic` at (20,32) r0. All are verified valid by the rules below (test L4-3 checks this).

**Decorate mode** (`mode` stays `'home'`, `D.on=true`): it opens from the Dadazon card button "Decorate" or the `B` key. HUD shows `#decor` with the inventory strip of owned-but-unplaced items plus a "Placed" toggle.
- Ghost: cast a ray from the camera forward to the plane y=0, max 9 m. Snap to the 1 m cell. The footprint is anchored at its min corner, and rotation `r∈{0,1,2,3}` (×90°) swaps w/d for odd r. The ghost is the item mesh cloned with `MeshBasicMaterial({transparent:true,opacity:.45,color: valid?0x6fdc7a:0xe05050, depthWrite:false})`.
- Controls: left click or `E` places, `R` rotates, `Tab`/wheel cycles the selected item, `X` or right-click removes the hovered placed item back to inventory (hovered = ray hit on placed meshes, red outline), `Esc` exits. Touch: the existing `tFire` places, `tUse` rotates, `tSwap` cycles.
- Validity, all of which must pass:
  1. Every footprint cell lies on a tile whose char is in the zone set (`in`: `w k ,`; `out`: `g`; `any`: both). `#`, `f`, solid fixtures and `O` are never valid.
  2. Reserved cells: the cells of any door tile (`O`, the wall gaps at (7,3), (7,10), (10,8), (11,8), (17,8), (10,13), (16,13), (17,13)), plus every non-solid cell 4-adjacent to them, plus the cells in front of `L W Y F q` (the tile on the open side), plus the anchor tiles `m j J d`.
  3. No overlap with placed items, unless one of them is `layer:floor`.
  4. Not within 0.5 m of the player or a family member's current position.
  5. Connectivity: after placement, a BFS over **cells** from the front-door cell must still reach the locker, workbench, laptop, back door and slider cells. This prevents boxing yourself in.
- Collision: each placed non-floor item adds an AABB collider (`L.colliders`) and its meshes to `L.solids`. A tile is marked non-walkable for pathing (`L.g` set to `'u'`, add `u` to `SOLID`, but not to `LOSBLOCK` for items under 1.2 m tall) when ≥2 of its 4 cells are occupied. Removing an item restores the tile char from a saved copy of `L.g`.
- Every place or remove action calls `saveGame()`.

---

## E) Save (`localStorage['ht-save']`, separate from `ht-cfg`)

```js
const SAVE_V=1;
const SAVE_DEFAULT=()=>({v:1, t:0,
  prog:{done:[false,false,false,false],trust:12,cuffed:0,downed:0,shotSurr:0,missionsRun:0},
  cash:0, stats:{earned:0,spent:0},
  owned:{guns:['pistol','shotgun'], att:[]},
  attOn:{},                                   // {rifle:{optic:'reddot',mag:null,under:'grip',muzzle:null}}
  loadout:{side:'pistol',p1:'shotgun',p2:null},
  armory:{seen:{}},                           // {smg:1}
  pending:[],                                 // [{kind:'gun'|'att'|'furn', id}]
  furniture:{owned:{}, placed:[/* starter layout */]},   // owned:{sofa:2}; placed:[{uid,id,x,z,r}] in cells
  family:{firstVisit:true, seen:[], pets:0, lastShotSurr:0},
  events:[],                                  // ['win_gary','boughtGun',...] consumed at home
  flags:{rangeDay:false, beanbagGift:false}
});
let SAVE=loadGame();
function loadGame(){let s=null;try{s=JSON.parse(localStorage.getItem('ht-save')||'null')}catch(e){}
  if(!s||typeof s!=='object')return SAVE_DEFAULT();
  s=migrate(s); return deepMerge(SAVE_DEFAULT(), s);}   // defaults fill missing keys
const MIGRATIONS={ /* 1:s=>{...; s.v=2; return s} */ };
function migrate(s){if(!s.v)s.v=1; while(s.v<SAVE_V&&MIGRATIONS[s.v])s=MIGRATIONS[s.v](s); if(s.v>SAVE_V)return SAVE_DEFAULT(); return s}
function saveGame(){SAVE.t=Date.now(); SAVE.prog={...prog}; try{localStorage.setItem('ht-save',JSON.stringify(SAVE))}catch(e){}}
```
- `prog` stays the live object the code already uses. On boot, `Object.assign(prog, SAVE.prog)`. `saveGame()` copies it back.
- Validation in `loadGame`: drop unknown gun ids from `owned`/`loadout`, force `loadout.side` to an owned sidearm (fallback `pistol`), clamp `cash>=0`, drop `placed` entries that fail validity (C/D.5 rules) when home is next built, and refund them to the inventory.
- Saved on `endMission`, every purchase, locker changes, decor place/remove, `enterHome`, `exitHome`, and `finale`.
- **Pause menu**: add `<button class="btn ghost" id="pReset">Reset save</button>`. The first click changes its text to "Really? Tap again" for 3 s. The second click runs `localStorage.removeItem('ht-save')`, `SAVE=SAVE_DEFAULT()`, `Object.assign(prog,SAVE.prog)`, closes pause, `enterHub()`. `ht-cfg` is not touched. Add a "Cash $X · Trust Y%" line in the pause `who` row.
- `finale()` "New Saturday": resets `prog` only (a new-game-plus that keeps cash, guns, attachments and house). The title text on the card says so: "The guys are rested. Your stuff is still yours."
- `__ht` gets `SAVE` (getter), `saveGame`, `loadGame`, `resetSave`.

---

## F) Implementation order (4 layers, each shippable and tested)

Test harness: serve the folder (`npx http-server /home/user/high-trust -p 8123 -s` or `python3 -m http.server`). Run Playwright Chromium headless with `--use-gl=swiftshader`, and `page.evaluate` against `window.__ht`. Each test starts with `localStorage.clear()` unless stated, then calls `__ht.start?.()` or clicks `#bStart`. `__ht.step(n)` advances in fixed 1/30 s ticks. Add these to `__ht` in the layer that introduces them: `mode` (getter), `WEAPONS`, `weaponStats(id)`, `SAVE`, `fire()` (one trigger pull), `aim(bool)`, `swapSlot(k)`, `pickups` (getter), `family` (getter), `enterHome`, `exitHome`, `openShop`, `buy(id,store)`, `decor:{enter,place(id,x,z,r),remove(uid),valid(id,x,z,r)}`, `computePayout`. Every layer also asserts **no console errors** (`page.on('pageerror')`) and that the frame loop survives a 10 s `step(300)` in each mode.

### Layer 1: Weapon core (data and feel)
Scope: the new `WEAPONS`/`AMMO`/`SLOT_KEYS`, per-type ammo pools, `weaponStats()` (no attachments yet: `attMul` = identity), the ADS lerp, the spread formula, recoil pattern + debt recovery, bloom, falloff, shell/tactical/empty reloads, equip time, `gunSnd` recipes, view-model spring, the hunter scope overlay, `NPC_GUNS` (+ enemy laser telegraph), the beanbag non-lethal path, nailer root, procedural `makeGun` shapes for the 6 new guns (pending the overhaul's glTF guns), and the Rick carbine handoff. Loadout comes from a temporary in-memory `SAVE.loadout`.
Tests:
1. Every `WEAPONS` entry has all fields with numeric types. `SLOT_KEYS` maps 1→side. Every `ammo` key exists in `AMMO`.
2. Mag drain: start M0, set `P.cur='pistol'`, call `fire()` 12× with `step(7)` between; `P.ammo.pistol.mag===0` and a reload starts automatically. After `step(45)`, mag is 12 and the 9mm pool dropped by 12.
3. Tactical reload chambering: rifle mag 10 → reload → `mag===31`.
4. Shell reload: shotgun mag 2, reload, `step` for `.35+.5*2`, then `fire()` cancels; `mag` is 4 or 5 and the reload stops.
5. Recoil: rifle, `mouse=true` for 8 shots: pitch rise is in [0.06,0.12] and the yaw drift after shot 7 is positive-right (sign check). After `mouse=false` and `step(30)`, the remaining rise is ≤15% of the peak.
6. ADS: `aim(true)`; after `step(ceil(ads.t*30)+1)`, `P.adsT>=.99` and `camera.fov≈CFG.fov*zoom` (±1°). Hunter ADS makes `#scope` visible.
7. Falloff: `fallMul(WEAPONS.shotgun,30)===0.2`, `fallMul(WEAPONS.rifle,20)===1`.
8. Beanbag: enemy hp 75, 10 direct hits (`hurtEnemy(e,34,'player',{nonlethal:true})`) → `e.state==='surrender'`, `e.hp>=1`, `prog.shotSurr` unchanged.
9. Rick: `localStorage.clear()`, `startMission(1)`; `M.t` unchanged after `step(60)`; hold E (`keys.e=true`, `step(25)`) → loadout slot holds `rifle`, `M.lent` includes it; the clock now decreases.
10. Enemy profiles: spawn one of each NPC gun next to an ally and `step(300)`, no errors, `shootAt` called (spy).

### Layer 2: Pickups and armory
Scope: `MISSIONS[i].arms`, `L.pickups` with drop/surrender/confiscate/ammo-box/swap sources, the interaction priority, hold-E swap prompt text, despawn rules, armory counting + unlock banner, HUD 3-slot keys, brief loadout line.
Tests:
1. In M1, kill an enemy (`hurtEnemy(e,999,'player')`) → one pickup with `gun===e.gun` within 1.5 m of the body.
2. Prompt text: loadout pistol/shotgun/rifle. Teleport the player 1 m in front of a `revolver` pickup → `#prompt` text equals `Hold E · Swap Garage Pistol for The Retirement Plan`. Hold E for 16 ticks → `side==='revolver'` and a `swap` pickup holding `pistol` exists. Holding the shotgun next to an `smg` pickup → `Hold E · Swap Grandpa's Pump for The Carpool` → `p1==='smg'`. With `p2:null` → `Hold E · Take The Carpool` → `p2==='smg'`.
3. Surrender → pickup `src:'surrender'`; cuff → `confiscated===true`, `SAVE.armory.seen[gun]` +1, `M.confiscated===1`; picking up that same pickup later does not count twice.
4. Despawn: a pickup 20 m away is gone after `step(60*30+1)`; one within 6 m is not; a `swap` pickup is never removed; spawn 20 → `pickups.length<=14`.
5. Armory: two distinct smg confiscations → `owned.guns` includes `smg`, banner text contains "added to your gun locker".
6. Mission end restores `SAVE.loadout` (the picked-up gun is not in the hub loadout unless owned).
7. Priority: a surrendered enemy and a pickup both in range → the prompt is `E · Zip-tie`.

### Layer 3: Save, economy, home, family
Scope: `SAVE` + `loadGame/saveGame/migrate` + pause reset; `computePayout` + result card + cash HUD; HUB `H`/`R` tiles + house door orientation + `enterHub({at:'home'})`; the `HOME` level, legend chars, `enterHome/exitHome/updHome`, locker card (loadout + attach tab shell), family spawn/routines/lines/dog, event queue; "Head home" result button.
Tests:
1. Fresh boot: `SAVE.v===1`, `owned.guns` = pistol, shotgun. `saveGame()` → `JSON.parse(localStorage['ht-save']).cash===0`. Write a save with `v:1, cash:500` and a bogus gun in `loadout` → reload the page → cash 500, the bogus gun replaced by `pistol`.
2. Payout: stub `M` `{i:0,cuffs:2,confiscated:1,allyDowns:0,got:4,elapsed:200,exec:0}`, trust 50 → lines include Bake sale fund 400, Second chances 120, Guns turned in 25, hamstring 150, packages 120, quick 100; total = round((400+120+25+150+120+100)×1.0)=915. Execution case: `exec:1` subtracts 200 after the multiplier. Failure: `ok=false` → no base, includes Gas money 40.
3. `endMission(true)` shows `#cResult` containing "Payout" and increments `SAVE.cash`, persisted.
4. Hub door: `enterHub()`; `L.homeDoor` is at world (39,21); teleport there, tap E → `mode==='home'`, `L.def.id==='home'`, the player is at the `P` tile (27,3). Walk to `O`, tap E → `mode==='hub'` and the player is within 2.5 m of the home door.
5. HOME map: every row has length 22; BFS from `P` reaches `L`, `W`, `Y`, `q`-adjacent cells and every anchor.
6. Family: home has 4 family entities. `startMission(0)`: `allies.map(a=>a.id)` has no FAMILY id and `family.length===0`. After `step(900)` at home, each human member visited ≥2 distinct POIs and none is inside a solid collider.
7. Lines: first visit → the first radio line is from `firstVisit`. After a win in M0 → the next home greeting is from `win_gary` or `win`. Lines don't repeat until the pool is exhausted (talk 6× to Jen → 6 distinct texts).
8. Locker: `openLocker()`, choose `p2=rifle` (owned) → `SAVE.loadout.p2==='rifle'`. Assigning `revolver` while not owned fails. Assigning the same gun to p1 and p2 is rejected.
9. Pause reset: click `#pReset` twice → `localStorage['ht-save']` was removed then rewritten as default, `ht-cfg` is still there.

### Layer 4: Shops, attachments, furniture, decorating
Scope: `#cShop` (Dadazon + hardware flavors, tabs, buy rules, discounts, pending delivery); attachments in `weaponStats` + workbench toggles + view-model visuals; furniture catalog, glTF loading with box fallbacks, the starter layout, decorate mode (ghost, rotate, remove, validity, connectivity, colliders, pathing tile marks), the family POIs from furniture tags; optional reruns at half pay; furniture/gun asset files.
Tests:
1. Buy at hardware: cash 1000, `buy('smg','hardware')` after `prog.done[1]=true` → cash 100, owned. Trust 60 → price 810. Before M2, `buy('smg')` is refused with reason "back-ordered".
2. Dadazon: `buy('sofa','dadazon')` → in `pending`, not in `furniture.owned`. `exitHome()` + `enterHub()` + `enterHome()` → delivered, `events` includes `boughtFurniture`, and a family line from that pool is spoken.
3. Attachments: own `grip`, enable on rifle → `weaponStats('rifle').rc.v===WEAPONS.rifle.rc.v*.75`. `extmag` on pistol → mag 18. `muffler` → fire with an idle enemy at 12 m in LOS → it stays unalerted (without the muffler it alerts).
4. Starter layout: every item in `SAVE_DEFAULT().furniture.placed` passes `decor.valid`.
5. Validity: placing `trampoline` on interior cells → false, on yard → true. Placing anything on a door cell → false. Overlap → false, but a `rug` under the `coffeetable` → true. A placement that walls off the locker (fill a 1-cell corridor) → false (connectivity).
6. Collision: place `dining` at a free spot, put the player inside its AABB, `step(1)` → pushed outside. `remove(uid)` → the collider is gone and the tile char is restored.
7. Persistence: place 3 items, reload the page, `enterHome()` → same `uid,x,z,r` and the meshes exist.
8. Budget: the sum of new files under `assets/home`, `assets/family`, `assets/guns2` is ≤ 12 MB, and each file is ≤ 15 MB (Node `fs` walk in the test runner).

---

## Appendix: asset plan (only new files, nothing existing touched)

None of these are required for gameplay. Every model has a box fallback. If they are added, put them in the paths below and append to `assets/CREDITS.md` under new headings. Current assets: `chars/` (6 Quaternius male glbs, ~1.1-1.4 MB each), `tex/` (PBR sets incl. `woodfloor`, `concfloor`, `plaster`), `sky/`. None of them cover furniture, family or new guns, so nothing below duplicates them.

| new path | source | license | processing | est. size |
|---|---|---|---|---|
| `family/jen.glb` | jsdelivr `gh/LuanDucate/Ducz.CharacterCreator@main/public/models/Female/Casual.glb` (Quaternius) | CC0 | `gltf-transform prune`, strip animations (reuse `dad_casual` clips), `dedup` | ~0.6 MB |
| `family/maddie.glb` | same repo `Female/Adventurer.glb` (remove backpack node if present) | CC0 | same | ~0.6 MB |
| `family/tyler.glb` | same repo `Male/Beach.glb` | CC0 | same | ~0.6 MB |
| `home/<id>.glb` ×11 | Poly Haven models `Sofa_01, ArmChair_01, Rockingchair_01, CoffeeTable_01, wooden_bookshelf_worn, dining_table, dining_chair_02, steel_frame_shelves_01, tool_cart, wooden_picnic_table, outdoor_table_chair_set_01, stone_fire_pit` via `api.polyhaven.com/files/<id>` → gltf 1k | CC0 | textures resized to 512 (`gltf-transform resize --width 512`), `webp` or jpg, `copy` to glb, `prune dedup` | ~0.4-0.8 MB each, ≤ 8 MB total |
| `home/tile_kitchen_{col,nrm,rgh}.jpg` (optional) | ambientCG `Tiles074` (or similar) | CC0 | 512 px | ~0.3 MB |
| `guns2/` | none found reachable (kenney/poly.pizza blocked). Guns stay procedural, or reuse whatever the overhaul puts in its own gun folder | n/a | n/a | 0 |

The total stays under the 12 MB budget at about 10.5 MB.
