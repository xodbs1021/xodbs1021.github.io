#!/bin/bash
# AAC encoder packet length / priming / bitrate measurement. Run in /tmp/tb5w-m
set -u
cd /tmp/tb5w-m
OUT=/tmp/tb5w-m/aac_results.txt
: > $OUT
log(){ echo "$@" | tee -a $OUT; }
log "start $(date '+%F %T %Z') load $(sysctl -n vm.loadavg)"
enc(){ # name args...
  name=$1; shift
  ffmpeg -hide_banner -v error -i sintel.wav "$@" -y enc_$name.m4a
  info=$(ffprobe -v error -select_streams a -show_entries stream=codec_name,profile,sample_rate,channels,frame_size,initial_padding -of compact=p=0 enc_$name.m4a)
  dur=$(ffprobe -v error -select_streams a -show_entries packet=duration -of csv=p=0 enc_$name.m4a | sort | uniq -c | sort -rn | head -1)
  bytes=$(ffprobe -v error -select_streams a -show_entries packet=size -of csv=p=0 enc_$name.m4a | awk '{s+=$1} END{print s}')
  tb=$(ffprobe -v error -select_streams a -show_entries stream=time_base -of csv=p=0 enc_$name.m4a)
  log "$name | args: $* | $info | pkt duration(count) $dur tb $tb | payload bytes $bytes | kbps $(echo "scale=1; $bytes*8/51.946667/1000" | bc)"
}
enc aac_lc_128 -c:a aac -b:a 128k
enc aac_lc_128_prof -c:a aac -profile:a aac_low -b:a 128k
enc at_lc_128 -c:a aac_at -b:a 128k
enc at_he_64 -c:a aac_at -profile:a 4 -b:a 64k
enc at_hev2_32 -c:a aac_at -profile:a 28 -b:a 32k
enc at_ld_128 -c:a aac_at -profile:a 22 -b:a 128k
enc at_eld_128 -c:a aac_at -profile:a 38 -b:a 128k
for q in 0.1 0.5 1 2 5; do enc aac_q$q -c:a aac -q:a $q; done
for q in 0 4 9 14; do enc at_q$q -c:a aac_at -q:a $q; done
ffmpeg -hide_banner -v error -i sintel.wav -c:a libopus -b:a 128k -y enc_opus_128.ogg
log "opus_128 | $(ffprobe -v error -select_streams a -show_entries stream=codec_name,sample_rate,channels,initial_padding -of compact=p=0 enc_opus_128.ogg) | pkt $(ffprobe -v error -select_streams a -show_entries packet=duration -of csv=p=0 enc_opus_128.ogg | sort | uniq -c | sort -rn | head -1) tb $(ffprobe -v error -select_streams a -show_entries stream=time_base -of csv=p=0 enc_opus_128.ogg)"
log "end $(date '+%F %T %Z') load $(sysctl -n vm.loadavg)"
