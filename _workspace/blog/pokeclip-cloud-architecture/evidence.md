# 근거 메모 — PokeClip 클라우드 아키텍처 (유형: 설계·아키텍처, 독자 장면: 면접관)

팩트 시트: research-code.md(저장소 origin/main 7b09bee1, 2026-11-25) · research-vault.md · research-posts.md. 아래 「공개」는 원자료 공개 여부.

| 주장 | 근거 | 확인일 | 구분 |
|---|---|---|---|
| 미디어 서버만 EC2, 코어는 ECS Fargate, 7/20 결정, EKS·관리형 미디어 기각 | 공개 글 stateful-media-deployment; 볼트 ADR-013 07-20 | 11-27 | 문헌값(공개 글) |
| 교체 배포 시 SRT 연결·업로드 전 파일 손실 | stateful-media-deployment 본문 | 11-27 | 문헌값 |
| 활성 키 한 대만 대상 그룹, 교체는 새 상자 띄운 뒤 이동 | modules/media_host/main.tf:1-7,106-118 | 11-25 | 실측(코드) |
| c8gn.large arm64, gp3 150GiB, 공인 IP 없음, IMDSv2·홉 1 | media_host/main.tf:53-83,70-75; tfvars.example | 11-25 | 실측(코드) |
| 기준은 네트워크 대역폭 | 볼트 결정 10-23 | 11-27 | 문헌값(볼트) |
| c8gn 재고 부족으로 교체 3회 막힘, 제자리 전환 | 볼트 11-13·11-18 | 11-27 | 문헌값(볼트, 비공개 운영 기록 요약) |
| 정지 TERM 30초, systemd 재시작만 | systemd/pokeclip-media.service; 공개 글 media-host-restart-lifecycle | 11-25 | 실측(코드)+공개 글 |
| CF 경로 규칙(/live→VPC origin→내부 ALB, /dvr·/vod→S3 OAC+Origin Shield, 기본 404) | cdn_media/main.tf:33-135,142-197 | 11-25 | 실측(코드) |
| 라이브 목록 1초 캐시·_HLS 쿼리만 키, 되감기·VOD 목록 gzip, 조각 0/1/86400, 캐시 키에 쿠키·헤더 없음 | cdn_media/main.tf·policies.tf | 11-25 | 실측(코드) |
| /hot·/cold 기각(7/25), 오리진 대체 폐기(8/30), 세 번 변경 | 공개 글 live-dvr-url-split; ADR-020 | 11-27 | 문헌값 |
| 1,254→28건(50VU·25초·1회, 원자료 비공개), 운영은 Bearer·hlsCDNSecret, 운영 감소량 미측정 | 공개 글 cdn-cache-auth-measurement; live-auth.js | 11-27 | 문헌값+코드 |
| 쿠키 12장(4종×3), 60분 | PlaybackAccessSigner.java:22-31,94; PlaybackProperties.java:56; 공개 글 dvr-cookie-edge-floor | 11-25 | 실측(코드) |
| NLB UDP 8890, 프라이빗 서브넷, EIP·Bastion·SSM 3개 기각, 월 약 50달러(7월 추정) | ADR-021 07-27; 공개 글 stateful-media-deployment | 11-27 | 문헌값 |
| 이그레스 443(S3·NAT)·5432·auth·clip 포트 | media_host/security_groups.tf:59-63 | 11-25 | 실측(코드) |
| 페어링 코드 8자·일회용; 응답기→Auth 4C; 틀린 키도 200 valid:false; overridePublisher no; #6306 패치 | 공개 글 one-time-pairing-contract; 볼트 ADR-019·M15; mediamtx.yml.tmpl; Dockerfile.mtxhook | 11-25 | 문헌값+코드 |
| 송출 규약 MPEG-TS·H.264·AAC·GOP 2초 | mediamtx.yml.tmpl 주석(ADR-020) | 11-25 | 실측(코드) |
| 녹화 4초 fMP4, 훅, 장부 stream_segments, 조건부 PUT, 재스캔, janitor | mediamtx.yml.tmpl:166-176; media/README.md; 공개 글 sidecar·indexer-recovery·database-authoritative | 11-25 | 코드+문헌값 |
| 라이브 창 28초(4×7), 되감기 1시간, 60일 | mediamtx.yml.tmpl hlsSegmentCount 7; README 901-903; 공개 글 dvr-cookie | 11-25 | 실측(코드) |
| ECS 서비스 5 + 일꾼 0↔1대, Cloud Map, SNS FIFO→SQS FIFO, 큐 시한 600/120/900, 수신 3, DLQ | prod/platform/services.tf; workers/scaling.tf; runtime/job_queues.tf:25-33; broadcast_events.tf | 11-25 | 실측(코드) |
| Spring 전환 7/31 이유 | 공개 글 language-ownership-boundaries | 11-27 | 문헌값 |
| RDS PG17 t4g.medium 단일 AZ(원안 Multi-AZ, 8/1), 백업 7일, IAM 토큰·verify-full, 15분/약 20분 | runtime/rds.tf:44-102; pgconf.go:48; 공개 글 shared-db-auth-iam-tls·stateful | 11-25 | 코드+문헌값 |
| fail-closed 503 / fail-open 404 | live-auth.js·dvr-floor.js 머리 주석 | 11-25 | 실측(코드) |
| OIDC는 ECR 푸시까지, 적용은 제가 승인 | prod-images.yml:1-10; ci_roles.tf:41 | 11-25 | 실측(코드) |
| 상자 한 대·대기 없음, RDS 단일 AZ, ECS 단일 태스크, 경보 보류 | 볼트 11-18·결정 25·18 | 11-27 | 문헌값(볼트) |
| 라이브 목록 gzip 미구현 이유 | 공개 글 playlist-gzip | 11-27 | 문헌값 |
| 공개 운영 11/6 | 볼트 O8 11-06 | 11-27 | 문헌값(볼트) |

