---
title: "HLS 녹화 재생을 가른 것은 init이 아니라 tfdt였습니다"
date: "2026-10-15T11:28:22+09:00"
lastmod: "2026-11-11T15:40:00+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "같은 MediaMTX 녹화 파일 10개를 원본 그대로(A), 공통 init만 분리(B), B에서 tfdt만 바꾼(C) HLS 목록으로 hls.js 1.5.15에서 재생해 8.10초·8.10초·39.87초를 얻은 단일 변수 대조. B와 C는 193바이트 위치만 달랐습니다. 두 트랙에 같은 시작 간격을 더해 A/V 차이를 지킨 실험 규칙이 생산 코드에서 「mtxi + 세션 보정값」 도장으로 바뀐 과정까지."
tags: ["PokeClip", "HLS", "fMP4", "검증", "tfdt", "MediaMTX", "hls.js"]
portfolio_cases: [23]
portfolio_pages: [12]
portfolio_edition: "2026-10-15-v2"
---

같은 MediaMTX 녹화 파일 10개(39.87초 분량)를 HLS 목록에 세 가지로 넣어 hls.js 1.5.15로 재생했습니다. 원본 그대로 나열한 목록(A)과 공통 init만 분리한 목록(B)은 둘 다 8.10초로 잡혔고, 20초로 탐색하면 8.10초에서 멈췄습니다. B에서 tfdt(조각 안 첫 표본의 디코딩 시각)만 바꾼 목록(C)은 39.87초 전체가 버퍼에 들어왔고 20초 탐색도 그 자리에 섰습니다. B와 C 파일은 tfdt 값이 든 193바이트 위치만 달랐습니다. 재생을 가른 것은 init 구조가 아니라 tfdt였습니다.

2026년 8월 30일 이 재현은 MediaMTX의 tfdt 동작을 따로 재현해 보라고 제가 맡긴 과제였고, 실험 설계·실행·판정은 AI가 했습니다. 첫 설계는 대조군 하나에 변수가 둘 섞여 있었습니다. Codex 리뷰가 이를 지적해 A·B·C 단일 변수 대조로 나눴고, Claude Code 리뷰가 새 시각을 mtxi에서 계산하자고 해 다시 짰습니다. 포트폴리오 요약(2026-10-15판) 12쪽은 이 변환 규칙을 「내가 채택한 변환 규칙」으로 적었지만, 그것은 리뷰를 거쳐 AI가 정한 실험용 규칙이었습니다. 제품에 들어간 규칙은 9월 19일 제가 낸 안인 「조각의 mtxi + 세션 보정값」입니다(마지막 절).

## MediaMTX는 방송 안 위치를 tfdt가 아니라 mtxi에 적습니다 {#공식-playback을-생략하면-그-역할도-옮겨야-합니다}

MediaMTX 녹화 파일은 파일 하나로 재생할 수 있게 tfdt를 파일 시작 기준으로 적습니다. 이번 녹화에서도 10개 파일 모두 영상 첫 tfdt가 0.000–0.320초(키프레임 정렬로 생긴 파일 안 차이), 소리 첫 tfdt가 정확히 0이었습니다. 파일이 방송 안 몇 초 자리에 있는지는 MediaMTX가 init에 넣는 자체 상자 `mtxi`에 따로 있습니다. mtxi에는 녹화기 표식, 조각 번호, 누적 DTS(디코딩 시각), NTP 벽시각이 들어 있고, 이번 파일들은 같은 표식 아래 조각 번호가 0에서 9로, 누적 DTS가 0에서 35.776초로 늘었습니다.

이 누적 값도 송출이 다시 붙으면 처음으로 돌아갑니다. 같은 날 송출을 18초 보내고 끊었다가 바로 다시 붙이자, 다시 붙은 뒤 첫 파일의 녹화기 표식이 바뀌고 조각 번호·누적 DTS·tfdt가 모두 0이 됐습니다. 새 방송을 시작한 파일과 구별되지 않는 모양입니다.

