# 근거 — 사이드카는 4초 조각마다 HLS 되감기 목록을 이렇게 만듭니다

글 유형: **설계·아키텍처**(풀어야 했던 문제 → 구조 · 경계 → 조각 하나의 경로 → 어려운 지점과 기각안 → 검증 · 현재 상태 → 한계)

글: `content/posts/0-to-1/pokeclip-sidecar-rewind-playlist.md` · 실측: `measurements.md` · 재측정: `measure/` · 콘티: `storyboard.md`

확인 날짜는 모두 2026-11-18. 코드는 3K-PokeClip/PokeClip-mono develop `627fb5a2`(고정 링크)를 `git show` 로 직접 읽었다. 비공개 원천은 팀 설계서(되감기 경로 설계의 합성 레이어 절 · 업로드/발행 정체 절), 정적 발행 결정 기록, 설계 회부 결정 기록, PDT 규약 결정 기록이며 경로는 공개 저장소에 적지 않는다.

## 역할

| 무엇 | 누가 | 근거 |
|---|---|---|
| 되감기 · VOD 목록을 장부에서 렌더해 S3 에 정적 발행, HTTP 합성 서버 기각(9/1) | 사용자 승인 | 정적 발행 결정 기록(사용자 승인 표시) |
| S3 장애(publish_stall) 동안의 갱신 의무 위반을 관리형 의존 예외로 수용 · 상한 없음(9/1) | 사용자 결정 | 설계 회부 결정 기록 |
| VERSION 6 | 사용자 결정 | `render.go` 108–110 주석(사용자 결정으로 6) |
| L2′ · L3 스위치 기본 끔, 켜는 조건(실측 둘 + 승인) | 사용자 결정 | README 197–198(기본 끔 · 사용자 승인 뒤 켬) |
| PUT 실패 틱 한계 수용(10/1) · 꼬리 교정 TD 초과 한계 | 사용자 결정 | README 2918 · 2923(사용자 수용 표시) |
| 설계 · 구현 · 시험 | AI(Claude Code · Codex), 커밋은 사용자 계정 | 저장소 커밋 · 1편과 같은 서술 |
| 공개 재측정 | AI(Claude Code), 이 글 작성 중 | `measure/raw/` |

## 주장과 근거

