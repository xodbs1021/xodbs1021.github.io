---
title: "Opus는 신호와 비트레이트로 SILK와 CELT를 오갑니다"
date: 2026-06-20T15:25:34+09:00
lastmod: "2026-11-13T15:18:40+09:00"
description: "Opus는 음성용 SILK와 음악용 CELT를 한 코덱에 두고, 패킷마다 어느 쪽으로 부호화했는지를 첫 바이트에 적습니다. RFC 6716 · 7587 · 7845 · 7874와 Vectis 특허 풀, libopus 1.6.1의 모드 전환 · 지연 · 인밴드 FEC · DTX, 프레임 길이별 RTP 머리 비용, Chrome 157의 기본 SDP 제안, FFmpeg 9.0.2 libopus 옵션, webrtc-stats의 누적 카운터를 1차 문서와 Sintel 예고편 소리 실측으로 확인했습니다."
categories: ["tech-blurting"]
tags: ["Opus", "WebRTC", "SILK", "CELT", "FEC", "DTX", "SDP"]
draft: false
---

Opus는 한 코덱 안에 음성용 SILK와 음악용 CELT를 함께 두고, 패킷마다 어느 쪽으로 부호화했는지를 첫 바이트에 적습니다. Sintel 예고편 소리(51.9초)를 libopus 1.6.1로 인코딩해 패킷 2,597개의 첫 바이트를 읽자, 10kbps에서는 모두 SILK였고 64kbps에서는 모두 CELT였습니다. 32kbps(`-application voip`)에서는 한 파일 안에서 SILK, 하이브리드, CELT를 오갔고 CELT 패킷이 2,158개였습니다. 같은 설정에 인밴드 FEC를 켜고 예상 손실률 10%를 알려 주자 CELT 패킷이 0개가 됐습니다. 손실 복구 정보는 SILK 계층에만 실리고, libopus는 예상 손실률이 문턱을 넘을 때만 CELT를 버립니다. 이 소리에서는 5%까지 CELT가 거의 그대로였고 8%에서 107개, 9% 이상에서 0개였습니다. 실측은 모두 이 글을 쓰며 AI(Claude Code)가 FFmpeg 9.0.2와 Chrome 157로 잰 값입니다(아래 「측정 조건」).

## Opus는 2012년 RFC 6716이 됐고 2017년 RFC 8251로 고쳐졌습니다 {#1-opus의-출신--두-회사가-합쳐서-만든-이상한-표준}

