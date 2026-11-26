---
name: architect
description: Make a real decision (feature design, data model, page, or project-wide architecture) and write it as a spec with numbered acceptance criteria and an ordered build plan. Also ratifies Assumed specs and supersedes old ones. Use for "design feature X", "decide X", "write a spec", "architect". Not for building (develop) or ordering features (scope).
---

# architect

**Language:** specs in English. ADRs (`docs/adr/`) follow the Portuguese project docs.

## Read
`AGENTS.md`, `docs/prd.md`, `docs/trd.md`, `design/AGENTS.md`, `design/tokens.css`, the feature's row in `docs/scope/`, existing `docs/specs/` and `docs/adr/`.

The TRD already decides the stack (Astro 6, Sveltia, Cloudflare Workers, D1, Resend, Pagefind, Vitest/Playwright, Sonar). Treat those as constraints and don't reopen them unless asked.

## Steps
1. Check for a similar spec. If there is one, ask whether this is new work, an update, or a replacement.
2. Work out what you can from the docs and code yourself. Ask the user only what only they know. Where a choice comes down to expertise, recommend one option with a reason and name a runner-up. Ask before any web lookup.
3. Write the spec:
   - Feature: `docs/specs/<slug>.md`.
   - Project-wide decision: `docs/adr/NNNN-<slug>.md`, in Portuguese.

```markdown
# <Title>
Status: Proposed
Scope: <row id>

## Requirements
PRD/TRD rules that apply (RN…, RNF…, design rules).

## Acceptance criteria
1. AC1 — <short, verifiable>

## Decision
## Design
Mockups: design/telas/<Screen>.dc.html + <Screen>Mobile.dc.html. Components, data, routes.

## Build plan
1. <task> — AC1

## Alternatives
```

4. Link the spec from the scope row.

## Lifecycle
`Proposed` → `In Progress` → `Accepted`. `develop` and `test` change only the status line.
- To overturn a spec, write a new one and mark the old one `Superseded by <link>`.
- To ratify an `Assumed` spec, either fill in the real reasoning and set it to `Proposed`/`Accepted`, or supersede it.

Don't write code. Next step: `branch` → `develop`.
