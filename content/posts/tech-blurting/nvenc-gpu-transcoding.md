---
title: "NVENC는 CUDA 코어와 따로 도는 전용 인코딩 엔진입니다"
date: 2026-06-22T02:22:28+09:00
lastmod: "2026-11-13T03:51:32+09:00"
description: "NVIDIA GPU의 H.264·HEVC·AV1 인코딩은 CUDA 코어가 아니라 칩 안의 전용 블록 NVENC가 맡고, 그 수와 세대는 GPU마다 다릅니다. 지원 매트릭스로 T4·A10·L4·A100·H100의 NVENC 수와 세션 한도를, NVENC 앱 노트 13.1로 엔진당 1080p H.264 처리량을 확인하고, FFmpeg 9.0.2 소스로 x264와 다른 옵션 체계, 9.0에서 사라진 cbr_hq·-2pass·-vsync, GPU 메모리 안에서 끝나는 디코딩·스케일·인코딩 경로, lookahead와 B 프레임의 지연, AV1 인코딩의 등장 순서, 인코더 사용률 지표를 정리했습니다."
categories: ["tech-blurting"]
tags: ["NVENC", "NVIDIA", "FFmpeg", "GPU 트랜스코딩", "H.264", "AV1"]
draft: false
---

GPU로 영상을 인코딩한다고 하면 수천 개의 CUDA 코어가 압축을 나눠 맡는 모습을 떠올리기 쉽습니다. NVIDIA GPU에서 H.264·HEVC·AV1 인코딩을 맡는 것은 그 코어가 아니라 칩 안의 전용 블록 NVENC이고, 이 블록의 수와 세대는 GPU 모델마다 다릅니다. NVIDIA 지원 매트릭스(2026-11-13 확인)에서 T4와 A10은 7세대 NVENC가 1개, L4는 8세대가 2개이고, A100과 H100에는 NVENC가 없습니다. NVENC 앱 노트의 1080p H.264 표에서 엔진 하나는 가장 빠른 P1·CBR·저지연 설정에서 Ada(RTX 4090) 기준 초당 910프레임, 가장 느린 P7에서 247프레임을 냅니다. 엔진이 빨라도 디코딩한 프레임이 시스템 메모리를 오가면 GPU에 둔 이점이 줄고, FFmpeg 9.0에서는 예전 예제에 흔한 `cbr_hq`·`-2pass`·`-vsync` 옵션이 사라졌습니다. 이 글의 성능 수치는 모두 NVIDIA 문서의 문헌값이며, NVIDIA GPU로 직접 잰 값은 없습니다.

## NVENC는 같은 칩 안의 전용 엔진이고 개수는 GPU마다 다릅니다 {#1-nvenc는-gpu의-별도-asic이다}

