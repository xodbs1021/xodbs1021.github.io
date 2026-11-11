# 콘티 — SearchPathHijack (12초 · 360프레임 · 포스터 350 · 휴대폰판 있음)

- 첫 바퀴 「고치기 전」: 호출 상자 `pg_advisory_xact_lock(정수)` → 점선이 pg_catalog(bigint) 상자에 닿고 「먼저 찾지만 형 변환 필요」 → 빨간 선이 public(integer) 상자로, 상자 빨강 「형이 정확히 맞아 골라짐」 → 호출 상자 빨강 「media_indexer 신분으로 실행」.
- 둘째 바퀴 「고친 뒤」: 호출이 `pg_catalog.` + `pg_advisory_xact_lock(…)` 두 줄 → 강조색 선이 pg_catalog 상자로만 → public 상자 흐려짐 「public 쓰기 회수 · 후보 아님」 → 「내장 함수만 실행」.
- 정적 그림: Mermaid 계정 → 권한 대응(세로 한 줄. 휴대폰 폭 약 442px 제한 때문에 init wrappingWidth 300).
