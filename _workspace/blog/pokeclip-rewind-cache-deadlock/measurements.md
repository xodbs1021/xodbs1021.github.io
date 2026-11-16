# 실측 요약 — 다른 상자가 먼저 넣은 조각 하나에 되감기 목록이 멈췄습니다

글: `content/posts/0-to-1/pokeclip-rewind-cache-deadlock.md`

이 파일은 두 갈래다.

1. **비공개 기록 요약** — 2026-11-16 사건의 시간선과 2026-11-17 운영 반영 확인. 비공개 기록(사이드카 · MediaMTX 로그, DB 읽기 조회, 운영 작업 기록)에서 **식별자를 빼고 옮겼다**. 스트림 키 · 시험 키 · 계정 · 상자 주소 · 리소스 이름 · 세션 ID · 이미지 다이제스트는 옮기지 않았다. 상자는 a · b 로만 적는다.
2. **공개 재측정** — 누구나 다시 돌릴 수 있는 시험. 스크립트 · 원자료는 `measure/` 에 있다.

시각은 KST(UTC+9)다. 원 로그는 UTC 이고 +9시간 했다.

## 1. 비공개 기록 요약

### 1.1 2026-11-16 사건 시간선

원천: 사건 조사 기록의 실측 절(사이드카 · MediaMTX 로그와 DB 읽기 조회를 2026-11-16 23:05 에 읽은 결과)과 원인 결정 기록.

| 시각 | 상자 | 일 |
|---|---|---|
| 21:53:11 | b | 시험 송출 시작 — MediaMTX `recording 7 tracks`(H264 하나 · MPEG-4 Audio 여섯). 새 세션 열림, init 확정 21:53:17 |
| 21:55:51 | a | 대기 상자 a 의 설정을 제자리에서 바꾸고 사이드카 · MediaMTX 재기동 |
| 21:59:31.65 | a | 같은 스트림 경로에 SRT 송출 — `recording 1 track (H264)`. 운영 작업 에이전트의 확인용 루프백 스크립트(시험 신호 영상만, 소리 없음)이고, 같은 시험 키를 썼다 |
| 21:59:37.6 | a | 첫 파일은 벽시각이 b 의 7124 보다 앞서 「늦은 조각」 으로 건너뜀(장부에 안 들어감) |
| 21:59:38.0 | a | 송출 끝(약 6.4초). 둘째 파일(0.3초 · 5,616바이트 · 영상만)이 **seq 7125** 로 공유 장부에 들어가 b 의 live 세션에 붙음 |
| 21:59:38.2 | a | 그 조각의 업로드가 `영상 true · 소리 false` 로 실패. a 는 이 조각의 재생용 조각 업로드를 73번, b 는 6번 시도했고 모두 같은 이유로 실패 |
| 21:59:41.2 | b | 진짜 4초 조각(벽시각 21:59:36.94 시작)이 seq 충돌 → 커서 재적재 → 선점 행(21:59:37.58 시작)보다 이르다고 판정돼 `late_segment_skipped site=seq_conflict_reload` 로 **버려짐** |
| 21:59:46.2 | b | `rewind_publish_stall_seconds` **WARN** `gap=no_row` `seconds=7.94` `last_abort=""` — 이 정체의 유일한 경보 줄 |
| 22:34:47 | b | 송출 끝. 7126–7652 행은 모두 재생용 조각 업로드 완료(실패는 7125 하나) |
| 22:35:05 | – | 세션 ending. 되감기 목록은 끝까지 7124 |
| 22:42:04 | – | VOD 정산이 DB 에서 7125 에 GAP 행(`reason=upload_stall`, VOD 쪽 포기) |
| 22:50:08 | – | 세션 ended · `published_seq=7124` · DVR 동결 · VOD `frozen_with_gaps` |

