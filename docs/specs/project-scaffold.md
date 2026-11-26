# Project scaffold
Status: Accepted
Scope: 1.1

## Requirements
- TRD "Stack e decisões": Astro 7 (SSG) on Node 26 LTS, strict TypeScript 6.0.x, pnpm pinned in `packageManager` with install scripts blocked by default, native CSS without a UI framework, Apache-2.0 + `BRAND.md`.
- TRD "Testes e quality gate": Vitest for `src/lib`, Playwright (Chromium + WebKit mobile) against the built `dist/`, `@axe-core/playwright` with zero serious violations, Vitest coverage in `lcov` for Sonar, a coverage target of 80% or more.
- TRD "Segurança e licenças": `.gitignore` covers `.env`, `.env.*`, `.dev.vars`, `.wrangler/`, `.terraform/`, `*.tfstate*`. Site code reads only `PUBLIC_` env vars.
- TRD "SEO técnico": `lang="pt-BR"`, one `h1` per page, URLs `/blog/<slug>` with no duplicate trailing slash.
- RN5 (site in Portuguese), RN12 (code and content Apache-2.0; name, photo, logo, tagline and visual identity reserved).
- RNF2: 0 KB of required JS. The scaffold page ships no client JS.
- AGENTS.md: pnpm only; logic in `.ts` under `src/lib`, `.astro` holds markup only; e2e runs on `tests/fixtures/content`.
- Scope note: pin TypeScript 6.0.x (`astro check` refuses TS 7, `typescript-eslint` needs <6.1); `engines.node` >=26 to match `.nvmrc`.

## Acceptance criteria
1. AC1: On Node 26 with pnpm installed, `pnpm install --frozen-lockfile` succeeds from a clean clone. `package.json` pins `packageManager: "pnpm@<exact>"` and sets `engines.node: ">=26"`, and `engineStrict: true` in `pnpm-workspace.yaml` makes an older Node fail the install (pnpm 12 ignores `engine-strict` in `.npmrc`).
2. AC2: No dependency may run install scripts unless it is on an explicit allow-list. The list is empty today: `sharp` ships prebuilt binaries and `esbuild` is not installed (Astro 7 uses rolldown), so nothing is waiting for approval. Never use `pnpm approve-builds --all`.
3. AC3: `typescript` resolves to 6.0.x (range `~6.0.0`), and `tsconfig.json` extends `astro/tsconfigs/strictest`.
4. AC4: `pnpm dev` serves the placeholder home on `localhost:4321`.
5. AC5: `pnpm build` writes a static `dist/` with no adapter. The home HTML has `<html lang="pt-BR">`, exactly one `h1`, and no `<script>` tags.
6. AC6: `pnpm check` (`astro check`) passes with 0 errors and 0 warnings.
7. AC7: `pnpm lint` runs ESLint (typescript-eslint type-checked rules + eslint-plugin-astro; accessibility is covered by the axe e2e check) and `prettier --check` on `.ts`, `.astro`, `.mjs`, `.json`, `.md` outside `docs/` and `design/`, and passes with no errors. A deliberate violation makes it exit non-zero.
8. AC8: `pnpm test` runs Vitest on `tests/unit/**`. `pnpm test:coverage` writes `coverage/lcov.info`, covers only `src/lib/**`, and fails below 80% lines/branches/functions/statements.
9. AC9: `src/lib/site.ts` exports the site constants (name, tagline, locale `pt-BR`) and is fully covered by a unit test.
10. AC10: `pnpm test:e2e` builds, serves `dist/` with `astro preview`, and runs Playwright on two projects, `chromium` (desktop) and `webkit-mobile` (iPhone-class viewport). The smoke test checks `lang`, the single `h1` and the tagline, and runs axe with zero `serious`/`critical` violations.
11. AC11: `astro.config.ts` sets `trailingSlash: 'never'` and `build.format: 'file'`, and a request with a trailing slash to the preview server does not return a duplicate page.
12. AC12: `.gitignore` covers the TRD list plus `node_modules/`, `dist/`, `.astro/`, `coverage/`, `playwright-report/`, `test-results/`, and still allows `.env.example`. `git status` is clean after install, build and both test suites.
13. AC13: `LICENSE` holds the full Apache-2.0 text with `Copyright 2026 Felipe Braga`. `BRAND.md` (Portuguese) says the name, photo, logo, tagline, palette + typography combination and `design/assets/` are all rights reserved, and that code and post content are Apache-2.0 under `LICENSE`.
14. AC14: `README.md` (English) gives a one-paragraph summary, the prerequisites (Node 26 via `.nvmrc`, `npm i -g pnpm`), the scripts table, and links to the PRD, TRD, LICENSE and BRAND.md.

