# 실측 요약 — IMDS 홉 상한 1과 대리 창구

두 갈래로 나눈다.

1. **비공개 기록(실험 EC2 두 번)** — 계정 · ARN · 인스턴스와 보안 그룹 같은 자원 ID · 버킷 이름 · 실제 IP · 비밀 값 · 창구 운영 포트를 빼고 옮겼다. 원 기록은 공개하지 않는다. 같은 결과의 짧은 요약이 공개 저장소 [PokeClip-mono PR 519](https://github.com/3K-PokeClip/PokeClip-mono/pull/519) 본문 「Test plan」 에도 있다.
2. **공개 재측정(이 폴더의 `measure/`)** — 가짜 IMDS · 공개 저장소의 실제 `cred-relay`(PR 519 머지 커밋 `ff0ac799` 에서 빌드) · 사이드카와 같은 판의 Go SDK 소비자로 로컬에서 다시 잰 것. 누구나 다시 돌릴 수 있다.

수행 주체: 두 갈래 모두 AI 에이전트(Claude Code · Codex)가 실행했다. 실험 EC2 를 만들고 지우는 AWS 쓰기는 저장소 주인(김태윤)이 승인했고(1차는 명령 묶음을 한 번에, 2차는 실행 직전마다), 2차 실험은 그의 지시로 예정(3시간)보다 일찍(약 2시간) 끝냈다.

---

## 1. 비공개 기록에서 옮긴 것

### 1-1. 실험 EC2 1차 — 홉 상한 전제(2026-11-15 19:04–19:15 KST)

- 상자: t4g.small · Amazon Linux 2023 arm64 · docker 25.0.16 · **IAM 역할 없음**(역할 자격이 없어도 IMDS 토큰 PUT 의 도달 여부는 잴 수 있다) · 들어오는 연결 0 · IMDSv2 토큰 필수.
- 탐침: 회차 사이 30초를 쉬며(회차 간격 약 50–60초) 토큰 PUT → 토큰으로 GET → 토큰 없는 GET(IMDSv1) 의 HTTP 코드를 자리마다 기록.
- 순서: 홉 2 로 기동 → 홉 1 로 바꿈 → 홉 2 로 되돌림 → 종료 · 삭제(잔여 0).

| 탐침 자리 | 홉 2 | 홉 1 |
|---|---|---|
| 호스트 프로세스 | 토큰 받음 · GET 200 | 토큰 받음 · GET 200 |
| host 망 컨테이너 | 토큰 받음 | 토큰 받음 |
| 사용자 정의 브리지 컨테이너(MediaMTX 역) | 토큰 받음 | **토큰 PUT 응답 없음** |
| 그 망 칸을 공유한 컨테이너(compose `network_mode: service:` 역) | 토큰 받음 | **응답 없음** |
| docker0 기본 브리지 컨테이너 | 토큰 받음 | **응답 없음** |
| 모든 자리의 토큰 없는 GET | 401 | 401(홉 상한은 PUT 응답에만 걸린다) |

- 실행 중 바꾼 홉 값은 재부팅 없이 반영됐다. 홉 1 로 바꾼 뒤 17초 뒤 탐침부터 브리지 쪽이 막혔고, 홉 2 로 되돌린 뒤 19초 뒤 탐침부터 다시 닿았다(회차 간격 약 50–60초라 반영 시각의 상한만 말할 수 있다).
- 같은 실험에서 다른 방식 둘의 동작도 봤다: DOCKER-USER 체인에 특정 브리지 → 169.254.169.254 DROP 규칙을 넣으면 그 브리지(공유 망 칸 포함)만 홉과 무관하게 막혔고, 망 칸 안 OUTPUT 체인의 `-m owner --uid-owner` 규칙은 같은 망 칸에서도 uid 별로 갈랐다.

### 1-2. 실험 EC2 2차 — 창구 통합(2026-11-16 04:13–06:25 KST)

- 상자: t4g.small · Amazon Linux 2023 arm64 · docker 25.0.16 · compose 5.5.0 · **정책이 하나도 없는 전용 역할**(자격은 나오지만 아무 권한이 없다 — STS GetCallerIdentity 만 성공) · 들어오는 연결 0 · 홉 1 · IPv6 IMDS 끔.
- 구성: PR 519 브랜치(당시 HEAD `5462d5af`)의 compose 렌더에서 `cred-relay` 서비스 블록은 바이트 그대로 쓰고, MediaMTX · nginx · 사이드카 · janitor 자리는 같은 망 칸 · 같은 uid · 같은 보안 옵션의 탐침으로 바꿨다. 시작 스크립트의 토큰 생성 · 링크 주소 부착 함수는 실제 저장소 파일을 그대로 불렀다.
- 판정 줄 합계: PASS 35 · 측정만 2 · FAIL 0 · 판정 불가 0.

| 확인 | 결과 |
|---|---|
| 창구가 보낸 Expiration 대 실제 IMDS 만료(3회) | 3/3 — 보낸 값 = 응답 시각 + 60분, 오차 0.001초 이하. 그때 실제 남은 수명 약 392–393분 |
| SDK 소비자(사이드카 역 · janitor 역)가 창구에서 자격을 받음 | 각 3/3, 공급자 `CredentialsEndpointProvider` |
| MediaMTX 망 칸에서 격리 확인(`cred-relay isolation-check`) | 3/3 `imds_token=blocked relay=401` |
| **음성 대조**: 실행 중 홉을 2 로 바꿈 | 바꾼 뒤 약 10초 뒤 탐침부터 3/3 `imds_token=reachable` · 종료 1. 홉 1 로 되돌리자 약 12초 뒤 탐침부터 3/3 `blocked` |
| 창구 프로세스 강제 종료 | 3/3 자동 재시작, 다음 요청 성공까지 1.3초 · 0.6초 · 1.1초 |
| 창구가 연결을 거부하는 동안 SDK 재시도 | 3/3 재시작 없이 재시도 뒤 성공 |
| `docker kill` 뒤 | 다시 뜨지 않음(`restart: on-failure`), `docker start` 로 복구 1/1 |
| docker 데몬 재시작 | 34초 안에 모든 서비스 · 창구 주소 링크 복구, 격리 유지 |
| 상자 재부팅 | 창구 주소 링크가 사라졌다가 시작 스크립트가 다시 만듦, 격리 유지, 소비자 3/3 |
| 비밀 누출 점검(저널에서 창구 토큰 · 지금 역할 자격 세기) | 0 |

**자격 교대 추적(30분 20초 간격 표본, 약 2시간에서 조기 종료)**

| 표본(KST) | IMDS 실제 만료까지(분) | 창구가 보낸 만료 | 그 요청에서 창구가 IMDS 를 다시 읽은 까닭 |
|---|---|---|---|
| 04:15 | 392.8 | 응답 + 60분 | 없음(캐시) |
| 04:45 | 362.6 | 응답 + 60분 | 없음(캐시) |
| 05:16 | 361.9 | 응답 + 60분 | 마지막 성공 뒤 30분(`periodic`) |
| 05:46 | 331.6 | 응답 + 60분 | `periodic` |
| 06:16 | 348.6 | 응답 + 60분 | `periodic` |

- 그사이 IMDS 가 자격을 두 번 바꿨다(자격의 LastUpdated 기준 04:55 · 05:54 KST). 실제 만료는 10:48 → 11:17 → 12:05 KST 로 늦춰졌고, 창구는 30분 재조회에서 새 자격 · 새 만료를 받아 넘겼다. 모든 표본에서 보낸 만료와 「실제 만료와 응답 시각 + 60분 중 이른 것」 의 차이는 0.001초 안이었다.
- **실제 만료가 15분 안으로 들어오는 갈래(`window`)는 관찰하지 못했다.** 이 실험의 IMDS 자격은 실제 만료까지 늘 5시간 넘게 남아 있었다. 그 갈래는 저장소의 시험 · 변이 교정과 아래 공개 재측정 D1 이 덮는다.

---

## 2. 공개 재측정(`measure/`)

- 수행: AI(Claude Code). 경우 A–D 는 2026-11-16 07:24–07:32 KST(`raw/env.txt` — 약 8분, 빌드 · 준비는 07:19 부터), 경우 E 는 리뷰 반영 때 같은 날 08:07 KST 에 같은 빌드(sha256 같음)로 따로 돌렸다. 결과 수치는 `python3 -I summarize.py raw`(`raw/summary.txt`)로 원자료에서 다시 뽑는다.
- 기계: MacBook Air(Apple M5, 32GB), macOS 27.0.1, OrbStack 2.2.5(Docker Engine 29.8.2, Linux VM 커널 7.2.12-orbstack, arm64).
- 창구: 공개 저장소 3K-PokeClip/PokeClip-mono 머지 커밋 `ff0ac799235635e9e2b0d98d31a0ed0406d7a30e` 의 `media/cmd/cred-relay` 를 `golang:1.27.3-alpine`(go1.27.3)에서 `CGO_ENABLED=0 -trimpath` 로 빌드(sha256 `7221bf1f…f5ba`). 운영 compose 와 같은 제약(uid 10001 · 읽기 전용 루트 · cap 없음 · `no-new-privileges`)으로 띄웠다. 다른 점: 호스트 망이 아니라 `169.254.0.0/16` 사용자 정의 브리지의 `169.254.170.2`, 포트는 운영 값이 아닌 8080.
- SDK 소비자: `probe/main.go` 를 같은 커밋의 media 모듈 안에 넣어 빌드(aws-sdk-go-v2 v1.43.3 · config v1.32.34 · credentials v1.19.33 — `raw/build.txt`). `config.LoadDefaultConfig` 기본 사슬.
- 가짜 IMDS: `fakeimds.py`(python:3.12-alpine), `169.254.169.254:80`. IMDSv2 토큰 PUT · 역할 목록 · 역할 자격만 흉내 낸다. 홉 상한(응답 TTL)은 흉내 내지 않는다 — 홉 상한은 위 1-1 · 1-2 의 실험 EC2 와 AWS 문서가 근거다.
- 토큰: `run.sh up` 이 운영 시작 스크립트와 같은 꼴(호출자별 64자 · 끝 개행 없음 · 0400 · 소비자 uid 소유)로 만든다.

### A. 실제 만료별로 창구가 알린 만료(경우마다 창구를 새로 띄워 사이드카 토큰으로 1회)

| 가짜 IMDS 만료 설정 | 응답 때 실제로 남은 시간 | 창구가 알린 만료까지 |
|---|---|---|
| 6시간 | 21,598.8초(359.98분) | 3,600.0초(60.00분) |
| 2시간 | 7,198.4초(119.97분) | 3,600.0초(60.00분) |
| 90분 | 5,399.0초(89.98분) | 3,600.0초(60.00분) |
| 30분 | 1,798.7초(29.98분) | 1,798.7초(29.98분) |
| 10분 | 598.3초(9.97분) | 598.3초(9.97분) |

### B. 토큰 대조

| 요청 | 응답 |
|---|---|
| `Authorization` 없음 · 틀린 토큰 | 401 `Unauthorized`, `application/json` |
| 사이드카 토큰(uid 10001) · janitor 토큰(uid 10002) | 200, `application/json`, `Cache-Control: no-store`, 본문 필드 AccessKeyId · SecretAccessKey · Token · Expiration |
| `/healthz` | 204 |
| `POST /v1/credentials` · 다른 경로 | 405 · 404 |
| 사이드카 자리(토큰 마운트)와 같은 망 칸의 이웃(마운트 없음) | 이웃 401, 이웃 안에 토큰 파일 없음 |
| 창구 로그의 출발지 | 사이드카 자리의 `cred_served` 와 이웃의 `cred_denied` 가 같은 주소 |

### C. SDK 소비자

| 경우 | 결과 |
|---|---|
| C1 사이드카 자리에서 5초 간격 13회 Retrieve(창구가 60분을 알림) | 13/13 성공, 공급자 `CredentialsEndpointProvider`, SDK 가 보고한 만료 = 창구가 알린 값 − 5분(첫 값 3,299초 뒤), 창구에 온 요청 1회 |
| C2 실제 만료 6분, 10초 간격 16회 | 첫 요청 뒤 SDK 가 보고한 만료 58초 뒤 → 60초 뒤 다시 물음. 그 뒤에는 알린 만료가 5분 미만이라 Retrieve 마다 물어 16회 중 창구 요청 11회 |
| C3 토큰 파일 끝에 개행 | `authorization token contains invalid newline sequence` |
| C4 창구 주소 `169.254.170.3` | `LoadDefaultConfig` 단계에서 `only loopback/ecs/eks hosts are allowed` |
| C5 창구를 멈추고 창구 변수만 둠(`AWS_EC2_METADATA_DISABLED` 도 없음) | 3회 시도 뒤 실패, 가짜 IMDS 에 온 요청 0 |
| C5 대조: 창구 변수 없음 | SDK 가 가짜 IMDS 를 직접 읽음, 공급자 `EC2RoleProvider`, 실제 만료 6시간인데 SDK 가 보고한 만료는 3,599초 뒤 |

### D. 창구의 원천 재조회

| 경우 | 결과 |
|---|---|
| D1 실제 만료 10분, 3초 간격 14회(39초) | 원천(가짜 IMDS 역할 자격) 호출 4회 — 0 · 12 · 24 · 36초(`initial` 1, `window` 3), 나머지 10회는 캐시 |
| D2 실제 만료 6시간, 같은 요청 | 원천 호출 1회(`initial`), 13회 캐시 |
| D3 가짜 IMDS 가 3초 늦게 답함, 창구에 자격 없음 | 2,004ms 뒤 503 `CredentialsUnavailable`, `cred_source_failed` |
| D4 실제 만료 3분, 첫 자격을 받은 뒤 가짜 IMDS 가 500 | 실제 만료까지 66.4초 남은 요청까지 200(마지막 자격, 알린 만료 = 실제 만료), 58.4초 남은 요청부터 503. 원천을 부른 요청은 2.0초 상한까지 기다린 뒤 답함. 첫 실패에서 `cred_source_degraded value=1` |

### E. 같은 망 칸 이웃의 엿보기(각 3회)

사이드카 자리(토큰 마운트, uid 10001)와 같은 망 칸에 이웃(root)을 두고, 사이드카 자리가 창구에 한 번 묻는 동안 이웃이 AF_PACKET 원시 소켓으로 그 망 칸의 패킷을 6초 동안 받았다(`sniff.py` — 값은 남기지 않고 보였는지만 센다).

| 이웃의 권한 | 결과 |
|---|---|
| docker 기본 권한(NET_RAW 있음) | 3/3 소켓 열림, `Authorization` 머리와 자격 JSON(`SecretAccessKey`)이 각 1패킷씩 보임 |
| `--cap-drop ALL` | 3/3 소켓을 열지 못함(`PermissionError`) |

같은 결과를 11월 15일 비공개 로컬 실험(가짜 자격 창구 · 같은 꼴의 탐침)에서도 봤다: 기본 권한 3/3 엿봄, `cap_drop: ALL` 3/3 못 엿봄.

### 재측정 명령

```sh
git clone https://github.com/3K-PokeClip/PokeClip-mono /path/to/mono
MONO_DIR=/path/to/mono ./run.sh build   # 머지 커밋 ff0ac799 의 media 모듈만 꺼내 빌드
./run.sh up
./run.sh measure "$PWD/raw"             # 경우 A–E, 약 9분
python3 -I summarize.py raw
./run.sh down                           # 라벨 com.techblog.bench=imds-relay 의 컨테이너 · 망 · 볼륨과 /tmp/imdsw-work 를 지움
```
