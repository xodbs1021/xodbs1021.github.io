export const labForSlug = {
  '0-to-1/pokeclip-indexer-recovery-without-events':'recovery',
  '0-to-1/pokeclip-nginx-playback-request-boundary':'authorization',
  'tech-blurting/hls-just-files':'latency',
  'tech-blurting/live-transcoding-infrastructure':'latency',
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
export function latencyBudget(segment,bufferSegments,encodeMs,networkMs) {
  if(![segment,bufferSegments,encodeMs,networkMs].every(Number.isFinite)||segment<=0||bufferSegments<0||encodeMs<0||networkMs<0)throw new Error('Invalid model inputs');
  const parts=[{name:'인코딩',seconds:encodeMs/1000},{name:'전송',seconds:networkMs/1000},{name:'세그먼트 대기',seconds:segment/2},{name:'버퍼',seconds:segment*bufferSegments}];
  return {parts,total:parts.reduce((n,p)=>n+p.seconds,0)};
}

export const compatibilityCategories = [
  {key:'convert',label:'기능 대응 가능',hint:'설정 변환',title:'기능을 보존하며 설정을 변환합니다.',body:'컴퓨트·네트워크처럼 대응 리소스가 있어도 CPU, 네트워크 접근, 가용성 요구를 함께 비교합니다. 이름이 비슷하다는 이유로 호환으로 처리하지 않습니다.',example:'예시: VM 기반 앱 → 대상 클라우드의 VM. 머신 사양·디스크·방화벽·이미지 호환성 검증 필요.',next:'IaC 변환 → 샌드박스 검증'},
  {key:'adapt',label:'대체 서비스 존재',hint:'코드 적응',title:'서비스의 차이가 코드 변경으로 이어집니다.',body:'오브젝트 스토리지나 메시징 서비스를 바꾸면 SDK, 인증, URL 생성, 재시도와 오류 처리가 달라질 수 있습니다. AI가 변경안을 만들고 격리된 환경에서 기존 동작과 비교합니다.',example:'예시: S3 호출 → 대상 스토리지 SDK. 서명 URL·이벤트·권한의 의미까지 검증.',next:'AI 코드 변경안 → 샌드박스 검증'},
  {key:'selfhost',label:'직접 운영 가능',hint:'운영 책임 검토',title:'기능뿐 아니라 운영 책임도 이전합니다.',body:'관리형 서비스의 대체가 없으면 오픈소스 소프트웨어를 VM이나 컨테이너로 운영하는 방안을 검토합니다. 백업, 모니터링, 확장과 장애 복구 책임이 커지는 점을 사용자에게 제시합니다.',example:'자체 호스팅은 자동으로 동일한 가용성·성능을 보장하지 않습니다.',next:'운영 책임 목록 → 샌드박스 검증'},
  {key:'decide',label:'동등한 대체 없음',hint:'사용자 결정',title:'사용자가 의미 있는 선택을 합니다.',body:'원본 클라우드에 일부 기능을 남길지, 요구사항을 변경할지, 해당 이전을 중단할지 논의합니다. 필수 동작을 보존하지 못하는 이전은 자동 실행하지 않습니다.',example:'원본 유지 / 기능 변경 / 이전 제외. 결정과 근거를 이전 계획에 기록.',next:'자동 진행 안 함 → 사람의 결정'}
];
export function compatibilityCategory(index) {
  const category=compatibilityCategories[index];
  if(!category)throw new Error('Unknown compatibility category');
  return category;
}
// Which database accepts application writes at each stage. Never both.
export const cutoverStages = [
  {key:'prepare',label:'A 준비',stage:'A 준비',title:'원본은 운영하고, 대상은 따라잡습니다.',copy:'원본 DB의 초기 데이터를 복사하고 이후 변경을 CDC로 전달합니다. 대상 앱 테스트는 복제 대상과 분리된 환경에서 수행합니다.',gate:'전환 조건: 초기 복사 완료 · 지원 조건 확인 · 데이터 검증',sourceApp:'정상 운영',targetApp:'격리 테스트',connection:'원본 앱의 읽기·쓰기 → 원본 DB',replication:'초기 복사 + CDC →',sourceDb:'쓰기 허용',targetDb:'앱 쓰기 금지',writer:'source'},
  {key:'dual',label:'B 앱 동시 운영',stage:'B 앱 동시 운영',title:'앱은 양쪽에서, 데이터는 같은 곳에서.',copy:'원본과 대상 앱이 원본 DB 하나를 사용합니다. 대상 앱에 트래픽을 단계적으로 보내며 기능과 지연을 확인합니다. 대상 DB에는 CDC가 계속 적용됩니다.',gate:'전환 조건: 양쪽 앱 호환 · 보안 연결 · 성능 확인',sourceApp:'트래픽 일부 수신',targetApp:'트래픽 일부 수신',connection:'양쪽 앱의 읽기·쓰기 → 원본 DB',replication:'CDC 지속 →',sourceDb:'쓰기 허용',targetDb:'앱 쓰기 금지',writer:'source'},
  {key:'switch',label:'C 전환 구간',stage:'C 전환 구간',title:'잠시 기다린 요청도, 한 번만 처리합니다.',copy:'신규 쓰기를 대기시키고 진행 중 트랜잭션을 정리합니다. 원본 쓰기를 차단한 상태에서 최종 변경 적용을 확인한 뒤 대상 승격과 연결 풀 전환을 수행합니다.',gate:'전환 조건: 최종 적용 확인 · 원본 쓰기 차단 · 허용 대기 시간 충족',sourceApp:'신규 쓰기 대기',targetApp:'신규 쓰기 대기',connection:'신규 쓰기 대기 → 기존 트랜잭션 완료 → 최종 동기화 → 연결 전환',replication:'최종 적용 확인 →',sourceDb:'쓰기 차단',targetDb:'승격 준비',writer:null},
  {key:'done',label:'D 완료',stage:'D 완료',title:'새로운 쓰기는 대상 DB에서만.',copy:'대기 요청을 멱등하게 처리하고 대상 DB에서 읽기·쓰기를 재개합니다. 원본 앱을 유지한다면 같은 대상 DB를 사용합니다. 이전 DB의 쓰기 차단은 유지합니다.',gate:'복귀 조건: 대상의 새 쓰기를 보존할 역동기화 또는 별도 복구 검증',sourceApp:'유지 시 대상 DB 사용',targetApp:'정상 운영',connection:'양쪽 앱의 읽기·쓰기 → 대상 DB',replication:'복제 종료',sourceDb:'쓰기 차단 유지',targetDb:'쓰기 허용',writer:'target'}
];
export function cutoverStage(index) {
  const stage=cutoverStages[index];
  if(!stage)throw new Error('Unknown cutover stage');
  const writable=stage.writer==='source'?['원본 DB']:stage.writer==='target'?['대상 DB']:[];
  return {...stage,writable,summary:writable.length?`쓰기를 받는 DB: ${writable[0]} 하나`:'쓰기를 받는 DB: 없음 — 새 쓰기는 대기 중'};
}
