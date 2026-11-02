# PokeClip 미디어 시간축 설계 결정 글 — 근거 메모

- 작성·대조일: 2026-11-02.
- 대상 초안: `draft.md`. 공개 예정 경로는 `content/posts/projects/pokeclip-media-timeline-over-wall-clock.md`, URL은 `/posts/projects/pokeclip-media-timeline-over-wall-clock/`.
- 상태: 저자가 내린 설계 결정의 기록. 새 좌표 계약과 새 장 규칙의 구현·검증 완료를 주장하지 않는다.
- 작성자: Codex. 이번 작업에서는 실측을 새로 수행하지 않았다. 과거 조사·실측 수행과 이번 문헌 재확인을 구분한다.
- 요청에 따라 이 메모와 초안만 작성한다. 별도 review.md, 이미지, 영상, draw.io 파일, 공개 포스트는 만들지 않는다. 외부 프로젝트·볼트는 읽기만 한다.

## 읽은 원본과 역할

이하 `자료 루트`는 PokeClip 저장소의 비공개 작업 폴더이다. 아래 약칭은 작업 메모에서만 사용하며 공개 초안에는 넣지 않았다.

- **S**: `74_blog_pdt_structure_decision.md`. 저자 결정의 블로그 재료 정리본. 수집·평가 결과와 설계 방향을 연결한다.
- **RC**: `73_rc_pdt_structure.md`. 2026-11-02 Claude Code 수집 에이전트의 44개 출처 수집물. RC 번호는 이 파일의 번호다.
- **RE**: `73_re_pdt_structure.md`. 같은 날 별도 Claude Code 평가 에이전트의 독립 평가. 인용 URL 33개, 인용 69문장, 상류 소스 16개 파일, 이슈·PR 메타 10건을 재확인했다고 기록했다. 이 수치는 RE가 보고한 과거 작업 범위이며 Codex가 이번에 같은 전수 검증을 반복했다는 뜻이 아니다.
- **M**: `61_pdt_r6_measure_findings.md`. 다섯 갈래 실측의 종합 보고.
- **OBS**: `60_pdt_r6_measure/obs/REPORT.md`. OBS 32.2.2 실송출. 보고서는 실측 에이전트 메시지를 오케스트레이터가 옮겼다고 명시한다.
- **REC**: `60_pdt_r6_measure/rec/REPORT.md`. 녹화기 원천 대조와 합성 입력. 수행 주체·전사 방식은 OBS와 같다.
- **REN**: `60_pdt_r6_measure/render/REPORT.md`. FFmpeg 판별 렌더 실험. 수행 주체·전사 방식은 OBS와 같다.
- **VM**: `60_pdt_r6_measure/t9vm/REPORT.md`. 느린 송출기·서버 시계 변경 시험. 관련 관측의 조건을 원보고서로 대조했다.
- **WEB**: `60_pdt_r6_measure/web/REPORT.md`. 전체 보고서를 cat으로 읽고 관련 조건·상충 부분을 확인했다. RE와 M의 해석을 새 플레이어 실측으로 표시하지 않는다.
- **PROD**: `60_design_pdt_r6_producer_r3.md`. 학습형 설계와 예시 상수 확인. 전체 cat 출력이 도구 한도에서 잘렸으므로 아래에서 확인한 부분 이상을 전체 재검토했다고 주장하지 않는다.
- **Q**: `00_clarifier_qa.md`의 2026-11-02 20:51·22:16 결정 기록. 미디어 좌표, 섞기 규칙, DTS 유지, 공용 변환, 동일 방송 유지. 관련 끝부분을 확인했다. 초기 기록의 「새 장 = 끊김 표시」는 이번 사용자 정정으로 제한한다.
- **CONTRACT**: `46_contract_pdt_draft_r22.md`. 조각당 1ms, 학습 창, 기존 넘김 관측의 출처를 관련 행 검색으로 보완했다. 전체 계약의 현행성 판정은 수행하지 않았다.

블로그 지침·문체 참고는 요청한 순서대로 `cat`으로 읽었다. 추가로 공통 화면 검수 지침, blog-quality-reviewer, article-style-checker, drawio 지침과 현행 `package.json`, `src/lib/posts.mjs`, `astro.config.mjs`를 읽었다. 사용자 전역 지침의 볼트 진입 문서도 읽었으나, 글의 결정·수치 근거는 이번 지정 자료를 우선했다. 볼트 내용은 쓰거나 동기화하지 않았다.

재료 저장소를 읽은 시점의 HEAD는 `fe91d270b3e75c8450697a9bced2ce526238cd2b`이다. 다만 S·RC·RE 세 파일은 `git ls-files --stage`에 나오지 않았다. 따라서 이 HEAD를 세 재료 문서의 소스 커밋이라고 표시하지 않는다. 문서 자체의 커밋 provenance는 미확인이고, 상류 소스·실측 이미지의 커밋은 각 주장에 별도로 적었다.

## 주요 주장별 근거

### 1. 결정일·미구현 상태·작업 주체

- **주장**: 2026-11-02 저자가 두 설계를 선택했다. 아직 새 설계는 구현하지 않았다. 다음 순서는 설계 개정 → 리뷰 → 계약 개정 → 실측 → 구현 → 재측정이다.
- **근거**: 사용자 현재 지시가 상태와 순서를 명시. S 4·5절, Q 20:51·22:16 결정 기록과 합치한다.
- **근거 종류**: 가정·설계 결정 / 구현 효과는 미검증. 코드·실험 결과가 아니다.
- **수행 주체**: 결정 김태윤. 레퍼런스 수집·평가 서로 다른 Claude Code 에이전트. 실측 기존 프로젝트 실측 에이전트. 이번 본문 초안·대조 Codex.
- **범위**: S의 완료형 표현을 구현 완료로 옮기지 않았다. RE의 「구조 판정 강함」도 인과관계의 실험적 증명과 구분했다.

