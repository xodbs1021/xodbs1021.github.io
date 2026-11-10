---
title: "같은 세션 재접속에 HLS 끊김 표시를 달지 않은 이유"
date: "2026-10-15T11:28:22+09:00"
lastmod: "2026-11-11T07:57:53+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "송출이 짧게 끊겼다 다시 붙은 경계에서 소리가 0.2초 비던 문제를, 다음 조각을 먼저 끝난 트랙 끝에 잇고 같은 세션 안에서는 EXT-X-DISCONTINUITY를 빼는 조합으로 푼 판단. A · B · C 변형의 버퍼 비교, init이 같은 150조각 입력의 탐색 12/12, 세션 사이 계승 · init 변경과의 구분, 그리고 나중 실측에서 드러난 영상 8–9프레임 손실과 남은 이음 규칙 개정."
tags: ["PokeClip", "HLS", "EXT-X-DISCONTINUITY", "hls.js", "재접속", "시간축"]
portfolio_cases: [25]
portfolio_pages: [15]
portfolio_edition: "2026-10-15-v2"
---

PokeClip 되감기용 재포장을 시험하려고 송출을 3초, 8초 끊었다가 같은 세션으로 다시 붙인 녹화를 이어 붙였더니, 경계마다 소리가 0.19–0.22초 비었습니다. 끊기기 직전 조각의 소리가 영상보다 그만큼 먼저 끝났기 때문입니다. 다음 조각을 먼저 끝난 소리 끝에 붙여도 경계에 HLS 끊김 표시(`#EXT-X-DISCONTINUITY`)가 있으면 hls.js가 우리 시각을 버리고 다시 배치해 버퍼가 셋으로 갈렸습니다. 같은 세션 안에서는 끊김 표시를 빼자 버퍼가 하나로 이어졌고, init이 150조각 모두 같은 10분 입력에서 hls.js 1.7.3 탐색 12번이 모두 성공했습니다. 대가는 경계의 영상 겹침이었습니다. 10월 28–29일 실측에서는 브라우저가 겹친 앞 영상 8–9프레임(0.27–0.30초)을 지웠고, 이 이음 규칙의 개정은 아직 정하지 않았습니다.

다음 조각의 위치 규칙(조각의 녹화기 시각 + 보정값, 녹화기 표식이 바뀌면 앞 조각 끝에 잇기)은 제가 낸 안이고, 세션 안에서 끊김 표시를 달지 않기로 한 것(9월 19일)과 그 적용을 init이 같은 입력으로 한정한 것도 제가 정했습니다. 재포장 실험 프로그램과 실측, 생산 코드 구현은 AI(Claude Code)가 했습니다. 당시 기록과 코드 주석은 이 글의 세션을 「회차」라고 불렀습니다. 지금은 시청자가 「방송 한 번」으로 보는 단위를 회차라고 부르고, 세션은 그 안에서 사이드카가 목록 하나를 여닫는 단위이며, 계승으로 이어진 세션 묶음을 사슬이라고 부릅니다([회차 다시보기 글](/posts/projects/pokeclip-round-vod/)). 포트폴리오 요약(2026-10-15판) 15쪽의 「같은 회차·동일 init」도 지금의 세션입니다.

## 재접속 경계에서 소리가 0.2초 비었습니다 {#영상의-끝에-맞추면-오디오가-비었습니다}

되감기 목록은 녹화 조각을 영상 1개·소리 1개로 다시 포장해 씁니다. 다시 포장하면서 조각마다 시각 도장(조각 안 첫 표본의 미디어 시각, tfdt)을 새로 매깁니다. 같은 녹화기 연결 안에서는 도장이 앞 조각 끝에 맞닿습니다. 송출이 다시 붙으면 녹화기 시각이 0으로 돌아가므로, 다음 조각을 어디에 둘지 정해야 했습니다.

끊기기 직전 마지막 조각은 영상이 238.9667초, 소리가 238.7476초에 끝났습니다. 소리가 0.22초 먼저 끝난 것입니다. 두 경계에서 이 차이는 0.19–0.22초였고, 재포장 방식과 무관하게 녹화 원본에 있던 성질이었습니다. 다음 조각을 늦게 끝난 영상 끝에 놓으면 소리에 그만큼 빈 구간이 생깁니다. 먼저 끝난 소리 끝에 놓으면 소리는 이어지지만 영상이 앞 조각 꼬리와 겹칩니다.

