### D. AI 깊이 (22 시리즈)

**갯수 근거**: PokéClip 핵심 영역 + 치지직 AI 입사 직격. CV(YOLO 학습 5+) + 음성(Whisper/효과음 4) + NLP/LLM(5) + MLOps/추론 최적화(5) + GPU(2) + 멀티모달(1). 각 하위 도메인 깊이가 사람 판단 영역이라 슬림화 X. **유지**.

#### D-1: Computer Vision 깊이
- hook: PokéClip 영상 분석 출발
- 핵심 항목: 이미지 분류 (ResNet/VGG/EfficientNet) / 영상 task (분류/검출/세그멘테이션/포즈) / Two-stage vs One-stage / Backbone/Neck/Head / CV 특화 증강 (Mosaic/MixUp/CutMix)
- 다루지 않는 것: 객체 검출 이론 (D-2)
- PokéClip 적용: YOLO 학습 직관
- 면접 답변 주제: "Two-stage vs One-stage"

#### D-2: 객체 검출 이론
- hook: YOLO 이전/이후 이론적 흐름
- 핵심 항목: R-CNN family / YOLO 진화 (v1~v10) / SSD / RetinaNet (Focal Loss) / Anchor 개념 / Anchor-free / NMS / Soft-NMS / DETR 개요
- 다루지 않는 것: YOLO 사용법 (D-3)
- PokéClip 적용: YOLO 선택 근거
- 면접 답변 주제: "NMS / Anchor 개념"

#### D-3: YOLO 사용법 (Ultralytics)
- hook: PokéClip 영상 분석 모델
- 핵심 항목: Ultralytics YOLO 설치 / 데이터 형식 / yaml config / 사전학습 모델 / train/val/predict / export (ONNX/TensorRT) / Loss 구조 (Box/Cls/Obj) / 학습 결과 해석
- 다루지 않는 것: 라벨링 (D-4)
- PokéClip 적용: LoL YOLO 출발
- 면접 답변 주제: "YOLO 학습 흐름"

#### D-4: 데이터 라벨링 도구 + 워크플로우
- hook: 라벨링이 80% 시간
- 핵심 항목: 어노테이션 종류 (bbox/polygon/keypoint/mask) / Roboflow / CVAT / Label Studio / 라벨링 가이드라인 / IAA / 라벨 오류 패턴 / 데이터셋 분할 (누수 방지) / Active Learning / Synthetic data
- 다루지 않는 것: 파인튜닝 (D-5/D-6)
- PokéClip 적용: LoL 킬피드 데이터셋
- 면접 답변 주제: "라벨링 품질 보장"

#### D-5: YOLO 파인튜닝 1단계 (데이터셋 구성)
- hook: 파인튜닝의 절반은 데이터 구성
- 핵심 항목: 클래스 정의 / 라벨링 일관성 / 분포 균형 / Train/Val 분할 / 증강 선택 / Negative samples / 데이터 검증 / 라벨 오류 자동 발견
- 다루지 않는 것: 학습 자체 (D-6)
- PokéClip 적용: LoL 킬피드 데이터셋 구성
- 면접 답변 주제: "데이터셋 분할 전략"

#### D-6: YOLO 파인튜닝 2단계 (학습 + 하이퍼파라미터)
- hook: 학습 자체. 하이퍼파라미터가 결과 결정
- 핵심 항목: 사전학습 가중치 선택 / 학습률 / epochs / batch / imgsz / Freeze 전략 / Validation 모니터링 / 손실 곡선 읽기 / mAP 추적 / Resume / Best model 선택 / 후처리 (Confidence/NMS IoU)
- 다루지 않는 것: 평가 디버깅 (D-7)
- PokéClip 적용: LoL YOLO 파인튜닝
- 면접 답변 주제: "하이퍼파라미터 튜닝"

