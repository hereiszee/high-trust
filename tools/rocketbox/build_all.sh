#!/bin/bash
# build every character: texture prep (+ per-character texture edits) then Blender export
S=/tmp/claude-0/-home-user/3ed7a49e-29bc-5a52-8a67-3e5791f8b023/scratchpad
R=$S/dl/rb/Assets/Avatars; W=$S/people/rocketbox; OUT=/home/user/high-trust/assets/people/rocketbox
ONLY="$1"
build() { key=$1; src=$2; opts=${3:-'{}'}
  [ -n "$ONLY" ] && [[ ",$ONLY," != *",$key,"* ]] && return
  name=$(basename $src)
  $W/scripts/prep_tex.sh $R/$src/Textures $W/tex/$key 1024
  [ -x $W/scripts/texfx_$key.sh ] && $W/scripts/texfx_$key.sh $W/tex/$key
  $S/bpyenv/bin/python $W/scripts/build_char.py -- $R/$src/Export/$name.fbx $W/tex/$key $OUT/$key.glb "$opts" 2>&1 | grep -E "Error|error|Trace|WROTE|HIP"
}
build dad_player   Adults/Male_Adult_14 '{"cap":[0.012,0.02,0.06]}'
build dad_gary     Adults/Male_Adult_03 '{"glasses":1}'
build dad_rick     Adults/Male_Adult_01 '{"cap":[0.3,0.012,0.012],"caplow":0.02,"capsize":1.03,"whistle":1}'
build dad_dave     Adults/Male_Adult_13 '{"belly":0.085}'
build dad_doug     Professions/Police_Male_06 '{"glasses":1}'
build thug_hoodie  Adults/Male_Adult_18
build thug_track   Adults/Male_Adult_17
build thug_beanie  Professions/Delivery_Male_01
build thug_red     Adults/Male_Adult_10
build boss         Professions/Business_Male_05
build wife         Adults/Female_Adult_01
build son          Children/Male_Child_01
build daughter     Children/Female_Child_01
# roster round 2 (variety): street crews only
build thug_fro       Adults/Male_Adult_04
build thug_jacket    Adults/Male_Adult_07
build thug_brown     Adults/Male_Adult_20
build thug_cap       Professions/Wood_Male_01
build thug_f_hood    Adults/Female_Adult_12
build thug_f_leather Adults/Female_Adult_04
