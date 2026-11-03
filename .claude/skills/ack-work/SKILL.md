---
name: ack-work
description: >-
    Routes and runs code work in the session: drives explorer, debugger, coder, and reviewer through an explore, a fix, a debug, a change, a feature with a plan the owner approves, or a review, then has writer update the docs and harness update the AI configuration when the change needs it. Jev picks the route and each agent's model when TYPESAFE_API_KEY is set. Use when the owner asks about the code, reports a bug or a symptom, wants application behaviour added or changed or a seed written, or wants work judged. Not for unit tests over code that exists (ack-spec), a docs-only task (ack-doc), pull requests (ack-pr), or a harness-only task (ack-harness).
disable-model-invocation: true
argument-hint: '<the request: a question, a symptom (input, observed, expected, where), a pin (files; cause at file:line; change), a change, or a scope to review>'
---

!`git status --short` !`git diff --name-only HEAD`

# ack-work

You route the request and run its route in the session; agents write and judge. The project is a boilerplate with no external client: build the correct shape and change every call site (`references/dispatch.md`, Every dispatch). A rule that has to change first stops the route with `/ack-harness` named. Dispatch in the foreground (`references/dispatch.md`, Foreground dispatch).

## 1. Route

`.claude/hooks/jev.sh route` runs on `/ack-work` when `TYPESAFE_API_KEY` is set and adds a `<jev_route>` reminder naming the route and each agent's model and effort: take it unless it contradicts the request, and pass both as that agent's Agent `model` and `effort`. Without a reminder, take the first row that fits and pass `model` and `effort` only as the paragraph below the table says. State the route and its source, `Jev` or `own table`, in one line before the first step; a route that departs from the reminder says why.

| Route | When | Steps |
| --- | --- | --- |
| `answer` | a question the session answers from what it has read, no search | answer |
| `explore` | a code question that needs a search, a contract, or approaches | 2, then answer |
| `edit` | a one-file change that adds no behaviour across modules | edit in the session, 8 |
| `fix` | a bug with a pin: files, cause at `file:line`, change | 4, 5, 8 |
| `debug` | a symptom whose cause is not in hand | 3 |
| `change` | behaviour added or changed inside one module | 2 (`locate`), 4, 5, 8 |
| `feature` | behaviour across modules, a flow, a schema, or a seed change | 6, then 4 per task, 5, 8 |
| `review` | the owner wants work judged | 5, then 7 |
| owner skill | unit tests over existing code, a docs-only or harness-only task, a pull request | name `/ack-spec`, `/ack-doc`, `/ack-harness`, or `/ack-pr` and stop |

Without a reminder, each agent runs on its frontmatter model and effort, except: `explorer` `contract` sonnet, medium and `assess` opus, high; `coder` on `fix` or `debug` effort high. With or without one, `reviewer` at `end to end` runs at least opus, high.

## 2. Explore, through `explorer`

- Dispatch `explorer` (template `references/dispatch.md`, Explorer): `locate` for touch points, `contract` for a third-party contract, `assess` when the shape is open; one dispatch per mode in one message.
- `explore` answers from its hand-back. Other routes carry its location table into the next step.
- Its open product questions go to the owner with `AskUserQuestion`.

## 3. Debug, through `debugger`

Follow `references/debug.md`. It continues in `fix`, `change`, or `feature`, or names `/ack-spec`.

## 4. Build, through `coder`

- One `coder` per pin or plan task, in order, one at a time (template `references/dispatch.md`, Coder). On `change`, the dispatch uses the Pin form: files from the location table, the behaviour as the change.
- `coder` writes the failing spec first when `src/` behaviour changes, typechecks, runs `pnpm test <module>` or the task's acceptance commands, and repairs the run surface the change made stale.
- A schema delta: relay the model, the field, the index, and the owner's `pnpm db:migrate`.
- A report quoting every acceptance line green completes the task; on `feature`, mark it `- [x]` in the plan.
- `NEEDS_CONTEXT`, `BLOCKED`, or a line not green: put the question to the owner with `AskUserQuestion`, then dispatch again with the answer.

## 5. Review, through `reviewer`

- Dispatch one `reviewer` over every file the route changed, or the scope the owner named (template `references/dispatch.md`, Reviewer). The requirement is the pin, the settled paragraph, or the plan's `**Requirement:**`.
- Depth: `task` on `fix`; `rules and boot` on `change`; the plan's depth on `feature`. On `review`, the owner's depth, else by scope: `src/` or `test/` paths `rules and boot`, a plan `plan`, docs `docs`, `.claude/**` `harness`.
- Open each finding's file and confirm or reject it with a reason. Severity is the reviewer's label.
- Confirmed findings go to one `coder` fix dispatch, then one re-review of those findings only. After two rounds, a Critical or Important finding still open stops the route with the question; a Minor one is parked with a ruling.

## 6. Plan, on `feature`

1. Ask with `AskUserQuestion`, at most five questions a round, from `references/interrogate.md`, until nothing material is open. A question the code answers goes to `explorer`.
2. Dispatch `explorer` (`assess`, plus `contract` when a third-party contract is unknown) with the settled paragraph.
3. Write `.superpowers/plans/YYYY-MM-DD-<feature-name>.md`: `**Requirement:**` (the settled paragraph, its out-of-scope list included), `**Review depth:** rules and boot | end to end`, then one `- [ ]` task each with `Files:`, `Rules to read:` (the output of `bash .claude/hooks/rules.sh` over its Files, pasted), `Procedure:` (`references/add-<topic>.md` for a module, status code, queue, seed, or notification), and acceptance lines.
4. Check that every requirement sentence has a task and no task breaks a rule its `Rules to read:` lists; fix misses in the file.
5. Present the plan path to the owner with `AskUserQuestion`. Build only on approval; a change request revises the file and asks again.

A plan with `- [x]` tasks resumes at its first `- [ ]` task.

## 7. Close a review

State `PASS` when every check the reviewer quoted is green and no finding was confirmed, otherwise `FAIL` with each confirmed finding as a pin. Ask with `AskUserQuestion` whether to fix them; on yes, run 4 and 5 per pin, or `feature` for a finding that changes a flow.

## 8. Follow up: docs and harness

After a route that changed files, follow `references/followup.md`: `jev.sh followup` names the `docs/` pages `writer` updates and whether the harness needs `harness`; without Jev, decide from the same questions.

## Finish

- Run and read `pnpm test <module>` for each module the route changed. The reviewer's quoted `pnpm lint`, `pnpm deadcode`, `pnpm spell`, and typecheck are the other evidence (`.claude/CLAUDE.md` Gotchas).
- Propose the commit subject (`<type>(<scope>): <description>`, `.commitlintrc`) and stop.

## Boundaries

- The session writes code only on `edit`; elsewhere `coder` writes, `reviewer` judges, `writer` writes `docs/`, and `harness` writes `.claude/**` after the owner's yes.
- The session writes the plan file only; no DB or seed command; git read-only; commits go through `ask`.

## Hand back

- The route and why, and whether a `<jev_route>` reminder set it.
- Each agent's hand-back in one line, with the model and effort it ran on.
- Files changed; status codes allocated; the schema delta and the owner's `pnpm db:migrate`.
- The review: each finding and its state (fixed, rejected with the reason, parked, open).
- The follow-up: the `<jev_followup>` block or the direct decision, the docs `writer` changed, and the harness change or the owner's no.
- The `pnpm test` output.
- The proposed commit subject.
- One line per thing noticed outside the scope.
