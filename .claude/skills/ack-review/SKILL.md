---
name: ack-review
description: >-
    Judges a named scope of the checkout read-only through reviewer at a chosen depth and returns PASS or FAIL with each confirmed finding shaped as a pin. Use when the owner wants work on the checkout judged, a module or a diff checked before a commit, or a plan, docs, or the harness checked against their sources. Not for fixing (ack-build), planning or a symptom without a cause (ack-plan), or writing specs (ack-spec).
disable-model-invocation: true
model: opus
effort: medium
context: fork
argument-hint: '<scope: module paths, files, a plan path, docs files, or .claude> [task|plan|docs|harness|rules and boot|end to end] [requirement: <one sentence>]'
---

!`git status --short` !`git diff --name-only HEAD`

# ack-review

You orchestrate in a fork; `reviewer` does the work. You dispatch one `reviewer` and filter what it finds; you change nothing, and git stays read-only. A fork cannot ask the owner: every question is a hand-back. The project is a boilerplate with no external client: judge against the correct shape with every call site changed (`../ack-build/references/dispatch.md`, Every dispatch). If a `superpowers:*` skill is not installed, stop and say `claude plugin install superpowers@claude-plugins-official`. Pass `run_in_background: false` on every Agent call; parallel dispatches are several calls in one message (`../ack-build/references/dispatch.md`, Foreground dispatch).

## 1. Scope and depth

- The argument names the scope. An empty scope is the changed files from `git status --short`. When the scope is empty and nothing changed, say so and stop.
- The argument may name the depth. Without one, the scope sets it:

| Scope | Depth |
| --- | --- |
| `src/` and `test/` paths | `rules and boot` |
| a `.superpowers/*-plan.md` or `.superpowers/plans/*.md` path | `plan` |
| markdown under `docs/`, the root people files, or `.github/`; diagram files under `docs/assets/` | `docs` |
| `.claude/**`, `AGENTS.md`, or `.github/copilot-instructions.md` | `harness` |

- The requirement is the plan header's `Requirement:` line when a plan exists for the scope; otherwise the sentence in the argument. When neither is present, stop and hand back asking for it.

## 2. Review, through `reviewer`

Dispatch `reviewer` with the template at `../ack-build/references/dispatch.md`, Reviewer, at the chosen depth, with the scope and the requirement. `Rules to read:` is the output of `bash .claude/hooks/rules.sh` over the scope, pasted.

Boot runs only at `rules and boot`, or at `end to end` when the owner asked for it.

## 3. Checks

At `task`, `rules and boot`, and `end to end`, `reviewer` runs `pnpm typecheck`, `pnpm lint`, `pnpm deadcode`, and `pnpm spell` and quotes each exit code and decisive line; read that output (`deadcode` and `spell`: `.claude/CLAUDE.md` Gotchas). At the same depths, every sequential `await` of independent work in the scope is a finding (`.claude/rules/code-style.md`, Concurrency and errors). Run no command here. `/ack-review` runs no tests; `pnpm test <path>` belongs to the skill that changes code (`/ack-build`, `/ack-spec`) and `pnpm test:cov` to `/ack-spec` alone.

## 4. Filter

Every finding passes `superpowers:receiving-code-review` here:

- Open the file and confirm or reject the claim, with a reason.
- A confirmed finding becomes a pin: `files`, `cause` at `file:line`, `change` in one sentence.
- A rejected finding stays a line in the hand-back with its reason.

## 5. Verdict

`PASS` when every check `reviewer` quotes is green and no finding was confirmed; otherwise `FAIL`. A check the depth requires and the report does not quote is not green. Invoke `superpowers:verification-before-completion` before stating it: the verdict rests on the output `reviewer` quoted, not on the word "verified".

## Boundaries

- No edit, no fix, no spec, no commit, no DB or seed command.
- A confirmed finding is handed on, not repaired here.

## Hand back

- The scope, the depth, and the requirement used.
- The verdict.
- Each confirmed finding as a pin.
- Each rejected finding with the reason.
- Each check `reviewer` ran with its exit code and the line that matters.
- The boot result, or NOT RUN and why.
- The rule files `reviewer` read.
- One line per thing noticed outside the scope.

## Next

- `/ack-build pin: files <paths>; cause <file:line>; change <one sentence>` per confirmed finding that is a fix with no flow change.
- `/ack-plan` when a finding changes a flow or a decision, or is a symptom whose cause is not in hand.
- `/ack-spec` for a coverage gap.
