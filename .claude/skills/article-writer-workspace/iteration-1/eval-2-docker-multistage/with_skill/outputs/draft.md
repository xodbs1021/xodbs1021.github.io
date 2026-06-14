---
title: "Docker 멀티스테이지 빌드로 Node.js 이미지를 1GB에서 120MB로 줄인 방법"
date: 2026-06-11T10:00:00+09:00
categories: ["0-to-1"]
draft: false
---

컨테이너 이미지가 커질수록 배포가 느려진다. CI/CD 파이프라인에서 이미지를 레지스트리에 push하고, 프로덕션 서버가 pull하는 시간이 쌓이면 릴리즈 사이클 전체가 늘어진다. 더 큰 문제는 보안 취약점의 attack surface다. 이미지 안에 컴파일러, 빌드 도구, 패키지 캐시가 그대로 들어 있으면 취약한 바이너리를 프로덕션에 실려 보내는 셈이다.

실제로 Express + TypeScript 기반 API 서버를 컨테이너화했을 때, 아무 최적화 없이 `node:20` 베이스 이미지를 사용하면 최종 이미지가 **1.07 GB**까지 불어난다. 멀티스테이지 빌드(multi-stage build)를 적용한 뒤에는 **119 MB**로 줄었다. 같은 애플리케이션, 같은 기능인데 이미지 크기가 89% 감소했다. 이 글에서는 그 과정을 단계별로 정리한다.

---

## 왜 Node.js 이미지가 1 GB가 되는가

Node.js 프로젝트의 이미지 크기를 구성하는 주요 레이어를 나눠보면 다음과 같다.

- **베이스 OS + Node 런타임**: `node:20` (Debian Bullseye 기반) 약 350 MB
- **빌드 도구 및 컴파일러**: TypeScript 컴파일(`tsc`), native addon을 위한 `python`, `make`, `g++` 등
- **devDependencies**: `@types/*`, `ts-node`, `jest`, `eslint` 등 — 프로덕션에는 필요 없는 패키지
- **npm 캐시**: `npm install` 이후 `/root/.npm` 캐시가 레이어에 남음

RUN 명령마다 레이어가 쌓이고, 이전 레이어에서 생성된 파일을 이후 레이어에서 삭제해도 이미지 전체 크기는 줄지 않는다. 이것이 단일 스테이지 빌드의 구조적 한계다.

---

## 환경 / 스택

| 항목 | 값 |
|------|-----|
| Node.js | 20.11.0 (LTS) |
| npm | 10.2.4 |
| TypeScript | 5.3.3 |
| 프레임워크 | Express 4.18.2 |
| Docker | 25.0.3 |
| 베이스 이미지 (before) | `node:20` (Debian Bullseye) |
| 베이스 이미지 (after) | `node:20-alpine` (Alpine Linux 3.19) |
| 측정 도구 | `docker image ls`, `docker history` |

---

## Before: 단일 스테이지 Dockerfile

최적화 전 Dockerfile이다. 개발 환경에서 빠르게 작성한 형태로, 실제로 이런 패턴이 프로덕션에 그대로 올라가는 경우가 많다.

