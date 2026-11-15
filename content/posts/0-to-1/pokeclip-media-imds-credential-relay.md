---
title: "IMDS 홉 상한을 1로 내리고 자격 창구를 따로 세웠습니다"
date: 2026-11-16T07:25:23+09:00
categories: ["projects"]
tags: ["PokeClip", "보안", "AWS", "IMDS", "IAM", "Docker", "Go"]
draft: false
author: "김태윤"
description: "PokéClip Media 상자는 IMDS 홉 상한이 2라서 인터넷에 열린 MediaMTX · nginx 컨테이너도 상자의 역할 자격을 받을 수 있습니다. 홉 상한을 1로 내려 컨테이너로 가는 IMDS 토큰 응답을 끊고, 호스트 망의 대리 창구가 토큰 파일을 가진 사이드카 · janitor에게만 자격을 건네는 구성을 만든 결정. 망 칸 분리 · uid 거름을 기각한 이유, SDK 컨테이너 자격 공급자 꼴, 실제 만료 대신 60분 상한을 알려 주는 이유와 공개 재측정, 실험 EC2 확인, 아직 운영 상자에 켜지 않은 상태까지."
---

PokéClip의 Media 상자는 EC2 한 대에서 docker compose로 MediaMTX · nginx · 사이드카 · janitor 등을 돌립니다. 이 상자는 인스턴스 메타데이터 서비스(IMDS)의 홉 상한이 2라서, 인터넷에 열린 MediaMTX와 nginx 컨테이너도 상자의 역할 자격을 받을 수 있습니다. 그 역할에는 비밀 · 저장소 · DB 접속 권한이 들어 있습니다. 그래서 홉 상한을 1로 내려 컨테이너로 가는 IMDS 토큰 응답을 버리고, 호스트 망의 대리 창구가 토큰 파일을 가진 사이드카와 janitor에게만 자격을 건네는 구성을 만들었습니다. 실험 EC2에서 MediaMTX 망 칸(네트워크 네임스페이스)의 토큰 요청은 홉 1에서 3/3 막혔고, 음성 대조로 홉을 2로 바꾸자 3/3 다시 닿았습니다.

