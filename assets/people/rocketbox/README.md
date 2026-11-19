# Rocketbox people: realistic skinned characters for High Trust

There are 13 characters, each a single GLB. They all share one skeleton (3ds Max Biped `Bip01`, 52 body bones plus 28 facial bones). One animation file, `anims.glb`, drives all of them. Licensing is in `CREDITS.md`. To see everything, open `test.html` over HTTP: it shows the lineup, and you can drag to orbit.

- **Units and axes:** meters, Y up. Characters face **+Z**, their left is **+X**, and the feet sit at y = 0 in rest.
- **Rest pose:** A-pose, with the arms about 45° down.
- **Format:** plain GLB. There is no Draco, meshopt or quantized mesh, so stock three r128 GLTFLoader loads it. Rotation keys in `anims.glb` are normalized int16, which is core glTF and supported by r128.
- **Materials:** standard PBR. The body and head each have a 1024 px color map, a 1024 px normal map (OpenGL convention), and a 512 px metallic-roughness map. Hair cards use `alphaMode: MASK`, double-sided.
- **Accessories:** separate skinned meshes named `acc_cap`, `acc_sunglasses` and `acc_whistle`, rigidly bound to the Head or Spine2 bone. To hide one: `root.getObjectByName('acc_cap').visible = false`.
- **Metadata:** the `Bip01` node carries `userData.hipHeight` (rest pelvis height).

## Characters (`characters.json`)
| key | who | tris | notes |
|---|---|---|---|
| dad_player | player dad, grey shirt and khakis | 8.8k | navy dad cap (`acc_cap`) |
| dad_gary | older, grey hair, tweed blazer | 7.5k | sunglasses |
| dad_rick | Coach Rick, striped polo, shorts, sneakers | 9.4k | red cap and whistle; the face reads about 30, younger than ideal |
| dad_dave | Big Dave, argyle sweater, jeans | 6.7k | belly morph (modest) |
| dad_doug | Doug, tactical vest ("DAD" patch) over a blue shirt | 7.8k | sunglasses |
| thug_hoodie / thug_track / thug_beanie / thug_red | street thugs | 6.4–7.1k | |
| boss | black suit, purple shirt | 7.2k | idle `idle_arms_folded` |
| wife / son / daughter | family | 8.7k / 6.7k / 7.1k | women and girls use `f_idle`, `f_walk`, `f_sit` |

## Using the animations in three.js
```js
const anims = (await load('assets/people/rocketbox/anims.glb')).animations;   // 38 clips
const g = await load('assets/people/rocketbox/dad_player.glb');
const root = THREE.SkeletonUtils.clone(g.scene);
root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
const mixer = new THREE.AnimationMixer(root);
mixer.clipAction(clipFor('walk', hipHeightOf(g.scene))).play();
```
Clips contain rotation tracks for every body bone, plus `Bip01_Pelvis.position` (absolute, authored for hip height 0.8952 m). For the wife (0.923), son (0.707) and daughter (0.757), scale that one track by `hipHeight / 0.8952`, or children will float. `clipFor()` in `test.html` does this. Facial bones are not animated.

To play an upper-body clip (for example rifle_aim) over legs that walk, keep only the Spine*, Neck, Head, Clavicle, arm and Finger tracks in the aim clip. Keep the Pelvis, Thigh, Calf, Foot and Toe tracks in the walk clip. Play both at weight 1.

### Clips (all in place; the speed column is the ground speed the clip was recorded at, so scale playback to your movement speed)
| clip | dur s | loop | speed m/s | source |
|---|---|---|---|---|
| idle / idle_look / idle_nervous / idle_angry | 8.0 / 4.6 / 9.0 / 8.0 | yes | – | Rocketbox mocap |
| walk / walk_fast | 1.2 / 1.07 | yes | 1.01 / 1.50 | Rocketbox mocap |
| jog / run / sprint | 0.77 / 0.77 / 0.6 | yes | 2.41 / 3.08 / 5.84 | Rocketbox mocap |
| f_idle / f_walk / f_sit | 8.0 / 1.2 / 8.0 | yes | – / 1.21 / – | Rocketbox mocap (female) |
| crouch_idle / ual_crouch_idle | 6.9 / 2.9 | yes | – | Rocketbox / UAL |
| crouch_walk | 2.0 | yes | ~0.63 | UAL |
| sit / sit_breathe | 8.0 | yes | – | Rocketbox (chair seat ≈ 0.45 m for adults) |
| pistol_idle / pistol_aim(/_up/_down) / pistol_fire / pistol_reload | 1.67 / 0.17 / 0.63 / 1.67 | aim: yes; fire, reload: no | – | UAL |
| rifle_aim / rifle_fire | 4.0 / 0.3 | yes / no | – | procedural IK, built to fit `assets/props/gun_rifle.glb` |
| hands_up / kneel_cuffed / kneel_hands_up | 4.0 | yes | – | procedural IK on Rocketbox idle |
| death / hit_chest / hit_head / hit_knockback | 2.4 / 0.33 / 0.43 / 0.83 | no (`LoopOnce` + `clampWhenFinished`) | – | UAL / UAL2 |
| strafe_left / strafe_right / run_back | 0.8 / 0.8 / 0.83 | yes | ~3 / ~3 / 2.47 | Quaternius modular, retargeted (run-speed strafes) |
| punch / interact / idle_arms_folded | 1.0 / 2.0 / 2.5 | no / no / yes | – | UAL / UAL2 |

## Attaching things (bone names after GLTFLoader sanitizing)
- Hips `Bip01_Pelvis`, spine `Bip01_Spine` → `Bip01_Spine1` → `Bip01_Spine2`, neck `Bip01_Neck`, head `Bip01_Head`, hands `Bip01_R_Hand` and `Bip01_L_Hand`, feet `Bip01_R_Foot` and `Bip01_L_Foot`.
- Rest-pose world axes of the local frames:
  - **Head:** local +X is up the neck, local +Y is face-forward (+Z world), local +Z is the character's left. The top of the skull is about 0.19 m along local +X; a hat goes on as a child of `Bip01_Head`, rotated so its up axis maps to local +X.
  - **R Hand:** local +X points along the fingers, local +Y is roughly the palm normal, and local +Z is roughly toward the thumb side.
- **Guns:** tested with `assets/props/gun_*.glb` (muzzle −Z, origin at the top of the grip). Add the gun as a child of `Bip01_R_Hand` with:
  - rifle: `position (0.0989, -0.0154, 0.0539)`, `quaternion (-0.4003, 0.4100, 0.7039, -0.4198)`. This fits `rifle_aim` and `rifle_fire` exactly; the left hand cups the handguard.
  - pistol: `position (0.0787, 0.0006, 0.0687)`, `quaternion (0.4079, -0.4620, -0.5513, 0.5623)`. This fits `pistol_*`.
