---
title: "SDL_TEXTINPUT을 넣자 sdl2-compat이 죽었습니다"
date: 2026-11-18T03:50:50+09:00
description: "SDL2 프로그램이 SDL_PushEvent로 SDL_TEXTINPUT을 넣으면 sdl2-compat에서는 SDL3의 SDL_PushEvent 안에서 주소 0x8을 읽다 SIGSEGV로 죽습니다. Event2to3가 이 이벤트에 NULL을 돌려주고 SDL_PushEvent가 그 값을 확인 없이 넘기기 때문입니다. 정식 SDL 2.32.10에서는 같은 프로그램이 정상이었고, sdl2-compat 2.32.70 · 최신 릴리스 2.32.74 · main(2026-11-16)은 모두 죽었습니다. 2024년 7월 SDL3가 임시 메모리 API를 없앤 날 생긴 코드, SDL_PeepEvents 경로, 회피책, make에 준 DYLD_LIBRARY_PATH가 SIP 때문에 자식에게 닿지 않은 이유까지 공개 재측정과 소스로 정리했습니다."
categories: ["technical-notes"]
tags: ["SDL2", "SDL3", "sdl2-compat", "SDL_PushEvent", "macOS", "SIP"]
draft: false
---

SDL2 프로그램이 [`SDL_PushEvent`](https://wiki.libsdl.org/SDL2/SDL_PushEvent)로 `SDL_TEXTINPUT` 이벤트를 넣으면, [sdl2-compat](https://github.com/libsdl-org/sdl2-compat) 위에서는 SDL3의 `SDL_PushEvent` 안에서 주소 0x8을 읽다 SIGSEGV로 죽습니다. sdl2-compat이 SDL2 이벤트를 SDL3 이벤트로 바꾸는 `Event2to3`가 이 종류에만 NULL을 돌려주고, `SDL_PushEvent`가 그 값을 확인하지 않고 SDL3에 넘기기 때문입니다. 같은 최소 프로그램은 정식 SDL 2.32.10에서 이벤트를 그대로 돌려받았고, sdl2-compat 2.32.70 · 측정일 최신 릴리스 2.32.74 · main(2026년 11월 16일 커밋)에서는 모두 죽었습니다.

발견 · 원인 분석 · 재현은 AI 에이전트(Claude Code와 Codex)가 했습니다. 공개 재측정은 Claude Code가 2026년 11월 18일 macOS(Apple M5)에서 했고, 스크립트와 원자료를 [저장소에 함께 올렸습니다](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/sdl2-compat-textinput-null-push/measure).

## 오픈소스 엔진의 시험을 sdl2-compat에서 돌리자 SDL_PushEvent에서 죽었습니다

처음 이 크래시를 본 곳은 SDL2로 만든 오픈소스 게임 엔진의 시험 묶음이었습니다(2026년 10월, 비공개 기록). macOS의 Homebrew `sdl2`는 정식 SDL2가 아니라 sdl2-compat의 별칭이라([Homebrew sdl2-compat](https://formulae.brew.sh/formula/sdl2-compat)), 시험은 sdl2-compat 2.32.70과 SDL3 3.4.12 위에서 돌았습니다. 메뉴 입력을 흉내 내려고 `SDL_TEXTINPUT`을 넣는 시험 하나가 SIGSEGV로 끝났고, 죽은 자리는 엔진 코드가 아니라 sdl2-compat을 거쳐 들어간 SDL3의 `SDL_PushEvent`였습니다. 같은 시험 묶음을 정식 SDL 2.32.10에 다시 링크하자 실패 없이 끝났습니다.

엔진의 시험 대신, 같은 호출만 하는 C 프로그램 하나로 공개 판들을 다시 쟀습니다. 프로그램은 SDL 2.32.10 헤더로 컴파일하고, `SDL_Init` 뒤 0으로 채운 이벤트에 종류 · 시각 · 글자를 넣어 `SDL_PushEvent`를 부릅니다.

```c
// 발췌: measure/textinput_push.c (출력 · 오류 처리 생략)
SDL_Event ev;
SDL_zero(ev);
ev.type = SDL_TEXTINPUT;
ev.text.timestamp = SDL_GetTicks();
SDL_strlcpy(ev.text.text, "a", sizeof(ev.text.text)); // 32바이트 안에서 NUL로 끝냄
SDL_PushEvent(&ev);
```

## sdl2-compat은 SDL2 이벤트를 SDL3 이벤트로 바꿔 넘깁니다

sdl2-compat은 SDL2와 바이너리 · 소스가 호환되는 API를 내놓고, 안에서는 SDL3를 부르는 호환 층입니다([README](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/README.md)). macOS에서는 자기 dylib 옆의 `libSDL3.dylib`부터 찾아 SDL3를 실행 중에 엽니다([`LoadSDL3Library`](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/src/sdl2_compat.c#L405-L414)). 그래서 앱이 SDL2 모양의 `SDL_Event`를 넘기면, sdl2-compat은 그것을 SDL3 모양으로 바꿔 SDL3 함수에 넘겨야 합니다.

두 모양은 조금 다릅니다. SDL3 이벤트는 머리의 시각이 64비트 나노초라 머리가 16바이트이고([`SDL_CommonEvent`@3.4.20](https://github.com/libsdl-org/SDL/blob/f00dc919ca35b9756316e86c4777392de442f9b2/include/SDL3/SDL_events.h#L296-L301)), SDL2는 32비트 밀리초라 8바이트입니다. `Event2to3`는 머리를 옮겨 적고 나머지 바이트를 통째로 복사한 뒤, 종류별로 달라진 필드만 고칩니다. 키 이벤트는 스캔코드를 바꾸고, 마우스 좌표는 정수에서 실수로 바꿉니다([`Event2to3`@main](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/src/sdl2_compat.c#L2594-L2621)).

글자 입력은 바이트 복사로 옮길 수 없습니다. SDL2의 [`SDL_TextInputEvent`](https://wiki.libsdl.org/SDL2/SDL_TextInputEvent)는 글자를 32바이트 배열로 이벤트 안에 담고([2.32.10 헤더](https://github.com/libsdl-org/SDL/blob/5d249570393f7a37e037abf22cd6012a4cc56a71/include/SDL_events.h#L288-L294)), SDL3의 [`SDL_TextInputEvent`](https://wiki.libsdl.org/SDL3/SDL_TextInputEvent)는 이벤트 밖 문자열을 가리키는 포인터 `const char *text`를 담습니다([3.4.20 헤더](https://github.com/libsdl-org/SDL/blob/f00dc919ca35b9756316e86c4777392de442f9b2/include/SDL3/SDL_events.h#L426-L433)). 바꾸려면 문자열을 둘 메모리가 따로 있어야 합니다.

강조한 길이 `SDL_TEXTINPUT`이 지나는 길입니다. 다른 이벤트는 바뀐 SDL3 이벤트를 넘기지만, 이 길에서는 NULL이 넘어갑니다.

```mermaid {#fig-call-path kind="개념도" caption="SDL2 프로그램의 SDL_PushEvent가 sdl2-compat을 거쳐 SDL3에 닿는 길. SDL_TEXTINPUT만 Event2to3에서 NULL이 되고, 그 NULL이 SDL3의 SDL_PushEvent로 넘어가 첫 줄에서 죽습니다. sdl2-compat main 2758e13e · SDL 3.4.20 소스 기준." source="https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/src/sdl2_compat.c#L2594-L2741"}
flowchart TB
  accTitle: sdl2-compat의 SDL_PushEvent 호출 길
  accDescr: 앱이 SDL2 SDL_PushEvent를 부르면 sdl2-compat의 SDL_PushEvent가 Event2to3로 이벤트를 바꾼다. 키 입력 같은 이벤트는 SDL3 이벤트가 되어 SDL3_PushEvent로 넘어가 큐에 들어간다. SDL_TEXTINPUT은 Event2to3가 NULL을 돌려주고, SDL3_PushEvent가 NULL의 timestamp를 읽다 주소 0x8에서 SIGSEGV로 죽는다.
  app["앱 · SDL2 헤더<br/>SDL_PushEvent 호출"] --> push2["sdl2-compat<br/>SDL_PushEvent"]
  push2 --> conv{"Event2to3<br/>ev.type"}
  conv -->|KEYDOWN · 마우스 등| ok["SDL3 이벤트로 바꿈<br/>return event3"]
  conv -->|SDL_TEXTINPUT| nul["return NULL"]
  ok --> q["SDL3 SDL_PushEvent<br/>큐에 들어감"]
  nul --> crash["SDL3 SDL_PushEvent<br/>NULL의 timestamp 읽기<br/>주소 0x8 · SIGSEGV"]
  style nul fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style crash fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

키 이벤트와 글자 이벤트는 같은 함수를 지나지만, 글자 이벤트만 SDL3에 이벤트 대신 NULL을 건넵니다.

## SDL_TEXTINPUT은 바꿀 짝이 없어 NULL이 됐고, 그 NULL이 그대로 넘어갔습니다

`Event2to3`의 `SDL_EVENT_TEXT_INPUT` 갈래는 글자를 옮기지 않고 NULL을 돌려줍니다. `SDL_PushEvent`는 그 반환값을 바로 `SDL3_PushEvent`에 넘깁니다([`Event2to3`](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/src/sdl2_compat.c#L2594-L2607) · [`SDL_PushEvent`](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/src/sdl2_compat.c#L2730-L2741)).

```c
// 발췌: libsdl-org/sdl2-compat src/sdl2_compat.c @2758e13e (main, 2026-11-16) — 다른 case 생략
static SDL_Event *Event2to3(const SDL2_Event *event2, SDL_Event *event3)
{
    ...
    switch (event2->type) {
    case SDL_EVENT_TEXT_INPUT:
        /* We shouldn't be getting text input events this direction */
        return NULL;
    ...
    }
    return event3;
}

SDL_DECLSPEC int SDLCALL
SDL_PushEvent(SDL2_Event *event2)
{
    SDL_Event event3;
    if (SDL3_PushEvent(Event2to3(event2, &event3))) {
        return 1;
    ...
```

SDL3의 `SDL_PushEvent`는 첫 줄에서 `event->common.timestamp`를 읽습니다([SDL_events.c@3.4.20](https://github.com/libsdl-org/SDL/blob/f00dc919ca35b9756316e86c4777392de442f9b2/src/events/SDL_events.c#L1806-L1810)). `timestamp`는 `type`(4바이트)과 `reserved`(4바이트) 뒤에 있어, NULL에서 이 필드를 읽으면 주소 0x8을 읽게 됩니다. macOS 크래시 보고서가 가리킨 곳도 정확히 여기였습니다. 잘못된 주소는 0x8, 첫 인자 레지스터 x0은 0이었고, 맨 위 프레임은 `libSDL3.0.dylib`의 `SDL_PushEvent_REAL`(SDL_events.c 1808행, 3.4.20), 그 아래가 `libSDL2-2.0.0.dylib`의 `SDL_PushEvent_REAL`(sdl2_compat.c 2683행, 2.32.74)이었습니다.

빨간 카드가 `SDL_TEXTINPUT`입니다. 가운데 칸에서 NULL로 바뀌고도 멈추지 않고 SDL3 칸까지 넘어갑니다.

{{< motion scene="TextInputNull" id="fig-null-push" kind="개념도" caption="같은 길을 지나도 SDL_KEYDOWN은 SDL3 KEY_DOWN으로 바뀌어 큐에 들어가고, SDL_TEXTINPUT은 Event2to3에서 NULL이 된 채 SDL3의 SDL_PushEvent로 넘어가 주소 0x8에서 SIGSEGV로 떨어집니다. 주소 0x8은 크래시 보고서 값이고 움직임의 시간 간격은 설명용입니다." >}}

이 NULL은 처음부터 있던 코드가 아닙니다. 2023년 11월 [이슈 106](https://github.com/libsdl-org/sdl2-compat/issues/106)에서 SDL3 쪽으로 가는 글자 입력을 어떻게 옮길지 논의했고, 한동안 `Event2to3`는 글자를 담을 SDL3 임시 메모리를 잡아 그 포인터를 채웠습니다. 2024년 7월 26일 SDL3가 임시 메모리 함수를 공개 API에서 뺐고([4f552715](https://github.com/libsdl-org/SDL/commit/4f55271571fbaf63fc8c1c0924512628fb6ed970) · [538adc52](https://github.com/libsdl-org/SDL/commit/538adc52d2503e7171165492565c81a04b858e2c)), 같은 날 sdl2-compat은 복사 코드를 지우고 「이 방향으로는 글자 입력 이벤트가 오지 않아야 한다」는 주석과 함께 `SDL_FALSE`를 돌려주게 바꿨습니다([eb998ef6](https://github.com/libsdl-org/sdl2-compat/commit/eb998ef6bab2e1716fafd6831c08288c19e4dbbb)). 한 달 뒤 SDL_bool 정리에서 이 값이 `NULL`로 바뀌었습니다([c58706e9](https://github.com/libsdl-org/sdl2-compat/commit/c58706e945a903d835e7e4a3d46b9e5764c9b4b0)). sdl2-compat의 첫 릴리스인 2.30.50(2025년 1월)부터 모든 릴리스에 이 갈래가 들어 있습니다.

주석은 앱이 글자 입력 이벤트를 직접 넣지 않는다고 가정합니다. 하지만 SDL2 문서는 `SDL_PushEvent`에 넣을 수 있는 종류를 제한하지 않고, 정식 SDL2는 넣은 `SDL_TEXTINPUT`을 큐에 담아 돌려줍니다. 입력을 흉내 내는 시험이 이 가정에 걸렸습니다.

`SDL_PeepEvents`로 넣어도 피할 수 없었습니다. 이 함수는 `Event2to3`의 반환값을 보지 않고 반쯤 복사된 이벤트를 SDL3 큐에 넣습니다([`SDL_PeepEvents`](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/src/sdl2_compat.c#L3135-L3157)). 그 이벤트의 포인터 자리에는 SDL2 글자 배열의 바이트가 들어가고, 꺼낼 때 `Event3to2`가 그 포인터에서 글자를 복사하다 죽습니다([`Event3to2`](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/src/sdl2_compat.c#L2371-L2373)). 글자가 "a"이면 잘못된 주소가 0x0, "abcdefghijkl"이면 0x6c6b6a6968676660이었습니다. 앞 값은 글자 "efghijkl"의 바이트 그대로입니다.

## 정식 SDL2에서는 같은 프로그램이 정상입니다

같은 목적 파일을 판마다 다른 `libSDL2-2.0.0.dylib`에 링크했습니다. 실제로 올라온 라이브러리는 `DYLD_PRINT_LIBRARIES`로, 판은 `SDL_GetVersion`으로 확인했습니다. 대조로 `SDL_KEYDOWN`을 넣어 보고, 회피책 후보로 `SDL_RegisterEvents`로 받은 사용자 이벤트에 글자 포인터를 실어 보냈습니다.

| 라이브러리(실제 로드) | SDL_GetVersion | KEYDOWN | TEXTINPUT | PeepEvents로 TEXTINPUT | 사용자 이벤트 |
|---|---|---|---|---|---|
| SDL 2.32.10(정식, 소스 빌드) | 2.32.10 | 정상 | 정상, "a"를 돌려받음 | 정상 | 정상 |
| sdl2-compat 2.32.70 + SDL3 3.4.12 | 2.32.70 | 정상 | SIGSEGV · 0x8 | 꺼낼 때 SIGSEGV | 정상 |
| sdl2-compat 2.32.74 + SDL3 3.4.20 | 2.32.74 | 정상 | SIGSEGV · 0x8 | 꺼낼 때 SIGSEGV | 정상 |
| Homebrew sdl2-compat 2.32.74 + sdl3 3.4.18 | 2.32.74 | 정상 | SIGSEGV · 0x8 | 꺼낼 때 SIGSEGV | 정상 |
| sdl2-compat main + SDL3 main | 2.32.75 | 정상 | SIGSEGV · 0x8 | 꺼낼 때 SIGSEGV | 정상 |

`SDL_INIT_EVENTS`만 켠 경우와 `SDL_INIT_VIDEO`에 `SDL_StartTextInput()`까지 부른 경우가 같았습니다. TEXTINPUT 크래시 스택은 sdl2-compat 판 넷 모두 「SDL3 `SDL_PushEvent_REAL` ← sdl2-compat `SDL_PushEvent_REAL` ← 시험 프로그램」이었고, 소스 행이 남은 세 판에서는 행 번호만 달랐습니다(SDL_events.c 1804 · 1808 · 1886행, sdl2_compat.c 2636 · 2683 · 2734행). Homebrew 판은 디버그 정보가 없어 기호만 남았습니다.

## 최신 릴리스와 main에서도 같은 코드입니다

측정일의 최신 릴리스는 sdl2-compat 2.32.74(2026년 10월 2일)와 SDL 3.4.20(11월 3일)이고, main은 11월 16일 커밋 `2758e13e`까지 봤습니다. 세 판의 `TEXT_INPUT` 갈래와 `SDL_PushEvent` 본문은 글자 하나 다르지 않았고, 위치만 밀렸습니다([2.32.70 2508–2509행](https://github.com/libsdl-org/sdl2-compat/blob/a53b6ad90ecd2d0ccfe01d5cfd2059793acf8c12/src/sdl2_compat.c#L2507-L2509) · [2.32.74 2555–2556행](https://github.com/libsdl-org/sdl2-compat/blob/e4df8a55f20da762290a78c2bbe8f8d89d01486a/src/sdl2_compat.c#L2554-L2556) · [main 2606–2607행](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/src/sdl2_compat.c#L2605-L2607)). SDL3 쪽 `SDL_PushEvent`도 3.4.12부터 main까지 NULL을 확인하지 않습니다. 고쳐지지 않았으니 고친 커밋도 없습니다.

2026년 11월 18일 sdl2-compat 이슈 · PR을 「SDL_TEXTINPUT」 · 「PushEvent」 · 「text input」으로 찾았을 때, 앱이 넣은 글자 입력 이벤트로 죽는다는 보고는 없었습니다. 가장 가까운 기록은 위의 이슈 106과 그 고침 [PR 107](https://github.com/libsdl-org/sdl2-compat/pull/107)이고, 둘 다 임시 메모리를 쓰던 시절 이야기입니다.

## 회피책은 정식 SDL2에 링크하거나 사용자 이벤트로 바꾸는 것입니다

- **시험은 정식 SDL2에 링크합니다.** 최소 프로그램과 처음의 엔진 시험 묶음 모두 SDL 2.32.10에서 정상이었습니다. Homebrew `sdl2`는 sdl2-compat이므로, [SDL 저장소의 release-2.32.10](https://github.com/libsdl-org/SDL/tree/release-2.32.10) 같은 정식 판을 따로 빌드해 경로를 지정해 링크해야 합니다.
- **글자를 큐로 보내야 한다면 사용자 이벤트를 씁니다.** `SDL_RegisterEvents`로 받은 종류에 글자 포인터를 실으면 모든 판에서 정상으로 돌아왔습니다. 다만 받는 쪽이 이 종류를 `SDL_TEXTINPUT`처럼 처리하게 바꿔야 하므로, 실제 글자 입력 처리 경로를 시험하는 목적이라면 맞지 않습니다.
- **`SDL_PeepEvents`는 회피책이 아닙니다.** 넣을 때는 살아남지만 꺼낼 때 죽고, 글자 바이트가 포인터로 읽힙니다.
- **`SDL_PushEvent`의 반환값을 확인하는 것으로는 막지 못합니다.** 반환하기 전에 SDL3 안에서 죽습니다.

남은 점도 있습니다. 재측정은 macOS arm64에서만 했습니다. `Event2to3`는 플랫폼과 무관한 C 코드라 Linux · Windows에서도 같은 길을 탈 것으로 보이지만, 확인하지 않았습니다. 글자 편집(`SDL_TEXTEDITING`)이나 파일 끌어놓기 이벤트를 넣는 경우도 재지 않았습니다. 스택은 lldb가 아니라 macOS 크래시 보고서에서 뽑았습니다. 개발자 모드가 꺼진 측정 기계에서 lldb가 권한 창을 기다리며 멈췄기 때문입니다. 크래시 보고서에도 기호 · 소스 행 · 잘못된 주소가 남고, 처음 기록은 lldb로 같은 NULL 접근을 재현했습니다. 상류에는 아직 보고하지 않았습니다.

## make에 준 DYLD_LIBRARY_PATH가 자식에게 닿지 않은 것은 SIP 때문이었습니다

정식 SDL2로 시험을 돌릴 때, `DYLD_LIBRARY_PATH`를 앞에 붙여 `make`를 실행하는 방법은 시험 바이너리에 듣지 않았습니다. 결국 바이너리를 정식 SDL2 경로로 다시 링크했습니다. 같은 일을 환경 변수 하나만 출력하는 프로그램으로 다시 재봤습니다.

| 실행 방법 | 자식 프로그램이 본 DYLD_LIBRARY_PATH |
|---|---|
| 프로그램을 직접 실행 | 있음 |
| `/bin/sh -c`로 실행 | 없음 |
| `/usr/bin/make` 레시피(셸 없이 · 셸로) | 없음 · 없음 |
| Command Line Tools의 make를 전체 경로로(셸 없이 · 셸로) | 있음 · 없음 |
| make 명령줄 변수로 줌(셸 없이 · 셸로) | 있음 · 없음 |

`ls -lO`로 보면 `/usr/bin/make`와 `/bin/sh`에는 `restricted` 표시가 있고, 실제 make가 있는 Command Line Tools 폴더의 make에는 없습니다. Apple 문서는 SIP(System Integrity Protection, 시스템 무결성 보호)가 보호된 프로세스를 띄울 때 「`DYLD_LIBRARY_PATH` 같은 동적 링커 환경 변수를 지운다」고 적습니다([System Integrity Protection Guide, Runtime Protections](https://developer.apple.com/library/archive/documentation/Security/Conceptual/System_Integrity_Protection_Guide/RuntimeProtections/RuntimeProtections.html)). `/usr/bin/make`는 그 자체가 보호된 실행 파일이라 make가 뜨는 순간 변수가 사라집니다. 보호되지 않은 make를 써도 셸을 거치는 레시피는 `/bin/sh`가 뜰 때 다시 지워집니다.

macOS에서 링크할 라이브러리를 바꿀 때는 환경 변수를 make 바깥에서 주지 말고, 링크할 때 `-Wl,-rpath`나 dylib 전체 경로로 정하는 편이 확실합니다. 이번 재측정의 `run.sh`도 같은 목적 파일을 판마다 rpath를 달리해 링크했습니다. sdl2-compat에서 입력을 흉내 내는 시험이 이유 없이 SDL3 안에서 죽는다면, 먼저 어떤 SDL2가 올라왔는지 확인하고 넣은 이벤트 종류가 `Event2to3`에서 NULL이 되는지 보십시오.

## 측정 조건

- **처음 발견(비공개 기록 요약).** 2026년 10월, AI 에이전트가 오픈소스 게임 엔진의 시험 묶음을 macOS에서 Homebrew sdl2-compat 2.32.70 · SDL3 3.4.12로 돌리다 SIGSEGV를 봤고, lldb로 NULL 접근을 재현했습니다. 같은 시험 묶음은 소스에서 빌드한 SDL 2.32.10(커밋 `5d249570`)에 명시적으로 다시 링크한 뒤 실패 없이 끝났습니다. 엔진 이름 · 시험 코드 · 로그는 싣지 않습니다.
- **공개 재측정.** 2026년 11월 18일 03:44 KST(행렬) · 03:29(SIP), AI(Claude Code). macOS 27.0.1(26A434), Apple M5(arm64), Apple clang 21.0.0, CMake 4.4.4, SIP 켜짐. 라이브러리는 공개 저장소의 태그 · 커밋을 RelWithDebInfo로 빌드했습니다. SDL `release-2.32.10`(`5d249570`) · `release-3.4.12`(`f87239e7`) · `release-3.4.20`(`f00dc919`) · main(`4cc7adca`), sdl2-compat `release-2.32.70`(`a53b6ad9`) · `release-2.32.74`(`e4df8a55`) · main(`2758e13e`). sdl2-compat은 짝 SDL3의 헤더로 빌드하고, 짝 SDL3를 자기 dylib 옆에 두어 그것을 열게 했습니다. Homebrew 판은 설치된 sdl2-compat 2.32.74 · sdl3 3.4.18에 링크만 했습니다.
- **프로그램.** `textinput_push.c`를 SDL 2.32.10 헤더로 `-O0 -g` 컴파일해 목적 파일 하나를 만들고 판마다 rpath를 달리해 링크했습니다(`sizeof(SDL_Event)` 56, SDL2 ABI). 종류마다 한 번씩 돌렸습니다(정상은 종료 코드 0, 크래시는 시그널 11). 중간에 멈춘 첫 회차에서도 2.32.70의 결과는 같았습니다.
- **스택.** macOS 크래시 보고서(`~/Library/Logs/DiagnosticReports/*.ips`)에서 예외 · 잘못된 주소 · x0 · 앞 프레임만 `crash_summary.py`로 뽑았습니다. `run.sh`는 개발자 모드를 켠 기계라면 `LLDB=1`로 lldb 스택도 남깁니다.
- **명령과 원자료.** `measure/build.sh`가 `/tmp/sdlw-work`에 소스를 받아 빌드하고, `OUT=<폴더> measure/run.sh`가 결과 표와 실행 출력 · 로드된 라이브러리 · 크래시 요약을 씁니다. `measure/sip-probe.sh`는 SIP 표를 다시 만듭니다. 커밋된 결과는 [`measure/raw/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/sdl2-compat-textinput-null-push/measure/raw)에 있습니다. 끝나면 `/tmp/sdlw-work` · `/tmp/sdlw-sip`과 크래시 보고서 `textinput_push-*.ips`를 지웁니다.

## 출처

sdl2-compat 소스(libsdl-org/sdl2-compat)
- [README @2758e13e](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/README.md) — SDL2 API를 내놓고 안에서 SDL3를 쓰는 호환 층
- `src/sdl2_compat.c` main `2758e13e`(2026-11-16): [`LoadSDL3Library`](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/src/sdl2_compat.c#L405-L414) · [`Event3to2` TEXT_INPUT](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/src/sdl2_compat.c#L2371-L2373) · [`Event2to3`](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/src/sdl2_compat.c#L2594-L2621) · [`SDL_PushEvent`](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/src/sdl2_compat.c#L2730-L2741) · [`SDL_PeepEvents`](https://github.com/libsdl-org/sdl2-compat/blob/2758e13e84d333b43063af505272ff1c8fd9eca4/src/sdl2_compat.c#L3135-L3157)
- 같은 갈래: [release-2.32.70](https://github.com/libsdl-org/sdl2-compat/blob/a53b6ad90ecd2d0ccfe01d5cfd2059793acf8c12/src/sdl2_compat.c#L2496-L2509) · [release-2.32.74](https://github.com/libsdl-org/sdl2-compat/blob/e4df8a55f20da762290a78c2bbe8f8d89d01486a/src/sdl2_compat.c#L2543-L2556)
- 커밋 [eb998ef6](https://github.com/libsdl-org/sdl2-compat/commit/eb998ef6bab2e1716fafd6831c08288c19e4dbbb)(2024-07-26, 글자 복사를 지우고 `SDL_FALSE` 반환) · [c58706e9](https://github.com/libsdl-org/sdl2-compat/commit/c58706e945a903d835e7e4a3d46b9e5764c9b4b0)(2024-08-27, `NULL`로)
- [이슈 106](https://github.com/libsdl-org/sdl2-compat/issues/106) · [PR 107](https://github.com/libsdl-org/sdl2-compat/pull/107) — 2023년 글자 입력 · 끌어놓기 이벤트 변환 논의와 고침
- [릴리스 2.32.74](https://github.com/libsdl-org/sdl2-compat/releases/tag/release-2.32.74) — 측정일 최신 릴리스

SDL 소스와 문서(libsdl-org/SDL, SDL Wiki)
- SDL 3.4.20 `f00dc919`: [`SDL_PushEvent`](https://github.com/libsdl-org/SDL/blob/f00dc919ca35b9756316e86c4777392de442f9b2/src/events/SDL_events.c#L1806-L1810) · [`SDL_CommonEvent`](https://github.com/libsdl-org/SDL/blob/f00dc919ca35b9756316e86c4777392de442f9b2/include/SDL3/SDL_events.h#L296-L301) · [`SDL_TextInputEvent`](https://github.com/libsdl-org/SDL/blob/f00dc919ca35b9756316e86c4777392de442f9b2/include/SDL3/SDL_events.h#L426-L433)
- SDL 2.32.10 `5d249570`: [`SDL_TextInputEvent`](https://github.com/libsdl-org/SDL/blob/5d249570393f7a37e037abf22cd6012a4cc56a71/include/SDL_events.h#L288-L294) · [release-2.32.10 트리](https://github.com/libsdl-org/SDL/tree/release-2.32.10)
- SDL 커밋 [4f552715](https://github.com/libsdl-org/SDL/commit/4f55271571fbaf63fc8c1c0924512628fb6ed970) · [538adc52](https://github.com/libsdl-org/SDL/commit/538adc52d2503e7171165492565c81a04b858e2c) — 2024-07-26 임시 메모리를 공개 API에서 뺌
- SDL Wiki: [SDL2/SDL_PushEvent](https://wiki.libsdl.org/SDL2/SDL_PushEvent) · [SDL2/SDL_TextInputEvent](https://wiki.libsdl.org/SDL2/SDL_TextInputEvent) · [SDL3/SDL_TextInputEvent](https://wiki.libsdl.org/SDL3/SDL_TextInputEvent)

macOS · 배포
- Apple, [System Integrity Protection Guide — Runtime Protections](https://developer.apple.com/library/archive/documentation/Security/Conceptual/System_Integrity_Protection_Guide/RuntimeProtections/RuntimeProtections.html) — 보호된 프로세스를 띄울 때 dyld 환경 변수를 지움
- [Homebrew sdl2-compat](https://formulae.brew.sh/formula/sdl2-compat) — 별칭 `sdl2`
