# Layout shell
Status: Accepted
Scope: 1.3

## Requirements
- Design rules 1–4, 7, 8, 10, 11 (`design/AGENTS.md`): full-width tone bands, header takes the opening band's tone with no bottom border, text always `--text` with `--accent` on links/focus, no gradients or shadows, sticky footer with exactly `2rem` of final space, logo = round photo + "Felipe Braga" in Fraunces, WCAG AA, visible focus, touch targets ≥ 44px, zero JS by default.
- TRD "Stack": Astro Fonts API, self-hosted WOFF2, latin subset, `preload` only for weights used above the fold, `font-display: swap` with an adjusted fallback to avoid CLS. CSS in custom properties, critical CSS inlined by Astro, no UI framework.
- TRD "SEO técnico": one `<SEO>` component in the base layout with `lang="pt-BR"`, `<title>`, meta description, canonical, `og:*`, `twitter:card=summary_large_image`, RSS and JSON Feed autodiscovery links, JSON-LD `Person` with `sameAs`. `noindex` for `/admin` and previews.
- RN5 (UI copy in Portuguese), RNF1/RNF2 (HTML+CSS+fonts < 150 KB, 0 KB required JS), RNF4 (a11y ≥ 95, AA on pastel bands).
- AGENTS.md: logic in `src/lib/*.ts`, `.astro` holds markup only; site code reads only `PUBLIC_` env vars; e2e runs on `tests/fixtures/content`.
- Scope note: the header tone matches the opening band. The mockup footer says "Next.js + MDX"; the stack is Astro, so the footer says "Astro + MDX".

## Acceptance criteria
1. AC1: `design/tokens.css` is copied to `src/styles/tokens.css` unchanged in values and imported once by the base layout. A `global.css` adds the reset, body column (`min-height: 100vh`, flex column) and `footer { margin-top: auto }`. No gradients or `box-shadow` anywhere in the shell CSS.
2. AC2: Fraunces (axis `WONK`; `opsz` and `SOFT` dropped for the page budget, see Decision), Instrument Sans and JetBrains Mono are configured through the Astro Fonts API, self-hosted, latin subset, `font-display: swap`, with an adjusted fallback. The built HTML has no request to `fonts.googleapis.com` or any other third-party host, and only the above-the-fold weights get `<link rel="preload">`.
3. AC3: `Band.astro` renders a full-width `<section>` with `data-tone` (one of the eight tokens in `tokens.css`) and a centered inner container (max 1200px, 48px side padding desktop, 20px mobile). The tone is a typed union exported from `src/lib/tone.ts`.
4. AC4: `Header.astro` takes a `tone` prop and renders its own full-width `data-tone` wrapper, so it has the opening band's color, with no bottom border. Desktop (≥ 768px): 76px high, logo left, `nav[aria-label="Principal"]` right with Artigos (`/blog`), Temas (`/tags`) and Me contrate (`/me-contrate`). The three links are plain menu items (design rule 6) with ≥ 44px touch targets.
5. AC5: Mobile (< 768px): 64px header and a menu button that opens the same three links with **no client JS** (CSS-only, `<details>`/`<summary>` or equivalent). The button has an accessible name "Abrir menu", is operable by keyboard, and the open state keeps the header tone with no shadow.
6. AC6: The logo links to `/`, shows `felipe-avatar.jpg` (40px circle, `alt=""` since the adjacent text names the link) through `astro:assets` with explicit `width`/`height`, and "Felipe Braga" in Fraunces 20px/500. `design/assets/felipe-avatar.jpg` is copied to `src/assets/`.
7. AC7: `Footer.astro` renders on `creme` with the name (Fraunces 32px, `WONK 1`), the tagline from `SITE.tagline`, `nav[aria-label="Rodapé"]` with RSS (`/rss.xml`), GitHub, LinkedIn and E-mail, and the line "© <ano do build> · Astro + MDX · sem rastreadores". Final space is exactly `2rem` below the last line; no city is mentioned anywhere.
8. AC8: With short content the footer sits at the viewport bottom (sticky footer), and with long content it follows the content, at 390, 768 and 1440 px.
9. AC9: `Base.astro` takes `title`, `description`, optional `tone` (default `creme`), an optional `canonical` override, `image`, `noindex`, `type`, `jsonLd`, and renders `<html lang="pt-BR">`, the head via `<SEO>`, the tokens/fonts, a visually hidden "Pular para o conteúdo" skip link as the first focusable element, `<Header tone>`, `<main id="conteudo">` and `<Footer>`. Inside `main`, a named `hero` slot, when a page fills it, renders the opening `<Band>` with the same `tone` as the header; the default slot follows it. Pages never render the opening `<Band>` themselves. It ships no `<script>` tag.
10. AC10: `<SEO>` emits `<title>` (`<page> · Felipe Braga`, or just the site name on the home), `meta description`, `link rel=canonical` (absolute, no trailing slash), `og:title/description/url/type/site_name/locale=pt_BR/image`, `twitter:card=summary_large_image`, and `link rel=alternate` for `/rss.xml` and `/feed.json`. With `noindex`, it adds `<meta name="robots" content="noindex">`. Head data is built by pure functions in `src/lib/seo.ts`.
11. AC11: The home (and only the home for now) also emits JSON-LD `Person` (name, url, `image`, `sameAs` from the links config) as one `<script type="application/ld+json">`. `BlogPosting` and `BreadcrumbList` stay with 1.4. The JSON-LD block is data, not JS, so "no JS" checks accept `type="application/ld+json"` only.
12. AC12: The absolute site URL comes from `PUBLIC_SITE_URL` (`astro.config.ts` `site`), resolved by `resolveSiteUrl` in `src/lib/site-url.ts`. The config loads `.env.local` and `.env` itself, because Astro reads the config before the env files, and variables already set in the shell or CI win. It falls back to `http://localhost:4321` in dev and tests. An invalid value fails the build. `.env.example` documents it.
13. AC13: External links, GitHub/LinkedIn/E-mail targets and the author photo URL live in a single config file, `src/lib/links.ts`, separate from `site.ts`. Values not yet known are explicit `TODO` placeholders. `assertLinksReady(site)` runs in `astro.config.ts`, so a build with a non-local `PUBLIC_SITE_URL` fails while any placeholder remains; unit tests cover the guard with injected links. Header and footer read only from it.
14. AC14: `src/pages/index.astro` is rebuilt on `Base`, passing the opening `creme` band through the `hero` slot, one `h1` and the tagline, as the shell showcase until 2.1 replaces it. The existing e2e smoke test still passes.
15. AC15: axe reports zero `serious`/`critical` violations on the shell in Chromium and WebKit mobile. Link text and focus outlines meet AA on every tone (a unit test computes the contrast of each `--accent-*` on its `--bg-*` ≥ 4.5:1, and ≥ 5:1 as the tokens declare).
16. AC16: `pnpm check`, `pnpm lint`, `pnpm test:coverage` (≥ 80% on `src/lib/**`) and `pnpm build` pass. The built home HTML plus the CSS and fonts it references stays under the RNF2 budget of 150 KB (measured per page, not over all of `dist`), and the build has no JS file.

