# 근거 메모 — VPC 안의 요청 경로 (유형: 설계·아키텍처, 독자 장면: 온보딩)

팩트 시트는 ../pokeclip-cloud-architecture/research-*.md 공유. 코드 발췌 원문은 저장소 밖 /tmp/pkc-excerpts(비공개 저장소라 저장소 안에 두지 않음).

| 주장 | 근거 | 확인일 | 구분 |
|---|---|---|---|
| 컨테이너 7개, nginx·sidecar·ingest-auth·janitor가 network_mode service:mediamtx, 공개 포트는 mediamtx만(프록시 4 + 8890/udp), cred-relay host 망 169.254.170.2:9911, timing-preflight 1회 | compose.yml.tmpl:74-78,181-186,200-231,396-400,435-437,525-531,602-615 | 11-25 | 실측(코드) |
| 8888·9996·9997 루프백만 | mediamtx.yml.tmpl hlsAddress·playbackAddress·apiAddress; nginx.conf.tmpl 22-25 | 11-25 | 실측(코드) |
| restart no(mediamtx·nginx) → compose 전체 내려감, 나머지 on-failure, systemd 20초 | compose.yml.tmpl:90-98; pokeclip-media.service:38,56-67 | 11-25 | 실측(코드) |
| cap_drop ALL, nginx만 CHOWN·SETGID·SETUID, 비밀 tmpfs | compose.yml.tmpl:115-126,147-150,213-216 | 11-25 | 실측(코드) |
| 시작 스크립트 순서 | bin/start-media.sh:5-60 | 11-25 | 실측(코드) |
| SRT만, 다른 프로토콜 끔, authMethod http→127.0.0.1:8080/mediamtx/auth, playback 제외, overridePublisher no | mediamtx.yml.tmpl:33-40,74-77,159-163 | 11-25 | 실측(코드) |
| 응답기→Auth 4C, 틀린 키 200 valid:false | 볼트 M15 10-24·architecture Media↔Auth; cmd/ingest-auth | 11-27 | 문헌값(볼트)+코드 |
| 응답기→Auth SG 직결 | security_groups.tf:62,86-91 | 11-25 | 실측(코드) |
| #6306 패치, 상류 PR | Dockerfile.mtxhook:46-60; github PR 6306(열림 11-25) | 11-25 | 실측 |
| live-auth: 조작 표지·.m3u8/.mp4 아니면 403, KVS cdn-secret Bearer 덮어씀, 못 읽으면 503 | functions/live-auth.js 머리 주석·handler | 11-25 | 실측(코드) |
| 라이브 목록 1초·_HLS 쿼리 3개 | cdn_media/main.tf:46-53·policies | 11-25 | 실측(코드) |
| 내부 ALB 규칙 /live/*→rewrite /$1, /api/streams/*/rewind·/api/ingest/*→control, /playback/*→rewrite, 기본 404, 443 TLS, 유휴 60s | load_balancers.tf:103-128,:10; modules/alb/main.tf:77-89 | 11-25 | 실측(코드) |
| CF VPC origin https-only, 연결 3초·2회, 응답 30초 | cdn_media/main.tf:142-197 | 11-25 | 실측(코드) |
| nginx 4 블록(live 400/8888, playback 403·404/9996, control 8086, health 200), raw_path_unsafe 정규식, 로그 형식, server_tokens off, absolute_redirect off, proxy_buffering off, read_timeout 90s, Go net/http 전제 | nginx.conf.tmpl 전문(196행) | 11-25 | 실측(코드) |
| playback 대조 규칙·우회 시험 | nginx.conf.tmpl:85-98,133-141; 공개 글 nginx-playback-request-boundary(PR #311) | 11-25 | 실측(코드)+문헌값 |
| 같은 망 칸 누구나 /list·/get 호출 가능(받아들인 위험) | mediamtx.yml.tmpl 옛 모드 주석(92-121) | 11-25 | 실측(코드) |
| 관리 API 9997 프록시 없음, api 권한 범위 | nginx.conf.tmpl:22-25; mediamtx.yml.tmpl:46-50 | 11-25 | 실측(코드) |
| 제어면 :8086 GET /api/streams/{id}/rewind, POST /api/ingest/end-signal, 상류 비면 404 | nginx.conf.tmpl:158-174; README.md:832-870 | 11-25 | 실측(코드) |
| 되감기 조각→S3 직행, 사이드카 장부·업로드·렌더·조건부 PUT, 5분마다 KVS 하한, janitor 유일 쓰기 | README.md:899-925; cmd/janitor/main.go:1-3; 공개 글 sidecar·dvr-cookie | 11-25 | 코드+문헌값 |
| SG 이그레스 넷·인그레스, IAM 토큰·verify-full, 홉 1, Secrets Manager 인터페이스 엔드포인트 | security_groups.tf:16-35,59-63; pgconf.go:48-50; media_host/main.tf:70-75; prod/network/main.tf:4-7 | 11-25 | 실측(코드) |
| 제어면 연결은 추정 | research-code 「모름」 | 11-27 | 미검증(본문에 추정으로 표기) |
| 프록시 포트·헬스 경로·스위치 운영 값 비공개 | tfvars 미추적 | 11-25 | 미확인(본문에 명시) |

역할 문장 출처: nginx-playback(「nginx를 남기기로 한 것은 제 결정」, 규칙·시험 AI), stateful(「배치와 수신 경로 … 제가」).
영상 ViewerRequestGates의 예시 경로 /live/s1//index.m3u8: 겹 슬래시는 nginx raw_path_unsafe(//)로 400. live-auth는 % · 역슬래시만 보고 빈 구간은 정규화 뒤 못 볼 수 있음(live-auth.js 주석) → 설명용 예시로 타당.
| 응답기→MediaMTX 응답: 허용 200 {"srtPassphrase"}, 판정 거절 401(본문 없음), 바깥 시한 503 | media/internal/ingestauth/publish.go:266-305(writeAllowed·writeDenied), media/cmd/ingest-auth/CONTRACT.md | 2026-11-27 | 실측(코드) |
| Auth→응답기 응답: 없는 키도 200 valid:false, 정보 로그 | services/auth StreamKeyResolveController.java:25-34 | 2026-11-27 | 실측(코드) |
| 인터페이스 엔드포인트 private DNS: 변수 interface_endpoint_private_dns 기본값 true(되돌리기 스위치), prod는 변수로 넘겨 운영 값 미확인 | modules/network/variables.tf:81-85; modules/network/main.tf:188; prod/network/main.tf:20 | 2026-11-27 | 실측(코드) |
