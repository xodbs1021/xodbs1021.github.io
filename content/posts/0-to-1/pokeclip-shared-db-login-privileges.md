---
title: "공유 DB에선 로그인 뒤 권한과 함수 가로채기를 막았습니다"
date: 2026-11-07T04:18:13+09:00
lastmod: 2026-11-12T02:20:00+09:00
categories: ["projects"]
tags: ["PokeClip", "보안", "RDS", "PostgreSQL", "search_path"]
draft: false
author: "김태윤"
description: "미디어 계정 둘과 Java 앱 서버 넷이 함께 쓰는 RDS에서, IAM 로그인 뒤 무엇을 할 수 있는지를 PostgreSQL 권한으로 좁힌 과정. 앱 계정이 public에 심은 같은 이름의 함수가 사이드카의 잠금 호출을 가로챈 10월 24일 실측, 호출을 pg_catalog로 한정하고 앱 표를 서버별 스키마로 옮긴 조치, 10월 26일 DELETE를 주며 둔 순번 하한 트리거와 그 정의자 함수의 PUBLIC 실행 권한 회수까지."
---

PokéClip의 RDS 하나를 미디어 서버의 계정 둘(사이드카 `media_indexer`, janitor `media_janitor`)과 Java 앱 서버 넷의 계정이 함께 씁니다. 연결마다 만드는 [RDS IAM 토큰](/posts/0-to-1/pokeclip-shared-db-auth-iam-tls/)은 누가 로그인하는지를 정할 뿐이고, 로그인한 뒤 무엇을 할 수 있는지는 PostgreSQL 권한이 정합니다. 10월 23일 첫 권한 목록을 병합한 뒤 26일까지 이 권한을 고쳐 나갔습니다. 10월 24일에는 앱 계정이 `public` 스키마에 함수를 만들 수 있으면 사이드카의 잠금 호출이 그 함수로 풀려 `media_indexer` 신분으로 실행된다는 것을 실측으로 확인했습니다. 10월 26일에는 DELETE를 주며 만든 하한 갱신 함수가 PUBLIC에 실행 권한이 열려 있어, 아무 계정이나 남의 스트림 순번 하한을 올릴 수 있었습니다. 호출을 `pg_catalog`로 한정하고, 앱 표를 서버별 스키마로 옮겨 `public` 쓰기를 거두고, 그 함수의 PUBLIC 실행 권한을 거둬 막았습니다.

