# Worked Examples → Faded → 독립 풀이 가이드

## 원리

Sweller & Cooper (1985) — "Worked Example Effect". 입문 학습자는 *문제 풀이*보다 *완성된 풀이 학습*이 5~10배 효율. 인용 20K+.

> 핵심: 입문자에게 빈 백지로 문제 풀라면 작업 기억이 *문제 자체* 처리에 다 쓰임 (외재적 부하 폭주). 완성 풀이 보고 *해법 스키마*를 추출하는 게 훨씬 빠른 학습.

## 3단계 시퀀스

```
완성 예제 (Worked) → Faded (점진 빈칸) → 독립 풀이
   학습자 인지 부하         중간                높음
```

### 1단계: Worked Example (완성)

**정의**: 모든 단계 풀려있고 모든 옵션/주석 명시.

**대상**: 새 도구/명령 *첫 등장*. 학습자 *아무것도 모름* 가정.

**작성 패턴**:

```bash
# Worked Example — 모든 옵션 풀이
ssh -i ~/.ssh/key.pem -p 22 -o StrictHostKeyChecking=ask ec2-user@1.2.3.4

# [설명] 각 옵션 의미
# -i: 키 파일 경로
# -p: 포트 번호 (기본 22, 명시 안 해도 OK)
# -o StrictHostKeyChecking=ask: 첫 접속 시 fingerprint 확인 여부
# ec2-user@1.2.3.4: 사용자명@서버 IP
```

학습자 작업 기억: 명령 *전체*가 풀려있어 *해법 스키마만* 추출하면 됨.

### 2단계: Faded Example (점진 빈칸)

**정의**: 일부만 풀이, 일부는 학습자가 *추론* 강제.

**대상**: Worked 1~2개 본 후. 학습자가 *부분 회상* 가능.

**작성 패턴 — 빈칸 유형**:

#### 옵션 의미 추론

```bash
# 옵션 의미 자기 추론
ssh -i <키 경로> ec2-user@<서버 IP>
# -i 뜻은? (직전 강의에서 다룸)
# 포트를 22가 아닌 2222로 바꾸려면 어느 옵션 추가?
```

#### 명령 일부 빈칸

```bash
# 빈칸 채우기
ssh -i ~/.ssh/____.pem ec2-user@1.2.3.4
# (키 이름은 자기 환경에 맞게)
```

#### 시나리오 → 명령 부분 작성

```markdown
**Faded**: 다음 명령에서 빈 부분을 채워보자.

상황: 키는 `~/.ssh/pokeclip.pem`, 서버는 `13.124.x.x`, 사용자는 `ubuntu`

```bash
ssh -i _____________ _____________@_____________
```

답: `~/.ssh/pokeclip.pem` / `ubuntu` / `13.124.x.x`
```

### 3단계: 독립 풀이

**정의**: 시나리오만, 학습자가 명령 *전체* 구성.

**대상**: Worked + Faded 본 후. 학습자가 *완전 회상* 시도.

**작성 패턴**:

```markdown
**독립 풀이**: 다음 시나리오에서 명령을 구성해보자.

상황: 
- 새 EC2 인스턴스 (Public IP: 3.34.x.x)
- 키 파일: `~/.ssh/staging.pem`
- 인스턴스 AMI: Amazon Linux 2

**해보자**:
```bash
# (학습자가 작성)
```

**확인 (덮고 풀어본 후)**:
```bash
ssh -i ~/.ssh/staging.pem ec2-user@3.34.x.x
```

이유:
- Amazon Linux 2의 기본 사용자는 `ec2-user`
- 키 파일 `-i` 옵션
- 포트 22는 기본이라 생략
```

## 언제 적용해야 하는가

### 트랙별 적용 강도

| 트랙 분류 | Worked → Faded → 독립 권장 빈도 |
|---|---|
| **A (도구 입문)** | 새 명령 첫 등장마다 (강의당 1~2 시퀀스) |
| **B (Python)** | 새 문법/패턴 첫 등장마다 |
| **C (AI 입문)** | 새 PyTorch 패턴마다 |
| **D (AI 깊이)** | 새 모델/학습 루프마다 |
| **E (백엔드)** | 새 API/큐 패턴마다 |
| **F (DB)** | 새 SQL 패턴마다 |
| **G (AWS)** | 새 서비스 첫 사용마다 |
| **H (DevOps)** | Dockerfile / CI 패턴마다 |
| **I/J/K** | 새 알고리즘 / 시스템 패턴마다 |
| **L (보안)** | 새 인증 패턴마다 |
| **N/O/P/Q** | 새 자료구조/알고리즘마다 (Q는 강제) |

### 강의 내 빈도

| 강의 길이 | Worked-Faded-독립 시퀀스 수 |
|---|---|
| 짧음 (~300줄) | 1개 |
| 중간 (300~500줄) | 2개 |
| 김 (500+ 줄) | 3+개 |

## 안티패턴 (피해야 할 것)

### ❌ 처음부터 독립 풀이

```markdown
**해보자**: SSH로 EC2 접속해봐.
```

학습자: 명령 구조 모름 → 작업 기억 폭주 → 좌절 → 포기.

### ❌ Worked만 무한 반복

```markdown
완성 예제 1 / 완성 예제 2 / 완성 예제 3 / ...
```

학습자: 수동 학습만. 회상 능력 안 길러짐. Germane load 부재.

### ❌ Faded 점프 (Worked 없이)

```markdown
**Faded**: 빈칸 채워봐.
```

선행 Worked 없으면 학습자가 *맞춰볼 기준*이 없음.

## 검증 grep 패턴

```bash
# Worked Example 마커
WORKED_MARKERS=$(grep -cE 'Worked|완성 예제|모든 옵션 풀이' "$FILE")

# Faded 마커
FADED_MARKERS=$(grep -cE 'Faded|빈칸|추론|빈 부분' "$FILE")

# 독립 풀이 마커
INDEPENDENT_MARKERS=$(grep -cE '독립 풀이|해보자|구성해보자' "$FILE")

# 시퀀스 완성도 (3단계 모두 있어야 좋음)
SEQUENCE_COMPLETE=$(echo "$WORKED_MARKERS $FADED_MARKERS $INDEPENDENT_MARKERS" | awk '{print ($1>0 && $2>0 && $3>0) ? 1 : 0}')

# 코드 블록당 [설명] 라인 비율
CODE_BLOCKS=$(grep -c '^```' "$FILE")
EXPLANATION_LINES=$(grep -cE '\[설명\]|# 설명' "$FILE")
```

## 검증 기준

- ✅ 새 도구/명령 첫 등장 강의: Worked + Faded + 독립 시퀀스 1+ 완성
- ✅ Worked Example 코드 블록에 [설명] / 한국어 주석 풍부
- ✅ Faded 후 *답* 명시
- ✅ 독립 풀이 후 *확인 답* 명시
- ❌ 처음부터 독립 풀이로 던지기