MediaMTX의 공식 [playback 서버](https://mediamtx.org/docs/features/playback)는 이 정보로 파일들을 이어 줍니다. PokeClip은 녹화를 S3에 올려 CDN에서 브라우저로 바로 보내기로 했고, CDN은 저장된 바이트를 그대로 전달할 뿐 그 안의 시각을 고치지 않습니다. 그래서 시각을 다시 매기는 일을 우리가 맡아야 했습니다. 그 필요는 이미 8월 19일 재생 시험([앞 글](/posts/0-to-1/pokeclip-zero-errors-missing-playback/))과 8월 28일 시험(조각마다 그대로 복사하면 `fragParsingError`)으로 섰고, 8월 30일 재현은 무엇을 고쳐야 하는지를 tfdt로 좁혔습니다.

## init만 나눈 B와 tfdt까지 바꾼 C는 193바이트 위치만 달랐습니다 {#b와-c의-차이를-193바이트-위치로-제한했습니다}

init 구조와 시각을 한꺼번에 고치면 둘 중 무엇이 재생을 바꿨는지 알 수 없습니다. 그래서 변수를 하나씩 바꿨습니다. A→B는 init을 공통 파일로 떼어 `EXT-X-MAP`으로 가리킨 효과이고, B→C는 tfdt 값만 바꾼 효과입니다.

영상의 위 줄이 A·B, 아래 줄이 C입니다. 같은 파일 10개가 위에서는 0 근처에 겹쳐 놓이고, 아래에서는 mtxi가 말하는 자리로 밀려납니다.

{{< motion scene="TfdtRebaseAbc" id="fig-tfdt-rebase-abc" kind="개념도" caption="A·B는 파일마다 tfdt가 0 근처라 10개 파일이 겹쳐 놓이고 버퍼가 8.10초에서 끝나 20초 탐색이 8.10초에 멈춥니다. C는 tfdt만 방송 안 위치로 옮겨 39.87초 전체가 버퍼에 들어오고 20초 탐색이 그 자리에 섭니다. 겹침 모양은 단순화했고 hls.js 안의 배치 규칙은 따라가지 않았습니다." >}}

| 변형 | 바꾼 것 | 버퍼 | 20초 탐색 |
|---|---|---|---|
| A | 녹화 파일을 그대로 나열(init 포함, MAP 없음) | [0, 8.10] | 8.10초에서 멈춤 |
| B | 공통 init을 떼어 MAP으로 가리킴, tfdt 그대로 | [0, 8.10] | 8.10초에서 멈춤 |
| C | B에서 tfdt만 방송 안 위치로 바꿈 | [0, 39.87] | 20초에 섬, 재생 진행 |

그림 2는 같은 결과를 브라우저 인식 길이로 다시 본 것입니다. A와 B의 막대가 같다는 점이 init 구조가 원인이 아니라는 근거입니다.

{{< chart id="fig-abc-duration" kind="실측" caption="변형별 브라우저 인식 길이(video.duration, 초). init을 떼어 낸 B는 A와 같은 8.10초였고, tfdt만 바꾼 C에서 39.87초가 됐습니다. 2026년 8월 30일, MediaMTX 1.20.1 녹화 10개, hls.js 1.5.15." source="팀 내부 실험 기록 기준 비공개 실측" height="220px" >}}
{
  "grid": {"left": 8, "right": 64, "top": 30, "bottom": 8, "containLabel": true},
  "xAxis": {"type": "value", "name": "초", "min": 0, "max": 50, "interval": 10},
  "yAxis": {"type": "category", "inverse": true, "data": ["A 그대로", "B init 분리", "C tfdt 변경"]},
  "series": [{
    "type": "bar",
    "barWidth": 22,
    "label": {"show": true, "position": "right", "formatter": "{c}초"},
    "data": [
      {"value": 8.10, "itemStyle": {"color": "#b42318"}, "label": {"formatter": "8.10초"}},
      {"value": 8.10, "itemStyle": {"color": "#b42318"}, "label": {"formatter": "8.10초"}},
      {"value": 39.87, "itemStyle": {"color": "#087f8b"}}
    ]
  }]
}
{{< /chart >}}

B와 C가 정말 tfdt만 다른지는 스크립트가 바이트 단위로 확인한 뒤에야 재생으로 넘어갔습니다. 두 묶음의 파일은 tfdt 상자 78개 안 8바이트 값 칸 가운데 실제로 값이 바뀐 193개 위치만 달랐고, 나머지 바이트는 모두 같았습니다. 실패한 목록은 단일 변수로 다시 짜기 전 앞선 실행에서 치명적이지 않은 버퍼 멈춤(`bufferStalledError`)과 건너뛰기(`bufferNudgeOnStall`)를 되풀이했습니다. 8월 28일의 `fragParsingError`는 FFmpeg로 영상 1·소리 1만 뽑아 조각마다 복사한 목록에서 난 것이라 증상이 다릅니다.

## 두 트랙에 같은 시작 간격을 더해 A/V 차이를 지켰습니다 {#각-트랙에-같은-시작-간격을-더했습니다}

C를 만든 실험 규칙은 다음과 같습니다. 실행 코드가 아니라 시간 관계를 적은 식입니다.

> 새 tfdt = 원래 tfdt + 그 트랙 단위로 바꾼 (이 파일의 mtxi 누적 DTS − 첫 파일의 mtxi 누적 DTS)

예를 들어 첫 파일보다 12초 뒤에 시작한 파일의 영상 첫 tfdt가 0.32초, 소리가 0초라면 새 위치는 영상 12.32초, 소리 12.00초입니다. 설명용 숫자이며 측정값이 아닙니다. 두 트랙에 같은 간격을 더하므로 파일 안 A/V 차이 0.32초가 그대로 남습니다.

처음 설계는 트랙마다 「앞 파일에서 그 트랙이 끝난 곳」에 이어 붙였습니다. 이렇게 하면 영상과 소리의 시작·끝 차이가 파일마다 쌓여 최대 0.32초 립싱크 오차가 생겼고, 리뷰에서 공통 간격을 mtxi에서 가져오는 방식으로 바꿨습니다. EXTINF(목록의 조각 길이)도 mtxi 간격으로 계산해 목록과 파일 안 시각을 맞췄습니다.

| 교차 확인 | 결과 |
|---|---:|
| EXTINF 합 | 39.873초 |
| 소리 트랙 길이 | 39.872초 |
| 차이 | 약 1ms(목록 반올림) |
| 브라우저 | 39.87초 전체 버퍼, 20초 탐색 성공 |

규격 설명만으로 특정 브라우저에서 재생된다고 보지 않고, 상자 바이트와 함께 길이·버퍼·탐색을 실제 플레이어에서 확인했습니다. 처리 속도는 이 대조에서 재지 않았습니다.

## 실험 규칙은 생산 코드에서 「mtxi + 세션 보정값」이 됐습니다 {#고정-입력의-대조에서-생산-계층으로}

실험 규칙은 첫 파일의 mtxi를 빼서 첫 조각을 0초에 놓았습니다. 생산 코드는 다르게 갑니다. 9월 19일 제가 낸 안대로, 되감기용 조각의 시각 도장은 「그 조각의 mtxi + 세션 보정값」입니다([`media/README.md` 「시간 도장」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1372-L1390)). 세션은 사이드카가 재생 목록 하나를 여닫는 단위입니다.

- **평소.** 보정값은 0이므로 첫 도장은 그 조각의 mtxi 값입니다. 새 연결의 첫 조각이면 0 근처이고, 연결 도중 열린 세션이면 0이 아닙니다. 다만 세션 첫 조각의 mtxi가 음수면(소리가 영상보다 먼저 시작한 경우) 보정값을 −mtxi로 열어 첫 도장을 0에 둡니다([`chain.go` `startChain`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/indexer/chain.go#L79-L97)).
- **송출이 다시 붙을 때.** 위에서 본 대로 mtxi가 0으로 돌아가므로, 녹화기 표식이 바뀌거나 mtxi가 뒤로 가면 보정값을 올려 앞 조각에서 먼저 끝난 트랙 끝에 잇습니다.
- **같은 녹화기 안 구멍.** mtxi가 예상 끝보다 50ms 넘게 앞서면 그 구멍을 압축해 잇습니다.

8월 30일 대조 뒤에 남았던 경계도 각자 따로 확인했습니다. 같은 세션 안 재접속은 9월 19일 10분 녹화로 확인했습니다([재접속 경계 글](/posts/0-to-1/pokeclip-reconnect-audio-gap/)). 다시 포장한 init이 세션 init과 다르면 그 조각을 올리지 않고 세션을 `init_mismatch`로 끝냅니다([`axis_body.go` 225–233행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/upload/axis_body.go#L225-L233)). 창이 밀리는 되감기 목록은 [라이브와 되감기 목록을 나눈 글](/posts/0-to-1/pokeclip-live-dvr-separation-handoff/)이 다룹니다. 조각을 다시 포장하는 수단이 FFmpeg에서 Go로 바뀐 이유는 [재포장 글](/posts/0-to-1/pokeclip-go-remux-same-io-benchmark/)에 있습니다.

비슷한 문제를 만난다면 init·태그·시각을 한꺼번에 고치지 말고, 바이트로 확인한 단일 변수 대조부터 만드십시오. 무엇이 재생을 바꿨는지 알아야 생산 코드가 책임질 범위를 좁힐 수 있습니다.

## 측정 조건

- 2026년 8월 30일, 격리한 Docker compose 프로젝트(호스트 포트 없음). MediaMTX 1.20.1 공식 이미지, 송출은 digest로 고정한 ffmpeg 이미지.
- 녹화: SRT로 40초 송출, 4초 단위 fMP4 10개. 재접속 확인은 18초 송출 → 끊고 바로 재접속 → 18초 송출.
- 재생: hls.js 1.5.15를 고정한 계측 페이지에서 A·B·C를 나란히 재생. 20초 탐색 뒤 재생 진행(20.00→20.16초)은 같은 소재의 앞선 실행에서 잰 값입니다.
- B·C 바이트 대조: 목록 생성 스크립트가 tfdt 밖 바이트가 같은지 확인하고 통과할 때만 진행했습니다.
- AI가 수행했고, 팀 내부 실험 기록 기준 비공개 실측입니다. 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일) 기준입니다.

## 출처

- [MediaMTX 문서: Playback](https://mediamtx.org/docs/features/playback) — 녹화 파일을 이어 주는 공식 경로
- [RFC 8216 HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216) — [3.3 fMP4 조각](https://www.rfc-editor.org/rfc/rfc8216#section-3.3) · [4.3.2.5 EXT-X-MAP](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.2.5)
- [PokeClip-mono `media/README.md` 「시간 도장」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1372-L1390) · [`chain.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/indexer/chain.go#L79-L97) · [`axis_body.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/upload/axis_body.go#L225-L233) — 생산 코드의 도장 규칙과 init 불일치 처리
- [HLS 오류는 0건인데 녹화 142초 중 62초가 사라졌습니다](/posts/0-to-1/pokeclip-zero-errors-missing-playback/) — 8월 19일 재생 시험과 8월 28일 결정
- [같은 세션 재접속에 HLS 끊김 표시를 달지 않은 이유](/posts/0-to-1/pokeclip-reconnect-audio-gap/) — 재접속 경계 확인
- [FFmpeg 재포장은 조각마다 init이 달라 Go로 바꿨습니다](/posts/0-to-1/pokeclip-go-remux-same-io-benchmark/) — 재포장 수단
- 팀 내부 실험 기록(비공개) — 8월 30일 tfdt 재현과 리뷰 기록

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 12쪽](/portfolio/2026-10-15-v2/full.pdf#page=12)
