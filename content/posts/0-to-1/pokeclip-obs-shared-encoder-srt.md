---
title: "본방 인코더를 SRT와 나눠 쓰자 GOP와 종료가 묶였습니다"
date: 2026-10-15T11:27:08+09:00
lastmod: "2026-11-11T18:16:30+09:00"
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "OBS", "SRT"]
description: "OBS 본방(RTMP)의 영상 인코더를 PokeClip용 SRT 출력과 나눠 쓰기로 하자, GOP 2초는 인코더가 만들어지기 직전에만 맞출 수 있었고 녹화가 GOP 2초가 아닌 설정으로 인코더를 이미 돌리고 있으면 SRT 시작을 거절해야 했으며 본방이 멈추면 SRT도 함께 멈춰야 했습니다. 9월 13일 로컬 측정의 x264 1개 · 조각 4.06–4.07초, passphrase를 URL 밖으로 보낸 구조와 암호를 끈 첫 측정, 송출 쪽이 보장하지 못한 11월 7.66초 조각, 11월 latency 3초 변경까지."
draft: false
portfolio_cases: [7]
portfolio_pages: [26]
portfolio_edition: "2026-10-15-v2"
---

방송자는 OBS로 치지직에 RTMP 본방을 보냅니다. 같은 화면을 PokeClip에도 보내려고 영상 인코더를 하나 더 돌리지 않고, 본방이 만든 압축 프레임을 SRT 출력에도 그대로 넘기기로 했습니다. 인코더를 나눠 쓰자 설정과 수명도 함께 묶였습니다. 서버가 요구하는 GOP(키프레임 간격) 2초는 인코더가 만들어지기 직전에만 맞출 수 있었고, 녹화가 GOP 2초가 아닌 설정으로 그 인코더를 이미 돌리고 있으면 SRT 시작을 거절해야 했고, 본방이 멈추면 SRT도 함께 멈춰야 했습니다. 본방 GOP도 2초가 됩니다. 9월 13일 팀원의 로컬 측정에서 x264 인스턴스 하나로 RTMP·SRT 녹화가 함께 생겼고, 받은 조각은 4.06–4.07초였습니다. GOP 2초를 요구해도 조각 길이까지 송출 쪽이 보장하지는 못해, 11월 4일 시험 방송에서는 7.66초 조각 하나가 나왔습니다.

