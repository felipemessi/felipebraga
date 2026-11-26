---
name: sync
description: Near merge, bring AGENTS.md files, docs/scope/ and specs back in line with the code — add new conventions/commands, fix statuses, flag stale specs and unratified Assumed specs. Use for "sync", "before merge", "reconcile docs". Not for creating AGENTS.md from scratch (audit) or rewriting specs (architect).
---

# sync

**Language:** English.

## Read
`git diff develop...HEAD`, all `AGENTS.md` files, `CLAUDE.md`, `docs/scope/`, `docs/specs/`.

## Steps
1. **AGENTS.md:** add or remove lines for new or removed commands, dependencies, folders, env vars and conventions, in the nearest `AGENTS.md`. Keep `CLAUDE.md` as just `@AGENTS.md`.
2. **Scope:** make statuses match the code. Never set `Done`.
3. **Specs:** if an `Accepted` spec no longer matches the code, add `> ⚠️ Possibly stale: <reason>` at the top and suggest `architect`. List `Assumed` specs under the scope's Open items.
4. **PRD/TRD/design:** never edit them. Report any contradictions to the user.

Keep edits small and never rewrite existing prose. Suggest `commit` (`docs:`).