## Decision
- **Header tone through a prop, not inheritance.** `Base` receives `tone` and passes it to `Band` (the opening band) and `Header`, so one value drives both and design rule 2 cannot drift. Later pages (article: `sectionColor`; 404: `lavanda`) only pass a different tone. Runner-up: let each page place `<Header>` itself, which spreads the rule across every page.
- **Mobile menu with `<details>`, no JS.** The menu is three links, so an island is unwarranted under rule 11 and RNF2. `<details>` gives keyboard and screen-reader behavior for free. Runner-up: a `:checked` CSS-hack toggle, which is worse for accessibility. Trade-off: it does not close on link click, which is acceptable because navigation reloads the page.
- **Search button deferred.** The mockup shows a "Buscar" icon button, but Pagefind and the search island arrive in Milestone 2. A button that does nothing would be a dead control, so 1.3 omits it and the later search feature adds it to `Header` (`slot`-free, one extra item).
- **Links and URL isolated in config.** Per the user's decision, social URLs, e-mail and `sameAs` live in `src/lib/links.ts` only. The site URL uses `PUBLIC_SITE_URL` with a localhost fallback because the production domain is open until 1.6; changing it later is an env change.
- **Pure logic in `src/lib`.** `seo.ts` (title, canonical, OG, JSON-LD builders), `tone.ts` (tone union and guard), `links.ts` and `site-url.ts` are plain `.ts` with Vitest coverage, keeping `.astro` as markup (Sonar does not analyze `.astro`).
- **Fonts via Astro Fonts API** (Google provider, downloaded at build and self-hosted), as in the TRD, not a runtime Google Fonts request (the mockups' `<link>` is only for the canvas). Preload Fraunces and Instrument Sans; JetBrains Mono loads on demand.
- **Fraunces without the `opsz` axis** (amended during develop). With `opsz`, `SOFT` and `WONK` the latin subset is 121 KB, which alone nearly exhausts the RNF2 budget (HTML+CSS+fonts < 150 KB). Without `opsz` it is 62 KB and the three families total 123 KB. `WONK` and weight stay, as the display titles need them. `SOFT` was dropped later (2026-11-26, author's decision after comparing `SOFT` 0 to 100): without it the font is 37 KB instead of 62 KB and the titles use the font's default `SOFT 0`, which lowers the estimated LCP of an article with a cover from 1.88 s to 1.65 s. The `opsz` axis only fine-tunes contrast by size, and the design's title sizes work without it. Revisit if the budget gets room.
- **The opening band comes from `Base` (amended after review).** Header and band read the same `tone` inside `Base`, so design rule 2 cannot drift: a page that forgot to repeat the tone used to get a creme header over a lavanda band. Pages only fill the `hero` slot. Runner-up: keep `<Band>` in each page and test it, which leaves the rule to every author.
- **The placeholder guard runs at build (amended after review).** A unit test alone never stopped `PUBLIC_SITE_URL=https://… pnpm build` from shipping `TODO` links, so the guard is called from `astro.config.ts`. `.env` is loaded there with `process.loadEnvFile` (Node 26) because Astro evaluates the config first and `vite`'s `loadEnv` is not a direct dependency. Runner-up: document that the variable must be a shell or CI variable, which silently ignores `.env`.
- **RNF2 is measured per page (amended after review).** The e2e test weighs the home HTML plus the CSS and fonts it references, so adding post pages later does not trip it.
- **Boundary.** Not in 1.3: Post/Listagem layouts (1.4, 2.x), PostCard/Tag/Button, MDX components, `BlogPosting`/`BreadcrumbList` JSON-LD, OG image endpoint, RSS/JSON Feed endpoints, sitemap, `robots.txt`, search, analytics beacon. The `/rss.xml` and `/feed.json` links exist in head/footer before the endpoints do; the link checker (1.5) is expected to flag them until those features land, so the e2e shell test does not crawl them.

## Design
Mockups: `design/telas/Home.dc.html` + `HomeMobile.dc.html` (header, footer), `Tokens.dc.html` (token table), checked at 390, 768 and 1440.

```text
src/
  assets/felipe-avatar.jpg
  styles/tokens.css            # from design/tokens.css
  styles/global.css            # reset, body column, sticky footer, focus, skip link
  components/Band.astro  Header.astro  Footer.astro  SEO.astro
  layouts/Base.astro
  lib/tone.ts  seo.ts  links.ts  site-url.ts   (site.ts already exists)
  pages/index.astro            # showcase on Base
tests/unit/tone.test.ts seo.test.ts links.test.ts site-url.test.ts contrast.test.ts shell-config.test.ts
tests/e2e/layout-shell.spec.ts
```

Data flow: page → `Base({title, description, tone, canonical, image, …})`, with the opening band in the `hero` slot → `SEO` (props → `seo.ts` builders) and `Header({tone})`/`Footer` (read `SITE` and `links.ts`).

## Build plan
1. [x] Copy tokens and the avatar, add `global.css` (reset, sticky footer, focus, skip link) — AC1, AC6, AC8
2. [x] Configure the Astro Fonts API for the three families, with preload and fallback — AC2
3. [x] `src/lib/tone.ts` + unit test; `Band.astro` — AC3
4. [x] `src/lib/links.ts` + placeholder-guard test; `PUBLIC_SITE_URL` in `astro.config.ts` and `.env.example` — AC12, AC13
5. [x] `src/lib/seo.ts` (title, canonical, OG, JSON-LD) + unit tests; `SEO.astro` — AC10, AC11
6. [x] `Header.astro` (desktop nav, `<details>` mobile menu, logo) — AC4, AC5, AC6
7. [x] `Footer.astro` — AC7
8. [x] `Base.astro` (skip link, SEO, Header, main, Footer) — AC9
9. [x] Rebuild `index.astro` on `Base`; keep the smoke test green — AC14
10. [x] Contrast unit test over the eight tone pairs — AC15
11. [x] E2E `layout-shell.spec.ts`: structure, sticky footer at 390/768/1440, no JS, no third-party font host, axe — AC8, AC9, AC15
12. [x] Run check, lint, coverage, build, and measure page weight — AC16
13. [x] Review fixes: `site-url.ts`, build-time guard, `.env` loading, `hero` slot, `canonical` prop, `og:image` on the home, absolute URLs in `absoluteUrl` — AC9, AC10, AC12, AC13, AC14
14. [x] Test the review fixes: injected-link guard tests, per-page weight, long-content footer, 44px targets — AC4, AC5, AC8, AC13, AC16

## Alternatives
- **Inherit header tone with CSS (`:has()` or a parent `data-tone`).** Fewer props, but the header would depend on DOM nesting and be harder to test. Rejected for the explicit prop.
- **Menu island with `client:idle`.** Better animation control, costs JS for three links. Rejected by rule 11 and RNF2.
- **Ship the search button disabled.** Keeps the mockup pixel-faithful but adds a dead control with no function. Rejected until Pagefind lands.
- **Fixed production domain now.** Simplest, but the domain is undecided and a wrong guess leaks into canonical URLs. Rejected for `PUBLIC_SITE_URL`.
