# 근거 — 꺼 둔 라이브 따라잡기를 라이브 시청자에게만 다시 켰습니다

글 유형: **의사결정** (선택지 · 기준 · 각 증상별 판단 · 대가 · 남은 위험). 공개 재측정을 곁들인다.

확인 날짜: 2026-11-20 (KST). 코드 인용 기준: 프로젝트 저장소(비공개)의 2026-11-20 02:06 KST 머지 커밋. 글에는 링크 없이 짧은 발췌만 싣는다. hls.js 인용 기준: video-dev/hls.js 태그 `v1.7.3`(`e5ff3583965e3af16c4a4b4d2b5f7bd1ffb5b7de`).

## 역할

| 일 | 수행 주체 |
|---|---|
| 목표 지연 · 켜는 범위 · 배속 값 · 점프 문턱 · Safari 점프만 · 끝 3초 = LIVE · 넘김 뒤 배속만 · 간헐 송출 흔들림 수용 결정 | 사용자(결정 · 승인 · 머지) |
| 계획 · 구현 · 단위 시험 · 로컬 실측(비공개) | AI 에이전트(Claude Code, Codex) — 사용자 지시 |
| 공개 재측정(이 폴더 `measure/`) | AI(Claude Code) — 2026-11-20 |
| 글 · 영상 | AI(Claude Code) — 사용자 결정 · 자료 바탕, 영상은 Remotion |

## 주장 → 근거

| 주장 | 근거 | 종류 | 확인 범위 |
|---|---|---|---|
| 라이브 재생기가 실시간보다 17초 뒤에 머무는 일이 있었다 | 프로젝트 PR 본문(비공개) | 프로젝트 관찰(비공개) | 원자료 비공개. 공개 재측정에서 끊김 두 번 뒤 끔 페이지 Chrome 13.3초 · WebKit 18.2초로 같은 크기의 누적을 재현 |
| hls.js catch-up을 끈 이유 = 되감기 중 라이브로 튀어 DVR이 안 되는 것처럼 보임 | 프로젝트 저장소(비공개) `hlsConfig.ts` 주석(본문 발췌) | 코드 주석 | 예전 스파이크 원자료는 비공개 |
| hls.js 두 갈래 catch-up 기본값(Infinity · 1) | hls.js v1.7.3 `src/config.ts` 471–477행 | 문헌값(소스) | 원문 확인 |
| `maxLiveSyncPlaybackRate === 1`이면 onTimeupdate가 되돌리기 전에 return → 켠 뒤 1로 바꿔도 배속이 남는다 | hls.js v1.7.3 `latency-controller.ts` 255–263 · 296–298행 | 문헌값(소스) | 원문 확인. 프로젝트의 실물 hls.js 통합 시험(비공개)이 같은 동작을 본다 |
| hls.js 배속은 `latency − target < target + TD`일 때만(설정 기본값에서 maxLatency = ∞) | 같은 파일 268–287행, `maxLatency` 35–47행 | 문헌값 | PHB 1.25 · TD 4면 지연 6.5초 미만 |
| hls.js `latency`는 캐시이고 자기 timeupdate 리스너(MEDIA_ATTACHED에서 붙음)와 `LEVEL_UPDATED`(details.advanced)에서만 다시 잰다 | 같은 파일 31–33 · 174–180 · 194–200 · 240–253행 | 문헌값 | 원문 확인 |
| 프로젝트 재생기는 따라잡기 timeupdate 리스너를 hls.attachMedia보다 먼저 단다(앱 리스너가 늘 먼저) | 프로젝트 저장소(비공개) `useHlsPlayback.ts` — `new HlsCtor` 직후 `watchLiveCatchup`, 뒤에 `hls.attachMedia`(본문에 순서만 발췌) | 코드(비공개) | 리스너 순서를 맞추는 대신 직접 계산을 고른 이유는 판단(측정 아님) |
| 지연 6.5초 경계 = 목표 × 2 + TD(목표 1.25초일 때). 목표 2.25초면 8.5초 | `latency-controller.ts` 268–276행 | 문헌값 | |
| 창 밖 · readyState 4 미만이면 Infinity 설정과 상관없이 동기 위치로 시크 | `stream-controller.ts` 704–730행 | 문헌값 | 회복 예외 |
| WebKit 멎음 = 재생 정지 뒤 같은 자리에서 이어짐(mediaTime 한 프레임, presentedFrames +1) | `measure/raw/framegap-webkit-*.json` | 실측(공개) | headless |
| `computeLatency = edge + age − currentTime` | 같은 파일 314–328행, `level-details.ts` 131–133 · 156–161행 | 문헌값 | 원문 확인 |
| 우리 앱 지연 = `details.edge + details.age − currentTime` | `liveCatchup.ts` 77–84 · 272 · 342–344행 | 코드(비공개) | |
| 배속 규칙 0.5 켬 · 1초 이상이면 1.1 · 0.1 이하 끔 · 앞 버퍼 1초 · 점프 10초 · 앞으로 1초 · 쿨다운 8초 · 정체 2×TD 진입 · TD 미만 2연속 회복 | `liveCatchup.ts` 31–66 · 157–227행 | 코드(비공개) | |
| WebKit 판별 = UA에 AppleWebKit/ 있고 Chrome/·Chromium/ 없음 | `liveCatchup.ts` 233–241행 | 코드(비공개) | |
| WebKit 정책 = 점프만 | `liveCatchup.ts` 34–38 · 187행 | 코드(비공개) | |
| 사람 명령 자리에서 arm/disarm, 끝 3초 시크 = full | `useHlsPlayback.ts` 371–376 · 420–421 · 520 · 559 · 575 · 760 · 1082 · 1140행 | 코드(비공개) | |
| 넘김 확인 중 점프 금지 | `liveCatchup.ts` 167–176 · 208–211, `useLiveRewindPlayback.ts` 49–50 · 68행 | 코드 | 실제 넘김 실측 없음 |
| 시크바 숫자 히스테리시스 · 끝이면 손잡이 100% | `playerMath.ts` 179–189행, `PlayerSeekBar.tsx` 75 · 80행 | 코드(비공개) | |
| WebKit 배속 변경 시 멎음 — 2016년 보고, 미해결 | WebKit Bug 163433(NEW, 2026-11-20 확인), 중복 208142(iOS 13) | 문헌 | 보고자 macOS·iOS 수치는 보고자 측정 |
| 비공개 로컬 실측: WebKit 전환 멎음이 200ms 문턱 초과 | 프로젝트 PR 본문 · 코드 주석(비공개) | 비공개 실측 | 수치는 싣지 않고 공개 재측정 값을 쓴다 |
| 공개 재측정 결과 | `measure/` | 실측(공개) | 아래 측정 조건 |
| 운영 배포 2026-11-20 03:33:28 KST · 운영 동작(지연 통계 · Safari.app/iOS · 넘김) 미측정, 운영 측정 진행 중 | 사용자 확인(2026-11-20) · 프로젝트 PR 「한계」 「시험 계획」(비공개) | 상태 | 운영 수치는 나오면 덧붙임 |
| 탭 전환 · 백그라운드 탭에서 라이브 유지는 주장하지 않음. Chrome 백그라운드 탭에서 멈춘 소리 꺼진 영상이 돌아와도 재생되지 않는 버그 수정 중 | 사용자 확인(2026-11-20) | 상태 | 공개 근거 없음 — 글에는 범위 밖으로만 적음 |

