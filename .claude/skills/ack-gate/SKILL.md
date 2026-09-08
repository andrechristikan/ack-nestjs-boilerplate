---
name: ack-gate
description: The compliance pass — check a scope against the whole project rule set, then run every mechanical check, and return one verdict. Reports; never fixes. Use before calling work done, or any time the owner wants the work judged. NOT for finding the cause of a symptom (ack-fix), NOT for writing specs (ack-spec).
disable-model-invocation: true
---

Two halves, both mandatory: the rule set read in full, then every mechanical check run. One
verdict at the end.

**A gate that ran half of itself is a FAILED gate, not a partial one (HARD).** A rule file that
applied to the scope and was not read, a check that could not run, an agent that came back
without naming what it covered — each of those is a failure to report as such. Never present a
subset as a result.

## Owner-invoked, and nothing else invokes it (HARD)

**No skill starts this one, and no agent starts it.** `disable-model-invocation: true` in the
frontmatter enforces the first half; the second half is structural — an agent's job is to do
work, never to reach back for a skill, and none of the project agents carries the `Skill` tool.

That is deliberate. This is the gate the OWNER puts in front of work, so the thing being judged
never gets to decide whether it is judged.

The AGENT is a different question. `reviewer-rules` is offered at the end of a `feature`, `fix`
or `seed` run, where the owner picks it from the closing question. That is the same check
reached by the owner's choice — it is not this skill running inside another one.

## 1 — Scope

Name the paths. If the owner gave none, ask — **there is no merge base here**, and inventing a
surface with `git diff main` reviews commits that already landed upstream.

Git stays read-only: no fetch, no pull.

## 2 — The rule set, in full (HARD)

Dispatch `reviewer-rules` with the paths and — when known — which surfaces they touch (a
controller, a repository, a processor, a DTO, a config key). The agent works that out itself,
but telling it saves a step and picks the right conditional rule files up front.

**The dispatch says this is a gate**, and asks for the two things a gate needs back beyond the
findings:

- **every rule file it read**, by name — the ALWAYS set plus each conditional one the scope
  pulled in
- **every surface it checked and found clean**, so the reader knows what silence covers

Check the returned rule-file list against the scope yourself. A scope with a controller in it
and no `http.md` in the list, a Prisma query and no `database.md`, a status code and no
`status-code.md` — that is an incomplete pass, and it goes back for the surfaces it missed.
**One re-dispatch for a gap in coverage; a second one that still comes back short is a failed
gate reported to the owner.**

**Add `reviewer-e2e` only when the owner asks for the deep version** — it traces flows rather
than judging files, and the two answer different questions. It never runs unasked, here or
anywhere.

## 3 — Every mechanical check (HARD)

Run all five and report each with its output:

```bash
pnpm typecheck
pnpm lint
pnpm deadcode
pnpm spell
pnpm test --testPathPatterns '<scope>'
```

**No check is optional and none is skipped for time.** A check that fails to run at all — a
missing binary, a crashed runner, a config error — is a FAILED gate, reported with what it
printed. It is never left out of the report.

**`deadcode` and `spell` ALWAYS exit 0.** `spell` ends in `|| true` and `ts-prune` never
signals. Their exit code means nothing: READ the output and report what it says.

**`pnpm typecheck` proves nothing on its own from a grep count.** `tsc` ABORTS on a
`tsconfig.json` error and reports zero source errors because it type-checked nothing. Capture
the exit code and the raw output.

The test run is scoped to the paths under review. `collectCoverage` is `false`, so this run does
not apply the 100% threshold — coverage is `/ack-spec`, and this gate does not stand in for it.
Say so in the verdict rather than implying the coverage bar was checked here.

## 4 — The verdict

State it in one line, then the evidence:

- **PASS** — every rule file that applies to the scope was read, every surface reported, and all
  five checks green.
- **FAIL** — anything else, with what failed and whether it was a violation, a red check, or a
  gap in what was covered.

There is no third outcome. "Mostly clean" is a FAIL with a list.

## Two things that are NOT findings

- **A breaking change.** This repo keeps no backward compatibility, so a renamed field, a
  changed URL, or a moved status-code integer is the product (`rules/architecture.md`). What IS
  a finding is a rename that strands live runtime state with no operational step named — a queue
  drain, a cursor invalidation, a forced re-login, an i18n key renamed on one side only.
- **A `pnpm deadcode` entry.** `ts-prune` reports the whole kit surface by design; an exported
  primitive with no call site is legitimate breadth here. Read the three conditions in
  `rules/architecture.md` before filing one.

## Boundaries

- **Nothing is fixed here.** Findings go to an `/ack-fix` run the owner decides on.
- A finding in code outside the named scope is one line, not an entry.
- No boot, no build. `verifier` is offered at the end of a `feature` or `fix` run, not here.
- No edits, no staging, no commits, no DB or seed commands.

## Hand back

The verdict, the findings as the agent reported them unedited, the rule files read, the surfaces
covered, and the output of all five checks.

## Next

| Then run | When |
|---|---|
| `/ack-fix` | a finding is worth repairing — one run per named change |
| `/ack-spec` | the gate is clean but coverage was never the subject here |

Findings you decide NOT to repair are a decision, not a backlog. Say so, so the next `/ack-gate`
does not re-surface them as new.
