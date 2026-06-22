### P. 컴퓨터 구조 (2 시리즈)

**갯수 근거**: 면접 비중 낮음. 보조 트랙. CPU+캐시+메모리 / GPU+디스크 2개로 통합. 3에서 2로 슬림.

#### P-1: CPU + 캐시 + 메모리 계층
- hook: 성능 직관. 100배 차이의 출처
- 핵심 항목: CPU 구조 (ALU/Register/Cache) / 파이프라이닝 / 슈퍼스칼라 / 분기 예측 / Out-of-order / 캐시 (L1/L2/L3) / 캐시 라인 / 캐시 미스 / Cache locality / False sharing / 메모리 계층 (Register → SSD) / 접근 지연 / Latency Numbers / DRAM vs SRAM / ECC / NUMA / Memory bandwidth
- 다루지 않는 것: GPU (P-2)
- PokéClip 적용: 성능/비용 직관
- 면접 답변 주제: "캐시 미스 / Latency Numbers"

#### P-2: GPU + 디스크 + Latency Numbers 종합
- hook: AI 직관 + 디스크 IO 직관
- 핵심 항목: GPU vs CPU 구조 / SIMD vs SIMT / CUDA 모델 (Grid/Block/Thread/Warp) / GPU 메모리 (Global/Shared/Register) / Memory coalescing / Tensor Core / 행렬 곱이 빠른 이유 / HDD 구조 / SSD 구조 (NAND/컨트롤러) / TRIM / Wear leveling / IOPS / Throughput / Sequential vs Random / NVMe
- 다루지 않는 것: CUDA 프로그래밍
- PokéClip 적용: GPU 직관 / 영상 저장 IO 직관
- 면접 답변 주제: "GPU가 AI에 강한 이유 / SSD vs HDD"
