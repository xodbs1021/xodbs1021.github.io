---
title: "업로드가 끝났는지는 S3 응답이 아니라 DB 장부로 봤습니다"
date: "2026-10-15T11:28:22+09:00"
lastmod: "2026-11-12T02:10:00+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "사이드카 안의 업로더가 녹화 조각을 S3에 올린 뒤 장부 행을 조건부 갱신(CAS)으로만 uploaded로 바꾸고, 그 사이에 죽으면 30초마다 도는 스위퍼가 pending 행을 같은 키로 다시 올리게 한 구조. 8월 4일 실제 버킷 인수 시험(15파일 = 15행 = 15키, 유령 1,100행 9번째 순회), 10월 5일 스위퍼 접수 시험(1,100건 9번째 순회)과 실제 PostgreSQL 복구 6가지 × 5회, 그리고 재지 않은 실제 S3 장애 복구 시간까지."
tags: ["PokeClip", "S3", "Go", "상태 관리"]
portfolio_cases: [16]
portfolio_pages: [9, 16]
portfolio_edition: "2026-10-15-v2"
---

PokeClip 사이드카 안의 업로더는 녹화 조각을 S3에 PUT한 뒤 DB 장부의 그 조각 행을 `uploaded`로 바꿉니다. 두 동작 사이에서 프로세스가 죽으면 S3에는 객체가 있는데 장부에는 `pending`이 남습니다. 그래서 업로드가 끝났는지는 S3 응답이 아니라 장부로 판단하게 했습니다. 장부가 `uploaded`가 아니면 아직 끝나지 않은 일이고, 30초마다 도는 스위퍼가 그 행을 다시 읽어 같은 S3 키로 다시 올립니다. 2026년 8월 4일 실제 S3 버킷 인수 시험에서 60초 송출의 녹화 파일 15개, `uploaded` 행 15개, S3 키 15개가 일치했습니다. 10월 5일 시험에서는 대기 1,100건이 9번째 순회에서 모두 접수됐고, 실제 PostgreSQL에서 돌린 복구 6가지 × 5회, 30번이 모두 끝났습니다. 실제 S3 장애에서 복구에 걸리는 시간은 재지 않았습니다.

