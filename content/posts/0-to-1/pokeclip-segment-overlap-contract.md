---
title: "3.9초부터 자르면 첫 조각이 빠진다: 조회 계약과 8,020개 경계 검증"
date: "2026-10-15T11:28:22+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "시작점 BETWEEN을 실제 구간 겹침으로 정정하고, 계약 확정·팀원 구현·SQL 정확성 시험을 구분했습니다."
tags: ["PokeClip", "PostgreSQL", "SQL", "협업"]
portfolio_cases: [28]
portfolio_pages: [17, 18]
portfolio_edition: "2026-10-15-v2"
---

0~4초 파일 A와 4~8초 파일 B가 있을 때 사용자가 3.9~8초를 선택하면 A의 마지막 0.1초와 B 전체가 필요합니다. 그런데 파일의 시작 시각이 요청 안에 있는지만 조회하면 A는 탈락합니다. 시작값 0은 3.9보다 작기 때문입니다. 필요한 파일이 없어진 이유는 저장 실패가 아니라 조회 계약이 묻는 질문에 있었습니다.

저는 AI가 작성한 저장 구조 조사 4편에 교차 검토가 빠진 것을 확인하고 모두 다시 검토하도록 요구했습니다. 그 과정에서 이 반례가 드러났고, **시작점 포함 조건을 구간 겹침 조건으로 정정·확정**해 데이터 담당과 조율했습니다. 계약 정정은 2026년 8월 14일, Spring Reader·조립기·회귀 테스트의 팀원 구현은 8월 24일 [PR #120](https://github.com/3K-PokeClip/PokeClip-mono/pull/120)으로 병합됐습니다. 팀원의 구현을 제가 단독 구현한 것으로 설명하지 않습니다.

## BETWEEN은 앞을 놓치고 끝도 더 골랐습니다

요청을 반열린 구간 [3.9초, 8초)로 둡니다. 시작은 포함하고 끝은 제외하므로, 8초에 시작하는 C는 필요 없습니다. 그러나 BETWEEN은 양 끝을 포함하고 파일 시작값만 보기 때문에 두 방향으로 틀릴 수 있습니다.

| 파일 | 요청에 필요한 부분 | 이전 BETWEEN | 겹침 조건 |
|---|---|---|---|
| A [0,4) | 마지막 0.1초 | 누락 | 포함 |
| B [4,8) | 전체 | 포함 | 포함 |
| C [8,12) | 없음 | 불필요하게 포함 | 제외 |

확정한 조건은 다음 두 비교를 동시에 만족하는 것입니다. 아래는 SQL 전체 실행 스크립트가 아니라 조회의 논리 조건입니다.

> segment_start < clip_end **AND** segment_start + duration > clip_start

첫 조건은 요청 뒤에서 시작한 파일을 제외하고, 둘째는 요청 전에 이미 끝난 파일을 제외합니다. 결과는 seq로 정렬합니다. [실제 Reader](https://github.com/3K-PokeClip/PokeClip-mono/blob/07b38d3f9200a01861f8c0bcf47579882c5a9fd2/services/clip/src/main/java/com/pokeclip/clip/segment/StreamSegmentReader.java)는 `ingestKey → endMs → startMs` 순으로 인자를 바인딩합니다.

검색 시작을 고정 4초 앞당기는 우회는 쓰지 않았습니다. 녹화 길이는 키프레임에 따라 달라지므로 실제 `duration_ms`로 구간 끝을 계산해야 합니다. 정확히 끝점만 닿는 파일은 겹치는 길이가 0이므로 `<`와 `>`의 엄격한 비교가 필요합니다.

## 파일을 찾는 것과 지금 쓸 수 있는 것은 다릅니다

Reader가 pending·failed를 함께 돌려주는 이유도 중요합니다. SQL에서 uploaded만 남기면 중간에 미완료 파일이 있다는 정보를 조립기가 잃을 수 있습니다. 조립기는 처음 가용 파일 전의 미완료를 건너뛰되, 일단 선택한 뒤에는 미완료나 seq 공백을 만나면 멈춥니다. failed도 재시도 후 바뀔 수 있는 미가용 상태로 다룹니다.

| 요청과 상태 | 조립 결과 | 완전성 |
|---|---|---|
| [3.9,8), A/B uploaded | A·B 선택, [0,8) 가용 | true |
| [3.9,8), A pending·B uploaded | B만 선택, [4,8) 가용 | false: 요청 머리 없음 |
| [0,12), A 완료·B 대기·C 완료 | A에서 멈춤 | false: 중간 공백 |

[SegmentWindowAssembler](https://github.com/3K-PokeClip/PokeClip-mono/blob/07b38d3f9200a01861f8c0bcf47579882c5a9fd2/services/clip/src/main/java/com/pokeclip/clip/segment/SegmentWindowAssembler.java)는 가용 구간이 요청 양 끝을 덮는지도 확인합니다. 조회 전 서비스는 음수 시작, 끝이 시작 이하, 30분 초과 요청을 먼저 거절합니다. 또한 A·B를 찾았다고 키프레임과 무관한 무손실 정밀 컷이 보장되는 것은 아닙니다. 실제 자르기는 다음 책임입니다.

## 정확한 seq 집합을 두 시간축에서 대조했습니다

2026년 10월 6일 격리 PostgreSQL 17에서 실제 SQL을 추출하고, 별도 교집합 계산으로 만든 기대 seq와 비교했습니다. 상대 PTS뿐 아니라 현재 렌더 요청의 playback 시간축도 검사했습니다.

| 실제 SQL | 입력 | 일치 |
|---|---|---:|
| 상대 PTS | 시작 오프셋 4,000개 + 경계 10개 | 4,010/4,010 |
| playback 시간 | 시작 오프셋 4,000개 + 경계 10개 | 4,010/4,010 |
| 합계 | 두 SQL의 기대 결과 | **8,020/8,020** |

playback 쿼리의 `COALESCE(playback_pdt, start_wall_utc)`는 playback 값이 있으면 우선하고 NULL이면 wall 시각으로 대체되는지 검사했습니다. 다른 스트림, 정확한 접점, 한 조각 내부, pending/failed 상태도 포함했습니다. [현재 두 SQL](https://github.com/3K-PokeClip/PokeClip-mono/blob/79da7f670474249fe94c78c89d36e02facc7277d/services/clip/src/main/java/com/pokeclip/clip/segment/StreamSegmentReader.java#L27)과 [8,020개 검사 설명](/portfolio/2026-10-15-v2/full.pdf#page=18)을 연결해 두었습니다.

옛 BETWEEN 대조식은 각 축 4,000개 오프셋 중 **3,999개**에서 첫 부분을 놓쳤고, 최대 3,999ms가 빠졌습니다. 합성 입력을 의도적으로 경계에 걸친 결과이므로 과거 운영 장애율로 해석하지 않습니다.

## 항상 빈 목록이어도 통과하는 테스트를 피했습니다

별도의 PostgreSQL 16.15 대조는 뒤섞은 삽입 순서와 다른 스트림을 포함한 8개 경계에서 8/8 기대 결과와 일치했습니다. 저장소의 [회귀 테스트](https://github.com/3K-PokeClip/PokeClip-mono/blob/07b38d3f9200a01861f8c0bcf47579882c5a9fd2/services/clip/src/test/java/com/pokeclip/clip/segment/StreamSegmentReaderTest.java)도 앞 조각, 정확한 경계, seq 순서, 상태 보존, 스트림 격리, 컬럼 매핑을 확인합니다. 제외할 파일 옆에 포함할 파일도 두고 정확한 seq를 단언해야, 무조건 빈 결과를 반환하는 잘못된 구현이 통과하지 않습니다.

이번 검증은 선택 정확성과 후속 가용성 판정에 대한 근거입니다. Java HTTP 요청부터 FFmpeg와 최종 영상까지의 종단 성공률이나 속도를 측정한 것이 아닙니다. 제 기여는 누락을 드러낼 검토를 요구하고, 시간 구간의 의미를 계약으로 정정·확정해 소비자 구현으로 이어지게 한 데 있습니다.

---

이 글은 PokeClip의 개발·검증 기록을 2026년 10월 15일 기준으로 정리한 CASE 28입니다. [전체 기술 기록](/posts/0-to-1/portfolio-engineering-notes/)에서 연결되는 결정을 함께 읽을 수 있습니다.
