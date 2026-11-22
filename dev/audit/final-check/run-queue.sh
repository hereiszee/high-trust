#!/bin/bash
# Runs each command in sequence with Chromium killed between runs; one log per command in $OUT.
# usage: bash dev/audit/final-check/run-queue.sh <outdir> <listfile>   (list: "name|command" per line)
OUT=$1; LIST=$2; mkdir -p "$OUT"; cd "$(dirname "$0")/../../.."
while IFS='|' read -r name cmd; do
  [ -z "$name" ] && continue; case "$name" in \#*) continue;; esac
  pkill -f chrom >/dev/null 2>&1; sleep 2
  s=$(date +%s); timeout 1500 bash -c "$cmd" > "$OUT/$name.txt" 2>&1; rc=$?
  echo "$name rc=$rc $(( $(date +%s)-s ))s" >> "$OUT/_status.txt"
done < "$LIST"
pkill -f chrom >/dev/null 2>&1; echo DONE >> "$OUT/_status.txt"
