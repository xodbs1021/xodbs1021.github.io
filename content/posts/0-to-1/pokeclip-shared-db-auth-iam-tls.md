---
title: "RDS IAM 권한을 줬는데, 애플리케이션의 DB 인증은 어떻게 구현할까"
date: 2026-10-28T18:38:09+09:00
categories: ["projects"]
tags: ["PokeClip", "Go", "Java", "Spring Boot", "PostgreSQL", "RDS", "IAM", "TLS"]
draft: false
author: "김태윤"
description: "AWS 역할의 접속 권한부터 새 연결마다 만드는 토큰, TLS 서버 검증, PostgreSQL의 테이블 권한까지. PokeClip의 Go 미디어 서비스와 Java 앱 서버에 RDS IAM 인증을 연결한 과정."
---

서버에 `rds-db:connect` 권한을 붙였다고 애플리케이션이 자동으로 RDS에 로그인하지는 않는다. JDBC URL과 비밀번호만 읽던 프로그램은 IAM 정책이 생겼다는 사실을 모른다. **그 권한을 가진 AWS 자격 증명을 찾고, DB 로그인용 토큰을 만들고, 새 연결의 비밀번호 자리에 넣는 코드**가 필요하다.

PokeClip에서도 이 경계를 연결해야 했다. 방송 조각을 기록하는 Go 사이드카와 오래된 파일을 정리하는 janitor부터 시작했고, 이후 로그인·클립·채팅을 담당하는 Java 서버 넷에도 같은 원칙을 적용했다. 한 DB를 함께 쓰더라도 서버별 계정과 권한을 나누고, 언어마다 공통 접속 모듈을 두었다.

나는 IAM 인증 전환, TLS 검증 강도, CA 배포 방식과 검증 범위를 결정했고, 앱 서버까지 같은 방식으로 확장하도록 요청했다. 미디어 쪽 구현·시험 실행·리뷰에는 AI 에이전트를 활용했다. Java 부분은 팀 저장소에 반영된 코드를 기준으로 설명한다. 이 글의 실험 수치는 **2026년 10월 22일 미디어 쪽 실험 RDS 검증**이고, 구현 설명은 **11월 6일에 확인한 출시 `main`의 `bad85cc7`** 기준이다.

![임시 출입증을 든 작업자와 보호된 자료실의 열린 서랍 한 칸을 표현한 그림](/images/pokeclip-shared-db-auth-iam-tls-access-illustration.png)

*서버의 신원, 로그인 자격, 자료에 대한 권한을 나눠 생각하기 위한 AI 생성 비유 그림이다. 실제 AWS 구성이나 보안 경계를 그린 도식은 아니다.*

## 로그인까지 다섯 가지가 맞아야 한다

PokeClip의 `clip` 서버가 방송 조각을 읽는 상황을 따라가 보자. 서버는 ECS에서 실행되고, PostgreSQL에는 `app_clip`이라는 사용자로 접속한다. 여기에는 서로 다른 이름표가 두 개 있다. **AWS 역할은 AWS가 판단하는 실행 주체이고, `app_clip`은 PostgreSQL 안에서 권한을 판단할 사용자**다.

| 단계 | 답해야 할 질문 | PokeClip에서 담당하는 곳 |
|---|---|---|
| 네트워크 | 이 서버가 RDS의 포트까지 도달할 수 있는가? | VPC·라우팅·보안 그룹 |
| IAM 정책 | 이 AWS 역할이 해당 RDS의 `app_clip`으로 로그인해도 되는가? | 태스크 역할의 `rds-db:connect` |
| 애플리케이션 | 현재 역할의 자격 증명으로 로그인 토큰을 만드는가? | Java `db-support`, Go `pgconf` |
| TLS | 토큰을 전달하는 상대가 의도한 DB인가? | CA 번들과 `verify-full` |
| PostgreSQL | 그 사용자를 IAM으로 인증하며, 필요한 SQL을 허용하는가? | `rds_iam`과 스키마·테이블 `GRANT` |

