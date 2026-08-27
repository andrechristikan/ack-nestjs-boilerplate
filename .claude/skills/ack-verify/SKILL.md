---
name: ack-verify
description: Prove something works against the running application — boot it, call the endpoint, read the log. Returns evidence. Use when a green suite is not enough. NOT for unit tests (ack-fix-test), NOT for finding an unknown cause (ack-debug).
disable-model-invocation: true
---

Evidence from a running system. One dispatch to `verifier`.

## Before dispatching

Say what "working" means, concretely: which request, what response, which row, which log line. A
verification without a stated expectation returns output nobody can judge.

Name the SCOPE the route sits under too. A `user` or `shared` route needs the `x-workspace-id`
header, and without it the workspace guards reject before the handler runs — a rejection that
reads like a broken feature (`rules/http.md`).

## Infrastructure

`verifier` checks MongoDB, Redis, and the containers the app reads at boot itself, and asks
before starting them. **Relay that question; do not answer it for the owner** — starting
containers touches their machine.

**MongoDB must be a REPLICA SET, not a standalone.** A standalone boots the app and then fails
every transaction at runtime, which looks like a code defect and is not.

## Dispatch

`verifier`, with the expectation and the narrowest path that answers it.

## Boundaries

- No edits. `verifier` has no `Edit` and no `Write`.
- **Never run a seed, a migration, or a schema command against a real database** —
  `migration:seed`, `migration:remove`, `migration:fresh`, `db:migrate`, `db:generate` are all
  the owner's.
- Never stage or commit.
- **"Verified" is not a result.** The result is the status code, the row, the log line.

## Hand back

What was run, what came back, what that proves, and what could not be verified.

## Next

| Then run | When |
|---|---|
| `/ack-debug` | it does not work and the cause is unknown |
| `/ack-fix` | it does not work and the cause is obvious |

Nothing, when it works. That is the whole result.
