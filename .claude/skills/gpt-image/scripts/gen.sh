#!/usr/bin/env bash
# gen.sh <글 slug> <그림 이름> — _workspace/blog/<slug>/art/prompts/<name>.txt 로
# Codex CLI 내장 image_gen(ChatGPT 로그인, API 키 불필요)을 한 번 불러
# _workspace/blog/<slug>/art/<name>.png 를 만든다. 저장소 루트에서 실행한다.
#   OK   = 새로 만들었다 · SKIP = 이미 있어 건너뛰었다(덮어쓰지 않는다) · FAIL = 실패(종료 코드 1 · 2)
# 근거: 2026-10-31 migration-site art/gen.sh (볼트 raw/multicloud-migration/2026-10-31-site-v2/06_cc_image-gen-script_r1.sh)
set -euo pipefail

slug="${1:?사용법: gen.sh <글 slug> <그림 이름>}"
name="${2:?사용법: gen.sh <글 slug> <그림 이름>}"
kebab='^[a-z0-9][a-z0-9-]*$'
if [[ ! $slug =~ $kebab || ! $name =~ $kebab ]]; then
  echo "FAIL $name: slug · 이름은 kebab-case(영소문자 · 숫자 · -)만 쓴다" >&2
  exit 2
fi

art_dir="$PWD/_workspace/blog/$slug/art"
prompt="$art_dir/prompts/$name.txt"
out="$art_dir/$name.png"
part="$art_dir/$name.part.png"
log="$art_dir/$name.log"
lock="$art_dir/.$name.lock"

if [ ! -f "$prompt" ]; then
  echo "FAIL $name: 프롬프트 파일이 없다 $prompt (글 폴더 _workspace/blog/$slug/art/prompts/ 를 먼저 만든다)" >&2
  exit 2
fi

if [ -e "$out" ]; then
  echo "SKIP $name: 이미 있음 — 다시 만들려면 새 이름(<name>-v2)을 쓴다"
  exit 0
fi

# 같은 이름을 동시에 돌리면 둘 다 위 검사를 지나 같은 파일을 쓴다 — mkdir 은 원자적이라 잠금으로 쓴다.
if ! mkdir "$lock" 2>/dev/null; then
  echo "FAIL $name: 다른 실행이 같은 이름을 만들고 있다($lock)" >&2
  exit 2
fi
trap 'rm -f "$part"; rmdir "$lock" 2>/dev/null || true' EXIT

# 읽기 실패 · 빈 프롬프트로 생성하지 않는다(명령 치환 안의 실패는 set -e 가 잡지 못한다).
if ! spec="$(cat -- "$prompt")" || [ -z "${spec//[[:space:]]/}" ]; then
  echo "FAIL $name: 프롬프트를 읽지 못했거나 비었다 $prompt" >&2
  exit 2
fi

# stdin 을 닫아야 백그라운드 · 병렬 실행에서 codex 가 입력을 기다리며 멈추지 않는다.
rc=0
codex exec --skip-git-repo-check -s workspace-write -C "$art_dir" \
  "Use your built-in image generation tool (image_gen) to create exactly ONE image from the spec below, then copy the generated PNG into the current directory as ${name}.part.png (preserve alpha if transparent). Do not use any CLI or API-key fallback. Do nothing else.

$spec" </dev/null >"$log" 2>&1 || rc=$?

if [ "$rc" -ne 0 ]; then
  echo "FAIL $name: codex 종료 코드 $rc — 로그 $log" >&2
  exit 1
fi
# 비어 있지 않고 실제 형식이 PNG 이며 크기를 읽을 수 있는 파일만 받아들인다(JPEG · WebP 가 .png 이름으로 오면 거부).
if [ ! -s "$part" ] || ! sips -g format -g pixelWidth "$part" 2>/dev/null | grep -q 'format: png' \
   || ! sips -g pixelWidth "$part" 2>/dev/null | grep -Eq 'pixelWidth: [0-9]+'; then
  echo "FAIL $name: 유효한 PNG 가 안 생김 — 로그 $log" >&2
  exit 1
fi
mv -n "$part" "$out"
[ -e "$part" ] && { echo "FAIL $name: 그 사이 같은 이름이 생겨 옮기지 않았다" >&2; exit 1; }
echo "OK $name → $out"
