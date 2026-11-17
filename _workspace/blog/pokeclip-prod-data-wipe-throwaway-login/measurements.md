# 운영 데이터 삭제 — 실측 요약

두 묶음이다. **운영 실행 수치**는 비공개 실행 기록에서 계정 · 상자 · 주소 · 세션
식별자와 내부 처분 기호를 빼고 수치 · 판정만 옮긴 것이다(비공개 기록에서
식별자를 빼고 옮김). **공개 재측정**은 bash · Docker · python3 · openssl 이 있는
곳에서 `measure/run.sh` 로 다시 돌릴 수 있다(확인한 곳은 macOS 27 · OrbStack).

---

## A. 운영 실행 수치(비공개 기록에서 식별자를 빼고 옮김)

- **날짜 · 창.** 2026-11-17 KST. 마른 실행(일회용 계정 아홉 만들기 · 지우기 예행)
  08:26–08:27, 새 방송 차단 08:34, 차단 해제 09:51(77분). 첫 새 방송(관찰용)
  09:54–09:59.
- **마스터의 앱 표 권한.** 실행 전 앱 역할의 멤버는 0명이었다(멤버 행 보고에 보이는
  행은 모두 「앱 역할이 rds_iam 의 멤버」 방향). 앱 표 · 시퀀스 45개의 relacl 은 실행 전
  NULL — 소유자인 앱 역할만 권한을 가진다. 그래서 마스터는 앱 표에 직접 권한도, 앱
  역할 멤버십도 없었다. 일회용 계정에 권한을 줄 때만 같은 `psql -1` 안에서 앱 역할을
  받아 GRANT 하고 끝에서 거뒀다.
- **신분.** 앱 소유 표(클립 · 채팅 · 회원 기준선)를 지우고 세는 걸음은 일회용 계정.
  미디어 장부(로그인 없는 소유 역할의 표)의 읽기 · 쓰기와 권한 기준선 · 최종 검증은
  마스터가 그 소유 역할로. S3 · 큐는 DB 밖.
- **스냅숏.** 수동 스냅숏(SnapshotType manual), 08:49 에 available. 12-17 에 손으로
  지울 예정(실행 때 지울 날을 태그로 달았다).

### 걸음 순서

시각은 각 걸음의 기록 파일이 남은 시각(걸음이 끝난 무렵, KST)이다.

| 시각 | 걸음 | 되돌릴 수 있나 |
|---|---|---|
| 08:26–08:27 | 마른 실행(일회용 계정 아홉 만들기 · 지우기, relacl 첫 명시화) | — |
| 08:31–08:32 | 지우기 전 세기(일회용 계정) | 예 |
| 08:34 | 새 방송 차단 | 예 |
| 08:35 | 일꾼 · 채팅 · 클립 서비스 정지 | 예 |
| 08:39 | 앱 역할 로그인 닫기 | 예 |
| 08:40–08:44 | 큐 재셈 · 다시 세기 승인 | 예 |
| 08:49 | RDS 수동 스냅숏 available | 예 |
| 08:51–09:00 | 키 목록 운반 · 검증 | 예 |
| 09:01 | **작업 큐 · DLQ 비우기(첫 비가역)** | 아니오 |
| 09:18 | 생명주기 전달(outbox) 행 삭제 | 아니오 |
| 09:22 | 큐 장벽 확인 · 클립 DB 표 삭제 · S3 클립 키 삭제 | 아니오 |
| 09:23 | 채팅 DB 표 삭제 · S3 채팅 키 삭제 | 아니오 |
| 09:24 | 두 상자 녹화 폴더 비우기 | 아니오 |
| 09:25 | S3 되감기 키 삭제 | 아니오 |
| 09:26 | 장부 삭제(한 트랜잭션) | 아니오 — 이 뒤로는 앞으로만 |
| 09:27–09:28 | 두 상자 사이드카 재기동 · 엣지 무효화 | — |
| 09:29–09:30 · 09:46 | 다시 세기 · 15분 뒤 한 번 더 | — |
| 09:47–09:50 | 앱 로그인 다시 열기 · 최종 검증 · 서비스 재가동 | — |
| 09:51 | 새 방송 차단 해제 | — |
| 09:54–09:59 | 첫 새 방송(관찰용) | — |

