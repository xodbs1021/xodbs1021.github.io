{
  "title": "오류 0건 뒤의 빈틈을 찾는 일: PokeClip · MediaMTX · Shakedown 개발 기록",
  "date": "2026-10-16T12:37:00+09:00",
  "author": "김태윤",
  "categories": [
    "0-to-1"
  ],
  "tags": [
    "PokeClip",
    "MediaMTX",
    "Shakedown",
    "포트폴리오"
  ],
  "description": "공통 DB 인증, nginx 요청 검증, 되감기 주소와 엣지 하한, 녹화 결함 조사, 멀티 클라우드 전환, MediaMTX 기여를 만든 판단과 검증을 연결한 기술 글 모음.",
  "draft": false,
  "portfolio_edition": "2026-10-15-v2",
  "lastmod": "2026-11-26T09:51:10+09:00"
}

방송 파일을 만들었고 요청도 성공했는데, 브라우저가 인식한 재생 구간은 목록보다 **61.94초 짧았습니다.** 오류 수는 0이었습니다. 이 차이를 추적하며 성공 응답 다음에 무엇을 확인해야 하는지 배웠습니다. 파일의 시간축과 브라우저가 받아들인 구간을 대조해야 사용자가 놓친 장면을 찾을 수 있었습니다.

저는 PokeClip의 미디어·인프라 구조와 서비스 간 계약을 정하고, 사용 중 발견한 결함을 MediaMTX의 공개 기여로 이어 왔습니다. SoftBank Hackathon 2026 예선 산출물 Shakedown에서는 배포·복구의 조건과 실험 범위를 정했고 구현과 실험 실행은 AI가 맡았습니다. 본선에서는 AWS와 GCP 사이 이전의 범위와 설계를 맡았습니다.

이 모음은 PokeClip 35건과 MediaMTX 8건의 **기존 43사례**, 의존성 갱신·사용자별 SRT 제안·Shakedown을 다룬 **후속 8편**, 총 51편에서 시작했습니다. **10월 28일에 공통 DB 인증·개발 하네스·no-watch 종료 교착 3편을 더해 총 54편**으로 확장했습니다. 같은 날 nginx 요청 검증·Media 호스트 재시작·Live/DVR 분리 3편을 추가해 총 57편으로 확장했습니다. 11월 12일에 공유 DB 권한 글 1편을 나눠 썼고, **11월 26일에는 11월 1일부터 20일까지 공개한 PokeClip 16편·MediaMTX 1편·SoftBank Hackathon 본선 2편을 더해 총 77편**이 됐습니다. 기존 글의 기준일은 각 본문에 남기고, S3 발행·계정별 인증·인증서 watcher의 후속 상태를 갱신했습니다.

## 10월 28일 추가한 플랫폼 개발 기록

- [DB 비밀번호 대신 연결마다 RDS IAM 토큰을 만들었습니다](/posts/0-to-1/pokeclip-shared-db-auth-iam-tls/): 연결마다 만드는 IAM 토큰, verify-full, 공식 15분과 다른 실측 약 20분(1회). (11월 7일 새로 씀) 로그인 뒤 권한과 함수 가로채기는 [공유 DB에선 로그인 뒤 권한과 함수 가로채기를 막았습니다](/posts/0-to-1/pokeclip-shared-db-login-privileges/)로 나눴습니다(11월 12일).
- [워크트리를 나눠도 섞이던 하네스 검사 상태를 세션별로 나눴습니다](/posts/0-to-1/harness-session-isolation-worktree-root/): 세션별 상태 폴더, 첫 훅에서 고정한 작업 루트, 커밋 가드 회귀, 변이 32개 중 31개 검출. (11월 12일 새로 씀)
- [인증서를 저장하지 못한 MediaMTX는 종료되지 않았습니다](/posts/open-source-analysis/mediamtx-certloader-no-watcher-shutdown/): MediaMTX #6427의 원인, 최소 수정과 재현 조건.

