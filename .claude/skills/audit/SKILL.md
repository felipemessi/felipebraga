---
name: audit
description: Write the context files — root AGENTS.md and nested AGENTS.md per area — describing the real stack, commands and conventions. Use after scaffolding, on an existing codebase, or for "audit", "create AGENTS.md". Not for keeping them current after changes (sync).
---

# audit

**Language:** write everything in English. Only `docs/prd.md`, `docs/trd.md`, `docs/adr/` and blog content are in Portuguese.

## Read
`docs/trd.md`, `docs/prd.md`, `design/AGENTS.md`, and the real code (`package.json`, configs, `.github/workflows/`, `infra/`). The code wins over the docs; report any mismatch.

The PRD and TRD are the main sources of truth; `design/` covers visuals only and defers to them.

## Write
**`AGENTS.md`** (short and factual):
- Project: one line + links to `docs/prd.md`, `docs/trd.md`, `docs/scope/`, `docs/specs/`, `design/`.
- Stack: only what is actually installed.
- Commands: only scripts that exist (mark planned ones as "TODO").
- Structure: where things live.
- Conventions:
  - English for code, commits, branches and workflow docs. Portuguese only for PRD/TRD/ADRs and blog content (RN5).
  - Logic in `.ts` (`src/lib`); `.astro` files contain markup only (Sonar does not analyze `.astro`).
  - Only `PUBLIC_` env vars in site code. Zero JS by default.
  - E2E tests use `tests/fixtures/content`, never real posts.
  - Git flow: `feature/*` from `develop`, `hotfix/*` from `main`; Conventional Commits (skills `branch`, `commit`).
- Workflow: list the skills and where each writes.

**Nested `AGENTS.md`** only for areas with their own rules (e.g. `infra/`, `src/content/`, `tests/`). Don't rewrite `design/AGENTS.md`; just link to it.

## Rules
Don't invent commands or conventions. Make small edits to existing files and show the diff. Don't change any code.
