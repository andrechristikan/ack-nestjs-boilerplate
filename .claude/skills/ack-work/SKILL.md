---
name: ack-work
description: >-
    Runs code work in this repository: answers code questions, finds and fixes bugs, builds behaviour changes, features, and seeds, and judges work. Use when a <jev_route> reminder names it, or when the owner asks about the code, reports a bug or a symptom, wants application behaviour added or changed or a seed written, or wants work judged. Not for unit tests over code that exists (ack-spec), a docs-only task (ack-doc), pull requests (ack-pr), or a harness-only task (ack-harness).
blurb: 'code: question, bug, change, feature, review'
argument-hint: '<the request: a question, a symptom (input, observed, expected, where), a pin (files; cause at file:line; change), a change, or a scope to review>'
---

!`git status --short` !`git diff --name-only HEAD`

# ack-work

You route the request and run its route in the session; agents write and judge. Every dispatch carries the block in `.claude/skills/ack-work/references/dispatch.md`, Every dispatch, and runs as its Foreground dispatch section gives; both bind. A rule that must change first stops the route with `/ack-harness` named.

## Gate before any write

Every route that writes (`edit`, `fix`, `change`, `feature`, and the fixes after a `review`) first has the plan file `references/gate.md` gives (filled: `references/example-plan.md`; on `feature`, `planner` writes it) and presents its path with `AskUserQuestion`. Nothing is edited and no `coder` is dispatched before the owner's yes; a change request revises the file and asks again. `answer` and `explore` have no gate.

## 1. Route

`.claude/hooks/jev.sh route` runs as the `UserPromptSubmit` hook on every prompt. With `TYPESAFE_API_KEY` set and a route settled, it adds a `<jev_route>` reminder naming the route and each agent's model and effort: take it unless it contradicts the request, and pass both as Agent `model` and `effort`. A failed call's routeless reminder counts as none. Inside a route, a reminder on a follow-up message is ignored unless it names a different task. Without a reminder, take the first row that fits and pass `model` and `effort` only as below the table. State the route and its source, `Jev` or `own table`, in one line before the first step; a departure from the reminder says why.

| Route | When | Steps |
| --- | --- | --- |
| `answer` | a question the session answers itself, from what it has read or one grep; no agent | answer |
| `explore` | a code question that needs a search, a contract, or approaches | 2, then answer |
| `edit` | a one-file change that adds no behaviour across modules | gate, edit in the session, 8 |
| `fix` | a bug with a pin: files, cause at `file:line`, change | gate, 4, 5, 8 |
| `debug` | a symptom whose cause is not in hand | 3 |
| `change` | behaviour added or changed inside one module | 2 (`locate`), gate, 4, 5, 8 |
| `feature` | behaviour across modules, a flow, a schema, or a seed change | 6, gate, 4 per task, 5, 8 |
| `review` | the owner wants work judged | 5, then 7 |
| owner skill | unit tests over existing code, a docs-only or harness-only task, a pull request | name `/ack-spec`, `/ack-doc`, `/ack-harness`, or `/ack-pr` and stop |

Without a reminder, each agent runs on its frontmatter model and effort, except: `explorer` `contract` sonnet, medium and `assess` opus, high; `coder` on `fix` or `debug` effort high. Always, `reviewer` at `end to end` runs at least opus, high.

## 2. Explore, through `explorer`

- Dispatch `explorer` (template `references/dispatch.md`, Explorer): `locate` for touch points, `contract` for a third-party contract, `assess` when the shape is open; one dispatch per mode in one message.
- `explore` answers from its hand-back. Other routes carry its location table into the next step.
- Its open product questions go to the owner with `AskUserQuestion`.

## 3. Debug, through `debugger`

Follow `references/debug.md`: it pins the symptom, dispatches `debugger`, and enters the gate with the pin, or names `/ack-spec`.

## 4. Build, through `coder`

