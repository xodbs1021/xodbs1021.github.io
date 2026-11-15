// raw/<브라우저>.json 을 읽어 요약을 표준 출력으로 쓴다.
//   node summarize.mjs raw/chrome.json [raw/firefox.json …] > raw/summary.md
import { readFile } from 'node:fs/promises';

const lines = [];
for (const file of process.argv.slice(2)) {
  const r = JSON.parse(await readFile(file, 'utf8'));
  lines.push(`## ${r.browser} ${r.version}`, '', `- 잰 때: ${r.measuredAt}`, `- UA: ${r.userAgent}`, '');
  lines.push('### 일곱 값', '', '| 넣은 값 | 넣은 직후 | seeked 뒤 | 차(seeked 뒤 − 넣은 값) | µs 아래 버린 값과 같음 | 3회 같음 |', '|---|---|---|---|---|---|');
  r.snap[0].forEach((row, i) => {
    const same = r.snap.every((s) => s[i].during === row.during && s[i].after === row.after);
    lines.push(`| ${row.set} | ${row.during} | ${row.after} | ${row.diff.toExponential(2)} | ${row.afterEqualsTruncUs ? '예' : '아니오'} | ${same ? '예' : '아니오'} |`);
  });
  const t = r.ticks;
  const mult9 = t.filter((x) => x.tick % 9 === 0);
  lines.push('', '### 90kHz 틱 훑기', '',
    `- 틱 ${t[0].tick}–${t[t.length - 1].tick}(${t.length}개, ${t[0].set}–${t[t.length - 1].set}초)`,
    `- seeked 뒤 값이 넣은 값보다 작음: ${t.filter((x) => x.smaller).length}/${t.length}`,
    `- seeked 뒤 값 = µs 아래 버린 값: ${t.filter((x) => x.afterEqualsTruncUs).length}/${t.length}`,
    `- 넣은 직후 값 = seeked 뒤 값: ${t.filter((x) => x.during === x.after).length}/${t.length}`,
    `- 9의 배수 틱(µs 에 딱 맞는 값) ${mult9.length}개 가운데 작아짐: ${mult9.filter((x) => x.smaller).length}`,
    `- 9의 배수가 아닌 틱 ${t.length - mult9.length}개 가운데 작아짐: ${t.filter((x) => x.tick % 9 !== 0 && x.smaller).length}`);
  const m = r.ms;
  const mSmaller = m.filter((x) => x.smaller);
  lines.push('', '### 정수 ms 훑기', '', `- ${m[0].set}–${m[m.length - 1].set}초(${m.length}개)`,
    `- seeked 뒤 값이 넣은 값보다 작음: ${mSmaller.length}/${m.length}${mSmaller.length ? ' — ' + mSmaller.slice(0, 12).map((x) => `${x.set}→${x.after}`).join(', ') + (mSmaller.length > 12 ? ' …' : '') : ''}`,
    `- seeked 뒤 값 = µs 아래 버린 값: ${m.filter((x) => x.afterEqualsTruncUs).length}/${m.length}`);
  lines.push('', '### 최소 재현(재생 없이 5초)', '', '| 회 | 조건 | 구간 시작 | 위치 넣기 | seeked | 초당 seeked | seeked 간격 중앙값(ms) | 읽은 위치 | 끝 readyState / seeking | 표본 중 readyState 4 · seeking |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const l of r.loop) {
    lines.push(`| ${l.round} | ${l.condition} | ${l.start} | ${l.sets} | ${l.seeked} | ${l.seekedPerSecond.toFixed(1)} | ${l.medianSeekedGapMs === null ? '—' : l.medianSeekedGapMs.toFixed(1)} | ${l.readBack.join(' · ')} | ${l.endReadyState} / ${l.endSeeking} | ${l.samplesHaveEnoughData}/${l.samples} · ${l.samplesSeeking}/${l.samples} |`);
  }
  lines.push('');
}
console.log(lines.join('\n'));
