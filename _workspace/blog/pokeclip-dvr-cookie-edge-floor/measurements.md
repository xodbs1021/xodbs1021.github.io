# 실측 요약 — 서명 쿠키는 종류별로 나누고 1시간 창은 엣지에서 막았습니다

글: `content/posts/0-to-1/pokeclip-dvr-cookie-edge-floor.md`

이 파일은 두 갈래다.

1. **공개 재측정** — 누구나 다시 돌릴 수 있다. 스크립트 · 원자료는 `measure/` 에 있다.
2. **비공개 기록 요약** — 실험 계정에서 잰 팀 내부 기록. 계정 · 배포 · 함수 · 저장소 이름과 주소는 옮기지 않았다.

## 1. 공개 재측정

- 실행: AI(Claude Code), 2026-11-18 02:42 KST. MacBook Air(Apple M5), macOS 27.0.1, Node.js 26.4.0(`raw/env.txt`).
- 대상: 3K-PokeClip/PokeClip-mono develop `627fb5a20ecb9d221fcc030c26adcbbcbe12c04e` 를 `git archive` 로 `/tmp/dvrurl-run-mono` 에 풀었다(2026-11-18 재확인 때 경로를 바꿈 — 처음 실행은 `/tmp/dvrurl-mono`)(`infra/terraform/modules/cdn_media` · 공유 골든).
- AWS · docker 를 쓰지 않았다. node 는 CloudFront 런타임이 아니므로 **함수 코드의 판정**이지 실제 엣지 동작이 아니다.
- 명령: `MONO_DIR=<클론> ./run.sh extract` → `./run.sh all "$PWD/raw"` → `./run.sh down`.

### 1.1 저장소 함수 시험(`raw/functions-test.txt`)

`node --test infra/terraform/modules/cdn_media/functions/test/*.test.mjs` — tests 246 · pass 246 · fail 0 · exit 0.

### 1.2 dvr-floor 결정 표(`raw/floor-table.tsv`)

스트림 `s1` · 회차 `r1` · 하한 `1200` 은 지어낸 값. 한 경우에 한 번씩.

| 경우 | 결정 | KVS 호출 exists/get | 함수 로그 |
|---|---|---|---|
| 하한 아래(1199) | 404 · no-store | 1/1 | DVR FLOOR DENY s1 r1 1199 floor=1200 |
| 하한과 같음(1200) · 위(1201) | 넘김 | 1/1 | – |
| 키 없음 | 넘김 | 1/0 | – |
| KVS exists 실패 | 넘김 | 1/0 | DVR FLOOR KVS ERROR |
| KVS get 실패 | 넘김 | 1/1 | DVR FLOOR KVS ERROR |
| 값 `01200` · `abc` | 넘김 | 1/1 | DVR FLOOR VALUE INVALID |
| 경로 변조 표시 넷(퍼센트 · 점 구간 · 빈 구간 · 역슬래시) | 404 · no-store | 0/0 | DVR FLOOR MALFORMED |
| 안전 정수 밖 번호 | 404 · no-store | 0/0 | DVR FLOOR MALFORMED |
| 옛 꼴 조각 · 목록 · init · OPTIONS | 넘김 | 0/0 | – |

### 1.3 와일드카드 시연(`raw/wildcard.tsv`)

매처: `*` → `[^;]*`(문서대로 리터럴 세미콜론은 넘지 못함), `?` → `.`, 나머지 글자 그대로, 전체 일치. 세미콜론 예외는 2026-11-18 재확인 때 넣었고, 넣기 전후 결과 파일이 같다(`diff` 0). 양성 대조로 AWS 문서 예시 `…/*game_download.zip*` 가 「would include」 로 든 세 주소에 모두 맞았다(3/3).

| 요청 | 옛 `{base}/*/A/*` | 앞 * 가 먹은 글자 | 종류별 정책 | 보낼 쿠키 Path |
|---|---|---|---|---|
| /live/A/index.m3u8?_HLS_msn=3 | 일치 | live | live | /live/A |
| /dvr/A/r1/seg/001201.m4s | 일치 | dvr | dvr | /dvr/A |
| /live/B/index.m3u8?x=/A/ | **일치** | live/B/index.m3u8?x= | 없음 | 없음 |
| /vod/B/x/A/index.m3u8 | **일치** | vod/B/x | 없음 | 없음 |
| /live/B/index.m3u8 | 불일치 | – | 없음 | 없음 |
| /playback/A/list?path=B | 일치 | playback | playback | /playback/A |

마지막 줄은 정책이 쿼리를 못 막는다는 대조(nginx 가 막는 이유)다.

## 2. 비공개 기록 요약

원천: 실험 계정 CloudFront 쿠키 · KVS 실측 보고(2026-11-03 09:20–09:39 KST, 실험 뒤 자원 0 확인). 실행은 AI(Claude Code), 비용 승인은 사용자.

- 조건: CloudFront 배포 1 · POP 1곳 · curl 1개(브라우저 미측정) · 사용자 지정 정책만.
- 쿠키 Path 포개짐: 같은 이름의 쿠키 세트 둘을 겹치는 Path 로 두면 CloudFront 가 이름마다 값을 따로 골라, 섞이면 403.
- 쿠키 검사 순서: 쿠키가 없으면 함수와 무관하게 403 `MissingKey` — 쿠키 검사가 함수보다 먼저.
- KVS 전파(수렴 = 2초마다 같은 요청 10건 한 바퀴, 10/10 이 5바퀴 연속): 넣은 뒤 첫 404 21초(첫 실험) · 30초(전파 실험 2회차 — 1회차는 앞 삭제가 덜 퍼져 첫 반영 무효), 수렴 37초 · 61초. 지운 뒤 첫 200 11초(첫 실험) · 18초 · 16초, 수렴 49초 · 45초. 그 사이 404 · 200 이 섞임.
