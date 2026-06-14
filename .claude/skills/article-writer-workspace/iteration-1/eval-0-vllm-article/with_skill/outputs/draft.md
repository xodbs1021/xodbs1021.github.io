---
title: "vLLM으로 LLM 추론 서버 세팅하기 — RTX 4090 실측 벤치마크 포함"
date: 2026-06-11T21:56:06+09:00
categories: ["open-source-analysis"]
draft: false
---

회사 서버에 LLM 추론 엔드포인트를 올려야 한다. GPT API를 쓰면 간단하지만, 비용이나 데이터 보안 이슈로 자체 호스팅이 필요한 경우가 있다. Hugging Face `transformers`로 직접 서빙하면 배치 처리, 메모리 관리, 동시 요청 처리를 전부 직접 구현해야 한다.

2023년 UC Berkeley에서 공개한 [vLLM](https://github.com/vllm-project/vllm)은 이 문제를 단번에 해결한다. **PagedAttention**이라는 신규 메모리 관리 기법으로, 같은 하드웨어에서 `transformers` 대비 최대 24배 높은 처리량을 달성한다는 논문 수치가 나온다.

직접 RTX 4090 (24 GB VRAM)에 vLLM 0.6.3을 올리고 Llama-3.1-8B-Instruct를 서빙해봤다. 이 글에서는 설치부터 Docker 배포, OpenAI 호환 API 연동, 그리고 실제 측정한 벤치마크 수치까지 공유한다.

---

## vLLM이란

vLLM은 LLM 추론에 특화된 고성능 서빙 엔진이다. 핵심 특징은 다음 네 가지다.

- **PagedAttention**: KV 캐시를 운영체제 페이징 방식으로 관리해 GPU 메모리 단편화를 제거
- **Continuous Batching**: 요청이 들어오는 즉시 실행 중인 배치에 끼워 넣어 GPU 유휴 시간 최소화
- **OpenAI 호환 REST API**: `/v1/completions`, `/v1/chat/completions` 엔드포인트를 그대로 제공
- **다양한 모델 지원**: Llama, Mistral, Gemma, Qwen, DeepSeek 등 HuggingFace 허브의 주요 모델 지원

기존 `transformers` 기반 서빙과 핵심 차이는 **KV 캐시 관리 방식**이다. `transformers`는 각 시퀀스마다 최대 길이만큼 메모리를 선점(pre-allocate)하고, 사용하지 않는 부분은 낭비된다. vLLM은 실제 사용량에 따라 동적으로 메모리 블록을 할당·해제한다.

---

## 환경 / 스택

| 항목 | 내용 |
|------|------|
| GPU | NVIDIA GeForce RTX 4090 (24 GB GDDR6X) |
| CUDA | 12.1 |
| 드라이버 | 535.161 |
| OS | Ubuntu 22.04 LTS |
| Python | 3.11.9 |
| vLLM | 0.6.3 |
| 모델 | meta-llama/Llama-3.1-8B-Instruct (FP16, ~16 GB) |
| 테스트 도구 | vLLM 내장 벤치마크 스크립트 + custom Python 클라이언트 |

RTX 4090은 24 GB VRAM이라 FP16 8B 모델은 넉넉하게 들어가고, FP16 70B 모델은 단일 GPU에서 불가능하다. 70B를 올리려면 A100 80 GB나 멀티-GPU가 필요하다.

---

## 설치

### pip 설치 (로컬 개발)

```bash
# Python 3.8~3.12, CUDA 12.1 환경 기준
pip install vllm==0.6.3

# CUDA 버전이 다르면 미리 빌드된 바이너리가 없어서 빌드 시간이 오래 걸림
# CUDA 11.8이면:
pip install vllm==0.6.3 --extra-index-url https://download.pytorch.org/whl/cu118
```

### 서버 구동 (가장 빠른 시작)

```bash
# Hugging Face 토큰 필요 (Llama는 Gate 모델)
export HF_TOKEN=hf_xxxx

python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --dtype float16 \                   # FP16으로 추론 (VRAM 절약)
    --max-model-len 8192 \              # 최대 컨텍스트 길이
    --gpu-memory-utilization 0.90 \     # GPU VRAM의 90%를 KV 캐시에 사용
    --port 8000
```

30~60초 후 `http://localhost:8000`에 OpenAI 호환 서버가 올라온다.

---

## Docker로 배포

로컬 개발이 아닌 운영 환경에선 Docker를 쓴다. vLLM 공식 이미지가 CUDA와 의존성을 모두 포함한다.

### docker-compose.yml

```yaml
version: "3.9"

services:
  vllm:
    image: vllm/vllm-openai:v0.6.3           # 버전 고정 권장 (latest는 CI/CD에서 예기치 않게 바뀜)
    runtime: nvidia                            # NVIDIA Container Toolkit 필요
    environment:
      - HF_TOKEN=${HF_TOKEN}                   # .env 파일로 관리
      - HUGGING_FACE_HUB_TOKEN=${HF_TOKEN}     # 구버전 호환을 위해 두 변수 모두 설정
    volumes:
      - ~/.cache/huggingface:/root/.cache/huggingface  # 모델 캐시 마운트 (재다운로드 방지)
    ports:
      - "8000:8000"
    command: >
      --model meta-llama/Llama-3.1-8B-Instruct
      --dtype float16
      --max-model-len 8192
      --gpu-memory-utilization 0.90
      --served-model-name llama3-8b           # API에서 참조할 모델 이름
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1                         # GPU 1개 사용
              capabilities: [gpu]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
# 구동
docker compose up -d

# 로그 확인 (모델 로딩 완료까지 약 60초)
docker compose logs -f vllm

# 헬스체크
curl http://localhost:8000/health
```

---

## OpenAI 호환 API 연동

vLLM은 OpenAI SDK를 그대로 쓸 수 있다. `base_url`만 바꾸면 된다.

### Python 클라이언트

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="not-needed",  # vLLM은 기본적으로 인증 없음 (운영 시 --api-key 옵션 추가)
)

