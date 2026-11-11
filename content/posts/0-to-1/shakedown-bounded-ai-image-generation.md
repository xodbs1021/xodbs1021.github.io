---
title: "AI에 맡기는 이미지 생성과 배포 판단의 범위부터 제한했습니다"
date: "2026-10-15T11:33:48+09:00"
lastmod: "2026-11-12T04:47:11+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "Shakedown(SoftBank Hackathon 2026 예선 산출물)에서 Dockerfile은 기존 파일과 규칙을 먼저 쓰고 규칙이 실패할 때만 Claude를 한 번 부르게 했습니다. 규모 판단은 소·중·대 카탈로그와 사용자 운영 입력 안에서만 고르게 했고, 150 RPS 요구에서 small을 고른 요청은 서버가 400으로 거부했습니다."
tags: ["개발 사례", "Shakedown", "Claude", "Docker", "AWS"]
portfolio_cases: []
portfolio_pages: [46, 47]
portfolio_edition: "2026-10-15-v2"
---

저장소를 받아 컨테이너 이미지와 AWS 배포 구성으로 바꾸는 일을 모델에 통째로 맡기면, 이미 Dockerfile이 있는 저장소에도 모델이 새 파일을 지어내고 150 RPS가 필요한 서비스에 small 구성이 그대로 저장될 수 있습니다. Shakedown은 SoftBank Hackathon 2026 예선 산출물로, 저장소 분석 · 이미지 생성 · 배포 · HTTP 시운전을 잇는 서비스입니다. 저는 모델이 손댈 수 있는 범위를 먼저 정했습니다. Dockerfile은 기존 파일과 규칙을 먼저 쓰고 규칙이 실패할 때만 Claude를 한 번 부릅니다. 규모는 소 · 중 · 대 세 구성 가운데 규칙이 허용한 것만 고를 수 있습니다. 2026년 10월 9일 실제 호출에서 규칙 밖의 Flask 저장소는 엔진 API 왕복 3.679초 만에 Dockerfile을 받아 빌드와 HTTP 200까지 갔고, 150 RPS 요구에서 small을 고른 요청은 HTTP 400으로 거부됐습니다.

규칙으로 안 될 때만 모델을 부르고 실패 진단을 정해진 형식으로 넘기라는 것, 소 · 중 · 대 중에서 AI가 고르는 기능은 제가 요청하고 제안했습니다. 구현과 실제 호출 실행은 개발에 쓴 AI(Codex와 Claude Code)가 했습니다. 이 글에서 「Claude」는 제품 안에서 Dockerfile을 만들고 규모를 판단하는 모델(기록상 `claude-sonnet-5-5`)을 가리킵니다.

## Dockerfile이 있으면 모델을 부르지 않았습니다 {#dockerfile이-있는데도-모델부터-호출할-필요는-없었습니다}

