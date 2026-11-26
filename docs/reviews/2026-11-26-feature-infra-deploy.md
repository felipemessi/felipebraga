# Review: feature/infra-deploy

Date: 2026-11-26 · Scope: 1.6 · Spec: [infra-deploy](../specs/infra-deploy.md) · Diff: `develop...HEAD` (8 commits)

Reviewed by a subagent on a different model (Opus). Every finding below was checked against the code and holds; none was dropped. Verdict: **do not merge before fixing item 1**. Nothing here has run against real GitHub or Cloudflare yet, so these are design findings, not observed failures.

## Blocking

1. **Production secrets are reachable from every branch and PR.** `infra/README.md:29-34` sets every secret at repository level (`gh secret set` without `--env`), so the main-only branch policy on the `production` environment (`infra/github/main.tf`) protects nothing. `preview.yml` receives the same `CLOUDFLARE_API_TOKEN` (Workers Scripts Write) while it runs `pnpm install` and `pnpm build` on any `feature/**` push or same-repo PR. A feature branch, or a dependency whose code runs at build time, can run `wrangler deploy` and overwrite production. `TF_GITHUB_TOKEN` (admin PAT) and the R2 state keys are exposed the same way to the PR `plan` job in `infra.yml`, so a PR that adds a `data "external"` block runs code with them and bypasses the `infra` approval. This also contradicts AC12 ("scoped by environment").
   - Fix: set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as environment secrets (`--env production`, and a separate narrower token for `--env preview`). Put `TF_GITHUB_TOKEN` and the R2 keys on `infra`, and use a read-only token in a plan-only environment for PRs. Update the README steps and AC12.

## Should fix

2. **`infra.yml` sets secrets at workflow level.** `static` and `trivy` receive the Cloudflare token, the R2 key pair and the account ID, including inside third-party actions and `tflint --init` plugin downloads, although they need none. Move the `env` block into `plan`, `apply` and `drift`.
3. **The CI token cannot create the custom domain.** `infra/bootstrap/main.tf` grants only Workers Scripts Write and Workers R2 Storage Write, but `infra/cloudflare/main.tf` creates `cloudflare_zone` and `cloudflare_workers_custom_domain`. Setting `var.domain` would fail with 403, against AC9 ("one variable plus one apply"). Widen the token behind the same switch or document the extra permissions (Zone Edit, DNS Edit, Workers Routes Edit). Also add `prevent_destroy` to `cloudflare_zone`: setting `domain` back to `null` would delete the zone and its DNS records.
4. **Dependabot and fork PRs always fail.** They get no Actions or environment secrets and a read-only `GITHUB_TOKEN`, so every weekly npm or actions PR turns `preview.yml` red (`wrangler versions upload`, then the comment step) and every Terraform PR turns `infra.yml` red (no R2 credentials). Guard the jobs with `github.event.pull_request.head.repo.full_name == github.repository && github.actor != 'dependabot[bot]'`, or skip cleanly.
5. **The applied plan is not the plan the owner approved.** `infra.yml` re-plans inside `apply` with `-auto-approve`, after the owner read the `plan` job summary. Drift between the two is applied unseen. Save the plan (`plan -out`) and apply that file. This was a deliberate choice to avoid publishing a plan artifact from a public repository, so the fix must weigh that: an artifact is downloadable by anyone, so prefer a short retention and confirm no sensitive value is in the plan. The matrix also asks for approval once per root (twice); consider one approval for both.
6. **Branches with an open PR upload two previews.** `push` on `feature/**` and `pull_request` both fire, with different concurrency groups (`refs/heads/...` and `refs/pull/N/merge`), so two uploads race for one alias. Limit `push` to `develop`, or skip it when a PR exists.
7. **`tests/unit/infra-config.test.ts` breaks the test convention.** `tests/AGENTS.md` says `unit/` covers only `src/lib` and Zod schemas, while this file asserts on YAML and HCL text. Some assertions are plain greps (`/tflint/`, `/environment: infra/`) that pass even if the step moves to the wrong job. `repo-config.test.ts` already set that precedent, so either update `tests/AGENTS.md` (via `sync`) or move config tests to their own folder, and tighten the greps to the job they belong to.

