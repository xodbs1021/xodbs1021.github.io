# evidence — pokeclip-session-url-and-endlist (다시 쓰기, 2026-11-11)

유형: 의사결정. 공개 근거만 링크한다. 비공개 1차 기록은 「팀 내부 설계·실험 기록(비공개)」으로만 적는다.

## 용어

round-vod 정의를 따른다: 조각 ⊂ 세션 ⊂ 사슬(계승 세션 묶음) ⊂ 회차(시청자가 보는 방송 한 번, 재접속 창을 넘긴 재접속은 새 회차). 원 글과 PR #289의 「회차」는 지금의 세션이다(역할 문단에 한 번 사실 문장).

## 역할

- 작성자: ENDLIST를 다시 열지 않음(8/19), 끊긴 방송 되감기를 이어야 함(8/19), 계승 창 300초(8/19), 의도적 종료 뒤 비계승(9/26), AAC 과잉 해제 코드 유지(9/30), PR #289 머지(10/19). 근거: 팀 내부 설계 결정 기록(비공개), PR #289 머지 계정.
- AI(Claude Code와 하위 에이전트): 선례 조사, 설계 문서, 구현, compose 실측. 리뷰 Claude Code + Codex.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| ENDLIST = 더 붙지 않음, 서버가 바꿀 수 있는 경우 넷 | RFC 8216 4.3.3.4, 6.2.1 (2026-11-11 확인) | 문헌값 |
| hls.js 1.7.3 ENDLIST → live=false, 다시 받기 타이머는 live만 | m3u8-parser.ts 541–546, base-playlist-controller.ts 177–178 (v1.7.3) | 소스 판독 |
| 새 주소 `dvr/{스트림}/{세션}/index.m3u8` | PR #289 본문 What | 공개 |
| 제어면 `GET /api/streams/{streamId}/rewind` | media/README.md L721–733 @1818c549 | 공개 |
| Mux reconnect_window 기본 60 최대 1800 | Mux API 문서 (2026-11-11) | 문헌값 |
| IVS recordingReconnectWindowSeconds 최대 300, 합침 | IVS API RecordingConfiguration (2026-11-11) | 문헌값 |
| 600초 → 300초 | 팀 내부 설계 결정 기록(비공개) | 미공개 |
| 네 서비스 문서에서 계승 백필 못 찾음 | 팀 내부 조사 기록(비공개) | 미공개 |
| stsd 지문, 기산점 = 직전 세션 마지막 조각 끝 | media/README.md L2166, L2447 | 공개 |
| 10/17 compose: A 15조각·13.7초 종료 전이, B 120초 계승(15 접두+DISC+MAP), C 400초 비계승, hls.js 1.6.0·1.7.3 cc 0→1 치명 0 | 팀 내부 실험 기록(비공개), PR #289 Test plan 「M1 compose 전건」 | 실측(비공개) |
| PR #289 10/19, #196 9/25, #450 10/29, #492 11/9 머지 | gh pr view | 공개 |
| 회차·사슬 정의, 합류 규칙 | media/README.md L797–812, round_rule.go L75–113 | 공개 |
| AAC 트랙 번호 과잉 해제, 코드 유지 | media/README.md L2554 | 공개 |
| mtxi 표식이 0.7초 재접속에서도 둘 | 팀 내부 실측(비공개) | 실측(비공개) |
| PDF 30·31쪽 문구 | static/portfolio/2026-10-15-v2/full.pdf pdftotext | 고정본 |
