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
- Article page at `/blog/<slug>` for every published post (drafts and scheduled posts get no route): opening band in the post's `sectionColor`, tag pills, title, description, date and reading-time line, a 2:1 responsive cover (AVIF, WebP, JPEG) and an author band. Dates are shown in `America/Sao_Paulo`, and a date-only `publishDate` keeps its own day.
- Table of contents: a sticky column on desktop and a `<details>` bar on mobile, with a CSS-only reading-progress bar.
- Code blocks highlighted by Shiki at build with a token-based light theme, a frame with file name and language, line highlight (`{4}`, `{2-3,7}`), desktop line numbers that are never copied, and a copy button. The button is a 0.6 KB script loaded only on pages with a code block, and it stays hidden without JavaScript or a clipboard API.
- Mermaid diagrams rendered at build as inline SVG with a required `title` caption, so no Mermaid JS reaches the page.
- MDX components `Tldr`, `Callout` (`nota`, `dica`, `atencao`, `perigo`) and `Figure` (normal and wide), available in every post without imports. Markdown tables scroll on their own, GFM footnotes use Portuguese labels, and `h2` and `h3` get a self-link anchor.
- The build fails with a message naming the post on an `h1` in the body, a Mermaid fence without a title, an unknown `Callout` type, or a `Figure` without `alt`.
- Article SEO: `og:type=article`, `article:*` meta, and a JSON-LD `@graph` with `BlogPosting` and `BreadcrumbList`.
- CI installs and caches Playwright's Chromium in the jobs that build, to render diagrams, and `lychee` skips `/tags/<id>` until the tag pages exist.

### Changed

- `.github/dependabot.yml` also updates the local `setup` action and the three Terraform roots.
- The gitignore test moved to `tests/config/` and covers `.lighthouseci/`.
- `.env.example` explains that production uses the `workers.dev` address until the domain is decided.
- The Lighthouse script budget goes from 0 to 2 KB for the copy button; the home still ships no script.
- The Lighthouse LCP budget is 2.0 s on `/blog/*` (the home keeps 1.5 s), because web fonts count before a cover image paints in the simulated mobile run; RNF1 in the TRD now says LCP < 2.0 s.
- Fraunces no longer carries the `SOFT` axis (the titles use its default, `SOFT 0`): the font file goes from 62 KB to 37 KB and the estimated LCP of an article with a cover from 1.88 s to 1.65 s.
- New dependencies: `@astrojs/markdown-remark`, `@shikijs/transformers`, `unist-util-visit`, `rehype-mermaid` and `playwright` (pinned to the `@playwright/test` version), plus `@types/hast` and `@fontsource-variable/instrument-sans` for development.

### Security

- Secrets are environment secrets only (`production`, `preview`, `infra-plan`, `infra`), one token per job, never repository secrets and never in Terraform state. Build jobs that run project code hold none, and fork and Dependabot pull requests get none.
- Third-party actions are pinned by commit SHA, workflows default to `contents: read`, and checkouts do not persist credentials.
- `esbuild` and `workerd`, brought in by `wrangler`, are denied install scripts in `pnpm-workspace.yaml`. An undecided script makes `pnpm install` exit non-zero on pnpm 12.
- The Cloudflare zone has `prevent_destroy`, so switching the domain off cannot delete it and its DNS records.
