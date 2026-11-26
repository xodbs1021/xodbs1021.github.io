---
title: "미디어 서버만 EC2에 두고 코어는 Fargate로 돌립니다"
date: "2026-11-27T05:30:00+09:00"
author: "김태윤"
categories: ["projects"]
tags: ["PokeClip", "AWS", "아키텍처", "CloudFront", "EC2", "ECS", "MediaMTX", "설계 결정"]
draft: true
description: "라이브 방송을 받아 되감기와 클립을 만드는 PokeClip의 AWS 구성. 상태 있는 미디어 서버만 EC2 한 대에 두고 코어 서비스는 ECS Fargate로 돌린 이유, 시청 경로를 CDN 하나에서 라이브(EC2)와 되감기(S3)로 가른 이유, 송출 입구를 NLB 뒤 프라이빗 서브넷에 둔 이유, 기각한 대안과 지금 남은 한계."
---

PokeClip은 방송자의 OBS에서 SRT(Secure Reliable Transport, UDP 기반 송출 프로토콜)로 영상을 받아 라이브로 내보내고, 1시간 되감기와 다시보기, 클립 편집까지 이어 주는 서비스입니다. 라이브는 HLS(HTTP Live Streaming) 목록과 조각 파일로 냅니다. 이 가운데 미디어 서버는 진행 중인 SRT 연결과 아직 올리지 못한 녹화 조각을 들고 있어서, 컨테이너를 새로 띄워 교체하는 배포를 쓰면 방송이 끊기고 조각을 잃습니다. 그래서 미디어 서버만 EC2 한 대에 두고 코어 서비스는 ECS Fargate로 돌립니다. 시청은 CloudFront 배포 하나에서 라이브 요청은 EC2로, 되감기 요청은 S3로 보내고, 송출 입구는 NLB(Network Load Balancer) 뒤 프라이빗 서브넷에 있습니다. 첫 출시본 v1.0.0은 2026년 11월 3일에 나왔고 운영 주소는 11월 6일에 공개했으며, 아래 구성은 11월 25일 저장소 main 기준입니다. 그 사이에 자격 창구(11월 16일)와 되감기 목록 압축(11월 18일)처럼 공개 뒤에 들어간 부분도 있습니다.

저는 PokeClip 팀에서 미디어·인프라 구조와 서비스 사이의 계약을 정했고, 배치와 수신 경로, DB 선택도 제 결정입니다. Terraform과 미디어 상자 코드는 AI(Claude Code·Codex)가 구현하고 제가 리뷰했으며, 웹과 OBS 플러그인, Spring 서비스는 팀원이 만들었습니다. 2026년 6월의 [v3 설계기](/posts/0-to-1/pokeclip-architecture/)는 하이라이트 탐지 파이프라인 중심의 옛 그림입니다.

## 전체 구성은 입구 넷과 미디어 상자 하나로 요약됩니다

사용자가 닿는 서비스 주소는 넷입니다. 웹 앱(app.)은 Route 53에서 공개 ALB(Application Load Balancer)로 가서 Next.js에 닿고, OBS 플러그인이 쓰는 API(api.)도 같은 ALB의 다른 호스트입니다. 시청용 미디어 주소(media.)는 CloudFront 배포 하나이고, 송출(ingest.)은 NLB의 UDP 8890 포트입니다. CloudFront 안에서는 경로에 따라 갈립니다. 라이브(`/live/*`)와 재생 서버(`/playback/*`), 제어면(`/api/streams/*/rewind`·`/api/ingest/*`)은 내부 ALB를 거쳐 미디어 상자로 가고, 되감기(`/dvr/*`)와 다시보기 목록(`/vod/*`)은 S3로 가며, 어느 규칙에도 맞지 않는 요청은 기본 동작이 서명 쿠키를 요구하고 함수가 404를 내므로 원본에 닿지 않습니다. 미디어 상자로 들어가는 길은 결국 시청(CloudFront → 내부 ALB)과 송출(NLB) 둘뿐입니다. [[fig-overview]]에서 볼 것은 CloudFront에서 갈라지는 두 화살표와, 미디어 상자로 모이는 두 화살표입니다.