Opus는 IETF 코덱 작업반이 2012년 9월 RFC 6716으로 낸 오디오 코덱입니다([RFC 6716](https://www.rfc-editor.org/rfc/rfc6716)). 두 계층으로 이뤄집니다. 선형 예측(LP) 계층은 Skype의 SILK에 바탕을 두지만, RFC는 Opus의 SILK가 원래 SILK와 크게 달라 서로 호환되지 않는다고 적습니다. MDCT 계층은 Xiph.Org의 CELT(Constrained-Energy Lapped Transform)에 바탕을 둡니다. 2017년 10월 RFC 8251은 RFC 6716의 참조 디코더를 고쳐 보안 · 음질 문제를 바로잡았습니다([RFC 8251](https://www.rfc-editor.org/rfc/rfc8251)).

참조 구현 libopus는 지금 1.6.1(2026-01-14)입니다([opus-codec.org 다운로드](https://opus-codec.org/downloads/)). 1.5(2024-03-04)는 기계 학습 기반의 패킷 손실 은폐와 DRED(Deep REDundancy)를 넣었는데, 이 기능들은 빌드할 때와 실행할 때 모두 켜야 동작합니다([Opus 1.5 소개](https://opus-codec.org/demo/opus-1.5/)). 비트스트림은 RFC 6716과 그대로 호환됩니다.

### 로열티 프리 선언 밖에서 2023년 하드웨어용 Opus 풀이 생겼습니다

Opus 라이선스 페이지는 Xiph.Org, Broadcom, Microsoft가 Opus 관련 특허를 로열티 없이 허락한다고 적습니다. 허락받은 쪽이 Opus 구현을 특허로 공격하면 허락이 끝나는 방어 조항이 붙어 있습니다([Opus License](https://opus-codec.org/license/)).

그 허락 밖의 특허권자도 있습니다. Vectis IP는 2023년 1월 16일 Fraunhofer와 Dolby를 중심으로 Opus 필수 특허 300건 이상(17개 패밀리)을 묶은 풀을 열었습니다. 대상은 하드웨어 기기이고, 단독 소프트웨어 · 앱 · 서비스 · 콘텐츠는 겨냥하지 않는다고 밝혔습니다. 요율은 대당 €0.15, 연간 상한 €15M이고, 초기 계약자는 대당 €0.10, 연간 상한 €10M입니다([Vectis IP 발표](https://www.vectis.com/media/vectis-ip-launches-patent-pool-for-the-opus-codec)). 풀에 든 특허가 Opus에 꼭 필요하다고 법원이 판정한 것은 아닙니다. AV1에서 AOMedia 허락과 Sisvel 풀이 함께 있는 구조와 같습니다([AV1 글](/posts/tech-blurting/av1-vp9-deep-dive/#15-sisvel--av1에-대한-라이센스-위협)).

## 패킷 첫 바이트의 구성 번호가 SILK·하이브리드·CELT를 가릅니다 {#2-silk--celt-결합--opus의-진짜-비밀}

RFC 6716 2장은 두 계층을 이렇게 나눕니다. SILK 계층은 음성에 맞춘 선형 예측 부호화로 협대역(NB, 4kHz)부터 광대역(WB, 8kHz)까지 담고, 프레임은 10–60ms, 잡음 성형을 위해 5ms를 미리 봅니다. CELT 계층은 변환 부호화로 NB부터 전대역(FB, 20kHz)까지 담고, 프레임은 2.5–20ms, 겹치는 MDCT 창 때문에 2.5ms를 미리 봅니다. 하이브리드 모드는 둘을 함께 써서 8kHz 아래는 SILK가, 위는 CELT가 부호화합니다. 하이브리드는 초광대역(SWB, 12kHz)과 FB에서 10 · 20ms 프레임만 씁니다.

Opus 패킷의 첫 바이트(TOC)는 위 5비트가 구성 번호, 그다음 1비트가 스테레오 여부, 마지막 2비트가 패킷 안의 프레임 수 부호입니다. 구성 번호 하나가 모드 · 대역 · 프레임 길이를 함께 정합니다.

| 구성 번호 | 모드 | 대역 | 프레임 길이 |
|---|---|---|---|
| 0–3 | SILK | NB | 10, 20, 40, 60ms |
| 4–7 | SILK | MB | 10, 20, 40, 60ms |
| 8–11 | SILK | WB | 10, 20, 40, 60ms |
| 12–13 | 하이브리드 | SWB | 10, 20ms |
| 14–15 | 하이브리드 | FB | 10, 20ms |
| 16–19 | CELT | NB | 2.5, 5, 10, 20ms |
| 20–23 | CELT | WB | 2.5, 5, 10, 20ms |
| 24–27 | CELT | SWB | 2.5, 5, 10, 20ms |
| 28–31 | CELT | FB | 2.5, 5, 10, 20ms |

표는 RFC 6716 3.1절 표 2입니다. 모드를 언제 바꿀지는 규격이 정하지 않고 인코더가 정합니다. Sintel 예고편 소리를 libopus로 비트레이트만 바꿔 인코딩하고 패킷마다 구성 번호를 읽었습니다. [[fig-opus-mode-share]]의 막대는 왼쪽부터 SILK, 하이브리드, CELT(청록) 순으로 쌓았습니다.

{{< chart id="fig-opus-mode-share" kind="실측" caption="비트레이트별 패킷 모드 비율(%). 10kbps는 모두 SILK-WB, 64kbps는 모두 CELT였고, 16–48kbps는 한 파일 안에서 세 모드가 섞였습니다. 앞쪽 약 3초의 조용한 도입부가 SILK로 부호화됐습니다. Sintel 예고편 소리 51.9초(패킷 2,597개), libopus 1.6.1, -application audio, 20ms 프레임." source="아래 「측정 조건」" height="320px" >}}
{
  "grid": {"left": 8, "right": 24, "top": 40, "bottom": 28, "containLabel": true},
  "legend": {"top": 0, "data": ["SILK", "하이브리드", "CELT"]},
  "xAxis": {"type": "value", "name": "%", "min": 0, "max": 100, "interval": 25},
  "yAxis": {"type": "category", "inverse": true, "data": ["10kbps", "16kbps", "24kbps", "32kbps", "48kbps", "64kbps"]},
  "series": [
    {"name": "SILK", "type": "bar", "stack": "m", "barWidth": 18, "itemStyle": {"color": "#7a8a9b"}, "data": [100, 5.9, 5.9, 5.9, 4.5, 0]},
    {"name": "하이브리드", "type": "bar", "stack": "m", "barWidth": 18, "itemStyle": {"color": "#172c40"}, "data": [0, 12.1, 11.0, 8.9, 0.3, 0]},
    {"name": "CELT", "type": "bar", "stack": "m", "barWidth": 18, "itemStyle": {"color": "#087f8b"}, "data": [0, 82.0, 83.1, 85.3, 95.1, 100]}
  ]
}
{{< /chart >}}

CELT 비율은 16kbps에서 82.0%, 32kbps에서 85.3%, 48kbps에서 95.1%였습니다. 같은 파일 안에서도 모드는 신호를 따라 바뀝니다. [[fig-opus-mode-strip]]의 위 줄은 32kbps(`-application voip`)로 인코딩한 패킷을 시간 순으로 칠한 것입니다. 조용한 도입부가 SILK, 이어지는 약 4초가 하이브리드이고, 7.27초에 처음 CELT로 바뀌고, 9.77초부터 대부분 CELT이며, 38초 부근에서 잠시 하이브리드로 돌아옵니다. 같은 32kbps라도 `-application audio`에서는 CELT 패킷이 2,214개였습니다. 아래 줄은 다음 절에서 다룰 FEC를 켜고 예상 손실률 10%를 준 같은 설정입니다.

{{< motion scene="OpusModeStrip" id="fig-opus-mode-strip" kind="재구성" caption="같은 Sintel 예고편 소리를 libopus 32kbps(-application voip)로 인코딩한 패킷의 모드. FEC가 없으면 SILK → 하이브리드 → CELT로 바뀌고(CELT 2,158개), FEC를 켜고 예상 손실률 10%를 준 -fec 1 -packet_loss 10에서는 CELT 없이 SILK와 하이브리드만 남습니다(손실률 5% 이하에서는 CELT가 거의 그대로). 구간 경계는 패킷 TOC로 읽은 실측값이고, 51.9초를 약 8초로 줄여 그렸습니다." >}}

## Opus 프레임은 2.5–60ms이고 기본 20ms입니다 {#3-aac-vs-opus--깊이-비교}

RFC 6716 2.1.4절은 프레임 길이를 2.5, 5, 10, 20, 40, 60ms로 두고, 여러 프레임을 묶어 한 패킷에 최대 120ms까지 담을 수 있게 합니다. 프레임을 길게 하면 초당 패킷 수가 줄어 머리 비용이 줄지만 지연과 손실 민감도가 커지고, 20ms를 넘으면 압축 이득이 작아진다는 이유로 20ms를 대부분의 용도에 권합니다. FFmpeg의 `libopus`도 `-frame_duration` 기본값이 20입니다. 10ms로 주자 패킷이 480표본, 60ms로 주자 2,880표본(48kHz)이 됐습니다.

AAC-LC는 48kHz에서 1,024표본(21.3ms) 프레임 하나로 고정입니다([AAC 글](/posts/tech-blurting/aac-and-friends/)). Opus의 FB는 오디오 대역 20kHz까지 담습니다. RFC는 표본 정리로는 표본률의 절반까지 가능하지만 사람 귀의 상한으로 보는 20kHz 위는 부호화하지 않는다고 적습니다.

### 기본 설정의 알고리즘 지연은 26.5ms입니다 {#지연-차이가-결정적}

알고리즘 지연은 네트워크를 빼고 인코더와 디코더가 구조적으로 만드는 지연입니다. 프레임 하나를 다 모아야 부호화를 시작하므로 프레임 길이가 들어가고, 인코더가 미리 보는 구간이 더해집니다. libopus 1.6.1은 미리 보는 구간을 Fs/400(2.5ms)에 지연 보정 Fs/250(4ms)을 더해 알려 주고([opus_encoder.c 313행](https://github.com/xiph/opus/blob/v1.6.1/src/opus_encoder.c#L313), [3082–3090행](https://github.com/xiph/opus/blob/v1.6.1/src/opus_encoder.c#L3082-L3090)), Ogg 머리의 앞 표본(pre-skip)도 312개, 48kHz에서 6.5ms였습니다. 그래서 기본 20ms 프레임이면 20 + 6.5 = 26.5ms입니다(계산값). RFC 6716이 적은 SILK의 미리 보기 5ms와 표본률 변환 최대 1.5ms의 합도 6.5ms이지만, libopus 코드가 이 합으로 정한 것은 아닙니다.

`-application lowdelay`는 SILK와 하이브리드를 쓰지 않고 CELT만 씁니다. 이때 pre-skip은 120개(2.5ms)였고, 2.5ms 프레임과 더하면 5ms로 RFC가 적은 하한과 같습니다. 대가는 음성에서의 효율입니다. 낮은 비트레이트 음성은 SILK가 맡는 구간인데, lowdelay에서는 24kbps에서도 CELT만 나왔습니다.

## 인밴드 FEC는 중요한 음성만 다음 패킷에 다시 싣습니다 {#4-fec--opus의-손실-복구-비밀}

RFC 6716 2.1.7절의 인밴드 FEC(Forward Error Correction)는 소리의 시작이나 급변처럼 지각상 중요한 음성 정보를 낮은 비트레이트로 다시 부호화해 다음 패킷에 덧붙입니다. 이 다시 부호화한 프레임은 LBRR(Low Bit-Rate Redundancy)이라 부르고, RFC 4.2.2절은 이를 「앞선 SILK 프레임을 낮은 비트레이트로 다시 부호화한 것」으로 정의합니다. 그래서 CELT만 쓰는 패킷에는 실을 자리가 없습니다. 앞 패킷이 사라지면 디코더는 다음 패킷의 LBRR로 그 구간을 대신 풉니다.

[[fig-opus-mode-strip]]의 두 줄이 이 차이입니다. FFmpeg에서 `-fec 1`만 주면 출력 패킷이 FEC를 끈 파일과 바이트 단위로 같았습니다. `libopus` 옵션 설명대로 예상 손실률(`-packet_loss`)이 0이 아니어야 인코더가 FEC를 씁니다([libopusenc.c 562–563행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/libopusenc.c#L562-L563)). FEC를 켜도 CELT를 바로 버리지는 않습니다. libopus 1.6.1은 FEC가 켜져 있고 예상 손실률이 `(128 − voice_est) >> 4`보다 클 때만 SILK 계열 모드로 바꿉니다([opus_encoder.c 1515–1518행](https://github.com/xiph/opus/blob/v1.6.1/src/opus_encoder.c#L1515-L1518)). `voice_est`는 인코더가 추정한 음성일 확률(Q7, 0–127)이라, 음악으로 판단한 구간(0에 가까움)에서는 문턱이 약 8%입니다. 손실률만 바꿔 같은 32kbps(voip)로 인코딩하자 CELT 패킷은 1%에서 2,155개, 3%에서 2,150개, 5%에서 2,132개로 FEC를 끈 2,158개와 거의 같았고, 8%에서 107개, 9%와 10%에서 0개였습니다. 10%에서 평균 비트레이트는 33.3에서 30.6kbps가 됐습니다. 음악 구간에서도 SILK가 낮은 대역을 맡는 하이브리드로 부호화하므로, 손실 복구를 얻는 대신 음악 음질이 달라질 수 있습니다. 그 차이는 재지 않았습니다. opus-tools의 `opusenc`에서 같은 손실률 힌트는 `--expect-loss`입니다([opusenc 설명서](https://opus-codec.org/docs/opus-tools/opusenc.html)).

LBRR은 현재 프레임 바로 앞 구간만 덮습니다(RFC 6716 4.2.5절). 연속 손실에는 libopus 1.5의 DRED가 최대 1초 분량의 중복 정보를 약 12–32kb/s로 싣는 방식을 제안했지만, 빌드 · 실행 양쪽에서 켜야 하고 FFmpeg 9.0.2의 `libopus` 래퍼에는 DRED 옵션이 없습니다.

## DTX는 침묵 중 400ms마다 한 프레임만 보냅니다 {#5-dtx--침묵-시-대역폭-절약}

DTX(Discontinuous Transmission)는 침묵이나 배경 잡음 구간에서 비트레이트를 줄입니다. RFC 6716 2.1.9절은 DTX가 켜지면 400ms마다 한 프레임만 부호화한다고 적습니다. 2초 소리, 4초 무음, 2초 소리로 된 시험 신호를 24kbps(voip)로 인코딩했습니다. DTX가 꺼져 있으면 무음 구간에서도 20ms마다 3바이트 패킷이 180개 나왔습니다. `-dtx 1`을 주자 그중 172개가 TOC 1바이트뿐인 패킷이 되고, 3바이트 패킷은 0.42초마다 하나씩 8개만 남았습니다. libopus 문서는 2바이트 이하 패킷을 보낼 필요가 없는 DTX 패킷으로 정하므로([opus.h 145행](https://github.com/xiph/opus/blob/v1.6.1/include/opus.h#L145)) RTP로 보낼 때는 빠지고, Ogg 파일에는 그대로 남습니다.

DTX는 기본으로 꺼져 있습니다. FFmpeg `libopus`의 `-dtx` 기본값은 false이고([libopusenc.c 569행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/libopusenc.c#L569)), RTP 규격에서도 받는 쪽이 `usedtx`를 적지 않으면 0입니다. RFC 7587은 대역이 모자라지 않으면 계속 보내는 쪽을 권합니다(3.1.3, RECOMMENDED, [RFC 7587](https://www.rfc-editor.org/rfc/rfc7587)).

### 편안한 잡음은 수신 쪽 손실 은폐가 만듭니다 {#comfort-noise--침묵의-진짜-의미}

DTX로 보내지 않은 구간은 받는 쪽 Opus 디코더의 손실 은폐가 편안한 잡음(comfort noise)으로 채웁니다. 받는 쪽은 RTP 순서 번호의 빈틈으로 DTX와 실제 손실을 구별합니다. RFC 7587은 RFC 3389의 별도 CN 패킷을 Opus와 함께 쓰는 것을 권하지 않고, WebRTC 오디오 규격 RFC 7874도 Opus에 RFC 3389 CN을 쓰는 것을 NOT RECOMMENDED로 둡니다. RFC 3389 CN은 자체 잡음 생성이 없는 G.711 같은 코덱을 위한 것입니다([RFC 7874](https://www.rfc-editor.org/rfc/rfc7874)).

## 프레임이 짧을수록 RTP 머리 비용이 커집니다 {#6-프레임-크기-트레이드오프}

RTP로 보내는 오디오 패킷마다 IPv4 머리 20바이트, UDP 8바이트, RTP 12바이트, 합쳐 40바이트가 붙습니다. 초당 패킷 수는 1,000 ÷ 프레임 길이(ms)이므로, 머리만으로 드는 비트레이트는 320비트 × 초당 패킷 수입니다. [[fig-rtp-overhead]]에서 20ms가 기본값입니다.

{{< chart id="fig-rtp-overhead" kind="재구성" caption="프레임 길이별 IPv4 · UDP · RTP 머리(40바이트)만의 비트레이트(kbps, 계산값). 20ms에서 16kbps, 2.5ms에서 128kbps입니다. SRTP 인증 태그, RTP 머리 확장, IPv6(머리 40바이트)는 넣지 않았습니다." source="RFC 791 · RFC 768 · RFC 3550의 머리 길이로 계산" height="320px" >}}
{
  "grid": {"left": 8, "right": 56, "top": 16, "bottom": 28, "containLabel": true},
  "xAxis": {"type": "value", "name": "kbps", "min": 0, "max": 140, "interval": 20},
  "yAxis": {"type": "category", "inverse": true, "data": ["2.5ms", "5ms", "10ms", "20ms", "40ms", "60ms"]},
  "series": [
    {"type": "bar", "barWidth": 16, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}"},
     "data": [128, 64, 32, {"value": 16, "itemStyle": {"color": "#087f8b"}}, 8, 5.3]}
  ]
}
{{< /chart >}}

32kbps 음성을 2.5ms 프레임으로 보내면 머리 비용이 내용의 네 배입니다. 반대로 60ms로 늘리면 머리 비용은 5.3kbps로 줄지만, 패킷 하나를 잃을 때 60ms가 통째로 빠지고 지연도 그만큼 늘어납니다. SRTP를 쓰면 인증 태그가 패킷마다 더 붙으므로 실제 비용은 이보다 큽니다.

### RTP 기본 패킷 길이는 20ms입니다 {#사용처별-권장}

RFC 7587은 받는 쪽이 선호하는 패킷 길이 `ptime`을 적지 않으면 20ms, 최대 길이 `maxptime`을 적지 않으면 120ms로 봅니다. 둘 다 받는 쪽의 선호를 알리는 값입니다. 같은 RFC 3.1.1절은 20ms 프레임 기준의 권장 비트레이트를 NB 음성 8–12, WB 음성 16–20, FB 음성 28–40, FB 모노 음악 48–64, FB 스테레오 음악 64–128kbps로 적습니다(문헌값).

## Chrome 157 기본 제안은 minptime=10과 useinbandfec=1뿐입니다 {#7-webrtc-sdp에서-opus-협상}

Chrome 157에서 오디오 트랜시버 하나로 `createOffer()`를 부르자 Opus 줄은 이렇게 나왔습니다.

```text
m=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8 13 110 126
a=rtpmap:111 opus/48000/2
a=fmtp:111 minptime=10;useinbandfec=1
a=rtpmap:63 red/48000/2
a=fmtp:63 111/111
```

`opus/48000/2`는 실제 표본률이나 채널 수가 아니라 규격이 정한 고정 표기입니다. RFC 7587은 rtpmap의 클록을 48000, 채널 수를 2로 쓰라고 합니다(MUST). `useinbandfec=1`은 받는 쪽이 FEC를 쓸 수 있다는 선호이고, `minptime`은 RFC 7587이 정의한 매개변수가 아닙니다. `usedtx`, `stereo`, `maxaveragebitrate`는 없었습니다. 함께 실린 `red/48000/2`는 같은 Opus 패킷을 여러 번 싣는 RED(RFC 2198) 형식이고, `111/111`은 Opus 페이로드를 두 겹 싣는다는 뜻입니다.

### maxaveragebitrate는 받는 쪽이 정하는 상한입니다 {#비트레이트-동적-조정}

RFC 7587에서 `maxaveragebitrate`는 받는 쪽의 한계를 알리는 값입니다. 보내는 쪽은 이 평균을 넘으면 안 되고(MUST NOT), 세션 중에 값이 바뀔 수 있으며, 6,000–510,000 밖의 값은 무시하라고 합니다. Chrome의 기본 제안에는 이 값이 없으므로, 송신 비트레이트는 브라우저의 혼잡 제어가 정합니다. 같은 Chrome 안에서 두 연결을 이어 사인파를 보내자, 받는 쪽 통계로 계산한 비트레이트는 약 32.6kbps였습니다.

## 서비스의 Opus 사용은 공개 문서로만 씁니다 {#8-실전-사용처--어디서-opus를-만나나}

WebRTC 단말은 Opus를 반드시 구현해야 하므로(RFC 7874), 브라우저 음성 · 화상 통화는 Opus를 받습니다. 서비스가 직접 밝힌 예로 Discord 개발자 문서는 음성 데이터를 Opus, 2채널, 48kHz로 인코딩해 RTP 머리와 함께 보내라고 하고, 전송을 멈출 때는 다음 전송과 보간되지 않도록 침묵 프레임 `0xF8, 0xFF, 0xFE`를 다섯 번 보내라고 적습니다([Discord Voice Connections](https://docs.discord.com/developers/topics/voice-connections)). 첫 바이트 `0xF8`은 구성 번호 31(CELT FB 20ms), 모노, 한 프레임을 뜻합니다.

브라우저 재생은 caniuse(2026-11-13 확인) 기준 Chrome 33, Firefox 15부터 Opus를 읽고, Safari는 11부터 CAF 그릇에서만, 17.4부터 WebM에서 부분 지원하고 18.4부터는 macOS 15.4 이상을 요구하는 부분 지원이며, iOS Safari는 18.4부터 지원합니다(11–18.3은 부분)([caniuse Opus](https://caniuse.com/opus)).

## FFmpeg 9.0.2 libopus는 FEC와 DTX를 기본으로 끕니다 {#9-opus-ffmpeg-명령}

FFmpeg의 `libopus`는 외부 라이브러리 libopus를 부르는 인코더이고(`--enable-libopus`), FFmpeg 자체의 `opus` 인코더는 실험 기능이라 `-strict -2` 없이 부르면 「The encoder 'opus' is experimental」로 멈췄습니다. `ffmpeg -h encoder=libopus`의 기본값은 `-application audio`, `-frame_duration 20`, `-packet_loss 0`, `-fec false`, `-dtx false`, `-vbr on`입니다. 아래 명령은 모두 9.0.2에서 실행했습니다.

```bash
# 음악 · 일반: Ogg Opus 파일(.opus)
ffmpeg -i in.wav -c:a libopus -b:a 64k out.opus
# 음성 + 손실 대비: FEC는 예상 손실률과 함께
ffmpeg -i in.wav -c:a libopus -b:a 32k -application voip -fec 1 -packet_loss 10 out.opus
# 지연 우선: CELT만, 10ms 프레임
ffmpeg -i in.wav -c:a libopus -b:a 64k -application lowdelay -frame_duration 10 out.opus
```

## Opus 파일의 기본 그릇은 Ogg입니다 {#10-webm-컨테이너--opus의-표준-그릇}

Opus의 파일 그릇은 2016년 4월 RFC 7845가 정한 Ogg입니다. 권장 MIME 형식은 `audio/ogg`, 권장 확장자는 `.opus`이고, ID 머리의 `pre-skip` 칸에 디코더가 버릴 앞 표본 수를 적습니다([RFC 7845](https://www.rfc-editor.org/rfc/rfc7845)). FFmpeg는 `.opus` 출력을 Ogg로 썼습니다.

WebM(Matroska)과 fMP4에도 Opus를 담을 수 있습니다. FFmpeg 9.0.2의 HLS 먹서는 fMP4 조각에 담은 Opus에 `CODECS="opus"`를 적었고([codecstring.c 43행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/codecstring.c#L43)), Chrome 157의 `isTypeSupported()`는 `audio/mp4; codecs="opus"`와 `audio/webm; codecs="opus"`에 모두 true였습니다.

## HLS 시청 쪽에서는 AAC로 다시 인코딩하는 경우가 많습니다 {#11-opus--aac-변환-실무}

WHIP처럼 브라우저에서 WebRTC로 받은 소리는 Opus이고([WHIP · WHEP 글](/posts/tech-blurting/whip-whep-modern-ingest/)), 애플 기기용 HLS는 스테레오 AAC를 반드시 넣어야 합니다(2.3, MUST, [Apple HLS Authoring Specification](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html)). 그래서 받은 Opus를 HLS로 내보낼 때는 영상은 그대로 두고 소리만 AAC로 다시 인코딩하는 구성이 흔합니다.

```bash
ffmpeg -i in.webm -c:v copy -c:a aac -b:a 128k -ar 48000 -f hls -hls_segment_type fmp4 out.m3u8
```

손실 압축을 두 번 거치므로 음질이 한 번 더 깎입니다. 두 코덱 모두 48kHz를 쓰면 표본률 변환은 피할 수 있습니다.

## packetsLost는 누적값이라 구간 차이로 봅니다 {#13-opus-모니터링--webrtc-stats-api}

W3C webrtc-stats(2025-09-25 CRD)에서 받는 쪽 오디오 통계(`inbound-rtp`)의 `packetsLost`와 `bytesReceived`는 연결 시작부터의 누적값입니다. `packetsLost`는 RFC 3550 방식으로 추정해 음수가 될 수도 있습니다. `concealedSamples`는 손실 은폐로 만든 표본 수, `fecPacketsReceived`는 받은 FEC 패킷 수이고 Opus처럼 인밴드 FEC도 여기에 셀 수 있다고 적습니다([webrtc-stats](https://www.w3.org/TR/webrtc-stats/)). 비트레이트와 손실률은 두 시점의 차이로 계산합니다.

```js
async function audioInbound(pc) {
  const report = await pc.getStats();
  for (const s of report.values()) {
    if (s.type === 'inbound-rtp' && s.kind === 'audio') {
      const codec = report.get(s.codecId);           // codecId는 다른 통계의 id
      return { t: s.timestamp, bytes: s.bytesReceived, lost: s.packetsLost,
               recv: s.packetsReceived, concealed: s.concealedSamples,
               fec: s.fecPacketsReceived, mime: codec?.mimeType };
    }
  }
}
const a = await audioInbound(pc); /* 2초 뒤 */ const b = await audioInbound(pc);
const kbps = (b.bytes - a.bytes) * 8 / (b.t - a.t); // timestamp는 ms
const lost = b.lost - a.lost;
const lossRate = lost / (lost + (b.recv - a.recv));
```

이 코드를 Chrome 157의 두 연결 사이에서 돌리자 `mime`은 `audio/opus`, 비트레이트는 32.6kbps, 손실은 0이었습니다. 손실률을 몇 %부터 문제로 볼지는 서비스와 FEC 설정에 따라 다르므로 정하지 않았습니다.

## 라이브 시청 Opus는 Apple 규격 목록에 없습니다 {#14-opus의-미래--라이브-스트리밍-진입}

애플 HLS 저작 규격의 코덱 표와 오디오 코덱 목록에는 Opus가 없습니다. 브라우저 쪽은 fMP4의 Opus를 MSE로 받을 수 있고, 송출 쪽은 Enhanced RTMP v2가 Opus를 실을 칸을 더했습니다([RTMP 글](/posts/tech-blurting/rtmp-still-alive/#audio-message에-트랙-id가-없다--멀티-오디오-불가의-진짜-이유)). 그래도 애플 기기까지 보내는 라이브 HLS라면 AAC 변형이 있어야 합니다. Opus만으로 보내려면 시청 기기 목록이 Opus를 받는지부터 확인해야 합니다.

## Opus는 모드 · FEC · DTX를 받는 쪽과 함께 정합니다 {#정리하면}

- 비트레이트와 신호가 모드를 정합니다. 음악 위주 소리는 32kbps에서도 대부분 CELT였습니다.
- 인밴드 FEC는 SILK 계층의 기능입니다. libopus는 예상 손실률이 문턱을 넘어야 CELT 대신 하이브리드로 부호화하고, 그 아래에서는 CELT 패킷이 FEC 없이 나갑니다.
- DTX와 FEC는 FFmpeg와 RTP 규격 모두 기본값이 꺼짐입니다. 받는 쪽 SDP(`useinbandfec`, `usedtx`)와 함께 정합니다.
- 짧은 프레임은 지연을 줄이는 대신 머리 비용을 키웁니다. 20ms에서 IPv4 · UDP · RTP 머리만 16kbps입니다.
- 애플 기기용 HLS에는 AAC 변형이 필요합니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 14:20–14:50(KST)에 실행했습니다. 모드 · 패킷 길이 · pre-skip · 패킷 크기는 시간이 결과에 들어가지 않는 값이고, `-fec 1`만 준 파일과 FEC를 끈 파일은 Ogg 스트림 일련번호만 다르고 패킷 내용이 바이트 단위로 같았습니다.
- 기종: MacBook Air(Mac17,3, Apple M5, 고성능 4 · 효율 6코어, 32GB, 팬 없음), macOS 27.0.1. 1분 load average는 측정 중 4.6–10.1이었습니다(다른 세션의 작업 포함).
- 도구: FFmpeg 9.0.2(Homebrew 9.0.2_1), libopus 1.6.1, Google Chrome 157.0.8103.51(헤드리스, Playwright).
- 입력: [Sintel 예고편](https://durian.blender.org/sharing/) 1080p의 소리(© copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)), https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4 (sha256 `34bbd52a4b89fdf63c8ace50b268da26653a59508288100cd3c23de276db7931`). 원본 소리는 AAC-LC 48kHz 스테레오 약 127kbps이고, 전체 51.9초를 PCM으로 풀어 썼습니다. 음악과 효과음이 대부분이라 음성 위주 소리에서는 모드 비율이 다를 수 있습니다.
- 인코딩: `ffmpeg -i sintel.wav -c:a libopus -b:a <10k|16k|24k|32k|48k|64k>`(기본 `-application audio`), 영상의 두 줄은 `-b:a 32k -application voip`와 거기에 `-fec 1 -packet_loss 10`을 더한 것입니다. FEC 문턱은 같은 32kbps voip에 `-fec 1 -packet_loss <0|1|3|5|8|9|10>`을 주어 다시 쟀습니다(2026-11-13 15:10–15:13 KST, 같은 기계, load average 약 3.1). 모드는 `ffprobe -show_packets -show_data`로 각 패킷 첫 바이트의 위 5비트를 읽어 RFC 6716 표 2로 바꿨습니다. pre-skip은 `ffprobe`의 `initial_padding`입니다.
- DTX: `ffmpeg -f lavfi -i "aevalsrc='if(between(t,2,6),0,0.3*sin(2*PI*300*t)*(0.6+0.4*sin(2*PI*3*t)))':s=48000:d=8" -ac 1 burst.wav`를 `-c:a libopus -b:a 24k -application voip -dtx <0|1>`로 인코딩하고, 2.2–5.8초 구간의 패킷 크기를 셌습니다.
- 브라우저: Chrome 157에서 `new RTCPeerConnection()`에 `addTransceiver('audio')`를 하고 `createOffer()`의 SDP를 읽었습니다. 통계는 같은 페이지의 두 연결 사이에 오실레이터 소리를 보내고 3초 · 5초 시점의 `getStats()` 차이로 계산했습니다.

## 출처

- IETF: [RFC 6716](https://www.rfc-editor.org/rfc/rfc6716) (Opus, 2012-09) · [RFC 8251](https://www.rfc-editor.org/rfc/rfc8251) (2017-10) · [RFC 7587](https://www.rfc-editor.org/rfc/rfc7587) (RTP 페이로드, 2015-06) · [RFC 7845](https://www.rfc-editor.org/rfc/rfc7845) (Ogg Opus, 2016-04) · [RFC 7874](https://www.rfc-editor.org/rfc/rfc7874) (WebRTC 오디오, 2016-05) · [RFC 3389](https://www.rfc-editor.org/rfc/rfc3389) (CN) · [RFC 2198](https://www.rfc-editor.org/rfc/rfc2198) (RED) · [RFC 3550](https://www.rfc-editor.org/rfc/rfc3550) (RTP) · [RFC 768](https://www.rfc-editor.org/rfc/rfc768) (UDP) · [RFC 791](https://www.rfc-editor.org/rfc/rfc791) (IPv4)
- Opus: [다운로드 · 릴리스](https://opus-codec.org/downloads/) · [Opus 1.5 소개](https://opus-codec.org/demo/opus-1.5/) · [License](https://opus-codec.org/license/) · [opusenc 설명서](https://opus-codec.org/docs/opus-tools/opusenc.html)
- [Vectis IP, Vectis IP Launches Patent Pool for the Opus Codec](https://www.vectis.com/media/vectis-ip-launches-patent-pool-for-the-opus-codec) (2023-01-16)
- libopus v1.6.1 소스: [opus_encoder.c](https://github.com/xiph/opus/blob/v1.6.1/src/opus_encoder.c#L1515-L1518) · [opus.h](https://github.com/xiph/opus/blob/v1.6.1/include/opus.h#L145)
- FFmpeg n9.0.2 소스: [libopusenc.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/libopusenc.c#L562-L569) · [codecstring.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/codecstring.c#L43)
- [W3C, Identifiers for WebRTC's Statistics API](https://www.w3.org/TR/webrtc-stats/) (Candidate Recommendation Draft, 2025-09-25)
- [Discord Developer Documentation, Voice Connections](https://docs.discord.com/developers/topics/voice-connections)
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) (개정 2025-06-26) — 2.2, 2.3, 부록 코덱 문자열
- [caniuse, Opus audio format](https://caniuse.com/opus) · [같은 데이터 opus.json](https://github.com/Fyrd/caniuse/blob/main/features-json/opus.json) (2026-11-13 확인, caniuse.com은 자동 접속을 막아 같은 데이터 파일로 확인)
- [Sintel](https://durian.blender.org/sharing/) — 시험 소리, © copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)

다음 편: [재생 실패는 CODECS 선언과 실제 트랙을 대조해 좁힙니다](/posts/tech-blurting/codec-decision-and-debugging/)
