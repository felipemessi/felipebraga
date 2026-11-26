# AGENTS.md

## Project
A personal blog in Portuguese about DevOps in a world with AI. It is built as a static site.
- Product: [docs/prd.md](docs/prd.md)
- Technical: [docs/trd.md](docs/trd.md)
- Plan: [docs/scope/](docs/scope/README.md)
- Specs: `docs/specs/` (not created yet)
- Visuals: [design/](design/AGENTS.md)

## Stack
**Nothing is installed yet:** there is no `package.json`, no `src/`, no workflows and no `infra/`. The TRD plans Astro 7 (SSG, Node 26 LTS), pnpm, strict TypeScript 6.0.x, MDX, Shiki, Vitest, Playwright + axe, Sveltia CMS, Cloudflare Workers Static Assets, Terraform and GitHub Actions. List a tool here only once it is installed.

The PRD and TRD are the main sources of truth. `design/` covers visuals only and defers to them on any conflict.

## Commands
None exist yet. The package manager is pnpm (never npm or yarn). Node 26 doesn't ship Corepack, so install pnpm with `npm i -g pnpm`. Planned in the TRD:
- TODO: `astro dev` (local, `localhost:4321`)
- TODO: `astro check`, lint
- TODO: `astro build`, `pagefind --site dist`
- TODO: Vitest (unit), Playwright (e2e, visual, axe)
- TODO: `wrangler deploy`; `terraform fmt/validate/plan` in `infra/`

## Structure
What exists today:
```text
.claude/skills/   workflow skills (see .claude/skills/README.md)
.nvmrc            Node 26 (LTS), same as CI
design/           mockups (telas/*.dc.html), tokens.css, assets/ — visual reference (defers to PRD/TRD)
docs/             prd.md, trd.md (Portuguese), scope/
```
Planned layout: the TRD's "Estrutura do repositório" section (`src/`, `tests/`, `infra/`, `public/`, `.github/workflows/`).

## Conventions
- English for code, commits, branches and workflow docs. Portuguese only for the PRD, the TRD, `docs/adr/` and blog content, including posts and site UI copy (RN5).
- Logic goes in `.ts` files (`src/lib`), and `.astro` files contain markup only, because Sonar does not analyze `.astro`.
- Site code reads only `PUBLIC_` env vars. Pages ship zero JS by default, and an island is added only where it is needed.
- E2E tests run on `tests/fixtures/content`, never on real posts.
- Git flow: `feature/*` branches off `develop` and `hotfix/*` off `main`. `main` is production. Commits follow Conventional Commits (skills `branch` and `commit`).
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

Typical flow: `scope → audit → architect → branch → develop → check verify → test → check review → document → sync → commit`. Only the user marks a feature `Done`.
