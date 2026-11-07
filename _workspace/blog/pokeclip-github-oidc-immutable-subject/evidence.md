# evidence — pokeclip-github-oidc-immutable-subject

작성 2026-11-07. 원자료는 kty 볼트(`/Users/kty/Documents/valut`)의 PokeClip HTTPS·엣지 트랙. 볼트 라우팅: `index.md` → `Projects/PokeClip/index.md` → `specs/HTTPS-엣지-2026-10-06/_색인.md`(결정 48·52·78·79·91~102·151, 9절 회부-3·5·6, 11절) → raw.

약칭: R90 = `raw/PokeClip/https-edge-2026-10-06/90_dev_m4/`, R92 = `.../92_ci_oidc/`, R93 = `.../93_ci_oidc_env/`, IDX = `Projects/PokeClip/specs/HTTPS-엣지-2026-10-06/_색인.md`.

## 역할

| 누가 | 무엇 | 근거 |
|---|---|---|
| kty(1번) | 운영 측에 OIDC 허용 요청, 원인 확인 지시(결정 78), 신뢰 조건 수정 승인(79), 전환 직접 맡기(91), 머지 승인(92·99·100), environment 방식 채택(96, AI 추천 수용), 옮기는 동안 Claude Code 워크플로 끄기(98, AI 추천 수용), 키 즉시 삭제(101) | IDX 결정 표, R93 `00_clarifier_qa` 78~87차 |
| kty | IAM 쓰기 직접 실행: 신뢰 정책 수정 스크립트 343(1차 실패·2차 성공), 411(1단계), 427(2단계), 키 비활성 440 | R92 progress 61·64·66행, R93 phase3-review-env "kty 실행", IDX 결정 101 |
| AI 오케스트레이터(Claude Code) | 원인 조사(읽기), 스크립트·워크플로 diff 작성(developer 서브에이전트), 리뷰 조율. **키 삭제 스크립트 449는 kty의 「ㄱㄱ」를 실행 승인으로 읽고 AI가 먼저 실행** → kty 재실행은 "이미 지워짐·건너뜀" | IDX 결정 102 |
| 리뷰어 | Claude 리뷰어(cc)·Codex(cx)·security-reviewer | R92 `phase3-review-oidc.md`, R93 `phase3-review-env.md` |
| 팀원(3번) | services-deploy.yml 원래 담당(POK-332). 8월 OIDC 최초 설정 주체는 **미확인** → 글에서 주체를 쓰지 않음 | R90 341 "워크플로는 3번 파일" |

## 주장 ↔ 근거

