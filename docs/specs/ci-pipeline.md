# CI pipeline
Status: Proposed
Scope: 1.5

## Requirements
- RN13: every change to how the blog works passes automated tests before going live; publishing a post does not depend on them.
- TRD "Testes e quality gate": `ci.yml` runs on PR and on push to `develop`. A content-only change (`src/content/posts/**`) skips e2e and Sonar but keeps lint, `astro check`, build and the link check.
- TRD "Segurança e licenças": workflows default to `permissions: contents: read`; third-party actions are pinned by SHA.
- TRD "Git flow": PRs into `main` and `develop` require CI and the quality gate.
- AGENTS.md: pnpm only, Node from `.nvmrc` (26), `pnpm install --frozen-lockfile`; e2e runs on `tests/fixtures/content`, never on real posts; Sonar does not analyze `.astro`.
- Sonar exclusions (TRD): `docs/`, `design/`, `infra/`, `src/content/`, `tests/fixtures/`, `public/admin/`.

## Acceptance criteria
1. AC1: `.github/workflows/ci.yml` runs on `pull_request` (to `develop` and `main`) and on `push` to `develop`. Top-level `permissions: contents: read`; no job widens it except Sonar's `pull-requests: read` if the action needs it. Every third-party action is pinned by full commit SHA with the version in a comment. Concurrency cancels superseded runs of the same ref.
2. AC2: A `changes` job classifies the diff and outputs `code`. `code` is false only when every changed file is under `src/content/posts/**`. Anything else (including `package.json`, workflows, `src/`, `tests/`, `public/`) counts as code.
3. AC3: A `verify` job (always runs) does checkout, `pnpm/action-setup` (version from `packageManager`), `actions/setup-node` with `node-version-file: .nvmrc` and the pnpm store cache, then `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm check`, `pnpm test:coverage` and `pnpm build`.
4. AC4: The link check runs in `verify` after the build: lychee in `--offline` mode over `dist/`, failing on any broken internal link or anchor, with its action pinned by SHA. Configuration lives in `lychee.toml`.
5. AC5: An `e2e` job runs only when `code` is true. It reuses a Playwright browser cache (Chromium + WebKit), runs `pnpm test:e2e` and uploads `playwright-report/` as an artifact on failure.
6. AC6: A `sonar` job runs only when `code` is true, after `verify` has produced `coverage/lcov.info` (passed as an artifact). It runs the pinned SonarQube Cloud scan action with `fetch-depth: 0`, reads `SONAR_TOKEN` from Secrets (already configured), and fails the job if the quality gate fails (`sonar.qualitygate.wait=true`). `sonar-project.properties` sets `sonar.projectKey=felipemessi_felipebraga`, the organization, `sonar.sources=src`, `sonar.tests=tests`, the lcov path, and the TRD exclusions plus `**/*.astro`.
7. AC7: A final `ci-gate` job (`if: always()`, `needs` all others) is the single required status check. It passes when `verify` succeeded and `e2e` and `sonar` each succeeded or were skipped by AC2; it fails on any failure or cancellation. A content-only PR therefore merges without e2e or Sonar, and a code PR cannot merge with either red.
8. AC8: Dependabot config (`.github/dependabot.yml`) updates `github-actions` and `npm` weekly, so SHA-pinned actions do not rot.
9. AC9: A deliberate failure in each stage (lint error, type error, coverage below 80%, broken internal link, failing e2e) turns `ci-gate` red on a throwaway PR. A content-only PR shows `e2e` and `sonar` as skipped and `ci-gate` green.
10. AC10: `AGENTS.md` lists GitHub Actions, lychee and SonarQube Cloud as installed once they are, and the manual steps below are recorded in this spec's Design section.

## Decision
- **One workflow, a gate job.** GitHub's `paths-ignore` at workflow level leaves required checks "pending" forever on a skipped run, which would block content-only PRs. Skipping inside jobs plus one always-run `ci-gate` as the sole required check avoids it. Runner-up: separate workflows per path; more files and the same pending-check trap.
- **Path filter via `dorny/paths-filter`** (SHA-pinned). Small, widely used, and handles PR and push events the same. Runner-up: a `git diff --name-only` shell step, which needs no third-party action but must handle both event shapes by hand.
- **Link check with lychee offline over `dist/`.** Checks internal links and anchors from the built artifact, which is what ships. External links are excluded: they flake and would block unrelated PRs. Runner-up: a TypeScript script in `src/lib`, testable and covered by Sonar but code to maintain.
- **`verify` builds once; e2e builds again through Playwright's `webServer`** (`pnpm build && pnpm preview`). Simpler than sharing `dist/` between jobs; e2e needs the `PUBLIC_` env and fixtures content that the plain build does not. The cost is one extra build, small at this size.
- **Boundary with later features.**
  - Pagefind, `wrangler`, preview deploy, IndexNow and Lighthouse CI are not in 1.5: Pagefind is not installed (search is "Depois" in the PRD) and the rest belong to 1.6's `deploy.yml`. TRD `ci.yml` step 6 (preview deploy) moves to 1.6.
  - Rulesets and required-check enforcement live in Terraform (`github/`, 1.6 and 3.3). Until then the `ci-gate` check is selected as required by hand in repo settings.
  - Secret scanning, push protection and Dependabot alerts are repo settings, not code.

## Design
No UI; no mockup.

Files:
```text
.github/workflows/ci.yml
.github/dependabot.yml
lychee.toml
sonar-project.properties
```

Job graph: `changes` → (`verify`, `e2e`*, `sonar`*) → `ci-gate`. `*` = only when `code` is true. `sonar` also needs `verify` for the coverage artifact.

Sonar identifiers: project key `felipemessi_felipebraga` (from the project URL, `sonarcloud.io/project/overview?id=felipemessi_felipebraga`). The organization key is not in that URL; SonarQube Cloud keys follow `<organization>_<repo>`, so `sonar.organization=felipemessi` is assumed and must be confirmed on the first run. `SONAR_TOKEN` is already in GitHub Secrets.

Manual steps for the author (cannot be done from the repo):
1. Turn off Sonar's automatic analysis for the project (TRD: CI analysis, to send lcov).
2. After the first green run, mark `ci-gate` as the required check on `develop` and `main`.

Data/routes: none.

## Build plan
1. Add `sonar-project.properties` and `lychee.toml` — AC4, AC6
2. Write `ci.yml`: triggers, permissions, concurrency, `changes` job — AC1, AC2
3. Add the `verify` job: install, lint, check, coverage, build, lychee — AC3, AC4
4. Add `e2e` with Playwright browser cache and failure artifact — AC5
5. Add `sonar` with coverage artifact handoff and quality gate wait — AC6
6. Add `ci-gate` — AC7
7. Add `.github/dependabot.yml` — AC8
8. Validate on a throwaway PR: one failure per stage, plus a content-only PR — AC9
9. Update `AGENTS.md` (Stack, Structure) — AC10

## Alternatives
- Workflow-level `paths-ignore`: rejected, blocks required checks on skipped runs.
- Automatic SonarQube analysis: rejected by the TRD; it cannot receive Vitest coverage.
- Including preview deploy in 1.5: rejected, it needs `wrangler`, the Worker and the Cloudflare token from 1.6.
