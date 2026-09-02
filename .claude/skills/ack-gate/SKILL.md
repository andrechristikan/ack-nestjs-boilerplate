---
name: ack-gate
description: Check a scope against the project rule set and report violations. Reports; never fixes. Use before calling work done, or any time the owner wants a compliance pass. NOT for tracing a flow (ack-debug), NOT for applying fixes (ack-fix).
disable-model-invocation: true
---

One dispatch. `reviewer-rules` over the scope.

## Owner-invoked, and nothing else invokes it (HARD)

**No skill starts this one, and no agent starts it.** `disable-model-invocation: true` in the
frontmatter enforces the first half; the second half is structural — an agent's job is to do
work, never to reach back for a skill, and none of the project agents carries the `Skill`
tool.

That is deliberate. This is the gate the OWNER puts in front of work, so the thing being
judged never gets to decide whether it is judged.

The AGENT is a different question. `reviewer-rules` is offered at the end of a `feature`,
`fix` or `seed` run, where the owner picks it from the closing question. That is the same
check reached by the owner's choice — it is not this skill running inside another one.

## Scope

Name the paths. If the owner gave none, ask — **there is no merge base here**, and inventing a
surface with `git diff main` reviews commits that already landed upstream.

Git stays read-only: no fetch, no pull.

## Dispatch

`reviewer-rules`, with the paths and — when known — which surfaces they touch (a controller, a
repository, a processor, a DTO, a config key). The agent works that out itself, but telling it
saves a step and picks the right conditional rule files up front.

**Add `reviewer-e2e` only when the owner asks for the deep version** — it traces flows rather
than judging files, and the two answer different questions. `/ack-debug` is the skill built
around it.

## What comes back

Violations ranked by severity, each with `file:line` and the rule clause it breaks, plus the
list of surfaces checked and found clean.

## Two things that are NOT findings

- **A breaking change.** This repo keeps no backward compatibility, so a renamed field, a
  changed URL, or a moved status-code integer is the product (`rules/architecture.md`). What IS
  a finding is a rename that strands live runtime state with no operational step named — a
  queue drain, a cursor invalidation, a forced re-login, an i18n key renamed on one side only.
- **A `pnpm deadcode` entry.** `ts-prune` reports the whole kit surface by design; an exported
  primitive with no call site is legitimate breadth here. Read the three conditions in
  `rules/architecture.md` before filing one.

## Boundaries

- **Nothing is fixed here.** Findings go to an `/ack-fix` run the owner decides on.
- A finding in code outside the named scope is one line, not an entry.
- No unit test run, no boot, no build. This skill reads code against the rules and nothing
  else.
- No edits, no staging, no commits, no schema or DB commands.

## Hand back

The findings as the agent reported them, unedited, plus what was covered.

## Next

| Then run | When |
|---|---|
| `/ack-fix` | a finding is worth repairing — one run per named change |

Findings you decide NOT to repair are a decision, not a backlog. Say so, so the next
`/ack-gate` does not re-surface them as new.