```mermaid {#fig-overview kind="개념도" caption="PokeClip의 AWS 구성 가운데 시청과 송출 길만 그린 부분도입니다. 미디어 상자(EC2)는 시청(CloudFront → 내부 ALB)과 송출(NLB) 두 길로만 들어갈 수 있고, 되감기 조각(/dvr)과 다시보기 목록(/vod)은 CloudFront에서 S3로 바로 가 상자를 거치지 않습니다. 재생 서버·제어면 경로, 사이드카가 S3에 올리는 길, 코어 서비스(ECS Fargate)는 그림에서 뺐습니다. 2026년 11월 25일 저장소 Terraform 기준입니다." source="https://taeyun.blog/posts/0-to-1/pokeclip-live-dvr-url-split/"}
flowchart TB
  accTitle: PokeClip AWS 구성
  accDescr: 시청자는 CloudFront를 거쳐 라이브는 내부 ALB와 EC2 미디어 상자로, 되감기는 S3로 간다. 방송자는 NLB를 거쳐 미디어 상자로 SRT를 보낸다. 미디어 상자는 RDS에 쓴다.
  viewer([시청자]) --> cf[CloudFront]
  cf --> ialb[내부 ALB]
  cf --> s3[(S3 rewind)]
  s3 ~~~ nlb[NLB · SRT 송출]
  ialb --> box[["미디어 상자 EC2"]]
  nlb --> box
  box --> rds[(RDS)]
```

S3로 가는 화살표가 상자를 건너뛰는 것이 이 구성의 핵심입니다. 되감기 쪽 공정이 멈춰도 라이브 화살표는 영향을 받지 않습니다. 구성 요소마다 역할과 자리, 만든 사람이 다릅니다. 미디어 상자 안의 컨테이너가 요청을 어떻게 나눠 처리하는지는 [VPC 안의 요청 경로 글](/posts/projects/pokeclip-vpc-request-path/)에 있습니다.

| 구성 요소 | 역할 | 자리 | 만든 사람 |
|---|---|---|---|
| OBS 플러그인 | 캡처, 오디오 6트랙, SRT 송출 | 방송자 PC | 팀원 |
| MediaMTX 포크 v1.21.1-pokeclip.2 | SRT 수신, LL-HLS(Low-Latency HLS), 4초 fMP4 녹화 | EC2 미디어 상자 | 상류 + 포크 패치 |
| nginx 1.31.7 | MediaMTX 앞 문지기 | EC2 미디어 상자 | AI 구현, 제 결정 |
| 세그먼트 인덱서 사이드카, janitor, 응답기, 자격 창구 | 장부 기록, S3 발행, 녹화 정리, 송출 인증, IMDS 대리 | EC2 미디어 상자 | AI 구현, 제 설계 |
| next, auth, clip, chat-collector, chat-detector | 웹, 계정·페어링, 클립·쿠키 발급, 채팅 수집·탐지 | ECS Fargate arm64 | 팀원(Spring Boot, Next.js) |
| upload 일꾼 | 외부 업로드 | ECS Fargate | 팀원(Java) |
| render 일꾼 | 클립 렌더 | ECS Fargate | 미확인 |
| RDS PostgreSQL 17 | 장부·앱 데이터, IAM 토큰 접속 | db.t4g.medium 단일 AZ | 제 선택 |
| S3 rewind 버킷, CloudFront, NLB, 내부 ALB | 되감기 저장, 시청 입구, 송출 입구, 원본 앞단 | 관리형 | Terraform(AI 구현) |

## 미디어 서버는 ECS가 아니라 EC2 한 대에 뒀습니다

