// check-alpha.mjs <png>... — 모션그래픽 소재가 정말 투명 배경인지 본다(저장소 루트에서 실행, 블로그 의존성 sharp 사용).
// 알파 채널이 있다는 것(sips hasAlpha)만으로는 부족하다 — 모든 픽셀이 불투명한 RGBA 도 통과한다.
// 그래서 네 모서리 픽셀이 투명(알파 0)인지와 투명 픽셀 비율을 잰다. 하나라도 어기면 종료 코드 1.
import sharp from "sharp";

/** 투명으로 볼 알파 상한(0–255). 가장자리 안티앨리어싱 잡음을 조금 허용한다. */
const CLEAR = 8;
/** 소재 그림에서 배경이 차지해야 할 최소 비율. 오브젝트 하나가 가운데 있으면 보통 30% 를 넘는다. */
const MIN_CLEAR_RATIO = 0.2;

const check = async (file) => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const alphaAt = (x, y) => data[(y * width + x) * channels + channels - 1];
  const corners = [alphaAt(0, 0), alphaAt(width - 1, 0), alphaAt(0, height - 1), alphaAt(width - 1, height - 1)];
  let clear = 0;
  for (let i = channels - 1; i < data.length; i += channels) {
    if (data[i] <= CLEAR) clear += 1;
  }
  const ratio = clear / (width * height);
  const ok = corners.every((a) => a <= CLEAR) && ratio >= MIN_CLEAR_RATIO;
  console.log(`${ok ? "OK  " : "FAIL"} ${file} 모서리 알파 ${corners.join("/")} · 투명 ${(ratio * 100).toFixed(0)}%`);
  return ok;
};

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("사용법: node .claude/skills/gpt-image/scripts/check-alpha.mjs <png>...");
  process.exit(2);
}
const results = await Promise.all(files.map(check));
process.exit(results.every(Boolean) ? 0 : 1);
