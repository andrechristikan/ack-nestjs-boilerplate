---
name: ack-plan
description: >-
    Breaks an approved spec into local tickets, sets the effort each ticket is built at, lists the harness changes the build waits for, writes the plan index a person reads, has a fresh reviewer confirm the tickets are executable, and waits for the owner's approval. Use with a spec path under .scratch/. Not for settling what to build (ack-design) or building (ack-build).
blurb: 'tickets, the plan index, cold read, approval'
disable-model-invocation: true
argument-hint: '<a .scratch/ spec path>'
---

!`git status --short`

# ack-plan

Input: $ARGUMENTS

The session writes the tickets and the plan index. One agent reads: `reviewer`, cold. One agent may edit them: `advisor`, as the last cold-read attempt. Write nothing under `src/`, `test/`, or `prisma/`. Where a copied skill and a rule or this file differ, the rule and this file win.

## Start

- No spec at the path: stop and name `/ack-design`.
- A `plan.md` beside the spec whose first line is `**Approved:** yes`: say so and name `/ack-build`.

## 1. Tickets

Follow `.claude/skills/to-tickets/SKILL.md`, with these departures:

- The tracker is local markdown (`.claude/CLAUDE.md`, Work artifacts): one file per ticket at `.scratch/<feature>/issues/<NN>-<slug>.md`.
- A platform issue is created only when the owner asks for one in this run. `gh issue create` runs on the owner's word.
- Its step 4 quiz uses `AskUserQuestion`.
- A wide refactor is one ticket that changes every call site. This repository takes no expand-contract sequence (`AGENTS.md`).
- Each ticket also carries `**Seam:**`, from the spec's Testing Decisions, and `**First failing spec:**`, the behaviour its first unit spec asserts.
- A ticket that adds a module, a status code, a queue, a seed, a notification, or an upload carries `**Procedure:**` with its `.claude/skills/ack-build/references/add-<topic>.md`.
- Every acceptance criterion states an observable result a unit spec, a gate command, or a request against the booted app proves.
- Run `bash .claude/hooks/rules.sh` over the `src/` paths the tickets touch and read each rule it prints. A ticket step a rule forbids is rewritten, or the rule joins `## Harness changes`.

## 2. Level per ticket

`coder` builds every ticket on sonnet; the level is its effort.

1. For each ticket, run:

```bash
bash .claude/hooks/jev.sh level <<'JSON'
{"request": "<the ticket text>", "location": "<the modules and layers it touches>"}
JSON
```

2. A `<jev_level>` block that names `coder` gives its effort. Use it.
3. A block that says `off`, `unavailable`, or `malformed input` gives nothing. Use this table:

| The ticket                                                  | coder          |
| ----------------------------------------------------------- | -------------- |
| touches the schema, a transaction, concurrency, or security | sonnet, high   |
| any other                                                   | sonnet, medium |

No ticket runs below the `effort` in `coder`'s frontmatter.

## 3. Plan index

Write `.scratch/<feature>/plan.md`. It is an index a person reads to see the order, the effort each ticket is built at, and what is done. Ticket detail stays in the ticket files.

- `**Approved:** no` as the first line.
- `**Spec:**` the spec path.
- `**Decisions to honour:**` the decision entries the spec names.
- One table, a row per ticket: `#`, `Ticket`, `Blocked by`, `Seam`, `Coder`, `Status`, `Evidence`. `Status` starts as `ready`.
- `## Harness changes`: the spec's lines and any step 1 added, each `- [ ] <rule change or decision entry>`, or `none`.
- `## Cold read`: each round, and what it changed.
- `## Owner commands`: empty until the build fills it.

## 4. Cold read

**Three attempts are a ceiling, not a quota.** An attempt that leaves no question and no mismatch ends the cold read, the first included. Another runs only when the reader did not understand the spec and the tickets.

1. Dispatch `reviewer` with `Depth: plan`, the spec path, the plan path, and the tickets folder. Paste nothing else from this session.
2. Compare its one-line restatement of each ticket with what the ticket means. A mismatch is a ticket defect, on `READY` too.
3. Fix the ticket files for every question and every mismatch. An answer only the owner has goes to the owner with `AskUserQuestion` and joins the spec's `## Owner decisions` verbatim.
4. After a fix, dispatch a new `reviewer` on the fixed files. It has no memory of the round before.
5. A second `reviewer` that still has a question or a mismatch: the third attempt is `advisor`, dispatched once with the Agent call's `model` set to `fable`. Write nothing until it hands back, then read again each file it edited.

```
Agent: advisor
Spec: <the spec path>
Plan: <the plan path>
Tickets: <the tickets folder>
Open: <each question and mismatch of both rounds, with the fix tried>
```

6. Record under `## Cold read` what `advisor` edited and what it left open. No reader runs after it.

## 5. Approval

- Present the plan path, what the cold read changed, what `advisor` left open, and each decision made beyond the spec, with `AskUserQuestion`.
- On the yes, set the first line to `**Approved:** yes`.
- A change request revises the tickets, then one `reviewer` reads them cold. Ask again with whatever it leaves open; `advisor` is not dispatched a second time.

## Hand back

- The plan path and the ticket count.
- The effort each ticket runs at, and whether Jev or the table gave it.
- The plan's `## Harness changes`.
- What the cold read changed.

## Next

A fresh session, then `/ack-harness .scratch/<feature>/plan.md` when `## Harness changes` holds an item, otherwise `/ack-build .scratch/<feature>/plan.md`.