- [nginx는 경로의 방송과 쿼리의 방송이 같을 때만 넘깁니다](/posts/0-to-1/pokeclip-nginx-playback-request-boundary/): 경로·쿼리 일치와 정규화 우회 차단.
- [systemd가 정리를 건너뛰자 옛 비밀 컨테이너가 남았습니다](/posts/0-to-1/pokeclip-media-host-restart-lifecycle/): 비정상 종료 시 수명 불일치와 복구 검증.
- [HLS 라이브와 DVR 목록을 나누자 넘김 조건이 생겼습니다](/posts/0-to-1/pokeclip-live-dvr-separation-handoff/): 완료한 발행·되감기 연동과 진행 중인 자동 전환 검증.

## 11월에 추가한 되감기·보안·녹화 기록 {#november}

11월 1일부터 20일까지 공개한 20편입니다. 공유 DB 권한 글은 10월 28일 절에서도 연결했고 총 편수에는 한 번만 셌습니다.

- **되감기** · [CDN 하나에서 라이브는 EC2로, 되감기는 S3로 보냈습니다](/posts/0-to-1/pokeclip-live-dvr-url-split/): 7월부터 11월까지 세 번 바뀐 되감기 주소 구조, 되감기·녹화 공정이 멈춰도 라이브 시청이 끊기지 않게 한 분리.
- **되감기** · [서명 쿠키는 종류별로 나누고 1시간 창은 엣지에서 막았습니다](/posts/0-to-1/pokeclip-dvr-cookie-edge-floor/): 와일드카드 하나가 남의 방송까지 열던 쿠키 정책을 종류별 넷으로 나눔, 방송 중 1시간 창을 위해 CloudFront 함수가 회차 경로 조각 번호를 KeyValueStore의 회차별 하한과 견줘 작으면 404를 돌려주고, 하한을 얻지 못하면 막지 않고 넘김.
- **되감기** · [사이드카는 4초 조각마다 HLS 되감기 목록을 이렇게 만듭니다](/posts/0-to-1/pokeclip-sidecar-rewind-playlist/): 장부 캐시에서 S3 조건부 PUT까지 목록 한 줄이 되는 길, 머리 다음 조각이 늦을 때 0.5·2·5.5·7.5초에 하는 일의 근거.
- **되감기** · [되감기 목록만 gzip으로 압축하고 라이브 목록은 미뤘습니다](/posts/0-to-1/pokeclip-playlist-gzip/): 약 138KB 목록을 압축 없이 보내던 CloudFront 설정, 되감기·VOD 목록에 gzip 적용, 로컬에서 잰 목록 크기를 4초마다 받는 조건으로 환산해 약 276kbps → 11kbps, Content-Length 없는 라이브 목록은 후속 작업으로.
- **되감기** · [되감기 중 사라진 HLS 조각, 재생 목록을 다시 받아 풀었습니다](/posts/projects/rewind-missing-segment/): 제어면에 하한을 묻던 설계를 같은 목록을 다시 받는 흐름으로 바꾼 과정, 공개 뒤 찾은 다시 받기 고리의 수정.
- **되감기** · [다른 상자가 먼저 넣은 조각 하나에 되감기 목록이 멈췄습니다](/posts/0-to-1/pokeclip-rewind-cache-deadlock/): 11월 16일 시험 방송에서 GAP·캐시 회복·확정이 서로를 기다린 약 35분 교착, 장부 끝을 직접 견주는 수정과 회귀 시험.
- **되감기** · [꺼 둔 라이브 따라잡기를 라이브 시청자에게만 다시 켰습니다](/posts/projects/pokeclip-live-catchup-live-viewers-only/): 고치기 전 해당 화면에서 약 17초까지 밀림(원자료 비공개), 1.05·1.1배속과, 점프가 허용되고 목록이 정체하지 않은 상태에서 지연이 10초를 넘고 동기 위치가 1초 넘게 앞일 때 라이브 동기 위치로 이동(뒤 8초는 다시 뛰지 않음), WebKit은 이동만. 운영 배포 뒤 데스크톱 Chrome 시험 1회 지연 중앙값 1.29초(비공개 실측).