NVIDIA의 [NVENC 앱 노트(Video Codec SDK 13.1)](https://docs.nvidia.com/video-technologies/video-codec-sdk/13.1/nvenc-application-note/index.html)는 NVENC를 "GPU 실리콘 다이 위의 전용 블록(a dedicated block on GPU silicon die)"이라고 설명합니다. 움직임 추정, 모드 결정, 움직임 보상과 잔차 부호화, 엔트로피 부호화를 이 블록이 하드웨어로 처리합니다. 그래서 NVENC가 인코딩하는 동안 CUDA 코어는 스케일링 필터나 추론 같은 다른 일을 할 수 있고, 반대로 CUDA 코어가 많은 GPU라도 NVENC가 적으면 인코딩 처리량은 늘지 않습니다.

칩 하나에 NVENC가 여러 개 있으면 드라이버가 인코딩 세션을 엔진들에 나눠 줍니다. 앱 노트의 성능 표는 엔진 하나의 값이고, 엔진 수를 곱한 합계는 세션 여러 개를 동시에 돌릴 때만 성립합니다. 세션 하나는 분할 프레임 인코딩(Split Frame Encoding, SDK 12.0부터 Ada의 HEVC·AV1)을 켜지 않는 한 엔진 하나의 성능을 넘지 못합니다.

[[fig-nvenc-h264-fps]]는 앱 노트 13.1의 H.264 표에서 라이브 송출에 쓰는 CBR·저지연(LL) 줄만 옮긴 것입니다. 회색이 Turing, 청록이 Ada입니다.

{{< chart id="fig-nvenc-h264-fps" kind="문헌값" caption="NVENC 엔진 하나의 1080p H.264 인코딩 속도(초당 프레임), CBR · 저지연(LL) 튜닝. NVIDIA 표의 조건: 1920×1080 YUV 4:2:0 8비트, Turing은 RTX 8000, Ada는 RTX 4090, nvidia-smi가 보고한 최고 영상 클럭(각 1950 · 2415MHz), Windows 11, Video Codec SDK 13.1. 엔진 하나 기준이며 디코딩 · 스케일 · 메모리 복사는 들어 있지 않습니다." source="https://docs.nvidia.com/video-technologies/video-codec-sdk/13.1/nvenc-application-note/index.html" height="340px" >}}
{"grid":{"left":8,"right":56,"top":36,"bottom":8,"containLabel":true},"legend":{"top":0,"data":["Turing","Ada"]},"xAxis":{"type":"value","name":"fps","min":0},"yAxis":{"type":"category","inverse":true,"data":["P1","P3","P5","P7"]},"series":[{"name":"Turing","type":"bar","itemStyle":{"color":"#7a8a9b"},"label":{"show":true,"position":"right","formatter":"{c}"},"data":[855,600,271,229]},{"name":"Ada","type":"bar","itemStyle":{"color":"#087f8b"},"label":{"show":true,"position":"right","formatter":"{c}"},"data":[910,652,291,247]}]}
{{< /chart >}}

P1에서 P7로 가면 엔진당 처리량이 Ada 기준 910에서 247프레임으로 약 3.7분의 1이 되고, 세대 차이는 같은 프리셋에서 6–9%입니다. 1080p30 출력 하나는 초당 30프레임이므로 P1의 910프레임은 계산상 출력 30개분입니다. 다만 앱 노트의 값은 Turing 열을 RTX 8000, Ada 열을 RTX 4090으로 각각 최고 영상 클럭에서 잰 것이고 다른 GPU는 클럭에 거의 비례해 달라진다고 적었습니다. 서버 한 대의 수용량은 실제 사다리와 입력으로 지속 부하를 걸어 재야 합니다([라이브 트랜스코딩 인프라 글](/posts/tech-blurting/live-transcoding-infrastructure/)).

## A100·H100에는 NVENC가 없습니다 {#3-nvenc-세대--turing부터가-진짜}

NVIDIA의 [Video Encode and Decode GPU Support Matrix](https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new)에서 데이터센터 GPU와 GeForce 한 종을 골라 옮기면 아래와 같습니다(2026-11-13 확인). 「제한 없음」은 매트릭스의 「Unrestricted」입니다.

| GPU | 아키텍처 | NVENC 세대 | NVENC 수 | NVDEC 수 | AV1 인코딩 | 동시 인코딩 세션 |
|---|---|---|---|---|---|---|
| Tesla T4 | Turing | 7세대 | 1 | 2 | 아니오 | 제한 없음 |
| NVIDIA A10 | Ampere | 7세대 | 1 | 2 | 아니오 | 제한 없음 |
| NVIDIA L4 | Ada Lovelace | 8세대 | 2 | 4 | 예 | 제한 없음 |
| NVIDIA A100 | Ampere | 7세대(엔진 0개) | 0 | 5 | — | — |
| NVIDIA H100 PCIe | Hopper | N/A | 0 | 7 | — | — |
| GeForce RTX 4080 16GB | Ada Lovelace | 8세대 | 2 | 1 | 예 | 12 |

A100과 H100은 학습·추론용 계산 GPU라 NVDEC(디코딩 엔진)는 5개, 7개가 있지만 NVENC는 0개입니다. 매트릭스의 A100 행은 엔진이 0개인데도 NVENC 세대 칸에 「7th Gen」을 적었고, H100 PCIe 행은 「N/A」입니다. 이 GPU로 트랜스코딩하면 디코딩은 GPU에서 할 수 있어도 인코딩은 CPU나 다른 장치가 맡아야 합니다. 「GPU 서버니까 인코딩도 빠르다」는 가정은 모델 이름을 매트릭스에서 확인하기 전에는 세우지 않는 편이 안전합니다.

세대 이름도 아키텍처와 일대일이 아닙니다. Turing과 Ampere는 같은 7세대 NVENC를 쓰고, 같은 Turing이라도 GTX 1650·T1000 같은 일부 제품은 6세대입니다. Turing NVENC의 화질은 NVIDIA가 두 번 비교해 발표했습니다. 2018년 9월 [아키텍처 소개 글](https://developer.nvidia.com/blog/nvidia-turing-architecture-in-depth/)은 Twitch·YouTube에서 흔한 송출 설정에서 Turing 인코더가 x264의 fast 설정보다 화질이 높다고 했고, 2019년 2월 [T4 글](https://developer.nvidia.com/blog/turing-h264-video-encoding-speed-and-quality/)은 고화질 모드에서 libx264 medium(`-tune psnr`)과 같거나 약간 낫다고 했습니다. 두 글 모두 NVIDIA가 고른 조건이고, T4 글의 화질 지표는 PSNR뿐입니다(FFmpeg 4.0.2, libx264 스레드 4개 제한).

## GeForce는 동시 세션이 12개로 제한되고 데이터센터 GPU는 자원만큼입니다 {#20-nvenc-함정--라이브-운영에서-실제로-터지는-것}

앱 노트는 GPU를 「qualified」와 「non-qualified」로 나눕니다. qualified GPU의 동시 인코딩 세션은 인코더 용량·시스템 메모리·영상 메모리 같은 가용 자원이 정하고(limited by available system resources), GeForce 같은 non-qualified GPU는 **시스템 하나당** 12세션으로 묶입니다. 이 12는 카드마다가 아니라 시스템에 꽂힌 non-qualified 카드 전체의 합입니다. 매트릭스도 GeForce RTX 4080의 최대 세션을 12, T4·A10·L4를 「Unrestricted」로 적습니다.

라이브 사다리에서는 화질 하나가 세션 하나입니다. 1080p·720p·480p 세 단계를 GPU로 만들면 채널 하나가 세션 3개를 쓰므로, GeForce 서버는 엔진이 남아도 채널 4개(12 ÷ 3)에서 막힙니다(계산값). 데이터센터 GPU로 바꾸면 이 숫자 한도는 사라지지만, 엔진 처리량과 메모리가 다음 한도가 됩니다.

## x264 옵션 이름이 NVENC에서 그대로 통하지 않습니다 {#5-nvenc-옵션--x264-옵션과의-매핑}

FFmpeg의 `libx264`와 `h264_nvenc`는 같은 H.264를 만들지만 옵션은 각 인코더의 전용 옵션이라 이름과 뜻이 다릅니다. 아래는 [FFmpeg 9.0.2 `nvenc_h264.c`](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/nvenc_h264.c#L28-L160)의 옵션 정의로 맞춘 대응입니다.

| 하려는 일 | libx264 | h264_nvenc(FFmpeg 9.0.2) |
|---|---|---|
| 속도·화질 단계 | `-preset ultrafast` … `placebo` | `-preset p1` … `p7`(기본 p4) |
| 용도 조정 | `-tune zerolatency` 등 | `-tune hq`·`ll`·`ull`·`lossless`(기본 hq) |
| 품질 고정 | `-crf 23` | `-rc vbr -cq 23`(VBR 안의 품질 목표, 0이면 자동) |
| QP 고정 | `-qp 23` | `-rc constqp -qp 23` |
| 비트레이트 고정 | `-b:v`·`-maxrate`·`-bufsize` | `-rc cbr -b:v … -bufsize …` |
| 장면 전환 키프레임 끄기 | `-sc_threshold 0` | `-no-scenecut 1`(lookahead를 켤 때만 의미) |
| 재정렬 지연 없애기 | `-tune zerolatency`에 포함 | `-zerolatency 1` |

틀리기 쉬운 것은 이름이 같은 프리셋입니다. `h264_nvenc`에 남아 있는 옛 이름 `-preset fast`는 x264의 중간 단계가 아니라 가장 빠른 P1로, `medium`은 P4로, `slow`는 P7에 2패스를 더한 설정으로 바뀝니다([`nvenc.c` 219–221행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/nvenc.c#L219-L221)). 반대로 `-crf`처럼 `h264_nvenc`에 없는 옵션을 주면 FFmpeg 9.0.2는 "has not been used for any stream"이라는 경고 한 줄만 남기고 인코딩을 계속합니다. 이 동작은 NVENC가 없는 이 맥에서 `h264_videotoolbox`에 `-crf 23`을 줘서 확인했습니다. 경고를 놓치면 품질 설정 없이 기본 율 제어로 나간 결과를 보게 됩니다.

## p1–p7은 tune과 함께 정합니다 {#6-preset-p1p7--x264와-다른-체계}

NVENC의 설정 단위는 프리셋 하나가 아니라 「튜닝 정보 + 프리셋」 쌍입니다. [NVENC 프로그래밍 가이드](https://docs.nvidia.com/video-technologies/video-codec-sdk/13.0/nvenc-video-encoder-api-prog-guide/index.html)는 고화질·저지연·초저지연·무손실 네 가지 튜닝마다 P1(가장 빠름)부터 P7(가장 느림)까지 일곱 프리셋을 둡니다. 앱 노트의 성능 표가 「프리셋 · 율 제어 · 튜닝」 세 칸으로 줄을 나누는 것도 그래서입니다. 같은 P4라도 `-tune hq`와 `-tune ll`은 다른 설정입니다.

용도별 기준도 가이드에 있습니다. 클라우드 게임·스트리밍·화상 회의는 대역폭에 여유가 있으면 저지연 + CBR, 대역폭이 빡빡하면 초저지연 + CBR을 권합니다. 저지연과 초저지연 튜닝에서 P1–P4를 고르면 분할 프레임 인코딩이 저절로 켜진다고도 적혀 있는데, 조건이 붙습니다. 이 기능은 HEVC·AV1 전용이고, NVENC가 2개 이상인 GPU에서 프레임 높이가 HEVC는 2,112줄, AV1은 2,048줄 이상일 때만 켜집니다([프로그래밍 가이드 13.0 8.14절](https://docs.nvidia.com/video-technologies/video-codec-sdk/13.0/nvenc-video-encoder-api-prog-guide/index.html)). H.264에는 이 기능이 없습니다. FFmpeg에서는 `-tune ll` 또는 `-tune ull`에 `-rc cbr`을 함께 줍니다. 초고화질 튜닝 `uhq`는 FFmpeg 9.0.2에서 `hevc_nvenc`·`av1_nvenc`에만 있고 `h264_nvenc`에는 없습니다.

## FFmpeg 9.0에서 cbr_hq·2pass가 사라졌습니다 {#7-tune와-rc--라이브-모드-선택}

NVENC 라이브 예제에 오래 쓰인 `-rc cbr_hq`, `-rc cbr_ld_hq`, `-2pass 1`, `-cbr 1`은 FFmpeg 9.0에서 지워졌습니다. 2026년 6월 24일 커밋 두 개가 옛 율 제어 값 일곱 개(`vbr_minqp`·`ll_2pass_quality`·`ll_2pass_size`·`vbr_2pass`·`cbr_ld_hq`·`cbr_hq`·`vbr_hq`)와 `-cbr`·`-2pass` 옵션을 없앴고([dcf339c413](https://github.com/FFmpeg/FFmpeg/commit/dcf339c413e8bd21b5ceae710be97bf2bf5f82ab), [2b054bc9e6](https://github.com/FFmpeg/FFmpeg/commit/2b054bc9e660513ab2acfcdc97cb118874102e80)), 두 커밋은 n8.0과 n9.0 태그 사이에 있습니다. 9.0.2의 `-rc`에는 `constqp`·`vbr`·`cbr`만 남았습니다.

옛 값을 새 조합으로 옮기는 기준은 NVIDIA의 [프리셋 이전 안내](https://docs.nvidia.com/video-technologies/video-codec-sdk/13.0/nvenc-preset-migration-guide/index.html)에 있습니다. Turing·Ampere의 1080p H.264에서 옛 `LowLatencyHQ` 프리셋과 `CBR_LOWDELAY_HQ`는 저지연 튜닝 · CBR · 멀티패스 2 · P4로, `CBR_HQ`는 초저지연 튜닝 · CBR · 멀티패스 2 · P4로 옮기라고 합니다. 멀티패스 칸의 2를 API 열거형 값 `NV_ENC_TWO_PASS_FULL_RESOLUTION`(0x2)으로 읽으면 FFmpeg의 `-multipass fullres`입니다. 그래서 예전 `-preset llhq -rc cbr_ld_hq`는 9.0.2에서 대략 다음과 같습니다.

```bash
ffmpeg -i input.mp4 -c:v h264_nvenc -preset p4 -tune ll -rc cbr -multipass fullres -b:v 6M -bufsize 6M -g 60 -c:a copy output.mp4
```

NVENC의 멀티패스는 파일 전체를 두 번 도는 x264의 2-pass와 다릅니다. 가이드는 이를 「프레임마다 2패스」로 설명합니다. 첫 패스에서 프레임의 복잡도를 추정해 비트 배분을 정하고 둘째 패스에서 그 배분으로 인코딩하므로 라이브에도 쓸 수 있지만, 1패스보다 성능이 낮습니다. `qres`는 첫 패스를 4분의 1 해상도로 돌려 더 큰 움직임 벡터를 잡고, `fullres`는 더 정확한 통계를 냅니다.

## 디코딩부터 인코딩까지 GPU 메모리에 두려면 hwaccel 출력 형식과 scale_cuda가 필요합니다 {#8-nvenc-라이브-표준-명령}

`-hwaccel cuda`만 주면 NVDEC로 디코딩은 하지만, 디코딩한 프레임을 시스템 메모리로 내려받을 수 있습니다. FFmpeg 문서는 하드웨어 디코딩에서 "디코딩한 프레임을 GPU 메모리에서 시스템 메모리로 복사해야 하는 경우가 많아" 성능이 더 떨어진다고 적습니다([ffmpeg 문서의 `-hwaccel`](https://ffmpeg.org/ffmpeg.html#Advanced-Video-options)). 그 프레임을 CPU 필터 `scale`로 줄이고 NVENC에 넘기면, 프레임마다 GPU → CPU → GPU 복사가 한 번씩 들어갑니다. [[fig-gpu-memory-path]]의 앞 절반은 `-hwaccel_output_format cuda`로 프레임을 GPU 메모리에 둔 경로이고, 뒤 절반은 그 옵션이 없을 때의 경로입니다.

{{< motion scene="GpuMemoryPath" id="fig-gpu-memory-path" kind="개념도" caption="NVDEC가 디코딩한 프레임이 지나는 길. -hwaccel_output_format cuda를 주면 프레임이 GPU 메모리 안에서 scale_cuda를 거쳐 NVENC로 가고, 주지 않으면 시스템 메모리로 내려갔다가(CPU 스케일) 다시 GPU로 올라갑니다. 복사 시간 · 대역폭은 재지 않은 개념도입니다." >}}

[NVIDIA의 FFmpeg 안내(SDK 13.0)](https://docs.nvidia.com/video-technologies/video-codec-sdk/13.0/ffmpeg-with-nvidia-gpu/index.html)는 이 두 옵션이 "프레임을 GPU 메모리에 둔다"고 설명하고, 스케일도 GPU 필터로 하면 "시스템 메모리와 영상 메모리 사이 전송이 사라진다"고 적습니다. 안내의 1:1 스케일 예제를 FFmpeg 9.0.2에 맞추면 다음과 같습니다.

```bash
ffmpeg -hwaccel cuda -hwaccel_output_format cuda -i input.mp4 -vf scale_cuda=1280:720 -fps_mode passthrough -c:a copy -c:v h264_nvenc -b:v 5M output.mp4
```

안내의 원래 명령은 `-vsync 0`으로 시작하는데, FFmpeg 9.0에서 `-vsync`가 지워져([927ffd0930](https://github.com/FFmpeg/FFmpeg/commit/927ffd0930fa3f7a948d4ed30c67bd518f9549ce)) 그대로 실행하면 "Unrecognized option 'vsync'" 오류로 멈춥니다. 같은 뜻은 `-fps_mode passthrough`입니다. 다만 전역 옵션이던 `-vsync`와 달리 `-fps_mode`는 출력 옵션이라 `-i` 뒤, 출력 파일 앞에 둡니다. `-i` 앞에 두면 "cannot be applied to input url" 오류로 멈춥니다. 이 맥의 FFmpeg 9.0.2에서 위 명령이 옵션 해석을 모두 지나 `h264_nvenc` 인코더가 없다는 단계에서 멈추는 것까지는 확인했지만, NVIDIA GPU가 없어 끝까지 실행하지는 못했습니다. 예전 글에 흔하던 `-pix_fmt yuv420p`도 NVIDIA 안내의 GPU 경로 명령에는 없습니다. 출력 형식은 디코더가 정한 CUDA 표면을 그대로 넘기는 것이 이 경로의 전제입니다. 한 입력으로 여러 화질을 만들 때 디코딩을 한 번만 하는 방법은 [FFmpeg 글의 split 절](/posts/tech-blurting/ffmpeg-deep-dive/#9--filter_complex--멀티-입력출력)과 같고, 각 갈래의 스케일만 `scale_cuda`로 바꿉니다.

## lookahead와 B 프레임은 프레임 수만큼 지연을 더합니다 {#10-지연-vs-화질--옵션-조합의-트레이드오프}

lookahead는 인코더가 프레임 몇 장을 미리 받아 두고 복잡도를 본 뒤 비트를 나누는 기능입니다. 프로그래밍 가이드는 깊이를 최대 32로 두고, 그만큼 프레임이 인코더 안에 쌓이는 동안 인코딩 함수가 「입력이 더 필요하다」를 돌려준다고 적습니다. 쌓인 프레임 수가 곧 출력 지연이므로, 32프레임은 60fps에서 약 0.53초, 30fps에서 약 1.07초입니다(계산값). FFmpeg 안내는 lookahead를 「B 프레임 수 + 1」 이상으로, 10–20프레임을 화질에 좋은 값으로 권합니다.

B 프레임은 뒤 프레임을 참조하므로, 인코더는 B 프레임 다음의 P 프레임을 받은 뒤에야 B를 인코딩합니다. 연속 B가 3장이면 출력 순서를 맞추느라 적어도 3프레임(30fps에서 0.1초)이 더 늦어집니다(계산값). 그래서 FFmpeg 안내의 저지연 용도 설명은 B 프레임을 끄고 CBR과 아주 작은 VBV 버퍼를 쓰면 지연이 "16ms까지" 내려갈 수 있다고 하고, 지연을 견딜 수 있는 용도에서만 B 프레임·lookahead·VBR·큰 VBV 버퍼를 권합니다. 송출 쪽 권장값도 같은 방향입니다. OBS 32.0.0의 치지직 권장값은 B 프레임 0, 키프레임 1초입니다([services.json](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/rtmp-services/data/services.json#L2580-L2605)).

## AV1 인코딩은 Ada·L4부터이고 Intel Arc가 먼저였습니다 {#11-nvenc-h265--av1--차세대-코덱-실시간}

매트릭스에서 AV1 인코딩이 「예」인 NVIDIA 제품은 8세대 NVENC(Ada)부터입니다. 위 표의 T4·A10은 「아니오」, L4와 RTX 4080은 「예」입니다. NVIDIA의 첫 AV1 인코더를 단 RTX 4090은 [2022년 10월 12일](https://www.nvidia.com/en-us/geforce/news/geforce-rtx-4090-out-now/) 나왔습니다. 그보다 앞선 [2022년 6월 14일](https://download.intel.com/newsroom/archive/2025/de-de-2022-06-14-intel-arc-a380-graphics-available-in-china.pdf) Intel은 데스크톱 Arc A380의 중국 출시를 발표하며 Xe 미디어 엔진의 하드웨어 AV1 인코딩을 「industry-first」라고 소개했습니다. 같은 Intel이라도 13세대 코어(Raptor Lake) 내장 그래픽은 AV1을 디코딩만 하고 인코딩하지 않습니다. Intel 미디어 드라이버의 코덱 표에서 Raptor Lake가 속한 TGLx 열은 AV1이 「D」, Arc의 DG2 열은 「D/E」입니다([intel/media-driver](https://github.com/intel/media-driver/blob/master/README.md)).

AV1을 인코딩할 수 있어도 시청 플랫폼이 받는지는 따로 확인해야 합니다. Twitch는 [2024년 1월 8일](https://blog.twitch.tv/en/2024/01/08/introducing-the-enhanced-broadcasting-beta/) 송출자의 GPU 인코더로 여러 화질을 만들어 보내는 Enhanced Broadcasting을 비공개 베타로 열면서, AV1은 RTX 40 시리즈로 앞으로 가져올 일이라고 적었습니다. 맥에서 하드웨어 인코딩을 맡는 VideoToolbox 인코더(`h264_videotoolbox`·`hevc_videotoolbox`)는 macOS용 FFmpeg 빌드에만 있습니다. 이 글을 쓴 Apple M5 맥의 FFmpeg 9.0.2 인코더 목록에도 VideoToolbox는 H.264·HEVC·ProRes뿐이었습니다.

## 인코더 부하는 GPU 사용률이 아니라 인코더 사용률로 봅니다 {#22-모니터링--알람-우선순위}

[nvidia-smi 문서](https://docs.nvidia.com/deploy/nvidia-smi/)에서 GPU 사용률은 "표본 기간 동안 커널이 하나 이상 GPU에서 실행된 시간의 비율"이고, 인코더 사용률은 "GPU의 영상 인코더가 쓰인 시간의 비율"입니다. NVENC는 CUDA 커널이 아니므로, 인코딩만 하는 서버는 인코더가 거의 다 차 있어도 GPU 사용률이 낮게 나올 수 있습니다. 반대로 `scale_cuda` 같은 CUDA 필터를 많이 쓰면 GPU 사용률이 먼저 오릅니다.

자동 증설이나 알람의 기준은 인코더 사용률로 잡습니다. DCGM에서는 `DCGM_FI_DEV_ENC_UTIL`(필드 206)이 인코더 사용률이고, 현재 [DCGM 헤더](https://github.com/NVIDIA/DCGM/blob/master/dcgmlib/dcgm_fields.h)는 이 필드를 「Deprecated」로 표시하고 `DCGM_FI_DEV_ENC_UTIL_RATIO`를 쓰라고 합니다. [dcgm-exporter 기본 지표 목록](https://github.com/NVIDIA/dcgm-exporter/blob/main/etc/default-counters.csv)에도 `DCGM_FI_DEV_ENC_UTIL_RATIO`와 디코더용 `DCGM_FI_DEV_DEC_UTIL_RATIO`가 들어 있습니다. 다만 사용률은 「얼마나 오래 바빴나」만 말해 줍니다. 인코더 사용률이 높지 않은데 조각이 늦게 나오면 디코딩, 메모리 복사, CPU 쪽 포장을 의심해야 하고, 판정은 결국 각 출력이 실시간 속도를 지키는지로 내립니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 Apple M5 MacBook Air(macOS 27.0.1)의 FFmpeg 9.0.2(Homebrew)로 실행했습니다. NVIDIA GPU가 없어 NVENC 명령은 실행하지 않았습니다.
- `-vsync` 제거 확인: `ffmpeg -vsync 0 -f lavfi -i testsrc2 -t 1 -f null -` → "Unrecognized option 'vsync'." / `ffmpeg -f lavfi -i testsrc2 -t 1 -fps_mode passthrough -f null -` → 정상 종료 / `ffmpeg -fps_mode passthrough -i input.mp4 -c:v libx264 -f null -` → "cannot be applied to input url" 오류.
- 본문 GPU 경로 명령: 글의 명령 그대로(`ffmpeg -hwaccel cuda -hwaccel_output_format cuda -i input.mp4 -vf scale_cuda=1280:720 -fps_mode passthrough -c:a copy -c:v h264_nvenc -b:v 5M output.mp4`, 입력은 testsrc2로 만든 2초 mp4) → 옵션 해석은 통과하고 "Unknown encoder 'h264_nvenc'"에서 멈춤(이 빌드에 NVENC 없음). 같은 배치에서 `scale_cuda`·`h264_nvenc`만 `scale`·`libx264`로 바꾸면 종료 코드 0.
- 쓰이지 않은 옵션 확인: `ffmpeg -f lavfi -i testsrc2 -t 1 -c:v h264_videotoolbox -crf 23 -f null -` → "Codec AVOption crf (Constant Rate Factor value) has not been used for any stream." 경고 뒤 종료 코드 0.
- 인코더 목록: `ffmpeg -encoders`의 VideoToolbox 항목은 `h264_videotoolbox`·`hevc_videotoolbox`·`prores_videotoolbox`.
- NVENC 옵션은 FFmpeg 태그 n9.0.2의 `libavcodec/nvenc_h264.c`·`nvenc_hevc.c`·`nvenc_av1.c`·`nvenc.c` 원문으로 확인했습니다.

## 출처

- [NVIDIA, NVENC Application Note (Video Codec SDK 13.1)](https://docs.nvidia.com/video-technologies/video-codec-sdk/13.1/nvenc-application-note/index.html) — 전용 블록, 엔진당 성능 표와 측정 조건, 세션 한도
- [NVIDIA, Video Encode and Decode GPU Support Matrix](https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new) (2026-11-13 확인)
- [NVIDIA, NVENC Video Encoder API Programming Guide (SDK 13.0)](https://docs.nvidia.com/video-technologies/video-codec-sdk/13.0/nvenc-video-encoder-api-prog-guide/index.html) — 튜닝 정보 · 프리셋, 멀티패스, lookahead
- [NVIDIA, NVENC Preset Migration Guide (SDK 13.0)](https://docs.nvidia.com/video-technologies/video-codec-sdk/13.0/nvenc-preset-migration-guide/index.html)
- [NVIDIA, Using FFmpeg with NVIDIA GPU Hardware Acceleration (SDK 13.0)](https://docs.nvidia.com/video-technologies/video-codec-sdk/13.0/ffmpeg-with-nvidia-gpu/index.html)
- [nv-codec-headers `nvEncodeAPI.h`](https://github.com/FFmpeg/nv-codec-headers/blob/master/include/ffnvcodec/nvEncodeAPI.h) — `NV_ENC_MULTI_PASS` 값
- FFmpeg n9.0.2 소스: [`nvenc_h264.c`](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/nvenc_h264.c) · [`nvenc_hevc.c`](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/nvenc_hevc.c) · [`nvenc.c`](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/nvenc.c) · 커밋 [dcf339c413](https://github.com/FFmpeg/FFmpeg/commit/dcf339c413e8bd21b5ceae710be97bf2bf5f82ab) · [2b054bc9e6](https://github.com/FFmpeg/FFmpeg/commit/2b054bc9e660513ab2acfcdc97cb118874102e80) · [927ffd0930](https://github.com/FFmpeg/FFmpeg/commit/927ffd0930fa3f7a948d4ed30c67bd518f9549ce)
- [FFmpeg 문서 — Advanced Video options(`-hwaccel`)](https://ffmpeg.org/ffmpeg.html#Advanced-Video-options)
- [NVIDIA, NVIDIA Turing Architecture In-Depth](https://developer.nvidia.com/blog/nvidia-turing-architecture-in-depth/) (2018-09-14) · [Turing H.264 Video Encoding Speed and Quality](https://developer.nvidia.com/blog/turing-h264-video-encoding-speed-and-quality/) (2019-02-13)
- [NVIDIA, GeForce RTX 4090 Out Now](https://www.nvidia.com/en-us/geforce/news/geforce-rtx-4090-out-now/) (2022-10-12)
- [Intel, Intel Arc A380 Graphics Available in China](https://download.intel.com/newsroom/archive/2025/de-de-2022-06-14-intel-arc-a380-graphics-available-in-china.pdf) (2022-06-14)
- [intel/media-driver README](https://github.com/intel/media-driver/blob/master/README.md) — 플랫폼별 코덱 지원 표
- [Twitch, Introducing the Enhanced Broadcasting Beta](https://blog.twitch.tv/en/2024/01/08/introducing-the-enhanced-broadcasting-beta/) (2024-01-08)
- [OBS Studio 32.0.0 `services.json` 치지직 항목](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/rtmp-services/data/services.json#L2580-L2605)
- [NVIDIA, nvidia-smi 문서](https://docs.nvidia.com/deploy/nvidia-smi/) · [DCGM `dcgm_fields.h`](https://github.com/NVIDIA/DCGM/blob/master/dcgmlib/dcgm_fields.h) · [dcgm-exporter 기본 지표](https://github.com/NVIDIA/dcgm-exporter/blob/main/etc/default-counters.csv)

다음 편: [라이브 트랜스코딩 서버는 실시간 배속으로 수용량을 잽니다](/posts/tech-blurting/live-transcoding-infrastructure/)
