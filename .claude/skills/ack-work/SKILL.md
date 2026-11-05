---
name: ack-work
description: >-
    Runs code work in this repository: finds and fixes bugs, builds behaviour changes, features, and seeds, and judges work. Use when the owner reports a bug or a symptom, wants application behaviour added or changed or a seed written, or wants work judged. Not for a question the session can answer from what it has read or one grep, unit tests over code that exists (ack-spec), a docs-only task (ack-doc), pull requests (ack-pr), or a harness-only task (ack-harness).
blurb: 'code: bug, change, feature, review'
argument-hint: '<a question, a symptom, a pin (files; cause at file:line; change), a change, a scope to review, or a .superpowers/ plan or design path to resume>'
---

!`git status --short` !`git diff --name-only HEAD`

# ack-work

You route the request and run its route in the session; agents write and judge. Every dispatch carries the block in `.claude/skills/ack-work/references/dispatch.md`, Every dispatch, and runs as its Foreground dispatch section gives; both bind. A rule that must change first stops the route with `/ack-harness` named.

## Gate before any write

Every route that writes (`edit`, `fix`, `change`, `feature`, the fixes after a `review`) stops at the plan-file gate, `references/gate.md` (filled: `references/example-plan.md`): no edit and no `coder` dispatch before the owner's yes. `explore` has no gate.

## 1. Route

First action, the owner's request or the `.superpowers/` path pasted verbatim:

```bash
bash .claude/hooks/jev.sh route <<'JEV'
<the owner's request, or the .superpowers/ path>
JEV
```

Read the `<jev_route>` block:

- `off`, `unavailable`, `no request`: the table and the paragraph below it.
- `resume <path>`: `references/resume.md`.
- `unclear kind`: `AskUserQuestion` with the two kinds; continue on the block's `On <kind>:` line for the chosen one.
- `owner skill`: name it and stop.
- `explore`, `review`: dispatch its agent (step 2 or 5).
- `fix`: the pin is the location. `debug`: step 3; its pin is the location.
- `pending (new_behaviour)`: `explorer` `locate` (step 2); its location table is the location.

On `fix`, `debug`, and `new_behaviour`, with the location in hand, run (strings JSON-escaped):

```bash
bash .claude/hooks/jev.sh level <<'JSON'
{"request": "<the request, verbatim>", "route": "fix | debug | new_behaviour", "location": "<the location table or the pin, as text>"}
JSON
```

The `<jev_level>` block's `Route:` on `new_behaviour` is `edit`, `change`, or `feature`; after `debug`, `references/debug.md`, step 4, names it. Then the gate and the route's steps.

Pass a block's model and effort as Agent `model` and `effort`; an agent it does not name runs at its `Level:`, never below its frontmatter. A departure from a block says why. State the route and its source, `Jev` or `own table`, in one line first.

| Route | When | Steps |
| --- | --- | --- |
| `explore` | a code question that needs a search, a contract, or approaches; a question answerable from what the session has read is answered without this skill | 2, then answer |
| `edit` | a one-file change that adds no behaviour across modules | gate, edit in the session, 8 |
| `fix` | a bug with a pin: files, cause at `file:line`, change | gate, 4, 5, 8 |
| `debug` | a symptom whose cause is not in hand | 3 |
| `change` | behaviour added or changed inside one module | gate, 4, 5, 8 |
| `feature` | behaviour across modules, a flow, a schema, or a seed change | 6, gate, 4 per task, 5, 8 |
| `review` | the owner wants work judged | 5, then 7 |
| `resume` | a `.superpowers/` plan or design path | `references/resume.md` |
| owner skill | unit tests over existing code, a docs-only or harness-only task, a pull request | name `/ack-spec`, `/ack-doc`, `/ack-harness`, or `/ack-pr`; stop |

Without a Jev block, new behaviour runs `explorer` `locate` first and the session picks `edit`, `change`, or `feature` from its location table by the When column; each agent runs on its frontmatter model and effort, except `explorer` `contract` sonnet, medium, `assess` opus, high, and `coder` on `fix` or `debug` effort high. An agent dispatched before a Jev block exists runs on its frontmatter model and effort. `reviewer` at `end to end` always runs at least opus, high.

