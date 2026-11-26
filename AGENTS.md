# AGENTS.md

## Project
A personal blog in Portuguese about DevOps in a world with AI. It is built as a static site.
- Product: [docs/prd.md](docs/prd.md)
- Technical: [docs/trd.md](docs/trd.md)
- Plan: [docs/scope/](docs/scope/README.md)
- Specs: [docs/specs/](docs/specs/project-scaffold.md)
- Visuals: [design/](design/AGENTS.md)

## Stack
Installed today (versions in `package.json`):
- Astro 7 (static output, no adapter) on Node 26 LTS (`.nvmrc`, `engines.node` >=26), pnpm (pinned in `packageManager`).
- TypeScript pinned to 6.0.x (`~6.0.3`): `astro check` refuses TS 7 and `typescript-eslint` needs <6.1. Config extends `astro/tsconfigs/strictest`.
- ESLint 10 (flat config, `typescript-eslint` strict type-checked, `eslint-plugin-astro`) and Prettier with `prettier-plugin-astro`.
- MDX (`@astrojs/mdx`) and Astro content collections: `posts`, `tags`, `series` and `pages`, with Zod schemas in `src/lib/content/`. `yaml` is a direct dependency, used only by `scripts/check-references.ts`.
- Vitest with v8 coverage (`src/lib/**`, 80% minimum, `lcov` for Sonar).
- Playwright (Chromium + WebKit mobile) with `@axe-core/playwright`, run against the built `dist/`.

Not installed yet (the TRD plans them): Shiki, Sveltia CMS, Pagefind, Cloudflare Workers Static Assets and `wrangler`, Terraform, GitHub Actions, Sonar. List a tool here only once it is installed.

The PRD and TRD are the main sources of truth. `design/` covers visuals only and defers to them on any conflict.

## Commands
The package manager is pnpm (never npm or yarn). Node 26 doesn't ship Corepack, so install pnpm with `npm i -g pnpm`. Make sure `node -v` is 26 first: `engineStrict` in `pnpm-workspace.yaml` rejects an older Node.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Static build into `dist/`. `prebuild` runs `scripts/check-references.ts` first and exits 1 on a tag or series that does not exist (Astro 7 only logs it and exits 0) |
| `pnpm preview` | Serves `dist/`. Astro backgrounds it when it detects an AI agent; use `astro preview stop` to stop it, or `--ignore-lock` for a foreground server |
| `pnpm check` | `astro check` (types and schemas) |
| `pnpm lint` | `eslint .` and `prettier --check .` |
| `pnpm format` | `prettier --write .` (skips `docs/`, `design/`, `.claude/`, `AGENTS.md`) |
| `pnpm test` / `pnpm test:coverage` | Vitest (`tests/unit/**`) / with coverage and the 80% gate |
| `pnpm test:e2e` | Builds, serves `dist/` and runs Playwright + axe |

Planned in the TRD:
- TODO: `pagefind --site dist`
- TODO: `wrangler deploy`; `terraform fmt/validate/plan` in `infra/`

Never run `pnpm approve-builds --all`: install scripts stay blocked unless a dependency is explicitly allowed.

## Structure
```text
.claude/skills/        workflow skills (see .claude/skills/README.md)
.nvmrc                 Node 26 (LTS), same as CI
design/                mockups (telas/*.dc.html), tokens.css, assets/ — visual reference (defers to PRD/TRD)
docs/                  prd.md, trd.md (Portuguese), scope/, specs/
src/content/           real posts, tags, series, pages (empty for now)
src/content.config.ts  collections and glob loaders only; rules live in src/lib/content/
src/lib/               logic in .ts (site.ts, content/: schemas, visibility, references, dir)
scripts/               build-time scripts run with Node's native TypeScript (check-references.ts)
src/pages/             routes (placeholder index.astro)
tests/unit/            Vitest (see tests/AGENTS.md)
tests/e2e/             Playwright + axe
tests/fixtures/content/  test posts, kept apart from real posts
tests/fixtures/invalid/  one full content dir per broken rule; each must fail the build
astro.config.ts  tsconfig.json  eslint.config.mjs  vitest.config.ts  playwright.config.ts
pnpm-workspace.yaml    engineStrict
LICENSE  BRAND.md  README.md
```
Planned layout: the TRD's "Estrutura do repositório" section (`content/`, `components/`, `layouts/`, `infra/`, `public/`, `.github/workflows/`). URLs have no trailing slash (`trailingSlash: 'never'`, `build.format: 'file'`).

## Conventions
- English for code, commits, branches and workflow docs. Portuguese only for the PRD, the TRD, `docs/adr/` and blog content, including posts and site UI copy (RN5).
- Logic goes in `.ts` files (`src/lib`), and `.astro` files contain markup only, because Sonar does not analyze `.astro`.
- Site code reads only `PUBLIC_` env vars. `PUBLIC_CONTENT_DIR` picks the content dir (default `src/content`); the e2e run sets it to `tests/fixtures/content`.
- Every content id is lowercase kebab-case, and `prebuild` fails otherwise: the post slug is the folder name under `posts/`, and tag, series and page ids are the file name without the extension; `sectionColor` values are the ASCII `data-tone` ids from `design/tokens.css`. `publishDate` is written as ISO 8601 with an offset (YAML parses it before Zod, so the zone is not validated). A `:` inside a frontmatter value needs quotes. Pages ship zero JS by default, and an island is added only where it is needed.
- E2E tests run on `tests/fixtures/content`, never on real posts.
- Git flow: `feature/*` branches off `develop` and `hotfix/*` off `main`. `main` is production. Commits follow Conventional Commits (skills `branch` and `commit`). Before creating a branch, fetch and fast-forward local `develop` to `origin/develop`.
- No co-author or tool attribution in commits or PRs.

## Workflow
| Skill | Writes to |
| --- | --- |
| `scope` | `docs/scope/README.md` |
| `audit` | `AGENTS.md`, nested `AGENTS.md` |
| `architect` | `docs/specs/`, `docs/adr/` |
| `develop` | code, spec/scope status |
| `check` | `docs/reviews/` (never edits code) |
| `test` | `tests/`, spec → `Accepted` |
| `document` | `CHANGELOG.md`, PR description |
| `sync` | context files, scope, specs |
| `debug` | code (hands a regression test to `test`) |
| `branch` / `commit` | git |
| `pr` | GitHub PR (via `gh`) |

Typical flow: `scope → audit → architect → branch → develop → check verify → test → check review → document → sync → commit → pr`. Only the user marks a feature `Done`.
