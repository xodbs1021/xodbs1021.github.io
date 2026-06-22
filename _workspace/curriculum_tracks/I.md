### I. 점수/신호 알고리즘 (8 시리즈)

**갯수 근거**: PokéClip 특수 영역 + 자체 함수 설계는 *사람 몫*. 8개가 신호처리 입문→Peak Detection→융합→자체 함수→클립 추출까지 자연. 유지.

#### I-1: 신호 처리 기초
- hook: 음성/영상/채팅 모두 시계열
- 핵심 항목: 신호란 / 이산 vs 연속 / 샘플링 / Nyquist / 양자화 / 시간 영역 vs 주파수 영역 / FFT 직관 (수학 깊이 X) / 노이즈 / SNR / 시계열 특성
- 다루지 않는 것: 수학 증명 / FFT 알고리즘
- PokéClip 적용: 신호 처리 기반
- 면접 답변 주제: "샘플링 정리"

#### I-2: 슬라이딩 윈도우 + 통계
- hook: PokéClip 5초 단위 점수 출발
- 핵심 항목: Fixed vs Sliding / 윈도우 크기 결정 / 윈도우 통계 (mean/std/min/max/percentile) / 누적 통계 (running mean / Welford) / 효율적 구현 (deque) / Online vs Batch
- 다루지 않는 것: 시계열 모델
- PokéClip 적용: 5초 윈도우 점수
- 면접 답변 주제: "Sliding Window 패턴"

#### I-3: 스무딩 + 이동 평균
- hook: 노이즈 줄이고 추세 추출
- 핵심 항목: SMA / WMA / EMA / Savitzky-Golay / Median filter / Gaussian smoothing / 윈도우 크기 vs 지연 트레이드오프 / Causal vs Non-causal
- 다루지 않는 것: Kalman filter
- PokéClip 적용: 채팅 점수 스무딩
- 면접 답변 주제: "이동 평균 종류"

#### I-4: Peak Detection
- hook: 하이라이트 추출의 핵심
- 핵심 항목: Peak 정의 / 단순 임계 / Local maxima / scipy.signal.find_peaks / prominence / distance / height 파라미터 / 다중 peak / Peak vs noise
- 다루지 않는 것: 딥러닝 이상 탐지
- PokéClip 적용: 임계 초과 시점 추출
- 면접 답변 주제: "Peak Detection"

#### I-5: 임계값 + 정규화 (방법 B)
- hook: 절대값 X. 상대값 정답
- 핵심 항목: 정규화 (Min-Max/Z-score/Robust) / 상대값 vs 절대값 / 누적 평균 baseline / 동적 임계 / Adaptive threshold / Otsu method / 첫 N 구간 cold start
- 다루지 않는 것: 분포 추정 깊이
- PokéClip 적용: 방법 B 정규화 / 30분 cold start
- 면접 답변 주제: "Adaptive threshold"

#### I-6: 신호 융합 + 가중치
- hook: 여러 신호 합쳐서 한 점수
- 핵심 항목: 가중 합 / 가중 평균 / 곱셈 결합 / Logical OR (max) / AND (min) / 베이지안 융합 개요 / Sensor fusion 패턴 / 가중치 결정 (그리드 서치 / 베타 튜닝) / 신호 상관관계
- 다루지 않는 것: 머신러닝 융합
- PokéClip 적용: 영상/음성/채팅 융합
- 면접 답변 주제: "신호 융합"

#### I-7: E Hybrid Voting (자체 함수)
- hook: PokéClip 핵심 알고리즘
- 핵심 항목: E Hybrid 정의 / 임계값별 hit 계산 / 다수결 / 가중 다수결 / Soft voting vs Hard voting / 신호 간 시간 정렬 / 채팅 딜레이 보정 / 시뮬레이션 / 베타 튜닝
- 다루지 않는 것: 신경망 융합
- PokéClip 적용: 자체 함수 설계
- 면접 답변 주제: "자체 점수 함수 설계 경험"

#### I-8: 클립 경계 추출 알고리즘
- hook: 시점은 점, 클립은 구간
- 핵심 항목: 이벤트 경계 감지 / Derivative 기반 / 0 교차 / Hysteresis threshold / 최소/최대 클립 길이 제약 / 인접 클립 병합 / 클립 padding
- 다루지 않는 것: 영상 편집
- PokéClip 적용: 10~90초 클립 자동 추출
- 면접 답변 주제: "이벤트 경계 감지"
