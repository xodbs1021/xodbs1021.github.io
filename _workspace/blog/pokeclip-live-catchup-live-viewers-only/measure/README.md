# 공개 재측정 — 라이브 따라잡기 (2026-11-20)

글 「꺼 둔 라이브 따라잡기를 라이브 시청자에게만 다시 켰습니다」의 수치를 공개 도구로만 다시 잰 실험대입니다. AI(Claude Code)가 2026년 11월 20일 03:23–03:48 KST에 실행했고(첫 실행), 실험 스크립트를 고친 뒤 08:44–08:50 KST에 끊김 실험만 새 사본에서 다시 돌렸습니다(재실행, `*-r2`). PokeClip 코드는 쓰지 않았고, 실험 페이지(`page/lab.js`)의 규칙은 글이 설명한 결정을 문장에서 새로 짠 것입니다.

## 구성

| 파일 | 하는 일 |
|---|---|
| `compose.yml` · `mediamtx.yml` | 공식 `bluenviron/mediamtx:1.21.1` 컨테이너 하나. LL-HLS 값은 글이 설명하는 설정(프로젝트 저장소(비공개)의 로컬 MediaMTX 설정과 같음)인 `hlsVariant: lowLatency` · 4초 조각 · 500ms 파트 · 7조각. 127.0.0.1에만 게시, 라벨 `com.techblog.bench=live-catchup`, compose 프로젝트 `techblog-live-catchup` |
| `up.sh` · `down.sh` | 컨테이너 · ffmpeg · 실험 서버를 띄우고(각각 응답을 확인) 내린다. `down.sh`는 라벨 붙은 잔여 수를 출력 |
| `lib.sh` | 진입 스크립트 공통: `set -euo pipefail`, `logs/` · `raw/` 생성, 실험대 확인(`require_lab`), 실행마다 따로 쓰는 로그(`logs/<이름>.log`) |
| `start-ffmpeg.sh` | ffmpeg `testsrc2` 640×360 30fps · GOP 2초 · AAC 1ch 사인파를 RTMP로 송출. ffmpeg가 살아 있고 MediaMTX가 스트림을 내줄 때만 성공 |
| `server.mjs` | 실험 페이지와 hls.js를 내주고, 나머지 요청을 MediaMTX로 넘기는 같은 출처 프록시. `/__ctl?hold=1`이면 HLS 요청을 붙잡았다가 `hold=0`에 한꺼번에 넘긴다(끊김 유발) |
| `page/index.html` · `page/lab.js` | hls.js 1.7.3(`maxLiveSyncPlaybackRate: 1`, `lowLatencyMode: true`) 재생기 · `timeupdate` 표본기 · `requestVideoFrameCallback` 프레임 기록 · 최소 따라잡기 규칙(`rule=off|rateAndJump|jumpOnly`) |
| `run.mjs` | Playwright 1.60.0으로 시나리오 실행 → `raw/<이름>.json`. 같은 이름의 옛 결과는 실행 전에 `<이름>.superseded-*.json`으로 옮긴다. 페이지 오류 · hls.js 치명 오류 · `requestVideoFrameCallback` 없음 · 표본 부족 · 빈 창이면 `<이름>.failed.json`만 남기고 0이 아닌 값으로 끝난다. 붙잡기 해제와 브라우저 닫기는 `finally`에서 |
| `checks.mjs` | 위 판정 규칙(실행 하나의 유효성) |
| `run-framegap-all.sh` · `run-lag-all.sh` · `run-drift-all.sh` | 시나리오별 실행 묶음. 서로 기다리지 않고 순서도 상관없다. 한 실행이라도 실패하면 그 자리에서 0이 아닌 값으로 끝난다. `SUFFIX=-r2`처럼 이름 꼬리를 붙일 수 있다 |
| `analyze.mjs` | `check`(유효성) · `framegap` · `lag` · `drift` 요약(아래 표의 원문). 요약도 원자료마다 `checks.mjs` 판정과 시나리오 일치를 먼저 확인하고, 하나라도 어긋나거나 빈 창 · 빈 구간이면 0이 아닌 값으로 끝난다. 중앙값은 개수가 짝수면 가운데 두 값의 평균, p99는 아래쪽 최근접 순위 |
| `export-scene-data.mjs` | 영상(`CatchupAfterStall`)에 쓴 1초 간격 표본을 뽑는다 |
| `raw/` | 원자료(JSON) · 환경(`env.txt`) · 실물 목록 머리(`playlist-head.txt`) · 요약 출력(`summary-*.txt`) |

