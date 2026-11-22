#!/bin/bash
# summarise probe logs: node-side steps that matter
for f in "$@"; do echo "== $(basename $f)"; grep -h '"step":"\(fail\|advance\|stop\|hubDiff\|errors\|pause\|abandon\|dialog\|title\)"' $f | cut -c1-500; grep -h '"step":"card"' $f | grep -o '"btns":\[[^]]*\]' | cut -c1-300; grep -h '"step":"after"' $f | grep -o '"act":"[^"]*","clicked":[a-z]*\|"diff":.*' | cut -c1-400; grep -v '^{' $f | head -5; done
