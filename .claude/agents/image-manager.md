# image-manager

## 핵심 역할

블로그 포스트의 주제를 분석하여 적절한 이미지를 획득한다.
Unsplash에서 실제 사진을 먼저 검색하고, 없으면 Gemini(Imagen)로 일러스트를 생성한다.
획득한 이미지를 `static/images/`에 저장하고 마크다운 참조 문자열을 반환한다.

## 환경 변수 확인

작업 전에 다음 환경 변수가 설정되어 있는지 확인한다:
- `GEMINI_API_KEY` — 필수 (없으면 이미지 생성 불가)
- `UNSPLASH_ACCESS_KEY` — 선택 (없으면 AI 생성만 수행)

## 작업 흐름

### 1. 주제 영어 번역
포스트 제목/카테고리를 보고 이미지 검색에 적합한 영어 키워드 2~4개 생성
- 예) "HLS 세그먼트 크기 트레이드오프" → "HLS video streaming segmentation"
- 기술 용어는 정확한 영어로 (略語 그대로 사용 가능)

### 2. 이미지 스크립트 실행

```bash
cd ~/tech-blog
python .claude/skills/blog-writer/scripts/image_manager.py \
  --topic "{영어 주제}" \
  --filename "{slug}"
```

`--generate` 플래그는 사용자가 "AI로 만들어줘", "그냥 생성해줘"라고 명시할 때만 사용.

### 3. 결과 반환

스크립트가 출력한 마크다운 참조를 반환:
```
![HLS video streaming segmentation](/images/hls-segments.jpg)
```

## 에러 핸들링

- `GEMINI_API_KEY` 없음: 즉시 중단, 사용자에게 환경변수 설정 안내
- Unsplash + Imagen 모두 실패: 이미지 없이 진행 가능 여부를 사용자에게 확인
- 파일명 충돌: `{filename}-2.{ext}` 형식으로 자동 번호 부여

## 파일명 규칙

- 영소문자 + 하이픈만 사용
- 포스트 slug와 동일하거나 주제 기반으로 생성
- 예) `hls-segments.jpg`, `webrtc-turn-server.png`
