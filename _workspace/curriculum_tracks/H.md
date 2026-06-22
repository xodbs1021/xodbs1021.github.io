### H. DevOps (11 시리즈)

**갯수 근거**: Docker(4) + CI/CD(1) + 컨테이너 오케스트레이션(2) + 모니터링/로깅/알람(3) + IaC(1). 백엔드 입사 면접 자주.

#### H-1: Docker 개념 + 첫 컨테이너
- hook: 컨테이너 = 백엔드 표준
- 핵심 항목: 컨테이너 vs VM / Docker 설치 / 이미지 vs 컨테이너 / docker run/ps/stop/start/rm / pull/push / Docker Hub / 라이프사이클 / 포트 매핑 / 볼륨 / 환경 변수
- 다루지 않는 것: Dockerfile (H-2)
- PokéClip 적용: 분석 서버 컨테이너화 출발
- 면접 답변 주제: "컨테이너 vs VM"

#### H-2: Dockerfile 깊이
- hook: 이미지 정의의 코드
- 핵심 항목: Dockerfile 문법 / FROM / RUN / COPY vs ADD / ENV / WORKDIR / EXPOSE / ENTRYPOINT vs CMD / Multi-stage build / Layer 캐싱 / .dockerignore / 이미지 크기 줄이기 / 보안 (non-root) / Python 베이스 (slim/alpine) / GPU 이미지
- 다루지 않는 것: Compose (H-3)
- PokéClip 적용: PokéClip Dockerfile
- 면접 답변 주제: "Multi-stage / 이미지 크기"

#### H-3: Docker Compose
- hook: 로컬 멀티 컨테이너 표준
- 핵심 항목: docker-compose.yml 문법 / services / volumes / networks / depends_on / 환경 변수 (.env) / 빌드 vs 이미지 / Health check / Override 파일 / 한계
- 다루지 않는 것: K8s (H-7)
- PokéClip 적용: 로컬 개발 환경
- 면접 답변 주제: "Compose vs K8s"

#### H-4: 컨테이너 레지스트리
- hook: 이미지 저장소
- 핵심 항목: Docker Hub / GitHub Container Registry / AWS ECR / 이미지 태그 전략 / 이미지 스캔 / Pull rate limit / Private vs Public / aws ecr get-login-password / 라이프사이클
- 다루지 않는 것: CI/CD 통합 (H-5)
- PokéClip 적용: 이미지 저장
- 면접 답변 주제: "이미지 태그 전략"

#### H-5: GitHub Actions CI/CD
- hook: push → 테스트 → 배포 자동
- 핵심 항목: CI vs CD / 워크플로우 YAML / Trigger (push/PR/schedule) / Job / Step / Action / Matrix build / Secrets / Cache / Artifact / Reusable workflow / OIDC AWS 인증 / 빌드-테스트-배포 흐름
- 다루지 않는 것: 다른 CI 도구
- PokéClip 적용: PokéClip CI/CD
- 면접 답변 주제: "CI/CD 흐름"

#### H-6: ECS 깊이
- hook: AWS 컨테이너 오케스트레이션
- 핵심 항목: ECS 깊이 (Cluster/Service/Task/Task Definition) / Fargate vs EC2 launch / Auto Scaling / Service Discovery / CloudMap / Capacity Provider / Spot 통합 / ECS Blue/Green
- 다루지 않는 것: K8s (H-7)
- PokéClip 적용: 분석 서버 운영
- 면접 답변 주제: "ECS 운영"

#### H-7: Kubernetes 입문 (EKS)
- hook: K8s가 컨테이너 산업 표준
- 핵심 항목: K8s 개념 (Pod/Service/Deployment/Namespace/ConfigMap/Secret/Ingress) / kubectl / Helm 개요 / EKS 클러스터 / Node Group / IAM Role for Service Accounts (IRSA) / 컨테이너 보안
- 다루지 않는 것: K8s 깊이 (별도)
- PokéClip 적용: 운영 단계
- 면접 답변 주제: "K8s 기본 / Pod / Deployment"

#### H-8: Prometheus + Grafana
- hook: 표준 모니터링 스택
- 핵심 항목: Prometheus 모델 (Pull) / 메트릭 타입 (Counter/Gauge/Histogram/Summary) / PromQL 기본 / Exporter / Service Discovery / Grafana 대시보드 / 알람 (Alertmanager) / 분산 트레이싱 개요 (OpenTelemetry)
- 다루지 않는 것: 로깅 (H-9)
- PokéClip 적용: 분석 메트릭
- 면접 답변 주제: "Prometheus vs CloudWatch"

#### H-9: 로깅 (ELK / Loki)
- hook: 대규모 로그는 grep 안 됨
- 핵심 항목: ELK Stack (Elasticsearch/Logstash/Kibana) / Loki 비교 / 로그 수집 (Fluentd/Vector) / 구조화 로깅 (JSON) / 인덱스 관리 / 검색 / 시각화 / 보존 정책 / 비용 / AWS OpenSearch
- 다루지 않는 것: 검색 엔진 깊이
- PokéClip 적용: 로그 집중화
- 면접 답변 주제: "로그 집중화"

#### H-10: 알람 + Postmortem
- hook: 운영 문화의 표준
- 핵심 항목: 알람 분류 (P0/P1/P2) / On-call 로테이션 / PagerDuty / Slack 통합 / 알람 라우팅 / 알람 피로 / Runbook 작성 / Postmortem 문화 / Blameless culture / Action item 트래킹
- 다루지 않는 것: SRE 조직 깊이
- PokéClip 적용: 운영 알람 설계
- 면접 답변 주제: "Postmortem 경험"

#### H-11: Terraform IaC
- hook: 인프라 = 코드
- 핵심 항목: IaC 개념 / Terraform vs CloudFormation vs CDK / Provider / Resource / Variable / Output / State 파일 / Backend (S3 + DynamoDB lock) / Module / Plan / Apply / Workspace / Drift 감지
- 다루지 않는 것: 모듈 설계 깊이
- PokéClip 적용: 인프라 코드화
- 면접 답변 주제: "IaC / Terraform State"

---

