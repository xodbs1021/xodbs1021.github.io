// Pretendard(SIL OFL 1.1) 가변 글꼴을 npm 꾸러미에서 public/fonts 로 복사한다.
// 글꼴 파일은 저장소에 커밋하지 않는다(.gitignore) — 설치할 때마다 만든다.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve("pretendard/package.json"));
const src = join(pkgDir, "dist/web/variable/woff2/PretendardVariable.woff2");
const destDir = new URL("../public/fonts/", import.meta.url);

mkdirSync(destDir, { recursive: true });
copyFileSync(src, new URL("PretendardVariable.woff2", destDir));
console.log("copied PretendardVariable.woff2 → public/fonts/");
