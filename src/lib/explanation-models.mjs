export const labForSlug = {
  '0-to-1/pokeclip-indexer-recovery-without-events':'recovery',
  '0-to-1/pokeclip-nginx-playback-request-boundary':'authorization',
  'projects/multicloud-migration-design':['compatibility','cutover']
};
// A post may carry one model (string) or several (array) in reading order.
export function labsForSlug(slug) {
  const value=labForSlug[slug];
  return value?[value].flat():[];
}
// Teaching models only. No requests, credentials, disk reads, or measurements.
export function reconcile(disk, index) {
  const known=new Set(index);
  const added=[...new Set(disk)].filter(id=>!known.has(id));
  return {index:[...known,...added],added};
}
export const playbackCases = {
  match:{request:'/A/list?path=A',allowed:true,reason:'앞단에서 A 접근을 허용했고, path가 하나이며 A와 일치합니다.'},
  mismatch:{request:'/A/list?path=B',allowed:false,reason:'경로의 A와 재생 대상 B가 다릅니다.'},
  missing:{request:'/A/list',allowed:false,reason:'재생 대상을 지정한 path가 없습니다.'},
  duplicate:{request:'/A/list?path=A&path=B',allowed:false,reason:'path가 둘입니다. 계층마다 다른 값을 고를 수 있습니다.'},
  encoded:{request:'/A/list?pa%74h=B&path=A',allowed:false,reason:'인코딩된 쿼리 키는 거절합니다. 풀어 읽으면 path가 중복됩니다.'},
  normalized:{request:'/A/..%2fB/list?path=B',allowed:false,reason:'원문이 허용된 /{id}/list 형태가 아닙니다.'}
};
export function playbackDecision(kind,accessAllowed) {
  const scenario=playbackCases[kind];
  if(!scenario)throw new Error('Unknown teaching case');
  const allowed=Boolean(accessAllowed&&scenario.allowed);
  return {allowed,upstream:allowed?1:0,reason:!accessAllowed?'앞단 접근 제어에서 거절했습니다. 대상 대조 단계로 진행하지 않습니다.':scenario.reason};
}