미디어 계정의 권한 범위, DELETE를 줄지, 근본 정리를 따로 할지는 제가 정했습니다. 미디어 쪽 코드와 운영 SQL의 구현 · 시험 · 검수는 AI 에이전트(Claude Code와 Codex)가 했습니다. Java 앱 서버의 서버별 사용자와 권한 시험은 팀원이 구현했습니다([PR #343](https://github.com/3K-PokeClip/PokeClip-mono/pull/343)).

## 미디어 계정은 DELETE와 DDL 없이 시작했습니다

10월 23일 병합한 첫 `media_indexer` 권한은 표 단위 SELECT · INSERT · UPDATE였습니다(`stream_cutoffs`는 SELECT · INSERT만). DELETE와 DDL(표를 만들고 바꾸는 문장)은 없었고, 표를 만드는 일은 별도 소유 역할이 맡습니다(운영 `ENSURE_SCHEMA=false`). 목록만 적어 두지 않고, 같은 권한만 가진 역할을 PostgreSQL 17 컨테이너에 만들어 사이드카의 저장 경로가 그 권한으로 끝까지 도는지 시험으로 확인했습니다([PR #314](https://github.com/3K-PokeClip/PokeClip-mono/pull/314)). 실험 RDS에서는 기동 · 유휴 경로까지만 봤습니다.

지금 운영 SQL의 권한은 [[fig-role-grants]]와 같습니다. 화살표 하나가 운영 SQL의 GRANT 한 줄이고, 화살표가 없는 표에는 그 계정이 손대지 못합니다.

```mermaid {#fig-role-grants kind="재구성" caption="공유 DB의 계정별 표 권한. stream_* 표는 public 스키마에 있고 주인은 media_owner입니다. media_indexer는 읽고 쓰고 지울 수 있지만 순번 하한 표는 읽기만 합니다. 판별 서버의 채팅 원문 읽기는 표 주인인 수집 서버가 줍니다. PokeClip-mono develop 825a3dfe의 prod/runtime/sql/30_grants.sql과 10_roles.sql 재구성(표 일부는 묶어 적음)." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/runtime/sql/30_grants.sql"}
%%{init: {"flowchart": {"wrappingWidth": 300}}}%%
flowchart TB
  accTitle: 공유 DB의 계정별 표 권한
  accDescr: media_indexer는 stream_segments와 세션 등 stream 표를 읽고 쓰고 지우며 순번 하한 표는 읽기만 한다. media_janitor는 stream 표를 읽고 조각의 local_path만 고친다. app_clip은 조각을 읽고 지우며 세션을 읽는다. app_chat_collector는 조각을 읽는다. app_chat_detector는 수집 서버가 준 권한으로 chat_messages를 읽는다.
  idx["media_indexer"] --> g1["stream_* 읽기 · 쓰기 · 지우기<br/>하한 표는 읽기만"]
  g1 ~~~ jan["media_janitor"]
  jan --> g2["stream_* 읽기<br/>조각의 local_path만 고침"]
  g2 ~~~ clip["app_clip"]
  clip --> g3["조각 읽기 · 지우기<br/>세션 읽기"]
  g3 ~~~ cc["app_chat_collector"]
  cc --> g4["조각 읽기"]
  g4 ~~~ cd["app_chat_detector"]
  cd --> g5["chat_messages 읽기<br/>표 주인 수집 서버가 줌"]
  style g1 fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

강조한 순번 하한 표는 10월 26일에 생겼고, `media_indexer`가 지우기 권한을 얻은 것도 그날입니다. 그 사이에 두 가지 문제가 먼저 나왔습니다.

## 서버마다 사용자를 따로 두고 남의 표 읽기는 표 주인이 줬습니다

Java 앱 서버 넷은 처음에 비밀번호 사용자 하나를 나눠 쓰는 안이었습니다. 팀원은 IAM 로그인으로 바꾸면서 서버마다 사용자를 따로 뒀습니다(PR #343, 10월 24일 병합). `app_auth`, `app_clip`, `app_chat_collector`, `app_chat_detector`가 각자 자기 표를 만듭니다.

서버 사이에 남의 표를 읽어야 하는 곳은 넷이었습니다. clip은 탈퇴 정리와 조각 조회로 `stream_segments`를 읽고 지우며 `stream_sessions`를 읽고, 수집 서버는 채팅 시각을 영상 위치로 바꾸려고 `stream_segments`를 읽고, 판별 서버는 수집 서버의 `chat_messages`를 읽습니다. 마지막 권한은 표 주인인 수집 서버의 마이그레이션(`V316`)이 줍니다. 운영 SQL이 미리 주려 해도 그때는 표가 없고, 「앞으로 만들 표 전부」에 기본 권한을 주면 수집 키 표(`chat_ingest_keys`)까지 판별 서버에 열리기 때문입니다(PR #343 본문). 서버마다 목록의 권한만 가진 역할로 빈 DB에서 서버를 띄워 보고, 한 줄씩 거두면 그 경로가 `42501`(권한 없음)로 실패하는지까지 시험이 확인합니다.

이때 정한 것 하나가 다음 절의 문제로 이어졌습니다. 서버마다 Flyway로 자기 표를 만들 수 있게, 앱 사용자 넷에 `public` 스키마의 CREATE를 줬습니다(PostgreSQL 15부터 `public` CREATE는 기본으로 막혀 있어 따로 줘야 합니다, [PostgreSQL 문서 — 스키마 사용 패턴](https://www.postgresql.org/docs/17/ddl-schemas.html#DDL-SCHEMAS-PATTERNS)).

## integer 인자 하나 때문에 잠금 호출이 public의 가짜 함수로 풀렸습니다

10월 24일 운영 런타임 PR의 종결 검수에서, 에이전트가 앱 계정의 `public` CREATE로 사이드카의 함수 호출을 가로챌 수 있음을 PostgreSQL 17에서 실측으로 확인했습니다([PR #365](https://github.com/3K-PokeClip/PokeClip-mono/pull/365) 본문). 사이드카는 스트림별 직렬화에 advisory 잠금을 썼습니다. advisory 잠금은 표가 아니라 숫자 하나에 거는 PostgreSQL 잠금입니다. 내장 `pg_advisory_xact_lock`은 bigint를 받는데, 사이드카는 integer 값을 넘기고 있었습니다.

PostgreSQL은 스키마를 붙이지 않은 함수 이름을 search_path에서 찾고, 같은 이름이 여럿이면 인자 형이 가장 잘 맞는 후보를 고릅니다([함수 형 변환 규칙](https://www.postgresql.org/docs/17/typeconv-func.html)). `public`에 integer를 받는 같은 이름의 함수가 있으면, 형 변환이 필요 없는 그 함수가 더 잘 맞는 후보가 됩니다. `pg_catalog`가 먼저 검색되는데도 가로채지는 이유입니다. 그 함수는 부른 세션의 신분, 곧 `media_indexer`로 실행됩니다. 같은 유형은 2018년 [CVE-2018-1058](https://wiki.postgresql.org/wiki/A_Guide_to_CVE-2018-1058:_Protect_Your_Search_Path)로 알려졌습니다.

영상의 위쪽이 가로채진 호출, 아래쪽이 고친 뒤의 호출입니다. 위쪽에서 화살표가 `pg_catalog`를 지나쳐 `public`의 함수로 가는 순간을 보십시오.

{{< motion scene="SearchPathHijack" id="fig-search-path-hijack" kind="개념도" caption="스키마를 붙이지 않은 pg_advisory_xact_lock(정수) 호출은 형 변환이 필요한 pg_catalog의 bigint 판 대신, 앱 계정이 public에 심은 integer 판을 고르고 media_indexer 신분으로 실행합니다. 호출에 pg_catalog를 붙이면 그 판만 후보가 되고, public 쓰기를 거두면 심을 자리도 없어집니다. 단계 길이는 설명용입니다." >}}

PR #365는 호출 쪽을 막았습니다. 사이드카 · janitor와 운영 SQL의 내장 함수 · 연산자 호출을 `pg_catalog`로 한정했습니다. 지금 사이드카의 잠금 문장은 `pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(…)::bigint)`입니다([`store.go` 229행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/store.go#L229)). 가짜 함수(덫)를 `public`에 심어 두고 사이드카 · janitor가 그 덫을 한 번도 부르지 않는지 보는 시험도 붙였습니다([`pgtest/searchpath.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/pgtest/searchpath.go)). 덫은 원래 결과를 그대로 돌려주고 불린 신분만 기록하므로, 시험 흐름을 멈추지 않고 기록이 0행인지로 판정합니다.

## 근본은 10월 24일 결정대로 앱 표를 서버별 스키마로 옮기는 것이었습니다

호출 쪽 한정은 모든 호출을 빠짐없이 고쳐야 버팁니다. Java 서버 쪽에도 `pg_advisory_xact_lock(hashtext(?))`처럼 같은 꼴의 맨 이름 호출이 있었습니다(PR #365 본문 「후속」). 그래서 PR #365에서는 호출 쪽만 막고, 앱이 `public`에 쓰지 못하게 하는 근본 정리는 따로 하기로 10월 24일 정했습니다([10월 24일 결정 기록](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/docs/decisions/2026-10-24-app-schemas.md)).

그 정리는 10월 26일 [PR #423](https://github.com/3K-PokeClip/PokeClip-mono/pull/423)으로 들어갔습니다. 서버마다 사용자 이름과 같은 스키마를 두고, 그 스키마의 주인은 마스터로 두어 앱에는 `USAGE, CREATE`만 줍니다. 앱 사용자 넷과 PUBLIC의 `public` CREATE를 거뒀고, DB 접속(CONNECT)도 PUBLIC에서 거둬 계정 여섯에만 줬으며, 임시 표 권한(TEMP)은 아무에게도 주지 않습니다([`10_roles.sql` 71–100행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/runtime/sql/10_roles.sql#L71-L100)). 앱의 세션 경로는 자기 스키마 하나이고, 남의 표는 `public.stream_segments`처럼 스키마를 붙여 읽습니다. 시험 DB도 운영과 같은 권한으로 만들고, 앱이 실제로 부르는 맨 이름 함수 둘에 덫을 심어 앱도 남이 심은 판을 고르지 않는지 잽니다(PR #423 본문).

거두지 않은 것도 있습니다. 내장 `pg_advisory_xact_lock(bigint)`의 실행 권한은 PUBLIC에 그대로 뒀습니다. `media_indexer`와 앱 사용자 넷(Flyway 직렬화 포함), 모두 다섯 계정이 그 함수를 씁니다. 거둔 뒤 다섯 계정에 다시 줘도 그 계정들이 사이드카의 잠금 열쇠를 잡을 수 있는 위협은 그대로이고, Flyway 판이 잠금 함수를 바꾸면 운영 부팅이 `42501`로 멈출 수 있습니다. 운영 SQL은 회수할 수 있는지만 확인하고 되돌립니다([`50_advisory_probe.sql` 1–15행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/runtime/sql/50_advisory_probe.sql#L1-L15)).

## 10월 26일 DELETE를 주면서 지운 순번 아래로 다시 쓰지 못하게 했습니다

권한 목록은 한 번 정하면 끝나는 것이 아니었습니다. 10월 26일 만료된 조각을 정리하는 일을 사이드카가 맡게 되면서, `stream_segments` 등 만료 대상 표에 DELETE를 줬습니다(컷오프 표에는 UPDATE · DELETE도). 근거는 [10월 26일 결정 기록](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/docs/decisions/2026-10-26-media-indexer-m6-delete-grants.md)과 [PR #440](https://github.com/3K-PokeClip/PokeClip-mono/pull/440)에 있습니다.

DELETE를 주면 지운 조각의 순번(seq)을 다시 쓸 위험이 생깁니다. 다시 쓰면 같은 영구 주소에 다른 조각이 실려, CDN에 1년 동안 캐시된 사본과 영원히 어긋납니다. 그래서 지운 조각의 최대 순번에 1을 더한 값을 스트림별 「다음 순번의 하한」으로 보존하는 표 `stream_seq_floors`와 트리거 둘을 뒀습니다. 하나는 지운 뒤 하한을 올리고, 하나는 새 순번이 하한 아래면 거부합니다. 사이드카는 다음 순번을 정할 때 하한과 비교한 큰 값을 한 문장으로 고릅니다. 하한은 앱이 아니라 DB가 지키므로, 지우는 쪽이 사이드카든 clip 서버의 탈퇴 정리든 같은 트리거가 하한을 올립니다.

## 하한을 올리는 정의자 함수는 PUBLIC 실행 권한을 거뒀습니다

하한을 올리는 함수는 지운 계정이 아니라 표 주인(`media_owner`)의 권한으로 돕니다. PostgreSQL에서 이런 함수를 `SECURITY DEFINER`(정의자 권한 함수)라고 합니다. 지우는 계정에게 하한 표 쓰기 권한을 따로 주지 않으려는 선택이었습니다.

PR #440의 커밋별 검수에서 보안 · 코드 · DB 검토가 함께 짚은 문제가 있었습니다. PostgreSQL은 새 함수의 실행 권한을 기본으로 PUBLIC에 엽니다([`CREATE FUNCTION` 문서](https://www.postgresql.org/docs/17/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)). 그래서 권한 없는 계정도 이 함수를 자기 표의 트리거로 붙일 수 있었고(검수의 재현은 임시 표), 그 트리거가 정의자 권한으로 돌며 남의 스트림 하한을 올릴 수 있었습니다.

함수의 PUBLIC 실행 권한을 거두고, 함수 안에서 트리거가 붙은 표가 `public.stream_segments`가 아니면 `42501`로 멈추게 했으며, 운영 검증 SQL이 회수 상태를 단언하게 했습니다. 트리거를 붙일 때는 실행 권한을 보지만([`CREATE TRIGGER` 문서](https://www.postgresql.org/docs/17/sql-createtrigger.html)) 트리거가 발화할 때는 보지 않으므로, 정상적으로 지우는 계정에는 영향이 없습니다.

남은 위험도 결정 기록에 적었습니다. `media_indexer`는 INSERT와 DELETE를 모두 가지므로, 큰 순번을 넣고 지워 자기 스트림의 하한을 올릴 수 있습니다. 정식으로 쓰는 주체라 신뢰 경계 안으로 봤습니다. 표 비우기(TRUNCATE)와 복제 모드는 트리거를 건너뛰지만, 사이드카 · 앱 계정에는 그 권한이 없습니다.

공유 DB에서는 로그인을 막는 것만으로 계정 사이가 갈리지 않았습니다. 다른 계정이 쓸 수 있는 스키마, 기본으로 열리는 함수 실행 권한, 맨 이름 호출이 고르는 후보까지 같이 보십시오. 이번에는 셋 다 기본값 그대로 둔 자리에서 문제가 나왔습니다.

## 측정 조건

- 10월 24일 search_path 가로채기: PostgreSQL 17 컨테이너에서 `public` CREATE를 받은 가짜 앱 사용자로 덫을 심고, 맨 이름 호출이 덫을 고르는지 봤습니다. AI 에이전트가 실행했습니다. 덫 목록은 그 실측에서 실제로 덫을 고른 꼴입니다(`pgtest/searchpath.go` 머리 주석).
- 10월 26일 정의자 함수 문제: PR #440의 커밋별 검수에서 CI와 같은 조건의 컨테이너로 재현했습니다. AI 에이전트가 실행했습니다.
- 서버별 권한 시험: 팀원이 서버마다 빈 PostgreSQL DB에 목록의 권한만 가진 역할을 만들어 확인했습니다(PR #343).
- 코드 · SQL 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일) 기준입니다. 운영 DB에 이 SQL이 적용된 상태는 이 글에서 확인하지 않았습니다.

## 출처

코드 · 결정 기록(공개 저장소 3K-PokeClip/PokeClip-mono)
- [PR #314](https://github.com/3K-PokeClip/PokeClip-mono/pull/314) — 사이드카 · janitor RDS IAM 인증과 `media_indexer` 첫 권한(2026-10-23 병합)
- [PR #343](https://github.com/3K-PokeClip/PokeClip-mono/pull/343) — 서버별 DB 계정과 권한 시험(2026-10-24 병합, 팀원)
- [PR #365](https://github.com/3K-PokeClip/PokeClip-mono/pull/365) — 운영 런타임 SQL, 내장 함수 호출 `pg_catalog` 한정과 가로채기 음성 대조 시험(2026-10-24 병합)
- [PR #423](https://github.com/3K-PokeClip/PokeClip-mono/pull/423) — 앱 서버별 스키마와 DB 권한 회수(2026-10-26 병합)
- [PR #440](https://github.com/3K-PokeClip/PokeClip-mono/pull/440) — 만료용 DELETE 권한, 순번 하한 표와 트리거, 정의자 함수 실행 권한 회수(2026-10-26 병합)
- [10월 24일 결정 기록 `2026-10-24-app-schemas.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/docs/decisions/2026-10-24-app-schemas.md) · [10월 26일 결정 기록 `2026-10-26-media-indexer-m6-delete-grants.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/docs/decisions/2026-10-26-media-indexer-m6-delete-grants.md)
- PokeClip-mono develop `825a3dfe` — [`prod/runtime/sql/30_grants.sql`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/runtime/sql/30_grants.sql) · [`10_roles.sql`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/runtime/sql/10_roles.sql#L71-L100) · [`50_advisory_probe.sql`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/runtime/sql/50_advisory_probe.sql#L1-L15) · [`media/internal/index/store.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/store.go#L229) · [`media/internal/pgtest/searchpath.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/pgtest/searchpath.go)

공식 문서
- PostgreSQL 17, [Function Type Conversion](https://www.postgresql.org/docs/17/typeconv-func.html) — 오버로드 함수 선택 규칙
- PostgreSQL 17, [Schemas — Usage Patterns](https://www.postgresql.org/docs/17/ddl-schemas.html#DDL-SCHEMAS-PATTERNS) — `public` 스키마 CREATE 기본값
- PostgreSQL 17, [CREATE FUNCTION — Writing SECURITY DEFINER Functions Safely](https://www.postgresql.org/docs/17/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY) — 정의자 함수와 PUBLIC 실행 권한
- PostgreSQL 17, [CREATE TRIGGER](https://www.postgresql.org/docs/17/sql-createtrigger.html) — 트리거를 붙일 때 필요한 권한
- PostgreSQL, [A Guide to CVE-2018-1058: Protect Your Search Path](https://wiki.postgresql.org/wiki/A_Guide_to_CVE-2018-1058:_Protect_Your_Search_Path)

이어지는 글
- [DB 비밀번호 대신 연결마다 RDS IAM 토큰을 만들었습니다](/posts/0-to-1/pokeclip-shared-db-auth-iam-tls/) — 로그인 쪽 결정 넷과 실측

---

[RDS IAM 인증 글로 돌아가기](/posts/0-to-1/pokeclip-shared-db-auth-iam-tls/)
