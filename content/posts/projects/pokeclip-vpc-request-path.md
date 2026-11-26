---
title: "nginx가 MediaMTX 앞에서 경로와 방송을 대조합니다"
date: "2026-11-27T05:22:37+09:00"
author: "김태윤"
categories: ["projects"]
tags: ["PokeClip", "nginx", "MediaMTX", "VPC", "CloudFront", "ALB", "Docker Compose", "SRT", "HLS"]
draft: false
description: "PokeClip 미디어 상자(EC2) 안에서 송출과 시청 요청이 지나는 길. 컨테이너 다섯이 네트워크 네임스페이스 하나를 나눠 쓰는 구성, SRT 연결이 응답기와 Auth를 거쳐 passphrase를 받는 순서, 캐시를 놓친 라이브 요청이 CloudFront 함수·내부 ALB·nginx·MediaMTX에서 각각 무엇을 검사받는지, nginx를 MediaMTX 앞에 둔 이유와 일부러 맡기지 않은 일, 되감기 조각이 상자를 거치지 않는 이유."
---

PokeClip에서 MediaMTX 녹화 구간을 조회하는 주소 `/playback/{방송}/list?path={방송}`에는 방송 이름이 두 번 들어갑니다(되감기 목록과 조각 자체는 `/dvr/*`로 S3에서 나갑니다). 앞단의 CloudFront 서명 쿠키 정책은 경로 쪽 방송을 URL 문자열 패턴으로 맞추고, 상자 안 MediaMTX 재생 서버는 쿼리 `path`의 방송으로 조각을 고릅니다. 둘이 같은지 대조하는 단계가 없으면 한 방송의 자격으로 다른 방송의 되감기를 열 위험이 있었습니다. 라이브 쪽도 비슷한 틈이 있습니다. nginx는 `%XX`를 풀고 점 구간과 겹 슬래시를 접은 경로로 규칙을 고르고, MediaMTX의 LL-HLS 목록·조각 처리기는 Go `net/http`가 퍼센트 인코딩을 푼 경로에 `path.Dir`를 적용해 방송 경로를 구하며 `path.Dir`는 점 구간과 겹 슬래시도 접습니다. CloudFront 쿠키 정책이 원문과 정규화본 중 무엇을 대조하는지는 확인하지 못했습니다. 앞단 쿠키 정책과 상자 안 두 서버가 같은 요청을 다르게 읽을 수 있다는 뜻입니다. 그래서 VPC(Virtual Private Cloud) 안 미디어 상자(EC2)의 MediaMTX 앞에 nginx를 세워, 열거한 우회 패턴이 든 원문 경로를 거절하고 `/playback`에서는 경로의 방송과 쿼리의 방송이 같은지 대조한 뒤에만 루프백 포트로 넘깁니다. MediaMTX의 LL-HLS(Low-Latency HTTP Live Streaming) 포트 8888, 재생 서버 포트 9996, 관리 API 포트 9997은 모두 127.0.0.1에만 열려 있어서, 내부 ALB(Application Load Balancer)에서 들어온 요청이 MediaMTX에 닿는 길은 nginx뿐이고 관리 API로는 어떤 요청도 가지 않습니다. 구성은 2026년 11월 25일 저장소 main의 compose·nginx·MediaMTX 설정 기준입니다.

저는 PokeClip 팀에서 미디어 상자의 구성과 서비스 사이의 계약을 정했고, 미디어 상자 앞에 nginx를 남기기로 한 것도 제 결정입니다. nginx의 필수 책임을 대조로 정리하고 원문 경로·쿼리·내부 포트까지 검증 범위를 잡고 대조 규칙과 원문 검사와 계약 시험을 만든 것은 AI입니다. 구현은 Claude Code, 리뷰는 Claude Code와 Codex가 했고, 저는 결과를 검수했습니다. 전체 AWS 구성과 왜 미디어 서버만 EC2에 뒀는지는 [아키텍처 글](/posts/projects/pokeclip-cloud-architecture/)에 있습니다.

## 상자 안에서는 컨테이너 다섯이 네트워크 네임스페이스 하나를 나눠 씁니다

