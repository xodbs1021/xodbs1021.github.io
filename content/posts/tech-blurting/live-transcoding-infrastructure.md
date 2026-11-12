---
title: "라이브 트랜스코딩 서버는 실시간 배속으로 수용량을 잽니다"
date: 2026-06-22T15:38:47+09:00
lastmod: "2026-11-13T03:16:18+09:00"
description: "라이브 트랜스코더 한 대에 넣을 채널 수는 CPU 사용률이 아니라 각 출력이 실시간 속도(speed 1.0)를 지키는지로 정합니다. 1080p30 입력을 세 화질로 인코딩하는 FFmpeg를 팬 없는 맥북에서 1개부터 8개까지 동시에 돌려 speed와 조각 지연을 쟀고, 같은 개수에서도 회차마다 결과가 크게 흔들린 것을 그대로 적었습니다. 수신·인코딩·포장을 나누는 이유, 디코딩을 한 번만 하는 사다리, GPU 서버의 세션·엔진 한도, 채우는 배치와 흩는 배치, 멈춘 인코더 감지, 재시작 뒤의 끊김 표시, 관리형 서비스의 과금 단위를 공식 문서로 정리했습니다."
categories: ["tech-blurting"]
tags: ["라이브 트랜스코딩", "FFmpeg", "x264", "HLS", "NVENC", "Kubernetes"]
draft: false
---

라이브 트랜스코더 한 대에 채널을 몇 개 넣을지는 CPU 사용률이 아니라 각 인코더가 실시간 속도를 지키는지로 정합니다. FFmpeg의 `-progress`가 내는 `speed`가 1을 밑돌면 입력이 들어오는 속도보다 인코딩이 느린 것이고, 그 차이만큼 조각이 늦게 나옵니다. 1080p30 합성 입력을 1080p·720p·480p 세 화질로 x264 veryfast 인코딩하는 FFmpeg 프로세스를 팬 없는 MacBook Air(Apple M5)에서 1개부터 늘려 동시에 돌렸더니, 첫 회차는 3개까지 speed 1.01을 지켰고 4개에서 0.90, 6개에서 0.75, 8개에서 0.52로 내려갔습니다. 6개일 때 19번째 2초 조각은 실시간보다 14.2초 늦게 나왔습니다. 바로 이어 다시 재자 3개 0.98, 4개 0.70, 5개 0.52로, 같은 개수에서도 결과가 크게 달라졌습니다. 그래서 이 숫자는 「이 기계의 한계」가 아니라, 수용량은 목표 서버에서 지속 부하로 다시 재야 한다는 근거로만 씁니다.

## 수신·인코딩·포장은 묶는 자원이 달라 나눕니다 {#1-7층-마이크로서비스--라이브-트랜스코딩의-전체-그림}

라이브 트랜스코딩은 세 일로 나뉩니다. 수신은 송출 프로그램의 RTMP·SRT 연결을 받아 스트림을 꺼내고, 트랜스코딩은 그 스트림을 디코딩해 화질별로 다시 인코딩하고, 포장은 결과를 조각과 재생 목록으로 써서 원본 저장소와 CDN에 넘깁니다. [[fig-transcode-layers]]에서 화살표를 하나 지날 때마다 그 단계를 묶는 자원이 바뀝니다.

```mermaid {#fig-transcode-layers kind="개념도" caption="라이브 트랜스코딩의 세 계층과 각 계층을 묶는 자원. 수신은 연결 수와 네트워크, 트랜스코딩은 CPU · GPU 연산, 포장은 디스크 쓰기와 HTTP 요청이 먼저 찹니다. 계층을 나누면 각 계층을 다른 기종 · 다른 대수로 늘릴 수 있습니다." source="이 글의 설명을 그린 개념도"}
flowchart TB
  accTitle: 라이브 트랜스코딩의 세 계층
  accDescr: 송출 프로그램이 RTMP나 SRT로 보낸 스트림을 수신 계층이 받아 트랜스코딩 계층에 넘깁니다. 트랜스코딩 계층은 디코딩, 스케일, 인코딩으로 화질별 스트림을 만들고, 포장 계층이 조각과 재생 목록을 써서 원본 저장소와 CDN으로 보냅니다.
  A["송출 프로그램<br/>OBS 등"] -->|RTMP · SRT| B["수신<br/>연결 수 · 네트워크"]
  B --> C["트랜스코딩<br/>디코딩 · 스케일 · 인코딩<br/>CPU · GPU 연산"]
  C --> D["포장<br/>조각 · 재생 목록<br/>디스크 쓰기 · HTTP"]
  D --> E["원본 저장소 · CDN"]
```

