# taeyun.blog

Astro로 만드는 김태윤의 기술 블로그. 글은 `content/posts/`, 이미지와 PDF는 `static/`에 둡니다. 기존 Hugo 글의 경로와 본문을 유지합니다.

## 작업과 검증

```sh
npm ci
npm run dev
npm run build
npm test
```

Markdown의 YAML/JSON frontmatter를 지원합니다. `title`, `date`, `categories`, `tags`, `description`, `draft`를 사용합니다. 새 글은 기존 경로 규칙인 `/posts/<category>/<filename>/`에 생성됩니다. 기존 `chart`·`rawhtml` shortcode와 Mermaid 코드 블록도 지원합니다. 차트는 보일 때 로드하고, 검색은 MiniSearch로 제목·태그·본문을 검색하며 한글 부분 일치와 띄어쓰기 차이를 처리합니다. 검색어는 외부 서비스로 전송하지 않습니다. 분류는 `src/lib/taxonomy.mjs`에서 관리하며, 분류 변경 시에도 기존 글 URL은 유지합니다.

이미지는 `static/images/`에 저장하고 `/images/...`로 참조합니다. Markdown 안에 `<video controls playsinline preload="metadata" poster="/images/poster.webp"><source src="https://.../video.mp4" type="video/mp4"></video>`를 넣을 수 있습니다. 큰 동영상 파일은 Git에 넣지 말고 별도의 미디어 저장소 URL을 사용합니다. YouTube는 개인정보 보호 강화 임베드를 권장합니다. 이미지 설명과 영상 설명/자막을 함께 제공합니다.

## 배포

Vercel은 GitHub `main`에서 정적 글과 `api/views.mjs`만 배포합니다. GitHub Pages는 같은 글의 새 주소로 이동하는 HTML과 기존 정적 파일을 제공합니다. Pages의 제약상 HTTP 301이 아닌 canonical + meta refresh + `location.replace` 방식입니다. JavaScript에서는 경로, 쿼리, fragment가 보존됩니다.

## 조회수와 보안

서버 환경 변수: `KV_REST_API_URL`, `KV_REST_API_TOKEN` (또는 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`), `VIEWS_HASH_SECRET`. 비밀키는 클라이언트나 Git에 넣지 않습니다.

동일 IP·글·UTC 날짜 단위로 중복을 억제합니다. 원문 IP를 저장하지 않고 일별 HMAC만 사용하며 2일 후 만료합니다. API는 게시된 slug만 허용하고 POST origin을 검사합니다. Lua로 중복 확인과 증가를 원자적으로 수행합니다. 앱에서 IP별 분당 20회, 전체 POST 하루 4,000회 한도를 적용하고 Vercel WAF는 API에 IP별 분당 30회 한도를 적용합니다. GET은 CDN에서 5분 캐시합니다. 상한/DB 장애는 조회수에만 영향을 주며 정적 글은 계속 제공됩니다. 이 수치는 정밀한 사용자 분석이 아닙니다.

Vercel 자동 DDoS 보호를 유지합니다. 공격 시 Firewall에서 Attack Challenge Mode를 잠시 켤 수 있으나 검색/LinkedIn 미리보기까지 방해할 수 있어 평상시에는 켜지 않습니다. 무료 Redis 자동 유료 전환은 끕니다. 자동 DDoS 보호가 모든 악성 요청과 모든 사용량을 막는 것은 아닙니다.

CSP의 inline script 허용은 Astro의 초기 테마 설정, JSON-LD와 기존 Markdown HTML을 위한 현재 호환성 선택입니다. `unsafe-eval`은 허용하지 않고, object/frame/base 정책과 기본 보안 헤더를 적용합니다. 실제 독자 입력을 HTML로 렌더링하는 기능은 없습니다.