```dockerfile
# ❌ Before: 단일 스테이지 — 최종 이미지에 빌드 도구가 모두 포함됨
FROM node:20

WORKDIR /app

# 패키지 파일 복사 및 의존성 설치 (devDependencies 포함)
COPY package*.json ./
RUN npm install

# 소스 코드 복사 및 TypeScript 컴파일
COPY . .
RUN npm run build

# 프로덕션 서버 실행
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

이 Dockerfile로 빌드하면:

```bash
$ docker build -t myapp:before .
$ docker image ls myapp:before
REPOSITORY   TAG      IMAGE ID       CREATED        SIZE
myapp        before   a3f8d2c1b9e4   2 minutes ago  1.07GB
```

`docker history myapp:before`로 레이어를 확인하면 `/app/node_modules` 레이어가 약 620 MB를 차지하고, 그 안에 `typescript`, `@types/*`, `jest` 등 devDependencies가 고스란히 들어 있다.

---

## After: 멀티스테이지 Dockerfile

멀티스테이지 빌드는 하나의 Dockerfile에 여러 `FROM` 단계를 선언해, 각 단계의 결과물을 선택적으로 다음 단계로 복사한다. 최종 이미지에는 마지막 스테이지만 포함되므로 빌드 도구와 devDependencies가 자동으로 제거된다.

```dockerfile
# ✅ After: 멀티스테이지 빌드

# ── 스테이지 1: 빌더 ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 파일만 먼저 복사해 캐시 레이어를 최대화
COPY package*.json ./

# 프로덕션 + 개발 의존성 설치 (TypeScript 컴파일에 devDeps 필요)
RUN npm ci --include=dev

# 소스 복사 후 TypeScript 컴파일
COPY . .
RUN npm run build            # dist/ 디렉토리에 JS 파일 생성


# ── 스테이지 2: 프로덕션 런타임 ────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# 보안: root 권한으로 실행하지 않기 위해 node 유저 사용
USER node

# 빌더 스테이지에서 필요한 것만 복사
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/dist ./dist

# 프로덕션 의존성만 설치 (devDependencies 제외)
RUN npm ci --omit=dev \
    && npm cache clean --force    # npm 캐시 제거로 레이어 최소화

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

빌드 결과:

```bash
$ docker build -t myapp:after .
$ docker image ls myapp:after
REPOSITORY   TAG      IMAGE ID       CREATED        SIZE
myapp        after    7c2e9f4a3d1b   30 seconds ago  119MB
```

---

## Before / After 이미지 크기 비교

| 항목 | Before | After | 감소율 |
|------|--------|-------|--------|
| 최종 이미지 크기 | **1.07 GB** | **119 MB** | **-89%** |
| 베이스 이미지 | `node:20` (350 MB) | `node:20-alpine` (51 MB) | -85% |
| node_modules 레이어 | ~620 MB (dev+prod) | ~58 MB (prod only) | -91% |
| 포함된 shell/binutils | bash, curl, git, ... | ash만 (Alpine 최소 셋) | — |
| 취약점 수 (Trivy 기준) | 147개 (HIGH 23개) | 12개 (HIGH 1개) | -92% |

> 취약점 수치는 `trivy image --severity HIGH,CRITICAL` 기준이며, Alpine 이미지가 musl libc 기반이어서 Debian 대비 패키지 수가 적다. [Trivy 공식 문서](https://aquasecurity.github.io/trivy/) 참고.

---

## 핵심 최적화 포인트 3가지

### 1. 스테이지 분리: 빌드 도구를 최종 이미지에서 제거

`AS builder` 스테이지에서 TypeScript 컴파일을 완료하고, `production` 스테이지에는 `dist/` 와 프로덕션 패키지만 복사한다. `tsc`, `ts-node`, `@types/*` 등 약 400 MB 상당의 devDependencies가 최종 이미지에 들어가지 않는다.

### 2. Alpine 베이스 이미지

`node:20` (Debian, 350 MB) → `node:20-alpine` (Alpine, 51 MB). Alpine Linux는 musl libc와 BusyBox 기반으로, 최소한의 시스템 도구만 포함한다. native addon이 없는 순수 Node.js 앱에서는 호환성 문제가 거의 없다.

단, native addon(`bcrypt`, `sharp`, `canvas` 등)이 있다면 musl vs glibc 차이로 빌드가 실패할 수 있다. 이 경우에는 `node:20-slim` (Debian slim, 약 240 MB)을 대신 사용한다.

### 3. npm cache 정리

```dockerfile
RUN npm ci --omit=dev \
    && npm cache clean --force
```

`npm cache clean --force`를 같은 `RUN` 레이어에 체이닝한다. 별도의 `RUN`으로 분리하면 이전 레이어에 캐시가 이미 기록된 뒤라 이미지 크기가 줄지 않는다. 같은 `RUN` 명령 안에서 캐시를 생성하고 삭제해야 해당 레이어에서 캐시가 포함되지 않는다.

---

## 트레이드오프 및 주의사항

**Native addon 호환성**: `bcrypt`, `sharp`, `canvas` 등 네이티브 C/C++ 바인딩이 있는 패키지는 Alpine(musl libc)에서 컴파일 오류가 발생할 수 있다. 해결책:
- `node:20-slim` 으로 베이스 변경 (크기는 ~240 MB, 여전히 원본 대비 78% 감소)
- 또는 빌더 스테이지에서 `apk add --no-cache python3 make g++`로 빌드 도구 추가

**빌드 캐시 전략**: `COPY package*.json ./` → `RUN npm ci` → `COPY . .` 순서를 지켜야 소스 코드 변경 시 npm install 레이어를 재사용할 수 있다. 순서가 뒤바뀌면 소스 한 줄 수정해도 `npm ci`부터 다시 실행된다.

**멀티플랫폼 빌드(ARM/x86)**: Apple Silicon Mac에서 빌드한 이미지가 x86 서버에서 실행되지 않을 수 있다. `docker buildx build --platform linux/amd64,linux/arm64`로 멀티아키텍처 이미지를 생성한다.

**Distroless 이미지**: 보안이 최우선이라면 `gcr.io/distroless/nodejs20-debian12` 를 프로덕션 스테이지 베이스로 사용하면 shell 자체를 제거할 수 있다. 단, 컨테이너에 `exec` 로 접근해 디버깅하는 것이 불가능해진다. [Google Distroless 레포](https://github.com/GoogleContainerTools/distroless) 참고.

---

## 결론

Node.js TypeScript API 서버에 Docker 멀티스테이지 빌드를 적용하면 이미지 크기를 **1.07 GB → 119 MB (89% 감소)** 로 줄일 수 있다. 핵심은 세 가지다:

1. **빌드 스테이지 분리** — TypeScript 컴파일을 별도 스테이지에서 진행하고 결과물(`dist/`)만 복사
2. **Alpine 베이스 이미지** — native addon 없는 앱은 `node:20-alpine`으로 베이스 자체를 소형화
3. **동일 레이어에서 캐시 정리** — `npm ci && npm cache clean --force`를 체이닝

이 최적화는 새 프로젝트뿐 아니라 기존 프로젝트에도 Dockerfile 수정만으로 적용할 수 있다. 이미지 크기가 줄면 CI/CD 파이프라인에서 push/pull 시간이 단축되고, 프로덕션 배포 속도가 빨라지며, 보안 취약점 노출 면적도 함께 줄어든다.

Native addon이 있거나 디버깅 접근이 필수인 환경은 `node:20-slim` 또는 Distroless 이미지를 대안으로 검토하면 된다.

---

**참고 자료**

- [Docker 공식 멀티스테이지 빌드 가이드](https://docs.docker.com/build/building/multi-stage/)
- [node:alpine vs node:slim 선택 가이드 (Docker Hub)](https://hub.docker.com/_/node)
- [Google Distroless Node.js 이미지](https://github.com/GoogleContainerTools/distroless)
- [Trivy: 컨테이너 이미지 취약점 스캐너](https://aquasecurity.github.io/trivy/)
