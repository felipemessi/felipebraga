---
name: test
description: Write tests for the code just changed (Vitest for src/lib and Zod schemas, Playwright for e2e/visual, axe for accessibility), covering happy path, edge cases, errors and a11y, then close the feature by moving its spec to Accepted. Also writes regression tests handed over by debug. Use for "test", "write tests", "add coverage".
---

# test

**Language:** test names and code in English.

## Read
`AGENTS.md`, the spec's acceptance criteria, `docs/trd.md` ("Testes e quality gate"), `git diff develop...HEAD`.

## Stack (from the TRD)
- Unit: Vitest in `tests/unit/`, covering `src/lib` and the schemas.
- E2E/visual: Playwright (Chromium + WebKit mobile) in `tests/e2e/`.
- A11y: `@axe-core/playwright`, with zero serious violations per template.
- E2E uses only `tests/fixtures/content`.

If a tool isn't installed, ask before adding it.

## Steps
1. Map each changed behavior to its ACs. Every lasting AC gets at least one test, named after it, e.g. `it('AC2: draft is not listed in rss.xml')`.
2. Cover the happy path, edge cases (timezones in `publishDate`, a post without a cover, `series` without `seriesOrder`), error states, and a11y.
3. Run the suite with coverage. New code must reach ≥ 80%.
4. If a test fails because of a real bug, don't bend the test to pass. Report it and suggest `debug`.
5. Regression tests from `debug` must fail without the fix and pass with it.

## Close
With verify passed and the suite green, set the spec to `Accepted` and the scope row to `Built`. Suggest `commit` (`test:`).
