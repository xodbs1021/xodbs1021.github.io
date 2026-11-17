// 공개 재측정 — media 배포의 경로 규칙(캐시 비헤이비어) 표를 Terraform 원문에서 뽑는다.
//
//   node behaviors.mjs <cdn_media/main.tf>
//
// AWS 를 부르지 않고 terraform 도 돌리지 않는다. main.tf 의 locals.ordered_behaviors 목록과
// default_cache_behavior 블록을 글자 그대로 읽어, 순서 · 경로 패턴 · 원본 · 서명 쿠키 요구 · 붙은 함수를 적는다.
// CloudFront 는 이 순서대로 경로를 견주고 처음 맞는 규칙을 쓴다(AWS 문서 「Cache behavior settings」 Path pattern).
import {readFileSync} from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node behaviors.mjs <cdn_media/main.tf>');
  process.exit(2);
}
const src = readFileSync(path, 'utf8');

const listStart = src.indexOf('ordered_behaviors = [');
const listEnd = src.indexOf('\n  ]\n', listStart);
if (listStart < 0 || listEnd < 0) throw new Error('ordered_behaviors 목록을 찾지 못했다');
const list = src.slice(listStart, listEnd);

const field = (block, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*(.+)`).exec(block);
  return m ? m[1].trim() : '';
};

const ORIGIN = {
  'local.media_alb_origin_id': 'Media 상자(내부 ALB · VPC 원본)',
  'local.rewind_origin_id': 'S3 되감기 버킷(OAC)',
};
const FUNCS = {
  '{}': '없음',
  'local.live_auth_events': 'live-auth(viewer-request)',
  'local.dvr_floor_events': 'dvr-floor(viewer-request · 스위치)',
};
const signed = (v) => (v === 'null' ? '아니오' : '예(키 그룹)');

const blocks = list.split(/\n    \{\n/).slice(1);
const rows = blocks.map((b, i) => [
  String(i + 1),
  JSON.parse(field(b, 'path_pattern')),
  ORIGIN[field(b, 'origin_id')] || field(b, 'origin_id'),
  signed(field(b, 'trusted_key_groups')),
  FUNCS[field(b, 'functions')] || field(b, 'functions'),
  field(b, 'cache_policy_id').replace(/^aws_cloudfront_cache_policy\.|\.id$/g, ''),
]);

const def = /default_cache_behavior \{([\s\S]*?)\n  \}/.exec(src);
if (!def) throw new Error('default_cache_behavior 를 찾지 못했다');
const defFn = /function_arn\s*=\s*aws_cloudfront_function\.(\w+)\.arn/.exec(def[1]);
rows.push([
  '기본', '*',
  `${ORIGIN[field(def[1], 'target_origin_id')] || field(def[1], 'target_origin_id')} — 함수가 먼저 404`,
  signed(field(def[1], 'trusted_key_groups')),
  defFn ? `${defFn[1].replace(/_/g, '-')}(viewer-request)` : '없음',
  field(def[1], 'cache_policy_id').replace(/^aws_cloudfront_cache_policy\.|\.id$/g, ''),
]);

const origins = [...src.matchAll(/^\s{2}origin \{\n\s+origin_id\s*=\s*(\S+)/gm)].map((m) => m[1]);
const groups = (src.match(/origin_group\s*\{/g) || []).length;

console.log(['순서', '경로 패턴', '원본', '서명 쿠키', '함수', '캐시 정책'].join('\t'));
for (const r of rows) console.log(r.join('\t'));
console.log('');
console.log(`# 원본 블록 ${origins.length}개: ${origins.join(', ')} · 오리진 그룹(origin_group) ${groups}개`);
console.log(`# 배포 리소스(aws_cloudfront_distribution) ${(src.match(/resource "aws_cloudfront_distribution"/g) || []).length}개`);