## 2. Explore, through `explorer`

- Dispatch `explorer` (template `references/dispatch.md`, Explorer): `locate` for touch points, `contract` for a third-party contract, `assess` when the shape is open; one dispatch per mode in one message.
- `explore` answers from its hand-back. Other routes carry its location table into the next step.
- Its open product questions go to the owner (`AskUserQuestion`).

## 3. Debug, through `debugger`

Follow `references/debug.md`: it pins the symptom, dispatches `debugger`, and classifies its pin, or names `/ack-spec`.

## 4. Build, through `coder`

- One `coder` per pin or plan task, in order, one at a time (template `references/dispatch.md`, Coder; filled: `references/example-dispatch.md`). On `fix` and `change`, one dispatch in the Pin form (`references/gate.md`, After the yes).
- On `feature`, follow `superpowers:subagent-driven-development` with `coder` as its implementer, as `references/feature.md`, Build, gives; step 5 is the one review.
- `coder` writes the failing spec first when `src/` behaviour changes and runs the task's acceptance commands.
- A schema delta: relay the model, field, index, and owner's `pnpm db:migrate`.
- A report (`references/example-report.md`) quoting every acceptance line green completes the task; on `feature`, mark it `- [x]`.
- `NEEDS_CONTEXT`, `BLOCKED`, a line not green, or `DONE_WITH_CONCERNS`: ask the owner with `AskUserQuestion`; an answer joins `**Decisions:**` before the next dispatch.

## 5. Review, through `reviewer`

- Dispatch one `reviewer` over every file the route changed, or the scope the owner named (template `references/dispatch.md`, Reviewer). The requirement is the plan's `**Requirement:**`, or on `review` the settled paragraph.
- Depth: `task` on `fix`; `rules and boot` on `change`; the plan's depth on `feature`. On `review`, the owner's depth, else by scope: `src/` or `test/` paths `rules and boot`, a plan `plan`, docs `docs`, `.claude/**` `harness`.
- Pass every finding through `superpowers:receiving-code-review` in the session: open its file, confirm or reject it with a reason. Severity is the reviewer's label.
- Confirmed findings go to one `coder` fix dispatch, then one re-review of those findings only. After two rounds, an open Critical or Important finding stops the route with the question; a Minor one is parked with a ruling as one open row in `generated/docs/report-src-sweep.md` (`.claude/skills/ack-spec/references/sweep-log.md`).

## 6. Plan, on `feature`

Follow `references/feature.md`: interrogate the owner, `explorer` `assess`, `superpowers:brainstorming` in the session to a design file the owner approves (every `feature` writes one), `planner` on the design path, then the gate on the plan path.

## 7. Close a review

State `PASS` when every quoted check is green and no finding was confirmed, otherwise `FAIL` with each confirmed finding as a pin. To fix them, enter the gate with the pins; on yes, run 4 and 5 per pin, or `feature` for a finding that changes a flow.

## 8. Follow up: docs and harness

After a route that changed files, follow `references/followup.md`; `writer` and `harness` each run after the owner's yes.

## Finish

- Invoke `superpowers:verification-before-completion` before step 7's verdict or the commit subject.
- Run and read `pnpm test <module>` for each module the route changed, plus `pnpm typecheck` on `edit`. Where a reviewer ran, its quoted gates are the other evidence (`.claude/CLAUDE.md` Gotchas).
- Propose the commit subject (`<type>(<scope>): <description>`, `.commitlintrc`) and stop.

## Boundaries

- The session writes code only on `edit`, after the gate; elsewhere `coder` writes, `reviewer` judges, and `writer` (`docs/`) and `harness` (`.claude/**`) write after the owner's yes.
- The session also writes the `edit`, `fix`, and `change` plan file, the `.superpowers/specs/` design, and the `.superpowers/sdd/` ledger and briefs. No DB or seed command (`AGENTS.md`); git read-only.

## Hand back

Hand back the items `references/handback.md` lists.

## Next

`/ack-pr` once the work is committed.
