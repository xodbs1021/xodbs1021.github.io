`21eb49d` 기준으로 지적 3건입니다. 파일은 수정하지 않았습니다.

1. **새로 만든 environment의 설정을 기존 상태로 서술함**
   
   **위치:** [본문 163행](/Users/kty/tech-blog-worktrees/oidc-motion/content/posts/projects/pokeclip-github-oidc-immutable-subject.md:163) — “둘 다 원래 있던 상태라 이번 작업에서는 바꾸지 않았고”
   
   **문제:** develop 보호 규칙 부재는 기존 상태지만, `dev-deploy` environment는 이번 작업에서 새로 만들면서 승인자를 두지 않았다. 둘을 모두 물려받은 설정처럼 설명하면 변경 경위가 달라진다.
   
   **근거:** [93_ci_oidc_env/445_pok367_done_draft.md 17행](/Users/kty/Documents/valut/raw/PokeClip/https-edge-2026-10-06/93_ci_oidc_env/445_pok367_done_draft.md:17)은 develop에는 “원래 있던 상태”, environment에는 “이번에 만들면서 승인자를 두지 않았습니다”라고 구분한다.
   
   **바꿀 문장:** “develop 보호 규칙 부재는 기존 상태였고, 이번에 만든 `dev-deploy` environment에도 승인자를 두지 않았다. 두 보호 장치는 prod를 설계할 때 판단할 항목으로 남겼다.”

2. **목록 조회 권한을 제거한 뒤에도 남는 결과 조회 범위가 빠짐**
   
   **위치:** [본문 88행](/Users/kty/tech-blog-worktrees/oidc-motion/content/posts/projects/pokeclip-github-oidc-immutable-subject.md:88) — “dev EC2 한 대에 SSM 명령을 보내고 결과를 읽는 권한이다. 다만 결과 목록 조회 권한은 … 리전 단위였다. 이 권한은 뒤에서 뺀다.”
   
   **문제:** 예외를 목록 조회에만 붙여, 이를 제거하면 결과 읽기도 dev EC2 한 대로 제한되는 것으로 오해할 수 있다. 남은 `GetCommandInvocation`도 `Resource: "*"`다.
   
   **근거:** [93_ci_oidc_env/421_diff_env_r2.patch 12행](/Users/kty/Documents/valut/raw/PokeClip/https-edge-2026-10-06/93_ci_oidc_env/421_diff_env_r2.patch:12)은 명령 실행 대상과 결과 조회 범위를 구분하고, 명령 ID와 인스턴스 ID를 알면 다른 명령 결과도 읽힌다고 명시한다. [같은 폴더의 검수 장부 F5](/Users/kty/Documents/valut/raw/PokeClip/https-edge-2026-10-06/93_ci_oidc_env/phase3-review-env.md:18)도 이 과소표현을 수정한 기록이다.
   
   **바꿀 문장:** “역할 정책은 키 사용자와 같은 문서였다. 명령 실행은 dev EC2 한 대로 제한했지만 결과 조회는 `Resource: "*"`였다. 뒤에서 미사용 `ListCommandInvocations`를 제거했어도, 남은 `GetCommandInvocation`으로 명령 ID와 인스턴스 ID를 아는 다른 명령의 결과를 읽을 수 있다.”

3. **`id-token` 제거안의 기능 중단 부작용이 빠짐**
   
   **위치:** [본문 104행](/Users/kty/tech-blog-worktrees/oidc-motion/content/posts/projects/pokeclip-github-oidc-immutable-subject.md:104) — “다른 워크플로에서 `id-token` 권한 제거” / “조건 자체는 넓은 채로 남음”
   
   **문제:** 비교 대상인 Claude Code 잡은 자체 GitHub App 인증에도 OIDC가 필요했다. 현재 표는 기능을 유지하면서 선택할 수 있는 대안처럼 읽히며, 실제 검토에서 확인한 핵심 부작용을 누락한다.
   
   **근거:** [92_ci_oidc/progress_2026-10-17-2154_oidc.md.txt 123행](/Users/kty/Documents/valut/raw/PokeClip/https-edge-2026-10-06/92_ci_oidc/progress_2026-10-17-2154_oidc.md.txt:123)은 이 제거안이 Claude 워크플로를 멈춘다는 지적과 후보 삭제를 기록한다. 해당 주장 확인을 위해 제한적으로 읽은 [93_ci_oidc_env/402_codex_followup_prepost.md.txt 4688행](/Users/kty/Documents/valut/raw/PokeClip/https-edge-2026-10-06/93_ci_oidc_env/402_codex_followup_prepost.md.txt:4688)에도 GitHub App 인증의 OIDC 의존성이 명시돼 있다.
   
   **바꿀 문장:** 주의점 칸을 “해당 워크플로가 OIDC를 필요로 하지 않을 때만 가능. 우리 Claude Code 잡에서는 GitHub App 인증이 끊겨 기능이 멈추며, 역할의 신뢰 조건 자체도 넓은 채로 남음”으로 변경.

다음 항목을 원자료와 대조했습니다.

- `341`·`343`·결정 78·79: SCP 추정의 정정, immutable 설정, 거부 48건, 신뢰 정책 변경과 첫 실행 실패.
- `391`·`394`·OIDC 검수 장부·매니페스트: PR 279 변경, 역할 분담, 보안 검수 보완, 로그인 1초·잡 9분 33초.
- `400`·`411`·`421`·`424`·`427`·environment 검수 장부: 두 단계 전환, 실제 sub 확인, 워크플로 비활성·재활성, 롤백의 다섯 상태 집계.
- `445`·`453`·결정 91~102와 문답: 키 삭제 전 882건·24개 날짜의 확인 범위, 실행 주체, 키·비밀 삭제.
- 결정 151과 10월 23일 결정문: prod CI/CD의 main 기준 계획과 미구현 구분.
- 장면 코드·registry 두 항목·본문: 라벨과 설명, alt 일치, 360프레임·30fps, 포스터 프레임 범위, 미디어 파일 존재.
- 포스터 두 장을 직접 확인했으며 눈에 띄는 겹침·잘림은 없었다. 검토한 본문·장면 코드에서 실제 계정 번호·ARN·AWS 키 ID·JWT 형식은 발견하지 못했다.

외부 URL은 열지 않았으며 출처 줄과 본문의 내부 일치만 확인했습니다. 영상 재생과 실제 페이지 레이아웃 검증은 수행하지 않았습니다.

판정: 지적 3건