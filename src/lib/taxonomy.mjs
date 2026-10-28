export const categories = {
  projects: { title: '프로젝트 기록', description: '문제 정의와 설계의 선택, 구현 이후의 검증과 회고.' },
  'open-source': { title: '오픈소스', description: '공개 코드를 읽고 문제를 분석하며 기여한 기록.' },
  'technical-notes': { title: '기술 해설', description: '스트리밍, 데이터베이스, 네트워크의 동작 원리.' },
  notes: { title: '개발 노트', description: '개발 도구와 블로그 운영, 책과 학습에서 얻은 생각.' },
};
export const legacyCategories = {'0-to-1':'projects','open-source-analysis':'open-source','tech-blurting':'technical-notes','book-review':'notes','coding-test':null};
const notes = new Set(['harness-session-isolation-worktree-root','soma-k1-6month-goals','blog-improvement-report','github-pages-blog-automation']);
export function classify(slug, original) {
  if (notes.has(slug.split('/').at(-1))) return 'notes';
  return Object.hasOwn(categories, original) ? original : legacyCategories[original] || 'notes';
}