### 걸음별 지운 수(psql `DELETE n` 또는 삭제 직전 승인 집계)

| 묶음 | 대상 | 수 | 신분 |
|---|---|---|---|
| 미디어 장부(한 트랜잭션) | 조각 | 9,353 | 마스터(소유 역할로) |
| | 발행 빈자리(GAP) | 74 | 마스터(소유 역할로) |
| | 컷오프 | 3 | 마스터(소유 역할로) |
| | 세션 | 46 | 마스터(소유 역할로) |
| | 해제된 엣지 경계 | 0 | 마스터(소유 역할로) |
| 생명주기 전달(outbox) 표 | 행 | 64 | 마스터(소유 역할로) |
| 애플리케이션 DB(12표) | 방송 40 · 방송 이벤트 80 · 방송 플랫폼 8 · 점프 카드 13 · 점프 카드 동작 33 · 레시피 6 · 업로드 요청 3 · 클립 5 · 렌더 작업 5 · 렌더 작업 이벤트 21 · 클립 업로드 3 · 썸네일 55 | 합 272 | 일회용 계정 |
| 채팅 DB | 수집 키 40 · 채팅 종료 스트림 11 · 방송 정보 111 · 후원 0 · 채팅 메시지 35 | 합 197 | 일회용 계정 |
| S3 되감기 버킷 | 키 | 18,810 | DB 밖 |
| S3 클립 버킷 | 키(클립 10 · 썸네일 58) | 68 | DB 밖 |
| S3 채팅 버킷 | 키 | 12 | DB 밖 |
| 작업 큐(렌더 · 썸네일 · 업로드)와 각 DLQ | 큐 | 6개 비움 | DB 밖 |
| 두 상자 녹화 폴더 | 파일 | 4 · 5 → 0 | DB 밖 |

- **남긴 것(삭제 전후 같은 수).** 회원 쪽 14표 건수 불변 — 회원 6 · 갱신 토큰 301 ·
  비밀 18 · 스트림 키 3 · 채널 연결 각 3(세 플랫폼) · 에디터 초대 4 · 에디터 위임 4 ·
  오디오 트랙 이름표 2 등. 장치 상태: 판 버전 2(그대로) · 만료 스위치 꺼짐(그대로) ·
  번호 바닥 3스트림.
- **relacl 첫 명시화.** 창을 열기 전 마른 실행(08:26–08:27)의 첫 호출에서 만들 때
  13개 + 지울 때 32개 = 45개(표 36개 · 시퀀스 9개)가 NULL → 명시값. 지울 때의 32개에는
  이 호출에서 권한을 준 적 없이 회수만 한 표가 들어 있다. 이론상 46개 가운데 한 표는
  직전 다른 작업이 먼저 명시값으로 바꿔 둬서 45였다.
- **검증.** 지운 쪽 다시 세기 전부 0. 회원 기준선 불변. 권한 서명(relacl 묶음 해시)
  삭제 전후 같음. 남은 일회용 계정 0 · 세션 0. 두 버킷 다시 LIST 0. 15분 뒤 한 번
  더 세어도 같음. 재가동 뒤 최종 검증 `VERIFY OK`.
- **재가동 · 첫 새 방송.** 두 상자에서 각 여섯 서비스 재기동. 첫 새 방송은 조각
  번호 8819(그 스트림의 바닥)에서 시작 — 지운 옛 번호를 다시 쓰지 않음.

---

## B. 공개 재측정(로컬 PostgreSQL 17)

- **환경(`raw/env.txt`).** 2026-11-17 12:17 KST, AI(Claude Code)가 한 번 실행.
  Apple 실리콘 MacBook, macOS 27.0.1, Docker 29.8.2(OrbStack),
  `postgres@sha256:a426e44bac0b759c95894d68e1a0ac03ecc20b619f498a91aae373bf06d8508d`
  (서버 17.10, 컨테이너 bash 5.2.37), psql 17.10, 호스트 bash 3.2.57, 프록시
  `python:3.13-slim`(Python 3.13.18, linux/amd64).
