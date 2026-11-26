# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Posts (`content:` commits) are not listed.

## [Unreleased]

### Added

- Deploy to Cloudflare Workers Static Assets: `wrangler.jsonc` serves `dist/` with slash-free URLs and a 404 page, and `public/_headers` sets the cache rules and the security headers (HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`).
- `deploy.yml`: lint, type check, tests, build, link check and Lighthouse CI, then `wrangler deploy` to the `production` environment on every push to `main` and on demand.
- `preview.yml`: a noindex Worker version, with drafts, for every push to `develop` and `feature/**` and for every pull request, with the URL in the job summary and as a PR comment.
- Lighthouse CI budgets (`pnpm lighthouse`) on the built `dist/`: performance and accessibility ≥ 95, SEO 100, LCP < 1.5 s, CLS < 0.05, total blocking time < 200 ms, no script, and at most 150 KB of document, CSS and fonts.
- Terraform in `infra/`: `bootstrap/` (R2 state bucket and one scoped API token each for deploy, preview and infra), `cloudflare/` (optional custom domain, off while `domain` is `null`) and `github/` (repository settings, Discussions, Dependabot security updates, environments and rulesets that require the `ci-gate` check).
- `infra.yml`: static checks (`fmt`, `validate`, `tflint`, `trivy config`), a plan commented on each pull request, one approved apply of the saved plan, and a weekly drift issue that closes itself when the plan is clean.
- Config tests in `tests/config/` for the wrangler config, headers, budgets, workflows and Terraform roots, and an e2e check that `dist/_headers` matches `public/_headers`.
- `infra/README.md` with the environments table and the one-time setup, a Deploy section in `README.md`, and `wrangler` and `@lhci/cli` pinned to exact versions.

### Changed

- `.github/dependabot.yml` also updates the local `setup` action and the three Terraform roots.
- The gitignore test moved to `tests/config/` and covers `.lighthouseci/`.
- `.env.example` explains that production uses the `workers.dev` address until the domain is decided.

### Security

- Secrets are environment secrets only (`production`, `preview`, `infra-plan`, `infra`), one token per job, never repository secrets and never in Terraform state. Build jobs that run project code hold none, and fork and Dependabot pull requests get none.
- Third-party actions are pinned by commit SHA, workflows default to `contents: read`, and checkouts do not persist credentials.
- `esbuild` and `workerd`, brought in by `wrangler`, are denied install scripts in `pnpm-workspace.yaml`. An undecided script makes `pnpm install` exit non-zero on pnpm 12.
- The Cloudflare zone has `prevent_destroy`, so switching the domain off cannot delete it and its DNS records.
