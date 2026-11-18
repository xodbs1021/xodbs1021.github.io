# 근거 — 되감기 목록만 gzip으로 압축하고 라이브 목록은 미뤘습니다

글 유형: **의사결정**(결정이 필요해진 제약 → 선택지와 기준 → 조건마다 각 대상이 어떻게 됐나 → 선택과 대가 → 적용 위험 · 운영 확인)

글: `content/posts/0-to-1/pokeclip-playlist-gzip.md` · 실측: `measurements.md` · 재측정: `measure/` · 콘티: `storyboard.md`

확인 날짜는 모두 2026-11-18. 코드는 3K-PokeClip/PokeClip-mono develop 머지 커밋 `31f2f32d`(PR 537)와 그 첫 부모 `999a51fb`를 `git show` · `git diff`로 직접 읽었다. 비공개 원천은 PR 본문 초안, 결정 기록, 운영 반영 기록(apply 출력 포함), 운영 실측 기록(브라우저 fetch 결과 · CDN 표준 로그 발췌 · 송출 관측 로그)이며 경로는 공개 저장소에 적지 않는다.

## 역할

| 무엇 | 누가 | 근거 |
|---|---|---|
| 범위: 되감기 · VOD 목록만, gzip만, 라이브는 후속 | 사용자 결정 | 결정 기록(비공개) · PR 본문 Design |
| 머지(CI 초록이면) | 사용자 결정 | 결정 기록(비공개), 머지 커밋 18:10 |
| Terraform · 시험 · 런북 구현 | AI(Claude Code · Codex), 커밋은 사용자 계정 | 커밋 작성자 = 사용자 계정 6건(f80aae6e … f9a269ce) |
| 운영 배포 설정 읽기 조회(고치기 전 compress · 압축 허용 모두 false) | AI | PR 본문 Why |
| edge apply | 승인 주체는 기록에서 확인되지 않아 글에 적지 않음 | 운영 반영 기록(비공개) |
| 운영 실측 | AI(브라우저 fetch) | 운영 실측 기록(비공개) |
| 공개 재측정 | AI(Claude Code), 이 글 작성 중 | `measure/raw/` |

## 주장과 근거

