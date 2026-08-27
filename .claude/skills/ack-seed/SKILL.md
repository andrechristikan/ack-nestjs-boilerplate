---
name: ack-seed
description: Create or edit initial-data seeders under src/migration/ — a seed class, its data rows, its remove() pair, its migration.module.ts registration, and its position in the package.json seed/remove scripts. Use when an install needs new baseline rows. NOT for feature modules or endpoints (ack-feature), NOT for the Prisma schema (owner-only), NOT for running migration:seed.
disable-model-invocation: true
---

One job, kept small: bootstrap rows under `src/migration/`. Despite the folder name it holds
SEEDS, not schema migrations — MongoDB has no migration files here.

## Reject early

Stop and point elsewhere when the request is:

- **a data backfill** — a one-off production fix, a column re-compute, a historical import. A
  seed is the baseline an empty install starts from, not a dated change record.
- **a schema change** — that is the OWNER'S (`rules/prisma-schema.md`). Seed rows fit the schema
  that already exists.
- **business logic** — a seed writes rows. Logic belongs to a service (`/ack-feature`).

## 1 — Settle the shape, HERE

Use `AskUserQuestion` for anything the sibling seeds do not already answer:

- Does it belong in the bundled `migration:seed` / `migration:remove` scripts, or stay a
  standalone command like the template and aws-s3 seeds?
- Where in the order — what must exist before it?
- Is the seed the SOLE source of a key set? If so, a later value change needs remove-then-seed,
  and that operator cost belongs in the hand-back.

## 2 — Build

Dispatch `seed-writer` with the answers. It writes the seed, its `data/` rows, its `remove()`,
its `migration.module.ts` provider, and its position in both bundled scripts.

**No TDD here.** `src/migration/` is outside `collectCoverageFrom` and a seed has no behaviour
to prove in a unit spec (`rules/testing.md`). Do not dispatch `test-writer`.

## 3 — Gate

Dispatch `reviewer-rules` over `src/migration/**` and the `package.json` scripts. The findings
that matter here:

- a `seed()` with no matching `remove()`
- a blind `create` with no existence guard, upsert, or `skipDuplicates`
- a class extending `CommandRunner` directly instead of `MigrationSeedBase`
- a bundled seed added to only ONE of `migration:seed` / `migration:remove`
- a `remove()` that truncates a collection another seed also populates
- static rows built inline that belong in `data/`, or a `data/` file invented for symmetry

## 4 — Green

```bash
pnpm typecheck
pnpm lint
pnpm spell
```

No test run — there are no specs for this tree.

## Boundaries

- **Never run `pnpm migration`, `migration:seed`, `migration:remove`, `migration:fresh`,
  `db:migrate`, or `db:generate`.** Write the seed; the owner runs it. `migration:fresh` runs
  `prisma db push --force-reset` and drops the database.
- No `src/modules/`, no `src/common/`, no `test/`, no `docs/`, no `prisma/`.
- Never stage or commit unless the owner asks in that exchange.

## Hand back

The seed, its data file, its registration site, its position in each bundled script and why,
**the exact command the owner runs**, and any operator cost the seed introduces.

## Next

| Then run | When |
|---|---|
| `/ack-docs` | the seed changed what an install starts with, and `docs/database.md` describes it |
