# Article page

Status: Accepted
Scope: 1.4

## Requirements

- PRD "Funcionalidades": a post page with formatted code, images and a table of contents, plus reading time. Persona "Dev buscando solução": find the answer fast, copy the code, read well on a phone. Journey "Leitor que chega pela busca": "Usa o sumário e copia o código".
- RN1 (title, summary, date, tags, cover alt; already enforced by 1.2), RN2 (a draft or scheduled post has no route), RN4 (URL is `/blog/<slug>`, never changes), RN5 (all UI copy in Portuguese, including the footnote labels), RN6 (no hire-me CTA on the article), RN7 (no city).
- TRD "Stack": Shiki at build (no client highlighting), Mermaid rendered at build as static SVG. "Modelo de conteúdo": derived values `slug`, URL `/blog/<slug>`, reading time, table of contents (h2/h3). `isPublished` gates every route. `updatedDate` falls back to the last commit (deferred, see Decision).
- TRD "Performance": no JS by default; islands only where needed (copy code). Images through `astro:assets` `<Picture>`, AVIF + WebP with JPEG fallback, widths 400/800/1200/1600, `sizes` from the text column, `width`/`height` always set, cover `loading="eager"` + `fetchpriority="high"`, the rest `lazy` + `decoding="async"`.
- TRD "SEO técnico": one `h1` per page, headings in order, JSON-LD `BlogPosting` (headline, dates, author, image, `inLanguage`) and `BreadcrumbList`, `canonical` override for republished posts, `og:type=article`.
- RNF1 (LCP < 1.5 s, CLS < 0.05, Lighthouse ≥ 95), RNF2 (HTML + CSS + fonts < 150 KB per page, 0 KB of *required* JS), RNF3 (SEO = 100), RNF4 (a11y ≥ 95, AA on the pastel bands), RNF6 (no broken internal links), RNF7 (build < 3 min).
- Design rules 1–4, 10, 11 (`design/AGENTS.md`): the opening band takes the post `sectionColor` and the header matches it; text is always `--text`, `--accent` colors links/tags/borders; no gradients or shadows; AA, visible focus, touch targets ≥ 44px, `alt` on images; copy button as an island. Callout tones: nota = menta, dica = manteiga, atenção = pêssego, perigo = rosa. Code: Shiki at build, light pastel theme, file name, copy island, line highlight. Figure: normal and extended width. Headings with an anchor on hover. Toc sticky on desktop, `<details>` on mobile. The mockup "subtítulo" is the post `description`; the TL;DR is `<Tldr>` in the MDX body.
- AGENTS.md: logic in `src/lib/*.ts`, `.astro` holds markup only; `Base.astro` with the opening band in `<Fragment slot="hero">`; e2e on `tests/fixtures/content`; coverage of `src/lib/**` ≥ 80%; pnpm with install scripts blocked.
- User decisions (2026-11-26): Mermaid through `rehype-mermaid` with Playwright's Chromium at build; the copy button ships, and the Lighthouse script budget goes from 0 to 2 KB.

## Acceptance criteria

