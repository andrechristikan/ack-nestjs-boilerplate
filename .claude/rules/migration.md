# Migration — initial data seeding only

Detail in `docs/database.md` (seeding section). This file is the rule set.

## What `src/migration/` is — and is NOT

`src/migration/` seeds **initial data only**: the reference and bootstrap rows an empty database needs to boot and be usable — roles, countries, the seed api-key, feature flags, term policies, notification/term templates, the aws-s3 config, and the seed user.

- **MongoDB has NO migration files.** Schema shape is applied by `prisma db push` (`db:migrate`), not by versioned migration scripts. So there is no "write a migration" here — there is only "seed initial data".
- **Not a data-backfill tool.** A one-off production data fix, a column re-compute, a historical import — none of those belong here. A seed populates the baseline an install starts from; it is re-runnable bootstrap, not a dated change record.
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

- A seed is `<module>.<concern>.seed.ts`, class `Migration<Module>Seed`, decorated `@Command({ name: '<module>' })`, and **extends `MigrationSeedBase`** — never `CommandRunner` directly. The base owns the `--type seed|remove` dispatch; a seed only implements `seed()` and `remove()`.
- **Every `seed()` has a matching `remove()`.** Seeding without a clean teardown leaves `migration:remove` unable to undo it. The pair is mandatory, not optional.
- **Static seed rows live in `data/` as a PascalCase const** (`<module>.<concern>.data.ts`), imported by the seed. A seed whose data is built inline (no external key/reference) needs no `data/` file — do not invent one to be symmetric.
- Registration is a provider entry in `migration.module.ts`. Seeds may inject **`DatabaseService`** (sanctioned — most data seeds do this today) or a feature service (template / aws seeds). Prefer the existing pattern in the sibling seed you are extending; do not invent a second access path for the same collection.

## Order is in the script, not the module

The run order is defined by the **`package.json` scripts**, not by the `providers` array in `migration.module.ts`. Quote the live scripts when editing — they are the source of truth.

Bundled today:

- `migration:seed` — `apiKey → country → featureFlag → role → termPolicy → user`
- `migration:remove` — `user → apiKey → featureFlag → country → role → termPolicy` (**not** a strict reverse of seed; do not invent a reverse that is not in the script)

Extra seeds exist and are registered (`template-email-notification`, `template-termPolicy`, `aws-s3-config`, …) but are **not** part of `migration:seed` / `migration:remove` — run them as separate `migration` commands when needed.

Adding a seed with a dependency means placing it correctly in **both** bundled scripts when it belongs in the bundled flow. The `providers` array order is irrelevant to execution.

## Idempotency

- `seed()` MUST be safe to run against a database that may already hold its rows — guard with an existence check or an upsert, never a blind `create` that throws on the second run. `migration:seed` is run repeatedly across environments.
- `remove()` deletes what `seed()` wrote, scoped to it. It does not truncate a shared collection another seed also populates.

## Off-limits (inherits the mandatory schema rule)

- **`migration:fresh` is a DB-reset command** — it runs `prisma db push --force-reset` before seeding. It is on the forbidden list (`rules/database.md`, mandatory rule 1): do not run it, describe the intent and let the owner run it.
- `migration:seed`, `migration:remove`, and every `migration:*` command are the owner's to run — you write the seed, you do not execute the seeder against a database.
