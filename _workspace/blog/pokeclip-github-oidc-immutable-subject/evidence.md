# evidence — pokeclip-github-oidc-immutable-subject (2026-11-10 다시 쓰기)

유형: 트러블슈팅 + 의사결정(post-types.md). 한 편 유지, 소제목 11자리(기준선 순서) 유지.
공개 근거는 URL·PR로, 비공개 근거는 "볼트 노트(비공개)"로만 적는다. 11-07 판 근거 메모는 볼트로 옮겼다.

## 역할

- 작성자: 운영 측 권한 문의, 원인 확인 지시, 신뢰 조건 수정 승인, 전환을 직접 맡기로 결정, environment 방식 채택, 두 걸음 순서 승인, 키 즉시 삭제 결정, 머지 승인, IAM 스크립트 대부분 직접 실행(첫 신뢰 조건 수정, 1·2단계, 키 비활성).
- AI(Claude Code): 읽기 전용 원인 조사, 워크플로 diff·IAM 스크립트 작성, 저장소 비밀·environment 설정. 키 삭제 스크립트를 작성자의 "ㄱㄱ"를 승인으로 읽고 먼저 실행(재실행은 건너뜀).
- 리뷰: Claude 리뷰어·Codex·보안 리뷰 에이전트.
- 팀원: 이 워크플로의 원래 담당. 8월 OIDC→액세스 키 커밋의 작성자(공개 커밋으로 확인) — 글에서 작성자 일로 쓰지 않음. 이름은 쓰지 않음.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| immutable 형식 발표 4-23, 구분자 `-`→`@` 6-10, 7-15 이후 새로 만들기·이름 변경·이전 자동 적용, 기존은 직접 켬 | https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/ (2026-11-10 확인. 편집자 주는 형식 "변경") | 공식 |
| environment 참조 시 ref 대신 environment, 숫자 ID 형식 environment 예시는 문서에 없음 | https://docs.github.com/en/actions/reference/security/oidc (2026-11-10 확인) | 공식 |
| `sub` 조건이 없거나 와일드카드뿐이면 생성·수정 실패, environment 보호 규칙 권고 | https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html#idp_oidc_Create_GitHub | 공식 |
| 기본 세션 3600초, `id-token: write` | https://github.com/aws-actions/configure-aws-credentials/blob/v4/README.md | 공식 |
| PR 279·280·281 변경 내용·머지 | https://github.com/3K-PokeClip/PokeClip-mono/pull/279 , /280 , /281 (MERGED, base develop) | 공개 |
| v1.0.0 main 병합 11-03 | https://github.com/3K-PokeClip/PokeClip-mono/pull/466 | 공개 |
| 저장소 생성 2026-07-25, `use_immutable_subject: true`, 남은 비밀 역할 ARN 하나, `dev-deploy` 배포 브랜치 정책 하나·승인자 없음, develop 보호(강제 push·삭제 막힘, 필수 리뷰·체크 없음) | GitHub REST API, 2026-11-10 재확인 | 공개 API |
| CloudTrail 8-19 48건 AccessDenied, 실제 sub 숫자 ID 형식, 공급자·신뢰 정책 상태 | 볼트 노트(비공개) — 원인 조사 기록 | 비공개 실측 |
| 첫 OIDC 배포: 로그인 스텝 1초, 잡 9분 33초 | 볼트 노트(비공개) — 배포 실행 기록 | 비공개 실측 |
| environment 실제 sub 확인(1단계 배포, CloudTrail) | 볼트 노트(비공개) | 비공개 실측 |
| 키 사용처: CloudTrail 90일 882건, 동작 3종, 날짜 24개 모두 배포일 | 볼트 노트(비공개) | 비공개 실측 |
| ref 단위 신뢰 지적: 보안 리뷰 MEDIUM, 두 리뷰어 LOW, prod 역할 설계 전에 닫으라는 권고 | 볼트 노트(비공개) — 리뷰 기록 | 비공개 |
| 두 값 노출 창 HIGH, PR 279 보안 검수 누락 HIGH → 별도 검수 CRITICAL·HIGH 0 | 볼트 노트(비공개) — 리뷰 기록 | 비공개 |

## 넣지 않는 것

계정 번호, 역할 ARN, IAM 사용자 이름, 이슈 키, 팀원 이름·번호 표기, 로컬 경로, 볼트 파일 번호, 대여 계정 제품 이름. 소유자·저장소 숫자 ID는 공개 값이지만 읽기 쉽게 `<OWNER_ID>`/`<REPO_ID>`로 둔다.
