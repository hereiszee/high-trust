#!/bin/bash
O=/tmp/claude-0/audit-jobs
for j in hoa roundup mower; do timeout 900 node probe.js $j --quit=title > $O/$j.title.log 2>&1; echo "$j title $?"; done
timeout 900 node probe.js finale --quit=go > $O/finale.go.log 2>&1; echo "finale go $?"
for pr in "tail hoa" "overwatch finale" "tow cargo" "cargo roundup" "sabotage heist" "crossing taxi" "mower carwash"; do set -- $pr; for how in fail abandon; do timeout 1200 node pairs.js $1 $2 --a=$how > $O/pair.$1.$2.$how.log 2>&1; echo "pair $1 $2 $how $?"; done; done
for j in gary rick dave doug earl dee rosa benny duke; do timeout 900 node probe.js $j --ways=down,leash,car --quit=go > $O/$j.go.log 2>&1; echo "$j go $?"; done
for j in porch talk tow taxi overwatch hoa tail sabotage cargo crossing heist roundup; do timeout 900 node probe.js $j --quit=reload > $O/$j.reload.log 2>&1; echo "$j reload $?"; done
