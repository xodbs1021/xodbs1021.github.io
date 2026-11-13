#!/bin/bash
# usage: loud.sh input.wav I TP LRA
cd /tmp/tb5w-m
in=$1; I=$2; TP=$3; LRA=$4; b=$(basename $in .wav)_L$LRA
meas(){ ffmpeg -hide_banner -nostats -i $1 -af ebur128=peak=true -f null - 2>&1 | awk '/Summary/{s=1} s&&/I:/{i=$2} s&&/LRA:/{l=$2} s&&/Peak:/{p=$2} END{printf "I=%s LRA=%s TP=%s", i,l,p}'; }
echo "src $in: $(meas $in) sr=$(ffprobe -v error -show_entries stream=sample_rate -of csv=p=0 $in)"
# 1 pass
ffmpeg -hide_banner -v error -i $in -af loudnorm=I=$I:TP=$TP:LRA=$LRA -c:a pcm_s16le -y ${b}_1p.wav
echo "1pass: $(meas ${b}_1p.wav) sr=$(ffprobe -v error -show_entries stream=sample_rate -of csv=p=0 ${b}_1p.wav)"
# 2 pass
j=$(ffmpeg -hide_banner -nostats -i $in -af loudnorm=I=$I:TP=$TP:LRA=$LRA:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
echo "$j" > ${b}_pass1.json
mi=$(echo "$j" | python3 -I -c 'import json,sys;d=json.load(sys.stdin);print(d["input_i"],d["input_tp"],d["input_lra"],d["input_thresh"],d["target_offset"])')
set -- $mi
ffmpeg -hide_banner -nostats -i $in -af loudnorm=I=$I:TP=$TP:LRA=$LRA:measured_I=$1:measured_TP=$2:measured_LRA=$3:measured_thresh=$4:offset=$5:linear=true:print_format=json -c:a pcm_s16le -y ${b}_2p.wav 2>&1 | grep normalization_type
echo "2pass: $(meas ${b}_2p.wav) sr=$(ffprobe -v error -show_entries stream=sample_rate -of csv=p=0 ${b}_2p.wav)"
