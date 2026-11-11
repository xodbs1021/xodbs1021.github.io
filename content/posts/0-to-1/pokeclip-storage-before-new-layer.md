---
title: "조각이 이미 4초 객체라 새 S3 저장 계층을 보류했습니다"
date: "2026-10-15T11:28:22+09:00"
lastmod: "2026-11-12T02:10:00+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "녹화 조각이 이미 약 4초짜리 S3 객체이고 시간 인덱스가 있어, S3 접두사 샤딩·Netflix Live Origin(S3→KV)·Netflix MezzFS(FUSE)를 들이지 않고 새 저장 계층을 보류한 판단. 사후 리뷰에서 뒤집힌 「S3 쓰기는 비핵심」, 8월 30일 개발 EC2의 S3 PUT p50 36–41ms, 10월 6일 8개 객체 배치 GET을 8병렬로 받자 1MiB는 47%·4MiB는 13% 짧아진 결과, 그리고 지금도 조각을 하나씩 받는 렌더 일꾼 코드까지."
tags: ["PokeClip", "S3", "성능 측정", "설계 판단"]
portfolio_cases: [19]
portfolio_pages: [24, 25]
portfolio_edition: "2026-10-15-v2"
---

PokeClip의 클립 생성은 사용자가 고른 시간대에 겹치는 녹화 조각 몇 개를 S3에서 받아 이어 붙이는 일입니다. 녹화 조각은 이미 약 4초짜리 독립 객체이고, 장부에는 조각마다 방송 시각이 있습니다. 2026년 8월 14일 스파이크에서 S3 접두사 샤딩, Netflix Live Origin(S3 대신 KV 저장소), Netflix MezzFS(S3에 나뉘어 저장된 큰 객체를 FUSE로 마운트)를 견줘 봤지만, 세 기술이 푸는 문제는 우리 입력 단위에서 이미 풀려 있었습니다. 그래서 새 저장 계층을 보류했습니다. 대신 남은 질문은 「선택한 조각 8개를 다 받는 데 얼마나 걸리나」였습니다. 10월 6일 실제 S3에서 8개 객체 배치를 8병렬로 받자 순차보다 1MiB 객체는 47%, 4MiB 객체는 13% 짧아졌습니다.

새 저장 계층을 보류한 것은 제 결정입니다. 8월 14일 스파이크의 판정은 AI가 냈고, 판정 4건이 듀얼 리뷰 없이 발행된 것을 알고 사후 리뷰를 지시한 것은 저입니다. 사후 리뷰는 AI(Codex)가 했습니다. 8월 30일 S3 PUT 측정은 AI가, 10월 6일 S3 GET 실험은 제 승인을 받아 AI(Codex)가 했습니다.

## 4초 조각과 시간 인덱스가 이미 있어 세 기술을 들이지 않았습니다 {#기술의-해법보다-입력-단위를-먼저-비교했습니다}

세 기술은 각자 다른 문제를 풉니다. 기술을 들이기 전에 그 문제가 우리 입력 단위에서도 생기는지부터 대입했습니다.

