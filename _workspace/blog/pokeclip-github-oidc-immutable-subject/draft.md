---
title: "GitHub OIDC 거부의 원인은 SCP가 아니었다: immutable subject와 배포 키 없애기"
date: "2026-11-07T04:48:02+09:00"
author: "김태윤"
categories: ["projects"]
draft: true
description: "8월부터 SCP 탓으로 알았던 PokeClip dev 배포의 OIDC 거부를 CloudTrail로 다시 추적해 sub 형식 불일치를 찾았다. 액세스 키를 OIDC 역할로 바꾸고 신뢰 범위를 environment 단위로 좁힌 뒤 키를 지운 과정을 정리했다."
tags: ["PokeClip", "GitHub Actions", "OIDC", "IAM", "CI", "보안"]
---

PokeClip의 dev 배포 워크플로는 두 달 동안 액세스 키로 AWS에 들어갔다. 8월에 GitHub Actions OIDC를 먼저 붙였지만 `Not authorized to perform sts:AssumeRoleWithWebIdentity`로 거부됐기 때문이다. 당시 워크플로 머리 주석을 요약하면 이렇다. sub·audience·인증서 지문을 전부 맞추고 IAM 전파도 기다렸는데 거부됐다. 이 계정은 상위 조직의 멤버 계정이라 SCP가 외부 신원 페더레이션을 막는 것으로 보이지만 확증은 못 했다.

이 추정은 틀렸다. 원인은 우리 쪽 신뢰 정책에 있었다. 이 저장소의 토큰은 처음부터 `sub`에 숫자 ID가 붙은 형식으로 오고 있었는데, 신뢰 정책은 옛 이름 형식만 받고 있었다. 이 글은 그 원인을 찾은 과정, 액세스 키를 OIDC 역할로 바꾼 과정, 그리고 전환 후 리뷰에서 나온 "신뢰 범위가 너무 넓다"는 지적을 environment 단위로 좁힌 과정을 정리한다.

먼저 역할을 밝힌다. 운영 측 문의와 원인 확인 지시는 내가 했다. AI가 제안한 신뢰 조건과 전환 순서를 검토해 승인했고, 머지도 승인했다. IAM을 바꾸는 스크립트는 대부분 내가 직접 실행했다. 조사, 워크플로 수정, 스크립트 작성, GitHub 설정은 AI 에이전트(Claude Code)가 했다. 리뷰는 Claude 리뷰어·Codex·보안 리뷰 에이전트가 함께 봤다. 키 삭제 스크립트는 내가 실행할 차례였는데 AI가 내 말을 실행 승인으로 읽고 먼저 실행했다. 이 일은 뒤에서 다시 적는다. 글의 움직이는 그림은 Claude Code가 Remotion으로 만들었고, 그 안의 소재 그림은 OpenAI 이미지 생성(Codex 내장)으로 만들었다.

## OIDC 로그인에서 sub가 하는 일

GitHub Actions의 OIDC 로그인은 오래 쓰는 비밀 대신 실행마다 새로 받는 토큰을 쓴다. 잡에 `id-token: write` 권한이 있으면 GitHub가 서명한 JWT를 받을 수 있다. 이 토큰을 AWS STS의 `AssumeRoleWithWebIdentity`에 내면 STS는 역할의 **신뢰 정책**과 토큰의 클레임을 비교한다. 조건이 맞으면 역할에 정한 최대 세션 시간 안에서 임시 자격을 준다. 이 글의 역할은 1시간으로 설정돼 있다.

가장 중요한 클레임은 `sub`다. "이 토큰이 어느 저장소의 어떤 실행에서 왔는가"를 나타낸다. AWS는 GitHub OIDC를 믿는 역할에 `token.actions.githubusercontent.com:sub` 조건을 반드시 두게 한다. 조건이 없거나 값이 와일드카드뿐이면 신뢰 정책을 만들거나 고칠 때 오류가 난다. 조건이 없으면 남의 저장소 워크플로도 내 역할을 받을 수 있기 때문이다. [AWS IAM 문서](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html)

