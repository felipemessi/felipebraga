# Scope
Delivery style: thin thread first · Default depth: Beta (develop → check verify → test)

Source: [PRD](../prd.md) "Lançamento" features, [TRD](../trd.md), [design work order](../../design/AGENTS.md).
Milestone 1 gets one real post from the repo to production. Later milestones add to a pipeline that already works.

## Milestone 1 — Thin thread: one post live
| # | Feature | Status | Spec | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | Project scaffold (Astro 7, Node 26 LTS, pnpm with `packageManager` pinned, strict TS, lint, Vitest, Playwright + axe, `.gitignore`, `LICENSE`, `BRAND.md`) | Built | [spec](../specs/project-scaffold.md) | Pin TypeScript 6.0.x: `astro check` refuses TS 7 and `typescript-eslint` needs <6.1. Set `engines.node` >=26 to match `.nvmrc`. Run `audit` right after |
| 1.2 | Content schema (`posts`, `tags`, `series`, `pages` collections, Zod rules, `isPublished`, test fixtures) | Built | [spec](../specs/content-schema.md) | RN1, RN2, RNF5. Fields as in the TRD |
| 1.3 | Layout shell (tokens, fonts, Band/Header/Footer, base layout, `<SEO>` head) | Built | [spec](../specs/layout-shell.md) | Design step 1. Header tone matches the opening band |
| 1.4 | Article page (MDX components: CodeBlock/Shiki, Callout, Figure, Tldr, Table, Footnotes, anchored headings, Toc, reading time) | Planned | — | Design step 2, the most important screen. Mermaid rendered at build time |
| 1.5 | CI pipeline (`ci.yml`: lint, `astro check`, Vitest coverage, build, link check, Playwright, SonarQube gate) | Built | [spec](../specs/ci-pipeline.md) | RN13. Content-only changes skip e2e and Sonar |
| 1.6 | Infra + deploy (Terraform bootstrap/cloudflare/github, `wrangler.jsonc`, cache/security headers, `deploy.yml`, preview env, Lighthouse CI budgets) | Planned | — | RNF1–RNF4, RNF7–RNF9. Production domain is undecided |

## Milestone 2 — Read and discover
| # | Feature | Status | Spec | Notes |
| --- | --- | --- | --- | --- |
| 2.1 | Home with recent posts | Planned | — | Design step 3 |
| 2.2 | Post listing at `/blog` (tag filter, pagination) | Planned | — | The mockup has a search box, but search is "Depois" |
| 2.3 | Topic pages: tags and series | Planned | — | Series navigation inside the post |
| 2.4 | Related posts on the article page | Planned | — | Ranked by shared tags |
| 2.5 | Hire me page ("Me contrate") with résumé PDF | Planned | — | RN6: hire-me CTAs only here. PDF must not contain phone, address or documents |
| 2.6 | 404 page | Planned | — | Lavender opening band |
| 2.7 | RSS + JSON Feed (full content), `llms.txt` | Planned | — | Feeds pass the W3C validator |
| 2.8 | Technical SEO (sitemap, robots, JSON-LD, OG images via Satori, redirects, IndexNow) | Planned | — | RN4, RNF3. The redirects file is needed before any slug changes |

## Milestone 3 — Author publishing
| # | Feature | Status | Spec | Notes |
| --- | --- | --- | --- | --- |
| 3.1 | Sveltia CMS at `/admin` (PAT login, config that mirrors the schema, WebP uploads, `content:` commits) | Planned | — | Goal: under 5 minutes to publish from a phone |
| 3.2 | Drafts and scheduled publishing (hourly Actions cron, Cloudflare fallback, `SHOW_DRAFTS` on preview) | Planned | — | RN2, RN3 |
| 3.3 | Git flow automation (back-merge `main` → `develop`, SemVer tag on release merge, rulesets) | Planned | — | Rulesets live in Terraform `github/` |

## Milestone 4 — Audience
| # | Feature | Status | Spec | Notes |
| --- | --- | --- | --- | --- |
| 4.1 | Newsletter (`/api/subscribe` Worker, D1, Turnstile, honeypot, rate limit, double opt-in, Resend, one-click unsubscribe) | Planned | — | RN10 |
| 4.2 | Stats: Cloudflare Web Analytics beacon + Monday weekly email Worker (Analytics GraphQL + Search Console) | Planned | — | RN8: no cookies |

## Backlog
| Feature | PRD "Quando" | Notes |
| --- | --- | --- |
| Site search (Pagefind) | Depois | The listing mockup already has room for the search box |
| Comments (Giscus) | Futuro | RN11. Discussions are already enabled in Terraform |
| Ad pixels (GA4, Meta) + cookie banner | Quando for promover | RN9. Behind the `PUBLIC_ENABLE_ADS_PIXELS` flag |
| Interactive content (diagrams, 3D islands) | Por post | `client:visible` islands, added post by post |

## Open items
- **Domain:** undecided (PRD open question). It blocks the production DNS in 1.6 and the canonical URLs and sitemap in 2.8.
- **Hire me route:** the TRD does not name it. The design uses `/me-contrate`; confirm it in the 2.5 spec.
- **CMS datetime (3.1):** `publishDate` must be saved as an ISO datetime with an offset and seconds (or an ISO date); the Sveltia datetime widget has to be configured for it, since the schema rejects anything looser.
- **Assumed specs:** none (the specs so far, [project-scaffold](../specs/project-scaffold.md), [content-schema](../specs/content-schema.md) and [layout-shell](../specs/layout-shell.md), are `Accepted`, not `Assumed`).
- **Placeholder links:** GitHub, LinkedIn and e-mail in `src/lib/links.ts` are `TODO`. Fill them before the production build in 1.6; the build fails until then.
- **Feed endpoints:** `/rss.xml` and `/feed.json` are linked from the head and footer since 1.3. Create them (or expect the 1.5 link checker to flag them) in the feature that adds feeds.

Resolved on 2026-11-25: the stack (Astro 7, Node 26 LTS), routes (`/blog/<slug>`, `/tags/<tag>`, `/series/<serie>`), taxonomy (tags + `sectionColor`) and frontmatter names follow the TRD. `design/AGENTS.md` was updated to match.