영상에서 위 두 줄이 영상·소리 트랙이고, 다음 조각이 어느 끝에 붙느냐에 따라 소리 줄의 빨간 빈틈이 영상 줄의 빨간 점선 겹침으로 바뀝니다.

{{< motion scene="AudioGapSeam" id="fig-audio-gap-seam" kind="개념도" caption="끊기기 직전 조각의 소리가 영상보다 약 0.2초 먼저 끝납니다. 다음 조각을 늦게 끝난 영상 끝에 놓으면 소리가 비고, 먼저 끝난 소리 끝에 놓으면 소리는 이어지지만 영상이 겹칩니다. 끊김 표시가 있으면 hls.js가 다시 배치해 버퍼가 셋으로 갈리고, 같은 세션 안에서 표시를 빼면 하나로 이어집니다. 0.2초를 크게 늘려 그린 설명용 그림입니다." >}}

## 이른 트랙 끝에 붙여도 끊김 표시가 있으면 버퍼가 셋으로 갈렸습니다

9월 19일 10분짜리 녹화(조각 150개, 끊김 두 번)를 세 가지로 다시 포장해 hls.js 1.5.15로 끝까지 재생하고 12곳을 탐색했습니다.

| 변형 | 다음 조각 위치 | 끊김 표시 | 버퍼 구간 |
|---|---|---|---|
| A | 늦게 끝난 트랙(영상) 끝 | 있음 | 셋으로 갈림 |
| B | 먼저 끝난 트랙(소리) 끝 | 있음 | 셋으로 갈림(A와 같은 구간) |
| C | 먼저 끝난 트랙(소리) 끝 | 없음 | 하나로 이어짐 |

A에서 B로 위치만 바꿨을 때 버퍼 구간은 한 글자도 달라지지 않았습니다. 끊김 표시가 있으면 hls.js가 우리가 매긴 도장 대신 자기 계산으로 새 구간을 놓기 때문입니다. A와 B는 경계마다 버퍼 멈춤 오류(`bufferStalledError`)가 나고 조금씩 밀어 넘겼으며, A는 경계 안쪽 탐색 두 곳이 실패했습니다. C는 오류와 멈춤 없이 두 경계를 관통하는 버퍼 하나가 됐고, 경계 한가운데로 탐색해도 재생됐습니다. 시각을 고치는 것만으로는 부족했고, 플레이어가 그 시각을 그대로 쓰게 하려면 표시도 함께 빼야 했습니다.

## 녹화기 표식이 바뀌어도 세션은 그대로입니다 {#녹화기의-표식은-논리-회차와-같지-않았습니다}

표시를 뺄 수 있는 범위는 세션 안으로 한정했습니다. 녹화기(MediaMTX)가 조각에 찍는 표식은 송출자가 다시 붙거나 녹화기 시계가 벽시계와 5초 넘게 벌어지면 바뀝니다. 표식이 바뀌었다고 새 세션으로 보면 짧은 끊김마다 목록이 갈립니다. 그래서 세션을 여닫는 판정은 사이드카가 하고, 표식 변경은 「다음 조각을 앞 조각 끝에 이어라」는 신호로만 씁니다. 표식과 세션의 관계는 [세션 주소 글](/posts/0-to-1/pokeclip-session-url-and-endlist/)에 있습니다.

그림 2는 다시 붙은 송출이 세 갈래로 갈리는 모습입니다. 끊김 표시가 서는 곳은 가운데 갈래인 세션 사이 경계뿐입니다.

