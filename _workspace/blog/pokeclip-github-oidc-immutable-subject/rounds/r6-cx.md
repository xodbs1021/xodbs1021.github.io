1. **prod 계획에서 이미 완료된 main 병합과 미구현 CI/CD를 구분해야 합니다.**
   
   - **위치:** [본문 165행](/Users/kty/tech-blog-worktrees/oidc-motion/content/posts/projects/pokeclip-github-oidc-immutable-subject.md:165) — “prod는 v1을 내면서 develop을 main에 병합하고 … 아직 계획이고 구현하지 않았다.”
   - **문제:** 10월 23일 계획을 현재 상태로 설명해, main 병합까지 미완료인 것으로 읽힙니다. 11월 3일에는 이미 main 병합과 `v1.0.0` 태그 생성이 끝났습니다. 미구현으로 남은 것은 prod CI/CD입니다.
   - **근거:** 볼트 `/Users/kty/Documents/valut/` 기준:
     - `raw/PokeClip/https-edge-2026-10-06/116_ops_o7e_o7f_release/workspace_2026-11-03/pr466-body-posted-2026-11-03.json.txt`: PR 466의 main 병합 완료와 머지 커밋 `bad85cc7`을 기록합니다. 본문에는 main push나 `v1.0.0` 태그로 도는 배포 워크플로가 없다고 명시돼 있습니다.
     - `Projects/PokeClip/specs/HTTPS-엣지-2026-10-06/출시v1.0.0-O7e-O7f-O8준비-2026-11-03.md` 5절: v1.0.0에서 CI/CD(B12)를 켜지 않았고, 이에 관한 재결정도 미기록이라고 적혀 있습니다.
   - **바꿀 문장:** “10월 23일에는 v1 출시 때 develop을 main에 병합하고 main 기준으로 prod CI/CD를 켜기로 했다. 11월 3일 main 병합과 `v1.0.0` 태그 생성은 끝났지만, 당시 기록상 prod CI/CD는 켜지 않았고 재개 시점도 미정이었다. main 브랜치 제한과 승인자가 있는 prod environment, immutable `sub`를 적용하는 내용은 아직 계획이다.”

확인한 것:

- `341·343`과 진행 기록: SCP 추정, 실제 `sub` 불일치, 거부 48건, 신뢰 조건 변경과 첫 스크립트 실패.
- `391·394`, PR 279 검수 기록·매니페스트: 워크플로 변경, 수행 주체, 보안 검수 누락과 보완, 로그인 1초·배포 9분 33초.
- `400·411·421·424·427·445`와 문답·검수 기록: environment 선택, 두 단계 전환, Claude 워크플로 비활성·재활성, 롤백의 다섯 상태 조회.
- `453`, 검수 기록·색인: OIDC 배포 세 번, CloudTrail 882건·동작 셋·날짜 24개, 근거의 한계, 키 삭제 실행 주체와 남은 키 0개.
- 장면 코드 두 개·공유 배치·registry 두 항목·포스터 두 장: 라벨, 상태 변화, 캡션·aria-label 일치, 크기·길이·하단 여백 규약.
- 공개 대상의 식별자 가림, 로컬 미디어 경로 존재, 출처 설명과 본문의 내부 일치.

이전 리뷰와 외부 URL은 열지 않았으며 파일 수정·빌드·재렌더링 없이 검토했습니다.

판정: 지적 1건