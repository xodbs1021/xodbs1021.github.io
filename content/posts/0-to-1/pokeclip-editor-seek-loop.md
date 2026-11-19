---
title: "재생 전 검은 미리보기는 µs 아래를 버린 시크 순환이었습니다"
date: 2026-11-16T08:02:24+09:00
author: "김태윤"
categories: ["projects"]
tags: ["PokeClip", "HTMLMediaElement", "Chrome", "currentTime", "시크"]
draft: false
description: "PokéClip 편집기 미리보기가 재생을 누르기 전까지 검었던 원인. 편집기 재생 노드가 같은 자리(10.437초)를 약 21ms마다 다시 넣으며 48초 동안 시크를 되풀이했고, Chrome이 멈춘 영상의 currentTime에서 µs 아래를 버리는 동작과 반복 구간 시작의 엄격 비교가 만나 생긴 순환이었습니다. 기록 도구의 blob: 503 · 숨김 · 가림 · 파일 가설을 지운 과정, Chrome 157 공개 재측정과 Chromium 소스 근거, 1ms 여유를 고른 이유와 시험이 보장하는 범위, 운영 반영 뒤 위치 넣기 1번까지."
---

PokéClip 편집기에서 하이라이트 카드를 열면 미리보기가 재생을 누르기 전까지 검었습니다. 편집기의 숨은 영상 노드는 구간 시작(10.437초)을 약 21ms마다 다시 넣으며 시크를 되풀이했고, 재생을 누를 때까지 48초 동안 멈추지 않았습니다. Chrome은 멈춘 영상에 넣은 `currentTime`에서 µs(100만분의 1초) 아래를 버리고, 편집기의 반복 경계는 그렇게 깎인 위치를 구간 시작과 `<`로 비교해 「시작 앞」으로 봤습니다. 시작 판정에 1ms 여유를 둔 판을 운영에 반영한 뒤, 같은 카드의 위치 넣기는 1번으로 끝났고 미리보기는 재생 전에 그림을 보였습니다.

고침 착수와 머지는 제가 정했고, 운영 반영도 제가 승인했습니다. 조사 · 원인 확정 · 구현 · 시험 · 실측은 AI 에이전트(Claude Code와 Codex)가 했습니다. 고침은 11월 16일 06시 54분 develop에 병합됐고(PokeClip-mono PR 520), 같은 날 운영 웹에 반영해 다시 쟀습니다.

## 편집기 미리보기가 재생을 누르기 전까지 검었습니다

