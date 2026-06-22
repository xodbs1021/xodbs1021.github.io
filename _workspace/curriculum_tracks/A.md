### A. 개발 도구 기초 (2 시리즈)

**갯수 근거**: AI 시대 — 도구 사용법(`ls/grep/awk` 같은 명령어 / Bash 스크립팅 / 셸 셋업)은 AI에 위임. 사람이 직접 이해해야 하는 영역만 추림 = **Git 위험 회피 + 터미널 에러 읽기**. 5에서 2로 슬림.

#### A-1: 터미널 + 환경 변수 + 에러 읽기
- hook: AI가 짠 명령 결과를 *읽을 줄* 알아야 디버깅 가능. 터미널은 AI 출력의 첫 검증 도구
- 핵심 다룰 항목: 터미널/셸/CLI 용어 구분 / 프롬프트 읽기 (사용자/호스트/경로/권한) / 환경 변수와 PATH 직관 / "command not found"의 진짜 원인 / 에러 메시지 읽기 패턴 (exit code / stderr / traceback) / `.env` 와 `.zshrc` 의 차이 / SSH 첫 접속과 EC2 환경
- 다루지 않는 것: 셸 스크립팅 (Python으로 대체) / Linux 명령어 외우기 (AI 위임) / Oh My Zsh 깊은 셋업
- PokéClip 적용: EC2 SSH 접속 후 분석 서버 에러 디버깅 / `.env`에 API 키 박기 / Docker 컨테이너 환경 변수
- 면접 답변 주제: 없음 — 도구 입문이라 면접 빈도 X (`feedback_lesson_interview_section`). "실무 적용 시나리오"로 대체

#### A-2: Git 깊이 (브랜치/머지/rebase/충돌)
- hook: AI가 잘못된 git 명령 실행하면 작업 날아감. Git 모델 직접 이해 = 사고 방지의 유일한 길
- 핵심 다룰 항목: Git 내부 모델 (commit/tree/blob/ref) / branch 동작 / merge vs rebase 차이와 선택 / stash / reset (soft/mixed/hard) / revert / cherry-pick / log/blame/bisect / 충돌 해결 / .gitignore / hooks / 위험 명령 (force push / reset --hard) 회복 패턴
- 다루지 않는 것: GitHub UI (입사 후 자연 습득) / GitHub Actions 깊이 (H-4) / Git 서버 운영
- PokéClip 적용: PokéClip Public 저장소 운영 / AI가 푸시한 코드 충돌 해결 / 잘못된 명령 회복
- 면접 답변 주제: "merge vs rebase 어떤 상황에" / "충돌 해결 경험" / "잘못 푸시한 커밋 회복"
