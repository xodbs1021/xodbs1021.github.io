# fast.ai Top-down 가이드

## 원리

Jeremy Howard & Rachel Thomas (fast.ai, 2017~) — *Code-first, top-down* 학습. 전통적 bottom-up (이론 → 적용)을 뒤집어 *작동하는 전체 예제 먼저 → 부분 분해 → 깊이* 흐름.

> 핵심: 학습자는 "이게 작동한다 / 왜 중요한지" 먼저 봐야 동기가 생긴다. 디테일은 그 다음.

검증: fast.ai 코스 수강자 10만+ 명, 양적 효과 입증. 2018년 Jeremy의 "Deep Learning for Coders" 가 산업 표준.

## Top-down vs Bottom-up

### Bottom-up (전통적)

```
Chapter 1: 기초 이론
Chapter 2: 더 깊은 이론
Chapter 3: 조금 더 깊은 이론
...
Chapter 10: 드디어 적용 예제
```

문제: 학습자가 *왜 이걸 배우는지* 모름 → 동기 0 → 포기.

### Top-down (fast.ai)

```
Chapter 1: 작동하는 전체 예제 (Lab) — "이게 이런 일을 한다"
Chapter 2: 부분 분해 — "이 부분이 이걸 한다"
Chapter 3: 더 깊이 — "이 부분 안에 이런 패턴"
...
Chapter N: 이론 정밀화 — "왜 이게 통하는지"
```

학습자: 첫 강의에서 *전체 동작* 본 후 디테일로 들어감. 동기 + 맥락 확보.

## 우리 적용 패턴

### 강의 첫 섹션 = 큰 그림 + 작동 예제

```markdown
### 큰 그림: 이 강의에서 만들 것

**시나리오**: AI가 짠 명령을 SSH로 EC2에 실행하려는데 권한 오류가 났다.

```bash
# 30초 안에 진단 + 해결
ssh ec2-user@1.2.3.4
$ python3 analysis.py
bash: python3: command not found  # ← 진짜 원인 발견

# 해결
$ which -a python3
$ export PATH=/opt/python3/bin:$PATH
```

이 강의가 끝나면 위 시나리오를 *5초* 안에 진단할 수 있다.

---

### 부분 1: PATH가 뭔지부터
...
```

학습자: 첫 30초에 *어떤 시나리오*에 적용되는지 본다 → "내가 이걸 배우는 이유"가 명확.

### 진짜 Top-down 흐름

| 위치 | 내용 | 학습자 인지 |
|---|---|---|
| 첫 섹션 | 작동하는 전체 예제 + 큰 그림 | "이게 X를 한다 / 내게 필요하다" |
| 중간 섹션 | 부분 분해 + 각 부분 동작 | "A 부분이 이걸 / B 부분이 저걸" |
| 후반 섹션 | 디테일 + 트레이드오프 | "왜 이 선택 / 다른 선택의 함정" |
| 마지막 | 적용 시나리오 / 회상 | "내 시나리오에 적용 가능" |

### vs 우리 기존 흐름 (Bottom-up 잔재)

```
### 개념 설명 (이론)
### 명령 시연 (적용)
### 트레이드오프 (평가)
### 적용 사례 (마지막)
```

학습자: *왜* 이걸 배우는지 마지막에야 깨달음. 동기 부족.

## 트랙별 Top-down 적용 정도

| 트랙 | Top-down 강도 |
|---|---|
| **A (도구 입문)** | 강함 — 첫 섹션에 *실제 시나리오* 시연 |
| **B (Python)** | 중간 — 입문 강의는 syntax 먼저 OK, 응용 강의는 top-down |
| **C (AI 입문)** | 강함 — fast.ai 본가, 모델 작동부터 |
| **D (AI 깊이)** | 매우 강함 — 모델 결과 보고 깊이로 |
| **E (백엔드)** | 강함 — 작동하는 API 먼저 |
| **F (DB)** | 중간 — SQL은 bottom-up도 OK |
| **G (AWS)** | 강함 — 콘솔/CLI 작동 먼저 |
| **H (DevOps)** | 강함 — Docker 컨테이너 작동 먼저 |
| **I/J/K** | 매우 강함 — 시스템 동작 먼저, 이론 나중 |
| **L (보안)** | 강함 — 공격/방어 시나리오 먼저 |
| **N/O/P** | 약함 (이론 위주) |
| **Q (DSA)** | 약함 (수학 / 이론 본질) |

