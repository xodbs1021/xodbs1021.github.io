#!/usr/bin/env bash
# 합성 영상 하나를 만든다. 저장소에 넣지 않는다(실행할 때마다 다시 만든다).
#
#   ./make-video.sh <출력 mp4 경로>
#
# - ffmpeg testsrc2 20초 · 640×360 · 30fps · H.264(yuv420p) · 소리 없음
# - 영상 트랙 시간 단위(timescale)를 90kHz 로 둔다(HLS · fMP4 영상이 흔히 쓰는 단위)
# - moov 를 앞에 둔다(Blob 으로 통째로 넘기므로 필수는 아니다)
set -euo pipefail
OUT="${1:?출력 mp4 경로}"
ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "testsrc2=size=640x360:rate=30:duration=20" \
  -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p -g 30 \
  -video_track_timescale 90000 -movflags +faststart -an "$OUT"
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,pix_fmt,width,height,r_frame_rate,time_base,duration \
  -of json "$OUT"
