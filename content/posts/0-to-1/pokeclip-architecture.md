---
title: "치지직 하이라이트 자동 추출 파이프라인 설계기 - PokeClip"
date: 2026-06-13T00:52:51+09:00
lastmod: "2026-11-15T03:31:45+09:00"
categories: ["0-to-1"]
draft: false
---

> 2026년 6월 설계 초기(v3) 기록입니다. 그 뒤 하이라이트 탐지 구조는 [v3에서 v4로 바뀌었고](/posts/0-to-1/pokeclip-v3-to-v4-cascade/), 채팅 수집은 [Spring으로 옮겼습니다](/posts/0-to-1/pokeclip-language-ownership-boundaries/). 지금의 미디어 구조는 [미디어 시각을 정본으로 삼은 글](/posts/projects/pokeclip-media-timeline-over-wall-clock/)에서 다룹니다.

라이브 방송에서 하이라이트 클립을 자동으로 뽑아내는 시스템을 만들었다. 치지직 스트림을 실시간으로 받아서 재밌는 순간을 감지하고, 클립으로 저장하는 파이프라인이다.

이 글은 그 아키텍처를 어떻게 설계했는지, 왜 이런 선택을 했는지 기록한 거다.

---

## 전체 구조

```mermaid {#fig-overview kind="개념도" caption="2026년 6월 v3 설계 당시 구상한 전체 흐름입니다. 방송용 RTMP와 분석용 SRT를 OBS에서 따로 보내고, 분석 쪽은 트랙을 나눠 엔진 5개에 넣은 뒤 점수 통합 · LLM 태깅 · 클립 저장으로 이어집니다. 지금 구조가 아닌 옛 설계를 그린 그림입니다."}
flowchart TB
  accTitle: v3 설계의 전체 흐름
  accDescr: OBS가 RTMP로 치지직에 방송을 보내고, SRT와 MPEG-TS로 EC2에 분석용 스트림을 보낸다. EC2의 FFmpeg가 영상과 오디오 4트랙을 나눠 분석 엔진 5개에 넘기고, 치지직 방송의 채팅도 엔진에 들어간다. 엔진 신호는 Hybrid Voting으로 합쳐지고, LLM이 구간을 태깅한 뒤 클립 구간을 확정해 저장한다.
  obs[OBS] -->|RTMP| chz[치지직 방송]
  obs -->|SRT + MPEG-TS| ff[EC2 FFmpeg<br/>트랙 분리]
  ff -->|영상 · 오디오 4트랙| eng[분석 엔진 5개 병렬]
  chz -->|채팅| eng
  eng --> score[점수 통합<br/>Hybrid Voting]
  score --> llm[LLM 구간 태깅]
  llm --> clip[클립 구간 확정 · 저장]
```

크게 보면 세 단계다.

1. **스트림 수신** — OBS에서 두 갈래로 보내기
2. **분석** — 영상/오디오를 여러 엔진으로 병렬 분석
3. **하이라이트 추출** — 점수 계산 → 구간 태깅 → 클립 저장

---

## 스트림 수신 — 왜 OBS에서 두 갈래로 보내는가

```mermaid {#fig-obs-dual kind="개념도" caption="v3 설계의 OBS 출력 두 갈래입니다. 치지직으로 가는 RTMP는 소리가 하나로 섞이고, EC2로 가는 SRT + MPEG-TS는 오디오 트랙을 나눈 채 도착합니다. 옛 설계를 그린 그림입니다."}
flowchart TB
  accTitle: OBS에서 두 갈래로 보내는 출력
  accDescr: OBS가 RTMP로 치지직에 방송용 스트림을 보내는데 이쪽은 소리가 하나로 믹스된다. 같은 OBS가 SRT와 MPEG-TS로 EC2에 분석용 스트림을 보내고, 이쪽은 오디오 트랙이 분리된 채 FFmpeg 역다중화로 이어진다.
  obs[OBS] -->|RTMP| chz[치지직<br/>방송용, 소리 하나로 믹스]
  obs -->|SRT + MPEG-TS| ec2[EC2<br/>분석용, 오디오 트랙 분리]
  ec2 --> ff[FFmpeg 역다중화<br/>영상 + 오디오 4트랙]
```

