---
name: echarts-curator
description: 블로그 글 작성 직후 ECharts 활용도를 검수하고, 표/단락으로 표현된 수치 비교를 ECharts로 변환할 후보를 자동 추천. 사용자 룰 "수치 비교는 무조건 차트" 강제.
---

# ECharts 큐레이터

블로그 글에서 ECharts 활용을 강제하는 스킬. 표만 잔뜩 박는 습관을 차단.

## 트리거

다음 상황에서 호출:
- 블로그 글 초안 작성 직후 (push 전)
- 사용자가 "ECharts 검수", "차트 추천", "표를 차트로 바꿀 곳" 요청
- 글 안에 수치 비교 표가 여러 개 있을 때

## 호출 흐름

1. **글 마크다운 읽기** (Read 도구)
2. **echarts-advisor 에이전트 호출**
   - Agent 도구로 `subagent_type: echarts-advisor`
   - 글 경로를 prompt로 전달
3. **에이전트가 ECharts 추천 N개 반환**
4. **사용자에게 추천 표시**:
   - 어느 섹션의 어떤 표/단락을 차트로 바꿀지
   - 각각 ECharts shortcode 초안
5. **사용자 승인 시 글에 적용**

## 절대 원칙

**"숫자 vs 숫자"가 비교 대상이면 무조건 ECharts**:
- 비트레이트/지연/시청자수/비용/점수 같은 수치 비교 표 → 차트
- 한 글에 ECharts 최소 2~5개가 표준

**예외 (표가 맞는 경우)**:
- 호환성 매트릭스 (✅/❌)
- 옵션 의미 설명 (옵션명 → 설명 문자열)
- 시나리오별 권장 (이름 → 이름)
- 스펙 비교 (확장자/포맷/프로토콜)

## ECharts 시각화 선택 가이드

| 데이터 형태 | 차트 종류 |
|---|---|
| 카테고리별 단일 수치 | 가로/세로 `bar` |
| 매우 큰 범위 차이 (0.1x~100x) | `bar` + `log scale` |
| 시간/순서 vs 수치 | `line` |
| 두 축 트레이드오프 | dual-axis `line+line` |
| 비율/분포 | `pie` / `donut` |
| 다차원 비교 | `radar` |
| 두 수치 상관관계 | `scatter` |
| 흐름 비율 | `sankey` |
| 시간×지역 분포 | `heatmap` |

## 사용자 표현

"echart 적극적으로 활용해서 글 쓰라니까 시발아?"
→ 표만 잔뜩 박지 말고 수치 비교는 무조건 ECharts.

## 사용자 메모리 정합

- `feedback_echarts_usage.md` (이 룰의 원본)
- `feedback_streaming_lesson_style.md` — 실무 위주, 수학 제외
- `feedback_lesson_output.md` — 강의 파일은 cat만 (Read 금지)
