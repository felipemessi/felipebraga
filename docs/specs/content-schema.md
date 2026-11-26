# Content schema
Status: In Progress
Scope: 1.2

## Requirements
- TRD "Modelo de conteúdo": collections `posts`, `tags`, `series` and `pages`, validated by Zod at build time. An invalid field breaks the build, not the site. Field table and rules as in the TRD.
- RN1: every post has a title, summary, date, at least one tag and, if it has a cover, alt text. Without these it does not publish.
- RN2: a draft never shows up on the site, in the RSS, in the sitemap or in search. `isPublished = !draft && publishDate <= build time` is the single predicate every listing, feed, route, sitemap and Pagefind step will use.
- RNF5: invalid frontmatter fails the build (`astro check`, plus `astro build` for content validation).
- TRD "Estrutura do repositório": schemas in `src/content.config.ts`, content in `src/content/{posts,tags,series,pages}`, logic in `src/lib`, fixtures in `tests/fixtures/content`, independent of real posts.
- AGENTS.md: logic lives in `.ts` under `src/lib` (Sonar skips `.astro`), E2E runs on `tests/fixtures/content`, site code reads only `PUBLIC_` env vars, coverage of `src/lib/**` stays at 80% or more.
- 1.1 boundary: MDX, content collections and fixtures wiring were deferred to this feature.
- Out of scope: pages that render the collections (1.3, 1.4, 2.x), reading time, TOC and related posts (derived values, 1.4 and 2.4), `SHOW_DRAFTS` for preview (3.2), Sveltia `config.yml` (3.1).

## Acceptance criteria
1. AC1: `src/content.config.ts` defines four collections, `posts`, `tags`, `series` and `pages`, with the Astro `glob()` loader. Posts load from `<content dir>/posts/*/index.{md,mdx}`, tags and series from `*.yaml`, pages from `*.md`. The entry `id` of a post is its folder name (the slug).
2. AC2: `posts` schema accepts the TRD fields and rejects, with a Zod error that names the field: a missing or empty `title`; a `title` over 70 characters; a `description` outside 50–160 characters; a missing or invalid `publishDate`; an empty `tags` array; duplicate tags; a `sectionColor` outside the seven allowed ids; a `canonical` that is not an absolute URL.
3. AC3: `draft` defaults to `false`. `updatedDate`, `series`, `cover`, `sectionColor` and `canonical` are optional.
4. AC4: a post with `cover` and no non-empty `coverAlt` is rejected (RN1). `coverAlt` without `cover` is rejected too.
5. AC5: a post with `series` and no `seriesOrder` is rejected, and so is `seriesOrder` without `series`. `seriesOrder` must be a positive integer.
6. AC6: `tags` and `series` entries in a post are Astro references. A reference to an entry that does not exist makes `pnpm build` exit non-zero, naming the post and the missing id. Astro 7 alone does not do this: it logs `[ERROR] Invalid content reference` and exits 0 (confirmed on the `tag-inexistente` fixture), so the build runs a reference check first (see Decision).
7. AC7: `tags` and `series` schemas require `name` and `description` (non-empty). `pages` requires `title` and `description`, with the same limits as posts, plus optional `draft` (default `false`) and `updatedDate`.
8. AC8: `src/lib/content/visibility.ts` exports `isPublished(entry, now)`. It returns `true` only when `draft` is false and `publishDate <= now`, and it is pure: `now` is always a parameter. Equality at the exact instant counts as published. Draft with a past date and a future date without draft are both `false`.
9. AC9: `src/lib/content/visibility.ts` also exports `filterPublished(entries, now)`, which keeps only published entries and preserves order. For `pages`, which have no `publishDate`, only `draft` applies.
10. AC10: the content directory comes from `PUBLIC_CONTENT_DIR`, defaulting to `src/content`. `tests/fixtures/content` holds posts, tags and series for e2e: one published post (`.md`), one published `.mdx` post, one draft, one scheduled post (far-future `publishDate`), a post in a series, a post with a cover, and the tags and series they use. `pnpm test:e2e` sets `PUBLIC_CONTENT_DIR=tests/fixtures/content`.
11. AC11: with the fixtures, `pnpm build` and `pnpm check` pass. Each deliberately invalid content dir in `tests/fixtures/invalid/` (`sem-alt`, `sem-tag`, `tag-inexistente`) makes `pnpm build` exit non-zero when `PUBLIC_CONTENT_DIR` points at it, and the error names the broken rule, proving RNF5 end to end. Fixture descriptions must be valid YAML: a `:` inside an unquoted value is a parse error and would pass for the wrong reason.
12. AC12: `pnpm test:coverage` passes with the 80% gate. The schema, `isPublished` and reference-check unit tests cover every rule in AC2 to AC9.
13. AC13: the real `src/content/` exists with empty collections (`.gitkeep` in each folder) and `pnpm build` passes with no real posts, with no new warnings other than Astro's "empty collection" notice, if any.
14. AC14: `AGENTS.md` and the README script table are not changed by this feature, except `AGENTS.md` listing MDX, content collections and `yaml` as installed, `PUBLIC_CONTENT_DIR`, and the `prebuild` reference check (the `sync` step).

