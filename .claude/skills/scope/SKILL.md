---
name: scope
description: Turn an idea or the PRD into an ordered feature plan in docs/scope/README.md, with delivery style and depth tier. Run with no argument to reconcile the plan with the code. Use for "plan", "what do we build first", "break this into features", "scope". Not for deciding how to build (architect) or building (develop).
---

# scope

**Language:** write everything in English. Only `docs/prd.md`, `docs/trd.md`, `docs/adr/` and blog content (posts, site UI copy) are in Portuguese.

## Read
`AGENTS.md`, `docs/prd.md` (features + "Quando" column, business rules), `docs/trd.md`, `design/AGENTS.md` ("Ordem de trabalho"), existing `docs/scope/`.

## Steps
1. List features from the PRD. Only "Lançamento" goes into milestones; "Depois"/"Futuro" go to Backlog.
2. Order by dependency and the design work order: tokens/fonts/layout shell → article page → home → listing → topic → hire me → 404. Put infra/CI/content schema where they unblock things.
3. Ask the delivery style once (thin thread first · smallest usable thing · look first, wire later · one journey at a time) with a recommendation.
4. Recommend a depth tier (default suggestion: **Beta**, since PRD RN13 requires tests):
   - Prototype: develop
   - Alpha: develop → check verify
   - Beta: develop → check verify → test
   - GA: Beta + check review → document
5. Write `docs/scope/README.md`:

```markdown
# Scope
Delivery style: … · Default depth: …

## Milestone 1 — <name>
| # | Feature | Status | Spec | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | Layout shell (tokens, fonts, Band/Header/Footer) | Planned | — | |

## Backlog
## Open items
```

Statuses: `Planned`, `In Progress`, `Built`, `Done`, `Skipped`. Only the user marks `Done`.

**No argument:** compare the scope with the code, fix statuses with minimal edits, list unratified `Assumed` specs under Open items.

Next step: `audit` (if there is no `AGENTS.md`) or `architect` for the first feature.
