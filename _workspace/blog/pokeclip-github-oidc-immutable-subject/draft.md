---
title: "GitHub OIDC 거부는 SCP가 아니라 sub 형식 때문이었습니다"
date: "2026-11-07T04:48:02+09:00"
lastmod: "2026-11-10T22:55:49+09:00"
author: "김태윤"
categories: ["projects"]
draft: false
description: "PokeClip dev 배포의 GitHub Actions OIDC 거부를 두 달 동안 SCP 탓으로 알았지만, CloudTrail에 남은 실제 sub는 숫자 ID가 붙은 형식이었습니다. 10월 17일 신뢰 조건을 그 형식으로 고치고 신뢰 범위를 environment 단위로 두 걸음에 걸쳐 좁힌 뒤, 18일 액세스 키를 지웠습니다."
tags: ["PokeClip", "GitHub Actions", "OIDC", "IAM", "CI", "보안"]
---

PokeClip의 dev 배포 워크플로는 8월부터 두 달 동안 액세스 키로 AWS에 들어갔습니다. 8월에 붙인 GitHub Actions OIDC 로그인이 `Not authorized to perform sts:AssumeRoleWithWebIdentity`로 거부됐고, 당시에는 상위 조직의 SCP가 막는 것으로 보았기 때문입니다. 2026년 10월 17일에 CloudTrail 기록을 다시 보니 원인은 우리 신뢰 정책에 있었습니다. 토큰의 `sub`는 처음부터 소유자와 저장소 이름 뒤에 숫자 ID가 붙은 형식으로 오고 있었는데, 신뢰 정책은 이름 형식만 받고 있었습니다. 신뢰 조건을 그 형식으로 고치자 OIDC 로그인이 1초 만에 성공했고, 신뢰 범위를 environment `dev-deploy`를 쓰는 잡으로 좁힌 뒤 다음 날 액세스 키를 지웠습니다.

저는 이 전환을 맡아 운영 측에 권한을 문의하고, 원인 확인을 지시하고, AI가 제안한 신뢰 조건과 전환 순서를 검토해 승인했습니다. IAM을 바꾸는 스크립트는 대부분 제가 직접 실행했습니다. 조사, 워크플로 수정, 스크립트 작성, GitHub 설정은 AI 에이전트(Claude Code)가 했고, 리뷰는 Claude 리뷰어·Codex·보안 리뷰 에이전트가 함께 봤습니다. 8월에 OIDC 대신 액세스 키를 넣은 커밋은 원래 이 워크플로를 맡은 팀원의 작업입니다. 본문은 AI 에이전트가 초안을 쓰고 제가 확인했으며, 글의 움직이는 그림은 Claude Code가 Remotion으로 만들었습니다.

## STS는 토큰의 sub가 신뢰 조건과 맞아야 역할을 내줍니다

GitHub Actions의 OIDC(OpenID Connect) 로그인은 오래 쓰는 비밀 대신 실행마다 새로 받는 토큰을 씁니다. 잡에 `id-token: write` 권한이 있으면 GitHub가 서명한 JWT를 받을 수 있고, 이 토큰을 AWS STS(Security Token Service)의 `AssumeRoleWithWebIdentity`에 냅니다. STS는 역할의 신뢰 정책과 토큰의 클레임을 비교해 조건이 맞을 때만 임시 자격을 줍니다.

