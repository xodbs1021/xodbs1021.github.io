---
title: "되감기 재포장 조각의 생성과 업로드 완료를 따로 확정했습니다"
date: "2026-10-15T11:28:22+09:00"
lastmod: "2026-11-11T15:40:00+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "녹화 조각 하나에서 원본(②)·되감기용 재포장 조각(③)·세션 init 세 가지를 S3에 올리면서, 재포장 부품은 바이트만 만들고 업로드 결과는 축마다 장부 CAS로 따로 확정한 구조. 세션 init과 다른 조각을 올리지 않고 세션을 끝내는 규칙, 9월 24일 RTMP→MinIO 시험의 24조각 첫 시도 업로드와 그때 실제로 나타난 재기동 한계, 16MiB 입력 상한 경계 시험까지."
tags: ["PokeClip", "Go", "미디어", "테스트", "HLS", "S3", "되감기"]
portfolio_cases: [21]
portfolio_pages: [14, 16]
portfolio_edition: "2026-10-15-v2"
---

PokeClip 사이드카는 녹화 조각 하나마다 S3에 세 가지를 올립니다. 클립 편집에 쓸 원본(②, 영상 1·소리 6), 되감기 재생용으로 다시 포장한 조각(③, 영상 1·소리 1), 그리고 세션마다 하나인 init(재생에 필요한 트랙 설정)입니다. 재포장 부품이 바이트를 만들었다고 셋이 다 올라간 것은 아니므로, 업로드 결과는 축마다 따로 장부에 CAS(비교 후 교체)로 확정하고, ③은 세션 init이 확정된 뒤에만 올라가게 했습니다. 9월 24일 로컬 Docker 환경(RTMP 송출 → MediaMTX → 사이드카 → HTTPS MinIO)에서 ③ 24개와 init 1개가 모두 첫 시도에 올라갔습니다. 같은 시험에서 사이드카를 재기동한 뒤 두 번째 송출의 도장이 3,048.9초 앞으로 뛴, 이미 적어 둔 한계도 실제로 나타났습니다.