## Decision
- **Schemas live in `src/lib/content/schemas.ts`, `content.config.ts` only wires them.** Sonar does not analyze `.astro`, and `content.config.ts` runs inside Astro's virtual module environment, which is hard to unit test. Each schema is a factory that takes the Astro helpers it needs (`{ image, reference }`), so Vitest passes a stub for `image()` and `reference()` and tests the real rules without booting Astro. Runner-up: write everything in `content.config.ts`, simpler but it leaves RN1 untested and outside the coverage gate.
- **`@astrojs/mdx` is installed now.** The posts loader pattern must cover `index.mdx` from day one, and a fixture exercises it, so the integration has to exist. The MDX components (CodeBlock, Callout, ...) stay in 1.4. Runner-up: install it in 1.4 and glob only `.md` here, which would make 1.4 change the schema loader.
- **`publishDate` is `z.coerce.date()`.** The TRD asks for a datetime with timezone, but YAML parses an unquoted timestamp into a `Date` before Zod sees it, so the zone cannot be checked in the schema. Authors and the CMS write ISO 8601 with an offset (`2026-12-01T09:00:00-03:00`). The Sveltia datetime widget must be configured for that in 3.1. Runner-up: require a quoted ISO string with `z.iso.datetime({ offset: true })`, stricter, but it breaks as soon as someone writes the date the YAML way, and the build error would confuse more than help.
- **`sectionColor` values are the ASCII `data-tone` ids from `design/tokens.css`:** `salvia`, `ceu`, `pessego`, `manteiga`, `lavanda`, `rosa`, `menta`. `creme` is excluded: it is the default band, not a post color. The TRD lists the names with accents, but the id has to match the CSS attribute.
- **Fixtures through `PUBLIC_CONTENT_DIR`, not a second Astro project.** The loader `base` is read once from the env var in `content.config.ts`. It fits the rule that site code reads only `PUBLIC_` vars and keeps real and test content apart. Runner-up: copy fixtures into `src/content` in a Playwright global setup, which touches real folders and can leave residue.
- **Dangling references fail the build through a pre-build check.** `src/lib/content/references.ts` exports the pure `findBrokenReferences()`, and `scripts/check-references.ts` reads the content dir (frontmatter of `posts/*/index.{md,mdx}`, ids of `tags/*.yaml` and `series/*.yaml`), calls it, prints each problem and exits 1. `package.json` runs it as `prebuild`, so `pnpm build` (and CI and deploy, which call it) stop before Astro starts. It runs on Node 26's native TypeScript support, with `allowImportingTsExtensions` already set by the Astro base tsconfig. It adds `yaml` as a direct dependency: it is already in the tree through Astro, but pnpm does not expose transitive packages. The logic stays in `src/lib` and under the 80% gate; the script is only I/O. Runner-up: a Vitest test over the content, which is simpler but only fails `pnpm test`, not `pnpm build`, so a local build or a deploy outside CI would still go through.
- **`isPublished` takes `now` as an argument.** It is pure and testable, and the build computes `now` once and passes it everywhere, so one build has a single notion of time (scheduled posts flip only on the hourly build, 3.2). `SHOW_DRAFTS` is a caller concern, added in 3.2 without changing this function.
- **Slug = folder name**, not a frontmatter field. A slug change is a rename and needs a redirect (2.8). The folder-to-id rule is enforced by the loader, and the slug format (lowercase kebab-case) is checked by a unit test over the fixtures' ids, not by a schema field.
- **`updatedDate` stays optional.** Falling back to the last commit date is a build-time concern for the SEO and article features (1.4, 2.8), not for the schema.
- **Boundary.** Not in 1.2: components and routes that consume the collections, `getCollection` helpers that sort or paginate (they arrive with 1.4, 2.1 and 2.2), reading time, related posts, RSS, sitemap.

