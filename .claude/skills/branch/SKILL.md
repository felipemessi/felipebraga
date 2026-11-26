---
name: branch
description: Create a work branch following the project's git flow — feature/<slug> from develop, hotfix/<slug> from main — carrying uncommitted changes along. Use for "create a branch", "new branch", "branch", or when commit/develop/debug need to leave main or develop.
---

# branch

Git flow (from `docs/trd.md`): `main` is production, `develop` is integration, `feature/*` branches off `develop`, `hotfix/*` branches off `main`. There are no release branches.

## Steps
1. Check the state:
   ```bash
   git status --short
   git branch --show-current
   git rev-parse --verify HEAD   # fails if the repo has no commits yet
   ```
   - **No commits yet:** don't branch, because it would only rename the empty branch. Propose making the initial commit on `main` first and ask.
   - **Already on `feature/*` or `hotfix/*`:** ask whether a new branch is really needed.
2. **Name:** `<type>/<slug>`, with type `feature` (default) or `hotfix` (urgent production fix). The slug is English, kebab-case, 2–5 words, taken from the active spec or the diff, e.g. `feature/post-page-layout`. Make sure the name doesn't already exist.
3. **Base:** `develop` for `feature`, `main` for `hotfix`. If `develop` doesn't exist, ask whether to create it from `main` (`git branch develop main`).
4. **Create:**
   ```bash
   git switch -c <name> <base>
   ```
   Uncommitted changes come along with the switch. If git refuses because of conflicts, run `git stash push -u`, switch, then `git stash pop`. If the pop conflicts, stop and show the user (the stash is kept).
5. Show the new branch, its base and `git status --short`.

Never force-push, delete branches or reset. Don't push.
