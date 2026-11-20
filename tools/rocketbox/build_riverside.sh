#!/bin/bash
# Riverside cast: the four job-givers and the civilian neighbour pool (same pipeline as build_all.sh)
# usage: S=<work dir with bpyenv/ and dl/rb/> tools/rocketbox/build_riverside.sh [key,key]
S=${S:?set S to the work dir}; HERE=$(cd $(dirname $0) && pwd)
R=$S/dl/rb/Assets/Avatars; W=$S/riverside; OUT=$(cd $HERE/../.. && pwd)/assets/people/rocketbox
ONLY="$1"; export QC=${QC:-80} QN=${QN:-78}
build() { key=$1; src=$2; opts=${3:-'{}'}; fx=$4
  [ -n "$ONLY" ] && [[ ",$ONLY," != *",$key,"* ]] && return
  name=$(basename $src); rm -rf $W/tex/$key; mkdir -p $W/tex/$key
  $HERE/prep_tex.sh $R/$src/Textures $W/tex/$key ${SZ:-1024}
  [ -n "$fx" ] && eval "$fx"
  $S/bpyenv/bin/python $HERE/build_char.py -- $R/$src/Export/$name.fbx $W/tex/$key $OUT/$key.glb "$opts" 2>&1 | grep -E "Error|error|Trace|WROTE|HIP"
  (cd $HERE/../ && node rocketbox/post_chars.mjs $OUT/$key.glb)
}
T="python3 -I $HERE/texfx.py"
# job-givers
build earl   Professions/Business_Male_07   '{"cap":[0.02,0.035,0.09],"capsize":1.02}' "$T tint \$W/tex/earl/m018_body_color.jpg 0.62,0.74,0.88 80"
build dee    Professions/Business_Female_01
build rosa   Professions/Medical_Female_01  '{}' "$T tint \$W/tex/rosa/f152_body_color.jpg 0.36,0.62,0.66 80"
build benny  Professions/Business_Male_06   '{"cap":[0.8,0.25,0.38],"apron":[0.9,0.88,0.84]}' "$T apron \$W/tex/benny/m025_body_color.jpg 0.33,0.42,0.61,0.74 80"
# neighbours (civilian clothes, none shared with the street crews or the dads)
SZ=768 build nb_gran    Professions/Business_Female_02
build nb_pops    Adults/Male_Adult_05
build nb_office  Professions/Business_Female_03
build nb_sweater Adults/Male_Adult_02
SZ=768 build nb_teen    Adults/Female_Party_02
build nb_kid     Children/Male_Child_02
build nb_kenji   Adults/Male_Adult_09
build nb_marcus  Adults/Male_Adult_12
SZ=768 build nb_mei     Adults/Female_Adult_03
build nb_lucia   Adults/Female_Adult_11
