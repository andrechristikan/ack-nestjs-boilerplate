---
name: ack-doc
description: >-
    Checks docs/*.md, README.md, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, and .github/** except copilot-instructions.md against the checkout through writer and repairs what is stale; the code on disk wins. Use when the owner asks to update, verify, or extend the docs, or for an architecture diagram. Not for a PR description (ack-pr), src/ (ack-design), or .claude/**, decision entries, and docs/ai-harness.md (ack-harness).
blurb: 'docs, root people files, .github against the code; the code wins'
disable-model-invocation: true
argument-hint: "<named doc files, a .scratch/ plan or requirement path, or 'all'> [what changed recently] [diagram: <name and subject>]"
---

!`git status --short` !`git diff --name-only HEAD`

# ack-doc

Input: $ARGUMENTS

The session assigns one `writer` dispatch, then a reader test of what it added. The owner settles a scope question and each CONFLICT. The session edits no doc itself. The code on disk wins over a doc. Final state only: `.claude/rules/authoring.md`.

## 1. Scope

- The argument names the files, a `.scratch/<feature>/plan.md` whose build's changed modules are the scope, a `.scratch/requirements/doc-<slug>.md` naming its own scope, or `all` for every `docs/*.md`.
- Every run also covers the root people files and `.github/**` except `copilot-instructions.md`.
- `docs/ai-harness.md` belongs to `/ack-harness` and is never in scope.
- Each `docs/*.md` page and root people file in scope takes a type (`.claude/rules/authoring.md`, Page types): an existing page the type it holds. A page being created, or one holding two types, is a question to the owner with `AskUserQuestion` before the dispatch.
- A missing or ambiguous file list, or a diagram without a clear subject, is a question to the owner with `AskUserQuestion` before the dispatch.

| File | Checkable claims |
| --- | --- |
| `README.md` | version table, prerequisites, Quick Start commands |
| `SECURITY.md` | supported version line against `package.json` `version`, advisory URL, maintainer contact |
| `CONTRIBUTING.md` | `engines` and `packageManager`, setup scripts against `package.json` `scripts`, CoC link |
| `CODE_OF_CONDUCT.md` | maintainer contact aligned with `SECURITY.md`, covenant license attribution |
| `.github/workflows/*.yml` | `pnpm` scripts, `engines`, `packageManager` against `package.json` |
| `.github/pull_request_template.md` | `src/modules/*` names, commit types against `.commitlintrc` |
| `.github/ISSUE_TEMPLATE/*` | advisory URL, contributing path, docs path |
| `.github/dependabot.yml` | lockfile ecosystem against `package.json` |

## 2. Dispatch `writer`

```
Agent: writer
Scope: <the files from step 1>
Type: <file>: <tutorial | how-to | reference | explanation>, one line per page step 1 typed
Context: <what changed recently, when the owner said>
Diagram: <name and subject, when the owner asked for one | none>
Acceptance: every claim classified and handled as .claude/agents/writer.md gives. Final state only.
Report: as .claude/agents/writer.md, Finish and hand back, gives
  (shape: .claude/skills/ack-doc/references/example-writer-report.md).
```

## 3. Reader test

When the report lists a page created or a section added, dispatch one fresh agent per such file, all in one message. When it lists none, skip this step and say so in the hand-back.

```
Agent: general-purpose
Read: <the one markdown file> and nothing else: no code, no other doc, no search
Questions: <first, the check for the page's type from .claude/skills/documentation/SKILL.md, Step 4;
  then the reader questions writer predicted for that file>
Task: answer each question from the file alone, citing the line that answers it.
Report: per question, the answer with its line, or "not answered"; every assumption you
  had to make; every passage that reads as ambiguous or contradictory, with its line.
```

- Open the doc and the code behind each unanswered question, assumption, and ambiguity. Confirm it or reject it with a reason.
- Confirmed findings go back to `writer` in one repair dispatch.

## 4. Resolve each CONFLICT

- Put each one to the owner with `AskUserQuestion`, the evidence for both sides as the context.
- The doc is wrong: one repair dispatch to `writer`.
- The code is suspected wrong: the doc stays as it is; name `/ack-debug` with the symptom.

## Hand back

- Findings by class and the files repaired.
- Every CONFLICT with its evidence, the owner's answer, and its route.
- The reader-test result per file, or the line that the step was skipped; each finding and its state (fixed, rejected with the reason, open).
- The diagram paths, when one was drawn.
- One line per thing noticed outside the scope.
- The proposed commit subject (`.claude/CLAUDE.md`, Etiquette); omit it when Next is `/ack-debug`.

## Next

`/ack-debug` for a CONFLICT resolved as the code being wrong: finds the root cause and fixes it. Otherwise the owner commits, then `/ack-pr`: writes the pull request text and opens it on the owner's word.
