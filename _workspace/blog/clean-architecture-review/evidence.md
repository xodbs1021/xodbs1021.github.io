# 근거 메모 — clean-architecture-review (2026-11-14, 독립 리뷰 반영)

유형: 글 유형표에 서평이 없어 가장 가까운 뼈대(책이 풀려는 문제 → 핵심 개념 → 원칙과 긴장 관계 → 짧은 감상 → 출처)를 썼다. 공개 근거만 적는다. 책 원문은 이번 작업에서 다시 대조하지 못했으므로, 장 번호와 문구는 아래 공개 2차 자료와 겹치는 범위에서만 썼다.

## 서지 (2026-11-14 확인)

| 항목 | 값 | 근거 |
|---|---|---|
| 제목 | 클린 아키텍처: 소프트웨어 구조와 설계의 원칙 | YES24 https://www.yes24.com/Product/Goods/77283734 (WebFetch 본문 확인) |
| 저자 · 역자 · 출판사 | 로버트 C. 마틴 지음, 송준이 옮김, 인사이트 | 같은 곳 |
| 출간일 · 쪽수 · ISBN | 2019-08-20, 432쪽, 9788966262472 | 같은 곳 |
| 원서 | Clean Architecture: A Craftsman's Guide to Software Structure and Design | 같은 곳 |
| 저자 소개 | 「1970년부터 프로그래머로 일해 왔다」 | 같은 곳 저자 소개 |
| 알라딘 | 2019-08-20, 432쪽, ISBN 9788966262472 | https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=202322454 (2026-11-14 curl 본문에서 432쪽 · ISBN · 출간일 · 역자 확인) |
| 교보문고 | https://product.kyobobook.co.kr/detail/S000001033082 | 본문이 스크립트 렌더라 curl · WebFetch 모두 빈 본문(HTTP 200, 0바이트). ISBN 주소 https://mobile.kyobobook.co.kr/showcase/book/KOR/9788966262472 가 이 상품으로 308 이동하는 것으로 같은 책임을 확인. 검색 결과 요약에는 2019년 08월 20일 출간이 보였으나 쪽수는 410쪽으로 다르게 보임(본문 미확인) |
| 출판사 | https://ebook.insightbook.co.kr/book/69 (전자책) | HTTP 530으로 열리지 않음. insightbook.co.kr 은 DNS 실패. 링크하지 않음 |

## 주장 ↔ 장 번호 ↔ 공개 근거 (모두 문헌 해설)

