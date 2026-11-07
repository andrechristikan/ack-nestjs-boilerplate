---
name: ack-doc
description: >-
    Checks docs/*.md, the decision records in docs/decisions/, README.md, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, and .github/** except copilot-instructions.md against the checkout through writer and repairs what is stale, final state only. Use when the owner asks to update, verify, or extend the docs, or for an architecture diagram. Not for a PR description or version notes (ack-pr), src/ (ack-work), or .claude/** (ack-harness).
blurb: 'docs, decision records, root people files, .github against the code'
disable-model-invocation: true
argument-hint: "<named doc files, a .superpowers/plans/ path, or 'all'> [what changed recently] [diagram: <name and subject>]"
---

!`git status --short` !`git diff --name-only HEAD`

# ack-doc

You orchestrate one dispatch to `writer`, the agent that owns reader-facing prose, then a reader test of what it added. This skill runs in the session so the owner settles a scope question and each CONFLICT. You do not edit those trees yourself. Final state only: `.claude/rules/authoring.md`. Every dispatch carries the block in `.claude/skills/ack-work/references/dispatch.md`, Every dispatch, and runs as its Foreground dispatch section gives; both bind. If a `superpowers:*` skill is not installed, stop and say `claude plugin install superpowers@claude-plugins-official`.

## 1. Scope

The checkout as it sits on disk, unstaged and untracked files included. The argument names the files, a `.superpowers/plans/` path whose `**Files:**` are the scope, or `all` for every `docs/*.md` and `docs/decisions/*.md`. Every run also includes the root people files and `.github/**` except `copilot-instructions.md`; name them in the dispatch either way.

When the argument leaves the files missing or ambiguous, or asks for a diagram without a clear subject, ask the owner with `AskUserQuestion` before the `writer` dispatch; do not guess.

| File | Checkable claims |
| --- | --- |
| `docs/decisions/*.md` | the shape in `.claude/rules/authoring.md`, Decision records; one index line in `docs/decisions/README.md` per record, matching its title, chosen option, and rejected options; each `superseded by NNNN` names a record that exists |
| `README.md` | version table, prerequisites, Quick Start commands |
| `SECURITY.md` | supported version line against `package.json` `version`, advisory URL, maintainer contact |
| `CONTRIBUTING.md` | `engines` and `packageManager`, setup scripts against `package.json` `scripts`, CoC link |
| `CODE_OF_CONDUCT.md` | maintainer contact aligned with `SECURITY.md`, covenant licence attribution |
| `.github/workflows/*.yml` | `pnpm` scripts, `engines`, `packageManager` against `package.json` |
| `.github/pull_request_template.md` | `src/modules/*` names, commit types against `.commitlintrc` |
| `.github/ISSUE_TEMPLATE/*` | advisory URL, contributing path, docs path |
| `.github/dependabot.yml` | lockfile ecosystem against `package.json` |

A claim in `docs/decisions/**` is classified against the source the dispatch names for the record (a design section, a rule, a commit), not the code on disk: a record states a decision about the target shape.

`docs/status-codes.md` is the human catalog; it is updated from the numbers an `ack-work` build handed back, not re-derived here.

The `Diagram:` slot carries the diagram and its subject when the owner asked for a designed one (an architecture overview, say), and `none` otherwise.

## 2. Dispatch `writer`

```
Agent: writer
Scope: <the files from step 1>
Context: <what changed recently, when the owner said>
Diagram: <name and subject, when the owner asked for one | none>
Acceptance: every claim classified ACCURATE, STALE, MISSING, PHANTOM, CONTRADICTS, or
  CONFLICT; the first five repaired in place against the code on disk, or for a record in
  `docs/decisions/` the source the dispatch names; CONFLICT left unresolved and reported
  with the evidence for both sides. Final state only. Indicative for a fact or an
  obligation, imperative for a procedure step; one idea per paragraph; an
  entry with several separate facts is a list, one fact per item, numbered when order
  matters. A flow, a stack, or a hand-off is a mermaid diagram; a designed diagram only for
  the Diagram line; no em-dash; keep the page's section structure. Run humanizer in file
  mode on every markdown file touched; YAML is repaired for stale facts only.
Rules to read: <the output of bash .claude/hooks/rules.sh over the paths in Scope, pasted>
Report: findings by class (shape: .claude/skills/ack-doc/references/example-writer-report.md), files changed, every CONFLICT with its evidence, the
  humanizer spans touched, the reader questions predicted per page created or section
  added, and for a diagram the HTML and SVG paths under docs/assets/ and the drawing plan.
```

Add the Every dispatch block from `../ack-work/references/dispatch.md`. Git stays read-only. `writer`'s classified report is the evidence for every file it checked.

## 3. Reader test

When `writer`'s report lists a page created or a section added, dispatch one fresh agent per such file, all in one message. When it lists none, skip this step and say so in the hand-back.

```
Agent: general-purpose
Read: <the one markdown file> and nothing else: no code, no other doc, no search
Questions: <the reader questions writer predicted for that file>
Task: answer each question from the file alone, citing the line that answers it.
Report: per question, the answer with its line, or "not answered"; every assumption you
  had to make; every passage that reads as ambiguous or contradictory, with its line.
```

Open the doc and the code behind each unanswered question, assumption, and ambiguity, and confirm or reject it with a reason. Confirmed findings go back to `writer` in one repair dispatch (step 2 template, Scope the files they name).

## 4. Resolve each CONFLICT

Put each CONFLICT to the owner with `AskUserQuestion`, the evidence for both sides as the question context. When the evidence says the code is wrong (a guard removed by a commit that does not mention it, a doc newer than the change, a disagreement about authorization, credentials, or session invalidation), say so in the question and recommend the `/ack-work` route. Route per the answer:

- The doc is wrong: one repair dispatch to `writer` (step 2 template, Scope the files the CONFLICTs name).
- The code is suspected wrong: record it as a suspected defect for `/ack-work`; the doc stays as it is.

## 5. Verify

Invoke `superpowers:verification-before-completion`. The hand-back reports each dispatch with what it produced, and each CONFLICT with its evidence, not a claim.

## Boundaries

No `src/`, `test/`, `.claude/`, `prisma/`, or `.github/copilot-instructions.md`. No DB or seed command. Commits go through `ask`; propose the subject only.

## Hand back

Findings by class, files repaired, every CONFLICT with its evidence, the owner's answer, and its route, the humanizer spans touched, the diagram paths when one was drawn, the reader-test result per file (unanswered questions, assumptions, ambiguities) or the line that the step was skipped, every reader-test finding and its state (fixed, rejected with the reason, open), and one line per thing noticed outside the scope.

## Next

`/ack-work` for a CONFLICT resolved as the code being wrong. `/ack-pr` once the branch is settled.
