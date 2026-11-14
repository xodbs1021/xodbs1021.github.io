# 근거 메모 — pokeclip-chat-ledger-query-plans

유형: 트러블슈팅(조회 비용) + 의사결정(세 안 · 준비 문장). 공개 근거만 적는다.

## 역할

- 결정: 사용자(kty) — 11-13 15:52 역행 검사 재작성, 18:28 세 안 가운데 생산자 색인 요청, 19:09 존재 확인 + seq 역순 유지 · 중간 시각 비용 수용, 21:34 그 조회 하나만 서버 준비 문장 끔. 15:52 · 19:09 · 21:34 와 (가) 선택은 PR 511 본문 「머지 조건」 · 「Design」 에 공개. 18:28 은 사용자 결정 기록(시각만 씀, 이유는 쓰지 않음).
- 구현 · 실측: AI(Claude Code · Codex). 세 안 중 AI 추천은 「받아들이고 기록만」 이었다(PR 511 Design 표 「(다) 기각(추천안이었으나 kty 가 (가)를 고름)」).
- 이 글의 재측정: AI(Claude Code), 2026-11-14 12:48–12:49 KST.

## 사실 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 판별기는 카드(사건)마다 수집기 영상 위치 창구를 한 번 부른다, 보정 기본 3,900ms | 블로그 `/posts/0-to-1/chat-highlight-research-and-fallback/` 46–58행 · PR 511 What | 문헌(공개 PR · 기존 글) |
| 판 NULL = 옛 규칙(파일명 시각), 지금 운영의 모든 행 · 판 2 = `playback_pdt`(영상 첫 표본 벽시각), 쓰기 스위치 뒤에만 | PR 511 각주 [^pan] · What | 문헌 |
| 옛 역행 검사 EXISTS 꼴, 바뀐 COALESCE(… LIMIT 1) 꼴 | `SegmentLedger.java@7c3464e3`, `SegmentLedgerInversionEquivalenceTest@7c3464e3` BEFORE_REWRITE, develop `5ad61a0c` SegmentLedger | 코드 |
| 8월에 처음 들어온 조회, 그때 주석이 「EXISTS 가 지금은 Seq Scan 을 탄다 … 판별기가 붙으면 색인이 필요하다」 고 적음 | `SegmentLedger.java@5ad61a0c` 주석(파일 영구 링크만, PR 링크 없음) | 코드 |
| PR 510 색인 `(stream_id, playback_pdt DESC) WHERE timing_version = 2`, 답은 v2_seq_idx 로 고름 | `media/internal/index/ddl.go@fc7dd91c` 610–633행 주석 · PR 510 본문 「왜」 | 코드 |
| 최종 존재 확인 = `min(playback_pdt) <= t`, 사용자 문언은 EXISTS 였다 | PR 511 Design 「존재 확인을 EXISTS 가 아니라 min 으로 썼다」 | 문헌 |
| pgjdbc 5번째 실행부터 이름 붙은 서버 준비 문장 · 0이면 끔 | pgjdbc server-prepare 문서, `PgStatement.isOneShotQuery`@REL42.7.11(`executeCount < threshold`), `PGStatement.setPrepareThreshold` javadoc | 문헌(공식) |
| PG: 처음 다섯 번 custom, 그 뒤 비용 비교로 generic 선택 가능 | PostgreSQL 17 PREPARE Notes | 문헌(공식) |
| 이름 없는 문장은 Bind 때 계획 | PostgreSQL 17 protocol-flow 「Query planning typically occurs when the Bind message is processed」 | 문헌(공식) |
| min/max → ORDER BY … LIMIT 1 치환 | planagg.c 머리 주석 REL_17_STABLE | 문헌(공식) |
| EXPLAIN BUFFERS 는 PG17에서 기본 FALSE — 명시 필요 | PostgreSQL 17 EXPLAIN 문서 | 문헌(공식) |
| 운영 미반영: PR 511 은 운영 채팅 이미지 아님, PR 510 색인 운영 미적용(쓰기 스위치 전 필수), 운영 표 약 5.5천 행 | PR 511 「배포 · 운영 조건」, PR 510 「배포」 | 문헌 |
| 준비 문장 시험은 「서버 준비 문장으로 올라가지 않음」 만 단언 · 대조 문장 · 변이(`setPrepareThreshold(0)` 삭제) FAIL | `SegmentLedgerPrepareTest@7c3464e3`, PR 511 Test plan 변이 목록 | 코드 · 문헌 |
| 운영 auto 모드에서 실제 generic 전환은 미실측, 운영 RDS 에서 unwrap 미실행 | PR 511 「남은 한계」 | 문헌 |
| PDT 비단조 반례(seq 100 PDT 20,000ms · seq 102 PDT 17,000ms) | `VideoPositionV2Test@7c3464e3` 「판_2_후보는_PDT_최대가_아니라_seq_최대다」, 재측정 equivalence.txt | 코드 · 실측 |

