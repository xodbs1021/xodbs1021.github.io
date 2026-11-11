---
title: "미디어 CI를 경로 필터로 좁히자 필수 체크를 포기해야 했습니다"
date: "2026-10-15T11:40:52+09:00"
lastmod: "2026-11-12T05:01:54+09:00"
draft: false
author: "김태윤"
description: "웹·서비스 PR마다 뜨던 PokeClip 미디어 CI 체크를 워크플로 수준 paths 필터로 없애면서, 그 체크를 기다리던 브랜치 보호의 필수 체크 media-gate를 먼저 풀어야 했던 결정(PR #163, 2026-09-04). 기각한 세 안, 보호 먼저 해제 → 병합 순서와 그 반대인 롤백, 229행 → 172행으로 줄었지만 같은 검사 본문, 그리고 내용 검사 필수 체크 0개와 3,000파일 fail-open이라는 대가까지."
categories: ["0-to-1"]
tags: ["PokeClip", "GitHub Actions", "CI", "팀 협업"]
portfolio_cases: [34]
portfolio_pages: [35]
portfolio_edition: "2026-10-15-v2"
---

PokeClip은 웹, Spring 서비스, Go 미디어 코드를 한 저장소에 둡니다. 2026년 9월 초 팀원 두 명이 자기 영역 PR에도 미디어 CI가 뜬다며 불편을 말했습니다. 미디어 검사 본문은 이미 미디어가 바뀐 PR에서만 돌았지만, 브랜치 보호가 `media-gate`라는 체크를 필수로 기다렸기 때문에 모든 PR에 그 결과가 필요했습니다. 워크플로를 경로 필터(`paths`)로 좁혀 미디어와 무관한 PR에서 체크를 없앴고, 그 대가로 필수 체크를 풀었습니다. 지금은 미디어 검사가 실패해도 브랜치 보호가 병합을 막지 않습니다.

