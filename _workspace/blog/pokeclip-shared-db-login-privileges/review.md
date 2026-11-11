# 리뷰 — pokeclip-shared-db-login-privileges (2026-11-12)

검사: npm run build · npm test 39/39 통과, LAYOUT_PATH 글별 test:layout 실패 0(390 · 1440, 밝은/어두운, 움직임 줄이기 캡처 직접 확인), 외부 링크 98개 200(postgresql.org 한 건은 재시도 뒤 200), 전체 diff 비공개 패턴 검사 0건.
독립 리뷰: 새 컨텍스트 리뷰 에이전트 1회(원자료 · 코드 · PR 본문 대조, 2026-11-12).

| 지적 | 등급 | 처리 |
|---|---|---|
| 서버별 사용자는 글쓴이 제안 · 팀원 구현(역할) | MUST | 본문 · 역할 문장 · evidence 수정 |
| 「아무 계정이나 하한을 올릴 수 있었다」 과장 | MUST | 「앱 계정이 자기 표의 트리거로 붙여」로 |
| 10_roles.sql 71–100행은 CONNECT 여섯 중 둘만 | MUST | 71–105행으로 |
| 새 글 date가 원래 글과 같음 | SHOULD | 사용자 지시(원래 글 date와 같게)대로 유지 |
