# hls.js 1.7.3 주장 대조 — 공개 저장소 태그 v1.7.3 기준

- 대조 대상: 원고 정리본(비공개 설계 원고) 2절 「바꾸기 전(develop) hls.js 의 반응」 · 7절(7-1 · 7-2 · 7-3)의 hls.js 주장 전부
- 대조 일자: 2026-11-03
- 정리본은 읽기만 했다(수정 없음).

## 1. 태그 → 커밋

| 단계 | 값 |
|---|---|
| `refs/tags/v1.7.3` | 주석 태그 객체 `be6a62d80e3775a60475b60568965b3243e64024` |
| 태그가 가리키는 커밋 | **`e5ff3583965e3af16c4a4b4d2b5f7bd1ffb5b7de`** |

- 조회 명령: `gh api repos/video-dev/hls.js/git/ref/tags/v1.7.3` → `gh api repos/video-dev/hls.js/git/tags/be6a62d8…` 의 `.object`(type `commit`).
- 원본은 `https://raw.githubusercontent.com/video-dev/hls.js/e5ff358…/<path>` 로 받았다(클론 안 함).
- 아래 퍼머링크 앞부분 `P` = `https://github.com/video-dev/hls.js/blob/e5ff3583965e3af16c4a4b4d2b5f7bd1ffb5b7de`

## 2. 로컬 설치본 판 확인

| 항목 | 결과 |
|---|---|
| 위치 | 앱이 설치한 npm 꾸러미 `hls.js@1.7.3` |
| `package.json` version | `1.7.3` — 맞음 |
| 설치본에 `src/` 가 있나 | 있다(npm 꾸러미에 `dist/` 와 함께 `src/` 동봉) |
| 공개 태그 원본과 같은가 | 받은 원본 20개 파일 모두 로컬 `src/` 와 **바이트 단위로 같다**(`cmp`) |
| 정리본 줄 번호의 기준 | **`src/` 기준.** 예: `reason.data.frag = mediaFrag` 는 `src/controller/base-stream-controller.ts` 820줄(정리본 815–823 안), `dist/hls.mjs` 에서는 10865줄 · `dist/hls.js` 11699줄 |

대조한 20개 파일: `hls.ts` · `config.ts` · `utils/error-helper.ts` · `utils/xhr-loader.ts` · `utils/fetch-loader.ts` · `loader/fragment-loader.ts` · `loader/playlist-loader.ts` · `controller/` 아래 `base-stream-controller` · `stream-controller` · `error-controller` · `level-controller` · `base-playlist-controller` · `fragment-tracker` · `gap-controller` · `audio-stream-controller` · `subtitle-stream-controller` · `audio-track-controller` · `subtitle-track-controller` · `content-steering-controller` · `interstitials-controller`.

## 3. 주장별 대조표

판정: 일치 / 줄만 다름 / 동작 불일치 / 확인 못 함. 「단서」 는 판정은 일치지만 글에 전제를 적어야 오해가 없는 것.

