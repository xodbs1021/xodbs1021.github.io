# 근거 메모 — pokeclip-editor-seek-loop

유형: 트러블슈팅(증상 → 헛다리 셋 → 원인 → 조치와 기각한 대안 → 운영 전후). 공개 근거만 적는다. 비공개 기록에서 옮긴 값은 `measurements.md` 에 주소 · 쿠키 · 계정 없이 둔다.

## 역할

- 결정: 사용자 — 고침 착수(11-16 06:24 「(가)」, 티켓 · 고침 PR), PR 520 머지(06:54 「머지하고 저장해」), 기록 도구의 사이트 허용 창 승인(2차 실험, 05:45 전), 운영 재빌드 승인(`ㄱㄱㄱ`), 이미지 푸시 · 운영 반영(apply)을 각각 승인(재빌드 기록 「푸시 · apply」 절의 각각 승인 표기). 근거: 비공개 진행 기록 · 결정 기록, 공개는 PR 520 「리뷰 · 머지」(「머지는 사용자 승인 뒤」).
- 조사 · 원인 확정 · 구현 · 시험 · 실측: AI(Claude Code와 Codex). 운영 페이지 계측은 Claude Code 가 띄운 하위 Claude(Claude in Chrome 도구)가 사용자 Chrome 에서 했다.
- 이 글의 재측정: AI(Claude Code), 2026-11-16 07:20–07:22 KST(1 · 2회차), 07:51(3회차, 실행기 확인).
- 글의 「제가」 문장: 고침 착수 · 머지 결정, 운영 반영 승인, 사이트 허용 창 승인, 「제 Chrome」(로그인 세션). 모두 위 기록에 근거.

## 사실 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 편집기는 S3 되감기 목록 창 조각을 mediabunny 1.65.2 로 다시 인코딩 없이 mp4 하나로 싸서 Blob → blob: 주소로 튼다 | `remuxWindow.ts`@2e989769 머리 주석 · 78행 `new Blob` · `useEditorVideoPlayback.ts`@2e989769 312행 `createObjectURL` · `web/package.json` mediabunny 1.65.2 | 코드 |
| 편집기는 숨긴 영상 노드 둘(재생 · 필름띠)이 같은 Blob 을 쓴다 | 운영 계측 result3(노드 표) · result6 nodes[0]/[1] | 실측(비공개) |
| 04:34 운영 확인: 망 기록 blob: GET 21건 = 503 18 · 206 3, 콘솔 `Document hidden` 1줄, 재생 정상 · 검은 화면 없음 | prod-playback0 result.md | 실측(비공개) |
| 카드를 연 편집기 미리보기가 재생 전 검은 화면, 재생하면 바로 나옴, 약 20초(05:52, 503 을 좇은 계측의 덤) | result3 「6단계」 | 실측(비공개) |
| 기록 도구 blob: 53건 = 503 ×46 · 206 ×7, 같은 페이지 CDP 는 revoke 전 15건 206 · revoke 뒤 6건 ERR_FILE_NOT_FOUND, detach 23건 전부 503 | README 1·2차 | 실측(비공개 · 로컬 합성 파일) |
| 운영 편집기 revoke 뒤 읽기 사건 0(10초), 두 노드 비운 뒤 revoke | result3 요약 1–3 · 코드 `useEditorVideoPlayback.ts:386-394` · `useSceneFrames.ts:174-175`(진행 노트 인용) | 실측(비공개) · 코드 |
| 숨김 꼴(1px · opacity 0 · preload auto) 로컬 1초 안 readyState 4 | 진행 기록 06:01 줄 · site/hidden.html | 실측(비공개, 결과 원문은 진행 기록 한 줄) |
| 보임 상태 내내 visible · focus true, 재생 노드 readyState 1 · seeking true · networkState 1 · t=10.44 로 36초, 필름띠 노드 ready 4, 재생 누르자 풀림 | result4 덤프 | 실측(비공개) |
| 로컬 변형 6 모두 1초 안 ready 4 | result5 | 실측(비공개) |
| 같은 Blob 새 노드 4 변형 1초 안 시크 끝(밝기 38), 재생 노드만 고착, buffered 0–81.24, 다시 옮겨도 안 풀림 | result6 | 실측(비공개) |
| 21ms 마다 같은 자리(10.437) 다시 넣기, 재생 누를 때까지 48초, 그 사이 muted · pause · play · playbackRate 없음, 블록 7줄(넣기 2 · seeking 2) | result7(36730 loadedmetadata → 85026 play() = 48.3초 · 54회 블록 83866..85002 → 평균 21.4ms) | 실측(비공개) |
| 초당 약 47번 시크 | README · 진행 노트(1000/21) | 실측(비공개)에서 셈 |
| Chrome 은 µs 아래를 버림: 원 실험 5값 | README 「확정」 | 실측(비공개) |
| 공개 재측정 7값 · 틱 900 · ms 1000 · 최소 재현 | measure/raw/chrome.json · summary.md | 실측(공개) |
| Chromium: `HTMLMediaElement::Seek` 가 `MediaTimeForTimeValue` 로 바꾼 값을 `last_seek_time_` 로 둠, `WebMediaPlayerImpl::MediaTimeForTimeValue` = `base::Seconds(t).InSecondsF()`, `Seek` → `DoSeek(base::Seconds(seconds))` → `paused_time_`, `CurrentTime` = `GetCurrentTimeInternal().InSecondsF()`, `base::Seconds` = `ClampedNumeric(n) * kMicrosecondsPerSecond` → int64 `saturated_cast`(static_cast 처럼 0 쪽 버림) | chromium/chromium 태그 157.0.8103.51 = 커밋 653674df…2d31 | 문헌(1차 소스) |
| HTML 표준 시크 절차: 위치를 바꾸는 단계는 끝 · 가장 이른 위치 · seekable 범위와 fastSeek 근사뿐, 끝에 timeupdate → seeked | html.spec.whatwg.org/multipage/media.html#seeking (2026-11-16 확인) | 문헌 |
| MDN: 브라우저는 currentTime 에 타이머 반올림을 하지 않는다, 시크는 매체가 지원하는 위치로 조정할 수 있다 | MDN HTMLMediaElement.currentTime 「Time precision」 (2026-11-16 확인) | 문헌 |
| 부동소수 왕복 훑기 오차 0(정수 ms 시작 · 1.79e12 ms 기준 · 2,163 × 9) | README 「확정」 · 진행 노트 | 시험(비공개) |
| 훅 단위 재현 표 999번 · 상한 500 · 모의 노드가 timeupdate · seeked 둘 다 | README · PR 520 Why 4 · scratch 사본 | 시험(비공개) · 문헌(PR) |
| 고침 = `startSeconds - LOOP_START_TOLERANCE_SECONDS`(1ms), 끝 판정 · 반복 되감기 · 반복 끈 앞쪽 시크 그대로 | PR 520 What · `editorPlayback.ts`@2e989769 30 · 39–49행 | 코드 |
| 1ms 까닭 · 기각한 대안 셋 · 남은 한계 셋 | PR 520 설계 · 남은 한계 | 문헌 |
| 정식 시험 상한 50, 고치기 전 99번 → 1번 · 단위 시험 −0.9µs / −10ms / 끝 앞 −0.5ms | PR 520 Test plan · `useEditorVideoPlayback.test.ts`@2e989769 1171–1223 · `editorPlayback.test.ts`@2e989769 35–42 | 코드 · 문헌 |
| 변이: 여유 1µs · 5ms 생존 → 「0.9µs 초과 · 10ms 미만」 만 보장 | PR 520 Test plan · 남은 한계 | 문헌 |
| 머지 2026-11-16 06:54:20 KST, 머지 커밋 2e989769 | `git log -1 2e989769`(로컬 클론) · PR 520 | 코드 |
| 운영 반영: 웹 이미지를 2e989769 로 다시 빌드 · 푸시 · apply, 롤아웃 07:09:06 | 비공개 재빌드 기록 | 기록(비공개) |
| 운영 실측: 두 카드 모두 위치 넣기 1 · seeking 1 · seeked 1, 15초 뒤 readyState 4 · seeking false, 원본 · 결과 미리보기 그림 있음, 재생 안 누름 | 비공개 운영 실측 결과(2026-11-16 운영 반영 뒤 실측 기록) | 실측(비공개) |

