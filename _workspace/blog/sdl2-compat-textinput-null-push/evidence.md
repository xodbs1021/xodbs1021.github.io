# 근거 메모 — sdl2-compat-textinput-null-push

유형: 트러블슈팅(증상 → 구조 → 원인 소스 행 → 대조 실측 → 최신판 → 회피책 · 한계 → 덤: SIP). 공개 라이브러리 동작 해설이라 tech-blurting 폴더, categories `technical-notes`.

## 역할

- 발견 · 원인 분석 · 재현(2026-10): AI 에이전트(Claude Code · Codex). 근거: 비공개 연구 저장소 검증 기록(인용하지 않음, 사실 확인만).
- 공개 재측정 · 글 작성(2026-11-18): AI(Claude Code).
- 글의 「제가」 문장: 없음. 이번 글의 결정(이름 규칙 · 제목 · 범위)도 사용자 부재 중 Claude와 Codex의 토론으로 정해져, 사용자 결정으로 쓰지 않았다.

## 이름 · 공개 범위

- 게임 이름 · 맵 · 회사 · 엔진 저장소 이름은 쓰지 않는다. 엔진은 「SDL2로 만든 오픈소스 게임 엔진」으로만 쓰고 링크 · 라이선스는 싣지 않았다(원칙적 생략).
- 비공개 기록에서 옮긴 사실(요약만): 2026-10 시험 묶음이 Homebrew sdl2-compat 2.32.70 · SDL3 3.4.12에서 SDL_TEXTINPUT을 넣는 메뉴 입력 시험 하나로 SIGSEGV, 위치 SDL3_PushEvent, lldb로 NULL 접근 재현, SDL 2.32.10(5d249570)에 명시적으로 다시 링크하자 실패 0, make에 DYLD_LIBRARY_PATH를 줘도 자식에 안 먹어 다시 링크.

## 사실 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| sdl2-compat은 SDL2 API, 안에서 SDL3 | sdl2-compat README @2758e13e | 문헌 |
| macOS에서 @loader_path/libSDL3.dylib 먼저 | sdl2_compat.c L405-L414 @2758e13e | 코드 |
| Homebrew `sdl2` = sdl2-compat 별칭 | `brew info sdl2`(Aliases: sdl2) · formulae.brew.sh | 실측 · 문헌 |
| SDL3 머리 16바이트(type 4 · reserved 4 · timestamp 8), SDL2 8바이트 | SDL_events.h @3.4.20 L296-L301 · SDL2 헤더 | 코드 |
| SDL2 TextInputEvent text[32], SDL3 const char *text | SDL2 헤더 L288-L294 @5d249570 · SDL3 헤더 L426-L433 @f00dc919 | 코드 |
| Event2to3 TEXT_INPUT → return NULL, SDL_PushEvent가 바로 SDL3_PushEvent | raw/source.txt · 링크 행 | 코드 |
| SDL3 SDL_PushEvent 첫 줄 event->common.timestamp, NULL 확인 없음(3.4.12 · 3.4.18 · 3.4.20 · main) | raw/source.txt | 코드 |
| 크래시 주소 0x8 · x0 0 · 프레임 | raw/matrix/crash-*-textinput-*.txt | 실측(공개) |
| 2024-07-26 SDL3 임시 메모리 공개 API 제거(4f552715 · 538adc52), 같은 날 sdl2-compat eb998ef6이 복사 코드 → return SDL_FALSE, c58706e9(2024-08-27)에서 NULL | raw/source.txt · 커밋 | 코드 |
| 이전 코드는 SDL3_AllocateTemporaryMemory로 포인터를 채움 | eb998ef^ 1332-1338 | 코드 |
| 이슈 106(2023-11) · PR 107 | gh issue view 106 · gh search prs | 문헌 |
| 첫 릴리스 2.30.50(2025-01-21)부터 포함 | git tag --contains eb998ef | 코드 |
| PeepEvents ADDEVENT는 반환값 무시, poll 때 Event3to2 strlcpy에서 죽음, 0x0 · 0x6c6b6a6968676660 | 코드 L3135-L3157 · raw/matrix/crash-*-peep-* | 코드 · 실측 |
| 판별 표 | raw/matrix/results.tsv · run-*.txt · *.libs | 실측(공개) |
| 최신 릴리스 sdl2-compat 2.32.74(2026-10-02), SDL 3.4.20(2026-11-03) | gh release list(2026-11-18) | 문헌 |
| 세 판 SDL_PushEvent 본문 동일 | raw/source.txt md5 3개 같음 | 코드 |
| 이슈 · PR에 같은 보고 없음 | gh search issues/prs "SDL_TEXTINPUT" · "PushEvent" · "text input"(2026-11-18) | 검색(범위 한정) |
| SIP 표 | raw/sip.txt | 실측(공개) |
| Apple: dyld 환경 변수는 보호된 프로세스를 띄울 때 지워짐 | SIP Guide Runtime Protections(2026-11-18 확인, 원문 문장 대조) | 문헌 |

## 확인하지 않은 것

- Linux · Windows, x86_64, SDL_TEXTEDITING · DROP 이벤트.
- lldb 스택(개발자 모드 꺼짐) — 크래시 보고서로 대신.
