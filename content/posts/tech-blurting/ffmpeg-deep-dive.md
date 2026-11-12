---
title: "FFmpeg 옵션은 놓인 자리에 따라 걸리는 단계가 다릅니다"
date: 2026-06-21T04:18:25+09:00
lastmod: "2026-11-13T03:16:18+09:00"
description: "ffmpeg 명령의 옵션은 바로 뒤의 입력이나 출력 하나에만 걸리고, 같은 출력에 같은 옵션을 거듭 주면 마지막 값만 남습니다. HLS 출력 하나에 -b:v를 세 번 주면 세 화질이 모두 600kbps 목표로 인코딩됐고, 스트림 지정자로 나누자 3,118 · 1,581 · 650kbps가 나왔습니다. 인코딩할 때는 -i 앞의 -ss도 프레임 단위로 정확했고 키프레임에 묶인 것은 스트림 복사였습니다. 다섯 단계 파이프라인, 필터와 재인코딩, -map 기본 선택, -re, 재포장, split, -progress speed를 FFmpeg 9.0.2 문서 · 소스와 로컬 실측으로 확인했습니다."
categories: ["tech-blurting"]
tags: ["FFmpeg", "libavformat", "스트림 복사", "filter_complex", "라이브 트랜스코딩"]
draft: false
---

ffmpeg 명령 한 줄에는 입력과 출력이 여러 개 들어가고, 옵션은 바로 뒤에 오는 입력이나 출력 하나에만 걸립니다. 그래서 같은 옵션도 놓인 자리에 따라 디먹서에 걸리기도 하고 인코더에 걸리기도 합니다. 자리를 헷갈리면 오류 없이 다른 결과가 나옵니다. HLS 출력 하나에 세 화질을 담으며 `-b:v 3000k -b:v 1500k -b:v 600k`를 주자 세 인코더가 모두 600kbps 목표로 돌아 720p · 540p · 360p가 699 · 657 · 650kbps로 나왔습니다. 스트림 지정자로 `-b:v:0 3000k -b:v:1 1500k -b:v:2 600k`라고 나누자 3,118 · 1,581 · 650kbps가 됐습니다. `-ss`는 인코딩할 때 `-i` 앞에 두어도 프레임 단위로 정확했고, 키프레임에 묶인 것은 `-c copy`로 스트림을 복사할 때였습니다. 실측은 모두 AI(Claude Code)가 FFmpeg 9.0.2로 실행했습니다(아래 「측정 조건」).

## ffmpeg 명령 뒤에는 libav* 라이브러리가 있습니다 {#1-ffmpeg는-사실-하나의-도구가-아니다}

