# review — pokeclip-scratch-volume-ownership (2026-11-12)

검증: npm run build · npm test 39/39, 단건 layout, 외부 링크 200, check-videos 통과. 독립 리뷰는 코디네이터가 따로 받음.

| 지시 대비 | 처리 |
|---|---|
| 실험 환경 | darwin/arm64 Docker Desktop(Engine 29.4.0), OrbStack 아님 |
| 실험 날짜 | E1–E8은 8/16, PR #62 머지 8/17 13:19 KST |
| moby 줄 | copyExistingContents 384–400행(+ create_unix.go 100–111 건너뛰기) |
| --chmod | E6: 디렉터리에 효과 없음, 디렉터리 모드는 COPY 기본 0755 |
| 0777 반례 | Codex 리뷰가 검사 구멍으로 짚음. 실제 이미지가 0777이었던 적 없음 — 그렇게 씀 |
| 운영 | 11/3부터 운영 상자(리눅스 arm64)가 이 Dockerfile 이미지로 돎. 리눅스 직접 측정은 없음 |
| PDF 34쪽 | 「내가 선택한 경계」 → AI 제안을 작성자가 채택, 날짜 문장 |
| 영상 포스터 | 휴대폰 webp 63.5KB → 점선 상자 · 점선 화살표를 실선으로, 휴대폰판 녹화기 이름표를 「UID 10002」로 줄여 통과 |

그림: 영상 VolumeFirstCopy(9초, 휴대폰판), Mermaid fig-image-ownership(TB 392px).