## Design
Mockups: none (data model only, no UI).

Files:
```text
src/content.config.ts            collections; glob loaders; base from PUBLIC_CONTENT_DIR
src/lib/content/schemas.ts       postSchema, tagSchema, seriesSchema, pageSchema (factories)
src/lib/content/visibility.ts    isPublished, filterPublished
src/lib/content/dir.ts           resolveContentDir(env) -> string, default 'src/content'
src/lib/content/references.ts    findBrokenReferences(posts, tagIds, seriesIds) -> string[]
scripts/check-references.ts      reads PUBLIC_CONTENT_DIR, runs the check, exit 1 on any problem (prebuild)
src/content/{posts,tags,series,pages}/.gitkeep
tests/fixtures/content/
  posts/<slug>/index.md|mdx      published, mdx, draft, scheduled, series member, with cover
  tags/*.yaml  series/*.yaml  pages/*.md
tests/fixtures/invalid/          bad posts, one per broken rule, never loaded by default
tests/unit/schemas.test.ts       AC2 to AC7
tests/unit/visibility.test.ts    AC8, AC9
tests/unit/content-dir.test.ts   AC10
tests/unit/references.test.ts    AC6
```

Schema summary (Portuguese copy is not needed here: these are frontmatter keys; Zod messages stay in English because they are for the author in the terminal):

| Field | Zod |
| --- | --- |
| `title` | `z.string().trim().min(1).max(70)` |
| `description` | `z.string().trim().min(50).max(160)` |
| `publishDate` | `z.coerce.date()` |
| `updatedDate` | `z.coerce.date().optional()` |
| `draft` | `z.boolean().default(false)` |
| `tags` | `z.array(reference('tags')).min(1)`, unique ids (refine) |
| `series` / `seriesOrder` | `reference('series').optional()` / `z.number().int().positive().optional()`, tied by `superRefine` |
| `cover` / `coverAlt` | `image().optional()` / `z.string().trim().min(1).optional()`, tied by `superRefine` |
| `sectionColor` | `z.enum([...7 ids]).optional()` |
| `canonical` | `z.url().optional()` |

Data flow: `PUBLIC_CONTENT_DIR` -> `resolveContentDir()` -> loader `base` -> entries -> (later features) `filterPublished(entries, now)`.

## Build plan
1. [x] Add `@astrojs/mdx` and register it in `astro.config.ts`. Confirm `pnpm build` still passes. (AC1)
2. [x] Write `src/lib/content/dir.ts` and its test. (AC10)
3. [x] Write `schemas.ts` factories for the four collections, test-first against the rules. (AC2 to AC7)
4. [x] Write `visibility.ts` and its tests. (AC8, AC9)
5. [x] Add `yaml` as a dependency. Write `references.ts` with its tests, then `scripts/check-references.ts` and the `prebuild` script. (AC6)
6. [x] Write `src/content.config.ts` using the factories and the glob loaders, and add the `.gitkeep` folders under `src/content/`. (AC1, AC6, AC13)
7. [x] Create the fixtures under `tests/fixtures/content/` and the invalid ones under `tests/fixtures/invalid/<case>/` (each a full content dir with its own `posts/` and `tags/`). (AC10, AC11)
8. [x] Set `PUBLIC_CONTENT_DIR` in the Playwright web server command. Run `pnpm check`, `pnpm build` with the fixtures, and `pnpm build` pointed at an invalid fixture to see it fail. (AC10, AC11)
9. [x] Run `pnpm test:coverage`, `pnpm lint`, `pnpm test:e2e`. (AC12)
10. Next step: `sync` adds MDX, content collections and `PUBLIC_CONTENT_DIR` to AGENTS.md. (AC14)

## Alternatives
- **Rules inline in `content.config.ts`:** see Decision.
- **Strict ISO string for `publishDate`:** see Decision.
- **Accented `sectionColor` values (`sálvia`, `pêssego`):** match the TRD text, but need a mapping to the CSS ids and put non-ASCII in YAML keys that the CMS writes.
- **Slug as a frontmatter field:** allows a slug that differs from the folder, but it creates two sources of truth for the URL.
- **Rely on Astro's own reference validation:** it logs an error and exits 0, so RNF5 would not hold for tags and series.
- **Single `content` collection with a `type` field:** fewer collections, but loses per-type schemas and typed references.
