### Q. 자료구조/알고리즘 (5 시리즈) — 면접용 깊이

**갯수 근거**: 코테는 사용자가 백준 별도 학습. 강의는 면접 단골 깊이만. 8에서 5로 슬림 (스택/큐 → 배열에 흡수, 해시+트리+힙 통합, 정렬+복잡도 통합, DP+그리디+분할정복 통합).

#### Q-1: 배열 + 링크드 리스트 + 스택 + 큐
- hook: 가장 기본. 응용 많음
- 핵심 항목: 배열 (정적/동적) / 시간 복잡도 / 메모리 연속성 / Python list 내부 / 링크드 리스트 (단일/이중/원형) / Iterator / 캐시 친화도 / 스택 (LIFO) / 큐 (FIFO) / 덱 / 우선순위 큐 / 원형 큐 / Python (list/deque) / 응용 (괄호/함수 호출/BFS/DFS)
- 다루지 않는 것: 힙 (Q-2)
- PokéClip 적용: 자료구조 선택 / 큐 직관
- 면접 답변 주제: "배열 vs 링크드 리스트 / 스택 응용"

#### Q-2: 해시 + 트리 + 힙
- hook: 가장 많이 쓰는 자료구조 통합
- 핵심 항목: 해시 함수 / 충돌 / Chaining vs Open addressing / Linear/Quadratic/Double hashing / 로드 팩터 / Rehashing / Python dict 내부 / 해시 충돌 공격 / 이진 트리 / BST / 균형 트리 (AVL/Red-Black) / B-tree (DB 인덱스) / 순회 (전위/중위/후위/레벨) / Trie / 힙 (Max/Min) / heapify / Python heapq / Top-K
- 다루지 않는 것: 그래프 (Q-3)
- PokéClip 적용: dict 직관 / DB 인덱스 직관 / Top-K
- 면접 답변 주제: "해시 충돌 / dict 내부 / B-tree DB / 힙 응용"

#### Q-3: 그래프 + 탐색
- hook: 그래프 못 풀면 시니어 어려움
- 핵심 항목: 표현 (인접 행렬/리스트) / 방향/가중치 / BFS / DFS / 위상 정렬 / 사이클 감지 / 연결 요소 / 다익스트라 / 벨만-포드 / Floyd-Warshall / MST (Kruskal/Prim)
- 다루지 않는 것: 네트워크 플로우
- PokéClip 적용: 의존 그래프 직관
- 면접 답변 주제: "BFS vs DFS"

#### Q-4: 정렬 + 복잡도 분석
- hook: 면접 단골. Python sort 내부도 자주
- 핵심 항목: Bubble / Selection / Insertion / Merge / Quick / Heap / Radix / Bucket / Counting / 복잡도 / 안정성 / In-place / Python Timsort / 비교 vs 비비교 / Big-O / Big-Theta / Big-Omega / 시간 복잡도 / 공간 복잡도 / Amortized / 점화식 분석 / 마스터 정리
- 다루지 않는 것: 외부 정렬
- PokéClip 적용: 알고리즘 선택 기준
- 면접 답변 주제: "Quick vs Merge / Timsort / Big-O"

#### Q-5: DP + 그리디 + 분할정복
- hook: 면접 가장 어려운 영역
- 핵심 항목: DP 개념 / Memoization vs Tabulation / 점화식 / 1D/2D DP / 비트마스킹 DP / 그리디 정의 / 최적 부분 구조 / 그리디 증명 / 대표 그리디 (활동/허프만/MST) / 분할정복 / 재귀 / 마스터 정리 / 대표 분할정복 (병합 정렬/빠른 선택)
- 다루지 않는 것: 코테 (사용자 별도 학습)
- PokéClip 적용: 알고리즘 직관
- 면접 답변 주제: "DP 패턴 / 그리디 정답 확인"
