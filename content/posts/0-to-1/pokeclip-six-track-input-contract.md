---
title: "소스 약 10개 대신 OBS 6트랙에 순서만 고정했습니다"
date: 2026-10-15T11:27:08+09:00
lastmod: "2026-11-11T18:16:30+09:00"
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "OBS", "Audio"]
description: "클립에서 배경음악만 빼려고 OBS 소스 약 10개를 믹서 밖에서 직접 받던 원안을, 7월 23일 OBS 믹서의 6트랙(본방 믹스 1 + 소스별 5)으로 줄이고 9월 3일 서버 이름을 audio1–audio6 순서로 고정한 결정. 첫 칸이 본방이라는 약속을 플러그인이 지키는 방식, 8월 3일 6트랙 시험에서 녹화·목록·추출까지 6개가 남은 것, 여섯 칸을 넘는 소리와 사용자 체크라는 대가."
draft: false
portfolio_cases: [5]
portfolio_pages: [26, 27]
portfolio_edition: "2026-10-15-v2"
---

PokeClip은 방송 중 지난 장면을 클립으로 만들 때 배경음악처럼 원하지 않는 소리를 빼 줍니다. 그러려면 소리를 소스별로 나눠 받아야 했고, 처음 설계는 OBS 플러그인이 믹서를 거치지 않고 소스 약 10개의 소리를 직접 받아 트랙 약 10개로 보내는 것이었습니다. 그러면 플러그인이 소스가 생기고 사라지는 것을 따라가고, 소리가 없는 동안 무음을 채우는 오디오 엔진이 돼야 했습니다. 7월 23일 OBS 믹서가 원래 가진 6트랙을 그대로 쓰기로 바꿨습니다. 트랙 1은 시청자가 듣는 본방 믹스, 트랙 2–6은 소스별 소리입니다. 9월 3일에는 서버가 받는 이름을 `audio1`–`audio6` 순서로 고정하고 소스 이름(라벨)을 함께 보내는 계약을 버렸습니다. 8월 3일 6트랙 시험 두 번에서 6트랙은 녹화 파일과 재생 목록에 6개 그대로 남았고, 여섯 번째 트랙만 뽑아낼 수 있었습니다. 대가는 여섯 칸을 넘는 소리를 한 칸에 묶어야 한다는 것과, 방송자의 OBS 트랙 체크를 플러그인이 바꿔야 한다는 것이었습니다.

