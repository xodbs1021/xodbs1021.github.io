# storyboard — pokeclip-github-oidc-immutable-subject (2026-11-10)

## 영상 — `RefVsEnvironment` (12초, 360프레임, 반복 클립, 휴대폰판 `RefVsEnvironmentMobile`)

독자가 봐야 하는 것: 신뢰 조건이 받는 `sub`를 바꾸는 두 걸음 동안 배포 잡은 계속 통과하고, 다른 잡(Claude Code)의 상태만 바뀌는 순서.

| 프레임 | 단계 | 신뢰 조건이 받는 sub | Claude Code 잡 | 화면 |
|---|---|---|---|---|
| 0–115 | PR 279 뒤 | 브랜치 값 | 켜짐 | 배포 잡(강조 경로)이 검문 → 임시 자격. Claude Code 잡은 회색 점선으로 검문까지 — "같은 브랜치의 다른 잡도 조건상 통과" |
| 115–230 | 1단계 | 브랜치 값 + environment 값 | 꺼 둠(회색 점선 상자) | 배포 잡 위에 「브랜치 → environment」 이름표가 붙고 배포 잡만 흐름. "두 값을 받는 동안 다른 잡은 꺼 둠" |
| 230–360 | 2단계 | environment 값 | 다시 켬 | 배포 잡 통과, Claude Code 잡 경로는 검문 앞에서 끊기고 ✕ — "environment 없는 잡은 막힘" |

- 끝 프레임(포스터, 340): 세 단계 표시(지난 단계 ink, 지금 단계 accent)가 모두 보여 혼자서도 뜻이 통한다.
- 강조색은 배포 잡 경로 하나. 위험색은 막힘(✕, 마지막 이름표)에만.
- 데스크톱 글자 36px 이상, 휴대폰판 48px 이상. 생성 소재 없음(Node·FlowPath·Tag 코드 부품).
- 용어는 본문·캡션과 같게 「브랜치 값 / 두 값 / environment 값」. 「브랜치 → environment」 이름표는 배포 잡이 environment를 참조하게 바뀐 일이라서 두 값이 필요했다는 이유를 보여 준다(2차 리뷰 L7).
