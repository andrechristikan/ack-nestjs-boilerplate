---
name: ack-debug
description: Find the cause of a symptom — a failing request, a dead-lettered job, an unexpected value — then brainstorm the repair and write the plan for it. Produces a root cause, its evidence, and a plan; never the fix itself. Use when something is wrong and the location is unknown. NOT for applying the fix (ack-fix), NOT for judging a known surface against the rules (ack-gate).
disable-model-invocation: true
---

You produce a **root cause, the evidence, and a plan for the repair**. You never apply it —
the fix is a separate `/ack-fix` run, so whoever diagnoses is not the one grading the repair.

Find first, then think, then plan. In that order: brainstorming a repair for a cause you have
not located yet is guessing with extra steps.

## 1 — Pin the symptom

Get it concrete before dispatching anything: the exact request or job, the exact output, and
whether it reproduces. A symptom described as "it does not work" cannot be traced.

The strongest starting points here, in order: a `statusCode` integer plus its `statusCodeKey`
and `module` from the error body, a job id, an `x-request-id` from the response headers, an
error string.

## 2 — Locate

Dispatch `explorer` with the symptom's identifiers — a status-code member, a route, a queue
name, a column, an i18n key. It returns a `file:line` table and nothing else.

**When the symptom points outside this repository** — a vendor error string, a library throwing
something undocumented, behaviour that changed after a version bump — dispatch `researcher`
before tracing. Chasing our code for a cause that lives in a dependency's changelog wastes the
whole run.

## 3 — Trace (ASK before dispatching `reviewer-e2e`)

**`reviewer-e2e` NEVER runs on your own initiative (HARD)** — not even here, where it is the
natural tool. Ask first, with `AskUserQuestion`, naming what it would cost and what it would
find:

- it follows the flow to its terminal point, including every job and notification the flow
  hands off, which is usually where a symptom separates from its cause
- it is the most expensive agent in the set, because it reads whole flows across modules

If the owner declines, work from what `explorer` returned and read the path yourself. Say in
the hand-back that the trace was not run, and which hand-offs are therefore unfollowed.

When it does run, give it the symptom in the dispatch. A trace that does not know what it is
looking for reports everything and explains nothing.

**The causes that hide from a per-file read, and where each lives:**

| Symptom | Look at |
|---|---|
| a field silently missing from the response | a response DTO field with no `@Expose()`, or a nested field with no `@Type()` (`rules/dto.md`) |
| a field silently missing from the request | the global `ValidationPipe` `whitelist` stripped it — the DTO has no decorator for it |
| a guard rejecting a caller who should pass | decorator ORDER — the stack runs bottom-up and a guard above one it depends on sees `undefined` (`rules/http.md`) |
| a route 404 that should exist | the controller registered in its own module instead of `routes.<scope>.module.ts` (`rules/router.md`) |
| the raw message path echoed back instead of a message | a flat i18n key, or a key missing from that language file (`rules/i18n.md`) |
| a job that never runs | enqueued onto an `EnumQueue` member no `@QueueProcessor` is registered for (`rules/queue.md`) |
| a transaction that fails at runtime only | MongoDB running standalone rather than as a replica set |
| a header that works in curl and not in a browser | missing from `cors.allowedHeader` (`rules/config.md`) |
| an untranslated Prisma error reaching the client | a raw `P2002` escaping a repository (`rules/database.md`) |

## 4 — Reproduce

Dispatch `verifier` to reproduce the symptom against the running application, or to confirm the
suspected cause produces it. **A cause you have not reproduced is a hypothesis.** `verifier`
never starts a container it found stopped — if infrastructure is down it hands that back, and
you relay the question to the owner.

## 5 — Research, when the cause lives outside this repository

Dispatch `researcher` when the symptom points at a dependency, or when the repair has an
established best practice you cannot settle from the code in front of you. It returns findings
with source URLs.

Chasing our code for a cause that lives in a changelog wastes the whole run, and inventing a
repair pattern when a documented one exists wastes the next one.

## 6 — Brainstorm the repair (REQUIRED)

The cause is found. Now invoke `superpowers:brainstorming` and work the repair through it,
HERE, in this session — it is the step that turns a cause into options with trade-offs instead
of the first patch that comes to mind.

**Come out of it with open questions for the owner, not a decision.** Where two repairs are
both defensible — repair at the call site or at the service, guard the input or fix the
invariant, change the column or change the read — that is the owner's call. Put it to them
with `AskUserQuestion`, each option carrying what the code does TODAY alongside the
recommendation.

## 7 — Write the plan (REQUIRED)

Invoke `superpowers:writing-plans` and write the repair plan to `.superpowers/`. The plan
names the files that change, the order they change in, and the verification for each step.

The plan is the hand-off to `/ack-fix`. It is not optional and it is not a paragraph: a `fix`
run that receives a plan skips its own planning entirely, which is the whole reason this skill
produces one.

## Boundaries

- **No edits.** None of these agents has `Edit` or `Write` into `src/`, and neither do you
  here. The plan file under `.superpowers/` is the only thing this run writes.
- **Never dispatch `reviewer-e2e` unasked.**
- Git stays read-only. No schema, DB, or seed commands.
- Do not stop at the first plausible explanation. A negative grep proves a STRING is absent,
  not a behaviour.
- Do not widen into a review. Unrelated defects you pass are a one-line mention, not findings.
- No unit test run, no gate, no boot beyond the reproduction in §4. Nothing here is being
  proven green — the repair does not exist yet.

## Hand back

The symptom, the root cause, the evidence that reproduces it, the file and line where it lives,
the options brainstormed with the owner's answers, and the plan path. Then, explicitly, what
you could not establish — and whether the trace in §3 was run or declined.

## Next

| Then run | When |
|---|---|
| `/ack-fix` | the plan is written and the repair is narrow and named — hand it the plan path |
| `/ack-feature` | the plan turned out to be missing behaviour, not a defect |

**This skill never applies the fix.** Hand the root cause, the evidence and the plan to the
next run — whoever diagnoses does not grade their own repair.
