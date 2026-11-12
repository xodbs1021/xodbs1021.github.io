---
title: "MPEG-TS는 PID로 여러 오디오 트랙을 한 흐름에 담습니다"
date: 2026-06-13T00:36:41+09:00
lastmod: "2026-11-12T15:32:05+09:00"
description: "영상 하나와 오디오 여러 개를 한 연결로 보내려면 받는 쪽이 패킷마다 어느 트랙인지 알아야 합니다. MPEG-TS는 188바이트 패킷 머리의 13비트 PID와 PAT·PMT 표로 이를 표시합니다. FFmpeg 9.0.2로 영상 1 + 오디오 6 트랙 TS를 만들어 PID 배정, 패킷 수, 여섯 번째 오디오 PID만 꺼낸 소리를 확인했고, SRT가 이 흐름을 나를 뿐 트랙을 모른다는 점과 PokeClip이 받는 6트랙 구조를 함께 정리했습니다."
categories: ["tech-blurting"]
tags: ["MPEG-TS", "PID", "SRT", "FFmpeg", "멀티 오디오", "PokeClip"]
draft: false
---

영상 하나와 오디오 여러 개를 한 연결로 보내면, 받는 쪽은 도착한 조각마다 어느 트랙 것인지 알아야 다시 나눌 수 있습니다. MPEG-TS(MPEG-2 Transport Stream)는 188바이트 패킷 머리의 13비트 PID(Packet Identifier)로 이것을 표시하고, PAT·PMT라는 표로 어느 PID가 어떤 트랙인지 알려 줍니다. FFmpeg 9.0.2로 영상 1개와 오디오 6개를 담은 TS를 만들자 영상은 PID `0x100`, 오디오는 `0x101–0x106`에 실렸습니다. 받는 쪽에서 `0x106`만 꺼내자 여섯 번째 트랙에 넣은 770Hz 사인파가 그대로 나왔습니다. PokeClip이 OBS에서 오디오 6트랙을 받는 SRT 송출도 이 MPEG-TS를 나릅니다. SRT는 패킷을 나를 뿐이고, 트랙을 나누는 일은 MPEG-TS가 맡습니다.

## 옛 RTMP에는 오디오 트랙을 구분할 칸이 없었습니다 {#rtmp}

