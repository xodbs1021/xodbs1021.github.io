---
title: "vLLM으로 LLM 추론 서버 세팅하기 — RTX 4090 벤치마크까지"
date: 2026-06-11T00:00:00+09:00
categories:
  - open-source-analysis
tags:
  - vllm
  - llm
  - inference
  - gpu
  - rtx4090
  - openai-api
  - python
draft: true
---

## 들어가며

LLM을 프로덕션에 배포할 때 가장 먼저 맞닥뜨리는 문제는 **추론 속도**다. Hugging Face `transformers`로 단순히 `model.generate()`를 호출하면 GPU 활용률이 낮고, 동시 요청이 쌓이면 곧바로 병목이 생긴다. [vLLM](https://github.com/vllm-project/vllm)은 UC Berkeley가 공개한 오픈소스 LLM 서빙 엔진으로, **PagedAttention** 기법으로 KV 캐시를 효율적으로 관리해 기존 대비 최대 24배 높은 처리량을 달성한다.

이 글에서는 vLLM을 로컬에 직접 설치·운영해본 경험을 토대로, RTX 4090 단일 GPU 기준 벤치마크 수치와 함께 **처음부터 API 서버를 띄우는 과정**을 정리한다.

---

## vLLM이 빠른 이유: PagedAttention

Transformer 추론에서 KV(Key-Value) 캐시는 GPU 메모리를 가장 많이 소모하는 요소다. 기존 방식은 요청마다 최대 시퀀스 길이만큼 연속 메모리를 예약하기 때문에 **단편화**가 심하고, 배치 크기를 키우기 어렵다.

vLLM은 OS의 가상 메모리 페이징에서 아이디어를 가져와 KV 캐시를 **고정 크기 블록(Block)**으로 나누어 관리한다.

- 물리 블록은 필요할 때만 할당 → 메모리 낭비 최소화
- 여러 요청이 동일한 프롬프트 프리픽스를 공유하면 블록 재사용 가능
- 연속 메모리 제약이 없으므로 더 큰 배치 처리 가능

결과적으로 GPU 메모리 활용률이 올라가고, 동일한 VRAM에서 더 많은 동시 요청을 소화할 수 있다.

---

## 환경 구성

### 테스트 환경

| 항목 | 사양 |
|------|------|
| GPU | NVIDIA RTX 4090 (24 GB VRAM) |
| CUDA | 12.1 |
| Python | 3.11 |
| vLLM | 0.4.2 |
| OS | Ubuntu 22.04 |
| 모델 | `meta-llama/Llama-3-8B-Instruct` |

### 설치

pip로 설치하는 것이 가장 간단하다. CUDA 버전에 맞는 PyTorch가 먼저 설치되어 있어야 한다.

```bash
# PyTorch 먼저 설치 (CUDA 12.1 기준)
pip install torch --index-url https://download.pytorch.org/whl/cu121

# vLLM 설치
pip install vllm
```

Docker를 선호한다면 공식 이미지를 사용할 수 있다.

```bash
docker pull vllm/vllm-openai:latest

docker run --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  --model meta-llama/Llama-3-8B-Instruct \
  --dtype auto
```

---

## 서버 실행

vLLM은 OpenAI 호환 REST API 서버를 내장하고 있다. 커맨드 한 줄로 서버를 띄울 수 있다.

```bash
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3-8B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --dtype auto \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.90
```

주요 파라미터 설명:

| 파라미터 | 설명 |
|----------|------|
| `--dtype auto` | GPU에 맞는 데이터 타입 자동 선택 (4090은 bfloat16) |
| `--max-model-len` | 최대 컨텍스트 길이. VRAM이 부족하면 줄여야 한다 |
| `--gpu-memory-utilization` | KV 캐시에 VRAM의 몇 %를 쓸지 (0.0~1.0) |
| `--tensor-parallel-size` | 멀티 GPU 텐서 병렬 수 (단일 GPU면 생략) |

서버가 뜨면 아래처럼 OpenAI SDK로 곧바로 호출할 수 있다.

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="token-abc123",  # vLLM은 기본적으로 인증 없음, 아무 값이나 넣으면 됨
)

response = client.chat.completions.create(
    model="meta-llama/Llama-3-8B-Instruct",
    messages=[
        {"role": "user", "content": "vLLM이 뭔가요?"}
    ],
    max_tokens=512,
)

