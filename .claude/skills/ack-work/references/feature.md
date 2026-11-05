# ack-work plan, on `feature`

The steps of `SKILL.md`, step 6, in order, then the `feature` build of step 4. Each owner answer joins the `Decisions:` of the next dispatch verbatim, and the plan file's `**Decisions:**` once it exists.

## 6.1 Interrogate

- Ask with `AskUserQuestion`, at most five a round, from `references/interrogate.md`, until nothing material is open.
- A question the code answers goes to `explorer`.
- Write the settled paragraph: the requirement, its out-of-scope list included.

## 6.2 Explore

- Dispatch `explorer` (template `references/dispatch.md`, Explorer): `assess`, plus `contract` when a third-party contract is unknown, one dispatch per mode in one message, with the settled paragraph.
- Its open product questions go to the owner with `AskUserQuestion`.
- Carry its location table and its classification (spike, bounded, architectural) into 6.3.

## 6.3 Brainstorm, in the session

Invoke `superpowers:brainstorming` with the settled paragraph and the location table. It runs in the session because it is a dialogue with the owner. Its departures:

- The design document saves to `.superpowers/specs/YYYY-MM-DD-<topic>-design.md` in place of `docs/superpowers/specs/`.
- Its commit step is not taken: the design is a gitignored working artifact.
- Its visual companion is not used: its server is never started (`.claude/CLAUDE.md`, Etiquette, no process left behind).
- Its hand-off to `superpowers:writing-plans` is not taken in the session: `planner` runs it in 6.4.

Every `feature` writes its design file. The step ends at the owner's approval of the document.

## 6.4 Plan, through `planner`

- Dispatch `planner` (template `references/dispatch.md`, Planner) with the design path, the decisions, the location table, the review depth `SKILL.md`, Review, gives `feature`, and the `**Agents:**` line for the route (`SKILL.md`, Route).
- Its open questions go to the owner with `AskUserQuestion`; dispatch `planner` again with the answers in `Decisions:`.
- Its hand-back names the plan path and the task list.

## 6.5 Gate

- Open the plan file and run the check `references/gate.md`, Write the plan file, gives: every requirement sentence has a task, and no task breaks a rule its `Rules to read:` lists.
- A miss goes back to `planner` with the miss named.
- Then `references/gate.md`, Ask, on the plan path. A change request goes back to `planner` with the owner's words in `Decisions:`, and the gate asks again.
- On the yes, the build runs `SKILL.md`, step 4, per task, as Build gives.

## Build

`SKILL.md`, step 4, on `feature`: follow `superpowers:subagent-driven-development` with `coder` as its implementer, dispatched through the Coder template (`references/dispatch.md`) on the route's model and effort. Its departures:

- Its `scripts/sdd-workspace <plan>` prints the workspace `.superpowers/sdd/<plan-basename>/`. Read `progress.md` there before the first dispatch and resume where it ends; a plan's `- [x]` tasks agree with it.
- Its `scripts/task-brief <plan> <N>` writes `task-<N>-brief.md` in the workspace; pass its path, or its text pasted, as the Coder `Task:`.
- One fresh `coder` per task, in order, one at a time. Its implementer prompt is not used: the Coder template is.
- `coder` writes its report to `generated/docs/report-<plan-basename>-task-<N>.md`, hands back the same, and writes nothing under `.superpowers/`. After each hand-back the session reads that report and appends the task's line to `progress.md`, naming no commits.
- Its worktree, commit, and per-task review steps are not taken: `coder` builds in this working tree and does not commit, and `SKILL.md`, step 5, is the one review.
- On `fix` and `change` (a pin, no plan), step 4 is one `coder` dispatch without it.
