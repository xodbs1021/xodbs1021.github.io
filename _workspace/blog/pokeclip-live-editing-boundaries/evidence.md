# evidence — pokeclip-live-editing-boundaries (다시 쓰기, 2026-11-11)

유형: 설계·아키텍처. 코드 근거는 PokeClip-mono develop `825a3dfe`.

## 역할

- 작성자: 전체 구조, 미디어·인프라 경계, 상태 전이 기준.
- 팀원: Spring 코어, 렌더 일꾼, 웹, OBS 플러그인 주 구현(이름·로그인 쓰지 않음).
- AI(Claude Code · Codex): 미디어 계층 구현·실측. 8월 3일 멀티오디오 시험은 AI 자동 실행(작성자 참여 여부는 단정하지 않음).

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 장부 칸(start_pts_ms · start_wall_utc · duration_ms · s3_key/upload_state · playback_*) | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/ddl.go#L39-L56 | 공개 코드 |
| 재포장본 = 첫 영상 · 첫 소리 트랙(트랙 0 = 종합 믹스), 메모리 재포장 | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1358-L1362 | 공개 코드 |
| 트랙 0 = 최종 믹스, 1–5 = 소스별 | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/src/main/java/com/pokeclip/render/recipe/Recipe.java#L82 | 공개 코드 |
| 되감기 목록은 재포장본 업로드 확인분만 | 팀 내부 결정(8월 30일 갱신, 비공개), live-dvr-separation 글 | 공개 글 |
| 11/2 벽시각 용도 축소 · 미디어 좌표, #475 · #496 draft | media-timeline 글 112–130 · 169–175행, gh pr view | 공개 |
| #289 10/19 22:06 KST 머지 | gh pr view 289 | 공개 |
| v1.0.0 11/3 03:32 KST, 이미지 목록(render/upload 없음) | gh pr view 466 본문 | 공개 |
| 10/19 dev 계정별 방송 반영·실측, 11/6 운영 주소 공개 | 팀 내부 기록(비공개), 사용자 공개 허용 | 비공개 |
| 11/10 회차 VOD 운영 반영 | round-vod 글 126행 | 공개 글 |
| 61파일 = 61행(8/3, OBS 32.2.0, MediaMTX 1.19.3) | multiaudio-end-to-end-verification 글 링크로만 | 공개 글 |
| PDF 5쪽 「되감기 발행 계층과 dev-media 연동은 진행 중」 | static/portfolio/2026-10-15-v2/full.pdf 5쪽 | 공개 |

## 사용자 지시와 다른 점

- 없음. 렌더·업로드 일꾼은 지정 문장만 씀.
