// Figure numbering and captions shared by diagrams, charts, inline SVG and images.
export const FIGURE_KINDS = ['실측', '문헌값', '설명용 가정', '개념도', '재구성', '스크린샷'];

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// key="value" pairs as written in shortcodes; values may contain spaces and Korean text.
export function parseArgs(text = '') {
  return Object.fromEntries([...String(text).matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
}

const sourceHtml = source => /^https?:\/\//.test(source)
  ? `<a href="${esc(source)}">${esc(new URL(source).hostname)}</a>`
  : esc(source);

export function createFigures(slug) {
  const figures = [], warnings = [];
  return {
    figures, warnings,
    // meta: {type, id?, kind?, caption?, source?, fallbackCaption?}
    add(meta) {
      const number = figures.length + 1;
      const id = meta.id || `fig-${number}`;
      if (figures.some(f => f.id === id)) warnings.push(`${slug}: duplicate figure id ${id}`);
      if (meta.kind && !FIGURE_KINDS.includes(meta.kind)) warnings.push(`${slug}: figure ${number} has unknown kind "${meta.kind}" (allowed: ${FIGURE_KINDS.join(', ')})`);
      const complete = Boolean(meta.kind && meta.caption);
      if (!complete) warnings.push(`${slug}: figure ${number} (${meta.type}) lacks ${[!meta.kind && 'kind', !meta.caption && 'caption'].filter(Boolean).join(' and ')}`);
      const caption = meta.caption || meta.fallbackCaption || '';
      const figure = {number, id, type: meta.type, kind: meta.kind || null, caption: meta.caption || null, source: meta.source || null, complete};
      figures.push(figure);
      const parts = [`<span class="fig-label">그림 ${number}.</span>`];
      if (caption) parts.push(` ${esc(caption)}`);
      if (meta.kind) parts.push(` <span class="fig-kind">${esc(meta.kind)}</span>`);
      if (meta.source) parts.push(` <span class="fig-source">출처: ${sourceHtml(meta.source)}</span>`);
      return {...figure, label: `그림 ${number}`, title: caption || `그림 ${number}`, figcaption: `<figcaption>${parts.join('')}</figcaption>`};
    },
    // [[fig-id]] in prose becomes a link to the numbered figure.
    linkReferences(html) {
      return html.replace(/\[\[(fig-[\w-]+)\]\]/g, (whole, id) => {
        const figure = figures.find(f => f.id === id);
        if (!figure) { warnings.push(`${slug}: reference to unknown figure ${id}`); return whole; }
        return `<a class="fig-ref" href="#${esc(id)}">그림 ${figure.number}</a>`;
      });
    },
  };
}