- **녹화 조사** · [Chrome에서만 멈춘 녹화 조각, 결함은 원본에 있었습니다](/posts/projects/pokeclip-recording-defect-in-origin/): 끊김 표시·헤드리스·재포장 가설을 차례로 지우고 녹화 원본의 참조 프레임 결손에 닿은 과정.
- **녹화 조사** · [SRT latency를 3초로 올린 이유는 늦은 재전송이었습니다](/posts/projects/pokeclip-srt-latency-late-retransmission/): 운영 경로 첫 시험 방송에서 녹화기 오류 14건이 모두 RTT 급등 구간(송출 2–7분째)에 난 것을 보고, AWS 실험대 143회에서 급등 중 잃은 패킷의 재전송이 latency 안에 오지 못하면 받는 쪽이 건너뛰는 기제를 재현(둘 다 팀 내부 기록 기준 비공개 실측). 11월 4일 방송 조각 1624에 같은 기제가 작용했는지는 미확인.
- **녹화 조사** · [2시간 방송이 다시보기에서 7.5분만 보였던 이유](/posts/projects/pokeclip-round-vod/): 7.66초 조각 하나로 둘로 갈린 목록 때문에 회차 API가 마지막 7.5분만 가리킨 원인, 회차 문서 하나에 DISCONTINUITY를 다는 선택, 로컬에서 분할 경계를 세 브라우저로 튼 시험.
- **녹화 조사** · [재생 전 검은 미리보기는 µs 아래를 버린 시크 순환이었습니다](/posts/0-to-1/pokeclip-editor-seek-loop/): 비공개 운영 계측에서 같은 자리를 다시 넣으며 48초 이어진 시크 순환(재생 직전 54회 평균 간격 약 21ms), Chrome 157의 시각 절삭 공개 재측정과 Chromium 소스 근거, 1ms 여유를 고른 이유.
- **녹화 조사** · [HLS 클립은 왜 벽시각 대신 미디어 시각으로 자를까?](/posts/projects/pokeclip-media-timeline-over-wall-clock/): 벽시각(PDT)을 정밀 좌표로 쓰던 설계를 여섯 번 고친 끝에 클립·렌더 좌표를 미디어 시각으로 옮긴 결정.

- **공유 DB·자격** · [공유 DB에선 로그인 뒤 권한과 함수 가로채기를 막았습니다](/posts/0-to-1/pokeclip-shared-db-login-privileges/): 앱 계정이 public에 심은 같은 이름의 함수가 사이드카 호출을 가로채는 것을 10월 24일 시험용 PostgreSQL 17 컨테이너에서 재현, 호출을 pg_catalog로 한정하고 앱 표를 서버별 스키마로 옮기는 코드·SQL 변경.
- **공유 DB·자격** · [GitHub OIDC 거부, 원인은 SCP가 아니라 sub였습니다](/posts/projects/pokeclip-github-oidc-immutable-subject/): dev 배포에서 두 달 동안 SCP 탓으로 알던 거부의 실제 sub 형식, environment 단위로 좁힌 신뢰 조건, dev 배포용 액세스 키 삭제.
- **공유 DB·자격** · [IMDS 홉 상한을 1로 내리고 자격 창구를 따로 세웠습니다](/posts/0-to-1/pokeclip-media-imds-credential-relay/): 인터넷에 열린 컨테이너가 상자의 역할 자격을 받을 수 있던 경로를 끊고, 토큰 파일을 가진 사이드카·janitor에게만 자격을 건넨 결정.
- **공유 DB·자격** · [운영 DB를 지우는 데 마스터 대신 일회용 계정을 썼습니다](/posts/0-to-1/pokeclip-prod-data-wipe-throwaway-login/): 앱 소유 표를 마스터로 다룰 때의 권한 상승 경로, 앱 소유 표를 지우고 세는 걸음에만 일회용 로그인을 쓴 운영 작업, 로컬 PostgreSQL 17에서 재현한 그 로그인의 허용·거부 시험.
- **공유 DB·자격** · [EXISTS와 일반 계획이 채팅 조회를 끝까지 훑게 했습니다](/posts/0-to-1/pokeclip-chat-ledger-query-plans/): 907,200행 시험 장부에서 Seq Scan 하던 EXISTS 역행 검사를 ORDER BY … LIMIT 1로 바꾸고, 판 2 후보 조회 하나만 pgjdbc 서버 준비 문장을 끈 결정, 꼬리 시각의 역행 검사에서 12,685 → 21 버퍼(바인딩 값 계획끼리), 판 2 후보 조회의 중간 시각은 거의 그대로, 아직 운영 전.

