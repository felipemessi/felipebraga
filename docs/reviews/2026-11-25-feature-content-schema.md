# Review: feature/content-schema (feature 1.2)

Date: 2026-11-25 · Diff: `origin/develop...HEAD` · Spec: [content-schema](../specs/content-schema.md) · PR: #4
Reviewer: subagent on a different model (Opus). Each finding was checked against the code; the status says how.

## Blocking

1. **The reference check reads ids differently from Astro, so dangling references still ship (AC6, RNF5).** `scripts/check-references.ts:15` uses the raw file name as the id, while the `glob()` loaders in `src/content.config.ts` slugify it by default.
   - `tags/DevOps.yaml` with `tags: [DevOps]`: the check exits 0, Astro logs `[ERROR] Invalid content reference` and exits 0, and `dist/` is built with a broken reference.
   - `tags: [devops]` against `DevOps.yaml` is valid in Astro, but the check exits 1.
   - Fix: set an explicit `generateId` for tags and series and mirror it in the script, or derive ids the way Astro does.
   - **Status: reproduced.**
2. **A UTF-8 BOM before the opening `---` turns the check off.** The regex at `scripts/check-references.ts:20` does not match, the frontmatter becomes `{}`, and `tags: [ghost]` passes (check exit 0, Astro exit 0 with the `[ERROR]` log). A leading blank line does the same.
   - Fix: strip the BOM, and fail when a post file has no frontmatter.
   - **Status: reproduced** (BOM case).
3. **A blank `publishDate:` is accepted as 1970 and the post goes live (AC2, RN1).** YAML parses it as `null` and `z.coerce.date()` turns `null` into `new Date(null)`. `astro build` exits 0.
   - Fix: reject `null` and numbers before coercing, for example a preprocess step or `z.union([z.date(), z.string()]).pipe(z.coerce.date())`. The same applies to `updatedDate`.
   - **Status: reproduced.**

## Should fix

4. **The object form of a reference is mishandled.** `tags: [{collection: tags, id: devops}]` is valid in Astro, but `.map(String)` at `scripts/check-references.ts:39` yields `"[object Object]"` and exits 1; `series` in object form is skipped. Status: reported by the reviewer, not re-run.
5. **`index.md` and `index.mdx` in one folder:** the check reads only `.md`, so a dangling tag in the `.mdx` passes. Reject the case or check both. Status: reported, not re-run.
6. **`canonical` accepts non-http(s) URLs.** `z.url()` accepts `javascript:` and `mailto:`; the value will land in `<link rel="canonical">` and OG tags (1.3, 2.8). Restrict to `http`/`https`. Status: reported, not re-run; whether Astro escapes it later is unknown.
7. **Invalid frontmatter YAML crashes the check with a raw stack trace** instead of naming the post. It still exits 1. Wrap `parse` in a try/catch. Status: reported, not re-run.
8. **A test can stay green while the build is broken (AC11).** In `tests/unit/content-fixtures.test.ts` the `tag-inexistente` case runs only the script, so deleting `prebuild` from `package.json` keeps every test green. The script's own parsing (CRLF, block lists, BOM, ids) has no unit test, and `scripts/` is outside the coverage figure. Status: confirmed by reading the test.
9. **The check and Astro can read different content dirs.** The script reads only `process.env`; `content.config.ts` uses `import.meta.env`, which Vite also fills from `.env*` files. Status: reported, could not be verified without writing a `.env`.

## Suggestions

- `resolveContentDir` strips only trailing `/`, not `\`. Not tested on Windows.
- `series: 123` is skipped by the check; confirm Astro's `reference()` rejects it.
- A date-only `publishDate` (`2026-12-01`) parses as UTC midnight, which is 21:00 the day before in `America/Sao_Paulo`. Add a test or a note.
- Tests do not cover a blank `description` for tags and series, the 160-character upper limit for pages, or the types of `updatedDate` and `draft` on pages.

## What went well

- `isPublished` and `filterPublished` are pure, take `now` as a parameter and are correct (AC8, AC9).
- Rules, defaults and messages match the spec table, and logic stays out of `.astro` files.
- Site code reads only `PUBLIC_` env vars. Coverage on `src/lib` is 100% (53 tests), and `pnpm lint` and `pnpm check` are clean.
- Each invalid fixture fails for its own rule, and the check found the Astro 7 gap (exit 0 on a dangling reference) before it shipped.

## Resolution

Items 1 to 9 were fixed after this review; only the suggestions are still open.
- **1:** tags, series and pages get an explicit `generateId` (`idFromFile`, the file name without its extension) shared with the script. Any id that is not lowercase kebab-case fails the check. Recorded in the spec Decision.
- **2:** the parser accepts a BOM and fails on a post file with no frontmatter.
- **3:** `publishDate` and `updatedDate` reject `null`, an empty string, numbers and booleans.
- **8 (partial):** `pnpm build` is run against `tag-inexistente`, `package.json` is asserted to have the `prebuild` entry, and the parsing now lives in `src/lib` with unit tests (BOM, CRLF, block lists, no frontmatter, invalid YAML). Invalid YAML (item 7) is reported by name as a side effect.
- **4, 5, 6, 9:** fixed in a second pass. The check reads the object form of a reference and reports a non-string `series`; a folder with both `index.md` and `index.mdx` fails; `canonical` accepts only `http` and `https`; and the script loads `.env.production.local`, `.env.local`, `.env.production` and `.env` with `process.loadEnvFile`, so a real variable wins and Astro and the check read the same dir (verified with a real `.env`).
- **Open:** the suggestions only.

## Next step

Items 1 to 3 break RN1 or RNF5 in cases an author can hit by accident (a capitalized tag file, a Windows editor, an empty date field). They should go through `develop` (or `architect` if the id rule becomes a spec decision) before merge. This review changes no code, spec status or scope.
