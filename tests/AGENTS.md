# AGENTS.md (tests)

- `unit/` is Vitest and covers only `src/lib` and the Zod schemas. Coverage is limited to `src/lib/**` with an 80% gate.
- `config/` is Vitest too (`pnpm test` runs it) and asserts on repository configuration as text: `package.json`, `wrangler.jsonc`, `public/_headers`, the workflows and the Terraform roots. Scope every workflow assertion to its job so it cannot pass by matching another job. These files are not part of coverage.
- `e2e/` is Playwright with axe on two projects (`chromium`, `webkit-mobile`). It runs against the built `dist/`, never `astro dev`. The config starts `pnpm build && pnpm preview --ignore-lock`.
- Every page test checks `lang="pt-BR"`, a single `h1`, and zero `serious` or `critical` axe violations.
- E2E tests run on `fixtures/content`, never on real posts. A new post must never break a test.
- Test names and comments are in English. Assertions on site copy stay in Portuguese.
