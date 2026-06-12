---
title: "HLS만 알던 내가 RTMP, MPEG-TS, SRT를 배운 이유"
date: 2026-06-12T18:45:48+09:00
categories: ["tech-blurting"]
draft: false
---

HLS를 공부하고 나서 스트리밍 기술을 어느 정도 안다고 생각했다. 그런데 직접 시스템을 구축하다 보니 전혀 모르는 이름들이 튀어나왔다. RTMP, MPEG-TS, SRT.

치지직 스트림을 서버에서 수신해서 오디오 트랙을 분리하는 파이프라인을 만들어야 했다. 처음엔 "HLS로 받으면 되지 않나?" 싶었는데, 그게 아니었다. 이 글은 그 과정에서 왜 이 프로토콜들을 써야 하는지 이해하게 된 이야기다.

---

## 문제의 시작 — 오디오 트랙을 분리해야 했다

라이브 방송에는 여러 소리가 섞여 있다. 게임 소리, 마이크, 디스코드, 후원 알림음. 이걸 각각 따로 분석하고 싶었다.

처음에 RTMP로 받으면 어떨까 생각했다. 치지직이 RTMP로 스트림을 받으니까 그냥 그걸 그대로 가져오면 되지 않을까 했는데, RTMP는 오디오 트랙을 **1개만** 지원한다. 스트리머가 OBS에서 여러 소리를 섞어서 하나로 만든 다음 보내는 구조라, 받는 시점엔 이미 합쳐진 상태다. 분리할 방법이 없다.

그래서 MPEG-TS를 알게 됐다.

---

## RTMP — 치지직이 ingest에 쓰는 이유