- **명령.** `measure/` 에서 `./run.sh [출력 폴더]`, 정리는 `./run.sh down`. 라벨
  `com.techblog.bench=wipe-oneoff` 를 붙인 컨테이너 둘 · 망 하나와 `/tmp/wipe-*` 만
  쓰고, EXIT trap 이 라벨로 고른 자원과 임시 파일을 지운다.
- **비밀값.** 비밀번호는 실행마다 `openssl rand -hex 16` 으로 만들어 컨테이너 환경
  변수와 `PGPASSFILE` 로 넘기고, 컨테이너와 함께 지운다. 호스트에는 실행하는 동안만
  `/tmp/wipe-run/pgpass`(0600)로 두었다가 EXIT trap 이 지운다. 명령 줄에는 값을 쓰지 않고
  환경에서 상속한다(`-e NAME`). 저장소의 `raw/` 에는 남지 않는다.
- **인증.** 공식 이미지의 `pg_hba` 는 루프백 연결을 trust 로 받는다(비밀번호를 보지
  않음). 그래서 접속은 컨테이너 망 이름으로 하고 `require_auth=scram-sha-256` 을 붙였다.
- **일반화한 모델(`sql/s0_*.sql`).** `master_x` = RDS 마스터 대역(NOSUPERUSER ·
  CREATEROLE · BYPASSRLS 없음). 운영처럼 앱 표 권한이 없다 — 앱 표 relacl 은 모두
  NULL 이고 `master_can_select` 는 모두 `f`, 직접 읽으면 `permission denied for schema
  app_x`. 앱 표에는 같은 트랜잭션 안에서 스스로 `app_x` 를 받아 `SET ROLE` 해야 닿는다.
  `app_x` = 마스터가 만든 앱 역할(스키마 · 표 · 트리거 · 색인 소유) — 로컬 모델에서는
  만든 쪽이 받는 ADMIN 옵션이 마스터에게 남는다(SET · INHERIT 없음). `other_x` =
  마스터가 늘 SET 할 수 있는 다른 역할. `master_only` = 마스터 소유 영역.

### s1 — 마스터가 스스로 앱 역할을 받아 SET ROLE 한 꼴(`raw/s1*.out`)

| 경로 | 관측 |
|---|---|
| s1a: DELETE → 앱 소유 INVOKER 트리거 | 진입 `current_user=app_x session_user=master_x` |
| 트리거 안 `SET ROLE other_x` | OK `current_user=other_x` |
| 트리거 안 `RESET ROLE` → `master_only` INSERT | `current_user=master_x` · OK(`trigger as master_x` 줄이 남음) |
| s1a: 같은 DELETE 가 깨운 앱 소유 SECURITY DEFINER 트리거 | `current_user=app_x session_user=master_x`, `app_x.table_d` INSERT OK, `master_only` INSERT `permission denied for schema` |
| s1b: 같은 시도를 SECURITY DEFINER 함수 안에서 | `cannot set parameter "role" within security-definer function` |
| 색인 생성 중(`s1-plant.out`, 부분 색인을 만들 때 조건 함수가 돈 경우) | `cannot set parameter "role" within security-restricted operation` |
| 색인 생성 중 열 인자 식 색인 함수 | 기존 4행에 대해 4번 실행(`s1-plant.out`) |
| s1c: INSERT · UPDATE → 열 값을 받는 식 색인 함수 | `tag(mike)` · `tag(india-2)` 두 번, `current_user=app_x session_user=master_x` |
| s1c: DELETE · SELECT | 식 색인 함수 NOTICE 없음(실행 안 됨) |
| s1d: 부분 색인 표 `SELECT count(*)` | 계획 단계 `gate()`(`session_user=master_x`) → `vol_write` 가 `RESET ROLE` 로 `master_x` 가 되어 `master_only` INSERT OK → 역할을 `app_x` 로 되돌림 → 질의 결과 3 · 커밋(`gate as master_x` 줄이 남음) |
| s1d: 부분 색인 표 DELETE | 같은 순서 · `DELETE 1` · 커밋(`gate as master_x` 한 줄 더) |
| s1d 대조: 역할을 되돌리지 않는 함수(`table_q`) | INSERT 뒤 바깥 질의가 `master_x` 로 권한 검사 → `permission denied for table table_q` → 트랜잭션 전체 ROLLBACK(줄이 남지 않음) |
| s1e: 부분 색인 표 SELECT 를 `BEGIN READ ONLY` 안에서 | `gate()` 는 돌고 INSERT 는 `cannot execute INSERT in a read-only transaction` |
| s1f: `SET ROLE app_x` 상태에서 GRANT · REVOKE 만 | 앱 DML 트리거 · 식 색인 · 부분 색인 NOTICE 없음, `master_only` 3줄 → 3줄 |
| s1g: 같은 연결에서 부분 색인 표 SELECT 세 번 → DELETE(0행) → UPDATE(0행) | 세션 카운터 `gate_calls` 누적 0 → 1 → 2 → 3 → 4 → 5(계획마다 한 번) |
| s1h: 새 연결에서 행을 바꾸는 UPDATE 두 번 | `gate_calls` 2 → 4(UPDATE 한 번에 두 번 — 계획 한 번 · 바뀐 행의 색인 조건 검사 한 번으로 보임) · `UPDATE 1` 두 번 |