```mermaid {#fig-reconnect-branches kind="개념도" caption="다시 붙은 송출의 세 갈래. 세션이 열린 채 같은 init으로 붙으면 끊김 표시 없이 도장을 앞 조각 끝에 잇습니다. 세션이 닫힌 뒤 300초 안에 같은 코덱 사양으로 붙으면 앞 세션을 계승한 새 세션 경계에 DISCONTINUITY와 새 MAP을 답니다. init이 바뀌면 세션을 init_mismatch로 끝내고 같은 회차의 새 사슬로 엽니다. PokeClip-mono develop 825a3dfe의 discontinuity.go · axis_body.go · round_rule.go 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/rewind/discontinuity.go#L5-L16"}
flowchart LR
  accTitle: 다시 붙은 송출의 끊김 표시 위치
  accDescr: 다시 붙은 송출은 세 갈래로 간다. 세션이 열린 채 init이 같으면 세션 안 재접속이라 끊김 표시가 없고 도장을 앞 조각 끝에 잇는다. 세션이 닫힌 뒤 300초 안에 코덱 사양이 같으면 앞 세션을 계승한 새 세션이 되고 경계에 DISCONTINUITY와 새 MAP을 단다. init이 바뀌면 세션을 init_mismatch로 끝내고 같은 회차의 새 사슬을 연다.
  R[다시 붙은 송출] --> A[세션 안 재접속<br/>끊김 표시 없음<br/>도장을 앞 끝에 이음]
  R --> B[계승한 새 세션<br/>DISCONTINUITY<br/>+ 새 MAP]
  R --> C[init 변경<br/>세션 종료<br/>같은 회차 새 사슬]
  style A fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

- **세션 안 재접속.** 의도적 종료 표식이나 목표 길이 초과가 없으면, 열린 세션의 조각은 그 세션에 붙습니다([`registry.go` 446–475행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/session/registry.go#L446-L475)). 끊김 표시는 계승한 세션의 첫 조각 앞에만 서고, 세션 안에서는 끊김이 있어도 달지 않습니다([`discontinuity.go` 5–16행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/rewind/discontinuity.go#L5-L16), 주석의 「회차」는 지금의 세션). 이 끊김은 PDT의 점프로만 드러납니다.
- **세션 사이 계승.** 세션이 닫힌 뒤 300초 안에 같은 코덱 사양으로 돌아오면 새 세션이 앞 세션 조각을 이어 받고, 경계에 DISCONTINUITY와 새 MAP(초기화 조각 init)을 답니다.
- **init 변경.** 다시 포장한 init이 세션의 MAP과 다르면 그 조각을 올리지 않고 세션을 `init_mismatch`로 끝냅니다([`axis_body.go` 225–233행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/upload/axis_body.go#L225-L233)). 이 사유는 계승할 수 없는 종료이고([`ending.go` 29행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/ending.go#L29)), 300초 안에 붙은 다음 조각은 같은 회차의 새 사슬을 엽니다([`round_rule.go` 75–113행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/session/round_rule.go#L75-L113)).

다시 포장한 조각의 도장은 「그 조각의 녹화기 시각(mtxi) + 세션 보정값」입니다. 평소 보정값은 0이고, 녹화기 표식이 바뀌거나 녹화기 시각이 뒤로 가면 보정값을 올려 앞 조각의 먼저 끝난 트랙 끝에 잇습니다. 같은 녹화기에서 시각이 예상보다 50ms 넘게 건너뛰면 그 구멍을 압축해 잇습니다([`media/README.md` 「시간 도장」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1372-L1390)). 이 도장은 목록에 적는 PDT(장부가 매기는 벽시각)와 별개의 값입니다. PDT가 어긋난 문제와 그 개정은 [미디어 시간축 글](/posts/projects/pokeclip-media-timeline-over-wall-clock/)에 있습니다.

## init이 같은 150조각에서 탐색 12번이 모두 이어졌습니다 {#150개-init이-같았던-입력에서-확인했습니다}

시험 입력은 임시 MediaMTX에 ffmpeg로 4분 송출, 3초 끊김, 4분 송출, 8초 끊김, 2분 송출을 보낸 녹화입니다. 다시 포장한 init은 150개 모두 해시가 같았습니다. 같은 녹화기 연결 안의 조각 경계 147곳은 영상 ±1틱, 소리 ±1표본 안에서 맞닿았습니다.

| 확인 | 결과 |
|---|---|
| C′(EXTINF를 원래 영상 길이로 둠), hls.js 1.5.15 | 두 경계 통과, 오류 0, 버퍼 하나 |
| C′ 전 구간, hls.js 1.7.3(9월 23일) | 오류 0 · 멈춤 0 · 탐색 12/12 · 버퍼 하나 |
| C′, AVFoundation(Safari의 HLS 스택, 9월 23일) | 두 경계에서 멈춤 0 · 오류 0 |
| 경계의 소리(9월 23일, 사인파 트랙 연속 디코드) | 경계 표본 점프가 평소 기울기의 1.0배, 무음 0 |

C는 경계 직전 조각의 EXTINF를 소리 길이로 줄여 적은 목록이었습니다. 실제 시스템은 장부의 영상 길이를 그대로 쓰므로, EXTINF를 원래 값으로 둔 C′를 따로 돌렸고 역시 통과했습니다. 목록 길이까지 고쳐야만 경계를 넘는 것은 아니었습니다.

이 끊김 두 번이 지금 기준으로도 세션 안 재접속인지 코드와 대조했습니다. 실험은 끊김을 당시 세션 종료 판정(약 12초)보다 짧게 잡아 같은 세션 안의 재접속으로 설계했습니다. 지금 코드에서 의도적 종료 신호 없이 세션이 닫히려면 세 조건이 모두 서야 합니다. 녹화기가 송출 중이 아님을 관측하고, 마지막 조각 끝에서 그 조각 길이의 세 배가 지나고, 그 관측 뒤 10초(`SEGMENT_IDLE_TIMEOUT` 기본값)가 지나 시작한 파일 점검이 결손 없이 끝나야 합니다([`judgment.go` 217–300행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/indexer/judgment.go#L217-L300)). 3초와 8초 끊김은 마지막 조건의 10초가 지나기 전에 송출이 돌아오므로, 지금 규칙으로도 세션이 닫히지 않습니다. 다만 이 실험은 사이드카 없이 재포장 프로그램으로 돌렸으므로, 사이드카가 실제로 같은 세션에 넣는 것까지 본 것은 아닙니다.

범위는 VOD 형 고정 목록 하나입니다. 끊김 표시를 빼야 버퍼가 이어진다는 근거는 hls.js에서 본 것이고, AVFoundation은 표시가 있는 A·B 변형에서도 멈추지 않았습니다. 슬라이딩 되감기 목록, 다른 플레이어 판, OBS 송출은 이 실험에 없고, 소리는 계기로 분석했을 뿐 귀로 듣지 않았습니다. 계기 분석에서 표시가 있어 디코더가 다시 시작되는 쪽은 첫 20ms에 진폭이 다시 차오르는 경사가 생겼습니다.

## 대가는 영상 겹침이었고 나중 실측에서 프레임 8–9개가 지워졌습니다 {#버퍼를-잇는-대신-겹치는-영상-시각을-받아들였습니다}

먼저 끝난 소리에 맞추면 영상 도장이 앞 조각 꼬리와 최대 약 0.22초 겹칩니다. HLS 규격은 타임스탬프 순서가 바뀌는 경계에 끊김 표시를 요구합니다([RFC 8216 4.3.2.3](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.2.3)). 세션 안에서 표시를 뺀 것은 확인한 플레이어 동작을 근거로 둔 좁은 예외이고, 규격을 무시해도 된다는 일반 규칙이 아닙니다. 그래서 init이 같은 세션 안으로 묶었고, init이 바뀌면 위 세 번째 갈래로 세션을 끝냅니다. 도장을 앞 조각 끝에 잇는 생산자는 9월 24일 [PR #192](https://github.com/3K-PokeClip/PokeClip-mono/pull/192), 세션 안에서 끊김 표시를 달지 않는 목록 렌더는 9월 25일 [PR #196](https://github.com/3K-PokeClip/PokeClip-mono/pull/196)으로 develop에 들어갔습니다.

겹침의 비용은 10월 28–29일 다른 실측에서 드러났고, 10월 30일 원인을 분석했습니다. 되감기에서 라이브로 넘기는 기능을 재던 중, 같은 세션 안 재접속 경계에서 화면에 나와야 할 영상 8–9프레임(0.27–0.30초)이 빠졌습니다. 다음 조각의 영상이 앞 조각 꼬리와 겹치게 놓였고, 브라우저의 MSE(Media Source Extensions, 웹에서 미디어 버퍼를 채우는 API)가 겹친 앞 프레임을 지운 것이었습니다. 소리에는 빈틈이 없었습니다. 그 기능의 완료 기준인 「녹화 손실 0」은 이 때문에 아직 충족하지 못했습니다([라이브와 되감기 목록을 나눈 글](/posts/0-to-1/pokeclip-live-dvr-separation-handoff/)).

남은 한계는 둘입니다.

- **이음 규칙 개정.** 먼저 끝난 트랙에 잇는 9월 19일 규칙을 10월 30일 PDT 계약 개정 범위에 넣었고, 어떻게 바꿀지는 아직 정하지 않았습니다. 개정이 배포되면 이 경계의 화면 손실을 다시 잽니다.
- **재기동과 보정값.** 보정값은 사이드카 메모리에만 있습니다. 한 세션 안에서 보정값이 0이 아니게 된 사건(재접속 등)과 사이드카 재기동이 함께 일어나면 보정값을 잃어 그 지점의 도장이 뒤로 갈 수 있습니다. 둘 중 하나만 일어난 세션은 대개 역행이 없습니다. 다만 세션 첫 조각의 녹화기 시각이 음수라 처음부터 보정값이 0이 아닌 세션은 재기동만으로도 그 크기(공개 문서 기준 약 44ms)만큼 도장이 뒤로 갈 수 있습니다. 알려진 한계로 기록돼 있고([`media/README.md` 1590–1596행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1590-L1596)), 재기동 복구는 다음 판 범위입니다.

0.2초 소리 빈틈을 없애는 선택은 영상 겹침을 받아들이는 선택이기도 했습니다. 같은 문제를 다룬다면 시각 보정과 끊김 표시를 따로 고치지 말고 한 쌍으로 시험하십시오. 그리고 겹침이 생기는 쪽에서는 버퍼가 겹친 프레임을 어떻게 처리하는지까지 화면으로 재 보십시오.

## 측정 조건

- 9월 19일: 임시 MediaMTX(프로젝트 포크 v1.20.1, 녹화 4초 분할)에 컨테이너 ffmpeg로 영상 1개(1280×720, 30fps, GOP 2초, B 프레임 2)와 소리 6트랙(사인파)을 SRT로 송출했습니다. 끊김 3초·8초, 조각 150개. 재포장은 mediacommon v2.9.3 기반 실험 프로그램, 재생은 hls.js 1.5.15를 8배속으로 끝까지 돌리고 12곳 탐색. 숨긴 브라우저 창이라 크롬이 음소거 영상을 주기적으로 멈췄고 실효 배속은 4–5배였습니다.
- 9월 23일: 같은 산출물로 hls.js 1.7.3(전 구간, 탐색 12곳), AVFoundation(macOS, 경계 앞뒤 16–18초 재생), ffmpeg 8.1.2 AAC 연속 디코드로 경계 소리를 분석했습니다.
- 10월 28–29일: 로컬 실험대에서 넘김 기능을 재는 중 관측한 같은 세션 안 재접속 경계의 화면 손실, Playwright Chrome·WebKit. 원인 분석은 10월 30일입니다.
- 모두 AI가 수행했고 원자료는 비공개입니다. 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 10일) 기준입니다.

## 출처

- [RFC 8216 4.3.2.3 EXT-X-DISCONTINUITY](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.2.3)
- [3K-PokeClip/PokeClip-mono PR #192](https://github.com/3K-PokeClip/PokeClip-mono/pull/192) — 되감기용 재포장 생산자와 축별 업로드(2026-09-24 develop 머지)
- [3K-PokeClip/PokeClip-mono PR #196](https://github.com/3K-PokeClip/PokeClip-mono/pull/196) — 되감기 목록의 문법과 경계, 끊김 표시 규칙(2026-09-25 develop 머지)
- [PokeClip-mono `media/README.md` 「시간 도장」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1372-L1390) · [재기동 한계](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1590-L1596)
- [PokeClip-mono `discontinuity.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/rewind/discontinuity.go#L5-L16) · [`registry.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/session/registry.go#L446-L475) · [`judgment.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/indexer/judgment.go#L217-L300) · [`axis_body.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/upload/axis_body.go#L225-L233) · [`ending.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/ending.go#L29) · [`round_rule.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/session/round_rule.go#L75-L113) — 끊김 표시 · 세션 판정 · 종료 · init 변경 · 합류
- [끝난 HLS 목록은 다시 열지 않고 새 세션 주소를 줬습니다](/posts/0-to-1/pokeclip-session-url-and-endlist/) — 세션 사이 계승
- [HLS 클립은 왜 벽시각 대신 미디어 시각으로 자를까?](/posts/projects/pokeclip-media-timeline-over-wall-clock/) — PDT와 도장의 구분, 계약 개정
- 팀 내부 실험 기록(비공개) — 9월 19·23일 재포장·재생 실측, 10월 28–29일 넘김 실측과 10월 30일 원인 분석

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 15쪽](/portfolio/2026-10-15-v2/full.pdf#page=15)