## 정정 · 해석 · 원천 차이

- 원 실험 페이지는 일곱 값을 넣었지만 README 에는 다섯 값만 옮겨 적혀 있다. 공개 재측정(Chrome 157)으로 일곱 값을 모두 다시 쟀다(10.4379999999 → 10.437999, 7.1234565 → 7.123456). 원 실험의 Chrome 판은 기록에 없다.
- 원 실험 기록은 「넣은 직후」 와 「seeked 뒤」 를 나누지 않았다. 재측정에서 둘은 모든 경우 같았다(Chromium `Seek` 이 `MediaTimeForTimeValue` 로 미리 버린 값을 시크 중 currentTime 으로 돌려주는 것과 맞는다).
- 운영 반영 시각: 재빌드 기록(next 재빌드 README 「푸시 · apply」)에 푸시 07:03:45 · apply 07:05:57 · 롤아웃 COMPLETED 07:09:06 이 있다(첫 작성 때 이 절을 놓쳐 「원문에 없다」 고 잘못 적었다). 본문에는 「11월 16일 운영 반영」 까지만 쓰는 판단은 유지한다.
- result4 의 「36초」 는 기록 시작(편집 클릭 직후)부터 재생을 누르기 전 마지막 표본(36,001ms)까지다. 원인 추적(result7)의 「48초」 는 다른 회차(첫 시크 36,730ms → play() 85,026ms)다.
- 「21ms」 는 재생 직전 54회 블록의 평균 간격(83,866 → 85,002ms)이다. 진입 직후 필름띠 노드가 같이 시크하던 동안은 약 34–41ms 간격이었다(result7 앞 100줄).
- 공개 재측정의 순환은 세 실행에서 초당 seeked 159–358번(중앙값 간격 2.7–6.1ms)으로 운영(초당 약 47번)보다 훨씬 빨랐다. 헤드리스 · 작은 합성 영상 · 편집기 화면 없음의 차이로 보이며 원인은 확인하지 않았다. 「끝없이 되풀이」 와 「1ms 여유로 1번」 이라는 꼴만 같다.
- 「Firefox 는 지문 방지 설정에서 시간 정밀도를 낮출 수 있다」 는 PR 520 남은 한계의 예시이고 실측이 아니다. 현재 MDN 은 currentTime 에 타이머 반올림을 하지 않는다고 적는다. 본문에는 「1ms 보다 거칠게 깎는 브라우저가 있다면」 이라는 조건으로만 쓴다.
- Playwright 1.64.1 의 Firefox · WebKit 빌드는 이 기계에 깔려 있지 않아 재지 않았다(run.mjs 는 지원).
