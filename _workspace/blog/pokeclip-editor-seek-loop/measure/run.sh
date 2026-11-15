#!/usr/bin/env bash
# 공개 재측정 한 번 돌리기.
#
#   ./run.sh [브라우저 …]     # 기본 chrome. chromium · firefox · webkit 도 줄 수 있다
#
# 결과는 SEEKW_OUT_DIR(기본 이 폴더의 out/)에 쓴다. 커밋된 raw/ 는 2026-11-16 실행 결과이므로 덮어쓰지 않는다.
# 준비: 저장소 루트에서 npm ci(Playwright 1.64.1), ffmpeg/ffprobe, Google Chrome(chrome 일 때). Node v26.4.0 에서 돌렸다.
# env.txt 를 모으는 sw_vers · sysctl 은 macOS 명령이다(다른 OS 에서는 그 줄이 비어도 측정은 돈다).
#
# 합성 영상은 임시 폴더(기본 /tmp/seekw-media)에 만들고, Playwright 의 임시 프로필도 TMPDIR(기본 /tmp/seekw-tmp)
# 아래에 만들게 한다. 스크립트는 아무것도 지우지 않는다 — 끝나면 두 폴더를 직접 지운다. 결과는 <출력>/<브라우저>.json 과
# <출력>/summary.md.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
MEDIA_DIR="${SEEKW_MEDIA_DIR:-/tmp/seekw-media}"
TMP_DIR="${SEEKW_TMPDIR:-/tmp/seekw-tmp}"
OUT_DIR="${SEEKW_OUT_DIR:-$HERE/out}"
BROWSERS=("${@:-chrome}")
mkdir -p "$MEDIA_DIR" "$TMP_DIR" "$OUT_DIR"

"$HERE/make-video.sh" "$MEDIA_DIR/video.mp4" > "$OUT_DIR/video-ffprobe.json"
{
  echo "date: $(TZ=Asia/Seoul date '+%Y-%m-%dT%H:%M:%S%z')"
  echo "os: $(sw_vers -productName 2>/dev/null) $(sw_vers -productVersion 2>/dev/null) $(uname -m)"
  echo "machine: $(sysctl -n machdep.cpu.brand_string 2>/dev/null)"
  echo "node: $(node --version)"
  echo "playwright: $(cd "$HERE" && node -e "console.log(require('playwright/package.json').version)")"
  echo "ffmpeg: $(ffmpeg -version | head -1)"
} > "$OUT_DIR/env.txt"

files=()
for b in "${BROWSERS[@]}"; do
  TMPDIR="$TMP_DIR" node "$HERE/run.mjs" --browser "$b" --video "$MEDIA_DIR/video.mp4" --out "$OUT_DIR"
  files+=("$OUT_DIR/$b.json")
done
node "$HERE/summarize.mjs" "${files[@]}" > "$OUT_DIR/summary.md"
echo "요약: $OUT_DIR/summary.md · 지울 임시 폴더: $MEDIA_DIR $TMP_DIR"