## Decision
- **Lint + format: ESLint (flat config) + Prettier.** `typescript-eslint` with `strictTypeChecked`, `eslint-plugin-astro` (recommended), and Prettier with `prettier-plugin-astro`. This is the setup the Astro ecosystem supports most fully, and its type-aware rules catch what `astro check` misses. Runner-up: Biome, which is faster with one tool, but its `.astro` support is still partial and has no a11y rules for Astro templates. `eslint-plugin-jsx-a11y` was dropped: it supports ESLint 9 at most while `eslint-plugin-astro` 3.x needs ESLint 10; axe in e2e covers accessibility on the rendered pages.
- **tsconfig: `astro/tsconfigs/strictest`.** On a greenfield repo, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` cost nothing now and would be painful to add later. They also suit optional frontmatter fields such as `series?` and `cover?`. Runner-up: `strict`.
- **URLs: `trailingSlash: 'never'` + `build.format: 'file'`.** This emits `blog/<slug>.html`, which Workers Static Assets serves at `/blog/<slug>`, so each page has one canonical URL with no slash, matching the TRD. It is decided now because changing it after launch would break RN4. Runner-up: `'always'` + `'directory'`, which is equally valid but contradicts the slash-free URLs in the TRD.
- **Vitest through `getViteConfig()` from `astro/config`**, so later `src/lib` code that imports `astro:content` types resolves the same way it does in the build.
- **Playwright against `astro preview` of `dist/`**, not `astro dev`, because CI tests the built artifact (TRD CI step 4).
- **Boundary with later features.** Not in 1.1:
  - MDX, content collections and fixtures wiring (1.2)
  - tokens, fonts and layout (1.3)
  - Shiki/Mermaid (1.4)
  - CI workflows and Sonar config (1.5)
  - Cloudflare adapter, `wrangler.jsonc`, headers and CSP (1.6)
  - `site` URL and sitemap (2.8, blocked on the domain)

  `tests/fixtures/content/` is created empty (`.gitkeep`) so 1.2 has a fixed place to put fixtures.
- **`BRAND.md` in Portuguese** (assumed): it addresses the site's Brazilian readers, as RN12 does. `LICENSE` stays as the canonical English Apache text.

## Design
Mockups: none (this feature has no UI). The placeholder home is unstyled and is replaced by 1.3/2.1. Its copy is Portuguese: `h1` "Felipe Braga" and the tagline as a paragraph.

Files:
```text
package.json            scripts, packageManager, engines
pnpm-workspace.yaml     engineStrict: true
pnpm-lock.yaml
astro.config.ts         static output, trailingSlash 'never', build.format 'file'
tsconfig.json           extends astro/tsconfigs/strictest; include .astro/types.d.ts, src, tests
eslint.config.mjs       flat config; ignores dist, .astro, coverage, docs, design
.prettierrc.json        + prettier-plugin-astro
.prettierignore         docs/, design/, .claude/, AGENTS.md, pnpm-lock.yaml, build and test output
vitest.config.ts        getViteConfig(); include tests/unit/**; coverage v8, lcov + text, src/lib/**, 80%
playwright.config.ts    webServer: pnpm build && pnpm preview --ignore-lock (port 4321); projects chromium, webkit-mobile
src/pages/index.astro   placeholder; reads constants from src/lib/site.ts
src/lib/site.ts         SITE = { name, tagline, locale } as const
tests/unit/site.test.ts
tests/e2e/smoke.spec.ts lang, single h1, tagline, axe (serious|critical = 0)
tests/fixtures/content/.gitkeep
.gitignore  LICENSE  BRAND.md  README.md
```

Scripts:

| Script | Command |
| --- | --- |
| `dev` | `astro dev` |
| `build` | `astro build` |
| `preview` | `astro preview` |
| `check` | `astro check` |
| `lint` | `eslint . && prettier --check .` |
| `format` | `prettier --write .` |
| `test` | `vitest run` |
| `test:coverage` | `vitest run --coverage` |
| `test:e2e` | `playwright test` |

Astro 7 auto-backgrounds `astro preview` when it detects an AI agent, so the e2e web server uses `--ignore-lock` to force a foreground server. Dependency versions: the latest stable version at install time, with exact versions recorded in the lockfile. The one exception is `typescript` at `~6.0.0`. The pnpm allow-list key depends on the pnpm version (`onlyBuiltDependencies` in pnpm 10); use whatever key the pinned version documents.

## Build plan
1. [x] Install pnpm, run `pnpm init`, pin `packageManager`, `engines.node`, `engineStrict` in `pnpm-workspace.yaml`, and the (empty) install-script allow-list. (AC1, AC2)
2. [x] Add Astro 7 and `typescript@~6.0.0` and `@astrojs/check`. Write `astro.config.ts` and `tsconfig.json`. (AC3, AC6, AC11)
3. [x] Write `src/lib/site.ts` and the placeholder `src/pages/index.astro`. Confirm dev and build output. (AC4, AC5, AC9)
4. [x] Set up ESLint + Prettier, then run `format` once over the repo. (AC7)
5. [x] Set up Vitest + coverage and write `tests/unit/site.test.ts`. (AC8, AC9)
6. [x] Set up Playwright + axe, run `playwright install`, write the smoke test, and create `tests/fixtures/content/.gitkeep`. (AC10, AC11)
7. [x] Write `.gitignore`, `LICENSE`, `BRAND.md` and `README.md`. (AC12, AC13, AC14)
8. [x] Run every script from a clean clone, then confirm a clean `git status`. (AC1, AC12)
9. Next step: run `audit` so AGENTS.md lists the real stack and commands.

## Alternatives
- **Biome instead of ESLint + Prettier:** see Decision.
- **`astro/tsconfigs/strict`:** less friction, but it lets unchecked index access into templates.
- **Install the Cloudflare adapter now:** not needed for SSG. Workers Static Assets serves `dist/` as is, and the dynamic Worker routes (4.1, 4.2) can live in their own Worker entry. That choice belongs to 1.6/4.1.
- **Run e2e on `astro dev`:** faster locally, but it tests something other than what ships.