[RTMP(Real-Time Messaging Protocol)](https://rtmp.veriskope.com/docs/spec/)는 Adobe가 만든 라이브 스트리밍 ingest 표준이다. 2012년에 Flash와 함께 사실상 죽었어야 했는데 아직도 살아있다.

이유는 단순하다. **생태계가 너무 크다.** OBS, Streamlabs, XSplit — 모든 방송 소프트웨어가 RTMP를 지원한다. 치지직, 트위치, 유튜브 라이브 전부 RTMP로 스트림을 받는다.

```
스트리머 OBS
  └─ RTMP push ──→ rtmp://rtmp.chzzk.naver.com/live
                        │
                   내부에서 트랜스코딩
                        │
              시청자 ←── HLS pull ──── CDN
```

HLS는 **시청자 방향**(서버 → 시청자)이고, RTMP는 **ingest 방향**(스트리머 → 서버)이다. 완전히 다른 역할이다.

RTMP의 한계는 명확하다. 오디오 트랙 1개. 분석 파이프라인에서 멀티 트랙이 필요하다면 다른 방법을 써야 한다.

---

## MPEG-TS — 30년 방송 표준이 아직 살아있는 이유

[MPEG-TS(MPEG-2 Transport Stream)](https://www.iso.org/standard/44169.html)는 1995년에 만들어진 방송 전송 포맷이다. 위성방송, 케이블TV, 디지털방송(DVB) 전부 이걸로 돌아간다.

HLS 공부할 때 `.ts` 파일을 봤다면 그게 MPEG-TS 세그먼트다. 파일로 잘린 형태와 끝없이 흐르는 스트림 형태 두 가지로 쓰인다.

### 핵심 구조: 188바이트 고정 패킷

```
[ 1byte  ][ 3byte ][ 1byte ][ 184byte ]
 0x47      PID     flags    payload
  ↑
sync byte — 항상 이 값. 패킷 경계 찾을 때 쓴다
```

패킷 하나가 손실돼도 다음 `0x47`을 찾으면 바로 복구할 수 있다. 위성 신호처럼 노이즈가 심한 환경을 위해 이렇게 설계했다.

### PID로 멀티 트랙 관리

여기가 핵심이다. PID(Packet Identifier)를 보면 이 패킷이 어느 트랙인지 알 수 있다.

```
MPEG-TS 스트림 안에
├── PID 0x100: Video (H.264)
├── PID 0x101: Audio — 게임 소리
├── PID 0x102: Audio — 마이크
├── PID 0x103: Audio — 디스코드
└── PID 0x104: Audio — 후원 알림음
```

FFmpeg로 받으면 PID 기준으로 트랙을 분리해서 각각 처리할 수 있다.

```bash
# MPEG-TS 스트림의 트랙 구성 확인
ffprobe -i srt://localhost:8890 2>&1 | grep Stream
# Stream #0:0: Video: h264
# Stream #0:1: Audio: aac (게임)
# Stream #0:2: Audio: aac (마이크)
# Stream #0:3: Audio: aac (디스코드)
```

RTMP로는 이 구조가 불가능하다. 처음부터 멀티 트랙이 설계에 없다.

### 왜 대안이 없나

fMP4(LL-HLS에서 쓰는 포맷), RTP 같은 대안도 있다. 기술적으로 멀티 트랙을 지원한다. 그런데 MPEG-TS가 "바이블"로 불리는 이유는 **FFmpeg 생태계** 때문이다. 30년치 엣지케이스가 다 잡혀 있고, 모든 방송 장비가 MPEG-TS를 뱉는다. 굳이 덜 검증된 대안을 쓸 이유가 없다.

---

## SRT — MPEG-TS를 전송하는 현대적인 방법

[SRT(Secure Reliable Transport)](https://www.haivision.com/products/srt-secure-reliable-transport/)는 Haivision이 만들고 오픈소스로 공개한 전송 프로토콜이다. UDP 기반이지만 신뢰성을 보장한다.

SRT는 컨테이너 포맷이 아니다. MPEG-TS를 **어떻게 전달할지**의 문제다.

### UDP인데 왜 신뢰성이 있나

ARQ(Automatic Repeat reQuest)를 얹었다.

```
송신: 패킷 전송 + 버퍼 보관
수신: 빠진 패킷 발견 → NACK 전송 → "42번 패킷 다시 줘"
송신: 버퍼에서 꺼내서 재전송
```

TCP와 비슷하지만 라이브 스트리밍에 맞게 타임아웃이 짧다(기본 120ms). 늦게 오는 것보다 버리는 게 낫기 때문이다.

### RTMP vs SRT 비교

| | RTMP | SRT |
|---|---|---|
| 기반 | TCP | UDP + ARQ |
| 지연 | ~2-3초 | ~0.5-1초 |
| 멀티 오디오 트랙 | ❌ | ✅ (MPEG-TS 컨테이너로) |
| 네트워크 적응 | 없음 | 대역폭 자동 조절 |
| 암호화 | 없음 | AES 기본 내장 |
| FFmpeg 지원 | ✅ | ✅ 네이티브 |
| 생태계 | 압도적 | 빠르게 성장 중 |

참고: [SRT Alliance 공식 문서](https://www.srtalliance.org/)

### FFmpeg에서 SRT 받기

```bash
# SRT listener 모드로 스트림 수신
ffmpeg -i "srt://0.0.0.0:8890?mode=listener" \
  -map 0:v -c:v copy video.ts \          # 비디오 트랙
  -map 0:a:0 -c:a copy audio_game.ts \   # 게임 소리
  -map 0:a:1 -c:a copy audio_mic.ts \    # 마이크
  -map 0:a:2 -c:a copy audio_discord.ts  # 디스코드
```

---

## 세 프로토콜의 역할 분리

```
스트리머 OBS
    │
  [RTMP]  ← 스트리머 → 플랫폼. 생태계 때문에 아직 표준
    │
치지직 서버 (내부 처리)
    │
  [SRT + MPEG-TS]  ← 서버 간 전송. 낮은 지연 + 멀티 트랙
    │
  수신 서버
    │
  FFmpeg demux (PID 기준 트랙 분리)
    ├── Video
    ├── Audio 1 (게임)
    ├── Audio 2 (마이크)
    └── Audio 3 (디스코드)
```

각 프로토콜이 다른 문제를 해결한다.
- **RTMP**: 스트리머 → 플랫폼 ingest. 생태계가 이미 여기 있다.
- **MPEG-TS**: 멀티 트랙을 담는 그릇. 30년 표준.
- **SRT**: 그 그릇을 안정적으로 전달하는 현대적 방법.

---

## 배우고 나서

HLS를 공부할 때는 "시청자에게 어떻게 잘 전달하나"의 관점이었다. RTMP/MPEG-TS/SRT를 배우고 나니 "플랫폼이 스트림을 어떻게 받고 처리하는가"의 관점이 생겼다.

치지직 같은 플랫폼이 스트리머로부터 RTMP로 받아서 내부적으로 MPEG-TS로 처리하고 시청자에게 HLS로 뿌리는 구조가 이제 눈에 들어온다. 각 단계마다 그 프로토콜을 쓰는 이유가 있다.

---

**참고 자료**
- [RTMP 스펙 문서](https://rtmp.veriskope.com/docs/spec/)
- [MPEG-2 Transport Stream (ISO 13818-1)](https://www.iso.org/standard/44169.html)
- [SRT Alliance 공식 사이트](https://www.srtalliance.org/)
- [FFmpeg SRT 문서](https://ffmpeg.org/ffmpeg-protocols.html#srt)
