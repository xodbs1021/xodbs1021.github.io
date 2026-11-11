# storyboard — pokeclip-test-database-ownership-marker

## 영상 1 `DecoyDbGuard` (11초 반복, 휴대폰판 있음)
- 근거: PR #61 본문 28행(미끼 DB 반례), 실측 로그 요지(RED: 옛 표 개수 코드 exit 0 · 미끼 행 0 / GREEN: 표식 코드 exit 1 · 미끼 행 생존), 병합 코드 testdb_test.go.
- 왼쪽 「옛 판정 · 표 개수」: ① public 표 1개 → 테스트 DB로 봄 ② 행 비우기 → 미끼 DB의 행 세 칸이 「지워짐」 → 「미끼 DB의 행 삭제」.
- 오른쪽 「새 판정 · 소유 표식」: ① CREATE DATABASE → 이미 있음 ② 소유 표식 확인 → 없음 → 같은 모양의 미끼 DB가 청록, 행 그대로 → 「사용 · 정리 거부」.
- 끝 프레임(포스터, 320): 두 결과가 나란히. 휴대폰판은 위아래.

## 정적 그림 `fig-testdb-guards` (Mermaid, 재구성)
- 이름 가드 2종 → CREATE DATABASE(새 DB에만 표식) → 표식 확인 → 거부 / 스키마 준비 → 비우기 → 테스트. 거부 노드는 하나로 합쳐 폭 392px.