판정: 「마스터가 앱 소유 표를 다루면 앱 코드가 마스터 권한으로 돈다」는 전제는 실측과
일치. 범위는 RESET ROLE 보다 넓다 — 세션 사용자가 SET 할 수 있는 모든 역할로 옮겨 간다.
역할 바꾸기가 막히는 곳은 SECURITY DEFINER 함수 안과 색인 생성 같은 보안 제한 작업
안이다. 앱 소유 SECURITY DEFINER 트리거는 이와 별개로 소유자인 앱의 권한으로 돈다.
이 실험의 부분 색인 조건(늘 참)은 같은 연결 안에서도 SELECT · DELETE · UPDATE 를
계획할 때마다 돌았고, VOLATILE 함수를 불러 세션 사용자(마스터)로 쓴 뒤 역할을 되돌리면
바깥 질의와 함께 커밋된다. 역할을 되돌리지 않으면 바깥 질의가 권한 검사에서 실패해 함께
되돌려진다. READ ONLY 는 쓰기만 막고 실행은 막지 않는다. 이 실험의 GRANT · REVOKE 는
앱의 DML 트리거와 색인 함수를 깨우지 않았다(이벤트 트리거는 슈퍼유저 · RDS 마스터만
만들 수 있어 이 모델 밖).

### s2 — 앱 역할에 들지 않는 일회용 로그인(`raw/s2-*.out`)

| 항목 | 값 |
|---|---|
| 로그인 가능 · 연결 한도 · 만료 | `rolcanlogin=t` · `rolconnlimit=1` · `VALID UNTIL` 있음(1시간 뒤) |
| 저장된 비밀번호 꼴 | SCRAM 검증값(`true`) |
| `oneoff_x` 멤버십 수 · 커밋 뒤 마스터의 app_x SET · INHERIT 멤버십 | 0 · 0 |
| `app_x.table_a` 권한 | SELECT `t` · DELETE `t` · INSERT `f` · UPDATE `f` |
| 부분 색인 표 SELECT | `gate()` 가 `oneoff_x` 로 돎, `RESET ROLE` 뒤에도 `oneoff_x` → `permission denied for schema master_only` |
| DELETE | 성공(`DELETE 1`) |
| INSERT | `permission denied for table table_a` |
| DELETE 가 깨운 트리거의 `SET ROLE other_x` · `SET ROLE app_x` | `permission denied to set role` 둘 다 |
| 트리거의 `RESET ROLE` 착지점 → `master_only` INSERT | `current_user=oneoff_x` → `permission denied for schema master_only` |
| 같은 DELETE 가 깨운 앱 소유 SECURITY DEFINER 트리거 | `current_user=app_x session_user=oneoff_x`, `app_x.table_d` INSERT OK(`definer-trigger as app_x for oneoff_x` 줄이 남음), `master_only` 거부 |
| `oneoff_x` 가 `app_x.table_d` 에 직접 INSERT | `permission denied for table table_d` |
| 접속한 세션에서 직접 `SET ROLE app_x` · `SET ROLE master_x` | `permission denied to set role` 둘 다 |
| 두 번째 동시 연결 | `too many connections for role "oneoff_x"` |
| `VALID UNTIL` 을 지난 시각으로 바꾼 뒤 로그인 | `password authentication failed for user "oneoff_x"` |
| 권한을 거두기 전 `DROP ROLE` | `cannot be dropped because some objects depend on it` → 회수 뒤 성공, 남은 수 0 |
| s2 뒤 `master_only` | s1 이 남긴 12줄 그대로(일회용 계정이 더한 줄 없음) |

