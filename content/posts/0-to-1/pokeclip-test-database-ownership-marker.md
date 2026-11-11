---
title: "통합 테스트 잔여 행을 전용 DB와 소유 표식으로 막았습니다"
date: "2026-10-15T11:28:22+09:00"
lastmod: "2026-11-12T05:01:54+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "통합 테스트와 옛 실측이 로컬 개발 DB에 남긴 1,121행이 업로드 스위퍼를 막아 2026년 8월 4일 인수 시험이 멈춘 뒤, PokeClip의 SQL 통합 테스트를 전용 DB로 모으고 새로 만든 DB에만 소유 표식을 심어 표식 없는 DB는 쓰지도 비우지도 않게 한 기록(PR #61). 표 개수 판정을 뚫은 미끼 DB 반례, PR 본문 실측 로그의 한계, 그리고 같은 이름을 쓰는 동시 실행처럼 아직 남은 문제까지."
tags: ["PokeClip", "PostgreSQL", "통합 테스트"]
portfolio_cases: [17]
portfolio_pages: [33]
portfolio_edition: "2026-10-15-v2"
---

2026년 8월 4일 S3 업로드 인수 시험의 첫 실행이 멈췄습니다. 로컬 Docker compose의 개발 DB에 스트림 405개 분량의 행 1,121개가 남아 있었고, 업로드 스위퍼가 이 행들에 매달려 시험 대상 5행에 90초 안에 닿지 못했습니다. 제품 결함은 아니었습니다. 1,121행을 지운 두 번째 실행은 끝까지 통과했습니다. 다시 쌓이지 않도록 SQL 통합 테스트가 쓰는 곳을 전용 테스트 DB 하나로 모으고, 새로 만든 DB에만 소유 표식을 심어 표식이 없는 DB는 쓰지도 비우지도 않게 했습니다.

작업 티켓의 원안은 테스트가 끝날 때 `t.Cleanup`에서 자기 행을 지우는 것이었습니다. 저는 store 테스트도 업로드 테스트처럼 별도 DB에서 돌리면 되지 않느냐고 물었고, 확인 뒤 전용 DB로 통일하는 쪽으로 바꿔 확정했습니다. 개발 DB에 남은 테스트 잔재를 한 번 지우는 것도 제가 승인했습니다. 구현은 AI(Claude Code)가 했고, 리뷰는 Claude Code와 Codex, 그리고 별도의 보안 검수가 했습니다. [PR #61](https://github.com/3K-PokeClip/PokeClip-mono/pull/61)은 제 승인 뒤 8월 16일 19시 5분(한국 시각)에 병합됐습니다.

## 잔여 1,121행이 스위퍼를 막아 업로드 인수 시험이 멈췄습니다

업로더는 녹화 조각마다 DB 장부에 행을 두고, 30초마다 도는 스위퍼가 아직 올라가지 않은 행을 다시 집어 S3에 올립니다([업로드 상태 글](/posts/0-to-1/pokeclip-upload-state-and-recovery/)). 8월 4일 인수 시험은 이 스위퍼가 시험용 행 5개를 다시 올리는지 봤습니다. 그런데 장부에는 통합 테스트와 옛 실측이 남긴 잔여 행 1,121개가 먼저 있었습니다. 대부분은 SQL 통합 테스트가 만든 `itest-*` 스트림의 행이었고, 나머지는 예전 실측에 쓴 `test-`·`spike-`·`probe-` 스트림의 행이었습니다.

스위퍼는 이 잔여 행을 처리하느라 대기 959건, 실패 92건에 묶였고, 세 번째 순회까지 업로드 대상 거절(`upload_target_rejected`)이 384건 쌓였습니다. 시험 대상 5행은 차례가 오지 않았습니다. 잔여 행만 지우고 다른 표는 건드리지 않은 채 다시 돌리자 두 번째 실행은 모든 항목을 통과했습니다. 원인은 시험 장비가 아니라 테스트가 남긴 데이터였습니다. 당시 결정 기록은 이대로 두면 테스트 실행으로 하루 60행씩 다시 쌓인다고 봤습니다.

## 테스트는 연결만 닫고 행을 남겼습니다 {#연결을-닫는-것과-데이터를-지우는-것은-달랐습니다}

`media/internal/index`의 SQL 통합 테스트는 두 파일로 나뉘어 접속 대상이 달랐습니다. `upload_store_test.go`는 같은 PostgreSQL 서버에 전용 테스트 DB를 만들어 그 안에서만 돌았습니다. `store_test.go`는 개발용 접속 문자열 `PG_DSN`이 가리키는 공용 개발 DB에 직접 행을 넣었고, 끝날 때 연결만 닫았습니다. 지우는 코드는 없었습니다([공개 결정 기록](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/docs/decisions/2026-08-16-%ED%85%8C%EC%8A%A4%ED%8A%B8%EC%A0%84%EC%9A%A9DB-%EC%86%8C%EC%9C%A0%ED%91%9C%EC%8B%9D.md)).

| 후보 | 해결하는 것 | 남는 문제 |
|---|---|---|
| 테스트 끝에 `t.Cleanup`으로 자기 행 삭제(티켓 원안) | 정상 종료 뒤의 잔여 행 | 패닉·강제 종료·시간 초과면 `t.Cleanup`이 돌지 않아 다시 쌓임. 공용 DB를 겨눈 삭제 문장이 상시 남음 |
| 공용 DB를 주기적으로 청소하는 안전망 | 과거와 미래의 잔여 행 | 공용 DB를 겨눈 삭제 문장이 상시 남음. 전용 DB로 통일하면 청소할 대상이 없어져 존재 이유가 사라짐 |
| **전용 DB로 통일 + 소유 표식** | 쓰는 곳 자체를 분리 | `CREATEDB` 권한과 기존 DB의 한 번 이행이 필요 |

정리 코드를 더하면 그 코드가 반드시 돈다는 전제가 남습니다. 접속 대상을 나누면 테스트가 어떻게 죽든 공용 DB에 쓸 경로가 없습니다. 그래서 두 테스트의 접속과 준비 코드를 한 함수로 모으고, `PG_DSN`은 `CREATE DATABASE` 한 문장을 내는 관리 접속으로만 쓰게 했습니다. 표를 읽고 쓰는 일은 모두 `PG_TEST_DB`로 지정한 전용 DB 안에서 합니다.

## 표 개수로 소유를 판정하자 미끼 DB의 행이 지워졌습니다 {#테이블-모양으로-소유자를-추측했다가-틀렸습니다}

전용 DB를 여러 번 다시 쓰려면 `CREATE DATABASE`가 「이미 있음」(PostgreSQL 오류 코드 42P04)을 정상으로 넘겨야 합니다. 그런데 이 관용은 `PG_TEST_DB`가 이미 있는 남의 DB를 가리킬 때도 통과시키고, 통과하면 테스트가 그 DB의 표를 비웁니다. 그래서 비우기 전에 「이 DB를 써도 되는가」를 판정해야 했습니다.

첫 설계는 public 스키마의 표 개수와 이름이 테스트가 만드는 모양과 같으면 테스트 DB로 보는 것이었습니다. 리뷰 2라운드에서 AI 리뷰어(Claude Code)가 표 `stream_segments` 하나와 행 하나만 있는 미끼 DB를 만들어 돌리자, 테스트가 통과하면서 그 행이 사라졌습니다. 공용 개발 DB도 public에 표가 `stream_segments` 하나뿐이라 테스트 DB와 모양이 완전히 같았습니다([PR #61 본문](https://github.com/3K-PokeClip/PokeClip-mono/pull/61)). 같은 라운드에서 Codex도 이 구멍을 높은 심각도로 지적했습니다.

영상의 왼쪽은 옛 판정, 오른쪽은 새 판정이 같은 미끼 DB를 만났을 때입니다. 모양이 같은 DB에서 왼쪽만 행이 지워지는 것을 보십시오.

{{< motion scene="DecoyDbGuard" id="fig-decoy-db-guard" kind="개념도" caption="public 표가 stream_segments 하나뿐인 미끼 DB를 옛 판정(표 개수)은 테스트 DB로 보고 행을 비웠고, 새 판정은 CREATE DATABASE가 「이미 있음」을 돌려준 뒤 소유 표식이 없는 것을 보고 사용과 정리를 거부해 행이 그대로 남습니다. PR #61 본문의 미끼 DB 반례와 병합 코드를 바탕으로 한 설명용 그림입니다." >}}

바꾼 기준은 열이 하나도 없는 빈 표 `pokeclip_testdb_marker`입니다. 이 표식은 `CREATE DATABASE`가 성공해 DB를 새로 만들었을 때만 심습니다. DB가 이미 있으면 표식이 있는지 보고, 없으면 표를 비우기 전에 실패합니다. 이미 있는 DB에 표식을 먼저 심고 「이제 우리 것」이라고 판정하면 보호 장치가 아무것도 막지 못합니다. 모양은 우연히 같을 수 있지만 표식은 테스트가 직접 만든 DB에만 있습니다.

[[fig-testdb-guards]]는 테스트가 전용 DB를 쓰기 전에 거치는 판정입니다. 시작을 거부하는 두 가드와 표식 확인이 어디에 있는지 보십시오.

```mermaid {#fig-testdb-guards kind="재구성" caption="테스트 DB 부트스트랩의 가드 3종과 소유 표식. 이름 가드 2종은 PG_DSN의 DB 이름이 비었거나 PG_TEST_DB와 같으면 시작을 거부하고, CREATE DATABASE로 새로 만든 DB에만 표식을 심으며, 이미 있는 DB는 표식이 있을 때만 씁니다. PR #61 병합 커밋 7d7930c의 media/internal/index/testdb_test.go와 지금의 media/internal/pgtest/pgtest.go 84–169행 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/media/internal/pgtest/pgtest.go#L84-L169"}
flowchart TB
  accTitle: 테스트 DB 부트스트랩의 가드와 소유 표식
  accDescr: 테스트가 시작하면 PG_DSN의 DB 이름이 비었거나 PG_TEST_DB와 같으면 시작을 거부한다. 통과하면 CREATE DATABASE를 내고, 새로 만든 DB에만 소유 표식 표를 심는다. 그다음 표식이 있는지 보고, 이미 있던 DB에 표식이 없으면 사용과 정리를 거부한다. 표식이 있는 DB만 스키마 준비, 표 비우기, 테스트로 간다.
  S["테스트 시작"] --> G1{"이름 가드<br/>2종 통과?"}
  G1 -->|"아니오"| X["거부<br/>DB에 손대지 않음"]
  G1 -->|"예"| C["CREATE DATABASE<br/>새 DB에만 표식"]
  C --> G3{"표식이<br/>있나"}
  G3 -->|"없음"| X
  G3 -->|"있음"| U["스키마 준비<br/>→ 비우기 → 테스트"]
  style G3 fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

판정이 맞는지는 자동 테스트가 아니라 PR 본문에 옮겨 둔 실측 로그로 확인했습니다([PR #61 본문](https://github.com/3K-PokeClip/PokeClip-mono/pull/61)의 실측 로그 요지).

- 가드 3종 음성 대조: 테스트 DB 이름을 공용 DB 이름으로 줬을 때, `PG_DSN`에 DB 이름이 없을 때, 남의 DB를 가리켰을 때 셋 다 종료 코드 1로 멈췄습니다.
- 미끼 DB: 옛 표 개수 코드는 종료 코드 0으로 통과하고 미끼 행이 사라졌습니다(RED). 표식 코드는 네 경우 모두 종료 코드 1로 멈췄고 미끼 행이 남았으며, 미끼 DB에 표식도 스키마도 만들지 않았습니다(GREEN).
- 이행 경로: 표식이 없는 기존 전용 DB(행 5개)는 안내와 함께 거부됐고, 그 DB를 지우고 다시 돌리자 표식이 심긴 새 DB가 만들어졌으며, 세 번째 실행은 그 DB를 다시 썼습니다.

이 기록에는 한계도 있습니다. 실측할 때 공용 DB의 `stream_segments`는 이미 비어 있었습니다. 그래서 공용 DB 행 수가 「0 → 0」이라는 관찰은 「가드가 막았다」와 「애초에 쓸 것이 없었다」를 구별하지 못합니다. 잔재를 지우는 한 번짜리 SQL도 실제로 지운 행은 0행이었고, `itest-` 밖의 행을 건드리지 않는다는 것은 미끼 행 두 개로만 확인했습니다. 가드가 실제로 막는다는 근거는 미끼 DB의 RED → GREEN 대조입니다.

## 같은 이름을 쓰는 동시 실행은 여전히 서로 지웁니다 {#격리한-뒤에도-동시-실행은-별도-문제입니다}

표식은 「테스트가 써도 되는 DB인가」를 가릅니다. 두 실행이 같은 `PG_TEST_DB`를 함께 쓰면 둘 다 그 DB를 쓸 자격이 있으므로, 한쪽이 다른 쪽의 데이터를 비웁니다. 그래서 PR #61은 「실행마다 고유한 `PG_TEST_DB`를 준다」를 규약으로 적었습니다. 두 실행이 거의 동시에 들어오면, 한쪽이 DB를 만들고 표식을 심기 전의 아주 짧은 틈에 다른 쪽이 그 DB를 「남의 DB」로 보고 실패할 수도 있습니다. 데이터를 잃는 쪽이 아니라 실패하는 쪽이라 낮은 위험으로 남겼습니다.

2026년 9월 2일 이 부트스트랩은 여러 패키지가 함께 쓰는 `internal/pgtest`로 옮겨졌습니다. `go test ./...`는 패키지를 병렬로 돌리므로, 지금은 패키지마다 기본 이름에 접미사를 붙인 DB를 따로 씁니다([`pgtest.go` 50–64행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/media/internal/pgtest/pgtest.go#L50-L64)). 가드와 표식 판정은 병합 때와 같습니다. 그래도 별개의 두 프로세스가 같은 `PG_TEST_DB`를 쓰는 경우를 막는 코드는 2026년 11월 12일에도 없고, 표식 경합 오탐도 그대로입니다.

DB를 만들려면 테스트 계정에 `CREATEDB` 권한이 있어야 합니다([PostgreSQL `CREATE DATABASE` 문서](https://www.postgresql.org/docs/current/sql-createdatabase.html)). 표식이 생기기 전에 만든 로컬 전용 DB는 한 번 지우고 다시 만들어야 했습니다. 표식이 없다는 이유로 발견한 DB를 자동으로 채택하거나 비우는 방식은 고르지 않았습니다. 표식을 심기 전에 중단돼 남은 DB는 구조상 항상 비어 있으므로, 안내대로 지우면 잃는 것이 없습니다.

## 테스트가 중간에 죽어도 잔여 행은 전용 DB에 남습니다 {#강제-종료돼도-남을-장소가-달라졌습니다}

테스트가 다시 중간에 죽어도 그 행은 전용 DB에 남고, 다음 실행이 표식을 확인한 뒤 비웁니다. PR #61의 실측에서도 일부러 실패시킨 실행 뒤 공용 DB의 `itest-*` 행은 0개, 전용 DB의 행은 1개였습니다. 개발 DB의 스위퍼가 테스트 행을 집을 경로는 사라졌습니다.

이 문제를 `t.Cleanup` 정리 코드로 고쳤다면 정상 종료 시험은 통과했을 것입니다. 필요한 보장은 실패 뒤 청소가 성공하는 것이 아니라, 실패해도 다른 데이터에 손대지 않는 경계였습니다. 테스트가 데이터를 지우는 코드라면 「무엇이 테스트 데이터인가」를 모양으로 추측하지 말고, 테스트가 만든 곳에 남긴 표식으로 판정하십시오.

## 측정 조건

- 8월 4일 인수 시험: 로컬 Docker compose, 실제 S3 버킷, 첫 실행은 잔여 행 때문에 멈췄고 1,121행을 지운 뒤 두 번째 실행에서 모든 항목 통과. AI(Claude Code)가 수행했고 원자료는 비공개 기록입니다.
- PR #61 실측: 로컬 PostgreSQL, 가드 3종 음성 대조, 미끼 DB RED·GREEN, 이행 경로, `-count=1` 회귀 3회. AI(Claude Code)가 수행했고 값과 종료 코드는 PR 본문에 공개돼 있습니다.
- 코드 인용은 PR #61 병합 커밋 `7d7930c`(2026년 8월 16일)와 PokeClip-mono develop `2fc2323c`(2026년 11월 12일) 기준입니다.

포트폴리오 요약(2026-10-15판) 33쪽은 「통합 테스트가 연결만 닫고 데이터를 남겨 공용 개발 DB에 가짜 실패 행 1,121개가 쌓였다」고 적었습니다. 8월 4일 기록으로 보면 1,121행은 실패 행만이 아니라 대기와 실패가 섞인 잔여 행이었고, 대부분은 통합 테스트가 남겼지만 옛 실측 스트림의 행도 섞여 있었습니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #61](https://github.com/3K-PokeClip/PokeClip-mono/pull/61) — 전용 테스트 DB 통일과 소유 표식(2026-08-16 병합), 본문의 실측 로그와 알려진 제약
- [PokeClip-mono 결정 기록 「테스트 전용 DB · 소유 표식」](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/docs/decisions/2026-08-16-%ED%85%8C%EC%8A%A4%ED%8A%B8%EC%A0%84%EC%9A%A9DB-%EC%86%8C%EC%9C%A0%ED%91%9C%EC%8B%9D.md) — 기각한 대안
- [병합 당시 `media/internal/index/testdb_test.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/7d7930c3f954bb9105dec44a604da749cbfe8307/media/internal/index/testdb_test.go#L100-L156) — 가드와 표식
- [지금의 `media/internal/pgtest/pgtest.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/media/internal/pgtest/pgtest.go#L50-L169) — 패키지별 DB 이름, 가드, 표식
- [PostgreSQL `CREATE DATABASE`](https://www.postgresql.org/docs/current/sql-createdatabase.html)
- [업로드가 끝났는지는 S3 응답이 아니라 DB 장부로 봤습니다](/posts/0-to-1/pokeclip-upload-state-and-recovery/) — 스위퍼와 8월 4일 인수 시험
- 팀 내부 실험 기록(비공개) — 8월 4일 인수 시험 첫 실행

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 33쪽](/portfolio/2026-10-15-v2/full.pdf#page=33)
