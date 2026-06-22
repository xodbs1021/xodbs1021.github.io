### G. AWS 인프라 (17 시리즈)

**갯수 근거**: 매우 광범. 컴퓨팅(EC2/Lambda 5) + 스토리지(S3 2) + 네트워크(VPC/ELB 3) + 모니터링/스케일/비용(4) + 컨테이너(2) + IAM 기초(1). 12개로는 부족. 치지직 입사 시 AWS 깊이 필수.

#### G-1: AWS 콘솔/CLI/IAM 기초
- hook: AWS의 시작
- 핵심 항목: 계정 / Region vs AZ / Console UI / AWS CLI 설치/설정 / Access Key vs Role / IAM User/Group/Role/Policy (JSON) / 최소 권한 원칙 / MFA / Billing 알람
- 다루지 않는 것: 각 서비스 (G-2부터)
- PokéClip 적용: AWS 작업 출발
- 면접 답변 주제: "IAM 원칙 / Key vs Role"

#### G-2: EC2 입문
- hook: 가장 기본 컴퓨팅
- 핵심 항목: 인스턴스 타입 (t/m/c/r) / AMI / Key Pair / Security Group / EBS / Elastic IP / 시작/중지/종료 / SSH / User Data / Instance Metadata
- 다루지 않는 것: 깊이 (G-3) / GPU (G-4)
- PokéClip 적용: 서버 호스팅
- 면접 답변 주제: "EC2 타입 선택"

#### G-3: EC2 깊이 (Spot / Reserved / Networking)
- hook: 비용 통제와 네트워크
- 핵심 항목: Spot vs On-Demand vs Reserved / Savings Plans / Placement Group / ENI (Elastic Network Interface) / EBS 볼륨 종류 (gp3/io2/st1) / Snapshot / 인스턴스 마이그레이션
- 다루지 않는 것: VPC 깊이 (G-12)
- PokéClip 적용: 비용 최적화 / 네트워크 설정
- 면접 답변 주제: "Spot 활용"

#### G-4: EC2 GPU 인스턴스
- hook: AI 워크로드 핵심
- 핵심 항목: GPU 패밀리 (g4dn/g5/p3/p4/p5) / NVIDIA T4/A10/V100/A100/H100 차이 / Deep Learning AMI / Container Toolkit / nvidia-smi / CUDA 드라이버 / 비용 / Spot GPU
- 다루지 않는 것: 추론 시스템 (D-22)
- PokéClip 적용: YOLO/Whisper 추론
- 면접 답변 주제: "GPU 인스턴스 선택"

#### G-5: S3 기초
- hook: AWS 객체 스토리지
- 핵심 항목: 버킷 / 객체 / 키 / Region / 스토리지 클래스 (Standard/IA/Glacier/Deep Archive) / Versioning / Multi-part Upload / 이벤트 알림 / 정적 호스팅 / 보안 (Block Public Access)
- 다루지 않는 것: 라이프사이클/Pre-signed (G-6)
- PokéClip 적용: 영상 보관
- 면접 답변 주제: "스토리지 클래스"

#### G-6: S3 라이프사이클 + Pre-signed URL
- hook: 비용 최적화 + 안전한 공유
- 핵심 항목: Lifecycle 정책 / Transition Rule / Expiration / Pre-signed URL 생성 / 만료 시간 / boto3 API / Server-Side Encryption (SSE-S3/SSE-KMS) / Object Lock / S3 Select
- 다루지 않는 것: CDN (CloudFront)
- PokéClip 적용: 영상 라이프사이클 / 다운로드 URL
- 면접 답변 주제: "Pre-signed URL 보안"

#### G-7: Lambda 기초
- hook: 서버리스 표준
- 핵심 항목: 서버리스 개념 / Lambda 함수 / 트리거 (API Gateway/S3/DynamoDB Streams/SQS/EventBridge/CloudWatch) / 런타임 / 실행 컨텍스트 / 콜드 스타트 / 메모리 vs CPU / 타임아웃 / 환경 변수 / IAM Role
- 다루지 않는 것: 깊이 (G-8) / 통합 (G-9)
- PokéClip 적용: 채팅 수집 / EDL 생성
- 면접 답변 주제: "Lambda 한계 / 콜드 스타트"

#### G-8: Lambda 깊이 (Layer / Concurrency / VPC)
- hook: 운영 단계 Lambda
- 핵심 항목: Layer (공유 라이브러리) / Reserved Concurrency / Provisioned Concurrency / Concurrent Executions 한도 / Lambda in VPC (NAT 비용) / Lambda Extensions / Container Image 배포 / 에러 처리 / Dead Letter Queue
- 다루지 않는 것: 통합 (G-9)
- PokéClip 적용: 운영 Lambda
- 면접 답변 주제: "Provisioned Concurrency"