1. AC1 — Route: `src/pages/blog/[slug].astro` builds one page per post that passes `filterPublished(posts, now)`, with `now` computed once per build. With the fixtures, `dist/blog/primeiro-post.html` and `dist/blog/artigo-completo.html` exist, and `dist/blog/rascunho.html` and `dist/blog/agendado.html` do not. The page URL is `/blog/<slug>` with no trailing slash.
2. AC2 — Layout: `src/layouts/Post.astro` renders on `Base` with `tone = sectionColor ?? 'creme'`, so the header and the opening band share the post color. The bands are, in order: opening band (post tone), body (`creme`), author band (`salvia`), footer (`creme`). No band has a gradient or shadow.
3. AC3 — Opening band: tag pills in frontmatter order (the first one with the solid accent border, the rest at 40% accent), each linking to `/tags/<id>` with the tag's `name` as text; one `h1` with the `title` (Fraunces, `--text-h1`, `SOFT 50`, `WONK 1`); the `description` as the lead (`--text-lead`); a mono uppercase meta line in `--accent`: `12 nov 2026 · 9 min de leitura · atualizado 18 nov` on desktop, `12 nov 2026 · 9 min` below 768px. "atualizado" appears only when `updatedDate` exists and falls on a later day than `publishDate`. On desktop (≥ 1024px) the text column is offset to align with the article column (mockup: 320px), at most 760px wide.
4. AC4 — Cover: when `cover` exists, it renders under the text as `<Picture>` (AVIF, WebP, JPEG fallback; widths 400/800/1200/1600; `sizes` for the 1104px container), `alt = coverAlt`, `loading="eager"`, `fetchpriority="high"`, explicit `width`/`height`, 2:1 crop with `object-fit: cover`, 1px border at 35% accent and `--radius-lg`. With no cover, no empty figure is emitted.
5. AC5 — Dates and reading time: dates are formatted in Portuguese for `America/Sao_Paulo` (`12 nov 2026`; the updated date drops the year when it matches). Reading time is `readingTime(body)` from `src/lib/post/reading-time.ts`: words of the raw body (frontmatter, `import`/`export` lines and JSX tags stripped, code included) at 200 words per minute, rounded up, minimum 1. Both are pure and unit-tested, including the São Paulo day boundary (`2026-12-01T01:00:00Z` shows `30 nov 2026`).
6. AC6 — Code blocks: fenced code in `.md` and `.mdx` is highlighted by Shiki at build with a custom light theme built from the tokens (keys `--accent-ceu`, strings `--accent-salvia`, numbers `--accent-pessego`, keywords and booleans `--accent-lavanda`, comments `--accent-creme` italic) on `--surface`. Every token color reaches 4.5:1 on `--surface` (unit test). Each block renders as `<figure class="code">` with a 48px header: the file name from the fence meta `title="…"` (or nothing), the language label, and the copy button. Fence meta `{4}` or `{2-3,7}` highlights lines with the post-tone `--bg` and a 3px `--accent` left border. Line numbers come from a CSS counter, on desktop only, so they are never part of the copied or selected text. Long lines scroll horizontally inside the block; the page never scrolls sideways at 390px.
7. AC7 — Copy: the copy button is rendered `hidden` and a module script reveals it, so without JS there is no dead control. Clicking copies the code text exactly (no line numbers, no trailing newline added), shows "Copiado" for 2 s, and announces it through an `aria-live="polite"` region. Desktop shows the icon and "Copiar"; mobile shows the icon with `aria-label="Copiar código"`; both are ≥ 44px tall on mobile. The script is a bundled module under `/_astro/`, loaded only on pages that contain a code block, and its total size is ≤ 2 KB. Its logic lives in `src/lib/copy-code.ts` behind small interfaces so Vitest covers it without a DOM library.
8. AC8 — Mermaid: a ```` ```mermaid title="…" ```` fence renders at build as inline SVG (no Mermaid JS on the page) inside a `<figure>` whose `figcaption` is the title, with the SVG marked `role="img"` and `aria-label` set to the title. A Mermaid fence without `title` fails the build and names the post (design rule 10). The diagram uses the token palette (`theme: 'base'` with `themeVariables` from `tokens.css`) and Instrument Sans, loaded into the headless page so label boxes fit the final font. Shiki skips the `mermaid` language (`syntaxHighlight.excludeLangs`).
9. AC9 — MDX components, mapped globally by `Post.astro` (`<Content components={…} />`) so posts need no `import`:
   - `<Tldr>`: box on the post tone (`--bg` fill, 1px `--accent` border, `--radius-lg`), "TL;DR" mono label in `--accent`, children as the list.
   - `<Callout type="nota|dica|atencao|perigo">`: `role="note"`, tone menta/manteiga/pessego/rosa, an inline SVG icon (`aria-hidden`), and a bold lead "Nota." / "Dica." / "Atenção." / "Perigo." in the callout `--accent`. An unknown `type` fails the build (typed props plus a guard in `src/lib/mdx/callout.ts`).
   - `<Figure src alt caption? wide?>`: `<Picture>` lazy with the same formats and widths, `alt` required (empty `alt` fails the build), optional `figcaption`. `wide` extends 160px into the right margin at ≥ 1200px and goes full-bleed below 768px.
10. AC10 — Prose (plain Markdown, so the CMS can write it): `h2` 36px / `h3` 26px Fraunces per the mockup, paragraphs at `--text-body` / 1.6, article column at most 720px; inline `code` on `--surface` with a 1px border and `--radius-sm`; blockquote in Fraunces italic with a 2px `--accent` left border; links in `--accent` with underline; lists, `hr` and images styled. GFM tables are wrapped in `<div class="table-wrap" role="region" aria-label="Tabela" tabindex="0">` so they scroll on their own and pass axe `scrollable-region-focusable`.
11. AC11 — Footnotes: GFM footnotes render after an `hr` as a small muted ordered list. The labels are Portuguese through `markdown.remarkRehype`: the section heading "Notas" (visually hidden), back-link `aria-label` "Voltar ao texto". No English label ("Footnotes", "Back to content") is left in the HTML.
12. AC12 — Heading anchors: every `h2` and `h3` in the body has the id Astro gives it and a `#` link to itself, `aria-label="Link para a seção <texto>"`, placed in the left gutter on desktop, visible on hover and on `:focus-visible`, and hidden from the mobile layout without losing the id. An `h1` (`#`) in a post body fails the build and names the post (one `h1` per page).
13. AC13 — Toc: built by `buildToc(headings)` in `src/lib/post/toc.ts` from `render(entry).headings`: `h2` entries with their `h3` children, the footnote heading excluded, an `h3` before any `h2` promoted to the top level. It renders only when there are at least two entries. Desktop (≥ 1024px): a 240px `aside` left of the article, `position: sticky`, label "Nesta página", `nav[aria-label="Índice"]`, h3 entries indented. Below 1024px: a sticky bar under the opening band with `<details>`/`<summary>` ("Índice"), the same links, no JS, a 52px summary row (≥ 44px target).
14. AC14 — Reading progress: a 2px bar under the Toc (desktop) and under the sticky bar (mobile), driven only by CSS `animation-timeline: scroll(root)` inside `@supports`, `aria-hidden="true"`. Browsers without scroll timelines show no bar. There is no "% lido" text and no active-section highlight (both need JS; see Decision).
15. AC15 — Author band (`salvia`): avatar (72px desktop, 56px mobile, `astro:assets`, `alt=""` since the name follows), "Felipe Braga" in Fraunces, `SITE.tagline`, and links RSS and LinkedIn from `src/lib/links.ts`, each ≥ 44px tall on mobile. No hire-me link or CTA (RN6).
16. AC16 — SEO: the page passes `type="article"`, the `canonical` frontmatter value when set (absolute, used as is) or `/blog/<slug>`, and `og:image` from the processed cover (absolute URL) or the site default. Head adds `article:published_time`, `article:modified_time` (when `updatedDate`) and one `article:tag` per tag name. JSON-LD is one `<script type="application/ld+json">` holding an `@graph` with `BlogPosting` (`headline`, `description`, `datePublished`, `dateModified` = `updatedDate ?? publishDate`, `author` → the same `Person` as the home, `image` when there is a cover, `inLanguage: "pt-BR"`, `mainEntityOfPage`) and `BreadcrumbList` (Início `/` › Artigos `/blog` › title). Builders are pure functions in `src/lib/seo.ts` with unit tests.
17. AC17 — Fixture: `tests/fixtures/content/posts/artigo-completo/index.mdx` (`sectionColor: ceu`, two tags, cover from `design/assets/capa-helm.jpg`, updated date) uses every element: Tldr, the four Callout types, a code block with `title` and `{4}`, a code block without `title`, inline code, h2/h3, blockquote, a Mermaid diagram, `<Figure>` normal and `wide` (`helm-diff.png`), a GFM table wider than 390px and two footnotes. The existing fixtures keep building.
18. AC18 — Accessibility: axe reports zero `serious`/`critical` violations on `/blog/artigo-completo` in Chromium and WebKit mobile, with the Toc `<details>` closed and open. Headings go h1 → h2 → h3 with no skip in the fixture. Every interactive element is reachable by keyboard with a visible focus ring.
19. AC19 — Budgets: on `/blog/artigo-completo`, HTML + CSS (gzip-compressed, as Cloudflare serves them and Lighthouse counts them) plus the fonts the page references stay under 150 KB, and the page loads at most one script file, ≤ 2 KB. `lighthouserc.json` sets `resource-summary:script:size` to 2048, and its config test changes with it. The home still ships no script: the shell test's "no JS files in `dist`" check becomes "the home references no script". With the fixtures, the built article's CLS is 0 (images have dimensions, fonts swap with adjusted fallbacks).
20. AC20 — Pipeline: `ci.yml`, `deploy.yml` and `preview.yml` install Playwright Chromium (cached under `~/.cache/ms-playwright`) before `pnpm build` in the job that builds, holding no secrets, as today. The config tests in `tests/config/` assert it per job. `lychee.toml` also excludes `/tags/<id>` until 2.3 creates the tag pages. The CI build stays under 3 min with a warm cache (RNF7).
21. AC21 — `pnpm check`, `pnpm lint`, `pnpm test:coverage` (≥ 80% on `src/lib/**`), `pnpm build` and `pnpm test:e2e` pass. The e2e suite covers AC1–AC4, AC6–AC9, AC11–AC15 and AC19 on the fixtures, and screenshots the article at 390, 768 and 1440 for `check verify` against `Artigo.dc.html` and `ArtigoMobile.dc.html`.