옛 RTMP의 오디오 메시지 본문(FLV AUDIODATA)에는 코덱 · 표본률 · 표본 크기 · 채널 수만 있고 트랙 번호가 없습니다([FLV 사양 10.1 E.4.2.1절](https://veovera.github.io/enhanced-rtmp/docs/legacy/video-file-format-v10-1-spec.pdf)). 2025년 4월 정식판이 나온 Enhanced RTMP v2가 멀티트랙을 더했지만, 받는 서버가 지원해야 씁니다. 자세한 내용은 [RTMP 글](/posts/tech-blurting/rtmp-still-alive/)에 있습니다.

PokeClip은 OBS 믹서의 6트랙을 받습니다. `audio1`은 본방 오디오 인코더를 나눠 쓴 본방 믹스이고, `audio2`–`audio6`은 소스별 소리입니다. 목적은 클립에서 배경음악 같은 소리를 빼는 것입니다([6트랙 입력 계약 글](/posts/0-to-1/pokeclip-six-track-input-contract/)). 본방은 그대로 RTMP로 치지직에 나가고, PokeClip용 출력은 같은 영상 인코더를 나눠 쓰는 별도 SRT 출력입니다([본방 인코더 공유 글](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/)). OBS의 SRT 출력은 FFmpeg의 MPEG-TS 묶개로 영상과 오디오를 묶습니다([obs-ffmpeg-mpegts.c 622행](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-ffmpeg/obs-ffmpeg-mpegts.c#L622)).

## MPEG-TS는 188바이트 패킷 머리의 PID로 흐름을 나눕니다 {#mpeg-ts}

MPEG-TS는 ITU-T H.222.0 | ISO/IEC 13818-1이 정한 전송용 묶음 형식입니다. 방송처럼 중간부터 받기 시작하거나 일부를 잃을 수 있는 전송로를 위해, 모든 데이터를 188바이트 고정 길이 패킷으로 자릅니다([ITU-T H.222.0](https://www.itu.int/rec/T-REC-H.222.0)). 패킷마다 4바이트 머리가 붙습니다.

| 필드 | 비트 | 뜻 |
|---|---|---|
| sync_byte | 8 | 늘 `0x47`. 받는 쪽이 패킷 경계를 다시 찾는 표시 |
| transport_error_indicator | 1 | 전송 중 오류가 있음을 표시 |
| payload_unit_start_indicator | 1 | 이 패킷에서 새 PES 패킷이나 표가 시작됨 |
| transport_priority | 1 | 같은 PID 안의 우선순위 |
| PID | 13 | 이 패킷이 속한 흐름. `0x0000`은 PAT, `0x1FFF`는 빈 패킷 |
| transport_scrambling_control | 2 | 스크램블 여부 |
| adaptation_field_control | 2 | 적응 필드(PCR 등)와 데이터가 있는지 |
| continuity_counter | 4 | 같은 PID 안에서 페이로드가 있는 패킷마다 1씩 늘어 0–15를 돎 |

나머지 184바이트가 데이터입니다. 받는 쪽은 패킷 내용을 몰라도 머리의 PID만 보고 흐름을 가를 수 있습니다. continuity_counter는 PID별로 이어지므로(페이로드가 있는 패킷마다 1씩), 숫자가 건너뛰면 그 PID의 패킷이 빠졌다는 것을 압니다.

## PAT와 PMT가 어느 PID가 어떤 트랙인지 알려 줍니다

PID 번호 자체에는 「영상」·「오디오」라는 뜻이 없습니다. 받는 쪽은 PID 0에 실린 PAT(Program Association Table)에서 프로그램마다 PMT(Program Map Table)가 실린 PID를 찾고, PMT에서 트랙마다 종류(stream_type)와 PID를 읽습니다. [[fig-ts-tables]]는 이번에 만든 파일의 PAT·PMT를 직접 풀어 읽은 값입니다.

```mermaid {#fig-ts-tables kind="실측" caption="FFmpeg 9.0.2 기본값으로 만든 영상 1 + 오디오 6 TS의 표. PID 0의 PAT가 프로그램 1의 PMT 위치를 알리고, PMT가 H.264 영상(stream_type 1B)과 AAC 오디오(0F) 여섯의 PID를 알려 줍니다. 시각 기준(PCR)은 영상 PID에 실립니다. 파일의 PAT·PMT 바이트를 직접 풀어 읽었습니다." source="로컬 실측(2026-11-12), 아래 「측정 조건」"}
flowchart TB
  accTitle: PAT와 PMT로 트랙을 찾는 순서
  accDescr: PID 0x0의 PAT가 PMT의 PID 0x1000을 알려 주고, PMT가 영상 H.264를 PID 0x100에, AAC 오디오 여섯을 PID 0x101부터 0x106에 둔다고 알려 준다.
  PAT["PID 0x0 · PAT<br/>프로그램 1 → PMT 0x1000"] --> PMT["PID 0x1000 · PMT"]
  PMT --> V["0x100 영상<br/>H.264 (0x1B)"]
  PMT --> A["0x101–0x106<br/>오디오1–6<br/>AAC (0x0F)"]
  classDef hex font-family:monospace
  class PAT,PMT,V,A hex
```

FFmpeg의 MPEG-TS 묶개는 PMT를 `0x1000`부터, 트랙을 `0x100`부터 차례로 배정하는 것이 기본값입니다(`-mpegts_pmt_start_pid` 4096, `-mpegts_start_pid` 256). 같은 순서로 트랙을 넣으면 같은 PID가 나오지만, 다른 묶개는 다른 번호를 쓸 수 있습니다. 그래서 받는 쪽은 PID 번호를 외워 두지 말고 PMT를 읽어야 합니다.

## 트랙 데이터는 PES로 묶여 여러 TS 패킷에 나뉘어 실립니다

인코더가 만든 영상 프레임이나 오디오 프레임 묶음은 먼저 PES(Packetized Elementary Stream) 패킷이 됩니다. PES 머리에는 시작 부호(`0x000001`), 흐름 종류, 표시 시각(PTS)과 디코딩 시각(DTS)이 들어갑니다. PES 패킷 하나는 보통 184바이트보다 크므로 같은 PID의 TS 패킷 여러 개에 나뉘어 실리고, 첫 조각에 payload_unit_start_indicator가 켜집니다.

이렇게 트랙마다 잘린 패킷이 한 줄로 섞여 나갑니다. 영상에서 일곱 트랙의 패킷이 관 하나를 함께 지난 뒤 받는 쪽에서 PID별로 다시 갈라지는 모습을 보십시오.

{{< motion scene="PidDemux" id="fig-pid-demux" kind="개념도" caption="MPEG-TS는 영상과 오디오 여섯 트랙을 188바이트 패킷 한 줄에 섞어 보내고, 받는 쪽은 PMT로 PID와 트랙의 대응을 알아낸 뒤 패킷 머리의 PID만 보고 트랙별로 다시 나눕니다. PID 값은 실측 파일과 같고, 패킷 수와 순서는 설명용으로 줄였습니다." >}}

실측 파일(4초)에서는 TS 패킷 3,354개 가운데 영상(`0x100`)이 2,128개였고, 오디오 트랙은 각각 189–190개였습니다. PAT와 PMT는 각각 40번 되풀이돼 실렸습니다. 중간부터 받기 시작한 수신기도 표를 곧 만날 수 있게 하려는 것입니다. 나머지 8개는 서비스 정보 표(SDT, PID `0x11`)였습니다. 패킷은 한 트랙씩 번갈아 나오지 않았습니다. 영상 패킷이 수십 개 이어진 뒤 한 오디오 트랙의 패킷이 십여 개 몰려 나오는 식이었습니다. 묶개가 PES 단위로 내보내기 때문입니다.

## 받는 쪽은 PID만 보고 트랙을 다시 나눕니다

트랙을 나눠 받았는지는 소리 내용으로 확인했습니다. 트랙마다 다른 사인파(220, 330, 440, 550, 660, 770Hz)를 넣었고, FFmpeg로 첫 오디오(PID `0x101`)와 여섯 번째 오디오(PID `0x106`)만 각각 꺼내 1초 구간의 0 교차 수로 주파수를 셌습니다. 각각 220Hz와 770Hz였습니다.

```text
$ ffprobe -v error -show_entries program=program_id,pmt_pid:stream=index,id,codec_name -of compact six.ts
program|program_id=1|pmt_pid=4096|stream|index=0|codec_name=h264|id=0x100
stream|index=1|codec_name=aac|id=0x101
...
stream|index=6|codec_name=aac|id=0x106
(같은 stream 목록이 프로그램 밖에서 한 번 더 출력됨)
```

이 확인은 「여섯 번째로 넣은 트랙이 여섯 번째 PID로 나오는가」까지입니다. 실제 방송 경로에서 트랙 순서가 지켜지는지는 따로 봐야 합니다. PokeClip의 9월 재포장 실험에서는 MediaMTX 로그에 찍힌 트랙 순서가 연결마다 달랐지만, 녹화 파일 속 오디오 순서는 세 연결 모두 같았습니다([6트랙 입력 계약 글](/posts/0-to-1/pokeclip-six-track-input-contract/)). 개수 · 고르기 · 소리 내용을 단계별로 검증한 기록은 [멀티 오디오 검증 글](/posts/0-to-1/pokeclip-multiaudio-end-to-end-verification/)에 있습니다.

## SRT는 이 패킷 흐름을 나를 뿐 트랙을 모릅니다 {#srt}

SRT는 위 TS 패킷을 UDP 위에서 나르고, 잃은 것은 latency 안에서 다시 받습니다([SRT 글](/posts/tech-blurting/srt-broadcaster-protocol/)). libsrt 라이브 모드의 SRT 패킷 데이터 크기 기본값은 1,316바이트로, TS 패킷 7개입니다([SRTO_PAYLOADSIZE](https://github.com/Haivision/srt/blob/v1.5.3/docs/API/API-socket-options.md#SRTO_PAYLOADSIZE)). MediaMTX 문서의 송출 주소 예시도 `pkt_size=1316`을 씁니다([MediaMTX SRT 문서](https://github.com/bluenviron/mediamtx/blob/main/docs/3-publish/02-srt.md)). SRT는 그 안이 어느 PID인지 모르므로, 트랙별 우선순위나 트랙별 재전송은 없습니다.

손실의 영향은 TS 층에서 드러납니다. SRT가 latency 안에 되찾지 못한 패킷을 건너뛰면, 그 안에 있던 TS 패킷들이 빠지고 해당 PID의 continuity_counter가 건너뜁니다. 영상 패킷이 빠지면 디코더는 프레임 일부를 잃습니다. PokeClip이 녹화기 오류를 좇아 이 지점까지 간 기록은 [SRT latency 실험 글](/posts/projects/pokeclip-srt-latency-late-retransmission/)에 있습니다. 수신과 LL-HLS 묶기는 MediaMTX가 맡고, 되감기 경로는 Go 계층이 받은 그대로 재포장합니다([MediaMTX 채택 글](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/)).

## 여러 트랙을 보낼 때는 PID 번호보다 PMT와 파일 속 순서를 믿어야 합니다

- **「여러 오디오 트랙은 MPEG-TS만 된다」** — fMP4(CMAF)도 트랙을 여럿 담고, Enhanced RTMP v2와 WebRTC(SDP 미디어 줄)도 여러 트랙을 나릅니다. MPEG-TS의 장점은 중간부터 받거나 일부를 잃어도 패킷 경계와 표를 곧 다시 찾는다는 데 있습니다.
- **「PID 번호가 곧 트랙 번호다」** — PID는 묶개가 배정합니다. 받는 쪽 계약은 PMT에 적힌 순서나 종류로 정하고, 파일에서 그 순서가 지켜지는지 시험하십시오.
- **「SRT가 멀티 오디오를 지원한다」** — SRT는 바이트를 나를 뿐입니다. 트랙은 그 안의 MPEG-TS가 나눕니다.
- **「TS는 군더더기가 없다」** — 188바이트마다 머리 4바이트, PES 머리, 되풀이되는 PAT · PMT가 붙습니다. 저비트레이트 오디오 트랙이 많을수록 그 비중이 커집니다.

## 측정 조건

- 2026-11-12, macOS(Apple Silicon) 로컬, FFmpeg 9.0.2(Homebrew). 작성자 요청으로 AI(Claude Code)가 실행했습니다.
- 입력: `testsrc2` 30fps 영상 + `sine` 220·330·440·550·660·770Hz(48kHz) 6개, 길이 4초. 인코딩 libx264 veryfast(GOP 60, 비트레이트를 정하지 않아 x264 기본 CRF 23) · AAC 64kbps, 출력 `-f mpegts`(PID 관련 옵션은 기본값). 실행한 명령은 아래와 같습니다.

```bash
ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i testsrc2=size=640x360:rate=30 \
  -f lavfi -i sine=frequency=220:sample_rate=48000 \
  -f lavfi -i sine=frequency=330:sample_rate=48000 \
  -f lavfi -i sine=frequency=440:sample_rate=48000 \
  -f lavfi -i sine=frequency=550:sample_rate=48000 \
  -f lavfi -i sine=frequency=660:sample_rate=48000 \
  -f lavfi -i sine=frequency=770:sample_rate=48000 \
  -t 4 -map 0:v -map 1:a -map 2:a -map 3:a -map 4:a -map 5:a -map 6:a \
  -c:v libx264 -preset veryfast -g 60 -c:a aac -b:a 64k -f mpegts six.ts
```

- PID별 패킷 수는 파일을 188바이트씩 잘라 머리의 PID를 센 값(동기 바이트 오류 0), PAT · PMT 값은 해당 패킷의 표를 직접 풀어 읽은 값입니다.
- 주파수는 `ffmpeg -map 0:1`·`-map 0:6`으로 꺼내 모노 16비트로 풀고, 1–2초 구간의 0 교차 수의 절반으로 셌습니다. 실행 1회입니다.

## 출처

- [ITU-T H.222.0 (ISO/IEC 13818-1) 「Generic coding of moving pictures and associated audio information: Systems」](https://www.itu.int/rec/T-REC-H.222.0) — TS 패킷 머리, PAT · PMT, PES
- [FFmpeg Formats — mpegts](https://ffmpeg.org/ffmpeg-formats.html#mpegts-1) — `mpegts_start_pid` · `mpegts_pmt_start_pid` 기본값(로컬 `ffmpeg -h muxer=mpegts`로도 확인)
- [obsproject/obs-studio 32.0.0 `obs-ffmpeg-mpegts.c`](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-ffmpeg/obs-ffmpeg-mpegts.c#L622) — OBS SRT 출력의 MPEG-TS 묶기
- [Adobe Flash Video File Format Specification 10.1, Veovera 보관 사본](https://veovera.github.io/enhanced-rtmp/docs/legacy/video-file-format-v10-1-spec.pdf)
- [Haivision/srt v1.5.3 API 소켓 옵션 — SRTO_PAYLOADSIZE](https://github.com/Haivision/srt/blob/v1.5.3/docs/API/API-socket-options.md#SRTO_PAYLOADSIZE)
- [bluenviron/mediamtx 「SRT clients」 문서](https://github.com/bluenviron/mediamtx/blob/main/docs/3-publish/02-srt.md) (2026-11-12 확인)
- PokeClip 기록: [6트랙 입력 계약](/posts/0-to-1/pokeclip-six-track-input-contract/) · [본방 인코더 공유와 SRT](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/) · [MediaMTX 채택](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/) · [멀티 오디오 검증](/posts/0-to-1/pokeclip-multiaudio-end-to-end-verification/) · [SRT latency 실험](/posts/projects/pokeclip-srt-latency-late-retransmission/)