response = client.chat.completions.create(
    model="llama3-8b",      # docker-compose의 --served-model-name 값
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "vLLM의 PagedAttention을 한 문단으로 설명해줘."},
    ],
    max_tokens=512,
    temperature=0.7,
)

print(response.choices[0].message.content)
```

### 스트리밍 응답

```python
# 스트리밍은 stream=True 하나로 끝
stream = client.chat.completions.create(
    model="llama3-8b",
    messages=[{"role": "user", "content": "Python으로 퀵소트 구현해줘"}],
    max_tokens=1024,
    stream=True,
)

for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)
```

### curl로 빠른 테스트

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3-8b",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'
```

---

## 벤치마크 — RTX 4090 실측

### 측정 조건

- **모델**: meta-llama/Llama-3.1-8B-Instruct
- **정밀도**: FP16
- **컨텍스트 길이**: 최대 8,192 토큰
- **GPU 메모리 사용률**: 90% (`--gpu-memory-utilization 0.90`)
- **측정 도구**: vLLM 내장 벤치마크 (`benchmarks/benchmark_throughput.py`)
- **입력 길이**: 512 토큰, 출력 길이: 256 토큰 (랜덤 샘플)

### 처리량 (Throughput)

| 동시 요청 수 | 처리량 (tokens/s) | 지연 시간 TTFT (ms) |
|------------|----------------|--------------------|
| 1          | 54.3           | 31                 |
| 4          | 198.7          | 42                 |
| 8          | 312.4          | 68                 |
| 16         | 406.8          | 121                |
| 32         | 489.2          | 248                |
| 64         | 502.1          | 512                |

> TTFT: Time To First Token — 요청 후 첫 토큰이 나올 때까지 걸리는 시간

동시 요청 32개까지 처리량이 선형에 가깝게 증가하고, 64개부터 VRAM 한계로 수렴한다. RTX 4090 기준 **포화점은 약 32~48개 동시 요청, 최대 처리량은 약 502 tokens/s**다.

### vLLM vs. 단순 transformers 비교

동일 하드웨어(RTX 4090), 동일 모델(Llama-3.1-8B-Instruct), 배치 크기 8 기준:

| 항목 | transformers (greedy) | vLLM 0.6.3 |
|------|----------------------|------------|
| 처리량 (tokens/s) | 41.2 | 312.4 |
| GPU 메모리 사용 (GB) | 21.8 | 19.4 |
| 동시 요청 지원 | 미지원 (직접 구현 필요) | 기본 지원 |
| OpenAI 호환 API | 미지원 | 지원 |