| 비교 대상 | 그 기술이 푸는 문제 | 우리 조건 |
|---|---|---|
| S3 접두사 샤딩 | 한 접두사에 요청이 몰려 처리율 한도에 닿음([AWS 문서](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html)) | 키가 이미 방송·시간대별 접두사로 나뉨 |
| [Netflix Live Origin](https://netflixtechblog.com/netflix-live-origin-41f1b0ad5371) | 저장소가 곧 라이브 시청 경로라 쓰기 하나하나가 2초 재시도 예산 안에 끝나야 함 → S3 대신 KV | 라이브 시청은 미디어 서버가 맡고 S3는 지난 구간 · 장애 대비 원본 |
| [Netflix MezzFS](https://netflixtechblog.com/mezzfs-mounting-object-storage-in-netflixs-media-processing-platform-cda01c446ba) | 수백 GB 원본 파일에서 필요한 바이트만 꺼내려 FUSE로 부분 읽기 | 조각이 이미 약 4초 객체라 객체 하나를 통째로 받으면 됨 |

MezzFS가 소프트웨어로 만드는 「바이트 위치 지도」를 우리는 조각을 나눠 저장하는 구조로 미리 갖고 있습니다. 장부의 시간 인덱스로 구간에 겹치는 객체를 고르면 됩니다. 새 계층을 넣으면 그 계층의 인덱스와 실패 복구를 하나 더 운영해야 합니다. 세 기술 모두 들이지 않기로 한 대신, MezzFS에서 하나를 가져왔습니다. 클립 하나에 조각 8–9개가 필요한데 하나씩 받으면 왕복이 8–9번이니, 렌더 일꾼이 제한된 수만큼 동시에 받아야 한다는 것입니다.

## 「S3 쓰기는 비핵심」이라는 첫 판정은 사후 리뷰에서 뒤집혔습니다

8월 14일 판정 4건은 듀얼 리뷰 없이 발행됐습니다. 사후 리뷰를 맡은 Codex는 4건 모두 변경을 요청했습니다. 세 기술을 들이지 않는다는 큰 방향은 그대로였지만, 근거 문장 몇 개가 틀렸습니다.

- **「S3 쓰기는 비핵심」 철회.** S3는 지난 구간 시청과 VOD의 원본이고, 미디어 서버가 죽으면 대신 서빙할 원본입니다. S3에 늦게 써지면 그만큼 잃을 수 있는 구간이 늘고 장애 대비 원본도 늦게 준비됩니다.
- **읽기 부하를 빠뜨림.** 지난 구간을 시청자마다 다른 위치에서 찾는 요청과, 렌더·AI 일꾼이 CDN을 거치지 않고 S3에서 직접 받는 요청을 계산에 넣지 않았습니다.
- **「인덱스가 곧 바이트 지도」 정정.** 장부는 바이트 범위가 아니라 객체 단위 시간 지도입니다. 이 정정을 따라가다 클립 조회가 시작 시각을 물고 있는 첫 조각을 빠뜨리는 문제가 나왔고, 그 조건은 [구간 겹침 글](/posts/0-to-1/pokeclip-segment-overlap-contract/)에서 고쳤습니다.

후속 과제는 셋으로 남았습니다. 클립 조회 조건 정정, 렌더 일꾼의 제한된 병렬 다운로드, 업로드 대기 시간 측정과 지표 확장입니다. 질문도 바뀌었습니다. PUT이 느린지만이 아니라, 원본이 언제 S3에 생기는지, 필요한 조각을 정확히 골랐는지, 고른 묶음을 다 받기까지 얼마나 기다리는지를 따로 재야 했습니다.

## 개발 EC2의 S3 PUT은 연결 재사용 뒤 p50 36–41ms였습니다 {#put-수십-ms가-무엇을-설명하는지-제한했습니다}

8월 30일 개발 미디어 EC2에서 같은 리전 S3 버킷으로 두 크기의 객체를 각각 30번 차례로 PUT했습니다. 1,206,272바이트는 원본(②) 조각의 실측 크기이고, 849,920바이트는 재포장 조각(③)의 추정 크기(영상 0.75MB + 소리 0.06MB)입니다. 시도마다 다른 키를 썼고, curl 한 번의 호출로 30건을 보내 연결을 재사용했습니다. 연결을 맺는 첫 요청은 따로 떼었습니다.

| 객체 크기 | 첫 요청 | 이후 29회 p50 | 이후 29회 p95 |
|---|---:|---:|---:|
| 1,206,272B | 71.62ms | 40.52ms | 49.02ms |
| 849,920B | 61.43ms | 36.07ms | 39.82ms |

60번 모두 HTTP 200이었습니다. 값은 curl `time_total`이고, p95는 29개 표본의 근사 순위 값(28번째)입니다. 큰 쪽만 첫 바이트 시각이 전체의 약 24%에서 멈추는 구조 차이가 30번 모두 보여서(`Expect: 100-continue` 응답이 유력하나 미확인), 첫 바이트 시간을 지표로 쓰지 않았고 두 크기를 서로 견주지도 않았습니다. 두 p95를 더해 「조각당 PUT p95」라고 부르지도 않았습니다. 30번 순차 버스트라 EC2의 네트워크 버스트 크레딧 구간이었을 수 있고, 오래 이어지는 부하는 재지 않았습니다. 이 결과가 말하는 것은 「이 조건의 PUT 구간은 수십 ms」까지입니다. 파일 마감, 훅, 재포장, 장부 확정은 다른 구간입니다.

## 8병렬로 받으면 1MiB 배치는 47%, 4MiB 배치는 13% 짧아졌습니다 {#객체-하나보다-배치-전체가-끝나는-시간이-필요했습니다}

클립을 만들려면 객체 하나가 아니라 고른 객체가 모두 도착해야 합니다. 영상은 8개 객체를 차례로 받을 때와 8개를 한꺼번에 받을 때, 배치가 끝나는 시점을 견줍니다. 두 경우 모두 마지막 객체가 도착한 순간이 배치의 끝입니다.

{{< motion scene="BatchGetConcurrency" id="fig-batch-get-concurrency" kind="개념도" caption="같은 객체 8개를 위 줄은 하나씩 차례로, 아래 줄은 8개를 동시에 받습니다. 배치는 마지막 객체가 도착해야 끝나므로, 동시에 받으면 기다림이 줄지만 한 객체를 받는 시간보다 짧아지지는 않습니다. 순서를 보여 주는 설명용 그림이며 막대 길이는 실측값이 아닙니다." >}}

10월 6일 서울 리전 Lambda(Python 3.13, ARM64, 512MB)에서 실제 S3 GET으로 8개 객체를 모두 받고 SHA-256까지 확인한 시간을 쟀습니다. 연결 풀 16, 최대 시도 1, 256KiB씩 읽었고, 동시성 1·2·4·8을 조건마다 7번씩 섞인 순서로 돌렸습니다. [[fig-batch-get-lambda]]에서 두 선의 기울기를 보십시오.

{{< chart id="fig-batch-get-lambda" kind="실측" caption="서울 리전 Lambda에서 같은 크기 객체 8개를 모두 받고 해시를 확인한 시간의 중앙값(ms). 순차에서 8병렬로 바꾸면 1MiB는 246.2ms에서 130.5ms로, 4MiB는 411.2ms에서 358.8ms로 줄었고, 4MiB는 4병렬이 2병렬보다 느렸습니다. 2026-10-06, Python 3.13 ARM64, 512MB, 조건마다 7회 섞인 순서." source="팀 내부 실측(비공개 원시 묶음), 포트폴리오 요약 2026-10-15판 25쪽" height="320px" >}}
{"grid":{"left":8,"right":56,"top":44,"bottom":8,"containLabel":true},"legend":{"top":0,"data":["4MiB × 8","1MiB × 8"]},"xAxis":{"type":"category","name":"동시성","data":["1","2","4","8"]},"yAxis":{"type":"value","name":"ms","min":0,"max":450,"interval":150},"series":[{"name":"4MiB × 8","type":"line","symbolSize":8,"itemStyle":{"color":"#7a8a9b"},"lineStyle":{"width":2},"label":{"show":true,"position":"top","formatter":"{c}"},"data":[411.2,371.7,390.9,358.8]},{"name":"1MiB × 8","type":"line","symbolSize":8,"itemStyle":{"color":"#087f8b"},"lineStyle":{"width":3},"label":{"show":true,"position":"bottom","formatter":"{c}"},"data":[246.2,154.4,136.1,130.5]}]}
{{< /chart >}}

1MiB 배치는 2병렬에서 이미 154.4ms로 내려가고 그 뒤로는 조금씩만 줄었습니다. 4MiB 배치는 13%만 줄었고, 4병렬(390.9ms)이 2병렬(371.7ms)보다 느렸습니다. 객체가 커지면 요청을 더 겹치는 것만으로 기다림이 같은 비율로 줄지 않았습니다. 그래서 8병렬을 기본값으로 정할 근거는 얻지 못했습니다. 동시성의 상한은 실제 일꾼의 객체 크기·메모리·동시 작업 수에서 정해야 합니다.

예열 한 배치를 포함해 Lambda가 받은 456개 객체의 크기와 해시가 모두 맞았습니다. 같은 코드를 로컬 Mac에서 돌린 1MiB 배치는 동시성 1·2·4·8에서 884.9 / 437.9 / 312.6 / 257.0ms였지만, 네트워크·CPU·Python·SDK 판이 달라 Lambda 결과와 합쳐 개선 배수를 만들지 않았습니다.

## 렌더 일꾼 코드는 지금도 조각을 하나씩 받습니다 {#저장-계층-추가보다-먼저-남은-검증}

8월 14일에 남긴 병렬 GET은 아직 코드에 없습니다. 렌더 일꾼은 클립에 필요한 조각을 for 루프로 하나씩 받은 뒤 이어 붙입니다([`ClipRenderer.java` 79–83행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/src/main/java/com/pokeclip/render/work/ClipRenderer.java#L79-L83)). 포트폴리오 요약(2026-10-15판) 24쪽은 「제한된 병렬 다운로드를 유지」라고 적었는데, 렌더 일꾼이 병렬로 받은 적은 없습니다. 유지한 것은 지금의 객체 단위와 시간 인덱스이고, 병렬 다운로드는 남은 과제입니다.

10월 6일 GET 실험은 Python으로 만든 임시 다운로드 시험이라 Java 렌더 일꾼에 넣은 전후 비교가 아닙니다. 프로세스를 재사용했기 때문에 누적 최대 RSS로 동시성별 메모리 차이를 계산하지도 않았습니다. 앞 조건의 최고값이 다음 조건에 남기 때문입니다. 렌더 일꾼에 병렬 GET을 넣을 때 실제 객체 크기 분포에서 동시성과 메모리를 다시 재야 합니다. 그래도 남는 병목이 확인되면, 그때 저장 계층을 다시 견줍니다.

새 기술을 들일지 판단할 때는 그 기술이 푸는 문제의 입력 단위를 먼저 대입해 보십시오. 이미 작게 나뉜 객체와 시간 인덱스가 있다면, 남는 질문은 저장소를 바꾸는 일보다 고른 객체를 얼마나 빨리 다 받느냐일 수 있습니다.

## 측정 조건

- 8월 30일 S3 PUT: 개발 미디어 EC2 → 같은 리전 S3 버킷, 사전 서명 PUT 주소, 크기마다 30회 순차, 시도마다 다른 키, curl 한 번의 호출로 연결 재사용(새 연결은 크기마다 1회). AI가 수행했고 원자료는 비공개입니다.
- 10월 6일 S3 GET: 서울 리전 Lambda Python 3.13 ARM64 512MB, 합성 객체 8개, 동시성 1·2·4·8, 조건마다 7회(고정 시드로 섞은 순서), 예열 1배치는 통계에서 뺌. 로컬 비교는 Python 3.14·다른 SDK 판. 임시 AWS 자원은 실험 뒤 모두 지웠습니다. AI(Codex)가 수행했고 원자료는 비공개입니다.
- 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일) 기준입니다.

## 출처

- [AWS 문서 「Best practices design patterns: optimizing Amazon S3 performance」](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html) — 접두사당 요청 처리율과 자동 분할
- [Netflix Technology Blog 「Netflix Live Origin」](https://netflixtechblog.com/netflix-live-origin-41f1b0ad5371) — 라이브 원본을 S3에서 KV 저장소로 옮긴 이유
- [Netflix Technology Blog 「MezzFS — Mounting object storage in Netflix's media processing platform」](https://netflixtechblog.com/mezzfs-mounting-object-storage-in-netflixs-media-processing-platform-cda01c446ba) — S3 FUSE 마운트와 부분 읽기
- [PokeClip-mono `workers/render/.../ClipRenderer.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/src/main/java/com/pokeclip/render/work/ClipRenderer.java#L79-L83) — 조각을 하나씩 받는 다운로드 루프
- [BETWEEN 대신 구간 겹침으로 클립 첫 조각을 찾았습니다](/posts/0-to-1/pokeclip-segment-overlap-contract/)
- 팀 내부 기록(비공개) — 8월 14일 스파이크 판정과 사후 리뷰, 8월 30일 PUT 원시 기록, 10월 6일 GET 실험

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 24–25쪽](/portfolio/2026-10-15-v2/full.pdf#page=24)
