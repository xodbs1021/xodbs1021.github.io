[아티클 스타일 검토]

대상 파일: draft.md
주제: Docker 멀티스테이지 빌드로 Node.js 이미지 크기 최적화 (1.07 GB → 119 MB)

---

체크리스트:

✅ 1. 도입부 훅: 통과 — 배포 지연 및 보안 attack surface 확대라는 현실적 문제를 제기하며 시작. "릴리즈 사이클 전체가 늘어진다", "취약한 바이너리를 프로덕션에 실려 보내는 셈"이라는 구체적 상황이 독자 공감 유도.

✅ 2. 저자 포지셔닝: 통과 — "실제로 Express + TypeScript 기반 API 서버를 컨테이너화했을 때 … 최종 이미지가 1.07 GB까지 불어난다. 멀티스테이지 빌드를 적용한 뒤에는 119 MB로 줄었다"는 직접 측정·구현 맥락이 도입부에 명시됨.

✅ 3. 구조 흐름: 통과 — 문제 원인 분석(왜 1 GB가 되는가) → 환경/스택 명시 → Before Dockerfile + 측정 결과 → After Dockerfile + 측정 결과 → 수치 비교표 → 핵심 포인트 설명 → 트레이드오프 → 결론 순서로, 개념→셋업→결과의 점진적 깊이가 명확하게 구성됨.

✅ 4. 결론 회응: 통과 — 결론 첫 문장에서 "1.07 GB → 119 MB (89% 감소)"라는 도입부 제기 질문에 직접 수치로 답하며, 세 가지 핵심 요인을 정리. 마지막 문단은 "언제/누가 써야 하는지"도 다룸.

✅ 5. 구체적 수치: 통과 — "빠르다/효율적이다" 같은 추상 표현 없이 전 구간에 측정값 포함. 이미지 크기 1.07 GB / 119 MB, 베이스 이미지 350 MB → 51 MB, node_modules 620 MB → 58 MB, Trivy 취약점 147개 → 12개 (HIGH 23개 → 1개), 감소율 -89% 등. 측정 조건(Docker 25.0.3, `docker image ls`, Trivy `--severity HIGH,CRITICAL`)도 명시됨.

✅ 6. 코드 완성도: 통과 — Before/After Dockerfile 모두 실행 가능한 완전한 형태로 제공. 핵심 명령(`npm ci --include=dev`, `npm ci --omit=dev`, `npm cache clean --force`, `--chown=node:node`)에 한 줄 주석 포함. 레이어 캐시 순서(`COPY package*.json` 먼저), `USER node` 보안 설정도 코드 안에 반영됨.

✅ 7. 출처 링크: 통과 — 본문 내 및 참고 자료 섹션에 총 4개 링크 확인.
  - Docker 공식 멀티스테이지 빌드 가이드: https://docs.docker.com/build/building/multi-stage/
  - Docker Hub node 이미지 페이지: https://hub.docker.com/_/node
  - Google Distroless GitHub: https://github.com/GoogleContainerTools/distroless (본문 + 참고)
  - Trivy 공식 문서: https://aquasecurity.github.io/trivy/ (본문 + 참고)

---

통과: 7/7
판정: 발행 가능 (7/7 전항 통과)

---

추가 코멘트 (미통과 없음, 개선 제안):

- 트레이드오프 섹션의 "멀티플랫폼 빌드" 항목은 이미지 크기와 직접 관련이 없어 독자 흐름을 약간 분산시킬 수 있다. 주제 집중도를 높이려면 해당 항목을 간결하게 줄이거나 각주 형태로 옮기는 것도 고려할 만하다.
- Before/After 비교표에 "배포 시간 차이"(예: CI push 속도) 수치가 있으면 5번 기준이 더욱 강화된다. 현재는 이미지 크기와 취약점 수치만 있으므로, 실제 CI 환경의 push/pull 시간 측정값이 있다면 추가하면 좋다.