## Decision

- **Fenced code and plain Markdown first, MDX components only where Markdown has no syntax.** Sveltia (3.1) writes Markdown, so code, tables, footnotes, headings, quotes and images must look right with no component. They are styled and transformed at build by Shiki transformers and small rehype plugins in `src/lib/markdown/`. Only `Tldr`, `Callout` and `Figure` are MDX components, mapped globally so a post never needs an `import`. Runner-up: a `<CodeBlock>` component, which forces MDX and JSX syntax on every post with code.
- **Code frame as a Shiki transformer.** A transformer in `src/lib/markdown/code-frame.ts` reads the fence meta (`title`, line ranges) and wraps the `<pre>` in the figure with its header; line highlight uses `@shikijs/transformers` (`transformerMetaHighlight`), added as a direct dependency. Shiki itself already ships with Astro. Runner-up: a rehype pass after Shiki, which has to re-parse the meta that Shiki already has.
- **Own rehype plugins for anchors, tables, Mermaid captions and the `h1` guard.** Each is a few lines over `unist-util-visit`, tested with Vitest on hast trees, and under the coverage gate. Astro adds heading ids after user plugins, so the anchor plugin runs `rehypeHeadingIds` from `@astrojs/markdown-remark` first, as Astro documents. New direct dependencies: `@astrojs/markdown-remark`, `unist-util-visit`, `@types/hast` (dev). Runner-up: `rehype-autolink-headings`, which covers anchors only and is outside the gate.
- **Mermaid through `rehype-mermaid` with `strategy: 'inline-svg'` (user decision).** There is no reliable pure-Node Mermaid layout; it needs a browser. Playwright's Chromium is already used by e2e, so the build installs it too (`playwright` becomes a direct dependency, pinned to the `@playwright/test` version). Inline SVG keeps labels as text and adds no image request. The caption is required because it is the accessible name. Runner-up: move Mermaid to its own scope row and keep the build job browser-free.
- **Copy button as a tiny module script, budget 2 KB (user decision).** RNF2 forbids *required* JS, not optional enhancement. The button is `hidden` until the script runs, so a reader without JS sees no dead control, and the script ships only on pages with a code block. It is a plain Astro `<script>` (bundled, deferred), not a framework island: there is no framework, and `client:visible` applies only to framework components. Logic in `src/lib/copy-code.ts` keeps it under Sonar and Vitest. Runner-up: no copy button until later, keeping a 0-byte budget.
- **Reading progress with CSS scroll timelines, no active-section tracking.** The mockup's "38% lido" text and the bold current Toc entry need an `IntersectionObserver` script on every article for decoration only. A CSS `animation-timeline` bar gives the visual cue with zero JS where supported and nothing elsewhere. Runner-up: a second island for scroll spy, which adds JS that does not help copy or reading.
- **Mobile Toc summary is static.** The mockup shows the current section in the summary, which needs the same scroll-spy JS; the summary reads "Índice" instead.
- **Reading time at 200 wpm with code counted.** Technical Portuguese reads slower than prose averages, and code is read too. It is a pure function over the raw body, so it does not depend on the rendered HTML. Runner-up: `reading-time` package, an extra dependency for a 15-line function.
- **Dates in `America/Sao_Paulo`.** The author and the audience are in Brazil, and the build runs in UTC, so a post at 23:00 local would show the next day. The zone is one constant in `src/lib/site.ts`. No city is shown (RN7).
- **`updatedDate` git fallback deferred to 2.8.** The fallback needs full git history in the build (`fetch-depth: 0`) and the sitemap `lastmod` needs the same value, so one helper in 2.8 serves both. Until then "atualizado" and `dateModified` use the frontmatter only (`dateModified` falls back to `publishDate`).
- **Author band in, related posts and series navigation out.** The mockup's "Leia também" band and prev/next nav belong to 2.4 and 2.3, which add them to `Post.astro`. The author band is static and ships now. The mobile mockup's "Mais textos →" link is replaced by the same RSS and LinkedIn links as desktop, so both layouts carry one set of links.
- **Tag pills link to `/tags/<id>` now.** The URLs follow the TRD and will exist in 2.3; `lychee.toml` excludes them until then, the same way 1.3 handled `/blog` and `/tags`.
- **Budget measured compressed for the article.** A long article with highlighted code and an inline SVG diagram is large raw but compresses well, and both Cloudflare and Lighthouse count transfer size. The fonts are already WOFF2 and are counted as is. The home keeps its raw-byte test.
- **Boundary.** Not in 1.4: related posts (2.4), series navigation (2.3), tag and listing pages (2.2, 2.3), OG image generation (2.8), the git `updatedDate` fallback (2.8), `SHOW_DRAFTS` (3.2), search and the header search button (backlog), Giscus (future), a real first post (author content, written outside this feature).