7월 20일에 코어 서비스는 ECS Fargate, 미디어 서버는 EC2로 가르기로 정했습니다. 미디어 서버는 상태 있는 UDP 워크로드입니다. 방송 중에는 SRT 연결이 열려 있고, 녹화 조각은 S3에 올라가기 전까지 로컬 디스크에 있습니다. ECS의 교체 배포는 새 태스크를 띄우고 옛 태스크를 내리는 방식이라, 이 둘을 그대로 잃습니다. 그래서 [미디어 서버는 API처럼 갈아 끼울 수 없다는 판단](/posts/0-to-1/pokeclip-stateful-media-deployment/)으로 EC2 한 대와 디스크를 두었습니다. 이렇게 해서 얻은 것은 교체 시점을 우리가 고르는 것과, 같은 상자를 다시 띄울 때 디스크를 지키는 것입니다. 교체 자체는 새 상자를 띄운 뒤 대상 그룹의 활성 상자를 옮기는 방식이고, 그 순간 진행 중인 SRT 연결은 끊기며 옛 상자에 남은 미업로드 파일은 새 상자로 옮겨지지 않습니다.

기각한 대안은 배치와 구현 두 갈래입니다. 배치에서는 EKS가 3인 팀이 운영하기에 무거웠고, MediaLive나 IVS 같은 관리형 미디어 서비스는 오디오 6트랙 입력과 1시간 되감기라는 핵심 차별점을 바깥에 맡기는 셈이었습니다. 구현에서는 MediaMTX를 쓰지 않고 Go로 미디어 서버를 다 짜는 안을 7월 27일에 [MediaMTX 채택](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/)으로 접었고, 대신 포크에 필요한 패치만 얹고 상류에 PR을 보내는 쪽을 택했습니다.

인스턴스는 c8gn.large(Graviton, arm64)입니다. 기준은 CPU가 아니라 네트워크 대역폭이었습니다. 같은 상자가 라이브 조각을 시청자 쪽으로 전송하면서 녹화 원본과 되감기용 재포장 조각을 S3로 올리기 때문입니다. 루트 볼륨은 gp3 150GiB이고, IMDS(Instance Metadata Service)는 v2를 강제하며 자격 창구를 켠 구성에서는 홉 상한이 1입니다(끈 구성은 2). 11월 16~17일에 운영 상자 둘 다 창구를 켠 것은 공개 글에서 확인했고, 11월 25일 운영 스위치 값은 확인하지 못했습니다. [홉 상한을 1로 내리고 자격 창구를 따로 세운 이유](/posts/0-to-1/pokeclip-media-imds-credential-relay/)는 인터넷에 열린 MediaMTX·nginx 컨테이너가 상자의 역할 자격을 받을 수 있었기 때문입니다.

이 선택의 대가는 교체가 느리고 방송을 끊는다는 점입니다. 서울 리전 한 가용 영역에서 c8gn 재고가 부족해 새 상자를 띄우지 못한 이력이 세 번 있고(비공개 운영 기록), 그럴 때 상자가 살아 있으면 설정 반영은 상자를 바꾸지 않고 제자리에서 컨테이너만 다시 띄우는 방식으로 합니다. 상자 자체가 죽으면 새 상자를 띄워야 합니다. 재시작은 systemd 유닛 하나로만 하고, 정지는 두 단계입니다. 먼저 TERM을 보내 최대 30초 기다리고, 그다음 정리 스크립트가 compose를 내립니다. 같은 상자를 다시 띄울 때 녹화·되감기 볼륨은 남깁니다.

## 시청 경로는 CDN 하나에서 라이브와 되감기를 갈랐습니다

시청용 주소는 CloudFront 배포 하나이지만, 경로에 따라 원본이 다릅니다. `/live/*`는 VPC 원본으로 내부 ALB를 거쳐 미디어 상자의 LL-HLS 서버로 갑니다. `/dvr/*`는 되감기 목록과 조각이고 `/vod/*`는 다시보기 목록인데, 다시보기 플레이어도 조각은 `/dvr/…/seg/*.m4s`에서 받습니다. 둘 다 S3 rewind 버킷이 원본입니다. [[fig-paths]]에서 볼 것은 같은 CloudFront 상자에서 출발한 두 점이 서로 다른 상자에 닿는 순서입니다.

