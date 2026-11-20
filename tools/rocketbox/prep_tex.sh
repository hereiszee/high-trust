#!/bin/bash
# usage: prep_tex.sh <TexturesDir> <outdir> <size>
T=$1; O=$2; SZ=${3:-1024}; mkdir -p $O
for f in $T/*_color.tga; do
  b=$(basename $f .tga)
  if [[ $b == *opacity* ]]; then convert $f -resize 512x512 -define png:color-type=6 $O/$b.png
  else convert $f -resize ${SZ}x${SZ} -quality ${QC:-88} $O/$b.jpg; fi
done
for f in $T/*_normal.tga; do b=$(basename $f .tga); convert $f -resize ${SZ}x${SZ} -quality ${QN:-85} $O/$b.jpg; done
for f in $T/*_specular.tga; do b=$(basename $f _specular.tga);
  # metallicRoughness: R=1, G=roughness (from inverted specular), B=0 (non-metal)
  convert $f -resize 512x512 -colorspace gray -fx 'max(0.32,min(0.95,0.93-u*1.4))' g.miff
  convert -size 512x512 xc:white g.miff xc:black -combine -quality 90 $O/${b}_mr.jpg 2>/dev/null || convert xc:white -resize 512x512\! r.miff
  rm -f g.miff r.miff
done
