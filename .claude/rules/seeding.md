# Seeding — initial data only

This file is the rule set. Despite the folder name, `src/migration/` holds SEEDS, not
schema migrations — the schema is `rules/prisma-schema.md`. Flow narrative:
`docs/database.md` — explorer or planner.

## What `src/migration/` is — and is NOT

`src/migration/` seeds **initial data only**: the reference and bootstrap rows an empty database needs to boot and be usable — roles, countries, the seed api-key, feature flags, term policies, notification/term templates, the aws-s3 config, and the seed user.

- **MongoDB has NO migration files.** Schema shape is applied by `prisma db push` (`db:migrate`), not by versioned migration scripts. So there is no "write a migration" here — there is only "seed initial data".
- **A seed is re-runnable bootstrap.** It populates the baseline an empty install starts from.
  A one-off production write, a column re-compute, or a historical import does not belong here.
- **Not a place for business logic.** A seed writes rows; it does not compute business decisions.

## Anatomy of a seed

```
src/migration/
├── bases/migration.seed.base.ts   # MigrationSeedBase (extends nest-commander CommandRunner)
├── data/                          # static seed rows — <module>.<concern>.data.ts, PascalCase const
├── seeds/                         # <module>.<concern>.seed.ts — one @Command per module
├── enums/ · interfaces/
└── migration.module.ts            # registers every seed command as a provider
```

- A seed is `<module>.<concern>.seed.ts`, class `Migration<Module>Seed`, decorated `@Command({ name })`, and **extends `MigrationSeedBase`** — never `CommandRunner` directly. The base owns the `--type seed|remove` dispatch; a seed only implements `seed()` and `remove()`.
- **`@Command` `name` is camelCase** matching the module or concern — `apiKey`, `featureFlag`, `termPolicy`, `templateEmailNotification`, `templateTermPolicy`, `awsS3Config`. Never kebab-case and never a mixed dash form (`template-email-notification`, `template-termPolicy`, `aws-s3-config`).
- **Every `seed()` has a matching `remove()`.** Seeding without a clean teardown leaves `migration:remove` unable to undo it. The pair is mandatory, not optional.
- **Static seed rows live in `data/` as a PascalCase const** (`<module>.<concern>.data.ts`), imported by the seed. Every const in that tree is PascalCase, exported or not. A seed whose data is built inline (no external key/reference) needs no `data/` file — do not invent one to be symmetric.
- **A seed writes its audit fields explicitly.** There is no request actor in a command, so `createdBy` and `updatedBy` on every seeded row — including the update branch of an upsert and every nested row — carry `MigrationUserSuperAdminId`, the fixed id the user seed gives the superadmin. A seeded activity row follows the same contracts a request does (`rules/security.md`): a row one user creates for another writes the pair, and an action with no metadata writes `{}`.
- **A seed that finds its fixed id taken by a different row stops.** The user seed aborts with a message naming the email, the id it found and the id it expects, because writing around it would leave activity rows pointing at a user that does not exist. Realigning is the owner's `migration:remove` then `migration:seed`.
- Registration is a provider entry in `migration.module.ts`. Seeds may inject **`DatabaseService`** (sanctioned — most data seeds do this today), a feature's **repository** (with its `<Feature>RepositoryModule` in `migration.module.ts` `imports`), or a feature **domain** (template / notification seeds) or shared kit service (`AwsSESService`, `AwsS3Service`). Prefer the existing pattern in the sibling seed you are extending; do not invent a second access path for the same collection. A seed that needs a transaction opens it with `this.databaseService.withTransaction` (`rules/database.md`), in callback form, passing `database.seedTransactionTimeoutInMs` — seed batches outlive Prisma's 5 s default. Work that is not a write (hashing a password, drawing a key, building rows) happens BEFORE the callback, so the transaction holds only statements.
- **`MigrationModule` is its own composition root, and the repository-privacy rule does not reach it.** A seed writes baseline rows rather than serving a request, so importing another feature's repository module here is correct, not a boundary crossing (`rules/cross-module.md`).

## Order is in the script, not the module

The run order is defined by the **`package.json` scripts**, not by the `providers` array in `migration.module.ts`. Quote the live scripts when editing — they are the source of truth.

Bundled today:

- `migration:seed` — `apiKey → country → featureFlag → role → policy → termPolicy → user → workspace`
- `migration:remove` — `workspace → user → apiKey → featureFlag → country → policy → role → termPolicy` (**not** a strict reverse of seed; do not invent a reverse that is not in the script)

Extra seeds exist and are registered (`templateEmailNotification`, `templateTermPolicy`, `awsS3Config`, …) but are **not** part of `migration:seed` / `migration:remove` — run them as separate `migration` commands when needed.

Adding a seed with a dependency means placing it correctly in **both** bundled scripts when it belongs in the bundled flow. The `providers` array order is irrelevant to execution.

## Idempotency

- `seed()` MUST be safe to run against a database that may already hold its rows — guard with an existence check or an upsert, never a blind `create` that throws on the second run. `migration:seed` is run repeatedly across environments.
- `remove()` is a RESET of the collections its `seed()` owns, not a scoped undo. `migration:remove` exists to bring an environment back to a known-empty baseline before `migration:seed`, so a seed clears its collections outright — the user seed takes the user-owned collections with it. The command is destructive by design and the owner runs it knowing that.

## Off-limits (inherits the mandatory schema rule)

- **`migration:fresh` is a DB-reset command** — it resets the database before seeding. It is one of the commands the owner runs (`rules/prisma-schema.md`): describe the intent and let the owner run it.
- `migration:seed`, `migration:remove`, and every `migration:*` command are the owner's to run — you write the seed, you do not execute the seeder against a database.