예를 들어 보안 그룹이 막혀 있으면 토큰이 올바르더라도 접속은 시간 초과로 끝날 수 있다. DB 로그인까지 성공했어도 테이블의 `SELECT` 권한이 없으면 조회는 거절된다. 따라서 “RDS 접근권한을 줬다”라는 말만으로는 어느 단계가 준비됐는지 알 수 없다.

RDS의 IAM DB 인증을 활성화하는 설정도 필요하다. 저장소의 Terraform은 RDS에 `iam_database_authentication_enabled = true`를 설정하고, 앱 배포에는 `POSTGRES_AUTH=iam`과 CA 파일 경로를 전달한다. 서버별 사용자 이름은 환경변수와 IAM 정책의 대상에 같은 값으로 들어간다. 둘 중 한쪽만 `app_clip`이고 다른 쪽이 공용 사용자라면, 코드와 정책이 서로 다른 로그인을 가리키게 된다. [RDS 설정](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/infra/terraform/prod/runtime/rds.tf), [앱 배포 설정](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/infra/terraform/prod/platform/services.tf)

## IAM은 어느 DB 사용자로 로그인할 수 있는지 정한다

`rds-db:connect`의 대상은 RDS 전체를 뜻하는 일반 관리 ARN이 아니다. **DB 리소스 ID와 DB 사용자 이름을 조합한 `dbuser` ARN**이다. 아래는 형태를 보여주는 설명용 예시이며, 실제 계정 번호나 배포 값이 아니다.

```text
arn:aws:rds-db:<리전>:<AWS 계정>:dbuser:<DB 리소스 ID>/app_clip
```

이 대상을 허용받은 역할은 해당 DB의 `app_clip`으로 IAM 인증을 시도할 수 있다. 다른 DB나 다른 사용자까지 자동으로 허용되는 것은 아니다. 이때 쓰는 DB 리소스 ID는 사람이 붙인 DB 이름이나 접속 호스트 이름과 구분해야 한다. [AWS의 IAM DB 접근 정책 설명](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.IAMPolicy.html)

PokeClip의 Java 서버는 각각 자기 사용자에 대응하는 ARN을 태스크 역할에 받는다. `auth`는 `app_auth`, `clip`은 `app_clip`, 채팅 수집기와 판별기는 각각 `app_chat_collector`, `app_chat_detector`다. 이 매핑을 Terraform에서 생성하므로 앱 설정과 IAM 정책의 사용자 이름을 따로 손으로 관리하지 않는다. [태스크 역할 정책](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/infra/terraform/prod/platform/task_policies.tf)

미디어 쪽에는 차이가 있다. 사이드카와 janitor의 DB 사용자는 분리했지만, 둘이 실행되는 Media EC2의 **인스턴스 역할에는 두 사용자에 대한 접속 권한이 함께** 들어간다. 따라서 DB 사용자 분리만으로 같은 서버의 두 프로세스가 AWS 역할 수준에서도 완전히 격리됐다고 말할 수는 없다. [Media 인스턴스 역할](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/infra/terraform/modules/media_host/iam.tf)

## 애플리케이션은 비밀번호 대신 토큰을 전달한다

IAM 인증에서도 프로그램은 PostgreSQL 드라이버로 DB에 연결한다. SQL이 AWS API 요청으로 바뀌는 것은 아니다. 달라지는 것은 **연결을 인증할 때 비밀번호 자리에 무엇을 넣느냐**다.

앱은 AWS SDK의 기본 자격 증명 공급자를 사용한다. 운영 구성에서는 ECS 태스크 역할이나 EC2 인스턴스 역할의 자격 증명을 이용하도록 설계했다. 이 자격 증명으로 리전·호스트·포트·DB 사용자에 맞는 토큰을 서명하고, 그 문자열을 DB 드라이버에 전달한다. 토큰 서명 자체는 로컬 계산이지만, 그 전에 역할 자격 증명을 얻거나 갱신하는 과정에는 네트워크 접근이 생길 수 있다. [Go 토큰 생성 코드](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/media/internal/pgconf/iam.go), [Java 토큰 생성 코드](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/services/db-support/src/main/java/com/pokeclip/db/RdsTokenSigner.java)

