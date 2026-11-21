# Gun and first-person arm credits

## Firearms (assets/guns/) and first-person arms (js/guns.js)

| Local file | Used as | Source asset | Author | License | Source URL | Processing |
|---|---|---|---|---|---|---|
| guns/ph_pistol.glb | Garage Pistol | Service Pistol | Poly Haven (Mateusz Sadek) | CC0 | https://polyhaven.com/a/service_pistol | 2k glTF; second finish variant + empty magazine removed; textures re-encoded to 1024px JPG; packed to GLB (glTF-Transform) |
| guns/ph_bolt_rifle.glb | Deer Season | Bolt Action Rifle 7.62 | Poly Haven (Mateusz Sadek) | CC0 | https://polyhaven.com/a/bolt_action_rifle_7_62 | 2k glTF; textures re-encoded to 1024px JPG; packed to GLB |
| guns/oga_m4a1.glb | Rick's Carbine | M4A1 Assault Rifle | nisu (OpenGameArt; originally from 3dmodelscc0.com) | CC0 | https://opengameart.org/content/m4a1-assault-rifle (licence "CC0" and author "nisu" re-checked 2026-11-21, see docs/steam/evidence/oga_m4a1.txt) | FBX converted in-browser with three.js (FBXLoader -> GLTFExporter), scaled cm -> m, metal/rough packed into one texture, textures 1024px JPG |

Procedural (built in code in js/guns.js, no external assets): revolver, pump shotgun, beanbag shotgun, side-by-side and sawed-off, SMG, cordless nailer, all attachments (red dot, suppressor, extended magazines, vertical foregrip), cartridges and shells, and the first-person arms, gloved hands and sleeves. All procedural textures (steel, walnut, checkering, polymer, leather, cloth) are generated at runtime on canvas.

## First-person arms

The first-person arms and hands are the played character's own mesh (default `assets/people/rocketbox/dad_player.glb`). At runtime it is cut down to the arm-skinned triangles and posed by `js/guns.js`. The model comes from the Microsoft Rocketbox Avatar Library, MIT License. Full attribution is in `assets/people/rocketbox/CREDITS.md`. The procedural gloved hands are still available with `gloves:true` / `arms:'procedural'`.

The procedural detail added in this pass (revolver grip panels and medallions, SMG perforated shroud, stamped ribs and stock hinge, nailer overmould, vents and battery label) is all built in code, with no external assets.
