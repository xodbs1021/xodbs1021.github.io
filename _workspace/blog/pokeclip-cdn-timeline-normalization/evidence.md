# evidence — pokeclip-cdn-timeline-normalization (다시 쓰기, 2026-11-11)

유형: 실험. 코드 근거 PokeClip-mono develop `825a3dfe`.

## 역할

- 작성자: tfdt 재현 과제 배정, 9/19 도장 규칙(mtxi + 보정값) 제안.
- AI: 실험 설계·실행·판정. A/B/C 단일 변수 분리 = Codex 리뷰 r1 지적, mtxi 기준 재설계 = Claude Code 리뷰 r1 권고.
- 옛 글 「저는 init 분리와 시간 변경을 … 나눠 비교하도록 했습니다」 → 근거 없음, 고침. PDF 12쪽 「내가 채택한 변환 규칙」 → 날짜 문장.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| A 8.10 / B 8.10 / C 39.87, 20초 탐색 결과, buffered | 8/30 재현 실측 로그(팀 내부) | 실측(비공개) |
| B·C 193바이트 위치(tfdt v1 8바이트 × 78상자 중 값이 바뀐 위치) | 같은 로그 | 실측(비공개) |
| 영상 첫 tfdt 0.000–0.320, 소리 0, mtxi 조각 번호 0→9, DTS 0→35.776 | 같은 로그 실측 ① | 실측(비공개) |
| 재접속 뒤 표식 교체·조각 번호 0·DTS 0·tfdt 0 | 같은 로그 실측 ② | 실측(비공개) |
| EXTINF 39.873 / 소리 39.872, 트랙 끝 잇기 방식 최대 0.32초 오차 | 같은 로그 실측 ③ | 실측(비공개) |
| A/B 비치명 bufferStalledError·bufferNudgeOnStall, fragParsingError는 단일 트랙 추출본 | 같은 로그 부수 | 실측(비공개) |
| 제품 도장 = mtxi + 세션 보정값, 첫 mtxi 음수면 −mtxi | README L1372–1390, chain.go startChain L79–97 | 공개 |
| init 변경 → init_mismatch | axis_body.go L225–233 | 공개 |
| 측정 조건: MediaMTX 1.20.1, hls.js 1.5.15, 격리 compose, 호스트 포트 0 | 같은 로그 머리 | 비공개 |
