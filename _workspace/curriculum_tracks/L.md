### L. 보안/인증 (6 시리즈)

**갯수 근거**: 보안 정책은 *사람 결정* 영역. TLS + JWT + OAuth + 토큰관리/비밀 + 키패턴 + API보안 = 6개. 유지.

#### L-1: HTTPS + TLS 기초
- hook: 웹 통신 기본 보안
- 핵심 항목: 대칭 vs 비대칭 / TLS Handshake / 인증서 (Certificate) / CA / Let's Encrypt / 인증서 체인 / SAN / TLS 1.2 vs 1.3 / Perfect Forward Secrecy / HSTS / Mixed content
- 다루지 않는 것: TLS 프로토콜 깊이 (O-7)
- PokéClip 적용: 모든 API HTTPS
- 면접 답변 주제: "TLS Handshake"

#### L-2: 세션 vs JWT
- hook: 인증 방식 선택
- 핵심 항목: 세션 기반 / Server-side session / Cookie / Session store / JWT (Header/Payload/Signature) / 서명 알고리즘 (HS256/RS256) / Stateless 인증 / 무효화 어려움 / 보안 함정 (alg none)
- 다루지 않는 것: OAuth (L-3)
- PokéClip 적용: 인증 시스템
- 면접 답변 주제: "세션 vs JWT"

#### L-3: OAuth 2.0 + OIDC
- hook: 소셜 로그인 표준
- 핵심 항목: OAuth 2.0 흐름 (Authorization Code/Implicit/Client Credentials/Refresh/Device) / Authorization Server vs Resource Server / Access vs ID Token / Scope / PKCE / OIDC / 한국 소셜 (네이버/카카오)
- 다루지 않는 것: SAML
- PokéClip 적용: 소셜 로그인 (선택)
- 면접 답변 주제: "OAuth 흐름"

#### L-4: 토큰 관리 + 비밀 관리
- hook: Refresh / Rotation / 비밀 저장
- 핵심 항목: Access Token 수명 / Refresh Token / Rotation 패턴 / Reuse detection / 저장 위치 (Cookie httpOnly/Memory) / 무효화 / AWS Secrets Manager / Parameter Store / Vault / 비밀 회전 / Hardcoded secret 스캐닝 (gitleaks)
- 다루지 않는 것: SSO 깊이
- PokéClip 적용: 인증 + 키 관리
- 면접 답변 주제: "Refresh Token / 비밀 관리"

#### L-5: 스트림 키 / API 키 발급·검증 패턴
- hook: 사용자별 키 발급
- 핵심 항목: API Key 발급 흐름 / Key vs Token / Key 저장 (해시 vs 평문) / Rate limiting per key / 만료/회수 / Rotation / Audit log / Webhook 서명 검증 / Stream key 일회성
- 다루지 않는 것: OAuth (L-3)
- PokéClip 적용: 스트림 키 시스템
- 면접 답변 주제: "API Key 관리"

#### L-6: API 보안 (Rate Limit / OWASP)
- hook: API는 공격 표면 1순위
- 핵심 항목: Rate Limiting (Token bucket / Leaky bucket) / CORS / CSRF / SQL Injection / XSS / 입력 검증 / 에러 메시지 누출 / 보안 헤더 (CSP/HSTS) / OWASP Top 10
- 다루지 않는 것: 모바일 보안
- PokéClip 적용: API 보안
- 면접 답변 주제: "OWASP Top 10"
