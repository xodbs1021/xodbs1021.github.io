---
title: "잘못된 Java 구문이 검사를 통과해 구문 검사를 앞에 뒀습니다"
date: "2026-10-15T11:36:25+09:00"
lastmod: "2026-11-12T04:47:11+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "Shakedown(SoftBank Hackathon 2026 예선 산출물)의 보안 게이트에서 괄호가 깨진 Java 입력이 Semgrep 1.180.0을 지나 ALLOW를 받았습니다. 테스트 기대값을 낮추지 않고 Tree-sitter 구문 검사를 Semgrep 앞에 두어 SCAN_FAILED로 막았고, 실패하던 회귀 테스트 2개가 기대값 그대로 통과했습니다."
tags: ["개발 사례", "Shakedown", "Java", "Tree-sitter", "Semgrep"]
portfolio_cases: []
portfolio_pages: [50]
portfolio_edition: "2026-10-15-v2"
---

괄호가 닫히지 않은 Java 코드 `class Broken { void broken( {`가 보안 검사를 통과했습니다. Shakedown은 SoftBank Hackathon 2026 예선 산출물로, 저장소를 검사하고 이미지를 만들어 배포하는 서비스입니다. 보안 게이트를 실제 Semgrep 1.180.0에 연결하자 이 입력에 검사 실패(`SCAN_FAILED`) 대신 다음 단계로 넘어가도 된다는 `ALLOW`가 나왔고, 게이트 회귀 시험은 340개 통과 · 2개 실패였습니다. Tree-sitter로 Java 구문을 먼저 읽는 검사를 Semgrep 앞에 두자 같은 입력이 `SCAN_FAILED`로 멈췄고, 실패하던 2개는 기대값을 바꾸지 않은 채 통과해 352개 통과가 됐습니다.

테스트 기대값을 `ALLOW`로 낮추지 않기로 한 것은 제 결정입니다. 구현과 시험 실행은 개발에 쓴 AI(Codex와 Claude Code)가 했고, 초기 보안 게이트는 팀원이 만든 기반입니다.

## 구문이 깨진 입력이 ALLOW를 받았습니다 {#allow와-검사-실패는-다른-결과여야-했습니다}

보안 게이트의 판정은 그다음 이미지 계획 · 빌드와 배포 구성 판단의 전제 조건입니다. `ALLOW`가 나와야 다음 단계가 움직입니다. 입력을 제대로 읽지 못했는데 `ALLOW`를 돌려주면, 뒤 단계는 검사가 실패했다는 사실을 알 길이 없습니다. 괄호가 깨진 코드는 컴파일하기 전부터 구조가 틀렸으므로, 기존 시험 두 개는 이 입력에 `SCAN_FAILED`를 기대하고 있었습니다.

