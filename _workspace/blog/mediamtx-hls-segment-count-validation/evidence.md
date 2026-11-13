# evidence — mediamtx-hls-segment-count-validation

유형: 트러블슈팅. 2026-11-13 다시 씀(공개 근거만). 발견 경위는 적지 않고 재현 결과로 시작한다.

| 주장 | 근거(공개) | 확인 | 종류 |
|---|---|---|---|
| #6154 생성 8/30 11:36 KST, 병합 8/30 19:57 KST, 병합 커밋 acb78cf5(부모 344d8c90 = #6155 병합) | `gh api repos/bluenviron/mediamtx/pulls/6154`, `git log -1 acb78cf5` | 2026-11-13 | 문헌 |
| v1.21.0 포함(공개 9/6 06:29 KST), v1.20.1 미포함 | `git tag --contains acb78cf5` → v1.21.0 … | 2026-11-13 | 코드 |
| 재생성 간격 10초 | 8402a728 `internal/servers/hls/muxer.go` 23행 `recreateInstancePause = 10 * time.Second` | 2026-11-13 | 코드 |
| gohlslib 하한 LL 7 · 그 밖 3, 0 → 7 | gohlslib v2.4.3 `muxer.go` 225–227 · 316–326. v1.20.1 = v2.4.3, v1.21.0 = v2.4.4, v1.21.3 = v2.4.7(`go.mod`), 하한 같음 | 2026-11-13 | 코드 |
| gohlslib 검사는 남고 같은 하한을 Conf.Validate에도 넣음(옛 글의 「옮겼다」는 틀림) | acb78cf5 `conf.go` 948–965, gohlslib 쪽 코드 변경 없음 | 2026-11-13 | 코드 |
| 입력 셋: Load(파일 · 환경변수) 541–564, API 6곳 `newConf.Validate(nil)` core.go 1303–1375 | acb78cf5 | 2026-11-13 | 코드 |
| 추가 시험 6건 = LL 6·7, fMP4 2·3, LL 0, HLS 꺼짐 1(옛 글의 「6개 경계」 설명은 틀림) | acb78cf5 `conf_test.go` 808–849 | 2026-11-13 | 코드 |
| MPEG-TS는 default 분기, 시험 없음 | 같은 diff | 2026-11-13 | 코드 |
| 부모 트리 3 FAIL(6, 2, 0) / 3 PASS, 병합 · v1.21.0 · v1.21.3 6 PASS, 각 3회 | measure/gotest/hls_*.txt | 2026-11-13 23:03 KST | 실측(AI) |
| v1.20.1 LL 6 + 45초 송출: 실패 5번 × 3회, 간격 10.000–10.004초 | measure/raw/restart_v1.20.1_run*/server.log, summary.json | 2026-11-13 23:02–23:05 | 실측(AI) |
| v1.21.0 · v1.21.3: 종료 코드 1, 오류 문구 | raw/restart_v1.21.*/ | 같음 | 실측(AI) |
| 경계 8가지 표(기동 · m3u8 HTTP 코드 · 실패 줄 수) | raw/matrix_*/, summary.json `matrix` | 23:05–23:17 | 실측(AI) |
| MTX_HLSSEGMENTCOUNT=6: v1.20.1 기동 / v1.21.0 종료 1. PATCH: 200(6 반영) / 400(7 유지) | raw/env_*, raw/api_*, summary.json | 23:17 | 실측(AI) |
| 0 거부 호환성 변화를 PR 본문에 적음 | PR #6154 본문 Note | 2026-11-13 | 문헌 |
| 7개 하한은 PokeClip 라이브 창 결정에도 등장(관련 기록 링크만, 경위로 단정하지 않음) | /posts/0-to-1/pokeclip-live-window-without-fork/ 15 · 21–23행 | 2026-11-13 | 블로그 |

옛 값 정리: 10월 판의 비공개 현장 관측값(반복 실패 횟수 · 기동 거부 확인 · 실제 송출 시간과 실패 수)은 이번 AI 재측정 값으로 바꾸고 지웠다.

역할: 범위 · 검증 기준 · 제출 결정 = 사용자, 구현 · 실측 = AI(Claude Code · Codex), 재측정 = AI(Claude Code).

PDF 37쪽(2026-10-15판)은 옛 비공개 관측 수치와 「경계 6개 테스트」 표현을 쓴다 → 바닥글에 다르다는 문장.

재현: `measure/build.sh <mediamtx 작업 트리> <출력 바이너리>`(GOMODCACHE · GOCACHE 필요), `python3 -I measure/run_hls.py <바이너리 폴더> <새 출력 폴더> 3`, `measure/gotest.sh <새 출력 파일> <작업 트리> ./internal/conf '^TestConfErrors$/hlsSegmentCount' 3`. 원자료의 `<OUT>` · `<SRC>`는 임시 경로 자리.
