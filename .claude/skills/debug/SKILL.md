---
name: debug
description: Find and fix a bug's root cause — reproduce, narrow down, test one hypothesis at a time, apply the smallest fix, confirm — then hand a regression test to the test skill. Use for "bug", "broken", "error", "doesn't work", "build/deploy failed", "debug". Not for new features or unrelated cleanup.
---

# debug

**Language:** English.

No scope or spec needed.

1. **Reproduce first**, from a command, a failing step, or `gh run view --log-failed`. If you can't reproduce it, ask for more data.
2. **Narrow down** where it happens: minimal case, `git bisect`, temporary logs.
3. **One hypothesis at a time.** State it, test it, and move to the next if it's wrong. No random changes.
4. **Smallest fix** that addresses the cause. No refactoring alongside it.
5. **Confirm:** the repro passes and `astro check`, lint and tests stay green. Remove the temporary logs.
6. **Regression:** describe a test that fails without the fix, and hand it to `test`.

Known fragile spots: timezones in `publishDate`/`isPublished`, `SHOW_DRAFTS` leaking into production, non-`PUBLIC_` env vars inlined by Astro, CSP blocking the analytics beacon.

Branching: a production bug gets `hotfix/*` (via `branch`). Commit with `fix:`. If the root cause is a wrong decision in a spec, stop and point to `architect`.
