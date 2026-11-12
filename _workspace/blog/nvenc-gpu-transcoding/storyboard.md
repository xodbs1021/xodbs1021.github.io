# nvenc-gpu-transcoding — 콘티

## 영상 1 GpuMemoryPath (반복 11초, 330프레임, 휴대폰판 있음, 개념도)

- 무엇이: 위 GPU 영역 안의 NVDEC · GPU 메모리 · scale_cuda · NVENC 상자, 아래(휴대폰판은 오른쪽) 시스템 메모리 상자. 프레임 하나를 점으로.
- 0–5.3초: 위에 `-hwaccel_output_format cuda`(청록). 점이 NVDEC → GPU 메모리 → scale_cuda → NVENC로 GPU 안에서만 이동. 끝에 「프레임이 GPU 메모리 안에서만 이동」.
- 5.5–11초: 위에 `-hwaccel_output_format 없음`(위험색). GPU 메모리 · scale_cuda 상자는 회색 점선. 점이 NVDEC → 시스템 메모리(CPU 스케일) → NVENC로 점선 경로, 「GPU → CPU」 「CPU → GPU」 이름표. 끝에 「프레임마다 GPU ↔ 시스템 메모리 복사」.
- 포스터(프레임 300): 둘째 갈래 끝 — 점선 왕복 경로와 두 이름표, 아래 문장.
- 수치 없음(복사 시간 · 대역폭은 재지 않음).