2026년 9월 3일 네 가지 안 중 B안을 제가 골랐고, 계획 단계에서 나온 「보호를 먼저 풀고 그다음 병합한다」는 순서도 제가 승인해 확정했습니다. 구현은 AI(Claude Code)가 했고, 계획과 코드는 Claude Code와 Codex가 검토했습니다. Codex의 코드 검수는 [PR #163](https://github.com/3K-PokeClip/PokeClip-mono/pull/163)에서 `check` 잡 하나만 돌아 성공하는 것을 확인했습니다. PR #163은 제 승인 뒤 9월 4일 01시 12분(한국 시각)에 develop으로 병합됐습니다.

## 비싼 검사는 이미 미디어 변경에서만 돌고 있었습니다 {#비싼-테스트는-이미-조건부였다}

변경 전 media-ci 워크플로는 모든 PR에서 시작했습니다. 안의 `changes` 잡이 미디어 변경 여부를 판별해, 미디어가 바뀐 PR에서만 비싼 `check` 잡(gofmt·lint·vet·race 테스트·커버리지)을 돌렸습니다. 마지막의 `media-gate` 잡은 그 결과를 모아 브랜치 보호에 보고했습니다. 웹 PR #157에서는 `changes`가 3초, `media-gate`가 4초 돌았고 `check`는 건너뛰었습니다. 비용은 거의 없었지만, 팀원 PR의 체크 목록에는 자기와 무관한 두 줄이 매번 떴습니다.

[[fig-media-ci-before-after]]의 위쪽이 변경 전, 아래쪽이 변경 후입니다. 위쪽에서 모든 PR이 `media-gate`를 거쳐 필수 체크로 가는 길을 보십시오.

```mermaid {#fig-media-ci-before-after kind="재구성" caption="변경 전에는 모든 PR에서 media-ci가 시작해 changes 잡이 미디어 변경을 판별하고, 미디어 변경일 때만 check가 돌며, media-gate가 결과를 모아 브랜치 보호의 필수 체크로 보고했습니다. 변경 후에는 워크플로 수준 paths 필터가 미디어 변경 PR에서만 워크플로를 시작하고 check 하나만 돕니다. PR #163 병합 전후 media-ci.yml 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/pull/163/files"}
flowchart TB
  accTitle: 변경 전후의 media-ci 구조
  accDescr: 변경 전에는 모든 PR에서 changes 잡이 미디어 변경을 판별하고, 미디어 변경일 때만 check가 돌고 그 밖에는 건너뛰며, media-gate가 결과를 모아 브랜치 보호의 필수 체크로 보고한다. 변경 후에는 paths 필터가 미디어 변경 PR에서만 워크플로를 시작해 check 하나만 돌고, 그 밖의 PR에는 media-ci 체크가 없다. 필수 체크도 없다.
  BH(["변경 전 · 모든 PR에서 시작"]) --> B1["changes 잡"]
  B1 -->|"미디어 변경"| B2["check 잡"]
  B1 -->|"그 밖"| B3["건너뜀"]
  B2 --> B4["media-gate 잡"]
  B3 --> B4
  B4 --> B5["브랜치 보호의<br/>필수 체크"]
  B5 ~~~ AH(["변경 후"])
  AH --> A1["paths 필터"]
  A1 -->|"미디어 변경"| A2["check 잡"]
  A1 -->|"그 밖"| A3["media-ci<br/>체크 0개"]
  style B5 fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

경로 필터만 추가하면 끝날 일이 아니었습니다. [GitHub Actions 문서](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushpull_requestpull_request_targetpathspaths-ignore)는 경로 필터로 건너뛴 워크플로의 체크가 「Pending」으로 남고, 그 체크를 필수로 요구하는 PR은 병합이 막힌다고 설명합니다. 워크플로가 시작하지 않으면 `media-gate`도 생기지 않고, 보호는 오지 않을 결과를 기다립니다.

## 표시를 없애려면 필수 체크를 포기해야 했습니다 {#필수-체크를-유지할지-표시를-없앨지-선택했다}

필수 체크를 지키려면 모든 PR에 체크가 생겨야 하고, 체크를 없애려면 필수에서 빼야 합니다. 둘은 함께 가질 수 없었습니다. 네 가지 안을 놓고 골랐습니다([공개 결정 기록](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/docs/decisions/2026-09-04-media-ci-%EA%B2%BD%EB%A1%9C%ED%95%84%ED%84%B0-%EC%A0%84%ED%99%98.md#L39-L48)).

| 안 | 내용 | 결과 |
|---|---|---|
| A | `changes`를 `media-gate` 안으로 접어 체크를 두 줄에서 한 줄로, 보호 유지 | 기각 — 팀원 PR 목록에 media-ci가 여전히 남음 |
| **B** | 워크플로 수준 `paths`로 바꾸고 main·develop 보호에서 `media-gate` 제거 | **채택** |
| C | develop 보호에서만 제거, main은 유지 | 기각 — 체크 줄은 그대로 뜨고, 미디어 결함이 develop에 쌓였다가 릴리스 PR에서 한꺼번에 막힘 |
| D | 코드는 두고 팀에 「3~4초, 비용 0, 차단 0」을 설명 | 기각 — 불편의 실체는 비용이 아니라 보이는 것 |

저장소 규칙(ruleset)의 「필수 워크플로」는 경로 필터로 건너뛴 실행을 통과로 치는지 문서로 확인하지 못해 범위 밖에 뒀습니다. B안을 고르면서 내용을 검사하는 필수 체크가 저장소에서 0개가 되는 것을 받아들였습니다. main에 남는 필수 체크 `main-source-gate`는 PR을 올린 브랜치가 develop이나 `hotfix/*`인지만 봅니다([`main-source.yml`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/main-source.yml#L31-L43)).

## 보호를 먼저 풀고 병합했고, 되돌릴 때는 워크플로부터 되살립니다 {#적용과-롤백의-순서는-서로-반대다}

순서를 거꾸로 하면 PR이 모두 멈춥니다. 영상의 위 줄은 워크플로부터 바꿨을 때, 아래 줄은 보호를 먼저 풀었을 때입니다. 위 줄에서는 웹 PR과 미디어 PR이 모두 Pending에 묶이는 것을 보십시오.

{{< motion scene="ProtectionFirstOrder" id="fig-protection-first-order" kind="개념도" caption="워크플로부터 바꾸면 보호는 여전히 media-gate를 필수로 기다리는데 새 워크플로는 그 체크를 만들지 않아, 웹 PR과 미디어 PR이 모두 Pending에 묶입니다. 보호에서 media-gate를 먼저 빼면 웹 PR에는 media-ci 체크가 0개, 미디어 PR에는 check 1개가 생겨 성공합니다. PR #163의 계획과 병합 직후 임시 PR 두 개의 확인을 바탕으로 한 설명용 그림입니다." >}}

웹 PR은 워크플로가 시작하지 않아서, 미디어 PR은 새 워크플로에 `media-gate` 잡이 없어서 같은 체크를 기다리게 됩니다. 그래서 보호의 필수 체크 목록에서 `media-gate`를 먼저 빼고 PR #163을 병합했습니다. 보호 설정은 코드 리뷰에 보이지 않는 외부 의존이라, 순서를 PR 본문과 결정 기록에 적어 뒀습니다.

병합 직후 두 개의 임시 PR로 결과를 확인하고 닫았습니다. 문서만 바꾼 [PR #164](https://github.com/3K-PokeClip/PokeClip-mono/pull/164)에는 media-ci 실행이 0건이었습니다(다른 워크플로의 리뷰 체크 하나만 떴습니다). `media/.golangci.yml` 한 줄만 바꾼 [PR #165](https://github.com/3K-PokeClip/PokeClip-mono/pull/165)에서는 `check`가 3분 8초 돌아 성공했습니다([실행 기록](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/33777358550)). 그때 열려 있던 다른 PR 중 새로 막힌 PR은 0건이었습니다(비공개 작업 기록).

되돌릴 때는 순서가 반대입니다. 필수 체크부터 다시 걸면, 아직 `media-gate`를 만들지 않는 워크플로 때문에 모든 PR이 Pending에 묶입니다. 그래서 병합 커밋을 되돌린 PR을 먼저 병합하고, 그 브랜치를 대상으로 한 PR에 `media-gate` 체크가 실제로 생기는지 본 뒤에 보호를 다시 겁니다. 되돌릴 브랜치는 그때의 상태에 따라 다릅니다. main이 아직 옛 세 잡 구조면 develop만 되돌리고, main에도 새 구조가 들어간 뒤면 두 브랜치를 모두 되돌립니다([PR #163 본문](https://github.com/3K-PokeClip/PokeClip-mono/pull/163)의 롤백 절). 2026년 11월 12일에는 main의 media-ci에도 `media-gate` 잡이 없으므로 두 브랜치를 모두 되돌려야 합니다.

## 검사 본문은 그대로 두고 워크플로만 229행에서 172행으로 줄었습니다

바꾼 것은 「언제 돌릴지」뿐이고 「무엇을 검사할지」는 그대로입니다. 병합 커밋 `ce16cfc`의 `media-ci.yml`은 172행, 그 부모 `172f022`는 229행입니다. 옛 파일의 70–201행과 새 파일의 41–172행, 132행이 `check` 잡 본문이고 diff로 비교하면 같습니다. 80행을 지우고 23행을 더해 57행이 줄었고, 지운 것은 `changes`·`media-gate` 잡과 경로 판별 액션(`dorny/paths-filter`) 의존입니다.

| 확인한 것 | 결과 |
|---|---|
| `check` 잡 본문 | 변경 전후 diff 없음(132행) |
| 워크플로 분량 | 229행 → 172행 |
| PR #163 자신의 실행 | `check` 1개, 1분 30초 성공, `changes`·`media-gate` 없음([실행 기록](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/33775776891)) |
| 감지 경로 | 당시 3종: `media/**`, 이 워크플로 파일, 루트 `docker-compose.yml` |

루트 `docker-compose.yml`을 넣은 것은 미디어 계약 테스트 두 개가 그 파일을 직접 읽기 때문입니다. 감지 경로는 손으로 관리합니다. 2026년 11월 12일 develop에서는 운영 SQL과 런타임 런북 경로가 더해져 5종입니다([`media-ci.yml` 12–25행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/media-ci.yml#L12-L25)). 이 확인으로 알 수 있는 것은 검사 내용이 줄지 않았다는 것까지입니다. 이후 PR들의 실행 시간이나 비용이 얼마나 줄었는지는 재지 않았습니다.

## 빨간불이어도 병합이 막히지 않는 자리는 병합 승인자가 확인합니다 {#검사-성공과-강제-병합-차단은-별개다}

검사 내용이 같아도 병합 정책은 달라졌습니다. 대가는 두 가지입니다.

- **내용을 검사하는 필수 체크가 0개입니다.** 미디어 코드가 빨간불이어도 병합 버튼은 눌립니다. 이 저장소의 병합은 제 승인 뒤에만 하므로, 병합 전에 초록불을 눈으로 확인하는 것이 운영상 대체입니다.
- **변경 파일이 3,000개를 넘는 PR은 검사 없이 병합될 수 있습니다.** GitHub는 diff가 3,000개 파일을 넘고 필터에 맞는 파일이 앞의 3,000개 안에 없으면 워크플로를 실행하지 않습니다([GitHub 문서](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#git-diff-comparisons)). 필수 체크도 아니므로 아무것도 막지 않는 fail-open입니다. 완화책은 큰 PR을 나누는 것뿐입니다.

2026년 11월 12일 GitHub API로 본 보호 설정에서 main의 필수 체크는 `main-source-gate` 하나이고, develop에는 필수 체크가 없습니다. 둘 다 관리자에게도 보호를 적용합니다.

필수 품질 게이트를 지켜야 하는 팀이라면 A안처럼 모든 PR에서 생기는 게이트 잡을 두는 편이 맞습니다. GitHub도 [건너뛸 수 있는 워크플로를 필수로 두지 말라](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks#handling-skipped-but-required-checks)고 안내합니다. 저희는 팀원의 체크 목록을 각자 영역에 맞추는 쪽을 골랐고, 그 대신 병합 전 확인을 사람에게 넘겼습니다. `paths` 한 줄을 넣기 전에 그 이름을 기다리는 보호 규칙부터 찾아보십시오.

포트폴리오 요약(2026-10-15판) 35쪽은 「검사 내용은 유지했지만 실패가 병합을 강제 차단하는 보호는 사라지는 선택」까지만 적었습니다. 내용 검사 필수 체크가 0개가 된다는 것, 3,000개가 넘는 PR은 검사 없이 병합될 수 있다는 것, 그 대신 병합 전에 제가 초록불을 확인한다는 것은 빠져 있습니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #163](https://github.com/3K-PokeClip/PokeClip-mono/pull/163) — media-ci 경로 필터 전환(2026-09-04 병합) · 병합 직후 확인용 [PR #164](https://github.com/3K-PokeClip/PokeClip-mono/pull/164) · [PR #165](https://github.com/3K-PokeClip/PokeClip-mono/pull/165)(둘 다 닫힘)
- [PokeClip-mono 결정 기록 「media-ci 경로필터 전환」](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/docs/decisions/2026-09-04-media-ci-%EA%B2%BD%EB%A1%9C%ED%95%84%ED%84%B0-%EC%A0%84%ED%99%98.md) — 대안, 순서, 대가, 롤백
- [PokeClip-mono `media-ci.yml` 12–25행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/media-ci.yml#L12-L25) — 지금의 감지 경로 · [`main-source.yml`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/main-source.yml#L31-L43) — main의 출처 브랜치 판정
- GitHub Actions 실행 기록 — [PR #163의 check](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/33775776891) · [PR #165의 check](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/33777358550)
- GitHub Docs — [경로 필터와 Pending 체크](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushpull_requestpull_request_targetpathspaths-ignore) · [3,000개 파일 diff 한계](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#git-diff-comparisons) · [건너뛸 수 있는 필수 체크](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks#handling-skipped-but-required-checks)
- [테스트 파일을 빼도 통과하던 CI를 커버리지 게이트로 막았습니다](/posts/0-to-1/coverage-gate-that-fails-when-tests-disappear/) — 이 워크플로의 `check` 잡에 있는 커버리지 게이트
- 팀 내부 작업 기록(비공개) — 계획 검토, 병합 직후 열린 PR 상태

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 35쪽](/portfolio/2026-10-15-v2/full.pdf#page=35)
