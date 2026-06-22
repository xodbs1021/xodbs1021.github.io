### A. 개발 도구 기초 (5 시리즈)

**갯수 근거**: 백지 학습자가 일상 도구 익히는 영역. 깊이 가지 않고 매일 쓰는 도구 5개 (터미널/Linux/Bash/Git/GitHub+에디터). 더 늘리면 도구학으로 흐름 → 5에서 멈춤.

#### A-1: 터미널 + zsh 입문
- hook: 모든 백엔드/AI/AWS 작업의 시작점
- 핵심 항목: 터미널 vs GUI / 셸 (bash/zsh) / 프롬프트 / 명령어-인자-옵션 / 환경 변수 / PATH / 탭 자동완성 / 히스토리 / Oh My Zsh / iTerm2
- 다루지 않는 것: 파일 시스템 명령 (A-2) / 셸 스크립팅 (A-3) / 프로세스 관리 (N 트랙)
- PokéClip 적용: 모든 코드/AWS/Docker 실행의 기반
- 면접 답변 주제: "왜 CLI 쓰시나요"

#### A-2: Linux 명령어 일상
- hook: 백엔드 서버는 Linux. GUI 없음
- 핵심 항목: 파일 (ls/cd/mkdir/rm/cp/mv) / 내용 (cat/less/head/tail/grep) / 권한 (chmod/chown/sudo) / 프로세스 (ps/top/kill/htop) / 네트워크 (ping/curl/wget/ss) / 검색 (find) / 압축 (tar/gzip) / 텍스트 (sed/awk/sort/uniq/wc) / 디스크 (df/du)
- 다루지 않는 것: 셸 스크립팅 (A-3) / 시스템 관리 깊이 (N 트랙)
- PokéClip 적용: EC2 디버깅 / 로그 확인
- 면접 답변 주제: "서버 로그 분석"

#### A-3: Bash 셸 스크립팅
- hook: 반복 작업 자동화. 배포/cron의 일상
- 핵심 항목: 변수와 따옴표 / 조건문 / 반복문 / 함수 / 인자 처리 / 종료 코드 / set -e / trap / 파이프와 리다이렉트 / 명령 치환 / 정규 표현식 / cron 표현식
- 다루지 않는 것: Python (B 트랙) / Makefile / 컨테이너 자동화 (H 트랙)
- PokéClip 적용: EC2 셋업 자동화 / 배포 스크립트
- 면접 답변 주제: "운영 자동화"

#### A-4: Git CLI 깊이
- hook: GUI는 한계. 실무 PR/충돌/rebase는 CLI
- 핵심 항목: Git 내부 모델 (commit/tree/blob/ref) / branch / merge vs rebase / stash / reset (soft/mixed/hard) / revert / cherry-pick / log/blame/bisect / .gitignore / hooks
- 다루지 않는 것: GitHub Actions (H-5) / 리뷰 워크플로우 (A-5)
- PokéClip 적용: 코드 버전 관리
- 면접 답변 주제: "merge vs rebase"

#### A-5: GitHub 협업 + 에디터 환경
- hook: 회사 개발 70%는 PR 리뷰 + 에디터 잘 쓰기
- 핵심 항목: Fork와 PR 흐름 / 이슈 템플릿 / 리뷰 (approve/request changes) / Projects / SSH 키 / Public vs Private / VSCode vs Cursor / 확장 (Python/Git/Docker) / 단축키 (멀티 커서/리팩토링) / LSP / 통합 터미널
- 다루지 않는 것: CI/CD (H-5)
- PokéClip 적용: PokéClip Public 저장소 = 포트폴리오 / 메인 에디터
- 면접 답변 주제: "코드 리뷰 / 디버깅"

---

