# AGENTS.md (tests)

- `unit/` is Vitest and covers `src/lib` and the Zod schemas. `content-fixtures.test.ts` also spawns `scripts/check-references.ts`, `pnpm build` and `astro build` against fixtures and temp content dirs (removed in `afterAll`; give the Astro builds an `--outDir`). Coverage is limited to `src/lib/**` with an 80% gate.
- `config/` is Vitest too (`pnpm test` runs it) and asserts on repository configuration as text: `package.json`, `wrangler.jsonc`, `public/_headers`, the workflows and the Terraform roots. Scope every workflow assertion to its job so it cannot pass by matching another job. These files are not part of coverage.
- `e2e/` is Playwright with axe on two projects (`chromium`, `webkit-mobile`). It runs against the built `dist/`, never `astro dev`. The config starts `pnpm build && pnpm preview --ignore-lock`.
- Every page test checks `lang="pt-BR"`, a single `h1`, and zero `serious` or `critical` axe violations.
- Name tests after the acceptance criterion they prove (`AC6: ...`).
- `fixtures/invalid/<case>/` are complete content dirs, not loaded by default. A new one must fail for its own rule: check the error message, because a YAML mistake in the fixture also fails the build and hides the real result.
- E2E tests run on `fixtures/content`, never on real posts. A new post must never break a test.
- Test names and comments are in English. Assertions on site copy stay in Portuguese.