판정: 일회용 로그인은 INVOKER 함수가 `RESET ROLE` · `SET ROLE` 로 마스터 권한을 얻는
길을 막는다. 앱 소유 SECURITY DEFINER 함수는 소유자 권한으로 돌아 일회용 계정에 없는
쓰기(앱 표 INSERT)를 했다 — 이 방식이 막는 범위 밖이고, 마스터 경로(s1a)에서도 같았다.

### s3 — relacl 은 한 번 바뀌면 빈칸으로 돌아오지 않음(`raw/s3.out`)

| 단계 | table_b | table_c |
|---|---|---|
| 처음(권한 0) | NULL | NULL |
| table_b 에 DELETE GRANT · table_c 는 준 적 없는 권한을 REVOKE 만 | `{app_x=arwdDxtm/app_x,probe_grantee=d/app_x}` | `{app_x=arwdDxtm/app_x}` |
| table_b 회수 · 받은 역할 DROP | `{app_x=arwdDxtm/app_x}` | `{app_x=arwdDxtm/app_x}` |
| 마스터 대역이 `pg_class.relacl` 을 직접 NULL 로 UPDATE | `permission denied for table pg_class` | — |

GRANT · REVOKE 로는 NULL 로 돌아갈 길이 없고, 카탈로그를 직접 고치는 길은 슈퍼유저
몫이다. RDS 마스터는 `NOSUPERUSER` 다(AWS 「Understanding the rds_superuser role」).

### s4 — COMMIT 응답이 끊기면 서버는 커밋, psql 종료 코드는 2(`raw/s4.out`)

서버가 보낸 `CommandComplete(COMMIT)` 를 본 순간 그 응답을 떨어뜨리는 TCP 프록시
(`proxy_commitdrop.py`)를 전용 망 안의 컨테이너로 두고, 그 프록시를 거쳐 접속했다.
두 꼴 모두 마스터가 같은 트랜잭션 안에서 `app_x` 를 받아 지우고 거둔다.

| 꼴 | psql | 재접속해 센 결과 |
|---|---|---|
| 1: `psql -X -1 -v ON_ERROR_STOP=1 -f s4_delete.sql` | `server closed the connection unexpectedly` · `psql_exit=2` | 지운 대상 행이 남은 수 0(표 전체 2) — 서버가 DELETE 를 커밋했음 |
| 2: `psql -X -c 'BEGIN; … DELETE …; COMMIT;'` | 같음 · `psql_exit=2` | 지운 대상 행이 남은 수 0 |

프록시 기록에 `COMMIT CommandComplete seen -> dropping ack` 가 두 번 남았다.

### s5 — 셸이 신호로 죽을 때(`raw/s5-*.out`)

| 관측 | 부른 쪽이 받은 값 |
|---|---|
| 호스트 bash `kill -TERM $$` | 143 |
| 호스트 bash `kill -HUP $$` | 129 |
| 호스트 bash `kill -KILL $$` | 137 |
| 컨테이너: 자식 psql 이 앞에서(foreground) 도는 중 부모 bash 를 SIGTERM | `docker exec` 가 143 을 받음, 자식 psql 은 끝까지 돌아 `orphan_x` 를 남김(1) |
| 컨테이너: 자식 psql 이 뒤에서(background) 도는 중 부모 bash 를 SIGTERM | 143, 자식 psql 이 `orphan_bg_x` 를 남김(1) |
