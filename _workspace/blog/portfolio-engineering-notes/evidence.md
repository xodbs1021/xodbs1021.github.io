# 근거 메모 — 개발 기록 모음 · 시리즈 갱신 (2026-11-26)

| 주장 | 원본 | 확인 날짜 | 구분 |
|---|---|---|---|
| 11월 1–20일 공개 프로젝트·오픈소스 글 19편 (PokeClip 16 · MediaMTX 1 · SoftBank 본선 2) | `git log --diff-filter=A -- content/posts` + 각 글 frontmatter(draft=false) | 2026-11-25 | 실측(저장소) |
| 모음 글 고유 /posts/ 링크 58 → 77 | 편집 스크립트 집계(`/tmp/edit-notes.mjs`), 모든 링크 파일 존재 확인 | 2026-11-26 | 실측 |
| MediaMTX 머지 7건: #6154 #6155 #6182 #6205 #6427 #6379 #6259 | `gh api repos/bluenviron/mediamtx/pulls/N` merged=true; #6259 merged_at 2026-11-17T21:49Z(KST 11-18) | 2026-11-25 | 실측(GitHub API) |
| 릴리스 6건: v1.21.0(3) · v1.21.1(1) · v1.21.4(#6427 #6379, 11-15) ; latest release = v1.21.4 → #6259 미릴리스 | `gh api releases/latest`, `releases/tags/v1.21.4` body에 #6379 #6427 포함 | 2026-11-25 | 실측(GitHub API) |
| #6306 · #6380 열림, #6206→#6326 · #6261→#6417 재구현으로 닫힘 | pulls API state/merged + #6326 #6417 제목에 (#6206)/(#6261) 명시 | 2026-11-25 | 실측(GitHub API) |
| Secrets Manager 전환 완료(개발 10-06 읽기 전환, 10-22 사본 삭제, 운영은 처음부터) | `content/posts/0-to-1/pokeclip-secret-storage-migration-plan.md` 첫 문단 | 2026-11-25 | 문헌값(공개 글) |
| 11월 글 요약 수치(138KB, 276→11kbps, 35분, 17초, 1.29초, 907,200행, 12,685→21, 16→0, 7.66초, 21ms·48초, 143회 등) | 각 글 frontmatter description·본문 원문과 대조 | 2026-11-25 | 문헌값(공개 글) |
| 전환 23초·21초, 쓰기 시도 2,582건 실패 0 | aws-gcp-bidirectional-cutover-experiment.md 12행, 결과 표 89·99행 | 2026-11-27 | 문헌값(공개 글, 원자료 비공개) |
| 되감기 글 순서 url-split → dvr-cookie → sidecar → gzip | sidecar 글 14행 「1편 … 1편 둘째 글」, gzip 글 30행 「2편」 | 2026-11-25 | 실측(본문) |
| rewind-missing-segment · recording-defect · round-vod · srt-latency는 PokeClip 글 | 각 글 둘째 문단 「저는 PokeClip 팀에서 …」 | 2026-11-25 | 실측(본문) |
| 멀티 클라우드 2편은 Shakedown(예선)과 별개인 본선 작업 | 글 본문 「SoftBank Hackathon 2026 본선 팀」, Shakedown 글 「예선 산출물」 | 2026-11-25 | 실측(본문) |
| 소제목 삽입 시 기준선 위치 삽입 필요 | `tests/blog-quality.test.mjs` 38행 주석, `src/lib/posts.mjs` 89행 | 2026-11-25 | 실측(코드) |
