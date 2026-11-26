# AGENTS.md

## Project
A personal blog in Portuguese about DevOps in a world with AI. It is built as a static site.
- Product: [docs/prd.md](docs/prd.md)
- Technical: [docs/trd.md](docs/trd.md)
- Plan: [docs/scope/](docs/scope/README.md)
- Specs: [docs/specs/](docs/specs/project-scaffold.md) · Reviews: [docs/reviews/](docs/reviews/)
- Visuals: [design/](design/AGENTS.md)

## Stack
Installed today (versions in `package.json`):
- Astro 7 (static output, no adapter) on Node 26 LTS (`.nvmrc`, `engines.node` >=26), pnpm (pinned in `packageManager`).
- TypeScript pinned to 6.0.x (`~6.0.3`): `astro check` refuses TS 7 and `typescript-eslint` needs <6.1. Config extends `astro/tsconfigs/strictest`.
- ESLint 10 (flat config, `typescript-eslint` strict type-checked, `eslint-plugin-astro`) and Prettier with `prettier-plugin-astro`.
- MDX (`@astrojs/mdx`) and Astro content collections: `posts`, `tags`, `series` and `pages`, with Zod schemas in `src/lib/content/`. `yaml` is a direct dependency, used only by `scripts/check-references.ts`.
- Vitest with v8 coverage (`src/lib/**`, 80% minimum, `lcov` for Sonar).
- Playwright (Chromium + WebKit mobile) with `@axe-core/playwright`, run against the built `dist/`.
- Astro Fonts API with the Google provider: the three families (Fraunces without the `opsz` axis, Instrument Sans, JetBrains Mono) are downloaded at build and self-hosted under `/_astro/fonts/`, so a build needs network the first time.
- GitHub Actions: `.github/workflows/ci.yml` (lint, `astro check`, Vitest coverage, build, lychee offline link check over `dist/`, Playwright, SonarQube Cloud gate) with `ci-gate` as the single required check. Content-only changes (`src/content/posts/**`) skip e2e and Sonar. Actions are pinned by SHA; Dependabot keeps them and npm current.
- SonarQube Cloud via the CI action (`sonar-project.properties`, `SONAR_TOKEN` secret); it does not analyze `.astro`.
- Cloudflare Workers Static Assets, deployed with `wrangler` (pinned): `wrangler.jsonc` serves `dist/` with no Worker script, and `public/_headers` holds the cache and security headers (`/*` must not set `Cache-Control`; Cloudflare merges matching rules). `deploy.yml` deploys `main` from the `production` environment, and `preview.yml` uploads a noindex Worker version per push or PR from the `preview` environment.
- Lighthouse CI (`@lhci/cli`, pinned) over `dist/`, budgets in `lighthouserc.json`, run by `deploy.yml`.
- Terraform (`~> 1.10`, providers pinned, `.terraform.lock.hcl` committed) in `infra/`: `bootstrap/` (applied once, locally), `cloudflare/` and `github/` (state in R2). `infra.yml` checks, plans and applies it. Setup and the environments table are in `infra/README.md`. Local checks also need `terraform`, `tflint` and `trivy`.

Not installed yet (the TRD plans them): Shiki, Sveltia CMS, Pagefind. List a tool here only once it is installed.

The PRD and TRD are the main sources of truth. `design/` covers visuals only and defers to them on any conflict.

## Commands
The package manager is pnpm (never npm or yarn). Node 26 doesn't ship Corepack, so install pnpm with `npm i -g pnpm`. Make sure `node -v` is 26 first: `engineStrict` in `pnpm-workspace.yaml` rejects an older Node.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Static build into `dist/`. `prebuild` runs `scripts/check-references.ts` first and exits 1 on a tag or series that does not exist, an id that is not lowercase kebab-case, a post with no frontmatter, or both `index.md` and `index.mdx` in one folder (Astro 7 only logs a dangling reference and exits 0) |
| `pnpm preview` | Serves `dist/`. Astro backgrounds it when it detects an AI agent; use `astro preview stop` to stop it, or `--ignore-lock` for a foreground server |
| `pnpm check` | `astro check` (types and schemas) |
| `pnpm lint` | `eslint .` and `prettier --check .`; `prelint` runs `astro sync` first so `astro:content` types exist on a clean clone |
| `pnpm format` | `prettier --write .` (skips `docs/`, `design/`, `.claude/`, `AGENTS.md`) |
| `pnpm test` / `pnpm test:coverage` | Vitest (`tests/unit/**` and `tests/config/**`) / with coverage and the 80% gate |
| `pnpm test:e2e` | Builds, serves `dist/` and runs Playwright + axe |
| `pnpm lighthouse` | Lighthouse CI budgets against `dist/` (run `pnpm build` first; needs Chrome, or `CHROME_PATH`) |

Terraform, from the repo root: `terraform fmt -check -recursive infra`, then `terraform -chdir=infra/<root> init -backend=false` and `validate`, `tflint --config="$PWD/infra/.tflint.hcl" --chdir=infra/<root>` and `trivy config --severity HIGH,CRITICAL --ignorefile infra/.trivyignore infra`. Never run `terraform apply` or `wrangler deploy` by hand: they go through `infra.yml` and `deploy.yml`, except the one-time local `bootstrap/` apply in `infra/README.md`.