## 공개 재측정(2026-11-20 03:23–03:48 KST, AI(Claude Code))

`measure/README.md`에 조건 · 명령 · 결과 · 비공개 요약과의 차이 · 정리가 있다. 글에 쓴 값:

| 글의 값 | 원자료 |
|---|---|
| WebKit 전환 80/80이 266–334ms 멎음, 전환 없음 최대 41ms | `raw/summary-framegap.txt` |
| Chrome 전환 최대 83ms, 전환 창 `waiting` 0 | 같은 파일 |
| `hls.latency` 시크 뒤 첫 표본 20/20 어긋남(early), 0/20(late) · 예 1.30 대 9.30, 9.35 대 1.25 | `raw/summary-lag.txt` |
| 6초 끊김 뒤 끔 6.3초 유지 · 규칙 36.1초에 목표+0.5 안 · 13초 끊김 뒤 규칙 점프 3.54초 · WebKit 점프만 6.84초 유지, 13초 뒤 점프 4.37–4.63초 | `raw/summary-drift.txt` |
| WebKit에 배속 규칙: 첫 실행 60초에 배속 19번 · 지연 8.87–9.96초, 재실행 3번 · 8.5 → 3.3초, 13초 뒤 11번 · 흔들린 구간 앞 버퍼 2–3초 이하 | `raw/summary-drift.txt` · `raw/summary-drift-r2.txt` |
| 영상 `CatchupAfterStall` | `export-scene-data.mjs` → `motion/src/scenes/pokeclip-live-catchup-live-viewers-only/data.ts` |

## 쓰지 않은 것

- 내부 결정 기호, 이슈 키, 검토 과정, 계약 문서 번호, 비공개 경로 · 이미지 이름.
- 다른 플레이어(dash.js · ExoPlayer) 비교 — 이번 확인 범위 밖이라 글에서 뺐다.
