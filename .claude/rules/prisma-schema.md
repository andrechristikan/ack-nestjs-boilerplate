# Prisma schema

**`prisma/schema.prisma` is editable. Applying it to MongoDB is not.** The line runs between
what touches files and what opens a connection.

Detail in `docs/database.md`. Query and access rules are `rules/database.md`.

## What you may run

`db:generate` (`prisma generate`) · `db:format` (`prisma format`) · `prisma validate`. All
three read and write files only. Run `db:generate` after a schema edit so
`generated/prisma-client` matches what you wrote and the code you hand back typechecks.

## What the owner runs

`db:migrate` (`prisma db push`) · `prisma db execute` · `prisma db seed` · `prisma migrate` ·
`migration` · `migration:seed` · `migration:remove` · `migration:fresh` · `node
dist/migration.js` · `mongosh` · `redis-cli` · `db:studio`.

Every one of them sits in the `deny` list of `.claude/settings.json`. A permission pattern is a
prefix glob and matches the command as written, so the list is the statement of what belongs to
the owner rather than a fence that holds against a rewritten spelling — remember the list.
`migration:fresh` runs `prisma db push --force-reset`, which drops the database.

## There are no migration files

MongoDB has none. Schema shape is applied by `prisma db push`, so "write a migration" is not a
task that exists here. A schema change is a schema edit, a client regenerate, and a push — the
first two are yours, the push is the owner's.

## What the hand-back must state

A schema edit is finished only when the owner knows what to run and what it costs:

1. **The push.** Name `pnpm db:migrate` explicitly as the owner's step, and say the schema is
   edited but NOT applied.
2. **The data consequence** — what happens to rows that already exist. A new required field
   with no default cannot be pushed against a non-empty collection; a type change discards
   values; a rename is a DROP plus an ADD and the data is lost.
3. **The index or unique constraint** you added, and the query that needs it.

Code written against a field the push has not created yet compiles — `db:generate` reads the
schema, not the database — and fails at run time. Say which endpoints stay broken until the
owner pushes.

## Conventions the schema already follows

Read the existing models before editing; match them.

- Every model has `id String @id @default(auto()) @map("_id") @db.ObjectId`.
- Audit columns are `createdAt` / `createdBy` / `updatedAt` / `updatedBy`, with `updatedAt`
  carrying `@updatedAt`. A soft-deletable model adds `deletedAt` / `deletedBy`. The audit
  columns are stamped by the extended client, not by hand (`rules/database.md`).
- `@@map("<PluralPascalCase>")` names the collection; the model name is singular PascalCase.
- Fields are camelCase (`rules/case-convention.md`); relation scalars are `String @db.ObjectId`.
- Enums are declared in the schema and imported from `@generated/prisma-client`, never
  re-declared in a module (`rules/enum.md`).
- Every index is declared for a query that exists. A new index that duplicates an existing
  prefix is dead weight — check the model's current `@@index` list before adding one.

## Renaming

Renaming a persisted enum value or a column is a DATA migration, not a rename. Hand it back as
one, with the rows it costs. Everything else in the codebase is freely renameable
(`rules/naming.md`); the schema is the exception, and the reason is the data, not
compatibility.
