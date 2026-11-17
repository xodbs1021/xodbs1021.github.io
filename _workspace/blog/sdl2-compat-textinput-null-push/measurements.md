# 공개 재측정 — sdl2-compat 에 SDL_TEXTINPUT 을 넣으면

수행: AI(Claude Code), 2026-11-18 03:29(SIP) · 03:44(행렬) KST. 게임 · 자산 없이 최소 C 프로그램만 썼다.

## 환경

- macOS 27.0.1(26A434), Apple M5(arm64), Apple clang 21.0.0, CMake 4.4.4, SIP 켜짐, 개발자 모드 꺼짐.
- 빌드(measure/build.sh, 모두 RelWithDebInfo, 공개 저장소의 태그 · 커밋):

| 이름 | 저장소 | 참조 | 커밋 |
|---|---|---|---|
| sdl2-2.32.10 | libsdl-org/SDL | release-2.32.10 | 5d249570393f7a37e037abf22cd6012a4cc56a71 |
| sdl3-3.4.12 | libsdl-org/SDL | release-3.4.12 | f87239e71e42da91ca317a12eefb82cfbf3393eb |
| sdl3-3.4.20 | libsdl-org/SDL | release-3.4.20(측정일 최신) | f00dc919ca35b9756316e86c4777392de442f9b2 |
| sdl3-main | libsdl-org/SDL | main | 4cc7adcaee482b63b4e1a0de77f52e200aa87b90 |
| compat-2.32.70 | libsdl-org/sdl2-compat | release-2.32.70 | a53b6ad90ecd2d0ccfe01d5cfd2059793acf8c12 |
| compat-2.32.74 | libsdl-org/sdl2-compat | release-2.32.74(측정일 최신) | e4df8a55f20da762290a78c2bbe8f8d89d01486a |
| compat-main | libsdl-org/sdl2-compat | main(2026-11-16) | 2758e13e84d333b43063af505272ff1c8fd9eca4 |

- Homebrew: sdl2-compat 2.32.74 · sdl3 3.4.18(읽기 · 링크만, 업그레이드 · 제거 안 함).

## 프로그램

`textinput_push.c` 를 SDL 2.32.10 헤더로 한 번 컴파일(`-O0 -g`)하고, 판마다 `libSDL2-2.0.0.dylib` 에 rpath 로 링크했다. `SDL_Init(SDL_INIT_EVENTS)`(또는 `SDL_INIT_VIDEO` + `SDL_StartTextInput()`) 뒤 `SDL_zero` 한 이벤트에 필드를 채우고, 글자는 `SDL_strlcpy` 로 32바이트 안에서 NUL 로 끝낸다. `sizeof(SDL_Event)` 56 · `sizeof(SDL_TextInputEvent)` 44(SDL2 ABI)를 출력으로 확인했다.

## 결과(raw/matrix/results.tsv)

| 판(실제 로드된 라이브러리) | keydown | textinput | peep(ADDEVENT 뒤 poll) | user 이벤트 |
|---|---|---|---|---|
| SDL 2.32.10 | 정상 | 정상(poll 로 "a") | 정상 | 정상 |
| sdl2-compat 2.32.70 + SDL3 3.4.12 | 정상 | SIGSEGV | SIGSEGV(poll 중) | 정상 |
| sdl2-compat 2.32.74 + SDL3 3.4.20 | 정상 | SIGSEGV | SIGSEGV(poll 중) | 정상 |
| Homebrew sdl2-compat 2.32.74 + sdl3 3.4.18 | 정상 | SIGSEGV | SIGSEGV(poll 중) | 정상 |
| sdl2-compat main(2.32.75) + SDL3 main | 정상 | SIGSEGV | SIGSEGV(poll 중) | 정상 |

- textinput · keydown 은 EVENTS 와 VIDEO 초기화 둘 다 같은 결과.
- 로드 확인: `DYLD_PRINT_LIBRARIES` 의 SDL 줄(`run-*.txt.libs`), `SDL_GetVersion` 출력(2.32.10 / 2.32.70 / 2.32.74 / 2.32.74 / 2.32.75).
- textinput 스택(모든 sdl2-compat 판 같음, 크래시 보고서 요약 `crash-*-textinput-events.txt`):
  - EXC_BAD_ACCESS(SIGSEGV) KERN_INVALID_ADDRESS at 0x8, x0 = 0
  - 0 libSDL3.0.dylib `SDL_PushEvent_REAL` (SDL_events.c:1804 / 1808 / 1886)
  - 1 libSDL2-2.0.0.dylib `SDL_PushEvent_REAL` (sdl2_compat.c:2636 / 2683 / 2734)
  - 2 push_and_report → 3 main
  - Homebrew 판은 기호만 있고 소스 행 없음.
- peep 스택: `_platform_strlcpy` ← `Event3to2`(sdl2_compat.c:2276 / 2329 / 2372) ← `SDL_WaitEventTimeout_REAL` ← `SDL_PollEvent`. 잘못된 주소 0x0(글자 "a"), 글자 "abcdefghijkl" 이면 0x6c6b6a6968676660(글자 바이트 "efghijkl" 가 포인터 자리에 들어감).

## lldb 를 쓰지 못한 이유

`lldb --batch -o "process launch"` 가 개발자 모드가 꺼진 이 기계에서 권한 창을 기다리며 멈췄다(DevToolsSecurity: disabled). 띄운 lldb · debugserver · 시험 프로세스는 직접 껐다. 스택은 macOS 가 남긴 크래시 보고서(.ips)에서 `crash_summary.py` 로 뽑았다(기호 · 소스 행 · 잘못된 주소 · x0). `run.sh` 는 `LLDB=1` 일 때만 lldb 를 돌린다. 비공개 원 기록(2026-10)은 lldb 로 같은 NULL 접근을 재현했다고 적는다.

## SIP 재현(raw/sip.txt, sip-probe.sh)

| 실행 | 자식이 본 DYLD_LIBRARY_PATH |
|---|---|
| 직접 실행 | 있음 |
| `/bin/sh -c` 의 자식 | 없음 |
| `/usr/bin/make`(xcrun 심) 레시피 — 셸 없이 실행 · 셸로 실행 | 없음 · 없음 |
| CLT make 를 전체 경로로 — 셸 없이 · 셸로 | 있음 · 없음 |
| make 명령줄 변수 `DYLD_LIBRARY_PATH=…` — 셸 없이 · 셸로 | 있음 · 없음 |

`ls -lO`: `/usr/bin/make` · `/bin/sh` 는 `restricted`, CLT make 는 아님.

## 다시 돌리기

```sh
measure/build.sh                 # /tmp/sdlw-work 에 소스 받고 빌드(약 5분, 10코어)
OUT=/tmp/sdlw-out measure/run.sh # 결과 표 출력, OUT 에 원자료
measure/sip-probe.sh             # /tmp/sdlw-sip
```

끝나면 `/tmp/sdlw-work`, `/tmp/sdlw-sip`, `~/Library/Logs/DiagnosticReports/textinput_push-*.ips` 를 지운다.
