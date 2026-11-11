---
title: "DB 비밀번호 대신 연결마다 RDS IAM 토큰을 만들었습니다"
date: 2026-11-07T04:18:13+09:00
lastmod: 2026-11-12T02:20:00+09:00
categories: ["projects"]
tags: ["PokeClip", "보안", "RDS", "IAM", "PostgreSQL", "TLS", "Go", "Java"]
draft: false
author: "김태윤"
description: "PokéClip 미디어 서버의 Go 프로그램 둘이 공유 RDS에 비밀번호 없이 붙게 하며 정한 네 가지. 토큰은 풀이 새 연결을 맺기 직전에 만들고, verify-full로 확인한 서버에만 건네며, 로그인 뒤 권한은 PostgreSQL 권한으로 따로 좁히고, 결과는 db_connected 로그 한 줄로 판정합니다. 공식 15분과 달리 실험 RDS가 약 20분까지 토큰을 받은 1회 측정, 같은 규칙을 Java 앱 서버로 넓힌 팀원의 구현까지."
---

PokéClip의 미디어 서버에는 PostgreSQL(RDS)에 붙는 Go 프로그램이 둘 있습니다. 방송 조각을 기록하는 사이드카(`segment-indexer`)와 오래된 녹화를 지우는 janitor입니다. 이 RDS는 로그인 · 클립 · 채팅을 맡은 Java 앱 서버 네 대와 같이 쓰는 공유 DB입니다. 운영에 올리기 전에 미디어 서버에는 DB 비밀번호를 두지 않기로 했습니다. 비밀번호는 어딘가에 저장하고 전달해야 하고, 한 번 새면 바꿀 때까지 누구나 쓸 수 있기 때문입니다.

대신 RDS IAM 인증을 썼습니다. 서버가 가진 AWS 역할로 짧게 사는 로그인 토큰을 서명해 비밀번호 자리에 넣는 방식입니다. IAM 정책 한 줄로 끝나지는 않았습니다. 토큰을 언제 만들지, 누구에게 건넬지, 로그인한 뒤 무엇까지 할 수 있게 할지, 실제로 그렇게 붙었는지를 무엇으로 판정할지를 각각 정해야 했습니다. 그사이 AWS가 말하는 토큰 수명(15분)과 실험 RDS가 받아 준 시간(약 20분, 1회 측정)이 달랐고, 그 차이가 시험과 판단을 바꿨습니다.