## Suggestions

- `parseHeaders` uses `Map.set`, so a second `Cache-Control` in one rule overwrites the first, and the "no merged duplicates" test only looks for `, ... must-revalidate`. Collect values into arrays and assert exactly one.
- `matrices.slice(1)` assumes the `static` matrix comes first. Match the matrix inside the `plan`, `apply` and `drift` blocks instead.
- `tests/e2e/headers.spec.ts` reads files with `fs`, runs once per Playwright project, and does not check served headers. The AC3 `curl -I` check against `wrangler dev` still has no automated test.
- Plan comments are posted through the API and GitHub does not mask secrets there. Mark `variable "account_id"` as `sensitive = true`.
- The `drift` job never closes its issue after a clean plan.
- `preview.yml` would post "Preview: null" if wrangler prints neither URL field. Fail the step when the URL is empty.
- `SHOW_DRAFTS` is not a `PUBLIC_` variable. The TRD names it, so record it as the one build-time exception in the `AGENTS.md` rule ("only `PUBLIC_` vars") once site code reads it.

## What went well

- The `_headers` design fits Cloudflare's merge behaviour: `/*` sets no `Cache-Control`, HTML keeps the platform default, and a comment explains why. AC2 and AC3 were exercised on a real `wrangler dev`.
- Workflow injection hygiene: the branch name goes through `env` and is quoted, never interpolated into `run:`; the alias is sanitized to a DNS-safe label; `pipefail` is used where `tee` would hide a failed plan.
- Gating: `apply` has an explicit `if` and `needs: plan`, `drift` reads `-detailed-exitcode` correctly, every action is pinned by commit SHA, and defaults are `contents: read`.
- Terraform: the R2 backend flags are complete (`use_lockfile`, `skip_s3_checksum`, path style), the R2 key pair is derived correctly, secret outputs are `sensitive`, and the imported repository has `prevent_destroy` plus a documented import-first flow. Secrets stay out of state by design.
- Lighthouse CI assertion names were verified against `@lhci/utils`, and a deliberate violation was shown to fail the step.

## Resolution

All findings were addressed on the same branch (2026-11-26).

| #           | Status | How                                                                                                                                                                                                                                                                                                                                       |
| ----------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1           | Fixed  | Secrets are environment secrets (`production`, `preview`, `infra-plan`, `infra`). `bootstrap/` mints one token per job. `deploy.yml` and `preview.yml` build without secrets and hand `dist/` to the job that holds them. Residual risk, documented in the spec: a preview token can still deploy, because Cloudflare cannot scope Workers Scripts Write per Worker. |
| 2           | Fixed  | `infra.yml` has no workflow-level secrets; `static` and `trivy` hold none.                                                                                                                                                                                                                                                               |
| 3           | Fixed  | The infra token gets the zone permissions behind `enable_domain_permissions`; `cloudflare_zone` has `prevent_destroy`. The permission group names are unverified against the live API and must be checked before turning the switch on.                                                                                                   |
| 4           | Fixed  | The preview upload and the infra plan skip fork and Dependabot PRs.                                                                                                                                                                                                                                                                       |
| 5           | Fixed  | `plan` saves `tfplan` (one-day artifact) and one `apply` job applies those plans after a single approval.                                                                                                                                                                                                                                 |
| 6           | Fixed  | One concurrency group per branch.                                                                                                                                                                                                                                                                                                         |
| 7           | Fixed  | Config tests moved to `tests/config/`, documented in `tests/AGENTS.md`, with assertions scoped to the job they belong to.                                                                                                                                                                                                                 |
| Suggestions | Fixed  | Header values collected as arrays; matrices checked per job; `account_id` is `sensitive`; the drift issue closes when clean; the preview step fails on an empty URL; the e2e header check runs once.                                                                                                                                      |

Still open: the `SHOW_DRAFTS` note (the TRD names it, so the `AGENTS.md` rule "only `PUBLIC_` variables" needs an exception when `sync` runs) and an automated test of the served headers (AC3 `curl` against `wrangler dev`).

Not verified: nothing here has run on GitHub or Cloudflare. Mutation checks confirmed that the config tests fail when a repository-level secret or a workflow-level secret is reintroduced.
