---
title: "꺼 둔 라이브 따라잡기를 라이브 시청자에게만 다시 켰습니다"
date: "2026-11-20T03:42:38+09:00"
lastmod: "2026-11-20T15:44:17+09:00"
author: "김태윤"
categories: ["projects"]
draft: false
description: "되감기를 지키려고 hls.js의 라이브 따라잡기를 꺼 두자, 끊길 때마다 밀린 지연이 쌓여 실시간보다 17초 뒤에 머무는 일이 생겼습니다. 라이브를 보는 중인 시청자에게만 앱이 1.05 · 1.1배속과 10초 점프로 따라잡게 했고, headless 측정에서 배속을 바꿀 때마다 재생이 멈춘 WebKit은 점프만 쓰기로 했습니다. 11월 20일 운영에 배포한 뒤 데스크톱 Chrome으로 5분 재 보니 지연 중앙값이 1.29초였고, 실제 Safari · iOS와 되감기에서 라이브로 넘어가는 경로는 아직 재지 않았습니다."
tags: ["PokeClip", "LL-HLS", "hls.js", "WebKit", "설계 결정"]
---

PokeClip의 라이브 재생기는 한 번 끊기면 밀린 시간을 되찾지 못했습니다. 되감기를 지키려고 재생 라이브러리 hls.js의 라이브 따라잡기를 꺼 두었고, 앱에는 라이브 끝으로 돌아가는 길이 「실시간으로」 버튼 하나뿐이었습니다. 그래서 끊김이 쌓이면 실시간보다 17초 뒤에 머무는 일이 생겼습니다. 이 값은 프로젝트에서 관찰한 것이고 원자료는 공개하지 않습니다. 2026년 11월 20일 02:06(KST)에 머지한 변경은 라이브를 보는 중인 시청자만 앱이 직접 따라잡게 합니다. 목표 지연보다 0.5초 넘게 밀리면 1.05배나 1.1배로 틀고, 10초 넘게 밀리면 라이브 동기 위치로 건너뜁니다. WebKit 브라우저는 점프만 씁니다. headless WebKit에서 배속을 바꿀 때마다 재생이 멈췄기 때문입니다. 공개 도구로 다시 재 보니 6초 끊김 뒤 따라잡기를 끈 재생기는 실시간보다 6.3초 뒤에 그대로 머물렀고, 같은 규칙을 켠 Chrome은 36초 만에 목표 근처로 돌아왔습니다. 그 headless WebKit 측정에서는 배속을 바꾼 80번 모두 재생이 266–334ms 멈췄다가 같은 자리에서 이어졌습니다. 이 변경은 11월 20일 03시 33분(KST) 운영에 배포됐습니다. 배포 뒤 시험 방송을 데스크톱 Chrome으로 5.1분 재 보니 지연 중앙값이 1.29초였습니다. 실제 Safari · iOS와 되감기에서 라이브로 넘어가는 경로는 아직 재지 않았습니다.

결정과 승인은 제가 했습니다. 구현과 시험, 비공개 로컬 실측, 이 글의 공개 재측정, 배포 뒤 운영 측정은 제 지시로 AI 에이전트(Claude Code, Codex)가 했습니다. 이 글은 제 결정과 자료를 바탕으로 AI(Claude Code)가 썼고, 영상은 Claude Code가 Remotion으로 만들었습니다.

## 되감기를 지키려고 꺼 둔 따라잡기가 지연을 쌓았습니다

