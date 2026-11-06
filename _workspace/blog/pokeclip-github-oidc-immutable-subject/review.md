# review — pokeclip-github-oidc-immutable-subject

상태: **초안 (draft: true)**. 발행 지시 없음 — publisher 단계 미진행. 2026-11-07.

## 하네스 경로

| 단계 | 수행 | 결과 |
|---|---|---|
| 근거 수집 | 메인 세션: 볼트 index → PokeClip index → HTTPS·엣지 `_색인` → raw 90·92·93, 공식 문서 3건 WebFetch | `evidence.md` |
| 초안 | 메인 세션 (post-drafter 지침 + article-writer 구성) | `draft.md` r1 |
| 시각화 판단 | 메인 세션 (visual-planner 기준) | 아래 표 |
| 사실·역할 검토 | **독립 서브에이전트** (blog-quality-reviewer 역할 파일 지시, 원자료 대조 + WebFetch + `gh pr view`) | 수정 필요 → 반영 |
| 문체 검토 | **독립 서브에이전트** (article-style-checker 역할 파일 지시) | 5/7 통과 → 반영 |
| 빌드·테스트·화면 | 메인 세션, 격리 임시 워크트리(초안 사본만 draft:false, 커밋·push 없음) | 아래 |

image-manager·echarts-advisor는 호출하지 않음(필요 없음 — 아래 시각화 판단).

## 사실·역할 검토 (blog-quality-reviewer) — 판정 "수정 필요" → r2에서 전부 반영

수정 필수 4건:
1. "최대 1시간짜리 임시 자격"을 STS 일반 규칙처럼 씀 → 1시간은 이 역할의 MaxSessionDuration 설정(원자료 92 progress 16:46). "역할에 정한 최대 세션 안(이 역할은 1시간)"으로 수정.
2. "토큰의 sub 형식이 바뀌었는데" → 8-19 첫 시도부터 immutable 꼴(341). "처음부터 … 오고 있었는데"로 수정.
3. "두 달 동안 원인을 못 찾은 이유는 …" 추론을 사실처럼 씀 → "8월 주석의 '일치'는 예상 값끼리의 대조였다"로 축소.
4. environment 생성·배포 브랜치 제한을 kty가 한 것처럼 읽힘 → "AI가 만들고 제한했다", 워크플로 끄기는 "AI 추천대로"로 수정.

개선 권장 6건 반영: 신뢰 조건·순서는 "AI 제안을 검토해 승인"(결정 79 오케스트레이터 판단, 84차) · 머리 주석 인용을 "요약하면"으로 · 운영 측 답 "~로 보인다" · 결과 읽기 권한이 리전 단위였다는 점 명시 · "10월 19일 확인 기준 키 0개, IAM 사용자는 남김" · prod는 "좁힐 계획".

미검증 1건: 운영 측 답을 실제로 받은 날짜(kty가 10-17 12:35에 공유한 사실만 확인) → 본문에서 날짜를 빼고 "돌아온 답"으로 서술.

검토자가 확인한 것: 수치 전부(48·1초·9분33초·882·24·3번·3600·60분·14:21:24Z·20개 상한), 역할(343·411·427·440 kty 실행, 449 AI 선실행), PR 279·280·281 MERGED·base develop·merge commit 일치·저장소 public, 외부 문서 3건 내용 일치, 비밀 노출 0(계정 번호·ARN·인스턴스·사설 IP·Jira·팀원 이름), frontmatter 계약.

## 문체 검토 (article-style-checker) — 5/7 → 반영

- 흐름: sub의 ref/environment 꼴을 개념 절에 미리 설명 · 노출 창 대응(워크플로 끄기)을 1단계 결과 앞으로 이동 · bash readonly 경위 축약 · 추가 정리 두 가지를 글머리표로.
- 출처·시각화: AWS 보호 규칙 권고 문장에 링크 추가 · 형식 비교 표와 표 1의 중복 해소(표 1은 "아래 표"로 넘김) · 세 방법 표에 선택 행 표시 · 흐름도 중복·모바일 협소 → 표로 대체(아래).
- 반영 안 함: categories `0-to-1` vs `projects` — 정책상 새 글은 `projects`. 시리즈 글 끝의 "전체 기술 기록으로 돌아가기" 링크는 기존 글 본문 관례라 publisher 때 판단.

## 시각화 판단 (visual-planner)