편집기는 [방송 중에도 편집할 수 있게 나눈 경로](/posts/0-to-1/pokeclip-live-editing-boundaries/) 가운데 되감기 목록에서 영상을 받습니다. 구간 앞뒤 여유를 포함한 창의 조각을 받아 [mediabunny](https://mediabunny.dev/) 1.65.2로 다시 인코딩하지 않고 mp4 하나로 다시 싸고(`remuxWindow.ts`@2e989769), 그 결과를 Blob으로 만들어 `blob:` 주소로 숨은 `<video>`에 넣습니다(`useEditorVideoPlayback.ts`@2e989769). 같은 Blob을 노드 둘이 씁니다. 재생 노드는 미리보기 화면을 맡고, 필름띠 노드는 아래 타임라인의 작은 그림을 뽑습니다. 편집기를 열면 재생 노드는 메타데이터를 받은 뒤 구간 시작으로 한 번 옮겨 그 자리 그림을 보여 줘야 합니다.

11월 16일 04시 34분, 바로 전 변경을 운영에서 확인한 측정의 망 기록에 `blob:` 읽기가 503으로 18건 찍혀 있었습니다. 재생은 정상이었습니다. 이 503을 좇아 05시 52분 운영 편집기에 계측 코드를 넣었을 때, 카드 하나의 편집기 미리보기가 약 20초 동안 검게 남는 것을 함께 봤습니다. 재생 노드의 `readyState`는 1(메타데이터만 있음)에 머물렀고, 재생을 누르자 그림이 바로 나왔습니다.

## 기록 도구가 보여 준 blob: 503은 실패가 아니었습니다

운영 편집기의 로그인 세션이 제 Chrome에 있어서, AI가 제 Chrome의 [Claude in Chrome](https://code.claude.com/docs/en/chrome) 확장 도구로 새 탭을 열어 쟀습니다. 503도 이 도구의 망 기록에 찍힌 값이었습니다.

로컬에서 합성 파일(85.5MB mp4)로 같은 꼴을 만들어 두 도구로 견줬습니다. 같은 Blob 노드 둘로 빠른 시크 12번, 기다리는 시크 6번을 한 뒤 새 주소로 바꾸고 옛 주소를 [`URL.revokeObjectURL`](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static)로 지웠습니다. [CDP(Chrome DevTools Protocol)](https://chromedevtools.github.io/devtools-protocol/)로 잰 자동화 Chrome에서는 지우기 전 `blob:` 읽기 15건이 모두 206이었습니다. 지운 주소를 쥔 노드가 버퍼 밖을 다시 읽은 6건만 `net::ERR_FILE_NOT_FOUND`로 실패했습니다. 같은 페이지를 확장 도구로 재자 53건 가운데 46건이 503이었습니다. 첫 요청부터, 주소를 지우기 전에도, 실행이 끝난 뒤에도 503이 붙었습니다. 노드를 문서에서 떼는 페이지에서는 정상 재생 중이던 읽기를 포함한 23건이 모두 503이었습니다. 이 도구의 `blob:` 503은 실패 표시가 아니었고, 진짜 실패는 CDP 기록으로만 가를 수 있었습니다.

운영 편집기에서는 페이지 안에 계측 코드를 넣어 주소를 지우는 순간 그 주소를 쥔 노드를 봤습니다. 재생 노드는 이미 문서 밖에서 비워진 상태(`networkState` 3)였고, 필름띠 노드는 지운 뒤 49–59ms 안에 `abort` · `emptied`로 비워졌습니다. 지운 뒤 10초를 기다려도 읽기 사건은 0건이었습니다. 편집기의 노드 정리는 운영에서 그대로 동작했고, 503 18건은 검은 화면의 단서가 아니었습니다.

## 숨김 · 가림 · 파일 가설을 차례로 지웠습니다

검은 화면에는 그럴듯한 원인이 셋 있었습니다. 편집기 노드는 1px · 투명도 0으로 숨겨져 있고, 04시 34분 측정의 콘솔에는 문서가 숨겨진 상태라는 메시지가 한 줄 있었으니 탭이 가려졌을 수 있으며, 영상은 브라우저가 다시 싼 파일입니다. 세 가설은 06시 1분부터 12분 사이에 실측으로 하나씩 지워졌습니다.

```mermaid {#fig-investigation kind="개념도" caption="검은 미리보기의 원인을 좁힌 순서. 숨김 · 가림 · 파일 가설을 실측으로 지운 뒤, 페이지 안 추적이 시크 순환을 잡고 브라우저 실측과 훅 단위 재현이 원인을 확정했습니다. 2026년 11월 16일 06:01–06:22 조사 기록 재구성."}
flowchart TB
  accTitle: 검은 미리보기의 원인을 좁힌 순서
  accDescr: 재생 전 검은 미리보기의 원인으로, 같은 꼴로 숨긴 노드가 1초 안에 준비돼 숨김 가설을, 탭 보임 상태가 내내 visible이라 가림 가설을, 같은 Blob으로 새로 만든 노드가 1초 안에 시크를 마쳐 파일 가설을 지웠다. 남은 것은 편집기 재생 노드만 seeking에 머문다는 사실이었고, 추적이 21ms마다 같은 자리를 다시 넣는 순환을 잡았으며, Chrome이 µs 아래를 버리는 동작과 엄격 비교의 조합으로 원인을 확정한 뒤 시작 판정에 1ms 여유를 두었다.
  h1[가설 1<br/>숨긴 노드] -->|기각 · 1px 노드도<br/>1초 안 준비| h2[가설 2<br/>탭이 가려짐]
  h2 -->|기각 · 내내 visible| h3[가설 3<br/>다시 싼 파일]
  h3 -->|기각 · 같은 Blob 새 노드는<br/>1초 안 시크 끝| n[편집기 재생 노드만<br/>seeking에 머묾]
  n -->|추적| t[21ms마다<br/>같은 자리 다시 넣기]
  t -->|실측 · 재현| c[µs 아래 버림<br/>× 엄격 비교<br/>→ 시작에 1ms 여유]
  style c fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

숨김 가설은 06시 1분 로컬에서 지웠습니다. 1px · 투명도 0 · `preload="auto"`로 숨긴 노드를 메타데이터 뒤 시크시키자 1초 안에 `readyState` 4가 되고 그림이 나왔습니다.

가림 가설은 06시 4분 운영 카드에서 1초 간격 기록으로 지웠습니다. 편집을 누른 뒤 약 36초 동안 페이지는 줄곧 `visible`이었고 포커스도 있었습니다. 그동안 재생 노드는 `readyState` 1 · `seeking` true · 위치 10.44초에 그대로였고 미리보기 밝기는 0이었습니다. 필름띠 노드는 같은 시간에 `readyState` 4였고, 재생을 누르자 재생 노드도 1초 안에 4가 됐습니다. 첫 시크가 끝나지 않는 것이 문제였습니다. 06시 7분에는 로컬에서 소리를 켜고 끄거나 메타데이터 전후에 시크하거나 두 번 시크한 변형 여섯을 돌렸고, 모두 1초 안에 끝났습니다.

파일 가설은 06시 12분 운영 편집기 안에서 지웠습니다. 편집기가 쓰는 Blob을 그대로 받아 새 노드 넷을 만들자, 넷 모두 1초 안에 시크를 마치고 그림을 냈습니다. 같은 순간 편집기 재생 노드는 영상 전체(0–81.24초)를 버퍼에 받아 두고도 `seeking`에서 벗어나지 못했고, 위치를 다시 넣어도 그대로였습니다. 파일은 정상이었고, 편집기가 그 노드를 다루는 순서에 원인이 있었습니다.

## 페이지 안 추적이 21ms마다 같은 자리로 되돌아가는 순환을 잡았습니다

다음 측정은 `HTMLMediaElement`의 `currentTime` · `muted` · `playbackRate` 설정, `play()` · `pause()` · `load()` 호출, 미디어 사건 18종을 모두 감싸 시각과 함께 적게 했습니다. 편집기를 열고 아무것도 누르지 않은 채 기다리자 재생 노드에서 같은 7줄이 되풀이됐습니다.

```text
+0ms  set currentTime=10.437   [readyState 4 · seeking 0]  ← 시크가 막 끝난 자리
+0ms  ev  seeked               [readyState 1 · seeking 1]
+0ms  set currentTime=10.437
+0ms  ev  canplay
+0ms  ev  canplaythrough
+0ms  ev  seeking
+1ms  ev  seeking
(약 21ms 뒤 첫 줄로)
```

추적은 넣은 값을 셋째 자리까지만 적어, 실제로 넣은 값의 µs 아래 자릿수는 기록에 없습니다.

시크가 끝나 `readyState`가 4가 된 바로 그 순간 같은 값을 다시 넣어 새 시크가 시작되고, 이어서 오는 [`seeked`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/seeked_event) 처리 중에 한 번 더 넣습니다. 재생 직전 54바퀴는 평균 약 21ms 간격으로, 초당 약 47번 `seeked`가 난 셈입니다. 첫 시크부터 재생을 누를 때까지 48초 동안 이 순환이 끊기지 않았고, 그 사이 `muted` · `pause` · `play` · `playbackRate` 호출은 없었습니다. 재생을 누르자 위치가 구간 시작을 넘어가며 다시 넣기가 멈췄습니다.

편집기 코드에서 이 꼴을 만드는 길은 하나였습니다. 편집기는 `seeked`도 `timeupdate` 처리기로 받고, 그 처리기는 위치를 편집기 초로 바꿔 반복 경계 판정 `boundaryAction`에 넘깁니다. 「구간 반복」이 켜져 있고 위치가 시작보다 작으면 판정은 시작으로 다시 옮기라고 답합니다(`useEditorVideoPlayback.ts`@2e989769 처리기 · `seeked` 등록). [HTML 표준의 시크 절차](https://html.spec.whatwg.org/multipage/media.html#seeking)는 시크 끝에 `timeupdate`와 `seeked`를 차례로 냅니다. 한 바퀴에 위치를 두 번 넣은 것도 이 두 사건 때문으로 봅니다. 추적 목록에 `timeupdate`가 빠져 있어서, 첫 넣기가 `timeupdate` 처리기에서 나왔다는 것은 코드와 맞춰 본 해석입니다. 남은 질문은 시작으로 옮긴 노드가 왜 매번 「시작 앞」에 있느냐였습니다.

## Chrome은 멈춘 영상의 currentTime에서 µs 아래를 버립니다

멈춘 영상에 µs 아래 자릿수가 있는 시각을 넣고, 넣은 직후와 `seeked` 뒤에 `currentTime`을 다시 읽었습니다. 조사 당일 실험은 일곱 값을 넣었지만 기록에는 다섯 값의 결과만 남았습니다. 원인을 고친 뒤 같은 일곱 값을 Chrome 157에서 공개 스크립트로 다시 쟀고, 세 번 모두 같은 값이 나왔습니다([측정 조건](#측정-조건)).

| 넣은 값 | 읽은 값(넣은 직후 · seeked 뒤 같음) | 차 |
|---|---|---|
| 10.44 | 10.44 | 0 |
| 10.437 | 10.437 | 0 |
| 10.4371234567 | 10.437123 | −4.6e-7 |
| 10.4379999999 | 10.437999 | −1.0e-6 |
| 3.0000004 | 3 | −4.0e-7 |
| 12.345678912345 | 12.345678 | −9.1e-7 |
| 7.1234565 | 7.123456 | −5.0e-7 |

µs 아래는 반올림이 아니라 버림이었습니다. 10.4379999999는 10.438이 아니라 10.437999가 됐고, 읽은 값은 늘 넣은 값 이하였습니다. 일곱 값 모두 `Math.trunc(t × 10⁶) / 10⁶`과 같았고, 조사 당일 다섯 값과도 같았습니다. µs에 딱 맞는 값은 그대로였습니다. 10.000초부터 1ms 간격의 1,000개 값도 하나도 줄지 않았습니다.

Chromium 소스도 같은 동작을 가리킵니다(Chrome 157.0.8103.51 태그). `HTMLMediaElement::Seek`은 넣은 값을 먼저 `MediaTimeForTimeValue`로 바꿔 시크 중 `currentTime`으로 돌려줄 값으로 둡니다([`html_media_element.cc`](https://github.com/chromium/chromium/blob/653674df293788cf4932c40d914e9e15b41a2d31/third_party/blink/renderer/core/html/media/html_media_element.cc#L2692-L2731)). 이 함수는 `base::Seconds(t).InSecondsF()`이고, 플레이어에 넘기는 시크 목표와 멈춘 동안의 위치도 같은 `base::Seconds(t)`로 만듭니다([`web_media_player_impl.cc` Seek](https://github.com/chromium/chromium/blob/653674df293788cf4932c40d914e9e15b41a2d31/third_party/blink/renderer/platform/media/web_media_player_impl.cc#L1125-L1129) · [멈춘 위치](https://github.com/chromium/chromium/blob/653674df293788cf4932c40d914e9e15b41a2d31/third_party/blink/renderer/platform/media/web_media_player_impl.cc#L1214-L1218) · [`MediaTimeForTimeValue`](https://github.com/chromium/chromium/blob/653674df293788cf4932c40d914e9e15b41a2d31/third_party/blink/renderer/platform/media/web_media_player_impl.cc#L1643-L1645)). `base::Seconds`는 초에 1,000,000을 곱해 64비트 정수 µs로 저장하는데([`time.h`](https://github.com/chromium/chromium/blob/653674df293788cf4932c40d914e9e15b41a2d31/base/time/time.h#L907-L911)), 이 곱은 `ClampedNumeric`이라 정수로 바꿀 때 `saturated_cast`를 거치고([`clamped_math.h`](https://github.com/chromium/chromium/blob/653674df293788cf4932c40d914e9e15b41a2d31/base/numerics/clamped_math.h#L156-L158)), 이 변환은 `static_cast`처럼 소수부를 버립니다([`safe_conversions.h`](https://github.com/chromium/chromium/blob/653674df293788cf4932c40d914e9e15b41a2d31/base/numerics/safe_conversions.h#L195-L198)). 넣은 직후 값과 `seeked` 뒤 값이 같았던 것도 이 순서와 맞습니다. HTML 표준의 시크 절차에는 위치를 어떤 단위로 둘지 정한 단계가 없고, [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime)도 시크가 위치를 매체가 지원하는 값으로 조정할 수 있다고만 적습니다.

편집기의 목표 시각에는 거의 늘 µs 아래 자릿수가 있습니다. 조각의 원점이 90kHz 틱(1/90,000초, 약 11.1µs) 단위이기 때문입니다. 틱 n개는 n × 100/9µs라 n이 9의 배수일 때만 µs에 딱 맞습니다. 10.437초부터 틱 900개를 차례로 넣자, 9의 배수가 아닌 800개는 모두 줄었고 9의 배수 100개는 하나도 줄지 않았습니다. 운영 카드의 µs 아래 자릿수는 직접 읽지 못했고, 훅 재현과 운영 반영 뒤 1번으로 준 결과로 뒷받침했습니다.

위 줄의 빨간 점과 아래 줄의 청록 점이 넣은 값입니다. 시작 선에 앉은 점이 µs 눈금으로 미끄러지면, 엄격 비교는 그 자리를 시작 앞으로 보고 같은 값을 다시 넣습니다.

{{< motion scene="SeekLoopTruncation" id="fig-seek-loop" kind="재구성" caption="구간 시작 10.4370111…초(90kHz 틱 939,331개)를 넣으면 Chrome은 10.437011초에 둡니다. 「위치 < 시작」 엄격 비교는 이 자리를 시작 앞으로 보고 같은 값을 다시 넣어 끝없이 되풀이하고, 「위치 < 시작 − 1ms」 비교는 여유 안이라 넣기 1번으로 멈춥니다. 10.437011과 0.111µs 차는 Chrome 157 공개 재측정 값이고, 되풀이 속도와 횟수는 설명용입니다." >}}

깎인 차이는 0.111µs로 1µs도 되지 않지만, 엄격 비교에는 차이의 크기가 상관없었습니다. 시작으로 다시 옮겨도 같은 값이 같은 자리로 깎이니 순환에는 끝이 없었습니다.

## 순환 원인의 첫 가설인 부동소수 왕복은 시험에서 틀렸습니다

추적만 본 단계의 유력 후보는 편집기 안의 시각 변환이었습니다. 편집기는 편집기 초를 Blob 시각으로 바꿔 넣고, 읽은 위치를 다시 편집기 초로 바꿉니다. 조각 경계에서 앞 조각을 고르거나 조각 길이와 시각 간격이 어긋나면, 이 왕복이 시작보다 아주 조금 작은 값을 낼 수 있다고 봤습니다.

시험은 이 가설을 지웠습니다. 깨끗한 조각, 정수 ms 시작, 실제 방송 시각 크기의 기준(약 1.79 × 10¹² ms)을 섞은 2,163 × 9 조합에서 왕복 오차는 0이었습니다. 그다음 기존 편집기 훅 시험의 틀을 복사해 두 조건을 따로 켜고 껐습니다. 하나는 조각마다 원점을 90kHz 틱 하나씩 밀어 구간 시작에 µs 아래 자릿수를 만드는 조건이고, 다른 하나는 모의 노드가 넣은 값의 µs 아래를 버리는 조건입니다.

| 조각마다 90kHz 틱 밀림 | 노드가 µs 아래 버림 | 메타데이터 뒤 위치 넣기 |
|---|---|---|
| 없음 | 있음 | 1번 |
| 있음 | 없음 | 1번 |
| 있음 | 있음 | 999번 |

둘 다 있을 때만 되풀이했습니다. 999번은 시험이 끝나도록 둔 상한 500에 걸린 뒤의 수입니다. 모의 노드가 시크마다 `timeupdate`와 `seeked`를 둘 다 내서 넣기가 배로 늘었고, 상한이 없으면 시험이 시간 초과로 끝났습니다. 운영 순환과 같은 꼴이 재현된 시점은 06시 22분이었고, 첫 검은 화면을 본 05시 52분에서 30분이 지나 있었습니다.

## 시작 판정에 1ms 여유를 두었습니다

고침은 판정 한 줄입니다. 반복 중이면 위치를 구간 시작에서 1ms를 뺀 값과 비교합니다. 끝 판정(`>= endSeconds`), 끝에서의 반복 되감기, 반복을 끈 상태의 앞쪽 시크는 그대로 뒀습니다(`editorPlayback.ts`@2e989769).

```ts
// 발췌: web/src/features/clips/editor/editorPlayback.ts (주석 · 나머지 함수 생략)
const LOOP_START_TOLERANCE_SECONDS = 0.001;

export function boundaryAction(currentSeconds: number, bounds: PlaybackBounds): BoundaryAction {
  const { startSeconds, endSeconds, loop } = bounds;
  if (loop && currentSeconds < startSeconds - LOOP_START_TOLERANCE_SECONDS) {
    return { kind: 'seek', toSeconds: startSeconds };
  }
  if (currentSeconds >= endSeconds) {
    return loop ? { kind: 'seek', toSeconds: startSeconds } : { kind: 'stop', atSeconds: endSeconds };
  }
  return { kind: 'continue' };
}
```

1ms는 두 기준 사이에서 골랐습니다. Chrome의 깎임은 1µs 미만이고 90kHz 한 틱도 약 11µs라, 1ms는 µs의 천 배이자 한 틱의 약 90배로 넉넉합니다. 60fps 한 프레임(약 17ms)보다는 훨씬 작아 화면에서 차이가 나지 않습니다. 판정이 순수 함수 한 곳에 있어서, 실제 영상 노드 경로와 미디어 없이 재생을 흉내 내는 목업 경로가 같은 규칙을 나눠 씁니다. 흉내 경로도 반복 중 위치가 시작 직전 1ms 안이면 이제 되감지 않고 그대로 나아갑니다.

기각한 대안은 셋이었습니다.

| 안 | 기각한 이유 |
|---|---|
| 이미 그 목표로 옮겨 멈춘 노드는 다시 옮기지 않기 | 마지막 목표를 상태로 더 들어야 하고, 깎인 값과 견주려면 결국 여유가 또 필요함 |
| 시크 목표를 µs 단위로 올려 넣기 | 브라우저마다 깎는 단위가 다를 수 있어 한 브라우저에만 맞음 |
| 재생 단추 판정까지 고치기 | 클릭당 한 번이라 되풀이가 아니고, 이번에 정한 고침 범위 밖 |

시험은 두 층입니다. 단위 시험은 시작보다 0.9µs 앞은 그대로, 10ms 앞은 시작으로 되감기, 끝 바로 앞 0.5ms는 아직 구간 안이라고 단언합니다(`editorPlayback.test.ts`@2e989769). 훅 시험은 µs 아래를 버리는 노드와 조각마다 90kHz 틱 하나씩 밀리는 창을 함께 넣고, 메타데이터 뒤 위치 넣기가 1번인지 봅니다(`useEditorVideoPlayback.test.ts`@2e989769). 되풀이 상한을 50으로 둔 이 시험은 고치기 전 판에서 99번으로 실패했고, 고친 뒤 1번으로 통과했습니다.

판정을 일부러 틀리게 바꿔 시험이 잡는지도 봤습니다. 여유 0, 깎임보다 작은 여유, 한 프레임을 넘는 여유, 부호 반대, 끝 판정에도 여유, `loop` 조건 제거는 모두 잡혔습니다. 여유를 1µs나 5ms로 바꾼 판은 살아남았습니다. 시험이 보장하는 것은 여유가 0.9µs보다 크고 10ms보다 작다는 것까지이고, 1ms라는 값 자체는 고정하지 않습니다.

엄격 비교와 1ms 여유를 브라우저에서 직접 견주려고 최소 재현 페이지도 만들었습니다. 편집기와 같이 `timeupdate` · `seeked` 처리기에서 판정하고, 재생은 누르지 않은 채 5초를 셌습니다.

| 조건 | 구간 시작 | 5초 동안 위치 넣기(3회) | 5초 동안 표본 상태 |
|---|---|---|---|
| 엄격 비교 | 10.4370111…(틱 939,331개) | 3,177 · 3,403 · 3,395번 | 96–98%가 seeking |
| 엄격 비교 | 10.437(µs에 딱 맞음) | 1번 · 1번 · 1번 | 모두 readyState 4 · seeking 아님 |
| 1ms 여유 | 10.4370111…(틱 939,331개) | 1번 · 1번 · 1번 | 모두 readyState 4 · seeking 아님 |

헤드리스 Chrome의 순환은 초당 `seeked` 수백 번(같은 기계에서 세 번 실행해 159–358번, 회차마다 다름)으로 운영(초당 약 47번)보다 훨씬 빨랐습니다. 화면이 없는 헤드리스 실행과 작은 합성 영상의 차이로 보이며, 속도 차이의 원인은 확인하지 않았습니다. 시작에 µs 아래 자릿수가 있고 비교가 엄격할 때만 끝없이 돈다는 꼴은 같았습니다.

운영에서는 PR 520 머지 커밋으로 다시 빌드한 웹 이미지를 반영한 뒤 같은 추적 코드로 다시 쟀습니다. 편집기를 열고 재생 · 클릭 없이 15초를 기다렸습니다.

| 카드 | 재생 노드 위치 넣기 | seeking · seeked | 15초 뒤 상태 | 미리보기 |
|---|---|---|---|---|
| 고치기 전 순환이 났던 카드 | 1번(10.437) | 1번 · 1번 | readyState 4 · seeking false | 원본 · 결과 모두 그림 있음 |
| 같은 방송의 다른 카드 하나 | 1번(12.665) | 1번 · 1번 | readyState 4 · seeking false | 원본 · 결과 모두 그림 있음 |

고치기 전 48초 동안 끊기지 않던 카드의 첫 시크는 약 50ms 만에 `seeked`로 끝났습니다.

## 남은 한계는 브라우저와 다른 비교 자리입니다

- **더 거칠게 깎는 브라우저.** 1ms보다 거친 단위로 위치를 깎는 브라우저가 있다면 순환이 다시 날 수 있습니다. PR 520은 지문 방지 설정으로 시간 정밀도를 낮춘 Firefox를 예로 들었지만, 그런 동작은 확인하지 않았습니다. 현재 MDN은 브라우저가 `currentTime`에 타이머 반올림을 하지 않는다고 적습니다.
- **Safari · Firefox는 재지 않았습니다.** 조사 당일과 공개 재측정 모두 Chrome만 쟀습니다. 재측정 스크립트는 Playwright의 Firefox · WebKit도 받지만, 그 빌드가 측정 기계에 깔려 있지 않아 돌리지 않았습니다.
- **재생 단추 판정은 여전히 엄격 비교입니다.** 깎인 자리에서 재생을 누르면 같은 자리로 한 번 더 옮깁니다. 원래 동작이고 되풀이는 아니라 이번 고침 범위에서 뺐습니다(`useEditorVideoPlayback.ts`@2e989769).
- **시험은 범위만 보장합니다.** 1µs와 5ms 여유도 시험을 통과합니다.

`currentTime`은 넣은 값을 그대로 돌려준다는 보장이 없습니다. 읽은 위치를 정확한 값과 `===` · `<` · `>=`로 견주는 자리라면, 깎일 수 있는 크기보다 넉넉하고 한 프레임보다 작은 여유를 이름 붙인 상수로 두는 편이 안전합니다. 그런 판정을 시험할 때는 「목표에 µs 아래 자릿수가 생기는 조건」과 「노드가 값을 깎는 조건」을 함께 넣어야 합니다. 이번 결함은 둘 중 하나만 넣은 시험을 모두 통과했습니다. 재생을 누르면 풀리는 검은 화면이라면 멈춘 영상에서만 도는 판정부터 의심해 볼 만합니다.

## 측정 조건

- **04시 34분 운영 확인(비공개 기록 요약).** 2026년 11월 16일 04:34, 바로 전 변경의 운영 확인으로 AI가 제 Chrome의 Claude in Chrome 도구로 편집기 카드 둘을 열었습니다. 같은 도구의 망 기록에 `blob:` GET 21건(503 18건 · 206 3건), 콘솔 오류로 `Document hidden`이 든 1줄이 있었습니다. 이 회차에는 검은 화면이 없었고 재생은 정상이었습니다.
- **운영 계측(비공개 기록 요약).** 2026년 11월 16일 05:52–06:16, AI(Claude Code)가 띄운 하위 Claude가 제 Chrome의 Claude in Chrome 도구로 운영 편집기 새 탭에 계측 코드를 넣어 쟀습니다. 쓰기 단추는 누르지 않았습니다. 원 기록의 주소 · 쿠키 · 계정 · 카드 식별자는 빼고 옮겼습니다. 추적 기록은 위치를 소수 둘째 자리, 넣은 값을 셋째 자리까지만 적어 넣은 값의 µs 아래 자릿수는 기록에 없습니다. 「21ms」는 재생 직전 54바퀴(83,866–85,002ms)의 평균 간격이고, 「48초」는 첫 시크(36,730ms)부터 `play()`(85,026ms)까지입니다. 진입 직후 필름띠 노드가 함께 시크하던 동안은 바퀴 간격이 약 34–41ms였습니다. 20초 · 36초 · 48초는 서로 다른 방문에서 재생을 누르기까지 기다린 시간이고, 세 번 모두 재생 전까지 풀리지 않았습니다.
- **blob: 비교(비공개 기록 요약).** 05:35–05:45, 로컬 합성 mp4(9.4MB · 85.5MB)를 같은 페이지에서 자동화 Chrome(CDP)과 Claude in Chrome 기록 도구로 쟀습니다. 확장 도구의 사이트 허용 창은 제가 승인했습니다.
- **원인 확정(비공개 기록 요약).** 06:19–06:22, 자동화 Chrome(판 기록 없음) · 로컬 mp4에 일곱 값을 넣고 다섯 값의 결과를 남겼습니다. 왕복 훑기와 훅 단위 재현은 PokeClip-mono 웹의 vitest에서 기존 시험 틀을 복사한 조사용 시험으로 돌렸고, 저장소에는 넣지 않았습니다.
- **운영 반영 뒤 실측(비공개 기록 요약).** 2026년 11월 16일, PR 520 머지 커밋 `2e989769`로 다시 빌드한 운영 웹 이미지에서 쟀습니다. 같은 추적 코드로 재생 · 클릭 · 화면 찍기 없이 15초 기다린 뒤 기록을 받고 화면을 한 번 찍었습니다. 고치기 전 순환이 났던 카드와 같은 방송의 다른 카드 하나, 두 곳을 쟀습니다.
- **공개 재측정.** 2026년 11월 16일 07:20–07:22 KST, AI(Claude Code). Google Chrome 157.0.8103.51 헤드리스(Playwright 1.64.1 `channel: 'chrome'`), macOS 27.0.1, Apple M5. 영상은 ffmpeg 9.0.2 `testsrc2` 20초 · 640×360 · 30fps · H.264 yuv420p, 영상 time_base 1/90000이고 Blob으로 받아 `blob:` 주소로 틀었습니다. 일곱 값은 3회, 틱 900개(939,330–940,229)와 1ms 간격 1,000개(10.000–10.999초)는 1회, 최소 재현은 조건마다 5초씩 3회 쟀습니다. 재측정을 세 번 돌렸고 본문 표의 수치는 2회차입니다. 최소 재현 엄격 비교는 1회차 3,445 · 3,611 · 3,605번(초당 341.0–357.9번), 3회차(07:51, 실행기 출력 위치를 바꾼 뒤 확인) 2,111 · 1,901 · 1,599번(초당 159.4–210.5번)이었고, 다른 값은 세 번 모두 같았습니다.
- **명령과 원자료.** 저장소 루트에서 `npm ci`로 Playwright 1.64.1을 설치하고(Node v26.4.0에서 돌림), ffmpeg와 Google Chrome을 준비한 뒤 `measure/` 폴더에서 `./run.sh chrome`을 실행합니다. 결과는 `SEEKW_OUT_DIR`(기본 `measure/out/`)에 쓰므로 커밋된 `raw/`를 덮어쓰지 않습니다. 환경 기록(`env.txt`)의 `sw_vers` · `sysctl`은 macOS 명령입니다. 합성 영상은 `make-video.sh`가 `/tmp/seekw-media`에 만들고 저장소에는 넣지 않으며, 끝나면 `/tmp/seekw-media`와 `/tmp/seekw-tmp`를 직접 지웁니다. 페이지(`pages/snap.html` · `pages/loop.html`), 실행기, 회차별 값과 요약은 [저장소 `_workspace/blog/pokeclip-editor-seek-loop/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-editor-seek-loop/measure)에 있습니다.

## 출처

코드 · 결정 기록(프로젝트 저장소 3K-PokeClip/PokeClip-mono · 2026년 11월 20일부터 비공개)
- PokeClip-mono PR 520 — 반복 시작 판정의 1ms 여유, 원인 · 설계 · 기각한 대안 · 남은 한계 · 변이 결과(2026-11-16 develop 병합, 머지 커밋 `2e989769`) (비공개 저장소)
- `editorPlayback.ts`@2e989769 · `useEditorVideoPlayback.ts`@2e989769 · `remuxWindow.ts`@2e989769 (비공개 저장소)
- 시험@2e989769 — `editorPlayback.test.ts` · `useEditorVideoPlayback.test.ts` (비공개 저장소)

표준 · 문서
- WHATWG HTML Living Standard, [4.8.11.9 Seeking](https://html.spec.whatwg.org/multipage/media.html#seeking) — 시크 절차, 끝에 `timeupdate` 다음 `seeked`
- MDN, [HTMLMediaElement: currentTime property](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime) — 시간 정밀도 주의
- MDN, [HTMLMediaElement: seeked event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/seeked_event) · [URL: revokeObjectURL() static method](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) · Claude Code 문서, [Use Claude Code with Chrome](https://code.claude.com/docs/en/chrome)
- [mediabunny](https://mediabunny.dev/) — 브라우저 안 미디어 다중화 라이브러리

Chromium 소스(태그 157.0.8103.51, 커밋 `653674df`)
- [`html_media_element.cc` `Seek` · `currentTime`](https://github.com/chromium/chromium/blob/653674df293788cf4932c40d914e9e15b41a2d31/third_party/blink/renderer/core/html/media/html_media_element.cc#L2656-L2900)
- [`web_media_player_impl.cc` `Seek` · `DoSeek` · `MediaTimeForTimeValue`](https://github.com/chromium/chromium/blob/653674df293788cf4932c40d914e9e15b41a2d31/third_party/blink/renderer/platform/media/web_media_player_impl.cc#L1125-L1218)
- [`base/time/time.h` `Seconds`](https://github.com/chromium/chromium/blob/653674df293788cf4932c40d914e9e15b41a2d31/base/time/time.h#L907-L911) · [`base/numerics/safe_conversions.h` `saturated_cast`](https://github.com/chromium/chromium/blob/653674df293788cf4932c40d914e9e15b41a2d31/base/numerics/safe_conversions.h#L195-L213)

이어지는 글
- [방송 중 클립을 위해 라이브·되감기·편집 경로를 나눴습니다](/posts/0-to-1/pokeclip-live-editing-boundaries/) — 편집기가 되감기 목록에서 영상을 받는 경로
- [HTTP 200인데 검은 화면, 세 단계를 지나서야 재생됐습니다](/posts/0-to-1/pokeclip-black-screen-three-causes/) — 다른 원인의 검은 화면