compose 템플릿에는 서비스 일곱이 정의돼 있지만, 응답기 모드 기준으로 상시 실행되며 네트워크 네임스페이스(이하 망 칸)를 공유하는 것은 다섯입니다. `mediamtx`가 망 칸의 주인이고, `nginx`·`sidecar`·`ingest-auth`·`janitor`는 `network_mode: service:mediamtx`로 그 칸에 들어가 서로를 127.0.0.1로 부릅니다. 호스트 밖으로 여는 포트는 `mediamtx` 서비스에만 있습니다. SRT(Secure Reliable Transport)용 UDP 8890과, 내부 ALB가 보는 프록시 포트 넷(live·playback·control·health)입니다. 프록시 포트 번호 자체는 Terraform 변수라 저장소에 자리표시자만 있습니다. 나머지 둘은 다릅니다. `cred-relay`는 호스트 망에서 169.254.170.2:9911을 듣는 자격 창구이고, `timing-preflight`는 `preflight` 프로필의 기동 전 검사 컨테이너입니다. 시작 스크립트가 사이드카 이미지의 판 라벨을 먼저 읽어 판 2가 확인되면 검사를 건너뛰고, 확인되지 않을 때만 기본 망에서 한 번 돌리며, 자격 창구를 켠 상자에서는 그 대신 기동을 멈춥니다. [[fig-box]]에서 볼 것은 내부 ALB에서 nginx로 들어온 화살표가 MediaMTX를 지나 응답기와 사이드카로 갈라지는 자리입니다.

```mermaid {#fig-box kind="개념도" caption="미디어 상자 안 컨테이너의 배치입니다. nginx · MediaMTX · 응답기 · 사이드카 · janitor는 MediaMTX의 망 칸을 함께 써서 127.0.0.1로 서로를 부릅니다(nginx → MediaMTX 8888 · 9996, nginx → 사이드카 제어면 8086, MediaMTX → 응답기 8080). 내부 ALB는 nginx로, NLB의 SRT는 MediaMTX로 바로 들어오며, 사이드카가 장부에서 업로드를 확정한 조각만 janitor가 지우고(점선), 사이드카와 janitor는 각자 호스트 망의 자격 창구에 자격을 받습니다. NLB·제어면 화살표와 기동 전 검사 컨테이너는 그림에서 뺐습니다. 2026년 11월 25일 compose 템플릿 기준입니다." source="https://taeyun.blog/posts/0-to-1/pokeclip-media-imds-credential-relay/"}
flowchart TB
  accTitle: 미디어 상자 안 컨테이너 배치
  accDescr: 내부 ALB는 HTTP를 nginx로 보내고, nginx는 MediaMTX로 넘긴다. MediaMTX는 응답기에 인증을 묻고 사이드카에 훅과 녹화 파일을 준다. 사이드카가 확정한 조각만 janitor가 지우고, 사이드카와 janitor는 각자 호스트 망의 자격 창구에 자격을 받는다.
  ialb[내부 ALB] --> ngx[nginx]
  ngx --> mtx[MediaMTX]
  mtx --> ia[응답기]
  mtx -.-> sc[사이드카]
  sc -.-> jn[janitor]
  sc -.-> cr[자격 창구<br/>호스트 망]
  jn -.-> cr
```

갈라지는 자리가 MediaMTX라는 것은, 사이드카가 죽어도 라이브 요청 경로는 사이드카를 거치지 않는다는 뜻입니다. 그때 멈추는 것은 사이드카 프로세스가 맡은 일, 곧 녹화 발행과 제어면(되감기 상태 조회·송출 종료 신호), 그리고 켜 둔 구성이라면 방송 시작·종료 이벤트의 SNS 발행입니다. 반면 SRT 영상 패킷은 MediaMTX가 직접 받고 nginx는 시청·제어면 요청과 헬스 체크를 처리하는데, nginx 프로세스가 끝나면 묶음 전체가 다시 뜨므로 진행 중인 송출까지 끊깁니다. 재기동 단위도 그 경계를 따릅니다. `mediamtx`와 `nginx`는 `restart: "no"`이고, 둘 중 하나가 끝나면 compose 전체가 내려가며 systemd 유닛이 20초 뒤 다시 띄웁니다. 사이드카·응답기·janitor·자격 창구는 `on-failure`로 엔진이 되살립니다. 모든 서비스는 `cap_drop: [ALL]`이고 nginx만 CHOWN·SETGID·SETUID를 되살립니다. 비밀은 기동 때 tmpfs에 렌더한 파일로만 들어갑니다. 시작 스크립트는 선행 점검, 사이드카 환경 파일 확인, Secrets Manager에서 CDN 비밀 읽기, 기동마다 새로 만드는 MediaMTX API 비밀번호, 모드 블록 렌더 순으로 돕니다. 옛 비밀 컨테이너가 남던 문제와 systemd 정리는 [재시작 생명주기 글](/posts/0-to-1/pokeclip-media-host-restart-lifecycle/)에 있습니다.

