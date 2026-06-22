### O. 네트워크 깊이 (9 시리즈)

**갯수 근거**: 백엔드 면접 핵심. OSI+TCP+UDP+HTTP진화+WebSocket프로토콜+DNS/CDN+LB+TLS프로토콜+보안 = 9 자연.

#### O-1: OSI 다시 보기
- hook: 학교 들었지만 실전 적용
- 핵심 항목: 7계층 vs TCP/IP 4계층 / 각 계층 역할 / 캡슐화 / 프레임/패킷/세그먼트/데이터그램 / 실전 디버깅에서 어느 계층 보나
- 다루지 않는 것: 각 프로토콜 (O-2부터)
- PokéClip 적용: 네트워크 진단 기반
- 면접 답변 주제: "OSI"

#### O-2: TCP 깊이
- hook: 면접 가장 많이 물어봄
- 핵심 항목: TCP 특징 / 3-way / 4-way handshake / 상태 다이어그램 / 헤더 (Sequence/ACK/Window) / 흐름 제어 / 혼잡 제어 (Slow start/Congestion avoidance/Fast retransmit/Fast recovery) / TIME_WAIT / Nagle / Keepalive / SYN flood
- 다루지 않는 것: HTTP (O-4)
- PokéClip 적용: 진단
- 면접 답변 주제: "TCP handshake / TIME_WAIT"

#### O-3: UDP + QUIC
- hook: UDP + 신뢰성 = QUIC
- 핵심 항목: UDP 특징 / TCP vs UDP / UDP 사용 사례 / QUIC 개요 / QUIC vs TCP+TLS / 0-RTT / 멀티플렉싱 / HOL blocking 해결 / HTTP/3 = QUIC
- 다루지 않는 것: SRT (영상 트랙)
- PokéClip 적용: 영상 SRT 직관 보강
- 면접 답변 주제: "QUIC 배경"

#### O-4: HTTP 진화 (1.1 → 2 → 3)
- hook: 매 버전 성능 도약
- 핵심 항목: HTTP/1.1 한계 (HOL/헤더 중복) / HTTP/2 (멀티플렉싱/HPACK/Server Push) / HTTP/3 (QUIC/0-RTT) / 마이그레이션 / 디버깅 (curl --http2)
- 다루지 않는 것: gRPC
- PokéClip 적용: API 프로토콜 선택
- 면접 답변 주제: "HTTP/2 vs HTTP/3"

#### O-5: WebSocket 프로토콜 (RFC 6455 레벨)
- hook: E-3 활용 위에 RFC 레벨 깊이
- 핵심 항목: HTTP Upgrade 흐름 / Sec-WebSocket-Key / Sec-WebSocket-Accept / 프레임 구조 (FIN/Opcode/Mask/Payload) / Ping/Pong / Close 프레임 / 확장 (permessage-deflate) / 서브프로토콜 / 보안 (wss://)
- 다루지 않는 것: WebSocket 활용 (E-3)
- PokéClip 적용: 채팅 WebSocket 프로토콜 디버깅
- 면접 답변 주제: "WebSocket Handshake"

#### O-6: DNS + CDN
- hook: 백엔드 관점 깊이
- 핵심 항목: DNS 계층 / 레코드 (A/AAAA/CNAME/MX/TXT/NS/SOA) / Recursive vs Iterative / TTL / DNS 캐싱 / DNS-over-HTTPS / CDN 동작 (Edge/Origin) / Anycast / GeoDNS
- 다루지 않는 것: CDN 영상 깊이 (4-X 완료)
- PokéClip 적용: 도메인 운영
- 면접 답변 주제: "DNS / CDN"

#### O-7: 로드 밸런서 + 프록시
- hook: 대규모 시스템 정문
- 핵심 항목: L4 vs L7 / Round Robin / Weighted / Least connections / Sticky session / Reverse proxy / Forward proxy / Nginx / HAProxy / Health check / SSL termination / WebSocket 통과
- 다루지 않는 것: AWS ELB (G-13)
- PokéClip 적용: 인프라 입구
- 면접 답변 주제: "L4 vs L7"

#### O-8: TLS 프로토콜 깊이
- hook: L-1 위에 RFC 레벨
- 핵심 항목: TLS 1.2 vs 1.3 handshake 차이 / 0-RTT 보안 / Cipher Suite / Forward Secrecy / Session resumption / OCSP Stapling / Certificate Transparency / SNI / mTLS
- 다루지 않는 것: 암호 알고리즘 깊이
- PokéClip 적용: 보안 깊이
- 면접 답변 주제: "TLS 1.3 / mTLS"

#### O-9: 네트워크 보안
- hook: 운영 단계 필수
- 핵심 항목: 방화벽 / IDS / IPS / WAF / DDoS 종류 / 완화 (Rate limit/GeoIP/Captcha) / SSL Strip / MitM / 인증서 핀닝 / VPN 종류
- 다루지 않는 것: 보안 (L)
- PokéClip 적용: 네트워크 보안
- 면접 답변 주제: "DDoS 대응"

---

