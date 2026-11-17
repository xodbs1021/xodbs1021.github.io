// 공개 재측정 — CloudFront 서명 쿠키 정책 Resource 의 와일드카드가 경로 구분자(/)와 쿼리(?)를 넘는다는 것의 시연.
//
//   node wildcard.mjs
//
// AWS 를 부르지 않는다. 매처는 AWS 문서 「Set signed cookies using a custom policy」 의 Resource 규칙
// (`*` = 0자 이상 아무 글자, `?` = 정확히 한 글자, 「anywhere in the string」, 「The base URL including your
// query strings」)을 글자 그대로 옮긴 것이고, PokeClip-mono 의 clip 시험(PlaybackAccessControllerTest.cloudFrontMatches)
// 과 같은 규칙이다. 주소 · 방송 번호는 지어낸 값이다.
//
// 브라우저가 어느 쿠키 셋을 보내는지는 RFC 6265 5.1.4 「path-match」 로 셈한다.

/** 정책 Resource 를 정규식으로 — `*` → `.*`, `?` → `.`, 나머지는 글자 그대로. */
export function cloudFrontMatches(resource, url) {
  let re = '^';
  for (const c of resource) {
    if (c === '*') re += '.*';
    else if (c === '?') re += '.';
    else re += c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  }
  return new RegExp(re + '$', 's').test(url);
}

/** 앞쪽 `*` 하나가 먹은 글자 — 시연용(첫 `*` 의 탐욕 일치). */
function firstStarCapture(resource, url) {
  const i = resource.indexOf('*');
  if (i < 0) return null;
  let re = '^';
  for (const [k, c] of [...resource].entries()) {
    if (c === '*') re += k === i ? '(.*)' : '.*';
    else if (c === '?') re += '.';
    else re += c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  }
  const m = new RegExp(re + '$', 's').exec(url);
  return m ? m[1] : null;
}

/** RFC 6265 5.1.4 path-match — 쿠키 Path 가 요청 경로의 앞부분이고 경계가 `/` 이거나 같을 때. */
export function pathMatch(requestPath, cookiePath) {
  if (requestPath === cookiePath) return true;
  if (!requestPath.startsWith(cookiePath)) return false;
  return cookiePath.endsWith('/') || requestPath[cookiePath.length] === '/';
}

const BASE = 'https://media.example.com';
const MINE = 'A';
const OTHER = 'B';
const OLD = `${BASE}/*/${MINE}/*`;
const KINDS = ['live', 'dvr', 'vod', 'playback'];
const NEW = KINDS.map((k) => ({kind: k, resource: `${BASE}/${k}/${MINE}/*`, path: `/${k}/${MINE}`}));

const REQUESTS = [
  ['내 방송 라이브 목록', `${BASE}/live/${MINE}/index.m3u8?_HLS_msn=3`],
  ['내 방송 되감기 조각', `${BASE}/dvr/${MINE}/r1/seg/001201.m4s`],
  ['남의 방송 — 쿼리에 내 번호', `${BASE}/live/${OTHER}/index.m3u8?x=/${MINE}/`],
  ['남의 방송 — 경로 끝에 내 번호', `${BASE}/vod/${OTHER}/x/${MINE}/index.m3u8`],
  ['남의 방송 — 그대로', `${BASE}/live/${OTHER}/index.m3u8`],
  ['내 녹화 경로 + 남의 path 쿼리', `${BASE}/playback/${MINE}/list?path=${OTHER}`],
];

console.log(['요청', 'URL', '옛 정책 */A/* 일치', '앞 * 가 먹은 글자', '종류별 정책 중 일치', '브라우저가 보낼 쿠키 셋(Path)'].join('\t'));
for (const [name, url] of REQUESTS) {
  const oldHit = cloudFrontMatches(OLD, url);
  const cap = firstStarCapture(OLD, url);
  const newHits = NEW.filter((p) => cloudFrontMatches(p.resource, url)).map((p) => p.kind);
  const reqPath = new URL(url).pathname;
  const sent = NEW.filter((p) => pathMatch(reqPath, p.path)).map((p) => p.path);
  console.log([name, url, oldHit ? '일치' : '불일치', cap === null ? '-' : JSON.stringify(cap),
    newHits.length ? newHits.join(',') : '없음', sent.length ? sent.join(',') : '없음'].join('\t'));
}

// 문서 예시 자체도 같은 매처로 확인한다(매처가 규칙을 옮겼는지 양성 대조).
const DOC = 'https://d111111abcdef8.cloudfront.net/*game_download.zip*';
const DOC_URLS = [
  'https://d111111abcdef8.cloudfront.net/game_download.zip',
  'https://d111111abcdef8.cloudfront.net/example_game_download.zip?license=yes',
  'https://d111111abcdef8.cloudfront.net/test_game_download.zip?license=temp',
];
console.log('');
console.log('# 양성 대조 — AWS 문서 예시 Resource 와 「would include」 로 든 세 주소');
for (const u of DOC_URLS) console.log(`${cloudFrontMatches(DOC, u) ? '일치' : '불일치'}\t${u}`);
