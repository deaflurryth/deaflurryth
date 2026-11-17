// Single source of truth for the generated parts of README.md.
// Edit this file, then run: node scripts/build.mjs
//
// Icons come from Simple Icons (https://simpleicons.org): `slug` is the icon's
// slug on that site. Brand colour is picked up automatically and nudged for
// contrast in each theme; pass `color` to override it. Some logos were removed
// from newer Simple Icons releases; `from` pins the release to take them from.
// Wordmark-only logos are unreadable at 44px: list those tools in `also`
// (text only, shown after the icon names).

export const SIMPLE_ICONS_VERSION = '16.36.0';

// Images are referenced by absolute raw URLs: GitHub does not rewrite
// relative paths inside <picture><source srcset>.
export const REPO = { slug: 'deaflurryth/deaflurryth', branch: 'main' };

export const hero = {
  handle: '~/deaflurryth',
  name: 'Dmitrii Borodulin',
  taglines: [
    'Fullstack engineer · design-grade frontend',
    'Next.js 16 · React 19 · FastAPI · Postgres',
    'Agentic systems · LangGraph · MCP · RAG',
    'Shipping with Claude Code & Codex',
    'Off-hours: catching pike, not bugs',
  ],
  // Pixel-knight style that the banner swaps to. Bitmap font: A–Z, 0–9, space . , : / ~ - · & > !
  knight: {
    handle: '~/deaflurryth',
    lines: ['LVL 99 fullstack knight', 'Quest: slay bugs, ship AI'],
  },
};

export const links = [
  { label: 'Telegram', href: 'https://t.me/deaflurryth', logo: 'telegram', logoColor: '26A5E4' },
  { label: 'Email', href: 'mailto:amflurry@icloud.com', logo: 'icloud', logoColor: '3693F3' },
  { label: 'itsforge.ru', href: 'https://itsforge.ru/', icon: 'globe' },
];

export const stack = [
  {
    title: 'Frontend',
    items: [
      { slug: 'typescript', name: 'TypeScript' },
      { slug: 'react', name: 'React 19' },
      { slug: 'nextdotjs', name: 'Next.js 16' },
      { slug: 'tailwindcss', name: 'Tailwind CSS' },
      { slug: 'css', name: 'Modern CSS' },
      { slug: 'threedotjs', name: 'Three.js' },
      { slug: 'radixui', name: 'Radix UI' },
      { slug: 'shadcnui', name: 'shadcn/ui' },
      { slug: 'vite', name: 'Vite' },
    ],
    also: ['GSAP', 'Motion', 'WebGL', 'Zustand', 'Recharts', 'React Flow', 'Remotion'],
  },
  {
    title: 'Backend & Data',
    items: [
      { slug: 'python', name: 'Python' },
      { slug: 'fastapi', name: 'FastAPI' },
      { slug: 'nodedotjs', name: 'Node.js' },
      { slug: 'prisma', name: 'Prisma' },
      { slug: 'postgresql', name: 'PostgreSQL' },
      { slug: 'redis', name: 'Redis' },
      { slug: 'keycloak', name: 'Keycloak' },
    ],
    also: ['SQLAlchemy', 'Alembic', 'Taskiq', 'Auth.js', 'S3'],
  },
  {
    title: 'AI & Agentic',
    items: [
      { slug: 'claude', name: 'Claude Code' },
      { slug: 'openai', name: 'Codex & OpenAI API', from: '15.0.0', color: '000000' },
      { slug: 'cursor', name: 'Cursor' },
      { slug: 'modelcontextprotocol', name: 'MCP' },
      { slug: 'langgraph', name: 'LangGraph' },
      { slug: 'pydantic', name: 'Pydantic AI' },
      { slug: 'qdrant', name: 'Qdrant' },
      { slug: 'huggingface', name: 'Hugging Face' },
      { slug: 'scikitlearn', name: 'scikit-learn' },
    ],
    also: ['Context7', 'Chrome DevTools MCP', 'Sentence Transformers', 'OpenAI-compatible LLMs'],
  },
  {
    title: 'Infra & Observability',
    items: [
      { slug: 'docker', name: 'Docker' },
      { slug: 'githubactions', name: 'GitHub Actions' },
      { slug: 'caddy', name: 'Caddy' },
      { slug: 'nginx', name: 'NGINX' },
      { slug: 'linux', name: 'Linux' },
      { slug: 'prometheus', name: 'Prometheus' },
      { slug: 'grafana', name: 'Grafana' },
      { slug: 'opentelemetry', name: 'OpenTelemetry' },
      { slug: 'jaeger', name: 'Jaeger' },
    ],
    also: ['Loki', 'SearXNG', 'Umami'],
  },
  {
    title: 'Workflow',
    items: [
      { slug: 'git', name: 'Git' },
      { slug: 'github', name: 'GitHub' },
      { slug: 'pnpm', name: 'pnpm' },
      { slug: 'biome', name: 'Biome' },
      { slug: 'vitest', name: 'Vitest' },
      { slug: 'playwright', name: 'Playwright', from: '12.0.0', color: '2EAD33' },
      { slug: 'figma', name: 'Figma' },
      { slug: 'linear', name: 'Linear' },
      { slug: 'obsidian', name: 'Obsidian' },
    ],
    also: ['uv', 'Ruff', 'pytest', 'Stylelint'],
  },
];