- **MediaMTX** · [MediaMTX 디버그 로그에 비밀번호가 그대로 찍혔습니다](/posts/open-source-analysis/mediamtx-request-body-log-redaction/): logLevel debug에서 요청 본문의 password·token이 남던 문제, PR #6379(11월 1일 머지, v1.21.4 포함), API에 보낸 가짜 비밀 6개와 인증 비밀번호 2개의 로그 등장 16번 → 0번, 요청 줄의 쿼리 토큰은 남음.

- **해커톤 본선** · [클라우드를 옮기는 동안 DB 쓰기는 어디로 가야 할까?](/posts/projects/multicloud-migration-design/): 앱 쓰기를 한 번에 최대 한 DB만 받고 양쪽을 차단한 전환 구간의 요청은 접수 큐에 쌓는 설계, 즉석 롤백 대신 택한 새 전환.
- **해커톤 본선** · [AWS↔GCP DB 전환은 23초, 준비는 4시간이 넘었습니다](/posts/projects/aws-gcp-bidirectional-cutover-experiment/): 팀 데모 인프라에서 승인부터 전환 완료까지 23초·21초, 봇의 쓰기 시도 2,582건 중 실패 0(팀 내부 보고서 기준 비공개 실측), 한 번도 켜진 적 없는 전환 장치를 켜며 막힌 아홉 가지.

## 먼저 읽을 다섯 가지 판단

