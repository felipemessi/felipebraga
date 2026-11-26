# Review 2: feature/content-schema (feature 1.2)

Date: 2026-11-26 · Diff: `origin/develop...HEAD` · Spec: [content-schema](../specs/content-schema.md) · PR: #4
Round 2 of [2026-11-25](2026-11-25-feature-content-schema.md), whose findings are all fixed. Reviewer: subagent on a different model (Fable, round 1 was Opus). Each item says how it was checked: **reproduced** means I ran it myself, **read** means I confirmed it in the files.

## Blocking

None. The reviewer found no case where a valid post is rejected or a broken one is published that round 1 did not already cover.

## Should fix

All four are cases where a dangling reference or a wrong date still ships with `astro build` exiting 0, so AC6 and RNF5 are not yet fully enforced.

1. **YAML merge keys get past the check** (`src/lib/content/references.ts:37`). The check calls `parse(block)` with no merge, while Astro parses frontmatter with `merge: true`. With `base: &b {tags: [ghost]}` and `<<: *b`, the check sees no tags, and Astro logs the invalid reference and exits 0. Fix: `parse(block, { merge: true })`. **Reproduced** (`tags` is `undefined` without merge and `["ghost"]` with it).
2. **A symlinked post folder is skipped by the check but loaded by Astro** (`scripts/check-references.ts:28`). `Dirent.isDirectory()` is false for a symlink, so a `posts/evil -> ../outside/evil` holding `tags: [ghost]` exits 0, and the kebab-case id rule is skipped too. Fix: stat the entry, or accept a symlink and then stat it. **Reproduced** (check exit 0).
3. **`.env` priority does not match Vite's** (`scripts/check-references.ts`, the `loadEnvFile` loop). The comment claims Astro's order, but Vite applies `.env`, `.env.local`, `.env.production`, `.env.production.local` with later files winning, so `.env.production` beats `.env.local`. With `.env.local=from-local` and `.env.production=from-production`, Vite returns `from-production` and the script `from-local`; the check then validates another directory than the one built. Fix: load in the order `.env.production.local`, `.env.production`, `.env.local`, `.env`, add a precedence test (today's test covers `.env` against a real variable only), and note that `astro build --mode <x>` and `${VAR}` expansion also differ. **Reproduced** with Vite's `loadEnv`, not with a full build.
4. **Date coercion is lenient and depends on the machine's timezone** (`src/lib/content/schemas.ts:22`). Through the real schema: `"1"` becomes 2001-01-01, `"Tuesday March 3"` becomes 2001-03-03, and `2026-02-30` silently becomes 2026-03-02, so garbage publishes a post in the past (RN1, RN2). `2026-12-01 09:00` (no seconds, so YAML leaves a string) is read in local time: `12:00Z` under `America/Sao_Paulo` and `09:00Z` under `TZ=UTC`, so a scheduled post goes out three hours apart depending on where the build runs. Fix: for strings require `z.iso.date()` or `z.iso.datetime({ offset: true })` before coercing, and keep accepting a YAML `Date`. **Reproduced.**

## Suggestions

Reported by the reviewer and reproduced by them; I did not rerun these.
- The check is stricter than Astro in places: `posts/.wip/` and macOS `._devops.yaml` files fail it though Astro ignores dot files, and a leading blank line or `+++` TOML frontmatter is reported as "missing frontmatter". The failure is safe, the message misleads.
- `posts/x/Index.md` is never loaded by Astro (case-sensitive), but on macOS the check reads it through `existsSync`, so the post disappears silently and the two disagree by platform.
- Values that pass but should not: a zero-width-space `title`; a `canonical` with credentials or a raw `"><` (store `new URL(v).href`); an `updatedDate` earlier than `publishDate`.
- Zod counts code points: 36 emoji pass `max(70)`, and NFD accents count double. Consider `normalize('NFC')` first.
- Test hygiene in `tests/unit/content-fixtures.test.ts`:
  - `mkdtempSync` directories are never removed (11 per run). Reproduced.
  - `spawnSync('pnpm', ...)` fails on Windows without `shell: true`. Read only.
  - The AC11 builds have no `--outDir`; a schema regression that made `sem-alt` valid would overwrite the repo's `dist/`. They also share `node_modules/.astro` with a parallel e2e run. Read only.
- Stale docs, all confirmed by reading:
  - `content-schema.verify.md` (AC12) says "100% today"; line, statement and function coverage is 100% but branch coverage is 96.61%.
  - The spec's build plan step 10 still says "Next step: `sync`", the AGENTS.md sync is done; the Design file list lacks `ids.test.ts` and `content-fixtures.test.ts`; the "Slug = folder name" decision says a unit test checks the format, but `prebuild` now enforces it.
  - `AGENTS.md`: the `pnpm build` row mentions only missing tags and series (it also fails on ids, missing frontmatter and both `index.md` and `index.mdx`), and the `src/lib/` line lacks `ids`.
  - `tests/AGENTS.md` says unit tests cover only `src/lib` and the schemas, but `content-fixtures.test.ts` spawns the script and Astro builds.

## What went well

- `draft: yes` and `draft: "false"`, a scalar `tags`, a string `seriesOrder`, `http:x` and a whitespace-only date are all rejected.
- When the check finds frontmatter it extracts the same block as Astro. BOM, CRLF and duplicate keys behave the same in both.
- Lowercase kebab-case ids remove the case-sensitivity problems for tags, series and pages.
- `isPublished` and `filterPublished` are pure and correct; an Invalid Date cannot get through the schema.
- Nothing from frontmatter reaches HTML yet, and `PUBLIC_CONTENT_DIR` is author-controlled, not untrusted input.
- 88 tests pass and the coverage gate holds. The `pnpm build` test fails properly when `pnpm` is missing instead of passing falsely.

## Resolution

Should fix 1 to 4 and the documentation and test-hygiene items were fixed after this review. Each fix has a test, and the two script fixes (symlink, `.env` order) were mutation-checked: putting the old code back makes exactly those tests fail.
- **1:** frontmatter is parsed with `merge: true`.
- **2:** the script stats each entry, so a symlinked post folder is followed.
- **3:** `.env` files load in Vite's production order; `--mode` and `${VAR}` expansion are noted as not mirrored.
- **4:** `publishDate` and `updatedDate` accept a `Date`, an ISO date, or an ISO datetime with an offset and seconds, and reject everything else. The spec decision was rewritten: its premise (YAML turns a timestamp into a `Date`) was wrong for Astro's core schema.
- **Docs and tests:** the spec, `verify.md`, `AGENTS.md` and `tests/AGENTS.md` are updated. Temp dirs are removed in `afterAll`, and the AC11 builds write to a temp `--outDir`.
- **Still open (suggestions, not fixed):** dot files and AppleDouble files fail the check although Astro ignores them, `Index.md` is read on macOS but never loaded, a few values that pass but should not (zero-width `title`, `canonical` with credentials, `updatedDate` before `publishDate`), code-point counting in `max(70)`, and `spawnSync('pnpm')` without `shell: true` on Windows.

## Next step

Item 4 matters most: a scheduled post that depends on the build machine's timezone breaks the hourly publish (3.2), and a garbage date publishes in the past. Items 1 to 3 close the remaining ways the prebuild check and Astro can disagree. They go through `develop`; none needs a new spec decision except item 4, which tightens the `publishDate` rule recorded in the spec. This review changes no code, spec status or scope.
