---
title: "운영 DB를 지우는 데 마스터 대신 일회용 계정을 썼습니다"
date: 2026-11-17T10:55:47+09:00
categories: ["projects"]
tags: ["PokeClip", "PostgreSQL", "RDS", "권한", "SET ROLE", "psql", "운영", "삭제"]
draft: false
author: "김태윤"
description: "v2를 새로 열기 전, 회원 계정은 남기고 그동안의 방송 데이터를 지웠습니다. 앱이 소유한 표를 마스터로 다루면 앱이 심은 트리거나 부분 색인 함수가 마스터 권한으로 돌 수 있어, 앱 소유 표를 지우고 세는 걸음에는 앱 역할에 들지 않고 표 권한만 받은 일회용 로그인을 썼습니다. 로컬 PostgreSQL 17 재측정으로 SET ROLE 경로의 권한 상승, 평범한 SELECT 한 번으로 마스터 전용 표에 쓰는 부분 색인 경로, 일회용 로그인의 DELETE 허용 · INSERT 거부 · 역할 바꾸기 거부, relacl 비가역, COMMIT 응답이 끊길 때 종료 코드 2, 셸 신호 종료 128+n 을 확인했습니다."
---

PokéClip v2 를 새로 연 서비스처럼 시작하려고, 운영 데이터베이스에서 **회원 계정은 남기고 그동안의 방송 데이터를 지웠습니다.** 지운 것은 방송 · 클립 · 채팅 · 되감기 조각 · 작업 큐 같은 범주이고, 남긴 것은 회원 계정과 장치 상태 넷입니다. 앱이 소유한 표(클립 · 채팅 · 회원 기준선)를 지우고 세는 걸음에는 데이터베이스 마스터 대신 한 걸음만 쓰고 버리는 일회용 로그인을 썼습니다. 미디어 장부는 로그인이 없는 소유 역할의 표이고 앱 계정이 그 표에 코드를 심을 권한이 없어, 마스터가 그 역할로 지웠습니다. 마스터로 앱 소유 표를 건드리면 앱이 심어 둔 트리거나 색인 함수가 마스터 권한으로 돌 수 있기 때문입니다.

범위 · 계정 방식 · 받아들일 한계는 제가 정했습니다. 실행 중 승인 게이트는 저에게 묻지 말고 진행하라고 위임했고, 에이전트는 이를 문서의 판정 조건이 그대로 맞을 때만 게이트를 통과하는 것으로 해석해 실행했습니다. 문서 작성 · 리뷰 · 실제 실행은 AI 에이전트(Claude Code 와 Codex)가 맡았습니다.

## v2를 새로 열기 전에 방송 데이터를 지우고 회원 계정은 남겼습니다

지우는 기준은 시각이나 회차가 아니라 **범주**입니다. 회원이 만든 방송에서 나온 것은 전부 지우고, 회원 자체와 장치가 다음 방송을 바르게 열기 위한 상태는 남겼습니다.

| 남긴 것 | 왜 |
|---|---|
| 회원 계정 · 연결 계정 · 스트림 키 · 프로필 | v2 는 새 서비스가 아니라 같은 회원이 다시 방송하는 자리 |
| 장치 상태 넷(판 게이트 · 래치 · 만료 스위치 · 조각 번호 바닥) | 지우면 방송 판이 이전 상태로 돌아가거나, 조각 번호가 다시 쓰여 CDN 에 남은 옛 조각이 새 방송 자리에 나갈 수 있음 |
| 유튜브에 올라간 영상 | 우리 저장소 밖이라 삭제 범위 아님 |
| RDS 스냅숏(보존 30일) | 되돌릴 유일한 길. 되감기 버킷은 버전 관리가 없어 지우면 복구 불가 |

| 지운 것(범주) | 담긴 곳 |
|---|---|
| 방송 · 클립 · 썸네일 · 렌더 작업 | 애플리케이션 DB 표 |
| 채팅 메시지 · 방송 정보 · 수집 키 | 채팅 DB 표 |
| 되감기 조각 · 세션 · 컷오프 · 발행 빈자리(GAP) · 생명주기 전달(outbox) | 미디어 장부 표 |
| 조각 · 되감기 목록 · VOD 문서 · 클립 · 채팅 원본 | S3 버킷 |
| 렌더 · 썸네일 · 업로드 큐와 각 DLQ | 메시지 큐 |

