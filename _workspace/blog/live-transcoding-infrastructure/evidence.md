# live-transcoding-infrastructure — 근거 메모 (유형: 설계 해설 + 로컬 실측)

확인일 2026-11-13. 실측 원자료: measure/f1-concurrency.txt(N별 speed · 조각 지연, 1·2회차), f1-speed-series.txt(채널 1 speed 보고 순서), f1-segment-lateness.txt(조각별 지연), discontinuity.txt(이어 쓰기 끊김 표시). 실측 수행: 부모 에이전트(AI, Claude Code) · 끊김 표시와 첫 실행 목록은 이 포크(AI). 사용자에게 라이브 트랜스코딩 운영 경험 없음 — 운영 경험 서술 없음. PokeClip의 트랜스코딩 · ABR 여부는 쓰지 않음.

| 주장 | 근거 | 종류 |
|---|---|---|
| 첫 회차 speed N=1–3 1.01, 4 0.897, 5 0.989, 6 0.752, 8 0.517 / 둘째 회차 3 0.977, 4 0.701, 5 0.517, 6 0.626 | f1-concurrency.txt | 실측 |
| speed는 누적, 채널 1 보고 0 → 0.494 → … 0.986 → 1.01 | f1-speed-series.txt | 실측 |
| 조각 지연: 3개 0.53–0.57초, 6개 1.37 → 14.15초(k=18), 8개 36.74초(채널 1) | f1-segment-lateness.txt | 실측 |
| 다른 세션 프로세스 CPU 합 395% → 527% | 부모 측정 로그 | 실측 |
| 기종 MacBook Air Mac17,3 팬 없음, M5 4+6코어, 32GB | system_profiler | 실측 |
| 세 화질 20조각 모두 EXTINF 2.000000, seg5 키프레임 11.466667초 세 화질 같음 | n1-023431/c1 ffprobe | 실측 |
| N개 FFmpeg = 디코더 N · 스케일러 N · 인코더 N, N−1 디코더 제거, HLS는 변형 간 IDR 정렬 요구, 독립 인코더는 정렬 보장 못 함 | Twitch 2017 Part I (Part II 주소는 지금 홈으로 넘어가 인용 안 함) | 문헌값 |
| nginx-rtmp push = 원격으로 publish, push_reconnect 기본 3초, 장애 전환 기능 기술 없음 | nginx-rtmp-module 위키 Directives | 문헌값 |
| PokeClip은 MediaMTX 채택 | pokeclip-mediamtx-build-or-adopt(정본) | 공개 기록 |
| GeForce 12세션, T4 · A10 7세대 1개, L4 8세대 2개 | NVENC 앱 노트 13.1, 지원 매트릭스 | 문헌값 |
| nvidia.com/gpu 자원 | NVIDIA k8s-device-plugin README | 문헌값 |
| MostAllocated, 「scale-down 준비」, 확장 자원 가중치 | Kubernetes Resource Bin Packing | 문헌값 |
| 흩는 배치 도구 | Pod Topology Spread Constraints | 문헌값 |
| 목록 안 바뀌면 목표 길이 절반 뒤 재요청 | RFC 8216 6.3.4 | 문헌값 |
| 타임스탬프 순서 변경 MUST · 인코딩 순서 SHOULD DISCONTINUITY | RFC 8216 4.3.2.3 | 문헌값 |
| append_list+discont_start 두 번 실행: live2 앞 표시, 첫 pts 1.466667 재시작, ENDLIST 끝에 하나, 첫 실행만으로도 맨 앞 표시 두 줄 | discontinuity.txt | 실측 |
| PokeClip 같은 세션 재접속은 표시 빼고 시간축 이어 붙임, 대가 영상 겹침 | pokeclip-reconnect-audio-gap(정본) | 공개 기록 |
| MediaLive: 입력 · 출력 · 부가 기능 시간당, 출력 합, 코덱 · 비트레이트 · 해상도 · 프레임 레이트, 표준 = 다른 AZ 파이프라인 2개, 단일 2개보다 쌈 | MediaLive 가격 페이지(2026-11-13) | 문헌값 |
| YouTube VCU 2021-04-21, 전용 칩 + 소프트웨어, 이전 시스템 대비 연산 효율 최대 20–33배 | YouTube 블로그, ASPLOS 2021 | 문헌값(자사 비교) |

삭제한 옛 주장: 「2026-10-29 정정」 인용문 · 「가상의 파이프라인 학습 노트」 메타, illustrativeMetrics, 6.2초 여정, 차트 17개(비용 분배 · 인스턴스 가격 · 처리량 · CDN 단가 · 라이선스 · A/B · MTTR · 장애 빈도 등), 「A10이 가성비 정점」, Reserved 80%, Spot drain, Origin Shield 90%, 7층 마이크로서비스, Redis Streams vs Kafka, 예측 스케일링, 우선순위 QoS, stream migration, 월간 장애 · 자동 복구 매핑 · GPU hang 3단계 · region failover · GSLB · P0–P2 알람 · Chaos(Simian Army) · runbook · postmortem · FinOps · 캐시 TTL 절, 「레벨 4」 내부 용어, nginx-rtmp push 둘을 장애 전환으로 쓴 서술, ExplanationLab latency 모형 안내 문장(73행), AI 이미지 6장(live-transcoding-7layer-architecture, live-stream-first-6sec-journey, origin-shield-funnel, storage-tier-hot-warm-cold, bin-packing-vs-load-balancing, tier-scheduling-pyramid) 참조.
