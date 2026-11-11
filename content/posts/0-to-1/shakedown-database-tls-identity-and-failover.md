---
title: "TLS 연결 성공과 잘못된 호스트 거부를 짝으로 시험했습니다"
date: "2026-10-15T11:36:25+09:00"
lastmod: "2026-11-12T05:30:00+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "Shakedown의 MySQL 연결은 정상 호스트의 TLS 성공과 일부러 틀린 호스트의 거부를 짝으로 확인했습니다. EC2에 직접 둔 MongoDB 8.0 replica set은 CA 없는 연결과 평문 연결이 실패하는지 보고, primary 프로세스를 SIGKILL로 죽여 새 primary에서 쓰기가 12.24초 뒤 돌아오고 그 사이 HTTP 요청 2회가 실패한 것을 관측했습니다."
tags: ["개발 사례", "Shakedown"]
portfolio_cases: []
portfolio_pages: [51]
portfolio_edition: "2026-10-15-v2"
---

RDS MySQL에 TLS로 연결해 HTTP 200을 받았습니다. 이 성공은 인증서 체인을 검사했다는 뜻일 뿐, 인증서에 적힌 서버 이름까지 검사했다는 뜻은 아니었습니다. mysql2는 두 검사를 따로 켜고 끕니다. 그래서 정상 호스트로 연결하는 시험 옆에, 같은 서버에 접속하되 기대하는 호스트 이름만 틀리게 넣은 시험을 짝으로 두었고, 두 번째 시험은 호스트 불일치로 거부됐습니다. EC2에 직접 둔 MongoDB에서는 primary 프로세스를 강제 종료했습니다. 새 primary에서 쓰기가 돌아오기까지 장애 요청 시점부터 12.24초가 걸렸고, 그 사이 HTTP 요청 2회가 실패했습니다.

Shakedown은 SoftBank Hackathon 2026 예선 산출물입니다(작업 2026년 10월 8~10일). MongoDB를 관리형 DocumentDB 대신 EC2에 직접 구성하기로 한 것, TLS와 장애 전환을 요구한 것, 호스트 불일치 거부를 검증 조건으로 넣은 것은 제가 정했습니다. 조사·구현·프로브 작성과 실험 실행은 개발에 쓴 AI(Codex와 Claude Code)가 했습니다. 두 변경은 제 계정으로 올리고 병합한 PR이며, 리뷰는 없었습니다.

## mysql2는 인증서 체인과 호스트명을 따로 검사했습니다 {#mysql2는-인증서-체인과-호스트명을-별도로-확인했습니다}