## 정정 · 해석

- 인계의 반례 시각 t=18,000ms 는 반례가 아니다: 그 시각에는 PDT ≤ t 인 판 2 행이 seq 102 하나뿐이라 PDT 최대도 seq 102 를 고른다(재측정 `cex-reset` 18,000ms → 102 | 102). 원 시험처럼 t=20,500ms 로 써야 PDT 최대가 seq 100, seq 최대가 102 로 갈린다(재측정 20,500ms → 102 | 100).
- 「EXISTS 는 곧 찾을 것을 기대해 Seq Scan 을 고른다」 는 AI 해석(문서 근거 없음). 본문에 해석이라고 밝힌다.
- PR 510 본문의 「EXISTS … 3–4버퍼」 는 인용하지 않는다(최종 코드는 min 꼴).

## 재측정(공개, measure/)

- 스크립트: `measure/run.sh`(컨테이너 · 장부 · 정리), `schema.sql`, `seed.sql`, `measure.py`. 원자료: `measure/raw/`(results.csv 회차별, summary.csv, plans.jsonl 1회차 계획 전체, equivalence.txt, env.json, machine.txt).
- 환경: PostgreSQL 17.12 (Debian 17.12-1.pgdg13+1) aarch64, 이미지 postgres:17.12 @sha256:dbb9623d…3205, 설정 기본값(shared_buffers 128MB, jit on), OrbStack Docker Engine 29.8.2, MacBook Air Apple M5 32GB 팬 없음, macOS 27.0.1, load average(1분) 회차별 1.82–2.37.
- 표 907,200행, 색인 PK · local_path_uq · wall_idx · v2_seq_idx · legacy_wall_idx · v2_pdt_idx. ANALYZE 뒤 VACUUM 없음(원 시험과 같은 상태, 마지막 판 2 행 삭제 단계만 VACUUM ANALYZE).
- 5회, 버퍼는 모든 경우 한 값.

| 자리 | 재측정(버퍼 · ms) | 앞선 값 |
|---|---|---|
| ① EXISTS 꼴(판 조건 포함) 꼬리 | 12,685 · 36.7–38.9 | 12,676 · 약 35 |
| ① 바뀐 꼴 꼬리 | 21 · 0.055–0.064 | 12 |
| ① 바뀐 꼴 첫 행 + 1초 | 5,498 · 15.3–16.2 | 5,489 |
| ① 롤백 장부 꼬리 / 첫 판 NULL + 1초 | 12,685 → 21 / 12,909 → 377 | — |
| ① 5ad61a0c develop 꼴 꼬리 | 12,685 · 28.1–29.3 | — |
| ① 바뀐 꼴 첫 행 + 1초, 강제 일반 계획 | 14,806 · 31.7–33.0 (max_candidate 서브쿼리가 PK 역순 9,312) | — |
| ② 이른 시각 generic: 확인 없음(색인 유무 무관) → min | 7,246 → 4 | 7,246 → 4 |
| ② 이른 시각 custom: 확인 없음 색인 없음 / 색인만 / min | 7,246 / 6 / 7 | — |
| ② EXISTS 확인 이른 시각 generic | 12,668 · 36.8–39.8 (Seq Scan 907,200행 전부) | 12,668 |
| ② 꼬리: 확인 없음 → min | 4 → 8 | 4 → 8 |
| ② 중간 시각 min (custom = generic) | 3,629 · 8.8–9.4 | 3,629(시험) · 약 32ms(생산자 리뷰 5,923) |
| ② 색인 없이 min: 이른 / 꼬리 / 판 NULL 만 방송 꼬리 | 4,526 / 4,530 / 4,241 | 약 4,500 / 4,241 |
| ② 판 2 행 없는 표 · 색인 없음 · min | 1 | 3(PR 511) |
| ③ 첫 PDT + 1ms min: custom → generic | 11 → 7,249 · 17.5–18.2 | 8 → 7,249 · 51–141 |
| 동치: 역행 검사 500번 | 차이 0(역행 참 38, max ≠ floor 127, floor 없음 137) | 4,000번 |
| 동치: 판 2 확인 500번 | min · EXISTS 차이 0(찾음 301, 빈손 199), PDT 최대 지름길 73번 다름 | 4,000번 |

- 앞선 값과 몇 버퍼 다른 곳(12 → 21, 8 → 11, 3 → 1)의 원인은 확인하지 않았다. 원 시험은 Testcontainers postgres:17(부 버전 미고정)에서 다른 시험과 같은 표를 썼다.
- ms 차이는 기계 · 캐시 상태 차이. 버퍼가 판단 근거다.
- `SegmentLedgerPrepareTest` 는 돌리지 않았다: JDK · gradle 과 Testcontainers(라벨 없는 추가 컨테이너)가 필요해 이번 Docker 규칙(라벨 붙인 PG 하나)과 맞지 않는다. PR 511 공개 서술과 시험 코드를 근거로 쓴다.