조각 번호 바닥을 남기는 이유는 특히 분명합니다. 조각과 초기화 세그먼트는 1년짜리 `immutable` 캐시 지시로 올라가므로([MDN — Cache-Control `immutable`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#immutable)), 같은 번호를 다시 쓰면 그 번호의 옛 주소를 쥔 CDN과 브라우저 캐시가 옛 조각을 낼 수 있습니다. 바닥을 남기면 새 방송의 번호가 늘 바닥 위에서 시작해 옛 주소와 겹치지 않습니다. 실제로 삭제 뒤 첫 새 방송은 조각 번호 8819(그 스트림의 바닥)에서 시작했습니다.

삭제는 순서가 있고, 그 순서에는 **첫 비가역 지점**이 있습니다. 새 방송을 막고 서비스를 멈추고 앱 로그인을 닫고 다시 세고 스냅숏을 뜨고 키 목록을 나르는 데까지는 되돌릴 수 있습니다(재가동 · 차단 해제로 원위치). 작업 큐를 비우는 걸음부터는 스냅숏에 없는 메시지가 사라지므로, 앞으로 끝내거나, 제가 스냅숏 복원을 정하는 두 길뿐입니다. 장부 조각 삭제를 커밋한 뒤로는 앞으로 끝내는 길만 남깁니다. 지운 조각 행을 다시 넣으려 해도 번호 바닥 검사와 쓰기자 거부 트리거가 둘 다 막기 때문입니다.

```mermaid {#fig-order kind="개념도" caption="차단 · 정지 · 재셈 · 스냅숏 · 운반까지는 되돌릴 수 있고, 작업 큐를 비우는 걸음(강조)부터 앞으로만 갑니다. 그 뒤 전달 상자 · 클립 · 채팅 · 녹화 · 되감기 키 · 장부를 차례로 지우고 재기동 · 재가동 · 차단 해제 · 첫 새 방송으로 끝납니다. 순서는 실행 기록의 걸음 시각대로입니다." source="https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-prod-data-wipe-throwaway-login/measurements.md#걸음-순서"}
flowchart TB
  accTitle: 삭제 실행의 걸음 순서와 첫 비가역 지점
  accDescr: 차단과 서비스 정지, 앱 로그인 닫기와 큐 재셈, 스냅숏과 키 목록 운반까지는 되돌릴 수 있다. 작업 큐와 DLQ 를 비우는 걸음이 첫 비가역이고, 그 뒤 전달 상자 삭제, 클립 DB 표와 S3 클립 키 삭제, 채팅 DB 표와 S3 채팅 키 삭제, 녹화 비우기와 S3 되감기 키 삭제와 장부 삭제, 사이드카 재기동과 엣지 무효화, 다시 세기와 재가동과 차단 해제, 첫 새 방송으로 끝난다.
  A[새 방송 차단 · 서비스 정지] --> B[앱 로그인 닫기 · 큐 재셈]
  B --> C[RDS 스냅숏 · 키 목록 운반<br/>— 여기까지 되돌릴 수 있음]
  C --> E[작업 큐 · DLQ 비우기<br/>— 첫 비가역]
  E --> O[전달 상자 행 삭제]
  O --> F[클립 DB 표 · S3 클립 키 삭제]
  F --> S[채팅 DB 표 · S3 채팅 키 삭제]
  S --> L[녹화 비우기 · S3 되감기 키 삭제 ·<br/>장부 삭제]
  L --> G[사이드카 재기동 · 엣지 무효화]
  G --> H[다시 세기 · 재가동 · 차단 해제]
  H --> I[첫 새 방송 — 번호 바닥에서 시작]
  classDef accent fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  class E accent
```

## 실행할 파일 전부를 sha256 승인 목록 하나로 묶었습니다

제가 승인한 것은 개별 명령이 아니라 **실행에 쓸 모든 파일과 SQL 블록의 sha256 을 한 표로 모은 목록 하나**입니다. 실행 직전에 에이전트가 실물 파일의 sha256 이 이 목록과 같은지 보고, 다르면 보내지 않고 저에게 올립니다. 판이 바뀌면 그 행을 다시 고정해 다시 승인합니다.

이 묶음에는 한 가지 성질이 따라옵니다. **승인한 파일에 한 줄만 덧붙여도 그 파일은 승인 밖이 됩니다.** sha256 은 파일 전체를 지문으로 삼으므로, 주석 한 줄을 고친 판도 다른 지문이 되어 다시 승인받아야 합니다. 실제로 실행이 끝난 뒤 인용 줄 번호만 고친 판이 생겼는데, 그 판은 실행에 쓰인 판과 다른 지문이라 실행 기록에는 들어가지 않았습니다. 삭제가 권한에 막히면 다른 명령으로 우회하지 않고 멈추고 보고한다는 규칙도 같은 원칙입니다. 승인한 것만 그대로 실행합니다.

## 마스터가 앱 역할로 표를 만지면 앱 코드가 마스터 권한으로 돕니다

RDS 마스터는 역할을 만들고 권한을 주는 가장 넓은 권한을 가지지만 슈퍼유저는 아닙니다(`NOSUPERUSER` — [AWS — rds_superuser 역할](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Roles.rds_superuser.html)). PostgreSQL 에서 권한 검사를 건너뛰는 것은 슈퍼유저뿐이라([역할 속성](https://www.postgresql.org/docs/17/role-attributes.html)), 마스터도 남의 표에는 그 표의 권한으로만 닿습니다. 운영 마스터는 앱 표에 직접 권한도, 앱 역할 멤버십도 없었습니다. 실행 전 앱 역할에 든 멤버는 0명이었고, 앱 표 · 시퀀스 45개의 relacl 은 NULL, 곧 소유자인 앱 역할만 권한을 가진 상태였습니다. 그래서 마스터가 앱 표에 닿으려면 스스로 앱 역할을 받아 `SET ROLE` 해야 합니다. 이번 작업은 그 부여를 일회용 계정을 만드는 같은 `psql -1` 안에서만 하고 끝에서 거뒀습니다. 이 꼴로 마스터가 앱 표를 직접 지우거나 세면 **앱이 심어 둔 코드가 마스터 권한으로 돌 수 있습니다.**

PostgreSQL 에서 보통(SECURITY INVOKER) 함수는 그 함수를 소유한 역할이 아니라 **질의를 실행하는 역할의 권한으로** 돕니다([CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html)). DELETE 가 깨우는 트리거 함수도 그렇습니다. 마스터가 `SET ROLE app_x` 로 앱 표를 지우면 현재 사용자는 앱 역할이지만 세션 사용자는 마스터로 남습니다. 트리거 안의 `RESET ROLE` 은 (연결 때 정한 role 설정이 없으면) 세션 사용자로 돌아가고, `SET ROLE` 권한 검사도 현재 사용자가 아니라 세션 사용자로 합니다([SET ROLE](https://www.postgresql.org/docs/17/sql-set-role.html)). 그래서 위험은 `RESET ROLE` 하나보다 넓습니다. 앱이 심은 코드는 **세션 사용자(마스터)가 SET 할 수 있는 모든 역할**로 옮겨 갈 수 있습니다.

색인 함수도 같은 길이 됩니다. 조건이 붙는 위치에 따라 계산되는 때가 다릅니다.

- 인자 없는 `IMMUTABLE` 함수를 조건으로 쓴 부분 색인은 플래너가 그 조건을 상수로 접으면서 함수를 실행자 권한으로 실행합니다([부분 색인](https://www.postgresql.org/docs/17/indexes-partial.html), [함수 변동성 분류](https://www.postgresql.org/docs/17/xfunc-volatility.html)). 이 실험의 조건 함수(늘 참을 돌려줌)는 같은 연결 안에서도 SELECT · DELETE · UPDATE 를 계획할 때마다 한 번씩 돌았고, 행을 바꾸는 UPDATE 에서는 한 번 더 돌았습니다.
- 이 실험의 열 인자 식 색인 함수는 INSERT · UPDATE 때와 색인을 만들 때 실행됐고, DELETE · SELECT 에서는 실행되지 않았습니다([식 색인](https://www.postgresql.org/docs/17/indexes-expressional.html)).
- `IMMUTABLE` 함수 안에서는 INSERT 를 직접 못 하지만, 그 함수가 `VOLATILE` 함수를 부르면 그 함수는 쓸 수 있습니다. `SET ROLE` 중이라도 그 함수가 `RESET ROLE` 로 세션 사용자(마스터)가 되어 쓰고 원래 역할로 되돌려 놓으면, 바깥 질의는 그대로 지나 함께 커밋됩니다.

로컬 PostgreSQL 17.10 에서 일반화한 역할로 다시 쟀습니다. `master_x` 는 마스터 대역(NOSUPERUSER · CREATEROLE)이고, 운영처럼 앱 표에 직접 권한이 없어 스스로 `app_x` 를 받아 `SET ROLE` 해야 앱 표에 닿습니다. `app_x` 는 스키마 `app_x` 와 표 · 트리거 · 색인을 소유한 앱 역할, `other_x` 는 마스터가 늘 SET 할 수 있는 다른 역할, `master_only` 는 마스터만 쓰는 영역입니다.

| 경로(모두 `SET ROLE app_x` 상태) | 관측 | 뜻 |
|---|---|---|
| DELETE → 앱 소유 트리거 | 진입 `current_user=app_x session_user=master_x` | 세션 사용자는 마스터 |
| 트리거 안 `SET ROLE other_x` | 성공 `current_user=other_x` | 마스터가 SET 할 수 있는 다른 역할로 옮겨 감 |
| 트리거 안 `RESET ROLE` → 마스터 전용 영역 INSERT | `current_user=master_x` · 성공 | 앱 코드가 마스터 권한 행사 |
| 같은 시도를 `SECURITY DEFINER` 함수 안에서 | `cannot set parameter "role" within security-definer function` | DEFINER 함수 안에서는 역할을 못 바꿈 |
| 같은 시도를 색인을 만드는 동안(보안 제한 작업 안) | `cannot set parameter "role" within security-restricted operation` | 색인 생성 중에도 못 바꿈 |
| 앱 소유 `SECURITY DEFINER` 트리거 | `current_user=app_x` 로 돌아 앱 표에 쓰기 성공, 마스터 전용 영역은 거부 | 소유자인 앱의 권한으로 돎 |
| INSERT · UPDATE → 식 색인 함수 | 실행됨(`session_user=master_x`) | DELETE · SELECT 에서는 실행 안 됨 |
| 부분 색인 표를 `SELECT count(*)` 또는 DELETE | 계획 단계에서 `gate()` 가 돌고, 부른 `VOLATILE` 함수가 `RESET ROLE` 로 `master_x` 가 되어 마스터 전용 표에 INSERT 한 뒤 역할을 되돌림 → 질의와 INSERT 모두 커밋 | 평범한 SELECT · DELETE 한 번으로 마스터 권한 쓰기 |
| 같은 연결에서 SELECT 세 번 · DELETE · UPDATE | `gate()` 누적 호출 1 → 2 → 3 → 4 → 5 | 계획할 때마다 실행(이 실험의 조건) |
| 같은 꼴에서 역할을 되돌리지 않는 함수 | 바깥 질의가 `master_x` 로 권한 검사를 받아 `permission denied for table` → INSERT 도 함께 되돌려짐 | 함수가 한 줄을 더 쓰면 피해 감 |
| 부분 색인 표 SELECT 를 `BEGIN READ ONLY` 안에서 | 함수는 돌고, INSERT 는 `cannot execute INSERT in a read-only transaction` | 쓰기만 막히고 실행은 그대로 |
| GRANT · REVOKE 만 | 앱의 DML 트리거 · 식 색인 · 부분 색인 함수 모두 깨어나지 않음(마스터 전용 표 3줄 → 3줄) | 이 실험의 범위에서는 앱 코드를 깨우지 않음 |

전제는 실측과 일치했습니다. 역할 바꾸기는 `SECURITY DEFINER` 함수 안과 색인 생성 같은 보안 제한 작업 안에서 막히지만, 함수를 어떤 꼴로 만들지는 함수를 만드는 앱이 정합니다. 앱이 보통 함수로 만들면 그만이라 방어가 되지 못합니다. 앱 소유 `SECURITY DEFINER` 함수는 이와 별개로 누가 부르든 소유자인 앱의 권한으로 돕니다. READ ONLY 트랜잭션도 쓰기만 막을 뿐, 앱 함수가 마스터 신분으로 읽고 로그를 남기는 것은 막지 못합니다.

## 앱 역할에 들지 않는 일회용 로그인으로 지웠습니다

그래서 앱 소유 표를 지우고 세는 신분을 **한 걸음만 쓰고 버리는 일회용 로그인**으로 했습니다. 막는 핵심은 **세션 사용자가 일회용 로그인이라는 점**입니다. `RESET ROLE` 은 (연결 때 정한 role 설정이 없으면) 세션 사용자로 돌아가므로 보통 트리거가 돌아갈 곳은 일회용 계정 자신뿐입니다. 이 계정은 어느 역할의 멤버도 아니라서, 트리거가 `SET ROLE` 로 다른 역할로 옮겨 가려 해도 거부됩니다.

일회용 로그인은 INVOKER 함수가 `RESET ROLE` · `SET ROLE` 로 마스터 권한을 얻는 길을 막습니다. 앱 소유 `SECURITY DEFINER` 함수는 소유자 권한으로 돌기 때문에, 이 방식이 막는 범위 밖입니다. 로컬에서 일회용 계정이 DELETE 로 깨운 앱 소유 DEFINER 트리거는 `current_user=app_x` 로 돌아, 일회용 계정이 직접은 쓸 수 없는 앱 표에 줄을 넣었습니다. 마스터로 지울 때도 같은 트리거가 똑같이 앱 권한으로 돌았으니, DEFINER 함수의 위험은 두 경로에 공통입니다. 두 경로 모두 그 트리거가 마스터 전용 영역에 쓰는 것은 거부됐습니다.

{{< motion scene="TwoDeletePaths" id="fig-two-paths" kind="개념도" caption="같은 DELETE 를 두 신분으로 했을 때입니다. 마스터로 지우면 앱의 보통 트리거가 RESET ROLE 로 마스터로 돌아가 권한이 상승하고, 일회용 로그인으로 지우면 표 권한만으로 지워지고 INSERT 는 거부되며 보통 트리거가 돌아갈 곳은 일회용 계정뿐입니다. 앱 소유 SECURITY DEFINER 함수는 두 경로 모두 앱 권한으로 돕니다." >}}

- 어느 역할의 멤버도 아님.
- 지울 표의 `SELECT` · `DELETE` 만 직접 GRANT.
- 비밀번호는 실행 상자 안에서 만들어 셸 변수로만 들고, 서버에는 SCRAM 검증값을 넘김. 이미 암호화된 꼴의 값은 서버가 그대로 저장하므로 문장 로그에 평문이 남지 않습니다([CREATE ROLE](https://www.postgresql.org/docs/17/sql-createrole.html)).
- 한 시간짜리 `VALID UNTIL`, `CONNECTION LIMIT 1`. `VALID UNTIL` 은 비밀번호 로그인만 막고 이미 열린 세션은 끊지 않으므로, 끝에 세션이 닫히기를 기다립니다.
- 일을 마치면 로그인을 닫고, 권한을 거두고, 지웁니다.

이 걸음으로 마스터에게 새로 남는 권한은 없습니다. GRANT 에 필요한 앱 역할 멤버십은 같은 트랜잭션 안에서 받고 거둡니다. 이 실험의 GRANT · REVOKE 는 앱의 DML 트리거와 색인 함수를 깨우지 않았습니다(위 표 마지막 줄). 객체 GRANT · REVOKE 는 이벤트 트리거를 깨울 수 있지만([이벤트 트리거 발화 표](https://www.postgresql.org/docs/17/event-trigger-matrix.html)), 이벤트 트리거는 PostgreSQL 에서 슈퍼유저만 만들 수 있고([CREATE EVENT TRIGGER](https://www.postgresql.org/docs/17/sql-createeventtrigger.html)) RDS 에서는 마스터 사용자가 만듭니다([AWS — RDS 이벤트 트리거](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.EventTriggers.html)). 앱 역할이 심는 코드라는 이 위협 모델 밖입니다.

같은 꼴을 로컬에서 재현했습니다. 접속은 SCRAM 인증만 받게 했습니다(`require_auth=scram-sha-256`).

| 항목 | 값 |
|---|---|
| `oneoff_x` 의 멤버십 · 커밋 뒤 마스터의 앱 역할 SET · INHERIT 멤버십 | 0 · 0 |
| 저장된 비밀번호 꼴 | SCRAM 검증값 |
| 표 권한(`has_table_privilege`) | SELECT `t` · DELETE `t` · INSERT `f` · UPDATE `f` |
| DELETE | 성공(`DELETE 1`) |
| INSERT | 거부(`permission denied for table table_a`) |
| DELETE 가 깨운 트리거의 `SET ROLE other_x` · `SET ROLE app_x` | 둘 다 `permission denied to set role` |
| 트리거의 `RESET ROLE` 착지점 → 마스터 전용 영역 INSERT | `current_user=oneoff_x` → 거부 |
| 부분 색인 표 SELECT | `gate()` 가 `oneoff_x` 로 돌고, `RESET ROLE` 뒤에도 `oneoff_x` 라 마스터 전용 영역 INSERT 거부 |
| 같은 DELETE 가 깨운 앱 소유 DEFINER 트리거 | `current_user=app_x` 로 앱 표에 INSERT 성공(일회용 계정의 직접 INSERT 는 거부) · 마스터 전용 영역은 거부 |
| 두 번째 동시 연결 | `too many connections for role "oneoff_x"` |
| `VALID UNTIL` 이 지난 뒤 비밀번호 로그인 | `password authentication failed` |
| 권한을 거두기 전 `DROP ROLE` | 거부(권한이 남아 있음) → 회수 뒤 성공 |

**앱 소유 표를 세는 읽기도 일회용 계정으로** 했습니다. 위 부분 색인 경로 때문입니다. 이미 심어 둔 부분 색인이면 잠금과 상관없이 계획 단계가 그 조건 함수를 실행합니다. 아직 없더라도, 읽기가 잡는 `ACCESS SHARE` 잠금은 색인 생성이 잡는 잠금과 충돌하지 않아 앱이 그 사이 만들 수 있습니다([명시적 잠금 — 표 수준 잠금](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-TABLES)). 일회용 계정이면 그 보통 함수가 돌아도 일회용 계정의 권한에 머뭅니다.

## 종료 코드로 커밋됨 · 되돌려짐 · 불명을 갈랐습니다

삭제 한 걸음은 `psql -X -1 -v ON_ERROR_STOP=1 -f` 한 흐름으로 돌립니다. `-1` 이면 psql 이 파일 앞뒤에 BEGIN 과 COMMIT 을 붙입니다. 끝난 뒤에 무엇을 지웠는지 판정해야 하는데, 이때 믿을 수 있는 신호는 **종료 코드**입니다. 그런데 종료 코드만으로는 갈라지지 않는 경우가 둘 있어서, 그 둘을 「불명」 으로 따로 두고 새 읽기로 다시 세어 확정했습니다.

첫째는 `psql` 이 COMMIT 을 보낸 뒤 그 응답을 받기 전에 연결이 끊기는 경우입니다. 이때 **서버는 이미 커밋했는데** `psql` 은 연결 오류로 끝나 종료 코드가 2 입니다. 로컬에서 COMMIT 응답만 떨어뜨리는 TCP 프록시로 재현했습니다. 프록시는 서버가 보낸 `CommandComplete(COMMIT)` 를 본 순간, 곧 서버가 커밋을 마친 뒤([프로토콜 흐름](https://www.postgresql.org/docs/17/protocol-flow.html)) 그 응답을 클라이언트로 보내지 않고 끊습니다.

| 꼴 | `psql` | 재접속해 센 결과 |
|---|---|---|
| `psql -X -1 -v ON_ERROR_STOP=1 -f` (DELETE 한 줄) | `server closed the connection unexpectedly` · 종료 **2** | 지운 대상 행이 남은 수 0 — 서버가 DELETE 를 커밋했음 |
| `psql -X -c 'BEGIN; DELETE …; COMMIT;'` | 같음 · 종료 **2** | 같음 |

종료 코드 2 는 「되돌려짐」 이 아니라 「불명」 입니다([psql 종료 상태](https://www.postgresql.org/docs/17/app-psql.html)). 되돌려짐이 보장되는 것은 `ON_ERROR_STOP` 으로 멈춰 트랜잭션이 ROLLBACK 되는 종료 3 뿐이고, 커밋됨은 종료 0 뿐입니다. 그 밖(1 · 2 · 신호)은 전부 새 읽기로 건수를 세어 확정합니다.

둘째는 셸 자체가 신호로 죽는 경우입니다. 셸은 단계를 변수로 들고 종료 코드를 정하지만, 셸(bash)이 신호 n 으로 죽으면 부모 bash · `docker exec` 가 받는 종료 상태는 그 규칙 밖인 **128 + n** 입니다(원격 실행기는 도구마다 확인 필요 — [bash — 종료 상태](https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html)).

| 관측 | 부른 쪽이 받은 값 |
|---|---|
| `bash -c 'kill -TERM $$'` | **143** (= 128 + 15) |
| `bash -c 'kill -HUP $$'` | **129** (= 128 + 1) |
| `bash -c 'kill -KILL $$'` | **137** (= 128 + 9) |
| 자식 `psql` 이 도는 중에 부모 bash 를 SIGTERM | **143**, 자식 `psql` 은 끝까지 돌아 3초 뒤 역할을 만들어 남김(자식이 앞에서 돌 때와 뒤에서 돌 때 모두) |

마지막 줄이 중요합니다. 부모 셸이 죽어도 자식 `psql` 은 함께 죽지 않고 끝까지 돌아, 만들던 일회용 계정을 남길 수 있습니다. 그래서 종료 코드가 128 이상이면 표 값으로 읽지 않고, 계정이 남았는지 잔여 검사로 보고, 통과하기 전에는 다음 걸음을 보내지 않습니다. 만들기 트랜잭션에는 시한 셋(잠금 5초 · 한 문장 30초 · 트랜잭션 60초)을 걸어 고아가 된 `psql` 도 스스로 끝나게 하고, 잔여 검사는 2분 넘는 간격을 두고 두 번 통과시킵니다.

처음에는 고아 세션을 **끊는** 파일을 두었는데, 없앴습니다. 세션을 고르는 조건(이름표 정규식 · 마스터 · 자기 제외)만으로는 같은 마스터로 접속한 **다른 세션**까지 끊을 수 있고, 세션 이름표는 아무나 정할 수 있어 이름표를 흉내 낸 세션까지 골라 버립니다. 트랜잭션 시한이 고아의 수명을 이미 묶으므로, 끊지 않고 기다리는 쪽으로 바꿨습니다.

## 권한 칸(relacl)은 한 번 부여하면 빈칸으로 돌아오지 않습니다

일회용 계정에 권한을 준 표(지울 표와 세기만 한 표)의 relacl 이 바뀝니다. PostgreSQL 은 표마다 권한 목록을 relacl 칸에 적는데, 이 칸이 NULL 이면 「소유자 기본 권한」 을 뜻하고, 한 번이라도 GRANT 나 REVOKE 를 하면 명시값이 됩니다([권한](https://www.postgresql.org/docs/17/ddl-priv.html)). 접근 판정은 같아도 GRANT · REVOKE 로는 NULL 로 돌아갈 길이 없습니다. 카탈로그를 직접 고치는 길은 슈퍼유저 몫이라 RDS 마스터에게는 없습니다. 일회용 계정을 처음 만들고 지우는 걸음이 이 표들의 relacl 을 영구히 바꾼다는 뜻이라, 이 비가역을 받아들이고 바뀐 표 · 시퀀스 목록을 기록으로 남기기로 했습니다. 운영에서 그 걸음은 삭제 창을 열기 전의 마른 실행(08:26–08:27)이었습니다.

로컬에서 확인했습니다.

| 단계 | relacl |
|---|---|
| 처음(권한 0) | NULL |
| DELETE 를 GRANT | `{app_x=arwdDxtm/app_x,probe_grantee=d/app_x}` |
| 같은 권한을 REVOKE · 받은 역할을 DROP | `{app_x=arwdDxtm/app_x}` (NULL 아님) |
| 준 적 없는 권한을 REVOKE 만 한 표 | `{app_x=arwdDxtm/app_x}` (NULL 아님) |
| 마스터 대역이 `pg_class` 를 직접 UPDATE | `permission denied for table pg_class` |

창을 열기 전 마른 실행(08:26–08:27) 첫 호출의 relacl 보고는 만들 때 13개, 지울 때 32개, 합쳐 45개(표 36개 · 시퀀스 9개)였습니다. 지울 때의 32개에는 권한을 준 적 없이 회수만 한 표도 들어 있습니다. 이론상 46개여야 했는데 45개인 까닭은, 직전에 돈 다른 작업이 한 표의 relacl 을 먼저 명시값으로 바꿔 두었기 때문입니다. 이미 명시값인 표는 이 걸음이 바꾸지 않아 목록에서 빠집니다. 막는 조건은 바뀐 표 목록이 기록에 남는가이지 그 수가 아니라, 45 든 46 이든 실행은 멈추지 않습니다.

같은 RDS 의 로그인 · 권한 설계는 [RDS IAM 토큰 글](/posts/0-to-1/pokeclip-shared-db-auth-iam-tls/)과 [로그인 뒤 권한 · 함수 가로채기 글](/posts/0-to-1/pokeclip-shared-db-login-privileges/)에 있습니다.

## 77분 창 안에서 지우고 다시 세기 0을 확인했습니다

삭제는 2026-11-17 아침에 끝냈습니다. 새 방송을 막은 08:34 부터 차단을 해제한 09:51 까지 77분이 실행 창이고, 첫 새 방송은 그 뒤 09:54–09:59 에 관찰용으로 열었습니다. 걸음별로 지운 수는 비공개 실행 기록에서 식별자를 빼고 [실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-prod-data-wipe-throwaway-login/measurements.md)에 옮겼습니다.

| 묶음 | 지운 수 | 신분 |
|---|---|---|
| 미디어 장부 조각 | 9,353 | 마스터(장부 소유 역할로) |
| 발행 빈자리(GAP) · 컷오프 · 세션 | 74 · 3 · 46 | 마스터(장부 소유 역할로) |
| 생명주기 전달(outbox) 행 | 64 | 마스터(장부 소유 역할로) |
| 애플리케이션 DB(방송 · 클립 · 썸네일 등 12표) | 방송 40 · 썸네일 55 · 그 밖 177(12표 합 272) | 일회용 계정 |
| 채팅 DB(메시지 · 방송 정보 · 수집 키 등) | 197 | 일회용 계정 |
| S3 되감기 키 | 18,810 | DB 밖 |
| S3 클립 키 · 채팅 키 | 68 · 12 | DB 밖 |
| 작업 큐 · DLQ | 큐 6개 비움 | DB 밖 |

검증은 지운 쪽 다시 세기가 전부 0, 회원 기준선(회원 6 · 갱신 토큰 301 · 스트림 키 3 등) 불변, 권한 서명 삭제 전후 같음, 남은 일회용 계정 0 이었습니다. 15분 뒤 한 번 더 세어도 같았고, 재가동 뒤 최종 검증도 통과했습니다. 두 상자에서 각 여섯 서비스를 다시 띄워 사이드카 메모리를 데이터베이스와 맞춘 뒤, 첫 새 방송이 번호 바닥에서 시작하는 것을 확인했습니다.

## 되돌릴 길은 30일짜리 스냅숏 하나만 남겼습니다

되돌릴 길로 남긴 것은 **RDS 스냅숏 하나**입니다. 삭제 창 안에서 뜬 수동 스냅숏이라 저절로 지워지지 않고([DB 스냅숏 만들기](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateSnapshot.html)), 30일 뒤인 12월 17일에 손으로 지울 예정입니다. 그 전까지는 이 스냅숏이 유일한 복원 경로입니다.

남은 일이 둘 있습니다. 하나는 채팅 수집기를 방송 상자에서 떼는 동작을 다음 실방송 종료 때 관찰하는 것이고, 다른 하나는 같은 스트림 키가 두 상자에 겹쳐 송출되는 것을 코드로 막는 설계입니다. 뒤엣것은 방송 회차를 녹화한 상자에 묶어 다른 상자의 조각이 붙지 않게 하는 방향인데, 상자를 바꿀 때 회차가 재접속 창 안에서 다른 상자로 정상적으로 이어지는 경로가 있는지부터 확인해야 해서 교체 절차와 함께 정합니다.

운영 데이터를 지우는 일에서 가장 오래 고민한 것은 무엇을 지우느냐가 아니라 **누구의 신분으로 지우느냐** 였습니다. 마스터는 가장 쉬운 선택이지만, 앱이 소유한 표를 건드리는 순간 앱이 심은 코드에 마스터 권한을 빌려주는 길이 열립니다. 비슷한 일을 한다면, 지우는 신분의 세션 사용자가 지울 표의 권한만 가지고 다른 역할로 옮겨 갈 수 없는지부터 확인하십시오. 그 표에 앱 소유 SECURITY DEFINER 함수가 걸려 있는지도 함께 보십시오. 그 함수는 누가 지우든 앱 권한으로 돕니다.

## 측정 조건

- **운영 실행 수치(비공개 기록 요약).** 2026-11-17 KST. 실행 기록에서 계정 · 상자 · 주소 · 세션 식별자와 내부 처분 기호를 빼고 수치 · 판정만 [실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-prod-data-wipe-throwaway-login/measurements.md)에 옮겼습니다. 공개 링크로 재현할 수 없는 비공개 기록입니다.
- **공개 재측정.** Apple 실리콘 MacBook, macOS 27.0.1, Docker 29.8.2(OrbStack), `postgres@sha256:a426e44bac0b759c95894d68e1a0ac03ecc20b619f498a91aae373bf06d8508d`(서버 17.10, 컨테이너 bash 5.2.37), psql 17.10, 호스트 bash 3.2.57. 프록시는 `python:3.13-slim`(Python 3.13.18). AI(Claude Code)가 2026-11-17 12:17 KST 에 실행했습니다(한 번). `measure/` 폴더에서 `./run.sh` 로 돌립니다(bash · Docker · python3 · openssl 필요). 라벨 `com.techblog.bench=wipe-oneoff` 를 붙인 컨테이너 · 망과 `/tmp/wipe-*` 만 쓰고, 끝나거나 중간에 멈춰도 라벨로 고른 자원을 지웁니다.
- **비밀값.** 비밀번호는 실행마다 `openssl rand -hex 16` 으로 만들어 컨테이너 환경 변수와 `PGPASSFILE` 로 넘기고, 컨테이너와 함께 지웁니다. 호스트에는 실행하는 동안만 `/tmp/wipe-run/pgpass`(0600)로 두었다가 지웁니다. 명령 줄에는 값을 쓰지 않고 환경에서 상속합니다. 저장소의 `raw/` 에는 남지 않습니다. 공식 이미지는 루프백 연결을 비밀번호 없이(trust) 받으므로, 접속은 컨테이너 망 이름으로 하고 `require_auth=scram-sha-256` 을 붙였습니다.
- **일반화.** `master_x`(RDS 마스터 대역 · NOSUPERUSER · CREATEROLE · BYPASSRLS 없음), `app_x`(앱 역할), `other_x`(마스터가 늘 SET 할 수 있는 역할), `master_only`(마스터 전용 영역). 운영처럼 마스터에게는 앱 표 권한을 주지 않았고(앱 표 relacl 은 NULL), 앱 표에는 같은 트랜잭션 안에서 스스로 `app_x` 를 받아 `SET ROLE` 해야 닿습니다. 로컬 모델에서는 `app_x` 를 마스터가 만들었으므로 만든 쪽이 받는 ADMIN 옵션이 마스터에게 남습니다.
- **COMMIT 응답 끊김.** 서버가 보낸 `CommandComplete(COMMIT)` 를 본 순간 그 응답을 떨어뜨리는 TCP 프록시(`proxy_commitdrop.py`, 전용 망 안의 컨테이너)로 재현했습니다. 커밋은 서버에서 이미 끝난 뒤입니다.

## 출처

PostgreSQL 17 문서
- [SET ROLE](https://www.postgresql.org/docs/17/sql-set-role.html) — `RESET ROLE` 은 세션 사용자로 · SET ROLE 권한 검사는 세션 사용자로 · SECURITY DEFINER 함수 안에서는 못 씀
- [CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html) — 기본은 SECURITY INVOKER · [함수 변동성 분류](https://www.postgresql.org/docs/17/xfunc-volatility.html)
- [부분 색인](https://www.postgresql.org/docs/17/indexes-partial.html) · [식 색인](https://www.postgresql.org/docs/17/indexes-expressional.html) · [명시적 잠금 — 표 수준 잠금](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-TABLES)
- [CREATE EVENT TRIGGER](https://www.postgresql.org/docs/17/sql-createeventtrigger.html) — 슈퍼유저만 · [이벤트 트리거 발화 표](https://www.postgresql.org/docs/17/event-trigger-matrix.html) — 객체 GRANT · REVOKE
- [CREATE ROLE](https://www.postgresql.org/docs/17/sql-createrole.html) — 암호화된 비밀번호는 그대로 저장 · `VALID UNTIL` 은 비밀번호만 · `CONNECTION LIMIT`
- [역할 속성](https://www.postgresql.org/docs/17/role-attributes.html) — 권한 검사를 건너뛰는 것은 슈퍼유저뿐
- [권한](https://www.postgresql.org/docs/17/ddl-priv.html) · [psql](https://www.postgresql.org/docs/17/app-psql.html) — 종료 상태 · [프로토콜 흐름](https://www.postgresql.org/docs/17/protocol-flow.html)

그 밖
- [bash — 종료 상태](https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html) — 신호 n 으로 끝나면 128+n
- [AWS — rds_superuser 역할](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Roles.rds_superuser.html) — 마스터는 `NOSUPERUSER` · [RDS 이벤트 트리거](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.EventTriggers.html) — 마스터 사용자가 만듦 · [DB 스냅숏 만들기](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateSnapshot.html) — 손으로 뜬 스냅숏은 만료되지 않음
- [MDN — Cache-Control `immutable`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#immutable)

실측
- [실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-prod-data-wipe-throwaway-login/measurements.md) — 운영 실행 수치(식별자 뺌)와 공개 재측정
- [공개 재측정 스크립트 · 원자료](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-prod-data-wipe-throwaway-login/measure)

이어지는 글
- [DB 비밀번호 대신 연결마다 RDS IAM 토큰을 만들었습니다](/posts/0-to-1/pokeclip-shared-db-auth-iam-tls/)
- [공유 DB에선 로그인 뒤 권한과 함수 가로채기를 막았습니다](/posts/0-to-1/pokeclip-shared-db-login-privileges/)