{{< motion scene="LiveVsRewindPath" id="fig-paths" kind="개념도" caption="같은 CloudFront 배포에서 라이브 목록 요청은 내부 ALB와 EC2 미디어 상자로, 되감기 조각 요청은 S3로 갑니다. 되감기 쪽이 멈춰도 라이브 길은 영향을 받지 않습니다. 경로 규칙은 11월 25일 Terraform 기준이고 움직임의 시각은 설명용입니다." source="https://taeyun.blog/posts/0-to-1/pokeclip-live-dvr-url-split/" >}}

두 점이 서로 다른 상자에서 끝나므로, 되감기 쪽 공정이 멈춰도 라이브 점은 그대로 EC2에 닿습니다. 이렇게 가른 가장 큰 이유가 그것입니다. 되감기 조각과 목록은 사이드카가 S3에 정적 파일로 올리므로, 사이드카가 죽어도 유효한 쿠키와 이미 받은 목록 주소로는 S3의 조각을 계속 받을 수 있고 라이브는 MediaMTX가 직접 냅니다. 새로 되감기를 여는 일은 사이드카의 상태 조회에 기대므로 그때는 멈춥니다. 주소 구조는 7월 설계부터 세 번 바뀌었습니다. 7월 25일에 채택한 `/hot`·`/cold` 접두사는 이미 목록에 실린 URI를 바꿔야 한다는 이유로 7월 27일에 버리고 오리진 대체로 바꿨습니다. 8월 21일에 라이브 주소와 녹화 주소를 나누자 라이브 조각은 S3에 올라가지 않게 됐고, 대체할 대상이 없어진 오리진 대체는 8월 30일에 폐기했습니다. 그 과정은 [되감기 주소 글](/posts/0-to-1/pokeclip-live-dvr-url-split/)에 있습니다.

캐시 규칙도 경로마다 다릅니다. 라이브 목록(`/live/*.m3u8`)은 1초 캐시에 LL-HLS 쿼리(`_HLS_msn`·`_HLS_part`·`_HLS_skip`)만 캐시 키에 넣고, 라이브 조각은 원본의 Cache-Control을 따릅니다. 되감기·다시보기 목록은 gzip만 허용해 압축하고, 조각은 기본 1초·최대 하루입니다. 캐시 키에 쿠키와 일반 요청 헤더는 넣지 않고, gzip을 켠 목록 동작에서는 CloudFront가 정규화한 `Accept-Encoding`을 키에 반영합니다. [캐시 키와 원본 인증을 나눈 10월 실험](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/)에서 원본이 받은 미디어 요청이 1,254건에서 28건으로 줄었습니다(조건은 아래 측정 조건). 운영에서는 실험과 달리 세션 쿠키 대신 CloudFront 함수가 KeyValueStore의 CDN 비밀을 `Authorization: Bearer`로 덮어쓰고 MediaMTX가 `hlsCDNSecret`으로 대조합니다. 운영 환경의 감소량은 따로 재지 않았습니다.

시청 권한은 CloudFront 서명 쿠키입니다. clip 서비스가 `/live`·`/dvr`·`/vod`·`/playback` 종류마다 스트림 단위 정책을 하나씩 발급해 쿠키 12장이 되고, 수명은 60분입니다. 와일드카드 하나가 남의 방송까지 열던 정책을 종류별로 나눈 경위와, 방송 중 회차 경로의 1시간 창 밖 조각을 엣지에서 404로 막는 함수는 [서명 쿠키 글](/posts/0-to-1/pokeclip-dvr-cookie-edge-floor/)에 있습니다. 창 하한은 기록기와 함수의 스위치를 둘 다 켜야 동작하고, 회차가 닫히면 하한 키를 지워 다시보기가 열립니다.

## 송출 입구는 NLB 뒤 프라이빗 서브넷입니다

