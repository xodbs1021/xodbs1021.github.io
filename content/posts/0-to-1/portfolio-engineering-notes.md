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
  "description": "재포장 23.43→3.05ms, CDN 원본 요청 1,254→28건, MediaMTX 릴리스 4건을 만든 판단과 검증. 43사례와 후속 8편을 연결한 기술 글 모음.",
  "draft": false,
  "portfolio_edition": "2026-10-15-v2"
}

방송 파일을 만들었고 요청도 성공했는데, 브라우저가 인식한 재생 구간은 목록보다 61.94초 짧았다. 이 경험 이후 성공 응답이나 테스트 통과만으로 기능을 설명하지 않으려 했다. 사용자가 기대한 결과가 실제로 남았는지, 그 결과를 바꾸기 위해 어떤 경계를 수정했는지를 함께 확인했다.

나는 PokeClip의 미디어·인프라 구조와 서비스 간 계약을 정하고, 사용 중 발견한 결함을 MediaMTX의 공개 기여로 이어 왔다. SoftBank 해커톤 Shakedown에서는 분석 결과를 배포와 복구까지 연결했다. 구현·계측에 AI 협업을 활용한 부분, 팀원이 구현한 부분, 내가 요구·선택·검증 기준을 정한 부분은 각 글에서 구분했다.

이 모음에는 PokeClip 35건과 MediaMTX 8건의 **기존 43사례**, 의존성 갱신·사용자별 SRT 제안·Shakedown을 다룬 **후속 8편**, 총 **51편의 기술 글**이 있다. 2026년 10월 15일까지 확인한 구현·실험·리뷰 기록을 기준으로 정리했다. 각 글에서 문제의 재현 조건, 비교한 대안, 바꾼 동작, 검증 결과와 남은 한계까지 읽을 수 있다.

## 먼저 읽을 네 가지 판단

