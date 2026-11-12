---
title: "Go로 다 짜려던 미디어 서버를 MediaMTX에 맡겼습니다"
date: 2026-10-15T11:27:08+09:00
lastmod: "2026-11-12T13:39:17+09:00"
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "MediaMTX", "Architecture", "LL-HLS", "오픈소스"]
description: "SRT 수신부터 LL-HLS 서빙까지 Go로 직접 짜려던 7월 20일 원안을, 7월 24일 「LL-HLS 되감기 불가」 판정이 다음 날 창 크기 문제로 뒤집힌 뒤 MediaMTX + Go 계층으로 바꾼 과정. Go 계층은 장부 · 업로드 · 재포장 · 목록 발행 · 세션과 회차로 좁혔고, 우회가 비싸지면 상류를 고치고 머지 전까지 포크 이미지로 받습니다."
draft: false
portfolio_cases: [2]
portfolio_pages: [6]
portfolio_edition: "2026-10-15-v2"
---

2026년 7월 20일 PokeClip의 원안은 SRT 수신부터 LL-HLS 서빙까지 미디어 서버를 Go로 전부 직접 짜는 것이었습니다. MediaMTX는 참고할 구현이었을 뿐입니다. 7월 24일 스파이크에서는 MediaMTX의 LL-HLS로는 지난 장면으로 되감을 수 없다고 판정했습니다. 다음 날 그 시험이 약 10초짜리 재생 목록 창 밖으로 탐색한 것이었다는 사실을 알았고, 창을 300초로 늘리자 라이브 끝에서 178초 뒤에 머물며 재생됐습니다. 7월 27일 수신·LL-HLS·녹화는 MediaMTX에 맡기고, Go로 짤 범위를 녹화 뒤의 일로 옮겼습니다. 그 범위는 지금 장부 · 업로드 · 재포장 · 목록 발행 · 세션과 회차이고, 이 구조로 11월 3일 첫 출시본 v1.0.0을 냈습니다.

원안, 7월 27일 범위 조정, 8월 25 · 28일 상류 수정 방침은 제가 정했습니다. 7월 24일 스파이크는 멘토가 요청한 시연 조건을 AI로 확인한 것이고 되감기 튕김은 제가 재생 막대를 당겨 확인했으며, 7월 25일 EC2 재시험에서는 제가 OBS로 송출하며 플레이어 동작을 지켜봤습니다. Go 계층의 구현은 AI(Claude Code와 Codex)가 했습니다.

## 원안은 SRT 수신부터 LL-HLS 서빙까지 Go로 직접 짜는 것이었습니다

7월 20일 원안은 SRT 수신, MPEG-TS 풀기, CMAF 조각 만들기, LL-HLS 서빙과 되감기, S3 적재, 다시보기 확정, 방송 이벤트 발행을 모두 Go로 짜는 것이었습니다. 이유는 셋이었습니다. 이 계층이 프로젝트의 핵심이라, 관리형 서비스나 오픈소스로 대신하면 「만든 사람」이 아니라 「설정한 사람」이 된다고 봤습니다. 취업 포트폴리오로서도 그 차이가 컸습니다. 방송마다 받기 · 풀기 · 자르기 · 올리기를 나란히 돌리는 일은 고루틴 모델에 맞았습니다. 그리고 Go는 AI가 쓴 코드의 품질과 Java 개발자의 리뷰 가능성이 함께 높은 언어였습니다.

| 7월 20일 검토한 안 | 판단 |
|---|---|
| Go로 전부 직접 구현, MediaMTX는 참고 | 채택(원안) |
| C/C++로 바닥부터 | 탈락. 메모리 · 스레드 디버깅이 가장 어렵고, Java 개발자가 리뷰할 수 없어 품질 검사를 잃음 |
| FFmpeg · GStreamer 프로세스 조합 | 백업으로 보존. LL-HLS 파트와 되감기 목록을 제어하기 어려움 |
| OvenMediaEngine 포크 | 탈락. 큰 C++ 코드베이스를 먼저 이해해야 하고, 멀티오디오 지원이 불확실함 |
| 관리형 미디어 서비스(MediaLive 등) | 탈락. 핵심 계층을 통째로 외주화하고 시간당 과금 |

포트폴리오 요약(2026-10-15판) 6쪽의 「C/C++ 전체 구현의 검토 부담을 줄이는 대신」은 틀린 표현입니다. 원안은 Go로 전부 직접 구현하는 것이었고, C/C++은 7월 20일에 이미 탈락한 대안이었습니다.

## 7월 24일 되감기 불가 판정이 다음 날 창 크기 문제로 뒤집혔습니다 {#프로토콜-지원-목록-대신-우리-입력을-통과시켰습니다}

