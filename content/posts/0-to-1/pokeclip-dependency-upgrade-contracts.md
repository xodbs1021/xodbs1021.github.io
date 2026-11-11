---
title: "MediaMTX를 포크로 바꾸며 녹화 입력부터 다시 만들었습니다"
date: "2026-10-15T11:33:48+09:00"
lastmod: "2026-11-11T19:02:22+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "10월 5일 MediaMTX를 상류 v1.21.1에 열린 PR을 얹은 포크로 바꾸며 버전에 묶인 전제 9곳을 다시 확인했습니다. 8곳은 그대로였고 HLS 서빙에서만 동작 차이 넷이 나왔습니다. 녹화 fixture를 새 서버로 다시 만들어 기대값 6개를 고쳤고, 재포장 골든 출력은 바이트 단위로 같았습니다. 제품 핀은 11월 11일에도 v1.21.1-pokeclip.2이고 dev 서버 핀은 따로 올렸습니다."
tags: ["개발 사례", "PokeClip"]
portfolio_cases: []
portfolio_pages: [36]
portfolio_edition: "2026-10-15-v2"
---

2026년 10월 5일 PokeClip은 MediaMTX를 v1.20.1 포크에서 `v1.21.1-pokeclip.1`로 올렸습니다. 상류 v1.21.1 위에 아직 열린 상류 PR 3건과 수정 1건을 얹은 포크입니다. 이미지 태그만 바꾸면 시험은 계속 옛 서버가 만든 녹화 파일을 읽으므로, 이 버전에 기대는 전제 9곳을 모두 다시 확인했습니다. 8곳은 그대로였고 HLS 서빙에서만 동작 차이 넷이 나왔습니다. 그중 하나는 세션이 살아 있어도 송출이 끊기면 30초 동안 404를 내는 동작입니다. 녹화 fixture를 새 서버로 다시 녹화해 기대값 6개를 고쳤고, 재포장 골든 출력은 init 1,159바이트, 조각 141,788바이트로 바이트 단위까지 같았습니다. 변경은 10월 7일 0시 13분 [PR #217](https://github.com/3K-PokeClip/PokeClip-mono/pull/217)로 머지됐습니다.

열린 상류 PR을 실은 포크로 제품과 dev 서버를 함께 올리자는 10월 5일 결정과 PR 머지는 제가 했습니다. 재포장 코드 자체를 고쳐야 하면 멈추라는 조건도 제가 걸었습니다. 전제 9곳을 다시 확인하는 방법과, 골든·기대값은 시험 대상이 아닌 별도 프로그램의 산출로만 고친다는 통과 조건은 AI가 정했습니다. 구현과 실측은 Claude Code, 리뷰는 Claude Code와 Codex가 했습니다.

## 버전에 묶인 전제 9곳 가운데 HLS 서빙 경계만 달라졌습니다 {#태그보다-먼저-확인한-것은-소비자의-전제였습니다}

미디어 문서는 「고정한 버전이라서 참인 사실」에 기대는 자리 9곳을 적어 두고, 버전을 올릴 때마다 다시 확인합니다([`media/README.md` 「버전에 묶인 전제 9곳」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L2820-L2836)). 이 목록이 생긴 이유는 [MediaMTX 도입 글](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/#버전을-올릴-때마다-같은-입력을-다시-통과시켜야-합니다)에 있습니다. 전제가 깨져도 오류는 나지 않습니다. 훅이 조용히 안 돌거나 조각 길이가 조용히 틀릴 뿐입니다.

| 묶음 | 무엇을 전제하나 | 10월 5일 결과 |
|---|---|---|
| 설정 상속 · 훅 명령 분해 · 훅 이름(1–4) | 기본값 묶음이 모든 경로에 상속되고, 훅 명령은 쪼갠 뒤 변수를 넣음 | 그대로. 이름 없는 경로 송출 3회에 훅 3종이 모두 불림 |
| 녹화 파일(5–7) | 파일 길이 상자가 가장 긴 트랙 길이와 같고, 상자 배치와 쓰기 간격 기본값(1초)이 같음 | 그대로. 실측 녹화 39개에서 길이 차 최대 1.0ms |
| 비root 쓰기(8) | MediaMTX가 루트 파일 시스템에 쓰지 않음 | 그대로. UID 10002로 녹화, 권한 오류 0 |
| HLS 서빙 경계(9) | 첫 요청 302 · 쿠키 속성 · 쿠키 없는 세션 폴백 | 셋은 그대로, 동작 차이 넷 |

버전을 올릴 때 서버가 뜨는지와 소비자가 기대하는 동작이 그대로인지를 나눠 봤습니다. 다음 두 절이 바뀐 것과 그대로 둔 것입니다.

## 녹화 입력은 다시 만들고 재포장 골든은 그대로 뒀습니다

fixture는 시험에 쓰는 고정 입력이고, 골든은 기대하는 출력입니다. 새 서버로 녹화하면 입력 파일의 세부 값은 달라질 수 있지만, 같은 입력을 재포장한 출력까지 달라져도 되는지는 별개의 질문입니다. 둘을 한꺼번에 새 결과로 덮으면 필요한 갱신 속에 회귀가 섞입니다.

운영 형상과 같은 1080p 영상 1개와 소리 6개짜리 조각 `segment_1v6a.mp4`를 새 포크로 다시 녹화했습니다([`fixture_test.go` 21–31행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/playback/fixture_test.go#L21-L31)). 그 입력에서 읽는 기대값 6개(조각 위치 정보 mtxi 4개, 트랙 끝 시각 2개)를 고쳤습니다. 이 값은 시험 대상 코드가 아니라 별도 판독으로 얻은 값으로만 바꿨습니다.

재포장 골든은 손대지 않았습니다. 골든의 입력은 새 fixture가 아니라 8월 1일 MediaMTX 1.19.3이 녹화한 `segment_4s.mp4`입니다. 이 옛 입력을 새 라이브러리(mediacommon v2.9.5)로 다시 재포장했더니 init 1,159바이트, 조각 141,788바이트로 sha256까지 같았습니다([`producer_test.go` 640–661행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/playback/producer_test.go#L640-L661)). 「새 입력으로 녹화했는데 출력이 같았다」는 뜻이 아닙니다. 같은 입력에서 재포장 계약이 유지됐다는 뜻입니다.

골든만으로는 라이브러리 판이 바뀐 것을 잡지 못합니다. mediacommon v2.9.3, v2.9.4, v2.9.5의 산출이 이 입력에서는 모두 같았기 때문입니다. 그래서 재포장 라이브러리가 녹화기와 같은 판인지 대조하는 시험을 짝으로 둡니다([680–683행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/playback/producer_test.go#L667-L683)). 지금 판은 mediacommon v2.9.5, go-mp4 v1.7.3입니다([`media/go.mod`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/go.mod#L10-L18)).

## 세션이 살아 있어도 송출이 끊기면 30초 동안 404가 나옵니다

HLS 서빙의 동작 차이 넷은 상류 v1.21.0–v1.21.1에 들어간 PR에서 왔습니다.

| 바뀐 것 | 상류 PR(릴리스) |
|---|---|
| HLS 세션 수명을 서버가 관리 | [#6239](https://github.com/bluenviron/mediamtx/pull/6239)(v1.21.1) |
| 세션이 유효해도 muxer가 닫히면 404 | [#6240](https://github.com/bluenviron/mediamtx/pull/6240)(v1.21.1) |
| 세션 없음 401의 본문이 `authentication error`에서 `session not found`로 | [#6241](https://github.com/bluenviron/mediamtx/pull/6241)(v1.21.1) |
| CORS가 `*` 대신 요청 Origin을 돌려주고 `Vary: Origin`을 붙임 | [#6200](https://github.com/bluenviron/mediamtx/pull/6200) · [#6201](https://github.com/bluenviron/mediamtx/pull/6201)(v1.21.0) |

플레이어가 같은 주소를 계속 요청하는 동안 송출을 끊으면 응답이 세 번 바뀝니다. 영상에서 응답 칸이 바뀌는 지점이 그 경계입니다.

{{< motion scene="HlsSessionAfterCut" id="fig-hls-session-after-cut" kind="개념도" caption="유효한 HLS 세션으로 같은 주소를 계속 요청하는 동안 송출을 끊으면, 끊김을 알아채기 전인 1–10초는 200, 11–40초는 세션이 살아 있어도 404, 41초부터는 401이 나옵니다. 요청이 이어져도 404 구간은 늘지 않습니다. PR #217 본문의 v1.21.1-pokeclip.1 실측값을 옮긴 개념도입니다." >}}

404 구간은 30초이고, 요청을 계속 보내도 늘어나지 않았습니다([PR #217](https://github.com/3K-PokeClip/PokeClip-mono/pull/217)). 요청 없이 둔 세션의 만료는 10초 주기로 검사해서, 마지막 요청 뒤 30–40초 사이에 끝납니다(35초 쉰 세션은 200, 45초 쉰 세션은 401). 그대로인 것은 첫 요청의 302 `cookieCheck`, 쿠키 속성, 쿠키 없는 `?session=` 폴백입니다. 응답 코드나 오류 문구로 상태를 판단하는 소비자가 있다면 이 차이를 함께 봐야 합니다.

부수 변화도 하나 있었습니다. Control API의 교차 출처 허용 기본값 `apiAllowOrigins`가 `["*"]`에서 `[]`로 바뀌었습니다([#6165](https://github.com/bluenviron/mediamtx/pull/6165), [v1.21.1 `mediamtx.yml` 161행](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/mediamtx.yml#L161)). 제품 설정은 이 키를 적지 않으므로 다른 출처의 브라우저 페이지는 API 응답을 읽지 못합니다. 사이드카처럼 서버에서 부르는 호출에는 영향이 없습니다.

## 검사할 Dockerfile이 없으면 검사도 실패합니다 {#검사할-입력이-없어도-통과하는-검사는-피했습니다}

이미지 태그와 시험 상수를 대조하는 검사는 두 값이 다를 때만 실패하면 부족합니다. Dockerfile을 찾지 못하거나 `FROM`에 태그가 없을 때 검사가 건너뛰어지면, 검증이 사라진 상황이 통과로 보입니다. 8월 4일 훅 스풀 PR([#33](https://github.com/3K-PokeClip/PokeClip-mono/pull/33))에서 만든 첫 판은 파일을 못 읽을 때, MediaMTX `FROM`이 없을 때, `FROM`이 두 곳 이상일 때, 태그가 없을 때 실패하게 했습니다.

8월 30일에는 「`FROM`이 두 곳 이상이면 실패」를 「마지막 `FROM`만 본다」로 바꿨습니다. 여러 단계 빌드에서 쓰지 않는 스테이지에 포크를 적어 검사를 우회하는 경로를 막는 회귀 시험도 함께 뒀습니다. 지금 검사는 파일을 못 읽거나, 최종 스테이지가 포크가 아니거나, 다이제스트나 태그가 없으면 실패합니다([`version_contract_test.go` 238–330행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/mtxhook/version_contract_test.go#L238-L330)). 이 검사는 MediaMTX 자체의 보안 검사가 아니라, 우리 저장소가 정한 의존성 조합을 지키는 검사입니다.

## 제품 핀은 지금도 .2이고 dev 서버 핀은 따로 올렸습니다 {#정식-릴리스와-제품-포크를-구분했습니다}

상류 수정이 릴리스에 들어갔다는 사실과 우리 제품이 그 버전을 실제로 쓴다는 사실은 다릅니다. [[fig-mtx-pin-timeline]]이 10월 이후 핀의 흐름입니다.

```mermaid {#fig-mtx-pin-timeline kind="재구성" caption="MediaMTX 핀의 흐름(한국 시각). 10월 7일 제품과 dev 서버가 v1.21.1-pokeclip.1로 함께 올랐고, 10월 12일 제품 핀이 .2로 바뀌었습니다. 같은 날 dev 서버 핀을 제품과 따로 올리도록 규칙을 바꿔, 10월 20일 dev 서버만 v1.21.2-pokeclip.1로 올렸습니다. 11월 3일 운영 상자는 .2로 기동했고(청록), dev 상자는 11월 6일 멈췄습니다. PokeClip-mono PR #217 · #231 · #296 · #466과 팀 작업 기록 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/Dockerfile.mtxhook#L75-L85"}
flowchart TB
  accTitle: MediaMTX 핀의 흐름
  accDescr: 10월 5일 포크로 제품과 dev를 함께 올리기로 정했다. 10월 7일 PR 217이 머지돼 v1.21.1-pokeclip.1이 되고 같은 날 dev 서버에 반영됐다. 10월 12일 PR 231로 제품 핀이 .2가 됐고 10월 19일 dev 서버에 반영됐다. 10월 20일 PR 296으로 dev 서버 핀만 v1.21.2-pokeclip.1로 올렸다. 11월 3일 운영 상자가 .2로 기동했고 11월 6일 dev 상자가 멈췄다.
  d1[10/5 · 열린 상류 PR을 실은<br/>포크로 제품 + dev 결정]
  p1[10/7 · PR #217 머지<br/>v1.21.1-pokeclip.1 · dev 반영]
  p2[10/12 · PR #231 제품 핀 .2<br/>.1 + #6292 체리픽 + #6306]
  p3[10/19 · dev 서버에 .2 반영]
  p4[10/20 · PR #296 dev 핀만<br/>v1.21.2-pokeclip.1]
  p5[11/3 · 운영 상자 .2로 기동]
  p6[11/6 · dev 상자 정지]
  d1 --> p1 --> p2 --> p3 --> p4 --> p5 --> p6
  style p5 fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

`.1`은 상류 v1.21.1(`04825598`) 위에 제가 올린 상류 PR 셋([#6206](https://github.com/bluenviron/mediamtx/pull/6206) · [#6259](https://github.com/bluenviron/mediamtx/pull/6259) · [#6261](https://github.com/bluenviron/mediamtx/pull/6261))과 훅 출력 로깅 수정 하나를 얹었습니다. 10월 12일 머지한 `.2`([PR #231](https://github.com/3K-PokeClip/PokeClip-mono/pull/231))는 여기에 상류에서 10월 6일 머지돼 v1.21.2에 들어간 [#6292](https://github.com/bluenviron/mediamtx/pull/6292)를 체리픽하고, 사용자별 SRT 암호 [#6306](https://github.com/bluenviron/mediamtx/pull/6306)을 더했습니다. 이 PR에서 dev 서버 핀을 제품 핀과 묶는 규칙을 없앴습니다. 그래서 10월 20일 [PR #296](https://github.com/3K-PokeClip/PokeClip-mono/pull/296)은 dev 서버만 `v1.21.2-pokeclip.1`로 올렸습니다. 이 판은 v1.21.2 태그가 아니라 상류 main `3f041257` 위에 열린 PR 5건을 얹은 것입니다. v1.21.2 태그 위에서는 패치가 충돌했습니다.

실린 PR의 처지도 바뀌었습니다. #6206은 닫혔고 메인테이너의 대체 수정 [#6326](https://github.com/bluenviron/mediamtx/pull/6326)이 v1.21.3에 들어갔습니다. #6261도 10월 25일 닫혔고 메인테이너가 다시 구현한 수정이 같은 판에 들어갔습니다. #6259와 훅 출력 로깅을 따로 낸 [#6380](https://github.com/bluenviron/mediamtx/pull/6380), #6306은 11월 11일에도 열려 있습니다. 상류는 v1.21.2(10월 9일)와 v1.21.3(10월 25일)을 냈지만 제품 핀은 그대로 `.2`입니다([`media/Dockerfile.mtxhook` 85행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/Dockerfile.mtxhook#L85)). 멈춘 dev 서버의 마지막 핀은 `v1.21.2-pokeclip.1`입니다([`infra/dev-media/compose.yml` 23행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/dev-media/compose.yml#L23)). 실린 수정이 모두 상류 릴리스에 들어가면 포크를 걷어낸다는 조건은 Dockerfile에 적혀 있습니다([75–84행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/Dockerfile.mtxhook#L75-L84)).

포트폴리오 요약(2026-10-15판) 36쪽은 PR #217 병합일을 10월 6일로 적었지만 한국 시각으로는 10월 7일 0시 13분입니다. 전제 9곳의 재확인도 그 쪽에서는 제가 한 것으로 읽히지만, 재확인 방법과 실행은 AI가 했습니다. 「제품·개발 환경이 같은 버전을 바라보도록」은 `.1` 때만 참이었고, 10월 12일부터 두 핀은 따로 움직였습니다. 같은 쪽의 「194개 PASS·변형 오류 7/7 탐지」는 8월 4일 훅 스풀 PR의 값이고, 7/7은 그 PR 본문에 뮤턴트 사고실험으로 적혀 있습니다.

의존성을 올릴 때는 실제로 쓸 입력으로 다시 검증하고, 입력이 바뀌어야 하는 자리와 출력이 그대로여야 하는 자리를 미리 나누십시오. 그리고 검사할 입력이 없을 때 검사가 실패하는지부터 확인하십시오.

## 측정 조건

- 10월 5일 재검증: 포크 `v1.21.1-pokeclip.1` 이미지를 arm64에서 실행, 이름 없는 경로 송출 3회, 실측 녹화 39개를 ffprobe와 장부 길이로 대조, HLS 요청을 송출 끊김 전후로 반복. AI가 수행했고 결과 요약은 PR #217 본문과 `media/README.md`에 있습니다.
- 골든 대조: 1.19.3 녹화 `segment_4s.mp4`를 mediacommon v2.9.5로 재포장한 init·조각의 길이와 sha256을 고정값과 비교.
- 핀 반영 시각 가운데 dev 서버 반영(10월 7·19·20일)과 운영 상자 기동(11월 3일), dev 상자 정지(11월 6일)는 비공개 작업 기록입니다.
- 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일)이고, PR 상태와 상류 릴리스는 2026년 11월 11일에 확인했습니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #217](https://github.com/3K-PokeClip/PokeClip-mono/pull/217) — v1.21.1-pokeclip.1 전환과 재검증(2026-10-07 머지)
- [3K-PokeClip/PokeClip-mono PR #231](https://github.com/3K-PokeClip/PokeClip-mono/pull/231) · [PR #296](https://github.com/3K-PokeClip/PokeClip-mono/pull/296) — 제품 핀 .2, dev 핀 v1.21.2-pokeclip.1
- [3K-PokeClip/PokeClip-mono PR #33](https://github.com/3K-PokeClip/PokeClip-mono/pull/33) — 훅 스풀과 첫 버전 계약 검사(2026-08-04)
- [`media/README.md` 「버전에 묶인 전제 9곳」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L2820-L2873) — 전제 목록과 재검증 기록
- [`media/internal/playback/producer_test.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/playback/producer_test.go#L640-L683) — 골든과 판 일치 시험
- [`media/internal/mtxhook/version_contract_test.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/mtxhook/version_contract_test.go#L238-L330) — 버전 계약 검사
- [`media/Dockerfile.mtxhook`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/Dockerfile.mtxhook#L75-L85) — 제품 핀과 포크를 걷어낼 조건
- 상류 PR [bluenviron/mediamtx#6239](https://github.com/bluenviron/mediamtx/pull/6239) · [#6240](https://github.com/bluenviron/mediamtx/pull/6240) · [#6241](https://github.com/bluenviron/mediamtx/pull/6241) · [#6200](https://github.com/bluenviron/mediamtx/pull/6200) · [#6201](https://github.com/bluenviron/mediamtx/pull/6201) · [#6165](https://github.com/bluenviron/mediamtx/pull/6165) — HLS 서빙과 CORS 변화
- 상류 PR [#6206](https://github.com/bluenviron/mediamtx/pull/6206) · [#6326](https://github.com/bluenviron/mediamtx/pull/6326) · [#6259](https://github.com/bluenviron/mediamtx/pull/6259) · [#6261](https://github.com/bluenviron/mediamtx/pull/6261) · [#6292](https://github.com/bluenviron/mediamtx/pull/6292) · [#6306](https://github.com/bluenviron/mediamtx/pull/6306) · [#6380](https://github.com/bluenviron/mediamtx/pull/6380) — 포크에 실린 수정과 그 처지
- [MediaMTX v1.21.1 릴리스](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.1)
- [Go로 다 짜려던 미디어 서버를 MediaMTX에 맡겼습니다](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/) — 포크 방침과 전제 9곳의 출발
- 팀 작업 기록(비공개) — dev 서버 반영, 운영 상자 기동, dev 상자 정지

---

[개발 사례 전체 모음](/posts/0-to-1/portfolio-engineering-notes/) · [같은 판의 포트폴리오 PDF](/portfolio/2026-10-15-v2/full.pdf#page=36)