## Design

Mockups: `design/telas/Artigo.dc.html` + `ArtigoMobile.dc.html`, checked at 390, 768 and 1440. Deviations listed in Decision: no "% lido" text, no active Toc entry, no "Leia também" or prev/next nav, mobile author links, no cover caption (the schema has no caption field), footer reads "Astro + MDX" (1.3).

```text
src/
  pages/blog/[slug].astro          getStaticPaths: filterPublished(getCollection('posts'), now)
  layouts/Post.astro               Base + hero (tags, h1, lead, meta, cover) + Toc + article + author band
  components/
    Tag.astro                      pill link (reused by 2.x listings)
    Toc.astro                      desktop aside + mobile <details> bar + progress bar
    AuthorBand.astro
    mdx/Tldr.astro  Callout.astro  Figure.astro
  scripts/copy-code.ts             entry only: calls initCopyButtons(document, navigator.clipboard)
  styles/prose.css  code.css       article typography, code frame, line numbers, highlight
  lib/
    site.ts                        + timeZone: 'America/Sao_Paulo'
    seo.ts                         + blogPostingJsonLd, breadcrumbJsonLd, articleMeta
    copy-code.ts                   initCopyButtons, codeText
    post/reading-time.ts  toc.ts  dates.ts  view.ts   (view: entry + tags -> props for Post.astro)
    mdx/callout.ts                 callout types -> tone, label; guard
    markdown/
      code-frame.ts                Shiki transformer: figure, header, title, language, copy button
      shiki-theme.ts               token-based light theme
      heading-anchors.ts           rehype: # link on h2/h3; fails on h1
      table-wrap.ts                rehype: scrollable region around <table>
      mermaid-figure.ts            rehype: requires title, figure + caption + role/aria-label
      config.ts                    the markdown block for astro.config.ts (plugins, remarkRehype labels, Shiki)
astro.config.ts                    markdown: { shikiConfig, syntaxHighlight.excludeLangs, rehypePlugins, remarkRehype }
tests/fixtures/content/posts/artigo-completo/{index.mdx, capa-helm.jpg, helm-diff.png}
tests/unit/reading-time.test.ts toc.test.ts dates.test.ts post-view.test.ts callout.test.ts
           copy-code.test.ts code-frame.test.ts shiki-theme.test.ts heading-anchors.test.ts
           table-wrap.test.ts mermaid-figure.test.ts seo.test.ts (extended)
tests/e2e/article.spec.ts
```

