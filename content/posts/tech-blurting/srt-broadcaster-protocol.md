---
title: "SRT latency는 잃은 패킷 재전송을 기다리는 상한입니다"
date: 2026-06-20T09:28:59+09:00
lastmod: "2026-11-12T14:14:56+09:00"
description: "SRT는 UDP 위에서 잃은 패킷을 NAK로 다시 받지만, 받는 쪽은 「보낸 시각 + latency」까지만 기다리고 그 뒤에는 TLPKTDROP으로 건너뜁니다. latency 협상과 기본값, 출처마다 다른 RTT 배수 권고, 두 단계 핸드셰이크, caller·listener·rendezvous, 소켓 그룹, MPEG-TS가 맡는 멀티 오디오, 마이크로초 단위 주소 옵션과 streamid를 libsrt 문서와 IETF 드래프트로 확인했습니다."
categories: ["tech-blurting"]
tags: ["SRT", "libsrt", "OBS", "FFmpeg", "MPEG-TS", "라이브 송출"]
draft: false
---

인터넷으로 영상을 보내면 패킷이 사라지거나 늦게 옵니다. TCP는 잃은 바이트가 다시 올 때까지 뒤 데이터를 응용에 넘기지 않고, 날 UDP는 잃은 것을 되찾지 않습니다. SRT(Secure Reliable Transport)는 UDP 위에서 잃은 패킷을 NAK(Negative Acknowledgement)로 다시 받되, 받는 쪽이 패킷을 「보낸 시각 + latency」에 내보내고 그때까지 재전송이 오지 않으면 그 자리를 건너뜁니다. libsrt의 latency 기본값은 120ms이고 양쪽이 제시한 값 가운데 큰 값으로 정해집니다. 알맞은 값을 RTT(왕복 시간)의 몇 배로 잡으라는 권고는 출처마다 2.5배에서 8배 이상까지 다릅니다. PokeClip은 평시 RTT가 아니라 수 초짜리 지연 급등 때문에 이 값을 1초에서 3초로 올렸습니다([SRT latency 실험 글](/posts/projects/pokeclip-srt-latency-late-retransmission/)).

## 인터넷 송출은 손실을 다시 받되 기다리는 시간에 상한이 필요했습니다 {#1-srt의-출신--방송-업계가-인터넷을-길들인-방법}

