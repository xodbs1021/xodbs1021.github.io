---
title: "채팅 급증 판별은 임시 기준이라 수동 표시 경로를 함께 뒀습니다"
date: "2026-10-15T11:40:52+09:00"
lastmod: "2026-11-12T05:01:14+09:00"
draft: false
author: "김태윤"
description: "PokeClip의 채팅 급증 판별(chat-detector)은 5초 창 메시지 수가 최근 15분 중앙값의 3배 이상이고 10건 이상이면 점프 카드를 만듭니다. 두 기준값은 코드에도 임시값으로 적혀 있고, 이 기준으로 11월 3일 첫 출시본에 들어갔습니다. 고유 참여자 수는 집계만 하고, 채팅 시각에서 3.9초(8월 24일 로컬 실측)를 빼 영상 위치로 옮기며, 판별이 빗나가도 OBS 핫키와 웹 수동 표시가 같은 카드 표에 카드를 만듭니다. 탐지 정확도는 아직 재지 않았습니다."
categories: ["0-to-1"]
tags: ["PokeClip", "하이라이트", "제품 설계", "연구 기록"]
portfolio_cases: [32]
portfolio_pages: [54]
portfolio_edition: "2026-10-15-v2"
---

채팅이 평소보다 많이 올라오는 순간을 하이라이트 후보로 삼으면, 한 사람이 도배한 순간과 많은 시청자가 한꺼번에 반응한 순간이 메시지 수로는 똑같이 보입니다. PokeClip의 채팅 급증 판별 서버(chat-detector)는 아직 이 둘을 가르지 않습니다. 5초 창의 메시지 수가 최근 15분 중앙값의 3배 이상이고 10건 이상이면 급증으로 보고, 누르면 그 장면으로 재생 위치를 옮기는 점프 카드를 만듭니다. 두 기준값은 코드 주석에도 임시값으로 적혀 있고, 이 기본값 그대로 11월 3일 첫 출시본 v1.0.0 이미지에 들어갔습니다([PR #466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466)). 판별이 빗나가거나 채팅이 적어 카드가 나오지 않아도 장면을 남길 수 있게, OBS 핫키와 웹 화면의 수동 표시가 같은 카드 표에 카드를 만듭니다.

채팅 신호 연구는 7월 팀 연구 노트에 팀 실측과 보완 가설로 정리돼 있고, chat-detector는 팀원이 구현해 8월 26일 [PR #134](https://github.com/3K-PokeClip/PokeClip-mono/pull/134)로 병합했습니다. 7월 초에는 채팅을 영상·음성 분석의 관문으로 쓰는 구조도 제안했지만([v3→v4 기록](/posts/0-to-1/pokeclip-v3-to-v4-cascade/)), 출시본에 들어간 것은 채팅 급증 카드 하나입니다. 채널별 기준값과 고유 참여자 비교는 지금도 정하지 못했고, 탐지 정확도는 재지 않았습니다.

## 메시지 수만 세면 도배와 넓은 반응이 섞입니다 {#메시지-수-하나로는-다른-원인이-섞인다}

영상 속 사건에 반응하는 채팅과 시청자끼리 나누는 대화는 메시지 수로는 비슷하게 보입니다. 한 사람이 여러 번 입력하면 메시지 수는 늘어도 반응한 사람 수는 그대로입니다. 그래서 7월 연구 노트는 메시지 수보다 서로 다른 참여자(고유 채터) 수의 급증을 더 깨끗한 신호 후보로 적었습니다([연구 노트 6절](https://github.com/xodbs1021/PokeClip-architecture/blob/812fac0eadeed1e1e86b155b1419512cc6019ae5/8_Pokeclip_%ED%95%98%EC%9D%B4%EB%9D%BC%EC%9D%B4%ED%8A%B8%EC%97%B0%EA%B5%AC%EB%85%B8%ED%8A%B8.md)). 저장소 README는 이것을 팀 실측(실경기 채팅 18,112건)에서 확인한 것이라고 적지만([services/README.md 110–113행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/README.md?plain=1#L110-L113)), 같은 실측에서 메시지 수와 견준 수치는 없습니다. 연구 노트의 미결 질문에도 「메시지 수 대비 어느 정도 개선되는가」가 남아 있습니다. 그래서 아직 가설입니다.

채널 사이 비교에는 다른 문제가 있습니다. 평소 채팅량이 다른 채널을 하나의 절대값으로 자르면 큰 채널의 평범한 대화가 작은 채널의 강한 반응보다 높게 나옵니다. 그래서 연구 노트와 코드는 절대값이 아니라 그 방송의 평소와 견주는 배율을 기준으로 씁니다.

11월 코드는 고유 참여자 수를 5초 창마다 세어 남기지만, 판정에는 메시지 수를 씁니다([application.yml 129–131행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/resources/application.yml#L129-L131), [SpikeDetector.java 46–52행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/java/com/pokeclip/chat/detector/detect/SpikeDetector.java#L46-L52)). 설정으로 참여자 수 판정으로 바꿀 수는 있지만 기본값은 아닙니다. 여러 창 크기의 합의도 같습니다. 3·5·10초 창을 모두 집계하고, 판정과 발행은 5초 창 하나로만 합니다([application.yml 91–93행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/resources/application.yml#L91-L93)).

| 신호 후보 | 구분하려는 상황 | 11월 코드 상태 | 추가로 확인할 것 |
|---|---|---|---|
| 채팅 수의 변화 | 평소보다 반응이 급증했는가 | 5초 창 메시지 수가 15분 중앙값의 3배 이상이고 10건 이상(임시값) | 채널별 기준선과 임계값 |
| 고유 참여자 수 | 소수의 반복 입력인가, 참여가 넓어졌는가 | 집계만 하고 판정에는 쓰지 않음 | 실제 반응 장면과의 대조 |
| 여러 시간 창의 합의 | 짧은 급등과 지속적인 반응을 구분할 수 있는가 | 3·5·10초 창 집계, 판정은 5초 창 하나 | 창 길이에 따른 오탐·누락 |
| 수동 순간 표시 | 자동 신호가 약해도 사람이 장면을 남길 수 있는가 | OBS 핫키·웹 수동 표시가 같은 카드 표에 카드를 만듦 | 방송·편집 흐름과의 연결 |

## 라이브 판정은 최근 15분 중앙값과 워밍업으로 했습니다 {#실시간에는-미래의-평균을-사용할-수-없다}

방송이 끝난 뒤에는 전체 채팅의 평균을 기준선으로 쓸 수 있지만, 라이브 중에는 그 평균에 아직 오지 않은 채팅이 들어 있습니다. 7월 연구 노트는 실시간 기준선으로 방송 시작부터의 누적 평균과 최근 10~20분 롤링 기준선을 함께 검토했습니다. 코드에는 누적 평균이 없고, 최근 15분 롤링 중앙값 하나만 있습니다([application.yml 118–119행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/resources/application.yml#L118-L119)).

평균 대신 중앙값을 쓴 이유는 짧은 창에서 급증이 기준선을 끌어올리기 때문입니다. 15분 창 안에 방금 터진 급증이 들어가면 평균이 부풀어, 바로 다음 하이라이트의 배율이 낮게 나옵니다. 중앙값은 크기 순서로 가운데 값만 보므로 급증 몇 개가 섞여도 덜 움직입니다([Baseline.java 5–13행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/java/com/pokeclip/chat/detector/detect/Baseline.java#L5-L13)).

배율만 보면 작은 채널에서 2건이 4건이 돼도 2배 급증이 됩니다. 그래서 10건 이상이라는 절대 하한을 함께 걸고, 기준선이 0일 때도 걸러지도록 하한을 배율보다 먼저 봅니다([SpikeDetector.java 35–43행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/java/com/pokeclip/chat/detector/detect/SpikeDetector.java#L35-L43)). 두 값 모두 검증된 값이 아닙니다. 설정 주석은 배율 3.0을 「임시값」, 최소 10건을 「근거 없는 임시값」으로 적었습니다([application.yml 123–128행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/resources/application.yml#L123-L128)). 같은 주석은 값을 바꿀 때 높은 쪽이 안전하다고도 적습니다. 가짜 카드는 기능을 안 쓰게 만들지만, 놓친 장면은 편집자가 원래 하던 대로 찾으면 되기 때문입니다.

비교할 이력이 모자라면 아무 채팅이나 큰 배율이 됩니다. 그래서 판정하는 창 직전 15분 안에 채팅이 있던 5초 창이 24개 미만이면 카드를 내지 않습니다([application.yml 120–122행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/resources/application.yml#L120-L122), [SpikeDetector.java 29–31행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/java/com/pokeclip/chat/detector/detect/SpikeDetector.java#L29-L31)). 방송 초반에는 매 창에 채팅이 있어도 2분을 기다리고, 방송 중에도 최근 15분의 채팅 있는 창이 24개 아래로 떨어지면 다시 이 조건에 걸립니다.

기준선과 워밍업은 모두 채팅이 있던 창만 셉니다. 채팅이 한 건도 없는 창은 집계 줄이 생기지 않기 때문입니다. 그래서 조용한 방송에서는 자동 탐지가 사실상 꺼집니다. 채팅 있는 창이 24개가 안 되면 워밍업에 걸리고, 넘더라도 빈 창을 0으로 세지 않아 기준선이 높게 잡힙니다. 예를 들어 15분(창 180개) 중 30창에만 10건씩 있으면 기준선은 0이 아니라 10이고, 20건짜리 창도 배율 2라 잡히지 않습니다. 코드 주석은 이 동작을 덜 잡히는 쪽이 안전하다는 판단에 따른 의도로 적습니다([Baseline.java 15–32행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/java/com/pokeclip/chat/detector/detect/Baseline.java#L15-L32)).

## 채팅 시각에서 3.9초를 빼 영상 위치로 옮깁니다 {#채팅-시각을-영상-시각으로-그대로-쓰지-않는다}

채팅이 서버에 도착한 시각은 영상 속 사건이 일어난 시각보다 늦습니다. 시청자는 플랫폼의 방송 지연을 거친 화면을 보고, 본 뒤에 반응하고, 그 채팅이 다시 수집 서버까지 옵니다. 채팅 시각을 그대로 영상 위치로 쓰면 카드가 장면보다 뒤를 가리킵니다.

그래서 판정은 플랫폼이 메시지에 찍은 채팅 시각으로 하고, 카드를 만들 때 수집 서버의 변환 창구에 영상 위치를 묻습니다. 수집 서버는 채팅 시각에서 기본 3,900ms를 빼 녹화 위의 위치로 바꿉니다([chat-collector application.yml 345–395행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-collector/src/main/resources/application.yml#L345-L395)). 이 값은 8월 24일 로컬에서 치지직 한 곳만 잰 값입니다([측정 조건](#측정-조건)). 채널마다 덮어쓸 수 있지만, 저장소 설정에는 채널별 값이 없습니다.

급증한 창을 묶지 않으면 한 장면에 카드가 여러 장 생깁니다. 9월 13일 실방송에서 30초 동안 이어진 급증에 카드 8장이 나왔습니다. 처음 10초였던 묶음 간격은 채팅이 잠깐 끊겼다 다시 터지면 한 장면이 카드 두 장으로 쪼개져 20초로 올렸습니다. 지금은 앞 급증 창의 끝에서 20초 안에 다음 급증 창이 시작하면 같은 사건으로 묶습니다(사건 길이 상한 90초). 카드 구간은 첫 급증 창보다 15초 앞에서 시작해 마지막 급증 창 뒤 5초에서 끝납니다([application.yml 135–147행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/resources/application.yml#L135-L147)). 앞 15초는 채팅이 장면보다 늦게 온다는 것을 구간에 다시 반영한 여유입니다. 묶기에는 대가가 있습니다. 급증이 멈추고 20초가 지나야 사건이 끝난 것으로 보므로, 카드도 그만큼 늦게 뜹니다.

영상의 위 줄이 채팅 시각의 5초 창, 아래 줄이 영상 위치입니다. 실선이 15분 중앙값의 3배, 그 아래 점선이 10건입니다. 강조색 막대가 두 선을 모두 넘은 창이고, 회색 막대 가운데 하나는 10건만 넘어 빠집니다.

{{< motion scene="ChatSpikeToCard" id="fig-spike-to-card" kind="개념도" caption="5초 창 메시지 수가 최근 15분 중앙값의 3배 이상이고 10건 이상인 창을 급증으로 고르고, 20초 안에 이어진 급증 창을 한 사건으로 묶습니다. 첫 급증 창의 시각에서 3.9초를 빼 영상 위치로 옮기고, 앞 15초 · 뒤 5초를 붙인 구간이 자동 카드가 됩니다. 손으로 표시한 카드도 같은 카드 표에 들어옵니다. 기준값은 develop 2fc2323c 기본값이고, 막대 높이는 설명용입니다." >}}

영상 위치로 바꾸는 호출은 사건마다 첫 급증 창의 시작 시각 하나로 한 번만 합니다. 채팅마다 물으면 수집 서버가 감당하지 못하기 때문이고, 나머지 끝점은 보정값이 같다고 보고 더해서 냅니다([HighlightPublisher.java 97–107행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/java/com/pokeclip/chat/detector/publish/HighlightPublisher.java#L97-L107), [143–144행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/java/com/pokeclip/chat/detector/publish/HighlightPublisher.java#L143-L144)). 대가로 녹화 조각 경계에 걸친 창은 카드 지점이 최대 1.5초 밀립니다([99–106행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/java/com/pokeclip/chat/detector/publish/HighlightPublisher.java#L99-L106)). 위치 변환을 수집 서버에 맡겼기 때문에, 판정 규칙을 바꿔도 카드를 받는 쪽은 채팅 시각을 해석하지 않아도 됩니다.

## 자동 카드가 없어도 손으로 표시한 장면은 편집할 수 있습니다 {#자동-탐지가-실패해도-편집은-가능해야-했다}

채팅이 적거나 자동 후보를 믿기 어려운 채널에 억지로 카드를 내면, 사용자가 잘못된 제안을 하나씩 열어 확인해야 합니다. 7월 연구 노트는 소형 채널에서 채팅만으로 하이라이트를 잡는 것을 「현재로선 불가」로 판단하고 핫키(수동) 모드로 맡겼습니다. 같은 달 설계 기록은 채널별 신뢰도가 낮으면 자동 탐지를 끄고 핫키를 안내하는 기능을 계획했습니다. 자동 탐지를 끄는 부분은 [Baseline.java 27–28행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/java/com/pokeclip/chat/detector/detect/Baseline.java#L27-L28)이 인용하고, 핫키 안내 부분은 비공개 기록에만 있습니다.

11월 코드에는 수동 경로가 있고, 신뢰도 기능은 없습니다. 방송자는 OBS 플러그인의 단축키로 순간을 표시하고([mark-hotkey.cpp](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/obs-plugin/src/mark-hotkey.cpp)), 웹 화면에서는 라이브 중이나 지난 방송을 재생하면서 수동으로 표시합니다([useManualMarking.ts 13–18행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/web/src/features/broadcast/livenow/useManualMarking.ts#L13-L18)). 두 경로는 클립 서버에서 같은 저장 함수를 거쳐 카드 표에 출처 `hotkey`로 들어가고, 자동 카드는 출처 `auto`로 들어갑니다([WebMarkService.java 26–27행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/clip/src/main/java/com/pokeclip/clip/mark/WebMarkService.java#L26-L27), [V202__create_jump_cards.sql 33행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/clip/src/main/resources/db/migration/V202__create_jump_cards.sql#L33)). 채널 신뢰도를 재서 자동 탐지를 끄고 핫키를 안내하는 코드는 없습니다. 조용한 방송에서 자동 카드가 나오지 않는 것은 앞 절의 기준선 계산 결과일 뿐, 채널을 판단해 끈 것이 아닙니다.

[[fig-card-paths]]의 강조한 상자가 자동 판별을 거치지 않는 수동 경로입니다.

```mermaid {#fig-card-paths kind="재구성" caption="점프 카드가 생기는 두 경로. 자동 경로는 chat-detector가 5초 창 메시지 수를 최근 15분 중앙값과 견줘 급증을 고르고, 수집 서버에서 첫 급증 창의 영상 위치를 받아 카드 표에 auto로 넣습니다. 수동 경로는 OBS 핫키와 웹 수동 표시가 같은 카드 표에 hotkey로 넣습니다. PokeClip-mono develop 2fc2323c의 services/README.md 5201–5211행과 클립 서버 카드 표 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/README.md?plain=1#L5201-L5211"}
flowchart TB
  accTitle: 점프 카드가 생기는 두 경로
  accDescr: 자동 경로에서는 채팅 수집 서버가 저장한 채팅을 chat-detector가 5초 창으로 세어 최근 15분 중앙값과 견주고, 고른 급증의 첫 창 시각을 수집 서버 창구에 보내 채팅 시각 빼기 3.9초로 바꾼 영상 위치를 받고, 그 위치로 클립 서버 카드 표에 auto 카드를 넣는다. 수동 경로에서는 OBS 핫키와 웹 수동 표시가 같은 카드 표에 hotkey 카드로 넣는다. 편집기는 이 카드 표의 카드로 장면을 연다.
  C["채팅 수집 서버<br/>chat_messages 표"] --> D["chat-detector<br/>5초 창 · 15분 중앙값 판정"]
  D <-->|"위치 묻기"| P["수집 서버 위치 변환<br/>채팅 시각 − 3.9초"]
  D -->|"auto"| J[("클립 서버 카드 표")]
  H["OBS 핫키 · 웹 수동 표시"] -->|"hotkey"| J
  J --> E["편집기에서 장면 열기"]
  style H fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

자동 판별이 아무 카드도 내지 못해도 편집은 카드 표에서 시작할 수 있습니다. 다만 편집 뒤쪽은 아직 끝까지 이어지지 않았습니다. 카드로 장면을 열고 구간을 고르는 편집기는 웹에 있지만, 최종 파일을 만드는 렌더 일꾼은 v1.0.0 출시 이미지에 들어가지 않았습니다([PR #466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466)). 자막을 맡을 AI 일꾼 폴더에는 빈 자리 파일만 있습니다([`workers/ai`](https://github.com/3K-PokeClip/PokeClip-mono/tree/2fc2323cbd84a683e935bfdf9f0171febf276535/workers/ai), 용도는 Whisper 자막 — [workers/README.md 9·46행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/workers/README.md?plain=1#L9-L46)). 카드의 출처가 auto든 hotkey든 편집기는 같은 카드 표에서 장면을 엽니다. 그 뒤의 렌더(배경음악 트랙 끄기 포함)와 자막은 아직 출시본에 없습니다.

이 구조에서 남는 것은 자동 카드의 발행량이 아니라, 사람이 순간을 표시했다면 그 장면이 카드 표에 남는다는 점입니다. 두 출처의 카드가 한 표에 모이므로, 탐지기가 확신하지 못하는 방송에서도 편집의 시작점은 사라지지 않습니다.

## 정확도는 아직 재지 않았습니다

탐지가 맞는 장면을 고르는지는 재지 않았습니다. 정답 장면 목록을 만들어 놓친 장면과 잘못 고른 장면을 센 적이 없고, 채널별로 기준선과 창 길이를 바꿔 비교한 적도 없습니다. 코드 주석에 남은 관찰은 9월 13일 실방송의 「30초 튐에 카드 8장」과, 사건 간격 10초에서 한 장면이 카드 두 장으로 쪼개진 일 두 가지입니다. 둘 다 정확도가 아니라 카드를 묶는 방식을 고친 계기였습니다.

10월 15일 검토한 [포트폴리오 54쪽](/portfolio/2026-10-15-v2/full.pdf#page=54)은 이 사례를 본문에서 참고 기록으로 내렸습니다. 정확도·효율 개선 실측과, 팀 연구에 견준 구체적 선택과 반례 검증의 근거가 더 필요하다는 이유였습니다. 11월 코드가 출시된 지금도 정확도 수치가 없다는 점은 같습니다.

남은 확인은 구체적입니다. 같은 방송에서 메시지 수 판정과 고유 참여자 수 판정을 나란히 돌려 도배를 실제로 걸러 내는지, 15분·3배·10건을 채널 크기별로 바꿨을 때 어떤 장면을 놓치거나 잘못 고르는지, 3.9초 보정이 SOOP과 운영 환경에서도 맞는지 재야 합니다.

자동 판별의 기준이 임시값이라면, 그 기준이 틀려도 사용자가 하던 일을 계속할 수 있는 경로부터 두십시오. 가짜 카드는 기능을 버리게 만들고, 놓친 장면은 손으로 표시하면 됩니다. 손해가 이렇게 비대칭이면 기준값은 덜 잡히는 쪽으로 둘 수 있습니다.

## 측정 조건

채팅 시각 보정값 3,900ms([services/README.md 448행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/README.md?plain=1#L448) · [464–496행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/README.md?plain=1#L464-L496), 팀 실측):

- 날짜·장소: 2026년 8월 24일, 로컬 개발 노트북. 당시 EC2 개발 환경에는 녹화 조각 장부가 없어 거기서 잴 수 없었습니다.
- 방법: 20초마다 흰 번쩍임이 들어간 같은 화면을 치지직과 우리 미디어 서버에 동시에 송출하고, 치지직 방송 화면을 보고 채팅을 쳤습니다. 변환 창구가 답한 위치와 녹화 조각에서 자동 검출한 번쩍임 위치(30fps 프레임 단위, 판독 오차 ±33ms)의 차가 한 회차의 보정값입니다.
- 결과: 표본 20개 중앙값 3,884ms를 반올림해 3,900ms. 평균 4,100ms, 범위 3,746~4,977ms. 늦게 쳤다고 먼저 신고한 1건과 물리적으로 불가능한 음수 2건을 뺐고, 셋을 넣어도 중앙값은 3,844ms입니다.
- 보정: 측정 기계의 시계가 4.0초 느려 그만큼 뺀 값입니다(NTP 두 곳으로 확인).
- 보증하지 않는 것: 치지직 한 곳, 시청자 한 명(방송자 본인), 테스트 화면 송출, 로컬 기계, 손으로 뺀 시계 차. SOOP과 운영 환경에서는 재지 않았습니다.

판정 기준값(5초 창, 15분 중앙값, 3배, 10건, 워밍업 24창, 사건 간격 20초, 앞 15초 · 뒤 5초)은 PokeClip-mono develop `2fc2323c`(2026년 11월 12일 02:10 KST)의 설정 기본값이고, chat-detector는 v1.0.0 이후 바뀌지 않았습니다. 운영 IaC는 `DETECTION_*`과 `CHAT_SYNC_OFFSET_MS`를 넣지 않고 서버 기본값을 쓴다고 적습니다([prod platform README 226–230행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/infra/terraform/prod/platform/README.md?plain=1#L226-L230)). 런타임에 주입된 값까지 확인하지는 않았습니다.

## 출처

- [PokeClip-mono chat-detector `application.yml`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/resources/application.yml#L88-L147) · [`Baseline.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/java/com/pokeclip/chat/detector/detect/Baseline.java#L5-L33) · [`SpikeDetector.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/java/com/pokeclip/chat/detector/detect/SpikeDetector.java) · [`HighlightPublisher.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-detector/src/main/java/com/pokeclip/chat/detector/publish/HighlightPublisher.java#L83-L144) — 판정 기준과 카드 구간(develop `2fc2323c`, 2026-11-12)
- [PokeClip-mono chat-collector `application.yml`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/chat-collector/src/main/resources/application.yml#L345-L395) · [`services/README.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/README.md?plain=1#L464-L496) — 채팅 시각 보정값과 8월 24일 측정
- [PokeClip-mono `mark-hotkey.cpp`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/obs-plugin/src/mark-hotkey.cpp) · [`useManualMarking.ts`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/web/src/features/broadcast/livenow/useManualMarking.ts#L13-L18) · [`WebMarkService.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/clip/src/main/java/com/pokeclip/clip/mark/WebMarkService.java#L26-L27) · [`V202__create_jump_cards.sql`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/services/clip/src/main/resources/db/migration/V202__create_jump_cards.sql#L33) — 수동 표시와 카드 표
- [PokeClip-mono prod platform README](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/infra/terraform/prod/platform/README.md?plain=1#L226-L230) — 운영 IaC가 판정값 · 보정값을 넣지 않고 서버 기본값을 씀
- [PokeClip-mono PR #134](https://github.com/3K-PokeClip/PokeClip-mono/pull/134) — chat-detector 첫 구현(2026-08-26 병합)
- [PokeClip-mono PR #466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466) — v1.0.0 첫 출시본과 출시 이미지 목록(2026-11-03)
- [PokeClip-mono `workers/README.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/workers/README.md?plain=1#L9-L46) · [`workers/ai`](https://github.com/3K-PokeClip/PokeClip-mono/tree/2fc2323cbd84a683e935bfdf9f0171febf276535/workers/ai) — 자막 일꾼 상태
- [PokeClip 하이라이트 탐지 연구 노트](https://github.com/xodbs1021/PokeClip-architecture/blob/812fac0eadeed1e1e86b155b1419512cc6019ae5/8_Pokeclip_%ED%95%98%EC%9D%B4%EB%9D%BC%EC%9D%B4%ED%8A%B8%EC%97%B0%EA%B5%AC%EB%85%B8%ED%8A%B8.md) — 2026년 7월 팀 연구 정리(채팅 신호 모델, 롤링 기준선, 워밍업, 고유 채터 가설)
- [채팅은 알고 있었다 - PokeClip 파이프라인을 갈아엎은 기록 (v3→v4)](/posts/0-to-1/pokeclip-v3-to-v4-cascade/) — 7월 3일 채팅 우선 캐스케이드 제안(출시되지 않음)
- [포트폴리오 전체본 54쪽](/portfolio/2026-10-15-v2/full.pdf#page=54) — 2026년 10월 15일 검토
- 팀 내부 설계 기록(비공개) — 7월 20일 채팅 하이라이트 결정, 채널 신뢰도에 따른 자동 탐지 비활성 계획

---

연결된 기록: [PokeClip·MediaMTX 기술 기록 모음](/posts/0-to-1/portfolio-engineering-notes/) · [포트폴리오 전체본 54쪽](/portfolio/2026-10-15-v2/full.pdf#page=54)