- 발행 권한(fence)은 b 가 쥐고 있었다(세션의 writer 값이 a 의 발행기 값과 다름). a 가 b 의 행을 업로드 대상으로 집어 실패로 적은 흔적(`upload_file_missing`)은 0 이었다.
- b 창 안의 `cache_drift_repaired` 는 0줄이었다(30초 감시가 불일치를 한 번도 보지 않음).
- 피해: 진짜 4초 조각 영구 유실, 방송 중 되감기 정체 약 35분(21:59:38 – 22:35:05), VOD GAP 하나.

### 1.2 2026-11-17 운영 반영 확인

원천: 운영 작업 기록(진행 기록 11-17 06:18 · 06:44 · 06:59 · 07:04 줄)과 그 실행의 출력 파일(제자리 전환 · 기동 · 격리 · 루프백 · 자격 확인 · 감시 · 로그 개수 · 대상 그룹 상태). 상자 · 계정 · 대상 그룹 이름은 뺐다.

| 시각 | 일 | 결과 |
|---|---|---|
| 05:06 | PokeClip-mono PR 529 develop 머지(`00cfa2d6`) | – |
| 06:18 | 사이드카 · 설치 묶음 이미지 빌드 — PR 529 와 루프백 고침 PR 528(`f75bdcab`)을 함께 품은 develop 머리 | 빌드 성공 |
| 06:42 | 이미지 레지스트리에 올림 | 성공 |
| 06:52–06:53 | 대기 상자 b 를 새 판으로 제자리 전환(설정 판 8 → 9, 사이드카 이미지 줄 · 환경 파일 · 묶음만 바뀜, 옛 설정 백업) | `INPLACE OK` |
| 06:53:33 | 기동 확인(서비스 여섯) | `MEDIA START OK` |
| 06:53 | 자격 격리 확인 | `CRED ISOLATION CHECK OK` |
| 06:54 | 루프백 전 확인: 두 상자 송출 중 경로 0, 시험 ID 0 | 확인 뒤 진행 |
| 06:54:55 | 루프백 송출(소리 트랙 포함) | `LOOPBACK OK` |
| 06:56:19 | 자격 확인 | `CRED CHECK OK`(업로드 5 · 업로드 실패 0) |
| 06:58:45 | 감시 판정 | `MEDIA WATCH OK` |
| 06:53:35 – 약 06:58 | 사이드카 로그 개수(아래 표) | – |
| 07:01–07:04 | 송출 수신 · HTTP 대상을 b 로 넘김 | 07:04 네 대상 그룹 모두 b 하나 healthy |

새 판 사이드카 로그(기동 06:53:35 부터 약 06:58 까지, 루프백 세션 하나 포함):

| 줄 | 개수 | 내용 |
|---|---|---|
| `"gap":"view_behind"` | 0 | – |
| `cache_drift_repaired` | 0 | – |
| `"kind":"head"` | 0 | – |
| `stall_seal` | 0 | 봉인 스위치는 운영에서 꺼져 있음 |
| `rewind_publish_stall_seconds` | 2 | 둘 다 WARN — 루프백 세션 끝의 `gap=no_row`(정체 7.94초) 한 줄과 `state=ending` 한 줄 |
| `"level":"ERROR"` | 2 | 둘 다 `late_segment_skipped` — 11-16 에 b 에서 버려진 진짜 4초 조각(벽시각 21:59:36.94 시작) 파일이 디스크에 남아 재스캔 때마다 건너뛴 줄. `view_behind` ERROR 가 아니다 |

- 송출 넘김(07:04) 뒤의 실제 방송 로그는 아직 보지 않았다.
- `view_behind` ERROR 는 한 번도 나지 않았다. 그래서 이 줄이 운영 로그 · 경보에서 실제로 보이는지는 확인하지 못했다.
- 대기 상자 전환, 이미지 올리기, 송출 넘김은 사용자가 승인했고 운영 작업 에이전트가 실행했다.

## 2. 공개 재측정