SRT는 방송 장비 회사 Haivision이 만들어, 2017년 4월 NAB 쇼에서 Wowza와 SRT Alliance를 꾸리며 오픈소스로 공개했습니다([Haivision 보도자료](https://www.haivision.com/about/press-releases/haivision-wowza-form-srt-alliance-support-new-open-source-low-latency-video-streaming-initiative/)). 참조 구현 libsrt는 MPL 2.0입니다([Haivision/srt](https://github.com/Haivision/srt)). 프로토콜 문서는 IETF 인터넷 드래프트 draft-sharabayko-srt로 제출됐지만, 마지막 판(-01, 2021-09-07)은 정보용(Informational) 개인 드래프트로 남아 만료됐습니다([datatracker](https://datatracker.ietf.org/doc/draft-sharabayko-srt/)). SRT는 IETF 표준이 아니고, 사실상의 기준은 libsrt 구현과 그 문서입니다.

풀려던 문제는 라이브 영상의 시간 제약입니다. 영상 프레임은 정해진 시각에 재생돼야 하므로, 늦게 온 데이터는 아예 안 온 데이터와 다를 바 없습니다. TCP처럼 끝까지 기다리면 그동안 화면이 멈추고, 날 UDP처럼 포기하면 작은 손실에도 화면이 깨집니다. SRT는 그 사이에서 「정해 둔 시간까지는 기다려 되찾고, 그 뒤에는 포기한다」를 고릅니다.

## 잃은 패킷은 NAK로 다시 받고 latency가 지나면 건너뜁니다 {#2-udp인데-어떻게-신뢰성을-챙기나--arq}

SRT 데이터 패킷에는 순번과 보낸 시각이 붙습니다. 받는 쪽은 순번이 비면 잃은 순번 목록을 NAK 패킷에 담아 보낸 쪽에 알리고, 보낸 쪽은 버퍼에 남겨 둔 패킷을 다시 보냅니다. 다시 보낸 패킷에는 재전송 표시(R 플래그)가 붙습니다([draft-sharabayko-srt-01 3.1·3.2.5절](https://datatracker.ietf.org/doc/html/draft-sharabayko-srt-01#section-3.2.5)). 이처럼 잃은 것을 요청해 다시 받는 방식을 ARQ(Automatic Repeat reQuest)라고 합니다.

받는 쪽은 패킷이 도착하는 대로 내보내지 않습니다. TSBPD(Timestamp-Based Packet Delivery)는 패킷마다 「보낸 시각 + latency」가 될 때 응용에 넘겨, 끝에서 끝까지의 지연을 일정하게 유지합니다(드래프트 1.2절). 그 시각이 됐는데 앞 순번이 아직 비어 있으면, 라이브 모드 기본값으로 켜진 TLPKTDROP(Too-Late Packet Drop)이 빈자리를 건너뛰고 다음 패킷을 내보냅니다([SRTO_TLPKTDROP](https://github.com/Haivision/srt/blob/v1.5.3/docs/API/API-socket-options.md#SRTO_TLPKTDROP)).

영상의 두 줄은 같은 3번 패킷을 잃은 받는 쪽 버퍼입니다. 세로선이 3번 칸에 닿기 전에 재전송이 오는지 보십시오.

{{< motion scene="RetransmitWindow" id="fig-window" kind="개념도" caption="받는 쪽은 패킷을 「보낸 시각 + latency」에 내보냅니다. 잃은 3번의 재전송이 그 시각 전에 오면 자리를 메우고, 늦으면 TLPKTDROP이 3번을 건너뛰고 4번부터 내보내며 늦게 온 재전송은 버립니다. 칸 수와 도착 시점은 설명용 배치입니다." >}}

그래서 latency는 「영상이 늦게 나오는 정도」이면서 동시에 「잃은 패킷을 되찾을 수 있는 시간」입니다. 건너뛴 자리는 디코더에서 프레임이 빠지거나 깨진 화면이 됩니다. 손실 없이 늦게만 온 패킷은 사정이 다릅니다. libsrt 문서상 TLPKTDROP이 건너뛰는 것은 제때 오지 못한 「빠진」 패킷이고, PokeClip 실험에서도 순서가 맞는 늦은 패킷은 수신 구현이 버리지 않았습니다.

## latency는 RTT 배수 권고만으로 정할 수 없었습니다 {#3-latency-모드--srt의-핵심-트레이드오프}

`SRTO_LATENCY`는 받는 쪽 latency(`SRTO_RCVLATENCY`)와 상대에게 요구할 latency(`SRTO_PEERLATENCY`)를 함께 정합니다. 라이브 모드 기본값은 120ms이고, 연결 때 내 받는 쪽 값과 상대가 요구한 값 가운데 큰 값이 실제 latency가 됩니다([API 소켓 옵션](https://github.com/Haivision/srt/blob/v1.5.3/docs/API/API-socket-options.md#SRTO_RCVLATENCY), 드래프트 4.3.1.2절). 그래서 서버 설정을 바꾸지 않아도 송출 쪽이 큰 값을 보내면 그 값으로 정해집니다.

얼마로 잡을지는 권고마다 다릅니다.

| 출처 | 권고 | 조건 |
|---|---|---|
| [srt-live-transmit 문서](https://github.com/Haivision/srt/blob/v1.5.3/docs/apps/srt-live-transmit.md) | RTT의 3–4배 | LAN 밖 시험, 무선 · 이동망은 RTT가 크게 흔들림 |
| [Haivision 배포 가이드 「RTT Multiplier」](https://doc.haivision.com/SRT/1.5.3/Haivision/rtt-multiplier) | 손실률 1% 이하 3배, 3% 이하 4배, 7% 이하 6배, 10% 이하 8배 (40% 이하 30배까지) | 일정한 손실 모형, 몰려 오는 손실은 더 필요 |
| [OBS SRT 가이드](https://obsproject.com/kb/srt-protocol-streaming-guide) | RTT의 2.5배 이상 | 송출기와 받는 서버 사이 RTT |

세 권고 모두 평시 RTT를 기준으로 삼습니다. 평시 RTT가 수십 ms인 경로에서는 몇 배를 곱해도 수백 ms에 그칩니다. PokeClip의 시험 방송에서는 송출 쪽 Wi-Fi가 무너지며 RTT가 최대 10.1초까지 뛰었고, 그 사이 잃은 패킷의 재전송이 1초 창 안에 오지 못했습니다. 실험대에서는 손실이 낀 1.5초 급등을 막으려면 latency가 그 약 두 배인 3초는 돼야 했습니다. 배수 공식은 급등 크기를 보지 않으므로, 망이 가끔 크게 막히는 경로에서는 급등 크기와 평시 지연 증가를 함께 놓고 정해야 했습니다.

대가는 늘 드는 지연입니다. TSBPD 때문에 급등이 없어도 받는 쪽은 「보낸 시각 + latency」에 내보내므로, latency를 2초 올리면 평시 라이브 지연도 2초 늘어납니다.

## 연결은 유도와 결론 두 단계로 맺습니다 {#4-srt의-5단계-핸드셰이크}

caller·listener 연결의 핸드셰이크는 메시지 네 개로 끝납니다. 앞 두 개가 유도(INDUCTION), 뒤 두 개가 결론(CONCLUSION) 단계입니다([드래프트 4.3.1절](https://datatracker.ietf.org/doc/html/draft-sharabayko-srt-01#section-4.3.1)). [[fig-srt-handshake]]에서 쿠키가 어디서 생겨 어디로 돌아가는지 보면 됩니다.

```mermaid {#fig-srt-handshake kind="개념도" caption="SRT caller·listener 핸드셰이크. 유도 단계에서 listener는 자원을 잡지 않고 쿠키만 돌려주고, caller가 그 쿠키를 결론 단계에 실어 와야 연결이 생깁니다. 유도 요청은 버전 4, 응답은 버전 5를 적습니다. 결론 단계의 확장에는 latency와 streamid가 실리고, 암호화 키 교환(KM)은 암호화를 켰을 때만 붙습니다. 쿠키는 caller의 주소 · 포트 · 1분 단위 시각으로 만듭니다. draft-sharabayko-srt-01 4.3.1절을 줄여 다시 그렸습니다." source="https://datatracker.ietf.org/doc/html/draft-sharabayko-srt-01#section-4.3.1"}
%%{init: {"sequence": {"width": 96, "actorMargin": 16}}}%%
sequenceDiagram
  accTitle: SRT caller와 listener의 핸드셰이크
  accDescr: caller가 버전 4와 빈 쿠키로 유도 요청을 보내면 listener가 버전 5와 주소·포트·시각으로 만든 쿠키를 돌려준다. caller는 그 쿠키와 확장 정보(latency, streamid, 암호화 시 키 요청)를 결론 요청에 실어 보내고 listener가 결론 응답으로 답한 뒤 데이터 전송이 시작된다.
  participant C as caller
  participant L as listener
  C->>L: INDUCTION<br/>쿠키 0
  L->>C: INDUCTION<br/>쿠키
  C->>L: CONCLUSION<br/>쿠키 · 확장
  L->>C: CONCLUSION<br/>확장
  C->>L: 데이터
```

유도 단계의 쿠키는 caller의 주소, 포트, 1분 단위 시각으로 만듭니다. listener는 첫 요청에 자원을 잡지 않고, 쿠키를 되돌려 온 caller에게만 연결을 만들어 줍니다. 드래프트는 이것을 SYN 홍수 공격을 피하는 장치로 설명합니다. 결론 단계에서 latency는 협상이라기보다 양쪽이 낸 값 가운데 큰 값으로 정해지고, 암호화를 켰을 때만 키 자료(KM) 확장이 붙습니다(3.2.1.2절). passphrase를 주지 않으면 암호화 없이 연결됩니다([SRTO_PASSPHRASE](https://github.com/Haivision/srt/blob/v1.5.3/docs/API/API-socket-options.md#SRTO_PASSPHRASE)). passphrase는 10–79자이고 키 길이는 AES-128·192·256 가운데 고릅니다.

## caller·listener는 역할이고 rendezvous가 따로 있습니다 {#5-srt의-4가지-연결-모드}

드래프트가 정의하는 연결 방식은 둘입니다. 한쪽이 기다리고 다른 쪽이 거는 caller·listener, 양쪽이 동시에 거는 rendezvous입니다(4.3절). 주소의 `mode=caller|listener|rendezvous`는 이 가운데 내 역할을 고르는 값이고, OBS와 FFmpeg의 기본값은 caller입니다. 송출기가 서버에 거는 보통의 송출은 송출기 caller, 서버 listener입니다. OBS를 listener로 두고 VLC 같은 재생기가 거는 구성도 OBS 가이드에 나옵니다.

rendezvous는 WAVEAHAND, CONCLUSION, AGREEMENT 순으로 메시지를 주고받고, 쿠키 값을 견줘 큰 쪽이 시작하는 쪽이 됩니다(4.3.2절). 양쪽이 서로의 주소와 포트를 미리 알아야 합니다. streamid로 송출을 고르는 접근 제어는 caller·listener에서만 지원됩니다([접근 제어 문서](https://github.com/Haivision/srt/blob/v1.5.3/docs/features/access-control.md)).

## 여러 회선 묶기는 한 회선이 끊겨도 송출을 이어 갑니다 {#6-bonding--다중-회선-송출}

libsrt 1.5는 연결 여러 개를 하나로 묶는 소켓 그룹을 넣었습니다. 구현된 묶음 방식은 둘입니다([소켓 그룹 문서](https://github.com/Haivision/srt/blob/v1.5.3/docs/features/socket-groups.md)).

| 방식 | 동작 | 대가 |
|---|---|---|
| Broadcast | 같은 패킷을 모든 회선으로 동시에 보내고, 받는 쪽은 먼저 온 것을 쓰고 중복을 버림 | 회선 하나를 더할 때마다 전송량 100% 추가 |
| Main/Backup | 한 회선으로 보내다 끊기거나 나빠지면 대기 회선으로 빨리 바꿈 | 바꾸는 순간을 감지하는 판단이 필요 |

Broadcast는 대역을 합치지 않습니다. 쓸모 있는 데이터를 나르는 회선은 늘 하나이고, 나머지는 손실과 끊김에 대비한 사본입니다. 회선마다 다른 패킷을 실어 대역을 합치는 Balancing은 문서에 「개발 중」으로 남아 있습니다. 이 기능은 libsrt를 빌드할 때 `ENABLE_BONDING`을 켜야 들어가며 기본값은 꺼짐입니다([빌드 옵션](https://github.com/Haivision/srt/blob/v1.5.3/docs/build/build-options.md#enable_bonding)). 그래서 같은 SRT라도 송출기와 서버가 각자 어떤 빌드를 쓰는지에 따라 묶기를 쓸 수 있는지가 갈립니다.

## 멀티 오디오는 SRT가 아니라 그 안의 MPEG-TS가 나눕니다 {#7-srt-vs-rtmp-vs-whip--인제스트-프로토콜-비교}

SRT는 바이트를 나를 뿐 그 안이 영상인지 오디오인지 모릅니다. OBS의 SRT 출력은 FFmpeg의 MPEG-TS 묶개로 영상과 오디오를 묶어 보내고([obs-ffmpeg-mpegts.c 622행](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-ffmpeg/obs-ffmpeg-mpegts.c#L622)), 받는 쪽은 MPEG-TS 패킷의 PID로 트랙을 나눕니다. 오디오를 여러 트랙으로 보낼 수 있는 이유는 MPEG-TS에 있고, 그 구조는 [MPEG-TS PID 글](/posts/tech-blurting/rtmp-mpeg-ts-srt/)에 있습니다. PokeClip은 이 경로로 본방 오디오(audio1)와 소스별 소리 다섯(audio2–6)을 받아, 클립에서 배경음악만 뺄 재료로 씁니다([6트랙 입력 계약 글](/posts/0-to-1/pokeclip-six-track-input-contract/)).

| 항목 | RTMP | SRT | WHIP |
|---|---|---|---|
| 전송 | TCP | UDP + NAK 재전송 | UDP(ICE) + RTP |
| 늦은 데이터 | TCP가 끝까지 기다림 | latency가 지나면 건너뜀 | RTP 구현(지터 버퍼 · 재전송 요청)에 맡김 |
| 트랙을 나누는 곳 | 옛 사양에는 없음, Enhanced RTMP v2 멀티트랙 | 안에 담은 MPEG-TS의 PID | SDP의 미디어 줄(m=)별 RTP 흐름 |
| 암호화 | RTMPS를 쓸 때 TLS | passphrase를 줄 때 AES | DTLS-SRTP 필수 |
| 표준 | Adobe 사양 | libsrt · 만료된 드래프트 | RFC 9725 |

RTMP 쪽 사정은 [RTMP 글](/posts/tech-blurting/rtmp-still-alive/), WHIP은 [WHIP 글](/posts/tech-blurting/whip-whep-modern-ingest/)에 있습니다. 세 규약의 지연을 한 숫자로 견주지 않았습니다. SRT의 지연은 설정한 latency가 바닥을 정하고, 나머지는 인코더 · 망 · 받는 쪽 처리에 달렸기 때문입니다.

## OBS·FFmpeg 주소의 latency는 마이크로초 단위입니다 {#8-ffmpeg에서-srt-송출-실전}

OBS와 FFmpeg는 SRT 옵션을 주소의 쿼리 문자열로 받고, 여기서 `latency`는 마이크로초입니다([OBS SRT 가이드](https://obsproject.com/kb/srt-protocol-streaming-guide), [FFmpeg srt 프로토콜](https://ffmpeg.org/ffmpeg-protocols.html#srt)). libsrt API의 `SRTO_LATENCY`는 밀리초이므로, 같은 3초가 API에서는 3000, 주소에서는 3000000입니다. 아래는 FFmpeg로 MPEG-TS를 SRT에 실어 보내는 형식이고, 호스트와 키는 자리표시입니다.

```bash
# 형식 예시(실행 확인한 명령 아님). latency=3000000 → 3초
ffmpeg -re -i input.mp4 -c copy -f mpegts \
  "srt://ingest.example.com:8890?mode=caller&latency=3000000&streamid=publish:<경로>&passphrase=<10–79자>"
```

| 옵션 | 뜻 |
|---|---|
| `latency` | 받는 쪽 · 상대 latency를 함께 정함(마이크로초) |
| `mode` | caller(기본) · listener · rendezvous |
| `streamid` | 연결 전에 넘기는 문자열, 512자까지 |
| `passphrase` · `pbkeylen` | 암호화 비밀(10–79자)과 키 길이(16·24·32바이트) |

비밀은 주소에 넣으면 로그와 화면에 그대로 남을 수 있습니다. OBS 29.0부터는 SRT passphrase와 streamid를 주소 밖 설정 칸으로 넣을 수 있습니다([OBS 29.0 릴리스 노트](https://github.com/obsproject/obs-studio/releases/tag/29.0.0)). PokeClip 플러그인도 passphrase를 주소 밖으로 넘깁니다([본방 인코더 공유 글](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/)).

### streamid는 라우팅과 인증 정보를 담는 자유 문자열입니다 {#stream-id로-인증}

streamid는 caller가 연결 전에 정하는 최대 512자 문자열이고, listener는 연결을 받아들이기 전에 이 값을 읽어 수락 · 거절하거나 그 연결에 쓸 passphrase를 정할 수 있습니다. SRT 자체는 내용을 해석하지 않습니다. libsrt 문서는 `#!::r=리소스,m=publish,u=사용자` 같은 키=값 형식을 권하지만, 자유 형식도 허용합니다([접근 제어 문서](https://github.com/Haivision/srt/blob/v1.5.3/docs/features/access-control.md)).

| 키 | 뜻 |
|---|---|
| `r` | 리소스 이름(어느 스트림인가) |
| `m` | `request`(받기, 기본) · `publish`(보내기) · `bidirectional` |
| `u` | 사용자 이름(어느 비밀로 검사할지) |
| `s` | 미리 받은 한 번 쓰는 세션 id |
| `h` · `t` | 호스트 이름 · 연결 종류 |

서버마다 쓰는 형식이 다릅니다. MediaMTX는 표준 키 대신 `publish:<경로>`처럼 자기 형식을 기본으로 씁니다([MediaMTX SRT 문서](https://github.com/bluenviron/mediamtx/blob/main/docs/3-publish/02-srt.md), 2026-11-12 확인). PokeClip이 MediaMTX에 사용자별 passphrase를 제안하며 본 경계는 [MediaMTX 사용자별 SRT 암호 글](/posts/open-source-analysis/mediamtx-user-srt-passphrase-boundaries/)에 있습니다.

## SRT를 고를 때는 latency와 받는 쪽 빌드를 함께 봅니다

- **「latency는 RTT × 2.5면 된다」** — 권고는 출처마다 2.5배에서 8배 이상까지 다르고, 모두 평시 RTT 기준입니다. 송출 쪽 망이 가끔 크게 막힌다면 급등 크기를 재고, 평시 지연이 그만큼 늘어나는 것을 받아들일 수 있는지 함께 정하십시오.
- **「SRT는 기본으로 암호화된다」** — passphrase를 줄 때만 켜집니다. 주소에 비밀을 넣지 않는 송출기 설정을 쓰십시오.
- **「본딩하면 회선 대역이 합쳐진다」** — libsrt에서 구현된 Broadcast는 같은 데이터를 겹쳐 보내 끊김을 막는 방식입니다. 대역을 합치는 방식은 개발 중이고, 묶기 자체가 빌드 옵션입니다.
- **「SRT라서 멀티 오디오가 된다」** — 트랙은 그 안의 MPEG-TS가 나눕니다. 다른 컨테이너를 실으면 사정이 달라집니다.
- **「5단계 핸드셰이크」** — caller·listener 연결은 유도 · 결론 두 단계, 메시지 네 개입니다.

## 출처

- [Haivision/srt](https://github.com/Haivision/srt) — README, [v1.5.3 API 소켓 옵션](https://github.com/Haivision/srt/blob/v1.5.3/docs/API/API-socket-options.md)(SRTO_LATENCY · RCVLATENCY · TLPKTDROP · PASSPHRASE · STREAMID), [srt-live-transmit](https://github.com/Haivision/srt/blob/v1.5.3/docs/apps/srt-live-transmit.md), [소켓 그룹](https://github.com/Haivision/srt/blob/v1.5.3/docs/features/socket-groups.md), [접근 제어](https://github.com/Haivision/srt/blob/v1.5.3/docs/features/access-control.md), [빌드 옵션](https://github.com/Haivision/srt/blob/v1.5.3/docs/build/build-options.md)
- [draft-sharabayko-srt-01, 「The SRT Protocol」 (2021-09-07, 만료)](https://datatracker.ietf.org/doc/html/draft-sharabayko-srt-01) — 1.2절 TSBPD, 3.2.5절 NAK, 4.3절 연결 방식과 핸드셰이크
- [Haivision SRT 배포 가이드 「RTT Multiplier」](https://doc.haivision.com/SRT/1.5.3/Haivision/rtt-multiplier)
- [OBS 「SRT Protocol Streaming Guide」](https://obsproject.com/kb/srt-protocol-streaming-guide) — latency 단위 μs, RTT 2.5배 이상, MPEG-TS
- [FFmpeg Protocols — srt](https://ffmpeg.org/ffmpeg-protocols.html#srt)
- [obsproject/obs-studio 32.0.0 `obs-ffmpeg-mpegts.c`](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-ffmpeg/obs-ffmpeg-mpegts.c#L622)
- [OBS 29.0 릴리스 노트](https://github.com/obsproject/obs-studio/releases/tag/29.0.0) — SRT · RIST 암호화와 인증 설정
- [Haivision, 「Haivision and Wowza Form SRT Alliance」 (2017-04)](https://www.haivision.com/about/press-releases/haivision-wowza-form-srt-alliance-support-new-open-source-low-latency-video-streaming-initiative/)
- [bluenviron/mediamtx 「SRT clients」 문서](https://github.com/bluenviron/mediamtx/blob/main/docs/3-publish/02-srt.md) — `streamid=publish:<경로>`
- [SRT latency를 3초로 올린 이유는 늦은 재전송이었습니다](/posts/projects/pokeclip-srt-latency-late-retransmission/) — PokeClip 실험과 결정

다음 편: [WebRTC는 NAT 뒤 두 브라우저를 ICE 후보로 잇습니다](/posts/tech-blurting/webrtc-deep-dive/)