이미지 생성은 다섯 단계를 차례로 내려갑니다. 저장소에 Dockerfile이 있으면 그것을 씁니다. 없으면 지원 스택 규칙으로 만듭니다. 규칙이 실패하고 Claude가 연결돼 있을 때만 모델을 한 번 부르고, 모델이 준 Dockerfile을 검사한 뒤, 원본이 아닌 별도 사본에 써서 빌드합니다([`image_builder.py` 120–142행](https://github.com/SoftBankHackathon/shakedown/blob/44c92614047500f4278cb0af0beef3622f0cd09b/apps/engine/engine/image_builder.py#L120-L142)). 알려진 스택에까지 모델을 부르면 호출 비용과 지연이 붙고, 같은 저장소에서 매번 다른 파일이 나올 수 있습니다.

기존 Dockerfile이 있는데 읽지 못하거나 심볼릭 링크라서 규칙 단계가 실패해도 모델로 대체하지 않고 멈춥니다. 저장소가 정한 빌드 방법을 모델의 추측으로 덮어쓰지 않기 위해서입니다.

모델에 넘기는 것은 저장소 전체가 아니라 규칙이 실패한 이유입니다. 요청 형식 `dockerfile-fallback.v1`에는 실패 코드 · 단계 · 상세와 제한된 프로젝트 정보, 허용 지시어 · 공식 베이스 이미지 · 비root 사용자 같은 제약이 들어갑니다([`image_prompt.py` 19–42행](https://github.com/SoftBankHackathon/shakedown/blob/44c92614047500f4278cb0af0beef3622f0cd09b/apps/engine/engine/image_prompt.py#L19-L42)). 원본 코드 · README 본문 · 환경변수 값은 통째로 보내지 않습니다. 응답은 Dockerfile 하나 또는 `null`만 받습니다. 근거가 모자라면 모델이 없는 의존성이나 시작 명령을 지어내는 대신 `null`을 돌려주게 했고, 그러면 생성은 실패로 끝납니다.

갈래마다 어디서 멈추는지 그렸습니다. 청록 상자가 모델의 출력이 빌드로 가기 전에 지나는 검사이고, 점선은 모델을 부르지 않는 경로입니다.

```mermaid {#fig-image-generation-order kind="재구성" caption="이미지 생성 순서. 기존 Dockerfile이나 지원 스택 규칙으로 만들 수 있으면 모델을 부르지 않고 별도 사본에서 빌드합니다. 규칙이 실패하면 Claude를 한 번 부르고, null이거나 형식 · 금지 요소 검사를 통과하지 못하면 생성 실패로 끝납니다. PR #11 병합본 image_builder.py의 재구성입니다." source="https://github.com/SoftBankHackathon/shakedown/blob/44c92614047500f4278cb0af0beef3622f0cd09b/apps/engine/engine/image_builder.py#L120-L142"}
flowchart TB
  accTitle: 이미지 생성 순서
  accDescr: 기존 Dockerfile이 있으면 그대로 별도 사본에서 빌드한다. 없으면 지원 스택 규칙으로 만들고, 성공하면 빌드한다. 규칙이 실패하면 Claude를 한 번 부르고, null이면 생성 실패, Dockerfile이면 형식과 금지 요소 검사를 거쳐 통과하면 별도 사본에서 빌드하고 불통과면 생성 실패다.
  d[기존 Dockerfile] -->|없음| r[지원 스택 규칙]
  r -->|실패| c[Claude 1회]
  c -->|Dockerfile| v[형식 · 금지 요소 검사]
  v -->|통과| b[별도 사본에서 빌드]
  c -->|null| f[생성 실패]
  v -->|불통과| f
  d -.->|있음| b
  r -.->|성공| b
  style v fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

규칙으로 만들 수 있는 저장소는 모델을 거치지 않고, 모델이 만든 파일은 검사를 통과해야만 빌드로 넘어갑니다.

## 운영 요구는 사용자 입력으로 받았습니다 {#소스-코드만으로-운영-요구를-알아낼-수는-없었습니다}

같은 코드라도 피크 트래픽과 허용할 수 있는 중단 시간은 서비스마다 다릅니다. 저장소에서 DB나 세션을 쓰는지는 읽을 수 있어도, 몇 명이 쓰는지는 읽을 수 없습니다. 그래서 규모 판단은 사용자가 넣은 피크 RPS · 가용성 요구 · 트래픽 변화를 받고, 이 값이 비어 있으면 계획을 저장하지 못하게 했습니다.

판단은 규칙이 먼저 합니다. 피크가 100 RPS를 넘으면 large, 10 RPS를 넘으면 medium이 최소 등급이고, 높은 가용성이나 급증 트래픽을 고르면 최소 medium입니다([`architecture.py` 96–127행](https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/apps/engine/engine/architecture.py#L96-L127)). 최소 등급 이상의 구성만 허용 목록에 오르고, Claude는 그 목록 안에서 템플릿 id · 이유 · 분석 근거 id만 돌려줍니다. 목록 밖의 템플릿이나 존재하지 않는 근거 id를 답하면 응답 전체를 버립니다([153행](https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/apps/engine/engine/architecture.py#L153)). 사용자가 목록 밖의 구성을 고르면 서버가 HTTP 400으로 거부합니다([220행](https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/apps/engine/engine/architecture.py#L220) · [`api.py` 52–56행](https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/apps/engine/engine/api.py#L52-L56)).

규모 선택에서는 규칙이 먼저 바닥을 정하고, 모델과 사용자는 그 위에서만 고릅니다. 청록 상자가 그 검사입니다.

```mermaid {#fig-plan-selection-gate kind="재구성" caption="규모 선택 검사. 사용자 운영 입력으로 규칙이 최소 등급을 계산하고, Claude의 답과 사용자의 선택이 모두 최소 등급 이상일 때만 계획으로 저장합니다. 아니면 HTTP 400입니다. 저장해도 AWS 자원은 아직 만들어지지 않습니다. PR #12 병합본 architecture.py · api.py의 재구성입니다." source="https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/apps/engine/engine/architecture.py#L96-L127"}
flowchart TB
  accTitle: 규모 선택 검사
  accDescr: 운영 입력인 피크 RPS, 가용성, 급증 여부로 규칙이 최소 등급을 계산한다. Claude의 답과 사용자 선택이 최소 등급 이상이면 계획을 저장하지만 자원은 아직 만들지 않고, 아니면 HTTP 400이다.
  i[운영 입력<br/>피크 RPS · 가용성 · 급증] --> m[규칙이 최소 등급 계산]
  m --> a[Claude 답과 사용자 선택이<br/>최소 등급 이상인가]
  a -->|예| k[계획 저장<br/>자원은 아직 없음]
  a -->|아니오| e[HTTP 400]
  style a fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

검사를 지나지 못한 선택은 저장되지 않으므로 배포로도 이어지지 않습니다. 고를 수 있는 세 구성은 다음과 같습니다.

| 구성 | 태스크당 CPU / 메모리 | 태스크 수 | AZ |
|---|---|---|---|
| small | 0.5 vCPU / 1 GiB | 1 | 1 |
| medium | 1 vCPU / 2 GiB | 2–4 | 2 |
| large | 2 vCPU / 4 GiB | 3–12 | 3 |

세 구성의 값과 10 · 100 RPS 경계는 첫 부하 시험 후보를 정하려고 둔 초기 가정입니다([카탈로그 24–34행](https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/apps/engine/engine/architecture.py#L24-L34)). large가 150 RPS를 처리한다는 시험 성적은 아닙니다. 임의의 IaC를 만들게 하는 것보다 고를 수 있는 폭은 좁지만, 모델이 제안할 수 있는 자원 · 권한 · 비용의 상한이 세 구성으로 정해지고 서버가 실행 전에 다시 볼 항목도 정해집니다. 지금 세 구성은 HTTP 컨테이너 서비스만 다루고, 워커 · 배치 · 정적 사이트는 판단을 막습니다.

## small 선택은 400으로 거부됐습니다 {#생성-성공과-잘못된-선택의-거부를-따로-확인했습니다}

2026년 10월 9일 [실제 Claude 호출 보고서](https://github.com/SoftBankHackathon/shakedown/blob/0147f4774443568becab4421ee1b7c8d86b25513/docs/experiments/2026-10-09-live-ai.md#L7-L16)에 이미지 생성 1회와 규모 판단 3회를 남겼습니다. 생성 시험에는 Dockerfile 없이 `requirements.txt`(Flask 3.1.0 · gunicorn 23.0.0)와 `app.py`만 둔 Flask 앱을 썼습니다. 규칙이 이 구성을 지원하지 않아 Claude를 불렀고, 받은 Dockerfile은 구조 검사를 통과했습니다. python:3.12-slim · 비root 사용자 · 5000 포트 · gunicorn 실행이 들어 있었고, 실제로 빌드한 이미지를 0.5 CPU / 1 GiB로 띄워 HTTP 200과 예상한 JSON을 받았습니다.

| 시험 | 입력 | 결과 | 엔진 API 왕복 |
|---|---|---|---|
| Dockerfile 생성 | 규칙 밖 Flask 앱 | AI 생성 · 구조 검사 통과 | 3.679초 |
| 규모 판단 | 5 RPS · 일시 중단 허용 · 일정한 트래픽 | small | 3.876초 |
| 규모 판단 | 50 RPS · 높은 가용성 · 급증 가능 | medium | 4.551초 |
| 규모 판단 | 150 RPS · 높은 가용성 · 급증 가능 | large | 4.434초 |
| 선택 저장 | 150 RPS 계획에서 small 선택 | HTTP 400 거부 | — |
| 선택 저장 | 같은 계획에서 large 선택 | HTTP 200 저장 | — |

영상의 왼쪽은 Flask 저장소가 생성 단계를 내려간 경로이고, 오른쪽은 150 RPS 계획에서 두 선택이 갈린 곳입니다.

{{< motion scene="GenerationAndPlanGates" id="fig-generation-and-plan-gates-run" kind="개념도" caption="2026년 10월 9일 실제 호출 두 건의 경로. 왼쪽: 기존 Dockerfile이 없고 규칙도 지원하지 않는 Flask 저장소가 Claude 1회 호출(엔진 API 왕복 3.679초)과 검사를 지나 별도 사본에서 빌드되고 HTTP 200을 받습니다. 오른쪽: 150 RPS · 높은 가용성 · 급증 요구로 최소 등급이 large가 된 계획에서 small 선택은 HTTP 400으로 멈추고 large 선택만 저장됩니다. 순서를 보여 주는 설명용 그림이며 시간 비율은 실제와 다릅니다." >}}

모델이 답을 냈다는 것과 그 답이 실행으로 넘어간다는 것은 다른 일이었습니다. 400은 모델이 아니라 서버가 낸 응답입니다.

세 판단은 모두 규칙이 계산한 최소 등급과 같은 답이었습니다. 그래서 이 시험은 모델이 범위 안에서 답하고 서버가 범위 밖 선택을 막는다는 것을 보여 줄 뿐, 모델이 규칙보다 나은 구성을 골랐다는 근거는 아닙니다. 시간은 모두 한 번씩 잰 값이라 지연 분포나 모델 품질을 비교하는 수치도 아닙니다. 토큰 사용량과 청구액은 엔진 응답에 없어 재지 못했습니다.

## 팀원이 만든 기반 위에서 순서와 거부 조건을 정했습니다 {#팀-기반-위에서-맡은-경계}

이 기능은 팀원 세 명의 기반 위에 올렸습니다. HTTP 시운전과 원인 보고서, 초기 ECS · ALB · RDS 어댑터, 초기 보안 게이트가 팀원의 작업입니다([고정 커밋의 작업 회고](https://github.com/SoftBankHackathon/shakedown/blob/078cb687d516aa50a95f3994ba099f0ec776914a/docs/retrospectives/2026-10-10-taeyun-engineering.md)). 제 몫은 기존 파일 → 규칙 → 모델의 순서, 모델에 넘길 실패 진단, 운영 요구 입력, 서버가 거부할 선택을 정한 것입니다. 이미지 생성 변경은 [PR #11](https://github.com/SoftBankHackathon/shakedown/pull/11), 규모 판단과 배포 연결은 [PR #12](https://github.com/SoftBankHackathon/shakedown/pull/12)에 들어갔습니다. 두 PR은 2026년 10월 10일 13시 12분(KST)에 리뷰 0건으로 제가 직접 병합했습니다.

검증하지 않은 범위도 있습니다. Dockerfile 형식 검사는 실행 샌드박스가 아니고, 빌드가 실패했을 때 모델이 다시 고치는 반복도 없습니다. 이 시험은 AWS 자원을 만들지 않았고, 화면에서 시작해 보안 검사 · Claude · AWS 배포까지 한 번에 이어지는 시험도 아닙니다. 저장한 계획을 실제 AWS 자원으로 옮긴 결과는 [계획 적용 글](/posts/0-to-1/shakedown-plan-deployment-and-recovery/)에 있습니다.

모델에 생성이나 판단을 맡길 때는 프롬프트보다 먼저 출력이 지나갈 검사와, 검사가 거부했을 때 멈출 위치를 정하십시오. 그래야 모델이 틀린 답을 내도 그 답이 실행되지 않습니다.

## 측정 조건

- 2026년 10월 9일, 로컬 엔진에 사용자가 연결한 API 키로 실행했습니다. 모델은 `claude-sonnet-5-5`이고, 실행은 개발에 쓴 AI가 했습니다.
- 시간은 엔진 API 요청 한 번의 왕복 시간이며 모델 응답 시간을 포함합니다. 시험마다 1회입니다.
- 규모 판단 입력은 5 RPS · 일시 중단 허용 · 일정한 트래픽 / 50 RPS · 높은 가용성 · 급증 가능 / 150 RPS · 높은 가용성 · 급증 가능입니다([보고서 10–12행](https://github.com/SoftBankHackathon/shakedown/blob/0147f4774443568becab4421ee1b7c8d86b25513/docs/experiments/2026-10-09-live-ai.md#L10-L12)).
- 생성 이미지는 0.5 CPU / 1 GiB 제한, 127.0.0.1에만 묶은 포트, 추가 권한 · 호스트 마운트 없이 실행했습니다. AWS 자원은 만들지 않았습니다.
- 코드 인용은 PR #11 병합 커밋 `44c9261`과 PR #12 병합 커밋 `3ffbcb0`이고, PR 상태는 2026년 11월 12일에 확인했습니다.

## 출처

- [SoftBankHackathon/shakedown 「실제 Claude API 및 생성 이미지 실행 검증 — 2026-10-09」](https://github.com/SoftBankHackathon/shakedown/blob/0147f4774443568becab4421ee1b7c8d86b25513/docs/experiments/2026-10-09-live-ai.md) — Flask 생성 · 규모 판단 3회 · 400/200
- [SoftBankHackathon/shakedown `apps/engine/engine/image_builder.py`](https://github.com/SoftBankHackathon/shakedown/blob/44c92614047500f4278cb0af0beef3622f0cd09b/apps/engine/engine/image_builder.py#L120-L142) — 기존 파일 · 규칙 · Claude 1회 · 검사 순서
- [SoftBankHackathon/shakedown `apps/engine/engine/image_prompt.py`](https://github.com/SoftBankHackathon/shakedown/blob/44c92614047500f4278cb0af0beef3622f0cd09b/apps/engine/engine/image_prompt.py#L19-L42) — `dockerfile-fallback.v1` 요청 형식
- [SoftBankHackathon/shakedown `apps/engine/engine/architecture.py`](https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/apps/engine/engine/architecture.py#L96-L127) — 최소 등급 규칙 · 카탈로그 · 허용 목록 검사
- [SoftBankHackathon/shakedown `apps/engine/engine/api.py`](https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/apps/engine/engine/api.py#L52-L56) — 판단 오류의 HTTP 400 응답
- [SoftBankHackathon/shakedown PR #11](https://github.com/SoftBankHackathon/shakedown/pull/11) — Claude API 연결과 규칙 우선 Docker 이미지 생성(2026-10-10 병합)
- [SoftBankHackathon/shakedown PR #12](https://github.com/SoftBankHackathon/shakedown/pull/12) — AI 아키텍처 판단과 배포 연결(2026-10-10 병합)
- [SoftBankHackathon/shakedown 작업 회고(고정 커밋)](https://github.com/SoftBankHackathon/shakedown/blob/078cb687d516aa50a95f3994ba099f0ec776914a/docs/retrospectives/2026-10-10-taeyun-engineering.md) — 기여 범위와 팀 기반의 구분
- 개인 결정 기록(비공개) — 2026년 10월 9일 규칙 우선 · 실패 진단 규격화 요청과 소 · 중 · 대 판단 제안

---

[개발 사례 전체 모음](/posts/0-to-1/portfolio-engineering-notes/) · [같은 판의 포트폴리오 PDF](/portfolio/2026-10-15-v2/full.pdf#page=46)