수신 서버는 연결과 재접속을 다루지만 영상 자체는 거의 건드리지 않습니다. 트랜스코딩은 채널 수에 비례해 연산을 쓰고, 포장과 원본은 조각 수와 요청 수에 비례해 디스크와 네트워크를 씁니다. 묶는 자원이 다르니 한 기계에 몰아 두면 가장 먼저 차는 자원 하나가 나머지를 끌고 내려갑니다. 나누면 연산 계층만 늘리거나 GPU 기종으로 바꿀 수 있고, 대가로 계층 사이 전송과 타임스탬프·조각 길이 같은 경계 약속이 생깁니다. PokeClip은 수신 서버를 직접 짜지 않고 MediaMTX에 맡겼습니다([MediaMTX 채택 글](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/)).

수신 계층에서 자주 섞이는 설정 하나가 있습니다. nginx-rtmp의 `push`는 받은 스트림을 원격 서버로 내보내는 지시어라([nginx-rtmp-module 지시어 문서](https://github.com/arut/nginx-rtmp-module/wiki/Directives#push)), `push` 줄을 두 개 쓰면 두 곳에 같은 스트림을 복제해 보냅니다. 한쪽이 죽었을 때 다른 쪽으로 넘기는 장애 전환이 아니고, 끊긴 `push`는 `push_reconnect`(기본 3초) 뒤 다시 연결을 시도할 뿐입니다.

## 한 프로세스가 사다리 전체를 내면 디코딩과 스케일을 한 번만 합니다 {#6-트랜스코딩-클러스터--a10이-가성비-정점}

화질마다 FFmpeg를 따로 띄우면 같은 입력을 화질 수만큼 디코딩합니다. Twitch는 2017년 글에서 FFmpeg 인스턴스 N개로 N개 화질을 만들면 "디코더 N개, 스케일러 N개, 인코더 N개"가 생긴다고 쓰고, 똑같은 디코더 N−1개는 없애야 한다는 점을 자체 트랜스코더(TwitchTranscoder)를 만든 이유 가운데 하나로 들었습니다([Twitch, FFmpeg vs TwitchTranscoder Part I](https://blog.twitch.tv/en/2017/10/10/live-video-transmuxing-transcoding-f-fmpeg-vs-twitch-transcoder-part-i-489c1c125f28/)). 같은 글은 HLS가 화질 사이의 조각 경계를 IDR 프레임에서 맞추라고 요구하는데, 서로 독립인 인코더는 그 정렬을 보장하지 못한다는 점도 짚습니다.

FFmpeg 하나로도 디코딩을 한 번으로 줄일 수 있습니다. `split` 필터로 디코딩한 프레임을 갈래마다 나눠 스케일하고, 갈래마다 인코더를 붙입니다. 아래 「측정 조건」의 채널 명령이 그 형태이고, CPU 시간 차이는 [FFmpeg 글의 split 절](/posts/tech-blurting/ffmpeg-deep-dive/#9--filter_complex--멀티-입력출력)에 있습니다. 세 인코더에 같은 `-g 60 -sc_threshold 0`을 주면 같은 프레임에서 키프레임을 만듭니다. 이 측정의 1080p·720p·480p 출력은 20조각씩, 모두 `EXTINF:2.000000`이었고, 6번째 조각의 키프레임은 세 화질 모두 11.466667초 위치에 있었습니다.

## 서버 한 대에 넣을 채널 수는 speed가 1 아래로 떨어지기 직전까지입니다 {#4-인스턴스-가격-vs-처리량--gpu-선택의-진실}

FFmpeg `-progress`의 `speed`는 처리한 미디어 시간을 흐른 벽시계 시간으로 나눈 값입니다. 입력을 `-re`로 실시간 속도에 맞춰 읽으면 인코더가 따라가는 동안 speed는 1 근처에 머물고, 따라가지 못하면 1 아래로 내려가며 출력이 그만큼 밀립니다. 이 값은 시작부터의 누적이라 처음에는 낮게 나옵니다. 채널 하나만 돌린 실행도 처음 두 보고가 0과 0.49였고, 끝날 무렵에야 0.98을 넘었습니다. 그래서 판정은 실행 끝의 값으로 했습니다.

[[fig-speed-by-channels]]는 채널을 1개부터 8개까지 동시에 돌린 첫 회차와, 그 직후 3–6개를 다시 돌린 둘째 회차의 마지막 speed 평균입니다. 점선이 실시간 기준 1.0입니다.

{{< chart id="fig-speed-by-channels" kind="실측" caption="동시 채널 수별 FFmpeg -progress의 마지막 speed(채널들의 평균). 채널 하나는 1080p30 합성 입력을 -re로 읽어 1080p · 720p · 480p로 x264 veryfast 인코딩하는 FFmpeg 프로세스이고 40초 동안 돌렸습니다. 청록은 첫 회차(N=1–6, 8), 회색은 바로 이어 돈 둘째 회차(N=3–6)입니다. 세로축은 0.4부터 시작합니다. 팬 없는 MacBook Air(Apple M5), 다른 세션의 작업이 함께 돌던 상태라 회차마다 값이 흔들렸습니다." source="로컬 실측(2026-11-13), 아래 「측정 조건」" height="340px" >}}
{"grid":{"left":8,"right":24,"top":40,"bottom":8,"containLabel":true},"legend":{"top":0,"data":["첫 회차","둘째 회차"]},"xAxis":{"type":"category","name":"동시 채널 수","data":["1","2","3","4","5","6","8"]},"yAxis":{"type":"value","name":"speed","min":0.4,"max":1.1,"interval":0.1},"series":[{"name":"첫 회차","type":"line","symbolSize":10,"itemStyle":{"color":"#087f8b"},"lineStyle":{"color":"#087f8b","width":3},"label":{"show":true,"position":"top","formatter":"{c}"},"markLine":{"symbol":"none","silent":true,"lineStyle":{"color":"#172c40","type":"dashed","width":2},"label":{"show":false},"data":[{"yAxis":1}]},"data":[1.01,1.01,1.01,0.9,0.99,0.75,0.52]},{"name":"둘째 회차","type":"line","symbolSize":10,"itemStyle":{"color":"#7a8a9b"},"lineStyle":{"color":"#7a8a9b","width":3},"label":{"show":true,"position":"bottom","formatter":"{c}"},"data":[null,null,0.98,0.7,0.52,0.63,null]}]}
{{< /chart >}}

첫 회차만 보면 3개까지는 실시간을 지키고 4개부터 무너졌지만, 5개(0.99)가 4개(0.90)보다 나았고 둘째 회차에서는 4개가 0.70, 5개가 0.52까지 떨어졌습니다. 같은 기계, 같은 명령인데 몇 분 사이에 결과가 이만큼 다릅니다. 이 맥북은 팬이 없어 부하가 길어지면 클럭을 낮출 수 있고, 측정하는 동안 다른 세션의 프로세스가 CPU 4–5코어 분량을 쓰고 있었습니다. 온도와 클럭은 기록하지 않았으므로 어느 쪽이 얼마나 기여했는지는 모릅니다.

speed가 1을 밑돌 때 시청자에게 보이는 것은 조각이 늦게 나오는 일입니다. [[fig-speed-below-realtime]]은 첫 회차의 3개 실행과 6개 실행에서 채널 하나의 1080p 조각이 실제로 완성된 시각을 실시간 기준 시각(흐린 눈금) 위에 찍은 것입니다.

{{< motion scene="SpeedBelowRealtime" id="fig-speed-below-realtime" kind="실측" caption="첫 회차의 동시 3개 · 6개 실행에서 채널 하나의 1080p 2초 조각이 완성된 벽시계 시각. 흐린 눈금은 실시간이면 조각이 끝날 수 있는 가장 이른 시각(2k+2초)입니다. 3개일 때는 모든 조각이 그 눈금보다 약 0.5초 뒤에 나왔고, 6개일 때는 점점 밀려 19번째 조각이 14.2초 늦게 나왔습니다." >}}

3개일 때는 19개 조각이 모두 눈금보다 0.53–0.57초 뒤에 일정하게 나왔습니다. 6개일 때는 첫 조각부터 1.4초 늦었고 19번째에서는 14.2초가 늦었습니다. 8개에서는 같은 채널의 19번째 조각이 36.7초 밀렸습니다. 지연이 쌓이기만 하고 줄지 않으므로, speed가 1을 조금이라도 밑도는 상태로 방송이 길어지면 시청자의 지연도 끝없이 늘거나 플레이어가 목록 끝에서 멈춥니다. 수용량을 정할 때는 목표 서버에서, 실제 입력과 같은 사다리로, 수십 분 이상 지속 부하를 걸어 speed가 1 위에 머무는 최대 채널 수를 찾고 거기서 여유를 남겨야 합니다. 몇 분짜리 측정 한 번이나 다른 사람의 표는 출발점일 뿐입니다.

## GPU 서버는 인코더 세션과 엔진 수가 먼저 막힙니다 {#11-스케줄러-4종-알고리즘-비교}

CPU 서버는 speed 하나로 수용량을 재지만, GPU 서버에는 speed가 떨어지기 전에 걸리는 정해진 한도가 있습니다. NVENC는 GPU 칩 안의 전용 인코딩 엔진이라 GPU 개수가 아니라 엔진 수와 세대가 처리량을 정하고, GeForce 계열은 시스템 하나에 동시 인코딩 세션이 12개로 묶입니다. 화질 하나가 세션 하나이므로, 세 단계 사다리는 GeForce 서버에서 채널 4개(12 ÷ 3)가 한도입니다(계산값). T4와 A10은 모두 7세대 NVENC가 1개라 인코딩 엔진만 놓고 보면 같은 등급이고, L4는 8세대 엔진이 2개입니다(NVIDIA 지원 매트릭스, 2026-11-13 확인). 자세한 근거는 [NVENC 글](/posts/tech-blurting/nvenc-gpu-transcoding/)에 있습니다.

스케줄러도 이 한도를 알아야 합니다. Kubernetes에서 NVIDIA 장치 플러그인은 GPU를 `nvidia.com/gpu`라는 개수 자원으로 알립니다([NVIDIA k8s-device-plugin](https://github.com/NVIDIA/k8s-device-plugin)). 스케줄러가 보는 것은 GPU 몇 장이지 NVENC 세션 몇 개가 아니므로, 채널 하나가 GPU 한 장을 통째로 잡게 하거나, 노드마다 「남은 세션 · 엔진 여유」를 따로 세어 배치 판단에 넣어야 합니다.

## 빈 노드를 끄려면 채우는 배치를, 장애 반경을 줄이려면 흩는 배치를 고릅니다 {#12-bin-packing-vs-load-balancing--빈-노드-끄기}

채널을 새로 띄울 노드를 고르는 방식은 두 방향입니다. 채우는 배치는 이미 많이 쓰인 노드에 먼저 넣습니다. Kubernetes 스케줄러의 `NodeResourcesFit` 플러그인에서 `MostAllocated` 점수 방식이 이것이고, 문서는 이 방식이 "가장 덜 쓰인 노드를 줄일 준비를 돕는다"고 설명합니다([Resource Bin Packing](https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/)). 확장 자원에도 가중치를 줄 수 있어 GPU 자원을 무겁게 셀 수도 있습니다. 흩는 배치는 채널을 여러 노드·영역에 고르게 나눕니다. Pod 토폴로지 분산 제약이 이 방향의 도구입니다([Pod Topology Spread Constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)).

라이브 채널은 몇 시간씩 이어지는 긴 작업이라 이 선택의 대가가 분명합니다. 채우면 방송이 줄어드는 시간에 빈 노드를 끄기 쉽지만, 노드 하나가 죽을 때 한꺼번에 끊기는 채널이 많습니다. 흩으면 노드 하나의 장애가 끊는 채널 수는 줄지만 켜 둬야 할 노드가 늘어납니다. 방송 중인 채널을 다른 노드로 옮기면 인코더가 바뀌어 다음 절의 끊김 표시가 생기므로, 배치는 채널이 시작할 때 거의 결정됩니다.

## 출력이 멈춘 인코더는 조각 생성 시각으로 잡습니다 {#22-ffmpeg-좀비-감지}

프로세스가 살아 있다고 출력이 나오는 것은 아닙니다. 입력 연결이 걸려 있거나 출력 쓰기가 막히면 FFmpeg 프로세스는 남아 있어도 새 조각이 생기지 않습니다. 플레이어 쪽에서는 목록이 바뀌지 않는 것으로 보입니다. RFC 8216은 클라이언트가 목록을 다시 받았는데 바뀌지 않았으면 목표 길이의 절반을 기다린 뒤 다시 받으라고 정하므로([6.3.4절](https://www.rfc-editor.org/rfc/rfc8216#section-6.3.4)), 플레이어는 같은 목록을 계속 받으며 버퍼를 비워 갑니다.

그래서 감시 기준은 프로세스 존재가 아니라 「가장 최근 조각이 언제 완성됐나」입니다. 2초 조각이면 새 조각은 약 2초마다 생겨야 하고, 마지막 조각 이후 목표 길이의 몇 배가 지나도록 새 조각이 없으면 그 인코더는 멈춘 것입니다. 위 측정처럼 speed가 1을 조금 밑도는 상태는 조각 간격이 2초보다 조금씩 길어지는 모습으로 나타나므로, 같은 지표로 「멈춤」과 「밀림」을 함께 볼 수 있습니다. `-progress`의 `out_time`도 출력이 실제로 나갈 때만 늘어나므로 보조 지표로 쓸 수 있습니다.

## 입력이 다시 붙으면 목록에 끊김 표시가 들어갑니다 {#23-discontinuity-자동-처리}

인코더를 다시 띄우면 출력 타임스탬프가 처음부터 다시 시작합니다. RFC 8216은 타임스탬프 순서가 바뀌는 조각 앞에 `EXT-X-DISCONTINUITY`를 반드시(MUST) 달고, 인코딩 순서가 바뀔 때도 달라고(SHOULD) 정합니다([4.3.2.3절](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.2.3)). FFmpeg로 같은 목록에 이어 쓰는 실행을 두 번 하면 이 표시가 어떻게 들어가는지 볼 수 있습니다.

```bash
ffmpeg -f lavfi -i testsrc2=size=640x360:rate=30 -t 4 -c:v libx264 -preset veryfast -g 60 -sc_threshold 0 -f hls -hls_time 2 -hls_list_size 0 -hls_flags append_list+discont_start live.m3u8
```

이 명령을 같은 폴더에서 두 번 실행하자, 두 번째 실행의 첫 조각 `live2.ts` 앞에 `#EXT-X-DISCONTINUITY`가 붙었고 그 조각의 첫 영상 타임스탬프는 첫 실행의 첫 조각과 같은 1.466667초로 돌아가 있었습니다. 첫 실행이 정상 종료하며 쓴 `EXT-X-ENDLIST`는 이어 쓰기에서 지워지고 목록 끝에 다시 붙었습니다. `discont_start` 플래그 때문에 첫 실행의 목록 맨 앞에도 끊김 표시가 두 줄 들어갔으므로, 라이브 목록에 쓸 때는 이 플래그의 출력도 함께 확인해야 합니다. 라이브에서 인코더가 재시작했는데 이 표시가 빠지면, 플레이어는 앞 조각과 같은 시간축으로 읽다가 시각이 뒤로 가는 조각을 만나게 됩니다. 시간 구간 경계를 HLS와 DASH가 어떻게 표시하는지는 [DASH 글](/posts/tech-blurting/dash-vs-hls/)에 있습니다.

반대로 송출이 잠깐 끊겼다 같은 세션으로 다시 붙는 경우까지 늘 끊김 표시를 달아야 하는 것은 아닙니다. PokeClip은 같은 세션 안에서는 다음 조각을 앞 조각 끝에 이어 시간축을 유지하고 끊김 표시를 빼는 쪽을 골랐고, 그 대가로 경계의 영상 겹침을 받아들였습니다([재접속 끊김 표시 글](/posts/0-to-1/pokeclip-reconnect-audio-gap/)). 표시를 다느냐는 타임스탬프를 이어 줄 수 있느냐로 정해집니다.

## 관리형 서비스는 출력마다 과금하고 이중 파이프라인을 둡니다

직접 운영하지 않는 길도 있습니다. AWS Elemental MediaLive의 가격 페이지는 실행 중인 입력·출력·부가 기능에 시간당 요금을 매기고, 채널의 출력 요금은 생성한 모든 출력의 합이며, 출력 하나의 요금은 코덱·비트레이트·해상도·프레임 레이트로 정해진다고 적습니다([MediaLive 가격](https://aws.amazon.com/medialive/pricing/)). 사다리 단계를 하나 늘리면 그만큼 출력 요금이 붙는 구조입니다. 같은 페이지는 표준 채널이 서로 다른 가용 영역에서 처리 파이프라인 두 개를 돌리고, 단일 파이프라인 채널 두 개를 따로 돌리는 것보다 싸다고 설명합니다. 직접 운영할 때 이중화를 하려면 위 「흩는 배치」와 입력 이중화를 따로 설계해야 하는 부분을 서비스가 묶어 파는 셈입니다.

규모가 아주 크면 범용 CPU·GPU 대신 전용 칩을 만들기도 합니다. YouTube는 2021년 4월 영상 트랜스코딩 전용 칩과 이를 조율하는 소프트웨어 VCU(Video (trans)Coding Unit)를 공개하며, 이전의 최적화한 시스템보다 연산 효율이 최대 20–33배 좋아졌다고 밝혔습니다([YouTube 블로그](https://blog.youtube/inside-youtube/new-era-video-infrastructure/), [ASPLOS 2021 논문](https://research.google/pubs/warehouse-scale-video-acceleration-co-design-and-deployment-in-the-wild/)). YouTube가 자기 시스템과 비교한 값이고 조건이 다르므로 다른 서비스의 수치로 옮길 수는 없습니다.

## 수용량 숫자는 빌려 오지 말고 목표 서버에서 다시 잽니다 {#정리하면}

- 채널 수의 기준은 출력마다의 speed와 조각 완성 시각입니다. CPU·GPU 사용률은 원인을 찾을 때 봅니다.
- 같은 명령도 기계 상태에 따라 결과가 크게 달라졌습니다. 목표 서버에서 실제 입력·사다리로 오래 돌려 재고, 그 값에서 여유를 남깁니다.
- 한 채널의 사다리는 한 프로세스에서 디코딩을 나눠 쓰고, 같은 키프레임 옵션으로 화질 사이 조각 경계를 맞춥니다.
- GPU 서버는 GPU 장 수가 아니라 NVENC 엔진 수와 세션 한도로 계획합니다.
- 인코더를 다시 띄우면 끊김 표시가 필요하고, 같은 세션에서 시간축을 이어 줄 수 있을 때만 뺄 수 있습니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 02:34–02:45(KST)에 실행했습니다. 첫 회차는 N=1, 2, 3, 4, 5, 6, 8을 차례로, 둘째 회차는 그 직후 N=3, 4, 5, 6을 차례로 한 번씩 돌렸습니다.
- 기종: MacBook Air(Mac17,3, 팬 없음), Apple M5 10코어(고성능 4 · 효율 6), 메모리 32GB, macOS 27.0.1. FFmpeg 9.0.2(Homebrew), x264 core 165 r3222.
- 같은 기계에서 다른 세션의 작업(브라우저, 파일 감시, 다른 실험)이 함께 돌았습니다. 둘째 회차 시작 전과 끝에 FFmpeg가 아닌 프로세스의 CPU 사용률 합(`ps`의 %CPU 합)은 약 395%와 527%였습니다. 온도와 클럭은 기록하지 않았습니다.
- 채널 하나(N개를 동시에 띄움, 각 40초):

```bash
ffmpeg -nostdin -y -re -f lavfi -i testsrc2=size=1920x1080:rate=30 -t 40 -filter_complex "[0:v]split=3[a][b][c];[b]scale=1280:720[b2];[c]scale=854:480[c2]" -map "[a]" -map "[b2]" -map "[c2]" -c:v libx264 -preset veryfast -g 60 -sc_threshold 0 -b:v:0 6000k -b:v:1 3000k -b:v:2 1200k -f hls -hls_time 2 -hls_list_size 0 -var_stream_map "v:0 v:1 v:2" -hls_segment_filename "c1/v%v_%03d.ts" -progress c1/progress.txt "c1/v%v.m3u8"
```

- speed: 각 프로세스 `progress.txt`의 마지막 `speed=` 값의 채널 평균(채널 사이 차이는 최대 0.023). 조각 지연: 채널 1의 1080p 조각 k 파일의 수정 시각 − 채널 폴더 생성 시각 − (2k + 2)초. 마지막 20번째 조각은 짧은 끝 조각이라 뺐습니다.
- 끊김 표시: 같은 날 같은 기계에서 위 본문의 명령을 같은 폴더에서 두 번 실행하고 `live.m3u8`과 각 조각의 첫 영상 타임스탬프(`ffprobe -show_entries packet=pts_time`)를 확인했습니다.

## 출처

- [Twitch, Live Video Transmuxing/Transcoding: FFmpeg vs TwitchTranscoder, Part I](https://blog.twitch.tv/en/2017/10/10/live-video-transmuxing-transcoding-f-fmpeg-vs-twitch-transcoder-part-i-489c1c125f28/) (2017-10-10)
- [nginx-rtmp-module 지시어 문서 — push · push_reconnect](https://github.com/arut/nginx-rtmp-module/wiki/Directives#push)
- [RFC 8216: HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216) — 4.3.2.3 EXT-X-DISCONTINUITY, 6.3.4 목록 다시 받기
- [NVIDIA, NVENC Application Note (Video Codec SDK 13.1)](https://docs.nvidia.com/video-technologies/video-codec-sdk/13.1/nvenc-application-note/index.html) · [Video Encode and Decode GPU Support Matrix](https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new) (2026-11-13 확인)
- [NVIDIA k8s-device-plugin](https://github.com/NVIDIA/k8s-device-plugin)
- [Kubernetes, Resource Bin Packing](https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/) · [Pod Topology Spread Constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [AWS Elemental MediaLive 가격](https://aws.amazon.com/medialive/pricing/) (2026-11-13 확인)
- [YouTube, Reimagining video infrastructure to empower YouTube](https://blog.youtube/inside-youtube/new-era-video-infrastructure/) (2021-04-21) · [Google Research, Warehouse-Scale Video Acceleration: Co-design and Deployment in the Wild](https://research.google/pubs/warehouse-scale-video-acceleration-co-design-and-deployment-in-the-wild/) (ASPLOS 2021)
- [FFmpeg 형식 문서 — hls 먹서](https://ffmpeg.org/ffmpeg-formats.html#hls-2)
- PokeClip 기록: [MediaMTX 채택](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/) · [같은 세션 재접속의 끊김 표시](/posts/0-to-1/pokeclip-reconnect-audio-gap/)

다음 편: [373MB/s에서 6Mbps로 — 조건을 명시하고 이해하는 H.264 압축](/posts/tech-blurting/h264-deep-dive/)