export const compatibilityCategories = [
  {key:'convert',label:'기능 대응 가능',hint:'설정 변환',title:'같은 기능의 관리형 서비스로 설정을 옮깁니다.',body:'양쪽 클라우드의 공식 문서 인용이 있을 때만 이 판정을 내립니다. 이름이 비슷하다는 이유로 호환으로 처리하지 않습니다.',example:'본선 대응표: RDS for PostgreSQL → Cloud SQL for PostgreSQL, Secrets Manager → Secret Manager, ECR → Artifact Registry.',next:'대상 인프라(Terraform) → Secret 이관'},
  {key:'adapt',label:'대체 서비스 존재',hint:'설정 변환 + 결합 탐지',title:'실행 방식이 다른 서비스로 바꾸며 설정을 다시 짭니다.',body:'컨테이너 실행 환경이나 부하 분산기는 대응 서비스가 있어도 권한과 설정 단위가 다릅니다. 앱 코드에 클라우드 결합(IAM 서명기 등)이 있는지는 따로 탐지하고, 본선에서는 코드를 고치지 않습니다.',example:'본선 대응표: ECS Fargate → Cloud Run(작업 역할 → 서비스 계정, Secret JSON 키는 키별 Secret으로), ALB → 외부 Application 부하 분산기.',next:'결합 0건이면 코드 그대로 → 결합이 있으면 사람 결정'},
  {key:'selfhost',label:'직접 운영 가능',hint:'본선 대응표에 없음',title:'운영 책임까지 넘어오는 선택은 사람에게 올립니다.',body:'관리형 서비스 대신 직접 운영하면 백업, 모니터링, 확장, 장애 복구 책임이 함께 넘어옵니다. 첫 설계에는 이 분류가 있었지만 본선 대응표에는 이 판정을 내리는 행이 없습니다.',example:'본선 판정에서는 미분류로 나와 사람 결정에 올라갑니다.',next:'미분류 → 사람 결정(종료 코드 3)'},
  {key:'decide',label:'원본 유지·미분류',hint:'사용자 결정',title:'옮기지 않거나, 사람이 정합니다.',body:'원본에 남겨야 하는 리소스는 원본 유지로 판정하고, 대응표에 없는 리소스는 미분류로 사람 결정에 올립니다. 사람 결정이 남으면 판정은 종료 코드 3으로 끝납니다.',example:'본선 대응표: Route 53 비공개 호스팅 영역은 원본 유지. 작업 역할 권한·Secret 볼륨 같은 대응표 밖 의존은 미분류.',next:'자동 진행 안 함 → 사람의 결정'}
];
export function compatibilityCategory(index) {
  const category=compatibilityCategories[index];
  if(!category)throw new Error('Unknown compatibility category');
  return category;
}
// Which database accepts application writes at each stage. Never both.
export const cutoverStages = [
  {key:'precheck',label:'PRECHECK',stage:'1 사전 확인',title:'대상이 비었는지 확인하고, 대상 쓰기를 막습니다.',copy:'원본과 대상의 스키마·기본키가 같은지, 지원하지 않는 스키마가 없는지 검사합니다. 대상 DB가 비어 있음을 테이블 잠금 안에서 확인하고 대상 앱의 쓰기를 차단합니다.',gate:'같은 스키마·기본키 · 대상이 비어 있음',sourceApp:'정상 운영',targetApp:'요청 받지 않음',connection:'접수 큐 → 원본 앱 → 원본 DB',replication:'아직 없음',sourceDb:'쓰기 허용',targetDb:'앱 쓰기 차단',writer:'source'},
  {key:'copying',label:'COPYING',stage:'2 복사와 CDC',title:'초기 데이터를 복사하고 변경을 계속 따라갑니다.',copy:'Debezium이 원본의 초기 데이터와 이후 변경을 읽고, 테이블마다 기본키 기준 upsert로 대상에 반영합니다. 커넥터가 RUNNING이라는 이유나 행 수만으로 다음 단계로 넘어가지 않습니다.',gate:'스냅샷 완료와 스트리밍 위치 확인',sourceApp:'정상 운영',targetApp:'요청 받지 않음',connection:'접수 큐 → 원본 앱 → 원본 DB',replication:'초기 복사 + CDC →',sourceDb:'쓰기 허용',targetDb:'앱 쓰기 차단',writer:'source'},
  {key:'ready',label:'READY',stage:'3 승인 대기',title:'복사가 끝나도 승인 ID를 기다립니다.',copy:'READY는 최종 동기화가 끝났다는 뜻이 아니라 운영자의 승인을 기다린다는 뜻입니다. 원본 앱은 계속 요청을 처리하고, 대상은 CDC로 따라갑니다.',gate:'운영자의 명시적인 승인 ID',sourceApp:'정상 운영',targetApp:'요청 받지 않음',connection:'접수 큐 → 원본 앱 → 원본 DB',replication:'CDC 지속 →',sourceDb:'쓰기 허용',targetDb:'앱 쓰기 차단',writer:'source'},
  {key:'fencing',label:'FENCING',stage:'4 원본 차단',title:'앱을 멈추고 원본 쓰기를 막습니다.',copy:'앱을 일시정지하고 진행 중인 요청이 0이 된 것을 확인한 뒤, 원본 테이블을 한 트랜잭션에서 잠그고 쓰기를 막는 트리거를 설치합니다. 이 순간부터 들어온 요청은 접수 큐에 쌓이기만 하고 앱으로 전달되지 않습니다.',gate:'진행 중 요청 0 · 잠금 시간 초과 없음',sourceApp:'일시정지',targetApp:'요청 받지 않음',connection:'접수 큐에 쌓임(앱 전달 멈춤)',replication:'남은 변경 적용 →',sourceDb:'쓰기 차단(트리거)',targetDb:'앱 쓰기 차단',writer:null},
  {key:'draining',label:'DRAINING',stage:'5 전체 비교',title:'양쪽이 막힌 채 모든 열을 비교합니다.',copy:'기본키마다 모든 열을 비교해 누락·추가·변경이 모두 0이 될 때까지 기다립니다. 비교 데이터는 디스크에 두어 메모리 사용을 제한합니다.',gate:'누락·추가·변경 0',sourceApp:'일시정지',targetApp:'요청 받지 않음',connection:'접수 큐에 쌓임(앱 전달 멈춤)',replication:'남은 변경 적용 →',sourceDb:'쓰기 차단(트리거)',targetDb:'앱 쓰기 차단',writer:null},
  {key:'stopping',label:'STOPPING',stage:'6 복제 종료',title:'복제기를 멈추고 한 번 더 비교합니다.',copy:'모든 복제 작업이 멈춘 뒤 다시 전체를 비교하고, 시퀀스의 다음 값을 맞춘 다음 커넥터를 지웁니다. 이 뒤의 불일치는 단순 재시도로 넘기지 않고 사람이 조사합니다.',gate:'복제 작업 모두 중지 · 재비교 0 · 시퀀스 정렬',sourceApp:'일시정지',targetApp:'요청 받지 않음',connection:'접수 큐에 쌓임(앱 전달 멈춤)',replication:'복제 중지',sourceDb:'쓰기 차단(트리거)',targetDb:'앱 쓰기 차단',writer:null},
  {key:'switching',label:'SWITCHING',stage:'7 대상 전환',title:'연결을 대상으로 바꾸고 대상 차단을 풉니다.',copy:'앱이 일시정지된 채 접속 대상을 대상 DB로 바꾼 것을 확인하고, 대상 쪽 차단을 풉니다. 앱을 다시 열면 접수 큐에 쌓인 요청부터 대상으로 처리합니다. 원본 차단은 유지합니다.',gate:'대상 연결과 health 확인. 실패하면 NEEDS_RECOVERY — 자동 재시도·롤백 없이 사람이 유일한 쓰기 DB를 정함',sourceApp:'요청 받지 않음',targetApp:'쌓인 요청부터 처리',connection:'접수 큐 → 대상 앱 → 대상 DB',replication:'없음',sourceDb:'쓰기 차단 유지',targetDb:'쓰기 허용',writer:'target'},
  {key:'completed',label:'COMPLETED',stage:'8 완료',title:'새 쓰기는 대상 DB에서만 받습니다.',copy:'완료의 데이터 근거는 쓰기를 열기 직전의 전체 비교이고, 운영 근거는 대상 앱의 health 응답입니다. 원본을 덮어쓰는 즉석 롤백은 없습니다.',gate:'되돌리기: 새 job_id와 새 빈 대상 DB로 반대 방향 전환',sourceApp:'요청 받지 않음',targetApp:'정상 운영',connection:'접수 큐 → 대상 앱 → 대상 DB',replication:'없음',sourceDb:'쓰기 차단 유지',targetDb:'쓰기 허용',writer:'target'}
];
export function cutoverStage(index) {
  const stage=cutoverStages[index];
  if(!stage)throw new Error('Unknown cutover stage');
  const writable=stage.writer==='source'?['원본 DB']:stage.writer==='target'?['대상 DB']:[];
  return {...stage,writable,summary:writable.length?`쓰기를 받는 DB: ${writable[0]} 하나`:'쓰기를 받는 DB: 없음 — 새 쓰기는 대기 중'};
}