TLS 클라이언트가 서버를 믿으려면 두 가지를 확인해야 합니다. 서버 인증서가 믿을 수 있는 CA에서 이어지는가(체인 검사), 그리고 인증서에 적힌 이름이 내가 접속하려던 서버인가(신원 검사)입니다. mysql2 3.24.5에서 앞의 것은 `rejectUnauthorized`, 뒤의 것은 `verifyIdentity` 옵션이 맡습니다. `verifyIdentity`가 꺼져 있으면 mysql2는 Node TLS에 넘기는 이름 검사 함수를 아무것도 하지 않는 함수로 바꿉니다([mysql2 `lib/base/connection.js` 429–454행](https://github.com/sidorares/node-mysql2/blob/v3.24.5/lib/base/connection.js#L429-L454)). 체인만 맞으면 다른 서버의 인증서로도 연결될 수 있다는 뜻입니다.

그래서 Shakedown이 만드는 MySQL 연결 URL에 두 옵션을 모두 명시했습니다([`packages/contracts/runtime.mjs` 37행](https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/packages/contracts/runtime.mjs#L37)). 실제 AWS 경로는 RDS MySQL 8.4.7(db.t3.micro), mysql2 3.24.5, RDS CA 번들이었습니다.

[[fig-mysql-tls-pair]]에서 두 시험이 갈리는 곳은 마지막 검사 하나입니다. 체인 검사는 두 시험 모두 통과합니다.

```mermaid {#fig-mysql-tls-pair kind="재구성" caption="MySQL TLS 양성·음성 시험. 두 시험 모두 같은 RDS 주소로 TCP 연결을 열고 RDS CA로 인증서 체인을 검사합니다. 기대 호스트만 다르게 넣어, verifyIdentity의 이름 대조에서 양성은 연결되고 음성은 호스트 불일치로 거부됩니다. 청록 상자가 음성 시험이 확인하려던 결과입니다. 2026년 10월 10일 실험 프로브(examples/http-mysql/app.mjs 19–21행)와 mysql2 3.24.5 소스의 재구성." source="https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/examples/http-mysql/app.mjs#L19-L21"}
flowchart TB
  accTitle: mysql2 TLS 양성 · 음성 시험
  accDescr: 양성 시험은 기대 호스트로 RDS 주소를, 음성 시험은 wrong-host.invalid를 넣지만 둘 다 같은 RDS 주소로 TCP 연결을 연다. rejectUnauthorized가 RDS CA로 인증서 체인을 검사하고 두 시험 모두 통과한다. verifyIdentity가 인증서의 이름과 기대 호스트를 대조해, 양성은 연결되어 HTTP 200을 받고 음성은 HANDSHAKE_SSL_ERROR와 호스트 불일치 메시지로 거부된다.
  pos[양성 시험<br/>기대 호스트<br/>RDS 주소]
  neg[음성 시험<br/>기대 호스트<br/>wrong-host<br/>.invalid]
  tcp[같은 RDS 주소로 TCP 연결]
  chain[체인 검사<br/>reject<br/>Unauthorized<br/>RDS CA 기준]
  ident[이름 검사<br/>verifyIdentity<br/>인증서 이름 =<br/>기대 호스트?]
  ok[연결 · HTTP 200<br/>Unicode 쓰기]
  rej[거부<br/>HANDSHAKE_<br/>SSL_ERROR<br/>호스트 불일치 메시지]
  pos --> tcp
  neg --> tcp
  tcp --> chain
  chain -->|둘 다 통과| ident
  ident -->|양성: 일치| ok
  ident -->|음성: 불일치| rej
  style rej fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

음성 시험이 거부되는 이유는 이름 대조뿐입니다. 네트워크 주소와 CA는 양성 시험과 같기 때문입니다. mysql2 소스대로라면 `verifyIdentity`를 뺀 설정에서는 이 시험이 연결에 성공해 시험 실패로 드러납니다(이 조합은 따로 실행하지 않았습니다).

| 시험 | 관측 | 판정 |
|---|---|---|
| 정상 CA · 정상 호스트 | HTTP 200, TLS_AES_256_GCM_SHA384, Unicode 쓰기 | 이 조합의 정상 연결 확인 |
| 정상 주소 · 틀린 기대 호스트 | `HANDSHAKE_SSL_ERROR`, 호스트 불일치 메시지 | 신원 검사의 음성 경로 확인 |
| 첫 프로브의 오류 코드 기대 | 거부를 받고도 「거부 아님」으로 판정 | 프로브 판정 기준을 고침 |

첫 음성 프로브는 연결이 거부됐는데도 시험을 통과시키지 못했습니다. Node TLS의 원래 오류 코드(`ERR_TLS_CERT_ALTNAME_INVALID`)를 기대했는데, mysql2가 TLS 협상 오류의 코드를 `HANDSHAKE_SSL_ERROR`로 바꿔 붙이기 때문입니다([mysql2 `lib/commands/client_handshake.js` 319–325행](https://github.com/sidorares/node-mysql2/blob/v3.24.5/lib/commands/client_handshake.js#L319-L325)). 잘못된 호스트로 연결에 성공한 것이 아니라 프로브의 판정이 틀린 것이었습니다.

이때 연결 설정을 풀어 시험을 통과시키지 않고 프로브를 고쳤습니다. 다만 `HANDSHAKE_SSL_ERROR`라면 무엇이든 통과로 치지도 않았습니다. 같은 코드가 다른 TLS 실패에도 붙기 때문입니다. 고친 프로브는 Node의 원래 코드(`ERR_TLS_CERT_ALTNAME_INVALID`)이거나, `HANDSHAKE_SSL_ERROR`이면서 오류 메시지에 「Hostname/IP does not match certificate's altnames」가 있을 때만 거부로 판정합니다([`examples/http-mysql/app.mjs` 21행](https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/examples/http-mysql/app.mjs#L21)). 이 시험이 증명해야 하는 것은 네트워크 오류가 아니라 일부러 틀린 신원을 거부했다는 사실이었습니다. 다시 빌드한 불변 이미지로 시험이 통과했고, 변경은 [PR #29](https://github.com/SoftBankHackathon/shakedown/pull/29)(2026년 10월 10일 13:51 병합)에 있습니다.

## MongoDB는 CA 없는 연결과 평문 연결도 거부했습니다 {#mongodb에서는-암호화와-가용성을-따로-구성했습니다}

MongoDB는 서울 리전 3개 AZ에 EC2(t3.small)를 한 대씩, 모두 세 대 두고 MongoDB 8.0 replica set으로 묶었습니다. replica set은 여러 멤버가 같은 데이터를 복제하고, 그중 하나를 쓰기를 받는 primary로 선출하는 구성입니다. 멤버마다 암호화된 데이터 EBS를 붙이고, TLS를 필수로 두고, 멤버끼리는 keyfile로 인증했습니다. 서버 인증서는 사설 CA로 발급했습니다([설정 문서](https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/managed-databases.md)).

앱에는 공개 CA와 앱 DB 전용 계정만 넘겼습니다. ECS init 컨테이너가 CA를 태스크 볼륨에 쓰면 앱은 그 볼륨을 읽기 전용으로 붙입니다. 서버 private key, 멤버 keyfile, 관리자 계정은 앱에 가지 않습니다. 대신 관리형 서비스라면 맡길 인증서 갱신·백업·멤버 교체를 직접 운영해야 합니다.

연결 시험은 성공 하나와 실패 둘을 짝으로 두었습니다([MongoDB TLS·장애 전환 보고서 16–20행](https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/experiments/2026-10-10-mongodb-tls-failover.md#L16-L20)).

| 시험 | 관측 |
|---|---|
| 사설 CA를 주고 다른 멤버에서 TLS 연결 | 연결 · ping 성공(종료 코드 0) |
| 사설 CA 없이 TLS 연결 | 거부: 「self-signed certificate in certificate chain」 |
| 평문(TLS 없이) 연결 | 12초 안에 한 번도 연결되지 않고 클라이언트 timeout |

CA를 빼자 클라이언트가 체인을 믿지 못해 연결을 끊었습니다. 평문 연결은 서버가 거부 메시지를 돌려준 것이 아니라 12초 동안 성공하지 못하고 시간이 다 된 것입니다. 그래서 확인한 범위는 「평문으로는 연결되지 않았다」까지입니다. ECS 앱 태스크 두 개는 검증된 TLS로 붙어 HTTP 200을 받고, 과반 쓰기(majority write) 뒤 같은 문서를 다시 읽었습니다.

MongoDB에서도 호스트 이름이 틀린 음성 시험을 했지만 결론을 내지 못했습니다. 12초 안에 연결되지 않은 것은 같았지만, 그 원인이 이름 불일치인지 가려내지 못했습니다. 그래서 MySQL에서 확인한 호스트 불일치 거부를 MongoDB에도 확인했다고 쓰지 않습니다. 인증서 검사를 끄는 `tlsAllowInvalidCertificates`, `tlsAllowInvalidHostnames`, `tlsInsecure` 옵션은 어느 시험에서도 쓰지 않았습니다. 이 구성은 [PR #12](https://github.com/SoftBankHackathon/shakedown/pull/12)(2026년 10월 10일 13:12 병합)에 있습니다.

## primary를 강제 종료하자 쓰기가 12.24초 동안 실패했습니다 {#단일-장애가-쓰기에-미치는-영향을-관측했습니다}

replica set이 준비됐다는 것과 primary가 사라진 뒤 앱이 다시 쓸 수 있다는 것은 다른 주장입니다. 그래서 primary에 장애를 두 번 따로 넣고, 앱의 쓰기 요청이 새 primary에서 성공하는 시점을 쟀습니다. 앱의 쓰기 경로를 부르고 응답이나 실패 뒤 1초 쉬었다 다시 부르는 방식으로 쟀고(요청 제한 시간 7초), 시계는 장애 명령을 보내기 직전에 시작했습니다([`experiment-mongo-failover.py` 29–41행](https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/infra/aws/scripts/experiment-mongo-failover.py#L29-L41)).

두 번째 장애는 primary의 MongoDB 컨테이너에 SIGKILL을 보낸 것입니다. 죽인 프로세스를 Docker가 곧바로 다시 띄우지 않게, 그 컨테이너의 재시작 정책을 잠시 끈 뒤 보냈습니다(같은 스크립트 31행). 영상에서 시간축의 빨간 표식 두 개가 실패한 요청이고, 청록 표식이 새 primary에서 처음 성공한 쓰기입니다.

{{< motion scene="PrimaryKillFailover" id="fig-primary-kill-failover" kind="개념도" caption="primary 멤버의 MongoDB 컨테이너를 재시작을 끈 채 SIGKILL로 종료한 시험. 장애 요청 시점부터 1.89초와 7.15초의 HTTP 요청이 실패했고, 12.24초에 새 primary에서 쓰기가 성공했습니다. 시간은 제어 API · SSM 지연을 포함한 값이며 선출 시각은 따로 재지 않았습니다. 2026년 10월 10일 실험 기록을 옮긴 설명용 그림입니다." >}}

| 주입한 장애 | 새 primary 쓰기 확인 | 함께 남긴 관측 |
|---|---:|---|
| primary EC2 중지 | 2.13초 | 표본 2개(1.01초 · 2.06초)에서 실패 0 |
| primary 컨테이너 SIGKILL(재시작 끔) | 12.24초 | HTTP 실패 2회(1.89초 · 7.15초) |

장애 전에 쓰고 응답받은 문서 가운데 골라 확인한 2개는 모두 남아 있었습니다. 멈춘 멤버를 다시 붙이자 세 멤버가 모두 정상으로 돌아왔습니다. 숫자는 각 장애를 한 번씩 넣은 결과입니다.

서비스 설명에 더 중요한 것은 SIGKILL 시험의 실패 2회였습니다. 새 primary가 정해지는 동안 앱의 쓰기가 실패할 수 있다는 관측이므로, 이 구성을 무중단이라고 쓸 수 없습니다. 반대로 EC2 중지에서 실패가 없었던 것은 표본이 2개뿐이라 「실패가 없다」는 근거로 삼지 않았습니다. 시간에는 제어 API와 SSM(Systems Manager) 명령 지연이 들어 있어 정밀한 선출 시간이나 다운타임 SLA도 아닙니다.

두 숫자가 왜 다섯 배 넘게 다른지는 따로 재지 않았습니다. MongoDB 문서와 맞는 해석은 있습니다. 종료 요청을 받은 primary는 내려가기 전에 스스로 secondary로 물러나려 하므로, 다른 멤버가 곧바로 선출될 수 있습니다([MongoDB `shutdown` 문서](https://www.mongodb.com/docs/manual/reference/command/shutdown/)). SIGKILL로 죽은 primary에는 물러날 기회가 없고, 다른 멤버는 heartbeat가 기본 10초 동안 돌아오지 않아야 primary를 잃었다고 판단합니다([MongoDB 선출 문서](https://www.mongodb.com/docs/manual/core/replica-set-elections/), [`electionTimeoutMillis`](https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.settings.electionTimeoutMillis)). 다만 EC2 중지가 운영체제 종료를 거쳐 MongoDB를 정상 종료시켰는지는 이 실험 기록으로 확인하지 못했습니다.

연결 시험을 설계한다면 성공하는 설정마다 반드시 실패해야 하는 짝을 하나씩 두십시오. HTTP 200 하나로 끝냈다면 mysql2의 꺼진 이름 검사와 장애 중의 요청 실패는 둘 다 보이지 않았습니다.

## 측정 조건

- MySQL: 2026년 10월 10일, 서울 리전 전용 실험 스택. RDS MySQL 8.4.7(db.t3.micro, 암호화 private 저장소)과 작은 ECS 태스크를 실제 AWS 어댑터로 만들었습니다. mysql2 3.24.5, RDS CA 번들. 실험 ALB는 실험 클라이언트 주소로만 열었습니다. 브랜치를 `2d4829e`로 앞당긴 뒤 다시 돌린 AWS 어댑터 시험 45개와 로컬 어댑터 시험 12개가 통과했습니다. 기준 코드는 PR #29 head `2788411`입니다.
- MongoDB: 2026년 10월 10일, 서울 리전 3개 AZ. EC2 t3.small 3대(Amazon Linux 2023, Docker `mongo:8.0`), 멤버마다 암호화 20GiB EBS, ECS 앱 태스크 2개, 공식 MongoDB Node 드라이버. 장애는 종류마다 한 번 넣었고, 시간은 장애 요청 시점부터 새 primary를 가리키는 첫 쓰기 응답까지입니다. 같은 시점 엔진 시험 278개, 로컬 어댑터 12개, AWS 어댑터 44개가 통과했습니다. 기준 코드는 PR #12 head `fa50609`입니다.
- 검증하지 않은 범위: MongoDB의 호스트 이름 불일치 거부, 두 멤버 동시 장애, 긴 네트워크 분리, 큰 데이터, 실패한 EC2의 자동 교체, 인증서 자동 갱신, mysql2 외 드라이버(JDBC 포함). 실험 자원은 모두 지웠습니다.

## 출처

- [SoftBankHackathon/shakedown PR #29](https://github.com/SoftBankHackathon/shakedown/pull/29) — MySQL TLS 호스트 검증과 AWS DB 복원 실측(2026-10-10 병합)
- [SoftBankHackathon/shakedown PR #12](https://github.com/SoftBankHackathon/shakedown/pull/12) — PostgreSQL · MySQL · TLS MongoDB 실행 지원(2026-10-10 병합)
- [DB 실측 보고서 「Database live validation — 2026-10-10」](https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/docs/experiments/2026-10-10-database-live-validation.md) — MySQL TLS 양성 · 음성 시험과 프로브 판정 결함
- [MongoDB 실측 보고서 「MongoDB TLS and automatic failover — 2026-10-10」](https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/experiments/2026-10-10-mongodb-tls-failover.md) — TLS 시험 · 장애 전환 결과
- [MongoDB 실측 원자료(JSON)](https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/experiments/evidence/2026-10-10-mongodb-tls-failover.json) — 요청별 시각과 성공 · 실패
- [`infra/aws/scripts/experiment-mongo-failover.py`](https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/infra/aws/scripts/experiment-mongo-failover.py#L29-L41) — 장애 주입과 측정 방식
- [`examples/http-mysql/app.mjs`](https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/examples/http-mysql/app.mjs#L19-L21) — 음성 시험 프로브
- [`packages/contracts/runtime.mjs`](https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/packages/contracts/runtime.mjs#L37) — MySQL URL의 TLS 옵션
- [`docs/managed-databases.md`](https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/managed-databases.md) — MongoDB EC2 replica set 구성과 TLS 범위
- [mysql2 v3.24.5 `lib/base/connection.js`](https://github.com/sidorares/node-mysql2/blob/v3.24.5/lib/base/connection.js#L429-L454) — `rejectUnauthorized` · `verifyIdentity` 처리
- [mysql2 v3.24.5 `lib/commands/client_handshake.js`](https://github.com/sidorares/node-mysql2/blob/v3.24.5/lib/commands/client_handshake.js#L319-L325) — `HANDSHAKE_SSL_ERROR`로 바꾸는 곳
- [MongoDB 문서 「Replica Set Elections」](https://www.mongodb.com/docs/manual/core/replica-set-elections/) — heartbeat와 선출 조건
- [MongoDB 문서 「Replica Set Configuration」](https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.settings.electionTimeoutMillis) — `electionTimeoutMillis` 기본 10초
- [MongoDB 문서 「shutdown」](https://www.mongodb.com/docs/manual/reference/command/shutdown/) — 종료 요청을 받은 primary의 step down

---

[개발 사례 전체 모음](/posts/0-to-1/portfolio-engineering-notes/) · [같은 판의 포트폴리오 PDF](/portfolio/2026-10-15-v2/full.pdf#page=51)
