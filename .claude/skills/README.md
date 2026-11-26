# Agent workflow skills

Skills that take a change in this blog from idea to shipped, tested and documented code. Each stage of the work has its own skill, and every skill keeps its state in files in the repo, not in chat, so work can resume in a fresh session.

## Credits

The workflow is adapted from the **Engineering Workflow Skills** by [JavaScript Mastery](https://github.com/jsmastery-pro). See their [workflow guide](https://github.com/jsmastery-pro/skills/blob/main/docs/workflow-guide.md) in [jsmastery-pro/skills](https://github.com/jsmastery-pro/skills). Thanks to them for the stages, the spec lifecycle and the depth tiers this set builds on.

These skills are a simplified rewrite fitted to this project's [PRD](../../docs/prd.md), [TRD](../../docs/trd.md) and [design handoff](../../design/AGENTS.md). The `branch`, `commit` and `pr` skills are additions that don't come from the original set.

## Skills

| Skill | What it does | Writes to |
| --- | --- | --- |
| `scope` | Turns the PRD into an ordered feature plan, with a delivery style and a depth tier. Run it with no argument to reconcile the plan with the code. | `docs/scope/README.md` |
| `audit` | Writes the context files: stack, commands and conventions. | `AGENTS.md`, nested `AGENTS.md` |
| `architect` | Makes a decision and writes it as a spec with numbered acceptance criteria and a build plan. | `docs/specs/`, `docs/adr/` |
| `develop` | Builds a feature from its spec, the mockups in `design/telas/` and the tokens. | code, spec/scope status |
| `check` | **verify**: runs the app and proves each acceptance criterion. **review**: gets a second opinion from a different model and never edits code. | `docs/reviews/` |
| `test` | Writes Vitest, Playwright and axe tests for the change, then closes the spec as `Accepted`. | `tests/` |
| `document` | Writes the PR description, CHANGELOG entry and release notes from the real commits. | `CHANGELOG.md`, PR |
| `sync` | Before merge, brings `AGENTS.md`, the scope and the specs back in line with the code. | context files |
| `debug` | Finds the root cause, applies the smallest fix and hands a regression test to `test`. | code |
| `branch` | Creates `feature/<slug>` from `develop` or `hotfix/<slug>` from `main`. | git |
| `commit` | Commits in English with Conventional Commits. On `main` or `develop` it runs `branch` first. Never adds co-author or tool attribution. | git |
| `pr` | Pushes the branch and opens or updates its GitHub PR with `gh` (`feature/*` → `develop`, `hotfix/*` and releases → `main`), using the `document` description. No attribution. | GitHub PR |

## Typical flow

```text
scope → audit → architect → branch → develop → check (verify) → test → check (review) → document → sync → commit → pr
```

Run only the stages a change needs. A bug is just `debug`. The depth tier chosen in `scope` suggests where a feature ends:

| Tier | Stages after `develop` |
| --- | --- |
| Prototype | none |
| Alpha | `check` verify |
| Beta | `check` verify → `test` |
| GA | `check` verify → `test` → `check` review → `document` |

Only the user marks a feature `Done`.

## Spec lifecycle

`Proposed` → `In Progress` → `Accepted`. An overturned spec is marked `Superseded`. If `develop` builds a load-bearing choice that was never decided, it records an `Assumed` spec, which `architect` later ratifies or supersedes.

## Conventions

- **Language:** English everywhere, including skills, commits, branches, scope, specs, `AGENTS.md`, reviews, code and tests. The exceptions are `docs/prd.md`, `docs/trd.md`, `docs/adr/` and the blog content (posts and site UI copy), which are in Portuguese.
- **Sources of truth:** the PRD and TRD are the main sources of truth (the stack is Astro 7). `design/` is the visual reference and defers to them on any conflict.
- **Git flow:** `main` is production, `develop` is integration, `feature/*` branches off `develop`, `hotfix/*` branches off `main`.
