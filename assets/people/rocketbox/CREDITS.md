# Credits: assets/people/rocketbox

Every file in this folder is built from MIT- or CC0-licensed sources. Nothing here comes from Mixamo, Renderpeople, Sketchfab, or the Unity/Unreal stores.

| Files | Source | Author | License | URL |
|---|---|---|---|---|
| dad_player.glb | Rocketbox `Assets/Avatars/Adults/Male_Adult_14` (+ procedural cap) | Microsoft (Rocketbox Avatar Library) | MIT | https://github.com/microsoft/Microsoft-Rocketbox |
| dad_gary.glb | Rocketbox `Adults/Male_Adult_03` (+ procedural sunglasses) | Microsoft | MIT | same |
| dad_rick.glb | Rocketbox `Adults/Male_Adult_01` (+ procedural cap and whistle) | Microsoft | MIT | same |
| thug_fro.glb | Rocketbox `Adults/Male_Adult_04` | Microsoft | MIT | same |
| thug_jacket.glb | Rocketbox `Adults/Male_Adult_07` | Microsoft | MIT | same |
| thug_brown.glb | Rocketbox `Adults/Male_Adult_20` | Microsoft | MIT | same |
| thug_cap.glb | Rocketbox `Professions/Wood_Male_01` | Microsoft | MIT | same |
| thug_f_hood.glb | Rocketbox `Adults/Female_Adult_12` | Microsoft | MIT | same |
| thug_f_leather.glb | Rocketbox `Adults/Female_Adult_04` | Microsoft | MIT | same |
| dad_dave.glb | Rocketbox `Adults/Male_Adult_13` (+ procedural belly morph) | Microsoft | MIT | same |
| dad_doug.glb | Rocketbox `Professions/Police_Male_06`. Retextured: the "POLICE" patches now read "DAD", the shirt is tinted blue, and the badge is removed. Procedural sunglasses added. | Microsoft | MIT | same |
| thug_hoodie.glb | Rocketbox `Adults/Male_Adult_18` | Microsoft | MIT | same |
| thug_track.glb | Rocketbox `Adults/Male_Adult_17` | Microsoft | MIT | same |
| thug_beanie.glb | Rocketbox `Professions/Delivery_Male_01` | Microsoft | MIT | same |
| thug_red.glb | Rocketbox `Adults/Male_Adult_10` | Microsoft | MIT | same |
| boss.glb | Rocketbox `Professions/Business_Male_05` | Microsoft | MIT | same |
| wife.glb | Rocketbox `Adults/Female_Adult_01` | Microsoft | MIT | same |
| son.glb | Rocketbox `Children/Male_Child_01` | Microsoft | MIT | same |
| daughter.glb | Rocketbox `Children/Female_Child_01` | Microsoft | MIT | same |
| earl.glb | Rocketbox `Professions/Business_Male_07` (shirt retinted light blue, + procedural cap) | Microsoft | MIT | same |
| dee.glb | Rocketbox `Professions/Business_Female_01` | Microsoft | MIT | same |
| rosa.glb | Rocketbox `Professions/Medical_Female_01` (white uniform retinted to teal scrubs) | Microsoft | MIT | same |
| benny.glb | Rocketbox `Professions/Business_Male_06` (shirt front repainted with pink stripes, + procedural cap and waist apron) | Microsoft | MIT | same |
| nb_gran.glb | Rocketbox `Professions/Business_Female_02` | Microsoft | MIT | same |
| nb_pops.glb | Rocketbox `Adults/Male_Adult_05` | Microsoft | MIT | same |
| nb_office.glb | Rocketbox `Professions/Business_Female_03` | Microsoft | MIT | same |
| nb_sweater.glb | Rocketbox `Adults/Male_Adult_02` | Microsoft | MIT | same |
| nb_teen.glb | Rocketbox `Adults/Female_Party_02` | Microsoft | MIT | same |
| nb_kid.glb | Rocketbox `Children/Male_Child_02` | Microsoft | MIT | same |
| nb_kenji.glb | Rocketbox `Adults/Male_Adult_09` | Microsoft | MIT | same |
| nb_marcus.glb | Rocketbox `Adults/Male_Adult_12` | Microsoft | MIT | same |
| nb_mei.glb | Rocketbox `Adults/Female_Adult_03` | Microsoft | MIT | same |
| nb_lucia.glb | Rocketbox `Adults/Female_Adult_11` | Microsoft | MIT | same |
| anims.glb: idle, idle_look, idle_nervous, idle_angry, crouch_idle, sit, sit_breathe, walk, walk_fast, jog, run, sprint, f_idle, f_walk, f_sit | Rocketbox `Assets/Animations` (motion-captured), resampled onto the dad_player skeleton | Microsoft | MIT | same |
| anims.glb: crouch_walk, pistol_idle, pistol_aim, pistol_aim_up, pistol_aim_down, pistol_fire, pistol_reload, death, hit_chest, hit_head, punch, interact, ual_crouch_idle | "Universal Animation Library" [Standard], retargeted | Quaternius | CC0 1.0 | https://opengameart.org/content/universal-animation-library (https://quaternius.com/packs/universalanimationlibrary.html) |
| anims.glb: hit_knockback, idle_arms_folded | "Universal Animation Library 2" [Standard], retargeted | Quaternius | CC0 1.0 | https://opengameart.org/content/universal-animation-library-2 |
| anims.glb: strafe_left, strafe_right, run_back | "Ultimate Modular Men" Run_Left / Run_Right / Run_Back (from `assets/chars/dad_casual.glb`), retargeted | Quaternius | CC0 1.0 | https://quaternius.com/packs/ultimatemodularcharacters.html |
| anims.glb: rifle_aim, rifle_fire, hands_up, kneel_cuffed, kneel_hands_up | Procedural IK poses written for this project, layered on the Rocketbox idle (MIT) | this project | MIT (same as the base idle) | — |

Changes made: FBX converted to glTF with Blender 5.0 (bpy). Textures downscaled to 1024 px JPG; hair/eyelash alpha cards are 512 px PNG. Roughness is derived from the Rocketbox specular maps. The animations are retargeted with a custom rest-pose-aware retargeter, rotations are quantized to int16, and keyframes are reduced.

## Microsoft Rocketbox license (MIT)

```
MIT License

Copyright (c) 2020 Microsoft

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The Quaternius packs are CC0 1.0 (public domain, https://creativecommons.org/publicdomain/zero/1.0/). No attribution is required; they are credited anyway.
