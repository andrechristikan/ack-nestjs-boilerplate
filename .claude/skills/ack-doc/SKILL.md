---
name: ack-doc
description: >-
  Checks docs/*.md, README.md, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, and
  .github/** except copilot-instructions.md against the checkout through writer and
  repairs what is stale, final state only. Use when the owner asks to update or verify the
  docs. Not for a PR description (ack-pr), src/ (ack-plan, ack-build), or .claude/**
  (ack-harness).
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: "<named doc files, or 'all'> [what changed recently]"
---

!`git status --short`

# ack-doc

One dispatch to `writer`, the agent that owns reader-facing prose. You do not edit those
trees yourself. Every file produced here is final state only: how the thing works now, with
no history, decision log, "changed on", "applies from", "previously", or rationale for a
change (`.claude/rules/authoring.md`, Final state only).

## 1. Scope

The checkout as it sits on disk, unstaged and untracked files included. The argument names
the files, or `all` for every `docs/*.md`. Every run also includes the root people files
and `.github/**` except `copilot-instructions.md`; name them in the dispatch either way.

| File | Checkable claims |
|---|---|
| `README.md` | version table, prerequisites, Quick Start commands |
| `SECURITY.md` | supported version line against `package.json` `version`, advisory URL, maintainer contact |
| `CONTRIBUTING.md` | `engines` and `packageManager`, setup scripts against `package.json` `scripts`, CoC link |
| `CODE_OF_CONDUCT.md` | maintainer contact aligned with `SECURITY.md`, covenant attribution |
| `.github/workflows/*.yml` | `pnpm` scripts, `engines`, `packageManager` against `package.json` |
| `.github/pull_request_template.md` | `src/modules/*` names, commit types against `.commitlintrc` |
| `.github/ISSUE_TEMPLATE/*` | advisory URL, contributing path, docs path |
| `.github/dependabot.yml` | lockfile ecosystem against `package.json` |

`docs/status-codes.md` is the human catalog; it is updated from the numbers an `/ack-build`
run handed back, not re-derived here.

## 2. Dispatch `writer`

```
Agent: writer
Scope: <the files from step 1>
Context: <what changed recently, when the owner said>
Acceptance: every claim classified ACCURATE, STALE, MISSING, PHANTOM, CONTRADICTS, or
  CONFLICT; the first five repaired in place against the code on disk; CONFLICT left
  unresolved and reported with the evidence for both sides. Final state only. Indicative
  mood, no em-dash, mermaid for a flow, a stack, or a hand-off; keep the page's section
  structure. Run humanizer in file mode on every markdown file touched; YAML is
  repaired for stale facts only.
Rules to read: .claude/rules/authoring.md
Report: findings by class, files changed, every CONFLICT with its evidence, the
  humanizer spans touched.
```

Add the working-tree line and the no-questions line from
`../ack-build/references/dispatch.md`. Git stays read-only.

## 3. Review, through `reviewer`

Dispatch `reviewer` at `Depth: docs` (template `../ack-build/references/dispatch.md`,
Reviewer). Scope: the files `writer` changed. Requirement: every claim matches the code on
disk under `.claude/rules/authoring.md` Documentation prose.

Every finding passes `superpowers:receiving-code-review` here: open the code and the doc,
confirm or reject with a reason. A confirmed STALE or PHANTOM goes back to `writer` in one
repair dispatch, then one scoped re-review. A CONFLICT is not repaired and joins the
owner's list. Rejected findings and what stays open are lines in the hand-back.

## 4. Read what comes back

Every CONFLICT goes to the owner as a list with the evidence for both sides. When the
evidence says the code is wrong (a guard removed by a commit that does not mention it, a
doc newer than the change, a disagreement about authorization, credentials, or session
invalidation), that is a suspected defect for `/ack-plan`, not a doc edit.

## 5. Verify

Invoke `superpowers:verification-before-completion`. The hand-back reports each dispatch
with what it produced, and each CONFLICT with its evidence, not a claim.

## Boundaries

No `src/`, `test/`, `.claude/`, `prisma/`, or `.github/copilot-instructions.md`. No DB or
seed command. Commits go through `ask`; propose the subject only.

## Hand back

Findings by class, files repaired, every CONFLICT unresolved with its evidence, the
humanizer spans touched, every reviewer finding and its state (fixed, rejected with the
reason, open), and one line per thing noticed outside the scope.

## Next

`/ack-plan` for a CONFLICT resolved as the code being wrong. `/ack-pr` once the branch is
settled.
