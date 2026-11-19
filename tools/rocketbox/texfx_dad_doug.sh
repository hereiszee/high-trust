#!/bin/bash
# Doug: replace POLICE patches with DAD, tint the white tee to a golf-polo blue, remove the badge
D=$1; f=$(ls $D/*_body_color.jpg)
convert $f \
  \( +clone -colorspace HSL -channel G -separate +channel -threshold 16% -negate \) \
  \( -clone 0 -colorspace HSL -channel B -separate +channel -threshold 30% \) \
  \( -clone 1 -clone 2 -compose multiply -composite \) -delete 1,2 \
  \( -clone 0 -fill '#5d7fa8' -colorize 100 -clone 0 -compose multiply -composite \) \
  +swap -compose over -composite -write mpr:t +delete \
  mpr:t -fill '#202020' -draw "roundrectangle 452,594 572,636 4,4" -draw "roundrectangle 454,325 572,361 4,4" \
  -fill '#e8e8e8' -font DejaVu-Sans-Bold -pointsize 30 -gravity NorthWest -annotate +482+598 'DAD' \
  -annotate 180x180+545+357 'DAD' \
  \( +clone -crop 46x64+100+4 +repage \) -gravity NorthWest -geometry +156+4 -compose over -composite \
  -quality 88 $f.tmp.jpg && mv $f.tmp.jpg $f
