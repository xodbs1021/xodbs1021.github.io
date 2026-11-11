# review — pokeclip-storage-before-new-layer (2026-11-12)

## 자체 검사
- 기계 검사: 메타 문장 0, 본문 '~습니다' 통일(목록·표·캡션·accDescr 예외), `## 측정 조건` · `## 출처` 있음, 제목 32–33자.
- 그림: 영상 1(개념도, 반복, 휴대폰판) + 정적 그림 1 이상. 그림 번호는 `[[fig-id]]` 참조.
- 빌드·시험: `npm run build && npm test` 통과, `LAYOUT_PATH=0-to-1/pokeclip-storage-before-new-layer npm run test:layout` 실패 0(390·1440, light/dark, 움직임 줄이기 포스터 확인).
- 링크: 내부 링크 파일 존재, GitHub 고정 커밋 링크 200. netflixtechblog.com은 자동 요청에 403을 돌려줘 검색 색인으로 주소만 확인.

## 독립 리뷰
b10-reviewer(새 컨텍스트, 원자료·고정 커밋 코드·PDF 대조, 2026-11-12). 비밀 노출 0, 고정 커밋 행 인용 전부 실재.

- MUST 「바이트 위치 지도를 미리 갖고 있다」는 사후 리뷰가 철회한 주장 → 「장부는 객체 단위 시간 지도라 바이트 위치를 찾을 일이 없다」로 고침.
- SHOULD 버스트 크레딧은 원자료가 확정(약 238Mbps) → 확정으로. S3 대체 원본은 「당시 설계」로 시제 고정(지금 CDN 모듈에 원본 페일오버 그룹 없음). 「30초 클립」. Live Origin은 「우리 조건에서 생기지 않음」.
- SHOULD 「제 승인을 받아」 → 브리프의 사용자 확정(「10/6 S3 GET 실험은 AI(Codex, 사용자 승인)」)대로 유지.
- NIT 256KiB 읽기 단위는 공개 요약에서 확인되지 않아 삭제.
