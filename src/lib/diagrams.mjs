import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import MarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';

// Mermaid is rendered ahead of time (scripts/render-diagrams.mjs) and committed, because the
// Vercel build image cannot run Chromium. Colors are CSS variables, so one SVG serves both themes.
const root = process.cwd();
export const DIAGRAM_DIR = 'data/diagrams/mermaid';
export const MANIFEST_PATH = 'data/diagram-manifest.json';
// Mermaid is a dev dependency (only the render script runs it); builds without it read the lockfile.
const installed = path.join(root, 'node_modules/mermaid/package.json');
export const mermaidVersion = fs.existsSync(installed)
  ? JSON.parse(fs.readFileSync(installed, 'utf8')).version
  : JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')).packages['node_modules/mermaid'].version;

// Bump when the render configuration below changes; every key changes with it.
export const RENDER_POLICY = 'v2-classic-base-sentinel-15px-svglabels-tb-narrow-badges';
export const FONT_SIZE = 15;
// Placeholder colors (unused by any diagram) rewritten to var(--token) after rendering.
export const MERMAID_SENTINELS = {
  node: ['#0a0c01', 'bg'], text: ['#0a0c02', 'ink'], border: ['#0a0c03', 'muted'], line: ['#0a0c04', 'muted'],
  cluster: ['#0a0c05', 'surface'], label: ['#0a0c06', 'surface'], accent: ['#0a0c07', 'accent'],
  note: ['#0a0c08', 'accentSoft'], secondary: ['#0a0c09', 'surface'], tertiary: ['#0a0c0a', 'bg'],
};

export const diagramKey = source => createHash('sha256').update(source.trim()).update('\0' + RENDER_POLICY + '\0' + mermaidVersion).digest('hex').slice(0, 16);

// Wide flowcharts get a top-to-bottom variant for narrow screens.
export function narrowSource(source) {
  const lines = source.split('\n');
  const index = lines.findIndex(line => /^\s*(flowchart|graph)\s+(LR|RL)\b/.test(line));
  if (index < 0) return null;
  lines[index] = lines[index].replace(/\b(LR|RL)\b/, 'TB');
  return lines.join('\n');
}

export function loadManifest() {
  const file = path.join(root, MANIFEST_PATH);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

export function readDiagramSvg(entry, variant) {
  return fs.readFileSync(path.join(root, DIAGRAM_DIR, entry[variant].file), 'utf8');
}

// Every Mermaid fence in every post file, drafts included (an isolated draft build must not fail).
const md = new MarkdownIt({html: true}).use(attrs);
const files = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
export function collectDiagrams(dir = path.join(root, 'content/posts')) {
  return files(dir).filter(file => file.endsWith('.md')).flatMap(file => {
    const text = fs.readFileSync(file, 'utf8').replace(/\{\{<\s*rawhtml\s*>\}\}[\s\S]*?\{\{<\s*\/rawhtml\s*>\}\}/g, '');
    return md.parse(text, {}).filter(t => t.type === 'fence' && t.info.trim() === 'mermaid')
      .map(t => ({file: path.relative(root, file), source: t.content, key: diagramKey(t.content)}));
  });
}