여기서 **토큰 생성 성공과 DB 접속 성공은 별개**다. 문자열을 서명했다는 것만으로 실제 RDS가 권한을 허용했다고 볼 수 없다. 잘못된 사용자나 리전으로도 서명 작업 자체는 진행될 수 있고, 실제 접속 과정에서 인증이 거절된다. 그래서 토큰 발급 로그만 보고 배포 성공을 판정하지 않았다.

DB 쪽에서도 사용자를 준비해야 한다. PostgreSQL 사용자에게 `rds_iam` 역할을 부여해야 IAM 인증을 사용할 수 있고, 그 이름이 IAM 정책에 적힌 사용자와 일치해야 한다. PokeClip의 역할 생성 SQL에는 미디어 두 계정과 Java 앱 네 계정 모두 이 설정이 있다. [AWS의 PostgreSQL 사용자 설정](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.DBAccounts.html), [프로젝트의 계정 생성 SQL](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/infra/terraform/prod/runtime/sql/10_roles.sql)

## 토큰 생성 시점은 풀 생성이 아니라 새 연결 직전

IAM 토큰의 공식 유효 시간은 15분이다. 하지만 이미 인증을 마친 DB 세션을 15분 뒤에 강제로 종료한다는 뜻은 아니다. 토큰은 인증에 사용되고, 이미 성립한 세션에는 영향을 주지 않는다. [AWS 공식 설명](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)

이 차이는 연결 풀에서 중요해진다. 연결 풀은 DB 연결을 매 요청마다 새로 만드는 대신, 만들어 둔 연결을 빌려주고 돌려받는다. **풀에서 기존 연결을 빌리는 것**과 **새 물리 연결을 여는 것**은 서로 다른 사건이다.

처음 기동할 때 토큰을 한 번 만들고 풀의 비밀번호로 고정했다고 해 보자. 기동 직후에는 정상이고, 기존 연결만 재사용하는 동안에도 문제가 안 보일 수 있다. 시간이 지나 DB가 연결을 끊거나 풀이 연결을 교체하면 새 인증이 필요해진다. 이때 오래된 토큰을 다시 쓰면 재접속이 실패한다. “처음에는 잘 되는데 오래 켜 두면 DB 접속이 안 된다”는 형태의 결함이 된다.

따라서 토큰은 **새 물리 연결 직전마다** 생성하도록 했다. 토큰 때문에 정상 연결을 주기적으로 끊을 필요도 없고, 쿼리를 실행할 때마다 새 토큰을 만들 필요도 없다.

<figure>
<video controls playsinline preload="none" poster="/images/pokeclip-shared-db-auth-iam-tls-iam-connection-lifetime-poster.jpg" width="1920" height="1080" aria-label="토큰의 유효 시간이 지나도 기존 DB 연결은 유지되고, 재접속에는 새 토큰을 사용하는 과정을 보여주는 움직이는 그림">
<source src="/videos/pokeclip-shared-db-auth-iam-tls-iam-connection-lifetime.mp4" type="video/mp4">
</video>
<figcaption>토큰 만료가 기존 DB 세션을 끊지는 않는다. 새 연결이 필요해지면 새 토큰으로 인증한다. 설명용 움직이는 그림이며 실제 측정 화면이 아니다. 소리는 없다.</figcaption>
</figure>

## 공통화할 대상은 연결 문자열보다 정책이었다

### Go에서는 pgx의 BeforeConnect에 연결했다