브라우저: Chromium 쪽은 설치된 Google Chrome 157을 Playwright `channel: 'chrome'`으로 띄웠습니다. Playwright 문서대로 Playwright가 내려받는 Chromium 빌드에는 Chrome이 담은 코덱이 다 들어 있지 않고, 이 스트림은 H.264 · AAC입니다. WebKit은 Playwright WebKit 2287(UA `Version/26.4`)입니다. 둘 다 headless입니다.

## 재현

```sh
npm ci                            # hls.js 1.7.3 · playwright 1.60.0 (package-lock.json)
npx playwright install webkit     # Playwright 1.60.0 의 WebKit(2287). Chromium 쪽은 설치된 Google Chrome 을 channel 'chrome' 으로 쓰므로 Chrome 이 먼저 깔려 있어야 한다
./up.sh                           # 컨테이너 · ffmpeg · 127.0.0.1:38300 실험 서버
./run-framegap-all.sh             # 세 묶음은 서로 독립 — 아무 순서
./run-lag-all.sh
./run-drift-all.sh                # 재실행은 SUFFIX=-r2 ./run-drift-all.sh
node analyze.mjs check framegap-webkit-none ...   # 유효성
node analyze.mjs framegap framegap-webkit-none framegap-webkit-1.05 ...
node analyze.mjs lag lag-chrome-early lag-chrome-late lag-webkit-early lag-webkit-late
node analyze.mjs drift drift-chrome drift-webkit
./down.sh                         # 프로세스 종료 · compose down · 라벨 잔여 수 출력
```

