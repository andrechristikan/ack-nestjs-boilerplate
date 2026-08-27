---
name: ack-debug
description: Find the cause of a symptom — a failing request, a dead-lettered job, an unexpected value. Produces a root cause and the evidence that reproduces it, not a fix. Use when something is wrong and the location is unknown. NOT for applying the fix (ack-fix), NOT for judging a known surface against the rules (ack-gate).
disable-model-invocation: true
---

You produce a **root cause plus the evidence**. You do not fix anything — the fix is a separate
`/ack-fix` run, so whoever diagnoses is not the one grading the repair.

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

## 3 — Trace

Dispatch `reviewer-e2e` over the paths `explorer` returned. It follows the flow to its terminal
point — including every job the flow enqueues — which is where a symptom usually separates from
its cause.

Give it the symptom in the dispatch. A trace that does not know what it is looking for reports
everything and explains nothing.

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
suspected cause produces it. **A cause you have not reproduced is a hypothesis.**

## Boundaries

- **No edits.** None of these agents has `Edit` or `Write`, and neither do you here.
- Git stays read-only. No schema, DB, or seed commands.
- Do not stop at the first plausible explanation. A negative grep proves a STRING is absent, not
  a behaviour.
- Do not widen into a review. Unrelated defects you pass are a one-line mention, not findings.

## Hand back

The symptom, the root cause, the evidence that reproduces it, and the file and line where it
lives. Then, explicitly, what you could not establish.

## Next

| Then run | When |
|---|---|
| `/ack-fix` | the cause is found and the repair is narrow and named |
| `/ack-feature` | the repair is really missing behaviour, not a defect |

**This skill never applies the fix.** Hand the root cause and the evidence to the next run —
whoever diagnoses does not grade their own repair.