| # | 정리본 위치 | 주장 | 공개 저장소 파일:줄 | 인용(짧게) | 판정 | 퍼머링크 |
|---|---|---|---|---|---|---|
| H1 | 2절 표 1행 | 라이브 목록 **가운데** 조각 404 → 「틈」 으로 보고 다음 조각으로 건너뜀, 재시도 없음 | `src/controller/base-stream-controller.ts` 2153–2167 (근거 사슬은 아래 4-1) | `!retry && noAlternate && … live && frag.sn < levelDetails.endSN` → `this.treatAsGap(frag)` | 일치 · 단서(대체 화질 없음) | `P/src/controller/base-stream-controller.ts#L2153-L2167` |
| H2 | 2절 표 2행 | 라이브 목록 **마지막** 조각 · 끝난 목록(ENDLIST) 조각 404 → 같은 조각 6번 더(1 · 2 · 4 · 8 · 8 · 8초) → 치명 | `base-stream-controller.ts` 2151–2152 · 2168–2174 · 2188–2202, `error-controller.ts` 481–490 · 502–505 (근거 사슬 4-2) | 주석 `Errors on the last live fragment fall through to retry and escalate to fatal once retries are exhausted, as they do for VOD.` | 일치 · 단서(대체 화질 없음 · 계수 0 에서 시작 · 기다리는 동안 라이브 목록 끝이 안 늘 때) | `P/src/controller/base-stream-controller.ts#L2151-L2174` · `P/src/controller/base-stream-controller.ts#L2188-L2202` · `P/src/controller/error-controller.ts#L477-L506` |
| H3 | 2절 표 2행 | 앱이 한 번 더 시작 → 또 6번, 합쳐 약 62초 | `src/controller/level-controller.ts` 82–92 | `level.fragmentError = 0;` (stopLoad 안) | hls.js 부분 일치 — 치명 때 `hls.stopLoad()` 가 오류 계수를 0 으로 되돌리므로 재시작 뒤 다시 6번. 62초 = 2 × (1+2+4+8+8+8=31초), 요청 시간 제외. 「앱이 한 번 더 시작」 은 앱 코드라 이 대조 범위 밖 | `P/src/controller/level-controller.ts#L82-L92` |
| H4 | 2절 표 아래 | 둘 다 「창 밖이니 하한으로 옮겨 보여 준다」 는 답이 없다 | `base-stream-controller.ts` 2153–2208 (조각 오류 갈래 전체) | 갈래는 틈 처리 · 재시도 예약 · 화질 전환 · 오류 상태뿐 | 일치 · 단서(별개 장치 있음 — 4-3) | `P/src/controller/base-stream-controller.ts#L2153-L2210` |
| H5 | 7-1 | init 조각 받기 실패 시 오류 자료의 조각을 미디어 조각으로 바꿔 끼운 뒤 오류를 올린다 (`base-stream-controller.ts` 815–823) | `src/controller/base-stream-controller.ts` 815–823 | `reason.data.frag = mediaFrag;` (820) → `this.handleFragLoadError(reason);` (822) → 1238 `this.hls.trigger(Events.ERROR, data)` | 일치(줄 번호 같음) | `P/src/controller/base-stream-controller.ts#L815-L823` |
| H6 | 7-1 | 그래서 `frag.sn !== 'initSegment'` 로는 init 404 를 가를 수 없다 | 같은 곳(H5의 귀결) | 바꿔 끼운 뒤 `data.frag` 는 미디어 조각이라 `sn` 이 숫자 | 일치 | `P/src/controller/base-stream-controller.ts#L815-L823` |
| H7 | 7-1 | 실패한 파일 주소는 `data.response.url` — `loader/fragment-loader.ts` 118–126 이 싣는다 | `src/loader/fragment-loader.ts` 118–126 (`url` 은 50줄 `const url = frag.url`) | `response: { url, data: undefined, ...response },` (126) | 일치(줄 번호 같음) · 단서(아래 4-4) | `P/src/loader/fragment-loader.ts#L118-L126` |
| H8 | 7-2 | 화질이 하나여도 첫 목록 요청을 MANIFEST 로 다루고, 404 면 곧바로 치명 (`playlist-loader.ts` 653–659) | `src/loader/playlist-loader.ts` 653–659 · 164–172 · 346–349, `src/utils/xhr-loader.ts` 216–234, `src/utils/error-helper.ts` 86–92 | `case LoaderContextType.MANIFEST: … fatal = true;` | 일치(줄 번호 같음) | `P/src/loader/playlist-loader.ts#L653-L659` · `P/src/loader/playlist-loader.ts#L158-L173` · `P/src/utils/xhr-loader.ts#L216-L234` |
| H9 | 7-2 | 재생 정보(levels)가 없어 `startLoad()` 는 요청을 보내지 않는다 (`playlist-loader.ts` 86 빈 함수 · `stream-controller.ts` 191–193) | `src/loader/playlist-loader.ts` 86, `src/controller/stream-controller.ts` 145 · 191–193 (보강 근거 4-5) | `public startLoad(startPosition: number): void {}` / `this._forceStartLoad = true; this.state = State.STOPPED;` | 일치(줄 번호 같음) · 단서(191–193 은 145줄 `if (this.levels)` 의 else 쪽이라 145 를 같이 거는 것이 좋다) | `P/src/loader/playlist-loader.ts#L86` · `P/src/controller/stream-controller.ts#L141-L195` |
| H10 | 7-2 | 두 번째 치명이 오지 않는다 | H9 의 귀결 — 요청이 없으니 오류 사건도 없다 | — | 일치(hls.js 부분). 「알림 없이 무한 로딩」 은 앱 동작이라 범위 밖 | (H9 와 같음) |
| H11 | 7-3 | 조각 재시도 기본값: 6회 · 1초에서 지수 · 8초 상한 (`config.ts` 596–610) | `src/config.ts` 596–611, 지수 계산은 `src/utils/error-helper.ts` 37–48 | `errorRetry: { maxNumRetry: 6, retryDelayMs: 1000, maxRetryDelayMs: 8000 }` / `Math.pow(2, retryCount)` | 일치(줄 번호 같음) | `P/src/config.ts#L596-L611` · `P/src/utils/error-helper.ts#L37-L48` |
| H12 | 7-3 | 4xx 는 「재시도할 상태」 가 아니라 다른 갈래(noAlternate)로 재예약된다 | `src/utils/error-helper.ts` 86–92, `src/controller/error-controller.ts` 471–474, `base-stream-controller.ts` 2144–2148 · 2168 | `// Do not retry on status 4xx …` / `flags: ErrorActionFlags.MoveAllAlternatesMatchingHost` / `(retry \|\| noAlternate) && retryCount < retryConfig.maxNumRetry` | 일치 · 단서(대체 화질 없음) | `P/src/utils/error-helper.ts#L86-L92` · `P/src/controller/error-controller.ts#L471-L474` · `P/src/controller/base-stream-controller.ts#L2142-L2174` |
| H13 | 7-3 | `stopLoad()` 는 예약된 재시도 타이머까지 지운다 (`base-stream-controller.ts` 176–194) | `src/controller/base-stream-controller.ts` 176–194 | `this.clearInterval(); this.clearNextTick(); this.state = State.STOPPED;` (191–193) | 일치(줄 번호 같음) · 단서(표현 — 4-6) | `P/src/controller/base-stream-controller.ts#L176-L194` |
| H14 | 7-3 | 내부 오류 처리기(`onErrorOut`)가 앱 처리기보다 먼저 돈다 (`hls.ts` 351–357) | `src/hls.ts` 351–357 (근거 사슬 4-7) | `// This listener will be invoked after all other controllers error listeners` / `this.on(Events.ERROR, onErrorOut, errorController);` | 일치(줄 번호 같음) | `P/src/hls.ts#L351-L357` |
| H15 | 7-3 | 치명이면 그 안에서 `stopLoad()` 를 이미 부른다 | `src/controller/error-controller.ts` 502–505 | `if (data.fatal) { this.hls.stopLoad(); return; }` | 일치(정리본에 줄 번호 없음 — 글에 넣을 줄) | `P/src/controller/error-controller.ts#L502-L505` |

