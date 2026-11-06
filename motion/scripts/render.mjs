// 장면을 블로그 static/ 아래로 렌더한다. 어느 폴더에서 실행해도 motion/ 기준으로 동작한다.
//   node motion/scripts/render.mjs <장면 id ...>     장면 하나 이상
//   node motion/scripts/render.mjs --post <글 slug>   그 글의 장면 전부
//   node motion/scripts/render.mjs --check           registry · Root · 글꼴만 검사(렌더 안 함)
// 출력 — 이미지 최적화(scripts/optimize-images.mjs)가 static/images 바로 아래만 읽으므로 하위 폴더를 쓰지 않는다.
//   영상  static/videos/<글>-<장면>.mp4 (H.264) + static/images/<글>-<장면>-poster.jpg
//   정지  static/images/<글>-<장면>.png
// <장면> 은 id 를 kebab-case 로 바꾼 것이다(RewindFallout → rewind-fallout).
// 결과는 out/tmp 에 먼저 만들고, 전부 성공했을 때만 최종 위치로 옮긴다.
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia, renderStill } from "@remotion/renderer";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MOTION = fileURLToPath(new URL("..", import.meta.url));
const REPO = path.join(MOTION, "..");
const TMP = path.join(MOTION, "out", "tmp");
const FONT = path.join(MOTION, "public", "fonts", "PretendardVariable.woff2");
const ID = /^[A-Z][A-Za-z0-9]*$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const fail = (message) => {
  throw new Error(message);
};

const kebab = (id) => id.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const loadRegistry = () => {
  const registry = JSON.parse(readFileSync(path.join(MOTION, "src", "scenes", "registry.json"), "utf8"));
  if (!Array.isArray(registry)) fail("registry.json 은 배열이어야 한다");
  for (const scene of registry) {
    const where = `registry.json 의 ${JSON.stringify(scene.id)}`;
    if (typeof scene.id !== "string" || !ID.test(scene.id)) fail(`${where}: id 는 대문자로 시작하는 영숫자(PascalCase)`);
    if (typeof scene.post !== "string" || !SLUG.test(scene.post)) fail(`${where}: post 는 글 slug(소문자 · 숫자 · 하이픈)`);
    if (scene.kind !== "video" && scene.kind !== "still") fail(`${where}: kind 는 video 또는 still`);
    if (typeof scene.alt !== "string" || scene.alt.trim() === "") fail(`${where}: alt 가 비었다`);
    if (scene.kind === "video" && !Number.isInteger(scene.posterFrame)) fail(`${where}: video 는 정수 posterFrame 이 필요하다`);
  }
  const ids = registry.map((scene) => scene.id);
  if (new Set(ids).size !== ids.length) fail("registry.json 에 겹치는 id 가 있다");
  return registry;
};

const pick = (args, registry) => {
  if (args[0] === "--check") return { checkOnly: true, scenes: [] };
  if (args[0] === "--post") {
    const scenes = registry.filter((scene) => scene.post === args[1]);
    if (scenes.length === 0) fail(`registry.json 에 글 ${JSON.stringify(args[1])} 의 장면이 없다`);
    return { checkOnly: false, scenes };
  }
  if (args.length === 0) fail("쓰는 법: render.mjs <장면 id ...> | --post <글 slug> | --check");
  const ids = [...new Set(args)];
  const scenes = ids.map((id) => registry.find((scene) => scene.id === id) ?? fail(`registry.json 에 없는 장면: ${id}`));
  return { checkOnly: false, scenes };
};

const check = (registry, compositions) => {
  if (!existsSync(FONT)) fail(`글꼴이 없다: ${FONT} — motion 폴더에서 npm install 을 다시 한다`);
  const registered = new Set(compositions.map((c) => c.id));
  const listed = new Set(registry.map((scene) => scene.id));
  const onlyRoot = [...registered].filter((id) => !listed.has(id));
  const onlyRegistry = [...listed].filter((id) => !registered.has(id));
  if (onlyRoot.length > 0 || onlyRegistry.length > 0) {
    fail(`Root.tsx 와 registry.json 의 장면이 다르다 — Root 에만: [${onlyRoot}] · registry 에만: [${onlyRegistry}]`);
  }
  for (const scene of registry) {
    const { durationInFrames } = compositions.find((c) => c.id === scene.id);
    const isStill = durationInFrames === 1;
    if ((scene.kind === "still") !== isStill) {
      fail(`${scene.id}: registry kind(${scene.kind}) 와 Root 등록(${isStill ? "Still" : "Composition"})이 다르다`);
    }
    if (scene.kind === "video" && (scene.posterFrame < 0 || scene.posterFrame >= durationInFrames)) {
      fail(`${scene.id}: posterFrame ${scene.posterFrame} 이 0–${durationInFrames - 1} 밖이다`);
    }
  }
};

