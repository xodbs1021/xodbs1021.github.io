export const labForSlug = {
  '0-to-1/pokeclip-indexer-recovery-without-events':'recovery',
  '0-to-1/pokeclip-nginx-playback-request-boundary':'authorization',
  'tech-blurting/hls-just-files':'latency',
  'tech-blurting/live-transcoding-infrastructure':'latency'
};
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
