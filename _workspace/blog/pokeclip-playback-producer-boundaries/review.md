# review — pokeclip-playback-producer-boundaries (다시 쓰기, 2026-11-11)

## 자동 검사

- `npm run build` 통과, `npm test` 39/39 통과.
- `LAYOUT_PATH=0-to-1/pokeclip-playback-producer-boundaries npm run test:layout` 실패 0, 경고 0(390·1440, light/dark, 움직임 줄이기 켬/끔).
- 링크: 본문 외부 링크 전부 200(curl), 내부 링크·PDF 쪽 링크는 dist에 존재.
- 기계 문체 검사: 메타 문장 0, 본문 '~다.' 0.
- 공개 저장소 비공개 패턴 검사(Jira 키·ADR 번호·내부 단계명·세션 이름·IP·볼트 경로·쓰지 않기로 한 링크): 0.

## 시각 자료 판단

| 위치 | 놓침 신호 | 형식 | 없으면 놓치는 것 | 근거 |
|---|---|---|---|---|
| 첫 절 | 세 구성 요소 사이 흐름 + 기다림·재시도 | 영상 ThreeAxisUpload(개념도) | ③이 init을 기다리고, 실패한 축만 스위퍼가 다시 집는 순서 | README 「③ 축은 어떻게 도나」 |
| 둘째 절 | 상태와 전이 조건 | Mermaid TB(재구성) | init 대조 세 갈래(모름·같음·다름) | README L1344–1483, axis_body.go |

Mermaid는 처음 462–502px로 넓어 갈림을 직렬로 바꿔 392px로 맞춤.
필수 수량: 움직이는 설명 1, 정적 그림 1 — 충족.

## 독립 리뷰 지적과 처리

- SHOULD PR #289의 「세션 종료 전이」와 10/27 ended 전이가 겹쳐 읽힘 → 「송출이 끝난 세션을 ending으로 닫는 전이」로 고침.
- SHOULD 제목·소제목 「확정했습니다」「밖에 뒀습니다」「묶어야 했습니다」가 작성자 행위로 읽힘 → 사용자가 승인한 제목·소제목이라 그대로 두고 본문 역할 문단에서 AI 계획임을 밝힘. 사용자에게 바꿀지 묻기로 함.
- NIT 06:12 HTTP MinIO 예행 실패 → 한 구절 추가. 출처의 「생산자」 → 「재포장 부품(Producer)」.
