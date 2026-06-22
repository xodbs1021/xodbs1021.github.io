### J. 시스템 디자인 (7 시리즈)

**갯수 근거**: 면접 표준 영역. 기초+패턴별 5개+면접 메타 1개=7. 패턴별 사례는 5개가 자연.

#### J-1: 기초 + 면접 방법론
- hook: 면접 단골 영역
- 핵심 항목: 요구사항 수집 (기능/비기능) / Capacity Estimation (DAU/QPS/저장량) / 컴포넌트 식별 / 데이터 모델 / API 설계 / 스케일링 / 트레이드오프 토론 / BLUF 패턴
- 다루지 않는 것: 구체 시스템
- PokéClip 적용: 자기 프로젝트 답변 방법론
- 면접 답변 주제: "시스템 디자인 방법론"

#### J-2: URL Shortener
- hook: 입문 패턴
- 핵심 항목: 요구사항 / Capacity / Hash vs Counter / 충돌 / Base62 / DB 스키마 / Read-heavy / 캐싱 / Rate limiting / 분석 / Custom alias
- 다루지 않는 것: 다른 시스템
- PokéClip 적용: 시스템 디자인 답변 패턴
- 면접 답변 주제: "URL Shortener 설계"

#### J-3: 채팅 서비스
- hook: 치지직 채팅의 직관
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

#### J-5: 추천 시스템
- hook: 시스템 + AI 결합
- 핵심 항목: 종류 (Content-based/Collaborative/Hybrid) / Cold Start / Implicit vs Explicit / 오프라인 학습 + 온라인 추론 / Feature Store / A/B 테스트 / 다양성 vs 정확도 / Two-tower 모델
- 다루지 않는 것: 강화학습
- PokéClip 적용: 향후 클립 추천 (선택)
- 면접 답변 주제: "추천 시스템 설계"

#### J-6: 클립 추출 / 비디오 분석 파이프라인
- hook: PokéClip류 일반화
- 핵심 항목: 비디오 분석 시스템 요구사항 / 스트리밍 입력 / GPU 분석 클러스터 / 결과 저장 / 클립 추출 / 메타데이터 검색 / 다중 모달 / 비용 모델 / 확장 시나리오
- 다루지 않는 것: 다른 시스템
- PokéClip 적용: 면접 답변 흐름
- 면접 답변 주제: "PokéClip 자체 설명"

#### J-7: 면접 답변 패턴
- hook: 알아도 답변 못 하면 의미 없음
- 핵심 항목: Capacity Estimation 공식 / 트레이드오프 설명 / 화이트보드 활용 / Clarifying questions / "왜 선택" / 후속 대응 / 시간 분배 / Mock interview
- 다루지 않는 것: 구체 시스템
- PokéClip 적용: 면접 답변 메타
- 면접 답변 주제: "시스템 디자인 면접 메타"

---