7월 24일 멘토가 「EC2에 미디어 서버를 띄워 CMAF로 S3에 저장하는 데까지」를 보여 달라고 했습니다. OBS에서 SRT로 보낸 송출을 EC2의 MediaMTX 1.19.3이 받아 fMP4로 녹화하고, 조각이 닫힐 때마다 훅으로 S3에 올리는 데까지 반나절이 걸렸습니다. 같은 날 LL-HLS 되감기도 시험했는데, 재생 막대를 뒤로 당기면 늘 라이브 끝으로 튕겼습니다. MediaMTX 설정에 LL-HLS 되감기를 켜는 옵션이 없었고, 같은 증상의 [이슈 #999](https://github.com/bluenviron/mediamtx/issues/999)도 있었습니다. 그래서 「LL-HLS 되감기는 MediaMTX로 안 되니 우리가 직접 짤 핵심」이라고 판정했습니다. 원안과 맞는 결론이라 의심하지 않았습니다.

7월 25일 저는 그 판정을 다시 봤습니다. 시험 때 재생 목록 창은 약 10초였고, 우리는 그보다 더 뒤로 탐색했습니다. 목록에 없는 자리로 가라고 했으니 플레이어가 라이브로 돌아간 것이었습니다. 창을 2초 조각 150개(300초)로 늘리고, 라이브 끝을 따라잡는 기능을 끈 hls.js로 로컬에서 다시 시험하니 재생 위치가 라이브 끝에서 178초 뒤에 머물렀습니다. 같은 날 EC2에 다시 세워 OBS에서 SRT로 보냈을 때도, MediaMTX에 들어 있는 데모 플레이어는 튕겼지만 따라잡기를 끈 맞춤 플레이어는 라이브 끝에서 125초 뒤를 유지했습니다.

영상에서 두 줄의 차이는 창의 폭입니다. 위 줄은 창 밖으로 탐색해 튕기고, 아래 줄은 창 안의 -178초에 머뭅니다.

{{< motion scene="DvrWindowSeek" id="fig-dvr-window-seek" kind="개념도" caption="7월 24일 시험은 약 10초 창 밖으로 탐색해 재생 위치가 라이브 끝으로 튕겼고, 7월 25일 창을 300초로 늘리고 따라잡기를 끈 플레이어로 탐색하자 라이브 끝에서 178초 뒤에 머물렀습니다. -178초는 7월 25일 로컬 시험값이고, 탐색 거리와 창의 폭은 설명을 위해 단순화했습니다." >}}

판정을 뒤집은 것은 새 기능이 아니라 시험 조건이었습니다. 「지원하는가」를 기능 목록으로 묻지 않고, 우리 입력이 우리 조건에서 통과하는지로 물어야 했습니다.

## 직접 짤 범위를 녹화 뒤의 일로 좁혔습니다 {#녹화-뒤에-남는-일을-기준으로-자체-계층을-정했습니다}

7월 27일 원안을 고쳤습니다. 수신, LL-HLS 묶기, 녹화는 MediaMTX에 맡기고, Go로 짤 계층을 녹화 뒤의 일로 옮겼습니다. 되감기 자체가 설정으로 되니, 직접 짤 가치는 되감기가 된다는 데가 아니라 녹화 파일을 우리 규칙으로 관리하는 데 있었습니다. 그 범위는 8월 이후 다시 좁혀져 지금은 그림과 같습니다.

```mermaid {#fig-mtx-go-split kind="개념도" caption="MediaMTX와 Go 계층의 책임 나눔. MediaMTX는 SRT 수신 · LL-HLS 묶기 · 녹화를, Go 사이드카(청록)는 장부 · S3 업로드 · 되감기용 재포장 · 정적 목록 발행 · 세션과 회차를 맡습니다. 둘은 녹화 파일 · 녹화 훅 · 상태 조회 API로 만나고, 장부는 Go 계층만 씁니다. develop 825a3dfe의 media/README.md 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md"}
flowchart TB
  accTitle: MediaMTX와 Go 계층의 책임 나눔
  accDescr: OBS의 SRT 송출을 MediaMTX가 받아 라이브 LL-HLS 목록을 내고 조각을 녹화한다. MediaMTX는 녹화 파일과 녹화 훅을 Go 사이드카에 넘긴다. 사이드카는 DB 장부를 적고, S3에 원본과 재포장본을 올리고, 되감기 정적 목록을 발행하고, 세션과 회차를 여닫는다.
  obs[OBS · SRT 송출]
  mtx[MediaMTX<br/>SRT 수신 · 녹화<br/>LL-HLS 라이브 목록]
  led[Go · DB 장부]
  up[Go · S3 업로드<br/>원본 · 재포장본]
  ses[Go · 세션과 회차]
  pub[Go · 되감기 목록 발행]
  obs --> mtx
  mtx -->|녹화 파일 · 훅| led
  led --> up
  led --> ses
  up --> pub
  style led fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style up fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style pub fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style ses fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

두 계층은 녹화 파일, 녹화 훅, MediaMTX 상태 조회 API로 만나고, DB 장부는 Go 계층만 씁니다. 저장 · 편집 규칙을 바꿀 때 전송 프로토콜 쪽을 고치지 않아도 되는 경계입니다. 처음 범위에 있던 「최근 조각은 MediaMTX 목록을 그대로 흘려보내는」 구조는 8월 30일 버렸고, 되감기 목록은 업로드가 확인된 재포장본만 담게 됐습니다([라이브 · 되감기 분리 글](/posts/0-to-1/pokeclip-live-dvr-separation-handoff/)).

이 구조의 상태는 이렇습니다. 되감기 생산자와 목록 문법이 9월 24·25일 develop에 들어갔고([PR #192](https://github.com/3K-PokeClip/PokeClip-mono/pull/192) · [PR #196](https://github.com/3K-PokeClip/PokeClip-mono/pull/196)), 목록 S3 발행이 10월 19일([PR #289](https://github.com/3K-PokeClip/PokeClip-mono/pull/289)) 들어갔습니다. 11월 3일 v1.0.0에 MediaMTX 이미지와 사이드카 이미지가 함께 실렸고, 11월 10일 회차 다시보기 고침을 운영 미디어 서버에 반영했습니다([회차 다시보기 글](/posts/projects/pokeclip-round-vod/)).

## 우회가 비싸지면 상류를 고치고 머지 전까지 포크 이미지로 받았습니다 {#직접-만들지-않은-코드는-검토하지-않아도-되는-코드가-아니었습니다}

MediaMTX를 들이자 직접 짜지 않은 코드를 읽어야 하는 책임이 생겼습니다. 녹화 파일의 시간 정보, 훅이 언제 불리고 실패하면 어떻게 되는지, 버전이 바뀌면 깨질 전제를 알아야 했습니다. 처음 방침은 MediaMTX를 고치지 않고 훅과 설정 같은 공식 접점으로만 늘리는 것이었습니다. 포크는 영구 유지비가 들고, 미디어 타임라인을 다시 검증해야 하기 때문입니다.

8월 25일 이 방침을 바꿨습니다. 우회가 더 비싸거나 불가능하면 상류를 직접 고치고, 기본은 상류 PR이며 포크는 그 PR이 머지되기 전까지의 수단으로 둡니다. 한 프로토콜이라도 깊게 파 보라는 멘토 조언과, 우리 계층에서 우회할 수 없는 제약이 실제로 생긴 것이 계기였습니다. 8월 28일에는 대상에서 LL-HLS 라이브러리 gohlslib을 빼고 MediaMTX 저장소로 좁혔습니다. gohlslib을 고치지 않고 라이브 창 요구를 다시 정한 과정은 [라이브 창 글](/posts/0-to-1/pokeclip-live-window-without-fork/)에 있습니다.

지금 제품 이미지는 상류 v1.21.1 위에 우리 수정을 얹은 포크 빌드 `v1.21.1-pokeclip.2`입니다([`media/Dockerfile.mtxhook` 85행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/Dockerfile.mtxhook#L85)). 11월 6일 멈춘 dev 미디어 서버의 핀은 `v1.21.2-pokeclip.1`이었습니다. 포크에는 상류에 올린 수정과, 상류에 머지됐지만 우리 베이스보다 뒤 판에 들어간 수정이 함께 실려 있습니다. 올린 수정 가운데 [#6206](https://github.com/bluenviron/mediamtx/pull/6206)·[#6261](https://github.com/bluenviron/mediamtx/pull/6261)은 머지되지 않고 닫혔고, 같은 문제를 메인테이너가 다시 구현한 수정이 v1.21.3에 들어갔습니다. 앞의 예가 사용자별 SRT 암호를 받게 하는 [bluenviron/mediamtx#6306](https://github.com/bluenviron/mediamtx/pull/6306)으로, 제가 올렸고 11월 11일 기준 열려 있습니다. 뒤의 예가 v1.21.2에 들어간 [#6292](https://github.com/bluenviron/mediamtx/pull/6292)입니다. 실린 수정이 모두 상류 릴리스에 들어가면 포크를 걷어내고 공식 이미지로 돌아간다는 조건을 Dockerfile에 적어 두었습니다([75–84행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/Dockerfile.mtxhook#L75-L84)).

## 버전을 올릴 때마다 같은 입력을 다시 통과시켜야 합니다

MediaMTX를 고른 근거는 7월의 한 번 시험이 아니라, 우리 입력이 우리 조건에서 통과한다는 사실입니다. 그 사실은 버전이 바뀌면 다시 확인해야 합니다. 미디어 문서는 「고정한 버전이라서 참인 사실」에 기대는 코드 자리 9곳을 적고, 각 자리를 어떻게 다시 확인하는지 정해 두었습니다([`media/README.md` 「버전에 묶인 전제 9곳」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L2820-L2824)). 훅 이름, 녹화 조각의 길이 정보, 훅 명령의 인자 처리 같은 것입니다. 이 전제는 깨져도 오류가 나지 않습니다. 훅이 조용히 안 돌거나 조각 길이가 조용히 틀릴 뿐입니다.

그래서 고정한 버전이 바뀌면 버전 대조 시험이 실패하고, 9곳을 다시 확인해야 통과시킬 수 있게 했습니다. 1.19.3에서 1.20.1로(8월 28일), 1.20.1에서 1.21.1로(10월 5일) 올릴 때 그때까지 적어 둔 전제를 모두 다시 확인했습니다. 개발 시간이 몇 퍼센트 줄었는지는 재지 않았습니다. 확인할 수 있는 변화는 직접 책임질 범위가 수신·전송 전체에서 녹화 뒤의 규칙으로 줄었다는 것과, 그 대신 버전마다 전제를 다시 확인하는 일이 생겼다는 것입니다.

오픈소스를 들일지 판단한다면 기능 목록이 아니라 우리 입력으로 시험하고, 실패하면 시험 조건부터 의심하십시오. 들인 뒤에는 그 시험을 버전마다 다시 돌릴 수 있게 남겨 두십시오.

## 측정 조건

- 7월 24일 EC2 스파이크: MediaMTX 1.19.3, OBS 표준 SRT · MPEG-TS 송출, fMP4 녹화, 녹화 완료 훅으로 S3 업로드. 되감기 시험은 `hlsVariant: lowLatency`, 창 약 10초(2초 조각)였습니다. EC2는 그날 내렸고 원자료는 비공개입니다.
- 7월 25일 로컬 재시험: macOS arm64에서 MediaMTX 1.19.3, ffmpeg 시험 신호를 RTMP로 송출(로컬 ffmpeg에 SRT가 없어 대체, 되감기 탐색에는 송출 프로토콜이 무관), `hlsSegmentDuration: 2s` · `hlsSegmentCount: 150`, 라이브 끝 따라잡기를 끈 hls.js로 120 · 150초 뒤를 탐색해 -178초 위치를 관측했습니다. 1회 동작 확인입니다.
- 7월 25일 EC2 재시험: OBS → SRT → MediaMTX, 내장 데모 플레이어와 따라잡기를 끈 맞춤 플레이어를 비교해 맞춤 플레이어가 -125초를 유지했습니다. 시험 자원은 그날 지웠고 원자료는 비공개입니다.
- 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일)이고, PR 상태는 2026년 11월 11일에 확인했습니다.

## 출처

- [bluenviron/mediamtx#999 「LLHLS - seek issue」](https://github.com/bluenviron/mediamtx/issues/999) — 7월 24일 판정에 쓴 이슈
- [bluenviron/mediamtx#6306](https://github.com/bluenviron/mediamtx/pull/6306) — 사용자별 SRT 암호(작성자 본인, 심사 중)
- [bluenviron/mediamtx#6292](https://github.com/bluenviron/mediamtx/pull/6292) — 상류에 머지돼 포크가 체리픽한 수정
- [3K-PokeClip/PokeClip-mono `media/Dockerfile.mtxhook`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/Dockerfile.mtxhook#L75-L85) — 포크 이미지 고정과 걷어낼 조건
- [3K-PokeClip/PokeClip-mono `media/README.md` 「버전에 묶인 전제 9곳」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L2820-L2824) — 버전마다 다시 확인할 자리
- [3K-PokeClip/PokeClip-mono PR #192](https://github.com/3K-PokeClip/PokeClip-mono/pull/192) · [PR #196](https://github.com/3K-PokeClip/PokeClip-mono/pull/196) · [PR #289](https://github.com/3K-PokeClip/PokeClip-mono/pull/289) — 되감기 생산 · 목록 문법 · S3 발행
- [3K-PokeClip/PokeClip-mono PR #466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466) — v1.0.0 출시 이미지(2026-11-03)
- [MediaMTX 문서 「Publish」](https://mediamtx.org/docs/features/publish) — SRT 송출 수신
- [LL-HLS 라이브 창은 지연이 아니라 복귀 여유를 정했습니다](/posts/0-to-1/pokeclip-live-window-without-fork/) — gohlslib을 고치지 않은 결정
- 팀 내부 결정 · 스파이크 기록(비공개) — 7월 20 · 24 · 25 · 27일, 8월 25 · 28일

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 6쪽](/portfolio/2026-10-15-v2/full.pdf#page=6)
