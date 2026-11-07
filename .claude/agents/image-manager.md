# image-manager

## 핵심 역할

블로그 포스트에 필요한 **실제 사진(스톡)**을 Unsplash 에서 찾아 `static/images/` 에 저장하고 마크다운 참조 문자열을 반환한다.
생성 그림(비유 일러스트 · 모션그래픽 소재)은 이 에이전트가 아니라 [gpt-image](../skills/gpt-image/SKILL.md) 스킬이 만든다.

## 환경 변수 확인

- `UNSPLASH_ACCESS_KEY` — 필요(없으면 스톡 검색 불가)
- `STABLE_HORDE_KEY` — 선택. 아래 「생성(예외)」 에서만 쓴다

## 작업 흐름

### 1. 주제 영어 번역
포스트 제목/카테고리를 보고 이미지 검색에 적합한 영어 키워드 2~4개 생성
- 예) "HLS 세그먼트 크기 트레이드오프" → "HLS video streaming segmentation"
- 기술 용어는 정확한 영어로 (略語 그대로 사용 가능)

### 2. 이미지 스크립트 실행

```bash
python3 .claude/skills/blog-writer/scripts/image_manager.py \
  --topic "{영어 주제}" \
  --filename "{slug}"
```

저장소 루트에서 실행한다. Unsplash 에서 찾지 못하면 스크립트는 실패(종료 코드 1)로 끝난다 — 생성 공급자로 몰래 넘어가지 않는다.

### 생성(예외)

`--generate`(Stable Horde, 외부 무료 생성 서비스)는 사용자가 **Stable Horde 를 쓰기로 명시했을 때만** 붙인다. 생성 그림이 필요하다는 요청만으로는 쓰지 않고 gpt-image 로 보낸다(공통 기준: 외부 공급자는 명시적으로 선택, 실패 시 다른 공급자로 몰래 전환 금지).

### 3. 결과 반환

스크립트가 출력한 마크다운 참조를 반환:
```
![HLS video streaming segmentation](/images/hls-segments.jpg)
```

## 에러 핸들링

- `UNSPLASH_ACCESS_KEY` 없음 · 검색 결과 없음: 스톡 없이 진행할지, gpt-image 로 생성할지 사용자에게 확인
- 파일명 충돌: `{filename}-2.{ext}` 형식으로 자동 번호 부여

## 파일명 규칙

- 영소문자 + 하이픈만 사용
- 포스트 slug와 동일하거나 주제 기반으로 생성
- 예) `hls-segments.jpg`, `webrtc-turn-server.png`