#### D-7: 모델 평가 + 디버깅 (CV)
- hook: 학습 끝났는데 잘 안 됨. 원인 찾기
- 핵심 항목: 학습 곡선 분석 / 클래스별 성능 / Confusion Matrix 해석 / FP/FN 시각화 / 데이터 vs 모델 문제 / TensorBoard / Weights & Biases / Ablation Study / 에러 분석
- 다루지 않는 것: 추론 최적화 (D-21)
- PokéClip 적용: 거짓 양성 ≤ 30% 달성
- 면접 답변 주제: "모델 성능 안 나올 때"

#### D-8: 음성 처리 기초
- hook: 음성 = 신호. PokéClip 음성 트랙 출발
- 핵심 항목: waveform / sample rate / 푸리에 변환 직관 / 스펙트로그램 / mel-spectrogram / MFCC / librosa / VAD / 오디오 IO (soundfile/pydub)
- 다루지 않는 것: STT (D-9)
- PokéClip 적용: 마이크/Discord 트랙 전처리
- 면접 답변 주제: "Mel-spectrogram 직관"

#### D-9: Whisper STT 활용
- hook: PokéClip 음성 분석 핵심
- 핵심 항목: Whisper 모델 패밀리 (tiny~large/turbo) / OpenAI Whisper / faster-whisper / API vs self-hosted / 타임스탬프 / Word-level / 언어 감지 / VAD 전처리 / 비용 비교
- 다루지 않는 것: 파인튜닝 (D-10)
- PokéClip 적용: 마이크 STT
- 면접 답변 주제: "Whisper 모델 선택"

#### D-10: Whisper 파인튜닝 (한국어/도메인)
- hook: 일반 Whisper는 한국어 게임 슬랭에 약함
- 핵심 항목: 한국어 데이터셋 / 도메인 어휘 / Whisper fine-tuning 흐름 / LoRA 활용 / 평가 (WER) / 화자 분리 / 노이즈 강건성
- 다루지 않는 것: 일반 fine-tuning
- PokéClip 적용: 게임 슬랭 정확도 개선
- 면접 답변 주제: "도메인 적응"

#### D-11: 음성 효과음 패턴 매칭
- hook: Penta Kill 사운드 = 매칭이 정답
- 핵심 항목: Cross-correlation / DTW / Template matching / 효과음 라이브러리 / 임계값 결정 / 시간 정렬 / YAMNet 비교
- 다루지 않는 것: STT (D-9)
- PokéClip 적용: Penta Kill / 드래곤 처치 / 도네이션
- 면접 답변 주제: "Template vs ML"

#### D-12: NLP/LLM 입문
- hook: 토큰화부터 LLM까지 큰 흐름
- 핵심 항목: 토큰화 (BPE/WordPiece/SentencePiece) / 임베딩 / Word2Vec → BERT → GPT 진화 / LLM 패밀리 (GPT/Claude/Llama/Qwen) / Foundation Model / Instruction tuning / RLHF 개요
- 다루지 않는 것: 프롬프트 엔지니어링 (D-13)
- PokéClip 적용: LLM 요약 기반 이해
- 면접 답변 주제: "Transformer 진화"

#### D-13: 프롬프트 엔지니어링
- hook: 프롬프트가 80%
- 핵심 항목: 시스템 프롬프트 / Few-shot vs Zero-shot / Chain-of-Thought / Self-consistency / 역할 부여 / 출력 형식 강제 (JSON) / Function Calling / 프롬프트 인젝션 방어 / LLM-as-judge / 비용 최적화
- 다루지 않는 것: RAG (D-14)
- PokéClip 적용: 구간 요약 / 감정 분석
- 면접 답변 주제: "프롬프트 설계"

#### D-14: RAG 입문
- hook: LLM에 외부 지식 주입
- 핵심 항목: RAG 개념 / 임베딩 벡터 / 벡터 DB (Chroma/Qdrant/pgvector) / 청킹 전략 / 검색 (BM25/Dense/Hybrid) / Re-ranking / 평가 (Faithfulness/Relevance) / LangChain 개요
- 다루지 않는 것: 멀티모달 (D-15)
- PokéClip 적용: 도메인 지식 주입 (선택)
- 면접 답변 주제: "RAG vs Fine-tuning"

