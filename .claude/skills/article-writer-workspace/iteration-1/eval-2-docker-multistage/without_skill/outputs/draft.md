---
title: "Docker 멀티스테이지 빌드로 Node.js 이미지 1GB → 120MB 줄이기"
date: 2026-06-11
draft: true
categories: ["0-to-1"]
tags: ["docker", "nodejs", "optimization", "devops", "containerization"]
description: "Docker 멀티스테이지 빌드를 적용해 Node.js 프로덕션 이미지를 1GB에서 120MB로 줄인 과정을 단계별로 정리했다."
---

프로덕션 배포를 앞두고 CI 로그에서 눈을 의심했다. Docker 이미지 사이즈가 **1.1GB**. Node.js 앱 하나가 Ubuntu 기본 설치만큼 나간다. 빌드 시간도 길어지고, ECR 스토리지 비용도 무시할 수 없다. 멀티스테이지 빌드를 제대로 써본 적 없었는데, 이 기회에 처음부터 정리해봤다.

---

## 문제: 왜 이미지가 이렇게 컸나

처음 Dockerfile은 이랬다.

```dockerfile
# AS-IS: 단일 스테이지
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

무엇이 문제였을까?

1. **`node:18` 베이스 이미지 자체가 무겁다** — Debian 기반으로 1GB에 육박한다. 컴파일러, 빌드 툴, 각종 유틸리티가 전부 포함된다.
2. **`node_modules`가 그대로 들어간다** — `npm install`이 devDependencies까지 설치한다. TypeScript, ESLint, Jest... 런타임에 전혀 필요 없는 것들이다.
3. **소스 코드와 빌드 산출물이 공존한다** — `src/` 디렉토리, 테스트 파일, 설정 파일이 전부 이미지에 들어간다.

결과적으로 이미지에는 프로덕션에서 실제로 쓰는 파일보다 쓰지 않는 파일이 훨씬 많았다.

---

## 해결책: 멀티스테이지 빌드란

멀티스테이지 빌드는 하나의 Dockerfile 안에 여러 `FROM` 구문을 쓰는 것이다. 각 스테이지는 독립적으로 실행되고, 최종 이미지에는 마지막 스테이지만 포함된다. 이전 스테이지에서 필요한 파일만 `COPY --from`으로 가져온다.

핵심 아이디어는 단순하다.

> **빌드 환경과 실행 환경을 분리한다.**

빌드할 때만 필요한 도구들(TypeScript 컴파일러, 번들러 등)은 빌드 스테이지에만 존재하고, 최종 이미지에는 컴파일된 결과물과 런타임 의존성만 남긴다.

---

## 적용 과정

### 1단계: 스테이지 분리

```dockerfile
# Stage 1: 빌드
FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# Stage 2: 프로덕션
FROM node:18 AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

`npm install` 대신 `npm ci`를 쓴 것도 포인트다. `package-lock.json`을 그대로 따르기 때문에 재현 가능한 빌드가 보장된다.

이것만으로도 devDependencies가 빠지면서 이미지가 작아진다. 하지만 아직 베이스 이미지가 `node:18`이라 무겁다.

**중간 결과: ~580MB**

### 2단계: 경량 베이스 이미지로 교체

`node:18-alpine`은 Alpine Linux 기반으로 Node.js 공식 이미지 중 가장 가볍다.

```dockerfile
# Stage 1: 빌드
FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# Stage 2: 프로덕션 (alpine으로 변경)
FROM node:18-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

빌드 스테이지는 여전히 `node:18`을 쓴다. native addon 빌드 등 호환성 문제가 생길 수 있어서 빌드는 Debian 기반으로 유지했다.

**중간 결과: ~220MB**

### 3단계: 최종 최적화

몇 가지를 더 다듬었다.

```dockerfile
# Stage 1: 빌드
FROM node:18 AS builder

WORKDIR /app

# 의존성 레이어를 소스코드와 분리 (캐시 효율 향상)
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# production 의존성만 따로 설치
RUN npm ci --only=production && npm cache clean --force


# Stage 2: 프로덕션
FROM node:18-alpine AS production

# 보안: root가 아닌 전용 유저로 실행
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# builder 스테이지에서 필요한 것만 복사
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

USER nextjs

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "dist/main.js"]
```

주요 변경점:

- **빌드 스테이지에서 production 의존성 설치** — 최종 스테이지에서는 `npm install`을 아예 실행하지 않는다. npm 캐시도 정리한다.
- **`node_modules` 직접 복사** — `COPY --from=builder /app/node_modules`로 이미 설치된 모듈을 그대로 가져온다.
- **non-root 유저** — 컨테이너 보안 기본 원칙. root로 실행할 이유가 없다.
- **`NODE_ENV=production`** — 일부 라이브러리가 이 환경변수를 보고 동작을 바꾼다.

**최종 결과: ~120MB**

---

## Before / After 비교

| 구분 | 이미지 크기 | 빌드 시간 |
|------|------------|----------|
| 최적화 전 (단일 스테이지, `node:18`) | **1.1 GB** | ~3분 |
| 1단계: 스테이지 분리 + `--only=production` | ~580 MB | ~2분 30초 |
| 2단계: `node:18-alpine` 베이스 | ~220 MB | ~2분 |
| 3단계: 최종 최적화 | **~120 MB** | ~1분 50초 |

```
$ docker images | grep my-node-app

my-node-app   before   sha256:a1b2c3...   1.08GB
my-node-app   after    sha256:d4e5f6...   118MB
```

약 **89% 감소**. ECR 스토리지 비용도 그만큼 줄었고, 배포 시 이미지 pull 시간도 눈에 띄게 빨라졌다.

---

## 주의할 점

**Alpine에서 native addon 빌드 문제**

`bcrypt`, `sharp` 같은 native addon을 쓴다면 Alpine에서 컴파일 문제가 생길 수 있다. Alpine은 glibc 대신 musl libc를 쓰기 때문이다. 이 경우 몇 가지 선택지가 있다.

- 빌드 스테이지에서 Alpine용으로 재빌드한다 (`apk add python3 make g++`)
- 베이스 이미지를 `node:18-slim` (Debian slim 버전, ~240MB)으로 타협한다
- native addon 대신 pure JS 대안을 찾는다 (`bcryptjs` 등)

**`.dockerignore` 챙기기**

`.dockerignore`가 없으면 `COPY . .`이 `node_modules`, `.git`, `dist` 등을 전부 복사한다. 빌드 컨텍스트가 커지면 빌드가 느려진다.

```
node_modules
dist
.git
.env*
*.log
coverage
.nyc_output
```

---

## 정리

멀티스테이지 빌드의 핵심은 **관심사 분리**다. 빌드 환경과 실행 환경은 요구사항이 다르다. 빌드할 때는 컴파일러, 번들러, 테스트 도구가 필요하지만, 실행할 때는 컴파일된 코드와 런타임 의존성만 있으면 된다.

Docker가 이 분리를 언어 차원에서 지원해주는 게 멀티스테이지 빌드다. 한 번만 제대로 설정해두면 이후 모든 빌드에서 자동으로 최적화된다. 1GB짜리 이미지를 배포하고 있다면, 지금 바로 적용해볼 만하다.
