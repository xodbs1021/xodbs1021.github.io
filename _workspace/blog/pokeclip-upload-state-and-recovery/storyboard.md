# storyboard — pokeclip-upload-state-and-recovery

## 영상 1 UploadCrashResume (11초, 반복, 휴대폰판)

업로더 · S3 · DB 장부 상자 셋. 장부는 처음부터 회색 pending.
1. 0.7–2초: 업로더 → S3 점, S3 「객체 있음」.
2. 2.4초: 업로더 빨간 점선 「프로세스 종료」. 장부는 pending 그대로(어긋남을 2초 보여 줌).
3. 4.4초: 「재기동」. 4.9–6초: 장부 → 업로더 회색 점 「스위퍼가 pending을 집음」.
4. 6.2–7.3초: 「같은 키로 다시 PUT」. 7.5–8.5초: 청록 점 → 장부 「크기 같을 때만 CAS」, 장부 「uploaded」.
끝 프레임(포스터 320): S3 객체 있음 · 장부 uploaded · 두 흐름 이름표. playback-producer 글의 ThreeAxisUpload(세 축)와 겹치지 않게 ② 축 하나만.

## 정적 그림 — 상태도(Mermaid flowchart TB, 재구성)
pending · uploaded · failed, 전이 조건.
