---
name: ack-claude-config
description: Rework the Claude harness for this repo — .claude/** : CLAUDE.md, rules, agents, skills, settings, hooks. Not the application config in src/configs/, and not settings for anything the app runs. Runs in this session with agents and other skills disabled, because the subject IS the configuration those would be reading. Use when the owner wants to change how Claude works in this repo. NOT for src/, test/, docs/, or prisma/.
disable-model-invocation: true
disallowed-tools: Agent, Skill
---

You edit `.claude/**` directly, here. `Agent` and `Skill` are removed from your tool pool for
this turn — nothing dispatches, nothing else loads.

## Why no agents

The subject is the configuration an agent would be reading. An agent dispatched mid-rework
carries the version that existed when it started, reports against it, and the two states diverge
silently. `.claude/**` is also the one tree exempt from "every change goes through an agent" —
the owner reviews every line in this conversation, and that review IS the gate.

## Working rules for this tree

**Final state only.** No decision history, no dates, no "owner ruling", no "previously X now Y",
no bug or issue or fix narrative, no rejected alternative. A `.claude/**` file says how the
project works NOW. History is git.

The test, and the negation trap that survives it, are in `rules/authoring.md` → "Final state
only" — the same rule that binds `docs/`. It applies to every file you touch here, including a
rule you are adding BECAUSE something went wrong: write the obligation, never the incident that
produced it.

**One file, one topic.** A sentence that seems to belong in two files is two sentences, and one
of them belongs somewhere else.

**Where a sentence lives:**

| It says | It goes to |
|---|---|
| what code must or must not do | `rules/` |
| an agent's role, scope, tools, or limits | `agents/` |
| the ordered steps of one job | `skills/` |
| how an agent should WORK — verification habits, diff bases, doc voice | the agent that does it, in `agents/` |
| project orientation every session needs | `CLAUDE.md` |
| a deterministic block or check | a hook in `settings.json` |

**Verify against the code before writing a rule.** A rule stating behaviour the codebase does
not have is worse than no rule: it teaches the reader to distrust the file. Open the source, run
the command, read the config. A rule quoted from memory is how most bad rules get written.

**A defect found in `src/` is RECORDED, not fixed.** It goes to
`generated/docs/report-src-sweep.md` under CHANGE, STYLE, RENAME, DELETE or ADD. This session
touches no `src/`.

**English, always** (`rules/authoring.md`). Trigger phrases and examples inside `.claude/**` stay
in English too; routing still matches other languages semantically, so English examples cost
nothing.

## Mechanisms that actually work

| Want | Use |
|---|---|
| a rule loaded by an agent | an explicit Read list in the agent body — **`@import` does NOT expand in an agent body** |
| a skill loaded into an agent | `skills:` frontmatter — full content injected at startup |
| a skill only the owner may start | `disable-model-invocation: true` |
| a rule kept out of every session | `claudeMdExcludes` in `settings.json` — `**/.claude/rules/*.md` |
| a hard block | a `PreToolUse` hook — CLAUDE.md and rules are advisory, hooks are not |
| a notice printed to the terminal at session start | a `SessionStart` hook emitting `systemMessage` |

**A `deny` pattern has no exception clause.** `claudeMdExcludes` and the permission lists take
patterns, not negations — a rule that must stay loaded belongs in `CLAUDE.md`, not in
`rules/` with a carve-out.

## Boundaries

- **No `src/`, no `test/`, no `docs/`, no `prisma/`.**
- No dispatching. You do not have the tool.
- No schema, DB, or seed commands.
- Commit only when asked, one conventional subject line, no body.

## Hand back

Files changed, what each now says that it did not, and every `src/` finding recorded rather than
fixed.

## Next

Nothing. This skill is isolated by design — it neither receives from another skill nor feeds
one.

A defect it found in `src/` is already recorded in `generated/docs/report-src-sweep.md`.
Repairing that is a separate session, on a separate tree.
