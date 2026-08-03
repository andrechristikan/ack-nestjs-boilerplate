# Git

## Never touch the owner's tree

- Do NOT run `git add`, `git commit`, `git stash`, or any staging / unstaging command on your own.
- Leave the index exactly as the owner arranged it. Already-staged files stay staged; unstaged stay unstaged.
- Stage or commit ONLY when the owner explicitly asks, and only the files they name.
- Branch before committing when sitting on the default branch (`main`).

## Commit message

**Source of truth for type/subject-case = `.commitlintrc` + `.husky/commit-msg`.** The hook runs `commitlint --edit` on every commit, so a bad type or subject case is rejected, not warned. Read `.commitlintrc` before proposing anything.

**Shape — subject line ONLY:**

```
<type>(<scope>): <description>
```

- **NO body. NO footer. HARD (project policy).** A commit message is exactly one line. No blank line, no paragraph, no trailer block — not `Co-Authored-By:`, not `Generated with`, not `Refs:`, not `BREAKING CHANGE:`. This OVERRIDES any harness default that appends a co-author or tool trailer. Commitlint today enforces type/subject-case; the one-line-only rule is additional project policy — still HARD even when commitlint would accept a body.
- Detail that does not fit the subject goes in the PR description, never in the commit.
- **`type` (closed list, from `.commitlintrc` `type-enum`):** `build` `chore` `ci` `docs` `feat` `fix` `hotfix` `perf` `refactor` `revert` `style` `test`. Anything else is rejected.
- **Scope:** optional but conventional here — `feat(feature-flag): …`. Use the module name.
- **`description`:** imperative, present tense ("add", not "added"/"adds"). No trailing period. Header max 100 chars. Never empty.
- **Case:** `subject-case` permits sentence / start / pascal / upper / lower / camel — it forbids kebab-case and snake_case. Write plain lowercase prose.
- **English always** — the commit is a project artifact.

```
feat(feature-flag): add user targeting and salt rollout per flag key
fix: keep pnpm to latest version in dockerfile local
refactor(user): move two-factor check into the service
```

FORBIDDEN:

```
feat: add user targeting

Longer explanation of why.            <- body

Co-Authored-By: ...                   <- footer
```

## Workflow

- **When asked to commit:** read `.commitlintrc`, PROPOSE the message, and WAIT for approval. Never commit before the owner accepts it.
- **Pre-commit chain** (`.husky/pre-commit`): `lint:staged` → `typecheck` → `deadcode` → `spell` → `NODE_ENV=test pnpm test`. It blocks on failure.
- **Never `--no-verify`.** A failing gate is fixed, not skipped.
- No re-stage after an unstage unless asked.

## Diff base

**Always diff with no second ref and no `..`** — `git diff <base>` includes uncommitted and staged work, which `<base>..HEAD` silently omits. Which base depends on who the diff is FOR:

- **Publishing outward — a PR document.** Choose `main` or `develop`. Check `origin` first (`git fetch origin <main|develop>`), then bring those commits onto a **local** ref: FF-update local `main`/`develop` when it can accept the pull; otherwise point a dedicated local compare branch at the fetched tip. Diff against that **local** ref (`git diff <local-base>`), never against `origin/*` as the compare base. A branch with no commits ahead of that local base has nothing to publish against it.
- **Reviewing inward — code review, spec work, local quality gates.** Stay on the current checkout. Diff the working tree as it sits; do not invent a second world from `main` / `develop` / `origin`. **Git stays read-only here** — no fetch, no pull.