처음 문제는 오디오였다.

하이라이트를 잘 잡으려면 게임 소리만으로는 부족하다. 스트리머 마이크 반응, 디스코드로 들어오는 팀원 소리, 후원 알림음까지 각각 따로 분석해야 한다. 근데 치지직으로 가는 RTMP 스트림은 이 소리들이 전부 하나로 믹스된 상태라, 거기서 가져오면 분리가 불가능하다.

그래서 OBS에서 직접 두 군데로 보내는 구조를 택했다.

- **RTMP → 치지직**: 방송용. 시청자한테 뿌리는 일반 스트림
- **SRT+MPEG-TS → EC2**: 분석용. 오디오 트랙이 분리된 상태로 수신

처음엔 [obs-multi-rtmp](https://github.com/sorayuki/obs-multi-rtmp) 오픈소스 플러그인을 포크해서 한쪽은 RTMP, 한쪽은 SRT로 보내도록 수정하려 했다. 근데 OBS가 이미 네이티브로 멀티 출력을 지원한다는 걸 알게 됐다. 플러그인 수정 없이 OBS 설정에서 바로 SRT 출력 추가가 가능했다. 외부 의존 없이 더 안정적이라 그 방향으로 바꿨다.

SRT+MPEG-TS를 선택한 이유는 멀티 오디오 트랙 때문이다. MPEG-TS는 PID 구조로 하나의 스트림에 여러 트랙을 독립적으로 담을 수 있고, SRT는 그걸 안정적으로 전송한다. MPEG-TS가 PID로 오디오 트랙을 나누는 구조는 [이 글](/posts/tech-blurting/rtmp-mpeg-ts-srt/)에 따로 정리했다.

---

## FFmpeg 역다중화

EC2에서 SRT 스트림을 받으면 FFmpeg로 트랙을 분리한다.

```bash
ffmpeg -i "srt://0.0.0.0:8890?mode=listener" \
  -map 0:v -c:v copy video.ts \
  -map 0:a:0 -c:a copy audio_game.aac \
  -map 0:a:1 -c:a copy audio_mic.aac \
  -map 0:a:2 -c:a copy audio_discord.aac \
  -map 0:a:3 -c:a copy audio_donation.aac
```

분리된 트랙은 각 분석 엔진으로 라우팅된다.

---

## 분석 엔진 — 5개 병렬 실행

```mermaid {#fig-engines kind="개념도" caption="v3 설계의 분석 엔진 5개와 입력입니다. 트랙 번호는 위 FFmpeg 명령의 -map 순서(a:0 게임, a:1 마이크, a:2 디스코드)를 따랐고, 채팅은 오디오 트랙이 아닙니다. 후원 트랙(a:3)은 분리되지만 아래 표에 대응하는 엔진이 없어 그리지 않았습니다. 옛 설계를 그린 그림입니다."}
flowchart LR
  accTitle: 분석 엔진 5개와 입력
  accDescr: 영상은 YOLO Video Analysis, 마이크 트랙 a:1은 Microphone Whisper STT, 게임 트랙 a:0은 Game Sound Recognition, 디스코드 트랙 a:2는 Discord Sound, 채팅은 Chat Analysis에 들어간다. 다섯 엔진의 신호가 모두 Score Integration으로 모인다.
  yolo[YOLO Video Analysis<br/>입력: 영상] --> score[Score Integration<br/>Hybrid Voting]
  stt[Microphone Whisper STT<br/>입력: 마이크 a:1] --> score
  game[Game Sound Recognition<br/>입력: 게임 a:0] --> score
  disc[Discord Sound<br/>입력: 디스코드 a:2] --> score
  chat[Chat Analysis<br/>입력: 채팅] --> score
```

분석 엔진은 5개가 동시에 돌아간다.

| 엔진 | 입력 | 역할 |
|------|------|------|
| YOLO Video Analysis | 영상 | 화면에서 킬, 아이템 획득 등 이벤트 감지 |
| Microphone Whisper STT | 마이크 오디오 | 스트리머 반응 텍스트화 |
| Game Sound Recognition | 게임 오디오 | 특정 효과음 감지 (킬음, 레벨업 등) |
| Discord Sound | 디스코드 오디오 | 팀원 반응 감지 |
| Chat Analysis | 채팅 | 채팅창 반응 분석 |

병렬로 돌리는 이유는 각 엔진이 서로 다른 신호를 감지하기 때문이다. 영상만 보면 놓치는 걸 오디오가 잡고, 오디오가 놓치는 걸 채팅이 잡는다.

---

## 점수 통합 — Hybrid Voting

5개 엔진이 각자 "이 구간이 하이라이트다"라는 신호를 내보내면, Score Integration 단계에서 합친다.

단순 평균이 아니라 Hybrid Voting 방식으로 처리한다. 여러 엔진이 동시에 같은 구간을 하이라이트로 판단할수록 가중치가 높아진다. 마이크 하나만 반응하는 구간보다, 마이크 + 채팅 + 게임 사운드가 동시에 튀는 구간이 실제로 재밌는 장면일 가능성이 높기 때문이다.

---

## 구간 태깅 — LLM Summary

높은 점수를 받은 구간은 LLM으로 태깅한다.

Whisper로 변환된 텍스트, 게임 이벤트 로그, 채팅 내용을 LLM에 넣으면 "에이스 킬 후 팀원 환호"처럼 구간 설명이 붙는다. 나중에 클립 검색할 때 쓸 메타데이터다.

---

## 하이라이트 추출 및 저장

```mermaid {#fig-output kind="개념도" caption="v3 설계에서 확정한 클립 구간이 가는 네 곳입니다. 메타데이터는 DynamoDB, 클립 파일은 S3에 두고, 웹 대시보드와 EDL 내보내기로 씁니다. 옛 설계를 그린 그림입니다."}
flowchart LR
  accTitle: 클립 저장과 활용
  accDescr: 점수와 태그로 확정한 클립 구간에서 영상을 잘라, 메타데이터는 DynamoDB에, 클립 파일은 S3에 저장한다. 웹 대시보드에서 클립 목록을 보고, EDL로 편집 소프트웨어에 가져간다.
  cut[점수 + 태그로<br/>클립 구간 확정 · 자르기] --> ddb[DynamoDB<br/>타임스탬프 · 점수 · 태그]
  cut --> s3[S3<br/>클립 파일]
  cut --> web[Web Dashboard<br/>클립 목록]
  cut --> edl[EDL Export<br/>편집 리스트]
```

점수 + 태그 기반으로 클립 구간을 확정하고, 실제 영상을 잘라서 저장한다.

- **DynamoDB**: 클립 메타데이터 (타임스탬프, 점수, 태그)
- **S3**: 실제 클립 파일
- **Web Dashboard**: 클립 목록 확인
- **EDL Export**: 영상 편집 소프트웨어로 바로 가져갈 수 있는 편집 리스트

---

## 만들면서 배운 것

처음엔 모든 분석을 하나의 파이프라인으로 순차적으로 처리하려 했는데, 영상 분석이 느려서 전체가 막혔다. 각 엔진을 독립 프로세스로 분리하고 메시지 큐로 연결하니까 해결됐다.

SRT+MPEG-TS 선택도 처음부터 알고 간 게 아니었다. RTMP 한계 → obs-multi-rtmp 포크 시도 → OBS 네이티브 발견 순서로 왔다. 막히면 다른 방법 찾는 게 빠를 때가 많다.
