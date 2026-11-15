---
name: ack-design
description: >-
    Settles a feature or a behaviour change with the owner through rounds of questions, agrees the test seams, and writes the spec to the feature folder under .scratch/. Use first for any feature or cross-module change. Not for a bug whose cause is unknown (ack-debug), tickets and a plan from an existing spec (ack-plan), or building (ack-build).
blurb: 'question rounds with the owner, seams, the spec'
disable-model-invocation: true
argument-hint: '<the feature or behaviour change, in one sentence>'
---

# ack-design

Request: $ARGUMENTS

The session works alone and writes one spec. Write nothing under `src/`, `test/`, or `prisma/`. Where a copied skill and a rule or this file differ, the rule and this file win.

## 1. Read first

- Read the code the request touches and the module closest to it in shape.
- Run `bash .claude/hooks/rules.sh` over the `src/` paths in scope and read each rule it prints.
- Name the entries in `.claude/decisions/architecture.md` and `.claude/decisions/security.md` that touch the scope before offering any option. Offer no option a rule forbids or an entry rejects.
- Follow `.claude/skills/ponytail/SKILL.md` at level `ultra`: challenge each part of the request the need does not justify, before any design.

## 2. Question rounds

Follow `.claude/skills/grilling/SKILL.md`, with these departures:

- Ask each round with `AskUserQuestion`, the recommended answer first. A frontier larger than four questions takes several calls.
- A fact the code, a rule, or a decision entry answers is yours to find. Read it, or dispatch the built-in `Explore` agent. Never ask the owner for it.
- When the owner says "you decide", decide and record it as an assumption.

The frontier covers what the owner has not named:

- Surface: the route scope (`/public`, `/system`, `/admin`, `/user`, `/shared`), workspace scoping, who may call it (role, policy ability, term-policy, API key, feature flag).
- Shape: request and response fields, which are optional and which are nullable. For a list: pagination type, the search and order-by allow-lists, filter defaults.
- Failures: each new failure, the module that owns its status code, its message key.
- Data: the Prisma delta (model, field, index, relation, soft delete), a seed and its remove pair, config keys.
- Flow: the transaction boundary, the service that owns a sequence several use cases share, whether the flow carries an idempotency key.
- Side effects: the activity-log row, the notification kind and channel, the queue job (name, payload, retry), the cache key and what invalidates it.
- Scope: what is out, stated as a list.

## 3. Seams

Every behaviour is built test-first, so each one needs its seam before the spec is written.

- A seam is the public boundary a unit spec asserts at: a use case's `execute`, a service method, a guard, a pipe, a zod schema, a queue class.
- Propose the seams, each with one line on what it catches and what it misses, and confirm them with `AskUserQuestion`.
- Specs are unit specs with every collaborator doubled (`.claude/rules/testing.md`). Integration and e2e are held.
- The rounds are not done while a behaviour has no agreed seam.

## 4. Spec

Follow `.claude/skills/to-spec/SKILL.md`, with these departures:

- The tracker is local markdown (`.claude/CLAUDE.md`, Work artifacts). Write `.scratch/<feature>/spec.md`, the feature slug kebab-case from the request, with `Status: ready-for-agent` as its first line.
- Its step 2 is step 3 of this file: the seams are already agreed.
- Add `## Decisions to honour` (each binding decision entry, by title) and `## Owner decisions` (every owner answer, verbatim, one per line) before `## Implementation Decisions`.
- `## Testing Decisions` lists each agreed seam and the behaviours asserted at it.
- Name every class, method, DTO field, status code, message key, and config key the change introduces.
- `## Harness changes` lists each rule the design needs changed or added and each decision candidate (an architecture choice closed with a named alternative rejected), one per line, or `none`.
- No compatibility, backfill, or migration section (`AGENTS.md`).

## 5. Approval

Ask the owner to approve the spec with `AskUserQuestion`. A change request revises the file and asks again.

## Hand back

- The spec path.
- The assumptions made for the owner.
- The spec's `## Harness changes` lines.

## Next

A fresh session, then `/ack-plan .scratch/<feature>/spec.md`.