> 표의 `P` 는 1절의 퍼머링크 앞부분이다. 글에 넣을 때 `P` 를 펼쳐 쓴다. 예: `https://github.com/video-dev/hls.js/blob/e5ff3583965e3af16c4a4b4d2b5f7bd1ffb5b7de/src/controller/base-stream-controller.ts#L815-L823`

## 4. 호출 경로 근거(단정이 어려운 주장)

### 4-1. H1 — 가운데 조각 404 가 「틈」 이 되는 사슬

1. 조각 로더는 내부 재시도를 끈다 — `fragment-loader.ts` 89–97 `getLoaderConfigWithoutReties(...)`, `maxRetry: 0`. 그래서 404 는 곧바로 `FRAG_LOAD_ERROR`(`fragment-loader.ts` 118–131).
2. `error-controller.ts` 146–151: `FRAG_LOAD_ERROR` → `getFragRetryOrSwitchAction`.
3. `error-controller.ts` 328–341: `shouldRetry(...)` 가 거짓 — `error-helper.ts` 86–92 `retryForHttpStatus` 가 4xx 를 뺀다. 그래서 `RetryRequest` 가 아니라 `getLevelSwitchAction` 으로 간다(346).
4. 바꿀 다른 화질이 없으면 `error-controller.ts` 471–474 가 `SendAlternateToPenaltyBox` + `MoveAllAlternatesMatchingHost` 를 돌려주고, 346–351 이 `retryConfig` · `retryCount` 를 붙인다.
5. 스트림 컨트롤러 `stream-controller.ts` 1019–1023 → `base-stream-controller.ts` 2111 `onFragmentOrKeyLoadError`. `retry` 거짓 · `noAlternate` 참(2144–2148), 라이브이고 `frag.sn < levelDetails.endSN` 이면 2153–2167 에서 `treatAsGap` · `errorAction.resolved = true`.
6. `fragment-tracker.ts` 295–299 `addAsGap`: `frag.gap = true` 로 표시하고 「받은 것」 으로 기록 — 다음 틱에서 그 다음 조각을 고른다. `resolved` 가 참이라 `error-controller.ts` 483–490 에서 치명이 되지 않는다.