토큰을 새 연결 직전에 만드는 것, verify-full로 확인한 서버에만 건네는 것, 로그인 뒤 권한을 따로 좁히는 것, 연결 결과를 db_connected 한 줄로 판정하는 것, 이 네 가지는 10월 23일 제가 정했고, 같은 방식을 Java 앱 서버에도 적용하자고 제안했습니다. 미디어 쪽 구현 · 시험 실행 · 리뷰는 AI 에이전트(Claude Code와 Codex)가 했고, AWS 자원을 만들고 지우는 쓰기는 제가 승인했습니다. 에이전트가 구현한 코드는 10월 23일 공개 저장소 [PR #314](https://github.com/3K-PokeClip/PokeClip-mono/pull/314)로 병합됐습니다(커밋 `7f99ccd1`). 11월 3일 운영 인프라 적용은 제가 직접 했습니다. Java 앱 서버 쪽 구현은 그 서버들을 맡은 팀원이 했습니다.

## 비밀번호 대신 서버 역할로 15분짜리 토큰을 서명했습니다 {#비밀번호를-없애면-무엇이-달라지나}

| | DB 비밀번호 | RDS IAM 토큰 |
|---|---|---|
| 서버에 두는 것 | 오래 쓰는 비밀번호 | 없음. 실행 역할(인스턴스 역할)의 임시 자격만 |
| 새었을 때 쓸 수 있는 기간 | 바꿀 때까지 | 서명 뒤 짧게 — 공식 15분(실험 RDS 1회 실측은 약 20분) |
| 교체 | 비밀번호를 바꾸고 모든 서버에 다시 배포 | 할 일 없음. 연결할 때마다 새로 서명 |
| 누가 로그인할 수 있나 | 비밀번호를 아는 누구나 | `rds-db:connect` 권한을 받은 IAM 주체가 서명한 유효 토큰을 내민 쪽. 새어 나간 토큰은 수명 동안 재사용될 수 있음 |

준비는 두 쪽에서 합니다. DB에서는 사용자(`media_indexer`, `media_janitor`)를 만들고 `rds_iam` 역할을 줍니다. 이 역할이 붙은 사용자는 비밀번호보다 IAM 인증이 우선합니다([AWS 문서](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)). AWS에서는 미디어 서버의 인스턴스 역할에 [`rds-db:connect`](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.IAMPolicy.html)를 주되, 와일드카드 없이 DB 사용자마다 ARN을 적습니다. 그러면 「이 서버는 이 DB에 `media_indexer` · `media_janitor` 두 사용자로만 로그인할 수 있다」가 AWS 정책으로 표현됩니다. 역할 하나가 두 사용자의 ARN을 모두 가지므로, 사이드카와 janitor 사이의 분리는 AWS가 아니라 각 프로그램이 쓰는 사용자 이름과 DB 권한이 맡습니다.

## IAM 권한을 줘도 프로그램이 토큰을 만들어야 했습니다 {#권한만-주면-애플리케이션은-아무것도-모른다}

DB 사용자에 `rds_iam`을 주고 실행 역할에 `rds-db:connect`를 주는 것이 흔히 말하는 「IAM 권한을 붙인다」입니다. 하지만 프로그램 쪽에서는 아무것도 바뀌지 않습니다. 비밀번호로 붙던 프로그램은 접속 문자열(DSN)에 비밀번호를 넣어 연결하고, IAM 정책이 생긴 줄 모릅니다. 그래서 애플리케이션 코드가 직접 세 가지를 해야 합니다.

1. 지금 실행 중인 AWS 역할의 자격 증명 찾기(SDK 기본 자격 증명 체인 — 운영에서는 인스턴스 역할)
2. 그 자격으로 DB 호스트 · 포트 · 사용자 · 리전에 대한 토큰 서명(로컬 계산)
3. 토큰을 비밀번호 자리에 넣어 로그인

Go로 작성된 미디어 쪽은 이 일을 새 패키지 [`media/internal/pgconf`](https://github.com/3K-PokeClip/PokeClip-mono/tree/7f99ccd10f0709345cb966b042c9206b4d6a3bc5/media/internal/pgconf)에 모았습니다. 사이드카의 두 연결 풀과 janitor 풀이 모두 이 패키지로 설정을 만들고, 따로 있던 DSN 조립 코드 두 벌은 지웠습니다. 이 패키지에서 AWS SDK를 import하는 곳은 [`iam.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/7f99ccd10f0709345cb966b042c9206b4d6a3bc5/media/internal/pgconf/iam.go) 한 파일뿐입니다. `POSTGRES_AUTH`가 비었거나 `password`이면 예전처럼 비밀번호로 붙으므로 로컬 개발 환경은 바뀌지 않습니다.

## 토큰은 풀이 새 연결을 맺기 직전에 만들었습니다 {#토큰은-새-연결-직전에-만든다}

가장 쉬운 구현은 풀을 만들 때 토큰을 한 번 만들어 DSN에 넣는 것입니다. 처음에는 잘 붙고, 문제는 나중에 생깁니다. 토큰은 로그인하는 순간에만 쓰이고, 이미 맺은 연결은 토큰이 만료돼도 계속 쓸 수 있습니다([AWS 문서](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)). 하지만 풀이 연결을 새로 맺어야 할 때(연결이 끊겼거나 수명이 다했거나 부하가 늘었을 때) 오래된 토큰을 내밀면 거부됩니다. 그 순간은 배포하고 한참 뒤라서 원인을 찾기 어렵습니다.

그래서 Go PostgreSQL 드라이버 pgx의 풀이 새 연결을 맺기 직전에 부르는 `BeforeConnect`에서 매번 새 토큰을 만듭니다([`pgconf.go` 260–277행](https://github.com/3K-PokeClip/PokeClip-mono/blob/7f99ccd10f0709345cb966b042c9206b4d6a3bc5/media/internal/pgconf/pgconf.go#L260-L277)).

```go
// 축약·변형 발췌 — 지역 변수 일부를 펼치고 빈 토큰 검사를 생략했다. timeout 은 10초(tokenTimeout).
func iamBeforeConnect(tf TokenFunc, s Settings, timeout time.Duration) func(context.Context, *pgx.ConnConfig) error {
	endpoint := fmt.Sprintf("%s:%d", s.Host, s.Port)
	return func(ctx context.Context, cc *pgx.ConnConfig) error {
		// ctx 가 Background(풀 보충)여도 상한이 선다(pgx#2545).
		tctx, cancel := context.WithTimeout(ctx, timeout)
		defer cancel()
		token, err := tf(tctx, endpoint, s.Region, s.User)
		if err != nil {
			return tokenError(ctx, tctx, err, endpoint, s.Region, s.User, timeout)
		}
		cc.Password = token
		return nil
	}
}
```

토큰 생성에는 10초 상한을 따로 걸었습니다. 자격 증명 조회(인스턴스 메타데이터 서비스)는 밖으로 나가는 호출이라 응답이 늦을 수 있는데, pgx 풀이 백그라운드에서 연결을 보충할 때는 기한 없는 컨텍스트로 `BeforeConnect`를 부르기 때문입니다([jackc/pgx#2545](https://github.com/jackc/pgx/issues/2545), 2026-11-12 기준 열려 있음). pgx가 이 콜백 전체의 기한을 보장하지 않으므로, 자격 증명 조회와 서명을 합쳐 10초로 묶었습니다.

오류 문구에는 토큰 · DSN · AWS 오류 원문을 싣지 않고 오류의 타입 이름만 싣습니다. 자격 증명 도구가 실패하면 출력 원문을 SDK 오류에 넣는 경우가 있어서입니다.

실험 RDS에서 에이전트가 DB 쪽에서 janitor의 세션(백엔드)을 두 번 강제로 끊자(기동 18분 뒤, 43분 뒤), 다음 주기에 새 연결이 다시 로그인했습니다([실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-shared-db-auth-iam-tls/measurements.md)). 43분 뒤라면 처음 토큰은 이미 받아 주지 않을 때라, 새 연결이 새 토큰으로 붙었다는 뜻입니다.

영상의 연결 세 줄을 보십시오. 맺어 둔 연결 1은 만료와 상관없이 계속 질의하고, 새 연결 2는 새 토큰으로 붙고, 캐시한 토큰을 다시 쓴 연결 3만 거부됩니다.

{{< motion scene="ConnectionTokenLifetime" id="fig-connection-token-lifetime" kind="개념도" caption="토큰은 로그인 때만 검사됩니다. 맺어 둔 연결은 만료와 무관하고, 새 연결에는 유효한 토큰이 필요해 연결마다 새로 만들며, 캐시한 토큰은 약 20분 뒤 거부됩니다(20분은 실험 RDS 1대 · 1회 실측). 소재는 AI 생성입니다." >}}

## 토큰은 verify-full로 확인한 서버에만 건넸습니다 {#토큰은-verify-full로-확인한-서버에만-건넨다}

토큰은 짧게 살지만, 사는 동안에는 다시 쓸 수 있는 자격입니다. 누군가 중간에서 RDS인 척하고(잘못된 DNS 응답, 중간자) 토큰을 받으면, 그 사람은 유효 시간 안에 진짜 RDS에 `media_indexer`로 로그인할 수 있습니다. 그래서 IAM 모드에서는 TLS를 `verify-full` 하나만 허용했습니다. 서버 인증서가 믿는 CA로 서명됐는지와, 인증서의 이름이 접속하려는 호스트와 같은지를 둘 다 봅니다([PostgreSQL 문서 — SSL 모드](https://www.postgresql.org/docs/17/libpq-ssl.html)). 이 검사는 인증 메시지를 주고받기 전 TLS 핸드셰이크에서 일어나므로, 맞지 않으면 토큰을 보내기도 전에 연결이 끊깁니다([PostgreSQL 프로토콜 흐름](https://www.postgresql.org/docs/17/protocol-flow.html)).

더 약한 값은 고르지 않았습니다.

- `require`는 CA 경로가 있으면 인증서 체인만 검사하고(`verify-ca`와 같음), CA 경로가 빠지면 조용히 아무것도 검증하지 않습니다. 어느 쪽이든 호스트 이름은 보지 않습니다([PostgreSQL 문서 — SSL 모드](https://www.postgresql.org/docs/17/libpq-ssl.html)). 설정 실수 하나로 중간자에게 토큰을 줄 수 있는 값입니다.
- `verify-ca`는 인증서 체인만 봅니다. RDS 통합 CA 번들은 여러 AWS 계정의 RDS가 함께 쓰는 루트 CA 인증서들을 담고 있어서, 다른 계정의 RDS 인증서도 체인 검사는 통과합니다. 우리 인스턴스로 묶어 주는 것은 호스트 이름 검사입니다.

CA 번들([AWS 문서](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)의 전 상용 리전 통합본)은 빌드 때 내려받지 않고 저장소에 커밋했습니다. 고정 없이 빌드 때 내려받으면 빌드마다 내용이 바뀔 수 있고, `ADD --checksum`으로 고정해도 인증서 내용 자체의 변경 diff는 저장소에 남지 않습니다. 커밋해 두면 번들이 바뀔 때 리뷰할 diff가 남습니다. 기대 해시는 Dockerfile의 `sha256sum -c` 한 줄에 두고, 이미지 안에서는 root 소유 0644 파일로 둡니다. 경로는 `POSTGRES_SSLROOTCERT` 하나로 받습니다.

조용히 약해지는 길은 기동 단계에서 막았습니다([`validate`](https://github.com/3K-PokeClip/PokeClip-mono/blob/7f99ccd10f0709345cb966b042c9206b4d6a3bc5/media/internal/pgconf/pgconf.go#L137-L172)). IAM 모드에서 아래 중 하나라도 해당하면 프로그램이 뜨지 않습니다.

- 비밀번호가 남아 있음
- `sslmode`가 `verify-full`이 아님
- CA 번들 경로가 없음
- 호스트 값에 `/`나 쉼표가 있음 — pgx가 유닉스 소켓이나 여러 호스트로 읽어, 토큰을 서명한 대상과 실제로 접속하는 대상이 갈라짐
- 앞뒤 공백을 걷어낸 뒤에도 호스트 안에 공백이 남았거나, IPv6 주소가 대괄호로 감싸여 있지 않음 — 토큰에 서명하는 `호스트:포트` 형식이 깨짐

모드와 상관없이, `POSTGRES_SSLROOTCERT` 없이 `PGSSLROOTCERT`만 있어도 뜨지 않습니다([`FromEnv` 108–111행](https://github.com/3K-PokeClip/PokeClip-mono/blob/7f99ccd10f0709345cb966b042c9206b4d6a3bc5/media/internal/pgconf/pgconf.go#L108-L111)). pgx는 설정에 없어도 libpq 환경 변수 `PGSSLROOTCERT`를 기본값으로 읽기 때문에([pgx v5.10.0](https://github.com/jackc/pgx/blob/v5.10.0/pgconn/config.go#L595)), CA 경로를 받는 이름을 하나로 고정하려는 것입니다.

영상에서 위 길은 인증서와 이름이 맞는 RDS, 아래 길은 인증서가 맞지 않는 서버입니다. 아래 길의 토큰이 서버에 닿기 전에 멈추는 것을 보십시오.

{{< motion scene="TokenToVerifiedDb" id="fig-token-to-verified-db" kind="개념도" caption="verify-full은 인증서와 호스트 이름이 맞는 서버에만 토큰을 건넵니다. 맞지 않으면 TLS 단계에서 끊겨 토큰이 나가지 않습니다. 소재는 AI 생성입니다." >}}

실험 RDS(서울 리전, PostgreSQL 17.11, db.t4g.micro 1대, 토큰 서명 주체는 로컬 IAM 사용자)에서 에이전트가 거부 갈래 네 개를 일부러 일으켜 확인했습니다.

| 일부러 만든 상황 | 결과 |
|---|---|
| 호스트 이름 대신 IP로 접속 | `x509: cannot validate certificate … doesn't contain any IP SANs` — 기동 실패 |
| 다른 CA를 신뢰 앵커로 지정 | `x509: certificate signed by unknown authority` — 기동 실패 |
| IAM + `sslmode=require` | DB에 가기 전 설정 검사에서 기동 실패(0초) |
| 토큰을 다른 리전(us-east-1)으로 서명 | `PAM authentication failed for user "media_indexer"` |

정상 경로도 같은 RDS에서 확인했습니다([실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-shared-db-auth-iam-tls/measurements.md)). 사이드카는 IAM과 `verify-full`로 44분 동안 재시작 없이 떠 있었고, `pg_stat_ssl`에서 두 사용자의 연결이 모두 TLSv1.3이었습니다.

## 공식 15분짜리 토큰을 실험 RDS는 약 20분까지 받았습니다 {#iam-토큰의-공식-수명과-실측-수명}

토큰 시점과 verify-full, 두 결정은 「토큰은 15분 산다」는 공식값 위에 있었습니다([AWS 문서](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)). 계획 단계의 시험도 이 숫자를 믿었습니다. 일부러 「토큰 캐시」 버그를 심은 변이 바이너리(변이본)는 16분 30초를 기다린 뒤 새 연결에서 실패해야 했습니다. 그런데 실제 RDS에서는 원본과 변이본이 둘 다 성공했습니다.

변이가 바이너리에 안 들어갔을 가능성(캐시 변이 diff를 적용해 빌드에 성공했고, 두 바이너리의 해시도 달랐음)과 로컬 시계가 어긋났을 가능성(AWS 응답의 `Date` 헤더와 같은 초였음)을 하나씩 배제한 뒤, 서명 시각을 과거로 옮긴 토큰으로 다시 쟀습니다([실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-shared-db-auth-iam-tls/measurements.md), 결론은 [10월 23일 결정 기록](https://github.com/3K-PokeClip/PokeClip-mono/blob/7f99ccd10f0709345cb966b042c9206b4d6a3bc5/docs/decisions/2026-10-23-rds-iam-db-auth.md)에도 적었습니다). [[fig-token-acceptance]]에서 15분 점선 오른쪽에도 수용 점이 셋 있습니다. 서명 뒤 16분 · 18분 · 19분 30초 된 토큰은 받았고, 20분 30초 · 22분 · 30분 된 토큰은 `PAM authentication failed`로 거부했습니다.

{{< chart id="fig-token-acceptance" kind="실측" caption="서명 뒤 경과 시간별 IAM 토큰 로그인 결과. 실험 RDS 1대(PostgreSQL 17.11, 서울), 2026-10-22, 시점마다 1회." source="https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-shared-db-auth-iam-tls/measurements.md" height="260px" >}}
{
  "tooltip": { "trigger": "item" },
  "legend": { "top": 0 },
  "grid": { "left": "12%", "right": "6%", "bottom": "22%", "top": "22%" },
  "xAxis": { "type": "value", "name": "서명 뒤 경과(분)", "nameLocation": "middle", "nameGap": 30, "min": 12, "max": 32 },
  "yAxis": { "type": "category", "data": ["결과"], "axisLabel": { "show": false }, "axisTick": { "show": false } },
  "series": [
    {
      "name": "로그인 수용",
      "type": "scatter",
      "symbolSize": 18,
      "itemStyle": { "color": "#087f8b" },
      "data": [[16, "결과"], [18, "결과"], [19.5, "결과"]],
      "markLine": {
        "symbol": "none",
        "lineStyle": { "color": "#172c40", "type": "dashed" },
        "label": { "formatter": "공식 수명 15분" },
        "data": [{ "xAxis": 15 }]
      }
    },
    {
      "name": "로그인 거부(PAM)",
      "type": "scatter",
      "symbol": "diamond",
      "symbolSize": 18,
      "itemStyle": { "color": "#b42318" },
      "data": [[20.5, "결과"], [22, "결과"], [30, "결과"]]
    }
  ]
}
{{< /chart >}}

수용 경계는 서명 뒤 19분 30초와 20분 30초 사이였습니다. 인스턴스 1대에서 한 번 잰 값이라 보장된 값이 아니고, 더 길 수도 있습니다. 공식 15분을 넘긴 약 5분은 AWS 서명(SigV4) 요청의 시간 허용 범위(5분, [AWS 문서](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html))와 같은 크기입니다. 다만 RDS가 이 허용 범위 때문에 토큰을 더 받아 준다는 설명은 AWS 문서에서 확인하지 못한 추정입니다.

이 결과가 바꾼 것은 세 가지입니다.

- **토큰 시점 결정의 시험:** 이 인스턴스에서는 토큰을 캐시하는 버그가 15분 뒤가 아니라 약 20분 뒤에 드러납니다. 실제 RDS로 그 버그를 잡으려면 20분 30초 넘게 기다려야 합니다. 대기를 21분 30초로 늘리자 변이본만 `PAM authentication failed`로 갈라졌습니다.
- **verify-full 결정의 근거:** 이 측정에서는 새어 나간 토큰을 쓸 수 있는 창도 15분보다 길었습니다. `verify-full`을 강제한 이유가 더 단단해졌습니다.
- **기록:** 코드 주석 · README · 10월 23일 결정 기록에 「공식 15분」과 「실측 약 20분(1대 · 1회)」을 나눠 적었습니다. 처음에는 「15분 뒤 만료 → 새 연결 실패」라고 단정한 문장이 있었는데, 리뷰에서 실측과 모순된다는 지적을 받고 고쳤습니다.

## 로그인 뒤 권한은 PostgreSQL 권한으로 따로 좁혔습니다 {#로그인-뒤-권한은-따로-좁힌다}

IAM 토큰은 「누가 로그인하는가」를 정합니다. 로그인한 뒤 무엇을 할 수 있는지는 여전히 PostgreSQL 권한이 정합니다. 공유 DB에서는 이쪽이 더 길었습니다. 처음에는 `media_indexer`에 DELETE와 DDL을 주지 않았고, 10월 26일 만료 정리를 맡기며 DELETE를 주는 대신 지운 순번을 다시 쓰지 못하게 DB 트리거가 하한을 지키게 했습니다. 그 트리거 함수의 실행 권한, 그리고 `public` 스키마에 심은 같은 이름의 함수가 잠금 호출을 가로채는 길도 막아야 했습니다. 이 과정은 [공유 DB 로그인 뒤 권한 글](/posts/0-to-1/pokeclip-shared-db-login-privileges/)로 나눴습니다.

## 연결 결과는 db_connected 한 줄로 판정했습니다 {#연결-결과는-db_connected-로그-한-줄로-판정한다}

「설정에 iam이라고 썼다」와 「실제로 IAM과 TLS로 붙었다」는 다릅니다. 그래서 연결 확인에 성공하면 정해진 줄 하나를 남기게 했습니다([`connected.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/7f99ccd10f0709345cb966b042c9206b4d6a3bc5/media/internal/pgconf/connected.go)).

```text
# 형식 단순화 — 실제 출력은 같은 칸의 JSON(slog) 한 줄
db_connected pool=… auth=iam sslmode=verify-full tls=true user=media_indexer host=… port=5432 db=…
```

`tls`는 설정값이 아니라 실제 연결이 TLS인지를 본 값입니다. 이 줄은 비밀번호 모드(로컬)에서도 같은 형식으로 남는데, 그쪽 기본값 `prefer`는 서버가 TLS를 못 하면 조용히 평문으로 내려갑니다. 그래서 설정이 아니라 실제 연결 상태를 적었습니다. 비밀번호 · 토큰 · DSN은 이 줄에 싣지 않습니다. janitor에는 이 줄을 남기려고 기동 때 Ping을 새로 넣었습니다. 사이드카는 인덱서 풀 한 줄로 판정하고, 발행자 풀은 이 줄을 내지 않습니다([README](https://github.com/3K-PokeClip/PokeClip-mono/blob/7f99ccd10f0709345cb966b042c9206b4d6a3bc5/media/README.md?plain=1#L305)). 배포 점검([런북](https://github.com/3K-PokeClip/PokeClip-mono/blob/33f7ae1f879b87f3f968d5ca2637d6e72cdae5dc/infra/terraform/runbooks/media-swap.md))은 이 줄을 기준으로 판정합니다. 11월 3일 운영 미디어 서버 첫 기동 점검에서 사이드카(인덱서 풀)와 janitor의 `db_connected` 줄(`auth=iam` · `verify-full` · `tls=true`)을 확인하고 통과했습니다([실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-shared-db-auth-iam-tls/measurements.md)).

## Java 앱 서버에서는 JDBC URL이 구멍이 됐습니다 {#java-앱-서버로-넓힌-팀원의-구현}

Java 앱 서버 네 대(auth, clip, chat-collector, chat-detector — Spring Boot, HikariCP)에도 사이드카처럼 IAM 토큰을 쓰자고 제가 제안했습니다. 그 서버들을 맡은 팀원이 chat-detector 하나로 실험 RDS에서 스파이크를 한 뒤([#336](https://github.com/3K-PokeClip/PokeClip-mono/pull/336)), 네 서버가 같이 쓰는 모듈 `db-support`를 만들어 모두에 붙였습니다([#340](https://github.com/3K-PokeClip/PokeClip-mono/pull/340), [#343](https://github.com/3K-PokeClip/PokeClip-mono/pull/343)).

- **토큰 시점 — 같습니다.** Hikari의 `HikariCredentialsProvider`에 AWS SDK `RdsUtilities`로 서명한 토큰을 넣어 새 연결마다 만듭니다([`RdsIamCredentialsProvider`](https://github.com/3K-PokeClip/PokeClip-mono/blob/33f7ae1f879b87f3f968d5ca2637d6e72cdae5dc/services/db-support/src/main/java/com/pokeclip/db/RdsIamCredentialsProvider.java)). 토큰 생성 상한도 10초입니다. 팀원의 스파이크(10월 23일)에서 연결 수명을 2분으로 줄이고 32분을 돌려, 토큰 187개를 발급하는 동안 실패 0을 확인했습니다.
- **구현 방식 — AWS 공식 JDBC 래퍼는 쓰지 않았습니다.** 결정 당시(10월 23일) chat 두 서버는 응답 없는 연결을 `socketTimeout: 10`(초)으로 끊었습니다(지금은 auth · clip도 같은 10초입니다 — [auth](https://github.com/3K-PokeClip/PokeClip-mono/blob/33f7ae1f879b87f3f968d5ca2637d6e72cdae5dc/services/auth/src/main/resources/application.yml#L35) · [clip](https://github.com/3K-PokeClip/PokeClip-mono/blob/33f7ae1f879b87f3f968d5ca2637d6e72cdae5dc/services/clip/src/main/resources/application.yml#L28) 설정). 결정 당시 래퍼는 이 값을 밀리초로 받아 pgjdbc에 초로 넘겼고, 1초 미만은 경고 없이 0으로 잘렸습니다. pgjdbc는 0을 「시한 없음」으로 봅니다([aws-advanced-jdbc-wrapper#2157](https://github.com/aws/aws-advanced-jdbc-wrapper/issues/2157)). 경고만 더하는 수정([#2198](https://github.com/aws/aws-advanced-jdbc-wrapper/pull/2198))은 한국 시간 10월 23일에 병합됐고 이슈는 11월 5일에 닫혔습니다. 변환 방식은 하위 호환을 위해 그대로입니다.
- **토큰을 건넬 상대 — Java라서 구멍이 하나 더 있었습니다.** Java도 `verify-full`을 강제하고 Go와 같은 CA 번들을 씁니다(두 번들의 바이트가 같은지 시험이 확인합니다). 그런데 JDBC는 URL 쿼리와 드라이버 속성으로 접속을 바꿀 수 있습니다. `sslfactory=org.postgresql.ssl.NonValidatingFactory`는 `verify-full`을 둔 채 인증서 검증을 건너뛰고([pgJDBC 문서](https://jdbc.postgresql.org/documentation/ssl/)), `password=`는 IAM 토큰 대신 URL의 비밀번호를 드라이버에 넘기게 하고, `PGHOST=`는 서명한 호스트와 실제 접속 대상을 가릅니다. 막을 키를 고르는 방식은 리뷰에서 우회로가 두 번 연달아 나와, IAM 모드에서는 URL 쿼리를 통째로 거부하고 드라이버 속성은 `socketTimeout` 하나만 받는 허용 목록으로 바꿨습니다([`DataSourceLoginConfiguration`](https://github.com/3K-PokeClip/PokeClip-mono/blob/33f7ae1f879b87f3f968d5ca2637d6e72cdae5dc/services/db-support/src/main/java/com/pokeclip/db/DataSourceLoginConfiguration.java)). Go 쪽은 DSN을 개별 환경 변수로 직접 조립하고, DSN에 넣은 값이 pgx가 읽는 `PG*` 환경 변수보다 우선해서([pgx v5.10.0 `ParseConfig`](https://github.com/jackc/pgx/blob/v5.10.0/pgconn/config.go#L356-L363)) IAM 경로에 이런 통로가 없습니다.
- **로그인 뒤 권한 — 서버마다 사용자를 따로 뒀습니다.** 서버별 사용자는 제가 IAM 적용과 함께 제안한 방향이고 팀원이 구현했으며, 남의 표를 읽는 권한은 그 표의 주인이 주게 했습니다. 이 내용도 [로그인 뒤 권한 글](/posts/0-to-1/pokeclip-shared-db-login-privileges/#서버마다-사용자를-따로-두고-남의-표-읽기는-표-주인이-줬습니다)에 있습니다.
- **판정 — 같습니다.** `auth` · `sslmode` · `tls` 등 공통 칸의 `db_connected` 줄을 남기고, `tls`도 실제 연결 기준입니다.

네 결정은 언어가 바뀌어도 같았고, 달라진 것은 구멍이 생기는 자리였습니다.

## 20분 창은 1대 · 1회 측정이고 되돌리기에는 별도 절차가 필요합니다 {#남은-한계}

- 20분 수용 창은 인스턴스 1대 · 1회 측정입니다. 다른 인스턴스 · 버전에서 같은지는 모릅니다.
- Java 스파이크 환경의 TLS 연결에서는 호출자가 읽기 시한(10초)의 두 배를 기다렸습니다. 10초 시한이 걸린 뒤 드라이버가 TLS 소켓을 닫는데, JDK가 닫기 전에 남은 입력을 한 번 더 읽고 거기에도 같은 시한이 걸려 호출자는 20초를 기다렸습니다(스레드 덤프로 확인, [PR #336](https://github.com/3K-PokeClip/PokeClip-mono/pull/336)). IAM이 아니라 TLS 소켓을 닫는 경로 때문이고, 무한히 매달리지는 않습니다.
- 실험 RDS에서 첫 IAM 로그인은 약 5.6초가 걸렸고([실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-shared-db-auth-iam-tls/measurements.md)), 그 뒤 로그인은 0.5초 안팎이었습니다. 원인은 재지 않았습니다.
- 같은 네트워크 네임스페이스의 컨테이너는 인스턴스 메타데이터에서 같은 역할 자격을 얻을 수 있어, 두 DB 사용자의 토큰을 다 만들 수 있습니다.
- 코드가 막을 수 없는 조건이 있습니다. 컨테이너에 정적 AWS 키 환경 변수가 있거나 `~/.aws`가 마운트되면 SDK가 인스턴스 역할보다 그것을 먼저 씁니다([AWS SDK for Go v2 문서](https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-gosdk.html)). 배포 정의에서 이 둘이 없음을 지켜야 합니다.
- 운영을 비밀번호로 되돌리는 일은 `POSTGRES_AUTH`를 비우는 것만으로 되지 않습니다. `rds_iam`을 가진 사용자는 IAM 인증이 우선이라 별도 절차가 필요합니다([AWS 문서](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html), [README 「password 로 되돌리기」](https://github.com/3K-PokeClip/PokeClip-mono/blob/7f99ccd10f0709345cb966b042c9206b4d6a3bc5/media/README.md?plain=1#L2511)).

IAM 인증을 붙일 때는 정책보다 먼저 「토큰을 언제 만들고 누구에게 건네는가」를 코드에서 정하십시오. 그리고 공식 수명을 시험의 대기 시간으로 그대로 쓰지 말고, 실제 인스턴스가 받아 주는 시간을 한 번은 재 보십시오.

## 측정 조건

- 10월 22일 실험 RDS: 서울 리전, PostgreSQL 17.11, db.t4g.micro 1대, IAM 인증 켬. 사이드카 · janitor 이미지는 PR #314 병합 전 커밋, 토큰 서명 주체는 로컬 IAM 사용자였습니다. 토큰 수용 창은 서명 시각을 과거로 옮긴 토큰으로 시점마다 1회 쟀습니다. AI 에이전트가 실행했고 AWS 자원 생성 · 삭제는 제가 승인했으며, 자원은 끝난 뒤 지웠습니다.
- 11월 3일 운영 첫 기동: 인프라 적용은 제가 직접 했고, 런북의 기동 판정(`SIDECAR_DB` · `JANITOR_DB`)은 에이전트 세션이 돌렸습니다. 5분 관찰도 재시작 없이 통과했습니다.
- 10월 23일 Java 스파이크(팀원, PR #336): 별도 실험 RDS(PostgreSQL 17.9, db.t4g.micro), 로컬 맥에서 로컬 IAM 자격으로, 연결 수명 2분으로 32분.
- 수치 원본은 [실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-shared-db-auth-iam-tls/measurements.md)에 계정 · 주소를 빼고 옮겼습니다. 상류 이슈 상태는 2026년 11월 12일에 확인했습니다.

## 출처

공식 문서
- AWS, [IAM database authentication for MariaDB, MySQL, and PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html) — 토큰 수명 15분 · 토큰은 인증 때만 쓰임 · `rds_iam` 우선
- AWS, [Creating and using an IAM policy for IAM database access](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.IAMPolicy.html) — `rds-db:connect`
- AWS, [Signature Version 4 for API requests](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html) — 요청 시간 허용 5분
- AWS, [Using SSL/TLS to encrypt a connection to a DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html) — RDS CA 통합 번들
- PostgreSQL 17, [SSL Support (libpq)](https://www.postgresql.org/docs/17/libpq-ssl.html) — `require` · `verify-ca` · `verify-full`
- PostgreSQL 17, [Message Flow](https://www.postgresql.org/docs/17/protocol-flow.html) — TLS 협상 뒤 인증
- pgJDBC, [Using SSL](https://jdbc.postgresql.org/documentation/ssl/) — `sslfactory` 설정
- AWS, [Configure the SDK (Go v2)](https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-gosdk.html) — 자격 증명 탐색 순서

코드 · 결정 기록(공개 저장소 3K-PokeClip/PokeClip-mono)
- [PR #314](https://github.com/3K-PokeClip/PokeClip-mono/pull/314) — 사이드카 · janitor RDS IAM 인증, 실험 RDS 시험 항목(병합 `7f99ccd1`)
- [10월 23일 결정 기록 `2026-10-23-rds-iam-db-auth.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/7f99ccd10f0709345cb966b042c9206b4d6a3bc5/docs/decisions/2026-10-23-rds-iam-db-auth.md) — RDS IAM DB 인증 결정과 고르지 않은 대안
- [`media/internal/pgconf`](https://github.com/3K-PokeClip/PokeClip-mono/tree/7f99ccd10f0709345cb966b042c9206b4d6a3bc5/media/internal/pgconf) — `pgconf.go` · `iam.go` · `connected.go`
- [PR #336](https://github.com/3K-PokeClip/PokeClip-mono/pull/336) · [PR #340](https://github.com/3K-PokeClip/PokeClip-mono/pull/340) · [PR #343](https://github.com/3K-PokeClip/PokeClip-mono/pull/343) — Java 앱 서버 스파이크와 `db-support`(팀원)
- [`media/README.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/7f99ccd10f0709345cb966b042c9206b4d6a3bc5/media/README.md) — `db_connected` 줄 · DB 접속 운영 전제 · password 로 되돌리기
- [운영 런북 `media-swap.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/33f7ae1f879b87f3f968d5ca2637d6e72cdae5dc/infra/terraform/runbooks/media-swap.md) — 기동 판정 `SIDECAR_DB` · `JANITOR_DB`

실측
- [실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-shared-db-auth-iam-tls/measurements.md) — 실험 RDS(2026-10-22) 정상 · 거부 경로, 토큰 수용 창, 운영 첫 기동 점검(2026-11-03). 비공개 기록에서 계정 · 주소를 빼고 옮김

이슈 · 외부 코드
- [jackc/pgx#2545](https://github.com/jackc/pgx/issues/2545) — 풀 보충 경로의 `BeforeConnect` 컨텍스트(2026-11-12 열림)
- pgx v5.10.0 `pgconn/config.go` — [접속 문자열이 `PG*` 환경 변수보다 우선](https://github.com/jackc/pgx/blob/v5.10.0/pgconn/config.go#L356-L363), [`PGSSLROOTCERT` 기본값](https://github.com/jackc/pgx/blob/v5.10.0/pgconn/config.go#L595)
- [aws/aws-advanced-jdbc-wrapper#2157](https://github.com/aws/aws-advanced-jdbc-wrapper/issues/2157) — 1초 미만 시한이 0이 되는 결함(2026-11-05 한국 시간 닫힘)
- [aws/aws-advanced-jdbc-wrapper#2198](https://github.com/aws/aws-advanced-jdbc-wrapper/pull/2198) — 경고만 더하고 변환은 그대로 둔 수정

이어지는 글
- [공유 DB에선 로그인 뒤 권한과 함수 가로채기를 막았습니다](/posts/0-to-1/pokeclip-shared-db-login-privileges/)
