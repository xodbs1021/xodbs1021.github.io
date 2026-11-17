#!/usr/bin/env bash
# 공개 재측정 — 「한 CDN 배포에서 라이브는 EC2로, 되감기는 S3로 갈랐습니다」
#
#   MONO_DIR=<3K-PokeClip/PokeClip-mono 클론> ./run.sh all "$PWD/raw"   # 고정 커밋의 main.tf 에서 경로 규칙 표 뽑기
#   ./run.sh down                                                    # /tmp/dvrurl-* 지우기
#
# AWS · terraform · docker 를 부르지 않는다. 클론은 git show 로 읽기만 한다.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SHA=627fb5a20ecb9d221fcc030c26adcbbcbe12c04e   # PokeClip-mono develop(2026-11-17)
TF=/tmp/dvrurl-main.tf

cmd_all() {
  : "${MONO_DIR:?MONO_DIR 에 PokeClip-mono 클론 경로를 주십시오}"
  local out=${1:?raw 폴더}
  mkdir -p "$out"
  git -C "$MONO_DIR" show "$SHA:infra/terraform/modules/cdn_media/main.tf" > "$TF"
  { echo "sha=$SHA"; date '+%Y-%m-%dT%H:%M:%S%z'; node --version; uname -mrs
    echo "main.tf sha256=$(shasum -a 256 "$TF" | cut -d' ' -f1)"; } > "$out/env.txt"
  node "$HERE/behaviors.mjs" "$TF" > "$out/behaviors.tsv"
}
cmd_down() { rm -rf /tmp/dvrurl-*; ls -d /tmp/dvrurl-* 2>/dev/null || echo "left=0"; }
case "${1:-}" in all) shift; cmd_all "$@" ;; down) cmd_down ;; *) echo "usage: $0 {all <raw>|down}" >&2; exit 2 ;; esac