| 확인한 결과 | 그 전에 바꾼 판단 | 상세 글 |
|---|---|---|
| 재포장 p50 **23.43→3.05ms** | 매 조각의 FFmpeg 프로세스 기동을 상주 Go 호출로 변경. 같은 I/O·각 200회 대조 | [재포장 비교](https://xodbs1021.github.io/posts/0-to-1/pokeclip-go-remux-same-io-benchmark/) |
| 원본 미디어 요청 **1,254→28건** | 캐시 키와 원본 인증 전달을 분리. 50 VU·25초·각 조건 1회 | [CDN 실험과 97.95%의 분모](https://xodbs1021.github.io/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/) |
| **276파일, 누락·중복 0** | 완료 알림에만 의존하지 않고 파일·DB를 복구 기준으로 사용. 정상·알림 유실 4조건 | [파일 회수 검증](https://xodbs1021.github.io/posts/0-to-1/pokeclip-indexer-recovery-without-events/) |
| **PR 4건 정식 릴리스 반영** | 설정 검증 시점, 명령 종료값, 소스 생명주기, 인증 기본값의 참조 경계 수정 | [MediaMTX 기여 모음](#opensource) |

이 수치를 서비스 전체의 개선율로 묶지는 않았다. 재포장 측정은 fsync·S3·네트워크를 제외했고, CDN은 원본 전송 감소를 관측했지만 미디어 HTTP p95는 약 1.4초로 비슷했다. 같은 I/O 비교 이전의 비대칭 벤치마크, 검증 실패와 기각한 접근도 해당 글에 남겼다.

## 서비스 구조와 직접 만들 범위 {#structure}

방송 중에도 편집할 수 있으려면 수신·재생·렌더가 같은 수명에 묶이지 않아야 했다. 언어를 고르는 문제에서 시작해 상태를 가진 미디어의 배포와 편집 레시피의 책임까지 나눴다.

- **CASE 01** · [방송이 끝나기 전에 클립을 만들려면: 라이브·되감기·편집 경로 나누기](https://xodbs1021.github.io/posts/0-to-1/pokeclip-live-editing-boundaries/)
- **CASE 02** · [미디어 서버를 전부 만들려던 계획을 바꾼 이유](https://xodbs1021.github.io/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/)
- **CASE 03** · [채팅 수집을 Spring으로 바꾼 이유: 언어보다 먼저 정할 책임](https://xodbs1021.github.io/posts/0-to-1/pokeclip-language-ownership-boundaries/)
- **CASE 04** · [API처럼 교체할 수 없는 서버: 방송 상태를 가진 미디어의 배포 경계](https://xodbs1021.github.io/posts/0-to-1/pokeclip-stateful-media-deployment/)
- **CASE 29** · [6초 창 때문에 라이브러리를 포크할 필요가 있을까](https://xodbs1021.github.io/posts/0-to-1/pokeclip-live-window-without-fork/)
- **CASE 30** · [클립을 파일로만 저장하지 않은 이유: 편집 레시피와 렌더의 경계](https://xodbs1021.github.io/posts/0-to-1/clip-edit-recipe-render-boundary/)

## 파일 회수와 복구 기준 {#recovery}

알림이 도착했다는 사실과 파일이 실제로 존재한다는 사실은 다르다. 파일·DB·객체 저장소가 어긋났을 때 어디를 확인하고 다시 처리할지 정한 기록이다.

- **CASE 14** · [200인데 검은 화면이었다: 세 원인이 겹친 HLS 재생 문제 추적](https://xodbs1021.github.io/posts/0-to-1/pokeclip-black-screen-three-causes/)
- **CASE 15** · [알림이 없어도 녹화 파일을 찾는 인덱서: 276파일 복구 검증](https://xodbs1021.github.io/posts/0-to-1/pokeclip-indexer-recovery-without-events/)
- **CASE 16** · [S3에는 올라갔는데 DB는 pending: 업로드 복구의 기준을 정하다](https://xodbs1021.github.io/posts/0-to-1/pokeclip-upload-state-and-recovery/)

## 재생 누락·시간축·재포장 {#playback}

오류 수가 0이어도 영상 구간은 빠질 수 있었다. 재생 시간축을 고친 뒤 실행 단위를 바꾸고, 속도 수치와 출력 정합성을 별도로 검증했다.

- **CASE 21** · [재생 조각이 만들어졌다는 것과 저장됐다는 것을 나누기](https://xodbs1021.github.io/posts/0-to-1/pokeclip-playback-producer-boundaries/)
- **CASE 22** · [오류는 0건인데 61.94초가 보이지 않았습니다](https://xodbs1021.github.io/posts/0-to-1/pokeclip-zero-errors-missing-playback/)
- **CASE 23** · [시간값만 바꿨더니 8.10초가 39.87초가 됐습니다](https://xodbs1021.github.io/posts/0-to-1/pokeclip-cdn-timeline-normalization/)
- **CASE 24** · [재포장 23.43→3.05ms: 같은 I/O 범위로 다시 측정한 이유](https://xodbs1021.github.io/posts/0-to-1/pokeclip-go-remux-same-io-benchmark/)
- **CASE 25** · [재접속의 0.2초 빈틈: 타임스탬프와 불연속 태그를 함께 바꾸기](https://xodbs1021.github.io/posts/0-to-1/pokeclip-reconnect-audio-gap/)

## 조회 계약과 식별자 전환 {#contracts}

생산자가 내보내는 값만 바꾸면 소비자의 조회가 깨진다. 시간 구간의 겹침 규칙과 식별자의 뜻을 맞추고, 쓰는 쪽이 준비된 뒤 전환하는 순서를 정했다.

- **CASE 28** · [3.9초부터 자르면 첫 조각이 빠진다: 조회 계약과 8,020개 경계 검증](https://xodbs1021.github.io/posts/0-to-1/pokeclip-segment-overlap-contract/)
- **CASE 33** · [streamId의 의미를 바꾸기 전에 소비자의 조회부터 확인했다](https://xodbs1021.github.io/posts/0-to-1/stream-id-contract-compatible-migration/)

## 캐시·접근 통제·저장 계층 {#cdn}

CDN 적중률보다 먼저 같은 URI의 바이트와 인증 경계를 확인했다. 원본 요청·전송량·응답 시간의 분모를 나누고, 새 저장 계층을 추가할 필요도 실측으로 검토했다.

- **CASE 12** · [원본 요청 1,254건을 28건으로: 캐시 키와 인증 전달을 분리한 실험](https://xodbs1021.github.io/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/)
- **CASE 19** · [새 저장소를 붙이기 전에: S3 PUT 60회와 8개 파일 다운로드 비교](https://xodbs1021.github.io/posts/0-to-1/pokeclip-storage-before-new-layer/)

## 입력·권한·재생목록 발행 {#input}

멀티오디오 입력은 송출부터 편집까지 이어지는 계약이었다. 기존 방송 설정의 보존, 일회용 페어링, 편집과 게시 권한, 늦게 도착한 결과가 새 목록을 덮지 않는 규칙을 함께 다룬다. 설계와 완료된 검증을 각 글에서 구분했다.

- **CASE 05** · [10트랙을 만들려다 6트랙으로 돌아왔다: 음악 없는 클립의 입력 설계](https://xodbs1021.github.io/posts/0-to-1/pokeclip-six-track-input-contract/)
- **CASE 06** · [오디오 6개가 보인다고 검증이 끝난 것은 아니었다](https://xodbs1021.github.io/posts/0-to-1/pokeclip-multiaudio-end-to-end-verification/)
- **CASE 07** · [본방 인코더 하나로 SRT도 보내기: 시작과 종료가 더 어려웠다](https://xodbs1021.github.io/posts/0-to-1/pokeclip-obs-shared-encoder-srt/)
- **CASE 08** · [오디오 자동 배정이 방송자의 원래 설정을 망가뜨리지 않게 하기](https://xodbs1021.github.io/posts/0-to-1/pokeclip-audio-assignment-user-state/)
- **CASE 09** · [해시로 충분한 값과 다시 읽어야 하는 비밀: SRT 키 저장을 바꿀 계획](https://xodbs1021.github.io/posts/0-to-1/pokeclip-secret-storage-migration-plan/)
- **CASE 10** · [OBS 안에 OAuth를 다시 만들지 않고 계정을 연결하는 방법](https://xodbs1021.github.io/posts/0-to-1/pokeclip-one-time-pairing-contract/)
- **CASE 11** · [편집을 맡긴다고 채널 게시까지 맡기는 것은 아니다](https://xodbs1021.github.io/posts/0-to-1/pokeclip-editing-upload-authorization/)
- **CASE 20** · [늦게 끝난 writer가 새 재생목록을 덮는다면](https://xodbs1021.github.io/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/)
- **CASE 26** · [끝난 재생목록은 다시 열지 않기로 했습니다](https://xodbs1021.github.io/posts/0-to-1/pokeclip-session-url-and-endlist/)
- **CASE 27** · [12번이 준비돼도 11번을 건너뛰면 안 됩니다: HLS 목록 경계 검증](https://xodbs1021.github.io/posts/0-to-1/pokeclip-manifest-window-boundaries/)
- **CASE 31** · [마이크를 고르는 문제에 상시 VAD가 필요할까](https://xodbs1021.github.io/posts/0-to-1/microphone-selection-without-always-on-vad/)

## 테스트·실행 권한·CI·의존성 {#quality}

테스트가 실제 DB에 흔적을 남기거나, 테스트가 사라졌는데 CI가 초록색이 되는 경우를 확인했다. 성공 표시를 믿기 전에 검사 자체가 실패를 찾아낼 수 있는지 대조했다.

- **CASE 17** · [가짜 실패 행 1,121개가 남았다: 테스트 DB의 소유권부터 확인하기](https://xodbs1021.github.io/posts/0-to-1/pokeclip-test-database-ownership-marker/)
- **CASE 18** · [USER만 바꾸면 녹화가 깨진다: scratch와 새 볼륨의 권한 설계](https://xodbs1021.github.io/posts/0-to-1/pokeclip-scratch-volume-ownership/)
- **CASE 34** · [CI 경로 필터를 바꾸려면 브랜치 보호부터 바꿔야 했다](https://xodbs1021.github.io/posts/0-to-1/media-ci-path-filter-required-check-tradeoff/)
- **CASE 35** · [테스트가 모두 통과해도 CI를 실패시켜야 할 때](https://xodbs1021.github.io/posts/0-to-1/coverage-gate-that-fails-when-tests-disappear/)
- **후속 기록** · [MediaMTX 버전을 올리며 다시 확인한 9개의 의존 계약](https://xodbs1021.github.io/posts/0-to-1/pokeclip-dependency-upgrade-contracts/)

## MediaMTX 기여와 리뷰에서 바뀐 판단 {#opensource}

사용 중 발견한 문제를 공개 프로젝트의 수정으로 연결했다. 정식 릴리스에 포함된 4건, 열린 제안, 채택되지 않은 접근을 나누고 유지보수자의 대체 기여도 함께 표시했다.

- **CASE 36** · [서버는 켜졌는데 방송을 재생할 수 없었다: HLS 설정 검증을 앞당기기](https://xodbs1021.github.io/posts/open-source-analysis/mediamtx-hls-segment-count-validation/)
- **CASE 37** · [실패한 명령이 종료 코드 0으로 보인 이유: 빠진 return 하나의 영향](https://xodbs1021.github.io/posts/open-source-analysis/mediamtx-hook-exit-code-return/)
- **CASE 38** · [대체 화면은 보여주되 녹화하지 않기: 기존 PR을 이어 완성한 상태 경계](https://xodbs1021.github.io/posts/open-source-analysis/mediamtx-offline-recording-source-lifecycle/)
- **CASE 39** · [기본값을 복사했는데 왜 다른 설정까지 바뀔까: 인증 설정의 두 가지 회귀](https://xodbs1021.github.io/posts/open-source-analysis/mediamtx-auth-defaults-normalization-and-clone/)
- **CASE 40** · [안전하게 기다리려던 수정이 교착을 만들 수 있었다: 미병합 PR #6206](https://xodbs1021.github.io/posts/open-source-analysis/mediamtx-logger-reload-rejected-lifecycle-fix/)
- **CASE 41** · [시작조차 못 한 명령은 stderr를 남길 수 없다: 빠진 7종 훅 콜백](https://xodbs1021.github.io/posts/open-source-analysis/mediamtx-seven-hooks-missing-exit-callback/)
- **CASE 42** · [Close가 반환했는데 인증서 watcher는 살아 있었다](https://xodbs1021.github.io/posts/open-source-analysis/mediamtx-certificate-watcher-close-join/)
- **CASE 43** · [훅 로그를 더 모으면 종료도 더 기다릴까: 유실률과 역압력 실험](https://xodbs1021.github.io/posts/open-source-analysis/mediamtx-hook-output-backpressure-experiments/)
- **후속 기록** · [사용자별 SRT 암호를 제안하며 인증 범위와 대기 비용을 함께 살펴봤습니다](https://xodbs1021.github.io/posts/open-source-analysis/mediamtx-user-srt-passphrase-boundaries/)

## SoftBank Shakedown: 배포부터 복구까지 {#shakedown}

분석 결과가 실제 AWS 자원에 반영되는 경로를 만들고 TLS 검증, 데이터 복원, 재부팅 뒤 복구와 삭제 뒤 미복구를 확인했다. AI가 생성할 범위를 제한하는 판단과 팀·AI 협업의 구현 경계를 담았다.

- **후속 기록** · [Shakedown에서 AI가 만들 수 있는 배포 구성을 먼저 제한한 이유](https://xodbs1021.github.io/posts/0-to-1/shakedown-bounded-ai-image-generation/)
- **후속 기록** · [배포 계획 저장에서 실제 AWS 복구 검증까지: Shakedown의 실행 경계](https://xodbs1021.github.io/posts/0-to-1/shakedown-plan-deployment-and-recovery/)
- **후속 기록** · [잘못된 Java 구문이 ALLOW를 받았을 때: 보안 검사 앞에 구문 검사를 둔 이유](https://xodbs1021.github.io/posts/0-to-1/shakedown-java-syntax-before-security-scan/)
- **후속 기록** · [TLS로 연결됐는데도 더 확인한 것: MySQL 호스트 검증과 MongoDB 장애 전환](https://xodbs1021.github.io/posts/0-to-1/shakedown-database-tls-identity-and-failover/)
- **후속 기록** · [백업이 있다는 말 대신 복원한 데이터로 확인했습니다](https://xodbs1021.github.io/posts/0-to-1/shakedown-database-restore-proves-backup/)
- **후속 기록** · [재부팅 후에는 살아나고, 삭제 후에는 살아나지 않아야 했습니다](https://xodbs1021.github.io/posts/0-to-1/shakedown-reboot-recovery-and-deletion/)

## 방향이 바뀌었어도 남길 판단 {#reference}

옛 경로 조정 설계와 하이라이트 연구는 현재 구현 성과로 세지 않았다. 부분 목록을 삭제 근거로 삼지 않는 원칙과 연구 실패 시 수동 편집으로 이어지는 판단은 별도로 남겼다.

- **CASE 13** · [부분 목록으로 방송을 지우지 않기: 폐기한 경로 조정 설계에서 남은 판단](https://xodbs1021.github.io/posts/0-to-1/pokeclip-path-reconciler-design-history/)
- **CASE 32** · [채팅이 많으면 하이라이트일까: 자동 탐지의 가설과 수동 대체 경로](https://xodbs1021.github.io/posts/0-to-1/chat-highlight-research-and-fallback/)

## 상태와 자료를 읽는 기준 {#source}

MediaMTX의 릴리스 성과는 [v1.21.0](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.0)의 #6154·#6155·#6182와 [v1.21.1](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.1)의 #6205다. 2026년 10월 15일 확인 기준 #6259·#6261·#6306은 열린 제안이며, #6206은 미병합으로 닫혔다. 이후 상태가 바뀌면 공개 PR의 이력을 함께 확인할 수 있다.

**PokeClip의 Secrets Manager 전환은 준비 중이다.** 현재 PG에 남은 passphrase 원문을 Secrets Manager로 옮기고 DB에는 참조를 남기는 방식으로 변경할 예정이다. Shakedown에서 이미 적용한 비밀 조회·주입 경로와 다른 프로젝트의 상태다.

글 본문의 링크는 공개 PR·고정 커밋·공식 문서로 이어진다. 로컬 실험에서만 확인한 결과에는 환경·횟수·범위를 표시했다. 재현하지 않은 성능이나 배포하지 않은 설계를 운영 성과로 환산하지 않았다.

같은 판의 자기소개서와 포트폴리오를 연속해서 보려면 [전체본 PDF 56쪽](/portfolio/2026-10-15-v2/full.pdf)을 열 수 있다. PDF는 요약과 도표를 한 문서에 모은 보조 자료이며, 판단의 맥락과 한계는 각 기술 글에서도 읽을 수 있다.
