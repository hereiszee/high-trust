#!/bin/bash
# Render queue: runs `shoot.js` jobs from a queue file, at most N at once (each headless Chromium + SwiftShader takes 2-3 GB; five at
# once ran this 16 GB container out of memory). Append lines "<shot> [args]" to the queue file at any time; done lines move to .done.
#   tools/trailer/queue.sh [N=3]        queue file: $TRAILER_SCRATCH/queue.txt     logs: $TRAILER_SCRATCH/log-<shot>.txt
cd "$(dirname "$0")/../.."
SCR=${TRAILER_SCRATCH:-/tmp/ht-trailer}; Q=$SCR/queue.txt; N=${1:-3}; touch "$Q" "$Q.done"
while true; do
  run=$(pgrep -fc "node tools/trailer/shoot.js")
  if [ "$run" -lt "$N" ] && [ -s "$Q" ]; then
    line=$(head -1 "$Q"); sed -i '1d' "$Q"; echo "$line" >> "$Q.done"; set -- $line; shot=$1
    (node tools/trailer/shoot.js $line > "$SCR/log-$shot.txt" 2>&1) &
    sleep 20; continue
  fi
  sleep 10
done
