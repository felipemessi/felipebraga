# Infra + deploy
Status: Accepted
Scope: 1.6

## Requirements
- TRD "Build, deploy e agendamento": `deploy.yml` on push to `main`; the Actions run does all the building and Cloudflare only receives `dist/` (RNF8: swapping host means swapping the last job). Environments: Local, Preview (push to `develop`, `feature/*` or PR, as a Worker version URL via `wrangler versions upload`), Production (merge to `main`, or a CMS content commit). Preview builds use `SHOW_DRAFTS=true`; production never does.
- TRD "Cache": `/_astro/*` (which includes the fonts) is `public, max-age=31536000, immutable`; HTML, `rss.xml` and `sitemap*.xml` are `public, max-age=0, must-revalidate`; `/pagefind/*` is `public, max-age=3600`.
- TRD "Segurança": headers HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`; workflows with `permissions: contents: read` by default; third-party actions pinned by SHA; fine-grained tokens with minimum scope only in GitHub Secrets; no secret in a versioned `.tfvars`; previews and `/admin` are `noindex`.
- TRD "Infraestrutura como código": Terraform in `infra/` (`bootstrap/`, `cloudflare/`, `github/`, `modules/`); backend `s3` on an R2 bucket, one state per folder; Terraform and providers pinned, `.terraform.lock.hcl` versioned; `infra.yml` runs `fmt -check`, `validate`, `tflint`, `trivy config` and `plan` (commented on the PR), `apply` on merge to `main` in the `production` environment with manual approval, plus a weekly drift `plan` that opens an issue.
- TRD "Fluxo Git": rulesets for `main` and `develop` block force-push and deletion and require PRs with the CI quality gate.
- RNF1 (LCP < 1.5 s, CLS < 0.05, Lighthouse ≥ 95), RNF2 (HTML+CSS+fonts < 150 KB, 0 KB required JS), RNF3 (Lighthouse SEO = 100), RNF4 (a11y ≥ 95), RNF7 (build < 3 min with cache), RNF8, RNF9 (CDN, no app server on the critical path).
- RN13: any change to how the blog works passes automated tests before going live. Publishing a post does not depend on them.
- AGENTS.md: pnpm only, never `pnpm approve-builds --all`; site code reads only `PUBLIC_` env vars.
- Scope note: the production domain is undecided (PRD open question), see Decision.

## Acceptance criteria
1. AC1 — `wrangler.jsonc` deploys `dist/` as Workers Static Assets with no Worker script: `assets.directory` is `./dist`, `not_found_handling` is `404-page`, `html_handling` is `drop-trailing-slash`, a pinned `compatibility_date`, `workers_dev` off (production is served at the custom domain) and `preview_urls` on. `pnpm exec wrangler deploy --dry-run` succeeds on a fresh `pnpm build`.
2. AC2 — Served locally with `wrangler dev` from `dist/`, `/` returns 200; a page emitted as `x.html` is served at `/x`; the same path with a trailing slash redirects to the slash-free URL (no duplicate page); an unknown path returns the `404.html` content with status 404.
3. AC3 — `public/_headers` sets the cache rules from the TRD and the security headers on every path. Checked with `curl -I` against `wrangler dev`: `/_astro/*` (assets and fonts) returns exactly one `Cache-Control: public, max-age=31536000, immutable`; HTML returns `public, max-age=0, must-revalidate` (the platform default, not a second merged value); `/pagefind/*` returns `public, max-age=3600`; HSTS, `nosniff`, `Referrer-Policy` and `Permissions-Policy` are present on HTML and assets.
4. AC4 — `deploy.yml` runs on push to `main` and on `workflow_dispatch`: install with `--frozen-lockfile` (pnpm store and `node_modules/.astro` cached), lint, `astro check`, build, tests, the lychee link check from 1.5 over `dist/` (same config as `ci.yml`), Lighthouse CI, then `wrangler deploy` in the `production` environment. Any earlier failure stops the deploy. It has `permissions: contents: read`, a `concurrency` group that does not cancel an in-flight production deploy, and every third-party action pinned by SHA.
5. AC5 — A preview workflow runs on push to `develop` and `feature/*` and on PRs, in two jobs. The `build` job holds no secret: it builds with `SHOW_DRAFTS=true` and adds `X-Robots-Tag: noindex` to the built `_headers`. The `upload` job runs `wrangler versions upload` in the `preview` environment and puts the version URL in the job summary (and as a PR comment on PRs); it fails if wrangler reports no URL and is skipped for fork and Dependabot PRs, which get no secrets. A branch with an open PR shares one concurrency group, so its two events cannot race. The production build never sets `SHOW_DRAFTS`.
6. AC6 — `lighthouserc` runs against the built `dist/` with mobile emulation and fails the job on: performance ≥ 0.95, accessibility ≥ 0.95, SEO = 1.0, LCP < 1500 ms, CLS < 0.05, total blocking time < 200 ms (lab proxy for INP < 200 ms), 0 KB of script, and document + stylesheet + font < 150 KB. Lighthouse cannot sum resource types, so the cap is split per type (document 12 KB, stylesheet 14 KB, font 124 KB; the layout shell ships about 6 KB, 6 KB and 121 KB). The SEO assertion was `warn` until 1.3 added `<SEO>`; it is `error` now that the layout shell scores 1.0. A deliberate violation (for example an external `<script src>`; an inline script counts as document, not script) makes the step exit non-zero.
7. AC7 — `infra/` has `bootstrap/`, `cloudflare/`, `github/` and `modules/`. Terraform has an exact `required_version` (1.10 or newer, for native S3 lockfile) and pinned providers, and each root has a committed `.terraform.lock.hcl`. `terraform fmt -check -recursive` and `terraform validate` pass in each root, `tflint` and `trivy config` report nothing at HIGH or above.
8. AC8 — `infra/bootstrap/` (local state, applied once by the owner) creates the R2 bucket for state and three scoped API tokens: `deploy` and `preview` (Workers Scripts Write only) and `infra` (R2 storage, plus the zone permissions behind `enable_domain_permissions`). `cloudflare/` and `github/` use `backend "s3"` against that bucket with `use_lockfile = true`, one key per folder. `infra/README.md` documents the one-time steps, including the manual token and `workers.dev` subdomain steps, and the check that R2 honours the lockfile.
9. AC9 — `infra/cloudflare/` has the provider, the account-level resources the deploy needs, and an optional custom-domain block (zone, DNS, Worker route) that creates nothing while `var.domain` is `null`. Setting `var.domain` in a plan adds exactly the domain resources and nothing else is replaced.
10. AC10 — `infra/github/` manages the repo settings, Discussions, Dependabot, secret scanning and push protection, the environments (`preview`; `production` and `infra`, neither with a reviewer, both limited to `main`), the non-sensitive Actions variable the build reads (secrets are set with `gh secret set` so they never reach the state), and rulesets for `main` and `develop` (no force-push, no deletion, PR required, required status checks passed in as a variable list). The existing repository is brought under management with `import`, not recreated.
11. AC11 — `infra.yml`: on PRs touching `infra/` it runs `fmt -check`, `validate`, `tflint` and `trivy config` with no secrets, then `plan` in the `infra-plan` environment (skipped for fork and Dependabot PRs) and posts the plan as a PR comment; on merge to `main` it saves each plan as a one-day artifact and one `apply` job applies those exact plans in the `infra` environment with no manual step (the merge is the approval); a weekly schedule runs `plan` and opens or updates an issue when there is drift, and closes it when the plan is clean. `permissions` are least-privilege and actions are pinned by SHA.
12. AC12 — No secret is committed. `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` live only as environment secrets (`production`, `preview`, `infra-plan`, `infra`), each with its own token, never as repository secrets, so a workflow on an arbitrary branch cannot read them; build jobs that run project code hold none, and no secret is set at workflow level; `.gitignore` already covers `.dev.vars`, `.wrangler/`, `.terraform/` and `*.tfstate*`; any `.tfvars` in the repo holds no sensitive value. `git status` is clean after `pnpm build` and a local Terraform `init -backend=false`.
13. AC13 — `wrangler` and `@lhci/cli` are dev dependencies at exact pinned versions. Install scripts stay blocked: if `workerd` or another package needs one, only that package goes on the explicit allow-list with a one-line reason in the PR. `pnpm approve-builds --all` is never used.
14. AC14 — On a warm cache the deploy workflow's build job (install through build) finishes in under 3 minutes (RNF7), read from the Actions run duration after the first two runs.
15. AC15 — The production URL is `https://febraga.dev`, recorded in `README.md` and set as `PUBLIC_SITE_URL` by `infra/github`. The site reads no URL from code that assumes a domain: any canonical origin comes from a `PUBLIC_SITE_URL` variable that 2.8 will use.

## Decision
- **Domain: `febraga.dev`, attached after the first deploy.** Updated after the owner chose the domain (it was undecided when this spec was written). The Terraform custom-domain block stays off (`var.domain = null`) until the first deploy has created the Worker, then one variable plus one apply attaches `febraga.dev`. `workers_dev` is off in production; `preview_urls` stays on, so the account's `workers.dev` subdomain is still needed for previews. 2.8 only needs `PUBLIC_SITE_URL`.
- **Deploy first, Terraform second, in one spec.** Build plan order puts `wrangler.jsonc`, headers, `deploy.yml`, preview and Lighthouse first, so a post can reach production before any Terraform is applied. Terraform follows and takes over the GitHub and Cloudflare configuration. Runner-up: two specs (1.6a/1.6b), rejected to avoid splitting the scope row for a gain that ordering already gives.
- **Terraform state: R2 `s3` backend with `use_lockfile`.** Matches the TRD and needs no extra service. The bootstrap proves locking against R2 before anything else uses the bucket. Runner-up: HCP Terraform free tier, which guarantees locking but adds a service the TRD does not have. If R2 locking fails the check in AC8, switch to HCP and record it in an ADR.
- **Headers in `public/_headers`, not in a Worker.** There is no Worker script in the reader path (RNF9). Cloudflare merges every matching rule, so `/*` must not set `Cache-Control`; HTML relies on the platform default `public, max-age=0, must-revalidate`, which already equals the TRD value. Only `/_astro/*` and `/pagefind/*` set `Cache-Control`. AC3 asserts the effective header, so a merged duplicate fails.
- **Cloudflare module scope: only what 1.6 needs.** D1, Turnstile, Email Routing, Resend DNS and Web Analytics belong to 4.1 and 4.2 and are added to `cloudflare/` there. The Cloudflare token starts with minimum scopes and grows with those features.
- **Secrets by environment, one token per job, no secret next to project code.** Found in review: repository-level secrets are readable by a workflow on any branch, so the main-only rule on `production` protected nothing. Secrets are now environment secrets, the build jobs that run dependencies and project code (`deploy.yml`, `preview.yml`) hold none and hand `dist/` to a job that does, and `bootstrap/` mints a separate token for deploy, preview and infra so each can be revoked alone. A preview token can still deploy, since Cloudflare cannot scope Workers Scripts Write per Worker; the residual risk is a same-repository branch from the owner, as forks and Dependabot get no secrets. Runner-up: repository secrets with a main-only guard in each workflow, rejected because the guard lives in the file an attacker's branch controls.
- **Apply the saved plan; the merge is the approval.** `plan` saves `tfplan` (no secret in it, one-day artifact) and `apply` runs that file for both roots with no manual step. The plan already ran on the pull request, so merging is the owner's approval. Runner-up: re-plan inside `apply`, rejected because drift between the plan and the apply would be applied unseen. Changed after the first real run, which waited on a reviewer that the owner did not want.
- **A separate `infra` environment, without a reviewer.** The TRD gates `apply` on a manual approval in the `production` environment, but `production` is also what `deploy.yml` uses, so a required reviewer there would hold every CMS content commit, against the "post live in 1 to 2 minutes" journey. `infra` is its own environment so its secrets and its main-only rule stay apart from `production`. Neither has a reviewer, because the merge to `main` is the approval. This differs from the TRD wording and should be reflected there.
- **Rulesets here, back-merge in 3.3.** The TRD puts rulesets in `github/`, so they ship now (no force-push, no deletion, PR required). The required status check names come from 1.5, passed as a variable so this does not hard-code job names. The back-merge workflow and SemVer tags stay in 3.3.
- **Lighthouse CI against `dist/`.** It runs before the deploy on the built artifact with `staticDistDir`, not against a live URL, so a failure blocks the release. INP cannot be measured in lab, so total blocking time stands in for it. Runner-up: run it against the preview URL, rejected because it would run after the code is already uploaded.
- **Preview via Worker versions.** `wrangler versions upload` gives a URL per push without touching production. Because the version URL is on a different host from production, noindex is added to the preview build's `_headers`; production never gets it.
- **Boundary with other features.** Not in 1.6:
  - The CI pipeline `ci.yml`, `lychee.toml` and SonarQube (1.5). `deploy.yml` reuses the same lychee step and config. The required status check is `ci-gate`, set in `infra/github/terraform.tfvars`.
  - Pagefind (search is "Depois") and IndexNow (2.8): the matching `deploy.yml` steps are left out and added with those features.
  - The Astro CSP config: it needs the layout and the Web Analytics exception, so it lands with 1.3.
  - `_redirects` (2.8), scheduled publishing and the cron fallback (3.2), back-merge and tags (3.3), D1, Turnstile, Email and Web Analytics resources (4.x).
- **Manual, one-time steps by the owner** (an agent must not do these): create the Cloudflare account API token for bootstrap, enable the `workers.dev` subdomain, run `terraform apply` in `bootstrap/`, run `infra/bootstrap/set-secrets.sh` to set the environment secrets (locally, so no value reaches a Terraform state or a log). Everything after goes through the pipeline, and a merge to `main` applies it.

## Design
Mockups: none (no UI).

Files:

```text
wrangler.jsonc
public/_headers
lighthouserc.json
.github/workflows/deploy.yml
.github/workflows/preview.yml
.github/workflows/infra.yml
infra/
├── README.md
├── bootstrap/     # R2 state bucket + CI token, local state, applied once
├── cloudflare/    # provider, account resources, optional custom domain
├── github/        # repo, Discussions, Dependabot, environments, secrets, rulesets
└── modules/
```

- **Secrets and variables:** `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` per environment; the R2 access key pair for the Terraform backend; `PUBLIC_SITE_URL` as an Actions variable. Site code reads only `PUBLIC_` values.
- **deploy.yml jobs:** `build` (checks, build, link check, Lighthouse CI, upload `dist/` as an artifact), then `deploy` (download the artifact, `wrangler deploy`, environment `production`). The artifact keeps the final job the only Cloudflare-specific one (RNF8).
- **Preview:** same `build` job with `SHOW_DRAFTS=true` and the noindex header step, then `wrangler versions upload` in the `preview` environment.
- **Lighthouse budgets:** in `lighthouserc.json` (assertions) plus a resource budget for script, and document + stylesheet + font size.
- **Tests:** logic stays out of YAML. The noindex step and any header assertions are tiny; the e2e suite gets a check that reads `dist/_headers` for the cache and security rules, so a rule cannot be lost silently.

## Build plan
1. [x] Add `wrangler` as a pinned dev dependency, resolve the install-script question for `workerd`, and write `wrangler.jsonc` — AC1, AC13
2. [x] Write `public/_headers` with the cache and security rules, and check it with `wrangler dev` and `curl -I` — AC2, AC3
3. [x] Add `@lhci/cli` and `lighthouserc.json` with the budgets; prove a deliberate violation fails — AC6, AC13
4. [x] Write `deploy.yml` (build job, then deploy job) with pinned actions, caching and concurrency — AC4, AC12, AC14
5. [x] Write `preview.yml` with `SHOW_DRAFTS`, the noindex step and the version URL summary/comment — AC5
6. [x] Record the production URL (`https://febraga.dev`) in `README.md` and set `PUBLIC_SITE_URL` — AC15
7. [x] Write `infra/bootstrap/` and `infra/README.md` (the owner runs the apply; check the R2 lockfile) — AC7, AC8, AC12
8. [x] Write `infra/cloudflare/` with the provider, the account resources and the off-by-default custom-domain block — AC7, AC9
9. [x] Write `infra/github/` with settings, environments, secrets, variables and rulesets, and import the existing repo — AC7, AC10
10. [x] Write `infra.yml` (PR checks and plan comment, gated apply, weekly drift issue) — AC11, AC12
11. [x] Run the full checks (`fmt`, `validate`, `tflint`, `trivy config`, lint, build, dry-run deploy) and confirm `git status` is clean — AC7, AC12

## Alternatives
- **Custom domain first:** rejected, the domain is undecided and would block the first live post.
- **Netlify, GitHub Pages or the host's built-in build:** the TRD already chose Cloudflare Workers Static Assets and CI-built `dist/`.
- **Cache and security headers from a Worker script:** works, but puts code on the reader path against RNF9 for no gain over `_headers`.
- **HCP Terraform for state:** a fallback only if R2 locking fails.
- **Lighthouse CI on the live preview URL:** runs after the upload, so it cannot block the release.
- **Two specs (deploy, then Terraform):** equivalent in order, rejected for the extra scope bookkeeping.