#### G-9: Lambda + DynamoDB
- hook: 서버리스 백엔드 황금 조합
- 핵심 항목: boto3 / Lambda → DynamoDB 호출 / Item put/get/query/scan / Batch operations / Streams 트리거 / 트랜잭션 (TransactWriteItems) / 예외 처리 / 동시성 제어
- 다루지 않는 것: API Gateway (G-10)
- PokéClip 적용: 분석 결과 저장
- 면접 답변 주제: "Lambda + DynamoDB 패턴"

#### G-10: API Gateway
- hook: 서버리스 API 표준
- 핵심 항목: REST API vs HTTP API vs WebSocket API / 리소스/메서드 매핑 / Lambda 프록시 통합 / Stage / Deployment / Custom Domain / Throttling / API Key / Usage Plan / CORS / Cognito Authorizer / Custom Authorizer
- 다루지 않는 것: 인증 깊이 (L)
- PokéClip 적용: 대시보드 API 백엔드
- 면접 답변 주제: "API Gateway 패턴"

#### G-11: VPC 기초
- hook: AWS 네트워크 기반
- 핵심 항목: VPC / Subnet (Public/Private) / Internet Gateway / NAT Gateway / Route Table / Security Group vs NACL / CIDR / IPv4 vs IPv6 / Public vs Private IP
- 다루지 않는 것: 깊이 (G-12)
- PokéClip 적용: EC2/RDS 격리
- 면접 답변 주제: "Public vs Private Subnet"

#### G-12: VPC 깊이 (Peering / Endpoint / Transit)
- hook: 멀티 티어 / 보안 / 비용
- 핵심 항목: VPC Peering / Transit Gateway / VPN / Direct Connect / VPC Endpoint (Gateway/Interface) / PrivateLink / Flow Logs / 멀티 AZ 설계 / 비용 함정 (Cross-AZ / NAT)
- 다루지 않는 것: 네트워크 기초 (O)
- PokéClip 적용: 보안 경계 / 비용
- 면접 답변 주제: "VPC Endpoint 이점"

#### G-13: ELB (ALB / NLB)
- hook: 로드 밸런서가 PokéClip 트래픽 입구
- 핵심 항목: ALB vs NLB vs CLB / Listener / Target Group / Health Check / Path-based routing / Host-based routing / Sticky session / SSL termination / WebSocket 통과 / Auto-scaling 통합
- 다루지 않는 것: 일반 LB (O-7)
- PokéClip 적용: 분석 서버 LB
- 면접 답변 주제: "ALB vs NLB"

#### G-14: CloudWatch 모니터링
- hook: AWS 표준 모니터링
- 핵심 항목: Metrics / Logs / Logs Insights (쿼리) / 사용자 정의 메트릭 / Embedded Metric Format / Alarm / SNS 통합 / Dashboard / X-Ray (분산 트레이싱)
- 다루지 않는 것: Prometheus (H-8)
- PokéClip 적용: 운영 모니터링
- 면접 답변 주제: "메트릭 vs 로그"

#### G-15: Auto-scaling
- hook: 트래픽 변동 대응
- 핵심 항목: Auto Scaling Group / Launch Template / Scaling Policy (Target tracking/Step/Scheduled) / Health Check / LB 연동 / Cooldown / Lifecycle Hooks / Lambda Concurrency / DynamoDB On-demand
- 다루지 않는 것: 비용 (G-17)
- PokéClip 적용: 방송 트래픽 대응
- 면접 답변 주제: "Auto-scaling 정책"

#### G-16: ECR + ECS 개요
- hook: AWS 컨테이너 표준
- 핵심 항목: ECR (이미지 레지스트리) / 이미지 푸시 / 라이프사이클 정책 / ECS (Cluster/Service/Task) / Fargate vs EC2 launch / Task Definition / Service Discovery / ECS vs EKS / Fargate 비용
- 다루지 않는 것: Kubernetes (H-7)
- PokéClip 적용: 분석 서버 컨테이너화
- 면접 답변 주제: "ECS vs EKS"

#### G-17: 비용 최적화 + FinOps
- hook: 비용 통제 안 하면 폭주
- 핵심 항목: Cost Explorer / Budgets / 태깅 전략 / Reserved Instances / Savings Plans / Spot 패턴 / 데이터 전송 비용 함정 / S3 lifecycle / Lambda 메모리 튜닝 / 미사용 리소스 정리 / Trusted Advisor / FinOps 3단계 (Inform/Optimize/Operate)
- 다루지 않는 것: 비즈니스 FinOps
- PokéClip 적용: 운영 비용 통제
- 면접 답변 주제: "AWS 비용 절감 경험"

---

