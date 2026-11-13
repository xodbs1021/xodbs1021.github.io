# storyboard — OfflineRecordingGate (12초, 360프레임, 반복, 휴대폰판 있음)

주장: true는 오프라인 대체 화면까지 녹화하고, false는 publisher · static source · 오프라인 재로드 모두 온라인 구간만 녹화한다. 원 PR 커밋의 두 빈틈을 빨강으로 겹친다.

- 0–0.5초: 위에 「오프라인 · 온라인 · 오프라인」, 네 줄(true (기본값) / false · publisher / false · static source / false · 오프라인 중 reload). 줄마다 얇은 상태 띠(온라인 구간 청록)와 굵은 녹화 막대 자리(점선).
- 1–9초: 재생점이 왼쪽에서 오른쪽으로. true 줄은 검정 막대가 계속, false 세 줄은 온라인 구간에서만 청록 막대.
- reload 줄: 16% 지점에 「reload」, 그때 빨강 「원 PR: 녹화 시작」. 재로드 뒤 온라인 구간은 시험하지 않았으므로 막대 대신 회색 점선 「시험 안 함」. static source 줄: 온라인 시작 때 빨강 「원 PR: 녹화 없음」.
- 9–12초: 정지(포스터).
휴대폰판: 제목을 띠 위 줄로, 글자 48px 이상.