8월 3일 업로더의 구현 방침 6건은 제가 정했습니다. 실제 S3 버킷으로 검증하기, AWS SDK 기본 자격 증명 체인만 쓰기, 별도 컨테이너가 아니라 사이드카 프로세스 안에 두기, 밀림은 로그로만 감시하기, 마지막 조각은 확정된 뒤 다시 확인하고 올리기, 재기동하면 미완료 행을 다시 집고 실패를 끝 상태로 보지 않기입니다. 이 방침 위의 설계 초안과 리뷰는 AI 둘(Claude Code와 Codex)이 했고, 설계 승인은 제가 했습니다. 구현은 8월 4일 [PR #30](https://github.com/3K-PokeClip/PokeClip-mono/pull/30)·[PR #31](https://github.com/3K-PokeClip/PokeClip-mono/pull/31)로 AI(Claude Code)가 했고, 리뷰는 Claude Code와 Codex가 했습니다. 10월 5일 시험은 AI(Codex)가 했습니다.

## S3 PUT과 장부 확정 사이에서 죽으면 pending 행이 남습니다 {#접수-저장-확정을-하나의-성공으로-묶지-않기}

인덱서가 녹화 조각을 장부에 넣으면 그 행은 `pending`이고, 장부에는 올릴 S3 키와 파일 크기가 적혀 있습니다. 업로더는 그 키로 PUT하고, 성공하면 장부를 조건부로 갱신합니다. 조건은 「아직 `uploaded`가 아니고, 장부의 크기가 방금 올린 크기와 같을 때만」입니다(`upload_state <> 'uploaded' AND bytes = $3`, [`upload_store.go` 168–170행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/upload_store.go#L168-L170)). 이렇게 기대한 상태를 확인하고 바꾸는 갱신을 CAS(Compare-And-Swap)라고 부릅니다. 한 번 `uploaded`가 된 행은 이 문장으로 되돌릴 수 없고, 올린 뒤 장부의 크기가 바뀌었으면 확정하지 않습니다.

영상은 PUT과 CAS 사이에서 프로세스가 죽는 장면입니다. 위 칸 S3에는 객체가 생겼는데 아래 칸 장부는 `pending`으로 남아 있는 순간을 보십시오.

{{< motion scene="UploadCrashResume" id="fig-upload-crash-resume" kind="개념도" caption="업로더가 조각을 S3에 PUT한 직후 프로세스가 죽으면 S3에는 객체가 있지만 장부 행은 pending으로 남습니다. 재기동 뒤 스위퍼가 그 pending 행을 집어 같은 키로 다시 PUT하고, 장부 크기가 올린 크기와 같을 때만 CAS로 uploaded를 적습니다. 순서를 보여 주는 설명용 그림이며 실제 시간 비율은 아닙니다." >}}

같은 키로 다시 올리면 S3 객체는 같은 바이트로 덮어써집니다. PUT을 정확히 한 번만 실행하려고 애쓰는 대신, 중복 PUT과 장부 재조회 비용을 받아들이고 완료 판정을 장부 한 곳에 둔 것입니다. 메모리 큐는 프로세스와 함께 사라지지만 장부의 `pending` 행은 남습니다.

[[fig-upload-state]]는 장부 행이 갈 수 있는 상태와 바뀌는 조건입니다. `failed`도 끝 상태가 아니라 스위퍼가 다시 집는 상태입니다.

```mermaid {#fig-upload-state kind="재구성" caption="② 원본 조각 행의 업로드 상태. PUT이 성공하고 장부 크기가 같을 때만 CAS로 uploaded가 되고, 재시도를 다 쓰거나 하드 실패면 failed가 됩니다. PUT 뒤 CAS 전에 죽으면 pending이 그대로 남습니다. pending과 failed는 스위퍼가 같은 키로 다시 올리며, uploaded는 되돌리지 않습니다. PokeClip-mono develop 825a3dfe의 upload_store.go·options.go 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/upload_store.go#L168-L175"}
flowchart TB
  accTitle: 업로드 상태와 바뀌는 조건
  accDescr: 인덱서가 넣은 pending 행은 PUT이 성공하고 장부 크기가 같으면 CAS로 uploaded가 된다. 재시도를 다 쓰거나 하드 실패면 failed가 된다. PUT 뒤 CAS 전에 프로세스가 죽으면 pending으로 남는다. 스위퍼는 30초마다 pending과 failed를 같은 키로 다시 올린다. uploaded는 되돌리지 않는다.
  N["인덱서가 행을 넣음"] --> P["pending"]
  P -->|"PUT 성공<br/>크기 같으면 CAS"| U["uploaded"]
  P -->|"CAS 전에 죽음"| P
  P -->|"재시도 소진<br/>하드 실패"| F["failed"]
  F -->|"스위퍼가 같은 키로<br/>다시 PUT · CAS"| U
  style U fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

PUT 하나는 1·2·4초 간격으로 최대 4번 시도하고, 하드 실패가 3행 연속이면 그 축의 브레이커가 열립니다([`options.go` 20–24행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/upload/options.go#L20-L24)). 녹화 루트 밖을 가리키는 경로는 재시도 대상으로 넣지 않고 PUT 전에 거절합니다.

## 스위퍼는 pending을 먼저 읽고 지난번 멈춘 자리부터 이어 읽습니다 {#실패한-앞부분만-다시-읽으면-뒤가-굶습니다}

미완료 행을 남기자 다음 문제가 생겼습니다. 스위퍼가 매번 같은 첫 페이지부터 읽으면, 계속 실패하는 오래된 행이 그 페이지를 차지하고 뒤에 있는 새 녹화 조각은 차례가 오지 않습니다. 그래서 읽는 순서와 출발점을 정했습니다.

- 순서: `pending`을 `failed`보다 먼저 읽고, 같은 부류 안에서는 녹화 시작 시각이 이른 행부터 읽습니다([`upload_store.go` 345행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/upload_store.go#L345)).
- 출발점: 매 순회 1단계는 맨 앞 한 페이지를 읽고, 2단계는 지난 순회가 멈춘 커서부터 이어 읽습니다. 1단계가 성공해도 2단계는 반드시 돕니다([`sweep.go` 127–170행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/upload/sweep.go#L127-L170)).

1단계가 최신 `pending`을 놓치지 않게 하고, 2단계의 커서가 뒤쪽 행까지 차례를 돌립니다. 지금 코드의 기본값은 30초마다 순회, 한 페이지 128행, 한 순회 최대 8페이지, 작업 큐 256칸입니다([`options.go` 22·33·37·39행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/upload/options.go#L22-L39)). 큐는 한 번에 받을 일의 양을 제한할 뿐 완료 장부가 아닙니다. 코드 주석은 이 순회를 「회차」라고 부르는데, 방송 한 번을 뜻하는 회차와는 다른 말입니다([회차 다시보기 글](/posts/projects/pokeclip-round-vod/)).

## 대기 1,100건은 아홉 번째 순회에서 모두 접수됐습니다

이 순서가 뒤쪽 행을 굶기지 않는지는 재시도 로그가 아니라 「몇 번째 순회에서 모두 큐에 들어갔나」로 확인했습니다. 10월 5일 시험은 실제 스위퍼 코드에 가짜 장부 목록을 붙였고, 계측을 위해 순회마다 128건씩 접수하고 큐를 4,096칸으로 키웠습니다. 제품 기본값(한 페이지 128행 × 최대 8페이지, 큐 256칸)과 다른 조건입니다.

| 대기 작업 | 모두 접수한 순회 | 반복 | 큐가 차서 멈춘 순회 |
|---:|---:|---:|---:|
| 128건 | 1번째 | 5회 | 0 |
| 1,100건 | 9번째 | 5회 | 0 |
| 4,096건 | 32번째 | 5회 | 0 |

순회 수는 대기 건수를 128로 나눠 올림한 값과 같았습니다. 앞쪽 행이 매번 다시 읽혀도 커서가 멈추지 않았다는 뜻입니다. 9번째 순회는 몇 초 뒤 복구됐다는 뜻이 아니고, 1,100건의 S3 업로드가 끝났다는 뜻도 아닙니다. 큐에 들어간 순서만 잰 시험입니다.

8월 4일 실제 S3 버킷 인수 시험에서도 같은 숫자가 나왔습니다. 유령 행 1,100개를 일부러 넣은 상태에서, 다시 살린 행이 9번째 순회에 `uploaded`로 돌아왔고 새 녹화 조각은 모두 올라갔으며 큐가 차서 멈춘 순회는 0이었습니다. 녹화 루트 밖 경로를 넣은 행은 거절 로그 1건을 남겼고 S3에는 PUT이 0번 갔습니다. 60초 송출에서는 녹화 파일 15개 = `uploaded` 행 15개 = S3 키 15개였고 장부와 S3의 키 차이는 0이었습니다. 8월 17일 다시 잰 값도 15 = 15 = 15였습니다. 8월 4일 첫 실행은 통합 테스트가 남긴 가짜 실패 행 1,121개 때문에 멈췄는데, 이 경위는 [테스트 DB 소유권 글](/posts/0-to-1/pokeclip-test-database-ownership-marker/)에 있습니다.

## 실제 PostgreSQL에서 복구 여섯 가지가 30번 모두 끝났습니다 {#db-상태가-끝까지-바뀌는지도-따로-확인했습니다}

접수 순서가 맞아도 장부가 끝까지 바뀌는지는 따로 봐야 했습니다. 10월 5일 두 번째 시험은 실제 PostgreSQL 16과 실제 재포장 부품을 쓰고, S3 PUT만 가짜로 바꿨습니다. 원본 업로드 실패, 재생용 조각 업로드 실패, init 미확정, 방송 종료, 컷오프 밖 조각 제외, init 복구 뒤 기다리던 조각 풀기의 여섯 상태를 장부에 넣고, 스위퍼 조회부터 큐 접수·재포장·장부 갱신까지 이어 갔습니다.

여섯 가지를 5회씩, 30번 모두 기대한 상태로 끝났고 건너뛴 시험은 0이었습니다. 실제 DB의 상태 전이와 복구 배선은 확인했지만 PUT은 가짜라서 S3의 응답 지연이나 오류는 들어 있지 않습니다. 측정 코드는 고정 커밋 `4aab73df`의 시험 코드입니다.

## 재포장 조각과 init은 축마다 따로 다시 집습니다 {#원본-성공이-재생용-실패를-감추지-않게}

9월에 되감기 재생용으로 다시 포장한 조각(③)과 세션 init이 추가되면서 같은 규칙이 세 축으로 늘었습니다. 원본(②)이 올라가도 ③은 실패할 수 있고, ③이 준비돼도 init이 확정되지 않으면 재생을 열 수 없습니다. 하나의 `uploaded` 값으로 덮으면 실패한 축을 찾지 못하므로, 축마다 장부 열·CAS·스위퍼 커서를 따로 둡니다. 세 축의 순서와 init 대조는 [재포장 조각 업로드 글](/posts/0-to-1/pokeclip-playback-producer-boundaries/)에 있습니다.

## 실제 S3 장애의 복구 시간은 재지 않았습니다

8월 4일 시험은 실제 버킷이지만 정상 응답이었고, 10월 5일 시험은 PUT이 가짜였습니다. 그래서 S3가 실제로 오류를 내거나 느려질 때 스위퍼가 얼마 만에 밀린 행을 다 올리는지는 모릅니다. 확인한 것은 프로세스가 죽어도 할 일이 장부에 남는다는 것, 다시 읽는 순서가 뒤쪽 행을 굶기지 않는다는 것, 장부가 축마다 끝까지 바뀐다는 것입니다.

외부 저장소에 쓰고 DB에 완료를 적는 일이라면, 외부 호출을 한 번만 하려 하기보다 완료 판정을 DB 한 곳에 두고 같은 키로 다시 해도 되게 만드십시오. 그다음에는 다시 읽는 순서가 오래된 실패에 막히지 않는지를 따로 재야 합니다.

## 측정 조건

- 8월 4일 인수 시험: 로컬 Docker compose, 서울 리전의 실제 S3 버킷, 사이드카 안의 업로더, 60초 RTMP 송출. 유령 행 1,100개와 녹화 루트 밖 경로 행은 시험용으로 넣고 시험 뒤 지웠습니다. AI(Claude Code)가 수행했고 원자료는 비공개 기록입니다. 8월 17일 다시 잰 15 = 15 = 15도 비공개 기록입니다.
- 10월 5일 접수 시험: 실제 스위퍼 코드 + 가짜 장부 목록, 순회마다 128건 접수, 큐 4,096칸, 조건마다 5회.
- 10월 5일 복구 시험: PostgreSQL 16, 실제 재포장 부품, 가짜 PUT, 6가지 × 5회, 고정 커밋 `4aab73df`. 두 시험 모두 AI(Codex)가 수행했고 원자료는 비공개입니다.
- 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일) 기준입니다.

포트폴리오 요약(2026-10-15판) 9쪽은 이 글의 순회를 「회차」로 적었습니다. 방송 한 번을 뜻하는 지금의 회차가 아니라 스위퍼 순회입니다. 같은 쪽은 CAS와 순회 커서를 「내가 나눈 실패와 대가」로 적었는데, 이 구조는 제 방침 6건 위에서 AI가 쓴 설계 초안을 제가 승인한 것입니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #30](https://github.com/3K-PokeClip/PokeClip-mono/pull/30) · [PR #31](https://github.com/3K-PokeClip/PokeClip-mono/pull/31) — 업로더 코어와 배선(2026-08-04 머지)
- [PokeClip-mono `media/internal/index/upload_store.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/upload_store.go#L168-L175) — 업로드 CAS · [345행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/upload_store.go#L345) 스위퍼 조회 순서
- [PokeClip-mono `media/internal/upload/sweep.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/upload/sweep.go#L127-L170) — 1단계·2단계 순회
- [PokeClip-mono `media/internal/upload/options.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/upload/options.go#L20-L39) — 재시도·순회 주기·브레이커·큐·페이지 기본값
- [되감기 재포장 조각의 생성과 업로드 완료를 따로 확정했습니다](/posts/0-to-1/pokeclip-playback-producer-boundaries/) · [테스트 DB 소유권 글](/posts/0-to-1/pokeclip-test-database-ownership-marker/) · [회차 다시보기 글](/posts/projects/pokeclip-round-vod/)
- 팀 내부 실험 기록(비공개) — 8월 4일 인수 시험, 10월 5일 접수·복구 시험

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 9·16쪽](/portfolio/2026-10-15-v2/full.pdf#page=9)
