#!/usr/bin/env bash
# gen.sh <글 slug> <그림 이름> — _workspace/blog/<slug>/art/prompts/<name>.txt 로
# Codex CLI 내장 image_gen(ChatGPT 로그인, API 키 불필요)을 한 번 불러
# _workspace/blog/<slug>/art/<name>.png 를 만든다. 저장소 루트에서 실행한다.
# 근거: 2026-10-31 migration-site art/gen.sh (볼트 raw/multicloud-migration/2026-10-31-site-v2/06_cc_image-gen-script_r1.sh)
set -euo pipefail

slug="${1:?사용법: gen.sh <글 slug> <그림 이름>}"
name="${2:?사용법: gen.sh <글 slug> <그림 이름>}"
case "$slug$name" in
  */* | *..*) echo "FAIL $name: slug · 이름에 / 나 .. 를 쓸 수 없다" >&2; exit 2 ;;
esac

art_dir="$PWD/_workspace/blog/$slug/art"
prompt="$art_dir/prompts/$name.txt"
out="$art_dir/$name.png"
log="$art_dir/$name.log"

[ -f "$prompt" ] || { echo "FAIL $name: 프롬프트 없음 $prompt" >&2; exit 2; }
# 덮어쓰지 않는다 — 다시 만들려면 새 이름(<name>-v2)을 쓴다.
[ -e "$out" ] && { echo "FAIL $name: 이미 있음 $out" >&2; exit 2; }

# stdin 을 닫아야 백그라운드 · 병렬 실행에서 codex 가 입력을 기다리며 멈추지 않는다.
codex exec --skip-git-repo-check -s workspace-write -C "$art_dir" \
  "Use your built-in image generation tool (image_gen) to create exactly ONE image from the spec below, then copy the generated PNG into the current directory as ${name}.png (preserve alpha if transparent). Do not use any CLI or API-key fallback. Do nothing else.

$(cat "$prompt")" </dev/null >"$log" 2>&1 || true

if [ -f "$out" ]; then
  echo "OK $name → $out"
else
  echo "FAIL $name: PNG 가 안 생김 — 로그 $log" >&2
  exit 1
fi
