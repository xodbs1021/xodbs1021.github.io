# evidence — pokeclip-indexer-recovery-without-events (다시 쓰기, 2026-11-12)

유형: 트러블슈팅 + 실험. 코드 근거 PokeClip-mono develop `825a3dfe`.

## 역할

- 작성자: 10/6 네 조건 선택.
- AI: 8/3 훅 스파이크, 인덱서 구현·리뷰(Claude Code·Codex), 10/6 시험(Codex, 사용자 승인).
- 팀: 8/3 훅 = 1차 신호, 감시·재스캔 = 안전망, 안전망 제거 금지 합의.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 훅 29/29, p50 2.6ms · p95 4.9ms, 무징후 유실 | 8/3 훅 스파이크 기록 | 실측(비공개) |
| 유휴 10초 | indexer.go L172 | 공개 |
| 재스캔 300초 | watcher.go L46 | 공개 |
| 허용 오차 1,500ms | indexer.go L160 | 공개 |
| 사이드카 녹화 볼륨 읽기 전용 | compose.yml.tmpl L258 | 공개 |
| 청소기 기본 유예 8분(PR #302, 10/22) | janitor/config.go L28, README L3331 | 공개 |
| MediaMTX 24시간 삭제 | compose.yml.tmpl L104 주석(기본 24h) | 공개 |
| 10/6 네 조건 p95·최대, 276파일, 누락·중복 0, 커서 이전 구멍 미측정 | 10/6 미디어 구성요소 실측 기록 M3 · PDF 8쪽 | 실측(비공개) |
| 8/4 574/583ms, seq 5 불연속(ON만), 0.886초, 30=30, 10=10 | PR #33 훅 점화 검증 기록 | 실측(비공개) |
| 지금 같은 세션 재접속에 DISCONTINUITY 없음 | reconnect-audio-gap 글 | 정본 글 |

## 정정
- 메타 2문장 삭제, 「SLO 아직 정하지 않았다」 → 「SLO 근거가 아님」, 07b38d3f → 825a3dfe, PDF 8쪽 재접속 표식 날짜 문장.
