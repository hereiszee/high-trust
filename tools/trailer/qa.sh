#!/bin/bash
# Motion QA for a captured shot: mean absolute difference between consecutive frames (96x54 grey). A spike well above its neighbours
# is a teleport, a pop or a judder. Prints the frames whose difference is > 2.5x the shot's median.   tools/trailer/qa.sh <shot>
d=${TRAILER_SCRATCH:-/tmp/ht-trailer}/frames/$1
first=$(ls "$d" | grep "^f.*jpg$" | sort | head -1 | sed "s/^f0*//;s/\.jpg$//"); first=${first:-0}
ffmpeg -hide_banner -loglevel info -framerate 30 -start_number $first -i "$d/f%05d.jpg" -vf "scale=96:54,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" -f null - 2>/dev/null | python3 -c "
import sys,statistics as st
v=[float(l.split('=')[1]) for l in sys.stdin if 'YAVG' in l]
print('frames %d, median frame-to-frame difference %.2f'%(len(v)+1,st.median(v) if v else 0))
for i,x in enumerate(v):
  nb=v[max(0,i-6):i]+v[i+1:i+7]; m=st.median(nb) if nb else 0
  if x>3*m+1.5: print('  jump into frame +%d: %.1f (neighbours %.1f)'%(i+1,x,m))
"