미디어 상자는 공인 IP가 없는 프라이빗 서브넷에 있고, 송출은 NLB가 UDP 8890을 받아 상자로 넘깁니다. 7월 27일에 퍼블릭 EIP, Bastion, SSM 엔드포인트 세 개를 두는 안을 견줬습니다. 공격면은 어느 쪽이든 같다고 봤지만, 보안 그룹을 잘못 열었을 때의 가드레일이 필요했습니다. NLB와 NAT를 두는 비용은 7월 추정으로 월 약 50달러였고, 이 비용을 내고 상자를 바깥에서 직접 닿지 않게 했습니다. 보안 그룹이 상자에 허용하는 이그레스는 443(S3 프리픽스 목록과 모든 IPv4 목적지), RDS의 5432, Auth와 clip 서비스의 포트뿐이고, 443 트래픽은 라우팅에 따라 같은 리전의 S3는 게이트웨이 엔드포인트로, Secrets Manager 등은 private DNS를 켠 구성(Terraform 기본값, 운영 값 미확인)에서 VPC 안 인터페이스 엔드포인트로, 나머지 인터넷 목적지는 기본 경로인 NAT로 나갑니다.

송출 인증은 두 단계입니다. 방송자는 OBS 플러그인에서 [8자 일회용 코드](/posts/0-to-1/pokeclip-one-time-pairing-contract/)로 계정을 연결하고, SRT 연결마다 MediaMTX가 상자 안 응답기에 묻습니다. 응답기 모드가 켜진 상자에서는 응답기가 Auth 서비스에 스트림 키를 조회해 그 계정의 passphrase를 받고, MediaMTX에는 허용이면 200과 passphrase를, 거절이면 본문 없는 401을 돌려줍니다. 운영 상자에서 이 모드가 켜져 있는지는 Terraform 변수라 저장소에서 확인하지 못했습니다. Auth의 조회 응답은 없는 키에도 200에 `valid: false`로 오고, Auth는 그 재시도를 정상 트래픽으로 보고 정보 로그만 남깁니다. passphrase를 사용자별로 받는 기능은 상류에 없어서 포크에 패치로 얹었고, 같은 제안을 [상류 PR #6306](https://github.com/bluenviron/mediamtx/pull/6306)으로 보냈습니다. passphrase 원문은 PG가 아니라 Secrets Manager에 있고 Auth만 읽습니다.

송출 조건은 MPEG-TS, H.264, AAC, 인코더 GOP(Group of Pictures, 키프레임 간격) 2초 고정입니다. 본방 인코더를 SRT와 나눠 쓰면서 GOP와 종료가 묶이는 문제는 [OBS 인코더 공유 글](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/)에, SRT latency를 3초로 올린 이유는 [늦은 재전송 글](/posts/projects/pokeclip-srt-latency-late-retransmission/)에 있습니다.

## 녹화는 상자에서 S3와 장부로 흘러 되감기 목록이 됩니다

MediaMTX는 4초 fMP4 조각으로 녹화하고, 조각이 완성될 때마다 훅으로 사이드카에 알립니다. 사이드카는 조각을 RDS 장부(`stream_segments`)에 기록하고, 원본과 되감기용 재포장본을 S3 게이트웨이 엔드포인트로 올립니다. 그다음 장부를 기준으로 되감기 목록(`/dvr/.../index.m3u8`)을 렌더해 조건부 PUT으로 S3에 발행합니다. 완료 알림이 사라져도 [디스크 재스캔으로 파일을 찾고](/posts/0-to-1/pokeclip-indexer-recovery-without-events/), [늦게 끝난 발행이 새 목록을 덮지 못하게](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/) 장부를 정본으로 삼습니다. janitor는 업로드가 장부에서 확정된 로컬 파일만 지웁니다.

라이브 창은 4초 조각 7개, 28초입니다. 되감기 1시간은 MediaMTX의 라이브 창을 늘려서가 아니라 사이드카가 만든 별도 목록으로 제공합니다. [LL-HLS 라이브 창을 지연이 아니라 복귀 여유로 정한 이유](/posts/0-to-1/pokeclip-live-window-without-fork/)와 [사이드카가 4초마다 목록을 만드는 과정](/posts/0-to-1/pokeclip-sidecar-rewind-playlist/)은 각 글에 있습니다. 되감기 조각의 보존 정책은 60일이지만, 운영 S3 버킷에는 아직 만료 규칙이 없고 애플리케이션의 만료 스위치도 기본값이 꺼짐이라 실제 삭제 시행은 확인하지 못했습니다. 다시보기 목록도 같은 버킷의 회차 경로에서 나갑니다.

## 코어 서비스는 Fargate arm64에서 큐로 이어집니다

웹(next), 계정과 페어링(auth), 클립과 서명 쿠키(clip), 채팅 수집과 탐지(chat-collector·chat-detector)는 ECS Fargate arm64 서비스이고, Cloud Map의 내부 이름으로 서로를 찾습니다. 채팅 수집 언어는 7월 31일에 Node에서 Spring으로 바꿨는데, 이유는 성능이 아니라 [리뷰할 사람이 바뀌어서](/posts/0-to-1/pokeclip-language-ownership-boundaries/)였습니다. 방송 생명주기 이벤트는 SNS FIFO(순서 보장) 주제에서 clip과 chat의 SQS FIFO 큐로 퍼지고, 클립 렌더·썸네일·업로드는 각각의 SQS 큐로 일꾼에게 갑니다. 11월 25일 코드에는 일꾼을 큐 길이에 따라 0대까지 줄이는 자동 조절이 정의돼 있고, 운영에 적용된 기록은 확인하지 못했습니다. 채팅 판별 서비스는 사건 묶음을 메모리에 들고 있어 새 태스크를 띄우기 전에 옛 태스크부터 내리도록 교체 순서를 따로 정했습니다. 큐의 가시성 시한은 render 600초, thumbnail 120초, upload 900초이고 최대 수신 3회 뒤 DLQ(Dead-Letter Queue, 실패 메시지 보관 큐)로 갑니다.

DB는 RDS PostgreSQL 17 db.t4g.medium 단일 AZ입니다. 원안은 Multi-AZ였지만 8월 1일에 단일 AZ로 정했고, 백업은 7일 보관입니다. 접속은 비밀번호 대신 IAM 토큰과 `verify-full`입니다. 미디어 상자의 Go 프로그램 둘이 먼저 이 방식으로 붙었고, 팀원이 같은 규칙을 Java 서비스 넷으로 넓혔습니다. 토큰은 공식 문서상 15분이고 실험 RDS에서는 약 20분까지 받았습니다(조건은 아래 측정 조건). 로그인 뒤 권한은 [PostgreSQL 권한으로 따로 좁혔습니다](/posts/0-to-1/pokeclip-shared-db-login-privileges/).

## 자격은 연결마다 다른 비밀로 검사합니다

시청, 엣지에서 원본, 송출, DB 접속, 상자 안 자격은 서로 다른 연결이고, 각 연결은 다른 비밀로 검사합니다. 라이브 미디어 GET 요청 하나에는 서명 쿠키와 `live-auth` 함수가 캐시 조회 전에 걸려 적중·미스와 상관없이 적용되고, Bearer 대조는 원본까지 간 요청에만 걸립니다. 나머지는 다른 연결의 검사입니다.

| 연결 | 무엇을 | 어디서 | 비밀의 출처 |
|---|---|---|---|
| 시청 요청 | CloudFront 서명 쿠키(스트림 단위, 60분) | CloudFront 엣지 | clip 서비스가 서명 키로 발급 |
| 엣지 → 원본 | `Authorization: Bearer` CDN 비밀 | CloudFront 함수 → MediaMTX | KeyValueStore ↔ `hlsCDNSecret` |
| 송출 연결 | 스트림 키 → 계정별 passphrase | MediaMTX → 응답기 → Auth | Secrets Manager |
| DB 접속 | RDS IAM 토큰, `verify-full` | 사이드카·janitor·앱 서비스 | IAM 역할 |
| 상자 안 자격 | IMDS 홉 상한 1, 대리 창구(창구를 켠 구성) | 호스트 망 창구 → 사이드카·janitor만 | EC2 역할 |

CloudFront 함수가 CDN 비밀을 KeyValueStore에서 읽지 못하면 원본으로 넘기지 않고 503을 냅니다(fail-closed). 반대로 되감기 창 하한을 읽지 못하면 막지 않고 넘깁니다(fail-open). 창 하한은 접근 통제가 아니라 창 정책이고, 접근 통제는 그 앞의 서명 쿠키가 맡기 때문입니다. 배포 자격은 GitHub Actions OIDC로 ECR 푸시까지만 받고, 이미지 다이제스트를 Terraform 변수에 넣어 적용하는 일은 제가 승인합니다. [OIDC 거부의 원인이 SCP가 아니라 sub였던 기록](/posts/projects/pokeclip-github-oidc-immutable-subject/)은 dev 배포 쪽입니다.

## 아직 상자 한 대이고 대부분의 경보는 보류 중입니다

11월 17일 [자격 창구 글](/posts/0-to-1/pokeclip-media-imds-credential-relay/) 시점에는 운영 상자와 대기 상자 둘이었지만, 그 뒤 대기 상자를 내려 지금 운영 중인 미디어 상자는 한 대입니다(비공개 운영 기록). 상자를 바꿔야 할 때 같은 가용 영역의 c8gn 재고가 없으면 살아 있는 상자에서 제자리 전환을 하고, 상자가 죽은 경우의 복구는 새 상자를 띄우는 길뿐입니다. RDS는 단일 AZ이고 ECS 서비스는 각각 태스크 하나입니다. Terraform에 정의된 경보는 되감기 창 하한 함수, 일꾼 깨우기·재우기, 클립 서비스의 방송 종료 감지뿐입니다. 이 가운데 하한 경보 셋은 11월 13일 운영에 적용해 경보와 메일 알림 시험까지 마쳤고(비공개 운영 기록), 나머지 둘의 적용과 알림 구독은 확인하지 못했으며 그 밖의 경보 자원은 보류했습니다. 라이브 목록의 gzip 압축은 MediaMTX가 2,048B를 넘는 목록을 Content-Length 없이 보내 CloudFront가 압축하지 못해 [nginx 쪽 후속 작업](/posts/0-to-1/pokeclip-playlist-gzip/)으로 남아 있습니다. 운영 CloudFront의 원본 요청 감소량과, 동시 방송이 늘었을 때 상자 디스크가 차는 시점은 공개 수치로 재지 않았습니다.

3인 팀이 라이브 미디어를 직접 받는다면, 어느 구성 요소가 연결과 파일을 들고 있는지부터 가르는 것이 먼저입니다. 상태가 있는 것은 한 대에 모아 교체 시점을 직접 고르고, 상태가 없는 것은 관리형으로 보내며, 메모리 상태만 있는 서비스는 교체 순서를 정해 두면 운영 부담이 어디에 남는지가 분명해집니다. 되감기처럼 멈춰도 라이브에 영향이 없어야 하는 공정은 장애가 번지는 범위와 나중에 주소를 바꾸는 작업량을 놓고 처음부터 다른 원본으로 떼어 둘지 정하는 편이 낫습니다.

## 측정 조건

- 10월 5일 라이브 CDN 실험(1,254→28건): 서울 리전 임시 EC2의 MediaMTX 1.20.1 컨테이너(CPU 1개·384MiB), 720p30 H.264 약 1.5Mbps + AAC 128kbps 합성 방송, 서울 엣지 한 곳. 같은 Mac의 k6로 세 구성 × 1·10·25·50 VU(가상 사용자), 조건마다 25초·1회. 수치는 50 VU에서 원본이 받은 미디어 조각 요청 수이고 재생 목록은 TTL 0이라 계속 원본으로 갔습니다. AI(Codex)가 임시 AWS 자원에서 수행했고 원자료는 비공개입니다.
- 10월 22일 RDS IAM 토큰 수용 창(약 20분): 서울 리전 실험 RDS PostgreSQL 17.11 db.t4g.micro 1대, 서명 시각을 과거로 옮긴 토큰으로 시점마다 1회. AI 에이전트가 실행했고 자원 생성·삭제는 제가 승인했습니다.

## 출처

- [방송 중인 미디어 서버는 API처럼 갈아 끼울 수 없었습니다](/posts/0-to-1/pokeclip-stateful-media-deployment/) — EC2·ECS 분리, NLB 뒤 프라이빗, RDS 단일 AZ 결정과 비용 추정, 11월 6일 운영 주소 공개.
- [CDN 하나에서 라이브는 EC2로, 되감기는 S3로 보냈습니다](/posts/0-to-1/pokeclip-live-dvr-url-split/) — 경로 규칙과 기각한 주소 구조.
- [서명 쿠키는 종류별로 나누고 1시간 창은 엣지에서 막았습니다](/posts/0-to-1/pokeclip-dvr-cookie-edge-floor/) — 쿠키 12장, 엣지 하한.
- [CDN 캐시 키와 원본 인증을 나누자 원본 요청이 줄었습니다](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/) — 1,254→28건 실험 조건.
- [되감기 목록만 gzip으로 압축하고 라이브 목록은 미뤘습니다](/posts/0-to-1/pokeclip-playlist-gzip/) — 다시보기 조각의 /dvr 재사용, 라이브 목록 압축 후속.
- [IMDS 홉 상한을 1로 내리고 자격 창구를 따로 세웠습니다](/posts/0-to-1/pokeclip-media-imds-credential-relay/) — 상자 안 자격.
- [systemd가 정리를 건너뛰자 옛 비밀 컨테이너가 남았습니다](/posts/0-to-1/pokeclip-media-host-restart-lifecycle/) — 두 단계 정지와 볼륨 보존.
- [DB 비밀번호 대신 연결마다 RDS IAM 토큰을 만들었습니다](/posts/0-to-1/pokeclip-shared-db-auth-iam-tls/) — IAM 토큰·verify-full·약 20분 실측.
- [2시간 방송이 다시보기에서 7.5분만 보였던 이유](/posts/projects/pokeclip-round-vod/) — 60일 만료가 운영에 아직 연결되지 않음.
- [Go로 다 짜려던 미디어 서버를 MediaMTX에 맡겼습니다](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/) — 채택과 포크 범위.
- [AWS — CloudFront cache behaviors](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html) — 경로별 동작과 캐시 정책.
- [AWS — Understand cache policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html) — gzip 지원을 켜면 정규화한 Accept-Encoding이 캐시 키에 들어감.
- [AWS — Using signed cookies with a custom policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-setting-signed-cookie-custom-policy.html) — 스트림 단위 쿠키 정책.
- [AWS — IMDSv2 how it works](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-v2-how-it-works.html) — 홉 상한.
- [AWS — IAM database authentication for RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html) — 토큰 15분.
- [AWS — Gateway endpoints for Amazon S3](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html) — 상자에서 S3로 가는 길.
- [AWS — Charting the life of an Amazon CloudFront request](https://aws.amazon.com/blogs/networking-and-content-delivery/charting-the-life-of-an-amazon-cloudfront-request/) — viewer-request 함수가 캐시 조회 전에 실행되는 순서.
- [AWS — C8gn instances](https://aws.amazon.com/ec2/instance-types/c8g/) — c8gn.large 사양.
- [bluenviron/mediamtx PR #6306 srt: add srtPassphrase to users](https://github.com/bluenviron/mediamtx/pull/6306) — 사용자별 passphrase 제안.