## 송출은 NLB에서 MediaMTX로 바로 들어가고 응답기가 열쇠를 묻습니다

SRT는 nginx를 거치지 않습니다. NLB(Network Load Balancer)가 UDP 8890을 상자로 넘기면 MediaMTX가 직접 받습니다. MediaMTX는 SRT만 켜고 RTMP·RTSP·WebRTC·MoQ는 모두 끈 상태입니다. 연결이 오면 MediaMTX는 `authMethod: http`로 같은 망 칸의 응답기(127.0.0.1:8080)에 묻습니다. 응답기 모드가 켜진 상자 기준으로, 응답기는 Auth 서비스의 스트림 키 조회 API에 전용 토큰으로 묻고, Auth는 없는 키에도 200에 `valid: false`를 답합니다. 응답기는 유효한 키면 그 계정의 SRT passphrase를 받아 MediaMTX에 200과 passphrase로 답하고, 거절이면 본문 없는 401을 돌려줍니다. [[fig-ingest]]에서 볼 것은 응답이 두 겹이라는 점입니다. Auth가 응답기에 주는 ④는 유효하든 아니든 200이고, 응답기가 MediaMTX에 주는 ⑤가 허용과 거절을 가릅니다.

```mermaid {#fig-ingest kind="개념도" caption="SRT 송출 연결이 passphrase를 받기까지입니다. 응답기는 상자 안에 있고 Auth는 ECS에 있습니다. Auth의 조회 응답(④)은 유효한 키면 200과 valid:true·passphrase, 없는 키면 200과 valid:false입니다. 응답기가 MediaMTX에 주는 응답(⑤)은 허용이면 200과 passphrase, 판정 거절이면 401이고, 바깥 시한을 넘기면 503입니다. 2026년 11월 25일 MediaMTX 설정과 응답기 코드 기준입니다." source="https://taeyun.blog/posts/0-to-1/pokeclip-secret-storage-migration-plan/"}
flowchart TB
  accTitle: SRT 송출 인증 순서
  accDescr: OBS가 NLB로 SRT를 보내면 MediaMTX가 응답기에 묻고 응답기가 Auth에서 passphrase를 받아 돌려준다.
  obs([OBS 플러그인]) -- "① SRT 연결 · 스트림 키" --> mtx[MediaMTX]
  mtx -- "② auth 요청" --> ia[응답기]
  ia -- "③ 키 조회 · 전용 토큰" --> auth[Auth 서비스]
  auth -. "④ 200 valid:true + passphrase<br/>또는 valid:false" .-> ia
  ia -. "⑤ 200 passphrase · 401 · 503" .-> mtx
  mtx -. "⑥ passphrase가 맞으면 수신 시작" .-> obs
```

