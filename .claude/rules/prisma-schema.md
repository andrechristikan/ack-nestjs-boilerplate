# Prisma schema

**`prisma/schema.prisma` is editable. Applying it to PostgreSQL is not.** The line runs between
what touches files and what opens a connection.

Query and access rules are `rules/database.md`. Flow narrative: `docs/database.md` —
explorer or planner.

## What you may run

`db:generate` (`prisma generate`) · `db:format` (`prisma format`) · `prisma validate`. All
three read and write files only. Run `db:generate` after a schema edit so
`src/generated/prisma-client/` matches what you wrote and the code you hand back typechecks.
`pnpm generate` runs it together with `generate:package`.

## What the owner runs

`db:migrate` (`prisma migrate dev`) · `prisma db execute` · `prisma db seed` · `prisma migrate` ·
`migration` · `migration:seed` · `migration:remove` · `migration:fresh` · `node
dist/migration.js` · `redis-cli` · `db:studio`.

Every one of them sits in the `deny` list of `.claude/settings.json`. A permission pattern is a
prefix glob and matches the command as written, so the list is the statement of what belongs to
the owner rather than a fence that holds against a rewritten spelling — remember the list.
`migration:fresh` resets the PostgreSQL schema before seeding, which drops data.

## Migration files

PostgreSQL schema changes use versioned Prisma Migrate files under `prisma/migrations/`. A
schema change is a schema edit, a migration file, a client regenerate, and an owner-applied
migration.

## What the hand-back must state

A schema edit is finished only when the owner knows what to run and what it costs:

1. **The migration.** Name `pnpm db:migrate` explicitly as the owner's step, and say the schema is
   edited but NOT applied.
2. **The data consequence** — what happens to rows that already exist. A new required field
   with no default cannot be applied against a non-empty table; a type change may rewrite
   values; a rename is a DROP plus an ADD and the data is lost.
3. **The index or unique constraint** you added, and the query that needs it.

Code written against a field the push has not created yet compiles — `db:generate` reads the
schema, not the database — and fails at run time. Say which endpoints stay broken until the
owner pushes.

## Conventions the schema already follows

Read the existing models before editing; match them.

- Every model has a UUID primary key, usually `id String @id @default(dbgenerated("uuidv7()")) @db.Uuid`.
- Audit columns are `createdAt` / `createdBy` / `updatedAt` / `updatedBy`, with `updatedAt`
  carrying `@updatedAt`. A soft-deletable model adds `deletedAt` / `deletedBy`. The audit
  columns are stamped by the extended client, not by hand (`rules/database.md`).
- `@@map("<snake_case_plural>")` names the table; the model name is singular PascalCase.
- Fields are camelCase (`rules/naming.md`); relation scalars are `String @db.Uuid`.
- Enums are declared in the schema and imported from `@generated/prisma-client`, never
  re-declared in a module (`rules/enum.md`).
- Every index is declared for a query that exists. A new index that duplicates an existing
  prefix is dead weight — check the model's current `@@index` list before adding one.

## Renaming

Renaming a persisted enum value or a column is a DATA migration, not a rename. Hand it back as
one, with the rows it costs. Everything else in the codebase is freely renameable
(`rules/naming.md`); the schema is the exception, and the reason is the data, not
compatibility.
