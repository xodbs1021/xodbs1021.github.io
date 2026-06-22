### N. 운영체제 (6 시리즈)

**갯수 근거**: 백엔드 면접 단골. 프로세스/메모리/스케줄링/동기화/파일/IO = 6 핵심. 유지.

#### N-1: 프로세스 + 스레드
- hook: 백엔드 면접 단골
- 핵심 항목: 프로세스 정의 / 상태 / PCB / Context switch / fork() / exec() / 좀비/고아 / 스레드 / 사용자 vs 커널 스레드 / 멀티스레드 장단점 / 비교
- 다루지 않는 것: Python GIL (B-5)
- PokéClip 적용: 워커 설계 직관
- 면접 답변 주제: "프로세스 vs 스레드"

#### N-2: 메모리 관리
- hook: OOM 방지 / 성능
- 핵심 항목: 가상 메모리 / 페이지 / 페이지 테이블 / Page fault / Swap / TLB / malloc / heap / 스택 vs 힙 / Python GC / 메모리 누수 패턴 / mmap
- 다루지 않는 것: 컴구조 (P)
- PokéClip 적용: OOM 방지
- 면접 답변 주제: "가상 메모리 / Stack vs Heap"

#### N-3: 스케줄링
- hook: OS의 프로세스 분배
- 핵심 항목: 스케줄링 종류 (FCFS/SJF/Priority/Round Robin/Multilevel) / Preemptive vs Non-preemptive / CFS / Linux nice / I/O bound vs CPU bound / 우선순위 역전
- 다루지 않는 것: 실시간 OS
- PokéClip 적용: 분석 작업 스케줄링 직관
- 면접 답변 주제: "Linux 스케줄링"

#### N-4: 동기화 + 락 + 데드락
- hook: 멀티스레드의 함정
- 핵심 항목: Race condition / Critical section / Mutex / Semaphore / Spinlock / Read-write lock / 데드락 4조건 / 데드락 방지 / Lock-free / CAS / Monitor 개념
- 다루지 않는 것: 분산 락 (F-12)
- PokéClip 적용: 동시성 제어
- 면접 답변 주제: "데드락 / Mutex vs Semaphore"

#### N-5: 파일 시스템
- hook: 파일 IO 병목 직관
- 핵심 항목: 파일 시스템 구조 (Inode/디렉토리/블록) / ext4 / XFS / Symbolic vs Hard link / 권한 / 파일 디스크립터 / Buffered IO / Direct IO / Page cache / fsync
- 다루지 않는 것: 분산 파일 시스템
- PokéClip 적용: 영상 IO 최적화
- 면접 답변 주제: "파일 시스템 캐싱"

#### N-6: I/O + epoll/kqueue
- hook: 비동기 IO의 OS 레벨
- 핵심 항목: Blocking vs Non-blocking / Synchronous vs Asynchronous / I/O 모델 5가지 / select / poll / epoll / kqueue / io_uring 개요 / Reactor 패턴 / Event loop 구현
- 다루지 않는 것: 커널 깊이
- PokéClip 적용: FastAPI/asyncio OS 기반
- 면접 답변 주제: "epoll / C10K"
