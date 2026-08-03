---
name: migration-seed
description: Create or edit initial-data seeders under src/migration/ in ack-nestjs-boilerplate — a new seed command, seed data rows, remove() pair, migration.module registration, and package.json seed/remove order when the command is bundled. Use whenever the owner asks for a new migration seed, changes to migration/data or migration/seeds, template/aws seed commands, or adjustments to migration:seed / migration:remove order. Simplified flow: clarify → coder → light gate → doc-drift when docs/database.md claims change. NOT for feature modules, endpoints, or Controllers/Services/Repositories — that is the `coding` skill. NOT for running migration:* or schema commands.
---

# Migration seed — initial data only

One job, kept small: add or change **bootstrap seed data** under `src/migration/`. Constraints live in `rules/migration.md` (and `docs/database.md` for the human catalogue). This skill holds the ORDER. On disagreement the rule file governs — fix the skill.

**Separate from feature modules.** Seeds are not Controllers, Services, or Repositories. Do not invent a feature-module shape inside `src/migration/`. Do not smuggle feature work into this skill — send that to `coding`.

## Out of this skill (HARD)

- **Do not invoke `coding`, `spec-coverage`, `reviewer-flow`, or `repository-pattern-gate`.** There is no HTTP flow to trace and no coverage set for seeds.
- **Do not run `migration:*`, `db:*`, or `migration:fresh`.** Write the seed; the owner runs it (`rules/migration.md`, mandatory schema rule).
- **Do not edit `prisma/schema.prisma`.** Seed rows must fit the schema that already exists.
- **Do not absorb feature-module work.** A new endpoint, service method, or repository change belongs to `coding`.

## The scope block (HARD)

**Compute the scope ONCE, at step 0, and paste it verbatim into every dispatch.**

```
SCOPE (do not go outside this)
  seed:           <command-name>          # e.g. country, template-email-notification
  paths:          src/migration/**        (+ package.json scripts if order changes)
  docs (optional): docs/database.md       # only when seeded-data claims change
  out of scope:   src/modules/** feature work, test/, running any migration:* command
```

---

## The flow

### 0. Baseline

- `git branch --show-current` and `git status --short`.
- `ls src/migration/seeds/` and `ls src/migration/data/`.
- Read `rules/migration.md` end to end. Skim the seeding section of `docs/database.md` for the live catalogue and script orders.
- Open one sibling seed that matches the kind of work (data seed via `DatabaseService`, or template/aws via a feature/service) — match that pattern; do not invent a third access path.
- Build the SCOPE block.
- Do **not** fetch remotes.

### 1. Clarify with the owner (main session)

Keep it short — initial data is not a feature design:

1. **What rows / artifacts** are seeded (and per which `app.env` if data is env-keyed)?
2. **Dependencies** — which existing seeds must run first?
3. **Bundled or standalone?** Bundled → place the command in both `migration:seed` and `migration:remove` in `package.json`. Standalone → register the provider only; document the manual `pnpm migration <name> --type seed|remove` command.
4. **Idempotency** — upsert / existence guard on `seed()`; `remove()` deletes only what this seed wrote.

Write a tiny plan only when the change touches more than one seed or reorders scripts: `.superpowers/plans/YYYY-MM-DD-migration-<slug>.md`. Otherwise the SCOPE block + the owner's answers are enough — do not force a full brainstorming loop.

### 2. Execute — `coder`

Dispatch `coder` with the SCOPE block and the settled answers (and the plan path if one exists).

Tell `coder` explicitly:

- Follow **`rules/migration.md`** (anatomy, order, idempotency, off-limits).
- Mirror a live sibling: `extends MigrationSeedBase`, `implements IMigrationSeed`, `@Command({ name })`, both `seed()` and `remove()`.
- Static rows → `src/migration/data/<file>.ts` as a PascalCase const when needed.
- Register the class in `src/migration/migration.module.ts` `providers`.
- If bundled, edit **both** `package.json` scripts; quote the live order — `migration:remove` is **not** assumed to be the reverse of seed.
- **No TDD / no unit specs** for seeds (none exist in this repo; do not invent a coverage drive).
- **Do not run** `pnpm migration…` or any `db:*` command.
- Hand-back + `generated/docs/report-coder-migration-<slug>.md` for anything the owner must run or decide.
- Comments follow `rules/authoring.md` (optional one-line class JSDoc; no method JSDoc).

### 3. Gate — `anti-pattern-gate` only (light)

Run `anti-pattern-gate` over the SCOPE paths. Skip `repository-pattern-gate` and `reviewer-flow`.

Migration-specific checks (read the code, do not invent):

- `seed()` + `remove()` both present.
- Extends `MigrationSeedBase` (not bare `CommandRunner`).
- Provider registered; bundled order correct in **both** scripts when claimed bundled.
- Idempotent `seed()`; scoped `remove()`.
- No `migration:*` / schema command was executed.

### 4. Documentation — `doc-drift` when claims moved

If the change adds/removes a bundled seed, changes seeded-data catalogue text, or alters documented commands, dispatch `doc-drift` with SCOPE pointing at `docs/database.md` (and any other doc that lists the seed). Otherwise skip.

### 5. Hand back to the owner

One short list:

- files added/changed under `src/migration/` (and `package.json` if touched),
- whether the command is bundled or standalone,
- the exact owner commands to run (`pnpm migration <name> --type seed` / `remove`, or `migration:seed`),
- path of `generated/docs/report-coder-migration-<slug>.md` if any,
- anything left undecided.

---

## Shared shape — what a seed is

```
src/migration/
├── bases/migration.seed.base.ts
├── data/                          # optional static rows
├── seeds/<module>.<concern>.seed.ts
├── migration.module.ts            # providers only — order is NOT execution order
└── …
```

Execution order lives in **`package.json`** (`rules/migration.md`). Template and aws-s3 seeds stay standalone unless the owner explicitly asks to bundle them.

---

## Commands this skill may suggest (owner runs)

```bash
pnpm migration <name> --type seed
pnpm migration <name> --type remove
pnpm migration:seed      # bundled set only
pnpm migration:remove    # bundled set only
```

Agents never execute those.