| # | 주장 | 근거 | 종류 |
|---|---|---|---|
| 1 | 2026-08-19 OIDC 거부, 액세스 키(IAM 사용자, dev EC2 한 대 SSM 셸 한정)로 우회, 주석은 SCP 추정 | R92 `391_diff_oidc.patch` 삭제된 주석, R90 341 | 실측(기록) |
| 2 | 계정은 Innovation Sandbox 리스 계정(상위 조직 멤버), kty가 운영 측에 GitHub OIDC 허용 요청 | IDX 결정 48, 상단 설명 | 기록 |
| 3 | 운영 측 답: SCP 차단 아님, 원인은 신뢰 정책 또는 공급자 | IDX 결정 78, R90 341 | 기록 |
| 4 | 공급자 정상(URL·aud·지문 1개), 신뢰 정책 sub StringLike 옛 이름 형식 2개(대소문자 두 꼴), 저장소 설정 `use_immutable_subject: true`, CloudTrail AssumeRoleWithWebIdentity 48건 모두 AccessDenied·실제 sub는 immutable 꼴 | R90 341 | 실측(읽기) |
| 5 | 저장소 생성 2026-07-25(공개) → Changelog의 「2026-07-15 이후 생성 저장소 자동 적용」 대상. 직접 켠 기록 없음(341은 생성일 미확인). | `gh api repos/3K-PokeClip/PokeClip-mono` created_at 2026-11-07 조회, Changelog | 공개 데이터 + 추론(가장 그럴듯함) |
| 6 | 신뢰 조건을 StringEquals aud + immutable develop sub로, 옛 값 제거 | R90 343 | 실행 기록 |
| 7 | 1차 실행 스크립트 결함으로 수정 전 멈춤(역할 무변경 확인) → 2차 성공 | R92 progress 64·66 | 기록 |
| 8 | PR 279: id-token: write, role-to-assume(비밀 AWS_DEPLOY_ROLE_ARN), role-duration-seconds 3600, 주석 정정 | R92 391, 394 | 코드 |
| 9 | 보안 검수가 처음 빠졌고 PR 점검 cc가 HIGH로 지적 → 보안 검수 실행, C/H 0 | R92 phase3-review-oidc #2 | 기록 |
| 10 | merge fb93a762, run 39033721053 성공, 로그인 스텝 1초, 잡 9분 33초 | R92 `_manifest.md` | 실측 |
| 11 | N1: 신뢰 조건이 develop ref 단위 → 같은 저장소 다른 id-token 잡(claude.yml)도 만족, 당시 그 액션이 토큰 환경을 지워 막힘·악용 흔적 0 | R92 phase3-review-oidc #4 | 리뷰 판단 |
| 12 | N2: ssm:ListCommandInvocations(Resource *) 미사용 | 같은 장부 #5 | 리뷰 판단 |
| 13 | environment 방식 선택지 3개와 주의점(sub 템플릿 변경은 다른 OIDC 워크플로 sub도 바꿈) | R93 400 | 기록 |
| 14 | 고정 subject 저장소의 environment sub 꼴은 문서 예시 없음 → 두 값 수용 후 CloudTrail 확인 | R93 411 주석, 424 | 기록 (2026-11-07 GitHub Docs 재확인: environment 예시는 이름 형식만) |
| 15 | 옮기는 동안 claude.yml 비활성(보안 S1 HIGH, PR 279부터 존재) | R93 phase3-review-env S1, IDX 98 | 기록 |
| 16 | PR 280 merge 5d189c13, run 39040383023 초록, CloudTrail 2026-10-17T14:21:24Z 성공, sub `<PREFIX>:environment:dev-deploy` | R93 phase3-review-env | 실측 |
| 17 | 2단계 후 environment 한 값, claude.yml 재활성, PR 281 merge 579f3f0c, run 39042086329 초록 | 같은 곳 | 실측 |
| 18 | 롤백 갈래: claude.yml 꺼짐 + 미완료 실행 0일 때만. 리뷰에서 `gh run list` 기본 20개 상한 지적 → 상태 5개 total_count 합 | R93 427, phase3-review-env 확인 패스 1 | 코드·기록 |
| 19 | 1단계 스크립트: 조건 연산자·키·aud·Effect 단언, sub만 교체, 목표 상태면 SKIP, 오류 출력도 가림 | R93 411, 리뷰 F1~F3 | 코드 |
| 20 | 키 삭제 전: OIDC 배포 3번 초록, CloudTrail 90일 882건 날짜 24개 모두 배포와 겹침(확정 아님) | R93 phase3-review-env, 453 | 실측(읽기) |
| 21 | 키 삭제 10-18, 남은 키 0, 사용자 유지, 비밀 2개 삭제, 남은 AWS 비밀은 역할 ARN 하나 | R93 453, IDX 102 | 기록 |
| 22 | 남은 것: develop 보호 규칙 없음, environment 승인자 0 → 실질 통제는 배포 브랜치 정책 | R93 445, IDX 9절 회부-6 | 기록 |
| 23 | 10-23 결정: v1 때 develop→main, main 기준 prod CI/CD. 11-03 PR 466 main 머지 `bad85cc7` · 태그 `v1.0.0` 완료, 그날 기록상 prod CI/CD(B12) 안 켬 · 재결정 미기록. prod OIDC(main + 승인자 있는 prod environment · immutable sub)는 **계획, 미구현** | `decisions/결정-CICD-v1-main병합기준-2026-10-23.md`, IDX 151, `specs/HTTPS-엣지-2026-10-06/출시v1.0.0-O7e-O7f-O8준비-2026-11-03.md` 5절 80행, `gh pr view 466`, 태그 v1.0.0 | 기록 + 계획 |

## 공식 문서 (2026-11-07 확인)

- GitHub Changelog 2026-04-23(2026-06-10 정정): immutable 형식 `repo:octocat@123456/my-repo@456789:ref:refs/heads/main`, 구분자 `@`(이전 문서는 `-`), 2026-07-15 뒤 생성·이름 변경·이전 저장소 자동 적용, 기존 저장소는 opt-in. https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/
- GitHub Docs OIDC reference: 잡이 environment를 참조하면 sub에 environment가 들어가고 branch는 "only if the job doesn't reference an environment". https://docs.github.com/en/actions/reference/security/oidc
- AWS IAM 문서: GitHub OIDC 신뢰 정책은 sub 조건이 필수(없거나 와일드카드뿐이면 생성·수정 실패), environment를 쓰면 보호 규칙을 강력히 권장. https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html
- configure-aws-credentials v4 README(PR 279 본문이 대조한 출처): https://github.com/aws-actions/configure-aws-credentials/blob/v4/README.md

## 공개에서 뺀 것

- AWS 계정 번호, 역할 ARN, 인스턴스 ID, 사설 IP: 원자료에서도 가려짐. 글에 넣지 않음.
- GitHub 소유자·저장소 숫자 ID: 볼트는 공개 값으로 분류했지만 글에서는 `<OWNER_ID>`·`<REPO_ID>`로 대체(이해에 불필요).
- Jira 링크(비공개 사이트), 팀원 이름: 넣지 않음. 티켓 번호만 표기.
- 공개 저장소 PR 링크(3K-PokeClip/PokeClip-mono#279·280·281): 기존 글들도 이 저장소를 링크하므로 사용.
