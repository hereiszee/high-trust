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

## Guns (js/guns.js)
`equip()` builds guns with `makeGun()`, which uses `HT.Guns.model()`. `People.equip` places them with `HT.Guns.handAttach(type)` and picks the clip family from `clipStyle`. Pistol-style guns are the pistol, revolver, nailer and sawed-off; every other gun uses the rifle clips. Long guns get a two-bone IK for the left arm: the palm goes to the middle of the pump (measured from the `pump` node) or to the forend points in `SUPPORT`, the hand turns to cup under the gun, and the IK blends with the aim and hold weights. Screenshots: `ik_long_guns_aim.jpg`, `ik_long_guns_low_ready.jpg` and `ik_shotgun_close.jpg`.

## Polish round 2
- **Explicit cues, no wrappers:** `cue(fn, dude, …)` is called directly from:
  - `fire()`, with the pump or bolt cycle
  - `reload()`, with its duration
  - `hurtEnemy`, with a `head` flag that plays `hit_head`; beanbag hits included
  - `killEnemy`, `hurtAlly`, `shootAt`, and the zip-tie (`interact`)
- **Restore before mix:** every bone edited procedurally (pelvis, spine, neck, head, both arms) goes back to its post-mixer value before `mixer.update`. Three's mixer skips writing bones whose value didn't change, so without this the offsets pile up.
- **Closed-loop gun aim:** after posing, the barrel's measured pitch and yaw are corrected through the arms (pitch) and Spine2 (yaw). The barrel follows the view within 0.01 rad for both rifle and pistol, whatever the base clip (crouch, strafe, hip yaw).
- **Hip-yaw locomotion:** sideways and diagonal moves turn the pelvis toward the travel direction and counter-turn the spine. Any speed uses the forward or backward gaits, so there are no slow-motion strafe clips.
- **Crouch:** the crouch idle is now Rocketbox `crouch_idle`. The crouch-walk cadence is capped at 2.4×, and the crouch hinge applies mostly when standing still.
- **Head look:** when not aiming, the head and neck follow the look pitch.
- **Rick's hand-off (`pose mode:'offer'`):** the carbine lies across his front at chest height, both hands on it through two-bone IK.
- **Rick's hair:** greyed to salt-and-pepper.
- **Regression checks:**
  - pitch ±0.9 held for 300 steps while idle, aiming, crouched, firing and reloading, with 3 guns
  - the barrel follows the view
  - the hand rises with pitch
  - the camera never sits inside the head
