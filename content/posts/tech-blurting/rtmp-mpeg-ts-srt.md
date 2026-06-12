---
title: "치지직은 왜 아직도 구식 RTMP를 쓸까"
date: 2026-06-13T00:28:23+09:00
categories: ["tech-blurting"]
draft: false
---

치지직 스트림에서 오디오를 분리해서 분석하는 파이프라인을 짜야 했다. 처음엔 HLS로 받으면 되는 거 아닌가 싶었는데, 알고 보니 완전히 다른 문제였다.

그러면서 RTMP, MPEG-TS, SRT를 처음 제대로 공부하게 됐다.

---

## 전체 구조

![PokeClip 시스템 아키텍처](/images/pokeclip-architecture.png)

OBS에서 스트림을 두 군데로 동시에 보낸다. 치지직으로는 RTMP로 보내서 시청자한테 뿌리고, 우리 서버로는 SRT+MPEG-TS로 따로 받아서 오디오 트랙을 분리한다.

처음에 "치지직 서버에서 가져오면 되지 않나?" 했는데, 치지직이 RTMP로 받는 순간 이미 단일 믹스 오디오라 분리가 불가능하다. 그래서 OBS에서 아예 따로 받는 구조로 갔다.

---

## RTMP

RTMP는 Adobe가 만든 스트리밍 ingest 프로토콜이다. Flash 죽을 때 같이 사라졌어야 했는데 아직도 살아있다.

**왜 치지직 같은 플랫폼이 구식인 걸 알면서도 쓰냐**고 하면, 생태계 관성 때문이다. OBS 켜고 서버 주소랑 스트림키 입력하면 끝 — 이 방식이 20년 동안 RTMP 기반으로 굳어져 있다. 치지직이 SRT나 WHIP으로 바꾸면 스트리머들이 전부 소프트웨어 설정을 다시 해야 하는데, 그 마찰 비용이 너무 크다.

네트워크 문제도 있다. RTMP는 TCP 1935 포트 하나라 방화벽 통과가 쉬운데, SRT는 UDP 기반이라 ISP나 회사 방화벽에서 막히는 경우가 생긴다. 스트리머들 민원이 쏟아지면 플랫폼 입장에서 골치 아프다.

그리고 사실 ingest 지연이 2-3초여도 큰 문제가 아니다. 어차피 내부에서 트랜스코딩하고 HLS로 패키징하면서 지연이 더 생기기 때문에 ingest 단계를 최적화해봤자 체감 차이가 거의 없다.

변화가 없는 건 아니다. 유튜브랑 트위치는 WHIP(WebRTC 기반 ingest 표준)을 테스트하고 있고, OBS도 최근 버전에서 WHIP을 지원하기 시작했다. 방향 자체는 RTMP에서 벗어나는 쪽인데 속도가 느린 거다. "더 좋은 기술이 있어도 생태계가 바뀌는 데 10년은 걸린다"는 얘기다.

근데 오디오 트랙을 1개밖에 못 담는다. 스트리머가 OBS에서 게임 소리, 마이크, 디스코드를 전부 섞어서 하나로 보내는 구조라, 받는 쪽에서 다시 나눌 방법이 없다.

---

## MPEG-TS

![MPEG-TS 패킷 구조](/images/mpeg-ts-packet.png)

1995년에 방송 전송용으로 만들어진 포맷이다. 위성방송이나 케이블TV 전부 이거 쓴다. HLS 공부할 때 봤던 `.ts` 파일이 이거다.

188바이트 고정 패킷 구조인데, 앞에 항상 `0x47`이 붙어있어서 스트림 중간에 패킷이 사라져도 다음 `0x47`부터 다시 읽으면 된다.

중요한 건 PID다. 하나의 스트림 안에 여러 트랙을 독립적으로 담을 수 있다.

```
├── PID 0x101 → 게임 소리
├── PID 0x102 → 마이크
├── PID 0x103 → 디스코드
└── PID 0x104 → 후원 알림음
```

fMP4나 RTP도 멀티 트랙은 되는데, MPEG-TS가 30년 방송 표준이라 FFmpeg에서 엣지케이스가 다 잡혀있다. 굳이 덜 검증된 걸 쓸 이유가 없어서 이걸 선택했다.

---

## SRT

![SRT ARQ 재전송 메커니즘](/images/srt-arq.png)

SRT는 MPEG-TS를 어떻게 전달할지의 문제다. UDP 기반인데 패킷이 사라지면 NACK 보내서 재전송한다. TCP랑 비슷한 개념인데 타임아웃이 짧아서 (기본 120ms) 라이브 스트리밍에 맞게 설계되어 있다.

![RTMP vs SRT 비교](/images/rtmp-vs-srt.png)

RTMP는 지연이 2-3초고 멀티 트랙이 안 된다. SRT는 0.5-1초 지연에 AES 암호화도 기본으로 들어간다. FFmpeg에서 네이티브로 지원해서 별도 작업 없이 바로 받을 수 있다.

```bash
ffmpeg -i "srt://0.0.0.0:8890?mode=listener" \
  -map 0:a:0 -c:a copy audio_game.aac \
  -map 0:a:1 -c:a copy audio_mic.aac \
  -map 0:a:2 -c:a copy audio_discord.aac
```

---

HLS만 알 때는 플랫폼 안이 어떻게 돌아가는지 몰랐는데, 직접 파이프라인 짜면서 각 프로토콜이 왜 그 자리에 있는지 보이기 시작했다. 다음 글에서 전체 아키텍처 얘기를 이어서 쓸 예정이다.

---

**참고**
- [RTMP 스펙](https://rtmp.veriskope.com/docs/spec/)
- [MPEG-2 Transport Stream (ISO 13818-1)](https://www.iso.org/standard/44169.html)
- [SRT Alliance](https://www.srtalliance.org/)
- [FFmpeg SRT 프로토콜](https://ffmpeg.org/ffmpeg-protocols.html#srt)