Data flow: `getCollection('posts')` → `filterPublished(…, now)` → per slug `render(entry)` → `{ Content, headings }` + `toPostView(entry, tags)` (tone, tag pills, meta line, reading time, canonical, JSON-LD) → `Post.astro` → `Base({ title, description, tone, canonical, image, type: 'article', jsonLd })`.

Rehype order (Astro `markdown.rehypePlugins`, MDX inherits it): `rehypeHeadingIds` → `heading-anchors` → `table-wrap` → `mermaid-figure` → `rehype-mermaid`. Shiki runs in Astro's own step with `code-frame` and `transformerMetaHighlight`.

Breakpoints: < 768px mobile (mockup 390), 768–1023px single column with the mobile Toc bar, ≥ 1024px Toc aside + offset hero, ≥ 1200px wide figures overflow right.

## Build plan

1. [x] Add the fixture `artigo-completo` with its images; check the existing fixtures still build — AC17
2. [x] `src/lib/post/dates.ts`, `reading-time.ts`, `toc.ts` + unit tests — AC5, AC13
3. [x] `src/lib/seo.ts` builders (`BlogPosting`, `BreadcrumbList`, article meta) + tests; `src/lib/post/view.ts` + tests — AC3, AC16
4. [x] Route `blog/[slug].astro` and `Post.astro` with hero, cover, meta, `Tag.astro`; lychee exclude for `/tags/<id>` — AC1–AC4, AC20
5. [x] Prose styles; `table-wrap`, `heading-anchors` (with `rehypeHeadingIds` and the `h1` guard) + tests; footnote labels in `remarkRehype` — AC10–AC12
6. [x] Shiki theme + contrast test; `code-frame` transformer + `transformerMetaHighlight` + tests; `code.css` — AC6
7. [x] `src/lib/copy-code.ts` + tests; `src/scripts/copy-code.ts`; script budget 2048 in `lighthouserc.json` and its config test; home no-script assertion — AC7, AC19
8. [x] `Tldr`, `Callout` (+ `src/lib/mdx/callout.ts` guard and tests), `Figure`; global component map — AC9
9. [x] `Toc.astro` (aside, `<details>` bar, CSS progress bar) — AC13, AC14
10. [x] `AuthorBand.astro` — AC15
11. [x] Mermaid: `playwright` and `rehype-mermaid` deps, `mermaid-figure` plugin + tests, theme and font; Chromium install and cache in `ci.yml`, `deploy.yml`, `preview.yml` + config tests — AC8, AC20
12. [x] E2E `article.spec.ts`: routes, bands, cover attributes, code and copy (Chromium clipboard permission), Mermaid SVG, footnote labels, anchors, Toc open/closed, axe, compressed budget, screenshots at 390/768/1440 — AC18, AC19, AC21
13. [x] Run check, lint, coverage, build (timed), e2e (CI build time still to confirm on a warm cache) — AC20, AC21

## Alternatives

- **`<CodeBlock>` MDX component instead of fenced code:** see Decision.
- **Prism or client-side highlighting:** ruled out by the TRD (Shiki at build).
- **Mermaid in the browser:** ruled out by the TRD; costs ~600 KB of JS.
- **Pre-rendered Mermaid SVGs committed with the post:** no browser in the build, but the author would run a CLI before every diagram, which breaks publishing from the phone.
- **Shiki `css-variables` theme:** colors switchable by CSS, but each token still carries an inline style and the theme would need a second copy of the palette. The token-based static theme is simpler.
- **JS scroll spy for the active Toc entry and "% lido":** see Decision.
- **Git `updatedDate` fallback now:** see Decision.
