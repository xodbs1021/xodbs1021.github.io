---
title: "MediaMTX 훅 출력을 모으자 동시 종료에서 줄이 빠졌습니다"
date: "2026-10-15T11:40:52+09:00"
lastmod: "2026-11-13T21:00:00+09:00"
draft: false
author: "김태윤"
description: "MediaMTX 훅의 stdout·stderr를 서버 로그로 보내는 구현(포크 log-hook-output b78fbb54, 상류 PR #6380 head 7bd58e10)을 AI가 다시 쟀습니다. 50,000줄을 쓰는 훅 하나는 줄을 잃지 않았지만 16개가 함께 끝나면 41%를 잃었고, 가장 늦은 훅의 종료 기록은 2.6–2.7초 뒤에 남았습니다. 로거 재설정 중 보존은 다른 질문이라 따로 쟀습니다."
categories: ["open-source-analysis"]
tags: ["MediaMTX", "오픈소스 기여", "훅", "관측", "역압력", "벤치마크", "로컬 실험"]
portfolio_cases: [43]
portfolio_pages: [42, 43]
portfolio_edition: "2026-10-15-v2"
---

MediaMTX 훅의 stdout·stderr를 서버 로그로 보내는 기능을 포크 공개 브랜치 `log-hook-output`(`b78fbb54`)에서 시험했고, 지금은 같은 기능을 다시 쓴 [PR #6380](https://github.com/bluenviron/mediamtx/pull/6380)이 상류에 열려 있습니다. 2026년 11월 13일 두 구현을 같은 조건으로 다시 쟀습니다. 50,000줄을 쓰고 끝나는 훅 하나는 한 줄도 잃지 않았지만, 같은 훅 16개가 함께 끝나자 회차 중앙값으로 줄의 41%가 빠졌습니다(포크 41.12%, #6380 41.63%). 회차에서 가장 늦은 훅이 끝나고 `command exited`가 기록되기까지는 중앙값 2.6–2.7초가 걸렸습니다. 오류를 보려고 모은 출력이 종료 경로에서 기다림과 유실을 함께 만들었습니다.

범위와 검증 기준, 제출 결정은 제가 했고 구현과 실측은 AI(Claude Code·Codex)가 했습니다. 이 글의 재측정도 AI(Claude Code)가 실행했습니다.

## 출력을 로거로 보내면 명령의 끝이 로그 기록의 끝까지 늘어납니다 {#출력의-목적지를-바꾸면-완료-조건도-달라진다}

지금 MediaMTX는 훅을 띄울 때 `cmd.Stdout = os.Stdout`, `cmd.Stderr = os.Stderr`로 서버의 표준 출력을 그대로 물려줍니다. 그래서 `logDestinations: [file]`로 설정해도 훅이 쓴 실패 이유는 파일이 아니라 콘솔로 갑니다. #6380은 `logHookOutput: true`일 때 두 출력을 파이프 하나로 모아, 훅을 띄운 구성 요소의 로거로 한 줄씩 기록합니다([PR 본문](https://github.com/bluenviron/mediamtx/pull/6380)). 기본값은 꺼짐입니다.

목적지가 바뀌면 「명령이 끝났다」의 뜻도 바뀝니다. 파이프를 쓰면 Go의 `os/exec`가 고루틴 하나로 파이프를 읽어 로거에 넘기고, `cmd.Wait()`는 명령이 끝난 뒤에도 그 복사가 끝나야 돌아옵니다. 영원히 기다리지 않도록 두 구현 모두 [`WaitDelay`](https://pkg.go.dev/os/exec#Cmd.WaitDelay)를 1초로 둡니다. 명령이 끝나고 1초가 지나면 파이프를 닫고, 그때까지 읽지 못한 출력은 버립니다. 이미 시작한 로그 쓰기는 이 1초에 들어가지 않습니다. 로거에는 잠금이 하나뿐이라, 여러 훅의 출력과 서버의 다른 로그가 그 잠금을 차례로 기다립니다.

빨리 끝내려면 남은 줄을 버려야 하고, 남은 줄을 다 남기려면 느린 목적지만큼 종료가 늦어집니다. 이 두 비용이 실제로 얼마나 되는지 재야 했습니다.

## 훅 13곳 배선과 동시 종료 16개는 따로 시험했습니다 {#13종-훅과-동시-훅-16개는-다른-축이다}

훅을 만드는 13곳이 모두 출력을 로거로 넘기는지는 배선의 문제이고, 여러 훅이 한꺼번에 끝날 때 줄이 밀리는지는 부하의 문제입니다. 둘을 한 숫자로 묶지 않았습니다. 「훅이 8종쯤 있으니 8개를 띄운다」 같은 숫자는 부하 조건의 근거가 되지 못합니다. 동시 훅 수는 1·4·8·16으로 정했고, 16은 이 기계의 코어 10개를 넘는 값입니다. #6380 본문은 13곳 배선을 시험이 덮지 않는다고 밝히고 있고, 줄 나누기·`\r\n`·빈 줄·4096바이트 제한은 `TestCmdOutput`이 다룹니다.

경로 N개에 `runOnInit` 훅을 걸었습니다. 훅은 `a` 한 글자 줄을 50,000번 쓰고, 끝나기 직전의 시각을 나노초로 파일에 남긴 뒤 `exit 1`로 끝납니다. 서버 로그는 파일 하나에 JSON 형식으로 남기고, 경로마다 `a` 줄 수를 세 유실률을 구했습니다. 구현마다 N별 10회, 두 구현을 회차마다 번갈아 돌려 모두 80회입니다. 한 회차 안의 훅 16개를 독립된 16번의 실험으로 세지 않고, 회차의 유실률(빠진 줄 ÷ N×50,000)을 한 값으로 썼습니다.

[[fig-hook-output-loss]]에서 두 구현의 막대가 거의 같은 높이로 함께 자랍니다.

{{< chart id="fig-hook-output-loss" kind="실측" caption="동시에 끝나는 훅 수별 줄 유실률(회차 10회의 중앙값, %). 훅마다 50,000줄. 포크 b78fbb54(회색)와 #6380 head 7bd58e10(청록) 모두 훅 하나에서는 0%, 16개에서는 41%였습니다. 2026-11-13, MacBook Air(M5), 파일 로그." source="아래 「측정 조건」" height="360px" >}}
{
  "grid": {"left": 8, "right": 56, "top": 40, "bottom": 28, "containLabel": true},
  "legend": {"top": 0, "data": ["포크 b78fbb54", "#6380 7bd58e10"]},
  "xAxis": {"type": "value", "name": "유실 %", "min": 0, "max": 50, "interval": 10},
  "yAxis": {"type": "category", "inverse": true, "data": ["훅 1개", "훅 4개", "훅 8개", "훅 16개"]},
  "series": [
    {"name": "포크 b78fbb54", "type": "bar", "barWidth": 14, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}"}, "data": [0, 7.42, 25.25, 41.12]},
    {"name": "#6380 7bd58e10", "type": "bar", "barWidth": 14, "itemStyle": {"color": "#087f8b"}, "label": {"show": true, "position": "right", "formatter": "{c}"}, "data": [0, 9.68, 28.32, 41.63]}
  ]
}
{{< /chart >}}

훅 하나에서 0%를 확인했다고 동시 종료에서도 줄이 남는다고 볼 수는 없었습니다. 훅 4개부터 줄이 빠지기 시작했고(포크 7.42%, #6380 9.68%), 8개에서는 25–28%, 16개에서는 두 구현 모두 41%였습니다. 16개 조건에서는 160개 훅이 모두 줄을 잃었고, 훅 하나가 잃은 가장 많은 줄은 50,000줄 중 25,424줄이었습니다. 줄을 잃은 훅이 남긴 줄 수는 49,152 · 40,960 · 32,768 · 24,576줄 중 하나였습니다. 모두 8,192줄(2바이트 줄이므로 16KiB)의 배수라, 파이프에 남아 있던 양이 통째로 버려진 모양과 맞습니다. 커널 안을 들여다보지는 않았으므로 이것은 정황입니다.

## 회차마다 가장 늦은 훅의 로그 지연을 셌습니다 {#평균-대신-마지막-훅의-꼬리를-봤다}

대부분의 훅이 빨리 끝나도 마지막 훅 하나가 서버 종료와 다음 훅의 기록을 붙잡을 수 있습니다. 그래서 훅마다 「끝나기 직전에 남긴 시각」에서 「`command exited` 로그의 시각」까지를 재고, 회차에서 가장 긴 값을 골라 10회의 중앙값을 냈습니다. 모든 훅의 평균과는 다른 지표입니다.

[[fig-hook-output-tail]]의 점선이 `WaitDelay` 1초입니다. 훅 4개부터 꼬리가 이 선을 넘습니다.

{{< chart id="fig-hook-output-tail" kind="실측" caption="회차에서 가장 늦은 훅의 종료 직전 시각부터 command exited 기록까지(ms, 회차 10회의 중앙값). 점선은 두 구현의 WaitDelay 1초. 훅 하나는 0.19–0.23초, 16개는 2.6–2.7초였습니다. 2026-11-13, MacBook Air(M5), 파일 로그." source="아래 「측정 조건」" height="360px" >}}
{
  "grid": {"left": 8, "right": 56, "top": 40, "bottom": 28, "containLabel": true},
  "legend": {"top": 0, "data": ["포크 b78fbb54", "#6380 7bd58e10"]},
  "xAxis": {"type": "value", "name": "ms", "min": 0, "max": 3000, "interval": 1000},
  "yAxis": {"type": "category", "inverse": true, "data": ["훅 1개", "훅 4개", "훅 8개", "훅 16개"]},
  "series": [
    {"name": "포크 b78fbb54", "type": "bar", "barWidth": 14, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}"}, "data": [232, 1113, 1640, 2632],
     "markLine": {"symbol": "none", "silent": true, "lineStyle": {"color": "#b42318", "type": "dashed", "width": 1}, "label": {"formatter": "1초", "position": "start"}, "data": [{"xAxis": 1000}]}},
    {"name": "#6380 7bd58e10", "type": "bar", "barWidth": 14, "itemStyle": {"color": "#087f8b"}, "label": {"show": true, "position": "right", "formatter": "{c}"}, "data": [194, 1172, 1706, 2732]}
  ]
}
{{< /chart >}}

1초 제한이 있는데도 꼬리가 1초를 넘는 이유는 제한이 명령마다 따로 걸리기 때문입니다. 파이프를 닫은 뒤에도 이미 시작한 로그 쓰기는 끝나야 하고, `command exited` 줄도 같은 로거 잠금을 기다립니다. 16개 조건에서 포크의 한 회차는 7.8초까지 늘었습니다. 유실과 꼬리가 함께 커졌다는 점이 중요합니다. 더 많이 남기려고 더 오래 기다린 것이 아니라, 더 오래 기다리면서 더 많이 잃었습니다. 보존율만 보거나 종료 시간만 보면 한쪽 비용을 놓칩니다.

영상은 16개 조건의 숫자를 단순화해 그렸습니다. 훅이 함께 끝난 뒤 남은 출력이 잠금 하나를 지나 파일로 가고, 1초에 닿은 파이프의 나머지가 버려집니다.

{{< motion scene="HookOutputDrain" id="fig-hook-output-drain" kind="재구성" caption="훅 16개가 함께 끝나면 파이프마다 남은 출력이 로거의 잠금 하나를 차례로 지나 파일에 쓰입니다. 훅마다 1초가 지나면 파이프를 닫고 남은 출력을 버리며, 마지막 command exited 기록은 그 뒤에도 잠금을 기다립니다. 41%와 2.7초는 #6380 head의 16개 조건 실측 중앙값이고, 파이프 6개와 줄의 움직임은 단순화했습니다." >}}

## 로거 재설정 시험은 유실률 시험과 이어 붙일 수 없습니다 {#후속-리로드-시험은-다른-질문이었다}

훅이 출력을 쓰는 도중에 로그 설정이 바뀌면 그 줄이 사라지는지는 다른 질문입니다. 예전에는 이 질문을 포크의 로거 수명 수정 위에서 시험했습니다. 그 수정은 상류에 올린 [#6206](https://github.com/bluenviron/mediamtx/pull/6206)을 바탕으로 했고, #6206은 머지되지 않고 닫혔습니다. 유지보수자가 같은 문제를 [#6326](https://github.com/bluenviron/mediamtx/pull/6326)으로 다시 구현해 v1.21.3에 넣었습니다.

두 구조는 재설정 때 하는 일이 다릅니다. 포크(`b78fbb54`, v1.21.0 기준)는 로그 설정이 바뀌면 로거를 닫고 다시 만들며, 그 로거를 쓰는 경로 관리자도 함께 다시 만듭니다([`core.go` 1052–1064행](https://github.com/xodbs1021/mediamtx/blob/b78fbb54681e047b78eec98fcb0dbef9164ca4cc/internal/core/core.go#L1052-L1064)). 경로가 닫히면 그 경로의 훅도 멈췄다 다시 뜹니다. #6326 이후 상류는 로거를 그대로 둔 채 설정만 바꿉니다([v1.21.3 `core.go` 1048–1065행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/core/core.go#L1048-L1065)). 그래서 옛 시험 결과는 지금의 #6380에 옮겨 쓸 수 없고, #6380 head에서 다시 쟀습니다.

훅 하나가 번호를 붙인 1,000줄을 2ms 간격으로 쓰는 동안, 약 1초 뒤에 설정 파일의 `logFile`을 다른 파일로 바꿔 MediaMTX가 로거를 다시 설정하게 했습니다. 10회 모두 1,000줄이 옛 파일과 새 파일에 나뉘어 남았고(옛 파일 273–405줄, 나머지는 새 파일), 중복과 콘솔로 샌 줄은 0이었습니다. 훅은 재설정 중에도 멈추지 않았습니다.

이 결과는 「재설정 순간에 줄이 사라지지 않는다」는 뜻일 뿐입니다. 출력이 2ms 간격으로 천천히 나오는 훅 하나의 조건이라, 앞 절의 41% 유실이 재설정 구조를 바꿔서 0%가 된다는 뜻으로 이어 붙일 수 없습니다. 느린 목적지와 재설정이 겹치는 경우, 끝나지 않는 훅의 대기는 재지 않았습니다.

## 상류 #6380은 측정한 구현과 다른 코드입니다 {#상류에-연결하기-전에-다시-검증할-것}

포크 브랜치의 구현(9월 15일)과 #6380은 같은 기능이지만 같은 코드가 아닙니다. #6380은 10월 19일 열렸고, 10월 27일 커밋 하나([`7bd58e10`](https://github.com/bluenviron/mediamtx/pull/6380/commits/7bd58e10d26b728a004f9a46029b47f8bbeb683d))로 다시 썼습니다. 출력 처리 파일은 171줄에서 79줄이 됐습니다([포크 `output.go`](https://github.com/xodbs1021/mediamtx/blob/b78fbb54681e047b78eec98fcb0dbef9164ca4cc/internal/externalcmd/output.go), [#6380 `output.go`](https://github.com/bluenviron/mediamtx/blob/7bd58e10d26b728a004f9a46029b47f8bbeb683d/internal/externalcmd/output.go)).

| 항목 | 포크 `b78fbb54` | #6380 `7bd58e10` |
|---|---|---|
| 4096바이트 넘는 줄 | 나누되 UTF-8 문자 중간에서 자르지 않음 | 4096바이트에서 그대로 나눔 |
| 1초 안에 못 읽은 출력 | 버리고 Debug 로그로 알림(성공한 명령만) | 버림, 따로 알리지 않음 |
| 끝난 뒤 쓰기 막기 | 닫힘 표시와 잠금 | 없음 |
| `WaitDelay`, 파이프 하나로 합치기 | 1초, 합침 | 1초, 합침 |

UTF-8을 지키는 처리와 잘림 알림은 지금 PR에 없습니다. PR 본문은 `logStructured: true`에서 4096바이트를 넘는 줄이 여러 바이트 문자 중간에서 잘리면 올바른 JSON이 아닌 항목이 생길 수 있다고 밝힙니다. 두 구현의 유실률과 꼬리가 거의 같았으므로, 줄이 빠지는 원인은 빠진 부가 기능이 아니라 1초 제한과 로거 하나를 함께 쓰는 구조에 있습니다. PR 본문도 「목적지가 출력보다 느리면 정상 종료한 훅의 끝부분도 버려진다」고 적고 있습니다.

상류에 들어가기 전에 다시 볼 것은 셋입니다. 13곳 배선을 덮는 시험이 없습니다. syslog나 느린 디스크 같은 목적지는 재지 않았습니다. 파이프 버퍼가 64KiB인 리눅스에서는 버려지는 단위가 달라질 수 있습니다. #6380은 11월 13일 확인 기준 열려 있습니다.

훅 출력을 서버 로그로 모으려 한다면 단일 훅의 무손실보다 동시에 끝나는 훅 수에서의 유실률과 마지막 기록까지의 시간을 함께 재 보십시오. 모은 양과 그 양을 기다리느라 멈추는 곳은 같은 측정에서 함께 나옵니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 KST 18:49–18:54에 동시 종료 시험, 18:56–18:57에 재설정 시험을 실행했습니다. load average(1분)는 동시 종료 시험 동안 8.91–20.68이었습니다. 같은 기계에서 다른 세션의 작업이 함께 돌았고, 팬 없는 기종이라 지속 부하에서 클럭이 떨어질 수 있습니다. 두 구현을 회차마다 번갈아 돌려 이 영향이 한쪽에 몰리지 않게 했습니다.
- 기종: MacBook Air(Apple M5, 고성능 4·효율 6코어, 32GB, 팬 없음), macOS 27.0.1, APFS 내장 디스크.
- 빌드: Go 1.27.2 darwin/arm64. 포크 [`xodbs1021/mediamtx` `log-hook-output`](https://github.com/xodbs1021/mediamtx/tree/log-hook-output)의 `b78fbb54`(상류 `2c672790` + 커밋 3개, 버전 v1.21.0-3), #6380 head `7bd58e10`(상류 `065f94c2` + 커밋 1개, 버전 v1.21.3-2).
- 설정: `logDestinations: [file]`, `logStructured: yes`, `logHookOutput: yes`, 모든 서버(RTSP·RTMP·HLS·WebRTC·SRT·MoQ·API·metrics·pprof·playback) 끔. 경로 `p01`…`pNN`마다 `runOnInit: hook.sh 50000 <시각 파일>`.
- 훅: `yes a | head -n 50000` 뒤 C로 쓴 `nowns`(`clock_gettime(CLOCK_REALTIME)`, 이 기계에서는 마이크로초 단위)로 시각을 쓰고 `exit 1`. 서버 로그 시각도 마이크로초 단위였습니다.
- 회차: 서버 시작 → 모든 경로의 `runOnInit command exited`가 나타날 때까지 대기(최대 60초, 80회 모두 시간 안에 끝남) → 0.5초 뒤 SIGINT. N = 1, 4, 8, 16 × 10회 × 구현 2개 = 80회, 훅 580개.
- 지표: 유실률 = 회차의 빠진 `a` 줄 ÷ (N × 50,000). 꼬리 = 회차에서 가장 긴 (`command exited` 로그 시각 − 훅이 남긴 시각). 둘 다 회차 10회의 중앙값.
- 재설정 시험: #6380 head, 훅은 Perl 스크립트(`r 1`…`r 1000`, 2ms 간격). 명령 문자열의 `$`를 MediaMTX가 환경 변수로 풀기 때문에 한 줄 명령 대신 스크립트 파일을 썼습니다. 시작 1초 뒤 `cfg.yml`의 `logFile`만 바꿔 다시 쓰고, 4초 뒤 SIGINT. 두 로그 파일과 콘솔에서 번호를 셌습니다. 10회.

## 출처

- [bluenviron/mediamtx PR #6380 「hooks: route hook output to the server log」](https://github.com/bluenviron/mediamtx/pull/6380) — 1초 대기, 버려지는 출력, 13곳 배선 미시험, 2026-11-13 확인 기준 열림 · [head 7bd58e10](https://github.com/bluenviron/mediamtx/pull/6380/commits/7bd58e10d26b728a004f9a46029b47f8bbeb683d)
- [xodbs1021/mediamtx 커밋 b78fbb54 「route the output of hooks to the server log」](https://github.com/xodbs1021/mediamtx/commit/b78fbb54681e047b78eec98fcb0dbef9164ca4cc) — 측정한 포크 구현
- [Go `os/exec` `Cmd.WaitDelay`](https://pkg.go.dev/os/exec#Cmd.WaitDelay)
- [PR #6206](https://github.com/bluenviron/mediamtx/pull/6206) — 닫힘 · [PR #6326 「fix race condition during logger recreation」](https://github.com/bluenviron/mediamtx/pull/6326) — v1.21.3
- [이슈 #2034 「Prefix hook logs with path」](https://github.com/bluenviron/mediamtx/issues/2034)
- [안전하게 기다리려던 수정이 교착을 만들 수 있었다](/posts/open-source-analysis/mediamtx-logger-reload-rejected-lifecycle-fix/) — #6206 기록

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 42쪽](/portfolio/2026-10-15-v2/full.pdf#page=42)