| 확인한 결과 | 그 전에 바꾼 판단 | 상세 글 |
|---|---|---|
| 재포장 p50 **23.43→3.05ms** | 조각마다 init이 달라지는 FFmpeg 재포장 계획을 녹화기와 같은 라이브러리의 Go 재포장으로 변경. 같은 읽기·쓰기 범위·각 200회 대조 | [재포장 비교](/posts/0-to-1/pokeclip-go-remux-same-io-benchmark/) |
| 원본 미디어 요청 **1,254→28건** | 캐시 키와 원본 인증 전달을 분리. 50 VU·25초·각 조건 1회 | [CDN 실험과 97.95%의 분모](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/) |
| **276파일, 누락·중복 0** | 완료 알림에만 의존하지 않고 파일·DB를 복구 기준으로 사용. 정상·알림 유실 4조건 | [파일 회수 검증](/posts/0-to-1/pokeclip-indexer-recovery-without-events/) |
| **PR 7건 머지, 6건 정식 릴리스 반영** | 설정 검증 시점, 명령 종료값, 소스 생명주기, 인증 기본값, 인증서 종료 교착, 요청 본문 로그, 훅 실패 보고 수정 | [MediaMTX 기여 모음](#opensource) |
| **실제 EC2 재부팅 2회**로 복구·삭제 상태 확인 | 자동 시작과 삭제 기록을 함께 보존. 첫 재부팅은 데이터 2건·서비스 복구, 두 번째는 삭제 뒤 미부활 확인 | [Shakedown 재부팅 시험](/posts/0-to-1/shakedown-reboot-recovery-and-deletion/) |

빠른 재포장이 전체 서비스 지연을 같은 비율로 줄여 주는 것은 아닙니다. 재포장 측정은 fsync·S3·네트워크를 제외했고, CDN은 원본 전송이 줄었어도 미디어 HTTP p95가 약 1.4초로 비슷했습니다. 각 글에서 수치의 조건과, 그 결과로 채택하거나 보류한 선택까지 함께 읽을 수 있습니다.

## 서비스 구조와 직접 만들 범위 {#structure}

방송을 받는 서버를 교체하거나 클립을 렌더링하는 일이 현재 송출까지 끊어서는 안 됐습니다. 수신·재생·렌더의 수명을 나누고, 직접 만들 기능과 기존 도구에 맡길 기능을 정한 과정입니다.

- **CASE 01** · [방송 중 클립을 위해 라이브·되감기·편집 경로를 나눴습니다](/posts/0-to-1/pokeclip-live-editing-boundaries/)
- **CASE 02** · [Go로 다 짜려던 미디어 서버를 MediaMTX에 맡겼습니다](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/)
- **CASE 03** · [채팅 수집 언어는 리뷰할 사람이 바뀌어 Spring이 됐습니다](/posts/0-to-1/pokeclip-language-ownership-boundaries/)
- **CASE 04** · [방송 중인 미디어 서버는 API처럼 갈아 끼울 수 없었습니다](/posts/0-to-1/pokeclip-stateful-media-deployment/)
- **CASE 29** · [LL-HLS 라이브 창은 지연이 아니라 복귀 여유를 정했습니다](/posts/0-to-1/pokeclip-live-window-without-fork/)
- **CASE 30** · [클립은 완성 파일 대신 원본과 편집 레시피로 남겼습니다](/posts/0-to-1/clip-edit-recipe-render-boundary/)

## 파일 회수와 복구 기준 {#recovery}

완료 알림을 놓쳤다고 디스크에 남은 방송 파일까지 사라진 것은 아닙니다. 파일·DB·객체 저장소가 어긋났을 때 어디서 사실을 확인하고 다시 처리할지 정했습니다.

- **CASE 14** · [HTTP 200인데 검은 화면, 세 단계를 지나서야 재생됐습니다](/posts/0-to-1/pokeclip-black-screen-three-causes/)
- **CASE 15** · [완료 알림이 사라져도 녹화 파일은 디스크 재스캔으로 찾습니다](/posts/0-to-1/pokeclip-indexer-recovery-without-events/)
- **CASE 16** · [업로드가 끝났는지는 S3 응답이 아니라 DB 장부로 봤습니다](/posts/0-to-1/pokeclip-upload-state-and-recovery/)

## 재생 누락·시간축·재포장 {#playback}

오류 수가 0이어도 영상 구간은 빠질 수 있었습니다. 원인을 파일 안 시각(tfdt)으로 좁힌 뒤 되감기용 조각을 따로 만들었고, 조각마다 init이 달라지는 FFmpeg 대신 Go 재포장을 골라 속도와 출력 정합성을 서로 다른 시험으로 확인했습니다.

- **CASE 21** · [되감기 재포장 조각의 생성과 업로드 완료를 따로 확정했습니다](/posts/0-to-1/pokeclip-playback-producer-boundaries/)
- **CASE 22** · [HLS 오류는 0건인데 녹화 142초 중 62초가 사라졌습니다](/posts/0-to-1/pokeclip-zero-errors-missing-playback/)
- **CASE 23** · [HLS 녹화 재생을 가른 것은 init이 아니라 tfdt였습니다](/posts/0-to-1/pokeclip-cdn-timeline-normalization/)
- **CASE 24** · [FFmpeg 재포장은 조각마다 init이 달라 Go로 바꿨습니다](/posts/0-to-1/pokeclip-go-remux-same-io-benchmark/)
- **CASE 25** · [같은 세션 재접속에 HLS 끊김 표시를 달지 않은 이유](/posts/0-to-1/pokeclip-reconnect-audio-gap/)

## 조회 계약과 식별자 전환 {#contracts}

조회가 요청 시작 이후의 파일만 찾으면 앞에 걸친 첫 조각이 빠집니다. 시간 구간의 겹침 규칙을 바로잡고, 식별자 변경에서는 소비자의 준비 상태를 확인한 뒤 전환하도록 조율했습니다.

- **CASE 28** · [BETWEEN 대신 구간 겹침으로 클립 첫 조각을 찾았습니다](/posts/0-to-1/pokeclip-segment-overlap-contract/)
- **CASE 33** · [streamId 의미를 바꾸기 전에 소비자 조회부터 확인했습니다](/posts/0-to-1/stream-id-contract-compatible-migration/)

## 캐시·접근 통제·저장 계층 {#cdn}

같은 URI를 캐시해도 되는지와 캐시된 파일을 누가 받을 수 있는지는 다른 질문이었습니다. 원본 요청·전송량·응답 시간을 나눠 측정하고, 저장 계층을 더 늘릴 필요가 있는지도 실측으로 검토했습니다.

- **CASE 12** · [CDN 캐시 키와 원본 인증을 나누자 원본 요청이 줄었습니다](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/)
- **CASE 19** · [조각이 이미 4초 객체라 새 S3 저장 계층을 보류했습니다](/posts/0-to-1/pokeclip-storage-before-new-layer/)

## 입력·권한·재생목록 발행 {#input}

트랙 6개를 받는 것만으로 음악 없는 클립이 완성되지는 않았습니다. 본방 믹스와 분리된 소리의 대응, 방송자의 기존 설정, 편집·게시 권한까지 이어서 봤습니다. 재생목록에서는 늦게 끝난 작업과 재접속이 기존 목록의 의미를 바꾸지 않도록 설계했습니다.

- **CASE 05** · [소스 약 10개 대신 OBS 6트랙에 순서만 고정했습니다](/posts/0-to-1/pokeclip-six-track-input-contract/)
- **CASE 06** · [오디오 6트랙은 개수와 고르기와 소리 내용을 따로 검증했습니다](/posts/0-to-1/pokeclip-multiaudio-end-to-end-verification/)
- **CASE 07** · [본방 인코더를 SRT와 나눠 쓰자 GOP와 종료가 묶였습니다](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/)
- **CASE 08** · [오디오 자동 배정은 끌 때 원래 OBS 체크로 돌아가야 했습니다](/posts/0-to-1/pokeclip-audio-assignment-user-state/)
- **CASE 09** · [SRT 암호를 PG 밖 Secrets Manager로 옮겼습니다](/posts/0-to-1/pokeclip-secret-storage-migration-plan/)
- **CASE 10** · [OBS 계정 연결을 OAuth 대신 8자 일회용 코드로 했습니다](/posts/0-to-1/pokeclip-one-time-pairing-contract/)
- **CASE 11** · [편집자와 방송자를 나누려던 업로드 권한은 하나로 합쳐졌습니다](/posts/0-to-1/pokeclip-editing-upload-authorization/)
- **CASE 20** · [늦게 끝난 발행이 새 HLS 목록을 덮지 못하게 했습니다](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/)
- **CASE 26** · [끝난 HLS 목록은 다시 열지 않고 새 세션 주소를 줬습니다](/posts/0-to-1/pokeclip-session-url-and-endlist/)
- **CASE 27** · [HLS 재생 목록은 연속으로 확정된 조각까지만 공개했습니다](/posts/0-to-1/pokeclip-manifest-window-boundaries/)
- **CASE 31** · [게임 대사도 음성이라 자막 트랙 선택에서 상시 VAD를 뺐습니다](/posts/0-to-1/microphone-selection-without-always-on-vad/)

## 테스트·실행 권한·CI·의존성 {#quality}

테스트가 개발 DB에 잔여 행을 남기거나, 테스트가 사라졌는데도 CI가 초록색이 되는 경우를 확인했습니다. 일부러 오류를 넣거나 테스트를 제거해 검사가 실제로 실패하는지 대조했습니다.

- **CASE 17** · [통합 테스트 잔여 행을 전용 DB와 소유 표식으로 막았습니다](/posts/0-to-1/pokeclip-test-database-ownership-marker/)
- **CASE 18** · [비root 녹화를 위해 새 볼륨의 소유권을 이미지에 심었습니다](/posts/0-to-1/pokeclip-scratch-volume-ownership/)
- **CASE 34** · [미디어 CI를 경로 필터로 좁히자 필수 체크를 포기해야 했습니다](/posts/0-to-1/media-ci-path-filter-required-check-tradeoff/)
- **CASE 35** · [테스트 파일을 빼도 통과하던 CI를 커버리지 게이트로 막았습니다](/posts/0-to-1/coverage-gate-that-fails-when-tests-disappear/)
- **후속 기록** · [MediaMTX를 포크로 바꾸며 녹화 입력부터 다시 만들었습니다](/posts/0-to-1/pokeclip-dependency-upgrade-contracts/)

## MediaMTX 기여와 리뷰에서 바뀐 판단 {#opensource}

설정 오류가 반복 실행 뒤에야 드러나거나, 실패한 명령이 종료 코드 0으로 기록되는 문제를 공개 프로젝트의 수정으로 연결했습니다. 정식 릴리스 6건과 머지 뒤 릴리스를 기다리는 1건 외에도 열린 제안과 채택되지 않은 접근을 남겼습니다. 리뷰가 설계를 바꾼 사례도 남겼습니다.

- **CASE 36** · [MediaMTX는 LL-HLS 조각 6개 설정으로도 기동했습니다](/posts/open-source-analysis/mediamtx-hls-segment-count-validation/)
- **CASE 37** · [MediaMTX는 실패한 훅의 종료 코드를 0으로 받았습니다](/posts/open-source-analysis/mediamtx-hook-exit-code-return/)
- **CASE 38** · [MediaMTX 대체 화면은 보여 주되 녹화하지 않게 했습니다](/posts/open-source-analysis/mediamtx-offline-recording-source-lifecycle/)
- **CASE 39** · [MediaMTX 인증 기본값은 환경변수 하나에 함께 바뀌었습니다](/posts/open-source-analysis/mediamtx-auth-defaults-normalization-and-clone/)
- **CASE 40** · [로그 재설정 중 훅을 기다리게 한 PR은 교착 반례로 닫혔습니다](/posts/open-source-analysis/mediamtx-logger-reload-rejected-lifecycle-fix/)
- **CASE 41** · [MediaMTX 훅 7곳은 실행 실패를 로그에 남기지 않았습니다](/posts/open-source-analysis/mediamtx-seven-hooks-missing-exit-callback/)
- **CASE 42** · [MediaMTX 인증서 감시 작업은 Close 뒤에도 돌았습니다](/posts/open-source-analysis/mediamtx-certificate-watcher-close-join/)
- **CASE 43** · [MediaMTX 훅 출력을 모으자 동시 종료에서 줄이 빠졌습니다](/posts/open-source-analysis/mediamtx-hook-output-backpressure-experiments/)
- **후속 기록** · [MediaMTX가 SRT 암호를 사용자별로 받게 제안했습니다](/posts/open-source-analysis/mediamtx-user-srt-passphrase-boundaries/)

## SoftBank Shakedown: 배포부터 복구까지 {#shakedown}

선택한 계획이 AWS 자원에 반영되게 연결하고, 잘못된 Java 입력의 거부부터 DB 복원·호스트 재부팅까지 확인했습니다. AI가 생성할 수 있는 범위와 실행 전에 서버가 거부할 조건을 정한 과정도 담았습니다.

- **후속 기록** · [AI에 맡기는 이미지 생성과 배포 판단의 범위부터 제한했습니다](/posts/0-to-1/shakedown-bounded-ai-image-generation/)
- **후속 기록** · [선택한 배포 계획을 AWS에 적용하고 장애 뒤 복구를 쟀습니다](/posts/0-to-1/shakedown-plan-deployment-and-recovery/)
- **후속 기록** · [잘못된 Java 구문이 검사를 통과해 구문 검사를 앞에 뒀습니다](/posts/0-to-1/shakedown-java-syntax-before-security-scan/)
- **후속 기록** · [TLS 연결 성공과 잘못된 호스트 거부를 짝으로 시험했습니다](/posts/0-to-1/shakedown-database-tls-identity-and-failover/)
- **후속 기록** · [백업이 있다는 말 대신 새 DB에 복원한 데이터로 확인했습니다](/posts/0-to-1/shakedown-database-restore-proves-backup/)
- **후속 기록** · [재부팅 후에는 살아나고 삭제 후에는 살아나지 않아야 했습니다](/posts/0-to-1/shakedown-reboot-recovery-and-deletion/)

## 방향이 바뀌었어도 남길 판단 {#reference}

현재 구현에 쓰지 않는 경로 조정 설계도 있고, 임시 기준값으로 11월 3일 출시본에 들어갔지만 정확도는 아직 재지 않은 채팅 하이라이트 판별도 있습니다. 부분 목록으로 방송을 삭제하지 않는 원칙과, 자동 탐지가 빗나가도 손으로 표시한 장면을 같은 카드 표에 남기는 선택은 다음 설계에도 참고할 수 있어 남겼습니다.

- **CASE 13** · [부분 목록으로 방송을 지우지 않으려던 경로 조정자를 버렸습니다](/posts/0-to-1/pokeclip-path-reconciler-design-history/)
- **CASE 32** · [채팅 급증 판별은 임시 기준이라 수동 표시 경로를 함께 뒀습니다](/posts/0-to-1/chat-highlight-research-and-fallback/)

## 상태와 자료를 읽는 기준 {#source}

MediaMTX의 릴리스 성과는 [v1.21.0](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.0)의 #6154·#6155·#6182, [v1.21.1](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.1)의 #6205, [v1.21.4](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.4)(11월 15일)의 #6427·#6379로 6건입니다. 2026년 11월 25일 GitHub 확인 기준 [#6259](https://github.com/bluenviron/mediamtx/pull/6259)는 11월 18일 머지돼 v1.21.4보다 늦어 아직 어느 릴리스에도 없고, #6306·#6380은 열려 있습니다. #6206은 #6326이, #6261은 #6417이 다시 구현하면서 미병합으로 닫혔습니다. 10월 15일 판에서는 #6259·#6261·#6306을 열린 제안으로, 10월 28일 판에서는 #6261 미병합 종결과 #6427 병합을 확인했고, #6427의 릴리스 포함 여부는 확인하지 않았습니다. 이후 상태는 공개 PR의 이력에서 확인할 수 있습니다.

**10월 15일 요약이 「준비 중」이라고 적은 PokeClip의 SRT 암호 전환은 그 시점에 이미 개발 서버의 읽기를 Secrets Manager로 옮긴 뒤였습니다.** 개발 서버의 Auth는 10월 6일 읽기를 전환했고 10월 22일 PG 사본과 이행 도구를 지웠으며, 운영 Terraform 정의는 처음부터 Auth의 SRT 암호 저장소를 Secrets Manager로 둡니다([SRT 암호 저장 위치 글](/posts/0-to-1/pokeclip-secret-storage-migration-plan/)). 방송 플랫폼 OAuth 토큰은 PG에 암호화해 둡니다. Shakedown에서 적용한 비밀 조회·주입 경로와는 프로젝트가 다릅니다.

글 본문의 링크는 공개 PR·고정 커밋·공식 문서로 이어집니다. 로컬 실험에는 환경·횟수·범위를 표시했고, 아직 배포하지 않은 설계는 진행 상태를 밝혔습니다.

블로그에서 다듬은 판단과 검증 근거를 자소서·포트폴리오에도 반영한 [2026년 10월 16일 최종 편집본 PDF 56쪽](/portfolio/2026-10-16-final/full.pdf)을 열 수 있습니다. 재포장 동시성의 비용, 의존성 갱신의 입력·출력 기준, Java 구문 검사와 재부팅 복구의 판단을 보강했습니다. 새로운 실험 성과를 추가한 판은 아니며, 근거·PR 상태의 확인 기준일은 10월 15일입니다. [이전 10월 15일 판](/portfolio/2026-10-15-v2/full.pdf)도 보존합니다.

## 출처

- [MediaMTX v1.21.0 릴리스](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.0) — bluenviron/mediamtx, GitHub. #6154·#6155·#6182 포함.
- [MediaMTX v1.21.1 릴리스](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.1) — bluenviron/mediamtx, GitHub. #6205 포함.
- [MediaMTX v1.21.4 릴리스](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.4) — bluenviron/mediamtx, GitHub. 2026년 11월 15일, #6427·#6379 포함.
- [PR #6427 certloader: fix Close() hang when saving certificate fails](https://github.com/bluenviron/mediamtx/pull/6427) — 2026년 10월 27일(KST) 머지, v1.21.4 포함.
- [PR #6379 http: log request bodies only for the content types logged in responses](https://github.com/bluenviron/mediamtx/pull/6379) — 2026년 11월 1일 머지, v1.21.4 포함.
- [PR #6259 hooks: log the failure of every hook command](https://github.com/bluenviron/mediamtx/pull/6259) — 2026년 11월 18일(KST) 머지, 11월 25일 확인 기준 릴리스 전.
- [PR #6306 srt: add srtPassphrase to users](https://github.com/bluenviron/mediamtx/pull/6306) · [PR #6380 hooks: route hook output to the server log](https://github.com/bluenviron/mediamtx/pull/6380) — 11월 25일 확인 기준 열림.
- [PR #6326 fix race condition during logger recreation (#6206)](https://github.com/bluenviron/mediamtx/pull/6326) · [PR #6417 fix routine leak in CertLoader (#6261)](https://github.com/bluenviron/mediamtx/pull/6417) — #6206과 #6261을 각각 다시 구현해 머지된 PR.
- 각 사례의 PR·커밋·실측 조건은 연결한 글의 출처 절에 있습니다.
