---
name: doc-drift
description: Check and repair project documentation in docs/*.md against the code on the CURRENT checkout in ack-nestjs-boilerplate — claim-by-claim drift (STALE / PHANTOM / MISSING applied; CONFLICT reported only). Use when the owner asks to check docs drift, verify docs after a refactor, update a named docs/*.md file, or "use doc-drift" (any language). First compares the current branch tip to origin/<branch>; when commits match, execute immediately. When fetch/pull lacks permission or fails, or when ahead/behind is non-zero: ASK the owner for permission to continue — never reject. HARD: docs vs code on this checkout only — NEVER drift between branches (not a main/develop/origin compare). Dispatches `doc-writer` only. Owner-triggered only — never invoked by `coding`, `migration-seed`, `spec-coverage`, `pr-doc`, gate skills, or any agent. NOT for feature code, tests, or PR descriptions (`pr-doc` → `pr-doc-writer`).
---

# Doc drift — keep docs/*.md true on the current checkout

One job: find every claim in `docs/*.md` the code on **this checkout** no longer supports, and repair it. Craft (classification, CONFLICT discipline, repair style) lives in the `doc-writer` agent. This skill holds the ORDER and the trap at each step.

## Not inter-branch drift (HARD)

**This skill never compares branches.** It is not `pr-doc`. It does not diff `main` / `develop` / `origin/*` against each other, and it does not ask which base branch to use.

Subject = **docs vs code as they sit on the current checkout** (current branch + working tree). Origin is checked only as a sync gate for the current branch tip — never as a second documentation universe.

## Owner-triggered only (HARD)

**This skill is never opened by another skill or by any agent.**

- **`coding`, `migration-seed`, `spec-coverage`, `pr-doc`, `anti-pattern-gate`, `repository-pattern-gate`, and every other skill do NOT invoke this skill.**
- **No AGENT invokes this skill or dispatches `doc-writer`.** Agents that notice stale docs name them in their hand-back; the owner runs this skill when they want the repair.
- If you find yourself mid-`coding` (or any other skill) about to open docs work, stop and tell the owner to run `doc-drift` separately.

## Out of this skill (HARD)

- **Do not dispatch any agent except `doc-writer`.**
- **Do not edit `src/`.** A code defect that surfaces as CONFLICT is reported to the owner — not fixed here.
- **Do not write tests** and do not stage or commit (`rules/git.md`).
- **Do not write PR documents** (`pr-doc` → `pr-doc-writer`).
- **Do not invent a parallel docs tree.** Only `docs/*.md` (plus root `README.md` / `CONTRIBUTING.md` / `SECURITY.md` when they claim code). Never `.superpowers/`, `generated/docs/`, or `.claude/`.
- **Do not treat origin / another branch as the documentation subject.** No `git diff main...HEAD` for doc claims; read the files on disk.

## The scope block (HARD)

**Compute it ONCE, after step 0 settles, and paste it verbatim into the dispatch.** An agent given a vague scope will sweep all of `docs/` — that costs budget the owner did not authorise unless they asked for a full sweep.

```
SCOPE (do not go outside this)
  feature:        <kebab-case slug or "docs-sweep">
  branch:         <current branch name>
  origin sync:    <match | ahead N | behind N | diverged | no-upstream | fetch-failed>
  docs:           <explicit docs/*.md paths, or "all top-level docs/*.md">
  code surface:   <module / path hints that motivated the run, or "whole tree on this checkout">
  inputs:         <generated/docs/report-coder-* paths to read, or "none">
  out of scope:   src/ edits, tests, commits, PR documents, other skills, any inter-branch compare
```

- **`docs`** — if the owner named files, list only those. If they asked for a full drift check with no file list, set `all top-level docs/*.md`.
- **`inputs`** — include existing `generated/docs/report-coder-<feature>.md` (and siblings) when the owner named a feature that has them; `doc-writer` treats those as INPUT, not subjects.
- **`origin sync`** — from step 0a. Informational; never widens scope to another branch.

---

## The flow

### 0. Origin gate + scope — BEFORE any dispatch (HARD)

This step runs in the main session. It cannot be delegated.

**0a. Current branch vs its own origin (sync gate only).**

```bash
CURRENT=$(git branch --show-current)
git status -sb
git fetch origin "$CURRENT"   # refresh origin/<CURRENT>
git rev-list --count origin/"$CURRENT"..HEAD   # ahead
git rev-list --count HEAD..origin/"$CURRENT"   # behind
```

- **ahead = 0 and behind = 0** (commits match `origin/<CURRENT>`) → **execute immediately.** Proceed to 0b / dispatch. Uncommitted working-tree changes do not block — the subject is still this checkout.
- **ahead > 0 or behind > 0 or no upstream** → **ASK the owner for permission to continue**, naming the counts (and whether the tree is dirty). Do **not** reject. Wait for an explicit go-ahead, then verify docs vs code on **this** checkout.
- **Fetch / pull failed** (no network permission, auth, DNS, missing remote, sandbox deny, or any other fetch error) → **ASK the owner for permission to run `doc-drift` anyway** on this checkout, naming why fetch failed. Do **not** reject. If they approve, proceed with `origin sync: fetch-failed` (use the last-known local `origin/<CURRENT>` only as info, or `unknown` if that ref is missing). Never invent a second branch as the subject.

**Never reject this gate.** Every blocked path is an ask for permission, then continue on this checkout when the owner says yes. Still never switch the subject to another branch.

This gate is not a merge-base. It only answers: is the current branch tip in sync with its remote tracking ref?

**0b. Clarify scope (skip questions the owner already answered).**

1. **Which docs?** Named file(s), a feature's related docs, or a full `docs/` sweep. No file list and a general "run doc-drift" → full top-level `docs/*.md`. When the owner named a feature but not files, prefer **`graphify query "<question>"`** to list related `docs/*.md` before assuming the whole tree (`rules/orientation.md`).
2. **What changed?** Optional code surface / feature name so the agent prioritizes the right claims on this checkout.
3. **Coder reports?** If `generated/docs/report-coder-*` exists for that feature, note the path(s) in SCOPE `inputs`.

Build the SCOPE block.

### 1. Dispatch — `doc-writer`

One dispatch. Paste the SCOPE block verbatim.

Tell it explicitly:

- Subject is **this checkout only** — docs vs code on disk. Not an inter-branch drift.
- Apply STALE / PHANTOM / MISSING in place. CONFLICT stays reported only.
- Read SCOPE `inputs` report files when present (especially coder block claims / stale-doc notes).
- Write CONFLICT findings to `generated/docs/report-doc-writer-<feature>.md`.
- Do not edit `src/`. Do not commit or stage. Do not invoke any other skill. Do not diff against `main` / `develop` / `origin/*` for claims.
- Do **not** re-run the origin gate and do **not** refuse work because `origin sync` is `fetch-failed` / ahead / behind — that gate (ask permission, never reject) already ran in the skill.

Do **not** restate classification rules or style in the dispatch — the agent already carries them.

### 2. Hand back to the owner

Surface:

- origin sync result from 0a,
- docs repaired (paths),
- CONFLICT list (and path of `generated/docs/report-doc-writer-<feature>.md` if any),
- anything left undecided (rewrite-needed docs, suspected code defects).

Stop there. CONFLICT rulings are the owner's.

---

## Commands

```bash
CURRENT=$(git branch --show-current)
git status -sb
git fetch origin "$CURRENT"
git rev-list --count origin/"$CURRENT"..HEAD
git rev-list --count HEAD..origin/"$CURRENT"

graphify query "Which docs/*.md cover <feature or topic>?"
find docs -name '*.md'
ls generated/docs/report-coder-* 2>/dev/null
ls generated/docs/report-doc-writer-* 2>/dev/null
```
