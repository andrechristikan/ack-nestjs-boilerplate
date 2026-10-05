---
name: ack-doc
description: >-
  Checks docs/*.md, README.md, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, and
  .github/** except copilot-instructions.md against the checkout through writer and
  repairs what is stale, final state only. Draws a designed diagram under docs/assets/ when
  the owner asks for one, and reader-tests every page created or section added with a fresh
  agent that sees that file alone. Use when the owner asks to update, verify, or extend the
  docs, or for an architecture diagram. Not for a PR description (ack-pr), src/ (ack-plan,
  ack-build), or .claude/** (ack-harness).
disable-model-invocation: true
argument-hint: "<named doc files, or 'all'> [what changed recently] [diagram: <name and subject>]"
---

!`git status --short`

# ack-doc

One dispatch to `writer`, the agent that owns reader-facing prose, then a reader test of
what it added. You do not edit those trees yourself. Final state only:
`.claude/rules/authoring.md`.

Pass `run_in_background: false` on every Agent call where the tool offers the parameter; where
it does not, a subagent already runs synchronously. Parallel dispatches are several calls in one
message. Either way, end the turn only after every dispatched agent has returned and its
result is read and acted on (`../ack-build/references/dispatch.md`, Foreground dispatch).

## 1. Scope

The checkout as it sits on disk, unstaged and untracked files included. The argument names
the files, or `all` for every `docs/*.md`. Every run also includes the root people files
and `.github/**` except `copilot-instructions.md`; name them in the dispatch either way.

When the argument leaves the files missing or ambiguous, or asks for a diagram without a clear
subject, ask the owner with `AskUserQuestion` before the `writer` dispatch; do not guess.

| File | Checkable claims |
|---|---|
| `README.md` | version table, prerequisites, Quick Start commands |
| `SECURITY.md` | supported version line against `package.json` `version`, advisory URL, maintainer contact |
| `CONTRIBUTING.md` | `engines` and `packageManager`, setup scripts against `package.json` `scripts`, CoC link |
| `CODE_OF_CONDUCT.md` | maintainer contact aligned with `SECURITY.md`, covenant licence attribution |
| `.github/workflows/*.yml` | `pnpm` scripts, `engines`, `packageManager` against `package.json` |
| `.github/pull_request_template.md` | `src/modules/*` names, commit types against `.commitlintrc` |
| `.github/ISSUE_TEMPLATE/*` | advisory URL, contributing path, docs path |
| `.github/dependabot.yml` | lockfile ecosystem against `package.json` |

`docs/status-codes.md` is the human catalog; it is updated from the numbers an `/ack-build`
run handed back, not re-derived here.

The `Diagram:` slot carries the diagram and its subject when the owner asked for a designed
one (an architecture overview, say), and `none` otherwise.

## 2. Dispatch `writer`

```
Agent: writer
Scope: <the files from step 1>
Context: <what changed recently, when the owner said>
Diagram: <name and subject, when the owner asked for one | none>
Acceptance: every claim classified ACCURATE, STALE, MISSING, PHANTOM, CONTRADICTS, or
  CONFLICT; the first five repaired in place against the code on disk; CONFLICT left
  unresolved and reported with the evidence for both sides. Final state only. Indicative
  mood, no em-dash, mermaid for a flow, a stack, or a hand-off, a designed diagram only
  for the Diagram line; keep the page's section structure. Run humanizer in file mode on
  every markdown file touched; YAML is repaired for stale facts only.
Rules to read: .claude/rules/authoring.md
Report: findings by class, files changed, every CONFLICT with its evidence, the
  humanizer spans touched, the reader questions predicted per page created or section
  added, and for a diagram the HTML and SVG paths under docs/assets/ and the drawing plan.
```

Add the Every dispatch block from `../ack-build/references/dispatch.md`. Git stays
read-only.

## 3. Reader test

When `writer`'s report lists a page created or a section added, dispatch one fresh agent
per such file, all in one message. When it lists none, skip this step and say so in the
hand-back.

```
Agent: general-purpose
Read: <the one markdown file> and nothing else: no code, no other doc, no search
Questions: <the reader questions writer predicted for that file>
Task: answer each question from the file alone, citing the line that answers it.
Report: per question, the answer with its line, or "not answered"; every assumption you
  had to make; every passage that reads as ambiguous or contradictory, with its line.
```

## 4. Review, through `reviewer`

Dispatch `reviewer` at `Depth: docs` (template `../ack-build/references/dispatch.md`,
Reviewer). Scope: the markdown files `writer` changed, plus the HTML and SVG under
`docs/assets/` of a diagram it drew. Requirement: every claim matches the code on disk under
`.claude/rules/authoring.md` Documentation prose; for a diagram, every node, label, and
connection exists in the code as drawn, the SVG carries the HTML's labels and connections,
and the embedding page's alt text says what the diagram shows.

Every finding, the reviewer's and the reader test's, passes
`superpowers:receiving-code-review` here: open the code and the doc, confirm or reject with
a reason. Confirmed findings go back to `writer` in one repair dispatch, then one scoped
re-review. A CONFLICT is not repaired here; step 5 puts it to the owner. Rejected findings
and what stays open are lines in the hand-back.

## 5. Resolve each CONFLICT

Put each CONFLICT to the owner with `AskUserQuestion`, the evidence for both sides as the
question context. When the evidence says the code is wrong (a guard removed by a commit
that does not mention it, a doc newer than the change, a disagreement about authorization,
credentials, or session invalidation), say so in the question and recommend the
`/ack-plan` route. Route per the answer:

- The doc is wrong: one repair dispatch to `writer` (step 2 template, Scope the files the
  CONFLICTs name), then one scoped re-review (step 4).
- The code is suspected wrong: record it as a suspected defect for `/ack-plan`; the doc
  stays as it is.

## 6. Verify

Invoke `superpowers:verification-before-completion`. The hand-back reports each dispatch
with what it produced, and each CONFLICT with its evidence, not a claim.

## Boundaries

No `src/`, `test/`, `.claude/`, `prisma/`, or `.github/copilot-instructions.md`. No DB or
seed command. Commits go through `ask`; propose the subject only.

## Hand back

Findings by class, files repaired, every CONFLICT with its evidence, the owner's answer,
and its route, the humanizer spans touched, the diagram paths when one was drawn, the
reader-test result per file (unanswered questions, assumptions, ambiguities) or the line
that the step was skipped, every reviewer and reader-test finding and its state (fixed,
rejected with the reason, open), and one line per thing noticed outside the scope.

## Next

`/ack-plan` for a CONFLICT resolved as the code being wrong. `/ack-pr` once the branch is
settled.