- One `coder` per pin or plan task, in order, one at a time (template `references/dispatch.md`, Coder; filled: `references/example-dispatch.md`). On `fix` and `change`, one dispatch in the Pin form: files from the plan's `**Files:**`, the behaviour as the change.
- On `feature`, follow `superpowers:subagent-driven-development` with `coder` as its implementer, as `references/feature.md`, Build, gives; step 5 is the one review.
- `coder` writes the failing spec first when `src/` behaviour changes, typechecks, runs `pnpm test <module>` or the task's acceptance commands, and repairs the run surface it made stale.
- A schema delta: relay the model, field, index, and owner's `pnpm db:migrate`.
- A report (`references/example-report.md`) quoting every acceptance line green completes the task; on `feature`, mark it `- [x]`.
- `NEEDS_CONTEXT`, `BLOCKED`, or a line not green: put the question to the owner with `AskUserQuestion`, add the answer to `**Decisions:**`, then dispatch again.
- `DONE_WITH_CONCERNS`: the concerns go to the owner with `AskUserQuestion`.

## 5. Review, through `reviewer`

- Dispatch one `reviewer` over every file the route changed, or the scope the owner named (template `references/dispatch.md`, Reviewer; filled: `references/example-dispatch.md`). The requirement is the plan's `**Requirement:**`, or on `review` the settled paragraph.
- Depth: `task` on `fix`; `rules and boot` on `change`; the plan's depth on `feature`. On `review`, the owner's depth, else by scope: `src/` or `test/` paths `rules and boot`, a plan `plan`, docs `docs`, `.claude/**` `harness`.
- Pass every finding through `superpowers:receiving-code-review` in the session: open its file and confirm or reject it with a reason. Severity is the reviewer's label.
- Confirmed findings go to one `coder` fix dispatch, then one re-review of those findings only. After two rounds, a Critical or Important finding still open stops the route with the question; a Minor one is parked with a ruling and appended as one open row to `generated/docs/report-src-sweep.md` (row shape, and the header and headings of a missing file: `.claude/skills/ack-spec/references/sweep-log.md`).

## 6. Plan, on `feature`

Follow `references/feature.md`:

1. Interrogate the owner from `references/interrogate.md` until nothing material is open.
2. Dispatch `explorer` (`assess`, plus `contract` when needed) with the settled paragraph.
3. Invoke `superpowers:brainstorming` in the session until the owner approves the design.
4. Dispatch `planner` (template `references/dispatch.md`, Planner) with the approved design.
5. Enter the gate on the plan path (`references/gate.md`).

## 7. Close a review

State `PASS` when every quoted check is green and no finding was confirmed, otherwise `FAIL` with each confirmed finding as a pin. To fix them, enter the gate with the pins; on yes, run 4 and 5 per pin, or `feature` for a finding that changes a flow.

## 8. Follow up: docs and harness

After a route that changed files, follow `references/followup.md`: `jev.sh followup` names the `docs/` pages `writer` updates and whether `harness` is needed; without Jev, decide from the same questions.

## Finish

- Invoke `superpowers:verification-before-completion` before stating `PASS` or `FAIL` (step 7) or proposing the commit subject.
- Run and read `pnpm test <module>` for each module the route changed, plus `pnpm typecheck` on `edit`. Where a reviewer ran, its quoted `pnpm lint`, `pnpm deadcode`, `pnpm spell`, and typecheck are the other evidence (`.claude/CLAUDE.md` Gotchas).
- Propose the commit subject (`<type>(<scope>): <description>`, `.commitlintrc`) and stop.

## Boundaries

- The session writes code only on `edit`, after the gate; elsewhere `coder` writes, `reviewer` judges, `writer` writes `docs/`, and `harness` writes `.claude/**` after the owner's yes.
- Elsewhere, the session writes only the plan file on `edit`, `fix`, and `change`, the design under `.superpowers/specs/`, and the `.superpowers/sdd/` ledger and briefs; `planner` writes the `feature` plan. No DB or seed command; git read-only; commits go through `ask`.

## Hand back

Hand back the items `references/handback.md` lists.

## Next

`/ack-pr` once the work is committed.
