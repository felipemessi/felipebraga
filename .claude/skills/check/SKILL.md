---
name: check
description: Confirm a change before merge. Verify mode runs the real app and proves each acceptance criterion and screen against the mockups. Review mode gets a senior review of the diff from a different model and writes findings to docs/reviews/. Never edits code. Use for "check", "verify", "does it work", "review". Not for writing tests (test).
---

# check

**Language:** reports in English.

Ask which mode if it isn't clear. After `develop`, default to **verify**.

## Verify
1. Run `astro check`, lint and `astro build`.
2. Start the app (`astro dev`/`astro preview`, plus `wrangler dev` for Worker routes).
3. Exercise each AC from the spec for real (browser/Playwright or `curl`) and record ✅/❌ with evidence.
4. For UI, compare with the mockups at 390/768/1440, check the rules in `design/AGENTS.md`, and run axe.
5. Always re-check RN2 (drafts never appear on the site, RSS, sitemap or search) when content listing is touched.

Output a table of AC → result → evidence. Failures go back to `develop`/`debug`.

## Review
1. Diff: `git diff develop...HEAD` (or the target the user gives).
2. Delegate to a subagent with a **different model** (`Agent` with `model` override), passing the diff, the spec and `AGENTS.md`.
3. Check each finding against the code yourself and drop any that don't hold.
4. Write `docs/reviews/<YYYY-MM-DD>-<branch>.md` with sections **Blocking / Should fix / Suggestions / What went well**.

Focus on correctness, security (secrets, `PUBLIC_` vars, endpoint validation/rate limit), logic kept out of `.astro`, coverage of new code ≥ 80% (Sonar), and the business and design rules.

Don't change code, spec status or scope.
