#!/bin/bash
# v2 review contact sheet: one row per v2 shot, 5 frames spread over the shot (full takes from frames/, else the test stills from test/),
# labelled with shot name and frame number -> tools/trailer/review/v2-contact-sheet.jpg     tools/trailer/sheet.sh [shot ...]
cd "$(dirname "$0")"
SCR=${TRAILER_SCRATCH:-/tmp/ht-trailer}; OUT=review/v2-contact-sheet.jpg; T=$(mktemp -d)
shots=("$@"); [ ${#shots[@]} -eq 0 ] && shots=($(ls shots | grep '^v2_' | sed 's/\.js$//'))
rows=()
for s in "${shots[@]}"; do
  d="$SCR/frames/$s"; kind=take; [ -d "$d" ] && [ "$(ls "$d" | grep -c '^f.*jpg$')" -gt 4 ] || { d="$SCR/test/$s"; kind=test; }
  mapfile -t fs < <(ls "$d" 2>/dev/null | grep '^f.*jpg$' | sort); n=${#fs[@]}; [ "$n" -lt 1 ] && continue
  args=(); fl=""
  for k in 0 1 2 3 4; do i=$(( (n-1)*k/4 )); f="${fs[$i]}"; args+=(-i "$d/$f"); done
  fl="[0]scale=384:216,drawtext=text='$s ($kind) ${fs[0]%.jpg}':x=6:y=6:fontsize=15:fontcolor=white:box=1:boxcolor=black@0.6[a];"
  for k in 1 2 3 4; do i=$(( (n-1)*k/4 )); fl+="[$k]scale=384:216,drawtext=text='${fs[$i]%.jpg}':x=6:y=6:fontsize=15:fontcolor=white:box=1:boxcolor=black@0.6[v$k];"; done
  fl+="[a][v1][v2][v3][v4]hstack=inputs=5"
  ffmpeg -loglevel error -y "${args[@]}" -filter_complex "$fl" "$T/$s.jpg" && rows+=(-i "$T/$s.jpg")
done
nr=$(( ${#rows[@]} / 2 )); [ "$nr" -lt 1 ] && exit 0
if [ "$nr" -eq 1 ]; then cp "$T/${shots[0]}.jpg" "$OUT"; else ffmpeg -loglevel error -y "${rows[@]}" -filter_complex "vstack=inputs=$nr" -q:v 3 "$OUT"; fi
rm -rf "$T"; echo "$OUT ($nr shots)"
