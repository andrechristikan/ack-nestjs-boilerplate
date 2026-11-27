---
name: ack-build
description: >-
    Builds every ticket of an approved plan, one ticket per coder dispatch and test-first, and does not stop until every ticket is done and the gates are green. Use with a plan path under .scratch/, also to resume a build. Not for a plan the owner has not approved (ack-plan) or a bug whose cause is unknown (ack-quick).
blurb: 'build every ticket test-first, gates'
disable-model-invocation: true
argument-hint: '<a .scratch/ plan path>'
---

!`git status --short`

# ack-build

Input: $ARGUMENTS

The session assigns and reads hand-backs; it writes no file under `src/` or `test/`. `coder` builds one ticket per dispatch, `reviewer` runs the gates, the boot, and the data checks, and `debugger` is called only when a check will not pass. Commands, gates, and owner-only commands are in `AGENTS.md`. Read each hand-back before the next step.

## Start

- A `plan.md` whose first line is not `**Approved:** yes`: stop and name `/ack-plan`.
- A `- [ ]` line under the plan's `## Harness changes`: stop and name `/ack-harness <the plan path>`.
- Tickets already `done`: name the first ticket that is not, and continue from it.

## 1. Build

Work the frontier until every ticket is `done`. One ticket at a time: two coders in one working tree collide. Do not stop between tickets.

For each ticket whose blockers are `done`, in number order:

1. Dispatch `coder`:

```
Agent: coder
Ticket: <the ticket path>
Position: <n>/<total>
Spec: <the spec path>
Seam: <the ticket's Seam line>
First failing spec: <the ticket's line>
Procedure: <the ticket's add-<topic>.md, or none>
Decisions to honor: <the plan's line>
```

`Position` counts the tickets `done` plus this one, over every ticket of the plan; a second dispatch on a ticket repeats its `Position`. Each time a ticket becomes `done`, tell the owner `<n>/<total>`.

2. A `DONE <n>/<total>` hand-back that quotes each spec failing, then passing: record each deviation it names (step 3), tick the ticket's criteria, set its `**Status:**` to `done`, and fill the plan row's `Status` and `Evidence` with the command and its decisive line.
3. `NEEDS_CONTEXT`, `NEEDS_DECISION`, `BLOCKED`, `DONE_WITH_CONCERNS`, or a line that is not green: route each open item, the first match only.
    - The spec, its `## Owner decisions`, or an entry `Decisions to honor` names answers it: answer it.
    - Otherwise write the item as the coder gave it to `.scratch/<feature>/decision.txt` with the Write tool and run `bash .claude/hooks/jev.sh decision <the ticket path> < .scratch/<feature>/decision.txt`. A block that says `advisor`: dispatch `advisor` (below), and ask the owner each item it hands back `NEEDS_OWNER`. Any other block: ask the owner with `AskUserQuestion`; the owner may name `advisor`. An owner answer joins the spec's `## Owner decisions`.

    Then, before the next dispatch on the ticket and before it is set `done`, record each decision answered and each deviation a hand-back names, a rule-wins one included:
    - Correct the ticket step and the acceptance criterion it changes. The next coder builds them, and step 2 ticks them.
    - Correct the spec section it changes.
    - Add one line under the ticket's `## Deviations`: what differs, why, who decided (rule, session, advisor, or owner). Add the heading at the end of the ticket when it is absent. `## Deviations` is the record of the difference.
    - An item `advisor` settled: `advisor` has written these three. Add no second line.
    - Change the plan row only when a blocker or a seam moved.

The `advisor` dispatch:

```
Agent: advisor
Spec: <the spec path>
Plan: <the plan path>
Tickets: <the ticket path>
Open: <the coder's question, options, and recommendation>
```

4. One check still failing after two coder dispatches: dispatch `debugger` with the symptom, then one `coder` with its pin. Stop with the evidence when the cause stays unknown.
5. Every owner command a coder hand-back names (`pnpm db:migrate` for a schema delta, `pnpm migration:fresh` for a seed change) joins the plan's `## Owner commands`.

Stop before the last ticket only when:

- The spec has a defect that changes behavior and one owner answer does not settle.
- The work reaches a module or a dependency no ticket names.
- A rule has to change first: a plan defect, since `## Harness changes` missed it. Add the line there and name `/ack-harness <the plan path>`.

## 2. Review

Dispatch one `reviewer` over the whole build:

```
Agent: reviewer
Requirement: <the plan path>, <the spec path>, <the tickets folder>
Changed paths: <git diff --name-only HEAD plus git ls-files --others --exclude-standard>
Rules to read: <the output of bash .claude/hooks/rules.sh over the changed paths, pasted>
Decisions to honor: <the plan's line>
Output: .scratch/<feature>/review.md
```

1. Each red result goes to one `coder` dispatch as a pin, then to one `reviewer` dispatch with the same lines and `Fixed: <the red results>`. A red result whose **Cause** reads `unknown` takes step 1's `debugger` route instead of the `coder` dispatch.

```
Agent: coder
Pin: <the result's files, cause, and change, copied from review.md>
First failing spec: <the result's line, or none>
Decisions to honor: <the plan's line>
```

2. A check still red after two `coder` dispatches takes step 1's `debugger` route.
3. The findings stay in `review.md` for `/ack-review`.

## Hand back

- The acceptance criteria as a table: ticket, criterion, proof from `review.md`, status.
- Each check `reviewer` held, with its reason.
- Each deviation from the spec, with its reason.
- Each decision and assumption made during the build.
- Each owner answer that rejected a named alternative, as a decision candidate (the choice, the rejected option, the owner's reason): name `/ack-harness`.
- A new command, path pattern, or convention the harness does not describe: name `/ack-harness`.

## Next

`/ack-review .scratch/<feature>/plan.md`: settles the findings in `review.md` with the owner and fixes the kept ones.
