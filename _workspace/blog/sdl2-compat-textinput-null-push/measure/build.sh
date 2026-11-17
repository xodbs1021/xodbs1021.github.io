#!/bin/sh
# 공개 저장소(libsdl-org/SDL, libsdl-org/sdl2-compat)에서 판마다 소스를 받아 빌드한다.
# 모든 산출물은 SDLW_ROOT(기본 /tmp/sdlw-work) 아래에만 만든다. Homebrew 설치는 건드리지 않는다.
#
#   sdl2-2.32.10     SDL release-2.32.10         (정식 SDL2)
#   sdl3-3.4.12      SDL release-3.4.12          (2.32.70 과 함께 쓰던 SDL3)
#   sdl3-3.4.20      SDL release-3.4.20          (측정일 최신 SDL3 릴리스)
#   sdl3-main        SDL main                    (기본은 측정 때 커밋 4cc7adca, SDL_MAIN_REF 로 바꿀 수 있음)
#   compat-2.32.70   sdl2-compat release-2.32.70
#   compat-2.32.74   sdl2-compat release-2.32.74 (측정일 최신 릴리스)
#   compat-main      sdl2-compat main            (기본은 측정 때 커밋 2758e13e, COMPAT_MAIN_REF 로 바꿀 수 있음)
set -eu
ROOT=${SDLW_ROOT:-/tmp/sdlw-work}
JOBS=${JOBS:-8}
SDL_MAIN_REF=${SDL_MAIN_REF:-4cc7adcaee482b63b4e1a0de77f52e200aa87b90}
COMPAT_MAIN_REF=${COMPAT_MAIN_REF:-2758e13e84d333b43063af505272ff1c8fd9eca4}
mkdir -p "$ROOT/src" "$ROOT/wt" "$ROOT/build" "$ROOT/inst" "$ROOT/logs"

clone() { # url dir
  [ -d "$ROOT/src/$2/.git" ] || git clone -q --filter=blob:none "$1" "$ROOT/src/$2"
  git -C "$ROOT/src/$2" fetch -q --tags origin
}
worktree() { # repo name ref
  [ -d "$ROOT/wt/$2" ] || git -C "$ROOT/src/$1" worktree add -q --detach "$ROOT/wt/$2" "$3"
  printf '%s %s %s\n' "$2" "$3" "$(git -C "$ROOT/wt/$2" rev-parse HEAD)" >> "$ROOT/refs.txt"
}
cmake_build() { # name [extra cmake args...]
  name=$1; shift
  if [ -f "$ROOT/inst/$name/.done" ]; then echo "skip $name (built)"; return; fi
  cmake -S "$ROOT/wt/$name" -B "$ROOT/build/$name" -DCMAKE_BUILD_TYPE=RelWithDebInfo \
        -DCMAKE_INSTALL_PREFIX="$ROOT/inst/$name" "$@" > "$ROOT/logs/$name.log" 2>&1
  cmake --build "$ROOT/build/$name" -j "$JOBS" >> "$ROOT/logs/$name.log" 2>&1
  cmake --install "$ROOT/build/$name" >> "$ROOT/logs/$name.log" 2>&1
  touch "$ROOT/inst/$name/.done"
  echo "built $name"
}

: > "$ROOT/refs.txt"
clone https://github.com/libsdl-org/SDL.git SDL
clone https://github.com/libsdl-org/sdl2-compat.git sdl2-compat

worktree SDL sdl2-2.32.10 release-2.32.10
worktree SDL sdl3-3.4.12 release-3.4.12
worktree SDL sdl3-3.4.20 release-3.4.20
worktree SDL sdl3-main "$SDL_MAIN_REF"
worktree sdl2-compat compat-2.32.70 release-2.32.70
worktree sdl2-compat compat-2.32.74 release-2.32.74
worktree sdl2-compat compat-main "$COMPAT_MAIN_REF"

cmake_build sdl2-2.32.10 -DSDL_TEST=OFF -DSDL_STATIC=OFF
for v in sdl3-3.4.12 sdl3-3.4.20 sdl3-main; do
  cmake_build "$v" -DSDL_TESTS=OFF -DSDL_EXAMPLES=OFF -DSDL_STATIC=OFF -DSDL_TEST_LIBRARY=OFF
done
# sdl2-compat 은 빌드 때 SDL3 헤더만 쓰고, 실행 때 SDL3 를 dlopen 한다. 짝 SDL3 의 헤더로 빌드한다.
cmake_build compat-2.32.70 -DSDL2COMPAT_TESTS=OFF -DCMAKE_PREFIX_PATH="$ROOT/inst/sdl3-3.4.12"
cmake_build compat-2.32.74 -DSDL2COMPAT_TESTS=OFF -DCMAKE_PREFIX_PATH="$ROOT/inst/sdl3-3.4.20"
cmake_build compat-main    -DSDL2COMPAT_TESTS=OFF -DCMAKE_PREFIX_PATH="$ROOT/inst/sdl3-main"

# sdl2-compat 은 macOS 에서 SDL3 를 먼저 "@loader_path/libSDL3.dylib"(자기 dylib 옆)에서 찾는다
# (src/sdl2_compat.c LoadSDL3Library). 짝 SDL3 를 그 자리에 심볼릭 링크로 둔다.
ln -sf "$ROOT/inst/sdl3-3.4.12/lib/libSDL3.0.dylib" "$ROOT/inst/compat-2.32.70/lib/libSDL3.dylib"
ln -sf "$ROOT/inst/sdl3-3.4.20/lib/libSDL3.0.dylib" "$ROOT/inst/compat-2.32.74/lib/libSDL3.dylib"
ln -sf "$ROOT/inst/sdl3-main/lib/libSDL3.0.dylib"   "$ROOT/inst/compat-main/lib/libSDL3.dylib"
cat "$ROOT/refs.txt"