| 위치 | 독자가 얻는 것 | 표현 | 근거 |
|---|---|---|---|
| OIDC 개념 | 토큰이 어디서 무엇과 비교되는가 | Mermaid 시퀀스 | 문헌(공식 문서) |
| 원인 조사 | 네 곳을 본 결과, 마지막 줄의 원인 | 표 | 실측(읽기) |
| immutable 형식 | 두 sub 문자열의 정확한 차이 | 표 | 실측 + 문헌 |
| 신뢰 범위 좁히기 | 세 선택지의 범위·주의점 | 표 | 기록 |
| 두 걸음 전환 | 단계별 신뢰 조건·워크플로 상태·확인 | 표 (r1 Mermaid 흐름도 → r3 교체) | 실측 |

ECharts 없음: 비교·추세·분포할 수치가 없다(48·882는 단일 사실). 이미지 없음: 물리·시각 차이가 없고 장식 이미지는 불필요.

## 빌드·테스트·화면 검수

환경: `/tmp/blog-oidc-layout-check` (HEAD 22710fc detached 워크트리, node_modules 심볼릭 링크). 초안 사본만 `content/posts/projects/`에 draft:false, 임시 사본에만 `data/legacy-heading-ids.json` 등록. 커밋·push 없음.

| 회차 | 결과 |
|---|---|
| r1 빌드 | **실패** — 태그 `CI/CD`의 `/`가 `/tags/ci/cd/` 라우트를 깨뜨림 → 기존 태그 `CI`·`IAM`으로 교체 |
| r1 테스트 | 23/24 — 제목 앵커 기준선에 새 글 없음(발행 때 등록 항목) → 임시 사본에만 등록 후 24/24 |
| r1 layout | 자동 0 failures. **PNG 직접 확인에서 2건 발견**: 시퀀스 도표가 1440px에서도 4번째 참여자 잘림(내부 스크롤 필요) · 흐름도 한국어 음절 중간 줄바꿈("성/공", "워/크플로") → 참여자 3개 + Note, 흐름도는 표로 |
| r3 (최종) | build OK · `npm test` 24/24 · `LAYOUT_PATH=pokeclip-github-oidc-immutable-subject npm run test:layout` → routes 1, pageChecks 4(320·390·768·1440), visuals 3, failures 0 · 별도 스크립트로 표 4개를 320·1440px 캡처, 페이지 가로 넘침 0 |

직접 본 PNG(작업 폴더 `layout-evidence/`에 보관): 시퀀스 1440 light(전체 보임) · 시퀀스 390 dark·light 첫 화면과 `-end`(내부 스크롤로 끝까지 읽힘) · 표 320/1440.

검사 범위: 이 글 한 경로만(국소 변경). 공통 CSS·컴포넌트는 바꾸지 않았으므로 전체 경로 검사는 하지 않음.

## 남은 문제

1. **[사이트 공통 · 이 글 밖] 320px 표 셀의 한국어 음절 중간 줄바꿈.** `.prose{overflow-wrap:anywhere}`에 표 셀 `word-break:keep-all`이 없음(`src/styles/global.css`). 예: "IAM OIDC 공급/자", "역할 … 신/뢰 정책". 표가 있는 기존 글 전체에 해당할 가능성이 높음 — 이 글은 행 이름을 줄여 완화만 했다. 공통 CSS 수정은 전 경로 layout 검사가 필요한 별도 작업. 근거 PNG `layout-evidence/table-320-sitewide-keepall.png`.
2. 다크 모드·200% 확대·키보드 포커스는 검사기의 Mermaid 캡처(390 dark) 외에 따로 보지 않았다. 인터랙션 없음.
3. 외부 폰트 실패 상태는 확인하지 않음.

## 발행 시 publisher가 할 일

- `content/posts/projects/pokeclip-github-oidc-immutable-subject.md`로 복사, `draft: false`.
- `data/legacy-heading-ids.json`에 제목 앵커 10개 등록, 조회수 허용 slug 목록(`data/post-slugs.json`, #12 선례) 확인.
- 전체 `npm run build && npm test && npm run test:layout` 후 배포, `LAYOUT_URL=https://taeyun.blog LAYOUT_PATH=pokeclip-github-oidc-immutable-subject npm run test:layout`로 공개본 확인.
- 공개 URL 예정: `https://taeyun.blog/posts/projects/pokeclip-github-oidc-immutable-subject/`