⑤가 401이나 503이면 MediaMTX가 연결을 거절하고, 200이면 MediaMTX가 그 passphrase를 적용해 방송자의 SRT 암호가 맞을 때만 수신을 시작합니다. Auth는 없는 키의 재시도를 정상 트래픽으로 보고 정보 로그만 남기고, 응답기는 그 결과를 거절로 기록합니다. passphrase를 사용자별로 주는 기능은 상류 MediaMTX에 없어서 포크에 패치로 얹었고, 같은 제안을 [상류 PR #6306](https://github.com/bluenviron/mediamtx/pull/6306)으로 보냈습니다. `overridePublisher: no`라 passphrase를 아는 둘째 연결이 송출을 빼앗지 못합니다. 응답기가 Auth에 가는 길은 보안 그룹에서 미디어 상자와 Auth 서비스 사이에만 열려 있습니다. 방송자가 플러그인에서 계정을 연결하는 [8자 일회용 코드](/posts/0-to-1/pokeclip-one-time-pairing-contract/)와, passphrase 원문을 [Secrets Manager에만 두고 Auth만 읽게 한 결정](/posts/0-to-1/pokeclip-secret-storage-migration-plan/)은 각 글에 있습니다.

## 캐시를 놓친 라이브 요청은 네 단계를 지나 MediaMTX에 닿습니다

시청자가 `https://media.pokeclip.com/live/{방송}/index.m3u8`을 받을 때, CloudFront는 서명 쿠키 검사와 `live-auth` 함수를 둘 다 엣지 캐시 조회 전에 적용합니다. 그래서 미디어 GET 요청에는 캐시 적중·미스와 상관없이 쿠키와 함수가 걸립니다(허용된 OPTIONS 요청에는 쿠키를 요구하지 않습니다). 라이브 목록은 1초 캐시라 같은 엣지에 같은 캐시 키의 유효한 객체가 있으면 엣지에서 응답하고, 그렇지 않은 요청만 원본까지 갑니다. [[fig-gates]]에서 볼 것은 라이브 요청(청록)과 playback 요청(빨강)이 같은 관문에서 서로 다른 검사를 받는 모습입니다. 라이브는 엣지 함수와 MediaMTX의 CDN 비밀 대조를 받고, playback은 함수 없이 쿠키만 받은 뒤 nginx의 방송 대조를 받습니다.

{{< motion scene="ViewerRequestGates" id="fig-gates" kind="개념도" caption="관문 넷(CloudFront, 내부 ALB, nginx, MediaMTX)과 두 요청입니다. 라이브 목록 요청(청록)은 넷을 모두 지나고 playback 요청(빨강)은 셋째 관문에서 멈춥니다. 라이브 요청은 CloudFront에서 서명 쿠키와 live-auth 함수, 내부 ALB에서 /live 접두사 제거, nginx에서 원문 경로 검사, MediaMTX에서 CDN 비밀 대조를 받습니다. playback 요청(빨강)은 CloudFront에서 쿠키만, ALB에서 /playback 접두사 제거를 받은 뒤 nginx의 경로·쿼리 방송 대조에서 s1 ≠ s2로 403을 받습니다. 검사 순서는 2026년 11월 25일 설정 기준이고 움직임의 시각은 설명용입니다." source="https://taeyun.blog/posts/0-to-1/pokeclip-nginx-playback-request-boundary/" >}}

빨간 점이 nginx에서 멈추는 이유는 CloudFront 쿠키 정책의 와일드카드가 쿼리의 `path` 값과 경로의 방송이 같은지를 검사하지 않기 때문입니다. 그 대조는 nginx만 합니다.

1. **CloudFront 엣지.** 서명 쿠키를 봅니다. `/live/{방송}/*` 정책의 쿠키가 없거나 만료됐으면 403입니다. 같은 단계에서 `live-auth` 함수가 돕니다. 함수가 받은 URI에 `%`·역슬래시·겹 슬래시·점 구간 중 하나라도 있거나 파일 끝이 `.m3u8`·`.mp4`가 아니면 403이고, 아니면 KeyValueStore의 CDN 비밀을 읽어 `Authorization: Bearer`로 덮어씁니다. 시청자가 보낸 Authorization은 원본에 닿지 않습니다. 비밀을 못 읽으면 503입니다. 캐시 키는 기본 키(배포 도메인과 경로)에 LL-HLS 쿼리 `_HLS_msn`·`_HLS_part`·`_HLS_skip` 셋만 더한 것입니다.
2. **내부 ALB.** CloudFront의 VPC 원본이 내부 ALB의 443에 TLS로 붙습니다. ALB는 `/live/*`를 live 대상 그룹으로 보내면서 `^/live/(.*)$`를 `/$1`로 고쳐 씁니다. 그래서 상자에는 `/{방송}/index.m3u8`이 도착합니다. 규칙에 맞지 않는 경로는 ALB가 고정 404로 답합니다. ALB에서 상자까지는 VPC 안 HTTP입니다.
3. **nginx live 포트.** nginx 파서를 지난 요청의 원문(`$request_uri`) 경로에 `%2e`·`%2f`·`%5c`·`%25`, 겹 슬래시, 점 구간이 있으면 400입니다. 아니면 경로·쿼리·Authorization을 그대로 127.0.0.1:8888로 넘깁니다. 접두사를 더 지우지 않습니다.
4. **MediaMTX LL-HLS.** `hlsCDNSecret`과 Bearer 값을 대조하고 맞으면 목록을 냅니다. 목록 요청이 블로킹 리로드이면 다음 파트가 나올 때까지 응답을 붙잡습니다. 그래서 nginx의 `proxy_read_timeout`은 90초로 두었고, 그 앞의 CloudFront 원본 응답 대기는 30초, ALB 유휴 시한은 60초입니다. 파트 길이는 500ms 설정이고, 이 시한들에 걸리는 빈도는 운영에서 재지 않았습니다.

## nginx는 접두사를 지우지 않고 원문 경로를 검사합니다

nginx를 둔 첫째 이유는 판단과 전달이 같은 경로를 보게 하는 것입니다. nginx는 요청 경로의 `%XX`를 풀고 점 구간과 겹 슬래시를 접은 `$uri`로 location을 고릅니다. 그런데 nginx는 live 포트에서 요청 원문을 그대로 상류에 넘기고, 그 원문을 받은 MediaMTX는 Go `net/http`가 퍼센트 인코딩을 푼 `URL.Path`에 `path.Dir`를 적용해 방송 경로를 구하며 `path.Dir`는 점 구간과 겹 슬래시도 접습니다. 그 앞의 CloudFront 서명 쿠키 정책이 원문과 정규화본 중 무엇을 대조하는지는 저장소의 엣지 시험 런북에서도 미확인으로 남아 있습니다. 예를 들어 `/A/..%2fB/index.m3u8`이 MediaMTX의 LL-HLS 처리기에 그대로 닿는다면 `path.Dir`가 B 방송으로 풉니다. 쿠키 정책이 그 원문을 A 방송으로 허가했다면 쿠키 범위와 실제로 나가는 스트림이 어긋납니다. 지금 설정에서는 그 요청이 거기까지 가기 어렵습니다. `live-auth` 함수가 받은 URI에 `%`가 남아 있으면 403을 내고, 같은 원문이 nginx의 live 포트에 닿으면 `%2f`가 열거 패턴에 걸려 400입니다. CloudFront가 함수에 원문을 주는지 정규화본을 주는지는 저장소 런북에서 미확인이라, 어느 단계가 막는지는 조건부로 적습니다. nginx의 몫은 이렇게 쿠키 범위와 스트림이 어긋날 수 있는 꼴을 상류 앞에서 끊는 것입니다. 그래서 nginx는 location을 고르기 전에 원문 경로부터 봅니다. nginx 자체 파서가 요청 줄을 정상으로 읽은 뒤의 이야기이고(파서가 거부하는 요청은 그 전에 nginx가 오류 코드를 냅니다), 이 원문 검사는 설정에 열거한 패턴(`%2e`·`%2f`·`%5c`·`%25`, 겹 슬래시, 점 구간)만 거절하며 한글 경로 이름 같은 그 밖의 퍼센트 인코딩은 허용합니다.

```nginx
# 원문 경로 거절 — live · 제어면은 원문을 상류에 그대로 넘긴다.
map $request_uri $raw_path_unsafe {
  default 0;
  "~*^[^?]*(?:%2e|%2f|%5c|%25|//|/\.\.?(?:[/?]|$))" 1;
}

server {
  listen ${proxy_live_port};
  if ($raw_path_unsafe) { return 400; }
  location / { proxy_pass http://127.0.0.1:8888; }
}
```

위 발췌는 템플릿에서 live 블록만 뽑은 것이고, 포트는 Terraform 변수입니다. `..;`나 `\`, `..%3F`처럼 Go의 `net/http`가 경로 구분으로 읽지 않는 꼴은 그대로 넘깁니다. 상류가 Go가 아닌 것으로 바뀌면 이 전제도 다시 봐야 합니다. 그 밖의 `%XX`(한글 경로 이름 등)와 쿼리는 받습니다.

둘째 이유는 로그입니다. 접근 로그 형식에서 Authorization과 쿼리 문자열을 빼고, 경로는 받은 원문 그대로 남깁니다. 거절한 우회 원문이 풀고 접은 정상 경로처럼 남지 않게 하려는 것입니다. 오류 로그 줄은 nginx가 형식을 정하므로 요청 줄과 Host·Referer가 실리고, 쿼리로 토큰을 받게 되면 다시 판단하기로 했습니다. `server_tokens off`로 판 번호를 숨기고, `absolute_redirect off`로 리다이렉트의 Location에 nginx의 듣기 포트가 실리지 않게 했습니다.

접두사 `/live`·`/playback`을 지우는 일은 nginx가 아니라 내부 ALB의 규칙이 맡습니다. nginx는 ALB가 고쳐 쓴 경로를 그대로 둡니다. TLS도 nginx가 하지 않습니다. 시청자와 CloudFront 사이, CloudFront와 ALB 사이에서 끝나고, 상자 안은 HTTP입니다. 압축도 하지 않습니다. 되감기·다시보기 목록은 CloudFront가 압축하고, 라이브 목록은 MediaMTX가 2,048B를 넘으면 Content-Length 없이 보내 CloudFront가 압축하지 못하므로 [nginx 쪽 후속 작업](/posts/0-to-1/pokeclip-playlist-gzip/)으로 남아 있습니다.

## playback 경로는 경로의 방송과 쿼리의 방송이 같아야 넘어갑니다

재생 서버(127.0.0.1:9996)는 되감기 다운로드와 구간 조회용 `/list`·`/get`을 냅니다. 바깥 주소는 `/playback/{방송}/list?path={방송}&...`이고, ALB가 `/playback`을 지우면 nginx의 playback 포트에는 `/{방송}/list?path=...`가 옵니다. 이 포트의 검사는 순서가 있습니다.

| 순서 | 검사 | 통과 조건 | 아니면 |
|---|---|---|---|
| 1 | 정규화한 경로(`$uri`)의 꼴 | `/{id}/list` 또는 `/{id}/get`, id는 `[A-Za-z0-9._~-]` | 404 |
| 2 | 원문 경로(`$request_uri`)의 꼴 | 원문도 같은 꼴이고 `%`·빈 조각·점만으로 된 id가 없음 | 403 |
| 3 | 쿼리의 `path` | 정확히 하나이고 값이 경로의 `{id}`와 같음, 이름에 `%`가 든 쿼리 키 없음 | 403 |

세 검사를 지나면 `proxy_pass http://127.0.0.1:9996/$playback_op$is_args$args`로 동작 이름만 남기고 쿼리는 원문 그대로 넘깁니다. 시각 값의 `%3A`·`%2B`를 다시 쓰지 않기 위해서입니다. 쿼리 키 이름에 `%`가 들면 막는 이유는 MediaMTX가 키를 풀어 읽어서 `pa%74h`가 두 번째 `path`로 들어올 수 있기 때문입니다. 이 규칙을 세운 경위와 우회 시험은 [nginx 요청 경계 글](/posts/0-to-1/pokeclip-nginx-playback-request-boundary/)에 있습니다. 재생 서버 쪽에는 별도 인증이 없습니다. 응답기 모드에서는 `authHTTPExclude`로 playback을 인증에서 빼고, 옛 모드에서는 루프백 주소에 playback 권한을 주는 항목이 있는데, 어느 모드든 같은 망 칸의 컨테이너는 모두 127.0.0.1로 붙으므로 칸 안 누구나 `/list`·`/get`을 부를 수 있습니다. 이것은 받아들인 위험이고, 실제 관문은 nginx의 대조와 CloudFront 서명 쿠키입니다.

## 제어면과 헬스는 nginx가 직접 답하거나 사이드카로 보냅니다

control 포트는 `/api/ingest/`와 `/api/streams/`만 사이드카의 제어면(127.0.0.1:8086)으로 넘기고 그 밖은 404입니다. 여기에도 원문 경로 거절이 걸려서 `/admin/..%2Fapi/ingest/x`처럼 풀면 허용 경로가 되는 원문은 400입니다. 상류 주소가 비어 있으면 두 경로 모두 404를 내서, 제어면 서버가 배포되기 전에는 호출이 0건입니다. 바깥에서 이 포트로 오는 경로는 CloudFront의 `/api/streams/*/rewind`(되감기 상태 조회로, 지금 볼 수 있는지·어느 국면인지·어느 목록인지를 답하며 캐시 최대 1초)와 `/api/ingest/*`(캐시 없음)입니다. 내부 ALB는 둘 다 control 대상 그룹으로 보내고 접두사는 지우지 않습니다.

health 포트는 nginx가 고정 200을 냅니다. 상류를 부르지 않고, 대상 그룹이 몇 초마다 부르므로 접근 로그에도 남기지 않습니다. 그래서 헬스 체크는 "nginx가 살아 있다"까지만 말해 주고 MediaMTX의 상태는 말해 주지 않습니다. MediaMTX의 상태는 사이드카가 관리 API(127.0.0.1:9997)를 자기 자격으로 조회해 봅니다.

관리 API로 가는 프록시는 어느 포트에도 없습니다. 렌더된 nginx 설정에는 9997이라는 숫자가 주석에도 나오지 않습니다. 이 API의 `api` 권한은 조회 전용이 아니라 설정 변경, 송출 끊기, 녹화 삭제까지 할 수 있어서, 넘기면 그 표면이 내부 ALB 쪽으로 열리고 사이드카 자격 하나에 기대게 되기 때문입니다.

## 되감기 조각은 상자를 거치지 않고 S3에서 나갑니다

`/dvr/*`와 `/vod/*` 요청은 CloudFront에서 S3 rewind 버킷으로 바로 갑니다. 상자 안에서는 MediaMTX가 4초 fMP4 조각을 녹화 폴더에 쓰고 훅으로 사이드카에 알리면, 사이드카가 조각을 RDS 장부에 적고 원본과 되감기용 재포장본을 S3 게이트웨이 엔드포인트로 올립니다. 그다음 장부에서 되감기 목록을 렌더해 조건부 PUT으로 발행하고, 5분마다 회차별 창 하한을 KeyValueStore에 써서 엣지의 `dvr-floor` 함수가 방송 중 회차 경로의 창 밖 조각을 404로 막게 합니다. 기록기와 함수에는 각각 스위치가 있어 둘 다 켜야 동작하고, 회차가 닫히면 하한 키를 지워 다시보기가 열리며, 회차 경로 이전의 옛 꼴 조각에는 하한을 걸지 않습니다. 녹화 폴더에 쓰기로 붙는 컨테이너는 녹화하는 MediaMTX와 지우는 janitor 둘이고, 사이드카는 읽기 전용입니다. janitor는 업로드가 장부에서 확정된 로컬 파일만 지웁니다.

이 분리 덕분에 사이드카나 janitor가 멈춰도 라이브 길(ALB → nginx → MediaMTX)은 영향을 받지 않고, 유효한 쿠키와 이미 받은 목록 주소로는 S3의 되감기 조각을 계속 받을 수 있습니다. 다만 새로 되감기를 여는 일은 사이드카가 띄우는 상태 조회에 기대므로, 사이드카가 멈추면 새로 열 수 없습니다(janitor는 로컬 녹화 정리만 맡습니다). 사이드카가 목록 한 줄을 만들기까지의 과정은 [사이드카 글](/posts/0-to-1/pokeclip-sidecar-rewind-playlist/)에, 다른 상자가 먼저 넣은 조각 하나에 목록이 멈춘 장애는 [되감기 교착 글](/posts/0-to-1/pokeclip-rewind-cache-deadlock/)에 있습니다.

## 상자가 밖으로 나가는 길은 네 묶음뿐입니다

보안 그룹의 이그레스 규칙은 다섯이지만 목적지는 네 묶음입니다. 443은 S3 프리픽스 목록 규칙과 모든 IPv4 목적지 규칙 둘로 열려 있고, RDS의 5432, Auth의 스트림 키 조회 포트, clip의 만료 방송 조회 포트가 나머지입니다. 443이 어디로 가는지는 라우팅이 가릅니다. 같은 리전의 S3는 프라이빗 라우팅 테이블의 게이트웨이 엔드포인트로, Secrets Manager·ECR·SQS·로그는 private DNS를 켠 구성(Terraform 기본값)에서 VPC 안 인터페이스 엔드포인트로 가고 끄면 NAT로 돌아가며, 나머지 인터넷 목적지는 기본 경로인 NAT로 나갑니다. 운영의 private DNS 값은 확인하지 못했습니다. 인그레스는 NLB에서 오는 SRT와 내부 ALB에서 오는 프록시 포트, 헬스뿐입니다. 사이드카와 janitor는 RDS에 IAM 토큰과 `verify-full`로 붙고, S3와 KeyValueStore에 쓸 자격은 호스트 망의 창구가 창구 토큰을 가진 둘에게만 줍니다. 자격 창구를 켠 구성에서는 IMDS 홉 상한이 1이라 공유 브리지 망의 컨테이너에는 IMDSv2 토큰 응답이 닿지 않고, 호스트 망의 자격 창구만 받습니다(끈 구성은 홉 2). 11월 16~17일에 운영 상자 둘 모두 창구를 켠 것은 공개 글에서 확인했고, 11월 25일의 운영 스위치 값은 확인하지 못했습니다. 

## 운영 포트 값과 제어면 연결 여부는 이 글에 없습니다

프록시 포트 번호, 헬스 경로, 응답기 모드와 창구를 켜는 스위치의 운영 값은 Terraform 변수라 저장소에 없고 이 글에도 없습니다. 송출 인증 절은 응답기 모드가 켜진 설정을 따라 적었고, 운영 상자가 그 모드인지는 확인하지 못했습니다. 제어면은 11월 14일 운영에서 되감기 상태 조회가 200을 낸 기록(비공개 운영 기록)이 있지만, 11월 25일 설정값은 확인하지 못했습니다. 라이브 목록 압축은 아직 nginx에 없습니다. 같은 망 칸의 컨테이너가 재생 서버를 직접 부를 수 있는 위험은 받아들인 채로 두었습니다. 네 단계의 시한에 실제로 걸리는 빈도는 재지 않았습니다.

요청이 어디서 막혔는지 찾을 때는 응답 코드 하나로 단정하지 말고 경로와 함께 보는 순서가 맞습니다. 같은 코드가 여러 층에서 납니다. 403은 CloudFront 쿠키·`live-auth` 함수이거나 nginx의 playback 대조이고, 404는 기본 동작 함수, `dvr-floor` 함수, ALB 규칙 밖, nginx 허용 목록 밖, 사이드카 상태 API 어디서든 납니다. 400은 nginx 원문 경로 거절 외에 MediaMTX가 창 밖 블로킹 요청에, 제어면이 잘못된 본문에 냅니다. 503은 CloudFront 함수가 CDN 비밀을 못 읽었을 때와 사이드카 상태 API가 준비 전·한도 초과·DB 조회 실패일 때 납니다. 그래서 먼저 경로가 어느 CloudFront 동작에 맞는지 보고, 엣지 함수 로그의 고정 문자열(`LIVE PATH DENY`·`DVR FLOOR DENY`)로 엣지에서 끝났는지 확인하고, 그다음 nginx 접근 로그의 `$upstream_status`로 nginx가 답했는지 상류가 답했는지를 가르는 순서입니다.

## 출처

- [nginx는 경로의 방송과 쿼리의 방송이 같을 때만 넘깁니다](/posts/0-to-1/pokeclip-nginx-playback-request-boundary/) — playback 대조 규칙과 시험, 역할.
- [IMDS 홉 상한을 1로 내리고 자격 창구를 따로 세웠습니다](/posts/0-to-1/pokeclip-media-imds-credential-relay/) — 상자 안 자격 경로.
- [systemd가 정리를 건너뛰자 옛 비밀 컨테이너가 남았습니다](/posts/0-to-1/pokeclip-media-host-restart-lifecycle/) — 재기동 단위.
- [서명 쿠키는 종류별로 나누고 1시간 창은 엣지에서 막았습니다](/posts/0-to-1/pokeclip-dvr-cookie-edge-floor/) — 쿠키 정책과 dvr-floor 함수.
- [사이드카는 4초 조각마다 HLS 되감기 목록을 이렇게 만듭니다](/posts/0-to-1/pokeclip-sidecar-rewind-playlist/) — 장부·S3 발행.
- [nginx — ngx_http_core_module `$uri` · `$request_uri`](https://nginx.org/en/docs/http/ngx_http_core_module.html#variables) — 정규화된 경로와 원문의 차이.
- [nginx — ngx_http_map_module](https://nginx.org/en/docs/http/ngx_http_map_module.html) — 정규식 map.
- [nginx — proxy_read_timeout](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_read_timeout) — 상류 대기 시한.
- [MediaMTX — 설정 레퍼런스 mediamtx.yml](https://github.com/bluenviron/mediamtx/blob/main/mediamtx.yml) — authMethod, authHTTPExclude, hlsCDNSecret, playback, api 항목.
- [bluenviron/mediamtx PR #6306 srt: add srtPassphrase to users](https://github.com/bluenviron/mediamtx/pull/6306) — 사용자별 passphrase.
- [AWS — ALB listener rules, path conditions and rewrite](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-update-rules.html) — 경로 고쳐 쓰기.
- [AWS — CloudFront VPC origins](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-vpc-origins.html) — 내부 ALB를 원본으로.
- [AWS — Using signed cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html) — 쿠키 검증 뒤 캐시 확인 순서.
- [AWS — CloudFront origin response timeout](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html#DownloadDistValuesOriginResponseTimeout) — 원본 응답 대기 30초.
- [AWS — CloudFront Functions KeyValueStore helper methods](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-custom-methods.html) — 함수의 KVS 읽기.
- [Docker Compose — network_mode](https://docs.docker.com/reference/compose-file/container-spec/#network_mode) — `service:` 네임스페이스 공유.