- 실행: AI(Claude Code), 2026-11-17 07:12–07:16 KST(원자료 시각 07:12).
- `raw/env.txt` 는 이번 실행에서 `run.sh unit` 이 쓴 `env-unit.txt`(Go 판 · 시각 · 커밋)에 Docker · macOS · CPU · 메모리 줄을 같은 세션에서 손으로 더해 합친 파일이다. 지금 `run.sh` 는 그 줄까지 `env.txt` 에 직접 쓴다.
- 환경: MacBook Air(Apple M5, 32GB), macOS 27.0.1, Go 1.27.2 darwin/arm64, OrbStack(Docker Engine 29.8.2, Linux VM 커널 7.2.12-orbstack, aarch64).
- PostgreSQL: `postgres:17` 이미지(`postgres@sha256:a426e44bac0b759c95894d68e1a0ac03ecc20b619f498a91aae373bf06d8508d`), 서버 17.10. 라벨 `com.techblog.bench=rewind` 컨테이너 하나, 데이터는 tmpfs.
- pgx: v5.10.0(PokeClip-mono `media/go.mod` 와 같은 판).
- 커밋(공개 저장소 3K-PokeClip/PokeClip-mono):
  - 고치기 전 `0dc13a68be5c257dd7d6b85a2d528b018e3acac4` — PR 529 첫 커밋 `c0b7696a` 의 부모
  - 봉인 전 확인 전 `7c6f43c252453ee5178c45d21d32a1c3c70194ec` — PR 529 셋째 커밋(캐시 재적재 · 감시 대조는 있음)
  - 고친 뒤 `00cfa2d6e3f63594c5ab8aac9a26fd83d874b951` — PR 529 develop 머지 커밋
- 명령: `measure/` 에서 `MONO_DIR=<PokeClip-mono 클론> ./run.sh extract` → `./run.sh unit "$PWD/raw-new"` → `./run.sh pg-up` → `./run.sh pg "$PWD/raw-new"` → `./run.sh down`.
- 시험은 모두 `go test -count=1 -race -p 1` 이고 한 번씩 돌렸다. pgx 탐침은 경우마다 5번이다.

### 2.1 캐시 교착 — 고치기 전 FAIL, 고친 뒤 PASS

PR 의 회귀 시험 두 개는 머지 커밋의 `media/cmd/segment-indexer/publish_loop_ladder_test.go` 203–261 · 320–335행(도우미 `pushRow` 포함)을 고치기 전 트리에 그대로 옮겨 돌렸다. 「감시 70번」 은 이 저장소에만 있는 재측정용 시험(`measure/rmtest/rm_watch_deadlock_test.go`)으로, 두 트리에 같은 파일을 넣었다.

| 시험 | 고치기 전 `0dc13a68` | 고친 뒤 `00cfa2d6` |
|---|---|---|
| `TestLadderGapsRowWhosePushTheCacheMissed`(PR) | FAIL — `적재 = 0번, want 1` | PASS |
| `TestLadderAlarmsViewBehindAfterMissedPush`(PR) | FAIL — `L4 = map[gap:no_row … seconds:7.5]`(WARN), want ERROR `gap=view_behind` | PASS |
| `TestRMWatchDoesNotBreakDeadlock`(재측정용, 30초 감시 70번 = 35분) | FAIL — 적재 0 · 발행 seq 3 그대로 · 로그 WARN `gap=no_row` 1줄 | PASS — 적재 1 · 발행 seq 6 · 로그 ERROR `gap=view_behind` 1 · WARN `cache_drift_repaired` 1 · (발행이 6 까지 간 뒤 유입이 멈춘 모양의) WARN `gap=no_row` 1 |

원자료: `raw/before-loop.txt` · `raw/after-loop.txt`.

### 2.2 봉인이 감시보다 먼저 오는 위험 — 봉인 전 확인 전 판에서 재현

