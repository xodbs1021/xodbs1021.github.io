#!/usr/bin/env bash
# 공개 재측정 — 「서명 쿠키는 종류별로 나누고 1시간 창은 엣지에서 막았습니다」
#
#   MONO_DIR=<3K-PokeClip/PokeClip-mono 클론> ./run.sh extract   # 고정 커밋을 /tmp/dvrurl-run-mono 로 풀기(git archive — 클론은 읽기만)
#   ./run.sh all "$PWD/raw"                                      # 함수 시험 · 하한 결정 표 · 와일드카드 시연
#   ./run.sh down                                                # 이 스크립트가 만든 /tmp/dvrurl-run-* 만 지우기
#
# AWS 는 부르지 않는다. docker 도 쓰지 않는다.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SHA=627fb5a20ecb9d221fcc030c26adcbbcbe12c04e   # PokeClip-mono develop(2026-11-17)
TREE=/tmp/dvrurl-run-mono

cmd_extract() {
  : "${MONO_DIR:?MONO_DIR 에 PokeClip-mono 클론 경로를 주십시오}"
  rm -rf "$TREE" && mkdir -p "$TREE"
  git -C "$MONO_DIR" archive "$SHA" \
    infra/terraform/modules/cdn_media \
    media/internal/playback/testdata \
    media/internal/rewind/edgebounds/testdata | tar -x -C "$TREE"
  echo "$SHA" > "$TREE/.sha"
}

cmd_all() {
  local out=${1:?raw 폴더}
  mkdir -p "$out"
  { echo "sha=$(cat "$TREE/.sha")"; date '+%Y-%m-%dT%H:%M:%S%z'; node --version; uname -mrs
    if command -v sw_vers >/dev/null; then echo "macOS=$(sw_vers -productVersion)"; echo "cpu=$(sysctl -n machdep.cpu.brand_string)"; fi
  } > "$out/env.txt"
  # 저장소의 함수 시험 셋(dvr-floor · live-auth · deny-default · 로더) — 종료 코드는 기록만.
  ( cd "$TREE" && { echo "\$ node --test infra/terraform/modules/cdn_media/functions/test/*.test.mjs"
      node --test infra/terraform/modules/cdn_media/functions/test/*.test.mjs 2>&1 | tail -n 12; echo "exit=${PIPESTATUS[0]}"; } ) > "$out/functions-test.txt" || true
  node "$HERE/floor-table.mjs" "$TREE" > "$out/floor-table.tsv"
  node "$HERE/wildcard.mjs" > "$out/wildcard.tsv"
}

cmd_down() {
  rm -rf "$TREE"
  ls -d /tmp/dvrurl-run-* 2>/dev/null || echo "left=0"
}

case "${1:-}" in
  extract) cmd_extract ;;
  all) shift; cmd_all "$@" ;;
  down) cmd_down ;;
  *) echo "usage: $0 {extract|all <raw>|down}" >&2; exit 2 ;;
esac
