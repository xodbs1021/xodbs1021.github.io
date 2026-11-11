# evidence — pokeclip-test-database-ownership-marker

글 유형: 트러블슈팅(증상 → 첫 처방의 한계 → 반례 → 조치 → 남은 한계). 확인일 2026-11-12.

공개 저장소용 메모다. 비공개 기록은 「비공개 실측 기록」·「비공개 결정 기록」으로만 적는다.

고정 링크
- PR #61: https://github.com/3K-PokeClip/PokeClip-mono/pull/61 (병합 2026-08-16T10:05:37Z = 2026-08-16 19:05 KST, 병합 커밋 `7d7930c3f954bb9105dec44a604da749cbfe8307`, merge commit 방식)
- 병합 당시 부트스트랩: https://github.com/3K-PokeClip/PokeClip-mono/blob/7d7930c3f954bb9105dec44a604da749cbfe8307/media/internal/index/testdb_test.go
- 현행 부트스트랩: https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/media/internal/pgtest/pgtest.go (develop `2fc2323c`, 2026-11-12 02:10:08 KST)
- 추출 커밋: https://github.com/3K-PokeClip/PokeClip-mono/commit/29ecc6c4c63173fd132bf8fa24eefb66f3ee49cc (2026-09-02, PR #156 https://github.com/3K-PokeClip/PokeClip-mono/pull/156 에 포함, 병합 2026-09-02T13:05:44Z = 22:05 KST)
- PostgreSQL CREATE DATABASE: https://www.postgresql.org/docs/current/sql-createdatabase.html (200 확인)

