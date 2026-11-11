# storyboard — media-ci-path-filter-required-check-tradeoff

## 영상 1 `ProtectionFirstOrder` (11초 반복, 휴대폰판 있음)
- 근거: PR #163 본문의 적용 순서, 공개 결정 기록 「반대로 하면 사라진 media-gate를 보호가 기다려 전 PR이 Pending」, 병합 직후 임시 PR #164(media-ci 0건) · #165(check 3분 8초 성공).
- 위 줄 「워크플로부터 바꾸면」 + 빨간 「보호: media-gate 필수 그대로」 → 웹 PR(워크플로 생략) · 미디어 PR(check만, media-gate 없음) → 둘 다 빨간 「Pending」.
- 아래 줄 「보호를 먼저 풀면」 + 청록 「보호: media-gate 해제」 → 웹 PR 「media-ci 체크 0개」, 미디어 PR 「check 1개 성공」.
- 끝 프레임(포스터, 320): 두 줄 모두 결과가 붙은 상태.

## 정적 그림 `fig-media-ci-before-after` (Mermaid, 재구성)
- 변경 전(changes → check/건너뜀 → media-gate → 필수 체크) 위, 변경 후(paths 필터 → check / media-ci 체크 0개) 아래. 폭 392px.
