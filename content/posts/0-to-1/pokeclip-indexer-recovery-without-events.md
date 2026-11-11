---
title: "완료 알림이 사라져도 녹화 파일은 디스크 재스캔으로 찾습니다"
date: "2026-10-15T11:28:22+09:00"
lastmod: "2026-11-12T02:10:00+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "MediaMTX 완료 훅을 1차 신호로 쓰되, 훅이 실패하면 파일 감시와 300초 주기 디스크 재스캔이 같은 파일을 다시 찾아 장부 고유 제약으로 한 줄만 남기게 한 인덱서 구조. 10월 6일 네 조건 276파일의 누락·중복 0, 감시만 남겼을 때 각 실행의 마지막 파일이 기다린 13.5초, 파일을 되찾아도 되살아나지 않는 재접속 경계, 그리고 재지 않은 재스캔 비용까지."
tags: ["PokeClip", "Go", "PostgreSQL", "장애 복구"]
portfolio_cases: [15]
portfolio_pages: [7, 8]
portfolio_edition: "2026-10-15-v2"
---

PokeClip의 편집기는 DB 장부에서 방송 시각에 해당하는 녹화 파일을 찾습니다. 녹화 완료 알림(MediaMTX 훅)을 놓쳐 장부에 들어가지 못한 파일은 디스크에 있어도 편집기에는 없는 파일입니다. 그래서 훅은 빠른 신호로만 쓰고, 훅이 사라지면 파일 감시와 300초 주기의 디스크 재스캔이 같은 파일을 다시 찾아 장부에 넣게 했습니다. 세 경로가 같은 파일을 찾아도 장부에는 한 줄만 남습니다. 2026년 10월 6일 네 조건에서 276개 파일이 누락 0, 중복 0으로 등록됐습니다. 다만 훅을 끊고 감시만 남기자 p95는 0.073초였는데 각 실행의 마지막 파일은 최대 13.526초를 기다렸습니다.

10월 6일 시험의 네 조건은 제가 골랐고, 시험은 제 승인을 받아 AI(Codex)가 했습니다. 인덱서 구현과 리뷰는 AI(Claude Code와 Codex)가 했습니다.

## 완료 훅은 빨랐지만 실패한 알림을 다시 보내지 않았습니다 {#정상-훅은-빨랐지만-실패를-다시-보내-주지는-않았습니다}

2026년 8월 3일 AI가 돌린 훅 스파이크에서 완료 훅이 가리킨 파일 크기는 최종 크기와 29번 모두 같았고, 파일 마지막 수정 시각부터 훅까지는 p50 2.6ms, p95 4.9ms였습니다. 그런데 훅 실행 파일이 없거나, 훅이 비정상 종료하거나, 훅이 쓰기에 실패하면 MediaMTX는 다시 보내지 않았습니다. 파일이 완성되기 전에 서버를 강제로 죽이면 훅 자체가 남지 않았습니다. 알림이 아무 흔적 없이 사라지는 경우가 실측으로 나온 것입니다.

