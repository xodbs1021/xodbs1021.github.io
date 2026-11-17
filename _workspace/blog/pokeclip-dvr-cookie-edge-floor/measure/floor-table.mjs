// 공개 재측정 — dvr-floor.js 결정 표.
//
//   node floor-table.mjs <PokeClip-mono 를 푼 폴더>
//
// PokeClip-mono 저장소의 시험 로더(cf-function-loader.mjs)로 dvr-floor.js 원문을 node 에서 평가하고,
// 가짜 KVS 를 바꿔 가며 요청마다 「막음(404) · 넘김」 과 KVS 호출 수 · 함수 로그를 적는다.
// 스트림 · 회차 · seq · 하한은 모두 지어낸 값이다(실제 방송과 무관).
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';

const root = process.argv[2];
if (!root) {
  console.error('usage: node floor-table.mjs <PokeClip-mono 를 푼 폴더>');
  process.exit(2);
}
const fnDir = join(root, 'infra/terraform/modules/cdn_media/functions');
const loader = await import(pathToFileURL(join(fnDir, 'test/cf-function-loader.mjs')).href);

const APP_ORIGIN = 'https://app.example.com';
const source = loader.renderTemplate(
    loader.readFunctionSource(join(fnDir, 'dvr-floor.js')), {app_origin: APP_ORIGIN});

const KEY = 's1/r1';
const FLOOR = '1200';

/** 가짜 cloudfront 모듈. 실제 KVS 처럼 get() 은 없는 키에 reject 한다. */
function fakeCf(values, faults = {}) {
  const calls = {exists: 0, get: 0};
  const kvs = {
    async exists(key) {
      calls.exists++;
      if (faults.failExists) throw new Error('kvs unavailable');
      return Object.hasOwn(values, key);
    },
    async get(key) {
      calls.get++;
      if (faults.failGet) throw new Error('kvs unavailable');
      if (!Object.hasOwn(values, key)) throw new Error('key not found');
      return values[key];
    },
  };
  return {cf: {kvs: () => kvs}, calls};
}

const seg = (seq) => `/dvr/s1/r1/seg/${String(seq).padStart(6, '0')}.m4s`;

const CASES = [
  ['하한 아래', 'GET', seg(1199), {[KEY]: FLOOR}, {}],
  ['하한과 같음', 'GET', seg(1200), {[KEY]: FLOOR}, {}],
  ['하한 위', 'GET', seg(1201), {[KEY]: FLOOR}, {}],
  ['키 없음(회차 닫힘 · 아직 안 씀)', 'GET', seg(1), {}, {}],
  ['KVS 읽기 실패(exists)', 'GET', seg(1), {[KEY]: FLOOR}, {failExists: true}],
  ['KVS 읽기 실패(get)', 'GET', seg(1), {[KEY]: FLOOR}, {failGet: true}],
  ['값 이상(앞자리 0)', 'GET', seg(1), {[KEY]: '01200'}, {}],
  ['값 이상(숫자 아님)', 'GET', seg(1), {[KEY]: 'abc'}, {}],
  ['경로 변조 표시 — 퍼센트', 'GET', '/dvr/s1/r1/seg/%30%30%30001.m4s', {[KEY]: FLOOR}, {}],
  ['경로 변조 표시 — 점 구간', 'GET', '/dvr/s1/x/../r1/seg/000001.m4s', {[KEY]: FLOOR}, {}],
  ['경로 변조 표시 — 빈 구간', 'GET', '/dvr/s1//r1/seg/000001.m4s', {[KEY]: FLOOR}, {}],
  ['경로 변조 표시 — 역슬래시', 'GET', '/dvr/s1\\r1/seg/000001.m4s', {[KEY]: FLOOR}, {}],
  ['안전 정수 밖 seq', 'GET', '/dvr/s1/r1/seg/9999999999999999999.m4s', {[KEY]: FLOOR}, {}],
  ['옛 꼴 조각(회차 없음)', 'GET', '/dvr/s1/seg/000001.m4s', {[KEY]: FLOOR}, {}],
  ['되감기 목록', 'GET', '/dvr/s1/sess1/index.m3u8', {[KEY]: FLOOR}, {}],
  ['init', 'GET', '/dvr/s1/init/sess1.mp4', {[KEY]: FLOOR}, {}],
  ['OPTIONS(사전 요청)', 'OPTIONS', seg(1), {[KEY]: FLOOR}, {}],
];

const rows = [];
for (const [name, method, uri, values, faults] of CASES) {
  const {cf, calls} = fakeCf(values, faults);
  const logs = [];
  const handler = loader.loadHandlerFromSource(source, 'dvr-floor.js', {cf, logs});
  const out = await handler({request: {method, uri, querystring: {}, headers: {}, cookies: {}}});
  const decision = out.statusCode === undefined ? '넘김' : `막음 ${out.statusCode}`;
  const noStore = out.headers && out.headers['cache-control'] ? out.headers['cache-control'].value : '';
  rows.push([name, method, uri, JSON.stringify(values), JSON.stringify(faults), decision,
    noStore, `${calls.exists}/${calls.get}`, logs.join(' | ')]);
}

console.log(['경우', '메서드', '경로', 'KVS', '장애', '결정', 'cache-control', 'KVS 호출(exists/get)', '함수 로그'].join('\t'));
for (const r of rows) console.log(r.join('\t'));
