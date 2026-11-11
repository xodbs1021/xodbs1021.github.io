# storyboard — pokeclip-go-remux-same-io-benchmark

## 영상 1 RemuxInitDrift (11.3초 반복, 휴대폰판)

주장: FFmpeg는 조각마다 떴다 사라지고 init 해시가 조각마다 다르며 파트 4→2, Go는 상주하며 파트 4→4·init 해시 하나. 해시 앞자리는 9/4(FFmpeg 3조각)·9/19(Go 150조각) 실제 값.

| 프레임 | 무엇 |
|---|---|
| 0–15 | 제목, 두 줄 이름, Go 상자(상주), ffmpeg 자리 점선 |
| 26·96·166 | 조각 1·2·3이 들어옴 → ffmpeg 상자가 뜸 → 산출(빨강 파트 2 / 청록 파트 4) → 해시 한 줄씩 → ffmpeg 상자 사라짐 |
| 250 | 「init 해시 3개」 / 「init 해시 1개」 |
| 330 | 포스터 |

## 그림 2 같은 범위 p50·p95(ECharts 가로 막대 두 계열, 실측) — 기존 matplotlib SVG 교체
