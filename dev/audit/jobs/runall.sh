#!/bin/bash
# runs probe.js for every registered job with one quit mode; output -> $OUT/<id>.<quit>.log
QUIT=${1:-go}; OUT=${OUT:-/tmp/claude-0/audit-jobs}; mkdir -p $OUT
for id in ${JOBS:-porch talk blitz tow mower taxi overwatch hoa tail sabotage cargo moving cones crossing brake bike arrest pawn heist carwash patrol roundup finale}; do
  timeout 900 node "$(dirname $0)/probe.js" $id --quit=$QUIT > $OUT/$id.$QUIT.log 2>&1; echo "$id $QUIT exit=$?"; done