FFmpeg는 명령줄 도구 하나가 아니라 라이브러리 묶음입니다. 컨테이너를 풀고 담는 libavformat, 코덱을 맡는 libavcodec, 필터를 맡는 libavfilter, 해상도 · 화소 형식을 바꾸는 libswscale, 오디오 표본을 바꾸는 libswresample이 있고, `ffmpeg` · `ffprobe` · `ffplay`는 이 라이브러리를 부르는 명령줄 도구입니다([FFmpeg 문서 목록](https://ffmpeg.org/documentation.html)).

다른 프로그램도 이 라이브러리를 필요한 부분만 가져다 씁니다. 예를 들어 OBS 32.0.0의 SRT · RIST 출력은 libavformat의 `mpegts` 먹서로 MPEG-TS를 만듭니다([`obs-ffmpeg-mpegts.c` 622–632행](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-ffmpeg/obs-ffmpeg-mpegts.c#L622-L632)). 영상 압축은 OBS에서 고른 인코더(x264나 하드웨어 인코더)가 따로 맡습니다. 「OBS가 FFmpeg로 인코딩한다」고 뭉뚱그리면 어느 단계를 누가 맡는지 놓칩니다.

## 명령 하나는 다섯 단계를 지나고 -c copy는 가운데를 건너뜁니다 {#2-ffmpeg-파이프라인--5단계}

입력 하나가 출력 하나가 되기까지 패킷과 프레임은 디먹서 → 디코더 → 필터 → 인코더 → 먹서를 지납니다. 디먹서는 컨테이너에서 압축된 패킷을 꺼내고, 디코더는 패킷을 원본 프레임(YUV · PCM)으로 풀고, 필터는 그 프레임을 가공하고, 인코더는 다시 압축하고, 먹서는 패킷을 새 컨테이너에 담습니다. `-c copy`(스트림 복사)를 주면 그 스트림은 디코더 · 필터 · 인코더를 건너뛰고 패킷 그대로 먹서로 갑니다([ffmpeg 문서 「Streamcopy」](https://ffmpeg.org/ffmpeg.html#Streamcopy)).

굵은 선이 인코딩 경로이고 점선이 스트림 복사 경로입니다.

```mermaid {#fig-ffmpeg-stages kind="개념도" caption="ffmpeg 한 스트림의 다섯 단계. 인코딩하면 디먹서에서 먹서까지 다섯 단계를 모두 지나고, -c copy로 스트림을 복사하면 디코더 · 필터 · 인코더를 건너뛰어 압축된 패킷이 그대로 먹서로 갑니다. ffmpeg 문서의 「Detailed description」 절을 줄여 그렸습니다." source="https://ffmpeg.org/ffmpeg.html#Detailed-description"}
flowchart TB
  accTitle: ffmpeg 다섯 단계와 스트림 복사 경로
  accDescr: 입력이 디먹서, 디코더, 필터, 인코더, 먹서를 차례로 지나 출력이 된다. 스트림 복사는 디먹서에서 먹서로 바로 건너뛴다.
  IN["입력 파일 · 스트림"] --> DM["디먹서<br/>압축 패킷 꺼내기"]
  DM ==> DEC["디코더<br/>원본 프레임으로"]
  DEC ==> F["필터<br/>-vf · -filter_complex"]
  F ==> ENC["인코더<br/>-c:v libx264"]
  ENC ==> MX["먹서<br/>-f hls · -f mpegts"]
  DM -. "-c copy" .-> MX
  MX --> OUT["출력"]
```

스트림 복사는 CPU를 거의 쓰지 않지만, 바꿀 수 있는 것도 컨테이너와 타임스탬프 정도입니다. 해상도 · 비트레이트 · 키프레임 간격처럼 압축된 내용에 묶인 값은 입력을 그대로 따라갑니다.

### 필터를 건 스트림은 반드시 다시 인코딩됩니다 {#filter는-무조건-재인코딩-동반}

필터는 원본 프레임에만 걸립니다. 그래서 필터를 건 스트림은 디코딩하고 다시 인코딩해야 하며, 같은 스트림에 `-vf`와 `-c copy`를 함께 주면 FFmpeg 9.0.2는 출력을 열지 않고 끝냅니다.

```text
Filtergraph 'scale=640:360' was specified, but codec copy was selected. Filtering and streamcopy cannot be used together.
```

해상도를 줄이는 `scale`, 글자를 얹는 `drawtext`처럼 화면을 바꾸는 일은 모두 재인코딩 비용을 냅니다. 영상은 그대로 두고 소리만 바꾸려면 `-c:v copy -c:a aac`처럼 스트림마다 따로 정합니다. 소리 인코딩과 라우드니스는 [AAC 글](/posts/tech-blurting/aac-and-friends/)에서 다룹니다.

## 인코딩할 때는 -i 앞의 -ss도 프레임 단위로 정확합니다 {#3-옵션-위치가-의미를-바꾼다--ffmpeg-최대-함정}

`-ss`를 `-i` 앞에 두면 입력 옵션이 되어 디먹서가 그 위치 앞의 탐색 지점(보통 키프레임)으로 건너뜁니다. `-i` 뒤에 두면 출력 옵션이 되어 처음부터 디코딩하며 그 시각 전의 프레임을 버립니다. 흔히 「앞에 두면 빠르지만 키프레임 단위로 부정확하다」고 하지만, 이 말은 스트림 복사에만 맞습니다. ffmpeg 문서는 인코딩할 때 `-accurate_seek`(기본 켬)가 탐색 지점과 지정 위치 사이를 디코딩해 버린다고 적고, 스트림 복사이거나 `-noaccurate_seek`일 때만 그 구간이 남는다고 적습니다([ffmpeg 문서 「Main options」 `-ss`](https://ffmpeg.org/ffmpeg.html#Main-options)). FFmpeg 9.0.2 소스에서도 기본값은 1입니다([`ffmpeg_opt.c` 146행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/fftools/ffmpeg_opt.c#L146)).

키프레임이 0 · 2 · 4초마다 있는 10초 파일에서 3.3초부터 2초를 잘라, 첫 프레임이 원본의 몇 번째 프레임인지 대조했습니다. 인코딩 결과는 픽셀 대조를 위해 무손실(`-qp 0`)로 만들었습니다.

| 명령 | 출력 프레임 | 첫 프레임 |
|---|---|---|
| `ffmpeg -ss 3.3 -i src.mp4 -t 2 -c:v libx264 -qp 0 a.mkv` | 60 | 3.300초(원본 99번) |
| `ffmpeg -i src.mp4 -ss 3.3 -t 2 -c:v libx264 -qp 0 b.mkv` | 60 | 3.300초(원본 99번) |
| `ffmpeg -ss 3.3 -i src.mp4 -t 2 -c copy c.ts` | 99 | 2.000초(앞 키프레임) |
| `ffmpeg -i src.mp4 -ss 3.3 -t 2 -c copy d.ts` | 39 | 4.000초(다음 키프레임) |

인코딩하면 두 자리 모두 3.3초에서 정확히 시작했습니다. 스트림 복사는 `-i` 앞이면 앞 키프레임(2초)부터 가져와 1.3초가 더 붙었고, `-i` 뒤면 다음 키프레임(4초)까지 버려 0.7초가 빠졌습니다. 같은 `-ss 3.3 -i … -c copy`라도 MP4로 쓰면 2초부터의 패킷이 들어가되 앞 1.3초에 버림 표시(편집 목록)가 붙어, FFmpeg 디코더는 3.3초 프레임부터 보여 줬습니다. 편집 목록을 무시하는 재생기라면 앞 1.3초가 보일 수 있습니다.

## 출력 하나에 같은 옵션을 거듭 주면 마지막 값만 남습니다

ffmpeg 문서는 옵션이 다음에 오는 파일 하나에 걸리며, 같은 옵션을 여러 번 쓰면 각각 다음 입력이나 출력에 걸린다고 적습니다([ffmpeg 문서 「Description」](https://ffmpeg.org/ffmpeg.html#Description)). 이 규칙에서 함정이 두 가지 나옵니다.

첫째, 출력이 하나인데 같은 옵션을 여러 번 쓰면 앞의 값이 덮입니다. HLS 출력 하나에 세 화질을 담으며 `-b:v`를 세 번 줬을 때 경고는 한 줄도 없었고, 세 x264 인코더의 설정 머리말이 모두 `bitrate=600`이었습니다. 화질마다 값을 주려면 `-b:v:0`처럼 출력 스트림 번호를 붙인 스트림 지정자를 씁니다([ffmpeg 문서 「Stream specifiers」](https://ffmpeg.org/ffmpeg.html#Stream-specifiers-1)).

```bash
ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 -t 20 -filter_complex "[0:v]split=3[a][b][c];[b]scale=960:540[b2];[c]scale=640:360[c2]" -map "[a]" -map "[b2]" -map "[c2]" -c:v libx264 -preset veryfast -g 60 -sc_threshold 0 -b:v:0 3000k -b:v:1 1500k -b:v:2 600k -f hls -hls_time 2 -hls_playlist_type vod -var_stream_map "v:0 v:1 v:2" -master_pl_name master.m3u8 v%v.m3u8
```

왼쪽은 `-b:v`를 세 번 준 경우이고 오른쪽은 스트림 지정자로 나눈 경우입니다.

{{< motion scene="OptionScopeOverride" id="fig-option-scope-override" kind="실측" caption="HLS 출력 하나에 세 화질을 담을 때 비트레이트 옵션이 걸리는 방식. -b:v를 세 번 주면 같은 출력의 앞 값이 덮여 세 인코더가 모두 600k 목표로 돌고, 20초 평균이 699 · 657 · 650kbps로 모입니다. -b:v:0 · -b:v:1 · -b:v:2로 나누면 3,118 · 1,581 · 650kbps로 갈라집니다. 수치는 이 글의 FFmpeg 9.0.2 실측입니다." >}}

나눈 값은 마스터 목록에도 드러났습니다. 덮인 쪽은 720p 변형의 `BANDWIDTH`가 801,632로 360p의 697,856과 거의 같았고, 나눈 쪽은 3,264,432 · 1,724,336 · 697,856이었습니다.

둘째, 출력이 둘이면 출력 옵션도 출력마다 다시 써야 합니다. HLS와 DASH를 한 명령에서 함께 쓰려고 `-i` 바로 뒤에 `-t 20`을 한 번만 뒀더니, 길이 제한은 첫 출력(HLS)에만 걸렸습니다. 둘째 출력(DASH)은 끝나지 않아, 약 2분 뒤 멈췄을 때 조각 파일이 495개 쌓여 있었습니다. 모든 출력에 같은 길이를 주려면 `-t`를 `-i` 앞에 두어 입력 옵션으로 쓰거나 출력마다 반복합니다. 두 출력과 먹서 옵션은 [FFmpeg 먹서 글](/posts/tech-blurting/ffmpeg-hls-dash-muxer/)에서 이어집니다.

## -map이 없으면 영상 하나와 소리 하나만 고릅니다 {#4--map---map_metadata---shortest}

`-map`이 없으면 ffmpeg는 출력 형식이 담을 수 있는 종류마다 스트림을 하나씩만 고릅니다. 문서는 영상은 해상도가 가장 큰 것, 소리는 채널이 가장 많은 것을 고른다고 적습니다([ffmpeg 문서 「Automatic stream selection」](https://ffmpeg.org/ffmpeg.html#Automatic-stream-selection)). 그런데 9.0.2 코드는 같은 입력 안에서 기본(default) 표시가 붙은 스트림에 큰 점수를 더합니다([`ffmpeg_mux_init.c` 1683–1685행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/fftools/ffmpeg_mux_init.c#L1683-L1685)). 영상 하나와 소리 셋(1채널 · 6채널 · 1채널, 첫 소리에 기본 표시)이 든 MKV를 `-map` 없이 MP4로 복사하자, 6채널이 아니라 기본 표시가 붙은 1채널 소리 하나만 담겼습니다.

```bash
ffmpeg -i six.mkv -c copy auto.mp4
ffmpeg -i six.mkv -map 0 -c copy all.mp4
```

첫 명령은 영상 1 · 소리 1, 둘째 명령은 영상 1 · 소리 3을 담았습니다. 소리 트랙이 여럿인 입력에서는 `-map 0`(입력 0의 모든 스트림)이나 `-map 0:a:2`(입력 0의 세 번째 소리)처럼 원하는 스트림을 적어야 합니다. PokeClip은 OBS에서 소리 6트랙을 받아 트랙 순서로 역할을 고정합니다([6트랙 입력 계약](/posts/0-to-1/pokeclip-six-track-input-contract/)). 이런 입력을 `-map` 없이 다루면 트랙 다섯 개가 오류 없이 사라집니다.

## -re는 파일을 실시간처럼 읽게 할 뿐 라이브 입력에는 쓰지 않습니다 {#5-라이브-입력-옵션---re--stream_loop-pts-복구}

ffmpeg는 기본적으로 입력을 읽을 수 있는 만큼 빨리 읽습니다. `-re`는 입력 옵션이며 `-readrate 1`과 같아서 1초에 1초 분량만 읽게 합니다. 문서는 이 옵션을 파일을 읽어 캡처 장치나 라이브 입력을 흉내 낼 때 쓴다고 적고, 실제 캡처 장치나 라이브 스트림 입력에 낮은 값으로 쓰면 패킷을 잃을 수 있다고 경고합니다([ffmpeg 문서 「Advanced options」 `-readrate`](https://ffmpeg.org/ffmpeg.html#Advanced-options)). RTMP · SRT로 들어오는 입력은 이미 실시간으로 도착하므로 `-re`를 붙일 이유가 없습니다.

```bash
ffmpeg -re -stream_loop -1 -i sample.mp4 -c copy -f flv rtmp://127.0.0.1/live/test
```

파일을 끝없이 반복해(`-stream_loop -1`) 실시간 속도로 RTMP 서버에 보내는 시험 송출입니다. 받는 서버 주소는 시험 환경의 것으로 바꿉니다.

타임스탬프를 고치는 옵션도 이름만 보고 쓰면 아무 일도 하지 않습니다. `-fflags +genpts`는 DTS가 있는데 PTS가 빠진 패킷에 PTS를 만들 뿐, 뒤로 뛰거나 음수인 타임스탬프를 고치지 않습니다([형식 문서 「Format Options」](https://ffmpeg.org/ffmpeg-formats.html#Format-Options)). `-reset_timestamps 1`은 segment 먹서의 옵션이라([형식 문서 segment](https://ffmpeg.org/ffmpeg-formats.html#segment_002c-stream_005fsegment_002c-ssegment)) `-f mpegts` 출력에 주면 오류도 내지 않고 효과도 없었습니다. 첫 PTS가 1.4초인 TS를 이 옵션으로 복사해도 출력의 첫 PTS는 1.4초였습니다.

## 재포장은 코덱을 두고 그릇만 바꿉니다 {#6-무손실-transmuxing--라이브-인제스트-표준}

재포장(transmux)은 압축된 패킷을 다시 인코딩하지 않고 다른 컨테이너에 옮겨 담는 일입니다. RTMP로 받은 H.264 · AAC를 HLS 조각으로 옮길 때가 대표적입니다.

```bash
ffmpeg -i input.flv -c copy -f hls -hls_time 4 -hls_list_size 6 -hls_flags delete_segments -hls_segment_filename 'seg%05d.ts' live.m3u8
```

재포장으로 바꿀 수 없는 것도 분명합니다. 조각은 키프레임에서만 나뉘므로, 송출 쪽 키프레임 간격이 4초보다 길면 `-hls_time 4`를 줘도 조각이 그만큼 길어집니다. 조각 길이를 맞추려면 송출 인코더의 키프레임 간격을 고정해야 하고, 그 옵션은 [x264 글](/posts/tech-blurting/x264-live-rate-control-gop/)에서 다룹니다.

범용 도구로 재포장할 때 생기는 차이도 있습니다. PokeClip은 되감기용 조각을 조각마다 `ffmpeg -c copy`로 뽑으려 했지만, 조각마다 init의 비트레이트 칸이 12바이트씩 달라 한 세션 안에서 init이 같다는 전제가 서지 않았고, 파트도 다시 잘렸습니다(4개 → 2개). 그래서 MediaMTX 녹화기와 같은 라이브러리로 짠 Go 재포장으로 바꿨습니다([Go 재포장 글](/posts/0-to-1/pokeclip-go-remux-same-io-benchmark/)). 이 재포장도 다시 인코딩하지 않습니다([라이브 · 되감기 · 편집 경로 글](/posts/0-to-1/pokeclip-live-editing-boundaries/)).

## split 하나로 한 번 디코딩해 여러 화질을 인코딩합니다 {#9--filter_complex--멀티-입력출력}

한 입력으로 화질 셋을 만들 때 ffmpeg 프로세스를 셋 띄우면 디코딩도 세 번 합니다. `-filter_complex`의 `split`으로 디코딩한 프레임을 나누면 디코딩은 한 번이고 인코더만 셋이 됩니다.

```mermaid {#fig-split-ladder kind="개념도" caption="입력 하나로 화질 셋을 만들 때 split 하나로 나누는 구성. 디코더 하나가 만든 프레임을 스케일러와 인코더 셋이 나눠 씁니다. 1080p는 크기를 바꾸지 않으므로 스케일러를 거치지 않습니다. 프로세스를 셋 띄우면 이 그림의 디코더도 셋이 됩니다." source="https://ffmpeg.org/ffmpeg-filters.html#split_002c-asplit"}
flowchart TB
  accTitle: split으로 디코딩 한 번에 인코딩 셋
  accDescr: 입력을 디코더 하나가 풀고 split이 프레임을 셋으로 나눈다. 하나는 그대로 1080p x264로 가고, 나머지 둘은 scale로 720p와 480p로 줄인 뒤 각각의 x264로 간다.
  IN["입력 1080p"] --> D["디코더 1개"]
  D --> S["split=3"]
  S --> E1["x264 1080p"]
  S --> C["scale 720p · 480p"]
  C --> E2["x264 720p · 480p"]
```

20초짜리 1080p30 H.264 파일로 1080p · 720p · 480p를 만들며 CPU 시간(user + sys)을 쟀습니다. 따로 세 번 실행하면 합이 34.5 · 38.2 · 40.0초, `split` 한 번은 29.4 · 31.1 · 33.1초였습니다(세 번 반복). 같은 파일을 디코딩만 하는 데 3.6–3.8초가 걸렸으니, 차이는 대부분 두 번 더 한 디코딩입니다. 다른 작업과 함께 돈 기계라 수치의 흔들림이 큽니다.

Twitch는 2017년 글에서 FFmpeg에도 입력 하나로 출력 N개를 만드는 방식이 있고 그쪽이 프로세스를 N개 띄우는 것보다 계산이 싸다고 적었습니다. 그러면서도 프레임레이트를 낮추는 방식, 자체 메타데이터 삽입 같은 자기 서비스의 요구를 FFmpeg가 맞추지 못한다고 보고 자체 트랜스코더를 만들었습니다([Twitch, FFmpeg vs TwitchTranscoder 1부](https://blog.twitch.tv/en/2017/10/10/live-video-transmuxing-transcoding-f-fmpeg-vs-twitch-transcoder-part-i-489c1c125f28/)). 같은 글은 원본을 재포장한 변형과 다시 인코딩한 변형은 조각 경계(IDR)가 맞는다는 보장이 없다고 지적합니다. 한 명령에서 여러 화질을 만들 때 모든 인코더에 같은 키프레임 간격을 주는 이유입니다. 화질을 몇 단계로 어떻게 고를지는 [ABR 사다리 글](/posts/tech-blurting/abr-ladder-design/)에서 다룹니다.

## -progress의 speed가 1을 밑돌면 라이브를 따라가지 못합니다 {#14--progress--라이브-트랜스코딩-모니터링}

`-progress`는 전역 옵션이며, 진행 정보를 `키=값` 줄로 주기적으로 내보내고 묶음마다 `progress=continue`나 `progress=end`로 끝냅니다([ffmpeg 문서 「Advanced options」 `-progress`](https://ffmpeg.org/ffmpeg.html#Advanced-options)).

```bash
ffmpeg -progress pipe:1 -nostats -re -f lavfi -t 3 -i testsrc2=size=1280x720:rate=30 -c:v libx264 -preset veryfast -f null -
```

```text
frame=90
fps=35.00
out_time=00:00:02.933333
dup_frames=0
drop_frames=0
speed=1.14x
progress=end
```

`speed`는 출력한 미디어 시간을 흐른 벽시계 시간으로 나눈 값입니다. 라이브 입력은 1초에 1초 분량씩 들어오므로, 트랜스코더의 `speed`가 계속 1을 밑돌면 입력이 쌓이고 조각이 점점 늦게 나옵니다. 같은 명령에서 `-re`를 빼면 입력을 최대 속도로 읽어 `speed=6.25x`가 나왔습니다. `-re`를 줬는데도 3초짜리 실행에서 1을 넘은 것은 처음 0.5초를 몰아 읽는 기본값(`-readrate_initial_burst`) 때문입니다([`ffmpeg_demux.c` 2298행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/fftools/ffmpeg_demux.c#L2298)). 서버 한 대에 채널을 몇 개까지 넣을 수 있는지를 이 값으로 잰 결과는 [라이브 트랜스코딩 인프라 글](/posts/tech-blurting/live-transcoding-infrastructure/)에 있습니다.

## 흔한 오해는 대부분 옵션이 걸리는 단계를 헷갈린 데서 나옵니다 {#정리하면}

- 「`-ss`를 `-i` 앞에 두면 부정확하다」: 스트림 복사에만 맞습니다. 인코딩할 때는 `-accurate_seek`가 기본이라 앞에 둬도 프레임 단위로 정확했습니다.
- 「출력 하나에 `-b:v`를 여러 번 주면 스트림마다 들어간다」: 마지막 값 하나만 남습니다. 스트림마다 주려면 `-b:v:0`처럼 지정자를 붙입니다.
- 「`-i` 뒤의 옵션은 모든 출력에 걸린다」: 바로 다음 출력 하나에만 걸립니다.
- 「`-map`이 없으면 채널이 가장 많은 소리를 고른다」: 같은 입력 안에서는 기본 표시가 붙은 스트림이 먼저입니다.
- 「`-re`는 라이브 입력에 붙인다」: 파일로 라이브를 흉내 낼 때 쓰는 옵션입니다.
- 「`-c copy`로도 해상도나 키프레임을 맞출 수 있다」: 압축된 내용은 바꾸지 못하고, 필터와 함께 주면 FFmpeg가 출력을 열지 않습니다.

x264의 레이트 제어 · 키프레임 옵션은 [x264 글](/posts/tech-blurting/x264-live-rate-control-gop/), 프로파일 · 레벨과 화질 지표는 [H.264 글](/posts/tech-blurting/h264-deep-dive/)에서 다룹니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 02:20–03:00(KST)에 실행했습니다. 기종은 MacBook Air(Apple M5, 고성능 4 · 효율 6코어, 32GB, 팬 없음), macOS 27.0.1, FFmpeg 9.0.2(Homebrew), x264 core 165 r3222입니다. 같은 기계에서 다른 세션의 작업이 함께 돌았습니다.
- 비트레이트 덮어쓰기: `ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 -t 20 -filter_complex "[0:v]split=3[a][b][c];[b]scale=960:540[b2];[c]scale=640:360[c2]" -map "[a]" -map "[b2]" -map "[c2]" -c:v libx264 -preset veryfast -g 60 -sc_threshold 0 -b:v 3000k -b:v 1500k -b:v 600k -f hls -hls_time 2 -hls_playlist_type vod -var_stream_map "v:0 v:1 v:2" -master_pl_name master.m3u8 v%v.m3u8`. 지정자판은 `-b:v` 셋을 `-b:v:0 3000k -b:v:1 1500k -b:v:2 600k`로 바꿨습니다. 평균 비트레이트는 변형별 TS 조각 바이트 합 × 8 ÷ 20초, 인코더 목표값은 x264 설정 머리말의 `bitrate=`로 확인했습니다. 한 번씩 실행했습니다.
- `-ss`: 입력은 `ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 -t 10 -c:v libx264 -preset veryfast -g 60 -keyint_min 60 -sc_threshold 0 -bf 0 src.mp4`로 만든 10초 파일(키프레임 0 · 2 · 4 · 6 · 8초)입니다. 표의 네 명령(인코딩은 `-preset veryfast` 포함)으로 자른 뒤 첫 디코딩 프레임의 `framemd5`를 원본 프레임 목록과 대조했습니다.
- `-map`: 영상 1(testsrc2) · 소리 3(sine 1채널, anullsrc 5.1, sine 1채널, AAC)을 담은 2초 MKV(첫 소리에 기본 표시)를 본문의 두 명령으로 복사하고 `ffprobe`로 스트림을 셌습니다.
- `split` CPU 시간: 입력은 testsrc2 1920×1080 30fps 20초를 libx264 veryfast 8,000k로 만든 파일입니다. 따로 실행은 `ffmpeg -i src1080.mp4 -vf scale=W:H -c:v libx264 -preset veryfast -b:v B -f null -`(1920:1080 6000k, 1280:720 3000k, 854:480 1200k) 세 번의 합, `split`은 `ffmpeg -i src1080.mp4 -filter_complex "[0:v]split=3[a][b][c];[b]scale=1280:720[b2];[c]scale=854:480[c2]" -map "[a]" -c:v libx264 -preset veryfast -b:v 6000k -f null - -map "[b2]" -c:v libx264 -preset veryfast -b:v 3000k -f null - -map "[c2]" -c:v libx264 -preset veryfast -b:v 1200k -f null -`, 디코딩만은 `ffmpeg -i src1080.mp4 -f null -`입니다. `/usr/bin/time -p`의 user + sys를 세 번 반복해 쟀습니다.
- 두 출력의 `-t`: [먹서 글의 측정 조건](/posts/tech-blurting/ffmpeg-hls-dash-muxer/#측정-조건)에 있는 두 출력 명령에서 `-t 20`을 `-i` 앞이 아니라 뒤에 둔 명령입니다. 도구의 2분 시간 제한에서 멈췄습니다.
- `-reset_timestamps`: `ffmpeg -ss 3 -i src.mp4 -c copy -f mpegts in.ts` 뒤 `ffmpeg -i in.ts -reset_timestamps 1 -c copy -f mpegts out.ts`를 실행하고 두 파일의 첫 패킷 PTS를 `ffprobe`로 비교했습니다.
- 재포장 · 시험 송출 명령: 6초 시험 파일로 본문 명령을 그대로 실행해 목록과 조각이 나오는 것, `-listen 1`로 띄운 로컬 RTMP 수신에 반복 송출이 들어가는 것을 확인했습니다.

## 출처

- [FFmpeg ffmpeg 문서](https://ffmpeg.org/ffmpeg.html) — Description, Detailed description, Streamcopy, Stream specifiers, Automatic stream selection, Main options(`-ss`), Advanced options(`-readrate` · `-re`, `-progress`)
- [FFmpeg 형식 문서](https://ffmpeg.org/ffmpeg-formats.html) — Format Options(`fflags genpts`), segment 먹서(`reset_timestamps`)
- [FFmpeg 필터 문서 — split](https://ffmpeg.org/ffmpeg-filters.html#split_002c-asplit)
- FFmpeg n9.0.2 소스: [`fftools/ffmpeg_opt.c` 146행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/fftools/ffmpeg_opt.c#L146), [`fftools/ffmpeg_mux_init.c` 1683–1685행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/fftools/ffmpeg_mux_init.c#L1683-L1685), [`fftools/ffmpeg_demux.c` 2298행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/fftools/ffmpeg_demux.c#L2298)
- [OBS Studio 32.0.0 `obs-ffmpeg-mpegts.c`](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-ffmpeg/obs-ffmpeg-mpegts.c#L622-L632)
- [Twitch Blog, Live Video Transmuxing/Transcoding: FFmpeg vs TwitchTranscoder, Part I](https://blog.twitch.tv/en/2017/10/10/live-video-transmuxing-transcoding-f-fmpeg-vs-twitch-transcoder-part-i-489c1c125f28/) (2017-10-10)
- PokeClip 기록: [6트랙 입력 계약](/posts/0-to-1/pokeclip-six-track-input-contract/) · [Go 재포장](/posts/0-to-1/pokeclip-go-remux-same-io-benchmark/) · [라이브 · 되감기 · 편집 경로](/posts/0-to-1/pokeclip-live-editing-boundaries/)

다음 편: [라이브 x264는 VBV와 키프레임 간격을 옵션으로 고정합니다](/posts/tech-blurting/x264-live-rate-control-gop/)
