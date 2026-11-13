#!/bin/sh
# usage: hook.sh <K> <exit-timestamp-file>
# Writes K lines of "a", records the wall clock in ns, then exits 1.
yes a | head -n "$1"
"$(dirname "$0")/nowns" > "$2"
exit 1