- **단서:** 다른 화질이 있으면 4단계에서 `getLevelSwitchAction` 이 다른 화질을 골라 `flags: None` 으로 돌려주고(`error-controller.ts` 459–466), `noAlternate` 가 거짓이 되어 틈 갈래가 아니라 화질 전환 갈래로 간다. 2절 표는 「화질 하나(또는 대체 화질이 모두 오류)」 전제를 적어야 정확하다.

### 4-2. H2 — 마지막 조각 · ENDLIST 404 의 재시도와 치명

1. 4-1 의 1–4 단계는 같다.
2. `base-stream-controller.ts` 2153–2160 조건 중 `live` 가 거짓(ENDLIST) 이거나 `frag.sn < endSN` 이 거짓(마지막 조각)이면 틈 갈래를 건너뛴다. 2151–2152 의 상류 주석이 이 의도를 그대로 적어 두었다.
3. 2168–2174: `noAlternate && retryCount < 6` 이면 `retryDate = now + getRetryDelay(...)`, 상태 `FRAG_LOADING_WAITING_RETRY`. 지연은 `error-helper.ts` 37–48 의 `min(2^retryCount × 1000, 8000)` → retryCount 0–5 에서 1 · 2 · 4 · 8 · 8 · 8초.
4. `retryCount` 는 모든 화질의 `fragmentError` 합이다(`error-controller.ts` 318–321), 오류마다 1씩 오른다(324–326). 조각을 성공적으로 받으면 0 으로 돌아간다(`stream-controller.ts` 1202, `base-stream-controller.ts` 891–899).
5. 대기가 끝나면 `stream-controller.ts` 225–227 → `base-stream-controller.ts` 2213–2229 `checkRetryDate` 가 상태를 IDLE 로 돌리고, 평소의 조각 고르기로 다시 요청한다. 경고 줄 2181–2187 `retrying loading ${retryCount + 1}/${maxNumRetry}` 가 같은 조각의 재시도임을 기록한다.
6. 일곱 번째 실패(retryCount 6): 2188–2202 갈래에서 `reached or exceeded max retry` 경고 후 `resolved` 를 세우지 않고 반환 → `error-controller.ts` 483–490 이 `data.fatal = true` → 502–505 `hls.stopLoad()`.
- 합계: 첫 요청 + 재시도 6번 = 7번 요청, 대기 합 31초.
- **단서 셋:** (가) 대체 화질이 없을 때(4-1 단서와 같음). (나) 계수가 0 에서 시작할 때 — 직전 틈 처리(4-1)는 `fragmentError` 를 되돌리지 않으므로 그 사이 성공한 조각이 없으면 재시도 횟수가 줄 수 있다. (다) 라이브 마지막 조각의 경우, 재시도를 기다리는 동안 목록이 갱신되어 `endSN` 이 커지면 그 다음 실패부터는 2157–2158 조건이 참이 되어 틈 갈래로 넘어간다 — 「6번」 은 목록 끝이 그대로일 때의 값이다.

### 4-3. H4 — 404 갈래 밖의 「라이브 가장자리 맞추기」

