# 소급 등급 지시 — r1 ~ r6 지적 10건 (pokeclip-github-oidc-immutable-subject)

배경: 하네스 종결 규약(정본 요지 = Claude 메모리 dual-review-until-clean-3rounds)은 「무지적 라운드 = 같은 라운드 cc·cx 양측 동시에 설계 C/H 0 ∧ 문서 C/H 0」, MED/LOW 는 고치고 기록(라운드 유지), 무지적 3회(연속 불요). 이 글의 r1~r6 리뷰 지시가 심각도를 요구하지 않아 등급이 없다. 각 지적에 등급을 매겨 어느 라운드가 무지적이었는지 판정할 근거를 만든다.

등급 기준(블로그 글 — 모두 [문서]):
- CRITICAL: 비밀·식별자 노출, 또는 독자가 그대로 따라 하면 보안 사고가 나는 지시.
- HIGH: 편집 기준(`.claude/skills/blog-writer/references/editorial-policy.md`)의 발행 차단 사유 — 사실 오류(원자료와 반대되는 서술), 역할 오인, 미검증 추론을 사실로 단정, 출처가 말하지 않은 내용을 출처에 귀속 — 또는 독자의 보안·운영 판단을 오도하는 서술.
- MEDIUM: 사실은 맞지만 빠진 맥락·축약 때문에 오해 소지가 큰 것, 낡은 상태 서술 중 핵심 주장에 영향이 작은 것.
- LOW: 참조·표현 정합, 더 나은 근거가 있으나 현재 문장이 틀리지 않은 것.
오케스트레이터에게 유리하게 내려 잡지 말 것(규약 5항: 강등해 닫기 금지). 애매하면 높은 쪽과 그 이유를 적는다.

지적 원문: 이 폴더의 r1-cx.md · r1-cc.md · r2-cc.md · r3-cc.md · r5-cc.md · r6-cx.md, 처분은 ledger.md. 당시 문장은 `git show <커밋>:content/posts/projects/pokeclip-github-oidc-immutable-subject.md`(r1=21eb49d · r2=94d6cfc · r3=c69e69c · r5=f8bbdd1 · r6=41054bf)로 직접 확인하고, 원자료는 review-brief.md 의 볼트 경로로 대조한다.

| id | 라운드 · 측 | 요지 |
|---|---|---|
| A | r1 cx1 | 새로 만든 environment 승인자 0 을 「원래 있던 상태」로 묶음 |
| B | r1 cx2 | `GetCommandInvocation` 도 Resource `*` 인데 결과 읽기를 한 대 한정처럼 서술 |
| C | r1 cx3 | 셋째 방법(id-token 제거)이 Claude 워크플로를 멈춰 빠졌다는 사실 누락 |
| D | r1 cc1 | 8월 「일치」가 예상값끼리의 대조였다고 단정 |
| E | r1 cc2 | sub 설정 층을 저장소로만 한정(조직 단위 누락) |
| F | r1 cc3 | AWS 권고 인용이 승인자 · develop 보호를 짚는 것처럼 읽힘 |
| G | r2 cc1 | 「앞에서 말한 리전 단위」가 가리킬 문장이 없어짐 |
| H | r3 cc1 | develop 에 보호 장치가 전혀 없는 것처럼 축약(실제 강제 push · 삭제 금지) |
| I | r5 cc1 | immutable 적용 이유를 「확인 못 함 · 이름 변경 추정」으로 둠(생성일로 설명 가능) |
| J | r6 cx1 | prod 단락이 10-23 계획을 현재처럼 서술(11-03 main 머지 · v1.0.0 완료) |

(r1 6건 + r2 · r3 · r5 · r6 각 1건 = 10건. r2 cx · r3 cx · r4 양측 · r5 cx · r6 cc 는 판정이 무지적이라 지적 없음.)

출력(한국어): id 마다 `[문서] 등급 — 근거 한두 줄`. 끝에 라운드별 판정 표(r1 ~ r6: 그 라운드에 C/H 가 있었는가 → 무지적 여부)와 마지막 줄 `무지적 라운드: r?, r?, …`. 파일을 만들거나 고치지 말 것.