6트랙 상한(7월 23일)과 이름 고정·라벨 폐기(9월 3일)는 제가 정했습니다. 8월 3일 시험은 제 작업 세션에서 AI(Claude Code·Codex)가 돌렸습니다. 본방 인코더를 공유하는 송출([PR #179](https://github.com/3K-PokeClip/PokeClip-mono/pull/179))과 오디오 6트랙([PR #195](https://github.com/3K-PokeClip/PokeClip-mono/pull/195))의 구현·OBS 측정은 팀원이 9–10월에 했습니다.

## 편집에 필요한 것은 소스 수가 아니라 음악을 뺄 재료였습니다 {#최대-소스-수보다-편집에-남길-재료가-중요했습니다}

처음 설계가 트랙을 소스 수만큼 늘리려 한 것은 OBS 믹서에 상한이 있기 때문입니다. OBS는 오디오 믹스를 6개까지만 만듭니다([libobs `audio-io.h` 28행 `MAX_AUDIO_MIXES 6`](https://github.com/obsproject/obs-studio/blob/32.0.0/libobs/media-io/audio-io.h#L28)). 이 상한을 넘으려면 소스마다 소리 콜백을 직접 걸어 받아야 합니다. 그 순간 플러그인이 소스의 생성·종료를 따라가고, 소리가 끊긴 소스에 무음을 채워 트랙 번호가 흔들리지 않게 지켜야 합니다. 음악 하나를 빼려던 기능이 오디오 엔진을 하나 더 유지하는 일로 커졌습니다.

그래서 질문을 「소스를 몇 개까지 받는가」에서 「편집할 때 어떤 조합이 필요한가」로 바꿨습니다. 게임 소리, 마이크, 디스코드, 배경음악, 그 밖의 소리를 나눠 두면 「배경음악만 뺀 클립」을 만들 수 있었습니다. 여기에 시청자가 들은 본방 믹스를 한 칸 더하면 6칸입니다. [OBS 다중 오디오 트랙 가이드](https://obsproject.com/kb/multiple-audio-track-recording-guide)도 재생용 믹스와 후편집용 분리 트랙을 함께 두는 구성을 예시로 보여 줍니다.

영상에서 소스 10개가 각자 트랙을 요구하던 원안이 OBS 믹서 6칸(믹스 1 + 소스별 5)으로 모이는 모습을 보십시오.

{{< motion scene="SixTrackFunnel" id="fig-six-track-funnel" kind="개념도" caption="소스마다 트랙 하나를 주려면 OBS 믹서 상한(6)을 넘어 소스 소리를 직접 받아야 했습니다. 7월 23일 OBS 믹서 6칸에 모으기로 바꿨고, 트랙 1 자리는 모든 소스가 섞인 본방 믹스(audio1, 본방 오디오 인코더를 공유), 트랙 2–6은 소스별 소리(audio2–audio6)입니다. 소스 이름과 개수는 설명용입니다." >}}

| 선택지 | 직접 지켜야 할 것 | 판단 |
|---|---|---|
| 소스 약 10개를 믹서 밖에서 직접 받기 | 소스 수명 추적, 무음 채우기, 트랙 번호 고정 | 편집 요구에 비해 범위가 커서 기각 |
| OBS 믹서 6트랙 그대로 쓰기 | 소스를 트랙에 나눠 앉히기, 송출 계약 | 필요한 조합을 담을 수 있어 채택 |
| 본방 믹스만 저장 | 없음 | 음악만 뺄 재료가 사라져 기각 |

고정 6트랙은 모든 소스를 따로 편집하는 자유를 포기한 선택입니다. 대신 소리를 받는 엔진을 새로 만들지 않고, OBS가 이미 섞고 있는 믹서 위에서 편집 재료를 남길 수 있었습니다. 줄어든 개발 시간을 잰 것은 아닙니다. 줄어든 것은 플러그인이 직접 책임질 기능의 목록입니다.

## 트랙 이름 대신 audio1–audio6 순서를 고정했습니다 {#트랙-이름을-늘리는-대신-순서를-고정했습니다}

9월 3일 서버 쪽 이름을 순서로 고정했습니다. 첫 칸 `audio1`은 본방 믹스, OBS 트랙 2–6이 `audio2`–`audio6`(소스별)입니다. 그 전 설계에는 「마이크」, 「디스코드」 같은 소스 이름을 트랙 목록(`trackManifest`)으로 서버에 보내는 계약과 그 API가 있었습니다. 방송자는 방송 중에도 소스를 켜고 끄고 바꿉니다. 이름을 보내면 바뀔 때마다 서버의 메타데이터와 실제 파일 속 트랙을 다시 맞춰야 하고, 어긋난 이름은 틀린 정보가 됩니다. 그래서 이름은 보내지 않고, 몇 번째 소리인지만 계약으로 남겼습니다.

순서를 계약으로 삼을 수 있는지는 파일로 확인했습니다. 9월 19일 재포장 실험(ffmpeg가 트랙마다 다른 사인파를 실어 송출)에서 MediaMTX 로그에 찍힌 트랙 순서는 송출 연결마다 달랐습니다. 녹화 파일 속 오디오 순서는 세 연결 모두 같았고, 첫 오디오는 세 번 다 220Hz였습니다. 기준은 로그가 아니라 파일 속 순서여야 했습니다([Go 재포장 글](/posts/0-to-1/pokeclip-go-remux-same-io-benchmark/)).

[[fig-six-track-consumers]]는 두 이름을 누가 쓰는지 보여 줍니다. 굵은 선이 `audio1`의 경로입니다.

```mermaid {#fig-six-track-consumers kind="개념도" caption="OBS 트랙 1–6은 서버의 audio1–audio6이 됩니다. audio1은 본방 오디오 인코더를 공유합니다(고급 출력에서 본방 트랙을 바꿔도 같음). 되감기 재포장은 첫 영상과 첫 소리(audio1)만 남기고, 편집기의 미리듣기와 클립 렌더는 6개를 모두 씁니다. PokeClip-mono develop 825a3dfe의 obs-plugin/README.md와 media/README.md 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/README.md?plain=1#L199-L206"}
flowchart TB
  accTitle: OBS 트랙 1–6과 서버 audio1–6을 쓰는 곳
  accDescr: 본방 오디오 인코더(보통 OBS 트랙 1)의 소리가 서버의 audio1이 되고, 트랙 2–6은 소스별 소리로 audio2–audio6이 된다. 되감기 재포장은 audio1만 남기고, 편집기와 클립 렌더는 6개를 모두 쓴다.
  T1["본방 오디오 인코더<br/>(보통 OBS 트랙 1)"] ==> A1["audio1"]
  T2["OBS 트랙 2–6<br/>소스별 소리"] --> A2["audio2–audio6"]
  A1 ==> R["되감기 재포장<br/>첫 영상 · 첫 소리만"]
  A1 ==> E["편집기 · 클립 렌더<br/>트랙 6개 모두"]
  A2 --> E
  style A1 fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

시청 경로는 `audio1` 하나면 되므로 되감기용 조각에는 첫 영상과 첫 소리만 남깁니다([`media/README.md` 1358–1362행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1358-L1362)). 편집 원본에는 6개를 모두 남기고, 편집기는 이를 트랙 번호 0–5로 부릅니다([`obs-plugin/README.md` 201행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/README.md?plain=1#L201)). 그래서 첫 칸에 무엇이 들어가는지가 이 계약에서 가장 중요한 한 줄이 됐습니다.

## 첫 오디오가 본방이라는 약속은 플러그인이 지켜야 했습니다

순서를 고정해도 첫 칸이 본방이라는 보장은 이름에서 나오지 않습니다. OBS 고급 출력에서는 방송자가 본방에 쓸 오디오 트랙을 1–6 가운데에서 고를 수 있습니다. 본방을 트랙 2로 보내는 방송자에게 OBS 트랙 1은 녹화용으로 따로 짠 믹스일 수 있고, 그대로 `audio1`로 보내면 시청자가 들은 소리와 다릅니다.

그래서 플러그인은 `audio1`을 OBS 트랙 1이 아니라 본방 오디오 인코더에서 가져옵니다. 본방이 어느 트랙을 쓰든 그 인코더를 그대로 공유하고, 본방 코덱이 AAC가 아니면 같은 믹서로 AAC 인코더를 하나 더 만듭니다. 인코더 6개를 출력에 붙인 뒤에는 붙은 순서를 다시 읽어, 하나라도 어긋나면 송출을 시작하지 않습니다([`stream-target.cpp` 478–535행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/stream-target.cpp#L478-L535)). 이 규칙이 생긴 과정과 본방 트랙 2 시험은 [오디오 자동 배정 글](/posts/0-to-1/pokeclip-audio-assignment-user-state/)에 있습니다.

## 6트랙이 파일까지 남는지는 8월 3일 시험에서 확인했습니다 {#obs-설정의-6트랙이-파일에서도-6트랙인지-확인했습니다}

8월 3일 6트랙 시험 두 번(ffmpeg · OBS)에서 6트랙은 녹화 파일과 HLS 재생 목록에 6개 그대로 남았고, 여섯 번째 트랙만 뽑아낼 수 있었습니다. OBS 32.2.0으로 보낸 시험은 소리 소스가 없는 장면이었는데도 6트랙이 모두 무음으로 실렸고, ffmpeg로 보낸 시험은 트랙마다 다른 사인파(440–2640Hz)를 실었지만 트랙 개수만 셌습니다. 시험마다 무엇을 증명했는지와 팀원이 뒤에 테스트 톤으로 소리 내용까지 본 시험은 [멀티오디오 검증 글](/posts/0-to-1/pokeclip-multiaudio-end-to-end-verification/)에 나눠 적었습니다.

## 고정 6트랙의 대가는 일곱 번째 소리와 사용자 체크였습니다

여섯 칸 가운데 하나는 본방 믹스이므로 소스에 줄 칸은 다섯입니다. 일곱 번째 소리, 곧 여섯 번째 소스부터는 따로 앉을 자리가 없습니다. 9월 말 PR #195의 첫 판은 우선순위가 낮은 소스를 본방 믹스에만 남기고 경고를 띄웠습니다. 11월 11일 코드는 비슷한 소스를 한 트랙에 묶습니다. 마이크 둘은 마이크 트랙에, 같은 게임의 소리는 같은 트랙에 앉고, 방송자는 플러그인 화면에서 소스를 다른 트랙으로 옮길 수 있습니다([`obs-plugin/README.md` 221행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/README.md?plain=1#L221) · [237행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/README.md?plain=1#L237)). 묶인 소리는 편집에서 함께 켜지고 함께 꺼집니다.

두 번째 대가는 방송자의 설정입니다. 소스를 트랙에 나눠 앉힌다는 것은 OBS의 트랙 체크를 바꾼다는 뜻이고, 그 체크는 방송과 녹화가 함께 씁니다. 트랙 수를 줄인 만큼 플러그인이 대신 정하는 기본값이 많아졌습니다. 그래서 자동 배정은 기본으로 꺼 두고(10월 1일), 끄면 원래 체크로 되돌리게(9월 30일) 했습니다.

입력 설계의 질문은 「소스를 몇 개까지 받는가」에서 「나중에 바꿀 소리 조합을 잃지 않는가」로 바뀌었습니다. 소리를 나눠 받는 계약을 정한다면 트랙 수보다 첫 칸의 의미와 칸이 모자랄 때의 규칙을 먼저 정하십시오. 이름은 바뀌지만, 순서와 그 규칙은 파일로 확인할 수 있습니다.

## 측정 조건

- 8월 3일: 로컬 Docker Compose, MediaMTX 1.19.3. ffmpeg 시험은 linuxserver/ffmpeg 컨테이너가 사인파를 실어 SRT로 송출했고, OBS 시험은 macOS OBS 32.2.0의 사용자 지정 출력(FFmpeg)으로 소리 소스가 없는 장면을 송출했습니다. 세부 조건과 결과는 [멀티오디오 검증 글](/posts/0-to-1/pokeclip-multiaudio-end-to-end-verification/#측정-조건)에 있습니다.
- 9월 19일: 임시 MediaMTX(프로젝트 포크 v1.20.1-pokeclip.2)에 컨테이너 ffmpeg로 영상 1개와 소리 6트랙(트랙마다 220–1320Hz 사인파)을 송출하고, 두 번 끊었다 다시 붙인 10분 녹화입니다.
- 두 시험 모두 AI가 수행했고 원자료는 비공개입니다. 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일) 기준입니다.

## 출처

- [libobs `media-io/audio-io.h`](https://github.com/obsproject/obs-studio/blob/32.0.0/libobs/media-io/audio-io.h#L28) — `MAX_AUDIO_MIXES 6`
- [OBS Knowledge Base: Multiple Audio Track Recording Guide](https://obsproject.com/kb/multiple-audio-track-recording-guide)
- [3K-PokeClip/PokeClip-mono PR #179](https://github.com/3K-PokeClip/PokeClip-mono/pull/179) — 본방 인코더를 공유하는 SRT 송출(2026-10-01 develop 머지)
- [3K-PokeClip/PokeClip-mono PR #195](https://github.com/3K-PokeClip/PokeClip-mono/pull/195) — 오디오 6트랙과 자동 배정(2026-10-01 #179 브랜치에 머지)
- [PokeClip-mono `obs-plugin/README.md` 「오디오 트랙」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/README.md?plain=1#L199-L240) · [`stream-target.cpp`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/stream-target.cpp#L478-L535) · [`media/README.md` 「되감기 렌디션」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1358-L1362)
- [오디오 6트랙은 개수와 고르기와 소리 내용을 따로 검증했습니다](/posts/0-to-1/pokeclip-multiaudio-end-to-end-verification/) · [오디오 자동 배정은 끌 때 원래 OBS 체크로 돌아가야 했습니다](/posts/0-to-1/pokeclip-audio-assignment-user-state/)
- 팀 내부 결정·실험 기록(비공개) — 7월 23일 6트랙 결정, 9월 3일 트랙 이름 고정, 8월 3일 멀티오디오 시험, 9월 19일 재포장 실험

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 26쪽](/portfolio/2026-10-15-v2/full.pdf#page=26)
