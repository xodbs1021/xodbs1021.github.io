---
title: "HLS만 알던 내가 RTMP, MPEG-TS, SRT를 배운 이유"
date: 2026-06-13T00:13:50+09:00
categories: ["tech-blurting"]
draft: false
---

HLS 공부하고 나서 스트리밍 기술은 어느 정도 알겠다 싶었는데, 직접 시스템 만들다 보니까 처음 보는 이름들이 계속 튀어나왔다. RTMP, MPEG-TS, SRT.

치지직 스트림에서 오디오를 분리해서 분석하는 파이프라인을 짜야 했는데, 처음엔 "HLS로 받으면 되지 않나?" 싶었다. 근데 그게 아니었다. 이 글은 왜 이 세 가지가 필요했는지 이해하게 된 과정을 정리한 거다.

---

## 전체 구조부터 보면

![PokeClip 시스템 아키텍처](/images/pokeclip-architecture.png)

OBS에서 스트림을 두 군데로 동시에 내보낸다.

- **치지직 방향**: RTMP로 보내서 시청자한테 HLS로 뿌리는 일반적인 방송 흐름
- **PokeClip 방향**: SRT+MPEG-TS로 직접 우리 서버에 보내서 오디오 트랙 분리 후 분석

치지직은 RTMP로 받으니까 이미 단일 믹스 오디오다. 거기서 분석용 데이터를 가져오는 게 아니라, OBS에서 아예 따로 받는 구조다.

---

## RTMP — 왜 아직도 이걸 쓰나

RTMP는 Adobe가 만든 ingest 프로토콜이다. Flash 죽을 때 같이 없어졌어야 했는데 2026년인 지금도 살아있다.

이유는 단순하다. OBS, Streamlabs, XSplit — 방송 소프트웨어란 소프트웨어는 전부 RTMP를 지원한다. 치지직, 트위치, 유튜브 전부 RTMP로 받는다. 생태계가 여기 맞춰져 있으니 플랫폼 입장에서도 굳이 바꿀 이유가 없다.

근데 RTMP에 구조적 한계가 있다. **오디오 트랙을 1개밖에 못 담는다.** 스트리머가 OBS에서 게임 소리, 마이크, 디스코드를 전부 믹스해서 하나로 합친 다음 보내는 구조라, 받는 시점엔 이미 합쳐진 상태다. 분리가 불가능하다.

그래서 분석용 스트림은 따로 받아야 했고, 거기서 MPEG-TS가 나온다.

---

## MPEG-TS — 멀티 오디오 트랙이 가능한 이유

![MPEG-TS 패킷 구조](/images/mpeg-ts-packet.png)

[MPEG-TS](https://www.iso.org/standard/44169.html)는 1995년에 방송 전송용으로 만들어진 포맷이다. 위성방송, 케이블TV, 디지털방송 전부 이걸 쓴다. HLS 공부할 때 봤던 `.ts` 파일이 바로 이거다.

핵심은 **188바이트 고정 패킷**과 **PID** 구조다.

패킷 앞에 항상 `0x47`이 붙어있어서, 스트림 중간 어디서든 이걸 찾으면 패킷 경계를 알 수 있다. 패킷 몇 개가 사라져도 다음 `0x47`부터 다시 읽으면 복구된다. 위성 신호처럼 노이즈 심한 환경을 위해 이렇게 설계한 거다.

그리고 PID(Packet Identifier)로 하나의 스트림 안에 여러 트랙을 독립적으로 담을 수 있다.

```
MPEG-TS 스트림 안에
├── PID 0x100 → Video (H.264)
├── PID 0x101 → Audio: 게임 소리
├── PID 0x102 → Audio: 마이크
├── PID 0x103 → Audio: 디스코드
└── PID 0x104 → Audio: 후원 알림음
```

FFmpeg로 받으면 PID 기준으로 트랙을 뽑아서 각각 분석 파이프라인에 넣을 수 있다.

```bash
ffmpeg -i "srt://0.0.0.0:8890?mode=listener" \
  -map 0:a:0 -c:a copy audio_game.aac \    # 게임 소리
  -map 0:a:1 -c:a copy audio_mic.aac \     # 마이크
  -map 0:a:2 -c:a copy audio_discord.aac   # 디스코드
```

fMP4나 RTP도 멀티 트랙을 지원하긴 한다. 근데 MPEG-TS가 방송 업계 표준으로 30년을 버텨온 이유가 있다. FFmpeg에서 엣지케이스가 다 잡혀있고, 모든 방송 장비가 MPEG-TS를 뱉는다. 굳이 덜 검증된 대안을 쓸 이유가 없다.

---

## SRT — MPEG-TS를 어떻게 안정적으로 보내나

![SRT ARQ 재전송 메커니즘](/images/srt-arq.png)

SRT는 MPEG-TS를 담는 그릇이 아니라, 그걸 **어떻게 전달할지**의 문제다. UDP 기반인데 신뢰성이 있다. ARQ(Automatic Repeat reQuest)를 얹었기 때문이다.

패킷이 사라지면 수신 측이 NACK을 보내고, 송신 측이 버퍼에서 꺼내서 재전송한다. TCP의 재전송이랑 비슷한 개념인데, 라이브 스트리밍에 맞게 타임아웃이 짧다 (기본 120ms). 늦게 오는 것보다 버리는 게 낫기 때문이다.

![RTMP vs SRT 비교](/images/rtmp-vs-srt.png)

RTMP는 TCP 기반이라 재전송 자체는 있지만, 지연이 2~3초고 멀티 트랙이 안 된다. SRT는 UDP+ARQ로 지연을 0.5~1초로 줄이면서 안정성도 확보했다. [SRT Alliance](https://www.srtalliance.org/)에서 오픈소스로 공개해서 FFmpeg도 네이티브로 지원한다.

---

## 정리

HLS만 알 때는 "시청자한테 어떻게 잘 전달하나"만 보였는데, 이걸 공부하고 나니까 플랫폼 안에서 어떻게 돌아가는지가 보이기 시작했다.

치지직이 RTMP로 받아서 HLS로 뿌리는 구조, OBS가 동시에 여러 목적지로 스트림을 내보낼 수 있다는 것, MPEG-TS의 PID 구조가 왜 방송에서 표준인지. 각 선택마다 이유가 있었다.

---

**참고**
- [RTMP 스펙](https://rtmp.veriskope.com/docs/spec/)
- [MPEG-2 Transport Stream (ISO 13818-1)](https://www.iso.org/standard/44169.html)
- [SRT Alliance](https://www.srtalliance.org/)
- [FFmpeg SRT 프로토콜](https://ffmpeg.org/ffmpeg-protocols.html#srt)
