#!/bin/bash
O=/tmp/claude-0/audit-jobs
while pgrep -f batch2.sh >/dev/null; do sleep 20; done
timeout 900 node repro-leftover.js overwatch garden abandon > $O/r.ow.abandon.log 2>&1; echo "ow abandon $?"
timeout 900 node repro-leftover.js overwatch garden abandon > $O/r.ow.abandon2.log 2>&1; echo "ow abandon2 $?"
timeout 900 node repro-leftover.js overwatch garden home > $O/r.ow.home.log 2>&1; echo "ow home $?"
timeout 1200 node repro-roundup-convoy.js > $O/r.convoy.log 2>&1; echo "convoy $?"
timeout 900 node repro-roundup-lot.js > $O/r.lot2.log 2>&1; echo "lot2 $?"
timeout 600 node repro-talk-retry.js > $O/r.talk2.log 2>&1; echo "talk2 $?"
timeout 900 node repro-moving-fresh.js > $O/moving.fresh.log 2>&1; echo "moving fresh $?"
timeout 600 node repro-builtin-leftover.js rick > $O/r.rick.leftover.log 2>&1; echo "rick leftover $?"
timeout 600 node repro-builtin-leftover.js dave > $O/r.dave.leftover.log 2>&1; echo "dave leftover $?"
