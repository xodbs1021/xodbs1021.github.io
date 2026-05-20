---
title: GitHub Pages 블로그 자동화 구축기1
date: 2026-05-20T08:37:47.360Z
categories:
  - 0-to-1
---


- - -

## 1. 개요

본 문서는 기술 블로그 운영 자동화 시스템의 기획 배경, 구축 과정, 트러블슈팅 이력 및 최종 아키텍처를 기술한 보고서이다. 초기 티스토리 기반 자동화 구상에서 출발하여, 플랫폼 전환 및 복수의 기술 스택을 통합함으로써 GitHub Issue 작성만으로 블로그 포스팅이 완료되는 완전 자동화 파이프라인을 구현하였다.

- - -

## 2. 기획 배경

기술 블로그의 카테고리 중 하나인 **Tech Blurting**은 정제되지 않은 학습 내용을 빠르게 기록하고, AI 피드백을 통해 보완하는 형식을 지향한다. 초기에는 티스토리 플랫폼과 공식 Open API를 활용하여 자동 업로드 파이프라인 구축을 계획하였으나, 티스토리 Open API가 2024년 2월 완전 종료된 사실을 확인함에 따라 플랫폼 전환이 불가피하였다.

카테고리 구성은 다음과 같이 4개로 정의하였다.

| 카테고리                 | 설명                 |
| -------------------- | ------------------ |
| Tech Blurting        | 학습 내용 블러팅 및 AI 피드백 |
| Coding Test          | 코딩테스트 풀이 및 분석      |
| Open Source Analysis | 오픈소스 분석 및 학습       |
| 0 to 1               | 직접 구축한 프로젝트 기록     |

- - -

## 3. 플랫폼 선택

WordPress와 GitHub Pages를 비교 검토한 결과, 아래 이유로 **GitHub Pages + Hugo** 조합을 채택하였다.

* 마크다운 기반으로 AI 글 생성에 최적화
* Git push 단일 명령으로 배포 자동화 가능
* 카테고리 확장이 프론트매터 한 줄 수정으로 처리됨
* 완전 무료, 광고 없음
* 개발자 기술 블로그로서 적합한 생태계

테마는 **PaperMod**를 채택하여 다크모드, 카테고리 네비게이션, 읽기 시간 표시 등의 기능을 활용하였다.

- - -

## 4. 구축 과정 및 트러블슈팅

### 4-1. 초기 세팅

Homebrew를 통해 Hugo 및 Git을 설치하고, GitHub 저장소 `xodbs1021.github.io`를 생성하였다. Hugo 프로젝트 초기화 및 PaperMod 테마를 서브모듈로 연결하였으며, `hugo.toml`에 카테고리별 메뉴를 구성하였다.

> **트러블 1.** GitHub push 시 인증 오류 발생
> PAT(Personal Access Token) 발급이 필요하였으며, 초기 발급 시 `workflow` scope 누락으로 인해 `.github/workflows` 파일 push가 거부되었다. scope를 포함하여 재발급함으로써 해결하였다.
>
> **트러블 2.** GitHub Actions `deploy.yml` 실패
> `peaceiris/actions-gh-pages@v4`가 Node.js 20 deprecated 경고와 함께 exit code 128을 반환하였다. `permissions` 블록을 추가하고 `fetch-depth: 0` 옵션을 설정하여 해결하였다.
>
> **트러블 3.** GitHub Pages 404 오류
> 배포 브랜치가 `main`으로 설정되어 있었으나, Actions가 빌드 결과를 `gh-pages` 브랜치에 push하는 구조였다. Pages 설정에서 소스 브랜치를 `gh-pages`로 변경하여 해결하였다.

- - -

### 4-2. 자동화 방식의 발전

**1단계 — Claude.ai Artifact 반자동화 시도**
Artifact 내에서 공부 내용 입력 → Claude 피드백 → 터미널 명령어 생성 방식을 구현하였으나, Artifact는 브라우저 샌드박스 내에서 동작하므로 로컬 파일시스템 및 터미널에 직접 접근이 불가능하였다.

**2단계 — 로컬 Python 스크립트**
Gemini API를 활용하여 로컬에서 실행되는 Python 스크립트를 작성하였다. 공부 내용 터미널 입력 → Gemini 피드백 생성 → 마크다운 파일 생성 → git push까지 자동화하였다.

> **트러블 4.** `google.generativeai` 패키지 deprecated → `google-genai`로 교체
>
> **트러블 5.** `gemini-2.0-flash` 모델 deprecated → `gemini-2.5-flash`로 교체
>
> **트러블 6.** API 키 채팅창 노출로 인한 키 차단 → 신규 발급 후 GitHub Secret에만 등록

**3단계 — GitHub Actions 완전 자동화**
터미널 입력 자체를 제거하고, GitHub Issue를 트리거로 사용하는 완전 자동화 파이프라인을 구축하였다.

> **트러블 7.** YAML 내 Python 코드 특수문자 충돌 → Python 스크립트를 별도 파일로 분리
>
> **트러블 8.** 봇 커밋이 `deploy.yml` 미트리거 → `auto-post.yml`에 Hugo 빌드+배포 직접 포함
>
> **트러블 9.** Gemini가 글쓰기 조언 반환 → 프롬프트에 기술적 보완만 요청하도록 제약 조건 명시

- - -

### 4-3. 관리 UI 구축

**Netlify CMS**를 채택하여 `/admin` 경로에 콘텐츠 관리 인터페이스를 구현하였다.

