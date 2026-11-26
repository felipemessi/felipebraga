# Manual verification: content schema (1.2)

Run from the repo root on Node 26 (`pnpm install --frozen-lockfile` first). Spec: [content-schema.md](content-schema.md).

| AC | Steps | Expected |
| --- | --- | --- |
| AC1, AC10 | `PUBLIC_CONTENT_DIR=tests/fixtures/content pnpm build`, then look for `"primeiro-post"`, `"post-mdx"`, `"agendado"` in `node_modules/.astro/data-store.json` | Build exits 0. Ids equal the folder names and the `.mdx` post is loaded |
| AC2, AC3, AC4, AC5 | `pnpm test` | `tests/unit/schemas.test.ts` passes |
| AC4 | `PUBLIC_CONTENT_DIR=tests/fixtures/invalid/sem-alt pnpm build` | Exit 1, `coverAlt: coverAlt is required when cover is set` |
| AC2 | `PUBLIC_CONTENT_DIR=tests/fixtures/invalid/sem-tag pnpm build` | Exit 1, `tags: Too small: expected array to have >=1 items` |
| AC6 | `PUBLIC_CONTENT_DIR=tests/fixtures/invalid/tag-inexistente pnpm build` | Exit 1 from `prebuild`, `posts/ruim: tag "nao-existe" does not exist in the tags collection` |
| AC7 | `pnpm test` | tag, series and page cases pass |
| AC8, AC9 | `pnpm test` | `tests/unit/visibility.test.ts` passes |
| AC10 | `pnpm test:e2e` | 4 tests pass; the web server log shows `check-references` then `astro build` |
| AC11 | Run the three invalid builds above | Each exits non-zero for its own rule, not for a YAML parse error |
| AC12 | `pnpm test:coverage` | All tests pass; gate at 80% is met (100% statements, lines and functions, about 97% branches today) |
| AC13 | `pnpm build` with no env var | Exit 0 with the empty `src/content/` |
| Static | `pnpm check` and `pnpm lint` | 0 errors, 0 warnings |

Known: on a clean clone `tests/unit/repo-config.test.ts` (1.1, AC12) fails until `dist/`, `coverage/`, `playwright-report/` and `test-results/` exist.