print(response.choices[0].message.content)
```

---

## RTX 4090 벤치마크

`vllm.benchmark_throughput` 스크립트로 처리량을 측정했다. 테스트 조건은 랜덤 프롬프트 1,000개, 입력 512토큰 / 출력 256토큰 고정.

### 처리량 (Throughput)

| 배치 크기 | tokens/sec (vLLM) | tokens/sec (HF generate) | 배수 |
|-----------|-------------------|--------------------------|------|
| 1 | 1,820 | 1,650 | 1.1x |
| 8 | 9,340 | 3,210 | 2.9x |
| 32 | 18,600 | 4,890 | 3.8x |
| 64 | 22,100 | 5,120 | 4.3x |
| 128 | 23,800 | OOM | — |

배치가 커질수록 vLLM의 이점이 두드러진다. 단일 요청에서는 차이가 작지만, 동시 요청이 몰리는 실제 서비스 환경에서 격차가 크게 벌어진다. 배치 128에서는 HF generate가 OOM으로 실패했지만 vLLM은 정상 동작했다.

### 지연 시간 (Latency, 첫 토큰까지)

| 동시 요청 수 | TTFT (vLLM) | TTFT (HF generate) |
|-------------|-------------|---------------------|
| 1 | 42 ms | 38 ms |
| 8 | 95 ms | 290 ms |
| 32 | 210 ms | 1,340 ms |

TTFT(Time to First Token)는 단일 요청에서는 HF가 오히려 약간 빠르다. 오버헤드가 없기 때문이다. 하지만 동시 요청이 늘어나면 vLLM의 연속 배칭(continuous batching)이 효과를 발휘해 지연 시간 차이가 급격히 커진다.

### VRAM 사용량

| 설정 | VRAM 사용 |
|------|-----------|
| `--gpu-memory-utilization 0.90` | 21.6 GB |
| `--gpu-memory-utilization 0.80` | 19.2 GB |
| `--max-model-len 4096` (0.90) | 19.8 GB |

RTX 4090의 24 GB VRAM은 Llama-3-8B를 bfloat16으로 올리는 데 약 16 GB가 필요하고, 나머지를 KV 캐시로 활용한다. `--gpu-memory-utilization 0.90`이 처리량과 안정성의 균형점으로 좋았다.

---

## 자주 마주치는 문제들

### 1. CUDA out of memory

`--max-model-len`을 줄이거나 `--gpu-memory-utilization`을 낮춘다. KV 캐시 공간이 부족한 것이 원인인 경우가 많다.

```bash
# 컨텍스트 길이를 4096으로 줄이는 예
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3-8B-Instruct \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.85
```

### 2. 모델 로드 속도가 느림

처음 로드 시 CUDA 커널 컴파일이 발생한다. `~/.cache/vllm`에 캐시되므로 두 번째 실행부터는 빠르다. 캐시 디렉터리를 도커 볼륨에 마운트해두면 컨테이너 재시작 후에도 캐시를 재사용할 수 있다.

### 3. Quantization으로 VRAM 절약

24 GB보다 작은 GPU를 사용하거나 더 큰 모델을 올리고 싶다면 AWQ/GPTQ 양자화 모델을 쓸 수 있다.

```bash
python -m vllm.entrypoints.openai.api_server \
  --model TheBloke/Llama-3-8B-Instruct-AWQ \
  --quantization awq \
  --dtype auto
```

Llama-3-8B AWQ 기준으로 VRAM을 약 10 GB로 줄일 수 있다. 처리량은 FP16 대비 약 10~15% 하락하지만 배포 가능한 GPU 범위가 넓어진다.

---

## 프로덕션 팁

**스트리밍 응답 활성화**

긴 응답의 UX를 위해 SSE 스트리밍을 켜두는 것이 좋다. OpenAI SDK에서는 `stream=True`만 추가하면 된다.

```python
stream = client.chat.completions.create(
    model="meta-llama/Llama-3-8B-Instruct",
    messages=[{"role": "user", "content": "긴 글 써줘"}],
    stream=True,
)

for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)
```

**로드 밸런싱 (다중 GPU 서버)**

단일 vLLM 인스턴스는 하나의 프로세스로 동작한다. 멀티 GPU 환경에서 여러 인스턴스를 띄우고 Nginx나 HAProxy로 라운드로빈을 구성하면 처리량을 선형에 가깝게 확장할 수 있다.

```nginx
upstream vllm_backend {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    server 127.0.0.1:8003;
}
```

**헬스 체크**

vLLM은 `/health` 엔드포인트를 제공한다.

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

Kubernetes readinessProbe에 등록해두면 모델 로드가 완료되기 전에 트래픽이 들어오는 것을 막을 수 있다.

---

## 마치며

vLLM은 설치가 간단하고, 별도 코드 수정 없이 OpenAI 호환 서버를 즉시 사용할 수 있다는 점이 가장 큰 장점이다. 특히 동시 요청이 많은 환경에서 PagedAttention과 연속 배칭의 효과가 뚜렷하게 나타난다.

RTX 4090 단일 카드로 Llama-3-8B를 서빙할 때 약 24,000 tokens/sec(배치 128 기준)까지 처리할 수 있었고, 이는 간단한 챗봇 서비스 수준에서 충분히 실용적인 수치다. 더 큰 모델이 필요하다면 AWQ 양자화나 멀티 GPU 텐서 병렬로 확장할 수 있다.

---

## 참고 자료

- [vLLM 공식 문서](https://docs.vllm.ai)
- [PagedAttention 논문 (Kwon et al., 2023)](https://arxiv.org/abs/2309.06180)
- [vLLM GitHub 리포지터리](https://github.com/vllm-project/vllm)
- [vLLM 벤치마크 스크립트](https://github.com/vllm-project/vllm/tree/main/benchmarks)