인코더를 공유하는 동시 송출(7월 20일), GOP 2초를 플러그인이 강제하는 것, 송출 규격 고정(8월 31일), 9월 13일 팀원이 먼저 착수한 플러그인 담당을 9월 26일 정식으로 넘긴 것, SRT latency를 3초로 올린 것(11월 9일)은 제가 정했습니다. 플러그인 구현과 9월 13일 측정([PR #179](https://github.com/3K-PokeClip/PokeClip-mono/pull/179))은 팀원이 했고, latency 변경 코드([PR #493](https://github.com/3K-PokeClip/PokeClip-mono/pull/493))는 AI(Claude Code)가 짰습니다.

## obs-multi-rtmp에서 출력 수명 부분만 옮겼습니다 {#범용-플러그인-전체보다-출력에-필요한-부분을-가져왔습니다}

본방 출력의 영상·오디오 인코더를 참조하는 SRT(MPEG-TS) 출력을 하나 더 띄우는 구조입니다. 같은 일을 하는 공개 플러그인이 있었습니다. [sorayuki/obs-multi-rtmp](https://github.com/sorayuki/obs-multi-rtmp)는 본방 인코더를 공유해 여러 곳에 동시에 송출합니다. 다만 송출 대상마다 URL과 키를 직접 적는 범용 편집 화면이 있고, PokeClip은 페어링 코드로 계정을 연결해 방송자가 주소나 키를 만지지 않게 하려 했습니다.

| 대안 | 장점 | 남는 문제 |
|---|---|---|
| 영상 인코더를 하나 더 | 출력 설정을 따로 바꿀 수 있음 | 같은 화면을 두 번 인코딩 |
| obs-multi-rtmp를 포크하고 PokeClip 대상만 자동 추가 | 작업이 가장 적음 | 방송자에게 SRT URL·키 편집 창이 열림 |
| 본방 인코더 공유 + 출력 수명 부분만 옮기기 | 추가 영상 인코딩 없음, 무설정 화면 | 본방의 시작·실패·종료에 수명을 맞춰야 함 |

플러그인은 obs-multi-rtmp 0.7.4.3을 바탕으로 범용 편집 화면은 걷어 내고, 출력 생성·인코더 참조·해제 순서만 옮겼습니다([`obs-plugin/README.md` 54행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/README.md?plain=1#L54)). 옮긴 부분이 가장 틀리기 쉬운 곳이었습니다. 리뷰에서 원본이 인코더 참조를 하나 더 잡는 것이 드러났습니다. OBS 32에서는 출력에 인코더를 붙이는 함수가 스스로 참조를 잡기 때문에, OBS를 끄거나 프로필을 바꿀 때 그 몫이 샐 수 있었습니다. 팀원은 추가 참조를 없애 출력이 인코더를 소유하게 고쳤습니다(PR #179 본문 「독립 리뷰에서 고친 것」).

[[fig-shared-encoder-layout]]은 인코더 하나와 출력 둘, 그리고 비밀이 지나는 길입니다. 강조한 칸이 URL 밖의 passphrase입니다.

```mermaid {#fig-shared-encoder-layout kind="개념도" caption="본방 출력의 x264 인코더와 오디오 인코더를 RTMP 본방 출력과 SRT 출력이 함께 씁니다. SRT 주소에는 수신 호스트와 latency 같은 값만 담고, streamid와 passphrase는 OBS 서비스의 키 칸과 암호 칸으로 따로 넘깁니다. 독 화면은 루프백 브리지로 플러그인과 통신합니다. PokeClip-mono develop 825a3dfe의 obs-plugin/README.md 「구조」와 PR #179 본문 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/README.md?plain=1#L28-L52"}
flowchart TB
  accTitle: 본방 인코더를 공유하는 SRT 출력의 구성
  accDescr: 본방 출력의 x264 인코더와 오디오 인코더를 RTMP 본방 출력과 SRT 출력이 함께 쓴다. SRT 출력의 주소에는 비밀이 없고 streamid와 passphrase는 별도 칸으로 넘긴다. 독 페이지는 127.0.0.1 루프백 브리지로 플러그인 코어와 통신한다.
  DOCK["독 페이지<br/>브라우저 패널"] <-->|"127.0.0.1 브리지"| CORE["플러그인 코어"]
  CORE -->|"페어링으로 받은 값"| KEY["streamid · passphrase<br/>키 칸 · 암호 칸"]
  ENC["본방 인코더<br/>x264 1개 · 오디오"] --> RTMP["RTMP 본방 출력<br/>치지직"]
  ENC --> SRT["SRT 출력 · MPEG-TS<br/>주소에는 비밀 없음"]
  KEY --> SRT
  style KEY fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

## GOP 2초는 인코더가 만들어지기 직전에만 바꿀 수 있었습니다 {#gop-2초를-맞추되-실행-중인-인코더는-조용히-바꾸지-않았습니다}

서버는 GOP 2초를 요구했습니다. 녹화 조각을 4초로 자르므로 조각 길이가 GOP의 정수배여야 하기 때문입니다([`constants.hpp` 74–75행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/constants.hpp#L74-L75)). 인코더를 공유하므로 이 값을 SRT 쪽에만 줄 수는 없습니다. 플러그인은 본방 인코더의 `keyint_sec`를 2로 바꾸고, `x264opts`·`opts`에 따로 적힌 keyint 계열 값을 걷어 냅니다([`gop-guard.cpp` 44–77행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/gop-guard.cpp#L44-L77)). 치지직 송출 프리셋의 keyint 1초도 2초로 덮이므로, 본방 GOP도 2초가 됩니다.

언제 바꾸느냐가 문제였습니다. 팀원은 OBS 32.2.1 소스에서 시작 순서를 확인했습니다. 프로필의 인코더 설정을 적용한 뒤 `STREAMING_STARTING` 이벤트가 오고, 그다음 출력이 시작되면서 인코더가 만들어집니다. 그 사이에 인코더 설정을 다시 건드리는 코드가 없으므로 `STREAMING_STARTING`에서 넣은 값이 살아남습니다(PR #179 본문 「GOP는 STREAMING_STARTING에서 바꾼다」).

예외는 녹화가 이미 본방 인코더를 공유해 돌고 있고, 그 인코더의 `keyint_sec`가 2가 아니거나 `x264opts`·`opts`에 keyint 값이 따로 적혀 있을 때입니다. 실행 중인 x264는 GOP를 바꾸지 못합니다. 이것은 실측이 아니라 소스를 대조한 판단으로, x264의 설정 갱신 함수 `x264_encoder_reconfig`가 최대 키프레임 간격(`i_keyint_max`)을 옮기지 않습니다. 이때 플러그인은 다른 GOP로 조용히 보내지 않고 `encoder_active` 사유로 SRT 시작을 거절합니다([`gop-guard.cpp` 52–63행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/gop-guard.cpp#L52-L63)). 이미 GOP 2초로 돌고 있으면 바꿀 것이 없으므로 그대로 공유합니다. 본방은 어느 쪽이든 그대로 나갑니다. 멀티트랙 영상(Twitch 향상된 방송)처럼 인코더가 따로 도는 출력도 공유 대상이 아니라 거절합니다([`gop-guard.cpp` 23–28행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/gop-guard.cpp#L23-L28)).

영상의 위 줄이 시작 순서, 아래가 인코더 하나와 두 출력입니다. 처음 시작, 본방 정지, 녹화가 인코더를 쓰는 중의 시작을 차례로 보십시오.

{{< motion scene="SharedEncoderStart" id="fig-shared-encoder-start" kind="개념도" caption="본방 시작 때 프로필 설정이 적용된 뒤 STREAMING_STARTING에서 keyint를 2초로 바꾸고, 인코더가 만들어지면 RTMP와 SRT가 같은 x264 하나에서 나갑니다. 본방이 멈추면 SRT도 함께 멈춥니다. 녹화가 GOP 2초가 아닌 설정으로 인코더를 이미 돌리고 있으면 GOP를 바꿀 수 없어 SRT 시작을 거절하고 본방만 나갑니다. 단계의 길이는 설명용입니다." >}}

8월 31일 정한 송출 규격 고정은 해상도, 코덱과 프로파일, 샘플레이트와 채널, 트랙 수를 송출 중에 바꾸지 않는다는 약속입니다. 플러그인 코드는 GOP 2초와 오디오 6트랙·AAC는 맞추지만([`stream-target.cpp` 478–535행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/stream-target.cpp#L478-L535)), 해상도는 1080p가 아니어도 독 화면에 경고만 띄우고 그대로 보냅니다([`gop-guard.cpp` 84–85행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/gop-guard.cpp#L84-L85)). 인코더를 본방과 나눠 쓰므로 PokeClip 쪽만 다른 해상도로 보낼 수 없기 때문입니다. 송출 중 해상도·프레임레이트 변경은 OBS 자체가 막습니다([`obs-plugin/README.md` 17행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/README.md?plain=1#L17)).

## 본방이 멈추면 SRT도 멈추고, 재연결 중에는 유지했습니다

본방 정지, 본방 접속 실패, 송출 중 OBS 종료 때 SRT 출력이 남지 않도록 같은 이벤트에서 멈추고, 인코더 참조와 서비스를 정해진 순서로 놓습니다([`plugin-main.cpp` 633–663행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/plugin-main.cpp#L633-L663), OBS 종료는 [680–686행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/plugin-main.cpp#L680-L686), 해제 순서는 [`stream-target.cpp` 428–456행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/stream-target.cpp#L428-L456)). 본방이 잠시 끊겨 OBS가 다시 붙는 동안에는 SRT를 유지해, PokeClip 녹화에 구멍을 내지 않습니다.

## passphrase는 URL 밖으로 보냈지만 첫 실측은 암호를 끈 채였습니다 {#비밀-전달과-ui는-송출-코어에서-분리했습니다}

SRT 출력은 OBS의 사용자 지정 서비스(`rtmp_custom`)로 띄웁니다. 이 서비스는 SRT일 때 키 칸을 streamid로, 암호 칸을 passphrase로 넘깁니다. 그래서 주소에는 `srt://수신:포트?latency&pkt_size&pbkeylen=32`만 남고, OBS가 주소를 로그에 적어도 비밀이 함께 남지 않습니다(PR #179 본문 「passphrase를 URL에 넣지 않는다」). latency는 주소에 마이크로초로 들어갑니다.

방송자가 보는 독 화면은 OBS 안의 브라우저 패널이고, 플러그인 코어와는 `127.0.0.1`의 임의 포트로만 통신합니다. 이 루프백 브리지는 Bearer 토큰, Host·Origin 검사, 16KB 본문 상한을 둡니다. 토큰을 주소 쿼리에 싣지 않으려고 EventSource 대신 fetch 스트리밍으로 상태를 받습니다. 브라우저 패널이 뜨지 않으면 같은 기능의 Qt 패널로 물러납니다. 독을 브라우저 패널로 만든 것은 팀원의 결정입니다. 송출 코어(SRT·인코더·GOP·재연결)는 화면 기술과 상관없는 C++ 층이라 요구 사항은 그대로였습니다.

9월 13일 측정은 passphrase를 끈 채였습니다(`send_passphrase=false`). 로컬 Compose의 MediaMTX에 송출 암호가 설정돼 있지 않아, 암호를 보내면 수신부가 연결을 끊었기 때문입니다. 당시 플러그인의 기본 인증 서버 주소도 HTTP여서, 그 주소로 페어링하면 passphrase가 평문으로 오가는 구조였습니다. 지금은 두 환경 모두 기본 주소가 HTTPS이고([`obs-plugin/README.md` 103–104행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/README.md?plain=1#L103-L104)), `send_passphrase`의 기본값은 `true`입니다([175행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/README.md?plain=1#L175)). 운영 수신부가 송출마다 스트림 키를 판정하고 그 계정의 passphrase를 돌려주는 응답기는 10월 25일 [PR #392](https://github.com/3K-PokeClip/PokeClip-mono/pull/392)로 들어갔습니다. 그 PR은 머지만으로 동작이 바뀌지 않고 운영 단계에서 응답기 모드로 바꾸게 돼 있습니다. 운영에 언제 어떻게 반영됐는지와, 11월 운영 송출에서 passphrase가 실제로 쓰였는지는 확인 기록이 없습니다.

## x264 하나에서 두 출력이 나왔고 조각은 4.06–4.07초였습니다 {#인코더-수와-실제-수신-산출물을-함께-확인했습니다}

9월 13일 팀원의 측정은 macOS OBS 32.2.2, 단순 출력 x264 1080p30, 로컬 Compose MediaMTX, 로컬 인증 서버 조건이었습니다. 본방 목적지도 치지직이 아니라 같은 MediaMTX의 RTMP였습니다.

| 확인 | PR #179의 관측 |
|---|---|
| 두 출력 | RTMP 본방과 SRT 양쪽 녹화 조각이 4초마다 생성 |
| 영상 인코더 | OBS 로그의 x264 인스턴스 1개 |
| 받은 조각의 키프레임 | 조각마다 0.07초 · 2.07초 두 개 |
| 받은 조각 길이 | 4.06–4.07초(fMP4 길이, 오디오 포함) |
| 수신부 재시작 | 끊긴 뒤 2.0초 만에 SRT 재연결 |
| 본방 정지 · 접속 실패 | 정지는 SRT가 본방보다 1.3초 먼저, 실패는 같은 밀리초에 SRT도 정지 |
| 송출 중 OBS 종료 | 1초 안에 플러그인 해제, 메모리 누수 0 |

이 측정은 추가 영상 인코더 없이 두 출력이 만들어지는 것과 그 수명을 봤습니다. CPU·GPU 절감률은 재지 않았습니다. 그 뒤 리뷰에서 고친 접속 중 정지·재시작 경합은 OBS 원본 대조와 단위 테스트까지만 확인했습니다. Windows 실기에서 동작하는지, 실제 치지직 본방과 동시에 나가는지는 확인 기록이 없습니다.

## 조각 길이까지 송출 쪽이 보장하지는 못했습니다

GOP 2초가 정하는 것은 키프레임의 위치입니다. 녹화기는 조각의 최소 길이가 지난 뒤 키프레임에서 다음 조각을 시작하고([MediaMTX `recordSegmentDuration`](https://github.com/bluenviron/mediamtx/blob/v1.19.3/mediamtx.yml#L558-L559)), 프로젝트 설정은 4초입니다([`infra/compose/mediamtx.yml` 96행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/compose/mediamtx.yml#L96)). 그래서 9월 13일 측정의 조각은 위 표처럼 4초 안팎이었습니다. GOP 2초를 요구해도 조각 길이까지 송출 쪽이 보장하지는 못합니다.

11월 4일 운영 환경으로 보낸 약 2시간짜리 시험 방송에서는 7.66초 조각 하나가 나왔습니다. 재생 목록의 목표 길이(6초)를 넘자 목록이 둘로 갈렸습니다. 갈린 두 목록의 초기화 조각(init)은 바이트가 같아 송출 설정은 그대로였고, 긴 조각이 왜 생겼는지는 확인하지 못했습니다. 이 분할은 송출 쪽이 아니라 서버 쪽에서 처리했습니다. 회차 하나에 다시보기 문서 하나를 두고 갈린 자리에 끊김 표시를 다는 방식입니다([PR #492](https://github.com/3K-PokeClip/PokeClip-mono/pull/492), [회차 다시보기 글](/posts/projects/pokeclip-round-vod/)).

## SRT latency 기본값은 11월에 1초에서 3초로 올렸습니다

9월 13일 측정 당시 플러그인의 SRT latency 기본값은 1,000ms였습니다. 11월 9일 [PR #493](https://github.com/3K-PokeClip/PokeClip-mono/pull/493)으로 3,000ms로 올렸고, 설정 파일에 남은 옛 기본값 1,000도 읽을 때 3,000으로 바꿉니다([`constants.hpp` 62–75행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/constants.hpp#L62-L75)). 송출 쪽 망이 막힌 사이 잃은 패킷의 재전송이 latency 안에 오지 못하면 수신부가 그 자리를 건너뛰어 녹화가 깨졌기 때문입니다. 대가는 평소 라이브 지연이 2초 늘어나는 것입니다. 이 값을 담은 플러그인 0.2.1 설치본은 11월 10일 공개했지만, 그 설치본으로 보낸 실제 방송은 아직 없습니다. 원인 추적과 실험은 [SRT latency 글](/posts/projects/pokeclip-srt-latency-late-retransmission/)에 있습니다.

인코더를 하나 덜 쓰는 선택이었지만, 구현에서 더 까다로웠던 것은 두 출력이 같은 인코더를 써도 되는 때였습니다. 본방 인코더를 다른 출력과 나눠 쓴다면, 시작 전에 맞출 값과 맞출 수 없을 때 거절할 조건, 본방과 함께 멈출 시점을 먼저 정하십시오. 정상 송출만 확인해서는 공유가 성립하는지 알 수 없습니다.

## 측정 조건

- 9월 13일(PR #179): macOS, OBS 32.2.2, 단순 출력 x264 1080p30, 로컬 Docker Compose의 MediaMTX와 인증 서버. 본방은 같은 MediaMTX의 RTMP(`rtmp://127.0.0.1:1935/main`)를 치지직 대신 썼고, `send_passphrase=false`, SRT latency는 당시 기본값 1,000ms였습니다. Xcode 없이 설치된 OBS.app에 링크하는 개발 빌드였습니다. 팀원이 측정했습니다.
- 11월 4일 시험 방송과 SRT latency 실험의 조건은 [회차 다시보기 글](/posts/projects/pokeclip-round-vod/)과 [SRT latency 글](/posts/projects/pokeclip-srt-latency-late-retransmission/#측정-조건)에 있습니다.
- 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일) 기준입니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #179](https://github.com/3K-PokeClip/PokeClip-mono/pull/179) — 본방 인코더를 공유하는 SRT 송출과 페어링(2026-10-01 develop 머지). 시작 순서, `x264_encoder_reconfig`, passphrase 전달, 9월 13일 실측
- [PR #392](https://github.com/3K-PokeClip/PokeClip-mono/pull/392) — 운영 송출 인증 응답기(2026-10-25 머지) · [PR #492](https://github.com/3K-PokeClip/PokeClip-mono/pull/492) — 회차 단위 다시보기 문서(2026-11-09 머지) · [PR #493](https://github.com/3K-PokeClip/PokeClip-mono/pull/493) — SRT latency 기본값 3,000ms(2026-11-09 머지)
- [PokeClip-mono `obs-plugin/README.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/README.md?plain=1#L28-L54) · [`gop-guard.cpp`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/gop-guard.cpp#L23-L85) · [`constants.hpp`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/constants.hpp#L62-L75) · [`plugin-main.cpp`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/plugin-main.cpp#L633-L686) · [`stream-target.cpp`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/stream-target.cpp#L428-L535)
- [sorayuki/obs-multi-rtmp](https://github.com/sorayuki/obs-multi-rtmp) · [MediaMTX 1.19.3 `mediamtx.yml`](https://github.com/bluenviron/mediamtx/blob/v1.19.3/mediamtx.yml#L558-L559) · [PokeClip-mono `infra/compose/mediamtx.yml`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/compose/mediamtx.yml#L96)
- [2시간 방송이 다시보기에서 7.5분만 보였던 이유](/posts/projects/pokeclip-round-vod/) · [SRT latency를 3초로 올린 이유는 늦은 재전송이었습니다](/posts/projects/pokeclip-srt-latency-late-retransmission/)
- 팀 내부 결정 기록(비공개) — 7월 20일 인코더 공유, 8월 31일 송출 규격 고정, 9월 26일 플러그인 담당 이관, 11월 9일 latency 3초

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 26쪽](/portfolio/2026-10-15-v2/full.pdf#page=26)
