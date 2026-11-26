# Review: feature/article-page (1.4 Article page)

Date: 2026-11-26 · Diff: `git diff develop...HEAD` (4 commits) · Reviewer: Opus subagent, each finding re-checked against the code by the main session.

## Blocking

1. **A date-only `publishDate` shows the previous day.** `src/lib/content/schemas.ts` reads `2026-11-12` (the schema allows it, and Sveltia may write it) as UTC midnight; `src/lib/post/dates.ts` then formats it in `America/Sao_Paulo`, which is 21:00 on the 11th. Reproduced: `new Date('2026-11-12')` formats as day `11`. `atualizado` can also be wrong (`updatedDate: 2026-11-13` lands on the 12th). Every fixture and test uses an explicit offset, so nothing catches it. Fix: treat a date-only value as a calendar day (format it in UTC, or parse it at noon in the site zone) and add a unit test and a fixture with a date-only value.

## Should fix

2. **Fixture images leak into the production build.** `src/components/mdx/Figure.astro` globs `/tests/fixtures/content/posts/**` unconditionally. A default build with empty `src/content` still emitted `capa-helm.jpg`, `helm-diff.png` and `cover.png` into `dist/_astro` (confirmed). Fix: glob only the active content dir, or isolate the fixture glob behind the e2e build.
3. **Without a Toc the desktop article loses its alignment.** The hero and author band always get `margin-left: 320px`, but the article only reaches 320px because of the 240px aside plus the 80px gap (`Post.astro`, `AuthorBand.astro`). A post with 0 or 1 headings (`primeiro-post`, `post-mdx`) misaligns at ≥1024px, against AC3. The e2e test only checks that the Toc is absent. Fix: keep a 320px start for the article when there is no aside, and assert the alignment.
4. **The copy button can stick on "Copiado".** `src/lib/copy-code.ts` reads the original label at click time, so two clicks within 2 s restore "Copiado". Fix: use the constant "Copiar" and clear the pending timer; add a unit test for repeated clicks.
5. **Touch targets under 44px on mobile** (design rule 10): tag pills are `min-height: 32px` (`Tag.astro`), and footnote refs and back-links are small (`prose.css`).
6. **Doubled accessible name on desktop headings.** The anchor with `aria-label` sits inside the h2/h3, so the name becomes "Link para a seção X X" and screen-reader heading lists repeat each title. Fix: place the link after the text or outside the heading, or use a visually hidden suffix.

## Suggestions

- With `canonical` set, the `BreadcrumbList` third item and `mainEntityOfPage` point to the external site; keep the breadcrumb on `/blog/<slug>`.
- Reveal the copy button only when `navigator.clipboard?.writeText` exists (non-secure origins and some webviews throw a TypeError today).
- The "home references no script" e2e check matches only `<script src=`; an inline module script would pass. Reject any `<script` that is not `ld+json`.
- A callout with two paragraphs collapses into one run of text (`.text :global(p) { display: inline }`).
- Indented code blocks get the frame and a hidden button, but `hasCodeBlock` detects fences only, so no copy script loads. Nothing breaks.
- `pnpm lighthouse` is still not run; `lhci` crawls every HTML file, so a real article will meet the home page's 12 KB document and 14 KB CSS budgets.

## What went well

- Markdown-first design: the code frame is a Shiki transformer and the anchors, tables and Mermaid captions are small hast plugins under the 80% coverage gate (100% lines on `src/lib`).
- Copy logic behind small interfaces, so Vitest covers it with no DOM; the button ships `hidden` and the script is 627 bytes, loaded only on pages with code.
- The build fails with a clear message that names the post: body `h1`, Mermaid fence without a title, unknown Callout type, empty Figure `alt`.
- Mermaid measures labels with the real font, passed as a data URL with nothing written to disk.
- JSON-LD escapes `<`; workflows keep build jobs secret-free, pin actions by SHA and scope config tests per job.
- The minifier gotcha for `animation-timeline` is documented where it applies, with an e2e test that scrolls and checks the fill.

## Checked, no issue

- `rehypeHeadingIds` runs once effectively (no `#` in the Toc text); RN2, RN6 and RN7 hold; the article budget is measured gzipped as the spec decided.
