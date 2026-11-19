# World pass credits (js/world.js)

No new binary assets were added in the world-finish pass. Everything new is procedural (geometry and canvas textures generated in `js/world.js`: rugs, hay, pegboard, party banner, netting, chain-link fallback, graffiti, posters, signs) or reuses files already in the repo and already credited in `assets/CREDITS.md`:

| Used for | Files | Source / license (see assets/CREDITS.md) |
|---|---|---|
| Den, mansion and chop-shop furniture, wall art, safe, kitchen units, tool chest, dartboard | `assets/home/*.glb` (Sofa_01, ArmChair_01, wooden_bookshelf_worn, kenney_*, fancy/hanging_picture_frame_01, potted_plant_04, pixel_combination_safe, metal_tool_chest, round_wooden_table_02, painted_wooden_chair_02, modern_coffee_table_01, dartboard) | Poly Haven / Kenney / pixel set, all CC0 |
| Picnic tables (park cover tiles, pavilion) | `assets/world/wooden_picnic_table.glb` | Poly Haven, CC0 |
| Trees, bushes, crates, barrels, tyres, pallets, trash bags, mailboxes, trash cans | `assets/props/*.glb` | Quaternius / lucian-pavel / braveo / Poly Haven, CC0 |
| Surfaces (asphalt, sidewalk, pavers, brick, paint, plaster, wood, metal, grass, chain-link) | `assets/tex/*` | Poly Haven / ambientCG, CC0 |
| Compound stucco | `assets/tex2/stucco_*` via HT.Buildings materials | credited in assets/CREDITS.md |

Every one of these is optional at runtime: if a file fails to load, the level falls back to procedural geometry or skips the item.
