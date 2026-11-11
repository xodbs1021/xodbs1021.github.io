---
title: "채팅 수집 언어는 리뷰할 사람이 바뀌어 Spring이 됐습니다"
date: 2026-10-15T11:27:08+09:00
lastmod: 2026-11-11T14:14:52+09:00
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "Architecture", "Collaboration", "Spring", "SQS"]
description: "AI가 코드를 짜고 사람이 리뷰하는 3인 팀에서 언어 기준을 「AI 생성 품질 + 사람이 리뷰할 수 있는가」로 두었고, 채팅 담당이 Spring 주력 팀원으로 바뀌자 Node를 고른 근거가 무너져 7월 31일 채팅 수집을 Spring으로 바꾼 결정. 언어가 달라도 방송 이벤트 봉투의 칸과 웹이 함께 읽는 시험 표로 서비스 사이 의미를 맞췄고, Spring 채팅 서버 둘은 11월 3일 첫 출시본에 들어갔습니다."
draft: false
portfolio_cases: [3]
portfolio_pages: [5, 6]
portfolio_edition: "2026-10-15-v2"
---

PokeClip의 채팅 수집은 처음에 Node·TypeScript로 정했습니다. 근거는 둘이었습니다. 이미 있던 Node 채팅 수집기를 다시 쓸 수 있었고, 프런트엔드도 TypeScript라 유지보수할 사람이 겹쳤습니다. 그런데 채팅 담당이 Spring을 주로 쓰는 팀원으로 바뀌자 두 번째 근거가 사라졌습니다. 저는 2026년 7월 31일 채팅 수집을 Spring으로 바꾸기로 정했고, 8월 1일 10시 47분 [PR #8](https://github.com/3K-PokeClip/PokeClip-mono/pull/8)로 저장소에 반영했습니다. 채팅의 Node가 빠지면서 백엔드 쪽 언어는 다섯에서 넷(Java · Go · Python · C++)이 됐고, Spring으로 짠 채팅 서버 둘(수집 · 판별)은 11월 3일 첫 출시본 v1.0.0에 들어갔습니다.

언어 배치와 채팅 전환은 제가 정했습니다. 팀은 AI가 코드를 짜고 사람이 리뷰하는 방식으로 일했고(저는 Claude Code와 Codex를 썼습니다), 채팅 수집 서버는 팀원이 구현했습니다.

## Node를 고른 두 근거 중 하나가 담당 변경으로 사라졌습니다 {#재사용-비용만-보면-이후의-검토-비용이-빠집니다}

7월 20일 언어를 처음 배치할 때 채팅만 Node였습니다. 기존 수집기는 Fastify와 Socket.io로 짠 것이고, 치지직 공식 OAuth와 비공식 웹소켓을 함께 다루는 어댑터가 있었습니다. 프런트엔드 담당이 TypeScript를 쓰니, 채팅을 같은 언어로 두면 읽을 사람이 있었습니다.

담당이 Spring 주력 팀원으로 옮겨 가자 「프런트엔드와 유지보수 인력이 겹친다」는 근거가 먼저 무너졌습니다. 남은 근거는 재사용이었지만, 다시 쓸 코드가 있어도 앞으로 그 코드를 고치고 리뷰할 사람이 읽기 어려우면 아낀 시간이 이후 리뷰 비용으로 돌아옵니다. 그래서 재사용 전제도 함께 내려놓고 Spring으로 다시 짜기로 했습니다. 성능 비교로 내린 결정이 아닙니다. 같은 기능을 두 언어로 짜서 재 보지도 않았습니다.

## 언어 기준은 AI가 짠 코드를 사람이 리뷰할 수 있느냐였습니다

팀 3명 가운데 둘은 Java·Spring이 주력이고 한 명은 TypeScript·React가 주력입니다. 코드는 AI가 짜고 사람은 리뷰와 운영을 맡기로 했으므로, 언어를 고르는 기준은 「AI가 그 언어로 쓴 코드의 품질」과 「그 코드를 사람이 리뷰할 수 있는가」 둘이었습니다. 리뷰할 사람이 없는 언어는 품질 검사를 통째로 잃습니다.

| 영역 | 언어 | 고른 이유 |
|---|---|---|
| 인증 · 클립 API, 채팅 수집 · 판별 | Java(Spring Boot) | 팀원 둘이 촘촘히 리뷰할 수 있음 |
| 렌더 일꾼 | Java(Gradle) | 같은 리뷰어. v1.0.0에는 들어가지 않음 |
| 미디어 사이드카 | Go | 조각마다 장부 · 업로드 · 재포장 · 목록 발행을 나란히 도는 장기 작업. AI 생성 품질이 높고 Java 개발자도 읽기 쉬움 |
| OBS 플러그인 | C++ | libobs에 직접 붙음([OBS 플러그인 문서](https://docs.obsproject.com/plugins)) |
| 자막(음성 인식) | Python | 모델 도구와의 접점. develop에는 아직 자리만 있음 |
| 웹 | TypeScript(React) | 프런트엔드 담당 |

Python 일꾼은 설계에만 있습니다. develop `825a3dfe`의 `workers/ai/`에는 빈 파일(`.gitkeep`) 하나뿐입니다. 렌더 일꾼은 Java로 짰지만 v1.0.0(11월 3일)에는 들어가지 않았고, 11월 10일 운영 반영 작업을 시작했습니다.

전부 Go로 통일하는 안과 전부 Spring으로 통일하는 안도 7월 20일에 검토했습니다. 전부 Go는 Spring 리뷰어 둘의 역량을 버리고, 코어 API 규모에서는 성능 이득도 없었습니다. 전부 Spring은 미디어의 장기 작업과 음성 인식 모델 도구에서 맞지 않았습니다. 언어를 하나 더할 때는 그 언어를 쓰는 이유를 한 문장으로 말할 수 있어야 한다는 조건을 달았습니다.

## 언어가 달라도 서비스 사이 계약은 하나로 맞췄습니다 {#다른-언어를-선택했으므로-서비스-바깥의-의미는-맞춰야-했습니다}

언어를 나누면 같은 사건을 서비스마다 다르게 해석할 위험이 생깁니다. 방송 시작을 예로 들면, Go 사이드카가 알리는 「방송이 시작됐다」를 Spring 채팅 수집과 Spring 클립 서비스가 같은 방송, 같은 사건으로 읽어야 합니다. 그래서 내부 객체를 공유하지 않고, 서비스 밖으로 나가는 봉투의 칸 이름과 뜻을 계약으로 고정했습니다.

방송 시작 사건은 사이드카가 SNS FIFO 주제에 한 번 내고, 소비자마다 SQS FIFO 큐가 받습니다. Go가 내는 봉투 칸 아홉(`eventId` · `streamId` · `ingestStreamId` · `sequence` 등)을 두 Spring 서버의 record가 같은 이름으로 받습니다. Spring 쪽은 선택 칸을 몇 개 더 둡니다([Go `envelope.go` 42–52행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/broadcast/envelope.go#L42-L52) · [Java `LifecycleEnvelope.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/chat-collector/src/main/java/com/pokeclip/chat/collector/broadcast/LifecycleEnvelope.java#L20-L31)). `eventId`는 SNS FIFO의 중복 제거 키로도 쓰여, 같은 사건이 5분 안에 두 번 나가도 큐는 한 번만 받습니다([Amazon SNS 문서 「Message deduplication for FIFO topics」](https://docs.aws.amazon.com/sns/latest/dg/fifo-message-dedup.html)). 영상에서 봉투가 두 큐로 갈라진 뒤에도 세 칸이 그대로인 것을 보면 됩니다.

{{< motion scene="BroadcastEventFanout" id="fig-event-fanout" kind="개념도" caption="Go 사이드카가 낸 방송 시작 봉투가 SNS FIFO 주제에서 두 SQS FIFO 큐로 갈라져 Spring 채팅 수집 서버와 클립 서버에 도착합니다. 언어는 다르지만 streamId · ingestStreamId · eventId 칸은 이름과 값이 그대로입니다. 봉투의 칸은 develop 825a3dfe 기준이며, 흐름을 보여 주는 설명용 그림입니다." >}}

두 서버가 받은 봉투의 칸은 보낸 쪽과 이름도 값도 같습니다.

봉투 말고도 언어 경계를 넘는 계약이 있습니다. 장부 시각을 조각 안 위치로 바꾸는 변환은 Java 모듈로 두고, 그 시험 표(`ledger-timeline-cases.json`)를 웹(TypeScript) 시험도 같이 읽습니다. 렌더 일꾼이 같은 표를 읽는 시험은 머지 전 초안 [PR #496](https://github.com/3K-PokeClip/PokeClip-mono/pull/496)에 있습니다([`services/README.md` 13행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L13)). 한쪽 언어에서 변환을 고치면 다른 언어의 시험이 같은 표로 깨집니다.

봉투의 `streamId`가 가리키는 「같은 회차」는 지금 시청자가 「방송 한 번」으로 보는 단위입니다. 송출이 끊겼다 다시 붙어도 같은 회차로 보는 규칙은 [세션 주소 글](/posts/0-to-1/pokeclip-session-url-and-endlist/)에 있습니다.

언어별 서비스와 그 사이 계약을 한 장으로 보면 이렇습니다. 간선의 글자가 계약입니다.

```mermaid {#fig-language-map kind="개념도" caption="언어별 서비스와 그 사이 계약. 간선의 글자가 서비스 사이에서 고정한 것(송출 규격, 방송 이벤트 봉투, DB 표, 렌더 주문)입니다. 청록 상자는 7월 31일 Node에서 Spring으로 바꾼 채팅 서버입니다. develop 825a3dfe와 v1.0.0 출시 이미지 목록 기준 재구성이며, 렌더 일꾼은 v1.0.0에 들어가지 않았습니다." source="https://github.com/3K-PokeClip/PokeClip-mono/pull/466"}
flowchart TB
  accTitle: PokeClip 언어별 서비스와 계약
  accDescr: C++ OBS 플러그인이 SRT 6트랙으로 Go 미디어 사이드카에 보낸다. 사이드카는 방송 이벤트 봉투를 SNS와 SQS FIFO로 Spring 채팅 수집과 Spring 클립에 보내고, 클립은 사이드카가 적은 조각 장부 표도 읽는다. 채팅 수집은 채팅 표를 Spring 채팅 판별과 함께 쓴다. 클립은 렌더 주문을 SQS로 Java 렌더 일꾼에 보낸다.
  obs[OBS 플러그인 · C++]
  side[미디어 사이드카 · Go]
  col[채팅 수집 · Spring]
  clip[클립 · Spring]
  det[채팅 판별 · Spring]
  ren[렌더 일꾼 · Java]
  obs -->|SRT 6트랙| side
  side -->|방송 이벤트 봉투| col
  side -->|같은 봉투 · 조각 장부| clip
  col -->|채팅 표| det
  clip -->|렌더 주문 · 레시피| ren
  style col fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style det fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

서비스 안쪽은 담당이 언어와 구조를 바꿀 수 있습니다. 바깥으로 나가는 칸 이름과 상태가 바뀌는 시점은 바꾸려면 계약을 먼저 고쳐야 합니다.

## 언어 넷의 빌드·검증 비용은 경로별 CI로 나눴습니다 {#선택을-나눠-가진-만큼-통합-비용도-남았습니다}

CI가 실제로 빌드하는 언어는 Go · Java · TypeScript · C++ 넷이고(Python 일꾼은 아직 코드가 없습니다), 빌드 도구와 시험 도구도 그만큼 다릅니다. 모노레포에서 바뀐 경로에 따라 검사를 나눴습니다. `media/**`는 Go 검사, `services/**`는 Spring 서버 넷의 시험, `workers/**`는 일꾼 시험, `web/**`는 웹 검사, `obs-plugin/**`는 플러그인 빌드만 돕니다([`.github/workflows`](https://github.com/3K-PokeClip/PokeClip-mono/tree/825a3dfe1f8dbef20255f85cea890a21505ae465/.github/workflows)). 웹 검사는 공유 시험 표가 바뀔 때도 돌도록 그 경로를 함께 걸었습니다.

이 나눔에도 대가가 있었습니다. 9월 4일 미디어 검사를 경로 필터로 되돌리고, 브랜치 보호의 필수 체크에서 미디어 검사를 뺐습니다. 미디어와 무관한 팀원 PR의 체크 목록에 미디어 검사가 늘 떠 있던 문제를 없애려는 결정이었습니다. 대신 내용 검사 가운데 필수 체크가 없어졌고, GitHub의 경로 필터는 PR의 변경 파일 3,000개까지만 보므로 그보다 큰 PR에서는 검사가 빠질 수 있습니다. 저는 이 대가를 받아들였습니다.

## Spring 채팅 서버 둘은 11월 3일 첫 출시본에 들어갔습니다

11월 3일 v1.0.0의 출시 이미지에는 채팅 수집(`chat-collector`)과 채팅 판별(`chat-detector`)이 들어갔습니다([PR #466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466)). 운영 환경에서 두 서버는 웹 · 인증 · 클립과 함께 ECS Fargate 서비스로 돕니다. 렌더 일꾼과 Python 자막 일꾼은 이 출시본에 없었습니다.

포트폴리오 요약(2026-10-15판) 6쪽의 「Spring은 팀의 검토 역량, Go는 미디어 장기 작업, C++는 libobs 경계」는 지금도 맞습니다. 5쪽의 「팀의 렌더·업로드 계층」은 v1.0.0(11월 3일)에는 들어가지 않았고, 11월 10일 운영 반영 작업을 시작했습니다.

기술 결정을 내릴 때 그 결정을 성립시킨 사람이 누구인지 함께 적어 두십시오. 담당이 바뀌면 그 근거부터 다시 확인할 수 있습니다. 채팅 언어를 바꾼 것은 언어의 장단점이 바뀌어서가 아니라, 리뷰할 사람이 바뀌어서였습니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #8](https://github.com/3K-PokeClip/PokeClip-mono/pull/8) — 채팅을 Spring으로 확정하고 services 아래 서버로 정리(2026-08-01 머지)
- [3K-PokeClip/PokeClip-mono `media/internal/broadcast/envelope.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/broadcast/envelope.go#L42-L52) — 방송 이벤트 봉투(Go)
- [3K-PokeClip/PokeClip-mono `services/chat-collector/.../LifecycleEnvelope.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/chat-collector/src/main/java/com/pokeclip/chat/collector/broadcast/LifecycleEnvelope.java#L20-L31) — 같은 봉투(Java)
- [3K-PokeClip/PokeClip-mono `services/README.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L13) — 공유 시험 표와 서버 목록
- [3K-PokeClip/PokeClip-mono `.github/workflows`](https://github.com/3K-PokeClip/PokeClip-mono/tree/825a3dfe1f8dbef20255f85cea890a21505ae465/.github/workflows) — 경로별 CI
- [3K-PokeClip/PokeClip-mono PR #466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466) — v1.0.0 출시 이미지 목록(2026-11-03)
- [Amazon SNS 문서 「Message deduplication for FIFO topics」](https://docs.aws.amazon.com/sns/latest/dg/fifo-message-dedup.html) — 중복 제거 키와 5분 창
- [OBS Studio 문서 「Plugins」](https://docs.obsproject.com/plugins) — libobs 플러그인
- [GitHub Docs 「Workflow syntax — paths」](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushpull_requestpull_request_targetpathspaths-ignore) — 경로 필터와 변경 파일 3,000개 한도
- [끝난 HLS 목록은 다시 열지 않고 새 세션 주소를 줬습니다](/posts/0-to-1/pokeclip-session-url-and-endlist/) — 세션 · 회차 규칙
- 팀 내부 결정 기록(비공개) — 7월 20일 언어 배치, 7월 31일 채팅 전환, 9월 4일 미디어 검사 경로 필터 전환

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 6쪽](/portfolio/2026-10-15-v2/full.pdf#page=6)
