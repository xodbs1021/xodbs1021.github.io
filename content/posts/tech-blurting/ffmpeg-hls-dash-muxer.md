---
title: "FFmpeg dash 먹서는 HLS 목록도 같은 조각으로 씁니다"
date: 2026-11-13T03:16:18+09:00
description: "HLS와 DASH를 함께 내려고 ffmpeg에 출력 두 개를 주면 인코더도 두 개가 돌아 CPU 시간과 저장량이 두 배가 됩니다. dash 먹서에 -hls_playlist 1을 주면 인코딩 한 번으로 만든 fMP4 조각 한 벌을 MPD와 m3u8이 함께 가리켰습니다. hls 먹서의 hls_time 기본 2초, 태그만 붙이는 independent_segments, 프로토콜 7에서 사라진 ALLOW-CACHE, event 목록과 ENDLIST, var_stream_map 사다리, LL-HLS 파트를 만들지 않는 점까지 FFmpeg 9.0.2 소스와 로컬 실측으로 확인했습니다."
categories: ["tech-blurting"]
tags: ["FFmpeg", "HLS", "DASH", "fMP4", "먹서"]
draft: false
author: "김태윤"
---

HLS와 DASH를 함께 내려고 ffmpeg 명령에 `-f hls` 출력과 `-f dash` 출력을 나란히 두면, 같은 입력을 두 번 인코딩합니다. 출력마다 인코더가 따로 붙기 때문입니다. 20초짜리 720p 입력으로 재 보니 x264 인코더가 둘 돌았고, CPU 시간은 14.8–15.0초, 조각은 두 벌 15.1MB였습니다. dash 먹서에 `-hls_playlist 1`을 주면 인코더는 하나이고, fMP4 조각 한 벌(7.56MB)을 MPD와 HLS 미디어 목록이 함께 가리켰습니다. CPU 시간은 7.4–8.0초였습니다. FFmpeg의 HLS · DASH 먹서에는 이름과 다르게 동작하는 옵션도 여럿 있습니다. `independent_segments`는 조각을 검사하지 않고 태그만 붙이고, `hls_allow_cache`는 HLS 프로토콜 7에서 사라진 태그를 아직 씁니다. 실측은 모두 AI(Claude Code)가 FFmpeg 9.0.2로 실행했습니다(아래 「측정 조건」).

규격 쪽 설명(목록 구조, 목표 길이, 라이브 창)은 [HLS 기본 글](/posts/tech-blurting/hls-just-files/), [HLS 지연 글](/posts/tech-blurting/hls-deep-dive/), [DASH 글](/posts/tech-blurting/dash-vs-hls/), [CMAF 글](/posts/tech-blurting/cmaf-deep-dive/)에 있습니다.

## hls 먹서의 hls_time 기본값은 2초입니다

