# People in the game (`js/people.js`)

`window.HT.People` turns the rigged characters in `assets/people/rocketbox/` into game characters. `makeDude()` returns the same shape as before, so the call sites did not change. If the files fail to load, the old box dudes come back automatically.

## Hooking into index.html
- **ASSETS:** `PEOPLE` lists 10 GLBs plus `anims.glb`, loaded as `rb_<key>`. The old `assets/chars` set is no longer loaded.
- **makeDude(o):** maps the role to a character and falls back to boxes. The roles are:
  - `HOMIES` objects: you → `dad_player`, gary, rick, dave (×1.15), doug.
  - `{crown:1}` → `boss`, with a gold crown and chain.
  - Anything else → a random thug from `thug_hoodie`, `thug_track`, `thug_beanie` and `thug_red`.
  - `{role:'wife'|'son'|'daughter'}` → family. Call `HT.People.preload(['wife',…])` first.
- **pose / equip:** forward to `People.pose` and `People.equip` when `d.rb` exists. `updPlayer` also passes `pitch:P.pitch`.
- **Cues:** soft wrappers around `fire`, `reload`, `shootAt`, `killEnemy`, `hurtEnemy` and `hurtAlly` trigger recoil, reload, hit reactions and death.
- **Update:** `People.update(dt,camera)` runs in `frame()` and in `__ht.step()`.
- **Test hooks:** `__ht.dude = {make, equip, pose, makeGun, HOMIES, rebuildTargets, solids}`.

## API
```js
HT.People.init({assets, quality})   // ready: Promise; ok: bool
const d = HT.People.make(role, {variant, scale, idle})
// d = {root, body, meshes, head, gunHold, gun, walk, legs:[], arms:[], rb}
HT.People.pose(d, dt, {moving, speed, aim, mode:'stand'|'crouch'|'down'|'kneel'|'hands'|'sit', pitch})
HT.People.update(dt, camera)
HT.People.equip(d, type); fire(d); reload(d, sec); hit(d, head); die(d); revive(d)
HT.People.force(d, {mode:'crouch'})  // tests only; null clears
HT.People.debugHitboxes(true)        // shows the hitboxes as magenta wireframe
```

## How it works
- **Hitboxes:** 13 invisible boxes, children of bones, so they follow crouch, kneel and death:
  - head (`userData.head`), neck, chest, belly and hips
  - upper arms and forearms
  - thighs and calves

  They use `material.visible=false`, so r128 raycasts still hit them. Skinned meshes never carry `userData.ent`.
- **Animation layers:**
  - **Legs and pelvis:** the base clip, crossfaded and renormalised so the bind pose never shows.
  - **Spine:** one-shot, then aim, then hold, then the base clip.
  - **Arms:** one-shot, then aim, then hold, then the base clip.
- **Locomotion:** the walk, walk_fast, jog, run and sprint clip is picked from the measured ground speed. Its playback rate is speed divided by the clip's recorded speed, so feet don't slide. Strafe and backward movement use their own clips, and phase is kept across switches.
- **Aim pitch:** split between the spine and both upper arms.
- **Crouched aim:** a lower-spine hinge with the arms and neck counter-rotated keeps the head below 1.15 m cover.
- **Low ready:** long guns use the rifle pose tipped down. Pistols hang in the hand when not aiming.
- **Performance:**
  - `SkeletonUtils.clone` shares geometry and materials.
  - Skinned bounds are widened, so frustum culling stays on.
  - Animation runs every frame within 22 m, then every 2nd, 4th and 8th frame further out, and every 6th frame when hidden.
  - On Low quality, colour maps are capped at 512 px and other maps at 256 px.
  - About 0.25 ms per frame for 18 characters on CPU swiftshader.

## Tests
`node dev/people-check.js [--shots] [--only=combat,missions,perf,shots,fallback,lowq]`. It needs no server. Screenshots go to `docs/screenshots/people/`.
