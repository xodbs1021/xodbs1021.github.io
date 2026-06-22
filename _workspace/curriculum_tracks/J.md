### J. 시스템 디자인 (12 시리즈) — **강화**

**갯수 근거**: AI 시대 — 아키텍처 / 트레이드오프 / 시스템 디자인이 **사람의 핵심 영역**. 7에서 12로 강화. 기본 7개 + **신규 5개** (트레이드오프 카드, 비용/성능, AI 시스템, 결제, 라이브 코딩 면접).

#### J-1: 기초 + 면접 방법론
- hook: 면접 단골 영역. 사람 핵심 역량
- 핵심 항목: 요구사항 수집 (기능/비기능) / Capacity Estimation (DAU/QPS/저장량) / 컴포넌트 식별 / 데이터 모델 / API 설계 / 스케일링 / 트레이드오프 토론 / BLUF 패턴
- 다루지 않는 것: 구체 시스템 (J-2부터)
- PokéClip 적용: 자기 프로젝트 답변 방법론
- 면접 답변 주제: "시스템 디자인 방법론"

#### J-2: URL Shortener 설계
- hook: 입문 패턴
- 핵심 항목: 요구사항 / Capacity / Hash vs Counter / 충돌 / Base62 / DB 스키마 / Read-heavy / 캐싱 / Rate limiting / 분석 / Custom alias
- 다루지 않는 것: 다른 시스템
- PokéClip 적용: 시스템 디자인 답변 패턴
- 면접 답변 주제: "URL Shortener 설계 면접"

#### J-3: 채팅 서비스 설계
- hook: 치지직 채팅 직관
- 핵심 항목: 요구사항 / WebSocket / 메시지 영속화 / Message Queue / Online presence / Read receipt / Message ordering / 분산 채팅 (Sticky session/Pub-sub) / 모바일 푸시
- 다루지 않는 것: WebRTC
- PokéClip 적용: 치지직 채팅 직관
- 면접 답변 주제: "채팅 서비스 설계"

#### J-4: 라이브 스트리밍 플랫폼 (Twitch 클론)
- hook: 치지직 면접 직격
- 핵심 항목: 송출 (RTMP/SRT/WebRTC) / 인제스트 / 트랜스코딩 / CDN / 채팅 / VOD / 추천 / 광고 / 결제 / Capacity / 분산 / 비용 모델
- 다루지 않는 것: 추천 깊이 (J-5)
- PokéClip 적용: PokéClip 위 플랫폼 직관
- 면접 답변 주제: "라이브 스트리밍 설계"

#### J-5: 추천 시스템 설계
- hook: 시스템 + AI 결합
- 핵심 항목: 종류 (Content-based/Collaborative/Hybrid) / Cold Start / Implicit vs Explicit / 오프라인 학습 + 온라인 추론 / Feature Store / A/B 테스트 / 다양성 vs 정확도 / Two-tower 모델
- 다루지 않는 것: 강화학습
- PokéClip 적용: 향후 클립 추천 (선택)
- 면접 답변 주제: "추천 시스템 설계"

#### J-6: 클립 추출 / 비디오 분석 파이프라인
- hook: PokéClip류 일반화
- 핵심 항목: 비디오 분석 시스템 요구사항 / 스트리밍 입력 / GPU 분석 클러스터 / 결과 저장 / 클립 추출 / 메타데이터 검색 / 다중 모달 / 비용 모델 / 확장 시나리오
- 다루지 않는 것: 다른 시스템
- PokéClip 적용: 면접에서 PokéClip 답변 흐름
- 면접 답변 주제: "PokéClip 자체 설명"

#### J-7: 면접 답변 패턴
- hook: 알아도 답변 못 하면 의미 없음
- 핵심 항목: Capacity Estimation 공식 / 트레이드오프 설명 / 화이트보드 활용 / Clarifying questions / "왜 선택" / 후속 대응 / 시간 분배 / Mock interview
- 다루지 않는 것: 구체 시스템
- PokéClip 적용: 면접 답변 메타
- 면접 답변 주제: "시스템 디자인 면접 메타"

#### J-8: 아키텍처 트레이드오프 카드 (신규)
- hook: AI 시대 핵심 역량 — DB/큐/언어/클라우드 선택의 *결정 패턴*
- 핵심 항목: SQL vs NoSQL 결정 카드 / Redis vs Kafka 결정 / 모놀리스 vs MSA / Python vs Go vs Java / AWS vs GCP vs Azure 선택 / Self-host vs SaaS / 동기 vs 비동기 / 강일관성 vs 최종일관성
- 다루지 않는 것: 각 기술 깊이 (해당 트랙)
- PokéClip 적용: PokéClip의 모든 기술 결정 근거
- 면접 답변 주제: "왜 X를 선택했나 / 만약 Y였다면"

#### J-9: 비용 / 성능 트레이드오프 패턴 (신규)
- hook: 시니어 면접에서 "비용 의식" 빈출
- 핵심 항목: 비용 추정 (compute/storage/network) / 성능 vs 비용 곡선 / Spot 활용 / Reserved 할인 / S3 lifecycle / Lambda vs EC2 / 캐싱 ROI / CDN 비용 / 데이터 전송 비용 함정 (Cross-AZ / Egress) / AI API 비용 (토큰)
- 다루지 않는 것: AWS FinOps 세부 (G-13)
- PokéClip 적용: 운영 비용 결정
- 면접 답변 주제: "비용 최적화 경험 / 트레이드오프"

#### J-10: AI 시스템 디자인 (신규)
- hook: AI 시스템은 일반 백엔드와 다름 — 모델/추론/평가/비용/MLOps 종합
- 핵심 항목: AI 시스템 컴포넌트 (모델/추론서버/Feature Store/벡터DB) / RAG 시스템 설계 / 실시간 추론 vs 배치 / 모델 서빙 아키텍처 / 멀티 모델 라우팅 / 비용 vs 정확도 / 데이터 파이프라인 (학습/추론) / 모델 모니터링 / 드리프트 대응
- 다루지 않는 것: 모델 학습 내부 (D)
- PokéClip 적용: PokéClip의 AI 시스템 설계 답변
- 면접 답변 주제: "AI 시스템 설계 (RAG / 실시간 추론 / 모델 라우팅)"

#### J-11: 결제 / 이커머스 시스템 (신규)
- hook: 트랜잭션 깊이 + 분산 일관성의 결정판
- 핵심 항목: 결제 흐름 (인증/캡처/환불) / 멱등성 키 / 트랜잭션 일관성 / Saga 패턴 적용 / 재고 관리 / 동시성 (Race condition) / PG 연동 / Webhook 처리 / 회계 정합성
- 다루지 않는 것: 분산 시스템 일반 (K)
- PokéClip 적용: 향후 PokéClip 구독 결제 (선택)
- 면접 답변 주제: "결제 시스템 / 멱등성"

#### J-12: 라이브 코딩 면접 시나리오 (신규)
- hook: 시스템 디자인 + 코드 결합 면접 패턴
- 핵심 항목: API 설계 → 코드 한 줄까지 / 데이터 모델 → ORM 클래스 / 트레이드오프 설명 + 코드 / 시간 제약 시 우선순위 / 라이브 코딩 페어 프로그래밍 패턴
- 다루지 않는 것: 알고리즘 풀이 (코테 별도)
- PokéClip 적용: 면접 실전 시뮬레이션
- 면접 답변 주제: "라이브 코딩 시 시간 분배 / 트레이드오프 말로 설명"