`sub`의 꼴은 잡의 맥락에 따라 달라진다. 브랜치에서 도는 잡이면 `repo:<소유자>/<저장소>:ref:refs/heads/<브랜치>`가 되고, 잡이 environment를 참조하면 ref 대신 `...:environment:<이름>`이 들어간다. [GitHub Docs](https://docs.github.com/en/actions/reference/security/oidc) 이 차이가 뒤에서 두 번 문제가 된다.

<figure>
<video controls playsinline preload="none" poster="/images/pokeclip-github-oidc-immutable-subject-sub-mismatch-poster.jpg" width="1920" height="1080" aria-label="배포 잡이 숫자 ID가 붙은 sub를 담은 토큰을 STS에 내지만 신뢰 조건이 이름 형식이라 검문 앞에서 AccessDenied로 막히고, 신뢰 조건을 숫자 ID 형식으로 고치자 같은 토큰이 검문을 지나 임시 자격을 받는 장면">
<source src="/videos/pokeclip-github-oidc-immutable-subject-sub-mismatch.mp4" type="video/mp4">
</video>
<figcaption>STS는 토큰의 sub를 신뢰 조건과 비교한다. 이 글의 조건에는 와일드카드가 없어 형식이 다르면 일치하지 않아 막히고, 조건을 토큰 형식에 맞추면 임시 자격을 받는다. 설명용 움직이는 그림이며 실제 화면이 아닙니다. 소재는 AI 생성, 소리는 없습니다.</figcaption>
</figure>

8월의 주석은 비교에 필요한 값이 모두 일치한다고 적었다. 하지만 STS가 실제로 받은 `sub`와 비교한 기록은 없었다.

## SCP가 아니라는 답을 받고 다시 본 것

PokeClip의 AWS 계정은 상위 조직의 멤버인 Innovation Sandbox 리스 계정이다. 10월 12일 엣지 인프라를 이 계정에 올리기로 하면서, 나는 운영 측에 필요한 권한을 몇 가지 요청했다. GitHub OIDC의 `sts:AssumeRoleWithWebIdentity` 허용도 그중 하나였다. 돌아온 답은 예상과 달랐다. SCP는 막지 않고 조직 정책상 허용이며, 원인은 신뢰 정책이나 공급자 쪽으로 보인다는 것이었다.

나는 그 답이 맞는지, 문제가 정말 우리 쪽인지 1차 증거로 확인하라고 지시했다. AI가 읽기 권한으로만 네 곳을 봤다.

| 확인한 곳 | 결과 |
|---|---|
| IAM OIDC 공급자 | URL `token.actions.githubusercontent.com`, audience `sts.amazonaws.com`, 지문 1개. 정상 |
| 역할 `pokeclip-dev-deploy` 신뢰 정책 | `sub`를 `StringLike`로 두 값만 허용. 이름 형식이고 저장소 이름의 대소문자만 다름 |
| 저장소 OIDC sub 설정(REST API) | `use_immutable_subject: true` |
| CloudTrail `AssumeRoleWithWebIdentity` (서울, 90일) | 8월 19일 48건, 모두 AccessDenied. 기록된 실제 sub는 immutable 형식(아래 표) |

답은 마지막 줄에 있었다. 토큰의 `sub`에는 소유자와 저장소 이름 뒤에 `@숫자 ID`가 붙어 있었다. 신뢰 정책에는 이름만 있었다. 문자열이 다르니 STS는 48번 모두 거부했다.

## GitHub의 immutable subject

GitHub는 2026년 4월, OIDC 토큰의 `sub`에 소유자 ID와 저장소 ID를 넣는 형식을 발표했다. 이름은 바꿀 수 있고, 지운 뒤 다른 사람이 같은 이름을 다시 쓸 수도 있다. 이름만 믿는 신뢰 정책은 그렇게 재사용된 이름의 저장소도 믿게 된다. 숫자 ID는 바뀌지 않으므로 이 위험이 없다. 6월에는 이름과 ID 사이 구분자가 `-`에서 `@`로 정정됐다. 7월 15일 이후 새로 만들거나, 이름을 바꾸거나, 이전한 저장소는 자동으로 이 형식을 쓴다. 기존 저장소는 직접 켜야 한다. [GitHub Changelog](https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/)

아래 표의 첫 줄은 신뢰 정책이 받던 값이고, 둘째 줄은 토큰이 실제로 보낸 값이다.

| 형식 | develop 브랜치의 sub |
|---|---|
| 이름 | `repo:3K-PokeClip/PokeClip-mono:ref:refs/heads/develop` |
| immutable | `repo:3K-PokeClip@<OWNER_ID>/PokeClip-mono@<REPO_ID>:ref:refs/heads/develop` |

우리 저장소에 이 설정이 왜 켜져 있었는지는 확인하지 못했다. 신뢰 정책에 대소문자가 다른 저장소 이름 두 개가 있었으니 이름을 바꾼 이력이 있을 수 있다. 다만 추정일 뿐이다. 확실한 것은 8월의 첫 시도부터 토큰이 이 형식으로 오고 있었고, 신뢰 정책이 그 형식을 몰랐다는 점이다.

## 신뢰 조건부터 고쳤다

고칠 곳은 신뢰 정책의 조건 하나였다. AI는 옛 이름 형식 두 값을 지우고 `StringEquals`로 immutable 형식의 develop 값 하나만 받게 하자고 제안했다. 옛 이름 형식을 남겨 두면 이름 재사용을 막는다는 immutable 형식의 목적이 사라지기 때문이다. 나는 이 안을 승인했다.

```json
"Condition": {
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub": "repo:3K-PokeClip@<OWNER_ID>/PokeClip-mono@<REPO_ID>:ref:refs/heads/develop"
  }
}
```

위 코드는 바꾼 뒤 조건의 설명용 발췌다. ID는 자리표시자로 바꿨다.

IAM 쓰기는 AI 쪽에서 실행하지 못했다. Claude Code의 자동 모드 분류기가 권한 변경을 거부했고, AI는 우회하지 않고 내가 직접 실행할 스크립트로 넘겼다. 첫 실행은 스크립트 결함으로 쓰기 전에 멈췄다. 역할이 그대로인 것을 읽기로 확인한 뒤, 고친 스크립트로 적용했다.

## 액세스 키에서 OIDC 역할로

신뢰 조건이 맞으면 워크플로는 작게 바뀐다. 이 워크플로는 원래 팀원이 맡은 파일이었다. 같은 파일을 고칠 예정이던 팀원에게 이 전환은 내 쪽에서 맡겠다고 알리고 진행했다([PR 279](https://github.com/3K-PokeClip/PokeClip-mono/pull/279)).

- `permissions`에 `id-token: write`를 더했다.
- `aws-actions/configure-aws-credentials@v4`에서 액세스 키 두 입력을 지우고 `role-to-assume`을 넣었다. 역할 ARN에는 계정 번호가 들어 있어 저장소 비밀 `AWS_DEPLOY_ROLE_ARN`에 넣었다.
- `role-duration-seconds: 3600`을 명시했다. 역할의 최대 세션이 1시간이고 잡 제한도 60분이다. 잡 시간을 늘리면 뒤쪽 AWS 호출이 세션 만료로 실패한다는 주석을 함께 달았다.
- "SCP로 보인다"던 머리 주석을 실제 원인으로 고쳤다.

역할 정책은 키 사용자와 같은 문서였다. 명령 실행(`ssm:SendCommand`)은 dev EC2 한 대로 제한했지만, 결과 읽기 권한은 대상이 `Resource: "*"`였다. 그중 쓰지 않던 결과 목록 조회(`ssm:ListCommandInvocations`)는 뒤에서 뺀다. 남은 `ssm:GetCommandInvocation`도 대상이 `*`라서, 명령 ID와 인스턴스 ID를 알면 다른 명령의 결과를 읽을 수 있다. 이 범위는 지금도 그대로다.

이 PR은 처음에 보안 검수 없이 PR 점검까지 갔다. 자격 증명과 IAM 신뢰를 바꾸는 변경인데 보안 검수 기록이 없다는 점을 PR 리뷰어가 HIGH로 지적했다. 그래서 보안 리뷰 에이전트와 Codex로 보안 검수를 따로 돌렸고, 둘 다 CRITICAL·HIGH 없이 통과했다.

머지 뒤 첫 배포 실행에서 OIDC 로그인 스텝은 1초 만에 성공했고, 잡 전체는 9분 33초 걸려 초록으로 끝났다. 8월에 막힌 뒤 처음으로 dev 배포가 키 없이 AWS에 들어갔다.

## ref 단위 신뢰는 생각보다 넓었다

보안 검수에서 머지를 막지는 않지만 꼭 닫아야 할 지적이 하나 나왔다. 신뢰 조건이 "이 배포 워크플로"가 아니라 **"develop ref에서 도는 모든 잡"** 단위라는 점이다. `sub`의 `ref:refs/heads/develop`에는 워크플로 이름이 없다. 같은 저장소에서 develop 기준으로 돌며 `id-token: write`를 가진 다른 잡도 같은 `sub`를 받는다. 우리 저장소에서는 이슈 댓글로 실행되는 Claude Code 워크플로가 그런 잡이었다. 당시에는 그 액션이 토큰 환경을 지워서 실제로는 막혀 있었고 사용 흔적도 없었다. 그래도 다른 액션의 구현에 기대는 방어였다.

닫는 방법으로 세 가지를 검토했다.

| 방법 | 범위 | 주의점 |
|---|---|---|
| **배포 잡을 GitHub environment로 묶고 sub를 environment 형식으로 (택함)** | "그 environment를 쓰는 잡". environment의 배포 브랜치 정책도 함께 적용 | 다른 워크플로가 같은 environment를 쓰지 않게 둬야 함 |
| 저장소 sub 템플릿에 워크플로 정보를 넣어 고정 | 특정 워크플로 | 저장소의 다른 OIDC 워크플로 sub도 모두 바뀜 |
| 다른 워크플로에서 `id-token` 권한 제거 (뺌) | 지금 있는 구멍 하나 | 우리 Claude Code 워크플로는 자기 인증에 OIDC가 필요해 이 권한을 빼면 멈춤. 신뢰 조건도 넓은 채로 남아 검토 중 후보에서 뺌 |

나는 AI가 추천한 environment 방식을 택했다. AI가 `dev-deploy` environment를 만들고 배포 브랜치를 develop 하나로 제한했다. 같은 작업에서 두 가지를 더 정리했다.

- `id-token: write`를 워크플로 맨 위에서 배포 잡으로 내렸다. 같은 파일에 잡이 추가돼도 그 잡이 역할을 자동으로 받지 않게 하려는 것이다.
- 역할 정책에서 쓰지 않던 `ssm:ListCommandInvocations`를 뺐다. 앞에서 말한 리전 단위 결과 목록 조회 권한이다.

<figure>
<video controls playsinline preload="none" poster="/images/pokeclip-github-oidc-immutable-subject-ref-vs-environment-poster.jpg" width="1920" height="1080" aria-label="신뢰 조건이 develop ref일 때는 배포 잡뿐 아니라 Claude Code 잡도 같은 sub라 신뢰 조건상 검문을 통과할 수 있지만, 조건을 environment dev-deploy로 좁히자 배포 잡만 통과하고 Claude Code 잡은 검문 앞에서 막히는 장면">
<source src="/videos/pokeclip-github-oidc-immutable-subject-ref-vs-environment.mp4" type="video/mp4">
</video>
<figcaption>develop ref 단위 신뢰는 같은 브랜치에서 토큰을 받는 다른 잡도 통과시킨다. environment 단위로 좁히면 그 environment를 쓰는 배포 잡만 통과한다. 당시 Claude Code 잡은 조건상 통과할 수 있었을 뿐, 실제로 자격을 받은 기록은 없다. 설명용 움직이는 그림이며 실제 화면이 아닙니다. 소재는 AI 생성, 소리는 없습니다.</figcaption>
</figure>

```yaml
permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: dev-deploy
    permissions:
      contents: read
      id-token: write
```

위 코드는 [PR 280](https://github.com/3K-PokeClip/PokeClip-mono/pull/280) 뒤 워크플로의 설명용 발췌다. 배포 스텝과 주석은 생략했다. 잡에 `permissions`를 주면 맨 위 값을 물려받지 않으므로 `contents: read`를 다시 적었다.

## 문서에 없는 형식은 두 걸음으로 옮겼다

environment 방식에는 함정이 하나 있다. 워크플로에 `environment:`를 붙이는 순간 토큰의 `sub`가 바뀐다. YAML이 먼저 바뀌면 신뢰 조건이 새 `sub`를 몰라 배포가 거부된다. 신뢰 조건이 먼저 바뀌면 옛 워크플로가 거부된다.

게다가 immutable 형식 저장소에서 environment `sub`가 정확히 어떤 꼴인지 GitHub 문서에는 예시가 없었다. `<prefix>:environment:dev-deploy`일 거라는 건 추론이었다. 추론한 값 하나만 두고 전환하면, 틀렸을 때 dev 배포가 다시 막힌다. 그래서 AI가 제안한 두 걸음 순서를 승인했다.

| 시점 | 신뢰 조건이 받는 `sub` | Claude Code | 확인 |
|---|---|---|---|
| PR 279 뒤 | ref 1값 | 켜짐 | 로그인 성공 |
| 1단계 | ref, environment 2값 | 끔 | PR 280 배포 성공, CloudTrail로 실제 sub 확인 |
| 2단계 | environment 1값 | 다시 켬 | PR 281 배포 성공 |

두 값을 받는 동안에는 옛 문제가 그대로 열려 있다. develop에서 도는 다른 OIDC 잡이 옛 값으로 들어올 수 있다. 보안 검수가 이 창을 HIGH로 지적했다. 이 변경이 새로 만든 위험은 아니었지만 그냥 둘 수는 없었다. 그래서 AI의 추천대로 1단계에 들어가기 전에 Claude Code 워크플로를 꺼 두기로 했다.

1단계에서는 옛 develop 값과 새 environment 값을 함께 받게 하고 PR 280을 머지했다. 첫 배포는 초록이었다. CloudTrail에서 그 로그인의 실제 `sub`가 `<prefix>:environment:dev-deploy` 꼴임을 확인했다. 추론이 맞았다. 2단계에서 옛 develop 값을 뺐고, 같은 날 Claude Code 워크플로를 다시 켰다. 주석만 고친 [PR 281](https://github.com/3K-PokeClip/PokeClip-mono/pull/281)의 배포로 environment 값 하나만 남은 상태에서도 로그인되는 것을 확인했다.

IAM 스크립트에는 "모르는 상태면 아무것도 쓰지 않는다"는 원칙을 넣었다. 1단계 스크립트는 문장 수·`Effect`·`Action`·공급자·조건 연산자·조건 키·`aud`가 예상과 하나라도 다르면 쓰기 전에 멈춘다. 조건 전체를 덮어쓰지 않고 `sub` 값 하나만 바꾼다. 이미 목표 상태면 건너뛰어서 중간에 멈춰도 다시 돌릴 수 있다. 처음 판은 조건 전체를 덮어썼는데, 리뷰가 이를 잡아 고쳤다.

되돌리기 갈래(`--rollback`)는 두 값 상태를 되살린다. 되살리면 노출 창도 다시 열리므로, Claude Code 워크플로가 꺼져 있고 실행 중인 것이 하나도 없을 때만 동작하게 했다. 실행 중인 것을 셀 때 `gh run list`는 기본 20개까지만 보여 준다. 리뷰에서 이 점이 지적돼 REST API로 대기·진행 중 상태 다섯 개의 `total_count`를 합하도록 바꿨다.

## 키는 쓰는 곳이 없다는 근거를 보고 지웠다

OIDC로 배포가 세 번 초록이 된 뒤 액세스 키를 정리했다. 지우기 전에 이 키를 배포 말고 다른 곳에서 쓰는지 CloudTrail 90일 기록(서울·us-east-1 관리 이벤트)을 모두 확인했다. 882건이 나왔고, 동작은 세 종류, 날짜는 24개였다. 그 24개 날짜가 모두 배포 실행 날짜와 겹쳤다. 날짜가 겹친다는 근거이지 다른 사용처가 없다는 증명은 아니다. 이 한계를 적어 둔 채로 진행했다.

키 비활성은 내가 실행했다. 비활성 상태로 지켜보는 기간은 두지 않고 바로 삭제하기로 결정했다. 삭제 스크립트는 내가 돌릴 차례였는데, AI가 내 "ㄱㄱ"를 실행 승인으로 읽고 먼저 실행했다. 스크립트가 다시 실행해도 안전하게 짜여 있어서, 내가 다시 돌렸을 때는 "이미 지워짐, 건너뜀"으로 끝났다. 결과는 같았지만 실행 주체가 어긋난 일이라 기록에 남겼다.

10월 19일 확인 기준으로 남은 액세스 키는 0개다. IAM 사용자는 키 없이 남겨 두었다. 저장소 비밀 `AWS_ACCESS_KEY_ID`와 `AWS_SECRET_ACCESS_KEY`도 지웠다. 남은 AWS 관련 비밀은 역할 ARN 하나다. 이 값은 자격 증명이 아니라 역할의 주소다.

## 아직 남은 것

이 신뢰의 실질적인 통제는 environment `dev-deploy`의 배포 브랜치 정책이다. 그런데 develop에는 PR 필수나 필수 체크 같은 보호 규칙이 없다. 이번에 새로 만든 `dev-deploy` environment에도 승인자를 두지 않았다. develop에 직접 push할 수 있는 사람은 사실상 dev 배포 역할을 쓸 수 있다는 뜻이다. develop 보호 규칙이 없는 것은 원래 있던 상태였고, environment 승인자는 이번에 만들면서 두지 않은 것이다. 두 장치 모두 이번 작업에서는 바꾸지 않았고, prod를 설계할 때 판단할 항목으로 남겼다. AWS는 OIDC 정책에 environment를 쓴다면 environment에 보호 규칙을 두라고 강하게 권하고, 그 방법으로 배포 브랜치 제한을 든다. [AWS IAM 문서](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html#idp_oidc_Create_GitHub) 우리는 그 제한만 두었고, 승인자나 develop 브랜치 보호처럼 그보다 강한 장치는 아직 없다.

prod는 v1을 내면서 develop을 main에 병합하고 main 기준으로 배포하기로 했다. 그때 OIDC 신뢰 조건을 main 브랜치와 승인자가 있는 prod environment로 좁힐 계획이다. prod 역할의 `sub`도 처음부터 immutable 형식이어야 한다. 아직 계획이고 구현하지 않았다.

## 정리

처음 질문은 "왜 OIDC가 거부됐나"였다. 답은 조직 정책이 아니라 우리 신뢰 정책의 문자열 하나였다. 8월 주석이 말한 "일치"가 STS가 실제로 받은 `sub`와 대조한 결과라는 기록은 없다. 실제 값은 처음부터 CloudTrail에 있었다.

전환하면서 배운 것은 세 가지다.

- `sub`는 두 층에서 바뀐다. 저장소·조직의 OIDC 설정(immutable 형식, sub 템플릿)과 워크플로 설정(environment 참조 여부)이다. 둘 중 하나를 바꿀 때는 신뢰 조건도 같은 걸음에서 바꿔야 한다.
- ref 단위 신뢰는 "이 워크플로"가 아니라 "그 브랜치에서 토큰을 받는 모든 잡"을 믿는다.
- 문서로 확인할 수 없는 형식은 옛 값과 새 값을 잠깐 함께 받으면서 실제 값을 관측한 뒤 좁힌다. 그 사이 열리는 창은 따로 닫는다.

## 출처

공식 문서(2026-11-07 확인):

- GitHub Changelog, 「Immutable subject claims for GitHub Actions OIDC tokens」(2026-04-23 발표, 2026-06-10 구분자 정정) — immutable 형식, 자동 적용 대상과 날짜. https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/
- GitHub Docs, 「OpenID Connect reference」 — `sub` 클레임 형식, 잡이 environment를 참조하면 ref 대신 environment가 들어가는 규칙. https://docs.github.com/en/actions/reference/security/oidc
- AWS IAM 사용 설명서, 「Create a role for OpenID Connect federation」 — GitHub OIDC 신뢰 정책의 `sub` 조건 필수 검사, environment 보호 규칙 권고. https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html#idp_oidc_Create_GitHub
- `aws-actions/configure-aws-credentials` v4 README — `role-to-assume`, `role-duration-seconds`(기본 3600초), OIDC에 필요한 `id-token: write`. https://github.com/aws-actions/configure-aws-credentials/blob/v4/README.md

작업 기록:

- [PR 279](https://github.com/3K-PokeClip/PokeClip-mono/pull/279) — dev 배포를 액세스 키에서 OIDC 역할로 전환.
- [PR 280](https://github.com/3K-PokeClip/PokeClip-mono/pull/280) — 배포 잡을 environment `dev-deploy`로 묶고 `id-token` 권한을 잡 단위로 내림.
- [PR 281](https://github.com/3K-PokeClip/PokeClip-mono/pull/281) — 2단계 뒤 머리 주석 정리.
- 원인 조사(IAM 공급자·신뢰 정책·저장소 OIDC 설정·CloudTrail 조회), IAM 변경 스크립트, 리뷰 기록, 배포 실행 결과는 비공개 작업 기록이다. 계정 번호와 숫자 ID는 글에서 가렸다.