> **트러블 10.** GitHub Pages에서 Netlify OAuth 엔드포인트 Not Found
>
> **트러블 11.** 오픈소스 대안 `sveltia-cms-auth` 서버 다운
>
> → **Cloudflare Workers**에 직접 GitHub OAuth 프록시를 구축하여 해결

- - -

## 5. 최종 아키텍처

{{< rawhtml >}}
<svg width="100%" viewBox="0 0 680 600" xmlns="http://www.w3.org/2000/svg" style="font-family:sans-serif;">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>

  <!-- 레이어 라벨 -->

  <text x="24" y="68" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#888">입력</text>
  <text x="24" y="198" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#888">처리</text>
  <text x="24" y="328" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#888">AI</text>
  <text x="24" y="428" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#888">빌드</text>
  <text x="24" y="528" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#888">배포</text>

  <!-- Row 1: 입력 -->

  <rect x="80" y="40" width="200" height="56" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
  <text x="180" y="65" text-anchor="middle" font-size="14" font-weight="500" fill="#3C3489">GitHub Issue</text>
  <text x="180" y="83" text-anchor="middle" font-size="12" fill="#534AB7">@카테고리 + 공부 내용</text>

  <rect x="400" y="40" width="200" height="56" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
  <text x="500" y="65" text-anchor="middle" font-size="14" font-weight="500" fill="#3C3489">블로그 /admin</text>
  <text x="500" y="83" text-anchor="middle" font-size="12" fill="#534AB7">Netlify CMS GUI</text>

  <!-- 입력 → 처리 -->

  <line x1="180" y1="96" x2="180" y2="170" stroke="#7F77DD" stroke-width="1" marker-end="url(#arrow)"/>
  <line x1="500" y1="96" x2="500" y2="170" stroke="#7F77DD" stroke-width="1" marker-end="url(#arrow)"/>

  <!-- Row 2: 처리 -->

  <rect x="80" y="170" width="200" height="56" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
  <text x="180" y="195" text-anchor="middle" font-size="14" font-weight="500" fill="#085041">GitHub Actions</text>
  <text x="180" y="213" text-anchor="middle" font-size="12" fill="#0F6E56">auto-post.yml</text>

  <rect x="400" y="170" width="200" height="56" rx="8" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.5"/>
  <text x="500" y="195" text-anchor="middle" font-size="14" font-weight="500" fill="#633806">Cloudflare Workers</text>
  <text x="500" y="213" text-anchor="middle" font-size="12" fill="#854F0B">GitHub OAuth 프록시</text>

  <!-- Cloudflare ↔ Admin 양방향 (오른쪽 우회) -->

  <path d="M600 170 L640 170 L640 68 L600 68" fill="none" stroke="#BA7517" stroke-width="1" stroke-dasharray="5 3" marker-end="url(#arrow)"/>

  <!-- Actions → Gemini -->

  <line x1="180" y1="226" x2="180" y2="300" stroke="#1D9E75" stroke-width="1" marker-end="url(#arrow)"/>

  <!-- Row 3: AI -->

  <rect x="80" y="300" width="200" height="56" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
  <text x="180" y="325" text-anchor="middle" font-size="14" font-weight="500" fill="#085041">Gemini 2.5 Flash</text>
  <text x="180" y="343" text-anchor="middle" font-size="12" fill="#0F6E56">피드백 + 제목 생성</text>

  <!-- Gemini → Hugo 왼쪽 중앙 -->

  <path d="M180 356 L180 428 L290 428" fill="none" stroke="#1D9E75" stroke-width="1" marker-end="url(#arrow)"/>

  <!-- Admin → Hugo 오른쪽 중앙 -->

  <path d="M500 226 L500 428 L490 428" fill="none" stroke="#BA7517" stroke-width="1" stroke-dasharray="5 3" marker-end="url(#arrow)"/>

  <!-- Row 4: 빌드 -->

  <rect x="290" y="400" width="200" height="56" rx="8" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
  <text x="390" y="425" text-anchor="middle" font-size="14" font-weight="500" fill="#2C2C2A">Hugo 빌드</text>
  <text x="390" y="443" text-anchor="middle" font-size="12" fill="#5F5E5A">마크다운 → HTML</text>

  <!-- Hugo → Pages -->

  <line x1="390" y1="456" x2="390" y2="500" stroke="#5F5E5A" stroke-width="1" marker-end="url(#arrow)"/>

  <!-- Row 5: 배포 -->

  <rect x="270" y="500" width="240" height="56" rx="8" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
  <text x="390" y="525" text-anchor="middle" font-size="14" font-weight="500" fill="#0C447C">GitHub Pages</text>
  <text x="390" y="543" text-anchor="middle" font-size="12" fill="#185FA5">xodbs1021.github.io</text>

  <!-- 범례 -->

  <line x1="80" y1="582" x2="104" y2="582" stroke="#1D9E75" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="110" y="586" font-size="11" fill="#888">자동 파이프라인 (Issue 경로)</text>
  <line x1="340" y1="582" x2="364" y2="582" stroke="#BA7517" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#arrow)"/>
  <text x="370" y="586" font-size="11" fill="#888">CMS 경로 (/admin)</text>
</svg>
{{< /rawhtml >}}

- - -

## 6. 결론

본 프로젝트를 통해 GitHub Issue 작성이라는 단일 액션만으로 AI 피드백이 포함된 기술 블로그 포스팅이 자동 완료되는 파이프라인을 구현하였다. 또한 `/admin` 인터페이스를 통해 GUI 기반의 콘텐츠 관리도 가능하게 하였다. 향후 카테고리 추가 시 `hugo.toml`, `config.yml`, `generate_post.py` 세 파일에 항목을 추가하는 것으로 확장이 가능하다.