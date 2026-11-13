#!/bin/bash
cd /tmp/tb6w-vq
N=${1:-120}; C=${2:-crop=360:360:1040:560}
ffmpeg -hide_banner -v error -y -i ref10.mkv -i qp38.mp4 -filter_complex "[0:v]select='eq(n,$N)',split=2[r0][r1];[r1]gblur=sigma=2.0[b];[1:v]select='eq(n,$N)'[q];[r0]$C,pad=iw+12:ih:0:0:color=white[a1];[b]$C,pad=iw+12:ih:0:0:color=white[a2];[q]$C[a3];[a1][a2][a3]hstack=inputs=3" -frames:v 1 -update 1 ${3:-cmp.png}
