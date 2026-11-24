---
name: ack-build
description: >-
    Builds every ticket of an approved plan, one ticket per coder dispatch and test-first, and does not stop until every ticket is done and the gates are green. Use with a plan path under .scratch/, also to resume a build. Not for a plan the owner has not approved (ack-plan) or a bug whose cause is unknown (ack-debug).
blurb: 'build every ticket test-first, gates'
disable-model-invocation: true
argument-hint: '<a .scratch/ plan path>'
---

!`git status --short`

# ack-build

Input: $ARGUMENTS

The session assigns and checks; it writes no file under `src/` or `test/`. `coder` builds one ticket per dispatch, `debugger` is called only when a check will not pass. Commands, gates, and owner-only commands are in `AGENTS.md`. Read each hand-back before the next step.

## Start

- A `plan.md` whose first line is not `**Approved:** yes`: stop and name `/ack-plan`.
- A `- [ ]` line under the plan's `## Harness changes`: stop and name `/ack-harness <the plan path>`.
- Tickets already `done`: name the first ticket that is not, and continue from it.

## 1. Build

Work the frontier until every ticket is `done`. One ticket at a time: two coders in one working tree collide. Do not stop between tickets.

For each ticket whose blockers are `done`, in number order:

1. Dispatch `coder` at the model and effort its plan row gives:

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
    - A choice of what the product does: ask the owner with `AskUserQuestion`. The answer joins the spec's `## Owner decisions`.
    - A choice of how to build it: dispatch `advisor` (below). Ask the owner each item it hands back `NEEDS_OWNER`, as above.

    Then, before the next dispatch on the ticket and before it is set `done`, record each decision answered and each deviation a hand-back names, a rule-wins one included:
    - Correct the ticket step and the acceptance criterion it changes. The next coder builds them, and step 2 ticks them.
    - Correct the spec section it changes.
    - Add one line under the ticket's `## Deviations`: what differs, why, who decided (rule, session, advisor, or owner). Add the heading at the end of the ticket when it is absent. `## Deviations` is the record of the difference.
    - An item `advisor` settled: `advisor` has written these three. Add no second line.
    - Change the plan row only when a blocker or a seam moved.

The `advisor` dispatch, with the Agent call's `model` set to `fable`:

```
Agent: advisor
Spec: <the spec path>
Plan: <the plan path>
Tickets: <the ticket path>
Open: <the coder's question, options, and recommendation>
```

4. One check still failing after two coder dispatches: dispatch `debugger` with the symptom, then one `coder` with its pin. Stop with the evidence when the cause stays unknown.
5. A schema delta in a hand-back: add the owner's `pnpm db:migrate` to the plan's `## Owner commands`.

Stop before the last ticket only when:

- The spec has a defect that changes behavior and one owner answer does not settle.
- The work reaches a module or a dependency no ticket names.
- A rule has to change first: a plan defect, since `## Harness changes` missed it. Add the line there and name `/ack-harness <the plan path>`.

## 2. Prove

1. Run `pnpm typecheck`, `pnpm lint`, `pnpm deadcode`, `pnpm spell`, and `pnpm test <filter>` for each module the build touched. Read the output, not only the exit code (`.claude/rules/code-style.md`, Lint; `.claude/rules/testing.md`, Layout and runs).
2. Run `pnpm test:cov <filter>` and read the row of each file the build changed. A row under 100 is behavior without a spec: one more `coder` dispatch on that ticket.
3. Name the spec or the command that proves each acceptance criterion of each ticket. A criterion without proof goes back to step 1.
4. When the build touched a module file, a router, a config, or a queue, boot the app as `.claude/skills/ack-build/references/boot.md` gives. A schema delta the owner has not applied holds the boot check: say so in the hand-back.

## Hand back

- The acceptance criteria as a table: ticket, criterion, proof, status.
- Each deviation from the spec, with its reason.
- Each decision and assumption made during the build.
- Each owner answer that rejected a named alternative, as a decision candidate (the choice, the rejected option, the owner's reason): name `/ack-harness`.
- The plan's `## Owner commands`.
- The `docs/` pages the change makes stale, as a list for `/ack-doc`.
- A new command, path pattern, or convention the harness does not describe: name `/ack-harness`.

## Next

`/ack-review .scratch/<feature>/plan.md`: reviews the build into `review.md`, then settles and fixes the findings.