## "Show first, explain later" 패턴

### 패턴 1: 작동 예제 → 분해 → 설명

```markdown
### 큰 그림

```bash
# 이 명령으로 끝남
ssh -i ~/.ssh/key.pem ec2-user@1.2.3.4
```

위 한 줄로 우리는 *원격 EC2 서버의 셸을 텍스트로* 연다.

### 부분 분해

- `ssh`: 명령 자체
- `-i`: 키 파일 옵션
- `~/.ssh/key.pem`: 키 파일 경로
- `ec2-user@1.2.3.4`: 사용자명@서버 IP

### 깊이: 왜 키 파일인가
...
```

### 패턴 2: 결과 → 원인 → 메커니즘

```markdown
### 큰 그림

`command not found` 가 떴다.

```bash
$ python3
bash: python3: command not found
```

### 진짜 원인 (대부분 PATH)

PATH라는 환경 변수가 검색 순서를 결정한다...

### 메커니즘 깊이
...
```

### 패턴 3: 시나리오 → 도구 → 동작

```markdown
### 큰 그림

상황: 100명 동시 사용자 환영 메시지를 보내야 한다.

```python
for user in users:
    send(user)  # 동기로 짜면 100초
```

### 도구: asyncio

```python
async def main():
    await asyncio.gather(*[send(u) for u in users])  # 1초
```

### 동작 깊이: 왜 이게 빠른가
...
```

## Top-down vs 인지 부하의 조화

Top-down 단점: 첫 섹션이 *전체 작동*을 던지면 인지 부하 폭주 위험.

해결:
- 첫 섹션은 *결과만* 보여줌 (디테일 X)
- 학습자가 "흠 이렇게 작동하는구나" 정도만
- 이후 섹션에서 점진 분해

```markdown
### 큰 그림 (인지 부하 낮게)

```bash
ssh -i ~/.ssh/key.pem ec2-user@1.2.3.4
```

이 명령으로 원격 서버를 *내 노트북 터미널*에서 조작 가능.

- 무엇을 하는지: ✓ 보임
- 왜 작동하는지: 다음 섹션
- 옵션 의미: 다음 섹션
- 함정: 후반 섹션
```

학습자는 *무엇을 하는지*만 흡수, 디테일 부담 X.

## 검증 grep 패턴

```bash
# 첫 섹션이 작동 예제인지 (코드 블록 vs 이론 문장)
FIRST_SECTION=$(awk '/^### /{n++; if(n>1) exit} n==1' "$FILE")
FIRST_CODE_BLOCK=$(echo "$FIRST_SECTION" | grep -c '^```')
FIRST_ABSTRACT=$(echo "$FIRST_SECTION" | grep -cE '정의|개념|이론|역사적')

# "큰 그림 / 시나리오 / 작동" 키워드 (강의 도입부)
TOP_DOWN_MARKERS=$(grep -cE '큰 그림|시나리오|작동하|결과부터|이 강의에서 만들' "$FILE")

# 분해 패턴
DECOMPOSITION_MARKERS=$(grep -cE '부분 분해|각 부분|쪼개|들여다보' "$FILE")
```

## 검증 기준

- ✅ 첫 섹션에 작동 예제 (코드 블록) 1+ — bottom-up 시작 X
- ✅ "큰 그림 / 시나리오 / 결과부터" 키워드 1+
- ✅ 분해 섹션 명시
- ❌ 첫 섹션이 *순수 이론* (정의/역사/개념만)
- ❌ "이 강의에서 학습한다" 식 학술 도입
