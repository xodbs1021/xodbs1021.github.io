# review — pokeclip-cdn-cache-auth-measurement (2026-11-12)

## 자체 검사
- 기계 검사: 메타 문장 0, 본문 '~습니다' 통일(목록·표·캡션·accDescr 예외), `## 측정 조건` · `## 출처` 있음, 제목 32–33자.
- 그림: 영상 1(개념도, 반복, 휴대폰판) + 정적 그림 1 이상. 그림 번호는 `[[fig-id]]` 참조.
- 빌드·시험: `npm run build && npm test` 통과, `LAYOUT_PATH=0-to-1/pokeclip-cdn-cache-auth-measurement npm run test:layout` 실패 0(390·1440, light/dark, 움직임 줄이기 포스터 확인).
- 링크: 내부 링크 파일 존재, GitHub 고정 커밋 링크 200. netflixtechblog.com은 자동 요청에 403을 돌려줘 검색 색인으로 주소만 확인.

## 독립 리뷰
b10-reviewer(새 컨텍스트, 원자료·고정 커밋 코드·PDF 대조, 2026-11-12). 비밀 노출 0, 고정 커밋 행 인용 전부 실재.

- SHOULD 되감기 ③·init 엣지 최대 1일(variables.tf 92–103) 추가. 라이브 목록은 `_HLS_*` 쿼리도 원본에 감을 표와 본문에 반영. 2GiB는 10/6 실험 전체 전송 예약으로 고침.
- NIT CDN 원본은 미디어 ALB(VPC 원본), NLB는 송출 수신 → 문장 분리. 운영 표에 「원본」 열 추가, 되감기 행 「없음(OAC 서명)」.
- NIT 옛 공개판에서 이어받은 실험 조건 문장(1.5Mbps 등)은 유지(리뷰어도 차단 아님).
