---
name: ack-doc
description: >-
    Checks docs/**/*.md, README.md, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, and .github/** except copilot-instructions.md against the checkout through writer and repairs what is stale; the code on disk wins. Use when the owner asks to update, verify, or extend the docs, or for an architecture diagram. Not for a PR description (ack-pr), src/ (ack-design), or .claude/**, decision entries, and docs/*/ai-harness.md (ack-harness).
blurb: 'docs, root people files, .github against the code; the code wins'
disable-model-invocation: true
argument-hint: "<named doc files, a .scratch/ plan or requirement path, or 'all'> [what changed recently] [diagram: <name and subject>]"
---

!`git status --short` !`git diff --name-only HEAD`

# ack-doc

Input: $ARGUMENTS

The session assigns one `writer` dispatch, then a reader test of what it added. The owner settles a scope question and each CONFLICT. The session edits no doc itself. The code on disk wins over a doc. Final state only: `.claude/rules/authoring.md`.

## 1. Scope

- The argument names the files, a `.scratch/<feature>/plan.md` whose build's changed modules are the scope, a `.scratch/requirements/doc-<slug>.md` naming its own scope, or `all` for every `docs/**/*.md`.
- A `.scratch/requirements/doc-restructure-p<N>.md` scope file also names the pages to create, split, and delete; deleting a replaced page and repointing every link into it are in scope.
- Every run also covers the root people files and `.github/**` except `copilot-instructions.md`.
- `docs/*/ai-harness.md` belongs to `/ack-harness`; a run repoints a link there into a page it deletes, path only.
- Each `docs/**/*.md` page and root people file in scope takes a type (`.claude/rules/authoring.md`, Page types): an existing page the type it holds or Page types gives it, a page being created the type its folder or scope file names. A page with neither, or one holding two types, `production.md` aside, is a question to the owner with `AskUserQuestion` before the dispatch.
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
Scope: <the files from step 1, each page to create, split, or delete, and each page linking into a deleted one>
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

## 4. Settle each CONFLICT and outside-scope finding

- Put each CONFLICT to the owner with `AskUserQuestion`, the evidence for both sides as the context.
- The doc is wrong: one repair dispatch to `writer`.
- The code is wrong: name the bug and its fix to the owner. The doc keeps that claim as it is in this run; the owner runs `/ack-quick`, then `/ack-doc` on the page again, before the next phase.
- Put each thing noticed outside the scope to the owner with `AskUserQuestion` and a recommended fix. The answer routes to `/ack-quick` for code, `/ack-harness` for the harness, another `/ack-doc` scope for a page outside this one, and otherwise a sweep row (`.claude/skills/ack-spec/references/sweep-log.md`).

## Hand back

- Findings by class and the files repaired.
- Every CONFLICT with its evidence, the owner's answer, and its route.
- The reader-test result per file, or the line that the step was skipped; each finding and its state (fixed, rejected with the reason, open).
- The diagram paths, when one was drawn.
- Each thing noticed outside the scope, with its recommended fix and the owner's answer.
- The proposed commit subject (`.claude/CLAUDE.md`, Etiquette); omit it when Next is `/ack-quick`.

## Next

`/ack-quick` for a code bug the owner settled, from a CONFLICT or an outside-scope finding: finds the root cause, fixes it test-first, and reviews the fix. Otherwise the owner commits, then `/ack-pr`: writes the pull request text and opens it on the owner's word.