[MediaMTX를 고른 글](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/)에서 LL-HLS 되감기를 살린 조건 하나가 「라이브 끝을 따라잡는 기능을 끈 hls.js」였습니다. hls.js는 따라잡기를 두 갈래로 합니다. 하나는 지연이 `liveMaxLatencyDurationCount` × 조각 길이를 넘으면 라이브 쪽으로 시크하는 것이고, 다른 하나는 `maxLiveSyncPlaybackRate`까지 배속을 올리는 것입니다. hls.js 1.7.3의 기본값은 각각 `Infinity`와 `1`이라 둘 다 꺼져 있습니다([`config.ts` 471–477행](https://github.com/video-dev/hls.js/blob/v1.7.3/src/config.ts#L471-L477)). 다만 이것은 목록 창 안에서의 이야기입니다. 재생 위치가 목록 창 밖으로 밀려나 있고 재생할 데이터가 모자라면(`readyState` 4 미만) hls.js는 이 값과 상관없이 라이브 동기 위치로 시크합니다([`stream-controller.ts` 704–771행](https://github.com/video-dev/hls.js/blob/v1.7.3/src/controller/stream-controller.ts#L704-L771)). 버퍼가 바닥난 채 창 밖에 있을 때의 예외이고, 창 안에서 이 함수가 라이브로 옮기지는 않습니다. PokeClip은 배속 값을 `1`로 못박아 두었습니다. 살아 있으면 되감는 중에 재생기가 스스로 라이브로 튀어 DVR이 안 되는 것처럼 보였기 때문입니다. 프로젝트 저장소(비공개)의 hls.js 설정에는 그 이유가 이렇게 남아 있습니다.

```ts
// 프로젝트 저장소(비공개) web/src/features/player/hlsConfig.ts 발췌 — 주석 일부 생략
// 라이브러리 catch-up은 시청자의 의도를 모른다: 살아 있으면 되감기 중 플레이어가 스스로 라이브로
// 점프해 "DVR이 안 되는 것처럼" 보인다
export const HLS_BASE_CONFIG = {
  lowLatencyMode: true,
  maxLiveSyncPlaybackRate: 1,
  // …
} as const satisfies Partial<HlsConfig>;
```

대가는 끊김마다 나타났습니다. 재생기가 버퍼를 다 쓰고 기다리는 동안에도 라이브 끝은 계속 나아갑니다. 다시 재생하면 그 시간만큼 뒤에서 이어 틀고, 배속도 시크도 하지 않으니 그 차이가 줄지 않습니다. 시청자가 「실시간으로」를 누르지 않는 한 끊김이 하나 생길 때마다 지연이 한 단씩 쌓였습니다.

## hls.js 배속은 되감은 사람과 밀린 사람을 가르지 못합니다

가장 짧은 해법은 `maxLiveSyncPlaybackRate`를 1.1로 올리는 것이었습니다. 이 안을 버린 이유는 hls.js 1.7.3의 `onTimeupdate`에 있습니다([`latency-controller.ts` 240–299행](https://github.com/video-dev/hls.js/blob/v1.7.3/src/controller/latency-controller.ts#L240-L299)).

- **거리만 봅니다.** hls.js는 「지연 − 목표」가 「목표 + 조각 길이」보다 작을 때만 배속을 올립니다(272–287행). 기본 설정에서는 그 너머를 DVR 재생으로 봅니다. 지연으로 바꾸면 경계는 「목표 × 2 + 목표 조각 길이(TARGETDURATION)」입니다. PokeClip 운영 목록(PART-HOLD-BACK 1.25초, TARGETDURATION 6초)에서 목표가 1.25초인 동안은 지연 8.5초 미만에서만 움직이고, 끊김으로 목표가 2.25초로 오르면 경계도 10.5초로 올라갑니다. 조각을 4초로 둔 아래 재측정 실험대라면 6.5초와 8.5초입니다. 그 안에서는 지연이 6초인 시청자를 끊겨서 밀렸든 일부러 되감았든 똑같이 끌어당깁니다.
- **끈 뒤에도 배속이 남습니다.** 따라잡기를 끄려고 설정을 다시 1로 바꾸면, `maxLiveSyncPlaybackRate === 1`인 순간 함수가 앞에서 끝납니다(257–263행). 배속을 1로 되돌리는 갈래(296–298행)에 닿지 않으므로 마지막 배속이 그대로 남습니다.

「라이브를 보는 중인가」는 재생 위치만으로 알 수 없습니다. 같은 7초 지연이라도 끊겨서 밀렸는지, 시청자가 7초 되감았는지는 시청자의 행동만 압니다. 그래서 라이브러리 따라잡기는 계속 끄고(`maxLiveSyncPlaybackRate: 1`), 배속과 점프는 앱이 직접 걸기로 했습니다.

## 따라잡기는 시청자의 명령으로 켜고 끕니다

앱 따라잡기에는 모드가 셋 있습니다. 끔, 배속만, 배속과 점프입니다. 모드는 재생 위치가 아니라 시청자가 누른 것으로 바뀝니다. 아래 상태도에서 화살표 이름이 그 명령입니다.

```mermaid {#fig-modes kind="개념도" caption="라이브 재생기의 따라잡기 모드. 첫 진입과 「실시간으로」는 배속과 점프를, 되감기에서 자동으로 넘어온 재생기는 배속만 켜고 넘김 확인이 끝나면 배속과 점프로 오릅니다. 시청자의 시크 · 일시정지 · 키 이동은 끄고, 라이브 끝 3초 안으로의 시크는 「실시간으로」와 같게 칩니다. 프로젝트 저장소(비공개)의 따라잡기 모듈과 재생 훅을 다시 그렸습니다."}
stateDiagram-v2
  accTitle: 라이브 따라잡기의 세 모드
  accDescr: 라이브 첫 진입과 실시간으로 버튼은 배속과 점프 모드로 시작한다. 되감기에서 라이브로 자동으로 넘어온 재생기는 배속만 모드로 시작하고, 넘김 확인이 끝나면 배속과 점프 모드로 오른다. 두 모드에서 시청자가 시크하거나 일시정지하거나 키로 옮기면 끔이 된다. 끔이나 배속만에서 실시간으로를 누르거나 끝 3초 안으로 시크하면 배속과 점프 모드가 된다. 넘김 확인 중에는 그래도 점프하지 않는다.
  direction TB
  state "배속과 점프" as full
  state "배속만" as rate
  state "끔" as off
  [*] --> full: 첫 진입
  [*] --> rate: 자동 넘김
  rate --> full: 확인 끝
  rate --> full: 실시간으로 · 끝 3초 시크
  full --> off: 시크 · 멈춤
  rate --> off: 시크 · 멈춤
  off --> full: 실시간으로 · 끝 3초 시크
```

끄는 자리는 시청자 명령을 처리하는 함수들입니다. 시크는 옮긴 자리가 라이브 끝 3초 안이면 켜고 아니면 끄며, 시청자의 일시정지는 끕니다.

```ts
// 프로젝트 저장소(비공개) web/src/features/player/useHlsPlayback.ts 발췌
// 사람의 시크가 따라잡기를 켜고 끈다 — 라이브 끝 3초 안이면 「실시간으로」 와 같다
const followSeek = useCallback((atEdge: boolean) => {
  if (atEdge) {
    catchupRef.current?.arm('full');
  } else {
    catchupRef.current?.disarm();
  }
}, []);
```

시크바가 끝 3초 구간을 「실시간」으로 표시하므로, 거기에 손잡이를 놓은 사람은 「실시간으로」를 누른 사람과 같게 다룹니다. 재생기를 내릴 때는 배속을 1로 되돌려 다음 되감기 · 다시보기 재생기가 물려받지 않게 했습니다. 되감기와 다시보기 재생기에는 따라잡기를 아예 달지 않습니다.

앱이 스스로 하는 점프는 시청자의 시크로 치지 않습니다. 그래서 점프한 뒤에도 따라잡기는 꺼지지 않습니다. 되감기에서 자동으로 넘어온 재생기만 예외로, 넘김 확인이 끝날 때까지 배속만 씁니다. 확인 단계는 재생기가 스스로 한 시크도 끊김으로 보고 되감기로 되돌리기 때문입니다. 넘김 확인이 끝나면 배속과 점프로 올라갑니다. 라이브와 되감기를 오가는 넘김 자체는 [라이브 · DVR 분리 글](/posts/0-to-1/pokeclip-live-dvr-separation-handoff/)에 있습니다.

## 0.5초 넘게 밀리면 배속을, 10초 넘게 밀리면 점프를 씁니다

목표 지연은 따로 정하지 않고 hls.js의 `targetLatency`를 읽습니다. 목록의 PART-HOLD-BACK(라이브 끝에서 최소 이만큼 떨어져 틀라는 값)에서 시작하고, 끊김이 날 때마다 1초씩, 조각 길이까지 더해지는 값입니다([`latency-controller.ts` 49–78행](https://github.com/video-dev/hls.js/blob/v1.7.3/src/controller/latency-controller.ts#L49-L78)). 「실시간으로」 버튼이 서는 자리와 따라잡기가 멈추는 자리가 같아야 하므로 이 값을 그대로 씁니다. 그 위에 얹은 규칙은 다섯 가지입니다.

| 규칙 | 값 |
|---|---|
| 배속 켬 | 지연 − 목표가 0.5초 초과. 초과가 1초 이상이면 1.1배, 아니면 1.05배 |
| 배속 끔 | 지연 − 목표가 0.1초 이하, 또는 앞 버퍼 1초 미만 |
| 점프 | 지연 10초 초과이고 동기 위치가 1초 넘게 앞일 때 라이브 동기 위치로. 뒤 8초는 다시 뛰지 않음 |
| 목록 정체 | 목록이 조각 길이의 2배 넘게 안 자라면 아무것도 안 함(배속 중이면 1로). 조각 길이 미만이 두 표본 이어지면 풀림 |
| 판정 시점 | 영상의 `timeupdate`마다. 표준은 15–250ms 간격을 정하고([HTML 표준](https://html.spec.whatwg.org/multipage/media.html#playing-the-media-resource)), 재측정의 두 브라우저는 약 250ms마다 냈습니다 |

켜는 문턱 0.5초와 끄는 문턱 0.1초를 벌려 둔 것은 0.5초 파트마다 지연이 오르내릴 때 배속이 켜졌다 꺼졌다 하지 않게 하려는 것입니다. 앞 버퍼가 1초 밑으로 내려가거나 목록이 정체하는 등 배속을 1로 되돌리는 일이 중간에 없으면, 한 번 따라잡는 동안 배속은 켤 때와 끌 때 두 번만 바뀝니다. 아래 Chrome 재측정이 그 경우였습니다. 앞 버퍼 조건에는 이런 벌림이 없어서, 버퍼가 1초 언저리를 오가면 배속이 꺼졌다가 다음 표본에서 다시 켜집니다. 목록 정체가 풀린 뒤에도 다시 켜질 수 있습니다. 앞 버퍼 조건은 배속이 버퍼를 깎아 새 끊김을 부르지 않게 합니다. 목록 정체 조건은 송출이 멈춘 동안의 지연 증가를 따라잡지 않게 합니다. 그때는 라이브 끝도 멈춰 있어 앞으로 갈 곳이 없습니다.

공개 도구로 같은 규칙을 다시 짜서 재 보았습니다. 프록시로 재생기의 목록 · 조각 요청을 6초, 13초 붙잡아 끊김을 만들고, 따라잡기 끔 · 규칙 · WebKit용 점프만 규칙을 나란히 틀었습니다. 위 칸이 6초, 아래 칸이 13초 끊김 뒤입니다. 청록 선이 규칙입니다.

{{< motion scene="CatchupAfterStall" id="fig-after-stall" kind="재구성" caption="공개 재측정에서 재생기의 HLS 요청을 6초(위), 13초(아래) 붙잡았다 놓은 뒤의 지연입니다. 따라잡기를 끈 Chrome은 6.3초, 13.3초에 그대로 남았습니다. 배속 규칙(Chrome)은 6초 끊김 뒤 1.1배로 36초 만에 목표 2.25초에서 0.5초 안으로 들어왔고, 13초 끊김 뒤에는 바로 점프해 3.5초에 섰습니다. WebKit 점프만 규칙은 6초 끊김 뒤 6.8초에 남았고 13초 끊김 뒤에는 점프해 4.4–4.6초에 섰습니다. 목표는 끊김마다 1초씩 올라 2.25초, 3.25초였습니다. 가로축은 끊김을 놓은 뒤의 시간, 세로축은 지연(라이브 끝 − 재생 위치)이며, 표본을 1초 간격으로 줄여 비례대로 다시 그렸습니다." >}}

6초 끊김 뒤 Chrome의 지연은 6.25초, 목표는 2.25초였습니다. 초과가 1초를 넘어 1.1배가 켜졌고, 목표에 닿아 꺼질 때까지 배속은 켤 때와 끌 때 두 번만 바뀌었습니다. 13초 끊김 뒤에는 지연이 10초를 넘어 첫 판정에서 점프했습니다. 따라잡기를 끈 재생기는 두 끊김 모두 다음 60초, 45초 동안 그 자리에 머물렀습니다. 끊김 하나에 지연이 한 단씩 쌓여, 두 번째 끊김 뒤 따라잡기를 끈 페이지는 Chrome이 13.3초, WebKit이 18.2초 뒤에 있었습니다. 프로젝트에서 본 17초 지연과 비슷한 크기입니다.

## WebKit은 배속을 바꿀 때마다 멎어 점프만 씁니다

WebKit에는 재생 중 `playbackRate`를 바꾸면 소리와 화면이 잠깐 멎는다는 버그가 2016년부터 열려 있습니다([WebKit Bug 163433](https://bugs.webkit.org/show_bug.cgi?id=163433)). 보고자는 약 90ms 멎음을 적었고, 2024년 댓글에는 iOS에서 200–300ms 멈춘다는 보고가 있습니다. iOS 13에서 같은 증상을 보고한 [Bug 208142](https://bugs.webkit.org/show_bug.cgi?id=208142)는 이 버그의 중복으로 닫혔습니다. 배속 규칙은 한 번 따라잡을 때 배속을 적어도 두 번 바꾸므로, 멎음도 적어도 그만큼 생깁니다.

얼마나 멎는지 공개 도구로 다시 쟀습니다. 따라잡기를 끈 hls.js 재생기를 라이브 끝에서 약 10초 뒤에 세우고, 3초마다 `playbackRate`를 1 ↔ 1.05, 1 ↔ 1.1로 20번씩 바꿨습니다. 프레임마다 `requestVideoFrameCallback` 콜백이 불린 시각(`now`)을 받아, 전환 앞뒤 1초 안에서 가장 긴 간격을 셌습니다. 이 간격은 화면 갱신 주기 단위로 묶입니다. 아래 그래프에서 막대는 그 값의 중앙값이고, 강조색이 headless WebKit입니다.

{{< chart id="fig-frame-gap" kind="실측" caption="3초마다 배속을 바꾼 hls.js 라이브 재생에서, 전환 앞뒤 1초 창의 가장 긴 프레임 간격(전환 20번의 중앙값 — 가운데 두 값의 평균, ms). 전환 없음은 같은 3초 일정의 창 40개입니다. 강조색이 headless WebKit(Playwright WebKit, 26.4 UA), 회색이 Chrome이고 점선은 로컬 실측 전에 판단 기준으로 정해 둔 200ms 문턱입니다. 공개 재측정(2026-11-20, headless Playwright). 정확한 값은 아래 표에 있습니다." source="https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-live-catchup-live-viewers-only/measure" height="360px" >}}
{
  "grid": {"left": 8, "right": 56, "top": 36, "bottom": 8, "containLabel": true},
  "legend": {"top": 0, "data": ["headless WebKit", "Chrome 157"]},
  "xAxis": {"type": "value", "name": "ms", "min": 0, "max": 400},
  "yAxis": {"type": "category", "inverse": true, "data": ["1 → 1.05", "1.05 → 1", "1 → 1.1", "1.1 → 1", "전환 없음"]},
  "series": [
    {"name": "headless WebKit", "type": "bar", "itemStyle": {"color": "#087f8b"},
     "label": {"show": true, "position": "right", "formatter": "{c}"},
     "data": [317, 298, 316, 290.5, 35],
     "markLine": {"symbol": "none", "label": {"show": false}, "data": [
       {"name": "200ms", "xAxis": 200, "lineStyle": {"color": "#7a8a9b", "type": "dashed"}}
     ]}},
    {"name": "Chrome 157", "type": "bar", "itemStyle": {"color": "#7a8a9b"},
     "label": {"show": true, "position": "right", "formatter": "{c}"},
     "data": [50, 50, 50, 50, 50]}
  ]
}
{{< /chart >}}

| 브라우저 · 전환 | 창 수 | 가장 긴 간격: 최소 · 중앙값 · 최대(ms) | 200ms 초과 |
|---|---|---|---|
| headless WebKit 1 → 1.05 | 20 | 299 · 317 · 334 | 20 |
| headless WebKit 1.05 → 1 | 20 | 266 · 298 · 309 | 20 |
| headless WebKit 1 → 1.1 | 20 | 294 · 316 · 334 | 20 |
| headless WebKit 1.1 → 1 | 20 | 266 · 290.5 · 314 | 20 |
| headless WebKit 전환 없음 | 40 | 34 · 35 · 41 | 0 |
| Chrome 1 → 1.05 · 1.05 → 1 · 1 → 1.1 | 각 20 | 50 · 50 · 83 | 0 |
| Chrome 1.1 → 1 | 20 | 50 · 50 · 50 | 0 |
| Chrome 전환 없음 | 40 | 50 · 50 · 50 | 0 |

headless WebKit에서는 80번 전환 모두에서 266–334ms 동안 다음 프레임 콜백이 오지 않았습니다. 가장 긴 간격 앞뒤 프레임의 `mediaTime`은 한 프레임(33ms)만 나아갔고 `presentedFrames`도 1만 늘었습니다. 프레임을 건너뛴 것이 아니라 재생이 약 0.3초 멈췄다가 같은 자리에서 이어졌다는 뜻이고, 전환 한 번에 지연이 그만큼 늘어납니다. 전환하지 않을 때 같은 창의 최대는 41ms였고 전환 창에는 버퍼가 비어 생기는 `waiting` 사건이 없었습니다. 그러니 이 멈춤은 이 headless 환경에서 배속 전환과 함께 관찰된 것입니다. Chrome은 전환해도 최대 83ms였고, 1.05와 1.1의 차이는 두 브라우저 모두 거의 없었습니다. 머지 전 프로젝트 재생기 코드로 한 비공개 로컬 실측도 같은 결론이었습니다. 그 수치는 공개하지 않습니다.

headless WebKit은 Safari.app이 아닙니다. Playwright 문서는 동영상 재생처럼 Safari에 가장 가까운 동작이 필요하면 WebKit을 mac에서 돌리라고 권합니다([Playwright 「WebKit」](https://playwright.dev/docs/browsers#webkit)). 이번 측정은 macOS에서 했지만, 실제 Safari.app과 iOS 기기의 값은 아직 재지 않았습니다.

같은 배속 규칙을 headless WebKit에 그대로 걸어 보기도 했습니다. 한 WebKit에 페이지 셋을 함께 띄운 실행이고, 결과는 실행마다 갈렸습니다. 첫 실행에서는 6초 끊김을 놓은 뒤 60초 동안 배속이 19번 바뀌었고, 지연은 8.9–10.0초에서 줄지 않았습니다. 앞 버퍼가 1초 밑으로 내려가 배속이 꺼지고 다음 표본에서 다시 켜질 때마다 지연이 약 0.5초씩 올라, 1.1배로 몇 초 틀어 줄인 만큼을 되돌렸습니다. 재실행에서는 같은 60초에 배속이 3번 바뀌며 지연이 8.5초에서 3.3초로 내려왔지만, 13초 끊김 뒤 45초 동안에는 11번 바뀌었습니다. 흔들림이 컸던 두 구간에서 그 페이지의 앞 버퍼는 지연보다 훨씬 작은 2–3초 이하였습니다. 앞 버퍼가 왜 작았는지는 확인하지 않았습니다.

그래서 WebKit에서는 배속을 쓰지 않고, 10초 넘게 밀릴 때만 점프합니다. 처음 안은 WebKit에서도 크게 밀릴 때만 배속을 쓰는 것이었고, 로컬 실측에서 전환 멎음이 200ms를 넘으면 점프만 쓰기로 조건을 걸어 두었습니다. 그 실측에서 멎음이 200ms를 넘어 점프만으로 바꿨습니다. 대가는 조금 밀린 WebKit 시청자입니다. 10초 아래로 밀리면 따라잡지 않으므로, 위 영상의 회색 점선처럼 끄고 있을 때와 같습니다. 되감기에서 자동으로 넘어온 WebKit 재생기는 넘김 확인이 끝날 때까지 배속도 점프도 하지 않습니다. WebKit 판별은 사용자 에이전트로 하고, 판별할 수 없으면 Chromium 정책을 씁니다.

```ts
// 프로젝트 저장소(비공개) web/src/features/player/liveCatchup.ts 발췌
export const WEBKIT_LIVE_CATCHUP_POLICY: LiveCatchupPolicy = { kind: 'jumpOnly' };

export function isWebKitPlayback(nav: Pick<Navigator, 'userAgent'>): boolean {
  const ua = nav.userAgent;
  return /AppleWebKit\//.test(ua) && !/(?:Chrome|Chromium)\//.test(ua);
}
```

hls.js를 쓰지 않는 옛 iOS 기본 재생 경로에는 따라잡기가 없습니다.

## hls.js가 캐시한 지연은 시크 직후 한 표본 늦었습니다

처음 구현은 지연을 hls.js의 `latency`에서 읽었습니다. 그런데 시청자가 시크하거나 「실시간으로」를 누른 직후 첫 판정이 시크 전 지연으로 배속을 켰다 바로 끄는 일이 있었습니다(비공개 로컬 실측). 원인은 `latency`가 계산값이 아니라 캐시라는 데 있습니다. `latency` getter는 `_latency`를 돌려줄 뿐이고, 그 값은 두 곳에서만 다시 잽니다. hls.js가 영상에 붙인 자기 `timeupdate` 리스너, 그리고 목록이 새로 자란 `LEVEL_UPDATED`(`details.advanced`)입니다([`latency-controller.ts` 31–33 · 174–180 · 194–200 · 240–253행](https://github.com/video-dev/hls.js/blob/v1.7.3/src/controller/latency-controller.ts#L174-L200)). hls.js는 그 리스너를 `MEDIA_ATTACHED`에서 붙입니다. 프로젝트 재생기는 따라잡기의 `timeupdate` 리스너를 `hls.attachMedia`보다 먼저 붙이므로, 앱 리스너가 늘 먼저 불립니다.

```ts
// 프로젝트 저장소(비공개) web/src/features/player/useHlsPlayback.ts 발췌 — 순서만
const hls = new HlsCtor(startConfig(base, { kind, startAtMs }));
catchup = kind === 'live' ? watchLiveCatchup(video, { /* … */ }) : null; // 여기서 timeupdate 리스너를 단다
// …
hls.attachMedia(video); // hls.js 는 MEDIA_ATTACHED 에서 자기 timeupdate 리스너를 단다
```

그래서 시크 뒤 첫 `timeupdate`에서 앱은 아직 갱신되지 않은 값을 읽습니다.

공개 재측정에서 이를 그대로 재현했습니다. 앱 리스너를 hls.js보다 먼저 또는 나중에 붙이고, 8초 되감기와 동기 위치로의 시크를 10번씩 했습니다.

| 브라우저 · 리스너 순서 | 시크 뒤 첫 표본에서 `hls.latency`가 직접 계산과 1초 넘게 다름 | 같은 표본에서 다른 리스너가 끝난 뒤 다시 읽어도 1초 넘게 다름 |
|---|---|---|
| Chrome 157 · 앱이 먼저 | 20/20 | 0/20 |
| headless WebKit · 앱이 먼저 | 20/20 | 0/20 |
| Chrome 157 · hls.js가 먼저 | 0/20 | 0/20 |
| headless WebKit · hls.js가 먼저 | 0/20 | 0/20 |

앱 리스너가 먼저인 Chrome에서 8초 되감은 직후 첫 표본은 `hls.latency` 1.30초, 직접 계산 9.30초였습니다. 시크 전 지연을 그대로 읽은 것입니다. 동기 위치로 돌아온 직후에는 거꾸로 `hls.latency`가 9.35초, 직접 계산이 1.25초였습니다. 시크 직후가 아닌 표본에서는 차이가 Chrome 0.05초, WebKit 0.2초 이하였습니다. 배속 규칙이 이 낡은 9.35초를 믿으면 목표 근처에 막 도착한 재생기에 1.1배를 걸고, 다음 표본에서 다시 끕니다.

리스너 순서를 바꾸면 0/20이었습니다. 그래도 순서를 맞추는 쪽을 고르지 않았습니다. 순서는 hls.js가 언제 리스너를 붙이는지에 달려 있어, 재생기를 다시 붙이는 경로나 라이브러리 판이 바뀌어도 지켜진다고 장담할 수 없다고 봤습니다. 측정이 아니라 판단입니다. 그래서 지연을 표본마다 직접 계산합니다. `details.edge + details.age − currentTime`, 곧 목록 끝에 목록이 마지막으로 자란 뒤 흐른 시간을 더하고 재생 위치를 뺀 값입니다.

```ts
// 프로젝트 저장소(비공개) web/src/features/player/liveCatchup.ts 발췌
// readHlsCatchup: 라이브 끝 추정 위치 = details.edge + details.age
liveEdgeS: judged ? edgeS + ageS : 0,
// watchLiveCatchup 의 timeupdate 리스너: 표본마다 지연을 직접 잰다
const latencyS = liveEdgeS - currentTimeS;
```

hls.js 1.7.3의 `estimateLiveEdge` · `computeLatency`와 같은 식이라([314–328행](https://github.com/video-dev/hls.js/blob/v1.7.3/src/controller/latency-controller.ts#L314-L328)), 리스너 순서와 상관없이 같은 답을 냅니다.

## 시크바 숫자와 손잡이도 라이브 끝에서 멈추게 했습니다

라이브 끝에서 시크바도 흔들렸습니다. LL-HLS 목록은 0.5초 파트 단위로 자라므로 실제 시차가 1.4초, 1.6초를 오가고, 이를 반올림해 보이면 숫자가 1과 2를 오갑니다. 이제 보이는 숫자는 실제 시차가 지금 숫자에서 1초 넘게 벗어날 때만 바꿉니다. 시청자가 시크하거나 「실시간으로」를 누른 직후에는 반올림한 값으로 다시 잡습니다.

손잡이도 끝 3초 안이면 오른쪽 끝(100%)에 둡니다. 전에는 「실시간」 표시가 떠 있는데 손잡이는 그 시차만큼 왼쪽에 서서, 표시와 손잡이가 따로 놀았습니다. 「끝에 있는가」는 보이는 숫자가 아니라 반올림 전 시차로 한 번만 정하고, 손잡이 · 「실시간으로」 버튼 · 끝 3초 시크가 그 답을 함께 씁니다.

## 운영에서 5분 재 보니 지연 중앙값이 1.29초였습니다

이 변경은 2026년 11월 20일 02:06(KST)에 develop에 머지됐고, 11월 20일 03시 33분(KST) 운영에 배포됐습니다. 배포 뒤 03:42–04:01(KST)에 OBS로 단색 화면을 내보내는 시험 방송을 열고, 데스크톱 Chrome 157로 라이브 화면을 2초마다 재었습니다. 지연은 영상 요소의 `seekable` 끝 − `currentTime`입니다. 앞 절들의 공개 재측정과 달리 프로젝트의 운영 측정이고, 원자료는 공개하지 않습니다. 고치기 전에는 같은 화면이 실시간보다 약 17초까지 밀려 있었습니다.

| 운영에서 본 것(2초 표본 기준) | 결과 |
|---|---|
| 지연(5.1분, 표본 153개) | 중앙값 1.285초 · p95 1.286초 · 최소 1.127초 · 최대 2.55초 |
| 같은 5.1분의 배속 변경 · `waiting` · 앱이 건 시크 | 1번(1.1 → 1) · 0번 · 0번 |
| 10초 되감기 | 44초 동안 지연 11.34초 그대로, 배속 변경 0번 |
| 「실시간으로」 누름 | 지연 1.09초, 배속 변경 0번, 시크 1번 |

운영 목록의 PART-HOLD-BACK은 1.25초, PART-TARGET은 0.5초였고, TARGETDURATION은 재측정 실험대(4초)와 달리 6초였습니다. 지연 중앙값 1.285초는 PART-HOLD-BACK 1.25초에 붙어 있습니다. 10초 되감은 시청자는 끌어당겨지지 않았습니다. 「실시간으로」를 누른 뒤에는 시크 한 번으로 끝났습니다. 머지 전 비공개 로컬 실측에서는 이때 1.1배가 잠깐 켜졌다 꺼지기도 했는데, 2초 표본으로 잰 이번 운영 측정에서는 보이지 않았습니다. 그런 배속 변경은 수백 ms 안에 끝나 표본 사이에 묻힐 수 있으므로, 표의 배속 변경 횟수도 2초 표본에서 본 값입니다. 지연을 표본마다 직접 계산하게 고친 것과 어긋나지 않는 결과이지만 한 번의 관찰입니다.

이 측정에는 한계가 있습니다. 방송 한 번, 움직임 없는 단색 화면, 데스크톱 Chrome 하나, 5.1분입니다. 끊김이 잦은 망이나 움직임이 많은 화면, 다른 브라우저는 재지 않았습니다.

## Safari · iOS와 되감기 넘김은 아직 재지 않았습니다

- **확인한 것.** 프로젝트 저장소(비공개)의 규칙 단위 시험과 실물 hls.js 1.7.3 시험, 비공개 로컬 실측, 이 글의 공개 재측정, 데스크톱 Chrome의 운영 측정(위 절)입니다. 공개 재측정은 규칙을 새로 짠 실험 페이지에서 했고, PokeClip 재생기 코드를 돌린 것은 아닙니다.
- **확인하지 않은 것.** 실제 Safari.app과 iOS 기기에서의 멎음과 점프 체감, 데스크톱 Chrome 밖의 운영 지연, 되감기에서 라이브로 넘어간 뒤 배속만 쓰다가 확인이 끝나면 점프로 오르는 경로입니다. 마지막 것은 세션과 되감기 서버가 있어야 생겨서 로컬에서는 단위 시험만 거쳤습니다.
- **알고 둔 성질.** 목표 지연은 끊김마다 1초씩 늘고 줄지 않습니다. 끊김이 쌓이면 목표가 PART-HOLD-BACK + 목표 조각 길이(운영 목록이면 1.25 + 6 = 7.25초, 재측정 실험대는 5.25초)까지 오르고, 그때는 화면 시차가 0으로 보여도 실제 지연은 그만큼입니다. 목록이 10초쯤마다 몰아서 자라는 송출에서는 배속이 자주 켜지고 꺼진다는 비공개 로컬 실측이 있었습니다. Chrome에서는 전환 멎음이 작다고 보고 규칙을 그대로 두었고, 공개 재측정의 Chrome 전환도 최대 83ms였습니다. 이 송출 꼴은 다시 재지 않았습니다.
- **브라우저가 건 멈춤.** iOS에서 앱을 전환하는 등 브라우저가 영상을 멈추면 시청자의 일시정지로 쳐서 따라잡기가 꺼지고, 「실시간으로」를 누르기 전까지 켜지지 않습니다.
- **탭 전환은 다루지 않습니다.** 이 글의 확인은 보이는 탭에서 재생 중인 경우뿐입니다. 탭을 바꾸거나 백그라운드 탭에 두었다가 돌아왔을 때 라이브를 이어 간다고 주장하지 않습니다. 배포 뒤 Chrome 백그라운드 탭에서 멈춘 소리 꺼진 영상이 탭으로 돌아와도 다시 재생되지 않는 버그가 발견됐고, 고치는 중입니다.

라이브 지연을 줄이는 기능을 넣을 때는 먼저 「누가 라이브를 보고 있는가」를 재생 위치가 아니라 시청자의 행동으로 정하십시오. 거리로 정하면 되감은 사람을 끌어당기고, 그 사람을 지키려고 기능을 끄면 밀린 사람이 남습니다. 배속을 쓰기 전에는 대상 브라우저에서 배속 전환 한 번이 프레임을 얼마나 멈추는지부터 재 보십시오.

## 측정 조건

- **공개 재측정.** AI(Claude Code)가 2026년 11월 20일 03:23–03:48 KST에 실행했습니다. Mac(Apple M5 · Mac17,3), macOS 27.0.1, OrbStack(Docker Engine 29.8.2), Node 26.4.0. 공식 [`bluenviron/mediamtx:1.21.1`](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.1) 이미지(다이제스트 `sha256:5ce2a948…`)를 `hlsVariant: lowLatency` · 4초 조각 · 500ms 파트 · 7조각으로 띄웠고, 프로젝트 저장소(비공개)의 로컬 MediaMTX 설정과 같은 값입니다. 실물 목록은 `TARGETDURATION:4` · `PART-HOLD-BACK=1.25000` · `PART-TARGET=0.50000`이었습니다. 운영 목록은 TARGETDURATION이 6초라 이 점이 다릅니다.
- **송출.** ffmpeg 9.0.2 `testsrc2` 640×360 30fps, libx264 GOP 2초, AAC 1채널 사인파를 RTMP로 로컬 MediaMTX에 보냈습니다. 운영은 OBS의 SRT 송출입니다.
- **재생기.** npm의 hls.js 1.7.3을 `lowLatencyMode: true` · `maxLiveSyncPlaybackRate: 1`로 띄운 실험 페이지입니다. 따라잡기 규칙은 이 글의 규칙을 새로 짠 최소 구현이며 PokeClip 재생기 코드가 아닙니다. 소리는 껐습니다.
- **브라우저.** Playwright 1.60.0. Chromium 쪽은 설치된 Google Chrome 157.0.8103.79를 `channel: 'chrome'`으로 띄웠습니다. Playwright가 내려받는 Chromium 빌드에는 Chrome이 담은 코덱이 다 들어 있지 않기 때문입니다([Playwright 「Media codecs」](https://playwright.dev/docs/browsers#media-codecs)). WebKit은 Playwright WebKit 2287(`Version/26.4`)입니다. 둘 다 headless입니다. 프레임 틈과 끊김 실험은 한 번에 브라우저 하나만 돌렸고(끊김 실험의 페이지 여럿은 같은 브라우저 안), 지연 캐시 실험은 두 브라우저를 겹쳐 돌렸습니다. 끊김 실험의 재실행(같은 날 08:44–08:50 KST, 고친 실험 스크립트)에서는 Chrome이 157.0.8103.80으로 올라 있었습니다.
- **프레임 틈.** `requestVideoFrameCallback` 콜백이 불린 시각(`now`)의 간격으로, 화면 갱신 주기 단위입니다([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)). 중앙값은 개수가 짝수면 가운데 두 값의 평균입니다. 전환마다 앞뒤 1초 창의 최대 간격 하나를 세고, 기준 실행은 같은 3초 일정의 창으로 셌습니다. headless 브라우저의 값이라 실제 화면에 보이는 멎음과 같다고 보장하지 않습니다.
- **끊김.** 같은 출처 프록시가 HLS 요청을 6초, 13초 붙잡았다 놓아 만들었습니다. 영상과 본문 수치는 첫 실행이고, 같은 조건의 재실행 1회를 함께 공개합니다. Chrome은 재실행에서도 36.6초 만에 목표 근처로 돌아왔습니다.
- **명령 · 원자료.** 실행 순서와 스크립트, JSON 원자료는 [저장소 `_workspace/blog/pokeclip-live-catchup-live-viewers-only/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-live-catchup-live-viewers-only/measure)에 있습니다.
- **운영 측정.** 2026년 11월 20일 03:42–04:01 KST, 운영 배포판(v2.0.3)에서 OBS 단색 화면 시험 방송을 데스크톱 Chrome 157로 보며 2초마다 표본을 받았습니다(5.1분 153개). 지연은 영상 요소의 `seekable` 끝 − `currentTime`으로, 공개 재측정의 `edge + age − currentTime`과 식이 다릅니다. 운영 목록은 `PART-HOLD-BACK` 1.25초 · `PART-TARGET` 0.5초 · `TARGETDURATION` 6초였습니다. 제 지시로 AI 에이전트가 했고, 원자료는 공개하지 않습니다.
- **비공개 로컬 실측.** 머지 전 AI 에이전트가 프로젝트 재생기 코드로 잰 값은 공개하지 않습니다. 이 글의 수치는 17초 관찰과 운영 측정을 빼면 모두 위 공개 재측정입니다.
- **코드 인용.** 프로젝트 코드 발췌는 비공개 저장소의 2026년 11월 20일 02:06(KST) 머지 시점이고, hls.js는 태그 `v1.7.3`입니다. WebKit 버그 상태는 2026년 11월 20일에 확인했습니다.

## 출처

프로젝트

- 프로젝트 저장소(비공개) — 따라잡기 모듈 · 재생 훅 · hls.js 설정. 본문에 필요한 부분만 발췌했습니다.
- [Go로 다 짜려던 미디어 서버를 MediaMTX에 맡겼습니다](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/) — 따라잡기를 끈 hls.js로 되감기를 살린 앞 글
- [HLS 라이브와 DVR 목록을 나누자 넘김 조건이 생겼습니다](/posts/0-to-1/pokeclip-live-dvr-separation-handoff/) — 라이브 · 되감기 넘김

라이브러리 · 브라우저

- [hls.js v1.7.3 `src/controller/latency-controller.ts`](https://github.com/video-dev/hls.js/blob/v1.7.3/src/controller/latency-controller.ts) — 목표 지연 · 배속 추격 · 지연 캐시
- [hls.js v1.7.3 `src/config.ts`](https://github.com/video-dev/hls.js/blob/v1.7.3/src/config.ts#L471-L477) — 따라잡기 기본값
- [hls.js v1.7.3 `src/loader/level-details.ts`](https://github.com/video-dev/hls.js/blob/v1.7.3/src/loader/level-details.ts#L131-L161) — `edge` · `age`
- [WebKit Bug 163433 「playbackRate update while playing creates a small pause in the playback」](https://bugs.webkit.org/show_bug.cgi?id=163433) — 2016년 보고, 2026-11-20 기준 NEW
- [WebKit Bug 208142 「Setting video playbackRate causes video playback disruption」](https://bugs.webkit.org/show_bug.cgi?id=208142) — 163433의 중복
- [HTML Standard 「Playing the media resource」](https://html.spec.whatwg.org/multipage/media.html#playing-the-media-resource) — `timeupdate` 간격 15–250ms
- [MDN `requestVideoFrameCallback()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback) — 프레임 시각을 받는 방법
- [Playwright 「Browsers」 · Media codecs](https://playwright.dev/docs/browsers#media-codecs) — Chromium 빌드와 Chrome의 코덱 차이
- [MediaMTX v1.21.1 릴리스](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.1) — 재측정에 쓴 공식 이미지 판

측정

- [공개 재측정 스크립트 · 원자료](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-live-catchup-live-viewers-only/measure) — 공개 재측정 수치의 스크립트 · 원자료(운영 측정과 17초 관찰은 들어 있지 않습니다)