싣지 않은 것: 11월 요금 소계·서비스별 요금·월 예산(공개 여부 kty 미확인), 리스 계정 만료, 계정 ID·다이제스트, 송출 1개 실측 CPU·메모리(비공개), 동시 30방송 디스크 추정(비공개).
역할 문장 출처: stateful-media-deployment(「배치와 수신 경로, DB 선택은 제가」), nginx-playback(「nginx를 남기기로 한 것은 제 결정」), live-dvr-url-split(「방향은 제가 정하거나 승인, 구현 AI」), dvr-cookie(쿠키 정책 분리 팀원), shared-db-auth(Java 넷 팀원), 볼트 ADR-007(next·플러그인·Spring 팀원).

## 라운드 2·3 추가 근거
| 주장 | 근거 | 확인일 | 구분 |
|---|---|---|---|
| Terraform 경보: 되감기 하한(로그 지표 둘+FunctionExecutionErrors), 일꾼 깨우기·재우기, clip 방송 종료 감지 | prod/edge/dvr_floor_alarms.tf; prod/workers/scaling.tf:131,169; prod/platform/reaper_alarms.tf:85 | 11-27 | 실측(코드) |
| chat-detector 메모리 상태 → 옛 태스크 먼저 내림 | prod/platform/services.tf:359-362 | 11-27 | 실측(코드) |
| 일꾼 0↔1 자동 조절은 코드 정의, 운영 적용 미확인 | prod/workers/scaling.tf; 볼트 POK-605(11-19, apply 전) | 11-27 | 코드+문헌값(볼트) |
| 되감기 만료 스위치 기본 꺼짐, 운영 버킷 만료 규칙 없음 | prod/media/variables.tf:136-140(clip_internal_url 기본 ""); rewind_bucket.tf:80-94; 공개 글 round-vod 129행 | 11-27 | 실측(코드)+문헌값 |
| upload 일꾼 팀원(Java) | 공개 글 editing-upload-authorization 17·23행 | 11-27 | 문헌값 |
| viewer-request 함수가 캐시 조회 전 | AWS 블로그 Charting the life of a CloudFront request | 11-27 | 문헌값 |
| 교체 시 SRT 끊김·미업로드 파일 비이전 | runbooks/media-swap.md:2533,2805,3623; 공개 글 stateful 23-35·51-57행 | 11-27 | 코드+문헌값 |
| 제어면 잘못된 본문 400 | media/internal/endsignal/receiver.go:263-278 | 11-27 | 실측(코드) |