- 404 처리 갈래(2153–2208)에는 하한(첫 조각)으로 옮기는 동작이 없다 — 주장대로.
- 다만 hls.js 에는 별개 장치가 있다: 라이브 목록을 새로 받을 때 `stream-controller.ts` 688–690 → 704 이하 `synchronizeToLiveEdge` 가, 재생점이 목록 창 밖이거나 최대 지연보다 뒤처지면 `liveSyncPosition` 으로 옮긴다(739 경고 `reset currentTime to : ${liveSyncPosition}`). 옮기는 곳은 **라이브 끝 근처**지 하한이 아니고, `liveMaxLatencyDuration` 등 설정에 좌우된다. 글에서 「hls.js 에는 창 밖 대응이 아예 없다」 로 읽히지 않게 「404 를 받았을 때의 갈래에는」 으로 범위를 좁혀 쓰는 것을 권한다.
- 퍼머링크: `P/src/controller/stream-controller.ts#L704-L745`

### 4-4. H7 — `data.response.url` 의 값

- 126줄 `{ url, data: undefined, ...response }` 는 `url`(50줄 `frag.url`, init 이면 init 주소)을 먼저 놓고 로더 응답을 펼친다. 기본 XHR 로더는 `{ code, text }` 만 넘기므로(`xhr-loader.ts` 228–233) `url` 이 그대로 남는다. 사용자 정의 로더가 응답에 `url` 을 넣으면 덮일 수 있다 — 기본 로더 기준 주장임을 적어 두면 정확하다.
- 7-1 의 뒷부분(바꿔 끼운 뒤 `data.frag` 는 미디어 조각인데 `data.response.url` 은 init 주소로 남는다)은 H5 · 4-4 를 합치면 성립한다.

### 4-5. H9 — 「startLoad() 가 요청을 보내지 않는다」 의 나머지 컨트롤러

`hls.startLoad`(`hls.ts` 593–611)는 네트워크 컨트롤러 전부의 `startLoad` 를 부른다. 정리본은 두 곳만 걸었으므로 나머지를 확인했다.

| 컨트롤러 | 요청 안 함의 근거 | 퍼머링크 |
|---|---|---|
| playlist-loader | 86 빈 함수. MANIFEST 요청은 `MANIFEST_LOADING` 사건(158–173)에서만 나간다 — 즉 `loadSource` 를 다시 불러야 한다 | `P/src/loader/playlist-loader.ts#L158-L173` |
| stream-controller | 145 `if (this.levels)` 거짓 → 191–193 | `P/src/controller/stream-controller.ts#L141-L195` |
| level-controller | `currentLevel` 이 null → `shouldLoadPlaylist` 거짓(`level-controller.ts` 640–645, `base-playlist-controller.ts` 125–133) | `P/src/controller/level-controller.ts#L640-L645` |
| audio-stream-controller | 216–221 `if (!this.levels) { … State.STOPPED; return; }` | `P/src/controller/audio-stream-controller.ts#L216-L221` |
| subtitle-stream-controller | 틱은 돌지만 421 `this.state === State.IDLE && this.levels` 거짓 | `P/src/controller/subtitle-stream-controller.ts#L421` |
| audio · subtitle track controller | `currentTrack` 초기값 null(각 34 · 35줄) → `shouldLoadPlaylist` 거짓(audio 418–423, subtitle 464–469) | `P/src/controller/audio-track-controller.ts#L418-L423` |
| content-steering-controller | 119 `this.enabled && this.uri` — `uri` 는 `MANIFEST_LOADED`(181)에서만 채워짐 | `P/src/controller/content-steering-controller.ts#L116-L128` |
| interstitials-controller | 204–207 `resumeBuffering()` 만 | `P/src/controller/interstitials-controller.ts#L204-L207` |

- 404 가 「곧바로」 치명인 근거: MANIFEST 는 `manifestLoadPolicy.errorRetry.maxNumRetry: 1`(`config.ts` 573–577)이지만, XHR 로더의 내부 재시도 판정 `shouldRetry`(`xhr-loader.ts` 224, `error-helper.ts` 62–92)가 4xx 를 빼므로 재시도 없이 `onError` → `playlist-loader.ts` 653–659 `fatal = true`. fetch 로더를 쓰는 설정이면 `fetch-loader.ts` 를 따로 봐야 한다(이번에 받았으나 이 경로는 추적하지 않음).

### 4-6. H13 — 「재시도 타이머」 라는 표현