브라우저 설치는 [Playwright 「Install browsers」](https://playwright.dev/docs/browsers#install-browsers)를 따른다. Google Chrome은 Playwright가 설치하지 않는다(`channel: 'chrome'`은 이미 깔린 Chrome을 쓴다). 그 밖에 Docker(compose v2)와 ffmpeg(libx264 · AAC)가 필요하다.

새 사본에서 확인한 것(2026-11-20 08:4x KST, git에 있는 파일만 복사): `up.sh` 전에 `run-drift-all.sh`를 부르면 「stream not available」로 1을 내고 끝났고, 없는 브라우저 이름으로 부른 실행은 `FAILED`와 1, 빈 원자료를 넣은 `analyze.mjs check` · `framegap`은 1로 끝났다. `up.sh` → `SUFFIX=-r2 ./run-drift-all.sh` → `down.sh`는 0으로 끝났다. 마지막 검토 뒤(09:0x KST) 다시 확인한 것: `framegap` · `lag` · `drift` 요약은 치명 오류 · 표본 0개인 원자료와 다른 시나리오의 원자료에 각각 1로 끝났고, 이미 성공한 `<이름>.json`이 있는 상태에서 실험대 없이 다시 돌린 실행은 1로 끝나며 옛 파일을 `<이름>.superseded-*.json`으로 옮겨 그 이름의 요약도 1로 끝났다.

## 시나리오와 방법

1. **배속 전환 프레임 틈(`framegap`).** 따라잡기 끈 재생기를 라이브 끝에서 약 10초 뒤로 옮긴 뒤(`currentTime −= 8.5`) 3초마다 `playbackRate`를 1 ↔ r로 40번(올림 20 ·내림 20) 바꾼다. r = 1.05, 1.1, 그리고 바꾸지 않는 기준 실행. `requestVideoFrameCallback` 콜백이 불린 시각(`now`)의 간격을 모두 기록하고(화면 갱신 주기 단위로 묶인다), 전환 시각 ±1초 창의 최대 간격을 전환마다 하나씩 센다. 기준 실행은 같은 일정(3초마다)의 가짜 창으로 같은 값을 센다. 창 안에 `waiting`이 있으면 따로 센다.
   - 한계: headless 브라우저에서 콜백이 불린 시각이다. 실제 화면 · Safari.app · iOS 값이 아니다(Playwright 문서는 Safari에 가장 가까운 동작이 필요하면 WebKit을 mac에서 돌리라고 권한다 — 이 측정은 macOS). 멎음은 이 환경에서 전환과 함께 관찰된 것이다. 오디오는 재생기가 `muted`다. 프레임이 멎은 시간을 재는 것이지 소리 끊김은 재지 않는다.
2. **hls.js `latency` 한 표본 지연(`lag`).** 앱 표본기를 hls.js보다 먼저(`early`) 또는 나중에(`late`) `timeupdate`에 붙이고, 8초 되감기(`currentTime −= 8`)와 동기 위치로의 시크(`currentTime = liveSyncPosition`)를 10번씩 한다. 시크 뒤 첫 `timeupdate`에서 `hls.latency`와 `details.edge + details.age − currentTime`을 견준다. 같은 표본에서 `setTimeout(0)`으로 다른 리스너가 끝난 뒤의 `hls.latency`도 읽는다.
3. **끊김 뒤 지연(`drift`).** 같은 브라우저의 페이지 여럿(규칙 끔 · 규칙 · WebKit은 점프만도)을 함께 틀고, 20초 뒤 프록시로 HLS 요청을 6초 붙잡았다 놓고 60초 보고, 다시 13초 붙잡았다 놓고 45초 본다. 표본은 `timeupdate`마다.
   - 한계: 로컬 망 · 끊김을 프록시 붙잡기로 만든 것. 송출 정지(`SIGSTOP`)는 라이브 끝도 함께 멈춰 지연이 쌓이지 않으므로 이 시나리오에 쓰지 않았다.

## 결과

원문은 `raw/summary-*.txt`(`analyze.mjs` 출력)입니다.

### 1. 배속 전환 프레임 틈 — 전환 ±1초 창의 최대 프레임 간격(ms)

| 브라우저 · 전환 | 창 수 | 최소 · 중앙값 · 최대 | 200ms 초과 | 창 안 `waiting` |
|---|---|---|---|---|
| WebKit 1 → 1.05 | 20 | 299 · 317 · 334 | 20 | 0 |
| WebKit 1.05 → 1 | 20 | 266 · 298 · 309 | 20 | 0 |
| WebKit 1 → 1.1 | 20 | 294 · 316 · 334 | 20 | 0 |
| WebKit 1.1 → 1 | 20 | 266 · 290.5 · 314 | 20 | 0 |
| WebKit 전환 없음(같은 일정의 창) | 40 | 34 · 35 · 41 | 0 | 0 |
| Chrome 1 → 1.05 | 20 | 50 · 50 · 83 | 0 | 0 |
| Chrome 1.05 → 1 | 20 | 50 · 50 · 83 | 0 | 0 |
| Chrome 1 → 1.1 | 20 | 50 · 50 · 83 | 0 | 0 |
| Chrome 1.1 → 1 | 20 | 50 · 50 · 50 | 0 | 0 |
| Chrome 전환 없음 | 40 | 50 · 50 · 50 | 0 | 0 |

전환 창 밖 프레임 간격: WebKit 중앙값 33 · 최대 50–51ms, Chrome 중앙값 33.3 · 최대 50.1–83.3ms.

멎음의 성질: WebKit 두 실행의 전환 40번마다 가장 긴 간격 앞뒤 프레임을 보면 `mediaTime`은 33–34ms(한 프레임), `presentedFrames`는 1만 늘었다. 프레임을 건너뛴 것이 아니라 재생이 약 0.3초 멈췄다가 다음 프레임부터 이어졌다.

### 2. 시크 뒤 첫 `timeupdate` 표본의 `hls.latency` vs `edge + age − currentTime`

| 브라우저 · 리스너 | 1초 넘게 다름 | 같은 표본, 다른 리스너 뒤 다시 읽어도 1초 넘게 다름 |
|---|---|---|
| Chrome · early | 20/20 | 0/20 |
| WebKit · early | 20/20 | 0/20 |
| Chrome · late | 0/20 | 0/20 |
| WebKit · late | 0/20 | 0/20 |

예(Chrome · early): 8초 되감은 직후 `hls.latency` 1.30 · 직접 계산 9.30, 동기 위치로 돌아온 직후 9.35 · 1.25. 시크 직후가 아닌 표본의 차이는 early에서 Chrome 0.045초 · WebKit 0.197초 이하, late에서 0.001초 이하. `timeupdate` 간격 중앙값 Chrome 266ms · WebKit 250ms.

### 3. 끊김 뒤 지연(지연/목표, 초) — 첫 실행

| 페이지 | 6초 붙잡기 뒤 +1s · +30s · 끝(60s) | 목표+0.5초 안 | 13초 붙잡기 뒤 +1s · 끝(45s) | 점프 |
|---|---|---|---|---|
| Chrome · 끔 | 6.30 · 6.29 · 6.30 / 2.25 | 없음 | 13.31 · 13.31 / 3.25 | 0 |
| Chrome · 규칙 | 6.25 · 3.32 · 2.34 / 2.25 (배속 1.1 → 1, 두 번 바뀜) | 36.1초 | 3.54 · 3.55 / 3.25 | 1 |
| WebKit · 끔 | 6.65 · 6.65 · 6.66 / 2.25 | 없음 | 18.19 · 18.19 / 4.25 | 0 |
| WebKit · 점프만 | 6.84 · 6.86 · 6.86 / 2.25 | 없음 | 4.37 · 4.63 / 3.25 | 1 |
| WebKit · 규칙(배속 포함) | 9.54 · 9.74 · 9.25 / 2.25 (60초에 배속 19번 바뀜, 지연 8.87–9.96) | 없음 | 22.08 → 점프 → 4.29 / 4.25 | 1 |

- WebKit 세 페이지의 앞 버퍼는 첫 끊김 뒤 60초 동안 최대 2.03–2.34초(중앙값 1.38–1.71초)였고, Chrome 끔 페이지는 최대 6.28초였다. 그래서 13초 붙잡기에서 Chrome 끔은 버퍼로 일부를 버텨 지연이 7초만 늘었다.
- WebKit 규칙 페이지는 첫 끊김 전에도 지연 4.72초 · 목표 1.25초로, 목표에 닿지 못한 채 배속을 켰다 껐다 했다.
- 끊김 하나마다 hls.js 목표가 1초씩 올랐다(1.25 → 2.25 → 3.25, WebKit 끔 페이지는 4.25).

### 4. 끊김 뒤 지연 — 재실행(`*-r2`, 고친 스크립트 · 새 사본, Chrome 157.0.8103.80)

| 페이지 | 6초 붙잡기 뒤 +1s · +30s · 끝(60s) | 목표+0.5초 안 | 13초 붙잡기 뒤 +1s · 끝(45s) | 점프 |
|---|---|---|---|---|
| Chrome · 끔 | 6.36 · 6.36 · 6.36 / 2.25 | 없음 | 13.39 · 13.39 / 3.25 | 0 |
| Chrome · 규칙 | 6.31 · 3.41 · 2.33 / 2.25 (배속 두 번 바뀜) | 36.6초 | 3.62 · 3.61 / 3.25 | 1 |
| WebKit · 끔 | 6.79 · 6.79 · 6.79 / 2.25 | 없음 | 18.65 · 18.65 / 3.25 | 0 |
| WebKit · 점프만 | +1s 6.88 / 2.25 · +30s 9.11 / 4.25 · 끝 9.11 / 4.25 (놓은 뒤 `waiting` 3번 · hls.js `bufferStalledError` 2번으로 목표 +2초, 10초 아래라 점프 없음) | 없음 | 6.59 · 6.77 / 5.25 | 1 |
| WebKit · 규칙(배속 포함) | 8.50 · 6.27 · 3.28 / 2.25 (배속 3번) | 없음 | 5.50 · 4.74 / 3.25 (배속 11번) | 1 |

- Chrome은 첫 실행을 그대로 재현했다(36.1초 → 36.6초).
- WebKit 배속 규칙 페이지는 실행마다 갈렸다. 첫 실행 6초 뒤 60초에 19번 · 지연 그대로, 재실행은 3번 · 지연 8.5 → 3.3초, 13초 뒤 45초에 11번. 흔들린 구간의 앞 버퍼는 최대 2.10초(첫 실행) · 2.65초(재실행 13초 뒤)였고, 덜 흔들린 재실행 6초 뒤 구간은 최대 8.65초였다. WebKit 앞 버퍼가 작은 원인은 확인하지 않았다. 한 WebKit에 페이지 셋을 띄운 headless 실행 두 번뿐이다.

## 유효성

`raw/summary-check.txt`: 공개한 원자료 14개 모두 `checks.mjs` 판정을 통과한다(치명 hls.js 오류 0 · `play()` 거부 0 · `requestVideoFrameCallback` 있음 · 표본 50개 이상 · 프레임 틈 창마다 프레임 10개 이상 · 시크마다 1초 안 표본 · 끊김 뒤 30초 표본 50개 이상). 페이지 오류(`pageerror`)는 첫 실행 스크립트가 기록하지 않아 첫 실행 12개에는 확인할 수 없고, 재실행 2개는 0이다. 첫 실행의 지연 캐시 실험(`lag-*`)은 두 브라우저를 겹쳐 돌렸고, 프레임 틈 · 끊김 실험은 한 번에 브라우저 하나였다.

## 비공개 로컬 실측과의 관계

머지 전 프로젝트 재생기 코드로 한 비공개 로컬 실측(2026-11-19)의 원자료와 수치는 싣지 않는다. 결론은 같았다: WebKit 배속 전환 멎음이 200ms 문턱을 넘었고, 시크 직후 `hls.latency`가 한 표본 늦었다. 끊김 뒤 복귀 시간처럼 규칙 구현(프로젝트 코드 대 새로 짠 최소 구현)과 붙잡은 길이에 달린 값은 같은 값이 아니며, 글에는 이 폴더의 공개 값만 쓴다. WebKit에 배속 규칙을 건 경우의 흔들림(60초 19번)은 이 재측정에서 처음 기록한 관측이다.

## 정리

첫 실행 뒤(2026-11-20 03:5x KST)와 재실행 뒤(08:5x KST, `down.sh`) 모두, 측정 원문을 이 폴더로 옮긴 뒤:

- 지움: ffmpeg 송출 · 실험 서버 프로세스 종료, `docker compose -f compose.yml down`으로 컨테이너 `techblog-live-catchup-mediamtx-1` · 망 `techblog-live-catchup_bench` 삭제(볼륨 없음).
- 잔여 0 확인: `docker ps -a --filter label=com.techblog.bench=live-catchup` 0 · `docker network ls --filter label=…` 0 · `docker volume ls --filter label=…` 0 · 포트 31935 · 38888 · 38300 수신 0 · 실험 프로세스 0.
- 남김: 이미지 `bluenviron/mediamtx:1.21.1`(실험 전부터 있던 것 — 새로 받지 않음). Playwright 브라우저 캐시(이미 있던 WebKit 2287 사용, 새로 받지 않음).