재측정용 시험 `measure/rmtest/rm_seal_race_test.go` 를 `7c6f43c2` 트리에 넣었다. 봉인 스위치 켬, 장부에는 다른 상자가 넣은 4(업로드 영구 실패) · 5 · 6, 첫 30초 감시 전, 0.5초부터 1초마다 26초까지 holdTick.

| 경우 | 첫 봉인 | 세션 | 적재 | 발행 seq |
|---|---|---|---|---|
| push 없음(사건과 같은 모양) | 5.5초 | ending | 0 | 3 에서 정지 |
| push 하나 있음(대조) | 없음 | live | 1 | 6 |

고친 뒤 `00cfa2d6` 에서는 PR 의 `TestStallSealChecksLedgerAtSealTime`(봉인 작업이 장부 끝 6 을 읽고 `ledger_ahead` 로 물러나 적재 뒤 6 까지 발행) · `TestStallSealSealsTrueEndOnTime`(진짜 끝은 5.5초 봉인 · 6.5초 종료)이 PASS 였다. 원자료: `raw/mid-seal.txt` · `raw/after-seal.txt`.

### 2.3 봉인 전 확인의 PG 시험(PostgreSQL 17.10)

`REQUIRE_PG=1` 로 고친 뒤 트리의 `TestEndlistIfCaughtUp*` 다섯을 돌렸다. 모두 PASS.

| 시험 | 결과 |
|---|---|
| `TestEndlistIfCaughtUpSealsOnlyWhenLedgerIsCaughtUp` | PASS(0.13s) |
| `TestEndlistIfCaughtUpChecksAfterFenceWait` | PASS(0.06s) |
| `TestEndlistIfCaughtUpCheckTimesOut` | PASS(0.54s) |
| `TestEndlistIfCaughtUpCheckTimesOutOnServer` | PASS(0.55s) |
| `TestEndlistIfCaughtUpRollbackIsBounded` | PASS(0.35s) |

원자료: `raw/after-pg-endlist.txt`.

### 2.4 pgx v5.10.0 문장 시한 뒤 서버 잠금

`measure/pgxcancel/` — 「피해자」 연결이 트랜잭션에서 세션 행(fence 자리)을 UPDATE(행 잠금) 한 뒤, 다른 연결이 ACCESS EXCLUSIVE 로 잠근 장부 표를 시한 0.5초로 읽는다. 시한 뒤 세 번째 연결이 50ms 마다 그 행을 `FOR UPDATE NOWAIT` 로 잡아 본다(최대 5초). 대조군은 피해자 연결의 두 번째 다이얼(취소 요청용)만 거부한다. 서버 설정: `client_connection_check_interval=0`, `statement_timeout=0`.

| 경우 | 반복 | 읽기 시작부터 오류까지(시한 0.5초) | 오류 뒤 행 잠금이 풀리기까지 | 탐침이 끝난 때 피해자 백엔드 | 표 잠금을 쥔 연결이 끝난 뒤 풀리기까지 |
|---|---|---|---|---|---|
| pgx 기본(취소 요청 보냄) | 5 | 501ms ×5 | 7 · 7 · 9 · 7 · 8ms | 없음 ×5(오류 뒤 약 10ms) | – |
| 취소 요청만 막음 | 5 | 501 · 501 · 501 · 501 · 500ms | 5초 안에 안 풀림 ×5 | 남아 있음 ×5(5초 뒤) | 10 · 3 · 7 · 3 · 4ms |

오류 문장은 열 번 모두 `timeout: context deadline exceeded` 였다. 「풀리기까지」 는 탐침 연결을 여는 시간을 포함한다. 원자료: `raw/pgx-cancel.txt` · `raw/env-pg.txt`.

### 2.5 정리

- 라벨 `com.techblog.bench=rewind` 컨테이너는 `docker rm -f -v` 로 지웠고 0개다. 망은 만들지 않았다(기본 브리지). 볼륨은 tmpfs 라 남지 않았다.
- 클론은 `git archive` 로만 읽었다(브랜치 · 워크트리 무변경).
