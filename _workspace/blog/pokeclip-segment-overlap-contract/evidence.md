# evidence — pokeclip-segment-overlap-contract (다시 쓰기, 2026-11-11)

유형: 의사결정. 코드 근거는 PokeClip-mono develop `825a3dfe`, 10월 6일 시험 판은 `79da7f67`.

## 역할

- 작성자: 재검토 요구, 계약 정정·확정(8/14), 데이터 담당과 조율, 11/3 편집기 벽시각 유지 결정.
- 팀원: PR #120 Reader·조립기·회귀 테스트 구현(이름·로그인 쓰지 않음).
- AI 에이전트: 10/6 정확성 시험.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 겹침 조건, 인자 순서 | StreamSegmentReader.java L16–33, L65–80 @825a3dfe | 공개 |
| PR #120 8/24 머지, 팀원 구현 | gh pr view(작성자 팀원) | 공개 |
| 8,020/8,020, BETWEEN 3,999/4,000, 최대 3,999ms | 팀 내부 실측(10/6), PDF 17–18쪽 | 실측(비공개) |
| COALESCE 쿼리 10/6 기준, develop에도 그대로 | StreamSegmentReader.java L36–50 @825a3dfe, L27 @79da7f67 | 공개 |
| 조립기·요청 거절(30분) | SegmentWindowAssembler.java, SegmentQueryService.java L29–71 | 공개 |
| 11/2 미디어 좌표, 11/3 편집기 벽시각 유지 + 겹침 조회 + 공용 변환 | 팀 내부 결정(11/2 22:04 – 11/3 02:59), media-timeline 글 | 공개 글 |
| 현재 렌더 주문은 조각 + 조각 시작 시각(sourceStartAtMs) | RenderEnvelope.java @825a3dfe, PR #496 본문 | 공개 |
| #470 11/3 머지 · 부르는 서비스 없음, #475 · #496 draft | gh pr view, media-timeline 글 | 공개 |
| #475 회차 귀속 행 기준 → 스트림 격리 조건 변경 예정 | PR #475 본문, 사용자 지시 | 공개 |
| 편집기 어긋남 약 0.18초 | media-timeline 글 | 공개 글 |

## 사용자 지시와 다른 점

- 뼈대 5절의 「11/2 결정」 가운데 편집기 벽시각 유지는 11월 3일 02:50 KST 결정이라 본문은 「11월 2일 미디어 좌표, 11월 3일 편집기」로 나눔.
