---
name: ack-docs
description: Check docs/*.md and the root README.md against the code on this checkout and repair what has gone stale. Use when the owner asks to update or verify the docs. NOT a docs/code diff between two branches, NOT for PR descriptions (ack-pr-doc), NOT for feature code.
disable-model-invocation: true
---

One dispatch to `doc-writer`, the only agent that may write `docs/*.md` and the root `README.md`.

## Scope

**The current checkout as it sits — never a comparison between two branches.** Ask the owner
whether they want everything, or named files: `docs/` holds around thirty files and a full pass
is a long run.

**The root `README.md` is in scope and is easy to forget**, because it sits outside `docs/`. It
carries the version table, the prerequisites and the Quick Start sequence, so an upgrade dates it
faster than anything under `docs/`. A pass the owner asked for in whole-tree words includes it;
name it in the dispatch either way, so its absence is a decision rather than an oversight.

Git stays read-only.

## Dispatch

`doc-writer`, with the file list and, when the owner knows it, what changed recently — that is
where staleness concentrates.

## What comes back

Claims classified ACCURATE, STALE, MISSING, PHANTOM, CONTRADICTS, and CONFLICT. The first five
are repaired. **CONFLICT is never resolved by the agent** — it means the doc and the code
disagree about a DECISION and which is wrong is not obvious.

**Every CONFLICT goes to the owner with the git evidence for both sides.** Do not pick a side
here. When the evidence suggests the CODE is wrong — a guard removed in a commit that does not
mention it, a doc newer than the change, a disagreement about authorization, credentials, or
session invalidation — that is a suspected defect, and it belongs in an `/ack-fix` run, not a
doc edit.

## Read the repair, not just the report

A repair can be accurate and still wrong, because the agent arrives knowing what the doc used to
say and writes the correction as a rebuttal of it. **`docs/` is final state only**
(`rules/authoring.md`), so read the diff for sentences that exist only because something used to
be different:

- a negation that rebuts rather than states a contract — `there is no explicit $transaction`,
  `the count is not stored on the model`
- a `whether or not` / `even though` clause defending the claim against the old one
- an explanation of why two things are the same or differ, where the reader only needs what they
  are

Send those back. The rule is not "is it true" — it is "would this sentence exist if the system
had always been this way".

## Boundaries

- `docs/status-codes.md` is the human catalog, updated from the report of whichever change
  touched a status-code enum. It is not re-derived here as a routine pass.
- No `src/`, no `test/`, no `.claude/`, no `prisma/`.
- No schema, DB, or seed commands. Never stage or commit unless the owner asks in that exchange.
- `Edit(docs/**)` is `allow` in `.claude/settings.json`, so a repair raises no prompt. Nothing
  mechanical stops a doc edit the owner did not ask for; the scope of the dispatch does.

## Hand back

What was found by class, what was repaired, and every CONFLICT — unresolved, with its evidence.

## Next

| Then run | When |
|---|---|
| `/ack-fix` | a CONFLICT resolved as "the CODE is wrong" — that is a defect, not a doc edit |
| `/ack-pr-doc` | the branch is settled and needs its description |