#### D-15: 멀티모달 LLM (Qwen-VL / GPT-4V)
- hook: 비디오 분석 옵션
- 핵심 항목: Vision-Language Model / GPT-4V/Claude Vision/Gemini Vision/Qwen-VL / CLIP / 비디오 프레임 샘플링 / 비용 비교 / 한국어 성능 / YOLO 보완 사용 사례
- 다루지 않는 것: VLA
- PokéClip 적용: 영상 분석 옵션
- 면접 답변 주제: "멀티모달 활용"

#### D-16: 모델 경량화 (양자화 / Distillation)
- hook: 큰 모델은 비용 폭주
- 핵심 항목: Quantization (INT8/FP16/INT4) / PTQ vs QAT / Pruning / Knowledge Distillation / GGUF / llama.cpp / 정확도 vs 크기 트레이드오프
- 다루지 않는 것: ONNX/TensorRT (D-17)
- PokéClip 적용: YOLO 경량화 / Whisper turbo
- 면접 답변 주제: "양자화 영향"

#### D-17: ONNX + TensorRT
- hook: 추론 표준 + GPU 최적화
- 핵심 항목: ONNX 포맷 / 변환 / ONNX Runtime / TensorRT / FP16/INT8 정밀도 / 동적 shape / 추론 성능 비교
- 다루지 않는 것: 모델 서빙 (D-20)
- PokéClip 적용: YOLO 추론 가속
- 면접 답변 주제: "ONNX vs TensorRT"

#### D-18: GPU 활용 (CUDA / MPS / 클라우드)
- hook: M5 Mac은 CUDA 없음
- 핵심 항목: GPU vs CPU / CUDA / NVIDIA 세대 (T4/A10/V100/A100/H100) / Apple MPS / PyTorch device / OOM 대응 / Mixed Precision (FP16/BF16) / nvidia-smi / Colab / AWS EC2 GPU / vast.ai/RunPod
- 다루지 않는 것: 컴구조 (P-2)
- PokéClip 적용: 학습 = MPS/Colab, 추론 = AWS
- 면접 답변 주제: "GPU 메모리 관리"

#### D-19: MLOps 입문 (실험 추적 / 모델 버전)
- hook: 모델은 학습이 끝이 아님
- 핵심 항목: MLOps vs DevOps / 실험 추적 (MLflow/Weights & Biases) / 모델 버전 관리 / DVC / 재학습 파이프라인 / 데이터 드리프트 / 모델 드리프트
- 다루지 않는 것: 서빙 (D-20)
- PokéClip 적용: YOLO 모델 버전 관리
- 면접 답변 주제: "MLOps 경험"

#### D-20: 모델 서빙 (FastAPI / Triton)
- hook: 모델 → API → 호출 가능
- 핵심 항목: FastAPI로 모델 감싸기 / Pydantic / 배치 처리 / TorchServe / Triton Inference Server / 모델 레지스트리 / Health check / 콜드 스타트
- 다루지 않는 것: 추론 최적화 (D-21)
- PokéClip 적용: 분석 모델 API화
- 면접 답변 주제: "모델 서빙 구조"

#### D-21: 추론 최적화 (배치 / Continuous batching)
- hook: 추론 비용이 운영 비용 90%
- 핵심 항목: 배치 추론 vs 실시간 / Throughput vs Latency / 동적 배치 / Continuous batching (vLLM) / KV Cache / Speculative decoding / 캐싱 / Triton dynamic batching
- 다루지 않는 것: 실시간 (D-22)
- PokéClip 적용: 분석 추론 처리량
- 면접 답변 주제: "Throughput 올리기"

#### D-22: 실시간 추론 시스템 (스트리밍)
- hook: PokéClip은 방송 중 점진 분석
- 핵심 항목: 스트리밍 입력 / 슬라이딩 윈도우 추론 / 백프레셔 / 큐 기반 서빙 / 모델 워밍업 / 콜드 스타트 / Auto-scaling 추론 / 모니터링 / 페일오버
- 다루지 않는 것: 추론 일반 (D-21)
- PokéClip 적용: 방송 중 실시간 분석
- 면접 답변 주제: "실시간 모델 서빙"
