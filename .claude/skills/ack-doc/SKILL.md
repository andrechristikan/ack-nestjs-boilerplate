---
name: ack-doc
description: >-
  Checks docs/*.md, README.md, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, and
  .github/** except copilot-instructions.md against the checkout through writer and
  repairs what is stale, final state only. Use when the owner asks to update or verify the
  docs. Not for a PR description (ack-pr), src/ (ack-code), or .claude/** (ack-harness).
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

`docs/status-codes.md` is the human catalog; it is updated from the numbers an `/ack-code`
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
  structure. Run avoid-ai-writing in edit mode on every markdown file touched; YAML is
  repaired for stale facts only.
Rules to read: .claude/rules/authoring.md
Report: findings by class, files changed, every CONFLICT with its evidence, the
  avoid-ai-writing spans touched.
```

Add the working-tree line and the no-questions line from
`../ack-code/references/dispatch.md`. Git stays read-only.

## 3. Read what comes back

Every CONFLICT goes to the owner as a list with the evidence for both sides. When the
evidence says the code is wrong (a guard removed by a commit that does not mention it, a
doc newer than the change, a disagreement about authorization, credentials, or session
invalidation), that is a suspected defect for `/ack-code`, not a doc edit.

## Boundaries

No `src/`, `test/`, `.claude/`, `prisma/`, or `.github/copilot-instructions.md`. No DB or
seed command. Commits go through `ask`; propose the subject only.

## Hand back

Findings by class, files repaired, every CONFLICT unresolved with its evidence, the
avoid-ai-writing spans touched, and one line per thing noticed outside the scope.

## Next

`/ack-code` for a CONFLICT resolved as the code being wrong. `/ack-pr` once the branch is
settled.
