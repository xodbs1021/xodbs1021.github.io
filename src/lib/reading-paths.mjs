const project = (name, titles) => titles.map(title=>`0-to-1/${name}-${title}`);
const tech = titles => titles.map(title=>`tech-blurting/${title}`);
const media = titles => titles.map(title=>`open-source-analysis/mediamtx-${title}`);
export const readingPaths = [
  {id:'recovery',title:'이벤트가 사라진 뒤의 복구',description:'저장된 파일, 인덱스, 재시작이 서로 어긋날 때 무엇을 기준으로 복구할까요.',slugs:project('pokeclip',['path-reconciler-design-history','indexer-recovery-without-events','upload-state-and-recovery','media-host-restart-lifecycle'])},
  {id:'authorization',title:'인증 다음의 권한 경계',description:'사용자를 확인하는 일부터 요청 대상과 작업 권한을 일치시키는 일까지.',slugs:project('pokeclip',['shared-db-auth-iam-tls','one-time-pairing-contract','nginx-playback-request-boundary','editing-upload-authorization','secret-storage-migration-plan'])},
  {id:'live-dvr',title:'라이브를 다시 재생하기까지',description:'라이브와 DVR의 책임을 나누고 URL·구간·매니페스트의 계약을 연결합니다.',slugs:project('pokeclip',['live-dvr-separation-handoff','session-url-and-endlist','live-window-without-fork','manifest-window-boundaries','database-authoritative-manifest-publishing','segment-overlap-contract'])},
  {id:'playback-debugging',title:'재생 실패에서 원인까지',description:'검은 화면과 오디오 간격을 증거로 좁혀 가는 디버깅 기록.',slugs:project('pokeclip',['zero-errors-missing-playback','black-screen-three-causes','reconnect-audio-gap','go-remux-same-io-benchmark','multiaudio-end-to-end-verification'])},
  {id:'video-delivery',title:'픽셀에서 재생 버퍼까지',description:'압축한 영상이 세그먼트와 CDN을 거쳐 재생되는 흐름을 따라갑니다.',slugs:tech(['streaming-basics-from-scratch','h264-deep-dive','hls-just-files','cmaf-deep-dive','cdn-for-live-streaming','buffering-deep-dive'])},
  {id:'media-lifecycle',title:'MediaMTX의 시작과 종료',description:'콜백, 출력, 감시 작업이 종료 시점에 남기는 문제와 기여 기록.',slugs:media(['seven-hooks-missing-exit-callback','hook-exit-code-return','hook-output-backpressure-experiments','certificate-watcher-close-join','certloader-no-watcher-shutdown'])},
  {id:'service-recovery',title:'배포 이후에도 돌아오는 서비스',description:'Shakedown의 배포·재시작·데이터베이스 복원 판단을 이어 읽습니다.',slugs:project('shakedown',['plan-deployment-and-recovery','database-tls-identity-and-failover','database-restore-proves-backup','reboot-recovery-and-deletion'])}
];
export function readingContext(post, posts) {
  const bySlug=new Map(posts.map(p=>[p.slug,p]));
  const path=readingPaths.find(p=>p.slugs.includes(post.slug));
  const index=path?.slugs.indexOf(post.slug) ?? -1;
  const previous=index>0 ? bySlug.get(path.slugs[index-1]) : undefined;
  const next=path ? bySlug.get(path.slugs[index+1]) : undefined;
  const generic=new Set(['PokeClip','MediaMTX','Shakedown','Go','Java','TypeScript']);
  const destinations=new Map(posts.map(p=>[p.slug,new Set([...p.html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].flatMap(match=>{
    try { const url=new URL(match[1],`https://taeyun.blog${p.url}`);return url.origin==='https://taeyun.blog'?[url.pathname]:[]; } catch { return []; }
  }))]));
  const linked=(a,b)=>destinations.get(a.slug).has(b.url);
  const related=posts.filter(p=>p.slug!==post.slug&&p!==previous&&p!==next).map(p=>{
    const shared=readingPaths.filter(r=>r.slugs.includes(post.slug)&&r.slugs.includes(p.slug));
    const direct=linked(post,p)||linked(p,post);
    const specific=p.tags.filter(t=>!generic.has(t)&&post.tags.includes(t));
    const sameProject=['pokeclip-','mediamtx-','shakedown-'].some(prefix=>post.slug.split('/')[1].startsWith(prefix)&&p.slug.split('/')[1].startsWith(prefix));
    const score=shared.length*100+Number(direct)*60+specific.length*15+Number(sameProject)*5;
    const reason=shared[0]?.title || (direct ? '본문에서 이어지는 기록' : specific.length ? `${specific.slice(0,2).join(' · ')} 관련 기록` : '같은 프로젝트의 다른 판단');
    return {...p,relatedReason:reason,score};
  }).filter(p=>p.score>0).sort((a,b)=>b.score-a.score||b.date-a.date).slice(0,3);
  return {path,previous,next,related};
}
