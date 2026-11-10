---
title: "BETWEEN 대신 구간 겹침으로 클립 첫 조각을 찾았습니다"
date: "2026-10-15T11:28:22+09:00"
lastmod: "2026-11-11T07:57:53+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "조각 시작점이 요청 안에 있는지만 묻는 BETWEEN이 클립 첫 조각을 빠뜨리고 끝 조각을 더 고르던 문제를 구간 겹침 조건으로 정정한 계약, 찾은 조각과 지금 쓸 수 있는 구간을 나눈 조립, 두 시간축 8,020개 기대 결과 대조와 빈 목록 테스트 방지, 그리고 이 겹침 조회가 편집기 벽시각 컷을 조각 좌표로 바꾸는 자리에 남게 된 11월 결정."
tags: ["PokeClip", "PostgreSQL", "SQL", "HLS", "협업"]
portfolio_cases: [28]
portfolio_pages: [17, 18]
portfolio_edition: "2026-10-15-v2"
---

PokeClip 녹화는 4초 안팎의 조각으로 저장됩니다. 0–4초 조각 A와 4–8초 조각 B가 있을 때 사용자가 3.9–8초를 고르면 A의 마지막 0.1초와 B 전체가 필요합니다. 그런데 조각 시작 시각이 요청 안에 있는지만 묻는 `BETWEEN` 조회는 A를 빼고, 8초에 시작하는 C를 더 골랐습니다. 2026년 8월 14일 조건을 「조각 구간과 요청 구간이 겹치는가」로 정정했고, 팀원이 그 계약으로 조회·조립·회귀 테스트를 구현해 8월 24일 [PR #120](https://github.com/3K-PokeClip/PokeClip-mono/pull/120)으로 머지했습니다. 10월 6일 정확성 시험에서 두 시간축의 실제 SQL이 독립 계산한 **8,020개 기대 결과와 모두 일치**했고, 같은 입력에서 옛 BETWEEN은 4,000개 중 3,999개에서 첫 부분을 놓쳤습니다. 11월 3일에는 이 겹침 조회를 편집기의 벽시각 컷을 조각 좌표로 바꾸는 자리에 그대로 쓰기로 했습니다.

이 반례는 AI가 쓴 저장 구조 조사 4편에 교차 검토가 빠진 것을 보고 제가 전부 재검토하라고 요구한 과정에서 드러났습니다. 저는 겹침 조건으로 계약을 정정·확정하고 데이터 담당과 조율했습니다. 조회(Spring Reader)·조립기·회귀 테스트 구현은 팀원이 했고, 10월 6일 정확성 시험은 AI 에이전트가 수행했습니다.

## 시작점만 보는 BETWEEN은 첫 조각을 빼고 끝 조각을 더 골랐습니다 {#between은-앞을-놓치고-끝도-더-골랐습니다}

요청을 반열린 구간 [3.9초, 8초)로 둡니다. 시작은 포함하고 끝은 제외하므로 8초에 시작하는 C는 필요 없습니다. BETWEEN은 양 끝을 포함하고 조각 시작값만 보므로 두 방향으로 틀립니다.

| 조각 | 요청에 필요한 부분 | 옛 BETWEEN | 겹침 조건 |
|---|---|---|---|
| A [0,4) | 마지막 0.1초 | 빠짐 | 포함 |
| B [4,8) | 전체 | 포함 | 포함 |
| C [8,12) | 없음 | 불필요하게 포함 | 제외 |

영상에서 위쪽 BETWEEN 줄과 아래쪽 겹침 줄이 같은 요청 창 [3.9, 8)을 두고 어느 조각에 불이 들어오는지를 보면 됩니다.

{{< motion scene="OverlapQuery" id="fig-overlap-query" kind="개념도" caption="요청 [3.9초, 8초) 위에서 시작점만 보는 BETWEEN은 시작값 4와 8이 범위 안인 B · C를 고르고 A를 빠뜨립니다. 겹침 조건(조각이 요청 끝보다 먼저 시작하고 요청 시작보다 늦게 끝남)은 A · B를 고르고 끝점만 닿는 C를 뺍니다. 설명용 그림입니다." >}}

확정한 조건은 두 비교를 함께 만족하는 것입니다. 아래는 실행 스크립트가 아니라 조회의 논리 조건입니다.

> segment_start < clip_end **AND** segment_start + duration > clip_start

첫 비교는 요청 뒤에서 시작한 조각을, 둘째는 요청 전에 이미 끝난 조각을 뺍니다. 결과는 seq 순서입니다. [실제 Reader](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/main/java/com/pokeclip/clip/segment/StreamSegmentReader.java#L65-L78)는 `ingestKey → endMs → startMs` 순서로 인자를 묶습니다.

빠진 A를 살리려고 검색 시작을 4초 앞당기는 우회도 있었습니다. 그러나 조각 길이는 키프레임에 따라 달라집니다. 고정 길이 우회는 「요청과 겹치는 조각」이라는 계약을 표현하지 못해 기각했습니다. 조각의 실제 `duration_ms`로 끝을 구하고, 끝점만 닿는 C는 겹치는 길이가 0이므로 `<`와 `>`로 뺐습니다.

## 찾은 조각과 지금 쓸 수 있는 구간을 나눴습니다 {#파일을-찾는-것과-지금-쓸-수-있는-것은-다릅니다}

겹치는 조각을 정확히 찾은 다음에는 그 조각을 지금 쓸 수 있는지 판단해야 했습니다. SQL에서 업로드가 끝난(`uploaded`) 행만 남기면 중간의 대기(`pending`)·실패(`failed`) 조각이 사라져, 떨어진 두 구간이 이어진 것처럼 보일 수 있습니다. 그래서 Reader는 상태를 거르지 않고 돌려주고, 조립기가 가용성을 판단합니다. 처음 가용한 조각 앞의 미완료는 건너뛰되, 고르기 시작한 뒤에는 미완료나 seq 공백에서 멈춥니다. `failed`도 재시도로 바뀔 수 있는 미가용 상태로 다룹니다.

| 요청과 상태 | 조립 결과 | 완전성 |
|---|---|---|
| [3.9,8), A/B uploaded | A·B 선택, [0,8) 가용 | true |
| [3.9,8), A pending·B uploaded | B만 선택, [4,8) 가용 | false: 요청 머리 없음 |
| [0,12), A 완료·B 대기·C 완료 | A에서 멈춤 | false: 중간 공백 |

[SegmentWindowAssembler](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/main/java/com/pokeclip/clip/segment/SegmentWindowAssembler.java)는 가용 구간이 요청 양 끝을 덮는지도 확인합니다. 조회 전에 서비스는 음수 시작, 끝이 시작 이하인 요청, 30분을 넘는 요청을 먼저 거절합니다. A·B를 찾았다고 키프레임과 무관하게 정확히 자를 수 있는 것은 아닙니다. 실제 자르기는 렌더 단계의 책임입니다.

## 두 시간축 8,020개 기대 결과와 모두 맞았습니다 {#정확한-seq-집합을-두-시간축에서-대조했습니다}

10월 6일 격리한 PostgreSQL 17에서 실제 SQL을 뽑아 실행하고, 별도의 교집합 계산으로 만든 기대 seq와 견줬습니다. 조각 시작의 상대 PTS 축과, 그날 기준 렌더 요청이 쓰던 재생(playback) 시각 축을 함께 검사했습니다.

| 실제 SQL | 입력 | 일치 |
|---|---|---:|
| 상대 PTS | 시작 오프셋 4,000개 + 경계 10개 | 4,010/4,010 |
| 재생 시각 | 시작 오프셋 4,000개 + 경계 10개 | 4,010/4,010 |
| 합계 | 두 SQL의 기대 결과 | **8,020/8,020** |

재생 시각 쿼리의 `COALESCE(playback_pdt, start_wall_utc)`는 재생 시각 값이 있으면 그것을 쓰고, NULL이면 수신 벽시각으로 대신하는지도 확인했습니다. 다른 스트림, 정확한 접점, 한 조각 내부, pending/failed 상태도 넣었습니다. 이 COALESCE 쿼리는 10월 6일 기준이고, develop `825a3dfe`(11월 10일)에도 조건이 그대로 있습니다([`StreamSegmentReader.java` 36–50행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/main/java/com/pokeclip/clip/segment/StreamSegmentReader.java#L36-L50)). 포트폴리오 요약(2026-10-15판) 18쪽의 「렌더 경로의 COALESCE」도 10월 6일 기준입니다. 시험에 쓴 판은 [10월 6일 시험 시점 develop(79da7f67)의 두 SQL](https://github.com/3K-PokeClip/PokeClip-mono/blob/79da7f670474249fe94c78c89d36e02facc7277d/services/clip/src/main/java/com/pokeclip/clip/segment/StreamSegmentReader.java#L27-L51)입니다.

옛 BETWEEN도 같은 입력에 대조했습니다. 축마다 오프셋 4,000개 중 **3,999개에서 첫 부분이 빠졌고, 가장 많이 빠진 것은 3,999ms**였습니다. 새 쿼리의 성공만이 아니라 옛 조건이 왜 틀리는지도 같은 기대 seq로 드러냈습니다. 입력을 일부러 경계에 걸친 합성 시험이므로, 이 비율을 과거 운영 장애율로 읽으면 안 됩니다.

## 늘 빈 목록을 돌려줘도 통과하는 시험을 막았습니다 {#항상-빈-목록이어도-통과하는-테스트를-피했습니다}

별도 PostgreSQL 16.15 대조는 삽입 순서를 섞고 다른 스트림을 넣은 경계 8개에서 8/8 기대 결과와 일치했습니다. 저장소의 [회귀 테스트](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/test/java/com/pokeclip/clip/segment/StreamSegmentReaderTest.java)도 앞 조각, 정확한 경계, seq 순서, 상태 보존, 스트림 격리, 컬럼 매핑을 확인합니다. 빼야 할 조각 옆에 넣어야 할 조각도 두고 정확한 seq를 단언해야, 늘 빈 결과를 돌려주는 잘못된 구현이 통과하지 못합니다.

이제 3.9초부터 요청하면 조회는 A를 넣고 C를 뺍니다. A가 아직 pending이면 조립기는 실제 가용 구간이 4초부터라는 사실과 불완전 상태를 함께 돌려줍니다. 「찾을 조각」과 「지금 쓸 구간」을 나눠, 빠짐을 성공으로 숨기지 않게 됐습니다.

## 이 겹침 조회는 편집기 벽시각 컷을 조각으로 바꾸는 자리에 남기기로 했습니다

11월 2일 클립과 렌더의 정밀 좌표를 벽시각에서 미디어 시각으로 옮기기로 했습니다. 렌더 주문은 「조각 번호 + 조각 안 미디어 시각」을 주고받게 됩니다. 11월 3일에는 편집기를 그대로 두기로 했습니다. 편집기는 지금 화면을 유지하고 컷을 벽시각 밀리초로 보냅니다. 클립 서비스가 렌더 주문을 만들 때 그 구간에 걸친 조각을 이 겹침 조건으로 찾고, 장부의 공용 변환으로 조각 안 미디어 시각으로 바꿉니다. 첫 조각을 빠뜨리지 않는 조회가 새 구조에서도 첫 단계로 남는 셈입니다. 결정의 경과는 [미디어 시간축 글](/posts/projects/pokeclip-media-timeline-over-wall-clock/)에 있습니다.

그림 2에서 청록 상자가 계획 경로이고, 흰 상자만 지나는 왼쪽 갈래가 develop의 현재 경로입니다.

```mermaid {#fig-cut-to-segment kind="개념도" caption="편집기 벽시각 컷이 렌더 주문이 되기까지. 왼쪽 갈래는 develop 825a3dfe의 현재 경로(겹친 조각과 조각 시작 시각을 주문에 실음), 청록 상자는 11월 2·3일 결정의 계획 경로(겹침 조회 뒤 공용 변환으로 조각 안 미디어 시각을 계산)입니다. 공용 변환 모듈은 PR #470으로 머지됐지만 부르는 서비스가 없고, 클립 PR #475와 렌더 PR #496은 11월 11일 기준 머지 전 초안입니다." source="https://github.com/3K-PokeClip/PokeClip-mono/pull/470"}
flowchart TB
  accTitle: 편집기 컷에서 렌더 주문까지
  accDescr: 편집기가 벽시각 밀리초 컷을 보내면 클립 서비스가 구간 겹침 조회로 조각을 찾는다. 현재 경로는 조각과 조각 시작 시각을 렌더 주문에 싣는다. 계획 경로는 공용 변환으로 조각 번호와 조각 안 미디어 시각을 계산해 렌더 주문에 싣는다. 두 경로 모두 렌더로 간다.
  E[편집기 컷<br/>벽시각 ms] --> Q[클립 서비스<br/>구간 겹침 조회]
  Q --> N1[현재 주문<br/>조각 + 조각 시작 시각]
  Q --> F[계획: 공용 변환]
  F --> N2[계획 주문<br/>조각 + 조각 안 미디어 시각]
  N1 --> R[렌더]
  N2 --> R
  style F fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style N2 fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

계획이 모두 들어간 것은 아닙니다. 장부 시각을 「조각 + 조각 안 위치」로 바꾸는 공용 모듈은 11월 3일 [PR #470](https://github.com/3K-PokeClip/PokeClip-mono/pull/470)으로 머지됐지만 아직 부르는 서비스가 없습니다. 클립 쪽 [PR #475](https://github.com/3K-PokeClip/PokeClip-mono/pull/475)와 렌더 쪽 [PR #496](https://github.com/3K-PokeClip/PokeClip-mono/pull/496)은 머지 전 초안입니다. #475는 클립의 장부 조회를 스트림이 아니라 회차에 속한 행 기준으로 옮기는 중이라, 8,020개 시험에 넣었던 「다른 스트림 격리」 조건도 머지와 함께 바뀔 예정입니다. 편집기는 녹화를 다시 재생한 화면에서 컷을 고르므로, 자른 자리가 본 자리와 어긋날 수 있다는 대가도 받아들였습니다. 11월 2일 실측의 웹 갈래에서 그 차이는 약 0.18초였습니다.

8,020개 대조가 보여 준 것은 조각 선택의 정확성까지입니다. Java HTTP에서 FFmpeg를 거쳐 최종 영상이 나오기까지의 종단 성공률과 속도는 따로 재야 합니다. 시간 구간으로 조각을 고르는 조회를 설계한다면 「시작점이 범위 안인가」가 아니라 「두 구간이 겹치는가」를 물으십시오. 그리고 빼야 할 조각 옆에 넣어야 할 조각을 함께 둔 시험으로 그 조건을 고정하십시오.

## 측정 조건

- 10월 6일 정확성 시험: 격리한 PostgreSQL 17에서 Java `StreamSegmentReader`의 상대 PTS 쿼리와 재생 시각 쿼리를 그대로 뽑아 자리표시자만 바꿔 실행했습니다. 4초 조각 8개와 다른 스트림 조각 8개, NULL 대체, 벽시각 60초 차이, pending/failed를 넣었습니다. 축마다 시작 오프셋 4,000개와 경계 10개입니다. AI 에이전트가 수행했고 원자료는 비공개입니다.
- 별도 경계 재현: PostgreSQL 16.15, 경계 8개, 삽입 순서를 섞음.
- 코드 인용은 PR #120 머지 뒤 판과 PokeClip-mono develop `825a3dfe`(2026년 11월 10일)입니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #120](https://github.com/3K-PokeClip/PokeClip-mono/pull/120) — 구간 → 조각 변환 조회 · 조립 · 회귀 테스트(2026-08-24 develop 머지, 팀원 구현)
- [PokeClip-mono `StreamSegmentReader.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/main/java/com/pokeclip/clip/segment/StreamSegmentReader.java) · [`SegmentWindowAssembler.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/main/java/com/pokeclip/clip/segment/SegmentWindowAssembler.java) · [`StreamSegmentReaderTest.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/test/java/com/pokeclip/clip/segment/StreamSegmentReaderTest.java) — develop 825a3dfe
- [PokeClip-mono `StreamSegmentReader.java` 10월 6일 판](https://github.com/3K-PokeClip/PokeClip-mono/blob/79da7f670474249fe94c78c89d36e02facc7277d/services/clip/src/main/java/com/pokeclip/clip/segment/StreamSegmentReader.java#L27-L51) — 정확성 시험에 쓴 두 SQL
- [3K-PokeClip/PokeClip-mono PR #470](https://github.com/3K-PokeClip/PokeClip-mono/pull/470) — 장부 시각 공용 변환 모듈(2026-11-03 머지) · [PR #475](https://github.com/3K-PokeClip/PokeClip-mono/pull/475) · [PR #496](https://github.com/3K-PokeClip/PokeClip-mono/pull/496) — 클립 · 렌더 초안(머지 전)
- [HLS 클립은 왜 벽시각 대신 미디어 시각으로 자를까?](/posts/projects/pokeclip-media-timeline-over-wall-clock/) — 11월 2·3일 결정
- 팀 내부 실측 기록(비공개) — 10월 6일 정확성 시험

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 17–18쪽](/portfolio/2026-10-15-v2/full.pdf#page=17)
