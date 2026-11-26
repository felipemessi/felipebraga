# Review: feature/ci-pipeline (1.5)

Reviewer: Opus subagent, each finding checked against the code and the GitHub repo by the author session.
Scope: `.github/workflows/ci.yml`, `.github/dependabot.yml`, `lychee.toml`, `sonar-project.properties`, the `repo-config` test fix.

## Blocking
1. **Dependabot PRs can never pass `ci-gate`.** Runs triggered by Dependabot get Dependabot secrets, not Actions secrets. `gh api .../dependabot/secrets` returns 0, so `sonar` scans with an empty `SONAR_TOKEN` and fails. Fix: add `SONAR_TOKEN` as a Dependabot secret (owner action, the value is not available to the repo). The same holds for fork PRs, which the owner handles by hand; the gate is not weakened for them.
2. **Dependabot would target `main`.** The default branch is `main`, so its PRs would skip `develop`. Fix: `target-branch: develop` on both ecosystems.

## Should fix
3. **Path filter base on push.** Without `base`, a push to `develop` is compared with `main`, so content-only merges always count as code. Fix: `base: ${{ github.ref_name }}` (ignored on `pull_request`).
4. **Sonar coverage scope wider than Vitest's.** Vitest covers only `src/lib/**/*.ts`; Sonar measures all of `src`, so the first non-lib `.ts` file reads 0% new-code coverage. Fix: `sonar.coverage.exclusions` for the non-lib areas.
5. **`tests/fixtures/**` was in `sonar.exclusions`,** which does not apply to `sonar.tests`. Fix: `sonar.test.exclusions`.
6. **Dependabot would propose TypeScript 7.** AGENTS.md pins `~6.0.3`. Fix: ignore major and minor `typescript` updates.

## Suggestions
- Fail closed when `changes.outputs.code` is empty: **applied** (the gate requires `true` or `false`).
- `persist-credentials: false` on the checkouts: **applied**.
- Coverage artifact retention of 1 day blocks a late "re-run failed jobs": **applied** (7 days).
- Stale "assumed organization" comment in `sonar-project.properties`: **applied** (removed).
- Playwright `retries` and `trace` in CI: **not applied.** A retry can hide a flaky test; revisit when the e2e suite grows.

## What went well
- All 9 action SHAs resolve to the tags in their comments.
- No `${{ }}` inside `run:` scripts; results reach `ci-gate` through `env`.
- Minimal permissions: `contents: read`, widened only for `changes`; the token is set only on the scan step.
- `ci-gate` uses `always()` so a cancelled run turns the gate red instead of skipped.
- Concurrency groups by `github.ref` do not collide between PR and push runs.
- The Playwright cache is keyed on the exact version and system dependencies are reinstalled on a hit.
- lcov paths are relative, so Sonar matches them on its runner.
- The `repo-config` test fix is correct.