- hls.js 에는 재시도 전용 타이머가 없다. 재시도 예약은 `retryDate` 값 + 상태 `FRAG_LOADING_WAITING_RETRY`(2172–2173)이고, 주기 틱(`stream-controller.ts` 225–227 → `checkRetryDate`)이 시각을 보고 IDLE 로 돌린다.
- `stopLoad()` 는 그 틱 타이머를 지우고(191 `clearInterval` · 192 `clearNextTick`) 상태를 `STOPPED` 로 바꾸므로(193), 결과적으로 예약된 재시도는 일어나지 않는다 — 주장의 결론은 맞다.
- 글에는 「예약된 재시도를 굴리는 틱 타이머를 지우고 상태를 STOPPED 로 바꾼다」 처럼 쓰면 소스와 표현까지 맞는다. 앱이 부르는 것은 `hls.stopLoad()`(`hls.ts` 616–625)이고, 이것이 stream-controller 의 `stopLoad`(`stream-controller.ts` 197–200 → 부모 176–194)를 부른다.

### 4-7. H14 · H15 — 처리기 순서와 치명 때 stopLoad

1. 등록 순서: `error-controller` 생성(`hls.ts` 219, 생성자에서 `onError` 등록 — `error-controller.ts` 65–67) → stream-controller 생성(`hls.ts` 256, `base-stream-controller.ts` 156 에서 `onError` 등록) → 생성자 끝 무렵 `hls.ts` 355–357 에서 `onErrorOut` 등록. 앱의 `hls.on(Events.ERROR, …)` 은 생성자가 끝난 뒤에야 부를 수 있으므로 그보다 늦다.
2. `hls.on` 은 eventemitter3 의 `on` 에 그대로 넘기고(`hls.ts` 378–384), `trigger` → `emit`(411–417 · 419–427). eventemitter3 는 등록 순서대로 부른다(라이브러리 동작 — 이번 대조에서 eventemitter3 소스 줄은 열지 않았다).
3. 따라서 순서: error-controller `onError`(오류 행동 결정) → stream-controller `onError`(재시도 · 틈 · 해결 표시) → `onErrorOut`(치명 판정, 치명이면 502–505 `hls.stopLoad()`) → 앱 처리기.
4. 치명 판정은 `onErrorOut` 안에서 내려지는 경우(483–490)와 처음부터 `fatal: true` 로 오는 경우(예: MANIFEST 404, `playlist-loader.ts` 658) 모두 502–505 를 지나 `stopLoad()` 가 불린다.

## 5. 불일치 · 확인 못 함 목록

- **동작 불일치: 0건.**
- **줄만 다름: 0건.** 정리본이 건 줄 번호(815–823 · 118–126 · 653–659 · 86 · 191–193 · 596–610 · 176–194 · 351–357)가 모두 태그 원본과 같다(로컬 `src/` 가 태그와 바이트 단위로 같기 때문).
- **확인 못 함: 0건.** 다만 아래는 hls.js 소스 대조의 범위 밖이라 판정하지 않았다.
  - H3 의 「앱이 한 번 더 시작한다」 · H10 의 「알림 없이 무한 로딩」 — 앱 코드의 동작.
  - H14 의 「등록 순서대로 호출」 은 eventemitter3 의 동작에 기댄다(eventemitter3 소스는 열지 않음).
- **글에 전제를 적어야 하는 단서 6건:** H1 · H2 · H12(대체 화질 없음), H2(계수 0 시작 · 라이브 목록 끝 불변), H4(별개의 라이브 가장자리 맞추기 존재), H7(기본 로더 기준), H9(145줄 함께 걸기), H13(「재시도 타이머」 → 틱 타이머).

## 6. 출처

- 태그 조회: `gh api repos/video-dev/hls.js/git/ref/tags/v1.7.3`, `gh api repos/video-dev/hls.js/git/tags/be6a62d80e3775a60475b60568965b3243e64024`
- 원본: `https://raw.githubusercontent.com/video-dev/hls.js/e5ff3583965e3af16c4a4b4d2b5f7bd1ffb5b7de/src/...` (위 20개 파일)
- 로컬 설치본: 앱이 설치한 npm 꾸러미 `hls.js@1.7.3` 의 `package.json` · `src/` · `dist/`
