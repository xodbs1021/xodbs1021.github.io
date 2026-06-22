### P. 컴퓨터 구조 (3 시리즈)

**갯수 근거**: 면접 가끔. 보조 트랙. CPU/메모리/GPU 3개로 충분. 더 가면 학술적.

#### P-1: CPU + 캐시
- hook: 성능 직관
- 핵심 항목: CPU 구조 (ALU/Register/Cache) / 파이프라이닝 / 슈퍼스칼라 / 분기 예측 / Out-of-order / 캐시 (L1/L2/L3) / 캐시 라인 / 캐시 미스 / Cache locality / False sharing
- 다루지 않는 것: 어셈블리
- PokéClip 적용: 성능 직관
- 면접 답변 주제: "캐시 미스"

#### P-2: 메모리 계층 + Latency Numbers
- hook: 100배 차이 직관
- 핵심 항목: 메모리 계층 (Register/L1/L2/L3/RAM/SSD/HDD) / 접근 지연 (cycle) / Latency Numbers / DRAM vs SRAM / ECC / NUMA / Memory bandwidth / 디스크 (HDD/SSD/NVMe)
- 다루지 않는 것: GPU 메모리 (P-3)
- PokéClip 적용: 비용/성능 직관
- 면접 답변 주제: "Latency Numbers"

#### P-3: GPU 구조 + CUDA 개요
- hook: AI 직관 보강
- 핵심 항목: GPU vs CPU 구조 / SIMD vs SIMT / CUDA 모델 (Grid/Block/Thread/Warp) / GPU 메모리 (Global/Shared/Register) / Memory coalescing / Tensor Core / 행렬 곱이 빠른 이유
- 다루지 않는 것: CUDA 프로그래밍
- PokéClip 적용: GPU 직관
- 면접 답변 주제: "GPU가 AI에 강한 이유"

---