방식과 범위는 제가 정했습니다. 대리 창구를 고른 것, 상자 역할에서 쓰지 않는 KVS 읽기 권한(`GetKey`)을 함께 뺀 것, 창구 프로그램을 사이드카 이미지에 함께 넣은 것, 사고 대응 순서를 「증거 먼저 → 격리 → 정지」로 둔 것이 그 결정입니다. 창구가 알려 줄 만료의 60분 상한과 IMDS 재조회 규칙은 AI의 레퍼런스 조사가 고른 값이고, 제가 따로 고르지는 않았습니다. 구현 · 시험 · 실험 EC2 실측 · 리뷰 · 레퍼런스 조사는 AI 에이전트(Claude Code와 Codex)가 했고, 실험 EC2를 만들고 지우는 일은 제가 승인했습니다(1차는 명령 묶음을 한 번에, 2차는 실행 직전마다). 변경은 11월 16일 develop에 병합됐지만([PokeClip-mono PR 519](https://github.com/3K-PokeClip/PokeClip-mono/pull/519), 머지 커밋 `ff0ac799`), 상자마다 켜는 스위치의 기본값이 꺼짐이라 운영 상자는 아직 홉 2 그대로입니다. `GetKey`를 뺀 것은 스위치와 상관없이 다음 운영 적용 때 반영됩니다.

## 인터넷에 열린 MediaMTX도 역할 자격을 받을 수 있습니다

IMDS는 EC2 안의 링크 로컬 주소 `169.254.169.254`에서 그 인스턴스의 정보와 인스턴스 역할의 임시 자격을 내주는 서비스입니다. 토큰을 요구하는 IMDSv2에서는 먼저 `PUT`으로 세션 토큰을 받고, 그 토큰을 붙여 `GET`으로 자격을 읽습니다. 홉 상한은 이 `PUT` 응답 패킷의 IP TTL입니다. 기본값은 1이고, AWS 문서는 컨테이너 환경에서 1이면 「컨테이너로 가는 길이 홉 하나로 쳐져」 응답을 받지 못할 수 있으니 2로 올리는 방법을 안내합니다([AWS 문서 — 메타데이터 접근 고려 사항](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html#imds-considerations), [IMDSv2 동작](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-v2-how-it-works.html)).

우리 상자는 지금 그 2입니다. docker 브리지를 한 번 건너는 응답도 닿으니, 상자 위 모든 컨테이너가 같은 역할 자격을 받을 수 있습니다. 이 역할에는 비밀 · 저장소 · DB 접속 권한이 들어 있는데, 실제로 AWS를 부르는 것은 사이드카와 janitor 둘뿐입니다. MediaMTX와 nginx는 인터넷에서 오는 송출 · 재생 요청을 받습니다. 둘 중 하나가 침해되면 그 자리에서 역할 전체가 넘어가는 구조입니다. AWS도 같은 EC2 위 컨테이너는 보안 경계가 아니며, 컨테이너가 IMDS로 인스턴스 역할 자격에 닿을 수 있다고 적습니다([AWS ECS 문서 — 작업 IAM 역할](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)).

[RDS IAM 인증 글](/posts/0-to-1/pokeclip-shared-db-auth-iam-tls/#남은-한계)에 남긴 한계도 같은 뿌리입니다. 같은 망 칸의 컨테이너는 IMDS에서 같은 역할 자격을 얻어 두 DB 사용자의 토큰을 다 만들 수 있습니다.

## 홉 상한이 1이면 브리지 컨테이너로 가는 토큰 응답이 버려집니다

컨테이너가 보낸 `PUT`은 호스트를 거쳐 IMDS로 가고, 응답은 거꾸로 호스트가 docker 브리지로 전달합니다. 전달할 때 TTL이 1 줄어 0이 되므로 홉 상한 1의 응답은 컨테이너에 닿기 전에 버려집니다. 호스트 자신과 호스트 망을 쓰는 컨테이너는 전달을 거치지 않아 그대로 받습니다.

이 전제는 11월 15일 실험 EC2(t4g.small, Amazon Linux 2023 arm64, docker 25.0.16, IAM 역할 없음, 들어오는 연결 0)에서 에이전트가 먼저 확인했습니다. 회차 사이 30초를 쉬며(회차 간격 약 50–60초) 자리별로 토큰을 받아 보게 한 결과입니다([실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-media-imds-credential-relay/measurements.md)).

| 토큰을 받으려는 자리 | 홉 2 | 홉 1 |
|---|---|---|
| 호스트 프로세스 · host 망 컨테이너 | 받음 | 받음 |
| 사용자 정의 브리지 컨테이너(MediaMTX 자리) | 받음 | 응답 없음 |
| 그 망 칸을 같이 쓰는 컨테이너(사이드카 자리) | 받음 | 응답 없음 |
| docker0 기본 브리지 컨테이너 | 받음 | 응답 없음 |

홉 상한은 `PUT` 응답에만 걸립니다. 토큰 없이 보낸 `GET`의 401 응답은 홉 1에서도 컨테이너까지 왔습니다.

실행 중인 상자의 홉 값을 바꾸면 재부팅 없이 반영됐습니다. 홉 1로 바꾸고 17초 뒤 탐침부터 브리지 쪽이 막혔고, 2로 되돌리고 19초 뒤 탐침부터 다시 닿았습니다. 반영 시각을 따로 잰 것은 아니고, 탐침 간격 안에서 본 상한입니다. 이 성질이 배포 방식을 정했습니다. 모듈의 홉 값을 한 번에 1로 바꾸면 지금 떠 있는 상자도 20초 안에 끊기고, 그 상자의 사이드카는 자격을 잃어 기록을 올리지 못합니다. 그래서 스위치를 상자마다 두고 새 상자부터 켜기로 했습니다.

붉은 선이 컨테이너로 가는 토큰 응답, 청록 선이 창구를 거치는 자격입니다.

{{< motion scene="HopLimitRelay" id="fig-hop-relay" kind="개념도" caption="홉 상한 2에서는 IMDS 토큰 응답이 docker 브리지 안 모든 컨테이너에 닿습니다. 홉 상한 1에서는 브리지로 가는 응답이 버려지고 호스트 망의 대리 창구만 받으며, 창구는 토큰 파일이 있는 사이드카와 janitor에게만 자격을 주고 MediaMTX · nginx의 요청에는 401을 돌려줍니다." >}}

## 망 칸 분리 · uid 거름 대신 호스트 대리 창구를 골랐습니다

홉 1은 사이드카와 janitor도 막습니다. 둘은 MediaMTX의 루프백 포트에 닿도록 MediaMTX의 망 칸을 같이 쓰기 때문입니다. 그래서 둘에게는 다른 길로 자격을 줘야 했고, 11월 15일 네 가지를 견줬습니다(비공개 결정 기록에서 옮김).

| | ① 홉 1 + 호스트 대리 창구(채택) | ② 망 칸 분리 + DOCKER-USER 규칙 | ③ 홉 2 + 망 칸 안 uid 거름 | ④ 지금대로 두고 한계만 기록 |
|---|---|---|---|---|
| 막는 범위 | 모든 컨테이너, 창구 토큰을 받은 둘만 예외 | MediaMTX 망 칸 전체 | 망 칸 안에서 정한 uid 외 | 없음 |
| 새 컨테이너의 기본값 | 막힘 | 규칙을 넣은 칸만 막힘 | 규칙이 없는 칸은 닿음 | 닿음 |
| 새 코드 | 중계 프로그램 하나와 시험 | 루프백으로 묶인 미디어 경로 재배선 | 셸 · compose 규칙 | 없음 |
| 고르지 않은 이유 | — | MediaMTX 관리 API를 망에 열어야 하고 미디어 경로를 크게 고쳐야 함 | 규칙이 망 칸과 함께 사라져 재생성마다 다시 넣어야 하고 그 사이 틈이 생김. uid 번호에 묶이고, root로 뜨는 nginx 주 프로세스는 uid를 바꿀 수 있음. 운영 선례를 찾지 못함 | 위험이 그대로 |

②와 ③의 동작 자체는 같은 실험 EC2에서 확인했습니다. 특정 브리지에서 IMDS로 가는 패킷을 DOCKER-USER 체인에서 버리면 그 칸만 막혔고, 망 칸 안 OUTPUT 체인의 owner 규칙은 같은 칸에서도 uid별로 갈랐습니다. 막을 수 있느냐가 아니라 규칙의 수명과 기본값이 갈랐습니다. ①은 새 브리지 · 망 칸 컨테이너를 추가해도 기본으로 막힙니다.

①의 창구는 AWS SDK의 컨테이너 자격 공급자 꼴을 그대로 따릅니다. 소비자에게 `AWS_CONTAINER_CREDENTIALS_FULL_URI`(창구 주소)와 `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE`(토큰 파일 경로)을 주면, SDK는 그 주소에 토큰 파일 내용을 `Authorization` 머리로 실어 자격을 묻습니다([AWS SDK 참조 — 컨테이너 자격 공급자](https://docs.aws.amazon.com/sdkref/latest/guide/feature-container-credentials.html)). EKS Pod Identity가 노드의 에이전트(`169.254.170.23`)와 토큰 파일로 파드에 자격을 주는 꼴과 같고([AWS EKS 문서](https://docs.aws.amazon.com/eks/latest/userguide/pod-id-how-it-works.html)), ECS의 자격 창구 주소 `169.254.170.2`도 같은 공급자로 읽힙니다. 사이드카와 janitor의 코드는 한 줄도 바뀌지 않았고 환경 변수만 바뀌었습니다. 우리 판 Go SDK는 이 변수가 있으면 IMDS 공급자를 아예 만들지 않으며([`resolve_credentials.go` 186–197행](https://github.com/aws/aws-sdk-go-v2/blob/config/v1.32.34/config/resolve_credentials.go#L186-L197)), IMDS 길은 `AWS_EC2_METADATA_DISABLED=true`로 한 번 더 닫았습니다.

SDK는 `http` 창구 주소로 루프백 · `169.254.170.2` · `169.254.170.23` · `fd00:ec2::23`만 받습니다([같은 파일 305–310행](https://github.com/aws/aws-sdk-go-v2/blob/config/v1.32.34/config/resolve_credentials.go#L305-L310)). 컨테이너의 루프백은 그 망 칸 안이라 호스트의 창구에 닿지 않으므로, 창구는 `169.254.170.2`에서 듣게 했습니다. 시작 스크립트가 호스트에 더미 네트워크 장치를 만들어 그 주소를 붙입니다. IPv6 주소의 대괄호 처리가 이 검사에 걸린다는 보고도 있었지만 재현되지 않고 닫혔고([aws/aws-sdk-go-v2#3184](https://github.com/aws/aws-sdk-go-v2/issues/3184)), 우리는 IPv4 주소라 해당하지 않습니다.

듣는 자리로는 ECS처럼 iptables DNAT로 루프백 창구에 돌리는 방식(규칙 수명을 우리가 관리하고 `route_localnet`을 열어야 함, [AWS ECS 문서](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html#task-iam-role-considerations))과 별도 systemd 유닛(기존 기동 모델 변경)을 기각했습니다. 창구는 compose 안의 서비스로 두되 호스트 망 · 읽기 전용 루트 · 리눅스 권한(capability) 없음으로 띄웠습니다([compose 템플릿 607행부터](https://github.com/3K-PokeClip/PokeClip-mono/blob/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/infra/media-host/compose.yml.tmpl#L607-L642)). 창구 바이너리는 별도 이미지 대신 사이드카 이미지에 함께 넣었습니다. 고정할 이미지가 하나 줄어드는 대신, 창구를 켠 상자는 이 병합 이후에 빌드한 사이드카를 써야 합니다.

## 같은 망 칸에서는 주소가 아니라 토큰 파일로 가릅니다

사이드카 · janitor · MediaMTX · nginx는 한 망 칸을 쓰므로 창구가 보는 출발지 주소가 모두 같습니다. 공개 재측정에서도 토큰을 가진 사이드카 자리의 요청과 토큰 없는 이웃의 요청이 창구 로그에 같은 출발지로 남았습니다. 그래서 창구는 주소가 아니라 토큰으로 호출자를 가립니다.

- **토큰을 만드는 쪽**: 시작 스크립트가 상자를 띄울 때마다 호출자별로 64자 토큰을 새로 만듭니다. 파일은 메모리 위 임시 파일 시스템(tmpfs)에 두어 재부팅하면 사라지고, 주인만 읽을 수 있는 0400입니다. 각 소비자의 토큰 폴더는 그 소비자 컨테이너에만 읽기 전용으로 붙고, 창구는 두 토큰의 사본을 따로 받습니다. 파일 끝에는 개행을 넣지 않습니다. SDK가 개행이 든 토큰을 거부하기 때문입니다([`endpointcreds/provider.go` 193행](https://github.com/aws/aws-sdk-go-v2/blob/credentials/v1.19.33/credentials/endpointcreds/provider.go#L190-L194)).
- **토큰을 대조하는 쪽**: 창구는 토큰 원문 대신 SHA-256 다이제스트를 들고, 요청 머리의 다이제스트를 모든 호출자와 상수 시간으로 끝까지 견줍니다([`tokens.go` 83–95행](https://github.com/3K-PokeClip/PokeClip-mono/blob/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/media/internal/credrelay/tokens.go#L83-L95)). 걸린 시간으로 토큰을 한 글자씩 맞혀 보는 길을 막으려는 것입니다.
- **엿보기를 막는 쪽**: 창구와 소비자는 평문 HTTP로 이야기합니다. 같은 망 칸에서 원시 소켓 권한(NET_RAW)이 있는 이웃은 그 토큰과 자격 응답을 그대로 엿볼 수 있었고, 권한을 모두 버리면(`cap_drop: ALL`) 엿보지 못했습니다. 비공개 로컬 실험에서 기본 권한 3/3 엿봄 · `cap_drop: ALL` 3/3 못 엿봄이었고, 공개 재측정에서도 같았습니다. 상자의 모든 컨테이너는 권한을 버리고 뜨며, nginx만 CHOWN · SETGID · SETUID를 되살립니다.

uid는 근거로 쓰지 않았습니다. janitor는 녹화를 지우려고 MediaMTX와 같은 uid로 뜨므로, 둘을 가르는 것은 uid가 아니라 토큰 폴더가 붙었느냐입니다. 저장소의 렌더 시험이 이 마운트 쌍을 단언합니다([결정 기록 146–149행](https://github.com/3K-PokeClip/PokeClip-mono/blob/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/docs/decisions/2026-11-15-media-imds-credential-relay.md?plain=1#L146-L149), [media-host README 「대리 창구 받아들인 위험」](https://github.com/3K-PokeClip/PokeClip-mono/blob/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/infra/media-host/README.md?plain=1#L1428-L1451)).

창구의 응답 꼴도 SDK에 맞췄습니다. 오류 본문까지 모두 `Content-Type: application/json`이고 자격 응답에는 `Cache-Control: no-store`를 붙입니다. 우리 판 SDK는 `Content-Type`이 정확히 `application/json`일 때만 오류 본문을 읽습니다([`middleware.go` 108–111행](https://github.com/aws/aws-sdk-go-v2/blob/credentials/v1.19.33/credentials/endpointcreds/internal/client/middleware.go#L108-L111)). 이 분기는 자격 창구가 JSON이 아닌 오류를 내 SDK가 해석에 실패한 보고에서 들어왔고, 그 보고에서 보고자는 `HTTP_PROXY`가 요청을 프록시로 보낸 것을 원인으로 짐작했습니다([aws/aws-sdk-go-v2#2316](https://github.com/aws/aws-sdk-go-v2/issues/2316)). 창구는 IMDS를 읽을 때 프록시 변수를 타지 않습니다. 타면 IMDS 토큰과 역할 자격이 평문으로 프록시를 지나기 때문입니다. 토큰 `PUT`이 실패해도 토큰 없는 IMDSv1로 내려가지 않습니다([`source.go` 62–82행](https://github.com/3K-PokeClip/PokeClip-mono/blob/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/media/internal/credrelay/source.go#L62-L82)).

공개 재측정에서 PR 519 머지 커밋으로 빌드한 실제 창구에 요청을 보낸 결과입니다(가짜 IMDS, [측정 조건](#측정-조건)).

| 요청 | 응답 |
|---|---|
| 토큰 없음 · 틀린 토큰 | 401 `Unauthorized` |
| 사이드카 토큰 · janitor 토큰 | 200, `no-store` |
| 사이드카와 같은 망 칸의 토큰 없는 이웃 | 401, 이웃 컨테이너에는 토큰 파일이 없음 |
| 사이드카 자리에서 SDK(`config.LoadDefaultConfig`) | 공급자 `CredentialsEndpointProvider`로 자격 받음 |
| 개행이 붙은 토큰 파일 · 허용 목록 밖 주소(`169.254.170.3`) | SDK가 거부 |
| 같은 망 칸 이웃이 원시 소켓으로 엿봄 | 기본 권한이면 3/3 토큰 머리 · 자격 JSON이 보임, `cap_drop: ALL`이면 3/3 소켓을 못 엶 |
| 창구를 멈춘 채 SDK 호출 | 실패, 가짜 IMDS에 온 요청 0 |

창구 변수가 있으면 창구가 없어도 SDK는 IMDS로 내려가지 않습니다.

## 실제 만료 대신 60분 상한을 알려 줍니다

창구가 자격과 함께 알려 주는 만료(Expiration)를 무엇으로 할지가 마지막 결정이었습니다. 우리 판 Go SDK의 컨테이너 자격 공급자는 받은 만료에서 5분을 뺀 시각까지 캐시를 쓰고, 그동안 창구에 다시 묻지 않습니다([`resolve_credentials.go` 373행](https://github.com/aws/aws-sdk-go-v2/blob/config/v1.32.34/config/resolve_credentials.go#L370-L374), [`credential_cache.go`](https://github.com/aws/aws-sdk-go-v2/blob/v1.43.3/aws/credential_cache.go#L98-L157)). 그 뒤 창구가 실패하면 연장 없이 오류를 냅니다. 반면 SDK가 IMDS를 직접 읽는 공급자(`ec2rolecreds`)는 만료를 「지금 + 1시간」으로 자르고, 갱신에 실패하면 5–15분 연장합니다([`ec2rolecreds/provider.go` 103–137행](https://github.com/aws/aws-sdk-go-v2/blob/credentials/v1.19.33/credentials/ec2rolecreds/provider.go#L103-L137)).

IMDS가 주는 실제 만료는 몇 시간 뒤일 수 있습니다. 실험 EC2에서는 늘 5시간 넘게 남아 있었습니다. 셋을 견줬습니다.

- **ⓐ 실제 만료를 그대로 알림**: EKS Pod Identity 에이전트가 원천의 만료를 그대로 넘기는 방식입니다([eks-pod-identity-agent v0.2.6](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.6/internal/cloud/eksauth/service.go#L107-L113)). 그런데 우리 소비자는 그 몇 시간 동안 다시 묻지 않습니다. 침해 대응으로 역할 세션을 취소하거나 IMDS가 자격을 교대해도, 소비자는 옛 키에 묶이고 되살리는 길이 소비자 재시작뿐입니다. 기각했습니다.
- **ⓑ SDK의 `ec2rolecreds`로 IMDS를 읽어 그 값을 알림**: 이 공급자가 만료를 1시간으로 잘라 버려 창구가 실제 만료를 잃습니다. IMDS가 잠깐 실패할 때 언제까지 마지막 자격을 줘도 되는지 알 수 없습니다. 기각했습니다.
- **ⓒ 실제 만료는 창구 안에 두고, 응답마다 `min(실제 만료, 응답 시각 + 60분)`을 알림**: 채택했습니다([`handler.go` 89–97행](https://github.com/3K-PokeClip/PokeClip-mono/blob/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/media/internal/credrelay/handler.go#L89-L97)). 소비자는 늦어도 55분 안에 다시 묻고, 알린 만료는 늘 실제 만료 이하입니다.

실제 만료를 바꿔 가며 창구가 알린 만료를 잰 결과입니다. 실제 남은 시간이 60분보다 길면 60분으로 잘리고, 짧으면 그대로 갑니다.

{{< chart id="fig-expiry-cap" kind="실측" caption="가짜 IMDS가 준 실제 만료까지 남은 시간과 창구가 응답에 실은 만료까지 남은 시간(분). 점선은 상한 60분입니다. 실제 cred-relay(PokeClip-mono ff0ac799 빌드), 경우마다 새로 띄운 창구에 사이드카 토큰으로 1회 요청, 2026-11-16 공개 재측정." source="https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-media-imds-credential-relay/measure" height="360px" >}}
{
  "grid": { "left": "10%", "right": "6%", "bottom": "18%", "top": "16%" },
  "legend": { "top": 0 },
  "xAxis": { "type": "category", "name": "가짜 IMDS 만료 설정", "nameLocation": "middle", "nameGap": 32, "data": ["6시간", "2시간", "90분", "30분", "10분"] },
  "yAxis": { "type": "value", "name": "남은 시간(분)", "min": 0 },
  "series": [
    {
      "name": "실제 만료까지",
      "type": "bar",
      "itemStyle": { "color": "#7a8a9b" },
      "label": { "show": true, "position": "top", "formatter": "{c}" },
      "data": [359.98, 119.97, 89.98, 29.98, 9.97]
    },
    {
      "name": "창구가 알린 만료까지",
      "type": "bar",
      "itemStyle": { "color": "#087f8b" },
      "label": { "show": true, "position": "top", "formatter": "{c}" },
      "data": [60, 60, 60, 29.98, 9.97],
      "markLine": {
        "symbol": "none",
        "lineStyle": { "color": "#087f8b", "type": "dashed" },
        "label": { "show": false },
        "data": [{ "yAxis": 60 }]
      }
    }
  ]
}
{{< /chart >}}

| 가짜 IMDS 만료 설정 | 응답 때 실제로 남은 시간 | 창구가 알린 만료까지 |
|---|---|---|
| 6시간 | 21,598.8초(359.98분) | 3,600.0초(60분) |
| 2시간 | 7,198.4초(119.97분) | 3,600.0초(60분) |
| 90분 | 5,399.0초(89.98분) | 3,600.0초(60분) |
| 30분 | 1,798.7초(29.98분) | 1,798.7초(29.98분) |
| 10분 | 598.3초(9.97분) | 598.3초(9.97분) |

SDK 쪽도 같은 재측정에서 확인했습니다. 창구가 60분을 알리자 SDK가 보고한 만료는 정확히 5분 이른 55분 뒤였고, 5초 간격으로 13번 자격을 꺼내는 1분 동안 창구에는 요청이 한 번만 왔습니다. 실제 만료를 6분으로 두자 SDK는 1분 뒤 다시 물었습니다. 그 뒤로는 알린 만료가 5분보다 짧아 캐시 창을 빼면 이미 지난 시각이 되므로, SDK는 자격을 꺼낼 때마다 창구에 물었습니다. 2분 30초 동안 16번 꺼내는 사이 창구 요청이 11번이었습니다. IMDS를 직접 읽게 한 대조에서는 SDK가 실제 6시간 대신 1시간 뒤를 만료로 보고했습니다.

「55분」은 응답 한 벌이 소비자를 묶는 길이일 뿐, 철회 뒤 복구의 상한은 아닙니다. 역할 세션을 취소하면 그 시각 전에 발급된 자격은 AWS가 거부합니다([AWS IAM 문서 — 세션 취소](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html)). 하지만 IMDS가 그 옛 자격을 계속 내주는 동안에는 창구도 그것을 새 60분 상한으로 다시 줍니다. 확실한 복구는 새 상자로 바꾸는 것입니다. 또 새어 나간 키는 창구가 알린 만료와 상관없이 AWS의 실제 만료까지 쓸 수 있습니다. 그 시간을 줄이는 수단은 세션 취소 하나입니다.

창구가 IMDS를 다시 읽는 규칙은 요청이 몰고 갑니다. 배경 작업은 없습니다. 인증된 요청이 왔을 때 마지막 유효분이 없거나, 실제 만료까지 15분 이하이거나, 마지막 성공 뒤 30분이 지났으면 IMDS를 부릅니다. 원천 호출 사이는 성공 · 실패와 무관하게 최소 10초이고, 호출 하나는 2초 안에 끝나야 합니다. IMDS가 실패하면 마지막 자격을 실제 만료 1분 전까지 계속 주고, 그동안 저하 신호(`cred_source_degraded`)를 남깁니다([`consts.go` 12–25행](https://github.com/3K-PokeClip/PokeClip-mono/blob/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/media/internal/credrelay/consts.go#L12-L25), [`cache.go` 40–69행](https://github.com/3K-PokeClip/PokeClip-mono/blob/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/media/internal/credrelay/cache.go#L40-L69)).

같은 재측정에서 이 규칙을 하나씩 일으켜 봤습니다.

| 경우 | 결과 |
|---|---|
| 실제 만료 10분, 3초 간격 14번 요청(39초) | IMDS 호출 4번(0 · 12 · 24 · 36초), 나머지 10번은 캐시 |
| 실제 만료 6시간, 같은 요청 | IMDS 호출 1번 |
| 자격이 없는데 IMDS가 3초 늦게 답함 | 2.0초 뒤 503 |
| 실제 만료 3분에서 첫 자격을 받은 뒤 IMDS 실패 | 실제 만료까지 66초 남은 요청까지 마지막 자격으로 200, 58초 남은 요청부터 503 |

마지막 경우 IMDS를 다시 부른 요청은 2초 상한까지 기다린 뒤 답했습니다. 10초 간격 규칙 덕분에 그 사이 요청은 기다리지 않았습니다.

## 실험 EC2에서 격리 · 재시작 복구 · 자격 교대를 확인했습니다

11월 16일 새벽 실험 EC2를 한 번 더 띄웠습니다(t4g.small, Amazon Linux 2023 arm64, docker 25.0.16, 정책이 하나도 없는 전용 역할, 들어오는 연결 0, 홉 1, IPv6 IMDS 끔). PR 브랜치의 compose 렌더에서 창구 서비스 블록은 바이트 그대로 쓰고, MediaMTX · nginx · 사이드카 · janitor 자리는 같은 망 칸 · uid · 보안 옵션의 탐침으로 바꿨습니다. 시작 스크립트의 토큰 생성 · 주소 부착 함수는 저장소 파일을 그대로 불렀습니다. 판정 줄은 통과 35, 실패 0이었습니다([실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-media-imds-credential-relay/measurements.md), [PR 519 「Test plan」](https://github.com/3K-PokeClip/PokeClip-mono/pull/519)).

| 확인 | 결과 |
|---|---|
| MediaMTX 망 칸에서 IMDS 토큰 · 창구 | 3/3 토큰 막힘 · 창구 401 |
| 홉을 2로 바꾼 음성 대조 | 바꾸고 약 10초 뒤 탐침부터 3/3 토큰 닿음, 1로 되돌리자 약 12초 뒤 3/3 막힘 |
| 사이드카 · janitor 자리의 SDK | 각 3/3 창구에서 자격 받음 |
| 알린 만료와 실제 IMDS 만료 | 3/3 「응답 시각 + 60분」, 오차 0.001초 이하 |
| 창구 프로세스 강제 종료 | 3/3 자동 재시작, 다음 요청 성공까지 0.6–1.3초 |
| `docker kill` | 다시 뜨지 않음(비정상 종료가 아니므로), `docker start`로 복구 |
| docker 데몬 재시작 · 상자 재부팅 | 34초 안에 복구 · 사라진 창구 주소를 시작 스크립트가 다시 붙임, 둘 다 격리 유지 |

자격 교대는 약 30분 간격 표본 다섯 개로 2시간 동안 따라갔습니다. 그사이 IMDS가 자격을 두 번 바꿨고, 창구는 「마지막 성공 뒤 30분」 규칙으로 새 자격과 새 만료를 받아 넘겼습니다. 모든 표본에서 알린 만료는 「실제 만료와 응답 시각 + 60분 중 이른 것」과 0.001초 안에서 같았습니다. 실험은 3시간을 잡았지만 이 정도면 충분하다고 보고 제가 2시간에서 끝냈습니다. 그래서 **실제 만료가 15분 안으로 들어오는 갈래는 실제 IMDS로 관찰하지 못했습니다.** 이 실험의 자격은 늘 5시간 넘게 남아 있었습니다. 그 갈래는 저장소의 시험과 위 공개 재측정이 덮습니다.

## 떠 있는 상자는 그대로 두고 새 상자부터 켭니다

스위치는 상자 키마다 하나이고 기본값은 끔입니다. 끈 상자는 홉 2 그대로이고, compose 렌더 결과가 바이트 하나까지 지금과 같습니다. 저장소 시험이 이것을 단언합니다. 켠 상자만 홉 1이 되고 창구 서비스와 소비자 환경 변수 · 토큰 마운트가 렌더됩니다. IPv6 IMDS 주소는 스위치와 상관없이 모든 상자에서 끕니다.

실수로 홉 값을 2에 고정하는 변경은 CI의 정책 검사가 막습니다. 홉 값은 「1」 또는 정확히 「켜면 1, 아니면 2」인 식만 받습니다. 홉 변경이 떠 있는 상자에 20초 안에 걸리므로, 떠 있는 상자의 메타데이터 설정이 바뀌는 계획이 보이면 적용하지 않는다는 규칙도 교체 런북에 넣었습니다. 켜고 끄는 것은 새 상자로 바꿀 때만 합니다.

11월 16일 06시 51분 develop에 병합된 것까지가 지금 상태입니다. 운영 자동 배포가 없고 떠 있는 상자는 첫 부팅 설정 변경을 무시하므로, 병합만으로 운영 상자는 바뀌지 않았습니다. 다음 Media 상자 교체 때 새 상자를 켬으로 띄우고, 그 전에 사이드카 이미지와 설치 묶음을 이 병합 이후 커밋으로 다시 빌드해야 합니다. 켠 뒤 24시간 감시도 그때 합니다.

## 경계가 아니라 피해 반경을 줄인 것입니다

같은 EC2 위 컨테이너는 여전히 보안 경계가 아닙니다. 이 변경은 MediaMTX나 nginx 하나가 뚫렸을 때 그 자리에서 역할 전체가 넘어가는 길을 끊을 뿐입니다. 알고 받아들인 위험은 이렇습니다([media-host README 「대리 창구 받아들인 위험」](https://github.com/3K-PokeClip/PokeClip-mono/blob/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/infra/media-host/README.md?plain=1#L1428-L1451)).

- 사이드카와 janitor는 각자 필요한 만큼이 아니라 역할 전체를 받습니다. 소비자별 권한 분리는 목표가 아니었습니다. 켠 상자에서는 RDS IAM 글의 한계가 「같은 망 칸의 모든 컨테이너」에서 「창구 토큰을 받은 둘」로 좁아집니다.
- 창구는 호스트 망에 있어, 장악되면 호스트의 루프백 서비스에 닿습니다. 그 시점엔 이미 역할 전체를 얻은 뒤라 더 잃는 것이 작고, 창구는 root가 아니며 권한이 없습니다. 켠 상자의 호스트 리스너 목록은 아직 재지 않았습니다.
- 엿보기 방어는 모든 컨테이너가 권한을 버렸다는 것과 토큰 폴더가 소비자 · 창구에만 붙는다는 두 전제에 기댑니다.
- 창구를 멈춰도 공격자가 이미 가져간 키의 시간은 줄지 않습니다.
- 토큰 없는 컨테이너가 뚫려도 같은 망 칸 안의 자원(MediaMTX 관리 API 등)은 그대로 위험합니다. 이 변경이 막는 것은 AWS 권한까지입니다.

사고 대응은 순서만 정했습니다. 증거를 먼저 남기고, 격리하고, 그다음 멈춥니다. compose를 내리면 컨테이너 파일 시스템과 로그가 지워지기 때문입니다. 그 아래 세부 절차는 보안 런북의 후속 작업으로 남겼습니다.

컨테이너를 돌리는 EC2라면 IMDS 홉 상한부터 확인하십시오. 2라면 상자 위 모든 컨테이너가 인스턴스 역할을 쥐고 있습니다. 자격이 필요한 컨테이너가 일부라면 SDK 컨테이너 자격 공급자 꼴의 창구로 그 경로만 열 수 있고, 소비자 코드는 바꾸지 않아도 됩니다. 다만 SDK가 받은 만료 직전까지 다시 묻지 않으므로, 창구가 알려 줄 만료는 실제 만료와 따로 정해야 합니다.

## 측정 조건

- 실험 EC2 두 번(비공개 기록 요약): 2026년 11월 15일 19:04–19:15 KST(홉 전제, IAM 역할 없음)와 11월 16일 04:13–06:25 KST(창구 통합, 정책 없는 전용 역할). 둘 다 t4g.small, Amazon Linux 2023 arm64, docker 25.0.16, 들어오는 연결 0. 2차의 창구는 PR 519 브랜치 커밋 `5462d5af`에서 교차 빌드했고, 그 뒤 동작이 바뀐 커밋 둘은 저장소 시험으로만 확인했습니다. AI 에이전트가 실행했고 AWS 자원을 만들고 지우는 일은 제가 승인했으며(1차는 명령 묶음을 한 번에, 2차는 실행 직전마다), 끝난 뒤 자원이 남지 않은 것을 확인했습니다. 수치는 [실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-media-imds-credential-relay/measurements.md)에 비공개 기록에서 계정 · 주소를 빼고 옮겼습니다.
- 공개 재측정: AI(Claude Code)가 2026년 11월 16일 07:24–07:32 KST에 실행했고, 같은 망 칸 엿보기 경우만 같은 날 08:07 KST에 같은 빌드로 따로 돌렸습니다. MacBook Air(Apple M5, 32GB), macOS 27.0.1, OrbStack 2.2.5(Docker Engine 29.8.2, Linux VM 커널 7.2.12-orbstack, arm64).
- 창구: PokeClip-mono 머지 커밋 `ff0ac799`의 `media/cmd/cred-relay`를 `golang:1.27.3-alpine`에서 빌드해, 운영 compose와 같은 제약(uid 10001, 읽기 전용 루트, 권한 없음)으로 띄웠습니다. 운영과 달리 호스트 망이 아니라 `169.254.0.0/16` 브리지 망의 `169.254.170.2`에서 들었고 포트도 다릅니다. 홉 상한은 흉내 내지 않았습니다.
- SDK 소비자: 같은 커밋의 media 모듈 안에서 빌드한 작은 프로그램(aws-sdk-go-v2 v1.43.3, config v1.32.34, credentials v1.19.33)이 `config.LoadDefaultConfig`로 자격을 꺼냈습니다.
- 가짜 IMDS: Python 표준 라이브러리 서버가 `169.254.169.254`에서 IMDSv2 토큰 · 역할 목록 · 역할 자격만 흉내 내고, 가짜 자격의 만료는 기동 때 「지금 + 설정 초」로 정합니다. 경우마다 1회 요청이고, 버전 · 이미지 다이제스트 · 빌드 해시는 `raw/env.txt` · `raw/build.txt`에 있습니다.
- 명령: `measure/` 폴더에서 `MONO_DIR=<PokeClip-mono 클론> ./run.sh build` → `./run.sh up` → `./run.sh measure "$PWD/raw"` → `python3 -I summarize.py raw` → `./run.sh down`(라벨 `com.techblog.bench=imds-relay`의 컨테이너 · 망 · 볼륨만 지움). 스크립트와 원자료는 [저장소 `_workspace/blog/pokeclip-media-imds-credential-relay/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-media-imds-credential-relay/measure)에 있습니다.

## 출처

공식 문서
- AWS, [How Instance Metadata Service Version 2 works](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-v2-how-it-works.html) — PUT 응답 홉 상한(IP TTL) 기본 1
- AWS, [Access instance metadata — Instance metadata access considerations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html#imds-considerations) — 컨테이너 환경에서 홉 1이면 응답이 안 올 수 있음, 2 안내
- AWS, [Configure the Instance Metadata Service options](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html) — 홉 상한 1–64, 실행 중 인스턴스에서도 변경 가능
- AWS, [Retrieve security credentials from instance metadata](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-security-credentials.html) — 역할 자격 자동 교대, 만료 5분 전 이전에 새 자격
- AWS, [Amazon ECS task IAM role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html) — 컨테이너는 보안 경계가 아님, `169.254.170.2` · DNAT · `route_localnet`
- AWS, [Understand how EKS Pod Identity works](https://docs.aws.amazon.com/eks/latest/userguide/pod-id-how-it-works.html) — `169.254.170.23` · 토큰 파일
- AWS, [Container credential provider](https://docs.aws.amazon.com/sdkref/latest/guide/feature-container-credentials.html) — `AWS_CONTAINER_CREDENTIALS_FULL_URI` · `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE`
- AWS, [Revoke IAM role temporary security credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html) — 세션 취소

코드 · 결정 기록(공개 저장소 3K-PokeClip/PokeClip-mono, 머지 커밋 `ff0ac799`)
- [PokeClip-mono PR 519](https://github.com/3K-PokeClip/PokeClip-mono/pull/519) — 홉 상한 1과 대리 창구, 상자별 스위치, 실험 EC2 확인 요약(2026-11-16 develop 병합)
- [결정 기록 `2026-11-15-media-imds-credential-relay.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/docs/decisions/2026-11-15-media-imds-credential-relay.md) — 고른 방식과 기각한 대안
- [`media/internal/credrelay`](https://github.com/3K-PokeClip/PokeClip-mono/tree/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/media/internal/credrelay) — `consts.go` · `cache.go` · `handler.go` · `tokens.go` · `source.go`
- [`infra/media-host/compose.yml.tmpl`](https://github.com/3K-PokeClip/PokeClip-mono/blob/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/infra/media-host/compose.yml.tmpl#L607-L642) — 창구 서비스
- [`infra/media-host/README.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/infra/media-host/README.md?plain=1#L1353-L1370) — 만료 · 캐시 규칙, [받아들인 위험](https://github.com/3K-PokeClip/PokeClip-mono/blob/ff0ac799235635e9e2b0d98d31a0ed0406d7a30e/infra/media-host/README.md?plain=1#L1428-L1451)

AWS SDK for Go v2 소스(우리 판)
- config v1.32.34 [`resolve_credentials.go`](https://github.com/aws/aws-sdk-go-v2/blob/config/v1.32.34/config/resolve_credentials.go) — 공급자 선택(186–197행) · 허용 주소(305–310행) · 캐시 창 5분(373행)
- aws v1.43.3 [`credential_cache.go`](https://github.com/aws/aws-sdk-go-v2/blob/v1.43.3/aws/credential_cache.go#L98-L157) — 만료 − 캐시 창까지 캐시, 갱신 실패 처리
- credentials v1.19.33 [`ec2rolecreds/provider.go`](https://github.com/aws/aws-sdk-go-v2/blob/credentials/v1.19.33/credentials/ec2rolecreds/provider.go#L103-L137) — 1시간 자르기 · 5–15분 연장, [`endpointcreds/provider.go`](https://github.com/aws/aws-sdk-go-v2/blob/credentials/v1.19.33/credentials/endpointcreds/provider.go#L190-L194) — 토큰 개행 거부, [`middleware.go`](https://github.com/aws/aws-sdk-go-v2/blob/credentials/v1.19.33/credentials/endpointcreds/internal/client/middleware.go#L108-L111) — JSON 오류 본문 분기

이슈
- [aws/aws-sdk-go-v2#2316](https://github.com/aws/aws-sdk-go-v2/issues/2316) — 자격 창구의 JSON 아닌 오류 응답과 `HTTP_PROXY`(2023-11-21 닫힘)
- [aws/aws-sdk-go-v2#3184](https://github.com/aws/aws-sdk-go-v2/issues/3184) — 허용 주소의 대괄호 IPv6(재현 안 됨, 2025-09-17 닫힘)

실측
- [실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-media-imds-credential-relay/measurements.md) — 실험 EC2 두 번(비공개 기록에서 계정 · 주소를 빼고 옮김)과 공개 재측정
- [공개 재측정 스크립트 · 원자료](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-media-imds-credential-relay/measure)

이어지는 글
- [DB 비밀번호 대신 연결마다 RDS IAM 토큰을 만들었습니다](/posts/0-to-1/pokeclip-shared-db-auth-iam-tls/) — 이 역할 자격으로 DB 토큰을 만드는 쪽
