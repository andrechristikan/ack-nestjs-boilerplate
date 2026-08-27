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
- anything already inside a Prisma `$transaction`, which sequences by design.

## Atomicity is the repository's job

A multi-step write that must not leave a half-applied state goes in a `$transaction`, in the
REPOSITORY. A service does not open one (`rules/architecture.md`).

**The array form of `$transaction` accepts only `PrismaPromise`s.** `client.<model>.softDelete`
is an `async` wrapper around a single-row `update`, so it returns a plain `Promise` and cannot
be an element of one. A cascade that must not leave a half-deleted window belongs in the array
as a plain `update` / `updateMany`, with `updatedBy` stamped by hand and the rows filtered to
those still live — an unfiltered `updateMany` rewrites `deletedAt` on rows deleted earlier and
destroys their real deletion time.

Use the **callback form** when the work branches, needs a read between writes, or depends on an
intermediate result. Inside it, every call goes through the `tx` client; reaching back to
`databaseService.client` silently escapes the transaction.

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

A cache read, write, or delete that fails falls through to the database. **A cache entry is
never the thing that enforces an invariant** — no cache-based mutual exclusion, no "if the key
is absent, nobody else is running". Where exclusion is genuinely needed, it is a database
constraint or an explicit lock key with a TTL, and the TTL lives in config
(`rules/cache.md`, `rules/config.md`).