제가 정한 것은 9월 19일 Go 재포장과 시각 도장 규칙, 9월 23일 입력 상한 16MiB 확인입니다. 재포장 부품(Producer)의 경계와 축마다 확정하는 규칙은 AI가 계획했고, 구현([PR #192](https://github.com/3K-PokeClip/PokeClip-mono/pull/192))은 AI(Claude Code)가, 리뷰는 Claude Code와 Codex가 함께 했습니다. 9월 24일 시험도 AI가 했고, 10월 6일 입력 상한 시험은 제 승인을 받아 AI(Codex)가 했습니다. 포트폴리오 요약(2026-10-15판) 16쪽은 이 경계를 「내가 정한 책임」으로, 시험 날짜를 9월 23일로 적었습니다. 경계는 AI의 계획이었고, 시험은 한국 시각 9월 24일 오전(UTC로는 9월 23일)이었습니다. 당시 PR과 코드 주석은 지금의 세션을 「회차」라고 불렀습니다. 지금은 시청자가 「방송 한 번」으로 보는 단위를 회차, 사이드카가 재생 목록 하나를 여닫는 단위를 세션이라고 부릅니다([회차 다시보기 글](/posts/projects/pokeclip-round-vod/)).

## 재포장 부품은 바이트만 만들고 저장은 밖에 뒀습니다 {#변환-함수가-파일-저장까지-알-필요는-없었습니다}

재포장 부품 `playback.Producer`는 열린 입력 핸들과 그 조각의 시각 도장 위치(`PlaybackPos`)를 받아 init, ③ 조각, init 해시를 한 번에 돌려줍니다. 파일을 열거나 쓰지 않고, 자식 프로세스를 띄우지 않고, 장부와 S3에도 닿지 않습니다([`producer.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/playback/producer.go#L50-L81)). 업로드와 확정은 업로드 워커가 합니다.

이렇게 나누면 「같은 입력이면 다시 해도 같은 실패」와 「잠깐 올리지 못한 상태」를 다르게 다룰 수 있습니다. 재포장은 입력이 잘렸거나, 영상 1·소리 1을 남길 수 없거나, 남긴 트랙이 비었거나, 입력이 16MiB를 넘으면 부분 산출 없이 실패합니다. 이 가운데 잘린 입력만 다시 읽어 볼 가치가 있어 재시도 사다리(1·2·4초)를 타고, 나머지는 첫 시도에 ③을 실패로 확정합니다. 같은 조각의 ② 원본은 그와 상관없이 올라갑니다([README 「무결성 4항과 재시도 부류」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1438-L1462)).

| 축 | 확정하는 것 | 다시 집는 조건 |
|---|---|---|
| ② 원본 | 원본 PUT 뒤 조각 행의 업로드 상태 CAS | 상태가 pending·failed |
| ③ 재포장 조각 | 세션 init과 대조 → PUT 뒤 ③ 상태 CAS | ③ 상태가 pending·failed, 세션이 끝나지 않음 |
| init | 세션 행에 키·해시·크기·시각을 한 문장으로 CAS | init 미확정, 세션이 끝나지 않음 |

영상은 조각 하나가 세 축으로 갈라져 올라가는 순서입니다. ③이 init을 기다리는 구간과, PUT이 실패한 축만 스위퍼가 다시 집는 장면을 보십시오.

{{< motion scene="ThreeAxisUpload" id="fig-three-axis-upload" kind="개념도" caption="녹화 조각 하나가 ② 원본·③ 재포장·init 세 축으로 갈라져 각자 PUT 뒤 장부 CAS로 확정됩니다. ③은 세션 init이 확정될 때까지 보류 목록에서 기다리고, 다음 조각의 ③ PUT이 실패하면 30초마다 도는 스위퍼가 그 축만 다시 집어 올립니다. 시간 간격은 단순화했습니다." >}}

스위퍼는 30초마다 ② → ③ → init 순으로 축마다 따로 조회·커서·잔량 지표를 들고 남은 것을 다시 집습니다. ②가 올라갔다고 ③의 실패가 묻히지 않고, init이 늦게 확정돼도 기다리던 ③이 그때 풀려 올라갑니다.

## 세션 init과 다른 조각은 올리지 않고 세션을 끝냅니다

③은 PUT 전에 자기 산출 init의 해시를 세션의 기대값과 견줍니다. 기대값은 실시간 작업이면 워커 메모리, 스위퍼 작업이면 장부의 세션 행에서 옵니다. 그림 2는 그 갈림길입니다.

```mermaid {#fig-playback-init-check kind="재구성" caption="③ 조각이 올라가기 전 세션 init과 대조하는 갈림길. 아직 모르면 보류했다가 init이 확정되면 다시 견주고, 같으면 PUT 뒤 CAS로 확정하며, 다르면 올리지 않고 세션을 init_mismatch로 끝냅니다. PUT이 실패한 조각은 스위퍼가 다시 집습니다. PokeClip-mono develop 825a3dfe의 media/README.md 1344–1483행과 axis_body.go 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1344-L1483"}
flowchart TB
  accTitle: ③ 조각의 init 대조
  accDescr: 녹화 조각을 재포장한 ③은 세션 init을 아직 모르면 보류 목록에서 기다린다. init이 확정되면 해시를 견주어 같으면 PUT 뒤 ③ CAS로 확정하고, 다르면 올리지 않고 ③을 실패로, 세션을 init_mismatch로 끝낸다.
  S["녹화 조각을<br/>③으로 재포장"] --> H["세션 init을 모르면<br/>보류 목록에서 대기"]
  H -->|"init 확정"| Q{"세션 init과<br/>해시가 같은가"}
  Q -->|같음| U["PUT 뒤 ③ CAS"]
  Q -->|다름| F["안 올림<br/>세션 끝냄"]
  style U fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

해시가 다르면 그 조각은 올리지 않습니다. 조각의 ③ 상태를 실패로, 세션을 `live`에서 `ending(init_mismatch)`로 한 문장에 바꿉니다([`axis_body.go` 225–233행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/upload/axis_body.go#L225-L233)). 그 조각 약 4초는 되감기·VOD 목록에서 GAP으로 남습니다. `init_mismatch`는 다음 세션이 이어받을 수 없는 종료라([`ending.go` 29행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/ending.go#L29)), 300초 안에 들어온 다음 조각은 같은 회차 안의 새 사슬(계승으로 이어진 세션 묶음)을 엽니다([`round_rule.go` 75–113행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/session/round_rule.go#L75-L113)). 옛 글은 이 동작을 「같은 방송에 섞지 않고 회차를 끝낸다」고 적었는데, 끝나는 것은 세션이고 방송(회차)은 이어집니다.

기대값을 아직 모르면 올리지도 실패로 적지도 않고 보류 목록에 둡니다. init 확정은 네 갈래로 갈립니다. 처음 확정(`Success`)과 같은 바이트로 이미 확정(`AlreadySame`)이면 기다리던 ③을 풀고, 다른 해시로 확정돼 있으면(`Mismatch`) 오류를 남기고 물러서며, 세션 행이 없으면(`Missing`) 거부합니다. 시각 도장은 Producer가 아니라 인덱서가 「mtxi + 세션 보정값」으로 계산해 넘깁니다([재포장 글](/posts/0-to-1/pokeclip-go-remux-same-io-benchmark/), [재접속 경계 글](/posts/0-to-1/pokeclip-reconnect-audio-gap/)).

## RTMP 송출부터 MinIO까지 24조각이 첫 시도에 올라갔습니다 {#실제-입력부터-저장소까지-이어-본-결과}

9월 24일 06:16–07:20(KST) 로컬 Docker compose에서 RTMP로 50초씩 두 번 송출했습니다. 첫 송출(06:16)은 예행이었고(그 전 06:12의 HTTP MinIO 예행은 SDK가 PUT을 모두 거부해 저장소를 HTTPS로 바꿨습니다), 리뷰 반영 수정을 넣어 사이드카를 다시 빌드·재생성한 뒤 51분 뒤(07:07) 같은 스트림 경로로 두 번째 송출을 보냈습니다. 저장소는 자체 서명 HTTPS MinIO, 장부와 녹화 볼륨은 이 시험 전용으로 분리했습니다.

| 관측 | 결과 |
|---|---|
| 두 송출의 ③ · init | ③ 24개, init 1개, 모두 첫 시도 업로드 |
| 두 번째 송출 ② · ③ | 12개 / 12개, 모두 첫 시도 |
| 재기동 뒤 init | 첫 행에서 다시 요청 → PUT → CAS `AlreadySame`(확정 시각 그대로) |
| ③ PUT 시간 중앙값 / 최대 | 12ms / 14ms |
| ② 완료 로그 → ③ 완료 로그 간격 중앙값 / 최대 | 22.65ms / 29.72ms |

PUT 시간은 업로더가 잰 PUT 구간만입니다. ② 완료에서 ③ 완료까지 22.65ms에는 입력 열기·크기 확인·재포장·PUT·CAS가 모두 들어 있습니다. 로컬 MinIO 값이라 AWS S3나 시청까지의 지연은 아닙니다.

hls.js 1.5.15로 두 번째 송출 12조각 목록을 재생하니 오류 0, 버퍼 한 구간 [0, 49.966]이었고 재생이 이어졌습니다. 두 송출 24조각을 한 목록에 넣고 42초로 탐색하자 경계(50.01초)를 넘어 59.9초까지 재생됐습니다. 그런데 그 경계에서 ③ 도장이 3,048.9초 앞으로 뛰어 있었습니다. 사이드카가 재기동하면서 메모리에만 있던 도장 사슬을 잃었고, 두 번째 송출 첫 조각이 보정 없이 원래 mtxi(약 3,120초)로 나간 것입니다. 이 시험 경로에서는 송출이 끊긴 동안 MediaMTX가 대체 화면을 내보내 mtxi가 0으로 돌아가지 않았습니다. 사이드카가 살아 있었다면 구멍 규칙으로 앞 조각 끝(71.436초)에 이었을 자리입니다. 「재기동과 보정 사건이 한 세션에 겹치면 도장이 어긋난다」는 PR에 적어 둔 알려진 한계가 실제로 나타난 것이고, hls.js 1.5.15가 왜 이 점프를 오류 없이 넘었는지는 확인하지 않았습니다.

같은 실행의 로그 109줄에는 `negative_drift −1,980ms` 오류가 1건 있었습니다. 장부가 파일 이름의 벽시각으로 조각 길이를 검산하는 안전망 경고로, 시험 송출기의 예열 때문에 두 번째 송출 첫 조각의 길이와 벽시각 간격이 약 2초 어긋난 것입니다. ③ 도장과는 다른 축이라 되감기 재생과는 상관이 없습니다. 옛 글은 이 경고를 시간축 문제로 읽었고, 「단일 버퍼」도 24조각 전체가 아니라 두 번째 송출 12조각 목록에서 본 결과였습니다.

## 16MiB를 넘는 입력은 한 바이트도 읽지 않고 거절합니다 {#거절할-입력은-읽기-전에-거절하는가}

재포장은 입력을 통째로 메모리에 올리므로 점유가 「동시 워커 수 × 입력의 약 4.5배」입니다. 상한 검사가 읽은 뒤에 있으면 메모리를 지키지 못합니다. 상한값은 9월 23일 AI가 6초·8Mbps·소리 6트랙 조각(6.5MiB)의 2.4배인 16MiB를 제안했고 제가 확인했습니다([README 1546행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1546)).

10월 6일 실제 녹화 파일에 미디어와 상관없는 `free` 상자를 넣어 크기를 정확히 맞춘 입력으로 경계를 확인했습니다.

| 입력 크기 | 결과 | 읽기 · 산출 |
|---|---|---|
| 16,777,216바이트(16MiB) | 성공 | 16MiB 읽음, 산출 있음 |
| 16,777,217바이트(16MiB + 1바이트) | `ErrInputTooLarge` | Read 호출 0회, 산출 없음 |

조건마다 한 번 돌린 경계 시험입니다. 크기를 아는 큰 입력을 읽기 전에 거절한다는 근거이고, 모든 망가진 MP4나 끝없는 입력을 시험한 결과는 아닙니다.

## 동시 실행 수는 메모리 비용으로 묶어야 했습니다 {#빠른-부품도-동시에-많이-돌리면-비싸집니다}

같은 날 실제 녹화 6.78MB 입력으로 동시 작업을 4에서 8로 늘리자 처리량은 초당 293회에서 294회로 그대로였고 최대 RSS는 171.84MiB에서 303.20MiB로 늘었습니다. 측정 조건과 표는 [재포장 글](/posts/0-to-1/pokeclip-go-remux-same-io-benchmark/)에 있습니다. 저장 비용도 늘었습니다. PR #192부터 조각마다 ③ 하나, 세션마다 init 하나가 더 올라가 스트림당 조각 PUT이 시간당 900회에서 1,800회로, S3 저장이 약 1.7배가 됐습니다.

## 재기동 복구는 남았고 init 잔량은 정리됐습니다

이 생산 층 뒤로 되감기 목록 렌더가 9월 25일([PR #196](https://github.com/3K-PokeClip/PokeClip-mono/pull/196)), 목록 S3 발행과 송출이 끝난 세션을 `ending`으로 닫는 전이가 10월 19일([PR #289](https://github.com/3K-PokeClip/PokeClip-mono/pull/289)) develop에 들어갔고, 11월 3일(KST) v1.0.0으로 출시됐습니다([PR #466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466)).

- **init 잔량.** 스위퍼는 init을 확정하지 못한 세션 가운데 끝나지 않은 세션을 다시 집습니다. PR #192 때는 세션이 끝남(`ended`)으로 가는 전이가 없어서, 원본이 지워진 세션까지 계속 남아 경고를 냈습니다. 10월 27일 그 전이가 들어오면서 조건이 실제로 걸러 주게 됐습니다([README 2517행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L2517)).
- **재기동 복구.** 도장 사슬과 세션 보정값은 사이드카 메모리에만 있습니다. 한 세션 안에서 보정값이 바뀌는 사건(재접속 등)과 사이드카 재기동이 둘 다 일어나면, 재기동 지점의 도장이 어긋날 수 있습니다. 9월 24일 시험이 그 모습이었습니다. 11월 7일 [PR #490](https://github.com/3K-PokeClip/PokeClip-mono/pull/490) 뒤로는 첫 mtxi가 음수인 세션이 보정값 −mtxi로 열리므로, 그런 세션은 재기동만으로도 그 크기(공개 문서 기준 약 44ms)만큼 도장이 뒤로 갈 수 있습니다. 알려진 한계로 적혀 있고([README 1586–1596행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1586-L1596)) 복구는 다음 판 범위입니다.

변환 함수의 성공을 저장 성공으로 읽지 않으려면, 산출물마다 확정 기록을 따로 두고 그 기록을 다시 집는 경로도 축마다 따로 두십시오. 한 축의 성공이 다른 축의 실패를 덮지 않습니다.

## 측정 조건

- 9월 24일 06:16–07:20(KST): 로컬 Docker compose, 프로젝트 포크 MediaMTX v1.20.1-pokeclip.2, 호스트 ffmpeg 8.1.2로 RTMP 50초 송출 두 번, 자체 서명 HTTPS MinIO, 시험 전용 장부 DB와 볼륨. 두 송출 사이에 사이드카를 다시 빌드·재생성. 재생은 hls.js 1.5.15.
- 10월 6일: 실제 녹화 파일에 `free` 상자를 더한 경계 입력, 조건마다 1회. Apple M5, Go 1.26.5.
- 9월 24일은 Claude Code, 10월 6일은 Codex가 수행했고 원자료는 비공개입니다. 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일) 기준입니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #192](https://github.com/3K-PokeClip/PokeClip-mono/pull/192) — 되감기용 재포장 부품(Producer)과 축별 업로드(2026-09-24 develop 머지)
- [PR #196](https://github.com/3K-PokeClip/PokeClip-mono/pull/196) · [PR #289](https://github.com/3K-PokeClip/PokeClip-mono/pull/289) · [PR #466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466) · [PR #490](https://github.com/3K-PokeClip/PokeClip-mono/pull/490) — 목록 렌더, 목록 발행과 세션 종료, v1.0.0 출시, 첫 mtxi가 음수인 세션
- [PokeClip-mono `media/README.md` 「③ 축은 어떻게 도나」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1344-L1483) · [재기동 한계](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1586-L1596) · [init 잔량 정리](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L2517)
- [PokeClip-mono `producer.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/playback/producer.go#L50-L81) · [`axis_body.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/upload/axis_body.go#L225-L233) · [`ending.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/ending.go#L29) · [`round_rule.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/session/round_rule.go#L75-L113)
- [FFmpeg 재포장은 조각마다 init이 달라 Go로 바꿨습니다](/posts/0-to-1/pokeclip-go-remux-same-io-benchmark/) · [같은 세션 재접속에 HLS 끊김 표시를 달지 않은 이유](/posts/0-to-1/pokeclip-reconnect-audio-gap/) · [회차 다시보기 글](/posts/projects/pokeclip-round-vod/)
- 팀 내부 실험 기록(비공개) — 9월 24일 compose 시험(예행·최종), 10월 6일 입력 상한 경계 시험

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 14·16쪽](/portfolio/2026-10-15-v2/full.pdf#page=16)
