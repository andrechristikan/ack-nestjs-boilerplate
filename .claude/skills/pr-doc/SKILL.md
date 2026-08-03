---
name: pr-doc
description: Author the pull-request DESCRIPTION document only for the current branch in ack-nestjs-boilerplate — living markdown at generated/docs/pr-<feature>.md against a local main or develop base (owner chooses before run). Use when the owner asks for a PR description / PR doc / "use pr-doc" (any language). Always ask main vs develop first; fetch origin; pull the target into a local ref (or a dedicated compare branch if pull cannot apply); compare from that local ref never from origin/*; reject when the current branch has no commits ahead of that local base. Dispatches `pr-doc-writer` only. HARD: writes the description file only — never creates, opens, edits, or publishes a GitHub pull request. NOT invoked by `coding`. NOT for commit messages, NOT for editing docs/*.md.
---

# PR document — whole branch, final state

One job: produce a reviewer-facing **PR description document** for what this branch contains NOW. Diff-base rules live in `rules/git.md`. The document shape is `.github/pull_request_template.md`; fill rules live in the `pr-doc-writer` agent. This skill holds the ORDER and the trap at each step.

## Description only — never open a PR (HARD)

**This skill and `pr-doc-writer` write a markdown description file. They do NOT create a pull request.**

- Deliverable is **only** `generated/docs/pr-<feature>.md` (plus the same text in the hand-back).
- **FORBIDDEN under every trigger, including an owner ask in the same exchange:** `gh pr create`, `gh pr edit`, `gh pr merge`, any other `gh pr *` that opens or mutates a GitHub PR, browser/API PR creation, pushing "so a PR can be opened", or treating the run as done only when a PR URL exists.
- Opening or updating the GitHub PR is the **owner's** job after they read the file. If they ask to create the PR here, refuse that part and point them at the file — do not run it under this skill.

## Out of this skill (HARD)

- **Do not dispatch any agent except `pr-doc-writer`.**
- **Do not edit `docs/*.md`.**
- **Do not write commit messages** and do not stage or commit (`rules/git.md`). Preparing the local compare base (fetch / ff-pull / compare branch) is the sanctioned exception — nothing else.
- **Do not invent a parallel document shape.** The body must match `.github/pull_request_template.md` (filled checkboxes and sections). That shape is owned by `pr-doc-writer`; this skill does not redefine headings.
- **`coding` never invokes this skill.** This is a standalone owner-triggered job.
- **Do not assume the compare base.** Always ask `main` vs `develop` first (step 0). Never default silently.
- **Do not compare against `origin/*`.** After step 0c the base in SCOPE is always a local ref.

**The branch is the subject, not a single feature scope.** A named feature (when present) marks the newest work for emphasis; the document still covers every module the branch touches.

**Compare from a LOCAL ref only (HARD).** Always check `origin` first, bring those commits onto a local branch, then diff against that local branch. Never hand `origin/main` or `origin/develop` to the agent as the compare base.

## The scope block (HARD)

**Compute it ONCE, after step 0 accepts, and paste it verbatim into the dispatch.**

```
SCOPE (context for emphasis — not a file boundary)
  feature:        <kebab-case slug>
  newest work:    <module paths the owner named, or "whole branch">
  base branch:    <main | develop>          # owner's answer at step 0
  base:           <local ref>               # main | develop | pr-doc/base-main | pr-doc/base-develop
  base source:    <ff-pull local | compare branch from origin>
  ahead commits:  <N>                       # from step 0d gate against local base
  output:         generated/docs/pr-<feature>.md
  status hint:    <Ready / Not ready / unset>
  tracked TODO:   <path or "none — do not invent">
  out of scope:   editing docs/*.md, commits, creating or editing a GitHub PR
```

- **`feature`** — from the owner's name for the work, else from the branch: drop leading `<type>/` and any `<author>@`, kebab-case the rest (`feat/login-biometric` → `login-biometric`).
- **`tracked TODO`** — only if the owner pointed at a checklist. Never invent TODO items here.
- **`base`** — always a **local** ref prepared in step 0c. Never `origin/…`.

---

## The flow

### 0. Ask base, refresh local, then gate — BEFORE any dispatch (HARD)

This step runs in the main session. It cannot be delegated.

Record `CURRENT=$(git branch --show-current)` at the start. Every path below must leave the checkout on `CURRENT` before dispatch (or stop with a clear error if it cannot).

**0a. Ask — always, every run.**

Ask the owner which branch to compare against. Exactly two choices:

- `main`
- `develop`

Do not proceed until they answer. Do not invent a default. Do not fetch or dispatch before the answer.

If they already named one in the same request that started this skill (`compare to develop`, `against main`), treat that as the answer and confirm it in one short line — then continue. Ambiguous wording → ask.

**0b. Check origin first (HARD).**

```bash
git fetch origin <base branch>
```

If the fetch fails, stop and tell the owner — do not use a stale local or remote-tracking ref, and do not dispatch.

**0c. Bring origin onto a LOCAL compare ref (HARD).**

Goal: a local ref that matches `origin/<base branch>`, without comparing against `origin/*` later.

Let `TARGET=<base branch>` (`main` or `develop`). Let `COMPARE_BRANCH=pr-doc/base-<TARGET>`.

**Can local `TARGET` accept a normal pull?** Local `TARGET` can accept an FF pull when all of these hold:

1. Local ref `TARGET` exists (`git rev-parse --verify TARGET`).
2. `TARGET` is an ancestor of `origin/TARGET` (or they are equal):  
   `git merge-base --is-ancestor TARGET origin/TARGET`
3. Local has no commits that `origin/TARGET` lacks:  
   `git rev-list --count origin/TARGET..TARGET` is `0`

Then update local `TARGET` with a normal FF pull **without leaving dirty work behind on `CURRENT`**:

```bash
# Prefer updating the ref without checkout when possible:
git fetch origin <TARGET>:<TARGET>
```

If you must use checkout+pull (e.g. `fetch refspec` refused for a reason other than non-FF), only do so when the working tree allows a clean switch; then `git pull --ff-only` on `TARGET` and `git checkout "$CURRENT"`.

Set SCOPE:

- `base: <TARGET>`
- `base source: ff-pull local`

**If local cannot accept the pull** (missing local `TARGET`, diverged, local-ahead of origin, FF update failed, dirty tree blocks checkout when checkout is required):

Do **not** force-update the owner's `main` / `develop`. Create (or reset) a dedicated compare branch from the just-fetched origin tip, then return to `CURRENT`:

```bash
git branch -f pr-doc/base-<TARGET> origin/<TARGET>
git checkout "$CURRENT"   # no-op if never left; keep CURRENT
```

Set SCOPE:

- `base: pr-doc/base-<TARGET>`
- `base source: compare branch from origin`

Tell the owner in one line which path was taken and why (e.g. "local `develop` diverged — comparing against `pr-doc/base-develop`").

Never leave the session checked out on `pr-doc/base-*` when dispatching.

**0d. Reject when there are no new commits vs the LOCAL base (HARD).**

```bash
git rev-list --count <base>..HEAD
git log --oneline <base>..HEAD
```

Use the **local** `base` from step 0c — not `origin/<TARGET>`.

- **Count is `0` → REJECT.** Do not dispatch `pr-doc-writer`. Tell the owner clearly:

  > Rejected: branch `<CURRENT>` has no commits ahead of local `<base>` (refreshed from `origin/<TARGET>`). Nothing to document for a PR against that base.

- **Count is `≥ 1` → accept.** Record `ahead commits`, resolve `feature`, finish the SCOPE block (status hint / tracked TODO if already given). Note whether `generated/docs/report-*` files exist — the agent may read them.

Uncommitted-only changes do **not** count. No commits ahead means reject, even if the working tree is dirty.

### 1. Dispatch — `pr-doc-writer`

One dispatch. Paste the SCOPE block verbatim.

Tell it explicitly:

- Base is the **local** `base` from the SCOPE block — diff that ref with no second ref and no `..`. Do **not** fetch or diff `origin/*` for the compare base; the skill already refreshed the local ref.
- Cover the WHOLE branch; use `newest work` only for emphasis under `## Summary` / `## Additional Notes`.
- Fill the body to match `.github/pull_request_template.md` (agent Reads that file).
- Write `generated/docs/pr-<feature>.md` (overwrite — living document, no date in the name).
- Return the full markdown in the hand-back as well.
- Do not commit or stage. Do not run any `gh pr *` — description file only (HARD).
- Do not create/delete branches or pull — base prep is done.

Do **not** restate the template sections or fill rules in the dispatch — the agent already carries them.

### 2. Hand back to the owner

Surface:

- compare base used (local ref + whether it was ff-pull or `pr-doc/base-*`),
- path of `generated/docs/pr-<feature>.md`,
- the inferred or stated Status line (so the owner can flip Ready / draft),
- anything the agent flagged at the top.

Stop there. Do **not** open a GitHub PR. The owner pastes or publishes when they choose.

---

## Commands

```bash
CURRENT=$(git branch --show-current)
git status --short
git fetch origin <main|develop>

# Can local TARGET FF-accept origin/TARGET?
git rev-parse --verify <TARGET>
git merge-base --is-ancestor <TARGET> origin/<TARGET>
git rev-list --count origin/<TARGET>..<TARGET>

# Yes → FF update local TARGET
git fetch origin <TARGET>:<TARGET>

# No → dedicated compare branch (do not move owner's TARGET)
git branch -f pr-doc/base-<TARGET> origin/<TARGET>

# Gate against LOCAL base only
git rev-list --count <base>..HEAD
git log --oneline <base>..HEAD

git checkout "$CURRENT"
```