사이드카에는 조각 색인용 풀과 되감기 재생목록 발행용 풀이 있고, janitor에도 별도 풀이 있다. 세 곳에 토큰·TLS·오류 처리를 각각 구현하면 한 곳만 옛 정책으로 남을 수 있다. 그래서 `media/internal/pgconf`에 접속 정책을 모았다.

`FromEnv`는 환경변수 조합을 검증한다. `PoolConfig`는 CA 파일과 풀 설정을 준비한다. IAM 모드라면 풀 설정의 `BeforeConnect`에 토큰 생성 함수를 연결한다. pgx는 새 연결을 만들기 전에 이 훅을 호출하고, 이미 열린 연결에는 영향을 주지 않는 설정 사본을 전달한다. [pgxpool의 Config 계약](https://pkg.go.dev/github.com/jackc/pgx/v5/pgxpool#Config)

아래는 실제 동작을 짧게 풀어 쓴 설명용 코드다. 운영 코드의 입력 검증·오류 가림·시간 제한 처리는 생략했다.

```go
poolConfig.BeforeConnect = func(ctx context.Context, conn *pgx.ConnConfig) error {
    token, err := createToken(ctx, endpoint, region, user)
    if err != nil {
        return err
    }
    conn.Password = token
    return nil
}
```

핵심은 `createToken`이 풀 생성 바깥에서 한 번 실행되는 것이 아니라, 훅 **안에서** 실행된다는 점이다. 실제 구현은 토큰 생성에 자체 10초 제한을 둔다. 연결 풀의 보충 작업이 사용자 요청과 다른 문맥에서 실행될 수 있으므로, 요청의 제한 시간이 알아서 전달된다고 가정하지 않았다. 이 10초는 자격 증명 조회를 포함한 토큰 생성 단계의 상한이며, TCP 연결·TLS·DB 인증 전체가 10초 안에 끝난다는 보장은 아니다. [pgconf 구현](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/media/internal/pgconf/pgconf.go)

### Java에서도 풀에 토큰 공급자를 직접 연결했다

미디어 쪽에만 구현이 있다고 Java 서버가 같은 정책을 따르는 것은 아니다. Java에서는 `services/db-support`가 그 역할을 맡는다. auth·clip·chat-collector·chat-detector가 이 모듈의 `DataSourceLoginConfiguration`을 명시적으로 가져온다.

이 설정은 `POSTGRES_AUTH=iam`일 때 Spring이 만든 `HikariDataSource`에 `RdsIamCredentialsProvider`를 연결한다. 공급자는 AWS SDK의 `RdsUtilities.generateAuthenticationToken`으로 만든 토큰을 `Credentials.of(user, token)`으로 돌려준다. 프로젝트가 사용하는 HikariCP 7.0.2는 새 연결을 만들 때 공급자를 호출한다. [프로젝트의 공급자 구현](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/services/db-support/src/main/java/com/pokeclip/db/RdsIamCredentialsProvider.java), [HikariCP 7.0.2의 연결 생성 코드](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-7.0.2/src/main/java/com/zaxxer/hikari/pool/PoolBase.java)

공급자 클래스를 만들어 두는 것만으로는 충분하지 않았다. **첫 DB 연결이 만들어지기 전에 실제 풀에 꽂아야** 한다. 이 프로젝트의 설정은 빈 후처리 단계에서 `setCredentialsProvider(...)`를 호출하고, 같은 자리에서 TLS 설정을 추가한다. auth의 `@Import`를 보면 공통 모듈이 실제 앱 기동 경로에 연결된 것도 확인할 수 있다. [설정 연결부](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/services/db-support/src/main/java/com/pokeclip/db/DataSourceLoginConfiguration.java), [auth의 적용부](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/services/auth/src/main/java/com/pokeclip/auth/AuthApplication.java)

| 비교 | Go 미디어 서비스 | Java 앱 서버 |
|---|---|---|
| 공통 모듈 | `media/internal/pgconf` | `services/db-support` |
| 연결 풀 | pgxpool | HikariCP |
| 새 연결의 토큰 공급 | `BeforeConnect` | `HikariCredentialsProvider` |
| AWS SDK 접점 | `auth.BuildAuthToken` | `RdsUtilities.generateAuthenticationToken` |
| IAM 모드의 TLS | `verify-full` 강제 | `verify-full` 강제 |

언어별 풀의 확장 지점은 다르지만 정책은 같다. 호출부가 각각 인증 규칙을 해석하지 않고, 공통 모듈이 새 연결의 자격과 TLS 조건을 결정한다.

## 짧게 사는 토큰도 엉뚱한 서버에 주면 안 된다

IAM 토큰은 장기 비밀번호를 없애지만, 유효한 동안 로그인에 쓸 수 있는 자격이라는 성질은 남는다. 따라서 암호화 여부만으로 끝내지 않고 **누구와 암호화된 연결을 맺었는지**도 확인해야 한다.

`verify-ca`는 서버 인증서가 신뢰한 CA로 이어지는지 검증한다. `verify-full`은 여기에 접속 호스트 이름과 인증서의 이름이 맞는지도 확인한다. 공용 RDS CA 번들을 신뢰한다는 사실과 내가 의도한 특정 DB에 접속했다는 사실은 같지 않다. 이 때문에 IAM 모드에는 `verify-full`만 허용했다. [PostgreSQL의 서버 인증서 검증](https://www.postgresql.org/docs/current/libpq-ssl.html), [Java 드라이버의 SSL 설정](https://jdbc.postgresql.org/documentation/ssl/)

CA 번들은 이미지 안의 정해진 경로에 넣고 `POSTGRES_SSLROOTCERT`로 지정한다. 빌드할 때마다 원격에서 받는 방식 대신 검토한 번들을 저장소에 포함했다. CA 변경을 코드 변경처럼 비교할 수 있고, 어느 이미지에 어떤 신뢰 기준이 들어갔는지 추적할 수 있기 때문이다. 대신 CA 갱신과 이미지 재배포는 운영 책임으로 남는다. Java 번들과 Go 번들의 내용이 같다는 조건도 테스트로 확인하게 했다. [CA 일치 검사](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/services/db-support/src/test/java/com/pokeclip/db/RdsCaBundleTest.java)

설정 한 줄을 강제해도 다른 입력이 덮어쓰면 규칙은 깨진다. 그래서 Java IAM 모드는 JDBC URL의 쿼리 파라미터를 거부하고, 외부에서 들어오는 드라이버 속성도 허용 목록으로 제한한다. `sslmode`를 약하게 바꾸거나 인증서 검증을 건너뛰는 별도 설정이 섞이지 않게 한 것이다. 기존 `socketTimeout`은 보존하고, 공통 모듈이 TLS 속성을 추가한다.

두 언어 모두 IAM 모드에 장기 비밀번호가 남아 있으면 시작 단계에서 거부한다. 사용하지 않는 값이라도 배포 정의에 계속 실린다면 비밀번호를 없앴다는 목적이 흐려지기 때문이다. 로컬 개발은 `POSTGRES_AUTH`가 비어 있거나 `password`이면 기존 비밀번호 방식으로 동작한다. 운영에 강제할 규칙과 로컬 개발의 접속 방법을 같은 변경으로 묶지 않았다.

## 로그인 성공과 테이블 접근권한은 별도로 제한한다

`app_clip`으로 로그인했다고 모든 표를 읽거나 지울 수 있어서는 안 된다. IAM은 이 AWS 역할의 DB 로그인을 허용하고, **로그인 뒤의 SQL 권한은 PostgreSQL이 판단**한다. `GRANT rds_iam`도 `SELECT`나 `DELETE` 권한을 대신하지 않는다.

현재 앱 서버 넷은 각자 사용자와 같은 이름의 스키마를 사용한다. 예를 들어 auth의 표는 `app_auth`, 채팅 수집기의 표는 `app_chat_collector`에 놓인다. 앱은 자기 스키마에서 Flyway 마이그레이션을 실행해 표를 소유하고, 남의 표를 읽을 때는 별도 권한과 스키마를 붙인 이름을 사용한다. 이것은 **앱 사이의 분리**이며, 자기 표에 대해서도 런타임 계정이 읽기·쓰기만 할 수 있도록 마이그레이션 계정까지 분리한 구조는 아니다. [역할·스키마 설정](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/infra/terraform/prod/runtime/sql/10_roles.sql)

| 사용자 | 업무상 필요한 교차 접근의 예 |
|---|---|
| `app_clip` | 미디어 조각 장부 조회·삭제, 방송 세션 조회 |
| `app_chat_collector` | 채팅 시각을 영상 위치에 대응시키기 위한 미디어 조각 조회 |
| `app_chat_detector` | 수집기가 소유한 채팅 메시지 조회 |
| `media_janitor` | 정리 대상 장부 조회, `stream_segments.local_path` 열 갱신 |

이 표는 전체 권한 목록이 아니라 경계를 보여주는 예다. 특히 janitor는 파일을 정리한다고 해서 DB 표 전체를 삭제할 권한을 받지 않는다. `local_path`를 갱신하는 열 단위 권한처럼 실제 업무에 맞춰 줄인다. 미디어 표의 교차 권한은 런타임 SQL이, 수집기 표에 대한 판별기의 권한은 수집기 마이그레이션이 부여한다. [미디어 표 권한 SQL](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/infra/terraform/prod/runtime/sql/30_grants.sql), [앱 계정별 권한 설명](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/services/README.md)

권한은 기능이 바뀌면 다시 검토해야 한다. 10월 22일 IAM 실험 당시 `media_indexer`에는 DELETE를 주지 않았다. 이후 만료 처리와 발행 장부 정리가 추가되면서 일부 표의 DELETE 권한을 부여했다. 따라서 당시의 “DELETE 없음”을 현재 전체 권한으로 설명하면 틀린다. 현재 권한은 위 SQL을 기준으로 보고, 당시 실험 결과는 당시 범위로 읽어야 한다.

## 실제로 붙었다는 것은 무엇으로 확인했나

코드가 있다는 것, 토큰이 만들어졌다는 것, 실제 DB 접속이 성공했다는 것은 서로 다른 증거다. 공통 접속 코드에는 `db_connected` 로그를 두어 인증 모드·사용자·호스트·TLS 사용 여부를 확인하게 했다. 토큰이나 DSN 전체를 로그에 남기는 대신, 운영자가 연결을 판별할 정보만 남긴다.

Java는 실제 연결의 `pg_stat_ssl`에서 자기 세션을 조회해 TLS 여부를 기록한다. 설정에 `sslmode=verify-full`이라고 적혀 있다는 이유만으로 `tls=true`를 출력하지 않는다. 다만 이 성공 로그 하나가 모든 업무 테이블의 권한이나 모든 재접속 경로를 검증해 주지는 않는다. 그것들은 별도의 확인 대상이다. [접속 확인 로그 구현](https://github.com/3K-PokeClip/pokeclip-mono/blob/bad85cc78fd19eaae2dba013d8dac524a0a17f0e/services/db-support/src/main/java/com/pokeclip/db/DbConnectedLogger.java)

## 실험 RDS에서 무엇을 확인했나

미디어 구현 때는 실험 RDS에서도 확인했다. 환경은 **2026년 10월 22일, 서울 리전, PostgreSQL 17.11, `db.t4g.micro` 한 대**였다. 서명 주체는 실험용 로컬 IAM 사용자였고, 운영 EC2 인스턴스 역할을 이용한 검증과는 구분했다.

| 실험 조건 | 관측 결과 |
|---|---|
| 사이드카 IAM 연결을 44분 유지 | 프로세스 재시작 0, DB 권한 오류 0 |
| DB 백엔드 강제 종료 2회 | 새 연결로 재로그인 |
| 실제 연결의 TLS 조회 | TLS 1.3 확인 |
| IP 주소 접속·다른 CA·다른 리전 | 각각 연결 또는 인증 실패 |
| IAM 모드에 `require` 지정 | DB 왕복 전에 설정 오류 |

실험과 별도로, Linux arm64·Go 1.27·PostgreSQL 17.10의 CI 등가 환경에서 거부 규칙을 시험했다. 규칙을 의도적으로 망가뜨린 40개 변형을 각 3회 실행해 120/120을 검출했고, 정상 동작을 확인하는 음성 대조는 90/90을 통과했다. 이 변이 시험 수치를 실험 RDS의 결과나 Java 모듈의 검증 결과로 합치지는 않는다.

토큰 만료 실험에는 예상 밖의 결과도 있었다. 이 인스턴스는 서명 시각이 19분 30초 전인 토큰을 받았고, 20분 30초 전인 토큰은 거부했다. 처음 잡은 16분 30초 대기만으로는 오래된 토큰을 재사용하는 결함을 드러내지 못했다. 대기를 21분 30초로 늘린 뒤 원본과 결함을 심은 변형을 구분했다.

이것은 **인스턴스 한 대에서 한 번 관측한 수용 경계**다. 공식 유효 시간이 20분이라는 뜻도, 앞으로 그때까지 재사용해도 된다는 뜻도 아니다. 구현은 이 관측에 맞춰 캐시 시간을 늘리지 않고, 새 연결마다 새 토큰을 만드는 방식을 유지했다. 미디어 구현과 당시 검증 범위는 [PR #314](https://github.com/3K-PokeClip/pokeclip-mono/pull/314)에 연결돼 있다.

## 공통 모듈이 끝낸 일과 남긴 일

IAM 전환으로 앱에 장기 DB 비밀번호를 배포하는 부담은 줄었다. 대신 실행 역할의 자격 증명 조회, IAM 정책, TLS 신뢰 기준, DB 권한이 함께 맞아야 한다. 특히 SDK 기본 공급자를 사용하므로 정적 키 환경변수나 공유 자격 증명 파일이 운영 역할보다 먼저 선택되지 않도록 배포 환경을 관리해야 한다.

장애 때도 실패한 단계를 나눠 보는 편이 정확하다. 토큰 생성 시간 초과라면 역할 자격 증명 조회부터, 인증 실패라면 실제 서명 주체와 사용자·리전·정책부터, 인증서 오류라면 호스트와 CA부터 확인한다. 로그인 후 `permission denied`가 발생했다면 SQL 권한을 확인한다. 원인과 무관하게 관리자 권한을 추가하면 다음 장애를 더 설명하기 어려워진다.

비밀번호 방식으로 되돌리는 일도 `POSTGRES_AUTH=password` 한 줄로 끝나지 않는다. `rds_iam`이 부여된 PostgreSQL 사용자는 IAM 인증이 우선하므로 사용자 설정과 자격 관리까지 함께 검토해야 한다. [AWS의 IAM 인증 제한 사항](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)

이번 재작성에서 확인한 것은 Go와 Java의 접속 코드, 앱별 연결부, Terraform 정책과 DB 권한 SQL이 출시 브랜치에 함께 있다는 사실이다. 현재 AWS의 모든 역할·태스크·DB 상태를 다시 조회하거나 운영 접속을 새로 실측한 것은 아니다.

공통 모듈로 묶은 대상은 단순한 연결 문자열이 아니었다. **언제 새 자격을 만들고, 어떤 설정을 거부하고, 상대 서버를 어떻게 확인하며, 무엇을 연결 성공의 증거로 볼지**가 공통화됐다. IAM 정책을 준 뒤 애플리케이션에 남는 일은 바로 이 접속 정책을 실제 연결 풀의 수명에 맞춰 구현하는 것이었다.
