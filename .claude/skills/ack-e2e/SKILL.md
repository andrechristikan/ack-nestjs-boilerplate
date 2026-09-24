---
name: ack-e2e
description: Write and repair E2E HTTP specs under test/e2e/**/*.e2e-spec.ts against the real in-process AppModule via Supertest, scoped to routes the owner names. Touches no src/, no test/**/*.spec.ts, no docs/. NOT for unit specs (ack-spec), NOT for a flow review after a code change (ack-code's reviewer-e2e offer).
disable-model-invocation: true
---

One skill for `test/e2e/**` work: the E2E HTTP suite that boots the real application and calls
it over Supertest. You orchestrate. `e2e-writer` does the work.

## Which workflow is this?

Use this workflow to author or repair a real end-to-end HTTP spec for one or more routes, or to
add a shared E2E support helper that route work needs.

- A unit spec against mocked collaborators belongs to `/ack-spec` — this skill never touches
  `test/**/*.spec.ts`.
- A flow review after a `src/` change belongs to `/ack-code`'s `reviewer-e2e` offer — that is a
  read-only trace with no test written; this skill writes the standing E2E suite instead.
- A `src/` behaviour change belongs to `/ack-code`; this skill treats the code as correct and
  asserts what it does, the same way `ack-spec` does for units.

## 1 - Establish the scope

Name the routes, controllers, or router scope (`Public`, `System`, `Admin`, `User`, `Shared`) to
cover. Confirm each one actually exists before dispatching:

```bash
graphify query "HTTP entry points for <scope or controller>"
```

Fall back to reading `src/router/http/router.http.<scope>.module.ts` and the named controller's
route decorators directly when graphify is unavailable or the result looks stale — the same
discovery method `reviewer-e2e` uses for entry points. Never dispatch against a route you could
not confirm exists.

Read `.claude/rules/testing-e2e.md` — it carries the runtime facts, the data-isolation rule, the
auth pattern, the shared-support-layer contract, and the test-case policy that bind everything
below.

## 2 - Confirm the runtime

The E2E suite needs its own Postgres, Redis, and JWKS, isolated from the development Compose
project:

```bash
cp .env.e2e.example .env.e2e   # first run only, if .env.e2e is absent
pnpm test:e2e:env:up
pnpm test:e2e:db:reset
```

Run the current smoke spec to confirm the runtime answers before dispatching new work:

```bash
pnpm test:e2e test/e2e/public/hello.e2e-spec.ts
```

If any of the three commands fails, stop and hand back which one and its output — do not
dispatch `e2e-writer` against a runtime that is not actually up.

## 3 - Dispatch

Dispatch `e2e-writer` with the exact route list from step 1, their controller methods, and the
test-case policy from `testing-e2e.md` applied to those routes. Name any shared support helper
those routes need that `test/e2e/support/` does not yet have — that helper is in scope for the
same dispatch, not a separate one.

The dispatch also carries any known disagreement between the code and existing E2E specs. The
agent reports the conflict rather than deciding that the code or the existing spec wins by
default.

## 4 - Verify

Run the routes' spec files first, scoped by path or filename substring:

```bash
pnpm test:e2e test/e2e/<scope>/<controller>.e2e-spec.ts
```

Then the full E2E project once the scoped run is green:

```bash
pnpm test:e2e
```

Run the repository checks after:

```bash
pnpm typecheck
pnpm lint
pnpm spell
```

`pnpm test` (the unit suite) is unaffected by this tree — `vitest.e2e.config.mts` and
`vitest.config.ts` include disjoint file sets — but run it if the dispatch touched anything
outside `test/e2e/**`, which it should not have.

Tear the environment down when the pass is done, unless the owner is about to run another E2E
pass in the same session:

```bash
pnpm test:e2e:env:down
```

## Completion standard

- Every route named in the dispatch has a spec asserting the success case and every material
  failure case `testing-e2e.md`'s test-case policy requires for it.
- A state-changing route's spec asserts the persisted state through the real Prisma client, not
  only the HTTP response.
- Every fixture a spec creates uses a unique identifier; no spec asserts an exact row count on
  a table other specs also write to.
- No spec leaves an application, database connection, or Redis connection open after its file
  finishes.
- No `.only`, unjustified `.skip`, or placeholder `.todo` remains.
- `src/`, `test/**/*.spec.ts`, and `docs/*.md` remain unchanged.
- The scoped E2E run, the full E2E run, and the repository checks are green, or every failure
  is reported exactly.

## Boundaries

- Never change `src/` behaviour to make a route match the spec's expectation — report the
  mismatch instead.
- Never add `--coverage` to an E2E invocation; this project carries no coverage threshold here.
- No unit specs, no flow review, no `docs/*.md` edit.
- Never stage or commit unless the owner asks in that exchange.

## Hand back

Routes covered, specs written or repaired, support helpers added, the scoped and full E2E
commands with results, the repository check results, and every `src/` defect or code/spec
conflict, each with `file:line`.

## Next

Nothing chains automatically. A `src/` defect surfaced here goes to `/ack-code`; a route the
owner named that the application does not actually expose goes back to the owner to resolve
before more specs are written against it.
