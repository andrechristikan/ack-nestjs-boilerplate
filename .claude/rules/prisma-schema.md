# Prisma schema

**`prisma/schema.prisma` is OFF-LIMITS to every agent and every session.** You DESCRIBE a
delta; the owner applies it. There is no schema-writing agent in this repo, and
`.claude/settings.json` denies edits to the file and every schema command.

Detail in `docs/database.md`. Query and access rules are `rules/database.md`.

## The commands that are forbidden too

`db:migrate` (`prisma db push`) · `db:push` · `db:generate` · `db:format` · `migration:seed` ·
`migration:remove` · `migration:fresh` · any `npx prisma …` equivalent.

Even `db:generate` regenerates a client the owner may not want regenerated mid-task, and
`migration:fresh` runs `prisma db push --force-reset`, which drops the database.

## There are no migration files

MongoDB has none. Schema shape is applied by `prisma db push`, so "write a migration" is not a
task that exists here. A schema change is a schema edit plus a client regenerate, both the
owner's, and the DATA consequences are yours to name.

## How to describe a delta

State all four, in the hand-back:

1. **The model and field**, with the exact Prisma type and attributes you need.
2. **The index or unique constraint**, if the query you are writing depends on one.
3. **The data consequence** — what happens to rows that already exist. A new required field
   with no default cannot be pushed against a non-empty collection; a type change discards
   values; a rename is a DROP plus an ADD and the data is lost.
4. **The follow-up edits** the owner's regenerate will require of you — a `select` constant,
   a mapper, a response DTO field.

Never write the code against a column that does not exist yet and hand it back red.

## Conventions the schema already follows

Read the existing models before proposing a delta; match them.

- Every model has `id String @id @default(auto()) @map("_id") @db.ObjectId`.
- Audit columns are `createdAt` / `createdBy` / `updatedAt` / `updatedBy`, with `updatedAt`
  carrying `@updatedAt`. A soft-deletable model adds `deletedAt` / `deletedBy`. The audit
  columns are stamped by the extended client, not by hand (`rules/database.md`).
- `@@map("<PluralPascalCase>")` names the collection; the model name is singular PascalCase.
- Fields are camelCase (`rules/case-convention.md`); relation scalars are `String @db.ObjectId`.
- Enums are declared in the schema and imported from `@generated/prisma-client`, never
  re-declared in a module (`rules/enum.md`).
- Every index is declared for a query that exists. A new index that duplicates an existing
  prefix is dead weight — check the model's current `@@index` list before asking for one.

## Renaming

Renaming a persisted enum value or a column is a DATA migration, not a rename. Describe it as
one. Everything else in the codebase is freely renameable (`rules/naming.md`); the schema is
the exception, and the reason is the data, not compatibility.