| 주장 | 장 | 공개 근거 |
|---|---|---|
| 1장 순서: 설계 = 아키텍처 → 목표 정의 → 사례 | 1장 | serodriguez68 part-1(설계와 아키텍처 구분 없음 → 목표), 독립 리뷰의 원서 대조 |
| 아키텍처의 목표 인용문 | 1장 | dongjunlee.github.io/book/Clean_Architecture/ (1장 아래 같은 문장), renuevo.github.io/notion/clean-architecture-1/ |
| 출시마다 인원은 늘고 생산성은 멈춘 사례, 「나중에 정리」 | 1장 | 검색 요약(wikidocs 167362 · velog 정리, 본문 403으로 직접 확인 못 함) — 본문에서는 수치 없이 정성 서술만 |
| 행위 · 구조 두 가치, 긴급 · 중요 행렬 | 2장 | github.com/serodriguez68/clean-architecture part-1 |
| 세 패러다임이 goto · 함수 포인터 · 할당을 제한, 아키텍처 세 관심사 대응 | 3장 | jandari91.github.io/posts/PPPCleanArchitecture_ch3/ (결론 원문) |
| 다형성 → 제어 흐름과 소스 의존성 방향 분리, 플러그인 | 5장 | serodriguez68 part-2 Ch5 |
| 가변 변수가 경쟁 · 교착 · 동시 갱신 문제 원인, 가변 · 불변 컴포넌트 분리 | 6장 | serodriguez68 part-2 Ch6 |
| SRP = 한 액터 | 7장 | 책의 널리 알려진 정의(2차 자료 다수) |
| 휘발성 구체 클래스 의존 금지, 안정 구체는 허용 | 11장 | serodriguez68 part-3 Ch11 |
| REP = 재사용 단위는 릴리스 단위, CCP, CRP 정의 | 13장 | yhancsx.github.io/programming/clean-architecture-part4/ |
| REP · CCP 포함(키움), CRP 배제(줄임) | 13장 | yhancsx(위), serodriguez68 part-4 |
| 긴장 삼각형 변 = 맞은편 원칙 포기 비용 | 13장 | yhancsx(간선 해석 문장), jehuipark.github.io/architecture/compoent-architecture-think(희생 비용 세 가지) |
| 초기에는 REP를 희생하고 CCP · CRP 쪽, 성숙하면 REP 쪽으로(CCP 희생) | 13장 | github.com/aj03794/clean-architecture README 13장 노트(「Projects tend to start on right hand side of the triangle, where only sacrifice is reuse」, 「slide over to left」), yhancsx(초기 CCP). 독립 리뷰가 원서 13장 · 그림 13.1과 대조해 방향 확인(원서 사본은 링크하지 않음) |
| 순환 의존성을 DIP · 새 컴포넌트로 끊음, SDP · SAP | 14장 | serodriguez68 part-4 Ch14 |
| 목적은 개발 · 배포 · 운영 · 유지보수, 선택지를 오래 열어 둠, 아키텍트는 프로그래머 | 15장 | serodriguez68 part-5-1 Ch15, dongjunlee(15장 인용) |
| 경계를 일찍 긋는 이유 = 결정 미루기 · 업무 규칙 오염 방지 | 17장 | serodriguez68 part-5-1 Ch17 인용문 |
| 소리치는 아키텍처 | 21장 | serodriguez68 part-5-1 Ch21 (헬스케어 예는 옛 글에서 유지) |
| 의존성 규칙, 네 원, 경계를 넘는 단순 데이터, 원은 넷이 아니어도 됨 | 22장 | 저자 블로그 https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html (1차 공개 근거, 「The Dependency Rule」 · 「Only Four Circles?」 확인), serodriguez68 part-5-2 Ch22 |
| 험블 객체, 프레젠터 · 뷰 모델, DB 게이트웨이 | 23장 | serodriguez68 part-5-2 Ch23 |
| 부분적 경계 셋(마지막 단계를 건너뛰기 · 일차원 경계 · 퍼사드)과 위험 | 24장 | jandari91.github.io/posts/PPPCleanArchitecture_ch24/ |
| 경계를 긋는 비용 대 무시하는 비용 | 25장 | serodriguez68 part-5-2 Ch25 |
| DB 도구 · 웹 · 프레임워크는 세부사항, 비대칭 결혼, 유스케이스는 데이터가 테이블 행이라는 사실을 몰라야 함 | 30–32장 | serodriguez68 part-6, 30장 문장은 독립 리뷰의 원서 대조(옛 「함수 몇 개만 알면 된다」는 17장에 가까워 바꿈) |
| 부 · 장 목차(4부 12–14장, 5부 15–29장, 6부 30–34장), 13장 절 「컴포넌트 응집도에 대한 균형 다이어그램」 | — | YES24 목차 |
| 원서 2017년 | — | 독립 리뷰 지적, 원서 판권 |

## 정정한 사실

- 옛 글 「CCP와 CRP는 반대 방향으로 당긴다」 → REP · CCP는 포함(키움), CRP는 배제(줄임)이고 셋이 긴장 삼각형을 이룸(yhancsx · serodriguez68).
- 옛 글 「함께 배포되는 것은 함께 묶고(REP)」 → 「재사용 단위는 릴리스 단위와 같음」(yhancsx).
- 옛 글 부분적 경계 「인터페이스만 두거나, 단방향 경계만 두거나」 → 24장의 세 방법(jandari91 24장).
- 옛 글 「함수형 → 상태를 격리해 컴포넌트 간 의도치 않은 의존을 끊는다」 → 3장 결론(데이터 위치 · 접근 규율)과 6장(가변 · 불변 분리)으로 바꿈.
- 「50년이 넘게 프로그래머」 → 「1970년부터 프로그래머로 일한」(YES24 저자 소개). 「바이블로 불리는」 삭제.

## 감상(원문에 있던 것만)

대학 프로젝트 경험, 규모가 아니라 변경 비용의 문제, 의존성 방향 뒤집기부터, e-book으로 읽어 그림 따라가기 어려움 — 한 문단으로 압축. 「종이책으로 다시 읽겠다」 · 「그때 알았다면」 · 패러다임 장 연결 소감 · 험블 객체 인상은 뺐다.

## 독립 리뷰 반영 (2026-11-14, C 0 / H 0 / M 4 / L 10)

리뷰어가 원서 본문 사본과 대조했다. 그 사본은 허가 여부를 알 수 없어 글과 이 메모에 링크하지 않는다. 공개 링크는 위 표의 자료만 쓴다.

- 첫 문단 마지막 문장: 응집도 원칙은 의존 방향과 무관하므로 DIP · SDP · 의존성 규칙으로 좁힘.
- 1장 순서: 목표 정의 → 사례로 바꿈.
- 13장 성숙도 문장: REP 희생 → REP 쪽 이동(CCP 희생)으로 구체화, aj03794 노트를 근거로 추가.
- 감상 소제목: 「보게 됐습니다」(일어난 변화) → 「읽고 나니 … 변경 비용의 문제로 보였습니다」(원문 범위).
- 그림 1: Mermaid가 삼각형으로 배치하지 않아 캡션을 「세 원칙과 그 사이 선」으로, 꼭짓점 · 변 문구 모두 풀어 쓴 것이라고 고지.