| 주장 | 출처 | 확인일 | 근거 종류 | 수행 주체 | 비고 |
|---|---|---|---|---|---|
| 2026-08-04 업로드 인수 시험 첫 실행이 멈춤: 로컬 compose 개발 DB에 잔여 1,121행/405스트림 | 비공개 실측 기록(8월 4일 인수 시험) | 2026-11-12 | 실측 | AI(Claude Code) | 원문 「이전 세션 잔재 1,121행/405스트림」 |
| 잔여 행은 대부분 통합 테스트(`itest-*`) 행, 나머지는 옛 실측 스트림(test-/spike-/probe-) | 같은 기록 | 2026-11-12 | 실측 | AI | 「가짜 실패 행 1,121개」는 틀림 — 실패(failed) 행은 92개뿐 |
| 스위퍼가 잔여 행에 포화: backlog pending 959 · failed 92, 세 번째 순회 `upload_target_rejected` 384 → 대상 5행에 90초 안에 닿지 못함 | 같은 기록 | 2026-11-12 | 실측 | AI | 959+92=1,051 ≠ 1,121(지표 시점 값 — 합을 글에 쓰지 말 것). 「존재하지 않는 파일을 처리」라는 원문 서술은 없음 |
| 제품 결함 아님(관측 지표 `upload_backlog`·`queue_len`은 설계대로 발화) | 같은 기록 | 2026-11-12 | 실측·판정 | AI | |
| 1,121행 삭제(다른 표 무접촉) 뒤 다시 실행해 완주(전항 통과) | 같은 기록 | 2026-11-12 | 실측 | AI | 묶음 10 upload 글 66행 「통합 테스트와 옛 실측이 남긴 잔여 행 1,121개」와 같은 표현으로 맞춤 |
| 테스트 실행 하루 60행씩 누적 | 비공개 결정 기록(2026-08-16 테스트 DB 격리) Context | 2026-11-12 | 기록(산정 근거 원문 없음) | — | 수치 출처는 결정 기록 한 줄뿐 |
| 기존 store 테스트는 공용 DB에 `itest-<epoch>` 행을 넣고 안 지웠음(t.Cleanup은 풀만 닫음); upload 테스트는 이미 전용 DB | PR #61 본문 12행, 비공개 진행 기록 | 2026-11-12 | 코드·기록 | — | |
| 티켓 원안 = t.Cleanup에서 자기 행 삭제 → 사용자가 「store도 그 별도 DB에서 돌리면 되는 거 아냐?」 제기, 전용 DB 통일로 확정 | PR #61 본문 14행, 비공개 명료화 문답 | 2026-11-12 | 결정 기록 | 사용자 결정 | |
| 공용 DB의 기존 `itest-*` 잔여 1회 삭제 승인(로컬 compose · stream_segments · `stream_id LIKE 'itest-%'`) | 비공개 명료화 문답 | 2026-11-12 | 결정 기록 | 사용자 승인 | |
| 기동 시 안전망 청소 기각: 전용 DB 통일로 존재 이유 소멸(YAGNI) | 비공개 결정 기록 Alternatives, 명료화 문답 | 2026-11-12 | 결정 기록 | — | PR 본문은 「C 안전망 sweep」 기각만 언급(30행) |
| 구현은 AI(Claude Code), 계획 리뷰 Claude Code·Codex, 코드 검수 Claude Code·Codex·보안 검수 3축 | 비공개 진행 기록 | 2026-11-12 | 기록 | AI | 리뷰 회차는 공개 글에 쓰지 않음 |
| 코드 리뷰 중 AI 리뷰어(Claude Code)가 미끼 DB(표 `stream_segments` 1개, 행 1개)로 행 1→0 소실을 재현. 공용 DB도 public 표가 `stream_segments` 하나뿐 | 비공개 코드 리뷰 기록, PR #61 본문 28행 | 2026-11-12 | 실측(리뷰 중 재현) | AI(Claude Code) | Codex도 같은 리뷰에 같은 계열 HIGH(교차) |
| 빈 DB 이름 우회는 Codex·보안 검수가 교차 확인 | 비공개 진행 기록 | 2026-11-12 | 기록 | AI | |
| 가드 3종: ① PG_TEST_DB = PG_DSN의 DB 이름이면 실패 ② PG_DSN에 DB 이름 없으면 실패 ③ 이미 있는 DB는 소유 표식 `pokeclip_testdb_marker`(열 0개 빈 표)가 있어야 채택, 표식은 새로 만들 때만 심음 | PR #61 본문 22–26행; testdb_test.go@7d7930c L40–L43(상수), L104–L106(②), L109–L112(①), L120–L126(CREATE DATABASE, 42P04면 createdDB=false), L143–L156(표식 심기/확인, to_regclass) | 2026-11-12 | 코드 | — | ②는 PGDATABASE가 설정되면 ①이 판정(L101–L103) |
| PR 본문 실측: 가드 3종 음성 대조 모두 exit 1, 공용 DB 행수 0→0 | PR #61 본문 36–42행 | 2026-11-12 | 실측(PR 본문) | AI | |
| 미끼 DB RED→GREEN: 구 표-개수 코드는 exit 0 통과·미끼 행 생존 0 / 표식 검사는 4케이스 모두 exit 1, 미끼 행 생존 1, 표식·EnsureSchema 미실행 | PR #61 본문 44–47행 | 2026-11-12 | 실측(PR 본문) | AI | 자동 테스트로 저장소에 남은 것이 아님 |
| 마이그레이션 경로: 표식 없는 기존 `pokeclip_uploadtest`(5행) 거부 exit 1 → 삭제 → 재실행 exit 0 → 표식 보유 DB 재채택 exit 0 | PR #61 본문 62행 | 2026-11-12 | 실측(PR 본문) | AI | |
| 한계: 공용 DB 행수 「0→0」은 「가드가 막았다」와 「쓸 것이 없었다」를 구별 못 함; 1회 청소 SQL이 실제로 지운 잔재는 0행(실측 시점 이미 0) | PR #61 본문 68–71행 | 2026-11-12 | PR 본문 | AI | 8월 4일에 1,121행은 이미 지워진 뒤 |
| 알려진 제약: 같은 PG_TEST_DB 동시 실행 시 상호 소거 / ddl 변경 시 옛 스키마 유지 / 표식 전 중단 고아 DB(항상 빈 DB) / 동시 실행 표식 경합 오탐(LOW) | PR #61 본문 77–82행 | 2026-11-12 | PR 본문 | — | |
| store_test −44줄, upload_store_test −79줄, +9줄(순감 70) | PR #61 본문 6행 | 2026-11-12 | PR 본문 | — | |
| 2026-09-02 부트스트랩을 `internal/pgtest`로 추출, 패키지별 접미 DB 이름(`base_suffix`), 빈 접미는 밑이름(index가 사용) | pgtest.go@2fc2323c L50–L57(dbName), L59–L64(go test ./... 패키지 병렬 → 접미, 패키지 안 t.Parallel 금지); index/testdb_test.go@2fc2323c L54 `pgtest.Pool(t, "", …)`; 커밋 29ecc6c4(PR #156) | 2026-11-12 | 코드 | — | 지금 pgtest.Pool 호출 파일 10개(코드 검색) |
| 현행 가드·표식 로직은 병합 당시와 같음 | pgtest.go@2fc2323c L84–L118(가드), L126–L132(CREATE DATABASE), L149–L162(표식), L164–L169(ensure→reset) | 2026-11-12 | 코드 | — | TRUNCATE가 호출자 reset 함수로 바뀐 것 외 동일 |
| 남은 문제: 같은 PG_TEST_DB를 쓰는 두 실행(서로 다른 프로세스)은 여전히 서로 지움, 표식 경합 오탐 | pgtest.go L59–L64 주석(패키지 간은 접미로 해결, 같은 이름 동시 실행은 코드로 막지 않음), PR #61 본문 79·82행 | 2026-11-12 | 코드·PR 본문 | — | |
| CREATEDB 권한 필요 | testdb_test.go@7d7930c L123, pgtest.go L129; PostgreSQL 문서 | 2026-11-12 | 코드·문헌 | — | |

## 불일치

1. **제목·첫 문단 「가짜 실패 행 1,121개」(현행 글 L2·L15, PDF 33쪽 「공용 개발 DB에 가짜 실패 행 1,121개가 쌓였습니다」)**: 원 기록은 잔여 1,121행/405스트림이고 대부분 `itest-*`, 나머지는 옛 실측 스트림. 실패 상태 행은 92개. → 「통합 테스트와 옛 실측이 남긴 잔여 행 1,121개」. PDF는 고치지 않고 날짜 문장으로.
2. **「존재하지 않는 파일을 처리하려 했다」(L15)**: 원 기록에 없음. 기록은 스위퍼 포화(pending 959, failed 92, 세 번째 순회 `upload_target_rejected` 384)로 대상 5행에 90초 안에 못 닿음.
3. **「업로드 복구 실험이 실패」(L15)**: 정확히는 8월 4일 업로드 인수 시험 첫 실행의 한 항목이 실패해 중단. 제품 결함 아님으로 판정.
4. **PR #61 본문 12행은 1,121행을 전부 store 테스트 탓으로 적음**: 옛 실측 스트림도 섞여 있었음. 글은 인수 시험 기록 쪽 표현을 따른다.
5. **「PR #61의 변경과 테스트에서 확인」(L45)**: 가드·미끼 대조는 저장소의 자동 테스트가 아니라 PR 본문에 옮긴 일회성 실측 로그. 「0→0」 한계와 실제 지운 잔재 0행을 함께 써야 함.
6. **「미끼 DB를 삭제했던 실패」(L55)**: DB를 삭제한 것이 아니라 미끼 DB의 행이 지워진 반례.
7. **L49 「실행별 고유 DB 이름 규약을 남겼다」**: 규약은 문서에만 있고 코드는 막지 않음. 2026-09-02 이후 패키지별 접미는 코드로 들어갔지만 같은 PG_TEST_DB를 쓰는 동시 실행 문제는 남음.
8. 역할 서술 「구현과 반례 검증은 AI와 협업」(L17): 반례는 AI 리뷰어(Claude Code)가 재현했고, 방향 전환(전용 DB 통일)과 잔여 삭제 승인, 병합 승인은 사용자.
