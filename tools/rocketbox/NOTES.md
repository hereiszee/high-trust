# Rebuild notes (rocketbox)
1. bpy: `uv venv -p 3.11 bpyenv && uv pip install -p bpyenv/bin/python bpy` (Blender 5.0.1 as a module)
2. Source: `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none --sparse https://github.com/microsoft/microsoft-rocketbox dl/rb`, then `git sparse-checkout set --no-cone` with the avatar Export/*.fbx + Textures/ paths listed in scripts/build_all.sh and the Animations/*.max.fbx files listed in scripts/build_anims.py (RBCLIPS). (dl/rb was deleted after building to free 1.9 GB.)
   UAL: https://opengameart.org/sites/default/files/universal_animation_librarystandard.zip and .../universal_animation_library_2standard.zip into dl/ual, dl/ual2
3. Characters: `scripts/build_all.sh [key,key]` then `cd node_tools && node post_chars.mjs <glbs>` (alpha MASK on hair cards)
4. Animations: `OUTGLB=out/anims_raw.glb ./runanims.sh ""` ; `cp out/anims_raw.json <assets>/anims.json` ; `cd node_tools && node optimize_anims.mjs ../people/rocketbox/out/anims_raw.glb <assets>/anims.glb`
5. Proof: serve /home/user/high-trust, `node scripts/shots.js shots_final.json shots/final <port>`
Scripts: rbcommon.py (FBX import + normalize), build_char.py (materials, export), acc.py (cap/glasses/whistle/belly),
retarget.py (rest-aware retargeter, FK, two-bone IK), build_anims.py (clip list, procedural poses), texfx_dad_doug.sh, prep_tex.sh.
6. Roster round 2 (variety): textures at JPEG quality 80 (colour) / 78 (normal) to keep every glb under 1.3 MB. Picked from the avatar previews (Assets/Avatars/*/*/<name>.png); avatars in religious dress or uniforms/costumes were left out.