`-hls_time`을 주지 않으면 hls 먹서는 조각을 2초 목표로 자릅니다. 소스의 기본값은 2,000,000마이크로초이고([`hlsenc.c` 3133행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/hlsenc.c#L3133)), 형식 문서도 기본값을 2로 적습니다([형식 문서 hls](https://ffmpeg.org/ffmpeg-formats.html#hls-2)). 키프레임이 2초마다 있는 10초 입력을 옵션 없이 넣자 조각 다섯 개가 모두 `#EXTINF:2.000000`이었습니다. 목록에 남기는 조각 수(`-hls_list_size`)의 기본값은 5입니다.

이 값은 목표일 뿐입니다. 먹서는 영상 패킷 가운데 키프레임 표시가 붙은 것에서만 조각을 나눕니다([`hlsenc.c` 2490–2491행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/hlsenc.c#L2490-L2491)). 그래서 조각 길이는 인코더의 키프레임 간격에 묶이고, 키프레임 간격을 고정하는 옵션은 [x264 글](/posts/tech-blurting/x264-live-rate-control-gop/)에서 다룹니다. 애플 저작 규격은 목표 길이로 6초를 권합니다(7.5, [HLS 저작 규격](https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices)).

`-hls_init_time`은 목록이 처음 찰 때까지의 조각 길이입니다([`hlsenc.c` 2961행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/hlsenc.c#L2961)). 키프레임 1초 간격 입력에 `-hls_init_time 1 -hls_time 4`를 주자 처음 조각 여섯 개가 1초, 이어서 3초 하나, 그 뒤가 4초였습니다. 첫 조각을 짧게 해 재생을 일찍 시작하게 하려는 옵션입니다.

## independent_segments는 태그만 붙입니다

`-hls_flags independent_segments`는 영상이 있는 미디어 목록에 `#EXT-X-INDEPENDENT-SEGMENTS`를 쓰고 판 번호를 6으로 올립니다([`hlsenc.c` 1578–1580 · 1610–1611행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/hlsenc.c#L1578-L1611)). 조각이 정말 혼자 디코딩되는지는 검사하지 않습니다. 형식 문서도 이 플래그를 「모든 조각이 키프레임으로 시작한다고 보장될 때」 쓰라고 적어, 보장은 쓰는 사람 몫으로 남깁니다. RFC 8216은 이 태그를 조각 안의 모든 표본이 다른 조각의 정보 없이 디코딩된다는 뜻으로 정합니다(4.3.5.1).

두 경우에서 태그와 실제가 어긋났습니다.

- 키프레임 간격이 10초(`-g 300`)인 입력에 `-hls_time 2`와 이 플래그를 주자, 태그는 붙었고 조각은 10초짜리 두 개가 됐습니다. 경고 수준(`-loglevel warning`)으로 실행해도 경고는 없었습니다.
- 열린 GOP(open GOP)로 인코딩한 MKV를 `-c copy`로 넣자, 둘째 조각부터는 IDR이 아닌 키프레임(복구 지점 SEI가 붙은 I 슬라이스)으로 시작했고 SPS · PPS가 없어 혼자서는 한 프레임도 디코딩되지 않았습니다. 목록에는 `#EXT-X-INDEPENDENT-SEGMENTS`가 붙어 있었습니다.

`split_by_time` 플래그와 함께 주면 먹서가 이 플래그를 끄고 경고를 남깁니다([`hlsenc.c` 2963–2968행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/hlsenc.c#L2963-L2968)). 시간으로 자르면 키프레임이 아닌 곳에서 나뉠 수 있어서입니다. 조각이 IDR로 시작해야 하는 이유는 [HLS 기본 글](/posts/tech-blurting/hls-just-files/#idr-frame이-세그먼트-시작에-있어야-하는-이유)에 있습니다.

## ALLOW-CACHE는 프로토콜 7에서 사라졌습니다

`-hls_allow_cache 1`을 주면 FFmpeg 9.0.2는 목록 머리에 `#EXT-X-ALLOW-CACHE:YES`를 씁니다(0이면 `NO`, 기본 -1이면 쓰지 않음, [`hlsplaylist.c` 117–118행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/hlsplaylist.c#L117-L118)). RFC 8216은 이 태그가 프로토콜 버전 7에서 없어졌다고 적습니다(7절). fMP4 조각을 쓰면 FFmpeg가 목록을 버전 7로 올리므로([`hlsenc.c` 1582–1584행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/hlsenc.c#L1582-L1584)) 이 옵션과 함께 쓰면 버전 7 목록에 사라진 태그가 들어갑니다. 조각 캐시는 이 태그가 아니라 HTTP 캐시 헤더로 정합니다([HLS 지연 글의 캐시 절](/posts/tech-blurting/hls-deep-dive/#qa-라이브-스트리밍인데-cdn이-어떻게-캐시하는가)).

## event 목록은 뒤에만 붙고 끝나면 ENDLIST가 붙습니다

`-hls_playlist_type event`는 목록에 `#EXT-X-PLAYLIST-TYPE:EVENT`를 쓰고 `hls_list_size`를 0으로 바꿉니다([`hlsenc.c` 1117–1118행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/hlsenc.c#L1117-L1118)). RFC 8216도 EVENT 목록은 끝에 조각을 더하기만 할 수 있다고 정합니다(4.3.3.5). `-hls_list_size 3`을 함께 줘도 20초 동안 조각 10개가 목록에 모두 남았습니다.

실시간 속도로 10초를 내보내며 목록을 봤습니다. 6.5초 시점에는 조각 셋이 있었고 `ENDLIST`가 없었습니다. 정상 종료 뒤에는 조각 다섯 개 끝에 `#EXT-X-ENDLIST`가 붙었습니다. 끝나는 방식에 따라 결과가 갈렸습니다.

| 끝내는 방식 | 목록 항목 | ENDLIST |
|---|---|---|
| 입력이 끝남(`-t 10`) | 5 | 있음 |
| 7초 뒤 SIGINT | 4 | 있음 |
| 7초 뒤 SIGKILL | 3 | 없음 |

SIGINT는 ffmpeg가 먹서를 정리하며 마지막 조각과 `ENDLIST`를 썼고, SIGKILL로 죽으면 목록은 마지막으로 다시 쓴 상태로 멈췄습니다. 재생기는 `ENDLIST`가 없으면 라이브가 이어진다고 보고 목록을 계속 다시 받습니다([HLS 기본 글](/posts/tech-blurting/hls-just-files/#라이브-vs-vod--끝이-있냐-없냐)). 송출이 비정상으로 끝났을 때 목록을 닫는 일은 먹서 바깥에서 따로 맡아야 합니다.

## var_stream_map 사다리는 스트림 지정자로 비트레이트를 나눕니다

`-var_stream_map "v:0 v:1 v:2"`는 출력 스트림을 변형(variant)으로 묶고, 출력 이름의 `%v`가 변형 번호로 바뀝니다. `-master_pl_name`을 주면 변형들을 가리키는 다변형 목록을 씁니다([형식 문서 hls `var_stream_map`](https://ffmpeg.org/ffmpeg-formats.html#hls-2)). 소리를 묶으려면 `"v:0,agroup:aud v:1,agroup:aud a:0,agroup:aud"`처럼 그룹 이름을 붙입니다.

비트레이트는 변형마다 스트림 지정자로 줘야 합니다. 출력이 하나이므로 `-b:v`를 세 번 쓰면 마지막 값만 남아 세 변형이 모두 600kbps 목표로 인코딩됐고, `-b:v:0 3000k -b:v:1 1500k -b:v:2 600k`로 나누자 3,118 · 1,581 · 650kbps가 나왔습니다. 이 실측과 명령은 [FFmpeg 옵션 글](/posts/tech-blurting/ffmpeg-deep-dive/#출력-하나에-같은-옵션을-거듭-주면-마지막-값만-남습니다)에 있습니다. 사다리를 어떤 해상도 · 비트레이트로 짤지는 [ABR 사다리 글](/posts/tech-blurting/abr-ladder-design/)에서 다룹니다.

## 두 출력으로 쓰면 인코딩도 두 번 합니다

ffmpeg의 출력 옵션은 출력마다 따로 걸리므로, 출력이 둘이면 `-c:v libx264`도 둘이고 인코더도 둘입니다. 같은 20초 입력을 한 명령에서 HLS(fMP4 조각)와 DASH로 함께 쓰자, 로그에 서로 다른 x264 인코더 둘이 찍혔고 조각도 두 벌이 생겼습니다.

| 방식 | x264 인코더 | 조각 · init 바이트 | CPU 시간(3회) |
|---|---|---|---|
| `-f hls` 출력 + `-f dash` 출력 | 2 | 15,117,404(HLS 7,558,708 + DASH 7,558,696) | 14.78 · 14.97 · 14.88초 |
| `-f dash -hls_playlist 1` 한 출력 | 1 | 7,558,696 | 7.95 · 7.43 · 7.74초 |

두 출력 쪽의 DASH 조각과 한 출력 쪽의 조각은 바이트 단위로 같았습니다. 같은 설정의 인코더가 같은 프레임을 두 번 압축했을 뿐입니다. 인코딩을 한 번만 하고 포장만 둘로 나누려면 출력을 둘로 두지 말고, 한 먹서가 두 목록을 쓰게 하거나 인코딩한 결과를 패키저에 넘겨야 합니다. 미디어를 한 벌로 맞춰도 인코딩은 줄지 않고 포장과 저장이 줄어든다는 점은 [CMAF 글](/posts/tech-blurting/cmaf-deep-dive/#2-cmaf-도입-효과--실제-절감-수치)에 있습니다.

패키저에 파이프로 넘길 때는 MP4 종류를 가려야 합니다. 조각이 아닌 MP4는 파이프로 보낼 수 없습니다. `ffmpeg … -f mp4 -`는 「muxer does not support non seekable output」을 내고 헤더를 쓰지 못했습니다. MP4 먹서가 다 쓴 뒤 앞으로 돌아가 `mdat` 상자의 크기 칸을 고쳐 써야 하기 때문입니다([movenc.c 9000–9010행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/movenc.c#L9000-L9010)). 같은 먹서도 `-movflags frag_keyframe+empty_moov`로 조각 MP4를 만들면 파이프로 나갑니다. 소스에도 「조각으로 쓰면 되돌아갈 수 없는 출력도 괜찮다」는 주석이 있습니다([movenc.c 8241–8247행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/movenc.c#L8241-L8247)). Shaka Packager 문서는 FFmpeg에서 넘길 때 MPEG-TS를 UDP나 이름 있는 파이프로 보내는 예를 듭니다([Shaka Packager v3.9.3 FFmpeg 파이프 문서](https://github.com/shaka-project/shaka-packager/blob/v3.9.3/docs/source/tutorials/ffmpeg_piping.rst)).

## dash 먹서 -hls_playlist는 조각 한 벌을 두 목록이 가리킵니다

`-f dash`에 `-hls_playlist 1`을 주면 MPD와 함께 다변형 목록(`master.m3u8`, 이름은 `-hls_master_name`)과 스트림마다 미디어 목록(`media_N.m3u8`)을 씁니다([형식 문서 dash](https://ffmpeg.org/ffmpeg-formats.html#dash-2), [`dashenc.c` 2263행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/dashenc.c#L2263)). 두 목록은 같은 init과 조각 파일을 가리킵니다.

```text
media_0.m3u8
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:2
#EXT-X-MAP:URI="init-stream0.m4s"
#EXTINF:2.000000,
chunk-stream0-00001.m4s

manifest.mpd
<SegmentTemplate timescale="15360" initialization="init-stream$RepresentationID$.m4s" media="chunk-stream$RepresentationID$-$Number%05d$.m4s" startNumber="1">
```

두 목록이 가리키는 파일을 실제 산출물에서 옮겨 그리면 이렇습니다.

```mermaid {#fig-hls-playlist-tree kind="재구성" caption="ffmpeg -f dash -hls_playlist 1 한 출력이 만든 파일. manifest.mpd의 SegmentTemplate과 media_0.m3u8의 EXT-X-MAP · 조각 줄이 같은 init-stream0.m4s와 chunk-stream0-00001 … 00010.m4s를 가리킵니다. 이 글의 FFmpeg 9.0.2 실측 산출물(조각 10개, 7,558,696바이트)을 옮겨 그렸습니다." source="로컬 실측(2026-11-13), 아래 「측정 조건」"}
flowchart TB
  accTitle: dash 먹서 한 출력이 만든 두 목록과 조각 한 벌
  accDescr: master.m3u8이 media_0.m3u8을 가리키고, media_0.m3u8과 manifest.mpd가 함께 init-stream0.m4s와 chunk-stream0 조각 10개를 가리킨다.
  MA["master.m3u8<br/>HLS 다변형 목록"] --> ME["media_0.m3u8<br/>HLS 미디어 목록"]
  MPD["manifest.mpd<br/>DASH MPD"]
  ME --> INIT["init-stream0.m4s"]
  MPD --> INIT
  ME --> SEG["조각 m4s 10개<br/>chunk-stream0-<br/>00001~00010"]
  MPD --> SEG
```

두 방식의 차이를 시간 순서로 보면, 위쪽은 인코더 둘이 조각을 두 벌 쌓고 아래쪽은 인코더 하나가 쌓은 한 벌을 두 목록이 나눠 가리킵니다.

{{< motion scene="SharedSegments" id="fig-shared-segments" kind="실측" caption="HLS와 DASH를 함께 낼 때 두 방식. 출력을 둘로 두면 x264 인코더 둘이 조각을 두 벌(15.1MB) 만들고, dash 먹서에 -hls_playlist 1을 주면 인코더 하나가 만든 조각 한 벌(7.56MB)을 MPD와 m3u8이 함께 가리킵니다. 조각 수와 바이트는 이 글의 FFmpeg 9.0.2 실측입니다." >}}

이 방식의 HLS 목록에는 dash 먹서의 성질이 따라옵니다. 조각은 fMP4라 HLS 판 6 이상을 지원하는 재생기가 필요하고, 미디어 목록에 조각마다 `EXT-X-PROGRAM-DATE-TIME`이 붙었습니다. dash 먹서에는 hls 먹서의 `independent_segments` · `hls_playlist_type` 같은 HLS 쪽 옵션이 없습니다.

## FFmpeg는 LL-HLS 파트를 만들지 않고 Shaka도 LL-DASH만 지원합니다

FFmpeg 9.0.2의 hls · dash 먹서와 목록 작성 코드에는 LL-HLS의 부분 조각 태그(`EXT-X-PART`)를 쓰는 곳이 없습니다(`hlsenc.c` · `dashenc.c` · `hlsplaylist.c`에서 0건). dash 먹서의 `-lhls`는 이름과 달리 애플 LL-HLS가 아니라, 지금 만드는 조각의 주소를 `#EXT-X-PREFETCH`로 미리 알리는 실험용 옵션입니다([`dashenc.c` 2271행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/dashenc.c#L2271)). 저지연 DASH용 `-ldash`와 `-streaming`은 있습니다. LL-HLS 파트와 LL-DASH 청크의 관계는 [LL-HLS 글](/posts/tech-blurting/ll-hls-deep-dive/)과 [CMAF 글](/posts/tech-blurting/cmaf-deep-dive/#10-chunked-cmaf--ll-hls의-기반)에 있습니다.

패키저를 따로 둬도 사정은 비슷합니다. Shaka Packager v3.9.3의 저지연 문서는 「Only LL-DASH is supported. LL-HLS support is yet to come.」이라고 적습니다([low_latency.rst](https://github.com/shaka-project/shaka-packager/blob/v3.9.3/docs/source/tutorials/low_latency.rst)). LL-HLS가 필요하면 파트와 보류 응답을 직접 구현한 서버나 패키저를 따로 골라야 합니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 02:45–03:00(KST)에 실행했습니다. 기종은 MacBook Air(Apple M5, 고성능 4 · 효율 6코어, 32GB, 팬 없음), macOS 27.0.1, FFmpeg 9.0.2(Homebrew), x264 core 165 r3222입니다. 같은 기계에서 다른 세션의 작업이 함께 돌아 벽시계 시간은 흔들렸고, 비교는 CPU 시간(`/usr/bin/time -p`의 user + sys)으로 했습니다.
- 두 출력: `ffmpeg -f lavfi -t 20 -i testsrc2=size=1280x720:rate=30 -c:v libx264 -preset veryfast -g 60 -sc_threshold 0 -b:v 3000k -f hls -hls_time 2 -hls_playlist_type vod -hls_segment_type fmp4 -hls_segment_filename hls/seg_%03d.m4s hls/index.m3u8 -c:v libx264 -preset veryfast -g 60 -sc_threshold 0 -b:v 3000k -f dash -seg_duration 2 dash/manifest.mpd`
- 한 출력: `ffmpeg -f lavfi -t 20 -i testsrc2=size=1280x720:rate=30 -c:v libx264 -preset veryfast -g 60 -sc_threshold 0 -b:v 3000k -f dash -seg_duration 2 -hls_playlist 1 one/manifest.mpd`
- 인코더 수는 로그에 찍힌 서로 다른 `[libx264 @ 주소]`의 수, 바이트는 `.m4s` · `.mp4` 파일 합(목록 파일 제외), 같은 조각 여부는 `cmp`로 확인했습니다. 두 명령을 세 번씩 실행했습니다.
- event: `ffmpeg -re -f lavfi -t 10 -i testsrc2=size=640x360:rate=30 -c:v libx264 -preset veryfast -g 60 -sc_threshold 0 -f hls -hls_playlist_type event -hls_segment_filename ev/seg_%03d.ts ev/index.m3u8`를 실행하며 6.5초 시점과 종료 뒤 목록을 읽었습니다. 신호 시험은 같은 명령에서 `-t 10`을 빼고 7초 뒤 `kill -INT` 또는 `kill -9`를 보냈습니다. 목록 크기 시험은 `-re` 없이 `-t 20`과 `-hls_list_size 3`을 더했습니다.
- `hls_time` 기본값: `ffmpeg -f lavfi -t 10 -i testsrc2=size=640x360:rate=30 -c:v libx264 -preset veryfast -g 60 -sc_threshold 0 -f hls -hls_playlist_type vod -hls_segment_filename def/seg_%03d.ts def/index.m3u8`
- `independent_segments`: 같은 입력 20초를 `-g 300`, `-hls_time 2 -hls_flags independent_segments`로 썼습니다. 열린 GOP 시험의 원본은 `ffmpeg -f lavfi -t 12 -i testsrc2=size=640x360:rate=30 -c:v libx264 -preset veryfast -g 60 -keyint_min 60 -sc_threshold 0 -x264-params open-gop=1 og/src.mkv`이고, `ffmpeg -i og/src.mkv -c copy -f hls -hls_time 2 -hls_playlist_type vod -hls_flags independent_segments -hls_segment_filename og/seg_%03d.ts og/index.m3u8`로 잘랐습니다. 조각의 NAL 종류는 패킷 바이트를, 혼자 디코딩되는지는 `ffmpeg -i og/seg_001.ts -f framecrc -`로 확인했습니다.
- `hls_allow_cache`: 4초 입력에 `-hls_allow_cache 1`을 주고 목록 머리를 읽었습니다. TS 조각이면 판 3 목록에, `-hls_segment_type fmp4`를 더하면 `#EXT-X-VERSION:7` 바로 아래에 `#EXT-X-ALLOW-CACHE:YES`가 들어갔습니다.
- `hls_init_time`: `ffmpeg -f lavfi -t 30 -i testsrc2=size=640x360:rate=30 -c:v libx264 -preset veryfast -g 30 -sc_threshold 0 -f hls -hls_init_time 1 -hls_time 4 -hls_segment_filename it/seg_%03d.ts it/index.m3u8`, 조각 길이는 `ffprobe`의 `format=duration`입니다.
- MP4 파이프: `ffmpeg -f lavfi -t 2 -i testsrc2=size=640x360:rate=30 -c:v libx264 -f mp4 - > /dev/null` → 「muxer does not support non seekable output」, 종료 코드 234. 조각 MP4: `ffmpeg -f lavfi -t 2 -i testsrc2=size=640x360:rate=30 -c:v libx264 -movflags frag_keyframe+empty_moov -f mp4 - > out.mp4` → 종료 코드 0.

## 출처

- [RFC 8216: HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216) — 4.3.3.5 EXT-X-PLAYLIST-TYPE, 4.3.5.1 EXT-X-INDEPENDENT-SEGMENTS, 7절 「The EXT-X-ALLOW-CACHE tag was removed in protocol version 7.」
- [FFmpeg 형식 문서](https://ffmpeg.org/ffmpeg-formats.html) — [hls 먹서](https://ffmpeg.org/ffmpeg-formats.html#hls-2), [dash 먹서](https://ffmpeg.org/ffmpeg-formats.html#dash-2)
- FFmpeg n9.0.2 소스: [`libavformat/hlsenc.c`](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/hlsenc.c), [`libavformat/hlsplaylist.c`](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/hlsplaylist.c), [`libavformat/dashenc.c`](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/dashenc.c)
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices) (개정 2025-06-26) — 7.5
- Shaka Packager v3.9.3: [저지연 문서](https://github.com/shaka-project/shaka-packager/blob/v3.9.3/docs/source/tutorials/low_latency.rst), [FFmpeg 파이프 문서](https://github.com/shaka-project/shaka-packager/blob/v3.9.3/docs/source/tutorials/ffmpeg_piping.rst)
- 이어지는 글: [FFmpeg 옵션 글](/posts/tech-blurting/ffmpeg-deep-dive/) · [HLS 기본](/posts/tech-blurting/hls-just-files/) · [HLS 지연](/posts/tech-blurting/hls-deep-dive/) · [LL-HLS](/posts/tech-blurting/ll-hls-deep-dive/) · [CMAF](/posts/tech-blurting/cmaf-deep-dive/) · [DASH](/posts/tech-blurting/dash-vs-hls/)

다음 편: [ABR 사다리는 해상도별 화질 곡선의 윗선에서 고릅니다](/posts/tech-blurting/abr-ladder-design/)
