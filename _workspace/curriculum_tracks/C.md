### C. AI 입문 (8 시리즈)

**갯수 근거**: AI 입문 흐름 (큰 그림 → NumPy → PyTorch → 신경망 → 학습 루프 → 데이터 → 평가 → 활용). 입문 트랙은 D 트랙 진입의 발판. 8개가 흐름 깨지 않으면서 충분. 유지.

#### C-1: AI/ML 큰 그림
- hook: AI 전공이지만 실전 0. 큰 그림 다시
- 핵심 다룰 항목: AI vs ML vs DL / 지도/비지도/강화/자기지도 / 분류/회귀/클러스터링 / Train/Val/Test / 과적합/과소적합 / 편향-분산 / 일반화 / 데이터셋 중요성 / Foundation Model / RAG / 멀티모달 흐름
- 다루지 않는 것: 코드 (C-2부터)
- PokéClip 적용: 영상/음성/채팅 분석 위치 매핑
- 면접 답변 주제: "지도 vs 비지도 / 과적합 방지"

#### C-2: NumPy + 텐서 기초
- hook: 모든 AI 라이브러리의 기반
- 핵심 다룰 항목: ndarray / shape/dtype/axis / 브로드캐스팅 / 슬라이싱 / 행렬 연산 / 통계 / 난수 / 텐서 개념 / NumPy vs PyTorch Tensor / Memory layout
- 다루지 않는 것: PyTorch (C-3) / GPU (D-18)
- PokéClip 적용: 점수 벡터 처리
- 면접 답변 주제: "브로드캐스팅"

#### C-3: PyTorch 입문
- hook: AI 생태계 표준
- 핵심 다룰 항목: torch.Tensor / autograd / requires_grad / nn.Module / nn.Linear / 순전파 / loss / optimizer / loss.backward() / state_dict / device 이동
- 다루지 않는 것: 신경망 깊이 (C-4)
- PokéClip 적용: YOLO/Whisper 기반 직관
- 면접 답변 주제: "autograd / state_dict"

#### C-4: 신경망 기초
- hook: MLP/CNN/RNN/Transformer 직관
- 핵심 다룰 항목: 퍼셉트론 / MLP / 활성화 (ReLU/Sigmoid/Softmax) / Backprop 직관 / CNN (Conv2d/Pooling/Padding/Stride) / RNN/LSTM 개요 / Transformer 개요 (Self-Attention)
- 다루지 않는 것: CV 깊이 (D-1) / 학습 루프 (C-5)
- PokéClip 적용: YOLO = CNN / Whisper = Transformer
- 면접 답변 주제: "CNN / Self-Attention 직관"

#### C-5: 학습 루프 + 최적화
- hook: 패턴 익숙해지면 어떤 모델도 학습 가능
- 핵심 다룰 항목: 학습 루프 구조 / DataLoader / batch / epoch / SGD / Adam / AdamW / Learning rate / LR Scheduler / weight decay / gradient clipping / early stopping / 체크포인트
- 다루지 않는 것: 분산 학습
- PokéClip 적용: YOLO 파인튜닝 시 학습 루프
- 면접 답변 주제: "SGD vs Adam"

#### C-6: 데이터 로더 + 전처리
- hook: 모델보다 데이터가 중요
- 핵심 다룰 항목: Dataset/DataLoader / 배치 / num_workers / pin_memory / 이미지 전처리 (PIL/OpenCV/albumentations) / 정규화 / 데이터 증강 / 텍스트 토큰화 개요 / 오디오 전처리 (mel-spectrogram 개요)
- 다루지 않는 것: 라벨링 (D-4) / 오디오 깊이 (D-8)
- PokéClip 적용: 게임 프레임 전처리 / mel-spectrogram
- 면접 답변 주제: "데이터 증강 효과"

#### C-7: 평가 지표
- hook: 잘했는지 측정 못 하면 개선 방향 없음
- 핵심 다룰 항목: Accuracy / Precision / Recall / F1 / ROC-AUC / PR-AUC / Confusion Matrix / mAP / IoU / WER / 회귀 지표 (MSE/MAE/R²) / 클래스 불균형 대응
- 다루지 않는 것: 통계 검정
- PokéClip 적용: YOLO mAP / Whisper WER
- 면접 답변 주제: "Precision vs Recall / mAP"

#### C-8: 사전학습 + HuggingFace + LLM API
- hook: 처음부터 학습은 비용 폭주. 활용이 정석
- 핵심 다룰 항목: Transfer learning / Freeze / timm (CV) / huggingface_hub / Model Hub / transformers / pipeline / datasets / OpenAI/Anthropic/Gemini API / 메시지 구조 / 토큰 카운팅 / 비용 / 스트리밍 / Function Calling
- 다루지 않는 것: 본격 파인튜닝 (D) / 프롬프트 엔지니어링 깊이 (D-13)
- PokéClip 적용: Whisper 모델 / LLM 요약 API
- 면접 답변 주제: "Transfer learning / LLM API 비용"
