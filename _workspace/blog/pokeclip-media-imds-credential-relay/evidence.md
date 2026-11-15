# 근거 메모 — pokeclip-media-imds-credential-relay

유형: 의사결정(대안 셋 기각 · 만료 의미 셋 중 하나) + 설계(창구의 경계 · 요청 경로). 공개 근거만 적는다.

## 역할

- 결정: 사용자(김태윤) — 2026-11-15 방식 ① 대리 창구 선택, 상자 역할에서 KVS GetKey 제거, 창구를 사이드카 이미지에 재사용, 기동 전 검사(timing-preflight)는 창구 토큰 없이 둠, 사고 대응 순서 「증거 먼저 → 격리 → 정지」, 실험 EC2 2차 승인(2026-11-16 04:13)과 조기 종료(06:24). 공개 근거: PR 519 본문 「Why」 의 결정 목록(2026-11-15), 「Test plan」 의 「약 2시간에서 끝냈다」.
- 구현 · 시험 · 실험 EC2 실측 · 리뷰 · 레퍼런스 조사: AI(Claude Code · Codex). PR 작성자 표시는 사용자 계정이지만 코드는 에이전트가 썼다.
- 이 글의 공개 재측정: AI(Claude Code), 2026-11-16 KST.

## 사실 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| Media 상자 = EC2 한 대, docker compose 로 MediaMTX · nginx · 사이드카 · janitor | PR 519 「What」 | 문헌(공개 PR) |
| 착수 때 홉 상한 2, 토큰 필수 | PR 519 「Why」 「지금 상자의 IMDS 홉 상한은 2 다」 | 문헌 |
| 역할로 할 수 있는 일: 비밀 읽기 · S3 쓰기 · KVS 쓰기 · `rds-db:connect` | PR 519 「Why」 | 문헌 |
| AWS 를 부르는 것은 사이드카 · janitor 둘뿐 | 결정 노트(비공개) · PR 519 「What」 「사이드카 · janitor 둘에게만」 | 문헌 |
| 홉 상한 = PUT 응답의 IP TTL, 기본 1, 컨테이너 환경에서 1이면 응답이 안 올 수 있음(추가 홉), 2 권장 | AWS EC2 문서 instance-metadata-v2-how-it-works · instancedata-data-retrieval 「In a container environment …」 · configuring-instance-metadata-options(1–64, 「number of network hops that the PUT response is allowed to make」) — 2026-11-16 확인 | 문헌(공식) |
| 같은 EC2 위 컨테이너는 보안 경계가 아니며 IMDS 자격에 닿을 수 있음 | AWS ECS 문서 task-iam-roles 「Containers are not a security boundary …」 — 2026-11-16 확인 | 문헌(공식) |
| IMDS 는 만료 최소 5분 전에 새 자격을 내놓음 | AWS EC2 문서 instance-metadata-security-credentials | 문헌(공식) |
| 홉 1: 브리지 · 공유 망 칸 · docker0 컨테이너 토큰 PUT 응답 없음, 호스트 · host 망은 받음, 토큰 없는 GET 은 401 로 닿음 | 실험 EC2 1차(비공개 기록 → measurements.md 1-1) | 실측(비공개 요약) |
| 실행 중 홉 변경은 재부팅 없이 약 20초 안에 양방향 반영(17 · 19초 / 10 · 12초 뒤 탐침) | 1차 콘솔 · 2차 콘솔(비공개 → measurements.md), PR 519 「Design」 「약 20초 안에 반영」 | 실측(비공개 요약) · 문헌 |
| 상자 키마다 스위치 `cred_relay`, 기본 끔, 끔 키 렌더 바이트 동일, 켬 · 끔은 새 상자로만 | PR 519 「What」 「Design」 「반영」 | 문헌 |
| 기각 대안 ② ③ ④ 와 사유 | 결정 노트 표(비공개) 와 같은 내용 — 공개 근거: ADR `docs/decisions/2026-11-15-media-imds-credential-relay.md`@ff0ac799 | 문헌 |
| EKS Pod Identity 의 꼴(FULL_URI http://169.254.170.23/v1/credentials + TOKEN_FILE) | AWS EKS 문서 pod-id-how-it-works | 문헌(공식) |
| ECS 자격 창구 169.254.170.2, 비 ECS 최적화 AMI 에서 route_localnet + DNAT 규칙 | AWS ECS 문서 task-iam-roles 「Amazon EC2 instances additional configuration」 | 문헌(공식) |
| SDK: 컨테이너 변수가 있으면 IMDS 공급자를 만들지 않음(switch 배타) | aws-sdk-go-v2 config v1.32.34 `resolve_credentials.go` 186–197행 · 공개 재측정 C5 | 문헌(소스) · 실측 |
| SDK: http 주소는 루프백 · 169.254.170.2 · 169.254.170.23 · fd00:ec2::23 만 | 같은 파일 305–310행 · 공개 재측정 C4 | 문헌(소스) · 실측 |
| SDK: 토큰 파일 끝 개행 거부 | credentials v1.19.33 `endpointcreds/provider.go` 193행 · 공개 재측정 C3 | 문헌(소스) · 실측 |
| SDK: 컨테이너 공급자 캐시 창 5분, 받은 만료 − 5분까지 다시 묻지 않음, 그 뒤 갱신 실패 시 연장 없음 | config `resolve_credentials.go` 373행, aws v1.43.3 `credential_cache.go` 98–157행(공급자가 HandleFailToRefresh 를 안 가지면 오류) · 공개 재측정 C1 · C2 | 문헌(소스) · 실측 |
| SDK `ec2rolecreds` 는 만료를 「지금 + 1시간」 으로 자름 · 갱신 실패 시 5–15분 연장 | credentials v1.19.33 `ec2rolecreds/provider.go` 103–137행 · 공개 재측정 C5 대조 | 문헌(소스) · 실측 |
| aws/aws-sdk-go-v2#2316: 자격 창구 오류 본문이 JSON 이 아니면 SDK 가 해석 실패 · 원인이 HTTP_PROXY 가 메타데이터 요청을 프록시로 보낸 것 → SDK 는 Content-Type 이 application/json 일 때만 오류 본문을 읽게 바뀜 | 이슈 본문 · 댓글(2023-10-17 · 닫힘 2023-11-21), `endpointcreds/internal/client/middleware.go` 109–110행 주석 — 2026-11-16 직접 열어 확인 | 문헌(이슈) |
| aws/aws-sdk-go-v2#3184: 대괄호 IPv6 주소가 허용 검사에 걸린다는 보고 → 메인테이너 재현 실패(url.Parse 의 Hostname 이 대괄호를 벗김), v1 SDK 경로 문제로 닫힘 | 이슈 · 댓글(2025-09-09 · 닫힘 2025-09-17) — 2026-11-16 직접 열어 확인 | 문헌(이슈) |
| 창구 상수: 60분 · 15분 · 30분 · 10초 · 1분 · 2초 | `media/internal/credrelay/consts.go`@ff0ac799 12–25행 | 코드 |
| 응답 Expiration = min(실제, 응답 + 60분), 1분 이하면 503 | `handler.go`@ff0ac799 89–97행 | 코드 |
| 재조회 규칙(요청이 몰고 감) | `cache.go`@ff0ac799 40–69행 | 코드 |
| 토큰 대조: SHA-256 다이제스트끼리 상수 시간, 모든 토큰 끝까지 | `tokens.go`@ff0ac799 83–94행 | 코드 |
| IMDS 원천: IMDSv1 폴백 끔 · 프록시 안 탐 · ec2rolecreds 안 씀 | `source.go`@ff0ac799 62–95행 | 코드 |
| 창구 서비스: host 망 · on-failure · 읽기 전용 · cap 없음 | `infra/media-host/compose.yml.tmpl`@ff0ac799 607행~ | 코드 |
| janitor 는 MediaMTX 와 같은 uid, 격리 근거는 마운트 | ADR@ff0ac799 149행 · compose 템플릿 525–530행 | 문헌 · 코드 |
| 「55분은 철회 뒤 복구의 상한이 아니다」 — 세션 취소 뒤에도 IMDS 가 옛 자격을 내는 동안 창구가 새 60분 상한으로 다시 줌 | 결정 노트(비공개) · ADR · media-host README 「대리 창구 만료 · 캐시 규칙」@ff0ac799 | 문헌 |
| 세션 취소: AWSRevokeOlderSessions 인라인 정책, 그 시각 이전 발급 자격 거부 | IAM 문서 id_roles_use_revoke-sessions | 문헌(공식) |
| 실험 EC2 2차: PASS 35 · FAIL 0, 격리 3/3, 홉 2 음성 대조 3/3, 강제 종료 복구, 재시작 · 재부팅, 교대 2회, 15분 창 미관찰 | 비공개 기록 → measurements.md 1-2, PR 519 「Test plan」 | 실측(비공개 요약) · 문헌 |
| 운영 반영 전: 머지(2026-11-16 06:51 KST, `ff0ac799`)만으로 prod 무변경, 다음 상자 교체 때 켬 | PR 519 「반영」, mergedAt 2026-11-15T21:51:20Z | 문헌 |
| CI 정책 검사가 홉 값을 「1」 또는 「켬이면 1, 아니면 2」 로만 허용 · IPv6 끔 | PR 519 「What」 표 Terraform 행 | 문헌(규칙 번호는 쓰지 않음) |
| 받아들인 위험(두 소비자는 역할 전체, 창구는 호스트 망, 엿보기 방어 전제, 새어 나간 키는 실제 만료까지, 같은 망 칸 출발지 같음) | media-host README 「대리 창구 받아들인 위험」@ff0ac799 1428행~ · PR 519 | 문헌 |

## 정정 · 해석

- 지시문은 SDK 이슈 #2316 · #3184 를 5절(만료) 근거로 들었지만, 직접 열어 보니 둘 다 만료 의미와 무관하다. #2316 은 창구 오류 본문의 Content-Type 과 프록시 문제, #3184 는 허용 주소의 IPv6 대괄호 처리다. 그래서 본문에서는 #2316 을 「창구 응답은 늘 application/json · IMDS 원천은 프록시를 타지 않음」 의 근거로(4절), #3184 는 허용 주소 목록 문장 옆에 「IPv4 를 써서 해당 없음」 으로만 둔다. 만료 의미의 근거는 SDK 소스(`credential_cache.go` · `ec2rolecreds`) 와 공개 재측정 C1 · C2 · C5 로 댄다.
- 변경 설명 문서의 「SDK 는 받은 만료를 믿고 그때까지 다시 묻지 않는다」 는 정확히는 「받은 만료 − 5분(컨테이너 공급자 캐시 창)까지」 다(C1 에서 SDK 가 보고한 만료가 창구가 보낸 값보다 정확히 5분 이르다). 본문은 5분 창을 밝혀 쓴다.
- 공개 재측정 C2 에서 새로 본 것: 보낸 만료가 5분 미만이면 SDK 는 Retrieve 마다 창구에 다시 묻는다(캐시 창을 빼면 이미 지난 시각이라). 창구는 원천 호출을 10초에 한 번으로 묶는다(D1).
- 「약 20초」 는 1차 실험 17 · 19초, 2차 실험 약 10 · 12초 뒤 탐침에서 바뀐 동작을 본 값이다. 반영 시각 자체를 잰 것이 아니라 탐침 간격 안의 상한이다.

## 쓰지 않는 것(공개 금지)

이슈 추적기 키, ADR 번호, 볼트 결정 번호, 내부 실험 이름, 정책 규칙 번호, 리뷰 라운드, 세션 이름, 팀원 이름, 내부 경로, 팀 위키, 계정 · ARN · 자원 ID · 버킷 · IP, 창구 운영 포트, terraform 경로 · IAM 주체, 사고 대응 미결 세부.