| 주장 | 근거 | 종류 | 확인 범위 |
|---|---|---|---|
| CloudFront 압축 조건(이 글은 넷만 따짐) · 둘 다 허용이면 brotli · 1,000–10,000,000B · Content-Length 필요 · mpegurl 대상 · 원본 Content-Encoding 이면 재압축 안 함 | AWS ServingCompressedFiles | 문헌 | 원문 대조 |
| gzip 만 허용 시 Accept-Encoding: gzip 정규화 · 키 포함 | AWS cache-key-understand-cache-policy #cache-policy-compressed-objects | 문헌 | 원문 대조 |
| Apple 10.1 MUST gzip | Apple HLS Authoring Spec(최종 주소 developer.apple.com/streaming/…) | 문헌 | 원문 대조 |
| 바뀐 목록은 마지막 조각 길이만큼 기다려 다시 받음 · PLAYLIST-TYPE VOD 면 다시 안 받음 | RFC 8216bis-22 6.3.4, render.go 76 · 155 | 문헌 + 코드 | 원문 행 대조 |
| 고치기 전 운영: 경로 규칙 일곱 compress false · 캐시 정책 압축 허용 없음 | PR 본문 Why(AI 읽기 조회) | 운영 조회 요약(공개 PR 본문) | 조회 원자료는 보지 않음 |
| MediaMTX v1.21.1 → gohlslib v2.4.5, 목록을 길이 없이 Write 한 번 | mediamtx v1.21.1 go.mod · muxer_instance.go 177–191, gohlslib v2.4.5 muxer_stream.go 315–422 | 코드 | 직접 읽음 |
| net/http 2,048B 버퍼 넘으면 chunked | go1.26.0 server.go 341 · 1327 · 1592–1595 | 코드 | 직접 읽음 + 재현 |
| 포크가 HLS 서버 파일 · go.mod 를 안 바꿈 | GitHub compare bluenviron v1.21.1…xodbs1021:v1.21.1-pokeclip.2(200, 49 파일, `internal/servers/hls` · `go.mod` 없음), 포크 go.mod gohlslib v2.4.5 | 코드 | 파일 목록 확인 |
| 상자 nginx proxy_buffering off · gzip 설정 없음 | nginx.conf.tmpl 74–77 · 113–127 | 코드 | – |
| proxy_buffering on 이어도 nginx 가 Content-Length 를 만들지 않음 | 재현 `raw/nginx.md` | 실측(로컬) | nginx 1.29.7 |
| gzip_proxied 기본 off · Via 로 프록시 판정 · any | nginx 문서 + 재현 | 문헌 + 실측 | 7,154B 는 gzip_comp_level 1 |
| CloudFront 가 원본 요청에 Via 를 넣음(2019) · 지금 문서는 시청자 Via 를 원본에 넘긴다고만 적음 | AWS ServingCompressedFiles 2019-12-11 보관본 「…Running NGINX」 절, 현 RequestAndResponseBehaviorCustomOrigin 헤더 표, re:Post 2020(보조) | 문헌 | 두 원문 직접 대조. 운영 상자가 받는 Via 미확인 — 글에 밝힘 |
| chunked 원본 응답은 받는 대로 넘기고 캐시 | AWS custom origin #ResponseCustomTransferEncoding | 문헌 | – |
| S3 목록 Content-Type mpegurl · Cache-Control 1초 / VOD 3600 | s3store.go 28–30 | 코드 | – |
| S3 GetObject 응답에 Content-Length | S3 API GetObject | 문헌 | – |
| 조각 Content-Type video/iso.segment | upload/s3.go 29–30 | 코드 | – |
| 목록 규칙 둘을 짝 앞에, 다른 것은 캐시 정책 · compress 뿐, dvr-floor 둘 다 | main.tf 22–136 | 코드 | – |
| 경로 규칙 아홉에 compress 명시, 기본 규칙은 명시 없음(provider 기본 false) | main.tf 213 · 228–240 | 코드 | – |
| 첫 구현은 /live/*.m3u8 · /dvr/* · /vod/* 에 compress + gzip · brotli | 커밋 f80aae6e diff | 코드 | 기각안으로 서술 |
| 시험이 compress 배열 · 목록 정책 gzip 만을 단언 | tftest 429–467 | 코드 | 시험은 다시 돌리지 않음 |
| 적용 직후 gzip 변형 첫 요청 MISS | 런북 822–871, PR 본문 한계 | 코드 문서 | 되감기 목록은 max-age=1 Miss 와 가를 수 없음 · VOD 목록은 19:07:54 Miss → 19:08:17 Hit 둘 |
| 자리 밀림 대조 · 함수 연결 하나 늘고 줄지 않음 · 되돌림 거울 | 런북 822–871 | 코드 문서 | 자리 번호는 글에 쓰지 않음 |
| DeleteCachePolicy 사전 판정 목록에 없음 → 「거부될 수 있다」 | 런북 845– | 코드 문서 | – |
| 끄기 확인 기대값을 체크아웃 grep 으로 | 런북 2191–2206 | 코드 문서 | – |
| apply 생성 1 · 변경 1 · 삭제 0 | apply 출력(`Apply complete! Resources: 1 added, 1 changed, 0 destroyed.`) | 운영 기록(비공개) | – |
| apply 시각 18:12–13 · Deployed 18:13 · 재plan 0 · plan 두 줄 · 자리 대조 일치 · 함수 연결 추가 1 제거 0 | 운영 반영 기록(비공개) | 운영 기록 | apply 출력에는 시각 · 재plan 이 없다 |
| 운영 실측: /dvr 목록 풀린 8,727B(Last-Modified 09:34:41 UTC) · Content-Length 없음 · 그 판을 받은 18:34:44 두 줄 1,306B Miss · 1,305B Hit · 같은 분 다른 판 1,258–1,328B · 20줄 sc-content-len「-」 | 브라우저 fetch 결과 · CDN 표준 로그 발췌(비공개) | 운영 실측 | 머리 글자(Content-Encoding · Vary)는 CORS 로 못 봄 — 글에 밝힘 |
| 운영 실측: VOD 목록(18:31 방송, 화면 길이 7분 56초) 풀린 22,679B · Content-Length 없음(fetch 19:08:17 두 번) · 로그 1,644B Miss(19:07:54) · 1,641 · 1,632B Hit(19:08:17) · sc-content-len「-」 | 브라우저 fetch 결과 · CDN 표준 로그 발췌(비공개) | 운영 실측 | – |
| 적용 전 VOD 목록(같은 경로 꼴, 다른 방송) sc-content-len 9,674 · 132,481 · sc-bytes 10,272 · 133,216(10:18 · 11:35 KST) | CDN 표준 로그 발췌(비공개) | 운영 실측 | 같은 경로 꼴 · 다른 방송이라는 것은 운영 실측 기록 요약을 따름(발췌에 경로 칸 없음) |
| VOD 플레이어도 조각을 /dvr/…/seg/*.m4s 에서 받음 | 브라우저 리소스 목록(비공개) | 운영 관측 | 다시 받지 않음 |
| 조각 3,083,523 = Content-Length · 라이브 index.m3u8 802 = Content-Length · max-age=30 | 브라우저 fetch 결과(비공개) | 운영 실측 | 라이브 쪽은 다중 변형 목록(gohlslib muxer.go 24 · 701–738) |
| 시험 방송 18:21–18:28 · 18:31–18:39, 첫 방송은 브라우저가 머리 · 크기를 가려 판정 자료 없음, fetch 결과는 둘째 방송 | 송출 관측 로그 두 개 · 운영 실측 기록(비공개) | 운영 기록 | 둘째 로그에 정지 줄 없음 — 끝 시각은 운영 실측 기록 |

## 원천끼리 어긋난 것

- 라이브 목록에 길이가 없는 까닭: 「MediaMTX 가 2KB 넘는 목록을 chunked 로 보내고 상자 nginx 가 proxy_buffering off 이기 때문」이라는 서술과 달리, 재현에서 nginx 는 proxy_buffering on 이어도 Content-Length 를 만들지 않았다. 원인은 상류 chunked 이고 off 는 그대로 흘려보낼 뿐이라고 썼다. 「2KB」는 정확히 2,048B(net/http `bufferBeforeChunkingSize`)다.
- 운영에서 받은 라이브 `index.m3u8`(802B)은 max-age=30 이 붙은 **다중 변형 목록**이다. 1,000B 하한 아래이고 2,048B 아래라 길이가 있다. 2,048B 를 넘는 라이브 미디어 목록은 운영에서 재지 않았다.
- 「CloudFront 가 압축하면서 Content-Length 를 뺐다」는 AWS 문서에 명시가 없어 「…보낸 것으로 봅니다」로 썼다.
- 시험 방송은 두 번(18:21–18:28 · 18:31–18:39)이고 CDN 로그 20줄은 두 방송에 걸친다.
- 함수 연결 추가는 plan 에서는 밀린 /dvr/* 자리에 보이고, 뜻으로는 새 목록 규칙만큼 하나 는다. 글은 자리를 쓰지 않았다.
- PR 본문 「gzip 5–10KB」 vs CLI gzip -6 5,497–9,768B · 2편 Go gzip 5,445–9,528B: 구현 차이(1–3%). 글에서는 2편과의 비교 문장을 뺐다.

## 운영 서술 정리

「고치기 전 운영에서는 압축이 빠져 있었고, 고친 뒤 실측으로 압축을 확인했다」 꼴로 정리했다(첫 문단 · 첫 절 소제목과 끝 문장 · 마지막 절). 남은 표시는 없다.

## 공개 금지 점검

예시 도메인만 씀(media.example.com). 배포 ID · 캐시 정책 ID · 운영 정책 실제 이름 · ARN · 계정 ID · 쿠키 · 사설 주소 · 상자 경로 · 운영 방송 · 세션 · 회차 식별자 없음(측정 표본의 세션 꼴 ID 는 지어낸 값). Jira 키 · 판 번호 · 결정 코드 · 리뷰 라운드 · 자리 번호 · 런북 시험 번호 · 팀원 이름 · 볼트 · 로컬 경로 없음. PR 은 「PokeClip-mono PR 537」.
