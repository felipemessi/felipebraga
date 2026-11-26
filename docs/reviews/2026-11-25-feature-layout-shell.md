# Review: feature/layout-shell

Date: 2026-11-25
Scope: 1.3 Layout shell ([spec](../specs/layout-shell.md))
Diff: `git diff develop...HEAD` (6 commits, before the review fixes)
Reviewer: Opus subagent (a different model from the author). Every finding below was checked against the code by the author session before it was kept.

Summary: nothing blocks the merge. Three items should be fixed first, because they either let placeholder links reach production or let design rule 2 drift. Four suggestions follow.

## Blocking

None.

## Should fix

1. **The placeholder-link guard never runs at build, and its tests pass for the wrong reason.**
   - Where: `src/lib/links.ts:34`, `tests/unit/links.test.ts:29-49`, `astro.config.ts:6`.
   - Verified: `assertLinksReady` is defined but called from no source file, only from unit tests.
   - Failure: `PUBLIC_SITE_URL=https://<prod> pnpm build` succeeds and ships `https://github.com/TODO`, `https://www.linkedin.com/in/TODO` and `mailto:TODO@example.invalid` in the footer and in the JSON-LD `sameAs`.
   - The test "fails a production build while TODOs remain" does nothing unless `PUBLIC_SITE_URL` is exported into Vitest. The test "refuses placeholders" branches on `findPlaceholders()`, so it repeats the implementation.
   - Fix: call `assertLinksReady(site)` in `astro.config.ts` after computing `site`, and make the unit test a fixed assertion that a non-local URL throws while TODOs exist.

2. **`PUBLIC_SITE_URL` in `.env` is ignored by `astro.config.ts`.**
   - Where: `astro.config.ts:6`, `.env.example`.
   - Astro evaluates the config before it loads `.env`, so `process.env` there sees only shell and CI variables. `.env.example` suggests a `.env` works.
   - Failure: a `.env` with the production URL still builds canonical, `og:url`, feed links and JSON-LD `url` as `http://localhost:4321`, and the guard from item 1 is bypassed because the site looks local.
   - Fix: read the value with `loadEnv(mode, process.cwd(), 'PUBLIC_')` from `vite` (falling back to `process.env`), or say in `.env.example` that it must be a shell or CI variable.

3. **The header tone and the opening band tone are two independent props.**
   - Where: `src/layouts/Base.astro:24,52`, `src/pages/index.astro:15`.
   - Verified: `Base` passes `tone` only to `Header`; each page sets `<Band tone>` itself. The spec Decision says one value drives both.
   - Failure: a 404 or article page that writes `<Band tone="lavanda">` without `tone` on `Base` renders a creme header over a lavanda band. The AC4 e2e test passes only because both default to `creme`.
   - Fix: have `Base` render the opening `Band` with the header around a named slot (for example `slot="hero"`), or at least pass the same constant to both and amend the spec Decision.

## Suggestions

4. **`Base` has no `canonical` prop, and the home declares `summary_large_image` without an `og:image`.**
   - AC9 lists `canonical` as a `Base` prop and AC10 lists `og:image`. `index.astro` passes no `image`, so social previews are blank until the OG endpoint exists.
   - Fix: pass `image={avatar.src}` from the home or a static default from `Base`; add an optional `canonical` override or amend AC9.

5. **`absoluteUrl` mangles absolute URLs.**
   - Where: `src/lib/seo.ts:24-31`. `absoluteUrl('https://example.com', 'https://cdn.x/a.png')` gives `https://example.com/https://cdn.x/a.png`. Harmless today (`avatar.src` is relative) but it breaks a post `cover` in 1.4.
   - Fix: return the input when it already starts with `http://` or `https://`, and add a unit case.

6. **The page-weight test sums the whole `dist`.**
   - Where: `tests/e2e/layout-shell.spec.ts` (AC16 test). RNF2 is per page. Once post pages exist the total passes 150 KB while every page is light, and the test will fail for the wrong reason.
   - Fix: measure the home HTML plus the CSS and `woff2` files it references, or the bytes fetched through `page.on('response')`.

7. **AC8 is only half-tested.**
   - Only the short-content case is exercised. The "follows long content" half is not, and neither are the 44px targets of the desktop nav links and the `summary` button.
   - Fix: add a short viewport case (for example 390x500) asserting `footer.top >= main.bottom`, and assert `height >= 44` on the desktop nav links and on `summary`.

## What went well

- JSON-LD is injected safely: `JSON.stringify` with `<` escaped before `set:html`, and a unit test for it.
- The mobile menu is a native `<details>` with no JS, and the no-JS rule is enforced twice (e2e and a unit scan of `.astro` files).
- Token drift is guarded: a normalized comparison with `design/tokens.css` that survives Prettier, plus a contrast test over every tone.
- Self-hosting is proven at runtime by recording every request host, and the `opsz` trade-off is documented with byte numbers in the spec.
- Logic lives in `src/lib/*.ts` with direct unit tests, so `.astro` stays markup and Sonar can analyze it.
