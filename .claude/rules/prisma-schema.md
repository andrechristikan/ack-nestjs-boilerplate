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
dist/migration.js` · `psql` · `redis-cli` · `db:studio`.

Every one of them sits in the `deny` list of `.claude/settings.json`. A permission pattern is a
prefix glob and matches the command as written, so the list is the statement of what belongs to
the owner rather than a fence that holds against a rewritten spelling — remember the list.
`migration:fresh` runs `prisma migrate reset --force`, which drops and recreates the database
before reseeding.

## Migration files, and who generates them

Schema migrations live under `prisma/migrations/`, one timestamped directory per migration plus
a `migration_lock.toml` recording the provider. Generating a new one means diffing the schema
against the live database, so it is not a file-only operation: `db:migrate`
(`prisma migrate dev`) is the owner's command, and it writes the new `migration.sql` AND applies
it in the same step — there is no way to produce the migration file here without a connection. A
schema change is a schema edit, a client regenerate, and a migration — the first two are yours,
the migration is the owner's.

## What the hand-back must state

A schema edit is finished only when the owner knows what to run and what it costs:

1. **The migration.** Name `pnpm db:migrate` explicitly as the owner's step, and say the schema
   is edited but NOT migrated — no migration file exists yet and the database still has the old
   shape.
2. **The data consequence** — what happens to rows that already exist. A new required field
   with no default cannot be migrated against a non-empty table; a type change discards values;
   a rename is a DROP plus an ADD and the data is lost.
3. **The index or unique constraint** you added, and the query that needs it.

Code written against a field the migration has not created yet compiles — `db:generate` reads
the schema, not the database — and fails at run time. Say which endpoints stay broken until the
owner runs the migration.

## Conventions the schema already follows

Read the existing models before editing; match them.

- Every model has `id String @id @default(dbgenerated("uuidv7()")) @db.Uuid`.
- Audit columns are `createdAt` / `createdBy` / `updatedAt` / `updatedBy`, with `updatedAt`
  carrying `@updatedAt`. A soft-deletable model adds `deletedAt` / `deletedBy`. The audit
  columns are stamped by the extended client, not by hand (`rules/database.md`).
- `@@map("<snake_case_plural>")` names the table; the model name is singular PascalCase.
- Fields are camelCase (`rules/naming.md`); relation scalars are `String @db.Uuid`.
- Enums are declared in the schema and imported from `@generated/prisma-client/client`, never
  re-declared in a module (`rules/enum.md`).
- Every index is declared for a query that exists. A new index that duplicates an existing
  prefix is dead weight — check the model's current `@@index` list before adding one.

## Renaming

Renaming a persisted enum value or a column is a DATA migration, not a rename. Hand it back as
one, with the rows it costs. Everything else in the codebase is freely renameable
(`rules/naming.md`); the schema is the exception, and the reason is the data, not
compatibility.