2026년 10월 10일 팀원이 만든 게이트를 엔진에 연결하고 실제 Semgrep과 Gitleaks로 돌리자 두 시험이 같은 이유로 실패했습니다([연동 보고서, 수정 전 판](https://github.com/SoftBankHackathon/shakedown/blob/a406376c72689e0a6f3462f850f8d18693f8cb9f/docs/experiments/2026-10-10-security-gate-integration.md#L19-L29)). 하나는 Java 지원 시나리오의 `invalid` 경우이고, 하나는 Semgrep 실연동의 구문 오류 경우입니다. Semgrep의 최적화를 끄는 설정도 시도했지만 결과가 같아 버렸습니다. 왜 Semgrep이 이 입력을 오류로 보고하지 않았는지는 확정하지 못했습니다.

기대값을 `ALLOW`로 바꾸면 시험은 통과합니다. 그러면 「읽지 못한 입력은 통과시키지 않는다」는, 그 시험이 지키던 경계가 사라집니다. 그래서 기대값은 그대로 두고, Semgrep이 놓친 구문 오류를 다른 검사로 잡기로 했습니다.

## 컴파일하지 않고 Tree-sitter로 구문만 먼저 읽었습니다 {#컴파일러를-실행하지-않고-구문-경계를-보완했습니다}

Java 코드가 정상인지 보려면 javac로 컴파일하거나 Gradle로 빌드하는 방법이 먼저 떠오릅니다. 하지만 컴파일에는 클래스패스가 필요하고, 프로젝트를 빌드하면 의존성을 내려받고 저장소의 빌드 스크립트를 실행하게 됩니다. 남의 저장소를 검사하는 단계에서 그 코드를 실행하는 셈입니다.

| 선택지 | 얻는 것 | 이번 경계에서의 판단 |
|---|---|---|
| 기대값을 ALLOW로 변경 | 시험 통과 | 검사 실패를 정상으로 바꾸므로 뺌 |
| javac · Gradle 실행 | 컴파일 · 빌드 결과 | 의존성 다운로드와 빌드 스크립트 실행이 섞여 뺌 |
| Java 문법 검사기 직접 구현 | 동작을 세밀하게 통제 | 언어 문법을 직접 맡아야 해서 뺌 |
| Tree-sitter의 기존 Java 문법 | 실행 없이 구문 구조 확인 | Semgrep 앞의 사전 검사로 채택 |

Tree-sitter는 소스 코드를 구문 트리로 읽는 파서 라이브러리입니다. 문법이 틀린 곳이 있으면 트리에 오류 노드를 남기고, 루트 노드의 `has_error`가 참이 됩니다. 이 단계에서 필요한 답은 프로젝트가 빌드되는지가 아니라, 구조가 깨진 입력을 다음 검사에 정상 입력처럼 넘기지 않는 것이었습니다. 고정한 Tree-sitter 0.25.2와 tree-sitter-java 0.23.5로 Java 소스를 읽어, 하나라도 `has_error`면 실패로 끝냅니다([`source_syntax.py` 33–47행](https://github.com/SoftBankHackathon/shakedown/blob/3e9ed6d68a9de2c3a537acb9487da1ef49c739b5/apps/security-gate/security_gate/source_syntax.py#L33-L47)).

검사는 격리 모드(`python -I`)로 띄운 별도 Python 프로세스에서 시간 제한을 걸고 돌립니다. 소스는 표준 입력으로만 넘기므로 대상 저장소의 파일이 모듈로 불려 들어오지 않고, Python과 Java 검사가 시간 예산 하나를 나눠 씁니다. 파서가 설치돼 있지 않거나, 프로세스가 죽거나, 시간을 넘기면 모두 `SCAN_FAILED`입니다([50–70행](https://github.com/SoftBankHackathon/shakedown/blob/3e9ed6d68a9de2c3a537acb9487da1ef49c739b5/apps/security-gate/security_gate/source_syntax.py#L50-L70)). 도구가 판단하지 못했을 때 정상을 돌려주면, 검사를 하나 더 붙이고도 같은 문제를 되풀이하게 됩니다.

판정은 아래 순서로 갈립니다. 청록 상자가 이번에 앞에 둔 검사이고, 점선은 같은 날 뒤이어 붙은 다국어 확장의 갈래입니다.

```mermaid {#fig-java-syntax-gate-flow kind="재구성" caption="보안 게이트의 소스 판정 흐름. Java 소스는 Semgrep에 가기 전에 Tree-sitter 구문 검사를 지나고, 구문 오류(has_error)와 파서 없음 · 프로세스 종료 · 시간 초과는 모두 SCAN_FAILED입니다. 구문이 정상이면 Semgrep · Gitleaks가 ALLOW나 DENY를 냅니다. 점선은 같은 날 이어진 다국어 확장으로, 보안 규칙 없이 구문만 읽는 언어는 정상이어도 REVIEW입니다. ALLOW만 이미지 빌드로 넘어갑니다. PR #11의 3e9ed6d · 117d1df 코드와 보고서의 재구성입니다." source="https://github.com/SoftBankHackathon/shakedown/blob/3e9ed6d68a9de2c3a537acb9487da1ef49c739b5/apps/security-gate/security_gate/source_syntax.py#L73-L86"}
flowchart TB
  accTitle: 보안 게이트의 소스 판정 흐름
  accDescr: Java 소스는 Tree-sitter 구문 검사를 먼저 지난다. 구문 오류(has_error), 파서 없음, 프로세스 종료, 시간 초과는 모두 SCAN_FAILED다. 구문이 정상이면 Semgrep과 Gitleaks가 위험이 없으면 ALLOW, 위험을 찾으면 DENY를 낸다. ALLOW만 이미지 빌드로 넘어간다. 점선은 이후 다국어 확장으로, 보안 규칙 없이 구문만 읽는 언어는 구문이 정상이면 REVIEW다.
  ts[Java · Tree-sitter<br/>구문 검사] --> sg[구문 정상<br/>Semgrep · Gitleaks]
  ts --> fail[구문 오류 · 판단 불가<br/>SCAN_FAILED]
  sg --> allow[위험 없음 · ALLOW]
  sg --> deny[위험 · DENY]
  fail ~~~ deny
  allow --> build[이미지 빌드]
  build ~~~ only
  only[구문만 읽는 언어<br/>C/C++ · C# · Ruby · PHP] -.-> review[구문 정상 · REVIEW]
  style ts fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

구문 검사는 Semgrep을 대신하지 않습니다. 구문이 정상인 입력만 Semgrep으로 넘기고, 깨진 입력은 Semgrep이 어떻게 반응하든 그 앞에서 실패로 끝냅니다.

## 실패하던 테스트 2개가 기대값 그대로 통과했습니다 {#원래-실패한-테스트를-그대로-통과시켰습니다}

같은 깨진 입력을 수정 전후로 견주면 멈추는 자리가 달라집니다.

{{< motion scene="BrokenJavaGate" id="fig-broken-java-gate" kind="개념도" caption="같은 깨진 Java 입력의 수정 전후. 수정 전에는 Semgrep 1.180.0을 지나 ALLOW를 받았고, 수정 후에는 앞에 둔 Tree-sitter 구문 검사에서 SCAN_FAILED로 멈춰 Semgrep까지 가지 않습니다. 순서를 보여 주는 설명용 그림입니다." >}}

[Java 구문 검사 커밋](https://github.com/SoftBankHackathon/shakedown/commit/3e9ed6d68a9de2c3a537acb9487da1ef49c739b5) 시점의 보고서에 남은 결과는 다음과 같습니다([보고서 19 · 33행](https://github.com/SoftBankHackathon/shakedown/blob/3e9ed6d68a9de2c3a537acb9487da1ef49c739b5/docs/experiments/2026-10-10-security-gate-integration.md#L19-L33)).

| 질문 | 확인한 결과 |
|---|---|
| 원래 실패하던 입력을 막는가 | 실패하던 시험 2개가 `SCAN_FAILED` 기대값 그대로 통과, 게이트 회귀 352개 통과 · 1개 skip |
| 다른 불완전 구문도 찾는가 | 닫히지 않은 중괄호 · 잘못된 대입을 실패로 판정 |
| 최근 Java 문법을 잘못 막지 않는가 | record · sealed class · switch 식을 정상으로 판정 |
| 검사하면서 대상 코드가 실행되는가 | 클래스패스에 없는 의존성이 있어도 구문만 검사, static initializer가 실행되지 않음 |
| 엔진 쪽에서도 막히는가 | 잘못된 Java는 Docker · Claude 호출 전에 이미지 계획 단계에서 멈춤 |

깨진 입력을 막는 것만큼 정상 코드를 잘못 막지 않는 것도 중요했습니다. 구문 검사가 지나치게 엄격하면 최근 Java 문법을 쓰는 저장소가 모두 실패하기 때문입니다. skip 1개는 macOS에서 돌릴 수 없는 Windows 전용 시험입니다.

회귀 시험 수는 같은 날 두 번 더 늘었습니다. 다국어 구문 검사를 붙인 [커밋 a6f463a](https://github.com/SoftBankHackathon/shakedown/commit/a6f463a166eae7415b6b75fafe845739d2f804e3)에서 언어별 시험 72개가 더해져 424개 통과 · 1개 skip이 됐고, Go · Rust 보안 규칙을 더한 뒤에는 426개에 출처 · 해시 시험 1개를 합쳐 427개 통과 · 1개 skip, 엔진 207개 통과였습니다([보고서 51행](https://github.com/SoftBankHackathon/shakedown/blob/117d1dfb820233fd203212882d02a1e8c7e8c676/docs/experiments/2026-10-10-security-gate-integration.md#L51)). 이 보고서의 19행은 다국어 확장 때 「Java 수정 뒤 424개 통과」로 고쳐 쓰였지만, Java 수정 커밋에서 같은 줄은 352개였습니다. 세 커밋 모두 [PR #11](https://github.com/SoftBankHackathon/shakedown/pull/11)에 들어갔고, PR은 2026년 10월 10일 13시 12분(KST)에 리뷰 0건으로 제가 직접 병합했습니다.

## 구문이 정상이어도 안전하다는 뜻은 아닙니다 {#문법-정상은-보안-안전의-증거가-아닙니다}

이 수정으로 말할 수 있는 것은 구문을 읽지 못한 입력을 성공처럼 넘기지 않게 됐다는 것까지입니다. 구문이 정상이어도 컴파일이나 타입 검사에서 실패할 수 있고, 잘 실행되는 코드에 취약점이 있을 수도 있습니다. 고정한 문법 버전이 지원하지 않는 새 Java 문법은 정상 코드라도 실패로 판정될 수 있습니다. Windows에서는 시험을 돌리지 않았습니다.

같은 이유로 다국어 확장에서는 C/C++ · C# · Ruby · PHP처럼 구문만 읽고 보안 규칙은 없는 언어를 구문이 정상이어도 `REVIEW`로 두었습니다([보고서 39 · 49행](https://github.com/SoftBankHackathon/shakedown/blob/117d1dfb820233fd203212882d02a1e8c7e8c676/docs/experiments/2026-10-10-security-gate-integration.md#L39-L49)). `REVIEW`도 `SCAN_FAILED`와 마찬가지로 이미지 빌드와 배포로 넘어가지 못합니다. 문법을 읽을 수 있다는 이유로 보안 검사까지 끝났다고 알리지 않기 위해서입니다. 실제로 Spring 샘플 게시판 저장소는 이 수정 뒤에도 외부 스크립트 참조와 템플릿 식을 검사하지 못해 `REVIEW`에 머물렀습니다.

검사 도구가 반례를 통과시켰을 때 시험의 기대값을 그 도구에 맞추면, 도구의 빈틈이 그대로 규칙이 됩니다. 기대값을 지키고 빈틈을 다른 검사로 메우십시오. 그리고 새로 붙인 검사도 판단하지 못하면 통과가 아니라 실패를 돌려주게 하십시오.

## 측정 조건

- 2026년 10월 10일, macOS. 스캐너 Python 3.12.13, 엔진 Python 3.14.5, Semgrep 1.180.0, Gitleaks 8.30.0, Tree-sitter 0.25.2, tree-sitter-java 0.23.5. Windows는 실행하지 않았습니다.
- 회귀 시험은 실제 Semgrep · Gitleaks를 포함한 게이트 시험 묶음이고, 개발에 쓴 AI가 실행했습니다. 수는 커밋 시점마다 보고서에 남은 값입니다: 수정 전 `a406376` 340 통과 · 2 실패 · 1 skip, Java 수정 `3e9ed6d` 352 통과 · 1 skip, 다국어 확장 `a6f463a` 424 통과 · 1 skip, Go · Rust 규칙 `117d1df` 427 통과 · 1 skip.
- 이 검증에서는 Docker 빌드나 AWS 배포를 하지 않았습니다. PR 상태는 2026년 11월 12일에 확인했습니다.

## 출처

- [SoftBankHackathon/shakedown 「Merged Security Gate integration — 2026-10-10」 수정 전 판(a406376)](https://github.com/SoftBankHackathon/shakedown/blob/a406376c72689e0a6f3462f850f8d18693f8cb9f/docs/experiments/2026-10-10-security-gate-integration.md) — 340 통과 · 2 실패, 실패한 시험 이름
- [같은 보고서 Java 수정 판(3e9ed6d)](https://github.com/SoftBankHackathon/shakedown/blob/3e9ed6d68a9de2c3a537acb9487da1ef49c739b5/docs/experiments/2026-10-10-security-gate-integration.md) — 352 통과, Tree-sitter 사전 검사와 추가 검사 범위
- [같은 보고서 Go · Rust 규칙 판(117d1df)](https://github.com/SoftBankHackathon/shakedown/blob/117d1dfb820233fd203212882d02a1e8c7e8c676/docs/experiments/2026-10-10-security-gate-integration.md) — 424 · 427 통과, 구문 전용 언어의 REVIEW
- [SoftBankHackathon/shakedown `apps/security-gate/security_gate/source_syntax.py`(3e9ed6d)](https://github.com/SoftBankHackathon/shakedown/blob/3e9ed6d68a9de2c3a537acb9487da1ef49c739b5/apps/security-gate/security_gate/source_syntax.py#L33-L86) — Java 구문 검사 프로그램과 실패 처리
- [SoftBankHackathon/shakedown 커밋 3e9ed6d](https://github.com/SoftBankHackathon/shakedown/commit/3e9ed6d68a9de2c3a537acb9487da1ef49c739b5) — Semgrep 앞의 Tree-sitter Java 구문 검사
- [SoftBankHackathon/shakedown 커밋 a6f463a](https://github.com/SoftBankHackathon/shakedown/commit/a6f463a166eae7415b6b75fafe845739d2f804e3) — 다국어 Tree-sitter 구문 검사
- [SoftBankHackathon/shakedown PR #11](https://github.com/SoftBankHackathon/shakedown/pull/11) — Claude API 연결과 규칙 우선 이미지 생성, 게이트 연동 보완(2026-10-10 병합)
- [Tree-sitter 문서 「Using Parsers」](https://tree-sitter.github.io/tree-sitter/using-parsers/) — 구문 트리와 오류 노드
- [tree-sitter/tree-sitter-java](https://github.com/tree-sitter/tree-sitter-java) — Java 문법

---

[개발 사례 전체 모음](/posts/0-to-1/portfolio-engineering-notes/) · [같은 판의 포트폴리오 PDF](/portfolio/2026-10-15-v2/full.pdf#page=50)
