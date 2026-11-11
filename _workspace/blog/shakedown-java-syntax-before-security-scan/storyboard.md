# 콘티 — BrokenJavaGate (12초 · 360프레임 · 포스터 350 · 휴대폰판 있음)

- 위 「수정 전」: 깨진 입력 상자(`class Broken {` / `void broken( {`, 고정폭) → 20–48프레임 점이 Semgrep 1.180.0 상자로 → 상자 위험색, 56 위험색 「ALLOW」(잘못된 통과).
- 아래 「수정 후」: 같은 입력 → 150–178 점이 Tree-sitter 상자로 → 상자 강조색, 186 강조색 「SCAN_FAILED」. 그 뒤 Semgrep 상자는 처음부터 점선 회색(도달하지 않음).
- 끝 프레임(포스터): 두 줄의 결과가 함께 보여 멈추는 자리가 달라진 것이 한 장으로 읽힌다.
- 휴대폰판: 줄마다 입력 상자를 위, 검사 상자를 아래에. 글자 48px.
- 정적 그림: Mermaid 판정 흐름(Tree-sitter has_error · 파서 없음 · 종료 · 시간 초과 → SCAN_FAILED, 정상 → Semgrep · Gitleaks → ALLOW/DENY, 점선: 구문 전용 언어 → REVIEW).
