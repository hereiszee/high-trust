#!/bin/bash
# Re-runs the repo's own gameplay harnesses at 1920x1080 on High (tools/store-art/hiq.js), one browser at a time.
# Pictures land in tools/store-art/shots/** (mirroring docs/screenshots/**); pick the store screenshots from there.
cd "$(dirname "$0")/../.."
R(){ echo "=== $* $(date +%T)"; timeout ${T:-1500} node -r ./tools/store-art/hiq.js "$@" 2>&1 | grep -E "shot|wrote|FAIL|ok |error|Error" | tail -40; pkill -f chrom; echo "=== end $(date +%T)"; }
for j in "$@"; do
  case $j in
    ow1) R dev/jobs/overwatch.js --only=03-garden-scope --quiet;;
    ow2) R dev/jobs/overwatch.js --only=05-court-scope --quiet --human;;
    cross) R dev/jobs/crossing.js --only=03-main-crossing --quiet;;
    cross2) R dev/jobs/crossing.js --only=08-2nd-st-crossing --quiet;;
    arrest) R dev/jobs/arrest.js --shots --only=08-down,09-chase,11-win;;
    porch) T=2400 R dev/jobs/porch.js --shots --quiet;;
    taxi) T=2400 R dev/jobs/taxi.js --shots;;
    fest) T=2400 R dev/jobs/finale.js --from festival --shots;;
    base) T=3000 R dev/base-check.js range,tank,jet --shots;;
    drag) T=3000 R dev/dragstrip-check.js travel,tune,race --shots;;
  esac
done
