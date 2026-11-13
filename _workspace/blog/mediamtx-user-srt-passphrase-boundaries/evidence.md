# evidence — mediamtx-user-srt-passphrase-boundaries

유형: 의사결정에 가장 가까움. 2026-11-13 다시 씀(공개 근거만).

| 주장 | 근거(공개) | 확인 | 종류 |
|---|---|---|---|
| #6306 열림, 10/8 KST 생성, head 99ea6c00(10/27), 리뷰 없음(codecov 댓글만) | `gh pr view 6306` | 2026-11-13 | 문헌 |
| 옛 head 8f6f1fec(10/19)는 3f041257(10/19 KST 새벽, #6391 이전) 위 | commits API parents, `merge-base --is-ancestor 520934ff 3f041257` = 아님 | 2026-11-13 | 코드 |
| #6391(aler9, 10/21 KST, v1.21.3)부터 상류가 2xx 본문 읽음 | 커밋 520934ff diff, v1.21.3 manager.go L256 | 2026-11-13 | 코드 |
| v1.21.2는 상태 코드만 보고 반환 | v1.21.2 manager.go L231–246 | 2026-11-13 | 코드 |
| 인증이 경로 관리자 루프 안 | v1.21.3 path_manager.go L200, L343–350 | 2026-11-13 | 코드 |
| maxInboundBodySize = 128*1024는 #5674(caeccdce, 4/20 KST) | `git grep` caeccdce | 2026-11-13 | 코드 |
| 시험 10개 · 4개 | PR 본문(현재 head) | 2026-11-13 | 문헌 |
| 10–79자 · 평문 · 열린 연결 유지 · JWT 제외 · 첫 사용자 | PR 본문 | 2026-11-13 | 문헌 |
| SRT는 데이터 패킷 내용만 암호화, streamid는 핸드셰이크 확장 | draft-sharabayko-srt-01 §6.1.1, §3.2.1.3 | 2026-11-13 | 문헌 |
| 릴리스 4건 · 머지 미릴리스 2건 · 열림 3건 · 닫힘 2건 | `gh pr view` + `git tag --contains` | 2026-11-13 | 문헌·코드 |
| 대기 표 | measure/trials_all.csv (240회) | 2026-11-13 18:58–19:11 KST | 실측(AI) |
| 수락·거부 표 | measure/functional_*.csv | 2026-11-13 19:11–19:13 KST | 실측(AI) |

목록 완료 중앙값(ms, 20회): 본문 바로 1.43 / 0.69 / 0.84 · 0.1초 3.28 / 106.98 / 104.94 · 1초 2.24 / 1,004.67 / 1,004.17 · 안 보냄 1.95 / 2,000.95 / 2,000.88 (v1.21.2 / v1.21.3 / #6306).

옛 값 정리: 옛 글의 비공개 대기 비교값은 옛 head가 #6391 이전 상류 위에 있던 비교라 지우고, 세 판 재측정으로 바꿈. 결론: 대기는 v1.21.3부터 상류에 있음(제안 때문 아님) → 제목 「MediaMTX가 SRT 암호를 사용자별로 받게 제안했습니다」. 「128KiB 제한을 제안 범위로」 → #5674 기존 상수로 정정. 옛 head 8f6f1fec 기준 하위 시험 수 → 현재 head 10개 · 4개. 10/19 절은 결과 두 문장만 남기고 나머지 서술 삭제(id 유지).

역할: 범위 · 검증 기준 · 제출 결정 = 사용자, 구현 · 실측 = AI, 재측정 = AI(Claude Code).

재현: 세 판을 `go build`로 만들어 한 폴더에 `mediamtx-v1212` · `mediamtx-v1213` · `mediamtx-pr6306` 이름으로 둔 뒤 `BIN_DIR=<그 폴더> ROOT=<새 출력 폴더> measure/runall.sh`(포트 18890 · 19997 · 18081을 씀). 수락·거부는 `python3 -I measure/functional.py <mediamtx> <새 출력 폴더>`. 집계는 각 `trials.csv`의 `list_after_arrival_ms` 중앙값. `timing_wait.txt`는 대기 시험의 시작·판별 끝 시각과 load average 원본(2026-11-13 19:40에 /tmp에서 옮김).

제품 포크(2026-11-13 확인): `git log v1.21.1..v1.21.1-pokeclip.2`(xodbs1021/mediamtx)에 #6306의 10/08 판 `b9735847`이 있음. 그 판은 `req.Protocol == ProtocolSRT`일 때만 2xx 본문을 읽고(manager.go 252–266), `srtPassphrase`가 문자열이 아니거나 `conf.CheckSRTPassphrase` 위반이면 인증 실패(270–290). v1.21.1 바탕이라 본문 대기는 이 패치가 들여옴.
