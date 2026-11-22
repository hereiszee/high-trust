#!/bin/bash
# Capture shots one after another (one browser at a time; each shot gets a fresh browser), then a 5-frame QA strip per shot.
#   tools/trailer/run.sh porch_chase traffic_honk ...      (TRAILER_SCRATCH overrides the scratch dir, default /tmp/ht-trailer)
cd "$(dirname "$0")/../.."
SCR=${TRAILER_SCRATCH:-/tmp/ht-trailer}; mkdir -p "$SCR/qa"
for s in "$@"; do
  pkill -f chrom >/dev/null 2>&1; sleep 1
  node tools/trailer/shoot.js "$s" $SHOOT_ARGS > "$SCR/log-$s.txt" 2>&1
  echo "$s exit $? $(tr '\r' '\n' < "$SCR/log-$s.txt" | grep -E 'frames,|FAILED|Error|already' | tail -1)"
  d="$SCR/frames/$s"; n=$(ls "$d" 2>/dev/null | grep -c '^f.*jpg$')
  if [ "$n" -gt 4 ]; then
    files=(); for k in 0 1 2 3 4; do i=$(( (n-1)*k/4 )); files+=(-i "$(printf "$d/f%05d.jpg" $i)"); done
    ffmpeg -loglevel error -y "${files[@]}" -filter_complex "[0]scale=640:-1[a];[1]scale=640:-1[b];[2]scale=640:-1[c];[3]scale=640:-1[d];[4]scale=640:-1[e];[a][b][c][d][e]xstack=inputs=5:layout=0_0|w0_0|w0+w1_0|0_h0|w0_h0" "$SCR/qa/$s.jpg"
  fi
done
pkill -f chrom >/dev/null 2>&1; true