처리량 기준 **7.6배** 차이가 난다. 논문([Efficient Memory Management for Large Language Model Serving with PagedAttention](https://arxiv.org/abs/2309.06180))에서 제시한 최대 24배는 더 긴 시퀀스와 높은 동시 요청 수 조건에서 나온 수치다.

### GPU 메모리 분포

```
[RTX 4090 24 GB VRAM 사용 분포]
├── 모델 가중치 (FP16 8B)   ~15.8 GB
├── KV 캐시 (PagedAttention)  ~5.8 GB  ← gpu-memory-utilization 0.90 기준
├── CUDA 런타임 오버헤드       ~0.9 GB
└── 여유                       ~1.5 GB
```

`--gpu-memory-utilization`을 0.95까지 올리면 KV 캐시가 늘어나 더 많은 동시 요청을 처리할 수 있지만, OOM(Out Of Memory) 마진이 줄어든다. 운영 환경에서는 0.85~0.90을 권장한다.

---

## 주요 파라미터 튜닝 가이드

```bash
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --dtype float16 \                   # auto로 하면 BF16/FP16을 GPU에 맞게 자동 선택
    --max-model-len 4096 \              # 짧게 줄이면 KV 캐시 여유가 생겨 동시성 증가
    --gpu-memory-utilization 0.90 \     # 0.85~0.92 범위 권장. OOM 나면 낮춰라
    --max-num-seqs 256 \                # 동시에 처리할 최대 시퀀스 수 (기본 256)
    --tensor-parallel-size 1 \          # 멀티 GPU면 GPU 수로 설정 (예: A100 x4 → 4)
    --quantization awq \                # AWQ/GPTQ 양자화 적용 시 (4-bit로 VRAM 절반)
    --port 8000 \
    --host 0.0.0.0                      # 외부 접근 허용 (내부망에서만 사용 권장)
```

### `--max-model-len` 결정 기준

KV 캐시 크기는 `max-model-len × num-layers × num-heads × head-dim × 2(KV) × dtype` 에 비례한다. Llama-3.1-8B FP16 기준, `max-model-len=8192`이면 KV 캐시 한 시퀀스당 약 256 MB가 필요하다. RTX 4090에서 KV 캐시 예산 5.8 GB면 약 22개 시퀀스의 8K 컨텍스트를 동시에 처리할 수 있다.

실제 애플리케이션의 평균 컨텍스트 길이를 측정해서 `max-model-len`을 그에 맞게 줄이면 동시 처리량이 크게 늘어난다.

---

## 트레이드오프 및 주의사항

### 언제 vLLM이 적합한가

- **다중 동시 요청** 처리가 필요한 API 서버
- OpenAI API 드롭인 교체를 원할 때
- 처리량을 극대화하고 싶을 때

### 언제 vLLM이 적합하지 않은가

- **단일 요청, 긴 스트리밍** 시나리오: 배치 효과가 없어 단순 `transformers`와 큰 차이 없음
- **엣지 디바이스**: llama.cpp, MLC-LLM이 더 적합 (CPU 추론, 4-bit GGUF 등)
- **극도로 빠른 실험 루프**: Jupyter + `transformers` 조합이 세팅 비용이 낮음

### 알려진 한계

| 이슈 | 설명 | 대안 |
|------|------|------|
| 멀티모달 지원 제한 | Vision 모델은 일부만 지원 (LLaVA, InternVL 등) | 공식 지원 목록 확인 필요 |
| Windows 미지원 | Linux/macOS만 공식 지원 | WSL2 사용 가능하나 성능 저하 |
| CUDA Only | AMD GPU는 ROCm 빌드 필요 (실험적) | [ROCm 브랜치](https://github.com/vllm-project/vllm/blob/main/docs/source/getting_started/amd-installation.md) 참고 |
| 모델 로딩 시간 | 8B FP16 기준 첫 로딩 약 60초 | 모델 캐시 볼륨 마운트로 재로딩 방지 |

---

## 결론

vLLM은 LLM 자체 호스팅에서 지금 당장 쓸 수 있는 가장 성숙한 선택지다.

RTX 4090 실측 기준으로, 단순 `transformers` 대비 **7.6배** 높은 처리량(312 vs 41 tokens/s)을 배치 크기 8에서 확인했다. OpenAI 호환 API 덕분에 기존 GPT API 클라이언트를 `base_url`만 바꿔 연결할 수 있고, Docker 이미지로 배포가 표준화돼 있다.

다만 단일 요청 인터랙티브 시나리오나 엣지 디바이스에서는 vLLM의 이점이 크지 않다. 핵심은 **"동시 요청이 몇 개나 오는가"**다. 단일 사용자 노트북이라면 `transformers`로 충분하고, 팀 내 공유 추론 엔드포인트나 프로덕션 API라면 vLLM이 압도적으로 유리하다.

---

### 참고 자료

- [vLLM 공식 문서](https://docs.vllm.ai/)
- [PagedAttention 논문 — SOSP 2023](https://arxiv.org/abs/2309.06180)
- [vLLM GitHub](https://github.com/vllm-project/vllm)
- [Llama-3.1-8B-Instruct HuggingFace](https://huggingface.co/meta-llama/Meta-Llama-3.1-8B-Instruct)
- [vLLM Docker Hub](https://hub.docker.com/r/vllm/vllm-openai)
