#!/bin/sh
# textinput_push.c 를 SDL 2.32.10 헤더로 한 번 컴파일하고, 판마다 다른 libSDL2-2.0.0.dylib 에 링크해 돌린다.
# build.sh 를 먼저 돌린다. 결과는 OUT(기본 measure/out)에 쓰므로 커밋된 raw/ 를 덮어쓰지 않는다.
#   variants:
#     sdl2-2.32.10    정식 SDL2(소스 빌드)
#     compat-2.32.70  sdl2-compat 2.32.70 + SDL3 3.4.12(소스 빌드)
#     compat-2.32.74  sdl2-compat 2.32.74 + SDL3 3.4.20(소스 빌드)
#     brew-2.32.74    Homebrew sdl2-compat(읽기 · 링크만) + 그것이 찾은 SDL3
#     compat-main     sdl2-compat main + SDL3 main(소스 빌드)
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=${SDLW_ROOT:-/tmp/sdlw-work}
OUT=${OUT:-$HERE/out}
BREW_COMPAT=${BREW_COMPAT:-/opt/homebrew/opt/sdl2-compat/lib}
# 스택은 macOS 가 죽은 프로세스마다 남기는 크래시 보고서(.ips, 기호 · 소스 행 포함)에서 뽑는다.
# lldb 는 개발자 모드가 꺼진 기계에서 권한 창을 기다리며 멈추므로 LLDB=1 일 때만 돌린다.
REPORTS=${REPORTS:-$HOME/Library/Logs/DiagnosticReports}
LLDB=${LLDB:-0}
mkdir -p "$OUT" "$ROOT/bin"

# 실행 전 표식보다 새로 생긴 보고서(이 바이너리 이름)를 10초까지 기다려 요약한다.
summarize_crash() { # binary-name marker out
  i=0
  while [ $i -lt 20 ]; do
    ips=$(find "$REPORTS" -maxdepth 1 -name "$1-*.ips" -newer "$2" 2>/dev/null | sort | tail -1)
    if [ -n "$ips" ]; then python3 -I "$HERE/crash_summary.py" "$ips" > "$3"; return; fi
    sleep 0.5; i=$((i + 1))
  done
  echo "no crash report found" > "$3"
}

INC="$ROOT/inst/sdl2-2.32.10/include/SDL2"
cc -std=c99 -g -O0 -Wall -Wextra -I"$INC" -D_THREAD_SAFE -c "$HERE/textinput_push.c" -o "$ROOT/bin/textinput_push.o" || exit 1

libdir() {
  case $1 in
    brew-2.32.74) echo "$BREW_COMPAT" ;;
    *) echo "$ROOT/inst/$1/lib" ;;
  esac
}

VARIANTS=${VARIANTS:-"sdl2-2.32.10 compat-2.32.70 compat-2.32.74 brew-2.32.74 compat-main"}
MODES=${MODES:-"keydown textinput peep user"}

{
  echo "date $(TZ=Asia/Seoul date '+%Y-%m-%dT%H:%M:%S%z')"
  sw_vers; uname -m; sysctl -n machdep.cpu.brand_string; cc --version | head -1
  lldb --version | head -1
  cat "$ROOT/refs.txt"
  echo "brew: $(brew list --versions sdl2-compat sdl3 2>/dev/null | tr '\n' ' ')"
} > "$OUT/env.txt" 2>&1

: > "$OUT/results.tsv"
printf 'variant\tmode\tinit\texit\tverdict\n' >> "$OUT/results.tsv"
for v in $VARIANTS; do
  lib=$(libdir "$v")
  bin="$ROOT/bin/textinput_push-$v"
  cc "$ROOT/bin/textinput_push.o" -o "$bin" -L"$lib" -lSDL2-2.0.0 -Wl,-rpath,"$lib" || exit 1
  otool -L "$bin" > "$OUT/otool-$v.txt"
  for m in $MODES; do
    for init in events video; do
      # video 초기화는 textinput 과 대조(keydown)만 본다.
      if [ "$init" = video ] && [ "$m" != textinput ] && [ "$m" != keydown ]; then continue; fi
      arg=""; [ "$init" = video ] && arg=video
      log="$OUT/run-$v-$m-$init.txt"
      marker="$ROOT/bin/.marker"; touch "$marker"; sleep 1
      DYLD_PRINT_LIBRARIES=1 "$bin" "$m" $arg > "$log" 2> "$log.dyld"
      rc=$?
      [ $rc -gt 128 ] && summarize_crash "$(basename "$bin")" "$marker" "$OUT/crash-$v-$m-$init.txt"
      if [ $rc -eq 0 ]; then verdict=ok; elif [ $rc -gt 128 ]; then verdict="signal $((rc - 128))"; else verdict="exit $rc"; fi
      printf '%s\t%s\t%s\t%s\t%s\n' "$v" "$m" "$init" "$rc" "$verdict" >> "$OUT/results.tsv"
      # 실제로 올라온 SDL 라이브러리만 남긴다(시스템 프레임워크 줄은 뺀다).
      grep -E 'libSDL|SDL3|SDL2' "$log.dyld" | sed 's/^dyld\[[0-9]*\]: //' > "$log.libs"; rm -f "$log.dyld"
    done
  done
  # 긴 글자(8바이트 넘게)를 SDL_PeepEvents 로 넣으면 SDL3 의 text 포인터 자리에 글자 바이트가 들어간다.
  marker="$ROOT/bin/.marker"; touch "$marker"; sleep 1
  TEXT_INPUT_TEXT=abcdefghijkl "$bin" peep > "$OUT/run-$v-peep-longtext.txt" 2>&1
  rc=$?
  if [ $rc -eq 0 ]; then verdict=ok; elif [ $rc -gt 128 ]; then verdict="signal $((rc - 128))"; else verdict="exit $rc"; fi
  printf '%s\t%s\t%s\t%s\t%s\n' "$v" "peep-longtext" "events" "$rc" "$verdict" >> "$OUT/results.tsv"
  [ $rc -gt 128 ] && summarize_crash "$(basename "$bin")" "$marker" "$OUT/crash-$v-peep-longtext.txt"
  [ "$LLDB" = 1 ] || continue
  # 개발자 모드가 켜진 기계에서는 lldb 로도 스택과 잘못된 주소를 남긴다.
  lldb --batch -o "process launch -- textinput" -k "thread backtrace" -k "register read x0" \
       -k "disassemble --pc --count 3" -k "image list -b libSDL2-2.0.0.dylib libSDL3.0.dylib libSDL3.dylib" -k "kill" \
       -- "$bin" > "$OUT/lldb-$v-textinput.txt" 2>&1
done
column -t -s "$(printf '\t')" "$OUT/results.tsv"