그래서 같은 날 팀은 훅을 1차 신호로 쓰고 파일 감시와 재스캔을 안전망으로 남기되, 안전망은 지우지 않기로 합의했습니다. 훅을 더 자주 받거나 메모리에서 중복을 걸러도, 프로세스를 다시 시작하면 그 기록은 사라집니다. 다시 찾을 근거는 디스크의 파일과 DB 장부에 둬야 했습니다([인덱서 코드](https://github.com/3K-PokeClip/PokeClip-mono/tree/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/indexer)).

## 세 경로가 같은 파일을 찾아도 장부에는 한 줄만 남습니다

녹화 파일 하나를 찾는 길은 셋입니다.

| 경로 | 언제 찾나 | 기본값 |
|---|---|---|
| 완료 훅 | MediaMTX가 파일을 닫는 즉시 | 훅 스풀을 200ms마다 읽음 |
| 파일 감시 | 다음 파일이 생기면 앞 파일을 완성으로 판정. 마지막 파일은 쓰기가 멈춘 뒤 | 유휴 10초([`indexer.go` 172행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/indexer/indexer.go#L172)) |
| 주기 재스캔 | 디스크와 장부를 대조 | 300초([`watcher.go` 46행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/recording/watcher.go#L46)) |

영상은 같은 파일을 세 경로가 서로 다른 시점에 찾는 장면입니다. 훅이 끊긴 뒤에도 감시나 재스캔이 도착하고, 장부 칸에는 줄이 하나만 생기는 것을 보십시오.

{{< motion scene="HookLossRescan" id="fig-hook-loss-rescan" kind="개념도" caption="완료 훅은 파일을 바로 알리고, 파일 감시는 마지막 파일이면 쓰기가 멈춘 뒤 유휴 10초를 기다리며, 재스캔은 300초마다 디스크를 훑습니다. 훅이 끊겨도 감시나 재스캔이 같은 파일을 찾고, 장부의 고유 제약이 중복을 막아 한 줄만 남습니다. 경로를 보여 주는 설명용 그림이며 시간 비율은 실제와 다릅니다." >}}

중복은 장부의 고유 제약이 막고, 조각 순번과 방송 시각은 인덱서 한 곳에서만 정합니다. 조각 길이는 파일 이름이나 벽시계 차이로 추측하지 않고 fMP4 안의 시간 정보에서 읽습니다. 크기가 잠깐 멈춘 순간은 파트 쓰기 사이의 틈일 수 있어, 다음 파일 등장·유휴 종료·과거 파일 스캔·꼬리가 다시 자라는 경우를 나눠 완성을 판정합니다. 인덱서가 도는 사이드카는 녹화 볼륨을 읽기 전용으로 붙여([`compose.yml.tmpl` 258행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/compose.yml.tmpl#L258)), 다시 찾는 과정에서 원본을 고치지 않습니다.

## 정상 한 조건과 알림을 끊은 세 조건에서 276개 파일이 모두 등록됐습니다 {#실제-등록-경로를-끊어-본-네-가지-조건}

10월 6일 시험은 스캔 함수만 따로 부르지 않고, 제품의 타이머부터 수집 시작·수집 적용·PostgreSQL 커밋까지 실제 등록 경로를 그대로 돌렸습니다. 완성된 시험 파일을 50ms 간격으로 넣었고, 수정 시각은 60초 전으로 맞췄습니다. 조건은 훅과 감시를 모두 둔 정상 한 가지와, 훅을 끊은 조건, 훅과 감시를 모두 끊고 재스캔만 남긴 조건 둘(5초 가속, 기본 300초)입니다.

| 조건 | 반복 | 파일 수 | 누락 | 중복 커밋 |
|---|---:|---:|---:|---:|
| 훅 + 감시 | 3회 | 90 | 0 | 0 |
| 훅 끊음, 감시만 | 3회 | 90 | 0 | 0 |
| 둘 다 끊음, 재스캔 5초 | 3회 | 90 | 0 | 0 |
| 둘 다 끊음, 재스캔 기본 300초 | 1회 | 6 | 0 | 0 |

합계 276개 파일이 모두 장부에 들어갔고 중복 커밋은 0이었습니다. 5초 조건은 재스캔이 한 번 더 돈 뒤에도 중복 커밋이 0인지 확인했습니다. 5초는 시험을 빨리 끝내려고 줄인 값이고, 제품 기본값은 300초입니다.

## 감시만 남기면 각 실행의 마지막 파일이 13.5초 기다렸습니다

[[fig-indexer-recovery-latency]]는 같은 시험의 등록 지연입니다. 로그 눈금이라 막대 길이가 아니라 자릿수를 보십시오. 「훅 끊음, 감시만」의 p95와 최대가 두 자릿수 넘게 벌어집니다.

{{< chart id="fig-indexer-recovery-latency" kind="실측" caption="10월 6일 네 조건의 등록 지연 p95와 최대(초, 로그 눈금). 훅을 끊고 감시만 남기면 p95는 0.073초였지만 각 실행의 마지막 파일이 유휴 판정을 기다려 최대 13.526초였습니다. 훅과 감시를 모두 끊으면 재스캔 주기가 지연을 정했습니다. Apple M5, Go 1.26.5, PostgreSQL 17, 앞의 세 조건 3회·마지막 조건 1회." source="팀 내부 실측(비공개 원시 묶음), 포트폴리오 요약 2026-10-15판 8쪽" height="340px" >}}
{"grid":{"left":8,"right":40,"top":40,"bottom":8,"containLabel":true},"legend":{"top":0,"data":["p95","최대"]},"xAxis":{"type":"log","name":"초","min":0.01,"max":10000,"logBase":10,"axisLabel":{"showMaxLabel":false}},"yAxis":{"type":"category","inverse":true,"data":["훅 + 감시","감시만","재스캔 5초","재스캔 300초"]},"series":[{"name":"p95","type":"bar","barWidth":14,"itemStyle":{"color":"#7a8a9b"},"label":{"show":true,"position":"right","formatter":"{c}"},"data":[0.067,0.073,4.973,300.014]},{"name":"최대","type":"bar","barWidth":14,"itemStyle":{"color":"#087f8b"},"label":{"show":true,"position":"right","formatter":"{c}"},"data":[0.123,{"value":13.526,"itemStyle":{"color":"#b42318"}},5.019,300.024]}]}
{{< /chart >}}

감시 경로는 다음 파일이 생기면 앞 파일을 바로 완성으로 판정합니다. 그래서 대부분의 파일은 훅이 있을 때와 거의 같은 0.07초 안에 들어갔습니다. 실행마다 마지막 파일에는 다음 파일이 없어서, 쓰기가 멈춘 뒤 유휴 판정을 기다려야 했습니다. 실행당 한 파일뿐이라 p95에는 드러나지 않았고, 최대값에서만 13.526초로 보였습니다. 훅과 감시를 모두 끊으면 재스캔 주기가 지연을 정했습니다. 5초 재스캔의 최대는 5.019초, 기본 300초 재스캔의 최대는 300.024초였습니다.

방송이 끝날 때 마지막 조각이 이렇게 늦어지면, 방송 직후 그 구간으로 클립을 만들려는 사용자가 기다립니다. 모든 파일을 찾았다는 결과와 얼마나 늦게 찾았는지는 다른 질문이었습니다.

## 파일을 다시 찾아도 재접속 경계는 되살아나지 않습니다 {#파일을-찾는-것과-재접속-경계를-찾는-것은-다릅니다}

재스캔이 되찾는 것은 파일입니다. 1.5초보다 짧게 끊겼다 다시 붙은 사건은 파일 안에 없고 MediaMTX 연결 훅에만 있습니다. 8월 4일 연결·끊김·녹화 완료 훅 3종을 켠 [PR #33](https://github.com/3K-PokeClip/PokeClip-mono/pull/33) 시험에서 0.9초 재접속을 넣었을 때, 장부의 시각 차이는 훅을 켠 쪽 574ms, 끈 쪽 583ms로 둘 다 벽시계 검산 허용 오차 1,500ms([`indexer.go` 160행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/indexer/indexer.go#L160)) 아래라 벽시계 검산으로는 잡히지 않았고, 훅을 켠 쪽만 다음 조각(5번)을 불연속으로 적었습니다. 서버가 본 끊김은 0.886초였습니다. 같은 날 정상 120초 송출은 30파일 = 30행, 훅을 끈 되돌림 시험도 10파일 = 10행이었습니다. 연결 훅을 놓치면 파일은 다시 찾아도 그 경계 표시는 되찾지 못합니다.

지금 장부는 이 불연속을 기록하지만, 되감기 목록은 같은 세션 안의 재접속에 HLS 끊김 표시(`EXT-X-DISCONTINUITY`)를 달지 않습니다. 그 판단은 [재접속 경계 글](/posts/0-to-1/pokeclip-reconnect-audio-gap/)에 있습니다. 포트폴리오 요약(2026-10-15판) 8쪽의 「다음 조각 seq 5에 불연속 표식」은 8월 4일 장부의 결과이고, 지금 시청자가 받는 목록의 표시와는 다릅니다.

## 재스캔 주기를 줄이면 디렉터리 탐색 비용이 늘어납니다 {#복구-주기를-줄이기-전에-남은-비용}

훅과 감시가 모두 사라지면 최악의 지연은 300초입니다. 줄이려면 재스캔을 더 자주 해야 하고, 그만큼 녹화 디렉터리를 자주 훑습니다. 디렉터리 크기별 탐색 비용은 재지 않았습니다. 마지막 파일의 13.5초는 유휴 판정에서 나오는 다른 지연이라, 재스캔 주기를 줄여도 감시 경로의 이 지연은 그대로입니다. 두 지연을 「인덱서가 느리다」 하나로 묶지 않았습니다.

10월 6일 시험은 SLO 근거가 아닙니다. 알림 채널을 아예 주지 않는 방식의 결함 주입이었고, 실제 OS 알림 장애·실제 방송·S3 업로드는 들어 있지 않습니다. 빈 장부에서 시간 순서대로 넣었기 때문에, 장부 커서보다 앞에 생긴 구멍을 메우는 복구도 재지 않았습니다. 재스캔은 디스크에 남은 파일만 되찾습니다. MediaMTX는 녹화를 24시간 뒤 스스로 지우고, 10월 22일 들어온 같은 상자의 청소기를 켜면 업로드가 확정된 원본 조각이 기본 8분 유예 뒤 로컬에서 지워집니다([PR #302](https://github.com/3K-PokeClip/PokeClip-mono/pull/302), [`janitor/config.go` 28·97행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/cmd/janitor/config.go#L28), [README 3331행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L3331)).

외부 이벤트로 장부를 채운다면 이벤트는 빠른 길로만 쓰고, 이벤트 없이도 같은 결과에 닿는 재대조 경로를 두십시오. 그리고 그 경로의 지연은 p95가 아니라 마지막 항목의 최대값으로 재야 합니다.

## 측정 조건

- 8월 3일 훅 스파이크: MediaMTX 1.19.3, 시험 전용 컨테이너 망과 볼륨, 완성 크기 일치 29건. AI가 수행했고 원자료는 비공개입니다.
- 8월 4일 PR #33 시험: 로컬 Docker compose, 0.9초 재접속 1회와 훅을 끈 대조군, 정상 120초 송출, 되돌림 시험. AI가 수행했고 원자료는 비공개입니다.
- 10월 6일 복구 시험: Apple M5, Go 1.26.5, 시험 전용 PostgreSQL 17 컨테이너. 완성된 시험 파일을 50ms 간격으로 넣고 수정 시각 60초 전. 앞의 세 조건 3회씩, 기본 300초 조건 1회. AI(Codex)가 수행했고 원자료는 비공개입니다.
- 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일) 기준입니다.

포트폴리오 요약(2026-10-15판) 7쪽은 완료 신호의 신뢰 범위와 복구 구조 선택을 제 역할로 적었습니다. 훅을 1차 신호로 쓰고 안전망을 남기는 구조는 8월 3일 팀 합의였고, 제가 고른 것은 10월 6일 시험의 네 조건입니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #33](https://github.com/3K-PokeClip/PokeClip-mono/pull/33) — MediaMTX 훅 3종 켜기와 훅 스풀 볼륨(2026-08-04 머지)
- [PokeClip-mono `media/internal/indexer/indexer.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/indexer/indexer.go#L155-L175) — 유휴 10초, 허용 오차 1,500ms
- [PokeClip-mono `media/internal/recording/watcher.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/recording/watcher.go#L42-L46) — 재스캔 300초
- [PokeClip-mono `infra/media-host/compose.yml.tmpl`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/compose.yml.tmpl#L258) — 사이드카의 읽기 전용 녹화 볼륨
- [PR #302](https://github.com/3K-PokeClip/PokeClip-mono/pull/302) · [`media/cmd/janitor/config.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/cmd/janitor/config.go#L28) · [`media/README.md` 청소기 환경 변수](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L3325-L3335) — 업로드 확정된 조각의 로컬 정리(기본 유예 8분)
- [같은 세션 재접속에 HLS 끊김 표시를 달지 않은 이유](/posts/0-to-1/pokeclip-reconnect-audio-gap/)
- 팀 내부 실험 기록(비공개) — 8월 3일 훅 스파이크, 8월 4일 훅 켜기 검증, 10월 6일 복구 시험

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 7–8쪽](/portfolio/2026-10-15-v2/full.pdf#page=7)
