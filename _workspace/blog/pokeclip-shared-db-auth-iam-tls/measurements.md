# 실측 요약 — 「미디어 서버에서 DB 비밀번호를 없앴다」

글 `/posts/0-to-1/pokeclip-shared-db-auth-iam-tls/` 의 실측 수치 출처다. 비공개 실험 · 운영 기록에서 계정 ID · 엔드포인트 · IP 를 빼고 옮겼다. 실행은 AI 에이전트, AWS 자원을 만들고 지우는 쓰기는 글쓴이가 승인했다.

## 1. 실험 RDS (2026-10-22)

- 대상: 사이드카 · janitor 이미지(PR #314 병합 전 커밋 `3690e22d`), 실험 RDS PostgreSQL 17.11 · db.t4g.micro 1대 · 서울 리전 · IAM 인증 켬 · CA `rds-ca-rsa2048-g1`.
- 토큰 서명 주체: 로컬 IAM 사용자(운영 인스턴스 역할의 첫 접속은 2절).
- 실험 자원은 끝난 뒤 삭제했다.

### 정상 경로

| 항목 | 결과 |
|---|---|
| 사이드카 IAM 기동 | `db_connected` 1줄 — `auth=iam` · `sslmode=verify-full` · `tls=true` · `user=media_indexer`. 44분 기동 유지, 재시작 0, 권한 오류(42501) 0 |
| janitor IAM 기동 | `db_connected` — `auth=iam` · `user=media_janitor`, 주기 정상 |
| janitor 새 연결 | 기동 18분 뒤 · 43분 뒤 서버 쪽에서 백엔드를 강제 종료 → 다음 주기에 새 `media_janitor` 백엔드(ssl=t)로 다시 로그인, 재기동 0 |
| `pg_stat_ssl` | `media_indexer` · `media_janitor` 백엔드 전부 `ssl=t`, TLSv1.3 |
| 첫 IAM 로그인 시간 | 약 5.6초(사이드카 · janitor 동시), 그 뒤 0.5초 안팎. 원인은 재지 않았다 |

### 거부 갈래

| 일부러 만든 상황 | 결과 |
|---|---|
| 호스트 이름 대신 IP 로 접속 | `x509: cannot validate certificate for <IP> because it doesn't contain any IP SANs`, 종료 1 |
| 다른 CA 를 신뢰 앵커로 | `x509: certificate signed by unknown authority`, 종료 1 |
| IAM + `sslmode=require` | `iam 에서는 POSTGRES_SSLMODE 가 verify-full 이어야 한다(받은 값 "require")` — DB 왕복 전 기동 에러, 0초 |
| 토큰 서명 리전 us-east-1 | `FATAL: PAM authentication failed for user "media_indexer" (SQLSTATE 28000)` |

### 토큰 수용 창

- 계획한 대조: 토큰을 캐시하는 변이 바이너리는 16분 30초 대기 뒤 새 연결에서 실패해야 했다 → 원본 · 변이본 **둘 다 성공**(판별 실패).
- 배제한 가설: 변이가 바이너리에 안 들어감(두 바이너리 sha256 이 다름) · 로컬 시계 어긋남(로컬 `date -u` 와 AWS 응답 `Date` 헤더가 같은 초).
- 서명 시각을 과거로 옮긴 토큰으로 직접 측정(시점마다 1회):

| 서명 뒤 경과 | 16분 | 18분 | 19분 30초 | 20분 30초 | 22분 | 30분 |
|---|---|---|---|---|---|---|
| 결과 | 수용 | 수용 | 수용 | 거부(PAM) | 거부(PAM) | 거부(PAM) |

- 재대조: 대기 21분 30초 → 원본 성공, 변이본만 `PAM authentication failed`.
- 한계: 인스턴스 1대 · 1회. 보장 값이 아니며 더 길 수 있다. SigV4 의 시계 어긋남 허용(5분)과의 연관은 추정이다.

## 2. 운영 첫 기동 점검 (2026-11-03)

운영 미디어 서버 첫 기동 때 런북 `infra/terraform/runbooks/media-swap.md` 의 기동 판정(`MEDIA START`)이 통과했다. 판정 항목 가운데 DB 연결은 `SIDECAR_DB`(사이드카 indexer 풀의 `db_connected` 줄 — IAM · `verify-full` · 실제 TLS) 1 이상, `JANITOR_DB`(janitor 의 `db_connected` 줄) 1 이상이다. 5분 관찰(`MEDIA WATCH`)도 같은 프로세스로 통과했다.

## 3. Java 앱 서버 스파이크 (팀원, 2026-10-23)

공개 기록은 [PR #336](https://github.com/3K-PokeClip/PokeClip-mono/pull/336) 본문 — 별도 실험 RDS(PostgreSQL 17.9 · db.t4g.micro), 로컬 맥 · 로컬 IAM 자격, 연결 수명 2분으로 32분: 토큰 187개 발급 · 실패 0, `socketTimeout` 10초에 호출자 대기 20.0초(TLS 소켓 종료 경로, 평문 대조 10.0초).