Planned in the TRD:
- TODO: `pagefind --site dist`

Never run `pnpm approve-builds --all`: install scripts stay blocked unless a dependency is explicitly allowed. `esbuild` and `workerd` (from `wrangler`) are denied in `allowBuilds` in `pnpm-workspace.yaml`: an undecided script makes `pnpm install` exit non-zero on pnpm 12.

## Structure
```text
.claude/skills/        workflow skills (see .claude/skills/README.md)
.nvmrc                 Node 26 (LTS), same as CI
design/                mockups (telas/*.dc.html), tokens.css, assets/ — visual reference (defers to PRD/TRD)
docs/                  prd.md, trd.md (Portuguese), scope/, specs/, reviews/
src/assets/            images processed by astro:assets (author avatar)
src/components/        Band, Header, Footer, SEO (markup only)
src/content/           real posts, tags, series, pages (empty for now)
src/content.config.ts  collections and glob loaders only; rules live in src/lib/content/
src/layouts/           Base.astro (fonts, tokens, SEO, Header, hero band, Footer)
src/lib/               logic in .ts: site, links, seo, site-url, tone; content/ (schemas, visibility, references, ids, dir)
scripts/               build-time scripts run with Node's native TypeScript (check-references.ts)
src/pages/             routes (placeholder index.astro)
src/styles/            tokens.css (copy of design/tokens.css), global.css
tests/unit/            Vitest (see tests/AGENTS.md)
tests/config/          Vitest on repo config as text: wrangler, headers, budgets, workflows, Terraform
tests/e2e/             Playwright + axe
tests/fixtures/content/  test posts, kept apart from real posts
tests/fixtures/invalid/  one full content dir per broken rule; each must fail the build
astro.config.ts  tsconfig.json  eslint.config.mjs  vitest.config.ts  playwright.config.ts
pnpm-workspace.yaml    engineStrict
.github/               workflows/ (ci, deploy, preview, infra), actions/setup, dependabot.yml
infra/                 Terraform: bootstrap/, cloudflare/, github/, modules/, README.md (setup, environments)
public/                _headers (cache and security headers)
wrangler.jsonc  lighthouserc.json  lychee.toml  sonar-project.properties  .env.example
LICENSE  BRAND.md  README.md  CHANGELOG.md
```
Planned layout: the TRD's "Estrutura do repositório" section (`content/`, `components/`, `layouts/`, `public/admin/`, `robots.txt`). URLs have no trailing slash (`trailingSlash: 'never'`, `build.format: 'file'`).

## Conventions
- English for code, commits, branches and workflow docs. Portuguese only for the PRD, the TRD, `docs/adr/` and blog content, including posts and site UI copy (RN5).
- Logic goes in `.ts` files (`src/lib`), and `.astro` files contain markup only, because Sonar does not analyze `.astro`.
- Site code reads only `PUBLIC_` env vars. `PUBLIC_CONTENT_DIR` picks the content dir (default `src/content`); the e2e run sets it to `tests/fixtures/content`.
- Every content id is lowercase kebab-case, and `prebuild` fails otherwise: the post slug is the folder name under `posts/`, and tag, series and page ids are the file name without the extension; `sectionColor` values are the ASCII `data-tone` ids from `design/tokens.css`. `publishDate` and `updatedDate` are an ISO date or an ISO datetime with an offset and seconds (`2026-12-01T09:00:00-03:00`); anything looser fails the build. A `:` inside a frontmatter value needs quotes. Pages ship zero JS by default, and an island is added only where it is needed.
- `PUBLIC_SITE_URL` sets the site origin (canonical, `og:url`, feeds). `astro.config.ts` reads it from the shell or from `.env` / `.env.local`, falls back to `http://localhost:4321`, and fails the build on an invalid value. `.env.example` documents it.
- Every outbound link (GitHub, LinkedIn, e-mail, feeds) lives in `src/lib/links.ts`. It still holds `TODO` placeholders, and a build with a non-local `PUBLIC_SITE_URL` fails until they are filled in.
- Pages use `Base.astro` and pass the opening band through `<Fragment slot="hero">`; `Base` gives it the same `tone` as the `Header`. Pages do not render `<Band>` for the opening band themselves.
- RNF2 budget is per page: HTML + CSS + fonts under 150 KB with no JS files (`tests/e2e/layout-shell.spec.ts` measures the home).
- E2E tests run on `tests/fixtures/content`, never on real posts.
- Secrets live only in GitHub **environment** secrets (`production`, `preview`, `infra-plan`, `infra`), one Cloudflare token per job, never repository secrets and never in Terraform or its state. A job that runs project code (dependencies, build) holds none; it hands `dist/` to a job that does. Fork and Dependabot PRs get no secrets, so jobs that need them are skipped for those PRs. Workflows default to `contents: read`, pin actions by SHA and checkout with `persist-credentials: false`.
- `SHOW_DRAFTS` is the one build-time variable that is not `PUBLIC_`: only the preview build sets it, to show drafts and scheduled posts, and the production build never does. No code reads it yet (3.2).
- Config tests in `tests/config/` scope each workflow assertion to its job. Edit them with the config they cover.
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