| 주장 | 근거 | 종류 | 확인 범위 |
|---|---|---|---|
| 인덱서가 INSERT 커밋 값을 캐시에 push | `indexer.go` 901–902 | 코드 | 직접 읽음 |
| 업로드 확정은 dirty 집합 → 루프가 Peek · 반영 · Ack, 채널 아닌 까닭 | `dirty.go` 40–46, `rewind_loop.go` 367–388 · 190–209 | 코드 | 직접 읽음 |
| 캐시 = 장부 · GAP 원장 · 컷오프의 읽기 뷰, 적재 · push 두 길, 목록에 DB 조회 0 | `cache.go` 1–16 | 코드 | 직접 읽음 |
| 적재 2시간 되짚기 · 10,000행 | `cache.go` 57–68 | 코드 | – |
| 루프 1초(HoldTick) · 발행 몫 순서 | `indexer.go` 160, `rewind_loop.go` 190–209 | 코드 | – |
| 게이트 = 적재 중 아님 ∧ live ∧ init 업로드 | `gate.go` 19–21 | 코드 | – |
| 같은 본문이면 PUT 생략 | `tick.go` 208–243(sha 비교) | 코드 | – |
| 창 머리 · 꼬리 · 길이 범위 | `boundary.go` 14–18 · 75–153 | 코드 | 상세는 경계 글에 링크 |
| 갱신 의무 9초 = 1.5 × TD 6 | RFC 8216bis-22 6.2.1, `publisher.go` 101–106 · 143, 장부 DDL `target_duration DEFAULT 6` | 문헌 + 코드 | 원문 행 대조 |
| D_act 5.5 = 9 − 1.5 − 2, T_edge 1.5 = TTL 1.0 + 전파 0.5 | `publisher.go` 104–106 · 127–149, 설계서 예산 표 | 코드 + 설계 | T_edge · E2E 는 설계서가 「실측 필요」로 표시 |
| 축을 둘로 나눈 까닭(단일 축 7초 GAP → 행 없는 자리의 유령 GAP) | 설계서 정체 대비 절의 이전 판 비판 · 적격 조건 설명 | 설계 기록 | 판 번호는 글에 쓰지 않음 |
| 사다리 표(L1 0.5 · L2 2.0 · L2′ 5.5 · L3 3 · L4 7.5) | `ladder.go` 1–23 · 139–247, `publisher.go` 132–149, `gap_run.go` 1–24 | 코드 | 재측정 시간표로 확인 |
| L2 2초의 근거(업로더 1초 · 2초 재시도 두 번) | 설계서 예산 표 GAP_HOLD 행, `upload/options.go` 18–28 | 설계 + 코드 | – |
| L1 은 다음 시도 시각만 당김 | `guard.go` 150–161 | 코드 | – |
| L2 는 1단계라 holdAge 단독 | `ladder.go` 21 | 코드 | – |
| 스위치 기본 끔 · 켜는 조건 · infra 에 이름 없음 | README 197–198, `git grep REWIND_STALL_SEAL 627fb5a2 -- infra` 0건 | 코드 | 운영 실제 값은 기록에서 확인하지 않아 「기본값」 만 씀 |
| GAP 정의 · 없는 구간 GAP · 받을 수 있어야 함 | RFC 8216bis-22 4.4.4.7 · 6.2.1 | 문헌 | 원문 행 대조 |
| GAP 두 번 확인(캐시 ①②⑤ · DB 재확인 pending/failed) · 섰을 때만 PUT | `ladder.go` 205–217, `gap.go` 21–42 · 55–88 | 코드 + PG 시험 | `TestGapTickRechecksUploadInDB` 등 PASS |
| GAP 은 처음 실릴 때만(기존 줄 변경 금지) | RFC 6.2.1, 설계서 「다섯 귀결 ① GAP은 최초 발행 시에만」 | 문헌 + 설계 | – |
| 태그 순서 · VERSION 6 · MSN · PDT 0.45초 · 판 태그 자리 | `render.go` 108–219, RFC 8절 · 6.3.1 | 코드 + 문헌 | 재측정 본문으로 순서 확인 |
| 검사 S1–S7 · S4 만 재렌더 | `validate.go` 130–179 · 함수별 주석 | 코드 | – |
| 512KiB · 크기 실측 · 설계 어림 90KB/10KB | `validate.go` 22–25, `raw/size.txt`, 설계서 4.0 크기 표 | 실측 + 설계 | 공개 재측정 |
| /dvr 에 compress 없음 · 캐시 정책 gzip 없음 · 정적 사이트엔 compress = true | `cdn_media/main.tf` 59–64, `policies.tf` 83–103, `cdn_static_site/main.tf` 157, AWS 문서 | 코드 + 문헌 | 저장소 원문 기준(배포된 설정 아님) |
| 조건부 PUT(IfAbsent · IfMatch) · Cache-Control 1초 | `tick.go` 140–160 · 458–463, `s3store.go` 27–44 | 코드 | – |
| 동결 = 장부 재적재 · Render · Validate · ENDLIST | `freeze.go` 153–161 · 183–215 | 코드 | – |
| 봉인 = Get · sha 대조 · 한 줄 · If-Match, 쓰는 곳 셋 | `seal.go` 22–43, `freeze.go` 233–261, `finalize.go` 7–10 | 코드 | – |
| ENDLIST 인 까닭(같은 본문 재PUT 은 의무 못 지움) · fence 필수로 바뀜 | RFC 6.2.1, 설계서 정체 마감 절(fence 예외 판 → fence 필수 저울) | 문헌 + 설계 | – |
| 엣지 하한 보고(회차 · MSN, 옛 꼴이면 알리지 않음, 늦게 관측) | `edge_bounds.go` 274–312 | 코드 | – |
| 한계 셋 | README 2914–2926, 설계 회부 결정 기록 | 코드 문서 + 결정 | – |
| PR 196 · 289 · 461 | `git log --first-parent --merges` 로 각 파일 첫 커밋을 품은 첫 PR 병합 확인, `gh pr view` | 공개 PR | – |

## 원천끼리 · 지시문과 어긋난 것

- 지시문 「holdAge 시간축 위에서 0.5 / 2 / 5.5 / 7.5초」: 코드에서 5.5 · 7.5 는 stallAge 축이다. 영상을 두 축으로 그렸다.
- 설계서는 L2 를 (holdAge ≥ 2) 또는 (stallAge ≥ 5.5)로 적었지만 고정 커밋은 1단계(holdAge 단독)다. 글은 코드를 따랐다.
- 설계서는 목록 크기를 약 90KB · gzip 10KB 로 어림했다. 저장소 주석(`validate.go` 23)은 골든 106,499B, 재측정은 회차 꼴 키 135–177KiB.
- 설계서는 gzip 을 「필수」로 적었지만 고정 커밋 CDN 원문에는 압축 설정이 없다.
- 설계서의 매니페스트 실물은 VERSION 9, 코드는 6(사용자 결정).

## 공개 금지 점검

예시 도메인만 씀(코드 주석의 실제 도메인은 옮기지 않음). 스트림 · 세션 ID 는 지어냄. Jira 키 · 판 번호 · ADR 번호 · 리뷰 라운드 · 팀원 이름 · 볼트 경로 없음.