가장 중요한 클레임은 `sub`입니다. 토큰이 어느 저장소의 어떤 맥락에서 왔는지를 나타냅니다. AWS는 GitHub OIDC를 믿는 역할에 `token.actions.githubusercontent.com:sub` 조건을 반드시 두게 합니다. 조건이 없거나 값이 와일드카드뿐이면 신뢰 정책을 만들거나 고칠 때 오류가 납니다. 조건이 없으면 남의 저장소 워크플로도 내 역할을 받을 수 있기 때문입니다([AWS IAM 문서](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html#idp_oidc_Create_GitHub)).

`sub`의 꼴은 두 층에서 정해집니다. 저장소·조직의 OIDC 설정이 이름 형식인지 숫자 ID 형식인지를 정하고, 잡이 environment를 참조하는지가 끝부분을 정합니다. 브랜치에서 도는 잡은 `ref:refs/heads/<브랜치>`로 끝나고, environment를 참조하는 잡은 그 대신 `environment:<이름>`으로 끝납니다([GitHub Docs](https://docs.github.com/en/actions/reference/security/oidc)).

아래 그림에서 왼쪽 갈래가 `sub`의 앞부분을, 오른쪽 갈래가 끝부분을 정합니다. 우리 경우에는 왼쪽 설정이 처음부터 숫자 ID 쪽이었고, 오른쪽은 이번 전환에서 브랜치에서 environment로 바뀌었습니다.

```mermaid {#fig-sub-layers kind="개념도" caption="sub의 앞부분은 저장소·조직의 OIDC 설정이, 끝부분은 잡이 environment를 참조하는지가 정합니다. 신뢰 조건은 두 부분을 합친 문자열 전체와 비교됩니다." source="https://docs.github.com/en/actions/reference/security/oidc"}
flowchart TB
    accTitle: sub를 정하는 두 층
    accDescr: 저장소나 조직의 OIDC 설정(use_immutable_subject)이 sub의 앞부분을 이름 형식 또는 숫자 ID 형식으로 정하고, 잡의 environment 참조 여부가 끝부분을 브랜치 값 또는 environment 값으로 정한다. 두 부분을 합친 sub가 신뢰 조건과 비교된다.
    O[저장소·조직<br/>OIDC 설정] --> P[앞부분<br/>이름 또는 숫자 ID]
    E[잡의 environment 참조] --> T[끝부분<br/>브랜치 값 또는<br/>environment 값]
    P --> S[sub]
    T --> S
    S --> C{신뢰 조건과<br/>문자열 일치?}
```

| 형식 | develop 배포 잡의 sub |
|---|---|
| 이름 · 브랜치 | `repo:3K-PokeClip/PokeClip-mono:ref:refs/heads/develop` |
| 숫자 ID · 브랜치 | `repo:3K-PokeClip@<OWNER_ID>/PokeClip-mono@<REPO_ID>:ref:refs/heads/develop` |
| 숫자 ID · environment | `repo:3K-PokeClip@<OWNER_ID>/PokeClip-mono@<REPO_ID>:environment:dev-deploy` |

첫 줄은 8월 신뢰 정책이 받던 꼴, 둘째 줄은 토큰이 실제로 보낸 꼴, 셋째 줄은 마지막에 신뢰 조건에 남긴 꼴입니다. 숫자 ID는 공개 값이지만 읽기 쉽게 자리표시자로 바꿨습니다.

## CloudTrail에 남은 실제 sub가 신뢰 정책과 달랐습니다

PokeClip의 AWS 계정은 상위 조직에 속한 임시 대여 계정입니다. 10월 12일 엣지 인프라를 이 계정에 올리기로 하면서 저는 운영 측에 필요한 권한 몇 가지를 요청했고, GitHub OIDC의 `sts:AssumeRoleWithWebIdentity` 허용도 그중 하나였습니다. 답은 SCP가 막지 않으며 원인은 신뢰 정책이나 공급자 쪽으로 보인다는 것이었습니다.

그래서 문제가 정말 우리 쪽인지 1차 기록으로 확인하라고 지시했고, AI가 읽기 권한으로 네 곳을 봤습니다.

| 확인한 곳 | 결과 |
|---|---|
| IAM OIDC 공급자 | URL `token.actions.githubusercontent.com`, audience `sts.amazonaws.com`, 지문 1개. 정상 |
| 역할 `pokeclip-dev-deploy` 신뢰 정책 | `sub`를 `StringLike`로 두 값만 허용. 둘 다 이름 형식이고 저장소 이름의 대소문자만 다름 |
| 저장소 OIDC sub 설정([REST API](https://api.github.com/repos/3K-PokeClip/PokeClip-mono/actions/oidc/customization/sub)) | `use_immutable_subject: true` |
| CloudTrail `AssumeRoleWithWebIdentity`(서울 리전, 90일) | 8월 19일 48건, 모두 AccessDenied. 기록된 sub는 숫자 ID 형식 |

답은 마지막 줄에 있었습니다. 토큰의 `sub`에는 소유자와 저장소 이름 뒤에 `@숫자 ID`가 붙어 있었고, 신뢰 정책에는 이름만 있었습니다. 문자열이 다르니 STS는 48번 모두 거부했습니다. 8월 워크플로의 머리 주석은 "sub·audience·인증서 지문을 모두 맞췄다"고 적었지만, STS가 실제로 받은 `sub`와 대조한 기록은 없었습니다. 8월 커밋 메시지는 CloudTrail에 이벤트가 남지 않았다고 적었지만, 서울 리전 기록에는 거부 48건과 실제 `sub`가 남아 있었습니다.

## GitHub는 이름 재사용을 막으려고 sub에 숫자 ID를 붙였습니다

GitHub는 2026년 4월 23일, OIDC 토큰의 `sub`에 소유자 ID와 저장소 ID를 넣는 형식을 발표했습니다. 이름은 바꿀 수 있고, 지운 뒤 다른 사람이 같은 이름을 다시 쓸 수도 있습니다. 이름만 믿는 신뢰 정책은 그렇게 재사용된 이름의 저장소도 믿게 됩니다. 숫자 ID는 바뀌지 않으므로 이 위험이 없습니다.

6월 10일 Changelog 편집자 주로, 이름과 ID 사이 구분자가 `-`에서 `@`로 바뀌었다는 안내가 붙었습니다. 7월 15일 이후 새로 만들거나, 이름을 바꾸거나, 이전한 저장소는 자동으로 이 형식을 쓰고, 기존 저장소는 조직이나 저장소 단위로 직접 켜야 합니다([GitHub Changelog](https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/)).

우리 저장소는 2026년 7월 25일에 만들어졌으니, 7월 15일 이후 새로 만든 저장소라는 자동 적용 조건에 해당합니다. 누가 직접 켠 기록은 찾지 못했으므로 처음부터 자동 적용 대상이었다고 보는 것이 가장 그럴듯합니다. 확실한 것은 8월의 첫 시도부터 토큰이 이 형식으로 오고 있었고, 신뢰 정책이 그 형식을 몰랐다는 점입니다.

## 신뢰 조건을 숫자 ID 형식 한 값으로 바꿨습니다

고칠 곳은 신뢰 정책의 조건 하나였습니다. AI는 이름 형식 두 값을 지우고 `StringEquals`로 숫자 ID 형식의 develop 값 하나만 받게 하자고 제안했습니다. 이름 형식을 남겨 두면 이름 재사용을 막는다는 이 형식의 목적이 사라지기 때문입니다. 저는 이 안을 승인했습니다. 아래는 바꾼 뒤 조건의 발췌이며, ID는 자리표시자로 바꿨습니다.

```json
"Condition": {
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub": "repo:3K-PokeClip@<OWNER_ID>/PokeClip-mono@<REPO_ID>:ref:refs/heads/develop"
  }
}
```

IAM 쓰기는 AI 쪽에서 실행하지 못했습니다. Claude Code의 자동 모드 분류기가 권한 변경을 거부했고, AI는 우회하지 않고 제가 직접 실행할 스크립트로 넘겼습니다. 첫 실행은 스크립트 결함으로 쓰기 전에 멈췄고, 역할이 그대로인 것을 읽기로 확인한 뒤 고친 스크립트로 적용했습니다.

## 배포 워크플로를 액세스 키에서 OIDC 역할로 옮겼습니다

신뢰 조건이 맞으면 워크플로는 작게 바뀝니다. 이 워크플로는 원래 팀원이 맡은 파일이라, 같은 파일을 고칠 예정이던 팀원에게 이 전환은 제가 맡겠다고 알리고 진행했습니다([PR 279](https://github.com/3K-PokeClip/PokeClip-mono/pull/279)).

- `permissions`에 `id-token: write`를 더했습니다.
- `aws-actions/configure-aws-credentials@v4`에서 액세스 키 두 입력을 지우고 `role-to-assume`을 넣었습니다. 역할 ARN에는 계정 번호가 들어 있어 저장소 비밀 `AWS_DEPLOY_ROLE_ARN`에 넣었습니다.
- `role-duration-seconds: 3600`을 명시했습니다. 역할의 최대 세션이 1시간이고 잡 제한도 60분이라, 잡 시간을 늘리면 뒤쪽 AWS 호출이 세션 만료로 실패한다는 주석을 함께 달았습니다([configure-aws-credentials README](https://github.com/aws-actions/configure-aws-credentials/blob/v4/README.md)).
- "SCP로 보인다"던 머리 주석을 실제 원인으로 고쳤습니다.

역할 정책은 키 사용자와 같은 문서였습니다. 명령 실행(`ssm:SendCommand`)은 dev EC2 한 대로 제한돼 있었지만, 결과를 읽는 권한은 대상이 `Resource: "*"`였습니다. 그중 쓰지 않던 결과 목록 조회(`ssm:ListCommandInvocations`)는 뒤의 environment 1단계 IAM 스크립트에서 뺐습니다. 남은 `ssm:GetCommandInvocation`도 대상이 `*`라서 명령 ID와 인스턴스 ID를 알면 다른 명령의 결과를 읽을 수 있고, 이 범위는 지금도 그대로입니다.

이 PR은 처음에 보안 검수 없이 PR 점검까지 갔습니다. 자격 증명과 IAM 신뢰를 바꾸는 변경인데 보안 검수 기록이 없다는 점을 PR 리뷰어가 HIGH로 지적했고, 보안 리뷰 에이전트와 Codex로 따로 검수해 둘 다 CRITICAL·HIGH 없이 통과했습니다. 머지 뒤 [첫 배포 실행](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/39033721053)에서 OIDC 로그인 스텝은 1초 만에 성공했고, 잡 전체는 9분 33초 만에 초록으로 끝났습니다.

## develop 브랜치 단위 신뢰는 같은 브랜치의 다른 잡도 믿었습니다

보안 검수에서 머지를 막지는 않는 지적이 하나 나왔습니다. 등급은 보안 리뷰 MEDIUM, 두 리뷰어 LOW였고, prod 역할을 설계하기 전에 닫으라는 권고였습니다. 신뢰 조건이 "이 배포 워크플로"가 아니라 "develop 브랜치에서 도는 모든 잡" 단위라는 점입니다. `sub`의 `ref:refs/heads/develop`에는 워크플로 이름이 없으므로, 같은 저장소에서 develop 기준으로 돌며 `id-token: write`를 가진 다른 잡도 같은 `sub`를 받습니다.

우리 저장소에서는 이슈 댓글로 실행되는 Claude Code 워크플로가 그런 잡이었습니다. 당시에는 그 액션이 토큰 환경을 지워서 실제로는 막혀 있었고 사용 흔적도 없었지만, 다른 액션의 구현에 기대는 방어였습니다. 닫는 방법으로 세 가지를 검토했습니다.

| 방법 | 믿는 범위 | 주의점 |
|---|---|---|
| 배포 잡을 environment로 묶고 sub를 environment 형식으로 (택함) | 그 environment를 쓰는 잡. environment의 배포 브랜치 정책도 함께 적용 | 다른 워크플로가 같은 environment를 쓰지 않게 둬야 함 |
| 저장소 sub 템플릿에 워크플로 정보를 넣어 고정 | 특정 워크플로 | 저장소의 다른 OIDC 워크플로 sub도 모두 바뀜 |
| 다른 워크플로에서 `id-token` 권한 제거 | 지금 있는 구멍 하나 | Claude Code 워크플로는 자기 인증에 OIDC가 필요해 멈춤. 신뢰 조건도 넓은 채로 남음 |

저는 AI가 추천한 environment 방식을 택했습니다. AI가 `dev-deploy` environment를 만들고 배포 브랜치를 develop 하나로 제한했습니다. 같은 작업에서 `id-token: write`를 워크플로 맨 위에서 배포 잡으로 내려, 같은 파일에 잡이 추가돼도 그 잡이 역할을 자동으로 받지 않게 했습니다([PR 280](https://github.com/3K-PokeClip/PokeClip-mono/pull/280)). 아래는 그 뒤 워크플로의 발췌입니다. 잡에 `permissions`를 주면 맨 위 값을 물려받지 않으므로 `contents: read`를 다시 적었습니다.

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

## 문서에 없는 environment sub는 두 걸음으로 옮겼습니다

environment 방식에는 함정이 하나 있습니다. 워크플로에 `environment:`를 붙이는 순간 토큰의 `sub`가 바뀝니다. YAML이 먼저 바뀌면 신뢰 조건이 새 `sub`를 몰라 배포가 거부되고, 신뢰 조건이 먼저 바뀌면 옛 워크플로가 거부됩니다. 게다가 숫자 ID 형식 저장소의 environment `sub` 예시는 GitHub 문서에 없었습니다. 앞부분 뒤에 `environment:dev-deploy`가 붙을 거라는 것은 추론이었고, 추론한 값 하나만 두고 전환하면 틀렸을 때 dev 배포가 다시 막힙니다. 그래서 AI가 제안한 두 걸음 순서를 승인했습니다.

아래 영상에서 배포 잡의 경로는 세 단계 내내 통과합니다. 1단계부터 배포 잡 옆의 이름표가 보여 주듯 배포 잡 자신의 `sub`도 브랜치 값에서 environment 값으로 바뀌므로, 신뢰 조건이 잠시 두 값을 받아야 했습니다.

{{< motion scene="RefVsEnvironment" kind="개념도" caption="신뢰 조건이 받는 값을 브랜치 값에서 두 값(브랜치 값과 environment 값)을 거쳐 environment 값 하나로 옮겼습니다. 두 값을 받는 동안에는 Claude Code 잡을 꺼 두었고, 마지막에 다시 켠 Claude Code 잡은 environment가 없어 막힙니다. PR 279 뒤 Claude Code 잡은 조건상 통과할 수 있었을 뿐 실제로 자격을 받은 기록은 없습니다." >}}

| 시점 | 확인한 것 |
|---|---|
| PR 279 뒤 | [첫 배포](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/39033721053) 로그인 성공(브랜치 값) |
| 1단계 | PR 280 [배포](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/39040383023) 성공, CloudTrail에서 실제 `sub`가 `environment:dev-deploy`로 끝남 |
| 2단계 | PR 281 [배포](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/39042086329) 성공(environment 값 하나만 남은 상태) |

두 값을 받는 동안에는 옛 문제가 그대로 열려 있습니다. develop에서 도는 다른 OIDC 잡이 브랜치 값으로 들어올 수 있습니다. 보안 검수가 이 창을 HIGH로 지적했고, AI의 추천대로 1단계에 들어가기 전에 Claude Code 워크플로를 꺼 두기로 했습니다.

1단계에서 두 값을 받게 하고 PR 280을 머지하자 첫 배포가 초록이었고, CloudTrail에서 그 로그인의 실제 `sub`가 `environment:dev-deploy`로 끝나는 것을 확인했습니다. 추론이 맞았습니다. 2단계에서 브랜치 값을 뺐고, 같은 날 Claude Code 워크플로를 다시 켰습니다. 주석만 고친 [PR 281](https://github.com/3K-PokeClip/PokeClip-mono/pull/281)의 배포로 environment 값 하나만 남은 상태에서도 로그인되는 것을 확인했습니다.

IAM 스크립트에는 "모르는 상태면 아무것도 쓰지 않는다"는 원칙을 넣었습니다. 1단계 스크립트는 문장 수·`Effect`·`Action`·공급자·조건 연산자·조건 키·`aud`가 예상과 하나라도 다르면 쓰기 전에 멈추고, 조건 전체를 덮어쓰지 않고 `sub` 값 하나만 바꿉니다. 이미 목표 상태면 건너뛰므로 중간에 멈춰도 다시 돌릴 수 있습니다. 처음 판은 조건 전체를 덮어썼는데, 리뷰가 이를 잡아 고쳤습니다.

되돌리기 갈래(`--rollback`)는 두 값 상태를 되살리므로 노출 창도 다시 엽니다. 그래서 Claude Code 워크플로가 꺼져 있고 실행 중인 것이 하나도 없을 때만 동작하게 했습니다. 실행 중인 것을 셀 때 `gh run list`는 기본 20개까지만 보여 준다는 점을 리뷰가 지적해, REST API로 대기·진행 중 상태 다섯 개의 `total_count`를 합하도록 바꿨습니다.

## 다른 사용처가 없다는 근거를 보고 키를 지웠습니다

OIDC로 배포가 세 번 초록이 된 뒤 액세스 키를 정리했습니다. 지우기 전에 이 키를 배포 말고 다른 곳에서 쓰는지 CloudTrail 90일 기록을 모두 확인했습니다. 882건이 나왔고, 동작은 세 종류, 날짜는 24개였으며, 그 24개 날짜가 모두 배포 실행 날짜와 겹쳤습니다. 날짜가 겹친다는 근거이지 다른 사용처가 없다는 증명은 아니므로, 이 한계를 적어 둔 채로 진행했습니다.

키 비활성은 제가 실행했고, 비활성 상태로 지켜보는 기간은 두지 않고 바로 삭제하기로 했습니다. 삭제 스크립트는 제가 돌릴 차례였는데, AI가 제 "ㄱㄱ"를 실행 승인으로 읽고 먼저 실행했습니다. 스크립트가 다시 실행해도 안전하게 짜여 있어서 제가 다시 돌렸을 때는 "이미 지워짐, 건너뜀"으로 끝났습니다. 결과는 같았지만 실행 주체가 어긋난 일이라 기록에 남겼습니다.

10월 19일 확인 기준으로 남은 액세스 키는 0개입니다. IAM 사용자는 키 없이 남겨 두었고, 저장소 비밀 `AWS_ACCESS_KEY_ID`와 `AWS_SECRET_ACCESS_KEY`도 지웠습니다. 남은 AWS 관련 비밀은 역할 ARN 하나이고, 이 값은 자격 증명이 아니라 역할의 주소입니다.

## 실질 통제는 아직 배포 브랜치 정책 하나입니다

이 신뢰의 실질적인 통제는 environment `dev-deploy`의 배포 브랜치 정책입니다. 그 밖의 장치는 약합니다. develop은 보호 브랜치라 강제 push와 삭제는 막혀 있지만 PR 필수 규칙과 필수 체크는 없고, 이번에 만든 `dev-deploy`에는 승인자를 두지 않았습니다. 관리자 우회 허용(`can_admins_bypass`)도 기본값인 켜짐으로 남아 있습니다. 그래서 develop에 직접 push할 수 있는 사람은 사실상 dev 배포 역할을 쓸 수 있습니다. AWS는 OIDC 정책에 environment를 쓴다면 environment에 보호 규칙을 두라고 강하게 권하고 그 방법으로 배포 브랜치 제한을 드는데([AWS IAM 문서](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html#idp_oidc_Create_GitHub)), 우리는 그 제한만 두었고 승인자나 PR 필수 규칙 같은 더 강한 장치는 아직 없습니다.

10월 23일에는 v1을 낼 때 develop을 main에 병합하고 prod 배포는 main 기준 CI/CD로 돌리기로 정했습니다. 11월 3일 main 병합과 `v1.0.0` 태그는 끝났지만([PR 466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466)), prod CI/CD는 아직 켜지 않았습니다. prod용 OIDC 역할을 만들 때는 신뢰 조건을 main 브랜치와 승인자가 있는 prod environment로 좁히고, `sub`도 처음부터 숫자 ID 형식으로 쓸 계획입니다. 이 부분은 아직 구현하지 않았습니다.

## OIDC가 거부되면 CloudTrail의 실제 sub부터 봐야 합니다

8월의 주석은 설정 파일끼리 맞춰 본 결과였고, 실제 값은 처음부터 CloudTrail에 있었습니다. 이번 일에서 가져갈 판단은 세 가지입니다.

- OIDC가 거부되면 설정 파일을 다시 맞춰 보기 전에 CloudTrail에서 STS가 실제로 받은 `sub`부터 보십시오.
- `sub`는 저장소·조직의 OIDC 설정과 잡의 environment 참조라는 두 층에서 바뀝니다. 둘 중 하나를 바꿀 때는 신뢰 조건도 같은 걸음에서 바꿔야 합니다.
- 문서로 확인할 수 없는 형식은 옛 값과 새 값을 잠깐 함께 받으면서 실제 값을 관측한 뒤 좁힙니다. 그 사이 열리는 창은 따로 닫습니다.

## 측정 조건

- 기간(KST): 원인 조사부터 environment 2단계(PR 281 배포)까지는 10월 17일, 액세스 키 삭제는 10월 18일, 남은 키 0개 확인은 10월 19일입니다.
- CloudTrail: `AssumeRoleWithWebIdentity` 조회는 서울 리전 90일, 액세스 키 사용처 조회는 서울·us-east-1 관리 이벤트 90일입니다. 계정 번호와 사용자 이름은 글에서 뺐습니다.
- 배포 시간: GitHub Actions 실행 기록의 스텝·잡 시간입니다(OIDC 로그인 스텝 1초, 잡 9분 33초는 PR 279 머지 뒤 [첫 실행](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/39033721053)).
- 저장소 설정과 보호 규칙: GitHub REST API로 2026년 11월 10일에 다시 확인했습니다(`use_immutable_subject: true`, `dev-deploy` 보호 규칙은 배포 브랜치 정책 하나·관리자 우회 허용, AWS 관련 저장소 비밀은 역할 ARN 하나).
- 조사·스크립트·리뷰 기록은 비공개 작업 기록이고, 공개 근거는 아래 PR과 공식 문서입니다.

## 출처

- GitHub Changelog, 「Immutable subject claims for GitHub Actions OIDC tokens」(2026-04-23 발표, 2026-06-10 구분자 변경) — https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/ (2026-11-10 확인)
- GitHub Docs, 「OpenID Connect reference」 — `sub` 클레임 형식과 environment 규칙. https://docs.github.com/en/actions/reference/security/oidc
- AWS IAM 사용 설명서, 「Create a role for OpenID Connect federation」 — `sub` 조건 필수 검사, environment 보호 규칙 권고. https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html#idp_oidc_Create_GitHub
- `aws-actions/configure-aws-credentials` v4 README — `role-to-assume`, `role-duration-seconds`(기본 3600초), `id-token: write`. https://github.com/aws-actions/configure-aws-credentials/blob/v4/README.md
- [PR 279](https://github.com/3K-PokeClip/PokeClip-mono/pull/279) — dev 배포를 액세스 키에서 OIDC 역할로 전환
- [PR 280](https://github.com/3K-PokeClip/PokeClip-mono/pull/280) — 배포 잡을 environment `dev-deploy`로 묶고 `id-token` 권한을 잡 단위로
- [PR 281](https://github.com/3K-PokeClip/PokeClip-mono/pull/281) — 2단계 뒤 머리 주석 정리
- [PR 466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466) — v1.0.0 main 병합
- GitHub Actions 실행: [PR 279 뒤 첫 배포](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/39033721053), [PR 280 배포](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/39040383023), [PR 281 배포](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/39042086329)
- 저장소 OIDC sub 설정(공개 API) — https://api.github.com/repos/3K-PokeClip/PokeClip-mono/actions/oidc/customization/sub (2026-11-10 확인, `use_immutable_subject: true`)
