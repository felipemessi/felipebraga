---
name: develop
description: Build a feature (UI, backend or both) from its spec in docs/specs/, following the build plan, the design mockups and tokens. Updates spec/scope status and resumes where it left off. Use for "implement", "build", "develop", "continue feature X". Not for bugs (debug) or undecided choices (architect).
---

# develop

**Language:** code, comments, identifiers, tests and workflow docs in English. Site UI copy and posts in Portuguese (RN5).

## Read
`AGENTS.md`. The spec: Requirements, Acceptance criteria, Decision, Design and Build plan. The scope row. For UI, also `design/AGENTS.md`, `design/tokens.css` and the matching `design/telas/*.dc.html` (desktop and Mobile).

## Before coding
- On `main` or `develop`? Run the `branch` skill first.
- Would building require inventing a load-bearing choice that isn't decided? Stop and offer:
  1. Decide in `architect` (recommended).
  2. Build now and record it in `docs/specs/<slug>.md` with `Status: Assumed`, noting the assumption, who approved it, and the code it touches. This is the only spec `develop` may create.
- To resume, start at the first unchecked build-plan task.

## Building
- Follow the build plan in order, one task at a time.
- **Stack is the TRD's (Astro 6, native CSS custom properties, no UI framework)**, even though `design/AGENTS.md` says Next.js. Map its suggested structure to `src/pages`, `src/layouts`, `src/components`.
- Mockups are a spec for layout, spacing, color and copy. Don't copy their HTML.
- Design rules that must not break: full-width `data-tone` bands; the header takes the opening band's color; text is always `--text`; no gradients or shadows; category → color mapping; hire CTAs only on `/me-contrate`; footer stuck to the bottom with `2rem` below it; no city mentioned; WCAG AA, visible focus, touch targets ≥ 44px.
- Logic goes in `.ts` (`src/lib`). `.astro` holds markup only. Zero JS by default.
- Backend work: schema/migration first and actually applied, then logic, then endpoints (validation, rate limit, Turnstile), then secrets from env only (`PUBLIC_` for the site).
- Missing images: ask the user. Never invent paths.
- If the spec turns out wrong, stop and go back to `architect`.

## Done with a step
- Run `astro check`, lint and the existing tests. For UI, render at 390/768/1440 and fix visual defects.
- Spec status `Proposed` → `In Progress`. Tick build-plan tasks. Set the scope row to `In Progress`, or `Built` when finished. Never set `Done`.
- Offer to save manual verification steps, derived from the ACs, to `verify.md` next to the spec.
- Suggest `commit`, then the next stage for the depth tier (usually `check`).

Don't edit `docs/prd.md`, `docs/trd.md` or `design/`.
