#!/bin/sh
# Re-run every input-audit probe one after another (one browser at a time); logs to dev/audit/input/out/<probe>.run<N>.txt
N=${1:-2}; cd "$(dirname "$0")/../../.."
for t in pad-crossing pad-tow pad-jobs pad-range-home pad-talk rebind rebind-aim-mouse2 mouse45 held-keys; do
  timeout 900 node dev/audit/input/$t.js > dev/audit/input/out/$t.run$N.txt 2>&1; echo "$t exit $?"
done
