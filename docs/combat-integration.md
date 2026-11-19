# Combat integration (`index.html`)

What the combat layer does in the game, where it lives, and how the optional modules plug in.
Design source: `docs/design/SPEC.md` sections A (weapon feel) and B (pickups).

## Modules

| Module | Status in `index.html` | Fallback when the file is missing |
|---|---|---|
| `js/fx.js` (`HT.FX`) | Loaded and used for muzzle flashes, tracers, impacts and decals, brass and hulls, camera shake and kick, damage direction, hit pulse, low-health grade, pickup glow, zip-tie `+TRUST` pop. The grade pass gets `FX.GRADE` (desaturate, hurt, blur, pulse). | `const FX` is a no-op proxy, so every call does nothing. |
| `js/audio.js` (`HT.Audio`) | Loaded. Used for per-gun shots (the player's own and positional NPC shots), mechanics (`dry`, `reload_out`, `reload_in`, `pump`, `bolt`, `shell`, `equip`), impacts by surface, hit and kill ticks, pickup UI, footsteps, near-miss whizz, shell bounces, the minivan engine, horn and crash, and music and ambience states (hub, tension, combat, victory or fail). `snd()` forwards to `HT.Audio.legacy`. | The built-in synth: `gunSnd(id)` plays the SPEC A.2 recipes (crack, body, thump, tail and echo, mech), `sfx()` plays clicks, and `snd()` keeps its old behaviour. |
| `js/guns.js` (`HT.Guns`) | Loaded. `makeGun()` wraps `HT.Guns.model()` (turned 180°, because the module's guns point down -Z) for every held, NPC and pickup gun. `setViewGun()` builds `HT.Guns.viewmodel(type)` (arms and hands included) into the view-model scene. `vmKick()` calls `rig.fire()`, `reload()` calls `rig.reload(dur, empty)`, and `vmPose()` calls `rig.update(dt, {ads, moving, sprint, crouch})` and sets `vmCam.fov` from `rig.adsT` and `userData.adsFov`. The first-person `muzzle()` uses `rig.userData.muzzle`, so flashes and tracers leave the real barrel. `HT.Guns.init({assets})` runs at boot, and the guns are rebuilt when it resolves. | Procedural box-and-cylinder guns, nine different silhouettes, plus forearms and a per-gun spring kick (`vmS`). |

Not wired yet: `HT.Guns.attachToHand` (Rocketbox hand bones). `index.html` still uses the box characters with a `gunHold` group. Whoever swaps the characters should call `attachToHand(bone, makeGun(type), type)` inside `equip()`.

## Data (`WEAPONS`, `AMMO`, `NPC_GUNS`, `MISSION_ARMS`)

When `js/save.js` is loaded before the main script, `HT.CATALOG.guns` and `HT.CATALOG.ammo` are deep-merged over these tables, so the catalogue is the single source of stats. Its numbers match SPEC A.2 exactly; only three `short` names differ. The game keeps the feel-only fields the catalogue lacks: `rc.pat`, `vm`, `chamber`, `shell`, `shellDelay`, `quiet`, `root`, `nonlethal` and `scope`. Catalogue guns without a recoil pattern are dropped.

The SPEC A.1 model covers all 9 guns: `name short slot ammo auto dmg head rate mag reserve pellets range fall spread{hip,ads,move,bloom*} rc{v,h,hBias,adsMul,rec,pat} ads{zoom,t,speed} speed reload{tac,empty}|{shell} chamber equip fsa vm{back,rise,roll,side,k,damp} shell`, plus the specials (`quiet`, `root`, `nonlethal`, `scope`).
`SLOT_KEYS=['side','p1','p2']` replaces `ORDER`. `P.loadout` holds the three slots. `P.weapons` is derived from it (in slot order), so Q, the mouse wheel and the HUD keep working.
Ammo is typed: `P.pool[type]`. Each `P.ammo[gun]` is `{mag, res}`, where `res` is a getter and setter on the shared pool, so old code like `P.ammo[w].res+=...` still works. The pistol and the SMG share 9mm.

## Functions and regions touched

- **Script tags**: `js/fx.js`, `js/audio.js`, `js/guns.js`.
- **RENDER**: `GradeShader` uniforms and GLSL (`fxSample` and `fxGrade`), `R.apply` (FX quality and `bindGrade`), `R.mats.grade`.
- **Removed**: `flashTex`, `flashes`, `muzzleFlash`, `updFlashes`, the `flash` PointLight, `tracerMat*`, `tracer()`, `puffG`. `puff()` is now a one-line FX dust call, used by the stash smash.
- **AUDIO**: `initAudio` (also calls `HT.Audio.init` and wires the FX shell and near-miss hooks), and `snd` (bridge).
- **Guns**: `makeGun(type,{gold})` and `equip(d,type,opt)`.
- **DATA**: `WEAPONS`, `AMMO`, `SLOT_KEYS`, `NPC_GUNS`, `npcGun()`, `MISSION_ARMS`, `MISSION_LEND`.
- **spawnEnemy**: gun from `enemyGun()` (weighted per mission; the hunter only on yard tiles; the King carries a gold revolver). Shotgunner hp applies to `shotgun` and `double`.
- **updEnemy / updAlly**: the inline `G` tables became `npcGun(gun,dist[,ally])` (2 one-line edits).
- **VIEWMODEL**: `setViewGun`, `vmKick`, `vmSpring`, `vmPose`, and the `#scope` overlay (created from JS).
- **enterHub / startMission**: `FX.clear()`, `setLoadout(...)`, `audioState(...)`, the mission-2 intro, and lent-carbine retries. **endMission**: audio state, and Rick's "Keep the carbine" line.
- **look()**: ADS and scope sensitivity, and recoil-debt cancel when pulling down.
- **WEAPONS section** (rewritten): `gunSnd`, `sfx`, loadout (`mkAmmo`, `syncWeapons`, `fillAmmo`, `setLoadout`, `missionLoadout`, `slotFor`, `takeGun`), `swap`, `reload`, `updWeapon` (ADS ramp, recoil recovery, bloom, mag and shell reload state machine, delayed brass, scope sway with Shift steady), `curSpread`, `fallMul`, `muzzle`, `ejectShell`, `fire`.
- **COMBAT**: `hurtEnemy(e,dmg,by,opt)` (beanbag non-lethal), `surrender` and `killEnemy` (gun drops), `hurtPlayer(d,src)` (FX feedback), `shootAt` (FX, positional audio, world hits).
- **PICKUPS** (new section): `enemyGun`, `spawnPickup`, `removePickup`, `dropGun`, `confiscate`, `updPickupsVis`, `updPickups` (intro, nail root pin, hunter laser, despawn, ammo boxes, E prompt), `pickUp`, `hunterLaser`, `updIntro`, `finishIntro`, `audioState`.
- **updPlayer**: per-gun move speed, `P.spd`, footsteps, `updWeapon(dt)`, and third-person arm kick.
- **updCamera**: per-gun ADS FOV, `vmPose`, and the third-person scope view.
- **updMission**: typed ammo bag (`a` tiles), confiscate on zip-tie, and the pickup prompt merged at the end.
- **hud()**: crosshair spread uses `curSpread()`, and a guard for the module van engine.
- **frame()**: FX `setHealth`, `update` and `applyCamera`, plus the audio listener. **`__ht.step`**: adds `FX.update(dt)`.
- **`window.__ht`**: `WEAPONS AMMO NPC_GUNS FX simT pickups give(id) swap reload fire curSpread dropAt(id,x,z) pickUp(p) hurtEnemy`.
