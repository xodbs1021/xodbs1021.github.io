# evidence — pokeclip-scratch-volume-ownership (다시 쓰기, 2026-11-11)

유형: 의사결정. 코드 근거 develop `825a3dfe`.

링크 기준: 코드 = `https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/<path>#L<a>-L<b>`,
moby = `https://github.com/moby/moby/blob/23ea0fa6461ec7455486441ae3a52b1235cdbec0/<path>#L<a>-L<b>`.
아래 「팀 결정 문서」 = `docs/decisions/2026-08-17-media-비특권-전환.md`(PR #62 동봉, 공개).

## 역할

- 작성자: C안(이미지에 빈 디렉터리 + 소유권) 단독 채택과 「기존 볼륨 1회 초기화 공지」 결정(8/16), 범위를 줄이지 않기로 한 결정, 계약 검사 정밀화를 머지 전에 같은 PR에 넣기로 한 결정, 머지 승인.
- AI(Claude Code): 공개 자료 조사 34건, 독립 평가(7안 채점 — C안 88점 1순위), 로컬 실험 E1–E8, 계획(UID 분리 10002/10001 제안 포함), 구현, 계약 검사.
- 리뷰: Claude Code · Codex(계획 · 코드 · 계약 검사), 보안 검수(실 이미지 빌드 재현). 공개 근거 = PR #62 본문 194행.
- 삭제: 「USER를 지정했더니 녹화가 시작되지 않았다」(사고 기록 없음 — E1 재현 실험), 「내가 선택한 경계」(설계는 AI 제안, 작성자는 채택).

## 실험 E1–E8 (팀 내부 실험 기록(비공개) 8/16 · 요약은 팀 결정 문서 29–35행 공개)

환경: Docker Engine 29.4.0 · Docker Desktop · darwin/arm64(OrbStack 아님). 리눅스는 그때 미검증.

| 실험 | 한 일 | 관측 |
|---|---|---|
| E1 | 경로 없는 이미지 + 새 named volume, UID 10001로 쓰기 | 볼륨 `0755 0:0`, 쓰기 거부(재현 실험) |
| E2 | prep 스테이지 빈 디렉터리를 `COPY --from=prep --chown=10001:10001` + 새 볼륨 | 볼륨 `10001:10001`, 쓰기 성공 |
| E3 | 컨테이너 · 볼륨 제거 후 재생성 | 다시 `10001:10001` |
| E4 | 이미 파일이 있는(root 소유) 볼륨에 같은 이미지 | `0:0` 그대로 — 기존 볼륨은 안 고쳐짐 |
| E5 | 쓰는 중인 볼륨에 `docker volume rm` / `-f` | 둘 다 거부(`volume is in use`) |
| E6 | 소스 2775 · 0770 디렉터리를 `COPY`, `--chown`, `--chmod=2775`로 각각 복사 | 셋 다 이미지에서 0755 — 디렉터리 모드 미보존, `--chmod`도 디렉터리에 효과 없음 → setgid 불가 |
| E7 | 공식 MediaMTX 1.19.3을 `-u 10002:10002`로 기동 | 정상, 리스너 전부 up. MoQ 자동 인증서 쓰기만 실패(우리 설정은 MoQ 끔) |
| E8 | 호스트 파일 bind mount를 UID 10001로 조회 | 컨테이너 안에서 `10001:10001`로 보임 — Docker Desktop의 소유권 재매핑 |

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| moby는 이미지에 경로가 없으면 볼륨 채우기를 건너뜀 | moby `daemon/create_unix.go` L100–L111(`os.IsNotExist → return nil`) | 공개 소스 |
| 볼륨이 비어 있을 때만 복사 | moby `daemon/container/container_unix.go` L384–L400(`len(dstList) != 0 → return nil`), 호출부 L121–L127 | 공개 소스 |
| 소유권 · 모드는 볼륨 최상위 디렉터리에도 적용(소스가 빈 디렉터리여도) | `copyExistingContents`는 `fs.CopyDir`로 넘김 → continuity v0.5.0 `fs/copy.go` L85–L108(`Chmod` + `copyFileInfo`), `fs/copy_linux.go` L145–L168(`Lchown`) | 공개 소스(moby vendor) |
| Docker 문서는 빈 볼륨의 내용 복사만 설명, 소유권 규칙은 없음 | docs.docker.com volumes 「Mounting a volume over existing data」, 팀 결정 문서 104–105행 | 공개 |
| `--chown` 없으면 UID/GID 0, 이름은 /etc/passwd 필요 · 숫자는 불필요 | Dockerfile 레퍼런스 `#copy---chown` | 공개 |
| 실험 E1–E8 · 환경 Engine 29.4.0/arm64 | 팀 결정 문서 29–35행, PR #62 본문 88 · 154행(Docker Desktop, darwin/arm64) | 공개 |
| 7안 점수(C 88 · B init 83 · A pre_start 71 · D gosu 56 …) | 팀 결정 문서 97–141행, PR #62 본문 표 | 공개 |
| init 기각: 매 `up`마다 root 컨테이너가 볼륨에 rw | 팀 결정 문서 109–113행 | 공개 |
| pre_start 기각: Compose ≥5.3.0 강제(로컬 5.1.2), 훅 컨테이너에 security_opt 미전달 | 팀 결정 문서 115–122행 | 공개 |
| gosu 기각: root로 시작 = 목표와 배타 | 팀 결정 문서 124–127행 | 공개 |
| build 스테이지 → `/out/mtxhookwrite` | `media/Dockerfile.mtxhook` L19–L29 | 공개 |
| prep 스테이지 mkdir | 같은 파일 L43–L44 | 공개 |
| 최종 = 포크 이미지(scratch 파생), 훅 바이너리 `--chown=0:0` | L85, L96(주석 L27–L28 · L90–L95) | 공개 |
| 세 디렉터리 `--chown=10002:10002`, `USER 10002:10002` | L99–L102 | 공개 |
| 8/17 당시 FROM은 공식 1.19.3(포크는 이후) | 팀 결정 문서 26 · 33행, 실험 E7 | 공개 |
| 계약 검사: 세 COPY · USER · no-new-privileges · nocopy 부재 · 마운트 · 훅 바이너리 root 소유 | `media/internal/mtxhook/runtime_identity_contract_test.go` L89–L197 | 공개 |
| `--chmod` 포함 모르는 COPY 플래그는 이름째 실패(허용 = `--chown` · `--from`) | 같은 파일 L170–L183, L401–L428 · 커밋 `4ad0b2c2`(PR #62) | 공개 |
| `--chmod=0777` 반례는 검사 구멍 지적(Codex 리뷰), 실제 이미지가 0777이었던 적 없음 | 같은 파일 L170–L172, 팀 내부 리뷰 기록(비공개) 8/17 | 공개 + 비공개 |
| 훅 바이너리 `root:root 0755`, 10002 쓰기 `permission denied`, 실행 성공 | 팀 결정 문서 145–147행, PR #62 본문 177행 | 공개(실측) |
| media 10002 · 사이드카 10001 · 모드 0755/0644로 교환 | 팀 결정 문서 39–51행, `media/Dockerfile` L44, `mtxhookwrite/main.go` L39–L46 · L163–L170 | 공개 |
| 로컬 compose: media `no-new-privileges`, 볼륨 dvr · recordings · hooks | `docker-compose.yml` L40–L61 | 공개 |
| 사이드카는 recordings · hooks `:ro` | `docker-compose.yml` L76–L79 | 공개 |
| janitor 10002(지우기 위해 녹화 소유자와 같은 계정) | `docker-compose.yml` L130–L132, `infra/media-host/compose.yml.tmpl` L378–L383(PR #322, 10/23 07:13 KST 머지) | 공개 |
| 운영 상자: 모든 서비스 no-new-privileges · cap_drop ALL | `compose.yml.tmpl` L111–L115, L132–L154 | 공개 |
| 운영 상자 이미지 = `media/Dockerfile.mtxhook` 빌드 | `infra/media-host/README.md` L1145 | 공개 |
| 운영 상자 arm64 | `infra/terraform/modules/media_host/main.tf` L19, L91–L92 | 공개 |
| 운영 상자 기동 11/3 04:18 KST, 시험 송출 11/4, 11/10 조각 업로드 | 팀 출시 기록(비공개) | 비공개 |
| 기존 볼륨 이행: `down` → 볼륨 3개 rm → `up -d --build`, `down -v` 금지(pgdata) | 팀 결정 문서 52–54행, PR #62 본문 109–138행 | 공개 |
| 세 볼륨 전부 점검하는 이유(hooks만 옛 상태면 훅만 조용히 죽음) | PR #62 본문 144행 | 공개(실측) |
| 녹화 길이 max 4,312ms(기준 3,900–4,100), root 대조군도 max 4,312 | PR #62 본문 150행 | 공개 |
| 같은 날 다시 재니 4,001–4,021로 통과 — 간헐적 | 팀 내부 측정 기록(비공개) 8/17 | 비공개 |
| 롤백에 볼륨 재초기화 불필요(root는 10002 소유 디렉터리에도 씀) | 팀 결정 문서 171–175행 | 공개 |
| PR #62 머지 | `gh pr view 62` mergedAt 2026-08-17T04:19:55Z = 8/17 13:19 KST | 공개 |
| 리눅스에서 소유권 · 설정 파일 읽기 직접 측정 | 확인 기록 없음 | 미검증 |
