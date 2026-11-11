# review — pokeclip-indexer-recovery-without-events (2026-11-12)

## 자체 검사
- 기계 검사: 메타 문장 0, 본문 '~습니다' 통일(목록·표·캡션·accDescr 예외), `## 측정 조건` · `## 출처` 있음, 제목 32–33자.
- 그림: 영상 1(개념도, 반복, 휴대폰판) + 정적 그림 1 이상. 그림 번호는 `[[fig-id]]` 참조.
- 빌드·시험: `npm run build && npm test` 통과, `LAYOUT_PATH=0-to-1/pokeclip-indexer-recovery-without-events npm run test:layout` 실패 0(390·1440, light/dark, 움직임 줄이기 포스터 확인).
- 링크: 내부 링크 파일 존재, GitHub 고정 커밋 링크 200. netflixtechblog.com은 자동 요청에 403을 돌려줘 검색 색인으로 주소만 확인.

## 독립 리뷰
b10-reviewer(새 컨텍스트, 원자료·고정 커밋 코드·PDF 대조, 2026-11-12). 비밀 노출 0, 고정 커밋 행 인용 전부 실재.

- 사용자 결정: 소제목 「정상 한 조건과 알림을 끊은 세 조건에서 276개 파일이 모두 등록됐습니다」(옛 id 유지).
- SHOULD 훅 3종 = 연결·끊김·녹화 완료로 고침. 「1.5초보다 짧게」로 한정. 청소기는 「켜면」, config.go 28·97행. PDF 7쪽 역할 날짜 문장 추가. 「완성 확인」(원자료에 없는 인과) 삭제 → 「유휴 판정을 기다려야」.
- NIT 벽시계 검산으로 못 잡은 인과 문장, 8/4 수행 주체 AI 추가, 근거 메모의 내부 절 이름 삭제.
