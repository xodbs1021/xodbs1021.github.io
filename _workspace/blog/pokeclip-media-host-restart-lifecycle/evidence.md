# evidence — pokeclip-media-host-restart-lifecycle (다시 쓰기, 2026-11-11)

유형: 트러블슈팅. 코드 근거 develop `825a3dfe`.

공개 링크 기준: `https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/<경로>#L<a>-L<b>`. systemd 소스는 태그 v252 커밋 `e8dc52766e1fdb4f8c09c3ab654d1270e1090c8d`.

## 역할

- 작성자: Media 상자의 기동 · 재기동 모델(기동자는 systemd 하나, 출력 연결은 mediamtx · nginx 둘)과 관리 API 비밀번호를 저장하지 않는 방식을 정함, 머지 승인.
- AI: 크래시 경로를 처음 짚은 것은 AI 보안 리뷰(정적 검토 · 처음 등급 MEDIUM, 「재현되면 HIGH」). 10/20 재현 실험 · 수정 커밋 `2abca393` · 반복 시험 · PR 본문도 AI.
- 쓰지 않음: 11/4 일, 운영에서의 강제 종료 시험(하지 않음).

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 재현 환경 = 개발자 Mac 의 OrbStack 위 `amazonlinux:2023` 컨테이너(systemd 252 가 PID 1 · 특권), docker 25.0.16, compose 5.5.0 aarch64. EC2 아님 | 팀 내부 시험 기록(비공개) 10/20, PR #311 본문 135·145 「탐침 상자(AL2023 · systemd 252 · bash 5.2)」 | 비공개 실측(환경은 공개 일부) |
| 10/20 06:54–08:28 KST, 갈래 A · Acg · Apl · Apl-i · B · B2 · Bs · C · D · D2 각 3회(Acg 는 1회 더) | 팀 내부 시험 기록(비공개) 10/20 | 비공개 실측 |
| 갈래 뜻: A = 주 프로세스(docker CLI)만 SIGKILL, Acg = 유닛 cgroup 전체 SIGKILL(`systemctl kill -s KILL`), Apl = compose 플러그인(주 프로세스의 자식)만 SIGKILL, Apl-i = Apl + 사이드카가 재시작하지 않는 판, B/B2 = down 실패 주입 + mediamtx 자리 종료 0/1, Bs = down 실패 + stop, C = 전원 차단 뒤 재부팅, D/D2 = dockerd kill · docker 재시작과 stop | 같은 기록 | 비공개 실측 |
| 재현된 것은 Acg · Apl(영구 실패)과 Apl-i(조용한 낡음). A · B · B2 · Bs · C · D · D2 는 재현 안 됨 | 같은 기록 | 비공개 실측 |
| A 가 회복된 이유: 남은 compose 플러그인이 systemd 의 SIGTERM 을 받아 컨테이너를 멈춤 → 주 프로세스 SIGKILL 시험은 거짓 음성 | `test/lib/unit_crash_cases.sh` L19–20 | 공개 |
| 고치기 전 ExecStopPost 는 렌더 파일 삭제만(`--cleanup-only`), up 에 `--force-recreate` 없음, bind 는 짧은 문법 | 수정 커밋 `2abca393`(10/20 10:25 KST, PR #311 안), `stop-media.sh` L29(`--cleanup-only` 는 유닛이 안 씀) | 공개 |
| 증상: 컨테이너 셋 생존 → 렌더 파일만 삭제 → 사이드카 on-failure 재시작 때 엔진이 bind 원본 자리에 디렉터리 생성(runc 「not a directory」) → 20초마다 「MEDIA START FAIL render api-pass-target」 · 「MEDIA STOP CLEANUP FAIL」 반복(Acg 첫 회 약 5분 · 14회 재시작) | 팀 내부 시험 기록(비공개) 10/20, `compose.yml.tmpl` L75–78 | 비공개 실측 + 공개 주석 |
| 그동안 mediamtx 자리 컨테이너(시험용 에코)는 지운 옛 렌더(가짜 CDN 비밀 값 v1)를 마운트한 채 실행, 헬스 200 | 같은 기록 | 비공개 실측 |
| 헬스 200 은 nginx 가 상류 호출 없이 내는 고정 응답 | 운영 `nginx/nginx.conf.tmpl` L181–190, 시험 compose 주석(nginx 헬스 경로 고정 200) | 공개 |
| 옛 비밀 = CDN 비밀(hlsCDNSecret). Apl-i · 운영자 손 복구에서는 관리 API 비밀번호 짝도 어긋남 | 팀 내부 시험 기록(비공개) 10/20, `start-media.sh` L82–86 | 비공개 실측 + 공개 주석 |
| 운영자 `systemctl restart` 로 안 풀림. stop → rmdir → start 하면 유닛은 active 지만 mediamtx 컨테이너는 같은 id(재생성 안 됨) | 팀 내부 시험 기록(비공개) 10/20 | 비공개 실측 |
| 종료 0(B)은 ExecStop 이 돌고(래퍼 줄 1 × 3), 종료 1(B2)은 안 돎(0 × 3) | 같은 기록(회차 로그 6개) | 비공개 실측 |
| systemd v252 코드: 실행 중 주 프로세스가 끝나면 `service_enter_running` → 결과가 성공이 아니면 `service_enter_signal`(SIGTERM → ExecStopPost), 성공이면 `service_enter_stop`(ExecStop 실행) | `src/core/service.c` L3598–3599, L2091–2092, L2105–2108, L2040–2052, L1998–2001 | 소스 대조 |
| systemd 252 문서는 「성공적으로 시작했으면 프로세스가 스스로 끝나거나 죽어도 stop 작업을 항상 수행」이라 적음 — 실패 결과에서는 코드와 다름 | [systemd.service(5) 252 ExecStop=](https://www.freedesktop.org/software/systemd/man/252/systemd.service.html#ExecStop=) | 공개(문서 · 코드 어긋남) |
| ExecStopPost 는 예기치 않은 종료에도 돎 · 사후 정리용 | 같은 문서 ExecStopPost= | 공개 |
| 유닛: 두 단계 정지 L44–55, 실패 경로 설명 L56–59, ExecStopPost L60, `SuccessExitStatus=130` L61, `Restart=always` · `RestartSec=20` L62–63, 재시도 한도 없음 L34 | `systemd/pokeclip-media.service` | 공개 |
| TERM 뒤 최대 30초 = 0.2초 × 150회 대기 | 유닛 L52–54 | 공개 |
| 바로 down 부터 하면 up 이 종료 1 → failed, 10번 중 9번 | 유닛 L45–46, PR #311 본문 80–83 | 공개(팀 실측 요약) |
| 시작 스크립트 TERM 트랩 130 | `start-media.sh` L751–757 | 공개 |
| CDN 비밀은 Secrets Manager 에서 읽음, 관리 API 비밀번호는 기동마다 /dev/urandom 32바이트로 생성 · 저장 안 함, tmpfs 렌더 0400 | `start-media.sh` L14–23, L61–63, L99, L126, L284–297, L306–312, L712–720 | 공개 |
| `create_host_path: false` | `compose.yml.tmpl` L155–160, L184–189, L260–272 | 공개 |
| mediamtx · nginx 는 `restart: "no"`, 사이드카 · 응답기 · janitor 는 `on-failure` | `compose.yml.tmpl` L59–65, L134, L168, L197, L292, L386 | 공개 |
| 시작 시 `--force-recreate` · `--remove-orphans` | `start-media.sh` L79–86, L768–770 | 공개 |
| 정지: `down` 인자 고정 · 볼륨 안 지움, down 실패면 프로젝트 라벨로 잔여 컨테이너 제거 | `stop-media.sh` L18–24, L139, L194–212, L233–238 | 공개 |
| bind 원본이 없으면 짧은 문법은 디렉터리를 만들고, 긴 문법 `create_host_path: false` 로 막을 수 있음(기본 true) | [Compose 문서 services volumes](https://docs.docker.com/reference/compose-file/services/#volumes) | 공개 |
| 수정 뒤 같은 갈래(Apl · Acg · Apl-i · down 실패 주입 · 운영자 stop/start) 각 3/3 회복 | 팀 내부 시험 기록(비공개) 10/20 | 비공개 실측 |
| 10/22 유닛 재기동 시험 19사례 × 3 통과 → 같은 날 밤 최종 트리 21사례 × 3 통과 | PR #311 본문 145 「유닛 재기동 시험 3/3(21건)」, 팀 내부 시험 기록(비공개) 10/22 | 공개 + 비공개 실측 |
| PR #311 머지 2026-10-23 00:38 KST(UTC 10-22 15:38) | `gh pr view 311` | 공개 |
| PR #322(10/23 07:13 KST 머지)는 사례 21 을 넓힘(새로 만든 것 아님) | PR #322 본문 16 · 34 | 공개 |
| 지금 시험은 24사례(크래시 15–17) | `test/unit_restart_test.sh` L6–9, L749–795 | 공개 |
| 운영 설치는 이 유닛 파일을 그대로 씀 | `infra/terraform/modules/media_host/user_data.tf` L93–97 | 공개 |
| 11/3 운영 상자 첫 기동: CDN 비밀 넣기 전 「activating · 재시작 7 · BLOCKED 8」(실패로 굳지 않음) → 비밀 입력 · 재시작 뒤 MEDIA START OK, 약 5분 감시 동안 같은 MAINPID · 종료 줄 0, 대상 그룹 넷 healthy | 팀 내부 기록(비공개) 11/3 | 비공개 실측 |
| 운영에서 강제 종료 시험은 하지 않음 | 11/3 기록에 해당 걸음 없음 | 미검증(기록 부재) |
| 정지 서술이 이미 공개된 상태 보존 배치 글과 같음(TERM 뒤 최대 30초 · down · 볼륨 남김) | `content/posts/0-to-1/pokeclip-stateful-media-deployment.md` 15·53행 | 정본 글 |
| 실제 운영에서 플러그인 · cgroup 단위 SIGKILL 빈도, systemd 252 밖 판의 동작 | 확인 기록 없음 | 미검증 |