### 2. 영상 경로·원본과 재포장본·조각 길이

- **주장**: OBS → SRT → MediaMTX에서 라이브와 fMP4 녹화가 갈라진다. 사이드카가 원본·단일 오디오 재포장본·DB 장부를 만든다. 4초는 목표값이다.
- **근거**: S 1.1, RE 전제 P5. OBS 「새 사실」「수치」「설계 영향 6」은 VideoToolbox 조각 5.7초 중심, 범위 5100–5767ms를 기록한다.
- **RC·URL·커밋**: 경로는 프로젝트 설계 자료. HLS의 다중 출력·렌디션은 RC-6, [HLS bis-22](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt). 실측 녹화기 원천은 REC T-1의 상류 `3f041257` + 프로젝트 수정 5건, 이미지 라벨 revision `01dbd754`.
- **근거 종류**: 경로는 설계·구현 구조에 관한 프로젝트 기록. 실제 길이는 실측.
- **수행 주체**: 기존 프로젝트 설계·구현의 기여를 저자 단독 구현으로 바꾸지 않음. OBS 시험은 기존 실측 에이전트.

### 3. PDT와 미디어 시각의 역할

- **주장**: PDT는 첫 표본과 벽시각 사이의 대응이다. 미디어 타임스탬프가 파일에 정수로 기록된다는 사실과 외부 시계 동기 정확도는 별개다.
- **근거**: RC-5·6·7, RE 1절 P1·P3 및 4절 ⑤.
- **URL·판**: [HLS bis-22](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt), 2026-05-01, 4.4.4.6·6.2.1·6.2.4·6.3.4. [DASH-IF timing model](https://dashif.org/Guidelines-TimingModel/), 2024-10-24.
- **근거 종류**: 문헌값(규격 초안·업계 지침), 역할 분담은 설계 결정.
- **수행 주체**: 문서 작성 기관. 역사적 수집·평가 Claude Code. Codex가 이번에 핵심 문구를 웹 원문으로 재확인.
- **범위**: PDT의 일반적 정확도를 「1초」로 고정하지 않았다. 「정보성」을 무용·비정밀의 보편 선언으로 해석하지 않았다. 표준이 PTS만을 명시한다는 주장도 하지 않았다.

### 4. OBS 일반 SRT 출력과 수신 추정의 원천

- **주장**: 조사한 OBS에서는 일반 SRT 출력에 송신 측 벽시각을 주입하는 경로를 찾지 못했고, BPM 등록은 멀티트랙 영상·MP4 출력에서 확인했다. 현재 MediaMTX SRT는 추정값을 쓴다.
- **근거**: RC-20·21·13·14, RE 대안 B 및 스코어카드 RC-20·21.
- **URL·소스 커밋**: [obsproject/obs-studio#11004](https://github.com/obsproject/obs-studio/pull/11004), 2024-09-05 병합. OBS `65c320b46e`(2026-10-29)의 [MultitrackVideoOutput.cpp](https://github.com/obsproject/obs-studio/blob/65c320b46e/frontend/utility/MultitrackVideoOutput.cpp), [mp4-output.c](https://github.com/obsproject/obs-studio/blob/65c320b46e/plugins/obs-outputs/mp4-output.c). MediaMTX `847a6ee`의 [srt/conn.go](https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/servers/srt/conn.go).
- **근거 종류**: 문헌값(소스 분석). 일반 SRT 전체의 불가능성은 주장하지 않는다.
- **수행 주체**: 소스 분석은 RC 수집자·RE 평가자. Codex의 이번 OBS 소스 재다운로드는 실패했으므로 해당 검증을 재사용했다고 명시한다.

### 5. MediaMTX 추정기의 재기준 조건과 트랙별 상태

- **주장**: 첫 수신 시각 + PTS 차로 추정하고, 현재보다 미래이거나 5초 넘게 과거이면 재기준한다. 포맷·트랙별 상태다.
- **근거**: RC-13·15, RE 4절 ④. 수식·분기와 머리 트랙 선택의 정합을 독립 평가가 확인했다.
- **URL·소스 커밋**: `bluenviron/mediamtx@847a6ee`(2026-11-01)의 [estimator.go](https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/ntpestimator/estimator.go), [sub_stream_format.go](https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/stream/sub_stream_format.go), [format_fmp4_track.go](https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/recorder/format_fmp4_track.go).
- **근거 종류**: 문헌값(고정 커밋 소스). B 프레임에 의한 특정 오차 크기는 소스만으로 실측이라 하지 않음.
- **수행 주체**: RC·RE. 이번 Codex는 `gh api`로 estimator 파일의 base64 content 응답을 받았으나, 나머지 원문 재취득은 실패했다. 소스 전수 재대조 완료로 쓰지 않는다.

### 6. OBS의 트랙 기준 약 94ms 차와 ±105ms 변동

- **주장**: OBS B 프레임 시험의 접속별 중앙 기준 차는 약 94ms. 이웃 조각에서 기준 트랙 교대에 따른 약 ±105ms 변동이 있었다.
- **근거**: OBS 「판정 요약」「방법」「수치」「설계 영향 2·3」. x264 접속별 중앙 −94.2ms, VideoToolbox −94.4ms. 교대 x 중앙값 x264 −104.8/+104.1ms, VideoToolbox −106.0/+105.9ms.
- **조건·집계**: 2026-11-02, OBS 32.2.2, 1080p30, 루프백, SRT 지연 1초, 오디오 6트랙 무음. x264·VideoToolbox 각 70초 × 8접속, 이미 도는 인코더에 재접속. OBS 기본 SRT 출력은 운영 플러그인과 같은 먹서지만 플러그인 자체를 실행한 시험은 아니다. x264 136조각, VideoToolbox 96조각.
- **커밋**: REC가 대조한 녹화 이미지 원천 `3f041257` + 수정 5건 / revision `01dbd754`. OBS 실행판 32.2.2. 인터넷 환경·새 인코더 첫 시작·실음은 미측정.
- **근거 종류**: 실측. 절대 캡처 벽시각 정확도 상한과는 다름.
- **수행 주체**: 기존 Claude Code 실측 에이전트, 오케스트레이터 전사. Codex 재실행 없음.

### 7. 첫 조각의 구성 시차가 다름

- **주장**: 첫 영상 표본의 c가 첫 조각에서는 0이고 이후 합성 33.3ms, OBS 66.7ms였다.
- **근거**: REC T-6 표(B 2: 0 / 33.3 / 최대 100ms), OBS 수치(c 첫 / 둘째 이후 / 최대: 0 / 66.7 / 166.7ms).
- **RC·커밋**: 개념은 RC-9·10·19, 수치 자체는 프로젝트 REC·OBS. 녹화 원천은 항목 6과 동일.
- **근거 종류**: 실측. 30fps에서 첫 표본의 한두 프레임 차이이며, 모든 프레임의 c 상한을 한두 프레임으로 제한하지 않는다.
- **수행 주체**: 기존 실측 에이전트.

### 8. 6초 DTS 도약 뒤 2,575ms 겹침

- **주장**: 연속 도착 + DTS만 6초 앞으로 옮긴 합성 입력에서 녹화 재시작 경계의 장부상 겹침 2,575ms.
- **근거**: REC T-9 모드 P의 6초 도약 행과 바로 아래 계산. 마지막 표본 6033ms, 장부 길이 6600ms. `(앞 조각 w + 6600) − 뒤 인스턴스 w = 2575ms`.
- **조건·커밋**: 60초 testsrc2+sine, 30초부터 전 트랙 도약, 키프레임 2초, B 0, AAC 1트랙. REC의 이미지 provenance는 항목 6. 모드 R처럼 도착 자체가 비는 실험과 구분.
- **근거 종류**: 실측. 보편적 재접속 오차나 평균값 아님.
- **수행 주체**: 기존 실측 에이전트. Codex는 보고서 대조만 수행.

### 9. 첫 +5초 재설정은 같은 표식에 남음

- **주장**: 느린 송출기에서 접속별 첫 추정 재설정이 같은 녹화기 표식 안에 남는다.
- **근거**: M 1·2절의 서버 시계 VM 결과와 정정 C2. RE 서두 실측 함정 목록도 동일.
- **원본·조건**: VM 「판정 요약」「방법」「느린 송출기」를 대조했다. Debian 13.7 arm64·QEMU 11.1.2 VM에서 MediaMTX revision `01dbd754` 실행. 합성 송출의 미디어 시계 속도 0.98·0.96배를 사용한 네 실행에서 첫 재설정 4/4가 같은 표식이었다. 재설정 증가량은 +5000.9–+5008.2ms. 일반 OBS 송출이나 실제 ppm 수준의 시계 오차를 대표하는 실험은 아니다.
- **근거 종류**: 실측 보고의 재인용. 원시 로그 전수는 이번 미확인.
- **수행 주체**: 기존 서버 시계 VM 실측 에이전트. 본문에서는 해당 시험의 관측으로 한정.

### 10. FFmpeg 무한 복제와 약 1.3ms 시각 당김

- **주장**: `setpts → tpad` 무한 복제는 7.1.5와 8.0.1 `strip_fps=1`에서 재현, 8.0.1 기본에서는 미재현. MP4 편집 목록 기본 ms 단위의 양자화로 출력 영상이 최대 약 1.345ms 앞당겨짐.
- **근거**: REN 1절·3절·4절 1·3. 39회 렌더 실행. 90초 시한, 7.1.5 p2·p3의 종료 124. `-movie_timescale 90000` 대조는 보고서에 있으나 새 구조의 효과로 쓰지 않았다.
- **버전**: 배포 꼴 이미지 FFmpeg 8.0.1-3ubuntu2, Debian 대조 7.1.5. 실제 프로젝트 ffmpeg 전체를 버전 미상으로 묶지 않음.
- **근거 종류**: 실측. 「클립이 1.3ms 짧아짐」과 「시각이 약 1.3ms 앞당겨짐」을 구분.
- **수행 주체**: 기존 렌더 실측 에이전트.

### 11. 두 구조가 결함을 늘렸다는 해석과 옛 학습 장치

- **주장**: 소비자별 보정식과 학습형 제어기가 복잡성을 늘렸다. 학습 창 60초와 조각당 최대 1ms는 예시 설계값이었다.
- **근거**: S 2절, RE 전제 P3·P4 및 9절의 인과는 평가 범위 밖이라는 주석. PROD 결론 8의 `D · D′ · M · N · 학습 창 · 공백 시한`, 예시 `20 · 100 · 3 · 3 · 60초 · 5분`. CONTRACT 2.3 관련 검색 결과의 조각당 최대 1ms.
- **근거 종류**: 가정·설계 모형, 구조적 해석. 운영 실측으로 확정된 학습값이나 결함의 배타적 원인 아님.
- **수행 주체**: 기존 설계·리뷰, 저자의 구조 변경 판단. Codex 서술 정리.

### 12. 전제 일곱 개의 선례 판정

- **주장**: 공개 선례의 부분 채택·부재·상충을 나눈다.
- **근거 매핑**: RE 1절이 판정 원본. 장부 RC-1·3·5·6·7·36·44 / 도착 추정 RC-1·3·13·14·26·36·17 / DTS·변환 RC-5·7·9·10·19 / 학습 RC-25·29·13·15·17 / 두 공정 RC-6·26·28·24 / 넘김 RC-10·44·43 / PDT 클립 RC-36·40·4·39·37·38·41·42.
- **근거 종류**: 문헌값을 바탕으로 한 조사 판정. 부재 영역은 미확인, 업계 전체의 불가능성 아님.
- **수행 주체**: 독립 RE 에이전트. Codex가 공개 글에서 단정 수준을 낮추고 표를 압축.
- **범위**: 「업계는 모두 한 패키저」, 「공개 내부 구조가 없음」 같은 전칭 표현을 피했다. Twitch·YouTube 내부 구조는 확인하지 못했다고 쓴다.

### 13. 결론을 굳힌 세 근거: HLS·Mux·Kinesis

- **주장**: 정밀 동기는 미디어 타임스탬프에 근거를 두는 것이 적합하다. PDT를 통한 조각 클립과 프레임 정확 자산 클립은 구별된다. 부정확한 시각의 끊김 정책은 별도다.
- **근거**: RC-5·6·36·3, RE 4절 ①·②·⑤. RE가 추가한 KVS `not accurate → ALWAYS` 문장을 포함.
- **URL**: [HLS bis-22](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt), [Mux instant clips](https://www.mux.com/docs/guides/create-instant-clips), [Mux asset clips](https://www.mux.com/docs/guides/create-clips-from-your-videos), [KVS HLS API](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/API_reader_GetHLSStreamingSessionURL.html).
- **판·날짜**: HLS 2026-05-01 / 만료 2026-11-02. 벤더 문서는 게시일 불명, 2026-11-02 열람. 이번 웹 도구는 KVS의 `/dg/` 경로를 `/APIReference/`로 리다이렉트했으며 내용 일치.
- **근거 종류**: 문헌값. HLS의 변형 스트림 전환 문맥을 PokeClip의 ±250ms 보장으로 바꾸지 않음. KVS의 서버 시각 기본값을 「AWS가 서버 시각은 모두 부정확하다고 선언」으로 바꾸지 않음.
- **수행 주체**: 외부 문서 작성자, 기존 RC·RE. Codex는 위 문서 핵심 구간을 이번에 재확인.

### 14. 반대 선례: UTC 프레임 정확 클립과 연속 수신

- **주장**: 벽시각 기반 프레임 정확 클립이 불가능한 것은 아니다. 인코더가 UTC 미디어 시간축을 만든 Unified는 다른 전제다. 타임스탬프를 이어가는 수신 모델도 존재한다.
- **근거**: RC-28·40·8, RE P7·상충 병기.
- **URL·커밋**: [Unified Capture](https://docs.unified-streaming.com/documentation/capture/live-to-vod.html), [Live requirements](https://docs.unified-streaming.com/best-practice/live.html), [DASH-IF ingest@6390878](https://github.com/Dash-Industry-Forum/Ingest/blob/6390878/DASH-IF-Ingest.bs.md)(2026-09-29).
- **근거 종류**: 문헌값. Unified 옵션과 UTC 원천은 이번 웹 원문도 확인. ingest 세부 항목은 RC·RE의 고정 커밋 검증을 재사용.
- **수행 주체**: 벤더·표준 작성자, 수집·평가 에이전트, Codex 원문 대조.

### 15. 도착 기반 보정의 약 580ms 역효과

- **주장**: 제3자가 지연 증가만으로 정확한 원천을 약 580ms 옮긴 이전 보정의 실패를 보고했다.
- **근거**: RC-17에는 해당 댓글의 다른 부분만 수록. RE 0절 3·4절 ⑥이 빠진 문장을 보충했다.
- **URL·버전·날짜**: [bluenviron/mediamtx#5550 댓글](https://github.com/bluenviron/mediamtx/issues/5550#issuecomment-6307819009), 2026-10-21T04:09:37Z, MediaMTX v1.21.2, RTSP 카메라. 이번 `gh api repos/bluenviron/mediamtx/issues/5550/comments` 응답으로 해당 본문·일자·permalink를 확인했다.
- **근거 종류**: 실측(제3자·단일 보고). PokeClip 자체 실측도, 모든 프로토콜의 정량적 상한도 아님. 인용은 한국어 요약으로 작성.
- **수행 주체**: 외부 이슈 댓글 작성자. 기존 평가가 발굴, Codex 이번 재확인. 공개 글에는 타인 이름을 넣지 않음.

### 16. 결정 1: 클립·편집·렌더의 미디어 좌표

- **주장**: 좌표를 소재와 소재 안 미디어 시각으로 넘긴다. 공개 API의 오프셋은 좌표 선택의 선례다. 실제 프레임 일치는 구현 후 검증한다.
- **근거**: S 4절, Q 20:51·22:16, RE 대안 D, RC-36·37·38·41·42.
- **URL·커밋**: [Cloudflare](https://developers.cloudflare.com/stream/stream-live/live-instant-clipping/)(2026-04-21), [Twitch Create Clip From VOD](https://dev.twitch.tv/docs/api/reference/#create-clip-from-vod), [MediaConvert](https://docs.aws.amazon.com/mediaconvert/latest/ug/timecode-input.html), [FFmpeg doc@b034eb5e7e](https://github.com/FFmpeg/FFmpeg/blob/b034eb5e7e/doc/ffmpeg.texi)(2026-11-02), Mux는 항목 13.
- **근거 종류**: 문헌값 / 설계 결정. 「플레이어에서 본 프레임과 같아졌다」는 효과는 미검증.
- **수행 주체**: 저자 선택, 벤더 API 문서. Codex가 Cloudflare·Twitch·MediaConvert 원문을 재확인. FFmpeg 고정 커밋 내용은 RC·RE 검증을 재사용.
- **범위**: Twitch의 `duration` 정밀도 0.1초를 프레임 정확도와 혼동하지 않는다. API별 시작·종료 오프셋 의미도 같다고 쓰지 않음.

### 17. 결정 2: 누적과 문턱으로 새 장을 여는 규칙

- **주장**: 장 안은 기준 + 실제 길이 누적. 새 녹화 때와 장 안에서 추정과 차이가 문턱을 넘으면 새 장. 작으면 이어감. 0.2초는 예시이며 전체 넘김 오차 보장 아님.
- **근거**: S 5절, Q 22:16, 현재 사용자 지시. 비교 선례는 RC-7·25·3·28·16, RE 대안 A·E 및 4절 ③.
- **URL·판**: [DASH timing model](https://dashif.org/Guidelines-TimingModel/)(2024-10-24), [MediaLive HlsGroupSettings](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-medialive-channel-hlsgroupsettings.html), [KVS HLS](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/API_reader_GetHLSStreamingSessionURL.html), [Unified troubleshooting](https://docs.unified-streaming.com/documentation/live/troubleshooting.html), [MediaMTX on_get.go@847a6ee](https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/playback/on_get.go).
- **근거 종류**: 문헌값에 기대어 선택한 설계·가정. 3시간·22시·0.1초·0.2초·2분 예시는 측정값이 아닌 설명용 모형.
- **수행 주체**: 규칙과 선택은 김태윤, 설명은 Codex. 새 규칙의 구현·측정 주체는 아직 없음.
- **범위**: MediaLive 500ms는 벤더의 재동기 문턱이며 PokeClip 넘김 허용치가 아니다. Unified의 아카이브 경계, DASH 구간, KVS 끊김 태그, PokeClip의 장을 동일한 출력 동작으로 묶지 않는다.

### 18. 마지막 조각만으로 실제 끊긴 시간을 알 수 없음

- **주장**: 원점이 초기화된 두 녹화의 로컬 미디어 좌표만으로 실제 경과 공백을 정할 수 없다. 무조건 틈 없이 이으면 재생은 이어져도 벽시각 대응은 공백만큼 밀릴 수 있다.
- **근거**: S 5.5, Q 마지막 질의·답 기록. RE 대안 E의 오프셋 표 및 재접속 선례와 모순 없음.
- **근거 종류**: 가정·시간축 모형. 2분 예시는 S의 설명용 수치, 실제 장애 길이 아님.
- **수행 주체**: 저자의 결정 과정에 나온 질문과 선택. Codex 설명.

### 19. DTS 유지·PTS 변환·플레이어 상충

- **주장**: 현재 장부 모델의 길이·순서는 DTS로 누적하되 장면 선택은 표본별 c로 PTS를 고려한다. 소스와 실측의 차이는 미해결이다.
- **근거**: S 6·7절, Q 22:16, RC-5·7·9·10·19, RE P3·3절·6절 3번.
- **URL·소스 커밋**: [hls.js remuxer@598ebdd](https://github.com/video-dev/hls.js/blob/598ebdd/src/remux/passthrough-remuxer.ts), [level-helper@598ebdd](https://github.com/video-dev/hls.js/blob/598ebdd/src/utils/level-helper.ts), [gohlslib@a14555d](https://github.com/bluenviron/gohlslib/blob/a14555d/muxer_segmenter.go)(v2.4.7, 2026-10-25). 프로젝트 WEB의 hls.js 실행판은 1.7.3.
- **근거 종류**: 문헌값 + 실측 보고 상충 / 원인 미검증.
- **수행 주체**: RC·RE 소스 조사, 기존 웹 실측 에이전트. Codex의 이번 고정 커밋 다운로드 실패, 새 원인 판정 없음.
- **범위**: `hasVideo && baseOffsetSamples?.ptsMin !== undefined` 조건을 빼지 않았다. 「hls.js는 항상 PTS」, 「DTS는 재접속을 넘어 언제나 단조」라고 하지 않았다. 구성 시차를 고정 상수로도 쓰지 않는다.

### 20. 동일 방송·목록·세션 판정 유지와 끊김 표시 정정

- **주장**: 한 방송·되감기 목록 하나·VOD 목록 하나·세션 판정은 유지한다. 새 장은 장부와 화면 시각에만 나타날 가능성이 크다. 재포장본은 앞 녹화 끝에 이으므로 기존 결정의 DISCONTINUITY는 세션 경계에만 둔다. 다음 개정에서 정합을 확정한다.
- **근거**: 현재 사용자 지시가 최우선. S 5.3·7절 및 내부 결정 기록(재포장과 끊김 표시)을 가리키는 주석. Q 초기 「새 장(끊김 표시)」 표현은 이번 정정으로 제한.
- **RC·URL**: RC-5·6, [HLS bis-22](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) 4.4.4.3 및 6.2.1. 내부 결정 기록 자체를 이번에 별도 원문 열람하지 않았으므로 사용자 명시 사실과 S의 재인용으로 처리.
- **근거 종류**: 설계 결정 / 새 장과 재생목록의 통합 정합·매끄러운 재생의 재검증은 미검증.
- **수행 주체**: 저자의 선행 결정·이번 정정. Codex는 공개 글 한계 절에 정정으로 명시.
- **범위**: 실제 타임스탬프·초기화 정보 불연속까지 표시를 무조건 생략하는 규칙을 만들지 않았다. HLS의 1초 미만 겹침은 드리프트용 부분 겹침 예외이고 2.6초 임의 겹침을 허용하지 않는다.

## 정리본과 달랐거나 단정을 낮춘 점

1. **HLS 오디오 한 트랙 제약**: S 1.1의 「HLS는 소리 트랙 하나만」은 규격 일반론으로 쓰지 않았다. RC-6의 렌디션·출력 간 일관성 요구와 HLS 원문은 대체 오디오를 다룬다. 프로젝트가 선택한 단일 오디오 재포장 경로로 제한했다.
2. **4초 조각**: S의 간단한 경로 표기 대신 목표값이라고 썼다. OBS REPORT의 약 5.7초 조각을 반영했다.
3. **±0.1초 정확도·초기 기준 오차 상한**: S의 「조각마다 ±0.1초」「실측 최대 0.1초 안팎」은 보장값으로 쓰지 않았다. OBS의 ±105ms는 조각 간 증가량의 변동이고 약 94ms는 트랙별 기준 차이다. 절대 캡처 시각 오차 상한을 이 수치로 증명할 수 없다.
4. **67–100ms와 구성 시차**: S의 범위를 그대로 대표 실측으로 제시하지 않고 OBS 보고의 약 94ms를 사용했다. REC의 B 프레임 모형값과 OBS 실측을 분리했다. 「이후 c는 한두 프레임」은 첫 표본에 한정해 33.3/66.7ms로 풀었다. 전체 c 최댓값은 OBS에서 166.7ms다.
5. **손잡이 다섯 개**: S는 다섯이라고 했지만 PROD의 실제 열거는 D·D′·M·N·학습 창·공백 시한 여섯 항목이다. 본문은 「여러 상수와 학습 상태」로 썼다. 새 규칙의 문턱 중심 단순화는 유지하되 정확한 감소 개수는 주장하지 않았다.
6. **클립 서비스의 보편적 프레임 정확도**: S 4.2의 「프레임 정확 클립을 내는 곳은 모두 오프셋과 재인코딩」은 RC-37·38의 API 필드만으로 입증되지 않는다. Cloudflare·Twitch는 좌표 선택의 선례로만 썼다. 정확 탐색의 재인코딩 전제는 RC-42로 분리했다. Unified의 인코더 UTC 예외(RC-40)도 반대 근거로 실었다.
7. **효과의 완료형**: S의 「같아진다」「사라진다」「없다」는 구현 결과로 쓰지 않았다. 벽시각 왕복 제거는 설계 방향, 프레임 일치·결함 감소는 구현 후 검증 항목이다.
8. **문턱이 넘김 예산을 보장**: S 5.2·5.4의 「문턱으로 지킴」「섞기뿐」은 근거보다 강하다. 기준 추정 오차·라이브 원점·플레이어 배치가 남으므로 전체 ±250ms 보장으로 쓸 수 없다. 고정 0.5초의 MediaLive 대안과 현재 비교 범위만 설명했다.
9. **약 1.3ms 잘림·무한 복제**: REN 원문을 따라 출력 시각 당김과 버전별 필터 동작으로 구체화했다. 8.0.1 기본에서 무한 복제까지 관측됐다고 쓰지 않았다.
10. **HLS 표준과 DTS**: HLS 원문은 첫 표본·첫 미디어 타임스탬프라고 할 뿐 DTS/PTS를 명시하지 않는다(RC-5). hls.js의 최소 PTS 사용도 조건부다(RC-10). 정밀 미디어 축이라는 결론과 DTS 원점의 보편적 정당성은 구분했다.
11. **새 장 = 끊김 태그**: Q의 초기 표현과 RE 대안 E의 DISCONTINUITY를 그대로 옮기지 않았다. 사용자 정정대로 재포장 목록의 세션 경계 정책과 새 장을 분리하고 다음 개정에서 확정한다고 썼다.
12. **위험 제거 범위**: S 5.6의 도착 추정 보정 위험이 「없다」는 표현을 제한했다. 자체 학습 보정은 제거하지만 상류 재설정·새 기준 오차·경계 반복은 남는다.
13. **구조 결함의 인과**: RE 9절은 인과가 평가 범위 밖이라고 명시한다. 본문도 실측에 부합하는 해석으로 표시하고 결함 대부분의 원인을 증명했다고 하지 않았다.
14. **부재 증거**: S 판정표의 「없음」을 공개 조사 범위에서 못 찾음으로 썼다. 단일 패키저가 업계 전체의 유일한 방법이라는 식의 일반화도 줄였다.

## 이번 원문 재확인의 범위와 확인하지 못한 것

- **이번에 웹 원문으로 확인**: HLS bis-22의 날짜·만료·정보성 대응·표류용 부분 겹침·변형 전환 문맥, Mux instant·asset clipping, KVS HLS의 끊김 모드·50ms·서버 시각 기본값, MediaLive의 누적·500ms·EVENT→VOD, DASH-IF의 2024-10-24 산식, Unified의 UTC·프레임 정확 옵션, Cloudflare 2026-04-21의 방송 시작 오프셋, Twitch의 VOD 종료 오프셋·길이, MediaConvert의 입력 타임코드.
- **이번에 GitHub API로 확인**: mediamtx#5550의 약 580ms 댓글 원문·날짜·permalink. estimator의 고정 ref 파일 content 응답도 수신했다.
- **새로 전수 대조하지 않음**: RC의 44개 전체 URL·RE의 69문장 전체. 역사적 Claude Code 평가가 수행한 범위로 명시했다.
- **접근 실패와 재사용**: 웹 도구에서 mediamtx·hls.js·FFmpeg 고정 raw URL은 `Cache miss`가 났다. 이후 gh API 재시도는 `error connecting to api.github.com`으로 실패했다. 이 파일들은 RC·RE의 커밋 고정 인용 검증을 재사용한다. OBS 등록 지점·MediaMTX playback·hls.js 갈래를 이번 새 다운로드로 재검증했다고 보고하지 않는다. 파이프라인 명령의 마지막 decode가 0을 반환했어도 stderr의 연결 실패를 성공으로 취급하지 않았다.
- **새 장의 구현**: 문턱 값, 장 경계 빈도, 재시작 뒤 상태 복구, 라이브 대응 원점, 장부·PDT·태그 정합, 역행 조회, 장시간 표류를 검증하지 않았다. 구현 전 상태다.
- **상충**: hls.js 1.7.3 실측의 DTS 위치와 `598ebdd` 소스의 조건부 PTS 경로 차이는 해소하지 못했다. `baseOffsetSamples.ptsMin` 유무·판 차이를 확인해야 한다.
- **실측 한계**: 새 인코더 첫 연결·실음·인터넷 흔들림을 OBS 시험이 커버하지 않는다. 실제 캡처 시각과 PDT의 절대 오차 최대값도 이번 자료로 정하지 않았다. VM 시험 보고서는 읽었지만 원시 로그 전수는 재검토하지 않았다.
- **조사 공백**: Twitch·YouTube 내부 시간축, 플랫폼의 별도 목록 넘김 허용 오차 수치, MediaLive 재동기 시 DISCONTINUITY 삽입 여부는 미확인. 초안은 해당 동작을 채워 넣지 않았다.
- **표준 상태**: bis-22는 확정 RFC가 아닌 초안이며 표기 만료일이 결정일과 같다. RE의 「최신 22판」 판정은 역사적 기록으로만 사용한다. 이번 초안은 「최신판」을 주장하지 않고 판과 날짜를 고정했다.

## 시각화·문법·검토 범위

> 이 절과 「최종 정적 검사」 절은 미디어 삽입 전, Codex 초안 작성 시점의 기록이다. 미디어 삽입 뒤의 출처와 검사는 맨 끝 「미디어 삽입 뒤 기록」 절에 적는다.

- **대표 이미지**: 사용자 지정 HERO 주석 한 줄만 도입 위에 둔다. 아직 이미지나 실험 화면이 존재한다고 말하지 않는다.
- **흐름**: Mermaid 하나로 입력의 분기와 원본·재포장본 용도를 보여 준다. 요청이 표준 Markdown 내부 Mermaid이고 두 파일만 허용하므로 draw.io 추가 파일·내보내기는 수행하지 않는다. 흐름도는 측정 결과가 아닌 프로젝트 경로 설명이다.
- **비교**: 두 시계의 비교표, 전제 일곱 개 판정표, 결정 1·2 선택지 비교표만 사용한다. 임의 벤치마크·차트를 만들지 않는다.
- **설명 영상**: 결정 2 채택 규칙 설명 직후 MOTION 주석 한 줄만 둔다. 본문의 설명용 숫자로 정적 설명도 남겨 영상 없이 규칙을 읽을 수 있게 한다.
- **각주**: 현행 `src/lib/posts.mjs`는 markdown-it footnote 플러그인을 사용하지 않는다. 미지원 `[^id]` 대신 표준 Markdown 링크와 「용어 각주」의 번호 달린 제목으로 연결한다. 새 렌더러 문법·HTML 태그를 추가하지 않는다.
- **검토**: blog-quality-reviewer·article-style-checker의 관점으로 작성자가 자체 검토한다. 별도 에이전트를 호출했다고 하지 않는다. 구현 글의 코드 완성도는 해당 없음. 설명·선택·한계의 설계 기록에 맞춰 검토한다.
- **화면 검수**: 두 파일만 만들라는 범위를 지키기 위해 빌드 산출물·스크린샷·테스트 보고서를 생성하는 전체 빌드·layout 검사는 수행하지 않는다. Markdown·frontmatter·링크·표·Mermaid의 파일을 만들지 않는 정적 검사를 수행하고 그 결과만 아래에 기록한다. 실제 데스크톱·모바일 화면 검수와 공개 배포 검증은 미완료다. 전체 발행 검토 통과로 표시하지 않는다.

## 최종 정적 검사

- `gray-matter` 파싱: 지정 날짜·저자·categories·tags·`draft: true` 일치. 제목·description 존재, weight 없음.
- 현행과 같은 markdown-it·anchor 설정의 메모리 내 Markdown 렌더: 성공. 표 4개, Mermaid 코드 블록 1개. 흐름도는 노드 10개·간선 9개인 정적 구조를 확인했다.
- 본문의 링크 75개 중 외부 고유 URL은 26개. URL 문법·HTTPS와 모든 문서 내부 앵커를 검사했다. 외부 26개 전체의 응답·내용을 새로 검증했다는 뜻은 아니다.
- 금지 패턴 검사: 공개 초안에 Jira·ADR·판 약칭·위키 PR·내부 경로·저자 핸들 없음. 물결표·절 기호·이미지·video·iframe 태그·미지원 각주 문법 없음. 상류 이슈·PR은 저장소 이름을 붙였다.
- HERO와 MOTION 주석은 정확히 한 번씩 존재한다. HERO는 첫 문단 위, MOTION은 결정 2 채택 규칙 설명 뒤에 있다.
- Mermaid의 실제 런타임 parse는 완료하지 못했다. 설치된 Mermaid를 Node에서 실행하자 `TypeError: DOMPurify.addHook is not a function`으로 중단됐다. 브라우저 DOM 없는 실행 환경의 오류이며, 문법 통과나 화면 렌더 성공으로 기록하지 않는다. 사이트의 보안 설정·의존성을 바꾸지 않았다.
- 글 구조·근거·수치·역할은 작성자가 자체 검토했다. 앞서 적은 원문 차이를 반영했고, 「채택 효과」와 「실측 완료」를 분리했다. 새 구현의 성능·정밀도 통과 판정은 하지 않았다.
- 실제 화면·모바일·다크 모드 검수와 `npm run build`, 전체 테스트, layout 검사는 미수행이다. 초안 작성 범위가 끝난 것이며 발행 검토 통과를 뜻하지 않는다.
- 이번에 만든 파일은 요청받은 `draft.md`, `evidence.md` 두 개다. 작업 도중 다른 경로의 미추적 이미지·영상이 나타났지만 이번 작성 도구가 생성한 파일이 아니며 열거나 수정하지 않았다.

## 미디어 삽입 뒤 기록

- **대표 이미지** `/images/pokeclip-pdt-hero.jpg`: Codex CLI 0.165.0 내장 `image_gen`(ChatGPT 로그인, 호출 모델 표기 gpt-6.1-sol)으로 2026-11-02 생성. 원본 PNG 1672×941 → JPEG 품질 85. 글자 · 숫자 · 로고 없음을 직접 확인. 장식용 일러스트이며 실험 화면이 아니다.
- **설명 영상** `/videos/pokeclip-pdt-chapters.mp4` · 포스터 `/images/pokeclip-pdt-chapters-poster.jpg`: 저자 지시로 Claude Code 가 Remotion 4.0.539 로 2026-11-02 제작. 1920×1080 · 30fps · H.264 · 소리 없음. 원본 프로젝트는 저장소 밖(`pokeclip-pdt-motion`). 모든 화면 문구는 재료 정리본 1.2 · 2 · 4 · 5절에서만 가져왔고, 4초 조각 · ±0.1초 · 0.2초는 설명용 값이라고 캡션에 밝혔다.
- **검수 1라운드(cc · codex 듀얼)**: 양쪽 HIGH 1건(영상 장면 2의 「프레임 1–3장」 — 실측 근거 없음)은 영상 문구를 고쳐 다시 렌더했다. 본문 MEDIUM · LOW 중 실측 수행 주체, +5초 시험 조건, 재생 매끄러움 단정, 「정정」 제목, 「섞기」 이름 풀이, 굵게 표시 깨짐, ±0.25초 표기, 출처 표기, 흐름도 줄바꿈을 반영했다. 단서 문장 정리(cc MEDIUM)와 문턱 단서 반복(codex LOW)은 이번 발행에서 손대지 않았다.
- **확인 패스(cc · codex 듀얼)**: 양쪽 HIGH 해소 확인, codex 0건 · cc LOW 4건. 본문 LOW 3건(75 · 77 · 19행 문장)은 반영했다. 영상 장면 6 · 포스터의 「조각은 이어 붙어 있어」를 「재포장 영상은」으로 좁히자는 LOW 는 재렌더가 필요해 다음 수정으로 미뤘다.
- **남은 지적 정리(2026-11-02 발행 뒤 수정)**: 단서 문장 30개 → 11개(Codex 집계)로 줄이고 한계 절 「이 글이 주장하지 않는 것」 7항목으로 모았다. 문턱 단서는 한계 절 한 곳으로, 처음 나오는 서비스 이름 7개에 풀이를 붙였다. 흐름도는 모바일에서 녹화 경로와 DB 조각 장부가 한 화면에 들어오도록 마지막 단계(렌더 · 되감기 용도)를 본문 문장으로 옮겼다. 영상은 장면 1 「파일에 기록된 시간값」 · 「흔들림(예 ±0.1초)」, 장면 2 부제와 카드, 장면 4 문구, 장면 6 · 포스터 「재포장 영상은」으로 다시 렌더했다.
- **2차 확인 패스(cc · codex 듀얼)**: cc MEDIUM 2(재포장본 문장과 HLS 인용 위치, 마크 풀이 — 마크는 스트리머 · 편집자가 만든다) · LOW 7, codex LOW 1(인과관계 문장)을 모두 리뷰어 제안 문장대로 반영했다. 공개 글의 제목 앵커는 바꾸지 않았다.
