# Concurrency

Transaction mechanics live in `rules/database.md`. This file is about what runs together, what
must not, and the races that are invisible in review.

## Independent awaits run concurrently (HARD)

Two or more `await`s in the same scope that do not depend on each other's result go into one
`Promise.all([...])`. Sequential `await`s there add every call's latency together for no
reason, and each line looks correct on its own — which is why review misses it.

Three exceptions, each real. Name the one that applies:

- an await whose argument uses an earlier result,
- a write that must not happen if an earlier step throws,
- anything already inside `DatabaseService.withTransaction`, which sequences by design.

## An awaited promise is handled by `try`/`catch`, never by `.catch()` (HARD)

A promise the code `await`s carries its failure through `try`/`catch`. `.catch(callback)` on that
promise is banned, and so is `.then(callback)`.

```ts
// banned
const user = await this.userRepository
    .create(input)
    .catch((error: unknown) => {
        throw this.userOnboardingUtil.mapCreateCollision(error);
    });

// required
let user: IUser;
try {
    user = await this.userRepository.create(input);
} catch (error: unknown) {
    throw this.userOnboardingUtil.mapCreateCollision(error);
}
```

The callback form hides the boundary of what is guarded. A `try` block shows exactly which
statements the handler covers; a trailing `.catch()` covers one expression and reads as if it
covered the statement, so the next `await` added below it is unguarded and nothing says so. It also
splits one method across two control-flow styles, and it defeats the definite-assignment check that
a `never`-returning handler otherwise gives.

Two forms are NOT this rule, because neither has an `await` to attach a `try` to:

- **The process entrypoint.** `bootstrap().catch(...)` in `src/main.ts` and `src/migration.ts` runs
  at module level, outside any async function; its handler writes the failure to stderr and
  exits the process, which a failed boot needs because the registered shutdown hooks keep the
  event loop alive.
- **A promise that is deliberately never awaited.** Fire-and-forget work whose failure must not
  reach the caller still needs a `.catch()` so the rejection does not become unhandled. The
  activity-log interceptor is not this case: it **awaits** flush inside `concatMap` (or an
  equivalent awaited path) and handles failure with `try`/`catch` like every other awaited
  promise.

Everything else — every service, util, repository, guard, interceptor and processor — uses
`try`/`catch`.

## Atomicity belongs to whoever composes the write

A multi-step write that must not leave a half-applied state goes in
`DatabaseService.withTransaction`. Who opens it is `rules/database.md`: the repository, when
every statement is on its own model; the domain, when the write spans more than one
repository.

Inside `withTransaction`, every collaborator is an `*InTx(tx, ...)` method that issues
statements on `tx`. Reaching back to `databaseService.client` silently escapes the
transaction. A single-row delete that must stay atomic with other writes is
`tx.<model>.softDelete(...)`. A multi-row delete on this repository's own model is one
`updateMany` filtered to the rows still live — an unfiltered `updateMany` rewrites
`deletedAt` on rows deleted earlier and destroys their real deletion time. Audit fields follow
`rules/database.md`: the hook stamps `updatedBy`, and `deletedBy` is set explicitly.

## A generated unique value retries, then throws

A repository that draws a unique value itself — a slug, a reference, any random column behind a
unique index — retries a bounded number of times from a `*MaxAttempts` config key and throws
`DatabaseUniqueValueGenerationFailedException` when the budget runs out. Never let a raw `P2002`
escape as the exhaustion signal, and never fall through and let the write decide
(`rules/database.md`).

## Check-then-act is a race unless the database enforces it

An existence check followed by a create is not atomic. The unique index is what makes it safe;
the check exists to produce a good error message, not to prevent the duplicate. Where no unique
index backs the invariant, the invariant is not enforced — say so rather than pretending the
guard clause holds.

## Idempotency

- **A seed's `seed()` is idempotent** — safe against a database that may already hold its rows.
  An existence guard, an upsert, or `createMany({ skipDuplicates: true })`; never a blind
  `create` (`rules/seeding.md`).
- **A BullMQ job may run more than once.** `attempts` plus exponential backoff means a
  processor's work is retried on failure, so a handler that is not safe to repeat needs the
  repeat to be harmless — a conditional write, an upsert, or a state check — not a hope that
  the first attempt succeeded (`rules/queue.md`).

## Cache is best-effort, never a lock

A cache read that fails falls through to the database. **A cache entry is never the thing that
enforces an invariant** — no cache-based mutual exclusion, no "if the key is absent, nobody else
is running". A write or delete whose failure the request must not survive propagates instead of
being swallowed; `rules/cache.md` holds the list. Where exclusion is genuinely needed, it is a database
constraint or an explicit lock key with a TTL, and the TTL lives in config
(`rules/cache.md`, `rules/config.md`).