const outputsOf = (scene) => {
  const name = `${scene.post}-${kebab(scene.id)}`;
  if (scene.kind === "still") return [{ kind: "still", final: path.join(REPO, "static", "images", `${name}.png`) }];
  return [
    { kind: "video", final: path.join(REPO, "static", "videos", `${name}.mp4`) },
    { kind: "poster", final: path.join(REPO, "static", "images", `${name}-poster.jpg`) },
  ];
};

const renderOne = async ({ kind, tmp, scene, composition, serveUrl }) => {
  if (kind === "video") {
    await renderMedia({ composition, serveUrl, codec: "h264", crf: 23, outputLocation: tmp });
  } else if (kind === "poster") {
    await renderStill({ composition, serveUrl, output: tmp, frame: scene.posterFrame, imageFormat: "jpeg", jpegQuality: 88 });
  } else {
    await renderStill({ composition, serveUrl, output: tmp, imageFormat: "png" });
  }
};

/** 새 파일을 최종 위치로 옮긴다. 하나라도 실패하면 이미 옮긴 것을 되돌려 이전 판을 지킨다. */
const install = (done) => {
  const moved = [];
  try {
    for (const { tmp, final } of done) {
      mkdirSync(path.dirname(final), { recursive: true });
      const backup = existsSync(final) ? `${tmp}.previous` : null;
      if (backup) renameSync(final, backup);
      moved.push({ final, backup });
      renameSync(tmp, final);
    }
  } catch (error) {
    for (const { final, backup } of moved.reverse()) {
      rmSync(final, { force: true });
      if (backup) renameSync(backup, final);
    }
    throw error;
  }
  for (const { final } of done) console.log(`+ ${path.relative(REPO, final)}`);
};

const renderAll = async (scenes, compositions, serveUrl) => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  try {
    const done = [];
    for (const scene of scenes) {
      const composition = compositions.find((c) => c.id === scene.id);
      for (const { kind, final } of outputsOf(scene)) {
        const tmp = path.join(TMP, path.basename(final));
        console.log(`렌더: ${scene.id} → ${path.basename(final)}`);
        await renderOne({ kind, tmp, scene, composition, serveUrl });
        done.push({ tmp, final });
      }
    }
    install(done);
  } finally {
    rmSync(TMP, { recursive: true, force: true });
    // 확인용 프레임(out/check)이 없으면 빈 out/ 도 남기지 않는다.
    if (readdirSync(path.dirname(TMP)).length === 0) rmdirSync(path.dirname(TMP));
  }
};

const main = async () => {
  // Remotion 은 렌더용 Chrome 을 「현재 폴더에서 가장 가까운 package.json 옆 node_modules/.remotion」 에서 찾는다.
  // 저장소 루트에서 실행하면 루트에 Chrome(약 570MB)을 새로 받으므로, 먼저 motion/ 으로 옮긴다.
  process.chdir(MOTION);
  const registry = loadRegistry();
  const { checkOnly, scenes } = pick(process.argv.slice(2), registry);

  console.log("번들 중…");
  // bundle() 은 outDir 을 주지 않으면 시스템 임시 폴더에 번들을 만든다 — 끝나면 지운다.
  const serveUrl = await bundle({ entryPoint: path.join(MOTION, "src", "index.ts") });
  try {
    const compositions = await getCompositions(serveUrl);
    check(registry, compositions);
    if (checkOnly) {
      console.log(`검사 통과: 장면 ${registry.length}개, 글꼴 있음`);
      return;
    }
    await renderAll(scenes, compositions, serveUrl);
  } finally {
    rmSync(serveUrl, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error(`실패: ${error.message}`);
  process.exitCode = 1;
});
