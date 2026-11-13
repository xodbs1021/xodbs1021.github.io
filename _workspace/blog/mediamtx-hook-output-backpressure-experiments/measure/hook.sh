#!/bin/sh
# usage: hook.sh <K> <exit-timestamp-file>
# Writes K lines of "a", records the wall clock in ns, then exits 1.
yes a | head -n "$1"
/tmp/osa1w-exp/out/nowns > "$2"
exit 1
